"use strict";

// Relance après un refus (Idan, 2026-11-04 : « On peut retenter via deux options de dialogues (ou laisser tomber) :
// Intimider, Convaincre. On refait le test en ajoutant son intimidation ou son charisme (moitié du cha). En intimidation, ça
// double la perte d'affinité. En charisme, ça la divise par deux » ; « valable pour tout test de refus » ; « Oui Go ! » ;
// étape 3a, « vas-y pour les apprentissages ») : le module commun, puis les apprentissages (sort, professeur, port d'armure,
// empoisonnement) ; si la relance échoue, la perte du refus est × 2 (intimidé) ou × 0,5 (convaincu) ; si elle réussit en
// intimidant, pas de gain d'affinité au premier matin.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createPersuasionRules}=require("../game-core/persuasion.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createProgressionRules}=require("../game-core/progression.js");
const {createAffinityRules}=require("../game-core/affinity.js");
const {createSpellStudyRules}=require("../game-core/spell-study.js");
const {createEquipmentDeals}=require("../game-core/equipment-deals.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));

// 1. Le module : le bonus, le facteur, le refus du jour (une seule relance).
const persuasion=createPersuasionRules({reference});
const boss={stats:{Charisme:54},skills:{social:{Intimidation:38}}};
assert.deepEqual([persuasion.bonus(boss,"intimidate"),persuasion.bonus(boss,"convince"),persuasion.bonus(boss,null)],[38,27,0]);
assert.deepEqual([persuasion.lossFactor("intimidate"),persuasion.lossFactor("convince"),persuasion.lossFactor(null)],[2,0.5,1]);
assert.deepEqual([persuasion.refusalExtra(-2,"intimidate"),persuasion.refusalExtra(-2,"convince")],[-2,1],"−2 devient −4 ou −1");
const someone={};
assert.equal(persuasion.canRetry(someone,"x",3).reason,"Il n’a rien refusé aujourd’hui.");
persuasion.markRefused(someone,"x",3,{itemId:9});
assert.deepEqual(persuasion.canRetry(someone,"x",3).refusal,{day:3,retried:false,accepted:false,approach:null,itemId:9});
assert.equal(persuasion.canRetry(someone,"x",4).reason,"Il n’a rien refusé aujourd’hui.","seulement le jour même");
persuasion.markRetried(someone,"x","convince",false);
assert.equal(persuasion.canRetry(someone,"x",3).reason,"Vous avez déjà insisté aujourd’hui.");

// 2. Les apprentissages.
const progression=createProgressionRules({reference});
const affinity=createAffinityRules({reference});
let seed=13,dice=[];
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,progression,affinity,
  random:()=>dice.length?dice.shift():0.999});
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6].map(id=>generator.createMercenary({id,captain}))});
const [, mage, teacher, soldier, alchemist]=state.company.roster;
state.company.intendantId=null;
for(const m of state.company.roster) m.spells=[];
const aff=m=>Number(m.affinityAcquired)||0;
const study=rules.spellStudy;

// Un sort : il refuse (−2), on le convainc… il refuse encore : la perte du refus devient −1 (+1).
state.company.camp.buildings={magic_school:{level:3,construction:null},magic_room_fire:{level:1,construction:null},
  survival_academy:{level:1,construction:null},alchemy_lab:{level:1,construction:null}};
const fireball=reference.spells.rows.find(s=>s.nom==="Boule de feu");
const book=generator.createItemByName("manual",fireball.nom);
state.company.stock.push(book);
const spell0=aff(mage);
dice=[0.999];
const refused=study.offer(state,mage.id,book.id);
assert.deepEqual([refused.accepted,refused.canRetry,aff(mage)-spell0],[false,true,-2]);
assert.equal(study.canStudy(state,mage,book).reason,"Vous lui en avez déjà parlé aujourd’hui.");
const base=study.offerChance(state,mage,fireball).delta;
assert.ok(Math.abs(study.offerChance(state,mage,fireball,"convince").delta-(base+captain.stats.Charisme/2))<1e-9);
assert.ok(Math.abs(study.offerChance(state,mage,fireball,"intimidate").delta-(base+captain.skills.social.Intimidation))<1e-9);
dice=[0.999];
const again=study.retryOffer(state,mage.id,"convince");
assert.deepEqual([again.ok,again.accepted,again.approach,again.affinityDelta,aff(mage)-spell0],[true,false,"convince",1,-1]);
assert.equal(study.retryOffer(state,mage.id,"intimidate").reason,"Vous avez déjà insisté aujourd’hui.");
assert.ok(state.company.stock.includes(book),"le manuel reste à l'Intendance");
// Le lendemain : il refuse, on l'intimide… il accepte : il entre à l'École (le manuel est pris).
state.day+=1;
dice=[0.999,0];
assert.equal(study.offer(state,mage.id,book.id).accepted,false);
const forced=study.retryOffer(state,mage.id,"intimidate");
assert.deepEqual([forced.accepted,forced.approach,forced.study.status,forced.study.startDay],[true,"intimidate","planned",state.day+1]);
assert.ok(!state.company.stock.includes(book));
assert.equal(study.retryOffer(state,mage.id,"convince").reason,"Il n’a rien refusé aujourd’hui.");

