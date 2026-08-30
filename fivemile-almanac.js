/* ===========================================================================
   FIVEMILE almanac page

   The creek, the weather, and the date. Nothing else.

   Fishing, the garden, the night sky, and nature watch used to be cards down
   the bottom of this page and are now four pages of their own. What is left
   here is the reading people come for, plus one tab card per desk carrying
   that desk's line for today.

   Shared arithmetic and the month tables live in fivemile-almanac-core.js.
   The topographic background, the ticker strip, the masthead creek reading,
   the footer, and the gauge tick rails are all fivemile-common.js. This file
   only renders this page.
   =========================================================================== */
(function () {
  "use strict";

  const FA = window.FivemileAlmanac;
  if (!FA) return;

  const WX_URL = "fivemile-weather.json";
  const ARCHIVE_DIR = "fivemile-weather-archive";
  const AIR_QUALITY_URL = "fivemile-air-quality.json";
  const WATERSHED_URL = "fivemile-watershed.json";
  const WATERSHED_FORECAST_URL = "fivemile-watershed-weather.json";
  const TICKER_URL = "ticker.json";
  const DEFAULT_TICKER = "FIVEMILE · Graysville, Cardiff, Brookside · weather and roads · the creek · schools · public decisions · daily life around western Jefferson County";
  const TICKER_REFRESH_MS = 5 * 60 * 1000;
  const DAYS_LONG = FA.DAYS_LONG;
  const MONTHS_LONG = FA.MONTHS_LONG;
  const STRIP_COLORS = {
    extreme: "#8b0000",
    severe: "#C8102E",
    moderate: "#b47800",
    minor: "#446b52"
  };

  /* Everything below comes from the core rather than being defined twice. The
     const bindings sit at the top of the closure so nothing reaches them
     before they exist. */
  const setText = FA.setText;
  const setHTML = FA.setHTML;
  const escapeHtml = FA.escapeHtml;
  const iconHtml = FA.iconHtml;
  const formatInches = FA.formatInches;
  const formatTemp = FA.formatTemp;
  const formatFeet = FA.formatFeet;
  const formatCfs = FA.formatCfs;
  const getSunTimes = FA.getSunTimes;
  const getMoonPhase = FA.getMoonPhase;
  const formatClock = FA.formatClock;
  const directionFromDegrees = FA.directionFromDegrees;
  const weatherCondition = FA.weatherCondition;
  const conditionIcon = FA.conditionIcon;
  const pressureNote = FA.pressureNote;
  const groundCondition = FA.groundCondition;
  const creekMood = FA.creekMood;
  const trendEmoji = FA.trendEmoji;

  const ALMANAC_FACTS = [
    { kicker: "Five Mile Creek", title: "Creek bends make their own weather", body: "Creek bottoms often hold cooler dawn air, a touch more humidity, and a little extra growing time compared with the nearby ridges." },
    { kicker: "Old Garden Sense", title: "Leaf mulch is future soil", body: "A pile of leaves on the ground here is not clutter. It is moisture retention, weed suppression, and next season's garden structure." },
    { kicker: "Moon Lore", title: "Bright nights change movement", body: "People who hunt, fish, and garden all watch the moon because brighter nights can change feeding, visibility, and when the woods feel active." },
    { kicker: "Watershed Note", title: "Rain upstream still counts here", body: "A creek can rise from weather you never felt at home. Watching upstream rain is part of reading local water." },
    { kicker: "Fieldcraft", title: "Morning tells on the ground", body: "The first hour after sunrise shows dew lines, tracks, spider webs, and fresh disturbance better than the middle of the day does." },
    { kicker: "Season Marker", title: "Dogwoods are a clock", body: "People have long used bloom timing as a rough local calendar because plants respond to accumulated warmth, not just the date on paper." },
    { kicker: "Fishing Note", title: "Stable weather usually helps", body: "A few settled days often make creek fish more predictable than a sharp front swinging through overnight." }
  ];

  let latestWeatherPayload = null;
  let watershedLeadGauge = null;
  let watershedChartRange = 7;
  let chartDrawnWidth = -1;

  function showCard(id, visible) {
    const node = document.getElementById(id);
    if (node) node.style.display = visible ? "" : "none";
  }

  function emojiText(icon, text) {
    return iconHtml(icon) + " " + text;
  }

  function setEmojiText(id, icon, text) {
    setHTML(id, emojiText(icon, text));
  }

  function multiEmojiText(icons, text) {
    return icons.map(iconHtml).join(" ") + " " + text;
  }

  function setMultiEmojiText(id, icons, text) {
    setHTML(id, multiEmojiText(icons, text));
  }

  function numericOrNaN(value) {
    return value === null || value === undefined || value === "" ? NaN : Number(value);
  }

  function formatGaugeDay(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function quantile(values, q) {
    if (!Array.isArray(values) || !values.length) return NaN;
    const sorted = values.slice().sort((a, b) => a - b);
    const index = (sorted.length - 1) * q;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  function displayStageRange(points, stageNow) {
    const values = points.map((point) => point.stage_ft);
    const rawMin = Math.min.apply(null, values);
    const rawMax = Math.max.apply(null, values);
    const p02 = quantile(values, 0.02);
    const p20 = quantile(values, 0.2);
    const p80 = quantile(values, 0.8);
    const p98 = quantile(values, 0.98);
    const focusMin = Number.isFinite(p20) ? p20 : rawMin;
    const focusMax = Number.isFinite(p80) ? p80 : rawMax;
    const focusSpread = Math.max(focusMax - focusMin, 0.12);
    const rawSpread = Math.max(rawMax - rawMin, 0.16);
    const latestStage = Number.isFinite(stageNow) ? stageNow : values[values.length - 1];
    let displayMin = Math.min(rawMin, latestStage) - rawSpread * 0.03;
    let displayMax = Math.max(rawMax, latestStage) + rawSpread * 0.05;

    if (rawSpread > focusSpread * 1.55) {
      displayMin = Math.min(focusMin, latestStage, Number.isFinite(p02) ? p02 : focusMin) - Math.max(focusSpread * 0.1, 0.04);
      displayMax = Math.max(focusMax, latestStage, Number.isFinite(p98) ? p98 : focusMax) + Math.max(focusSpread * 0.12, 0.05);
    }

    if (!Number.isFinite(displayMin) || !Number.isFinite(displayMax) || displayMax <= displayMin) {
      displayMin = rawMin;
      displayMax = rawMax + 0.2;
    }

    const padding = Math.max((displayMax - displayMin) * 0.025, 0.03);
    displayMin -= padding;
    displayMax += padding;

    return {
      rawMin,
      rawMax,
      displayMin,
      displayMax,
      clippedTop: rawMax > displayMax,
      clippedBottom: rawMin < displayMin
    };
  }

  function relativeGaugeTime(value) {
    if (!value) return "Sync pending";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sync pending";
    const diffHours = Math.round((Date.now() - date.getTime()) / 36e5);
    if (diffHours <= 0) return "Updated just now";
    if (diffHours < 24) return "Updated " + diffHours + "h ago";
    const diffDays = Math.round(diffHours / 24);
    return "Updated " + diffDays + "d ago";
  }

  function chartRangeLabel(days) {
    return days >= 30 ? "Month view" : "Week view";
  }

  function sanitizeGaugeHistory(history) {
    return Array.isArray(history)
      ? history
          .map((entry) => ({
            at: entry && entry.at ? entry.at : "",
            stage_ft: numericOrNaN(entry && entry.stage_ft)
          }))
          .filter((entry) => Number.isFinite(entry.stage_ft) && entry.at)
          .sort((a, b) => new Date(a.at) - new Date(b.at))
      : [];
  }

  function historySpanDays(points) {
    if (!points.length) return 0;
    const first = new Date(points[0].at);
    const last = new Date(points[points.length - 1].at);
    return Math.max(1, Math.round((last - first) / 86400000));
  }

  function filterHistoryRange(points, rangeDays) {
    if (!points.length) return [];
    const lastDate = new Date(points[points.length - 1].at);
    const startCutoff = new Date(lastDate);
    startCutoff.setDate(startCutoff.getDate() - Math.max(1, rangeDays));
    const filtered = points.filter((point) => new Date(point.at) >= startCutoff);
    return filtered.length >= 2 ? filtered : points;
  }

  function formatDeltaFeet(value) {
    if (!Number.isFinite(value)) return "Flat read";
    if (Math.abs(value) < 0.01) return "Barely moved";
    return (value > 0 ? "+" : "") + value.toFixed(2) + " ft";
  }

  function findPointNear(points, hoursBack) {
    if (!points.length) return null;
    const lastTime = new Date(points[points.length - 1].at).getTime();
    const target = lastTime - (hoursBack * 3600000);
    let best = points[0];
    let bestDiff = Math.abs(new Date(best.at).getTime() - target);
    points.forEach((point) => {
      const diff = Math.abs(new Date(point.at).getTime() - target);
      if (diff < bestDiff) {
        best = point;
        bestDiff = diff;
      }
    });
    return best;
  }

  function setWatershedRangeButtons(points) {
    const availableDays = historySpanDays(points);
    const monthReady = availableDays >= 20;
    document.querySelectorAll(".watershed-range-btn").forEach((btn) => {
      const range = Number(btn.getAttribute("data-range") || 7);
      const allowed = range === 7 || monthReady;
      btn.disabled = !allowed;
      if (!allowed && range === watershedChartRange) {
        watershedChartRange = 7;
      }
      btn.classList.toggle("active", range === watershedChartRange);
    });
  }

  /* The box the chart is drawn into, in CSS pixels, measured off the element
     it is about to be written into. The viewBox used to be a fixed 760 by 336
     against a box that is 928 by 270 on a laptop, and preserveAspectRatio did
     what it is supposed to do with the mismatch: it scaled the whole drawing
     down to fit the shorter side and centred it, so the chart came out 545
     wide inside a card 960 wide with 383 pixels of nothing on either side of
     it. Measuring means one viewBox unit is one pixel and none of that
     happens. Height comes from the same breakpoint the stylesheet uses.
     See DECISIONS.md 45. */
  function chartBox() {
    const node = document.getElementById("watershedChart");
    const measured = node ? Math.round(node.clientWidth) : 0;
    const narrow = window.matchMedia && window.matchMedia("(max-width:560px)").matches;
    return {
      measured: measured,
      narrow: narrow,
      width: Math.max(measured || 760, 300),
      height: narrow ? 250 : 270
    };
  }

  function buildWatershedChart(history, label, trend, stageNow) {
    const allPoints = sanitizeGaugeHistory(history);
    const availableDays = historySpanDays(allPoints);
    setWatershedRangeButtons(allPoints);
    const points = filterHistoryRange(allPoints, watershedChartRange);
    const mood = creekMood(stageNow);
    if (points.length < 2) {
      return {
        meta: (label || "Lead gauge") + " · " + chartRangeLabel(watershedChartRange),
        values: { current: formatFeet(stageNow), change: "Need more history", range: "—", mood: mood },
        chart: '<div class="watershed-chart-empty">A ' + (watershedChartRange >= 30 ? "thirty-day" : "seven-day") + ' stage chart will appear here after the live gauge file refreshes.</div>'
      };
    }

    /* The gutters. The plot used to run to all four edges of the box, which
       left the two stage figures sitting on top of the line they measure and
       the top one clipped in half by the edge of the box, and it left the
       dates along the bottom crowded against the baseline. Each axis has room
       of its own now: feet down the left, dates across the bottom. */
    const box = chartBox();
    chartDrawnWidth = box.measured;
    const width = box.width;
    const height = box.height;
    /* The gutters are a share of the box, not a fixed number of pixels. Set at
       68 and 26 they cost 94px, which is a sixth of a desktop card and well
       over a quarter of a phone. On a 390px screen that left 232px of actual
       creek. The phone gets tighter gutters and smaller axis type, which is
       what fivemile-almanac.css sets at the same breakpoint. */
    const narrow = box.narrow;
    const padLeft = narrow ? 44 : 68;
    const padRight = narrow ? 14 : 26;
    const padTop = 22;
    const padBottom = 34;
    /* The nose. The plot frame runs the full width between the gutters, and
       the readings stop short of it, so the dot on today's level sits inside
       the chart instead of straddling the edge with half of it outside. It was
       drawn at exactly the right hand edge before, which is where a 4.2 radius
       circle with a 2px collar has nowhere to go.

       Half a day cell, which is what it looks like on the month view and is
       where the idea came from. Clamped at both ends because a day cell on the
       week view is a hundred and twenty pixels and half of that is a hole, and
       because ten pixels is the least that clears the dot. The frame, the
       gridlines and the baseline all still run to the true edge, so what is
       left over reads as an empty cell at the end rather than as a chart that
       has been cropped. */
    const plotWidth = width - padLeft - padRight;
    const padNose = Math.max(10, Math.min(24, plotWidth / Math.max(watershedChartRange, 1) / 2));
    const dataRight = width - padRight - padNose;
    /* How far the feet figures sit off the plot. */
    const axisGap = narrow ? 6 : 10;
    /* "1.38 ft" is 52px of mono even at 11px, which does not fit a phone
       gutter and was hanging off the left edge of the box. The phone gets the
       bare figure and the unit moves to the line above the chart, where it is
       said once instead of twice. */
    const feet = (value) => value.toFixed(2) + (narrow ? "" : " ft");
    /* How close a day number may come to either end before it is dropped, so
       it never collides with the two dates already on the baseline. It scales
       with the type, or a narrow chart loses most of its days. */
    const dayCuff = narrow ? 34 : 54;
    const axisBaseline = height - 12;
    const stageRange = displayStageRange(points, stageNow);
    const min = stageRange.rawMin;
    const max = stageRange.rawMax;
    const displayMin = stageRange.displayMin;
    const displayMax = stageRange.displayMax;
    const range = Math.max(displayMax - displayMin, 0.2);
    const lastIndex = Math.max(points.length - 1, 1);
    const coords = points.map((point, index) => {
      const x = padLeft + (index / lastIndex) * (dataRight - padLeft);
      const stage = Math.max(displayMin, Math.min(displayMax, point.stage_ft));
      const y = padTop + ((displayMax - stage) / range) * (height - padTop - padBottom);
      return { x, y };
    });
    const polyline = coords.map((point) => point.x.toFixed(1) + "," + point.y.toFixed(1)).join(" ");
    /* The two shaded bands stop with the readings rather than running on to
       the frame, or the last value would be smeared flat across the nose. */
    const topArea = ([
      [padLeft, padTop],
      [dataRight, padTop],
      ...coords.slice().reverse().map((point) => [point.x, point.y]),
      [coords[0].x, coords[0].y]
    ]).map((point) => point[0].toFixed(1) + "," + point[1].toFixed(1)).join(" ");
    const bottomArea = ([
      [coords[0].x, coords[0].y],
      ...coords.map((point) => [point.x, point.y]),
      [dataRight, height - padBottom],
      [padLeft, height - padBottom]
    ]).map((point) => point[0].toFixed(1) + "," + point[1].toFixed(1)).join(" ");
    const latest = points[points.length - 1];
    const previous24h = findPointNear(allPoints, 24);
    const change24h = previous24h ? latest.stage_ft - previous24h.stage_ft : NaN;
    const firstLabel = formatGaugeDay(points[0].at);
    const lastLabel = formatGaugeDay(points[points.length - 1].at);
    const changeLabel = Number.isFinite(change24h) ? formatDeltaFeet(change24h) : "Need more history";
    const metaSuffix = availableDays >= watershedChartRange ? chartRangeLabel(watershedChartRange) : ("Last " + availableDays + " days loaded");
    const chartNote = stageRange.clippedTop || stageRange.clippedBottom
      ? '<div class="watershed-note">Scaled toward the everyday creek range so smaller rises stay readable. Big spikes still count in the tiles above.</div>'
      : "";

    const dayMarkers = [];
    let prevDayKey = "";
    points.forEach((point, index) => {
      const date = new Date(point.at);
      if (Number.isNaN(date.getTime())) return;
      const dayKey = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
      if (dayKey !== prevDayKey) {
        dayMarkers.push({ x: coords[index].x, label: String(date.getDate()), index });
        prevDayKey = dayKey;
      }
    });
    const usableRight = dataRight;
    const dayGridlines = dayMarkers
      .filter((marker) => marker.index !== 0)
      .map((marker) => '<line x1="' + marker.x.toFixed(1) + '" y1="' + padTop + '" x2="' + marker.x.toFixed(1) + '" y2="' + (height - padBottom) + '" stroke="rgba(80,44,8,0.1)" stroke-width="1"/>')
      .join("");
    let lastDayLabelX = -100;
    const dayLabels = dayMarkers
      .filter((marker) => marker.index !== 0 && marker.x >= padLeft + dayCuff && marker.x <= usableRight - dayCuff)
      .filter((marker) => {
        if (marker.x - lastDayLabelX >= 30) {
          lastDayLabelX = marker.x;
          return true;
        }
        return false;
      })
      .map((marker) => '<text class="watershed-axis" x="' + marker.x.toFixed(1) + '" y="' + axisBaseline + '" text-anchor="middle">' + escapeHtml(marker.label) + "</text>")
      .join("");

    return {
      meta: (label || "Lead gauge") + " · " + metaSuffix + (narrow ? " · Feet" : ""),
      values: {
        current: formatFeet(stageNow),
        change: changeLabel,
        range: min.toFixed(2) + "–" + max.toFixed(2) + " ft",
        mood: mood
      },
      chart: '<svg viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="' + escapeHtml((label || "Lead gauge") + " creek stage history") + '">' +
        '<rect x="' + padLeft + '" y="' + padTop + '" width="' + (width - padLeft - padRight) + '" height="' + (height - padTop - padBottom) + '" rx="12" fill="rgba(49,120,72,0.12)"/>' +
        '<polygon points="' + topArea + '" fill="rgba(57,133,75,0.18)"/>' +
        '<polygon points="' + bottomArea + '" fill="rgba(32,96,160,0.18)"/>' +
        '<line x1="' + padLeft + '" y1="' + (padTop + (height - padTop - padBottom) * 0.33) + '" x2="' + (width - padRight) + '" y2="' + (padTop + (height - padTop - padBottom) * 0.33) + '" stroke="rgba(80,44,8,0.08)" stroke-width="1"/>' +
        '<line x1="' + padLeft + '" y1="' + (padTop + (height - padTop - padBottom) * 0.66) + '" x2="' + (width - padRight) + '" y2="' + (padTop + (height - padTop - padBottom) * 0.66) + '" stroke="rgba(80,44,8,0.08)" stroke-width="1"/>' +
        '<line x1="' + padLeft + '" y1="' + (height - padBottom) + '" x2="' + (width - padRight) + '" y2="' + (height - padBottom) + '" stroke="rgba(80,44,8,0.18)" stroke-width="1"/>' +
        dayGridlines +
        '<polyline fill="none" stroke="#0f5c6d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="' + polyline + '"/>' +
        '<circle cx="' + coords[coords.length - 1].x.toFixed(1) + '" cy="' + coords[coords.length - 1].y.toFixed(1) + '" r="4.2" fill="#0f5c6d" stroke="#faf6ee" stroke-width="2"/>' +
        '<text class="watershed-axis" x="' + padLeft + '" y="' + axisBaseline + '">' + escapeHtml(firstLabel) + "</text>" +
        '<text class="watershed-axis" x="' + dataRight.toFixed(1) + '" y="' + axisBaseline + '" text-anchor="end">' + escapeHtml(lastLabel) + "</text>" +
        dayLabels +
        '<text class="watershed-axis" x="' + (padLeft - axisGap) + '" y="' + (padTop + 4) + '" text-anchor="end">' + escapeHtml(feet(displayMax)) + "</text>" +
        '<text class="watershed-axis" x="' + (padLeft - axisGap) + '" y="' + (height - padBottom + 4) + '" text-anchor="end">' + escapeHtml(feet(displayMin)) + "</text>" +
        "</svg>" + chartNote
    };
  }

  /* One pass paints the four gauge tiles and the line under them, so the tiles
     and the chart can never disagree about what the creek is doing. */
  function renderWatershedChartPanel() {
    const gauge = watershedLeadGauge;
    const stageNow = gauge ? numericOrNaN(gauge.stage_ft) : NaN;
    const chart = buildWatershedChart(
      gauge && gauge.stage_history ? gauge.stage_history : [],
      gauge ? (gauge.label || gauge.name || "Lead gauge") : "Lead gauge",
      gauge ? gauge.trend : "steady",
      stageNow
    );
    setText("watershedChartMeta", chart.meta);
    setHTML("watershedChart", chart.chart);

    const values = chart.values || {};
    const mood = values.mood || creekMood(stageNow);
    const discharge = gauge ? numericOrNaN(gauge.discharge_cfs) : NaN;
    const trend = gauge && gauge.trend ? gauge.trend : "steady";

    paintTile("creekStage", values.current || formatFeet(stageNow), mood.label + ". " + mood.note);
    paintTile("creekFlow", formatCfs(discharge), Number.isFinite(discharge)
      ? "Cubic feet a second past the Republic gauge, running " + trend + "."
      : "The gauge is not reporting a flow right now.");
    paintTile("creekChange", values.change || "—", Number.isFinite(stageNow)
      ? "Stage against the same hour yesterday."
      : "A day of history is needed before this reads anything.");

    /* Two of the four marks carry a reading of their own, the way the creek
       mark on the homepage does. The level tile takes the mark the masthead
       pill is already showing, so a reader who saw the pill on the way down
       the page meets the same object at the gauge. The change tile takes the
       arrow. Both are labelled, because a mark that reads is not decoration.

       Flow and rain keep the marks set in the page. Neither has a second
       state, so there is nothing for a live one to say. */
    FA.setTileMark("creekStage", mood.icon, mood.label);
    if (Number.isFinite(stageNow)) FA.setTileMark("creekChange", trendEmoji(trend), "Creek " + trend);
  }

  /* A gauge tile is a value and a sentence. Never one without the other: a
     figure with nothing under it is a widget. */
  function paintTile(id, value, sentence) {
    setHTML(id + "Val", value == null ? "&mdash;" : escapeHtml(value));
    setText(id + "Sub", sentence || "This reading is not coming through right now.");
  }

  function preferredGauge(gauges) {
    const list = Array.isArray(gauges) ? gauges : [];
    return list.find((gauge) => Array.isArray(gauge.stage_history) && gauge.stage_history.length)
      || list.find((gauge) => Number.isFinite(numericOrNaN(gauge.stage_ft)))
      || list.find((gauge) => gauge.role === "lead")
      || list[0]
      || null;
  }

  function centralHourNow() {
    return Number(new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      hour12: false
    }).format(new Date()));
  }

  function windIcon(speed) {
    if (speed < 5) return "🍃";
    if (speed < 15) return "💨";
    return "🌬";
  }

  function tempNote(temp) {
    if (temp >= 90) return "Heat-stress kind of day";
    if (temp >= 80) return "Warm enough for shade breaks";
    if (temp >= 65) return "Comfortable working weather";
    if (temp >= 50) return "Light jacket early, easy later";
    if (temp >= 35) return "Cold enough to slow the morning";
    return "Hard-cold conditions";
  }

  function humidityNote(humidity) {
    if (humidity >= 85) return "Air feels heavy and sticky";
    if (humidity >= 70) return "Moist air helps dew linger";
    if (humidity >= 50) return "Balanced moisture in the air";
    return "Dry for this part of Alabama";
  }

  function windNote(speed) {
    if (speed >= 18) return "Strong enough to move treetops";
    if (speed >= 10) return "Enough breeze to cool the bottoms";
    if (speed >= 4) return "Light movement in open spots";
    return "Mostly still air";
  }

  function uvNote(uv) {
    if (!Number.isFinite(uv)) return "UV reading offline";
    if (uv >= 8) return "High exposure in open sun";
    if (uv >= 5) return "Moderate sun strength";
    if (uv >= 2) return "Mild sun load";
    return "Low UV right now";
  }

  /* The sky marks, the day labels, and the rule about a period that has been
     and gone are all fivemile-common.js now. The homepage, the news page, and
     this one read the same weather file, and each used to keep its own table
     of sky words. See DECISIONS.md 44. */
  function forecastReader() {
    return window.FivemileWx;
  }

  function refreshWeatherEmojiLayer(wx, ground, pressure) {
    setEmojiText("wxTemp", conditionIcon(wx.condition), wx.temp + "°F");
    setEmojiText("wxHum", "💧", wx.humidity + "%");
    setEmojiText("wxWind", windIcon(wx.windSpeed), Math.round(wx.windSpeed) + " mph");
    setEmojiText("wxRain", ground.icon, ground.title);
    setEmojiText("wxPressure", pressure.icon, Number.isFinite(wx.pressureIn) ? wx.pressureIn.toFixed(2) + '"' : "—");
    setEmojiText("wxUV", "☀️", Number.isFinite(wx.uv) ? String(Math.round(wx.uv)) : "—");

    const labels = document.querySelectorAll("#wx-card .wx-lbl");
    if (labels.length >= 6) {
      labels[0].textContent = "Temperature";
      labels[1].textContent = "Humidity";
      labels[2].textContent = "Wind";
      labels[3].textContent = "Ground";
      labels[4].textContent = "Pressure";
      labels[5].textContent = "UV Index";
    }
  }

  function refreshRainEmojiLayer(yesterdayRain, rawData) {
    const yest = Number.isFinite(yesterdayRain) ? yesterdayRain : null;
    const weekly = rawData && Number.isFinite(rawData.weeklyRain) ? rawData.weeklyRain : null;
    const monthly = rawData && Number.isFinite(rawData.monthlyRain) ? rawData.monthlyRain : null;
    const yearly = rawData && Number.isFinite(rawData.yearlyRain) ? rawData.yearlyRain : null;
    setHTML("rainYesterday", emojiText("📅", formatInches(yest)));
    setHTML("rainWeekly", emojiText("📆", formatInches(weekly)));
    setHTML("rainMonthly", emojiText("🗂️", formatInches(monthly)));
    setHTML("rainYearly", emojiText("📏", formatInches(yearly)));
  }

  function buildRainSummary(yesterdayRain, rawData) {
    const yest = Number.isFinite(yesterdayRain) ? yesterdayRain : null;
    const weekly = rawData && Number.isFinite(rawData.weeklyRain) ? rawData.weeklyRain : null;
    const monthly = rawData && Number.isFinite(rawData.monthlyRain) ? rawData.monthlyRain : null;
    const yearly = rawData && Number.isFinite(rawData.yearlyRain) ? rawData.yearlyRain : null;
    setText("rainYesterday", formatInches(yest));
    setText("rainWeekly", formatInches(weekly));
    setText("rainMonthly", formatInches(monthly));
    setText("rainYearly", formatInches(yearly));
  }

  function buildMorningReport(report) {
    const card = document.getElementById("morning-card");
    if (card) card.style.display = centralHourNow() < 12 ? "" : "none";
    if (!report) {
      setHTML("morningBody",
        '<div class="report-stack"><div class="report-row"><div class="report-label">Weather desk</div><div class="report-value">Waiting on the station log.</div></div></div>'
      );
      return;
    }

    const rainAmount = Number(report.amount || 0);
    const lowTemp = Number(report.lowTemp);
    const windGust = Number(report.windGust || 0);
    const topLine = rainAmount >= 0.01
      ? "The Cardiff station picked up " + formatInches(rainAmount) + " " + report.label.toLowerCase() + "."
      : "No measurable rain " + report.label.toLowerCase() + ".";
    const note = rainAmount >= 0.2
      ? "Enough water fell to change footing, soften ground, and freshen the creek edges."
      : rainAmount >= 0.01
        ? "It was enough to settle dust and leave a readable little trace on the ground."
        : "This was more of a dry-night read than a rain-night one.";

    setHTML("morningBody",
      '<div class="report-stack">' +
        '<div class="report-row"><div class="report-label">Here\'s what you missed</div><div class="report-value">' + topLine + '</div><div class="report-note">' + note + "</div></div>" +
        '<div class="report-row"><div class="report-label">Low temperature</div><div class="report-value">' + formatTemp(lowTemp) + '</div><div class="report-note">The coolest point the station logged ' + report.label.toLowerCase() + ".</div></div>" +
        '<div class="report-row"><div class="report-label">Strongest gust</div><div class="report-value">' + (windGust > 0 ? Math.round(windGust) + " mph" : "Light air") + '</div><div class="report-note">Useful for knowing whether the night stayed quiet or worked the trees a little.</div></div>' +
      "</div>"
    );
  }

  /* The rain tile reads the watershed file rather than the station file,
     because the watershed run is the one that carries a month-to-date total
     already reconciled against the gauge record. */
  function paintRainTile(rainContext) {
    if (!rainContext || !Number.isFinite(Number(rainContext.monthToDate))) {
      paintTile("creekRain", null, "Waiting on the station file.");
      return;
    }
    const total = Number(rainContext.monthToDate);
    const label = rainContext.monthLabel || "this month";
    paintTile("creekRain", total.toFixed(2) + '"',
      "Rain measured at the Cardiff station so far in " + label + ".");
  }

  async function loadWatershed() {
    try {
      const response = await fetch(WATERSHED_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("watershed");
      const data = await response.json();
      const gauges = Array.isArray(data.gauges) ? data.gauges : [];
      const primary = preferredGauge(gauges);
      watershedLeadGauge = primary || null;
      setText("watershedUpdated", primary ? relativeGaugeTime(primary.updated_at) : "Gauge sync pending");
      renderWatershedChartPanel();
      paintRainTile(data.rainContext);

      const stage = primary ? numericOrNaN(primary.stage_ft) : NaN;
      if (Number.isFinite(stage)) {
        const mood = creekMood(stage);
        setText("watershedScience", data.summary ||
          "Stage is the height of the water at the gauge. Flow is how much of it is going past. Read together they say whether the creek is loafing or working.");
        FA.setRailSub("almanac", stage.toFixed(2) + " ft · " + mood.label);
        const creekPill = document.getElementById("mhCreekPill");
        if (creekPill) creekPill.textContent = mood.icon + " " + stage.toFixed(2) + " ft · " + mood.label;
      } else {
        setText("watershedScience", "Live creek numbers drop in here after the watershed file refreshes.");
        FA.setRailSub("almanac", "Gauge sync pending");
      }
    } catch (error) {
      watershedLeadGauge = null;
      setText("watershedUpdated", "Gauge sync offline");
      setText("watershedChartMeta", "Lead gauge · Week view");
      setHTML("watershedChart", '<div class="watershed-chart-empty">Creek depth is offline until the gauge file comes back.</div>');
      setText("watershedScience", "Use the weather, the rain totals, and the color of the water as backup clues until the gauge file comes back.");
      ["creekStage", "creekFlow", "creekChange", "creekRain"].forEach(function (id) {
        paintTile(id, null, "The gauge file is not answering right now.");
      });
      FA.setRailSub("almanac", "Gauge sync offline");
    }
  }

  function forecastCondition(code) {
    if (!Number.isFinite(code)) return "";
    const word = forecastReader().codeWord(code);
    return word ? forecastReader().codeChar(code) + " " + word : "";
  }

  /* Graysville, Cardiff, Brookside. West to east, every time.

     The generator writes the three points in that order and says in its own
     comment that the page is expected to look them up by name rather than
     trust the file. This page was not doing that, so a feed that came back in
     a different order put the towns on screen in a different order. Sorting
     here means the rule holds no matter what the file says. See DECISIONS.md 1
     and the town order rule in CLAUDE.md. */
  const TOWN_ORDER = ["Graysville", "Cardiff", "Brookside"];

  /* Three rows, always, whatever the file happens to hold. Sorting what
     arrived was not enough: a run that lost a town wrote a file with two towns
     in it and the card came up with two rows, which reads as a decision rather
     than as a gap. A town with no reading gets its name and an em dash, which
     is the empty state this site uses everywhere else. The fetcher no longer
     drops a town either; this is the half that does not need a data run to
     take effect. */
  function orderTowns(places) {
    const byName = new Map((places || []).map((place) => [place && place.place, place]));
    const rows = TOWN_ORDER.map((name) => byName.get(name) || { place: name, today: null });
    for (const place of places || []) {
      if (place && TOWN_ORDER.indexOf(place.place) === -1) rows.push(place);
    }
    return rows;
  }

  function renderForecastPlace(place) {
    const today = place && place.today ? place.today : null;
    const hi = today ? numericOrNaN(today.hi) : NaN;
    const lo = today ? numericOrNaN(today.lo) : NaN;
    const temps = Number.isFinite(hi) && Number.isFinite(lo)
      ? Math.round(hi) + "° / " + Math.round(lo) + "°"
      : "—";
    const precip = today && Number.isFinite(numericOrNaN(today.precipChance))
      ? Math.round(numericOrNaN(today.precipChance)) + "% rain"
      : "";
    const condition = forecastCondition(today ? numericOrNaN(today.weatherCode) : NaN);
    const detail = [condition, precip].filter(Boolean).join(" · ") || "—";
    return '<div class="wf-place">' +
      '<div class="wf-name">' + escapeHtml(place.place || "Nearby") + '</div>' +
      '<div class="wf-temp">' + escapeHtml(temps) + '</div>' +
      '<div class="wf-cond">' + escapeHtml(detail) + '</div>' +
      "</div>";
  }

  async function loadWatershedForecast() {
    try {
      const response = await fetch(WATERSHED_FORECAST_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("watershed forecast");
      const data = await response.json();
      const places = Array.isArray(data.places) ? data.places : [];
      if (!places.length) throw new Error("watershed forecast empty");
      setText("watershedForecastUpdated", "Today's high and low");
      setHTML("watershedForecastGrid", orderTowns(places).map(renderForecastPlace).join(""));
    } catch (error) {
      setText("watershedForecastUpdated", "Forecast sync offline");
      /* All three, not Cardiff standing in for the watershed. See CLAUDE.md. */
      setHTML("watershedForecastGrid", orderTowns([]).map(renderForecastPlace).join(""));
    }
  }

  function lightningNote(alerts) {
    const thunderAlert = (alerts || []).find((alert) => /thunderstorm|tornado|lightning/i.test((alert.event || "") + " " + (alert.headline || "")));
    if (thunderAlert) {
      return '<div class="alert-banner"><strong>⚡ Lightning caution:</strong> Any active thunderstorm warning, watch, or nearby thunder mention should be treated like real lightning risk over these three towns.</div>';
    }
    return '<div class="alert-calm"><strong>⚡ Lightning desk:</strong> No lightning-related public alert is active right now. Direct strike tracking can come later if we add a dedicated source.</div>';
  }

  function buildAlerts(alerts) {
    if (alerts && alerts.length) {
      setHTML("alertsBody",
        lightningNote(alerts) +
        '<div class="alert-stack" style="margin-top:0.7rem;">' +
        alerts.slice(0, 3).map((alert) => (
          '<div class="alert-row"><div class="alert-label">Active alert</div><div class="alert-value">' + (alert.emoji || "⚠️") + " " + (alert.headline || alert.event || "Weather alert") + '</div><div class="alert-note">' + ((alert.endsShort ? "Through " + alert.endsShort + ". " : "") + (alert.description || "Jefferson County alert from the weather desk.")) + "</div></div>"
        )).join("") +
        "</div>"
      );
      return;
    }

    setHTML("alertsBody",
      '<div class="alert-calm"><strong>Weather desk is quiet right now.</strong> No active Jefferson County alerts are posted at the moment.</div>' +
      '<div style="margin-top:0.7rem;">' + lightningNote([]) + "</div>"
    );
  }

  function buildAlertsActiveOnly(alerts) {
    const card = document.getElementById("alerts-card");
    if (!alerts || !alerts.length) {
      if (card) card.style.display = "none";
      setHTML("alertsBody", "");
      return;
    }

    const thunderAlert = alerts.find((alert) => /thunderstorm|tornado|lightning/i.test((alert.event || "") + " " + (alert.headline || "")));
    const lightning = thunderAlert
      ? '<div class="alert-banner"><strong>Lightning caution:</strong> Any active thunderstorm warning, watch, or nearby thunder mention should be treated like real lightning risk over these three towns.</div>'
      : "";

    if (card) card.style.display = "";
    setHTML("alertsBody",
      (lightning ? lightning : "") +
      '<div class="alert-stack" style="margin-top:' + (lightning ? "0.7rem" : "0") + ';">' +
      alerts.slice(0, 3).map((alert) => (
        '<div class="alert-row"><div class="alert-label">Active alert</div><div class="alert-value">' + (alert.emoji || "Alert") + " " + (alert.headline || alert.event || "Weather alert") + '</div><div class="alert-note">' + ((alert.endsShort ? "Through " + alert.endsShort + ". " : "") + (alert.description || "Jefferson County alert from the weather desk.")) + "</div></div>"
      )).join("") +
      "</div>"
    );
  }

  function buildYesterdayNarrative(y) {
    if (!y || !Number.isFinite(y.high) || !Number.isFinite(y.low)) {
      return "Yesterday's weather summary will appear here after the daily station log compiles.";
    }
    const rain = Number.isFinite(y.rain) ? y.rain : 0;
    let text = "Yesterday along the creek, temperatures ranged from " + y.low + "° to " + y.high + "°";
    if (rain >= 0.01) {
      text += " with " + formatInches(rain) + " of rain recorded at the station.";
    } else {
      text += " with no measurable rain.";
    }
    text += " The watershed log keeps a running record—each day’s high, low, and rainfall are preserved in the climate archive.";
    return text;
  }

  function formatArchiveDate(dateKey) {
    const parts = String(dateKey).split("-").map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return "";
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  function buildWeather(wx, rain, dailySummary, rawData, prevDay) {
    const ground = groundCondition(wx.precipTotal, wx.humidity);
    const ds = dailySummary || null;

    // Prefer the station's own previous-day record from the climate archive.
    // The regional model (dailySummary) is only a fallback if the archive is unavailable.
    const station = prevDay && Number.isFinite(prevDay.high) && Number.isFinite(prevDay.low);
    const yHigh = station ? prevDay.high : (ds && Number.isFinite(ds.yesterdayHigh) ? ds.yesterdayHigh : null);
    const yLow = station ? prevDay.low : (ds && Number.isFinite(ds.yesterdayLow) ? ds.yesterdayLow : null);
    const yRain = station
      ? (Number.isFinite(prevDay.rain) ? prevDay.rain : null)
      : (ds && Number.isFinite(ds.yesterdayRain) ? ds.yesterdayRain : null);
    const hasYesterday = Number.isFinite(yHigh) && Number.isFinite(yLow);

    // Card date tag — the actual date of the day being shown
    let dateLabel = "";
    if (station && prevDay.date) {
      dateLabel = formatArchiveDate(prevDay.date);
    } else {
      const obsDate = new Date(wx.obsTime || Date.now());
      const yesterday = new Date(obsDate);
      yesterday.setDate(yesterday.getDate() - 1);
      dateLabel = yesterday.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
    setText("wxUpdated", dateLabel);
    setText("wxReadStamp", dateLabel);

    // The three yesterday readings.
    if (hasYesterday) {
      setText("wxYestHigh", yHigh + "°F");
      setText("wxYestLow", yLow + "°F");
      setText("wxYestRain", formatInches(yRain));
    } else {
      setText("wxYestHigh", "—");
      setText("wxYestLow", "—");
      setText("wxYestRain", "—");
    }

    // hero conditions box: yesterday range
    if (hasYesterday) {
      setText("heroCond", yHigh + "°–" + yLow + "°F");
      setText("heroCondSub", "Yesterday’s temperature range");
    } else {
      setText("heroCond", "—");
      setText("heroCondSub", "Daily summary pending first run");
    }

    // hero ground condition: derived from morning snapshot moisture
    setHTML("heroRain", emojiText(ground.icon, ground.title));
    setText("heroRainSub", ground.note);

    // narrative and science
    setText("wxNarrative", buildYesterdayNarrative({ high: yHigh, low: yLow, rain: yRain }));
    setText("wxScience", "Daily high, low, and total rainfall give a clear picture of what yesterday brought to the Five Mile Creek watershed.");

    buildRainSummary(yRain, rawData);
    buildMorningReport(rain && rain.morningReport ? rain.morningReport : null);
    refreshRainEmojiLayer(yRain, rawData);
  }

  function summarizeWeather(wx) {
    const pieces = [];
    pieces.push(wx.temp + "°F");
    pieces.push(wx.condition.toLowerCase());
    if (wx.windSpeed >= 4) pieces.push("wind around " + Math.round(wx.windSpeed) + " mph");
    if (wx.humidity >= 75) pieces.push("humid air in the bottoms");
    if (wx.precipRate > 0.05) pieces.push("active precipitation");
    return "Right now along the creek it feels " + pieces.join(", ") + ".";
  }

  async function loadPrevDayFromArchive() {
    try {
      const data = await window.FivemileYearArchive(ARCHIVE_DIR);
      const days = Array.isArray(data.days) ? data.days : [];
      if (!days.length) return null;
      const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
      const past = days.filter((d) => d && d.date && d.date < todayKey);
      return past.length ? past[past.length - 1] : null;
    } catch (error) {
      return null;
    }
  }

  async function loadWeather() {
    try {
      const response = await fetch(WX_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("weather");
      const data = await response.json();
      const cur = data.current;
      if (!cur) throw new Error("weather");
      const wx = {
        temp: Math.round(Number(cur.temp)),
        feels: Math.round(Number(cur.feelsLike || cur.feels || cur.temp)),
        humidity: Math.round(Number(cur.humidity || 0)),
        windSpeed: Number(cur.windSpeed || 0),
        windDir: cur.windDir || 'Calm',
        precipRate: Number(cur.hourlyRain || cur.precipRate || 0),
        precipTotal: Number(cur.dailyRain || cur.precipTotal || 0),
        pressureIn: Number(cur.pressure || cur.pressureIn || 0),
        uv: Number(cur.uv),
        obsTime: cur.lastUpdated || cur.obsTime,
        condition: cur.condition || weatherCondition(cur)
      };
      wx.summary = summarizeWeather(wx);
      latestWeatherPayload = data;
      const summary = data.dailySummary || null;
      const rain = data.rain || null;
      const prevDay = await loadPrevDayFromArchive();

      buildWeather(wx, rain, summary, data, prevDay);
      renderDesks(wx);
      return wx;
    } catch (error) {
      latestWeatherPayload = null;
      setText("wxUpdated", "Station offline");
      setText("wxNarrative", "The weather station data did not load. The rest of the almanac is still available.");
      setText("wxYestHigh", "—");
      setText("wxYestLow", "—");
      setText("wxYestRain", "—");
      setHTML("heroCond", emojiText("📡", "Station offline"));
      setText("heroCondSub", "Yesterday's range will return when the station data loads.");
      setHTML("heroRain", emojiText("🥾", "Check the ground"));
      setText("heroRainSub", "Walk the yard or creek edge for the real footing report.");
      setText("rainYesterday", "—");
      setText("rainWeekly", "—");
      setText("rainMonthly", "—");
      setText("rainYearly", "—");
      buildMorningReport(null);
      renderDesks(null);
      return null;
    }
  }

  function getStripColor(alerts) {
    if (!alerts || !alerts.length) return "";
    return STRIP_COLORS[(alerts[0].severity || "").toLowerCase()] || STRIP_COLORS.moderate;
  }

  function setTickerMotion(stripText, shouldScroll, message) {
    if (!stripText) return;
    if (shouldScroll) {
      const speed = Math.max(20, Math.round(32 * (message.length / 100)));
      stripText.style.setProperty("animation", "marquee " + speed + "s linear infinite", "important");
      stripText.style.setProperty("padding-left", "100%", "important");
      stripText.style.setProperty("transform", "", "important");
      return;
    }
    stripText.style.setProperty("animation", "none", "important");
    stripText.style.setProperty("padding-left", "0", "important");
    stripText.style.setProperty("transform", "none", "important");
  }

  function sirenTestWindow() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 3=Wed
    const date = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();
    // Must be Wednesday
    if (day !== 3) return false;
    // Must be first Wednesday of the month (date <= 7)
    if (date > 7) return false;
    // Must be between 9:50 AM and 10:05 AM
    const totalMin = hour * 60 + minute;
    return totalMin >= 590 && totalMin <= 605;
  }

  const SIREN_MSG = "🚨 SIREN TEST IN PROGRESS — Jefferson County is testing outdoor warning sirens today (first Wednesday of the month, 10:00 AM, 3 minutes). This is a test only. No action needed. jeffcoema.org/sirens";

  function applySirenNotice() {
    if (!sirenTestWindow()) return;
    const stripText = document.querySelector(".announce-strip-text");
    const strip = document.querySelector(".announce-strip");
    if (stripText) {
      stripText.textContent = SIREN_MSG;
      setTickerMotion(stripText, true, SIREN_MSG);
    }
    if (strip) strip.style.background = "";
  }

  async function loadTicker() {
    try {
      const response = await fetch(TICKER_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("ticker");
      const data = await response.json();
      const stripText = document.querySelector(".announce-strip-text");
      const strip = document.querySelector(".announce-strip");
      if (stripText) {
        const message = (data.ticker || DEFAULT_TICKER).trim();
        stripText.textContent = data.hasAlerts ? message : "";
        setTickerMotion(stripText, !!data.hasAlerts, message);
      }
      if (strip) {
        const color = getStripColor(data.alerts);
        strip.style.background = (data.hasAlerts && color) ? color : "";
      }
      buildAlertsActiveOnly(Array.isArray(data.alerts) ? data.alerts : []);
      applySirenNotice();
    } catch (error) {
      const stripText = document.querySelector(".announce-strip-text");
      if (stripText) {
        stripText.textContent = "";
        setTickerMotion(stripText, false, "");
      }
      buildAlertsActiveOnly([]);
      applySirenNotice();
    }
  }

  function setupWatershedRangeControls() {
    document.querySelectorAll(".watershed-range-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextRange = Number(btn.getAttribute("data-range") || 7);
        if (btn.disabled || nextRange === watershedChartRange) return;
        watershedChartRange = nextRange;
        renderWatershedChartPanel();
      });
    });
  }

  /* The viewBox is measured, so anything that changes the width of the box
     wants the chart drawn again rather than stretched to fit. A phone turned
     on its side is the obvious one. The one that actually bites is the first
     load of the day: the masthead intro gate can still be holding the page
     when the gauge file lands, the box measures zero, and the chart draws
     against the fallback width. Watching the box catches both, and it costs
     nothing on a load where the width never moves. */
  function setupWatershedChartSizing() {
    const node = document.getElementById("watershedChart");
    if (!node) return;
    let timer = 0;
    const redraw = () => {
      const width = chartBox().measured;
      if (!width || width === chartDrawnWidth || !watershedLeadGauge) return;
      renderWatershedChartPanel();
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(redraw, 120);
    };
    /* Both, on purpose. The observer is the one that catches the box coming
       back from zero width when the intro gate lets the page go, and the
       resize event is the one that still works if the observer is missing or
       is not delivering. The redraw is a no-op unless the measured width has
       actually moved, so hearing about the same change twice costs nothing. */
    if (window.ResizeObserver) {
      new ResizeObserver(schedule).observe(node);
    }
    window.addEventListener("resize", schedule);
  }

  const DAY_COUNTS = ["No days", "One day", "Two days", "Three days", "Four days",
    "Five days", "Six days", "Seven days"];

  /* One cell a day for as far ahead as the file reaches. The grid is seven
     wide, and it used to be fed six daylight periods off the top of the file
     without checking whether any of them had already been and gone, so an
     evening reader got yesterday in the first cell and a Wednesday reader got
     four days of a week. Days come off the shared reader now: the daylight
     half of each day carries the high and the sky, the night that follows it
     carries the low, and a day whose daylight has run out drops off the front
     rather than showing with a hole where its high was. */
  function renderWeek(forecastPeriods) {
    const days = forecastReader().days(forecastPeriods).slice(0, 7);
    if (!days.length) {
      setText("weekSpan", "—");
      setHTML("weekBody", "—");
      return;
    }

    const now = new Date();
    setText("weekSpan", DAY_COUNTS[days.length] || days.length + " days");
    setHTML("weekBody", '<div class="week-grid">' + days.map((entry) => {
      const day = entry.day;
      const hi = Number(day.temperature);
      const lo = entry.night ? Number(entry.night.temperature) : NaN;
      const temp = Number.isFinite(lo)
        ? Math.round(hi) + "° / " + Math.round(lo) + "°"
        : Math.round(hi) + "°";
      return '<div class="week-item">' +
        '<div class="week-item-icon">' + escapeHtml(forecastReader().markChar(day.shortForecast)) + "</div>" +
        '<div class="week-item-day">' + escapeHtml(forecastReader().label(day, now, "short")) + "</div>" +
        '<div class="week-item-temp">' + escapeHtml(temp) + "</div>" +
        '<div class="week-item-note">' + escapeHtml(day.shortForecast || "—") + "</div>" +
        "</div>";
    }).join("") + "</div>");
  }

  function loadForecast() {
    fetch(WX_URL, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("forecast");
        return response.json();
      })
      .then((data) => {
        renderWeek(Array.isArray(data.forecast) ? data.forecast : []);
      })
      .catch(() => {
        setText("weekSpan", "—");
        setHTML("weekBody", "—");
      });
  }

  function airQualityLabel(payload) {
    const current = payload && payload.current ? payload.current : null;
    if (!current) return "🌫 Air desk pending";
    const category = current.category || "Air snapshot";
    const aqi = Number(current.usAqi);
    return Number.isFinite(aqi) ? "🌿 " + category + " · AQI " + Math.round(aqi) : "🌫 " + category;
  }

  function renderAirQuality(data) {
    const current = data && data.current ? data.current : null;
    const aqi = current ? Number(current.usAqi) : NaN;
    const pm25 = current ? Number(current.pm25) : NaN;
    const ozone = current ? Number(current.ozone) : NaN;
    if (!current || (!Number.isFinite(aqi) && !Number.isFinite(pm25) && !Number.isFinite(ozone))) {
      showCard("air-card", false);
      return;
    }

    showCard("air-card", true);
    setText("airUpdated", airQualityLabel(data));
    setHTML("airBody",
      '<div class="report-stack">' +
        '<div class="report-row"><div class="report-label">🌫️ Air quality index</div><div class="report-value">' + escapeHtml((current.category || "Air snapshot") + (Number.isFinite(aqi) ? " · AQI " + Math.round(aqi) : "")) + '</div><div class="report-note">' + escapeHtml(current.label || current.note || "Live air quality snapshot for these three towns.") + "</div></div>" +
        '<div class="report-row"><div class="report-label">🫁 Fine particles</div><div class="report-value">' + escapeHtml(Number.isFinite(pm25) ? pm25.toFixed(1) + " " + (current.pm25Unit || "μg/m³") : "—") + '</div><div class="report-note">PM2.5 often shows up as the kind of extra haze you feel in your chest and notice in the night sky.</div></div>' +
        '<div class="report-row"><div class="report-label">☀️ Ozone</div><div class="report-value">' + escapeHtml(Number.isFinite(ozone) ? ozone.toFixed(1) + " " + (current.ozoneUnit || "μg/m³") : "—") + '</div><div class="report-note">' + escapeHtml(current.note || "Outdoor air can feel different when ozone or particulates start creeping up.") + "</div></div>" +
      "</div>" +
      '<div class="sci-box"><div class="sci-label">🔭 Sky desk crossover</div><p>Cleaner air usually means better transparency, while extra haze can flatten the faint-star contrast even when the clouds behave themselves.</p></div>'
    );
  }

  async function loadAirQuality() {
    try {
      const response = await fetch(AIR_QUALITY_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("air");
      const data = await response.json();
      renderAirQuality(data);
    } catch (error) {
      showCard("air-card", false);
    }
  }

  /* -------------------------------------------------------------------------
     THE FOUR DESKS

     One tab card each, carrying today's reading and opening the page that
     explains it. The point of the split was that none of these four could be
     any good as a card, so what stays here is only enough to tell a reader
     whether it is worth the tap.
     ------------------------------------------------------------------------- */
  function renderDesks(wx) {
    const now = new Date();
    const month = now.getMonth();
    const sun = getSunTimes(now);
    const moon = getMoonPhase(now);
    const stage = watershedLeadGauge ? numericOrNaN(watershedLeadGauge.stage_ft) : NaN;

    /* Fishing. The reading a person wants off this card is whether it is worth
       going, so the blurb is the best-rated species and why. */
    if (wx) {
      const water = FA.estimateWaterTemp(wx.temp, month);
      const rows = FA.fishingRows(wx);
      const window = FA.bestFishingWindow(wx);
      const best = rows.slice().sort((a, b) => b.stars.length - a.stars.length)[0];
      setText("deskFishTag", best ? best.name : "Creek conditions");
      setText("deskFishWater", water + "°F");
      setText("deskFishWindow", window.time);
      setText("deskFishNote", best ? best.note : "Water, species, seasons, and the rules.");
      FA.setRailSub("fishing", water + "°F water · " + window.time);
    } else {
      setText("deskFishTag", "Station offline");
      setText("deskFishWater", "—");
      setText("deskFishWindow", "—");
      setText("deskFishNote", "The daily ratings come back when the weather station file loads.");
    }
    setText("deskFishCreek", Number.isFinite(stage) ? creekMood(stage).label : "—");

    // Garden
    const plant = FA.PLANTING_GUIDE[month];
    if (plant) {
      setText("deskGardenTag", MONTHS_LONG[month]);
      setText("deskGardenJob", plant.items[0].name);
      setText("deskGardenNote", plant.lead);
      FA.setRailSub("garden", plant.items[0].action + " " + plant.items[0].name.toLowerCase());
    }
    const frost = FA.nextFrost(now);
    setText("deskGardenFrost", frost.days + " days");
    if (wx) {
      setText("deskGardenGround", groundCondition(wx.precipTotal, wx.humidity).title);
    }

    // Night sky
    const nextFull = FA.nextMoonPhase(now, "Full Moon");
    const shower = FA.nextMeteorShower(now);
    setText("deskSkyTag", Math.round(FA.moonAge(now)) + " days in");
    setText("deskSkyMoon", moon.icon + " " + moon.name);
    setText("deskSkyFull", nextFull ? FA.MONTHS_SHORT[nextFull.getMonth()] + " " + nextFull.getDate() : "—");
    setText("deskSkyMeteor", shower ? shower.name : "—");
    setText("deskSkyNote", moon.lore);
    FA.setRailSub("sky", moon.name);

    // Nature watch
    const nature = FA.NATURE_GUIDE[month];
    if (nature) {
      setText("deskNatureTag", MONTHS_LONG[month]);
      setText("deskNatureLook", nature.items[0].title);
      setText("deskNatureNote", nature.lead);
      FA.setRailSub("nature", nature.items[0].title);
    }
    const windows = FA.seasonEntries(now, ["nature", "hunting", "frost", "tradition"], 3);
    setText("deskNatureWindow", windows.length ? windows[0].title : "—");
    setText("deskNatureLight", (Math.round(FA.dayLengthHours(sun) * 10) / 10) + " hours");
  }

  function buildFact(date) {
    const fact = ALMANAC_FACTS[FA.dayOfYear(date) % ALMANAC_FACTS.length];
    setText("factKicker", fact.kicker);
    setText("factTitle", fact.title);
    setText("factBody", fact.body);
  }

  function buildDateHero(date, sun, moon) {
    const age = Math.round(FA.moonAge(date));
    const daylight = Math.round(FA.dayLengthHours(sun) * 10) / 10;
    setText("dateDayName", DAYS_LONG[date.getDay()]);
    setText("dateBig", String(date.getDate()));
    setText("dateMonthName", MONTHS_LONG[date.getMonth()]);
    setText("dateYearNum", String(date.getFullYear()));
    setText("almStamp", date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
    setText("sunTimes", formatClock(sun.rise) + " · " + formatClock(sun.set));
    setText("sunSpan", daylight + " hours");
    setText("dayLength", daylight + " hours of daylight");
    setText("heroMoon", moon.icon + " " + moon.name);
    setText("heroMoonSub", "Moon age in cycle: " + age + " days");
  }

  function buildStaticSections() {
    const now = new Date();
    const sun = getSunTimes(now);
    const moon = getMoonPhase(now);
    buildDateHero(now, sun, moon);
    buildFact(now);
    renderDesks(null);
  }

  function boot() {
    FA.renderRail("almanac");
    buildStaticSections();
    setupWatershedRangeControls();
    setupWatershedChartSizing();
    loadTicker();
    loadWatershed();
    loadWatershedForecast();
    loadWeather();
    loadAirQuality();
    loadForecast();
    window.setInterval(loadTicker, TICKER_REFRESH_MS);
    window.setInterval(loadWatershed, 10 * 60 * 1000);
    window.setInterval(loadWatershedForecast, 30 * 60 * 1000);
    window.setInterval(loadWeather, 5 * 60 * 1000);
    window.setInterval(loadAirQuality, 15 * 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
