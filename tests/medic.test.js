"use strict";

// Médecin (Idan, 2026-11-01) : nommé une fois le Dispensaire construit ; il peut refuser, comme l'intendant ; hors
// mission comme l'intendant (dortoir, missions, garde du corps, lieutenant) ; blessures × (1 − Médecine / 250) en plus du
// Dispensaire ; Renommée + sa Médecine ; 10 XP de Médecine par jour de blessure guéri. Fiche à côté de l'intendant.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules,serializeCampaign,restoreCampaign}=require("../game-core/campaign.js");
const {createProgressionRules}=require("../game-core/progression.js");
const {createMedicRules}=require("../game-core/medic.js");
const {createStewardRules}=require("../game-core/steward.js");
const {createLieutenantRules}=require("../game-core/lieutenants.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.medicDialogue,"medic-dialogue.json","le jeu charge les textes du médecin");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual([constant("medic.wound.skill_divisor"),constant("medic.renown.skill_share"),constant("medic.xp.per_wound_day")],[250,1,10]);

let seed=7;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const progression=createProgressionRules({reference});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,progression});
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5].map(id=>generator.createMercenary({id,captain}))});
const [, doc, other, wounded, fifth]=state.company.roster;
assert.equal(state.company.medicId,null,"pas de médecin au départ");

let dice=[];
const medic=createMedicRules({reference,random:()=>dice.length?dice.shift():0.999,
  dormitory:{free:s=>rules.dormitoryFree(s),places:m=>rules.dormitoryPlaces(m)},dispensaryLevel:s=>rules.buildingLevel(s,"dispensary")});
const steward=createStewardRules({reference,random:()=>0});

// Il faut le Dispensaire.
assert.deepEqual(medic.offer(state,doc.id),{ok:false,reason:"Il faut d’abord construire le Dispensaire."});
state.company.camp.buildings={dispensary:{level:1,construction:null}};
assert.deepEqual(medic.offer(state,captain.id),{ok:false,reason:"Le capitaine ne peut pas être médecin."});

// Même chance que pour l'Intendance ; un refus fait bouger l'affinité comme chez l'intendant ; une fois par jour.
assert.equal(medic.appointChance(doc),steward.appointChance(doc));
doc.stats.Intelligence=70; doc.stats.Courage=20;
dice=[0.999];
const refused=medic.offer(state,doc.id);
assert.deepEqual([refused.ok,refused.accepted,refused.mood,refused.affinityDelta],[true,false,"flattered",5]);
assert.equal(doc.medicFlattered,true);
assert.deepEqual(medic.offer(state,doc.id),{ok:false,reason:"Vous lui en avez déjà parlé aujourd’hui."});
state.day+=1;
dice=[0];
const accepted=medic.offer(state,doc.id);
assert.deepEqual([accepted.accepted,state.company.medicId,state.company.medicSince],[true,doc.id,state.day]);
assert.equal(medic.medicOf(state),doc);
assert.deepEqual(medic.offer(state,other.id),{ok:false,reason:"La compagnie a déjà un médecin."});
assert.deepEqual(doc.history.log.filter(e=>e.kind==="medic").map(e=>e.accepted),[false,true]);

// Hors mission, comme l'intendant.
const lieutenants=createLieutenantRules({reference});
assert.equal(steward.offer(state,doc.id).reason,"Le médecin ne peut pas être intendant.");
assert.equal(lieutenants.canPromote(state,doc).reason,"Le médecin ne peut pas être lieutenant.");
const usedWith=rules.dormitoryUsed(state);
state.company.medicId=null;
assert.equal(rules.dormitoryUsed(state),usedWith+rules.dormitoryPlaces(doc),"il vit au Dispensaire : pas de place au dortoir");
state.company.medicId=doc.id;
state.missionBoard={offer:{id:"contrat",code:"cleanup",distance:1}};
assert.deepEqual(rules.departExpedition(state,[doc.id,other.id]),{ok:false,reason:"Le médecin reste au camp."});
state.missionBoard=null;
assert.equal(rules.canGuard(state,doc,{level:1}).reason,"Le médecin reste au camp.");

// Blessures : × (1 − Médecine / 250), en plus du Dispensaire (−10 % au niveau 1), au moins 1 jour.
doc.skills.camp["Médecine"]=50;
assert.equal(rules.campBuildingEffects(state).medicFactor,0.8);
assert.ok(Math.abs(rules.campBuildingEffects(state).woundFactor-0.72)<1e-9,"0,9 × 0,8");
assert.equal(rules.woundDaysFor(wounded,10,state),8,"10 jours × 0,72 = 7,2 → 8");
assert.equal(rules.woundDaysFor(wounded,1,state),1,"au moins 1 jour");

// Renommée : + sa Médecine, tant qu'il est en poste.
const renown=rules.companyRenown(state);
assert.equal(renown.parts.medic,50);
state.company.medicId=null;
assert.equal(rules.companyRenown(state).total,renown.total-50);
state.company.medicId=doc.id;

// XP : 10 XP de Médecine par jour que la blessure a duré, à la guérison.
wounded.recovery={kind:"wounded",daysLeft:1,sinceDay:state.day-8};
fifth.recovery={kind:"fatigued",daysLeft:1,sinceDay:state.day-3};
const before=doc.skills.camp["Médecine"];
const [report]=rules.advanceTime(state,1);
const healed=report.recovered.find(r=>r.mercenary===wounded);
assert.equal(healed.medicXp,90,"blessé pendant 9 jours");
assert.equal(report.recovered.find(r=>r.mercenary===fifth).medicXp,undefined,"la fatigue ne compte pas");
assert.ok(doc.skills.camp["Médecine"]>before,"sa Médecine monte");
assert.equal(doc.xp.skills.camp["Médecine"],progression.xpForContinuous(before)+90);

// Retour sur le terrain : même règle que l'intendant, place au dortoir comprise.
const capacity=state.company.camp.dormitoryCapacity;
state.company.camp.dormitoryCapacity=rules.dormitoryUsed(state);
assert.equal(medic.recall(state).dormFull,true);
state.company.camp.dormitoryCapacity=capacity;
state.day+=3;
dice=[0];
const back=medic.recall(state);
assert.deepEqual([back.accepted,back.days,state.company.medicId],[true,4,null]);
assert.equal(doc.history.medicDays,4);
assert.equal(rules.campBuildingEffects(state).medicFactor,1,"plus de médecin : plus d'effet");

// Sauvegarde : le médecin reste nommé.
state.company.medicId=doc.id;
const restored=restoreCampaign(serializeCampaign(state)).state;
assert.equal(restored.company.medicId,doc.id);

// Interface : sa fiche à côté de l'intendant, en haut de l'Intendance.
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(html,/<div id="steward-panel" class="steward-panel"><\/div><div id="medic-panel" class="steward-panel medic-panel"><\/div>/);
assert.match(html,/<script src="\/core\/medic\.js"><\/script>/);
assert.match(html,/<script src="medic-ui\.js"><\/script>/);
const copy=reference.medicDialogue;
for(const kind of ["offer","recall"]) for(const mood of ["accepted","flattered","vexed","neutral"]) assert.ok(copy[kind][mood].length>=3,`${kind} ${mood}`);

console.log("Médecin : Dispensaire, refus comme l'intendant, hors mission, blessures × (1 − Médecine/250), Renommée, XP par jour de blessure — OK");
