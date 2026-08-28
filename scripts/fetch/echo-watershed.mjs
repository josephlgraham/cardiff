/* Who holds a permit to discharge into Five Mile Creek, and what EPA says
   about their record.

   Nobody else publishes this for this watershed. It is the one thing on the
   site that is not available anywhere else, and it is the reason the creek
   pages are worth keeping.

   THE ONE RULE. This file and anything rendering it report the record and link
   to EPA. They never characterise a facility. "Reported in noncompliance in 9
   of the last 12 quarters, per EPA" is a fact with a source. Any sentence with
   an adjective in it is an opinion about a named business, and the civic work
   this site supports needs to be unimpeachable. Numbers, dates, and a link.

   FINDING THE WATERSHED. Five Mile Creek is exactly two hydrologic units:
   031601110406 Upper Fivemile Creek and 031601110407 Lower Fivemile Creek.
   That is not a guess. The Republic gauge reports its own hydrologic unit code
   as 031601110406, and the neighbouring units in the same basin are named in
   the USGS hydrologic unit register.

   MATCHING FACILITIES. ECHO only filters to eight digit HUCs, which is the
   whole Locust Fork basin and about 1,900 facilities, so the narrowing happens
   here. Two signals are used, both from EPA's own fields:

     the facility's WBD HUC12 is one of our two, or
     the receiving water EPA records for it names Fivemile Creek.

   Both are needed. Roughly two thirds of the basin rows carry no HUC12 at all,
   including live permits in Brookside and Graysville, so HUC alone would drop
   real dischargers. Receiving water alone would drop the ones EPA placed but
   never named a stream for.

   What is deliberately NOT used is the town a facility sits in. A facility in
   Graysville may discharge to Newfound Creek, and saying otherwise would be
   inventing a fact about a named business. */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_FILE = path.join(ROOT, 'fivemile-echo.json');
const USER_AGENT = 'fivemile.now data refresh (fivemilec@gmail.com)';

const BASE = 'https://echodata.epa.gov/echo/cwa_rest_services';
/* Locust Fork. The smallest unit ECHO will filter on. */
const BASIN_HUC8 = '03160111';

export const CREEK_HUC12 = {
  '031601110406': 'Upper Fivemile Creek',
  '031601110407': 'Lower Fivemile Creek'
};

const NAMES_THE_CREEK = /five\s*mile/i;

/* Column ids from cwa_rest_services.metadata. Asking for the ones we use keeps
   the download to a quarter of a megabyte instead of everything ECHO holds. */
const COLUMNS = [
  1,   // CWPName
  2,   // SourceID, the NPDES permit
  4,   // CWPCity
  24,  // FacLat
  25,  // FacLong
  26,  // CWPTotalDesignFlowNmbr
  51,  // CWPPermitStatusDesc
  66,  // CWPDateLastInspection
  101, // CWPQtrsWithNC
  102, // CWPViolStatus
  103, // CWPQtrsWithSNC
  159, // CWPStateWaterBodyName
  163, // RadWBDHuc12s
  170  // RadWBDHuc12
].join(',');

/* A permit that has been terminated is not discharging. Kept in the file as a
   count, because "there used to be sixty more" is part of the story, but out
   of the list a reader reads. */
const LIVE_STATUS = new Set(['Effective', 'Admin Continued']);

