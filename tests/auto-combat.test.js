"use strict";

// Combat automatique (doc 17 ; Idan, 2026-10-25 : « un mode simu pour tester rapidement les missions ») : votre équipe
// joue avec l'IA des ennemis jusqu'à la fin du combat ; le bilan de fin de mission est le même.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const Progression=require("../game-core/progression.js");
const MissionEnd=require("../game-core/mission-end.js");

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
  alignmentGeneration:"alignment-generation.json"
};
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,read(file)]));
let seed=3;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
Math.random=random;
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});

// mission.js chargé tel quel, sans page : un élément factice pour chaque id, aucun rendu d'avatar.
const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},parentElement:{clientWidth:900},
  classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){}});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const game={campaign:null,captain,referenceData:reference};
const engine=createCombatEngine(reference,{onAttack:Progression.recordAttack});
const source=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
const api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd",
  source+"\nlet renders=0;const draw=renderMission;renderMission=function(){ if(!game.mission?.autoRunning) renders++; return draw(); };"
  +"\nreturn {makeMissionUnit,sortMissionInitiative,selectNextMissionPlayer,autoResolveMission,missionActionAvailability,renders:()=>renders};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd);

// Trois contre trois, comme la Mission Test : votre équipe joue la première.
const squad=[2,3,4].map(id=>generator.createMercenary({id,captain}));
const foes=[5,6,7].map(id=>generator.createMercenary({id,captain}));
const players=squad.map((c,i)=>api.makeMissionUnit(c,"player",i));
const enemies=foes.map((c,i)=>api.makeMissionUnit(c,"enemy",i));
game.mission={engine,endRules:MissionEnd.createMissionEndRules({reference}),progression:Progression.createProgressionRules({reference}),
  players,enemies,playerOrder:api.sortMissionInitiative(players,engine),enemyOrder:api.sortMissionInitiative(enemies,engine),
  activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null};
api.selectNextMissionPlayer();
const m=game.mission;
assert.ok(m.activeUnit,"un de vos mercenaires est actif");
assert.equal(api.missionActionAvailability().auto,true,"le bouton est actif pendant votre tour");
const before=api.renders();
api.autoResolveMission();
assert.equal(api.renders()-before,1,"la carte n'est redessinée qu'à la fin");
assert.equal(m.over,true,"le combat va jusqu'au bout");
assert.ok(["player","enemy"].includes(m.winner));
assert.ok(m.aftermath?.results?.length===3,"le bilan de fin de mission est fait pour votre équipe");
assert.equal(m.log.filter(x=>x.message==="Combat automatique : votre équipe joue seule jusqu’à la fin du combat.").length,1);
assert.ok(m.turn>=1&&m.turn<=100);
assert.equal(m.autoRunning,false);
assert.equal(api.missionActionAvailability().auto,undefined,"plus rien à faire une fois le combat fini");
api.autoResolveMission();
assert.equal(m.log.filter(x=>/Combat automatique/.test(x.message)).length,1,"rien ne se passe après la fin");

// Le bouton dans l'écran de combat.
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(html,/<button id="mission-auto-btn" class="secondary" title="Votre équipe joue seule jusqu’à la fin du combat \(comme les ennemis\)">Combat automatique<\/button>/);
assert.match(source,/\$\("mission-auto-btn"\)\.addEventListener\("click",autoResolveMission\);/);
assert.match(source,/\["mission-auto-btn","auto"\]/);

console.log("Combat automatique : votre équipe joue avec l'IA jusqu'à la fin, bilan compris — OK");
