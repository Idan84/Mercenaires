"use strict";

// L'agenda d'un mercenaire au camp (refonte technique, Idan, 2026-11-04 : « Ok pour A ») : les apprentissages et les corvées
// inscrits une fois, au lieu d'être reliés deux à deux ; une corvée d'aujourd'hui n'empêche pas d'organiser demain
// (Idan, 2026-11-04 : « Oui »). Celui-ci vérifie l'agenda lui-même et que chaque activité voit toutes les autres.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createAgenda}=require("../game-core/agenda.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");

// 1. Le module seul : l'ordre d'inscription, soi-même exclu, les corvées entre elles seulement pour demain.
const table={};
const fake=(key,chore)=>({
  busyReason:(state,id)=>table[key]?.[id]?`${key} ${table[key][id]}`:null,
  ...(chore?{tomorrowReason:(state,id)=>table[key]?.[id]==="demain"?`${key} demain`:null}:{})
});
const agenda=createAgenda().add("study",fake("study")).add("absent",null).add("wood",fake("wood",true),{chore:true}).add("stone",fake("stone",true),{chore:true});
assert.deepEqual(agenda.keys(),["study","wood","stone"],"un module absent n'est pas inscrit");
assert.equal(agenda.reason({},1),null);
table.wood={1:"aujourd’hui"};
table.stone={1:"demain"};
assert.deepEqual(agenda.entryOf({},1),{key:"wood",reason:"wood aujourd’hui"},"la première dans l'ordre d'inscription");
assert.equal(agenda.elsewhere("wood",{},1),"stone demain");
assert.equal(agenda.tomorrowReason({},1),"stone demain");
table.stone={};
assert.equal(agenda.reason({},1),"wood aujourd’hui","pas d'entraînement libre aujourd'hui");
assert.equal(agenda.tomorrowReason({},1),null,"une corvée d'aujourd'hui n'empêche pas d'organiser demain");
assert.equal(agenda.elsewhere("study",{},1),null);
assert.equal(agenda.elsewhere("stone",{},1),null,"bûcheron aujourd'hui, mineur demain : possible");
table.wood={1:"demain"};
assert.equal(agenda.elsewhere("stone",{},1),"wood demain","une seule corvée par jour");
assert.equal(agenda.elsewhere("study",{},1),"wood demain");
table.study={1:"demain"};
assert.equal(agenda.elsewhere("wood",{},1),"study demain","un apprentissage compte, demain comme aujourd'hui");

// 2. Dans la campagne : les cinq activités, chacune bloquée par les autres avec la même raison.
const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
let seed=31,dice=[];
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,
  random:()=>dice.length?dice.shift():0.999});
assert.deepEqual(rules.agenda.keys(),["dungeon","spell","armor","poison","taming","lumber","mine","palace"]);
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6].map(id=>generator.createMercenary({id,captain}))});
state.company.intendantId=null;
state.company.camp.buildings={survival_academy:{level:3,construction:null},alchemy_lab:{level:3,construction:null},
  lumber_camp:{level:3,construction:null},miners_guild:{level:3,construction:null}};
const [, a, b, c, d, e]=state.company.roster;
// Aucun ne sait rien encore : chaque activité arrive bien jusqu'à « ce qui le retient ailleurs ».
for(const m of [a,b,c,d,e]){
  for(const port of ["légère","intermédiaire","lourde"]) m.skills.martial["Port d’armure "+port]=false;
  delete m.skills.martial["Empoisonnement des armes"];
}
// a : une armure, b : l'empoisonnement, c : bûcheron, d : mineur, e : un sort (inscrit directement).
dice=[0,0,0,0];
assert.equal(rules.armorStudy.offer(state,a.id).accepted,true);
assert.equal(rules.poisonStudy.offer(state,b.id).accepted,true);
assert.equal(rules.lumberjacks.send(state,c.id).ok,true);
assert.equal(rules.miners.send(state,d.id).ok,true);
state.company.camp.studies.push({id:"study-test",status:"planned",studentId:e.id,spellCode:"x",room:"magic_room_fire"});
const reasons=new Map([[a,"Il entre à l’Académie de la survie demain matin."],[b,"Il entre au Labo d’alchimie demain matin."],
  [c,"Il part bûcheronner demain matin."],[d,"Il descend à la mine demain matin."],[e,"Il entre à l’École de magie demain matin."]]);
const asks={
  armor:m=>rules.armorStudy.canStudy(state,m),poison:m=>rules.poisonStudy.canStudy(state,m),
  lumber:m=>rules.lumberjacks.canSend(state,m),mine:m=>rules.miners.canSend(state,m)
};
for(const [m,reason] of reasons){
  assert.equal(rules.studyBusy(state,m),reason,m.name);
  for(const [key,ask] of Object.entries(asks)){
    const own=(key==="armor"&&m===a)||(key==="poison"&&m===b)||(key==="lumber"&&m===c)||(key==="mine"&&m===d);
    if(!own) assert.equal(ask(m).reason,reason,`${key} : ${m.name}`);
  }
}

// Une corvée dure jusqu'à ce qu'on le retire (Idan, 2026-11-04) : il y est encore demain. Retiré aujourd'hui, il n'y est plus
// demain : un apprentissage, une mission, une garde du corps ou une autre corvée pour demain, oui (« Oui »).
const camp=state.company.camp;
camp.armorStudies=[];camp.poisonStudies=[];camp.studies=[];camp.miners=[];
camp.lumberjacks=[{id:c.id,startDay:state.day,approach:null}];
assert.equal(rules.agenda.reason(state,c.id),"Il bûcheronne.");
assert.equal(rules.studyBusy(state,c),"Il bûcheronne.");
assert.equal(rules.miners.canSend(state,c).reason,"Il bûcheronne.");
assert.equal(rules.lumberjacks.withdraw(state,c.id).ok,true);
assert.equal(rules.studyBusy(state,c),null);
assert.deepEqual(rules.armorStudy.canStudy(state,c).ok,true);
assert.deepEqual(rules.poisonStudy.canStudy(state,c).ok,true);
assert.deepEqual(rules.miners.canSend(state,c).ok,true);
state.missionBoard={offer:{id:"contrat",code:"cleanup",distance:1}};
assert.equal(rules.departExpedition(state,[c.id,d.id,e.id]).ok,true,"il part en mission demain matin");
assert.equal(rules.expeditionOf(state,c.id)?.status,"scheduled");

// 3. campaign.js ne relie plus les activités deux à deux.
const campaign=fs.readFileSync(path.join(ROOT,"game-core","campaign.js"),"utf8");
assert.doesNotMatch(campaign,/aptitudeBusy|workBusy|lumberBusy|other\(\)\?\.tomorrowReason/);
assert.equal((campaign.match(/busyElsewhere:elsewhere\(/g)||[]).length,4,"sorts, apprentissages, corvées, apprivoisement");
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.ok(index.indexOf('<script src="/core/agenda.js">')>0&&index.indexOf('<script src="/core/agenda.js">')<index.indexOf('<script src="/core/campaign.js">'));

console.log("Agenda : apprentissages et corvées inscrits une fois, chacun voit tous les autres, une corvée par jour — OK");
