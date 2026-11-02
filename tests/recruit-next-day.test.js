"use strict";

// Au jour J, on organise J+1 (Idan, 2026-11-02) : « on recrute immédiatement, mais on paye le salaire à j+1 et elle
// peut partir en mission ou faire des actions concrètes à j+1. Seul l'équipement est immédiat. » La recrue rejoint la
// compagnie tout de suite (on l'équipe, on l'inscrit pour une mission qui part demain matin) ; un poste (intendant,
// médecin, directeur de l'École, lieutenant) attend le lendemain matin.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createStewardRules}=require("../game-core/steward.js");
const {createMedicRules}=require("../game-core/medic.js");
const {createSchoolDirectorRules}=require("../game-core/school-director.js");
const {createLieutenantRules}=require("../game-core/lieutenants.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));

let seed=11;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,random});
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4].map(id=>generator.createMercenary({id,captain}))});
state.company.camp.buildings={magic_school:{level:1,construction:null}};
state.company.camp.dormitoryCapacity=40;

// Signature au jour J : il est dans la compagnie, rien n'est encore payé.
const candidate=state.tavern.candidates[0];
candidate.negotiation={...(candidate.negotiation||{}),agreed:{salary:30,bonus:90}};
const gold=state.company.gold,signDay=state.day;
const signed=rules.signCandidate(state,candidate.mercenary.id);
const recruit=signed.mercenary;
assert.equal(signed.ok,true);
assert.deepEqual(recruit.contract,{dailySalary:30,missionBonus:90,signedDay:signDay,joinDay:signDay+1});
assert.ok(state.company.roster.includes(recruit),"recruté immédiatement");
assert.equal(state.company.gold,gold,"le salaire est payé à J+1, pas à la signature");

// Un poste attend le lendemain matin.
const WAIT="Il rejoint la compagnie demain matin.";
const dormitory={free:s=>rules.dormitoryFree(s),places:m=>rules.dormitoryPlaces(m)};
const steward=createStewardRules({reference,random:()=>0,dormitory});
const medic=createMedicRules({reference,random:()=>0,dormitory,dispensaryLevel:()=>1});
const director=createSchoolDirectorRules({reference,random:()=>0,dormitory,schoolLevel:s=>rules.buildingLevel(s,"magic_school")});
const lieutenants=createLieutenantRules({reference});
assert.equal(steward.offer(state,recruit.id).reason,WAIT);
assert.equal(medic.offer(state,recruit.id).reason,WAIT);
assert.equal(director.offer(state,recruit.id).reason,WAIT);
assert.equal(lieutenants.canPromote(state,recruit).reason,WAIT);
assert.ok(!lieutenants.candidates(state).includes(recruit),"pas dans la liste des lieutenants possibles");
assert.equal(recruit.stewardOfferDay,undefined,"le refus ne compte pas comme une proposition du jour");

// Mais on peut l'inscrire pour une mission qui part demain matin.
state.missionBoard={offer:{id:"contrat",code:"cleanup",distance:1}};
const other=state.company.roster.find(m=>m!==recruit&&m.id!==captain.id);
const departed=rules.departExpedition(state,[recruit.id,other.id]);
assert.equal(departed.ok,true,departed.reason);
assert.equal(departed.expedition.departDay,signDay+1);
state.expeditions=[];
state.missionBoard=null;

// Le lendemain matin : son premier salaire, puis un poste devient possible.
const [morning]=rules.advanceTime(state,1);
assert.equal(morning.salaries.total,rules.payroll(state));
assert.ok(morning.salaries.total>=30,"son salaire est compté dans la paie du matin");
assert.equal(steward.canOffer(state,recruit).ok,true);
assert.notEqual(lieutenants.canPromote(state,recruit).reason,WAIT);

// Interface : « Disponible demain » dans l'effectif, grisé dans les listes de nomination.
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
assert.match(ui,/if\(game\.campaign&&Number\(c\.contract\?\.joinDay\)>game\.campaign\.day\) return \{kind:"available",label:"Disponible demain"\};/);
for(const file of ["steward-ui.js","medic-ui.js","school-director-ui.js"])
  assert.match(fs.readFileSync(path.join(ROOT,"prototype-web",file),"utf8"),/arriving=Number\(m\.contract\?\.joinDay\)>[\w.]+day;[\s\S]{0,200}disabled title="\$\{esc\(arriving\?"Il rejoint la compagnie demain matin\.":copy\.asked_today\|\|""\)\}"/,file);

// Le panneau du directeur : la recrue du jour est grisée.
state.day=signDay;
state.company.directorId=null;
const elements={};
const $=id=>elements[id]||(elements[id]={innerHTML:""});
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
globalThis.MercenairesSchoolDirector=require("../game-core/school-director.js");
const panel=new Function("game","$","fmt","esc","campaignRules","renderAvatar","stewardDays","MercenairesRecruitDialogue",
  fs.readFileSync(path.join(ROOT,"prototype-web","school-director-ui.js"),"utf8")+"\nreturn {renderSchoolDirectorPanel};")(
  {campaign:state,referenceData:reference},$,fmt,esc,()=>rules,()=>"",n=>n+" jours",{fill:text=>String(text||""),firstName:m=>m.name});
panel.renderSchoolDirectorPanel();
assert.match(elements["director-panel"].innerHTML,new RegExp(`data-director-offer="${recruit.id}" disabled title="Il rejoint la compagnie demain matin\\.">`));
assert.doesNotMatch(elements["director-panel"].innerHTML,new RegExp(`data-director-offer="${other.id}" disabled`));

console.log("Recrue : dans la compagnie dès la signature, salaire et poste le lendemain matin, mission de demain possible — OK");
