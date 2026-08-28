/* What people have recorded along the lower end of Five Mile Creek, from
   iNaturalist.

   iNaturalist is already in this repo as a build time source for the field
   guide's photographs. This is the other half of it: not what lives here in
   general, but what somebody actually stood in front of and filed this month.
   The guide is the reference and this is the record.

   THE AREA. A bounding box over the lower creek, from Graysville down toward
   the Locust Fork, wide enough to hold the three towns and the ground either
   side of the water. It is drawn around the town coordinates the forecast
   already uses in fetch-site-data.mjs, with room for the bottoms. It catches
   Adamsville and the Mount Olive side too, which is correct: they are on this
   water, and a row names its own town so nobody is told a Mount Olive frog was
   a Cardiff frog.

   RESEARCH GRADE ONLY. An observation is research grade when other people have
   agreed on the identification. Everything below that is one person's best
   guess, and a species name on this site has to be a fact rather than a guess.
   It costs roughly half the volume and it is not close to a trade worth making.

   TWO RULES ABOUT PLACE, AND BOTH ARE HARD.

   One. Nothing here publishes a coordinate, and nothing here publishes a
   street. iNaturalist's own place field frequently reads "Avery Ln, Mount
   Olive, AL, US", which is somebody's yard. That is stripped to the town and
   the town only. It is a privacy matter for the person who filed it, and it is
   also the site's standing rule that a sighting never comes with a spot.

   Two. Over half of these are obscured. iNaturalist blurs the location of a
   threatened species, and a user can blur their own, so the public coordinate
   is randomised inside a cell that can be twenty kilometres across. Those
   records are kept, because obscuring falls hardest on the snakes, the turtles,
   and the salamanders, which are exactly what a reader here wants to see, and
   dropping them would quietly turn this into a list of bugs and weeds. They are
   kept with no town on them and marked, because saying where one happened would
   be inventing the one fact iNaturalist deliberately withheld.

   NOTHING IS THROWN AWAY. The file carries a running roll of every species this
   feed has ever seen, with the first and last date and a count. The page shows
   a recent run, but the roll is permanent, so a species that turned up once in
   2026 is still on the record in 2030. It is also what lets a row say the first
   time something has been recorded here. See DECISIONS.md 52. */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_FILE = path.join(ROOT, 'fivemile-observations.json');
const GUIDE_FILE = path.join(ROOT, 'fivemile-guide.json');

const USER_AGENT = 'FIVEMILE observation feed (https://fivemile.now, fivemilec@gmail.com)';

/* The lower creek. Read as south west corner, north east corner. */
const AREA = {
  label: 'The lower end of Five Mile Creek',
  swlat: 33.575,
  swlng: -87.02,
  nelat: 33.705,
  nelng: -86.855
};

/* How many observations the page holds. The roll below keeps everything. */
const SHOWN = 48;
/* How far back a run looks. Anything older is already in the roll. */
const WINDOW_DAYS = 120;
/* Identified to species or finer. A research grade record can stop at the
   genus when the community agrees it cannot be taken further, and "Halysidota"
   on a page tells a reader here nothing they can use. Dropping them also keeps
   the species count on the roll an honest count of species. */
const RANKS = new Set(['species', 'subspecies', 'variety', 'form', 'hybrid']);

/* iNaturalist's iconic taxa, in words a person uses. Mollusca is most often a
   snail or a slug here but it is also the freshwater mussels, so it stays the
   group name rather than pretending to be one animal. */
const GROUPS = {
  Insecta:        { label: 'Insect',    icon: '\u{1F98B}' },
  Arachnida:      { label: 'Spider',    icon: '\u{1F577}️' },
  Aves:           { label: 'Bird',      icon: '\u{1F426}' },
  Plantae:        { label: 'Plant',     icon: '\u{1F33F}' },
  Reptilia:       { label: 'Reptile',   icon: '\u{1F40D}' },
  Amphibia:       { label: 'Amphibian', icon: '\u{1F438}' },
  Actinopterygii: { label: 'Fish',      icon: '\u{1F41F}' },
  Mammalia:       { label: 'Mammal',    icon: '\u{1F98C}' },
  Mollusca:       { label: 'Mollusc',   icon: '\u{1F40C}' },
  Fungi:          { label: 'Fungus',    icon: '\u{1F344}' },
  Protozoa:       { label: 'Protozoan', icon: '\u{1F343}' },
  Chromista:      { label: 'Chromist',  icon: '\u{1F343}' },
  Animalia:       { label: 'Animal',    icon: '\u{1F43E}' }
};
/* The leaf is the nature desk's own mark, which is exactly right for a
   record iNaturalist never grouped: this is the nature desk. */
