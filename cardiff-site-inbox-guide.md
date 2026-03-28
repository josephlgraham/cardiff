# Cardiff site inbox guide

This is the simple operating rhythm for the site inbox.

## 1. Sheet columns

Use the `Messages` tab in your Google Sheet.

Recommended columns:

- `Timestamp`
- `Form`
- `Name`
- `Email`
- `Topic`
- `Message`
- `Page`
- `Status`
- `Posted`
- `Notes`

The first seven are what the website already sends.

The last three are for you:

- `Status`: use `new`, `answered`, `posted`, or `hold`
- `Posted`: note where it went if you published it
- `Notes`: anything you want to remember

## 2. Easiest workflow

When a new row comes in:

1. Mark `Status` as `new`
2. Read the message
3. Decide whether it should be answered, posted, or saved
4. Change `Status` to `answered`, `posted`, or `hold`
5. Add a quick note if needed

## 3. Suggested filters

If you want the sheet to feel like a little dashboard:

- Filter by `Status`
- Sort newest first
- Freeze row 1

Useful saved views:

- `new`
- `needs reply`
- `ready to post`

## 4. Forms now feeding the inbox

These pages now send into the sheet:

- `Get Involved`
- `Kitchen`
- `Cemetery`
- `Calendar`
- `Hills & Hollers`

## 5. Optional Apps Script upgrade

If you want new messages to auto-fill `Status` as `new`, change your Apps Script `appendRow` block from:

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
    form,
    name,
    email,
    topic,
    message,
    page,
    'new',
    '',
    ''
  ]);
```

If you do that, make sure the `Messages` tab has the extra columns:

- `Status`
- `Posted`
- `Notes`
