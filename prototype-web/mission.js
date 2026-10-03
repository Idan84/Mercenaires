"use strict";

const HEX_DIRS=[
  {q:1,r:0},{q:1,r:-1},{q:0,r:-1},
  {q:-1,r:0},{q:-1,r:1},{q:0,r:1}
];
// Carte rectangulaire en coordonnées « offset » (lignes impaires décalées) ; la logique reste en axial (q, r).
const MISSION_MAP={cols:13,rows:9,size:34,spawnRows:[3,4,5],spawnInset:2};
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
  return new Set(missionUnits().filter(u=>u.alive&&u!==except).map(u=>missionKey(u.q,u.r)));
}

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
  return {
    id:team+"-"+character.id+"-"+index,
    character,team,q:spawn.q,r:spawn.r,
    hp:character.pvMax,alive:true,activeSet:1,prone:false,
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
  unit.movementRemaining=game.mission.engine.movementBase(unit);
  unit.attackAvailable=true;
  unit.quickAvailable=true;
  unit.prone=false;
  unit.secondMove=false;
}

// Un blessé ou un fatigué de la compagnie ne peut pas partir en mission (10-mission-time §4 à §6).
function recoveryLabel(c){
  if(!c.recovery) return "";
  return (c.recovery.kind==="wounded"?"Blessé":"Fatigué")+" · "+c.recovery.daysLeft+" j";
}

function openMissionSelection(){
  const eligible=allCharacters();
  const available=eligible.filter(c=>!c.recovery);
  const preselected=new Set(available.slice(0,3));
  $("mission-select-list").innerHTML=eligible.map(c=>`
    <label class="mission-pick${c.recovery?" unavailable":""}">
      <input type="checkbox" value="${c.id}" ${preselected.has(c)?"checked":""} ${c.recovery?"disabled":""}>
      ${renderAvatar(c,{variant:"compact",kind:"portrait"})}
      <span><strong>${esc(c.name)}</strong><small>${esc(c.people)} · ${esc(c.equipment?.profile?.type||"")}${c.recovery?" · "+esc(recoveryLabel(c)):""}</small></span>
      <em>${c.pvMax} PV</em>
    </label>
  `).join("");

  $("mission-select-error").textContent=available.length<3
    ?"Il faut au moins 3 personnages disponibles. Passe des jours pour soigner les blessés, ou génère quelques candidats de test."
    :"";
  updateMissionSelectionCount();
  $("mission-select-dialog").showModal();
}

function updateMissionSelectionCount(){
  const checked=[...document.querySelectorAll("#mission-select-list input:checked")];
  if(checked.length>3) checked[checked.length-1].checked=false;
  const count=document.querySelectorAll("#mission-select-list input:checked").length;
  $("mission-select-count").textContent=count+"/3";
  $("start-mission-btn").disabled=count!==3;
}

function startMissionFromSelection(){
  const ids=[...document.querySelectorAll("#mission-select-list input:checked")].map(x=>Number(x.value));
  if(ids.length!==3) return;
  const chosen=ids.map(id=>allCharacters().find(c=>c.id===id)).filter(Boolean);
  if(chosen.length!==3) return;

  const enemyChars=Array.from({length:3},()=>createCharacter({role:"Ennemi test"}));
  const engine=MercenairesCombat.createCombatEngine(game.referenceData);
  const endRules=MercenairesMissionEnd.createMissionEndRules({reference:game.referenceData});
  const players=chosen.map((c,i)=>makeMissionUnit(c,"player",i));
  const enemies=enemyChars.map((c,i)=>makeMissionUnit(c,"enemy",i));

  game.mission={
    engine,endRules,players,enemies,
    playerOrder:sortMissionInitiative(players,engine),
    enemyOrder:sortMissionInitiative(enemies,engine),
    activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null
  };

  $("mission-select-dialog").close();
  $("game-panel").classList.add("hidden");
  $("mission-panel").classList.remove("hidden");
  missionLog("Mission Test : votre équipe joue en premier.","turn");
  missionLog("Ennemis générés : "+enemies.map(u=>u.character.name).join(", ")+".");
  selectNextMissionPlayer();
}

