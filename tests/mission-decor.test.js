"use strict";

// Décor en combat, étape 1 (Idan, 2026-11-06) : « Franchissable / infranchissable. Couverture : sans / partiel / totale » ;
// « je distinguerais ligne de vue et couverture. Le mec est derrière un gros rocher, on le voit, on peut le viser, mais il
// est protégé. Derrière une forêt, on voit pas » ; « vitesse réduite : mouvement à moitié / tiers / quart » ; couverture
// « au tir et en défense de charge » ; dans la forêt, vu seulement au contact ; la charge traverse un décor lent, « mais on
// augmente la proba d'échec critique, pieds dans le tapis » ; « des couleurs pour commencer ».
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
let seed=31,forced=null;
// forced : un tirage imposé (le moteur garde cette fonction de hasard).
const random=()=>forced??((seed=(seed*16807)%2147483647)/2147483647);
Math.random=random;
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});

// 1. Les données : trois réglages par décor, et le jeu charge la table.
const decors=reference.terrainDecors;
assert.equal(decors.row_count,decors.rows.length);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8"),/terrainDecors: "terrain-decors\.json"/);
for(const d of decors.rows){
  assert.ok([1,2,3,4,null].includes(d.cout_mouvement),d.code);
  assert.equal(typeof d.bloque_vue,"boolean",d.code);
  assert.ok(["sans","partielle","totale"].includes(d.couverture),d.code);
  assert.match(d.couleur,/^#[0-9a-f]{6}$/i,d.code);
  assert.ok(d.nom&&d.article,d.code);
}
const row=code=>decors.rows.find(d=>d.code===code);
assert.deepEqual(["foret","gros_rocher","mur","marais","buissons"].map(c=>[row(c).cout_mouvement,row(c).bloque_vue,row(c).couverture]),
  [[2,true,"partielle"],[null,false,"totale"],[null,true,"totale"],[3,false,"sans"],[2,false,"partielle"]]);

const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},parentElement:{clientWidth:900},
  classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){}});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const game={campaign:null,captain,referenceData:reference};
let api=null;
const engine=createCombatEngine(reference,{onAttack:Progression.recordAttack,gridMap:()=>api?.missionGridMap()});
const source=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
const EXPOSED="makeMissionUnit,sortMissionInitiative,selectNextMissionPlayer,shortestMissionPath,missionReachablePaths,"
  +"moveMissionUnitAlongPath,missionLineOfSight,missionChargeIfClear,missionChargeCheck,performMissionAttack,missionForcedMove,"
  +"generateMissionDecor,missionCellLabel,missionCellFree,handleMissionHexClick,setMissionMode,resolveMissionDetection,"
  +"missionTerrainDodge,missionGridMap,missionCanAttack,missionAttackPreview,missionColumn,missionKey,startMissionCamouflage,autoResolveMission,enemyMissionAct,resolveMissionSpell,"
  +"missionMagic,missionSpellPreviewRows,targetableMissionCells,renderMission,missionActionAvailability";
api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd",
  "MercenairesMagic",source+"\nreturn {"+EXPOSED+"};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,Magic);

// 2. Le moteur : l'Esquive du terrain (grille carrée, doc 04 ; Idan, 2026-11-17 : « On vire tout le système de
// couverture ») s'ajoute à celle de la cible dans la formule du toucher, jamais sous 10 % ; la chute de charge augmente
// avec les pas lents.
const units=[2,3].map(id=>generator.createMercenary({id,captain}));
const a={character:units[0],activeSet:1,q:0,r:0},b={character:units[1],activeSet:1,q:5,r:0};
const plain=engine.hitProbability(a,b,"ranged",5);
const logit=p=>-20*Math.log(80/(p-10)-1);
const shifted=d=>10+80/(1+Math.exp(-(logit(plain)-d)/20));
assert.ok(plain>10&&plain<90,"un tir ni sûr ni impossible");
assert.ok(Math.abs(engine.hitProbability(a,b,"ranged",5,{terrainDodge:30})-shifted(30))<1e-9,"+30 d'Esquive, comme 30 points d'Esquive en plus");
assert.ok(Math.abs(engine.hitProbability(a,b,"ranged",5,{terrainDodge:500})-10)<1e-9,"jamais sous 10 %");
assert.ok(engine.hitProbability(a,b,"ranged",5,{terrainDodge:-20})>plain,"une Esquive négative (la neige) aide le tireur");
assert.equal(engine.COVER,undefined,"plus de couverture");
assert.deepEqual([engine.CHARGE_FALL.base,engine.CHARGE_FALL.perSlowStep],[2,5]);

