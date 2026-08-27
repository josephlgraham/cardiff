# FIVEMILE

A community publication for Graysville, Cardiff, and Brookside, Alabama, the
three towns at the lower end of Five Mile Creek. Weather, creek conditions,
civic dates, local history, and things worth knowing about. Live at
fivemile.now.

Run by Joe Graham. Contact fivemilec@gmail.com.

Joe's personal address never appears on the site. Every contact point, every
mailto, and every form target is the site address. If you are copying a form
from an older page, check the address before you paste it.

## The point

**Get people informed and interested in what is going on locally.** That is the
mission in Joe's words, and it is the test a new feature has to pass. A meeting
somebody can turn up to, a vote that changes the ground here, a reading off the
creek gauge, a date worth planning around.

Interested is half of it and it is the half that gets dropped. Nobody turns up
to a meeting they never heard was worth turning up to, so a council date is not
a line in a table. It says when, where, and what is on the agenda, and it says
it in a sentence a person would actually say.

Facebook groups are fine for talking and useless for remembering. This site
keeps things. Nothing here scrolls away.

The Archive is where that promise is kept and where it can be checked. It is a
hub, `fivemile-archive.html`, and five rooms: the gallery, the weather log, the
creek log, the story index, and the date index. Each room reads the same file
the live page reads, so nothing is archived by hand and nothing can fall out of
step. The date index is the one exception and only in form: the calendar has no
file, so the room asks the same engine the calendar page asks and gets the same
answer. If you add something the site keeps, give it a room. If you add a
rolling window that overwrites itself, you have added something that scrolls
away, and the creek archive in DECISIONS.md 36 is the pattern for fixing it.

The calendar page itself holds one month, with a step to the month either side.
It is not a rolling window: everything behind and ahead of it is in the date
index, reachable from a door under the month. See DECISIONS.md 50.

## Stack

Fully static. GitHub Pages, vanilla JS, no bundler, no frameworks, no build
step. Every piece of data is a JSON file in the repo, written either by a
scheduled GitHub Action or by hand.

There is no backend. No database, no Supabase, no serverless functions, no
third party form services, no ad networks. If a feature seems to need one, say
so and stop rather than adding one.

Nothing on a page talks to the outside world. The browser reads JSON files
committed to this repo and nothing else. No third party API is called at
runtime, and no API key ever appears in browser code. If a page needs a number
from somewhere else, a scheduled job fetches it and commits it, and the page
reads the file.

Prefer the simpler option. If a flat file does the job, use a flat file rather
than a service.

## Data

Every fetch happens at build time, in GitHub Actions, on a schedule. The job
writes a plain JSON file into the repo and commits it. A visitor waits on this
repo and never on someone else's server, so a bad day at USGS or the EPA is not
a bad day for the site.

Google Sheets is the editorial surface. Joe types into a spreadsheet, the next
scheduled run picks it up, and the site updates. No admin login, no database,
no deploy step.

Conventions:

- ES modules, `.mjs`, Node 20.
- Fetchers live in `/scripts`. New ones are one file per source. The older
  combined scripts get split the same way as we touch them, not in one pass.
- Output is a committed `fivemile-*.json` at the repo root, alongside the rest.
  There is no `/data` directory, and adding one would strand every fetch path
  in the front end and every entry in the service worker cache list.
- One source being down never fails the run. Catch it, keep the last good file,
  log what happened, and let every other source finish.

## Hard rules

**Town order is Graysville, Cardiff, Brookside.** West to east. Every list,
nav, card row, table, JSON array, heading order, and tagline. This is
deliberately NOT the direction the creek flows, and that is intentional. If
this looks like a bug, it is not. Creek order (Brookside, Cardiff, Graysville)
is used only when describing travel along the water: paddle routes, upstream
and downstream, where a gauge reading comes from. Never for listing the towns.

**No em dashes.** Not in copy, not in code comments, not in commit messages.
Use commas, colons, periods, or rewrite the sentence.

**Mobile is the primary target.** Minimum 44px tap targets. Minimum 16px body
text; readers skew older. Test at 390px width.

**The red announcement strip below the masthead is always visible.** It scrolls
text when there is content and stays a solid red accent bar when empty. It
never collapses or hides.

**No dark mode. No serif fonts. No italics.**

