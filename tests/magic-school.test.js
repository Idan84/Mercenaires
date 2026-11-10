"use strict";

// École de magie (Idan, 2026-11-01) : à construire, puis 10 niveaux ; une salle par école de magie, 10 niveaux, au plus
// au niveau atteint par l'École (le niveau en chantier ne compte pas). Même barème que les autres bâtiments du camp
// (niveau n = 1 000 × n² PO et 4 × n jours), un chantier par bâtiment et par salle. Pas encore d'effet.
// Encart dans Ma Compagnie, les salles dedans (prototype-web/camp-buildings-ui.js). Doc 11 §7.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules,serializeCampaign,restoreCampaign}=require("../game-core/campaign.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
let seed=5;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference});
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3].map(id=>generator.createMercenary({id,captain}))});

// Données : l'École, puis une salle par école de magie (les neuf de skills.json).
const rows=reference.campBuildings.rows;
const school=rows.find(r=>r.code==="magic_school");
assert.deepEqual([school.nom,school.niveaux,school.prix_base,school.jours_base,school.requiert],["École de magie",10,500,4,null]);
const rooms=rows.filter(r=>r.requiert==="magic_school"&&r.ecole);
// Et la Salle du Bâton (Idan, 2026-11-04 : « On va mettre l'entraînement aux bâtons dans l'école de magie »).
const staff=rows.find(r=>r.code==="magic_room_staff");
assert.deepEqual([staff.nom,staff.requiert,staff.ecole,staff.entraine],["Salle du Bâton","magic_school",null,"Bâtons"]);
const schools=reference.skills.rows.filter(r=>r.domaine==="Magie"&&r.ecoles_opposees).map(r=>r.nom);
assert.equal(schools.length,9);
assert.deepEqual(rooms.map(r=>r.ecole).sort(),[...schools].sort(),"une salle par école de magie");
assert.deepEqual(rooms.map(r=>r.nom),["Salle du Feu","Salle de l’Eau","Salle de la Foudre","Salle de la Vie","Salle de la Nécromancie",
  "Salle de l’Illusion","Salle de l’Invocation","Salle de la Transmutation","Salle de la Télékinésie"]);
for(const r of rooms) assert.deepEqual([r.niveaux,r.prix_base,r.jours_base,r.soins_par_niveau,r.fatigue_jours_par_niveau,r.mana_par_niveau],[10,500,4,0,0,0],r.nom);
for(const r of rows) assert.deepEqual(Object.keys(r),reference.campBuildings.columns.map(c=>c.key),r.code+" : toutes les colonnes");
assert.equal(reference.campBuildings.row_count,rows.length);
assert.deepEqual(rules.campRoomCodes("magic_school"),[...rooms.map(r=>r.code),"magic_room_staff"]);
assert.deepEqual(rules.campRoomCodes("dispensary"),[]);

// Barème de l'École : 1 000 × n² PO et 4 × n jours, jusqu'au niveau 10.
const at=(code,level)=>{ state.company.camp.buildings={...state.company.camp.buildings,[code]:{level,construction:null}}; };
const costs=[];
for(let n=1;n<=10;n++){ at("magic_school",n-1); costs.push(rules.nextBuildingLevel(state,"magic_school")); }
assert.deepEqual(costs.map(c=>[c.level,c.gold,c.days]),[[1,500,4],[2,2000,8],[3,4500,12],[4,8000,16],[5,12500,20],
  [6,18000,24],[7,24500,28],[8,32000,32],[9,40500,36],[10,50000,40]]);
assert.equal(costs[0].requires,undefined,"l'École ne dépend de rien");
at("magic_school",10);
assert.equal(rules.nextBuildingLevel(state,"magic_school"),null);

// Une salle monte au plus jusqu'au niveau de l'École.
state.company.camp.buildings={};
state.company.gold=1e6;
assert.deepEqual(rules.nextBuildingLevel(state,"magic_room_fire"),
  {code:"magic_room_fire",name:"Salle du Feu",level:1,gold:500,days:4,requires:{code:"magic_school",name:"École de magie",level:1},locked:true});
