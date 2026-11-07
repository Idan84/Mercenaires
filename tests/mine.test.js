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
assert.deepEqual(["workers_per_level","days_per_worker","min_work_level","max_work_level"].map(k=>constant("camp.mine."+k)),[1,1,6,10]);
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
assert.deepEqual([mine.HALL,mine.constants.minLevel,mine.constants.maxLevel,lumber.constants.minLevel,lumber.constants.maxLevel],["miners_guild",6,10,1,5]);
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

// Les chantiers : le Cercle (niveau 1, 4 jours), l'École de magie (niveau 6, 24 jours), le Ludus (niveau 7, 28 jours).
state.company.camp.buildings.magic_school={level:5,construction:null};
state.company.camp.buildings.ludus={level:6,construction:null};
for(const code of ["blade_circle","magic_school","ludus"]) assert.equal(rules.startBuilding(state,code).ok,true,code);
const day0=state.day,camp=state.company.camp.buildings;
const circle=camp.blade_circle.construction,school=camp.magic_school.construction,ludus=camp.ludus.construction;
assert.deepEqual([circle.level,school.level,ludus.level].concat([circle,school,ludus].map(w=>w.endDay-day0)),[1,6,7,4,24,28]);
dice=[];
const [morning]=rules.advanceTime(state,1);
// Les deux mineurs vont à l'École (niveau 6 à 10, finit le plus tôt) ; le bûcheron au Cercle (niveau 1 à 5).
assert.deepEqual(morning.mine.reduced.map(r=>[r.name,r.days]),[["École de magie",2]]);
assert.deepEqual(morning.lumber.reduced.map(r=>[r.name,r.days]),[["Cercle des Fines Lames",1]]);
assert.deepEqual([circle,school,ludus].map(w=>w.endDay-day0),[3,22,28]);
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

// Le dortoir aussi, de son 6e au 10e agrandissement (son rang), de sa qualité 6 à 10, du 6e au 10e quartier du lieutenant.
state.company.camp.construction={kind:"dormitory",number:6,gold:0,days:3,startDay:state.day,endDay:state.day+3};
const [dorm]=rules.advanceTime(state,1);
assert.deepEqual(dorm.mine.reduced.map(r=>[r.name,r.days]),[["Agrandissement du dortoir",1],["École de magie",1]]);
assert.deepEqual([mine.workLevel({kind:"dormitory",number:5}),mine.workLevel({kind:"dormitory_quality",level:8}),mine.workLevel({kind:"lieutenant_quarter",number:10})],[5,8,10]);

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
assert.match(html,new RegExp(`<h4>Mineurs \\(1 / 2\\)</h4>[\\s\\S]*<strong>${third.name}</strong></div>[\\s\\S]*data-course="mine" data-work-withdraw="${third.id}">Retirer`));
assert.doesNotMatch(ui.lumberHtml(state),/Mineurs/);
ui.logCampWork(morning.mine,"mine");
ui.logCampWork({workers:[{id:1}],reduced:[]},"mine");
ui.logCampWork(morning.lumber,"lumber");
assert.deepEqual(lines,[["École de magie : 2 jours de moins grâce aux mineurs.","turn"],["Les mineurs n’ont trouvé aucun chantier à accélérer.","info"],
  ["Cercle des Fines Lames : 1 jour de moins grâce aux bûcherons.","turn"]]);
const copy=reference.mineDialogue;
assert.ok(copy.send.accepted.length>=3&&copy.send.refused.length>=3);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8"),/code==="miners_guild"&&typeof mineHtml==="function"\?mineHtml\(c\):""/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8"),/logCampWork\(report\.mine,"mine"\)/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8"),/\{kind:"available",label:"À la mine demain"\}/);

console.log("Guilde des mineurs : 1 mineur par niveau, même test et même relance, jusqu'au retrait, 1 jour de moins au chantier le plus proche (niveaux 6 à 10), une corvée à la fois — OK");
