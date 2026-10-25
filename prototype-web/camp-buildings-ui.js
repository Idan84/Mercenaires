"use strict";

// Constructions du camp (Idan, 2026-10-25) : pour l'instant dans Ma Compagnie, le dortoir. Agrandir (+5 places) ou
// améliorer sa qualité (dix niveaux : Renommée et affinité). Les règles (prix, durée, un chantier à la fois au dortoir)
// sont dans game-core/campaign.js.
function renderCampBuildings(){
  const box=$("camp-buildings"),c=game.campaign;
  if(!box) return;
  if(!c){ box.innerHTML=""; return; }
  const rules=campaignRules(),camp=c.company.camp,work=camp.construction,quality=rules.dormitoryQuality(c);
  const days=n=>fmt(n)+" jour"+(n>1?"s":"");
  let actions;
  if(work){
    const left=days(work.endDay-c.day);
    actions=work.kind==="dormitory_quality"
      ?`<p class="building-work">Chantier en cours : ${esc(work.name)} (niveau ${fmt(work.level)}), prêt dans ${left}.</p>`
      :`<p class="building-work">Chantier en cours : +${fmt(work.places)} places, prêtes dans ${left}.</p>`;
  }else{
    const gold=c.company.gold,expand=rules.nextDormitoryExpansion(c),upgrade=rules.nextDormitoryQuality(c);
    const short=cost=>gold<cost?" · pas assez d’or":"";
    actions=`<div class="building-action"><button type="button" class="primary" data-dorm-expand${gold<expand.gold?" disabled":""}>Agrandir : +${fmt(expand.places)} places</button>
      <span class="building-cost">${fmt(expand.gold)} PO · ${days(expand.days)}${short(expand.gold)}</span></div>`
      +(upgrade
        ?`<div class="building-action"><button type="button" class="primary" data-dorm-quality${gold<upgrade.gold?" disabled":""}>Améliorer : ${esc(upgrade.name)}</button>
      <span class="building-cost">${fmt(upgrade.gold)} PO · ${days(upgrade.days)} · Renommée +${fmt(upgrade.renown)}, affinité +${fmt(upgrade.affinity)}${short(upgrade.gold)}</span></div>`
        :`<p class="building-work">Qualité maximale.</p>`);
  }
  box.innerHTML=`<h3>Constructions</h3>
    <article class="building-card">
      <div class="building-info"><strong>Dortoir</strong><span>${dormitoryPlacesText(rules.dormitoryUsed(c))} / ${fmt(camp.dormitoryCapacity)} places occupées</span>
        <span>Qualité : ${esc(quality.nom)} (niveau ${fmt(quality.niveau)})</span></div>
      <div class="building-actions">${actions}</div>
    </article>`;
}

function startCampWork(result){
  if(!result.ok){ tavernLog(result.reason,"bad"); renderCampBuildings(); return; }
  const w=result.construction,days=fmt(w.days)+" jour"+(w.days>1?"s":"");
  tavernLog(w.kind==="dormitory_quality"
    ?`Amélioration du dortoir lancée : ${w.name} (niveau ${fmt(w.level)}), ${fmt(w.gold)} PO, prêt dans ${days}.`
    :`Agrandissement du dortoir lancé : ${fmt(w.gold)} PO, +${fmt(w.places)} places dans ${days}.`,"gear");
  saveGame();
  renderGame();
}
function expandDormitory(){ startCampWork(campaignRules().startDormitoryExpansion(game.campaign)); }
function improveDormitory(){ startCampWork(campaignRules().startDormitoryQuality(game.campaign)); }

// Journal du matin : le chantier terminé.
function logCampWork(built){
  if(!built) return;
  if(built.kind==="dormitory_quality"){
    tavernLog(`Le dortoir passe au niveau ${fmt(built.level)} : ${built.name}. Renommée +${fmt(built.renown)} ; affinité +${fmt(built.affinity)} pour ${fmt(built.members)} mercenaire${built.members>1?"s":""}.`,"turn");
  }else{
    tavernLog("Le dortoir est agrandi : +"+fmt(built.places)+" places, "+fmt(built.capacity)+" en tout.","turn");
  }
}

function initializeCampBuildingsUi(){
  document.addEventListener("click",event=>{
    if(event.target.closest("[data-dorm-expand]")) expandDormitory();
    else if(event.target.closest("[data-dorm-quality]")) improveDormitory();
  });
}
