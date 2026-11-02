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
  weapons:"weapons.json",baseArmors:"base-armors.json",boots:"boots.json",belts:"belts.json",amulets:"amulets.json",capes:"capes.json",gloves:"gloves.json",pants:"pants.json",rings:"rings.json",itemQualities:"item-qualities.json",
  equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",
  binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json",
  renamedNames:"renamed-names.json"
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

// §8 — Prime de mission demandée : exemples du document (salaire 50, prétentions 35), coefficient 1,5 depuis que
// les primes ont été divisées par deux (Idan, 2026-10-25).
assert.equal(tavern.missionBonusDemand(merc({stats:{Courage:20}})),98);
assert.equal(tavern.missionBonusDemand(merc({stats:{Courage:50}})),75);
assert.equal(tavern.missionBonusDemand(merc({stats:{Courage:100}})),38);

// État de partie initial : jour 1, 10 000 PO et Dortoir 40 (décisions Idan), Taverne remplie (5 places).
const captain=generator.createCaptain({id:1});
const squad=[2,3].map(id=>generator.createMercenary({id,captain}));
const stable=campaignOf(always(0.999));
const state=stable.createCampaign({captain,squad});
assert.equal(state.day,1);
assert.equal(state.company.gold,10000);
assert.equal(state.company.camp.dormitoryCapacity,25);
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
assert.deepEqual([nInit.salary,nInit.bonus],[50,75]);

// Acceptation automatique composante par composante : un excès de salaire ne compense pas une prime trop basse.
assert.equal(always(0.999).makeOffer(fresh(),{salary:50,bonus:75}).automatic,true);
const mixed=always(0.999).makeOffer(fresh(),{salary:80,bonus:50});
assert.notEqual(mixed.automatic,true);

// Probabilité d'accepter : 95 − 2 × Concession − 0,4 × (Résistance − 50). Résistance = 0,5×35 + 0,25×50 + 0,25×50 = 42,5.
// Offre 45 / 60 sur 50 / 75 : Concession = 100 × (1 − (0,65 × 0,9 + 0,35 × 0,8)) = 13,5.
const r90=always(0.999).makeOffer(fresh(),{salary:45,bonus:60});
assert.ok(Math.abs(r90.concession-13.5)<1e-9);
assert.ok(Math.abs(r90.pAccept-(95-27-0.4*(42.5-50)))<1e-9);
assert.equal(always(0).makeOffer(fresh(),{salary:45,bonus:60}).outcome,"accepted");

// Refus puis contre-proposition (D100 = 100 aux deux jets) : jamais sous l'offre du joueur.
const cc=fresh();
const counter=always(0.999).makeOffer(cc,{salary:80,bonus:30});
assert.equal(counter.outcome,"counter");
assert.ok(counter.counter.salary>=80,"composante déjà généreuse conservée");
assert.ok(counter.counter.bonus>=30&&counter.counter.bonus<=75);
// Règle anti-spam : pas d'offre inférieure à l'offre refusée, composante par composante.
assert.equal(always(0.999).makeOffer(cc,{salary:79,bonus:200}).outcome,"invalid");
// Accepter la contre-proposition courante.
const deal=always(0.999).makeOffer(cc,{salary:cc.negotiation.salary,bonus:cc.negotiation.bonus});
assert.equal(deal.outcome,"accepted");

