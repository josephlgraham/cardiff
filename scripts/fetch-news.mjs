#!/usr/bin/env node
/* ===========================================================================
   scripts/fetch-news.mjs

   Gathers the news for FIVEMILE, sorts it into sections, and writes
   cardiff-news-live.json plus a permanent monthly archive.

   This is the only writer of cardiff-news-live.json. It replaced
   fetchNewsStories() and updateNewsFile() in fetch-site-data.mjs, which have
   been removed. Everything else in that file stayed where it was.

   Three things are different from the old gatherer:

   1. It reads the outlets' own feeds first instead of Google News. Google
      News hands back a redirect link and no picture, so a reader lands on a
      Google page and every headline looks the same. An outlet's own feed
      hands back the real article address, the outlet's real name, and, most
      of the time, the picture the outlet published for sharing.

   2. Every story is sorted into one section before it reaches the browser,
      by rules that are written down here and can be read. There is no model
      call and no API key. The same story sorts the same way every time, and
      when one lands somewhere odd you can find the line that put it there.

   3. Pictures follow a policy rather than an appetite. See PHOTOS below.

   Run it:
     node scripts/fetch-news.mjs                # normal
     node scripts/fetch-news.mjs --no-images    # skip all picture lookups
     node scripts/fetch-news.mjs --dry          # print, write nothing
   =========================================================================== */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(ROOT, 'cardiff-news-live.json');
const WEATHER_FILE = path.join(ROOT, 'cardiff-weather.json');
const ARCHIVE_DIR = path.join(ROOT, 'news-archive');

const UA = 'FivemileBot/1.0 (+https://fivemile.now/; fivemilec@gmail.com)';
const ARGS = new Set(process.argv.slice(2));
const NO_IMAGES = ARGS.has('--no-images');
const DRY_RUN = ARGS.has('--dry');

/* ===========================================================================
   PHOTOS. The rules, in one place, because this is the part that is easy to
   get wrong quietly.

   1. We take the picture an outlet has already offered for sharing, and
      nothing else. That means a media tag inside their RSS feed, or the
      og:image tag in the head of the article. Both of those exist so that
      anybody linking to the story shows a picture. We never open the body of
      an article and never lift a photograph out of the page.

   2. We store the address of the picture, never the picture. The image on
      our page loads from the outlet's own server. No copy of anybody's
      photograph is kept in this repository or served from our domain.

   3. We check robots.txt before we look at an article, we identify ourselves
      by name with an address to write to, and we honor a noimageindex header
      if one comes back.

   4. Any outlet can be switched off in one line. Set images:false on their
      row in SOURCES and their pictures stop appearing that day.

   5. If there is no picture we run the headline on its own. We do not go
      looking somewhere else for one.
   =========================================================================== */

/* ---------------------------------------------------------------------------
   SOURCES

   Verify these before the first real run:  node scripts/check-feeds.mjs
   That script pings every row and prints which ones answer with a feed, how
   many items came back, and how many of those items carried a picture. Feed
   addresses move. Anything that fails, look for the RSS link in the page
   source of the outlet's homepage and paste the working one in here.

   weight   nudges the ranking. Local and civic outlets outrank metro ones.
   paywall  puts a small marker on the card so a reader is not sent into a wall.
   images   false means we never show a picture from this outlet.
   kind     'news' or 'obituary'. Obituary feeds skip the news classifier.
   --------------------------------------------------------------------------- */
