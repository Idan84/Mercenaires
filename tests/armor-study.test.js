"use strict";

// Apprendre un port d'armure à l'Académie de la survie (Idan, 2026-11-03 : « comme un sort » ; Force + Endurance :
// « Parfait » ; « pas de professeur pour ça ») : légère, puis intermédiaire, puis lourde ; le convaincre comme pour un sort ;
// il entre le lendemain matin, prend une place de la salle principale et reste au camp ; chaque matin, un test ; le
// Vétéran aide s'il a ce port.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createArmorPorts}=require("../game-core/armor-ports.js");
const {createProgressionRules}=require("../game-core/progression.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.armorStudyDialogue,"armor-study-dialogue.json","le jeu charge les textes");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual([constant("armor_study.daily.class_malus"),constant("armor_study.daily.veteran_divisor")],[10,5]);
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);

let seed=13,dice=[];
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,
  progression:createProgressionRules({reference}),random:()=>dice.length?dice.shift():0.999});
const study=rules.armorStudy;
const ports=createArmorPorts(reference);
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5].map(id=>generator.createMercenary({id,captain}))});
const [, novice, second, third, fourth]=state.company.roster;
const naked=m=>{ for(const t of ["légère","intermédiaire","lourde"]) delete m.skills.martial["Port d’armure "+t]; };
for(const m of [novice,second,third]) naked(m);
Object.assign(novice.stats,{Force:54,Endurance:59});

// Il faut l'Académie ; le prochain port, dans l'ordre.
assert.deepEqual(study.canStudy(state,novice),{ok:false,reason:"Il faut d’abord construire l’Académie de la survie."});
state.company.camp.buildings={survival_academy:{level:1,construction:null}};
assert.deepEqual(study.canStudy(state,novice),{ok:true,type:"Légère"});
fourth.skills.martial["Port d’armure lourde"]=true;
assert.equal(study.canStudy(state,fourth).reason,"Il sait déjà porter une armure lourde.");
assert.deepEqual([study.nextClass({skills:{martial:{"Port d’armure légère":true}}}),study.nextClass({skills:{martial:{}}})],["Intermédiaire","Légère"]);

// Le convaincre : comme pour un sort, sans école (affinité 0, sans intendant : 50 %) ; une fois par jour.
state.company.intendantId=null;
const affinity=Number(rules.affinity?.memberAffinity?.(captain,novice)?.total)||0;
assert.ok(Math.abs(study.offerChance(state,novice).chance-(10+80/(1+Math.exp(-0.5*affinity/20))))<1e-9);
assert.equal(study.offerChance(state,captain).chance,100,"le capitaine, sans test");
const before=Number(novice.affinityAcquired)||0;
dice=[0.999];
const refused=study.offer(state,novice.id);
assert.deepEqual([refused.ok,refused.accepted,refused.affinityDelta,novice.affinityAcquired-before],[true,false,-2,-2]);
assert.equal(study.offer(state,novice.id).reason,"Vous lui en avez déjà parlé aujourd’hui.");
state.day+=1;
dice=[0];
const accepted=study.offer(state,novice.id);
assert.deepEqual([accepted.accepted,accepted.type,accepted.study.status,accepted.study.startDay],[true,"Légère","planned",state.day+1]);
assert.deepEqual(novice.history.log.filter(e=>e.kind==="armor_study").map(e=>[e.accepted,e.armor]),[[false,"Légère"],[true,"Légère"]]);
// Une place à l'Académie niveau 1 ; inscrit, il ne part plus en mission et n'apprend pas de sort.
assert.equal(study.canStudy(state,second).reason,"L’Académie de la survie n’a plus de place.");
assert.equal(rules.studyBusy(state,novice),"Il entre à l’Académie de la survie demain matin.");
state.missionBoard={offer:{id:"contrat",code:"cleanup",distance:1}};
assert.equal(rules.departExpedition(state,[novice.id,second.id]).reason,"Il entre à l’Académie de la survie demain matin.");
state.missionBoard=null;
const manual=generator.createItemByName("manual",reference.spells.rows[0].nom);
state.company.stock.push(manual);
assert.equal(rules.spellStudy.canStudy(state,novice,manual).reason,"Il entre à l’Académie de la survie demain matin.");
state.company.stock=state.company.stock.filter(i=>i!==manual);
// Annuler avant d'entrer : rien ne bouge.
const cancelled=study.stop(state,accepted.study.id);
assert.deepEqual([cancelled.cancelled,cancelled.affinityDelta,study.studiesOf(state).length],[true,0,0]);
dice=[0];
state.day+=1;
const again=study.offer(state,novice.id);
assert.equal(again.accepted,true);

