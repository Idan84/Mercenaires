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
  // L'intendant ne part plus en mission (Idan, 2026-10-24).
  const eligible=allCharacters().filter(c=>!game.campaign||c.id!==game.campaign.company.intendantId);
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
  selectNextMissionPlayer();
}

function selectNextMissionPlayer(){
  const m=game.mission;
  if(!m||m.over) return;
  for(;;){
    const next=m.playerOrder.find(u=>u.alive&&!u.acted);
    if(!next){ runMissionEnemyTurn(); return; }
    resetMissionActivation(next);
    m.progression.recordActivation(next);
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
    // Endurance avec la ceinture et Volonté avec l'amulette (Idan, 2026-10-24) : blessure, mort et convalescence
    // les lisent aussi.
    damageTaken:u.damageTaken,stats:{...u.character.stats,Endurance:m.engine.statWithGear(u,"Endurance"),
      "Volonté":m.engine.statWithGear(u,"Volonté")},
    isCaptain:captainId!=null&&u.character.id===captainId,offMap:u.offMap,progress:u.progress||null
  }));
  m.aftermath=m.endRules.resolveMissionEnd(participants);
  missionLog("Fin de mission : bilan de votre équipe.","turn");
  for(const r of m.aftermath.results) missionLog(r.name+" — "+missionAftermathText(r),r.dead?"death":r.wounded?"bad":"info");
  if(!game.campaign) return;
  const report=m.companyReport=campaignRules().applyMissionAftermath(game.campaign,m.aftermath);
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
      :"Bilan appliqué à la compagnie. Primes de mission versées : "+report.bonusPaid+" PO."+missionRenownNote(report);
  return `<ul class="mission-aftermath">${rows}</ul>
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
function signed(n){ n=Math.round(n); return (n>0?"+":"−")+Math.abs(n); }

// Les compétences ont un niveau continu (30,6) : le bilan montre les points entiers qui changent à l'arrondi.
function visibleProgressionChanges(changes){
  return changes.map(c=>{
    const shown=v=>c.family==="skills"?Math.round(v):v;
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
    const skills=Object.values(xp.skills||{}).flatMap(group=>Object.entries(group));
    // Compétences : les gains de pratique un à un ; la régression des autres armes et styles en un total.
    const regression=skills.filter(([,n])=>n<0).reduce((sum,[,n])=>sum+n,0);
    const gained=[...Object.entries(xp.stats||{}),...Object.entries(xp.resistances||{}),...skills.filter(([,n])=>n>0)]
      .filter(([,n])=>Math.round(n))
      .map(([name,n])=>`<span class="${n<0?"xp-loss":"xp-gain"}">${esc(progressionLabel(name))} ${signed(n)}</span>`)
      .concat(Math.round(regression)?[`<span class="xp-loss" title="Les autres armes et styles reculent quand on en pratique un">Autres armes ${signed(regression)}</span>`]:[])
      .join(" ");
    const moved=visibleProgressionChanges(changes)
      .map(c=>`<strong class="${c.shownAfter>c.shownBefore?"stat-up":"stat-down"}">${esc(progressionLabel(c.name))} ${c.shownBefore} → ${c.shownAfter} ${c.shownAfter>c.shownBefore?"▲":"▼"}</strong>`).join(" ");
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
    const reactors=e.opportunityReactors(missionOpponents(unit),unit,step);
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

// charge (facultatif) : données de Charge CAC V1 ; la charge est une seule séquence, sans enchaînement, et
// chaque arme de mêlée y reçoit le bonus de charge (à deux armes, chaque arme frappe : décision Idan, 2026-10-08).
function performMissionAttack(attacker,target,mode,distance,charge=null){
  const m=game.mission,e=m.engine;
  // Combat à deux armes CAC V1 : à chaque séquence, chaque arme utilisable frappe une fois (principale puis
  // secondaire), chacune avec son propre mode ; sinon, la seule arme principale.
  const dual=e.isDualWielding(attacker);
  const handsAt=d=>dual?e.usableHands(attacker,d):(e.canAttackAtDistance(attacker,d,mode)?[{hand:"main",mode}]:[]);
  if(handsAt(distance).some(h=>h.mode==="ranged")){
    const reactors=e.rangedOpportunityReactors(missionOpponents(attacker),attacker,target);
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
function resolveMissionCourage(attacker,defender,result,override={}){
  const m=game.mission;
  if(!m||m.over||!result?.ok) return;
  const e=m.engine;
  const context={
    defenderSurplus:e.localMelee(defender,missionUnits()).surplus,
    attackerEncircles:e.axialDistance(attacker,defender)===1&&e.threatens(attacker,defender)&&missionEncircled(defender),
    ...override
  };
  const c=e.resolveCourage(attacker,defender,result,context);
  if(!c) return;
  const detail=" (Courage "+Math.round(c.pHold)+" %"+(c.rule==="outnumbered"?", en sous-nombre":"")+", jet "+c.roll+")";
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
  if(!missionCanAttack(a,distance,mode)){ missionLog("Cible hors portée ou arme incompatible.","bad"); return; }
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

  if(!unit.quickAvailable||!e.canSwitchWeaponSet(unit)) return;
  const before=unit.activeSet;
  e.switchWeaponSet(unit);
  weapon=e.weaponTemplate(e.activeWeaponItem(unit));
  mode=e.isRangedWeapon(weapon)?"ranged":"melee";
  if(e.canAttackAtDistance(unit,distance,mode)){
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
  const reactions=e.counterchargeTriggers(target,unit,charge);
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
    if(!target.alive||target.fleeing||!e.usableHands(target,distance).some(h=>h.hand===reaction.hand&&h.mode===reaction.mode)) continue;
    const r=e.resolveAttack(target,unit,{mode:reaction.mode,distance,hand:reaction.hand,bystanders:missionUnits()});
    logMissionAttack(target,unit,r,"countercharge");
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
  const c=e.resolveCourage(reactor,charger,result,{defenderSurplus:0});
  if(!c) return;
  const detail=" (Courage "+Math.round(c.pHold)+" %, jet "+c.roll+")";
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
  let target=nearestMissionTarget(unit);
  if(!target) return;

  enemyTryUsefulSet(unit,target);
  enemyTryReload(unit);
  let e=game.mission.engine,weapon=e.weaponTemplate(e.activeWeaponItem(unit));
  let mode=e.isRangedWeapon(weapon)?"ranged":"melee";
  let distance=e.axialDistance(unit,target);

  if(e.usableHands(unit,distance).length){
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

  if(e.usableHands(unit,distance).length){
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

function missionCanAttack(u,distance,mode){
  return game.mission.engine.usableHands(u,distance).some(h=>h.mode===mode);
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
    if((m.mode==="melee"||m.mode==="ranged")&&missionCanAttack(u,distance,m.mode)) set.add(missionKey(enemy.q,enemy.r));
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
        <span>${u.offMap?"A quitté le combat":Math.max(0,u.hp)+"/"+u.character.pvMax+" PV"+(u.hp<0?" ("+u.hp+")":"")+(u.alive&&u.fleeing?" · En fuite":"")+(u.alive&&!game.mission.engine.isLoaded(u,game.mission.engine.activeWeaponItem(u))?" · Arme déchargée":"")}</span>
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
    ["mission-switch-btn","switch"],["mission-reload-btn","reload"],["mission-ranged-btn","ranged"],["mission-second-move-btn","secondMove"],["mission-end-activation-btn","end"]
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
  $("mission-reload-btn").addEventListener("click",reloadMissionWeapon);
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
