# Cardiff site launch and content checklist

This is the plain-English version of what to build so the site stays easy to run.

## 1) Pick the operating model

Use one GitHub repository for the site.

Inside that repo, keep the website simple:

```text
/
  index.html
  cardiff-news.html
  cardiff-almanac.html
  cardiff-guide.html
  cardiff-hollers.html
  cardiff-kitchen.html
  cardiff-cemetery.html
  cardiff-civic.html
  cardiff-involved.html
  cardiff-common.css
  cardiff-common.js
  cardiff-news-feed.json
  cardiff-news-feed-template.json
  cardiff-home-gallery.json
  cardiff-home-gallery-template.json
  images/
    home/
    pages/
    recipes/
```

That setup keeps the site static and easy to host.

## 2) Domain and hosting

Buy one domain first.

Suggested structure:

- Main public site: `www.yourdomain.com`
- Root redirect: `yourdomain.com` -> `www.yourdomain.com`
- Government site later: `gov.yourdomain.com`

Do not pay separately for SSL unless your host forces it. With the normal static-site options, SSL is usually included.

## 3) GitHub setup

1. Create a new repository.
2. Upload the full site files.
3. Turn on GitHub Pages or another static host.
4. Add your custom domain.
5. Turn on HTTPS.
6. Check that every page loads from the real domain.

## 4) News workflow

Use a JSON file as the site-facing data layer.

The website already has that pattern:

- `cardiff-news-feed.json` = live file the page reads
- `cardiff-news-feed-template.json` = example shape for new entries

Keep the JSON file in the repo root unless you later move it into a `data/` folder.

### What goes inside the news JSON

Use these sections:

- `updatedAt`
- `bulletin`
- `pinned`
- `stories`

Each story should have:

- `title`
- `source`
- `link`
- `description`
- `date`
- `priority`
- `pinned`
- `mode` or `modes`
- `tags`

### Best operating model

Start with manual edits to the JSON file.

After launch, choose one of these:

- Google Sheet + Apps Script writes the JSON file on a timer
- GitHub Action writes the JSON file on a timer

Do not make the public page read the sheet directly. Let the sheet or script write JSON.

## 5) News sheet plan if you use Google Sheets

Create one spreadsheet called something like `Cardiff News Desk`.

Use these tabs:

### Tab 1: `pinned`

One row per hand-picked story.

Columns:

- `title`
- `source`
- `link`
- `description`
- `date`
- `priority`
- `pinned`
- `modes`
- `tags`
- `status`

### Tab 2: `stories`

Same columns as `pinned`, but for regular items.

### Tab 3: `settings`

Rows for:

- `updatedAt`
- `bulletin`
- `maxItems`
- `freshDays`

### Tab 4: `queries` (optional later)

Use this only if you automate feed pulling.

Columns:

- `label`
- `query`
- `mode`
- `active`

## 6) Photo rotation workflow

Do not use a spreadsheet for the home photo rotator unless you really want nontechnical editing.

The cleaner system is:

- a folder of images
- one JSON manifest file

That manifest is:

- `cardiff-home-gallery.json`

Each image entry should have:

- `src`
- `title`
- `copy`
- `credit`
- `alt`
- `markers`

If you later want somebody else to update photos without touching JSON, then put a sheet in front of it and let a script export JSON.

## 7) Content folders to create now

Create these folders now even if they stay half empty at first:

```text
images/
  home/
  pages/
  recipes/
  cemetery/
  civic/
```

That gives you a place to drop future assets without rethinking the repo.

## 8) What to populate before launch

### Minimum launch set

- All nine HTML pages
- `cardiff-common.css`
- `cardiff-common.js`
- `cardiff-news-feed.json`
- `cardiff-home-gallery.json`
- at least one real home image
- at least three real news items in the JSON file
- contact destination for form submissions

### Stronger launch set

- a site favicon
- social preview image
- custom domain connected
- HTTPS working
- one working email address for contact
- a basic analytics tool if you want it

## 9) Contact form reality check

A plain HTML form needs a destination.

Pick one:

- Formspree or similar
- Netlify Forms if hosted there
- Apps Script web app
- Email service/API later

Do not leave a fake submit button in public launch if it does nothing.

## 10) Your easiest path from here

If you want the lowest-friction launch path:

1. Use GitHub for the files.
2. Use GitHub Pages or Cloudflare Pages for hosting.
3. Use the JSON files for news and home photos.
4. Keep manual editing at first.
5. Add Sheet or automation only after the public site is live.
