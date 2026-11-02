"use strict";

// Apprentissage d'un sort à l'École de magie (Idan, 2026-11-02) : le manuel et la salle de l'école du sort ; conviction
// comme pour l'équipement (Δ = 0,5 × affinité + 0,5 × (école − 50) + appui de l'intendant), une fois par jour, le
// capitaine sans test ; le manuel détruit, une place prise, l'élève reste au camp ; chaque matin 100 / (1 + e^(−(X −
// 100)/20)) × (1 + 0,1 × salle), au plus 95 %, X = (Int + école) / 2 + (école du directeur + Transmission) / 10 +
// Transmission du professeur / 5 ; sort au niveau de la salle ou du professeur × Transmission / 100 ; professeur qui
// connaît le sort, Δ = (affinité avec le capitaine + affinité envers l'élève) / 2, il reste au camp, on peut le libérer ;
// sortir avant la fin : manuel perdu ; affinité +5 / −2 / +10 / −10, professeur +3 / −2 / +5 / −3.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules,serializeCampaign,restoreCampaign}=require("../game-core/campaign.js");
const {createProgressionRules}=require("../game-core/progression.js");
const {createAffinityRules}=require("../game-core/affinity.js");
const {createSpellStudyRules}=require("../game-core/spell-study.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.spellStudyDialogue,"spell-study-dialogue.json");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual(["accept","refuse","learned","stopped","teacher_accept","teacher_refuse","teacher_learned","teacher_released"]
  .map(k=>constant("spell_study.affinity."+k)),[5,-2,10,-10,3,-2,5,-3]);
assert.deepEqual([constant("spell_study.daily.center"),constant("spell_study.daily.slope"),constant("spell_study.daily.room_bonus"),
  constant("spell_study.daily.max"),constant("spell_study.daily.director_divisor"),constant("spell_study.daily.teacher_divisor")],[100,20,0.1,95,10,5]);
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);

const progression=createProgressionRules({reference});
const affinity=createAffinityRules({reference});
let seed=9;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,progression,affinity,random});
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6].map(id=>generator.createMercenary({id,captain}))});
const [, mage, teacher, other, fourth, fifth]=state.company.roster;
for(const m of state.company.roster) m.spells=[];

// Un jeu de règles aux dés choisis, sur les salles de la campagne.
let dice=[];
const roomOfSchool=school=>{ const row=reference.campBuildings.rows.find(r=>r.requiert==="magic_school"&&r.ecole===school); return row?{code:row.code,name:row.nom}:null; };
const study=createSpellStudyRules({reference,random:()=>dice.length?dice.shift():0.5,affinity,progression,camp:{roomOfSchool,
  buildingLevel:rules.buildingLevel,buildingPlaces:rules.buildingPlaces,expeditionOf:rules.expeditionOf,
  directorOf:s=>s.company.directorId==null?null:s.company.roster.find(m=>m.id===s.company.directorId)||null}});
const fireball=reference.spells.rows.find(s=>s.nom==="Boule de feu");
const manual=()=>{ const item=generator.createItemByName("manual",fireball.nom); state.company.stock.push(item); return item; };
const book=manual();
// Affinité avec le capitaine ramenée à 0 (part initiale compensée).
const neutral=m=>{ m.affinityAcquired=0; m.affinityAcquired=-affinity.memberAffinity(captain,m).total; };

// Il faut la salle de l'école du sort, avec une place.
assert.equal(study.canStudy(state,mage,book).reason,"Il faut d’abord construire la Salle du Feu.");
state.company.camp.buildings={magic_school:{level:3,construction:null},magic_room_fire:{level:1,construction:null}};
assert.equal(study.canStudy(state,mage,book).ok,true);
assert.equal(study.canStudy(state,mage,book).room.code,"magic_room_fire");