const at=(unit,q,r)=>{ unit.q=q; unit.r=r; return unit; };
function arm(character,name){
  const item={id:"d-"+name+"-"+character.id,name,itemType:"weapon",slot:"weapon_set_1_main",owner:character.id,qualityCode:"standard"};
  character.items=[...character.items.filter(i=>i.itemType!=="weapon"),item];
  character.equipment={...character.equipment,slots:{...character.equipment.slots,weapon_set_1_main:item.id,weapon_set_1_off:null,
    weapon_set_2_main:null,weapon_set_2_off:null}};
}
// Un archer et un épéiste contre deux épéistes ; la carte vide, puis le décor posé à la main.
function newMission(decor=[]){
  const squad=[4,5].map(id=>generator.createMercenary({id,captain}));
  const foes=[6,7].map(id=>generator.createMercenary({id,captain}));
  for(const c of [...squad,...foes]){ arm(c,"Épée courte"); c.spells=[]; }
  arm(squad[0],"Arc");
  const players=squad.map((c,i)=>api.makeMissionUnit(c,"player",i));
  const enemies=foes.map((c,i)=>api.makeMissionUnit(c,"enemy",i));
  game.mission={engine,endRules:MissionEnd.createMissionEndRules({reference}),progression:Progression.createProgressionRules({reference}),
    players,enemies,playerOrder:[players[0],players[1]],enemyOrder:api.sortMissionInitiative(enemies,engine),
    activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null,decor};
  api.selectNextMissionPlayer();
  at(players[0],1,4);at(players[1],0,0);at(enemies[0],8,4);at(enemies[1],12,0);
  for(const u of [...players,...enemies]){ u.hp=u.pvMax=100000; }
  return game.mission;
}
const key=c=>api.missionKey(c.q,c.r);
const has=(path,c)=>path.some(x=>x.q===c.q&&x.r===c.r);

// 3. Le passage, grille carrée (doc 04, « Étape 1 : les cases » ; Idan, 2026-11-17, V1) : le PM de la case d'arrivée, au
// quart de point (le marais 2, la forêt 1,5) ; un mur (100 PM) ne se traverse pas ; une arête ajoute son malus.
// À travers le marais (2 + 1), ou le détour par l'herbe (4 cases) : le marais.
let m=newMission([{q:2,r:4,code:"marais"}]);
let u=m.players[0];
let route=api.shortestMissionPath(u,{q:3,r:4},u);
assert.equal(has(route,{q:2,r:4}),true,"marais (2 + 1) contre détour (4) : le marais");
assert.equal(route.length,2);
m=newMission([{q:2,r:4,code:"foret"}]);
u=m.players[0];
route=api.shortestMissionPath(u,{q:3,r:4},u);
assert.ok(has(route,{q:2,r:4})&&route.length===2,"forêt (1,5 + 1) contre détour (4) : la forêt");
assert.ok(!api.missionReachablePaths(u,1.25).has("2,4"),"la forêt : 1,5 point pour y entrer");
assert.ok(api.missionReachablePaths(u,1.5).has("2,4"));
u.movementRemaining=5;
assert.equal(api.moveMissionUnitAlongPath(u,[{q:2,r:4}]),1);
assert.equal(u.movementRemaining,3.5,"un pas en forêt coûte 1,5");
m=newMission([{q:2,r:4,code:"mur"}]);
u=m.players[0];
assert.equal(api.shortestMissionPath(u,{q:2,r:4},u),null,"on n'entre pas dans un mur");
assert.equal(has(api.shortestMissionPath(u,{q:3,r:4},u),{q:2,r:4}),false);
assert.equal(api.missionCellFree({q:2,r:4}),false);
// Un muret, une arête (étape 4 : le muret, les caisses, la tombe) : +0,5 pour le franchir, dans les deux sens.
m=newMission([{q:1,r:4,side:0,code:"muret"}]);
u=m.players[0];
u.movementRemaining=5;
assert.equal(api.moveMissionUnitAlongPath(u,[{q:2,r:4}]),1);
assert.equal(u.movementRemaining,3.5,"le muret : 1 + 0,5");
assert.equal(api.moveMissionUnitAlongPath(u,[{q:1,r:4}]),1);
assert.equal(u.movementRemaining,2,"retour par-dessus : encore 1,5");
// Le plancher (0,75) : une case sans décor dessiné, posée par son code.
m=newMission([{q:2,r:4,code:"plancher"},{q:3,r:4,code:"plancher"}]);
u=m.players[0];
u.movementRemaining=1.5;
assert.ok(api.missionReachablePaths(u,1.5).has("3,4"),"deux planchers pour 1,5 point");
// Un clic au-delà du mouvement restant ne bouge pas (son attaque déjà faite : plus de second mouvement).
m=newMission([{q:2,r:4,code:"marais"}]);
u=m.players[0];
u.movementRemaining=1.75;
u.attackAvailable=false;
api.setMissionMode("move");
api.handleMissionHexClick(2,4);
assert.deepEqual([u.q,u.r],[1,4],"le marais coûte 2");
u.movementRemaining=2;
api.setMissionMode("move");
api.handleMissionHexClick(2,4);
assert.deepEqual([u.q,u.r,u.movementRemaining],[2,4,0]);

