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
const {createStewardRules}=require("../game-core/steward.js");
const {createMedicRules}=require("../game-core/medic.js");
const {createSchoolDirectorRules}=require("../game-core/school-director.js");

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

// 4. Les postes (Idan, 2026-11-04 : « Oui, vas-y pour les postes ») : la relance s'ajoute à la chance (en points) ; si le
// refus tient, vexé : la perte × 2 ou × 0,5 ; flatté : le bonus perdu s'il a été intimidé, gardé s'il a été convaincu.
let postDice=[];
const postRandom=()=>postDice.length?postDice.shift():0.999;
const stewardRules=createStewardRules({reference,random:postRandom});
const medicRules=createMedicRules({reference,random:postRandom,dispensaryLevel:()=>1});
const alchemistRules=createSchoolDirectorRules({reference,random:postRandom,buildingLevel:()=>1,post:"alchemist"});
const posts=rules.createCampaign({captain,squad:[7,8,9,10].map(id=>generator.createMercenary({id,captain}))});
posts.company.intendantId=null; posts.company.medicId=null;
const [, vexed, proud, healer, cook]=posts.company.roster;
Object.assign(vexed.stats,{Intelligence:30,Courage:60});   // refus : (30 − 60) / 10 = −3, vexé
Object.assign(proud.stats,{Intelligence:80,Courage:40});   // refus : +4, flatté (une fois)
for(const m of [vexed,proud,healer,cook]) m.affinityAcquired=0;
const desire=stewardRules.desire(vexed),{min,max}=stewardRules.constants;
// Vexé (−3), intimidé, refuse encore : −6.
postDice=[0.999,0.999];
const v1=stewardRules.offer(posts,vexed.id);
assert.deepEqual([v1.accepted,v1.mood,v1.affinityDelta,v1.canRetry],[false,"vexed",-3,true]);
const v2=stewardRules.retry(posts,vexed.id,"intimidate");
assert.deepEqual([v2.ok,v2.accepted,v2.kind,v2.affinityDelta,vexed.affinityAcquired],[true,false,"offer",-3,-6]);
assert.equal(v2.chance,Math.max(min,Math.min(max,desire+captain.skills.social.Intimidation)),"+ l'Intimidation, en points");
assert.equal(stewardRules.retry(posts,vexed.id,"convince").reason,"Vous avez déjà insisté aujourd’hui.");
// Flatté (+4), intimidé, refuse encore : le bonus est perdu ; il pourra être flatté une autre fois.
postDice=[0.999,0.999];
assert.deepEqual([stewardRules.offer(posts,proud.id).mood,proud.affinityAcquired,proud.stewardFlattered],["flattered",4,true]);
assert.deepEqual([stewardRules.retry(posts,proud.id,"intimidate").affinityDelta,proud.affinityAcquired,proud.stewardFlattered],[-4,0,false]);
// Le lendemain : flatté de nouveau (+4), convaincu, refuse encore : il garde son bonus.
posts.day+=1;
postDice=[0.999,0.999];
stewardRules.offer(posts,proud.id);
assert.deepEqual([stewardRules.retry(posts,proud.id,"convince").affinityDelta,proud.affinityAcquired],[0,4]);
// Convaincu, il accepte : il devient intendant.
postDice=[0.999,0];
stewardRules.offer(posts,cook.id);
const c2=stewardRules.retry(posts,cook.id,"convince");
assert.deepEqual([c2.accepted,c2.kind,posts.company.intendantId],[true,"offer",cook.id]);
// Le médecin refuse de revenir sur le terrain (vexé), on le convainc, il refuse encore : la perte × 0,5.
posts.company.medicId=healer.id; posts.company.medicSince=posts.day-10;
Object.assign(healer.stats,{Intelligence:30,Courage:50});   // −2
postDice=[0.999,0.999];
const r1=medicRules.recall(posts);
assert.deepEqual([r1.accepted,r1.affinityDelta,r1.canRetry],[false,-2,true]);
const r2=medicRules.retry(posts,healer.id,"convince");
assert.deepEqual([r2.accepted,r2.kind,r2.affinityDelta,healer.affinityAcquired],[false,"recall",1,-1]);
// Un maître : l'Alchimiste refuse, on l'intimide, il accepte.
posts.day+=1;
postDice=[0.999,0];
assert.equal(alchemistRules.offer(posts,vexed.id).canRetry,true);
const a2=alchemistRules.retry(posts,vexed.id,"intimidate");
assert.deepEqual([a2.accepted,posts.company.alchemistId],[true,vexed.id]);
for(const [file,kind] of [["steward-ui.js",'"steward",{member:m.id}'],["medic-ui.js",'"medic",{member:m.id}'],["school-director-ui.js",'"camp-post",{member:m.id,post}']])
  assert.ok(fs.readFileSync(path.join(ROOT,"prototype-web",file),"utf8").includes(`persuasionAfter(result,${kind})`),file);