// Départ après un refus : 5 + 1,5 × Concession + 0,10 × Prétentions + 0,10 × Volonté, borné à 5–95 (réglage Idan).
const quitCheck=always(0.999).makeOffer(fresh(),{salary:45,bonus:60});
assert.ok(Math.abs(quitCheck.pQuit-(5+1.5*13.5+3.5+5))<1e-9);
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
// Dortoir (Idan, 2026-10-24) : ni le capitaine ni l'intendant ne prennent de place ; un ogre en prend deux,
// un halfling, un gobelin ou un gnome une demi, tout autre mercenaire une.
const placesOf=people=>stable.dormitoryPlaces({people});
assert.deepEqual(["Ogre","Halfling","Gobelin","Gnome","Humain","Nain","Elfe","Orc","Reptilien","Homme-bête"].map(placesOf),[2,0.5,0.5,0.5,1,1,1,1,1,1]);
assert.equal(stable.dormitoryUsed(s4),s4.company.roster.filter(m=>m.id!==captain.id).reduce((sum,m)=>sum+stable.dormitoryPlaces(m),0));
assert.equal(s4.company.roster.some(m=>m.id===captain.id),true,"le capitaine est bien dans l'effectif");
s4.company.camp.dormitoryCapacity=stable.dormitoryUsed(s4);
const full=stable.signCandidate(s4,pick.mercenary.id);
assert.equal(full.ok,false,"Dortoir plein");
assert.equal(full.dormFull,true);
const ogrePeople=pick.mercenary.people;
pick.mercenary.people="Ogre";
s4.company.camp.dormitoryCapacity=stable.dormitoryUsed(s4)+1;
const ogre=stable.signCandidate(s4,pick.mercenary.id);
assert.deepEqual([ogre.ok,ogre.places,ogre.reason],[false,2,"Dortoir plein : il faut deux places pour un ogre."]);
pick.mercenary.people=ogrePeople;
const used=stable.dormitoryUsed(s4),steward=s4.company.roster.find(m=>m.id!==captain.id);
s4.company.intendantId=steward.id;
assert.equal(stable.dormitoryUsed(s4),used-stable.dormitoryPlaces(steward),"l'intendant libère sa place");
s4.company.intendantId=null;
s4.company.camp.dormitoryCapacity=40;
const signed=stable.signCandidate(s4,pick.mercenary.id);
assert.equal(signed.ok,true);
assert.deepEqual(signed.mercenary.contract,{dailySalary:n.salary,missionBonus:n.bonus,signedDay:1,joinDay:2},"il rejoint la compagnie le lendemain matin");
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

// Escouade initiale sous contrat (décision Idan, 2026-10-04) et salaires journaliers (09-reputation §6).
const s9=stable.createCampaign({captain,squad:[5,6,7].map(id=>generator.createMercenary({id,captain}))});
const [boss,...crew]=s9.company.roster;
assert.equal(boss.contract,undefined,"le capitaine n'a pas de contrat");
for(const m of crew){
  assert.deepEqual(m.contract,{dailySalary:m.salary,missionBonus:tavern.missionBonusDemand(m),signedDay:1,initial:true},"contrat aux conditions demandées");
}
const daily=crew.reduce((sum,m)=>sum+m.salary,0);
assert.equal(stable.payroll(s9),daily);
const gold9=s9.company.gold;
const [pay]=stable.advanceTime(s9,1);
assert.deepEqual(pay.salaries,{total:daily,count:crew.length});
assert.equal(s9.company.gold,gold9-daily,"un jour de salaires versé");
stable.advanceTime(s9,2);
assert.equal(s9.company.gold,gold9-3*daily,"trois jours de salaires");
crew[0].recovery={kind:"wounded",daysLeft:10,sinceDay:4};
assert.equal(stable.payroll(s9),daily,"les blessés restent payés (politique des blessés à venir)");
// Ancienne sauvegarde sans contrats initiaux : complétée, puis rien à faire.
const old9=restoreCampaign(serializeCampaign(s9)).state;
for(const m of old9.company.roster) delete m.contract;
assert.equal(stable.ensureInitialContracts(old9),true);
assert.equal(old9.company.roster.filter(m=>m.contract).length,crew.length);
assert.equal(stable.ensureInitialContracts(old9),false);
// Anciens noms (renamed-names.json) : « Nains des plaines » → « Nains du chaos » (2026-10-23),
// « Massue / Gourdin » → « Massue », « Arquebuse / Mousquet » → « Arquebuse » (2026-10-24) ; renommés partout,
// en valeur comme en clé (compétences), avec l'identifiant de modèle de l'arme.
assert.equal(stable.ensureRenamedNames(old9),false,"aucun ancien nom : rien à sauvegarder");
old9.company.roster[0].culture="Nains des plaines";
old9.tavern.candidates.push({mercenary:{culture:"Nains des plaines",notes:["Nains des plaines"],
  skills:{martial:{"Massue / Gourdin":12,"Arquebuse / Mousquet":7}},
  items:[{name:"Massue / Gourdin",templateId:"weapon:massue_gourdin"}],weaponPreferences:{ranged:{weapon:"Arquebuse / Mousquet"}}}});