// 4. La vue, grille carrée : un mur, une montagne, un rocher (une case Mur) ou une forêt coupe la ligne de vue. Dans la
// forêt, on n'est ciblable qu'au contact ; de sa case, on voit dehors (« s'il est à l'orée de la forêt »).
m=newMission([{q:4,r:4,code:"mur"}]);
let [shooter,foe]=[m.players[0],m.enemies[0]];
at(foe,7,4);
assert.equal(api.missionLineOfSight(shooter,foe),false,"derrière un mur");
m=newMission([{q:4,r:4,code:"gros_rocher"}]);
[shooter,foe]=[m.players[0],m.enemies[0]];
at(foe,7,4);
assert.equal(api.missionLineOfSight(shooter,foe),false,"un gros rocher (une case Mur, montagne, rocher) bloque la vue");
m=newMission([{q:4,r:4,code:"foret"}]);
[shooter,foe]=[m.players[0],m.enemies[0]];
at(foe,7,4);
assert.equal(api.missionLineOfSight(shooter,foe),false,"derrière une forêt, on ne voit pas");
at(foe,4,4);
assert.equal(api.missionLineOfSight(shooter,foe),false,"dans la forêt, invisible de loin");
assert.equal(api.missionLineOfSight(foe,shooter),true,"mais lui, à l'orée de la forêt, voit dehors");
at(shooter,3,4);
assert.equal(api.missionLineOfSight(shooter,foe),true,"au contact, on le voit");
m=newMission([{q:4,r:4,code:"foret"},{q:5,r:4,code:"foret"}]);
[shooter,foe]=[at(m.players[0],1,4),at(m.enemies[0],5,4)];
assert.equal(api.missionLineOfSight(foe,shooter),false,"du fond de la forêt, une autre case de forêt cache la vue");
// La ligne qui frôle le coin d'un mur (Idan, 2026-11-14 : « Frôler ne bloque pas ») : de (3,4) à (5,3), elle passe pile entre
// (4,4) et (4,3) ; un mur d'un côté ou de l'autre ne la coupe pas, les deux, si.
for(const [walls,seen,label] of [[[[4,4]],true,"un mur d'un côté"],[[[4,3]],true,"ou de l'autre"],[[[4,4],[4,3]],false,"les deux côtés"]]){
  m=newMission(walls.map(([q,r])=>({q,r,code:"mur"})));
  [shooter,foe]=[at(m.players[0],3,4),at(m.enemies[0],5,3)];
  assert.equal(api.missionLineOfSight(shooter,foe),seen,label);
  assert.equal(api.missionLineOfSight(foe,shooter),seen,label+" : dans les deux sens");
}
// Les arêtes : le muret laisse voir ; la palissade et la meurtrière, un seul sens (du côté défendu vers l'extérieur).
m=newMission([{q:5,r:4,side:2,code:"muret"}]);
[shooter,foe]=[at(m.players[0],1,4),at(m.enemies[0],7,4)];
assert.equal(api.missionLineOfSight(shooter,foe),true,"par-dessus un muret, on voit");
for(const code of ["palissade","muraille_meurtriere"]){
  m=newMission([{q:5,r:4,side:2,code}]);
  [shooter,foe]=[at(m.players[0],1,4),at(m.enemies[0],7,4)];
  assert.equal(api.missionLineOfSight(foe,shooter),true,code+" : de l'intérieur, on voit dehors");
  assert.equal(api.missionLineOfSight(shooter,foe),false,code+" : de l'extérieur, on ne voit pas dedans");
}

