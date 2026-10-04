"use strict";

function statSummary(c) {
  return ["Force","Dextérité","Constitution","Intelligence"]
    .map(k => `${k.slice(0,3)} ${Math.round(c.stats[k])}`)
    .join(" · ");
}

function characterRow(c, hero=false) {
  const asc = c.ascendance ? `${c.ascendance} (${c.ascendanceLevelName || "N"+c.ascendanceLevel})` : "Aucune";
  return `<div class="${hero ? "hero-card":"character-row"}">
    <div class="character-cell character-identity-cell">
      ${renderAvatar(c,{variant:"compact",kind:"portrait"})}
      <div><small>${esc(c.role)}</small><button class="character-link" data-character-id="${c.id}">${esc(c.name)}</button>${c.recovery ? `<span class="recovery-badge ${c.recovery.kind}">${esc(recoveryLabel(c))}</span>` : ""}</div>
    </div>
    <div class="character-cell"><small>Peuple</small><strong>${renderPicto("people",c.people)}${esc(c.people)}</strong></div>
    <div class="character-cell"><small>Ascendance</small><strong>${renderPicto("ascendance",c.ascendance)}${esc(asc)}</strong></div>
    <div class="character-cell"><small>Réputation</small><strong>${Math.round(c.reputation)}</strong></div>
    <div class="character-cell"><small>Salaire demandé</small><strong>${fmt(c.salary)} PO/j</strong></div>
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
  const catalogSkills = audit.skillCoverage.filter(x => x.status === "catalog").length;
  const binaryPending = audit.binaryPending?.length || 0;
  const binaryDisabled = audit.binaryDisabled?.length || 0;
  const cosmeticDeferred = audit.cosmetics?.length || 0;

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
    ["Règles gameplay en attente", pendingSkills],
    ["Aptitudes binaires à paramétrer", binaryPending],
    ["Aptitudes désactivées V1", binaryDisabled],
    ["Aptitudes hors pipeline", catalogSkills],
    ["Cosmétiques différés", cosmeticDeferred]
  ];

  $("audit-metrics").innerHTML = metrics.map(([label,value]) => `
    <div class="audit-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>
  `).join("");

  const uniquePending = [...new Map(audit.pending.map(x => [x.target, x])).values()];
  const cosmetics = audit.cosmetics || [];
  const binaryPendingItems = audit.binaryPending || [];
  $("audit-pending-title").textContent = `${uniquePending.length} règles gameplay à définir · ${binaryPendingItems.length} aptitudes binaires à paramétrer · ${cosmetics.length} champs cosmétiques différés`;
  $("audit-pending").innerHTML = [
    ...uniquePending.map(item => `
      <div class="pending-item"><strong>${esc(item.target)}</strong><span>${esc(item.reason)}</span></div>
    `),
    ...binaryPendingItems.map(item => `
      <div class="pending-item binary-item"><strong>${esc(item.target)}</strong><span>${esc(item.reason)}</span></div>
    `),
    ...cosmetics.map(item => `
      <div class="pending-item cosmetic-item"><strong>${esc(item.target)}</strong><span>${esc(item.reason)}</span></div>
    `)
  ].join("");
}

function renderGame() {
  $("setup-panel").classList.add("hidden");
  $("game-panel").classList.remove("hidden");
  $("company-title").textContent = `Compagnie de ${game.captain.name}`;
  $("captain-summary").innerHTML = characterRow(game.captain, true);
  const squad = teamCharacters().filter(c => c !== game.captain);
  $("initial-count").textContent = `${squad.length} mercenaire${squad.length>1?"s":""}`;
  $("initial-squad").innerHTML = squad.map(c => characterRow(c)).join("");
  renderGenerated();
  renderTavern();
}

function renderGenerated() {
  $("generated-list").innerHTML = game.generated.length
    ? game.generated.map(c => characterRow(c)).join("")
    : `<p class="muted">Aucun candidat généré pour l’instant.</p>`;
}

function allCharacters() {
  return [...teamCharacters(), ...game.generated].filter(Boolean);
}

// La compagnie : capitaine, escouade initiale et recrues de la Taverne (game.campaign).
function teamCharacters() {
  if (game.campaign) return campaignRoster();
  return [game.captain, ...game.initialSquad].filter(Boolean);
}

function median(values) {
  const sorted = [...values].sort((a,b)=>a-b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
}

function comparisonData(currentValue, accessor) {
  if (!Number.isFinite(currentValue)) return null;
  const team = teamCharacters()
    .map(member => ({member, value: accessor(member)}))
    .filter(x => Number.isFinite(x.value));
  if (!team.length) return null;

  const values = team.map(x=>x.value);
  const minItem = team.reduce((a,b)=>b.value<a.value?b:a);
  const maxItem = team.reduce((a,b)=>b.value>a.value?b:a);
  const min = minItem.value;
  const max = maxItem.value;
  const avg = values.reduce((a,b)=>a+b,0)/values.length;
  const med = median(values);
  const scaleMin = Math.min(min,currentValue);
  const scaleMax = Math.max(max,currentValue);
  const pos = value => scaleMax === scaleMin ? 50 : ((value-scaleMin)/(scaleMax-scaleMin))*100;

  return {
    min,max,avg,median:med,current:currentValue,
    minName:minItem.member.name,
    maxName:maxItem.member.name,
    positions:{
      min:pos(min),
      max:pos(max),
      avg:pos(avg),
      median:pos(med),
      current:pos(currentValue)
    }
  };
}

function renderComparison(currentValue, accessor) {
  const c = comparisonData(currentValue, accessor);
  if (!c) return "";
  const p = c.positions;
  const points = [
    {key:"min", label:"Min équipe", value:c.min, name:c.minName, position:p.min, tieOrder:0},
    {key:"median", label:"Médiane équipe", value:c.median, position:p.median, tieOrder:1},
    {key:"avg", label:"Moyenne équipe", value:c.avg, position:p.avg, tieOrder:2},
    {key:"current", label:"Mercenaire", value:c.current, position:p.current, tieOrder:3},
    {key:"max", label:"Max équipe", value:c.max, name:c.maxName, position:p.max, tieOrder:4}
  ].sort((a,b) => a.value - b.value || a.tieOrder - b.tieOrder);

  return `<div class="team-compare">
    <div class="compare-track" aria-label="Comparaison avec l'équipe">
      <span class="compare-line"></span>
      ${points.map(point => `<i class="compare-dot ${point.key}" style="left:${point.position}%" title="${esc(point.label)} : ${fmt(point.value)}"></i>`).join("")}
    </div>
    <div class="compare-legend">
      ${points.map(point => `<span class="${point.key === "current" ? "legend-current" : ""}">
        <small>${esc(point.label)}</small>
        <b>${fmt(point.value)}</b>
        ${point.name ? `<em>${esc(point.name)}</em>` : ""}
      </span>`).join("")}
    </div>
  </div>`;
}

function skillMeta(name) {
  return game.referenceData?.skills?.rows?.find(r => r.nom === name) || null;
}

function fmt(n) {
  if (!Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

function fmtDecimal(n, digits = 1) {
  if (!Number.isFinite(n)) return "—";
  const factor = 10 ** digits;
  const rounded = Math.round(n * factor) / factor;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits);
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

// La trace de génération n'est pas sauvegardée : après un chargement, seules les valeurs finales s'affichent.
function traceNotice(c) {
  return c.generationTrace ? "" : `<p class="muted">Trace de génération non conservée dans la sauvegarde : seules les valeurs finales sont affichées.</p>`;
}

function renderCharacteristicTrace(c) {
  const rows = [];
  for (const [name, value] of Object.entries(c.stats)) {
    rows.push({name,value,trace:c.generationTrace?.characteristics?.[name],bucket:"stats"});
  }
  for (const [name, value] of Object.entries(c.resistances)) {
    rows.push({name,value,trace:c.generationTrace?.resistances?.[name],bucket:"resistances"});
  }

  return `<div class="trace-table-wrap"><table class="trace-table">
    <thead><tr>
      <th>Valeur</th><th>Brut</th><th>Peuple</th><th>Ascendance</th><th>Culture</th><th>Origine</th><th>Final</th><th>Équipe</th>
    </tr></thead>
    <tbody>${rows.map(row => `<tr>
      <td><strong>${esc(row.name)}</strong><small>${esc(row.trace?.baseFormula || "")}</small></td>
      <td>${fmt(row.trace?.base)}</td>
      ${["people","ascendance","culture","origin"].map(kind => {
        const delta = deltaForKind(row.trace, kind);
        return `<td title="${esc(sourceTooltip(row.trace,kind))}" class="${delta > 0 ? "positive" : delta < 0 ? "negative" : ""}">${fmtDelta(delta)}</td>`;
      }).join("")}
      <td><strong>${fmt(row.value)}</strong></td>
      <td class="compare-cell">${renderComparison(row.value, member => member[row.bucket]?.[row.name])}</td>
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

function renderBinaryTrace(trace, value) {
  if (!trace) return {raw:"—", sources:"—", modifier:"—", final:value ? "Oui" : "Non"};

  if (trace.mode === "automatic") {
    const names = (trace.sources || []).map(x => x.name);
    return {
      raw: names.length ? "Automatique" : "Non",
      sources: names.length ? esc(names.join(" + ")) : "—",
      modifier: "—",
      final: value ? "Oui" : "Non"
    };
  }

  if (trace.mode === "probability") {
    const sources = (trace.sources || []).map(x => `${x.name} +${fmt(x.pp)} pp`);
    const extras = [];
    if (trace.warriorBonus) extras.push(`guerrier +${fmt(trace.warriorBonus)} pp`);
    if (trace.magicMultiplier && trace.magicMultiplier !== 1) extras.push(`magie ×${fmtDecimal(trace.magicMultiplier)}`);
    return {
      raw: `${fmt(trace.probability)} % · jet ${fmt(trace.percentileRoll)}`,
      sources: sources.length ? esc(sources.join(" · ")) : "—",
      modifier: extras.length ? esc(extras.join(" · ")) : "—",
      final: value ? "Oui" : "Non"
    };
  }

  if (trace.mode === "disabled") {
    return {raw:"Désactivé V1", sources:"—", modifier:"—", final:"Non"};
  }

  return {raw:value ? "Oui" : "Non", sources:"—", modifier:"—", final:value ? "Oui" : "Non"};
}

function renderSkillRow(c, group, name, value, options = {}) {
  const trace = c.generationTrace?.skills?.[name];
  const modifier = trace ? (trace.contributions || []).reduce((sum,x)=>sum+Number(x.delta||0),0) : 0;
  const bonusSources = trace?.generationBonusSources || [];
  const bonus = trace?.generationBonus
    ? `<span class="mini-badge" title="${esc(bonusSources.map(x=>`${x.name} → ${x.target} (+${x.intensity})`).join("\n"))}">Oui</span>`
    : "—";
  const isBinary = typeof value === "boolean";
  const defined = Number.isFinite(value) || isBinary;
  const binary = isBinary ? renderBinaryTrace(trace, value) : null;
  const rawDisplay = isBinary ? binary.raw : (Number.isFinite(trace?.raw) ? fmt(trace.raw) : "À définir");
  const sourceDisplay = isBinary ? binary.sources : bonus;
  const modifierDisplay = isBinary ? binary.modifier : fmtDelta(modifier);
  const finalDisplay = isBinary ? binary.final : (Number.isFinite(value) ? fmt(value) : "—");
  const inherited = trace?.inheritedFrom ? `<small>hérité de ${esc(trace.inheritedFrom)}</small>` : "";
  const labelClass = options.labelClass || "";
  const prefix = options.prefix || "";

  return `<tr class="${defined ? "" : "pending-row"} ${options.rowClass || ""}">
    <td class="${labelClass}">${prefix}<strong>${esc(name)}</strong><small>${esc(trace?.rawFormula || (defined ? "" : "Règle non définie"))}</small></td>
    <td>${rawDisplay}</td>
    <td>${sourceDisplay}</td>
    <td class="${!isBinary && modifier>0?"positive":!isBinary && modifier<0?"negative":""}">${modifierDisplay}</td>
    <td><strong>${finalDisplay}</strong>${inherited}</td>
    <td class="compare-cell">${isBinary ? "—" : renderComparison(value, member => member.skills?.[group]?.[name])}</td>
  </tr>`;
}

function renderSkillGroup(c, group, values) {
  const entries = Object.entries(values).sort((a,b) => {
    const av = Number.isFinite(a[1]) ? a[1] : -Infinity;
    const bv = Number.isFinite(b[1]) ? b[1] : -Infinity;
    return bv - av || a[0].localeCompare(b[0], "fr");
  });

  return `<details class="skill-group" ${["magic","camp"].includes(group) ? "open" : ""}>
    <summary><strong>${esc(skillLabel(group))}</strong><span>${entries.filter(([,v])=>Number.isFinite(v)).length} valeurs</span></summary>
    <div class="trace-table-wrap"><table class="trace-table skill-trace-table">
      <thead><tr><th>Compétence</th><th>Brut</th><th>Bonus génération</th><th>Modifs</th><th>Final</th><th>Équipe</th></tr></thead>
      <tbody>${entries.map(([name,value]) => renderSkillRow(c,group,name,value)).join("")}</tbody>
    </table></div>
  </details>`;
}

function renderMartialGroup(c) {
  const metadata = game.referenceData?.skills?.rows || [];
  const categories = metadata
    .filter(r => r.domaine === "Martial" && r.niveau === "Catégorie")
    .sort((a,b)=>(a.ordre??999)-(b.ordre??999) || a.nom.localeCompare(b.nom,"fr"));
  const aptitudes = metadata
    .filter(r => r.domaine === "Martial" && r.niveau === "Aptitude")
    .sort((a,b)=>(a.ordre??999)-(b.ordre??999) || a.nom.localeCompare(b.nom,"fr"));

  const blocks = categories.map(category => {
    const categoryValue = c.skills.martial[category.nom];
    const children = metadata
      .filter(r => r.parent === category.nom)
      .sort((a,b)=>(a.ordre??999)-(b.ordre??999) || a.nom.localeCompare(b.nom,"fr"))
      .filter(child => Object.prototype.hasOwnProperty.call(c.skills.martial, child.nom));

    return `<section class="martial-category">
      <div class="martial-category-head">
        <div>
          <small>Catégorie</small>
          <strong>${esc(category.nom)}</strong>
        </div>
        <div class="martial-category-score">${Number.isFinite(categoryValue) ? fmt(categoryValue) : (typeof categoryValue === "boolean" ? (categoryValue?"Oui":"Non") : "—")}</div>
        <div class="martial-category-compare">${Number.isFinite(categoryValue) ? renderComparison(categoryValue, member => member.skills?.martial?.[category.nom]) : ""}</div>
      </div>
      ${children.length ? `<div class="trace-table-wrap martial-weapons"><table class="trace-table skill-trace-table">
        <thead><tr><th>Arme</th><th>Brut</th><th>Bonus génération</th><th>Modifs</th><th>Final</th><th>Équipe</th></tr></thead>
        <tbody>${children.map(child => renderSkillRow(c,"martial",child.nom,c.skills.martial[child.nom],{labelClass:"martial-child",prefix:'<span class="branch">↳</span>'})).join("")}</tbody>
      </table></div>` : ""}
    </section>`;
  }).join("");

  const aptitudeRows = aptitudes
    .filter(a => Object.prototype.hasOwnProperty.call(c.skills.martial,a.nom))
    .map(a => renderSkillRow(c,"martial",a.nom,c.skills.martial[a.nom]))
    .join("");

  return `<details class="skill-group martial-group" open>
    <summary><strong>Martial</strong><span>catégories + armes</span></summary>
    <div class="martial-tree">${blocks}</div>
    ${aptitudeRows ? `<div class="martial-aptitudes">
      <h4>Aptitudes martiales</h4>
      <div class="trace-table-wrap"><table class="trace-table skill-trace-table">
        <thead><tr><th>Aptitude</th><th>Brut</th><th>Source</th><th>Modifs</th><th>Final</th><th>Équipe</th></tr></thead>
        <tbody>${aptitudeRows}</tbody>
      </table></div>
    </div>` : ""}
  </details>`;
}

function renderEquipment(c) {
  const slotRows = game.referenceData?.equipmentSlots?.rows || [];
  const items = new Map((c.items || []).map(item => [item.id,item]));
  const slots = c.equipment?.slots || {};
  const profile = c.equipment?.profile || {};

  const renderSlot = slot => {
    const itemId = slots[slot.id];
    const item = itemId ? items.get(itemId) : null;
    const icon = item?.itemType === "weapon" ? "⚔" : item?.itemType === "armor" ? "◈" : "·";
    const detail = item ? `
      <div class="item-tooltip">
        <strong>${esc(item.name)}</strong>
        <span>T${item.tier} — ${esc(item.qualityName || "")}</span>
        <span>${esc(item.category || item.itemType)}</span>
        ${item.grip ? `<span>Prise : ${esc(item.grip)}</span>` : ""}
        <span>Propriétaire : ${esc(c.name)}</span>
        ${item.description ? `<small>${esc(item.description)}</small>` : ""}
      </div>` : "";
    return `<div class="equipment-slot ${item ? "filled" : "empty"}" data-slot="${esc(slot.id)}">
      <span class="slot-icon">${icon}</span>
      <span class="slot-copy"><small>${esc(slot.label)}</small><strong>${item ? esc(item.name) : "Vide"}</strong>${item ? `<em>T${item.tier}</em>` : ""}</span>
      ${detail}
    </div>`;
  };

  const group = name => slotRows.filter(slot => slot.group === name).sort((a,b)=>a.order-b.order).map(renderSlot).join("");
  const profileLabel = ({melee:"CAC",ranged:"Distance",magic:"Magie"})[profile.type] || "—";
  const scores = profile.scores || {};

  return `<section class="equipment-section">
    <div class="section-title-row compact">
      <div><p class="eyebrow">Matériel personnel</p><h3>Équipement</h3></div>
      <span class="equipment-profile">Profil ${esc(profileLabel)} · CAC ${fmt(scores.melee)} · Distance ${fmt(scores.ranged)} · Magie ${fmt(scores.magic)}</span>
    </div>
    <div class="equipment-board">
      <div class="equipment-column equipment-body-slots">${group("body")}</div>
      <div class="equipment-mannequin" aria-label="Silhouette du mercenaire">
        <span class="mannequin-head"></span>
        <span class="mannequin-body"></span>
        <span class="mannequin-arm left"></span><span class="mannequin-arm right"></span>
        <span class="mannequin-leg left"></span><span class="mannequin-leg right"></span>
      </div>
      <div class="equipment-column equipment-ring-slots"><h4>Bagues</h4>${group("rings")}</div>
    </div>
    <div class="equipment-subgrid">
      <div><h4>Sets d’armes</h4><div class="equipment-grid weapons-grid">${group("weapons")}</div></div>
      <div><h4>Équipements de ceinture</h4><div class="equipment-grid belt-grid">${group("belt-items")}</div></div>
      <div><h4>Monture / compagnon</h4><div class="equipment-grid mount-grid">${group("mount")}</div></div>
    </div>
    <p class="equipment-note">Matériel personnel : pas de drag & drop. Les changements passeront plus tard par négociation, échange ou <code>change_item</code>.</p>
  </section>`;
}
function renderWeaponPreferences(c) {
  const labels = {
    oneHand: "Une main",
    twoHands: "Deux mains",
    ranged: "Distance"
  };
  const prefs = c.weaponPreferences || {};
  return `<section class="weapon-preferences">
    <div class="section-title-row compact">
      <div>
        <p class="eyebrow">Équipement conseillé</p>
        <h3>Armes de prédilection</h3>
      </div>
      <span class="muted">Score = Catégorie + Arme précise</span>
    </div>
    <div class="preference-grid">
      ${Object.entries(labels).map(([key,label]) => {
        const pref = prefs[key];
        if (!pref) return `<div class="preference-card"><small>${esc(label)}</small><strong>—</strong></div>`;
        return `<div class="preference-card">
          <small>${esc(label)}</small>
          <strong>${esc(pref.weapon)}</strong>
          <span>${esc(pref.category)} ${fmt(pref.categoryScore)} + ${esc(pref.weapon)} ${fmt(pref.specificScore)}</span>
          <b>${fmt(pref.score)}</b>
        </div>`;
      }).join("")}
    </div>
  </section>`;
}

function renderMagicPreferences(c) {
  const top = Object.entries(c.skills.magic || {})
    .filter(([,value]) => Number.isFinite(value))
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3);

  return `<section class="magic-preferences">
    <div class="section-title-row compact">
      <div>
        <p class="eyebrow">Affinités magiques</p>
        <h3>Magies de prédilection</h3>
      </div>
      <span class="muted">Top 3 des écoles</span>
    </div>
    <div class="preference-grid magic-grid">
      ${[0,1,2].map(index => {
        const entry = top[index];
        if (!entry) return `<div class="preference-card magic-card"><small>#${index+1}</small><strong>—</strong></div>`;
        const [name,value] = entry;
        return `<div class="preference-card magic-card">
          <small>#${index+1}</small>
          <strong>${esc(name)}</strong>
          <span>Maîtrise de l'école</span>
          <b>${fmt(value)}</b>
        </div>`;
      }).join("")}
    </div>
  </section>`;
}

function renderPending(c) {
  const pending = c.generationTrace?.pending || [];
  const cosmetics = (c.generationTrace?.cosmetics || []).filter(x => x.status === "deferred");
  if (!pending.length && !cosmetics.length) return "";
  return `<div class="pending-box">
    <h3>Éléments encore à générer</h3>
    ${pending.length ? `
      <p class="muted">Gameplay : le moteur n’invente pas de valeur tant que la règle n’est pas définie.</p>
      <div class="pending-list">${pending.map(x => `
        <div class="pending-item"><strong>${esc(x.target)}</strong><span>${esc(x.reason)}</span></div>
      `).join("")}</div>` : ""}
    ${cosmetics.length ? `
      <p class="muted cosmetic-heading">Cosmétique : généré plus tard à partir du profil mécanique.</p>
      <div class="pending-list">${cosmetics.map(x => `
        <div class="pending-item cosmetic-item"><strong>${esc(x.target)}</strong><span>${esc(x.reason)}</span></div>
      `).join("")}</div>` : ""}
  </div>`;
}

// Fiche mercenaire en onglets. L'onglet choisi est conservé d'une fiche à l'autre.
const SHEET_TABS = [
  ["profile", "Profil"],
  ["stats", "Caractéristiques"],
  ["skills", "Compétences"],
  ["equipment", "Équipement"],
  ["magic", "Magie"],
  ["pending", "À définir"]
];

// Situation dans la compagnie : rôle, contrat, indisponibilité.
function renderSituation(c) {
  const company = game.campaign?.company;
  const inCompany = company?.roster.includes(c);
  const roles = [];
  if (company && c.id === company.captainId) roles.push("Capitaine");
  if (company && c.id === company.intendantId) roles.push("Intendant");
  const rows = [
    `<div class="metric"><small>Statut</small><strong>${inCompany ? (roles.join(" · ") || "Membre de la compagnie") : esc(c.role || "Hors compagnie")}</strong></div>`,
    `<div class="metric"><small>État</small><strong>${c.recovery ? esc(recoveryLabel(c)) : "Disponible"}</strong></div>`
  ];
  if (c.contract) {
    rows.push(`<div class="metric"><small>Salaire du contrat</small><strong>${fmt(c.contract.dailySalary)} PO/j</strong></div>`);
    rows.push(`<div class="metric"><small>Prime de mission</small><strong>${fmt(c.contract.missionBonus)} PO</strong></div>`);
  } else if (inCompany) {
    rows.push(`<div class="metric"><small>Contrat</small><strong>Aucun</strong></div>`);
  }
  return `<section class="sheet-situation">
    <h3>Situation</h3>
    <div class="metric-grid">${rows.join("")}</div>
  </section>`;
}

function renderProfileTab(c) {
  const asc = c.ascendance
    ? `${c.ascendance} — ${c.ascendanceLevelName || "niveau "+c.ascendanceLevel}`
    : "Aucune";
  const rb = c.reputationBreakdown;
  return `
    <section class="character-overview">
      ${renderAvatar(c,{variant:"detail"})}
      <div class="character-overview-copy">
        ${renderBiography(c)}
        <div class="identity-grid">
          <div class="metric"><small>Peuple</small><strong>${renderPicto("people",c.people,{size:"md"})}${esc(c.people)}</strong></div>
          <div class="metric"><small>Culture</small><strong>${esc(c.culture)}</strong></div>
          <div class="metric"><small>Origine</small><strong>${esc(c.origin)}</strong></div>
          <div class="metric"><small>Ascendance</small><strong>${renderPicto("ascendance",c.ascendance,{size:"md"})}${esc(asc)}</strong></div>
          <div class="metric"><small>Alignement</small><strong>${esc(c.alignment)}</strong></div>
          <div class="metric"><small>Réputation</small><strong>${Math.round(c.reputation)}</strong></div>
          <div class="metric"><small>Prétentions</small><strong>${c.salaryPretension}</strong></div>
          <div class="metric"><small>Salaire demandé</small><strong>${fmt(c.salary)} PO/j</strong></div>
        </div>
        <div class="metric-grid">
          <div class="metric"><small>PV max</small><strong>${c.pvMax}</strong></div>
          <div class="metric"><small>Mana</small><strong>${c.mana}</strong></div>
          ${rb ? `<div class="metric"><small>Moyenne pool réputation</small><strong>${fmt(rb.mean)}</strong></div>
          <div class="metric"><small>Max / Min pool</small><strong>${Math.round(rb.max)} / ${Math.round(rb.min)}</strong></div>` : ""}
        </div>
      </div>
    </section>
    ${renderSituation(c)}`;
}

// Biographie figée sur le mercenaire (game-core/biography.js). Hors campagne (banc de test),
// elle est attribuée à la première ouverture de la fiche, sans réutilisation dans la session.
function renderBiography(c) {
  if (!c.biography?.id && !game.campaign?.company.roster.includes(c)) {
    game.biographiesUsed = game.biographiesUsed || new Set(game.campaign?.biographiesUsed || []);
    biographyRules().assign(c, game.biographiesUsed);
  }
  const bio = biographyRules().render(c);
  if (!bio) {
    return `<p class="character-bio-placeholder"><strong>Biographie</strong><span>Pas encore de biographie : la banque n’en contient que ${biographyRules().packs.length} pour l’instant, et une bio ne sert qu’une fois par partie.</span></p>`;
  }
  return `<section class="character-bio">
    <strong>Biographie</strong>
    <p>${esc(bio.short)}</p>
    ${bio.rumor ? `<p class="bio-rumor">${esc(bio.rumor)}</p>` : ""}
    ${bio.motto ? `<p class="bio-motto">« ${esc(bio.motto)} »</p>` : ""}
  </section>`;
}

function renderStatsTab(c) {
  return `<section class="sheet-section">
    <div class="section-title-row compact"><div><h3>Caractéristiques et résistances</h3></div><span class="muted">brut → identités → final · comparaison = capitaine + escouade</span></div>
    ${traceNotice(c)}
    ${renderCharacteristicTrace(c)}
  </section>`;
}

// La magie a son propre onglet : elle n'est pas répétée ici (idée de Chatty, PR #29).
function renderSkillsTab(c) {
  return `<section class="sheet-section">
    <div class="section-title-row compact"><div><h3>Compétences</h3></div><span class="muted">tirage brut → matrice → final · comparaison = capitaine + escouade</span></div>
    ${traceNotice(c)}
    <div class="skill-groups">
      ${renderMartialGroup(c)}
      ${Object.entries(c.skills)
        .filter(([group,values]) => group !== "martial" && group !== "magic" && Object.keys(values).length)
        .map(([group,values]) => renderSkillGroup(c,group,values))
        .join("")}
    </div>
  </section>`;
}

// Grimoire (Chatty, PR #29) : accepte déjà mercenary.spells = [{name, school, mastery}], sans l'exiger.
function renderCharacterSpellbook(c) {
  const spells = Array.isArray(c.spells) ? c.spells : [];
  if (!spells.length) {
    return `<section class="spellbook-section">
      <div class="section-title-row compact">
        <div><p class="eyebrow">Grimoire personnel</p><h3>Sorts connus</h3></div>
        <span class="muted">Catalogue en préparation (Issue #28)</span>
      </div>
      <div class="spellbook-empty">
        <strong>Aucun sort enregistré dans le prototype.</strong>
        <span>Les écoles existent déjà ; cet espace accueillera les sorts appris, leur maîtrise et leur école.</span>
      </div>
    </section>`;
  }
  return `<section class="spellbook-section">
    <div class="section-title-row compact">
      <div><p class="eyebrow">Grimoire personnel</p><h3>Sorts connus</h3></div>
      <span class="muted">${spells.length} sort${spells.length > 1 ? "s" : ""}</span>
    </div>
    <div class="spellbook-grid">
      ${spells.map(spell => `<article class="spell-card">
        <small>${esc(spell.school || spell.parent || "Magie")}</small>
        <strong>${esc(spell.name || spell.nom || "Sort")}</strong>
        <span>Maîtrise ${fmt(Number(spell.mastery))}</span>
      </article>`).join("")}
    </div>
  </section>`;
}

// Toutes les écoles du mercenaire, puis son grimoire.
function renderMagicTab(c) {
  const schools = Object.entries(c.skills.magic || {})
    .filter(([,value]) => Number.isFinite(value))
    .sort((a,b) => b[1]-a[1]);
  return `${renderMagicPreferences(c)}
    <section class="sheet-section">
      <h3>Toutes les écoles</h3>
      ${schools.length ? `<div class="school-list">${schools.map(([name,value]) => `
        <div class="school-row"><span>${esc(name)}</span><i style="width:${Math.max(0,Math.min(100,value))}%"></i><b>${fmt(value)}</b></div>`).join("")}</div>`
        : `<p class="muted">Aucune école de magie.</p>`}
    </section>
    ${renderCharacterSpellbook(c)}`;
}

function renderSheetTab(c, tab) {
  if (tab === "stats") return renderStatsTab(c);
  if (tab === "skills") return renderSkillsTab(c);
  if (tab === "equipment") return renderEquipment(c) + renderWeaponPreferences(c);
  if (tab === "magic") return renderMagicTab(c);
  if (tab === "pending") return renderPending(c) || `<p class="muted">Rien à définir pour ce mercenaire : tout ce que le moteur sait générer l’a été.</p>`;
  return renderProfileTab(c);
}

function renderSheet() {
  const c = game.sheetCharacter;
  if (!c) return;
  const tab = SHEET_TABS.some(([key]) => key === game.sheetTab) ? game.sheetTab : "profile";
  $("dialog-tabs").innerHTML = SHEET_TABS.map(([key,label]) =>
    `<button type="button" role="tab" class="sheet-tab${key === tab ? " active" : ""}" aria-selected="${key === tab}" data-sheet-tab="${key}">${esc(label)}</button>`
  ).join("");
  $("dialog-content").innerHTML = renderSheetTab(c, tab);
  $("dialog-content").setAttribute("aria-label", SHEET_TABS.find(([key]) => key === tab)[1]);
}

function showCharacter(c) {
  $("dialog-role").textContent = c.role;
  $("dialog-name").textContent = c.name;
  game.sheetCharacter = c;
  renderSheet();
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
  $("game-over-panel").classList.add("hidden");
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

    initializeMissionUi();
    initializeTavernUi();
    initializeSaveUi();

    $("new-game-btn").addEventListener("click", openSetup);
    $("cancel-setup-btn").addEventListener("click", () => $("setup-panel").classList.add("hidden"));
    $("captain-people").addEventListener("change", updateCultureSelect);
    $("captain-culture").addEventListener("change", updateOriginSelect);

    $("create-game-btn").addEventListener("click", () => {
      if (!confirmOverwriteSave()) return;
      game.idCounter = 1;
      game.captain = createCaptainFromForm();
      game.campaign = null;
      game.initialSquad = createInitialSquad(game.captain);
      game.generated = [];
      startCampaign(game.captain, game.initialSquad);
      saveGame();
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
    $("dialog-tabs").addEventListener("click", event => {
      const btn = event.target.closest("[data-sheet-tab]");
      if (!btn) return;
      game.sheetTab = btn.dataset.sheetTab;
      renderSheet();
      $("character-dialog").scrollTop = 0;
    });
    openSetup();
  } catch (error) {
    showFatal(error);
  }
}

init();
