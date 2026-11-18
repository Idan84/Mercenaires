"use strict";

// Guilde des mineurs (Idan, 2026-11-04 : « même chose mais avec les pierres pour des bâtiments de lvl 6 à 10 et on y apprend
// les armes contondantes » ; « Le Puits » ; la Force ; le test « pareil ») : comme la Cabane du bûcheron, pour les chantiers de
// niveau 6 à 10 ; une seule corvée à la fois ; comme elles, en durée indéterminée, −1 d'affinité par jour, refus et relance
// (Idan, 2026-11-04).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const Posts=require("../game-core/camp-posts.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.mineDialogue,"mine-dialogue.json","le jeu charge les textes");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.equal(constant("camp.mine.workers_per_level"),1);
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);

// Le bâtiment : le Puits entraîne les Armes contondantes, apprises avec la Force ; pas de chef.
const guild=reference.campBuildings.rows.find(r=>r.code==="miners_guild");
assert.deepEqual([guild.nom,guild.entraine,guild.apprend_avec,guild.requiert,guild.niveaux,guild.prix_base,guild.jours_base,guild.places_base,guild.places_pas],
  ["Guilde des mineurs","Armes contondantes","Force",null,10,500,4,1,2]);
assert.match(guild.description,/Dans le Puits : « On y descend avec une lanterne, on en remonte avec un marteau\. »/);
assert.equal(reference.campBuildings.row_count,reference.campBuildings.rows.length);
assert.equal(Posts.postOfBuilding("miners_guild"),null,"pas de chef");

let seed=29,dice=[];
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,
  random:()=>dice.length?dice.shift():0.999});
const mine=rules.miners,lumber=rules.lumberjacks;
assert.deepEqual([mine.HALL,mine.course,lumber.HALL],["miners_guild","mine","lumber_camp"]);
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6].map(id=>generator.createMercenary({id,captain}))});
const [, first, second, third, fourth]=state.company.roster;
state.company.gold=1000000;
state.company.intendantId=null;

// Il faut la Guilde ; 1 mineur par niveau.
assert.equal(mine.canSend(state,first).reason,"Il faut d’abord construire la Guilde des mineurs.");
state.company.camp.buildings={miners_guild:{level:2,construction:null},lumber_camp:{level:1,construction:null}};
assert.equal(mine.slots(state),2);
assert.equal(rules.trainingRooms(state).find(r=>r.code==="miners_guild")?.trains,"Armes contondantes");

if(state.company.oldSteward) state.company.oldSteward.retiredDay=state.day; // Cruxor, l'ancien intendant, est parti : sans intendant
// Même test que les bûcherons (« pareil ») : 25 % à affinité 0, la même relance, la même perte par jour ; le capitaine sans test.
assert.equal(mine.chance(state,first).chance,lumber.chance(state,first).chance);
assert.equal(mine.chance(state,first,"intimidate").chance,lumber.chance(state,first,"intimidate").chance);
assert.equal(Math.round(mine.chance(state,first).chance),25);
assert.equal(mine.chance(state,captain).chance,100);
assert.deepEqual([mine.dailyLoss(null),mine.dailyLoss("intimidate"),mine.dailyLoss("convince")],[-1,-2,-0.5]);
dice=[0.999,0];
assert.equal(mine.send(state,first.id).accepted,false);
assert.equal(mine.retry(state,first.id,"intimidate").entry.approach,"intimidate");
dice=[0];
assert.equal(mine.send(state,second.id).accepted,true);
assert.equal(mine.canSend(state,third).reason,"La Guilde n’a plus de place.");
assert.equal(mine.canSend(state,first).reason,"Il travaille déjà à la mine.");

// Une seule corvée à la fois ; retenu au camp.
assert.equal(lumber.canSend(state,first).reason,"Il descend à la mine demain matin.");
assert.equal(rules.studyBusy(state,first),"Il descend à la mine demain matin.");
state.missionBoard={offer:{id:"contrat",code:"cleanup",distance:1}};
assert.equal(rules.departExpedition(state,[first.id,third.id]).reason,"Il descend à la mine demain matin.");
state.missionBoard=null;
dice=[0];
assert.equal(lumber.send(state,third.id).accepted,true);
assert.equal(mine.canSend(state,third).reason,"Il part bûcheronner demain matin.");
assert.equal(mine.withdraw(state,third.id).reason,"Il ne travaille pas à la mine.");

