"use strict";

// Sauvegarde automatique de la partie dans le navigateur (localStorage).
// Sont sauvegardés : l'état de partie (compagnie, Taverne, jour), le journal de la Taverne et les nouvelles du jour (le
// pigeon de la barre du bas les rouvre ; une partie d'avant n'en a pas : « Rien à signaler » jusqu'au lendemain).
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
    localStorage.setItem(SAVE_KEY,MercenairesCampaign.serializeCampaign(game.campaign,{tavernLog:game.tavernLog||[],dayNews:game.dayNews||null}));
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
  // Vaincu par ses mutins (Idan, 2026-11-10 : « S'il perd. Game Over ! »), même s'il a survécu.
  const reason=game.campaign?.gameOver?.reason,female=String(game.captain?.sex||"").trim().toLowerCase().startsWith("f");
  // Vaincu par les voleurs de l'usurier (Idan, 2026-11-11), même s'il a survécu.
  const beaten=reason==="mutiny"?"par ses mutins":reason==="usurer"?"par les hommes de l’usurier":null;
  game.campaign=null;
  game.captain=null;
  game.initialSquad=[];
  game.mission=null;
  game.tavernLog=[];
  game.dayNews=null;
  game.recruitTalk=null;
  $("game-panel").classList.add("hidden");
  $("game-over-text").textContent=`${name} ${beaten?`a été ${female?"vaincue":"vaincu"} ${beaten}`:"est mort"}${day?" au jour "+day:""}. La compagnie est dissoute et la sauvegarde a été effacée.`;
  $("game-over-panel").classList.remove("hidden");
  renderSaveStatus();
}

function continueSavedGame(){
  const save=savedGame();
  if(!save?.ok){ alert(save?.reason||"Aucune sauvegarde."); renderSaveStatus(); return; }
  const roster=save.state.company.roster;
  game.campaign=save.state;
  // Parties antérieures : noms changés (cultures, armes), contrats initiaux, stock d'armes, avatars et bios complétés (tous,
  // sans court-circuit). Les noms avant l'avatar, qui en dépend ; l'avatar avant la bio : le sexe vient de l'image.
  const migrated=[campaignRules().ensureRenamedNames(game.campaign),campaignRules().ensureInitialContracts(game.campaign),campaignRules().ensureStartingStock(game.campaign),campaignRules().ensureHalvedMissionBonuses(game.campaign),campaignRules().ensureTwoHandedGrips(game.campaign),campaignRules().ensureOneHandedStyle(game.campaign),campaignRules().ensureArmorPorts(game.campaign),campaignRules().ensureHistories(game.campaign),campaignRules().ensureAvatars(game.campaign),campaignRules().ensureBiographies(game.campaign),campaignRules().fillTavernBoard(game.campaign)].some(Boolean);
  game.captain=roster.find(m=>m.id===save.state.company.captainId)||roster[0];
  game.initialSquad=roster.filter(m=>m!==game.captain&&(!m.contract||m.contract.initial));
  game.generated=[];
  game.mission=null;
  game.tavernLog=save.extra.tavernLog||[];
  game.dayNews=save.extra.dayNews||null;
  game.recruitTalk=null;
  // Bios ajoutées à une ancienne partie : on les sauvegarde tout de suite pour qu'elles ne changent plus.
  if(migrated) saveGame();
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

// « Continuer » (menu principal) : actif s'il existe une sauvegarde, grisé sinon.
function renderSaveStatus(){
  const status=$("save-status");
  status.textContent=game.saveError||(game.campaign?"Sauvegarde automatique":"");
  status.classList.toggle("save-error",Boolean(game.saveError));
  const save=game.campaign?null:savedGame();
  $("continue-game-btn").disabled=!save?.ok;
  $("continue-game-detail").textContent=save?.ok?`${save.state.company.name} · jour ${save.state.day}`:"";
}

function initializeSaveUi(){
  $("continue-game-btn").addEventListener("click",continueSavedGame);
  renderSaveStatus();
}
