"use strict";

// Capacités de terrain (doc 04 ; Idan, 2026-11-09 : « J'ai oublié les sangs de fées qui ont aussi vol et charge au niveau
// 3 » ; « Déplacement aquatique : Pas de malus de déplacement dans l'eau peu profonde et boost temporaire de discrétion de
// +30. Valable pour tous les reptiliens et tous les sangs de sirène et les invocations de crocodiles. Respiration aquatique :
// Pour les sangs de sirène 3 - Couverture totale sur une case d'eau profonde et partielle sur une case d'eau peu profonde.
// Peu traverser l'eau profonde qui est normalement infranchissable. Déplacement sylvains : Pour les elfes sylvains, Tribus
// de la jungle, Gnomes des forêts, Tribus des forêts anciennes : Pas de malus de déplacement en fôret et boost temporaire de
// discrétion de +30 » ; « les mercenaires de sang divin ou sang de dragon de niveau 3 : on leur ajoute Vol + Charge aérienne
// à la création. On les mets sur la fiche avec les autres compétences également »).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const Progression=require("../game-core/progression.js");
const MissionEnd=require("../game-core/mission-end.js");
const Magic=require("../game-core/magic.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.terrainSkills,"terrain-skills.json","le jeu charge les capacités de terrain");
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"))]));

// 1. Les données : qui les a existe (peuples, cultures, sangs, invocations, décors).
const skills=reference.terrainSkills;
assert.equal(skills.row_count,skills.rows.length);
assert.deepEqual(skills.rows.map(r=>r.code),["vol","deplacement_aquatique","respiration_aquatique","deplacement_sylvain"]);
const names=key=>new Set(reference[key].rows.map(r=>r.nom));
const peoples=names("peoples"),cultures=names("cultures"),ancestries=names("ancestries");
const summons=new Set(reference.summonArchetypes.rows.map(r=>r.code)),decors=new Set(reference.terrainDecors.rows.map(r=>r.code));
for(const s of skills.rows){
  for(const p of s.peuples) assert.ok(peoples.has(p),s.code+" : "+p);
  for(const c of s.cultures) assert.ok(cultures.has(c),s.code+" : "+c);
  for(const a of s.ascendances) assert.ok(ancestries.has(a.nom)&&[1,2,3].includes(a.niveau_min),s.code+" : "+a.nom);
  for(const i of s.invocations) assert.ok(summons.has(i),s.code+" : "+i);
  for(const d of Object.keys(s.decors)) assert.ok(decors.has(d),s.code+" : "+d);
}
const skill=code=>skills.rows.find(r=>r.code===code);
assert.deepEqual(skill("vol").ascendances,[{nom:"Sang féerique",niveau_min:3},{nom:"Sang divin",niveau_min:3},{nom:"Sang de dragon",niveau_min:3}],
  "les sangs féerique, divin et de dragon bâtards");
assert.deepEqual([skill("vol").vol,skill("vol").charge_aerienne],[true,"toujours"]);
assert.deepEqual(skill("deplacement_aquatique").peuples,["Reptilien"]);
assert.deepEqual(skill("deplacement_aquatique").ascendances,[{nom:"Sang de sirène",niveau_min:1}],"tous les sangs de sirène");
assert.deepEqual(skill("deplacement_aquatique").invocations,["crocodile"]);
assert.deepEqual(skill("respiration_aquatique").ascendances,[{nom:"Sang de sirène",niveau_min:3}]);
assert.deepEqual(skill("deplacement_sylvain").cultures,["Elfes sylvains","Tribus de la jungle","Gnomes des forêts","Tribus des forêts anciennes"]);
assert.equal(reference.terrainDecors.rows.find(d=>d.code==="eau_profonde").cout_mouvement,null,"l'eau profonde est infranchissable");

// 2. Le moteur : qui a quoi, et ce que ça donne sur une case.
let seed=17;
Math.random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:Math.random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});
const engine=createCombatEngine(reference,{onAttack:Progression.recordAttack});
const sheet=(id,over)=>Object.assign(generator.createMercenary({id,captain}),{people:"Humain",culture:"Cités libres",ascendance:null,ascendanceLevel:null},over);
const unitOf=character=>({character,alive:true,q:0,r:0,activeSet:1});
const codes=c=>engine.terrainSkillsOf(unitOf(c)).map(s=>s.code);
const fairy3=sheet(2,{ascendance:"Sang féerique",ascendanceLevel:3}),fairy2=sheet(3,{ascendance:"Sang féerique",ascendanceLevel:2});
const siren1=sheet(4,{ascendance:"Sang de sirène",ascendanceLevel:1}),siren3=sheet(5,{ascendance:"Sang de sirène",ascendanceLevel:3});
const lizard=sheet(6,{people:"Reptilien",culture:"Reptiliens des marécages"}),sylvan=sheet(7,{people:"Elfe",culture:"Elfes sylvains"});
const plain=sheet(8,{});
assert.deepEqual(codes(fairy3),["vol"]);
for(const blood of ["Sang divin","Sang de dragon"]){
  assert.deepEqual(codes(sheet(10,{ascendance:blood,ascendanceLevel:3})),["vol"],blood+" bâtard : il vole");
  assert.deepEqual(codes(sheet(11,{ascendance:blood,ascendanceLevel:2})),[],blood+" lignée proche : non");
  assert.equal(engine.aerialCharger(unitOf(sheet(12,{ascendance:blood,ascendanceLevel:3}))),true,blood+" : charge aérienne");
}
assert.deepEqual(codes(fairy2),[],"une lignée proche ne vole pas");
assert.deepEqual(codes(siren1),["deplacement_aquatique"]);
assert.deepEqual(codes(siren3),["deplacement_aquatique","respiration_aquatique"]);
assert.deepEqual(codes(lizard),["deplacement_aquatique"]);
assert.deepEqual(codes(sylvan),["deplacement_sylvain"]);
assert.deepEqual(codes({name:"Crocodile",archetype:"crocodile"}),["deplacement_aquatique"],"les crocodiles invoqués");
assert.deepEqual(codes(plain),[]);
for(const c of ["Tribus de la jungle","Gnomes des forêts","Tribus des forêts anciennes"]) assert.deepEqual(codes(sheet(9,{culture:c})),["deplacement_sylvain"],c);
assert.equal(engine.skillFlies(unitOf(fairy3)),true);
assert.equal(engine.aerialCharger(unitOf(fairy3)),true,"il charge par les airs");
assert.equal(engine.skillFlies(unitOf(fairy2)),false);
assert.equal(engine.aerialCharger(unitOf(fairy2)),false);
const horse={alive:true,character:{name:"Destrier"}};
assert.equal(engine.skillFlies({...unitOf(fairy3),mount:horse}),false,"à cheval, il ne vole pas");
assert.equal(engine.aerialCharger({...unitOf(fairy3),mount:horse}),false);
assert.deepEqual(engine.terrainEffect(unitOf(siren3),"eau_peu_profonde"),{cost:1,discretion:30,cover:"partielle"});
assert.deepEqual(engine.terrainEffect(unitOf(siren3),"eau_profonde"),{cost:1,discretion:0,cover:"totale"});
assert.deepEqual(engine.terrainEffect(unitOf(siren1),"eau_profonde"),{cost:undefined,discretion:0,cover:null},"sans Respiration aquatique, l'eau profonde reste infranchissable");
assert.deepEqual(engine.terrainEffect(unitOf(lizard),"eau_peu_profonde"),{cost:1,discretion:30,cover:null});
assert.deepEqual(engine.terrainEffect(unitOf(sylvan),"foret"),{cost:1,discretion:30,cover:null});
assert.deepEqual(engine.terrainEffect(unitOf(sylvan),"eau_peu_profonde"),{cost:undefined,discretion:0,cover:null});