assert.deepEqual(rules.startBuilding(state,"magic_room_fire"),{ok:false,reason:"Salle du Feu : il faut d’abord École de magie au niveau 1.",
  cost:rules.nextBuildingLevel(state,"magic_room_fire")});
assert.equal(state.company.gold,1e6,"rien n'est payé");
// L'École en chantier ne compte pas encore.
const day=state.day;
assert.equal(rules.startBuilding(state,"magic_school").ok,true);
assert.equal(rules.nextBuildingLevel(state,"magic_room_fire").locked,true);
rules.advanceTime(state,4);
assert.equal(rules.buildingLevel(state,"magic_school"),1);
assert.equal(rules.nextBuildingLevel(state,"magic_room_fire").locked,false);
// Salles en parallèle de l'École et entre elles ; le chantier ne garde ni requires ni locked.
const gold=state.company.gold;
const fire=rules.startBuilding(state,"magic_room_fire");
assert.deepEqual(fire,{ok:true,construction:{kind:"building",code:"magic_room_fire",name:"Salle du Feu",level:1,gold:500,days:4,startDay:day+4,endDay:day+8}});
assert.equal(rules.startBuilding(state,"magic_room_water").ok,true);
assert.equal(rules.startBuilding(state,"magic_school").ok,true,"l'École monte en même temps");
assert.equal(state.company.gold,gold-500-500-2000);
assert.deepEqual(rules.startBuilding(state,"magic_room_fire"),{ok:false,reason:"Un chantier est déjà en cours : Salle du Feu."});
const restored=restoreCampaign(serializeCampaign(state)).state;
assert.equal(restored.company.camp.buildings.magic_room_fire.construction.endDay,day+8);
const reports=rules.advanceTime(state,4);
assert.deepEqual(reports[3].buildings.map(b=>[b.code,b.level]),[["magic_room_fire",1],["magic_room_water",1]]);
// Salle au niveau de l'École : bloquée jusqu'à ce que l'École monte.
assert.equal(rules.buildingLevel(state,"magic_school"),1);
assert.equal(rules.nextBuildingLevel(state,"magic_room_fire").locked,true);
assert.equal(rules.startBuilding(state,"magic_room_fire").reason,"Salle du Feu : il faut d’abord École de magie au niveau 2.");
rules.advanceTime(state,4);
assert.equal(rules.buildingLevel(state,"magic_school"),2);
assert.deepEqual(rules.nextBuildingLevel(state,"magic_room_fire"),
  {code:"magic_room_fire",name:"Salle du Feu",level:2,gold:2000,days:8,requires:{code:"magic_school",name:"École de magie",level:2},locked:false});
at("magic_school",10); at("magic_room_fire",10);
assert.equal(rules.nextBuildingLevel(state,"magic_room_fire"),null,"niveau 10 au plus");
// Places (Idan, 2026-11-01) : 1 place, +1 tous les 2 niveaux, pour l'École (salle généraliste) comme pour chaque salle ;
// 60 places quand tout est au niveau 10.
assert.deepEqual([school.places_base,school.places_pas],[1,2]);
for(const r of rooms) assert.deepEqual([r.places_base,r.places_pas],[1,2],r.nom);
// Ludus, Académie de la survie, Cercle des Fines Lames (Idan, 2026-11-03) : les places viendront avec leur entraînement.
// La Grange du dresseur et ses Écuries (Idan, 2026-11-07) : des places pour les montures (places_par_niveau), pas pour des élèves.
for(const r of rows.filter(r=>!r.places_pas)) assert.ok(["dispensary","baths","pleasure_palace","dungeon","trainer_barn","trainer_stables","trainer_kennel","canteen","cellar"].includes(r.code)||r.entraine,r.code);
const places=[];
for(let n=0;n<=10;n++){ at("magic_room_water",n); places.push(rules.buildingPlaces(state,"magic_room_water")); }
assert.deepEqual(places,[0,1,2,2,3,3,4,4,5,5,6]);
assert.equal(rules.buildingPlaces(state,"dispensary"),0);
for(const code of ["magic_school",...rooms.map(r=>r.code)]) at(code,10);
assert.equal(["magic_school",...rooms.map(r=>r.code)].reduce((sum,code)=>sum+rules.buildingPlaces(state,code),0),60);
// Pas encore d'effet : les bâtiments de soins ne bougent pas.
assert.deepEqual(rules.campBuildingEffects(state),{woundFactor:1,medicFactor:1,fatigueRelief:0,manaBonus:0,bodyguardPay:0,stablePlaces:0,kennelPlaces:0,greenhousePlaces:0});

