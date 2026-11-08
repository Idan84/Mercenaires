"use strict";

// La Cantine (Idan, 2026-11-08 ; règles : game-core/canteen.js) : une salle de la Taverne, où le tavernier cuisine. L'écran
// « La Cantine » de la Taverne : construire ou améliorer la salle (comme un bâtiment du camp), choisir le plat du jour parmi
// les plats débloqués, goûter le nouveau plat que propose le tavernier (son effet n'est connu qu'une fois goûté).
function canteenRulesOf(){ return typeof campaignRules==="function"?campaignRules().canteenRules||null:null; }

// « augmente la Force », « l’Endurance », « le Courage ».
function canteenEffect(stat){
  return "augmente "+(/^[AEIOUÉ]/.test(stat)?"l’":stat==="Courage"?"le ":"la ")+stat;
}
function canteenDishLabel(dish,xp){
  return `${dish.nom} — ${canteenEffect(dish.caracteristique)}${xp?` (+${fmt(xp)} XP par jour)`:""}`;
}

function renderCanteen(){
  const box=$("tavern-canteen"),c=game.campaign,canteen=canteenRulesOf();
  if(!box) return;
  if(!c||!canteen){ box.innerHTML=""; return; }
  const rules=campaignRules(),row=rules.campBuildingRow(canteen.HALL),level=rules.buildingLevel(c,canteen.HALL);
  const action=typeof campBuildingAction==="function"?campBuildingAction(c,canteen.HALL,level):"";
  const head=`<p class="building-info"><span>${level?`Niveau ${fmt(level)} · +${fmt(canteen.xpPerDay(c))} XP par jour pour chaque mercenaire au camp, blessés et fatigués compris`:"À construire"}</span></p>
    <div class="building-actions">${action}</div>`;
  if(!level){
    box.innerHTML=`<p class="tavern-canteen-intro">${esc(row?.description||"")}</p>${head}`;
    return;
  }
  const state=canteen.canteenOf(c),xp=canteen.xpPerDay(c);
  const option=code=>{ const dish=canteen.dish(code); return dish?`<option value="${esc(code)}"${code===state.current?" selected":""}>${esc(canteenDishLabel(dish,xp))}</option>`:""; };
  const offer=canteen.offer(c);
  const locked=canteen.lockedDishes(c).length;
  const proposal=offer
    ?`<div class="building-action"><button type="button" class="primary" data-canteen-taste>Goûter : ${esc(offer.nom)}</button>
      <span class="building-cost">Le tavernier propose un nouveau plat. Gratuit ; on ne sait ce qu’il fait qu’une fois goûté.</span></div>`
    :`<p class="building-work">${locked?`Le tavernier proposera un nouveau plat au prochain niveau du Labo d’alchimie (${fmt(locked)} encore inconnu${locked>1?"s":""}).`:"Tous les plats sont au menu."}</p>`;
  box.innerHTML=`${head}
    <label class="tavern-canteen-dish">Plat du jour <select data-canteen-dish>${state.dishes.map(option).join("")}</select></label>
    ${proposal}`;
}

function chooseCanteenDish(code){
  const result=canteenRulesOf()?.setDish(game.campaign,code);
  if(!result) return;
  if(!result.ok){ tavernLog(result.reason,"bad"); renderCanteen(); return; }
  tavernLog(`La Cantine : dès demain, ${result.dish.nom} au menu (${result.dish.caracteristique}).`,"info");
  saveGame();
  renderGame();
}

function tasteCanteenDish(){
  const result=canteenRulesOf()?.unlock(game.campaign);
  if(!result) return;
  if(!result.ok){ tavernLog(result.reason,"bad"); renderCanteen(); return; }
  tavernLog(`Le tavernier fait goûter un nouveau plat : ${result.dish.nom}. Il ${canteenEffect(result.dish.caracteristique)}.`,"gear");
  saveGame();
  renderGame();
}

// Journal du matin : le plat du jour, combien en ont mangé, combien gagnent un point.
function logCanteen(report){
  if(!report||!report.eaters?.length) return;
  const up=report.eaters.filter(e=>(e.changes||[]).some(ch=>ch.after>ch.before)).length;
  tavernLog(`La Cantine sert ${report.dish.nom} : +${fmt(report.xp)} XP de ${report.dish.caracteristique} pour ${fmt(report.eaters.length)} mercenaire${report.eaters.length>1?"s":""}${up?` (${fmt(up)} gagne${up>1?"nt":""} un point)`:""}.`,"turn");
}

function initializeCanteenUi(){
  document.addEventListener("click",event=>{
    if(event.target.closest("[data-canteen-taste]")) tasteCanteenDish();
  });
  document.addEventListener("change",event=>{
    const select=event.target.closest?.("[data-canteen-dish]");
    if(select) chooseCanteenDish(select.value);
  });
}
