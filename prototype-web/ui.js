function statSummary(c) {
  return ["Force","Dextérité","Constitution","Intelligence"].map(k => `${k.slice(0,3)} ${Math.round(c.stats[k])}`).join(" · ");
}

function characterRow(c, hero=false) {
  return `<div class="${hero ? 'hero-card':'character-row'}">
    <div class="character-cell"><small>${esc(c.role)}</small><button class="character-link" data-character-id="${c.id}">${esc(c.name)}</button></div>
    <div class="character-cell"><small>Peuple</small><strong>${esc(c.people)}</strong></div>
    <div class="character-cell"><small>Réputation</small><strong>${Math.round(c.reputation)}</strong></div>
    <div class="character-cell"><small>Salaire demandé</small><strong>${round1(c.salary)} PO/j</strong></div>
    <div class="character-cell"><small>PV</small><strong>${c.pvMax}</strong></div>
    ${hero ? '' : `<div class="character-cell"><small>Stats</small><strong>${esc(statSummary(c))}</strong></div>`}
  </div>`;
}

function renderGame() {
  $("setup-panel").classList.add("hidden");
  $("game-panel").classList.remove("hidden");
  $("company-title").textContent = `Compagnie de ${game.captain.name}`;
  $("captain-summary").innerHTML = characterRow(game.captain, true);
  $("initial-count").textContent = `${game.initialSquad.length} mercenaire${game.initialSquad.length>1?'s':''}`;
  $("initial-squad").innerHTML = game.initialSquad.map(c => characterRow(c)).join("");
  renderGenerated();
}

function renderGenerated() {
  $("generated-list").innerHTML = game.generated.length
    ? game.generated.map(c => characterRow(c)).join("")
    : `<p class="muted">Aucun candidat généré pour l’instant.</p>`;
}

function allCharacters() { return [game.captain, ...game.initialSquad, ...game.generated].filter(Boolean); }

function renderKeyValueTable(obj, sort=true) {
  let entries = Object.entries(obj);
  if (sort) entries = entries.sort((a,b)=>b[1]-a[1]);
  return `<table class="skill-table">${entries.map(([k,v])=>`<tr><td>${esc(k)}</td><td>${Math.round(v)}</td></tr>`).join('')}</table>`;
}

function showCharacter(c) {
  $("dialog-role").textContent = c.role;
  $("dialog-name").textContent = c.name;
  const asc = c.ascendance ? `${c.ascendance} — niveau ${c.ascendanceLevel}` : "Aucune";
  const rb = c.reputationBreakdown;
  $("dialog-content").innerHTML = `
    <div class="identity-grid">
      <div class="metric"><small>Peuple</small><strong>${esc(c.people)}</strong></div>
      <div class="metric"><small>Culture</small><strong>${esc(c.culture)}</strong></div>
      <div class="metric"><small>Origine</small><strong>${esc(c.origin)}</strong></div>
      <div class="metric"><small>Ascendance</small><strong>${esc(asc)}</strong></div>
      <div class="metric"><small>Alignement</small><strong>${esc(c.alignment)}</strong></div>
      <div class="metric"><small>Réputation</small><strong>${Math.round(c.reputation)}</strong></div>
      <div class="metric"><small>Prétentions</small><strong>${c.salaryPretension}</strong></div>
      <div class="metric"><small>Salaire demandé</small><strong>${round1(c.salary)} PO/j</strong></div>
    </div>
    <div class="metric-grid">
      <div class="metric"><small>PV max</small><strong>${c.pvMax}</strong></div>
      <div class="metric"><small>Mana</small><strong>${c.mana}</strong></div>
      <div class="metric"><small>Moyenne pool réputation</small><strong>${round1(rb.mean)}</strong></div>
      <div class="metric"><small>Max / Min pool</small><strong>${Math.round(rb.max)} / ${Math.round(rb.min)}</strong></div>
    </div>
    <div class="section-block"><h3>Caractéristiques</h3><div class="stat-grid">${Object.entries(c.stats).map(([k,v])=>`<div class="stat-line"><span>${esc(k)}</span><strong>${Math.round(v)}</strong></div>`).join('')}</div></div>
    <div class="section-block"><h3>Résistances</h3><div class="stat-grid">${Object.entries(c.resistances).map(([k,v])=>`<div class="stat-line"><span>${esc(k)}</span><strong>${Math.round(v)}</strong></div>`).join('')}</div></div>
    <div class="section-block"><h3>Compétences</h3><div class="skill-columns">
      <div><h4>Martial</h4>${renderKeyValueTable(c.skills.martial)}</div>
      <div><h4>Magie</h4>${renderKeyValueTable(c.skills.magic)}</div>
      <div><h4>Animal</h4>${renderKeyValueTable(c.skills.animal)}</div>
      <div><h4>Artisanat</h4>${renderKeyValueTable(c.skills.craft)}</div>
      <div><h4>Camp</h4>${renderKeyValueTable(c.skills.camp)}</div>
      <div><h4>Social / Physiologie</h4>${renderKeyValueTable({...c.skills.social,...c.skills.physiology})}</div>
    </div></div>`;
  $("character-dialog").showModal();
}

function fillSelect(select, values, includeNone=false) {
  select.innerHTML = `${includeNone?'<option value="">Aucune</option>':''}${values.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}`;
}

function updateCultureSelect() {
  const people = $("captain-people").value;
  fillSelect($("captain-culture"), CULTURES[people]);
  updateOriginSelect();
  fillSelect($("captain-ascendance"), compatibleAscendances(people), true);
}
function updateOriginSelect() {
  fillSelect($("captain-origin"), originsForCulture($("captain-culture").value));
}

function openSetup() {
  $("setup-panel").classList.remove("hidden");
  $("game-panel").classList.add("hidden");
}

function init() {
  fillSelect($("captain-people"), Object.keys(PEOPLE_PROBABILITIES));
  fillSelect($("captain-alignment"), ALIGNMENTS);
  updateCultureSelect();

  $("new-game-btn").addEventListener("click", openSetup);
  $("cancel-setup-btn").addEventListener("click", () => $("setup-panel").classList.add("hidden"));
  $("captain-people").addEventListener("change", updateCultureSelect);
  $("captain-culture").addEventListener("change", updateOriginSelect);

  $("create-game-btn").addEventListener("click", () => {
    game.idCounter = 1;
    game.captain = createCaptainFromForm();
    game.initialSquad = createInitialSquad(game.captain);
    game.generated = [];
    renderGame();
  });

  $("generate-merc-btn").addEventListener("click", () => {
    const c = createCharacter({captain: game.captain, role: "Candidat"});
    game.generated.unshift(c);
    renderGenerated();
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-character-id]");
    if (!btn) return;
    const c = allCharacters().find(x => x.id === Number(btn.dataset.characterId));
    if (c) showCharacter(c);
  });

  $("close-dialog").addEventListener("click", () => $("character-dialog").close());
  openSetup();
}

init();
