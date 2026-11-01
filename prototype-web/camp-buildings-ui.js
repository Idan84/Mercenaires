"use strict";

// Constructions du camp (Idan, 2026-10-25). Ma Compagnie montre le dortoir (places, qualité, chantier) et un bouton pour
// y aller, puis les bâtiments de soins (Dispensaire, Bains chauds ; 2026-11-01) ; l'écran Dortoir, sur le fond de son niveau de qualité (images de Jean-Mimi, dormitory-quality.json, image),
// propose de l'agrandir (+5 places), d'améliorer sa qualité (dix niveaux : Renommée et affinité) ou d'y construire un
// quartier du lieutenant (un par niveau pair de qualité). Les règles (prix, durée, un chantier à la fois au dortoir) sont
// dans game-core/campaign.js.
const DORMITORY_ART_DIR="assets/dormitory/";

function campDays(n){ return fmt(n)+" jour"+(n>1?"s":""); }

function campWorkText(work,day){
  const left=campDays(work.endDay-day);
  if(work.kind==="lieutenant_quarter") return `Chantier en cours : quartier du lieutenant n° ${fmt(work.number)}, prêt dans ${left}.`;
  return work.kind==="dormitory_quality"
    ?`Chantier en cours : ${esc(work.name)} (niveau ${fmt(work.level)}), prêt dans ${left}.`
    :`Chantier en cours : +${fmt(work.places)} places, prêtes dans ${left}.`;
}

function lieutenantQuartersLine(c){
  const n=campaignRules().lieutenantQuarters(c);
  return `Quartiers du lieutenant : ${n?fmt(n):"aucun"}`;
}

function dormitoryPlacesLine(c){
  const rules=campaignRules();
  return `${dormitoryPlacesText(rules.dormitoryUsed(c))} / ${fmt(c.company.camp.dormitoryCapacity)} places occupées`;
}

// Bâtiments de soins (Idan, 2026-11-01) : ce que fait le niveau atteint, en quelques mots.
function campBuildingEffectText(code,effects){
  if(code==="dispensary") return `blessures −${fmt(Math.round((1-effects.woundFactor)*100))} %`;
  if(code==="baths") return `fatigue −${campDays(effects.fatigueRelief)}, mana +${fmt(effects.manaBonus)} % par jour`;
  return "";
}
// Ma Compagnie : un encart par bâtiment de soins (à construire, puis cinq niveaux ; un chantier par bâtiment).
function campBuildingCard(c,code){
  const rules=campaignRules(),row=rules.campBuildingRow(code);
  if(!row) return "";
  const level=rules.buildingLevel(c,code),work=rules.buildingWork(c,code),next=rules.nextBuildingLevel(c,code);
  let action;
  if(work) action=`<span class="building-work">Chantier en cours : niveau ${fmt(work.level)}, prêt dans ${campDays(work.endDay-c.day)}.</span>`;
  else if(next){
    const short=c.company.gold<next.gold;
    action=`<div class="building-action"><button type="button" class="primary" data-camp-build="${esc(code)}"${short?" disabled":""}>${level?"Améliorer : niveau "+fmt(next.level):"Construire"}</button>
      <span class="building-cost">${fmt(next.gold)} PO · ${campDays(next.days)}${short?" · pas assez d’or":""}</span></div>`;
  }else action=`<span class="building-work">Niveau maximal.</span>`;
  const state=level?`Niveau ${fmt(level)} · ${campBuildingEffectText(code,rules.campBuildingEffects(c))}`:"À construire";
  return `<article class="building-card building-card--care building-card--${esc(code)}">
      <div class="building-info"><strong title="${esc(row.description)}">${esc(row.nom)}</strong><span>${state}</span></div>
      ${action}
    </article>`;
}

// Ma Compagnie : le dortoir et le bouton pour y aller, puis les bâtiments de soins.
function renderCampBuildings(){
  const box=$("camp-buildings"),c=game.campaign;
  if(!box) return;
  if(!c){ box.innerHTML=""; return; }
  const rules=campaignRules(),work=c.company.camp.construction,quality=rules.dormitoryQuality(c);
  box.innerHTML=`<h3>Constructions</h3>
    <article class="building-card building-card--link">
      <div class="building-info"><strong>Dortoir</strong><span>${dormitoryPlacesLine(c)} · ${esc(quality.nom)}</span>${work?`<span class="building-work">${campWorkText(work,c.day)}</span>`:""}</div>
      <button type="button" class="primary" data-open-camp-scene="dormitory" data-destination="Dortoir">Aller au dortoir</button>
    </article>`+(rules.campBuildingCodes?rules.campBuildingCodes().map(code=>campBuildingCard(c,code)).join(""):"");
  renderDormitory();
}

