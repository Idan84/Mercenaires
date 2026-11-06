"use strict";

const HEX_DIRS=[
  {q:1,r:0},{q:1,r:-1},{q:0,r:-1},
  {q:-1,r:0},{q:-1,r:1},{q:0,r:1}
];
// Carte rectangulaire en coordonnées « offset » (lignes impaires décalées) ; la logique reste en axial (q, r).
const MISSION_MAP={cols:13,rows:9,size:34,spawnRows:[3,4,5],spawnInset:2};
// Taille de la carte : 13 × 9 pour la Mission Test, plus grande pour un contrat (doc 17, « Faire le ménage » : 30 × 15).
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
  for(const d of game.mission?.decor||[]) if(missionDecorBlocksMove(d.q,d.r)) keys.add(missionKey(d.q,d.r));
  return keys;
}
// Décor (doc 04 ; Idan, 2026-11-06 ; terrain-decors.json) : m.decor = [{q, r, code}]. Trois réglages par décor : le
// passage (coût de mouvement de la case : 1, 2, 3 ou 4 ; null : infranchissable), la vue, la couverture.
function missionDecorRow(code){ return (game.referenceData?.terrainDecors?.rows||[]).find(d=>d.code===code)||null; }
function missionDecorAt(q,r){
  const cell=(game.mission?.decor||[]).find(d=>d.q===q&&d.r===r);
  return cell?missionDecorRow(cell.code):null;
}
function missionDecorBlocksMove(q,r){ const d=missionDecorAt(q,r); return Boolean(d)&&d.cout_mouvement==null; }
// Points de mouvement du décor pour entrer dans la case (Idan : « vitesse réduite : mouvement à moitié / tiers / quart »).
function missionDecorCost(c){
  const d=missionDecorAt(c.q,c.r);
  if(!d) return 1;
  return d.cout_mouvement==null?Infinity:Math.max(1,Number(d.cout_mouvement)||1);
}
// Altitude (doc 04 ; Idan, 2026-11-06 : « vas-y pour l'altitude ») : m.relief = [{q, r, h}], une hauteur de 0 à 3 par case.
function missionHeightAt(q,r){ return (game.mission?.relief||[]).find(c=>c.q===q&&c.r===r)?.h||0; }
function missionUnitHeight(u){ return u?missionHeightAt(u.q,u.r):0; }
function missionAltitude(){ return game.mission?.engine?.ALTITUDE||{climbCost:1,cliff:2,hitPerLevel:10,max:3}; }
// Un pas de from à c : le décor, plus la montée (+ climbCost par niveau ; descendre est gratuit) ; un écart de cliff niveaux
// ou plus est une falaise, infranchissable dans les deux sens.
function missionStepCost(c,from=null){
  const decor=missionDecorCost(c);
  if(!from||!game.mission?.relief?.length) return decor;
  const rise=missionHeightAt(c.q,c.r)-missionHeightAt(from.q,from.r),alt=missionAltitude();
  if(Math.abs(rise)>=alt.cliff) return Infinity;
  return decor+Math.max(0,rise)*alt.climbCost;
}
function missionPathCost(path,start=null){
  let prev=start,total=0;
  for(const c of path||[]){ total+=missionStepCost(c,prev); prev=c; }
  return total;
}
// « Forêt : mouvement ½, bloque la vue, couverture partielle ».
const MISSION_DECOR_PACE={2:"½",3:"⅓",4:"¼"};
function missionDecorLabel(d){
  const parts=[d.cout_mouvement==null?"infranchissable":MISSION_DECOR_PACE[d.cout_mouvement]?"mouvement "+MISSION_DECOR_PACE[d.cout_mouvement]:"",
    d.bloque_vue?"bloque la vue":"",d.couverture&&d.couverture!=="sans"?"couverture "+d.couverture:""].filter(Boolean);
  return d.nom+(parts.length?" : "+parts.join(", "):"");
}
// Couverture (Idan, 2026-11-06 : « Au tir et en défense de charge ») : le décor collé à la cible sur la ligne qui vient de
// from (pas la case de from : un muret collé au tireur ne le gêne pas), ou la case de la cible elle-même ; la meilleure.
// shot : un tir (ou un sort qui vole) ; d'au moins un niveau plus haut, il passe par-dessus la couverture partielle.
function missionCoverLevel(from,target,{shot=false}={}){
  if(!game.mission?.decor?.length||!from||!target) return null;
  const above=shot&&missionHeightAt(from.q,from.r)>=missionHeightAt(target.q,target.r)+1;
  const line=game.mission.engine.hexLine(from,target),before=line[line.length-2];
  const cells=[{q:target.q,r:target.r}];
  if(before&&!(before.q===from.q&&before.r===from.r)) cells.push(before);
  let best=null;
  for(const c of cells){
    const level=missionDecorAt(c.q,c.r)?.couverture;
    if(level==="totale") return "totale";
    if(level==="partielle"&&!above) best="partielle";
  }
  return best;
}
// Vue (Idan, 2026-11-06 : « Derrière une forêt, on voit pas » ; dedans, « oui » : on n'y est vu qu'au contact).
// Altitude : une case entre les deux dont le sommet (sa hauteur, + 1 si son décor bloque la vue) dépasse les deux personnages
// coupe la vue ; plus haut, on voit par-dessus.
function missionDecorBlocksSight(a,b){
  if(!game.mission?.decor?.length&&!game.mission?.relief?.length) return false;
  const e=game.mission.engine,blocks=c=>Boolean(missionDecorAt(c.q,c.r)?.bloque_vue);
  if(e.axialDistance(a,b)>1&&(blocks(a)||blocks(b))) return true;
  const eye=Math.max(missionHeightAt(a.q,a.r),missionHeightAt(b.q,b.r));
  return e.hexLine(a,b).slice(1,-1).some(c=>missionHeightAt(c.q,c.r)+(blocks(c)?1:0)>eye);
}
// Mission Test (altitude) : 1 à 3 collines, centrées entre les deux lignes de déploiement, de hauteur 1 à 3 ; chaque case
// prend la plus haute des collines, moins sa distance au sommet : deux cases voisines ne diffèrent jamais de plus d'un niveau
// (pas de falaise au hasard).
function generateMissionRelief(){
  const max=game.mission?.engine?.ALTITUDE?.max??3;
  const inner=missionCells().filter(c=>{ const col=missionColumn(c.q,c.r); return col>MISSION_MAP.spawnInset&&col<MISSION_MAP.cols-1-MISSION_MAP.spawnInset; });
  const hills=Array.from({length:1+Math.floor(Math.random()*3)},()=>({...inner[Math.floor(Math.random()*inner.length)],h:1+Math.floor(Math.random()*max)}));
  const e=game.mission?.engine||combatEngine();
  return missionCells().map(c=>({q:c.q,r:c.r,h:Math.max(0,...hills.map(hill=>hill.h-e.axialDistance(hill,c)))})).filter(c=>c.h>0);
}
// Mission Test (étape 1 du décor) : quelques groupes de décor au hasard, entre les deux lignes de déploiement.
function generateMissionDecor(){
  // La palissade sert à l'enceinte des camps de contrat (mission-landscapes.json), pas au hasard.
  const wall=game.referenceData?.missionLandscapes?.enceinte?.decor;
  const rows=(game.referenceData?.terrainDecors?.rows||[]).filter(row=>row.code!==wall);
  if(!rows.length) return [];
  const inner=missionCells().filter(c=>{ const col=missionColumn(c.q,c.r); return col>MISSION_MAP.spawnInset&&col<MISSION_MAP.cols-1-MISSION_MAP.spawnInset; });
  const isInner=c=>inner.some(x=>x.q===c.q&&x.r===c.r);
  const decor=[],taken=new Set(),groups=4+Math.floor(Math.random()*3);
  for(let i=0;i<groups;i++){
    const row=rows[Math.floor(Math.random()*rows.length)],size=1+Math.floor(Math.random()*4);
    let cell=inner[Math.floor(Math.random()*inner.length)];
    for(let n=0;n<size&&cell;n++){
      const key=missionKey(cell.q,cell.r);
      if(!taken.has(key)){ taken.add(key); decor.push({q:cell.q,r:cell.r,code:row.code}); }
      const next=missionNeighbors(cell).filter(c=>isInner(c)&&!taken.has(missionKey(c.q,c.r)));
      cell=next[Math.floor(Math.random()*next.length)];
    }
  }
  return decor;
}
// Flaque de magma (doc 12) : une case infranchissable jusqu'au tour untilTurn (exclu).
function missionTerrainAt(q,r){ return (game.mission?.terrain||[]).find(t=>t.q===q&&t.r===r)||null; }
// Brouillard (doc 12) : des cases qui coupent la ligne de vue jusqu'au tour untilTurn (exclu) ; on y passe librement.
function missionFogAt(q,r){ return (game.mission?.fog||[]).find(f=>f.q===q&&f.r===r)||null; }
// Bourbier (Invocation ; Idan, 2026-10-28) : qui s'y trouve ou y entre ne peut plus se déplacer, jusqu'au tour untilTurn
// (exclu) ; on peut y entrer (c'est la fin du chemin), pas le traverser ni en sortir.
function missionMireAt(q,r){ return (game.mission?.mire||[]).find(f=>f.q===q&&f.r===r)||null; }
// Mur de flammes (Feu ; Idan, 2026-10-31) : qui y entre, ou y commence son activation, brûle ; jusqu'au tour untilTurn (exclu).
function missionFlameAt(q,r){ return (game.mission?.flameWalls||[]).find(w=>w.cells.some(c=>c.q===q&&c.r===r))||null; }
// Tempête (Foudre ; Idan, 2026-10-31) : la zone au-dessus de laquelle la foudre tombe, tant qu'il lui reste des vagues.
function missionStormAt(q,r){
  const e=game.mission?.engine;
  return (game.mission?.storms||[]).find(s=>e&&e.axialDistance(s.center,{q,r})<=s.radius)||null;
}
// Ligne de vue (doc 04 et 12) : seul le Brouillard la coupe pour l'instant, dès qu'une case de la ligne droite entre
// les deux, extrémités comprises, est dans le brouillard. Elle compte pour les tirs et les sorts.
function missionLineOfSight(a,b){
  if(!a||!b) return true;
  if(missionDecorBlocksSight(a,b)) return false;
  if(!game.mission?.fog?.length&&!game.mission?.blizzards?.length) return true;
  return !game.mission.engine.hexLine(a,b).some(c=>missionFogAt(c.q,c.r)||missionBlizzardAt(c.q,c.r));
}
// Blizzard (Eau ; Idan, 2026-10-31) : la zone où il neige, jusqu'au tour untilTurn (exclu) ; on n'y voit pas à travers.
function missionBlizzardAt(q,r){
  const e=game.mission?.engine;
  return (game.mission?.blizzards||[]).find(b=>e&&e.axialDistance(b.center,{q,r})<=b.radius)||null;
}
// Nuée d'insectes (Invocation ; Idan, 2026-10-31) : la zone, jusqu'au tour untilTurn (exclu) ; elle ne pique que les ennemis
// de son invocateur (team).
function missionSwarmAt(q,r,team=null){
  const e=game.mission?.engine;
  return (game.mission?.swarms||[]).find(s=>e&&e.axialDistance(s.center,{q,r})<=s.radius&&(team==null||s.team!==team))||null;
}
// Piqué : le malus vaut pour cette activation (ou, au lancer, jusqu'à la prochaine) ; il est revu à chaque activation.
function missionSwarmSting(unit,swarm){
  unit.statBuffs={...(unit.statBuffs||{}),[swarm.code]:{stats:swarm.stats,value:swarm.value,unit:swarm.unit,turns:0,silent:true}};
  missionLog(unit.character.name+" est harcelé"+(missionFeminine(unit)?"e":"")+" par la nuée d’insectes : −"+Math.abs(swarm.value)+" % de "+swarm.stats.join(" et de ")+".","bad");
}
function pruneMissionTerrain(){
  const m=game.mission;
  if(m?.swarms?.length){
    const before=m.swarms.length;
    m.swarms=m.swarms.filter(s=>m.turn<s.untilTurn);
    if(m.swarms.length<before) missionLog("La nuée d’insectes se disperse.","magic");
  }
  if(m?.terrain?.length){
    const ended=m.terrain.filter(t=>m.turn>=t.untilTurn);
    m.terrain=m.terrain.filter(t=>m.turn<t.untilTurn);
    for(const t of ended) missionLog("La flaque de magma refroidit : la case est de nouveau praticable.","magic");
  }
  if(m?.mire?.length){
    const before=m.mire.length;
    m.mire=m.mire.filter(f=>m.turn<f.untilTurn);
    if(m.mire.length<before) missionLog("Le bourbier sèche : la case est de nouveau praticable.","magic");
  }
  if(m?.blizzards?.length){
    const before=m.blizzards.length;
    m.blizzards=m.blizzards.filter(b=>m.turn<b.untilTurn);
    if(m.blizzards.length<before) missionLog("Le blizzard retombe.","magic");
  }
  if(m?.flameWalls?.length){
    const before=m.flameWalls.length;
    m.flameWalls=m.flameWalls.filter(w=>m.turn<w.untilTurn);
    if(m.flameWalls.length<before) missionLog("Le mur de flammes s’éteint.","magic");
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
  raiseMissionStartSummons();
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
      const r=e.rollDetection(observer,target,e.axialDistance(observer,target),e.coverDiscretion(missionCoverLevel(observer,target)));
      if(!r.spotted) continue;
      target.camouflaged=false;
      missionFx(target,"Repéré","spot");
      missionLog(observer.character.name+" repère "+target.character.name+" ("+missionPercent(r.p)+", jet "+r.roll+").","info");
    }
  }
  const hidden=team=>livingMissionUnits(team).filter(u=>u.camouflaged).map(u=>u.character.name);
  const ours=hidden("player"),theirs=hidden("enemy");
  if(ours.length||theirs.length) missionLog("Toujours camouflés"+(ours.length?" — vos hommes : "+ours.join(", "):"")+(theirs.length?" — ennemis : "+theirs.join(", "):"")+".","info");
}
// Un ennemi camouflé est invisible pour son adversaire.
function missionHiddenFrom(target,observer){ return Boolean(target?.camouflaged)&&target.team!==observer?.team; }

// Plus courts chemins en points de mouvement (décor lent : 2, 3 ou 4 par case), depuis start ; blocked : cases interdites.
// Dans un bourbier, on entre mais on n'en sort plus : on ne le traverse pas. Renvoie la Map clé → {path, cost}, dans
// l'ordre des coûts croissants (à coût égal, le moins de cases) ; stopKey : on s'arrête dès qu'elle est atteinte.
function missionPaths(start,blocked,budget=Infinity,stopKey=null){
  const startKey=missionKey(start.q,start.r),done=new Map();
  const open=new Map([[startKey,{cell:{q:start.q,r:start.r},path:[],cost:0}]]);
  while(open.size){
    let key=null,cur=null;
    for(const [k,v] of open) if(!cur||v.cost<cur.cost||(v.cost===cur.cost&&v.path.length<cur.path.length)){ key=k; cur=v; }
    open.delete(key);
    done.set(key,{path:cur.path,cost:cur.cost});
    if(key===stopKey) break;
    if(missionMireAt(cur.cell.q,cur.cell.r)) continue;
    for(const next of missionNeighbors(cur.cell)){
      const k=missionKey(next.q,next.r);
      if(done.has(k)||blocked.has(k)) continue;
      const cost=cur.cost+missionStepCost(next,cur.cell);
      if(!Number.isFinite(cost)||cost>budget) continue;
      const known=open.get(k);
      if(!known||cost<known.cost||(cost===known.cost&&cur.path.length+1<known.path.length)) open.set(k,{cell:next,path:[...cur.path,next],cost});
    }
  }
  return done;
}

function shortestMissionPath(start,end,except=null){
  const blocked=occupiedMissionKeys(except);
  const startKey=missionKey(start.q,start.r),endKey=missionKey(end.q,end.r);
  if(blocked.has(endKey)) return null;
  if(startKey!==endKey&&missionMireAt(start.q,start.r)) return null;
  return missionPaths(start,blocked,Infinity,endKey).get(endKey)?.path||null;
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

// Retours visuels (écran de combat, étape 2) : chaque événement visible est mis en file avec les PV et la case du
// combattant à cet instant ; l'écran les rejoue dans l'ordre après le rendu (chiffres, mentions, glissements).
// Purement visuel : la file ne change rien aux règles. Un pas de déplacement : step:{q,r}.
function missionFx(unit,text="",cls="",step=null){
  const m=game.mission;
  if(!m||!unit||m.autoRunning) return;
  (m.fx||(m.fx=[])).push({id:unit.id,text,cls,hp:unit.hp,q:unit.q,r:unit.r,step});
}
function missionAttackFx(a,d,result){
  if(result.chargeFall){ missionFx(a,"Chute !","miss"); return; }
  const [text,cls]=result.deflected?["Dévié","block"]:!result.hit?["Raté","miss"]:result.immune?["Immunisé","immune"]
    :result.parried?["Paré","block"]:result.blocked?["Bloqué","block"]:!result.wound?["Indemne","miss"]
    :result.targetDown?["Hors combat","down"]:result.criticalHit||result.criticalWound?["Critique !","crit"]:["",""];
  missionFx(d,text,cls);
  // Contrecoup d'un échec critique ou Drain de vie : les PV de l'attaquant ont pu bouger.
  missionFx(a);
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
  tickMissionBurning(unit);
  tickMissionCurse(unit);
  tickMissionFlameStart(unit);
  tickMissionTorch(unit);
  tickMissionChill(unit);
  tickMissionBuffs(unit);
  // Nuée d'insectes : qui commence son activation dans la nuée d'un ennemi est piqué.
  const swarm=unit.alive?missionSwarmAt(unit.q,unit.r,unit.team):null;
  if(swarm) missionSwarmSting(unit,swarm);
  unit.movementRemaining=game.mission.engine.movementBase(unit);
  // Blizzard : qui y commence son activation n'a que la moitié de son déplacement.
  const snow=unit.alive?missionBlizzardAt(unit.q,unit.r):null;
  if(snow&&unit.movementRemaining>0){
    unit.movementRemaining=Math.max(1,Math.floor(unit.movementRemaining*snow.movement));
    missionLog(unit.character.name+" avance dans le blizzard : "+unit.movementRemaining+" case"+(unit.movementRemaining>1?"s":"")+" de déplacement.","bad");
  }
  // Écrasement (Télékinésie) : pas de déplacement cette activation.
  if(unit.pinned&&unit.alive){
    unit.movementRemaining=0;
    unit.pinned.turns-=1;
    if(unit.pinned.turns<=0) unit.pinned=null;
    missionLog(unit.character.name+" est encore écrasé"+(missionFeminine(unit)?"e":"")+" : pas de déplacement.","bad");
  }
  if(missionMireAt(unit.q,unit.r)&&unit.alive){
    unit.movementRemaining=0;
    missionLog(unit.character.name+" est pris dans le bourbier : pas de déplacement.","bad");
  }
  unit.attackAvailable=true;
  unit.quickAvailable=true;
  unit.sentinel=null;
  unit.prone=false;
  unit.secondMove=false;
  // Prise d'arme (Idan, 2026-11-02) : à chaque tour, une arme « Au choix » repart à une main, la main libre.
  unit.twoHandGrip=false;
  tickMissionRegeneration(unit);
  tickMissionNaturalRegeneration(unit);
  tickMissionEnchantments(unit);
}

// Régénération naturelle (sang de troll ; Idan, 2026-11-01 ; game-core/regeneration.js) : au début de chacune de ses
// activations, s'il est debout ; brûlé depuis sa dernière activation, il ne régénère pas cette fois.
function missionRegeneration(){
  const m=game.mission;
  if(!m||typeof MercenairesRegeneration==="undefined") return null;
  return m.regeneration||(m.regeneration=MercenairesRegeneration.createRegenerationRules({reference:game.referenceData}));
}
function tickMissionNaturalRegeneration(unit){
  const rules=missionRegeneration();
  if(!rules||unit.alive===false||!rules.points(unit.character)) return;
  const name=unit.character.name;
  if(unit.burned){
    unit.burned=false;
    missionLog(name+" a été brûlé"+(missionFeminine(unit)?"e":"")+" : pas de régénération ce tour-ci.","bad");
    return;
  }
  if(unit.hp>=unit.pvMax) return;
  const tick=rules.roll(unit.character);
  const healed=healMissionUnit(unit,tick.amount);
  if(healed) missionLog(name+" se régénère : +"+healed+" PV"+missionWitherNote(unit)+".","magic");
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
  // À l'École (élève ou professeur d'un sort ; Idan, 2026-11-02) : il reste au camp jusqu'à la fin.
  const studying=c=>game.campaign&&campaignRules().studyBusy?campaignRules().studyBusy(game.campaign,c):null;
  // Le médecin, le directeur de l'École et les maîtres (camp-posts.js) restent au camp, comme l'intendant.
  const offField=c=>game.campaign&&(c.id===game.campaign.company.intendantId||(game.campaign.company.medicId!=null&&c.id===game.campaign.company.medicId)||Boolean(MercenairesCampPosts.postOf(game.campaign,c)));
  const eligible=allCharacters().filter(c=>!offField(c)&&!away(c)&&!studying(c));
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
  const members=c.company.roster.filter(m=>m.id!==c.company.captainId&&m.id!==c.company.intendantId&&(c.company.medicId==null||m.id!==c.company.medicId)
    &&!MercenairesCampPosts.postOf(c,m)&&!rules.expeditionOf(c,m.id)&&!(rules.studyBusy&&rules.studyBusy(c,m)));
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
    $("mission-select-cost").textContent="Paiement d’avance : "+fmt(bodyguard.payment)+" PO · primes au retour : "+fmt(bonus)+" PO · départ demain matin, absents "+bodyguard.days+" jours ; pas de combat.";
    return;
  }
  $("mission-select-cost").textContent=contract
    ?"Primes si tous reviennent : "+fmt(bonus)+" PO, versées au retour · départ demain matin, puis "+contract.distance+" jour"+(contract.distance>1?"s":"")+" de marche à l’aller, autant au retour ; le camp continue pendant ce temps."
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
  const engine=MercenairesCombat.createCombatEngine(game.referenceData,{onAttack:onMissionAttack,heightOf:missionUnitHeight});
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
  game.mission.relief=generateMissionRelief();
  game.mission.decor=generateMissionDecor();

  $("mission-select-dialog").close();
  $("game-panel").classList.add("hidden");
  $("mission-panel").classList.remove("hidden");
  missionLog("Mission Test : votre équipe joue en premier.","turn");
  missionLog("Ennemis générés : "+enemies.map(u=>u.character.name).join(", ")+".");
  startMissionCamouflage();
  selectNextMissionPlayer();
}