assert.equal(stable.ensureRenamedNames(old9),true);
assert.equal(old9.company.roster[0].culture,"Nains du chaos");
assert.deepEqual(old9.tavern.candidates.at(-1).mercenary,{culture:"Nains du chaos",notes:["Nains du chaos"],
  skills:{martial:{"Massue":12,"Arquebuse":7}},
  items:[{name:"Massue",templateId:"weapon:massue"}],weaponPreferences:{ranged:{weapon:"Arquebuse"}}});
assert.equal(stable.ensureRenamedNames(old9),false);
old9.tavern.candidates.pop();
// Stock d'armes de départ (Idan, 2026-10-23) : à la création, et pour une ancienne sauvegarde qui n'en a pas.
// Armures (Idan, 2026-10-24) : 1D6 par type, données une fois, même à une partie commencée avant.
const stockOf=(state,type)=>state.company.stock.filter(item=>item.itemType===type);
assert.ok(stockOf(s9,"weapon").length>=2&&stockOf(s9,"weapon").length<=40,"2D20 armes");
assert.ok(stockOf(s9,"armor").length>=4&&stockOf(s9,"armor").length<=24,"1D6 armures par type");
// Bottes (Idan, 2026-10-24) : 1D6 paires, données une fois elles aussi.
assert.ok(stockOf(s9,"boots").length>=1&&stockOf(s9,"boots").length<=6,"1D6 paires de bottes");
// Ceintures (Idan, 2026-10-24) : 1D6 aussi.
assert.ok(stockOf(s9,"belt").length>=1&&stockOf(s9,"belt").length<=6,"1D6 ceintures");
// Amulettes (Idan, 2026-10-24) : 1D6 aussi.
assert.ok(stockOf(s9,"amulet").length>=1&&stockOf(s9,"amulet").length<=6,"1D6 amulettes");
// Capes (Idan, 2026-10-24) : 1D6 aussi.
assert.ok(stockOf(s9,"cape").length>=1&&stockOf(s9,"cape").length<=6,"1D6 capes");
// Gants (Idan, 2026-10-24) : 1D6 paires aussi.
assert.ok(stockOf(s9,"gloves").length>=1&&stockOf(s9,"gloves").length<=6,"1D6 paires de gants");
// Culottes (Idan, 2026-10-24) : 1D6 aussi.
assert.ok(stockOf(s9,"pants").length>=1&&stockOf(s9,"pants").length<=6,"1D6 culottes");
// Bagues (Idan, 2026-10-24) : 1D6 aussi.
assert.ok(stockOf(s9,"ring").length>=1&&stockOf(s9,"ring").length<=6,"1D6 bagues");
assert.equal(["weapon","armor","boots","belt","amulet","cape","gloves","pants","ring"].reduce((n,type)=>n+stockOf(s9,type).length,0),s9.company.stock.length);
assert.equal(s9.company.startingBoots,true);
assert.equal(s9.company.startingBelts,true);
assert.equal(s9.company.startingAmulets,true);
assert.equal(s9.company.startingCapes,true);
assert.equal(s9.company.startingGloves,true);
assert.equal(s9.company.startingPants,true);
assert.equal(s9.company.startingRings,true);
assert.ok(s9.company.stock.every(item=>item.owner===null));
assert.equal(s9.company.startingArmors,true);
assert.equal(stable.ensureStartingStock(old9),false,"stock déjà là : rien à faire");
delete old9.company.startingArmors;
old9.company.stock=stockOf(old9,"weapon");
const weaponsBefore=old9.company.stock.length;
assert.equal(stable.ensureStartingStock(old9),true,"partie d'avant les armures : elles arrivent");
assert.equal(stockOf(old9,"weapon").length,weaponsBefore,"les armes restent");
assert.ok(stockOf(old9,"armor").length>=4);
assert.equal(stable.ensureStartingStock(old9),false,"une seule fois");
delete old9.company.startingBoots;
delete old9.company.startingBelts;
delete old9.company.startingAmulets;
delete old9.company.startingCapes;
delete old9.company.startingGloves;
delete old9.company.startingPants;
delete old9.company.startingRings;
old9.company.stock=old9.company.stock.filter(item=>!["boots","belt","amulet","cape","gloves","pants","ring"].includes(item.itemType));
assert.equal(stable.ensureStartingStock(old9),true,"partie d'avant les bottes : elles arrivent");
assert.ok(["boots","belt","amulet","cape","gloves","pants","ring"].every(type=>stockOf(old9,type).length>=1),
  "partie d'avant : bottes, ceintures, amulettes, capes, gants, culottes et bagues arrivent");
