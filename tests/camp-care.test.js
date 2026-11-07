"use strict";

// Bâtiments de soins (Idan, 2026-11-01) : Dispensaire (blessures −10 % par niveau, après le minimum de 7 jours) et Bains
// chauds (fatigue −1 jour par niveau, au moins 1 ; mana +5 % de la Réserve par jour et par niveau). À construire, puis
// 5 niveaux : niveau n = 1 000 × n² PO et 4 × n jours ; un chantier par bâtiment, en parallèle de celui du dortoir.
// Encarts dans Ma Compagnie (prototype-web/camp-buildings-ui.js).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules,serializeCampaign,restoreCampaign}=require("../game-core/campaign.js");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createMagicRules}=require("../game-core/magic.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.campBuildings,"camp-buildings.json","le jeu charge les bâtiments de soins");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
let seed=11;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const engine=createCombatEngine(reference,{});
const magic=createMagicRules({reference,combat:engine});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,magic});
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3].map(id=>generator.createMercenary({id,captain}))});

// Données.
// (L'École de magie et ses salles suivent : tests/magic-school.test.js.)
const rows=reference.campBuildings.rows.slice(0,2);
assert.deepEqual(rows.map(r=>[r.code,r.nom,r.niveaux,r.prix_base,r.jours_base,r.requiert]),[["dispensary","Dispensaire",5,500,4,null],["baths","Bains chauds",5,500,4,null]]);
assert.deepEqual(rows.map(r=>[r.soins_par_niveau,r.fatigue_jours_par_niveau,r.mana_par_niveau]),[[0.1,0,0],[0,1,5]]);
assert.equal(reference.campBuildings.row_count,reference.campBuildings.rows.length);
assert.deepEqual(rules.campBuildingCodes().slice(0,2),["dispensary","baths"]);

// Barème : niveau n = 1 000 × n² PO et 4 × n jours.
const at=(code,level)=>{ state.company.camp.buildings={...state.company.camp.buildings,[code]:{level,construction:null}}; };
assert.equal(rules.buildingLevel(state,"dispensary"),0,"à construire");
const costs=[];
for(let n=1;n<=5;n++){ at("dispensary",n-1); costs.push(rules.nextBuildingLevel(state,"dispensary")); }
assert.deepEqual(costs.map(c=>[c.level,c.gold,c.days]),[[1,500,4],[2,2000,8],[3,4500,12],[4,8000,16],[5,12500,20]]);
at("dispensary",5);
assert.equal(rules.nextBuildingLevel(state,"dispensary"),null);
assert.deepEqual(rules.startBuilding(state,"dispensary"),{ok:false,reason:"Dispensaire : niveau maximal."});
state.company.camp.buildings={};

// Chantiers : l'or part au lancement ; un par bâtiment, en parallèle du dortoir.
state.company.gold=30000;
const day=state.day;
const started=rules.startBuilding(state,"dispensary");
assert.equal(started.ok,true);
assert.equal(state.company.gold,29500);
assert.deepEqual(started.construction,{kind:"building",code:"dispensary",name:"Dispensaire",level:1,gold:500,days:4,startDay:day,endDay:day+4});
assert.deepEqual(rules.startBuilding(state,"dispensary"),{ok:false,reason:"Un chantier est déjà en cours : Dispensaire."});
assert.equal(rules.startBuilding(state,"baths").ok,true,"les bains en même temps");
assert.equal(rules.startDormitoryExpansion(state).ok,true,"et le dortoir aussi");
state.company.gold=400;
state.company.camp.buildings.baths.construction=null;
assert.deepEqual(rules.startBuilding(state,"baths"),{ok:false,reason:"Pas assez d’or : il faut 500 PO.",cost:{code:"baths",name:"Bains chauds",level:1,gold:500,days:4}});
assert.equal(state.company.gold,400);
// Sauvegarde, puis le niveau arrive le matin du dernier jour.
const restored=restoreCampaign(serializeCampaign(state)).state;
assert.equal(restored.company.camp.buildings.dispensary.construction.endDay,day+4);
const reports=rules.advanceTime(state,4);
assert.deepEqual(reports.slice(0,3).map(r=>r.buildings),[[],[],[]]);
assert.deepEqual(reports[3].buildings,[{kind:"building",code:"dispensary",name:"Dispensaire",level:1}]);
assert.equal(rules.buildingLevel(state,"dispensary"),1);
assert.equal(rules.buildingWork(state,"dispensary"),null);

