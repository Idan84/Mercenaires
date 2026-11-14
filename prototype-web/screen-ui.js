"use strict";

// Écran courant sur <body data-screen> : accueil, création, camp, mission ou fin de partie.
// Il se déduit des panneaux visibles, sans toucher aux modules qui les affichent ; styles.css
// en tire la mise en page (accueil = logo + menu sur le château). Purement visuel.
const SCREEN_PANELS=[["mission","mission-panel"],["gameover","game-over-panel"],["creation","creation-wizard"],["intro","intro-panel"],["camp","game-panel"],["setup","setup-panel"]];
const CAMP_SCENES=["company","dormitory","memorial","mercenaries","tavern","quartermaster","merchant"];

// Scènes sans bouton retour (Idan, 2026-10-30) : un clic hors du cadre ramène au camp.
const CAMP_SCENES_CLOSED_FROM_OUTSIDE=["mercenaries"];

// Les lieux des barres (Idan, 2026-11-14) : le bouton du lieu où l'on est (le château compris) est marqué.
function updateCampHomeIcon(){
  if(typeof document.querySelectorAll!=="function") return;
  const scene=document.body.dataset.screen==="camp"?document.body.dataset.campScene:"";
  for(const button of document.querySelectorAll("#game-hud [data-hud-scene]")){
    const current=button.dataset.hudScene===scene;
    button.classList.toggle("is-current",current);
    if(current) button.setAttribute("aria-current","page");
    else button.removeAttribute("aria-current");
  }
}

function closeCampSceneFromOutside(event){
  const scene=document.body.dataset.campScene;
  if(document.body.dataset.screen!=="camp"||!CAMP_SCENES_CLOSED_FROM_OUTSIDE.includes(scene)) return;
  if(document.querySelector("dialog[open]")||!(event.target instanceof Element)) return;
  if(event.target.closest(`[data-camp-scene-panel="${scene}"] .panel, [data-open-camp-scene], #camp-home, #game-hud, #game-pause, dialog, #item-card-float`)) return;
  openCampScene("home");
}

function openCampScene(scene="home"){
  const target=CAMP_SCENES.includes(scene)?scene:"home";
  const home=document.getElementById("camp-home");
  const panels=[...document.querySelectorAll("#game-panel [data-camp-scene-panel]")];
  if(!home) return;

  home.classList.toggle("hidden",target!=="home");
  for(const panel of panels){
    panel.classList.toggle("hidden",panel.dataset.campScenePanel!==target);
  }
  document.body.dataset.campScene=target;
  updateCampHomeIcon();
  if(typeof refreshMusic==="function") refreshMusic();
  if(target==="tavern"&&typeof showTavernView==="function") showTavernView("home");

  const visible=target==="home"?home:panels.find(panel=>panel.dataset.campScenePanel===target);
  if(visible){
    visible.classList.remove("camp-view-enter");
    requestAnimationFrame(()=>{
      visible.classList.add("camp-view-enter");
      setTimeout(()=>visible.classList.remove("camp-view-enter"),320);
    });
  }
}

function handleCampNavigation(event){
  const open=event.target.closest("[data-open-camp-scene]");
  if(open){
    openCampScene(open.dataset.openCampScene);
    return;
  }
  if(event.target.closest("[data-camp-back]")) openCampScene("home");
}

function currentScreen(){
  for(const [screen,id] of SCREEN_PANELS){
    const panel=document.getElementById(id);
    if(panel&&!panel.classList.contains("hidden")) return screen;
  }
  return "home";
}