assert.equal(stable.ensureStartingStock(old9),false);
delete old9.company.stock;
delete old9.company.startingArmors;
delete old9.company.startingBoots;
delete old9.company.startingBelts;
delete old9.company.startingAmulets;
delete old9.company.startingCapes;
delete old9.company.startingGloves;
assert.equal(stable.ensureStartingStock(old9),true);
assert.ok(stockOf(old9,"weapon").length>=2&&stockOf(old9,"armor").length>=4&&stockOf(old9,"boots").length>=1);
assert.equal(stable.ensureStartingStock(old9),false);

// Affinité → négociation (14 §9 ; Idan, 2026-10-20) : résistance − 0,25 × affinité, bornée de 0 à 100.
assert.equal(tavern.negotiationResistance(merc()),42.5);
assert.equal(tavern.negotiationResistance(merc(),100),17.5);
assert.equal(tavern.negotiationResistance(merc(),-100),67.5);
assert.equal(tavern.negotiationResistance(merc({salaryPretension:0,stats:{}}),100),0,"plancher 0");
// Offre 45 / 60 : concession 13,5, pAccept = 95 − 27 − 0,4 × (résistance − 50).
const warm=always(0.999).makeOffer(fresh(),{salary:45,bonus:60},{affinity:56});
const cold=always(0.999).makeOffer(fresh(),{salary:45,bonus:60},{affinity:-71});
const neutral=always(0.999).makeOffer(fresh(),{salary:45,bonus:60});
assert.ok(Math.abs(warm.pAccept-(68-0.4*(42.5-14-50)))<1e-9);
assert.ok(warm.pAccept>neutral.pAccept&&neutral.pAccept>cold.pAccept,"une bonne affinité facilite l'accord");

