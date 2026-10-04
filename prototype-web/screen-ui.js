"use strict";

// Écran courant sur <body data-screen> : accueil, création, camp, mission ou fin de partie.
// Il se déduit des panneaux visibles, sans toucher aux modules qui les affichent ; styles.css
// en tire la mise en page (accueil = logo + menu sur le château). Purement visuel.
const SCREEN_PANELS=[["mission","mission-panel"],["gameover","game-over-panel"],["creation","creation-wizard"],["intro","intro-panel"],["camp","game-panel"],["setup","setup-panel"]];

function currentScreen(){
  for(const [screen,id] of SCREEN_PANELS){
    const panel=document.getElementById(id);
    if(panel&&!panel.classList.contains("hidden")) return screen;
  }
  return "home";
}

function updateScreen(){
  const screen=currentScreen();
  document.body.dataset.screen=screen;
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
  updateScreen();
}
