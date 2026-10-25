"use strict";

// Constructions du camp (Idan, 2026-10-25) : pour l'instant dans Ma Compagnie, l'agrandissement du dortoir. Les règles
// (prix, durée, un chantier à la fois) sont dans game-core/campaign.js.
function renderCampBuildings(){
  const box=$("camp-buildings"),c=game.campaign;
  if(!box) return;
  if(!c){ box.innerHTML=""; return; }
  const rules=campaignRules(),camp=c.company.camp,work=camp.construction;
  const days=n=>fmt(n)+" jour"+(n>1?"s":"");
  let action;
  if(work){
    action=`<p class="building-work">Chantier en cours : +${fmt(work.places)} places, prêtes dans ${days(work.endDay-c.day)}.</p>`;
  }else{
    const next=rules.nextDormitoryExpansion(c),short=c.company.gold<next.gold;
    action=`<button type="button" class="primary" data-dorm-expand${short?" disabled":""}>Agrandir : +${fmt(next.places)} places</button>
      <span class="building-cost">${fmt(next.gold)} PO · ${days(next.days)}${short?" · pas assez d’or":""}</span>`;
  }
  box.innerHTML=`<h3>Constructions</h3>
    <article class="building-card">
      <div class="building-info"><strong>Dortoir</strong><span>${dormitoryPlacesText(rules.dormitoryUsed(c))} / ${fmt(camp.dormitoryCapacity)} places occupées</span></div>
      <div class="building-action">${action}</div>
    </article>`;
}

function expandDormitory(){
  const result=campaignRules().startDormitoryExpansion(game.campaign);
  if(!result.ok){ tavernLog(result.reason,"bad"); renderCampBuildings(); return; }
  const w=result.construction;
  tavernLog(`Agrandissement du dortoir lancé : ${fmt(w.gold)} PO, +${fmt(w.places)} places dans ${fmt(w.days)} jour${w.days>1?"s":""}.`,"gear");
  saveGame();
  renderGame();
}

function initializeCampBuildingsUi(){
  document.addEventListener("click",event=>{ if(event.target.closest("[data-dorm-expand]")) expandDormitory(); });
}
