# Decisions

Why things are the way they are. This file exists because several choices here
look like mistakes, and a competent person who does not know the reason will
quietly correct them. That has already happened more than once.

Format: what was decided, why, and what would have to change for it to be worth
revisiting. Add to the bottom. Do not delete entries, mark them superseded.

---

## 1. Town order is Graysville, Cardiff, Brookside
**Decided:** August 2026

West to east. Used for every list, nav, card row, table, JSON array, heading
order, and tagline.

**Why:** It is the order the towns are read and said locally. It is also
defensible editorially: Graysville is the largest of the three and the one with
a functioning municipal government.

Creek order is the reverse (Brookside, Cardiff, Graysville) because the water
runs east to west. Creek order is used ONLY for describing travel along the
water: paddle routes, upstream and downstream, gauge positions. Never for
listing the towns.

**Why this keeps getting broken:** the creek narrative runs the other way, so
upstream-to-downstream feels like the natural order to anyone thinking about
the creek. It reasserts itself anywhere the ordering is incidental rather than
the point. Six instances had to be fixed in one document.

**Revisit if:** never, without asking Joe directly.

---

## 2. No backend
**Decided:** August 2026. Supersedes the earlier Supabase architecture.

Fully static. No database, no serverless functions, no third party form
services, no ad networks.

**Why:** Supabase was tried and did not suit. A static site has no ops burden,
no monthly cost, no service that can disappear, no privacy surface, and no
credentials to leak. At this scale a JSON file in the repo does everything a
database was doing.

**Cost of this decision:** community crossing reports and push notifications
both died with it. That is accepted.

**Revisit if:** Hills and Hollers becomes real and needs live posting. Even
then, try the Google Form to GitHub Action path first, which stays static. See
section 32 of the build spec for four options.

---

## 3. Files keep their cardiff- prefix
**Decided:** August 2026. **SUPERSEDED by decision 10, same month.**

The original reasoning was that renaming breaks inbound links, printed QR
codes, and git history for no reader benefit. Two of those three turned out not
to hold. Kept here so the reversal is visible rather than looking like drift.

---

## 4. The publication name is FIVEMILE, one word
**Decided:** August 2026. Domain fivemile.now registered.

The wordmark is one word. In body copy the creek is "Five Mile Creek", three
words.

**Why:** the one-word form matches the official USGS spelling and the domain.
The three-word form matches the historical marker, the Freshwater Land Trust,
and the Alabama Birding Trails, which is how everyone locally writes it. The
split is deliberate. Do not normalize one into the other.

No genre word (Journal, Gazette, Bulletin, Almanac) because every one of them
makes a promise about what the publication is, and the answer is still forming.
A place name cannot be wrong later.

---

## 5. No hunting location content
**Decided:** August 2026

Season dates on the calendar and almanac are fine. Maps, spots, property
references, and anything readable as an invitation to hunt a specific place are
not.

**Why:** almost none of the creek corridor is huntable. The greenway and parks
are public recreation land and the rest is private. Hunting content sitting
next to creek maps invites a reader to connect the two wrongly, with this
site's name on it.

---

## 6. Consolidation is a reporting subject, never an editorial position
**Decided:** ongoing

The site covers three towns because they share a creek, weather, a railroad,
and families. It does not argue that they should merge.

**Why:** the moment the publication has a position, it loses its standing with
readers in Brookside and Graysville, and everything else it publishes gets read
through that lens. Its usefulness is the whole asset.

**Related:** no politics of any kind on the site.

---

## 7. No ad networks, direct advertising only
**Decided:** August 2026

No AdSense, no programmatic advertising. Direct local sponsorships rendered
from a static JSON file, clearly labeled, no tracking.

**Why:** at this traffic level ad networks earn a few dollars a month, hand
readers to a tracking network, contradict the privacy note in the footer, and
break the no-backend rule. Local sponsors are legible in a small town in a way
banner ads are not.

**Hard constraint:** no sponsor slot on the Town Halls page or the About page.
This site publishes council contact information and cannot have paid placement
near it.

