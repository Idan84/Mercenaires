"use strict";

// Agrandir le dortoir (Idan, 2026-10-25) : +5 places par agrandissement, sans limite ; 100 PO et 2 jours au début,
// puis chaque agrandissement coûte plus d'or (× 1,2) et de jours (+1 tous les trois). Panneau « Constructions » de
// Ma Compagnie (prototype-web/camp-buildings-ui.js).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules,serializeCampaign,restoreCampaign}=require("../game-core/campaign.js");

const ROOT=path.resolve(__dirname,"..");
const files={
  peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",
  ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",
  cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",
  d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",
  characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",
  baseArmors:"base-armors.json",boots:"boots.json",belts:"belts.json",amulets:"amulets.json",capes:"capes.json",
  gloves:"gloves.json",pants:"pants.json",rings:"rings.json",itemQualities:"item-qualities.json",
  equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",
  binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json"
};
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[
  key,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"))]));
let seed=7;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference});
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3].map(id=>generator.createMercenary({id,captain}))});

// Le barème : 100 PO et 2 jours, puis × 1,2 (arrondi à 10) et un jour de plus tous les trois agrandissements.
const cost=k=>rules.dormitoryExpansionCost(k);
assert.deepEqual(cost(1),{number:1,places:5,gold:100,days:2});
assert.deepEqual([1,2,3,4,5,6,7].map(k=>cost(k).gold),[100,120,140,170,210,250,300]);
assert.deepEqual([1,2,3,4,6,7,10,12].map(k=>cost(k).days),[2,2,2,3,3,4,5,5]);
const total=n=>Array.from({length:n},(_,i)=>cost(i+1)).reduce((sum,c)=>({gold:sum.gold+c.gold,days:sum.days+c.days}),{gold:0,days:0});
assert.deepEqual(total(12),{gold:3960,days:42},"100 places : environ 4 000 PO et 42 jours");
assert.equal(cost(32).gold,28490,"le dernier palier avant 200 places");
assert.equal(total(32).days,219);

// Lancer un chantier : l'or part tout de suite, les places arrivent le jour de la fin du chantier.
assert.deepEqual(rules.nextDormitoryExpansion(state),cost(1));
const gold=state.company.gold;
let started=rules.startDormitoryExpansion(state);
assert.equal(started.ok,true);
assert.equal(state.company.gold,gold-100);
assert.deepEqual(state.company.camp.construction,{kind:"dormitory",number:1,places:5,gold:100,days:2,startDay:1,endDay:3});
assert.deepEqual(rules.startDormitoryExpansion(state),{ok:false,reason:"Un chantier est déjà en cours au dortoir."},"un chantier à la fois");
let [day2,day3]=rules.advanceTime(state,2);
assert.equal(day2.built,null);
assert.equal(state.company.camp.dormitoryCapacity,45);
assert.deepEqual(day3.built,{kind:"dormitory",places:5,capacity:45});
assert.equal(state.company.camp.construction,null);
assert.equal(state.company.camp.dormitoryExpansions,1);
assert.deepEqual(rules.nextDormitoryExpansion(state),cost(2),"le suivant coûte plus");

// Pas assez d'or : rien ne se passe.
state.company.gold=119;
assert.deepEqual(rules.startDormitoryExpansion(state),{ok:false,reason:"Pas assez d’or : il faut 120 PO.",cost:cost(2)});
assert.equal(state.company.gold,119);
assert.equal(state.company.camp.construction,null,"pas de chantier lancé");

// Le chantier est sauvegardé avec la partie.
state.company.gold=5000;
rules.startDormitoryExpansion(state);
const restored=restoreCampaign(serializeCampaign(state)).state;
assert.equal(restored.company.camp.construction.endDay,state.day+2);
rules.advanceTime(restored,2);
assert.equal(restored.company.camp.dormitoryCapacity,50);

// Interface : le panneau « Constructions » de Ma Compagnie.
const elements={};
const $=id=>elements[id]||(elements[id]={innerHTML:""});
const fmt=value=>String(Math.round(Number(value)||0)).replace(/\B(?=(\d{3})+(?!\d))/g," ");
const log=[];
let saved=0,rendered=0;
const game={campaign:rules.createCampaign({captain,squad:[]})};
const js=fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8");
const ui=new Function("game","$","fmt","campaignRules","dormitoryPlacesText","tavernLog","saveGame","renderGame",
  js+"\nreturn {renderCampBuildings,expandDormitory};")(
  game,$,fmt,()=>rules,places=>String(places),(message,kind)=>log.push({message,kind}),()=>saved++,()=>rendered++);
ui.renderCampBuildings();
let html=elements["camp-buildings"].innerHTML;
assert.match(html,/<h3>Constructions<\/h3>/);
assert.match(html,/<strong>Dortoir<\/strong><span>0 \/ 40 places occupées<\/span>/);
assert.match(html,/<button type="button" class="primary" data-dorm-expand>Agrandir : \+5 places<\/button>/);
assert.match(html,/<span class="building-cost">100 PO · 2 jours<\/span>/);
ui.expandDormitory();
assert.deepEqual(log.at(-1),{message:"Agrandissement du dortoir lancé : 100 PO, +5 places dans 2 jours.",kind:"gear"});
assert.deepEqual([saved,rendered],[1,1]);
ui.renderCampBuildings();
assert.match(elements["camp-buildings"].innerHTML,/Chantier en cours : \+5 places, prêtes dans 2 jours\./);
assert.doesNotMatch(elements["camp-buildings"].innerHTML,/data-dorm-expand/,"pas de second chantier");
rules.advanceTime(game.campaign,1);
ui.renderCampBuildings();
assert.match(elements["camp-buildings"].innerHTML,/prêtes dans 1 jour\./);
rules.advanceTime(game.campaign,1);
game.campaign.company.gold=50;
ui.renderCampBuildings();
html=elements["camp-buildings"].innerHTML;
assert.match(html,/0 \/ 45 places occupées/);
assert.match(html,/data-dorm-expand disabled>Agrandir : \+5 places<\/button>/);
assert.match(html,/120 PO · 2 jours · pas assez d’or/);

// Branchements : la page, le rendu, le journal du matin.
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(index,/<div id="captain-summary"><\/div>\s*<section id="camp-buildings"/);
assert.match(index,/<script src="camp-buildings-ui.js"><\/script>/);
const main=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
assert.match(main,/renderCampBuildings\(\);/);
assert.match(main,/initializeCampBuildingsUi\(\);/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8"),/Le dortoir est agrandi : \+/);

console.log("Dortoir : barème, chantier, fin du chantier, sauvegarde, panneau Constructions — OK");
