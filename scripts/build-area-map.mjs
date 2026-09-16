/* The map of the three towns and the creek, drawn from survey data.

     node scripts/build-area-map.mjs

   Writes fivemile-area-map.svg at the repo root. Run it when the sources move,
   which for town limits and a creek channel is a matter of years, not hours.
   It is deliberately NOT on the schedule: nothing here changes twice a day,
   and a cron hammering a donated Overpass mirror for an answer that never
   changes is bad manners. See DECISIONS.md 84.

   WHERE EVERY LINE COMES FROM

     The creek      USGS National Hydrography Dataset, "Fivemile Creek".
                    Public domain, and the only source that has it: OpenStreetMap
                    has no channel mapped through these three towns at all.
     The towns      OpenStreetMap administrative boundaries, admin level 8.
     Roads, rails   OpenStreetMap.
     The gauge      USGS site service, the real coordinates of 02457595.

   OpenStreetMap is ODbL and wants the credit, so the credit is drawn into the
   picture itself and travels with the file wherever it is used. USGS data is
   public domain and is named for the reader's sake rather than the licence's.

   NO TILES, EVER. A tile is a call to somebody else's server while a reader is
   standing on the page, which the stack rule in CLAUDE.md rules out. This
   fetches at build time and commits one file, the same way every number on
   this site arrives.

   The type is left as text rather than outlined, because the page inlines this
   file and lends it DM Mono. A page that shows it as a plain image gets the
   browser's own monospace, which is why the loader in fivemile-common.js
   inlines it. */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(ROOT, 'fivemile-area-map.svg');

const USER_AGENT = 'FIVEMILE area map build (https://fivemile.now, fivemilec@gmail.com)';

/* Overpass is donated capacity and the main instance is often busy. Ask the
   mirrors in turn rather than leaning on one. */
const OVERPASS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.osm.jp/api/interpreter'
];
const NHD = 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6/query';
const GAUGE_ID = '02457595';

const TOWNS = ['Graysville', 'Cardiff', 'Brookside'];
/* The frame. Wide enough to hold the three towns and the gauge east of them,
   and no wider, because the subject is here and not the county. */
const BOX = { south: 33.588, north: 33.700, west: -87.012, east: -86.856 };
const W = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function overpass(query) {
  for (let round = 1; round <= 3; round += 1) {
    for (const host of OVERPASS) {
      try {
        const response = await fetch(host, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(query),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT }
        });
        const text = await response.text();
        if (response.ok && text.trim().startsWith('{')) {
          console.log('   OpenStreetMap: answered by ' + host);
          return JSON.parse(text);
        }
      } catch (error) {
        /* The next mirror gets a turn. */
      }
      await sleep(2500);
    }
    await sleep(6000 * round);
  }
  throw new Error('no Overpass mirror answered');
}

async function json(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

/* ---------------------------------------------------------------------------
   THE PAPER

   Equirectangular, with longitude squeezed by the cosine of the middle
   latitude. Over ten miles of Jefferson County the error is smaller than the
   width of the line the creek is drawn with.
   --------------------------------------------------------------------------- */
const midLat = (BOX.north + BOX.south) / 2;
const kx = Math.cos(midLat * Math.PI / 180);
const spanX = (BOX.east - BOX.west) * kx;
const spanY = BOX.north - BOX.south;
const H = Math.round(W * spanY / spanX);
const x = (lon) => ((lon - BOX.west) * kx / spanX) * W;
const y = (lat) => ((BOX.north - lat) / spanY) * H;
const n = (value) => Math.round(value * 10) / 10;
const near = (a, b) => Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7;

/* A line is cut where it leaves the frame, with a margin so a road that steps
   outside and back does not gain a shortcut across the picture. */
function linePath(points) {
  let d = '';
  let pen = false;
  for (const [lat, lon] of points) {
    const outside = lat < BOX.south - 0.05 || lat > BOX.north + 0.05
      || lon < BOX.west - 0.06 || lon > BOX.east + 0.06;
    if (outside) { pen = false; continue; }
    d += (pen ? 'L' : 'M') + n(x(lon)) + ' ' + n(y(lat));
    pen = true;
  }
  return d;
}

/* A boundary arrives as a pile of unordered ways. Stitched end to end they are
   rings, and only a closed ring can be filled: left open, the fill cuts wedges
   across the map. */
function rings(parts) {
  const pool = parts.filter((part) => part.length > 1).map((part) => part.slice());
  const out = [];
  while (pool.length) {
    let ring = pool.shift();
    let joined = true;
    while (joined) {
      joined = false;
      for (let i = 0; i < pool.length; i += 1) {
        const way = pool[i];
        if (near(ring[ring.length - 1], way[0])) { ring = ring.concat(way.slice(1)); }
        else if (near(ring[ring.length - 1], way[way.length - 1])) { ring = ring.concat(way.slice().reverse().slice(1)); }
        else if (near(ring[0], way[way.length - 1])) { ring = way.slice(0, -1).concat(ring); }
        else if (near(ring[0], way[0])) { ring = way.slice().reverse().slice(0, -1).concat(ring); }
        else continue;
        pool.splice(i, 1);
        joined = true;
        break;
      }
    }
    out.push(ring);
  }
  return out;
}

const ringPath = (ring) => 'M' + ring.map(([lat, lon]) => n(x(lon)) + ' ' + n(y(lat))).join('L') + 'Z';

/* The middle of a shape by area rather than by how many points it happens to
   carry, so a town with a lot of detail down one side does not drag its own
   name off itself. */
function centre(ring) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [lat1, lon1] = ring[i];
    const [lat2, lon2] = ring[i + 1];
    const cross = lon1 * lat2 - lon2 * lat1;
    area += cross;
    cx += (lon1 + lon2) * cross;
    cy += (lat1 + lat2) * cross;
  }
  if (!area) {
    return { lon: ring[0][1], lat: ring[0][0] };
  }
  return { lon: cx / (3 * area), lat: cy / (3 * area) };
}

