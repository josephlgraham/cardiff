/* Writes the measured gauge readings into the HTML.
 *
 *   node scripts/build-gauge-tiles.mjs
 *   node scripts/build-gauge-tiles.mjs --check     report, write nothing
 *   node scripts/build-gauge-tiles.mjs --report    print every harvested block
 *
 * WHY THIS EXISTS. The same reason the heritage prose is written in at build
 * time, on the pages where the argument is strongest. A gauge tile ships an
 * em dash and is filled from a committed JSON file the moment the script runs,
 * so the creek stage, the water temperature and the air quality were the one
 * part of these five pages that a crawler, a social preview bot, and the first
 * paint never saw. The best thing on the page was the part nothing could read.
 *
 * THE SPLIT THIS FILE IS BUILT AROUND. A reading that is MEASURED and sits in
 * a committed file can be written into the HTML: it is a fact with a source,
 * and it goes stale the same way the file does. A reading COMPUTED FROM NOW
 * cannot: a build time snapshot of today is wrong by tomorrow and would sit in
 * the markup asserting otherwise. That is the hard rule about never inventing
 * a fact, with a timestamp on it.
 *
 * So the solunar window, the frost countdown, the daylight hours and the whole
 * of Night Sky are deliberately absent from TILES below and still ship a dash.
 * The page fills them in the reader's browser, from the reader's own clock,
 * which is the only place that question can be answered honestly.
 *
 * IT RUNS THE SITE'S OWN RENDERERS. Reimplementing the markup in Node would be
 * wrong inside a month: two copies of one renderer drift, and the copy nobody
 * looks at is the one a crawler reads. Every script the page loads is loaded
 * and run here, in the page's own order, against the DOM shim below. Then only
 * the tiles named in TILES are harvested and everything else the run produced
 * is thrown away. That is what makes it structurally impossible for a time
 * dependent value to reach the markup: it is not that this file is careful,
 * it is that it never looks at those tiles.
 *
 * WHERE IT WRITES. Between the markers, and nowhere else:
 *
 *   <!--PRERENDER:creekStageVal--> ... <!--/PRERENDER-->
 *
 * A tile without markers is left alone, so adding a pair is how you opt a
 * reading in and deleting them is how you opt it out. Nothing here parses HTML.
 * Same contract as scripts/build-heritage-pages.mjs. See DECISIONS.md 53 and 61.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* -------------------------------------------------------------------------
   WHAT GETS WRITTEN

   Every entry here is a reading that came off an instrument and is sitting in
   a committed file. Nothing here is worked out from the build clock. Read the
   note at the top before adding a line.

   val   the figure, written as innerHTML because the renderers write it that way
   sub   the sentence under it, written as text
   mark  the emoji ahead of the kicker, when the renderer gives it a live one
   lbl   the kicker, when the renderer names the gauge in it
   ------------------------------------------------------------------------- */
const TILES = {
  /* The homepage tiles have no ids. They are the first three children of
     #nowGrid, and the fourth, the next date on the calendar, is computed from
     today and is deliberately not in this list. */
  'index.html': [
    { key: 'homeCreek',   from: { grid: 0 }, parts: ['val', 'sub', 'lbl', 'mark'] },
    { key: 'homeWeather', from: { grid: 1 }, parts: ['val', 'sub', 'mark'] },
    { key: 'homeAir',     from: { grid: 2 }, parts: ['val', 'sub', 'mark'] }
  ],
  'fivemile-almanac.html': [
    { key: 'creekStage',  from: { tile: 'creekStage' },  parts: ['val', 'sub', 'mark'] },
    { key: 'creekFlow',   from: { tile: 'creekFlow' },   parts: ['val', 'sub'] },
    { key: 'creekChange', from: { tile: 'creekChange' }, parts: ['val', 'sub', 'mark'] },
    { key: 'creekRain',   from: { tile: 'creekRain' },   parts: ['val', 'sub'] }
  ],
  'fivemile-fishing.html': [
    { key: 'fishWater',   from: { tile: 'fishWater' },   parts: ['val', 'sub'] },
    { key: 'fishCreek',   from: { tile: 'fishCreek' },   parts: ['val', 'sub', 'mark'] },
    { key: 'fishOxygen',  from: { tile: 'fishOxygen' },  parts: ['val', 'sub', 'mark'] }
  ],
  'fivemile-garden.html': [
    { key: 'gardenGround', from: { tile: 'gardenGround' }, parts: ['val', 'sub', 'mark'] },
    { key: 'gardenRain',   from: { tile: 'gardenRain' },   parts: ['val', 'sub'] },
    { key: 'gardenMonth',  from: { tile: 'gardenMonth' },  parts: ['val', 'sub'] }
  ],
  'fivemile-nature.html': [
    { key: 'natureGround', from: { tile: 'natureGround' }, parts: ['val', 'sub', 'mark'] },
    { key: 'natureMonth',  from: { tile: 'natureMonth' },  parts: ['val', 'sub'] }
  ]
};