function selectNextMissionPlayer(){
  const m=game.mission;
  if(!m||m.over) return;
  for(;;){
    const next=m.playerOrder.find(u=>u.alive&&!u.acted);
    if(!next){ runMissionEnemyTurn(); return; }
    resetMissionActivation(next);
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
    ?"VICTOIRE — les 3 ennemis sont hors combat."
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
    id:u.character.id,name:u.character.name,hp:u.hp,pvMax:u.character.pvMax,
    damageTaken:u.damageTaken,stats:u.character.stats,
    isCaptain:captainId!=null&&u.character.id===captainId,offMap:u.offMap
  }));
  m.aftermath=m.endRules.resolveMissionEnd(participants);
  missionLog("Fin de mission : bilan de votre équipe.","turn");
  for(const r of m.aftermath.results) missionLog(r.name+" — "+missionAftermathText(r),r.dead?"death":r.wounded?"bad":"info");
  if(!game.campaign) return;
  const report=m.companyReport=campaignRules().applyMissionAftermath(game.campaign,m.aftermath);
  if(report.bonusPaid) missionLog("Primes de mission versées : "+report.bonusPaid+" PO ("+report.bonuses.map(b=>b.mercenary.name+" "+b.bonus).join(", ")+").","gear");
  if(report.gameOver){
    missionLog("Le capitaine est mort : la partie est terminée.","death");
    deleteSavedGame();
  }else{
    saveGame();
  }
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
      :"Bilan appliqué à la compagnie. Primes de mission versées : "+report.bonusPaid+" PO.";
  return `<ul class="mission-aftermath">${rows}</ul>
    ${report?.gameOver?`<p class="aftermath-gameover">Le capitaine est mort : la partie est terminée et la sauvegarde est effacée.</p>`:""}
    ${note?`<p class="aftermath-note">${esc(note)}</p>`:""}`;
}

function logMissionAttack(a,d,result,kind="attack"){
  if(!result.ok){ missionLog(result.reason||"Attaque impossible.","bad"); return; }
  const verb={charge:" charge ",opportunity:" profite de l’ouverture et frappe "}[kind]||" attaque ";
  const prefix=a.character.name+verb+d.character.name+" avec "+result.weapon
    +(result.opportunity?" (attaque d’opportunité, dans le dos)":result.encircled?" (cible encerclée, dans le dos)":result.backstab?" (dans le dos)":"");

  if(result.chargeFall){
    missionLog(a.character.name+" chute pendant sa charge et perd son attaque !","bad");
    return;
  }
  if(!result.hit){
    missionLog(prefix+" : raté ("+Math.round(result.pHit||0)+" %, jet "+(result.hitRoll||"—")+").","miss");
    return;
  }
  if(!result.wound){
    missionLog(prefix+" : touche mais ne blesse pas ("+Math.round(result.pWound||0)+" %, jet "+(result.woundRoll||"—")+").","hit");
    return;
  }
  missionLog(prefix+" : "+result.damage+" PV. "+d.character.name+" reste à "+Math.max(0,result.targetHp)+" PV"+(result.targetHp<0?" ("+result.targetHp+" sous zéro)":"")+".","damage");
  if(result.targetDown) missionLog(d.character.name+" est hors combat.","death");
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
    const result=m.engine.resolveAttack(reactor,target,{mode:"melee",opportunity:true});
    logMissionAttack(reactor,target,result,"opportunity");
    checkMissionEnd();
    resolveMissionCourage(reactor,target,result);
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
    const reactors=e.opportunityReactors(missionOpponents(unit),unit,step);
    if(reactors.length){
      missionLog(unit.character.name+" quitte la zone de menace de "+reactors.map(x=>x.character.name).join(", ")+".","move");
      resolveOpportunityAttacks(reactors,unit);
      if(!unit.alive||unit.q!==from.q||unit.r!==from.r||unit.fleeing!==wasFleeing) break;
    }
    unit.q=step.q;unit.r=step.r;moved++;
    unit.movementRemaining=Math.max(0,(unit.movementRemaining||0)-1);
  }
  return moved;
}

function missionPathOpportunityCount(unit,path){
  const e=game.mission.engine,opponents=missionOpponents(unit);
  let from={q:unit.q,r:unit.r},count=0;
  for(const step of path){
    count+=e.opportunityReactors(opponents,from,step).length;
    from=step;
  }
  return count;
}

