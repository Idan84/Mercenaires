"use strict";

// Apprendre l'Empoisonnement des armes au Labo d'alchimie (Idan, 2026-11-03 : « Il faut qu'on puisse l'apprendre au
// labo… Ça doit dépendre d'intelligence, de dextérité (pour pas en mettre partout !) et de résistance au poison (au cas où
// on en met partout) » ; l'Alchimiste, chef de salle ; « Oui, vas-y ») : comme un port d'armure à l'Académie ;
// X = (Intelligence + Dextérité) / 2 + Résistance au poison + Transmission de l'Alchimiste / 5 s'il sait lui-même.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createProgressionRules}=require("../game-core/progression.js");
const {createCombatEngine}=require("../game-core/combat-engine.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.poisonStudyDialogue,"poison-study-dialogue.json","le jeu charge les textes");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual([constant("poison_study.daily.resistance_weight"),constant("poison_study.daily.master_divisor")],[1,5]);
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);

let seed=19,dice=[];
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,
  progression:createProgressionRules({reference}),random:()=>dice.length?dice.shift():0.999});
const study=rules.poisonStudy;
const POISONER="Empoisonnement des armes";
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5].map(id=>generator.createMercenary({id,captain}))});
const [, student, second, , alchemist]=state.company.roster;
for(const m of [student,second]) delete m.skills.martial[POISONER];
Object.assign(student.stats,{Intelligence:51,"Dextérité":56});
student.resistances["Résistance au poison"]=7;
state.company.intendantId=null;

// Il faut le Labo ; on n'apprend que ce qu'on ne sait pas.
assert.deepEqual(study.canStudy(state,student),{ok:false,reason:"Il faut d’abord construire le Labo d’alchimie."});
state.company.camp.buildings={alchemy_lab:{level:1,construction:null},survival_academy:{level:1,construction:null}};
assert.deepEqual(study.canStudy(state,student),{ok:true,type:POISONER});
alchemist.skills.martial[POISONER]=true;
assert.equal(study.canStudy(state,alchemist).reason,"Il sait déjà empoisonner une arme.");

// Le convaincre, puis il entre le lendemain matin ; une place de l'Alambic ; pas d'armure ni de sort en même temps.
dice=[0];
const accepted=study.offer(state,student.id);
assert.deepEqual([accepted.accepted,accepted.study.status,accepted.study.startDay],[true,"planned",state.day+1]);
assert.deepEqual(student.history.log.filter(e=>e.kind==="poison_study").map(e=>e.accepted),[true]);
assert.equal(rules.studyBusy(state,student),"Il entre au Labo d’alchimie demain matin.");
assert.equal(study.canStudy(state,second).reason,"Le Labo d’alchimie n’a plus de place.");
assert.equal(rules.armorStudy.canStudy(state,student).reason,"Il entre au Labo d’alchimie demain matin.");
dice=[0];
assert.equal(rules.armorStudy.offer(state,second.id).accepted,true);
assert.equal(study.canStudy(state,second).reason,"Il entre à l’Académie de la survie demain matin.");
rules.armorStudy.stop(state,rules.armorStudy.studyOf(state,second.id).id);

dice=[];
const [morning]=rules.advanceTime(state,1);
assert.deepEqual(morning.poisonStudy.started.map(s=>s.mercenary.id),[student.id]);
assert.equal(rules.studyBusy(state,student),"Il apprend à empoisonner une arme au Labo d’alchimie.");
assert.ok(!morning.school.entries.some(e=>e.code==="alchemy_lab"),"la seule place de l'Alambic est prise");

// Le test : X = (Intelligence + Dextérité) / 2 + Résistance au poison (+ l'Alchimiste, s'il sait).
const active=study.studyOf(state,student.id);
const pct=x=>100/(1+Math.exp(-(x-100)/20))*1.1;
let daily=study.dailyChance(state,active);
assert.deepEqual([daily.base,daily.masterBonus],[53.5+7,0]);
assert.ok(Math.abs(daily.chance-pct(60.5))<1e-9);
assert.equal(Math.round(daily.chance),13,"Intelligence 51, Dextérité 56, Résistance 7 : 13 % (7 à 8 jours)");
state.company.alchemistId=alchemist.id;
alchemist.skills.camp={...(alchemist.skills.camp||{}),"Transmission du savoir":48};
assert.equal(study.dailyChance(state,active).masterBonus,9.6);
delete alchemist.skills.martial[POISONER];
assert.equal(study.dailyChance(state,active).masterBonus,0,"l'Alchimiste n'aide que s'il sait lui-même");
alchemist.skills.martial[POISONER]=true;

// Il sait : il peut enduire son arme d'une fiole ; l'Alchimiste gagne 5 XP de Transmission par élève.
const engine=createCombatEngine(reference);
assert.equal(engine.canPoisonWeapon({character:student}),false);
const transmission=alchemist.skills.camp["Transmission du savoir"];
dice=[0];
const [day]=rules.advanceTime(state,1);
assert.deepEqual(day.poisonStudy.learned.map(l=>[l.mercenary.id,l.days]),[[student.id,1]]);
assert.equal(day.poisonStudy.masterXp,10);
assert.ok(alchemist.skills.camp["Transmission du savoir"]>transmission);
assert.equal(engine.canPoisonWeapon({character:student}),true);
assert.deepEqual(student.history.log.filter(e=>e.kind==="poison_study_done").map(e=>e.days),[1]);
assert.equal(study.canStudy(state,student).reason,"Il sait déjà empoisonner une arme.");

// Textes, fiche, journal, carte du Labo.
const copy=reference.poisonStudyDialogue;
assert.ok(copy.offer.accepted.length>=3&&copy.offer.refused.length>=3&&copy.panel.learn==="Apprendre l’empoisonnement");
const events=reference.characterSheetCopy.history.events;
assert.ok(events.poison_study.accord&&events.poison_study_done&&events.poison_study_stopped);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8"),/logArmorStudy\(report\.poisonStudy,"poison"\)/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8"),/code==="alchemy_lab"&&typeof poisonStudyHtml==="function"\?poisonStudyHtml\(c\):""/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8"),/\{kind:"steward",label:"Apprend l’empoisonnement"\}/);
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const card=new Function("game","campaignRules","renderAvatar","fmt","esc",
  fs.readFileSync(path.join(ROOT,"prototype-web","armor-study-ui.js"),"utf8")+"\nreturn {poisonStudyHtml};")(
  {campaign:state,referenceData:reference},()=>rules,()=>"",fmt,esc);
state.day+=1;
let shown=card.poisonStudyHtml(state);
assert.match(shown,/<summary class="talk-offer-btn" title="[^"]+">Apprendre l’empoisonnement<\/summary>/);
assert.match(shown,new RegExp(`class="steward-pick" data-course="poison" data-armor-offer="${second.id}"`));
assert.doesNotMatch(shown,new RegExp(`data-armor-offer="${student.id}"`),"il sait déjà");
dice=[0];
study.offer(state,second.id);
shown=card.poisonStudyHtml(state);
assert.match(shown,new RegExp(`<strong>${second.name}</strong><span>Empoisonnement · entre demain matin</span>`));
assert.match(shown,/data-course="poison" data-armor-stop="poison-/);

console.log("Empoisonnement des armes au Labo : (Intelligence + Dextérité) / 2 + Résistance au poison, l'Alchimiste, une place — OK");
