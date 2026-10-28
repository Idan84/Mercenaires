"use strict";

const HEX_DIRS=[
  {q:1,r:0},{q:1,r:-1},{q:0,r:-1},
  {q:-1,r:0},{q:-1,r:1},{q:0,r:1}
];
// Carte rectangulaire en coordonnées « offset » (lignes impaires décalées) ; la logique reste en axial (q, r).
const MISSION_MAP={cols:13,rows:9,size:34,spawnRows:[3,4,5],spawnInset:2};
// Taille de la carte : 13 × 9 pour la Mission Test, plus grande pour un contrat (doc 17, « Faire le ménage » : 20 × 12).
function setMissionMapSize({cols=13,rows=9}={}){ MISSION_MAP.cols=cols; MISSION_MAP.rows=rows; }
function missionColumn(q,r){ return q+((r-(r&1))>>1); }
function missionAxial(col,r){ return {q:col-((r-(r&1))>>1),r}; }
function missionCells(){
  const cells=[];
  for(let r=0;r<MISSION_MAP.rows;r++) for(let col=0;col<MISSION_MAP.cols;col++) cells.push(missionAxial(col,r));
  return cells;
}

function missionKey(q,r){ return q+","+r; }
function validMissionHex(q,r){ const col=missionColumn(q,r); return r>=0&&r<MISSION_MAP.rows&&col>=0&&col<MISSION_MAP.cols; }
function missionNeighbors(c){ return HEX_DIRS.map(d=>({q:c.q+d.q,r:c.r+d.r})).filter(n=>validMissionHex(n.q,n.r)); }
function missionUnits(){ return game.mission?[...game.mission.players,...game.mission.enemies]:[]; }
function livingMissionUnits(team){ return (team==="player"?game.mission.players:game.mission.enemies).filter(u=>u.alive); }
function missionActiveUnit(){ return game.mission?.activeUnit||null; }
function missionOpponents(unit){ return livingMissionUnits(unit.team==="player"?"enemy":"player"); }
function missionEncircled(unit){ return game.mission.engine.isEncircled(unit,missionOpponents(unit)); }

function occupiedMissionKeys(except=null){
  const keys=new Set(missionUnits().filter(u=>u.alive&&u!==except).map(u=>missionKey(u.q,u.r)));
  for(const t of game.mission?.terrain||[]) keys.add(missionKey(t.q,t.r));
  return keys;
}
// Flaque de magma (doc 12) : une case infranchissable jusqu'au tour untilTurn (exclu).
function missionTerrainAt(q,r){ return (game.mission?.terrain||[]).find(t=>t.q===q&&t.r===r)||null; }
// Brouillard (doc 12) : des cases qui coupent la ligne de vue jusqu'au tour untilTurn (exclu) ; on y passe librement.
function missionFogAt(q,r){ return (game.mission?.fog||[]).find(f=>f.q===q&&f.r===r)||null; }
// Ligne de vue (doc 04 et 12) : seul le Brouillard la coupe pour l'instant, dès qu'une case de la ligne droite entre
// les deux, extrémités comprises, est dans le brouillard. Elle compte pour les tirs et les sorts.
function missionLineOfSight(a,b){
  if(!game.mission?.fog?.length||!a||!b) return true;
  return !game.mission.engine.hexLine(a,b).some(c=>missionFogAt(c.q,c.r));
}
function pruneMissionTerrain(){
  const m=game.mission;
  if(m?.terrain?.length){
    const ended=m.terrain.filter(t=>m.turn>=t.untilTurn);
    m.terrain=m.terrain.filter(t=>m.turn<t.untilTurn);
    for(const t of ended) missionLog("La flaque de magma refroidit : la case est de nouveau praticable.","magic");
  }
  if(m?.fog?.length){
    const before=m.fog.length;
    m.fog=m.fog.filter(f=>m.turn<f.untilTurn);
    if(m.fog.length<before) missionLog("Le brouillard se dissipe.","magic");
  }
  // Champ de protection (Télékinésie) : 4 tours, jusqu'au début du tour indiqué.
  for(const u of m?missionUnits():[]){
    if(!u.projectileShield||m.turn<u.projectileShield.untilTurn) continue;
    u.projectileShield=null;
    if(u.alive) missionLog("Le champ de protection de "+u.character.name+" se dissipe.","magic");
  }
}

// Discrétion (doc 04 ; Idan, 2026-10-28) : au début du combat, personne n'a vu personne, tout le monde est camouflé.
function startMissionCamouflage(){
  for(const u of missionUnits()) u.camouflaged=true;
  missionLog("Personne ne s’est encore vu : tout le monde est camouflé. Au début de chaque tour, chacun cherche les ennemis qu’il a en vue.","info");
  resolveMissionDetection();
}
// Au début de chaque tour, chaque personnage teste chaque ennemi encore camouflé dans sa ligne de vue ; un seul succès le
// révèle à toute l'armée ennemie, pour toute la partie. Un camouflé n'est pas ciblable, mais il attaque, tire et lance
// ses sorts sans se découvrir.
function resolveMissionDetection(){
  const m=game.mission,e=m.engine;
  for(const observer of missionUnits()){
    if(!observer.alive||observer.offMap) continue;
    for(const target of missionOpponents(observer)){
      if(!target.camouflaged||target.offMap||!missionLineOfSight(observer,target)) continue;
      const r=e.rollDetection(observer,target,e.axialDistance(observer,target));
      if(!r.spotted) continue;
      target.camouflaged=false;
      missionLog(observer.character.name+" repère "+target.character.name+" ("+missionPercent(r.p)+", jet "+r.roll+").","info");
    }
  }
  const hidden=team=>livingMissionUnits(team).filter(u=>u.camouflaged).map(u=>u.character.name);
  const ours=hidden("player"),theirs=hidden("enemy");
  if(ours.length||theirs.length) missionLog("Toujours camouflés"+(ours.length?" — vos hommes : "+ours.join(", "):"")+(theirs.length?" — ennemis : "+theirs.join(", "):"")+".","info");
}
// Un ennemi camouflé est invisible pour son adversaire.
function missionHiddenFrom(target,observer){ return Boolean(target?.camouflaged)&&target.team!==observer?.team; }

function shortestMissionPath(start,end,except=null){
  const blocked=occupiedMissionKeys(except);
  const startKey=missionKey(start.q,start.r),endKey=missionKey(end.q,end.r);
  if(blocked.has(endKey)) return null;

  const queue=[{q:start.q,r:start.r}],came=new Map([[startKey,null]]);
  while(queue.length){
    const cur=queue.shift(),key=missionKey(cur.q,cur.r);
    if(key===endKey) break;
    for(const next of missionNeighbors(cur)){
      const nk=missionKey(next.q,next.r);
      if(came.has(nk)||blocked.has(nk)) continue;
      came.set(nk,key);
      queue.push(next);
    }
  }
  if(!came.has(endKey)) return null;

  const path=[];
  let cursor=endKey;
  while(cursor!==startKey){
    const [q,r]=cursor.split(",").map(Number);
    path.unshift({q,r});
    cursor=came.get(cursor);
  }
  return path;
}

function missionHexPixel(q,r){
  const s=MISSION_MAP.size;
  return {x:44+Math.sqrt(3)*s*(q+r/2),y:44+1.5*s*r};
}

function makeMissionUnit(character,team,index){
  const col=team==="player"?MISSION_MAP.spawnInset:MISSION_MAP.cols-1-MISSION_MAP.spawnInset;
  const spawn=missionAxial(col,MISSION_MAP.spawnRows[index]);
  // Aura du capitaine (Idan, 2026-10-24) : le capitaine de la compagnie, s'il part en mission ; et celle des lieutenants
  // (Idan, 2026-10-25).
  const captainId=game.campaign?game.campaign.company.captainId:game.captain?.id;
  const lieutenantIds=game.campaign?.company.lieutenantIds||[];
  // PV max au départ de la mission, avec l'équipement et la Constitution gagnée (Idan, 2026-10-25).
  const pvMax=combatEngine().maxHp({character,activeSet:1});
  return {
    id:team+"-"+character.id+"-"+index,
    character,team,q:spawn.q,r:spawn.r,isCaptain:team==="player"&&captainId!=null&&character.id===captainId,
    isLieutenant:team==="player"&&lieutenantIds.includes(character.id),
    hp:pvMax,pvMax,alive:true,activeSet:1,prone:false,
    acted:false,movementRemaining:0,attackAvailable:true,quickAvailable:true,
    fleeing:false,fleeTurn:0,offMap:false,damageTaken:0
  };
}

function missionLog(message,kind="info"){
  if(!game.mission) return;
  game.mission.log.push({message,kind});
  if(game.mission.log.length>180) game.mission.log.shift();
}

function sortMissionInitiative(units,engine){
  return [...units].sort((a,b)=>{
    const ai=engine.initiative(a),bi=engine.initiative(b);
    if(bi!==ai) return bi-ai;
    const ac=Number(a.character.stats.Courage)||0,bc=Number(b.character.stats.Courage)||0;
    return bc-ac||String(a.id).localeCompare(String(b.id));
  });
}

function resetMissionActivation(unit){
  tickMissionPoison(unit);
  tickMissionChill(unit);
  tickMissionBuffs(unit);
  unit.movementRemaining=game.mission.engine.movementBase(unit);
  unit.attackAvailable=true;
  unit.quickAvailable=true;
  unit.prone=false;
  unit.secondMove=false;
  tickMissionRegeneration(unit);
  tickMissionEnchantments(unit);
}

// Un blessé ou un fatigué de la compagnie ne peut pas partir en mission (10-mission-time §4 à §6).
function recoveryLabel(c){
  if(!c.recovery) return "";
  return (c.recovery.kind==="wounded"?"Blessé":"Fatigué")+" · "+c.recovery.daysLeft+" j";
}

// Mission Test : exactement 3 personnages. Contrat de la Taverne (doc 17) : de 1 à 20 mercenaires, au choix du joueur,
// avec le coût des primes s'ils reviennent tous.
function openMissionSelection(contract=null){
  // Garde du corps (Idan, 2026-10-25) : exactement le nombre demandé, du niveau de réputation demandé.
  if(contract&&contract.kind==="bodyguard") return openBodyguardSelection(contract);
  game.missionSelect=contract&&typeof contract==="object"&&contract.camp?{contract,min:1,max:20}:{contract:null,min:3,max:3};
  const {min,max}=game.missionSelect;
  $("mission-select-eyebrow").textContent=game.missionSelect.contract?"Contrat · "+game.missionSelect.contract.name:"Mission Test";
  $("mission-select-title").textContent=game.missionSelect.contract?"Choisir l’escouade ("+min+" à "+max+")":"Choisir 3 mercenaires";
  // L'intendant ne part plus en mission (Idan, 2026-10-24) ; un mercenaire déjà en expédition non plus (doc 17).
  const away=c=>game.campaign&&campaignRules().expeditionOf(game.campaign,c.id);
  const eligible=allCharacters().filter(c=>(!game.campaign||c.id!==game.campaign.company.intendantId)&&!away(c));
  const available=eligible.filter(c=>!c.recovery);
  const preselected=new Set(game.missionSelect.contract?[]:available.slice(0,3));
  $("mission-select-list").innerHTML=eligible.map(c=>`
    <label class="mission-pick${c.recovery?" unavailable":""}">
      <input type="checkbox" value="${c.id}" ${preselected.has(c)?"checked":""} ${c.recovery?"disabled":""}>
      ${renderAvatar(c,{variant:"compact",kind:"portrait"})}
      <span><strong>${esc(c.name)}</strong><small>${esc(c.people)} · ${esc(c.equipment?.profile?.type||"")}${c.recovery?" · "+esc(recoveryLabel(c)):""}</small></span>
      <em>${combatEngine().maxHp({character:c,activeSet:1})} PV</em>
    </label>
  `).join("");

  $("mission-select-error").textContent=available.length<min
    ?"Il faut au moins "+min+" personnage"+(min>1?"s":"")+" disponible"+(min>1?"s":"")+". Passe des jours pour soigner les blessés, ou génère quelques candidats de test."
    :"";
  updateMissionSelectionCount();
  $("mission-select-dialog").showModal();
}

function openBodyguardSelection(offer){
  const c=game.campaign,rules=campaignRules();
  game.missionSelect={bodyguard:offer,contract:null,min:offer.count,max:offer.count};
  $("mission-select-eyebrow").textContent="Garde du corps · "+offer.client;
  $("mission-select-title").textContent="Choisir "+(offer.count>1?"les "+offer.count+" gardes":"le garde");
  const members=c.company.roster.filter(m=>m.id!==c.company.captainId&&m.id!==c.company.intendantId&&!rules.expeditionOf(c,m.id));
  $("mission-select-list").innerHTML=members.map(m=>{
    const allowed=rules.canGuard(c,m,offer);
    return `<label class="mission-pick${allowed.ok?"":" unavailable"}">
      <input type="checkbox" value="${m.id}" ${allowed.ok?"":"disabled"}>
      ${renderAvatar(m,{variant:"compact",kind:"portrait"})}
      <span><strong>${esc(m.name)}</strong><small>${allowed.ok?"Salaire "+fmt(Number(m.contract?.dailySalary)||0)+" PO/j · prime "+fmt(Number(m.contract?.missionBonus)||0)+" PO":esc(allowed.reason)}</small></span>
      <em>${renderReputationStars(m)}</em>
    </label>`;
  }).join("");
  const ready=members.filter(m=>rules.canGuard(c,m,offer).ok).length;
  $("mission-select-error").textContent=ready<offer.count?"Pas assez de mercenaires disponibles de ce niveau de réputation.":"";
  updateMissionSelectionCount();
  $("mission-select-dialog").showModal();
}

function updateMissionSelectionCount(){
  const {min,max,contract,bodyguard}=game.missionSelect||{min:3,max:3,contract:null};
  const checked=[...document.querySelectorAll("#mission-select-list input:checked")];
  if(checked.length>max) checked[checked.length-1].checked=false;
  const ids=[...document.querySelectorAll("#mission-select-list input:checked")].map(x=>Number(x.value));
  $("mission-select-count").textContent=ids.length+"/"+max;
  $("start-mission-btn").disabled=ids.length<min||ids.length>max;
  // Primes de mission versées au retour (doc 09 §6) : le joueur pèse ce que coûte une grosse escouade.
  const bonus=ids.map(id=>allCharacters().find(c=>c.id===id)).reduce((sum,c)=>sum+(Number(c?.contract?.missionBonus)||0),0);
  if(bodyguard){
    $("mission-select-cost").textContent="Paiement d’avance : "+fmt(bodyguard.payment)+" PO · primes au retour : "+fmt(bonus)+" PO · absents "+bodyguard.days+" jours ; pas de combat.";
    return;
  }
  $("mission-select-cost").textContent=contract
    ?"Primes si tous reviennent : "+fmt(bonus)+" PO, versées au retour · marche : "+contract.distance+" jour"+(contract.distance>1?"s":"")+" à l’aller, autant au retour ; le camp continue pendant ce temps."
    :"";
}

