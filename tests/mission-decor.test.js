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
  summonArchetypes:"summon-archetypes.json",terrainDecors:"terrain-decors.json"
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
const engine=createCombatEngine(reference,{onAttack:Progression.recordAttack});
const source=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
const EXPOSED="makeMissionUnit,sortMissionInitiative,selectNextMissionPlayer,shortestMissionPath,missionReachablePaths,"
  +"moveMissionUnitAlongPath,missionLineOfSight,missionCoverLevel,missionChargeIfClear,performMissionAttack,missionForcedMove,"
  +"generateMissionDecor,missionDecorLabel,missionCellFree,handleMissionHexClick,setMissionMode,resolveMissionDetection,"
  +"missionAttackPreview,missionColumn,missionKey,startMissionCamouflage,autoResolveMission,enemyMissionAct,resolveMissionSpell,"
  +"missionMagic,missionSpellPreviewRows";
const api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd",
  "MercenairesMagic",source+"\nreturn {"+EXPOSED+"};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,Magic);

// 2. Le moteur : le Toucher × 0,5 ou × 0,25 derrière une couverture ; la chute de charge augmente avec les pas lents.
const units=[2,3].map(id=>generator.createMercenary({id,captain}));
const a={character:units[0],activeSet:1,q:0,r:0},b={character:units[1],activeSet:1,q:5,r:0};
const plain=engine.hitProbability(a,b,"ranged",5);
assert.equal(engine.hitProbability(a,b,"ranged",5,{cover:"partielle"}),plain*0.5);
assert.equal(engine.hitProbability(a,b,"ranged",5,{cover:"totale"}),plain*0.25);
assert.equal(engine.hitProbability(a,b,"ranged",5,{cover:"sans"}),plain);
assert.deepEqual([engine.coverDiscretion("partielle"),engine.coverDiscretion("totale"),engine.coverDiscretion(null)],[30,60,0]);
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

// 3. Le passage : une case lente coûte 2, 3 ou 4 ; une case infranchissable ne se traverse pas.
// À travers le marais (3 + 1), ou le détour par l'herbe (3 cases) : le détour ; à coût égal, le moins de cases.
let m=newMission([{q:2,r:4,code:"marais"}]);
let u=m.players[0];
let route=api.shortestMissionPath(u,{q:3,r:4},u);
assert.equal(has(route,{q:2,r:4}),false,"le détour par l’herbe coûte moins que le marais");
assert.equal(route.length,3);
m=newMission([{q:2,r:4,code:"foret"}]);
u=m.players[0];
route=api.shortestMissionPath(u,{q:3,r:4},u);
assert.ok(has(route,{q:2,r:4})&&route.length===2,"forêt (2 + 1) contre détour (3) : à coût égal, le plus court en cases");
const reach=api.missionReachablePaths(u,2);
assert.ok(reach.has("2,4"),"la forêt : 2 points pour y entrer");
u.movementRemaining=5;
assert.equal(api.moveMissionUnitAlongPath(u,[{q:2,r:4}]),1);
assert.equal(u.movementRemaining,3,"un pas en forêt coûte 2");
m=newMission([{q:2,r:4,code:"mur"}]);
u=m.players[0];
assert.equal(api.shortestMissionPath(u,{q:2,r:4},u),null,"on n'entre pas dans un mur");
assert.equal(has(api.shortestMissionPath(u,{q:3,r:4},u),{q:2,r:4}),false);
assert.equal(api.missionCellFree({q:2,r:4}),false);
// Un clic au-delà du mouvement restant ne bouge pas.
m=newMission([{q:2,r:4,code:"marais"}]);
u=m.players[0];
u.movementRemaining=2;
api.setMissionMode("move");
api.handleMissionHexClick(2,4);
assert.deepEqual([u.q,u.r],[1,4],"le marais coûte 3");
u.movementRemaining=3;
api.setMissionMode("move");
api.handleMissionHexClick(2,4);
assert.deepEqual([u.q,u.r,u.movementRemaining],[2,4,0]);

// 4. La vue : un mur ou une forêt coupe la ligne de vue ; un gros rocher, non. Dans la forêt, on n'est vu qu'au contact.
m=newMission([{q:4,r:4,code:"mur"}]);
let [shooter,foe]=[m.players[0],m.enemies[0]];
at(foe,7,4);
assert.equal(api.missionLineOfSight(shooter,foe),false,"derrière un mur");
m=newMission([{q:4,r:4,code:"gros_rocher"}]);
[shooter,foe]=[m.players[0],m.enemies[0]];
at(foe,7,4);
assert.equal(api.missionLineOfSight(shooter,foe),true,"un gros rocher laisse voir");
m=newMission([{q:4,r:4,code:"foret"}]);
[shooter,foe]=[m.players[0],m.enemies[0]];
at(foe,7,4);
assert.equal(api.missionLineOfSight(shooter,foe),false,"derrière une forêt, on ne voit pas");
at(foe,4,4);
assert.equal(api.missionLineOfSight(shooter,foe),false,"dans la forêt, invisible de loin");
at(shooter,3,4);
assert.equal(api.missionLineOfSight(shooter,foe),true,"au contact, on le voit");

