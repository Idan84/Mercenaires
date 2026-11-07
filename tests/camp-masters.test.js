"use strict";

// Les maîtres (Idan, 2026-11-03 : « Oui pour les maîtres, et je garde tes noms dandy ») : le Doctore au Ludus, le Vétéran
// à l'Académie de la survie, le Maître des lames au Cercle des Fines Lames, nommés comme le directeur de l'École (bâtiment
// construit, refus, retour sur le terrain, hors mission, pas de place au dortoir) ; ils aident à l'entraînement libre de
// leur bâtiment comme le directeur à l'École (test + Charisme / 10 + affinité / 10 ; gain × (1 + niveau / 100) ×
// (1 + Transmission / 100), niveau : leur valeur dans ce que travaille la salle) et gagnent 5 XP de Transmission par
// élève de leur bâtiment. Un panneau par maître dans l'Intendance, une fois le bâtiment construit.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createSchoolDirectorRules}=require("../game-core/school-director.js");
const {createSchoolTrainingRules}=require("../game-core/school-training.js");
const {createStewardRules}=require("../game-core/steward.js");
const {createMedicRules}=require("../game-core/medic.js");
const {createLieutenantRules}=require("../game-core/lieutenants.js");
const Posts=require("../game-core/camp-posts.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.campMastersDialogue,"camp-masters-dialogue.json","le jeu charge les textes des maîtres");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));

// Les postes : le directeur et les trois maîtres, chacun dans son bâtiment.
assert.deepEqual(Posts.POSTS.map(p=>[p.key,p.building,p.title]),[["director","magic_school","Le directeur de l’École"],
  ["doctore","ludus","Le Doctore"],["veteran","survival_academy","Le Vétéran"],["bladeMaster","blade_circle","Le Maître des lames"],
  // L'Alchimiste (Idan, 2026-11-03 : « En fait, on va nommer un alchimiste comme chef de salle ! »).
  ["alchemist","alchemy_lab","L’Alchimiste"],["pleasureMaster","pleasure_palace","Le Maître des plaisirs"],
  // Le Dresseur (Idan, 2026-11-07 : « la grange du dresseur et y nommer un mercenaire maître »).
  ["trainer","trainer_barn","Le Dresseur"]]);
for(const p of Posts.POSTS) assert.ok(reference.campBuildings.rows.some(r=>r.code===p.building&&!r.requiert),p.building);

let seed=17;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,random});
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6].map(id=>generator.createMercenary({id,captain}))});
const [, brute, survivor, fencer, other]=state.company.roster;
assert.deepEqual([state.company.doctoreId,state.company.veteranId,state.company.bladeMasterId],[null,null,null]);

let dice=[];
const dormitory={free:s=>rules.dormitoryFree(s),places:m=>rules.dormitoryPlaces(m)};
const buildingLevel=(s,code)=>rules.buildingLevel(s,code);
const post=key=>createSchoolDirectorRules({reference,random:()=>dice.length?dice.shift():0.999,dormitory,buildingLevel,post:key});
const doctore=post("doctore"),veteran=post("veteran"),bladeMaster=post("bladeMaster"),director=post("director");

// Nomination : le bâtiment d'abord, jamais le capitaine ; même chance que le directeur.
assert.deepEqual(doctore.offer(state,brute.id),{ok:false,reason:"Il faut d’abord construire le Ludus."});
assert.equal(veteran.offer(state,survivor.id).reason,"Il faut d’abord construire l’Académie de la survie.");
assert.equal(bladeMaster.offer(state,fencer.id).reason,"Il faut d’abord construire le Cercle des Fines Lames.");
state.company.camp.buildings={ludus:{level:1,construction:null},survival_academy:{level:1,construction:null},
  blade_circle:{level:1,construction:null},magic_school:{level:1,construction:null}};