// Le lendemain matin, il entre (+5) ; sa place est prise pour l'entraînement libre ; le premier test le matin suivant.
const affinityBefore=novice.affinityAcquired;
dice=[];
const [morning]=rules.advanceTime(state,1);
assert.deepEqual(morning.armorStudy.started.map(s=>[s.mercenary.id,s.affinityDelta]),[[novice.id,5]]);
assert.equal(novice.affinityAcquired,affinityBefore+5);
assert.equal(rules.studyBusy(state,novice),"Il apprend à porter une armure à l’Académie de la survie.");
assert.ok(!morning.school.entries.some(e=>e.code==="survival_academy"),"la seule place est prise");
assert.ok(!morning.school.entries.some(e=>e.id===novice.id),"il ne s'entraîne pas librement");

// Le test du matin : X = (Force + Endurance) / 2 − 10 par cran + Transmission du Vétéran / 5 s'il a ce port.
const active=study.studyOf(state,novice.id);
const pct=x=>100/(1+Math.exp(-(x-100)/20))*1.1;
let daily=study.dailyChance(state,active);
assert.deepEqual([daily.base,daily.masterBonus,daily.roomLevel],[56.5,0,1]);
assert.ok(Math.abs(daily.chance-pct(56.5))<1e-9);
assert.equal(Math.round(daily.chance),11,"moyen, légère : 11 % (9 jours)");
assert.equal(Math.round(study.dailyChance(state,{...active,type:"Intermédiaire"}).chance),7);
assert.equal(Math.round(study.dailyChance(state,{...active,type:"Lourde"}).chance),4);
state.company.veteranId=fourth.id;
fourth.skills.camp={...(fourth.skills.camp||{}),"Transmission du savoir":48};
daily=study.dailyChance(state,active);
assert.equal(daily.masterBonus,9.6);
assert.equal(Math.round(daily.chance),17,"avec un Vétéran à 48 : 17 % (6 jours)");
delete fourth.skills.martial["Port d’armure lourde"];
assert.equal(study.dailyChance(state,active).masterBonus,0,"sans le port, le Vétéran n'aide pas");
fourth.skills.martial["Port d’armure lourde"]=true;
state.company.camp.buildings.survival_academy.level=5;
assert.ok(Math.abs(study.dailyChance(state,active).chance-Math.min(95,100/(1+Math.exp(-(66.1-100)/20))*1.5))<1e-9,"× (1 + 0,1 × niveau)");
state.company.camp.buildings.survival_academy.level=1;

// Raté, puis réussi : il sait porter une armure légère (+10) ; le Vétéran gagne 20 XP de Transmission par élève.
const transmission=Number(fourth.skills.camp["Transmission du savoir"]);
dice=[0.999];
let [day]=rules.advanceTime(state,1);
assert.deepEqual([day.armorStudy.tested.length,day.armorStudy.learned.length,day.armorStudy.masterXp,active.days],[1,0,20,1]);
assert.ok(fourth.skills.camp["Transmission du savoir"]>transmission,"XP de Transmission");
const plates=reference.baseArmors.rows.find(r=>r.type_armure==="Légère");
assert.equal(ports.canWear(novice,{itemType:"armor",templateId:"armor:"+plates.code,name:plates.nom}).ok,false);
const learnedAffinity=novice.affinityAcquired;
dice=[0];
[day]=rules.advanceTime(state,1);
assert.deepEqual(day.armorStudy.learned.map(l=>[l.mercenary.id,l.type,l.days,l.affinityDelta]),[[novice.id,"Légère",2,10]]);
assert.equal(novice.affinityAcquired,learnedAffinity+10);
assert.equal(novice.skills.martial["Port d’armure légère"],true);
assert.equal(ports.canWear(novice,{itemType:"armor",templateId:"armor:"+plates.code,name:plates.nom}).ok,true,"il peut la porter");
assert.equal(study.studyOf(state,novice.id),null);
assert.equal(rules.studyBusy(state,novice),null,"il sort de l'Académie");
assert.deepEqual(novice.history.log.filter(e=>e.kind==="armor_study_done").map(e=>[e.armor,e.days]),[["Légère",2]]);
assert.deepEqual(study.canStudy(state,novice),{ok:true,type:"Intermédiaire"},"puis l'intermédiaire");
// Apprendre la lourde donne les deux autres.
dice=[0];
study.offer(state,second.id);
const heavy=study.studyOf(state,second.id);
heavy.type="Lourde";heavy.status="active";heavy.startDay=state.day;
dice=[0];
rules.advanceTime(state,1);
assert.deepEqual(["légère","intermédiaire","lourde"].map(t=>second.skills.martial["Port d’armure "+t]),[true,true,true]);

