"use strict";

// Partir fatigué (Idan, 2026-11-10) : « Un mercenaire fatigué peut partir dans toutes les missions. Il aura juste un malus de
// 20% de ses stats pour tout s'il commence le combat encore fatigué. […] Par exemple, il est fatigué pour 4 jours, mais la
// mission est à 5 jours de marche, il commencera normal. Sinon, il commencera la missions fatigué avec 80% de ses stats pour
// tout le combat. » Un blessé ne part toujours pas ; ses PV max et sa Réserve de mana restent entiers.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createMagicRules}=require("../game-core/magic.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createMissionRules}=require("../game-core/missions.js");
const Progression=require("../game-core/progression.js");
const MissionEnd=require("../game-core/mission-end.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.equal(constant("combat.fatigue.malus"),0.2,"−20 % au combat");
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);

let seed=41;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});
const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-9,msg+" : "+a+" ≠ "+b);

// 1. Le moteur : un fatigué compte pour 80 % (caractéristiques, résistances, compétences), PV max et mana entiers.
const engine=createCombatEngine(reference,{random});
const magic=createMagicRules({reference,combat:engine,random});
const merc=generator.createMercenary({id:2,captain});
const fresh={character:merc,activeSet:1,team:"player"};
const tired={...fresh,fatigued:true};
assert.equal(engine.fatigueFactor(fresh),1);
close(engine.fatigueFactor(tired),0.8,"facteur de fatigue");
for(const stat of ["Force","Dextérité","Courage","Perception"]) close(engine.baseValue(tired,stat),0.8*engine.baseValue(fresh,stat),stat);
const resistance=Object.keys(merc.resistances||{})[0];
if(resistance) close(engine.baseValue(tired,resistance),0.8*engine.baseValue(fresh,resistance),resistance);
const weaponSkill=Object.keys(merc.skills.martial).find(k=>typeof merc.skills.martial[k]==="number"&&merc.skills.martial[k]>0);
close(engine.skillValue(tired,"martial",weaponSkill),0.8*merc.skills.martial[weaponSkill],weaponSkill);
assert.ok(engine.attackPrecision(tired)<engine.attackPrecision(fresh),"il touche moins bien");
assert.ok(engine.initiative(tired)<engine.initiative(fresh),"il est plus lent");
assert.equal(engine.maxHp(tired),engine.maxHp(fresh),"ses PV max restent entiers");
assert.equal(magic.manaMax(tired),magic.manaMax(fresh),"sa Réserve de mana reste entière");
const rested=engine.rested(tired);
assert.ok(rested!==tired&&rested.fatigued===false&&rested.character===merc,"la même unité, reposée");
assert.equal(engine.rested(fresh),fresh);
assert.equal(engine.statWithGear(rested,"Endurance"),engine.statWithGear(fresh,"Endurance"),"la fin de mission lit ses valeurs reposées");

// 2. Le camp : un fatigué peut partir, un blessé non ; ses jours s'écoulent en route.
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,random,
  missions:createMissionRules({reference,random})});
const state=rules.createCampaign({captain,squad:[3,4,5].map(id=>generator.createMercenary({id,captain}))});
const [,a,b,c]=state.company.roster;
a.recovery={kind:"fatigued",daysLeft:4,sinceDay:state.day};
b.recovery={kind:"wounded",daysLeft:9,sinceDay:state.day};
assert.equal(rules.isAvailable(a,state),true,"un fatigué peut partir");
assert.equal(rules.isAvailable(b,state),false,"un blessé, non");
assert.equal(rules.isAvailable(c,state),true);
// L'exemple d'Idan : fatigué pour 4 jours, 5 jours de marche → reposé à l'arrivée. Sans offre (Mission Test) : tout de suite.
assert.equal(rules.fatigueOnArrival(a,{distance:5}),0);
assert.equal(rules.fatigueOnArrival(a,{distance:2}),1,"départ demain, 2 jours de marche : encore 1 jour");
assert.equal(rules.fatigueOnArrival(a,{distance:3}),0);
assert.equal(rules.fatigueOnArrival(a),4,"Mission Test : le combat est tout de suite");
assert.equal(rules.fatigueOnArrival(b,{distance:1}),0,"un blessé n'a pas de fatigue");
assert.equal(rules.fatigueOnArrival(c,{distance:1}),0);
// Le départ : le blessé est refusé, le fatigué part.
const offer=rules.boardOffer(state,{kind:"cleanup"});
assert.ok(offer,"un contrat au tableau");
const refused=rules.departExpedition(state,[a.id,b.id],offer.id);
assert.equal(refused.ok,false);
assert.match(refused.reason,new RegExp(b.name+" est blessée? : (il|elle) doit d’abord guérir"));
a.recovery.daysLeft=2+offer.distance;
const left=rules.fatigueOnArrival(a,offer);
assert.equal(left,1);
const trip=rules.departExpedition(state,[a.id,c.id],offer.id);
assert.ok(trip.ok,"le fatigué part avec l'escouade");
rules.advanceTime(state,1+offer.distance);
assert.equal(trip.expedition.status,"arrived");
assert.deepEqual([a.recovery?.kind,a.recovery?.daysLeft],["fatigued",left],"encore fatigué au combat, comme prévu au départ");

// 3. L'écran de combat : le drapeau au début du combat, le journal, l'aide du choix de l'escouade.
const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},parentElement:{clientWidth:900},
  classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){}});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const game={campaign:state,captain,referenceData:reference};
const mission=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
const ui=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd","campaignRules",
  mission+"\nconst logged=[];missionLog=function(message,kind){ logged.push([message,kind]); };"
  +"\nreturn {makeMissionUnit,logMissionFatigue,missionFatigueNote,missionFatigueTag,logged};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,()=>rules);
const unitA=ui.makeMissionUnit(a,"player",0),unitC=ui.makeMissionUnit(c,"player",1);
assert.deepEqual([unitA.fatigued,unitC.fatigued],[true,false]);
assert.equal(unitA.pvMax,engine.maxHp({character:a,activeSet:1}),"PV max entiers");
ui.logMissionFatigue([unitA,unitC]);
assert.equal(ui.logged.length,1);
assert.match(ui.logged[0][0],new RegExp("^"+a.name+" est encore fatiguée? : −20 % à toutes ses valeurs pour ce combat\\.$"));
assert.match(ui.missionFatigueTag(unitA),/^Fatiguée? −20 %$/);
a.recovery={kind:"fatigued",daysLeft:4};
assert.equal(ui.missionFatigueNote(a,{distance:2}),"−20 % au combat");
assert.match(ui.missionFatigueNote(a,{distance:5}),/^reposée? à l’arrivée$/);
assert.equal(ui.missionFatigueNote(a,null),"−20 % au combat","Mission Test");
assert.equal(ui.missionFatigueNote(c,{distance:2}),"");

console.log("fatigue-departure ok");
