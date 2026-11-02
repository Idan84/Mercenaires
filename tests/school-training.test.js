"use strict";

// Entraînement libre à l'École de magie (Idan, 2026-11-02) : chaque matin, le capitaine à la place choisie par le joueur
// (sans test), puis les mercenaires disponibles dans un ordre tiré au hasard ; chacun vise la salle de sa meilleure école,
// sinon la salle généraliste ; test 100 / (1 + e^(−Δ/15)) de 2 à 95 %, Δ = (Volonté − 50) / 2 + (meilleure école − 70)
// + Charisme du directeur / 10 + affinité / 10 ; gain 20 × Int / 50 × (1 + 0,1 × salle) × (1 + niveau du directeur / 100)
// × (1 + Transmission / 100) ; écoles opposées −¼ chacune ; salle généraliste : Puissance magique ; directeur +5 XP de
// Transmission du savoir par élève et par jour.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules,serializeCampaign,restoreCampaign}=require("../game-core/campaign.js");
const {createProgressionRules}=require("../game-core/progression.js");
const {createAffinityRules}=require("../game-core/affinity.js");
const {createSchoolTrainingRules}=require("../game-core/school-training.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual(["chance_slope","chance_min","chance_max","will_center","will_divisor","school_center","director_charisma_divisor",
  "director_affinity_divisor","base_xp","intelligence_divisor","room_level_bonus","director_level_divisor","transmission_divisor",
  "director_transmission_xp"].map(k=>constant("school.training."+k)),[15,2,95,50,2,70,10,10,20,50,0.1,100,100,5]);
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);

const progression=createProgressionRules({reference});
const affinity=createAffinityRules({reference});
const schools=["Feu","Eau","Foudre","Vie","Nécromancie","Illusion","Invocation","Transmutation","Télékinésie"];
const person=(id,{will=50,int=50,cha=50,power=50,best=null,value=1,transmission=0}={})=>({id,name:"M"+id,people:"Humain",
  culture:"Cités libres",alignment:"Neutre",stats:{"Volonté":will,"Intelligence":int,"Charisme":cha,"Puissance magique":power},
  skills:{magic:Object.fromEntries(schools.map(s=>[s,s===best?value:1])),camp:{"Transmission du savoir":transmission}}});

// Le test : les quatre exemples validés par Idan.
const training=createSchoolTrainingRules({reference,random:()=>0});
const pct=m=>Math.round(training.chance(m).chance);
assert.equal(pct(person(1,{best:"Feu",value:100})),88,"doué");
assert.equal(pct(person(1,{best:"Feu",value:78})),63,"recrue moyenne");
assert.equal(pct(person(1,{will:40,best:"Feu",value:40})),9,"peu doué");
assert.equal(pct(person(1)),2,"sans école : le minimum");
assert.equal(training.bestSchool(person(1)).school,null);
assert.deepEqual(training.bestSchool(person(1,{best:"Vie",value:61})),{school:"Vie",value:61});
// Le directeur : + Charisme / 10 + affinité / 10 (affinité calculée comme avec le capitaine).
const withAffinity=createSchoolTrainingRules({reference,affinity});
const boss=person(9,{cha:60,best:"Feu",value:100,power:80,transmission:48});
const student=person(1,{best:"Feu",value:78});
const liking=affinity.affinity(boss,student).initial;
assert.ok(Number.isFinite(liking)&&liking>0,"même peuple, même culture, même alignement");
const detail=withAffinity.chance(student,boss);
assert.deepEqual([detail.parts.charisma,detail.parts.affinity],[6,liking/10]);
assert.ok(Math.abs(detail.delta-(8+6+liking/10))<1e-9);
assert.ok(detail.chance>withAffinity.chance(student).chance,"le directeur aide");

// Le gain : les exemples validés (arrondis).
const hall={code:"magic_school",school:null,level:1};
const room=(school,level)=>({code:"magic_room_x",school,level});
assert.equal(training.dailyXp(person(1,{int:54}),room("Feu",1)),24,"salle 1, sans directeur");
assert.equal(training.dailyXp(person(1,{int:54}),room("Feu",3),boss),83,"salle 3, directeur à 100, Transmission 48");
const master=person(8,{best:"Feu",value:120,transmission:70});
assert.equal(training.dailyXp(person(1,{int:70}),room("Feu",10),master),209,"salle 10, directeur à 120, Transmission 70");
assert.equal(training.directorLevel(boss,hall),80,"salle généraliste : sa Puissance magique");
assert.equal(training.dailyXp(person(1,{int:50}),hall,boss),Math.round(20*1*1.1*1.8*1.48));
// L'XP : l'école et ses opposées (−¼ chacune), ou la Puissance magique.
assert.deepEqual(training.xpOf(room("Feu",1),40),{skills:{magic:{Feu:40,"Télékinésie":-10,Eau:-10}}});
assert.deepEqual(training.xpOf(hall,40),{stats:{"Puissance magique":40}});