// Interface : l'encart de l'École dans Ma Compagnie, ses salles dedans une fois construite.
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
assert.match(company(),/<strong title="Grimoires[^"]*">École de magie<\/strong><span>À construire<\/span>/);
assert.match(company(),/data-camp-build="magic_school">Construire<\/button>\s*<span class="building-cost">500 PO · 4 jours<\/span>/);
assert.doesNotMatch(company(),/Salle du Feu/,"pas de salle avant l'École");
assert.equal((company().match(/<article /g)||[]).length,15,"dortoir, dispensaire, bains, École, Ludus, Académie de la survie, Cercle, Tour de guet, Labo d’alchimie, Cabane du bûcheron, Guilde des mineurs, Caverne de la terreur, Palais des plaisirs, Cachot, Grange du dresseur : les salles ne sont pas des encarts à part");
ui.buildCampBuilding("magic_room_fire");
assert.deepEqual(log.at(-1),{message:"Salle du Feu : il faut d’abord École de magie au niveau 1.",kind:"bad"});
game.campaign.company.camp.buildings={magic_school:{level:2,construction:null},magic_room_fire:{level:2,construction:null},
  magic_room_water:{level:1,construction:{kind:"building",code:"magic_room_water",name:"Salle de l’Eau",level:2,gold:4000,days:8,startDay:1,endDay:game.campaign.day+3}}};
ui.renderCampBuildings();
assert.match(company(),/École de magie<\/strong><span>Niveau 2 · <span class="building-places" title="Personne aujourd’hui">0\/2 places<\/span><\/span>/);
assert.equal((company().match(/class="building-room /g)||[]).length,10,"les neuf salles des écoles et la Salle du Bâton");
assert.match(company(),/<strong title="Elle monte au plus jusqu’au niveau de l’École de magie\.">Salle du Feu<\/strong><span>Niveau 2 · <span class="building-places" title="Personne aujourd’hui">0\/2 places<\/span><\/span><\/div>\s*<div class="building-action"><button type="button" class="primary" data-camp-build="magic_room_fire" disabled>Améliorer : niveau 3<\/button>\s*<span class="building-cost">4 500 PO · 12 jours · École de magie niveau 3 requise<\/span>/);
assert.match(company(),/Salle de l’Eau<\/strong><span>Niveau 1 · <span class="building-places" title="Personne aujourd’hui">0\/1 place<\/span><\/span><\/div>\s*<span class="building-work">Chantier en cours : niveau 2, prêt dans 3 jours\.<\/span>/);
assert.match(company(),/Salle de la Foudre<\/strong><span>À construire<\/span><\/div>\s*<div class="building-action"><button type="button" class="primary" data-camp-build="magic_room_lightning">Construire<\/button>\s*<span class="building-cost">500 PO · 4 jours<\/span>/);
ui.buildCampBuilding("magic_room_lightning");
assert.deepEqual(log.at(-1),{message:"Construction lancée : Salle de la Foudre (niveau 1), 500 PO, prêt dans 4 jours.",kind:"gear"});
ui.logCampBuildings([{kind:"building",code:"magic_room_lightning",name:"Salle de la Foudre",level:1},{kind:"building",code:"magic_school",name:"École de magie",level:3}]);
assert.deepEqual(log.slice(-2).map(l=>l.message),["Salle de la Foudre : niveau 1 terminé.","École de magie : niveau 3 terminé."]);
console.log("École de magie : 10 niveaux, 9 salles au plus au niveau de l'École, chantiers, Ma Compagnie — OK");
