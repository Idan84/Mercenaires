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
  renderGameHud();
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
    minMember:minItem.member,
    maxMember:maxItem.member,
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
// Les images sont celles qu'Idan dépose sur Hostinger dans media/Avatars_Equipements
// (game.referenceData.equipmentSilhouettes, api/silhouettes.php).
// On conserve le mannequin neutre quand le sexe n'est pas connu ou si l'image manque.
function equipmentSilhouetteSrc(c) {
  const sex=String(c?.sex||"").trim().toLowerCase();
  const gender=sex.startsWith("f")?"femme"
    :(sex.startsWith("h")||sex.startsWith("m"))?"homme":null;
  if(!c?.people||!gender) return null;
  const row=(game.referenceData?.equipmentSilhouettes?.rows||[]).find(r=>r.people===c.people&&r.sex===gender);
  return row?.url||null;
}

// Onglet Équipement (Idan, 2026-10-21) : la silhouette de Jean-Mimi sur un parchemin, les objets posés sur le
// corps (casque, amulette, cape, armure, ceinturon, bottes ; armes du set 1 dans les mains) ; à côté, le set
// de rechange, les bagues, la ceinture et la monture. Survol d'un objet : son détail.
const GEAR_ICONS={
  head:'<path d="M5 14a7 7 0 0 1 14 0v3H5z"/><path d="M12 7v5M4.5 17h15"/>',
  amulet:'<path d="M7 3c0 5 2.5 8 5 9 2.5-1 5-4 5-9"/><path d="m12 12-3 4 3 5 3-5z"/>',
  armor:'<path d="M6 4h12l1 6c0 5.8-3 9-7 11-4-2-7-5.2-7-11z"/><path d="M12 4v17M7.5 10h9"/>',
  cape:'<path d="M8 3h8l2.5 4-1.5 13.5-5-2-5 2L5.5 7z"/><path d="M8 3c1.5 2 6.5 2 8 0"/>',
  belt:'<rect x="3" y="9" width="18" height="6" rx="1.5"/><rect x="9.5" y="8" width="5" height="8" rx="1"/>',
  boots:'<path d="M8 3h5v10l6 3v4H6v-4l2-2z"/><path d="M6 17h13"/>',
  melee:'<path d="M19.5 4.5 9 15M19.5 4.5h-4M19.5 4.5v4"/><path d="m6.5 12.5 5 5M9 15l-4.5 4.5M3.5 18.5l2 2"/>',
  ranged:'<path d="M7 3c7 4 7 14 0 18"/><path d="M7 3v18M4 12h12M13 9l3 3-3 3"/>',
  shield:'<path d="M12 3 5 6v5c0 4.6 3 8.2 7 10 4-1.8 7-5.4 7-10V6z"/>',
  ring:'<circle cx="12" cy="14.5" r="5.5"/><path d="m10 6 2-3 2 3-2 2.5z"/>',
  pouch:'<path d="M10 3h4M10 3v5L6.5 14A5 5 0 1 0 17.5 14L14 8V3"/><path d="M7.5 15h9"/>',
  mount:'<path d="M7 21v-5l-3-3 2-6 5-3 1-2 2 3c3 1 5 4 5 8v8"/><path d="M10 9h.01" stroke-width="2.6"/>'
};
// Position des emplacements sur la silhouette, en % de l'image carrée (silhouette centrée, debout).
const GEAR_ON_BODY={head:[50,10],amulet:[50,21],cape:[66,25],armor:[50,35],belt:[50,49],weapon_set_1_main:[31,50],weapon_set_1_off:[69,50],boots:[50,90]};
function gearIcon(kind){
  return `<svg class="gear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${GEAR_ICONS[kind]||GEAR_ICONS.pouch}</svg>`;
}
function gearKind(slot,item){
  if(item?.itemType==="weapon") return /Boucliers/.test(String(item.category||""))?"shield":item.combatFamily==="ranged"?"ranged":"melee";
  if(item?.itemType==="armor") return "armor";
  if(/^ring_/.test(slot.id)) return "ring";
  if(/^belt_item_/.test(slot.id)) return "pouch";
  if(/_off$/.test(slot.id)) return "shield";
  if(/^weapon_/.test(slot.id)) return "melee";
  return GEAR_ICONS[slot.id]?slot.id:"pouch";
}
function gearTooltip(item){
  return `<span class="item-tooltip" role="tooltip">
    <strong>${esc(item.name)}</strong>
    <span>T${item.tier} — ${esc(item.qualityName||"")}</span>
    <span>${esc(item.category||item.itemType||"")}</span>
    ${item.grip?`<span>Prise : ${esc(item.grip)}</span>`:""}
    ${item.description?`<small>${esc(item.description)}</small>`:""}
  </span>`;
}
// Une case d'objet : picto de l'emplacement, contour selon la qualité, détail au survol.
function gearTile(slot,item,{extraClass=""}={}){
  const quality=item?.qualityCode?` gear-tile--${esc(item.qualityCode)}`:"";
  const title=item?"":` title="${esc(slot.label)} : vide"`;
  return `<span class="gear-tile ${item?"is-filled":"is-empty"}${quality}${extraClass?" "+extraClass:""}" tabindex="${item?0:-1}"${title}>
    ${gearIcon(gearKind(slot,item))}${item?gearTooltip(item):""}
  </span>`;
}
function renderEquipment(c) {
  const slotRows = game.referenceData?.equipmentSlots?.rows || [];
  const items = new Map((c.items || []).map(item => [item.id,item]));
  const slots = c.equipment?.slots || {};
  const itemIn = slot => slots[slot.id] ? items.get(slots[slot.id]) || null : null;
  const slotById = id => slotRows.find(s => s.id === id);
  const group = name => slotRows.filter(slot => slot.group === name).sort((a,b)=>a.order-b.order);
  const silhouette = equipmentSilhouetteSrc(c);

  // Sur le corps : emplacements du corps et armes du set en main (set 1).
  const onBody = Object.entries(GEAR_ON_BODY).map(([id,[x,y]]) => {
    const slot = slotById(id);
    if (!slot) return "";
    let item = itemIn(slot), extra = "";
    // Arme à deux mains : la main secondaire la tient aussi.
    if (!item && id === "weapon_set_1_off") {
      const main = itemIn(slotById("weapon_set_1_main"));
      if (main?.grip === "2 mains") { item = main; extra = "gear-tile--both-hands"; }
    }
    // Emplacement vide : une petite marque discrète, pour ne pas cacher le dessin.
    return `<span class="gear-spot gear-spot--${esc(id)}${item?"":" gear-spot--empty"}" style="left:${x}%;top:${y}%">${gearTile(slot,item,{extraClass:extra})}${item&&!extra?`<em class="gear-caption">${esc(item.name)}</em>`:""}</span>`;
  }).join("");

  const weaponRow = slot => {
    const item = itemIn(slot);
    return `<div class="gear-row">${gearTile(slot,item)}<span class="gear-row-text"><small>${/_off$/.test(slot.id)?"Main secondaire":"Arme principale"}</small><strong>${item?esc(item.name):"—"}</strong>${item?`<em>T${item.tier} · ${esc(item.qualityName||"")}</em>`:""}</span></div>`;
  };
  const spare = group("weapons").filter(s => /^weapon_set_2_/.test(s.id));
  const tiles = name => group(name).map(slot => gearTile(slot,itemIn(slot))).join("");
  const mount = group("mount")[0];
  const mountItem = mount ? itemIn(mount) : null;

  return `<section class="gear">
    <div class="gear-side">
      <section class="gear-card"><h4>Set de rechange</h4>${spare.map(weaponRow).join("")}</section>
      <section class="gear-card"><h4>Monture</h4>${mount?`<div class="gear-row">${gearTile(mount,mountItem)}<span class="gear-row-text"><strong>${mountItem?esc(mountItem.name):"Aucune"}</strong></span></div>`:""}</section>
    </div>
    <div class="equipment-mannequin gear-doll" aria-label="Silhouette du mercenaire et son équipement">
      ${silhouette?`<img class="equipment-mannequin-image" src="${esc(silhouette)}" alt="" decoding="async" onload="this.parentElement.classList.add('equipment-mannequin--loaded')" onerror="this.remove()">`:""}
      <span class="equipment-mannequin-fallback" aria-hidden="true">
        <span class="mannequin-head"></span>
        <span class="mannequin-body"></span>
        <span class="mannequin-arm left"></span><span class="mannequin-arm right"></span>
        <span class="mannequin-leg left"></span><span class="mannequin-leg right"></span>
      </span>
      ${onBody}
    </div>
    <div class="gear-side">
      <section class="gear-card"><h4>Bagues</h4><div class="gear-tiles gear-tiles--rings">${tiles("rings")}</div></section>
      <section class="gear-card"><h4>Ceinture</h4><div class="gear-tiles">${tiles("belt-items")}</div></section>
    </div>
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

// Onglet Profil (Idan, 2026-10-21) : portrait et état ; pictos et phrases d'origine et d'ascendance ;
// puis trois colonnes de largeurs différentes : la roue d'alignement sur toute la hauteur, et à côté
// réputation et affinité, la biographie, le salaire journalier et la prime de mission.
// Textes : data/reference/character-sheet-copy.json et reputation-stars.json (phrases de réputation).
function sheetCopy(section,name){
  return (game.referenceData?.characterSheetCopy?.[section]||[]).find(r=>r.nom===name)||null;
}
function isFemale(c){
  return String(c?.sex||"").trim().toLowerCase().startsWith("f");
}
function profileOriginLine(c,captain){
  const female=isFemale(c);
  const origin=sheetCopy("origins",c.origin);
  const job=origin?(female?origin.femme:origin.homme):String(c.origin||"").toLocaleLowerCase("fr");
  const after=captain?"avant de prendre la tête de la compagnie":"avant de rejoindre votre compagnie";
  const was=job?`${female?"elle":"il"} était ${job} ${after}`:`${female?"elle":"il"} a ${captain?"pris la tête de la compagnie":"rejoint votre compagnie"}`;
  if(!c.culture) return was.charAt(0).toUpperCase()+was.slice(1)+".";
  return `${female?"Issue":"Issu"} des ${c.culture}, ${was}.`;
}
// Niveau d'ascendance : 1 Lointain ancêtre, 2 Lignée proche, 3 Bâtard (ancestry-levels.json).
function profileAncestryLine(c){
  if(!c.ascendance) return "";
  const who=c.firstName||c.name;
  const copy=sheetCopy("ancestries",c.ascendance);
  const level=Number(c.ascendanceLevel)||1;
  if(copy&&level>=3) return `${who} est l’enfant ${copy.parent}.`;
  if(copy&&level===2) return `${who} vient d’une famille ${copy.famille}.`;
  return `${who} a du ${String(c.ascendance).toLocaleLowerCase("fr")}.`;
}
function renderProfileTab(c){
  const captain=game.campaign?.company.captainId===c.id;
  const status=rosterStatus(c);
  const pictos=renderPicto("people",c.people,{size:"md"})+(c.ascendance?renderPicto("ascendance",c.ascendance,{size:"md"}):"");
  const stars=starRules().personal(c.reputation);
  const alignments=typeof alignmentNames==="function"?alignmentNames():[];
  const affinity=renderCaptainAffinity(c);
  const salary=c.contract?.dailySalary??c.salary??0;
  const bonus=c.contract?.missionBonus??tavernRules().missionBonusDemand(c);
  return `<section class="sheet-profile">
    <aside class="sheet-portrait">
      ${renderAvatar(c,{variant:"detail",kind:"full"})}
      <em class="roster-status roster-status--${status.kind}">${esc(status.label)}</em>
    </aside>
    <div class="sheet-profile-main">
      <div class="sheet-origins">
        <div class="sheet-pictos" aria-label="${esc([c.people,c.ascendance].filter(Boolean).join(", "))}">${pictos}</div>
        <div class="sheet-origin-text">
          <p>${esc(profileOriginLine(c,captain))}</p>
          ${c.ascendance?`<p>${esc(profileAncestryLine(c))}</p>`:""}
        </div>
      </div>
      <section class="sheet-column sheet-column--alignment"><small>Alignement</small>${alignments.length?renderAlignmentWheel(alignments,c.alignment,{interactive:false}):""}<strong>${esc(c.alignment||"—")}</strong></section>
      <section class="sheet-column sheet-column--reputation"><small>Réputation</small>${renderReputationStars(c)}<p>${esc(stars?.phrase||"")}</p></section>
      <section class="sheet-column sheet-column--affinity">${affinity||`<small>Affinité</small><p>${captain?"Capitaine de la compagnie.":"Hors de la compagnie."}</p>`}</section>
      <div class="sheet-bio">${renderBiography(c)}</div>
      ${captain
        ?`<p class="sheet-pay sheet-pay--captain">Le capitaine ne touche ni salaire ni prime : la compagnie, c’est la sienne.</p>`
        :`<div class="sheet-pay sheet-pay--salary"><small>Salaire journalier</small><strong>${fmt(salary)} PO</strong></div><div class="sheet-pay sheet-pay--bonus"><small>Prime de mission</small><strong>${fmt(bonus)} PO</strong></div>`}
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
    <p>${esc(bio.short)}</p>
    ${bio.rumor ? `<p class="bio-rumor">${esc(bio.rumor)}</p>` : ""}
    ${bio.motto ? `<p class="bio-motto">« ${esc(bio.motto)} »</p>` : ""}
  </section>`;
}

// Onglet Caractéristiques (Idan, 2026-10-21) : portrait à gauche, puis Physique, Mental et Résistances.
// Au survol du nom : à quoi sert la valeur dans le jeu (character-sheet-copy.json). Au survol de la valeur :
// sa place dans la compagnie (min, médiane, moyenne, max) et les portraits du min et du max, cliquables.
// Puissance magique et réserve de mana iront dans l'onglet Magie.
const STAT_ICONS={
  "Points de vie":'<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
  "Initiative":'<path d="m5 6 6.5 6L5 18M12.5 6l6.5 6-6.5 6"/>',
  "Force":'<path d="M6.5 7.5v9M17.5 7.5v9M3.5 10v4M20.5 10v4M6.5 12h11"/>',
  "Constitution":'<path d="M3 12h4l2.2-5 3.6 10 2.2-5H21"/>',
  "Dextérité":'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.4"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>',
  "Vitesse":'<path d="M3 8.5h10.5a3 3 0 1 0-3-3M3 12.5h14.5a3 3 0 1 1-3 3M3 16.5h7"/>',
  "Endurance":'<path d="M7 3.5h10M7 20.5h10M8 3.5c0 5 8 5.5 8 8.5s-8 3.5-8 8.5M16 3.5c0 5-8 5.5-8 8.5s8 3.5 8 8.5"/>',
  "Esquive":'<path d="M4 19c4.5-1 6.5-4 7.5-8s3.5-6 8.5-6"/><path d="m16 3.5 3.8 1.5-1.4 3.8"/>',
  "Intelligence":'<path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13"/>',
  "Volonté":'<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13.5a7 7 0 0 0 14 0M8.5 10.5h7"/>',
  "Courage":'<path d="m12 2.5-1.6 2.2V15h3.2V4.7zM8 15h8M12 15v4.5M10 20.5h4"/>',
  "Charisme":'<path d="M4 17h16l-1.5-9.5-4.5 4.5-2-6.5-2 6.5-4.5-4.5zM4 20h16"/>',
  "Perception":'<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="3"/>',
  "Chance":'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M12 12h.01" stroke-width="2.6"/>',
  "Résistance physique":'<path d="M12 3 5 6v5c0 4.6 3 8.2 7 10 4-1.8 7-5.4 7-10V6z"/>',
  "Résistance au feu":'<path d="M12 3c1 3 5.5 5.2 5.5 10.2a5.5 5.5 0 0 1-11 0c0-3 2-4.2 2-6.4 1.6 1 2.2 2.2 2.2 3.3 0-3 1.3-5.1 1.3-7.1z"/>',
  "Résistance au froid":'<path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8M9.2 4l2.8 2 2.8-2M9.2 20l2.8-2 2.8 2"/>',
  "Résistance à la foudre":'<path d="M13.5 2.5 5 13.5h6l-1 8 8.5-11h-6z"/>',
  "Résistance au poison":'<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/><path d="M9.8 14.2h.01M14.2 14.2h.01" stroke-width="2.6"/>',
  "Régénération":'<path d="M12 8v8M8 12h8"/><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v3.2h-3.2"/>',
  "Intimidation":'<path d="M5 10.5a7 7 0 0 1 14 0v3l-2 2V19H7v-3.5l-2-2z"/><path d="M9.3 11.5h.01M14.7 11.5h.01" stroke-width="2.8"/><path d="M10.5 19v-2M13.5 19v-2"/>',
  "Port d’armure légère":'<path d="M8.5 3.5h7l3.5 4-2.5 2V20.5h-9V9.5L5 7.5z"/>',
  "Port d’armure intermédiaire":'<path d="M8.5 3.5h7l3.5 4-2.5 2V20.5h-9V9.5L5 7.5z"/><path d="M9.5 11h5M9.5 14h5M9.5 17h5"/>',
  "Port d’armure lourde":'<path d="M6 4h12l1 6c0 5.8-3 9-7 11-4-2-7-5.2-7-11z"/><path d="M12 4v17M7.5 10h9"/>'
};
function statIcon(name){
  return `<svg class="sheet-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${STAT_ICONS[name]||""}</svg>`;
}
function combatEngine(){
  return game.combatEngine || (game.combatEngine = MercenairesCombat.createCombatEngine(game.referenceData));
}
// Valeur affichée d'une ligne de l'onglet, pour un mercenaire quelconque (comparaison avec la compagnie).
function sheetStatValue(m,name){
  if(name==="Points de vie") return Number(m?.pvMax);
  if(name==="Initiative") return m?.stats ? Math.round(combatEngine().initiative({character:m})) : NaN;
  if(m?.resistances && name in m.resistances) return Number(m.resistances[name]);
  // Régénération (physiologie) et Intimidation (social) : rangées dans les caractéristiques (Idan, 2026-10-21).
  for(const group of ["physiology","social"]) if(m?.skills?.[group] && name in m.skills[group]) return Number(m.skills[group][name]);
  return Number(m?.stats?.[name]);
}
function statTip(row){
  const reference=(game.referenceData?.characteristics?.rows||[]).find(r=>r.nom===row.nom)
    ||(game.referenceData?.skills?.rows||[]).find(r=>r.nom===row.nom);
  const first=row.description_referentiel?String(reference?.description||"").split(/(?<=\.)\s/)[0]:"";
  return `<span class="sheet-stat-tip" role="tooltip"><strong>${esc(row.nom)}</strong>${first?`<span>${esc(first)}</span>`:""}<em>${esc(row.usage)}</em></span>`;
}
function statPortraitButton(member,label,value,current){
  const url=typeof mercenaryAvatarUrl==="function"?mercenaryAvatarUrl(member,"portrait"):null;
  // Pas de chargement différé : la bulle est cachée jusqu'au survol, le portrait doit y être déjà.
  const face=url?`<img src="${esc(url)}" alt="">`:`<span class="sheet-stat-face">${esc(avatarInitials(member))}</span>`;
  return `<button type="button" class="sheet-stat-who${member===current?" is-self":""}" data-sheet-open="${esc(member.id)}" title="Ouvrir la fiche de ${esc(member.name)}">
    ${face}<span><small>${label}</small><b>${fmt(value)}</b><em>${esc(member.name)}</em></span></button>`;
}
function statPopover(c,name,value){
  return comparePopover(c,value,m=>sheetStatValue(m,name));
}
function comparePopover(c,value,accessor){
  const data=comparisonData(value,accessor);
  if(!data) return "";
  const p=data.positions;
  const dot=(key,pos,title)=>`<i class="compare-dot ${key}" style="left:${pos}%" title="${esc(title)}"></i>`;
  return `<span class="sheet-stat-pop" role="tooltip">
    <span class="sheet-stat-pop-title">Dans la compagnie</span>
    <span class="compare-track"><span class="compare-line"></span>${dot("min",p.min,"Min "+fmt(data.min))}${dot("median",p.median,"Médiane "+fmt(data.median))}${dot("avg",p.avg,"Moyenne "+fmt(data.avg))}${dot("max",p.max,"Max "+fmt(data.max))}${dot("current",p.current,esc(c.name)+" "+fmt(value))}</span>
    <span class="sheet-stat-pop-mid"><span><i class="compare-dot median"></i>Médiane <b>${fmt(data.median)}</b></span><span><i class="compare-dot avg"></i>Moyenne <b>${fmt(data.avg)}</b></span></span>
    <span class="sheet-stat-pop-ends">${statPortraitButton(data.minMember,"Min",data.min,c)}${statPortraitButton(data.maxMember,"Max",data.max,c)}</span>
  </span>`;
}
function renderStatsTab(c){
  const rows=game.referenceData?.characterSheetCopy?.stats||[];
  const status=rosterStatus(c);
  const group=(key,title)=>`<section class="sheet-stat-group sheet-stat-group--${key}"><h4>${title}</h4>${rows.filter(r=>r.groupe===key).map(row=>{
    const value=sheetStatValue(c,row.nom);
    if(!Number.isFinite(value)) return "";
    return `<div class="sheet-stat sheet-stat--${esc(pictoSlug(row.nom))}">
      ${statIcon(row.nom)}
      <span class="sheet-stat-name" tabindex="0">${esc(row.nom.replace(/^Résistance (au |à la |aux )?/,"").replace(/^./,ch=>ch.toUpperCase()))}${statTip(row)}</span>
      <span class="sheet-stat-value" tabindex="0">${fmt(value)}${statPopover(c,row.nom,value)}</span>
    </div>`;
  }).join("")}</section>`;
  return `<section class="sheet-stats">
    <aside class="sheet-portrait">
      ${renderAvatar(c,{variant:"detail",kind:"full"})}
      <em class="roster-status roster-status--${status.kind}">${esc(status.label)}</em>
    </aside>
    ${group("physique","Physique")}${group("mental","Mental")}${group("resistance","Résistances")}
  </section>`;
}
// Onglet Compétences (Idan, 2026-10-21) : en tête, l'arme de prédilection, le style de combat et l'arme de
// tir ; puis trois colonnes (corps à corps, style de combat, tir) où chaque catégorie se déplie sur ses
// armes ; les armures portables ; la monture ou le compagnon et, à côté, discrétion et pièges. Au survol d'une valeur : sa place dans la
// compagnie. Régénération et Intimidation sont dans les caractéristiques ; Camp et Artisanat iront dans
// un autre onglet. Rangement : character-sheet-copy.json, skills_layout.
function skillValue(m,group,name){
  return Number(m?.skills?.[group]?.[name]);
}
function skillChildren(parent){
  return (game.referenceData?.skills?.rows||[]).filter(r=>r.parent===parent).map(r=>r.nom);
}
function skillDescription(name){
  return (game.referenceData?.skills?.rows||[]).find(r=>r.nom===name)?.description||"";
}
function skillValueCell(c,group,name){
  const value=skillValue(c,group,name);
  return `<span class="sheet-stat-value" tabindex="0">${fmt(value)}${comparePopover(c,value,m=>skillValue(m,group,name))}</span>`;
}
function skillName(name){
  const description=skillDescription(name);
  return `<span class="sheet-stat-name"${description?' tabindex="0"':""}>${esc(name)}${description?`<span class="sheet-stat-tip" role="tooltip"><strong>${esc(name)}</strong><em>${esc(description)}</em></span>`:""}</span>`;
}
// Une compétence ; une catégorie qui a des armes se déplie (meilleures valeurs d'abord).
function skillLine(c,group,name){
  const children=skillChildren(name).map(n=>({n,v:skillValue(c,group,n)})).filter(x=>Number.isFinite(x.v)).sort((a,b)=>b.v-a.v);
  if(!children.length) return `<div class="sheet-skill">${skillName(name)}${skillValueCell(c,group,name)}</div>`;
  return `<details class="sheet-skill-group">
    <summary class="sheet-skill"><span class="sheet-skill-chevron" aria-hidden="true">▸</span>${skillName(name)}${skillValueCell(c,group,name)}</summary>
    <div class="sheet-skill-children">${children.map(x=>`<div class="sheet-skill sheet-skill--child">${skillName(x.n)}${skillValueCell(c,group,x.n)}</div>`).join("")}</div>
  </details>`;
}
function skillColumn(c,title,names){
  const rows=names.filter(n=>Number.isFinite(skillValue(c,"martial",n)))
    .sort((a,b)=>skillValue(c,"martial",b)-skillValue(c,"martial",a));
  return `<section class="sheet-skill-column"><h4>${title}</h4>${rows.map(n=>skillLine(c,"martial",n)).join("")}</section>`;
}
// Meilleure arme d'un ensemble de catégories : score = catégorie + arme précise (comme à la génération).
function bestWeapon(c,categories){
  let best=null;
  for(const category of categories){
    const base=skillValue(c,"martial",category);
    for(const weapon of skillChildren(category)){
      const score=base+skillValue(c,"martial",weapon);
      if(Number.isFinite(score)&&(!best||score>best.score)) best={weapon,category,score};
    }
  }
  return best;
}
function predilectionCard(title,value,detail){
  return `<div class="sheet-predilection"><small>${title}</small><strong>${esc(value||"—")}</strong>${detail?`<span>${esc(detail)}</span>`:""}</div>`;
}
function renderSkillsTab(c){
  const layout=game.referenceData?.characterSheetCopy?.skills_layout;
  if(!layout) return "";
  const status=rosterStatus(c);
  const melee=bestWeapon(c,layout.corps_a_corps);
  const ranged=bestWeapon(c,layout.tir);
  const style=layout.styles_de_combat.map(n=>({n,v:skillValue(c,"martial",n)})).filter(x=>Number.isFinite(x.v)).sort((a,b)=>b.v-a.v)[0];
  const animals=skillChildren(layout.animal).map(n=>({n,v:skillValue(c,"animal",n)})).filter(x=>Number.isFinite(x.v)).sort((a,b)=>b.v-a.v);
  const yes=name=>c.skills?.martial?.[name]===true||c.skills?.physiology?.[name]===true;
  const armors=layout.armures.map(a=>`<span class="sheet-armor ${yes(a.nom)?"is-yes":"is-no"}" title="${esc(a.nom)} : ${yes(a.nom)?"oui":"non"}">${statIcon(a.nom)}${esc(a.label)}</span>`).join("");
  const aptitudes=layout.aptitudes.filter(yes).map(n=>`<span class="sheet-armor is-yes">${esc(n)}</span>`).join("");
  return `<section class="sheet-skills">
    <aside class="sheet-portrait">
      ${renderAvatar(c,{variant:"detail",kind:"full"})}
      <em class="roster-status roster-status--${status.kind}">${esc(status.label)}</em>
    </aside>
    <div class="sheet-skills-main">
      <div class="sheet-predilections">
        ${predilectionCard("Arme de prédilection",melee?.weapon,melee?.category)}
        ${predilectionCard("Style de combat",style?.n,style?fmt(style.v):"")}
        ${predilectionCard("Arme de tir",ranged?.weapon,ranged?.category)}
      </div>
      <div class="sheet-skill-columns">
        ${skillColumn(c,"Corps à corps",layout.corps_a_corps)}
        ${skillColumn(c,"Style de combat",layout.style)}
        ${skillColumn(c,"Tir",layout.tir)}
      </div>
      <div class="sheet-armors"><small>Armures</small>${armors}${aptitudes?`<small>Aptitudes</small>${aptitudes}`:""}</div>
      <div class="sheet-skills-bottom">
        <section class="sheet-animal">
          <h4>Monture ou compagnon</h4>
          ${predilectionCard("Animal de prédilection",animals[0]?.n,animals[0]?fmt(animals[0].v):"")}
          <div class="sheet-animal-skill">${skillLine(c,"animal",layout.animal)}</div>
        </section>
        ${skillColumn(c,"Discrétion et pièges",layout.discretion_et_pieges)}
      </div>
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
  $("dialog-name").textContent = c.name;
  game.sheetCharacter = c;
  renderSheet();
  // Changer de fiche depuis la fiche (portraits du min et du max) : la fenêtre est déjà ouverte.
  if (!$("character-dialog").open) $("character-dialog").showModal();
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
    // Portrait du min ou du max d'une caractéristique : on passe à sa fiche, sur le même onglet.
    $("dialog-content").addEventListener("click", event => {
      const btn = event.target.closest("[data-sheet-open]");
      if (!btn) return;
      const member = teamCharacters().find(m => String(m.id) === btn.dataset.sheetOpen);
      if (member && member !== game.sheetCharacter) showCharacter(member);
    });
    // Le jeu démarre sur le menu principal (accueil) ; « Nouvelle partie » ouvre la création.
  } catch (error) {
    showFatal(error);
  }
}

init();
