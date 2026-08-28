/* What goes into the creek.
 *
 * Reads fivemile-echo.json and fivemile-watershed.json and renders both
 * without adding anything to them. The rule this page is built around is that
 * it reports the record and links to EPA, and never characterises a facility.
 * That is not a style preference. Every row names a real business in a small
 * place, and the civic work this site supports depends on being unimpeachable.
 *
 * So: no severity words, no colour scale, no ranking language. One typographic
 * flag on a sustained noncompliance count, because a number a reader would
 * otherwise scroll past is the whole reason the column is there, and the flag
 * says nothing the number does not already say.
 */
(function () {
  'use strict';

  var ECHO_URL = 'fivemile-echo.json';
  var WATERSHED_URL = 'fivemile-watershed.json';

  /* At or above this many of the last twelve quarters, the count is set in the
     accent colour. Four is a year. Below that it reads as ordinary. */
  var SUSTAINED = 4;

  function byId(id) { return document.getElementById(id); }

  function esc(value) {
    var box = document.createElement('div');
    box.textContent = String(value == null ? '' : value);
    return box.innerHTML;
  }

  function setText(id, value) {
    var host = byId(id);
    if (host && value) host.textContent = value;
  }

  function loadJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    });
  }

  var MONTHS = ['January','February','March','April','May','June','July',
                'August','September','October','November','December'];

  /* 2026-05-30 reads as a database key. May 30 reads as a date. Parsed as
     parts rather than through Date, which would shift the day backwards for
     anybody west of UTC. */
  function longDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return String(iso || '');
    return MONTHS[Number(m[2]) - 1] + ' ' + Number(m[3]) + ', ' + m[1];
  }

  function num(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  /* "AquaticLifeUse" is not something to put in front of a reader. */
  var USE_LABELS = {
    AquaticLifeUse: 'Aquatic life',
    FishConsumptionUse: 'Eating the fish',
    RecreationUse: 'Recreation',
    EcologicalUse: 'Ecological health',
    DrinkingWaterUse: 'Drinking water',
    OtherUse: 'Other uses'
  };

  /* Title case for EPA's shouted cause groups, which arrive as
     ORGANIC ENRICHMENT/OXYGEN DEPLETION. The words are not changed, only the
     shouting, because a wall of capitals reads as editorial alarm and the
     alarm should come from the fact rather than from the styling. */
  function gentle(text) {
    return String(text || '').toLowerCase().replace(/(^|[\s/(-])([a-z])/g, function (m, pre, ch) {
      return pre + ch.toUpperCase();
    });
  }

  /* Spell small numbers, because "Two businesses" reads like a sentence and
     "2 businesses" reads like a spreadsheet. */
  var WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
               'eight', 'nine', 'ten', 'eleven', 'twelve'];
  function spell(n) { return WORDS[n] !== undefined ? WORDS[n] : String(n); }

  function plural(n, one, many) { return n === 1 ? one : many; }

  /* Quarters into something a person says out loud. Twelve quarters is three
     years, and three years is the number that lands. */
  function spanFromQuarters(q) {
    if (!q) return '';
    if (q % 4 === 0 && q >= 4) {
      var years = q / 4;
      return spell(years) + ' ' + plural(years, 'year', 'years');
    }
    return spell(q) + ' ' + plural(q, 'quarter', 'quarters');
  }

  /* The lead. Built from the file rather than written down, so that the day one
     of these businesses files its paperwork the sentence changes with it and
     nobody has to remember to come back and edit this page. */
  function renderLead(echo) {
    var rows = (echo && echo.facilities) || [];
    var late = rows.filter(function (f) {
      return /failure to report/i.test(String(f.main_violation || '')) &&
        num(f.main_violation_quarters) >= 4;
    }).sort(function (a, b) {
      return num(b.main_violation_quarters) - num(a.main_violation_quarters);
    });
    if (!late.length) return;

    var longest = num(late[0].main_violation_quarters);
    var fined = late.filter(function (f) {
      var p = String(f.total_penalties || '').replace(/[^0-9.]/g, '');
      return Number(p) > 0;
    }).length;

    setText('dcLeadLine',
      spell(late.length).charAt(0).toUpperCase() + spell(late.length).slice(1) + ' ' +
      plural(late.length, 'business', 'businesses') + ' upstream of these three towns ' +
      plural(late.length, 'has', 'have') + ' a permit to put something into Five Mile Creek, and ' +
      plural(late.length, 'has', 'have') + ' not filed a report saying what.');

    var sub = byId('dcLeadSub');
    if (sub) {
      sub.textContent =
        'The longest of them has gone ' + spanFromQuarters(longest) + ' without sending in the paperwork ' +
        'the permit asks for, and the EPA has marked it every quarter of that time. ' +
        (fined === 0
          ? 'Not one of them has been fined a dollar over it.'
          : spell(fined) + ' of them ' + plural(fined, 'has', 'have') + ' been fined.') +
        ' This does not mean anything harmful went into the creek. It means that for as long as those ' +
        'reports have been missing, nobody has been in a position to say either way.';
    }

    var host = byId('dcLeadList');
    if (!host) return;
    host.innerHTML = '<div class="fac-cards lead-cards">' + late.map(function (f) {
      return '<div class="fac-card">' +
        '<a class="fac-name" href="' + esc(f.echo_url) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a>' +
        '<div class="fac-row"><span>Missing reports</span><span>' +
          esc(spanFromQuarters(num(f.main_violation_quarters))) + '</span></div>' +
        '<div class="fac-row"><span>Times inspected</span><span>' +
          esc(f.inspections == null ? 'not recorded' : String(f.inspections)) + '</span></div>' +
        '<div class="fac-row"><span>Fines</span><span>' +
          esc(f.total_penalties || 'none recorded') + '</span></div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function renderVerdict(echo) {
    var a = echo && echo.assessment;
    if (!a) return;

    setText('dcKick', 'US EPA assessment, ' + (a.reporting_cycle || '') + ' reporting cycle');
    setText('dcCondition', a.condition || '');

    var sub = byId('dcConditionSub');
    if (sub) {
      var name = a.waterbody_name || 'This creek';
      var bits = name + ' is assessment unit ' + (a.assessment_unit || '') +
        '. That wording is the EPA’s, and a restoration plan being on the books means a cleanup ' +
        'target has been set for it rather than that the work is finished.';
      sub.innerHTML = esc(bits) +
        (a.epa_url ? ' <a href="' + esc(a.epa_url) + '" target="_blank" rel="noopener">Read the EPA report on this waterbody</a>.' : '');
    }

    var causes = byId('dcCauses');
    if (causes && a.causes_impaired && a.causes_impaired.length) {
      causes.innerHTML = a.causes_impaired.map(function (c) {
        return '<span class="cause">' + esc(gentle(c)) + '</span>';
      }).join('');
    }

    var uses = byId('dcUses');
    if (uses && a.designated_uses) {
      var cells = [];
      Object.keys(USE_LABELS).forEach(function (key) {
        var value = a.designated_uses[key];
        if (!value) return;
        cells.push(
          '<div class="use"><div class="use-name">' + esc(USE_LABELS[key]) + '</div>' +
          '<div class="use-val">' + esc(value) + '</div></div>'
        );
      });
      uses.innerHTML = cells.join('');
    }
  }

  function renderOxygen(watershed) {
    var host = byId('dcOxygen');
    if (!host) return;
    var record = watershed && watershed.oxygenRecord;
    var lead = (watershed && watershed.gauges || []).filter(function (g) {
      return g.role === 'lead';
    })[0];
    var now = lead ? num(lead.dissolved_oxygen_mgl) : null;
    if (!record && now == null) return;

    var cells = [];
    if (now != null) {
      cells.push(cell('Oxygen right now', now.toFixed(1), 'mg/l'));
    }
    if (record) {
      cells.push(cell('Lowest daily low', record.lowest.toFixed(1), 'mg/l'));
      cells.push(cell('Days below 5.0', String(record.days_under_5), 'of ' + record.days));
      cells.push(cell('Days below 4.0', String(record.days_under_4), 'of ' + record.days));
    }
    if (lead && num(lead.specific_conductance_uscm) != null) {
      cells.push(cell('Conductance', String(num(lead.specific_conductance_uscm)), 'µS/cm'));
    }
    host.innerHTML = cells.join('');

    var note = byId('dcOxygenNote');
    if (note && record) {
      note.textContent =
        'Oxygen depletion is one of the things the creek is listed as impaired for, so the daily low is ' +
        'the number that matters rather than the daily average: a creek can average comfortably and still ' +
        'run low before dawn. Across ' + record.days + ' days from ' + longDate(record.first) + ' to ' + longDate(record.last) +
        ', the lowest the creek got was ' + record.lowest.toFixed(1) + ' mg/l, on ' + longDate(record.lowest_on) + '. ' +
        'Conductance is a rough measure of how much dissolved material the water is carrying.';
    }
  }

  function cell(key, value, unit) {
    return '<div class="ox-cell"><div class="ox-k">' + esc(key) + '</div>' +
      '<div class="ox-v">' + esc(value) + '<span class="ox-u">' + esc(unit) + '</span></div></div>';
  }

  function ncCell(facility) {
    var nc = num(facility.quarters_in_noncompliance);
    if (nc == null) return '<span class="fac-nc">&mdash;</span>';
    var cls = nc >= SUSTAINED ? 'fac-nc flag' : 'fac-nc';
    return '<span class="' + cls + '">' + nc + ' of 12</span>';
  }

  function renderList(echo) {
    var host = byId('dcList');
    if (!host) return;
    var rows = (echo && echo.facilities) || [];
    if (!rows.length) return;

    var head = '<table class="fac-table"><thead><tr>' +
      '<th>Facility</th><th>Permit</th><th class="opt">Discharges to</th>' +
      '<th class="opt">Last inspected</th><th>Quarters in noncompliance</th>' +
      '</tr></thead><tbody>';

    var body = rows.map(function (f) {
      return '<tr>' +
        '<td><a class="fac-name" href="' + esc(f.echo_url) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a>' +
        (f.city ? '<div class="fac-permit">' + esc(f.city) + '</div>' : '') + '</td>' +
        '<td class="fac-permit">' + esc(f.permit) + '</td>' +
        '<td class="opt">' + esc(f.receiving_water || '—') + '</td>' +
        '<td class="opt fac-permit">' + esc(f.last_inspection || 'none recorded') + '</td>' +
        '<td>' + ncCell(f) + '</td>' +
        '</tr>';
    }).join('');

    var cards = '<div class="fac-cards">' + rows.map(function (f) {
      return '<div class="fac-card">' +
        '<a class="fac-name" href="' + esc(f.echo_url) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a>' +
        '<div class="fac-row"><span>Permit</span><span>' + esc(f.permit) + '</span></div>' +
        '<div class="fac-row"><span>Discharges to</span><span>' + esc(f.receiving_water || '—') + '</span></div>' +
        '<div class="fac-row"><span>Last inspected</span><span>' + esc(f.last_inspection || 'none recorded') + '</span></div>' +
        '<div class="fac-row"><span>Noncompliance</span><span>' + ncCell(f) + '</span></div>' +
        '</div>';
    }).join('') + '</div>';

    host.innerHTML = head + body + '</tbody></table>' + cards;

    var counts = echo.counts || {};
    var sustained = rows.filter(function (f) {
      return num(f.quarters_in_noncompliance) >= SUSTAINED;
    }).length;
    setText('dcStamp',
      rows.length + ' permits in force · ' + sustained + ' in noncompliance a year or more · ' +
      (counts.in_watershed_terminated || 0) + ' terminated');
  }

  function boot() {
    loadJson(ECHO_URL).then(function (echo) {
      renderLead(echo);
      renderVerdict(echo);
      renderList(echo);
    }).catch(function () { /* the em dashes are already on the page */ });

    loadJson(WATERSHED_URL).then(renderOxygen)
      .catch(function () { /* same */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