// Une journée : le capitaine d'abord, sans test ; les places limitent ; ceux qui ratent vont à la taverne.
let dice=[];
const day=createSchoolTrainingRules({reference,random:()=>dice.length?dice.shift():0,progression});
const cap=person(100,{best:"Feu",value:50,int:50});
const fire1=person(1,{best:"Feu",value:100}),fire2=person(2,{best:"Feu",value:100}),none=person(3),weak=person(4,{will:40,best:"Eau",value:40});
const rooms=[{code:"magic_school",school:null,level:1,places:1},{code:"magic_room_fire",school:"Feu",level:1,places:1}];
// Ordre tiré : Fisher–Yates (3 tirages à 0 : [fire2, none, weak, fire1]), puis les jets.
dice=[0,0,0, 0.5,0.5,0.5];
const result=day.runDay({rooms,candidates:[fire1,fire2,none,weak],captain:cap,captainChoice:"magic_room_fire",director:null});
const byId=Object.fromEntries(result.entries.map(e=>[e.id,e]));
assert.deepEqual([byId[100].code,byId[100].captain,byId[100].chance],["magic_room_fire",true,null],"le capitaine prend sa place sans test");
assert.equal(byId[2].code,"magic_school","la salle du Feu est prise : il va dans la salle généraliste");
assert.equal(byId[2].chance,88.1);
assert.ok(fire2.xp.stats["Puissance magique"]>10*50*50,"salle généraliste : de l'XP de Puissance magique (la valeur est entière)");
assert.equal(fire2.xp.skills?.magic?.Feu,undefined,"pas d'XP d'école dans la salle généraliste");
assert.deepEqual([byId[3].code,byId[3].full],[null,true],"plus de place : la taverne, sans test");
assert.deepEqual([byId[4].code,byId[1].code],[null,null]);
assert.ok(cap.skills.magic.Feu>50&&cap.skills.magic.Eau<1+1e-9,"le capitaine gagne en Feu, l'Eau ne descend pas sous 1");
assert.equal(result.directorXp,0,"pas de directeur");
// Avec un directeur : il ne s'entraîne pas lui-même et gagne 5 XP de Transmission par élève.
dice=[0,0, 0,0];
const dir=person(50,{cha:60,best:"Feu",value:100,transmission:40});
const t0=dir.skills.camp["Transmission du savoir"];
const r2=day.runDay({rooms:[{code:"magic_school",school:null,level:2,places:2}],candidates:[fire1,fire2],director:dir});
assert.equal(r2.entries.filter(e=>e.code).length,2);
assert.equal(r2.directorXp,10);
assert.ok(dir.skills.camp["Transmission du savoir"]>t0);
// Test raté.
dice=[0.99]; // un seul candidat : pas de tirage d’ordre, seulement le jet
assert.equal(day.runDay({rooms:[{code:"magic_school",school:null,level:1,places:1}],candidates:[weak]}).entries[0].code,null);

