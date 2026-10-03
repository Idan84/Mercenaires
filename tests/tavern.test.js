"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");

const ROOT=path.resolve(__dirname,"..");
const files={
  peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",
  alignments:"alignments.json",ancestries:"ancestries.json",
  ancestryCompatibility:"ancestry-compatibility.json",
  cultureOriginCompatibility:"culture-origin-compatibility.json",
  ancestryLevels:"ancestry-levels.json",d6Scale:"d6-generation-scale.json",
  generationMatrix:"generation-matrix.json",skills:"skills.json",
  characteristics:"characteristics.json",formulaConstants:"formula-constants.json",
  weapons:"weapons.json",baseArmors:"base-armors.json",itemQualities:"item-qualities.json",
  equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",
  binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json"
};
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[
  key,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"))
]));

// Générateur pseudo-aléatoire reproductible (mulberry32).
function seeded(seed){
  return function(){
    seed|=0;seed=seed+0x6D2B79F5|0;
    let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
// Suite de tirages imposés, puis répétition du dernier.
function scripted(values){ let i=0; return ()=>values[Math.min(i++,values.length-1)]; }

const generator=createGenerator(reference,{random:seeded(42),nameGenerator:(people,id)=>people+" "+id});
const always=value=>createTavernRules({random:()=>value,reference});
const tavern=always(0.5);
const campaignOf=rules=>createCampaignRules({generator,tavern:rules,reference});

function merc(overrides={}){
  return {id:9000,name:"Marcel",reputation:150,salary:50,salaryPretension:35,
    stats:{Courage:50,Intelligence:50,"Volonté":50,Force:40},skills:{camp:{Intendance:0}},...overrides};
}

// §4 — Engagé ailleurs : exemples du document.
assert.equal(tavern.engagedElsewhereChance(merc({reputation:40,salary:20})),4);
assert.equal(tavern.engagedElsewhereChance(merc({reputation:150,salary:50})),12);
assert.equal(tavern.engagedElsewhereChance(merc({reputation:300,salary:100})),22);
assert.equal(tavern.engagedElsewhereChance(merc({reputation:0,salary:200})),2,"plancher 2 %");
assert.equal(tavern.engagedElsewhereChance(merc({reputation:900,salary:0})),35,"plafond 35 %");

// §8 — Prime de mission demandée : exemples du document (salaire 50, prétentions 35).
assert.equal(tavern.missionBonusDemand(merc({stats:{Courage:20}})),195);
assert.equal(tavern.missionBonusDemand(merc({stats:{Courage:50}})),150);
assert.equal(tavern.missionBonusDemand(merc({stats:{Courage:100}})),75);

// État de partie initial : jour 1, 1 000 PO, Dortoir 40 (décision Idan), Taverne remplie (5 places).
const captain=generator.createCaptain({id:1});
const squad=[2,3].map(id=>generator.createMercenary({id,captain}));
const stable=campaignOf(always(0.999));
const state=stable.createCampaign({captain,squad});
assert.equal(state.day,1);
assert.equal(state.company.gold,1000);
assert.equal(state.company.camp.dormitoryCapacity,40);
assert.equal(state.company.roster.length,3);
assert.equal(state.tavern.slots,5);
assert.equal(state.tavern.candidates.length,5);
const ids=new Set([...state.company.roster,...state.tavern.candidates.map(c=>c.mercenary)].map(m=>m.id));
assert.equal(ids.size,8,"identifiants uniques");
assert.deepEqual(JSON.parse(JSON.stringify(state)).tavern.candidates.length,5,"état sérialisable en JSON");

// §6 — Informations visibles.
const shown=tavern.visibleProfile(state.tavern.candidates[0].mercenary);
for(const key of ["people","culture","profile","predilection","reputation","salary","missionBonus"]) assert.ok(shown[key]!==undefined,key);
assert.ok(["melee","ranged","magic"].includes(shown.profile));

// AdvanceTime : jour par jour ; personne ne part si D100 = 100 (> 35 %).
const before=state.tavern.candidates.map(c=>c.mercenary.id);
const reports=stable.advanceTime(state,5);
assert.equal(reports.length,5);
assert.deepEqual(reports.map(r=>r.day),[2,3,4,5,6]);
assert.equal(state.day,6);
assert.deepEqual(state.tavern.candidates.map(c=>c.mercenary.id),before,"candidats persistants");

// AdvanceTime refuse un nombre de jours non entier ou négatif ; 0 jour ne change rien.
assert.throws(()=>stable.advanceTime(state,1.5),RangeError);
assert.throws(()=>stable.advanceTime(state,-3),RangeError);
assert.throws(()=>stable.advanceTime(state,"2"),RangeError);
assert.deepEqual(stable.advanceTime(state,0),[]);
assert.equal(state.day,6);

// Matin où tout le monde part (D100 = 1 ≤ 2 %) : chaque place est remplie par un nouveau candidat.
const leaving=campaignOf(always(0));
const s2=leaving.createCampaign({captain,squad});
const old=s2.tavern.candidates.map(c=>c.mercenary.id);
const [morning]=leaving.advanceTime(s2,1);
assert.equal(morning.tavern.departures.length,5);
assert.equal(morning.tavern.arrivals.length,5);
assert.equal(s2.tavern.candidates.length,5);
assert.ok(s2.tavern.candidates.every(c=>!old.includes(c.mercenary.id)&&c.arrivedDay===2));

// §7 — Entretien : sans Intendant, le candidat se survend (×1,10 à ×3,00).
const low=always(0);
const c1={mercenary:merc(),arrivedDay:1,interview:{questionsLeft:3,answers:[]},negotiation:null};
assert.equal(low.askQuestion(c1,"stats.Force").answer.estimate,44);
assert.equal(c1.interview.questionsLeft,2);
const again=low.askQuestion(c1,"stats.Force");
assert.equal(again.repeated,true);
assert.equal(c1.interview.questionsLeft,2,"une réponse déjà obtenue ne coûte rien");
// Avec un Intendant : ±20 % × (1 − Intendance/100).
assert.equal(low.askQuestion(c1,"stats.Courage",merc({skills:{camp:{Intendance:0}}})).answer.estimate,40);
assert.equal(low.askQuestion(c1,"stats.Intelligence",merc({skills:{camp:{Intendance:100}}})).answer.estimate,50);
assert.equal(c1.interview.questionsLeft,0);
assert.equal(low.askQuestion(c1,"stats.Volonté").ok,false,"3 questions par candidat");

// §9 — Négociation.
function fresh(){ return {mercenary:merc(),arrivedDay:1,interview:{questionsLeft:3,answers:[]},negotiation:null}; }
const nInit=tavern.negotiationState(fresh());
assert.deepEqual([nInit.salary,nInit.bonus],[50,150]);

// Acceptation automatique composante par composante : un excès de salaire ne compense pas une prime trop basse.
assert.equal(always(0.999).makeOffer(fresh(),{salary:50,bonus:150}).automatic,true);
const mixed=always(0.999).makeOffer(fresh(),{salary:80,bonus:100});
assert.notEqual(mixed.automatic,true);

// Probabilité d'accepter : 95 − 2 × Concession − 0,4 × (Résistance − 50). Résistance = 0,5×35 + 0,25×50 + 0,25×50 = 42,5.
const r90=always(0.999).makeOffer(fresh(),{salary:45,bonus:135});
assert.ok(Math.abs(r90.concession-10)<1e-9);
assert.ok(Math.abs(r90.pAccept-(95-20-0.4*(42.5-50)))<1e-9);
assert.equal(always(0).makeOffer(fresh(),{salary:45,bonus:135}).outcome,"accepted");

// Refus puis contre-proposition (D100 = 100 aux deux jets) : jamais sous l'offre du joueur.
const cc=fresh();
const counter=always(0.999).makeOffer(cc,{salary:80,bonus:60});
assert.equal(counter.outcome,"counter");
assert.ok(counter.counter.salary>=80,"composante déjà généreuse conservée");
assert.ok(counter.counter.bonus>=60&&counter.counter.bonus<=150);
// Règle anti-spam : pas d'offre inférieure à l'offre refusée, composante par composante.
assert.equal(always(0.999).makeOffer(cc,{salary:79,bonus:200}).outcome,"invalid");
// Accepter la contre-proposition courante.
const deal=always(0.999).makeOffer(cc,{salary:cc.negotiation.salary,bonus:cc.negotiation.bonus});
assert.equal(deal.outcome,"accepted");

// Départ après un refus : 5 + 1,5 × Concession + 0,10 × Prétentions + 0,10 × Volonté, borné à 5–95 (réglage Idan).
const quitCheck=always(0.999).makeOffer(fresh(),{salary:45,bonus:135});
assert.ok(Math.abs(quitCheck.pQuit-(5+1.5*10+3.5+5))<1e-9);
assert.equal(always(0.999).makeOffer(fresh(),{salary:1,bonus:1}).pQuit,95,"plafond 95 %");

// Départ après un refus : jet d'acceptation raté (100), puis jet de départ réussi (1).
const quitter=createTavernRules({random:scripted([0.999,0]),reference});
const s3=createCampaignRules({generator,tavern:quitter,reference}).createCampaign({captain,squad});
const target=s3.tavern.candidates[0].mercenary.id;
const gone=createCampaignRules({generator,tavern:quitter,reference}).offerToCandidate(s3,target,{salary:1,bonus:1});
assert.equal(gone.outcome,"left");
assert.equal(s3.tavern.candidates.length,4,"la place sera remplie le lendemain matin");

// Intendant : un rôle assigné à un membre de la compagnie ; sans assignation, le candidat répond lui-même.
const s5=campaignOf(always(0)).createCampaign({captain,squad});
const asked=s5.tavern.candidates[0].mercenary.id;
assert.equal(s5.company.intendantId,null);
assert.equal(campaignOf(always(0)).askCandidate(s5,asked,"stats.Force").answer.source.type,"candidate");
assert.equal(campaignOf(always(0)).assignIntendant(s5,s5.tavern.candidates[1].mercenary.id).ok,false,"un candidat ne peut pas être Intendant");
assert.equal(campaignOf(always(0)).assignIntendant(s5,squad[0].id).ok,true);
assert.equal(campaignOf(always(0)).askCandidate(s5,asked,"stats.Courage").answer.source.name,squad[0].name);
assert.equal(campaignOf(always(0)).assignIntendant(s5,null).ok,true);
assert.equal(campaignOf(always(0)).askCandidate(s5,asked,"stats.Volonté").answer.source.type,"candidate");

// §10 — Signature : accord requis, puis place libre au Dortoir.
const s4=stable.createCampaign({captain,squad});
const pick=s4.tavern.candidates[0];
assert.equal(stable.signCandidate(s4,pick.mercenary.id).ok,false,"pas d'accord");
const n=tavern.negotiationState(pick);
stable.offerToCandidate(s4,pick.mercenary.id,{salary:n.salary,bonus:n.bonus});
s4.company.camp.dormitoryCapacity=s4.company.roster.length;
assert.equal(stable.signCandidate(s4,pick.mercenary.id).ok,false,"Dortoir plein");
s4.company.camp.dormitoryCapacity=40;
const signed=stable.signCandidate(s4,pick.mercenary.id);
assert.equal(signed.ok,true);
assert.deepEqual(signed.mercenary.contract,{dailySalary:n.salary,missionBonus:n.bonus,signedDay:1});
assert.equal(s4.company.roster.length,4);
assert.equal(s4.tavern.candidates.length,4);

// Sauvegarde : aller-retour JSON fidèle, et la partie continue normalement après chargement.
const {serializeCampaign,restoreCampaign}=require("../game-core/campaign.js");
const s6=stable.createCampaign({captain,squad});
stable.assignIntendant(s6,squad[1].id);
const kept=s6.tavern.candidates[0];
stable.askCandidate(s6,kept.mercenary.id,"stats.Force");
stable.offerToCandidate(s6,kept.mercenary.id,{salary:1,bonus:1});
stable.advanceTime(s6,2);
const saved=serializeCampaign(s6,{tavernLog:[{message:"test"}]});
const loaded=restoreCampaign(saved);
assert.equal(loaded.ok,true);
assert.deepEqual(loaded.state,JSON.parse(JSON.stringify(s6,(key,value)=>key==="generationTrace"?undefined:value)));
assert.ok(s6.company.roster[0].generationTrace,"la trace reste en mémoire pendant la partie");
assert.equal(loaded.state.company.roster[0].generationTrace,undefined,"la trace n'est pas sauvegardée");
assert.ok(saved.length<JSON.stringify(s6).length/4,"sauvegarde au moins 4 fois plus légère sans la trace");
assert.deepEqual(loaded.extra,{tavernLog:[{message:"test"}]});
assert.equal(stable.intendantOf(loaded.state).id,squad[1].id);
const reloaded=tavern.findCandidate(loaded.state.tavern,kept.mercenary.id);
assert.equal(reloaded.interview.questionsLeft,2,"entretien conservé");
assert.deepEqual(reloaded.negotiation.refused,{salary:1,bonus:1},"négociation conservée");
stable.advanceTime(loaded.state,1);
assert.equal(loaded.state.day,4);
const loadedIds=new Set([...loaded.state.company.roster,...loaded.state.tavern.candidates.map(c=>c.mercenary)].map(m=>m.id));
assert.equal(loadedIds.size,loaded.state.company.roster.length+loaded.state.tavern.candidates.length,"identifiants uniques après chargement");
assert.equal(restoreCampaign("pas du json").ok,false);
assert.equal(restoreCampaign(JSON.stringify({format:"autre"})).ok,false);
assert.equal(restoreCampaign(JSON.stringify({format:"mercenaires-save",version:99,state:{}})).ok,false);
assert.equal(restoreCampaign(JSON.stringify({format:"mercenaires-save",version:1,state:{day:1}})).ok,false);

// Fin de mission appliquée à la compagnie (10-mission-time §7 et §8, décisions Idan du 2026-10-03).
const s7=stable.createCampaign({captain,squad});
const [cap,vet,rookie]=s7.company.roster;
rookie.contract={dailySalary:20,missionBonus:60,signedDay:1};
vet.contract={dailySalary:30,missionBonus:90,signedDay:1};
stable.assignIntendant(s7,vet.id);
const goldBefore=s7.company.gold;
const report=stable.applyMissionAftermath(s7,{captainDead:false,results:[
  {id:cap.id,dead:false,wounded:true,woundDays:20,fatigueDays:null},
  {id:vet.id,dead:true,wounded:false},
  {id:rookie.id,dead:false,wounded:false,fatigueDays:2},
  {id:999999,dead:true,wounded:false}
]});
assert.equal(s7.company.roster.includes(vet),false,"un mort quitte la compagnie");
assert.equal(s7.company.intendantId,null,"un Intendant mort n'est plus Intendant");
assert.deepEqual(report.deaths.map(m=>m.id),[vet.id]);
assert.deepEqual(cap.recovery,{kind:"wounded",daysLeft:20,sinceDay:1});
assert.deepEqual(rookie.recovery,{kind:"fatigued",daysLeft:2,sinceDay:1});
assert.equal(report.bonusPaid,60,"seul le survivant sous contrat touche sa prime");
assert.equal(s7.company.gold,goldBefore-60);
assert.equal(report.gameOver,false);
assert.equal(stable.isAvailable(rookie),false);
const [day2]=stable.advanceTime(s7,1);
assert.deepEqual(day2.recovered,[]);
assert.equal(rookie.recovery.daysLeft,1);
const [day3]=stable.advanceTime(s7,1);
assert.deepEqual(day3.recovered.map(r=>[r.mercenary.id,r.kind]),[[rookie.id,"fatigued"]]);
assert.equal(stable.isAvailable(rookie),true,"disponible après 2 jours de repos");
assert.equal(cap.recovery.daysLeft,18);
stable.advanceTime(s7,18);
assert.equal(stable.isAvailable(cap),true,"guéri après 20 jours");
const restored=restoreCampaign(serializeCampaign(s7));
assert.equal(restored.ok,true,"l'indisponibilité se sauvegarde");

// La prime peut faire passer l'or sous 0 ; la mort du capitaine met fin à la partie.
const s8=stable.createCampaign({captain,squad});
const paid=s8.company.roster[1];
paid.contract={dailySalary:10,missionBonus:s8.company.gold+50,signedDay:1};
const end=stable.applyMissionAftermath(s8,{captainDead:true,results:[
  {id:s8.company.captainId,dead:true,wounded:false},
  {id:paid.id,dead:false,wounded:false,fatigueDays:5}
]});
assert.equal(s8.company.gold,-50);
assert.equal(end.gameOver,true);
assert.deepEqual(s8.gameOver,{day:1,reason:"captain-dead"});

console.log(JSON.stringify({ok:true},null,2));