const gameActionMessages=[];
function gameAction(message){
  const day=game.campaign?.day;
  gameActionMessages.unshift({message:String(message),day});
  gameActionMessages.length=Math.min(gameActionMessages.length,35);
  renderGameHud();
}
// Icônes au trait des barres : le bouton menu et le journal (les lieux ont les pictos d'Idan).
const HUD_ICONS={
  menu:'<path d="M4.5 7h15M4.5 12h15M4.5 17h15"/>',
  journal:'<path d="M7 4.5h10.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H16v9.5a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2H8"/><path d="M7 4.5a2 2 0 0 0-2 2v9.5M10 9h3M10 12.5h3"/>'
};
function hudIcon(kind){
  return '<svg class="hud-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(HUD_ICONS[kind]||"")+'</svg>';
}
let hudGoldShown=null;
// Le trésor bouge : un petit chiffre monte au-dessus de l'or (rouge si l'on paie, vert si l'on gagne).
function hudGoldDelta(gold){
  const before=hudGoldShown;
  hudGoldShown=gold;
  if(before===null||before===gold) return;
  const delta=document.createElement("span");
  delta.className="hud-delta "+(gold<before?"hud-delta--loss":"hud-delta--gain");
  delta.textContent=(gold<before?"−":"+")+fmt(Math.abs(gold-before));
  delta.addEventListener("animationend",()=>delta.remove());
  $("hud-gold-stat").appendChild(delta);
}
// Les deux barres du camp suivent la culture du capitaine, posée sur <body data-captain-culture> (Idan : « la barre qui
// change en fonction de la culture, et pas du peuple ») : sa barre illustrée (packs d'Idan : scripts/build-hud-bars.js →
// hud-bars.js), réglée par culture dans l'Atelier des barres (Idan, 2026-11-14). Les mesures de l'image (en pixels) vont
// dans des variables CSS de chaque barre, qui placent ses morceaux ; les réglages des deux barres (en bandes B), sur la
// page (:root), car les lieux du camp s'arrêtent sous la barre du haut et au-dessus de celle du bas. Sans pack pour cette
// culture, un cadre provisoire ; sans anneau, le bouton Jour suivant seul.
const HUD_BAR_PIECES=["center","right"];
const HUD_BAR_VARS={h:"--hb-h",right:"--hb-rw",bandTop:"--hb-bt",band:"--hb-band",bandRight:"--hb-ri"};
const HUD_TOP_VARS={top:"--ht-top",haut:"--ht-haut",contenu:"--ht-s",fonds:"--ht-fonds",marge:"--ht-marge"};
const HUD_BOTTOM_VARS={artBas:"--bb-art-bas",artHaut:"--bb-art-haut",centre:"--bb-centre",bouton:"--bb-bouton",anneau:"--bb-anneau",
  picto:"--bb-picto",ecart:"--bb-ecart",pictosDroite:"--bb-pictos-droite",pictosY:"--bb-pictos-y",hauteur:"--bb-h"};