// 5. L'interface commune : les trois choix après un refus, la relance ajoutée au dialogue.
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","persuasion-ui.js"),"utf8");
assert.match(ui,/const button=key=>`<li><button type="button" data-persuade="\$\{key\}" data-persuade-kind="\$\{esc\(kind\)\}"/);
assert.match(ui,/\$\{button\("intimidate"\)\}\$\{button\("convince"\)\}\$\{challenge\}/,"Intimider, Convaincre, Défier");
assert.match(ui,/<button type="button" data-deal-leave>\$\{esc\(options\.leave\|\|""\)\}<\/button>/,"ou laisser tomber");
const spellUi=fs.readFileSync(path.join(ROOT,"prototype-web","spell-study-ui.js"),"utf8");
assert.match(spellUi,/registerPersuasion\("study",/);
assert.match(spellUi,/registerPersuasion\("teach",/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","armor-study-ui.js"),"utf8"),/persuasionAfter\(result,"aptitude",\{member:m\.id,course\}\)/);
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.ok(index.indexOf('<script src="persuasion-ui.js">')>0&&index.indexOf('<script src="persuasion-ui.js">')<index.indexOf('<script src="deal-ui.js">'));

// 6. Le Défi du capitaine, étape 2 (Idan, 2026-11-09 : « Après chaque refus (apprentissage, échange, poste, corvée),
// "Défier" s'ajoute à côté d'Intimider et Convaincre. Si on gagne, il cède. Si on perd, le refus tient ») : l'issue du duel
// tient lieu de jet ; ni bonus ni perte d'affinité en plus (le duel a les siens).
assert.deepEqual([persuasion.decide("challenge_won",false),persuasion.decide("challenge_lost",true),persuasion.decide("convince",true),
  persuasion.decide("intimidate",false)],[true,false,true,false]);
assert.deepEqual([persuasion.isChallenge("challenge_won"),persuasion.isChallenge("challenge_lost"),persuasion.isChallenge("convince")],[true,true,false]);
assert.deepEqual([persuasion.bonus(boss,"challenge_won"),persuasion.lossFactor("challenge_lost"),persuasion.gainFactor("challenge_won")],[0,1,1]);
// Un échange : il refuse ; vaincu en duel, il cède même sur un mauvais jet ; il refuse un autre jour, gagne le duel, le
// refus tient même sur un bon jet. Pas d'affinité en plus.
{
  const duelDeal=camp(20,{mine:gear("d","Hache",3)}),who=duelDeal.company.roster[1];
  roll=0.999;
  assert.equal(deals.propose(duelDeal,{mercenaryId:2,slot:"weapon_set_1_main"}).accepted,false);
  const before=who.affinityAcquired;
  const won=deals.retry(duelDeal,2,"challenge_won");
  assert.deepEqual([won.accepted,won.approach,who.affinityAcquired-before,who.equipment.slots.weapon_set_1_main],[true,"challenge_won",0,null]);
  const again=camp(21,{mine:gear("e","Hache",3)}),him=again.company.roster[1];
  roll=0.999;
  deals.propose(again,{mercenaryId:2,slot:"weapon_set_1_main"});
  roll=0;
  const lost=deals.retry(again,2,"challenge_lost"),after=him.affinityAcquired;
  assert.deepEqual([lost.accepted,him.equipment.slots.weapon_set_1_main],[false,"e"],"le refus tient");
  assert.equal(deals.retry(again,2,"convince").reason,"Vous avez déjà insisté aujourd’hui.","le défi compte comme la relance");
  assert.equal(him.affinityAcquired,after);
}
// Un port d'armure : refusé, puis vaincu en duel : il entre à l'Académie.
state.day+=1;
for(const port of ["légère","intermédiaire","lourde"]) soldier.skills.martial["Port d’armure "+port]=false;
delete soldier.armorStudyOfferDay;
dice=[0.999,0.999];
const armorOffer=rules.armorStudy.offer(state,soldier.id);
assert.equal(armorOffer.accepted,false);
const armorWon=rules.armorStudy.retry(state,soldier.id,"challenge_won");
assert.deepEqual([armorWon.accepted,armorWon.study?.status],[true,"planned"]);
// Les postes : l'intendant vaincu en duel accepte ; le médecin qui gagne le duel garde son refus (sans perte en plus).
{
  const duelPosts=rules.createCampaign({captain,squad:[30,31].map(id=>generator.createMercenary({id,captain}))});
  duelPosts.company.intendantId=null; duelPosts.company.medicId=null;
  const [, clerk, doc]=duelPosts.company.roster;
  postDice=[0.999,0.999];
  assert.equal(stewardRules.offer(duelPosts,clerk.id).accepted,false);
  const yes=stewardRules.retry(duelPosts,clerk.id,"challenge_won");
  assert.deepEqual([yes.accepted,duelPosts.company.intendantId],[true,clerk.id]);
  postDice=[0.999,0];
  const docRefusal=medicRules.offer(duelPosts,doc.id);
  assert.equal(docRefusal.accepted,false);
  const docBefore=Number(doc.affinityAcquired)||0;
  const stands=medicRules.retry(duelPosts,doc.id,"challenge_lost");
  assert.deepEqual([stands.accepted,duelPosts.company.medicId,(Number(doc.affinityAcquired)||0)-docBefore],[false,null,0]);
}
// Chaque test de refus passe par decide : apprentissages, échanges, corvées, postes.
for(const file of ["armor-study.js","equipment-deals.js","lumber.js","spell-study.js","medic.js","school-director.js","steward.js"])
  assert.match(fs.readFileSync(path.join(ROOT,"game-core",file),"utf8"),/decide\(approach,/,file);
assert.equal((fs.readFileSync(path.join(ROOT,"game-core","spell-study.js"),"utf8").match(/persuasion\.decide\(approach,/g)||[]).length,2,"élève et professeur");
const persuasionCopy=reference.persuasionDialogue;
assert.ok(persuasionCopy.options.challenge&&persuasionCopy.options.challenge_tip&&persuasionCopy.captain.challenge.length>=3
  &&persuasionCopy.reply.challenge.accepted.length>=3&&persuasionCopy.reply.challenge.refused.length>=3&&persuasionCopy.labels.challenge_won);

console.log("Relance : Intimider (+ Intimidation, perte × 2) ou Convaincre (+ Charisme ÷ 2, perte × 0,5), une fois ; sorts, professeurs, ports d'armure, empoisonnement, équipements, postes — OK");
