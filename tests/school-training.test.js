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
  "director_transmission_xp"].map(k=>constant("school.training."+k)),[15,2,95,50,2,70,10,10,80,50,0.1,100,100,20]);
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
assert.equal(training.dailyXp(person(1,{int:54}),room("Feu",1)),95,"salle 1, sans directeur (XP doublée deux fois, Idan, 2026-11-07 et 2026-11-08)");
assert.equal(training.dailyXp(person(1,{int:54}),room("Feu",3),boss),332,"salle 3, directeur à 100, Transmission 48");
const master=person(8,{best:"Feu",value:120,transmission:70});
assert.equal(training.dailyXp(person(1,{int:70}),room("Feu",10),master),838,"salle 10, directeur à 120, Transmission 70");
assert.equal(training.directorLevel(boss,hall),80,"salle généraliste : sa Puissance magique");
assert.equal(training.dailyXp(person(1,{int:50}),hall,boss),Math.round(80*1*1.1*1.8*1.48));
// L'XP : l'école et ses opposées (−¼ chacune), ou la Puissance magique.
assert.deepEqual(training.xpOf(room("Feu",1),40),{skills:{magic:{Feu:40,"Télékinésie":-10,Eau:-10}}});
assert.deepEqual(training.xpOf(hall,40),{stats:{"Puissance magique":40}});

// Une journée (Idan, 2026-11-03 : « Là où il est le plus doué à 75 % de chance, sinon au hasard ») : le capitaine d'abord,
// sans test ; puis chacun, à 75 %, là où il se classe le mieux dans la compagnie parmi les places libres, sinon au hasard ;
// plus de place : la taverne, sans test.
let dice=[];
const day=createSchoolTrainingRules({reference,random:()=>dice.length?dice.shift():0,progression});
const cap=person(100,{best:"Feu",value:50,int:50});
const fire1=person(1,{best:"Feu",value:100}),fire2=person(2,{best:"Feu",value:100}),none=person(3),weak=person(4,{will:40,best:"Eau",value:40});
const rooms=[{code:"magic_school",school:null,level:1,places:1},{code:"magic_room_fire",school:"Feu",level:1,places:1}];
// Ordre tiré : Fisher–Yates (3 tirages à 0 : [fire2, none, weak, fire1]) ; fire2 : talent (0,5 < 0,75), puis son test.
dice=[0,0,0, 0.5,0.5];
const result=day.runDay({rooms,candidates:[fire1,fire2,none,weak],captain:cap,captainChoice:"magic_room_fire",director:null});
const byId=Object.fromEntries(result.entries.map(e=>[e.id,e]));
assert.deepEqual([byId[100].code,byId[100].captain,byId[100].chance],["magic_room_fire",true,null],"le capitaine prend sa place sans test");
assert.deepEqual([byId[2].code,byId[2].talent],["magic_school",true],"la salle du Feu est prise : la seule place libre");
assert.equal(byId[2].chance,88.1,"à l'École, le test de l'École");
assert.ok(fire2.xp.stats["Puissance magique"]>10*50*50,"salle généraliste : de l'XP de Puissance magique (la valeur est entière)");
assert.equal(fire2.xp.skills?.magic?.Feu,undefined,"pas d'XP d'école dans la salle généraliste");
for(const id of [3,4,1]) assert.deepEqual([byId[id].code,byId[id].full],[null,true],"plus de place : la taverne, sans test");
assert.ok(cap.skills.magic.Feu>50&&cap.skills.magic.Eau<1+1e-9,"le capitaine gagne en Feu, l'Eau ne descend pas sous 1");
assert.equal(result.directorXp,0,"pas de directeur");
// Avec un directeur : il ne s'entraîne pas lui-même et gagne 20 XP de Transmission par élève de l'École (XP doublée deux fois, Idan, 2026-11-07 et 2026-11-08).
dice=[0, 0.5,0, 0.5,0];
const dir=person(50,{cha:60,best:"Feu",value:100,transmission:40});
const t0=dir.skills.camp["Transmission du savoir"];
const r2=day.runDay({rooms:[{code:"magic_school",school:null,level:2,places:2}],candidates:[fire1,fire2],director:dir});
assert.equal(r2.entries.filter(e=>e.code).length,2);
assert.equal(r2.directorXp,40);
assert.ok(dir.skills.camp["Transmission du savoir"]>t0);
// Test raté : un seul candidat, pas de tirage d'ordre ; talent, puis le jet.
dice=[0.5,0.99];
assert.equal(day.runDay({rooms:[{code:"magic_school",school:null,level:1,places:1}],candidates:[weak]}).entries[0].code,null);