function startMissionFromSelection(){
  const {min,max,contract}=game.missionSelect||{min:3,max:3,contract:null};
  const ids=[...document.querySelectorAll("#mission-select-list input:checked")].map(x=>Number(x.value));
  if(ids.length<min||ids.length>max) return;
  const chosen=ids.map(id=>allCharacters().find(c=>c.id===id)).filter(Boolean);
  if(chosen.length!==ids.length) return;
  if(game.missionSelect?.bodyguard) return departBodyguards(chosen);
  if(contract) return departContractSquad(chosen);
  setMissionMapSize();

  const enemyChars=Array.from({length:3},()=>createCharacter({role:"Ennemi test"}));
  const engine=MercenairesCombat.createCombatEngine(game.referenceData,{onAttack:MercenairesProgression.recordAttack});
  const endRules=MercenairesMissionEnd.createMissionEndRules({reference:game.referenceData});
  const progression=MercenairesProgression.createProgressionRules({reference:game.referenceData});
  const players=chosen.map((c,i)=>makeMissionUnit(c,"player",i));
  const enemies=enemyChars.map((c,i)=>makeMissionUnit(c,"enemy",i));

  game.mission={
    engine,endRules,progression,players,enemies,
    playerOrder:sortMissionInitiative(players,engine),
    enemyOrder:sortMissionInitiative(enemies,engine),
    activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null
  };

  $("mission-select-dialog").close();
  $("game-panel").classList.add("hidden");
  $("mission-panel").classList.remove("hidden");
  missionLog("Mission Test : votre équipe joue en premier.","turn");
  missionLog("Ennemis générés : "+enemies.map(u=>u.character.name).join(", ")+".");
  startMissionCamouflage();
  selectNextMissionPlayer();
}

// Garde du corps : le paiement arrive tout de suite ; les gardes reviennent au bout de la durée.
function departBodyguards(chosen){
  const result=campaignRules().departBodyguard(game.campaign,chosen.map(c=>c.id));
  if(!result.ok){ $("mission-select-error").textContent=result.reason; return; }
  $("mission-select-dialog").close();
  const e=result.expedition;
  tavernLog(chosen.map(c=>c.name).join(", ")+" part"+(chosen.length>1?"ent":"")+" en garde du corps ("+e.offer.client.toLocaleLowerCase("fr")+") pour "+e.offer.days+" jours : +"+fmt(result.gold)+" PO payés d’avance.","gear");
  saveGame();
  renderGame();
  if(typeof renderContractBoard==="function") renderContractBoard();
}

// Contrat « Faire le ménage » (doc 17, Idan 2026-10-24) : l'escouade part, le joueur continue de gérer son camp. À son
// arrivée (au bout des jours de marche), le combat attend : « Commencer le combat ».
function departContractSquad(chosen){
  const result=campaignRules().departExpedition(game.campaign,chosen.map(c=>c.id));
  if(!result.ok){ $("mission-select-error").textContent=result.reason; return; }
  $("mission-select-dialog").close();
  const e=result.expedition,days=e.offer.distance;
  tavernLog("L’escouade de "+chosen.length+" mercenaire"+(chosen.length>1?"s":"")+" part pour le "+e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu+" : arrivée dans "+days+" jour"+(days>1?"s":"")+".","turn");
  saveGame();
  renderGame();
  if(typeof renderContractBoard==="function") renderContractBoard();
}

// Le combat de l'expédition, à son arrivée : le camp gobelin sur une carte plus grande ; votre équipe a l'initiative (elle
// joue la première).
function startExpeditionCombat(expeditionId){
  const e=(game.campaign?.expeditions||[]).find(x=>x.id===expeditionId);
  if(!e||e.status!=="arrived") return;
  const chosen=e.memberIds.map(id=>game.campaign.company.roster.find(m=>m.id===id)).filter(Boolean);
  if(!chosen.length) return;
  const offer=e.offer;
  setMissionMapSize(missionRules().mapSize(offer));
  const enemyChars=missionRules().buildEnemies(offer,arch=>createCharacter({forcedPeople:arch.peuple,forcedCulture:arch.culture,role:arch.nom}));
  const engine=MercenairesCombat.createCombatEngine(game.referenceData,{onAttack:MercenairesProgression.recordAttack});
  const endRules=MercenairesMissionEnd.createMissionEndRules({reference:game.referenceData});
  const progression=MercenairesProgression.createProgressionRules({reference:game.referenceData});
  const players=placeMissionArmy(chosen.map((c,i)=>makeMissionUnit(c,"player",i%3)),"player");
  const enemies=placeMissionArmy(enemyChars.map((c,i)=>makeMissionUnit(c,"enemy",i%3)),"enemy");
  game.mission={
    engine,endRules,progression,players,enemies,contract:offer,expeditionId:e.id,
    playerOrder:sortMissionInitiative(players,engine),
    enemyOrder:sortMissionInitiative(enemies,engine),
    activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null
  };
  $("expedition-dialog")?.close?.();
  $("game-panel").classList.add("hidden");
  $("mission-panel").classList.remove("hidden");
  missionLog(offer.name+" : le "+offer.campName.toLocaleLowerCase("fr")+" de "+offer.fields.lieu+". Votre équipe a l’initiative.","turn");
  missionLog("Dans le camp : "+enemies.map(u=>u.character.name).join(", ")+".");
  startMissionCamouflage();
  selectNextMissionPlayer();
}

// Déploiement : votre escouade en colonnes sur le bord gauche, du centre vers les bords ; le camp ennemi à droite, le
// chef au fond et les autres devant lui.
function placeMissionArmy(units,team){
  const {cols,rows}=MISSION_MAP,mid=Math.floor(rows/2);
  const order=[...Array(rows).keys()].sort((a,b)=>Math.abs(a-mid)-Math.abs(b-mid)||a-b);
  const put=(u,col,row)=>{ const cell=missionAxial(col,row); u.q=cell.q; u.r=cell.r; };
  if(team==="player"){
    units.forEach((u,i)=>put(u,1+Math.floor(i/rows),order[i%rows]));
    return units;
  }
  const chief=units[units.length-1],others=units.slice(0,-1);
  put(chief,cols-2,mid);
  const perCol=Math.max(1,Math.min(rows,Math.max(3,Math.ceil(others.length/2))));
  others.forEach((u,i)=>put(u,cols-4-Math.floor(i/perCol),order[i%perCol]));
  return units;
}

function selectNextMissionPlayer(){
  const m=game.mission;
  if(!m||m.over) return;
  for(;;){
    const next=m.playerOrder.find(u=>u.alive&&!u.acted);
    if(!next){ runMissionEnemyTurn(); return; }
    resetMissionActivation(next);
    // Mort du poison au début de son activation.
    if(!next.alive){ next.acted=true; if(m.over){ renderMission(); return; } continue; }
    m.progression.recordActivation(next);
    // Frénésie (Illusion) : il joue seul cette activation.
    if(next.frenzy){
      m.actingUnit=next;
      try{ frenzyMissionActivation(next); }finally{ m.actingUnit=null; }
      next.acted=true;
      if(m.over){ renderMission(); return; }
      continue;
    }
    if(next.fleeing&&resolveMissionFleeingActivation(next)){
      next.acted=true;
      if(m.over){ renderMission(); return; }
      continue;
    }
    m.phase="player";
    m.activeUnit=next;
    m.mode=null;
    missionLog("Activation de "+next.character.name+".","turn");
    renderMission();
    return;
  }
}

function endMissionActivation(){
  const u=missionActiveUnit();
  if(!u||game.mission.phase!=="player"||game.mission.over) return;
  u.acted=true;
  game.mission.activeUnit=null;
  game.mission.mode=null;
  selectNextMissionPlayer();
}

function setMissionMode(mode){
  const u=missionActiveUnit();
  if(!u||game.mission.phase!=="player"||game.mission.over) return;
  game.mission.mode=mode;
  game.mission.spellTarget=null;
  renderMission();
}

function checkMissionEnd(){
  if(!game.mission||game.mission.over) return false;
  const p=livingMissionUnits("player"),e=livingMissionUnits("enemy");
  if(p.length&&e.length) return false;
  game.mission.over=true;
  game.mission.winner=e.length?"enemy":"player";
  game.mission.activeUnit=null;
  game.mission.mode=null;
  missionLog(game.mission.winner==="player"
    ?"VICTOIRE — les ennemis sont hors combat ou en déroute."
    :"DÉFAITE — votre équipe est hors combat.","turn");
  resolveMissionAftermath();
  return true;
}

// Fin de mission V1 (10-mission-time-and-unavailability.md §7) : seule votre équipe passe la chaîne
// mort → blessure → fatigue. Le bilan est appliqué à la compagnie (morts définitives, indisponibilités,
// primes de mission, Game Over si le capitaine meurt), puis la partie est sauvegardée ou effacée.
function resolveMissionAftermath(){
  const m=game.mission;
  const captainId=game.campaign?game.campaign.company.captainId:game.captain?.id;
  const participants=m.players.map(u=>({
    id:u.character.id,name:u.character.name,hp:u.hp,pvMax:u.pvMax,
    // Endurance avec la ceinture et Volonté avec l'amulette (Idan, 2026-10-24) : blessure, mort et convalescence
    // les lisent aussi.
    damageTaken:u.damageTaken,stats:{...u.character.stats,Endurance:m.engine.statWithGear(u,"Endurance"),
      "Volonté":m.engine.statWithGear(u,"Volonté")},
    isCaptain:captainId!=null&&u.character.id===captainId,offMap:u.offMap,progress:u.progress||null
  }));
  const victory=m.winner==="player";
  // Défaite d'un contrat : l'ennemi tient le terrain, le jet de mort de nos mercenaires à terre est doublé (doc 17 §8).
  m.aftermath=m.endRules.resolveMissionEnd(participants,{deathMultiplier:m.contract?missionRules().deathMultiplier(m.contract,victory):1});
  missionLog("Fin de mission : bilan de votre équipe.","turn");
  for(const r of m.aftermath.results) missionLog(r.name+" — "+missionAftermathText(r),r.dead?"death":r.wounded?"bad":"info");
  if(!game.campaign) return;
  // Expédition : les primes sont versées au retour de l'escouade (doc 17).
  const report=m.companyReport=campaignRules().applyMissionAftermath(game.campaign,m.aftermath,{deferBonuses:Boolean(m.expeditionId)});
  for(const h of report.heritage||[]) missionLog(h.name+" entre dans la mémoire de la compagnie.","death");
  // Réputation et renommée en étoiles : une ligne seulement quand le niveau change.
  const renownStars=report.renown&&starChange(starRules().company(report.renown.before),starRules().company(report.renown.after));
  if(renownStars) missionLog("Renommée de la compagnie : "+renownStars.text+".",renownStars.up?"gear":"bad");
  if(report.bonusPaid) missionLog("Primes de mission versées : "+report.bonusPaid+" PO ("+report.bonuses.map(b=>b.mercenary.name+" "+b.bonus).join(", ")+").","gear");
  for(const {mercenary,changes,reputation} of report.progression||[]){
    for(const c of visibleProgressionChanges(changes)) missionLog(mercenary.name+" : "+c.name+" "+c.shownBefore+" → "+c.shownAfter+".",c.shownAfter>c.shownBefore?"gear":"bad");
    const repStars=reputation&&starChange(starRules().personal(reputation.before),starRules().personal(reputation.after));
    if(repStars) missionLog(mercenary.name+" : réputation "+repStars.text+".",repStars.up?"gear":"bad");
  }
  if(m.contract&&!report.gameOver) resolveContractOutcome(m,report,victory);
  if(report.gameOver){
    missionLog("Le capitaine est mort : la partie est terminée.","death");
    deleteSavedGame();
  }else{
    saveGame();
  }
}

// Contrat (doc 17 §8) : victoire, la récompense, le coffre et l'équipement des morts des deux camps ; défaite, rien et la
// renommée baisse. Les survivants rentrent en autant de jours qu'à l'aller (le trajet compte comme du repos, doc 10 §9) ;
// l'or, les objets et les primes arrivent avec eux.
function resolveContractOutcome(m,report,victory){
  const offer=m.contract,rules=missionRules(),company=game.campaign.company;
  const captain=company.roster.find(x=>x.id===company.captainId);
  const chestItems=victory&&captain?Array.from({length:rules.chestItemCount(offer)},()=>game.generator.createChestItem(captain,rules.chestTier(offer))).filter(Boolean):[];
  const deadEnemies=m.enemies.filter(u=>!u.alive&&!u.offMap).map(u=>u.character);
  const result=m.contractResult=rules.outcome(offer,{victory,deadEnemies,deadMercenaries:report.deaths,chestItems});
  const back=campaignRules().completeExpeditionCombat(game.campaign,m.expeditionId,{result,bonuses:report.bonusesDue});
  m.contractReturn=back?.expedition?{days:offer.distance,bonuses:report.bonusesDue.reduce((sum,b)=>sum+b.bonus,0)}:null;
  for(const line of contractResultLines(result,m.contractReturn)){ missionLog(line.text,line.kind); tavernLog(line.text,line.kind); }
}
function contractResultLines(result,trip=null){
  const home=trip?{text:"Retour au camp dans "+trip.days+" jour"+(trip.days>1?"s":"")+(trip.bonuses?" ; primes dues à l’arrivée : "+fmt(trip.bonuses)+" PO.":"."),kind:"turn"}:null;
  if(!result.victory) return [{text:"Contrat échoué : rien n’est payé et la renommée de la compagnie baisse ("+result.renown+").",kind:"bad"},home].filter(Boolean);
  const lines=[{text:"Contrat rempli : "+fmt(result.reward)+" PO de récompense et "+fmt(result.chestGold)+" PO dans le coffre.",kind:"gear"}];
  if(result.chestItems.length) lines.push({text:"Dans le coffre : "+result.chestItems.map(i=>i.name+" (T"+i.tier+")").join(", ")+".",kind:"gear"});
  lines.push({text:"Butin des morts : "+result.loot.length+" objet"+(result.loot.length>1?"s":"")+", rapporté"+(result.loot.length>1?"s":"")+" à l’Intendance par l’escouade.",kind:"gear"});
  if(home) lines.push(home);
  return lines;
}
function missionAftermathDetail(r){
  const pct=x=>Math.round(x)+" %";
  const parts=[];
  if(r.offMap) parts.push("a fui le combat");
  if(r.death) parts.push((r.dead?"jet de mort ":"survit au jet de mort ")+pct(r.death.p)+" ("+r.death.roll+")");
  if(r.death&&!r.dead) parts.push("blessure automatique");
  if(r.wound&&!r.wound.automatic) parts.push((r.wounded?"jet de blessure ":"évite la blessure ")+pct(r.wound.p)+" ("+r.wound.roll+")");
  if(r.wounded) parts.push("gravité "+Math.round(r.severity));
  if(!r.dead) parts.push(r.damageTaken+" PV encaissés");
  return parts.join(", ");
}

function missionAftermathText(r){
  const status=r.dead?"Mort":r.wounded?"Blessé, indisponible "+r.woundDays+" j":"Fatigué, indisponible "+r.fatigueDays+" j";
  return status+" ("+missionAftermathDetail(r)+")";
}

function renderMissionAftermath(m){
  if(!m.aftermath) return "";
  const label={dead:"Mort",wounded:"Blessé",fatigued:"Fatigué"};
  const rows=m.aftermath.results.map(r=>`
    <li class="aftermath-${r.outcome}">
      <strong>${esc(r.name)}${r.isCaptain?" (capitaine)":""}</strong>
      <span>${label[r.outcome]}${r.dead?"":" · "+(r.wounded?r.woundDays:r.fatigueDays)+" j"}</span>
      <small>${esc(missionAftermathDetail(r))}</small>
    </li>`).join("");
  const report=m.companyReport;
  const note=!report
    ?"Ces personnages ne font pas partie d’une compagnie : bilan non appliqué."
    :report.gameOver
      ?""
      :"Bilan appliqué à la compagnie. "+(m.expeditionId?"Primes versées au retour de l’escouade.":"Primes de mission versées : "+report.bonusPaid+" PO.")+missionRenownNote(report);
  const contract=m.contractResult?`<ul class="mission-contract-result">${contractResultLines(m.contractResult,m.contractReturn).map(l=>`<li class="is-${l.kind}">${esc(l.text)}</li>`).join("")}</ul>`:"";
  return `${contract}<ul class="mission-aftermath">${rows}</ul>
    ${report?.gameOver?`<p class="aftermath-gameover">Le capitaine est mort : la partie est terminée et la sauvegarde est effacée.</p>`:""}
    ${note?`<p class="aftermath-note">${esc(note)}</p>`:""}
    ${report&&!report.gameOver?renderMissionProgression(report.progression||[]):""}`;
}