/* The scripts each page loads, in the order the page loads them.
   fivemile-intro.js and fivemile-pwa.js are left out: one splits the wordmark
   and one registers a service worker, and neither writes a reading. */
const SCRIPTS = {
  'index.html': ['fivemile-brand.js', 'fivemile-season-data.js', { inline: true }, 'fivemile-common.js'],
  'fivemile-almanac.html': ['fivemile-brand.js', 'fivemile-common.js', 'fivemile-season-data.js', 'fivemile-app.js', 'fivemile-almanac-core.js', 'fivemile-almanac.js'],
  'fivemile-fishing.html': ['fivemile-brand.js', 'fivemile-common.js', 'fivemile-season-data.js', 'fivemile-app.js', 'fivemile-almanac-core.js', 'fivemile-sky.js', 'fivemile-fishing.js'],
  'fivemile-garden.html': ['fivemile-brand.js', 'fivemile-common.js', 'fivemile-season-data.js', 'fivemile-app.js', 'fivemile-almanac-core.js', 'fivemile-garden.js'],
  'fivemile-nature.html': ['fivemile-brand.js', 'fivemile-common.js', 'fivemile-season-data.js', 'fivemile-app.js', 'fivemile-almanac-core.js', 'fivemile-nature.js']
};

/* -------------------------------------------------------------------------
   The shim

   textContent in, innerHTML out is how these renderers escape, so the escaping
   has to match what a browser does serialising a text node: the three markup
   characters and the non-breaking space, and nothing else. Quotes are
   deliberately not escaped, because a browser does not escape them either, and
   a prerender that escaped more than the runtime would produce a page that
   changes under the reader the moment the script catches up. Lifted from
   build-heritage-pages.mjs rather than reinvented.
   ------------------------------------------------------------------------- */
function escapeText(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/ /g, '&nbsp;');
}

/* An attribute value, escaped the way a browser escapes one when it serialises
   an element. Fewer characters than a text node, and a different set. */
function escapeAttribute(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/ /g, '&nbsp;');
}

/* The order attributes come back in has to be stable, or the build rewrites the
   same bytes every run and --check calls a current page stale forever, which is
   the bug the heritage script shipped with. The class first, because that is
   where it is written in the HTML, then the aria attributes in a fixed order. */
const ATTRIBUTE_ORDER = ['class', 'role', 'aria-label', 'aria-hidden'];

