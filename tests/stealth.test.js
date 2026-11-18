"use strict";

// Discrétion et camouflage (doc 04 ; Idan, 2026-10-28) : tout le monde est camouflé au début du combat ; au début de chaque
// tour, chacun tente de repérer les ennemis encore camouflés qu'il a en vue ; repéré, on l'est pour toute la partie. Un
// camouflé n'est pas ciblable ; il attaque, tire et lance ses sorts sans se découvrir, comme une Frappe dans le dos.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const Progression=require("../game-core/progression.js");
const MissionEnd=require("../game-core/mission-end.js");
const Magic=require("../game-core/magic.js");

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
  terrainDecors:"terrain-decors.json",combatCells:"combat-cells.json",combatEdges:"combat-edges.json",terrainSkills:"terrain-skills.json"
};
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,read(file)]));
// Tirages : force (toujours la même valeur) si posé, sinon la file, sinon une suite fixe.
let seed=11,force=null;
const queue=[];
Math.random=()=>force!==null?force:queue.length?queue.shift():((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:Math.random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});

const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},parentElement:{clientWidth:900},
  classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){}});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const game={campaign:null,captain,referenceData:reference};
const engine=createCombatEngine(reference,{onAttack:Progression.recordAttack});
const source=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
const api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd","MercenairesMagic",
  source+"\nreturn {makeMissionUnit,sortMissionInitiative,selectNextMissionPlayer,startMissionCamouflage,resolveMissionDetection,"
  +"missionUsableHands,missionChargeIfClear,missionPathOpportunityCount,nearestMissionTarget,renderMissionRoster,missionMagic,"
  +"targetableMissionCells,setMissionMode,teachMissionTestSpells,missionKey,handleMissionHexClick,resetMissionActivation,"
  +"missionShownToPlayer,missionUnitAt,missionAlert,moveMissionUnitAlongPath,enemyMoveToward,missionAiWatch,"
  +"missionHide,missionCanHide,missionHideBonus,missionActionAvailability};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,Magic);

function newMission(){
  const squad=[2,3,4].map(id=>generator.createMercenary({id,captain}));
  const foes=[5,6,7].map(id=>generator.createMercenary({id,captain}));
  for(const c of [...squad,...foes]){ c.spells=[]; c.equipment.slots.armor=null; }
  const players=squad.map((c,i)=>api.makeMissionUnit(c,"player",i));
  const enemies=foes.map((c,i)=>api.makeMissionUnit(c,"enemy",i));
  game.mission={engine,endRules:MissionEnd.createMissionEndRules({reference}),progression:Progression.createProgressionRules({reference}),
    players,enemies,playerOrder:api.sortMissionInitiative(players,engine),enemyOrder:api.sortMissionInitiative(enemies,engine),
    activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null};
  return game.mission;
}
const logged=re=>game.mission.log.some(x=>re.test(x.message));
const unitOf=(stats,skills={})=>({character:{stats,skills:{martial:skills},items:[],equipment:{slots:{}}},activeSet:1});

// Le test : P = 100 / (1 + e^(−Δ/15)), Δ = 2 × (Perception − (Discrétion + couverture)) + 40 − 5 × distance, de 0,1 à 95 %
// (Idan, 2026-11-09 : « une courbe qui récompense grandement la discrétion et la perception » ; « Partons sur B »).
const archer=unitOf({Perception:62}),lancer=unitOf({Perception:43}),sneaky=unitOf({},{Discrétion:30});
const chance=(o,t,d,c=0)=>Math.round(engine.detectionChance(o,t,d,c)*10)/10;
assert.equal(chance(archer,sneaky,3),95,"à 3 cases, on le voit (95 % au plus)");
assert.equal(chance(archer,sneaky,8),95);
assert.equal(chance(lancer,sneaky,12),59.9);
assert.equal(chance(archer,sneaky,8,30),56.6,"caché dans la végétation souple (Se cacher +30, grille carrée) : +30 de Discrétion, qui compte double");
assert.equal(chance(lancer,unitOf({},{Discrétion:200}),20),0.1,"jamais moins de 0,1 %");
assert.equal(chance(unitOf({Perception:60}),unitOf({},{Discrétion:100}),5),1.3,"40 points d'avance : 1,3 % (16 % avant)");
// Avancée cachée (Illusion) : la Discrétion du bonus compte.
const hidden={...sneaky,statBuffs:{hidden_advance:{stats:["Discrétion"],value:52,unit:"points"}}};
assert.ok(engine.detectionChance(archer,hidden,6)<engine.detectionChance(archer,sneaky,6)-30);
queue.push(0.5);
assert.deepEqual(engine.rollDetection(archer,sneaky,8),{p:engine.detectionChance(archer,sneaky,8),roll:50,spotted:true},"un jet au centième");