// Changement de niveau d'étoiles, ou null si le niveau ne bouge pas.
function starChange(before,after){
  if(!before||!after||before.level===after.level) return null;
  return {up:after.level>before.level,text:before.label+" → "+after.label};
}

// Renommée de la compagnie (09 §2) en étoiles, et les morts qui entrent dans sa mémoire.
function missionRenownNote(report){
  if(!report.renown) return "";
  const before=starRules().company(report.renown.before),after=starRules().company(report.renown.after);
  const change=starChange(before,after);
  const memory=(report.heritage||[]).map(h=>h.name).join(", ");
  return " Renommée de la compagnie : "+(change?change.text:after.label)+"."+(memory?" Mémoire de la compagnie : "+memory+".":"");
}

// Récapitulatif de progression (08-progression-and-experience.md §2) : XP naturelle gagnée par chaque
// survivant et caractéristiques qui ont changé.
const PROGRESSION_LABELS={"Résistance physique":"Rés. physique","Résistance au feu":"Rés. feu","Résistance au froid":"Rés. froid","Résistance à la foudre":"Rés. foudre","Résistance au poison":"Rés. poison"};
function progressionLabel(name){ return PROGRESSION_LABELS[name]||name; }
// XP d'un sort (par code) : « Sort Soin rapide ».
function spellProgressionLabel(code){
  const spell=(game.referenceData?.spells?.rows||[]).find(x=>x.code===code);
  return "Sort "+(spell?.nom||code);
}
function signed(n){ n=Math.round(n); return (n>0?"+":"−")+Math.abs(n); }

// Les compétences ont un niveau continu (30,6) : le bilan montre les points entiers qui changent à l'arrondi.
function visibleProgressionChanges(changes){
  return changes.map(c=>{
    const shown=v=>c.family==="skills"||c.family==="spells"?Math.round(v):v;
    return {...c,shownBefore:shown(c.before),shownAfter:shown(c.after)};
  }).filter(c=>c.shownAfter!==c.shownBefore);
}

// Réputation de carrière (09 §1) : les sources de la mission (sans chiffres, valeur au survol), puis les
// étoiles avant → après quand le niveau change.
const REPUTATION_SOURCES={missionReturn:"Retour de mission",criticalSuccesses:"Critiques",criticalFailures:"Échecs critiques",enemyWounds:"Ennemis blessés",enemyKnockouts:"Ennemis hors combat"};
function renderMissionReputation(reputation){
  if(!reputation) return '<span class="muted">—</span>';
  const parts=Object.entries(REPUTATION_SOURCES)
    .filter(([key])=>Math.round(reputation.sources[key]))
    .map(([key,label])=>`<span class="${reputation.sources[key]<0?"xp-loss":"xp-gain"}" title="${esc(signed(reputation.sources[key]))}">${esc(label)} ${reputation.sources[key]<0?"▼":"▲"}</span>`);
  const before=starRules().personal(reputation.before),after=starRules().personal(reputation.after);
  const detail=v=>starDetail("Réputation",v,starRules().personal(v));
  if(starChange(before,after)) parts.push(`<strong class="${after.level>before.level?"stat-up":"stat-down"}">${renderStarLevel(before,detail(reputation.before))} → ${renderStarLevel(after,detail(reputation.after))}</strong>`);
  else parts.push(renderStarLevel(after,detail(reputation.after)));
  return parts.join(" ");
}

function renderMissionProgression(entries){
  if(!entries.length) return "";
  const rows=entries.map(({mercenary,xp,changes,reputation})=>{
    const groups=xp.skills||{};
    const skills=Object.values(groups).flatMap(group=>Object.entries(group));
    // Compétences : les gains de pratique un à un ; la régression des autres armes et styles en un total, celle des
    // écoles opposées en un autre (doc 12).
    const loss=entries=>entries.filter(([,n])=>n<0).reduce((sum,[,n])=>sum+n,0);
    const regression=loss(Object.entries(groups).filter(([group])=>group!=="magic").flatMap(([,group])=>Object.entries(group)));
    const schoolLoss=loss(Object.entries(groups.magic||{}));
    const spells=Object.entries(xp.spells||{}).map(([code,n])=>[spellProgressionLabel(code),n]);
    const gained=[...Object.entries(xp.stats||{}),...Object.entries(xp.resistances||{}),...skills.filter(([,n])=>n>0),...spells]
      .filter(([,n])=>Math.round(n))
      .map(([name,n])=>`<span class="${n<0?"xp-loss":"xp-gain"}">${esc(progressionLabel(name))} ${signed(n)}</span>`)
      .concat(Math.round(regression)?[`<span class="xp-loss" title="Les autres armes et styles reculent quand on en pratique un">Autres armes ${signed(regression)}</span>`]:[])
      .concat(Math.round(schoolLoss)?[`<span class="xp-loss" title="Les deux écoles opposées reculent quand on pratique une école">Écoles opposées ${signed(schoolLoss)}</span>`]:[])
      .join(" ");
    const moved=visibleProgressionChanges(changes)
      .map(c=>`<strong class="${c.shownAfter>c.shownBefore?"stat-up":"stat-down"}">${esc(c.family==="spells"?spellProgressionLabel(c.code):progressionLabel(c.name))} ${c.shownBefore} → ${c.shownAfter} ${c.shownAfter>c.shownBefore?"▲":"▼"}</strong>`).join(" ");
    return `<tr><td>${esc(mercenary.name)}</td><td>${gained||'<span class="muted">Aucune</span>'}</td><td>${moved||'<span class="muted">—</span>'}</td><td>${renderMissionReputation(reputation)}</td></tr>`;
  }).join("");
  return `<div class="mission-progression">
    <h4>Progression</h4>
    <table><thead><tr><th>Mercenaire</th><th>XP gagnée</th><th>Évolution</th><th>Réputation</th></tr></thead><tbody>${rows}</tbody></table>
  </div>`;
}

function logMissionAttack(a,d,result,kind="attack"){
  if(!result.ok){ missionLog(result.reason||"Attaque impossible.","bad"); return; }
  const verb={charge:" charge ",opportunity:" profite de l’ouverture et frappe ",countercharge:" contre-charge ",stray:" touche par accident "}[kind]||" attaque ";
  const prefix=a.character.name+verb+d.character.name+" avec "+result.weapon
    +(result.opportunity?" (attaque d’opportunité, dans le dos)":result.encircled?" (cible encerclée, dans le dos)":result.backstab?" (dans le dos)":"");

  if(result.chargeFall){
    missionLog(a.character.name+" chute pendant sa charge et perd son attaque !","bad");
    return;
  }
  if(result.deflected){
    missionLog(prefix+" : le projectile est dévié par le champ de protection de "+d.character.name+" ("+Math.round(result.pDeflect)+" %, jet "+result.deflectRoll+").","miss");
    return;
  }
  if(!result.hit){
    missionLog(prefix+" : raté ("+Math.round(result.pHit||0)+" %, jet "+(result.hitRoll||"—")+").","miss");
    logMissionFumble(a,result.fumbleRoll,result.fumble,"perd l’équilibre et tombe au sol");
    return;
  }
  if(result.blocked){
    missionLog(prefix+" : touche, mais "+d.character.name+" bloque avec son "+result.shield+" (blocage "+Math.round(result.pBlock)+" %, jet "+result.blockRoll+").","miss");
    return;
  }
  const critical=result.criticalHit?" Coup critique : l’armure est ignorée ("+result.criticalHitRoll+" ≤ "+missionPercent(result.pCritical)+").":"";
  if(!result.wound){
    missionLog(prefix+" : touche mais ne blesse pas ("+Math.round(result.pWound||0)+" %, jet "+(result.woundRoll||"—")+")."+critical,"hit");
    logMissionFumble(a,result.woundFumbleRoll,result.woundFumble,"se blesse avec son propre coup : "+result.selfDamage+" PV, reste à "+Math.max(0,result.attackerHp)+" PV");
    if(result.attackerDown) missionLog(a.character.name+" est hors combat.","death");
    return;
  }
  const criticalWound=result.criticalWound?" Blessure critique : dégâts maximum ("+result.criticalWoundRoll+" ≤ "+missionPercent(result.pCritical)+").":"";
  missionLog(prefix+" : "+result.damage+" PV. "+d.character.name+" reste à "+Math.max(0,result.targetHp)+" PV"+(result.targetHp<0?" ("+result.targetHp+" sous zéro)":"")+"."+critical+criticalWound,"damage");
  if(result.targetDown) missionLog(d.character.name+" est hors combat.","death");
}

function missionPercent(p){ return (Math.round((Number(p)||0)*10)/10).toLocaleString("fr-FR")+" %"; }

// Échec critique (Toucher ou Blesser) : un naturel 96–100 impose un test de Chance (D100 > Chance = échec).
function logMissionFumble(unit,roll,confirmed,effect){
  if(!roll) return;
  const luck="Chance "+Math.round(game.mission.engine.statWithGear(unit,"Chance"))+", jet "+roll;
  if(confirmed) missionLog("Échec critique ! "+unit.character.name+" "+effect+" ("+luck+").","bad");
  else missionLog(unit.character.name+" frôle l’échec critique mais se rattrape ("+luck+").","info");
}

// Attaque d'opportunité CAC V1 : les réactions sont résolues avant la fin de l'action déclenchante,
// dans l'ordre d'initiative de l'équipe qui réagit.
function resolveOpportunityAttacks(reactors,target){
  const m=game.mission,order=target.team==="player"?m.enemyOrder:m.playerOrder;
  const sorted=[...reactors].sort((x,y)=>order.indexOf(x)-order.indexOf(y));
  const from={q:target.q,r:target.r};
  for(const reactor of sorted){
    if(m.over||!target.alive||target.q!==from.q||target.r!==from.r) break;
    if(!m.engine.threatens(reactor,target)) continue;
    // Combat à deux armes : un coup avec chaque arme de mêlée, sans enchaînement (Attaque d'opportunité CAC V1).
    const hands=m.engine.usableHands(reactor,m.engine.axialDistance(reactor,target)).filter(h=>h.mode==="melee");
    let struck=false,wounded=false;
    for(const h of hands){
      if(m.over||!target.alive) break;
      const result=m.engine.resolveAttack(reactor,target,{mode:"melee",opportunity:true,hand:h.hand});
      logMissionAttack(reactor,target,result,"opportunity");
      missionWeaponEnchantStrike(reactor,target,result);
      checkMissionEnd();
      if(!result.ok) continue;
      struck=true;wounded=wounded||result.wound;
      if(result.fumble||result.woundFumble) break;
    }
    if(struck) resolveMissionCourage(reactor,target,{ok:true,mode:"melee",wound:wounded});
  }
  return target.alive;
}

// Déplacement hex par hex : quitter une zone de menace provoque les réactions avant de quitter la case.
function moveMissionUnitAlongPath(unit,path){
  const e=game.mission.engine;
  let moved=0;
  for(const step of path){
    if(!unit.alive||game.mission.over) break;
    const from={q:unit.q,r:unit.r},wasFleeing=unit.fleeing;
    const reactors=unit.camouflaged?[]:e.opportunityReactors(missionOpponents(unit),unit,step);
    if(reactors.length){
      missionLog(unit.character.name+" quitte la zone de menace de "+reactors.map(x=>x.character.name).join(", ")+".","move");
      resolveOpportunityAttacks(reactors,unit);
      if(!unit.alive||unit.q!==from.q||unit.r!==from.r||unit.fleeing!==wasFleeing) break;
    }
    unit.q=step.q;unit.r=step.r;moved++;
    if(wasFleeing) MercenairesProgression.recordFleeHex(unit);
    game.mission.progression.recordStep(unit);
    unit.movementRemaining=Math.max(0,(unit.movementRemaining||0)-1);
  }
  return moved;
}

function missionPathOpportunityCount(unit,path){
  const e=game.mission.engine,opponents=missionOpponents(unit);
  let from={q:unit.q,r:unit.r},count=0;
  for(const step of path){
    if(!unit.camouflaged) count+=e.opportunityReactors(opponents,from,step).length;
    from=step;
  }
  return count;
}

// La charge suit une ligne droite : chaque case du trajet doit être libre.
function missionChargeIfClear(unit,target){
  if(missionHiddenFrom(target,unit)) return null;
  const charge=game.mission.engine.chargeData(unit,target);
  if(!charge.valid) return null;
  const occupied=occupiedMissionKeys(unit);
  return charge.path.some(h=>occupied.has(missionKey(h.q,h.r)))?null:charge;
}

function missionActiveUnitLost(){
  const m=game.mission,u=m?.activeUnit;
  if(!u||(u.alive&&!u.fleeing)) return false;
  u.acted=true;m.activeUnit=null;m.mode=null;
  if(m.over) renderMission(); else selectNextMissionPlayer();
  return true;
}

