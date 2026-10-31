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
  const {filled,phrase}=affinityPresentation(affinity.total,c);
  return `<span class="roster-affinity">
    <span class="roster-affinity-hearts" aria-label="Affinité : ${filled} cœurs sur 10"><span class="is-full">${"♥".repeat(filled)}</span><span class="is-empty">${"♡".repeat(10-filled)}</span></span>
    <span class="roster-affinity-phrase">${esc(phrase)}</span>
  </span>`;
}

// État sous le portrait, dans un cartel coloré (Idan, 2026-10-21) : vert Disponible, orange Fatigué,
// rouge Blessé ; jaune réservé à « En mission » quand cet état existera.
function rosterStatus(c){
  // Parti en expédition (doc 17) : en route, sur place ou sur le chemin du retour. Mission programmée (Idan, 2026-10-30) :
  // il part demain matin ; d'ici là il est au camp, on lui parle et on l'équipe.
  const expedition=game.campaign&&typeof campaignRules==="function"?campaignRules().expeditionOf(game.campaign,c.id):null;
  if(expedition?.status==="scheduled") return {kind:"scheduled",label:"Mission programmée"};
  if(expedition) return {kind:"away",label:expedition.status==="returning"?"Sur le retour":"En mission"};
  if(c.recovery?.kind==="wounded") return {kind:"wounded",label:recoveryLabel(c)};
  if(c.recovery) return {kind:"fatigued",label:recoveryLabel(c)};
  // L'intendant reste au camp (Idan, 2026-10-24).
  if(game.campaign&&c.id===game.campaign.company.intendantId) return {kind:"steward",label:String(c.sex||"").toLowerCase().startsWith("f")?"Intendante":"Intendant"};
  return {kind:"available",label:"Disponible"};
}