let hudBarShown=null;
function hudBarFor(culture){
  return culture&&typeof HUD_BARS==="object"&&HUD_BARS[culture]?HUD_BARS[culture]:null;
}
function hudFind(selector){
  return typeof document.querySelector==="function"?document.querySelector(selector):null;
}
function setHudVars(style,names,values){
  for(const [key,name] of Object.entries(names)){
    if(values&&values[key]!=null) style?.setProperty(name,String(values[key]));
    else style?.removeProperty(name);
  }
}
function applyHudBar(culture){
  const topBar=hudFind(".game-top-bar"),bottomBar=hudFind(".game-bottom-bar");
  const data=hudBarFor(culture);
  const key=data?culture:"";
  if((!topBar&&!bottomBar)||hudBarShown===key) return;
  hudBarShown=key;
  const bottom=data?.ornament&&data.bas?data:null;
  paintHudBar(topBar,culture,data);
  paintHudBar(bottomBar,culture,bottom);
  const root=document.documentElement?.style;
  setHudVars(root,HUD_TOP_VARS,data?.haut);
  setHudVars(root,HUD_BOTTOM_VARS,bottom?.bas);
  bottomBar?.classList.toggle("has-ornament",Boolean(bottom));
  const ring=hudFind(".hud-ornament");
  if(!ring) return;
  if(bottom) ring.setAttribute("src",`assets/hud/barres/${culture}/ornement.webp`);
  ring.hidden=!bottom;
}
function paintHudBar(bar,culture,data){
  if(!bar) return;
  bar.classList.toggle("has-art",Boolean(data));
  setHudVars(bar.style,HUD_BAR_VARS,data&&{...data,band:data.bandBottom-data.bandTop});
  for(const piece of HUD_BAR_PIECES){
    const node=bar.querySelector(".hud-bar-"+piece);
    if(node) node.style.backgroundImage=data?`url("assets/hud/barres/${culture}/${piece}.webp")`:"";
  }
}
// Le nom de la compagnie tient dans sa place : quand un grand ornement de barre (la toile des elfes noirs, le crâne des
// orcs) ou un long nom ne laisse pas assez de largeur, sa police rétrécit jusqu'à 80 %, puis il passe
// sur deux lignes ; au-delà de deux lignes, points de suspension.
let hudNameFitted="";
// Le nom déborde-t-il ? scrollWidth arrondit au pixel : un débordement d'une fraction de pixel suffit pourtant au navigateur
// pour couper le nom ; on compare donc aussi la largeur exacte du texte.
function hudNameOverflows(node){
  if(node.scrollWidth>node.clientWidth) return true;
  if(typeof document.createRange!=="function") return false;
  const range=document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect().width>node.getBoundingClientRect().width+.01;
}
function fitHudCompanyName(force=false){
  const node=$("hud-company");
  if(!node||typeof getComputedStyle!=="function") return;
  // Barre cachée (combat) : rien à mesurer ; on recommencera quand elle reviendra.
  if(!node.getClientRects().length) return;
  // La place dépend de l'écran et de la barre : on refait l'ajustement quand la largeur disponible change.
  const room=node.closest(".hud-top-content");
  const key=node.textContent+"|"+(room?Math.round(room.getBoundingClientRect().width):0);
  if(!force&&key===hudNameFitted) return;
  hudNameFitted=key;
  node.style.removeProperty("font-size");
  node.classList.remove("is-two-lines");
  let size=parseFloat(getComputedStyle(node).fontSize);
  const min=size*.8;
  while(hudNameOverflows(node)&&size>min){
    size=Math.max(min,size-.5);
    node.style.fontSize=size+"px";
  }
  if(hudNameOverflows(node)) node.classList.add("is-two-lines");
}
// Les chiffres de la barre du haut avec l'espace des milliers, comme sur la maquette d'Idan (« 10 000 »).
function hudNumber(n){ return Math.round(Number(n)||0).toLocaleString("fr-FR"); }
function renderHudIdentity(){
  const culture=game.campaign&&game.captain?.culture&&typeof pictoSlug==="function"?pictoSlug(game.captain.culture):"";
  if(culture) document.body.dataset.captainCulture=culture;
  else delete document.body.dataset.captainCulture;
  applyHudBar(culture);
}
function renderGameHud(){
  const hud=$("game-hud");
  const active=Boolean(game.campaign)&&["camp","mission"].includes(currentScreen());
  hud.classList.toggle("hidden",!active);
  renderHudIdentity();
  if(!active){$("game-pause").classList.add("hidden");hudGoldShown=null;return;}
  const company=game.campaign.company;
  const rules=typeof campaignRules==="function"?campaignRules():null;
  $("hud-company").textContent=company.name;
  fitHudCompanyName();
  $("hud-renown").innerHTML=rules?renderRenownStars(rules.companyRenown(game.campaign)):"";
  const gold=Math.round(company.gold);
  $("hud-gold").textContent=hudNumber(gold);
  // Les dettes (Idan, 2026-11-10 ; debts-ui.js) : la caisse ne descend plus sous 0 ; ce qui est dû passe en rouge.
  const debts=typeof debtTotal==="function"?debtTotal(game.campaign):0;
  $("hud-gold-stat").title="Trésor de la compagnie : "+fmt(gold)+" PO"+(debts?" · Dettes : "+fmt(debts)+" PO":"");
  $("hud-gold-stat").classList.toggle("hud-stat--debt",gold<0||debts>0);
  hudGoldDelta(gold);
  $("hud-upkeep").textContent=hudNumber(rules?rules.payroll(game.campaign):0)+" PO/j";
  // Places occupées au dortoir (un ogre en prend deux, un halfling, un gnome ou un gobelin une demi ; ni le capitaine ni
  // l'intendant).
  $("hud-roster").textContent=dormitoryPlacesText(rules?rules.dormitoryUsed(game.campaign):company.roster.length)+" / "+(company.camp?.dormitoryCapacity??"—");
  renderCampCalendar();
  const lines=gameActionMessages.slice(0,8);
  const last=$("hud-journal-last");
  const latest=lines[0]?lines[0].message:"";
  if(last.textContent!==latest){
    last.textContent=latest;
    last.title=latest;
    last.classList.remove("is-fresh");
    void last.offsetWidth;
    if(lines.length) last.classList.add("is-fresh");
  }
  $("game-action-lines").innerHTML=lines.map(x=>'<li><small>J'+(x.day||"—")+'</small> '+esc(x.message)+'</li>').join("");
}
// Les lieux de la barre du bas (Idan, 2026-11-14) : un clic ouvre le lieu, comme les boutons du château ; la Taverne a son
// menu (tavern-ui.js). Rien ne se passe sur le lieu où l'on est déjà.
function openHudScene(button){
  const scene=button.dataset.hudScene;
  if(button.disabled||button.id==="hud-tavern-btn"||document.body.dataset.campScene===scene) return;
  openCampScene(scene);
  gameAction(scene==="home"?"Retour au château.":"Destination : "+(button.dataset.destination||button.textContent.trim())+".");
}
function toggleHudJournal(open=!$("hud-journal").classList.contains("is-open")){
  $("hud-journal").classList.toggle("is-open",open);
  $("hud-console-toggle").setAttribute("aria-expanded",String(open));
}
function setPauseOpen(open){
  if(!game.campaign||!["camp","mission"].includes(currentScreen())) return;
  const pause=$("game-pause");
  pause.classList.toggle("hidden",!open);
  if(open) pause.querySelector('[data-pause-action="resume"]').focus();
}
function handlePauseAction(action){
  if(action==="resume"){setPauseOpen(false);return;}
  if(action==="save"){saveGame();gameAction("Sauvegarde demandée.");setPauseOpen(false);return;}
  if(action==="design"){window.location.assign("/design/");return;}
  if(action==="menu"){
    if(currentScreen()==="mission"){gameAction("Impossible de quitter au milieu d’un combat.");setPauseOpen(false);return;}
    setPauseOpen(false);backToMenu();
  }
}