// Le faire sortir : rien n'est acquis (−10).
dice=[0];
state.day+=1;
study.offer(state,third.id);
rules.advanceTime(state,1);
const outAffinity=third.affinityAcquired;
const out=study.stop(state,study.studyOf(state,third.id).id);
assert.deepEqual([out.ok,out.affinityDelta,third.affinityAcquired,third.skills.martial["Port d’armure légère"]],[true,-10,outAffinity-10,undefined]);
assert.deepEqual(third.history.log.filter(e=>e.kind==="armor_study_stopped").map(e=>e.armor),["Légère"]);

// Textes, journal, fiche.
const copy=reference.armorStudyDialogue;
assert.ok(copy.offer.accepted.length>=3&&copy.offer.refused.length>=3&&copy.offer.proposal.includes("{armure}"));
const events=reference.characterSheetCopy.history.events;
assert.ok(events.armor_study.accord&&events.armor_study.refus&&events.armor_study_done&&events.armor_study_stopped);
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
assert.match(ui,/if\(entry\.kind==="armor_study_done"\) return fill\(copy\.armor_study_done,\{armure,jours:/);
assert.match(ui,/\{kind:"steward",label:"Apprend une armure"\}/);
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(html,/<script src="\/core\/armor-ports\.js"><\/script>\s*<script src="\/core\/armor-study\.js"><\/script>/);
assert.match(html,/<script src="spell-study-ui\.js"><\/script>\s*<script src="armor-study-ui\.js"><\/script>/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8"),/logArmorStudy\(report\.armorStudy\)/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8"),/code==="survival_academy"&&typeof armorStudyHtml==="function"\?armorStudyHtml\(c\):""/);

// La carte de l'Académie : le bouton, les membres et leur prochain port ; les élèves.
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const card=new Function("game","campaignRules","renderAvatar","fmt","esc",
  fs.readFileSync(path.join(ROOT,"prototype-web","armor-study-ui.js"),"utf8")+"\nreturn {armorStudyHtml};")(
  {campaign:state,referenceData:reference},()=>rules,()=>"",fmt,esc);
state.day+=1;
let shown=card.armorStudyHtml(state);
assert.match(shown,/<summary class="talk-offer-btn" title="[^"]+">Apprendre une armure<\/summary>/);
assert.match(shown,new RegExp(`data-armor-offer="${novice.id}">[\\s\\S]*?<small>Intermédiaire</small>`));
assert.doesNotMatch(shown,new RegExp(`data-armor-offer="${second.id}"`),"il les a toutes");
dice=[0];
study.offer(state,novice.id);
shown=card.armorStudyHtml(state);
assert.match(shown,/<h4>Apprentissages<\/h4>/);
assert.match(shown,new RegExp(`<strong>${novice.name}</strong><span>Armure intermédiaire · entre demain matin</span>`));
assert.doesNotMatch(shown,/Apprendre une armure/,"plus de place : plus de bouton");

console.log("Ports d'armure à l'Académie : convaincre, une place, un test chaque matin, le Vétéran, sortir — OK");