function characterRow(c,hero=false){
  const captain=game.campaign&&game.campaign.company.captainId===c.id;
  // Lieutenant (Idan, 2026-10-25) : il reste dans les mercenaires, avec un cadre plus classe que les autres.
  const lieutenant=typeof isCompanyLieutenant=="function"&&isCompanyLieutenant(c);
  const status=rosterStatus(c);
  const salary=Number(c.contract?.dailySalary??c.salary)||0;
  const fullName=[c.firstName,c.familyName].filter(Boolean).join(" ")||c.name||"Mercenaire";
  return `<button type="button" class="roster-card ${captain?"roster-captain":""}${lieutenant?" roster-lieutenant":""}" data-character-id="${esc(c.id)}" aria-label="Voir la fiche de ${esc(fullName)}">
    <span class="roster-card-visual">
      ${renderAvatar(c,{variant:"card",kind:"portrait"})}
      <em class="roster-status roster-status--${status.kind}">${esc(status.label)}</em>
    </span>
    <span class="roster-card-info">
      <strong class="roster-name" title="${esc(fullName)}">${esc(fullName)}</strong>
      ${lieutenant?`<span class="roster-rank">${esc(lieutenantFill("{Lieutenant|Lieutenante} · aura +",c))}${fmt(lieutenantAura(c))} Courage</span>`:""}
      ${c.culture?`<span class="roster-culture">${esc([c.culture,c.ascendance].filter(Boolean).join(" · "))}</span>`:""}
      <span class="roster-metrics">
        <span class="roster-metric" title="Réputation">${rosterMetricIcon("reputation")}${renderReputationStars(c)}</span>
        <span class="roster-metric" title="Salaire quotidien">${rosterMetricIcon("salary")}<span>${fmt(salary)} PO</span></span>
      </span>
      ${renderRosterAffinity(c)}
    </span>
    <span class="roster-pictos">${["people","culture","ascendance"].map(kind=>renderPicto(kind,c[kind],{size:"sm"})).join("")}</span>
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
  // Ma Compagnie : le capitaine et l'intendant (Idan, 2026-10-24).
  const steward = game.campaign?.company.roster.find(m => m.id === game.campaign.company.intendantId);
  $("captain-summary").innerHTML = characterRow(game.captain, true) + (steward ? characterRow(steward) : "");
  renderGameHud();
  renderMercenaryRoster();
  renderGenerated();
  renderTavern();
  renderQuartermaster();
  renderCampBuildings();
  renderLieutenants();
  if (typeof renderMerchant === "function") renderMerchant();
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

// Places du dortoir : des demi-places pour les halflings, les gnomes et les gobelins (« 12,5 »).
function dormitoryPlacesText(places){
  return String(Math.round(Number(places)*2)/2).replace(".",",");
}

function renderMercenaryRoster() {
  // L'intendant passe dans Ma Compagnie (Idan, 2026-10-24).
  const squad=teamCharacters().filter(c=>c!==game.captain&&c.id!==game.campaign?.company.intendantId);
  const company=game.campaign?.company;
  const occupied=game.campaign?campaignRules().dormitoryUsed(game.campaign):squad.length;
  const capacity=company?.camp?.dormitoryCapacity;
  const count=$("initial-count");
  count.innerHTML=`<span class="roster-count-number">${squad.length} mercenaire${squad.length!==1?"s":""}</span><span class="roster-count-capacity">Dortoir : ${dormitoryPlacesText(occupied)} / ${Number.isFinite(capacity)?capacity:"—"}</span>`;
  count.title="Places occupées au dortoir : un ogre en prend deux ; un halfling, un gnome ou un gobelin une demi ; le capitaine et l’intendant n’en prennent pas.";
  const link=$("roster-company-link");
  if(link) link.textContent=typeof companyPhrase==="function"?companyPhrase():(company?.name||"la compagnie");
  $("roster-sort").value=rosterSortKey;
  const direction=$("roster-sort-direction");
  direction.textContent=rosterSortDescending?"↓":"↑";
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
  const missions = renown.parts?.missions ? " + missions " + fmt(renown.parts.missions) : "";
  const camp = renown.parts?.camp ? " + dortoir " + fmt(renown.parts.camp) : "";
  const parts = renown.parts ? " · capitaine " + fmt(renown.parts.captain) + " + mercenaires " + fmt(renown.parts.members) + " + héritage " + fmt(renown.parts.heritage) + missions + camp : "";
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

// Variantes (Idan, 2026-10-24) : quatre phrases de même sens par niveau. Le choix dépend du mercenaire et du
// niveau : deux mercenaires du même niveau n'ont pas forcément la même phrase, et elle ne change pas d'un affichage
// à l'autre.
function variantPhrase(phrases, seed) {
  const list = phrases.filter(Boolean);
  if (!list.length) return "";
  let hash = 2166136261;
  for (const ch of String(seed)) hash = Math.imul(hash ^ ch.codePointAt(0), 16777619);
  return list[(hash >>> 0) % list.length];
}
function phraseSeed(c, kind, level) {
  return [c?.id ?? c?.name ?? "", kind, level].join("|");
}

// Présentation exclusivement UI : 10 niveaux d'affinité (data/reference/affinity-phrases.json), phrases approuvées
// par Idan. Le score réel reste disponible pour les mécaniques de jeu, jamais affiché dans la fiche.
function affinityPresentation(score, c) {
  const value = Math.max(-100, Math.min(100, Number(score) || 0));
  const rows = [...(game.referenceData?.affinityPhrases?.rows || [])].sort((a, b) => a.affinite_max - b.affinite_max);
  const row = rows.find(r => value <= r.affinite_max) || rows[rows.length - 1];
  // 0 à 10 cœurs pleins, de -100 à +100 ; cœurs vides pour le reste.
  const filled = Math.floor((value + 100) / 20);
  return { phrase: row ? variantPhrase([row.phrase, ...(row.variantes || [])], phraseSeed(c, "affinite", row.niveau)) : "", filled };
}

function renderCaptainAffinity(c) {
  if (!game.campaign?.company.roster.includes(c)) return "";
  const a = captainAffinity(c);
  if (!a) return "";
  const { phrase, filled } = affinityPresentation(a.total, c);
  const hearts = `<span class="player-affinity-hearts" aria-hidden="true"><span class="is-full">${"♥".repeat(filled)}</span><span class="is-empty">${"♡".repeat(10 - filled)}</span></span>`;
  // Slip d’Affinité porté (Idan, 2026-10-24) : ses points sont déjà dans les cœurs ; pas de score affiché.
  const gear = a.gear ? `<small class="player-affinity-gear">Avec son ${esc(a.gearItem?.name || "Slip d’Affinité")}</small>` : "";
  return `<div class="player-affinity"><small>Affinité avec le capitaine</small>${hearts}<strong class="player-affinity-phrase">${esc(phrase)}</strong>${gear}</div>`;
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
// corps (casque, amulette, cape, armure, gants, ceinturon, culotte, bottes ; armes du set 1 dans les mains ; gants et
// culotte ajoutés le 2026-10-24) ; à côté, le set
// de rechange, les bagues, la ceinture et la monture. Survol d'un objet : son détail.
const GEAR_ICONS={
  head:'<path d="M5 14a7 7 0 0 1 14 0v3H5z"/><path d="M12 7v5M4.5 17h15"/>',
  amulet:'<path d="M7 3c0 5 2.5 8 5 9 2.5-1 5-4 5-9"/><path d="m12 12-3 4 3 5 3-5z"/>',
  armor:'<path d="M6 4h12l1 6c0 5.8-3 9-7 11-4-2-7-5.2-7-11z"/><path d="M12 4v17M7.5 10h9"/>',
  cape:'<path d="M8 3h8l2.5 4-1.5 13.5-5-2-5 2L5.5 7z"/><path d="M8 3c1.5 2 6.5 2 8 0"/>',
  belt:'<rect x="3" y="9" width="18" height="6" rx="1.5"/><rect x="9.5" y="8" width="5" height="8" rx="1"/>',
  boots:'<path d="M8 3h5v10l6 3v4H6v-4l2-2z"/><path d="M6 17h13"/>',
  gloves:'<path d="M8 21v-5.5L5.2 11.8a1.3 1.3 0 0 1 2-1.6L9 12.4V5a1.3 1.3 0 0 1 2.6 0v5.5V3.8a1.3 1.3 0 0 1 2.6 0v6.7V5a1.3 1.3 0 0 1 2.6 0v6.5V7.4a1.3 1.3 0 0 1 2.6 0V15c0 2.6-1.4 4.6-3 6z"/><path d="M8 18h8.8"/>',
  pants:'<path d="M6 3h12l1.5 18h-5L12 10l-2.5 11h-5z"/><path d="M6.2 6.5h11.6"/>',
  melee:'<path d="M19.5 4.5 9 15M19.5 4.5h-4M19.5 4.5v4"/><path d="m6.5 12.5 5 5M9 15l-4.5 4.5M3.5 18.5l2 2"/>',
  ranged:'<path d="M7 3c7 4 7 14 0 18"/><path d="M7 3v18M4 12h12M13 9l3 3-3 3"/>',
  shield:'<path d="M12 3 5 6v5c0 4.6 3 8.2 7 10 4-1.8 7-5.4 7-10V6z"/>',
  ring:'<circle cx="12" cy="14.5" r="5.5"/><path d="m10 6 2-3 2 3-2 2.5z"/>',
  pouch:'<path d="M10 3h4M10 3v5L6.5 14A5 5 0 1 0 17.5 14L14 8V3"/><path d="M7.5 15h9"/>',
  flask:'<path d="M9.5 3h5M10.5 3v5.2L5.6 17a2.6 2.6 0 0 0 2.3 4h8.2a2.6 2.6 0 0 0 2.3-4l-4.9-8.8V3"/><path d="M7.4 14.5h9.2"/>',
  mount:'<path d="M7 21v-5l-3-3 2-6 5-3 1-2 2 3c3 1 5 4 5 8v8"/><path d="M10 9h.01" stroke-width="2.6"/>'
};
// Position des emplacements sur la silhouette, en % de l'image carrée (silhouette centrée, debout).
const GEAR_ON_BODY={head:[50,10],amulet:[50,21],cape:[66,25],armor:[50,35],gloves:[21,66],belt:[50,49],pants:[50,67],weapon_set_1_main:[31,50],weapon_set_1_off:[69,50],boots:[50,86]};
function gearIcon(kind){
  return `<svg class="gear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${GEAR_ICONS[kind]||GEAR_ICONS.pouch}</svg>`;
}
function gearKind(slot,item){
  if(item?.itemType==="potion") return "flask";
  if(item?.itemType==="weapon") return /Boucliers/.test(String(item.category||""))?"shield":item.combatFamily==="ranged"?"ranged":"melee";
  if(item?.itemType==="armor") return "armor";
  if(/^ring_/.test(slot.id)) return "ring";
  if(/^belt_item_/.test(slot.id)) return "pouch";
  if(/_off$/.test(slot.id)) return "shield";
  if(/^weapon_/.test(slot.id)) return "melee";
  return GEAR_ICONS[slot.id]?slot.id:"pouch";
}
// Carte de l'objet au survol (item-card-ui.js), gardée dans un modèle caché de la case.
function gearTooltip(item){
  const card=typeof renderItemCard==="function"?renderItemCard(item):"";
  return `<template class="item-card-template">${card||`<div class="item-card item-card--t${Number(item.tier)||1}">
    <div class="item-card-names"><strong class="item-card-title">${esc(itemPublicName(item))}</strong>
    <span class="item-card-sub">${esc(item.category||item.itemType||"")}</span></div>
    ${item.description?`<p class="item-card-flavor">${esc(item.description)}</p>`:""}
  </div>`}</template>`;
}
// Image d'un objet selon son tier (Idan, 2026-10-23 : masters dans assets-src/Equipements/, versions du jeu
// par scripts/build-equipment.js), ou null tant qu'il n'en a pas : la case garde alors son picto.
const EQUIPMENT_ART_DIRS={helmet:"casques",armor:"armures",weapon:"armes",boots:"bottes",belt:"ceintures",amulet:"amulettes",cape:"capes",gloves:"gants",pants:"culottes",ring:"bagues"};
function equipmentArt(item){
  const dir=EQUIPMENT_ART_DIRS[item?.itemType];
  const key=dir?`${dir}/${pictoSlug(item.name)}-${item.tier}`:null;
  return key&&typeof EQUIPMENT_ART!=="undefined"&&EQUIPMENT_ART.has(key)?`assets/equipment/${key}.webp`:null;
}
// Grande image de la carte d'objet (Idan, 2026-10-25) : la même en 512 px.
function equipmentArtLarge(item){
  return equipmentArt(item)?.replace("assets/equipment/","assets/equipment-large/")||null;
}
// Une case d'objet : image dans son cadre de tier (ou picto de l'emplacement et contour selon la qualité),
// détail au survol.
// data-slot / data-item : l'emplacement et l'objet visés par un échange d'équipement (deal-ui.js) ; une arme à deux
// mains montrée aussi en main secondaire désigne l'emplacement de l'arme principale (dealSlot).
function gearTile(slot,item,{extraClass="",dealSlot=null}={}){
  const art=equipmentArt(item);
  const quality=item?.qualityCode?` gear-tile--${esc(item.qualityCode)}`:"";
  // Fiole sans image : sa couleur dit ce qu'elle contient (soins, mana, poison).
  const potion=item?.itemType==="potion"?` gear-tile--potion gear-tile--${esc(String(item.templateId||"").replace(/^potion:/,""))}`:"";
  const framed=art?` gear-tile--art gear-tile--t${Number(item.tier)||1}`:"";
  const title=item?"":` title="${esc(slot.label)} : vide"`;
  return `<span class="gear-tile ${item?"is-filled":"is-empty"}${quality}${potion}${framed}${extraClass?" "+extraClass:""}" tabindex="${item?0:-1}"${title} data-slot="${esc(dealSlot||slot.id)}"${item?` data-item="${esc(item.id)}"`:""}>
    ${art?`<img class="gear-art" src="${art}" alt="" loading="lazy">`:gearIcon(gearKind(slot,item))}${item?gearTooltip(item):""}
  </span>`;
}
// Case Dégâts (Idan, 2026-10-30) : quatre chiffres pour comparer les mercenaires, des scores et non des chances —
// Précision, Puissance, Dégâts (du plus petit au plus grand coup, avant la Résistance physique de la cible, et leur
// type) et Pénétration d'armure — en tableau, une colonne par arme qui frappe (set 1, set 2, main secondaire) ;
// l'infobulle du libellé dit à quoi sert le chiffre et son écart (character-sheet-copy.json, attack_usage).
function renderDamageCard(c) {
  const sets = typeof equipmentEffectRules === "function" && c?.stats ? equipmentEffectRules().attacks(c) : [];
  const strikes = sets.flatMap(({set, strikes}) => strikes.map(s => ({...s, set})));
  if (!strikes.length) return "";
  const type = t => esc(t.type.toLowerCase());
  const row = (name, cell, span) => `<tr><th scope="row">${attackTip(name, span)}</th>${strikes.map(s => `<td>${cell(s)}</td>`).join("")}</tr>`;
  return `<section class="gear-card gear-damage"><h4>Dégâts</h4><table class="gear-damage-table">
    <thead><tr><td></td>${strikes.map(s => `<th scope="col"><small>Set ${s.set}${s.hand === "off" ? " · main secondaire" : ""}</small><strong>${esc(s.name)}</strong></th>`).join("")}</tr></thead>
    <tbody>
      ${row("Précision", s => `<b>${Math.round(s.precision)}</b>`)}
      ${row("Puissance", s => `<b>${Math.round(s.power)}</b>`)}
      ${row("Dégâts", s => `<b>${s.min} à ${s.max}</b> PV${s.types.length ? `<small>en ${s.types.map(type).join(" ou ")}</small>` : ""}`)}
      ${strikes.some(s => s.types.length) ? row("Pénétration d’armure", s => s.types.length === 1 ? `<b>${s.types[0].power}</b>`
        : s.types.map(t => `<span><b>${t.power}</b> ${type(t)}</span>`).join(""), penetrationSpan()) : ""}
    </tbody>
  </table></section>`;
}
function attackTip(name, span = "") {
  const row = game.referenceData?.characterSheetCopy?.attack_usage?.[name];
  if (!row?.usage) return esc(name);
  const bounds = row.recrues ? `Nouvelles recrues : de ${row.recrues[0]} à ${row.recrues[1]}.` : span;
  return `<span class="sheet-stat-name" tabindex="0">${esc(name)}<span class="sheet-stat-tip" role="tooltip"><strong>${esc(name)}</strong><em>${esc(row.usage)}</em>${bounds ? `<span>${esc(bounds)}</span>` : ""}</span></span>`;
}
// De la plus faible à la plus forte pénétration des armes (weapons.json).
function penetrationSpan() {
  const values = (game.referenceData?.weapons?.rows || []).flatMap(w =>
    ["puissance_tranchante_base", "puissance_perforante_base", "puissance_contondante_base"].map(k => Number(w[k]) || 0)).filter(v => v > 0);
  return values.length ? `Selon l’arme : de ${Math.min(...values)} à ${Math.max(...values)}.` : "";
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
    let item = itemIn(slot), extra = "", dealSlot = null;
    // Arme à deux mains : la main secondaire la tient aussi.
    if (!item && id === "weapon_set_1_off") {
      const main = itemIn(slotById("weapon_set_1_main"));
      if (main?.grip === "2 mains") { item = main; extra = "gear-tile--both-hands"; dealSlot = "weapon_set_1_main"; }
    }
    // Emplacement vide : une petite marque discrète, pour ne pas cacher le dessin.
    // Pas de nom sous les objets (Idan, 2026-10-25) : la carte d'objet le donne au survol.
    return `<span class="gear-spot gear-spot--${esc(id)}${item?"":" gear-spot--empty"}" style="left:${x}%;top:${y}%">${gearTile(slot,item,{extraClass:extra,dealSlot})}</span>`;
  }).join("");

  const weaponRow = slot => {
    const item = itemIn(slot);
    return `<div class="gear-row">${gearTile(slot,item)}<span class="gear-row-text"><small>${/_off$/.test(slot.id)?"Main secondaire":"Arme principale"}</small><strong>${item?esc(itemPublicName(item)):"—"}</strong>${item&&itemBaseName(item)?`<em>${esc(itemBaseName(item))}</em>`:""}</span></div>`;
  };
  const spare = group("weapons").filter(s => /^weapon_set_2_/.test(s.id));
  const tiles = name => group(name).map(slot => gearTile(slot,itemIn(slot))).join("");
  const mount = group("mount")[0];
  const mountItem = mount ? itemIn(mount) : null;
  // Inventaire (Idan, 2026-10-30) : ce qu'il possède sans le porter, gardé au dortoir ; « + » pour lui donner un objet
  // de l'Intendance. Échange des sets et réaménagement libres : deal-ui.js.
  const member = Boolean(game.campaign?.company.roster.includes(c));
  const worn = new Set(Object.values(slots).filter(Boolean));
  const inventory = (c.items || []).filter(item => !worn.has(item.id));
  const inventorySlot = {id:"inventory",label:"Inventaire"};

  return `<section class="gear">
    <div class="gear-side">
      ${renderDamageCard(c)}
      <section class="gear-card"><h4>Set de rechange${member?`<button type="button" class="gear-swap" data-swap-sets title="Échanger avec le set 1" aria-label="Échanger avec le set 1">⇄</button>`:""}</h4>${spare.map(weaponRow).join("")}</section>
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
      ${member?`<section class="gear-card gear-inventory"><h4>Inventaire</h4><div class="gear-tiles gear-tiles--inventory">${inventory.map(item => gearTile(inventorySlot,item)).join("")}<span class="gear-tile is-empty gear-tile--give" tabindex="0" data-slot="inventory" title="Donner un objet de l’Intendance">+</span></div></section>`:""}
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

// Fiche mercenaire en onglets. L'onglet choisi est conservé d'une fiche à l'autre. Ordre (Idan, 2026-10-30) :
// l'Équipement après les Caractéristiques, le Camp après la Magie.
const SHEET_TABS = [
  ["profile", "Profil"],
  ["stats", "Caractéristiques"],
  ["equipment", "Équipement"],
  ["skills", "Compétences"],
  ["magic", "Magie"],
  ["camp", "Camp"],
  ["history", "Historique"]
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

// Capitaine (Idan, 2026-10-24) : à la place du salaire, son aura au combat (captain.aura.*, combat-engine.js) :
// 35 % de son Courage + 25 % de son Charisme, équipement compris.
function captainAuraBox(c){
  const value=(code,fallback)=>{
    const v=Number((game.referenceData?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(v)?v:fallback;
  };
  const range=value("captain.aura.range_hex",10);
  const courage=value("captain.aura.courage_ratio",0.35),charisma=value("captain.aura.charisma_ratio",0.25);
  const bonus=combatEngine().captainAuraBonus({character:c,activeSet:1});
  return `<div class="sheet-pay sheet-pay--captain"><span><small>Aura du capitaine</small><em>Sur le champ de bataille, ses alliés à ${fmt(range)} cases ou moins gagnent ${fmt(courage*100)}&nbsp;% de son Courage et ${fmt(charisma*100)}&nbsp;% de son Charisme, équipement compris.</em></span><strong>+${fmt(bonus)} Courage</strong></div>`;
}

// Onglet Profil (Idan, 2026-10-21) : portrait et état ; pictos et phrases d'origine et d'ascendance ;
// puis trois colonnes de largeurs différentes : la roue d'alignement sur toute la hauteur, et à côté
// réputation et affinité, la biographie, le salaire journalier et la prime de mission (l'aura pour le capitaine).
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
// Évaluation (Idan, 2026-10-31) : au-dessus du portrait, un titre qui dit à quoi il sert, puis ce qui ressort en étoiles
// de réputation — ses points forts, ses points faibles, une gêne d'équipement. Recalculée avec l'équipement porté
// (game-core/mercenary-profile.js).
function profileRules(){
  if(typeof MercenairesProfile==="undefined"||!game.referenceData?.mercenaryProfile) return null;
  return game.profileRules||(game.profileRules=MercenairesProfile.createProfileRules({reference:game.referenceData,engine:combatEngine(),
    magic:typeof magicRules==="function"?magicRules():null}));
}
// Titres (Idan, 2026-10-31) : 1 à 3 titres, chacun avec ses étoiles en dessous, ou « Chair à canon ». Pour l'instant,
// le nom brut de la catégorie et de sa sous-catégorie (« DPS au CAC · Perce-armure ») : les vrais titres viendront après.
function renderEvaluation(c){
  const result=profileRules()?.evaluate(c);
  if(!result) return "";
  const items=result.cannonFodder?[`<div class="sheet-eval-item"><h3 class="sheet-eval-title">Chair à canon</h3></div>`]
    :result.titles.map(t=>`<div class="sheet-eval-item"><h3 class="sheet-eval-title">${esc(t.label)}</h3>${renderStarLevel(starRules().byLevel(t.level))}</div>`);
  return `<section class="sheet-evaluation" aria-label="Titres">${items.join("")}</section>`;
}
function renderProfileTab(c){
  const captain=game.campaign?.company.captainId===c.id;
  const status=rosterStatus(c);
  const pictos=renderPicto("people",c.people,{size:"md"})+(c.culture?renderPicto("culture",c.culture,{size:"md"}):"")+(c.ascendance?renderPicto("ascendance",c.ascendance,{size:"md"}):"");
  const stars=starRules().personal(c.reputation);
  const alignments=typeof alignmentNames==="function"?alignmentNames():[];
  const affinity=renderCaptainAffinity(c);
  const salary=c.contract?.dailySalary??c.salary??0;
  const bonus=c.contract?.missionBonus??tavernRules().missionBonusDemand(c);
  return `<section class="sheet-profile">
    <aside class="sheet-portrait">
      ${renderEvaluation(c)}${renderAvatar(c,{variant:"detail",kind:"full"})}
      <em class="roster-status roster-status--${status.kind}">${esc(status.label)}</em>
    </aside>
    <div class="sheet-profile-main">
      <div class="sheet-origins">
        <div class="sheet-pictos" aria-label="${esc([c.people,c.culture,c.ascendance].filter(Boolean).join(", "))}">${pictos}</div>
        <div class="sheet-origin-text">
          <p>${esc(profileOriginLine(c,captain))}</p>
          ${c.ascendance?`<p>${esc(profileAncestryLine(c))}</p>`:""}
        </div>
      </div>
      <section class="sheet-column sheet-column--alignment"><small>Alignement</small>${alignments.length?renderAlignmentWheel(alignments,c.alignment,{interactive:false}):""}<strong>${esc(c.alignment||"—")}</strong></section>
      <section class="sheet-column sheet-column--reputation"><small>Réputation</small>${renderReputationStars(c)}<p>${esc(stars?variantPhrase([stars.phrase,...stars.variants],phraseSeed(c,"reputation",stars.level)):"")}</p></section>
      <section class="sheet-column sheet-column--affinity">${affinity||`<small>Affinité</small><p>${captain?"Capitaine de la compagnie.":"Hors de la compagnie."}</p>`}</section>
      <div class="sheet-bio">${renderBiography(c)}</div>
      ${captain
        ?captainAuraBox(c)
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
  "Protection contre le tranchant":'<path d="M5 19 18 6M15 5l4 4M5 19l1-4 3 3z"/>',
  "Protection contre le perforant":'<path d="M4 20 19 5M14 4h6v6M4 20l1.5-4.5 3 3z"/>',
  "Protection contre le contondant":'<path d="M13 4l7 7-3 3-7-7zM11.5 9.5 4 17l3 3 7.5-7.5"/>',
  "Résistance physique":'<path d="M12 3 5 6v5c0 4.6 3 8.2 7 10 4-1.8 7-5.4 7-10V6z"/>',
  "Résistance au feu":'<path d="M12 3c1 3 5.5 5.2 5.5 10.2a5.5 5.5 0 0 1-11 0c0-3 2-4.2 2-6.4 1.6 1 2.2 2.2 2.2 3.3 0-3 1.3-5.1 1.3-7.1z"/>',
  "Résistance au froid":'<path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8M9.2 4l2.8 2 2.8-2M9.2 20l2.8-2 2.8 2"/>',
  "Résistance à la foudre":'<path d="M13.5 2.5 5 13.5h6l-1 8 8.5-11h-6z"/>',
  "Résistance au poison":'<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/><path d="M9.8 14.2h.01M14.2 14.2h.01" stroke-width="2.6"/>',
  "Régénération":'<path d="M12 8v8M8 12h8"/><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4v3.2h-3.2"/>',
  "Puissance magique":'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/><circle cx="12" cy="12" r="2.2"/>',
  "Réserve de mana":'<path d="M9.5 3h5M10.5 3v5.2L6 15.5a4 4 0 0 0 3.4 5.5h5.2a4 4 0 0 0 3.4-5.5l-4.5-7.3V3"/><path d="M7.5 15h9"/>',
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
// Règles des sorts (doc 12) : maîtrise, effets, mana, réussite, recharge au camp.
function magicRules(){
  return game.magicRules || (game.magicRules = MercenairesMagic.createMagicRules({reference:game.referenceData,combat:combatEngine()}));
}
function equipmentEffectRules(){
  return game.equipmentEffects || (game.equipmentEffects = MercenairesEquipmentEffects.createEquipmentEffects({engine:combatEngine()}));
}
// Valeur propre d'une ligne de l'onglet, sans l'équipement (Taverne, comparaison avec la compagnie).
function sheetStatValue(m,name){
  // PV max sans l'équipement, avec la Constitution gagnée en mission (Idan, 2026-10-25).
  if(name==="Points de vie") return m?.stats ? equipmentEffectRules().effects(m)["Points de vie"].base : Number(m?.pvMax);
  if(name==="Initiative") return m?.stats ? Math.round(equipmentEffectRules().effects(m).Initiative.base) : NaN;
  if(m?.resistances && name in m.resistances) return Number(m.resistances[name]);
  // Régénération (physiologie) et Intimidation (social) : rangées dans les caractéristiques (Idan, 2026-10-21).
  for(const group of ["physiology","social"]) if(m?.skills?.[group] && name in m.skills[group]) return Number(m.skills[group][name]);
  return Number(m?.stats?.[name]);
}
// Valeur avec l'équipement (Idan, 2026-10-24) : Vitesse, Esquive, Initiative et Dextérité au combat.
function sheetEquippedValue(m,name){
  const effect=m?.stats?equipmentEffectRules().effects(m)[name]:null;
  return effect?Math.round(effect.value):sheetStatValue(m,name);
}
// Détail au survol : valeur de base, ce que chaque objet retire ou ajoute, valeur au combat.
// total : « Au combat » pour les valeurs que le combat lit, « Total » pour la magie, la Discrétion, les Pièges et le
// Charisme (pas encore joués au combat).
function equipmentDetail(effect,total="Au combat"){
  if(!effect?.lines.length) return "";
  const note={weight:"poids, réduit par la maîtrise",armor:"handicap de l’armure",armorElement:"protection de l’armure",helmet:"poids du casque",speed:"avec l’équipement",dual:"une arme dans chaque main"};
  const line=l=>{
    const delta=Math.round(l.delta);
    return `<span class="sheet-gear-line"><span>${esc(l.label)}<small>${esc(l.reason==="gear"?(l.points!=null?`+${l.points} points`:`${l.percent<0?"−":"+"}${Math.abs(l.percent)} % de la valeur de base`):note[l.reason]||"")}${l.twoHands?" · à deux mains ÷2":""}</small></span><b class="${delta<0?"is-malus":delta>0?"is-bonus":""}">${delta>0?"+":""}${fmt(delta)}</b></span>`;
  };
  return `<span class="sheet-gear-detail">
    <span class="sheet-stat-pop-title">Avec l’équipement</span>
    <span class="sheet-gear-line"><span>Valeur de base</span><b>${fmt(Math.round(effect.base))}</b></span>
    ${effect.lines.map(line).join("")}
    <span class="sheet-gear-line sheet-gear-line--total"><span>${esc(total)}</span><b>${fmt(Math.round(effect.value))}</b></span>
  </span>`;
}
// Infobulle d'une caractéristique (Idan, 2026-10-30) : à quoi elle sert en jeu, pas sa définition ; rien sans texte.
function statTip(row){
  if(!row?.usage) return "";
  return `<span class="sheet-stat-tip" role="tooltip"><strong>${esc(row.nom)}</strong><em>${esc(row.usage)}</em></span>`;
}
function statPortraitButton(member,label,value,current){
  const url=typeof mercenaryAvatarUrl==="function"?mercenaryAvatarUrl(member,"portrait"):null;
  // Pas de chargement différé : la bulle est cachée jusqu'au survol, le portrait doit y être déjà.
  const face=url?`<img src="${esc(url)}" alt="">`:`<span class="sheet-stat-face">${esc(avatarInitials(member))}</span>`;
  return `<button type="button" class="sheet-stat-who${member===current?" is-self":""}" data-sheet-open="${esc(member.id)}" title="Ouvrir la fiche de ${esc(member.name)}">
    ${face}<span><small>${label}</small><b>${fmt(value)}</b><em>${esc(member.name)}</em></span></button>`;
}
// Onglet Caractéristiques (Idan, 2026-10-25) : le détail est grand et lisible, sur toute la largeur des trois colonnes,
// avec le nom et la valeur en tête (placement : placeStatPopover).
function statPopover(c,name,value,lead=""){
  const head=`<span class="sheet-stat-pop-head"><strong>${esc(name)}</strong><b>${fmt(value)}</b></span>`;
  return comparePopover(c,value,m=>lead?sheetEquippedValue(m,name):sheetStatValue(m,name),lead,head);
}
function comparePopover(c,value,accessor,lead="",head=""){
  const data=comparisonData(value,accessor);
  if(!data) return "";
  const p=data.positions;
  const dot=(key,pos,title)=>`<i class="compare-dot ${key}" style="left:${pos}%" title="${esc(title)}"></i>`;
  return `<span class="sheet-stat-pop" role="tooltip">${head}${lead}<span class="sheet-stat-compare">
    <span class="sheet-stat-pop-title">Dans la compagnie</span>
    <span class="compare-track"><span class="compare-line"></span>${dot("min",p.min,"Min "+fmt(data.min))}${dot("median",p.median,"Médiane "+fmt(data.median))}${dot("avg",p.avg,"Moyenne "+fmt(data.avg))}${dot("max",p.max,"Max "+fmt(data.max))}${dot("current",p.current,esc(c.name)+" "+fmt(value))}</span>
    <span class="sheet-stat-pop-mid"><span><i class="compare-dot median"></i>Médiane <b>${fmt(data.median)}</b></span><span><i class="compare-dot avg"></i>Moyenne <b>${fmt(data.avg)}</b></span></span>
    <span class="sheet-stat-pop-ends">${statPortraitButton(data.minMember,"Min",data.min,c)}${statPortraitButton(data.maxMember,"Max",data.max,c)}</span>
  </span></span>`;
}
// Le grand détail de l'onglet Caractéristiques : sous la ligne survolée, ou au-dessus pour les lignes du bas, de la
// première à la dernière colonne de caractéristiques.
function placeStatPopover(value){
  const grid=value.closest(".sheet-stats"),pop=value.querySelector(".sheet-stat-pop"),row=value.closest(".sheet-stat");
  if(!grid||!pop||!row) return;
  const box=grid.getBoundingClientRect(),line=row.getBoundingClientRect(),first=grid.querySelector(".sheet-stat-group")?.getBoundingClientRect();
  pop.style.left=((first?first.left:box.left)-box.left)+"px";
  const below=line.top-box.top<box.height/2;
  pop.style.top=below?(line.bottom-box.top+6)+"px":"auto";
  pop.style.bottom=below?"auto":(box.bottom-line.top+6)+"px";
  pop.classList.toggle("is-above",!below);
}
// Onglet Caractéristiques rangé par fonction (Idan, 2026-10-31) : Attaque et Défense ; Vitesse, Magie, Moral et
// commandement ; Protection de l'armure et Résistances (character-sheet-copy.json, stats_layout). Chaque valeur compte
// l'équipement porté, en vert si elle monte, en rouge si elle baisse.
const ARMOR_PROTECTIONS={"Protection contre le tranchant":"tranchant","Protection contre le perforant":"perforant","Protection contre le contondant":"contondant"};
function armorProtection(m,stat){
  return Math.round(combatEngine().effectiveArmorResistance({character:m,activeSet:1},ARMOR_PROTECTIONS[stat]));
}
function renderStatsTab(c){
  const copy=game.referenceData?.characterSheetCopy||{};
  const rows=[...(copy.stats||[]),...(copy.protections||[])];
  const layout=copy.stats_layout?.colonnes||[];
  const status=rosterStatus(c);
  const effects=c.stats?equipmentEffectRules().effects(c):{};
  const label=(name,code)=>code==="resistance"?name.replace(/^Résistance (au |à la |aux )?/,"").replace(/^./,ch=>ch.toUpperCase())
    :code==="protection"?name.replace(/^Protection contre le /,"").replace(/^./,ch=>ch.toUpperCase()):name;
  const line=(name,code)=>{
    const row=rows.find(r=>r.nom===name);
    // Une caractéristique sans effet en jeu (pas de texte d'usage) ne s'affiche pas.
    if(!row?.usage) return "";
    if(ARMOR_PROTECTIONS[name]){
      const value=armorProtection(c,name);
      return `<div class="sheet-stat sheet-stat--${esc(pictoSlug(name))}">
      ${statIcon(name)}
      <span class="sheet-stat-name" tabindex="0">${esc(label(name,code))}${statTip(row)}</span>
      <span class="sheet-stat-value${value<0?" is-malus":""}" tabindex="0">${fmt(value)}${comparePopover(c,value,m=>armorProtection(m,name))}</span>
    </div>`;
    }
    const effect=effects[name],value=effect?Math.round(effect.value):sheetStatValue(c,name);
    if(!Number.isFinite(value)) return "";
    const shift=effect?Math.sign(value-Math.round(effect.base)):0;
    // Le Charisme ne joue pas encore au combat : « Total ». La Constitution y joue par les PV max (Idan, 2026-10-25).
    const lead=equipmentDetail(effect,name==="Charisme"?"Total":"Au combat");
    return `<div class="sheet-stat sheet-stat--${esc(pictoSlug(name))}">
      ${statIcon(name)}
      <span class="sheet-stat-name" tabindex="0">${esc(label(name,code))}${statTip(row)}</span>
      <span class="sheet-stat-value${shift<0?" is-malus":shift>0?" is-bonus":""}" tabindex="0">${fmt(value)}${statPopover(c,name,value,lead)}</span>
    </div>`;
  };
  const group=g=>`<section class="sheet-stat-group sheet-stat-group--${esc(g.code)}"><h4>${esc(g.titre)}</h4>${g.stats.map(name=>line(name,g.code)).join("")}</section>`;
  return `<section class="sheet-stats">
    <aside class="sheet-portrait">
      ${renderEvaluation(c)}${renderAvatar(c,{variant:"detail",kind:"full"})}
      <em class="roster-status roster-status--${status.kind}">${esc(status.label)}</em>
    </aside>
    ${layout.map(column=>`<div class="sheet-stat-column">${column.map(group).join("")}</div>`).join("")}
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
// Cape de discrétion et gants de pièges (Idan, 2026-10-24) : ces compétences montrent la valeur avec l'équipement, en
// vert, et son détail.
// Chapeau du dresseur (Idan, 2026-10-25) : de même pour le Compagnon animal.
const SKILLS_WITH_GEAR=new Set(["Discrétion","Pièges","Compagnon animal"]);
function skillValueCell(c,group,name){
  const effect=["martial","animal"].includes(group)&&SKILLS_WITH_GEAR.has(name)&&c.stats?equipmentEffectRules().effects(c)[name]:null;
  if(effect){
    const value=Math.round(effect.value),shift=Math.sign(value-Math.round(effect.base));
    return `<span class="sheet-stat-value${shift<0?" is-malus":shift>0?" is-bonus":""}" tabindex="0">${fmt(value)}${comparePopover(c,value,m=>sheetEquippedValue(m,name),equipmentDetail(effect,"Total"))}</span>`;
  }
  const value=skillValue(c,group,name);
  return `<span class="sheet-stat-value" tabindex="0">${fmt(value)}${comparePopover(c,value,m=>skillValue(m,group,name))}</span>`;
}
// Infobulle d'une compétence (Idan, 2026-10-30) : à quoi elle sert en jeu (character-sheet-copy.json, skills_usage),
// jamais sa définition ; une compétence qui ne joue pas encore n'en a pas.
function skillUsage(name){
  return game.referenceData?.characterSheetCopy?.skills_usage?.[name]||"";
}
function skillName(name){
  const usage=skillUsage(name);
  return `<span class="sheet-stat-name"${usage?' tabindex="0"':""}>${esc(name)}${usage?`<span class="sheet-stat-tip" role="tooltip"><strong>${esc(name)}</strong><em>${esc(usage)}</em></span>`:""}</span>`;
}
// Le niveau d'une compétence en fond de sa ligne, pour lire la fiche d'un coup d'œil (0 à 100).
function skillLevelStyle(value){
  const v=Math.max(0,Math.min(100,Number(value)||0));
  return ` style="--skill-level:${v}%"`;
}
function skillChildRows(c,group,name){
  return skillChildren(name).map(n=>({n,v:skillValue(c,group,n)})).filter(x=>Number.isFinite(x.v)).sort((a,b)=>b.v-a.v);
}
// Une compétence ; une catégorie qui a des armes (ou des animaux) ouvre sa fenêtre par-dessus l'onglet (Idan,
// 2026-10-30 : plus d'accordéon, jamais de barre de défilement).
function skillLine(c,group,name){
  const value=skillValue(c,group,name);
  if(!skillChildRows(c,group,name).length) return `<div class="sheet-skill"${skillLevelStyle(value)}>${skillName(name)}${skillValueCell(c,group,name)}</div>`;
  return `<div class="sheet-skill sheet-skill--open" role="button" tabindex="0" data-skill-open="${esc(name)}" data-skill-group="${esc(group)}"${skillLevelStyle(value)}>
    ${skillName(name)}<span class="sheet-skill-more" aria-hidden="true">›</span>${skillValueCell(c,group,name)}</div>`;
}
// La fenêtre d'une catégorie : sa valeur, à quoi elle sert, puis ses armes (ou animaux), les meilleures d'abord.
function skillOverlay(c,group,name){
  const rows=skillChildRows(c,group,name);
  const usage=skillUsage(name);
  return `<div class="sheet-skill-overlay">
    <section class="sheet-skill-window" role="dialog" aria-label="${esc(name)}">
      <header><h4>${esc(name)}</h4><b>${fmt(skillValue(c,group,name))}</b><button type="button" class="sheet-skill-close" aria-label="Fermer">×</button></header>
      ${usage?`<p>${esc(usage)}</p>`:""}
      <div class="sheet-skill-window-list">${rows.map(x=>`<div class="sheet-skill"${skillLevelStyle(x.v)}>${skillName(x.n)}${skillValueCell(c,group,x.n)}</div>`).join("")}</div>
    </section>
  </div>`;
}
function skillRows(c,names,group="martial"){
  return names.filter(n=>Number.isFinite(skillValue(c,group,n)))
    .sort((a,b)=>skillValue(c,group,b)-skillValue(c,group,a)).map(n=>skillLine(c,group,n)).join("");
}
function skillColumn(c,title,names){
  return `<section class="sheet-skill-column"><h4>${title}</h4>${skillRows(c,names)}</section>`;
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
  const yes=name=>c.skills?.martial?.[name]===true||c.skills?.physiology?.[name]===true;
  const armors=layout.armures.map(a=>`<span class="sheet-armor ${yes(a.nom)?"is-yes":"is-no"}" title="${esc(a.nom)} : ${yes(a.nom)?"oui":"non"}">${statIcon(a.nom)}${esc(a.label)}</span>`).join("");
  const aptitudes=layout.aptitudes.filter(yes).map(n=>`<span class="sheet-armor is-yes">${esc(n)}</span>`).join("");
  return `<section class="sheet-skills">
    <aside class="sheet-portrait">
      ${renderEvaluation(c)}${renderAvatar(c,{variant:"detail",kind:"full"})}
      <em class="roster-status roster-status--${status.kind}">${esc(status.label)}</em>
    </aside>
    <div class="sheet-skills-main">
      <div class="sheet-predilections">
        ${predilectionCard("Arme de prédilection",melee?.weapon,melee?.category)}
        ${predilectionCard("Style de combat",style?.n,style?fmt(style.v):"")}
        ${predilectionCard("Arme de tir",ranged?.weapon,ranged?.category)}
      </div>
      <!-- Trois colonnes, sans rien en dessous (Idan, 2026-10-30) : Discrétion sous le style de combat, monture et
           armures sous le tir. -->
      <div class="sheet-skill-columns">
        ${skillColumn(c,"Corps à corps",layout.corps_a_corps)}
        <section class="sheet-skill-column"><h4>Style de combat</h4>${skillRows(c,layout.style)}
          <h4>Discrétion et pièges</h4>${skillRows(c,layout.discretion_et_pieges)}</section>
        <section class="sheet-skill-column"><h4>Tir</h4>${skillRows(c,layout.tir)}
          <h4>Monture ou compagnon</h4>${skillLine(c,"animal",layout.animal)}
          <h4>Armures</h4><div class="sheet-armors">${armors}</div>
          ${aptitudes?`<h4>Aptitudes</h4><div class="sheet-armors">${aptitudes}</div>`:""}</section>
      </div>
      <div class="sheet-skill-overlay-host" id="sheet-skill-overlay-host"></div>
    </div>
  </section>`;
}

// Onglet Camp (Idan, 2026-10-24) : les compétences de camp (Transmission du savoir, Intendance, Médecine) et
// l'Artisanat avec ses métiers, du meilleur au moins bon.
const CAMP_SKILLS=["Transmission du savoir","Intendance","Médecine"];
function renderCampTab(c){
  const status=rosterStatus(c);
  const rated=(group,names)=>names.map(n=>({n,v:skillValue(c,group,n)})).filter(x=>Number.isFinite(x.v)).sort((a,b)=>b.v-a.v);
  const camp=rated("camp",[...CAMP_SKILLS,"Artisanat"]);
  const crafts=rated("craft",skillChildren("Artisanat"));
  const line=(group,x,child=false)=>`<div class="sheet-skill${child?" sheet-skill--child":""}"${skillLevelStyle(x.v)}>${skillName(x.n)}${skillValueCell(c,group,x.n)}</div>`;
  const craft=rated("camp",["Artisanat"])[0];
  return `<section class="sheet-skills sheet-camp">
    <aside class="sheet-portrait">
      ${renderEvaluation(c)}${renderAvatar(c,{variant:"detail",kind:"full"})}
      <em class="roster-status roster-status--${status.kind}">${esc(status.label)}</em>
    </aside>
    <div class="sheet-skills-main">
      <div class="sheet-predilections">
        ${predilectionCard("Point fort au camp",camp[0]?.n,camp[0]?fmt(camp[0].v):"")}
        ${predilectionCard("Meilleur métier",crafts[0]?.n,crafts[0]?fmt(crafts[0].v):"")}
      </div>
      <div class="sheet-skill-columns sheet-camp-columns">
        <section class="sheet-skill-column"><h4>Camp</h4>${rated("camp",CAMP_SKILLS).map(x=>line("camp",x)).join("")}</section>
        <!-- Artisanat (Idan, 2026-10-30) : la valeur globale en tête, ses métiers en dessous, comme des spécialités. -->
        <section class="sheet-skill-column sheet-craft">
          <h4>Artisanat${craft?`<b>${fmt(craft.v)}</b>`:""}</h4>
          <div class="sheet-craft-list"><small>Métiers</small>${crafts.map(x=>line("craft",x,true)).join("")}</div>
        </section>
      </div>
    </div>
  </section>`;
}

// Onglet Historique (Idan, 2026-10-24) : compteurs cumulés et journal du mercenaire, du plus récent au plus ancien
// (game-core/history.js ; textes : character-sheet-copy.json, history).
// Nom public de l'objet, jamais le tier (Idan, 2026-10-30).
function historyItemLabel(item){
  if(!item) return "";
  return (typeof itemCardRules==="function"?itemCardRules()?.title(item):null)||item.name;
}
function historyPlural(n,one,many){ return `${fmt(n)} ${n>1?many:one}`; }
function historyEntryText(c,entry){
  const copy=game.referenceData?.characterSheetCopy?.history?.events||{};
  const female=String(c?.sex||"").trim().toLowerCase().startsWith("f");
  const fill=(text,vars={})=>MercenairesRecruitDialogue.fill(text,vars,female);
  if(entry.kind==="founded") return fill(copy.founded);
  if(entry.kind==="joined") return fill(entry.initial?copy.joined_initial:copy.joined);
  if(entry.kind==="mission"){
    const back=entry.knockouts?fill(copy.mission_knockouts,{n:historyPlural(entry.knockouts,"adversaire","adversaires")}):fill(copy.mission);
    return entry.wounded?`${back} ${fill(copy.mission_wounded,{jours:historyPlural(entry.days,"jour","jours")})}`:back;
  }
  if(entry.kind==="steward") return fill(copy.steward?.[entry.accepted?"accord":"refus"]);
  if(entry.kind==="recall") return fill(copy.recall?.[entry.accepted?"accord":"refus"],{jours:historyPlural(entry.days||0,"jour","jours")});
  if(entry.kind==="lieutenant") return fill(copy.lieutenant?.[entry.accepted?"accord":"refus"],{salaire:fmt(entry.salary||0)});
  if(entry.kind==="bodyguard") return fill(copy.bodyguard?.[entry.issue],{client:String(entry.client||"").toLocaleLowerCase("fr")});
  if(entry.kind==="lieutenant_request") return fill(copy.lieutenant_request?.[entry.type],{lieutenant:entry.lieutenant||"",gain:fmt(entry.gain||0)});
  if(entry.kind==="deal"){
    const vars={recu:historyItemLabel(entry.received),cede:historyItemLabel(entry.given)};
    const text=entry.free?copy.deal?.libre?.[entry.action]:copy.deal?.[entry.action]?.[entry.accepted?"accord":"refus"];
    return fill(text,vars);
  }
  return "";
}
function historyDate(day){
  try{ return `Jour ${fmt(day)} · ${campaignCalendarDate(day,game.referenceData).dateLabel}`; }
  catch{ return `Jour ${fmt(day)}`; }
}
function renderHistoryTab(c){
  const copy=game.referenceData?.characterSheetCopy?.history||{};
  const history=c.history||{};
  const values={...history,days:MercenairesHistory.daysInCompany(c,game.campaign?.day),
    stewardDays:typeof stewardRules==="function"&&game.campaign?stewardRules().totalStewardDays(game.campaign,c):Number(history.stewardDays)||0};
  const counters=(copy.counters||[]).filter(k=>!k.hideZero||Number(values[k.key])>0).map(k=>`<div class="sheet-history-counter"><strong>${fmt(Number(values[k.key])||0)}</strong><small>${esc(k.label)}</small></div>`).join("");
  const entries=[...(history.log||[])].map((entry,index)=>({entry,index})).sort((a,b)=>b.entry.day-a.entry.day||b.index-a.index)
    .map(({entry})=>({entry,text:historyEntryText(c,entry)})).filter(x=>x.text);
  return `<section class="sheet-history">
    <div class="sheet-history-counters">${counters}</div>
    <section class="sheet-history-journal">
      <h4>Journal</h4>
      ${entries.length?`<ol>${entries.map(({entry,text})=>`<li><time>${esc(historyDate(entry.day))}</time><span>${esc(text)}</span></li>`).join("")}</ol>`
        :`<p class="muted">${esc(copy.empty||"")}</p>`}
    </section>
  </section>`;
}

// Onglet Magie (Idan, 2026-10-21, provisoire) : puissance magique et réserve de mana ; les trois écoles de
// prédilection ; la roue des neuf écoles, dont la surface montre les points du mercenaire et dont l'étoile
// relie chaque école à ses deux opposées (skills.json, ecoles_opposees) ; le grimoire viendra plus tard.
const SCHOOL_ICONS={
  "Feu":'<path d="M12 3c1 3 5.5 5.2 5.5 10.2a5.5 5.5 0 0 1-11 0c0-3 2-4.2 2-6.4 1.6 1 2.2 2.2 2.2 3.3 0-3 1.3-5.1 1.3-7.1z"/>',
  "Eau":'<path d="M3 9.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  "Foudre":'<path d="M13.5 2.5 5 13.5h6l-1 8 8.5-11h-6z"/>',
  "Vie":'<path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14z"/><path d="m5 19 8-8"/>',
  "Nécromancie":'<path d="M5 10.5a7 7 0 0 1 14 0v3l-2 2V19H7v-3.5l-2-2z"/><path d="M9.3 11.5h.01M14.7 11.5h.01" stroke-width="2.8"/><path d="M10.5 19v-2M13.5 19v-2"/>',
  "Illusion":'<path d="M12 4a8 8 0 1 0 8 8 5 5 0 1 0-5 5 2.6 2.6 0 1 0-2.6-2.6"/>',
  "Invocation":'<circle cx="12" cy="12" r="8.5"/><path d="M12 4.5 16.4 17 5.5 9.2h13L7.6 17z"/>',
  "Transmutation":'<path d="M12 4 20 18H4z"/><path d="M8 13h8"/>',
  "Télékinésie":'<circle cx="12" cy="9.5" r="3.2"/><path d="M5 20c1.6-3 4-4.5 7-4.5s5.4 1.5 7 4.5M6.5 6 4.5 4.5M17.5 6l2-1.5M12 3V1.5"/>'
};
function schoolIcon(name){
  return `<svg class="school-icon school-icon--${esc(pictoSlug(name))}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${SCHOOL_ICONS[name]||""}</svg>`;
}
function magicSchools(){
  return (game.referenceData?.skills?.rows||[]).filter(r=>r.domaine==="Magie"&&r.niveau==="Catégorie");
}
function schoolOpposites(row){
  return String(row?.ecoles_opposees||"").split(",").map(x=>x.trim()).filter(Boolean);
}
// Les oppositions forment une boucle (chaque école en a deux) : on la parcourt, puis on pose chaque école
// (n − 1) / 2 crans après la précédente ; ses deux opposées se retrouvent alors en face d'elle.
function magicWheelOrder(rows){
  const names=rows.map(r=>r.nom), n=names.length;
  const opposites=new Map(rows.map(r=>[r.nom,schoolOpposites(r)]));
  const cycle=[names[0]];
  while(cycle.length<n){
    const next=(opposites.get(cycle[cycle.length-1])||[]).find(x=>names.includes(x)&&!cycle.includes(x));
    if(!next) return names;
    cycle.push(next);
  }
  const step=Math.floor(n/2);
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  if(n%2===0||gcd(step,n)!==1||!(opposites.get(cycle[n-1])||[]).includes(cycle[0])) return names;
  const order=new Array(n);
  cycle.forEach((name,k)=>{order[(k*step)%n]=name;});
  return order;
}
// valueOf : maîtrise d'une école, avec les bagues (Idan, 2026-10-24) ; sans elle, la maîtrise sauvegardée.
// Écoles où le mercenaire connaît au moins un sort (Idan, 2026-10-30 : les autres sont grisées, sinon c'est trompeur).
function knownSchools(c){
  const rows=game.referenceData?.spells?.rows||[];
  return new Set((Array.isArray(c?.spells)?c.spells:[]).map(s=>rows.find(r=>r.code===s.code||r.nom===(s.name||s.nom))?.ecole||s.school).filter(Boolean));
}
function renderMagicWheel(c,valueOf=name=>Number(c.skills?.magic?.[name])){
  const known=knownSchools(c);
  const rows=magicSchools();
  const order=magicWheelOrder(rows);
  const n=order.length;
  if(!n) return "";
  const cx=210,cy=200,R=130;
  const angle=i=>-Math.PI/2+2*Math.PI*i/n;
  const pt=(i,r)=>[cx+r*Math.cos(angle(i)),cy+r*Math.sin(angle(i))];
  const poly=pts=>pts.map(p=>p.map(v=>v.toFixed(1)).join(",")).join(" ");
  const value=name=>Math.max(0,Math.min(100,Number(valueOf(name))||0));
  const shown=name=>fmt(Math.round(Number(valueOf(name))));
  const index=new Map(order.map((name,i)=>[name,i]));
  const rings=[25,50,75,100].map(v=>`<polygon class="magic-ring${v===100?" magic-ring--outer":""}" points="${poly(order.map((_,i)=>pt(i,R*v/100)))}"/>`).join("");
  const axes=order.map((_,i)=>{const [x,y]=pt(i,R);return `<line class="magic-axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;}).join("");
  const seen=new Set();
  const star=rows.flatMap(r=>schoolOpposites(r).map(o=>[r.nom,o])).filter(([a,b])=>index.has(a)&&index.has(b)&&!seen.has([a,b].sort().join("|"))&&seen.add([a,b].sort().join("|")))
    .map(([a,b])=>{const [x1,y1]=pt(index.get(a),R),[x2,y2]=pt(index.get(b),R);return `<line class="magic-opposition" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;}).join("");
  const area=`<polygon class="magic-area" points="${poly(order.map((name,i)=>pt(i,R*value(name)/100)))}"/>`;
  const dots=order.map((name,i)=>{const [x,y]=pt(i,R*value(name)/100);return `<circle class="magic-dot school--${esc(pictoSlug(name))}${known.has(name)?"":" is-unknown"}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>`;}).join("");
  const labels=order.map((name,i)=>{
    const [x,y]=pt(i,R+38);
    const row=rows.find(r=>r.nom===name);
    const tip=`${name} : ${shown(name)}. Opposée à ${schoolOpposites(row).join(" et ")}.`;
    return `<g class="magic-label school--${esc(pictoSlug(name))}${known.has(name)?"":" is-unknown"}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><title>${esc(tip)}</title>
      <g class="magic-label-icon" transform="translate(-11,-28) scale(.92)" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${SCHOOL_ICONS[name]||""}</g>
      <text y="9" text-anchor="middle">${esc(name)}</text><text class="magic-label-value" y="24" text-anchor="middle">${shown(name)}</text></g>`;
  }).join("");
  return `<svg class="magic-wheel" viewBox="0 0 420 410" role="img" aria-label="Écoles de magie : points et oppositions">${rings}${axes}${star}${area}${dots}${labels}</svg>`;
}
function renderMagicTab(c) {
  const status=rosterStatus(c);
  // Ceinture de mana, amulette de puissance magique et bagues (Idan, 2026-10-24) : valeur avec l'équipement, en vert
  // (en rouge pour une école opposée à une bague), comme dans l'onglet Caractéristiques.
  const effects=c.stats?equipmentEffectRules().effects(c):{};
  const schoolValue=name=>effects[name]?effects[name].value:Number(c.skills?.magic?.[name]);
  const top=magicSchools().map(r=>({name:r.nom,value:schoolValue(r.nom)})).filter(x=>Number.isFinite(x.value)).sort((a,b)=>b.value-a.value).slice(0,3);
  const shift=name=>{const e=effects[name];return e?Math.sign(Math.round(e.value)-Math.round(e.base)):0;};
  const known=knownSchools(c);
  const stat=name=>{
    const row=(game.referenceData?.characterSheetCopy?.stats||[]).find(r=>r.nom===name)||{nom:name,usage:""};
    const effect=effects[name],value=effect?Math.round(effect.value):sheetStatValue(c,name);
    const shift=effect?Math.sign(value-Math.round(effect.base)):0;
    return `<div class="sheet-stat magic-stat">${statIcon(name)}<span class="sheet-stat-name" tabindex="0">${esc(name)}${statTip(row)}</span><span class="sheet-stat-value${shift<0?" is-malus":shift>0?" is-bonus":""}" tabindex="0">${fmt(value)}${statPopover(c,name,value,equipmentDetail(effect,"Total"))}</span></div>`;
  };
  return `<section class="sheet-magic">
    <aside class="sheet-portrait">
      ${renderEvaluation(c)}${renderAvatar(c,{variant:"detail",kind:"full"})}
      <em class="roster-status roster-status--${status.kind}">${esc(status.label)}</em>
    </aside>
    <div class="sheet-magic-main">
      <div class="magic-stats">${stat("Puissance magique")}${stat("Réserve de mana")}</div>
      <div class="magic-favorites">${top.map((x,i)=>`<div class="magic-favorite school--${esc(pictoSlug(x.name))}${known.has(x.name)?"":" is-unknown"}">${schoolIcon(x.name)}<span class="magic-favorite-name"><small>École n° ${i+1}</small><strong>${esc(x.name)}</strong></span><span class="sheet-stat-value${shift(x.name)<0?" is-malus":shift(x.name)>0?" is-bonus":""}" tabindex="0">${fmt(Math.round(x.value))}${comparePopover(c,Math.round(x.value),m=>sheetEquippedValue(m,x.name),equipmentDetail(effects[x.name],"Total"))}</span></div>`).join("")}</div>
      <div class="magic-bottom">
        <section class="magic-wheel-card"><h4>Écoles de magie</h4>${renderMagicWheel(c,schoolValue)}<p>Chaque école s’oppose aux deux écoles d’en face.</p></section>
        ${renderCharacterSpellbook(c)}
      </div>
    </div>
  </section>`;
}

// Icône d'un sort (Idan, 2026-10-25) : le parchemin du sort sous le cadre de son école (spells.json : icone, cadre).
function spellIconHtml(spell) {
  if (!spell?.icone) return "";
  return `<span class="spell-icon" aria-hidden="true"><img src="assets/${esc(spell.icone)}" alt="" loading="lazy">`
    + `${spell.cadre ? `<img src="assets/${esc(spell.cadre)}" alt="" loading="lazy">` : ""}</span>`;
}

// Infobulle d'un sort du grimoire (Idan, 2026-10-30 : « on doit savoir à qui il sert, combien de mana il utilise ») :
// ce qu'il fait (spells.json, description : la cible et l'action y sont), puis ses chiffres pour ce mercenaire, avec sa maîtrise et son équipement :
// mana, réussite, portée, effet, durée, zone — les mêmes que l'écran de combat (game-core/magic.js).
const SPELL_EFFECT_LABELS = {soin:"Soins", soin_de_zone:"Soins", soin_sur_duree:"Soins par tour", degats:"Dégâts", degats_zone:"Dégâts",
  degats_rebonds:"Dégâts", degats_paire:"Dégâts", degats_sans_resistance:"Dégâts", arme_elementaire:"Dégâts par coup"};
function spellTip(c, row) {
  if (!row?.code) return "";
  const magic = typeof magicRules === "function" ? magicRules() : null;
  const unit = {character:c, activeSet:1};
  const line = (label, value) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
  const lines = [];
  if (magic) {
    const range = magic.range(unit, row.code), duration = magic.duration(unit, row.code), radius = magic.zoneRadius(unit, row.code);
    const amount = SPELL_EFFECT_LABELS[row.effet] && magic.dice(row.code).count ? magic.effectRange(unit, row.code) : null;
    const bonus = row.bonus_unite ? magic.bonus(unit, row.code) : 0;
    lines.push(line("Mana", magic.manaCost(unit, row.code)), line("Réussite", `${Math.round(magic.castChance(unit, row.code).p)} %`));
    if (range > 0) lines.push(line("Portée", `${range} case${range > 1 ? "s" : ""}`));
    if (amount) lines.push(line(SPELL_EFFECT_LABELS[row.effet], `${amount.min} à ${amount.max} PV`));
    if (bonus > 0) lines.push(line("Bonus", row.bonus_unite === "pourcentage" ? `+${bonus} %` : `+${bonus}`));
    if (duration > 0) lines.push(line("Durée", `${duration} tour${duration > 1 ? "s" : ""}`));
    if (radius > 0) lines.push(line("Zone", `${radius} case${radius > 1 ? "s" : ""} autour`));
  }
  return `<span class="sheet-stat-tip spell-tip" role="tooltip"><strong>${esc(row.nom)}</strong><span>${esc(row.ecole)}</span>`
    + `<em>${esc(row.description || "")}</em>${lines.length ? `<dl>${lines.join("")}</dl>` : ""}</span>`;
}

// Grimoire : mercenary.spells = [{code, name, school, mastery}] (mastery : niveau du sort, 1 à 100).
function renderCharacterSpellbook(c) {
  const spells = Array.isArray(c.spells) ? c.spells : [];
  const rows = game.referenceData?.spells?.rows || [];
  return `<section class="magic-grimoire"><h4>Grimoire</h4>${spells.length
    ? `<div class="magic-spells">${spells.map(spell => {
      const row = rows.find(s => s.code === spell.code || s.nom === (spell.name || spell.nom));
      return `<div class="sheet-skill magic-spell">${spellIconHtml(row)}<span class="sheet-stat-name"${row ? ' tabindex="0"' : ""}>${esc(row?.nom || spell.name || spell.nom || "Sort")}<small>${esc(row?.ecole || spell.school || "")}</small>${spellTip(c, row)}</span><span class="sheet-stat-value">${fmt(Number(spell.mastery))}</span></div>`;
    }).join("")}</div>`
    : `<p class="muted">Aucun sort connu.</p>`}</section>`;
}

function renderSheetTab(c, tab) {
  if (tab === "stats") return renderStatsTab(c);
  if (tab === "skills") return renderSkillsTab(c);
  if (tab === "camp") return renderCampTab(c);
  if (tab === "history") return renderHistoryTab(c);
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

// Ordre de passage d'une fiche à l'autre (Idan, 2026-10-24) : le capitaine, puis les mercenaires dans l'ordre
// de l'écran « Mes mercenaires ». Une fiche hors de la compagnie (candidat) n'a pas de flèches.
function sheetOrder(){
  const team=teamCharacters();
  const captain=team.find(m=>m===game.captain||m.id===game.campaign?.company.captainId);
  return [captain,...sortMercenaryRoster(team.filter(m=>m!==captain))].filter(Boolean);
}
function renderSheetNav(c){
  const order=sheetOrder(),index=order.indexOf(c);
  for(const [id,step] of [["sheet-prev",-1],["sheet-next",1]]){
    const button=$(id),target=index>=0&&order.length>1?order[(index+step+order.length)%order.length]:null;
    button.hidden=!target;
    button.dataset.sheetStep=String(step);
    button.title=target?(step<0?"Précédent : ":"Suivant : ")+target.name:"";
  }
}
function stepSheet(step){
  const order=sheetOrder(),index=order.indexOf(game.sheetCharacter);
  if(index<0||order.length<2) return;
  showCharacter(order[(index+step+order.length)%order.length]);
}

function showCharacter(c) {
  $("dialog-name").textContent = c.name;
  game.sheetCharacter = c;
  renderSheetNav(c);
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
    initializeExpeditionUi();
    initializeCampBuildingsUi();
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
    for (const id of ["sheet-prev","sheet-next"]) $(id).addEventListener("click", event => stepSheet(Number(event.currentTarget.dataset.sheetStep)));
    // Flèches du clavier : fiche précédente ou suivante, hors champ de saisie.
    $("character-dialog").addEventListener("keydown", event => {
      if (!["ArrowLeft","ArrowRight"].includes(event.key) || event.target.closest?.("input,select,textarea")) return;
      event.preventDefault();
      stepSheet(event.key === "ArrowLeft" ? -1 : 1);
    });
    $("dialog-tabs").addEventListener("click", event => {
      const btn = event.target.closest("[data-sheet-tab]");
      if (!btn) return;
      game.sheetTab = btn.dataset.sheetTab;
      renderSheet();
      $("character-dialog").scrollTop = 0;
    });
    // Fenêtre d'une catégorie de compétences (Idan, 2026-10-30) : par-dessus l'onglet ; un clic à côté ou × la ferme.
    $("dialog-content").addEventListener("click", event => {
      const host = $("sheet-skill-overlay-host");
      if (!host) return;
      const open = event.target.closest("[data-skill-open]");
      if (open && game.sheetCharacter) { host.innerHTML = skillOverlay(game.sheetCharacter, open.dataset.skillGroup, open.dataset.skillOpen); return; }
      // × ou un clic n'importe où hors de la fenêtre la ferme.
      if (host.innerHTML && (event.target.closest(".sheet-skill-close") || !event.target.closest(".sheet-skill-window"))) host.innerHTML = "";
    });
    $("dialog-content").addEventListener("keydown", event => {
      if (!["Enter"," "].includes(event.key)) return;
      const open = event.target.closest?.("[data-skill-open]");
      if (open) { event.preventDefault(); open.click(); }
    });
    // Portrait du min ou du max d'une caractéristique : on passe à sa fiche, sur le même onglet.
    $("dialog-content").addEventListener("click", event => {
      const btn = event.target.closest("[data-sheet-open]");
      if (!btn) return;
      const member = teamCharacters().find(m => String(m.id) === btn.dataset.sheetOpen);
      if (member && member !== game.sheetCharacter) showCharacter(member);
    });
    // Onglet Caractéristiques : le grand détail se place sous ou au-dessus de la ligne survolée.
    const placeStat = event => {
      const value = event.target.closest(".sheet-stats .sheet-stat-value");
      if (value && !value.contains(event.relatedTarget)) placeStatPopover(value);
    };
    $("dialog-content").addEventListener("mouseover", placeStat);
    $("dialog-content").addEventListener("focusin", placeStat);
    // Le jeu démarre sur le menu principal (accueil) ; « Nouvelle partie » ouvre la création.
  } catch (error) {
    showFatal(error);
  }
}

init();