class ShimElement {
  constructor(tag, attributes) {
    this.tagName = (tag || 'div').toUpperCase();
    this._html = '';
    this.attributes = Object.assign({}, attributes || {});
    this.children = [];
    this.hidden = false;
    this.onclick = null;
    /* Nothing has been laid out, so every box measures zero. The renderers that
       care already treat a zero width box as "not measured yet" and fall back to
       a default, which is what a browser does on a first paint too. */
    this.clientWidth = 0;
    this.clientHeight = 0;
    this.offsetWidth = 0;
    this.offsetHeight = 0;
    /* Whether a renderer actually wrote to this node. A block nobody wrote is
       left alone rather than blanked. */
    this.touched = false;
    this.classList = {
      add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false
    };
    this.style = { setProperty: () => {}, removeProperty: () => {} };
    this.dataset = {};
  }
  set textContent(value) { this.innerHTML = escapeText(value); }
  get textContent() { return this._html.replace(/<[^>]*>/g, ''); }
  set innerHTML(value) { this._html = String(value == null ? '' : value); this.touched = true; }
  get innerHTML() { return this._html; }
  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); this.touched = true; }
  removeAttribute(name) { delete this.attributes[name]; this.touched = true; }
  hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name); }
  appendChild(child) { this.children.push(child); return child; }
  append(child) { this.children.push(child); return child; }
  insertBefore(child) { this.children.push(child); return child; }
  addEventListener() {}
  removeEventListener() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  contains() { return false; }
  remove() {}
  focus() {}
  scrollIntoView() {}
  getBoundingClientRect() { return { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }; }
  /* The topographic background draws itself on a canvas. It is decoration, it
     paints nothing a crawler or a harvest reads, and it is animating on a frame
     loop that never runs here, so the context accepts every call and keeps
     none of it. */
  getContext() {
    const sink = new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'canvas') return this;
        if (prop === 'measureText') return () => ({ width: 0 });
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => ({ addColorStop: () => {} });
        }
        if (typeof prop === 'string' && /^(fill|stroke|line|font|text|global|shadow|image|miter)/i.test(prop)) {
          return () => {};
        }
        return () => {};
      },
      set: () => true
    });
    return sink;
  }
  /* Only ever asked of a gauge mark, which is an <i> carrying a class and at
     most three aria attributes. */
  get outerHTML() {
    const attrs = Object.keys(this.attributes)
      .sort((a, b) => {
        const ai = ATTRIBUTE_ORDER.indexOf(a);
        const bi = ATTRIBUTE_ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
      .map((name) => ' ' + name + '="' + escapeAttribute(this.attributes[name]) + '"')
      .join('');
    const tag = this.tagName.toLowerCase();
    return '<' + tag + attrs + '>' + this._html + '</' + tag + '>';
  }
}

/* A gauge tile as the renderers reach into it. The homepage goes through
   querySelectorAll and then querySelector on the tile it got back; the four
   desk pages go through getElementById on {id}Val and {id}Sub and a descendant
   selector for the mark. Both shapes have to hand back the same four nodes, or
   a harvest would read one node while the renderer wrote another. */
function makeTile(id) {
  const val = new ShimElement('div', { class: 'g-val' });
  const sub = new ShimElement('div', { class: 'g-sub' });
  const lbl = new ShimElement('span', { class: 'g-lbl' });
  const mark = new ShimElement('i', { class: 'g-mark', 'aria-hidden': 'true' });
  const tile = new ShimElement('a', { class: 'card-gauge' });
  if (id) tile.attributes.id = id;
  tile.querySelector = (selector) => {
    if (selector === '.g-val') return val;
    if (selector === '.g-sub') return sub;
    if (selector === '.g-lbl') return lbl;
    if (selector === '.g-mark') return mark;
    return null;
  };
  tile.parts = { val, sub, lbl, mark };
  return tile;
}

function makeShim(page, files) {
  const elements = new Map();
  /* Every tile the page could name, whether or not it is harvested. A renderer
     that paints the solunar window has to find somewhere to paint it, and the
     answer being "a node nobody reads" is exactly the point. */
  const tiles = new Map();
  const unknownSelectors = new Set();

  const gridTiles = [makeTile(), makeTile(), makeTile(), makeTile()];

  const tileFor = (id) => {
    if (!tiles.has(id)) tiles.set(id, makeTile(id + 'Tile'));
    return tiles.get(id);
  };

  const element = (id) => {
    if (elements.has(id)) return elements.get(id);
    /* {id}Val and {id}Sub are the two halves of a gauge tile, so they resolve to
       the tile's own nodes rather than to anonymous ones. */
    const gauge = /^(.*[a-z])(Val|Sub)$/.exec(id);
    if (gauge) {
      const tile = tileFor(gauge[1]);
      const node = gauge[2] === 'Val' ? tile.parts.val : tile.parts.sub;
      elements.set(id, node);
      return node;
    }
    const node = new ShimElement('div', { id });
    elements.set(id, node);
    return node;
  };

  const documentShim = {
    readyState: 'complete',
    documentElement: new ShimElement('html'),
    body: new ShimElement('body'),
    head: new ShimElement('head'),
    title: '',
    cookie: '',
    getElementById: (id) => element(id),
    createElement: (tag) => new ShimElement(tag),
    createTextNode: (text) => ({ textContent: text }),
    createDocumentFragment: () => new ShimElement('fragment'),
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelectorAll: (selector) => {
      if (selector === '#nowGrid .card-gauge') return gridTiles;
      unknownSelectors.add(selector);
      return [];
    },
    querySelector: (selector) => {
      /* The one selector shape that reaches a harvested node. FA.setTileMark
         goes through it on all four desk pages. */
      const mark = /^#([A-Za-z0-9_-]+)Tile \.g-mark$/.exec(selector);
      if (mark) return tileFor(mark[1]).parts.mark;
      unknownSelectors.add(selector);
      return new ShimElement('div');
    }
  };

  const noop = () => {};
  const windowShim = {
    document: documentShim,
    location: { pathname: '/' + page, href: 'https://fivemile.now/' + page, search: '', hash: '', hostname: 'fivemile.now' },
    navigator: { userAgent: 'fivemile-prerender', onLine: true },
    /* Answered off the disk rather than the network. A build is never at the
       mercy of anything outside this repo, which is the same promise the site
       makes to a reader. */
    fetch: (url) => {
      const name = String(url).split('?')[0].replace(/^\.?\//, '');
      if (!Object.prototype.hasOwnProperty.call(files, name)) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.reject(new Error('absent: ' + name)),
          text: () => Promise.reject(new Error('absent: ' + name))
        });
      }
      /* A fresh copy each time, so one renderer mutating what it read cannot
         change what the next one gets. */
      const body = JSON.parse(JSON.stringify(files[name]));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body))
      });
    },
    /* A redraw on a timer is the page keeping itself current in front of a
       reader. There is no reader here and the build has one pass to make. */
    setInterval: () => 0,
    clearInterval: noop,
    setTimeout: () => 0,
    clearTimeout: noop,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: noop,
    addEventListener: noop,
    removeEventListener: noop,
    /* No viewport, so no media query matches and every renderer takes its wide
       branch. Nothing harvested here differs between the two. */
    matchMedia: () => ({ matches: false, addListener: noop, removeListener: noop, addEventListener: noop, removeEventListener: noop }),
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    ResizeObserver: function () { return { observe: noop, unobserve: noop, disconnect: noop }; },
    IntersectionObserver: function () { return { observe: noop, unobserve: noop, disconnect: noop }; },
    MutationObserver: function () { return { observe: noop, disconnect: noop }; },
    Image: function () { return new ShimElement('img'); },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    scrollTo: noop,
    innerWidth: 1000,
    innerHeight: 800,
    /* Kept quiet. A renderer warning that a file is missing is worth seeing when
       a reader hits it, and is noise on top of this script's own report. */
    console: { log: noop, warn: noop, error: noop, info: noop, debug: noop }
  };
  windowShim.window = windowShim;
  windowShim.self = windowShim;

  return { documentShim, windowShim, gridTiles, tiles, unknownSelectors };
}