async function getText(url, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function number(value) {
  const n = Number(String(value ?? '').trim());
  return Number.isFinite(n) ? n : null;
}

function clean(value) {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

function hucField(record) {
  return `${record.RadWBDHuc12s || ''} ${record.RadWBDHuc12 || ''}`;
}

function matchesCreek(record) {
  const huc = hucField(record);
  const byHuc = Object.keys(CREEK_HUC12).filter((code) => huc.includes(code));
  const water = record.CWPStateWaterBodyName || '';
  const byWater = NAMES_THE_CREEK.test(water);
  if (!byHuc.length && !byWater) return null;
  return { units: byHuc, namedTheCreek: byWater };
}

export async function fetchWatershedFacilities({ parseCsvRows }) {
  const query = await getText(
    `${BASE}.get_facilities?output=JSON&p_huc=${BASIN_HUC8}`, 60000
  );
  const results = JSON.parse(query).Results || {};
  const qid = results.QueryID;
  if (!qid) throw new Error('ECHO returned no query id for the basin search');

  const csv = await getText(`${BASE}.get_download?qid=${qid}&qcolumns=${COLUMNS}`);
  if (csv.trimStart().startsWith('<')) throw new Error('ECHO returned HTML rather than CSV');
  const { records } = parseCsvRows(csv);

  const facilities = [];
  let terminated = 0;
  for (const record of records) {
    const match = matchesCreek(record);
    if (!match) continue;
    const status = clean(record.CWPPermitStatusDesc);
    if (!LIVE_STATUS.has(status)) { terminated += 1; continue; }
    const permit = clean(record.SourceID);
    if (!permit) continue;
    facilities.push({
      name: clean(record.CWPName),
      permit,
      city: clean(record.CWPCity),
      status,
      /* EPA's own field. Blank where EPA recorded none, never filled in from
         the town or from anything else. */
      receiving_water: clean(record.CWPStateWaterBodyName),
      hydrologic_units: match.units.map((code) => ({ code, name: CREEK_HUC12[code] })),
      design_flow_mgd: number(record.CWPTotalDesignFlowNmbr),
      quarters_in_noncompliance: number(record.CWPQtrsWithNC),
      quarters_in_significant_noncompliance: number(record.CWPQtrsWithSNC),
      violation_status: clean(record.CWPViolStatus),
      last_inspection: clean(record.CWPDateLastInspection),
      lat: number(record.FacLat),
      lon: number(record.FacLong),
      echo_url: `https://echo.epa.gov/detailed-facility-report?fid=${encodeURIComponent(permit)}`
    });
  }

  facilities.sort((a, b) => {
    const nc = (b.quarters_in_noncompliance || 0) - (a.quarters_in_noncompliance || 0);
    return nc !== 0 ? nc : String(a.name).localeCompare(String(b.name));
  });

  return { facilities, terminated, scanned: records.length };
}

/* EPA's own verdict on the creek, read off the detailed facility report of a
   facility that discharges here, because that is where ECHO exposes it.

   A wrong turn worth recording. The WBD12 block on the same report carries a
   field called PossibleImpairingParameters, and it is tempting, because it
   returns a long list of chemicals. It is not the creek's impairment causes.
   It is what that particular facility could impair with, so ABC Coke returns
   coke chemistry and a metal finisher returns metals. Publishing it as the
   creek's problem would have been a serious misrepresentation of a real place
   and of the businesses on it.

   The creek level answer is on the assessment unit: CauseGroupsImpaired, the
   designated uses, and EPA's own condition wording. Those are the fields used
   here, and every one of them is quoted rather than summarised. */
async function fetchAssessment(permit) {
  const text = await getText(
    `https://echodata.epa.gov/echo/dfr_rest_services.get_dfr?output=JSON&p_id=${encodeURIComponent(permit)}`,
    45000
  );
  const results = JSON.parse(text).Results || {};
  const unit = ((results.AssessedWaters || {}).AssessmentUnits || [])[0];
  if (!unit || !clean(unit.WaterCondition)) return null;

  const causes = String(unit.CauseGroupsImpaired || '')
    .split('|').map((x) => x.trim()).filter(Boolean);

  /* Kept as EPA words them. "Not Supporting" is a term of art and softening it
     into plain English here would be putting our voice on EPA's finding. The
     page explains what it means alongside, without changing it. */
  const uses = {};
  for (const key of ['AquaticLifeUse', 'FishConsumptionUse', 'RecreationUse',
                     'EcologicalUse', 'DrinkingWaterUse', 'OtherUse']) {
    uses[key] = clean(unit[key]);
  }

  return {
    assessment_unit: clean(unit.AssessmentUnitIdentifier),
    waterbody_name: clean(unit.AssessmentUnitName),
    condition: clean(unit.WaterCondition),
    reporting_cycle: clean(unit.ReportingCycle),
    causes_impaired: causes,
    designated_uses: uses,
    epa_url: clean(unit.AUURL),
    read_from_permit: permit
  };
}

export async function updateEchoFile(deps) {
  const { facilities, terminated, scanned } = await fetchWatershedFacilities(deps);
  if (!facilities.length) {
    console.log('   ECHO returned no watershed facilities, keeping the file on disk.');
    return null;
  }
  /* Any facility on the creek reports the same assessment unit, so the first
     one that answers is enough. A failure here loses the verdict, not the
     list. */
  let assessment = null;
  for (const candidate of facilities.slice(0, 4)) {
    try {
      assessment = await fetchAssessment(candidate.permit);
      if (assessment && assessment.condition) break;
    } catch (error) {
      console.warn(`   ECHO assessment lookup failed on ${candidate.permit}, trying the next.`);
    }
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'US EPA ECHO, Clean Water Act facility search',
    source_url: 'https://echo.epa.gov/',
    note: 'Every figure here comes from EPA. Quarters in noncompliance are out of the last twelve. This file records what EPA published and links to it, and says nothing else about any facility.',
    watershed: {
      basin_huc8: BASIN_HUC8,
      units: Object.entries(CREEK_HUC12).map(([code, name]) => ({ code, name }))
    },
    assessment,
    counts: {
      basin_rows_scanned: scanned,
      in_watershed_active: facilities.length,
      in_watershed_terminated: terminated
    },
    facilities
  };
  const text = JSON.stringify(payload, null, 2) + '\n';
  const current = await fs.readFile(OUT_FILE, 'utf8').catch(() => null);
  /* Everything but the stamp, so a run that learned nothing writes nothing. */
  const strip = (value) => value ? value.replace(/"updatedAt": "[^"]*",?\n/, '') : value;
  if (strip(current) === strip(text)) {
    console.log(`   ECHO: ${facilities.length} active, ${terminated} terminated, unchanged.`);
    return payload;
  }
  await fs.writeFile(OUT_FILE, text, 'utf8');
  console.log(`   ECHO: ${facilities.length} active, ${terminated} terminated, written.`);
  return payload;
}
