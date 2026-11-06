"use strict";

// Perfectionner un sort à l'École de magie (Idan, 2026-11-02 : « consommer des manuels contre de l'xp de sort ») : un
// manuel du même sort, sans test ; le manuel détruit, une journée dans la salle de l'école du sort (une place prise, au
// camp) ; le lendemain matin, 1 000 × Intelligence / 50 × (1 + 0,1 × salle) × (1 + Transmission du directeur / 100) XP
// de sort, sans plafond (Idan, 2026-11-06) ; affinité +2.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createProgressionRules}=require("../game-core/progression.js");
const {createAffinityRules}=require("../game-core/affinity.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual(["base_xp","intelligence_divisor","room_bonus","transmission_divisor"].map(k=>constant("spell_study.perfect."+k)),[1000,50,0.1,100]);
assert.equal(constant("spell_study.affinity.perfect"),2);

const progression=createProgressionRules({reference});
const affinity=createAffinityRules({reference});
let seed=4;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,progression,affinity,random});
const study=rules.spellStudy;
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4].map(id=>generator.createMercenary({id,captain}))});
const [, mage, other, director]=state.company.roster;
const fireball=reference.spells.rows.find(s=>s.nom==="Boule de feu");
const manual=()=>{ const item=generator.createItemByName("manual",fireball.nom); state.company.stock.push(item); return item; };
for(const m of state.company.roster) m.spells=[];
mage.spells=[{code:fireball.code,name:fireball.nom,school:"Feu",mastery:20}];
mage.stats.Intelligence=54;
const book=manual();

// Conditions : il connaît le sort ; la salle de son école, avec une place ; même au-delà de 100 (sans plafond, 2026-11-06).
assert.equal(study.canPerfect(state,other,book).reason,"Il ne connaît pas ce sort.");
assert.equal(study.canPerfect(state,mage,book).reason,"Il faut d’abord construire la Salle du Feu.");
state.company.camp.buildings={magic_school:{level:3,construction:null},magic_room_fire:{level:3,construction:null}};
assert.equal(study.canPerfect(state,mage,book).ok,true);
mage.spells[0].mastery=100;
assert.equal(study.canPerfect(state,mage,book).ok,true,"un sort au niveau 100 se perfectionne encore");
mage.spells[0].mastery=20;
assert.equal(study.canStudy(state,mage,book).reason,"Il connaît déjà ce sort.","on n'apprend pas un sort connu : on le perfectionne");

// L'XP : 1 000 × 54 / 50 × 1,3 = 1 404 ; avec un directeur à 48 de Transmission × 1,48.
assert.equal(study.perfectXp(state,mage,"magic_room_fire"),1404);
director.skills.camp["Transmission du savoir"]=48;
state.company.directorId=director.id;
assert.equal(study.perfectXp(state,mage,"magic_room_fire"),2078);
state.company.directorId=null;

// Sans test. Au jour J, on organise J+1 (Idan, 2026-11-02) : inscrit pour demain, le manuel mis de côté, la place
// réservée ; on peut encore annuler (le manuel revient).
const affinityBefore=Number(mage.affinityAcquired)||0;
const done=study.perfect(state,mage.id,book.id);
assert.deepEqual([done.ok,done.xp,done.affinityDelta,done.room.code,done.study.status],[true,1404,0,"magic_room_fire","planned"]);
assert.ok(!state.company.stock.includes(book),"le manuel est mis de côté");
assert.equal(study.busyReason(state,mage.id),"Il entre à l’École de magie demain matin.");
assert.equal(study.learnersIn(state,"magic_room_fire"),1,"la place est réservée");
assert.equal(study.stop(state,done.study.id).cancelled,true);
assert.ok(state.company.stock.includes(book),"annulé : le manuel revient");
assert.equal(study.perfect(state,mage.id,book.id).ok,true);
assert.equal(study.canTeach(state,study.studyOf(state,mage.id),other).reason,"Pas de professeur pour perfectionner un sort.");
state.missionBoard={offer:{id:"contrat",code:"cleanup",distance:1}};
assert.deepEqual(rules.departExpedition(state,[mage.id,other.id]),{ok:false,reason:"Il entre à l’École de magie demain matin."});
state.missionBoard=null;
// Le capitaine aussi, sans test (il connaît le sort).
captain.spells=[{code:fireball.code,name:fireball.nom,school:"Feu",mastery:5}];
assert.equal(study.canPerfect(state,captain,manual()).ok,true);

