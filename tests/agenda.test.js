"use strict";

// L'agenda d'un mercenaire au camp (refonte technique, Idan, 2026-11-04 : « Ok pour A ») : les apprentissages et les corvées
// inscrits une fois, au lieu d'être reliés deux à deux. Aucune règle ne change : les tests de chaque activité restent tels
// quels ; celui-ci vérifie l'agenda lui-même et que chaque activité voit toutes les autres.
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
assert.equal(agenda.elsewhere("study",{},1),"wood aujourd’hui","une corvée aujourd'hui retient un apprentissage");
table.stone={};
assert.equal(agenda.elsewhere("stone",{},1),null,"bûcheron aujourd'hui, mineur demain : possible");
table.wood={1:"demain"};
assert.equal(agenda.elsewhere("stone",{},1),"wood demain","une seule corvée par jour");

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
assert.deepEqual(rules.agenda.keys(),["spell","armor","poison","lumber","mine"]);
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

// 3. campaign.js ne relie plus les activités deux à deux.
const campaign=fs.readFileSync(path.join(ROOT,"game-core","campaign.js"),"utf8");
assert.doesNotMatch(campaign,/aptitudeBusy|workBusy|lumberBusy|tomorrowReason/);
assert.equal((campaign.match(/busyElsewhere:elsewhere\(/g)||[]).length,3,"sorts, apprentissages, corvées");
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.ok(index.indexOf('<script src="/core/agenda.js">')>0&&index.indexOf('<script src="/core/agenda.js">')<index.indexOf('<script src="/core/campaign.js">'));

console.log("Agenda : apprentissages et corvées inscrits une fois, chacun voit tous les autres, une corvée par jour — OK");
