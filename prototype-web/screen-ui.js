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

function updateScreen(){
  const screen=currentScreen();
  const previous=document.body.dataset.screen;
  document.body.dataset.screen=screen;
  updateCampHomeIcon();
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
}

function initializeScreenUi(){
  const observer=new MutationObserver(updateScreen);
  for(const [,id] of SCREEN_PANELS){
    const panel=document.getElementById(id);
    if(panel) observer.observe(panel,{attributes:true,attributeFilter:["class"]});
  }
  $("back-to-menu-btn").addEventListener("click",backToMenu);
  $("camp-home-icon-btn").addEventListener("click",()=>openCampScene("home"));
  $("game-panel")?.addEventListener("click",handleCampNavigation);
  openCampScene("home");
  updateScreen();
}