---

## 8. Quizzes never retire
**Decided:** August 2026

Every quiz ever published stays playable at its own URL. Only the featured slot
rotates.

**Why:** a shared link has to keep working. It is also the same principle the
whole site runs on: nothing here scrolls away.

---

## 9. Weekly rhythm slots always fall back
**Decided:** August 2026

Every scheduled slot renders the most recent archive item with a label rather
than showing an empty state.

**Why:** the rhythm is a promise, and the failure mode of a one-person
publication is a busy week. The site should never visibly show a missed day.

---

## 10. Everything renamed to the fivemile- prefix
**Decided:** August 2026. Supersedes decision 3.

Pages, styles, scripts, and data files all become `fivemile-*`. `index.html`
keeps its name. `cardiff-cemetery.html` became `fivemile-heritage.html`, a
rename for sense rather than just prefix.

**Why the reversal:** the three objections in decision 3 did not survive
inspection. Git history follows a rename with `git mv`. The QR code exists in
one physical place on one sign and is trivially reprinted. Inbound links are
handled with stub files at the old paths. What remained was an editorial
argument that outweighs all of it: a publication whose premise is that three
towns get equal footing, serving every page from a `cardiff-` URL, is a
contradiction a Brookside reader can see in their address bar.

**Analytics:** this costs one discontinuity in GA4, because reports key on page
path. It costs nothing extra, because a new GA4 data stream was already planned
for the domain move. Rename and domain cutover produce one clean break instead
of two. The old data is not lost, it just sits under the old paths.

**Timing:** the rename runs early, second in the sprint, right after the
Supabase teardown and before the brand tokens. Early is only safe because all
the work happens on a branch and nothing is live while it is half done. On main
this would have to run last.

**What must never be deleted:** the stub files at the old paths, and the
service worker tombstones, which clear the old worker off phones where the PWA
was installed. Deleting either one strands real users.

**Executed:** August 2026, later in the sprint than this entry planned. 36
files renamed with `git mv`, 914 references rewritten, 10 stubs written at the
old `.html` paths, and two tombstones.

**Two tombstones, not one.** This entry named `cardiff-sw.js`, but by the time
the pass actually ran the live worker had been sitting at `/sw.js` for a
while, and that is the path installed readers had registered. A tombstone only
works at the path the browser is still asking for, so `/sw.js` is the one that
matters and `cardiff-sw.js` is kept as insurance for the earlier round.
`fivemile-sw.js` is the live worker, bumped to `fivemile-v8` because every
path it precaches changed at once.

The service worker's internal cache keys were renamed too, `cardiff-state` to
`fivemile-state` and the rest, along with the PWA install globals. They are
keys and function names rather than files and nothing depended on them, but
they lived in the same two files as the worker itself and leaving them there
would have been confusing at exactly the point somebody is reading that code.

**What was deliberately NOT renamed, and must not be:**

- **CSS class names and data ids.** `cardiff-masthead` is on every page.
  `cardiff-site-footer`, `cardiff-app-*`, `cardiff-marquee-smooth`,
  `cardiff-city-council`, `cardiff-traffic-report`, the holler feedback keys,
  and the season window ids are all in the same position. None of them is a
  file, none is visible to a reader, and none appears in an address bar. The
  editorial argument in this entry is entirely about what a Brookside reader
  sees in their browser, and a class name is not that. Renaming roughly twenty
  of them across twelve pages and two stylesheets is churn with real breakage
  risk and no reader benefit.
- **`cardiffalabama.info`.** Still the live domain, still in every canonical
  link and the sitemap. The move to fivemile.now is its own job, and this
  entry always assumed the two would land together. They did not. Whoever does
  the domain cutover updates the canonicals, `robots.txt`, `sitemap.xml`, and
  `CNAME` in one pass.
- **The town.** Cardiff is one of the three towns. It belongs in copy, badges,
  data, and photograph filenames.

The rule in CLAUDE.md was tightened to say `cardiff-` **filename** rather than
`cardiff-` reference, because as originally worded it made `cardiff-masthead`
look like a bug, and the next person to read it would have taken the class off
every page on the site.

