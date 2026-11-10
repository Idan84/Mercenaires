"use strict";

// Cabane du bûcheron (Idan, 2026-11-03) : une salle d'entraînement aux Haches (le Billot) ; surtout, 1 bûcheron par niveau,
// qui retire 1 jour par jour au chantier qui finit le plus tôt, de niveau 1 à 5, dortoir compris ; pas de chef.
// Les corvées (Idan, 2026-11-04) : en durée indéterminée, retirées quand on veut, −1 d'affinité par jour de travail ; il peut
// refuser ; une relance (Intimider : + Intimidation, perte × 2 ; Convaincre : + Charisme ÷ 2, perte × 0,5).
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
assert.equal(files.persuasionDialogue,"persuasion-dialogue.json");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual(["workers_per_level","days_per_worker","max_work_level","offer_offset","daily_affinity"].map(k=>constant("camp.lumber."+k)),[1,1,5,-30,-1]);
assert.deepEqual(["intimidate.weight","intimidate.loss_factor","convince.weight","convince.loss_factor"].map(k=>constant("persuasion."+k)),[1,2,0.5,0.5]);
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
const affinityOf=m=>Number(m.affinityAcquired)||0;

// Il faut la Cabane ; 1 bûcheron par niveau.
assert.equal(lumber.canSend(state,first).reason,"Il faut d’abord construire la Cabane du bûcheron.");
state.company.camp.buildings={lumber_camp:{level:2,construction:null}};
assert.equal(lumber.slots(state),2);
assert.equal(rules.trainingRooms(state).find(r=>r.code==="lumber_camp")?.trains,"Haches");

// Le test : 10 + 80 / (1 + e^(−Δ/20)), Δ = 0,5 × affinité − 30 (+ l'intendant) : 25 % à affinité 0 ; le capitaine sans test.
state.company.intendantId=null;
const curve=delta=>10+80/(1+Math.exp(-delta/20));
assert.ok(Math.abs(lumber.chance(state,first).chance-curve(-30))<1e-9);
assert.equal(Math.round(lumber.chance(state,first).chance),25);
assert.equal(lumber.chance(state,captain).chance,100);
// La relance : + Intimidation du capitaine, ou + son Charisme ÷ 2.
const intimidation=captain.skills.social.Intimidation,charisma=captain.stats.Charisme;
assert.ok(Math.abs(lumber.chance(state,first,"intimidate").chance-curve(-30+intimidation))<1e-9);
assert.ok(Math.abs(lumber.chance(state,first,"convince").chance-curve(-30+charisma/2))<1e-9);
assert.deepEqual([lumber.dailyLoss(null),lumber.dailyLoss("intimidate"),lumber.dailyLoss("convince")],[-1,-2,-0.5]);

// Il refuse ; on le convainc.
dice=[0.999];
const refused=lumber.send(state,first.id);
assert.deepEqual([refused.ok,refused.accepted,refused.entry,refused.canRetry],[true,false,null,true]);
assert.equal(lumber.canSend(state,first).reason,"Vous lui en avez déjà parlé aujourd’hui.");
dice=[0];
const convinced=lumber.retry(state,first.id,"convince");
assert.deepEqual([convinced.accepted,convinced.entry.approach,convinced.entry.startDay,convinced.dailyLoss],[true,"convince",state.day+1,-0.5]);
assert.equal(lumber.retry(state,first.id,"intimidate").reason,"Il n’a rien refusé aujourd’hui.");
// Il refuse deux fois : c'est non pour aujourd'hui.
dice=[0.999,0.999];
assert.equal(lumber.send(state,second.id).accepted,false);
assert.equal(lumber.retry(state,second.id,"intimidate").accepted,false);
assert.equal(lumber.retry(state,second.id,"convince").reason,"Vous avez déjà insisté aujourd’hui.");
assert.equal(lumber.canSend(state,second).reason,"Vous lui en avez déjà parlé aujourd’hui.");
// Il accepte du premier coup.
dice=[0];
assert.equal(lumber.send(state,third.id).accepted,true);
assert.equal(lumber.canSend(state,second).reason,"La Cabane n’a plus de place.");
assert.equal(lumber.canSend(state,first).reason,"Il bûcheronne déjà.");
// Au jour J, on organise J+1 : demain, il est retenu au camp.
assert.equal(rules.studyBusy(state,first),"Il part bûcheronner demain matin.");
state.missionBoard={offer:{id:"contrat",code:"cleanup",distance:1}};
assert.equal(rules.departExpedition(state,[first.id,second.id]).reason,"Il part bûcheronner demain matin.");
state.missionBoard=null;
// Pas l'intendant (à son poste), pas le blessé.
state.company.intendantId=steward.id;
assert.equal(lumber.canSend(state,steward).reason,"Il ne quitte pas son poste au camp.");
hurt.recovery={kind:"wounded",daysLeft:3};
assert.equal(lumber.canSend(state,hurt).reason,"Il doit d’abord se remettre.");
state.company.intendantId=null;