// 5. La couverture : le décor collé à la cible sur la ligne de tir, ou sa propre case ; pas celui collé au tireur.
m=newMission([{q:6,r:4,code:"gros_rocher"},{q:2,r:4,code:"muret"}]);
[shooter,foe]=[m.players[0],m.enemies[0]];
at(foe,7,4);
assert.equal(api.missionCoverLevel(shooter,foe),"totale","derrière le gros rocher");
assert.equal(api.missionCoverLevel(foe,shooter),"partielle","le muret collé à l'archer le protège du tir de l'ennemi");
m.decor=[{q:2,r:4,code:"muret"}];
assert.equal(api.missionCoverLevel(shooter,foe),null,"mais il ne gêne pas son propre tir");
m.decor=[{q:6,r:4,code:"gros_rocher"},{q:2,r:4,code:"muret"}];
at(foe,7,2);
assert.equal(api.missionCoverLevel(shooter,foe),null,"de biais, le rocher n'est plus sur la ligne");
m=newMission([{q:7,r:4,code:"buissons"}]);
[shooter,foe]=[m.players[0],m.enemies[0]];
at(foe,7,4);
assert.equal(api.missionCoverLevel(shooter,foe),"partielle","dans les buissons");
// Le tir passe la couverture au moteur ; l'aperçu l'affiche.
const seen=[];
const realResolve=engine.resolveAttack;
engine.resolveAttack=(x,y,o)=>{ const r=realResolve(x,y,o); seen.push({o,r}); return r; };
api.performMissionAttack(shooter,foe,"ranged",engine.axialDistance(shooter,foe));
assert.equal(seen[0].o.cover,"partielle");
assert.equal(seen[0].r.cover,"partielle");
assert.equal(seen[0].r.pHit,engine.hitProbability(shooter,foe,"ranged",seen[0].r.distance,{cover:"partielle"}));
assert.ok(m.log.some(x=>/\(couverture partielle\)/.test(x.message)),"le journal le dit");
api.setMissionMode("ranged");
assert.equal(api.missionAttackPreview(shooter,foe)[0].cover,"partielle");
// Au corps à corps (hors charge), pas de couverture.
seen.length=0;
const blade=m.players[1];
at(blade,6,4);
api.performMissionAttack(blade,foe,"melee",1);
assert.equal(seen[0].r.cover,undefined,"pas au corps à corps");
engine.resolveAttack=realResolve;
// Repérage : la couverture donne de la Discrétion.
const realDetect=engine.rollDetection,bonuses=[];
engine.rollDetection=(o,t,d,c)=>{ bonuses.push(c); return realDetect(o,t,d,c); };
for(const x of [...m.players,...m.enemies]) x.camouflaged=true;
api.resolveMissionDetection();
engine.rollDetection=realDetect;
assert.ok(bonuses.includes(30),"+30 dans les buissons");

// 6. La charge : elle traverse un décor lent, avec plus de chute ; pas un décor infranchissable ; la cible derrière une
// couverture est protégée.
m=newMission();
const charger=at(m.players[1],1,4);
foe=m.enemies[0];
const base=engine.movementBase(charger);
at(foe,1+base+1,4);
m.decor=[{q:3,r:4,code:"marais"}];
let charge=api.missionChargeIfClear(charger,foe);
assert.ok(charge,"elle traverse le marais");
assert.equal(charge.slowSteps,2,"un pas au tiers : 3 − 1");
m.decor=[{q:3,r:4,code:"muret"}];
assert.equal(api.missionChargeIfClear(charger,foe),null,"pas à travers un muret");
const last=api.missionChargeIfClear((m.decor=[],charger),foe).destination;
m.decor=[{q:last.q,r:last.r,code:"buissons"}];
charge=api.missionChargeIfClear(charger,foe);
assert.equal(charge.cover,"partielle","la cible derrière les buissons");
assert.equal(charge.slowSteps,1);
seen.length=0;
engine.resolveAttack=(x,y,o)=>{ const r=realResolve(x,y,o); seen.push({o,r}); return r; };
at(charger,charge.destination.q,charge.destination.r); // au bout de la course
forced=0.05; // D100 = 6 : sous les 2 + 5 % de chute
api.performMissionAttack(charger,foe,"melee",1,charge);
forced=null;
engine.resolveAttack=realResolve;
assert.equal(seen[0].o.chargeSlowSteps,1);
assert.equal(seen[0].o.cover,"partielle");
assert.equal(seen[0].r.chargeFall,true,"pieds dans le tapis");
assert.equal(seen[0].r.pFall,7);
assert.ok(m.log.some(x=>/terrain difficile : 7 %, jet 6/.test(x.message)));

