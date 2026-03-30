# Cardiff Editorial Operations Guide

This is the practical guide for running the site day to day.

Use it alongside [cardiff-voice-and-emoji-guide.md](/C:/Users/Avid/Desktop/Cardiff%20Work/Site/cardiff-voice-and-emoji-guide.md).

## 1. What controls what

- `ticker.json`
  Controls the masthead ticker across the whole site.
- `cardiff-news-feed.json`
  Controls the manual desk bulletin and any hand-picked pinned stories on the news page.
- `cardiff-news-live.json`
  Holds the automated news pull. Treat this like generated data, not hand-edited copy.

## 2. Desk bulletin

The blue desk bulletin on the news page is driven by the `bulletin` field in `cardiff-news-feed.json`.

If you want to show a manual desk bulletin:

```json
{
  "updatedAt": "2026-03-30T08:15:00-05:00",
  "bulletin": "Storm setup after lunch. Keep an eye on James Spann and have a shelter plan before school pickup.",
  "pinned": [],
  "stories": []
}
```

If you want to hide it:

```json
{
  "updatedAt": "2026-03-30T08:15:00-05:00",
  "bulletin": "",
  "pinned": [],
  "stories": []
}
```

Rules:

- Use the desk bulletin for watches, warnings, severe weather setup, urgent road problems, outages, or a truly important town heads-up.
- Do not use it for a normal story link.
- Keep it short enough to scan in one pass.
- Update the `updatedAt` time when you change it.

## 3. Sitewide ticker

The top ticker is driven by `ticker.json`.

### For a personal or site message

Use `showTicker: true` and leave `hasAlerts: false`.

```json
{
  "updatedAt": "2026-03-30T08:20:00-05:00",
  "showTicker": true,
  "hasAlerts": false,
  "alertCount": 0,
  "ticker": "Cardiff cleanup day this Saturday at 9 AM · gloves, boots, and creek sense welcome",
  "alerts": []
}
```

### For a real alert-driven ticker

Use `hasAlerts: true` and fill the `alerts` array.

```json
{
  "updatedAt": "2026-03-30T08:20:00-05:00",
  "showTicker": true,
  "hasAlerts": true,
  "alertCount": 1,
  "ticker": "⛈️ Severe thunderstorm warning for the Cardiff area through 6:15 PM",
  "alerts": [
    {
      "headline": "Severe thunderstorm warning",
      "description": "Damaging wind is the main concern.",
      "severity": "severe",
      "emoji": "⛈️",
      "endsShort": "6:15 PM"
    }
  ]
}
```

### To hide the ticker completely

```json
{
  "updatedAt": "2026-03-30T08:20:00-05:00",
  "showTicker": false,
  "hasAlerts": false,
  "alertCount": 0,
  "ticker": "",
  "alerts": []
}
```

## 4. Information priority on the site

When in doubt, this is the order of importance:

1. Immediate safety
   Alerts, warnings, storm setup, road closures, outage information, sheltering needs.
2. Daily-use public information
   Weather, creek conditions, civic deadlines, meetings, utilities, school changes, public works.
3. Community signals
   Volunteer asks, town notices, neighborhood participation, local documentation.
4. Context and understanding
   History, ecology, older traditions, seasonal explanation, interpretation.
5. Delight
   Flavor, atmosphere, fun copy, small jokes, emoji warmth.

The rule is simple: delight never outranks clarity, and style never outranks safety.

## 5. Voice and emoji standards

The main tone guide already lives in [cardiff-voice-and-emoji-guide.md](/C:/Users/Avid/Desktop/Cardiff%20Work/Site/cardiff-voice-and-emoji-guide.md).

Use these quick reminders:

- One strong emoji is usually enough.
- Safety, grief, and legal risk need restraint.
- Civic copy should be warm but plainspoken.
- Almanac copy can carry the richest emoji layer.
- If an infobox is not helping, hide it or move it.

## 6. How to handle manual news items

`cardiff-news-feed.json` also accepts manual pinned items and manual stories.

- Put truly important manual items in `pinned`.
- Put supporting manual items in `stories`.
- Use `priority` to help something rise.
- Keep tags short and useful.

## 7. Google search checklist

You already have a Google verification file in the repo:

- `google8fee6247b6a9aea0.html`

The remaining search basics are:

1. Verify the site in Google Search Console.
2. Submit `sitemap.xml`.
3. Keep `robots.txt` live.
4. Make sure important pages are linked from the site navigation or home page.
5. Use URL Inspection in Search Console for the home page and any key new page after launch.

## 8. Editorial habit to keep us consistent

Before pushing a visible update, ask:

1. Is this useful first?
2. Is the signal in the right place?
3. Is the tone kind, local, and informed?
4. Are the emojis helping instead of cluttering?
5. Should this be a ticker, a desk bulletin, a card, or nothing at all?
