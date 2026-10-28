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
  alignmentGeneration:"alignment-generation.json",spells:"spells.json",belts:"belts.json",amulets:"amulets.json"
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
  +"targetableMissionCells,setMissionMode,teachMissionTestSpells,missionKey,handleMissionHexClick,resetMissionActivation};")
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

// Le test : P = 100 / (1 + e^(−Δ/15)), Δ = Perception − (Discrétion + couverture) + 40 − 5 × distance, de 5 à 95 %.
const archer=unitOf({Perception:62}),lancer=unitOf({Perception:43}),sneaky=unitOf({},{Discrétion:30});
const chance=(o,t,d,c=0)=>Math.round(engine.detectionChance(o,t,d,c)*10)/10;
assert.equal(chance(archer,sneaky,3),95,"à 3 cases, on le voit (95 % au plus)");
assert.equal(chance(archer,sneaky,8),89.4);
assert.equal(chance(lancer,sneaky,12),38.5);
assert.equal(chance(archer,sneaky,8,engine.STEALTH.partialCover),53.3,"couverture partielle : +30 de Discrétion");
assert.equal(chance(lancer,unitOf({},{Discrétion:200}),20),5,"jamais moins de 5 %");
// Avancée cachée (Illusion) : la Discrétion du bonus compte.
const hidden={...sneaky,statBuffs:{hidden_advance:{stats:["Discrétion"],value:52,unit:"points"}}};
assert.ok(engine.detectionChance(archer,hidden,6)<engine.detectionChance(archer,sneaky,6)-30);
queue.push(0.5);
assert.deepEqual(engine.rollDetection(archer,sneaky,8),{p:engine.detectionChance(archer,sneaky,8),roll:51,spotted:true});

// Au début du combat, tout le monde est camouflé ; un repérage raté laisse tout le monde caché.
let m=newMission();
const [p1,p2,p3]=m.players,[e1,e2,e3]=m.enemies;
force=0.99;
api.startMissionCamouflage();
force=null;
assert.ok([...m.players,...m.enemies].every(u=>u.camouflaged));
assert.ok(logged(/tout le monde est camouflé/));
assert.ok(logged(/Toujours camouflés — vos hommes : .* — ennemis : /));
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
assert.ok(logged(/repère .* \(95 %, jet 1\)/));
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
assert.match(source,/m\.turn\+=1;\n  pruneMissionTerrain\(\);\n  resolveMissionDetection\(\);/);
assert.equal((source.match(/startMissionCamouflage\(\);\n  selectNextMissionPlayer\(\);/g)||[]).length,2,"les deux débuts de combat");

console.log("Discrétion : camouflage, repérage, cibles invisibles, attaques non détectées — OK");
