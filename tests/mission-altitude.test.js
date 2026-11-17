"use strict";

// Altitude en combat, étape 2 du décor (Idan, 2026-11-06 : « vas-y pour l'altitude ») : une hauteur de 0 à 3 par case ;
// monter d'un niveau coûte +1 point de mouvement, descendre est gratuit ; deux niveaux d'écart entre deux cases voisines,
// c'est une falaise ; +10 au Toucher par niveau quand on attaque d'en haut, −10 vers le haut, au tir comme au corps à
// corps ; une colline plus haute que le tireur et sa cible coupe la vue ; d'au moins un niveau plus haut, un tir passe
// par-dessus la couverture partielle ; pas de charge qui monte de plus d'un niveau.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const Progression=require("../game-core/progression.js");
const MissionEnd=require("../game-core/mission-end.js");
const Magic=require("../game-core/magic.js");
require("../game-core/regeneration.js"); // MercenairesRegeneration, lue par l'écran de combat

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const files={
  peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",
  ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",
  cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",
  d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",
  characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",
  baseArmors:"base-armors.json",itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",
  startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",
  alignmentGeneration:"alignment-generation.json",spells:"spells.json",belts:"belts.json",amulets:"amulets.json",
  summonArchetypes:"summon-archetypes.json",terrainDecors:"terrain-decors.json",
  combatCells:"combat-cells.json",combatEdges:"combat-edges.json",terrainSkills:"terrain-skills.json"
};
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,read(file)]));
let seed=47;
const random=()=>(seed=(seed*16807)%2147483647)/2147483647;
Math.random=random;
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});

const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},parentElement:{clientWidth:900},
  classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){}});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const game={campaign:null,captain,referenceData:reference};
const source=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
const EXPOSED="makeMissionUnit,sortMissionInitiative,selectNextMissionPlayer,shortestMissionPath,missionReachablePaths,"
  +"moveMissionUnitAlongPath,missionLineOfSight,missionCoverLevel,missionChargeIfClear,performMissionAttack,missionForcedMove,"
  +"generateMissionRelief,generateMissionDecor,missionHeightAt,missionUnitHeight,missionStepCost,missionPathCost,setMissionMode,"
  +"handleMissionHexClick,missionAttackPreview,missionColumn,missionKey,missionNeighbors,startMissionCamouflage,autoResolveMission,"
  +"missionMagic,missionSpellPreviewRows,resolveMissionSpell";
let api=null;
// Comme à l'écran : le moteur connaît la hauteur de la case de chacun.
const engine=createCombatEngine(reference,{onAttack:Progression.recordAttack,heightOf:u=>api.missionUnitHeight(u)});
api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd",
  "MercenairesMagic",source+"\nreturn {"+EXPOSED+"};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,Magic);

// 1. Les réglages, dans les constantes de formules.
assert.deepEqual(engine.ALTITUDE,{hitPerLevel:10,climbCost:1,cliff:2,max:3});
for(const code of ["hit_per_level","climb_cost","cliff","max"])
  assert.ok(reference.formulaConstants.rows.some(r=>r.code==="combat.altitude."+code),code);

// 2. Le moteur : chaque niveau d'écart vaut 10 au delta du Toucher (la sentinelle en vaut 20 : deux niveaux).
const units=[2,3].map(id=>generator.createMercenary({id,captain}));
const a={character:units[0],activeSet:1,q:0,r:0},b={character:units[1],activeSet:1,q:5,r:0};
assert.equal(engine.hitProbability(a,b,"ranged",5,{heightDiff:2}),engine.hitProbability(a,b,"ranged",5,{sentinel:true}));
const flat=engine.hitProbability(a,b,"melee",1);
assert.ok(engine.hitProbability(a,b,"melee",1,{heightDiff:1})>flat,"d'en haut, au corps à corps aussi");
assert.ok(engine.hitProbability(a,b,"melee",1,{heightDiff:-1})<flat,"vers le haut, moins");
const toDelta=p=>-20*Math.log(80/(p-10)-1);
assert.ok(Math.abs(toDelta(engine.hitProbability(a,b,"melee",1,{heightDiff:-1}))-toDelta(flat)+10)<1e-9,"−10 par niveau");

