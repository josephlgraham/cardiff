/* ===========================================================================
   FIVEMILE fishing desk

   Water temperature, oxygen, creek level, the barometer, and the moon, and
   what any of that means for a small Warrior basin creek.

   WHAT CHANGED AND WHY. This page used to show three rows of stars out of a
   ceiling of three, and the arithmetic behind them could only ever return two
   or three. A reader saw two stars on a cold February afternoon and two stars
   on a June evening and reasonably concluded the page was not telling them
   anything. The stars are gone. Each target now gets a word, and the word
   never appears without the sentence that earned it.

   The bigger change is underneath. The old page estimated water temperature
   from air temperature and the season, because that is what the almanac had.
   The Republic gauge has been reporting the actual water temperature and the
   actual dissolved oxygen the whole time, alongside the stage, and nothing on
   this site was reading either. Both are on the page now. The estimate is kept
   as a fallback for the days the gauge does not send one, and the tile says
   which of the two it is showing rather than quietly passing a guess off as a
   measurement.

   Oxygen is the reading that explains an August afternoon, and it is the one
   nothing else local publishes. Warm water holds less of it, so the hardest
   fishing of the year here is the hottest week and not the coldest.

   The species list is written into the HTML. This file only marks which of
   them today's water is in band for, and fills in the photographs from
   fivemile-guide.json, which is the site's one store of species pictures.

   Nothing here states a regulation, a limit, or an advisory finding that is
   not either linked to its source or marked as needing confirmation. The state
   changes all three and this is a static site.
   =========================================================================== */