// 5. L'Esquive du terrain (doc 04) : celle de la case de la cible et de l'arête qui lui fait face, contre les tirs ; pas
// l'arête collée au tireur (elle le protège, lui) ; pas au corps à corps.
m=newMission([{q:7,r:4,side:2,code:"muret"},{q:1,r:4,side:0,code:"muret"}]);
[shooter,foe]=[m.players[0],m.enemies[0]];
at(foe,7,4);
assert.equal(api.missionTerrainDodge(shooter,foe),30,"derrière le muret : +30");
assert.equal(api.missionTerrainDodge(foe,shooter),30,"le muret collé à l'archer le protège du tir de l'ennemi");
m.decor=[{q:1,r:4,side:0,code:"muret"}];
assert.equal(api.missionTerrainDodge(shooter,foe),0,"mais il ne gêne pas son propre tir");
m.decor=[{q:7,r:4,side:2,code:"muret"}];
at(foe,7,2);
assert.equal(api.missionTerrainDodge(shooter,foe),0,"le muret est resté en (7,4)");
m.decor=[{q:7,r:2,side:2,code:"muret"}];
assert.equal(api.missionTerrainDodge(shooter,foe),30,"de biais, l'arête qui fait face au tireur");
at(foe,7,4);
m.decor=[{q:7,r:4,code:"foret"}];
at(shooter,6,4);
assert.equal(api.missionTerrainDodge(shooter,foe),30,"dans la forêt : +30");
at(shooter,1,4);
m=newMission([{q:7,r:4,side:2,code:"muret"}]);
[shooter,foe]=[m.players[0],m.enemies[0]];
at(foe,7,4);
// Le tir passe l'Esquive du terrain au moteur ; le journal et l'aperçu l'affichent.
const seen=[];
const realResolve=engine.resolveAttack;
engine.resolveAttack=(x,y,o)=>{ const r=realResolve(x,y,o); seen.push({o,r}); return r; };
api.performMissionAttack(shooter,foe,"ranged",engine.axialDistance(shooter,foe));
assert.equal(seen[0].o.terrainDodge,30);
assert.equal(seen[0].r.terrainDodge,30);
assert.equal(seen[0].r.pHit,engine.hitProbability(shooter,foe,"ranged",seen[0].r.distance,{terrainDodge:30}));
assert.ok(m.log.some(x=>/\(Esquive du terrain \+30\)/.test(x.message)),"le journal le dit");
api.setMissionMode("ranged");
assert.equal(api.missionAttackPreview(shooter,foe)[0].terrainDodge,30);
// Au corps à corps (hors charge), pas d'Esquive du terrain.
seen.length=0;
const blade=m.players[1];
at(blade,8,4);
api.performMissionAttack(blade,foe,"melee",1);
assert.equal(seen[0].r.terrainDodge,undefined,"pas au corps à corps");
engine.resolveAttack=realResolve;
// Repérage : qui s'est caché (action « Se cacher » : +10) dans les buissons (végétation souple, « Se cacher » +30) gagne
// +40 de Discrétion ; camouflé sans s'être caché, rien de plus.
m=newMission([{q:7,r:4,code:"buissons"}]);
at(m.enemies[0],7,4);
const realDetect=engine.rollDetection,bonuses=[];
engine.rollDetection=(o,t,d,c)=>{ if(t===m.enemies[0]) bonuses.push(c); return realDetect(o,t,d,c); };
for(const x of [...m.players,...m.enemies]) x.camouflaged=true;
api.resolveMissionDetection();
assert.ok(bonuses.length&&bonuses.every(b=>b===0),"camouflé, sans s'être caché : rien de plus");
bonuses.length=0;
for(const x of [...m.players,...m.enemies]) x.camouflaged=true;
m.enemies[0].hiding=true;
api.resolveMissionDetection();
engine.rollDetection=realDetect;
assert.ok(bonuses.includes(40),"caché dans les buissons : +10 +30");

