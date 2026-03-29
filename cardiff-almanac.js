(function () {
  "use strict";

  const LAT = 33.640;
  const LON = -86.870;
  const WX_URL = "cardiff-weather.json";
  const AIR_QUALITY_URL = "cardiff-air-quality.json";
  const WATERSHED_URL = "cardiff-watershed.json";
  const SKY_WATCH_URL = "cardiff-skywatch.json";
  const TICKER_URL = "ticker.json";
  const DEFAULT_TICKER = "Cardiff news desk · nearby towns · weather and roads · schools · public decisions · daily life around western Jefferson County";
  const TICKER_REFRESH_MS = 5 * 60 * 1000;
  const WDIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const STRIP_COLORS = {
    extreme: "#8b0000",
    severe: "#C8102E",
    moderate: "#b47800",
    minor: "#446b52"
  };

  const PLANTING_GUIDE = {
    0: {
      tag: "Steady winter work",
      items: [
        { icon: "🥬", name: "Collards and mustard", action: "Harvest", note: "Keep cutting outer leaves. Cold snaps sweeten the flavor." },
        { icon: "🧅", name: "Onion starts", action: "Plan", note: "Order starts now so beds are ready before the late-winter warm spell." },
        { icon: "🪵", name: "Garden beds", action: "Prepare", note: "Top up compost and leaf mold while growth is quiet and the ground is open." }
      ]
    },
    1: {
      tag: "Late-winter prep",
      items: [
        { icon: "🧅", name: "Onions and leeks", action: "Plant", note: "A good month for getting alliums rooted before the heat builds." },
        { icon: "🥔", name: "Irish potatoes", action: "Plant", note: "Start once the soil is workable and the creek bottoms are not sticky." },
        { icon: "🫛", name: "English peas", action: "Plant", note: "Get them in early so they can bloom before real spring warmth arrives." }
      ]
    },
    2: {
      tag: "Spring opening",
      items: [
        { icon: "🥔", name: "Potatoes", action: "Plant", note: "A classic creek-bottom crop now that the worst freezes are usually behind us." },
        { icon: "🥬", name: "Lettuce and greens", action: "Plant", note: "Succession sow every week or two while nights still run cool." },
        { icon: "🥕", name: "Carrots and beets", action: "Plant", note: "Keep seedbeds evenly damp. Early spring moisture helps them start well." }
      ]
    },
    3: {
      tag: "Tender plants on deck",
      items: [
        { icon: "🌽", name: "Sweet corn", action: "Plant", note: "Plant after the ground warms and the creek bottoms stop feeling cold at dawn." },
        { icon: "🫘", name: "Pole beans", action: "Plant", note: "Wait for settled warmth. Beans sulk in chilly soil." },
        { icon: "🍅", name: "Tomatoes", action: "Set out", note: "Harden them off first and keep row cover handy for late cold surprises." }
      ]
    },
    4: {
      tag: "Main garden weather",
      items: [
        { icon: "🍅", name: "Tomatoes and peppers", action: "Plant", note: "This is when the warm-season garden starts to look like itself." },
        { icon: "🥒", name: "Cucumbers and squash", action: "Plant", note: "Direct sow in rich soil and watch for fast overnight growth." },
        { icon: "🌿", name: "Basil and herbs", action: "Plant", note: "Warm nights help them take hold without sulking." }
      ]
    },
    5: {
      tag: "Keep it mulched",
      items: [
        { icon: "🌽", name: "Corn and okra", action: "Tend", note: "Side-dress, weed, and keep moisture even while the heat is still climbing." },
        { icon: "🍅", name: "Tomatoes", action: "Train", note: "Tie, prune, and mulch before the first hard push of summer humidity." },
        { icon: "🫘", name: "Beans", action: "Plant", note: "A fresh sowing now stretches the harvest deeper into summer." }
      ]
    },
    6: {
      tag: "Heat-smart gardening",
      items: [
        { icon: "🍅", name: "Tomatoes", action: "Harvest", note: "Pick often and keep airflow open through the vines." },
        { icon: "🫑", name: "Peppers and okra", action: "Harvest", note: "These love the heat once they are fully rooted." },
        { icon: "🥒", name: "Fall brassica starts", action: "Start", note: "Begin seed in shade so transplants are ready for late summer." }
      ]
    },
    7: {
      tag: "Fall garden setup",
      items: [
        { icon: "🥦", name: "Broccoli and cabbage", action: "Start", note: "Set transplants once nights soften and the worst heat breaks." },
        { icon: "🥬", name: "Collards", action: "Plant", note: "They settle in now and shine once cooler weather arrives." },
        { icon: "🥕", name: "Carrots", action: "Plant", note: "Consistent moisture matters more than anything else in August seedbeds." }
      ]
    },
    8: {
      tag: "Second-season greens",
      items: [
        { icon: "🥬", name: "Turnip greens and mustard", action: "Plant", note: "One of the easiest and most rewarding fall plantings around here." },
        { icon: "🧄", name: "Garlic bed prep", action: "Prepare", note: "Build loose, fertile rows now so cloves can go in later." },
        { icon: "🥦", name: "Brassicas", action: "Tend", note: "Protect young leaves from chewing insects while the weather is still warm." }
      ]
    },
    9: {
      tag: "Cool-season rhythm",
      items: [
        { icon: "🥬", name: "Greens", action: "Plant", note: "Keep the bed full. October is one of the prettiest months in a Southern garden." },
        { icon: "🧄", name: "Garlic", action: "Plant", note: "Plant toward the end of the month into loose, weed-free soil." },
        { icon: "🥔", name: "Sweet potatoes", action: "Harvest", note: "Lift before nights get too cool and cure them somewhere dry." }
      ]
    },
    10: {
      tag: "Tuck in winter crops",
      items: [
        { icon: "🧄", name: "Garlic", action: "Plant", note: "A prime month for a dependable garlic patch." },
        { icon: "🥬", name: "Kale and collards", action: "Harvest", note: "Flavor improves as the air turns colder." },
        { icon: "🍂", name: "Beds and mulch", action: "Prepare", note: "Leaves are not waste here. They are next spring's soil." }
      ]
    },
    11: {
      tag: "Quiet season, living soil",
      items: [
        { icon: "🥬", name: "Winter greens", action: "Harvest", note: "Pick what you need and let the patch keep working through the cold." },
        { icon: "🧄", name: "Garlic", action: "Watch", note: "Leave it be under mulch and let the roots build over winter." },
        { icon: "🌱", name: "Cover beds", action: "Rest", note: "A little protection now pays you back in spring texture and fertility." }
      ]
    }
  };

  const NATURE_GUIDE = {
    0: [
      { icon: "🦆", title: "Winter birds on the move", note: "Creek edges and open fields stay busy with mixed flocks while the hardwood canopy is bare." },
      { icon: "🌤", title: "Clear-sky tracking", note: "Low leaves and soft ground make it easier to read prints and crossings after a cold night." },
      { icon: "🌿", title: "Moss brightens first", note: "Even in the quietest month, wet banks glow green before almost anything else does." }
    ],
    1: [
      { icon: "🐸", title: "First frog talk", note: "Warm evenings can wake up the earliest calls from wet ground near the creek." },
      { icon: "🌼", title: "Edges start greening", note: "Sunny fence lines and ditch banks begin the spring show before the woods do." },
      { icon: "🕊", title: "Songbird mornings", note: "Dawn gets louder this month as territory and nesting season start up." }
    ],
    2: [
      { icon: "🌸", title: "Dogwood and redbud cues", note: "When the understory lights up, the whole watershed starts shifting into spring." },
      { icon: "🐟", title: "Creek life rising", note: "Longer days pull more visible life to the shallows and margins." },
      { icon: "🦋", title: "First pollinator push", note: "Sunny, still afternoons bring out the first real butterfly traffic." }
    ],
    3: [
      { icon: "🐝", title: "Pollinator month", note: "Bloom, warmth, and longer light make this one of the liveliest months in the bottoms." },
      { icon: "🌿", title: "Fresh edible growth", note: "Tender greens, herbs, and creekside plants grow fast enough to notice day by day." },
      { icon: "🕊", title: "Nest-building everywhere", note: "Listen for concentrated bird activity in hedges, brush piles, and edge habitat." }
    ],
    4: [
      { icon: "🪺", title: "Young wildlife season", note: "Give thickets and tall grass a little extra grace. A lot is hiding there now." },
      { icon: "🦎", title: "Warm rocks, more reptiles", note: "Sunny paths and bank edges draw out basking lizards and snakes." },
      { icon: "🌼", title: "Field margins stay busy", note: "Disturbed ground and open meadows carry a lot of insect and bird traffic this month." }
    ],
    5: [
      { icon: "🌳", title: "Deep green canopy", note: "Shade over the creek changes temperature, sound, and how far you can see into the woods." },
      { icon: "🪲", title: "Insect life spikes", note: "You notice it in the air first, then in the birds that follow it." },
      { icon: "🐢", title: "Sunny log watch", note: "Turtles love a stable warm stretch with bright afternoon light." }
    ],
    6: [
      { icon: "🎣", title: "Creek mornings matter", note: "Wildlife movement is strongest before the heat settles in for the day." },
      { icon: "🦌", title: "Edges after rain", note: "Soft soil and fresh growth make movement easier to spot after a shower." },
      { icon: "🌩", title: "Storm rhythms", note: "Summer weather changes the whole pace of the watershed from one day to the next." }
    ],
    7: [
      { icon: "🦗", title: "Late-summer soundscape", note: "Cicadas, katydids, and tree frogs take over once the air starts holding heat at dusk." },
      { icon: "🍄", title: "Moisture brings fungi", note: "A wet stretch can wake up logs, stumps, and shaded banks almost overnight." },
      { icon: "🌾", title: "Seed and grass season", note: "Field margins feed birds and small mammals even when the woods feel still." }
    ],
    8: [
      { icon: "🦅", title: "Migration hints", note: "The first real sense of movement returns to the sky on cooler mornings." },
      { icon: "🍂", title: "Light changes first", note: "Before the leaves turn, the angle of the sun starts changing the whole feel of the place." },
      { icon: "🐟", title: "Creek clarity checks", note: "Early fall is a good time to notice where current, shade, and bottom color shift." }
    ],
    9: [
      { icon: "🍁", title: "Leaf-color scouting", note: "Ridges usually start first, but creek bottoms hold their green a little longer." },
      { icon: "🦃", title: "Field-edge mornings", note: "Open patches and oak edges can get active at first light." },
      { icon: "🌰", title: "Mast season", note: "Acorns and nuts rearrange where wildlife spends its time." }
    ],
    10: [
      { icon: "🪶", title: "Quiet woods, better visibility", note: "As leaves thin out, tracks, nests, and movement all get easier to read." },
      { icon: "🍁", title: "Bottomland color", note: "The creek corridor often turns later, but it can be some of the prettiest color in the watershed." },
      { icon: "🐦", title: "Mixed flock season", note: "Small birds bunch up and work through the woods together when the weather cools." }
    ],
    11: [
      { icon: "❄️", title: "Open sightlines", note: "Bare structure makes it easier to understand the shape of the land and how water moves through it." },
      { icon: "🦌", title: "Fresh sign after cold rain", note: "Tracks and crossings show up cleanly when the ground softens again." },
      { icon: "🌙", title: "Long dark evenings", note: "Clear winter skies make the moon feel closer and the creek sound louder." }
    ]
  };

  const ALMANAC_FACTS = [
    { kicker: "Five Mile Creek", title: "Creek bends make their own weather", body: "Creek bottoms often hold cooler dawn air, a touch more humidity, and a little extra growing time compared with the nearby ridges." },
    { kicker: "Old Garden Sense", title: "Leaf mulch is future soil", body: "A pile of leaves on Cardiff ground is not clutter. It is moisture retention, weed suppression, and next season's garden structure." },
    { kicker: "Moon Lore", title: "Bright nights change movement", body: "People who hunt, fish, and garden all watch the moon because brighter nights can change feeding, visibility, and when the woods feel active." },
    { kicker: "Watershed Note", title: "Rain upstream still counts here", body: "A creek can rise from weather you never felt at home. Watching upstream rain is part of reading local water." },
    { kicker: "Fieldcraft", title: "Morning tells on the ground", body: "The first hour after sunrise shows dew lines, tracks, spider webs, and fresh disturbance better than the middle of the day does." },
    { kicker: "Season Marker", title: "Dogwoods are a clock", body: "People have long used bloom timing as a rough local calendar because plants respond to accumulated warmth, not just the date on paper." },
    { kicker: "Fishing Note", title: "Stable weather usually helps", body: "A few settled days often make creek fish more predictable than a sharp front swinging through overnight." }
  ];
  const FALLBACK_SKY_GUIDE = {
    0: {
      tag: "Winter sky",
      opening: "Long dark evenings still favor the big winter patterns. This is the time to learn bright anchor stars by shape, not by app.",
      pattern: { icon: "🔺", title: "Winter Triangle", note: "Sirius, Procyon, and Betelgeuse make a giant bright triangle across the evening sky." },
      planet: { icon: "🪐", title: "Planet alignment lane", note: "The planets stay on the sun's path through the sky, so any bright lineup will trace that same zodiac lane." },
      calendar: { icon: "❄️", title: "Deep-night season", note: "Cold clear nights often give the sharpest star views of the year if haze stays off the bottoms." },
      special: { icon: "✨", title: "Best naked-eye lesson", note: "Use the Winter Triangle first, then branch outward into Orion and the brighter winter stars around it." }
    },
    1: {
      tag: "Late winter",
      opening: "Winter stars still own the early evening, but the season is already pivoting. This is a handoff month in the sky.",
      pattern: { icon: "🔺", title: "Winter Triangle holding strong", note: "The triangle is still easy after dark, especially with Sirius blazing low in the south." },
      planet: { icon: "🪐", title: "Western dusk watch", note: "Any bright evening planet will sit low on the sunset side now, riding the same path the sun just took." },
      calendar: { icon: "🌒", title: "Moon-and-star contrast", note: "Waxing-crescent evenings are especially good for pairing moonlight with bright stars and planets." },
      special: { icon: "📍", title: "Good porch pointer month", note: "February is one of the friendliest months for teaching somebody three or four bright stars without overwhelming them." }
    },
    2: {
      tag: "Spring turnover",
      opening: "This is the month when the winter sky starts sliding west and the spring stars take over the open eastern sky.",
      pattern: { icon: "🔺", title: "Winter Triangle fading west", note: "Look soon after dark; by late evening it is already giving ground to spring patterns." },
      planet: { icon: "🪐", title: "Steeper planet lane", note: "Around the spring equinox the ecliptic stands taller after sunset, so planet pairings separate from the horizon more cleanly." },
      calendar: { icon: "🌱", title: "Equinox sky shift", note: "The March equinox changes which constellations dominate the evening and how fast twilight gives way to stars." },
      special: { icon: "⚖️", title: "Equinox effect", note: "March is when the evening sky starts feeling taller and cleaner, which helps any bright-planet alignment pull away from the sunset glow." }
    },
    3: {
      tag: "Spring sky",
      opening: "Spring rewards patience more than fireworks. The bright patterns are cleaner, farther apart, and easier to trace for beginners.",
      pattern: { icon: "🔻", title: "Spring Triangle watch", note: "Arcturus, Spica, and Regulus start to define the season once the winter figures sink away." },
      planet: { icon: "🪐", title: "High ecliptic evenings", note: "Spring is one of the friendlier seasons for spotting bright planets after sunset because the zodiac lane climbs higher." },
      calendar: { icon: "☄️", title: "Lyrid lead-up", note: "Late April brings the Lyrids, so this is when the meteor desk wakes back up." },
      special: { icon: "🔭", title: "Planet-pair month", note: "If bright planets crowd the evening sky at all, April is one of the cleaner months for reading their spacing by eye." }
    },
    4: {
      tag: "Late spring",
      opening: "Warmer nights bring shorter dark windows, so the trick is to know what you want to catch before full night arrives.",
      pattern: { icon: "🔻", title: "Spring Triangle overhead", note: "Arcturus and Spica help you read the whole season once they stand high after dusk." },
      planet: { icon: "🪐", title: "Twilight planet hunting", note: "Bright planets can linger in the last blue light this time of year, so start looking before the sky goes fully black." },
      calendar: { icon: "🌌", title: "Milky Way season warming up", note: "The richer summer star fields are starting to push up later in the night." },
      special: { icon: "🌆", title: "Twilight timing matters", note: "May rewards earlier sky-watching. A lot of the best planetary color and crescent-moon pairing happens before full dark." }
    },
    5: {
      tag: "Summer opening",
      opening: "The sky begins shifting from neat spring geometry to richer, busier summer star fields and later-night Milky Way country.",
      pattern: { icon: "🔺", title: "Summer Triangle rising", note: "Vega, Deneb, and Altair begin taking over once the sky gets properly dark." },
      planet: { icon: "🪐", title: "Low-bright planet watch", note: "Summer dusk can hide low planets in haze, so the cleanest views usually come after a dry front." },
      calendar: { icon: "☀️", title: "Solstice light swing", note: "Near the June solstice, darkness comes late and leaves early, so timing matters more than usual." },
      special: { icon: "🕘", title: "Late-start season", note: "June asks for patience. The best sky usually waits until later than your body wants to stay up on a work night." }
    },
    6: {
      tag: "High summer",
      opening: "This is the broadest, richest sky stretch of the year, with the Summer Triangle and Milky Way doing most of the work.",
      pattern: { icon: "🔺", title: "Summer Triangle prime time", note: "Vega, Deneb, and Altair become the easiest big-shape lesson in the whole sky." },
      planet: { icon: "🪐", title: "Southern planet lane", note: "Any bright planet near opposition tends to look best this time of year when it climbs higher before midnight." },
      calendar: { icon: "🌌", title: "Milky Way window", note: "Truly dark summer nights are when the dense star river is easiest to explain to somebody standing beside you." },
      special: { icon: "🫧", title: "Haze check", note: "July skies can look promising and still turn syrupy near the horizon. Dry air makes all the difference for planets and low objects." }
    },
    7: {
      tag: "Meteor month",
      opening: "August is less about one shape and more about staying out long enough for the sky to put on a show.",
      pattern: { icon: "🔺", title: "Summer Triangle still leading", note: "Use Vega first, then walk the triangle out to Deneb and Altair." },
      planet: { icon: "🪐", title: "Warm-night planet watch", note: "Good transparency matters now because humidity near the horizon can swallow low bright objects." },
      calendar: { icon: "☄️", title: "Perseid season", note: "Mid-August is the annual reminder that meteor watching rewards patience more than equipment." },
      special: { icon: "🌠", title: "Prime backyard spectacle", note: "August is when a plain lawn chair and a long look up can beat almost any telescope plan." }
    },
    8: {
      tag: "Early fall",
      opening: "The sky begins turning from summer richness toward cleaner autumn geometry, especially once the evening air starts drying out.",
      pattern: { icon: "⬜", title: "Great Square on deck", note: "Pegasus begins to take shape in the east while the Summer Triangle still hangs on overhead." },
      planet: { icon: "🪐", title: "Evening ecliptic flattening", note: "The sunset planet lane starts lying lower again, which can make horizon clutter matter more." },
      calendar: { icon: "🍂", title: "Equinox approach", note: "The September equinox shifts the balance of daylight fast and helps autumn constellations take the evening stage." },
      special: { icon: "🧭", title: "Cleaner horizon month", note: "September is often a better month than people expect for western-horizon planet watching because the air can finally settle down." }
    },
    9: {
      tag: "Autumn sky",
      opening: "Autumn evenings are cleaner and more architectural. The sky trades spectacle for structure, which makes it easy to teach.",
      pattern: { icon: "⬜", title: "Great Square of Pegasus", note: "A big square standing high is one of the easiest fall landmarks to point out to anybody." },
      planet: { icon: "🪐", title: "Planet pairings near the horizon", note: "Autumn can bunch evening planets lower, so a clean western horizon matters more than ever." },
      calendar: { icon: "☄️", title: "Orionid season", note: "Late October is one of the first reminders that meteor watching is back in earnest." },
      special: { icon: "🟦", title: "Geometry season", note: "October skies are excellent for teaching big clean shapes because the humidity drops and the constellations feel more spaced out." }
    },
    10: {
      tag: "Late fall",
      opening: "The sharpest nights of the year start showing up now, and the winter stars begin reclaiming the eastern sky.",
      pattern: { icon: "⬜", title: "Pegasus to winter handoff", note: "The Great Square still rules overhead while Orion starts climbing into the picture." },
      planet: { icon: "🪐", title: "Long-night planet watch", note: "With darkness arriving earlier, bright planets earn much more evening time if they are favorably placed." },
      calendar: { icon: "🦁", title: "Leonid window", note: "November's Leonids are not always loud, but they keep the meteor desk worth checking." },
      special: { icon: "⏰", title: "Early-dark bonus", note: "November is great for sky plans because you can get real observing time without staying up half the night." }
    },
    11: {
      tag: "Winter return",
      opening: "December is when the sky gets dramatic again. Big bright stars return, darkness comes early, and the winter figures feel close.",
      pattern: { icon: "🔺", title: "Winter Triangle returning", note: "By the end of the month the triangle is back in force and easy to use as a sky lesson." },
      planet: { icon: "🪐", title: "Cold-clear planet lane", note: "Winter transparency often gives the crispest naked-eye planet views when the air settles down." },
      calendar: { icon: "❄️", title: "Solstice darkness", note: "The longest nights of the year give you the biggest possible observing window." },
      special: { icon: "🎄", title: "Holiday sky payoff", note: "December is the easiest month to step outside for fifteen minutes and still feel like the sky gave you a full show." }
    }
  };
  const METEOR_SHOWERS = [
    { name: "Quadrantids", month: 0, day: 3, note: "A short, sharp peak that rewards a cold pre-dawn watch." },
    { name: "Lyrids", month: 3, day: 22, note: "One of spring's dependable meteor checks when the sky stays dark enough." },
    { name: "Eta Aquariids", month: 4, day: 5, note: "Best before dawn, with fast meteors and a low radiant from our latitude." },
    { name: "Perseids", month: 7, day: 12, note: "The annual crowd favorite, best after midnight and before the first hint of dawn." },
    { name: "Orionids", month: 9, day: 21, note: "A strong fall shower tied to Halley's Comet, often best in the late-night hours." },
    { name: "Leonids", month: 10, day: 17, note: "Usually modest now, but still one of the named fall events worth a look." },
    { name: "Geminids", month: 11, day: 13, note: "Often the steadiest rich shower of the whole year if the moon cooperates." }
  ];
  let skyGuide = JSON.parse(JSON.stringify(FALLBACK_SKY_GUIDE));
  let latestWeatherPayload = null;
  let latestAirQualityPayload = null;
  let watershedLeadGauge = null;
  let watershedChartRange = 7;
  let seasonWindowsExpanded = false;

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setHTML(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
  }

  function showCard(id, visible) {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? "" : "none";
  }

  function iconHtml(icon) {
    return '<span class="emoji">' + icon + "</span>";
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

  function formatInches(value) {
    return Number.isFinite(value) ? value.toFixed(value >= 1 ? 1 : 2) + '"' : "—";
  }

  function formatTemp(value) {
    return Number.isFinite(value) ? Math.round(value) + "°F" : "—";
  }

  function formatFeet(value) {
    return Number.isFinite(value) ? value.toFixed(2) + " ft" : "Waiting on gauge sync";
  }

  function formatCfs(value) {
    return Number.isFinite(value) ? value.toFixed(value >= 100 ? 0 : 1) + " cfs" : "Discharge pending";
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
    const p10 = quantile(values, 0.1);
    const p90 = quantile(values, 0.9);
    const focusSpread = Math.max(p90 - p10, 0.18);
    const rawSpread = Math.max(rawMax - rawMin, 0.18);
    const latestStage = Number.isFinite(stageNow) ? stageNow : values[values.length - 1];
    let displayMin = rawMin - rawSpread * 0.08;
    let displayMax = rawMax + rawSpread * 0.12;

    if (rawSpread > focusSpread * 3.5) {
      displayMin = Math.min(rawMin, latestStage, p10 - focusSpread * 0.35);
      displayMax = Math.max(latestStage, p90 + focusSpread * 0.9);
    }

    if (!Number.isFinite(displayMin) || !Number.isFinite(displayMax) || displayMax <= displayMin) {
      displayMin = rawMin;
      displayMax = rawMax + 0.2;
    }

    const padding = Math.max((displayMax - displayMin) * 0.08, 0.08);
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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function seasonIcon(entry) {
    const title = String(entry && entry.title || "").toLowerCase();
    const lane = String(entry && entry.lane || "").toLowerCase();
    if (title.includes("meteor")) return "✨";
    if (title.includes("frost")) return title.includes("spring") ? "❄️" : "🍂";
    if (title.includes("solstice")) return title.includes("summer") ? "☀️" : "❄️";
    if (title.includes("equinox")) return "⚖️";
    if (title.includes("fireflies")) return "🌟";
    if (title.includes("ramps")) return "🌿";
    if (title.includes("morels")) return "🍄";
    if (title.includes("blackberries")) return "🫐";
    if (title.includes("muscadines")) return "🍇";
    if (title.includes("persimmons")) return "🧺";
    if (title.includes("catfish")) return "🐟";
    if (title.includes("dove")) return "🕊️";
    if (title.includes("turkey")) return "🦃";
    if (title.includes("squirrel")) return "🐿️";
    if (title.includes("deer")) return "🦌";
    if (lane === "celestial") return "🌠";
    if (lane === "nature") return "🍃";
    if (lane === "hunting") return "🏹";
    if (lane === "civic") return "🏛️";
    return "📆";
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

  function buildWatershedChart(history, label, trend, stageNow) {
    const allPoints = sanitizeGaugeHistory(history);
    const availableDays = historySpanDays(allPoints);
    setWatershedRangeButtons(allPoints);
    const points = filterHistoryRange(allPoints, watershedChartRange);
    const mood = creekMood(stageNow);
    if (points.length < 2) {
      return {
        meta: (label || "Lead gauge") + " · " + chartRangeLabel(watershedChartRange),
        stats: '<div class="watershed-chart-stat"><div class="watershed-chart-label">Creek read</div><div class="watershed-chart-value">' + mood.icon + " " + mood.label + "</div></div>",
        chart: '<div class="watershed-chart-empty">A ' + (watershedChartRange >= 30 ? "thirty-day" : "seven-day") + ' stage chart will appear here after the live gauge file refreshes.</div>'
      };
    }

    const width = 760;
    const height = 230;
    const padLeft = 12;
    const padRight = 12;
    const padTop = 14;
    const padBottom = 28;
    const stageRange = displayStageRange(points, stageNow);
    const min = stageRange.rawMin;
    const max = stageRange.rawMax;
    const displayMin = stageRange.displayMin;
    const displayMax = stageRange.displayMax;
    const range = Math.max(displayMax - displayMin, 0.2);
    const lastIndex = Math.max(points.length - 1, 1);
    const coords = points.map((point, index) => {
      const x = padLeft + (index / lastIndex) * (width - padLeft - padRight);
      const stage = Math.max(displayMin, Math.min(displayMax, point.stage_ft));
      const y = padTop + ((displayMax - stage) / range) * (height - padTop - padBottom);
      return { x, y };
    });
    const polyline = coords.map((point) => point.x.toFixed(1) + "," + point.y.toFixed(1)).join(" ");
    const topArea = ([
      [padLeft, padTop],
      [width - padRight, padTop],
      ...coords.slice().reverse().map((point) => [point.x, point.y]),
      [coords[0].x, coords[0].y]
    ]).map((point) => point[0].toFixed(1) + "," + point[1].toFixed(1)).join(" ");
    const bottomArea = ([
      [coords[0].x, coords[0].y],
      ...coords.map((point) => [point.x, point.y]),
      [width - padRight, height - padBottom],
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
      ? '<div style="margin-top:0.45rem;font-size:0.7rem;line-height:1.5;color:var(--ink3);">Scaled toward the everyday creek range so smaller rises stay readable. Big spikes still count in the stats above.</div>'
      : "";

    return {
      meta: (label || "Lead gauge") + " · " + metaSuffix,
      stats: [
        '<div class="watershed-chart-stat"><div class="watershed-chart-label">Current</div><div class="watershed-chart-value">' + escapeHtml(formatFeet(stageNow)) + "</div></div>",
        '<div class="watershed-chart-stat"><div class="watershed-chart-label">24h change</div><div class="watershed-chart-value">' + escapeHtml(changeLabel) + "</div></div>",
        '<div class="watershed-chart-stat"><div class="watershed-chart-label">Window range</div><div class="watershed-chart-value">' + escapeHtml(min.toFixed(2) + "–" + max.toFixed(2) + " ft") + "</div></div>",
        '<div class="watershed-chart-stat"><div class="watershed-chart-label">Creek read</div><div class="watershed-chart-value">' + escapeHtml(mood.icon + " " + mood.boat) + "</div></div>"
      ].join(""),
      chart: '<svg viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="' + escapeHtml((label || "Lead gauge") + " creek stage history") + '">' +
        '<rect x="' + padLeft + '" y="' + padTop + '" width="' + (width - padLeft - padRight) + '" height="' + (height - padTop - padBottom) + '" rx="12" fill="rgba(49,120,72,0.12)"/>' +
        '<polygon points="' + topArea + '" fill="rgba(57,133,75,0.18)"/>' +
        '<polygon points="' + bottomArea + '" fill="rgba(32,96,160,0.18)"/>' +
        '<line x1="' + padLeft + '" y1="' + (padTop + (height - padTop - padBottom) * 0.33) + '" x2="' + (width - padRight) + '" y2="' + (padTop + (height - padTop - padBottom) * 0.33) + '" stroke="rgba(80,44,8,0.08)" stroke-width="1"/>' +
        '<line x1="' + padLeft + '" y1="' + (padTop + (height - padTop - padBottom) * 0.66) + '" x2="' + (width - padRight) + '" y2="' + (padTop + (height - padTop - padBottom) * 0.66) + '" stroke="rgba(80,44,8,0.08)" stroke-width="1"/>' +
        '<line x1="' + padLeft + '" y1="' + (height - padBottom) + '" x2="' + (width - padRight) + '" y2="' + (height - padBottom) + '" stroke="rgba(80,44,8,0.18)" stroke-width="1"/>' +
        '<polyline fill="none" stroke="#0f5c6d" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" points="' + polyline + '"/>' +
        '<circle cx="' + coords[coords.length - 1].x.toFixed(1) + '" cy="' + coords[coords.length - 1].y.toFixed(1) + '" r="4.2" fill="#0f5c6d" stroke="#faf6ee" stroke-width="2"/>' +
        '<text class="watershed-axis" x="' + padLeft + '" y="' + (height - 8) + '">' + escapeHtml(firstLabel) + "</text>" +
        '<text class="watershed-axis" x="' + (width - padRight) + '" y="' + (height - 8) + '" text-anchor="end">' + escapeHtml(lastLabel) + "</text>" +
        '<text class="watershed-axis" x="' + padLeft + '" y="' + (padTop - 1) + '">' + escapeHtml(displayMax.toFixed(2) + " ft") + "</text>" +
        '<text class="watershed-axis" x="' + padLeft + '" y="' + (height - padBottom - 4) + '">' + escapeHtml(displayMin.toFixed(2) + " ft") + "</text>" +
        "</svg>" + chartNote
    };
  }

  function renderWatershedChartPanel() {
    const gauge = watershedLeadGauge;
    const chart = buildWatershedChart(gauge && gauge.stage_history ? gauge.stage_history : [], gauge ? (gauge.label || gauge.name || "Lead gauge") : "Lead gauge", gauge ? gauge.trend : "steady", gauge ? numericOrNaN(gauge.stage_ft) : NaN);
    setText("watershedChartMeta", chart.meta);
    setHTML("watershedChartStats", chart.stats);
    setHTML("watershedChart", chart.chart);
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

  function formatClock(date) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function dayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);
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
    return {
      rise: minutesToTime(date, sunriseMinutes),
      set: minutesToTime(date, sunsetMinutes)
    };
  }

  function directionFromDegrees(deg) {
    if (!Number.isFinite(deg)) return "Calm";
    return WDIRS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
  }

  function getMoonPhase(date) {
    const phases = [
      { name: "New Moon", icon: "🌑", min: 0, max: 1.85, lore: "Dark nights make stars stronger and animal movement easier to hear than see.", science: "A new moon means the moon is roughly between Earth and the sun, so the lit side faces away from us." },
      { name: "Waxing Crescent", icon: "🌒", min: 1.85, max: 7.38, lore: "Old almanac readers took the first light as a sign to start adding things back into the week.", science: "The illuminated fraction grows each evening, adding a little more moonlight after sunset." },
      { name: "First Quarter", icon: "🌓", min: 7.38, max: 11.07, lore: "Half-lit nights are a good time to notice how moonlight changes the feel of fields and creek bends.", science: "From Earth we see half the near side lit because the moon has moved one quarter of the way around its orbit." },
      { name: "Waxing Gibbous", icon: "🌔", min: 11.07, max: 14.77, lore: "This is when the moon begins to dominate the evening sky and stretch useful light later into the night.", science: "The moon is approaching full, so the visible illuminated portion keeps expanding toward a complete disk." },
      { name: "Full Moon", icon: "🌕", min: 14.77, max: 16.61, lore: "Bright nights change how the woods look and how people move through them. Even the creek sounds different under a full moon.", science: "The Earth sits roughly between the sun and moon, so the moon's Earth-facing side is fully illuminated." },
      { name: "Waning Gibbous", icon: "🌖", min: 16.61, max: 22.15, lore: "After full, the bright hours shift later into the night and toward dawn.", science: "The moon is still mostly lit, but the illuminated area shrinks a little each night after full." },
      { name: "Last Quarter", icon: "🌗", min: 22.15, max: 25.84, lore: "Morning people notice this one first. It hangs over the early day rather than the evening.", science: "Again we see a half-lit moon, but now it is the opposite half compared with first quarter." },
      { name: "Waning Crescent", icon: "🌘", min: 25.84, max: 29.53, lore: "The moon gives back the night a little at a time before the cycle resets.", science: "Only a thin illuminated slice remains visible before the moon returns to new." }
    ];
    const knownNew = new Date(2000, 0, 6, 18, 14, 0);
    const moonDay = (((date - knownNew) / 86400000) % 29.53 + 29.53) % 29.53;
    return phases.find((phase) => moonDay >= phase.min && moonDay < phase.max) || phases[0];
  }

  function plantActionClass(action) {
    if (/plant|set out|start/i.test(action)) return "pa-plant";
    if (/harvest/i.test(action)) return "pa-harvest";
    return "pa-wait";
  }

  function buildPlanting(monthIndex) {
    const guide = PLANTING_GUIDE[monthIndex];
    setText("plantTag", guide.tag);
    setText("pillPlant", guide.items[0].name);
    setHTML("plantBody", guide.items.map((item) => (
      '<div class="plant-item">' +
        '<div class="plant-icon">' + item.icon + "</div>" +
        "<div><div class=\"plant-name\">" + item.name + "</div><div class=\"plant-action " + plantActionClass(item.action) + "\">" + item.action + "</div><div class=\"plant-note\">" + item.note + "</div></div>" +
      "</div>"
    )).join(""));
  }

  function buildNature(monthIndex) {
    const entries = NATURE_GUIDE[monthIndex];
    setText("natureTag", "This week");
    setText("pillNature", entries[0].title);
    setHTML("natureBody", entries.map((entry) => (
      '<div class="nature-row">' +
        '<div class="nature-icon">' + entry.icon + "</div>" +
        "<div><div class=\"nature-title\">" + entry.title + "</div><div class=\"nature-note\">" + entry.note + "</div></div>" +
      "</div>"
    )).join(""));
  }

  function buildFact(date) {
    const fact = ALMANAC_FACTS[dayOfYear(date) % ALMANAC_FACTS.length];
    setText("factKicker", fact.kicker);
    setText("factTitle", fact.title);
    setText("factBody", fact.body);
  }

  function buildHunting(date) {
    const month = date.getMonth();
    const springFrostNear = month === 2 || month === 3;
    const fallFrostNear = month === 9 || month === 10;
    const entries = [
      {
        icon: "🦃",
        name: "Turkey",
        dates: "Spring woods",
        open: month >= 2 && month <= 4,
        badge: month >= 2 && month <= 4 ? "on now" : "later",
        note: "Gobblers, green-up, and early starts. The legal dates still live in the digest."
      },
      {
        icon: "🐿️",
        name: "Squirrel",
        dates: "Long cool-weather run",
        open: month >= 8 || month <= 1,
        badge: month >= 8 || month <= 1 ? "good now" : "later",
        note: "One of the friendlier seasons to learn because the sign is obvious and the rhythm is simple."
      },
      {
        icon: "🦌",
        name: "Deer",
        dates: "Fall into winter",
        open: month === 10 || month === 11 || month === 0,
        badge: month === 10 || month === 11 || month === 0 ? "watch now" : "later",
        note: "Still the big woods conversation once the leaves turn and the mornings sharpen up."
      },
      {
        icon: "🍄",
        name: "Morels",
        dates: "Warm spring rain",
        open: month >= 2 && month <= 3,
        badge: month >= 2 && month <= 3 ? "worth a look" : "wait for spring",
        note: "Check tulip poplar slopes, old orchards, and the first real run of warm wet days."
      },
      {
        icon: "🐦",
        name: "Snipe",
        dates: "Wet-field foolishness",
        open: month >= 10 || month <= 1,
        badge: month >= 10 || month <= 1 ? "prime nonsense" : "off season",
        note: "Half joke, half tradition. It still belongs in any proper almanac list."
      },
      {
        icon: "❄️",
        name: "Last spring frost",
        dates: "Around March 20",
        open: springFrostNear,
        badge: springFrostNear ? "keep cover handy" : "mostly past",
        note: "Creek-bottom gardens often squeeze out a few extra days, but late cold still likes to surprise people."
      },
      {
        icon: "🍂",
        name: "First fall frost",
        dates: "Around November 15",
        open: fallFrostNear,
        badge: fallFrostNear ? "coming up" : "later on",
        note: "The ridges feel it first. The bottoms often hold on a little longer before the first real nip."
      }
    ];

    const summary = '<div class="hunt-summary"><strong>Cardiff season windows.</strong><div class="hunt-meta">A mix of legal hunting reminders, local foraging timing, and the frost dates people actually plan around.</div></div>';
    const activeEntry = entries.find((entry) => entry.open) || entries[0];
    setText("pillHunt", activeEntry.name);
    setText("pillHuntIcon", activeEntry.icon);
    setHTML("huntBody", summary + entries.map((entry) => (
      '<div class="hunt-season">' +
        '<div class="hs-top">' +
          '<div><div class="hs-name">' + iconHtml(entry.icon) + " " + entry.name + "</div><div class=\"hs-dates\">" + entry.dates + "</div></div>" +
          '<div class="' + (entry.open ? "hs-open" : "hs-closed") + '">' + entry.badge + "</div>" +
        "</div>" +
        '<div class="hunt-meta">' + entry.note + "</div>" +
      "</div>"
    )).join(""));
  }

  function buildSeasonWindows(date) {
    const sharedSeasonData = window.CardiffSeasonData;
    if (!sharedSeasonData || typeof sharedSeasonData.getSeasonEntries !== "function") {
      buildHunting(date);
      return;
    }

    const previewEntries = sharedSeasonData.getSeasonEntries(date, 3);
    const fullEntries = sharedSeasonData.getUpcomingCalendar(date, 18);
    const entries = seasonWindowsExpanded ? fullEntries : previewEntries;
    const leadEntry = previewEntries.find((entry) => entry.active) || previewEntries[0] || fullEntries[0];
    if (!leadEntry) {
      buildHunting(date);
      return;
    }

    setText("pillHunt", leadEntry.title);
    setHTML("pillHuntIcon", seasonIcon(leadEntry));

    const rows = entries.map((entry) => (
      '<div class="hunt-season">' +
        '<div class="hs-top">' +
          '<div><div class="hs-name">' + iconHtml(seasonIcon(entry)) + " " + escapeHtml(entry.title) + '</div><div class="hs-dates">' + escapeHtml(entry.longDateLabel || entry.dateLabel || entry.windowLabel || "Watch the season") + '</div><div class="hs-category">' + escapeHtml(entry.category || "Season window") + "</div></div>" +
          '<div class="' + (entry.active ? "hs-open" : "hs-closed") + '">' + escapeHtml(entry.badge || entry.seasonTag || "watch for") + "</div>" +
        "</div>" +
        '<div class="hunt-meta">' + escapeHtml(entry.summary) + "</div>" +
      "</div>"
    )).join("");

    const shouldToggle = fullEntries.length > previewEntries.length;
    const toggle = shouldToggle
      ? '<button class="hunt-expand" id="huntToggle" type="button">' + (seasonWindowsExpanded ? "Show the three-month peek" : "Show the full run of seasons") + "</button>"
      : "";

    setHTML("huntBody", rows + toggle);

    const toggleBtn = document.getElementById("huntToggle");
    if (toggleBtn) {
      toggleBtn.onclick = function () {
        seasonWindowsExpanded = !seasonWindowsExpanded;
        try {
          window.localStorage.setItem("cardiff-season-windows-expanded", seasonWindowsExpanded ? "1" : "0");
        } catch (error) {
          // Storage is optional here.
        }
        buildSeasonWindows(date);
      };
    }
  }

  function nextMeteorShower(date) {
    const year = date.getFullYear();
    const candidates = METEOR_SHOWERS.map((shower) => {
      const peak = new Date(year, shower.month, shower.day, 2, 0, 0);
      const nextPeak = peak < date ? new Date(year + 1, shower.month, shower.day, 2, 0, 0) : peak;
      return {
        ...shower,
        peak: nextPeak
      };
    }).sort((a, b) => a.peak - b.peak);
    return candidates[0];
  }

  function normalizeSkyEntry(entry, fallback) {
    const safe = entry && typeof entry === "object" ? entry : {};
    const base = fallback && typeof fallback === "object" ? fallback : FALLBACK_SKY_GUIDE[0];
    const clean = {
      tag: safe.tag || base.tag,
      opening: safe.opening || base.opening,
      pattern: {
        icon: safe.pattern && safe.pattern.icon ? safe.pattern.icon : base.pattern.icon,
        title: safe.pattern && safe.pattern.title ? safe.pattern.title : base.pattern.title,
        note: safe.pattern && safe.pattern.note ? safe.pattern.note : base.pattern.note
      },
      planet: {
        icon: safe.planet && safe.planet.icon ? safe.planet.icon : base.planet.icon,
        title: safe.planet && safe.planet.title ? safe.planet.title : base.planet.title,
        note: safe.planet && safe.planet.note ? safe.planet.note : base.planet.note
      },
      calendar: {
        icon: safe.calendar && safe.calendar.icon ? safe.calendar.icon : base.calendar.icon,
        title: safe.calendar && safe.calendar.title ? safe.calendar.title : base.calendar.title,
        note: safe.calendar && safe.calendar.note ? safe.calendar.note : base.calendar.note
      }
    };
    const specialSource = safe.special && typeof safe.special === "object" ? safe.special : (base.special || null);
    if (specialSource) {
      clean.special = {
        icon: specialSource.icon || "✨",
        title: specialSource.title || "Sky note",
        note: specialSource.note || ""
      };
    }
    return clean;
  }

  function mergeSkyGuide(payload) {
    const source = payload && typeof payload === "object" ? (payload.months || payload) : {};
    const merged = {};
    for (let month = 0; month < 12; month += 1) {
      merged[month] = normalizeSkyEntry(source[month], FALLBACK_SKY_GUIDE[month]);
    }
    return merged;
  }

  async function loadSkyGuide() {
    try {
      const response = await fetch(SKY_WATCH_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("skywatch");
      const data = await response.json();
      skyGuide = mergeSkyGuide(data);
    } catch (error) {
      skyGuide = JSON.parse(JSON.stringify(FALLBACK_SKY_GUIDE));
    }
    const now = new Date();
    buildSky(now, getSunTimes(now), getMoonPhase(now));
  }

  function skyMoonNote(moon) {
    if (moon.name === "Full Moon") {
      return "Bright moonlight will wash out the fainter star fields, so lean into the moon itself and the brightest planets or stars.";
    }
    if (moon.name === "New Moon") {
      return "Dark-sky window. This is when the faint stuff earns a better chance if haze and porch lights stay polite.";
    }
    return "Moderate moonlight tonight. Bright patterns still read well, but the faintest stars will have to fight for it.";
  }

  function nextNightForecast(payload, date) {
    const periods = payload && Array.isArray(payload.forecast) ? payload.forecast : [];
    const now = date || new Date();
    return periods.find((period) => !period.isDaytime && new Date(period.startTime || period.endTime || 0) >= now) ||
      periods.find((period) => !period.isDaytime) ||
      null;
  }

  function cloudScore(shortForecast) {
    const text = String(shortForecast || "").toLowerCase();
    if (!text) return 0;
    if (/showers|thunder|storm|rain|fog/.test(text)) return -20;
    if (/cloudy|overcast/.test(text) && /mostly/.test(text)) return -10;
    if (/cloudy|overcast/.test(text)) return -16;
    if (/partly cloudy|partly clear/.test(text)) return 2;
    if (/mostly clear/.test(text)) return 10;
    if (/clear|sunny/.test(text)) return 16;
    return 0;
  }

  function moonScore(moon) {
    switch (moon.name) {
      case "New Moon":
        return 16;
      case "Waxing Crescent":
      case "Waning Crescent":
        return 10;
      case "First Quarter":
      case "Last Quarter":
        return 3;
      case "Waxing Gibbous":
      case "Waning Gibbous":
        return -8;
      case "Full Moon":
        return -18;
      default:
        return 0;
    }
  }

  function airQualitySkyEffect(payload) {
    const current = payload && payload.current ? payload.current : null;
    if (!current) {
      return {
        delta: 0,
        note: "No live haze read is folded into the score yet"
      };
    }

    const aqi = Number(current.usAqi);
    const pm25 = Number(current.pm25);
    let delta = 0;

    if (Number.isFinite(aqi)) {
      if (aqi <= 35) delta += 4;
      else if (aqi <= 50) delta += 2;
      else if (aqi <= 100) delta -= 3;
      else if (aqi <= 150) delta -= 8;
      else if (aqi <= 200) delta -= 14;
      else delta -= 18;
    }

    if (Number.isFinite(pm25)) {
      if (pm25 <= 8) delta += 2;
      else if (pm25 >= 35) delta -= 8;
      else if (pm25 >= 20) delta -= 5;
      else if (pm25 >= 12) delta -= 2;
    }

    let note = "Air clarity is not pushing the sky much one way or the other tonight";
    if (delta >= 4) note = "The air looks pretty clean, so haze should mind its manners tonight";
    else if (delta >= 1) note = "The air is giving the night sky a small helping hand";
    else if (delta <= -12) note = "Smoke, particulates, or plain old haze could flatten the fainter stars tonight";
    else if (delta <= -5) note = "A little haze may take some of the fine detail out of the sky tonight";
    return { delta, note };
  }

  function airQualityLabel(payload) {
    const current = payload && payload.current ? payload.current : null;
    if (!current) return "🌫 Air desk pending";
    const category = current.category || "Air snapshot";
    const aqi = Number(current.usAqi);
    return Number.isFinite(aqi) ? "🌿 " + category + " · AQI " + Math.round(aqi) : "🌫 " + category;
  }

  function skywatchSummary(date, moon, payload, airPayload) {
    const baseline = 46;
    const night = nextNightForecast(payload, date);
    const airEffect = airQualitySkyEffect(airPayload);
    let score = baseline + moonScore(moon) + cloudScore(night && night.shortForecast) + airEffect.delta;
    const humidity = payload && payload.current ? Number(payload.current.humidity || 0) : NaN;
    if (Number.isFinite(humidity) && humidity >= 85) score -= 4;
    score = Math.max(8, Math.min(92, Math.round(score)));

    const rating = score >= 74 ? "Great" : (score >= 60 ? "Good" : (score >= 44 ? "Fair" : (score >= 28 ? "Rough" : "Poor")));
    const drivers = ["Cardiff already has a little Birmingham glow working against the darkest skies"];
    if (moon.name === "Full Moon") drivers.push("the moon is doing real washout tonight");
    else if (moon.name === "New Moon") drivers.push("moonlight is mostly staying out of the way");
    if (night && night.shortForecast) drivers.push("the next night forecast reads " + night.shortForecast.toLowerCase());
    if (airPayload && airPayload.current) drivers.push(airEffect.note.toLowerCase());

    return {
      score,
      rating,
      note: drivers.join(", ") + "."
    };
  }

  function buildSky(date, sun, moon) {
    const guide = skyGuide[date.getMonth()] || FALLBACK_SKY_GUIDE[0];
    const meteor = nextMeteorShower(date);
    const score = skywatchSummary(date, moon, latestWeatherPayload, latestAirQualityPayload);
    const daysUntilMeteor = Math.ceil((meteor.peak - date) / 86400000);
    const meteorLabel = daysUntilMeteor <= 3
      ? meteor.name + " peak"
      : (daysUntilMeteor <= 14 ? meteor.name + " soon" : "Next named shower");
    const meteorNote = daysUntilMeteor <= 3
      ? meteor.note
      : (daysUntilMeteor <= 14
        ? meteor.name + " peaks around " + meteor.peak.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ". " + meteor.note
        : meteor.name + " is the next major stop on the meteor calendar, peaking around " + meteor.peak.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ".");
    const moonlightLabel = moon.name === "New Moon" ? "Dark-sky advantage" : (moon.name === "Full Moon" ? "Moonlight-heavy night" : "Moonlight factor");
    setText("skyWatchTag", guide.tag);
    setHTML("skyWatchBody",
      '<div class="sky-event"><div class="sky-event-icon">🔭</div><div><div class="sky-event-title">Skywatch score: ' + score.score + '/100 · ' + score.rating + '</div><div class="sky-event-note">' + score.note + "</div></div></div>" +
      '<div class="sky-callout">' + guide.opening + "</div>" +
      '<div class="sky-event"><div class="sky-event-icon">' + guide.pattern.icon + '</div><div><div class="sky-event-title">' + guide.pattern.title + '</div><div class="sky-event-note">' + guide.pattern.note + "</div></div></div>" +
      '<div class="sky-event"><div class="sky-event-icon">' + guide.planet.icon + '</div><div><div class="sky-event-title">' + guide.planet.title + '</div><div class="sky-event-note">' + guide.planet.note + "</div></div></div>" +
      '<div class="sky-event"><div class="sky-event-icon">☄️</div><div><div class="sky-event-title">' + meteorLabel + '</div><div class="sky-event-note">' + meteorNote + "</div></div></div>" +
      '<div class="sky-event"><div class="sky-event-icon">' + moon.icon + '</div><div><div class="sky-event-title">' + moonlightLabel + '</div><div class="sky-event-note">' + skyMoonNote(moon) + ' Sunset is around ' + formatClock(sun.set) + " local time.</div></div></div>" +
      (guide.special ? '<div class="sky-event"><div class="sky-event-icon">' + guide.special.icon + '</div><div><div class="sky-event-title">' + guide.special.title + '</div><div class="sky-event-note">' + guide.special.note + "</div></div></div>" : "") +
      '<div class="sky-event"><div class="sky-event-icon">' + guide.calendar.icon + '</div><div><div class="sky-event-title">' + guide.calendar.title + '</div><div class="sky-event-note">' + guide.calendar.note + "</div></div></div>"
    );
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
        '<div class="report-row"><div class="report-label">Air quality index</div><div class="report-value">' + escapeHtml((current.category || "Air snapshot") + (Number.isFinite(aqi) ? " · AQI " + Math.round(aqi) : "")) + '</div><div class="report-note">' + escapeHtml(current.label || current.note || "Live air-quality snapshot for the Cardiff area.") + "</div></div>" +
        '<div class="report-row"><div class="report-label">Fine particles</div><div class="report-value">' + escapeHtml(Number.isFinite(pm25) ? pm25.toFixed(1) + " " + (current.pm25Unit || "μg/m³") : "—") + '</div><div class="report-note">PM2.5 often shows up as the kind of extra haze you feel in your chest and notice in the night sky.</div></div>' +
        '<div class="report-row"><div class="report-label">Ozone</div><div class="report-value">' + escapeHtml(Number.isFinite(ozone) ? ozone.toFixed(1) + " " + (current.ozoneUnit || "μg/m³") : "—") + '</div><div class="report-note">' + escapeHtml(current.note || "Outdoor air can feel different when ozone or particulates start creeping up.") + "</div></div>" +
      "</div>" +
      '<div class="sci-box"><div class="sci-label">Sky desk crossover</div><p>Cleaner air usually means better transparency, while extra haze can flatten the faint-star contrast even when the clouds behave themselves.</p></div>'
    );
  }

  async function loadAirQuality() {
    try {
      const response = await fetch(AIR_QUALITY_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("air");
      const data = await response.json();
      latestAirQualityPayload = data;
      renderAirQuality(data);
      buildSky(new Date(), getSunTimes(new Date()), getMoonPhase(new Date()));
    } catch (error) {
      latestAirQualityPayload = null;
      showCard("air-card", false);
      buildSky(new Date(), getSunTimes(new Date()), getMoonPhase(new Date()));
    }
  }

  function buildDateHero(date, sun, moon) {
    const moonAge = Math.round((((date - new Date(2000, 0, 6, 18, 14, 0)) / 86400000) % 29.53 + 29.53) % 29.53);
    const daylightHours = Math.round(((sun.set - sun.rise) / 3600000) * 10) / 10;
    setText("dateDayName", DAYS_LONG[date.getDay()]);
    setText("dateBig", String(date.getDate()));
    setText("dateMonthName", MONTHS_LONG[date.getMonth()]);
    setText("dateYearNum", String(date.getFullYear()));
    setText("sunTimes", formatClock(sun.rise) + " · " + formatClock(sun.set));
    setText("dayLength", daylightHours + " hours of daylight");
    setText("heroMoon", moon.icon + " " + moon.name);
    setText("heroMoonSub", "Moon age in cycle: " + moonAge + " days");
    setText("moonIcon", moon.icon);
    setText("moonName", moon.name);
    setText("moonMeta", "Tonight over Five Mile Creek");
    setText("moonLore", moon.lore);
    setText("moonSci", moon.science);
    setText("pillMoonIcon", moon.icon);
    setText("pillMoon", moon.name);
  }

  function buildStaticSections() {
    const now = new Date();
    const sun = getSunTimes(now);
    const moon = getMoonPhase(now);
    buildDateHero(now, sun, moon);
    buildPlanting(now.getMonth());
    buildNature(now.getMonth());
    buildFact(now);
    buildSeasonWindows(now);
    buildSky(now, sun, moon);
  }

  function weatherCondition(obs) {
    const imp = obs.imperial || {};
    const temp = Number(imp.temp);
    const humidity = Number(obs.humidity);
    const precipRate = Number(imp.precipRate || 0);
    const solar = Number(obs.solarRadiation || 0);
    const wind = Number(imp.windSpeed || 0);
    const hour = new Date().getHours();

    if (precipRate > 0.05) return "Rain";
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

  function pressureNote(pressureIn) {
    if (!Number.isFinite(pressureIn)) return { label: "Steady", note: "No pressure signal available.", icon: "🧭" };
    if (pressureIn >= 30.15) return { label: "High and settled", note: "Usually steadier skies and more predictable creek conditions.", icon: "📈" };
    if (pressureIn >= 29.95) return { label: "Moderate", note: "A fair-weather middle ground with no strong front signal.", icon: "🧭" };
    return { label: "Lower pressure", note: "Often means a front is near or the air is turning more unsettled.", icon: "🌦️" };
  }

  function groundCondition(precipTotal, humidity) {
    if (precipTotal >= 0.3) return { title: "Soft and muddy", note: "The ground is taking on water right now.", icon: "🫧" };
    if (precipTotal >= 0.05) return { title: "Freshly damp", note: "Good scent, soft tracks, and slick creek banks.", icon: "👣" };
    if (humidity >= 80) return { title: "Holding moisture", note: "Shade and bottoms will stay damp longer than open ground.", icon: "🌿" };
    if (humidity >= 60) return { title: "Normal footing", note: "Neither baked out nor soupy in most spots.", icon: "🪵" };
    return { title: "Dry on top", note: "Open ground will crust faster than shaded creek edges.", icon: "☀️" };
  }

  function uvNote(uv) {
    if (!Number.isFinite(uv)) return "UV reading offline";
    if (uv >= 8) return "High exposure in open sun";
    if (uv >= 5) return "Moderate sun strength";
    if (uv >= 2) return "Mild sun load";
    return "Low UV right now";
  }

  function forecastIcon(text, isDaytime) {
    const lower = (text || "").toLowerCase();
    if (/tornado|severe/.test(lower)) return "🚨";
    if (/thunder|storm/.test(lower)) return "⛈️";
    if (/snow|sleet|ice/.test(lower)) return "❄️";
    if (/rain|shower|drizzle/.test(lower)) return isDaytime ? "🌦️" : "🌧️";
    if (/fog|mist|haze/.test(lower)) return "🌫️";
    if (/wind|breezy|gust/.test(lower)) return "💨";
    if (/partly|mostly sunny/.test(lower)) return isDaytime ? "⛅" : "🌙";
    if (/cloud/.test(lower) || /overcast/.test(lower)) return "☁️";
    return isDaytime ? "☀️" : "🌙";
  }

  function estimateWaterTemp(temp, monthIndex) {
    const seasonalOffset = [-8, -8, -6, -4, -2, 0, 2, 2, 0, -2, -5, -7][monthIndex];
    return Math.max(40, Math.min(86, Math.round(temp + seasonalOffset)));
  }

  function fishingRows(wx) {
    const water = estimateWaterTemp(wx.temp, new Date().getMonth());
    const pressure = pressureNote(wx.pressureIn);
    const catfishScore = (wx.condition === "Rain" ? 3 : 2) + (water >= 58 ? 1 : 0);
    const bassScore = (pressure.label === "High and settled" ? 3 : 2) + (water >= 55 && water <= 75 ? 1 : 0);
    const breamScore = water >= 68 ? 3 : 2;

    return [
      {
        icon: "🐟",
        stars: catfishScore >= 4 ? "★★★" : "★★",
        cls: catfishScore >= 4 ? "f-good" : "f-mid",
        name: "Catfish",
        note: wx.condition === "Rain" ? "Fresh color and moving water can make the creek feel alive for catfish." : "Stable warm water keeps catfish worth a try around deeper bends and cover."
      },
      {
        icon: "🐠",
        stars: bassScore >= 4 ? "★★★" : "★★",
        cls: bassScore >= 4 ? "f-good" : "f-mid",
        name: "Largemouth and spotted bass",
        note: pressure.label === "High and settled" ? "Settled weather helps fish hold more predictable edges and ambush cover." : "A changing barometer can scatter bass, so slow down and fish the obvious structure."
      },
      {
        icon: "🐡",
        stars: breamScore >= 3 ? "★★★" : "★",
        cls: breamScore >= 3 ? "f-good" : "f-low",
        name: "Bream",
        note: water >= 68 ? "Warm shallows and quiet banks make bluegill and shellcracker a solid bet." : "They are still around, but the bite usually improves once the water warms more."
      }
    ];
  }

  function buildFishing(wx, moon) {
    const waterTemp = estimateWaterTemp(wx.temp, new Date().getMonth());
    const pressure = pressureNote(wx.pressureIn);
    const bestTime = wx.temp >= 82 ? "First light" : (wx.condition === "Rain" ? "Before the shower" : "Late afternoon");
    const bestTimeNote = wx.temp >= 82 ? "Cooler water and softer light help." : (wx.condition === "Rain" ? "Pressure changes can wake things up briefly." : "A stable evening window looks strongest.");
    const bestIcon = wx.temp >= 82 ? "🌅" : (wx.condition === "Rain" ? "🌦️" : "🌇");
    const rows = fishingRows(wx);

    setEmojiText("fishWater", "💧", waterTemp + "°F");
    setEmojiText("fishPressure", pressure.icon, pressure.label);
    setText("fishPNote", pressure.note);
    setHTML("fishMoon", emojiText(moon.icon, moon.name));
    setText("fishMoonNote", "Moonlight shifts feeding windows, especially overnight.");
    setEmojiText("fishBest", bestIcon, bestTime);
    setText("fishBestNote", bestTimeNote);
    setHTML("pillFish", emojiText("🎣", rows[0].name));

    setHTML("fishBody", rows.map((row) => (
      '<div class="fish-row">' +
        '<div class="fish-icon">' + iconHtml(row.icon) + "</div>" +
        '<div class="fish-main"><div class="fish-name-line"><div class="fish-stars ' + row.cls + '">' + row.stars + '</div><div class="fish-name">' + row.name + '</div></div><div class="fish-note">' + row.note + "</div></div>" +
      "</div>"
    )).join(""));
  }

  function buildSideSnapshot(wx, sun, moon, ground) {
    setHTML("sideSnap",
      '<div class="side-item"><div class="side-icon">' + conditionIcon(wx.condition) + '</div><div><div class="side-val">' + wx.temp + '°F and ' + wx.condition.toLowerCase() + '</div><div class="side-sub">' + wx.summary + "</div></div></div>" +
      '<div class="side-item"><div class="side-icon">🌅</div><div><div class="side-val">Sunrise to sunset</div><div class="side-sub">' + formatClock(sun.rise) + " to " + formatClock(sun.set) + "</div></div></div>" +
      '<div class="side-item"><div class="side-icon">' + moon.icon + '</div><div><div class="side-val">' + moon.name + '</div><div class="side-sub">Night light and animal movement can feel different under this phase.</div></div></div>' +
      '<div class="side-item"><div class="side-icon">👣</div><div><div class="side-val">' + ground.title + '</div><div class="side-sub">' + ground.note + "</div></div></div>"
    );
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
      labels[0].textContent = "🌡️ Temperature";
      labels[1].textContent = "💧 Humidity";
      labels[2].textContent = "🍃 Wind";
      labels[3].textContent = "👣 Ground";
      labels[4].textContent = "🧭 Pressure";
      labels[5].textContent = "🕶️ UV Index";
    }
  }

  function refreshFishingEmojiLayer(wx) {
    const rows = fishingRows(wx);
    const waterTemp = estimateWaterTemp(wx.temp, new Date().getMonth());
    const pressure = pressureNote(wx.pressureIn);
    setMultiEmojiText("fishWater", ["💧", "🌡️"], waterTemp + "°F");
    setMultiEmojiText("fishPressure", [pressure.icon, "🧭"], pressure.label);
    if (rows.length) {
      setHTML("pillFish", emojiText(rows[0].icon, rows[0].name));
    }
  }

  function refreshRainEmojiLayer(rain) {
    const todayAmount = rain && Number.isFinite(rain.today) ? Number(rain.today) : null;
    const monthAmount = rain && Number.isFinite(rain.monthToDate) ? Number(rain.monthToDate) : null;
    setHTML("rainToday", emojiText("📏", formatInches(todayAmount)));
    setHTML("rainMonth", emojiText("🗂️", formatInches(monthAmount)));
    setText("rainMonthLabel", (rain && rain.monthComplete) ? "🗓️ Rain this month" : "🗓️ Rain tracked");
    const labels = document.querySelectorAll("#wx-card .rain-label");
    if (labels.length >= 1) labels[0].textContent = "🌧 Today's rain";
  }

  function buildRainSummary(rain) {
    const todayAmount = rain && Number.isFinite(rain.today) ? Number(rain.today) : null;
    const monthAmount = rain && Number.isFinite(rain.monthToDate) ? Number(rain.monthToDate) : null;
    const monthLabel = rain && rain.monthLabel ? rain.monthLabel : "This month";
    const monthCoverage = rain && rain.monthCoverageStart ? new Date(rain.monthCoverageStart + "T12:00:00") : null;
    const hasFullMonthCoverage = !!(rain && rain.monthComplete);

    setText("rainToday", formatInches(todayAmount));
    setText("rainTodayNote", "Measured by the station since midnight.");
    setText("rainMonthLabel", hasFullMonthCoverage ? "Rain this month" : "Rain tracked");
    setText("rainMonth", formatInches(monthAmount));
    if (hasFullMonthCoverage) {
      setText("rainMonthNote", monthLabel + " total so far.");
    } else if (monthCoverage && !Number.isNaN(monthCoverage.getTime())) {
      setText("rainMonthNote", "Tracking from " + monthCoverage.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", not a full month total.");
    } else {
      setText("rainMonthNote", "Tracking from the site log, not a full month total.");
    }
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
      ? "Cardiff picked up " + formatInches(rainAmount) + " " + report.label.toLowerCase() + "."
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

  function renderWatershedGauge(gauge) {
    const trend = gauge && gauge.trend ? gauge.trend : "steady";
    const role = gauge && gauge.role ? gauge.role : "watch";
    const stage = numericOrNaN(gauge.stage_ft);
    const discharge = numericOrNaN(gauge.discharge_cfs);
    const mood = creekMood(stage);
    return '<div class="watershed-stat">' +
      '<div class="watershed-top"><div class="watershed-name">' + escapeHtml(mood.icon + " " + (gauge.label || gauge.name || "Gauge")) + '</div><div class="watershed-role">' + escapeHtml(role) + '</div></div>' +
      '<div class="watershed-mainline"><div class="watershed-main">' + escapeHtml(formatFeet(stage)) + '</div><div class="watershed-boat">' + escapeHtml(mood.boat) + "</div></div>" +
      '<div class="watershed-trend ' + escapeHtml(trend) + '">' + escapeHtml(trendEmoji(trend) + " " + trend) + '</div>' +
      '<div class="watershed-sub">' + escapeHtml(formatCfs(discharge)) + '</div>' +
      '<div class="watershed-sub">' + escapeHtml(mood.label + ". " + mood.note) + '</div>' +
      '<div class="watershed-sub">' + escapeHtml(gauge.note || relativeGaugeTime(gauge.updated_at)) + '</div>' +
      "</div>";
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
      setHTML("watershedGrid", gauges.length ? gauges.map(renderWatershedGauge).join("") : renderWatershedGauge({
        label: "Republic live gauge",
        role: "lead",
        stage_ft: null,
        discharge_cfs: null,
        trend: "steady",
        note: "Gauge values will appear here after the watershed file refreshes."
      }));
      renderWatershedChartPanel();
      setText("watershedScience", primary && Number.isFinite(numericOrNaN(primary.stage_ft))
        ? "Stage, discharge, and the little boat cue are a quick local shorthand for whether the creek is whispering, moving along, or worth giving extra respect."
        : "Live creek numbers will drop in here after the watershed file refreshes.");
      if (primary && Number.isFinite(numericOrNaN(primary.stage_ft))) {
        const mood = creekMood(numericOrNaN(primary.stage_ft));
        setHTML("pillWatershed", emojiText(mood.icon, mood.label));
      } else {
        setText("pillWatershed", "Gauge sync");
      }
    } catch (error) {
      watershedLeadGauge = null;
      setText("watershedUpdated", "Gauge sync offline");
      setHTML("watershedGrid", renderWatershedGauge({
        label: "Republic live gauge",
        role: "lead",
        stage_ft: null,
        discharge_cfs: null,
        trend: "steady",
        note: "Gauge sync is temporarily offline."
      }));
      setText("watershedChartMeta", "Lead gauge · Week view");
      setHTML("watershedChartStats", '<div class="watershed-chart-stat"><div class="watershed-chart-label">Creek read</div><div class="watershed-chart-value">📡 Offline</div></div>');
      setHTML("watershedChart", '<div class="watershed-chart-empty">Creek depth is offline until the gauge file comes back.</div>');
      setText("watershedScience", "Use the weather, rain totals, and creek color as backup clues until the gauge file comes back.");
      setText("pillWatershed", "Offline");
    }
  }

  function lightningNote(alerts) {
    const thunderAlert = (alerts || []).find((alert) => /thunderstorm|tornado|lightning/i.test((alert.event || "") + " " + (alert.headline || "")));
    if (thunderAlert) {
      return '<div class="alert-banner"><strong>⚡ Lightning caution:</strong> Any active thunderstorm warning, watch, or nearby thunder mention should be treated like real lightning risk around Cardiff.</div>';
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
      ? '<div class="alert-banner"><strong>Lightning caution:</strong> Any active thunderstorm warning, watch, or nearby thunder mention should be treated like real lightning risk around Cardiff.</div>'
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

  function buildWeather(wx, rain) {
    const moon = getMoonPhase(new Date());
    const sun = getSunTimes(new Date());
    const ground = groundCondition(wx.precipTotal, wx.humidity);
    const pressure = pressureNote(wx.pressureIn);
    const updatedLabel = "Updated " + formatClock(new Date(wx.obsTime || Date.now()));

    setText("wxUpdated", updatedLabel);
    setEmojiText("wxTemp", conditionIcon(wx.condition), wx.temp + "°F");
    setText("wxTempNote", tempNote(wx.temp));
    setEmojiText("wxHum", "💧", wx.humidity + "%");
    setText("wxHumNote", humidityNote(wx.humidity));
    setEmojiText("wxWind", windIcon(wx.windSpeed), Math.round(wx.windSpeed) + " mph");
    setText("wxWindNote", windNote(wx.windSpeed));
    setEmojiText("wxRain", ground.icon, ground.title);
    setText("wxRainNote", ground.note);
    setEmojiText("wxPressure", pressure.icon, Number.isFinite(wx.pressureIn) ? wx.pressureIn.toFixed(2) + '"' : "—");
    setText("wxPressureNote", pressure.note);
    setEmojiText("wxUV", "☀️", Number.isFinite(wx.uv) ? String(Math.round(wx.uv)) : "—");
    setText("wxUVNote", uvNote(wx.uv));
    setText("wxNarrative", wx.summary);
    setText("wxScience", "Air temperature, humidity, pressure, wind, and recent precipitation together explain why the creek bottoms feel different from the open ridge even on the same day.");
    setHTML("heroCond", emojiText(conditionIcon(wx.condition), wx.condition));
    setText("heroCondSub", "Feels like " + wx.feels + "°F · Wind " + Math.round(wx.windSpeed) + " mph " + wx.windDir);
    setHTML("heroRain", emojiText(ground.icon, ground.title));
    setText("heroRainSub", ground.note);
    setHTML("pillWeather", emojiText(conditionIcon(wx.condition), wx.temp + "°F · " + wx.condition));

    buildRainSummary(rain);
    buildMorningReport(rain && rain.morningReport ? rain.morningReport : null);
    buildFishing(wx, moon);
    buildSideSnapshot(wx, sun, moon, ground);
    refreshWeatherEmojiLayer(wx, ground, pressure);
    refreshFishingEmojiLayer(wx);
    refreshRainEmojiLayer(rain);
  }

  function summarizeWeather(wx) {
    const pieces = [];
    pieces.push(wx.temp + "°F");
    pieces.push(wx.condition.toLowerCase());
    if (wx.windSpeed >= 4) pieces.push("wind around " + Math.round(wx.windSpeed) + " mph");
    if (wx.humidity >= 75) pieces.push("humid air in the bottoms");
    if (wx.precipRate > 0.05) pieces.push("active precipitation");
    return "Right now around Cardiff it feels " + pieces.join(", ") + ".";
  }

  async function loadWeather() {
    try {
      const response = await fetch(WX_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("weather");
      const data = await response.json();
      if (!data.observations || !data.observations.length) throw new Error("weather");
      const obs = data.observations[0];
      const imp = obs.imperial || {};
      const wx = {
        temp: Math.round(Number(imp.temp)),
        feels: Math.round(Number(imp.heatIndex || imp.windChill || imp.temp)),
        humidity: Math.round(Number(obs.humidity || 0)),
        windSpeed: Number(imp.windSpeed || 0),
        windDir: directionFromDegrees(Number(obs.winddir)),
        precipRate: Number(imp.precipRate || 0),
        precipTotal: Number(imp.precipTotal || 0),
        pressureIn: Number((obs.imperial && obs.imperial.pressure) || imp.pressure || 0),
        uv: Number(obs.uv),
        obsTime: obs.obsTimeLocal || obs.obsTimeUtc,
        condition: weatherCondition(obs)
      };
      wx.summary = summarizeWeather(wx);
      latestWeatherPayload = data;
      setHTML("mhTemp", emojiText(conditionIcon(wx.condition), wx.temp + "°F"));
      setText("mhCond", wx.condition);
      setHTML("mhWind", emojiText(windIcon(wx.windSpeed), Math.round(wx.windSpeed) + " mph " + wx.windDir));
      buildWeather(wx, data.rain || null);
      buildSky(new Date(), getSunTimes(new Date()), getMoonPhase(new Date()));
      return wx;
    } catch (error) {
      latestWeatherPayload = null;
      setHTML("mhTemp", "&mdash;");
      setText("mhCond", "Offline");
      setText("mhWind", "Trying again soon");
      setText("wxUpdated", "Weather offline");
      setText("wxNarrative", "The live weather station did not answer just now. The rest of the almanac is still available.");
      setText("pillWeather", "Offline");
      setHTML("heroCond", emojiText("📡", "Station offline"));
      setText("heroCondSub", "Live conditions will return when the station responds.");
      setHTML("heroRain", emojiText("👣", "Use local ground check"));
      setText("heroRainSub", "Walk the yard, creek edge, or drive for the real footing report.");
      setText("rainToday", "—");
      setText("rainMonthLabel", "Rain tracked");
      setText("rainMonth", "—");
      setText("rainTodayNote", "Rain totals will return with the station feed.");
      setText("rainMonthNote", "Tracked month-to-date rain will return with the station feed.");
      buildMorningReport(null);
      setHTML("sideSnap",
        '<div class="side-item"><div class="side-icon">📡</div><div><div class="side-val">Weather station offline</div><div class="side-sub">The page is working, but the live weather source did not respond right now.</div></div></div>'
      );
      setHTML("fishBody",
        '<div class="fish-row"><div class="fish-icon">🎣</div><div class="fish-main"><div class="fish-name-line"><div class="fish-stars f-low">—</div><div class="fish-name">Live conditions unavailable</div></div><div class="fish-note">Fishing notes will repopulate automatically when the weather feed is back.</div></div></div>'
      );
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
    } catch (error) {
      const stripText = document.querySelector(".announce-strip-text");
      if (stripText) {
        stripText.textContent = "";
        setTickerMotion(stripText, false, "");
      }
      buildAlertsActiveOnly([]);
    }
  }

  async function loadForecast() {
    try {
      const response = await fetch(WX_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("forecast");
      const data = await response.json();
      const periods = Array.isArray(data.forecast) ? data.forecast.slice(0, 6) : [];
      if (!periods.length) throw new Error("forecast");

      setHTML("weekBody", periods.map((period) => (
        '<div class="side-item">' +
          '<div class="side-icon">' + forecastIcon(period.shortForecast, period.isDaytime) + "</div>" +
          "<div><div class=\"side-val\">" + period.name + " · " + period.temperature + "°" + period.temperatureUnit + "</div><div class=\"side-sub\">" + period.shortForecast + "</div></div>" +
        "</div>"
      )).join(""));
    } catch (error) {
      setHTML("weekBody",
        '<div style="font-family:var(--mono);font-size:0.62rem;color:var(--ink3);text-align:center;padding:0.5rem;">Forecast temporarily unavailable.</div>'
      );
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

  function loadForecast() {
    fetch(WX_URL, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("forecast");
        return response.json();
      })
      .then((data) => {
        const forecastPeriods = Array.isArray(data.forecast) ? data.forecast : [];
        const daytimePeriods = forecastPeriods.filter((period) => period && period.isDaytime).slice(0, 6);
        const periods = daytimePeriods.length ? daytimePeriods : forecastPeriods.slice(0, 6);
        if (!periods.length) throw new Error("forecast");
        setHTML("weekBody", '<div class="week-grid">' + periods.map((period) => (
          '<div class="week-item">' +
            '<div class="week-item-icon">' + forecastIcon(period.shortForecast, period.isDaytime) + "</div>" +
            '<div class="week-item-day">' + period.name + "</div>" +
            '<div class="week-item-temp">' + period.temperature + "°" + period.temperatureUnit + "</div>" +
            '<div class="week-item-note">' + period.shortForecast + "</div>" +
          "</div>"
        )).join("") + "</div>");
      })
      .catch(() => {
        setHTML("weekBody",
          '<div style="font-family:var(--mono);font-size:0.62rem;color:var(--ink3);text-align:center;padding:0.5rem;">Forecast temporarily unavailable.</div>'
        );
      });
  }

  function initTopo() {
    const canvas = document.getElementById("topo-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let frame = 0;
    let lines = [];

    function build() {
      lines = [];
      for (let i = 0; i < 30; i++) {
        const baseY = (height / 29) * i;
        const pts = [];
        for (let s = 0; s <= 26; s++) {
          pts.push([
            (width / 26) * s,
            baseY + Math.sin(s * 0.41 + i * 0.63) * 15 + Math.sin(s * 0.18 + i * 1.1) * 30 + Math.sin(s * 0.07 + i * 0.35) * 46 + Math.cos(s * 0.55 + i * 0.82) * 11
          ]);
        }
        const isIndex = i % 5 === 0;
        lines.push({
          pts: pts,
          color: isIndex ? "rgba(80,44,8,0.11)" : "rgba(80,44,8,0.052)",
          width: isIndex ? 1.2 : 0.6,
          phase: Math.random() * Math.PI * 2,
          speed: 0.0004 + Math.random() * 0.0004
        });
      }

      const creek = [];
      for (let s = 0; s <= 52; s++) {
        creek.push([
          (width / 52) * s,
          height * 0.72 + Math.sin(s * 0.22) * 58 + Math.sin(s * 0.13) * 88 + Math.cos(s * 0.35) * 26
        ]);
      }
      lines.push({
        pts: creek,
        color: "rgba(150,40,20,0.11)",
        width: 2.4,
        phase: 0,
        speed: 0.00025,
        dash: [8, 10]
      });
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      lines.forEach((line) => {
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        ctx.setLineDash(line.dash || []);
        const tick = frame * line.speed + line.phase;
        line.pts.forEach((point, index) => {
          const y = point[1] + Math.sin(tick + index * 0.28) * 2.8 + Math.sin(tick * 1.7 + index * 0.14) * 1.2 + Math.cos(tick * 0.8 + index * 0.42) * 1.6;
          if (index === 0) ctx.moveTo(point[0], y);
          else ctx.lineTo(point[0], y);
        });
        ctx.stroke();
      });
      ctx.setLineDash([]);
      frame += 1;
      requestAnimationFrame(draw);
    }

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      build();
    }

    window.addEventListener("resize", resize);
    resize();
    draw();
  }

  function boot() {
    try {
      seasonWindowsExpanded = window.localStorage.getItem("cardiff-season-windows-expanded") === "1";
    } catch (error) {
      seasonWindowsExpanded = false;
    }
    buildStaticSections();
    loadSkyGuide();
    initTopo();
    setupWatershedRangeControls();
    loadTicker();
    loadWatershed();
    loadWeather();
    loadAirQuality();
    loadForecast();
    window.setInterval(loadTicker, TICKER_REFRESH_MS);
    window.setInterval(loadWatershed, 10 * 60 * 1000);
    window.setInterval(loadWeather, 5 * 60 * 1000);
    window.setInterval(loadAirQuality, 15 * 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
