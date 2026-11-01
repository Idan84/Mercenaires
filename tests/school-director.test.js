"use strict";

// Directeur de l'École de magie (Idan, 2026-11-01 : « même mécanisme pour la nomination que l'intendant ») : nommé une
// fois l'École construite ; il peut refuser, comme l'intendant ; hors mission comme l'intendant et le médecin (dortoir,
// missions, garde du corps, lieutenant) ; pas encore d'effet. Fiche à côté de l'intendant et du médecin.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules,serializeCampaign,restoreCampaign}=require("../game-core/campaign.js");
const {createSchoolDirectorRules}=require("../game-core/school-director.js");
const {createMedicRules}=require("../game-core/medic.js");
const {createStewardRules}=require("../game-core/steward.js");
const {createLieutenantRules}=require("../game-core/lieutenants.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.schoolDirectorDialogue,"school-director-dialogue.json","le jeu charge les textes du directeur");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));

let seed=7;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference});
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5].map(id=>generator.createMercenary({id,captain}))});
const [, mage, other, , fifth]=state.company.roster;
assert.equal(state.company.directorId,null,"pas de directeur au départ");

let dice=[];
const dormitory={free:s=>rules.dormitoryFree(s),places:m=>rules.dormitoryPlaces(m)};
const director=createSchoolDirectorRules({reference,random:()=>dice.length?dice.shift():0.999,dormitory,
  schoolLevel:s=>rules.buildingLevel(s,"magic_school")});
const steward=createStewardRules({reference,random:()=>0});

// Il faut l'École de magie (le chantier ne suffit pas).
assert.deepEqual(director.offer(state,mage.id),{ok:false,reason:"Il faut d’abord construire l’École de magie."});
state.company.camp.buildings={magic_school:{level:0,construction:{kind:"building",code:"magic_school",level:1}}};
assert.equal(director.offer(state,mage.id).reason,"Il faut d’abord construire l’École de magie.");
state.company.camp.buildings={magic_school:{level:1,construction:null}};
assert.deepEqual(director.offer(state,captain.id),{ok:false,reason:"Le capitaine ne peut pas diriger l’École."});
state.company.intendantId=other.id;
assert.deepEqual(director.offer(state,other.id),{ok:false,reason:"L’intendant ne peut pas diriger l’École."});
state.company.intendantId=null;
state.company.medicId=other.id;
assert.deepEqual(director.offer(state,other.id),{ok:false,reason:"Le médecin ne peut pas diriger l’École."});
state.company.medicId=null;

// Même chance que pour l'Intendance ; un refus fait bouger l'affinité comme chez l'intendant ; une fois par jour.
assert.equal(director.appointChance(mage),steward.appointChance(mage));
mage.stats.Intelligence=70; mage.stats.Courage=20;
dice=[0.999];
const refused=director.offer(state,mage.id);
assert.deepEqual([refused.ok,refused.accepted,refused.mood,refused.affinityDelta],[true,false,"flattered",5]);
assert.equal(mage.directorFlattered,true);
assert.deepEqual(director.offer(state,mage.id),{ok:false,reason:"Vous lui en avez déjà parlé aujourd’hui."});
state.day+=1;
dice=[0.999];
assert.equal(director.offer(state,mage.id).affinityDelta,0,"flatté une seule fois");
state.day+=1;
dice=[0];
const accepted=director.offer(state,mage.id);
assert.deepEqual([accepted.accepted,state.company.directorId,state.company.directorSince],[true,mage.id,state.day]);
assert.equal(director.directorOf(state),mage);
assert.deepEqual(director.offer(state,other.id),{ok:false,reason:"L’École a déjà un directeur."});
assert.deepEqual(director.offer(state,mage.id),{ok:false,reason:"Il dirige déjà l’École."});
assert.deepEqual(mage.history.log.filter(e=>e.kind==="director").map(e=>e.accepted),[false,false,true]);

// Hors mission, comme l'intendant et le médecin.
const lieutenants=createLieutenantRules({reference});
const medic=createMedicRules({reference,random:()=>0,dormitory,dispensaryLevel:()=>1});
assert.equal(steward.offer(state,mage.id).reason,"Le directeur de l’École ne peut pas être intendant.");
assert.equal(medic.offer(state,mage.id).reason,"Le directeur de l’École ne peut pas être médecin.");
assert.equal(lieutenants.canPromote(state,mage).reason,"Le directeur de l’École ne peut pas être lieutenant.");
const usedWith=rules.dormitoryUsed(state);
state.company.directorId=null;
assert.equal(rules.dormitoryUsed(state),usedWith+rules.dormitoryPlaces(mage),"il vit à l'École : pas de place au dortoir");
state.company.directorId=mage.id;
// Ancienne sauvegarde (une offre de contrat) : elle passe dans la première case de la Taverne à 5 missions.
state.missionBoard={offer:{id:"contrat",code:"cleanup",distance:1}};
assert.deepEqual(rules.departExpedition(state,[mage.id,other.id]),{ok:false,reason:"Le directeur de l’École reste au camp."});
state.missionBoard=null;
assert.equal(rules.canGuard(state,mage,{level:1}).reason,"Le directeur de l’École reste au camp.");
// Pas encore d'effet : ni Renommée ni soins.
const renown=rules.companyRenown(state).total;
state.company.directorId=null;
assert.equal(rules.companyRenown(state).total,renown);
state.company.directorId=mage.id;

