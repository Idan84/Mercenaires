"use strict";

// Le Cachot (Idan, 2026-11-04 : « On va créer un bâtiment "Le cachot". Avec 10 niveaux et un nombre de places par niveau. Un
// mercenaire qui refuse après test inti ou charisme peut aller au cachot. L'affinité va forcément en prendre un coup…
// Surtout qu'au cachot, on n'a pas de salaire… D'ailleurs le capitaine peut envoyer n'importe qui au cachot » ; « Parfait
// pour tout. Non l'affinité ne revient pas après ») : 1 cellule par niveau, −10 puis −2 par jour, pas de salaire, il perd
// son poste, sa corvée, son apprentissage ; jusqu'à ce qu'on le libère.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createStewardRules}=require("../game-core/steward.js");
const {createLieutenantRules}=require("../game-core/lieutenants.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.dungeonDialogue,"dungeon-dialogue.json","le jeu charge les textes");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual(["cells_per_level","entry_affinity","daily_affinity"].map(k=>constant("camp.dungeon."+k)),[1,-10,-2]);
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);
const row=reference.campBuildings.rows.find(r=>r.code==="dungeon");
assert.deepEqual([row.nom,row.niveaux,row.prix_base,row.jours_base,row.requiert,row.places_pas,row.entraine],["Le Cachot",10,1000,4,null,0,null]);

let seed=43,dice=[];
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,
  random:()=>dice.length?dice.shift():0.999});
const dungeon=rules.dungeonRules;
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6].map(id=>generator.createMercenary({id,captain}))});
const [, steward, worker, student, master, other]=state.company.roster;
const aff=m=>Number(m.affinityAcquired)||0;
assert.equal(rules.agenda.keys()[0],"dungeon","sa raison d'abord : « Il est au cachot. »");

// Il faut le Cachot ; 1 cellule par niveau ; ni le capitaine, ni un mercenaire en mission.
assert.equal(dungeon.canJail(state,steward).reason,"Il faut d’abord construire le Cachot.");
state.company.camp.buildings={dungeon:{level:3,construction:null},lumber_camp:{level:1,construction:null},
  survival_academy:{level:1,construction:null},ludus:{level:1,construction:null}};
assert.equal(dungeon.cells(state),3);
assert.equal(dungeon.canJail(state,captain).reason,"Le capitaine n’ira pas au cachot.");

// L'intendant, avec une corvée… non : un mercenaire ne tient qu'une chose ; l'intendant perd son poste, le bûcheron sa corvée,
// l'élève son apprentissage, le Doctore son poste.
state.company.intendantId=steward.id; state.company.intendantSince=state.day-4;
dice=[0];
assert.equal(rules.lumberjacks.send(state,worker.id).accepted,true);
for(const port of ["légère","intermédiaire","lourde"]) student.skills.martial["Port d’armure "+port]=false;
dice=[0];
assert.equal(rules.armorStudy.offer(state,student.id).accepted,true);
state.company.doctoreId=master.id; state.company.doctoreSince=state.day;
state.company.lieutenantIds=[other.id];
const before=[steward,worker,student].map(aff);
const payroll=rules.payroll(state);
const s1=dungeon.jail(state,steward.id);
assert.deepEqual([s1.ok,s1.affinityDelta,s1.left,state.company.intendantId,steward.history.stewardDays,steward.dungeon.since],[true,-10,["steward"],null,4,state.day]);
assert.deepEqual(dungeon.jail(state,worker.id).left,["lumber"]);
assert.equal(rules.lumberjacks.entryOf(state,worker.id),null);
assert.deepEqual(dungeon.jail(state,student.id).left,["armor"]);
assert.equal(rules.armorStudy.studyOf(state,student.id),null);
assert.deepEqual([steward,worker,student].map((m,i)=>aff(m)-before[i]),[-10,-10,-10]);
assert.equal(dungeon.canJail(state,master).reason,"Le Cachot est plein.");
assert.equal(dungeon.jail(state,steward.id).reason,"Il est déjà au cachot.");