// Au début du combat, tout le monde est camouflé ; un repérage raté laisse tout le monde caché.
let m=newMission();
const [p1,p2,p3]=m.players,[e1,e2,e3]=m.enemies;
force=0.99;
api.startMissionCamouflage();
force=null;
assert.ok([...m.players,...m.enemies].every(u=>u.camouflaged));
assert.ok(logged(/tout le monde est camouflé/));
assert.ok(logged(/Toujours camouflés — vos hommes : /));
assert.ok(!logged(/ennemis : /),"les ennemis cachés ne sont pas nommés (brouillard de guerre)");
assert.match(api.renderMissionRoster([p1]),/· Camouflé/);
// Invisible : ni attaque, ni charge, ni sort, et l'IA ne le choisit pas comme cible.
p1.character.items.push({id:"test-dagger",name:"Dague",category:"Lames courtes",tier:1,qualityCode:"correcte"});
p1.character.equipment.slots["weapon_set_"+p1.activeSet+"_main"]="test-dagger";
p1.character.equipment.slots["weapon_set_"+p1.activeSet+"_offhand"]=null;
e1.q=p1.q+1;e1.r=p1.r;
assert.deepEqual(api.missionUsableHands(p1,e1),[]);
assert.equal(api.missionChargeIfClear(p1,e2),null);
assert.equal(api.nearestMissionTarget(e1),null,"tous les mercenaires sont camouflés");
const magic=api.missionMagic();
p1.spells=[{code:"psychic_shock",mastery:1}];
assert.match(magic.canCast(p1,e2,"psychic_shock").reason,/camouflée/);
// Pas d'attaque d'opportunité contre un camouflé qui s'éloigne.
assert.equal(api.missionPathOpportunityCount(p1,[{q:p1.q-1,r:p1.r}]),0);
// Il attaque sans se découvrir : c'est une attaque non détectée (Frappe dans le dos V1).
const blow=engine.resolveAttack(p1,e1,{mode:"melee",distance:1});
assert.deepEqual([blow.ok,blow.hidden,blow.backstab],[true,true,true]);
assert.equal(p1.camouflaged,true,"il reste camouflé");
// Repéré : par toute l'armée, pour toute la partie.
force=0;
api.resolveMissionDetection();
force=null;
assert.ok([...m.players,...m.enemies].every(u=>!u.camouflaged));
assert.ok(logged(/repère .* \(95 %, jet 0,01\)/));
assert.ok(api.missionUsableHands(p1,e1).some(h=>h.mode==="melee"),"repéré : on peut le frapper");
assert.notEqual(api.nearestMissionTarget(e1),null);
force=0.99;
api.resolveMissionDetection();
force=null;
assert.ok([...m.players,...m.enemies].every(u=>!u.camouflaged),"on ne redevient jamais camouflé");

// La ligne de vue : le Brouillard empêche de repérer.
m=newMission();
const [a1]=m.players,[b1]=m.enemies;
for(const u of [...m.players,...m.enemies]){ u.alive=false; }
a1.alive=true;b1.alive=true;
a1.q=0;a1.r=4;b1.q=4;b1.r=4;
for(const u of [...m.players,...m.enemies]) u.camouflaged=true;
m.fog=[{q:2,r:4,untilTurn:9}];
force=0;
api.resolveMissionDetection();
force=null;
assert.equal(b1.camouflaged,true,"caché derrière le brouillard");
m.fog=[];
force=0;
api.resolveMissionDetection();
force=null;
assert.equal(b1.camouflaged,false);

