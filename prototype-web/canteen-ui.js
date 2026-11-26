"use strict";

// La Cantine (Idan, 2026-11-08 ; règles : game-core/canteen.js) : une salle de la Taverne, où le tavernier cuisine. L'écran
// « La Cantine » de la Taverne : le plat du jour sur un parchemin, en changer parmi les plats débloqués, goûter le nouveau
// plat que propose le tavernier (son effet n'est connu qu'une fois goûté). La salle se construit et s'améliore dans la
// fenêtre Construction.
function canteenRulesOf(){ return typeof campaignRules==="function"?campaignRules().canteenRules||null:null; }

// « augmente la Force », « l’Endurance », « le Courage ».
function canteenEffect(stat){
  return "augmente "+(/^[AEIOUÉ]/.test(stat)?"l’":stat==="Courage"?"le ":"la ")+stat;
}

// Le fond de l'écran (Idan, 2026-11-26 : « 10 backgrounds à mettre en plein écran (sous la barre de jeu). L'image à
// mettre dépend du niveau de la cantine ») : celle de son niveau, de 1 à 10 (scripts/build-canteen-bg.js) ; plein écran,
// sous les barres (styles.css, #tavern-canteen-view::before).
const CANTEEN_BG_DIR="assets/cantine/";
function canteenBackground(level,levels=10){
  return `${CANTEEN_BG_DIR}cantine-${Math.max(1,Math.min(levels,Math.round(Number(level)||1)))}.webp`;
}
function setCanteenBackground(level,levels){
  const view=$("tavern-canteen-view"),src=canteenBackground(level,levels);
  const url=typeof document!=="undefined"&&document.baseURI?new URL(src,document.baseURI).href:src;
  view?.style?.setProperty("--canteen-bg",`url("${url}")`);
}

// L'écran (Idan, 2026-11-26 : « Retire tout le blabla actuel. On met un petit parchemin […] Au menu ; titre du plat ; image
// du plat dans un cadre doré ; phrase explicative du plat (pas une phrase qui dit ce plat vous donne +40 xp par jour) ; en
// dessous, un bouton capitaine : changer le menu, uniquement si un autre plat est dispo ») : le parchemin de la charte, le
// plat du jour (canteen-dishes.json : nom, image, phrase), le cadre carré or du kit. « Changer le menu » montre, sur le même
// parchemin, les autres plats goûtés et le plat que propose le tavernier (choisir celui-ci, c'est le goûter : son effet est
// alors connu, game-core/canteen.js) ; un clic sur un plat le met au menu. Le niveau et l'amélioration de la salle sont
// dans la fenêtre Construction.
let canteenChoosing=false;
function canteenMenuHtml(dish,{change=false}={}){
  return `<article class="canteen-menu">
      <p class="canteen-menu-kicker">Au menu</p>
      <h2 class="canteen-dish-name">${esc(dish.nom)}</h2>
      <figure class="canteen-dish-img"><img src="${esc(dish.image||"")}" alt="${esc(dish.nom)}"></figure>
      <p class="canteen-dish-phrase">${esc(dish.phrase||"")}</p>
      ${change?`<button type="button" class="mission-btn canteen-change" data-canteen-change>Changer le menu</button>`:""}
    </article>`;
}
function canteenChoiceHtml(state,canteen,offer){
  const pick=code=>{ const dish=canteen.dish(code); return dish?`<li><button type="button" class="canteen-choice${code===state.current?" is-current":""}" data-canteen-pick="${esc(code)}">${esc(dish.nom)}</button></li>`:""; };
  const fresh=offer?`<li><button type="button" class="canteen-choice is-new" data-canteen-taste>${esc(offer.nom)}<small>Le nouveau plat du tavernier</small></button></li>`:"";
  return `<article class="canteen-menu is-choosing">
      <p class="canteen-menu-kicker">Changer le menu</p>
      <ul class="canteen-choices">${state.dishes.map(pick).join("")}${fresh}</ul>
    </article>`;
}

function renderCanteen(){
  const box=$("tavern-canteen"),c=game.campaign,canteen=canteenRulesOf();
  if(!box) return;
  if(!c||!canteen){ box.innerHTML=""; return; }
  const rules=campaignRules(),row=rules.campBuildingRow(canteen.HALL),level=rules.buildingLevel(c,canteen.HALL);
  setCanteenBackground(level,row?.niveaux||10);
  const state=level?canteen.canteenOf(c):null,dish=state?canteen.dish(state.current):null;
  if(!dish){ canteenChoosing=false; box.innerHTML=""; return; }
  const offer=canteen.offer(c);
  // « Uniquement si un autre plat est dispo » : un autre plat goûté, ou celui que propose le tavernier.
  const other=state.dishes.length>1||Boolean(offer);
  if(!other) canteenChoosing=false;
  box.innerHTML=canteenChoosing?canteenChoiceHtml(state,canteen,offer):canteenMenuHtml(dish,{change:other});
}

function openCanteenChoice(open=true){
  canteenChoosing=open;
  renderCanteen();
}

function chooseCanteenDish(code){
  // Le plat déjà au menu : on referme le choix, sans rien changer.
  if(code===game.campaign?.company?.canteen?.current){ openCanteenChoice(false); return; }
  const result=canteenRulesOf()?.setDish(game.campaign,code);
  canteenChoosing=false;
  if(!result) return;
  if(!result.ok){ tavernLog(result.reason,"bad"); renderCanteen(); return; }
  tavernLog(`La Cantine : dès demain, ${result.dish.nom} au menu (${result.dish.caracteristique}).`,"info");
  saveGame();
  renderGame();
}

// Le plat que propose le tavernier : on le goûte (gratuit, son effet est connu) et il passe au menu.
function tasteCanteenDish(){
  const canteen=canteenRulesOf(),result=canteen?.unlock(game.campaign);
  canteenChoosing=false;
  if(!result) return;
  if(!result.ok){ tavernLog(result.reason,"bad"); renderCanteen(); return; }
  tavernLog(`Le tavernier fait goûter un nouveau plat : ${result.dish.nom}. Il ${canteenEffect(result.dish.caracteristique)}.`,"gear");
  canteen.setDish(game.campaign,result.dish.code);
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
    else if(event.target.closest("[data-canteen-change]")) openCanteenChoice(true);
    else{
      const pick=event.target.closest("[data-canteen-pick]");
      if(pick) chooseCanteenDish(pick.dataset.canteenPick);
    }
  });
}
