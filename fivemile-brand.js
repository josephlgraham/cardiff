/* FIVEMILE brand tokens.
   One source of truth for the publication name, domain, inbox, and towns.
   Loaded before cardiff-common.js on every page.

   Renaming the publication should be an edit to this file, not a find and
   replace across forty HTML files. Anything that renders the publication
   name reads it from here. */

window.BRAND = {
  /* Wordmark as it appears in the masthead. All caps is the mark itself,
     not a CSS transform, so it survives being copied into other contexts. */
  name: "FIVEMILE",

  /* Sentence case, for document titles, meta tags, and running copy. */
  full: "Fivemile",

  /* Body copy spells the creek as three words to match the historical
     marker, the Land Trust, and the birding trail. The wordmark is one
     word. That split is deliberate. See DECISIONS.md section 4. */
  creek: "Five Mile Creek",

  domain: "fivemile.now",
  email: "fivemilec@gmail.com",

  /* LOCKED ORDER. Graysville, Cardiff, Brookside. West to east.
     This is NOT the direction the creek flows, and that is intentional.
     Confirmed twice by Joe. See DECISIONS.md section 1.

     Creek order is the reverse and is used only for describing travel
     along the water. Never for listing the towns.

     Do not reorder this array. Do not sort it. Do not "correct" it to
     downstream order. Every town list on the site iterates this array so
     that there is exactly one place the order can be wrong. */
  towns: [
    { id: "graysville", name: "Graysville", color: "#3D2810" },
    { id: "cardiff",    name: "Cardiff",    color: "#8A6D3B" },
    { id: "brookside",  name: "Brookside",  color: "#C8102E" }
  ]
};

/* Derived, so the tagline can never drift out of the locked order. */
window.BRAND.tagline = window.BRAND.towns.map(function (t) {
  return t.name;
}).join(" · ");

/* Spoken form, for the masthead link's accessible name. The wordmark is
   split into per-letter spans for the intro, which a screen reader would
   otherwise spell out one letter at a time. */
window.BRAND.spokenTagline = window.BRAND.towns.map(function (t) {
  return t.name;
}).join(", ");