// 6. La charge : elle traverse un décor lent, avec plus de chute ; pas un décor infranchissable ; l'Esquive du terrain du
// chargé compte double (« Je charge face à la palissade, il a 120 d'esquive ») ; pas de coup à travers une palissade.
m=newMission();
const charger=at(m.players[1],1,4);
foe=m.enemies[0];
const base=engine.movementBase(charger);
at(foe,1+base+1,4);
m.decor=[{q:3,r:4,code:"marais"}];
let charge=api.missionChargeIfClear(charger,foe);
assert.ok(charge,"elle traverse le marais");
assert.equal(charge.slowSteps,1,"un pas dans le marais : 2 − 1");
m.decor=[{q:2,r:4,side:0,code:"muret"}];
charge=api.missionChargeIfClear(charger,foe);
assert.ok(charge,"elle saute un muret (une arête)");
assert.equal(charge.slowSteps,0.5,"le muret : + 0,5");
m.decor=[{q:3,r:4,code:"mur"}];
assert.equal(api.missionChargeIfClear(charger,foe),null,"pas à travers un mur");
// Pourquoi (Idan, 2026-11-14 : « j'arrive pas à charger ») : la raison, montrée au survol en mode charge.
assert.equal(api.missionChargeCheck(charger,foe).reason,"un décor infranchissable sur la ligne (mur)");
m.decor=[];
const archer=m.players[0],home={q:archer.q,r:archer.r};
at(archer,3,4);
assert.equal(api.missionChargeCheck(charger,foe).reason,archer.character.name+" est sur la ligne");
at(archer,home.q,home.r);
at(foe,1+base,4);
assert.equal(api.missionChargeCheck(charger,foe).reason,`trop près : il faut au moins ${base} cases de course (ici ${base-1})`);
at(foe,2,4);
assert.equal(api.missionChargeCheck(charger,foe).reason,"déjà au contact");
at(foe,1+base+1,4);
assert.equal(api.missionChargeCheck(charger,foe).reason,null);
const last=api.missionChargeIfClear((m.decor=[],charger),foe).destination;
m.decor=[{q:last.q,r:last.r,code:"buissons"},{q:last.q,r:last.r,side:0,code:"muret"}];
charge=api.missionChargeIfClear(charger,foe);
assert.equal(charge.dodge,60,"derrière un muret (+30), en charge : double");
assert.equal(charge.slowSteps,0.5,"les buissons (végétation souple) : 1,5 − 1");
m.decor=[{q:last.q,r:last.r,side:0,code:"palissade"}];
assert.equal(api.missionChargeIfClear(charger,foe),null,"pas de charge à travers une palissade");
assert.equal(api.missionChargeCheck(charger,foe).reason,"pas de corps à corps à travers la palissade");
m.decor=[{q:last.q,r:last.r,code:"buissons"},{q:last.q,r:last.r,side:0,code:"muret"}];
charge=api.missionChargeIfClear(charger,foe);
seen.length=0;
engine.resolveAttack=(x,y,o)=>{ const r=realResolve(x,y,o); seen.push({o,r}); return r; };
at(charger,charge.destination.q,charge.destination.r); // au bout de la course
forced=0.03; // D100 = 4 : sous les 2 + 0,5 × 5 % de chute
api.performMissionAttack(charger,foe,"melee",1,charge);
forced=null;
engine.resolveAttack=realResolve;
assert.equal(seen[0].o.chargeSlowSteps,0.5);
assert.equal(seen[0].o.terrainDodge,60);
assert.equal(seen[0].r.chargeFall,true,"pieds dans le tapis");
assert.equal(seen[0].r.pFall,4.5);
assert.ok(m.log.some(x=>/terrain difficile : 5 %, jet 4/.test(x.message)));