// Les chantiers : le dortoir (1er agrandissement, 2 jours) et le Ludus (niveau 1, 4 jours) ; l'École de magie au niveau 6
// (hors de portée : la Guilde des mineurs fait 6 à 10).
assert.equal(rules.startDormitoryExpansion(state).ok,true);
assert.equal(rules.startBuilding(state,"ludus").ok,true);
state.company.camp.buildings.magic_school={level:5,construction:null};
assert.equal(rules.startBuilding(state,"magic_school").ok,true);
const day0=state.day,dorm=state.company.camp.construction,ludus=state.company.camp.buildings.ludus.construction,school=state.company.camp.buildings.magic_school.construction;
assert.deepEqual([dorm.endDay-day0,ludus.endDay-day0,school.level],[2,4,6]);
const before=[affinityOf(first),affinityOf(third)];
dice=[];
const [morning]=rules.advanceTime(state,1);
// Le dortoir finit déjà demain matin : les deux jours vont au Ludus, le plus proche de la fin ensuite.
assert.deepEqual(morning.lumber.reduced.map(r=>[r.name,r.days]),[["Ludus",2]]);
assert.deepEqual([dorm.endDay-day0,ludus.endDay-day0,school.endDay-day0],[2,2,24]);
// Chaque jour de travail : −1 d'affinité, −0,5 s'il a été convaincu.
assert.deepEqual(morning.lumber.workers.map(w=>[w.id,w.affinityDelta]),[[first.id,-0.5],[third.id,-1]]);
assert.deepEqual([affinityOf(first)-before[0],affinityOf(third)-before[1]],[-0.5,-1]);
assert.equal(rules.agenda.reason(state,first.id),"Il bûcheronne.");
assert.equal(rules.studyBusy(state,first),"Il bûcheronne.","il y est encore demain");
assert.ok(!morning.school.entries.some(e=>[first.id,third.id].includes(e.id)),"les bûcherons ne s'entraînent pas");
// Le lendemain, ils y sont toujours, sans qu'on les renvoie.
const [next]=rules.advanceTime(state,1);
assert.deepEqual(next.lumber.workers.map(w=>w.id),[first.id,third.id]);
assert.deepEqual([affinityOf(first)-before[0],affinityOf(third)-before[1]],[-1,-2]);
assert.equal(next.lumber.reduced.length,0,"le Ludus et le dortoir sont finis ce matin");
// On le retire : libre dès demain.
assert.equal(lumber.withdraw(state,first.id).ok,true);
assert.equal(lumber.withdraw(state,first.id).reason,"Il ne bûcheronne pas.");
assert.equal(rules.studyBusy(state,first),null);
const [third_day]=rules.advanceTime(state,1);
assert.deepEqual(third_day.lumber.workers.map(w=>w.id),[third.id]);
assert.equal(lumber.workLevel({kind:"dormitory",number:6}),6);
assert.equal(lumber.workLevel({kind:"dormitory_quality",level:3}),3);
assert.equal(lumber.workLevel({kind:"lieutenant_quarter",number:2}),2);
// Anciennes sauvegardes ({ id, day } : une journée) : gardées à partir de ce jour-là ; les journées passées, oubliées.
const old={day:9,company:{roster:[],camp:{lumberjacks:[{id:7,day:8,grudging:true},{id:8,day:10,grudging:false}]}}};
assert.deepEqual(lumber.entriesOf(old),[{id:8,startDay:10,approach:null}]);

// Interface : la carte de la Cabane.
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const ui=new Function("game","campaignRules","renderAvatar","fmt","esc","studyFill",
  fs.readFileSync(path.join(ROOT,"prototype-web","lumber-ui.js"),"utf8")+"\nreturn {lumberHtml};")(
  {campaign:state,referenceData:reference},()=>rules,()=>"",fmt,esc,(text,m)=>String(text||"").replace(/\{([^|}]*)\|([^}]*)\}/g,(_,a)=>a));
let html=ui.lumberHtml(state);
assert.match(html,/<summary class="talk-offer-btn" title="[^"]+">Envoyer bûcheronner<\/summary>/);
dice=[0.999,0];
lumber.send(state,second.id);
lumber.retry(state,second.id,"intimidate");
html=ui.lumberHtml(state);
assert.match(html,new RegExp(`<h4>Bûcherons \\(2 / 2\\)</h4>[\\s\\S]*<strong>${third.name}</strong></div>[\\s\\S]*<strong>${second.name}</strong><span>dès demain · intimidé</span>`));
assert.match(html,new RegExp(`data-course="lumber" data-work-withdraw="${second.id}">Retirer`));
const copy=reference.lumberDialogue,pers=reference.persuasionDialogue;
assert.ok(copy.send.accepted.length>=3&&copy.send.refused.length>=3);
assert.deepEqual([pers.options.intimidate,pers.options.convince,pers.options.challenge,pers.options.leave],["Intimider","Convaincre","Défier","Laisser tomber"]);
for(const key of ["intimidate","convince"]) assert.ok(pers.captain[key].length>=3&&pers.reply[key].accepted.length>=3&&pers.reply[key].refused.length>=3);
const uiSource=fs.readFileSync(path.join(ROOT,"prototype-web","lumber-ui.js"),"utf8");
assert.match(uiSource,/persuasionAfter\(result,"work",\{member:m\.id,course\}\)/,"après un refus : Intimider, Convaincre ou laisser tomber (persuasion-ui.js)");
assert.match(uiSource,/registerPersuasion\("work",/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8"),/code==="lumber_camp"&&typeof lumberHtml==="function"\?lumberHtml\(c\):""/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8"),/logCampWork\(report\.lumber,"lumber"\)/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8"),/\{kind:"available",label:"Bûcheronne demain"\}/);
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.ok(index.indexOf('<script src="/core/persuasion.js">')<index.indexOf('<script src="/core/spell-study.js">'),"avant les apprentissages et les corvées");
assert.ok(index.indexOf('<script src="persuasion-ui.js">')<index.indexOf('<script src="spell-study-ui.js">'));
assert.match(index,/<script src="lumber-ui\.js"><\/script>/);

console.log("Cabane du bûcheron : 1 bûcheron par niveau, jusqu'au retrait, −1 d'affinité par jour, refus et relance, 1 jour de moins au chantier le plus proche (niveaux 1 à 5) — OK");