// 7. Un déplacement forcé s'arrête contre un décor infranchissable.
m=newMission([{q:4,r:4,code:"mur"}]);
const pushed=at(m.enemies[0],3,4);
api.missionForcedMove(pushed,{move:{kind:"repousse",cells:[{q:4,r:4},{q:5,r:4}]}},m.players[0]);
assert.deepEqual([pushed.q,pushed.r],[3,4]);
assert.ok(m.log.some(x=>/heurte aussitôt le mur/.test(x.message)));

// 8. La Mission Test pose quelques groupes de décor entre les lignes de déploiement ; la case dit ce qu'elle fait.
m=newMission();
for(let i=0;i<20;i++){
  const decor=api.generateMissionDecor();
  assert.ok(decor.length>=4);
  assert.equal(new Set(decor.map(key)).size,decor.length,"une case, un décor");
  for(const d of decor){
    const col=api.missionColumn(d.q,d.r);
    assert.ok(col>2&&col<10,"pas sur les colonnes de déploiement");
    assert.ok(row(d.code));
  }
}
assert.equal(api.missionDecorLabel(row("foret")),"Forêt : mouvement ½, bloque la vue, couverture partielle");
assert.equal(api.missionDecorLabel(row("gros_rocher")),"Gros rocher : infranchissable, couverture totale");
assert.equal(api.missionDecorLabel(row("marais")),"Marais : mouvement ⅓");
assert.match(source,/game\.mission\.decor=generateMissionDecor\(\);/);
// Un motif dessiné par décor, sur sa couleur (Idan : « Tu peux faire mieux que juste de la couleur ? »).
const css=fs.readFileSync(path.join(ROOT,"prototype-web","styles.css"),"utf8");
for(const d of decors.rows) assert.match(css,new RegExp('\\.hex-decor\\[data-decor="'+d.code+'"\\]\\{background-image:url\\("data:image/svg\\+xml,'),d.code);
assert.match(source,/data-decor="\$\{esc\(row\.code\)\}"/);
// 9. Les sorts qui volent comme une flèche (Idan, 2026-11-06 : « oui pour les sorts qui volent ») : la couverture compte.
m=newMission([{q:7,r:4,code:"buissons"}]);
const mage=m.players[0],prey=at(m.enemies[0],7,4);
mage.character.skills.magic.Feu=60;
mage.character.stats["Réserve de mana"]=200;mage.character.mana=200;
mage.character.spells=[{code:"fire_bolt",name:"Trait de feu",school:"Feu",mastery:40}];
const magic=api.missionMagic();
const bare=magic.hitChance(mage,prey,"fire_bolt");
assert.equal(magic.hitChance(mage,prey,"fire_bolt",{cover:"partielle"}),bare*0.5);
assert.equal(magic.hitChance(mage,prey,"fire_bolt",{cover:"totale"}),bare*0.25);
const out=api.resolveMissionSpell(mage,prey,"fire_bolt");
assert.ok(out.ok,out.reason);
assert.equal(out.cover,"partielle");
assert.equal(out.pHit,bare*0.5);
assert.match(api.missionSpellPreviewRows(mage,"fire_bolt",prey.q,prey.r),/<dt>Couverture<\/dt><dd>partielle<\/dd>/);
// Un sort de zone, non (pas de cible visée comme une flèche).
assert.equal(reference.spells.rows.find(x=>x.code==="fireball").toucher===undefined||reference.spells.rows.find(x=>x.code==="fireball").toucher===null,true);

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
// Personne en vue : il va chercher l'ennemi le plus proche, puis guette s'il ne le voit toujours pas.
m=newMission();
const hunter=at(m.enemies[0],10,4);
for(const p of m.players) p.camouflaged=true;
hunter.movementRemaining=engine.movementBase(hunter);
const from=engine.axialDistance(hunter,m.players[0]);
api.enemyMissionAct(hunter,{reset:false});
assert.ok(engine.axialDistance(hunter,m.players[0])<from,"il avance vers eux");

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
console.log("Décor : passage (coût, infranchissable), vue (mur, forêt, au contact), couverture (tir, charge, sorts qui volent, repérage), chute de charge, IA (contourne, va chercher), Mission Test — OK");