// 7. Un déplacement forcé s'arrête contre un décor infranchissable.
m=newMission([{q:4,r:4,code:"mur"}]);
const pushed=at(m.enemies[0],3,4);
api.missionForcedMove(pushed,{move:{kind:"repousse",cells:[{q:4,r:4},{q:5,r:4}]}},m.players[0]);
assert.deepEqual([pushed.q,pushed.r],[3,4]);
assert.ok(m.log.some(x=>/heurte aussitôt le mur/.test(x.message)));
// Une palissade l'arrête comme un mur (Idan, 2026-11-17 : « oui ») ; par-dessus un muret, il passe.
m=newMission([{q:4,r:4,side:2,code:"palissade"}]);
const fenced=at(m.enemies[0],3,4);
api.missionForcedMove(fenced,{move:{kind:"repousse",cells:[{q:4,r:4},{q:5,r:4}]}},m.players[0]);
assert.deepEqual([fenced.q,fenced.r],[3,4]);
assert.ok(m.log.some(x=>/heurte aussitôt la palissade/.test(x.message)));
m=newMission([{q:4,r:4,side:2,code:"muret"}]);
const hopped=at(m.enemies[0],3,4);
api.missionForcedMove(hopped,{move:{kind:"repousse",cells:[{q:4,r:4},{q:5,r:4}]}},m.players[0]);
assert.deepEqual([hopped.q,hopped.r],[5,4],"par-dessus un muret");

// 8. La Mission Test pose quelques groupes de décor entre les lignes de déploiement : des cases, et des lignes d'arêtes
// (le muret, les caisses, la tombe) ; la case dit ce qu'elle fait.
m=newMission();
const cellCodes=new Set(reference.combatCells.rows.map(c=>c.code));
let edgesSeen=0;
for(let i=0;i<20;i++){
  const decor=api.generateMissionDecor();
  assert.ok(decor.length>=4);
  const cells=decor.filter(d=>d.side==null),edges=decor.filter(d=>d.side!=null);
  edgesSeen+=edges.length;
  assert.equal(new Set(cells.map(key)).size,cells.length,"une case, un décor");
  const edgeKey=d=>{ const n=[{q:1,r:0},{q:0,r:-1},{q:-1,r:0},{q:0,r:1}][d.side]; return [key(d),key({q:d.q+n.q,r:d.r+n.r})].sort().join("|"); };
  assert.equal(new Set(edges.map(edgeKey)).size,edges.length,"une arête, un décor");
  for(const d of decor){
    const col=api.missionColumn(d.q,d.r);
    assert.ok(col>2&&col<10,"pas sur les colonnes de déploiement");
    if(d.side!=null) assert.ok(row(d.code)?.arete,d.code+" : une arête");
    else assert.ok(row(d.code)?.case||cellCodes.has(d.code),d.code+" : une case");
  }
}
assert.ok(edgesSeen>0,"des arêtes");
m=newMission([{q:2,r:4,code:"foret"},{q:2,r:4,side:0,code:"muret"},{q:4,r:4,code:"gros_rocher"},{q:5,r:4,code:"marais"},{q:6,r:4,side:3,code:"palissade"}]);
assert.equal(api.missionCellLabel(2,4),"Forêt : 1,5 PM, bloque la vue · Muret à l’est : +0,5 PM");
assert.equal(api.missionCellLabel(3,4),"Muret à l’ouest : +0,5 PM");
assert.equal(api.missionCellLabel(4,4),"Gros rocher (Mur, montagne, rocher) : infranchissable à pied (100 PM), bloque la vue");
assert.equal(api.missionCellLabel(5,4),"Marais (Boue, marais, neige) : 2 PM");
assert.equal(api.missionCellLabel(6,4),"Palissade au sud : +2 PM, on voit dehors, pas de corps à corps à travers");
assert.equal(api.missionCellLabel(6,5),"Palissade au nord : +2 PM, on ne voit pas dedans, pas de corps à corps à travers");
assert.equal(api.missionCellLabel(9,9),"");
assert.match(source,/game\.mission\.decor=generateMissionDecor\(\);/);
// Un motif dessiné par décor, sur sa couleur (Idan : « Tu peux faire mieux que juste de la couleur ? »).
const css=fs.readFileSync(path.join(ROOT,"prototype-web","styles.css"),"utf8");
for(const d of decors.rows) assert.match(css,new RegExp('\\.hex-decor\\[data-decor="'+d.code+'"\\]\\{background-image:url\\("data:image/svg\\+xml,'),d.code);
assert.match(source,/data-decor="\$\{esc\(row\.code\)\}"/);
// 9. Les sorts qui volent comme une flèche (Idan, 2026-11-06 : « oui pour les sorts qui volent ») : l'Esquive du terrain compte.
m=newMission([{q:7,r:4,side:2,code:"muret"}]);
const mage=m.players[0],prey=at(m.enemies[0],7,4);
mage.character.skills.magic.Feu=60;
mage.character.stats["Réserve de mana"]=200;mage.character.mana=200;
mage.character.spells=[{code:"fire_bolt",name:"Trait de feu",school:"Feu",mastery:40}];
const magic=api.missionMagic();
const bare=magic.hitChance(mage,prey,"fire_bolt");
assert.ok(magic.hitChance(mage,prey,"fire_bolt",{terrainDodge:30})<bare);
forced=0.01; // le sort réussit (sinon pas de toucher à lire)
const out=api.resolveMissionSpell(mage,prey,"fire_bolt");
forced=null;
assert.ok(out.ok,out.reason);
assert.equal(out.terrainDodge,30);
assert.equal(out.pHit,magic.hitChance(mage,prey,"fire_bolt",{terrainDodge:30}));
assert.match(api.missionSpellPreviewRows(mage,"fire_bolt",prey.q,prey.r),/<dt>Esquive du terrain<\/dt><dd>\+30<\/dd>/);
// Un sort de zone, non (pas de cible visée comme une flèche).
assert.equal(reference.spells.rows.find(x=>x.code==="fireball").toucher===undefined||reference.spells.rows.find(x=>x.code==="fireball").toucher===null,true);