// Conviction : 10 + 80 / (1 + e^(−Δ/20)), Δ = 0,5 × affinité + 0,5 × (école − 50).
neutral(mage); mage.skills.magic.Feu=80;
assert.equal(Math.round(study.offerChance(state,mage,fireball).chance),64,"affinité 0, école 80");
mage.skills.magic.Feu=1;
assert.equal(Math.round(study.offerChance(state,mage,fireball).chance),28,"affinité 0, sans l'école");
mage.affinityAcquired+=50; mage.skills.magic.Feu=80;
assert.equal(Math.round(study.offerChance(state,mage,fireball).chance),80,"affinité 50, école 80");
// L'intendant appuie, comme pour un échange.
state.company.intendantId=fifth.id;
fifth.skills.camp.Intendance=50;
assert.ok(study.offerChance(state,mage,fireball).chance>80);
state.company.intendantId=null;
neutral(mage); mage.skills.magic.Feu=80;
// Refus : −2, le manuel reste, une fois par jour.
dice=[0.99];
const refused=study.offer(state,mage.id,book.id);
assert.deepEqual([refused.ok,refused.accepted,refused.affinityDelta],[true,false,-2]);
assert.equal(mage.affinityAcquired,-affinity.memberAffinity(captain,{...mage,affinityAcquired:0}).total-2);
assert.ok(state.company.stock.includes(book));
assert.equal(study.offer(state,mage.id,book.id).reason,"Vous lui en avez déjà parlé aujourd’hui.");
assert.deepEqual(mage.history.log.filter(e=>e.kind==="study").map(e=>[e.accepted,e.spell]),[[false,"Boule de feu"]]);
// Accord (Idan, 2026-11-02 : au jour J, on organise J+1) : inscrit pour le lendemain matin, le manuel mis de côté,
// la place réservée ; l'affinité tombe quand il entre.
state.day+=1;
dice=[0];
const affinityAtAccept=mage.affinityAcquired;
const accepted=study.offer(state,mage.id,book.id);
assert.deepEqual([accepted.accepted,accepted.affinityDelta],[true,0]);
assert.equal(mage.affinityAcquired,affinityAtAccept);
assert.ok(!state.company.stock.includes(book),"le manuel est mis de côté");
assert.deepEqual(study.studiesOf(state).map(s=>[s.status,s.studentId,s.spellCode,s.room,s.startDay,s.days,s.teacherId,s.manual===book]),
  [["planned",mage.id,fireball.code,"magic_room_fire",state.day+1,0,null,true]]);
assert.equal(study.busyReason(state,mage.id),"Il entre à l’École de magie demain matin.");
// On change d'avis dans la journée : le manuel revient, sans affinité.
const cancelled=study.stop(state,study.studyOf(state,mage.id).id);
assert.deepEqual([cancelled.ok,cancelled.cancelled,cancelled.affinityDelta],[true,true,0]);
assert.ok(state.company.stock.includes(book),"le manuel revient à l'Intendance");
assert.equal(mage.affinityAcquired,affinityAtAccept);
state.day+=1; dice=[0];
assert.equal(study.offer(state,mage.id,book.id).accepted,true);
// Salle du Feu au niveau 1 : 1 place, réservée ; la suivante attend.
const second=manual();
assert.equal(study.canStudy(state,other,second).reason,"La Salle du Feu n’a plus de place.");
assert.equal(study.canStudy(state,mage,second).reason,"Il entre à l’École de magie demain matin.","pas de suite planifiée");
// Le lendemain matin : il entre ; le manuel est détruit, +5 ; premier test le matin suivant.
state.day+=1;
const entering=study.advance(state);
assert.deepEqual(entering.started.map(x=>[x.mercenary.id,x.affinityDelta]),[[mage.id,5]]);
assert.deepEqual([entering.tested.length,entering.learned.length],[0,0]);
assert.equal(mage.affinityAcquired,affinityAtAccept+5);
const entered=study.studyOf(state,mage.id);
assert.deepEqual([entered.status,entered.startDay,entered.manual],["active",state.day,undefined]);
assert.ok(!state.company.stock.includes(book),"le manuel est détruit");
assert.equal(study.busyReason(state,mage.id),"Il apprend un sort à l’École de magie.");
assert.equal(study.canStudy(state,mage,second).reason,"Il apprend un sort à l’École de magie.");
// Le capitaine apprend sans test (une place de plus au niveau 2) ; annulé dans la journée.
state.company.camp.buildings.magic_room_fire.level=2;
dice=[0.999];
const self=study.offer(state,captain.id,second.id);
assert.deepEqual([self.accepted,self.chance,self.affinityDelta],[true,100,0]);
assert.equal(study.stop(state,study.studyOf(state,captain.id).id).cancelled,true);
assert.ok(state.company.stock.includes(second));
state.company.camp.buildings.magic_room_fire.level=1;