assert.deepEqual(doctore.offer(state,captain.id),{ok:false,reason:"Le capitaine ne peut pas diriger le Ludus."});
assert.equal(doctore.appointChance(brute),director.appointChance(brute));
dice=[0];
const named=doctore.offer(state,brute.id);
assert.deepEqual([named.accepted,state.company.doctoreId,state.company.doctoreSince,brute.doctoreOfferDay],[true,brute.id,state.day,state.day]);
assert.deepEqual(brute.history.log.filter(e=>e.kind==="doctore").map(e=>e.accepted),[true]);
assert.equal(doctore.offer(state,other.id).reason,"Le Ludus a déjà un Doctore.");
assert.equal(doctore.offer(state,brute.id).reason,"Il dirige déjà le Ludus.");
dice=[0];
assert.equal(veteran.offer(state,survivor.id).accepted,true);
dice=[0];
assert.equal(bladeMaster.offer(state,fencer.id).accepted,true);
assert.deepEqual(Posts.mastersOf(state),{ludus:brute,survival_academy:survivor,blade_circle:fencer});

// Un seul poste par mercenaire ; hors mission comme le directeur.
assert.equal(veteran.canOffer(state,brute).reason,"Le Doctore ne peut pas diriger l’Académie.");
assert.equal(director.canOffer(state,fencer).reason,"Le Maître des lames ne peut pas diriger l’École.");
assert.equal(createStewardRules({reference,random:()=>0}).offer(state,brute.id).reason,"Le Doctore ne peut pas être intendant.");
assert.equal(createMedicRules({reference,random:()=>0,dormitory,dispensaryLevel:()=>1}).offer(state,survivor.id).reason,"Le Vétéran ne peut pas être médecin.");
assert.equal(createLieutenantRules({reference}).canPromote(state,fencer).reason,"Le Maître des lames ne peut pas être lieutenant.");
state.missionBoard={offer:{id:"contrat",code:"cleanup",distance:1}};
assert.deepEqual(rules.departExpedition(state,[other.id,survivor.id]),{ok:false,reason:"Le Vétéran reste au camp."});
state.missionBoard=null;
assert.equal(rules.canGuard(state,fencer,{level:1}).reason,"Le Maître des lames reste au camp.");
const used=rules.dormitoryUsed(state);
state.company.doctoreId=null;
assert.equal(rules.dormitoryUsed(state),used+rules.dormitoryPlaces(brute),"il vit au Ludus : pas de place au dortoir");
state.company.doctoreId=brute.id;

// Le test et le gain dans une aile du Ludus : le Doctore aide comme le directeur à l'École.
const training=createSchoolTrainingRules({reference,affinity:{affinity:()=>({ok:true,initial:20})}});
const student={id:"s",name:"Élève",stats:{Volonté:50,Endurance:50,Force:40}};
const master={id:"m",name:"Maître",stats:{Force:60,Charisme:30},skills:{camp:{"Transmission du savoir":40}}};
const mill={code:"ludus_force",building:"ludus",trains:"Force",learnWith:"Endurance",level:1,places:2};
assert.equal(training.trainingChance(student).delta,0);
assert.equal(training.trainingChance(student,master).delta,3+2,"Charisme 30 / 10 + affinité 20 / 10");
assert.equal(training.directorLevel(master,mill),60,"sa Force à la Meule");
assert.equal(training.dailyXp(student,mill),44,"40 × 50 / 50 × 1,1 (XP doublée)");
assert.equal(training.dailyXp(student,mill,master),Math.round(44*1.6*1.4),"× (1 + 60 / 100) × (1 + 40 / 100)");
assert.equal(training.directorLevel(master,{code:"survival_fire",building:"survival_academy",trains:"Résistance au feu"}),0);
const always=createSchoolTrainingRules({reference,random:()=>0});
const run=always.runDay({rooms:[mill,{code:"blade_circle",building:"blade_circle",trains:"Dextérité",learnWith:"Dextérité",level:1,places:1}],
  candidates:[student,{id:"t",name:"Autre",stats:{Volonté:50,Endurance:50,Force:30,Dextérité:20}}],masters:{ludus:master}});