// Garde du corps : le paiement arrive tout de suite ; les gardes partent le lendemain matin et reviennent au bout de la
// durée.
function departBodyguards(chosen){
  const result=campaignRules().departBodyguard(game.campaign,chosen.map(c=>c.id),game.missionSelect?.bodyguard?.id);
  if(!result.ok){ $("mission-select-error").textContent=result.reason; return; }
  $("mission-select-dialog").close();
  const e=result.expedition;
  tavernLog(chosen.map(c=>c.name).join(", ")+" partir"+(chosen.length>1?"ont":"a")+" demain matin en garde du corps ("+e.offer.client.toLocaleLowerCase("fr")+") pour "+e.offer.days+" jours : "+fmt(e.offer.payment)+" PO d’acompte au départ.","gear");
  saveGame();
  renderGame();
  if(typeof renderContractBoard==="function") renderContractBoard();
}

// Contrat « Faire le ménage » (doc 17, Idan 2026-10-24) : l'escouade part le lendemain matin (mission programmée ; Idan,
// 2026-10-30 : d'ici là on lui parle et on l'équipe), le joueur continue de gérer son camp. À son arrivée (au bout des
// jours de marche), le combat attend : « Commencer le combat ».
function departContractSquad(chosen){
  const result=campaignRules().departExpedition(game.campaign,chosen.map(c=>c.id),game.missionSelect?.contract?.id);
  if(!result.ok){ $("mission-select-error").textContent=result.reason; return; }
  $("mission-select-dialog").close();
  const e=result.expedition,days=e.offer.distance;
  tavernLog("L’escouade de "+chosen.length+" mercenaire"+(chosen.length>1?"s":"")+" partira demain matin pour le "+e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu+", à "+days+" jour"+(days>1?"s":"")+" de marche. D’ici là, vous pouvez encore l’équiper.","turn");
  saveGame();
  renderGame();
  if(typeof renderContractBoard==="function") renderContractBoard();
}

// Le combat de l'expédition, à son arrivée : le camp ennemi (gobelin ou orc) sur une carte plus grande ; votre équipe a l'initiative (elle
// joue la première).
function startExpeditionCombat(expeditionId){
  const e=(game.campaign?.expeditions||[]).find(x=>x.id===expeditionId);
  if(!e||e.status!=="arrived") return;
  const chosen=e.memberIds.map(id=>game.campaign.company.roster.find(m=>m.id===id)).filter(Boolean);
  if(!chosen.length) return;
  const offer=e.offer;
  setMissionMapSize(missionRules().mapSize(offer));
  const enemyChars=missionRules().buildEnemies(offer,arch=>createCharacter({forcedPeople:arch.peuple,forcedCulture:arch.culture,role:arch.nom}));
  const engine=MercenairesCombat.createCombatEngine(game.referenceData,{onAttack:onMissionAttack,heightOf:missionUnitHeight});
  const endRules=MercenairesMissionEnd.createMissionEndRules({reference:game.referenceData});
  const progression=MercenairesProgression.createProgressionRules({reference:game.referenceData});
  const players=placeMissionArmy(chosen.map((c,i)=>makeMissionUnit(c,"player",i%3)),"player");
  const enemies=placeMissionArmy(enemyChars.map((c,i)=>makeMissionUnit(c,"enemy",i%3)),"enemy");
  // Décor, étape 3 (Idan, 2026-11-06) : le paysage de la faction, le camp des carrières sur la hauteur
  // (game-core/mission-terrain.js, mission-landscapes.json).
  const terrain=missionTerrain()?.generate({cols:MISSION_MAP.cols,rows:MISSION_MAP.rows,faction:offer.faction,players,enemies});
  game.mission={
    engine,endRules,progression,players,enemies,contract:offer,expeditionId:e.id,
    playerOrder:sortMissionInitiative(players,engine),
    enemyOrder:sortMissionInitiative(enemies,engine),
    activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null,
    decor:terrain?.decor||[],relief:terrain?.relief||[]
  };
  $("expedition-dialog")?.close?.();
  $("game-panel").classList.add("hidden");
  $("mission-panel").classList.remove("hidden");
  missionLog(offer.name+" : le "+offer.campName.toLocaleLowerCase("fr")+" de "+offer.fields.lieu+". Votre équipe a l’initiative.","turn");
  missionLog("Dans le camp : "+enemies.map(u=>u.character.name).join(", ")+".");
  startMissionCamouflage();
  selectNextMissionPlayer();
}

