(function () {
  "use strict";

  /* ==========================================================================
     THE CALENDAR PAGE

     One month. The month either side of it is a step away, and every month the
     site keeps is in the archive room.

     The page used to draw nineteen months at once behind a rail of nineteen
     chips. Joe cut it: a reader opening a calendar wants the month they are
     in, and everything else was furniture standing in front of it. See
     DECISIONS.md 50.

     The engine is fivemile-calendar-core.js, shared with the archive room.
     Nothing in this file knows what Easter is or when the Brookside council
     moves off a holiday. It asks for a month and draws it.
     ========================================================================== */

  var C = window.FivemileCalendar;

  /* The month on screen is the hash, and the hash is the whole of the state.
     A step is a link, the back button works, and the address bar is something
     a reader can send to somebody. */
  function currentMonth(today) {
    var asked = C.parseMonthId(window.location.hash);
    return asked || { year: today.getFullYear(), month: today.getMonth() + 1 };
  }

  function isFirst(m) { return m.year === C.FIRST_YEAR && m.month === 1; }
  function isLast(m)  { return m.year === C.lastYear() && m.month === 12; }

  function shift(m, n) {
    var d = new Date(m.year, m.month - 1 + n, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  function dateCount(n) { return C.plural(n, "date", "dates"); }

  /* ------------------------------------------------------------------------
     THE COUNT OF EVERY MONTH

     Worked out once, off the same two sources a drawn month is drawn from,
     and read three times: by the step control, by the picker, and by the
     door. Counting a second time somewhere else is a second answer waiting
     to disagree with the first.
     ------------------------------------------------------------------------ */
  function countMonths(turnings) {
    var last = C.lastYear();
    var out = { total: 0, months: 0, by: {} };
    for (var year = C.FIRST_YEAR; year <= last; year++) {
      for (var month = 1; month <= 12; month++) {
        var n = C.monthItems(year, month, turnings, null).length;
        out.by[C.monthId(year, month)] = n;
        out.total += n;
        out.months++;
      }
    }
    return out;
  }

  function countFor(counts, m) {
    return m ? (counts.by[C.monthId(m.year, m.month)] || 0) : 0;
  }

  /* ------------------------------------------------------------------------
     THE STEP CONTROL

     Three parts across the top of the month: back a month, the month itself,
     forward a month. Each step names the month it goes to and says how many
     dates are in it, which is decision 28 again. A control reading only
     September is a heading with an arrow next to it, and a reader has to spend
     a tap to find out whether September has anything in it at all.

     At the two walls the step is an empty cell rather than a dead button. The
     column stays where it is, so the month title does not slide sideways in
     January.
     ------------------------------------------------------------------------ */
  function stepHtml(target, count, dir) {
    if (!target) return '<span class="mo-step off ' + dir + '" aria-hidden="true"></span>';
    var name = C.MONTH_FULL[target.month - 1];
    var label = (dir === "prev" ? "Back to " : "On to ") + name + " " + target.year;
    var body = '<span class="mo-step-bd"><b>' + name + '</b><small>' + dateCount(count) + '</small></span>';
    var arrow = '<span class="mo-arrow" aria-hidden="true">' + (dir === "prev" ? "&lsaquo;" : "&rsaquo;") + "</span>";
    return '<a class="mo-step ' + dir + '" href="#' + C.monthId(target.year, target.month) + '"' +
             ' rel="' + dir + '" aria-label="' + C.esc(label) + '">' +
             (dir === "prev" ? arrow + body : body + arrow) +
           "</a>";
  }

  function navHtml(m, counts, today) {
    var prev = isFirst(m) ? null : shift(m, -1);
    var next = isLast(m)  ? null : shift(m, 1);
    var here = { year: today.getFullYear(), month: today.getMonth() + 1 };
    var away = !(m.year === here.year && m.month === here.month);

    return '<div class="mo-nav">' +
             stepHtml(prev, countFor(counts, prev), "prev") +
             '<div class="mo-now">' +
               '<h2 id="the-month">' + C.MONTH_FULL[m.month - 1] + " " + m.year + "</h2>" +
               '<span class="mo-count">' + dateCount(countFor(counts, m)) + "</span>" +
             "</div>" +
             stepHtml(next, countFor(counts, next), "next") +
           "</div>" +
           '<div class="mo-foot">' +
             pickHtml(m, counts) +
             (away
               ? '<a class="mo-back" href="#' + C.monthId(here.year, here.month) + '">' +
                 "Back to " + C.MONTH_FULL[here.month - 1] + "</a>"
               : "") +
           "</div>";
  }

  /* ------------------------------------------------------------------------
     THE PICKER

     A step is the right control for the month either side and the wrong one
     for next January, which is six taps away and gives a reader nothing on
     the way there. Every month the calendar holds is in here in one tap, and
     each one says how many dates are in it before the tap is spent, which is
     decision 28 again.

     It is a select rather than a grid of chips because on a phone a select is
     the wheel the reader already knows, one thumb and no scrolling past
     thirty five things they did not want. The year is the optgroup, so
     January 2027 is found by looking for 2027 rather than by counting.
     ------------------------------------------------------------------------ */
  function pickHtml(m, counts) {
    var out = "";
    var last = C.lastYear();
    for (var year = C.FIRST_YEAR; year <= last; year++) {
      out += '<optgroup label="' + year + '">';
      for (var month = 1; month <= 12; month++) {
        var id = C.monthId(year, month);
        var on = year === m.year && month === m.month;
        out += '<option value="' + id + '"' + (on ? " selected" : "") + ">" +
                 C.MONTH_FULL[month - 1] + " " + year + " · " + dateCount(counts.by[id] || 0) +
               "</option>";
      }
      out += "</optgroup>";
    }
    return '<select class="mo-pick" id="calPick" aria-label="Go to another month">' + out + "</select>";
  }

  /* ------------------------------------------------------------------------
     THE DOOR

     One panel under the month, built the way the archive hub builds a door:
     three readings and a line, so it says what is behind it before anybody
     spends a tap on it. The figures are counted off the same two sources the
     room itself counts, so the number out here cannot drift from the number
     in there.
     ------------------------------------------------------------------------ */
  function fillDoor(counts) {
    if (!document.getElementById("calArcDates")) return;

    var set = function (id, value) {
      var el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    set("calArcDates", String(counts.total));
    set("calArcMonths", String(counts.months));
    set("calArcSince", "January " + C.FIRST_YEAR);
  }

  /* ------------------------------------------------------------------------
     DRAWING
     ------------------------------------------------------------------------ */
  function render(turnings, counts, today, opts) {
    var m = currentMonth(today);
    var items = C.monthItems(m.year, m.month, turnings, today);

    var nav = document.getElementById("calNav");
    if (nav) {
      nav.innerHTML = navHtml(m, counts, today);
      /* The picker writes the hash and the hashchange draws the month, so it
         goes down the same road a step goes down. Nothing here draws. */
      var pick = document.getElementById("calPick");
      if (pick) {
        pick.addEventListener("change", function () {
          window.location.hash = this.value;
        });
      }
    }

    var rows = document.getElementById("calMonth");
    if (rows) {
      rows.innerHTML = items.length
        ? '<div class="rows">' + items.map(function (item) { return C.stubHtml(item); }).join("") + "</div>"
        : '<div class="empty">&mdash;</div>';
    }

    document.title = C.MONTH_FULL[m.month - 1] + " " + m.year + " · Calendar · FIVEMILE";

    /* Somebody arriving on a link to March lands on March. Somebody stepping
       from August to September, with the control already in front of them,
       does not get thrown down the page: the rows change and the control stays
       exactly where their thumb left it. */
    var block = document.getElementById("the-month-block");
    if (block && opts && opts.jump) {
      var top = block.getBoundingClientRect().top;
      if (opts.first || top < 0 || top > window.innerHeight) {
        block.scrollIntoView({ block: "start", behavior: opts.first ? "auto" : "smooth" });
      }
    }
  }

  function boot() {
    var now = new Date();
    var today = C.atNoon(now.getFullYear(), now.getMonth() + 1, now.getDate());

    var stamp = document.getElementById("calStamp");
    if (stamp) {
      stamp.textContent = C.MONTH_FULL[today.getMonth()] + " " + today.getDate() + ", " + today.getFullYear();
    }

    C.loadTurnings().then(function (turnings) {
      var counts = countMonths(turnings);
      var deep = !!C.parseMonthId(window.location.hash);
      render(turnings, counts, today, { jump: deep, first: true });
      fillDoor(counts);

      window.addEventListener("hashchange", function () {
        render(turnings, counts, today, { jump: true, first: false });
      });

      requestAnimationFrame(function () {
        document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("visible"); });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