// La pierre du matin (Idan, 2026-11-18) : la Guilde, 20 × 0,5 × étoiles de renommée × niveau ; chaque mineur, 15 × (Force
// ÷ 50)². Le bûcheron, lui, rapporte du bois.
first.stats.Force=50;second.stats.Force=75;third.stats.Force=100;
const wood0=state.company.wood,stone0=state.company.stone;
dice=[];
const [morning]=rules.advanceTime(state,1);
assert.deepEqual([morning.mine.resource,morning.mine.hall,morning.mine.total],["stone",20,69]);
assert.deepEqual(morning.mine.workers.map(w=>[w.id,w.output]),[[first.id,15],[second.id,34]]);
assert.deepEqual([morning.lumber.resource,morning.lumber.hall,morning.lumber.total],["wood",10,70]);
assert.deepEqual([state.company.stone-stone0,state.company.wood-wood0],[69,70]);
// Intimidé : −2 d'affinité par jour ; sinon −1.
assert.deepEqual(morning.mine.workers.map(w=>[w.id,w.affinityDelta]),[[first.id,-2],[second.id,-1]]);
assert.equal(rules.agenda.reason(state,first.id),"Il travaille à la mine.");
assert.equal(rules.studyBusy(state,first),"Il travaille à la mine.","il y est encore demain");
assert.ok(!morning.school.entries.some(e=>[first.id,second.id,third.id].includes(e.id)),"ils ne s'entraînent pas");
// De la Cabane à la mine : on le retire d'abord ; il descend à la mine dès demain.
assert.equal(lumber.withdraw(state,third.id).ok,true);
assert.equal(mine.withdraw(state,second.id).ok,true);
dice=[0];
assert.equal(mine.send(state,third.id).accepted,true);

rules.advanceTime(state,1);

// Interface : la carte de la Guilde, le journal du matin.
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const lines=[];
const ui=new Function("game","campaignRules","renderAvatar","fmt","esc","tavernLog","studyFill",
  fs.readFileSync(path.join(ROOT,"prototype-web","lumber-ui.js"),"utf8")+"\nreturn {mineHtml,lumberHtml,logCampWork};")(
  {campaign:state,referenceData:reference},()=>rules,()=>"",fmt,esc,(message,kind)=>lines.push([message,kind]),(text)=>String(text||"").replace(/\{([^|}]*)\|([^}]*)\}/g,(_,a)=>a));
assert.doesNotMatch(ui.mineHtml(state),/Envoyer à la mine/,"plus de place");
assert.equal(mine.withdraw(state,first.id).ok,true);
let html=ui.mineHtml(state);
assert.match(html,/<summary class="talk-offer-btn" title="[^"]+">Envoyer à la mine<\/summary>/);
assert.match(html,new RegExp(`data-course="mine" data-work-send="${fourth.id}"`));
assert.doesNotMatch(html,new RegExp(`data-work-send="${third.id}"`),"il y est déjà");
assert.match(html,new RegExp(`<h4>Mineurs \\(1 / 2\\)</h4>[\\s\\S]*<strong>${third.name}</strong><span>\\+60 pierre</span></div>[\\s\\S]*data-course="mine" data-work-withdraw="${third.id}">Retirer`));
assert.doesNotMatch(ui.lumberHtml(state),/Mineurs/);
ui.logCampWork(morning.mine,"mine");
ui.logCampWork({workers:[],resource:"stone",hall:20,total:20},"mine");
ui.logCampWork(morning.lumber,"lumber");
assert.deepEqual(lines,[["Pierre : +69 (Guilde 20, mineurs 49).","turn"],["Pierre : +20 (Guilde).","turn"],
  ["Bois : +70 (Cabane 10, bûcherons 60).","turn"]]);
const copy=reference.mineDialogue;
assert.ok(copy.send.accepted.length>=3&&copy.send.refused.length>=3);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8"),/code==="miners_guild"&&typeof mineHtml==="function"\?mineHtml\(c\):""/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8"),/logCampWork\(report\.mine,"mine"\)/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8"),/\{kind:"available",label:"À la mine demain"\}/);

console.log("Guilde des mineurs : 1 mineur par niveau, même test et même relance, jusqu'au retrait, la pierre du matin (Guilde et mineurs selon leur Force), une corvée à la fois — OK");