const SOURCES = [
  // Metro outlets that cover this county
  { id:'wbrc',      outlet:'WBRC',           kind:'news', weight:7, images:true,  url:'https://www.wbrc.com/arc/outboundfeeds/rss/category/news/?outputType=xml' },
  { id:'wvtm',      outlet:'WVTM 13',        kind:'news', weight:6, images:true,  url:'https://www.wvtm13.com/topstories-rss' },
  { id:'abc3340',   outlet:'ABC 33/40',      kind:'news', weight:6, images:true,  url:'https://abc3340.com/news/local.rss' },
  { id:'cbs42',     outlet:'CBS 42',         kind:'news', weight:6, images:true,  url:'https://www.cbs42.com/feed/' },
  // The birmingham category feed answered with nothing parseable in August
  // 2026. The site wide feed is the one that works.
  { id:'alcom',     outlet:'AL.com',         kind:'news', weight:7, images:true,  paywall:true, url:'https://www.al.com/arc/outboundfeeds/rss/?outputType=xml' },
  { id:'bhamwatch', outlet:'BirminghamWatch',kind:'news', weight:9, images:true,  url:'https://birminghamwatch.org/feed/' },
  { id:'bhamnow',   outlet:'Bham Now',       kind:'news', weight:5, images:true,  url:'https://bhamnow.com/feed/' },
  { id:'bhamtimes', outlet:'Birmingham Times',kind:'news',weight:5, images:true,  url:'https://www.birminghamtimes.com/feed/' },
  { id:'trussville',outlet:'Trussville Tribune',kind:'news',weight:5,images:true, url:'https://www.trussvilletribune.com/feed/' },

  /* Off, with the reason, rather than deleted. Both were checked in August
     2026 and neither is usable today. Re-check with check-feeds.mjs before
     turning either back on.

     WBHM: the only feed the site advertises is wbhm.org/index.rss, which
     answers 200 with a valid channel and zero items in it.

     North Jefferson Herald: the domain now serves a parking lander. This was
     the closest routine community coverage there was, so it is worth checking
     again now and then in case the paper turns up somewhere else. */
  // { id:'wbhm',    outlet:'WBHM',                    kind:'news', weight:6, images:true, url:'' },
  // { id:'njh',     outlet:'North Jefferson Herald',  kind:'news', weight:9, images:true, url:'' },

  /* Official feeds. No pictures worth showing, but the highest weight,
     because a county press release is the story rather than coverage of it.

     ModID is the module, and the number matters more than the CID on the end
     of it suggests. 76 is the site's page directory: it answers, it parses,
     and it fills the page with Communications, Systems, and Help Desk
     Metrics. 1 is the News Flash module, which is the actual county news.
     58 is the commission meeting calendar, which belongs on the calendar
     page rather than here. */
  { id:'jeffco',    outlet:'Jefferson County',kind:'news',weight:11,images:false, url:'https://www.jccal.org/RSSFeed.aspx?ModID=1&CID=All-newsflash.xml' },

  /* The weather service alert feed is deliberately not here. Two reasons, and
     the second is the real one. The CAP address stopped answering in August
     2026, and alerts already have a home on this page: ticker.json feeds the
     red notice card at the top, which carries the full text and a link to the
     alert. Gathering the same warning a second time would print it twice. */

  /* Obituary feeds. These are the gap you have to close by hand, because the
     funeral homes serving these three towns are small and their websites are
     built on half a dozen different platforms. Most of those platforms do
     publish a feed, it is just never linked.

     How to find one, per home, about two minutes each:
       1. Open the home's obituaries page.
       2. View source and search for "rss", "feed", or "application/rss".
       3. If nothing turns up, try the platform's usual address:
            WordPress            /feed/  or  /obituaries/feed/
            Tribute Archive      /rss  on the obituary listing page
            FuneralOne / f1Connect  /obituaries/rss
            CFS (funeralOne rival)  /obituaries.rss
       4. Paste the working address here and run check-feeds.mjs.

     Homes to check, in rough order of how often they serve these three towns:
       Ridout's Brown Service, Gardendale
       Johns Ridout's, Forestdale
       Elmwood / Jefferson Memorial, Trussville and Gardendale
       Peoples Funeral Home, Ensley
       Sunset Funeral Home, Adamsville
       Currier's Funeral Home, Warrior

     Until at least one of these is filled in, the obituary section still
     fills from two places: notices that turn up inside the news feeds above,
     which the classifier catches, and anything you write into the pinned
     list in cardiff-news-feed.json by hand when a family sends one in. */
  // { id:'ridouts-gardendale', outlet:'Ridout\'s Brown Service', kind:'obituary', weight:8, images:false, url:'' },

  /* Google News, used only as a net for the small names the outlets above do
     not tag. These come back as a redirect address with no picture, so they
     never lead the page and never carry a photograph. When one of our own
     outlets has already filed the same story, the dedupe drops the Google
     copy and keeps the real link. */
  { id:'gn-towns',  outlet:'Google News', kind:'news', weight:1, images:false, viaGoogle:true,
    query:'("Graysville" OR "Cardiff" OR "Brookside") Alabama' },
  { id:'gn-nearby', outlet:'Google News', kind:'news', weight:1, images:false, viaGoogle:true,
    query:'("Adamsville" OR "Minor" OR "Bayview" OR "Sylvan Springs" OR "Mulga" OR "Maytown") Alabama' },
  { id:'gn-creek',  outlet:'Google News', kind:'news', weight:1, images:false, viaGoogle:true,
    query:'"Five Mile Creek" Alabama' },
  { id:'gn-beltline', outlet:'Google News', kind:'news', weight:1, images:false, viaGoogle:true,
    query:'"Northern Beltline" Alabama' }
];

/* Outlets write their own names differently depending on who is asking. A
   story that comes through Google News arrives tagged WBMA or WVTM, and the
   same outlet's own feed calls itself ABC 33/40 or WVTM 13. Printing both
   spellings makes one newsroom look like two, on the card and in the list of
   outlets at the bottom of the page. Matched on letters and digits only, so
   punctuation and spacing do not matter. */
const OUTLET_ALIASES = new Map([
  ['wbma', 'ABC 33/40'], ['abc3340', 'ABC 33/40'], ['wbmaabc3340', 'ABC 33/40'],
  ['wvtm', 'WVTM 13'], ['wvtm13', 'WVTM 13'],
  ['wbrcfox6news', 'WBRC'], ['wbrcfox6', 'WBRC'], ['wbrc', 'WBRC'],
  ['alcom', 'AL.com'],
  ['cbs42', 'CBS 42'], ['wiat', 'CBS 42'],
  ['bhamnow', 'Bham Now'],
  ['birminghamwatch', 'BirminghamWatch'],
  ['thebirminghamtimes', 'Birmingham Times'], ['birminghamtimes', 'Birmingham Times'],
  ['thetrussvilletribune', 'Trussville Tribune'], ['trussvilletribune', 'Trussville Tribune']
]);

function houseName(raw) {
  const name = String(raw || '').trim();
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return OUTLET_ALIASES.get(key) || name || 'Regional source';
}