// Dans la campagne : chaque matin, ceux qui sont au camp ; le choix du capitaine est gardé.
let seed=3;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,progression,affinity,random});
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6,7].map(id=>generator.createMercenary({id,captain}))});
const [, wounded, steward, mage, ...others]=state.company.roster;
assert.equal(rules.runSchoolDay(state),null,"pas d'École : pas d'entraînement");
assert.deepEqual(rules.schoolRooms(state),[]);
state.company.camp.buildings={magic_school:{level:3,construction:null},magic_room_fire:{level:2,construction:null}};
assert.deepEqual(rules.schoolRooms(state).map(r=>[r.code,r.school,r.level,r.places]),[["magic_school",null,3,2],["magic_room_fire","Feu",2,2]]);
assert.deepEqual(rules.setCaptainTraining(state,"magic_room_water"),{ok:false,reason:"Cette salle n’est pas construite."});
assert.deepEqual(rules.setCaptainTraining(state,"magic_room_fire"),{ok:true,code:"magic_room_fire"});
assert.equal(rules.captainTraining(state),"magic_room_fire");
wounded.recovery={kind:"wounded",daysLeft:5};
state.company.intendantId=steward.id;
for(const m of state.company.roster) m.stats["Volonté"]=95;
for(const m of state.company.roster) for(const s of schools) m.skills.magic[s]=1;
for(const m of [mage,...others]) m.skills.magic.Feu=150;
const [report]=rules.advanceTime(state,1);
assert.ok(report.school,"le rapport du matin");
const ids=report.school.entries.map(e=>e.id);
assert.ok(!ids.includes(wounded.id),"pas les blessés");
assert.ok(!ids.includes(steward.id),"pas l'intendant");
assert.deepEqual(report.school.entries.filter(e=>e.captain).map(e=>[e.id,e.code]),[[captain.id,"magic_room_fire"]]);
const placed=report.school.entries.filter(e=>e.code);
assert.equal(placed.length,4,"2 + 2 places, toutes prises");
assert.equal(placed.filter(e=>e.code==="magic_room_fire").length,2);
assert.deepEqual(rules.schoolDayOf(state).entries.map(e=>e.id),ids,"la journée est gardée pour l'affichage");
assert.equal(rules.schoolEntryOf(state,captain.id).code,"magic_room_fire");
const restored=restoreCampaign(serializeCampaign(state)).state;
assert.equal(restored.company.camp.captainTraining,"magic_room_fire");
assert.equal(restored.company.camp.schoolDay.day,state.day);
// En mission : pas d'entraînement (une expédition, même programmée).
state.expeditions=[{id:"x",memberIds:others.map(m=>m.id),status:"scheduled",departDay:state.day+1}];
const [next]=rules.advanceTime(state,1);
assert.ok(next.school.entries.every(e=>!others.some(m=>m.id===e.id)));
state.expeditions=[];

// Interface : places prises au survol, choix du capitaine, journal, fiche.
const elements={};
const $=id=>elements[id]||(elements[id]={innerHTML:""});
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const log=[];
const game={campaign:state};
const js=fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8");
const ui=new Function("game","$","fmt","esc","campaignRules","dormitoryPlacesText","tavernLog","saveGame","renderGame","document",
  js+"\nreturn {renderCampBuildings,chooseCaptainTraining,logSchoolDay};")(
  game,$,fmt,esc,()=>rules,String,(message,kind)=>log.push({message,kind}),()=>{},()=>{},{baseURI:"https://jeu.test/",body:{style:{setProperty:()=>{}}}});
rules.advanceTime(state,1);
ui.renderCampBuildings();
const html=elements["camp-buildings"].innerHTML;
const fireStudents=rules.schoolDayOf(state).entries.filter(e=>e.code==="magic_room_fire");
assert.match(html,new RegExp(`Salle du Feu<\\/strong><span>Niveau 2 · <span class="building-places" title="Aujourd’hui : [^"]+">${fireStudents.length}\\/2 places<\\/span>`));
assert.match(html,/<label class="building-captain"[^>]*>Le capitaine\s*<select data-captain-training><option value="">À la taverne<\/option><option value="magic_school">Salle généraliste<\/option><option value="magic_room_fire" selected>Salle du Feu<\/option><\/select><\/label>/);
ui.chooseCaptainTraining("magic_school");
assert.equal(state.company.camp.captainTraining,"magic_school");
assert.deepEqual(log.at(-1),{message:"Dès demain matin, le capitaine s’entraîne : salle généraliste.",kind:"info"});
ui.chooseCaptainTraining("");
assert.equal(state.company.camp.captainTraining,null);
assert.equal(log.at(-1).message,"Dès demain, le capitaine passe ses journées à la taverne.");
ui.logSchoolDay({entries:[{code:"magic_school"},{code:null},{code:"magic_room_fire"}]});
assert.deepEqual(log.at(-1),{message:"École de magie : 2 élèves aujourd’hui.",kind:"turn"});
const tavern=fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8");
assert.match(tavern,/if\(typeof logSchoolDay==="function"\) logSchoolDay\(report\.school\);/);
assert.match(tavern,/rechargeMana:\(character,options\)=>magicRules\(\)\.rechargeMana\(character,options\)/,"les Bains chauds comptent dans la recharge du mana");
const page=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.ok(page.indexOf('<script src="/core/school-training.js"></script>')>0&&page.indexOf('<script src="/core/school-training.js"></script>')<page.indexOf('<script src="/core/campaign.js"></script>'));
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8"),/predilectionCard\("Aujourd’hui",/);

console.log("Entraînement libre : test, gain, capitaine prioritaire, places, directeur, matin du camp, interface — OK");