// Le test du jour : les exemples validés.
const pct=(int,school,{room=1,director=null,teacherT=null}={})=>{
  const s={...study.studiesOf(state)[0]};
  mage.stats.Intelligence=int; mage.skills.magic.Feu=school;
  state.company.camp.buildings.magic_room_fire.level=room;
  state.company.directorId=director?director.id:null;
  if(teacherT!=null){ teacher.skills.camp["Transmission du savoir"]=teacherT; s.teacherId=teacher.id; }
  const chance=study.dailyChance(state,s).chance;
  state.company.directorId=null; state.company.camp.buildings.magic_room_fire.level=1;
  return Math.round(chance);
};
assert.equal(pct(54,70),14,"moyen : 7 jours");
assert.equal(pct(75,110),45,"talentueux : 2 jours");
assert.equal(pct(35,1),2,"pas doué : presque jamais");
fourth.skills.magic.Feu=100; fourth.skills.camp["Transmission du savoir"]=48;
assert.equal(pct(54,70,{director:fourth}),26,"avec un directeur");
assert.equal(pct(54,70,{teacherT:48}),21,"avec un professeur");
assert.equal(pct(54,70,{director:fourth,teacherT:48}),37,"directeur et professeur");
assert.equal(pct(54,70,{room:5}),20,"salle niveau 5");
assert.equal(pct(150,150,{room:10}),95,"au plus 95 %");
mage.stats.Intelligence=54; mage.skills.magic.Feu=70;

// Le professeur : il connaît le sort, il accepte selon les affinités, il reste au camp.
const current=study.studiesOf(state)[0];
assert.equal(study.canTeach(state,current,teacher).reason,"Il ne connaît pas ce sort.");
teacher.spells=[{code:fireball.code,name:fireball.nom,school:"Feu",mastery:40}];
assert.equal(study.canTeach(state,current,mage).reason,"Il ne peut pas s’enseigner le sort.");
assert.equal(study.canTeach(state,current,teacher).ok,true);
neutral(teacher);
const feeling=affinity.affinity(mage,teacher).total;
assert.ok(Math.abs(study.teachChance(state,current,teacher).delta-feeling/2)<1e-9,"(affinité avec le capitaine + affinité envers l'élève) / 2");
dice=[0.999];
const no=study.offerTeacher(state,current.id,teacher.id);
assert.deepEqual([no.accepted,no.affinityDelta,current.teacherId],[false,-2,null]);
assert.equal(study.offerTeacher(state,current.id,teacher.id).reason,"Vous lui en avez déjà parlé aujourd’hui.");
state.day+=1;
dice=[0];
const yes=study.offerTeacher(state,current.id,teacher.id);
assert.deepEqual([yes.accepted,yes.affinityDelta,current.teacherId,current.teacherFrom],[true,0,teacher.id,state.day+1],"il enseigne dès demain");
assert.equal(study.busyReason(state,teacher.id),"Il enseigne un sort à l’École de magie.");
assert.deepEqual(teacher.history.log.filter(e=>e.kind==="teach").map(e=>e.accepted),[false,true]);
// Niveau transmis (test du surlendemain, quand il enseigne) : professeur à 40, Transmission 48 → 19 ; 120 → 48 ;
// sans professeur, ou pour le test de demain matin (il n'a pas encore enseigné) : la salle.
teacher.skills.camp["Transmission du savoir"]=48;
assert.equal(study.learnedLevel(state,current,state.day+2),19);
assert.equal(study.learnedLevel(state,current),1,"demain matin, il n'a pas encore enseigné");
teacher.skills.camp["Transmission du savoir"]=120;
assert.equal(study.learnedLevel(state,current,state.day+2),48,"20 % de plus que le professeur");
teacher.skills.camp["Transmission du savoir"]=10;
state.company.camp.buildings.magic_room_fire.level=7;
assert.equal(study.learnedLevel(state,current,state.day+2),7,"la salle, si le professeur transmet moins");
state.company.camp.buildings.magic_room_fire.level=1;
teacher.skills.camp["Transmission du savoir"]=48;
// On change d'avis dans la journée : libéré avant de commencer, sans affinité.
assert.deepEqual([study.releaseTeacher(state,current.id).affinityDelta,current.teacherId],[0,null]);
state.day+=1; dice=[0];
assert.equal(study.offerTeacher(state,current.id,teacher.id).accepted,true);

