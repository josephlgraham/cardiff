/* Writes the heritage prose into the heritage HTML files.
 *
 *   node scripts/build-heritage-pages.mjs
 *   node scripts/build-heritage-pages.mjs --check     report, write nothing
 *
 * WHY THIS EXISTS. Every word of the heritage narrative lives in
 * fivemile-heritage.json and was drawn by script in the reader's browser, so
 * the HTML on disk carried a heading, a nav, and an em dash where the chapter
 * should be. Google renders JavaScript, on a slower second pass. Bing, the
 * social preview bots, and most of the crawlers that feed an answer engine do
 * much less of it, or none. Six thousand words of coal camp history that
 * nothing can read without running a script is the site's best content filed
 * where the least of it gets seen.
 *
 * So the same markup is now written into the files at build time. The page
 * still loads the same scripts and still redraws itself from the JSON the
 * moment it can, exactly as before. This only changes what a reader gets
 * before any of that happens, which is now the chapter instead of a dash.
 *
 * IT RUNS THE SITE'S OWN RENDERER, ON PURPOSE. The obvious way to do this is
 * to reimplement the markup in Node, and that would be wrong within a month:
 * two copies of one renderer drift, and the copy nobody looks at is the one a
 * crawler reads. So fivemile-heritage-core.js and the page's own script are
 * loaded and run here against a small DOM shim. There is one definition of a
 * timeline row and this file does not contain it.
 *
 * The shim is about forty lines because the renderers only ever ask for six
 * things: getElementById, querySelector for the chapter marker, createElement
 * for the escaper, innerHTML, textContent, and className. If a renderer ever
 * reaches for something else, this throws rather than quietly writing a page
 * with a hole in it.
 *
 * WHERE IT WRITES. Between the markers, and nowhere else:
 *
 *   <!--PRERENDER:chapterBody--> ... <!--/PRERENDER-->
 *
 * A container without markers is left alone, so adding a marker is how you
 * opt a block in and deleting one is how you opt it out. Nothing here parses
 * HTML. See DECISIONS.md 53.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = path.join(ROOT, 'fivemile-heritage.json');
const CORE = path.join(ROOT, 'fivemile-heritage-core.js');

/* Each page, the script that draws it, and the chapter it is, if it is one.
   The hub is in this list because it has the same problem for the same reason:
   its seven blurbs and three town panels were drawn in the browser too. */
const PAGES = [
  { file: 'fivemile-heritage.html',           script: 'fivemile-heritage.js',         chapter: null },
  { file: 'fivemile-heritage-before.html',    script: 'fivemile-heritage-chapter.js', chapter: 'before' },
  { file: 'fivemile-heritage-camps.html',     script: 'fivemile-heritage-chapter.js', chapter: 'camps' },
  { file: 'fivemile-heritage-charters.html',  script: 'fivemile-heritage-chapter.js', chapter: 'charters' },
  { file: 'fivemile-heritage-peak.html',      script: 'fivemile-heritage-chapter.js', chapter: 'peak' },
  { file: 'fivemile-heritage-close.html',     script: 'fivemile-heritage-chapter.js', chapter: 'close' },
  { file: 'fivemile-heritage-after.html',     script: 'fivemile-heritage-chapter.js', chapter: 'after' },
  { file: 'fivemile-heritage-back.html',      script: 'fivemile-heritage-chapter.js', chapter: 'back' }
];

/* -------------------------------------------------------------------------
   The shim

   textContent in, innerHTML out is how fivemile-heritage-core.js escapes, so
   the escaping here has to match what a browser does serialising a text node:
   the three markup characters and the non-breaking space, and nothing else.
   Quotes are deliberately not escaped, because a browser does not escape them
   either, and a prerender that escaped more than the runtime would produce a
   page that changes under the reader the moment the script catches up.
   ------------------------------------------------------------------------- */
function escapeLikeBrowser(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/ /g, '&nbsp;');
}

class ShimElement {
  constructor(id) {
    this.id = id;
    this.innerHTML = '';
    this.className = null;
    this.attributes = {};
  }
  set textContent(value) { this.innerHTML = escapeLikeBrowser(value); }
  get textContent() { return this.innerHTML; }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
}