// L'autre va au Cercle (là où il est le plus doué), sans maître : 40 × 20 / 50 × 1,1 (XP doublée).
assert.deepEqual(run.entries.map(e=>[e.id,e.code,e.xp]),[["t","blade_circle",18],["s","ludus_force",99]]);
assert.deepEqual([run.masterXp,run.directorXp],[{ludus:10},0],"10 XP de Transmission par élève de son bâtiment");

// Le matin du camp : chaque maître compte les élèves de son bâtiment ; les maîtres ne s'entraînent pas.
const day=rules.runSchoolDay(state);
const roomOf=new Map(rules.trainingRooms(state).map(r=>[r.code,r.building]));
for(const p of Posts.POSTS.slice(1)){
  const students=day.entries.filter(e=>e.code&&roomOf.get(e.code)===p.building).length;
  assert.equal(day.masterXp[p.building]||0,10*students,p.key);
}
assert.ok(!day.entries.some(e=>[brute.id,survivor.id,fencer.id].includes(e.id)),"les maîtres enseignent");

// Retour sur le terrain : comme le directeur ; ses jours en poste au journal.
state.day+=3;
dice=[0];
const back=doctore.recall(state);
assert.deepEqual([back.accepted,back.days,state.company.doctoreId,brute.history.doctoreDays],[true,3,null,3]);
assert.equal(doctore.totalDirectorDays(state,brute),3);
assert.deepEqual(brute.history.log.filter(e=>e.kind==="doctore_recall").map(e=>e.days),[3]);
// Il quitte la compagnie : le poste se libère.
Posts.release(state,fencer);
assert.equal(state.company.bladeMasterId,null);
state.company.bladeMasterId=fencer.id;

// L'Alchimiste : nommé de même au Labo d'alchimie (« d'Alchimiste », élidé).
const alchemist=post("alchemist");
assert.equal(alchemist.offer(state,other.id).reason,"Il faut d’abord construire le Labo d’alchimie.");
assert.equal(alchemist.recall(state).reason,"Le Labo n’a pas d’Alchimiste.");
state.company.camp.buildings.alchemy_lab={level:1,construction:null};
dice=[0];
assert.equal(alchemist.offer(state,other.id).accepted,true);
assert.equal(createStewardRules({reference,random:()=>0}).offer(state,other.id).reason,"L’Alchimiste ne peut pas être intendant.");
assert.equal(alchemist.offer(state,brute.id).reason,"Le Labo a déjà un Alchimiste.");
state.company.alchemistId=null;

// Textes : chaque maître a ses répliques (avec les communes), son titre, ses lignes de journal et son compteur.
const copy=reference.campMastersDialogue;
const sheet=reference.characterSheetCopy.history;
for(const key of ["doctore","veteran","bladeMaster","alchemist","pleasureMaster","trainer"]){
  const own=copy.masters[key];
  for(const mood of ["accepted","flattered","vexed"]) assert.ok(own.offer[mood].length>=3,`${key} ${mood}`);
  for(const mood of ["accepted","flattered","vexed","neutral"]) assert.ok(copy.common.recall[mood].length>=3,`retour ${mood}`);
  assert.ok(own.panel.title&&own.panel.appoint&&own.offer.proposal&&own.offer.outcome_accepted&&own.recall.outcome_accepted&&own.label);
  assert.ok(sheet.events[key].accord&&sheet.events[key+"_recall"].accord,key);
  assert.ok(sheet.counters.some(k=>k.key===key+"Days"&&k.hideZero),key);
}

