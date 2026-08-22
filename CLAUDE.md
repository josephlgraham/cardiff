# FIVEMILE

A community publication for Graysville, Cardiff, and Brookside, Alabama, the
three towns at the lower end of Five Mile Creek. Weather, creek conditions,
civic dates, local history, and things worth knowing about. Live at
fivemile.now.

Run by Joe Graham. Contact fivemilec@gmail.com.

## The point

Facebook groups are fine for talking and useless for remembering. This site
keeps things. Nothing here scrolls away.

## Stack

Fully static. GitHub Pages, vanilla JS, no bundler, no frameworks, no build
step. Every piece of data is a JSON file in the repo, written either by a
scheduled GitHub Action or by hand.

There is no backend. No database, no Supabase, no serverless functions, no
third party form services, no ad networks. If a feature seems to need one, say
so and stop rather than adding one.

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
local history, gardening, fishing.

We do not run: obituaries, sports, politics, or hunting location content of any
kind. Season dates only, never spots or maps.

## File naming

Everything is `fivemile-*`. Pages, styles, scripts, data files.

- `index.html` keeps its name.
- Build scripts and workflow YAML keep their filenames. Their contents
  reference `fivemile-*`.
- Stub files remain at the old `cardiff-*.html` paths with a meta refresh and
  a canonical link. Do not delete them and do not add anything to them.
- `cardiff-sw.js` still exists as a self-unregistering tombstone for anyone who
  installed the old PWA. Do not delete it. The live service worker is
  `fivemile-sw.js`.

If a `cardiff-` reference turns up anywhere other than those stubs, the
tombstone, or `cardiff-civic.html`, it is a bug from the rename pass.

## Git

`git pull` first, always. Scheduled workflows commit data files on their own.
Then `git add .`, `git commit -m "..."`, `git push`.

## Before changing anything that looks like a mistake

Read DECISIONS.md. Several things in this repo are deliberate and
counterintuitive, and the reasons are written down there. If a decision is
listed, do not undo it without asking Joe.