/* The one inline script on the site that paints a reading. It is the homepage,
   and it is found by the two script tags either side of it rather than parsed,
   because nothing here parses HTML. */
function inlineScript(html, file) {
  const anchor = html.indexOf('<script src="fivemile-season-data.js"></script>');
  if (anchor === -1) throw new Error(file + ': the season data tag the inline script follows is gone.');
  const open = html.indexOf('<script>', anchor);
  if (open === -1) throw new Error(file + ': no inline script after the season data tag.');
  const from = open + '<script>'.length;
  const close = html.indexOf('</script>', from);
  if (close === -1) throw new Error(file + ': the inline script has no closing tag.');
  return html.slice(from, close);
}

async function runPage(file, html, files) {
  const shim = makeShim(file, files);

  /* The window shim IS the global object, rather than a parameter handed to the
     script. That is what a browser does, and it is the difference between a
     shim that answers what these renderers ask for and one that has to have
     every bare global, innerWidth and matchMedia and the rest, enumerated in a
     parameter list that goes out of date the first time a script grows a new
     one. Everything on the shim resolves unqualified, and anything not on it
     throws a ReferenceError naming what is missing, which is the same habit the
     heritage shim has of failing loudly rather than writing a page with a hole
     in it. */
  const context = vm.createContext(shim.windowShim);

  /* Every source is read before any of them runs, and then they run back to
     back with nothing awaited in between. That is not tidiness. Reading a file
     mid-loop yields to the microtask queue, which let the homepage's fetch
     callbacks fire while fivemile-common.js was still being read off the disk,
     so the weather tile's mark was painted before window.FivemileWx existed and
     came out of the harvest missing. A browser never loses that race: a plain
     script tag blocks the parser, so common.js has run long before a JSON fetch
     comes back. Running them with no gap is what reproduces that. */
  const sources = [];
  for (const entry of SCRIPTS[file]) {
    sources.push(typeof entry === 'string'
      ? { name: entry, code: await fs.readFile(path.join(ROOT, entry), 'utf8') }
      : { name: 'the inline script', code: inlineScript(html, file) });
  }

  for (const source of sources) {
    try {
      vm.runInContext(source.code, context, { filename: source.name });
    } catch (error) {
      throw new Error(file + ': ' + source.name + ' would not run in the shim: ' + error.message);
    }
  }

  /* The renderers do their work in promise callbacks hanging off a fetch, and
     several of those chains are four deep, so the queue is drained rather than
     turned over once. */
  for (let pass = 0; pass < 50; pass += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }

  return shim;
}

