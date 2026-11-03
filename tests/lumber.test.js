"use strict";

// Cabane du bûcheron (Idan, 2026-11-03) : une salle d'entraînement aux Haches (le Billot) ; surtout, 1 bûcheron par niveau
// et par jour, envoyé la veille ; il y va toujours, à contrecœur si le test (assez dur) rate : affinité −2 ; chaque
// bûcheron retire 1 jour au chantier qui finit le plus tôt, de niveau 1 à 5, dortoir compris ; pas de chef.
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
assert.equal(files.lumberDialogue,"lumber-dialogue.json","le jeu charge les textes");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual(["workers_per_level","days_per_worker","max_work_level","offer_offset","grudge_affinity"].map(k=>constant("camp.lumber."+k)),[1,1,5,-30,-2]);
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);

// Le bâtiment : le Billot entraîne les Haches, appris avec la Force ; pas de chef.
const cabin=reference.campBuildings.rows.find(r=>r.code==="lumber_camp");
assert.deepEqual([cabin.nom,cabin.entraine,cabin.apprend_avec,cabin.requiert,cabin.niveaux,cabin.places_base,cabin.places_pas],
  ["Cabane du bûcheron","Haches","Force",null,10,1,2]);
assert.match(cabin.description,/Dans le Billot : « On fend du bois toute la journée\. Le bois, lui, ne se défend pas\. »/);
assert.equal(Posts.postOfBuilding("lumber_camp"),null,"pas de chef");

let seed=23,dice=[];
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,
  random:()=>dice.length?dice.shift():0.999});
const lumber=rules.lumberjacks;
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6].map(id=>generator.createMercenary({id,captain}))});
const [, first, second, third, steward, hurt]=state.company.roster;
state.company.gold=1000000;

// Il faut la Cabane ; 1 bûcheron par niveau.
assert.equal(lumber.canSend(state,first).reason,"Il faut d’abord construire la Cabane du bûcheron.");
state.company.camp.buildings={lumber_camp:{level:2,construction:null}};
assert.equal(lumber.slots(state),2);
assert.equal(rules.trainingRooms(state).find(r=>r.code==="lumber_camp")?.trains,"Haches");

// Le test : 10 + 80 / (1 + e^(−Δ/20)), Δ = 0,5 × affinité − 30 (+ l'intendant) : 25 % à affinité 0 ; le capitaine sans test.
state.company.intendantId=null;
assert.ok(Math.abs(lumber.chance(state,first).chance-(10+80/(1+Math.exp(30/20))))<1e-9);
assert.equal(Math.round(lumber.chance(state,first).chance),25);
assert.equal(lumber.chance(state,captain).chance,100);

// Il y va toujours : à contrecœur (−2) ou de bon cœur.
const before=Number(first.affinityAcquired)||0;
dice=[0.999];
const grudging=lumber.send(state,first.id);
assert.deepEqual([grudging.ok,grudging.grudging,grudging.affinityDelta,first.affinityAcquired-before],[true,true,-2,-2]);
dice=[0];
const willing=lumber.send(state,second.id);
assert.deepEqual([willing.grudging,willing.affinityDelta],[false,0]);
assert.equal(lumber.canSend(state,third).reason,"La Cabane n’a plus de place demain.");
assert.equal(lumber.canSend(state,first).reason,"Il part déjà bûcheronner demain.");
// Au jour J, on organise J+1 : demain, il est retenu au camp.
assert.equal(rules.studyBusy(state,first),"Il part bûcheronner demain matin.");
state.missionBoard={offer:{id:"contrat",code:"cleanup",distance:1}};
assert.equal(rules.departExpedition(state,[first.id,third.id]).reason,"Il part bûcheronner demain matin.");
state.missionBoard=null;
// On annule ; pas l'intendant (à son poste), pas le blessé.
assert.equal(lumber.cancel(state,second.id).ok,true);
state.company.intendantId=steward.id;
assert.equal(lumber.canSend(state,steward).reason,"Il ne quitte pas son poste au camp.");
hurt.recovery={kind:"wounded",daysLeft:3};
assert.equal(lumber.canSend(state,hurt).reason,"Il doit d’abord se remettre.");
dice=[0];
lumber.send(state,second.id);