// Un professeur : il refuse (−2), on l'intimide, il refuse encore : −4 en tout.
teacher.spells=[{code:fireball.code,mastery:60}];
const teach0=aff(teacher);
dice=[0.999,0.999];
assert.equal(study.offerTeacher(state,forced.study.id,teacher.id).canRetry,true);
const teach=study.retryTeacher(state,forced.study.id,teacher.id,"intimidate");
assert.deepEqual([teach.accepted,teach.affinityDelta,aff(teacher)-teach0],[false,-2,-4]);
// Le lendemain, on le convainc : il enseigne.
state.day+=1;
dice=[0.999,0];
study.offerTeacher(state,forced.study.id,teacher.id);
const teaches=study.retryTeacher(state,forced.study.id,teacher.id,"convince");
assert.deepEqual([teaches.accepted,forced.study.teacherId],[true,teacher.id]);

// Un port d'armure et l'empoisonnement : la même relance.
for(const port of ["légère","intermédiaire","lourde"]) soldier.skills.martial["Port d’armure "+port]=false;
const armor0=aff(soldier);
dice=[0.999,0.999];
assert.equal(rules.armorStudy.offer(state,soldier.id).canRetry,true);
assert.deepEqual([rules.armorStudy.retry(state,soldier.id,"intimidate").affinityDelta,aff(soldier)-armor0],[-2,-4]);
assert.equal(rules.armorStudy.canStudy(state,soldier).reason,"Vous lui en avez déjà parlé aujourd’hui.");
delete alchemist.skills.martial["Empoisonnement des armes"];
dice=[0.999,0];
assert.equal(rules.poisonStudy.offer(state,alchemist.id).accepted,false);
const poison=rules.poisonStudy.retry(state,alchemist.id,"convince");
assert.deepEqual([poison.accepted,poison.study.status],[true,"planned"]);
assert.equal(rules.poisonStudy.retry(state,soldier.id,"convince").reason,"Il n’a rien refusé aujourd’hui.","chaque apprentissage garde son refus");

// Intimidé, il ne gagne pas les +5 du premier matin ; convaincu, il les garde (Idan, 2026-11-04 : « B ») ; de même pour le
// professeur (+3).
assert.deepEqual([persuasion.gainFactor("intimidate"),persuasion.gainFactor("convince"),persuasion.gainFactor(null)],[0,1,1]);
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual([constant("persuasion.intimidate.gain_factor"),constant("persuasion.convince.gain_factor")],[0,1]);
const teacherBefore=aff(teacher);
dice=[];
const [morning]=rules.advanceTime(state,1);
assert.deepEqual(morning.study.started.map(s=>[s.mercenary.id,s.affinityDelta]),[[mage.id,0]],"intimidé : rien");
assert.deepEqual(morning.poisonStudy.started.map(s=>[s.mercenary.id,s.affinityDelta]),[[alchemist.id,5]],"convaincu : +5");
// Le professeur commence le matin d'après l'entrée de l'élève.
rules.advanceTime(state,1);
assert.equal(aff(teacher)-teacherBefore,3,"le professeur convaincu garde ses +3");

// 3. Les échanges d'équipement (Idan, 2026-11-04 : « vas-y pour les équipements ») : l'affinité de l'échange (accord ou
// refus) est revue après la relance : une perte × 2 (intimidé) ou × 0,5 (convaincu) ; un gain accordé, rien s'il a été
// intimidé.
assert.deepEqual([persuasion.outcomeExtra(-6,"intimidate",false),persuasion.outcomeExtra(-6,"convince",true),
  persuasion.outcomeExtra(4,"intimidate",true),persuasion.outcomeExtra(4,"convince",true),persuasion.outcomeExtra(4,"intimidate",false)],[-6,3,-4,0,0]);