// charge (facultatif) : données de Charge CAC V1 ; la charge est une seule séquence, sans enchaînement, et
// chaque arme de mêlée y reçoit le bonus de charge (à deux armes, chaque arme frappe : décision Idan, 2026-10-08).
function performMissionAttack(attacker,target,mode,distance,charge=null){
  const m=game.mission,e=m.engine;
  // Combat à deux armes CAC V1 : à chaque séquence, chaque arme utilisable frappe une fois (principale puis
  // secondaire), chacune avec son propre mode ; sinon, la seule arme principale.
  const dual=e.isDualWielding(attacker);
  const handsAt=d=>(dual?e.usableHands(attacker,d):(e.canAttackAtDistance(attacker,d,mode)?[{hand:"main",mode}]:[]))
    .filter(h=>h.mode!=="ranged"||missionLineOfSight(attacker,target));
  if(handsAt(distance).some(h=>h.mode==="ranged")){
    const reactors=attacker.camouflaged?[]:e.rangedOpportunityReactors(missionOpponents(attacker),attacker,target);
    if(reactors.length){
      const from={q:attacker.q,r:attacker.r},wasFleeing=attacker.fleeing;
      missionLog(attacker.character.name+" tire alors qu’il est menacé par "+reactors.map(x=>x.character.name).join(", ")+".","move");
      resolveOpportunityAttacks(reactors,attacker);
      if(!attacker.alive||attacker.q!==from.q||attacker.r!==from.r||attacker.fleeing!==wasFleeing) return null;
    }
  }
  // Enchaînement d'attaques CAC V1 / de tirs distance V1 / séquences à deux armes : tant que la séquence touche
  // réellement, D100 ≤ P_N ouvre la suivante contre la même cible, si elle reste à portée.
  // Courage post-attaque CAC V1 / post-tir V1 : un seul test en fin de séquence ; une cible en sous-nombre
  // teste, elle, après chaque blessure reçue (Courage en sous-nombre V1).
  let first=null,wounded=false,testedPerWound=false,melee=false;
  const strayWounded=new Set();
  for(let n=1;;n++){
    const results=[];
    for(const h of handsAt(e.axialDistance(attacker,target))){
      if(m.over||!target.alive||!attacker.alive) break;
      const d=e.axialDistance(attacker,target);
      if(results.length&&!handsAt(d).some(x=>x.hand===h.hand)) continue;
      const charging=charge&&h.mode==="melee";
      const result=e.resolveAttack(attacker,target,{
        mode:h.mode,distance:d,hand:h.hand,encircled:h.mode==="melee"&&missionEncircled(target),bystanders:missionUnits(),
        chargeDistance:charging?charge.travel:0,chargeFollowUp:Boolean(charging&&first)
      });
      first=first||result;
      logMissionAttack(attacker,target,result,charging?"charge":"attack");
      if(!result.ok) continue;
      if(result.chargeFall) break;
      missionWeaponEnchantStrike(attacker,target,result);
      results.push(result);
      if(h.mode==="melee") melee=true;
      const stray=logMissionStray(attacker,result);
      if(stray) strayWounded.add(stray);
      checkMissionEnd();
      if(result.wound){
        wounded=true;
        if(h.mode==="melee"&&!m.over&&e.localMelee(target,missionUnits()).surplus>0){
          resolveMissionCourage(attacker,target,result);
          testedPerWound=true;
        }
      }
      // Un échec critique interrompt toute la chaîne, y compris avant la seconde arme.
      if(result.fumble||result.woundFumble) break;
    }
    if(!results.length){ if(n===1) return first; break; }
    if(dual) MercenairesProgression.recordDualSequence(attacker,results);
    if(charge||m.over||!handsAt(e.axialDistance(attacker,target)).length) break;
    const chain=dual?e.rollPairChain(attacker,target,results,n+1):e.rollChain(attacker,target,results[0],n+1,mode);
    if(!chain) break;
    const label=dual?"séquence":mode==="ranged"?"tir":"attaque";
    const detail=" ("+label+" n°"+chain.n+" : "+missionPercent(chain.p)+", jet "+chain.roll+")";
    if(!chain.continues){ missionLog(attacker.character.name+" ne parvient pas à enchaîner"+detail+".","info"); break; }
    missionLog(attacker.character.name+" enchaîne"+detail+" !","info");
    MercenairesProgression.recordChain(attacker);
  }
  const courageMode=dual?(melee?"melee":"ranged"):mode;
  if(!testedPerWound) resolveMissionCourage(attacker,target,{ok:true,mode:courageMode,wound:wounded},{defenderSurplus:0});
  // Courage post-tir V1 : le personnage blessé par accident teste lui aussi, face au tireur.
  for(const unit of strayWounded) resolveMissionCourage(attacker,unit,{ok:true,mode:"ranged",wound:true});
  return first;
}

// Approximation projectile V1 : un tir raté peut toucher un autre personnage du couloir de tir.
// Renvoie le personnage blessé par accident, s'il y en a un.
function logMissionStray(attacker,result){
  const stray=result?.stray;
  if(!stray?.unit) return null;
  missionLog("Le tir de "+attacker.character.name+" part dans le couloir et atteint "+stray.unit.character.name
    +" par accident ("+missionPercent(stray.result.pHit)+", jet "+stray.result.hitRoll+") !","bad");
  logMissionAttack(attacker,stray.unit,stray.result,"stray");
  return stray.result.wound&&stray.unit.alive?stray.unit:null;
}

// Courage post-attaque CAC V1 / post-tir V1 / en sous-nombre V1 : un échec applique En Fuite.
// Journal : le bonus de l'aura du capitaine, quand il compte dans le test.
// Aura du capitaine ou d'un lieutenant (Idan, 2026-10-25 : la plus forte à portée, sans cumul).
function missionAuraNote(aura,from="captain"){ return aura?", aura "+(from==="lieutenant"?"du lieutenant":"du capitaine")+" +"+Math.round(aura):""; }

function resolveMissionCourage(attacker,defender,result,override={}){
  const m=game.mission;
  if(!m||m.over||!result?.ok) return;
  const e=m.engine;
  const context={
    defenderSurplus:e.localMelee(defender,missionUnits()).surplus,
    attackerEncircles:e.axialDistance(attacker,defender)===1&&e.threatens(attacker,defender)&&missionEncircled(defender),
    units:missionUnits(),
    ...override
  };
  const c=e.resolveCourage(attacker,defender,result,context);
  if(!c) return;
  const detail=" (Courage "+Math.round(c.pHold)+" %"+(c.rule==="outnumbered"?", en sous-nombre":"")+missionAuraNote(c.aura,c.auraFrom)+", jet "+c.roll+")";
  if(!c.flees){ missionLog(c.subject.character.name+" tient bon"+detail+".","info"); MercenairesProgression.recordCourageHeld(c.subject); return; }
  missionLog(c.subject.character.name+" panique et prend la fuite"+detail+" !","bad");
  MercenairesProgression.recordIntimidation(c.source,c.subject);
  applyMissionFlee(c.subject,c.source);
}

// Mouvement de fuite immédiat V1 : pendant sa propre activation, tout le mouvement restant ;
// en dehors de son activation, MouvementBase (décision Idan, PR #7). Il s'éloigne de l'adversaire qui a déclenché le test.
function applyMissionFlee(unit,source){
  const m=game.mission,acting=m.activeUnit===unit||m.actingUnit===unit;
  unit.fleeing=true;unit.fleeTurn=0;
  const budget=acting?Math.max(0,unit.movementRemaining||0):m.engine.movementBase(unit);
  if(!budget){ missionLog(unit.character.name+" n’a plus de mouvement et reste sur place, en fuite.","move"); return; }
  missionFollowFleePath(unit,missionBestPath(unit,budget,cell=>game.mission.engine.axialDistance(cell,source)),"s’enfuit");
}

function missionFollowFleePath(unit,path,verb){
  if(!path?.length){ missionLog(unit.character.name+" ne trouve aucune issue.","move"); return; }
  const moved=moveMissionUnitAlongPath(unit,path);
  if(moved) missionLog(unit.character.name+" "+verb+" de "+moved+" hex.","move");
}

// Ennemi actif = vivant et pas En Fuite (décision Idan, Issue #8).
function missionThreatSources(unit){
  const opponents=missionOpponents(unit),active=opponents.filter(o=>!o.fleeing);
  return active.length?active:opponents;
}

function nearestActiveMissionEnemy(unit){
  const e=game.mission.engine;
  return missionOpponents(unit).filter(o=>!o.fleeing).sort((a,b)=>e.axialDistance(unit,a)-e.axialDistance(unit,b))[0]||null;
}

function missionMinDistance(cell,units){
  return units.length?Math.min(...units.map(u=>game.mission.engine.axialDistance(cell,u))):0;
}

// Chemins les plus courts vers chaque case libre atteignable, dans l'ordre de distance.
// forbidden : cases interdites en plus des cases occupées (la case de départ reste permise).
function missionReachablePaths(unit,budget=Infinity,forbidden=null){
  const blocked=occupiedMissionKeys(unit),start={q:unit.q,r:unit.r};
  if(forbidden) for(const key of forbidden) blocked.add(key);
  const paths=new Map([[missionKey(start.q,start.r),[]]]),queue=[start];
  while(queue.length){
    const cur=queue.shift(),path=paths.get(missionKey(cur.q,cur.r));
    if(path.length>=budget) continue;
    for(const next of missionNeighbors(cur)){
      const key=missionKey(next.q,next.r);
      if(paths.has(key)||blocked.has(key)) continue;
      paths.set(key,[...path,next]);
      queue.push(next);
    }
  }
  return paths;
}

// Meilleure destination selon le score ; à score égal, le chemin le plus court (ordre de parcours).
function missionBestPath(unit,budget,score,forbidden=null){
  let best=[],bestScore=score({q:unit.q,r:unit.r});
  for(const path of missionReachablePaths(unit,budget,forbidden).values()){
    if(!path.length) continue;
    const value=score(path[path.length-1]);
    if(value>bestScore){ best=path;bestScore=value; }
  }
  return best;
}

function isMissionBorder(c){
  const col=missionColumn(c.q,c.r);
  return col===0||c.r===0||col===MISSION_MAP.cols-1||c.r===MISSION_MAP.rows-1;
}

// Sortie de carte : atteindre une case du bord, puis 1 hexagone de mouvement pour quitter la carte.
// Parmi les sorties possibles, la plus éloignée des ennemis.
function missionExitPath(unit,budget,threats,forbidden=null){
  let best=null,bestScore=-1;
  for(const path of missionReachablePaths(unit,budget,forbidden).values()){
    const cell=path.length?path[path.length-1]:unit;
    if(!isMissionBorder(cell)||path.length+1>budget) continue;
    const value=missionMinDistance(cell,threats);
    if(value>bestScore){ best=path;bestScore=value; }
  }
  return best;
}

function missionTryExit(unit,budget,forbidden=null){
  const path=missionExitPath(unit,budget,missionThreatSources(unit),forbidden);
  if(!path) return false;
  const target=path.length?path[path.length-1]:{q:unit.q,r:unit.r};
  if(path.length) missionFollowFleePath(unit,path,"court vers le bord");
  if(unit.alive&&unit.q===target.q&&unit.r===target.r&&unit.movementRemaining>=1) missionExitMap(unit);
  return true;
}

// Mission Test : un fuyard qui sort de la carte compte comme hors combat (décision Idan, Issue #8).
// Sortir de la carte quitte les zones de menace : les attaques d'opportunité s'appliquent.
function missionExitMap(unit){
  const reactors=missionOpponents(unit).filter(o=>game.mission.engine.threatens(o,unit));
  if(reactors.length){
    missionLog(unit.character.name+" quitte la zone de menace de "+reactors.map(x=>x.character.name).join(", ")+".","move");
    if(!resolveOpportunityAttacks(reactors,unit)) return;
  }
  unit.alive=false;unit.offMap=true;unit.movementRemaining=0;
  missionLog(unit.character.name+" quitte le champ de bataille.","death");
  checkMissionEnd();
}

// Comportement automatique — En Fuite V1, 1 : Course effrénée.
function missionRunAway(unit,budget){
  if(missionTryExit(unit,budget)) return;
  const threats=missionThreatSources(unit);
  missionFollowFleePath(unit,missionBestPath(unit,budget,cell=>missionMinDistance(cell,threats)),"court");
}

// Cases adjacentes à un ennemi, que le trajet de « Cachons-nous » ne doit jamais emprunter.
function missionCellsNextToEnemies(unit){
  const keys=new Set();
  for(const enemy of missionOpponents(unit)) for(const n of missionNeighbors(enemy)) keys.add(missionKey(n.q,n.r));
  return keys;
}

// 2 : Cachons-nous. La Mission Test n'a aucun abri total : le fuyard file vers la sortie de carte.
// Le trajet n'entre jamais dans une case adjacente à un ennemi, y compris vers la sortie (relecture Chatty, PR #7).
// Sans trajet sûr vers une sortie, il s'éloigne au mieux par les cases sûres, sinon il reste sur place.
function missionSeekCover(unit,budget){
  const forbidden=missionCellsNextToEnemies(unit);
  if(missionTryExit(unit,budget,forbidden)) return;
  const threats=missionThreatSources(unit);
  const path=missionExitPath(unit,Infinity,threats,forbidden);
  if(path?.length){ missionFollowFleePath(unit,path.slice(0,budget),"file vers la sortie"); return; }
  const away=missionBestPath(unit,budget,cell=>missionMinDistance(cell,threats),forbidden);
  if(away.length) missionFollowFleePath(unit,away,"se terre");
  else missionLog(unit.character.name+" ne trouve aucun chemin sûr et reste sur place.","move");
}

// 3 : Feu à volonté sur l'ennemi le plus proche, sinon il reste sur place.
function missionPanicFire(unit){
  const e=game.mission.engine,threats=missionThreatSources(unit);
  const target=[...threats].sort((a,b)=>e.axialDistance(unit,a)-e.axialDistance(unit,b))[0];
  const distance=target?e.axialDistance(unit,target):0;
  if(target&&e.isRangedWeapon(e.weaponTemplate(e.activeWeaponItem(unit)))&&e.canAttackAtDistance(unit,distance,"ranged")&&missionLineOfSight(unit,target)){
    performMissionAttack(unit,target,"ranged",distance);
    return;
  }
  missionLog(unit.character.name+" reste tétanisé sur place.","move");
}

// Reprise de contrôle — En Fuite V1, au début de l'activation. Retourne true si l'activation est consommée.
function resolveMissionFleeingActivation(unit){
  const e=game.mission.engine;
  unit.fleeTurn=(unit.fleeTurn||0)+1;
  const recovery=e.rollRecovery(unit,nearestActiveMissionEnemy(unit),unit.fleeTurn,missionUnits());
  const detail=" (reprise "+Math.round(recovery.p)+" %"+missionAuraNote(recovery.aura,recovery.auraFrom)+", jet "+recovery.roll+")";
  if(recovery.recovered){
    unit.fleeing=false;unit.fleeTurn=0;
    missionLog(unit.character.name+" reprend ses esprits"+detail+".","turn");
    MercenairesProgression.recordRecovery(unit);
    return false;
  }
  const budget=2*e.movementBase(unit),behavior=e.rollFleeBehavior();
  missionLog(unit.character.name+" reste en fuite"+detail+" : "+["Course effrénée","Cachons-nous","Feu à volonté"][behavior-1]+".","bad");
  unit.movementRemaining=budget;unit.attackAvailable=false;unit.quickAvailable=false;
  if(behavior===1) missionRunAway(unit,budget);
  else if(behavior===2) missionSeekCover(unit,budget);
  else missionPanicFire(unit);
  unit.movementRemaining=0;
  return true;
}

function resolvePlayerMissionAttack(a,d,mode,distance){
  const m=game.mission;
  if(!missionCanAttack(a,d,mode)){ missionLog("Cible hors portée ou arme incompatible.","bad"); return; }
  a.attackAvailable=false;
  m.mode=null;
  performMissionAttack(a,d,mode,distance);
  if(missionActiveUnitLost()) return;
  renderMission();
}

function handleMissionHexClick(q,r){
  const m=game.mission,u=missionActiveUnit();
  if(!m||m.phase!=="player"||!u||m.over) return;

  const clicked=missionUnits().find(x=>x.alive&&x.q===q&&x.r===r);

  if(m.mode==="move"&&!clicked){
    const path=shortestMissionPath(u,{q,r},u);
    if(path&&path.length<=u.movementRemaining){
      m.mode=null;
      const moved=moveMissionUnitAlongPath(u,path);
      if(moved) missionLog(u.character.name+" se déplace de "+moved+" hex.","move");
      if(missionActiveUnitLost()) return;
      renderMission();
    }
    return;
  }

  if(m.mode==="venom"){
    if(clicked&&clicked.team!==u.team){
      m.mode=null;
      spitMissionVenom(u,clicked);
      if(missionActiveUnitLost()) return;
      renderMission();
    }
    return;
  }

  const spellCode=missionSpellMode();
  if(spellCode){
    const spell=missionMagic()?.spell(spellCode);
    if(spell?.effet==="deplacement_force"||spell?.effet==="degats_paire"){ handleMissionTwoStepSpell(spell,q,r,clicked); return; }
    const target=spell?.cible==="case"||spell?.cible==="case_vide"?{q,r}:spell?.cible==="soi"?u:clicked;
    if(target) castPlayerMissionSpell(target);
    return;
  }

  if(!clicked||clicked.team!=="enemy") return;
  const distance=m.engine.axialDistance(u,clicked);

  if(m.mode==="melee"){
    resolvePlayerMissionAttack(u,clicked,"melee",distance);
  }else if(m.mode==="ranged"){
    resolvePlayerMissionAttack(u,clicked,"ranged",distance);
  }else if(m.mode==="charge"){
    const charge=missionChargeIfClear(u,clicked);
    if(!charge) return;

    u.attackAvailable=false;u.movementRemaining=0;m.mode=null;
    performMissionCharge(u,clicked,charge);
    if(missionActiveUnitLost()) return;
    renderMission();
  }
}