// Un ennemi caché derrière la ligne de front : les autres le cherchent à chaque tour.
assert.match(source,/m\.turn\+=1;\n  pruneMissionTerrain\(\);\n  tickMissionStorms\(\);\n  tickMissionBlizzards\(\);\n  maintainMissionSummons\(\);\n  if\(checkMissionEnd\(\)\)\{ renderMission\(\); return; \}\n  resolveMissionDetection\(\);/);
// (Le combat d'expédition révèle entre les deux les ennemis vus par l'éclaireur.)
assert.equal((source.match(/startMissionCamouflage\(\);\n(  if\(scouting&&!scouting\.captured\) revealMissionScouted\(scouting\);\n)?  selectNextMissionPlayer\(\);/g)||[]).length,2,"les deux débuts de combat");

// Le brouillard de guerre et l'IA aveugle (Idan, 2026-11-09 : « Je voudrais qu'ils disparaissent totalement » ; « l'IA ne
// doit pas connaître nos mecs pas cachés ! Si elle ne voit personne, elle ne sait pas qu'elle est attaquée, donc elle bouge
// pas ou fait des rondes »).
m=newMission();
force=0.99;
api.startMissionCamouflage();
force=null;
assert.deepEqual([m.awareness.player.alert,m.awareness.enemy.alert],[true,false],"au début, personne repéré : l'ennemi ne sait rien");
assert.ok(m.enemies.every(u=>["garde","ronde"].includes(u.watch)&&u.post),"chacun sa garde ou sa ronde, autour de son poste");
assert.ok(m.enemies.some(u=>u.watch==="ronde")&&m.enemies.some(u=>u.watch==="garde"),"la moitié en ronde");
assert.ok(m.awareness.player.objective,"notre équipe sait où est le camp ennemi");
const [g1,g2]=m.enemies,[h1]=m.players;
for(const u of [...m.players,...m.enemies]) u.camouflaged=true;
assert.equal(api.missionShownToPlayer(g1),false,"un ennemi camouflé n'apparaît pas");
assert.equal(api.missionShownToPlayer(h1),true,"les nôtres, si");
assert.doesNotMatch(api.renderMissionRoster(m.enemies),new RegExp(g1.character.name),"ni dans la liste");
assert.equal(api.missionUnitAt(g1.q,g1.r),null,"ni au clic");
g1.camouflaged=false;
assert.equal(api.missionUnitAt(g1.q,g1.r),g1);
g1.camouflaged=true;
// La ronde reste près de son poste ; la garde ne bouge pas.
g2.watch="garde"; g2.movementRemaining=engine.movementBase(g2);
const post2={q:g2.q,r:g2.r};
assert.equal(api.missionAiWatch(g2),false);
assert.deepEqual({q:g2.q,r:g2.r},post2);
g2.watch="ronde"; g2.post=post2;
for(let k=0;k<6;k++){ g2.movementRemaining=engine.movementBase(g2); api.missionAiWatch(g2); assert.ok(engine.axialDistance(g2,post2)<=3,"la ronde reste à 3 cases de son poste"); }
// L'alerte : une seule fois dans le journal ; elle retient l'endroit du coup.
api.missionAlert("enemy",h1);
api.missionAlert("enemy",h1);
assert.equal(m.log.filter(x=>/L’ennemi donne l’alerte/.test(x.message)).length,1);
assert.deepEqual(m.awareness.enemy.lastKnown,{q:h1.q,r:h1.r});
// Nez à nez : on entre dans la case d'un ennemi invisible, on s'arrête, il est découvert ; les deux camps sont alertés.
m.awareness.enemy={alert:false,lastKnown:null,objective:null};
for(const u of [...m.players,...m.enemies]) if(u!==h1&&u!==g1) u.alive=false;
h1.q=5;h1.r=4;g1.q=7;g1.r=4;
const bump=api.moveMissionUnitAlongPath(h1,[{q:6,r:4},{q:7,r:4},{q:8,r:4}]);
assert.deepEqual([bump,h1.q,h1.r,g1.camouflaged],[1,6,4,false]);
assert.ok(logged(/tombe nez à nez avec .*, caché là !/));
assert.equal(m.awareness.enemy.alert,true);
// Bloqué (la première case coûte plus que tout son mouvement) : l'IA renonce à attaquer pour un second mouvement.
const slow=m.players[0];
// Un marcheur ordinaire : le tirage pourrait donner un Elfe sylvain, que la forêt ne ralentit pas (Déplacement sylvain).
Object.assign(slow.character,{people:"Humain",culture:"Cités libres",ascendance:null});
g1.q=12;g1.r=4;
slow.movementRemaining=1;slow.attackAvailable=true;slow.secondMove=false;
m.decor=[{q:7,r:4,code:"foret"},{q:7,r:3,code:"foret"},{q:6,r:5,code:"foret"},{q:7,r:5,code:"foret"},{q:5,r:4,code:"foret"},{q:5,r:5,code:"foret"},{q:6,r:3,code:"foret"}];
api.enemyMoveToward(slow,g1);
assert.deepEqual([slow.secondMove,slow.attackAvailable],[true,false]);
assert.ok(logged(/renonce à attaquer pour un second mouvement/));
assert.ok(engine.axialDistance(slow,g1)<6,"il a avancé");