function makeShim(page, data) {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, new ShimElement(id));
    return elements.get(id);
  };

  const documentShim = {
    getElementById: (id) => element(id),
    createElement: () => new ShimElement(null),
    querySelector: (selector) => {
      if (selector === '[data-chapter]') {
        if (!page.chapter) return null;
        const host = element('__chapterHost');
        host.setAttribute('data-chapter', page.chapter);
        return host;
      }
      throw new Error('The shim was asked for a selector it does not know: ' + selector);
    },
    addEventListener: () => {},
    readyState: 'complete'
  };

  const windowShim = {
    document: documentShim,
    /* The one fetch the renderers make. It is answered from the file already
       in memory rather than from the network, so a build is never at the mercy
       of anything outside this repo. */
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(data) }),
    addEventListener: () => {},
    location: { pathname: '/' + page.file }
  };
  windowShim.window = windowShim;

  return { elements, documentShim, windowShim };
}

async function renderPage(page, data, coreSource) {
  const { elements, documentShim, windowShim } = makeShim(page, data);
  const pageSource = await fs.readFile(path.join(ROOT, page.script), 'utf8');

  const run = (source, name) => {
    try {
      /* Both files are IIFEs that close over window and document, so handing
         them in as parameters is the whole of what they need. */
      new Function('window', 'document', 'fetch', source)(windowShim, documentShim, windowShim.fetch);
    } catch (error) {
      throw new Error(name + ' would not run in the shim: ' + error.message);
    }
  };

  run(coreSource, 'fivemile-heritage-core.js');
  run(pageSource, page.script);

  /* The renderers hand their work back through a promise, so let every pending
     microtask settle before reading what they wrote. */
  await new Promise((resolve) => setImmediate(resolve));
  return elements;
}

/* -------------------------------------------------------------------------
   Structured data

   The prose above is what a reader gets. This is the same chapter said in the
   one vocabulary a search engine reads without guessing: what the page is,
   which of the three towns it is about, which years it covers, where it sits
   in a run of seven, and what it was written from. It is built from
   fivemile-heritage.json for the same reason the prose is, so a chapter that
   changes its title or its span cannot end up saying two different things.

   Nothing in here is a claim the page does not already make in words. The
   published dates are the day each page actually first went up, read out of
   the repo history and written into fivemile-heritage.json rather than worked
   out here, because a build that dates a page from its own git log would
   report something different the first time somebody clones this shallow. A
   chapter with no published date in the file gets no datePublished, which is
   the right answer rather than a plausible one.
   ------------------------------------------------------------------------- */
const SITE = 'https://fivemile.now/';
const ORG_ID = SITE + '#org';
const HUB = 'fivemile-heritage.html';

/* The three towns get stable ids so a chapter's about list and the site's own
   Place node in index.html are talking about the same three places. Order is
   west to east, the way it is everywhere else. */
const TOWN_IDS = {
  Graysville: SITE + '#graysville',
  Cardiff: SITE + '#cardiff',
  Brookside: SITE + '#brookside'
};
const TOWN_ORDER = ['Graysville', 'Cardiff', 'Brookside'];

const absolute = (relative) => SITE + String(relative).split('/').map(encodeURIComponent).join('/');

function townNodes(names) {
  return TOWN_ORDER.filter((name) => names.has(name)).map((name) => ({
    '@type': 'City',
    '@id': TOWN_IDS[name],
    name,
    address: {
      '@type': 'PostalAddress',
      addressLocality: name,
      addressRegion: 'AL',
      addressCountry: 'US'
    },
    containedInPlace: { '@type': 'AdministrativeArea', name: 'Jefferson County, Alabama' }
  }));
}

function orgNode() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'FIVEMILE',
    url: SITE,
    email: 'fivemilec@gmail.com',
    description: 'A community publication for Graysville, Cardiff, and Brookside, the three towns at the lower end of Five Mile Creek in Jefferson County, Alabama.'
  };
}

function crumbs(trail) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: step.url
    }))
  };
}

/* An open interval either end, because the first chapter runs back as far as
   the record does and the last one has not finished. */
function temporalCoverage(chapter) {
  const from = chapter.from > 0 ? String(chapter.from) : '..';
  const to = chapter.to < 9000 ? String(chapter.to) : '..';
  return from + '/' + to;
}