// Activation hexagonale V1 : l'Attaque peut être sacrifiée pour une seconde action de Mouvement.
function missionSecondMove(){
  const u=missionActiveUnit(),m=game.mission;
  if(!u||!u.attackAvailable||m.phase!=="player"||m.over) return;
  u.attackAvailable=false;
  u.secondMove=true;
  u.movementRemaining+=m.engine.movementBase(u);
  m.mode="move";
  missionLog(u.character.name+" renonce à attaquer pour un second mouvement.","move");
  renderMission();
}

function switchMissionWeapon(){
  const u=missionActiveUnit(),m=game.mission;
  if(!u||!u.quickAvailable||m.phase!=="player"||m.over) return;
  if(m.engine.switchWeaponSet(u)){
    u.quickAvailable=false;
    const item=m.engine.activeWeaponItem(u);
    missionLog(u.character.name+" passe au set "+u.activeSet+" : "+(item?.name||"arme inconnue")+".","gear");
    renderMission();
  }
}

// Armes à feu — recharge V1 : une Action rapide recharge une arme tenue.
function reloadMissionWeapon(){
  const u=missionActiveUnit(),m=game.mission;
  if(!u||!u.quickAvailable||m.phase!=="player"||m.over) return;
  const item=m.engine.reload(u);
  if(!item) return;
  u.quickAvailable=false;
  missionLog(u.character.name+" recharge son "+item.name+".","gear");
  renderMission();
}

// Magie (doc 12 ; Idan, 2026-10-25) : les sorts connus se lancent depuis la barre de sorts, en action rapide ou
// principale ; règles et tirages dans game-core/magic.js. Le mana se dépense sur le personnage et se recharge au camp.
function missionMagic(){
  const m=game.mission;
  if(!m) return null;
  if(m.magic===undefined) m.magic=typeof MercenairesMagic!=="undefined"
    ?MercenairesMagic.createMagicRules({reference:game.referenceData,combat:m.engine}):null;
  return m.magic;
}
function missionSpellMode(){
  const mode=String(game.mission?.mode||"");
  return mode.startsWith("spell:")?mode.slice(6):null;
}
function missionSelf(unit){ return String(unit?.character?.sex||"").trim().toLowerCase().startsWith("f")?"elle-même":"lui-même"; }

// Bouton de test (Idan, 2026-10-25 : « pour tester ») : toute l'escouade connaît tous les sorts écrits (Vie, Feu…), au
// niveau 1, pour ce combat seulement ; le grimoire des personnages ne change pas. Le mana, lui, est bien dépensé.
function teachMissionTestSpells(){
  const m=game.mission,magic=missionMagic();
  if(!m||m.over||!magic||m.testSpells) return;
  m.testSpells=true;
  for(const u of m.players) u.spells=magic.spells.map(s=>({code:s.code,name:s.nom,school:s.ecole,mastery:1}));
  const schools=[...new Set(magic.spells.map(s=>s.ecole))];
  missionLog("Test : votre escouade connaît tous les sorts ("+schools.join(", ")+", niveau 1) pour ce combat.","magic");
  renderMission();
}

// Constitution (doc 08) : chaque PV réellement rendu compte pour le mercenaire soigné.
function healMissionUnit(unit,amount){
  const before=unit.hp;
  unit.hp=Math.min(unit.pvMax,unit.hp+amount);
  const healed=Math.max(0,unit.hp-before);
  if(healed) MercenairesProgression.recordHeal(unit,healed);
  return healed;
}
// source : le lanceur (ou le porteur de l'arme enflammée), pour la réputation et le Charisme ; element : la résistance
// qui progresse chez la cible (doc 08).
function damageMissionUnitBySpell(unit,amount,source=null,element=null){
  if(!amount) return;
  const wasUp=unit.alive!==false;
  unit.hp-=amount;
  unit.damageTaken=(Number(unit.damageTaken)||0)+amount;
  if(unit.hp<=0){ unit.alive=false; missionLog(unit.character.name+" est hors combat.","death"); }
  MercenairesProgression.recordSpellDamage(source,unit,amount,{element,down:wasUp&&!unit.alive});
}

// Lance un sort et applique son résultat (joueur et IA) : action, mana, PV, effets, journal.
// extra : {destination} (Déplacement) ou {second} (Entrechoc).
function resolveMissionSpell(caster,target,code,extra={}){
  const m=game.mission,magic=missionMagic(),spell=magic?.spell(code);
  if(!spell) return null;
  if(spell.cible==="soi") target=caster;
  const out=magic.cast(caster,target,code,{units:missionUnits(),cellFree:missionCellFree(target),lineOfSight:missionLineOfSight(caster,target),
    destination:extra.destination,destinationFree:extra.destination?missionCellFree(extra.destination):undefined,
    second:extra.second,secondLineOfSight:extra.second?missionLineOfSight(caster,extra.second):true});
  if(!out.ok){ missionLog(out.reason,"bad"); return out; }
  if(spell.action==="rapide") caster.quickAvailable=false; else caster.attackAvailable=false;
  caster.character.mana=Math.max(0,Math.round((magic.currentMana(caster)-out.cost)*100)/100);
  // XP du sort, de son école, de la Puissance magique, de la Réserve de mana et de la Chance (doc 12, étape 3).
  const learn=effect=>MercenairesProgression.recordSpell(caster,{code,school:spell.ecole,success:out.success,effect,
    mana:out.cost,critical:out.critical,fumble:out.fumble});
  const name=caster.character.name;
  const on=["case","case_vide","soi"].includes(spell.cible)?"":target===caster?" sur "+missionSelf(caster):" sur "+target.character.name;
  const detail=" ("+Math.round(out.p)+" %"+(out.armor?", armure −"+Math.round(out.armor):"")+", jet "+out.roll+", "+out.cost+" mana)";
  if(!out.success){
    learn(false);
    missionLog(name+" rate "+spell.nom+on+detail+".","miss");
    if(out.fumble){
      if(out.selfDamage&&out.element){
        const hit=m.engine.elementalDamage(caster,out.element,out.selfDamage);
        missionLog("Échec critique ("+out.fumbleRoll+" > Chance) : le sort se retourne, "+name+" subit "+hit.damage+" PV de "+out.element+missionProtectionNote(hit)+".","bad");
        damageMissionUnitBySpell(caster,hit.damage,null,out.element);
      }else{
        missionLog("Échec critique ("+out.fumbleRoll+" > Chance) : "+(out.selfDamage
          ?"le sort se retourne, "+name+" perd "+out.selfDamage+" PV."
          :"le sort se dissipe."),"bad");
        damageMissionUnitBySpell(caster,out.selfDamage);
      }
      checkMissionEnd();
    }
    return out;
  }
  const critical=out.critical?" Coup critique : dés au maximum ("+out.critRoll+" ≤ "+missionPercent(out.critChance)+").":"";
  // Vrai effet : PV soignés, dégâts qui passent la protection, effet posé ou poison purgé.
  let effect=true;
  if(spell.effet==="soin"){
    const healed=healMissionUnit(target,out.amount);
    effect=healed>0;
    missionLog(name+" lance "+spell.nom+on+detail+" : +"+healed+" PV"+(healed<out.amount?" (soin de "+out.amount+")":"")+"."+critical,"magic");
  }else if(spell.effet==="soin_sur_duree"){
    target.regeneration={...out.effect};
    missionLog(name+" lance "+spell.nom+on+detail+" : un soin au début de chacune de ses "+out.effect.turns
      +" prochaines activations."+critical,"magic");
  }else if(spell.effet==="soin_de_zone"){
    const healed=missionMagic().unitsInZone(out.zone.center,out.zone.radius,missionUnits()).map(u=>[u,healMissionUnit(u,out.amount)]);
    effect=healed.some(([,hp])=>hp>0);
    missionLog(name+" lance "+spell.nom+" (rayon "+out.zone.radius+")"+detail+" : "+out.amount+" PV pour chacun"
      +(healed.length?" — "+healed.map(([u,hp])=>u.character.name+" +"+hp).join(", "):" — personne dans la zone")+"."+critical,"magic");
  }else if(spell.effet==="degats_sans_resistance"){
    missionLog(name+" lance "+spell.nom+on+detail+" : "+out.amount+" PV, sans aucune résistance."+critical,"damage");
    damageMissionUnitBySpell(target,out.amount,caster);
    effect=out.amount>0;
    checkMissionEnd();
  }else if(spell.effet==="purge_poison"){
    target.poisoned=false;
    missionLog(name+" lance "+spell.nom+on+detail+" : le poison est éliminé.","magic");
  }else if(spell.effet==="degats"&&spell.toucher==="distance"){
    const aim=" (toucher "+Math.round(out.pHit)+" %, jet "+out.hitRoll+")";
    effect=false;
    if(out.deflected){
      missionLog(name+" lance "+spell.nom+on+detail+" : le projectile est dévié par le champ de protection ("+Math.round(out.pDeflect)+" %, jet "+out.deflectRoll+").","miss");
    }else if(out.hit){
      const hit=missionSpellHit(target,out,out.amount,caster);
      effect=hit.damage>0;
      missionLog(name+" lance "+spell.nom+on+detail+" : touché"+aim+", "+hit.label+hit.note+". "
        +target.character.name+" reste à "+Math.max(0,target.hp)+" PV."+critical,"damage");
    }else if(out.stray){
      missionLog(name+" lance "+spell.nom+on+detail+" : raté"+aim+" ; le sort part dans la ligne de tir et atteint "
        +out.stray.unit.character.name+" par accident ("+Math.round(out.stray.p)+" %, jet "+out.stray.roll+") !","bad");
      const hit=missionSpellHit(out.stray.unit,out,out.amount,caster);
      missionLog(out.stray.unit.character.name+" subit "+hit.label+hit.note+".","damage");
    }else{
      missionLog(name+" lance "+spell.nom+on+detail+" : raté"+aim+".","miss");
    }
    checkMissionEnd();
  }else if(spell.effet==="degats"){
    // Sans jet de toucher : Décharge électrique au contact, Foudre qui tombe du ciel, Attraction et Projection.
    const hit=missionSpellHit(target,out,out.amount,caster);
    effect=hit.damage>0;
    missionLog(name+" lance "+spell.nom+on+detail+" : "+hit.label+hit.note+". "
      +target.character.name+" reste à "+Math.max(0,target.hp)+" PV."+critical,"damage");
    if(out.move&&target.alive){ missionForcedMove(target,out,caster); effect=true; }
    checkMissionEnd();
  }else if(spell.effet==="degats_paire"){
    // Entrechoc : les deux ennemis, chacun avec sa propre armure.
    effect=false;
    const lines=[target,out.second].map(u=>{
      const hit=missionSpellHit(u,out,out.amount,caster);
      if(hit.damage>0) effect=true;
      return u.character.name+" : "+hit.label+hit.note;
    });
    missionLog(name+" lance "+spell.nom+" sur "+target.character.name+" et "+out.second.character.name+detail+" — "+lines.join(" ; ")+"."+critical,"damage");
    checkMissionEnd();
  }else if(spell.effet==="deplacement_force"){
    const to=out.move.destination;
    target.q=to.q;target.r=to.r;
    missionLog(name+" lance "+spell.nom+on+detail+" : "+target.character.name+" est déplacé"+(missionFeminine(target)?"e":"")+" d’une case.","magic");
  }else if(spell.effet==="peur"){
    // Peur : chaque ennemi de la zone teste son Courage contre la Maîtrise et la Volonté du lanceur.
    const zone=out.zone,foes=magic.unitsInZone(zone.center,zone.radius,missionUnits()).filter(u=>u.team!==caster.team);
    missionLog(name+" lance "+spell.nom+" (rayon "+zone.radius+")"+detail+(foes.length?" : la terreur gagne la zone.":" : personne dans la zone."),"magic");
    effect=false;
    for(const foe of foes){
      const c=m.engine.resolveFear(foe,caster,out.fear.mastery,missionUnits());
      if(!c) continue;
      const fear=" (Courage "+Math.round(c.pHold)+" %"+missionAuraNote(c.aura,c.auraFrom)+", jet "+c.roll+")";
      if(!c.flees){ missionLog(foe.character.name+" tient bon"+fear+".","info"); MercenairesProgression.recordCourageHeld(foe); continue; }
      effect=true;
      missionLog(foe.character.name+" panique et prend la fuite"+fear+" !","bad");
      MercenairesProgression.recordIntimidation(caster,foe);
      applyMissionFlee(foe,caster);
    }
  }else if(spell.effet==="bonus_zone"){
    // Courage de masse, Avancée cachée : les alliés de la zone, lanceur compris (sur lui, l'activation en cours compte).
    const fx=out.effect,zone=out.zone,allies=magic.unitsInZone(zone.center,zone.radius,missionUnits()).filter(u=>u.team===caster.team);
    for(const ally of allies) ally.statBuffs={...(ally.statBuffs||{}),[fx.code]:{stats:fx.stats,value:fx.value,unit:fx.unit,turns:ally===caster?fx.turns-1:fx.turns}};
    effect=allies.length>0;
    missionLog(name+" lance "+spell.nom+" (rayon "+zone.radius+")"+detail+" : +"+fx.value+" de "+fx.stats.join(" et de ")+", pendant "+fx.turns+" tours"
      +(allies.length?" — "+allies.map(a=>a.character.name).join(", "):" — aucun allié dans la zone")+".","magic");
  }else if(spell.effet==="frenesie"){
    // Frénésie : ses 2 prochaines activations, même si le lanceur se vise ; la peur et la fuite cessent.
    const fx=out.effect;
    target.frenzy={code:fx.code,turns:fx.turns};
    target.statBuffs={...(target.statBuffs||{}),[fx.code]:{stats:fx.stats,value:fx.value,unit:fx.unit,turns:fx.turns}};
    const calmed=target.fleeing;
    if(calmed){ target.fleeing=false;target.fleeTurn=0; }
    missionLog(name+" lance "+spell.nom+on+detail+" : "+target.character.name+" entre en frénésie pour ses "+fx.turns+" prochaines activations (+"+fx.value
      +" % de Force, plus de peur"+(calmed?", fin de la fuite":"")+").","magic");
  }else if(spell.effet==="protection_projectiles"){
    target.projectileShield={code:out.effect.code,chance:out.effect.chance,untilTurn:m.turn+out.effect.turns};
    missionLog(name+" lance "+spell.nom+on+detail+" : "+out.effect.chance+" % de chances de dévier chaque projectile, pendant "+out.effect.turns+" tours.","magic");
  }else if(spell.effet==="degats_rebonds"){
    // Boule d'éclairs : chaque personnage de la chaîne, de moins en moins fort, avec sa propre protection.
    effect=false;
    const lines=out.chain.map(({unit,factor},k)=>{
      const hit=missionElementalHit(unit,out.element,Math.ceil(out.amount*factor-1e-9),caster);
      if(hit.damage>0&&unit!==caster) effect=true;
      return unit.character.name+" −"+hit.damage+(k?" ("+Math.round(factor*100)+" %)":"");
    });
    missionLog(name+" lance "+spell.nom+on+detail+" : "+out.amount+" PV de "+out.element+(lines.length>1?", puis de moins en moins à chaque rebond":", sans rebond")
      +" — "+lines.join(", ")+"."+critical,"damage");
    checkMissionEnd();
  }else if(spell.effet==="degats_zone"){
    const zone=out.zone,drift=zone.precision&&!zone.precision.ok
      ?" ; elle dévie de "+zone.precision.deviation+" case"+(zone.precision.deviation>1?"s":"")+" (précision "+Math.round(zone.precision.p)+" %, jet "+zone.precision.roll+")"
      :zone.precision?" ; elle tombe où il faut (précision "+Math.round(zone.precision.p)+" %, jet "+zone.precision.roll+")":"";
    const victims=(zone.cells?magic.unitsInCells(zone.cells,missionUnits()):magic.unitsInZone(zone.center,zone.radius,missionUnits(),zone.minDistance))
      .filter(u=>u!==caster||spell.cible!=="soi");
    effect=false;
    const lines=victims.map(u=>{
      const amount=zone.cells?out.amount:Math.ceil(out.amount*magic.zoneFactor(zone,m.engine.axialDistance(zone.center,u))-1e-9);
      const hit=missionElementalHit(u,out.element,amount,caster);
      if(hit.damage>0&&u!==caster) effect=true;
      return u.character.name+" −"+hit.damage;
    });
    missionLog(name+" lance "+spell.nom+(zone.cells?" (ligne de "+zone.length+" cases)":" (rayon "+zone.radius+")")+detail+drift+" : "+out.amount+" PV de "+out.element
      +(zone.degressive?" au centre, moins vers le bord":" pour chacun")+(lines.length?" — "+lines.join(", "):" — personne dans la zone")+"."+critical,"damage");
    checkMissionEnd();
  }else if(spell.effet==="arme_elementaire"){
    target.weaponEnchant={...out.effect};
    missionLog(name+" lance "+spell.nom+on+detail+" : chaque coup qui touche ajoute "+missionElementSome(out.effect.element)+", pendant "+out.effect.turns+" tours."+critical,"magic");
  }else if(spell.effet==="protection_elementaire"){
    target.elementalBonus={...(target.elementalBonus||{}),[out.effect.element]:{code:out.effect.code,bonus:out.effect.bonus,turns:out.effect.turns}};
    missionLog(name+" lance "+spell.nom+on+detail+" : +"+out.effect.bonus+" de protection contre "+missionElementThe(out.effect.element)+", pendant "+out.effect.turns+" tours.","magic");
  }else if(spell.effet==="terrain_infranchissable"){
    m.terrain=[...(m.terrain||[]),{q:out.terrain.q,r:out.terrain.r,untilTurn:m.turn+out.terrain.turns}];
    missionLog(name+" lance "+spell.nom+detail+" : la case devient infranchissable pendant "+out.terrain.turns+" tours.","magic");
  }else if(spell.effet==="brouillard"){
    // Les cases hors de la carte sont perdues ; un nouveau brouillard remplace l'ancien sur les mêmes cases.
    const cells=out.fog.cells.filter(c=>validMissionHex(c.q,c.r)),same=f=>cells.some(c=>c.q===f.q&&c.r===f.r);
    m.fog=[...(m.fog||[]).filter(f=>!same(f)),...cells.map(c=>({q:c.q,r:c.r,untilTurn:m.turn+out.fog.turns}))];
    effect=cells.length>0;
    missionLog(name+" lance "+spell.nom+detail+" : un rideau de brouillard de "+cells.length+" cases coupe la ligne de vue pendant "
      +out.fog.turns+" tours.","magic");
  }else if(spell.effet==="bonus_caracteristiques"){
    // Sur soi-même, l'activation en cours compte comme la première (Force de titan, puis frapper dans la foulée).
    const fx=out.effect,self=target===caster,turns=self?fx.turns-1:fx.turns;
    target.statBuffs={...(target.statBuffs||{}),[fx.code]:{stats:fx.stats,value:fx.value,unit:fx.unit,turns}};
    const amount=fx.unit==="pourcentage"?"+"+fx.value+" % de ":"+"+fx.value+" de ";
    const when=self?(fx.turns>1?"pour cette activation et la suivante":"pour cette activation")
      :(fx.turns>1?"pour ses "+fx.turns+" prochaines activations":"pour sa prochaine activation");
    missionLog(name+" lance "+spell.nom+on+detail+" : "+amount+fx.stats.join(" et de ")+", "+when+".","magic");
  }else if(spell.effet==="crachat_venin"){
    // Le tir demande l'action rapide : il sert aux prochaines activations de la cible, même si le lanceur se vise.
    target.venom={...out.effect};
    missionLog(name+" lance "+spell.nom+on+detail+" : "+(target===caster?name:target.character.name)+" pourra cracher du venin (action rapide, "
      +out.effect.min+" à "+out.effect.max+" cases) "+(out.effect.turns>1?"pendant ses "+out.effect.turns+" prochaines activations":"à sa prochaine activation")+".","magic");
  }else if(spell.effet==="malus_caracteristiques"){
    const fx=out.effect;
    target.statMalus={code:fx.code,stats:fx.stats,malus:fx.malus,turns:fx.turns};
    effect=fx.malus>0;
    missionLog(name+" lance "+spell.nom+on+detail+" : −"+fx.malus+" en "+fx.stats.join(" et en ")
      +(fx.protection?" (malus de "+fx.raw+", protection contre "+missionElementThe(fx.element)+" "+Math.round(fx.protection)+" %)":"")
      +", pendant "+fx.turns+" tour"+(fx.turns>1?"s":"")+".","magic");
  }
  learn(effect);
  return out;
}
// Case vide : ni personnage en jeu, ni flaque de magma.
function missionCellFree(target){
  if(!target||target.character) return true;
  return !missionUnits().some(u=>u.alive&&!u.offMap&&u.q===target.q&&u.r===target.r)&&!missionTerrainAt(target.q,target.r);
}