let roll=0;
const deals=createEquipmentDeals({reference,random:()=>roll,affinityRules:{memberAffinity:()=>({total:0})}});
const gear=(id,name,tier)=>({id,name,tier,itemType:"weapon",owner:null,slot:null});
function camp(day,{mine=null,stock=[]}={}){
  const borin={id:2,name:"Borin",stats:{Intelligence:80},items:[],equipment:{slots:{weapon_set_1_main:null,weapon_set_1_off:null}}};
  if(mine){ borin.items.push({...mine,owner:2,slot:"weapon_set_1_main"}); borin.equipment.slots.weapon_set_1_main=mine.id; }
  const boss={id:1,name:"Capitaine",stats:{Intelligence:60,Charisme:54},skills:{social:{Intimidation:38}},items:[],equipment:{slots:{}}};
  return {day,company:{captainId:1,roster:[boss,borin],stock}};
}
// On veut lui reprendre son sabre : il refuse (−6), on l'intimide, il refuse encore : −12 en tout.
const take=camp(4,{mine:gear("a","Sabre",3)}),borin=take.company.roster[1],request={mercenaryId:2,slot:"weapon_set_1_main"};
assert.equal(deals.evaluate(take,request,"intimidate").delta,deals.evaluate(take,request).delta+38);
assert.equal(deals.evaluate(take,request,"convince").delta,deals.evaluate(take,request).delta+27);
roll=0.999;
const no1=deals.propose(take,request);
assert.deepEqual([no1.accepted,no1.affinityDelta,no1.canRetry],[false,-6,true]);
const no2=deals.retry(take,2,"intimidate");
assert.deepEqual([no2.ok,no2.accepted,no2.affinityDelta,borin.affinityAcquired],[true,false,-6,-12]);
assert.equal(deals.retry(take,2,"convince").reason,"Vous avez déjà insisté aujourd’hui.");
assert.equal(borin.equipment.slots.weapon_set_1_main,"a","il garde son sabre");
// Le lendemain : il refuse (−6), on le convainc, il le rend : la perte devient −3.
take.day=5; borin.affinityAcquired=0;
assert.equal(deals.propose(take,request).accepted,false);
roll=0;
const yes=deals.retry(take,2,"convince");
assert.deepEqual([yes.accepted,yes.affinityDelta,borin.affinityAcquired,borin.equipment.slots.weapon_set_1_main,take.company.stock.map(i=>i.id)],
  [true,3,-3,null,["a"]]);
// Un cadeau refusé (+4 quand même) puis accepté sous la menace : il ne gagne rien ; convaincu, il garde ses +4.
for(const [approach,total] of [["intimidate",0],["convince",4]]){
  const gift=camp(6,{stock:[gear("s","Lance",2)]}),who=gift.company.roster[1];
  roll=0.999;
  const first=deals.propose(gift,{mercenaryId:2,slot:"weapon_set_1_main",stockItemId:"s"});
  assert.deepEqual([first.accepted,first.affinityDelta],[false,4]);
  roll=0;
  assert.equal(deals.retry(gift,2,approach).accepted,true);
  assert.deepEqual([who.affinityAcquired,who.equipment.slots.weapon_set_1_main],[total,"s"],approach);
}
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","deal-ui.js"),"utf8"),/persuasionAfter\(result,"deal",\{member:m\.id\}\)/);

// 4. L'interface commune : les trois choix après un refus, la relance ajoutée au dialogue.
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","persuasion-ui.js"),"utf8");
assert.match(ui,/\["intimidate","convince"\]\.map\(key=>`<li><button type="button" data-persuade="\$\{key\}" data-persuade-kind="\$\{esc\(kind\)\}"/);
assert.match(ui,/<button type="button" data-deal-leave>\$\{esc\(options\.leave\|\|""\)\}<\/button>/,"ou laisser tomber");
const spellUi=fs.readFileSync(path.join(ROOT,"prototype-web","spell-study-ui.js"),"utf8");
assert.match(spellUi,/registerPersuasion\("study",/);
assert.match(spellUi,/registerPersuasion\("teach",/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","armor-study-ui.js"),"utf8"),/persuasionAfter\(result,"aptitude",\{member:m\.id,course\}\)/);
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.ok(index.indexOf('<script src="persuasion-ui.js">')>0&&index.indexOf('<script src="persuasion-ui.js">')<index.indexOf('<script src="deal-ui.js">'));

console.log("Relance : Intimider (+ Intimidation, perte × 2) ou Convaincre (+ Charisme ÷ 2, perte × 0,5), une fois ; sorts, professeurs, ports d'armure, empoisonnement, équipements — OK");