// La campagne passe l'affinité du candidat avec le capitaine à la négociation.
const {createAffinityRules}=require("../game-core/affinity.js");
const affinityRef={...reference,peopleAffinity:JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference","people-affinity.json"),"utf8"))};
const bonds=createAffinityRules({reference:affinityRef});
const withBonds=createCampaignRules({generator,tavern:always(0.999),reference,affinity:bonds});
const sA=withBonds.createCampaign({captain,squad:[2,3].map(id=>generator.createMercenary({id:id+500,captain}))});
const bondTarget=sA.tavern.candidates[0];
const expected=bonds.memberAffinity(captain,bondTarget.mercenary).total;
const offerA=withBonds.offerToCandidate(sA,bondTarget.mercenary.id,{salary:Math.ceil(bondTarget.mercenary.salary*0.9),bonus:Math.ceil(tavern.missionBonusDemand(bondTarget.mercenary)*0.9)});
const resistanceA=tavern.negotiationResistance(bondTarget.mercenary,expected);
assert.ok(Math.abs(offerA.pAccept-Math.max(5,Math.min(95,95-2*offerA.concession-0.4*(resistanceA-50))))<1e-9,"pAccept calculé avec l'affinité");

// Renommée → qualité des recrues (14 §5) : N = 1 + ⌊(Renommée − 500) / 250⌋, de 1 à 5.
const fakeState=renown=>({company:{captainId:"c",roster:[{id:"c",reputation:renown}],renownHeritage:[]}});
assert.deepEqual([0,499,500,749,750,999,1000,1250,1499,1500,9000].map(r=>stable.suitorCount(fakeState(r))),[1,1,1,1,2,2,3,4,4,5,5]);
// Le candidat présenté est le plus réputé des prétendants, tirés avec un seul identifiant.
const famous=createCampaignRules({generator,tavern:always(0.999),reference});
const sF=famous.createCampaign({captain,squad:[]});
sF.company.renownHeritage=[{id:"x",heritage:1500}];
assert.equal(famous.suitorCount(sF),5);
const idBefore=sF.nextId;
const seen=[];
const spy={...generator,createMercenary:o=>{const m=generator.createMercenary(o);seen.push(m);return m;}};
const spyRules=createCampaignRules({generator:spy,tavern:always(0.999),reference});
sF.tavern.candidates=[];
spyRules.advanceTime(sF,1);
const arrivals=sF.tavern.candidates;
assert.equal(seen.length,5*arrivals.length,"5 prétendants par place");
for(const c of arrivals){
  const group=seen.filter(m=>m.id===c.mercenary.id);
  assert.equal(group.length,5,"les prétendants partagent l'identifiant du candidat");
  assert.equal(c.mercenary.reputation,Math.max(...group.map(m=>m.reputation)));
}
assert.equal(sF.nextId,idBefore+arrivals.length,"un identifiant par candidat, pas par prétendant");

// Conseils du tavernier (Idan, 2026-10-21) : 1 PO la question, sans limite ; il rapporte la vantardise du
// candidat (×1,10 à ×3,00) ; une rumeur reste figée, mais chaque question se paie.
const keeperRules=campaignOf(always(0.5));
const sK=keeperRules.createCampaign({captain,squad});
const talked=sK.tavern.candidates[0];
const goldK=sK.company.gold;
const force=talked.mercenary.stats.Force;
const r1=keeperRules.askTavernkeeper(sK,talked.mercenary.id,"Force",force);
assert.equal(r1.ok,true);
assert.equal(r1.cost,1);
assert.equal(r1.estimate,Math.round(force*2.05),"×(1,10 + 0,5 × 1,90)");
assert.equal(sK.company.gold,goldK-1);
const r2=keeperRules.askTavernkeeper(sK,talked.mercenary.id,"Force",force);
assert.equal(r2.repeated,true);
assert.equal(r2.estimate,r1.estimate,"même rumeur");
assert.equal(sK.company.gold,goldK-2,"chaque question se paie");
for(let i=0;i<5;i++) assert.equal(keeperRules.askTavernkeeper(sK,talked.mercenary.id,"Courage "+i,10).ok,true,"pas de limite de questions");
assert.equal(talked.interview.questionsLeft,3,"le budget de l'entretien n'est pas touché");
sK.company.gold=0;
assert.deepEqual(keeperRules.askTavernkeeper(sK,talked.mercenary.id,"Chance",talked.mercenary.stats.Chance),{ok:false,reason:"gold",cost:1});
for(const [low,high] of [[0,1.1],[0.999,3]]){
  const sB=campaignOf(always(low)).createCampaign({captain,squad});
  const b=sB.tavern.candidates[0];
  assert.equal(campaignOf(always(low)).askTavernkeeper(sB,b.mercenary.id,"Force",100).estimate,Math.round(100*(1.1+low*1.9)));
}

console.log(JSON.stringify({ok:true},null,2));
