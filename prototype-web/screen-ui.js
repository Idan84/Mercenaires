"use strict";

// Écran courant sur <body data-screen> : accueil, création, camp, mission ou fin de partie.
// Il se déduit des panneaux visibles, sans toucher aux modules qui les affichent ; styles.css
// en tire la mise en page (accueil = logo + menu sur le château). Purement visuel.
const SCREEN_PANELS=[["mission","mission-panel"],["gameover","game-over-panel"],["creation","creation-wizard"],["intro","intro-panel"],["camp","game-panel"],["setup","setup-panel"]];
const CAMP_SCENES=["company","mercenaries","tavern","quartermaster"];

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
function renderGameHud(){
  const hud=$("game-hud");
  const active=Boolean(game.campaign)&&["camp","mission"].includes(currentScreen());
  hud.classList.toggle("hidden",!active);
  if(!active){$("game-pause").classList.add("hidden");return;}
  $("hud-company").textContent=game.campaign.company.name;
  $("hud-resources").textContent="Jour "+game.campaign.day+"  ·  "+Math.round(game.campaign.company.gold)+" PO";
  $("game-action-lines").innerHTML=gameActionMessages.slice(0,8).map(x=>'<li><small>J'+(x.day||"—")+'</small> '+esc(x.message)+'</li>').join("");
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
  if(["home","mission","gameover"].includes(screen)&&typeof stopTheme==="function") stopTheme();
}

// Retour au menu depuis la création, le camp ou la fin de partie. La partie est sauvegardée :
// « Continuer » la reprend telle quelle. Jamais pendant un combat (bouton masqué en mission).
function backToMenu(){
  if(currentScreen()==="mission") return;
  if(game.campaign&&!game.campaign.gameOver) saveGame();
  game.campaign=null;
  game.captain=null;
  game.initialSquad=[];
  game.tavernSelected=null;
  if(typeof stopIntroVoice==="function") stopIntroVoice();
  for(const id of ["setup-panel","game-panel","game-over-panel","intro-panel","creation-wizard"]) $(id).classList.add("hidden");
  renderSaveStatus();
  renderGameHud();
}

function initializeScreenUi(){
  const observer=new MutationObserver(updateScreen);
  for(const [,id] of SCREEN_PANELS){
    const panel=document.getElementById(id);
    if(panel) observer.observe(panel,{attributes:true,attributeFilter:["class"]});
  }
  $("camp-home-icon-btn").addEventListener("click",()=>{openCampScene("home");gameAction("Retour au château.");});
  $("hud-pause-btn").addEventListener("click",()=>setPauseOpen(true));
  $("hud-console-toggle").addEventListener("click",()=>{$("game-hud").classList.toggle("console-collapsed");});
  $("game-pause").addEventListener("click",event=>{
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
    if(open)gameAction("Destination : "+open.textContent.trim()+".");
  });
  $("game-panel")?.addEventListener("click",handleCampNavigation);
  openCampScene("home");
  updateScreen();
}