function updateScreen(){
  const screen=currentScreen();
  const previous=document.body.dataset.screen;
  document.body.dataset.screen=screen;
  updateCampHomeIcon();
  renderGameHud();
  if(screen==="camp"&&previous!=="camp") openCampScene("home");
  if(typeof refreshMusic==="function") refreshMusic();
}

// Retour au menu depuis la création, le camp ou la fin de partie. La partie est sauvegardée :
// « Continuer » la reprend telle quelle. Jamais pendant un combat (bouton masqué en mission).
function backToMenu(){
  if(currentScreen()==="mission") return;
  if(game.campaign&&!game.campaign.gameOver) saveGame();
  game.campaign=null;
  game.captain=null;
  game.initialSquad=[];
  game.recruitTalk=null;
  if(typeof stopIntroVoice==="function") stopIntroVoice();
  if(typeof closeCreation==="function") closeCreation();
  for(const id of ["setup-panel","game-panel","game-over-panel","intro-panel","creation-wizard"]) $(id).classList.add("hidden");
  renderSaveStatus();
  renderGameHud();
}

// Fenêtres (Idan, 2026-10-24) : un clic à l'extérieur d'une fenêtre ouverte la ferme, comme Échap (même événement
// « cancel »). Le clic doit commencer et finir dehors : une sélection tirée hors de la fenêtre ne la ferme pas.
function outsideDialog(target,event){
  if(!(target instanceof HTMLDialogElement)||!target.open) return false;
  const r=target.getBoundingClientRect();
  return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;
}
let dialogBackdropPress=null;
function closeDialogsFromOutside(){
  document.addEventListener("pointerdown",event=>{
    dialogBackdropPress=outsideDialog(event.target,event)?event.target:null;
  },true);
  document.addEventListener("click",event=>{
    const dialog=event.target;
    if(dialog!==dialogBackdropPress||!outsideDialog(dialog,event)) return;
    dialogBackdropPress=null;
    if(dialog.dispatchEvent(new Event("cancel",{cancelable:true}))) dialog.close();
  });
}

function initializeScreenUi(){
  const observer=new MutationObserver(updateScreen);
  for(const [,id] of SCREEN_PANELS){
    const panel=document.getElementById(id);
    if(panel) observer.observe(panel,{attributes:true,attributeFilter:["class"]});
  }
  // Les lieux des barres : les pictos du bas, et les mercenaires de la barre du haut (« Mes mercenaires »).
  $("game-hud").addEventListener("click",event=>{
    const button=event.target.closest?.("[data-hud-scene]");
    if(button) openHudScene(button);
  });
  $("game-hud").addEventListener("keydown",event=>{
    const button=event.target.closest?.('[role="button"][data-hud-scene]');
    if(!button||(event.key!=="Enter"&&event.key!==" ")) return;
    event.preventDefault();
    openHudScene(button);
  });
  $("hud-pause-btn").addEventListener("click",()=>setPauseOpen(true));
  $("hud-console-toggle").addEventListener("click",()=>toggleHudJournal());
  window.addEventListener("resize",()=>fitHudCompanyName());
  for(const slot of document.querySelectorAll("#game-hud [data-hud-icon]")) slot.innerHTML=hudIcon(slot.dataset.hudIcon);
  $("game-pause").addEventListener("click",event=>{
    // Un clic hors du menu de pause reprend la partie, comme Échap.
    if(event.target===$("game-pause")){setPauseOpen(false);return;}
    const button=event.target.closest("[data-pause-action]");
    if(button&&!button.disabled)handlePauseAction(button.dataset.pauseAction);
  });
  document.addEventListener("keydown",event=>{
    if(event.key!=="Escape"||event.repeat) return;
    if(!$("game-pause").classList.contains("hidden")){event.preventDefault();setPauseOpen(false);return;}
    if(document.querySelector("dialog[open]")) return;
    if(game.campaign&&["camp","mission"].includes(currentScreen())){event.preventDefault();setPauseOpen(true);}
  });
  $("game-panel").addEventListener("click",event=>{
    const open=event.target.closest("[data-open-camp-scene]");
    if(open)gameAction("Destination : "+(open.dataset.destination||open.textContent.trim())+".");
  });
  $("game-panel")?.addEventListener("click",handleCampNavigation);
  document.addEventListener("click",closeCampSceneFromOutside);
  closeDialogsFromOutside();
  openCampScene("home");
  updateScreen();
}
