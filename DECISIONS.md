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

**Related:** decision 35 opened politics up to anything that lands in these three
towns, which does not touch this entry. Reporting a hearing, a zoning change or
an incorporation question is exactly the reporting subject this entry describes.
Arguing for an outcome is still off. The distinction is the whole point, and it
matters most on this subject: the site's standing with a reader in Brookside is
what makes covering it worth anything.

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
- **The town.** Cardiff is one of the three towns. It belongs in copy, badges,
  data, and photograph filenames.

The domain went with the rename in the end rather than separately, which is
what this entry originally assumed. See decision 26.

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

**Timing lives in three files and has to agree.** `STRIKE_MS` and
`strikeDelay()` in `fivemile-intro.js` set the rate; the durations and the
town delays in `fivemile-common.css` are derived from it; `RUN_MS` is the
backstop that ends the intro and must outlast the last town; and the 2600ms
timer in every page's head gate must outlast `RUN_MS`. Walk them in that
order.

**Stretched, August 2026.** `STRIKE_MS` went from 85ms to 135ms and the whole
piece from about 1.1 seconds to about 1.9. At 85ms it was a fast typist and
the eight letters arrived as a single event; at 135ms they are legible one at
a time, which is the only reason to letter a nameplate in the first place. The
towns were pulled back to 1240ms so there is a real gap after the wordmark
finishes at 1155ms. That gap is what makes it two movements instead of one
long one.

**It plays once a day, not once ever.** What goes into localStorage is the
date the reader last saw it, built from local `getFullYear`/`getMonth`/
`getDate` so the day turns over at their midnight rather than UTC's. Once
ever was right when the intro was a first-visit greeting. It is the
publication's nameplate being set, and a daily paper sets its nameplate every
day. Once a day is the whole difference between a splash screen, which is
something to get past, and a front page, which is something to arrive at.

The same three lines are inlined in each page's head gate and defined as
`todayKey()` in `fivemile-intro.js`. Two copies, because the gate has to run
before any file loads or the masthead flashes un-split. If one changes the
other has to change with it. A reader carrying the old `"1"` flag from before
this change simply gets one more play, which is the correct outcome.

**The wordmark replays it on the homepage.** The nameplate is the link home on
every page, and on the homepage that link had nowhere to go. Now it replays
the intro there and stays the link home everywhere else. It is not labelled,
it has no tooltip, and its `aria-label` still says Home, because on six pages
out of seven that is exactly what it is and CLAUDE.md does not let the UI
explain itself. Somebody who taps the nameplate finds it; somebody who never
does has lost nothing.

Three things `bindReplay()` is careful about, and all three are load-bearing:
it only calls `preventDefault` on a plain left click, so open-in-new-tab and
long-press still work and the nameplate is still a link with JavaScript off;
it does not bind at all under reduced motion, because `playIntro()` would
return without doing anything and a nameplate that swallows a click and then
sits there is worse than one that reloads; and the `pointerdown` listener that
ends the intro is registered inside `play()`, after the click that started the
replay has finished dispatching, so the replay cannot cancel itself.

**The fill mode is `backwards`, and there is no `will-change`.** Both of those
are load-bearing and both look like something to tidy up. They are not.

There was a small shake at the end. Nothing was moving: the resting position
is identical before and after, measured. What moved was the antialiasing. An
element that is mid-transform sits on its own compositing layer and its text
is drawn with grayscale antialiasing; an element with no transform is drawn
into the page with subpixel antialiasing. Crossing between the two resharpens
the text.

With `both`, every span held its final frame, transform and layer and all,
until `finish()` flipped `data-intro` to `done` at `RUN_MS`. That is 320ms
after the last town has stopped, so all eleven spans dropped their layers in
the same frame, in silence, after the nameplate had visibly come to rest. One
synchronised resharpen across the whole wordmark, well after the motion ended,
which is the most noticeable place to put it.

`backwards` still holds the `from` state through the delay, which is the thing
that keeps a letter hidden until it is struck. What it does not do is hold the
`to` state afterwards, so each span drops its layer at the end of its own
animation, staggered, in the same frame it stops moving. A resharpen
underneath a letter that is still landing is not visible.

`will-change` had to go with it, because `will-change:transform` promotes a
layer whether or not a transform is currently applied. Leaving it would have
kept all eleven layers alive until `RUN_MS` and put the synchronised flick
straight back. It was buying a first-frame hint on eight short animations over
eight small spans, which does not pay for a visible artefact.

**Anything that animates a transform on this wordmark inherits this problem.**
If a third piece of motion is ever added here, give it `backwards` too, and do
not add `will-change` back as an optimisation.

**Unchanged and not up for discussion:** any input ends it, reduced motion
skips it, and the red announcement strip is never touched.

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

**Built, August 2026.** `fivemile-news-archive.html` lists the months and
searches across all of them. It reads `news-archive/index.json`, written by the
same gatherer, because a static host cannot list a directory. See decision 36.

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

---

## 26. The domain is fivemile.now
**Decided:** August 2026. Executed alongside the rename pass in decision 10.

`cardiffalabama.info` is gone from the repo. `CNAME`, every canonical link,
every `og:url`, the JSON-LD graph on the homepage, `sitemap.xml`,
`robots.txt`, and the canonical links in the ten stub files all read
`fivemile.now`.

**Why with the rename rather than after it:** decision 10 assumed the two
would land together and counted on it. Doing them together costs one GA4
discontinuity instead of two, and it means a reader never sees a `fivemile-`
page served from a `cardiff-` domain, which was the contradiction the rename
existed to remove in the first place.

**This does not take effect until the branch merges,** because GitHub Pages
reads `CNAME` from the published branch. Nothing about the live site changes
while this sits on `fivemile`.

**What has to be true before the merge, outside this repo.** The repo change
is the smaller half of a domain move and it fails loudly if the rest is not
ready:

- DNS for `fivemile.now` has to point at GitHub Pages. For an apex domain that
  is four A records to `185.199.108.153`, `185.199.109.153`,
  `185.199.110.153`, and `185.199.111.153`, and the matching AAAA records if
  you want IPv6.
- Pages has to accept the domain in repo settings. Pushing `CNAME` to the
  published branch normally sets it, but check it landed.
- HTTPS is not instant. The certificate is issued after DNS resolves, and
  Enforce HTTPS cannot be ticked until it is. Expect a window where the site
  answers on http and not https.

**If DNS is not ready when this merges, the site goes dark.** Not degraded,
dark. That is the one genuinely dangerous thing in this whole branch, and it
is the reason to do the DNS first and the merge second rather than the other
way round.

**Inbound links to the old domain break.** GitHub Pages serves one custom
domain and cannot redirect from another. Anything that has to keep working
needs `cardiffalabama.info` kept registered and pointed at a redirect
somewhere that is not Pages. The known cases:

- The QR code on the physical sign. Decision 10 called it trivially
  reprintable, which it is, but it has to actually be reprinted. The files in
  `qr-codes/` encode the old address and need regenerating.
- Anything shared to Facebook before the cutover.
- Search results, until Google recrawls. The canonicals point at the new
  domain, so this resolves on its own, slowly.

**Revisit if:** never for the choice of domain. The redirect question is open
and depends on whether the old domain is worth keeping registered.

---

## 27. The almanac is five pages, not one
**Decided:** August 2026.

The almanac carried nine cards down one column: weather, the creek, the
watershed forecast, fishing, planting, nature watch, season windows, sky
almanac, the moon, a fact, and the week ahead. Each one was a summary of a
subject that deserved a page, and none of them could be any good at that
width. The page was also the last one on the site still running its own private
card CSS, roughly 250 lines of it inline in the head, which is how it drifted
away from everything else in the first place.

It is now five pages:

| Page | Carries |
| --- | --- |
| `fivemile-almanac.html` | The creek, the weather, the date, the week ahead |
| `fivemile-fishing.html` | Water, species, the fishing year, limits, the advisory |
| `fivemile-garden.html` | The planting year, the frost dates, seed packets |
| `fivemile-nightsky.html` | Moon, dark hours, the month's sky, the meteor year |
| `fivemile-nature.html` | The nature year, season windows, frost, hunting dates |

