(function () {
  "use strict";

  const SUPABASE_URL = "https://eswwnlpjtfaiotqyajen.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmxlc2UiLCJyZWYiOiJlc3d3bmxwanRmYWlvdHF5YWplbiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc0ODAwNzQxLCJleHAiOjIwOTAzNzY3NDEsfQ.uKE4hksmWTyKR4pKYhvAQVkuSj7DoSJrkvYyc-JyXvc";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  const REACTION_EMOJIS = [
    { icon: "💚", label: "love this" },
    { icon: "🌿", label: "plants" },
    { icon: "🐦", label: "birds" },
    { icon: "🚶", label: "out walking" },
    { icon: "💧", label: "creek" }
  ];

  const POLLS = {
    "spring-2026": {
      question: "What matters most to you about Cardiff's future?",
      options: [
        { key: "incorporated", label: "Keeping the town incorporated" },
        { key: "creek", label: "Protecting Five Mile Creek" },
        { key: "history", label: "Preserving the history" },
        { key: "neighbors", label: "Building neighbor connections" }
      ]
    }
  };

  const AREAS = [
    "Creek bottom",
    "Across the creek",
    "On top of the hill",
    "Main road",
    "Out of town"
  ];

  const INTERESTS = [
    "Civic & local government",
    "Creek & wildlife",
    "History & cemetery",
    "Neighborhood & community events",
    "Volunteering & hands-on help"
  ];

  let supabaseClientPromise = null;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // Ignore storage misses.
    }
  }

  function injectStyles() {
    if (document.getElementById("cardiff-community-styles")) return;
    const style = document.createElement("style");
    style.id = "cardiff-community-styles";
    style.textContent = [
      '.cardiff-community-widget{background:var(--card,#faf6ee);border:1px solid var(--border,rgba(80,44,8,0.13));border-radius:14px;box-shadow:var(--shadow,0 2px 10px rgba(80,44,8,0.09)),inset 0 0 0 1px rgba(200,16,46,0.09);padding:1rem 1rem .95rem;position:relative;overflow:hidden;}',
      '.cardiff-community-widget + .cardiff-community-widget{margin-top:1rem;}',
      '.cardiff-community-kicker{font-family:var(--mono,"DM Mono",monospace);font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;color:var(--red,#C8102E);display:flex;align-items:center;gap:.35rem;margin-bottom:.45rem;}',
      '.cardiff-community-kicker::before{content:"";width:8px;height:2px;background:var(--red,#C8102E);display:inline-block;border-radius:999px;}',
      '.cardiff-community-title{font-size:1rem;font-weight:800;color:var(--ink,#1c1208);margin-bottom:.35rem;}',
      '.cardiff-community-copy{font-size:.82rem;line-height:1.65;color:var(--ink2,#4a3418);}',
      '.cardiff-community-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.85rem;}',
      '.cardiff-emoji-btn,.cardiff-poll-btn,.cardiff-community-submit{appearance:none;border:1px solid var(--border2,rgba(80,44,8,0.24));background:var(--paper,#f2e8d5);color:var(--ink,#1c1208);border-radius:999px;padding:.55rem .75rem;font:600 .78rem/1.2 var(--sans,"Plus Jakarta Sans",sans-serif);cursor:pointer;transition:border-color .2s ease,transform .2s ease,color .2s ease;}',
      '.cardiff-community-submit{border-radius:8px;background:var(--red,#C8102E);color:#fff;border-color:var(--red,#C8102E);padding:.72rem .9rem;font-weight:700;}',
      '.cardiff-emoji-btn:hover,.cardiff-poll-btn:hover,.cardiff-community-submit:hover{border-color:var(--amber,#b47800);transform:translateY(-1px);}',
      '.cardiff-community-submit:hover{background:var(--red-mid,#9a0c22);border-color:var(--red-mid,#9a0c22);color:#fff;}',
      '.cardiff-emoji-btn.is-done,.cardiff-poll-btn.is-done{border-color:rgba(200,16,46,0.32);color:var(--red,#C8102E);background:rgba(200,16,46,0.06);}',
      '.cardiff-community-meta{margin-top:.75rem;font-family:var(--mono,"DM Mono",monospace);font-size:.62rem;letter-spacing:.06em;color:var(--ink3,#7a5838);}',
      '.cardiff-count{font-family:var(--mono,"DM Mono",monospace);font-size:.72rem;color:var(--ink3,#7a5838);margin-left:.35rem;}',
      '.cardiff-poll-results{display:grid;gap:.5rem;margin-top:.9rem;}',
      '.cardiff-poll-row{display:grid;gap:.22rem;}',
      '.cardiff-poll-top{display:flex;justify-content:space-between;gap:.75rem;font-size:.78rem;color:var(--ink,#1c1208);}',
      '.cardiff-poll-bar{height:8px;border-radius:999px;background:rgba(80,44,8,0.08);overflow:hidden;}',
      '.cardiff-poll-bar span{display:block;height:100%;background:linear-gradient(90deg,var(--red,#C8102E),#e17f8f);}',
      '.cardiff-signup-form{display:grid;gap:.75rem;margin-top:.85rem;}',
      '.cardiff-signup-fieldset{border:none;padding:0;margin:0;display:grid;gap:.45rem;}',
      '.cardiff-signup-label{font-family:var(--mono,"DM Mono",monospace);font-size:.6rem;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3,#7a5838);margin-bottom:.1rem;}',
      '.cardiff-signup-options{display:grid;gap:.45rem;}',
      '.cardiff-signup-option{display:flex;align-items:flex-start;gap:.5rem;font-size:.8rem;line-height:1.5;color:var(--ink2,#4a3418);}',
      '.cardiff-signup-text{width:100%;min-height:90px;border-radius:8px;border:1px solid var(--border2,rgba(80,44,8,0.24));background:#fff;padding:.75rem .85rem;font:inherit;color:var(--ink,#1c1208);resize:vertical;}',
      '.cardiff-signup-text:focus{outline:none;border-color:rgba(200,16,46,.45);box-shadow:0 0 0 3px rgba(200,16,46,.08);}',
      '.cardiff-signup-breakdown{display:grid;gap:.42rem;margin-top:.75rem;}',
      '.cardiff-signup-chip{display:flex;justify-content:space-between;gap:.75rem;padding:.5rem .65rem;background:rgba(255,255,255,.52);border:1px solid var(--border,rgba(80,44,8,0.13));border-radius:999px;font-size:.76rem;color:var(--ink2,#4a3418);}',
      '.cardiff-community-status{font-size:.76rem;line-height:1.55;color:var(--ink3,#7a5838);margin-top:.6rem;}'
    ].join("");
    document.head.appendChild(style);
  }

  function loadSupabaseNamespace() {
    if (window.supabase && typeof window.supabase.createClient === "function") {
      return Promise.resolve(window.supabase);
    }
    if (supabaseClientPromise) return supabaseClientPromise;
    supabaseClientPromise = new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = SUPABASE_CDN;
      script.async = true;
      script.onload = function () {
        if (window.supabase && typeof window.supabase.createClient === "function") {
          resolve(window.supabase);
        } else {
          reject(new Error("Supabase client missing"));
        }
      };
      script.onerror = function () {
        reject(new Error("Supabase client failed to load"));
      };
      document.head.appendChild(script);
    });
    return supabaseClientPromise;
  }

  async function getClient() {
    const supabaseNs = await loadSupabaseNamespace();
    return supabaseNs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-cardiff-widget": "community" } }
    });
  }

  function renderCard(target, kicker, title, body) {
    target.innerHTML =
      '<div class="cardiff-community-widget">' +
        '<div class="cardiff-community-kicker">' + escapeHtml(kicker) + "</div>" +
        '<div class="cardiff-community-title">' + escapeHtml(title) + "</div>" +
        body +
      "</div>";
  }

  async function initReactions(target, client) {
    const page = target.getAttribute("data-page") || "cardiff";
    renderCard(
      target,
      "Community pulse",
      "Leave a little mark",
      '<div class="cardiff-community-copy">Tap the one that fits if this page taught you something, sent you outside, or made you care a little more about Cardiff.</div>' +
      '<div class="cardiff-community-actions" data-reaction-actions></div>' +
      '<div class="cardiff-community-meta">One tap per icon per browser. The little count board updates live when the desk is awake.</div>'
    );

    const actions = target.querySelector("[data-reaction-actions]");

    async function refresh() {
      const counts = {};
      REACTION_EMOJIS.forEach((item) => { counts[item.icon] = 0; });
      if (client) {
        const result = await client.from("reactions").select("emoji").eq("page", page);
        if (!result.error && Array.isArray(result.data)) {
          result.data.forEach((row) => {
            counts[row.emoji] = Number(counts[row.emoji] || 0) + 1;
          });
        }
      }

      actions.innerHTML = REACTION_EMOJIS.map((item) => {
        const key = "cardiff-reaction-" + page + "-" + item.icon;
        const done = storageGet(key) === "1";
        return '<button class="cardiff-emoji-btn' + (done ? " is-done" : "") + '" type="button" data-emoji="' + escapeHtml(item.icon) + '"' + (client ? "" : " disabled") + '>' + escapeHtml(item.icon) + '<span class="cardiff-count">' + String(counts[item.icon] || 0) + "</span></button>";
      }).join("");
    }

    actions.addEventListener("click", async function (event) {
      const button = event.target.closest("[data-emoji]");
      if (!button || !client) return;
      const emoji = button.getAttribute("data-emoji");
      const key = "cardiff-reaction-" + page + "-" + emoji;
      if (storageGet(key) === "1") return;
      button.disabled = true;
      const result = await client.from("reactions").insert({ page: page, emoji: emoji });
      if (!result.error) {
        storageSet(key, "1");
        await refresh();
      }
      button.disabled = false;
    });

    await refresh();
    if (client) {
      client
        .channel("cardiff-reactions-" + page)
        .on("postgres_changes", { event: "*", schema: "public", table: "reactions", filter: "page=eq." + page }, refresh)
        .subscribe();
    }
  }

  async function initPoll(target, client) {
    const pollId = target.getAttribute("data-poll-id") || "spring-2026";
    const poll = POLLS[pollId] || POLLS["spring-2026"];
    if (!poll) return;

    renderCard(
      target,
      "Town question",
      "One question for the room",
      '<div class="cardiff-community-copy">' + escapeHtml(poll.question) + "</div>" +
      '<div class="cardiff-community-actions" data-poll-actions></div>' +
      '<div class="cardiff-poll-results" data-poll-results></div>' +
      '<div class="cardiff-community-status" data-poll-status></div>'
    );

    const actions = target.querySelector("[data-poll-actions]");
    const results = target.querySelector("[data-poll-results]");
    const status = target.querySelector("[data-poll-status]");
    const votedKey = "cardiff-poll-" + pollId;

    async function loadVotes() {
      const totals = {};
      poll.options.forEach((option) => { totals[option.key] = 0; });
      if (client) {
        const result = await client.from("poll_votes").select("option_key").eq("poll_id", pollId);
        if (!result.error && Array.isArray(result.data)) {
          result.data.forEach((row) => {
            totals[row.option_key] = Number(totals[row.option_key] || 0) + 1;
          });
        }
      }
      return totals;
    }

    async function renderPoll() {
      const voted = storageGet(votedKey);
      const totals = await loadVotes();
      const totalVotes = Object.values(totals).reduce((sum, value) => sum + Number(value || 0), 0);

      actions.innerHTML = voted
        ? ""
        : poll.options.map((option) => (
            '<button class="cardiff-poll-btn" type="button" data-option="' + escapeHtml(option.key) + '"' + (client ? "" : " disabled") + ">" + escapeHtml(option.label) + "</button>"
          )).join("");

      results.innerHTML = poll.options.map((option) => {
        const votes = Number(totals[option.key] || 0);
        const pct = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
        return (
          '<div class="cardiff-poll-row">' +
            '<div class="cardiff-poll-top"><span>' + escapeHtml(option.label) + '</span><span>' + pct + '%</span></div>' +
            '<div class="cardiff-poll-bar"><span style="width:' + pct + '%;"></span></div>' +
          "</div>"
        );
      }).join("");

      status.textContent = voted
        ? "Thanks. This browser has already weighed in on this question."
        : (client ? "One vote per browser. The room updates as soon as you choose." : "The poll desk will wake up when the Supabase connection is available.");
    }

    actions.addEventListener("click", async function (event) {
      const button = event.target.closest("[data-option]");
      if (!button || !client || storageGet(votedKey)) return;
      const optionKey = button.getAttribute("data-option");
      button.disabled = true;
      const result = await client.from("poll_votes").insert({ poll_id: pollId, option_key: optionKey });
      if (!result.error) {
        storageSet(votedKey, optionKey);
        await renderPoll();
      }
      button.disabled = false;
    });

    await renderPoll();
    if (client) {
      client
        .channel("cardiff-poll-" + pollId)
        .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes", filter: "poll_id=eq." + pollId }, renderPoll)
        .subscribe();
    }
  }

  async function loadSignupSummary(client) {
    if (!client) return { total: 0, breakdown: [] };
    const summaryResult = await client.rpc("cardiff_signup_summary");
    if (!summaryResult.error && summaryResult.data) {
      const payload = summaryResult.data;
      return {
        total: Number(payload.total || 0),
        breakdown: Array.isArray(payload.breakdown) ? payload.breakdown : []
      };
    }

    const countResult = await client.from("signups").select("*", { count: "exact", head: true });
    return {
      total: countResult.count || 0,
      breakdown: []
    };
  }

  async function initSignup(target, client) {
    renderCard(
      target,
      "Neighbor roll call",
      "Raise your hand, stay unnamed",
      '<div class="cardiff-community-copy" data-signup-summary>Checking how many neighbors have quietly raised a hand so far.</div>' +
      '<div class="cardiff-signup-breakdown" data-signup-breakdown></div>' +
      '<form class="cardiff-signup-form" data-signup-form>' +
        '<fieldset class="cardiff-signup-fieldset"><div class="cardiff-signup-label">Area</div><div class="cardiff-signup-options">' +
          AREAS.map((area, index) => '<label class="cardiff-signup-option"><input type="radio" name="cardiff-signup-area" value="' + escapeHtml(area) + '"' + (index === 0 ? " checked" : "") + '> <span>' + escapeHtml(area) + "</span></label>").join("") +
        "</div></fieldset>" +
        '<fieldset class="cardiff-signup-fieldset"><div class="cardiff-signup-label">Interests</div><div class="cardiff-signup-options">' +
          INTERESTS.map((interest) => '<label class="cardiff-signup-option"><input type="checkbox" name="cardiff-signup-interest" value="' + escapeHtml(interest) + '"> <span>' + escapeHtml(interest) + "</span></label>").join("") +
        "</div></fieldset>" +
        '<div class="cardiff-signup-label">Anything else</div><textarea class="cardiff-signup-text" maxlength="280" placeholder="Optional note if there is something the town should know."></textarea>' +
        '<button class="cardiff-community-submit" type="submit">Count me in</button>' +
      "</form>" +
      '<div class="cardiff-community-status" data-signup-status>Anonymous only. No name, no email, just a quiet hand on the count.</div>'
    );

    const summary = target.querySelector("[data-signup-summary]");
    const breakdown = target.querySelector("[data-signup-breakdown]");
    const form = target.querySelector("[data-signup-form]");
    const status = target.querySelector("[data-signup-status]");
    const signupKey = "cardiff-signup-submitted";

    async function renderSummary() {
      const data = await loadSignupSummary(client);
      summary.textContent = data.total
        ? data.total + " neighbors have quietly raised a hand so far."
        : "Be the first quiet hand on the count when this widget goes live.";
      breakdown.innerHTML = (data.breakdown || []).slice(0, 5).map((item) => (
        '<div class="cardiff-signup-chip"><span>' + escapeHtml(item.label || item.interest || "Interest") + '</span><strong>' + String(item.count || 0) + "</strong></div>"
      )).join("");
    }

    if (storageGet(signupKey) === "1") {
      form.innerHTML = '<div class="cardiff-community-copy">This browser has already added a quiet hand to the count. Thank you.</div>';
    } else {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!client) {
          status.textContent = "The signup desk is waiting on the Supabase connection.";
          return;
        }
        const areaInput = form.querySelector('input[name="cardiff-signup-area"]:checked');
        const interestInputs = [].slice.call(form.querySelectorAll('input[name="cardiff-signup-interest"]:checked'));
        const noteInput = form.querySelector("textarea");
        const payload = {
          area: areaInput ? areaInput.value : "",
          interests: interestInputs.map((input) => input.value),
          note: (noteInput.value || "").trim().slice(0, 280)
        };
        const result = await client.from("signups").insert(payload);
        if (result.error) {
          status.textContent = "The signup desk hit a snag. Give it another try in a little while.";
          return;
        }
        storageSet(signupKey, "1");
        status.textContent = "Quiet hand recorded. Thanks for adding yourself to the count.";
        form.innerHTML = '<div class="cardiff-community-copy">Quiet hand recorded. Thanks for standing up for Cardiff.</div>';
        await renderSummary();
      });
    }

    await renderSummary();
    if (client) {
      client
        .channel("cardiff-signups")
        .on("postgres_changes", { event: "*", schema: "public", table: "signups" }, renderSummary)
        .subscribe();
    }
  }

  async function bootCommunity() {
    injectStyles();
    const placeholders = [].slice.call(document.querySelectorAll("[data-cardiff-widget]"));
    if (!placeholders.length) return;

    let client = null;
    try {
      client = await getClient();
    } catch (error) {
      client = null;
    }

    for (const target of placeholders) {
      const type = target.getAttribute("data-cardiff-widget");
      if (type === "reactions") {
        await initReactions(target, client);
      } else if (type === "poll") {
        await initPoll(target, client);
      } else if (type === "signup") {
        await initSignup(target, client);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootCommunity);
  } else {
    bootCommunity();
  }
})();