/* ---------------------------------------------------------------------------
   THE RINGS

   A story earns a place on this page by naming somewhere in one of these, and
   the ring it matches decides the section. This is the whole of the "is this
   ours" question, written out.

   The nearby ring is deliberately generous. Gardendale and Fultondale are not
   in the watershed, but a wreck on Highway 31 or a school rezoning up there
   lands on people here, and the town badge on the card says plainly where the
   story is from, so nothing reads as filler.
   --------------------------------------------------------------------------- */
const RING_TOWNS = ['graysville', 'cardiff', 'brookside', 'gin town'];

const RING_NEARBY = [
  'adamsville', 'sylvan springs', 'pleasant grove', 'forestdale', 'fultondale',
  'gardendale', 'maytown', 'mulga', 'docena', 'edgewater', 'sandusky', 'bayview',
  'republic', 'sayre', 'trafford', 'kimberly', 'morris', 'warrior', 'corner',
  'minor high', 'mortimer jordan', 'west jefferson', 'western jefferson', 'north jefferson'
];

/* The outer ring is two rings, because the county and the city are not the
   same thing to a reader in Graysville.

   RING_COUNTY is our own county and our own state government. The commission
   that paves our roads, the agency that runs the highway, the legislature
   that writes the law. Those are our institutions even when the meeting is
   held downtown, so any beat qualifies.

   RING_METRO is Birmingham the city, which is a neighbor rather than a
   government we answer to. A shooting on the south side does not change
   anything in Cardiff, and a page that carries it is padding. Metro stories
   earn their place only on a beat that physically travels out here: the road,
   the rail, the water, the weather, the power. See DECISIONS.md 19. */
const RING_COUNTY = [
  'jefferson county', 'county commission', 'aldot', 'alabama legislature',
  'alabama senate', 'alabama house', 'state legislature', 'statewide',
  'state of alabama', 'adem', 'alabama department'
];

const RING_METRO = ['birmingham', 'metro area', 'jefferson county schools'];

/* The beats that reach out of the metro on their own: the road, the rail, the
   water, the weather, the power, the land. A closure on I-22 is felt here. */
const TRAVELS = ['Beltline', 'Trains', 'Roads', 'The creek', 'Weather', 'Land', 'Utilities'];

/* What the county section is for, on top of the above: decisions made at the
   county or state level, and the school system, both of which reach here
   whether or not they happen here.

   Public safety is deliberately not on this list. A shooting in Birmingham is
   not something a reader in Cardiff acts on, and county offices turn up in
   metro crime coverage constantly: the coroner identifies a body, the sheriff
   makes an arrest, and the story matched jefferson county and came through as
   ours. Public safety still runs freely in the towns and nearby sections,
   where it is the news. */
const COUNTY_BEATS = [...TRAVELS, 'Government', 'Schools'];

/* Somewhere else in Alabama.

   The state agencies work in all 67 counties, so an ALDOT release about
   bridges in St. Clair County matches aldot and roads and reads as ours. It
   is not. Neither is two towns in Greene County sorting out an ambulance
   contract, which arrived here because the summary said county commission.

   A story that names another county, or a city well outside this end of the
   metro, is that county's news. This is only asked at the county and metro
   stage: anything naming one of our own towns has already been placed by
   then, so a state story that does reach us still gets through.

   Jefferson County's own municipalities are deliberately absent from this
   list, over the mountain ones included. They are our county, they vote on
   the same commission, and drawing that line is an editorial call rather
   than a geographic one. */
const OTHER_PLACES = [
  'st. clair county', 'st clair county', 'shelby county', 'walker county',
  'blount county', 'tuscaloosa county', 'greene county', 'bibb county',
  'chilton county', 'cullman county', 'talladega county', 'etowah county',
  'calhoun county', 'madison county', 'mobile county', 'montgomery county',
  'baldwin county', 'lee county', 'marshall county', 'morgan county',
  'limestone county', 'dekalb county', 'winston county', 'fayette county',
  'dallas county', 'autauga county', 'elmore county', 'houston county',
  'huntsville', 'tuscaloosa', 'montgomery', 'mobile', 'auburn', 'dothan',
  'gadsden', 'anniston', 'decatur', 'florence', 'selma', 'jasper',
  'alabaster', 'pelham', 'calera', 'oneonta', 'sylacauga', 'clanton'
];

/* Kept for scoring, which only asks how far out a story is, not which of the
   two rings it landed in. */
const RING_WIDE = [...RING_COUNTY, ...RING_METRO];

const CREEK_WORDS = [
  'five mile creek', 'fivemile creek', 'locust fork', 'black warrior', 'watershed',
  'freshwater land trust', 'greenway', 'red rock trail', 'turkey creek', 'village creek',
  'water quality', 'illegal dumping', 'creek cleanup', 'erosion', 'wildlife refuge',
  'state forestry', 'wildfire', 'prescribed burn', 'trail system'
];

const OBIT_WORDS = [
  'obituary', 'obituaries', 'funeral service', 'funeral home', 'visitation',
  'passed away', 'celebration of life', 'memorial service', 'is survived by',
  'preceded in death', 'graveside', 'interment', 'in loving memory'
];

/* Things we do not run, ever. Sports is the debatable one: Minor High and
   Mortimer Jordan are real local news to plenty of people here. It is off for
   now. Delete the sports words from this list to turn it back on. */