**Revisit if:** never. This one is done.

---

## 11. The towns have no colors
**Decided:** August 2026

There is no color field on a town, no per-town badge variant, and no town
color anywhere in the CSS. All three town badges are identical: white type on
masthead brown. The town name is the only thing that differs.

**Why:** an earlier draft assigned each town a color and it encoded exactly the
hierarchy this publication exists to avoid. Brookside drew Cardiff red, the
brand color, and Cardiff drew the weakest tan of the three. Nobody would have
described that as a ranking, and everybody would have read it as one.

**Scope:** this covers badges, card backgrounds, borders, heading rules, chart
series, map pins, news fallback tints, and anything else that might tempt a
future pass into distinguishing the towns visually. If three things need to be
told apart, the names already do it.

**Side effect worth keeping:** color is now free for section tags, which carry
the only hue in the badge system with no ambiguity about what it means.

**Revisit if:** never.

---

## 12. Ads are not cards
**Decided:** August 2026. Refines decision 7.

Advertising has its own visual language, specified in
`docs/fivemile-ad-spec.html`. There is no `.card-sponsor` class and there must
never be one.

**Why:** an earlier draft styled ads as a muted card. Quiet is not the same as
distinguishable. Every card on this site carries the publication's credibility,
and a card-shaped ad borrows it. A very subtle ad is also closer to native
advertising, which is the format readers and regulators trust least.

**How ads differ, structurally:** square corners against 14px everywhere else,
a fill darker than the page rather than lighter, heading weight capped at 600,
no Cardiff red, and an ADVERTISEMENT label above every block. A regular reader
feels the difference before reading the label.

**The label word is ADVERTISEMENT**, not "Sponsors." The friendlier word is the
one businesses reach for when they would rather the reader not think about
money changing hands. "Supported by" is reserved for section underwriting,
which is a different arrangement.

**Banned in code, not by memory:** town halls, about, and any page currently
showing a red notice. Hard cap of one block and two ads per page.

**Decided in advance, while it is cheap:** if an advertiser becomes news, the
story runs and the relationship is disclosed in it. If the story is
unflattering, it still runs and the advertiser is probably lost.

**Revisit if:** never for the disclosure rules. Formats and placement can grow.

---

## 13. AI use is disclosed, and the disclosure is specific
**Decided:** August 2026

The About page carries a "How this site is made" section, and a one-line
version sits in the footer of every page linking to it.

**Why disclose:** a one-person publication that suddenly has eleven pages and a
data pipeline invites the question. Answering it first is cheaper than being
asked, and in a small town the appearance of hiding something costs more than
the thing being hidden.

**Why it has to be specific rather than a blanket line:** the easy version
would be "everything here is written and approved by a person," and it would be
false. The news page gathers headlines automatically from other publications
twice a day and Joe does not read each one before it appears. A disclosure that
quietly overstates human involvement is worse than none, because the first
reader who works it out has caught the publication in a small lie about
honesty itself. So the news page is called out by name.

**The claims made, all of which must stay true:**
- Anything in FIVEMILE's own voice is written or edited by a person before
  publishing.
- News headlines are automated, sorted by script, and always linked to source.
- No text is generated at read time. Almanac notes are hand written in advance
  and matched by rule, which is templating, not generation.
- No AI-generated images, ever.
- No invented quotes, people, dates, or history.

**If any of those stops being true, the disclosure changes first**, before the
feature ships. Not afterwards.

**The image rule is absolute and is in CLAUDE.md.** Heritage photographs are
the whole reason. In these three towns a reader may recognize their own
grandparents in a picture, and one fabricated historical image would end the
site's usefulness permanently.

**Revisit if:** never for the principle. The wording updates whenever the
practice does.

---

## 14. The wordmark hangs from a cap line, and is split on every load
**Decided:** August 2026

`fivemile-intro.js` writes the eight letters of FIVEMILE into `.fm-let` spans
as soon as it parses, whether or not the intro is going to play. This looks
like waste: the reader who has already seen the intro gets a DOM rewrite that
animates nothing.

