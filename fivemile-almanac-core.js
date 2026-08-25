/* ===========================================================================
   FIVEMILE almanac core

   Everything the five almanac-family pages share: the desk rail, the sun and
   moon arithmetic, the small formatting helpers, and the month tables the
   garden and nature desks read.

   This file was cut out of fivemile-almanac.js when the almanac split into
   five pages. The rule is that a table or a calculation used by more than one
   page lives here and nowhere else. The almanac page still owns its own
   rendering, and each desk owns its own, but none of them keeps a second copy
   of the planting year or a second way of working out the moon.

   Load order on every family page: this file, then the page's own script.
   fivemile-season-data.js is separate and stays separate. It is the calendar's
   data and the calendar page reads it too.

   The topographic background, the ticker strip, the masthead creek reading and
   the footer are all fivemile-common.js. Nothing in here touches them.
   =========================================================================== */
(function () {
  "use strict";

  /* The middle of the three, near enough for sun times across towns that sit inside
     four miles of each other. */
  const LAT = 33.640;
  const LON = -86.870;

  const WX_URL = "fivemile-weather.json";
  const WATERSHED_URL = "fivemile-watershed.json";
  const SKY_WATCH_URL = "fivemile-skywatch.json";
  const AIR_QUALITY_URL = "fivemile-air-quality.json";

  /* The gauge the creek reads off. Republic is the only live gauge left in the
     watershed, and a dead gauge answers 200 with zeros rather than failing, so
     the id is pinned here and the link out goes to the real station page. */
  const LEAD_GAUGE_ID = "02457595";
  const LEAD_GAUGE_URL = "https://waterdata.usgs.gov/monitoring-location/02457595/";

  const WDIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* -------------------------------------------------------------------------
     THE DESK RAIL

     One definition, five pages. A page calls renderRail with its own key and
     gets the row back with itself marked. The line under each name is a
     standing description until the page replaces it with something live.
     ------------------------------------------------------------------------- */
  const DESKS = [
    { key: "almanac", href: "fivemile-almanac.html",  name: "Almanac",      sub: "The creek and the weather" },
    { key: "fishing", href: "fivemile-fishing.html",  name: "Fishing",      sub: "The water and the fish" },
    { key: "garden",  href: "fivemile-garden.html",   name: "Garden",       sub: "What to plant now" },
    { key: "sky",     href: "fivemile-nightsky.html", name: "Night Sky",    sub: "The moon and the stars" },
    { key: "nature",  href: "fivemile-nature.html",   name: "Nature Watch", sub: "What to look for" }
  ];

  /* Every item carries an arrow. The first pass did not, and five tiles that
     named a page without pointing anywhere read as headings rather than as
     doors, which is exactly how they were treated.

     On a desk page the almanac entry leads with a left arrow instead. That is
     the way back up, and a reader who has opened Fishing needs the way home to
     look different from the way sideways. */
  function renderRail(currentKey) {
    const host = document.querySelector("[data-desk-rail]");
    if (!host) return;
    host.innerHTML = DESKS.map((desk) => {
      const current = desk.key === currentKey;
      const isBack = desk.key === "almanac" && currentKey !== "almanac";
      const arrow = current ? "" : '<span class="desk-go" aria-hidden="true">' + (isBack ? "&larr;" : "&rarr;") + "</span>";
      return '<a class="desk-item' + (isBack ? " back" : "") + '" data-desk="' + desk.key + '" href="' + desk.href + '"' +
        (current ? ' aria-current="page"' : "") + ">" +
        '<span class="desk-text">' +
          '<span class="desk-name">' + escapeHtml(desk.name) + "</span>" +
          '<span class="desk-sub" data-desk-sub="' + desk.key + '">' + escapeHtml(desk.sub) + "</span>" +
        "</span>" + arrow + "</a>";
    }).join("");
  }

  /* The way back at the foot of a desk page. Written into whatever carries
     data-desk-back, so the four desk pages do not each keep their own copy of
     the markup. */
  function renderBackLink() {
    const host = document.querySelector("[data-desk-back]");
    if (!host) return;
    host.innerHTML = '<a class="desk-back" href="fivemile-almanac.html">' +
      '<span class="a" aria-hidden="true">&larr;</span>' +
      "<span><b>Almanac</b><i>The creek at Republic, yesterday's weather, and the week ahead.</i></span>" +
      "</a>";
  }

  /* A desk reporting its own live line into the rail. Silent when the rail is
     not on the page, so a page can call it without checking first. */
  function setRailSub(key, text) {
    const node = document.querySelector('[data-desk-sub="' + key + '"]');
    if (node && text) node.textContent = text;
  }

  /* -------------------------------------------------------------------------
     DOM AND TEXT HELPERS
     ------------------------------------------------------------------------- */
  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function setHTML(id, value) {
    const node = document.getElementById(id);
    if (node) node.innerHTML = value;
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* Emoji is wrapped so it takes the emoji stack rather than Plus Jakarta
     Sans, which renders several of these as tofu. */
  function iconHtml(icon) {
    return '<i class="emoji" aria-hidden="true">' + escapeHtml(icon) + "</i>";
  }

  function formatInches(value) {
    return Number.isFinite(value) ? value.toFixed(2) + '"' : "—";
  }

  function formatTemp(value) {
    return Number.isFinite(value) ? Math.round(value) + "°" : "—";
  }

  function formatFeet(value) {
    return Number.isFinite(value) ? value.toFixed(2) + " ft" : "—";
  }

  function formatCfs(value) {
    return Number.isFinite(value) ? Math.round(value).toLocaleString("en-US") + " cfs" : "—";
  }

  async function fetchJSON(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("fetch failed: " + url);
    return response.json();
  }

  /* -------------------------------------------------------------------------
     SUN, MOON, AND THE DATE

     Lifted unchanged from the almanac. The sunrise and sunset arithmetic is
     the NOAA general solar position approximation, accurate to about a minute
     at this latitude and needing no network.
     ------------------------------------------------------------------------- */
  function dayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);
  }

  function formatClock(date) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function minutesToTime(date, minutes) {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    const hours = Math.floor(normalized / 60);
    const mins = Math.round(normalized % 60);
    const out = new Date(date);
    out.setHours(hours, mins, 0, 0);
    return out;
  }

  function getSunTimes(date) {
    const day = dayOfYear(date);
    const gamma = 2 * Math.PI / 365 * (day - 1 + ((date.getHours() - 12) / 24));
    const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
    const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
    const latRad = LAT * Math.PI / 180;
    const hourAngle = Math.acos((Math.cos(90.833 * Math.PI / 180) / (Math.cos(latRad) * Math.cos(decl))) - Math.tan(latRad) * Math.tan(decl));
    const timezoneOffsetHours = -date.getTimezoneOffset() / 60;
    const solarNoonMinutes = 720 - (4 * LON) - eqtime + (timezoneOffsetHours * 60);
    const sunriseMinutes = solarNoonMinutes - (hourAngle * 180 / Math.PI) * 4;
    const sunsetMinutes = solarNoonMinutes + (hourAngle * 180 / Math.PI) * 4;
    return { rise: minutesToTime(date, sunriseMinutes), set: minutesToTime(date, sunsetMinutes) };
  }

  function dayLengthHours(sun) {
    return (sun.set - sun.rise) / 3600000;
  }

  function directionFromDegrees(deg) {
    if (!Number.isFinite(deg)) return "Calm";
    return WDIRS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
  }

  const MOON_PHASES = [
    { name: "New Moon", icon: "🌑", min: 0, max: 1.85, lore: "Dark nights make stars stronger and animal movement easier to hear than see.", science: "A new moon means the moon is roughly between Earth and the sun, so the lit side faces away from us." },
    { name: "Waxing Crescent", icon: "🌒", min: 1.85, max: 7.38, lore: "Old almanac readers took the first light as a sign to start adding things back into the week.", science: "The illuminated fraction grows each evening, adding a little more moonlight after sunset." },
    { name: "First Quarter", icon: "🌓", min: 7.38, max: 11.07, lore: "Half-lit nights are a good time to notice how moonlight changes the feel of fields and creek bends.", science: "From Earth we see half the near side lit because the moon has moved one quarter of the way around its orbit." },
    { name: "Waxing Gibbous", icon: "🌔", min: 11.07, max: 14.77, lore: "This is when the moon begins to dominate the evening sky and stretch useful light later into the night.", science: "The moon is approaching full, so the visible illuminated portion keeps expanding toward a complete disk." },
    { name: "Full Moon", icon: "🌕", min: 14.77, max: 16.61, lore: "Bright nights change how the woods look and how people move through them. Even the creek sounds different under a full moon.", science: "The Earth sits roughly between the sun and moon, so the moon's Earth-facing side is fully illuminated." },
    { name: "Waning Gibbous", icon: "🌖", min: 16.61, max: 22.15, lore: "After full, the bright hours shift later into the night and toward dawn.", science: "The moon is still mostly lit, but the illuminated area shrinks a little each night after full." },
    { name: "Last Quarter", icon: "🌗", min: 22.15, max: 25.84, lore: "Morning people notice this one first. It hangs over the early day rather than the evening.", science: "Again we see a half-lit moon, but now it is the opposite half compared with first quarter." },
    { name: "Waning Crescent", icon: "🌘", min: 25.84, max: 29.53, lore: "The moon gives back the night a little at a time before the cycle resets.", science: "Only a thin illuminated slice remains visible before the moon returns to new." }
  ];

  function moonAge(date) {
    const knownNew = new Date(2000, 0, 6, 18, 14, 0);
    return (((date - knownNew) / 86400000) % 29.53 + 29.53) % 29.53;
  }

  function getMoonPhase(date) {
    const age = moonAge(date);
    return MOON_PHASES.find((entry) => age >= entry.min && age < entry.max) || MOON_PHASES[0];
  }

  /* The next date the moon reaches a named phase, walked a day at a time. Good
     enough for a page that says around the fourteenth and never claims a
     minute. */
  function nextMoonPhase(date, name) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    for (let i = 1; i <= 40; i += 1) {
      const probe = new Date(start);
      probe.setDate(start.getDate() + i);
      const before = new Date(probe.getTime() - 86400000);
      if (getMoonPhase(probe).name === name && getMoonPhase(before).name !== name) return probe;
    }
    return null;
  }

  /* -------------------------------------------------------------------------
     WEATHER READINGS

     The station file is written by the daily Ambient Weather pull. Everything
     below turns a reading into a sentence, which is the almanac's whole job. A
     number with no meaning attached is a widget.
     ------------------------------------------------------------------------- */
  function weatherCondition(cur) {
    const temp = Number(cur.temp);
    const humidity = Number(cur.humidity);
    const hourlyRain = Number(cur.hourlyRain || cur.precipRate || 0);
    const solar = Number(cur.solarRadiation || 0);
    const wind = Number(cur.windSpeed || 0);
    const hour = new Date().getHours();
    if (hourlyRain > 0.05) return "Rain";
    if (solar > 700) return "Sunny";
    if (solar > 350) return "Partly cloudy";
    if (solar < 30 && hour > 7 && hour < 19) return "Overcast";
    if (temp > 90) return "Hot";
    if (temp > 76) return humidity > 72 ? "Warm & humid" : "Warm";
    if (temp > 58) return wind > 12 ? "Breezy" : "Mild";
    return "Cold";
  }

  function conditionIcon(condition) {
    if (condition === "Rain") return "🌧";
    if (condition === "Sunny") return "☀️";
    if (condition === "Hot") return "🌡";
    if (condition === "Overcast") return "☁️";
    if (condition === "Breezy") return "🌬";
    if (condition === "Cold") return "🥶";
    if (condition === "Warm & humid") return "💧";
    return "🌤";
  }

  function pressureNote(pressureIn) {
    if (!Number.isFinite(pressureIn)) return { label: "Steady", note: "No pressure signal available.", icon: "🧭" };
    if (pressureIn >= 30.15) return { label: "High and settled", note: "Usually steadier skies and more predictable creek conditions.", icon: "📈" };
    if (pressureIn >= 29.95) return { label: "Moderate", note: "A fair-weather middle ground with no strong front signal.", icon: "🧭" };
    return { label: "Lower pressure", note: "Often means a front is near or the air is turning more unsettled.", icon: "🌦️" };
  }

  function groundCondition(precipTotal, humidity) {
    if (precipTotal >= 0.3) return { title: "Soft and muddy", note: "The ground is taking on water right now.", icon: "🫧" };
    if (precipTotal >= 0.05) return { title: "Freshly damp", note: "Good scent, soft tracks, and slick creek banks.", icon: "🥾" };
    if (humidity >= 80) return { title: "Holding moisture", note: "Shade and bottoms will stay damp longer than open ground.", icon: "🌿" };
    if (humidity >= 60) return { title: "Normal footing", note: "Neither baked out nor soupy in most spots.", icon: "🪵" };
    return { title: "Dry on top", note: "Open ground will crust faster than shaded creek edges.", icon: "☀️" };
  }

  /* Normalized station reading, or null when the file is not answering. Every
     desk that wants the weather calls this rather than reaching into the JSON
     shape itself, so a change to the feed is one edit. */
  async function readWeather() {
    try {
      const data = await fetchJSON(WX_URL);
      const cur = data.current;
      if (!cur) return null;
      const wx = {
        temp: Math.round(Number(cur.temp)),
        feels: Math.round(Number(cur.feelsLike || cur.feels || cur.temp)),
        humidity: Math.round(Number(cur.humidity || 0)),
        windSpeed: Number(cur.windSpeed || 0),
        windDir: cur.windDir || "Calm",
        precipRate: Number(cur.hourlyRain || cur.precipRate || 0),
        precipTotal: Number(cur.dailyRain || cur.precipTotal || 0),
        pressureIn: Number(cur.pressure || cur.pressureIn || 0),
        uv: Number(cur.uv),
        obsTime: cur.lastUpdated || cur.obsTime,
        condition: cur.condition || weatherCondition(cur)
      };
      wx.raw = data;
      return wx;
    } catch (error) {
      return null;
    }
  }

  /* The lead gauge, or null. Same contract as readWeather. */
  async function readCreek() {
    try {
      const data = await fetchJSON(WATERSHED_URL);
      const gauges = Array.isArray(data.gauges) ? data.gauges : [];
      const lead = gauges.find((gauge) => gauge.id === (data.leadGaugeId || LEAD_GAUGE_ID)) ||
        gauges.find((gauge) => gauge.role === "lead") || gauges[0] || null;
      if (!lead) return null;
      return {
        gauge: lead,
        stage: Number(lead.stage_ft),
        discharge: Number(lead.discharge_cfs),
        trend: lead.trend || "steady",
        summary: data.summary || "",
        rain: data.rainContext || null,
        updatedAt: data.updatedAt || lead.updated_at || null,
        raw: data
      };
    } catch (error) {
      return null;
    }
  }

  /* What a stage reading means to somebody standing on the bank. The bands and
     the wording are the almanac's own and predate the split. A creek read is
     never a safety clearance: the top band tells a reader to respect the water,
     it does not tell anybody the water is fine. */
  function creekMood(stage) {
    if (!Number.isFinite(stage)) {
      return { icon: "📡", label: "Gauge watch", boat: "Desk lamp only", note: "Waiting on a fresh creek read." };
    }
    if (stage < 1.5) {
      return { icon: "🥾", label: "Low and wadable", boat: "Boot water", note: "More boots than boat at this level." };
    }
    if (stage < 2.25) {
      return { icon: "🛶", label: "Creek-peeking level", boat: "Canoe daydream", note: "Enough water to look lively without feeling pushy." };
    }
    if (stage < 3.5) {
      return { icon: "🚣", label: "Moving with purpose", boat: "Paddle craft energy", note: "The channel has more muscle and less loafing." };
    }
    return { icon: "🛟", label: "High-water caution", boat: "No joke boat water", note: "Fast, higher water deserves a respectful eye." };
  }

  function trendEmoji(trend) {
    if (trend === "rising") return "📈";
    if (trend === "falling") return "📉";
    return "🟰";
  }

  function estimateWaterTemp(temp, monthIndex) {
    const seasonalOffset = [-8, -8, -6, -4, -2, 0, 2, 2, 0, -2, -5, -7][monthIndex];
    return Math.max(40, Math.min(86, Math.round(temp + seasonalOffset)));
  }

  /* The daily ratings the fishing desk and the almanac both show. Three stars
     is the ceiling and it is not generous: a creek is a creek. */
  function fishingRows(wx) {
    const water = estimateWaterTemp(wx.temp, new Date().getMonth());
    const pressure = pressureNote(wx.pressureIn);
    const catfishScore = (wx.condition === "Rain" ? 3 : 2) + (water >= 58 ? 1 : 0);
    const bassScore = (pressure.label === "High and settled" ? 3 : 2) + (water >= 55 && water <= 75 ? 1 : 0);
    const breamScore = water >= 68 ? 3 : 2;
    return [
      {
        key: "catfish",
        icon: "🐟",
        stars: catfishScore >= 4 ? "★★★" : "★★",
        cls: catfishScore >= 4 ? "f-good" : "f-mid",
        name: "Catfish",
        note: wx.condition === "Rain" ? "Fresh color and moving water can make the creek feel alive for catfish." : "Stable warm water keeps catfish worth a try around deeper bends and cover."
      },
      {
        key: "bass",
        icon: "🐠",
        stars: bassScore >= 4 ? "★★★" : "★★",
        cls: bassScore >= 4 ? "f-good" : "f-mid",
        name: "Largemouth and spotted bass",
        note: pressure.label === "High and settled" ? "Settled weather helps fish hold more predictable edges and ambush cover." : "A changing barometer can scatter bass, so slow down and fish the obvious structure."
      },
      {
        key: "bream",
        icon: "🐡",
        stars: breamScore >= 3 ? "★★★" : "★",
        cls: breamScore >= 3 ? "f-good" : "f-low",
        name: "Bream",
        note: water >= 68 ? "Warm shallows and quiet banks make bluegill and shellcracker a solid bet." : "They are still around, but the bite usually improves once the water warms more."
      }
    ];
  }

  function bestFishingWindow(wx) {
    if (wx.temp >= 82) return { time: "First light", icon: "🌅", note: "Cooler water and softer light help." };
    if (wx.condition === "Rain") return { time: "Before the shower", icon: "🌦️", note: "Pressure changes can wake things up briefly." };
    return { time: "Late afternoon", icon: "🌇", note: "A stable evening window looks strongest." };
  }

  /* -------------------------------------------------------------------------
     THE PLANTING YEAR

     Zone 7b to 8a, creek bottomland. The two frost dates the whole table hangs
     off are the ones already carried in fivemile-season-data.js: last spring
     frost around March 20, first fall frost around November 15. They are not
     restated as data here, so there is one place to correct them.

     Timing follows the Alabama Cooperative Extension planting guide for
     Central Alabama. The garden page carries the link and says so, because a
     planting date with no source is somebody's opinion.
     ------------------------------------------------------------------------- */
  const PLANTING_GUIDE = {
    0: {
      tag: "Steady winter work",
      lead: "A planning month. Almost nothing goes in the ground, and that is the point.",
      note: "Order seed, admit what did not work last year, and keep the winter greens picked.",
      items: [
        { icon: "🥬", name: "Collards and mustard", action: "Harvest", note: "Keep cutting outer leaves. Cold snaps sweeten the flavor." },
        { icon: "🧅", name: "Onion starts", action: "Plan", note: "Order starts now so beds are ready before the late-winter warm spell." },
        { icon: "🌱", name: "Seed order", action: "Plan", note: "Anything started indoors has to be ordered this month to be ready on time." }
      ]
    },
    1: {
      tag: "The first opening",
      lead: "The ground starts working again, and the earliest cool-season crops go in.",
      note: "Potatoes and English peas are the traditional February planting here.",
      items: [
        { icon: "🥔", name: "Irish potatoes", action: "Plant", note: "Mid-February, once the soil is workable and not soaked through." },
        { icon: "🫘", name: "English peas", action: "Plant", note: "They want the cold end of spring, so early beats late every year." },
        { icon: "🌱", name: "Tomato and pepper seed", action: "Start", note: "Start indoors now to have transplants ready after the frost date." }
      ]
    },
    2: {
      tag: "Cool season opens",
      lead: "The busiest cool-season month. Everything that tolerates a light frost goes in.",
      note: "Last spring frost lands around March 20, so the tender crops still wait.",
      items: [
        { icon: "🥕", name: "Carrots and radishes", action: "Plant", note: "Direct sow into loose soil. Bottomland beds want the drainage checked first." },
        { icon: "🥬", name: "Lettuce and spinach", action: "Plant", note: "Small successive sowings beat one big one, because they bolt when it warms." },
        { icon: "🥦", name: "Broccoli and cabbage", action: "Set out", note: "Transplants take a light frost. Seed started this late usually will not finish." }
      ]
    },
    3: {
      tag: "The main planting",
      lead: "The frost date is behind you and the warm-season garden goes in.",
      note: "The single biggest planting month of the year for this part of Alabama.",
      items: [
        { icon: "🍅", name: "Tomatoes", action: "Set out", note: "Transplants go out after the frost date. Stake them the day you plant them." },
        { icon: "🫑", name: "Peppers", action: "Set out", note: "They want warmer soil than tomatoes, so the back half of April is safer." },
        { icon: "🫘", name: "Beans", action: "Plant", note: "Snap beans go in through April. Pole beans want the first three weeks." },
        { icon: "🌽", name: "Corn", action: "Plant", note: "Plant in short blocks rather than one long row so it pollinates properly." }
      ]
    },
    4: {
      tag: "Heat crops in",
      lead: "The last of the warm-season planting, and the first real harvests.",
      note: "Okra, southern peas, and sweet potatoes are the May crops that carry the summer.",
      items: [
        { icon: "🌿", name: "Okra", action: "Plant", note: "It wants hot soil. Planted too early it sits and sulks." },
        { icon: "🫘", name: "Southern peas", action: "Plant", note: "Field peas and crowders handle the heat that stops everything else." },
        { icon: "🍠", name: "Sweet potato slips", action: "Set out", note: "Slips go out once nights stay warm. They will run all summer." }
      ]
    },
    5: {
      tag: "Tending and picking",
      lead: "Little new goes in. The work moves to water, mulch, and picking daily.",
      note: "A creek-bottom garden dries unevenly. Check the low corner before watering the whole thing.",
      items: [
        { icon: "🍅", name: "Tomatoes", action: "Harvest", note: "Pick at first blush and finish them inside, ahead of the birds and the splits." },
        { icon: "🥒", name: "Cucumbers and squash", action: "Harvest", note: "Pick small and pick often. One missed squash stops the plant setting more." },
        { icon: "🌿", name: "Mulch", action: "Tend", note: "Mulch laid now holds the moisture through the worst of July." }
      ]
    },
    6: {
      tag: "The hard middle",
      lead: "Hot, and the month the spring garden gives out. The fall garden starts here.",
      note: "Late July is when fall tomatoes and the first fall brassica seed go in.",
      items: [
        { icon: "🌽", name: "Okra and southern peas", action: "Harvest", note: "These two keep producing through heat that finishes everything else." },
        { icon: "🍅", name: "Fall tomatoes", action: "Set out", note: "A second set of transplants in late July can carry you to frost." },
        { icon: "🥦", name: "Fall brassica seed", action: "Start", note: "Start broccoli, cabbage, and collards now for setting out in September." }
      ]
    },
    7: {
      tag: "Turning to fall",
      lead: "The fall planting window opens properly, and the spring beds come out.",
      note: "The greens go in through August and carry the bed into winter.",
      items: [
        { icon: "🥬", name: "Collards", action: "Plant", note: "Sown straight into the bed now, and cut from the outside leaf by leaf right through the winter." },
        { icon: "🌱", name: "Turnips and mustard", action: "Plant", note: "Sown now they pick well into winter, and the roots sweeten after the first frost." },
        { icon: "🌱", name: "Clear spring beds", action: "Tend", note: "Pull the spent spring crops rather than letting them stand and harbor pests." }
      ]
    },
    8: {
      tag: "The fall garden",
      lead: "Cool-season crops go in, and the weather finally cooperates again.",
      note: "September planting is the most reliable of the year and the least crowded.",
      items: [
        { icon: "🥦", name: "Broccoli and cabbage", action: "Set out", note: "Transplants started in July go out now for a late fall cutting." },
        { icon: "🥬", name: "Collards and turnips", action: "Plant", note: "The classic fall planting here, and they improve after the first frost." },
        { icon: "🧄", name: "Garlic", action: "Plan", note: "Order now for planting once the ground cools in late October." }
      ]
    },
    9: {
      tag: "Last plantings",
      lead: "The final window. What goes in now is what overwinters.",
      note: "Garlic and cover crops are the October jobs that pay off next year.",
      items: [
        { icon: "🧄", name: "Garlic", action: "Plant", note: "Set cloves once the soil cools. It sits all winter and finishes in June." },
        { icon: "🥬", name: "Spinach and lettuce", action: "Plant", note: "A cold frame or a sheltered bed carries them through most winters here." },
        { icon: "🌱", name: "Cover crop", action: "Plant", note: "Anything sown on a bare bed now beats the erosion a winter of rain causes." }
      ]
    },
    10: {
      tag: "Frost arrives",
      lead: "The first frost lands around the middle of the month and closes the season.",
      note: "The ridges feel it first. The creek bottoms often hold on a week longer.",
      items: [
        { icon: "🥬", name: "Greens", action: "Harvest", note: "Collards, kale, and turnip greens all get better after a frost hits them." },
        { icon: "🍂", name: "Beds", action: "Tend", note: "Mulch or cover anything bare before the winter rain starts moving soil." },
        { icon: "🧄", name: "Garlic", action: "Watch", note: "Green tips through the mulch are normal. Leave it alone." }
      ]
    },
    11: {
      tag: "Rest and repair",
      lead: "Nothing to plant. Everything to fix.",
      note: "Tools, fences, and the notes you meant to write down in July.",
      items: [
        { icon: "🥬", name: "Winter greens", action: "Harvest", note: "Keep cutting. Cold makes collards and kale sweeter, not worse." },
        { icon: "🧄", name: "Garlic", action: "Watch", note: "Leave it be under mulch and let the roots build over winter." },
        { icon: "🌱", name: "Cover beds", action: "Rest", note: "A little protection now pays you back in spring texture and fertility." }
      ]
    }
  };

  function plantActionClass(action) {
    if (/plant|set out|start/i.test(action)) return "pa-plant";
    if (/harvest/i.test(action)) return "pa-harvest";
    return "pa-wait";
  }

  /* The two frost dates, looked up by id in fivemile-season-data.js so the
     garden desk and the almanac card cannot drift apart from the calendar. That
     file numbers its months from one, the way a person writes a date, and
     everything here is a JavaScript month index.

     The fallbacks match what that file currently carries and exist only so a
     page still says something if the data file fails to load. */
  const FROST_FALLBACK = {
    spring: { month: 2, day: 20, label: "Around Mar 20" },
    fall: { month: 10, day: 15, label: "Around Nov 15" }
  };

  function frostDates() {
    const source = window.CardiffSeasonData;
    const entries = source && Array.isArray(source.entries) ? source.entries : [];
    function find(id, fallback) {
      const entry = entries.find(function (item) { return item.id === id; });
      if (!entry || !Number.isFinite(entry.month) || !Number.isFinite(entry.day)) return fallback;
      return { month: entry.month - 1, day: entry.day, label: entry.windowLabel || fallback.label };
    }
    return {
      spring: find("last-spring-frost", FROST_FALLBACK.spring),
      fall: find("first-fall-frost", FROST_FALLBACK.fall)
    };
  }

  function nextOccurrence(date, marker) {
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const thisYear = new Date(date.getFullYear(), marker.month, marker.day);
    return thisYear >= today ? thisYear : new Date(date.getFullYear() + 1, marker.month, marker.day);
  }

  function daysBetween(a, b) {
    return Math.round((b - a) / 86400000);
  }

  /* Whichever frost date comes round next, and how far off it is. */
  function nextFrost(date) {
    const frost = frostDates();
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const spring = nextOccurrence(date, frost.spring);
    const fall = nextOccurrence(date, frost.fall);
    const next = spring < fall
      ? { when: spring, kind: "Last spring frost" }
      : { when: fall, kind: "First fall frost" };
    next.days = daysBetween(today, next.when);
    next.label = MONTHS_SHORT[next.when.getMonth()] + " " + next.when.getDate();
    next.dates = frost;
    return next;
  }

  /* -------------------------------------------------------------------------
     THE NATURE YEAR

     What is moving, blooming, calling, or changing, month by month. Written as
     things a reader can go outside and check, not as claims about particular
     animals in particular places.
     ------------------------------------------------------------------------- */
  const NATURE_GUIDE = {
    0: {
      tag: "Bare woods",
      lead: "The quietest month, and the easiest one for seeing into the woods.",
      items: [
        { icon: "🦆", title: "Winter birds on the move", note: "Creek edges and open fields stay busy with mixed flocks while the hardwood canopy is bare." },
        { icon: "🌤", title: "Clear-sky tracking", note: "Low leaves and soft ground make it easier to read prints and crossings after a cold night." },
        { icon: "🌿", title: "Moss brightens first", note: "Even in the quietest month, wet banks glow green before almost anything else does." }
      ]
    },
    1: {
      tag: "First stirrings",
      lead: "The first signs that the year has turned, and most of them are heard before they are seen.",
      items: [
        { icon: "🐸", title: "First frog talk", note: "Warm evenings can wake up the earliest calls from wet ground near the creek." },
        { icon: "🌼", title: "Edges start greening", note: "Sunny fence lines and ditch banks begin the spring show before the woods do." },
        { icon: "🪶", title: "Swelling buds", note: "Maples and elms show color in the twigs well before anything opens." }
      ]
    },
    2: {
      tag: "Green-up",
      lead: "The month everything happens at once.",
      items: [
        { icon: "🌸", title: "Understory blooms", note: "Redbud and dogwood mark the woods edges before the canopy closes over them." },
        { icon: "🐦", title: "Migrants arriving", note: "The dawn chorus gets noticeably longer and more crowded through the month." },
        { icon: "🐝", title: "First pollinators", note: "Early bees work whatever is open, which in March is mostly maples and fruit trees." }
      ]
    },
    3: {
      tag: "Full spring",
      lead: "Peak birdsong, peak green, and the creek at its most alive.",
      items: [
        { icon: "🐦", title: "Peak dawn chorus", note: "The half hour before sunrise is the loudest it will be all year." },
        { icon: "🦋", title: "Butterflies working", note: "Warm still afternoons bring them to damp ground along the creek edges." },
        { icon: "🌿", title: "Canopy closes", note: "Once the leaves are out the woods floor goes dark and the spring flowers finish." }
      ]
    },
    4: {
      tag: "Nesting",
      lead: "Loud, busy, and the month to leave young animals exactly where you find them.",
      items: [
        { icon: "🪺", title: "Nests everywhere", note: "If you find young alone, leave them. The adult is almost always nearby and waiting on you to go." },
        { icon: "🐢", title: "Turtles crossing", note: "They move to lay eggs this time of year, which is why they turn up on roads." },
        { icon: "🌾", title: "Grass heads up", note: "Field edges set seed, and that is what the seed-eating birds spend June on." }
      ]
    },
    5: {
      tag: "Early summer",
      lead: "The noise moves from birds to insects.",
      items: [
        { icon: "🪲", title: "Fireflies", note: "Damp low ground along the creek holds them longest after dark." },
        { icon: "🦗", title: "Night insects take over", note: "The evening soundscape shifts from birdsong to a steady insect wall." },
        { icon: "🌻", title: "Roadside bloom", note: "Unmowed edges carry more flower than anywhere else this month." }
      ]
    },
    6: {
      tag: "High summer",
      lead: "Everything moves early or late and hides in the middle of the day.",
      items: [
        { icon: "🦎", title: "Midday shutdown", note: "Look at first light and last light. The middle of a July day is empty on purpose." },
        { icon: "💧", title: "Water draws everything", note: "A shrinking creek concentrates tracks and birds at the few reliable spots." },
        { icon: "🌿", title: "Second growth", note: "Anything cut or browsed in spring is putting on soft new leaf now." }
      ]
    },
    7: {
      tag: "Late summer",
      lead: "The soundscape peaks and the first hints of fall show up in the light.",
      items: [
        { icon: "🦗", title: "Cicadas and katydids", note: "The loudest weeks of the year, and the easiest ones for learning calls by ear." },
        { icon: "🦋", title: "Late butterflies", note: "Goldenrod and ironweed start pulling the late-season insects into the open." },
        { icon: "🌾", title: "Seed set", note: "Grasses and weeds finish seeding, which sets up the whole autumn food supply." }
      ]
    },
    8: {
      tag: "The turn",
      lead: "Migration starts, and the heat finally breaks.",
      items: [
        { icon: "🐦", title: "Southbound migration", note: "Small birds move through in waves, mostly overnight and mostly unnoticed." },
        { icon: "🌼", title: "Goldenrod peak", note: "The single most important late-season nectar source in these fields." },
        { icon: "🌰", title: "Mast starts dropping", note: "Acorns and hickory nuts begin coming down, which moves every animal that eats them." }
      ]
    },
    9: {
      tag: "Color and mast",
      lead: "The woods change color and the ground fills up with food.",
      items: [
        { icon: "🍂", title: "Leaf color", note: "The creek bottoms usually turn later than the ridges, and hold color longer." },
        { icon: "🐿", title: "Caching season", note: "Squirrels are burying more than they will ever find, which is how oaks travel." },
        { icon: "🕷", title: "Orb weavers", note: "The big webs across a path in October have been there all year, just smaller." }
      ]
    },
    10: {
      tag: "First frost",
      lead: "The frost date lands mid-month and the year closes down fast after it.",
      items: [
        { icon: "❄️", title: "Frost changes the menu", note: "Persimmons stop puckering and greens sweeten. Both happen the same week." },
        { icon: "🦅", title: "Bare-canopy birding", note: "Once the leaves drop the same birds that were invisible in July are obvious." },
        { icon: "🍃", title: "Leaf fall finishes", note: "The creek fills with leaf litter, which is what feeds the whole aquatic system." }
      ]
    },
    11: {
      tag: "Winter woods",
      lead: "Cold, open, and the best month of the year for actually seeing things.",
      items: [
        { icon: "🦉", title: "Owls calling", note: "Great horned owls start their nesting season in the middle of winter, not spring." },
        { icon: "🐾", title: "Tracks hold", note: "Frost and mud both take a print well, and there is nothing growing to cover it." },
        { icon: "🌲", title: "Evergreens stand out", note: "Cedar, pine, and holly are the only green left, which makes them easy to map." }
      ]
    }
  };

  /* -------------------------------------------------------------------------
     METEOR SHOWERS

     The seven named showers worth a look from a backyard in Jefferson County.
     Peak dates shift a day either way from year to year, which is why every
     line reads around.
     ------------------------------------------------------------------------- */
  const METEOR_SHOWERS = [
    { name: "Quadrantids", month: 0, day: 3, note: "A short, sharp peak that rewards a cold pre-dawn watch." },
    { name: "Lyrids", month: 3, day: 22, note: "One of spring's dependable meteor checks when the sky stays dark enough." },
    { name: "Eta Aquariids", month: 4, day: 5, note: "Best before dawn, with fast meteors and a low radiant from our latitude." },
    { name: "Perseids", month: 7, day: 12, note: "The annual crowd favorite, best after midnight and before the first hint of dawn." },
    { name: "Orionids", month: 9, day: 21, note: "A strong fall shower tied to Halley's Comet, often best in the late-night hours." },
    { name: "Leonids", month: 10, day: 17, note: "Usually modest now, but still one of the named fall events worth a look." },
    { name: "Geminids", month: 11, day: 13, note: "Often the steadiest rich shower of the whole year if the moon cooperates." }
  ];

  function nextMeteorShower(date) {
    const year = date.getFullYear();
    return METEOR_SHOWERS
      .map((shower) => {
        let when = new Date(year, shower.month, shower.day);
        if (when < date) when = new Date(year + 1, shower.month, shower.day);
        return Object.assign({}, shower, { when: when });
      })
      .sort((a, b) => a.when - b.when)[0] || null;
  }

  /* -------------------------------------------------------------------------
     SEASON WINDOWS

     Read straight from fivemile-season-data.js, filtered by lane. The nature
     desk takes the natural lanes, the night sky desk takes the celestial ones,
     and the garden desk takes the frost dates. Civic dates belong to the
     calendar and never appear on a desk.
     ------------------------------------------------------------------------- */
  function seasonEntries(date, lanes, months) {
    const source = window.CardiffSeasonData;
    if (!source || typeof source.getUpcomingCalendar !== "function") return [];
    const wanted = Array.isArray(lanes) ? lanes : [lanes];
    const all = Number.isFinite(months) && typeof source.getSeasonEntries === "function"
      ? source.getSeasonEntries(date, months)
      : source.getUpcomingCalendar(date);
    return all.filter((entry) => wanted.indexOf(entry.lane) !== -1);
  }

  function seasonIcon(entry) {
    const title = (entry.title || "").toLowerCase();
    if (title.includes("frost")) return title.includes("spring") ? "❄️" : "🍂";
    if (title.includes("meteor") || title.includes("shower")) return "☄️";
    if (title.includes("moon")) return "🌕";
    if (title.includes("equinox") || title.includes("solstice")) return "🌞";
    if (title.includes("turkey")) return "🦃";
    if (title.includes("deer")) return "🦌";
    if (title.includes("fish") || title.includes("spawn")) return "🎣";
    if (title.includes("berry") || title.includes("persimmon") || title.includes("muscadine")) return "🍇";
    return "🌿";
  }

  /* ------------------------------------------------------------------------- */
  window.FivemileAlmanac = {
    LAT: LAT,
    LON: LON,
    WX_URL: WX_URL,
    WATERSHED_URL: WATERSHED_URL,
    SKY_WATCH_URL: SKY_WATCH_URL,
    AIR_QUALITY_URL: AIR_QUALITY_URL,
    LEAD_GAUGE_ID: LEAD_GAUGE_ID,
    LEAD_GAUGE_URL: LEAD_GAUGE_URL,
    DAYS_LONG: DAYS_LONG,
    DAYS_SHORT: DAYS_SHORT,
    MONTHS_LONG: MONTHS_LONG,
    MONTHS_SHORT: MONTHS_SHORT,
    MOON_PHASES: MOON_PHASES,
    PLANTING_GUIDE: PLANTING_GUIDE,
    NATURE_GUIDE: NATURE_GUIDE,
    METEOR_SHOWERS: METEOR_SHOWERS,

    renderRail: renderRail,
    renderBackLink: renderBackLink,
    setRailSub: setRailSub,
    setText: setText,
    setHTML: setHTML,
    escapeHtml: escapeHtml,
    iconHtml: iconHtml,
    formatInches: formatInches,
    formatTemp: formatTemp,
    formatFeet: formatFeet,
    formatCfs: formatCfs,
    fetchJSON: fetchJSON,

    dayOfYear: dayOfYear,
    formatClock: formatClock,
    minutesToTime: minutesToTime,
    getSunTimes: getSunTimes,
    dayLengthHours: dayLengthHours,
    directionFromDegrees: directionFromDegrees,
    moonAge: moonAge,
    getMoonPhase: getMoonPhase,
    nextMoonPhase: nextMoonPhase,

    weatherCondition: weatherCondition,
    conditionIcon: conditionIcon,
    pressureNote: pressureNote,
    groundCondition: groundCondition,
    readWeather: readWeather,
    readCreek: readCreek,
    creekMood: creekMood,
    trendEmoji: trendEmoji,
    estimateWaterTemp: estimateWaterTemp,
    fishingRows: fishingRows,
    bestFishingWindow: bestFishingWindow,
    plantActionClass: plantActionClass,
    frostDates: frostDates,
    nextOccurrence: nextOccurrence,
    daysBetween: daysBetween,
    nextFrost: nextFrost,
    seasonEntries: seasonEntries,
    seasonIcon: seasonIcon,
    nextMeteorShower: nextMeteorShower
  };
})();