// 9 bis. Le corps à corps à travers une arête (doc 04) : par-dessus un muret, oui ; à travers une palissade ou une
// meurtrière, non (« on ne tape pas au cac à travers une meurtrière » ; « du bois plein. On fait le tour »), ni la zone de
// menace (pas d'attaque d'opportunité à travers).
m=newMission([{q:7,r:4,side:2,code:"muret"}]);
const swordsman=at(m.players[1],6,4),target=at(m.enemies[0],7,4);
assert.equal(api.missionCanAttack(swordsman,target,"melee"),true,"par-dessus un muret");
assert.equal(engine.threatens(target,{q:6,r:4}),true);
for(const code of ["palissade","muraille_meurtriere"]){
  m.decor=[{q:7,r:4,side:2,code}];
  assert.equal(api.missionCanAttack(swordsman,target,"melee"),false,code+" : pas à travers");
  assert.equal(engine.threatens(target,{q:6,r:4}),false,code+" : pas de menace à travers");
  assert.equal(engine.threatens(target,{q:7,r:3}),true,code+" : sur les autres côtés, si");
}

// 10. L'IA contourne le décor : un mur entre elle et sa cible, elle passe par le trou au lieu de s'y coller.
m=newMission([{q:5,r:2,code:"mur"},{q:5,r:3,code:"mur"},{q:5,r:4,code:"mur"},{q:5,r:5,code:"mur"},{q:5,r:6,code:"mur"}]);
const walker=at(m.enemies[0],7,4),aim=at(m.players[1],2,4);
at(m.players[0],0,8);
walker.movementRemaining=4;
const routeAround=api.shortestMissionPath(walker,{q:3,r:4},walker);
api.enemyMissionAct(walker,{reset:false});
assert.ok(engine.axialDistance(walker,aim)<6,"il avance vers sa cible");
assert.ok(walker.q!==6||walker.r!==4,"il ne reste pas collé au mur");
assert.ok(routeAround&&!routeAround.some(c=>c.q===5&&c.r>=2&&c.r<=6),"le chemin contourne le mur");
// Personne en vue (Idan, 2026-11-09 : « l'IA ne doit pas connaître nos mecs cachés ! » ; « Si elle ne voit personne, elle ne
// sait pas qu'elle est attaquée ») : sans alerte, il reste à son poste ; alerté (un coup venu de là), il fouille vers
// l'endroit d'où vient le coup.
m=newMission();
const hunter=at(m.enemies[0],10,4);
for(const p of m.players) p.camouflaged=true;
hunter.movementRemaining=engine.movementBase(hunter);
hunter.watch="garde";
const from=engine.axialDistance(hunter,m.players[0]);
api.enemyMissionAct(hunter,{reset:false});
assert.equal(engine.axialDistance(hunter,m.players[0]),from,"sans alerte, il ne sait pas où ils sont");
m.awareness={player:{alert:true,lastKnown:null,objective:null},enemy:{alert:true,lastKnown:{q:m.players[0].q,r:m.players[0].r},objective:null}};
hunter.movementRemaining=engine.movementBase(hunter);
api.enemyMissionAct(hunter,{reset:false});
assert.ok(engine.axialDistance(hunter,m.players[0])<from,"alerté, il fouille vers l'endroit du coup");

