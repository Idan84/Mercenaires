"use strict";

// Palais des plaisirs (Idan, 2026-11-04 : « Le bâtiment a un chef, le maître des plaisirs. On peut y faire travailler nos
// mercenaires, ils rapportent des pièces d'or en fonction de leur charisme et de leur réputation. Il faut un test d'affinité
// pour envoyer un mercenaire. On a une salle pour s'entraîner aux armes flexibles » ; « le charisme ne s'entraîne pas » ;
// « Il faut que ça soit rentable » ; « Le maître augmente les gains » ; « Parfait ») : comme les corvées, jusqu'au retrait,
// −1 d'affinité par jour, refus et relance ; or = Charisme × (1 + 0,2 × niveau de réputation) × (1 + Charisme du Maître ÷ 200).
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
assert.equal(files.palaceDialogue,"palace-dialogue.json","le jeu charge les textes");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual(["workers_per_level","offer_offset","daily_affinity","reputation_weight","master_divisor"].map(k=>constant("camp.palace."+k)),[1,0,-1,0.2,200]);
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);

// Le bâtiment : la salle principale n'entraîne rien ; l'Arrière-salle, les Armes flexibles, apprises avec le Charisme ; un chef.
const row=code=>reference.campBuildings.rows.find(r=>r.code===code);
const palace=row("pleasure_palace"),back=row("pleasure_backroom");
assert.deepEqual([palace.nom,palace.entraine,palace.apprend_avec,palace.places_pas,palace.niveaux],["Palais des plaisirs",null,"Charisme",0,10]);
assert.match(palace.description,/Dans le Grand Salon : « Sourire, écouter, ne jamais annoncer son prix en premier\. »/);
assert.deepEqual([back.nom,back.requiert,back.entraine,back.places_base,back.places_pas],["L’Arrière-salle","pleasure_palace","Armes flexibles ou articulées",1,2]);
assert.match(back.description,/« On y apprend le fouet\. Officiellement, pour le dressage\. »/);
const post=Posts.postOfBuilding("pleasure_palace");
assert.deepEqual([post.key,post.noun,post.skill],["pleasureMaster","Maître des plaisirs","Charisme"]);

let seed=41,dice=[];
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,
  random:()=>dice.length?dice.shift():0.999});
const work=rules.palaceWorkers;
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6].map(id=>generator.createMercenary({id,captain}))});
const [, first, second, third, master]=state.company.roster;
state.company.intendantId=null;
assert.equal(state.company.pleasureMasterId,null);
assert.deepEqual(rules.agenda.keys(),["dungeon","spell","armor","poison","taming","lumber","mine","palace"]);

// Il faut le Palais ; 1 place par niveau ; l'Arrière-salle est la seule salle d'entraînement.
assert.equal(work.canSend(state,first).reason,"Il faut d’abord construire le Palais des plaisirs.");
state.company.camp.buildings={pleasure_palace:{level:2,construction:null},pleasure_backroom:{level:1,construction:null},lumber_camp:{level:1,construction:null}};
assert.equal(work.slots(state),2);
assert.deepEqual(rules.trainingRooms(state).filter(r=>r.building==="pleasure_palace").map(r=>[r.code,r.trains,r.learnWith,r.places]),
  [["pleasure_backroom","Armes flexibles ou articulées","Charisme",1]]);

if(state.company.oldSteward) state.company.oldSteward.retiredDay=state.day; // Cruxor, l'ancien intendant, est parti : sans intendant
// Le test : 50 % à affinité 0 ; la relance ; −1 par jour (× 2 intimidé, × 0,5 convaincu) ; le capitaine sans test.
assert.equal(work.chance(state,first).chance,50);
assert.equal(work.chance(state,captain).chance,100);
assert.ok(work.chance(state,first,"convince").chance>50);
assert.deepEqual([work.dailyLoss(null),work.dailyLoss("intimidate"),work.dailyLoss("convince")],[-1,-2,-0.5]);

// L'or : Charisme × (1 + 0,2 × niveau de réputation) ; mercenaire moyen (Charisme 54, niveau 3) : 86 PO (seuils × 1,5
// depuis le 2026-11-08 : niveau 3 dès 140, niveau 4 dès 209).
Object.assign(first.stats,{Charisme:54});first.reputation=150;
Object.assign(second.stats,{Charisme:69});second.reputation=220;
assert.deepEqual([work.reputationLevel(first),work.reputationLevel(second)],[3,4]);
assert.deepEqual([work.earnings(state,first),work.earnings(state,second)],[86,124]);
// Le Maître des plaisirs : × (1 + son Charisme ÷ 200) ; il reste à son poste.
master.stats.Charisme=60;
state.company.pleasureMasterId=master.id;
assert.deepEqual([work.earnings(state,first),work.earnings(state,second)],[112,161]);
assert.equal(work.canSend(state,master).reason,"Il ne quitte pas son poste au camp.");

