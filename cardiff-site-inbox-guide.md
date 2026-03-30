# Cardiff site inbox guide

This is the simple operating rhythm for the site inbox.

## 1. Sheet columns

Use the `Messages` tab in your Google Sheet.

Recommended columns:

- `Timestamp`
- `Submission ID`
- `Form`
- `Name`
- `Email`
- `Topic`
- `Message`
- `Page`
- `Page Title`
- `URL`
- `Referrer`
- `Status`
- `Needs Reply`
- `Tags`
- `Assigned`
- `Posted`
- `Notes`

The site already sends the first eleven.

The last five are for you:

- `Status`: use `new`, `answered`, `posted`, or `hold`
- `Needs Reply`: use `yes` or leave blank
- `Tags`: quick sorting words like `history`, `watershed`, `urgent`, or `council`
- `Assigned`: who is handling it, even if that is just you
- `Posted`: note where it went if you published it
- `Notes`: anything you want to remember

## 2. Easiest workflow

When a new row comes in:

1. Mark `Status` as `new`
2. Read the message
3. If it needs a follow-up, set `Needs Reply` to `yes`
4. Add one or two `Tags` so future filtering stays useful
5. Decide whether it should be answered, posted, or saved
6. Change `Status` to `answered`, `posted`, or `hold`
7. Add a quick note if needed

## 3. Suggested filters

If you want the sheet to feel like a little dashboard:

- Filter by `Status`
- Sort newest first
- Freeze row 1

Useful saved views:

- `new`
- `needs reply`
- `ready to post`
- `history / archive leads`
- `creek and weather tips`

## 4. Forms now feeding the inbox

These pages now send into the sheet:

- `Get Involved`
- `Kitchen`
- `Cemetery`
- `Calendar`
- `Hills & Hollers`

## 5. Optional Apps Script upgrade

If you want the smarter sheet layout and automatic triage fields, change your Apps Script `appendRow` block from:

```javascript
  sheet.appendRow([
    new Date(),
    form,
    name,
    email,
    topic,
    message,
    page
  ]);
```

to:

```javascript
  sheet.appendRow([
    new Date(),
    e.parameter.submissionId || '',
    form,
    name,
    email,
    topic,
    message,
    page,
    e.parameter.pageTitle || '',
    e.parameter.url || '',
    e.parameter.referrer || '',
    'new',
    '',
    '',
    '',
    '',
    ''
  ]);
```

If you do that, make sure the `Messages` tab has the extra columns:

- `Submission ID`
- `Page Title`
- `URL`
- `Referrer`
- `Status`
- `Needs Reply`
- `Tags`
- `Assigned`
- `Posted`
- `Notes`

## 6. Why this is worth doing

This keeps the inbox from turning into a pile of mystery messages. Once people start sending history leads, meeting notes, creek sightings, and help requests, the extra columns make it much easier to:

- spot duplicates
- filter by page or topic
- find messages that still need a human reply
- pull out the submissions that could become stories, photo features, or alerts