**Why:** the arc treatment hangs on those spans. F and E, the two ends of the
word, are set to 1.1em against 0.9em for the six letters between them. That is
a `:first-child` / `:last-child` rule and it needs something to select. If the
split only ran during the intro, the wordmark would arc for a first time
visitor and go flat forever after, which is the one outcome worse than not
doing it at all.

**The letters hang, they do not rise.** All eight share a cap line, so the top
edge of the nameplate runs dead flat and the two big letters drop below the
other six. The first attempt stood them on a shared baseline instead, which
pushed the ends up and read as a wobble rather than a nameplate.

Flush tops are arithmetic, not eyeballing. Playfair Display's cap height is
0.71 of its em and not one letter in FIVEMILE descends, both measured, so the
end letters are pushed down by exactly the difference between the two cap
heights. The three numbers live as custom properties on `.mh-brand-name` and
the offset is a `calc()` off them. **Change the sizes there and the drop
follows on its own.** The phone breakpoint does exactly that and needs no
second offset. If the wordmark face ever changes, remeasure `--fm-cap`: a face
with a different cap height will look subtly wrong and nobody will be able to
say why.

**Fails open.** With JavaScript off there are no spans, the container rules
still apply, and the word paints flat at one size. Nothing is broken, it is
just the old nameplate.

**If you change the split, check the arc.** They are one feature in two files:
the spans in `fivemile-intro.js`, the sizes in `fivemile-common.css`.

**The wordmark size is set in `fivemile-common.css`, not the page style
blocks.** Every page still carries its own `.mh-brand-name` font-size from
before the rebrand and the shared file overrides all twelve. Editing one page
does nothing, which is confusing enough to be worth writing down.

**Revisit if:** the wordmark stops being type and becomes an SVG, at which
point both halves of this go away together.

---

## 16. The intro is a typewriter, not a title sequence
**Decided:** August 2026

Each letter is struck: it arrives a shade oversized and a hair high, lands
hard, and stops. The ink is at full weight before the letter has finished
moving, so it reads as hit rather than faded up, and there is no spring on the
landing, because a typebar does not bounce back off paper.

**What this replaced:** letters dropping from above on an overshoot curve,
with a light sweeping across the wordmark. It was well made and it was a film
title sequence. This publication is a newspaper, and the intro is the first
thing that tells a reader which one it is.

**The stagger is deliberately uneven.** `strikeDelay()` in
`fivemile-intro.js` adds a small wobble to each letter's delay. An exactly
even rate is a metronome, and the thing being imitated is a person at a
keyboard. The wobble is arithmetic on the index rather than random, so the
intro is one fixed piece of motion instead of a slightly different one every
load. The offsets stay well under one strike interval, so letters can never
arrive out of order however long the name gets.

**The wordmark box no longer clips.** The old `overflow:hidden` existed only
to contain the light sweep. The strike starts at `scale(1.3)`, so leaving the
clip in would have shaved the first and last letters at the moment they are
largest. If anything is ever added back inside that box, check this first.

**Timing lives in two files and has to agree:** `STRIKE_MS` and
`strikeDelay()` in `fivemile-intro.js`, the durations and the town delays in
`fivemile-common.css`, and `RUN_MS`, which is the backstop that ends the intro
and must outlast the last town.

**Unchanged and not up for discussion:** it plays once ever, any input ends
it, reduced motion skips it, and the red announcement strip is never touched.

---

## 15. `.card-tab.brief` exists for tab cards with no rows
**Decided:** August 2026. Refines the card spec.

The full `.card-tab` is a lookup card: title, a list of `.t-row` pairs, and a
note ruled off and pinned to the bottom by `margin-top:auto`. The three towns
on the homepage have no rows. The note had nothing to push against except the
title, so it opened a hole roughly two thirds the height of the card, and the
214px panel height held the hole open.

`.brief` is for that case: height from contents, note follows the title at a
reading gap, bottom rule gone with the rows it was separating.