// Dispensaire : × (1 − 0,1 × niveau), après le minimum de 7 jours ; ce qui est en cours ne bouge pas.
const m=state.company.roster.find(x=>x.id!==state.company.captainId);
const wound=(level,days)=>{ at("dispensary",level); return rules.woundDaysFor(m,days,state); };
assert.deepEqual([7,27,48,60].map(d=>wound(0,d)),[7,27,48,60]);
assert.deepEqual([7,27,48,60].map(d=>wound(1,d)),[7,25,44,54]);
assert.deepEqual([7,27,48,60].map(d=>wound(3,d)),[5,19,34,42]);
assert.deepEqual([7,27,48,60].map(d=>wound(5,d)),[4,14,24,30]);
assert.equal(rules.campBuildingEffects(state).woundFactor,0.5);
// Bains chauds : −1 jour de fatigue par niveau, au moins 1 ; +5 % de mana par niveau.
const fatigue=(level,days)=>{ at("baths",level); return rules.fatigueDaysFor(days,state); };
assert.deepEqual([5,6,7].map(d=>fatigue(0,d)),[5,6,7]);
assert.deepEqual([5,6,7].map(d=>fatigue(2,d)),[3,4,5]);
assert.deepEqual([5,6,7].map(d=>fatigue(5,d)),[1,1,2]);
assert.equal(rules.campBuildingEffects(state).manaBonus,25);
const mage={...m,mana:0};
const plain=magic.rechargeMana({...mage}).gained,warm=magic.rechargeMana({...mage},{bonusPercent:25}).gained;
const max=magic.manaMax({character:mage,activeSet:1});
assert.ok(warm>plain||warm===max,"plus de mana avec les bains");
// La recharge du matin au camp passe par les bains.
for(const x of state.company.roster) x.mana=0;
at("baths",0); const low=rules.advanceTime(state,1)[0].mana.reduce((s,x)=>s+x.gained,0);
for(const x of state.company.roster) x.mana=0;
at("baths",5); const high=rules.advanceTime(state,1)[0].mana.reduce((s,x)=>s+x.gained,0);
assert.ok(high>low,"recharge du camp : "+low+" → "+high);

// Interface : un encart par bâtiment dans Ma Compagnie.
const elements={};
const $=id=>elements[id]||(elements[id]={innerHTML:""});
const fmt=value=>String(Math.round(Number(value)||0)).replace(/\B(?=(\d{3})+(?!\d))/g," ");
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const log=[];
const game={campaign:rules.createCampaign({captain,squad:[]})};
const js=fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8");
const documentStub={baseURI:"https://jeu.test/",body:{style:{setProperty:()=>{}}}};
const ui=new Function("game","$","fmt","esc","campaignRules","dormitoryPlacesText","tavernLog","saveGame","renderGame","document",
  js+"\nreturn {renderCampBuildings,buildCampBuilding,logCampBuildings};")(
  game,$,fmt,esc,()=>rules,places=>String(places),(message,kind)=>log.push({message,kind}),()=>{},()=>{},documentStub);
const company=()=>elements["camp-buildings"].innerHTML;
game.campaign.company.gold=10000;
ui.renderCampBuildings();
assert.match(company(),/<strong title="On y recoud[^"]*">Dispensaire<\/strong><span>À construire<\/span>/);
assert.match(company(),/data-camp-build="dispensary">Construire<\/button>\s*<span class="building-cost">500 PO · 4 jours<\/span>/);
assert.match(company(),/<strong title="Vapeur[^"]*">Bains chauds<\/strong><span>À construire<\/span>/);
ui.buildCampBuilding("dispensary");
assert.deepEqual(log.at(-1),{message:"Construction lancée : Dispensaire (niveau 1), 500 PO, prêt dans 4 jours.",kind:"gear"});
ui.renderCampBuildings();
assert.match(company(),/Dispensaire<\/strong><span>À construire<\/span><\/div>\s*<span class="building-work">Chantier en cours : niveau 1, prêt dans 4 jours\.<\/span>/);
game.campaign.company.camp.buildings={dispensary:{level:2,construction:null},baths:{level:3,construction:null}};
game.campaign.company.gold=100;
ui.renderCampBuildings();
assert.match(company(),/Dispensaire<\/strong><span>Niveau 2 · blessures −20 %<\/span>/);
assert.match(company(),/Bains chauds<\/strong><span>Niveau 3 · fatigue −3 jours, mana \+15 % par jour<\/span>/);
assert.match(company(),/data-camp-build="baths" disabled>Améliorer : niveau 4<\/button>\s*<span class="building-cost">8 000 PO · 16 jours · pas assez d’or<\/span>/);
ui.logCampBuildings([{kind:"building",code:"baths",name:"Bains chauds",level:3}]);
assert.deepEqual(log.at(-1),{message:"Bains chauds : niveau 3 terminé (fatigue −3 jours, mana +15 % par jour).",kind:"turn"});
const news=fs.readFileSync(path.join(ROOT,"prototype-web","day-news-ui.js"),"utf8");
assert.match(news,/for\(const b of report\.buildings\|\|\[\]\) entries\.push\(\{tone:"good",icon:"build",text:b\.name\+" niveau "\+fmt\(b\.level\)\}\);/);
console.log("Dispensaire et Bains chauds : barème, chantiers, blessures, fatigue, mana, Ma Compagnie — OK");
