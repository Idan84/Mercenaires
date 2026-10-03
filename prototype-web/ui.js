"use strict";

function statSummary(c) {
  return ["Force","Dextérité","Constitution","Intelligence"]
    .map(k => `${k.slice(0,3)} ${Math.round(c.stats[k])}`)
    .join(" · ");
}

function characterRow(c, hero=false) {
  const asc = c.ascendance ? `${c.ascendance} (${c.ascendanceLevelName || "N"+c.ascendanceLevel})` : "Aucune";
  return `<div class="${hero ? "hero-card":"character-row"}">
    <div class="character-cell"><small>${esc(c.role)}</small><button class="character-link" data-character-id="${c.id}">${esc(c.name)}</button></div>
    <div class="character-cell"><small>Peuple</small><strong>${esc(c.people)}</strong></div>
    <div class="character-cell"><small>Ascendance</small><strong>${esc(asc)}</strong></div>
    <div class="character-cell"><small>Réputation</small><strong>${Math.round(c.reputation)}</strong></div>
    <div class="character-cell"><small>Salaire demandé</small><strong>${round1(c.salary)} PO/j</strong></div>
    <div class="character-cell"><small>PV</small><strong>${c.pvMax}</strong></div>
    ${hero ? "" : `<div class="character-cell"><small>Stats</small><strong>${esc(statSummary(c))}</strong></div>`}
  </div>`;
}

function renderAudit() {
  const audit = game.audit;
  const activeMatrix = audit.matrixCoverage.filter(x => x.status === "active").length;
  const blockedMatrix = audit.matrixCoverage.filter(x => x.status === "blocked").length;
  const generatedSkills = audit.skillCoverage.filter(x => ["generated","derived"].includes(x.status)).length;
  const pendingSkills = audit.skillCoverage.filter(x => x.status === "pending").length;

  $("audit-status").textContent = audit.issues.length ? `${audit.issues.length} problème(s)` : "Référentiels cohérents";
  $("audit-status").classList.toggle("badge-ok", audit.issues.length === 0);
  $("audit-status").classList.toggle("badge-warn", audit.issues.length > 0);

  const metrics = [
    ["Peuples", audit.counts.peoples],
    ["Cultures", audit.counts.cultures],
    ["Compat. ascendances", audit.counts.ancestryCompatibilities],
    ["Compat. culture/origine", audit.counts.cultureOriginCompatibilities],
    ["Matrice active", `${activeMatrix}/${audit.counts.matrixRows}`],
    ["Compétences générées/dérivées", generatedSkills],
    ["Règles compétence en attente", pendingSkills]
  ];

  $("audit-metrics").innerHTML = metrics.map(([label,value]) => `
    <div class="audit-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>
  `).join("");

  const uniquePending = [...new Map(audit.pending.map(x => [x.target, x])).values()];
  $("audit-pending-title").textContent = `${uniquePending.length} règles encore à définir`;
  $("audit-pending").innerHTML = uniquePending.map(item => `
    <div class="pending-item"><strong>${esc(item.target)}</strong><span>${esc(item.reason)}</span></div>
  `).join("");
}

function renderGame() {
  $("setup-panel").classList.add("hidden");
  $("game-panel").classList.remove("hidden");
  $("company-title").textContent = `Compagnie de ${game.captain.name}`;
  $("captain-summary").innerHTML = characterRow(game.captain, true);
  $("initial-count").textContent = `${game.initialSquad.length} mercenaire${game.initialSquad.length>1?"s":""}`;
  $("initial-squad").innerHTML = game.initialSquad.map(c => characterRow(c)).join("");
  renderGenerated();
}

function renderGenerated() {
  $("generated-list").innerHTML = game.generated.length
    ? game.generated.map(c => characterRow(c)).join("")
    : `<p class="muted">Aucun candidat généré pour l’instant.</p>`;
}

function allCharacters() {
  return [game.captain, ...game.initialSquad, ...game.generated].filter(Boolean);
}