**Do not put it on a card that has `.t-row` children.** There the rule and the
pinned note are doing real work, and this would flatten a table into a
paragraph.

**Why a modifier rather than a homepage override:** the second page that wants
a rowless tab card should get the same one. A rule living in `index.html`
would have been copied and drifted. See the note in CLAUDE.md about dropping a
treatment rather than shipping it inconsistently.

---

## 17. News is gathered by its own script, from the outlets' own feeds
**Decided:** August 2026. Supersedes the Google News gathering in
`fetch-site-data.mjs`.

`scripts/fetch-news.mjs` is the only writer of `fivemile-news-live.json`.
`fetchNewsStories()` and `updateNewsFile()` were removed from
`fetch-site-data.mjs`, which now handles weather, the creek, air, and the
civic snapshot and nothing else. News runs on its own schedule in
`refresh-news.yml`, at 6 am and 4 pm Central, because a page that opens with
the morning report wants gathering in the morning.

**Why publisher feeds:** Google News hands back a redirect address and never a
picture, so every headline landed a reader on a Google page and every card
looked the same. The outlets' own feeds hand back the real article address,
the outlet's real name, and usually the photograph they published for sharing.

Google News stays as a net for the small names the big outlets do not tag:
Cardiff, Brookside, Gin Town, Five Mile Creek, the Northern Beltline. Those
items are marked `viaGoogle`, never carry a photograph, and never lead the
page. When one of our own outlets has filed the same story, the dedupe drops
the Google copy and keeps the real link.

**Outlet names are normalized.** A story arriving through Google News is
tagged WBMA or WVTM; the same newsroom's own feed calls itself ABC 33/40 or
WVTM 13. `OUTLET_ALIASES` prints one name per newsroom, because two spellings
made one outlet look like two on the card and in the list at the bottom of the
page.

**The end of month rain story came along.** It is the one story nobody else
files, and it moved with the gathering rather than being left behind in a file
that no longer writes news. Do not add a second writer for the live file.

**Feeds move without warning and fail silently.** `node scripts/check-feeds.mjs`
pings every row and reports what answered. Run it when the page goes thin for
no reason. As of August 2026 all fourteen answer. WBHM and the North Jefferson
Herald are commented out in `SOURCES` with the reason on the line above them,
and the weather service alert feed is deliberately absent because `ticker.json`
already puts those in the notice card at the top of the page.

**Open:** AL.com is marked `paywall:true` and gets a small Subscribers marker.
Worth deciding whether AL.com stories should be ranked down instead, since half
of them cannot be read.

**Revisit if:** two or three outlets ask us to stop, or a feed we depend on
goes behind a key.

---

## 18. Photographs beside headlines are hotlinked, never copied
**Decided:** August 2026

Three tiers, in order: a media tag inside the outlet's own RSS feed, then the
`og:image` tag in the head of the article, then nothing and the headline runs
on its own.

The rules underneath that:

- We store the **address** of the picture, never the picture. It loads from
  the outlet's server. No copy of anybody's photograph lives in this repo or
  is served from our domain. That is the difference between a link preview and
  a reproduction, and it is the whole argument for why this is fine.
- We never open the body of an article and never lift a photograph out of the
  page. Head only, capped at 200 KB, then the connection is dropped.
- `robots.txt` is checked before any article is touched, once per host per run.
  An `x-robots-tag: noimageindex` header means no picture.
- We identify ourselves as
  `FivemileBot/1.0 (+https://fivemile.now/; fivemilec@gmail.com)`. A real name
  and a real address to write to.
- Any outlet can be switched off in one line: `images:false` on their row in
  `SOURCES`, and their pictures stop that day.
- Roughly a dozen article requests per run, only for stories that will
  actually appear. We are not crawling anybody.
- Every photograph carries the outlet's name visibly and the whole card links
  to the original.
- `alt=""` on a third party photograph is deliberate, not lazy. The headline
  underneath carries the meaning, so the picture is decorative in the
  accessibility sense. The credit is real text beside it, because a sighted
  reader needs to see it too.