const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function build() {
  console.log('Drawing the area map:');

  const osm = await overpass(`[out:json][timeout:120];
(
  relation["boundary"="administrative"]["admin_level"="8"](${BOX.south},${BOX.west},${BOX.north},${BOX.east});
  way["highway"~"^(motorway|trunk|primary|secondary)$"](${BOX.south},${BOX.west},${BOX.north},${BOX.east});
  way["railway"="rail"](${BOX.south},${BOX.west},${BOX.north},${BOX.east});
);
out geom;`);

  const roads = { motorway: [], trunk: [], primary: [], secondary: [] };
  const rails = [];
  const towns = [];
  for (const element of osm.elements || []) {
    const tags = element.tags || {};
    const geometry = (element.geometry || []).map((point) => [point.lat, point.lon]);
    if (tags.highway && roads[tags.highway] && geometry.length) roads[tags.highway].push(linePath(geometry));
    if (tags.railway === 'rail' && geometry.length) rails.push(linePath(geometry));
    if (tags.boundary === 'administrative' && TOWNS.includes(tags.name)) {
      const parts = (element.members || [])
        .filter((member) => member.geometry && member.role !== 'inner')
        .map((member) => member.geometry.map((point) => [point.lat, point.lon]));
      const shape = rings(parts);
      const biggest = shape.slice().sort((a, b) => b.length - a.length)[0] || [];
      towns.push({ name: tags.name, d: shape.map(ringPath).join(' '), at: centre(biggest) });
    }
  }
  const missing = TOWNS.filter((name) => !towns.some((town) => town.name === name));
  if (missing.length) throw new Error('OpenStreetMap had no boundary for ' + missing.join(', '));

  /* The creek. OpenStreetMap has no channel here, so this is the survey. */
  const creekUrl = NHD + '?where=' + encodeURIComponent("gnis_name LIKE '%ivemile%' OR gnis_name LIKE '%ive Mile%'")
    + '&geometry=' + encodeURIComponent([BOX.west, BOX.south, BOX.east, BOX.north].join(','))
    + '&geometryType=esriGeometryEnvelope&inSR=4326&outFields=gnis_name&returnGeometry=true&outSR=4326'
    + '&resultRecordCount=2000&f=geojson';
  const water = await json(creekUrl);
  const creek = [];
  for (const feature of water.features || []) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    const lines = geometry.type === 'MultiLineString' ? geometry.coordinates : [geometry.coordinates];
    for (const line of lines) creek.push(linePath(line.map(([lon, lat]) => [lat, lon])));
  }
  if (!creek.filter(Boolean).length) throw new Error('the hydrography service returned no creek');
  console.log('   USGS: ' + creek.length + ' creek segments');

  /* The gauge, at the coordinates USGS holds for it rather than a guess. */
  const site = await fetch('https://waterservices.usgs.gov/nwis/site/?sites=' + GAUGE_ID + '&format=rdb',
    { headers: { 'User-Agent': USER_AGENT } }).then((response) => response.text());
  const row = site.split('\n').filter((line) => line.startsWith('USGS\t'))[0];
  if (!row) throw new Error('the gauge has no coordinates on file');
  const columns = row.split('\t');
  const gauge = { lat: Number(columns[4]), lon: Number(columns[5]) };
  console.log('   USGS: gauge ' + GAUGE_ID + ' at ' + gauge.lat + ', ' + gauge.lon);

  /* A mile, drawn, because a map without a scale is a picture of a place. */
  const barW = ((1 / (69.172 * kx)) * kx / spanX) * W;
  const barX = 28;
  const barY = H - 40;

  const paths = (list, cls) => list.filter(Boolean).map((d) => '<path class="' + cls + '" d="' + d + '"/>').join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" id="fmAreaMap" role="img"
  aria-label="A map of Graysville, Cardiff, and Brookside with Five Mile Creek running west through all three and the Republic gauge to the east.">