// Le rang : la part de ses camarades qu'il dépasse (égalité : la moitié), pour ce que travaille la salle.
const brute=person(10),thinker=person(11,{best:"Feu",value:90}),other=person(12);
brute.stats.Force=80;thinker.stats.Force=40;other.stats.Force=40;
const forceRoom={code:"ludus_force",building:"ludus",trains:"Force",learnWith:"Endurance",level:1,places:1};
const fireRoom={code:"magic_room_fire",building:"magic_school",school:"Feu",level:1,places:1};
const peers=[brute,thinker,other];
assert.deepEqual([day.valueOf(brute,forceRoom),day.valueOf(thinker,fireRoom),day.valueOf(brute,{code:"magic_school"})],[80,90,50]);
assert.deepEqual([day.rankOf(brute,forceRoom,peers),day.rankOf(thinker,forceRoom,peers),day.rankOf(thinker,fireRoom,peers)],[1,0.25,1]);
assert.equal(day.bestRoom(brute,[fireRoom,forceRoom],peers),forceRoom,"il va là où il dépasse le plus de monde");
assert.equal(day.bestRoom(thinker,[fireRoom,forceRoom],peers),fireRoom);
// Hors École : le test de la Volonté seule ; le gain avec la caractéristique du bâtiment.
assert.equal(Math.round(day.trainingChance(person(1)).chance),50);
assert.equal(Math.round(day.trainingChance(person(1,{will:80})).chance*10)/10,73.1);
brute.stats.Endurance=60;
assert.equal(day.dailyXp(brute,forceRoom),106,"80 × 60 / 50 × 1,1 (XP doublée deux fois, Idan, 2026-11-07 et 2026-11-08)");
// Une journée au Ludus : à 75 %, là où il est le plus doué ; sinon au hasard.
dice=[0.2, 0.5,0.1, 0.5,0.1];
const r3=day.runDay({rooms:[fireRoom,{...forceRoom}],candidates:[brute,thinker],company:peers});
const by3=Object.fromEntries(r3.entries.map(e=>[e.id,e]));
assert.deepEqual([by3[11].code,by3[10].code],["magic_room_fire","ludus_force"],"chacun là où il est le plus doué");
assert.ok(brute.xp.stats.Force>0,"une caractéristique monte");
dice=[0.9,0.6,0.1];
const r4=day.runDay({rooms:[fireRoom,{...forceRoom}],candidates:[thinker],company:peers});
assert.deepEqual([r4.entries[0].talent,r4.entries[0].code],[false,"ludus_force"],"au hasard (0,9 ≥ 0,75) : pas là où il est le plus doué");
// L'XP selon ce que travaille la salle : une résistance, une arme (les autres reculent comme en combat).
const tough={stats:{},resistances:{"Résistance au feu":4},skills:{martial:{"Lames longues":30,"Haches":20,"Lames courtes":10}}};
assert.deepEqual(day.xpOf({trains:"Résistance au feu"},20,tough),{resistances:{"Résistance au feu":20}});
assert.deepEqual(day.xpOf({trains:"Lames longues"},20,tough),{skills:{martial:{"Lames longues":20,"Haches":-5,"Lames courtes":-5}}});

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
// Le capitaine : une ligne sous les bâtiments, ses salles rangées par bâtiment (Idan, 2026-11-03).
assert.match(html,/<label class="building-captain"[^>]*>Le capitaine\s*<select data-captain-training><option value="">À la taverne<\/option><optgroup label="École de magie"><option value="magic_school">Salle généraliste<\/option><option value="magic_room_fire" selected>Salle du Feu<\/option><\/optgroup><\/select><\/label>/);
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