// Les chantiers : le dortoir (1er agrandissement, 2 jours) et le Ludus (niveau 1, 4 jours) ; l'École de magie au niveau 6
// (hors de portée : la mine fera 6 à 10).
assert.equal(rules.startDormitoryExpansion(state).ok,true);
assert.equal(rules.startBuilding(state,"ludus").ok,true);
state.company.camp.buildings.magic_school={level:5,construction:null};
assert.equal(rules.startBuilding(state,"magic_school").ok,true);
const day0=state.day,dorm=state.company.camp.construction,ludus=state.company.camp.buildings.ludus.construction,school=state.company.camp.buildings.magic_school.construction;
assert.deepEqual([dorm.endDay-day0,ludus.endDay-day0,school.level],[2,4,6]);
dice=[];
const [morning]=rules.advanceTime(state,1);
// Le dortoir finit déjà demain matin : les deux jours vont au Ludus, le plus proche de la fin ensuite.
assert.deepEqual(morning.lumber.reduced.map(r=>[r.name,r.days]),[["Ludus",2]]);
assert.deepEqual([dorm.endDay-day0,ludus.endDay-day0,school.endDay-day0],[2,2,24]);
assert.equal(rules.studyBusy(state,first),"Il bûcheronne aujourd’hui.");
assert.ok(!morning.school.entries.some(e=>[first.id,second.id].includes(e.id)),"les bûcherons ne s'entraînent pas");
// Le dortoir (son rang : 1) profite aussi du bois quand il est le plus proche de la fin.
dice=[0];
lumber.send(state,third.id);
const [next]=rules.advanceTime(state,1);
assert.deepEqual(next.built?.kind,"dormitory","l'agrandissement est fini ce matin");
assert.ok(state.company.camp.buildings.ludus.level===1,"le Ludus aussi, deux jours plus tôt");
assert.equal(lumber.workLevel({kind:"dormitory",number:6}),6);
assert.equal(lumber.workLevel({kind:"dormitory_quality",level:3}),3);
assert.equal(lumber.workLevel({kind:"lieutenant_quarter",number:2}),2);

// Interface : la carte de la Cabane.
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const ui=new Function("game","campaignRules","renderAvatar","fmt","esc",
  fs.readFileSync(path.join(ROOT,"prototype-web","lumber-ui.js"),"utf8")+"\nreturn {lumberHtml};")(
  {campaign:state,referenceData:reference},()=>rules,()=>"",fmt,esc);
state.company.intendantId=null;
let html=ui.lumberHtml(state);
assert.match(html,/<summary class="talk-offer-btn" title="[^"]+">Envoyer bûcheronner<\/summary>/);
dice=[0.999];
lumber.send(state,first.id);
html=ui.lumberHtml(state);
assert.match(html,new RegExp(`<h4>Bûcherons de demain \\(1 / 2\\)</h4>[\\s\\S]*<strong>${first.name}</strong><span>à contrecœur</span>`));
assert.match(html,new RegExp(`data-lumber-cancel="${first.id}">Annuler`));
const copy=reference.lumberDialogue;
assert.ok(copy.send.willing.length>=3&&copy.send.grudging.length>=3);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8"),/code==="lumber_camp"&&typeof lumberHtml==="function"\?lumberHtml\(c\):""/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8"),/logLumber\(report\.lumber\)/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8"),/\{kind:"available",label:"Bûcheronne demain"\}/);
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(index,/<script src="\/core\/lumber\.js"><\/script>/);
assert.match(index,/<script src="lumber-ui\.js"><\/script>/);

console.log("Cabane du bûcheron : 1 bûcheron par niveau, à contrecœur −2, 1 jour de moins au chantier le plus proche (niveaux 1 à 5) — OK");