const NEVER = [
  'football', 'basketball', 'baseball', 'softball', 'two-a-days', 'touchdown',
  'quarterback', 'playoff', 'scrimmage', 'varsity', 'recruiting',
  'horoscope', 'crossword', 'lottery', 'powerball', 'sweepstakes', 'celebrity',
  'best deals', 'shop now', 'sponsored content', 'promo code',
  /* County procurement. The News Flash feed carries the county's bid notices
     alongside its actual news, and a copier machine contract is not something
     anybody here reads. The commission decisions in the same feed still come
     through. */
  'bid no', 'bid no.', 'invitation to bid', 'request for proposal',
  'contract period', 'notice of product changes'
];

/* The beats. Two per story at most, printed on the card as tags. The order
   matters: the first match wins, so a story about a road closed by a train
   tags as Trains rather than Roads. */
const BEATS = [
  ['Beltline',      ['northern beltline', 'i-422', 'i-222', 'beltline']],
  ['Trains',        ['train', 'railroad crossing', 'csx', 'norfolk southern', 'rail line']],
  ['Roads',         ['road closure', 'highway', 'paving', 'pothole', 'detour', 'traffic', 'bridge', 'aldot', 'crash', 'wreck', 'road work']],
  ['The creek',     ['five mile creek', 'fivemile creek', 'watershed', 'locust fork', 'greenway', 'water quality', 'trail']],
  ['Weather',       ['tornado', 'severe storm', 'flash flood', 'flooding', 'hail', 'heat advisory', 'drought', 'winter storm', 'ice storm']],
  ['Land',          ['acres', 'timber', 'logging', 'strip mine', 'coal mine', 'quarry', 'easement', 'conservation', 'annexation']],
  ['Government',    ['city council', 'town council', 'county commission', 'mayor', 'ordinance', 'zoning', 'budget', 'public hearing', 'election', 'ballot', 'incorporat']],
  ['Schools',       ['school board', 'superintendent', 'students', 'teacher', 'graduation', 'rezoning']],
  ['Public safety', ['police', 'fire department', 'rescue', 'sheriff', 'arrested', 'shooting', 'ema', 'emergency management']],
  ['Utilities',     ['water main', 'sewer', 'power outage', 'alabama power', 'gas line', 'garbage pickup', 'landfill', 'recycling']],
  ['Business',      ['new business', 'restaurant', 'now hiring', 'plant', 'warehouse', 'data center', 'development', 'grand opening']],
  ['History',       ['historic', 'historical marker', 'cemetery', 'museum', 'coal camp', 'preservation']]
];

/* How long a section keeps a story. Obituaries are handled separately, in
   freshnessOk, because a notice should stay up until the service is over. */
const MAX_AGE_DAYS = { towns: 6, nearby: 5, creek: 14, county: 4, obituaries: 12 };

/* ===========================================================================
   PLUMBING
   =========================================================================== */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getText(url, { timeout = 12000, headers = {}, maxBytes = 0 } = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: '*/*', ...headers },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeout)
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  if (!maxBytes) return { text: await res.text(), headers: res.headers, url: res.url };

  /* Read only as far as we need. The og:image tag lives in the head, so
     there is no reason to pull a whole article down to find it. */
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
    const soFar = Buffer.concat(chunks).toString('utf8');
    if (soFar.includes('</head>')) break;
  }
  try { await reader.cancel(); } catch { /* already closed */ }
  return { text: Buffer.concat(chunks).toString('utf8'), headers: res.headers, url: res.url };
}