// Écran Dortoir : le fond de son niveau de qualité, son état, et le choix d'agrandir, d'améliorer ou de construire un
// quartier du lieutenant.
function renderDormitory(){
  const box=$("dormitory-view"),c=game.campaign;
  if(!box||!c) return;
  const rules=campaignRules(),work=c.company.camp.construction,quality=rules.dormitoryQuality(c);
  if(quality.image&&typeof document!=="undefined"){
    document.body.style.setProperty("--dormitory-bg",`url("${new URL(DORMITORY_ART_DIR+quality.image,document.baseURI).href}")`);
  }
  let actions;
  if(work){
    actions=`<p class="building-work">${campWorkText(work,c.day)}</p>`;
  }else{
    const gold=c.company.gold,expand=rules.nextDormitoryExpansion(c),upgrade=rules.nextDormitoryQuality(c);
    const quarter=rules.nextLieutenantQuarter(c),locked=quarter&&quality.niveau<quarter.quality;
    const short=cost=>gold<cost?" · pas assez d’or":"";
    actions=`<div class="building-action"><button type="button" class="primary" data-dorm-expand${gold<expand.gold?" disabled":""}>Agrandir : +${fmt(expand.places)} places</button>
      <span class="building-cost">${fmt(expand.gold)} PO · ${campDays(expand.days)}${short(expand.gold)}</span></div>`
      +(upgrade
        ?`<div class="building-action"><button type="button" class="primary" data-dorm-quality${gold<upgrade.gold?" disabled":""}>Améliorer : ${esc(upgrade.name)}</button>
      <span class="building-cost">${fmt(upgrade.gold)} PO · ${campDays(upgrade.days)} · Renommée +${fmt(upgrade.renown)}, affinité +${fmt(upgrade.affinity)}${short(upgrade.gold)}</span></div>`
        :`<p class="building-work">Qualité maximale.</p>`)
      +(quarter
        ?`<div class="building-action"><button type="button" class="primary" data-dorm-quarter${locked||gold<quarter.gold?" disabled":""}>Construire : quartier du lieutenant n° ${fmt(quarter.number)}</button>
      <span class="building-cost">${fmt(quarter.gold)} PO · ${campDays(quarter.days)}${locked?` · dortoir de niveau ${fmt(quarter.quality)} requis`:short(quarter.gold)}</span></div>`
        :`<p class="building-work">Tous les quartiers du lieutenant sont construits.</p>`);
  }
  box.innerHTML=`<button type="button" class="secondary dormitory-back" data-open-camp-scene="company" data-destination="Ma Compagnie">← Ma Compagnie</button>
    <p class="eyebrow">Dortoir</p>
    <h2>${esc(quality.nom)}</h2>
    <p class="dormitory-meta">Niveau ${fmt(quality.niveau)} · ${dormitoryPlacesLine(c)} · ${lieutenantQuartersLine(c)}</p>
    <div class="building-actions">${actions}</div>`;
}

function startCampWork(result){
  if(!result.ok){ tavernLog(result.reason,"bad"); renderCampBuildings(); return; }
  const w=result.construction;
  if(w.kind==="building"){
    tavernLog(`Construction lancée : ${w.name} (niveau ${fmt(w.level)}), ${fmt(w.gold)} PO, prêt dans ${campDays(w.days)}.`,"gear");
    saveGame();
    renderGame();
    return;
  }
  tavernLog(w.kind==="lieutenant_quarter"
    ?`Construction lancée : quartier du lieutenant n° ${fmt(w.number)}, ${fmt(w.gold)} PO, prêt dans ${campDays(w.days)}.`
    :w.kind==="dormitory_quality"
    ?`Amélioration du dortoir lancée : ${w.name} (niveau ${fmt(w.level)}), ${fmt(w.gold)} PO, prêt dans ${campDays(w.days)}.`
    :`Agrandissement du dortoir lancé : ${fmt(w.gold)} PO, +${fmt(w.places)} places dans ${campDays(w.days)}.`,"gear");
  saveGame();
  renderGame();
}
function expandDormitory(){ startCampWork(campaignRules().startDormitoryExpansion(game.campaign)); }
function improveDormitory(){ startCampWork(campaignRules().startDormitoryQuality(game.campaign)); }
function buildLieutenantQuarter(){ startCampWork(campaignRules().startLieutenantQuarter(game.campaign)); }
function buildCampBuilding(code){ startCampWork(campaignRules().startBuilding(game.campaign,code)); }

// Journal du matin : les bâtiments de soins qui montent d'un niveau.
function logCampBuildings(list){
  for(const b of list||[]){
    const effect=campBuildingEffectText(b.code,campaignRules().campBuildingEffects(game.campaign));
    tavernLog(`${b.name} : niveau ${fmt(b.level)} terminé${effect?" ("+effect+")":""}.`,"turn");
  }
}

// Journal du matin : le chantier terminé.
function logCampWork(built){
  if(!built) return;
  if(built.kind==="lieutenant_quarter"){
    tavernLog(`Le quartier du lieutenant n° ${fmt(built.number)} est prêt au dortoir.`,"turn");
  }else if(built.kind==="dormitory_quality"){
    tavernLog(`Le dortoir passe au niveau ${fmt(built.level)} : ${built.name}. Renommée +${fmt(built.renown)} ; affinité +${fmt(built.affinity)} pour ${fmt(built.members)} mercenaire${built.members>1?"s":""}.`,"turn");
  }else{
    tavernLog("Le dortoir est agrandi : +"+fmt(built.places)+" places, "+fmt(built.capacity)+" en tout.","turn");
  }
}

function initializeCampBuildingsUi(){
  document.addEventListener("click",event=>{
    if(event.target.closest("[data-dorm-expand]")) expandDormitory();
    else if(event.target.closest("[data-dorm-quality]")) improveDormitory();
    else if(event.target.closest("[data-dorm-quarter]")) buildLieutenantQuarter();
    else if(event.target.closest("[data-camp-build]")) buildCampBuilding(event.target.closest("[data-camp-build]").dataset.campBuild);
  });
}