function castPlayerMissionSpell(target,extra={}){
  const m=game.mission,u=missionActiveUnit(),code=missionSpellMode();
  if(!u||!code) return;
  if(missionMagic()?.spell(code)?.cible==="soi"&&target!==u) return;
  m.mode=null;
  m.spellTarget=null;
  resolveMissionSpell(u,target,code,extra);
  if(missionActiveUnitLost()) return;
  renderMission();
}

// Régénération (doc 12) : le soin tombe au début de chaque activation de la cible, jusqu'à la fin de sa durée.
function tickMissionRegeneration(unit){
  const effect=unit.regeneration,magic=missionMagic();
  if(!effect||!magic||!unit.alive) return;
  const tick=magic.tick(effect),healed=healMissionUnit(unit,tick.amount);
  effect.turns=tick.turnsLeft;
  if(effect.turns<=0) unit.regeneration=null;
  missionLog("Régénération : "+unit.character.name+" récupère "+healed+" PV"
    +(effect.turns>0?" (encore "+effect.turns+" tour"+(effect.turns>1?"s":"")+").":" (fin)."),"magic");
}

// Arme enflammée, Arme de glace, Arme électrique, Armure de feu et Armure de froid (doc 12) : actives pendant leur nombre
// de tours, décomptés au début de chaque activation de celui qui les porte (le tour du lancer compte).
function tickMissionEnchantments(unit){
  const name=unit.character.name;
  if(unit.weaponEnchant){
    unit.weaponEnchant.turns-=1;
    if(unit.weaponEnchant.turns<=0){
      const element=unit.weaponEnchant.element;
      unit.weaponEnchant=null;
      missionLog(element==="froid"?"Le givre de l’arme de "+name+" fond."
        :element==="foudre"?"L’arme de "+name+" cesse de crépiter.":"Les flammes de l’arme de "+name+" s’éteignent.","magic");
    }
  }
  for(const [element,effect] of Object.entries(unit.elementalBonus||{})){
    effect.turns-=1;
    if(effect.turns<=0){
      delete unit.elementalBonus[element];
      const label=missionMagic()?.spell(effect.code)?.nom||"Armure de feu";
      missionLog("L’"+label.charAt(0).toLowerCase()+label.slice(1)+" de "+name+" se dissipe.","magic");
    }
  }
}
// Transmutation (doc 12) : un bonus couvre les turns prochaines activations de la cible (l'activation en cours compte
// déjà si le lanceur s'est visé lui-même) ; le venin de même. Ils tombent au début de l'activation suivante.
function tickMissionBuffs(unit){
  const magic=missionMagic(),name=unit.character.name;
  for(const [code,fx] of Object.entries(unit.statBuffs||{})){
    if(fx.turns>0){ fx.turns-=1; continue; }
    delete unit.statBuffs[code];
    missionLog((magic?.spell(code)?.nom||code)+" : l’effet prend fin pour "+name+".","magic");
  }
  if(unit.venom){
    if(unit.venom.turns>0) unit.venom.turns-=1;
    else{ unit.venom=null; missionLog(name+" ne peut plus cracher de venin.","magic"); }
  }
  if(unit.frenzy){
    if(unit.frenzy.turns>0) unit.frenzy.turns-=1;
    else{ unit.frenzy=null; missionLog(name+" sort de sa frénésie.","magic"); }
  }
}
// Frénésie (Illusion ; Idan : la cible joue seule) : joueur ou ennemi, elle prend une arme de mêlée si l'autre set en a une,
// puis frappe au contact, charge, ou fonce sur l'ennemi le plus proche ; jamais de tir ni de sort.
function frenzyMissionActivation(unit){
  const e=game.mission.engine;
  let target=nearestMissionTarget(unit);
  if(!target) return;
  missionLog(unit.character.name+" est en frénésie et fonce sur "+target.character.name+".","bad");
  if(!e.isMeleeWeapon(e.weaponTemplate(e.activeWeaponItem(unit)))&&unit.quickAvailable&&e.canSwitchWeaponSet(unit)){
    const before=unit.activeSet;
    e.switchWeaponSet(unit);
    if(e.isMeleeWeapon(e.weaponTemplate(e.activeWeaponItem(unit)))){
      unit.quickAvailable=false;
      missionLog(unit.character.name+" change d’arme : "+e.activeWeaponItem(unit).name+".","gear");
    }else unit.activeSet=before;
  }
  const strike=()=>{
    if(!missionUsableHands(unit,target).some(h=>h.mode==="melee")) return false;
    performMissionAttack(unit,target,"melee",e.axialDistance(unit,target));
    return true;
  };
  if(strike()||enemyTryCharge(unit,target)) return;
  enemyMoveToward(unit,target);
  if(game.mission.over||!unit.alive) return;
  target=nearestMissionTarget(unit);
  if(target) strike();
}
// Poison (doc 12 ; Idan, 2026-10-27) : au début de chacune de ses activations, l'empoisonné tente un jet de résistance
// qui annule l'effet ; raté, il subit les dégâts légers du poison. Il dure combat.poison.turns tours ; Purge le retire.
function tickMissionPoison(unit){
  const fx=unit.poisoned;
  if(!fx||typeof fx!=="object"||unit.alive===false) return;
  const m=game.mission,r=m.engine.resolvePoison(unit),name=unit.character.name;
  const detail=" (résistance "+missionPercent(r.p)+", jet "+r.roll+")";
  if(r.resisted){ unit.poisoned=false; missionLog(name+" résiste au poison"+detail+" : l’effet est annulé.","magic"); return; }
  missionLog(name+" souffre du poison"+detail+" : −"+r.damage+" PV"+missionProtectionNote(r)+".","damage");
  damageMissionUnitBySpell(unit,r.damage,missionUnits().find(u=>u.id===fx.sourceId)||null,"poison");
  fx.turns-=1;
  if(unit.alive&&fx.turns<=0){ unit.poisoned=false; missionLog("Le poison quitte "+name+".","magic"); }
  checkMissionEnd();
}
function missionFeminine(unit){ return String(unit?.character?.sex||"").trim().toLowerCase().startsWith("f"); }
// Dégâts d'un sort sur une unité : physiques (Télékinésie : l'étape Blesser, l'armure compte) ou élémentaires.
// label et note pour le journal : « 34 PV contondants (Blesser 72 %, jet 40) », « 30 PV de feu (protection 9 %) ».
function missionSpellHit(unit,out,amount,caster){
  if(out.psychic){
    const factor=missionMagic().willFactor(caster,unit),damage=Math.ceil(amount*factor-1e-9);
    damageMissionUnitBySpell(unit,damage,caster,null);
    return {damage,label:damage+" PV psychiques",note:" (Volonté × "+(Math.round(factor*100)/100).toLocaleString("fr-FR")+")"};
  }
  if(out.physical){
    const hit=game.mission.engine.spellPhysicalHit(caster,unit,amount,out.physical);
    if(hit.wound) damageMissionUnitBySpell(unit,hit.damage,caster,out.physical.type);
    return {...hit,label:hit.wound?hit.damage+" PV contondants":"l’armure encaisse",note:" (Blesser "+Math.round(hit.pWound)+" %, jet "+hit.woundRoll+")"};
  }
  const hit=missionElementalHit(unit,out.element,amount,caster);
  return {...hit,label:hit.damage+" PV de "+out.element,note:missionProtectionNote(hit)};
}
// Attraction, Projection (doc 12) : la cible suit les cases jusqu'au premier obstacle (un personnage, une flaque de
// magma, le bord du terrain), sans attaque d'opportunité ; l'obstacle l'arrête et lui inflige un choc, qui passe par
// l'armure.
function missionForcedMove(unit,out,caster){
  const move=out.move,name=unit.character.name;
  let moved=0,obstacle=null;
  for(const c of move.cells){
    if(!validMissionHex(c.q,c.r)){ obstacle="le bord du terrain"; break; }
    const other=missionUnits().find(u=>u!==unit&&u.alive&&!u.offMap&&u.q===c.q&&u.r===c.r);
    if(other){ obstacle=other.character.name; break; }
    if(missionTerrainAt(c.q,c.r)){ obstacle="la flaque de magma"; break; }
    unit.q=c.q;unit.r=c.r;moved++;
  }
  if(!moved&&!obstacle) return;
  const verb=(move.kind==="attire"?"attiré":"repoussé")+(missionFeminine(unit)?"e":"");
  missionLog(moved?name+" est "+verb+" de "+moved+" case"+(moved>1?"s":"")+(obstacle?" et heurte "+obstacle:"")+".":name+" heurte aussitôt "+obstacle+".","move");
  if(obstacle&&move.chocAmount&&unit.alive){
    const hit=missionSpellHit(unit,out,move.chocAmount,caster);
    missionLog("Choc : "+name+", "+hit.label+hit.note+".","damage");
  }
}
// Déplacement et Entrechoc (Télékinésie) : deux clics. D'abord la cible ; puis la case libre où la pousser
// (Déplacement) ou l'ennemi voisin à frapper avec elle (Entrechoc).
function missionTwoStepTargets(spell){
  const m=game.mission,u=missionActiveUnit(),magic=missionMagic(),set=new Set(),first=m.spellTarget;
  if(!u||!magic) return set;
  if(first?.alive){
    if(spell.effet==="deplacement_force"){
      for(const c of missionNeighbors(first)) if(missionCellFree(c)) set.add(missionKey(c.q,c.r));
    }else{
      for(const foe of missionOpponents(u)) if(!foe.offMap&&magic.canCastPair(u,first,foe,spell.code,{lineOfSight:missionLineOfSight(u,first),
        secondLineOfSight:missionLineOfSight(u,foe)}).ok) set.add(missionKey(foe.q,foe.r));
    }
    return set;
  }
  for(const unit of missionUnits()) if(unit.alive&&!unit.offMap&&magic.canCast(u,unit,spell.code,{lineOfSight:missionLineOfSight(u,unit)}).ok)
    set.add(missionKey(unit.q,unit.r));
  return set;
}
function handleMissionTwoStepSpell(spell,q,r,clicked){
  const m=game.mission,first=m.spellTarget;
  if(first?.alive&&missionTwoStepTargets(spell).has(missionKey(q,r))){
    if(spell.effet==="deplacement_force"&&!clicked){ castPlayerMissionSpell(first,{destination:{q,r}}); return; }
    if(spell.effet==="degats_paire"&&clicked){ castPlayerMissionSpell(first,{second:clicked}); return; }
  }
  m.spellTarget=null;
  if(clicked&&missionTwoStepTargets(spell).has(missionKey(q,r))) m.spellTarget=clicked;
  renderMission();
}
// Crachat de venin (doc 12) : le tir de venin, par l'action rapide de celui qui a reçu le sort ; s'il blesse, il empoisonne.
function spitMissionVenom(unit,target){
  const magic=missionMagic(),out=magic.spit(unit,target,{lineOfSight:missionLineOfSight(unit,target)});
  if(!out.ok){ missionLog(out.reason,"bad"); return out; }
  unit.quickAvailable=false;
  const name=unit.character.name,foe=target.character.name;
  if(out.deflected){
    missionLog(name+" crache du venin sur "+foe+" : dévié par le champ de protection ("+Math.round(out.pDeflect)+" %, jet "+out.deflectRoll+").","miss");
    return out;
  }
  const aim=" (toucher "+Math.round(out.pHit)+" %, jet "+out.hitRoll+")";
  if(!out.hit){ missionLog(name+" crache du venin sur "+foe+" : raté"+aim+".","miss"); return out; }
  const hit=missionElementalHit(target,"poison",out.amount,unit);
  missionLog(name+" crache du venin sur "+foe+" : touché"+aim+", "+hit.damage+" PV de poison"+missionProtectionNote(hit)+".","damage");
  if(hit.damage>0&&target.alive){
    target.poisoned={code:out.code,turns:out.poison.turns,amount:out.poison.amount,sourceId:unit.id};
    missionLog(foe+" est empoisonné"+(missionFeminine(target)?"e":"")+" pour "+out.poison.turns+" tours.","bad");
  }
  checkMissionEnd();
  return out;
}
// Gel (doc 12) : le malus compte dès le lancer et couvre les turns prochaines activations de la cible ; il tombe au début
// de l'activation suivante, avant le calcul du mouvement.
function tickMissionChill(unit){
  const fx=unit.statMalus;
  if(!fx) return;
  if(fx.turns>0){ fx.turns-=1; return; }
  unit.statMalus=null;
  missionLog(unit.character.name+" dégèle : "+fx.stats.join(" et ")+" reviennent.","magic");
}
// Dégâts élémentaires d'un sort sur une unité : protection (résistance + armure + bonus, bornée) puis PV.
function missionElementalHit(unit,element,amount,source=null){
  const hit=game.mission.engine.elementalDamage(unit,element,amount);
  damageMissionUnitBySpell(unit,hit.damage,source,element);
  return hit;
}
// « le feu », « la foudre »… et « du feu », « de la foudre »… pour le journal.
function missionElementThe(element){ return element==="foudre"?"la foudre":"le "+element; }
function missionElementSome(element){ return element==="foudre"?"de la foudre":"du "+element; }
function missionProtectionNote(hit){
  const p=Math.round(hit.applied);
  return p?" (protection "+(p>0?p:"−"+Math.abs(p))+" %)":"";
}
// Arme enflammée, Arme de glace ou Arme électrique : chaque coup qui touche (non bloqué) ajoute des dégâts de feu, de froid
// ou de foudre, même s'il ne blesse pas.
function missionWeaponEnchantStrike(attacker,target,result){
  const fx=attacker.weaponEnchant,magic=missionMagic();
  if(!fx||!magic||!result?.ok||!result.hit||result.blocked||!target.alive) return;
  const strike=magic.weaponStrike(fx),hit=missionElementalHit(target,fx.element,strike.amount,attacker);
  missionLog((magic.spell(fx.code)?.nom||"Arme enflammée")+" : "+target.character.name+" subit "+hit.damage+" PV de "+fx.element+missionProtectionNote(hit)+".","magic");
  checkMissionEnd();
}

