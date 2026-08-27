/* USGS gauge readings, on the modernized Water Data API.

   The legacy WaterServices host this replaced (waterservices.usgs.gov/nwis/iv)
   is being decommissioned in early 2027, with throttling and planned outages
   before that. USGS has not published the outage schedule yet, so the only safe
   assumption is that the old host can start failing without warning. Everything
   here talks to api.waterdata.usgs.gov instead.

   Three things about the new API drive the shape of this file.

   It returns one GeoJSON feature per observation rather than a grouped time
   series, so the caller gets flat rows and groups them here.

   It does not guarantee result ordering. USGS says so explicitly in their
   versioning notes, so nothing below trusts array position. Everything that
   cares about order sorts by time first.

   And it reports a dead gauge as a null value carrying an old timestamp rather
   than the zeros the legacy host sent back. That is a better signal and it is
   what isFresh tests. The all-zeros heuristic in DECISIONS.md 36 was guessing
   from the value because the legacy API gave it nothing better.
*/

/* Pinned deliberately. USGS promises no breaking changes inside a version, so
   v0 will keep answering these queries. When v1 lands, both run side by side
   for a transition period, which is the window to change this one line. */
const API_BASE = 'https://api.waterdata.usgs.gov/ogcapi/v0';

/* An API key is only needed above a few queries an hour and we are far under
   that, so this stays optional. It is read from the environment because this
   file runs in Actions and never in a browser. */
const API_KEY = process.env.USGS_API_KEY || '';

export const PARAM = {
  STAGE: '00065',
  DISCHARGE: '00060',
  WATER_TEMP: '00010'
};

/* Five Mile Creek runs past Republic, then the three towns, then Sayre. The
   gauge on the creek at Sayre died on 2025-07-07 and the one at Ketona died in
   2019, so Republic is the only reading left on the creek itself.

   Republic sits upstream of all three towns, which is what makes it worth
   watching rather than merely available: water climbing at Republic has not
   reached Brookside yet. Locust Fork is the river the creek empties into,
   gauged at Sayre on a basin seventeen times the size. It cannot see a local
   downpour, but when it is high it backs water up into the lower creek, which
   is the one thing Republic upstream cannot tell you. */
export const GAUGES = [
  {
    id: '02457595',
    label: 'Republic gauge',
    name: 'Fivemile Creek near Republic, Ala',
    place: 'Republic',
    role: 'lead',
    reach: 'upstream',
    locationTags: ['five_mile_creek', 'jefferson_county']
  },
  {
    id: '02456500',
    label: 'Locust Fork at Sayre',
    name: 'Locust Fork at Sayre, Ala',
    place: 'Sayre',
    role: 'context',
    reach: 'receiving',
    locationTags: ['locust_fork', 'jefferson_county']
  }
];

/* A reading older than this is treated as no reading at all. Both gauges report
   every fifteen minutes, so two hours is slack enough for a slow sync and tight
   enough to catch a gauge that has stopped. The dead gauge at Sayre currently
   answers with a timestamp over a year old. */
const MAX_AGE_MINUTES = 120;

const USER_AGENT = 'fivemile.now data refresh (fivemilec@gmail.com)';

export function siteId(id) {
  return id.startsWith('USGS-') ? id : 'USGS-' + id;
}

export function bareId(id) {
  return id.replace(/^USGS-/, '');
}

function buildUrl(collection, params) {
  const search = new URLSearchParams({ f: 'json', ...params });
  if (API_KEY) search.set('api_key', API_KEY);
  return API_BASE + '/collections/' + collection + '/items?' + search.toString();
}

/* Follows next links. Thirty days of one gauge fits in a single response today,
   but paging is what keeps that true if USGS lowers the cap or we widen the
   window later. The page guard stops a malformed link loop from hanging a ten
   minute job. */
async function fetchFeatures(url, options = {}) {
  const timeoutMs = options.timeoutMs || 30000;
  const maxPages = options.maxPages || 25;
  const features = [];
  let next = url;
  let pages = 0;
  while (next && pages < maxPages) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let payload;
    try {
      const response = await fetch(next, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }
      });
      if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + next);
      payload = await response.json();
    } finally {
      clearTimeout(timer);
    }
    features.push(...(payload.features || []));
    const link = (payload.links || []).find((entry) => entry.rel === 'next');
    next = link && link.href ? link.href : null;
    pages += 1;
  }
  return features;
}

function readFeature(feature) {
  const props = (feature && feature.properties) || {};
  const value = Number(props.value);
  return {
    gaugeId: bareId(props.monitoring_location_id || ''),
    parameterCode: props.parameter_code || '',
    time: props.time || '',
    value: Number.isFinite(value) ? value : null,
    unit: props.unit_of_measure || '',
    approval: props.approval_status || '',
    qualifier: props.qualifier || null
  };
}

/* Rows keyed gaugeId then parameterCode, each list sorted oldest first. Sorting
   here rather than trusting the response is deliberate: USGS does not guarantee
   result ordering. */
