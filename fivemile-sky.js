/* ===========================================================================
   FIVEMILE sky engine

   Where the sun, the moon, and the five naked eye planets are, worked out on
   the page from the date and nothing else. No network, no key, no third party
   script. The rest of the site fetches a JSON file that a scheduled job wrote;
   this is arithmetic, and arithmetic does not need a fetcher.

   WHY IT IS ITS OWN FILE. Two pages want it and they are not in the same
   family. The fishing desk wants the moon, because the solunar times a good
   many people here fish by are moonrise, moonset, and the two times the moon
   is directly overhead and directly underfoot. The news page wants the
   planets. fivemile-almanac-core.js is the almanac family's shared file and
   the news page has no business loading the planting year to find out where
   Jupiter is.

   WHAT IS IN IT AND HOW GOOD IT IS. The method is Paul Schlyter's, the one
   that has been on the open web since the nineties: mean orbital elements as
   linear functions of the day number, Kepler solved by iteration, and the
   larger perturbations added back for the moon. That is good to about two
   arcminutes for the planets and better than a tenth of a degree for the moon.
   Rise and set land within a minute or two, which is finer than anybody
   standing on a creek bank needs and far finer than the weather.

   It is deliberately not good enough for an eclipse or an occultation and this
   file must never be used to say one is happening. It answers where something
   is and roughly when it comes up, and that is all it claims.

   WHAT IT WILL NOT DO. No horoscopes. Naming the constellation a planet sits
   in front of would need the IAU boundary table, which is a data file this
   page has no other use for, so a planet here is described the way a person
   standing outside would describe it: what time it rises, which way to look,
   and how bright it is against the others.
   =========================================================================== */
