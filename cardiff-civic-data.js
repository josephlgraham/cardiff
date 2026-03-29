(function () {
  "use strict";

  const SNAPSHOT_URL = "cardiff-community-snapshot.json";

  function finiteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatWhole(value) {
    const number = finiteNumber(value);
    return number === null ? "—" : Math.round(number).toLocaleString("en-US");
  }

  function formatOneDecimal(value) {
    const number = finiteNumber(value);
    return number === null ? "—" : number.toFixed(1);
  }

  function formatMoney(value) {
    const number = finiteNumber(value);
    return number === null ? "—" : "$" + Math.round(number).toLocaleString("en-US");
  }

  function formatPercent(value) {
    const number = finiteNumber(value);
    return number === null ? "—" : Math.round(number) + "%";
  }

  function statCard(label, value, copy) {
    return (
      '<div class="civic-snapshot-stat">' +
        '<div class="civic-snapshot-label">' + label + "</div>" +
        '<div class="civic-snapshot-value">' + value + "</div>" +
        '<div class="civic-snapshot-copy">' + copy + "</div>" +
      "</div>"
    );
  }

  function renderSnapshot(data) {
    const card = document.getElementById("civicSnapshotCard");
    const grid = document.getElementById("civicSnapshotGrid");
    const note = document.getElementById("civicSnapshotNote");
    const tag = document.getElementById("civicSnapshotTag");
    const snapshot = data && data.snapshot ? data.snapshot : null;
    const population = snapshot ? finiteNumber(snapshot.population) : null;
    if (!card || !grid || !note || !tag || population === null) {
      if (card) card.style.display = "none";
      return;
    }

    const ownerShare = formatPercent(snapshot.ownerOccupiedSharePct);
    const renterShare = formatPercent(snapshot.renterOccupiedSharePct);
    const medianIncome = finiteNumber(snapshot.medianHouseholdIncome);
    const perCapitaIncome = finiteNumber(snapshot.perCapitaIncome);
    tag.textContent = "🏛️ ACS 2023 5-year";
    grid.innerHTML = [
      statCard("👥 Population", formatWhole(snapshot.population), "A rough count of how many people this little town is carrying in the current ACS snapshot."),
      statCard("🕰️ Median age", formatOneDecimal(snapshot.medianAge), "A useful clue about the life stage mix shaping schools, services, and civic rhythm."),
      statCard("💵 Median income", formatMoney(snapshot.medianHouseholdIncome), "Helpful for scale only. This is a census estimate, not a live payroll report."),
      statCard("🏠 Housing mix", ownerShare === "—" ? "—" : ownerShare + " owner", renterShare === "—" ? "Occupied-home share is still settling out of the census file." : renterShare + " renter among occupied homes.")
    ].join("");
    if (medianIncome === null) {
      const incomeCard = grid.children[2];
      if (incomeCard) {
        const label = incomeCard.querySelector(".civic-snapshot-label");
        const value = incomeCard.querySelector(".civic-snapshot-value");
        const copy = incomeCard.querySelector(".civic-snapshot-copy");
        if (label) label.textContent = "💵 Income read";
        if (value) value.textContent = perCapitaIncome === null ? "—" : "$" + Math.round(perCapitaIncome).toLocaleString("en-US");
        if (copy) copy.textContent = "The official ACS 2023 place-level median-household-income field is suppressed for Cardiff, so this card falls back to per-capita income to keep the label honest.";
      }
    }
    note.textContent = ((data.summary || "").trim() ? data.summary.trim() + " " : "") + "These numbers lag real time, but they still help us talk about Cardiff as it is: small in scale, real in responsibility, and worth understanding clearly.";
    card.style.display = "";
  }

  async function loadSnapshot() {
    const card = document.getElementById("civicSnapshotCard");
    if (!card) return;
    try {
      const response = await fetch(SNAPSHOT_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("snapshot");
      const data = await response.json();
      renderSnapshot(data);
    } catch (error) {
      card.style.display = "none";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadSnapshot);
  } else {
    loadSnapshot();
  }
})();