// Les matins. Demain : raté ; le professeur commence (+3), il ne compte pas encore (ni bonus ni XP).
const teacherAffinity0=teacher.affinityAcquired;
const transmission=teacher.xp?.skills?.camp?.["Transmission du savoir"]??null;
state.day+=1; dice=[0.99];
let morning=study.advance(state);
assert.deepEqual([morning.learned.length,current.days,current.teacherStarted],[0,1,true]);
assert.equal(teacher.affinityAcquired-teacherAffinity0,3,"+3 quand il commence");
assert.equal(teacher.xp?.skills?.camp?.["Transmission du savoir"]??null,transmission,"pas encore d'XP");
// Libéré une fois commencé : −3 ; on le reprend le lendemain.
assert.equal(study.releaseTeacher(state,current.id).affinityDelta,-3);
state.day+=1; dice=[0];
study.offerTeacher(state,current.id,teacher.id);
state.day+=1; dice=[0.99];
morning=study.advance(state);
assert.equal(morning.learned.length,0);
// Le matin suivant : il a enseigné la veille (XP), et l'élève sait (sort, affinité, historique).
const studentAffinity=mage.affinityAcquired,teacherAffinity=teacher.affinityAcquired;
state.day+=1; dice=[0];
morning=study.advance(state);
assert.ok(teacher.xp.skills.camp["Transmission du savoir"]>(transmission??0),"+5 XP de Transmission par jour d'enseignement");
assert.equal(morning.learned.length,1);
assert.deepEqual(mage.spells,[{code:fireball.code,name:"Boule de feu",school:"Feu",mastery:19}]);
assert.deepEqual([mage.affinityAcquired-studentAffinity,teacher.affinityAcquired-teacherAffinity],[10,5]);
assert.equal(study.studiesOf(state).length,0,"il sort de l'École");
assert.equal(study.busyReason(state,teacher.id),null,"le professeur aussi");
assert.deepEqual(mage.history.log.filter(e=>e.kind==="study_done").map(e=>[e.spell,e.level,e.days]),[["Boule de feu",19,3]]);
assert.equal(teacher.history.log.filter(e=>e.kind==="teach_done").length,1);

// Sortir avant la fin : le manuel perdu, rien d'acquis, −10.
const third=manual();
neutral(other); other.skills.magic.Feu=80;
dice=[0];
study.offer(state,other.id,third.id);
state.day+=1;
study.advance(state);
const before=other.affinityAcquired;
const stopped=study.stop(state,study.studyOf(state,other.id).id);
assert.deepEqual([stopped.ok,stopped.affinityDelta,other.affinityAcquired-before],[true,-10,-10]);
assert.ok(!state.company.stock.includes(third)&&!(other.spells||[]).length,"manuel perdu, rien d'acquis");
assert.equal(other.history.log.at(-1).kind,"study_stopped");

// Dans la campagne : l'élève et le professeur restent au camp ; la place est prise avant l'entraînement libre.
const campaignStudy=rules.spellStudy;
assert.ok(campaignStudy,"la campagne a ses règles d'apprentissage");
const fourthBook=manual();
neutral(fourth); fourth.skills.magic.Feu=200; fourth.stats.Intelligence=10;
let accepted2=null;
for(let i=0;i<40&&!accepted2?.accepted;i++){ state.day+=1; accepted2=campaignStudy.offer(state,fourth.id,fourthBook.id); }
assert.equal(accepted2.accepted,true);
state.missionBoard={offer:{id:"contrat",code:"cleanup",distance:1}};
assert.deepEqual(rules.departExpedition(state,[fourth.id,fifth.id]),{ok:false,reason:"Il entre à l’École de magie demain matin."});
state.missionBoard=null;
assert.equal(rules.canGuard(state,fourth,{level:1}).reason,"Il entre à l’École de magie demain matin.");
const restored=restoreCampaign(serializeCampaign(state)).state;
assert.equal(restored.company.camp.studies.length,1);
fourth.stats.Intelligence=1; fourth.skills.magic.Feu=1;
const [enter]=rules.advanceTime(state,1);
assert.deepEqual([enter.study.started.length,enter.study.tested.length],[1,0],"il entre ce matin");
const [report]=rules.advanceTime(state,1);
assert.ok(report.study&&report.study.tested.length===1,"un test par élève chaque matin");
assert.ok(!report.school.entries.some(e=>e.id===fourth.id),"l'élève ne fait pas l'entraînement libre");
assert.ok(!report.school.entries.some(e=>e.code==="magic_room_fire"),"la place de la Salle du Feu est prise");