const at=(unit,q,r)=>{ unit.q=q; unit.r=r; return unit; };
function arm(character,name){
  const item={id:"h-"+name+"-"+character.id,name,itemType:"weapon",slot:"weapon_set_1_main",owner:character.id,qualityCode:"standard"};
  character.items=[...character.items.filter(i=>i.itemType!=="weapon"),item];
  character.equipment={...character.equipment,slots:{...character.equipment.slots,weapon_set_1_main:item.id,weapon_set_1_off:null,
    weapon_set_2_main:null,weapon_set_2_off:null}};
}
// Un archer et un épéiste contre deux épéistes ; le relief et le décor posés à la main.
function newMission(relief=[],decor=[]){
  const squad=[4,5].map(id=>generator.createMercenary({id,captain}));
  const foes=[6,7].map(id=>generator.createMercenary({id,captain}));
  for(const c of [...squad,...foes]){ arm(c,"Épée courte"); c.spells=[]; }
  arm(squad[0],"Arc");
  const players=squad.map((c,i)=>api.makeMissionUnit(c,"player",i));
  const enemies=foes.map((c,i)=>api.makeMissionUnit(c,"enemy",i));
  game.mission={engine,endRules:MissionEnd.createMissionEndRules({reference}),progression:Progression.createProgressionRules({reference}),
    players,enemies,playerOrder:[players[0],players[1]],enemyOrder:api.sortMissionInitiative(enemies,engine),
    activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null,relief,decor};
  api.selectNextMissionPlayer();
  at(players[0],1,4);at(players[1],0,0);at(enemies[0],8,4);at(enemies[1],12,0);
  for(const u of [...players,...enemies]){ u.hp=u.pvMax=100000; }
  return game.mission;
}
const has=(route,c)=>route.some(x=>x.q===c.q&&x.r===c.r);

// 3. Le déplacement : monter coûte +1 par niveau, descendre est gratuit ; une falaise ne se passe ni dans un sens ni dans
// l'autre ; le décor s'ajoute à la montée.
let m=newMission([{q:2,r:4,h:1},{q:3,r:4,h:2},{q:4,r:4,h:1},{q:6,r:4,h:2}]);
let u=m.players[0];
assert.equal(api.missionHeightAt(2,4),1);
assert.equal(api.missionHeightAt(0,0),0,"sans relief : 0");
assert.equal(api.missionStepCost({q:2,r:4},{q:1,r:4}),2,"monter d'un niveau : 1 + 1");
assert.equal(api.missionStepCost({q:1,r:4},{q:2,r:4}),1,"descendre : gratuit");
assert.equal(api.missionStepCost({q:5,r:4},{q:6,r:4}),Infinity,"de 2 à 0 : falaise");
assert.equal(api.missionStepCost({q:6,r:4},{q:5,r:4}),Infinity,"de 0 à 2 : falaise");
assert.equal(api.missionPathCost([{q:2,r:4},{q:3,r:4}],u),4,"deux montées");
assert.equal(api.missionPathCost([{q:2,r:4},{q:3,r:4},{q:4,r:4}],u),5,"puis une descente gratuite");
u.movementRemaining=5;
assert.equal(api.moveMissionUnitAlongPath(u,[{q:2,r:4},{q:3,r:4}]),2);
assert.equal(u.movementRemaining,1,"monter deux niveaux coûte 4");
m=newMission([{q:2,r:4,h:1}],[{q:2,r:4,code:"foret"}]);
assert.equal(api.missionStepCost({q:2,r:4},{q:1,r:4}),2.5,"forêt (1,5) en montée (+1)");
// Le chemin le moins cher contourne la falaise.
m=newMission([{q:2,r:4,h:2}]);
u=m.players[0];
let route=api.shortestMissionPath(u,{q:3,r:4},u);
assert.ok(route&&!has(route,{q:2,r:4}),"pas par la falaise");
u.movementRemaining=2;
const reach=api.missionReachablePaths(u,2);
assert.equal(reach.has("2,4"),false,"une falaise : on n'y monte pas");
// Un clic ne monte pas une pente trop chère.
m=newMission([{q:2,r:4,h:1}]);
u=m.players[0];
u.movementRemaining=1;
u.attackAvailable=false; // sans second mouvement
api.setMissionMode("move");
api.handleMissionHexClick(2,4);
assert.deepEqual([u.q,u.r],[1,4],"il faut 2 points pour monter");
u.movementRemaining=2;
api.setMissionMode("move");
api.handleMissionHexClick(2,4);
assert.deepEqual([u.q,u.r,u.movementRemaining],[2,4,0]);