// IA des sorts (pour tester, et pour le combat automatique) : Soin profond sur l'allié le plus blessé sous 35 % de ses PV,
// à portée, à la place de l'attaque ; Soin rapide, sinon Eau guérissante ou Cautérisation (action rapide), sur l'allié
// le plus blessé sous 60 %. Les autres sorts restent au joueur.
function missionAiCast(unit){
  const magic=missionMagic();
  if(!magic||!magic.knownSpells(unit).length) return;
  const allies=livingMissionUnits(unit.team).filter(a=>!a.offMap).sort((a,b)=>a.hp/a.pvMax-b.hp/b.pvMax);
  const pick=(code,ratio)=>allies.find(a=>a.hp/a.pvMax<ratio&&magic.canCast(unit,a,code,{lineOfSight:missionLineOfSight(unit,a)}).ok);
  const deep=pick("deep_heal",0.35);
  if(deep) resolveMissionSpell(unit,deep,"deep_heal");
  if(!unit.alive||game.mission.over) return;
  for(const code of ["quick_heal","healing_water","cauterize"]){
    const ally=pick(code,0.6);
    if(ally){ resolveMissionSpell(unit,ally,code); break; }
  }
}

function renderMissionSpellBar(u){
  const m=game.mission,magic=missionMagic();
  if(!u||!magic||m.phase!=="player"||m.over) return "";
  const spells=magic.knownSpells(u);
  // Crachat de venin reçu : un bouton de tir, même sans sort connu.
  const venom=u.venom?`<button class="secondary mission-spell${m.mode==="venom"?" selected":""}" data-venom="1" title="${esc("Cracher du venin — action rapide · "
    +u.venom.min+" à "+u.venom.max+" cases\nDégâts de poison ; la cible blessée est empoisonnée."+(u.quickAvailable===false?"\nAction rapide déjà utilisée.":""))}"`
    +`${u.quickAvailable===false?" disabled":""}><span class="mission-spell-text">Cracher du venin<small>rapide · ${u.venom.min}–${u.venom.max} cases</small></span></button>`:"";
  if(!spells.length) return venom;
  const mana=magic.currentMana(u);
  return `<span class="mission-mana">Mana ${Math.floor(mana)}/${Math.round(magic.manaMax(u))}</span>`+spells.map(s=>{
    const cost=magic.manaCost(u,s.code),p=magic.castChance(u,s.code).p,quick=s.action==="rapide";
    const used=quick?u.quickAvailable===false:u.attackAvailable===false;
    const reason=used?(quick?"Action rapide déjà utilisée.":"Action principale déjà utilisée."):mana<cost?"Pas assez de mana.":"";
    const title=s.nom+" — "+(quick?"action rapide":"action principale")+" · "+cost+" mana · "+Math.round(p)+" % de réussite\n"
      +s.description+(reason?"\n"+reason:"");
    return `<button class="secondary mission-spell${m.mode==="spell:"+s.code?" selected":""}" data-spell="${esc(s.code)}" title="${esc(title)}"${reason?" disabled":""}>`
      +`${typeof spellIconHtml==="function"?spellIconHtml(s):""}`
      +`<span class="mission-spell-text">${esc(s.nom)}<small>${quick?"rapide":"principale"} · ${cost} mana · ${Math.round(p)} %</small></span></button>`;
  }).join("")+venom;
}

function nearestMissionTarget(unit){
  const targets=livingMissionUnits(unit.team==="player"?"enemy":"player").filter(t=>!t.camouflaged);
  return [...targets].sort((a,b)=>{
    const da=game.mission.engine.axialDistance(unit,a),db=game.mission.engine.axialDistance(unit,b);
    return da-db||a.hp-b.hp;
  })[0]||null;
}

function enemyTryUsefulSet(unit,target){
  const e=game.mission.engine;
  const distance=e.axialDistance(unit,target);
  let weapon=e.weaponTemplate(e.activeWeaponItem(unit));
  let mode=e.isRangedWeapon(weapon)?"ranged":"melee";
  const usable=mode=>e.canAttackAtDistance(unit,distance,mode)&&(mode!=="ranged"||missionLineOfSight(unit,target));
  if(usable(mode)) return;

  if(!unit.quickAvailable||!e.canSwitchWeaponSet(unit)) return;
  const before=unit.activeSet;
  e.switchWeaponSet(unit);
  weapon=e.weaponTemplate(e.activeWeaponItem(unit));
  mode=e.isRangedWeapon(weapon)?"ranged":"melee";
  if(usable(mode)){
    unit.quickAvailable=false;
    missionLog(unit.character.name+" change d’arme : "+e.activeWeaponItem(unit).name+".","gear");
  }else{
    unit.activeSet=before;
  }
}

// IA : une arme déchargée est rechargée avec l'Action rapide, si elle est encore disponible.
function enemyTryReload(unit){
  if(!unit.quickAvailable) return;
  const item=game.mission.engine.reload(unit);
  if(!item) return;
  unit.quickAvailable=false;
  missionLog(unit.character.name+" recharge son "+item.name+".","gear");
}

function enemyMoveToward(unit,target){
  const max=game.mission.engine.movementBase(unit);
  const blocked=occupiedMissionKeys(unit);
  let best={q:unit.q,r:unit.r,path:[],distance:game.mission.engine.axialDistance(unit,target)};
  const queue=[{q:unit.q,r:unit.r,path:[]}],seen=new Set([missionKey(unit.q,unit.r)]);

  while(queue.length){
    const cur=queue.shift();
    if(cur.path.length>=max) continue;
    for(const next of missionNeighbors(cur)){
      const key=missionKey(next.q,next.r);
      if(seen.has(key)||blocked.has(key)) continue;
      seen.add(key);
      const path=[...cur.path,next];
      const dist=game.mission.engine.axialDistance(next,target);
      if(dist<best.distance||(dist===best.distance&&path.length<best.path.length)){
        best={q:next.q,r:next.r,path,distance:dist};
      }
      queue.push({q:next.q,r:next.r,path});
    }
  }

  if(best.path.length){
    const moved=moveMissionUnitAlongPath(unit,best.path);
    if(moved) missionLog(unit.character.name+" avance de "+moved+" hex.","move");
  }
}

function enemyTryCharge(unit,target){
  const e=game.mission.engine,charge=missionChargeIfClear(unit,target);
  if(!charge) return false;

  unit.movementRemaining=0;
  performMissionCharge(unit,target,charge);
  return true;
}

// Charge CAC V1, avec Contre-charge V1 : la cible réagit une fois pendant la course (mi-course pour une arme
// à distance, entrée dans la portée pour une arme d'hast), avant l'attaque du chargeur. Si la réaction blesse,
// la charge est brisée et le chargeur teste son Courage face à la cible.
function performMissionCharge(unit,target,charge){
  const m=game.mission,e=m.engine;
  // À deux armes, chaque arme de contre-charge riposte à son propre moment (décision Idan, 2026-10-08).
  const reactions=unit.camouflaged?[]:e.counterchargeTriggers(target,unit,charge);
  const stillCharging=()=>unit.alive&&!unit.fleeing&&!m.over;
  // Une charge arrêtée avant son attaque reste une charge tentée (Courage, doc 08).
  const broken=()=>{ MercenairesProgression.recordChargeAttempt(unit); };
  let moved=0;
  const advanceTo=at=>{
    const leg=charge.path.slice(moved,at);
    const done=moveMissionUnitAlongPath(unit,leg);
    moved+=done;
    return done===leg.length&&stillCharging();
  };

  for(const reaction of reactions){
    if(!advanceTo(reaction.at)){ broken(); return; }
    const distance=e.axialDistance(target,unit);
    if(!target.alive||target.fleeing||!missionUsableHands(target,unit).some(h=>h.hand===reaction.hand&&h.mode===reaction.mode)) continue;
    const r=e.resolveAttack(target,unit,{mode:reaction.mode,distance,hand:reaction.hand,bystanders:missionUnits()});
    logMissionAttack(target,unit,r,"countercharge");
    missionWeaponEnchantStrike(target,unit,r);
    const stray=logMissionStray(target,r);
    checkMissionEnd();
    if(stray) resolveMissionCourage(target,stray,{ok:true,mode:"ranged",wound:true});
    if(r.wound||!unit.alive){
      broken();
      if(unit.alive&&!m.over){
        missionLog("La charge de "+unit.character.name+" est brisée.","bad");
        resolveMissionCounterchargeCourage(target,unit,r,charge,charge.travel-moved);
      }
      return;
    }
  }
  if(!advanceTo(charge.path.length)){ broken(); return; }
  performMissionAttack(unit,target,"melee",1,charge);
}

// Contre-charge V1 : en cas d'échec, le chargeur passe En Fuite, fait demi-tour et dépense tout le mouvement
// de charge restant dans la direction opposée ; sans mouvement restant (ou sans case libre), il reste sur place.
function resolveMissionCounterchargeCourage(reactor,charger,result,charge,remaining){
  const e=game.mission.engine;
  const c=e.resolveCourage(reactor,charger,result,{defenderSurplus:0,units:missionUnits()});
  if(!c) return;
  const detail=" (Courage "+Math.round(c.pHold)+" %"+missionAuraNote(c.aura,c.auraFrom)+", jet "+c.roll+")";
  if(!c.flees){ missionLog(charger.character.name+" tient bon"+detail+".","info"); MercenairesProgression.recordCourageHeld(charger); return; }
  missionLog(charger.character.name+" panique et prend la fuite"+detail+" !","bad");
  MercenairesProgression.recordIntimidation(reactor,charger);
  charger.fleeing=true;charger.fleeTurn=0;
  const occupied=occupiedMissionKeys(charger),path=[];
  let at={q:charger.q,r:charger.r};
  for(let i=0;i<remaining;i++){
    const next={q:at.q-charge.step.q,r:at.r-charge.step.r};
    if(!validMissionHex(next.q,next.r)||occupied.has(missionKey(next.q,next.r))) break;
    path.push(next);at=next;
  }
  if(!path.length){ missionLog(charger.character.name+" ne peut pas reculer et reste sur place, en fuite.","move"); return; }
  missionFollowFleePath(charger,path,"fait demi-tour et s’enfuit");
}

function enemyMissionAct(unit){
  game.mission.actingUnit=unit;
  try{ enemyMissionActivation(unit); }
  finally{ if(game.mission) game.mission.actingUnit=null; }
}

function enemyMissionActivation(unit){
  if(!unit.alive||game.mission.over) return;
  resetMissionActivation(unit);
  if(unit.fleeing&&resolveMissionFleeingActivation(unit)) return;
  if(!unit.alive||game.mission.over) return;
  if(unit.frenzy){ frenzyMissionActivation(unit); return; }
  missionAiCast(unit);
  if(!unit.alive||game.mission.over||unit.attackAvailable===false) return;
  let target=nearestMissionTarget(unit);
  if(!target) return;

  enemyTryUsefulSet(unit,target);
  enemyTryReload(unit);
  let e=game.mission.engine,weapon=e.weaponTemplate(e.activeWeaponItem(unit));
  let mode=e.isRangedWeapon(weapon)?"ranged":"melee";
  let distance=e.axialDistance(unit,target);

  if(missionUsableHands(unit,target).length){
    performMissionAttack(unit,target,mode,distance);
    return;
  }

  if(mode==="melee"&&enemyTryCharge(unit,target)) return;

  enemyMoveToward(unit,target);
  if(game.mission.over||!unit.alive||unit.fleeing) return;

  target=nearestMissionTarget(unit);
  if(!target) return;
  enemyTryUsefulSet(unit,target);
  enemyTryReload(unit);
  weapon=e.weaponTemplate(e.activeWeaponItem(unit));
  mode=e.isRangedWeapon(weapon)?"ranged":"melee";
  distance=e.axialDistance(unit,target);

  if(missionUsableHands(unit,target).length){
    performMissionAttack(unit,target,mode,distance);
  }
}