// Interface.
const deal=fs.readFileSync(path.join(ROOT,"prototype-web","deal-ui.js"),"utf8");
assert.match(deal,/function manualLearnMenu\(item\)\{ return studyLearnMenu\(item\); \}/);
assert.doesNotMatch(deal,/learnFromManual|data-manual-learn/);
const page=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
const at=src=>page.indexOf(`<script src="${src}"></script>`);
assert.ok(at("/core/spell-manuals.js")>0&&at("/core/spell-manuals.js")<at("/core/spell-study.js")&&at("/core/spell-study.js")<at("/core/campaign.js"));
assert.ok(at("spell-study-ui.js")>0);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8"),/if\(typeof logSpellStudy==="function"\) logSpellStudy\(report\.study\);/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8"),/const eligible=allCharacters\(\)\.filter\(c=>!offField\(c\)&&!away\(c\)&&!studying\(c\)\);/);
const copy=reference.spellStudyDialogue;
for(const kind of ["offer","teacher"]) for(const mood of ["accepted","refused"]) assert.ok(copy[kind][mood].length>=3,`${kind} ${mood}`);
const events=reference.characterSheetCopy.history.events;
assert.ok(events.study.accord&&events.study_done&&events.study_stopped&&events.teach.accord&&events.teach_done);

const elements={};
const $=id=>elements[id]||(elements[id]={innerHTML:"",textContent:"",showModal(){this.open=true;}});
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const log=[];
const game={campaign:state,referenceData:reference};
const ui=new Function("game","$","fmt","esc","campaignRules","manualRules","tavernLog","saveGame","renderGame","renderAvatar","variantPhrase","MercenairesRecruitDialogue",
  fs.readFileSync(path.join(ROOT,"prototype-web","spell-study-ui.js"),"utf8")+"\nreturn {studyLearnMenu,studyListHtml,logSpellStudy,offerSpellStudy};")(
  game,$,fmt,esc,()=>rules,()=>({spellOf:item=>reference.spells.rows.find(s=>"Manuel : "+s.nom===item.name)}),(message,kind)=>log.push({message,kind}),()=>{},()=>{},()=>"",
  lines=>lines[0],{fill:(text,vars)=>String(text||"").replace(/\{(\w+)\}/g,(_,k)=>vars[k]??"").replace(/\{([^|}]*)\|[^}]*\}/g,"$1"),firstName:m=>m.name});
const menuBook=manual();
let menu=ui.studyLearnMenu(menuBook);
assert.match(menu,/<p class="deal-menu-title">Apprendre à…<\/p><p class="deal-menu-current">Boule de feu · Feu<\/p>/);
assert.match(menu,/La Salle du Feu n’a plus de place\./);
state.company.camp.buildings.magic_room_fire.level=2;
menu=ui.studyLearnMenu(menuBook);
assert.match(menu,new RegExp(`data-study-offer="${captain.id}" data-study-item="${menuBook.id}">Apprendre<small>Salle du Feu<\\/small>`));
assert.match(menu,new RegExp(`data-study-offer="${fifth.id}" data-study-item="${menuBook.id}">Lui proposer<small>Salle du Feu<\\/small>`));
const list=ui.studyListHtml(state);
assert.match(list,/<h4>Apprentissages<\/h4>/);
assert.match(list,new RegExp(`<strong>${fourth.name}<\\/strong><span title="Chance de le savoir demain matin : \\d+ %">Boule de feu · Salle du Feu · jour 2<\\/span>`));
assert.match(list,/data-study-teacher="[^"]+" data-teacher-id="[^"]+"><b>[^<]+<\/b><small>Transmission \d+<\/small>/,"ceux qui connaissent le sort");
assert.match(list,/data-study-stop="[^"]+" title="Le manuel est perdu et rien n’est acquis\.">Le faire sortir<\/button>/);
ui.logSpellStudy({learned:[{mercenary:{name:"Aldric"},teacher:{name:"Brune"},study:{spellName:"Boule de feu"},level:19,days:3}]});
assert.deepEqual(log.at(-1),{message:"Aldric connaît désormais Boule de feu (niveau 19), après 3 jours, avec Brune.",kind:"turn"});

console.log("Apprentissage d'un sort : manuel et salle, conviction, test du jour, professeur, niveau transmis, affinité, au camp jusqu'à la fin — OK");