/* updated in the file is the day the prose was last revised, and it can sit
   a day or two behind the day the page carrying it went up. A page modified
   before it existed is not a thing, so the later of the two is what gets
   reported. */
function modified(published, updated) {
  if (!published) return updated;
  if (!updated) return published;
  return updated >= published ? updated : published;
}

function chapterImages(chapter, data) {
  return (chapter.images || [])
    .map((key) => (data.images || {})[key])
    .filter(Boolean)
    .map((image) => ({
      '@type': 'ImageObject',
      url: absolute(image.src),
      caption: image.caption,
      creditText: image.credit
    }));
}

/* Every source the chapter's own entries cite. Sorted the way the source list
   printed under the chapter is sorted, so the two read the same. */
function citations(facts, data) {
  const keys = [];
  for (const fact of facts) {
    for (const key of [].concat(fact.source || [])) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys
    .map((key) => (data.sources || {})[key])
    .filter(Boolean)
    .sort((a, b) => (a.name + a.title).localeCompare(b.name + b.title))
    .map((source) => ({
      '@type': 'CreativeWork',
      name: source.title,
      url: source.url,
      publisher: { '@type': 'Organization', name: source.name }
    }));
}

function factsIn(data, chapter) {
  return (data.facts || []).filter((fact) => fact.year >= chapter.from && fact.year <= chapter.to);
}

function structuredData(page, data) {
  const chapters = data.chapters || [];
  const graph = [orgNode()];

  if (!page.chapter) {
    graph.push({
      '@type': 'CollectionPage',
      '@id': absolute(HUB) + '#page',
      url: absolute(HUB),
      name: 'Heritage',
      headline: 'How Graysville, Cardiff, and Brookside got here',
      description: chapters.length + ' chapters, from the farms on the bottomland to the greenway on the old rail bed, every entry carrying the source it came from.',
      inLanguage: 'en-US',
      isPartOf: { '@id': SITE + '#website' },
      publisher: { '@id': ORG_ID },
      datePublished: data.published,
      dateModified: modified(data.published, data.updated),
      about: TOWN_ORDER.map((name) => ({ '@id': TOWN_IDS[name] })),
      hasPart: chapters.map((chapter) => ({ '@id': absolute(chapter.page) + '#article' }))
    });
    graph.push(crumbs([
      { name: 'FIVEMILE', url: SITE },
      { name: 'Heritage', url: absolute(HUB) }
    ]));
    graph.push(...townNodes(new Set(TOWN_ORDER)));
    return graph;
  }

  const index = chapters.findIndex((entry) => entry.id === page.chapter);
  const chapter = chapters[index];
  if (!chapter) throw new Error('No chapter in the file called ' + page.chapter);

  const facts = factsIn(data, chapter);
  const towns = new Set(facts.map((fact) => fact.town));
  const images = chapterImages(chapter, data);

  const article = {
    '@type': 'Article',
    '@id': absolute(chapter.page) + '#article',
    url: absolute(chapter.page),
    mainEntityOfPage: absolute(chapter.page),
    headline: chapter.title,
    description: chapter.blurb,
    abstract: chapter.summary,
    articleSection: 'Heritage',
    inLanguage: 'en-US',
    isPartOf: { '@id': absolute(HUB) + '#page' },
    position: index + 1,
    temporalCoverage: temporalCoverage(chapter),
    datePublished: chapter.published,
    dateModified: modified(chapter.published, data.updated),
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    about: TOWN_ORDER.filter((name) => towns.has(name)).map((name) => ({ '@id': TOWN_IDS[name] })),
    keywords: [...new Set(facts.map((fact) => (data.topics || {})[fact.topic]).filter(Boolean))]
  };
  if (images.length) article.image = images;

  const cited = citations(facts, data);
  if (cited.length) article.citation = cited;

  graph.push(article);
  graph.push(crumbs([
    { name: 'FIVEMILE', url: SITE },
    { name: 'Heritage', url: absolute(HUB) },
    { name: chapter.title, url: absolute(chapter.page) }
  ]));
  graph.push(...townNodes(towns));
  return graph;
}

/* A closing script tag inside one of these values would end the block early.
   There is none in the file today, and escaping the angle bracket means there
   never can be. */
function structuredDataBlock(page, data) {
  const json = JSON.stringify(
    { '@context': 'https://schema.org', '@graph': structuredData(page, data) },
    null,
    2
  ).replace(/</g, '\\u003c');
  return '<script type="application/ld+json">\n' + json + '\n</script>';
}

/* -------------------------------------------------------------------------
   Writing it in
   ------------------------------------------------------------------------- */
const markerFor = (id) => ({
  open: '<!--PRERENDER:' + id + '-->',
  close: '<!--/PRERENDER-->'
});

function markedIds(html) {
  const ids = [];
  const pattern = /<!--PRERENDER:([A-Za-z0-9_-]+)-->/g;
  let match;
  while ((match = pattern.exec(html))) ids.push(match[1]);
  return ids;
}

function replaceBetween(html, id, content) {
  const { open, close } = markerFor(id);
  const start = html.indexOf(open);
  if (start === -1) return { html, changed: false };
  const from = start + open.length;
  const end = html.indexOf(close, from);
  if (end === -1) throw new Error('Marker ' + open + ' has no closing marker.');
  const before = html.slice(0, from);
  const after = html.slice(end);
  const next = before + '\n' + content + '\n' + after;
  return { html: next, changed: next !== html };
}

/* #chapterOpen carries a class the renderer decides, noplate when the chapter
   has no photograph. The class is part of what the reader sees before the
   script runs, so it is written in too. */
function setClass(html, id, className) {
  const tag = new RegExp('<[a-zA-Z][^>]*\\bid="' + id + '"[^>]*>');
  const found = html.match(tag);
  if (!found) return { html, changed: false };
  const opening = found[0];
  const updated = /\bclass="[^"]*"/.test(opening)
    ? opening.replace(/\bclass="[^"]*"/, 'class="' + className + '"')
    : opening.replace(/^<([a-zA-Z]+)/, '<$1 class="' + className + '"');
  if (updated === opening) return { html, changed: false };
  return { html: html.replace(opening, updated), changed: true };
}

