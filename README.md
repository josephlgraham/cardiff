# cardiff

Cardiff Alabama

## GitHub data setup

The site now expects these generated local data files:

- `cardiff-weather.json`
- `cardiff-news-live.json`
- `ticker.json`

Those are refreshed by the workflow in `.github/workflows/refresh-site-data.yml`.

### One required GitHub secret

Add this repository secret:

- `WEATHER_API_KEY`

That keeps the weather key out of the frontend and lets GitHub Actions write the local weather file for the site to read.

### After adding the secret

1. Go to `Actions`
2. Open `Refresh Site Data`
3. Run the workflow once manually
4. Confirm these files update in the repo:
   - `cardiff-weather.json`
   - `cardiff-news-live.json`
   - `ticker.json`