- If a picture fails to load, its slot is removed and the row closes up.
- The policy is stated in plain words at the bottom of the news page, with an
  address for corrections and takedowns. That paragraph is the point. Anybody
  who objects can find out how to object in ten seconds.

Not a lawyer, and this is not legal advice. It is the posture that link
previews, Slack, and every feed reader already operate on, plus a takedown path
that answers the same day.

**Open:** a short note to two or three outlets saying what the site is and how
their photographs are used costs nothing and turns a legal question into a
relationship. BirminghamWatch and Bham Now are the likely yeses. There is also
no stated correction practice yet; one sentence about what happens when we get
something wrong would be worth more than it costs.

**Revisit if:** an outlet objects, in which case turn their pictures off the
same day and keep the link.

---

## 19. Stories are sorted by written rules, and the lead is always local
**Decided:** August 2026

Sorting is done by keyword rings written out in `fetch-news.mjs`. No API call,
no key, no cost, and the same story sorts the same way every time. Every story
carries a `why` field saying which rule placed it, so when one lands somewhere
odd you can find the line responsible instead of guessing.

An LLM pass would sort marginally better and would break the one thing that
makes this maintainable, which is being able to read the reason.

**The order of the page:**

1. The morning report and Coming up
2. The lead
3. Graysville, Cardiff, Brookside
4. Obituaries
5. Around west Jefferson
6. The creek and the woods
7. The county and the state

Weather and the calendar sit above the news on purpose. Three towns of about
1,700 people do not generate news every day, and the page has to look
deliberate on a quiet Tuesday rather than empty. Those two are always
populated, so the page never opens blank.

Obituaries sit fourth, above the wider area. In a town this size they are
among the most read things on the page, and burying them at the bottom would
be a statement about how much they matter. Move them by reordering the
sections in the HTML; nothing else has to change.

**The lead never comes from the county section**, even when the county story
is the biggest thing on the wire. This page is about here.

**The outer ring is two rings, and this took a second pass.** The first
version asked whether a story named the county, the state, or Birmingham and
carried any beat at all, which put 21 of 25 stories in the county section and
turned the page into a Birmingham metro feed. Three rules now:

- `RING_COUNTY` is our own county and state government, the commission and the
  agencies and the legislature. Those are our institutions even when the
  meeting is downtown, so they qualify on any beat in `COUNTY_BEATS`:
  government, schools, and the beats that physically travel.
- `RING_METRO` is Birmingham the city, a neighbor rather than a government we
  answer to. It qualifies only on `TRAVELS`: the road, the rail, the water,
  the weather, the power, the land.
- `OTHER_PLACES` skips anything set in another county or a distant city. State
  agencies work in all 67 counties, so an ALDOT release about St. Clair County
  bridges matched `aldot` and `roads` and read as ours. It is asked only at the
  county stage, so a story naming one of our towns is already placed.

**Public safety is deliberately not a county beat.** County offices turn up in
metro crime coverage constantly: the coroner identifies a body, the sheriff
makes an arrest, and the story matches `jefferson county` and arrives as ours.
A shooting in Birmingham is not something a reader in Cardiff acts on. Public
safety still runs freely in the towns and nearby sections, where it is the
news.

Jefferson County's own municipalities are deliberately absent from
`OTHER_PLACES`, the over the mountain ones included. They are our county and
they vote on the same commission. Drawing that line would be an editorial call
rather than a geographic one.

**The county feed was reading the wrong module.** `jccal.org` serves its page
directory at `ModID=76`, which parses cleanly and filled the section with
Communications, Systems, and Help Desk Metrics. `ModID=1` is News Flash, the
actual county news. Its bid notices are blocked in `NEVER`.

**Revisit if:** the towns and creek sections are empty often enough that the
lead slot sits dark for days at a time, or the county section runs so thin
that `COUNTY_BEATS` needs Public safety back.

---

## 20. Freshness varies by section
**Decided:** August 2026

