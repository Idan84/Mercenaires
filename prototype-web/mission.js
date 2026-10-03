"use strict";

const HEX_DIRS=[
  {q:1,r:0},{q:1,r:-1},{q:0,r:-1},
  {q:-1,r:0},{q:-1,r:1},{q:0,r:1}
];
const MISSION_MAP={cols:9,rows:7,size:34};

function missionKey(q,r){ return q+","+r; }
function validMissionHex(q,r){ return q>=0&&q<MISSION_MAP.cols&&r>=0&&r<MISSION_MAP.rows; }
function missionNeighbors(c){ return HEX_DIRS.map(d=>({q:c.q+d.q,r:c.r+d.r})).filter(n=>validMissionHex(n.q,n.r)); }
function missionUnits(){ return game.mission?[...game.mission.players,...game.mission.enemies]:[]; }
function livingMissionUnits(team){ return (team==="player"?game.mission.players:game.mission.enemies).filter(u=>u.alive); }
function missionActiveUnit(){ return game.mission?.activeUnit||null; }

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
  const spawn=team==="player"
    ? [{q:0,r:2},{q:0,r:3},{q:0,r:4}][index]
    : [{q:8,r:2},{q:8,r:3},{q:8,r:4}][index];
  return {
    id:team+"-"+character.id+"-"+index,
    character,team,q:spawn.q,r:spawn.r,
    hp:character.pvMax,alive:true,activeSet:1,prone:false,
    acted:false,movementRemaining:0,attackAvailable:true,quickAvailable:true
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
}

