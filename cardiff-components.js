// ─────────────────────────────────────────────────────────────────────
//  Cardiff Components — Web Component definitions
//
//  Usage: add <script src="cardiff-components.js"></script> in <head>,
//  then place <cardiff-masthead></cardiff-masthead> in the page body.
//
//  No Shadow DOM — global CSS and cardiff-common.js (weather, ticker,
//  watershed) work without any changes.
// ─────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  var TABS = [
    { id: 'home',     href: 'index.html',            label: 'Home' },
    { id: 'news',     href: 'cardiff-news.html',     label: 'News' },
    { id: 'almanac',  href: 'cardiff-almanac.html',  label: 'Almanac' },
    { id: 'calendar', href: 'cardiff-calendar.html', label: 'Calendar' },
    { id: 'guide',    href: 'cardiff-guide.html',    label: 'Field Guide' },
    { id: 'kitchen',  href: 'cardiff-kitchen.html',  label: 'Recipes' },
    { id: 'cemetery', href: 'cardiff-cemetery.html', label: 'Cemetery' },
    { id: 'civic',    href: 'cardiff-civic.html',    label: 'Civic Pathway' },
    { id: 'involved', href: 'cardiff-involved.html', label: 'Get Involved' }
  ];

  function detectActiveTab() {
    var page = window.location.pathname.split('/').pop().toLowerCase();
    if (!page || page === 'index.html') return 'home';
    for (var i = 0; i < TABS.length; i++) {
      if (page === TABS[i].href.toLowerCase()) return TABS[i].id;
    }
    for (var j = 0; j < TABS.length; j++) {
      if (page.indexOf(TABS[j].id) !== -1) return TABS[j].id;
    }
    return 'home';
  }

  function buildMastheadHTML() {
    var activeId = detectActiveTab();

    var tabsHtml = TABS.map(function (tab) {
      var cls = tab.id === activeId ? ' class="active"' : '';
      var label = tab.label.replace(/&/g, '&amp;');
      return '<a href="' + tab.href + '" id="tab-' + tab.id + '"' + cls + '>' + label + '</a>';
    }).join('\n    ');

    return '<header class="cardiff-masthead">' +
      '<div class="mh-identity">' +
        '<div class="mh-left-info"><a href="https://freshwaterlandtrust.org/what-we-do/about-red-rock-trail-system/five-mile-creek/" class="mh-left-link" target="_blank" rel="noopener">Five Mile Creek Watershed<br>Jefferson County, Alabama</a></div>' +
        '<div class="mh-brand"><a href="index.html" class="mh-brand-link"><div class="mh-brand-name">Cardiff<span class="comma"> &middot; </span>Alabama</div><span class="mh-brand-sub">Incorporated January 1900</span></a></div>' +
        '<div class="mh-right-info"><a href="cardiff-almanac.html#watershed-card" class="mh-wx-link"><span class="wx-hi" id="mhCreekStage">\uD83C\uDF0A Creek</span> &nbsp;&middot;&nbsp; <span id="mhCreekCond">&mdash;</span></a><br><span id="mhCreekSrc">Five Mile Creek</span></div>' +
        '<div class="mh-mobile-pills">' +
          '<a href="cardiff-almanac.html#watershed-card" class="mh-pill" id="mhCreekPill">\uD83C\uDF0A Creek</a>' +
        '</div>' +
      '</div>' +
      '<nav class="mh-tabs">' +
        tabsHtml +
      '</nav>' +
      '<div class="announce-strip">' +
        '<div class="announce-strip-scroll"><span class="announce-strip-text"></span></div>' +
      '</div>' +
    '</header>';
  }

  var CardiffMasthead = (function () {
    function CardiffMasthead() {
      return Reflect.construct(HTMLElement, [], CardiffMasthead);
    }
    CardiffMasthead.prototype = Object.create(HTMLElement.prototype, {
      constructor: { value: CardiffMasthead }
    });
    CardiffMasthead.prototype.connectedCallback = function () {
      this.innerHTML = buildMastheadHTML();
      // Center the active tab in the scrollable nav
      var tabs = this.querySelector('.mh-tabs');
      var active = tabs && tabs.querySelector('a.active');
      if (tabs && active) {
        active.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
      }
    };
    return CardiffMasthead;
  }());

  customElements.define('cardiff-masthead', CardiffMasthead);

}());
