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
// plat du jour (canteen-dishes.json : nom, image, phrase), le cadre carré or du kit. Changer le menu (Idan : « le clic
// transforme le bouton en Certain de manger ça ? et des flèches apparaissent à gauche et à droite de l'icône du plat. On
// fait tourner et on peut valider ») : les flèches font tourner les plats disponibles (les plats goûtés, puis celui que
// propose le tavernier, avec sa vraie phrase : Idan, « Non, mets la vraie phrase ») ; « Certain de manger ça ? » met au menu le plat montré
// (celui du tavernier : il est goûté, son effet est alors connu ; game-core/canteen.js). Le niveau et l'amélioration de
// la salle sont dans la fenêtre Construction.
let canteenBrowse=null; // pendant le choix : l'index du plat montré dans canteenChoices ; null sinon
// Les plats qu'on peut mettre au menu : les plats goûtés, puis celui que propose le tavernier.
function canteenChoices(state,offer){ return [...state.dishes,...(offer&&!state.dishes.includes(offer.code)?[offer.code]:[])]; }
function canteenMenuHtml(dish,{change=false,browsing=false}={}){
  const arrow=(dir,label)=>browsing?`<button type="button" class="canteen-arrow canteen-arrow--${dir>0?"next":"prev"}" data-canteen-turn="${dir}" aria-label="${label}"></button>`:"";
  const button=browsing
    ?`<button type="button" class="mission-btn canteen-change" data-canteen-confirm>Certain de manger ça ?</button>`
    :change?`<button type="button" class="mission-btn canteen-change" data-canteen-change>Changer le menu</button>`:"";
  return `<article class="canteen-menu${browsing?" is-choosing":""}">
      <p class="canteen-menu-kicker">Au menu</p>
      <h2 class="canteen-dish-name">${esc(dish.nom)}</h2>
      <div class="canteen-dish-row">${arrow(-1,"Plat précédent")}<figure class="canteen-dish-img"><img src="${esc(dish.image||"")}" alt="${esc(dish.nom)}"></figure>${arrow(1,"Plat suivant")}</div>
      <p class="canteen-dish-phrase">${esc(dish.phrase||"")}</p>
      ${button}
    </article>`;
}

function renderCanteen(){
  const box=$("tavern-canteen"),c=game.campaign,canteen=canteenRulesOf();
  if(!box) return;
  if(!c||!canteen){ box.innerHTML=""; return; }
  const rules=campaignRules(),row=rules.campBuildingRow(canteen.HALL),level=rules.buildingLevel(c,canteen.HALL);
  setCanteenBackground(level,row?.niveaux||10);
  const state=level?canteen.canteenOf(c):null,current=state?canteen.dish(state.current):null;
  if(!current){ canteenBrowse=null; box.innerHTML=""; return; }
  const offer=canteen.offer(c),choices=canteenChoices(state,offer);
  // « Uniquement si un autre plat est dispo » : un autre plat goûté, ou celui que propose le tavernier.
  if(choices.length<2) canteenBrowse=null;
  if(canteenBrowse==null){ box.innerHTML=canteenMenuHtml(current,{change:choices.length>1}); return; }
  const code=choices[(canteenBrowse%choices.length+choices.length)%choices.length];
  box.innerHTML=canteenMenuHtml(canteen.dish(code),{browsing:true});
}

// Le clic sur « Changer le menu » : le choix commence sur le plat du jour (open = false : il se referme).
function openCanteenChoice(open=true){
  const c=game.campaign,canteen=canteenRulesOf(),state=open&&c&&canteen?canteen.canteenOf(c):null;
  canteenBrowse=state?Math.max(0,canteenChoices(state,canteen.offer(c)).indexOf(state.current)):null;
  renderCanteen();
}
// Les flèches : le plat d'avant ou d'après, en tournant.
function turnCanteenDish(dir){
  const c=game.campaign,canteen=canteenRulesOf(),state=c&&canteen?canteen.canteenOf(c):null;
  if(canteenBrowse==null||!state) return;
  const n=canteenChoices(state,canteen.offer(c)).length;
  canteenBrowse=((canteenBrowse+Math.sign(dir))%n+n)%n;
  renderCanteen();
}
// « Certain de manger ça ? » : le plat montré passe au menu (celui du tavernier est goûté).
function confirmCanteenDish(){
  const c=game.campaign,canteen=canteenRulesOf(),state=c&&canteen?canteen.canteenOf(c):null;
  if(canteenBrowse==null||!state) return;
  const offer=canteen.offer(c),choices=canteenChoices(state,offer),code=choices[canteenBrowse];
  if(offer&&code===offer.code) tasteCanteenDish();
  else chooseCanteenDish(code);
}

function chooseCanteenDish(code){
  canteenBrowse=null;
  // Le plat déjà au menu : on referme le choix, sans rien changer.
  if(code===game.campaign?.company?.canteen?.current){ renderCanteen(); return; }
  const result=canteenRulesOf()?.setDish(game.campaign,code);
  if(!result) return;
  if(!result.ok){ tavernLog(result.reason,"bad"); renderCanteen(); return; }
  tavernLog(`La Cantine : dès demain, ${result.dish.nom} au menu (${result.dish.caracteristique}).`,"info");
  saveGame();
  renderGame();
}

// Le plat que propose le tavernier : on le goûte (gratuit, son effet est connu) et il passe au menu.
function tasteCanteenDish(){
  const canteen=canteenRulesOf(),result=canteen?.unlock(game.campaign);
  canteenBrowse=null;
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
    if(event.target.closest("[data-canteen-change]")) openCanteenChoice(true);
    else if(event.target.closest("[data-canteen-confirm]")) confirmCanteenDish();
    else{
      const turn=event.target.closest("[data-canteen-turn]");
      if(turn) turnCanteenDish(Number(turn.dataset.canteenTurn));
    }
  });
}