Towns 6 days, nearby 5, county 4. The creek gets 14, because a cleanup is
still worth reading about a week later. Obituaries stay up until two days
after the service, or 12 days if no service date could be read out of the
notice.

**Why:** one five day rule for everything was pulling obituaries down before
the funeral.

**Revisit if:** the page starts carrying stale creek items that have visibly
been overtaken.

---

## 21. Sports is off, and that is a decision, not an oversight
**Decided:** August 2026

`NEVER` in `fetch-news.mjs` blocks football and the rest.

**Why it is arguable:** Minor High and Mortimer Jordan are real local news to
plenty of people here, and a Friday nights tag would be defensible. Deleting
the sports words from `NEVER` turns it back on.

**Why it is off:** it keeps the page from becoming a scores feed. See also the
coverage list in CLAUDE.md.

**Revisit if:** Joe decides he wants Friday nights, in which case it is one
edit and a new beat color.

---

## 22. Obituaries get no photograph, no beat color, and no notification
**Decided:** August 2026

`.card-obit` is quieter than a news row on purpose: name, town, service,
funeral home, and a link to the home's own page so a family reads condolences
where they expect to find them. A photograph attached to a notice is dropped
by the gatherer rather than left in the file for something later to pick up by
accident.

No obituary goes in the announcement strip and none should ever trigger a push
notification.

**Open:** the funeral homes serving these three towns are the one real gap.
Six candidates and the two minute method for finding each feed are commented
in `SOURCES`. Until at least one is filled in, obituaries only appear when a
news feed happens to carry one or when one is pinned by hand in
`fivemile-news-feed.json`.

**Revisit if:** never, for the quietness. The feeds are just unfinished work.

---

## 23. Nothing scrolls away: the news archive
**Decided:** August 2026

Every story that runs is written into `news-archive/YYYY-MM.json` and stays
there. The live file is a rolling 60; the archive is permanent and committed
by `refresh-news.yml` alongside it.

**Why:** this is the whole reason the site exists rather than a Facebook
group, and it was the one thing the old gatherer did not do.

**Open:** the monthly files exist as soon as this runs, but nothing links to
them yet. A `fivemile-archive.html` that lists months and lets a person search
is the natural next build, and it is the page that actually delivers on
"nothing scrolls away."

**Revisit if:** never. Do not add a pruning step.

---

## 24. The news file stayed backward compatible on purpose
**Decided:** August 2026

`fivemile-news-live.json` keeps every field the old file had and adds the new
ones underneath: `section`, `why`, `town`, `tags`, `outlet`, `paywall`,
`image`, `obit`, `score`.

**Why:** the homepage reads the same file and was not touched. It also means
this can be reverted by swapping one script back.

The news page reads the new shape when it is there and falls back to sorting
the stories in the browser with the same rules when it is not, so the page
works either way. The two rule sets are written out in both places and have to
be kept in step; each says so at the top.

**A beat's color key is derived, never chosen.** It is the printed label with
everything but letters removed, which is why two of them read oddly:
`publicsafety` and `thecreek`. That single rule is what lets a tag written by
the builder and a tag worked out in the browser land on the same color. This
was wrong on the first pass and both tags rendered grey.

**Revisit if:** the fallback sorting drifts far enough from the builder that
keeping both honest costs more than deleting the fallback.

---

## 25. `.tag` colors come from `--accent`
**Decided:** August 2026. Refines the card spec.

The left bar on a `.tag` reads `var(--accent, var(--fm-muted))`. The six
section classes in `fivemile-cards.css` set that variable, and so do the
twelve news beats in `fivemile-news.css`. Nothing outside the card file
restates the `::before` rule.

**Why:** the news page needed a second set of subjects on the same badge
without either owning the card system or forking it. One variable means a
future page with its own set gets the same bar for one line each.

**Only the bar takes the color. The label is always ink.** The first pass set
`color` on the tag as well, which put twelve colored words next to the
headlines and turned an index mark into something competing with the story.
See the two badge systems in DECISIONS.md 11: shape and construction carry the
meaning, not hue, so this has to stay readable in black and white.