// 11. Plus de combat automatique bloqué par le décor : 200 combats de Mission Test au hasard, tous finissent.
let stuck=0;
for(let k=0;k<200;k++){
  const squad=[1,2,3].map(i=>generator.createMercenary({id:1000+10*k+i,captain}));
  const foes=[4,5,6].map(i=>generator.createMercenary({id:1000+10*k+i,captain}));
  const players=squad.map((c,i)=>api.makeMissionUnit(c,"player",i)),enemies=foes.map((c,i)=>api.makeMissionUnit(c,"enemy",i));
  game.mission={engine,endRules:MissionEnd.createMissionEndRules({reference}),progression:Progression.createProgressionRules({reference}),
    players,enemies,playerOrder:api.sortMissionInitiative(players,engine),enemyOrder:api.sortMissionInitiative(enemies,engine),
    activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null};
  game.mission.decor=api.generateMissionDecor();
  api.startMissionCamouflage();
  api.selectNextMissionPlayer();
  api.autoResolveMission();
  if(!game.mission.over) stuck++;
}
assert.equal(stuck,0,"combats bloqués : "+stuck);
// (en dernier : ces tirages ne décalent pas ceux des sections au-dessus)
// Les deux mouvements d'un coup (Idan, 2026-11-14) : dans la seconde zone, il renonce à son attaque.
m=newMission([{q:2,r:4,code:"marais"}]);
u=m.players[0];
assert.equal(m.mode,"move","Déplacer, choisi d'office au début de son tour");
u.movementRemaining=1.5;
api.setMissionMode("move");
const targets=api.targetableMissionCells();
assert.ok(targets.has("2,4"),"la seconde zone se clique aussi");
api.renderMission();
const zone=c=>(elements["mission-map"].innerHTML.match(new RegExp(`<button class="([^"]*)" data-hex-q="${c[0]}" data-hex-r="${c[1]}"`))||[])[1]||"";
assert.match(zone([2,4]),/reachable second-move/,"le marais (2) : la seconde zone, en violet");
assert.ok(/reachable/.test(zone([1,3]))&&!/second-move/.test(zone([1,3])),"une case à 1 : la première zone");
api.handleMissionHexClick(2,4);
assert.deepEqual([u.q,u.r,u.movementRemaining,u.attackAvailable,u.secondMove],[2,4,1.5+engine.movementBase(u)-2,false,true],"le second mouvement, au prix de l'attaque");
assert.equal(m.mode,null);
// Le premier fait : Déplacer devient « Second mouvement » ; plus de bouton à part.
Object.assign(u,{movementRemaining:0,attackAvailable:true,secondMove:false});
api.renderMission();
assert.equal(elements["mission-move-btn"].textContent,"Second mouvement");
assert.equal(api.missionActionAvailability().move,true);
u.attackAvailable=false;
assert.equal(api.missionActionAvailability().move,false,"ni mouvement ni attaque : plus de déplacement");
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.ok(!html.includes("mission-second-move-btn"),"le bouton Second mouvement a disparu");
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","styles.css"),"utf8"),/\.hex-cell\.reachable\.second-move\{background:/);
console.log("Décor : passage (PM au quart, arêtes, infranchissable), vue (mur, forêt, au contact, arêtes un seul sens), Esquive du terrain (tir, charge × 2, sorts qui volent), Se cacher au repérage, corps à corps à travers une arête, chute de charge, IA (contourne, va chercher), Mission Test — OK");