// 4. Le Toucher en mission : la hauteur des cases, au tir et au corps à corps ; le journal et l'aperçu le disent.
m=newMission([{q:1,r:4,h:2}]);
let [shooter,foe]=[m.players[0],m.enemies[0]];
at(foe,7,4);
const seen=[];
const realResolve=engine.resolveAttack;
engine.resolveAttack=(x,y,o)=>{ const r=realResolve(x,y,o); seen.push(r); return r; };
api.performMissionAttack(shooter,foe,"ranged",engine.axialDistance(shooter,foe));
assert.equal(seen[0].heightDiff,2);
assert.equal(seen[0].pHit,engine.hitProbability(shooter,foe,"ranged",seen[0].distance,{heightDiff:2}));
assert.ok(m.log.some(x=>/\(d’en haut\)/.test(x.message)),"le journal le dit");
api.setMissionMode("ranged");
const preview=api.missionAttackPreview(shooter,foe)[0];
assert.equal(preview.heightDiff,2);
// Le premier tir a pu le faire fuir : l'aperçu compte alors le dos tourné, comme le tir.
assert.equal(preview.pHit,engine.hitProbability(shooter,foe,"ranged",engine.axialDistance(shooter,foe),{heightDiff:2,backstab:preview.backstab}));
// Vers le haut, au corps à corps.
seen.length=0;
const blade=at(m.players[1],2,4);
at(foe,1,4);at(shooter,0,0);
m.relief=[{q:1,r:4,h:1}];
api.performMissionAttack(blade,foe,"melee",1);
assert.equal(seen[0].heightDiff,-1);
assert.ok(m.log.some(x=>/\(vers le haut\)/.test(x.message)));
engine.resolveAttack=realResolve;

// 5. La vue : une colline plus haute que le tireur et sa cible coupe la vue ; plus haut, on voit par-dessus ; un décor
// qui bloque la vue (forêt) ajoute un niveau à sa case.
m=newMission([{q:4,r:4,h:1}]);
[shooter,foe]=[m.players[0],m.enemies[0]];
at(foe,7,4);
assert.equal(api.missionLineOfSight(shooter,foe),false,"la colline coupe la vue");
m.relief=[{q:4,r:4,h:1},{q:1,r:4,h:1}];
assert.equal(api.missionLineOfSight(shooter,foe),true,"à sa hauteur, le tireur voit par-dessus");
m.relief=[{q:4,r:4,h:1},{q:7,r:4,h:1}];
assert.equal(api.missionLineOfSight(shooter,foe),true,"une cible en hauteur se voit aussi");
m.relief=[];
m.decor=[{q:4,r:4,code:"foret"}];
assert.equal(api.missionLineOfSight(shooter,foe),false,"sur le plat, la forêt cache la cible");
m.relief=[{q:1,r:4,h:1}];
assert.equal(api.missionLineOfSight(shooter,foe),true,"d'un niveau plus haut, on voit par-dessus la forêt (0 + 1)");
m.relief=[{q:1,r:4,h:1},{q:4,r:4,h:1}];
assert.equal(api.missionLineOfSight(shooter,foe),false,"une forêt sur la colline (1 + 1) cache encore la cible");

// 6. La couverture : d'au moins un niveau plus haut, un tir passe par-dessus la couverture partielle, pas la totale ; au
// corps à corps et pour le repérage, rien ne change.
m=newMission([],[{q:7,r:4,code:"buissons"}]);
[shooter,foe]=[m.players[0],m.enemies[0]];
at(foe,7,4);
assert.equal(api.missionCoverLevel(shooter,foe,{shot:true}),"partielle");
m.relief=[{q:1,r:4,h:1}];
assert.equal(api.missionCoverLevel(shooter,foe,{shot:true}),null,"d'en haut, par-dessus les buissons");
assert.equal(api.missionCoverLevel(shooter,foe),"partielle","hors tir (repérage), les buissons comptent");
m.decor=[{q:6,r:4,code:"gros_rocher"}];
assert.equal(api.missionCoverLevel(shooter,foe,{shot:true}),"totale","le gros rocher protège toujours");
m.relief=[{q:1,r:4,h:1},{q:7,r:4,h:1}];
m.decor=[{q:7,r:4,code:"buissons"}];
assert.equal(api.missionCoverLevel(shooter,foe,{shot:true}),"partielle","à la même hauteur, la couverture compte");
// Les sorts qui volent : la hauteur et la couverture vue d'en haut.
m=newMission([{q:1,r:4,h:1}],[{q:7,r:4,code:"buissons"}]);
const mage=m.players[0],prey=at(m.enemies[0],7,4);
mage.character.spells=[{code:"fire_bolt",mastery:40}];
const magic=api.missionMagic();
assert.match(api.missionSpellPreviewRows(mage,"fire_bolt",prey.q,prey.r),/<dt>Toucher<\/dt>/);
assert.doesNotMatch(api.missionSpellPreviewRows(mage,"fire_bolt",prey.q,prey.r),/Couverture/,"d'en haut, pas de couverture partielle");
assert.ok(magic.hitChance(mage,prey,"fire_bolt",{heightDiff:1})>magic.hitChance(mage,prey,"fire_bolt"));
const realCast=magic.cast,casts=[];
magic.cast=(c,t,code,o)=>{ casts.push(o); return realCast(c,t,code,o); };
api.resolveMissionSpell(mage,prey,"fire_bolt");
magic.cast=realCast;
assert.equal(casts[0]?.heightDiff,1,"le sort part d'un niveau plus haut");
assert.equal(casts[0]?.cover,null);