function fmt(n) {
  if (!Number.isFinite(n)) return "—";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function fmtDelta(n) {
  if (!Number.isFinite(n) || n === 0) return "—";
  return `${n > 0 ? "+" : ""}${fmt(n)}`;
}

function deltaForKind(trace, kind) {
  return (trace?.contributions || [])
    .filter(x => x.kind === kind)
    .reduce((sum,x) => sum + Number(x.delta || 0), 0);
}

function sourceTooltip(trace, kind) {
  return (trace?.contributions || [])
    .filter(x => x.kind === kind)
    .map(x => `${x.name}: ${x.intensity > 0 ? "+" : ""}${x.intensity} → ${x.dice} = ${fmtDelta(x.delta)}`)
    .join("\n");
}

function renderCharacteristicTrace(c) {
  const rows = [];
  for (const [name, value] of Object.entries(c.stats)) {
    rows.push({name,value,trace:c.generationTrace.characteristics[name]});
  }
  for (const [name, value] of Object.entries(c.resistances)) {
    rows.push({name,value,trace:c.generationTrace.resistances[name]});
  }

  return `<div class="trace-table-wrap"><table class="trace-table">
    <thead><tr>
      <th>Valeur</th><th>Brut</th><th>Peuple</th><th>Ascendance</th><th>Culture</th><th>Origine</th><th>Final</th>
    </tr></thead>
    <tbody>${rows.map(row => `<tr>
      <td><strong>${esc(row.name)}</strong><small>${esc(row.trace?.baseFormula || "")}</small></td>
      <td>${fmt(row.trace?.base)}</td>
      ${["people","ascendance","culture","origin"].map(kind => {
        const delta = deltaForKind(row.trace, kind);
        return `<td title="${esc(sourceTooltip(row.trace,kind))}" class="${delta > 0 ? "positive" : delta < 0 ? "negative" : ""}">${fmtDelta(delta)}</td>`;
      }).join("")}
      <td><strong>${fmt(row.value)}</strong></td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function skillLabel(group) {
  return ({
    martial:"Martial",
    animal:"Animal",
    magic:"Magie",
    craft:"Artisanat",
    camp:"Camp",
    technique:"Technique",
    social:"Social",
    physiology:"Physiologie"
  })[group] || group;
}

function renderSkillGroup(c, group, values) {
  const entries = Object.entries(values).sort((a,b) => {
    const av = Number.isFinite(a[1]) ? a[1] : -Infinity;
    const bv = Number.isFinite(b[1]) ? b[1] : -Infinity;
    return bv - av || a[0].localeCompare(b[0], "fr");
  });

  return `<details class="skill-group" ${["martial","magic"].includes(group) ? "open" : ""}>
    <summary><strong>${esc(skillLabel(group))}</strong><span>${entries.filter(([,v])=>Number.isFinite(v)).length} valeurs</span></summary>
    <div class="trace-table-wrap"><table class="trace-table skill-trace-table">
      <thead><tr><th>Compétence</th><th>Brut</th><th>Bonus génération</th><th>Modifs</th><th>Final</th></tr></thead>
      <tbody>${entries.map(([name,value]) => {
        const trace = c.generationTrace.skills[name];
        const modifier = trace ? (trace.contributions || []).reduce((s,x)=>s+Number(x.delta||0),0) : 0;
        const bonusSources = trace?.generationBonusSources || [];
        const bonus = trace?.generationBonus
          ? `<span class="mini-badge" title="${esc(bonusSources.map(x=>`${x.name} → ${x.target} (+${x.intensity})`).join("\n"))}">Oui</span>`
          : "—";
        return `<tr class="${Number.isFinite(value) ? "" : "pending-row"}">
          <td><strong>${esc(name)}</strong><small>${esc(trace?.rawFormula || (Number.isFinite(value) ? "" : "Règle non définie"))}</small></td>
          <td>${Number.isFinite(trace?.raw) ? fmt(trace.raw) : "À définir"}</td>
          <td>${bonus}</td>
          <td class="${modifier>0?"positive":modifier<0?"negative":""}">${fmtDelta(modifier)}</td>
          <td><strong>${Number.isFinite(value) ? fmt(value) : "—"}</strong></td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>
  </details>`;
}

function renderPending(c) {
  const pending = c.generationTrace.pending || [];
  if (!pending.length) return "";
  return `<div class="pending-box">
    <h3>Règles encore non définies</h3>
    <p class="muted">Le moteur n’invente pas de valeur : ces éléments restent explicitement en attente.</p>
    <div class="pending-list">${pending.map(x => `
      <div class="pending-item"><strong>${esc(x.target)}</strong><span>${esc(x.reason)}</span></div>
    `).join("")}</div>
  </div>`;
}

function showCharacter(c) {
  $("dialog-role").textContent = c.role;
  $("dialog-name").textContent = c.name;
  const asc = c.ascendance
    ? `${c.ascendance} — ${c.ascendanceLevelName || "niveau "+c.ascendanceLevel}`
    : "Aucune";
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

    <details class="debug-section" open>
      <summary><h3>Caractéristiques — trace de génération</h3><span>brut → identités → final</span></summary>
      ${renderCharacteristicTrace(c)}
    </details>

    <details class="debug-section" open>
      <summary><h3>Compétences — trace de génération</h3><span>tirage brut → matrice → final</span></summary>
      <div class="skill-groups">
        ${Object.entries(c.skills).map(([group,values]) => renderSkillGroup(c,group,values)).join("")}
      </div>
    </details>

    ${renderPending(c)}
  `;

  $("character-dialog").showModal();
}

function fillSelect(select, values, includeNone=false) {
  select.innerHTML = `${includeNone ? '<option value="">Aucune</option>' : ""}${values.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join("")}`;
}

function updateCultureSelect() {
  const people = $("captain-people").value;
  fillSelect($("captain-culture"), culturesForPeople(people));
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

function showFatal(error) {
  console.error(error);
  $("audit-status").textContent = "Erreur moteur";
  $("audit-status").classList.add("badge-warn");
  $("audit-metrics").innerHTML = `<div class="fatal-error">${esc(error.message || error)}</div>`;
}

async function init() {
  try {
    await initializeGenerator();
    renderAudit();

    fillSelect($("captain-people"), peopleNames());
    fillSelect($("captain-alignment"), alignmentNames());
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
  } catch (error) {
    showFatal(error);
  }
}

init();
