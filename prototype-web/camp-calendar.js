"use strict";

// Un habillage narratif du jour de campagne, pas une seconde horloge de gameplay.
// Toutes les valeurs de calendrier et les citations viennent de data/reference/camp-calendar.json.
function campaignCalendarDate(day, reference) {
  if (!Number.isSafeInteger(day) || day < 1) throw new RangeError("Le jour de campagne doit être un entier positif.");
  const calendar = reference?.campCalendar || reference;
  const months = calendar?.months;
  const weekdays = calendar?.weekday_names;
  if (!Array.isArray(months) || months.length !== 12 || !Array.isArray(weekdays) || weekdays.length !== 7) {
    throw new Error("Calendrier du camp incomplet.");
  }
  const daysPerYear = calendar.days_per_year;
  if (!Number.isInteger(daysPerYear) || daysPerYear !== months.reduce((total, month) => total + month.days, 0)) {
    throw new Error("La somme des jours des mois doit correspondre à l'année.");
  }
  const yearOffset = Math.floor((day - 1) / daysPerYear);
  let remaining = (day - 1) % daysPerYear;
  const month = months.find(item => {
    if (remaining < item.days) return true;
    remaining -= item.days;
    return false;
  });
  const dayOfMonth = remaining + 1;
  const quotes = month.quotes || [];
  return {
    campaignDay: day,
    weekday: weekdays[(day - 1) % 7],
    dayOfMonth,
    month: month.name,
    year: Number(calendar.year_start) + yearOffset,
    era: calendar.era,
    quote: quotes.length ? quotes[(dayOfMonth - 1) % quotes.length] : "",
    dateLabel: `${weekdays[(day - 1) % 7]}, ${dayOfMonth} ${month.name}`
  };
}

// Petit calendrier de la barre du bas (Idan, 2026-10-21) : la date et le jour de campagne ; compact depuis le
// 2026-11-11 (« on optimise l'espace principalement sur le calendrier ») : le nom du jour, l'an, l'ère et la citation
// du jour s'affichent au survol.
function renderCampCalendar() {
  if (!game.campaign || !game.referenceData?.campCalendar) return;
  const date = campaignCalendarDate(game.campaign.day, game.referenceData);
  const label = `${date.dayOfMonth} ${date.month}`;
  const node = document.getElementById("hud-date");
  if (node.textContent !== label) {
    node.textContent = label;
    node.classList.remove("is-new");
    void node.offsetWidth;
    node.classList.add("is-new");
  }
  document.getElementById("hud-day").textContent = `Jour ${date.campaignDay}`;
  document.getElementById("hud-calendar").title = `${date.weekday} ${date.dayOfMonth} ${date.month}, an ${date.year} — ${date.era}\n« ${date.quote} »`;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { campaignCalendarDate };
}