// Combat automatique (doc 17 ; Idan, 2026-10-25 : « un mode simu pour tester rapidement les missions ») : votre équipe
// joue avec l'IA des ennemis (cible la plus proche, change d'arme, recharge, charge, attaque) jusqu'à la fin du combat ;
// le bilan de fin de mission est le même. La carte n'est redessinée qu'à la fin.
const AUTO_COMBAT_MAX_TURNS=100;
function autoResolveMission(){
  const m=game.mission;
  if(!m||m.over||m.phase!=="player"||!m.activeUnit) return;
  missionLog("Combat automatique : votre équipe joue seule jusqu’à la fin du combat.","turn");
  m.autoRunning=true;
  try{
    while(!m.over&&m.activeUnit&&m.turn<=AUTO_COMBAT_MAX_TURNS){
      enemyMissionAct(m.activeUnit);
      if(m.over) break;
      endMissionActivation();
    }
  }finally{ m.autoRunning=false; }
  if(!m.over) missionLog("Combat automatique arrêté au tour "+m.turn+" : à vous de jouer.","bad");
  renderMission();
}

function runMissionEnemyTurn(){
  const m=game.mission;
  if(!m||m.over) return;
  m.phase="enemy";m.activeUnit=null;m.mode=null;
  missionLog("Tour ennemi.","turn");
  renderMission();

  for(const unit of m.enemyOrder){
    if(m.over) break;
    enemyMissionAct(unit);
  }

  if(m.over){ renderMission(); return; }
  m.turn+=1;
  pruneMissionTerrain();
  resolveMissionDetection();
  for(const unit of m.players) unit.acted=false;
  missionLog("Tour "+m.turn+" — votre équipe.","turn");
  selectNextMissionPlayer();
}

// Modes d'attaque des armes tenues et prêtes (à deux armes, chaque main compte).
function missionHeldModes(u){
  const e=game.mission.engine,modes=new Set();
  for(const hand of e.isDualWielding(u)?["main","off"]:["main"]){
    const item=hand==="off"?e.activeOffhandItem(u):e.activeWeaponItem(u),w=e.weaponTemplate(item);
    if(!w||!e.isLoaded(u,item)) continue;
    if(e.isMeleeWeapon(w)) modes.add("melee");
    if(e.isRangedWeapon(w)) modes.add("ranged");
  }
  return modes;
}

// Un tir demande la ligne de vue (Brouillard).
function missionUsableHands(u,target){
  const e=game.mission.engine;
  if(missionHiddenFrom(target,u)) return [];
  return e.usableHands(u,e.axialDistance(u,target)).filter(h=>h.mode!=="ranged"||missionLineOfSight(u,target));
}
function missionCanAttack(u,target,mode){
  return missionUsableHands(u,target).some(h=>h.mode===mode);
}

function missionActionAvailability(){
  const u=missionActiveUnit(),m=game.mission;
  if(!u||!m||m.phase!=="player"||m.over) return {};
  const e=m.engine,w=e.weaponTemplate(e.activeWeaponItem(u));
  return {
    move:u.movementRemaining>0,
    melee:u.attackAvailable&&missionHeldModes(u).has("melee"),
    ranged:u.attackAvailable&&missionHeldModes(u).has("ranged"),
    charge:u.attackAvailable&&e.isMeleeWeapon(w)&&u.movementRemaining===e.movementBase(u),
    switch:u.quickAvailable&&e.canSwitchWeaponSet(u),
    reload:u.quickAvailable&&e.canReload(u),
    secondMove:u.attackAvailable,
    end:true,
    auto:true,
    testSpells:Boolean(missionMagic())&&!m.testSpells
  };
}

function targetableMissionCells(){
  const set=new Set(),m=game.mission,u=missionActiveUnit();
  if(!m||!u||m.phase!=="player") return set;

  if(m.mode==="move"){
    for(const [key,path] of missionReachablePaths(u,u.movementRemaining)) if(path.length) set.add(key);
    return set;
  }

  const spellCode=missionSpellMode(),magic=missionMagic();
  if(m.mode==="venom"){
    for(const foe of missionOpponents(u)) if(!foe.offMap&&magic?.canSpit(u,foe,{lineOfSight:missionLineOfSight(u,foe)}).ok) set.add(missionKey(foe.q,foe.r));
    return set;
  }
  if(spellCode){
    if(!magic) return set;
    const twoStep=magic.spell(spellCode);
    if(twoStep?.effet==="deplacement_force"||twoStep?.effet==="degats_paire") return missionTwoStepTargets(twoStep);
    const cible=magic.spell(spellCode)?.cible;
    if(cible==="case"||cible==="case_vide"){
      for(const c of missionCells()) if(magic.canCast(u,c,spellCode,{cellFree:missionCellFree(c),lineOfSight:missionLineOfSight(u,c)}).ok) set.add(missionKey(c.q,c.r));
    }else if(cible==="soi"){
      if(magic.canCast(u,u,spellCode).ok) set.add(missionKey(u.q,u.r));
    }else{
      for(const unit of missionUnits()) if(unit.alive&&!unit.offMap&&magic.canCast(u,unit,spellCode,{lineOfSight:missionLineOfSight(u,unit)}).ok) set.add(missionKey(unit.q,unit.r));
    }
    return set;
  }

  for(const enemy of livingMissionUnits("enemy")){
    if((m.mode==="melee"||m.mode==="ranged")&&missionCanAttack(u,enemy,m.mode)) set.add(missionKey(enemy.q,enemy.r));
    if(m.mode==="charge"&&missionChargeIfClear(u,enemy)) set.add(missionKey(enemy.q,enemy.r));
  }
  return set;
}

function missionRosterMagic(u){
  const magic=missionMagic();
  if(!magic||!magic.knownSpells(u).length) return "";
  return " · Mana "+Math.floor(magic.currentMana(u))+"/"+Math.round(magic.manaMax(u))+(u.regeneration?" · Régénération":"")
    +(u.weaponEnchant?" · Arme enflammée":"")+(u.elementalBonus?.froid?" · Armure de feu":"");
}

function renderMissionRoster(units){
  return units.map(u=>`
    <div class="mission-roster-row ${u.alive?"":"down"}">
      ${renderAvatar(u.character,{variant:"compact",kind:"portrait"})}
      <div class="mission-roster-copy">
        <strong>${esc(u.character.name)}</strong>
        <span>${u.offMap?"A quitté le combat":Math.max(0,u.hp)+"/"+u.pvMax+" PV"+(u.hp<0?" ("+u.hp+")":"")+(u.alive&&u.fleeing?" · En fuite":"")+(u.alive&&u.camouflaged?" · Camouflé":"")+(u.alive&&!game.mission.engine.isLoaded(u,game.mission.engine.activeWeaponItem(u))?" · Arme déchargée":"")}</span>
        <small>Init ${Math.round(game.mission.engine.initiative(u))} · Mvt ${game.mission.engine.movementBase(u)}${missionRosterMagic(u)}</small>
      </div>
    </div>
  `).join("");
}

function renderMission(){
  const m=game.mission;
  if(!m||m.autoRunning) return;
  const e=m.engine,u=missionActiveUnit(),targets=targetableMissionCells();
  const width=Math.ceil(88+Math.sqrt(3)*MISSION_MAP.size*(MISSION_MAP.cols+0.5));
  const height=Math.ceil(88+1.5*MISSION_MAP.size*(MISSION_MAP.rows-1)+2*MISSION_MAP.size);

  $("mission-turn").textContent=m.over?(m.winner==="player"?"Victoire":"Défaite"):"Tour "+m.turn+" · "+(m.phase==="player"?"Votre équipe":"Ennemi");
  $("mission-active").textContent=u
    ?"Actif : "+u.character.name+" · Mouvement "+u.movementRemaining+"/"+e.movementBase(u)*(u.secondMove?2:1)+" · Set "+u.activeSet
    :"";

  let cells="";
  for(const {q,r} of missionCells()){
    const p=missionHexPixel(q,r),key=missionKey(q,r),classes=["hex-cell"];
    let title="";
    if(targets.has(key)) classes.push(m.mode==="move"?"reachable":missionSpellMode()?"spell-target":"targetable");
    const magma=missionTerrainAt(q,r);
    if(magma){ classes.push("magma"); title=` title="Flaque de magma : infranchissable jusqu’au tour ${magma.untilTurn}"`; }
    if(m.spellTarget&&m.spellTarget.q===q&&m.spellTarget.r===r) classes.push("spell-chosen");
    const fog=missionFogAt(q,r);
    if(fog){ classes.push("fog"); title=` title="Brouillard : coupe la ligne de vue jusqu’au tour ${fog.untilTurn}"`; }
    if(targets.has(key)&&m.mode==="move"){
      const risk=missionPathOpportunityCount(u,shortestMissionPath(u,{q,r},u));
      if(risk){
        classes.push("provokes");
        title=` title="Provoque ${risk} attaque${risk>1?"s":""} d’opportunité"`;
      }
    }
    cells+=`<button class="${classes.join(" ")}" data-hex-q="${q}" data-hex-r="${r}"${title} style="left:${p.x-MISSION_MAP.size}px;top:${p.y-MISSION_MAP.size}px"></button>`;
  }

  const tokens=missionUnits().filter(unit=>!unit.offMap).map(unit=>{
    const p=missionHexPixel(unit.q,unit.r);
    const pct=Math.max(0,Math.round(unit.hp/unit.pvMax*100));
    const classes=["mission-token",unit.team,unit.alive?"alive":"down"];
    if(u===unit) classes.push("active");
    const encircled=unit.alive&&missionEncircled(unit);
    if(encircled) classes.push("encircled");
    if(unit.alive&&unit.fleeing) classes.push("fleeing");
    if(unit.alive&&unit.camouflaged) classes.push("camouflaged");
    const weapon=e.activeWeaponItem(unit);
    return `<div class="${classes.join(" ")}" style="left:${p.x-24}px;top:${p.y-24}px" title="${esc(unit.character.name)} — ${Math.max(0,unit.hp)}/${unit.pvMax} PV — ${esc(weapon?.name||"Sans arme")}${unit.alive&&unit.camouflaged?" — camouflé":""}">
      ${renderAvatar(unit.character,{variant:"battle",kind:"portrait"})}
      <span class="token-hp"><i style="width:${pct}%"></i></span>
      <strong>${esc(unit.character.name.split(" ")[0])}</strong>
      <em>${unit.alive&&unit.fleeing?"En fuite":Math.max(0,unit.hp)+"/"+unit.pvMax+" PV"}</em>
    </div>`;
  }).join("");

  // La carte entière tient dans la colonne centrale : réduction si la place manque.
  const map=$("mission-map"),available=map.parentElement.clientWidth-2;
  map.style.width=width+"px";
  map.style.height=height+"px";
  map.style.zoom=available>0&&available<width?String(available/width):"";
  map.innerHTML=cells+tokens;

  const availability=missionActionAvailability();
  const buttons=[
    ["mission-move-btn","move"],["mission-attack-btn","melee"],["mission-charge-btn","charge"],
    ["mission-switch-btn","switch"],["mission-reload-btn","reload"],["mission-ranged-btn","ranged"],["mission-second-move-btn","secondMove"],["mission-end-activation-btn","end"],["mission-auto-btn","auto"]
  ];
  for(const [id,key] of buttons){
    $(id).disabled=!availability[key];
    $(id).classList.toggle("selected",m.mode===key);
  }
  $("mission-test-spells-btn").disabled=!availability.testSpells;
  $("mission-spells").innerHTML=renderMissionSpellBar(u);

  $("mission-roster-player").innerHTML=renderMissionRoster(m.playerOrder);
  $("mission-roster-enemy").innerHTML=renderMissionRoster(m.enemyOrder);
  $("mission-console").innerHTML=m.log.slice().reverse().map(x=>`<div class="combat-log ${x.kind}">${esc(x.message)}</div>`).join("");
  $("mission-result").classList.toggle("hidden",!m.over);
  $("mission-aftermath").innerHTML=m.over?renderMissionAftermath(m):"";
  $("mission-result-back-btn").textContent=m.companyReport?.gameOver?"Fin de la partie":"Retour à la compagnie";
  $("mission-leave-btn").disabled=!m.over;
  $("mission-leave-btn").title=m.over?"":"Disponible une fois le combat terminé";
}

// Les morts étant définitives, on ne quitte la Mission Test qu'une fois le combat résolu
// (review Chatty, PR #20). Une vraie retraite aura plus tard sa propre résolution.
function leaveMission(){
  if(game.mission&&!game.mission.over) return;
  const gameOver=game.mission?.companyReport?.gameOver;
  game.mission=null;
  $("mission-panel").classList.add("hidden");
  if(gameOver){ showGameOver(); return; }
  $("game-panel").classList.remove("hidden");
  if(game.campaign) renderGame();
}

function initializeMissionUi(){
  $("mission-test-btn").addEventListener("click",openMissionSelection);
  $("mission-select-list").addEventListener("change",updateMissionSelectionCount);
  $("cancel-mission-select-btn").addEventListener("click",()=>$("mission-select-dialog").close());
  $("start-mission-btn").addEventListener("click",startMissionFromSelection);

  $("mission-move-btn").addEventListener("click",()=>setMissionMode("move"));
  $("mission-attack-btn").addEventListener("click",()=>setMissionMode("melee"));
  $("mission-charge-btn").addEventListener("click",()=>setMissionMode("charge"));
  $("mission-ranged-btn").addEventListener("click",()=>setMissionMode("ranged"));
  $("mission-switch-btn").addEventListener("click",switchMissionWeapon);
  $("mission-reload-btn").addEventListener("click",reloadMissionWeapon);
  $("mission-second-move-btn").addEventListener("click",missionSecondMove);
  window.addEventListener("resize",()=>{ if(game.mission) renderMission(); });
  $("mission-end-activation-btn").addEventListener("click",endMissionActivation);
  $("mission-auto-btn").addEventListener("click",autoResolveMission);
  $("mission-test-spells-btn").addEventListener("click",teachMissionTestSpells);
  $("mission-spells").addEventListener("click",event=>{
    const venom=event.target.closest("[data-venom]");
    if(venom){ if(!venom.disabled) setMissionMode(game.mission?.mode==="venom"?null:"venom"); return; }
    const button=event.target.closest("[data-spell]");
    if(!button||button.disabled) return;
    const mode="spell:"+button.dataset.spell;
    setMissionMode(game.mission?.mode===mode?null:mode);
  });
  $("mission-leave-btn").addEventListener("click",leaveMission);
  $("mission-result-back-btn").addEventListener("click",leaveMission);

  $("mission-map").addEventListener("click",event=>{
    const cell=event.target.closest("[data-hex-q]");
    if(cell) handleMissionHexClick(Number(cell.dataset.hexQ),Number(cell.dataset.hexR));
  });
}