(function () {
  "use strict";

  /* The middle of the three towns, same pair the almanac uses. */
  const LAT = 33.640;
  const LON = -86.870;

  const RAD = Math.PI / 180;
  const DEG = 180 / Math.PI;

  const sin = (d) => Math.sin(d * RAD);
  const cos = (d) => Math.cos(d * RAD);
  const tan = (d) => Math.tan(d * RAD);
  const asin = (x) => Math.asin(Math.max(-1, Math.min(1, x))) * DEG;
  const atan2 = (y, x) => Math.atan2(y, x) * DEG;

  function rev(deg) {
    return ((deg % 360) + 360) % 360;
  }

  /* Schlyter's day number: days from 2000 January 0.0 UT, fractional. Built
     from the UTC parts rather than from the epoch millisecond count so the
     arithmetic reads the same as the published method and can be checked
     against it line by line. */
  function dayNumber(date) {
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const ut = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const d = 367 * y
      - Math.floor(7 * (y + Math.floor((m + 9) / 12)) / 4)
      + Math.floor(275 * m / 9) + day - 730530;
    return d + ut / 24;
  }

  function obliquity(d) {
    return 23.4393 - 3.563e-7 * d;
  }

  /* -------------------------------------------------------------------------
     THE SUN

     Returned in both ecliptic and equatorial form, plus the two quantities
     everything else needs: the sun's rectangular coordinates, which turn a
     heliocentric planet into a geocentric one, and its mean longitude, which
     is what sidereal time is counted from.
     ------------------------------------------------------------------------- */
  function sunAt(d) {
    const w = 282.9404 + 4.70935e-5 * d;
    const e = 0.016709 - 1.151e-9 * d;
    const M = rev(356.0470 + 0.9856002585 * d);

    const E = M + e * DEG * sin(M) * (1 + e * cos(M));
    const xv = cos(E) - e;
    const yv = Math.sqrt(1 - e * e) * sin(E);
    const v = rev(atan2(yv, xv));
    const r = Math.sqrt(xv * xv + yv * yv);

    const lon = rev(v + w);
    const ecl = obliquity(d);
    const x = r * cos(lon);
    const y = r * sin(lon);

    return {
      lon: lon,
      r: r,
      /* Rectangular, ecliptic, geocentric. */
      xs: x,
      ys: y,
      ra: rev(atan2(y * cos(ecl), x)),
      dec: asin(y * sin(ecl) / r),
      meanLon: rev(w + M)
    };
  }

  /* -------------------------------------------------------------------------
     THE MOON

     The elements, then the perturbations. Left as mean elements the moon is
     out by up to about one and a third degrees, which is five minutes on a
     moonrise and enough to make a solunar table wrong. The terms below are the
     largest of them: the evection, the variation, the yearly equation, and the
     rest down to a tenth of a degree.
     ------------------------------------------------------------------------- */
  function moonAt(d) {
    const N = rev(125.1228 - 0.0529538083 * d);
    const i = 5.1454;
    const w = rev(318.0634 + 0.1643573223 * d);
    const a = 60.2666;
    const e = 0.054900;
    const M = rev(115.3654 + 13.0649929509 * d);

    let E = M + e * DEG * sin(M) * (1 + e * cos(M));
    for (let n = 0; n < 6; n += 1) {
      const dE = (E - e * DEG * sin(E) - M) / (1 - e * cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-6) break;
    }

    const xv = a * (cos(E) - e);
    const yv = a * Math.sqrt(1 - e * e) * sin(E);
    const v = rev(atan2(yv, xv));
    const r = Math.sqrt(xv * xv + yv * yv);

    /* Position in the ecliptic, before perturbation. */
    const xh = r * (cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(i));
    const yh = r * (sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(i));
    const zh = r * sin(v + w) * sin(i);

    let lon = rev(atan2(yh, xh));
    let lat = atan2(zh, Math.sqrt(xh * xh + yh * yh));

    /* The arguments the perturbation terms are written in. */
    const sun = sunAt(d);
    const Ms = rev(356.0470 + 0.9856002585 * d);
    const Ls = sun.meanLon;
    const Lm = rev(N + w + M);
    const D = rev(Lm - Ls);
    const F = rev(Lm - N);

    lon += -1.274 * sin(M - 2 * D)
      + 0.658 * sin(2 * D)
      - 0.186 * sin(Ms)
      - 0.059 * sin(2 * M - 2 * D)
      - 0.057 * sin(M - 2 * D + Ms)
      + 0.053 * sin(M + 2 * D)
      + 0.046 * sin(2 * D - Ms)
      + 0.041 * sin(M - Ms)
      - 0.035 * sin(D)
      - 0.031 * sin(M + Ms)
      - 0.015 * sin(2 * F - 2 * D)
      + 0.011 * sin(M - 4 * D);

    lat += -0.173 * sin(F - 2 * D)
      - 0.055 * sin(M - F - 2 * D)
      - 0.046 * sin(M + F - 2 * D)
      + 0.033 * sin(F + 2 * D)
      + 0.017 * sin(2 * M + F);

    const dist = r - 0.58 * cos(M - 2 * D) - 0.46 * cos(2 * D);

    lon = rev(lon);
    const ecl = obliquity(d);
    const xg = dist * cos(lon) * cos(lat);
    const yg = dist * sin(lon) * cos(lat);
    const zg = dist * sin(lat);
    const ye = yg * cos(ecl) - zg * sin(ecl);
    const ze = yg * sin(ecl) + zg * cos(ecl);

    return {
      lon: lon,
      lat: lat,
      /* Earth radii. Parallax comes off this and it is what sets the altitude
         the moon counts as risen at. */
      dist: dist,
      ra: rev(atan2(ye, xg)),
      dec: atan2(ze, Math.sqrt(xg * xg + ye * ye)),
      sunLon: sun.lon
    };
  }

  /* How much of the disk is lit, and which way round it is. The elongation is
     the angle between the moon and the sun as seen from here, so nought is new
     and a hundred and eighty is full. This is a better answer than counting
     days since a known new moon, which is what the almanac's phase lookup
     does, because the month is not 29.53 days every time. */
  function moonIllumination(date) {
    const m = moonAt(dayNumber(date));
    const elong = rev(m.lon - m.sunLon);
    /* How far apart the two look in the sky, folded to nought through a
       hundred and eighty. The lit fraction runs off this and not off the
       elongation, which keeps going round past full. */
    const separation = 180 - Math.abs(180 - elong);
    return {
      elongation: elong,
      separation: separation,
      /* 0 at new, 1 at full. */
      fraction: (1 - cos(separation)) / 2,
      waxing: elong < 180
    };
  }

  /* -------------------------------------------------------------------------
     THE PLANETS

     Mean elements as linear functions of the day number. Mercury through
     Saturn, which is every planet a person can see from a yard without help,
     and the reason Uranus and Neptune are not here.

     The perturbations of Jupiter and Saturn by each other run to about half a
     degree and are left out. Half a degree is two minutes on a rise time and
     nothing at all on which way to look, and this page says which way to look.
     ------------------------------------------------------------------------- */
  const PLANETS = [
    {
      key: "mercury", name: "Mercury", mark: "☉",
      N: [48.3313, 3.24587e-5], i: [7.0047, 5.00e-8], w: [29.1241, 1.01444e-5],
      a: 0.387098, e: [0.205635, 5.59e-10], M: [168.6562, 4.0923344368],
      mag: function (r, R, FV) { return -0.36 + 5 * Math.log10(r * R) + 0.027 * FV + 2.2e-13 * Math.pow(FV, 6); },
      note: "Never far from the sun and never up for long, so it is the one most people here have never knowingly seen."
    },
    {
      key: "venus", name: "Venus", mark: "♀",
      N: [76.6799, 2.46590e-5], i: [3.3946, 2.75e-8], w: [54.8910, 1.38374e-5],
      a: 0.723330, e: [0.006773, -1.302e-9], M: [48.0052, 1.6021302244],
      mag: function (r, R, FV) { return -4.34 + 5 * Math.log10(r * R) + 0.013 * FV + 4.2e-7 * Math.pow(FV, 3); },
      note: "The bright one. If something in the dusk or the dawn is far brighter than anything near it, this is what it is."
    },
    {
      key: "mars", name: "Mars", mark: "♂",
      N: [49.5574, 2.11081e-5], i: [1.8497, -1.78e-8], w: [286.5016, 2.92961e-5],
      a: 1.523688, e: [0.093405, 2.516e-9], M: [18.6021, 0.5240207766],
      mag: function (r, R, FV) { return -1.51 + 5 * Math.log10(r * R) + 0.016 * FV; },
      note: "Orange, and steady rather than twinkling. It swings from unmistakable to unremarkable over about two years."
    },
    {
      key: "jupiter", name: "Jupiter", mark: "♃",
      N: [100.4542, 2.76854e-5], i: [1.3030, -1.557e-7], w: [273.8777, 1.64505e-5],
      a: 5.20256, e: [0.048498, 4.469e-9], M: [19.8950, 0.0830853001],
      mag: function (r, R, FV) { return -9.25 + 5 * Math.log10(r * R) + 0.014 * FV; },
      note: "Second only to Venus most years, and unlike Venus it is up in the middle of the night as well as at the ends of it."
    },
    {
      key: "saturn", name: "Saturn", mark: "♄",
      N: [113.6634, 2.38980e-5], i: [2.4886, -1.081e-7], w: [339.3939, 2.97661e-5],
      a: 9.55475, e: [0.055546, -9.499e-9], M: [316.9670, 0.0334442282],
      mag: function (r, R, FV) { return -9.0 + 5 * Math.log10(r * R) + 0.044 * FV; },
      rings: true,
      note: "Yellowish and calm. Bright enough to pick out but never showy, and the rings need something to look through."
    }
  ];

  function planetAt(planet, d) {
    const N = rev(planet.N[0] + planet.N[1] * d);
    const i = planet.i[0] + planet.i[1] * d;
    const w = rev(planet.w[0] + planet.w[1] * d);
    const a = planet.a;
    const e = planet.e[0] + planet.e[1] * d;
    const M = rev(planet.M[0] + planet.M[1] * d);

    let E = M + e * DEG * sin(M) * (1 + e * cos(M));
    for (let n = 0; n < 8; n += 1) {
      const dE = (E - e * DEG * sin(E) - M) / (1 - e * cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-7) break;
    }

    const xv = a * (cos(E) - e);
    const yv = a * Math.sqrt(1 - e * e) * sin(E);
    const v = rev(atan2(yv, xv));
    const r = Math.sqrt(xv * xv + yv * yv);

    const xh = r * (cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(i));
    const yh = r * (sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(i));
    const zh = r * sin(v + w) * sin(i);

    const sun = sunAt(d);
    const xg = xh + sun.xs;
    const yg = yh + sun.ys;
    const zg = zh;

    const ecl = obliquity(d);
    const ye = yg * cos(ecl) - zg * sin(ecl);
    const ze = yg * sin(ecl) + zg * cos(ecl);

    /* Distance from here, and the phase angle, which is what a magnitude
       formula needs on top of the two distances. */
    const dist = Math.sqrt(xg * xg + yg * yg + zg * zg);
    const R = sun.r;
    const FV = Math.acos(Math.max(-1, Math.min(1,
      (r * r + dist * dist - R * R) / (2 * r * dist)))) * DEG;

    let mag = planet.mag(r, dist, FV);

    /* Saturn without the rings is wrong by up to a magnitude, which is the
       difference between the reader picking it out and not. The tilt of the
       rings as seen from here runs from edge on, when they add nothing, to
       wide open, when they roughly double the light. */
    if (planet.rings) {
      /* Ecliptic, not equatorial. ye and ze have already been turned through
         the obliquity and are right ascension and declination in disguise,
         and feeding those to a formula that wants ecliptic latitude opens the
         rings to twenty five degrees in a year they are nearly edge on. */
      const lonG = rev(atan2(yg, xg));
      const latG = atan2(zg, Math.sqrt(xg * xg + yg * yg));
      const ir = 28.06;
      const Nr = 169.51 + 3.82e-5 * d;
      const B = asin(sin(latG) * cos(ir) - cos(latG) * sin(ir) * sin(lonG - Nr));
      mag += -2.6 * Math.abs(sin(B)) + 1.2 * sin(B) * sin(B);
    }

    return {
      ra: rev(atan2(ye, xg)),
      dec: atan2(ze, Math.sqrt(xg * xg + ye * ye)),
      dist: dist,
      /* How far from the sun in the sky. Under about fifteen degrees nothing
         is realistically visible, whatever its magnitude says. */
      elongation: Math.acos(Math.max(-1, Math.min(1,
        (R * R + dist * dist - r * r) / (2 * R * dist)))) * DEG,
      magnitude: mag,
      lon: rev(atan2(yh + sun.ys, xh + sun.xs)),
      sunLon: sun.lon
    };
  }

  /* -------------------------------------------------------------------------
     RISE, SET, AND THE TWO TRANSITS

     One routine for anything with a right ascension and a declination. It is
     worked in universal time and handed back as ordinary Date objects, so the
     page formats them in the reader's own clock without knowing any of this
     happened.

     The three UT days either side are all tried and only the events that land
     on the local day asked for are kept. A moonrise at ten in the evening
     Central is the small hours of the next day in UT, and a routine that works
     one UT day at a time drops it or reports it on the wrong date. This is the
     bug that costs an hour to find, so it is written down here.
     ------------------------------------------------------------------------- */
  function utDayStart(date, offsetDays) {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + (offsetDays || 0));
  }

  function localDateKey(dateLike) {
    const d = new Date(dateLike);
    return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
  }

  /* Greenwich mean sidereal time at 0h UT of the day number given, in hours. */
  function gmst0(d) {
    return rev(sunAt(d).meanLon + 180) / 15;
  }

  /* When the body's hour angle reaches `hourAngle` degrees during this UT day.
     Zero is the meridian crossing overhead and a hundred and eighty is the one
     underfoot. Solved by starting from the middle of the day and iterating,
     because the body has moved by the time it gets there. The moon moves half
     a degree an hour, so one pass is not enough for it and three is plenty. */
  /* When the body reaches a given hour angle during this UT day. Zero is the
     meridian crossing overhead, a hundred and eighty is the one underfoot, and
     plus or minus the semi diurnal arc is setting and rising. The wanted angle
     is a function of the position rather than a constant, because the rising
     one depends on the declination and the declination is what is being solved
     for. It returns null when the body does not reach that angle at all.

     Solved by starting from the middle of the day and iterating, because the
     body has moved by the time it gets there. The moon shifts half a degree an
     hour, so one pass is not enough for it and four is plenty. */
  function crossing(bodyAt, dayStartMs, hourAngleOf, lon) {
    let ut = 12;
    let last = null;
    for (let n = 0; n < 4; n += 1) {
      const d = dayNumber(new Date(dayStartMs + ut * 3600000));
      const pos = bodyAt(d);
      const ha = hourAngleOf(pos);
      if (ha === null) return null;
      last = ut;
      ut = rev(pos.ra + ha - gmst0(d) * 15 - lon) / 15;
    }
    /* A UT day does not always contain the crossing being looked for. The moon
       crosses the meridian every twenty four hours and fifty minutes, so one
       day in about thirty holds none at all, and on that day the wrap in rev()
       hands back a value that never settles. Two passes agreeing to within
       five minutes is the test for a real answer, and anything else is that
       day not having one, which is a fact about the day rather than an error.

       This is the bug that put the moon underfoot an hour out on the fourth of
       September and on no other day that year, which is exactly the sort of
       thing nobody finds by checking today. */
    if (Math.abs(ut - last) > 1 / 12 && Math.abs(Math.abs(ut - last) - 24) > 1 / 12) return null;
    return ut;
  }

  /* The altitude the body counts as risen at. Refraction lifts everything by
     about a third of a degree, and the moon is close enough that parallax
     lifts it by nearly a degree more. bodyAt reports a distance in Earth radii
     for the moon and in astronomical units for everything else, which is what
     the range test below is reading. */
  function horizonFor(pos, h0) {
    if (Number.isFinite(pos.dist) && pos.dist > 2 && pos.dist < 100) {
      return 0.7275 * asin(1 / pos.dist) - 0.5667;
    }
    return h0;
  }

  function eventsForUtDay(bodyAt, dayStartMs, h0, lat, lon) {
    function semiArc(pos) {
      const horizon = horizonFor(pos, h0);
      const cosLha = (sin(horizon) - sin(lat) * sin(pos.dec)) / (cos(lat) * cos(pos.dec));
      if (cosLha < -1 || cosLha > 1) return null;
      return Math.acos(cosLha) * DEG;
    }

    const at = (ut) => (ut === null ? null : new Date(dayStartMs + ut * 3600000));
    const noon = bodyAt(dayNumber(new Date(dayStartMs + 12 * 3600000)));
    const arc = semiArc(noon);

    return {
      /* Each event is solved on its own. Taking rise and set as the transit
         plus or minus the arc loses both of them on the one day a month the
         transit itself falls outside the day, and a moonrise that vanishes
         once a month is worse than one that is a minute out. */
      transit: at(crossing(bodyAt, dayStartMs, () => 0, lon)),
      underfoot: at(crossing(bodyAt, dayStartMs, () => 180, lon)),
      rise: at(crossing(bodyAt, dayStartMs, (pos) => { const a = semiArc(pos); return a === null ? null : -a; }, lon)),
      set: at(crossing(bodyAt, dayStartMs, semiArc, lon)),
      alwaysUp: arc === null && noon.dec * lat > 0,
      neverUp: arc === null && noon.dec * lat <= 0
    };
  }

  function riseSetTransit(date, bodyAt, options) {
    const opts = options || {};
    const h0 = Number.isFinite(opts.h0) ? opts.h0 : -0.5667;
    const lat = Number.isFinite(opts.lat) ? opts.lat : LAT;
    const lon = Number.isFinite(opts.lon) ? opts.lon : LON;
    const want = localDateKey(date);

    const found = { rise: null, set: null, transit: null, underfoot: null, alwaysUp: false, neverUp: false };
    for (let offset = -1; offset <= 1; offset += 1) {
      const day = eventsForUtDay(bodyAt, utDayStart(date, offset), h0, lat, lon);
      if (offset === 0) {
        found.alwaysUp = day.alwaysUp;
        found.neverUp = day.neverUp;
      }
      ["rise", "set", "transit", "underfoot"].forEach(function (key) {
        const at = day[key];
        if (at && !found[key] && localDateKey(at) === want) found[key] = at;
      });
    }
    return found;
  }

  function moonTimes(date, options) {
    return riseSetTransit(date, function (d) { return moonAt(d); }, options);
  }

  function planetTimes(planet, date, options) {
    return riseSetTransit(date, function (d) { return planetAt(planet, d); }, options);
  }

  /* -------------------------------------------------------------------------
     SOLUNAR

     What it is: the moon is overhead twice a day, once above and once below,
     and it comes up and goes down once each. Anglers have fished the four
     since John Alden Knight wrote the tables in 1926. The two overhead times
     are the majors and run about two hours, and moonrise and moonset are the
     minors and run about one.

     What it is not: a measurement. No gauge on this creek reports it and this
     site does not pretend one does. It is a prediction people fish by, and the
     page says so where it shows it.

     The strength is the moon's own: full and new pull hardest, because the sun
     and the moon are lined up, and a solunar period landing on top of sunrise
     or sunset counts for more than one landing at noon.
     ------------------------------------------------------------------------- */
  function overlapsTwilight(period, sun) {
    if (!sun || !sun.rise || !sun.set) return false;
    const near = 90 * 60000;
    return (Math.abs(period.mid - sun.rise) < near) || (Math.abs(period.mid - sun.set) < near);
  }

  function solunar(date, sun, options) {
    const times = moonTimes(date, options);
    const lit = moonIllumination(date);
    const periods = [];

    function push(at, kind, label) {
      if (!at) return;
      const half = (kind === "major" ? 60 : 30) * 60000;
      periods.push({
        kind: kind,
        label: label,
        mid: at,
        start: new Date(at.getTime() - half),
        end: new Date(at.getTime() + half)
      });
    }

    push(times.transit, "major", "Moon overhead");
    push(times.underfoot, "major", "Moon underfoot");
    push(times.rise, "minor", "Moonrise");
    push(times.set, "minor", "Moonset");
    periods.sort(function (a, b) { return a.mid - b.mid; });

    /* Nought to one, and it does not reach one often. A major on a full moon
       at first light is the best this creek offers and everything else is
       measured down from it. */
    const pull = Math.abs(lit.fraction - 0.5) * 2;
    periods.forEach(function (period) {
      let score = period.kind === "major" ? 0.62 : 0.42;
      score += 0.18 * pull;
      if (overlapsTwilight(period, sun)) score += 0.2;
      period.strength = Math.min(1, score);
      period.rank = period.strength >= 0.78 ? "Best" : period.strength >= 0.6 ? "Good" : "Worth a look";
    });

    const best = periods.slice().sort(function (a, b) { return b.strength - a.strength; })[0] || null;
    return { periods: periods, best: best, times: times, illumination: lit };
  }

  /* -------------------------------------------------------------------------
     WHAT IS UP TONIGHT

     A planet is worth naming if it is above the horizon at some point between
     dusk and dawn, is far enough from the sun to be seen at all, and is not so
     faint it needs a chart. Fifteen degrees of elongation is the practical
     floor and it is why Mercury is absent from this list most of the year.
     ------------------------------------------------------------------------- */
  function compassPoint(azimuth) {
    const names = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
    return names[Math.round(rev(azimuth) / 45) % 8];
  }

  /* Where on the horizon it comes up, which is more use to somebody in a yard
     than an azimuth in degrees. */
  function riseAzimuth(dec, lat) {
    const c = sin(dec) / cos(lat);
    if (c < -1 || c > 1) return null;
    return Math.acos(c) * DEG;
  }

  function planetsTonight(date, options) {
    const opts = options || {};
    const lat = Number.isFinite(opts.lat) ? opts.lat : LAT;
    const out = [];

    PLANETS.forEach(function (planet) {
      const pos = planetAt(planet, dayNumber(date));
      if (pos.elongation < 18) return;

      const times = planetTimes(planet, date, opts);
      const az = riseAzimuth(pos.dec, lat);
      /* Ahead of the sun in longitude means it sets after the sun does, which
         is the evening sky. Behind it means it rises first, which is the
         morning. Past a hundred and twenty degrees out from the sun it is
         neither: it comes up in the evening and goes down near dawn, and
         calling that a morning planet sends a reader out at the wrong end of
         the night. */
      const evening = rev(pos.lon - pos.sunLon) < 180;
      const allNight = pos.elongation >= 120;

      out.push({
        key: planet.key,
        name: planet.name,
        note: planet.note,
        magnitude: Math.round(pos.magnitude * 10) / 10,
        elongation: Math.round(pos.elongation),
        when: allNight ? "night" : evening ? "evening" : "morning",
        /* Close in to the sun it is a real object in a bad sky. The page says
           so rather than listing it beside Venus as though they were the same
           proposition. */
        marginal: pos.elongation < 30,
        rise: times.rise,
        set: times.set,
        transit: times.transit,
        alwaysUp: times.alwaysUp,
        neverUp: times.neverUp,
        risesIn: az === null ? null : compassPoint(az),
        setsIn: az === null ? null : compassPoint(360 - az)
      });
    });

    out.sort(function (a, b) { return a.magnitude - b.magnitude; });
    return out;
  }

  /* -------------------------------------------------------------------------
     WHERE THE YEAR IS

     The named stretches of the year that are astronomical or old enough to be
     worth naming, with what actually causes them. The dog days are the one
     everybody says and almost nobody can source, so the entry says where the
     name comes from and is careful about what it does and does not claim.

     turnings.json carries the eight Candlemas to Yuletide turnings and this is
     not a second copy of them. These are the shorter stretches inside a year
     that a person would name in conversation.
     ------------------------------------------------------------------------- */
  const STRETCHES = [
    {
      id: "dog-days", name: "The dog days", mark: "☀️",
      from: [6, 3], to: [7, 11],
      line: "The hottest and stillest stretch of the year, and the only one named after a star.",
      why: "Sirius is the Dog Star and the brightest one in the sky, and for the Greeks and Romans this was the run of weeks when it rose and set with the sun. They blamed it for the heat. The dates the almanacs still print, July 3 to August 11, are that old reckoning rather than a weather forecast, and Sirius has drifted since."
    },
    {
      id: "blackberry-winter", name: "Blackberry winter", mark: "❄️",
      from: [3, 25], to: [4, 15],
      line: "The cold snap that lands after everything has already leafed out.",
      why: "An old Southern name for a late cold spell, said to arrive while the blackberries are in bloom. It is a name for a thing that happens rather than a date on a calendar, so some years it does not turn up at all."
    },
    {
      id: "indian-summer", name: "The second summer", mark: "🍂",
      from: [9, 15], to: [10, 15],
      line: "The warm quiet spell that comes back after the first frost has already been.",
      why: "A run of still, hazy, warm days in late autumn, after the first frost rather than before it. That order is the whole definition: warm weather in October that has not been preceded by a frost is just October."
    },
    {
      id: "long-nights", name: "The long nights", mark: "🌑",
      from: [11, 1], to: [0, 20],
      line: "Six weeks either side of the solstice, when there is more dark than anything else.",
      why: "The earliest sunset comes about two weeks before the solstice and the latest sunrise about two weeks after it, because the solar day is not exactly twenty four hours in December. The shortest day sits between the two rather than on top of either."
    }
  ];

  function inStretch(date, stretch) {
    const md = (date.getMonth() + 1) * 100 + date.getDate();
    const from = (stretch.from[0] + 1) * 100 + stretch.from[1];
    const to = (stretch.to[0] + 1) * 100 + stretch.to[1];
    return from <= to ? (md >= from && md <= to) : (md >= from || md <= to);
  }

  function currentStretch(date) {
    return STRETCHES.find(function (stretch) { return inStretch(date, stretch); }) || null;
  }

  /* ------------------------------------------------------------------------- */
  window.FivemileSky = {
    LAT: LAT,
    LON: LON,
    PLANETS: PLANETS,
    STRETCHES: STRETCHES,

    dayNumber: dayNumber,
    sunAt: sunAt,
    moonAt: moonAt,
    planetAt: planetAt,
    moonIllumination: moonIllumination,
    riseSetTransit: riseSetTransit,
    moonTimes: moonTimes,
    planetTimes: planetTimes,
    solunar: solunar,
    planetsTonight: planetsTonight,
    currentStretch: currentStretch,
    inStretch: inStretch
  };
})();
