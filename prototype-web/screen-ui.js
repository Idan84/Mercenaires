"use strict";

// Écran courant sur <body data-screen> : accueil, création, camp, mission ou fin de partie.
// Il se déduit des panneaux visibles, sans toucher aux modules qui les affichent ; styles.css
// en tire la mise en page (accueil = logo + menu sur le château). Purement visuel.
const SCREEN_PANELS=[["mission","mission-panel"],["gameover","game-over-panel"],["creation","creation-wizard"],["intro","intro-panel"],["camp","game-panel"],["setup","setup-panel"]];
const CAMP_SCENES=["company","dormitory","mercenaries","tavern","quartermaster"];

function updateCampHomeIcon(){
  const button=document.getElementById("camp-home-icon-btn");
  if(!button) return;
  button.classList.toggle("hidden",document.body.dataset.screen!=="camp"||document.body.dataset.campScene==="home");
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
// Barre du bas (Idan, 2026-10-21) : infos principales à gauche, date et « Jour suivant » au centre,
// journal à droite. Icônes au trait, dans le style de rosterMetricIcon : aucun nouvel asset visuel.
const HUD_ICONS={
  gold:'<ellipse cx="12" cy="6.3" rx="7.5" ry="3.3"/><path d="M4.5 6.3v5.1c0 1.8 3.4 3.3 7.5 3.3s7.5-1.5 7.5-3.3V6.3M4.5 11.4v5.1c0 1.8 3.4 3.3 7.5 3.3s7.5-1.5 7.5-3.3v-5.1"/>',
  upkeep:'<path d="M4 8.5h16"/><path d="M5.6 8.5c-.4 4.2 2.4 7 6.4 7s6.8-2.8 6.4-7"/><path d="M4 8.5 2.8 7M20 8.5 21.2 7"/><path d="M8.2 21c-.9-1.3.6-2 .3-3.4M12 21c-1-1.5.8-2.3.3-3.9M15.8 21c-.9-1.3.6-2 .3-3.4"/><path d="M10.3 5.6c0-1 .8-1.3.8-2.3M13.7 5.6c0-1 .8-1.3.8-2.3"/>',
  roster:'<path d="M4 4l11 11M20 4 9 15"/><path d="m12.6 17.4 4.8-4.8M6.6 12.6l4.8 4.8"/><path d="m16.3 16.3 3.2 3.2M7.7 16.3l-3.2 3.2"/>',
  journal:'<path d="M7 4.5h10.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H16v9.5a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2H8"/><path d="M7 4.5a2 2 0 0 0-2 2v9.5M10 9h3M10 12.5h3"/>',
  play:'<path d="M9 5.8v12.4l9.6-6.2z" fill="currentColor" stroke="none"/>'
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
function renderGameHud(){
  const hud=$("game-hud");
  const active=Boolean(game.campaign)&&["camp","mission"].includes(currentScreen());
  hud.classList.toggle("hidden",!active);
  if(!active){$("game-pause").classList.add("hidden");hudGoldShown=null;return;}
  const company=game.campaign.company;
  const rules=typeof campaignRules==="function"?campaignRules():null;
  $("hud-company").textContent=company.name;
  $("hud-renown").innerHTML=rules?renderRenownStars(rules.companyRenown(game.campaign)):"";
  const gold=Math.round(company.gold);
  $("hud-gold").textContent=fmt(gold);
  $("hud-gold-stat").title="Trésor de la compagnie : "+fmt(gold)+" PO";
  $("hud-gold-stat").classList.toggle("hud-stat--debt",gold<0);
  hudGoldDelta(gold);
  $("hud-upkeep").textContent=fmt(Math.round(rules?rules.payroll(game.campaign):0))+" PO/j";
  // Places occupées au dortoir (un ogre en prend deux, un halfling, un gnome ou un gobelin une demi ; ni le capitaine ni
  // l'intendant).
  $("hud-roster").textContent=dormitoryPlacesText(rules?rules.dormitoryUsed(game.campaign):company.roster.length)+" / "+(company.camp?.dormitoryCapacity??"—");
  renderCampCalendar();
  const lines=gameActionMessages.slice(0,8);
  const last=$("hud-journal-last");
  const latest=lines[0]?lines[0].message:"Aucune nouvelle.";
  if(last.textContent!==latest){
    last.textContent=latest;
    last.title=latest;
    last.classList.remove("is-fresh");
    void last.offsetWidth;
    if(lines.length) last.classList.add("is-fresh");
  }
  $("game-action-lines").innerHTML=lines.map(x=>'<li><small>J'+(x.day||"—")+'</small> '+esc(x.message)+'</li>').join("");
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
  $("camp-home-icon-btn").addEventListener("click",()=>{openCampScene("home");gameAction("Retour au château.");});
  $("hud-pause-btn").addEventListener("click",()=>setPauseOpen(true));
  $("hud-console-toggle").addEventListener("click",()=>toggleHudJournal());
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
  closeDialogsFromOutside();
  openCampScene("home");
  updateScreen();
}
