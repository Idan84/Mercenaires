"use strict";

function statSummary(c) {
  return ["Force","Dextérité","Constitution","Intelligence"]
    .map(k => `${k.slice(0,3)} ${Math.round(c.stats[k])}`)
    .join(" · ");
}

// Icônes sobres et autonomes : aucun nouvel asset visuel requis.
function rosterMetricIcon(kind) {
  const common='class="roster-metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  const drawing=kind==="reputation"
    ? '<circle cx="12" cy="9" r="6.5"/><path d="m9.5 14.8-1.2 7 3.7-2.2 3.7 2.2-1.2-7"/><path d="m12 5.5 1 2.1 2.3.3-1.65 1.6.4 2.3L12 10.7l-2.05 1.1.4-2.3L8.7 7.9l2.3-.3z"/>'
    : '<ellipse cx="12" cy="6.3" rx="7.5" ry="3.3"/><path d="M4.5 6.3v5.1c0 1.8 3.4 3.3 7.5 3.3s7.5-1.5 7.5-3.3V6.3M4.5 11.4v5.1c0 1.8 3.4 3.3 7.5 3.3s7.5-1.5 7.5-3.3v-5.1"/>';
  return `<svg ${common}>${drawing}</svg>`;
}

function renderRosterAffinity(c) {
  const affinity=captainAffinity(c);
  if(!affinity) return "";
  const {filled,phrase}=affinityPresentation(affinity.total);
  return `<span class="roster-affinity">
    <span class="roster-affinity-hearts" aria-label="Affinité : ${filled} cœurs sur 10"><span class="is-full">${"♥".repeat(filled)}</span><span class="is-empty">${"♡".repeat(10-filled)}</span></span>
    <span class="roster-affinity-phrase">${esc(phrase)}</span>
  </span>`;
}

// État sous le portrait, dans un cartel coloré (Idan, 2026-10-21) : vert Disponible, orange Fatigué,
// rouge Blessé ; jaune réservé à « En mission » quand cet état existera.
function rosterStatus(c){
  if(c.recovery?.kind==="wounded") return {kind:"wounded",label:recoveryLabel(c)};
  if(c.recovery) return {kind:"fatigued",label:recoveryLabel(c)};
  return {kind:"available",label:"Disponible"};
}

function characterRow(c,hero=false){
  const captain=game.campaign&&game.campaign.company.captainId===c.id;
  const status=rosterStatus(c);
  const salary=Number(c.contract?.dailySalary??c.salary)||0;
  const fullName=[c.firstName,c.familyName].filter(Boolean).join(" ")||c.name||"Mercenaire";
  return `<button type="button" class="roster-card ${captain?"roster-captain":""}" data-character-id="${esc(c.id)}" aria-label="Voir la fiche de ${esc(fullName)}">
    <span class="roster-card-visual">
      ${renderAvatar(c,{variant:"card",kind:"portrait"})}
      <em class="roster-status roster-status--${status.kind}">${esc(status.label)}</em>
    </span>
    <span class="roster-card-info">
      <span class="roster-card-heading">
        <strong class="roster-name" title="${esc(fullName)}">${esc(fullName)}</strong>
        <span class="roster-people-picto" title="${esc(c.people||"")}">${renderPicto("people",c.people,{size:"sm"})}</span>
      </span>
      ${c.culture?`<span class="roster-culture">${esc(c.culture)}</span>`:""}
      <span class="roster-metrics">
        <span class="roster-metric" title="Réputation">${rosterMetricIcon("reputation")}${renderReputationStars(c)}</span>
        <span class="roster-metric" title="Salaire quotidien">${rosterMetricIcon("salary")}<span>${fmt(salary)} PO</span></span>
      </span>
      ${renderRosterAffinity(c)}
    </span>
  </button>`;
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
  $("company-title").textContent = game.campaign?.company.name || `Compagnie de ${game.captain.name}`;
  $("captain-summary").innerHTML = characterRow(game.captain, true);
  renderCampCalendar();
  renderMercenaryRoster();
  renderGenerated();
  renderTavern();
}

// Tri exclusivement visuel : aucune modification de l'ordre sauvegardé ni des règles.
let rosterSortKey="reputation";
let rosterSortDescending=true;