(function () {
  "use strict";

  const FA = window.FivemileAlmanac;
  if (!FA) return;
  const SKY = window.FivemileSky || null;

  const setText = FA.setText;
  const setHTML = FA.setHTML;
  const escapeHtml = FA.escapeHtml;
  const iconHtml = FA.iconHtml;

  const GUIDE_URL = "fivemile-guide.json";

  /* -------------------------------------------------------------------------
     THE YEAR

     Written by water temperature rather than by date, because that is what the
     fish are actually responding to. The months are a rough guide to when this
     creek usually reaches each of those temperatures.
     ------------------------------------------------------------------------- */
  const FISHING_YEAR = {
    0: { lead: "Cold and slow", note: "Water in the forties. Everything holds deep and eats little. Catfish are the realistic target." },
    1: { lead: "First warming", note: "A run of mild days can lift the shallows enough to move bass out of the deep water for an afternoon." },
    2: { lead: "Pre-spawn", note: "Bass feed hard as the water climbs through the fifties. One of the better months of the year." },
    3: { lead: "Bass spawn", note: "The low sixties put spotted and largemouth bass on beds. Handle and release spawning fish quickly." },
    4: { lead: "Bream move up", note: "Water past sixty eight and the bluegill start bedding in the shallows. Easiest fishing of the year." },
    5: { lead: "Full summer pattern", note: "Everything works early and late. The middle of the day belongs to the shade and the deep bends." },
    6: { lead: "Hot and low", note: "Low, clear, warm water. First light or nothing, and catfish after dark." },
    7: { lead: "The hard month", note: "Warmest water of the year and the least oxygen in it. Fish the moving water and the shade." },
    8: { lead: "Cooling off", note: "The first cool nights drop the water back into a range the bass will work again." },
    9: { lead: "Fall feeding", note: "Shortening days push everything to eat. Bass move shallow again and stay catchable all day." },
    10: { lead: "Slowing down", note: "Water back through the fifties. The bite gets shorter and more predictable each week." },
    11: { lead: "Winter holding", note: "Deep, slow, and quiet. Fish are still there and still eat, just not much and not often." }
  };

  /* -------------------------------------------------------------------------
     WHAT A RISE DOES

     Four stages, in the order the creek goes through them. The stage the creek
     is actually at gets ruled in the list. Nothing here is a safety statement:
     the top band tells a reader the water has weight in it, and it does not
     tell anybody the water is safe.
     ------------------------------------------------------------------------- */
  const RISE_STAGES = [
    {
      key: "first", icon: "🌧️", name: "The first few hours",
      note: "The best window a rise gives you. Runoff washes worms and grubs off the bank into the channel and the fish move to the edges to take them. Catfish first, then everything else. Fish the margins and the mouths of the little feeder branches, not the middle."
    },
    {
      key: "coloring", icon: "🟫", name: "Coloring up",
      note: "Visibility drops and the fish that hunt by sight start losing interest. Catfish do not care and stay on, because they work by smell. Bass move tight against anything solid and wait for something to come past them."
    },
    {
      key: "high", icon: "🌊", name: "Up and pushing",
      note: "Past a certain speed a fish spends more holding station than it gets back from eating, so it leaves the channel. Everything is in the slack water: behind rocks, inside the bends, up in the flooded grass at the edge. The main channel is a treadmill and nothing feeds on one."
    },
    {
      key: "falling", icon: "⬇️", name: "Falling and clearing",
      note: "Usually the best of the whole event and the part most people miss. The creek is still carrying everything the rain brought and is no longer running hard enough to make feeding expensive. Fish drop back to the ordinary lies and eat."
    }
  ];

  /* Which of the four the creek is in, from the stage, the trend, and how fast
     it is moving. The rate matters: the trend word alone called a creek coming
     up an inch a day and one coming up a foot an hour by the same name. */
  function riseStage(stage, trend, rate) {
    if (!Number.isFinite(stage)) return null;
    const rising = trend === "rising" || (Number.isFinite(rate) && rate > 0.02);
    const falling = trend === "falling" || (Number.isFinite(rate) && rate < -0.02);
    if (stage >= 3.5) return "high";
    if (falling && stage >= 1.8) return "falling";
    if (rising && Number.isFinite(rate) && rate >= 0.15) return "coloring";
    if (rising) return "first";
    if (stage >= 2.6) return "high";
    return null;
  }

  /* -------------------------------------------------------------------------
     THE VERDICT

     Four words. They are chosen from the readings that actually moved, and
     each one is handed back with the sentence that produced it, because a
     verdict with no reason under it is a horoscope.
     ------------------------------------------------------------------------- */
  const VERDICTS = ["tough", "slow", "fair", "good"];

  function verdictChip(verdict, word) {
    return '<span class="fx-verdict fx-' + verdict + '">' + escapeHtml(word || verdict) + "</span>";
  }

  function factorRow(icon, name, reading, verdict, word, note) {
    return '<div class="alm-row">' +
      '<div class="alm-mark">' + iconHtml(icon) + "</div>" +
      "<div>" +
        '<div class="alm-head-line"><span class="alm-name">' + escapeHtml(name) + "</span>" +
        verdictChip(verdict, word) + "</div>" +
        '<div class="alm-when">' + escapeHtml(reading) + "</div>" +
        '<div class="alm-note">' + escapeHtml(note) + "</div>" +
      "</div></div>";
  }

  /* A water temperature, scored for fish in general. The curve is the reason
     the page can say something different in April and in August: sixty five to
     eighty is the band nearly everything here feeds in, and it falls off hard
     at both ends rather than stopping at a cliff. */
  function waterVerdict(water) {
    if (!Number.isFinite(water)) return { verdict: "fair", word: "No reading", note: "The gauge is not sending a water temperature and the estimate needs the weather station." };
    if (water >= 88) return { verdict: "tough", word: "Too warm", note: "Above the range anything here feeds comfortably in. First light, the shade, and the moving water are all that is left." };
    if (water >= 82) return { verdict: "slow", word: "Warm", note: "Warm enough that the middle of the day is a write-off. Everything worth doing happens at the two ends." };
    if (water >= 68) return { verdict: "good", word: "In the band", note: "The range bream and catfish both want, and bass will still work the edges of it." };
    if (water >= 58) return { verdict: "good", word: "In the band", note: "Comfortable for bass and getting there for everything else. This is the best water of the year." };
    if (water >= 50) return { verdict: "fair", word: "Cool", note: "Fish are still eating, just slowly and not far. Slow the bait down and fish the deeper water." };
    return { verdict: "slow", word: "Cold", note: "Everything is holding deep and eating very little. Catfish are the realistic target." };
  }

  /* The barometer. The trend does more than the level: a falling glass ahead of
     a front is the classic feeding window and a hard rise behind one is the
     classic dead afternoon. The station reports the trend, so this reads it
     rather than guessing from a single number. */
  function pressureVerdict(pressure, trend) {
    if (trend === "falling") return { verdict: "good", word: "Falling", note: "A falling glass ahead of a front is the oldest reliable sign in fishing, and the hours before the weather arrives are the ones to take." };
    if (trend === "rising") return { verdict: "slow", word: "Rising", note: "A rising glass behind a front is the hardest weather there is to fish. Everything settles deep and stays slow to commit for a day or so." };
    if (pressure.label === "High and settled") return { verdict: "good", word: "Settled", note: "Steady high pressure means fish hold predictable edges and ambush cover, so a plan is worth making." };
    if (pressure.label === "Lower pressure") return { verdict: "fair", word: "Low", note: "The barometer is low and holding, which is not the sharp change that switches a bite on, but not the dead flat behind a front either." };
    return { verdict: "fair", word: "Steady", note: "The barometer is giving no strong signal either way, so the water and the light will decide today rather than the weather." };
  }

  function creekVerdict(stage, trend, rate, mood) {
    if (!Number.isFinite(stage)) return { verdict: "fair", word: "No reading", note: "The Republic gauge is not answering, so judge the water from the bank." };
    if (stage >= 3.5) return { verdict: "tough", word: "High", note: "Fast, higher water deserves a respectful eye, and nothing feeds in a current it cannot hold station in." };
    if (trend === "falling" && stage >= 1.8) return { verdict: "good", word: "Dropping", note: "The falling side of a rise, which is usually the best few hours the creek gives you all month." };
    if (trend === "rising") return { verdict: "good", word: "Rising", note: "Coming up, which means food going into the channel and fish moving to the edges to meet it." };
    if (stage < 1.2) return { verdict: "fair", word: "Low", note: "Low and clear. Everything can see you coming, so keep off the skyline and fish the deeper holes." };
    return { verdict: "good", word: "Steady", note: mood.note };
  }

  /* One overall word for the day, from the factors that carry the most weight.
     Deliberately hard to please: three of the four have to be good before the
     page will say so, because a page that says good every day is a page nobody
     checks twice. */
  function overallVerdict(scores) {
    const total = scores.reduce(function (sum, verdict) { return sum + VERDICTS.indexOf(verdict); }, 0);
    const best = scores.length * 3;
    const share = best ? total / best : 0;
    if (share >= 0.85) return { verdict: "good", word: "As good as it gets here" };
    if (share >= 0.65) return { verdict: "good", word: "Worth going" };
    if (share >= 0.45) return { verdict: "fair", word: "Fair" };
    if (share >= 0.25) return { verdict: "slow", word: "Slow" };
    return { verdict: "tough", word: "Tough" };
  }

  /* -------------------------------------------------------------------------
     THE THREE TARGETS

     Catfish, bass, and bream, which is how anybody here decides what to take
     with them. Each gets a word and a sentence naming the reading behind it.
     ------------------------------------------------------------------------- */
  function targetRows(read) {
    const water = read.water;
    const oxygen = read.oxygen;
    const rows = [];

    /* Catfish. Colored water and a rise are the classic window, and they are
       the least bothered by warm water and thin oxygen of anything here. */
    let v = "fair";
    let note;
    if (read.risingNow) {
      v = "good";
      note = "The creek is coming up, which washes food into the channel and is the best few hours a catfish will give you all month.";
    } else if (water >= 70 && oxygen.verdict !== "tough") {
      v = "good";
      note = "Warm water and a steady creek. Fish the deeper bends through the day and the shallow edges after dark.";
    } else if (water < 55) {
      v = "fair";
      note = "Cold, so they are deep and slow, but catfish keep eating through winter better than anything else here does.";
    } else {
      note = "Nothing against them today. A bait that smells, fished on the bottom in the deepest bend you can reach.";
    }
    if (oxygen.verdict === "tough") {
      v = "slow";
      note = "Oxygen is low enough to put even the catfish off, and they are the last ones to stop.";
    }
    rows.push({ key: "catfish", icon: "🐟", name: "Catfish", verdict: v, note: note });

    /* Bass. The fussiest of the three about pressure and the most rewarded by
       settled weather. */
    v = "fair";
    if (water < 50 || water > 88) {
      v = "slow";
      note = "The water is outside the range a bass will move far in. Fish slowly, deep, and expect one rather than several.";
    } else if (read.pressure.verdict === "good" && water >= 55 && water <= 80) {
      v = "good";
      note = "Settled weather and water in the band. Bass will be holding the obvious edges, so fish where a bend, a hole, and a fallen tree meet.";
    } else if (read.pressure.verdict === "slow") {
      v = "slow";
      note = "A rising glass behind a front scatters bass and slows them down. Fish the structure you are surest of and give it longer.";
    } else {
      note = "Nothing decisive either way. Work the current seams for spotted bass and the slack water for largemouth.";
    }
    rows.push({ key: "bass", icon: "🐠", name: "Bass", verdict: v, note: note });

    /* Bream. Almost purely a water temperature question, and the easiest
       fishing of the year when the answer is yes. */
    if (water >= 70 && water <= 86 && oxygen.verdict !== "tough") {
      v = "good";
      note = "Warm shallows and quiet banks. Bluegill and shellcracker are the easiest fishing on this creek right now and the best thing to take a child to.";
    } else if (water >= 64) {
      v = "fair";
      note = "Close. They are there and they will bite, but the beds are the thing and the water needs a few more degrees for that.";
    } else {
      v = "slow";
      note = "Too cold for the shallows to be worth working. They are still around, just deep and uninterested.";
    }
    rows.push({ key: "bream", icon: "🐡", name: "Bream", verdict: v, note: note });

    return rows;
  }

  function renderTargets(rows) {
    setHTML("fishRatings", rows.map(function (row) {
      return '<div class="alm-row">' +
        '<div class="alm-mark">' + iconHtml(row.icon) + "</div>" +
        "<div>" +
          '<div class="alm-head-line"><span class="alm-name">' + escapeHtml(row.name) + "</span>" +
          verdictChip(row.verdict) + "</div>" +
          '<div class="alm-note">' + escapeHtml(row.note) + "</div>" +
        "</div></div>";
    }).join(""));
  }

  /* -------------------------------------------------------------------------
     SOLUNAR
     ------------------------------------------------------------------------- */
  function clock(date) {
    return date ? FA.formatClock(date) : "—";
  }

  function renderSolunar(now, sun) {
    if (!SKY) {
      setHTML("solList", '<div class="empty">&mdash;</div>');
      return null;
    }
    const sol = SKY.solunar(now, sun);
    if (!sol.periods.length) {
      setHTML("solList", '<div class="empty">&mdash;</div>');
      return sol;
    }

    setHTML("solList", sol.periods.map(function (period) {
      const running = now >= period.start && now <= period.end;
      const verdict = period.rank === "Best" ? "good" : period.rank === "Good" ? "fair" : "slow";
      return '<div class="alm-row' + (running ? " on" : "") + '">' +
        '<div class="alm-mark">' + iconHtml(period.kind === "major" ? "🌕" : "🌒") + "</div>" +
        "<div>" +
          '<div class="alm-head-line"><span class="alm-name">' + escapeHtml(period.label) + "</span>" +
          verdictChip(verdict, running ? "Running now" : period.rank) + "</div>" +
          '<div class="alm-when">' + escapeHtml(clock(period.start) + " to " + clock(period.end)) +
            " &middot; " + escapeHtml(period.kind === "major" ? "Major, about two hours" : "Minor, about an hour") + "</div>" +
        "</div></div>";
    }).join(""));

    const lit = Math.round(sol.illumination.fraction * 100);
    setText("solMoonStamp", lit + "% lit, " + (sol.illumination.waxing ? "waxing" : "waning"));
    setText("solStamp", sol.best
      ? "Best today is " + sol.best.label.toLowerCase() + ", " + clock(sol.best.mid)
      : "—");
    return sol;
  }

  /* -------------------------------------------------------------------------
     WHAT A RISE DOES
     ------------------------------------------------------------------------- */
  function renderRise(stage, trend, rate) {
    const current = riseStage(stage, trend, rate);
    setHTML("riseStages", RISE_STAGES.map(function (entry) {
      const on = entry.key === current;
      return '<div class="alm-row' + (on ? " on" : "") + '">' +
        '<div class="alm-mark">' + iconHtml(entry.icon) + "</div>" +
        "<div>" +
          '<div class="alm-head-line"><span class="alm-name">' + escapeHtml(entry.name) + "</span>" +
          (on ? verdictChip("good", "Where it is now") : "") + "</div>" +
          '<div class="alm-note">' + escapeHtml(entry.note) + "</div>" +
        "</div></div>";
    }).join(""));

    const notice = document.getElementById("riseNotice");
    const rising = trend === "rising" || (Number.isFinite(rate) && rate > 0.02);
    if (notice) notice.hidden = !rising;
    if (rising) {
      const speed = Number.isFinite(rate) && rate > 0
        ? "about " + (rate >= 0.1 ? rate.toFixed(1) : rate.toFixed(2)) + " feet an hour"
        : "slowly";
      setText("riseNoticeHead", "The creek is coming up");
      setText("riseNoticeBody", "Republic has it rising " + speed +
        (Number.isFinite(stage) ? ", at " + stage.toFixed(2) + " feet" : "") +
        ". The first hours of a rise are the best fishing a creek this size gives you, and the middle of it is the worst. Which of those you are in is marked below.");
    }
    setText("riseStageStamp", current
      ? RISE_STAGES.find(function (entry) { return entry.key === current; }).name
      : "None of them today");
    setText("riseStamp", Number.isFinite(stage)
      ? stage.toFixed(2) + " ft at Republic, " + (trend || "steady")
      : "—");
  }

  /* -------------------------------------------------------------------------
     THE FISH

     The cards are in the HTML. This marks the ones today's water is in band
     for, and hangs the field guide's photograph in each. One store of species
     pictures on the site, one set of credits, and no file path written down
     twice to go stale when the picks change.
     ------------------------------------------------------------------------- */
  /* Three states, not two. The first pass marked every fish whose feeding
     range today's water falls inside, and on an August afternoon that is
     twelve cards out of thirteen, which is the same as marking none of them.
     The narrower band is the water each fish is actually best in, and only
     that one gets the border. */
  /* How many are in their best water, said out loud. Ten green chips out of
     thirteen is noise if the reader has to count them and information if the
     page does it for them, and on a February afternoon the same line reads two
     of thirteen, which is the more useful day to be told. */
  function markFishBands(water) {
    let prime = 0;
    let total = 0;
    Array.prototype.forEach.call(document.querySelectorAll(".card-fish"), function (card) {
      total += 1;
      const state = card.querySelector("[data-fish-state]");
      if (!Number.isFinite(water)) {
        card.classList.remove("on");
        if (state) { state.textContent = ""; state.className = "fh-state fx-quiet"; }
        return;
      }
      const from = Number(card.getAttribute("data-from"));
      const to = Number(card.getAttribute("data-to"));
      const best = water >= Number(card.getAttribute("data-best-from")) &&
        water <= Number(card.getAttribute("data-best-to"));
      const feeding = water >= from && water <= to;
      card.classList.toggle("on", best);
      if (best) prime += 1;
      if (state) {
        state.textContent = best ? "Prime now" : feeding ? "Will feed" : "Out of season";
        state.className = "fh-state" + (best ? "" : feeding ? " fx-quiet" : " fx-off");
      }
    });

    const words = ["none", "one", "two", "three", "four", "five", "six",
      "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen"];
    const count = words[prime] || prime;
    setText("fishCountStamp", Number.isFinite(water)
      ? count.charAt(0).toUpperCase() + count.slice(1) + " of " + (words[total] || total) +
        " are in their best water today"
      : "Thirteen, and counting");
  }

  async function fillFishPhotos() {
    const cards = document.querySelectorAll(".card-fish");
    if (!cards.length) return;
    let guide;
    try {
      guide = await FA.fetchJSON(GUIDE_URL);
    } catch (error) {
      /* The card is complete without a picture. Nothing to say and nothing to
         put in its place, so the paper block stays as it is. */
      return;
    }
    const species = {};
    (guide.species || []).forEach(function (entry) { species[entry.id] = entry; });

    /* The guide rotates its three by the day of the year so a page is not the
       same page every visit. Same rule here, and the same arithmetic, so a
       fish shows the same photograph in both places on the same day. */
    const day = FA.dayOfYear(new Date());

    Array.prototype.forEach.call(cards, function (card) {
      const entry = species[card.getAttribute("data-fish")];
      const photos = (entry && entry.photos) || [];
      if (!photos.length) return;
      const photo = photos[day % photos.length];

      const host = card.querySelector("[data-fish-photo]");
      if (host) {
        const img = document.createElement("img");
        img.src = photo.thumb || photo.src;
        img.alt = photo.alt || "";
        img.loading = "lazy";
        img.decoding = "async";
        host.appendChild(img);
      }

      /* Two of the three licences require the name and CC0 does not. It goes
         on all of them, because doing it only where it is compulsory makes the
         credit a legal notice instead of a byline. Decision 39. */
      const credit = card.querySelector("[data-fish-credit]");
      if (credit) {
        const bits = [escapeHtml(photo.credit || "Unknown")];
        if (photo.where) bits.push(escapeHtml(photo.where));
        if (photo.license) bits.push(escapeHtml(photo.license));
        credit.innerHTML = photo.url
          ? '<a href="' + escapeHtml(photo.url) + '" target="_blank" rel="noopener">' + bits.join(" &middot; ") + "</a>"
          : bits.join(" &middot; ");
        credit.hidden = false;
      }
    });
  }

  /* ------------------------------------------------------------------------- */
  function renderYear(month) {
    FA.renderMonthYear("fishYear", "fishYearExpand", month, function (i) {
      return FISHING_YEAR[i];
    }, { stampId: "fishYearStamp" });
  }

  function paintTile(id, value, sentence) {
    setHTML(id + "Val", value == null ? "&mdash;" : escapeHtml(value));
    setText(id + "Sub", sentence || "This reading is not coming through right now.");
  }

  /* One paragraph a person would say out loud, rather than four verdict
     sentences run together. Each reading gets a short clause of its own and
     the detail stays in the rows above, where it belongs. */
  function narrative(read, sol) {
    const parts = [];

    if (Number.isFinite(read.water)) {
      parts.push("The creek is running " + Math.round(read.water) + " degrees" +
        (read.waterMeasured ? " at Republic" : " by estimate, the gauge not being able to say") +
        (Number.isFinite(read.oxygenValue)
          ? ", with " + read.oxygenValue.toFixed(1) + " milligrams of oxygen a litre in it, which is "
            + read.oxygen.label.toLowerCase() + "."
          : "."));
    }

    if (Number.isFinite(read.stage)) {
      parts.push("It stands at " + read.stage.toFixed(2) + " feet, " +
        (read.trend === "steady" || !read.trend ? "holding" : read.trend) + ", so " +
        read.mood.note.charAt(0).toLowerCase() + read.mood.note.slice(1));
    }

    if (read.pressureLabel) parts.push(read.pressure.note);

    if (sol && sol.best) {
      parts.push("The moon puts the strongest of the four feeding periods around " +
        clock(sol.best.mid) + ".");
    }

    return parts.join(" ");
  }

  async function load() {
    const now = new Date();
    const month = now.getMonth();
    const sun = FA.getSunTimes(now);

    renderYear(month);
    setText("fishStamp", now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));

    const sol = renderSolunar(now, sun);

    const results = await Promise.all([FA.readWeather(), FA.readCreek()]);
    const wx = results[0];
    const creek = results[1];

    const stage = creek && Number.isFinite(creek.stage) ? creek.stage : NaN;
    const rate = creek ? creek.riseRate : NaN;
    const trend = creek ? creek.trend : null;
    const mood = FA.creekMood(stage);

    paintTile("fishCreek", Number.isFinite(stage) ? stage.toFixed(2) + " ft" : null,
      Number.isFinite(stage) ? mood.label + ". " + mood.note : "The Republic gauge is not answering right now.");
    FA.setTileMark("fishCreek", FA.trendEmoji(trend), mood.label);

    /* Measured beats estimated, and the tile says which one it is showing. */
    const measured = creek && Number.isFinite(creek.waterTemp);
    const water = measured
      ? creek.waterTemp
      : (wx ? FA.estimateWaterTemp(wx.temp, month) : NaN);

    paintTile("fishWater", Number.isFinite(water) ? Math.round(water) + "°F" : null,
      measured
        ? "Measured in the creek at Republic, alongside the stage."
        : wx
          ? "Estimated from air temperature and the season. The gauge is not sending a water reading today."
          : "Neither the gauge nor the weather station is answering.");

    const oxygenValue = creek ? creek.oxygen : NaN;
    const oxygen = FA.oxygenNote(oxygenValue);
    paintTile("fishOxygen", Number.isFinite(oxygenValue) ? oxygenValue.toFixed(1) + " mg/L" : null,
      Number.isFinite(oxygenValue) ? oxygen.label + ". " + oxygen.note : oxygen.note);
    FA.setTileMark("fishOxygen", oxygen.icon, "Dissolved oxygen, " + oxygen.label.toLowerCase());

    renderRise(stage, trend, rate);
    markFishBands(water);

    const pressure = wx ? FA.pressureNote(wx.pressureIn) : { label: "Steady", note: "The station is not reporting a barometer right now.", icon: "🧭" };
    const pressureTrend = wx && wx.raw ? wx.raw.pressureTrend : null;
    const pressureRead = wx ? pressureVerdict(pressure, pressureTrend) : { verdict: "fair", word: "No reading", note: "The station is not reporting a barometer right now." };
    const waterRead = waterVerdict(water);
    const creekRead = creekVerdict(stage, trend, rate, mood);

    const read = {
      water: water,
      waterMeasured: measured,
      waterRead: waterRead,
      oxygen: oxygen,
      oxygenValue: oxygenValue,
      stage: stage,
      trend: trend,
      mood: mood,
      pressure: pressureRead,
      pressureLabel: wx ? pressure.label : null,
      risingNow: trend === "rising" || (Number.isFinite(rate) && rate > 0.02)
    };

    setHTML("fishFactors", [
      factorRow("🌡️", "Water temperature",
        Number.isFinite(water) ? Math.round(water) + "°F " + (measured ? "measured at Republic" : "estimated from the air") : "No reading",
        waterRead.verdict, waterRead.word, waterRead.note),
      factorRow(oxygen.icon, "Dissolved oxygen",
        Number.isFinite(oxygenValue) ? oxygenValue.toFixed(1) + " mg/L at Republic" : "No reading",
        oxygen.verdict, oxygen.label, oxygen.note),
      factorRow("🧭", "The barometer",
        wx && Number.isFinite(wx.pressureIn) ? wx.pressureIn.toFixed(2) + " in, " + (pressureTrend || "steady") : "No reading",
        pressureRead.verdict, pressureRead.word, pressureRead.note),
      factorRow("🌊", "The creek",
        Number.isFinite(stage) ? stage.toFixed(2) + " ft, " + (trend || "steady") + (creek && Number.isFinite(creek.discharge) ? ", " + FA.formatCfs(creek.discharge) : "") : "No reading",
        creekRead.verdict, creekRead.word, creekRead.note)
    ].join(""));

    const overall = overallVerdict([waterRead.verdict, oxygen.verdict, pressureRead.verdict, creekRead.verdict]);
    setHTML("fishReadStamp", verdictChip(overall.verdict, overall.word));

    renderTargets(targetRows(read));
    setText("fishTargetStamp", Number.isFinite(water)
      ? Math.round(water) + "°F water"
      : "Waiting on a reading");

    /* The best window tile is the moon's now rather than a rule of thumb about
       the afternoon. The rule of thumb is still in the sentence underneath,
       because the light matters as much as the moon does. */
    if (sol && sol.best) {
      /* The strongest period of a day is often the moon overhead at two in the
         morning, and a tile that sends a reader out then is a tile nobody uses.
         What goes on it is the strongest period falling within reach of the
         light, which is an hour and a half either side of the sun, and the
         sentence says where the outright best one is when it is somewhere
         else. */
      const edge = 90 * 60000;
      const reachable = sol.periods.filter(function (period) {
        return period.mid >= (sun.rise.getTime() - edge) && period.mid <= (sun.set.getTime() + edge);
      }).sort(function (a, b) { return b.strength - a.strength; });
      const pick = reachable[0] || sol.best;
      paintTile("fishWindow", clock(pick.mid),
        pick.label + ", " + (pick.kind === "major" ? "a major period" : "a minor one") +
        (pick !== sol.best
          ? ", and the best of the four within reach of daylight. The strongest today is " +
            sol.best.label.toLowerCase() + " at " + clock(sol.best.mid) + ", in the dark."
          : ", and the strongest of today's four."));
      FA.setTileMark("fishWindow", pick.kind === "major" ? "🌕" : "🌒", pick.label);
    } else if (wx) {
      const window = FA.bestFishingWindow(wx);
      paintTile("fishWindow", window.time, window.note);
    } else {
      paintTile("fishWindow", null, "The daily window needs either the sky arithmetic or the station reading.");
    }

    setText("fishNarrative", narrative(read, sol) || "Neither the gauge nor the station is answering right now, so there is nothing to read off.");

    FA.setRailSub("fishing", (Number.isFinite(water) ? Math.round(water) + "°F water" : "Gauge quiet") +
      (sol && sol.best ? " · best " + clock(sol.best.mid) : ""));
  }

  function boot() {
    FA.renderRail("fishing");
    FA.renderBackLink();
    fillFishPhotos();
    load();
    window.setInterval(load, 10 * 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