function decodeHtml(text = '') {
  return String(text)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&mdash;/g, ', ').replace(/&ndash;/g, '-')
    .replace(/&[a-z]+;/gi, ' ');
}
function stripTags(text = '') {
  return decodeHtml(String(text).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function tagText(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decodeHtml(m[1]).trim() : '';
}
function attrOf(xml, tag, attr) {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*\\b${attr}=["']([^"']+)["']`, 'i'));
  return m ? decodeHtml(m[1]).trim() : '';
}
function slugify(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(+d) ? null : d;
}
function daysOld(date) {
  return date ? (Date.now() - date.getTime()) / 86400000 : 999;
}
function hostOf(url) {
  try { return new URL(url).host.replace(/^www\./, ''); } catch { return ''; }
}

/* Several feeds put the headline in the description field and nothing else,
   sometimes with the call letters stuck on the end. Under the headline on the
   lead card that reads as a stutter, so a summary that is only the headline
   again is dropped here and never reaches the file. Compared on letters and
   digits, because the two copies differ in punctuation. */
function isEchoOfTitle(summary, title) {
  const bare = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const body = bare(summary);
  const head = bare(title);
  if (!body || !head) return false;
  return body.startsWith(head) && body.length < head.length * 1.4;
}

/* ===========================================================================
   ROBOTS
   One fetch per host, cached for the run. If we cannot read a robots file we
   assume the polite answer, which is that fetching one article head is fine,
   because that is what every link preview in the world already does.
   =========================================================================== */
const robotsCache = new Map();

async function robotsAllows(url) {
  let u;
  try { u = new URL(url); } catch { return false; }
  const origin = u.origin;
  if (!robotsCache.has(origin)) {
    robotsCache.set(origin, (async () => {
      try {
        const { text } = await getText(`${origin}/robots.txt`, { timeout: 6000 });
        return parseRobots(text);
      } catch {
        return { disallow: [] };
      }
    })());
  }
  const rules = await robotsCache.get(origin);
  const pathname = u.pathname + u.search;
  return !rules.disallow.some((rule) => rule && pathname.startsWith(rule));
}

function parseRobots(text) {
  const lines = String(text).split(/\r?\n/);
  let applies = false;
  const disallow = [];
  for (const raw of lines) {
    const line = raw.split('#')[0].trim();
    if (!line) continue;
    const [keyPart, ...rest] = line.split(':');
    const key = keyPart.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      applies = value === '*' || /fivemilebot/i.test(value);
    } else if (applies && key === 'disallow' && value) {
      disallow.push(value.replace(/\*.*$/, ''));
    } else if (applies && key === 'allow' && value === '/') {
      // nothing to do, the default is allow
    }
  }
  return { disallow };
}

/* ===========================================================================
   FEED PARSING
   RSS and Atom, because the outlets here use both.
   =========================================================================== */
function splitEntries(xml) {
  const rss = xml.match(/<item\b[\s\S]*?<\/item>/gi);
  if (rss && rss.length) return { kind: 'rss', entries: rss };
  const atom = xml.match(/<entry\b[\s\S]*?<\/entry>/gi);
  if (atom && atom.length) return { kind: 'atom', entries: atom };
  return { kind: 'none', entries: [] };
}

function linkFrom(entryXml, kind) {
  if (kind === 'atom') {
    const alt = entryXml.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
    if (alt) return decodeHtml(alt[1]);
    const any = entryXml.match(/<link\b[^>]*href=["']([^"']+)["']/i);
    if (any) return decodeHtml(any[1]);
  }
  const plain = tagText(entryXml, 'link');
  if (plain) return plain;
  return attrOf(entryXml, 'link', 'href');
}

/* A picture the outlet has put in its own feed. This is the cleanest case
   there is: they built a syndication feed and put a photograph in it. */
function imageFromEntry(entryXml) {
  const candidates = [];
  const media = entryXml.match(/<media:content\b[^>]*>/gi) || [];
  media.forEach((tag) => {
    const url = (tag.match(/url=["']([^"']+)["']/i) || [])[1];
    const type = (tag.match(/type=["']([^"']+)["']/i) || [])[1] || '';
    const medium = (tag.match(/medium=["']([^"']+)["']/i) || [])[1] || '';
    const width = Number((tag.match(/width=["'](\d+)["']/i) || [])[1] || 0);
    if (url && (medium === 'image' || /^image\//.test(type) || /\.(jpe?g|png|webp)/i.test(url))) {
      candidates.push({ url: decodeHtml(url), width });
    }
  });
  const thumb = attrOf(entryXml, 'media:thumbnail', 'url');
  if (thumb) candidates.push({ url: thumb, width: Number(attrOf(entryXml, 'media:thumbnail', 'width') || 0) });

  const encTag = entryXml.match(/<enclosure\b[^>]*>/i);
  if (encTag) {
    const url = (encTag[0].match(/url=["']([^"']+)["']/i) || [])[1];
    const type = (encTag[0].match(/type=["']([^"']+)["']/i) || [])[1] || '';
    if (url && /^image\//.test(type)) candidates.push({ url: decodeHtml(url), width: 0 });
  }

  /* content:encoded is the outlet's own syndicated copy of the story, so a
     picture inside it was put there for syndication too. */
  const encoded = tagText(entryXml, 'content:encoded') || tagText(entryXml, 'description');
  const inline = encoded.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (inline) candidates.push({ url: decodeHtml(inline[1]), width: 0 });

  const best = candidates
    .filter((c) => /^https?:\/\//i.test(c.url))
    .filter((c) => !/(spacer|pixel|1x1|blank|avatar|logo|icon)\./i.test(c.url))
    .sort((a, b) => b.width - a.width)[0];

  return best ? { url: best.url, from: 'feed', width: best.width || null } : null;
}

/* The other place an outlet offers a picture: the og:image tag in the head,
   which exists so that anybody who links to the story shows a photograph.
   We read the head and nothing else. */
async function imageFromPage(url) {
  if (!await robotsAllows(url)) return null;
  try {
    const { text, headers } = await getText(url, { timeout: 10000, maxBytes: 200000 });
    const robotsTag = (headers.get('x-robots-tag') || '').toLowerCase();
    if (robotsTag.includes('noimageindex') || robotsTag.includes('noindex')) return null;

    const head = text.split('</head>')[0] || text;
    const pick = (prop) => {
      const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
      const alt = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i');
      const m = head.match(re) || head.match(alt);
      return m ? decodeHtml(m[1]) : '';
    };
    const found = pick('og:image') || pick('og:image:url') || pick('twitter:image');
    if (!found || !/^https?:\/\//i.test(found)) return null;
    if (/(spacer|pixel|1x1|blank|default|placeholder)\./i.test(found)) return null;
    return { url: found, from: 'page', width: Number(pick('og:image:width') || 0) || null };
  } catch {
    return null;
  }
}

/* ===========================================================================
   CLASSIFYING
   =========================================================================== */
function blobOf(story) {
  return `${story.title} ${story.summary} ${story.outlet}`.toLowerCase();
}
function hits(blob, list) {
  return list.filter((word) => blob.includes(word));
}
function properCase(word) {
  return word.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function placeOf(story) {
  const blob = blobOf(story);
  for (const town of ['Graysville', 'Cardiff', 'Brookside']) {
    if (blob.includes(town.toLowerCase())) return town;
  }
  const near = hits(blob, RING_NEARBY)[0];
  if (near) return properCase(near.replace(' high', '').replace('west jefferson', 'West Jefferson'));
  if (blob.includes('jefferson county')) return 'Jefferson County';
  if (blob.includes('birmingham')) return 'Birmingham';
  return 'Regional';
}

function beatsOf(story) {
  const blob = blobOf(story);
  const found = [];
  for (const [label, words] of BEATS) {
    if (found.length >= 2) break;
    if (hits(blob, words).length) found.push(label);
  }
  return found;
}

/* Which section, and why. The why is written into the file so that when a
   story lands somewhere odd you can see which question put it there. */
function sectionOf(story, source) {
  const blob = blobOf(story);

  if (source.kind === 'obituary') return { section: 'obituaries', why: 'obituary feed' };
  if (hits(blob, OBIT_WORDS).length) return { section: 'obituaries', why: 'obituary wording' };
  if (hits(blob, NEVER).length) return { section: 'skip', why: `blocked: ${hits(blob, NEVER)[0]}` };

  const townHit = hits(blob, RING_TOWNS)[0];
  if (townHit) return { section: 'towns', why: `names ${townHit}` };

  const creekHit = hits(blob, CREEK_WORDS)[0];
  const nearHit = hits(blob, RING_NEARBY)[0];
  if (creekHit && (nearHit || blob.includes('jefferson'))) {
    return { section: 'creek', why: `${creekHit}, in the county` };
  }
  if (nearHit) return { section: 'nearby', why: `names ${nearHit}` };

  /* County and state only when the story is about something a person here
     would act on, not every Birmingham headline. Our own county and state
     institutions qualify on any beat. The city next door has to be doing
     something that reaches out here. */
  const elsewhere = hits(blob, OTHER_PLACES)[0];
  if (elsewhere) return { section: 'skip', why: `set in ${elsewhere}` };

  const beats = beatsOf(story);

  const countyHit = hits(blob, RING_COUNTY)[0];
  if (countyHit) {
    const acts = beats.find((beat) => COUNTY_BEATS.includes(beat));
    if (acts) return { section: 'county', why: `${countyHit}, ${acts.toLowerCase()}` };
    return { section: 'skip', why: `${countyHit}, but nothing to act on` };
  }

  const metroHit = hits(blob, RING_METRO)[0];
  if (metroHit) {
    const reach = beats.find((beat) => TRAVELS.includes(beat));
    if (reach) return { section: 'county', why: `${metroHit}, ${reach.toLowerCase()}` };
    return { section: 'skip', why: `${metroHit}, but nothing that travels` };
  }

  return { section: 'skip', why: 'nothing local in it' };
}

function scoreOf(story, source) {
  const blob = blobOf(story);
  let score = source.weight || 0;
  if (hits(blob, RING_TOWNS).length) score += 22;
  if (hits(blob, RING_NEARBY).length) score += 11;
  if (hits(blob, CREEK_WORDS).length) score += 8;
  if (hits(blob, RING_WIDE).length) score += 3;
  score += beatsOf(story).length * 4;
  if (story.image) score += 4;
  score += Math.max(0, 9 - daysOld(story.date) * 1.6);
  return Math.round(score);
}

function freshnessOk(story) {
  const age = daysOld(story.date);
  if (story.section === 'obituaries') {
    const service = story.obit && parseDate(story.obit.service);
    if (service) return service.getTime() > Date.now() - 2 * 86400000;
    return age <= MAX_AGE_DAYS.obituaries;
  }
  return age <= (MAX_AGE_DAYS[story.section] ?? 5);
}

/* A best effort read of an obituary notice. Feeds vary wildly, so anything
   that does not parse simply comes through with the headline as the name,
   which is what a person would have written by hand anyway. */
function parseObit(story) {
  const title = story.title.replace(/\s*\|.*$/, '').trim();
  const nameMatch = title.match(/^([A-Z][^,0-9]{2,60}?)(?:,\s*(\d{1,3}))?\s*$/);
  const obit = {
    name: nameMatch ? nameMatch[1].trim() : title,
    age: nameMatch && nameMatch[2] ? Number(nameMatch[2]) : null,
    town: '',
    home: story.outlet,
    service: '',
    serviceLabel: ''
  };
  const text = `${story.title} ${story.summary}`;
  const town = ['Graysville', 'Cardiff', 'Brookside', 'Adamsville', 'Gardendale', 'Fultondale', 'Warrior']
    .find((t) => text.includes(t));
  if (town) obit.town = town;
  const svc = text.match(/(?:service|visitation|funeral)s?\s+(?:will be\s+)?(?:held\s+)?(?:on\s+)?([A-Z][a-z]+day,?\s+[A-Z][a-z]+\s+\d{1,2}(?:\s*,?\s*at\s+\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?)?)/i);
  if (svc) obit.serviceLabel = svc[1].replace(/\s+/g, ' ').trim();
  return obit;
}

/* ===========================================================================
   GATHERING
   =========================================================================== */
async function readSource(source) {
  const url = source.viaGoogle
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(source.query)}&hl=en-US&gl=US&ceid=US:en`
    : source.url;
  if (!url) return [];

  let xml;
  try {
    ({ text: xml } = await getText(url, { headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' } }));
  } catch (error) {
    console.warn(`  ${source.id}: ${error.message}`);
    return [];
  }

  const { kind, entries } = splitEntries(xml);
  if (!entries.length) {
    console.warn(`  ${source.id}: no items found, check the address`);
    return [];
  }

  return entries.slice(0, 40).map((entryXml) => {
    const rawTitle = tagText(entryXml, 'title');
    /* Google News suffixes the outlet onto the headline. Take it off the
       title and use it as the outlet name, which is more honest than
       printing "Google News" over somebody else's reporting. */
    const suffix = source.viaGoogle ? (rawTitle.match(/\s+-\s+([^-]+)$/) || [])[1] : '';
    const title = rawTitle.replace(/\s+-\s+[^-]+$/, '').trim() || 'Untitled';
    const summary = stripTags(tagText(entryXml, 'description') || tagText(entryXml, 'summary')).slice(0, 320);
    return {
      title,
      outlet: source.viaGoogle
        ? houseName(tagText(entryXml, 'source') || suffix)
        : source.outlet,
      url: linkFrom(entryXml, kind),
      summary: isEchoOfTitle(summary, title) ? '' : summary,
      date: parseDate(tagText(entryXml, 'pubDate') || tagText(entryXml, 'published') || tagText(entryXml, 'updated') || tagText(entryXml, 'dc:date')),
      image: (!NO_IMAGES && source.images) ? imageFromEntry(entryXml) : null,
      sourceId: source.id,
      paywall: Boolean(source.paywall),
      viaGoogle: Boolean(source.viaGoogle)
    };
  }).filter((s) => s.title && s.url);
}

/* Two outlets covering the same wreck should not take two slots. Compare the
   long words, because their headlines are never worded the same. */
function longWords(title) {
  return String(title).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 4);
}
function sameStory(a, b) {
  const mine = longWords(a.title);
  const theirs = longWords(b.title);
  if (mine.length < 2 || theirs.length < 2) return false;
  const shared = mine.filter((w) => theirs.includes(w)).length;
  return shared / Math.min(mine.length, theirs.length) >= 0.6;
}

async function build() {
  console.log(`Reading ${SOURCES.length} sources...`);
  const raw = [];
  for (const source of SOURCES) {
    const items = await readSource(source);
    if (items.length) console.log(`  ${source.id}: ${items.length}`);
    raw.push(...items.map((item) => ({ item, source })));
    await sleep(250);
  }

  /* Classify, drop, rank. */
  const classified = [];
  for (const { item, source } of raw) {
    const { section, why } = sectionOf(item, source);
    if (section === 'skip') continue;
    const story = { ...item, section, why };
    story.town = placeOf(story);
    story.tags = section === 'obituaries' ? ['Obituary'] : beatsOf(story);
    /* An obituary card carries no photograph, so a picture that came in
       attached to the notice is dropped here rather than left in the file
       for something later to pick up by accident. */
    if (section === 'obituaries') { story.obit = parseObit(story); story.image = null; }
    if (!freshnessOk(story)) continue;
    story.score = scoreOf(story, source);
    classified.push(story);
  }
  classified.sort((a, b) => b.score - a.score);

  /* Dedupe. A story from an outlet's own feed always beats the Google copy of
     the same story, because the real link is worth more than the redirect,
     and the sort above has already put the higher scoring one first. */
  const kept = [];
  for (const story of classified) {
    if (story.section !== 'obituaries' && kept.some((other) => sameStory(story, other))) continue;
    if (kept.some((other) => other.url === story.url)) continue;
    kept.push(story);
  }

  /* Look up pictures only for the stories that will actually appear, and only
     where the feed did not already hand one over. This keeps the number of
     article requests to something like a dozen a run. */
  if (!NO_IMAGES) {
    const wanted = kept
      .filter((s) => !s.image && !s.viaGoogle && s.section !== 'obituaries')
      .slice(0, 24);
    console.log(`Looking up ${wanted.length} pictures...`);
    for (const story of wanted) {
      const source = SOURCES.find((s) => s.id === story.sourceId);
      if (!source || source.images === false) continue;
      story.image = await imageFromPage(story.url);
      if (story.image) story.image.credit = story.outlet;
      await sleep(400);
    }
  }
  kept.forEach((s) => { if (s.image && !s.image.credit) s.image.credit = s.outlet; });

  return kept.slice(0, 60);
}

/* ===========================================================================
   THE DESK

   One story a month that nobody else files: the rain total, on the last day
   of the month, off our own station. It came over from fetch-site-data.mjs
   when the news gathering moved out of that file, because this is the only
   thing that writes cardiff-news-live.json now and a story with no writer is
   a story that quietly stops appearing.

   Two gates, both of which have to open. Today has to be the last day of the
   month, and the month must not already be in the file. The second one is
   what keeps a second run on the same day from filing it twice.
   =========================================================================== */
async function monthlyRainStory() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (tomorrow.getMonth() === now.getMonth()) return null;

  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const id = `monthly-rain-${monthKey}`;

  let existing = { stories: [] };
  try { existing = JSON.parse(await fs.readFile(OUT_FILE, 'utf8')); } catch { /* first run */ }
  if ((existing.stories || []).some((s) => s.id === id)) return null;

  let rain = null;
  try { rain = JSON.parse(await fs.readFile(WEATHER_FILE, 'utf8')).rain || null; } catch { /* no file */ }
  const total = rain && Number.isFinite(Number(rain.monthToDate)) ? Number(rain.monthToDate) : null;
  if (total === null) return null;

  const label = rain.monthLabel || monthKey;
  return {
    id,
    title: `${label} finished with ${total.toFixed(2)} inches of rain`,
    outlet: 'FIVEMILE',
    summary: `That is the total the local station measured across ${label}.`,
    /* Points at the almanac, which is where the month's rain is actually
       kept. A story row with no link never renders, so this has to go
       somewhere real. */
    url: 'cardiff-almanac.html',
    date: now,
    section: 'towns',
    why: 'filed by the desk',
    town: 'Cardiff',
    tags: ['Weather'],
    paywall: false,
    viaGoogle: false,
    image: null,
    obit: null,
    sourceId: 'desk',
    score: 40
  };
}

/* ===========================================================================
   WRITING
   The live file keeps every field the old one had, so the homepage keeps
   working untouched, and adds the new ones underneath.
   =========================================================================== */
function toRecord(story, index) {
  const iso = story.date ? story.date.toISOString() : '';
  return {
    id: `news-${index + 1}-${slugify(story.outlet)}-${slugify(story.title)}`,
    // new fields
    section: story.section,
    why: story.why,
    town: story.town,
    tags: story.tags,
    outlet: story.outlet,
    paywall: story.paywall,
    image: story.image || null,
    obit: story.obit || null,
    score: story.score,
    // fields the old file carried, kept so nothing else has to change
    source_type: 'media_feed',
    source_name: story.outlet,
    source: story.outlet,
    title: story.title,
    summary: story.summary,
    description: story.summary,
    url: story.url,
    link: story.url,
    published_at: iso,
    date: iso,
    location_tags: [slugify(story.town)],
    topic_tags: story.tags.map((t) => slugify(t)),
    priority_level: Math.max(0, Math.round(story.score / 8)),
    priority: Math.max(0, Math.round(story.score / 8)),
    section_target: 'news',
    module_target: 'regional_news_tracker',
    is_alert: /warning|watch|closure|outage|evacuat/i.test(story.title),
    is_featured: false,
    image_url: story.image ? story.image.url : ''
  };
}

/* Nothing scrolls away. Every story that ever ran gets written into the
   month it belongs to and stays there, which is the whole point of having a
   site instead of a Facebook group. */
async function archive(records) {
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  const byMonth = new Map();
  for (const record of records) {
    if (!record.published_at) continue;
    const key = record.published_at.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push({
      id: record.id, title: record.title, outlet: record.outlet, url: record.url,
      published_at: record.published_at, section: record.section, town: record.town,
      tags: record.tags, summary: record.summary
    });
  }
  for (const [month, items] of byMonth) {
    const file = path.join(ARCHIVE_DIR, `${month}.json`);
    let existing = { month, stories: [] };
    try { existing = JSON.parse(await fs.readFile(file, 'utf8')); } catch { /* first of the month */ }
    const seen = new Set((existing.stories || []).map((s) => s.url));
    const added = items.filter((s) => !seen.has(s.url));
    if (!added.length) continue;
    const merged = [...(existing.stories || []), ...added]
      .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
    if (!DRY_RUN) {
      await fs.writeFile(file, `${JSON.stringify({ month, updatedAt: new Date().toISOString(), stories: merged }, null, 2)}\n`);
    }
    console.log(`Archive ${month}: ${added.length} added, ${merged.length} total`);
  }
}

async function main() {
  const gathered = await build();
  /* The desk story leads when there is one. It is ours, it is about here, and
     it only happens twelve times a year. */
  const desk = await monthlyRainStory();
  const stories = desk ? [desk, ...gathered] : gathered;
  const records = stories.map(toRecord);

  const counts = records.reduce((acc, r) => { acc[r.section] = (acc[r.section] || 0) + 1; return acc; }, {});
  const withPhoto = records.filter((r) => r.image_url).length;

  const payload = {
    updatedAt: new Date().toISOString(),
    counts,
    sections: {
      towns: records.filter((r) => r.section === 'towns').map((r) => r.id),
      nearby: records.filter((r) => r.section === 'nearby').map((r) => r.id),
      creek: records.filter((r) => r.section === 'creek').map((r) => r.id),
      county: records.filter((r) => r.section === 'county').map((r) => r.id),
      obituaries: records.filter((r) => r.section === 'obituaries').map((r) => r.id)
    },
    stories: records
  };

  console.log(`\n${records.length} stories: ${JSON.stringify(counts)}`);
  console.log(`${withPhoto} with a photograph`);

  if (DRY_RUN) {
    records.slice(0, 12).forEach((r) => console.log(`  [${r.section}] ${r.town} · ${r.outlet} · ${r.title}`));
    return;
  }
  await fs.writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  await archive(records);
  console.log(`Wrote ${path.basename(OUT_FILE)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