/* -------------------------------------------------------------------------
   Harvesting

   Only what TILES names, and only if the renderer actually wrote it. An
   untouched node means the reading did not come through on this run, and the
   right answer then is to leave whatever the page already had rather than
   blank it.
   ------------------------------------------------------------------------- */
/* The character the almanac change tile falls back to when it has no history
   to compare against. Built from its code point so the character itself never
   appears in this file. */
const DASH = String.fromCharCode(0x2014);

const PART_MARKER = { val: 'Val', sub: 'Sub', lbl: 'Lbl', mark: 'Mark' };

function harvest(file, shim) {
  const blocks = new Map();
  const skipped = [];

  for (const entry of TILES[file]) {
    const tile = entry.from.grid !== undefined
      ? shim.gridTiles[entry.from.grid]
      : shim.tiles.get(entry.from.tile);

    if (!tile) {
      skipped.push(entry.key + ' (the renderer never reached this tile)');
      continue;
    }

    for (const part of entry.parts) {
      const node = tile.parts[part];
      const id = entry.key + PART_MARKER[part];
      if (!node || !node.touched) {
        skipped.push(id + ' (not written)');
        continue;
      }
      const content = part === 'mark' ? node.outerHTML : node.innerHTML;
      /* A dash is the renderer saying it has nothing, which is what the HTML
         already holds. Writing it back would be churn that says nothing, so it
         counts as a miss. Both spellings, because the tiles ship the entity and
         one renderer falls back to the character. Written as an escape so the
         character itself does not appear in this file. */
      if (!content || content === '&mdash;' || content === DASH) {
        skipped.push(id + ' (no reading)');
        continue;
      }
      blocks.set(id, content);
    }
  }

  return { blocks, skipped };
}

/* -------------------------------------------------------------------------
   Writing it in
   ------------------------------------------------------------------------- */
function markedIds(html) {
  const ids = [];
  const pattern = /<!--PRERENDER:([A-Za-z0-9_-]+)-->/g;
  let match;
  while ((match = pattern.exec(html))) ids.push(match[1]);
  return ids;
}

/* The break the file already uses. This working tree is CRLF while the index is
   LF, and it is mixed: some files here are bare LF on disk. Git normalises the
   difference away so a line ending mistake never shows in a diff, while the
   script rewrites those bytes every run and --check calls a current page stale
   forever. Same guard, same reason, as build-heritage-pages.mjs. */
const newlineOf = (html) => (html.includes('\r\n') ? '\r\n' : '\n');

/* A gauge value is short and sits inside a div written on one line, so it goes
   in inline rather than on lines of its own. A newline either side would be a
   text node the browser paints, which would change what the tile looks like.
   That is why this one does not take a newline the way the heritage writer
   does, and why newlineOf above is only ever used to check the file, never to
   build a block. */
function replaceBetween(html, id, content) {
  const open = '<!--PRERENDER:' + id + '-->';
  const close = '<!--/PRERENDER-->';
  const start = html.indexOf(open);
  if (start === -1) return { html, changed: false, found: false };
  const from = start + open.length;
  const end = html.indexOf(close, from);
  if (end === -1) throw new Error('Marker ' + open + ' has no closing marker.');
  const next = html.slice(0, from) + content + html.slice(end);
  return { html: next, changed: next !== html, found: true };
}