// 7. La charge : pas de falaise sur la ligne, et elle ne monte pas de plus d'un niveau ; la descente ne gêne pas.
m=newMission();
const charger=at(m.players[1],1,4);
foe=m.enemies[0];
at(foe,1+engine.movementBase(charger)+1,4);
assert.ok(api.missionChargeIfClear(charger,foe),"sur le plat");
m.relief=[{q:3,r:4,h:1}];
assert.ok(api.missionChargeIfClear(charger,foe),"une montée d'un niveau");
m.relief=[{q:3,r:4,h:1},{q:4,r:4,h:2},{q:5,r:4,h:2},{q:6,r:4,h:2},{q:7,r:4,h:2},{q:8,r:4,h:2},{q:9,r:4,h:2}];
assert.equal(api.missionChargeIfClear(charger,foe),null,"deux niveaux de montée : pas de charge");
m.relief=[{q:1,r:4,h:2},{q:2,r:4,h:1}];
assert.ok(api.missionChargeIfClear(charger,foe),"la descente, oui");
m.relief=[{q:1,r:4,h:2}];
assert.equal(api.missionChargeIfClear(charger,foe),null,"pas en sautant d'une falaise");

// 8. Un déplacement forcé s'arrête au pied d'une falaise.
m=newMission([{q:4,r:4,h:2}]);
const pushed=at(m.enemies[0],3,4);
api.missionForcedMove(pushed,{move:{kind:"repousse",cells:[{q:4,r:4},{q:5,r:4}]}},m.players[0]);
assert.deepEqual([pushed.q,pushed.r],[3,4]);
assert.ok(m.log.some(x=>/heurte aussitôt la falaise/.test(x.message)));

// 9. La Mission Test : 1 à 3 collines entre les lignes de déploiement, de 1 à 3 niveaux, jamais de falaise.
m=newMission();
for(let i=0;i<30;i++){
  const relief=api.generateMissionRelief();
  assert.ok(relief.length>0);
  m.relief=relief;
  const tops=relief.filter(c=>c.h===Math.max(...relief.map(x=>x.h)));
  for(const c of relief){
    assert.ok(Number.isInteger(c.h)&&c.h>=1&&c.h<=3);
    for(const n of api.missionNeighbors(c)) assert.ok(Math.abs(api.missionHeightAt(n.q,n.r)-c.h)<=1,"pas de falaise au hasard");
  }
  for(const t of tops){ const col=api.missionColumn(t.q,t.r); assert.ok(col>2&&col<10,"sommet entre les lignes de déploiement"); }
}
assert.match(source,/game\.mission\.relief=generateMissionRelief\(\);/);
assert.equal((source.match(/heightOf:missionUnitHeight/g)||[]).length,6,"les six écrans de combat (Mission Test, contrat, duel, cave, mutinerie, voleurs de l'usurier) donnent la hauteur au moteur");
// L'affichage : une couche par niveau, avec son chiffre ; la case dit son altitude.
const css=fs.readFileSync(path.join(ROOT,"prototype-web","styles.css"),"utf8");
assert.match(css,/\.hex-relief\{/);
assert.match(css,/\.hex-relief\[data-level="3"\]/);
assert.match(css,/\.hex-relief::after\{content:attr\(data-level\)/);
assert.match(source,/"altitude "\+level/);

// 10. Les combats automatiques finissent toujours, avec relief et décor : 200 Mission Test au hasard.
let stuck=0;
for(let k=0;k<200;k++){
  const squad=[1,2,3].map(i=>generator.createMercenary({id:5000+10*k+i,captain}));
  const foes=[4,5,6].map(i=>generator.createMercenary({id:5000+10*k+i,captain}));
  const players=squad.map((c,i)=>api.makeMissionUnit(c,"player",i)),enemies=foes.map((c,i)=>api.makeMissionUnit(c,"enemy",i));
  game.mission={engine,endRules:MissionEnd.createMissionEndRules({reference}),progression:Progression.createProgressionRules({reference}),
    players,enemies,playerOrder:api.sortMissionInitiative(players,engine),enemyOrder:api.sortMissionInitiative(enemies,engine),
    activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null};
  game.mission.relief=api.generateMissionRelief();
  game.mission.decor=api.generateMissionDecor();
  api.startMissionCamouflage();
  api.selectNextMissionPlayer();
  api.autoResolveMission();
  if(!game.mission.over) stuck++;
}
assert.equal(stuck,0,"combats bloqués : "+stuck);
console.log("Altitude : montée, falaises, Toucher ±10 (tir, CAC, sorts), vue, couverture d'en haut, charge, déplacement forcé, Mission Test — OK");