// Retour sur le terrain : même règle que l'intendant, place au dortoir comprise ; pas le jour de la nomination.
assert.equal(director.recall(state).reason,"Vous lui en avez déjà parlé aujourd’hui.");
state.day+=1;
const capacity=state.company.camp.dormitoryCapacity;
state.company.camp.dormitoryCapacity=rules.dormitoryUsed(state);
assert.equal(director.recall(state).dormFull,true);
state.company.camp.dormitoryCapacity=capacity;
state.day+=4;
dice=[0];
const back=director.recall(state);
assert.deepEqual([back.accepted,back.days,state.company.directorId],[true,5,null]);
assert.equal(mage.history.directorDays,5);
assert.equal(director.totalDirectorDays(state,mage),5);

// Sauvegarde : le directeur reste nommé ; une ancienne sauvegarde (sans directeur) se charge.
state.company.directorId=mage.id;
const restored=restoreCampaign(serializeCampaign(state)).state;
assert.equal(restored.company.directorId,mage.id);
const old=JSON.parse(serializeCampaign(state));
delete (old.state||old).company.directorId;
assert.equal(director.directorOf(restoreCampaign(JSON.stringify(old)).state),null);
// S'il meurt en mission, le poste se libère (même code que l'intendant et le médecin).
assert.match(fs.readFileSync(path.join(ROOT,"game-core","campaign.js"),"utf8"),/if\(state\.company\.directorId===mercenary\.id\) state\.company\.directorId=null;/);

// Interface : sa fiche à côté de l'intendant et du médecin, en haut de l'Intendance.
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(html,/<div id="medic-panel" class="steward-panel medic-panel"><\/div><div id="director-panel" class="steward-panel director-panel"><\/div>/);
assert.match(html,/<script src="\/core\/school-director\.js"><\/script>/);
assert.match(html,/<script src="school-director-ui\.js"><\/script>/);
const copy=reference.schoolDirectorDialogue;
for(const kind of ["offer","recall"]) for(const mood of ["accepted","flattered","vexed","neutral"]) assert.ok(copy[kind][mood].length>=3,`${kind} ${mood}`);
const sheet=reference.characterSheetCopy.history;
assert.ok(sheet.counters.some(k=>k.key==="directorDays"));
assert.ok(sheet.events.director.accord&&sheet.events.director_recall.accord);

// Panneau : liste des candidats (meilleure école), puis le directeur nommé.
const elements={};
const $=id=>elements[id]||(elements[id]={innerHTML:""});
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const game={campaign:state,referenceData:reference};
globalThis.MercenairesSchoolDirector=require("../game-core/school-director.js");
const js=fs.readFileSync(path.join(ROOT,"prototype-web","school-director-ui.js"),"utf8");
const ui=new Function("game","$","fmt","esc","campaignRules","renderAvatar","stewardDays","MercenairesRecruitDialogue",
  js+"\nreturn {renderSchoolDirectorPanel,directorBestSchool};")(
  game,$,fmt,esc,()=>rules,()=>"",n=>n+" jours",{fill:(text,vars)=>String(text||"").replace(/\{(\w+)\}/g,(_,k)=>vars[k]??"").replace(/\{([^|}]*)\|[^}]*\}/g,"$1"),firstName:m=>m.name});
mage.skills.magic={Feu:42,Eau:12};
ui.renderSchoolDirectorPanel();
assert.match(elements["director-panel"].innerHTML,/Le directeur de l’École|La directrice de l’École/);
assert.match(elements["director-panel"].innerHTML,/title="Meilleure école : Feu 42 · /);
assert.match(elements["director-panel"].innerHTML,/data-director-recall>Le renvoyer sur le terrain<\/button>/);
state.company.directorId=null;
state.day+=1;
ui.renderSchoolDirectorPanel();
assert.match(elements["director-panel"].innerHTML,/<summary class="talk-offer-btn"[^>]*>Nommer un directeur de l’École<\/summary>/);
const order=[...elements["director-panel"].innerHTML.matchAll(/<small>[^<]* (\d+)<\/small>/g)].map(m=>Number(m[1]));
assert.deepEqual(order,[...order].sort((a,b)=>b-a),"les meilleurs en école d'abord");
assert.match(elements["director-panel"].innerHTML,new RegExp(`data-director-offer="${mage.id}" title="Feu 42">`));
assert.doesNotMatch(elements["director-panel"].innerHTML,new RegExp(`data-director-offer="${captain.id}"`),"pas le capitaine");
state.company.camp.buildings={};
ui.renderSchoolDirectorPanel();
assert.match(elements["director-panel"].innerHTML,/<p class="medic-locked" title="Construisez d’abord l’École de magie pour nommer un directeur\.">/);
assert.deepEqual(ui.directorBestSchool({skills:{magic:{}}}),null);

console.log("Directeur de l'École : École construite, refus comme l'intendant, hors mission, retour sur le terrain, Intendance — OK");