export function groupReadings(features) {
  const out = new Map();
  for (const feature of features) {
    const row = readFeature(feature);
    if (!row.gaugeId || !row.parameterCode || !row.time) continue;
    if (row.value === null) continue;
    if (!out.has(row.gaugeId)) out.set(row.gaugeId, new Map());
    const byParam = out.get(row.gaugeId);
    if (!byParam.has(row.parameterCode)) byParam.set(row.parameterCode, []);
    byParam.get(row.parameterCode).push(row);
  }
  for (const byParam of out.values()) {
    for (const list of byParam.values()) {
      list.sort((a, b) => new Date(a.time) - new Date(b.time));
    }
  }
  return out;
}

export function readingsFor(grouped, gaugeId, parameterCode) {
  const byParam = grouped.get(bareId(gaugeId));
  if (!byParam) return [];
  return byParam.get(parameterCode) || [];
}

export function isFresh(time, maxAgeMinutes = MAX_AGE_MINUTES) {
  if (!time) return false;
  const stamp = new Date(time).getTime();
  if (!Number.isFinite(stamp)) return false;
  return (Date.now() - stamp) <= maxAgeMinutes * 60 * 1000;
}

/* The most recent reading for every gauge and parameter asked for, in one
   request. Comma lists are how this API takes more than one value. A repeated
   query parameter silently keeps only the last one, which reads as a working
   query that happens to return a single gauge. */
export async function fetchLatest(ids, parameterCodes, options = {}) {
  const features = await fetchFeatures(buildUrl('latest-continuous', {
    monitoring_location_id: ids.map(siteId).join(','),
    parameter_code: parameterCodes.join(',')
  }), options);
  return groupReadings(features);
}

export async function fetchSeries(ids, parameterCodes, from, to, options = {}) {
  const window = new Date(from).toISOString() + '/' + new Date(to).toISOString();
  const features = await fetchFeatures(buildUrl('continuous', {
    monitoring_location_id: ids.map(siteId).join(','),
    parameter_code: parameterCodes.join(','),
    datetime: window,
    limit: String(options.limit || 10000)
  }), options);
  return groupReadings(features);
}

export function latestOf(readings) {
  if (!readings || !readings.length) return null;
  const row = readings[readings.length - 1];
  return isFresh(row.time) ? row : null;
}

/* Feet per hour across the tail of a series, measured against the oldest
   reading inside windowMinutes rather than against a fixed number of samples,
   so a gap in reporting cannot masquerade as a fast rise. */
export function riseRatePerHour(readings, windowMinutes = 90) {
  if (!readings || readings.length < 2) return null;
  const latest = readings[readings.length - 1];
  const cutoff = new Date(latest.time).getTime() - windowMinutes * 60 * 1000;
  const earlier = readings.find((row) => new Date(row.time).getTime() >= cutoff);
  if (!earlier || earlier === latest) return null;
  const hours = (new Date(latest.time) - new Date(earlier.time)) / 3600000;
  if (hours <= 0) return null;
  return (latest.value - earlier.value) / hours;
}

export function trendFrom(readings, threshold = 0.12, windowMinutes = 90) {
  const rate = riseRatePerHour(readings, windowMinutes);
  if (rate === null) return 'steady';
  const change = rate * (windowMinutes / 60);
  if (change >= threshold) return 'rising';
  if (change <= -threshold) return 'falling';
  return 'steady';
}

/* Annual peak stage, the highest the creek reached in each water year.

   This is the only thing on the site that can honestly put a number in
   context. Nobody has surveyed what floods at Republic: the gauge has no
   Real-Time Flood Impact reference points and NWS does not carry it as a
   forecast point, so there is no sourced flood stage to quote. What there is
   is the gauge's own record back to 1989, which supports a true sentence:
   the creek is higher than it got in so many of the last so many years.

   Peaks change once a year at most, so this belongs on the twice daily job. */
export async function fetchAnnualPeaks(gaugeId, options = {}) {
  const features = await fetchFeatures(buildUrl('peaks', {
    monitoring_location_id: siteId(gaugeId),
    parameter_code: PARAM.STAGE,
    limit: '500'
  }), options);
  const peaks = [];
  for (const feature of features) {
    const props = (feature && feature.properties) || {};
    const value = Number(props.value);
    if (!Number.isFinite(value) || !props.time) continue;
    peaks.push({
      water_year: Number(props.water_year) || null,
      date: String(props.time).slice(0, 10),
      stage_ft: Number(value.toFixed(2))
    });
  }
  peaks.sort((a, b) => a.date.localeCompare(b.date));
  return peaks;
}

/* How many years on record crested lower than the reading in hand. Returned as
   counts rather than a percentile so the sentence can name real numbers: not
   "the 81st percentile" but "higher than it got in thirty of the last
   thirty-seven years". */
export function rankAgainstPeaks(stageFt, peaks) {
  if (!Number.isFinite(stageFt) || !peaks || !peaks.length) return null;
  const years = peaks.length;
  const below = peaks.filter((peak) => peak.stage_ft < stageFt).length;
  const highest = peaks.reduce((top, peak) => (peak.stage_ft > top.stage_ft ? peak : top), peaks[0]);
  return { years, below, highest, first: peaks[0], last: peaks[peaks.length - 1] };
}