function openMissionSelection(){
  const eligible=allCharacters();
  $("mission-select-list").innerHTML=eligible.map((c,i)=>`
    <label class="mission-pick">
      <input type="checkbox" value="${c.id}" ${i<3?"checked":""}>
      <span><strong>${esc(c.name)}</strong><small>${esc(c.people)} · ${esc(c.equipment?.profile?.type||"")}</small></span>
      <em>${c.pvMax} PV</em>
    </label>
  `).join("");

  $("mission-select-error").textContent=eligible.length<3
    ?"Il faut au moins 3 personnages disponibles. Génère quelques candidats de test."
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
  const players=chosen.map((c,i)=>makeMissionUnit(c,"player",i));
  const enemies=enemyChars.map((c,i)=>makeMissionUnit(c,"enemy",i));

  game.mission={
    engine,players,enemies,
    playerOrder:sortMissionInitiative(players,engine),
    enemyOrder:sortMissionInitiative(enemies,engine),
    activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null
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
  const next=m.playerOrder.find(u=>u.alive&&!u.acted);
  if(!next){ runMissionEnemyTurn(); return; }
  m.phase="player";
  m.activeUnit=next;
  m.mode=null;
  resetMissionActivation(next);
  missionLog("Activation de "+next.character.name+".","turn");
  renderMission();
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
  return true;
}

function logMissionAttack(a,d,result,isCharge=false){
  const prefix=(isCharge?a.character.name+" charge ":a.character.name+" attaque ")
    +d.character.name+" avec "+result.weapon;

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
  missionLog(prefix+" : "+result.damage+" PV. "+d.character.name+" reste à "+result.targetHp+" PV.","damage");
  if(result.targetDown) missionLog(d.character.name+" est hors combat.","death");
}

function resolvePlayerMissionAttack(a,d,mode,distance){
  const result=game.mission.engine.resolveAttack(a,d,{mode,distance});
  if(!result.ok){ missionLog(result.reason||"Attaque impossible.","bad"); return; }
  a.attackAvailable=false;
  game.mission.mode=null;
  logMissionAttack(a,d,result,false);
  checkMissionEnd();
  renderMission();
}

function handleMissionHexClick(q,r){
  const m=game.mission,u=missionActiveUnit();
  if(!m||m.phase!=="player"||!u||m.over) return;

  const clicked=missionUnits().find(x=>x.alive&&x.q===q&&x.r===r);

  if(m.mode==="move"&&!clicked){
    const path=shortestMissionPath(u,{q,r},u);
    if(path&&path.length<=u.movementRemaining){
      u.q=q;u.r=r;u.movementRemaining-=path.length;
      missionLog(u.character.name+" se déplace de "+path.length+" hex.","move");
      m.mode=null;
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
    const charge=m.engine.chargeData(u,clicked);
    if(!charge.valid) return;
    if(occupiedMissionKeys(u).has(missionKey(charge.destination.q,charge.destination.r))) return;

    u.q=charge.destination.q;u.r=charge.destination.r;u.movementRemaining=0;
    const result=m.engine.resolveAttack(u,clicked,{mode:"melee",distance:1,chargeDistance:charge.travel});
    u.attackAvailable=false;m.mode=null;
    if(result.chargeFall) u.prone=true;
    logMissionAttack(u,clicked,result,true);
    checkMissionEnd();
    renderMission();
  }
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
    unit.q=best.q;unit.r=best.r;
    missionLog(unit.character.name+" avance de "+best.path.length+" hex.","move");
  }
}

function enemyTryCharge(unit,target){
  const e=game.mission.engine,charge=e.chargeData(unit,target);
  if(!charge.valid) return false;
  if(occupiedMissionKeys(unit).has(missionKey(charge.destination.q,charge.destination.r))) return false;

  unit.q=charge.destination.q;unit.r=charge.destination.r;
  const result=e.resolveAttack(unit,target,{mode:"melee",distance:1,chargeDistance:charge.travel});
  if(result.chargeFall) unit.prone=true;
  logMissionAttack(unit,target,result,true);
  checkMissionEnd();
  return true;
}

function enemyMissionAct(unit){
  if(!unit.alive||game.mission.over) return;
  let target=nearestMissionTarget(unit);
  if(!target) return;

  enemyTryUsefulSet(unit,target);
  let e=game.mission.engine,weapon=e.weaponTemplate(e.activeWeaponItem(unit));
  let mode=e.isRangedWeapon(weapon)?"ranged":"melee";
  let distance=e.axialDistance(unit,target);

  if(e.canAttackAtDistance(unit,distance,mode)){
    const result=e.resolveAttack(unit,target,{mode,distance});
    logMissionAttack(unit,target,result,false);
    checkMissionEnd();
    return;
  }

  if(mode==="melee"&&enemyTryCharge(unit,target)) return;

  enemyMoveToward(unit,target);
  if(game.mission.over) return;

  target=nearestMissionTarget(unit);
  if(!target) return;
  enemyTryUsefulSet(unit,target);
  weapon=e.weaponTemplate(e.activeWeaponItem(unit));
  mode=e.isRangedWeapon(weapon)?"ranged":"melee";
  distance=e.axialDistance(unit,target);

  if(e.canAttackAtDistance(unit,distance,mode)){
    const result=e.resolveAttack(unit,target,{mode,distance});
    logMissionAttack(unit,target,result,false);
    checkMissionEnd();
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
    end:true
  };
}

function targetableMissionCells(){
  const set=new Set(),m=game.mission,u=missionActiveUnit();
  if(!m||!u||m.phase!=="player") return set;

  if(m.mode==="move"){
    const occupied=occupiedMissionKeys(u);
    for(let q=0;q<MISSION_MAP.cols;q++) for(let r=0;r<MISSION_MAP.rows;r++){
      if(occupied.has(missionKey(q,r))) continue;
      const path=shortestMissionPath(u,{q,r},u);
      if(path&&path.length<=u.movementRemaining) set.add(missionKey(q,r));
    }
    return set;
  }

  for(const enemy of livingMissionUnits("enemy")){
    const distance=m.engine.axialDistance(u,enemy);
    if(m.mode==="melee"&&m.engine.canAttackAtDistance(u,distance,"melee")) set.add(missionKey(enemy.q,enemy.r));
    if(m.mode==="ranged"&&m.engine.canAttackAtDistance(u,distance,"ranged")) set.add(missionKey(enemy.q,enemy.r));
    if(m.mode==="charge"){
      const charge=m.engine.chargeData(u,enemy);
      if(charge.valid&&!occupiedMissionKeys(u).has(missionKey(charge.destination.q,charge.destination.r))){
        set.add(missionKey(enemy.q,enemy.r));
      }
    }
  }
  return set;
}

function renderMissionRoster(units){
  return units.map(u=>`
    <div class="mission-roster-row ${u.alive?"":"down"}">
      <strong>${esc(u.character.name)}</strong>
      <span>${u.hp}/${u.character.pvMax} PV</span>
      <small>Init ${Math.round(game.mission.engine.initiative(u))} · Mvt ${game.mission.engine.movementBase(u)}</small>
    </div>
  `).join("");
}

function renderMission(){
  const m=game.mission;
  if(!m) return;
  const e=m.engine,u=missionActiveUnit(),targets=targetableMissionCells();
  const width=Math.ceil(88+Math.sqrt(3)*MISSION_MAP.size*(MISSION_MAP.cols+(MISSION_MAP.rows-1)/2));
  const height=Math.ceil(88+1.5*MISSION_MAP.size*(MISSION_MAP.rows-1)+2*MISSION_MAP.size);

  $("mission-turn").textContent=m.over?(m.winner==="player"?"Victoire":"Défaite"):"Tour "+m.turn+" · "+(m.phase==="player"?"Votre équipe":"Ennemi");
  $("mission-active").textContent=u
    ?"Actif : "+u.character.name+" · Mouvement "+u.movementRemaining+"/"+e.movementBase(u)+" · Set "+u.activeSet
    :"";

  let cells="";
  for(let q=0;q<MISSION_MAP.cols;q++) for(let r=0;r<MISSION_MAP.rows;r++){
    const p=missionHexPixel(q,r),key=missionKey(q,r),classes=["hex-cell"];
    if(targets.has(key)) classes.push(m.mode==="move"?"reachable":"targetable");
    cells+=`<button class="${classes.join(" ")}" data-hex-q="${q}" data-hex-r="${r}" style="left:${p.x-MISSION_MAP.size}px;top:${p.y-MISSION_MAP.size}px"></button>`;
  }

  const tokens=missionUnits().map(unit=>{
    const p=missionHexPixel(unit.q,unit.r);
    const pct=Math.max(0,Math.round(unit.hp/unit.character.pvMax*100));
    const classes=["mission-token",unit.team,unit.alive?"alive":"down"];
    if(u===unit) classes.push("active");
    const weapon=e.activeWeaponItem(unit);
    return `<div class="${classes.join(" ")}" style="left:${p.x-24}px;top:${p.y-24}px">
      <strong>${esc(unit.character.name.split(" ")[0])}</strong>
      <small>${unit.hp}/${unit.character.pvMax}</small>
      <span class="token-hp"><i style="width:${pct}%"></i></span>
      <em>${esc(weapon?.name||"Sans arme")}</em>
    </div>`;
  }).join("");

  $("mission-map").style.width=width+"px";
  $("mission-map").style.height=height+"px";
  $("mission-map").innerHTML=cells+tokens;

  const availability=missionActionAvailability();
  const buttons=[
    ["mission-move-btn","move"],["mission-attack-btn","melee"],["mission-charge-btn","charge"],
    ["mission-switch-btn","switch"],["mission-ranged-btn","ranged"],["mission-end-activation-btn","end"]
  ];
  for(const [id,key] of buttons){
    $(id).disabled=!availability[key];
    $(id).classList.toggle("selected",m.mode===key);
  }

  $("mission-roster-player").innerHTML=renderMissionRoster(m.playerOrder);
  $("mission-roster-enemy").innerHTML=renderMissionRoster(m.enemyOrder);
  $("mission-console").innerHTML=m.log.slice().reverse().map(x=>`<div class="combat-log ${x.kind}">${esc(x.message)}</div>`).join("");
  $("mission-result").classList.toggle("hidden",!m.over);
}

function leaveMission(){
  game.mission=null;
  $("mission-panel").classList.add("hidden");
  $("game-panel").classList.remove("hidden");
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
  $("mission-end-activation-btn").addEventListener("click",endMissionActivation);
  $("mission-leave-btn").addEventListener("click",leaveMission);
  $("mission-result-back-btn").addEventListener("click",leaveMission);

  $("mission-map").addEventListener("click",event=>{
    const cell=event.target.closest("[data-hex-q]");
    if(cell) handleMissionHexClick(Number(cell.dataset.hexQ),Number(cell.dataset.hexR));
  });
}