// La charge suit une ligne droite : chaque case du trajet doit être libre.
function missionChargeIfClear(unit,target){
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

function performMissionAttack(attacker,target,mode,distance){
  const m=game.mission;
  if(mode==="ranged"){
    const reactors=m.engine.rangedOpportunityReactors(missionOpponents(attacker),attacker,target);
    if(reactors.length){
      const from={q:attacker.q,r:attacker.r},wasFleeing=attacker.fleeing;
      missionLog(attacker.character.name+" tire alors qu’il est menacé par "+reactors.map(x=>x.character.name).join(", ")+".","move");
      resolveOpportunityAttacks(reactors,attacker);
      if(!attacker.alive||attacker.q!==from.q||attacker.r!==from.r||attacker.fleeing!==wasFleeing) return null;
    }
  }
  const result=m.engine.resolveAttack(attacker,target,{mode,distance,encircled:missionEncircled(target)});
  logMissionAttack(attacker,target,result);
  checkMissionEnd();
  resolveMissionCourage(attacker,target,result);
  return result;
}

// Courage post-attaque CAC V1 / post-tir V1 / en sous-nombre V1 : un échec applique En Fuite.
function resolveMissionCourage(attacker,defender,result){
  const m=game.mission;
  if(!m||m.over||!result?.ok) return;
  const e=m.engine;
  const context={
    defenderSurplus:e.localMelee(defender,missionUnits()).surplus,
    attackerEncircles:e.axialDistance(attacker,defender)===1&&e.threatens(attacker,defender)&&missionEncircled(defender)
  };
  const c=e.resolveCourage(attacker,defender,result,context);
  if(!c) return;
  const detail=" (Courage "+Math.round(c.pHold)+" %"+(c.rule==="outnumbered"?", en sous-nombre":"")+", jet "+c.roll+")";
  if(!c.flees){ missionLog(c.subject.character.name+" tient bon"+detail+".","info"); return; }
  missionLog(c.subject.character.name+" panique et prend la fuite"+detail+" !","bad");
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
  if(target&&e.isRangedWeapon(e.weaponTemplate(e.activeWeaponItem(unit)))&&e.canAttackAtDistance(unit,distance,"ranged")){
    performMissionAttack(unit,target,"ranged",distance);
    return;
  }
  missionLog(unit.character.name+" reste tétanisé sur place.","move");
}

// Reprise de contrôle — En Fuite V1, au début de l'activation. Retourne true si l'activation est consommée.
function resolveMissionFleeingActivation(unit){
  const e=game.mission.engine;
  unit.fleeTurn=(unit.fleeTurn||0)+1;
  const recovery=e.rollRecovery(unit,nearestActiveMissionEnemy(unit),unit.fleeTurn);
  const detail=" (reprise "+Math.round(recovery.p)+" %, jet "+recovery.roll+")";
  if(recovery.recovered){
    unit.fleeing=false;unit.fleeTurn=0;
    missionLog(unit.character.name+" reprend ses esprits"+detail+".","turn");
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
  if(!m.engine.canAttackAtDistance(a,distance,mode)){ missionLog("Cible hors portée ou arme incompatible.","bad"); return; }
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
    moveMissionUnitAlongPath(u,charge.path);
    if(missionActiveUnitLost()) return;
    const result=m.engine.resolveAttack(u,clicked,{mode:"melee",distance:1,chargeDistance:charge.travel,encircled:missionEncircled(clicked)});
    if(result.chargeFall) u.prone=true;
    logMissionAttack(u,clicked,result,"charge");
    checkMissionEnd();
    resolveMissionCourage(u,clicked,result);
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

function nearestMissionTarget(unit){
  const targets=livingMissionUnits(unit.team==="player"?"enemy":"player");
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
  if(e.canAttackAtDistance(unit,distance,mode)) return;

  if(!e.canSwitchWeaponSet(unit)) return;
  const before=unit.activeSet;
  e.switchWeaponSet(unit);
  weapon=e.weaponTemplate(e.activeWeaponItem(unit));
  mode=e.isRangedWeapon(weapon)?"ranged":"melee";
  if(e.canAttackAtDistance(unit,distance,mode)){
    missionLog(unit.character.name+" change d’arme : "+e.activeWeaponItem(unit).name+".","gear");
  }else{
    unit.activeSet=before;
  }
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
  moveMissionUnitAlongPath(unit,charge.path);
  if(!unit.alive||unit.fleeing) return true;
  const result=e.resolveAttack(unit,target,{mode:"melee",distance:1,chargeDistance:charge.travel,encircled:missionEncircled(target)});
  if(result.chargeFall) unit.prone=true;
  logMissionAttack(unit,target,result,"charge");
  checkMissionEnd();
  resolveMissionCourage(unit,target,result);
  return true;
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
  let target=nearestMissionTarget(unit);
  if(!target) return;

  enemyTryUsefulSet(unit,target);
  let e=game.mission.engine,weapon=e.weaponTemplate(e.activeWeaponItem(unit));
  let mode=e.isRangedWeapon(weapon)?"ranged":"melee";
  let distance=e.axialDistance(unit,target);

  if(e.canAttackAtDistance(unit,distance,mode)){
    performMissionAttack(unit,target,mode,distance);
    return;
  }

  if(mode==="melee"&&enemyTryCharge(unit,target)) return;

  enemyMoveToward(unit,target);
  if(game.mission.over||!unit.alive||unit.fleeing) return;

  target=nearestMissionTarget(unit);
  if(!target) return;
  enemyTryUsefulSet(unit,target);
  weapon=e.weaponTemplate(e.activeWeaponItem(unit));
  mode=e.isRangedWeapon(weapon)?"ranged":"melee";
  distance=e.axialDistance(unit,target);

  if(e.canAttackAtDistance(unit,distance,mode)){
    performMissionAttack(unit,target,mode,distance);
  }
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
  for(const unit of m.players) unit.acted=false;
  missionLog("Tour "+m.turn+" — votre équipe.","turn");
  selectNextMissionPlayer();
}

function missionActionAvailability(){
  const u=missionActiveUnit(),m=game.mission;
  if(!u||!m||m.phase!=="player"||m.over) return {};
  const e=m.engine,w=e.weaponTemplate(e.activeWeaponItem(u));
  return {
    move:u.movementRemaining>0,
    melee:u.attackAvailable&&e.isMeleeWeapon(w),
    ranged:u.attackAvailable&&e.isRangedWeapon(w),
    charge:u.attackAvailable&&e.isMeleeWeapon(w)&&u.movementRemaining===e.movementBase(u),
    switch:u.quickAvailable&&e.canSwitchWeaponSet(u),
    secondMove:u.attackAvailable,
    end:true
  };
}

function targetableMissionCells(){
  const set=new Set(),m=game.mission,u=missionActiveUnit();
  if(!m||!u||m.phase!=="player") return set;

  if(m.mode==="move"){
    for(const [key,path] of missionReachablePaths(u,u.movementRemaining)) if(path.length) set.add(key);
    return set;
  }

  for(const enemy of livingMissionUnits("enemy")){
    const distance=m.engine.axialDistance(u,enemy);
    if(m.mode==="melee"&&m.engine.canAttackAtDistance(u,distance,"melee")) set.add(missionKey(enemy.q,enemy.r));
    if(m.mode==="ranged"&&m.engine.canAttackAtDistance(u,distance,"ranged")) set.add(missionKey(enemy.q,enemy.r));
    if(m.mode==="charge"&&missionChargeIfClear(u,enemy)) set.add(missionKey(enemy.q,enemy.r));
  }
  return set;
}

function renderMissionRoster(units){
  return units.map(u=>`
    <div class="mission-roster-row ${u.alive?"":"down"}">
      ${renderAvatar(u.character,{variant:"compact",kind:"portrait"})}
      <div class="mission-roster-copy">
        <strong>${esc(u.character.name)}</strong>
        <span>${u.offMap?"A quitté le combat":Math.max(0,u.hp)+"/"+u.character.pvMax+" PV"+(u.hp<0?" ("+u.hp+")":"")+(u.alive&&u.fleeing?" · En fuite":"")}</span>
        <small>Init ${Math.round(game.mission.engine.initiative(u))} · Mvt ${game.mission.engine.movementBase(u)}</small>
      </div>
    </div>
  `).join("");
}

function renderMission(){
  const m=game.mission;
  if(!m) return;
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
    if(targets.has(key)) classes.push(m.mode==="move"?"reachable":"targetable");
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
    const pct=Math.max(0,Math.round(unit.hp/unit.character.pvMax*100));
    const classes=["mission-token",unit.team,unit.alive?"alive":"down"];
    if(u===unit) classes.push("active");
    const encircled=unit.alive&&missionEncircled(unit);
    if(encircled) classes.push("encircled");
    if(unit.alive&&unit.fleeing) classes.push("fleeing");
    const weapon=e.activeWeaponItem(unit);
    return `<div class="${classes.join(" ")}" style="left:${p.x-24}px;top:${p.y-24}px" title="${esc(unit.character.name)} — ${Math.max(0,unit.hp)}/${unit.character.pvMax} PV — ${esc(weapon?.name||"Sans arme")}">
      ${renderAvatar(unit.character,{variant:"battle",kind:"portrait"})}
      <span class="token-hp"><i style="width:${pct}%"></i></span>
      <strong>${esc(unit.character.name.split(" ")[0])}</strong>
      <em>${unit.alive&&unit.fleeing?"En fuite":Math.max(0,unit.hp)+"/"+unit.character.pvMax+" PV"}</em>
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
    ["mission-switch-btn","switch"],["mission-ranged-btn","ranged"],["mission-second-move-btn","secondMove"],["mission-end-activation-btn","end"]
  ];
  for(const [id,key] of buttons){
    $(id).disabled=!availability[key];
    $(id).classList.toggle("selected",m.mode===key);
  }

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
  $("mission-second-move-btn").addEventListener("click",missionSecondMove);
  window.addEventListener("resize",()=>{ if(game.mission) renderMission(); });
  $("mission-end-activation-btn").addEventListener("click",endMissionActivation);
  $("mission-leave-btn").addEventListener("click",leaveMission);
  $("mission-result-back-btn").addEventListener("click",leaveMission);

  $("mission-map").addEventListener("click",event=>{
    const cell=event.target.closest("[data-hex-q]");
    if(cell) handleMissionHexClick(Number(cell.dataset.hexQ),Number(cell.dataset.hexR));
  });
}