// Se cacher (Idan, 2026-11-17 : « Se cacher, c'est une action rapide. On choisit de se cacher au lieu de boire une potion.
// Ça amène +10 en discrétion + bonus de la case. On peut le faire que si on n'est pas encore repéré »).
{
  m=newMission();
  const [hider]=m.players;
  for(const u of [...m.players,...m.enemies]) u.camouflaged=true;
  Object.assign(hider,{q:3,r:4,quickAvailable:true,hiding:false});
  m.decor=[{q:3,r:4,code:"buissons"}];
  assert.equal(engine.HIDE_BONUS,10);
  assert.equal(api.missionHideBonus(hider),0,"pas encore caché");
  assert.equal(api.missionCanHide(hider),true);
  assert.equal(api.missionHide(hider),true);
  assert.deepEqual([hider.hiding,hider.quickAvailable],[true,false],"son action rapide");
  assert.equal(api.missionHideBonus(hider),40,"+10, plus les buissons (végétation souple, +30)");
  assert.ok(logged(/se cache \(Discrétion \+40 au repérage\)/));
  assert.equal(api.missionHide(hider),false,"une seule fois");
  m.decor=[];
  assert.equal(api.missionHideBonus(hider),10,"à découvert : +10");
  // Au repérage, le bonus compte.
  const realDetect=engine.rollDetection,bonuses=[];
  engine.rollDetection=(o,t,d,c)=>{ if(t===hider) bonuses.push(c); return realDetect(o,t,d,c); };
  m.decor=[{q:3,r:4,code:"eau_peu_profonde"}];
  for(const e of m.enemies){ e.q=6; e.r=4; break; }
  api.resolveMissionDetection();
  engine.rollDetection=realDetect;
  assert.ok(bonuses.includes(20),"dans l'eau peu profonde : +10 +10");
  // Repéré : plus de cachette, et on ne peut plus se cacher.
  hider.camouflaged=false;hider.quickAvailable=true;
  assert.equal(api.missionHideBonus(hider),0);
  const spotted=m.players[1];
  Object.assign(spotted,{camouflaged:false,quickAvailable:true,hiding:false});
  assert.equal(api.missionCanHide(spotted),false,"déjà repéré : il ne peut pas se cacher");
  m.activeUnit=spotted;
  assert.equal(api.missionActionAvailability().hide,false);
  Object.assign(spotted,{camouflaged:true,quickAvailable:false});
  assert.equal(api.missionCanHide(spotted),false,"action rapide déjà prise (une potion)");
}

console.log("Discrétion : camouflage, repérage, cibles invisibles, attaques non détectées, se cacher — OK");