// Au cachot : pas de salaire ; ni mission, ni entraînement, ni corvée, ni apprentissage, ni poste.
const salary=m=>Number(m.contract?.dailySalary)||0;
assert.equal(rules.payroll(state),payroll-salary(steward)-salary(worker)-salary(student));
assert.equal(rules.studyBusy(state,steward),"Il est au cachot.");
state.missionBoard={offer:{id:"contrat",code:"cleanup",distance:1}};
assert.equal(rules.departExpedition(state,[captain.id,steward.id]).reason,"Il est au cachot.");
state.missionBoard=null;
assert.equal(rules.lumberjacks.canSend(state,worker).reason,"Il est au cachot.");
assert.equal(rules.armorStudy.canStudy(state,student).reason,"Il est au cachot.");
assert.equal(createStewardRules({reference}).canOffer(state,worker).reason,"Il est au cachot.");
assert.equal(createLieutenantRules({reference}).canPromote(state,worker).reason,"Il est au cachot.");
// Chaque matin : −2 ; les salaires du jour sans eux ; pas d'entraînement.
const gold=state.company.gold;
const [morning]=rules.advanceTime(state,1);
assert.deepEqual(morning.dungeon.map(p=>[p.id,p.affinityDelta]),[[steward.id,-2],[worker.id,-2],[student.id,-2]]);
assert.equal(morning.salaries.total,rules.payroll(state));
assert.ok(!morning.school.entries.some(e=>[steward.id,worker.id,student.id].includes(e.id)));
assert.equal(dungeon.daysIn(state,steward),1);

// On le libère : il reprend sa place ; l'affinité perdue ne revient pas ; l'historique le garde.
const kept=aff(steward);
const freed=dungeon.release(state,steward.id);
assert.deepEqual([freed.ok,freed.days,aff(steward),rules.studyBusy(state,steward)],[true,1,kept,null]);
assert.equal(dungeon.release(state,steward.id).reason,"Il n’est pas au cachot.");
assert.deepEqual(steward.history.log.filter(e=>/dungeon/.test(e.kind)).map(e=>[e.kind,e.days??null]),[["dungeon",null],["dungeon_release",1]]);
// Un lieutenant y perd son grade ; un maître, son poste.
assert.deepEqual(dungeon.jail(state,other.id).left,["lieutenant"]);
assert.deepEqual(state.company.lieutenantIds,[]);

// Interface : la carte du Cachot, « Au cachot ! » après une relance ratée, le statut, l'historique.
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const MercenairesRecruitDialogue={fill:(text,vars)=>String(text||"").replace(/\{([^|}]*)\|([^}]*)\}/g,(_,a)=>a).replace(/\{(\w+)\}/g,(_,k)=>vars[k]??""),firstName:m=>m.name};
const ui=new Function("game","campaignRules","renderAvatar","fmt","esc","MercenairesRecruitDialogue",
  fs.readFileSync(path.join(ROOT,"prototype-web","dungeon-ui.js"),"utf8")+"\nreturn {dungeonHtml,dungeonChoiceHtml};")(
  {campaign:state,referenceData:reference},()=>rules,()=>"",fmt,esc,MercenairesRecruitDialogue);
const full=ui.dungeonHtml(state);
assert.doesNotMatch(full,/Envoyer au cachot/,"plein : plus de bouton");
assert.match(full,new RegExp(`<h4>Au cachot \\(3 / 3\\)</h4>[\\s\\S]*<strong>${worker.name}</strong><span>depuis 1 jour</span>[\\s\\S]*data-dungeon-release="${worker.id}">Libérer`));
assert.match(full,new RegExp(`<strong>${other.name}</strong><span>depuis aujourd’hui</span>`));
assert.equal(ui.dungeonChoiceHtml(master),"","plus de cellule libre");
dungeon.release(state,other.id);
assert.match(ui.dungeonHtml(state),/<summary class="talk-offer-btn" title="[^"]+">Envoyer au cachot<\/summary>/);
assert.match(ui.dungeonChoiceHtml(master),new RegExp(`<button type="button" data-dungeon-jail="${master.id}" data-dungeon-dialog>Au cachot !</button>`));
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","persuasion-ui.js"),"utf8"),/!result\.accepted&&typeof dungeonChoiceHtml==="function"\?dungeonChoiceHtml\(m\):""/);
const ui2=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
assert.match(ui2,/if\(c\.dungeon\) return \{kind:"wounded",label:"Au cachot"\};/);
assert.match(ui2,/entry\.kind==="dungeon_release"/);
assert.ok(reference.characterSheetCopy.history.events.dungeon&&reference.characterSheetCopy.history.events.dungeon_release);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8"),/code==="dungeon"&&typeof dungeonHtml==="function"\?dungeonHtml\(c\):""/);
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(index,/<script src="\/core\/dungeon\.js"><\/script>/);
assert.match(index,/<script src="dungeon-ui\.js"><\/script>/);

console.log("Le Cachot : 1 cellule par niveau, −10 puis −2 par jour, pas de salaire, poste, corvée et apprentissage perdus, libérer — OK");