/* Everything the five pages read, answered off the disk. One file being absent
   never fails the run: the renderer that wanted it paints its own empty state,
   and the tile behind it is skipped as unwritten rather than blanked. */
const DATA_FILES = [
  'fivemile-weather.json', 'fivemile-watershed.json', 'fivemile-air-quality.json',
  'fivemile-skywatch.json', 'fivemile-watershed-weather.json', 'fivemile-garden-photos.json',
  'fivemile-observations.json', 'fivemile-home-anchor.json', 'fivemile-heritage.json',
  'fivemile-news-feed.json', 'fivemile-news-live.json', 'fivemile-guide.json',
  'fivemile-hollers.json', 'fivemile-hollers-rotator.json', 'fivemile-echo.json',
  'fivemile-rain-log.json', 'fivemile-creek-peaks.json', 'fivemile-cms-sources.json',
  'ticker.json', 'announcements.json', 'turnings.json'
];

async function readDataFiles() {
  const files = {};
  for (const name of DATA_FILES) {
    try {
      files[name] = JSON.parse(await fs.readFile(path.join(ROOT, name), 'utf8'));
    } catch (error) {
      /* Absent or unparseable is a state the site already handles. */
    }
  }
  return files;
}

async function main() {
  const check = process.argv.includes('--check');
  const report = process.argv.includes('--report');
  const files = await readDataFiles();

  let wrote = 0;
  let behind = 0;

  for (const file of Object.keys(TILES)) {
    const filePath = path.join(ROOT, file);
    const html = await fs.readFile(filePath, 'utf8');
    const ids = markedIds(html);
    /* A page with no markers is left alone. Under --report it still runs, so
       you can see what a reading would come out as before deciding whether it
       belongs in TILES and putting markers round it. Nothing is written either
       way, because there is nowhere to write. */
    if (!ids.length && !report) {
      console.warn('   ' + file + ' has no prerender markers, skipped.');
      continue;
    }

    const shim = await runPage(file, html, files);
    const { blocks, skipped } = harvest(file, shim);

    let next = html;
    let changed = false;
    const empty = [];

    if (report) {
      for (const [id, content] of blocks) console.log('      ' + id + ': ' + content);
    }

    for (const id of ids) {
      if (!blocks.has(id)) { empty.push(id); continue; }
      const result = replaceBetween(next, id, blocks.get(id));
      next = result.html;
      changed = changed || result.changed;
    }

    /* A marker with no reading behind it is reported rather than blanked. It
       means the file feeding it is absent or the gauge is quiet, and the page's
       own empty state is the honest thing to leave in place. */
    if (empty.length) {
      console.warn('   ' + file + ': no reading for ' + empty.join(', '));
    }
    if (report && skipped.length) {
      console.log('      skipped: ' + skipped.join(', '));
    }
    if (report && shim.unknownSelectors.size) {
      console.log('      selectors the shim did not know: ' + [...shim.unknownSelectors].join(', '));
    }
    /* Reading it back rather than trusting the write. A block that arrived with
       a newline in it would put a text node inside a gauge value. */
    if (newlineOf(next) !== newlineOf(html)) {
      throw new Error(file + ': the line endings moved, which means a block carried one in.');
    }

    if (!changed) {
      console.log('   ' + file + ': up to date.');
      continue;
    }
    if (check) {
      behind += 1;
      console.log('   ' + file + ': behind the data files.');
      continue;
    }
    await fs.writeFile(filePath, next, 'utf8');
    wrote += 1;
    console.log('   ' + file + ': written.');
  }

  if (check && behind) {
    /* Not an error, and there is no CI gate on it. Unlike the heritage prose,
       these pages are expected to drift behind the gauge between runs: that is
       what it means to snapshot a live reading. */
    console.log('Gauge tiles are behind the data files. Between runs that is normal.');
    return;
  }
  console.log(check ? 'Gauge tiles are current.' : 'Gauge tiles: ' + wrote + ' written.');
}

main().catch((error) => {
  console.error('Gauge prerender failed:', error.message);
  process.exitCode = 1;
});