// 3. En combat : déplacement, couverture, Discrétion.
const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},parentElement:{clientWidth:900},
  classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){}});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const game={campaign:null,captain,referenceData:reference};
const mission=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
const api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd","MercenairesMagic",
  mission+"\nreturn {makeMissionUnit,sortMissionInitiative,missionStepCost,occupiedMissionKeys,missionKey,missionFlies,missionCoverLevel,"
  +"missionTerrainStealth,missionReachablePaths,missionDecorBlocksMove};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,Magic);
const squad=[plain,sylvan,siren3,fairy3].map((c,i)=>api.makeMissionUnit(c,"player",i));
const foes=[sheet(20,{})].map((c,i)=>api.makeMissionUnit(c,"enemy",i));
game.mission={engine,endRules:MissionEnd.createMissionEndRules({reference}),progression:Progression.createProgressionRules({reference}),
  players:squad,enemies:foes,playerOrder:api.sortMissionInitiative(squad,engine),enemyOrder:api.sortMissionInitiative(foes,engine),
  activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null,
  decor:[{q:5,r:4,code:"foret"},{q:6,r:4,code:"eau_peu_profonde"},{q:7,r:4,code:"eau_profonde"}]};
const [man,elf,siren,fae]=squad,[foe]=foes;
const forest={q:5,r:4},shallow={q:6,r:4},deep={q:7,r:4};
assert.deepEqual([api.missionStepCost(forest,null,man),api.missionStepCost(forest,null,elf)],[1.5,1],"pas de malus en forêt (grille carrée : 1,5 pour les autres)");
assert.deepEqual([api.missionStepCost(shallow,null,man),api.missionStepCost(shallow,null,siren)],[2,1],"pas de malus dans l'eau peu profonde (2 pour les autres)");
assert.equal(api.missionStepCost(deep,null,man),Infinity);
assert.equal(api.missionStepCost(deep,null,siren),1,"il traverse l'eau profonde");
assert.ok(api.occupiedMissionKeys(man).has(api.missionKey(7,4)),"l'eau profonde bloque les autres");
assert.ok(!api.occupiedMissionKeys(siren).has(api.missionKey(7,4)),"pas lui");
siren.q=6;siren.r=4;siren.movementRemaining=engine.movementBase(siren);
assert.ok([...api.missionReachablePaths(siren,2).keys()].includes(api.missionKey(7,4)),"il peut y entrer");
assert.equal(api.missionFlies(fae),true,"le sang féerique bâtard vole");
assert.equal(api.missionStepCost(deep,null,fae),1);
assert.equal(api.missionFlies(man),false);
// Monté, il se déplace comme sa monture.
elf.mount={alive:true,offMap:false,character:{name:"Destrier"}};
assert.equal(api.missionStepCost(forest,null,elf),1.5,"à cheval, la forêt freine le cheval");
fae.mount={alive:true,offMap:false,character:{name:"Destrier"}};
assert.equal(api.missionFlies(fae),false,"à cheval, il ne vole pas");
delete elf.mount;delete fae.mount;
// La couverture qu'il trouve sur sa case (Respiration aquatique) et la Discrétion gagnée (+30, tant qu'il y est).
foe.q=10;foe.r=4;
siren.q=7;siren.r=4;
assert.equal(api.missionCoverLevel(foe,siren),"totale","dans l'eau profonde : couverture totale");
siren.q=6;siren.r=4;
assert.equal(api.missionCoverLevel(foe,siren),"partielle","dans l'eau peu profonde : partielle");
assert.equal(api.missionTerrainStealth(siren),30);
man.q=6;man.r=4;
assert.deepEqual([api.missionCoverLevel(foe,man),api.missionTerrainStealth(man)],[null,0],"les autres, rien");
elf.q=5;elf.r=4;man.q=5;man.r=4;
assert.deepEqual([api.missionTerrainStealth(elf),api.missionTerrainStealth(man)],[30,0],"en forêt, +30 pour le sylvain");
elf.q=2;elf.r=4;
assert.equal(api.missionTerrainStealth(elf),0,"hors de la forêt, plus rien");
// Le repérage en tient compte.
assert.match(mission,/e\.coverDiscretion\(missionCoverLevel\(observer,target\)\)\+missionTerrainStealth\(target\)/);

// 4. Sur la fiche, avec les aptitudes (au survol : ce qu'elles donnent).
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
assert.match(ui,/combatEngine\(\)\.terrainSkillsOf\?\.\(\{character:c\}\)/);
assert.match(ui,/const aptitudes=layout\.aptitudes\.filter\(yes\)[^\n]*\+terrain;/);

console.log("Capacités de terrain : vol des sangs féeriques, Déplacement aquatique, Respiration aquatique, Déplacement sylvain — OK");