async function main() {
  const check = process.argv.includes('--check');
  const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  const coreSource = await fs.readFile(CORE, 'utf8');

  let wrote = 0;
  let stale = 0;

  for (const page of PAGES) {
    const filePath = path.join(ROOT, page.file);
    let html = await fs.readFile(filePath, 'utf8');
    const ids = markedIds(html);
    if (!ids.length) {
      console.warn('   ' + page.file + ' has no prerender markers, skipped.');
      continue;
    }

    const elements = await renderPage(page, data, coreSource);

    /* One block that is not the site's own renderer writing prose. The
       structured data has no on-page markup to reuse, so it is built from the
       same file here and dropped into the map the loop below reads. */
    elements.set('structuredData', { innerHTML: structuredDataBlock(page, data), className: null });

    let changed = false;
    const missing = [];

    for (const id of ids) {
      const element = elements.get(id);
      if (!element || !element.innerHTML) {
        missing.push(id);
        continue;
      }
      const result = replaceBetween(html, id, element.innerHTML);
      html = result.html;
      changed = changed || result.changed;
      if (element.className) {
        const classed = setClass(html, id, element.className);
        html = classed.html;
        changed = changed || classed.changed;
      }
    }

    /* A marker the renderer had nothing for is a real problem: it means the
       block will ship empty. Say so rather than writing a quiet hole. */
    if (missing.length) {
      console.warn('   ' + page.file + ': nothing rendered for ' + missing.join(', '));
    }

    if (!changed) {
      console.log('   ' + page.file + ': up to date.');
      continue;
    }
    if (check) {
      stale += 1;
      console.log('   ' + page.file + ': STALE, run the build.');
      continue;
    }
    await fs.writeFile(filePath, html, 'utf8');
    wrote += 1;
    console.log('   ' + page.file + ': written.');
  }

  if (check && stale) {
    console.error('Heritage pages are out of date with fivemile-heritage.json.');
    process.exitCode = 1;
    return;
  }
  console.log(check ? 'Heritage pages are current.' : 'Heritage pages: ' + wrote + ' written.');
}

main().catch((error) => {
  console.error('Heritage prerender failed:', error.message);
  process.exitCode = 1;
});