**Never generate an image.** No AI-generated photographs, illustrations of real
places, historical images, portraits, or textures that could be mistaken for a
photograph. Every image on this site is a real photograph with a source, or a
flat illustration clearly drawn as one. If a layout needs an image that does not
exist, use the paper-colored placeholder block and tell Joe. This is the one
rule on this list with no exceptions.

**Never invent a fact to fill a gap.** No plausible-sounding dates, names,
phone numbers, meeting times, quotes, or history. Use an em dash placeholder and
an HTML comment reading NEEDS-CONFIRMATION. Saying something is unknown is
always better than guessing, and a reader here may well know the real answer.

**Never explain the UI in copy.** No "click here to see", no "this section
shows". The site should be intuitive, not annotated.

## Design tokens

- Type: Plus Jakarta Sans (body and UI), DM Mono (data and captions)
- Red `#C8102E`, paper `#F2E8D5`, card `#FAF6EE`, ink `#1C1208`, masthead `#3D2810`
- Border radius 14px on all cards and infoboxes
- Separators: 1px `#DDCFB8`, 40px margin top and bottom, no shadow
- Empty states: an em dash only. No "loading" or "will appear here" text.

## Coverage

We run: photographs, announcements, events, weather and creek conditions,
local history, gardening, fishing, obituaries.

Obituaries run on the news page only. No photograph, no beat color, never in
the announcement strip, never a push notification. See DECISIONS.md 22.

Politics runs when it lands here. Zoning, a permit, a hearing date, a council
vote, an incorporation question, anything that changes Graysville, Cardiff, or
Brookside or the ground around them. Post the facts and the dates and let people
decide. No national politics, no party politics, no endorsements, and no telling
a reader what to think. See DECISIONS.md 35.

We do not run: sports, or hunting location content of any kind. Season dates
only, never spots or maps.

## File naming

Everything is `fivemile-*`. Pages, styles, scripts, data files.

- `index.html` keeps its name.
- Build scripts and workflow YAML keep their filenames. Their contents
  reference `fivemile-*`.
- Stub files remain at the old `cardiff-*.html` paths with a meta refresh and
  a canonical link. Do not delete them and do not add anything to them.
- `sw.js` and `cardiff-sw.js` are both self-unregistering tombstones for
  anyone who installed the PWA under an older path. Do not delete either. The
  live service worker is `fivemile-sw.js`. `sw.js` is the one with real
  installs behind it, because that is the path the site registered right up
  until the rename; `cardiff-sw.js` is from a round before that.

`ticker.json`, `announcements.json`, `turnings.json`, and `offline.html` keep
their names. They never carried a town in them, so there was nothing to fix.
`news-archive/YYYY-MM.json` and `news-archive/index.json` are the same case.

If a `cardiff-` **filename** turns up anywhere other than those stubs and the
two tombstones, it is a bug from the rename pass.

**Cardiff never stands in for the whole watershed in copy.** Naming Cardiff is
right when Cardiff is what is meant: its council, its charter, its history, the
weather station that sits there and is cited as the source of a reading. It is
wrong as shorthand for the area. "Yesterday around Cardiff" and "the most
visible large mammal in Cardiff" both tell a reader in Graysville that this site
is about somewhere else. Write these three towns, along the creek, here, or this
part of Jefferson County. See DECISIONS.md 42.

Three kinds of `cardiff` are correct and must be left alone:

- **The town.** Cardiff is one of the three towns. It appears in copy, in town
  badges, in data, and in photograph filenames, and always should.
- **Class names and data ids.** `cardiff-masthead`, `cardiff-site-footer`,
  `cardiff-app-*`, `cardiff-city-council`, `cardiff-traffic-report` and the
  rest were deliberately not renamed. See DECISIONS.md 10.
The domain is `fivemile.now`. `cardiffalabama.info` is gone from the repo
entirely, including `CNAME`. See DECISIONS.md 26 for what has to be true in
DNS and in repo settings for that to work.

## Git

`git pull` first, always. Scheduled workflows commit data files on their own.
Then `git add .`, `git commit -m "..."`, `git push`.

## Before changing anything that looks like a mistake

Read DECISIONS.md. Several things in this repo are deliberate and
counterintuitive, and the reasons are written down there. If a decision is
listed, do not undo it without asking Joe.