**The creek moved to the top of the almanac,** above the weather. It is the
reading the publication is named after and the one people come for, and it
spent a year sitting below three weather cards. It leads with four
`.card-gauge` tiles, every one of which links out to
[USGS 02457595](https://waterdata.usgs.gov/monitoring-location/02457595/).
Every reading on every one of the five pages that comes from somebody else's
instrument links to that instrument. A number with no provenance is a rumor,
which is the rule the red notice already ran on, applied to data.

**What is shared and where it lives.** `fivemile-almanac-core.js` holds
anything two or more of the five need: the sun and moon arithmetic, the creek
mood bands, the fishing ratings, the planting year, the nature year, the meteor
list, and the desk rail. `fivemile-almanac.css` holds the page shell, the rail,
the layout grids, and the row classes the scripts write into a card body.
Neither file holds a card: every card on all five pages comes from
`fivemile-cards.css`.

**Two card types got their first home here.** `.card-check`, the brass check,
is the fishing desk's species card, which is what its `b-latin` field was drawn
for. `.card-packet`, the seed packet, is the garden desk's. The card spec says
the brass check is rare on purpose and something has gone wrong if it turns up
on a third page. The fishing desk is its second page after the spec sheet, and
that is where it stops.

**Season windows folded into nature watch** rather than staying a card of their
own. Both answer the same question, which is what is happening in the woods and
fields right now. Hunting seasons appear there as dates and only as dates.
Decision 5 is unchanged and always will be.

**What did not move.** The turnings, the Seasons of the Holler content in
`turnings.json`, stayed with the calendar page, which already renders them in
full. The nature desk links to it rather than drawing a second copy. One card
per purpose.

**Revisit if:** a desk turns out to have nothing on it worth a page. Fishing
and the garden are the two most likely to earn their keep, and the night sky is
the one most dependent on somebody keeping `fivemile-skywatch.json` current.

---

## 28. The desk rail points, and the almanac carries a card for every desk
**Decided:** August 2026. Replaces the "Jump to today" pills. Revised the same
day, after the first pass failed in front of a reader.

The almanac used to open with a row of rounded pills that jumped to anchors
further down the same page. Once the page split, five of the seven pills were
pointing at other pages, which is a navigation bar wearing a pill costume.

**The first pass was too quiet and it did not work.** It set five tiles in a
paper2 band under the masthead, each naming a page, each marking the current
page by going subtle. Joe read it as a row of section headings rather than as
five links, and said so. Two separate faults:

- *Nothing pointed.* A tile with a name and no arrow reads as a label. The fix
  is an arrow on every entry, in red. An arrow is not copy and it does not
  explain the interface. It points, which is the one job.
- *The band cut it off from the page.* Its own fill and a rule underneath made
  it look like chrome bolted to the bottom of the masthead. It sits on the page
  background now, with the topographic lines running behind it, and the tiles
  are the only objects in it.

**What the rail is.** All five family pages, directly under the red strip. The
masthead nav above it is brown, all caps, and marks the current page with a red
underline. The rail is paper, sentence case, 8px corners, arrowed, and marks
the current page by recessing it and taking its arrow away. Each entry carries
the 4px accent bar the `.tag` badge uses and a live line of its own, so it
reports something rather than only pointing.

**Getting back.** On a desk page the almanac entry leads with a left arrow
instead of trailing a right one, and every desk page repeats the way home as a
full width `.desk-back` block at the foot. A reader who has come down the
fishing page should not have to scroll back up to leave it.

**Five accent colors, set from `fivemile-almanac.css`.** Decision 25 allows a
page with its own set of subjects to set `--accent` from its own stylesheet.
The news beats did it first. Like the beats, these color a bar and never a word.

**It is a row, not a side rail.** A vertical rail becomes a horizontal row at
390px anyway, and two layouts of the same object drift apart.

**The almanac also carries a card per desk, and that is the primary route.**
Four `.card-dept` panels, two across: a red bar naming the subject in plain
words, three readings for today, a sentence, and a red arrowed line naming the
page it opens. The whole panel is the link, which is why `a.card-dept` was
added to the card file alongside the `a.card-tab` and `a.card-post` rules that
were already there.

The first pass used `.card-tab` for these. The tab card is a lookup object and
it gave a reader no visible signal that it went anywhere, which is the same
fault the rail had. The department panel is the loudest and most familiar card
on the site, and the red bar is unmissable.

**Why both a card and a rail.** They answer different questions. The card
answers "is it worth going" with today's numbers on it. The rail answers "what
else is here" from anywhere in the family. Neither replaces the other, and a
reader who misses one still finds the other.

**Reading level.** Most readers here are on a phone, many are older, and the
site assumes a sixth grade reading level for anything a person has to act on.
That is a rule about clarity, not about dumbing the prose down: the labels are
short and plain, the destinations are named rather than described, and the
blurbs stay full sentences in the publication voice. It never becomes "click
here to see". See the voice skill on the two registers.

**Revisit if:** the family grows past five. Six entries is where a row stops
being scannable.

---

## 29. Town order is enforced where it is rendered, not where it is fetched
**Decided:** August 2026. Fixes a live violation of the rule in decision 1.

`fivemile-watershed-weather.json` was arriving as Cardiff, Brookside,
Graysville, and the almanac was mapping over the array in file order. The three
towns had been going onto the screen in the wrong order on a live page.

The generator's own comment in `scripts/fetch-site-data.mjs` says the order in
that file is not what puts the towns on the screen and that pages are expected
to look their town up by name. That was true of the intent and not true of the
code. The almanac now sorts by name into Graysville, Cardiff, Brookside before
it renders, so the rule holds no matter what any feed says.

**The general form:** the town order rule is a rendering rule. Any page that
takes three towns out of a file and puts them on the screen sorts them itself.
Fixing the file is not a fix, because the file gets rewritten by a scheduled
job every few hours.

**Also moved in this pass:** the gauge tick rail drawing, which lived in a
`<script>` block in `index.html` until the almanac grew gauge tiles of its own.
It is in `fivemile-common.js` now, as `window.FivemileDrawTicks`, and
`index.html` calls through to it. Two copies of that function would have
drifted, and a drifted tick rail is the kind of thing nobody notices for a year.

---

## 30. The data schedule: ten minutes for conditions, two editions a day for news
**Decided:** August 2026

Three schedules, and the split is about what a reader can act on.

`refresh-live.yml` runs every ten minutes and refreshes three things: the alert
ticker, current conditions from the station, and the Republic gauge. Those are
what can change while somebody is standing in the yard deciding whether to move
a truck.

`refresh-news.yml` runs at 11:00 and 23:00 UTC, six in the morning and six in
the evening Central. A morning edition and an evening edition.

`refresh-site-data.yml` keeps its twice daily run, and everything heavier stays
in it: the station history backfill, the watershed forecast, air quality, and
the civic snapshot.

**Alerts, weather, and the gauge share one workflow and make one commit.** A
reader gets one coherent update rather than three partial ones, and the history
stays legible. Actions minutes are not the constraint either way: the repo is
public, so minutes are free and unlimited.

The original reason written here was that Pages throttles at roughly ten builds
an hour, that three separate ten minute workflows would push eighteen times an
hour and start losing builds, and that one pushes six. **That arithmetic never
happened, and it is corrected here so nobody builds on it.**

**Measured, August 2026: the ten minute cron does not run every ten minutes.**
GitHub honors a sparse schedule exactly and throttles a dense one hard. Over
four days `refresh-alerts.yml`, on this same `*/10` cron, got 119 runs. That is
about thirty a day, not 144. The median gap between runs was 38 minutes, the
ninetieth percentile 55, and the worst 107. Across those same days `0 */6` and
`0 5,17` delivered four runs and two runs a day, every day, exactly as written.

So one workflow pushes about 1.6 times an hour, not six, and three would push
about five, not eighteen. Neither is anywhere near the build limit. Keeping the
three in one commit is still right, for the reasons in the paragraph above, but
it is not holding back a flood of builds and should not be defended that way.

What a reader actually gets is worth stating plainly: conditions on this site
are about forty minutes old, not ten. That is still well inside the useful
window for a creek that takes three hours to crest, and every card carries its
own timestamp, so nothing is claiming otherwise. The options are all worse. A
denser cron is throttled harder. An hourly cron would be honored exactly but
would make the common case worse, sixty minutes instead of thirty-eight, to buy
back a tail this site can already absorb. Anything better needs something
outside GitHub doing the triggering, and that is a dependency this site does not
take. See CLAUDE.md on preferring the simpler option.

The commit step stages each file only if something other than its own
`updatedAt` stamp moved, so a quiet night does not rebuild the site 144 times
for nothing. The check is per file rather than across the batch, because the
rain log is 50 KB and gains a sample once an hour: without it the log would ride
along on the weather file every ten minutes and put a fresh 50 KB blob in
history each time.

**Size is not the risk here, and it is worth writing down which limit is which.**
The published site is what Pages caps at 1 GB, and that is the tracked files
only, currently about 8 MB. The 1 GB figure on the source repository is a
recommendation, not a wall. History is around 250 MB and almost all of it is
one time image commits plus an 18 MB DLL that got committed out of
`node_modules` once. Data churn adds a few hundred MB a year before packing.
The site cannot stop working because the robots ran too often.

**Two things in `fetch-site-data.mjs` had to change before this cadence was
safe:**

- The rain log now persists one sample an hour rather than one per run. At 144
  a day, `MAX_RAIN_SAMPLES` would have held about seventeen days, and month to
  date rain would have quietly started under-reporting around the eighteenth of
  every month. Today's figures are still computed against the live reading, so
  nothing a reader sees waits for the top of the hour.
- The yesterday re-patch is now a function, `patchYesterdayFromArchive`, called
  by both runs. The live run hands it the archive straight off disk instead of
  refetching the history. Without that, every ten minute run would have walked
  yesterday's high, low, and rain back to the regional model's version.

**The station going offline is handled by doing nothing.** `updateWeatherFile`
throws when Ambient returns no device data, which is what a power cut at the
house looks like from here. The step is `continue-on-error`, so the run carries
on, `fivemile-weather.json` is left alone, and the site keeps showing the last
real reading instead of being overwritten with nothing. No rain sample is
written either, so an outage does not put zeros in the log.

`ARCHIVE_HISTORY_DAYS` went from 3 to 10 in the same pass, so a week long outage
heals itself on the next twice daily run instead of needing `import-awn-csv.mjs`
by hand. The loop skips any day already owned by `awn-csv` or `awn-history`, so
a manual CSV import is never overwritten and the wider window costs one fetch a
day in steady state. Gaps older than ten days are still a CSV import.

**Revisit if:** Pages starts dropping builds anyway, in which case the live run
goes to fifteen minutes before anything else is touched.

---

## 31. The news page never tells a reader it is empty
**Decided:** August 2026

There is no quiet day card any more. The old one was headed "Nothing filed yet"
over a bar reading "The wire is quiet", and it appeared whenever zero stories
survived the freshness rules.

Two things were wrong with it. "Filed" is newsroom idiom, and stacked on "the
wire is quiet" it reads to somebody in Graysville like a form that did not go
through. Worse, it fired on `!kept.length`, which cannot tell a quiet wire from
a JSON file that failed to load, and then asserted "Nothing has come through for
Graysville, Cardiff, or Brookside since the last run." The page does not know
that. It knows it failed to read a file.

**What happens instead:** when nothing fresh places, `fillFromArchive()` pulls
this month and last month out of `news-archive/` and fills the story area under
"Still worth reading". The archive is permanent by decision 23, so there is
always something to put there. It is fetched only when it is needed, so an
ordinary visit still costs the same six files it always did.

Obituaries are excluded from the fallback. A notice is worth running the week it
is filed and is not something to resurface a month later. See decision 22.

The outlet line at the bottom hides itself when there is nothing to name rather
than holding an em dash, because a lone dash under a paragraph about sourcing
reads as a fault rather than as an empty state.

**The em dash empty state is untouched everywhere else.** Small slots that hold
a single value still show a dash, per CLAUDE.md. This decision is about the page
telling the reader, in sentences, that it has nothing to show. It should not.

**Revisit if:** the fallback starts showing the same eight stories for weeks at
a stretch, which would mean the gatherer is broken rather than the town being
quiet.

---

## 32. About replaces Get Involved
**Decided:** August 2026

`fivemile-involved.html` is gone. `fivemile-about.html` took its place in the
footer nav, in the sitemap, in the service worker precache list, and as the
target of the `cardiff-involved.html` stub.

**Why it went rather than being edited.** Get Involved was written for one town
and for a particular moment: a council recruitment drive for Cardiff, when the
site was about Cardiff. Four role cards said "Document Cardiff" and "Cardiff
takes care of Cardiff", the submission form offered "Serving on the town
council" as its first option, and the liability note called the site "Cardiff,
Alabama, a community website maintained by volunteers". None of that survives
the move to three towns without being rewritten into something else, and the
something else is an About page.

**What moved onto About:**

- The support band, with the Venmo link. This is the answer to where the Venmo
  goes now that it is not on a working page: it goes on the page that explains
  what the project is, which is the only place asking for money makes sense.
- The community rules, as prose rather than a numbered card.
- The about copy, and the AI disclosure rewritten to lead with the fact that no
  AI runs on the site at all. The earlier draft opened with "I use AI tools to
  build and write FIVEMILE", which answers a question nobody asked before
  answering the one they did. It now opens with "There is no AI running on this
  site" and explains that automatic is not the same thing as AI, which is true
  here in a specific and checkable way: the news sorting is written keyword
  rules by decision 19, and the almanac notes are written ahead of time by a
  person and matched by a plain rule.

**What did not move, and is simply gone:** the four role cards, and the general
contact form with its interest dropdown. The form's job is covered by the inbox
link on every page, the Hills and Hollers form, and the send block on the news
page. If the role cards are wanted back they should be rewritten for three
towns first, not restored.

**The letter came over and then came back off.** It was carried across from Get
Involved and broadened to the three towns, and on reading it in place Joe called
it: it was not working on this page. It is gone rather than parked. The old
version is in git history if it is ever wanted, and the "Who runs it" section
carries the first person voice on its own now.

The Civic Pathway link went out with it. That is the only thing the letter was
load bearing for, and the civic page is still in the footer nav and linked from
elsewhere.

**Two family anecdotes were deliberately left out.** The draft in
`docs/fivemile-about-copy.md` carried two `[confirm]` notes about relatives and
the businesses they worked in. Joe's call was to leave them out. They are not in
the page and they are not in a comment either, because an HTML comment is served
to the reader like everything else.

**The page is read, not scanned.** One column, 680px, no cards, no infoboxes, no
data widgets. It is the only page on the site with no live data on it at all,
and it should stay that way. Amended by decision 46 on two counts: the prose
is mounted on panels now, because sitting straight on the paper it read as
unfinished, and the measure is 1000px rather than 680px so that a panel here
is the width of a card anywhere else. No live data still holds, and that was
the part that mattered.

**Footer nav only.** The top nav is for the working pages: News, Almanac,
Calendar, Guide, Heritage. About does not go in it.

**Four calls to action pointed at the retired page's form** and were rewired to
what each was actually for rather than all being aimed at About. "Add your name"
on the civic page and the two creek volunteering buttons became inbox links with
their own subject lines. The civic footer button became "About this site",
because it sat next to an inbox link already.

**Revisit if:** the classifieds work lands and needs a rules page of its own, in
which case "Before you send" on About is the copy to start from.

---

## 33. The cleanup pass, and what a naive one would have deleted
**Decided:** August 2026

A sweep for unreferenced files before the remaining pages get built. The useful
part of this entry is not the list of what went, it is the list of what looked
dead and is not.

**Removed, verified dead:**

- `fivemile-civic-data.js`. Loaded by no page.
- `fivemile-community-snapshot.json`. Written twice a day, read only by the
  script above.
- `fivemile-app-icon.svg`. `manifest.json` points at `icons/*.png`.
- `qr-codes/cardiff-announce-qr.png` and `qr-codes/cardiff-homepage.png`. They
  encode the retired domain. Deleting the image does not affect any QR code
  already printed, which encodes a URL rather than pointing at this file.

`updateCommunitySnapshotFile()` is no longer called. Its Census endpoint returns
HTML instead of JSON and has been failing on every run. The function is left in
place, unwired, so the civic figures can come back without being rebuilt.

**Not removed, and here is why they look removable.** A basename grep says
nothing references these. A basename grep is wrong.

- **The 24 `guide_*_ee.webp` files, in `assets/webp/` and `assets/thumbs/`.**
  The guide builds these names at runtime:
  `buildGuideAssetPath(file.replace(/\.png$/i, '_ee.png'))`. Deleting them
  breaks the guide silently, because the failure is a broken image on one card
  rather than an error anybody sees. **Any future orphan sweep has to account
  for constructed filenames.**
- **`fivemile-home-gallery.json`.** Nothing fetched it when this was written,
  and it was not junk: it held the titles, captions, credits, and alt text for
  the three photographs carried over from the old Cardiff site. It was the seed
  for the Archive page. **Deleted since, with its template.** The Archive was
  built and the three pictures were not the right start for it. See decision 36.
- **`fivemile-alerts.js`.** Referenced only from `.github/workflows/`, which is
  easy to leave out of a search of the site's own files.
- **`fivemile-almanac.js`.** Superseded looking, because
  `fivemile-almanac-core.js` exists, but the almanac page loads both. The core
  file is shared by the five almanac-family pages and the other is the page's
  own module, the same shape as `fivemile-fishing.js`.
- **The `cardiff-*.html` stubs, `sw.js`, and `cardiff-sw.js`.** Protected by
  CLAUDE.md and unreferenced on purpose.
- **`google8fee6247b6a9aea0.html`.** Search Console verification.

**Still to decide:** `cardiff_report.pdf` and `docs/fivemile-rebrand-spec.docx`
are tracked, unreferenced, and therefore publicly downloadable from the live
site. Neither is linked from anywhere. Left in place pending Joe's call.

## The masthead is one variant now

It was three, and the differences were not deliberate:

- The four almanac desks wrote the creek emoji as `&#127754;` rather than the
  literal glyph. Same rendering, separate variant for nothing.
- **`fivemile-gallery.html` had a stripped masthead**: no watershed button, no
  creek reading, no mobile pill, and no `id="mhWordmark"`, which is the element
  `fivemile-intro.js` splits for the nameplate animation. It also never loaded
  `fivemile-brand.js`. That page had been quietly running a degraded shell.

All sixteen pages now carry byte identical masthead markup, ignoring the
`class="active"` that marks the current tab, and all sixteen load
`fivemile-brand.js`.

**The remaining duplication is CSS, and it is inert.** `fivemile-common.css`
already defines the entire masthead, and it does so with `!important` on every
declaration. That is not a style choice, it is armour against the nine pages
that redefine `.cardiff-masthead`, `.mh-identity`, `.mh-brand-name` and the rest
inside their own `<style>` block. Those per page rules are already losing every
contest they enter. Deleting them changes nothing visually and lets the
`!important` come off afterwards. That is worth doing as its own pass with its
own verification, not folded into a cleanup.

## The footer nav is the site map

It was a flat run of twelve links, then briefly a parent and child tree that
mirrored the masthead. Both were wrong for different reasons. The tree grouped
pages by where they sit in the top nav rather than by what a reader is looking
for, and with eight groups of uneven length it left half the grid empty and ran
to 334px of mostly whitespace.

It is now four named columns, grouped by what somebody is actually after:

| Column | Pages |
|---|---|
| News | News, Calendar, Announcements |
| Almanac | Almanac, Fishing, Garden, Night Sky, Nature Watch |
| The place | Field Guide, Heritage, Gallery, Archive |
| This site | Home, About |

Calendar sits with News rather than on its own because dates and what is
happening are the same errand. Add a page to the group it belongs in. A group
past about six items wants splitting rather than shrinking.

The column name is a `span` with the list pointing at it via `aria-labelledby`,
not a heading. Four `h2` elements in every page's footer would junk up the
heading outline on every page of the site, and the group name is still
announced.

**The rows are 44px on a phone and 25px from 700px up.** The tap target floor in
CLAUDE.md is about thumbs, so it applies where there are thumbs. This started as
a `pointer:fine` query, which reported inconsistently and silently kept the tall
rows, so it is a width breakpoint instead. Measured at 390px: two columns, no
row under 44px, and no horizontal overflow.

Announcements stays out of the masthead deliberately. It is reachable from the
footer and from a direct link, which is the whole point of it.

## Accessibility baseline

Measured rather than assumed. Every colour pair in the palette passes WCAG AA
for normal text:

| Pair | Ratio |
|---|---|
| ink on paper | 15.16 |
| ink2 on paper | 9.62 |
| ink3 on paper | 5.27 |
| red on paper | 4.84 |
| masthead text on masthead | 11.69 |

Body text is 17px against a 16px floor, tap targets are 44px, `lang="en"` is set
on every page, the footer marks the current page with `aria-current`, and the
intro animation honours `prefers-reduced-motion`.

**Three real gaps, none of them cosmetic:**

1. **No skip link on any page.** A keyboard or switch user tabs through the
   watershed button, the nameplate, five masthead tabs, and the creek link
   before reaching content, on every page, every time.
2. **No `<main>` landmark on fifteen of sixteen pages.** Only the calendar has
   one. Screen reader users navigate by landmark; without one there is nothing
   to jump to.
3. **`fivemile-calendar.html` and `fivemile-guide.html` have no `<h1>`.** The
   heading outline starts at `<h2>`, which breaks heading navigation and reads
   as a page with no title.

All three are shell level and should be fixed in the same pass that
de-duplicates the masthead CSS, since that pass is already touching every page's
head and opening body.

**Revisit if:** an orphan sweep is run again, in which case read the second list
in this entry first.

---

## 34. One masthead stylesheet, and the accessibility floor
**Decided:** August 2026

### The masthead CSS lived in eleven places

`fivemile-common.css` owned the masthead already. Nine pages redefined it inside
their own `<style>` block and `fivemile-almanac.css` carried a tenth copy. Those
duplicates are gone: 183 rules out of the pages, 17 out of the almanac
stylesheet. `fivemile-common.css` is now the only file that styles the masthead.

**This was verified rather than eyeballed.** Every masthead element on all
sixteen pages had its computed styles recorded before the change, through
iframes in a real browser: background, border, grid columns, font size, weight,
letter spacing, colour, padding, height. After the change the same capture ran
again. **Zero differences across sixteen pages.** Any future pass at this should
do the same thing, because the failure mode is a masthead that shifts by two
pixels on one page and nobody notices for a month.

### The `!important` stays, and it is not what it looks like

The obvious follow up was to strip `!important` off the masthead rules now that
nothing competes with them. That was tried and reverted, because it is not only
armour against the page level copies. It also beats the inline `background` that
the ticker script writes on `.announce-strip` when an alert has a severity
colour. Removing it turned the strip amber on every page carrying a live
advisory.

So there is a standing conflict worth knowing about: **the ticker script sets an
inline severity colour on the strip, and the stylesheet overrides it, so the
strip is always red.** CLAUDE.md says the strip is a solid red accent bar, which
means the CSS is expressing the intended rule and the severity colouring in the
script is vestigial. Left exactly as it was found. If the strip should ever
change colour by severity, the fix is to delete the colour from the script or to
change the rule deliberately, not to remove `!important` and let the two race.

### Accessibility floor

Three gaps closed across all sixteen pages.

**A skip link, first in the body and therefore the first tab stop.** Without it
a keyboard or switch user walked the watershed button, the nameplate, five
masthead tabs and the creek link before reaching content, on every page, every
time. Off screen until focused, then it lands at the top left over the masthead.
Measured at 159 by 49 pixels, which clears the 44px floor.

**A `main` landmark on every page**, carrying `id="main"` and `tabindex="-1"`.
The tabindex is the part that is easy to leave out and matters: without it,
activating the skip link scrolls the page but leaves focus at the top, so the
next Tab goes back into the masthead. Fourteen pages had their `div.wrap`
promoted to `main`, which is a tag change with no class change and therefore no
style change. The guide had no `.wrap` at all, so its `#scroll-area` became the
landmark.

**An `h1` on the two pages that had none.** The guide's title was a styled
`div`, now a heading with the same declarations, so nothing moved. The calendar
has no visible title in its design, so it got a visually hidden one rather than
inventing a heading the layout was not built for. If a visible calendar title is
ever wanted, remove the `visually-hidden` class.

Measured, on all sixteen: skip link is the first focusable element, its target is
`#main`, the landmark exists with the focus attribute, and there is exactly one
`h1`.

The palette was already fine. Every pair passes WCAG AA for normal text, ink on
paper at 15.16 and the weakest, red on paper, at 4.84.

**Note on verifying `:focus` locally.** `document.hasFocus()` is false when the
preview pane is not displayed, so `:focus` never matches and the skip link
appears not to work. It is working. Check by forcing the rule rather than by
trusting the computed style.


### Three things the verification sweep turned up

All pre-existing, none caused by the shell pass, all fixed:

- **The guide never had a footer.** `injectFooter()` appends to `.page`, and the
  guide is the one page with no `.page` wrapper, so it bailed silently. It now
  falls back to `document.body`. That matters more now that the footer is the
  site map, because the guide was otherwise a dead end.
- **All three Kitchen recipe photographs were broken.** `RECIPE_ASSETS` pointed
  at `assets/guide_*.png`; the files are `assets/webp/guide_*.webp`. An
  `onerror` handler swaps in an emoji, which is exactly why nobody noticed.
  Paths corrected.
- **`fivemile-fishing.html` still linked to the retired Get Involved page.** The
  sweep that rewired those links listed pages with `git ls-files`, and the four
  almanac desks are not committed yet, so they were invisible to it. **A
  repo-wide sweep has to include untracked files or it will miss the newest
  pages, which are exactly the ones most likely to be wrong.**

`cardiff_report.pdf` and `docs/fivemile-rebrand-spec.docx` were removed from the
working tree. They remain in git history, and the repository is public, so this
stops them being served from the site but does not make them unreachable to
somebody who clones. Taking them out of history is a rewrite and was not done.


**Revisit if:** a new page is added. It needs the skip link, the landmark with
its tabindex, one `h1`, and no masthead CSS of its own.

---

## 35. Politics runs when it lands here, and the About page stops listing coverage
**Decided:** August 2026

**The coverage inventory is off the About page.** It had a section for what we
run and a section for what we do not. Neither was earning its place. A reader
does not arrive at a community site wondering whether it carries basketball,
and a list of exclusions reads as defensive on a page whose job is to say what
the thing is for. What runs is now demonstrated by the news page rather than
declared on the About page.

The policy still exists. It lives in CLAUDE.md, where it is an instruction to
whoever is building, not a notice to the reader.

**Politics is no longer off.** The rule was written when this was a site about
one town with a dormant government, and it has been overtaken. Zoning, permits,
hearing dates, council votes, incorporation questions: those are the things that
change this watershed, and leaving them out was leaving out the news.

**The line is geography, not subject.** It runs if it changes Graysville,
Cardiff, or Brookside or the ground around them. National politics does not,
party politics does not, and there are no endorsements. Give the fact and the
date and let the reader decide, which is the house method and the reason this
can be done without the page taking a side.

**Nothing in the gatherer had to change, which is worth knowing.** `NEVER` in
`fetch-news.mjs` blocks sports, horoscopes, lottery, ad copy and county bid
notices. It never blocked politics. There has been a `Government` beat all along
matching city council, town council, county commission, mayor, ordinance,
zoning, budget, public hearing, election, ballot and incorporation, and it is in
`COUNTY_BEATS`, so those stories already qualified through the county ring. The
geographic filter that keeps this local is `OTHER_PLACES`, which is asked only
at the county stage, so a story naming one of our towns is already placed before
it is reached.

In other words the code was already doing what this decision describes, and the
only thing stopping political coverage was a sentence in CLAUDE.md and rule 5
in the voice skill. Both updated.

**Revisit if:** the news page starts reading as a zoning docket, in which case
the fix is freshness and volume limits per section rather than banning the beat
again.

---

## 36. The Archive is a hub with four rooms
**Decided:** August 2026

`fivemile-gallery.html` held four photographs and was named for the one thing
it did. Everything else the site keeps was already on disk and reachable by
nobody: 232 days of weather, a month of creek readings, and every story that
had ever run. Decision 23 said in as many words that a page listing the news
months was the one that actually delivers on "nothing scrolls away."

**Five pages, not one.** The first build put all four holdings on a single page
and it ran to twelve thousand pixels, which is a filing cabinet with every
drawer pulled out at once. `fivemile-archive.html` is now a hub and nothing
else: four panels, three readings and a line apiece, and a door.

| Page | Holds | Reads |
|---|---|---|
| `fivemile-archive.html` | the four doors | all four files |
| `fivemile-gallery.html` | every photograph that has run | `fivemile-home-anchor.json` |
| `fivemile-weather-archive.html` | every day the station reported | `fivemile-weather-archive.json` |
| `fivemile-creek-archive.html` | the creek, day by day | `fivemile-creek-archive.json` |
| `fivemile-news-archive.html` | every story, by month | `news-archive/` |

The three data rooms are named for the file they read, which is the whole
reason they are not `fivemile-weather.html` and friends: `fivemile-weather.json`
is current conditions and belongs to the almanac. A page named for the wrong
file is a trap for whoever greps next. The gallery keeps the name it has always
had.

**The hub is four `a.card-dept` panels, which is the almanac's own hub.** Same
construction, down to the count: four linked department panels, three rows in a
`.d-rows.list`, a `.d-tip` line, and a `.d-go`. That was not copied for the sake
of it. A reader who has used the almanac already knows what this page is.

Every figure on the hub is read off the file the room itself reads, so a number
out front cannot drift from the number inside. The `.r` tag in each panel's bar
names the source rather than repeating the count that is already in the rows.

**One script for all five, gated on the markup.** `fivemile-archive.js` is on
the same footing as `fivemile-almanac-core.js`: the rooms are the same three
moves over different numbers, and splitting them would mean keeping the reel
and the day table in step across four copies. Each loader returns immediately
unless it finds an element only its own page carries, so a room fetches its own
file and nothing else.

**Nothing here keeps a list of its own.** A photograph is archived by being
featured, a day by the station reporting it, a story by running. There is no
second list to fall out of step, which is the only way an archive stays true
without somebody minding it.

**The creek had no record at all, and now it does.** `stage_history` in
`fivemile-watershed.json` is a thirty day window that overwrites itself, so the
creek was the one thing on this site that did scroll away, quietly, the whole
time. `fivemile-creek-archive.json` is new and permanent: one row a day holding
the low, the high, the mean, and the mean flow, rolled up from the gauge's own
fifteen minute record inside `updateWatershedFile`. USGS answers every call with
thirty days, so the file filled a month on its first run and repairs whatever a
missed run leaves behind, the same way the weather archive heals off the station
history.

Two rules keep it honest. **Completed days only**, because today is still moving
and is already on the almanac from the live file, and because a row that changes
every ten minutes would put a fresh blob in git history 144 times a day for one
line. And **a day needs 48 of its 96 readings** to be written at all. The oldest
day in any thirty day window is cut off partway through and will never be
fetched again, so its low and high would be wrong forever; a gap is better than
a quiet lie about how low the creek got. A gauge that has died answers 200 with
a full series of zeros rather than an error, so a run that is all zeros is
dropped whole.

**`news-archive/index.json` is the shelf label.** GitHub Pages cannot list a
directory, so without it the page would have to guess at filenames. It is
written by `fetch-news.mjs` from the directory rather than from the months a run
touched, so a quiet month keeps its place in the list. Months load one at a
time; the first keystroke in the search box pulls the whole run down and
searches all of it.

**The reel is the one new control.** Three rooms hold a run of months and they
share it: mono, square cornered, 44px tall, pushed sideways. It had to resemble
neither of the two navigations already on the page, and it does not. The
masthead tabs are brown and all caps, the desk rail on the almanac is paper
cards with an accent bar, and this is a strip of small frames you wind past.
Each chip reports something under its own name rather than only naming a month:
a month of rain, an average stage, a count of stories.

**Short months in a label, whole months in a sentence.** A reel chip, a table
heading and the small mono count line under each room's opening paragraph are
labels and take Jan. A `.d-tip` on the hub is copy and takes January. Two
formatters, `monthLabel` and `monthProse`, and the rule for which is which is
whether the words would be read aloud.

**The three photographs from the old Cardiff site came out.** The 1951 aerial,
the historic marker, and the town hall were the seed `fivemile-home-gallery.json`
had been kept for. They also made the gallery read as Cardiff's archive rather
than as this publication's, which is the opposite of what the front of the site
says. The gallery now holds the four photographs FIVEMILE started with and grows
from there. `fivemile-home-gallery.json` and its template are deleted, which
retires the "not junk, it is the seed" note in decision 33. The three image
files are still in `photos/` and nothing references them; the 1951 aerial is
worth keeping for the heritage page whatever happens to the rest.

**The beat colors moved into `fivemile-cards.css`.** They lived in
`fivemile-news.css`, whose own header says to move a rule into the card file the
moment a second page needs it. Two pages render a story row now. Nothing changed
visually: the news page loads the card file first, so the same declarations
apply from the same place at the same specificity.

**The two charts are the almanac's chart, not a new idea.** Inline SVG built
from the numbers already on the page, no library, a mono label at each end, and
nothing to poke at, because a chart you have to touch is worse than a table on a
phone and the table is directly underneath it. Rain is columns standing on the
days it fell. The creek is a line with the day's low to high shaded behind it,
which is the part a daily mean hides: a month that averaged a foot and a half
still had an afternoon at three and a half.

**Revisit if:** the weather room gets slow. It reads all 232 days at once to
build the records board, which is fine at one year and worth watching at five.
The fix is a records file written by the same job that writes the archive, not
pagination.

---

## 37. Heritage is a hub and seven chapter pages
**Decided:** August 2026

Heritage was one page. It opened with the three towns, then a contents list,
then seven chapters stacked into the same scroll, each one carrying every
dated entry that fell inside its years. Fifty three entries, all of them
showing, before a reader had decided whether they cared. At the foot of each
chapter was a prev and next link.

**Those two links are what made the whole thing feel wrong.** A page turn
promises a page. These delivered an anchor sixty lines further down the
document you were already in, so the reader got the motion of navigation with
none of the arrival. It is the kind of thing that reads as broken without
anybody being able to say what broke.

**So the turns got what they were promising.** Heritage is a family now, on
the same pattern as the almanac: `fivemile-heritage.html` is the hub,
`fivemile-heritage-<id>.html` are the seven chapters, and they share
`fivemile-heritage.css` and `fivemile-heritage-core.js`. A chapter has its own
URL, its own title, its own description, and its own share image, so a chapter
can be sent to somebody on its own, which is the thing a single scroll could
never do.

**The hub carries no dated entries at all.** Each chapter gets a photograph,
one big figure, a few sentences, and a door. That is enough to decide on, and
deciding is the only job a front page has. The count of entries is printed on
the way in, because a chapter with three and a chapter with eleven should not
look identical from outside, and that count is the one thing the old contents
list was carrying that was worth keeping.

**Nothing about a chapter is written into its HTML.** The span, the title, the
opening, the plates, the timeline and both turns all come out of
`fivemile-heritage.json` against a single `data-chapter` attribute. Moving a
chapter boundary or adding a fact re-files itself across all eight pages
without anybody editing eight files. The one thing each page keeps for itself
is its head, because the reader who needs the title and the share image is a
link preview and it never runs the script.

**A hub row is a div, not an anchor, and this is not a style preference.** A
plate carries a credit and a credit is a link. Wrapping the row in an `<a>`
puts an anchor inside an anchor, which the parser repairs by tearing the outer
one open: it turned seven rows into nineteen, live. The title holds the only
real link and stretches a transparent overlay across the row, and the credit is
lifted above that overlay so it stays clickable. If a future row grows a second
link, it needs the same treatment.

**The three town columns inside a chapter went away first**, before any of the
above, and for a separate reason. Three columns is a filing cabinet, and the
point of putting these towns on one page is that they happened to each other,
which you read down a chronology and lose in a grid. Each chapter is now one
list in date order, with a town badge answering where and a tag answering what,
and the tag's color running down the row's left edge the way a beat runs down a
news row. What the columns did well was show a thin record: an empty column
said so at a glance. A list cannot, so a chapter says it in a sentence instead.

**Revisit if:** the chapter count moves much past seven. Eight pages is
already at the edge of what is reasonable to keep in sync by hand, and the
masthead is duplicated across every one of them, which is a debt the whole
site carries and this made slightly worse.

---

## 38. The nav is seven items, and Hills and Hollers is shelved
**Decided:** August 2026

The masthead nav was News, Almanac, Calendar, Guide, Heritage. It is now Home,
News, Calendar, Almanac, Field Guide, Heritage, About.

**Home is in the bar even though the wordmark already goes home.** The
nameplate has been the link home since the site had a nameplate, and a lot of
readers know that. A lot do not, and on this site the nameplate now does
something else on the homepage anyway. A tab that says Home costs one slot and
removes the only piece of navigation on the site you had to already know
about.

**Calendar moved ahead of Almanac** because they were in the wrong order for
what people come for. What is happening this week beats what the sky is doing
this week, and Calendar and News are the same errand, which is why they sit
together in the footer already.

**Guide became Field Guide,** which is what the page has been called
everywhere else on the site, including in the footer site map, since it was
written. The nav was the last place still calling it something shorter.

**About is in the bar now.** It was reachable from the footer only. About is
the page that answers who is doing this and why, which on a publication nobody
has heard of yet is not a footer question. See DECISIONS.md 32 for what About
replaced.

**Seven items do not fit 390px, so the strip scrolls.** Five did, which is why
the mobile rule used to divide the width evenly between them with `flex:1 1 0`
and no scrolling at all. The row measures about 440px now. Shrinking to fit
was the alternative and it was the wrong trade: it means 12px labels or
clipped ones, and CLAUDE.md sets the type floor where it does because the
readers here skew older. A strip that scrolls is a strip that scrolls. A nav
nobody can read is broken.

Measured at 375px, on all twenty seven pages: the strip is 509px, every tab is
46px tall, the narrowest is News at 57px wide, and the page itself does not
overflow horizontally.

Two things make the scroll legible rather than a trap. Whichever tab the right
edge lands on is cut through rather than ending flush, which is the thing that
tells a thumb there is more. And `centerActiveTab()` scrolls the current
page's tab into the middle on load and on resize, so a reader who lands on
Heritage sees Almanac and About either side of it.

**What this costs, stated plainly:** on the homepage the active tab is Home,
the strip sits at scrollLeft 0, and About is off the right edge until somebody
scrolls. That is the price of the seventh item and it is a real one. The fix,
if it turns out to matter, is to let the strip wrap to two rows on a phone.
That was not done now because it makes the masthead twice as tall on the
primary target for the sake of one tab, and because the masthead's height is a
number the announcement strip and the intro were both tuned around. Shrinking
the type to fit is not on the table.

**The centring is auto margins on the end tabs, not `justify-content`, and
that is a correctness fix rather than a preference.** A centred flex row that
overflows its scroll container overflows it at *both* ends, and `scrollLeft`
cannot go below zero, so the leading overflow is unreachable. With
`justify-content:center` still on it, Home would have sat off the left edge of
a phone with no way to scroll back to it. Auto margins centre the same way
when there is free space and resolve to zero when there is not.

**The Heritage tab's id was `tab-cemetery`.** It predated Heritage being
Heritage. Nothing keyed on it, so it is `tab-heritage` now. This is not a
counterexample to DECISIONS.md 10: that decision is about the `cardiff-`
prefixed class names and data ids, which stay.

### Hills and Hollers is shelved, not deleted

It is out of the footer site map, out of the sitemap, and out of the service
worker precache list. `fivemile-hollers.html` is still in the repo and still
works, and it carries `robots: noindex,follow` so a crawler does not find it
on its own and drop a reader onto a page with no way back into the site.

The reason is not that it is bad. It is that it is the only part of the site
whose value depends entirely on whether people post, and there is no way to
know that before launch. Everything else here works with an audience of one:
the weather log is still a weather log if nobody reads it. A classifieds board
with nothing on it is just an empty room, and an empty room on a new site is a
worse first impression than no room at all.

`cardiff-hollers.html` stays where it is, as a stub with its meta refresh,
under the rule in CLAUDE.md. It now points at an unlinked page, which is
correct: anyone arriving on the old URL still lands somewhere real.

**To bring it back:** put it back in `FOOTER_NAV` under This site, add its
`<url>` to `sitemap.xml`, add `/fivemile-hollers.html` to `PRECACHE_URLS`,
take the `robots` line out of its head, and bump `CACHE_NAME`. Not in the
masthead nav, which is full.

**Revisit if:** the site gets enough traffic that people are already sending
in notices without being asked. That is the signal. Launching it and waiting
is not.

---

## 39. The field guide gets real photographs, and the drawn art goes
**Decided:** August 2026

The guide was the last page on the site still holding its own copy of the
design tokens, and the last one still showing pictures that were generated
rather than taken. Both are fixed in the same pass, because they were the same
problem: the guide was built before the rest of the site knew what it was.

### The photographs

Every species photograph now comes from **iNaturalist**, filtered to research
grade observations whose pictures are released under **CC0, CC BY, or CC BY-SA**.
Two hundred and ten photographs across seventy species, three each, and a
hundred and fifty-four of them were taken in Alabama.

**Alabama first is the whole point.** A field guide for three towns on Five
Mile Creek should show the animal as it looks here. The query asks for Alabama
observations and only widens to the rest of the country when a species has too
few, and the widening is recorded rather than hidden, so a thin species is
visible as a thin species instead of quietly looking like the others.

**CC BY-NC was on the table and was not taken.** It would have deepened the
pool considerably, and the site is non-commercial, so it would have been
defensible. It was refused because a licence that depends on the site staying
non-commercial is a licence somebody has to re-clear before the guide can ever
be printed, put on a sign, or handed to a school. The three free licences never
need re-clearing.

**Every photograph carries a name on the page.** Two of the three licences
require attribution and CC0 does not, and the page does not distinguish between
them: photographer, place, date, licence, and a link back to the observation,
on every entry. Doing it only where it is compulsory would mean the credit line
is a legal notice. Doing it everywhere means it is a byline.

**Three per species, and the grid rotates them by day of the year.** So the
page is not the same page every visit, so a photograph that fails to load has
two behind it, and so a reader who cannot tell from one picture has a second
and a third in the sheet. Nothing is stored to do this: the day of the year
picks the photograph, which means everybody looking on the same day sees the
same one.

**Two entries could not be answered by iNaturalist and were handled openly.**
Shed antlers are an object rather than an organism, so both photographs come
from Wikimedia Commons, named as specific files rather than pulled from a
search that can change under us. Wildflowers is a category rather than a
species, so it borrows the guide's own photographs of black-eyed Susan,
ironweed, goldenrod, and passion flower, each still carrying its own credit.
Neither one gets a picture that pretends to be something it is not.

**The mammals needed a second pass, and the reason is worth writing down.**
Research grade and freely licensed, sorted by votes, a white-tailed deer comes
back as roadkill, a skull, and a trail camera frame, because that is what
people stop and record. Nine species were re-pulled using iNaturalist's
"alive" annotation, which is optional and therefore a much smaller and much
better pool. **If a future pull looks wrong, check the mammals first.**

**`assets/` is gone,** all eighty-seven drawn files. `fivemile-kitchen.html`
was the only other page using them and now points at the guide's photographs of
pokeweed, bluegill, and grey squirrel, with a credit line under the picture
that it did not have before. The guide-art half of `generate-assets.js` went
with the art it processed.

**Two scripts, and the picks file is committed on purpose.**
`scripts/fetch-guide-photos.mjs` gathers candidates into `_src/`, which is
outside git. `scripts/build-guide-photos.mjs` turns the chosen ones into the
served WebP and writes the credits into `fivemile-guide.json`.
`scripts/guide-photo-picks.json` sits between them and records which of six
candidates was chosen and what the alt text is. That is a judgement somebody
made looking at contact sheets and it is not recoverable from anything else in
the repo, so it is version controlled like source.

### The page

**The data came out of the HTML.** Seventy species, previously two thousand
lines of object literals inside `fivemile-guide.html`, now
`fivemile-guide.json`, read by `fivemile-guide.js`. Same shape as
`fivemile-heritage.json`. Six pollution entries that were filtered out at
runtime by a hidden-id list were deleted rather than carried.

**A hundred and sixty-eight em dashes came out of the copy.** They were in
almost every field note. This is a hard rule in CLAUDE.md and the guide had
never been held to it.

**The front door changed.** The old page opened on a welcome screen that asked
you to choose a biome or browse. The guide now opens on the search box and the
grid, because the commonest arrival is somebody standing outside with a phone
looking at something they cannot name. Biomes became a filter row and a section
of panels further down. The quiz survives, entered from a card, because it was
the one part of the old build doing something a list cannot do.

**A species is a URL.** Opening one pushes a history entry, so the phone's back
gesture closes the sheet instead of leaving the page, and `#cottonmouth` can be
sent to somebody.

**`.card-species` is a new card and it is restricted to this page.** The
precedent is `.card-plat`, which heritage owns for its own reasons. The
argument is in `fivemile-guide.css` above the class: a field guide entry is a
photograph with a name under it, no card in the system is that, and the
postcard is wrong here because 16:9 cuts the top off a standing heron and
spends a hundred and sixteen pixels per card on a credit block. `.card-check`,
the brass check, is used in the sheet for exactly what the spec sheet drew it
for, which was a spotted bass and a great blue heron.

**The grid crops to 4:3 and the sheet does not.** A grid has to line up. A
guide that crops a snake is not a guide.

### The shell is now duplicated three times

**Corrected by decision 40. It was six, not three, and the destination named
here was wrong.** The count above missed `fivemile-heritage.css` and the inline
`<style>` blocks in `index.html` and `fivemile-news.html`, and moving the shell
into `fivemile-common.css` would have broken six pages that carry a different
measure. The shell is now in `fivemile-shell.css`. See decision 40.

---

## 40. The page shell is its own file, and it is not common.css
**Decided:** August 2026

Decision 39 closed by saying the shell existed in three copies and should move
into `fivemile-common.css`, repeating a note that had been sitting at the top of
`fivemile-archive.css` since the archive was built. Both halves were wrong, and
finding out why is most of what this entry is for.

### It was six copies, not three

`.wrap`, `section.blk`, the equal grids, `.empty`, `.lede`, `.page`, and the
`html`/`body`/`*` reset were duplicated in:

`fivemile-almanac.css`, `fivemile-archive.css`, `fivemile-heritage.css`,
`fivemile-guide.css`, and the inline `<style>` blocks in `index.html` and
`fivemile-news.html`.

The two inline copies are the ones the earlier counts missed, and they are the
ones that matter most, because they are the homepage and the news page.

### common.css was the wrong destination, and it would have failed quietly

**On every page that keeps its styles in an inline `<style>` block, that block
comes before the `<link>` to `fivemile-common.css`.** index.html has its style
at line 73 and the link at 174. Kitchen: 38 and 124. Calendar: 41 and 172. Same
shape on About, Announce, Civic, Hollers, and the news page.

`.wrap` is a single class selector on both sides, so a `.wrap` in common.css
beats the page's own. Six pages carry a measure that is not 1000px and every
one of them would have been silently retitled:

| Page | Measure |
|---|---|
| About | 680px |
| Announce | 760px |
| Hollers | 860px |
| Calendar | 1100px, until decision 41 |
| Civic | 1100px |
| Kitchen | 1120px |

None of those is an accident. About is a reading column. Calendar and Civic are
tables that need the room. Kitchen is the widest thing on the site because a
recipe is two columns side by side.

**The calendar stopped being a table.** Decision 41 rebuilt it on the card
system, where every row is a full width event stub, and it now loads this file
and takes the 1000px measure. It asked for the file by name, which is the only
way a page is supposed to get it. Five pages are left in the table above and
they still must not have it. **The lesson is the one that keeps coming
up in this repo: a shared file at the bottom of the load order is not a safe
place to put anything a page might reasonably disagree with.**

### So: fivemile-shell.css, loaded by the pages that share the shell

Twenty-one of them. The homepage, the news page, the field guide, the almanac
and its four desks, the archive and its four rooms, and heritage with its seven
chapters. Load order is common, cards, shell, then the page's own file, so the
page file still wins and the almanac keeps `.two-wide`, the guide keeps its
species grid, and heritage keeps a 16px empty state.

The six pages above do not load it and must not. If one of them ever wants the
1000px measure it gets the file explicitly. It never gets it by default.

Nothing about anyone's load order had to change, which is the other reason this
beat putting it in common.css. Moving eight `<style>` blocks after their
`<link>` would have flipped the cascade for every other rule those pages and
common.css both touch, on eight working pages, to fix one.

### What was reconciled, and what was left alone

**Reconciled, no visible change.** The reset, the measure, the 34px section
rhythm, the four grids, `.rows`, `.empty`, and `.lede` were identical or
identical in value across every copy. `.empty` differed only in heritage, at
16px, which stays as a one line override there.

**The top gap was left split, deliberately.** The seven pages in the almanac
group leave `.wrap` flush and put the gap on `section.top`. The archive group,
the guide, and heritage put it on `.wrap` instead. The two roads arrive two
pixels apart, 24px against 26px, which is precisely why nobody noticed them
diverging. The shell carries the flush version because it is the majority, and
three files add one `padding-top` line each. **Unifying it is right and it is
not a refactor**, it is a rendering change on thirteen pages to save six lines,
and it should be looked at rather than shipped inside a move.

**Three rules did not move at all**, because the copies disagree about more
than whitespace:

- **`.src-note`.** The almanac sets 22px and 11.5px, the archive and the guide
  set 34px and 12.5px, and heritage is not the same object: it is a boxed panel
  on card stock. Recommend unifying on the archive pair, which is the newer and
  more readable one, and accepting that it changes five almanac pages.
- **`.send`.** The almanac gives `.send .btn` five more declarations than the
  homepage and the news page do.
- **`.desk-intro`.** The almanac's name for `.lede`, at 1.6 line height and a
  16px bottom margin against 1.62 and 18px. The same object under two names,
  two hairs apart.

**Dead code went with it.** `.four-eq` in `fivemile-archive.css` was styled and
had a breakpoint and is used by no archive page. `.four-eq` is an almanac
family class and nothing else.

### The two things that did change, and both are corrections

**The field guide now breaks where the rest of the site breaks.** It had
`.two-eq` holding two columns down to 760px, where every other page collapses
at 820, and a bespoke rule putting `.three-eq` into two columns below 900,
where the site goes from three straight to one. Between 760 and 900 pixels the
guide was the only page on the site keeping a two column card row. It now
follows the shell.

**The five archive pages gained the paper grain.** `fivemile-archive.css` never
had the `body::after` noise texture that every other page carries. That was an
oversight rather than a decision, and picking up the shell picked it up too.
They also gain the `#topo-canvas` rule, which is inert there because no archive
page has the canvas element.

### How this was verified

Every page was measured in an iframe at 390, 600, 800, 900, and 1280 pixels,
before and after: the computed `.wrap` box, `section.blk`, `section.top`,
`.lede`, `.empty`, `.src-note`, `.page`, `body`, every grid's
`grid-template-columns`, `documentElement.scrollWidth`, and the height of the
announcement strip.

Twenty-seven pages at two widths and twenty-one pages at three more. Two
differences, both on the field guide, both listed above. Everything else is
byte-identical, including all six pages that must not load the shell.

**Any future change to this file should be verified the same way.** The iframe
harness is the cheap part; the expensive part is knowing which numbers you were
supposed to keep.

---

## 41. The calendar is stubs and months, and it gave up its own measure
**Decided:** August 2026

The calendar was the last page still built the way the old site built pages:
its own 200 line `<style>` block, its own card shapes, its own type scale, its
own accordion, and a row of pills across the top. It worked. It did not look
like the rest of the site, and Joe said so.

### What it is now

Four stylesheets in the usual load order, common, cards, shell, then
`fivemile-calendar.css`, and no inline `<style>` block at all. Every card on the
page comes from `fivemile-cards.css`:

- **A date is an event stub.** The card spec wrote `.card-stub` for exactly
  this and says so: the date gets the weight, because that is what people scan a
  calendar for, and the color is carried by the badges so a list of twelve does
  not turn into a quilt.
The turnings do not appear on the page at all, which is the change after this
one.

### The Standing dates block came out again

The first pass carried a Standing dates section under Next up: index tabs, one
per council, one for the siren test, one for the market, each a small lookup
saying when that thing meets. Joe cut it the first time he saw it, and he was
right.

Every card in it appeared again as a row a few hundred pixels below, in the
month it falls in, carrying the same sentence. One card per purpose, and the
month lists are the purpose. A lookup earns its place when the thing it looks up
is not already on the page. These were on the page twice.

What the tabs carried that a dated row does not is the shape of the rule, First
Monday rather than Sep 14. That belongs in the sentence on the row, and it is
there: every recurring entry's summary says how often it meets before it says
anything else.

**The measure went from 1100px to 1000px.** Decision 40 lists the calendar's
1100px as deliberate, on the grounds that it was a table that needed the room.
It is not a table any more, it is a run of full width stubs, and the card system
is drawn to the 1000px measure. So the calendar takes `fivemile-shell.css`
explicitly, exactly the way decision 40 said a page should get it: on purpose,
never by default. Five pages still do not load the shell and still must not.

**The emoji came off the rows.** The old page ran a ninety line keyword table
that put a picture on every entry. Ninety colored marks down a page is the quilt
the card spec is written against. The month rail keeps its month emoji and the
turnings keep theirs, which is where the character was doing work.

### The turnings are a filing system, not a season

`turnings.json` files its seventy two entries under eight named turnings:
Candlemas, Quickening, Beltane, Midsummer, Lammas, Michaelmas, Hallowtide,
Yuletide. The first pass surfaced all eight, as a name in every month head
(**September** · *Lammas* · 11 dates) and as a row of tab cards at the foot of
the page explaining what each one was.

Joe cut both. The reason is worth writing down because the content looked good
and was still wrong: **those are our names for the year, not the reader's.**
Candlemas is a real day, Lammas is a real day, Michaelmas is a real day, and
people here keep some of them. Hallowtide as the name of the stretch from
November to December is a frame this site put on the calendar, and a month head
reading Hallowtide tells a reader in Graysville that the site has opinions about
what November is called.

**The days stay, every one of them.** Candlemas is still February 2, Lammas is
still August 1, Michaelmas is still September 29, Yule is still on the solstice,
and each carries its own sentence saying what it is. What went is the framing
layer above them. A month is a month.

The eight groupings stay in the file, because they are how the entries are
organised and they cost nothing. Their `explainer` text is not rendered
anywhere now. That is dead data, kept deliberately: it is good writing, and if
those explanations ever earn a page it should be one about the old calendar,
not the month heads of this one.

### January of this year through twelve months forward

The old page rendered January to December of the current year, which meant a
reader opening it in December saw a year that was nearly over. The rebuild
rolled it: twelve months forward from this one.

**That was half right and it lost the year behind you.** A calendar that drops a
month the moment it ends is a rolling window that overwrites itself, which is
the exact shape CLAUDE.md says to fix rather than ship. It surfaced the first
time Joe sent in an event that had already happened: the Brookside duck race in
June, worth having on the record even though it is past. There was nowhere for
it to go.

So the window opens on 1 January of the current year and runs twelve months
forward from the current month. Nineteen months in August, twelve in January.
Past months are shut, their rail chips are dimmed rather than removed, and they
still carry their counts, so the year reads as a year with a position in it.

Twelve months of dates fully expanded is about twenty seven thousand pixels on a
phone. That is not a long page, it is a page people give up on. So a month is a
`<details>`: this month and next are open, the other ten are shut, and the head
of a shut month still carries the month, the turning it sits in, and how many
dates are in it. The page comes to about eleven thousand pixels, and the whole
year is still visible as a year.

**The rail opens what it jumps to.** Each chip is a real anchor and works with
no JavaScript, and a chip carries the count of dates in its month. That is
decision 28's lesson: a chip with a month name and nothing else reads as a
heading rather than as something that goes anywhere, which is how the almanac's
first pass failed in front of a reader. The count makes it report something.

### Seven subjects, and the calendar sets its own accents

Civic, Garden, Season, Tradition, Sky, Market, Community. Decision 25 allows a page with
its own set of subjects to set `--accent` from its own stylesheet, the way the
news beats already do, and a `.tag` reading Calendar on every row of the
calendar page would answer a question nobody asked. Civic and Garden borrow the
government and garden colors they already have elsewhere, so nobody has to learn
the palette twice.

**Civic and Community are separate lanes and that matters past the color.** A
council meeting and a duck race are both worth turning up to and they are not
the same errand. The homepage used to take the next three civic dates and
nothing else, which made the front page a page about local government. It takes
both lanes now. The weekly market is in neither, for the reason above: it would
win every slot every Thursday.

### The recurrence rules live in one file

The calendar used to work out for itself when a monthly meeting falls, which
meant `fivemile-calendar.js` and `fivemile-season-data.js` both held the rule
and only one of them could know about the holiday shift. `getEntriesForMonth`
is in the season data file now and the calendar asks it a month at a time.

**Graysville meets twice a month**, first and third Thursday at six at
Graysville City Hall, so `nth` is read as a list and a plain number is a list of
one. Nothing else about the recurrence had to change.

**Brookside meets on the first Monday unless that Monday is a holiday**, and
then it moves to the second. That is a rule, not a list of exceptions, so it is
written as one: `holidayShift` on the entry, and a `mondayHoliday` check that
knows Labor Day is always the first Monday of September, and that a Fourth of
July or a New Year's Day landing on a Sunday is kept on the Monday after. The
occurrence carries a note saying why it moved and the stub prints it. Nobody has
to remember to extend a list every year.

**The market is weekly and it is not in the civic lane.** The homepage takes the
next three civic dates and nothing else. A market that comes round every Thursday
would win all three and push the council meetings off the front page. It shows
on the calendar as one standing row a month rather than four rows of the same
sentence, and on the news page, which takes anything inside ten days regardless
of lane, it earns its row like anything else happening this week.

### The reminders knew about one council out of three

`fivemile-alerts.js` keeps its own copy of the civic list, because it runs in CI
and reads no browser file, and its own header says to add new events to it
whenever the season data changes. Nobody had. That is a bad shape for the one
file whose whole job is telling somebody a meeting is tomorrow. All three
councils are in it now, with the holiday shift and the nth list mirrored.

**Two copies of a recurrence rule is one too many** and this entry will not
pretend otherwise. The honest fix is for the script to read
`fivemile-season-data.js` rather than restate it, which is a short eval with a
stubbed `window`. The reason it is not done here is that a failure inside that
eval is a silent end to every reminder the site sends. Worth doing deliberately,
with a fallback, and not inside a page rebuild.

**And it was dropping one reminder a year.** `getTomorrowLocal` worked tomorrow
out by adding twenty four hours to the current time. Two days a year are not
twenty four hours long, and on the November one that lands back on today, so a
run in the small hours of the first Sunday in November got the wrong date. In
2026 that is the day before the Brookside meeting. Later runs caught it, because
the script goes every ten minutes, but a meeting reminder that depends on which
run catches it is not a reminder. It steps one day forward on the Chicago
calendar now.

### What is on it that was not

The garden dates, which existed on the site only as prose on the garden desk:
turning the beds when the soil crumbles, Good Friday planting, pumpkins in
around the Fourth for Halloween, the fall garden in September, the spent beds
turned under after the first frost. Both Alabama sales tax holidays, written as
the rules the state sets them by rather than as a list of years. The Graysville
and Brookside council meetings, neither of which the site had anywhere. The
Gardendale market.

**Graysville and Brookside both came from Joe**, who is a source. The Brookside
time and place are his too, given the day after the first pass shipped without
them. Where the web could confirm something it was checked, and the two sales
tax holiday rules are the state's own.

**One thing is deliberately not written down**, with a NEEDS-CONFIRMATION
comment in `fivemile-season-data.js` where it would go: which months the market
runs. The aggregators disagree with each other and one of them prints a start
date that is not a Thursday. The calendar says Thursdays and stops there.

### Copy that had never been read

`turnings.json` carried an explainer for each of the eight turnings that the old
page never rendered. They are on the page now, which is how seven em dashes in
copy turned up in a file nobody had reread since it was written. Those are gone,
along with a dozen blurbs that only restated the date the stub already carries.

**Revisit if:** the card system's 13.5px blurb turns out to be too small for
this page specifically. Every other page uses a stub blurb as a secondary line
under a headline. On the calendar it is the line that explains what Michaelmas
is, and it is the reason a reader is here.

---

## 42. Cardiff is one of the three towns, not the name of the place
**Decided:** August 2026

The site was renamed to FIVEMILE and the files were renamed with it, and the
copy underneath was left alone. So the words kept saying what the old site said.
The red strip on every page defaulted to "Cardiff news desk". The field guide
told a reader that white-tailed deer are the most visible large mammal in
Cardiff, that Cardiff sits in Brood XIX territory, and that Cardiff's fields
host the wildflowers. The almanac reported that yesterday around Cardiff the
temperature ranged, and that lightning risk should be treated as real around
Cardiff. The announcements page had a kicker reading "Cardiff, Alabama".

None of that is a rename bug of the kind decision 10 is about. Those are
sentences, and every one of them told a reader in Graysville or Brookside that
this site is about somewhere else.

### The rule

**Cardiff appears when Cardiff is what is meant.** The council, the charter,
the 1919 fire, the marker with the four family names on it, the weather station
that is physically in Cardiff and is cited as its source. All correct, all left
alone, and CLAUDE.md already said so.

**Cardiff never stands in for the watershed.** Where it was doing that it is now
one of: these three towns, along the creek, here, or this part of Jefferson
County, whichever the sentence wanted. Two dozen strings across the field guide,
the almanac, the ticker defaults in three files, the season data, the alert
script, and two page kickers.

### What it cost to notice

The slant survived the rename because a rename pass greps for filenames. Nobody
greps for a town name that is supposed to be there, which is exactly why this
one lasted: `grep Cardiff` returns hundreds of correct hits and a couple of
dozen wrong ones, and the wrong ones are only visible if you read the sentence.

**The test for a new sentence:** if it names one town, would a reader in the
other two nod or feel talked past? A gauge reading, a council meeting, and a
town's own history name their town. Everything else names the creek, the three
towns, or here.

### Two things that go with it

**Brookside's food festival is on the calendar.** St. Nicholas has put on the
Russian and Slavic food festival the first Saturday and Sunday of November for
years, at the parish hall on Pastor Street, and the parish, founded in 1894, is
the oldest Orthodox church in Alabama. It was in `fivemile-heritage.json` the
whole time as a line of history and was not on any calendar. It is the first
entry on this site for a recurring event that belongs to a town other than
Cardiff, and the fact that it took this long to add is the same finding as the
rest of this entry.

**Graysville still has nothing but its council meeting.** That is a gap, not a
decision. The Mayberry and Graysville Squad Car Nationals is the obvious
candidate and the only date that could be confirmed for it is July 5, 2025, so
it is not written down. Ask Joe.

---

## 43. The season data is a data file, whatever its extension says
**Decided:** August 2026

The calendar rebuild shipped and Joe opened it and the Brookside meetings were
not on it. What was on it was Labor Day, carrying a note saying the Brookside
meeting moves off that Monday to the one after. A calendar referring to a
meeting it does not list.

Nothing was wrong with the calendar. The service worker routes by file
extension:

- `.json` is **network-first**. Data changes, and a reader should get the
  current copy.
- `.css` and `.js` are **cache-first**. Code and styles change on a deploy, and
  a bumped `CACHE_NAME` is what evicts them.

The calendar reads two files. `turnings.json` is data and is called data, so it
came down fresh. `fivemile-season-data.js` is data with a `.js` on the end, so
it came out of the cache, and the cached copy predated Graysville and Brookside
existing. The page then drew a fresh half and a stale half and stitched them
together into a calendar that was internally inconsistent rather than merely
out of date. **That is worse than stale.** A page a week behind is obviously a
page a week behind. A page that names a meeting in one row and omits it from
another looks like a bug in the site's facts.

### The fix and the rule

`fivemile-season-data.js` is in a `DATA_SCRIPTS` list in the fetch handler and
is served network-first alongside the JSON. The extension rules still cover
everything else, because everything else genuinely is code.

**The rule is about what a file holds, not what it is called.** If a file
carries dates, readings, or anything a scheduled job or a person edits between
deploys, it is data and it goes in that list, whatever suffix it has. If it
carries behavior, it is code and the cache bump is what moves it.

**The deeper point is that the two halves of one page's data must travel
together.** Splitting a calendar across a network-first file and a cache-first
file was safe only for as long as nobody added an entry to one of them.

### Why the cache bump was not enough on its own

`CACHE_NAME` went to v28 in the same pass and `activate` calls `clients.claim()`,
so a returning reader is fixed on their next load either way. That is the
recovery, and it is not the fix: it depends on somebody remembering to bump the
constant every time a council date changes, and council dates change on their
own schedule and not on the site's. Network-first means the next load is
current whether anyone bumped anything or not.

**Revisit if:** a second data file grows a code extension. The list is a list
because there will probably be a second one.

---

## 44. One reader for the forecast file, in common.js
**Decided:** August 2026

`fivemile-weather.json` is read by three pages: the daily read on the
homepage, the morning report on the news page, and the week ahead on the
almanac. Each of them had grown its own copy of how to read it, and the copies
had stopped agreeing.

Three sky-word tables. The homepage and the news page shared seven marks. The
almanac had its own nine, so a run of thunderstorms was one character on the
homepage and a different one on the almanac, and "Cardiff, mostly sunny" in
the watershed card came off a fourth table again, the one that reads
Open-Meteo's numbered codes.

Two ideas of what a day is called. The homepage and the news page build the
label off `startTime`, because a file that has not refreshed still carries the
name the weather service shipped with it. The almanac printed `period.name`
straight out of the file.

One page that never dropped a period that had been and gone. The homepage and
the news page both filter on `endTime`. The almanac took the first six daylight
periods off the top of the file whatever their dates were, so an evening reader
got yesterday in the first cell.

**What there is instead:** `window.FivemileWx` in `fivemile-common.js`, which
every page already loads. It holds the seven marks and the two ways into them
(a weather service sentence, an Open-Meteo code), `live()` for dropping what
has finished, `label()` for naming a period off the clock in either the
three-letter or the day-and-night style, and `days()` for folding periods into
one entry per day with the high off the daylight half and the low off the night
that follows it.

The pages keep their own cards, their own markup, and their own copy. What they
share is the reading of the file, which is the part that was never supposed to
differ.

**The forecast is sixteen periods now, not eight.** Eight periods is four days,
and the almanac's week grid is seven columns wide. It was being asked to show a
week it had never been sent. `detailedForecast` comes off on the way in: it is
the biggest field in the file by a distance, nothing on the site reads it, and
the file is rewritten and committed every ten minutes.

**Revisit if:** a fourth page starts reading the weather file and wants
something the module does not do. Add it to the module rather than to the page.

---

## 45. The creek chart measures its own box
**Decided:** August 2026

The stage chart was drawn into a fixed `viewBox` of 760 by 336 against a box
that is 928 by 270 on a laptop. `preserveAspectRatio` did exactly what it is
supposed to do with a mismatch that size: it scaled the whole drawing down to
fit the shorter side and centred it. The chart came out 545 pixels wide inside
a card 960 wide, with 383 pixels of nothing split either side of it, and the
axis figures scaled down with everything else.

The gutters made it worse. There were none: the plot ran to all four edges, so
the two stage figures sat on top of the line they measure and the top one was
clipped in half by the edge of the box.

**What happens instead:** `chartBox()` measures the element the chart is about
to be written into and sets the `viewBox` to it, so one unit is one pixel and
there is no scaling to letterbox. Height comes from the same 560px breakpoint
the stylesheet uses. The plot now sits inside real gutters: 68 left for the
feet, 34 bottom for the dates, and the axis type went from 11px to 12.5px
because it is no longer being shrunk on the way to the screen.

**Do not put a height on `.watershed-chart svg`.** A second opinion in CSS
about how tall the drawing is puts the letterboxing straight back. The
stylesheet says `height:auto` and the script says how tall the box is.

The chart redraws on resize, debounced, and only when the measured width has
actually changed. Nothing else on the page needs that.

**Revisit if:** the card ever holds two charts side by side, which would want
the measurement per chart rather than per card.

---

## 46. The About page gets mounted, and comes onto the shared shell
**Decided:** August 2026

About was the last page where the copy sat straight on the paper. Joe read it
and said the text felt like it was floating, which is the same complaint
heritage answered in decision 37 with the same word: a run of sentences on the
open background reads as a draft nobody finished.

**It got the panel that already existed.** `.panel` in fivemile-heritage.css,
the same values redeclared: card stock, a 1px `#DDCFB8` hairline, the site's
14px radius, 22px by 24px of padding. Nothing new was drawn for this. The head
block was mounted too, title and kicker above a hairline with the lede below,
which is how a heritage chapter opens. That head block is gone now, and the
paragraph below says why.

**The section heads stay off the panel.** That is heritage's rule and the
reason holds here: a `.hd` is a short label with an ink rule under it, which is
furniture rather than a body of text, and a box drawn around a label is a box
with a label in it.

**The heads are `.hd` now, out of fivemile-cards.css.** About had been carrying
a heading shape of its own, 1.22rem at weight 800 over a translucent rule,
which no other page used. It is now the 15px uppercase label over a 2px ink
rule that twenty two other pages use. About was one of five holdouts. It is
four now: announce, civic, hollers, kitchen, all of them the other pages with
their styles in an inline block.

**And then the head block went, which is the last of the same argument.** It
opened with a kicker reading ABOUT, over a title reading About FIVEMILE, over a
lede starting with FIVEMILE: the same two words three times inside the first
forty pixels of the page. Joe read it and said it looked weird. The kicker went
first and the title became About the site. That left a display heading at
2.6rem sitting above sections headed at 15px uppercase, on the one page whose
own sections had just been brought onto `.hd`, and the top of the page read as
a different page from the rest of it. So About opens the way the other twenty
two do: `.hd` with an h1 in it, a panel under it, and the lede is an ordinary
paragraph on that panel. `.about-head`, `.about-id`, `.about-kicker` and
`.about-lede` are all out of the block, and the 38px of top air went with them,
because `section.blk` already gives 34px like it does everywhere else.

**Then the measure went, because mounting the prose exposed it.** About had
been 680px, so its panels came out at 640px against the 960px a card runs on
every other page. Nothing had made that visible before: a column of loose
paragraphs has no edges to compare. Panels have edges, and Joe read one page
after another and said so. About is 1000px now, the same as the other twenty
two, and a panel on it is 960px like a card anywhere else.

**It got there by loading fivemile-shell.css,** which is the only way a page is
supposed to get that measure, and the note at the top of that file had already
written down how this would go: if one of the narrow pages ever wants 1000px,
it asks for the file by name. About had been first in that file's do-not-load
list. It is in the who-loads-this list now and the note says why.

**Which fixed About's load order as a side effect.** Its styles had sat in an
inline block ahead of common.css, which is the arrangement fivemile-shell.css
exists to work around. The block is a link after the other three now, so the
documented order finally describes this page too: common, cards, shell, then
the page's own. Everything the shell already carries came out of the block: the
reset, the grain, the topo canvas, `.page`, and the measure. The 34px section
rhythm is `section.blk` now rather than a rule of its own, so the sections are
`class="blk abt"` and `.abt` is only the prose scope.

**The prose runs the full panel and is not capped.** That is heritage's rule in
decision 37 and the reasoning carries: text stopping a hundred and forty pixels
short of a hairline reads as a box with a margin on one side. It does mean a
long line on a wide screen, about 107 characters, which is what a heritage
chapter has had since it shipped. If that reads long on this page in
particular, the answer is a decision about the prose measure across both, not
a cap on this one.

**The closing band is `.src-note` by another name.** The disclaimer was a rule
with type under it, which is exactly what heritage's closing band was before it
got mounted. Same treatment, same muted ink.

**The support block stopped being its own thing.** It had been the one element
on the page already on card stock, which is why it read as an interruption
rather than a section. Now that every section is on card stock it is just the
last one, an `.abt` like the others, and it keeps only the chips and the
buttons that are actually particular to it.

Making it an `.abt` had one cost, and it shipped broken for a round before Joe
spotted it. `.abt a` sets prose links red and bold, and it outweighs
`.support-btn-primary`, so the Venmo button came out red type on a red fill and
read as an empty block. The prose rule is `.abt a:not(.support-btn)` now. Any
button that ever goes inside an `.abt` needs the same carve out, which is why
the rule carries a comment saying so.

**This amends decision 32,** which said About carries no cards and no
infoboxes. That still holds in the sense it was written in: there are no data
widgets on this page and there is no live data on it at all, and that is the
part worth keeping. A mount under prose is not a card. Nothing on About counts,
sorts, or refreshes.

**Revisit if:** the 107 character line reads long to anybody who is not
looking for it, or the four remaining inline-style pages are brought onto
`.hd`, at which point the heading shape is site-wide and this note is just
history.

---

## 47. The daily read always holds something, and the creek is what it holds

The forecast strip on the homepage is fed by the weather service, and the card
around it was built as though that feed always arrives. It does not. A failed
run leaves yesterday's periods sitting in the file, every one of them already
finished, and the shared reader drops them rather than relabel a day that has
been and gone. That is the right call, and decision 44 is where it was made.

What it left behind was a card holding one paragraph over about a hundred and
fifty pixels of nothing, standing beside a Yesterday that filled its box to the
bottom. Joe saw it on the homepage and it is the reason this entry exists.

**The slot is always full.** Three days ahead when the weather service has
filed them. The creek's last thirty days, drawn, when it has not. One slot, one
position in the card, the same height either way, so nothing above or below it
moves between visits and neither card is ever the one with the hole in it.

**Why the creek and not more numbers.** Everything else the card could show is
already said within a hundred pixels of it. The stage is in the Right now tile,
the stage and the flow and the month's rain are all in the sentence directly
above, and the 24 hour change is in Yesterday alongside. Thirty days of gauge
history is the one thing on that part of the page that is not a repeat, and it
comes out of the watershed file, which is written by a different job on a
different schedule and does not go quiet when the weather service does.

**It is the third instance of a chart this site already draws,** after the
almanac's and the archive's: a viewBox, a polyline, no library. The creek green
moved to `fivemile-shell.css` when this landed, because the homepage and the
archive now draw the same creek and a colour written down twice is a colour
that drifts.

**Nothing is lettered inside the box.** Text in a viewBox scales with the box,
and this box is half a card wide, so a label set inside it came out under seven
pixels on a phone. The gauge, the range, and the dates are in the caption
underneath as ordinary text at the size a cell label uses.

**A missing reader lands in the same place.** `window.FivemileWx` loads at the
foot of the page and the card paints off a fetch, so on a warm cache the
readings can arrive first. That used to throw and take the whole card down. A
card with no reader has no days to show, which is the case the creek already
covers.

**Revisit if:** the weather service feed stops failing for long enough that
nobody has seen the creek in the slot, in which case this is doing nothing and
the strip can stand on its own again.

---

## 48. Every page opens on card stock, and .panel is one rule

Decision 46 put the About prose on card stock and left the question open of
whether that was about About or about the site. It was about the site. The
calendar opened with two paragraphs lying straight on the paper while every
card below them was mounted, and stopping 187 pixels short of those cards
because `.lede` carries a 64ch measure that a mounted paragraph should not.

Heritage had already solved it and written down exactly what it looks like:
"the left edge is set by the padding and the right edge stops short of it by a
hundred and forty pixels, so the panel looks like it has a margin on one side
only." That wording is now in `fivemile-cards.css` where the rule lives.

**`.panel` was defined three times** before this: in a style block on About,
again in `fivemile-heritage.css`, and nearly a third time when the calendar
wanted it. One definition now, in `fivemile-cards.css`, which all three page
families already load. Heritage keeps only what is particular to a chapter, the
nested `.ch-fig` rules and a phone padding two pixels tighter each way, which
is deliberate and is commented as such.

**Nine pages open the same way now:** the calendar, the archive hub and its
four rooms, the gallery, the field guide, and About. Heritage already did.

**`.intro` is a modifier and not a rule on `.panel`.** The lede it replaces
carried an 18px bottom margin, and mounting the prose took that margin with it,
so an opening followed by a count line or a grid finished flush against it. The
panels already on About and heritage sit against blocks that bring their own
top margin, 22px and 20px, and putting the margin on `.panel` itself would
have quietly doubled every one of those gaps. Nothing that was already mounted
moved.

**The measure went from 93 characters to 108,** which is the number decision 46
flagged as worth watching. It is not a new number: heritage and About have been
at that measure the whole time and the calendar was the outlier at 773px. This
makes the prose measure uniform rather than making it longer.

**Revisit if:** 108 characters reads long to anybody who is not looking for it.
The answer then is two columns inside the panel, about 53 characters a line,
and it is one rule in one file now rather than three.

---

## 49. A place name has to be a word, and it has to be the right place

The news desk matched place names with `blob.includes(word)`. That is true of
any run of letters inside a longer word, so `republic` matched the Republican
in "won the Republican nomination", and a South Carolina Senate primary ran on
this page with a Republic town badge on it. National party politics, which
CLAUDE.md says we do not run at all, arrived through a gauge on Five Mile
Creek.

The second one had the boundary right and the entity wrong. Republic Services
hauls garbage for a good part of Alabama, so a Helena council vote on its
contract also came through badged Republic.

**Two fixes, because they are two different faults.**

`hits()` matches on a word boundary now, with an optional trailing s. The s
matters: the old substring test was quietly catching plurals, and the beats
depend on it, so `train` has to keep matching "trains".

`NOT_A_PLACE` is a veto list for names that are also something else. Republic
is the worst of them and it is ours, so it carries the most: the waste hauler,
the airline, the bank, the form of government. **The gauge is carved out of the
civics pattern**, because a story about the creek is the exact thing that word
is in the list for.

**The lists were never audited for this.** `corner` matched "the corner of
Main and Fifth". `warrior` matched the Black Warrior River. `cardiff`
matched Cardiff, Wales. `trafford` matched Old Trafford. Those are all vetoed
now, and twelve cases are checked against the real feeds.

**It is a list of what has come through, not of everything a word could mean.**
It should grow when something new gets past it. Guessing at the rest in advance
is how you end up vetoing a real story.

**Two stories were pulled back out of the archive,** which is the one thing on
this site that is supposed to keep everything. The rule that nothing scrolls
away is about stories that belong here. A South Carolina primary badged as a
town on Five Mile Creek was never one of them, and leaving it in would make the
archive wrong rather than complete. August went from 33 to 31 and the index was
recounted.

**Revisit if:** a real local story gets vetoed. The veto is checked after the
word boundary, so the fix is almost always a narrower pattern rather than
dropping the entry.

---

## 50. The calendar is one month, and the rest of it is a room in the Archive
**Decided:** August 2026

Decision 41 rebuilt the calendar on the card system and gave it nineteen months
at once: January of this year through twelve months forward, behind a rail of
nineteen chips, with a Next up block above them. Every part of that was
defensible on its own and the page was still wrong. Joe said so plainly: he did
not like all the little buttons for every month.

### What a reader actually opens a calendar for

The month they are in. Everything else on that page was standing in front of
it. Nineteen chips is a control that has to be read before it can be used, and
above them Next up was a fourth copy of five rows that were already on the page
in their own months. Decision 41 cut the Standing dates block for exactly that
reason, one card per purpose, and then shipped Next up doing the same thing.

So the page is one month now.

- **The month is the hash.** `#m-2026-08`, the same anchor the accordion used,
  so every link anybody has ever sent still lands where it did. A step is a
  link, the back button works, and the address bar is something a reader can
  send to somebody.
- **The step control sits at the top of the month**, which is where Joe asked
  for it. Three cells: back a month, the month itself, forward a month.
- **Each step names its month and counts its dates.** That is decision 28
  again. A control reading only September is a heading with an arrow beside it,
  and without the count a reader has to spend a tap to find out whether
  September holds anything at all.
- **At the two walls the step is an empty transparent cell, not a dead
  button.** The column keeps its width, so the month title does not slide
  sideways in January.
- **A Back to August line appears only when the reader is off this month**,
  which is the only time it has anywhere to go. Without it, somebody who paged
  out to 2027 has to count their way home.
- **Stepping does not throw the page around.** A deep link from the archive
  scrolls to the month. A step, with the control already under the reader's
  thumb, changes the rows and leaves the control exactly where it was.

**Next up came out and is not coming back.** The month is in date order with
today's row in red, which is the same answer in the place a reader is already
looking.

### The walls are real, and they are January 2026 and the end of next year

`FIRST_YEAR` is 2026 because that is the year FIVEMILE started and there is
nothing behind it. The far end is the end of next year, which is sixteen months
of room in August and a whole year in December.

Both ends are enforced in `parseMonthId`, so a hash outside them falls back to
this month rather than drawing it. A calendar that pages forever will happily
draw somebody March 2043, where the moon table is empty and every council
roster is a guess, and it will do it with a straight face.

### Nothing scrolls away, so the year behind you got a room

Cutting eighteen months off the page is exactly the move CLAUDE.md says to stop
and fix rather than ship. Decision 41 had already been through this once, when
Joe sent in a June duck race that had already happened and there was nowhere to
put it.

So the rest of the calendar is `fivemile-calendar-archive.html`, the fifth room
in the Archive, and the hub says five things now instead of four.

| The room holds | How it reads |
|---|---|
| every year between the walls | a reel of years, each counting its dates |
| every month in the year on screen | twelve stub rows, each naming four of its dates and counting the rest |
| every date on file | a search across every year, not just the one showing |

Each month row links to `fivemile-calendar.html#m-YYYY-MM`. The room is the
index and the calendar is the reader. Only one page draws a month.

**The room reads no file, and that is not a break with decision 36.** The other
four rooms read the file the live page reads, so nothing is archived by hand.
There is no dates file to read: the calendar is two lists and a set of rules.
The room asks `fivemile-calendar-core.js` for a month exactly the way the
calendar page asks, which keeps the same guarantee by the same means. There is
still only one place the answer comes from.

**The counts on the hub panel are worked out, not read.** Same rule as every
other figure on that hub: it is counted with the engine the room uses, so the
number out front cannot drift from the number inside.

**The fifth panel takes the full width of the hub grid.** Five panels in two
columns otherwise leave a hole. It is also the room most people are looking
for, so the wide slot is not a consolation prize.

### The engine moved out into its own file

`fivemile-calendar-core.js` is Easter, the eight dates hanging off it, the two
sales tax holiday rules, the moon table, the seven subjects, the turnings
reader, `monthItems`, and the event stub. Two pages ask it now.

This is decision 41's own lesson applied one step further. That entry moved the
recurrence rules into `fivemile-season-data.js` because two files holding the
same rule meant only one of them could know about the Brookside holiday shift.
Copying Easter into an archive room would have undone it the week after it was
written.

**Two stylesheet moves came with it, both by rules already in the files.**
`fivemile-cards.css` says to move a rule in the moment a second page needs it,
and its own note on the event stub said the same. So the seven subject colors
went in, along with the word block for a date that is not a day, the source
link, and the shift note. Garden was already declared there at the same value
as a section tag, which is a good sign the palette was right.

**The date block went from 78px to 94px in the card spec.** It was 94 on the
calendar and 78 everywhere else, which meant the homepage and the news page
drew a different stub from the calendar for the same kind of row. 94 is the
number that fits THURSDAYS, and a block that can hold a word has to be wide
enough for one on every page that draws it.

### The two opening paragraphs came out, and a picker went in

**Decided:** August 2026, on the same page, after living with it.

This entry first kept those paragraphs, on the grounds that the second one is
why Candlemas and Lammas are on a calendar for three towns in Jefferson County.
Joe cut them both. A reader opening a calendar is looking for a date, and two
paragraphs of preamble is the same mistake nineteen chips were: something to
read standing in front of the thing they came for. The page opens on the month
now, one heading and a stamp above it.

The Welsh, Scottish, French, Sicilian, Slovak, and Carpatho Rusyn note is real
and worth keeping. It is history, so it belongs on Heritage rather than at the
top of a calendar. It is not written anywhere else yet.

**Every month is one tap, not six.** The step control is right for the month
either side and useless for next January, which was six taps away and gave a
reader nothing on the way there. Under the step control there is now a picker
holding every month between the walls, each one counting its dates the way a
step does, so the count is on screen before the tap is spent. That is decision
28 in a third place.

- **It is a select and it is left looking like one.** On a phone that is the
  native wheel, one thumb, no scrolling past thirty five months nobody wanted.
  A grid of chips is what came out of this page in the first place.
- **The year is the optgroup.** January 2027 is found by looking for 2027.
- **It writes the hash and nothing else.** The hashchange draws the month, so
  the picker goes down the same road a step goes down, and the back button and
  a sent link keep working.
- **The Back to August line moved onto the picker's row**, where it is the
  other half of the same job.

**Every month is counted once, at boot.** The step control, the picker, and the
door panel all read the one table. Three passes over the same two sources is
three answers waiting to disagree.

### What stayed

The send a date in form, because it is how dates arrive.
The seven subjects, the town badges, the shift note, the source links, and the
turnings staying invisible: all of decision 41 that was about what a row says
rather than how many rows are on screen.

**Revisit if:** a year ever holds enough one off events that twelve stub rows
stop being a useful index of it. Right now a month row names four of its dates
and counts the rest, which is enough to recognise August by. At three times the
volume the room wants the month grouping the news archive has rather than a
denser row.

## 51. Every card carries a mark, and the marks are one vocabulary

**Decided:** August 2026. Extends decisions 28 and 36.

The homepage gauge tiles picked up emoji marks and nothing else did, so the
almanac opened with five text-only rail tiles above four unmarked gauge tiles,
directly under a masthead that had a marked creek pill in it. Joe read the two
pages side by side and said the almanac felt inconsistent, which it was.

**A mark is a scanning aid, never the reading.** It sits in the kicker on a
gauge tile, ahead of the label in a cell, and ahead of the name on a rail item.
The figure and the sentence underneath carry the meaning. A mark that is only
decoration is `aria-hidden`. A mark that carries a reading of its own gets a
`role="img"` and a label, because then it is saying something the words are
not.

**Where they are now.** All four homepage tiles, all twenty gauge tiles on the
five almanac-family pages, all five rail items, and every `.d-cell` on the
site. There is no card left that takes a mark and does not have one.

**One vocabulary, and it holds across pages.** The creek is the wave, fishing
the rod, the garden the seedling, the sky the moon, nature the leaf, rain the
cloud, the ground the log, the barometer the compass, and how far a record goes
back is the mantel clock. A subject gets the same mark everywhere it appears,
which is the whole reason to have marks at all. Adding a new one means checking
it is not already spoken for.

**Rising and falling is one alphabet.** The creek trend was chart glyphs on the
almanac and arrows on the homepage, for the same fact off the same gauge. It is
arrows in both places now.

**Marks that were already being worked out and never shown.** `creekMood`,
`pressureNote` and `groundCondition` each computed an icon that no tile
displayed, and two desks were pasting one onto the front of the sentence
instead. Those are live marks on the kicker now, so the level tile shows the
same object the masthead pill shows.

**The face comes from `--emoji` in `fivemile-shell.css`.** It was duplicated in
the almanac and guide stylesheets, which is how a mark ends up rendering as a
flat glyph on one page and in color on the next. One token, and `.g-mark`,
`.d-mark`, `.wx-mark` and `.desk-mark` all reach for it.

**The rail was rebuilt to take the mark, and the first attempt was wrong.**
Dropping a mark into a column of its own took 36px of every item's width away
from the name and the live line. The row then ran 100px past the right edge of
the measure with the fifth item sitting off screen, `flex:1 0 auto` had already
been sizing each item to the longest word in it so they were five different
widths, and three of the five live lines were being cut. All three of those
landed in front of Joe at once.

What fixed it:

- **The mark and the arrow ride the name's line, not the item's.** The live
  line then runs the full width of the tile underneath, which is the same stack
  a gauge tile uses and for the same reason.
- **`flex:1 1 0`, so the five divide the row instead of accumulating it.** One
  width, always, and the row is exactly the measure.
- **The live line wraps to two lines and stops truncating.** A fifth of a
  1000px row is 160px and the line reports things like Harvest okra and
  southern peas. At 10px, small enough that nobody here should have to read it,
  eleven of the longest values were still being cut. Type size was never going
  to fix it. The item holds the height for two lines whether this value needs
  the second one or not, so the rail does not change height under the reader
  when the standing description is replaced by a live reading.
- **The rail scrolls below 1040px rather than below 560px.** That is the width
  where the measure stops being the full 1000px, which is the width where five
  items stop fitting. Below it they keep their size and the fifth sits half in
  view, which is the only thing that has ever told a reader a row scrolls.

**And it did get bigger.** 73px tall against 52, the name at 16px against 15.
It was set at a size that suited chrome bolted under the masthead, which
decision 28 had already established it is not.

**Revisit if:** a card ever wants a mark that has to assert a fact the data
does not support. A mark is a label for a subject, not a claim about it, which
is why the rain totals rows are marked by the span they cover rather than by
how hard it rained.

---

## 52. The nature desk shows what people are actually finding
**Decided:** August 2026. Extends decision 39.

iNaturalist has been in this repo since the field guide got real photographs,
but only as a build time picture source. The guide says what lives here. It has
never said what anybody saw last Tuesday.

`fivemile-observations.json` is the other half. A scheduled run asks
iNaturalist for research grade records inside a box over the lower creek and
writes them to a file, the same way every other number on this site arrives.
Nothing on the page calls anybody.

**It is a section on Nature Watch, not a page of its own.** A reader who has
opened Nature Watch is already asking what is moving right now, and this is the
answer to that question with names and dates on it. A sixth desk would have
been more shell than content.

**Research grade only.** An observation is research grade when other people
looked at it and agreed on the identification. Below that it is one person's
best guess, and a species name printed on this site has to be a fact. It costs
a little over half the volume, which for this box is still about twenty five
records a month, and it keeps the hard rule about not inventing a fact intact.

**Identified to species or finer.** A research grade record can stop at the
genus when the community agrees it will not go further. "Halysidota" tells a
reader here nothing, and carrying those would also make the species count on
the roll a count of something else.

**No photographs, and that follows from the stack rather than from taste.**
Nothing on a page talks to the outside world, so hotlinking iNaturalist's photo
CDN was never available. Committing a thumbnail per record was, and it was
turned down because the repo would then grow every week forever to decorate a
list that reads perfectly well as a list. The species name is the link, and the
photograph is one tap away on iNaturalist where it lives.

**Two rules about place, and both are hard.**

*No streets.* iNaturalist's place field routinely reads "Avery Ln, Mount Olive,
AL, US", which is somebody's yard. It is stripped to the town before it is
written to the file, so a street never reaches the repo at all. That is a
privacy matter for the person who filed the record, and it is also the site's
standing rule that a sighting never comes with a spot.

*No town on an obscured record.* Over half of these are obscured. iNaturalist
blurs the location of a threatened species, and a user can blur their own, so
the public coordinate is randomised inside a cell that can be twenty kilometres
across. Those records are kept and marked "Location withheld" rather than
dropped, because obscuring falls hardest on the snakes, the turtles, and the
salamanders, which are exactly what a reader here wants to see. Dropping them
would have quietly turned this into a list of bugs and weeds without saying so.
Naming a town for one would be inventing the single fact iNaturalist
deliberately withheld.

**The file keeps a roll, so this is not a rolling window.** The page shows the
most recent forty eight records, but the file also carries every species the
feed has ever seen, with the first date, the last date, and the observation ids
behind the count. Old entries are never dropped and never rewritten except to
be extended. That is what lets a row say "First one recorded here", which only
starts appearing on the second run, because on a first run everything is new
and saying so would be true and useless.

**The Archive room is not built and it is the open item.** CLAUDE.md says
anything the site keeps gets a room, and the roll is something the site keeps.
It reads off one file like the other rooms do, so it is a page and a loader
rather than a data change, and it can be added without touching anything here.

**Where a species is in the field guide, the row says so.** The guide already
carries an iNaturalist taxon id on sixty eight of its seventy entries, so the
match is exact, with a walk up the ancestor list for a guide entry written
above species level. That is the join the two halves were always missing.

**Revisit if:** the box needs moving. It runs from Graysville down toward the
Locust Fork and catches Adamsville and the Mount Olive side, which is correct,
they are on this water, but every row names its own town so nobody is ever told
a Mount Olive frog was a Cardiff frog.

---

## 53. The heritage prose is written into the HTML at build time
**Decided:** August 2026. Extends decision 39.

Heritage is about six thousand words of coal camp history and it is the most
distinctive thing on this site. Nobody else has written it down. In the HTML on
disk it was a heading, a nav, and an em dash, because every word of it lived in
`fivemile-heritage.json` and was drawn in the reader's browser.

Google runs JavaScript, on a slower second pass. Bing, the social preview bots,
and most of the crawlers feeding an answer engine do much less of it or none. So
the site's best content was filed exactly where the least of it would be found,
and the pages that would rank for "Brookside Alabama coal camp" were shipping a
dash to anything that did not execute a script.

`scripts/build-heritage-pages.mjs` now writes the same markup into the eight
heritage files. Static words across the family went from about two thousand to
6,213.

**It runs the site's own renderer rather than reimplementing it.** The obvious
build script would rebuild the timeline row, the plate, and the chapter nav in
Node, and it would be wrong inside a month, because two copies of one renderer
drift and the copy nobody looks at is the one a crawler reads.
`fivemile-heritage-core.js` and the page's own script are loaded and executed
against a forty line DOM shim instead. There is still one definition of a
timeline row and the build script does not contain it.

The shim answers six things, because six things are all the renderers ask for:
`getElementById`, `querySelector` for the chapter marker, `createElement` for
the escaper, `innerHTML`, `textContent`, and `className`. Anything else throws,
so a renderer that grows a new dependency fails the build rather than quietly
writing a page with a hole in it. The escaper matches what a browser does
serialising a text node, quotes deliberately included, because a prerender that
escaped more than the runtime would produce a page that visibly changes the
moment the script catches up.

**Proved rather than assumed.** Every one of the 45 prerendered blocks across
the eight pages was compared against what the same page's DOM holds after the
script has run, and all 45 match. The only difference the comparison ever found
was the marker comments themselves, which the runtime render replaces.

**The markers are the contract.** The build writes between
`<!--PRERENDER:id-->` and `<!--/PRERENDER-->` and nowhere else. Adding a marker
opts a block in, deleting one opts it out, and nothing in the script parses
HTML. A marker the renderer had nothing for is reported rather than written as
an empty block.

**Nothing about the runtime changed.** The pages load the same scripts and
redraw themselves from the JSON exactly as before. This only changes what a
reader, or a crawler, gets before any of that happens.

**It runs on the twice daily job.** Heritage is prose and reads nothing from
the network, so it does not belong on a data schedule on its own merits. It is
there so the prerender cannot sit stale behind a hand edit to the JSON: the next
run catches it whether anybody remembered or not. `npm run check-heritage`
reports without writing.

**Every entry in the record has an address of its own.** Each row carries its
own id from `fivemile-heritage.json`, so a single fact is a link:
`fivemile-heritage-camps.html#cardiff-letters-home` opens the chapter at the
letters home. That is what somebody can paste into a Facebook comment or an
email when they want to point at one thing, and it is what a search result can
send a reader to instead of the top of a chapter. The row's title is an `h3`
for the same reason. It sits under the `h2` the section already has, it is the
name of the thing the row is about, and a heading is what a crawler reads as
one. `.hz-title` did all the styling when it was a `b` and does all of it now,
and the global reset zeroes a heading's margins, so nothing about the row looks
any different.

**The structured data comes off the same file.** Every heritage page carries a
JSON-LD block generated by the same build script: the hub as a `CollectionPage`
holding seven parts, each chapter as an `Article` with its position in the run,
the years it covers, the towns it is about, and every source its entries cite.
The three towns have stable ids, and `index.html` now gives the same ids to the
three cities inside its `Place` node, so a chapter saying it is about Brookside
and the site saying it contains Brookside are talking about one place.

Nothing in the block is a claim the page does not already make in words, and
where the file does not know something the property is absent rather than
filled with something plausible.

**The published dates are read dates, not guessed ones.** Each chapter carries
a `published` in `fivemile-heritage.json`, and every one of them is the day
that page actually first went up: the hub on 22 August 2026, the seven chapters
and the data file itself on 25 August 2026. They were read out of the repo
history once and written down, rather than worked out at build time, because a
build that dates a page from its own git log gets a different answer the first
time somebody clones this shallow. What the date claims is when the page went
up, which is the only thing the repo actually knows. It is not a claim about
when the history in it was researched.

A chapter with no `published` in the file gets no `datePublished`. That is the
right answer rather than a plausible one, and it is the hard rule about not
inventing a fact doing its job in a place where nobody would have noticed.

`updated` in the file is the day the prose was last revised and it can sit a
day or two behind the day the page carrying it went up, which is how the
chapters ended up claiming they were modified two days before they existed.
The build reports the later of the two instead.

**The cost is page weight, and it was worth it.** A chapter went from 8KB to
between 17KB and 27KB, and the hub from 10KB to 27KB. That is text, it gzips
well, and one photograph on any of these pages is larger than the whole
increase.

**Revisit if:** the field guide wants the same treatment. Seventy species are
in `fivemile-guide.json` and have the same problem, and the shim generalises.
It was left alone here because the guide's front door is a search box and a
grid rather than prose, so the win is smaller and the markup is more of it.

---

## 54. Every page opens on card stock, and the share row goes inside it
**Decided:** August 2026. Extends decisions 48 and 51.

Decision 48 put every page opening on card stock and missed five: the almanac
and its four desks were still opening with a bare paragraph lying on the paper,
under a class of their own called `.desk-intro`. Joe read the fishing page and
said the first block of text was not formatted right and ran the full width,
which is exactly what a 64ch paragraph with nothing under it looks like beside
four mounted gauge tiles.

**All five are `.panel.intro` now**, and `.desk-intro` survives only on the one
sub-section intro that is not a page opening.

### A label above the standfirst was tried and taken out

`.p-kick` put a small brown label at the top of each opening panel, on the
argument that every other card in `fivemile-cards.css` opens with one: `.g-kick`
on a gauge, `.n-kick` on a notice, `.t-tab` on an index tab, the bar on a
department panel. Fourteen pages got one. The fishing desk read "The fishing
desk", the archive read "The archive", and so on down.

**Joe had it removed the same day.** He called it nice and said to take it out,
and he is right about the thing the argument missed: a gauge tile needs a label
because a bare number means nothing without one, and a notice needs a kicker
because the colour of the border is doing work that a word has to confirm. A
page opening under an `h1` that already says Fishing does not need a line
underneath saying the fishing desk. It was the card system's logic applied
somewhere the card system's problem does not exist.

**Do not add it back.** If a future page opening genuinely needs a label, the
thing to check first is whether the `h1` above it is missing.

**One trap it leaves behind.** `.panel .lede:first-child` is what puts the 19px
standfirst on an opening, and it stops matching the moment anything is put above
the lede. Adding a kicker silently dropped the standfirst off every page that
gained one, and the selector had to be widened to compensate. It is back to the
single shape now, and the comment in `fivemile-shell.css` says so.

### The share row moved inside the panel

It was landing after the first `<section>`, which on the desk pages put it
between the intro and the four gauge tiles, where a row of small bordered tiles
reads as a fifth row of readings rather than as the end of the intro. It is
inside the opening panel now, ruled off at the foot of it, which is both what
Joe asked for and where somebody actually is when they decide to pass a page on.

`data-share-in` is the new attribute and it appends inside the marked element.
`data-share-here`, which inserts after, is what the calendar and the news page
use, because what a reader has just finished on those is a block rather than a
panel. `index.html` used it too, under the featured photograph, until the home
page grew an opening panel of its own. It marks that now and the row sits in the
copy card the way it does on the other fifteen pages. See decision 60.

### Structured data on ten more pages

The heritage pages got a `@graph` in decision 53 and nothing else on the site
had any. Ten pages now carry a `WebPage` node naming what the page is, what
place it is about, and its keywords, all of it pointing at the `#website` and
`#place` nodes `index.html` already declares, so a desk page and the site
containing it are one thing rather than two.

This is the cheap half of being findable. The expensive half was already done:
every one of these openings is hardcoded HTML and always has been.

---

## 55. The fishing desk reads the gauge instead of guessing at it
**Decided:** August 2026.

Joe said the fishing conditions needed real work and that three stars left a lot
to be desired. Both were true and the second was the smaller problem.

**The stars could only ever return two or three.** `fishingRows` scored catfish,
bass, and bream out of a ceiling of three, and the arithmetic was built so that
nothing ever came back with one. A reader saw two stars on a cold February
afternoon and two stars on a June evening and correctly concluded the page was
not telling them anything. Each target gets a word now, from four, and the word
never appears without the sentence that earned it. A verdict with no reason
under it is a horoscope.

**The Republic gauge has been measuring the water temperature the whole time.**
`fivemile-watershed.json` has carried `water_temp_f` and `dissolved_oxygen_mgl`
on the lead gauge since the fetcher was written, and nothing on this site read
either of them. The fishing page was estimating water temperature from air
temperature and a seasonal offset, and presenting the estimate without saying
so. It reads the measurement now, keeps the estimate as the fallback for days
the gauge does not send one, and the tile says which of the two it is showing.

**Dissolved oxygen is the reading that explains August.** Warm water holds less
of it, so the hardest fishing of the year here is the hottest week rather than
the coldest, and that is a thing a person can be told rather than left to work
out. Nothing else local publishes it. It replaced the barometer on the fourth
gauge tile, and the barometer moved into the factor panel, because the barometer
is the one reading in that row that the creek itself does not measure.

**Thirteen fish, and the list is attributed to the readers.** The page carried
three species and a note saying a proper list would need a survey. It now
carries what readers of this site have caught or seen in the lower creek over
the years, said on the page to be exactly that: a first hand record and not a
survey. It came from Joe in the first instance and the copy does not say so,
because he asked for it to read as the readers' list rather than as his, which
is also the version most likely to bring in the next person's additions.

The NEEDS-CONFIRMATION for a sourced survey stays, because a first hand list
does not answer it. Two entries stop at the genus, the rock bass and the gar,
because nobody has put a species name to the ones out of this creek and the page
says so instead of picking one.

**The fish went into the field guide rather than into a second file.** All ten
new ones are `fivemile-guide.json` entries with photographs pulled by the two
scripts decision 39 built, which is why the guide went from seventy species to
eighty in the same pass. The fishing page reads its pictures from that file at
runtime. One store of species photographs on this site, one set of credits, and
no file path written down twice to go stale when a pick changes. The cards
themselves are written into the HTML, so what a crawler and a reader with no
JavaScript get is the whole thing rather than an empty grid.

**The band marker was wrong twice, and the second time is the one worth
remembering.** Marking every fish whose feeding range today's water falls inside
lit up twelve cards out of thirteen on an August afternoon, which is the same as
marking none. Two bands fixed that: the range a fish will feed in at all, and
the narrower one it is actually best in.

But the marking itself was still wrong, because it darkened the card's own
border. With twelve of thirteen cards marked, the one card left carrying the
site's ordinary hairline did not read as unmarked, it read as broken, and that
is exactly how Joe reported it: the rock bass card is missing its stroke. **A
state that most cards are in must never be drawn by changing the thing that
makes a card look like a card.** Every fish card carries the same border now and
the state is a chip inside it.

The same pass caught the fish cards sitting at `--r`, the 8px button radius,
which made them the only cards on the site not at the 14px CLAUDE.md calls for.

**What a rise does is on the page all the time.** Joe asked for it when the
creek rises. It is written as four stages with the one the creek is actually in
ruled, and a notice above it when the gauge says rising, rather than a block
that appears for six hours a month. Writing nobody can find is writing nobody
reads, and CLAUDE.md is explicit that nothing here scrolls away.

---

## 56. The sky is arithmetic, and it is not astrology
**Decided:** August 2026.

`fivemile-sky.js` works out where the sun, the moon, and the five naked eye
planets are from the date and nothing else. No fetch, no key, no third party
script, which means it is the one thing on this site that cannot be broken by
somebody else having a bad day.

**The method is Paul Schlyter's**, mean orbital elements as linear functions of
the day number with the larger lunar perturbations added back. Good to about two
arcminutes on the planets and better than a tenth of a degree on the moon.

**It was checked against the code already here.** Sunrise and sunset computed
through the new machinery agree with the NOAA routine in
`fivemile-almanac-core.js` to within 2.6 minutes across four hundred days. That
was the point of doing it: the sun is the one body whose answer this repo
already knew, so it is the one that can prove the rise and set arithmetic before
the moon and the planets are trusted to it.

**Three bugs came out of that checking and all three are the same shape.** A
Saturn magnitude a whole magnitude too bright, from feeding right ascension and
declination to a formula that wanted ecliptic longitude and latitude, which
opened the rings to twenty five degrees in a year they are nearly edge on. A
moon illumination of two per cent on the day after a full moon, from taking the
cosine of the wrong angle. And a moon underfoot an hour out on the fourth of
September and on no other day of the year, because a UT day does not always
contain the crossing being looked for and the wrap in `rev()` hands back a value
that never settles. Each of them looks right on the day you happen to test.
There is now a convergence check, and the count of days with no moonrise in four
hundred comes out at fourteen, which is the number the moon's own 24h50m period
says it should be.

**Solunar is a prediction and the page says so.** The four periods are moonrise,
moonset, and the two meridian crossings, which is what anglers have fished since
1926. The times are exact astronomy. Whether the fish agree is not a
measurement, no gauge on this creek reports one, and the copy does not imply
otherwise.

**The window tile shows a period somebody can reach.** The strongest period of a
day is often the moon overhead at two in the morning. The tile shows the
strongest one falling within ninety minutes of the sun, and the sentence says
where the outright best one is when it is somewhere else.

**No horoscopes, and that is a rule and not an oversight.** Joe asked for
astrological events and meant astronomical ones. Where a planet is, is a fact.
What it portends is not this site's business, and `fivemile-skynow.js` says so
at the top of the file so the next person to open it does not have to guess.

**Naming the constellation a planet sits in was refused.** It needs the IAU
boundary table, which is a data file this site has no other use for. A planet
here is described the way somebody standing in a yard would describe it: what
time it comes up, which way to look, and how bright it is against the stars. The
magnitude decides the wording and then gets out of the way, because a magnitude
is a number that runs backwards and almost nobody outside astronomy reads it.

**The dog days are on the page with their provenance.** They are the one named
stretch of the year everybody says and almost nobody can source. July 3 to
August 11 is the old reckoning of when Sirius rose and set with the sun, which
is where the name comes from, and Sirius has drifted since. The entry says that
rather than repeating the dates as though they were a forecast.

---

## 57. The year tables read from where the reader is standing
**Decided:** August 2026.

The fishing, garden, and nature desks each drew a twelve month table in January
to December order with the current month outlined somewhere in the middle. In
August that is seven months already gone before a reader reaches the one they
are standing in, which is a reference table pretending to be a page.

All three now open on this month and the two ahead, in that order, with the rest
of the year behind one button. Three copies of a twelve month loop became one
function in `fivemile-almanac-core.js`, because three copies is how the three of
them would have drifted apart.

**It is not persisted.** The season windows on the nature desk remember whether
they were opened and this does not, deliberately: that list is a thing a reader
works through, and this is reference material whose useful default is the three
months in front of them.

---

## 58. There is a veil between Joe and the publication
**Decided:** August 2026. Extends decision 42.

The almanac opened by explaining that the creek reading comes off the USGS gauge
at Republic and the weather off a station in Cardiff rather than an airport
thirty miles away. Joe asked for the station talk to come out, and then for the
principle behind it: "there does need to be a sort of veil between me and what I
do and the website and what it does."

**A station's town is an address with extra steps.** CLAUDE.md has always said
his personal address never appears here. A weather station sits at a house, so
naming the town it is in narrows a private address to a few hundred people in a
place where a good many of them would know exactly which house. The rule had
even blessed it: decision 42's list of correct uses of the word Cardiff named
"the weather station that sits there and is cited as the source of a reading."
That line was wrong and is gone.

**Sixteen places, and three of them were search results.** The station's town
was in prose on five pages, on six labels, in three sentences built by script,
and in the search and social descriptions on the weather archive, which are the
lines that show under a Google result and in a shared link.

**One wording now.** "The FIVEMILE weather station" in prose, "Our station" on a
label, and "the site's own Ambient Weather station" where the instrument is
being named. The homepage and the almanac had already drifted to "Local
station", which is not a leak but is a second name for one instrument, so it
went the same way.

**An HTML comment is served.** `fivemile-civic.html` carried a comment marking
one tile as the thing Joe is most worried about. It never rendered and anybody
could read it in the source. A comment is a note to the next person editing the
file, not a private channel, and nothing goes in one that could not run as copy.

### What the veil does not cover

**His name on a photograph he took.** That is a byline and every photograph on
this site carries one, which decision 39 settled for the field guide and which
the About page promises to anybody who sends a picture in.

**His name on the About page as the person running it.** A publication with no
named person behind it is worth less, not more. The veil is over what he does
and where he is, not over who publishes this.

**Revisit if:** the station is ever cited in a way where a reader genuinely
needs to know how far from them it is. The answer then is the watershed, which
is four miles end to end, and never a town.

## 59. The readings run above the opening
**Decided:** August 2026. Extends decision 54.

The almanac opened with a prose panel and put the sun, moon, date and
yesterday row underneath it, so a reader arriving for today's numbers read a
description of the site first. That got swapped, and then the same thing was
obviously true of the four desks: Fishing, Garden, Nature Watch and Night Sky
each opened with a paragraph and hid four gauge tiles below it. On a phone
that is most of a screen of prose before the first number, and the number is
what the reader came for. Somebody opening the fishing page at six in the
morning wants the water temperature and the stage, not an explanation of why
water temperature matters.

The row now sits directly under the h1 and the opening follows it. All five
pages read the same way, because a rule that holds on four of them and not
the fifth is worse than no rule.

**The Archive did not change, and that is not an oversight.** Its top section
has the same shape, a panel over a card row, but the cards there are the five
rooms rather than five readings. They are doors, and the paragraph above them
is what tells a reader what is behind a door. Nothing is being read off
anything, so there is no number being buried.

**The spacing keys off position, not off page name.**
`.panel.intro:not(:last-child)` gives the panel its 18px only when something
follows, so the panel drops it by itself now that it is last. The gap is
handed to whatever is on top instead: `.hero-row:not(:last-child)` on the
almanac, `.top > .four-eq:not(:last-child)` on the desks. Same number, same
idiom, and a page that puts the two blocks back the old way still spaces
correctly. The desk rule carries the `.top >` scope that the almanac rule does
not need, because `.hero-row` exists in one place and `.four-eq` is a shared
four column grid that some later page will reasonably use somewhere else.

**The share row went with the opening.** It is injected into
`[data-share-in]`, which is the prose panel, so it is still at the foot of the
block a reader has just finished rather than stranded between the numbers and
the words.

**This changed nothing about what a crawler gets, in either direction.** The
opening prose was already hard coded in the HTML and still is. The numbers
were never in the HTML and still are not: the tiles ship an em dash and the
page fills them from the committed JSON. Moving two blocks past each other
does not make static text less findable, and it does not make a live reading
any more findable either.

**Revisit if:** the measured tiles get prerendered. Water, stage and oxygen
come straight out of `fivemile-watershed.json` and could be written into the
HTML the way the heritage prose is in decision 53, which would put real
numbers in front of a crawler and in the first paint instead of four dashes.
The tiles worked out from today's date must not be: the solunar window, dark
hours, daylight and moon age are all computed from now, and a build time
snapshot of today is wrong by tomorrow and would sit in the HTML claiming
otherwise. Prerendering the measured three and leaving the computed one alone
is the shape of it, and the split is the whole difficulty.

## 60. The name is set in the masthead brown when it appears in copy
**Decided:** August 2026. Extends decision 14.

FIVEMILE written out in body copy was plain body weight in body ink, which
made it read as a shouted word rather than as the publication naming itself.
It now takes bold and `var(--hdr-bg)`, the exact brown the masthead sits on,
through `b.fm-name` in `fivemile-shell.css`.

**The token, not a shade near it.** `--hdr-bg` is the masthead's own value.
A hand picked brown that looked close would drift the moment the masthead
changed, and the whole point is that the two are the same brown.

**It does not borrow the serif.** Playfair belongs to the masthead wordmark
and to nothing else, which is decision 14 and is unchanged. The name in copy
stays in Plus Jakarta Sans and gets its personality from weight and color.

**Where it goes.** Running prose, small print source notes included. Nine
places today: three on About, one each on the Almanac, Fishing, Garden,
Nature Watch, the Dates archive, and the home page opening.

**Where it does not.** Not in the masthead, which is the wordmark itself.
Not in any heading, where it would fight type that is already doing the
work. Never on the announcement strip: that ground is red and a dark brown
on it would be close to unreadable. Not in a `mailto:` subject or a ticker
default, because those are strings rather than something a reader sees set
in type.

**Not in the announcement footer either, and that one is a judgment.**
`fivemile-common.js` falls back to "the FIVEMILE desk" when a notice has no
`postedBy`. That line is DM Mono at 10.9px with letterspacing, in a muted
ink on paper2, and it is a byline rather than running prose. A byline is
closer to a label than to copy, and the rule above is about copy. It would
also appear only on the notices that have no other attribution, so the name
would come and go down a column of cards. Revisit if that reads as an
omission rather than as restraint.

**The selector carries its element on purpose.** `.p-list b` in
`fivemile-cards.css` sets a color at the same specificity, and the name turns
up inside one of those rows on About. `b.fm-name` ties with it and wins on
source order, because `fivemile-shell.css` loads after `fivemile-cards.css`
on every page. If that order ever changes, this rule silently loses and the
name goes back to ink with nothing appearing to be broken. The comment on the
rule says so.

Wrap the word and nothing else, so a possessive keeps its apostrophe outside
the mark.

**The home page opening is decision 54 catching up.** Every page opens on
card stock, and the home page was the one that never did. It carried no prose
at all, which left the page most likely to be found by a stranger with nothing
on it saying what this is or where. It now opens the same way, under the
readings rather than over them per decision 59, naming the three towns, the
creek, the county and the state. It does not say where the readings come from.
Decision 58 took that talk out and it is not coming back in through the front
door.

## 61. The measured readings are written into the HTML, and only the measured ones
**Decided:** August 2026. Answers the revisit note on decision 59, extends decision 53.

Decision 59 ended by saying the measured tiles could be prerendered the way the
heritage prose is, that the tiles worked out from today's date must not be, and
that the split was the whole difficulty. This is that job done.
`scripts/build-gauge-tiles.mjs` now writes fourteen readings into five pages:
the three live tiles on the home page, the four creek tiles on the almanac, and
the ground, rain, water, stage, oxygen and month tiles across Fishing, Garden
and Nature Watch.

Before this, the most useful thing on those pages was the one part a crawler, a
social preview bot and the first paint never saw. A gauge tile ships an em dash
and is filled from a committed JSON file the moment the script runs, so anything
that does not execute JavaScript got a dash where the creek stage should be.

**The split is the whole of it, and it is not a matter of care.** A reading that
is measured and sits in a committed file can go into the markup: it is a fact
with a source, and it goes stale exactly the way the file does. A reading
computed from now cannot, because a build time snapshot of today is wrong by
tomorrow and would sit in the HTML asserting otherwise. That is the hard rule
about never inventing a fact, with a timestamp on it.

Eleven tiles are therefore left shipping a dash on purpose: the solunar window
on Fishing, the frost countdown on Garden, daylight and the next season window
on Nature Watch, and all four on Night Sky. The reader's own browser fills them
from the reader's own clock, which is the only place that question can be
answered honestly. **Night Sky gets nothing at all and was not touched.**

**The guarantee is structural rather than careful.** The build runs the page's
own scripts and then harvests only the fourteen tiles named in `TILES`.
Everything else the run produced is thrown away without being looked at. So a
time dependent value cannot reach the markup even if somebody later adds one:
not because the script is careful about it, but because it never reads those
nodes. Adding a line to `TILES` is the only way to opt a reading in, and that
line is where the thinking has to happen.

**It runs the site's own renderers, for decision 53's reason.** Reimplementing a
gauge tile in Node would be wrong inside a month, because two copies of one
renderer drift and the copy nobody looks at is the one a crawler reads. Every
script the page loads is loaded and run here, in the page's own order, against a
DOM shim. There is still one definition of how a stage is formatted and this
build script does not contain it.

**The shim is the window, not a set of parameters.** Heritage hands its two
renderers `window` and `document` as arguments. That does not survive here: these
scripts reach for `innerWidth`, `matchMedia`, `localStorage`, `ResizeObserver` and
a canvas context as bare globals, and a parameter list naming all of them goes
out of date the first time a script grows one more. The shim object is made the
VM context's global instead, which is what a browser does. Anything not on it
throws a ReferenceError naming exactly what is missing, so a renderer that grows
a new dependency fails the build rather than quietly writing a page with a hole
in it. That is heritage's habit kept, by a different mechanism.

**One bug worth writing down, because it was invisible.** The first version read
each script off the disk inside the loop that ran them. Reading a file yields to
the microtask queue, so the home page's fetch callbacks fired while
`fivemile-common.js` was still being read, and the weather tile's mark was
painted before `window.FivemileWx` existed. The tile simply came out of the
harvest missing, with nothing reported wrong. A browser never loses that race,
because a plain script tag blocks the parser and common.js has run long before a
JSON fetch comes back. Every source is now read before any of them runs, and they
run back to back with nothing awaited in between.

**The markers are the contract, same as heritage.** The build writes between
`<!--PRERENDER:creekStageVal-->` and `<!--/PRERENDER-->` and nowhere else. Forty
of them across the five pages. Adding a pair opts a reading in, deleting one opts
it out, and nothing in the script parses HTML. A marker the renderer had nothing
for is reported and left holding whatever the page already had, rather than
blanked: a quiet gauge should leave the page's own empty state in place.

Unlike heritage, these blocks are written inline rather than on lines of their
own. A newline either side of a gauge value would be a text node the browser
paints, and the tile would not look the same.

**Proved against a browser, not assumed.** All forty blocks were compared against
what the same page's DOM holds after its scripts have run, served over a local
static server. Thirty nine are byte for byte identical. The fortieth is the rain
value, where the build writes `1.34&quot;` and the browser's `innerHTML` getter
hands back `1.34"`. That is a serialisation difference and not a content one:
the baked markup parses to exactly the live node, and a reader sees the same
inches either way. It is left alone, because the string the build writes is
precisely what the site's own `escapeHtml` produced.

**It runs on the ten minute job, and the churn argument that was made against
that is wrong.** The case for putting it on the twice daily job was that
`refresh-live.yml` fires every ten minutes and would rewrite five HTML files up
to 144 times a day. It would not. Decision 30 already measured that the `*/10`
cron is throttled to about thirty runs a day, and the per file content guard
filters most of those: over the five days to 30 August, `data: live refresh`
made 1, 3, 2, 6 and 4 commits. The real cost is nearer five HTML rewrites a day
than 144, so the argument for accepting a twelve hour old snapshot never had to
be made.

**One honest caveat on that number, which is an estimate and not a measurement.**
The change tiles compare the stage against the same hour yesterday, and which
history sample counts as "yesterday" moves as the clock does. So a page can
change when no JSON file did, and HTML rewrites may run closer to the thirty
runs a day than to the five commits a day. Still nowhere near 144, and worth
watching rather than worrying about.

**Two tiles measure over a window defined by now, and that is deliberate.** The
rain tiles are measured rainfall totalled since the first of the month, and the
change tiles are measured stage against a sample twenty four hours back. Both
are real readings from committed files, so both belong on the measured side of
the split, but their windows move. The rain figure is the awkward one: at one
minute past midnight on the first of the month the page still says last month's
total until the next run. On a ten minute cadence that is minutes. On a twice
daily cadence it would have been up to twelve hours claiming a month's rain that
had not fallen, which is the other half of why this is not on that job.

**The stale snapshot is a known trade and it was taken deliberately.** A human
always gets the live number, because the page redraws from the JSON on load
exactly as it always did. A crawler can index a stage reading and show it in a
result weeks later. Set against a crawler indexing an em dash, a dated real
reading is the better of the two, and every tile sits next to a card that stamps
its own time.

**There is no CI gate on it, and that is the difference from heritage.**
`npm run check-gauges` reports without writing, but nothing fails a build on it.
The heritage pages are prose and can only be stale if somebody forgot to run the
build; these pages are expected to sit behind the gauge between runs. That is
what snapshotting a live reading means, and a check that fails by design is a
check nobody reads.

**Three things went in alongside it, and one of them is a rule about lastmod.**

`sitemap.xml` had no `<lastmod>` on any of its twenty eight entries. Eight of
them have one now, and they are the eight heritage pages, written by
`scripts/build-heritage-pages.mjs` off the `published` and `updated` dates
already in `fivemile-heritage.json`. The rest deliberately still have none.

A lastmod is worth something to a crawler exactly to the extent that it is
accurate, and most of this site cannot be accurate about it. The almanac and the
four desks are now rewritten every ten minutes by the prerender above, so a
truthful lastmod on them would move constantly while the page a reader came for
said the same thing it said yesterday. That is churn dressed up as a signal, and
a crawler that learns to distrust one date on a site distrusts the rest of them.
Heritage is the opposite case: it is the most durable writing here, it is why
somebody lands on this domain from a search about a coal camp, and the dates are
already written down rather than guessed. So the rule is that a page gets a
lastmod when the date is already known and stable, and gets none otherwise.

It uses the same `modified()` the structured data uses, so a chapter cannot tell
the sitemap one date and its own JSON-LD another. That was checked: all eight
agree. `sitemap.xml` joined the staged files on `refresh-site-data.yml`, because
a date regenerated every run and never committed is no date at all.

**The ground tiles stopped naming the station's town.** Garden and Nature Watch
both carried `Ground &middot; Cardiff` on the kicker, which is the weather
station's location in copy and is what decision 58 and the veil section of
CLAUDE.md exist to prevent. Both now read `Ground &middot; Our station`, which is
the wording CLAUDE.md gives for exactly this label.

The pattern came from the card spec, which is where it was fixed as well.
`docs/fivemile-card-spec.html` demonstrated the gauge tile with a kicker reading
`Weather &middot; Cardiff`, so anybody building a card from the reference started
from the wrong example. It now reads `Weather &middot; Area`, which is what the
home page actually uses. `robots.txt` disallows `/docs/`, so this was never an
indexing problem; it was a copy that would keep being made. Nothing on the site
or in the spec now names a town on a reading's kicker.

**The home page stopped saying the creek dropped nothing.** The creek tile
compared the stage against yesterday and printed the move in whole inches, with
the boundary between moving and holding set at 0.02 ft. An inch is 0.083 ft, so
any move between 0.02 and 0.042 rounded to zero and the tile said "It has dropped
0 inches since yesterday", which is not a sentence anybody would say. The
boundary is now `CREEK_MOVE_FT`, half an inch, the smallest move the wording can
print as a whole inch. Under that the creek is holding. The arrow reads off the
same constant as the sentence, so the mark and the words can no longer disagree
about which it is.

That one was worth catching before this decision landed rather than after. The
sentence had always been there; prerendering it is what would have written it
into the markup where a crawler reads it.

**Revisit if:** the history churn turns out to matter after all, in which case
the change tiles come out of `TILES` before anything else does, since they are
the ones that move without the data moving.