// Il refuse, on l'intimide ; l'autre accepte du premier coup.
dice=[0.999,0,0];
assert.equal(work.send(state,first.id).accepted,false);
assert.equal(work.retry(state,first.id,"intimidate").entry.approach,"intimidate");
assert.equal(work.send(state,second.id).accepted,true);
assert.equal(work.canSend(state,third).reason,"Le Palais n’a plus de place.");
// Une seule corvée à la fois.
assert.equal(rules.lumberjacks.canSend(state,first).reason,"Il commence au Palais demain matin.");
assert.equal(rules.studyBusy(state,second),"Il commence au Palais demain matin.");

// Chaque matin : l'or (ici 112 + 161 PO), et −2 (intimidé) ou −1 d'affinité.
const gold=state.company.gold,aff=m=>Number(m.affinityAcquired)||0,before=[aff(first),aff(second)];
dice=[];
const [morning]=rules.advanceTime(state,1);
assert.deepEqual(morning.palace.workers.map(w=>[w.id,w.gold,w.affinityDelta]),[[first.id,112,-2],[second.id,161,-1]]);
assert.equal(morning.palace.gold,273);
assert.equal(state.company.gold-gold+morning.salaries.total,273,"l'or arrive dans le trésor (salaires du jour mis à part)");
assert.deepEqual([aff(first)-before[0],aff(second)-before[1]],[-2,-1]);
assert.equal(rules.agenda.reason(state,first.id),"Il travaille au Palais.");
assert.ok(!morning.school.entries.some(e=>[first.id,second.id].includes(e.id)),"ils ne s'entraînent pas");
// On le retire : libre dès demain.
assert.equal(work.withdraw(state,first.id).ok,true);
const [next]=rules.advanceTime(state,1);
assert.deepEqual(next.palace.workers.map(w=>w.id),[second.id]);

// Interface : la carte du Palais, le journal, le Maître des plaisirs.
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const lines=[];
const ui=new Function("game","campaignRules","renderAvatar","fmt","esc","tavernLog","studyFill",
  fs.readFileSync(path.join(ROOT,"prototype-web","lumber-ui.js"),"utf8")+"\nreturn {palaceHtml,logCampWork};")(
  {campaign:state,referenceData:reference},()=>rules,()=>"",fmt,esc,(message,kind)=>lines.push([message,kind]),text=>String(text||""));
const html=ui.palaceHtml(state);
assert.match(html,/<summary class="talk-offer-btn" title="[^"]+">Envoyer au Palais<\/summary>/);
assert.match(html,new RegExp(`<h4>Au Palais \\(1 / 2\\)</h4>[\\s\\S]*<strong>${second.name}</strong>[\\s\\S]*data-course="palace" data-work-withdraw="${second.id}">Retirer`));
ui.logCampWork(morning.palace,"palace");
assert.deepEqual(lines,[["Palais des plaisirs : 273 PO.","turn"]]);
const copy=reference.palaceDialogue;
assert.ok(copy.send.accepted.length>=3&&copy.send.refused.length>=3);
const masters=reference.campMastersDialogue.masters.pleasureMaster;
assert.ok(masters.offer.accepted.length>=3&&masters.offer.flattered.length>=3&&masters.offer.vexed.length>=3);
assert.equal(masters.label,"{Maître|Maîtresse} des plaisirs");
const sheet=reference.characterSheetCopy.history;
assert.ok(sheet.counters.some(c=>c.key==="pleasureMasterDays")&&sheet.events.pleasureMaster&&sheet.events.pleasureMaster_recall);
assert.match(fs.readFileSync(path.join(ROOT,"game-core","history.js"),"utf8"),/"pleasureMasterDays"/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8"),/code==="pleasure_palace"&&typeof palaceHtml==="function"\?palaceHtml\(c\):""/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8"),/logCampWork\(report\.palace,"palace"\)/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8"),/\{kind:"available",label:"Au Palais demain"\}/);
const directorUi=fs.readFileSync(path.join(ROOT,"prototype-web","school-director-ui.js"),"utf8");
assert.match(directorUi,/pleasureMaster:"pleasure-master-panel"/);
assert.match(directorUi,/\["doctore","veteran","bladeMaster","alchemist","pleasureMaster","trainer"\]/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8"),/<div id="pleasure-master-panel" class="steward-panel director-panel"><\/div>/);

console.log("Palais des plaisirs : le Maître des plaisirs, l'Arrière-salle, l'or selon Charisme et réputation, jusqu'au retrait, refus et relance — OK");