const UNGROUPED = { label: 'Living thing', icon: '\u{1F343}' };

/* Anything with a number in it, or a road word, is a street and never leaves
   this file. */
const STREETISH = /\d|\b(st|street|rd|road|ln|lane|dr|drive|ave|avenue|blvd|boulevard|ct|court|cir|circle|pl|place|way|hwy|highway|trl|trail|pkwy|parkway|route|rte|loop|pike|crossing|xing)\b/i;
/* Segments that are a state, a country, or the whole county are true but too
   wide to print as a place, so they resolve to no place at all. */
const TOO_WIDE = /^(al|ala|alabama|us|usa|united states|us-al|jefferson county|jefferson co\.?|north america)$/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (response.ok) return await response.json();
      if (response.status === 429) { await sleep(4000 * attempt); continue; }
      return null;
    } catch (error) {
      await sleep(1500 * attempt);
    }
  }
  return null;
}

/* "Old US Highway 78, Graysville, AL, US" becomes "Graysville".
   "Avery Ln, Mount Olive, AL, US" becomes "Mount Olive".
   "Alabama, US" becomes nothing, because that is not a place near here. */
export function townFrom(placeGuess) {
  if (!placeGuess) return null;
  const parts = String(placeGuess).split(',')
    .map((part) => part.trim())
    .filter((part) => part && !STREETISH.test(part) && !TOO_WIDE.test(part));
  if (!parts.length) return null;
  const town = parts[parts.length - 1];
  return town.length > 40 ? null : town;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

/* The species the field guide already carries, by iNaturalist taxon id, so an
   observation of something the guide covers can open the guide entry. */
async function guideIndex() {
  try {
    const guide = JSON.parse(await fs.readFile(GUIDE_FILE, 'utf8'));
    const index = new Map();
    for (const species of guide.species || []) {
      if (species.inat) index.set(Number(species.inat), species.id);
    }
    return index;
  } catch (error) {
    console.warn('   Field guide unreadable, observations will not cross link.');
    return new Map();
  }
}

function normalize(observation, guide) {
  const taxon = observation.taxon;
  if (!taxon || !taxon.id) return null;
  if (!RANKS.has(taxon.rank)) return null;
  const group = GROUPS[taxon.iconic_taxon_name] || UNGROUPED;
  const latin = taxon.name || null;
  const name = taxon.preferred_common_name || latin;
  if (!name) return null;

  /* Exact first, then anything the guide covers further up the tree, so a
     guide entry written at genus level still catches its species. */
  let guideId = guide.get(Number(taxon.id)) || null;
  if (!guideId) {
    for (const ancestor of taxon.ancestor_ids || []) {
      if (guide.has(Number(ancestor))) { guideId = guide.get(Number(ancestor)); break; }
    }
  }

  const obscured = Boolean(observation.obscured || observation.geoprivacy || observation.taxon_geoprivacy);

  return {
    id: observation.id,
    taxon: taxon.id,
    name,
    /* Only when it says something the common name did not. */
    latin: latin && latin !== name ? latin : null,
    rank: taxon.rank || null,
    group: group.label,
    icon: group.icon,
    observedOn: observation.observed_on || null,
    /* No town on an obscured record. See the note at the top of this file. */
    place: obscured ? null : townFrom(observation.place_guess),
    obscured,
    observer: observation.user?.name || observation.user?.login || null,
    observerLogin: observation.user?.login || null,
    guide: guideId,
    url: 'https://www.inaturalist.org/observations/' + observation.id
  };
}

async function fetchRecent() {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const url = 'https://api.inaturalist.org/v1/observations'
    + '?swlat=' + AREA.swlat + '&swlng=' + AREA.swlng + '&nelat=' + AREA.nelat + '&nelng=' + AREA.nelng
    + '&quality_grade=research'
    + '&d1=' + dayKey(since)
    + '&order_by=observed_on&order=desc&per_page=200';
  const json = await api(url);

  /* One more call, for the one number a reader will actually want: how much
     has ever been recorded here. It is iNaturalist's count and not ours, so it
     is reported as theirs. */
  const everUrl = 'https://api.inaturalist.org/v1/observations'
    + '?swlat=' + AREA.swlat + '&swlng=' + AREA.swlng + '&nelat=' + AREA.nelat + '&nelng=' + AREA.nelng
    + '&quality_grade=research&per_page=1';
  const ever = await api(everUrl);

  return {
    results: json?.results || [],
    windowTotal: json?.total_results ?? null,
    areaTotal: ever?.total_results ?? null
  };
}

/* The permanent half. Every species this feed has ever seen, first date, last
   date, and which observations. Old entries are never dropped and never
   rewritten except to extend them. Observation ids are held rather than a bare
   count so a re-run cannot inflate anything. */
function updateRoll(previousRoll, observations) {
  const roll = new Map();
  for (const entry of previousRoll || []) {
    roll.set(Number(entry.taxon), { ...entry, taxon: Number(entry.taxon) });
  }

  for (const observation of observations) {
    if (!observation.observedOn) continue;
    const existing = roll.get(observation.taxon);
    if (!existing) {
      roll.set(observation.taxon, {
        taxon: observation.taxon,
        name: observation.name,
        latin: observation.latin,
        group: observation.group,
        rank: observation.rank,
        first: observation.observedOn,
        last: observation.observedOn,
        ids: [observation.id]
      });
      continue;
    }
    const ids = new Set(existing.ids || []);
    ids.add(observation.id);
    existing.ids = [...ids].sort((a, b) => a - b);
    existing.name = observation.name || existing.name;
    existing.latin = observation.latin || existing.latin;
    existing.group = observation.group || existing.group;
    if (observation.observedOn < existing.first) existing.first = observation.observedOn;
    if (observation.observedOn > existing.last) existing.last = observation.observedOn;
  }

  return [...roll.values()]
    .map((entry) => ({
      taxon: entry.taxon,
      name: entry.name,
      latin: entry.latin || null,
      group: entry.group,
      rank: entry.rank || null,
      first: entry.first,
      last: entry.last,
      count: (entry.ids || []).length,
      ids: entry.ids || []
    }))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

export async function updateObservationsFile() {
  const previous = await fs.readFile(OUT_FILE, 'utf8').then(JSON.parse).catch(() => null);
  const guide = await guideIndex();
  const { results, windowTotal, areaTotal } = await fetchRecent();

  if (!results.length) {
    console.log('   iNaturalist returned nothing, keeping the file on disk.');
    return previous;
  }

  const observations = results.map((result) => normalize(result, guide)).filter(Boolean);
  const roll = updateRoll(previous?.roll, observations);

  /* A species is new here only if this feed has run before and had never seen
     it. On a first run everything would be new, which is true and useless. */
  const known = new Set((previous?.roll || []).map((entry) => Number(entry.taxon)));
  const shown = observations.slice(0, SHOWN).map((observation) => ({
    ...observation,
    firstRecord: previous ? !known.has(observation.taxon) : false
  }));

  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'iNaturalist',
    source_url: 'https://www.inaturalist.org/observations'
      + '?swlat=' + AREA.swlat + '&swlng=' + AREA.swlng + '&nelat=' + AREA.nelat + '&nelng=' + AREA.nelng
      + '&quality_grade=research',
    note: 'Research grade observations only, which means other people agreed on the identification. Places are given to the town and no closer, and a record iNaturalist has obscured carries no place at all.',
    area: AREA,
    counts: {
      shown: shown.length,
      window_days: WINDOW_DAYS,
      in_window: observations.length,
      species_in_window: new Set(observations.map((observation) => observation.taxon)).size,
      window_total: windowTotal,
      species_recorded: roll.length,
      observations_recorded: roll.reduce((sum, entry) => sum + (entry.count || 0), 0),
      /* iNaturalist's own all time count for this box, not ours. */
      area_total: areaTotal,
      guide_links: shown.filter((observation) => observation.guide).length
    },
    observations: shown,
    roll
  };

  const text = JSON.stringify(payload, null, 2) + '\n';
  const currentText = previous ? JSON.stringify(previous, null, 2) + '\n' : null;
  const strip = (value) => (value ? value.replace(/"updatedAt": "[^"]*",?\n/, '') : value);
  if (strip(currentText) === strip(text)) {
    console.log('   iNaturalist: ' + shown.length + ' shown, ' + roll.length + ' species on the roll, unchanged.');
    return payload;
  }

  await fs.writeFile(OUT_FILE, text, 'utf8');
  console.log('   iNaturalist: ' + shown.length + ' shown, ' + roll.length + ' species on the roll, written.');
  return payload;
}

if (process.argv[1] && process.argv[1].endsWith('inat-observations.mjs')) {
  updateObservationsFile().catch((error) => {
    console.error('Observation feed failed:', error.message);
    process.exit(1);
  });
}
