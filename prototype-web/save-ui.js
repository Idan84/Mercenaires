"use strict";

// Sauvegarde automatique de la partie dans le navigateur (localStorage).
// Sont sauvegardés : l'état de partie (compagnie, Taverne, jour) et le journal de la Taverne.
// Ne sont pas sauvegardés : un combat en cours et le banc de test du générateur.

const SAVE_KEY="mercenaires.save.v1";

function readSavedText(){
  try{ return localStorage.getItem(SAVE_KEY); }catch(error){ return null; }
}

function savedGame(){
  const text=readSavedText();
  return text?MercenairesCampaign.restoreCampaign(text):null;
}

function saveGame(){
  if(!game.campaign||game.campaign.gameOver) return;
  try{
    localStorage.setItem(SAVE_KEY,MercenairesCampaign.serializeCampaign(game.campaign,{tavernLog:game.tavernLog||[]}));
    game.saveError=null;
  }catch(error){
    game.saveError="Sauvegarde impossible : "+(error.message||error);
    console.warn(game.saveError);
  }
  renderSaveStatus();
}

// Mort du capitaine = Game Over : la sauvegarde est effacée (décision Idan, 2026-10-03).
function deleteSavedGame(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(error){ console.warn(error); }
}

function showGameOver(){
  const name=game.captain?.name||"Le capitaine";
  const day=game.campaign?.day;
  game.campaign=null;
  game.captain=null;
  game.initialSquad=[];
  game.mission=null;
  game.tavernLog=[];
  game.tavernSelected=null;
  $("game-panel").classList.add("hidden");
  $("game-over-text").textContent=`${name} est mort${day?" au jour "+day:""}. La compagnie est dissoute et la sauvegarde a été effacée.`;
  $("game-over-panel").classList.remove("hidden");
  renderSaveStatus();
}

function continueSavedGame(){
  const save=savedGame();
  if(!save?.ok){ alert(save?.reason||"Aucune sauvegarde."); renderSaveStatus(); return; }
  const roster=save.state.company.roster;
  game.campaign=save.state;
  game.captain=roster.find(m=>m.id===save.state.company.captainId)||roster[0];
  game.initialSquad=roster.filter(m=>m!==game.captain&&!m.contract);
  game.generated=[];
  game.mission=null;
  game.tavernLog=save.extra.tavernLog||[];
  game.tavernSelected=null;
  $("game-over-panel").classList.add("hidden");
  renderGame();
  renderSaveStatus();
}

// Une nouvelle partie remplace la sauvegarde : on demande confirmation.
function confirmOverwriteSave(){
  const save=savedGame();
  if(!save?.ok) return true;
  return confirm(`Une partie est sauvegardée (${save.state.company.name}, jour ${save.state.day}). La remplacer par une nouvelle partie ?`);
}

// Le bouton « Continuer » n'apparaît qu'au démarrage, tant qu'aucune partie n'est en cours.
function renderSaveStatus(){
  const status=$("save-status");
  status.textContent=game.saveError||(game.campaign?"Sauvegarde automatique":"");
  status.classList.toggle("save-error",Boolean(game.saveError));
  const btn=$("continue-game-btn");
  if(game.campaign){ btn.classList.add("hidden"); return; }
  const save=savedGame();
  btn.classList.toggle("hidden",!save?.ok);
  if(save?.ok) btn.textContent=`Continuer — ${save.state.company.name}, jour ${save.state.day}`;
}

function initializeSaveUi(){
  $("continue-game-btn").addEventListener("click",continueSavedGame);
  renderSaveStatus();
}