function rosterSortValue(c,key) {
  if(key==="salary") return Number(c.contract?.dailySalary??c.salary)||0;
  if(key==="affinity") return captainAffinity(c)?.total??null;
  return Number(c.reputation)||0;
}

function sortMercenaryRoster(members,key=rosterSortKey,descending=rosterSortDescending) {
  const scores=new Map(members.map(c=>[c,rosterSortValue(c,key)]));
  return [...members].sort((a,b)=>{
    const av=scores.get(a),bv=scores.get(b);
    if(av===null) return bv===null ? 0 : 1; // Affinité non calculable en dernier
    if(bv===null) return -1;
    const delta=descending ? bv-av : av-bv;
    return delta||String(a.name||"").localeCompare(String(b.name||""),"fr");
  });
}

function renderMercenaryRoster() {
  const squad=teamCharacters().filter(c=>c!==game.captain);
  const company=game.campaign?.company;
  const occupied=company?.roster.length??(squad.length+(game.captain?1:0));
  const capacity=company?.camp?.dormitoryCapacity;
  const count=$("initial-count");
  count.innerHTML=`<span class="roster-count-number">${squad.length} mercenaire${squad.length!==1?"s":""}</span><span class="roster-count-capacity">Dortoir : ${occupied} / ${Number.isFinite(capacity)?capacity:"—"}</span>`;
  count.title="La capacité du dortoir comprend également le capitaine.";
  $("roster-sort").value=rosterSortKey;
  const direction=$("roster-sort-direction");
  direction.textContent=rosterSortDescending?"↓ Décroissant":"↑ Croissant";
  direction.setAttribute("aria-label",rosterSortDescending?"Trier par ordre croissant":"Trier par ordre décroissant");
  direction.title=direction.getAttribute("aria-label");
  $("initial-squad").innerHTML=sortMercenaryRoster(squad).map(c=>characterRow(c)).join("");
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

// Réputation et renommée en étoiles (décision Idan du 2026-10-20) : 15 niveaux, 1 à 5 étoiles de bronze,
// d'argent puis d'or (data/reference/reputation-stars.json). La valeur chiffrée reste au survol, pour les tests.
function starRules() {
  return game.starRules || (game.starRules = MercenairesStars.createStarRules({ reference: game.referenceData }));
}

function renderStarLevel(info, detail = "") {
  if (!info) return "—";
  const tip = info.label + (detail ? " — " + detail : "");
  return `<span class="rep-stars rep-stars--${info.metalKey}" title="${esc(tip)}" aria-label="${esc(info.label)}">`
    + "★".repeat(info.stars) + `<span class="rep-stars-empty">${"★".repeat(5 - info.stars)}</span></span>`;
}

function starDetail(name, value, info) {
  return name + " " + fmt(value) + (info?.nextAt != null ? " · niveau suivant à " + fmt(info.nextAt) : " · niveau maximal");
}

function renderReputationStars(c) {
  const info = starRules().personal(c.reputation);
  const career = Number(c.reputationCareerDelta) || 0;
  const detail = starDetail("Réputation", c.reputation, info) + (Math.round(career) ? " · initiale " + fmt(c.reputation - career) + ", carrière " + fmtDelta(career) : "");
  return renderStarLevel(info, detail);
}

function renderRenownStars(renown) {
  const info = starRules().company(renown.total);
  const parts = renown.parts ? " · capitaine " + fmt(renown.parts.captain) + " + mercenaires " + fmt(renown.parts.members) + " + héritage " + fmt(renown.parts.heritage) : "";
  return renderStarLevel(info, starDetail("Renommée", renown.total, info) + parts);
}

function affinityRules() {
  return game.affinityRules || (game.affinityRules = MercenairesAffinity.createAffinityRules({ reference: game.referenceData }));
}

// Affinité envers le capitaine de la compagnie (02, phase 1) : membre ou candidat de la Taverne ; null pour
// le capitaine lui-même, hors campagne ou si elle n'est pas calculable.
function captainAffinity(c) {
  const company = game.campaign?.company;
  if (!company || c.id === company.captainId) return null;
  const captain = company.roster.find(m => m.id === company.captainId);
  const a = captain && affinityRules().memberAffinity(captain, c);
  return a?.ok ? a : null;
}

function signedScore(n) {
  return (n > 0 ? "+" : "") + n;
}

// Présentation exclusivement UI : 10 descriptions d'affinité approuvées par Idan.
// Le score réel reste disponible pour les mécaniques de jeu, jamais affiché dans la fiche.
function affinityPresentation(score) {
  const value = Math.max(-100, Math.min(100, Number(score) || 0));
  const phrases = [
    "Rêve en permanence de vous arracher les organes.",
    "Envisage sérieusement d'empoisonner votre prochain repas.",
    "Vous méprise avec une constance presque admirable.",
    "Préférerait recevoir ses ordres d'un gobelin ivre.",
    "Vous supporte, essentiellement pour votre argent.",
    "Vous trouve moins insupportable que prévu.",
    "Éprouve pour vous un respect prudent, mais sincère.",
    "Vous suivrait au combat, même sans prime exceptionnelle.",
    "Donnerait sa vie pour vous. Enfin, probablement.",
    "Fantasme toutes les nuits en pensant à vous."
  ];
  const thresholds = [-80, -60, -40, -20, 0, 20, 40, 60, 79, 100];
  const level = thresholds.findIndex(max => value <= max);
  // 0 à 10 cœurs pleins, de -100 à +100 ; cœurs vides pour le reste.
  const filled = Math.floor((value + 100) / 20);
  return { phrase: phrases[level], filled };
}

function renderCaptainAffinity(c) {
  if (!game.campaign?.company.roster.includes(c)) return "";
  const a = captainAffinity(c);
  if (!a) return "";
  const { phrase, filled } = affinityPresentation(a.total);
  const hearts = `<span class="player-affinity-hearts" aria-hidden="true"><span class="is-full">${"♥".repeat(filled)}</span><span class="is-empty">${"♡".repeat(10 - filled)}</span></span>`;
  return `<div class="player-affinity"><small>Affinité avec le capitaine</small>${hearts}<strong class="player-affinity-phrase">${esc(phrase)}</strong></div>`;
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

// Silhouette d'équipement : peuple et sexe proviennent du mercenaire (sexe hérité de l'avatar).
// Les fichiers sont livrés séparément par Idan/JC3 dans assets/silhouettes.
// On conserve le mannequin neutre quand le sexe n'est pas connu ou si le fichier manque.
function equipmentSilhouetteSrc(c) {
  const peoples={
    "Humain":"humain","Elfe":"elfe","Nain":"nain","Orc":"orc",
    "Gobelin":"gobelin","Halfling":"halfling","Gnome":"gnome",
    "Ogre":"ogre","Reptilien":"reptilien","Homme-bête":"homme-bete"
  };
  const people=peoples[c?.people];
  const sex=String(c?.sex||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").trim().toLowerCase();
  const gender=["homme","masculin","male","m"].includes(sex)?"homme"
    :["femme","feminin","female","f"].includes(sex)?"femme":null;
  return people&&gender?`assets/silhouettes/${people}-${gender}.webp`:null;
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
        ${equipmentSilhouetteSrc(c)?`<img class="equipment-mannequin-image" src="${esc(equipmentSilhouetteSrc(c))}" alt="" loading="lazy" decoding="async" onload="this.parentElement.classList.add('equipment-mannequin--loaded')" onerror="this.remove()">`:""}
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
  ["magic", "Magie"]
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

function renderProfileTab(c){
  const captain=game.campaign?.company.captainId===c.id;
  return `<section class="player-profile">
    ${renderAvatar(c,{variant:"detail",kind:"full"})}
    <div class="player-profile-details">
      <div class="player-profile-tag">${captain?"Capitaine de la compagnie":"Mercenaire"}</div>
      <div class="player-identity-grid">
        <div><small>Peuple</small><strong>${esc(c.people)}</strong></div>
        <div><small>Culture</small><strong>${esc(c.culture||"—")}</strong></div>
        <div><small>Origine</small><strong>${esc(c.origin||"—")}</strong></div>
        <div><small>Ascendance</small><strong>${esc(c.ascendance||"Aucune")}</strong></div>
        <div><small>Alignement</small><strong>${esc(c.alignment||"—")}</strong></div>
        <div><small>Réputation</small><strong>${renderReputationStars(c)}</strong></div>
        ${renderCaptainAffinity(c)}
      </div>
      <div class="player-vitals">
        <div><small>Points de vie</small><strong>${fmt(c.pvMax)}</strong></div>
        <div><small>Mana</small><strong>${fmt(c.mana||0)}</strong></div>
        <div><small>État</small><strong>${c.recovery?esc(recoveryLabel(c)):"Disponible"}</strong></div>
        <div><small>Salaire quotidien</small><strong>${fmt(c.contract?.dailySalary??c.salary??0)} PO</strong></div>
      </div>
      ${renderBiography(c)}
    </div>
  </section>`;
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

function renderStatsTab(c){
  const section=(title,data)=>`<section class="player-stat-section"><h3>${title}</h3><div class="player-stat-grid">${Object.entries(data||{}).map(([key,value])=>`<div class="player-stat"><span>${esc(key)}</span><strong>${fmt(value)}</strong></div>`).join("")}</div></section>`;
  return section("Caractéristiques",c.stats)+section("Résistances",c.resistances);
}
function renderSkillsTab(c){
  return `<div class="player-skills">${Object.entries(c.skills||{}).filter(([group])=>group!=="magic").map(([group,values])=>{
    const entries=Object.entries(values||{}).filter(([,value])=>typeof value==="number").sort((a,b)=>b[1]-a[1]);
    if(!entries.length)return "";
    return `<section class="player-stat-section"><h3>${esc(skillLabel(group))}</h3><div class="player-stat-grid">${entries.map(([name,value])=>`<div class="player-stat"><span>${esc(name)}</span><strong>${fmt(value)}</strong></div>`).join("")}</div></section>`;
  }).join("")}</div>`;
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
  if (tab === "equipment") return renderEquipment(c);
  if (tab === "magic") return renderMagicTab(c);
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
  $("engine-audit").classList.add("audit-error");
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
    initializeScreenUi();
    initializeIntroUi();

    $("new-game-btn").addEventListener("click", openIntro);
    $("cancel-setup-btn").addEventListener("click", () => $("setup-panel").classList.add("hidden"));
    $("captain-people").addEventListener("change", updateCultureSelect);
    $("captain-culture").addEventListener("change", updateOriginSelect);

    $("create-game-btn").addEventListener("click", () => {
      if (!confirmOverwriteSave()) return;
      game.idCounter = 1;
      game.captain = createCaptainFromForm();
      // Le portrait choisi par le joueur prime sur l'attribution automatique.
      const pickedAvatar=typeof wizard!=="undefined"
        ?(game.referenceData?.avatars?.rows||[]).find(a=>a.id===wizard.choice.avatar):null;
      if(pickedAvatar){
        game.captain.avatar={id:pickedAvatar.id,full:pickedAvatar.full,portrait:pickedAvatar.portrait};
        if(pickedAvatar.sex) game.captain.sex=pickedAvatar.sex;
      }
      game.campaign = null;
      game.initialSquad = createInitialSquad(game.captain);
      game.generated = [];
      startCampaign(game.captain, game.initialSquad);
      if(game.campaign&&typeof wizard!=="undefined"&&wizard.choice.companyName?.trim()){
        game.campaign.company.name=wizard.choice.companyName.trim();
      }
      saveGame();
      renderGame();
    });

    $("generate-merc-btn").addEventListener("click", () => {
      const c = createCharacter({captain: game.captain, role: "Candidat"});
      game.generated.unshift(c);
      renderGenerated();
    });

    $("roster-sort").addEventListener("change",event=>{
      if(["reputation","salary","affinity"].includes(event.target.value)){
        rosterSortKey=event.target.value;
        renderMercenaryRoster();
      }
    });
    $("roster-sort-direction").addEventListener("click",()=>{
      rosterSortDescending=!rosterSortDescending;
      renderMercenaryRoster();
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
    // Le jeu démarre sur le menu principal (accueil) ; « Nouvelle partie » ouvre la création.
  } catch (error) {
    showFatal(error);
  }
}

init();