// Interface : un panneau par maître, à côté du directeur ; rendu une fois le bâtiment construit.
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(html,/<div id="director-panel" class="steward-panel director-panel"><\/div><div id="doctore-panel" class="steward-panel director-panel"><\/div><div id="veteran-panel" class="steward-panel director-panel"><\/div><div id="blade-master-panel" class="steward-panel director-panel"><\/div><div id="alchemist-panel" class="steward-panel director-panel"><\/div><div id="pleasure-master-panel" class="steward-panel director-panel"><\/div>/);
assert.match(html,/<script src="\/core\/camp-posts\.js"><\/script>\s*<script src="\/core\/steward\.js"><\/script>/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","quartermaster-ui.js"),"utf8"),/renderCampMasterPanels\(\);/);
const elements={};
const $=id=>elements[id]||(elements[id]={innerHTML:""});
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const fill=(text,vars,female)=>String(text||"").replace(/\{(\w+)\}/g,(_,k)=>vars[k]??"").replace(/\{([^|}]*)\|([^}]*)\}/g,(_,m,f)=>female?f:m);
const js=fs.readFileSync(path.join(ROOT,"prototype-web","school-director-ui.js"),"utf8");
const ui=new Function("game","$","fmt","esc","campaignRules","renderAvatar","stewardDays","MercenairesRecruitDialogue",
  js+"\nreturn {renderSchoolDirectorPanel,renderCampMasterPanels,campPostLabel};")(
  {campaign:state,referenceData:reference},$,fmt,esc,()=>rules,()=>"",n=>n+" jours",{fill,firstName:m=>m.name});
ui.renderCampMasterPanels();
assert.match(elements["doctore-panel"].innerHTML,/<summary class="talk-offer-btn" title="[^"]*le Ludus\.">Nommer un Doctore<\/summary>/);
const order=[...elements["doctore-panel"].innerHTML.matchAll(/title="Résistance physique (\d+)">[\s\S]*?<small>\1<\/small>/g)].map(m=>Number(m[1]));
assert.ok(order.length>=1&&order.join()===[...order].sort((a,b)=>b-a).join(),"les plus résistants d'abord");
assert.match(elements["doctore-panel"].innerHTML,/class="steward-pick" data-post="doctore" data-director-offer="/);
for(const id of [captain.id,survivor.id,fencer.id]) assert.doesNotMatch(elements["doctore-panel"].innerHTML,new RegExp(`data-director-offer="${id}"`));
assert.match(elements["veteran-panel"].innerHTML,/<small>(Le Vétéran|La Vétérane)<\/small><strong>/);
assert.match(elements["veteran-panel"].innerHTML,/title="Boucliers \d+ · /);
assert.match(elements["veteran-panel"].innerHTML,/data-post="veteran" data-director-recall>Le renvoyer sur le terrain<\/button>/);
assert.match(elements["blade-master-panel"].innerHTML,/<small>(Le Maître|La Maîtresse) des lames<\/small>/);
state.company.camp.buildings={};
state.company.veteranId=null;
ui.renderCampMasterPanels();
assert.equal(elements["veteran-panel"].innerHTML,"","pas de panneau avant l'Académie");
assert.deepEqual([ui.campPostLabel("veteran",{sex:"F"}),ui.campPostLabel("bladeMaster",{sex:"M"}),ui.campPostLabel("director",{sex:"F"})],
  ["Vétérane","Maître des lames","Directrice"]);

// Fiche et effectif : le poste, le journal et les jours en poste pour chacun.
const sheetJs=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
assert.match(sheetJs,/if\(MercenairesCampPosts\.postByKey\(String\(entry\.kind\)\.replace\(\/_recall\$\/,""\)\)\)/);
assert.match(sheetJs,/MercenairesCampPosts\.POSTS\.map\(post=>\[post\.key\+"Days",/);
assert.match(sheetJs,/if\(post\) return \{kind:"steward",label:typeof campPostLabel==="function"\?campPostLabel\(post\.key,c\):post\.noun\};/);

console.log("Maîtres : Doctore, Vétéran, Maître des lames — nomination, hors mission, aide à l'entraînement, Intendance — OK");