<style>
  #fmAreaMap .m-paper{fill:var(--paper,#F2E8D5)}
  #fmAreaMap .m-town{fill:var(--card,#FAF6EE);stroke:var(--fm-rule,#DDCFB8);stroke-width:2}
  #fmAreaMap .m-rail{fill:none;stroke:#C9B99A;stroke-width:1.5;stroke-dasharray:8 6}
  #fmAreaMap .m-road{fill:none;stroke:#C9B99A;stroke-linecap:round;stroke-linejoin:round}
  #fmAreaMap .m-road.big{stroke:#B3A58C;stroke-width:4.5}
  #fmAreaMap .m-road.mid{stroke-width:2.6}
  #fmAreaMap .m-road.small{stroke-width:1.6}
  #fmAreaMap .m-creek{fill:none;stroke:var(--hold-creek,#4A7C59);stroke-width:3.6;stroke-linecap:round;stroke-linejoin:round}
  #fmAreaMap .m-dot{fill:var(--red,#C8102E)}
  #fmAreaMap .m-dot-ring{fill:none;stroke:var(--red,#C8102E);stroke-width:2;opacity:.45}
  #fmAreaMap .m-name{font-family:"DM Mono",ui-monospace,monospace;font-size:23px;letter-spacing:.14em;
    fill:var(--hdr-bg,#3D2810)}
  #fmAreaMap .m-label{font-family:"DM Mono",ui-monospace,monospace;font-size:17px;letter-spacing:.06em;
    fill:var(--fm-muted,#6B6156)}
  #fmAreaMap .m-halo{stroke:var(--paper,#F2E8D5);stroke-width:4;paint-order:stroke}
  #fmAreaMap .m-bar{stroke:var(--hdr-bg,#3D2810);stroke-width:2.5}
</style>
<rect class="m-paper" width="${W}" height="${H}"/>
${towns.map((town) => '<path class="m-town" d="' + town.d + '" fill-rule="evenodd"/>').join('\n')}
${paths(rails, 'm-rail')}
${paths(roads.secondary, 'm-road small')}
${paths(roads.primary, 'm-road mid')}
${paths(roads.trunk.concat(roads.motorway), 'm-road big')}
${paths(creek, 'm-creek')}
<circle class="m-dot-ring" cx="${n(x(gauge.lon))}" cy="${n(y(gauge.lat))}" r="11"/>
<circle class="m-dot" cx="${n(x(gauge.lon))}" cy="${n(y(gauge.lat))}" r="5"/>
<text class="m-label m-halo" x="${n(x(gauge.lon)) - 20}" y="${n(y(gauge.lat)) + 4}" text-anchor="end">REPUBLIC GAUGE</text>
${towns.map((town) => '<text class="m-name m-halo" x="' + n(x(town.at.lon)) + '" y="' + n(y(town.at.lat))
    + '" text-anchor="middle">' + esc(town.name.toUpperCase()) + '</text>').join('\n')}
<g>
  <line class="m-bar" x1="${barX}" y1="${barY}" x2="${n(barX + barW)}" y2="${barY}"/>
  <line class="m-bar" x1="${barX}" y1="${barY - 5}" x2="${barX}" y2="${barY + 5}"/>
  <line class="m-bar" x1="${n(barX + barW)}" y1="${barY - 5}" x2="${n(barX + barW)}" y2="${barY + 5}"/>
  <text class="m-label" x="${barX}" y="${barY + 26}">ONE MILE</text>
</g>
<text class="m-label" x="${W - 24}" y="${H - 16}" text-anchor="end">CREEK AND GAUGE, USGS &#183; TOWNS AND ROADS, OPENSTREETMAP</text>
</svg>
`;

  await fs.writeFile(OUT_FILE, svg, 'utf8');
  console.log('   Written: fivemile-area-map.svg, ' + Math.round(svg.length / 1024) + 'KB, '
    + W + ' by ' + H + ', ' + towns.map((town) => town.name).join(', '));
}

build().catch((error) => {
  /* Nothing is written unless every source answered, because half a map is
     worse than the one already committed. */
  console.error('The area map was not rebuilt:', error.message);
  process.exit(1);
});