// Le lendemain matin : il entre (le manuel détruit, +2) et passe la journée à l'École.
const [enter]=rules.advanceTime(state,1);
assert.deepEqual(enter.study.started.map(x=>[x.mercenary,x.affinityDelta]),[[mage,2]]);
assert.equal((Number(mage.affinityAcquired)||0)-affinityBefore,2);
assert.ok(!state.company.stock.includes(book),"le manuel est détruit");
assert.equal(study.busyReason(state,mage.id),"Il perfectionne un sort à l’École de magie.");
// Le matin suivant : l'XP du sort, puis il sort de l'École.
const [report]=rules.advanceTime(state,1);
assert.equal(report.study.perfected.length,1);
const p=report.study.perfected[0];
assert.deepEqual([p.mercenary,p.xp,p.before],[mage,1404,20]);
const expected=progression.continuousLevel(progression.xpForContinuous(20)+1404);
assert.ok(Math.abs(mage.spells[0].mastery-expected)<1e-6,"niveau 20 → 23,2");
assert.equal(Math.floor(mage.spells[0].mastery),23);
assert.equal(study.studyOf(state,mage.id),null,"une seule journée");
assert.deepEqual(mage.history.log.filter(e=>e.kind==="perfect").map(e=>[e.spell,e.xp,e.before,e.after]),[["Boule de feu",1404,20,23]]);
// Sans plafond (Idan, 2026-11-06 : « oui libère les sorts ») : le sort dépasse 100.
mage.spells[0].mastery=99.9;
study.perfect(state,mage.id,manual().id);
rules.advanceTime(state,2);
assert.ok(mage.spells[0].mastery>100,"au-delà de 100");

// Interface : « Perfectionner » dans « Apprendre à… », la ligne de l'encart, le journal.
const elements={};
const $=id=>elements[id]||(elements[id]={innerHTML:"",textContent:"",showModal(){}});
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const log=[];
const game={campaign:state,referenceData:reference};
mage.spells[0].mastery=30;
const ui=new Function("game","$","fmt","esc","campaignRules","manualRules","tavernLog","saveGame","renderGame","renderAvatar","variantPhrase","MercenairesRecruitDialogue",
  fs.readFileSync(path.join(ROOT,"prototype-web","spell-study-ui.js"),"utf8")+"\nreturn {studyLearnMenu,studyListHtml,logSpellStudy,perfectSpell};")(
  game,$,fmt,esc,()=>rules,()=>({spellOf:item=>reference.spells.rows.find(s=>"Manuel : "+s.nom===item.name)}),(message,kind)=>log.push({message,kind}),()=>{},()=>{},()=>"",
  lines=>lines[0],{fill:(text,vars)=>String(text||""),firstName:m=>m.name});
const menuBook=manual();
assert.match(ui.studyLearnMenu(menuBook),new RegExp(`data-study-perfect="${mage.id}" data-study-item="${menuBook.id}">Perfectionner<small>\\+1404 XP · une journée<\\/small>`));
ui.perfectSpell(mage.id,menuBook.id);
assert.deepEqual(log.at(-1),{message:`${mage.name} passera demain la journée à la Salle du Feu pour perfectionner Boule de feu (+1404 XP le surlendemain matin).`,kind:"gear"});
// Inscrit pour demain : « Annuler » (le manuel revient) ; une fois entré : ni professeur ni sortie.
assert.match(ui.studyListHtml(state),new RegExp(`<strong>${mage.name}<\\/strong><span>Boule de feu · Salle du Feu · perfectionne, entre demain matin<\\/span>`));
assert.match(ui.studyListHtml(state),/data-study-stop="[^"]+" title="Il n’est pas encore entré : le manuel revient à l’Intendance\.">Annuler<\/button>/);
rules.spellStudy.advance({...state,day:state.day+1});
assert.match(ui.studyListHtml(state),new RegExp(`<strong>${mage.name}<\\/strong><span>Boule de feu · Salle du Feu · perfectionne \\(\\+1404 XP demain\\)<\\/span>`));
assert.doesNotMatch(ui.studyListHtml(state),/data-study-stop/,"ni professeur ni sortie pour une journée");
ui.logSpellStudy({started:[{mercenary:{name:"Aldric"},study:{kind:"perfect",room:"magic_room_fire",spellName:"Boule de feu"}}]});
assert.deepEqual(log.at(-1),{message:"Aldric entre à la Salle du Feu pour perfectionner Boule de feu.",kind:"turn"});
ui.logSpellStudy({perfected:[{mercenary:{name:"Aldric"},study:{spellName:"Boule de feu"},xp:1404,before:20,after:23.25}],learned:[]});
assert.deepEqual(log.at(-1),{message:"Aldric perfectionne Boule de feu : niveau 20 → 23 (+1404 XP).",kind:"turn"});
assert.ok(reference.characterSheetCopy.history.events.perfect);

console.log("Perfectionner un sort : manuel du même sort, une journée à l'École, 1 000 × Int/50 × salle × directeur, +2 d'affinité — OK");