function missionTerrain(){
  if(typeof MercenairesMissionTerrain==="undefined") return null;
  return game.missionTerrain||(game.missionTerrain=MercenairesMissionTerrain.createMissionTerrain({reference:game.referenceData}));
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
    // Création de double (Illusion) : le double n'agit pas.
    if(next.decoy){ next.acted=true; continue; }
    resetMissionActivation(next);
    // Mort du poison au début de son activation.
    if(!next.alive){ next.acted=true; if(m.over){ renderMission(); return; } continue; }
    // Paralysie (Foudre) : il perd cette activation.
    if(missionParalyzedSkip(next)){ next.acted=true; continue; }
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

function setMissionMode(mode,{twoHands=false}={}){
  const u=missionActiveUnit();
  if(!u||game.mission.phase!=="player"||game.mission.over) return;
  game.mission.mode=mode;
  // « Attaquer à deux mains » (Idan, 2026-11-02) : l'attaque de mêlée, l'arme « Au choix » empoignée à deux mains.
  game.mission.twoHands=Boolean(twoHands&&mode==="melee");
  game.mission.spellTarget=null;
  renderMission();
}

function checkMissionEnd(){
  if(!game.mission||game.mission.over) return false;
  releaseMissionSummons();
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
  const participants=m.players.filter(u=>!u.summon).map(u=>({
    id:u.character.id,name:u.character.name,hp:u.hp,pvMax:u.pvMax,
    // Endurance avec la ceinture et Volonté avec l'amulette (Idan, 2026-10-24) : blessure, mort et convalescence
    // les lisent aussi.
    damageTaken:u.damageTaken,stats:{...u.character.stats,Endurance:m.engine.statWithGear(u,"Endurance"),
      "Volonté":m.engine.statWithGear(u,"Volonté")},
    isCaptain:captainId!=null&&u.character.id===captainId,offMap:u.offMap,progress:u.progress||null,raised:Boolean(u.raised)
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
  // Domaine évolutif (Idan, 2026-11-06) : le titre recalculé après l'expérience de la mission (ui.js).
  if(typeof refreshMercenaryDomains==="function")
    refreshMercenaryDomains((report.progression||[]).map(p=>p.mercenary),{log:text=>missionLog(text,"gear")});
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
  // Coffre (doc 17 §16) : objets par tier, famille tirée au hasard, et manuels de sorts.
  const plan=victory&&captain?rules.chestPlan(offer):{tiers:[],manuals:[]};
  const chestItems=[...plan.tiers.map(tier=>game.generator.createChestItem(captain,tier)),
    ...plan.manuals.map(code=>game.generator.createItemByName("manual",code))].filter(Boolean);
  const deadEnemies=m.enemies.filter(u=>!u.alive&&!u.offMap&&!u.summon).map(u=>u.character);
  const result=m.contractResult=rules.outcome(offer,{victory,deadEnemies,deadMercenaries:report.deaths,chestItems,
    makeItem:(type,name,tier)=>game.generator.createItemByName(type,name,tier)});
  const back=campaignRules().completeExpeditionCombat(game.campaign,m.expeditionId,{result,bonuses:report.bonusesDue});
  m.contractReturn=back?.expedition?{days:offer.distance,bonuses:report.bonusesDue.reduce((sum,b)=>sum+b.bonus,0)}:null;
  for(const line of contractResultLines(result,m.contractReturn)){ missionLog(line.text,line.kind); tavernLog(line.text,line.kind); }
}
function contractResultLines(result,trip=null){
  const home=trip?{text:"Retour au camp dans "+trip.days+" jour"+(trip.days>1?"s":"")+(trip.bonuses?" ; primes dues à l’arrivée : "+fmt(trip.bonuses)+" PO.":"."),kind:"turn"}:null;
  if(!result.victory) return [{text:"Contrat échoué : rien n’est payé et la renommée de la compagnie baisse ("+result.renown+").",kind:"bad"},home].filter(Boolean);
  const lines=[{text:"Contrat rempli : "+fmt(result.reward)+" PO de récompense et "+fmt(result.chestGold)+" PO dans le coffre.",kind:"gear"}];
  if(result.chestItems.length) lines.push({text:"Dans le coffre : "+result.chestItems.map(i=>itemPublicName(i)).join(", ")+".",kind:"gear"});
  lines.push({text:"Butin des morts : "+result.loot.length+" objet"+(result.loot.length>1?"s":"")+", rapporté"+(result.loot.length>1?"s":"")+" à l’Intendance par l’escouade.",kind:"gear"});
  if(home) lines.push(home);
  return lines;
}
function missionAftermathDetail(r){
  const pct=x=>Math.round(x)+" %";
  const parts=[];
  if(r.offMap) parts.push("a fui le combat");
  if(r.death?.raised) parts.push("relevé en zombie par un nécromancien");
  else if(r.death) parts.push((r.dead?"jet de mort ":"survit au jet de mort ")+pct(r.death.p)+" ("+r.death.roll+")");
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
  logMissionAttackLines(a,d,result,kind);
  if(result.ok) missionAfterStrike(d,result.hit);
}
// Après un coup ou un sort : un dormeur blessé se réveille (Sommeil) ; un double touché se dissipe (Création de double).
function missionAfterStrike(unit,touched){
  if(!unit) return;
  if(unit.decoy&&touched&&!unit.vanished){ dissipateMissionDecoy(unit); return; }
  if(unit.wokeUp){
    unit.wokeUp=false;
    if(unit.alive) missionLog(unit.character.name+" se réveille.","bad");
  }
}
function logMissionAttackLines(a,d,result,kind){
  if(!result.ok){ missionLog(result.reason||"Attaque impossible.","bad"); return; }
  missionAttackFx(a,d,result);
  const verb={charge:" charge ",opportunity:" profite de l’ouverture et frappe ",countercharge:" contre-charge ",stray:" touche par accident "}[kind]||" attaque ";
  const prefix=a.character.name+verb+d.character.name+" avec "+result.weapon
    +(result.opportunity?" (attaque d’opportunité, dans le dos)":result.encircled?" (cible encerclée, dans le dos)":result.backstab?" (dans le dos)":"")
    +(result.cover?" (couverture "+result.cover+")":"")
    +(result.heightDiff>0?" (d’en haut)":result.heightDiff<0?" (vers le haut)":"")
    // Squelettes : dégâts tranchants × 0,5, contondants × 1,5 (character.damageTypeFactors).
    +(result.typeFactor?" ("+result.matchup?.type+" × "+String(result.typeFactor).replace(".",",")+")":"");

  if(result.chargeFall){
    missionLog(a.character.name+" chute pendant sa charge et perd son attaque !"+(result.pFall>game.mission.engine.CHARGE_FALL.base?" (terrain difficile : "+Math.round(result.pFall)+" %, jet "+result.fallRoll+")":""),"bad");
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
  if(result.immune){
    missionLog(prefix+" : le coup traverse "+d.character.name+" sans lui faire de mal (immunisé aux dégâts physiques).","miss");
    return;
  }
  if(result.parried){
    missionLog(prefix+" : touche, mais "+d.character.name+" pare le coup tranchant avec son "+result.parryWeapon.replace(/^Sai$/,"saï")
      +" (parade "+Math.round(result.pParry)+" %, jet "+result.parryRoll+").","miss");
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
  const psychic=result.psychic?" psychiques (Volonté × "+(Math.round(result.will*100)/100).toLocaleString("fr-FR")+")":"";
  missionLog(prefix+" : "+result.damage+" PV"+psychic+". "+d.character.name+" reste à "+Math.max(0,result.targetHp)+" PV"+(result.targetHp<0?" ("+result.targetHp+" sous zéro)":"")+"."+critical+criticalWound,"damage");
  if(result.targetDown&&!d.decoy) missionLog(d.character.name+" est hors combat.","death");
  if(result.poisonApplied) missionLog(d.character.name+" est empoisonné"+(missionFeminine(d)?"e":"")+" pour "+result.poison.turns+" tours ("+result.poison.amount+" PV par tour).","bad");
  if(result.webbed&&d.alive) missionLog(d.character.name+" est pris"+(missionFeminine(d)?"e":"")+" dans la toile : pas de déplacement à sa prochaine activation.","bad");
  if(result.drain) missionLog("Drain de vie : "+a.character.name+" récupère "+result.drain.healed+" PV"
    +(result.drain.healed<result.drain.amount?" (sur "+result.drain.amount+")"+missionWitherNote(a):"")+".","magic");
}

// Crochet du moteur après chaque attaque : XP (progression.js), puis Drain de vie (Nécromancie ; Idan, 2026-10-28) : le
// lanceur récupère percent % des PV que son coup d'arme au corps à corps a retirés (pas sous zéro).
function onMissionAttack(attacker,defender,options,result){
  MercenairesProgression.recordAttack(attacker,defender,options,result);
  poisonMissionTarget(attacker,defender,result);
  webMissionTarget(attacker,defender,result);
  const fx=attacker.lifeDrain;
  if(!fx||!result?.ok||!result.wound||result.mode!=="melee"||!(result.damage>0)||!attacker.alive) return;
  const removed=Math.min(result.damage,Math.max(0,(Number(result.targetHp)||0)+result.damage));
  const amount=Math.ceil(removed*fx.percent/100-1e-9);
  if(amount>0) result.drain={amount,healed:healMissionUnit(attacker,amount)};
}
// Toile (araignée géante ; Idan, 2026-10-31) : un coup qui touche, ni paré ni bloqué, englue la cible : pas de déplacement à
// sa prochaine activation (comme l'Écrasement).
function webMissionTarget(attacker,defender,result){
  const e=game.mission?.engine,weapon=e?.weaponTemplate(e.activeWeaponItem(attacker));
  const turns=Number(weapon?.immobilise)||0;
  if(!turns||!result?.ok||!result.hit||result.parried||result.blocked||result.deflected||!defender.alive) return;
  defender.pinned={turns};
  result.webbed=true;
}
// Sarbacane (Idan, 2026-10-29) : la fléchette qui blesse empoisonne la cible (doc 12, Poison).
function poisonMissionTarget(attacker,defender,result){
  if(!result?.poison||!defender.alive) return;
  defender.poisoned={code:result.poison.source||"blowgun",turns:result.poison.turns,amount:result.poison.amount,sourceId:attacker.id};
  result.poisonApplied=true;
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
    missionFx(unit,"","",step);
    if(wasFleeing) MercenairesProgression.recordFleeHex(unit);
    game.mission.progression.recordStep(unit);
    unit.movementRemaining=Math.max(0,(unit.movementRemaining||0)-missionStepCost(step,from));
    const flames=missionFlameAt(step.q,step.r);
    if(flames){
      missionFlameBurn(unit,flames,"traverse le mur de flammes");
      if(!unit.alive) break;
    }
    // Mode sentinelle : un pas à la portée d'une sentinelle ennemie, et il essuie son tir.
    missionSentinelReact(unit);
    if(!unit.alive||game.mission.over||unit.q!==step.q||unit.r!==step.r||unit.fleeing!==wasFleeing) break;
    if(missionMireAt(step.q,step.r)){
      unit.movementRemaining=0;
      missionLog(unit.character.name+" s’enlise dans le bourbier.","bad");
      break;
    }
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
  // Aucun personnage, aucune flaque de magma, aucun bourbier sur la ligne (Idan, 2026-11-04) ; le brouillard ne gêne pas.
  const occupied=occupiedMissionKeys(unit);
  if(charge.path.some(h=>occupied.has(missionKey(h.q,h.r))||missionMireAt(h.q,h.r)||!validMissionHex(h.q,h.r))) return null;
  // Décor (Idan, 2026-11-06) : la charge traverse un décor lent, mais risque davantage la chute (« pieds dans le tapis ») ;
  // la cible derrière une couverture, vue du point de départ de la charge, est protégée.
  const slowSteps=charge.path.reduce((total,h)=>total+Math.max(0,missionDecorCost(h)-1),0);
  // Altitude (Idan, 2026-11-06) : pas de falaise sur la ligne, et pas de charge qui monte de plus d'un niveau.
  if(game.mission?.relief?.length){
    let prev={q:unit.q,r:unit.r},climb=0;
    for(const h of charge.path){
      const rise=missionHeightAt(h.q,h.r)-missionHeightAt(prev.q,prev.r);
      if(Math.abs(rise)>=missionAltitude().cliff) return null;
      climb+=Math.max(0,rise);prev=h;
    }
    if(climb>1) return null;
  }
  return {...charge,slowSteps,cover:missionCoverLevel({q:unit.q,r:unit.r},target)};
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
// sentinel : le tir d'une sentinelle (plus précis, il enchaîne comme au corps à corps).
function performMissionAttack(attacker,target,mode,distance,charge=null,{sentinel=false}={}){
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
        chargeDistance:charging?charge.travel:0,chargeFollowUp:Boolean(charging&&first),sentinel,
        chargeSlowSteps:charging?charge.slowSteps||0:0,cover:h.mode==="ranged"?missionCoverLevel(attacker,target,{shot:true}):charging?charge.cover:null
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
    const chain=dual?e.rollPairChain(attacker,target,results,n+1):e.rollChain(attacker,target,results[0],n+1,mode,{sentinel});
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
// whip : la part du fouet (Idan, 2026-10-29), comprise dans aura.
function missionAuraNote(aura,from="captain",whip=0){
  const leader=(aura||0)-(whip||0);
  return (leader>0?", aura "+(from==="lieutenant"?"du lieutenant":"du capitaine")+" +"+Math.round(leader):"")+(whip>0?", fouet +"+Math.round(whip):"");
}

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
  const detail=" (Courage "+Math.round(c.pHold)+" %"+(c.rule==="outnumbered"?", en sous-nombre":"")+missionAuraNote(c.aura,c.auraFrom,c.whip)+", jet "+c.roll+")";
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

// Chemins les plus courts (en points de mouvement) vers chaque case libre atteignable avec budget, dans l'ordre des coûts.
// forbidden : cases interdites en plus des cases occupées (la case de départ reste permise).
function missionReachablePaths(unit,budget=Infinity,forbidden=null){
  const blocked=occupiedMissionKeys(unit),start={q:unit.q,r:unit.r};
  if(forbidden) for(const key of forbidden) blocked.add(key);
  const paths=new Map();
  for(const [key,{path}] of missionPaths(start,blocked,budget)) paths.set(key,path);
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
    if(!isMissionBorder(cell)||missionPathCost(path,unit)+1>budget) continue;
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
  const detail=" (reprise "+Math.round(recovery.p)+" %"+missionAuraNote(recovery.aura,recovery.auraFrom,recovery.whip)+", jet "+recovery.roll+")";
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
  // Attaquer à deux mains : il frappe fort, mais perd l'esquive de la main libre jusqu'à son prochain tour.
  if(m.twoHands&&mode==="melee"&&m.engine.canGripTwoHands(a)){
    a.twoHandGrip=true;
    missionLog(a.character.name+" empoigne "+(m.engine.activeWeaponItem(a)?.name||"son arme")+" à deux mains.","info");
  }
  m.mode=null;m.twoHands=false;
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
    if(path&&missionPathCost(path,u)<=u.movementRemaining){
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
    const target=spell?.cible==="case"||spell?.cible==="case_vide"?{q,r}:spell?.cible==="soi"?u
      :spell?.cible==="mort"?missionUnits().find(x=>missionMagic().isCorpse(x)&&x.q===q&&x.r===r):clicked;
    if(target) castPlayerMissionSpell(target);
    return;
  }

  if(!clicked||clicked.team!=="enemy") return;
  const distance=m.engine.axialDistance(u,clicked);

  if(m.mode==="melee"){
    // Hors d'atteinte : il s'approche d'abord, par le plus court chemin, puis frappe s'il le peut encore.
    const approach=missionCanAttack(u,clicked,"melee")?null:missionMeleeApproach(u,clicked);
    if(approach){
      const moved=moveMissionUnitAlongPath(u,approach.path);
      if(moved) missionLog(u.character.name+" s’approche de "+clicked.character.name+" ("+moved+" hex).","move");
      if(missionActiveUnitLost()) return;
      if(!clicked.alive||!missionCanAttack(u,clicked,"melee")){ m.mode=null; renderMission(); return; }
      resolvePlayerMissionAttack(u,clicked,"melee",m.engine.axialDistance(u,clicked));
      return;
    }
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
// Flétrissement (Nécromancie) : plus aucun PV rendu tant qu'il dure.
function healMissionUnit(unit,amount){
  if(unit.withered) return 0;
  const before=unit.hp;
  unit.hp=Math.min(unit.pvMax,unit.hp+amount);
  const healed=Math.max(0,unit.hp-before);
  if(healed){ MercenairesProgression.recordHeal(unit,healed); missionFx(unit); }
  return healed;
}
function missionWitherNote(unit){ return unit?.withered?" — flétri"+(missionFeminine(unit)?"e":"")+", aucun soin":""; }
// source : le lanceur (ou le porteur de l'arme enflammée), pour la réputation et le Charisme ; element : la résistance
// qui progresse chez la cible (doc 08).
function damageMissionUnitBySpell(unit,amount,source=null,element=null){
  if(!amount) return;
  const wasUp=unit.alive!==false;
  unit.hp-=amount;
  if(unit.decoy){ dissipateMissionDecoy(unit); return; }
  unit.damageTaken=(Number(unit.damageTaken)||0)+amount;
  // Le feu bloque la régénération (sang de troll) à sa prochaine activation.
  if(element==="feu"&&amount>0) unit.burned=true;
  if(unit.hp<=0){ unit.alive=false; missionLog(unit.character.name+" est hors combat.","death"); }
  game.mission.engine.wake(unit,amount);
  missionAfterStrike(unit,true);
  missionFx(unit,wasUp&&!unit.alive?"Hors combat":"",wasUp&&!unit.alive?"down":"");
  MercenairesProgression.recordSpellDamage(source,unit,amount,{element,down:wasUp&&!unit.alive});
}

// Lance un sort et applique son résultat (joueur et IA) : action, mana, PV, effets, journal.
// extra : {destination} (Déplacement) ou {second} (Entrechoc).
function resolveMissionSpell(caster,target,code,extra={}){
  const m=game.mission,magic=missionMagic(),spell=magic?.spell(code);
  if(!spell) return null;
  if(spell.cible==="soi") target=caster;
  // Un sort qui vole comme une flèche : la couverture de la cible compte (Idan, 2026-11-06).
  const out=magic.cast(caster,target,code,{units:missionUnits(),cellFree:missionCellFree(spell.cible==="mort"?{q:target.q,r:target.r}:target),lineOfSight:missionLineOfSight(caster,target),
    cover:spell.toucher==="distance"&&target?.character?missionCoverLevel(caster,target,{shot:true}):null,
    heightDiff:target?.character?missionUnitHeight(caster)-missionUnitHeight(target):0,
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
    missionFx(caster,"Sort raté","miss");
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
    missionLog(name+" lance "+spell.nom+on+detail+" : +"+healed+" PV"+(healed<out.amount?" (soin de "+out.amount+")"+missionWitherNote(target):"")+"."+critical,"magic");
  }else if(spell.effet==="soin_sur_duree"){
    target.regeneration={...out.effect};
    missionLog(name+" lance "+spell.nom+on+detail+" : un soin au début de chacune de ses "+out.effect.turns
      +" prochaines activations."+critical,"magic");
  }else if(spell.effet==="soin_de_zone"){
    const healed=missionMagic().unitsInZone(out.zone.center,out.zone.radius,missionUnits()).map(u=>[u,healMissionUnit(u,out.amount)]);
    effect=healed.some(([,hp])=>hp>0);
    missionLog(name+" lance "+spell.nom+" (rayon "+out.zone.radius+")"+detail+" : "+out.amount+" PV pour chacun"
      +(healed.length?" — "+healed.map(([u,hp])=>u.character.name+" +"+hp).join(", "):" — personne dans la zone")+"."+critical,"magic");
  }else if(spell.effet==="degats_sans_resistance"&&out.zone){
    // Lumière sacrée (Vie ; Idan, 2026-10-31) : la Restitution en cercle, sur chaque mort-vivant de la zone, les nôtres compris.
    const undead=magic.unitsInZone(out.zone.center,out.zone.radius,missionUnits()).filter(u=>magic.isUndead(u));
    missionLog(name+" lance "+spell.nom+" (rayon "+out.zone.radius+")"+detail+" : "+out.amount+" PV à chaque mort-vivant, sans aucune résistance"
      +(undead.length?" — "+undead.map(u=>u.character.name).join(", "):" — aucun mort-vivant dans la zone")+"."+critical,"damage");
    for(const u of undead) damageMissionUnitBySpell(u,out.amount,caster);
    effect=undead.length>0&&out.amount>0;
    checkMissionEnd();
  }else if(spell.effet==="degats_sans_resistance"){
    missionLog(name+" lance "+spell.nom+on+detail+" : "+out.amount+" PV, sans aucune résistance."+critical,"damage");
    damageMissionUnitBySpell(target,out.amount,caster);
    effect=out.amount>0;
    checkMissionEnd();
  }else if(spell.effet==="purge_poison"){
    target.poisoned=false;
    missionLog(name+" lance "+spell.nom+on+detail+" : le poison est éliminé.","magic");
  }else if(spell.effet==="transfert_pv"){
    // Lien de vie (Vie ; Idan, 2026-10-31) : le lanceur donne ce qu'il faut (au plus les dés, en gardant 1 PV), l'allié reçoit × 1,5.
    const link=target.withered?{given:0,received:0}:magic.lifeLink(caster,target,out.amount,out.transfer.factor);
    caster.hp-=link.given;
    if(link.given) missionFx(caster,"−"+link.given,"damage");
    const healed=healMissionUnit(target,link.received);
    effect=healed>0;
    missionLog(name+" lance "+spell.nom+on+detail+" : "+name+" donne "+link.given+" PV, "+target.character.name+" en reçoit +"+healed
      +(link.given<out.amount?" (don de "+out.amount+" au plus)":"")+missionWitherNote(target)+"."+critical,"magic");
  }else if(spell.effet==="delivrance"){
    // Délivrance (Vie ; Idan, 2026-10-31) : fin de la peur (la fuite), de la paralysie, du gel et de la frénésie ; et des
    // états de l'Illusion : sommeil, désespoir, brouillage mental.
    const removed=out.delivrance||[];
    if(removed.includes("fuite")){ target.fleeing=false;target.fleeTurn=0; }
    if(removed.includes("paralysie")) target.paralyzed=null;
    if(removed.includes("gel")){ if(target.statMalus?.code==="freeze") target.statMalus=null; target.frozen=null; }
    if(removed.includes("frenesie")){
      const buffs={...(target.statBuffs||{})};
      delete buffs[target.frenzy?.code];
      target.statBuffs=buffs;target.frenzy=null;
    }
    if(removed.includes("sommeil")) target.asleep=null;
    if(removed.includes("brouillage")) target.mindFog=null;
    if(removed.includes("desespoir")){
      const magic=missionMagic();
      target.statBuffs=Object.fromEntries(Object.entries(target.statBuffs||{}).filter(([code])=>!magic?.spell(code)?.malus));
    }
    const LABELS={fuite:"de la peur",paralysie:"de la paralysie",gel:"du gel",frenesie:"de la frénésie",sommeil:"du sommeil",
      desespoir:"du désespoir",brouillage:"du brouillage mental"};
    effect=removed.length>0;
    missionLog(name+" lance "+spell.nom+on+detail+" : fin "+removed.map(x=>LABELS[x]).join(", ")+".","magic");
  }else if(spell.effet==="degats"&&spell.toucher==="distance"){
    const aim=" (toucher "+Math.round(out.pHit)+" %, jet "+out.hitRoll+(out.cover?", couverture "+out.cover:"")+")";
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
    // Écrasement (Télékinésie ; Idan, 2026-10-31) : il ne pourra pas se déplacer à sa prochaine activation.
    if(out.immobilise&&target.alive){
      target.pinned={turns:out.immobilise};
      missionLog(target.character.name+" est écrasé"+(missionFeminine(target)?"e":"")+" : pas de déplacement à sa prochaine activation.","magic");
      effect=true;
    }
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
  }else if(spell.effet==="paralysie"){
    // Paralysie (Foudre ; Idan, 2026-10-31) : la cible résiste (Constitution + protection contre la foudre − Maîtrise / 2)
    // ou perd sa prochaine activation.
    const p=out.paralysis,test=" (résistance "+Math.round(p.resist)+" %, jet "+p.roll+")";
    if(p.resisted){
      effect=false;
      missionLog(name+" lance "+spell.nom+on+detail+" : "+target.character.name+" résiste"+test+".","miss");
      missionFx(target,"Résiste","miss");
    }else{
      target.paralyzed={turns:p.turns};
      missionLog(name+" lance "+spell.nom+on+detail+" : "+target.character.name+" est paralysé"+(missionFeminine(target)?"e":"")
        +test+" et perdra sa prochaine activation.","magic");
      missionFx(target,"Paralysé"+(missionFeminine(target)?"e":""),"miss");
    }
  }else if(spell.effet==="sommeil"){
    // Sommeil (Illusion ; Idan, 2026-10-31, chiffres de JC3) : la cible résiste (Volonté − Maîtrise / 2) ou s'endort.
    const p=out.sleep,test=" (résistance "+Math.round(p.resist)+" %, jet "+p.roll+")";
    if(p.resisted){
      effect=false;
      missionLog(name+" lance "+spell.nom+on+detail+" : "+target.character.name+" résiste"+test+".","miss");
      missionFx(target,"Résiste","miss");
    }else{
      target.asleep={turns:p.turns};
      missionLog(name+" lance "+spell.nom+on+detail+" : "+target.character.name+" s’endort"+test+" et perdra ses "
        +(p.turns>1?p.turns+" prochaines activations":"prochaine activation")+", sauf si on "+(missionFeminine(target)?"la":"le")+" blesse.","magic");
      missionFx(target,"Endormi"+(missionFeminine(target)?"e":""),"miss");
    }
  }else if(spell.effet==="brouillage"){
    // Brouillage mental (Illusion) : ses sorts réussissent moins souvent pendant ses prochaines activations.
    const f=out.mindFog;
    target.mindFog={malus:f.malus,turns:f.turns};
    missionLog(name+" lance "+spell.nom+on+detail+" : −"+f.malus+" % de réussite pour ses sorts (Volonté × "
      +(Math.round(f.will*100)/100).toLocaleString("fr-FR")+"), pendant ses "+f.turns+" prochaines activations.","magic");
    missionFx(target,"Brouillé"+(missionFeminine(target)?"e":""),"miss");
  }else if(spell.effet==="nuee"){
    // Nuée d'insectes (Invocation) : les ennemis déjà dans la zone sont piqués tout de suite.
    const sw=out.swarm,swarm={casterId:caster.id,team:caster.team,code:sw.code,center:out.zone.center,radius:out.zone.radius,
      untilTurn:m.turn+sw.turns,stats:sw.stats,value:sw.value,unit:sw.unit};
    m.swarms=[...(m.swarms||[]),swarm];
    const stung=magic.unitsInZone(swarm.center,swarm.radius,missionUnits()).filter(x=>x.team!==caster.team);
    missionLog(name+" lance "+spell.nom+" (rayon "+swarm.radius+", "+sw.turns+" tours)"+detail+" : −"+Math.abs(sw.value)+" % de "+sw.stats.join(" et de ")
      +" pour les ennemis dans la nuée"+(stung.length?"":" — personne pour l’instant")+".","magic");
    for(const x of stung) missionSwarmSting(x,swarm);
    effect=true;
  }else if(spell.effet==="bannissement"){
    // Bannissement (Invocation) : l'invocation ennemie disparaît, avec tout son groupe (une meute compte pour une).
    if(target.decoy){ dissipateMissionDecoy(target,"banni par "+name); }
    else{
      const group=missionUnits().filter(x=>x.summon&&x.alive&&!x.offMap&&x.summon.group===target.summon.group);
      dismissMissionSummons(group,name+" lance "+spell.nom+on+detail+" : le sort renvoie "+missionSummonLabel(group,false));
    }
    effect=true;
    checkMissionEnd();
  }else if(spell.effet==="double"){
    // Création de double (Illusion) : un nouveau double remplace le précédent.
    for(const old of missionUnits().filter(u=>u.decoy&&u.alive&&u.summon?.casterId===caster.id)) dissipateMissionDecoy(old,"un nouveau double le remplace");
    addMissionDecoy(caster,out.decoy.cell);
    missionLog(name+" lance "+spell.nom+detail+" : un double de "+name+" apparaît ; les ennemis le prennent pour "
      +(missionFeminine(caster)?"elle":"lui")+".","magic");
  }else if(spell.effet==="lancer_arme"){
    // Lancer d'arme (Télékinésie ; Idan, 2026-10-31) : l'arme part, frappe et revient dans la main.
    const t=out.throw;
    if(t?.wound) damageMissionUnitBySpell(target,t.damage,caster,t.type);
    effect=Boolean(t?.wound&&t.damage>0);
    missionLog(name+" lance "+spell.nom+on+detail+" : "+(t?(t.weapon+" part et revient — "+(t.wound?t.damage+" PV "+t.type+"s":"l’armure encaisse")
      +" (Blesser "+Math.round(t.pWound)+" %, jet "+t.woundRoll+")"):"rien à lancer")+"."+critical,"damage");
    checkMissionEnd();
  }else if(spell.effet==="onde_de_choc"){
    // Onde de choc : chacun repoussé à son tour, choc s'il heurte quelque chose.
    const waves=(out.waves||[]).filter(w=>w.unit.alive);
    missionLog(name+" lance "+spell.nom+detail+" : "+(waves.length?waves.length+" personnage"+(waves.length>1?"s":"")+" repoussé"+(waves.length>1?"s":""):"personne autour")+".","magic");
    for(const w of waves) if(w.unit.alive) missionForcedMove(w.unit,{move:{kind:"repousse",cells:w.cells,chocAmount:out.move?.chocAmount||0},physical:out.physical},caster);
    effect=waves.length>0;
    checkMissionEnd();
  }else if(spell.effet==="bond"){
    // Bond : un saut, pas un déplacement ; ni attaque d'opportunité ni mouvement dépensé.
    caster.q=out.leap.to.q;caster.r=out.leap.to.r;
    missionFx(caster,"","",out.leap.to);
    missionLog(name+" lance "+spell.nom+detail+" : "+(missionFeminine(caster)?"elle":"il")+" bondit de "+out.leap.distance+" case"+(out.leap.distance>1?"s":"")+".","move");
  }else if(spell.effet==="prison_de_glace"){
    // Prison de glace (Eau ; Idan, 2026-10-31) : la cible résiste (Constitution + protection contre le froid − Maîtrise / 2)
    // ou se fige : elle perd ses activations et ne subit que la moitié des dégâts.
    const f=out.frozen,test=" (résistance "+Math.round(f.resist)+" %, jet "+f.roll+")";
    if(f.resisted){
      effect=false;
      missionLog(name+" lance "+spell.nom+on+detail+" : "+target.character.name+" résiste"+test+".","miss");
      missionFx(target,"Résiste","miss");
    }else{
      target.frozen={turns:f.turns,factor:f.factor};
      missionLog(name+" lance "+spell.nom+on+detail+" : "+target.character.name+" est figé"+(missionFeminine(target)?"e":"")+" dans la glace"+test
        +" pour "+f.turns+" activation"+(f.turns>1?"s":"")+" ; "+(missionFeminine(target)?"elle":"il")+" ne subit que la moitié des dégâts.","magic");
      missionFx(target,"Figé"+(missionFeminine(target)?"e":""),"miss");
    }
  }else if(spell.effet==="blizzard"){
    const b={casterId:caster.id,center:out.zone.center,radius:out.zone.radius,untilTurn:m.turn+out.blizzard.turns,
      effect:{code:out.blizzard.code,element:out.blizzard.element,factor:out.blizzard.factor,critical:false,turns:1},movement:out.blizzard.movement};
    m.blizzards=[...(m.blizzards||[]),b];
    missionLog(name+" lance "+spell.nom+" (rayon "+b.radius+", "+out.blizzard.turns+" tours)"+detail+" : la neige tombe, on n’y voit plus rien.","magic");
    effect=missionBlizzardWave(b)>0;
    checkMissionEnd();
  }else if(spell.effet==="rend_mana"){
    // Source vive (Eau ; Idan, 2026-10-31) : du mana pour un autre allié, sans dépasser sa réserve.
    const before=magic.currentMana(target),given=Math.max(0,Math.min(out.amount,magic.manaMax(target)-before));
    target.character.mana=Math.round((before+given)*100)/100;
    effect=given>0;
    missionLog(name+" lance "+spell.nom+on+detail+" : +"+Math.round(given)+" mana"+(given<out.amount?" (réserve pleine)":"")+"."+critical,"magic");
  }else if(spell.effet==="siphon_mana"){
    // Siphon d'âme (Nécromancie ; Idan, 2026-10-31) : le mana de la cible, au seul profit du lanceur.
    const s=out.siphon;
    target.character.mana=Math.round(Math.max(0,magic.currentMana(target)-s.taken)*100)/100;
    caster.character.mana=Math.round(Math.min(magic.manaMax(caster),magic.currentMana(caster)+s.gained)*100)/100;
    effect=s.taken>0;
    missionLog(name+" lance "+spell.nom+on+detail+" : "+target.character.name+" perd "+Math.round(s.taken)+" mana, "+name+" en récupère +"
      +Math.round(s.gained)+(s.gained<s.taken?" (réserve pleine)":"")+"."+critical,"magic");
    if(s.gained>0) missionFx(caster,"+"+Math.round(s.gained)+" mana","heal");
  }else if(spell.effet==="pacte_de_sang"){
    // Pacte de sang (Nécromancie) : des PV contre du mana, 1 PV gardé.
    const p=out.pact;
    caster.hp-=p.hp;
    caster.character.mana=Math.round(Math.min(magic.manaMax(caster),magic.currentMana(caster)+p.mana)*100)/100;
    effect=p.mana>0;
    if(p.hp) missionFx(caster,"−"+p.hp,"damage");
    missionLog(name+" lance "+spell.nom+detail+" : "+name+" sacrifie "+p.hp+" PV et regagne +"+p.mana+" mana"
      +(p.mana<out.amount?" (au plus "+out.amount+")":"")+"."+critical,"magic");
  }else if(spell.effet==="tempete"){
    // Tempête (Foudre ; Idan, 2026-10-31) : une première vague tout de suite, puis une à chaque nouveau tour.
    const storm={casterId:caster.id,code:spell.code,center:out.zone.center,radius:out.zone.radius,element:out.storm.element,
      factor:out.storm.factor,critical:out.storm.critical,turnsLeft:out.storm.turns};
    game.mission.storms=[...(game.mission.storms||[]),storm];
    missionLog(name+" lance "+spell.nom+" (rayon "+storm.radius+", "+storm.turnsLeft+" tours)"+detail+" : le ciel se charge au-dessus de la zone."+critical,"magic");
    effect=missionStormWave(storm)>0;
    checkMissionEnd();
  }else if(spell.effet==="peur"){
    // Peur : chaque ennemi de la zone teste son Courage contre la Maîtrise et la Volonté du lanceur.
    const zone=out.zone,foes=magic.unitsInZone(zone.center,zone.radius,missionUnits()).filter(u=>u.team!==caster.team);
    missionLog(name+" lance "+spell.nom+" (rayon "+zone.radius+")"+detail+(foes.length?" : la terreur gagne la zone.":" : personne dans la zone."),"magic");
    effect=false;
    for(const foe of foes){
      const c=m.engine.resolveFear(foe,caster,out.fear.mastery,missionUnits());
      if(!c) continue;
      const fear=" (Courage "+Math.round(c.pHold)+" %"+missionAuraNote(c.aura,c.auraFrom,c.whip)+", jet "+c.roll+")";
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
    const shape=zone.shape==="cone"?" (cône de "+zone.length+" cases)":zone.cells?" (ligne de "+zone.length+" cases)":" (rayon "+zone.radius+")";
    missionLog(name+" lance "+spell.nom+shape+detail+drift+" : "+out.amount+" PV de "+out.element
      +(zone.degressive?" au centre, moins vers le bord":" pour chacun")+(lines.length?" — "+lines.join(", "):" — personne dans la zone")+"."+critical,"damage");
    checkMissionEnd();
  }else if(spell.effet==="degats_sur_duree"){
    // Embrasement : ne se cumule pas, le relancer remplace le précédent.
    target.burning={...out.effect,casterId:caster.id};
    missionLog(name+" lance "+spell.nom+on+detail+" : "+target.character.name+" prend feu et brûlera au début de ses "+out.effect.turns
      +" prochaines activations."+critical,"magic");
  }else if(spell.effet==="malediction"){
    // Malédiction (Nécromancie) : ne se cumule pas, la relancer remplace la précédente.
    target.cursed={...out.effect,casterId:caster.id};
    missionLog(name+" lance "+spell.nom+on+detail+" : "+target.character.name+" est maudit"+(missionFeminine(target)?"e":"")
      +" et souffrira au début de ses "+out.effect.turns+" prochaines activations."+critical,"magic");
  }else if(spell.effet==="aura_de_feu"){
    target.torch={...out.effect,casterId:caster.id};
    missionLog(name+" lance "+spell.nom+on+detail+" : "+target.character.name+" s’embrase ; ses voisins ennemis brûleront au début de ses "
      +out.effect.turns+" prochaines activations."+critical,"magic");
  }else if(spell.effet==="mur_de_flammes"){
    const wall={cells:out.wall.cells,untilTurn:m.turn+out.wall.turns,effect:out.wall.effect,casterId:caster.id};
    m.flameWalls=[...(m.flameWalls||[]),wall];
    missionLog(name+" lance "+spell.nom+" ("+wall.cells.length+" cases)"+detail+" : un mur de feu, jusqu’au tour "+wall.untilTurn+".","magic");
  }else if(spell.effet==="arme_elementaire"){
    target.weaponEnchant={...out.effect};
    missionLog(name+" lance "+spell.nom+on+detail+" : chaque coup qui touche ajoute "+missionElementSome(out.effect.element)+", pendant "+out.effect.turns+" tours."+critical,"magic");
  }else if(spell.effet==="protection_elementaire"){
    const shields=Object.fromEntries((out.effect.elements||[out.effect.element]).map(el=>[el,{code:out.effect.code,bonus:out.effect.bonus,turns:out.effect.turns}]));
    target.elementalBonus={...(target.elementalBonus||{}),...shields};
    const names=(out.effect.elements||[out.effect.element]).map(missionElementThe);
    const against=names.length>1?names.slice(0,-1).join(", ")+" et "+names.at(-1):names[0];
    missionLog(name+" lance "+spell.nom+on+detail+" : +"+out.effect.bonus+" de protection contre "+against+", pendant "+out.effect.turns+" tour"+(out.effect.turns>1?"s":"")+".","magic");
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
    // Robustesse de l'ours : plus de Constitution, donc plus de PV max, et autant de PV.
    if(fx.stats.includes("Constitution")) missionRefreshMaxHp(target);
    const sign=fx.value<0?"−":"+",amount=sign+Math.abs(fx.value)+(fx.unit==="pourcentage"?" % de ":" de ");
    const when=self?(fx.turns>1?"pour cette activation et la suivante":"pour cette activation")
      :(fx.turns>1?"pour ses "+fx.turns+" prochaines activations":"pour sa prochaine activation");
    missionLog(name+" lance "+spell.nom+on+detail+" : "+amount+fx.stats.join(" et de ")+", "+when+".","magic");
  }else if(spell.effet==="crachat_venin"){
    // Le tir demande l'action rapide : il sert aux prochaines activations de la cible, même si le lanceur se vise.
    target.venom={...out.effect};
    missionLog(name+" lance "+spell.nom+on+detail+" : "+(target===caster?name:target.character.name)+" pourra cracher du venin (action rapide, "
      +out.effect.min+" à "+out.effect.max+" cases) "+(out.effect.turns>1?"pendant ses "+out.effect.turns+" prochaines activations":"à sa prochaine activation")+".","magic");
  }else if(spell.effet==="bourbier"){
    const f=out.mire,same=x=>x.q===f.q&&x.r===f.r;
    m.mire=[...(m.mire||[]).filter(x=>!same(x)),{q:f.q,r:f.r,untilTurn:m.turn+f.turns}];
    const stuck=missionUnits().find(x=>x.alive&&!x.offMap&&same(x));
    missionLog(name+" lance "+spell.nom+detail+" : la case devient un bourbier pendant "+f.turns+" tours"
      +(stuck?" ; "+stuck.character.name+" y est pris"+(missionFeminine(stuck)?"e":""):"")+".","magic");
  }else if(spell.effet==="transposition"){
    // Sans attaque d'opportunité : ce n'est pas un déplacement.
    const {from,to}=out.swap;
    caster.q=to.q;caster.r=to.r;target.q=from.q;target.r=from.r;
    missionLog(name+" lance "+spell.nom+on+detail+" : ils échangent leurs places.","magic");
  }else if(spell.effet==="resurrection"){
    raiseMissionDead(caster,target,out,detail);
  }else if(spell.effet==="invocation"){
    effect=summonMissionCreature(caster,spell,out,detail);
  }else if(spell.effet==="drain_de_vie"){
    // Sur soi : l'activation en cours compte comme la première.
    const fx=out.effect;
    caster.lifeDrain={code:fx.code,percent:fx.percent,turns:fx.turns-1};
    missionLog(name+" lance "+spell.nom+detail+" : "+fx.percent+" % des PV que ses coups d’arme au corps à corps retirent lui reviennent, "
      +(fx.turns>1?"pour cette activation et les "+(fx.turns-1)+" suivante"+(fx.turns>2?"s":""):"pour cette activation")+".","magic");
  }else if(spell.effet==="fletrissement"){
    const fx=out.effect;
    target.withered={code:fx.code,turns:fx.turns};
    missionLog(name+" lance "+spell.nom+on+detail+" : "+target.character.name+" ne peut plus être soigné"+(missionFeminine(target)?"e":"")
      +" ni récupérer de PV pendant ses "+fx.turns+" prochaines activations.","magic");
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
  return !missionUnits().some(u=>u.alive&&!u.offMap&&u.q===target.q&&u.r===target.r)&&!missionTerrainAt(target.q,target.r)
    &&!missionDecorBlocksMove(target.q,target.r);
}

// Invocations (Nécromancie ; Idan, 2026-10-28) : le joueur les joue (l'IA en combat automatique), dès le tour suivant ;
// chaque tour, le lanceur les garde (test de Charisme) et paie leur entretien, sinon elles disparaissent ; elles
// disparaissent aussi quand il tombe, et à la fin du combat (ni XP ni bilan). Une meute compte pour une seule invocation.
// unit.summon = {casterId, code, upkeep, group}.
function missionSummonArchetype(code){ return (game.referenceData?.summonArchetypes?.rows||[]).find(a=>a.code===code)||null; }
function addMissionSummon(caster,character,cell,summon){
  const m=game.mission;
  m.summonSeq=(m.summonSeq||0)+1;
  const pvMax=m.engine.maxHp({character,activeSet:1}),id="summon-"+m.summonSeq;
  // Comme tout le monde, elle arrive camouflée : le repérage du début de tour fait le reste.
  const unit={id,character,team:caster.team,q:cell.q,r:cell.r,isCaptain:false,isLieutenant:false,
    hp:pvMax,pvMax,alive:true,activeSet:1,prone:false,acted:true,movementRemaining:0,attackAvailable:false,quickAvailable:false,
    fleeing:false,fleeTurn:0,offMap:false,damageTaken:0,camouflaged:true,summon:{...summon,group:summon.group||id}};
  const army=caster.team==="player"?"players":"enemies",order=caster.team==="player"?"playerOrder":"enemyOrder";
  m[army].push(unit);
  m[order]=sortMissionInitiative([...m[order],unit],m.engine);
  return unit;
}
// Création de double (Illusion ; Idan, 2026-10-31) : une copie du mage (son allure, son équipement), à 1 PV, que les
// ennemis prennent pour une vraie cible. Il n'agit pas, ne réagit pas, ne coûte ni entretien ni test de Charisme ; il se
// dissipe dès qu'un coup ou un sort le touche, ou quand le mage tombe.
function addMissionDecoy(caster,cell){
  const src=caster.character;
  const character={...src,id:"decoy-"+src.id,name:src.name+" (double)",spells:[],mana:0};
  const unit=addMissionSummon(caster,character,cell,{casterId:caster.id,code:"decoy",upkeep:0});
  Object.assign(unit,{decoy:true,hp:1,pvMax:1,camouflaged:false});
  missionFx(unit,"Double","heal");
  return unit;
}
function dissipateMissionDecoy(unit,why="touché"){
  unit.alive=false;unit.offMap=true;unit.vanished=true;unit.movementRemaining=0;
  missionLog(unit.character.name+" se dissipe ("+why+").","magic");
}
// Zombie : share % des caractéristiques, des compétences et des PV max du mort ; il garde son arme et son armure.
function missionZombieCharacter(dead,share){
  const src=dead.character,f=share/100;
  const scale=values=>Object.fromEntries(Object.entries(values||{}).map(([k,v])=>[k,typeof v==="number"?Math.round(v*f):v]));
  return {...src,id:"zombie-"+src.id,name:src.name+" (zombie)",archetype:"zombie",undead:true,spells:[],mana:0,
    stats:scale(src.stats),skills:Object.fromEntries(Object.entries(src.skills||{}).map(([group,values])=>[group,scale(values)])),
    pvMax:Math.max(1,Math.round(dead.pvMax*f))};
}
// Créature fixe (summon-archetypes.json) : son arme naturelle voyage avec son gabarit (combat-engine.js, weaponTemplate).
function missionCreatureCharacter(arch,n){
  const a=arch.attaque||{},id="summon-"+arch.code+"-"+n;
  const weapon={id:id+"-weapon",itemType:"weapon",name:a.nom,natural:true,category:"Armes naturelles",
    template:{nom:a.nom,domaine:"Armes naturelles",prise:"1 main",degats_pv_base:a.degats_pv_base,degats_type:a.degats_type||null,
      puissance_tranchante_base:Number(a.puissance_tranchante)||0,puissance_perforante_base:Number(a.puissance_perforante)||0,
      puissance_contondante_base:Number(a.puissance_contondante)||0,malus_vitesse_arme_base:0,bonus_charge_base:Number(a.bonus_charge)||1,contre_charge:false,
      // Sangliers : charge plus forte ; araignées géantes : morsure empoisonnée (comme la sarbacane) et toile.
      empoisonne:Boolean(a.empoisonne),immobilise:Number(a.immobilise)||0}};
  return {id,name:n>1?arch.nom+" "+n:arch.nom,role:arch.nom,archetype:arch.code,undead:Boolean(arch.mort_vivant),
    immunePhysical:Boolean(arch.immunite_physique),stats:{...arch.caracteristiques},resistances:{...arch.resistances},pvMax:arch.pv,
    skills:{martial:{...arch.competences_martiales},social:{},magic:{}},spells:[],mana:0,items:[weapon],
    equipment:{slots:{weapon_set_1_main:weapon.id}}};
}
// Résurrection : le corps (allié ou ennemi) se relève dans le camp du lanceur ; un allié relevé meurt à la fin du combat.
function raiseMissionDead(caster,dead,out,detail){
  const s=out.summon,share=Math.round(s.share);
  dead.raised=true;
  const zombie=addMissionSummon(caster,missionZombieCharacter(dead,share),dead,{casterId:caster.id,code:s.code,upkeep:s.upkeep});
  missionLog(caster.character.name+" lance Résurrection sur le corps de "+dead.character.name+detail+" : "+dead.character.name
    +" se relève en zombie, avec "+share+" % de ses forces ("+zombie.pvMax+" PV) ; entretien "+s.upkeep+" mana par tour.","magic");
  if(dead.team==="player") missionLog(dead.character.name+" ne survivra pas à ce combat.","death");
}
// Une meute (Loups, Ours, Crocodiles) : la case choisie, puis les cases libres les plus proches ; s'il n'y en a plus,
// moins de créatures. Toutes partagent le même groupe : un seul test de Charisme et un seul entretien.
function missionSummonCells(start,count){
  const cells=[],seen=new Set([missionKey(start.q,start.r)]),queue=[start];
  while(queue.length&&cells.length<count){
    const cur=queue.shift();
    if(missionCellFree(cur)) cells.push(cur);
    for(const next of missionNeighbors(cur)){
      const key=missionKey(next.q,next.r);
      if(!seen.has(key)){ seen.add(key);queue.push(next); }
    }
  }
  return cells;
}
// Armée levée d'avance (le nécromancien dans son cimetière ; Idan, 2026-11-06 : « B, vas-y ») : au début du combat, chaque
// personnage dont la fiche donne un sort_initial (character.startSpells, une invocation) l'a déjà autour de lui, sans mana
// ni jet ; ensuite, mêmes règles que lancée en combat (entretien, test de Charisme, elle tombe avec lui).
function raiseMissionStartSummons(){
  const magic=missionMagic();
  if(!magic) return;
  for(const caster of missionUnits().filter(u=>u.alive&&!u.offMap&&u.character?.startSpells?.length)){
    for(const code of caster.character.startSpells){
      const spell=magic.spell(code);
      if(spell?.effet!=="invocation") continue;
      const summon={code,creature:spell.creature||null,upkeep:magic.upkeepCost(caster,code),cell:{q:caster.q,r:caster.r},
        count:magic.summonCount(caster,code)};
      summonMissionCreature(caster,spell,{summon},"",{start:true});
    }
  }
}
function summonMissionCreature(caster,spell,out,detail,{start=false}={}){
  const m=game.mission,s=out.summon,arch=missionSummonArchetype(s.creature);
  if(!arch){ missionLog("Créature inconnue : "+s.creature+".","bad"); return false; }
  const wanted=s.count?.count||1,cells=missionSummonCells(s.cell,wanted),group="pack-"+((m.summonSeq||0)+1);
  const units=cells.map(cell=>{
    const n=missionUnits().filter(u=>u.character.archetype===arch.code).length+1;
    return addMissionSummon(caster,missionCreatureCharacter(arch,n),cell,{casterId:caster.id,code:s.code,upkeep:s.upkeep,group});
  });
  const roll=s.count?.dice?" ("+s.count.dice+" : "+s.count.rolled+(s.count.bonus?", +"+s.count.bonus+" pour la Maîtrise":"")+")":"";
  const what=units.length>1?units.length+" "+arch.pluriel.toLowerCase()+" apparaissent"+roll+" ("+units[0].pvMax+" PV chacun)"
    :units[0].character.name+" apparaît"+roll+" ("+units[0].pvMax+" PV)";
  missionLog((start?"Autour de "+caster.character.name+", son "+spell.nom+" est déjà levée":caster.character.name+" lance "+spell.nom+detail)
    +" : "+what+(cells.length<wanted?", faute de place pour "+wanted:"")
    +" ; entretien "+s.upkeep+" mana par tour"+(units.length>1?" pour le groupe":"")+".","magic");
  return true;
}
function missionSummonGroups(filter){
  const groups=new Map();
  for(const u of missionUnits()) if(u.summon&&u.alive&&!u.offMap&&filter(u)) groups.set(u.summon.group,[...(groups.get(u.summon.group)||[]),u]);
  return [...groups.values()];
}
function dismissMissionSummons(units,reason){
  for(const u of units){ u.alive=false;u.offMap=true;u.vanished=true;u.movementRemaining=0; }
  const dust=units.every(u=>u.character.archetype==="zombie"),many=units.length>1;
  missionLog(reason+(dust?(many?" : ils tombent en poussière.":" : il tombe en poussière."):(many?" : ils disparaissent.":" : il disparaît.")),"bad");
}
function missionSummonLabel(units,possessive=true){
  if(units.length<2) return units[0].character.name;
  return (possessive?"ses ":"")+units.length+" "+(missionSummonArchetype(units[0].character.archetype)?.pluriel||units[0].character.role).toLowerCase();
}
function missionSummonCaster(unit){ return missionUnits().find(u=>u.id===unit.summon?.casterId)||null; }
// Un invocateur hors combat (ou sorti de la carte) : ses invocations disparaissent aussitôt.
function releaseMissionSummons(){
  for(const units of missionSummonGroups(u=>!missionSummonCaster(u)?.alive))
    dismissMissionSummons(units,missionSummonLabel(units,false)+" : "+(units.length>1?"leur":"son")+" invocateur est hors combat");
}
// Début de chaque tour : test de Charisme, puis entretien en mana, pour chaque invocation.
function maintainMissionSummons(){
  const magic=missionMagic();
  if(!magic) return;
  releaseMissionSummons();
  for(const units of missionSummonGroups(u=>!u.decoy)){
    const s=units[0].summon,caster=missionSummonCaster(units[0]),what=missionSummonLabel(units);
    const hold=magic.rollHold(caster,s.code),test=" (Charisme "+Math.round(hold.p)+" %, jet "+hold.roll+")";
    if(!hold.held){ dismissMissionSummons(units,caster.character.name+" perd le contrôle de "+what+test); continue; }
    const mana=magic.currentMana(caster);
    if(mana<s.upkeep){ dismissMissionSummons(units,caster.character.name+" n’a plus assez de mana pour garder "+what+" ("+s.upkeep+" nécessaires)"); continue; }
    caster.character.mana=Math.max(0,Math.round((mana-s.upkeep)*100)/100);
    missionLog(caster.character.name+" garde "+what+test+" : −"+s.upkeep+" mana.","magic");
  }
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

// Paralysie (Foudre) : au début de son activation, le paralysé la perd (true) ; l'effet tombe ensuite.
// Prison de glace (Eau) : de même, tant que dure la glace ; elle se brise à la fin.
function missionParalyzedSkip(unit){
  if(unit?.frozen){
    unit.frozen.turns-=1;
    const end=unit.frozen.turns<=0;
    if(end) unit.frozen=null;
    missionLog(unit.character.name+" est pris"+(missionFeminine(unit)?"e":"")+" dans la glace : "+(missionFeminine(unit)?"elle":"il")+" perd son activation"
      +(end?" ; la glace se brise.":"."),"bad");
    missionFx(unit,"Figé"+(missionFeminine(unit)?"e":""),"miss");
    return true;
  }
  // Sommeil (Illusion) : il dort, et perd ses activations jusqu'à la fin du sort (ou un coup qui le blesse).
  if(unit?.asleep){
    unit.asleep.turns-=1;
    const end=unit.asleep.turns<=0;
    if(end) unit.asleep=null;
    missionLog(unit.character.name+" dort : "+(missionFeminine(unit)?"elle":"il")+" perd son activation"+(end?" ; "+(missionFeminine(unit)?"elle":"il")+" se réveille.":"."),"bad");
    missionFx(unit,end?"Réveillé"+(missionFeminine(unit)?"e":""):"Endormi"+(missionFeminine(unit)?"e":""),"miss");
    return true;
  }
  if(!unit?.paralyzed) return false;
  unit.paralyzed.turns-=1;
  if(unit.paralyzed.turns<=0) unit.paralyzed=null;
  missionLog(unit.character.name+" est paralysé"+(missionFeminine(unit)?"e : elle":" : il")+" perd son activation.","bad");
  missionFx(unit,"Paralysé"+(missionFeminine(unit)?"e":""),"miss");
  return true;
}
// Tempête : une vague = 1D3 personnages au hasard dans la zone (alliés et lanceur compris), chacun frappé par les dés du
// sort, moins sa protection contre la foudre. Renvoie le total des dégâts. Le coup critique ne vaut que pour la première.
function missionStormWave(storm){
  const m=game.mission,magic=missionMagic();
  if(!m||!magic) return 0;
  const pool=magic.unitsInZone(storm.center,storm.radius,missionUnits());
  const count=Math.min(pool.length,magic.stormStrikes(storm));
  const struck=[];
  while(struck.length<count){
    const u=pool[Math.floor(Math.random()*pool.length)];
    if(!struck.includes(u)) struck.push(u);
  }
  const source=missionUnits().find(u=>u.id===storm.casterId)||null;
  let total=0;
  const lines=struck.map(u=>{
    const strike=magic.stormStrike(storm),hit=m.engine.elementalDamage(u,storm.element,strike.amount);
    total+=hit.damage;
    damageMissionUnitBySpell(u,hit.damage,source,storm.element);
    return u.character.name+" −"+hit.damage+" PV"+missionProtectionNote(hit);
  });
  storm.critical=false;
  storm.turnsLeft-=1;
  missionLog(lines.length?"La tempête frappe : "+lines.join(" ; ")+".":"La tempête gronde : personne dans la zone.","damage");
  return total;
}
// Blizzard : une vague = un jet de dés pour tous ceux de la zone (alliés et lanceur compris), moins leur protection
// contre le froid.
function missionBlizzardWave(blizzard){
  const m=game.mission,magic=missionMagic();
  if(!m||!magic) return 0;
  const units=magic.unitsInZone(blizzard.center,blizzard.radius,missionUnits());
  const amount=magic.tick(blizzard.effect).amount,source=missionUnits().find(u=>u.id===blizzard.casterId)||null;
  let total=0;
  const lines=units.map(u=>{ const hit=missionElementalHit(u,blizzard.effect.element||"froid",amount,source); total+=hit.damage; return u.character.name+" −"+hit.damage; });
  missionLog(lines.length?"Le blizzard gèle : "+lines.join(", ")+".":"Le blizzard souffle : personne dans la zone.","damage");
  return total;
}
function tickMissionBlizzards(){
  for(const b of game.mission?.blizzards||[]) missionBlizzardWave(b);
}
function tickMissionStorms(){
  const m=game.mission;
  if(!m?.storms?.length) return;
  for(const storm of m.storms) if(storm.turnsLeft>0) missionStormWave(storm);
  const before=m.storms.length;
  m.storms=m.storms.filter(s=>s.turnsLeft>0);
  if(m.storms.length<before) missionLog("La tempête se dissipe.","magic");
}

// École du Feu (Idan, 2026-10-31 ; chiffres de JC3). Embrasement : la cible brûle au début de chacune de ses activations.
function tickMissionBurning(unit){
  const effect=unit.burning,magic=missionMagic();
  if(!effect||!magic||!unit.alive) return;
  const tick=magic.tick(effect),source=missionUnits().find(u=>u.id===effect.casterId)||null;
  const hit=missionElementalHit(unit,effect.element||"feu",tick.amount,source);
  effect.turns=tick.turnsLeft;
  if(effect.turns<=0) unit.burning=null;
  missionLog("Embrasement : "+unit.character.name+" brûle, −"+hit.damage+" PV"+missionProtectionNote(hit)
    +(effect.turns>0?" (encore "+effect.turns+" tour"+(effect.turns>1?"s":"")+").":" ; les flammes s’éteignent."),"damage");
  checkMissionEnd();
}
// Malédiction (Nécromancie ; Idan, 2026-10-31, chiffres de JC3) : au début de chacune de ses activations, des dégâts
// nécrotiques, qui traversent l'armure et les résistances ; rien sur un mort-vivant.
function tickMissionCurse(unit){
  const effect=unit.cursed,magic=missionMagic();
  if(!effect||!magic||!unit.alive) return;
  const tick=magic.tick(effect),source=missionUnits().find(u=>u.id===effect.casterId)||null;
  effect.turns=tick.turnsLeft;
  if(effect.turns<=0) unit.cursed=null;
  const amount=magic.isUndead(unit)?0:tick.amount;
  missionLog("Malédiction : "+unit.character.name+" souffre, −"+amount+" PV nécrotiques"
    +(effect.turns>0?" (encore "+effect.turns+" tour"+(effect.turns>1?"s":"")+").":" ; la malédiction se dissipe."),"damage");
  damageMissionUnitBySpell(unit,amount,source,null);
  checkMissionEnd();
}
// Mur de flammes : une brûlure (les dés du sort × le facteur du lancer, moins la protection contre le feu).
function missionFlameBurn(unit,wall,how){
  const magic=missionMagic();
  if(!magic||!unit.alive) return;
  const source=missionUnits().find(u=>u.id===wall.casterId)||null;
  const hit=missionElementalHit(unit,wall.effect.element||"feu",magic.tick(wall.effect).amount,source);
  missionLog(unit.character.name+" "+how+" : −"+hit.damage+" PV"+missionProtectionNote(hit)+".","damage");
  checkMissionEnd();
}
function tickMissionFlameStart(unit){
  const wall=unit.alive?missionFlameAt(unit.q,unit.r):null;
  if(wall) missionFlameBurn(unit,wall,"est dans le mur de flammes");
}
// Torche vivante : au début de chacune de ses activations, les ennemis à son contact brûlent (un seul jet) ; lui non.
function tickMissionTorch(unit){
  const effect=unit.torch,magic=missionMagic(),m=game.mission;
  if(!effect||!magic||!unit.alive) return;
  const tick=magic.tick(effect);
  const foes=missionUnits().filter(u=>u.alive&&!u.offMap&&u.team!==unit.team&&m.engine.axialDistance(u,unit)===1);
  const lines=foes.map(u=>{ const hit=missionElementalHit(u,effect.element||"feu",tick.amount,unit); return u.character.name+" −"+hit.damage; });
  effect.turns=tick.turnsLeft;
  if(effect.turns<=0) unit.torch=null;
  missionLog("Torche vivante : "+unit.character.name+(lines.length?" brûle ses voisins — "+lines.join(", "):" flambe, personne à son contact")
    +(effect.turns>0?" (encore "+effect.turns+" tour"+(effect.turns>1?"s":"")+").":" ; les flammes s’éteignent."),lines.length?"damage":"magic");
  checkMissionEnd();
}

// Régénération (doc 12) : le soin tombe au début de chaque activation de la cible, jusqu'à la fin de sa durée.
function tickMissionRegeneration(unit){
  const effect=unit.regeneration,magic=missionMagic();
  if(!effect||!magic||!unit.alive) return;
  const tick=magic.tick(effect),healed=healMissionUnit(unit,tick.amount);
  effect.turns=tick.turnsLeft;
  if(effect.turns<=0) unit.regeneration=null;
  missionLog("Régénération : "+unit.character.name+" récupère "+healed+" PV"+missionWitherNote(unit)
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
// PV max qui suivent la Constitution en combat (Robustesse de l'ours) : à la hausse, les PV montent d'autant ; à la baisse,
// ils redescendent au plus aux PV max. Les ennemis gardent les PV de leur fiche (combat-engine.js, maxHp).
function missionRefreshMaxHp(unit){
  const next=game.mission.engine.maxHp(unit),delta=next-unit.pvMax;
  if(!delta) return;
  unit.pvMax=next;
  unit.hp=delta>0?unit.hp+delta:Math.min(unit.hp,next);
}
function tickMissionBuffs(unit){
  const magic=missionMagic(),name=unit.character.name;
  for(const [code,fx] of Object.entries(unit.statBuffs||{})){
    if(fx.turns>0){ fx.turns-=1; continue; }
    delete unit.statBuffs[code];
    if(!fx.silent) missionLog((magic?.spell(code)?.nom||code)+" : l’effet prend fin pour "+name+".","magic");
    if((fx.stats||[]).includes("Constitution")) missionRefreshMaxHp(unit);
  }
  if(unit.venom){
    if(unit.venom.turns>0) unit.venom.turns-=1;
    else{ unit.venom=null; missionLog(name+" ne peut plus cracher de venin.","magic"); }
  }
  if(unit.frenzy){
    if(unit.frenzy.turns>0) unit.frenzy.turns-=1;
    else{ unit.frenzy=null; missionLog(name+" sort de sa frénésie.","magic"); }
  }
  if(unit.mindFog){
    if(unit.mindFog.turns>0) unit.mindFog.turns-=1;
    else{ unit.mindFog=null; missionLog(name+" retrouve ses esprits : ses sorts réussissent de nouveau normalement.","magic"); }
  }
  if(unit.lifeDrain){
    if(unit.lifeDrain.turns>0) unit.lifeDrain.turns-=1;
    else{ unit.lifeDrain=null; missionLog("Drain de vie : l’effet prend fin pour "+name+".","magic"); }
  }
  if(unit.withered){
    if(unit.withered.turns>0) unit.withered.turns-=1;
    else{ unit.withered=null; missionLog(name+" n’est plus flétri"+(missionFeminine(unit)?"e":"")+" : les soins agissent de nouveau.","magic"); }
  }
  // Fiole de poison : l'arme reste enduite le tour où on l'applique et les deux suivants.
  if(unit.weaponPoison){
    if(unit.weaponPoison.turns>0) unit.weaponPoison.turns-=1;
    else{ unit.weaponPoison=null; missionLog("Le poison a séché sur l’arme de "+name+".","magic"); }
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
  // Nécromancie (Idan, 2026-10-28) : ni armure ni résistance ; un mort-vivant atteint par erreur n'y est pas sensible.
  if(out.necrotic){
    if(missionMagic().isUndead(unit)) return {damage:0,label:"aucun effet",note:" (mort-vivant)"};
    damageMissionUnitBySpell(unit,amount,caster,null);
    return {damage:amount,label:amount+" PV nécrotiques",note:" (ni armure ni résistance)"};
  }
  if(out.psychic){
    const factor=missionMagic().willFactor(caster,unit),damage=Math.ceil(amount*factor-1e-9);
    damageMissionUnitBySpell(unit,damage,caster,null);
    return {damage,label:damage+" PV psychiques",note:" (Volonté × "+(Math.round(factor*100)/100).toLocaleString("fr-FR")+")"};
  }
  if(out.physical){
    const hit=game.mission.engine.spellPhysicalHit(caster,unit,amount,out.physical);
    if(hit.immune) return {...hit,label:"aucun effet",note:" (immunisé aux dégâts physiques)"};
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
    if(missionDecorBlocksMove(c.q,c.r)){ obstacle=missionDecorAt(c.q,c.r).article||missionDecorAt(c.q,c.r).nom; break; }
    if(Math.abs(missionHeightAt(c.q,c.r)-missionHeightAt(unit.q,unit.r))>=missionAltitude().cliff){ obstacle="la falaise"; break; }
    unit.q=c.q;unit.r=c.r;moved++;
    missionFx(unit,"","",c);
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
  const magic=missionMagic(),out=magic.spit(unit,target,{lineOfSight:missionLineOfSight(unit,target),cover:missionCoverLevel(unit,target,{shot:true}),
    heightDiff:missionUnitHeight(unit)-missionUnitHeight(target)});
  if(!out.ok){ missionLog(out.reason,"bad"); return out; }
  unit.quickAvailable=false;
  const name=unit.character.name,foe=target.character.name;
  if(out.deflected){
    missionLog(name+" crache du venin sur "+foe+" : dévié par le champ de protection ("+Math.round(out.pDeflect)+" %, jet "+out.deflectRoll+").","miss");
    return out;
  }
  const aim=" (toucher "+Math.round(out.pHit)+" %, jet "+out.hitRoll+(out.cover?", couverture "+out.cover:"")+")";
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
  if(hit.immune) return " (insensible au poison)";
  const p=Math.round(hit.applied);
  return p?" (protection "+(p>0?p:"−"+Math.abs(p))+" %)":"";
}
// Arme enflammée, Arme de glace ou Arme électrique : chaque coup qui touche (non bloqué) ajoute des dégâts de feu, de froid
// ou de foudre, même s'il ne blesse pas.
function missionWeaponEnchantStrike(attacker,target,result){
  const fx=attacker.weaponEnchant,magic=missionMagic();
  if(!fx||!magic||!result?.ok||!result.hit||result.blocked||result.parried||!target.alive) return;
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

// Sorts de l'IA (le nécromancien ; Idan, 2026-11-06) : un ennemi dont la fiche donne des sorts (character.aiSpells) les
// essaie dans l'ordre de sa fiche, et lance le premier qui passe : une invocation tant que la sienne n'est pas là (au plus
// près de l'ennemi), une Résurrection sur un corps, un sort sur l'ennemi visible le plus proche. Les sorts sur soi, de zone
// ou en deux temps ne sont pas joués par l'IA. Nos mercenaires en combat automatique n'ont pas de aiSpells : rien ne
// change pour eux.
// La cible d'un sort de l'IA depuis la case où elle se tient, ou null.
function missionAiSpellTarget(unit,code,spell,opponents){
  const magic=missionMagic(),e=game.mission.engine;
  const nearestFoe=c=>Math.min(...opponents.map(o=>e.axialDistance(o,c)));
  if(spell.cible==="case_vide"){
    const cells=missionCells().filter(c=>magic.canCast(unit,c,code,{cellFree:missionCellFree(c),lineOfSight:missionLineOfSight(unit,c)}).ok);
    return cells.sort((a,b)=>nearestFoe(a)-nearestFoe(b))[0]||null;
  }
  if(spell.cible==="mort"){
    const dead=missionUnits().filter(x=>magic.isCorpse(x)&&magic.canCast(unit,x,code,{cellFree:missionCellFree({q:x.q,r:x.r}),
      lineOfSight:missionLineOfSight(unit,x)}).ok);
    return dead.sort((a,b)=>b.pvMax-a.pvMax)[0]||null;
  }
  const foes=opponents.filter(o=>!missionHiddenFrom(o,unit)&&magic.canCast(unit,o,code,{lineOfSight:missionLineOfSight(unit,o)}).ok);
  return foes.sort((a,b)=>e.axialDistance(unit,a)-e.axialDistance(unit,b))[0]||null;
}
function missionAiSpell(unit){
  const codes=unit.character?.aiSpells,magic=missionMagic();
  if(!codes?.length||!magic||unit.attackAvailable===false||!unit.alive) return false;
  const opponents=missionOpponents(unit).filter(o=>!o.offMap);
  if(!opponents.length) return false;
  for(const code of codes){
    const spell=magic.spell(code);
    if(!spell||["soi","case"].includes(spell.cible)||["deplacement_force","degats_paire"].includes(spell.effet)) continue;
    if(spell.cible==="case_vide"&&missionUnits().some(x=>x.alive&&!x.offMap&&x.summon?.casterId===unit.id&&x.summon?.code===code)) continue;
    let target=missionAiSpellTarget(unit,code,spell,opponents);
    // Hors de portée (la Résurrection se lance au contact) : il se déplace d'abord vers la case la moins chère d'où il peut
    // le lancer, en provoquant le moins d'attaques d'opportunité.
    if(!target&&spell.cible!=="case_vide"&&unit.movementRemaining>0&&!missionMireAt(unit.q,unit.r)){
      const home={q:unit.q,r:unit.r};
      let best=null;
      for(const path of missionReachablePaths(unit,unit.movementRemaining).values()){
        if(!path.length) continue;
        const end=path[path.length-1];
        unit.q=end.q;unit.r=end.r;
        const found=missionAiSpellTarget(unit,code,spell,opponents);
        unit.q=home.q;unit.r=home.r;
        if(!found) continue;
        const risk=missionPathOpportunityCount(unit,path);
        if(!best||risk<best.risk) best={path,risk};
        if(risk===0) break;
      }
      if(best){
        const moved=moveMissionUnitAlongPath(unit,best.path);
        if(moved) missionLog(unit.character.name+" se place pour lancer "+spell.nom+" ("+moved+" hex).","move");
        if(!unit.alive||game.mission.over) return true;
        target=missionAiSpellTarget(unit,code,spell,opponents);
      }
    }
    if(!target) continue;
    const out=resolveMissionSpell(unit,target,code);
    if(out?.ok) return true;
  }
  return false;
}

// Potions et fioles (Idan, 2026-10-29) : les fioles des 4 poches de ceinture, bues ou appliquées sur soi seulement par une
// action rapide, puis consommées (elles quittent la ceinture du mercenaire). Effets : data/reference/potions.json.
const MISSION_POCKETS=["belt_item_1","belt_item_2","belt_item_3","belt_item_4"];
function missionPotionRow(item){
  return item?.itemType==="potion"?(game.referenceData?.potions?.rows||[]).find(p=>p.nom===item.name)||null:null;
}
function missionBeltPotions(unit){
  const c=unit?.character,slots=c?.equipment?.slots||{};
  return MISSION_POCKETS.map(slot=>{
    const item=(c?.items||[]).find(x=>x.id===slots[slot])||null;
    return {slot,item,potion:missionPotionRow(item)};
  }).filter(p=>p.potion);
}
function missionPotionEffect(potion){
  return potion.effet==="soin"?"+"+potion.pourcentage+" % des PV max":potion.effet==="mana"?"+"+potion.pourcentage+" % du mana max"
    :"arme empoisonnée "+potion.tours+" tours";
}
// Pourquoi la fiole ne servirait à rien maintenant (bouton grisé, l'IA s'abstient), ou "".
function missionPotionBlock(unit,potion){
  if(!unit?.alive||unit.quickAvailable===false) return "Action rapide déjà utilisée.";
  if(potion.effet==="soin"&&unit.withered) return "Flétri"+(missionFeminine(unit)?"e":"")+" : aucun soin.";
  if(potion.effet==="soin"&&unit.hp>=unit.pvMax) return "PV au maximum.";
  const magic=missionMagic();
  if(potion.effet==="mana"&&(!magic||magic.currentMana(unit)>=magic.manaMax(unit))) return "Mana au maximum.";
  if(potion.effet==="poison_arme"&&!game.mission.engine.canPoisonWeapon(unit)) return "Il ne sait pas empoisonner une arme.";
  if(potion.effet==="poison_arme"&&!game.mission.engine.activeWeaponItem(unit)) return "Aucune arme à enduire.";
  return "";
}
function useMissionPotion(unit,slot){
  const m=game.mission,entry=missionBeltPotions(unit).find(p=>p.slot===slot);
  if(!m||!entry||missionPotionBlock(unit,entry.potion)) return false;
  const {item,potion}=entry,name=unit.character.name,percent=Number(potion.pourcentage)||0;
  unit.quickAvailable=false;
  if(potion.effet==="soin"){
    const healed=healMissionUnit(unit,Math.ceil(unit.pvMax*percent/100-1e-9));
    missionLog(name+" boit une "+potion.nom.toLowerCase()+" : +"+healed+" PV ("+Math.max(0,unit.hp)+" / "+unit.pvMax+").","magic");
  }else if(potion.effet==="mana"){
    const magic=missionMagic(),max=magic.manaMax(unit),before=magic.currentMana(unit);
    unit.character.mana=Math.round(Math.min(max,before+Math.ceil(max*percent/100-1e-9))*100)/100;
    const gained=Math.round(unit.character.mana-before);
    missionLog(name+" boit une "+potion.nom.toLowerCase()+" : +"+gained+" mana ("+Math.floor(unit.character.mana)+" / "+Math.round(max)+").","magic");
    missionFx(unit,"+"+gained+" mana","heal");
  }else if(potion.effet==="poison_arme"){
    const weapon=m.engine.activeWeaponItem(unit),turns=Number(potion.tours)||3;
    unit.weaponPoison={turns:Math.max(0,turns-1),amount:Number(potion.degats_poison)||0,itemId:weapon.id,weapon:weapon.name};
    missionLog(name+" enduit son arme ("+weapon.name+") de poison : "+turns+" tours, chaque coup qui blesse empoisonne.","magic");
    missionFx(unit,"Arme empoisonnée","poison");
  }
  // La fiole est consommée : elle quitte la ceinture du mercenaire.
  unit.character.items=(unit.character.items||[]).filter(x=>x!==item);
  unit.character.equipment.slots[slot]=null;
  return true;
}
function renderMissionPotionButtons(u){
  const groups=new Map();
  for(const p of missionBeltPotions(u)){
    const group=groups.get(p.potion.code);
    if(group) group.count+=1; else groups.set(p.potion.code,{...p,count:1});
  }
  return [...groups.values()].map(({slot,potion,count})=>{
    const effect=missionPotionEffect(potion),reason=missionPotionBlock(u,potion);
    return `<button class="secondary mission-spell mission-potion" data-potion="${esc(slot)}" title="${esc(potion.nom+" — action rapide, sur soi · "+effect+(reason?"\n"+reason:""))}"${reason?" disabled":""}>`
      +`<span class="mission-spell-text">${esc(potion.nom)}${count>1?" ×"+count:""}<small>rapide · ${effect}</small></span></button>`;
  }).join("");
}
// IA et combat automatique : une potion de soins sous 30 % des PV ; sinon une potion de mana quand le mana ne suffit plus
// pour aucun sort connu.
function missionAiPotion(unit){
  const potions=missionBeltPotions(unit);
  if(!potions.length||unit.quickAvailable===false) return;
  const heal=potions.find(p=>p.potion.effet==="soin");
  if(heal&&unit.hp<unit.pvMax*0.3&&useMissionPotion(unit,heal.slot)) return;
  const magic=missionMagic(),spells=magic?magic.knownSpells(unit):[];
  const mana=potions.find(p=>p.potion.effet==="mana");
  if(mana&&spells.length&&magic.currentMana(unit)<Math.min(...spells.map(s=>magic.manaCost(unit,s.code)))) useMissionPotion(unit,mana.slot);
}
// … et la fiole de poison au premier contact, juste avant de frapper.
function missionAiCoat(unit){
  if(unit.weaponPoison||unit.quickAvailable===false) return;
  const vial=missionBeltPotions(unit).find(p=>p.potion.effet==="poison_arme");
  if(vial) useMissionPotion(unit,vial.slot);
}

// Au-delà de 8 sorts connus, la barre de sorts devient un grimoire à onglets (un par école).
const MISSION_GRIMOIRE_MIN=9;
function renderMissionSpellBar(u){
  const m=game.mission,magic=missionMagic();
  if(!u||m.phase!=="player"||m.over) return "";
  if(!magic) return renderMissionPotionButtons(u);
  const spells=magic.knownSpells(u);
  // Crachat de venin reçu : un bouton de tir, même sans sort connu.
  const venom=u.venom?`<button class="secondary mission-spell${m.mode==="venom"?" selected":""}" data-venom="1" title="${esc("Cracher du venin — action rapide · "
    +u.venom.min+" à "+u.venom.max+" cases\nDégâts de poison ; la cible blessée est empoisonnée."+(u.quickAvailable===false?"\nAction rapide déjà utilisée.":""))}"`
    +`${u.quickAvailable===false?" disabled":""}><span class="mission-spell-text">Cracher du venin<small>rapide · ${u.venom.min}–${u.venom.max} cases</small></span></button>`:"";
  const potions=renderMissionPotionButtons(u);
  if(!spells.length) return venom+potions;
  const mana=magic.currentMana(u);
  const button=s=>{
    const cost=magic.manaCost(u,s.code),p=magic.castChance(u,s.code).p,quick=s.action==="rapide";
    const used=quick?u.quickAvailable===false:u.attackAvailable===false;
    const reason=used?(quick?"Action rapide déjà utilisée.":"Action principale déjà utilisée."):mana<cost?"Pas assez de mana.":"";
    const title=s.nom+" — "+(quick?"action rapide":"action principale")+" · "+cost+" mana · "+Math.round(p)+" % de réussite\n"
      +s.description+(reason?"\n"+reason:"");
    return `<button class="secondary mission-spell${m.mode==="spell:"+s.code?" selected":""}" data-spell="${esc(s.code)}" title="${esc(title)}"${reason?" disabled":""}>`
      +`${typeof spellIconHtml==="function"?spellIconHtml(s):""}`
      +`<span class="mission-spell-text">${esc(s.nom)}<small>${quick?"rapide":"principale"} · ${cost} mana · ${Math.round(p)} %</small></span></button>`;
  };
  const head=`<span class="mission-mana">Mana ${Math.floor(mana)}/${Math.round(magic.manaMax(u))}</span>`;
  if(spells.length<MISSION_GRIMOIRE_MIN) return head+spells.map(button).join("")+venom+potions;
  // Beaucoup de sorts : le grimoire se range par école, un onglet par école (les boutons restent tous dans la page).
  const school=s=>s.ecole||"Autres";
  const schools=[...new Set(spells.map(school))];
  const open=schools.includes(m.spellSchool)?m.spellSchool:school(spells.find(s=>m.mode==="spell:"+s.code)||spells[0]);
  return head+`<span class="mission-grimoire-tabs">`+schools.map(name=>`<button class="mission-school-tab${name===open?" selected":""}" type="button" data-spell-school="${esc(name)}">`
      +`${esc(name)}<small>${spells.filter(s=>school(s)===name).length}</small></button>`).join("")+`</span>`
    +schools.map(name=>`<span class="mission-school${name===open?"":" hidden"}">${spells.filter(s=>school(s)===name).map(button).join("")}</span>`).join("")+venom+potions;
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

// L'IA avance vers sa cible par le vrai chemin, autour du décor (Dijkstra jusqu'à une case voisine de la cible), aussi
// loin que son mouvement le permet ; sans chemin, vers la case atteignable la plus proche à vol d'oiseau.
function enemyMoveToward(unit,target){
  const e=game.mission.engine,budget=unit.movementRemaining??e.movementBase(unit);
  let best={path:[],distance:e.axialDistance(unit,target)};
  const blocked=occupiedMissionKeys(unit);
  if(!missionMireAt(unit.q,unit.r)){
    let full=null;
    for(const [,found] of missionPaths({q:unit.q,r:unit.r},blocked,Infinity)){
      const end=found.path[found.path.length-1];
      if(end&&e.axialDistance(end,target)<=1){ full=found.path; break; }
    }
    if(full){
      const path=[];
      let spent=0;
      let prev={q:unit.q,r:unit.r};
      for(const step of full){ spent+=missionStepCost(step,prev); if(spent>budget) break; path.push(step); prev=step; }
      if(path.length) best={path,distance:e.axialDistance(path[path.length-1],target)};
    }
  }
  if(!best.path.length){
    // Les chemins viennent dans l'ordre des coûts : à distance égale, le moins cher.
    for(const path of missionReachablePaths(unit,budget).values()){
      if(!path.length) continue;
      const dist=e.axialDistance(path[path.length-1],target);
      if(dist<best.distance) best={path,distance:dist};
    }
  }

  if(best.path.length){
    const moved=moveMissionUnitAlongPath(unit,best.path);
    if(moved) missionLog(unit.character.name+" avance de "+moved+" hex.","move");
  }
}

// Un tireur qui ne peut pas tirer d'où il est (trop près : un arc ne tire pas à moins de 2 cases ; trop loin ; hors de vue)
// cherche, dans son mouvement, la case la moins chère d'où il peut tirer, en provoquant le moins d'attaques d'opportunité.
// Sans cela, deux archers au contact tournaient l'un autour de l'autre sans fin (combat automatique bloqué).
function enemyMoveToShoot(unit,target){
  const e=game.mission.engine;
  if(missionMireAt(unit.q,unit.r)) return false;
  const budget=unit.movementRemaining??e.movementBase(unit);
  let best=null;
  // Les chemins viennent dans l'ordre des coûts : à risque égal, le moins cher.
  for(const path of missionReachablePaths(unit,budget).values()){
    if(!path.length) continue;
    const end=path[path.length-1];
    if(!e.canAttackAtDistance(unit,e.axialDistance(end,target),"ranged")||!missionLineOfSight(end,target)) continue;
    const risk=missionPathOpportunityCount(unit,path);
    if(!best||risk<best.risk) best={path,risk};
  }
  if(!best) return false;
  const moved=moveMissionUnitAlongPath(unit,best.path);
  if(moved) missionLog(unit.character.name+" se place pour tirer ("+moved+" hex).","move");
  return moved>0;
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
  const detail=" (Courage "+Math.round(c.pHold)+" %"+missionAuraNote(c.aura,c.auraFrom,c.whip)+", jet "+c.roll+")";
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

function enemyMissionAct(unit,options={}){
  game.mission.actingUnit=unit;
  try{ enemyMissionActivation(unit,options); }
  finally{ if(game.mission) game.mission.actingUnit=null; }
}

// reset : false pour un mercenaire dont selectNextMissionPlayer vient de commencer l'activation (combat automatique) ;
// sinon le poison, la régénération et les effets à durée compteraient deux fois.
function enemyMissionActivation(unit,{reset=true}={}){
  if(!unit.alive||game.mission.over||unit.decoy) return;
  if(reset) resetMissionActivation(unit);
  // L'IA empoigne une arme « Au choix » à deux mains quand Combat à deux mains vaut au moins Combat à une main.
  unit.twoHandGrip=game.mission.engine.prefersTwoHands(unit);
  if(unit.alive&&missionParalyzedSkip(unit)) return;
  if(unit.fleeing&&resolveMissionFleeingActivation(unit)) return;
  if(!unit.alive||game.mission.over) return;
  if(unit.frenzy){ frenzyMissionActivation(unit); return; }
  missionAiPotion(unit);
  missionAiCast(unit);
  if(unit.alive&&!game.mission.over) missionAiSpell(unit);
  if(!unit.alive||game.mission.over||unit.attackAvailable===false) return;
  // En retrait (le nécromancien ; Idan, 2026-11-06 : « B, vas-y ») : tant que ses troupes tiennent, il reste derrière elles
  // et n'avance que pour lancer un sort ; il ne frappe qu'un ennemi à son contact. Seul, il se bat comme les autres.
  if(unit.character?.staysBehind&&livingMissionUnits(unit.team).some(a=>a!==unit&&!a.offMap&&!a.decoy)){
    const foe=nearestMissionTarget(unit);
    if(foe&&game.mission.engine.axialDistance(unit,foe)===1&&missionUsableHands(unit,foe).length){
      missionAiCoat(unit);
      performMissionAttack(unit,foe,"melee",1);
    }
    return;
  }
  let target=nearestMissionTarget(unit);
  // Personne en vue (le décor coupe la vue) : il va chercher l'ennemi le plus proche, puis, s'il le voit, l'attaque ; sinon,
  // un tireur que personne ne voit guette (mode sentinelle, Idan, 2026-11-06 : les ennemis aussi).
  if(!target){
    const sought=missionOpponents(unit).filter(o=>!o.offMap).sort((a,b)=>game.mission.engine.axialDistance(unit,a)-game.mission.engine.axialDistance(unit,b))[0];
    if(sought) enemyMoveToward(unit,sought);
    if(game.mission.over||!unit.alive||unit.fleeing) return;
    target=nearestMissionTarget(unit);
    if(target){
      enemyTryUsefulSet(unit,target);
      enemyTryReload(unit);
      if(missionUsableHands(unit,target).length){
        const w=game.mission.engine.weaponTemplate(game.mission.engine.activeWeaponItem(unit));
        missionAiCoat(unit);
        performMissionAttack(unit,target,game.mission.engine.isRangedWeapon(w)?"ranged":"melee",game.mission.engine.axialDistance(unit,target));
        return;
      }
    }
    missionStandSentinel(unit);
    return;
  }

  enemyTryUsefulSet(unit,target);
  enemyTryReload(unit);
  let e=game.mission.engine,weapon=e.weaponTemplate(e.activeWeaponItem(unit));
  let mode=e.isRangedWeapon(weapon)?"ranged":"melee";
  let distance=e.axialDistance(unit,target);

  if(missionUsableHands(unit,target).length){
    missionAiCoat(unit);
    performMissionAttack(unit,target,mode,distance);
    return;
  }

  if(mode==="melee"&&missionChargeIfClear(unit,target)) missionAiCoat(unit);
  if(mode==="melee"&&enemyTryCharge(unit,target)) return;

  if(mode!=="ranged"||!enemyMoveToShoot(unit,target)) enemyMoveToward(unit,target);
  if(game.mission.over||!unit.alive||unit.fleeing) return;

  target=nearestMissionTarget(unit);
  if(!target){ missionStandSentinel(unit); return; }
  enemyTryUsefulSet(unit,target);
  enemyTryReload(unit);
  weapon=e.weaponTemplate(e.activeWeaponItem(unit));
  mode=e.isRangedWeapon(weapon)?"ranged":"melee";
  distance=e.axialDistance(unit,target);

  if(missionUsableHands(unit,target).length){
    missionAiCoat(unit);
    performMissionAttack(unit,target,mode,distance);
    return;
  }
  missionStandSentinel(unit);
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
      enemyMissionAct(m.activeUnit,{reset:false});
      if(m.over) break;
      endMissionActivation();
    }
  }finally{ m.autoRunning=false; }
  if(!m.over) missionLog("Combat automatique arrêté au tour "+m.turn+" : à vous de jouer.","bad");
  renderMission();
}

// Rythme de l'IA (Idan, 2026-11-04 : « L'IA joue beaucoup trop vite, on n'a rien le temps de comprendre ») : dans la page,
// les ennemis jouent l'un après l'autre ; les déplacements et les coups de chacun s'animent, puis une pause avant le suivant
// (« Accélérer » la raccourcit) ; l'ennemi qui joue est mis en évidence. Sans page (tests) ou en combat automatique : tout le
// tour d'un coup.
const MISSION_PACE={pause:900,fastPause:150};
function missionPaced(){
  return typeof window!=="undefined"&&typeof document!=="undefined"&&typeof setTimeout==="function"&&!game.mission?.autoRunning;
}
// La durée des animations en attente (déplacements, coups), en millisecondes.
function missionFxEstimate(fx){
  if(!fx?.length||fx.length>MISSION_FX.cap) return 0;
  let t=0;
  for(const f of fx) t+=f.step?MISSION_FX.step:MISSION_FX.pop;
  return Math.min(t,MISSION_FX.max);
}
function runMissionEnemyTurn(){
  const m=game.mission;
  if(!m||m.over) return;
  m.phase="enemy";m.activeUnit=null;m.mode=null;
  missionLog("Tour ennemi.","turn");
  renderMission();
  if(!missionPaced()){
    for(const unit of m.enemyOrder){
      if(m.over) break;
      enemyMissionAct(unit);
    }
    finishMissionEnemyTurn();
    return;
  }
  m.enemyQueue=[...m.enemyOrder];
  stepMissionEnemyTurn(m);
}
// Un ennemi, puis la pause ; à la fin de la file, la fin du tour.
function stepMissionEnemyTurn(m){
  if(!m||game.mission!==m||m.phase!=="enemy") return;
  m.enemyTimer=null;
  while(m.enemyQueue?.length&&!m.over){
    const unit=m.enemyQueue.shift();
    if(!unit.alive||unit.decoy) continue;
    m.pacedUnit=unit;
    enemyMissionAct(unit);
    const wait=missionFxEstimate(m.fx)+(game.missionFast?MISSION_PACE.fastPause:MISSION_PACE.pause);
    renderMission();
    m.enemyTimer=setTimeout(()=>stepMissionEnemyTurn(m),wait);
    return;
  }
  m.pacedUnit=null;
  m.enemyQueue=null;
  finishMissionEnemyTurn();
}
function finishMissionEnemyTurn(){
  const m=game.mission;
  if(!m) return;
  if(m.over){ renderMission(); return; }
  m.turn+=1;
  pruneMissionTerrain();
  tickMissionStorms();
  tickMissionBlizzards();
  maintainMissionSummons();
  if(checkMissionEnd()){ renderMission(); return; }
  resolveMissionDetection();
  for(const unit of m.players) unit.acted=false;
  // Un seul blocage au bouclier par tour (Idan, 2026-11-04) : chacun retrouve le sien.
  m.engine.resetShieldBlocks(missionUnits());
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
// Mode sentinelle (Idan, 2026-11-06 : « Un personnage avec une arme de tir peut se mettre en sentinelle au lieu de tirer. En
// mode sentinelle, pendant le tour de l'adversaire, tire sur la première cible qui se déplace à sa portée. Il a un double
// bonus : plus de précision et plus de chance pour enchaîner plusieurs tirs (sauf arme à feu). Il ne peut passer en mode
// sentinelle que si aucun ennemi ne le voit » ; « les deux » : camouflé, ou hors de la ligne de vue de tous les ennemis ;
// les ennemis aussi). Il y passe à la place de son attaque, et son activation s'arrête là. Bonus : game-core/combat-engine.js
// (SENTINEL).
function missionUnseen(unit){
  return Boolean(unit.camouflaged)||!missionOpponents(unit).some(o=>!o.offMap&&missionLineOfSight(o,unit));
}
function missionCanStandSentinel(unit){
  return Boolean(unit?.alive&&!unit.fleeing&&unit.attackAvailable&&!unit.sentinel&&missionHeldModes(unit).has("ranged")&&missionUnseen(unit));
}
function missionStandSentinel(unit){
  if(!missionCanStandSentinel(unit)) return false;
  unit.attackAvailable=false;
  unit.sentinel={turn:game.mission.turn};
  missionFx(unit,"Sentinelle");
  missionLog(unit.character.name+" se met en sentinelle.","info");
  return true;
}
// Le pas d'un personnage : chaque sentinelle ennemie qui l'a à sa portée, en vue, tire (dans l'ordre d'initiative) ; sa
// sentinelle s'arrête après ce tir. Sinon, elle s'arrête au début de sa prochaine activation (resetMissionActivation).
function missionSentinelReact(mover){
  const m=game.mission;
  const order=mover.team==="player"?m.enemyOrder:m.playerOrder;
  for(const sentinel of order){
    if(m.over||!mover.alive) return;
    if(!sentinel.sentinel||!sentinel.alive||sentinel.fleeing||sentinel.team===mover.team) continue;
    if(!missionCanAttack(sentinel,mover,"ranged")) continue;
    sentinel.sentinel=null;
    missionFx(sentinel,"Sentinelle");
    missionLog(sentinel.character.name+", en sentinelle, tire sur "+mover.character.name+".","info");
    performMissionAttack(sentinel,mover,"ranged",m.engine.axialDistance(sentinel,mover),null,{sentinel:true});
    checkMissionEnd();
  }
}
// Le bouton : le mercenaire se met en sentinelle, puis son activation s'arrête.
function standMissionSentinel(){
  const u=missionActiveUnit(),m=game.mission;
  if(!u||m.phase!=="player"||m.over||!missionStandSentinel(u)) return;
  endMissionActivation();
}
// Attaquer au corps à corps en se déplaçant (Idan, 2026-11-04 : « On doit pouvoir cliquer sur attaquer au CAC en se déplaçant
// automatiquement (ça doit être implicite) ») : un ennemi hors d'atteinte, mais qu'on rejoint avec le mouvement restant. Le
// plus court chemin jusqu'à une case d'où l'arme le frappe ; à égalité, celui qui provoque le moins d'attaques
// d'opportunité. reach : missionReachablePaths, calculé une fois pour plusieurs cibles. null : pas d'approche.
function missionMeleeApproach(u,target,reach=null){
  const m=game.mission,e=m.engine;
  if(!u||!target?.alive||target.team===u.team||!u.attackAvailable||!(u.movementRemaining>0)||missionHiddenFrom(target,u)) return null;
  if(missionCanAttack(u,target,"melee")) return null;
  const dual=e.isDualWielding(u),strikesAt=d=>dual?e.usableHands(u,d).some(h=>h.mode==="melee"):e.canAttackAtDistance(u,d,"melee");
  let best=null;
  for(const path of (reach||missionReachablePaths(u,u.movementRemaining)).values()){
    if(!path.length) continue;
    const end=path[path.length-1],distance=e.axialDistance(end,target);
    if(!strikesAt(distance)) continue;
    const cost=missionPathCost(path,u);
    if(best&&cost>best.cost) continue;
    const risk=missionPathOpportunityCount(u,path);
    if(!best||cost<best.cost||risk<best.risk) best={path,risk,distance,cost};
  }
  return best;
}

function missionActionAvailability(){
  const u=missionActiveUnit(),m=game.mission;
  if(!u||!m||m.phase!=="player"||m.over) return {};
  const e=m.engine,w=e.weaponTemplate(e.activeWeaponItem(u));
  return {
    move:u.movementRemaining>0,
    melee:u.attackAvailable&&missionHeldModes(u).has("melee"),
    twoHands:u.attackAvailable&&missionHeldModes(u).has("melee")&&e.canGripTwoHands(u),
    ranged:u.attackAvailable&&missionHeldModes(u).has("ranged"),
    sentinel:missionCanStandSentinel(u),
    charge:u.attackAvailable&&e.isMeleeWeapon(w)&&u.movementRemaining===e.movementBase(u),
    switch:u.quickAvailable&&e.canSwitchWeaponSet(u),
    reload:u.quickAvailable&&e.canReload(u),
    secondMove:u.attackAvailable,
    end:true,
    auto:true,
    testSpells:Boolean(missionMagic())&&!m.testSpells
  };
}

// Surbrillance de la portée (Idan, 2026-11-04 : « une attaque, un déplacement ou un sort sélectionné doit montrer une
// surbrillance pour la portée ») : les cases à portée de l'arme (au corps à corps, à distance), de la charge (de 1 à 2 fois le
// mouvement de base, plus la case de la cible) ou du sort choisi ; le déplacement garde ses cases atteignables.
function missionRangeCells(){
  const set=new Set(),m=game.mission,u=missionActiveUnit();
  if(!m||!u||m.phase!=="player"||!m.mode||m.mode==="move") return set;
  const e=m.engine,add=within=>{ for(const c of missionCells()){ const d=e.axialDistance(u,c); if(d>0&&within(d)) set.add(missionKey(c.q,c.r)); } };
  const spellCode=missionSpellMode(),magic=missionMagic();
  if(spellCode){
    const s=magic?.spell(spellCode);
    if(!s||s.cible==="soi"||s.cible==="invocation") return set;
    const reach=Number(magic.range(u,spellCode))||0,min=Number(s.portee_min)||0;
    add(d=>d<=reach&&d>=min);
    return set;
  }
  if(m.mode==="charge"){
    const base=e.movementBase(u);
    add(d=>d-1>=base&&d-1<=2*base);
    return set;
  }
  if(m.mode==="melee"||m.mode==="ranged"){
    const dual=e.isDualWielding(u);
    add(d=>(dual?e.usableHands(u,d):(e.canAttackAtDistance(u,d,m.mode)?[{mode:m.mode}]:[])).some(h=>h.mode===m.mode));
  }
  return set;
}
// La zone d'un sort de zone, s'il visait cette case (Idan, 2026-11-04 : « Les sorts de zone doivent montrer en surbrillance la
// zone lors de la sélection ») : mur, cône, ligne, ou disque (anneau) autour de la case ou du lanceur.
function missionSpellAreaCells(u,code,target){
  const magic=missionMagic(),e=game.mission.engine,s=magic?.spell(code);
  if(!s||!u||!target) return [];
  if(s.zone_forme==="mur") return magic.wallCells(u,target,magic.zoneLength(u,code));
  if(s.zone_forme==="cone") return magic.coneCells(u,target,magic.zoneLength(u,code));
  if(s.zone_forme==="ligne") return magic.lineCells(u,target,magic.zoneLength(u,code));
  if(s.zone_rayon_base==null) return [];
  const center=s.cible==="soi"?{q:u.q,r:u.r}:{q:target.q,r:target.r};
  const radius=Number(magic.zoneRadius(u,code))||0,min=Number(s.zone_anneau_min)||0;
  return missionCells().filter(c=>{ const d=e.axialDistance(center,c); return d<=radius&&d>=min; });
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
    }else if(cible==="mort"){
      for(const dead of missionUnits()) if(magic.isCorpse(dead)&&magic.canCast(u,dead,spellCode,{cellFree:missionCellFree({q:dead.q,r:dead.r}),
        lineOfSight:missionLineOfSight(u,dead)}).ok) set.add(missionKey(dead.q,dead.r));
    }else{
      for(const unit of missionUnits()) if(unit.alive&&!unit.offMap&&magic.canCast(u,unit,spellCode,{lineOfSight:missionLineOfSight(u,unit)}).ok) set.add(missionKey(unit.q,unit.r));
    }
    return set;
  }

  const reach=m.mode==="melee"&&u.movementRemaining>0?missionReachablePaths(u,u.movementRemaining):null;
  for(const enemy of livingMissionUnits("enemy")){
    if((m.mode==="melee"||m.mode==="ranged")&&missionCanAttack(u,enemy,m.mode)) set.add(missionKey(enemy.q,enemy.r));
    // En se déplaçant d'abord (Idan, 2026-11-04).
    else if(reach&&missionMeleeApproach(u,enemy,reach)) set.add(missionKey(enemy.q,enemy.r));
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

function missionHpClass(pct){ return pct<=30?" hp-low":pct<=60?" hp-mid":""; }

// Le tier de l’archétype fixe le cadre, y compris pour les chefs. Les ennemis du test libre sont Normal.
// Cadre de nos personnages en combat (Idan, 2026-11-06 : « un cadre de couleur pour nos personnages ? Archer / CAC /
// Magie » ; « combat seulement », « on ne touche pas aux ennemis ») : la couleur de leur domaine du moment (bleu, vert,
// violet ; styles.css) sur le pion, la barre d'ordre de jeu et la liste. Ni les ennemis, ni les invocations.
function missionDomainAttr(unit){
  if(unit.team!=="player"||unit.summon) return "";
  const domain=unit.character?.domain||unit.character?.equipment?.profile?.type;
  return ["melee","ranged","magic"].includes(domain)?` data-domain="${domain}"`:"";
}
function renderMissionPortrait(unit,variant){
  const portrait=renderAvatar(unit.character,{variant,kind:"portrait"});
  if(unit.team!=="enemy"||unit.summon) return portrait;
  const tier=unit.character.archetype?missionRules().archetype(unit.character.archetype)?.tier:null;
  const rank=["novice","normal","veteran","elite"][Number(tier)-1]||"normal";
  return `<span class="enemy-rank-portrait" data-enemy-rank="${rank}">${portrait}<img class="enemy-rank-ring" src="/assets/enemy-ranks/${rank}.webp" alt="" aria-hidden="true" decoding="async"></span>`;
}

function renderMissionRoster(units){
  return units.filter(u=>!u.vanished).map(u=>{
    const pct=Math.max(0,Math.min(100,Math.round(u.hp/u.pvMax*100)));
    return `
    <div class="mission-roster-row ${u.team} ${u.alive?"":"down"}${missionActiveUnit()===u?" active":""}"${missionDomainAttr(u)} data-unit-id="${esc(String(u.id))}" title="Centrer la carte sur ${esc(u.character.name)}">
      ${renderMissionPortrait(u,"compact")}
      <div class="mission-roster-copy">
        <strong>${esc(u.character.name)}</strong>
        <span>${u.raised?"Relevé en zombie":u.offMap?"A quitté le combat":(u.summon?"Invocation · ":"")+Math.max(0,u.hp)+"/"+u.pvMax+" PV"+(u.hp<0?" ("+u.hp+")":"")+(u.alive&&u.fleeing?" · En fuite":"")+(u.alive&&u.camouflaged?" · Camouflé":"")+(u.alive&&u.sentinel?" · En sentinelle":"")+(u.alive&&!game.mission.engine.isLoaded(u,game.mission.engine.activeWeaponItem(u))?" · Arme déchargée":"")}</span>
        ${u.alive&&!u.offMap?`<i class="mission-roster-hp${missionHpClass(pct)}"><b style="width:${pct}%"></b></i>`:""}
        <small>Init ${Math.round(game.mission.engine.initiative(u))} · Mvt ${game.mission.engine.movementBase(u)}${missionRosterMagic(u)}</small>
      </div>
    </div>
  `;}).join("");
}

// Ordre d'activation du tour : votre équipe dans l'ordre d'initiative (déjà joués estompés), puis les ennemis.
function renderMissionInitiative(){
  const m=game.mission,u=missionActiveUnit();
  const shown=x=>x.alive&&!x.offMap&&!x.vanished&&!x.raised;
  const chip=(x,done)=>`<li class="mission-init ${x.team}${x===u?" active":""}${done?" done":""}"${missionDomainAttr(x)} data-unit-id="${esc(String(x.id))}" title="${esc(x.character.name)} — initiative ${Math.round(m.engine.initiative(x))}${done?" — a joué":""}">`
    +`${renderMissionPortrait(x,"compact")}</li>`;
  const players=m.playerOrder.filter(shown),enemies=m.enemyOrder.filter(shown);
  return players.map(x=>chip(x,m.phase==="player"&&x.acted)).join("")
    +(players.length&&enemies.length?`<li class="mission-init-sep" aria-hidden="true">⚔</li>`:"")
    +enemies.map(x=>chip(x,false)).join("");
}

// Le mercenaire actif, à gauche de la barre d'actions : portrait, PV, mana, mouvement et actions restantes.
function renderMissionActiveCard(u){
  const m=game.mission;
  if(!u) return m.over?"":`<p class="mission-active-idle">${m.phase==="enemy"?"Les ennemis jouent…":""}</p>`;
  const e=m.engine,magic=missionMagic(),pct=Math.max(0,Math.min(100,Math.round(u.hp/u.pvMax*100)));
  const weapon=e.activeWeaponItem(u),offhand=e.isDualWielding(u)?e.activeOffhandItem(u):null;
  const knows=magic&&magic.knownSpells(u).length;
  const mana=knows?magic.currentMana(u):0,manaMax=knows?Math.round(magic.manaMax(u)):0;
  const moveMax=e.movementBase(u)*(u.secondMove?2:1);
  return `<span class="mission-active-portrait ${u.team}">${renderMissionPortrait(u,"battle")}</span>
    <div class="mission-active-copy">
      <strong>${esc(u.character.name)}</strong>
      <span class="mission-meter hp${missionHpClass(pct)}"><b style="width:${pct}%"></b><em>${Math.max(0,u.hp)} / ${u.pvMax} PV</em></span>
      ${knows?`<span class="mission-meter mana"><b style="width:${manaMax?Math.round(Math.max(0,mana)/manaMax*100):0}%"></b><em>${Math.floor(mana)} / ${manaMax} mana</em></span>`:""}
      <small>Mouvement ${u.movementRemaining}/${moveMax} · Set ${u.activeSet} · ${esc(weapon?.name||"Sans arme")}${offhand?" + "+esc(offhand.name):""}</small>
      <span class="mission-pips"><i class="${u.attackAvailable?"on":""}" title="Action principale${u.attackAvailable?" disponible":" utilisée"}">Principale</i><i class="${u.quickAvailable?"on":""}" title="Action rapide${u.quickAvailable?" disponible":" utilisée"}">Rapide</i></span>
    </div>`;
}

// Vue de la carte (zoom et déplacement) : une transformation CSS sur #mission-map, qui garde sa taille réelle.
// Tant que le joueur n'a ni zoomé ni déplacé la carte, elle tient entière dans l'écran.
const MISSION_ZOOM={min:0.3,max:2.4,fitMax:1.3,step:1.2};
const missionView={mission:null,scale:1,x:0,y:0,fitted:true,activeId:null,drag:null,dragged:false};

function missionMapSize(){
  return {width:Math.ceil(88+Math.sqrt(3)*MISSION_MAP.size*(MISSION_MAP.cols+0.5)),
    height:Math.ceil(88+1.5*MISSION_MAP.size*(MISSION_MAP.rows-1)+2*MISSION_MAP.size)};
}
function missionStageSize(){
  const stage=$("mission-map").parentElement;
  return {w:Number(stage?.clientWidth)||0,h:Number(stage?.clientHeight)||0};
}
function fitMissionView(){
  const {width,height}=missionMapSize(),{w,h}=missionStageSize();
  const scale=Math.min(MISSION_ZOOM.fitMax,w>0?(w-16)/width:1,h>0?(h-16)/height:1);
  Object.assign(missionView,{scale,x:w>0?(w-width*scale)/2:0,y:h>0?(h-height*scale)/2:0,fitted:true});
}
// La carte ne sort jamais entièrement de l'écran : il en reste toujours une bande visible.
function clampMissionView(){
  const {width,height}=missionMapSize(),{w,h}=missionStageSize(),s=missionView.scale,keep=140;
  if(!(w>0&&h>0)) return;
  missionView.x=Math.min(w-keep,Math.max(keep-width*s,missionView.x));
  missionView.y=Math.min(h-keep,Math.max(keep-height*s,missionView.y));
}
function applyMissionView(){
  $("mission-map").style.transform=`translate(${Math.round(missionView.x)}px,${Math.round(missionView.y)}px) scale(${missionView.scale})`;
}
function zoomMissionView(factor,cx=null,cy=null){
  const {w,h}=missionStageSize(),s0=missionView.scale;
  const s=Math.min(MISSION_ZOOM.max,Math.max(MISSION_ZOOM.min,s0*factor));
  if(cx===null){ cx=w/2; cy=h/2; }
  missionView.x=cx-(cx-missionView.x)*s/s0;
  missionView.y=cy-(cy-missionView.y)*s/s0;
  missionView.scale=s;
  missionView.fitted=false;
  clampMissionView();
  applyMissionView();
}
function centerMissionView(unit,onlyIfHidden=false){
  const {w,h}=missionStageSize();
  if(!unit||unit.offMap||!(w>0&&h>0)) return;
  const p=missionHexPixel(unit.q,unit.r),s=missionView.scale,x=missionView.x+p.x*s,y=missionView.y+p.y*s,pad=90;
  if(onlyIfHidden&&x>pad&&x<w-pad&&y>pad&&y<h-pad) return;
  missionView.x=w/2-p.x*s;
  missionView.y=h/2-p.y*s;
  missionView.fitted=false;
  clampMissionView();
}
// Tiroirs repliables (équipes à gauche, console à droite) : état retenu dans le navigateur.
const MISSION_DRAWERS_KEY="bw-mission-drawers";
function missionDrawerState(){
  let saved=null;
  try{ saved=JSON.parse(localStorage.getItem(MISSION_DRAWERS_KEY)||"null"); }catch{}
  const wide=typeof window==="undefined"||window.innerWidth>=1500;
  return {roster:saved?.roster??true,console:saved?.console??wide};
}
function setMissionDrawer(name,open){
  const state={...missionDrawerState(),[name]:open};
  try{ localStorage.setItem(MISSION_DRAWERS_KEY,JSON.stringify(state)); }catch{}
  renderMission();
}
function renderMissionDrawers(){
  const state=missionDrawerState();
  for(const [name,id] of [["roster","mission-roster-drawer"],["console","mission-console-drawer"]]){
    const drawer=$(id);
    if(!drawer) continue;
    drawer.classList.toggle("collapsed",!state[name]);
    drawer.querySelector?.(".mission-drawer-toggle")?.setAttribute("aria-expanded",String(state[name]));
  }
}

function renderMission(){
  const m=game.mission;
  if(!m||m.autoRunning) return;
  const e=m.engine,u=missionActiveUnit(),targets=targetableMissionCells(),inRange=missionRangeCells();
  const {width,height}=missionMapSize();

  $("mission-turn").textContent=m.over?(m.winner==="player"?"Victoire":"Défaite"):"Tour "+m.turn+" · "+(m.phase==="player"?"Votre équipe":"Ennemi");
  $("mission-active").textContent=u
    ?"Actif : "+u.character.name+" · Mouvement "+u.movementRemaining+"/"+e.movementBase(u)*(u.secondMove?2:1)+" · Set "+u.activeSet
    :"";

  // Décor (Idan : « des couleurs pour commencer ») : une couche de cases colorées sous les cases cliquables.
  let decorTiles="";
  for(const d of m.decor||[]){
    const row=missionDecorRow(d.code),p=missionHexPixel(d.q,d.r);
    if(row) decorTiles+=`<span class="hex-decor${row.cout_mouvement==null?" blocking":""}" data-decor="${esc(row.code)}" style="left:${p.x-MISSION_MAP.size}px;top:${p.y-MISSION_MAP.size}px;--decor:${row.couleur}"></span>`;
  }
  // Altitude : une couche par-dessus le décor, un peu plus claire à chaque niveau, avec son chiffre.
  let reliefTiles="";
  for(const c of m.relief||[]){
    const p=missionHexPixel(c.q,c.r);
    reliefTiles+=`<span class="hex-relief" data-level="${c.h}" style="left:${p.x-MISSION_MAP.size}px;top:${p.y-MISSION_MAP.size}px"></span>`;
  }
  const reach=m.mode==="move"&&u?missionReachablePaths(u,u.movementRemaining):null;
  let cells="";
  for(const {q,r} of missionCells()){
    const p=missionHexPixel(q,r),key=missionKey(q,r),classes=["hex-cell"];
    let title="";
    if(targets.has(key)) classes.push(m.mode==="move"?"reachable":missionSpellMode()?"spell-target":"targetable");
    else if(inRange.has(key)) classes.push("in-range");
    const decor=missionDecorAt(q,r),level=missionHeightAt(q,r);
    const about=[decor?missionDecorLabel(decor):"",level?"altitude "+level:""].filter(Boolean).join(" · ");
    if(about) title=` title="${esc(about.charAt(0).toUpperCase()+about.slice(1))}"`;
    const magma=missionTerrainAt(q,r);
    if(magma){ classes.push("magma"); title=` title="Flaque de magma : infranchissable jusqu’au tour ${magma.untilTurn}"`; }
    if(m.spellTarget&&m.spellTarget.q===q&&m.spellTarget.r===r) classes.push("spell-chosen");
    const mire=missionMireAt(q,r);
    if(mire){ classes.push("mire"); title=` title="Bourbier : on ne peut plus s’y déplacer jusqu’au tour ${mire.untilTurn}"`; }
    const fog=missionFogAt(q,r);
    if(fog){ classes.push("fog"); title=` title="Brouillard : coupe la ligne de vue jusqu’au tour ${fog.untilTurn}"`; }
    const snow=missionBlizzardAt(q,r);
    if(snow){ classes.push("blizzard"); title=` title="Blizzard : froid à chaque tour, déplacement réduit, on n’y voit pas à travers (jusqu’au tour ${snow.untilTurn})"`; }
    const flames=missionFlameAt(q,r);
    if(flames){ classes.push("flames"); title=` title="Mur de flammes : brûle qui y entre ou s’y trouve (jusqu’au tour ${flames.untilTurn})"`; }
    const swarmCell=missionSwarmAt(q,r);
    if(swarmCell){ classes.push("swarm"); title=` title="Nuée d’insectes : les ennemis de son invocateur y perdent Perception et Dextérité (jusqu’au tour ${swarmCell.untilTurn})"`; }
    const storm=missionStormAt(q,r);
    if(storm){ classes.push("storm"); title=` title="Tempête : la foudre frappe au hasard dans la zone (encore ${storm.turnsLeft} tour${storm.turnsLeft>1?"s":""})"`; }
    if(targets.has(key)&&m.mode==="move"){
      const risk=missionPathOpportunityCount(u,reach?.get(key)||[]);
      if(risk){
        classes.push("provokes");
        title=` title="Provoque ${risk} attaque${risk>1?"s":""} d’opportunité"`;
      }
    }
    cells+=`<button class="${classes.join(" ")}" data-hex-q="${q}" data-hex-r="${r}"${title} style="left:${p.x-MISSION_MAP.size}px;top:${p.y-MISSION_MAP.size}px"></button>`;
  }

  // Pions : portrait rond, anneau de camp ou de rang, barre de PV ; le nom s'affiche au survol et sur l'actif.
  // Un clic sur un pion vaut un clic sur sa case.
  const tokens=missionUnits().filter(unit=>!unit.offMap&&!unit.raised).map(unit=>{
    const p=missionHexPixel(unit.q,unit.r);
    const pct=Math.max(0,Math.min(100,Math.round(unit.hp/unit.pvMax*100)));
    const classes=["mission-token",unit.team,unit.alive?"alive":"down"];
    if(u===unit||m.pacedUnit===unit) classes.push("active");
    const encircled=unit.alive&&missionEncircled(unit);
    if(encircled) classes.push("encircled");
    if(unit.alive&&unit.fleeing) classes.push("fleeing");
    if(unit.alive&&unit.camouflaged) classes.push("camouflaged");
    if(unit.summon) classes.push("summoned");
    if(unit.character.undead) classes.push("undead");
    if(targets.has(missionKey(unit.q,unit.r))&&m.mode!=="move") classes.push(missionSpellMode()?"spell-aim":"target");
    return `<div class="${classes.join(" ")}"${missionDomainAttr(unit)} data-unit-id="${esc(String(unit.id))}" data-hex-q="${unit.q}" data-hex-r="${unit.r}" style="left:${p.x-26}px;top:${p.y-26}px">
      <span class="token-ring">${renderMissionPortrait(unit,"battle")}</span>
      ${unit.alive?`<span class="token-hp${missionHpClass(pct)}"><i style="width:${pct}%"></i></span>`:""}
      <strong>${esc(unit.character.name.split(" ")[0])}</strong>
      <em>${unit.alive&&unit.fleeing?"En fuite":Math.max(0,unit.hp)+"/"+unit.pvMax+" PV"}</em>
    </div>`;
  }).join("");

  // Tiroirs d'abord : leur largeur fixe la place laissée à la carte.
  renderMissionDrawers();
  const map=$("mission-map");
  map.style.width=width+"px";
  map.style.height=height+"px";
  if(missionView.mission!==m){
    Object.assign(missionView,{mission:m,activeId:null,hp:{},pos:{},alive:{}});
    m.fx=[];
    fitMissionView();
  }
  else if(missionView.fitted) fitMissionView();
  if(u&&u.id!==missionView.activeId){ missionView.activeId=u.id; if(!missionView.fitted) centerMissionView(u,true); }
  applyMissionView();
  map.innerHTML=decorTiles+reliefTiles+cells+tokens;
  missionHover.key=null;
  $("mission-hover-card").classList.add("hidden");
  scheduleMissionFx();

  const availability=missionActionAvailability();
  const buttons=[
    ["mission-move-btn","move"],["mission-attack-btn","melee"],["mission-charge-btn","charge"],
    ["mission-switch-btn","switch"],["mission-reload-btn","reload"],["mission-ranged-btn","ranged"],["mission-sentinel-btn","sentinel"],["mission-second-move-btn","secondMove"],["mission-end-activation-btn","end"],["mission-auto-btn","auto"]
  ];
  for(const [id,key] of buttons){
    $(id).disabled=!availability[key];
    $(id).classList.toggle("selected",m.mode===key&&!(key==="melee"&&m.twoHands));
  }
  // « Attaquer à deux mains » : seulement avec une arme « Au choix » tenue seule.
  const twoHandsBtn=$("mission-two-hands-btn");
  if(twoHandsBtn){
    twoHandsBtn.classList.toggle("hidden",!(u&&m.engine.canGripTwoHands(u)));
    twoHandsBtn.disabled=!availability.twoHands;
    twoHandsBtn.classList.toggle("selected",m.mode==="melee"&&Boolean(m.twoHands));
  }
  $("mission-test-spells-btn").disabled=!availability.testSpells;
  // « Accélérer » : pendant le tour ennemi, la pause entre deux ennemis raccourcit (MISSION_PACE).
  const speedBtn=$("mission-speed-btn");
  if(speedBtn){
    speedBtn.classList.toggle("hidden",!(m.phase==="enemy"&&!m.over));
    speedBtn.textContent=game.missionFast?"Vitesse normale":"Accélérer";
  }
  $("mission-spells").innerHTML=renderMissionSpellBar(u);
  $("mission-active-card").innerHTML=renderMissionActiveCard(u);
  $("mission-initiative").innerHTML=renderMissionInitiative();

  $("mission-roster-player").innerHTML=renderMissionRoster(m.playerOrder);
  $("mission-roster-enemy").innerHTML=renderMissionRoster(m.enemyOrder);
  $("mission-console").innerHTML=renderMissionConsole(m.log);
  $("mission-result").classList.toggle("hidden",!m.over);
  $("mission-aftermath").innerHTML=m.over?renderMissionAftermath(m):"";
  $("mission-result-back-btn").textContent=m.companyReport?.gameOver?"Fin de la partie":"Retour à la compagnie";
  $("mission-leave-btn").disabled=!m.over;
  $("mission-leave-btn").title=m.over?"":"Disponible une fois le combat terminé";
}

// Console allégée : les jets de repérage qui se suivent (3 et plus) sont regroupés dans une ligne dépliable.
function renderMissionConsole(log){
  const line=x=>`<div class="combat-log ${x.kind}">${esc(x.message)}</div>`;
  let html="",group=[];
  const flush=()=>{
    if(group.length>=3) html+=`<details class="combat-log-group"><summary>${group.length} repérages</summary>${group.map(line).join("")}</details>`;
    else html+=group.map(line).join("");
    group=[];
  };
  for(const x of log.slice().reverse()){
    if(x.kind==="info"&&/ repère /.test(x.message)) group.push(x);
    else{ flush(); html+=line(x); }
  }
  flush();
  return html;
}

// Rejeu de la file d'effets sur la carte qui vient d'être dessinée : glissements pas à pas, chiffres (−N, +N) et
// mentions (Raté, Bloqué…), barres de PV et mise hors combat, dans l'ordre des événements. La référence est l'état
// du rejeu précédent ; ce qui a changé hors de la file (poison, téléportation…) est montré à la fin. Une file trop
// longue (combat automatique) n'est pas rejouée ; au-delà de 3,6 s, tout s'accélère.
const MISSION_FX={step:90,pop:300,bar:250,max:3600,cap:160};
function scheduleMissionFx(){
  const m=game.mission;
  if(typeof requestAnimationFrame==="undefined"||typeof document==="undefined"){ if(m) m.fx=[]; return; }
  if(missionView.fxPending) return;
  missionView.fxPending=true;
  requestAnimationFrame(()=>{ missionView.fxPending=false; playMissionFx(); });
}
function playMissionFx(){
  const m=game.mission;
  if(!m) return;
  const fx=m.fx||[],units=missionUnits();
  m.fx=[];
  const prev={hp:missionView.hp||{},pos:missionView.pos||{},alive:missionView.alive||{}};
  missionView.hp=Object.fromEntries(units.map(u=>[u.id,u.hp]));
  missionView.pos=Object.fromEntries(units.map(u=>[u.id,{q:u.q,r:u.r}]));
  missionView.alive=Object.fromEntries(units.map(u=>[u.id,u.alive]));
  if(fx.length>MISSION_FX.cap) return;
  const hp={...prev.hp},pos={...prev.pos},tracks=new Map(),pops=[];
  const track=id=>{ if(!tracks.has(id)) tracks.set(id,{moves:[],bars:[],lastHit:null}); return tracks.get(id); };
  let t=0;
  for(const f of fx){
    if(f.step){
      const from=pos[f.id];
      if(from&&(from.q!==f.step.q||from.r!==f.step.r)){ track(f.id).moves.push({at:t,dur:MISSION_FX.step,from,to:f.step}); t+=MISSION_FX.step; }
      pos[f.id]={q:f.step.q,r:f.step.r};
      continue;
    }
    const before=hp[f.id],delta=before===undefined?0:f.hp-before;
    hp[f.id]=f.hp;
    if(!delta&&!f.text) continue;
    if(delta){ track(f.id).bars.push({at:t,from:before,to:f.hp}); track(f.id).lastHit=t; }
    pops.push({at:t,q:f.q,r:f.r,delta,text:f.text,cls:f.cls});
    t+=MISSION_FX.pop;
  }
  for(const u of units){
    if(u.offMap) continue;
    if(hp[u.id]!==undefined&&hp[u.id]!==u.hp){
      track(u.id).bars.push({at:t,from:hp[u.id],to:u.hp});
      track(u.id).lastHit=t;
      pops.push({at:t,q:u.q,r:u.r,delta:u.hp-hp[u.id],text:"",cls:""});
    }
    const from=pos[u.id];
    if(from&&(from.q!==u.q||from.r!==u.r)) track(u.id).moves.push({at:t,dur:300,from,to:{q:u.q,r:u.r}});
    if(prev.alive[u.id]&&!u.alive) track(u.id).down=true;
  }
  const k=t>MISSION_FX.max?MISSION_FX.max/t:1,map=$("mission-map");
  map.style.setProperty("--pop-zoom",String(Math.min(1.9,Math.max(1,1/missionView.scale))));
  for(const [id,tr] of tracks){
    const unit=units.find(u=>u.id===id);
    const el=unit&&map.querySelector(`.mission-token[data-unit-id="${CSS.escape(String(id))}"]`);
    if(!el) continue;
    if(tr.moves.length){
      const end=missionHexPixel(unit.q,unit.r);
      const at=c=>{ const p=missionHexPixel(c.q,c.r); return `translate(${p.x-end.x}px,${p.y-end.y}px)`; };
      const last=tr.moves[tr.moves.length-1],T=(last.at+last.dur)*k;
      const frames=[{transform:at(tr.moves[0].from),offset:0}];
      for(const mv of tr.moves) frames.push({transform:at(mv.from),offset:mv.at*k/T},{transform:at(mv.to),offset:(mv.at+mv.dur)*k/T});
      el.animate(frames,{duration:T,easing:"linear"});
    }
    const bar=el.querySelector(".token-hp i");
    if(bar&&tr.bars.length){
      const pct=v=>Math.max(0,Math.min(100,v/unit.pvMax*100))+"%";
      const last=tr.bars[tr.bars.length-1],T=(last.at+MISSION_FX.bar)*k;
      const frames=[{width:pct(tr.bars[0].from),offset:0}];
      for(const b of tr.bars) frames.push({width:pct(b.from),offset:b.at*k/T},{width:pct(b.to),offset:(b.at+MISSION_FX.bar)*k/T});
      bar.animate(frames,{duration:T,easing:"ease-out"});
    }
    for(const b of tr.bars) if(b.to<b.from) el.querySelector(".token-ring")?.animate(
      [{transform:"translateX(0)"},{transform:"translateX(-4px)"},{transform:"translateX(4px)"},{transform:"translateX(0)"}],{duration:240,delay:b.at*k});
    if(tr.down){
      const at=(tr.lastHit??t)*k;
      // Sans glissement en cours, le pion rétrécit aussi (le transform est libre).
      const shrink=tr.moves.length?{}:{transform:"none"};
      el.animate([{opacity:1,filter:"none",...shrink,offset:0},{opacity:1,filter:"none",...shrink,offset:at/(at+450)},
        {opacity:.5,filter:"grayscale(1)",...(tr.moves.length?{}:{transform:"scale(.8)"})}],{duration:at+450});
    }
  }
  for(const p of pops){
    const xy=missionHexPixel(p.q,p.r),pop=document.createElement("div");
    pop.className="mission-pop"+(p.delta<0?" dmg":p.delta>0?" heal":"")+(p.cls?" "+p.cls:"");
    pop.innerHTML=(p.delta?`<b>${p.delta>0?"+":"−"}${Math.abs(p.delta)}</b>`:"")+(p.text?`<small>${esc(p.text)}</small>`:"");
    pop.style.left=xy.x+"px";
    pop.style.top=(xy.y-30)+"px";
    map.appendChild(pop);
    pop.animate([
      {opacity:0,transform:"translate(-50%,8px) scale(.6)"},
      {opacity:1,transform:"translate(-50%,-4px) scale(1.15)",offset:.14},
      {opacity:1,transform:"translate(-50%,-18px) scale(1)",offset:.7},
      {opacity:0,transform:"translate(-50%,-30px) scale(1)"}
    ],{duration:1300,delay:p.at*k,fill:"both",easing:"ease-out"}).finished.then(()=>pop.remove(),()=>{});
  }
}

// Survol : fiche du combattant (PV, arme, état) ; en mode attaque, les chances de chaque arme qui frappera ;
// en mode sort, la réussite du sort ; en mode déplacement, le chemin prévu et les attaques d'opportunité.
// Tout est calculé par les fonctions du moteur, sans jet de dé.
const missionHover={key:null,click:null};
function missionUnitAt(q,r){
  const here=missionUnits().filter(x=>!x.offMap&&!x.raised&&!x.vanished&&x.q===q&&x.r===r);
  return here.find(x=>x.alive)||here[0]||null;
}
function missionAttackPreview(u,target){
  const m=game.mission,e=m.engine;
  if(!u||!target?.alive||target.team===u.team||!["melee","ranged","charge"].includes(m.mode)) return [];
  const charge=m.mode==="charge"?missionChargeIfClear(u,target):null;
  if(m.mode==="charge"&&!charge) return [];
  const dual=e.isDualWielding(u),distance=charge?1:e.axialDistance(u,target);
  const mode=m.mode==="charge"?"melee":m.mode;
  const approach=m.mode==="melee"?missionMeleeApproach(u,target):null;
  const hands=approach?(dual?e.usableHands(u,approach.distance).filter(h=>h.mode==="melee"):[{hand:"main",mode}])
    :dual?(charge?e.usableHands(u,1):missionUsableHands(u,target)):(charge||missionCanAttack(u,target,mode)?[{hand:"main",mode}]:[]);
  const hidden=Boolean(u.camouflaged)&&u.team!==target.team;
  // Aperçu d'« Attaquer à deux mains » : les chances avec l'arme empoignée à deux mains.
  const grip=u.twoHandGrip;
  if(m.mode==="melee"&&m.twoHands) u.twoHandGrip=true;
  try{
    // Altitude : la hauteur de la case d'où il frappera (fin de l'approche, case d'arrivée de la charge).
    const from=approach?approach.path[approach.path.length-1]:charge?charge.destination:u;
    const rows=missionAttackPreviewRows(u,target,hands,{e,charge,distance:approach?approach.distance:distance,hidden,from});
    if(approach&&rows.length) rows[0].approach={steps:approach.path.length,risk:approach.risk};
    return rows;
  }
  finally{ u.twoHandGrip=grip; }
}
function missionAttackPreviewRows(u,target,hands,{e,charge,distance,hidden,from=u}){
  return hands.map(h=>e.withHand(u,h.hand,()=>{
    const item=e.activeWeaponItem(u),weapon=e.weaponTemplate(item);
    const backstab=hidden||Boolean(target.fleeing)||(h.mode==="melee"&&missionEncircled(target));
    const cover=h.mode==="ranged"?missionCoverLevel(u,target,{shot:true}):charge&&h.mode==="melee"?charge.cover:null;
    const heightDiff=missionHeightAt(from.q,from.r)-missionUnitHeight(target);
    const row={weapon:item?.name||weapon?.nom||"Arme",mode:h.mode,backstab,cover,heightDiff,pHit:e.hitProbability(u,target,h.mode,distance,{backstab,cover,heightDiff})};
    if(h.mode==="ranged"&&target.projectileShield) row.pDeflect=Number(target.projectileShield.chance)||0;
    if(target.character?.immunePhysical&&weapon?.degats_type!=="psychique"){ row.immune=true; return row; }
    // Pas de blocage dans le dos, ni s'il a déjà bloqué ce tour (Idan, 2026-11-04).
    const block=e.shieldReady(target,{backstab})?e.blockChance(target):null,cut=Number(weapon?.malus_blocage_pourcentage)||0;
    if(block!==null) row.pBlock=cut?block*(1-cut/100):block;
    row.pCrit=e.criticalChance(u);
    if(weapon?.degats_type==="psychique"){ row.psychic=true; return row; }
    const chargePower=charge&&h.mode==="melee"?charge.travel*(Number(weapon?.bonus_charge_base)||1)*(Number(e.quality(item).multiplicateur_qualite)||1):0;
    const matchups=e.damageMatchups(target,weapon,{backstab});
    const wounds=(matchups.length?matchups:[null]).map(x=>e.woundProbability(u,target,h.mode,x,{chargePower}));
    row.pWound=[Math.min(...wounds),Math.max(...wounds)];
    if(h.mode==="melee"&&matchups.some(x=>x.type==="tranchant")) row.pParry=e.parryChance(target,"tranchant");
    row.damage=[e.physicalDamage(u,target,h.mode,chargePower,{roll:"min",resistanceRoll:3}).damage,
      e.physicalDamage(u,target,h.mode,chargePower,{roll:"max",resistanceRoll:1}).damage];
    return row;
  }));
}
function missionOdds(p){ return `<dd class="odds-${p>=65?"good":p>=35?"mid":"bad"}">${Math.round(p)} %</dd>`; }
function renderMissionHoverCard(q,r){
  const m=game.mission,e=m.engine,u=missionActiveUnit(),unit=missionUnitAt(q,r);
  const key=missionKey(q,r),targets=targetableMissionCells();
  let html="";
  if(unit){
    const weapon=e.activeWeaponItem(unit);
    const up=unit.alive;
    const tags=[unit.summon&&"Invocation",unit.character.undead&&"Mort-vivant",up&&unit.camouflaged&&"Camouflé",up&&unit.sentinel&&"En sentinelle",up&&unit.fleeing&&"En fuite",
      up&&missionEncircled(unit)&&"Encerclé",up&&unit.poisoned&&"Empoisonné",up&&unit.weaponPoison&&"Arme empoisonnée",up&&unit.prone&&"Au sol",!up&&"Hors combat"].filter(Boolean);
    html+=`<strong>${esc(unit.character.name)}</strong><span class="hc-sub">${Math.max(0,unit.hp)} / ${unit.pvMax} PV · ${esc(weapon?.name||"Sans arme")}</span>`
      +(tags.length?`<span class="hc-tags">${tags.join(" · ")}</span>`:"");
    for(const row of missionAttackPreview(u,unit)){
      html+=`<div class="hc-attack"><em>${esc(row.weapon)} · ${row.mode==="ranged"?"tir":m.mode==="charge"?"charge":m.twoHands?"à deux mains":"corps à corps"}${row.backstab?" · dans le dos":""}</em><dl>`
        +(row.approach?`<dt>Approche</dt><dd>${row.approach.steps} case${row.approach.steps>1?"s":""}</dd>`
          +(row.approach.risk?`<dt>Danger</dt><dd class="odds-bad">${row.approach.risk} attaque${row.approach.risk>1?"s":""} d’opportunité</dd>`:""):"")
        +(row.pDeflect?`<dt>Déviation</dt>${missionOdds(row.pDeflect)}`:"")
        +(row.cover?`<dt>Couverture</dt><dd>${row.cover}</dd>`:"")
        +(row.heightDiff?`<dt>Hauteur</dt><dd>${row.heightDiff>0?"d’en haut":"vers le haut"}${Math.abs(row.heightDiff)>1?` (${Math.abs(row.heightDiff)} niveaux)`:""}</dd>`:"")
        +`<dt>Toucher</dt>${missionOdds(row.pHit)}`
        +(row.immune?`<dt>Immunisé</dt><dd class="odds-bad">dégâts physiques</dd>`:"")
        +(row.pBlock!==undefined?`<dt>Bouclier</dt><dd>${Math.round(row.pBlock)} % de blocage</dd>`:"")
        +(row.pParry?`<dt>Saï</dt><dd>${Math.round(row.pParry)} % de parade</dd>`:"")
        +(row.pWound?`<dt>Blesser</dt>${row.pWound[0]===row.pWound[1]?missionOdds(row.pWound[0]):`<dd>${Math.round(row.pWound[0])}–${Math.round(row.pWound[1])} %</dd>`}`:"")
        +(row.damage?`<dt>Dégâts</dt><dd class="hc-dmg">${row.damage[0]}–${row.damage[1]} PV</dd>`:"")
        +(row.psychic?`<dt>Dégâts</dt><dd>psychiques</dd>`:"")
        +(row.pCrit!==undefined?`<dt>Critique</dt><dd>${missionPercent(row.pCrit)}</dd>`:"")
        +`</dl></div>`;
    }
  }
  const spellCode=missionSpellMode(),magic=missionMagic();
  if(u&&spellCode&&magic&&targets.has(key)){
    const spell=magic.spell(spellCode);
    html+=`<div class="hc-attack hc-spell"><em>${esc(spell?.nom||"Sort")}</em><dl>${missionSpellPreviewRows(u,spellCode,q,r)}</dl></div>`;
  }
  if(u&&m.mode==="move"&&targets.has(key)){
    const path=shortestMissionPath(u,{q,r},u)||[],risk=missionPathOpportunityCount(u,path);
    html+=`<div class="hc-attack"><em>Déplacement</em><dl><dt>Mouvement</dt><dd>${missionPathCost(path,u)} / ${u.movementRemaining}</dd>`
      +(risk?`<dt>Danger</dt><dd class="odds-bad">${risk} attaque${risk>1?"s":""} d’opportunité</dd>`:"")
      +(missionMireAt(q,r)?`<dt>Bourbier</dt><dd class="odds-bad">arrêt</dd>`:"")+`</dl></div>`;
  }
  return html;
}
// Aperçu d'un sort (Idan, 2026-11-04 : « Faut bosser les aperçus pour les sorts également (% chance de toucher, dégâts…) ») :
// la réussite et le coût ; la chance de toucher (un trait) ou la précision (une zone qui peut dévier) ; les dégâts, les soins
// ou le mana de tant à tant (dés au plus bas, dés au plus haut), sur la cible survolée : après sa protection élémentaire, selon
// sa Volonté (psychique), avec la chance de blesser d'un sort physique ; le bonus ; la zone ; la durée. Sans jet de dé.
const MISSION_SPELL_HEALS=new Set(["soin","soin_de_zone","soin_sur_duree","transfert_pv"]);
const MISSION_SPELL_MANA=new Set(["rend_mana","siphon_mana","pacte_de_sang"]);
const MISSION_SPELL_PER_TURN=new Set(["soin_sur_duree","degats_sur_duree","blizzard","tempete","mur_de_flammes","aura_de_feu","malediction"]);
function missionSpellPreviewRows(u,code,q,r){
  const magic=missionMagic(),e=game.mission.engine,s=magic.spell(code);
  if(!s) return "";
  const unit=missionUnits().find(x=>x.alive&&!x.offMap&&x.q===q&&x.r===r)||null;
  const target=s.cible==="soi"?u:unit,foe=target&&target.team!==u.team?target:null;
  const rows=[`<dt>Réussite</dt>${missionOdds(magic.castChance(u,code).p)}`,`<dt>Coût</dt><dd>${magic.manaCost(u,code)} mana</dd>`];
  if(s.toucher==="distance"&&foe){
    const cover=missionCoverLevel(u,foe,{shot:true}),heightDiff=missionUnitHeight(u)-missionUnitHeight(foe);
    if(cover) rows.push(`<dt>Couverture</dt><dd>${cover}</dd>`);
    rows.push(`<dt>Toucher</dt>${missionOdds(magic.hitChance(u,foe,code,{cover,heightDiff}))}`);
  }
  if(s.deviation_max) rows.push(`<dt>Précision</dt>${missionOdds(magic.precisionChance(u,code,e.axialDistance(u,{q,r})))}`);
  const range=magic.effectRange(u,code);
  if(range.max>0){
    const heal=MISSION_SPELL_HEALS.has(s.effet),mana=MISSION_SPELL_MANA.has(s.effet);
    let {min,max}=range,extra="";
    if(!heal&&!mana&&foe){
      const physical=["contondant","tranchant","perforant"].includes(s.degats_type);
      if(physical){
        // L'étape Blesser, puis la Résistance physique ; un immunisé ne subit rien.
        if(foe.character?.immunePhysical){ extra=`<dt>Immunisé</dt><dd class="odds-bad">dégâts physiques</dd>`;min=0;max=0; }
        else{
          const w=e.spellWoundChance(u,foe,{type:s.degats_type,power:Number(s.puissance)||0,mastery:magic.mastery(u,code)});
          extra=`<dt>Blesser</dt>${missionOdds(w.pWound)}`;
          min=e.spellPhysicalDamage(foe,min,3).damage;max=e.spellPhysicalDamage(foe,max,1).damage;
        }
      }else if(s.degats_type==="psychique"){
        const k=magic.willFactor(u,foe);
        min=Math.ceil(min*k-1e-9);max=Math.ceil(max*k-1e-9);
      }else if(s.element&&s.effet!=="arme_elementaire"){
        min=e.elementalDamage(foe,s.element,min).damage;max=e.elementalDamage(foe,s.element,max).damage;
      }
    }
    const label=s.effet==="arme_elementaire"?"Par coup":heal?"Soins":mana?"Mana":"Dégâts";
    rows.push(extra+`<dt>${label}${MISSION_SPELL_PER_TURN.has(s.effet)?" / tour":""}</dt><dd>${min===max?min:min+"–"+max}${mana?"":" PV"}</dd>`);
  }
  if(s.bonus_base!=null){
    const b=Number(magic.bonus(u,code))||0,stats=magic.targetStats(code),sign=s.effet==="malus_caracteristiques"?"−":"+";
    rows.push(`<dt>${esc(stats.length?stats.join(", "):"Bonus")}</dt><dd>${sign}${fmt(b)}</dd>`);
  }
  const length=s.zone_forme?magic.zoneLength(u,code):0;
  const zone=s.zone_forme==="mur"?"mur de "+length:s.zone_forme==="cone"?"cône de "+length:s.zone_forme==="ligne"?"ligne de "+length
    :s.zone_rayon_base!=null?"rayon "+magic.zoneRadius(u,code):"";
  if(zone) rows.push(`<dt>Zone</dt><dd>${zone}${s.zone_anneau_min?" (anneau)":""}</dd>`);
  if(s.duree_base!=null){ const t=Number(magic.duration(u,code))||0; rows.push(`<dt>Durée</dt><dd>${t} tour${t>1?"s":""}</dd>`); }
  return rows.join("");
}
function clearMissionPath(){
  for(const cell of document.querySelectorAll("#mission-map .hex-cell.path")){ cell.classList.remove("path","path-end"); delete cell.dataset.step; }
  for(const cell of document.querySelectorAll("#mission-map .hex-cell.aoe")) cell.classList.remove("aoe");
}
const missionHexCell=c=>document.querySelector(`#mission-map .hex-cell[data-hex-q="${c.q}"][data-hex-r="${c.r}"]`);
function showMissionHover(q,r){
  const m=game.mission,u=missionActiveUnit(),key=missionKey(q,r);
  if(!m||missionHover.key===key) return;
  missionHover.key=key;
  clearMissionPath();
  // Attaquer en se déplaçant : le chemin jusqu'à la case d'où il frappera ; la charge : sa ligne droite.
  const hovered=m.mode==="melee"||m.mode==="charge"?missionUnits().find(x=>x.alive&&x.q===q&&x.r===r):null;
  const route=!hovered||!u||hovered.team===u.team?null:m.mode==="melee"?missionMeleeApproach(u,hovered)?.path:missionChargeIfClear(u,hovered)?.path;
  if(route) route.forEach((c,i)=>{
    const cell=missionHexCell(c);
    if(!cell) return;
    cell.classList.add("path");
    if(i===route.length-1){ cell.classList.add("path-end"); cell.dataset.step=String(route.length); }
  });
  // Un sort de zone : la zone qu'il toucherait, au survol d'une case qu'il peut viser.
  const spellCode=missionSpellMode();
  if(u&&spellCode&&targetableMissionCells().has(key)) for(const c of missionSpellAreaCells(u,spellCode,{q,r})) missionHexCell(c)?.classList.add("aoe");
  if(u&&m.mode==="move"&&targetableMissionCells().has(key)){
    const path=shortestMissionPath(u,{q,r},u)||[];
    path.forEach((c,i)=>{
      const cell=document.querySelector(`#mission-map .hex-cell[data-hex-q="${c.q}"][data-hex-r="${c.r}"]`);
      if(!cell) return;
      cell.classList.add("path");
      if(i===path.length-1){ cell.classList.add("path-end"); cell.dataset.step=String(path.length); }
    });
  }
  const card=$("mission-hover-card"),html=renderMissionHoverCard(q,r);
  card.classList.toggle("hidden",!html);
  if(!html) return;
  card.innerHTML=html;
  const p=missionHexPixel(q,r),s=missionView.scale,{w,h}=missionStageSize();
  const cw=card.offsetWidth,ch=card.offsetHeight,cx=missionView.x+p.x*s,cy=missionView.y+p.y*s;
  let x=cx+30*s+12;
  if(x+cw>w-8) x=cx-30*s-12-cw;
  card.style.left=Math.max(8,x)+"px";
  card.style.top=Math.min(Math.max(8,cy-ch/2),Math.max(8,h-ch-8))+"px";
}
function hideMissionHover(){
  missionHover.key=null;
  clearMissionPath();
  $("mission-hover-card").classList.add("hidden");
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
  $("mission-two-hands-btn").addEventListener("click",()=>setMissionMode("melee",{twoHands:true}));
  $("mission-charge-btn").addEventListener("click",()=>setMissionMode("charge"));
  $("mission-ranged-btn").addEventListener("click",()=>setMissionMode("ranged"));
  $("mission-sentinel-btn").addEventListener("click",standMissionSentinel);
  $("mission-switch-btn").addEventListener("click",switchMissionWeapon);
  $("mission-reload-btn").addEventListener("click",reloadMissionWeapon);
  $("mission-second-move-btn").addEventListener("click",missionSecondMove);
  window.addEventListener("resize",()=>{ if(game.mission) renderMission(); });
  $("mission-end-activation-btn").addEventListener("click",endMissionActivation);
  $("mission-auto-btn").addEventListener("click",autoResolveMission);
  $("mission-speed-btn")?.addEventListener("click",()=>{ game.missionFast=!game.missionFast; renderMission(); });
  $("mission-test-spells-btn").addEventListener("click",teachMissionTestSpells);
  $("mission-spells").addEventListener("click",event=>{
    const potion=event.target.closest("[data-potion]");
    if(potion){
      if(!potion.disabled&&useMissionPotion(missionActiveUnit(),potion.dataset.potion)) renderMission();
      return;
    }
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
    missionHover.click={x:event.clientX,y:event.clientY};
    const cell=event.target.closest("[data-hex-q]");
    if(cell) handleMissionHexClick(Number(cell.dataset.hexQ),Number(cell.dataset.hexR));
  });
  initializeMissionMapView();
}

function missionUnitById(id){ return missionUnits().find(unit=>String(unit.id)===String(id))||null; }

function initializeMissionMapView(){
  const stage=$("mission-map").parentElement;
  // La place du plateau change (tiroirs, barre de sorts, fenêtre) : une carte encore cadrée se recadre.
  if(typeof ResizeObserver!=="undefined") new ResizeObserver(()=>{
    if(!game.mission||!missionView.fitted) return;
    fitMissionView();
    applyMissionView();
  }).observe(stage);
  stage.addEventListener("wheel",event=>{
    if(!game.mission) return;
    event.preventDefault();
    hideMissionHover();
    const box=stage.getBoundingClientRect();
    zoomMissionView(event.deltaY<0?1.12:1/1.12,event.clientX-box.left,event.clientY-box.top);
  },{passive:false});
  $("mission-map").addEventListener("mouseover",event=>{
    if(!game.mission||missionView.drag) return;
    // Juste après un clic, la carte redessinée ne rouvre pas la fiche tant que la souris n'a pas bougé.
    const click=missionHover.click;
    if(click&&Math.hypot(event.clientX-click.x,event.clientY-click.y)<4) return;
    missionHover.click=null;
    const cell=event.target.closest("[data-hex-q]");
    if(cell) showMissionHover(Number(cell.dataset.hexQ),Number(cell.dataset.hexR));
  });
  stage.addEventListener("mouseleave",hideMissionHover);
  // Glisser pour déplacer la carte ; au-delà de 6 px, le clic qui suit ne compte pas sur une case.
  stage.addEventListener("pointerdown",event=>{
    if(event.button!==0&&event.button!==1) return;
    missionView.drag={x:event.clientX,y:event.clientY,vx:missionView.x,vy:missionView.y};
    missionView.dragged=false;
  });
  window.addEventListener("pointermove",event=>{
    const drag=missionView.drag;
    if(!drag) return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!missionView.dragged&&Math.hypot(dx,dy)<6) return;
    if(!missionView.dragged) hideMissionHover();
    missionView.dragged=true;
    stage.classList.add("dragging");
    missionView.x=drag.vx+dx;
    missionView.y=drag.vy+dy;
    missionView.fitted=false;
    clampMissionView();
    applyMissionView();
  });
  const release=()=>{ if(!missionView.drag) return; missionView.drag=null; stage.classList.remove("dragging"); };
  window.addEventListener("pointerup",release);
  window.addEventListener("pointercancel",release);
  stage.addEventListener("click",event=>{
    if(!missionView.dragged) return;
    missionView.dragged=false;
    event.stopPropagation();
    event.preventDefault();
  },true);

  $("mission-zoom-in-btn").addEventListener("click",()=>zoomMissionView(MISSION_ZOOM.step));
  $("mission-zoom-out-btn").addEventListener("click",()=>zoomMissionView(1/MISSION_ZOOM.step));
  $("mission-zoom-fit-btn").addEventListener("click",()=>{ fitMissionView(); applyMissionView(); });
  for(const toggle of document.querySelectorAll("[data-mission-drawer]")){
    toggle.addEventListener("click",()=>{
      const name=toggle.dataset.missionDrawer;
      setMissionDrawer(name,!missionDrawerState()[name]);
    });
  }
  // Un portrait (équipes ou ordre d'activation) centre la carte sur ce combattant.
  const focusUnit=event=>{
    const row=event.target.closest("[data-unit-id]");
    const unit=row&&game.mission?missionUnitById(row.dataset.unitId):null;
    if(!unit||unit.offMap) return;
    centerMissionView(unit);
    applyMissionView();
  };
  $("mission-roster-drawer").addEventListener("click",focusUnit);
  $("mission-initiative").addEventListener("click",focusUnit);
  $("mission-spells").addEventListener("click",event=>{
    const tab=event.target.closest("[data-spell-school]");
    if(!tab||!game.mission) return;
    game.mission.spellSchool=tab.dataset.spellSchool;
    renderMission();
  });
}
