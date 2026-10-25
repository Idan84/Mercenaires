"use strict";

// Missions de garde du corps (Idan, 2026-10-25 ; formules de JC validées) : offre à la Taverne, paiement d'avance,
// absence, retour 50 / 25 / 25, prime au retour, un peu de réputation et de renommée.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createBodyguardRules}=require("../game-core/bodyguard.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const files={
  peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",
  ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",
  cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",
  d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",
  characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",
  baseArmors:"base-armors.json",itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",
  startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",
  alignmentGeneration:"alignment-generation.json",reputationStars:"reputation-stars.json",bodyguardMissions:"bodyguard-missions.json"
};
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,read(file)]));
let seed=13;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const rules=createBodyguardRules({reference,random});

// Niveaux de réputation : 15 étoiles (bronze, argent, or).
assert.deepEqual([0,99,100,140,160,2000,9000].map(r=>rules.levelOf(r)),[1,1,2,3,4,15,15]);
// Salaire de référence : 10 × Réputation du niveau suivant / 30 ; au-delà de 15 étoiles, × 1,25.
assert.equal(Math.round(rules.referenceWage(3)),53,"3★ : 10 × 160 / 30");
assert.equal(Math.round(rules.referenceWage(15)),833,"15★ : 10 × 2 500 / 30");
// Paiement par mercenaire = W × (2 + jours × (1,3 + (jours − 3)/22)), arrondi à 10 ; plus c'est long, plus la journée paie.
assert.equal(rules.payment(3,3),310);
assert.equal(rules.payment(3,21),2480);
assert.equal(rules.payment(3,7,2),2*660,"par mercenaire");
assert.ok(rules.payment(3,21)/21>rules.payment(3,3)/3);
assert.equal(rules.payment(15,21),38730);

// Offres : 1 à 3 mercenaires, 3 à 21 jours, 1★ à 5★ ; elles montent avec le meilleur mercenaire de la compagnie.
const levels={},counts=new Set(),days=new Set();
for(let i=0;i<2000;i++){
  const o=rules.createOffer({day:5,bestLevel:3});
  levels[o.level]=(levels[o.level]||0)+1; counts.add(o.count); days.add(o.days);
  assert.ok(o.expiresDay-5>=3&&o.expiresDay-5<=6);
  assert.equal(o.payment,rules.payment(o.level,o.days,o.count));
  assert.ok(o.client);
}
assert.deepEqual(Object.keys(levels).map(Number),[1,2,3,4,5]);
assert.ok(levels[2]>500&&levels[2]<700&&levels[5]>130&&levels[5]<270,JSON.stringify(levels));
assert.deepEqual([...counts].sort(),[1,2,3]);
assert.equal(Math.min(...days),3);
assert.equal(Math.max(...days),21);
assert.equal(rules.createOffer({bestLevel:9}).level>=6,true,"meilleur mercenaire à 9★ : décalage de 5");
assert.ok(rules.createOffer({bestLevel:15}).level<=15);
// Retour : 50 % rentré, 25 % fatigué (1D3 jours), 25 % blessé (1D3 jours).
const issues={rentre:0,fatigue:0,blesse:0};
for(let i=0;i<4000;i++){ const r=rules.rollReturn(); issues[r.issue]+=1; if(r.issue!=="rentre") assert.ok(r.days>=1&&r.days<=3); else assert.equal(r.days,0); }
assert.ok(issues.rentre>1850&&issues.rentre<2150&&issues.fatigue>850&&issues.blesse>850,JSON.stringify(issues));
assert.deepEqual([rules.reputationGain("rentre"),rules.reputationGain("fatigue"),rules.reputationGain("blesse"),rules.renownGain()],[10,10,5,10]);

// Campagne : départ (paiement d'avance), absence, retour (sort, réputation, prime, renommée).
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});
const squad=Array.from({length:5},(_,i)=>generator.createMercenary({id:i+2,captain}));
const scripted=[];
const scriptedRandom=()=>scripted.length?scripted.shift():random();
const campaign=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,
  bodyguard:createBodyguardRules({reference,random:scriptedRandom})});
const state=campaign.createCampaign({captain,squad});
assert.equal(campaign.ensureBodyguardOffer(state),true);
assert.equal(campaign.ensureBodyguardOffer(state),false,"une offre à la fois");
state.bodyguardBoard.offer={...state.bodyguardBoard.offer,level:2,count:2,days:5,payment:1000};
const [a,b,c]=squad;
a.reputation=120;b.reputation=110;c.reputation=50;
assert.deepEqual(campaign.canGuard(state,captain),{ok:false,reason:"Le capitaine reste à la compagnie."});
assert.deepEqual(campaign.canGuard(state,c),{ok:false,reason:"Réputation trop faible."});
assert.equal(campaign.departBodyguard(state,[a.id]).ok,false,"exactement le nombre demandé");
const gold=state.company.gold;
const offerId=state.bodyguardBoard.offer.id;
const left=campaign.departBodyguard(state,[a.id,b.id]);
assert.equal(left.ok,true);
assert.equal(state.company.gold,gold+1000,"payé d'avance");
assert.notEqual(state.bodyguardBoard.offer.id,offerId,"une nouvelle offre au tableau");
assert.equal(campaign.isAvailable(a,state),false,"absent pendant la mission");
assert.ok(campaign.expeditionOf(state,b.id));
a.contract.missionBonus=40;b.contract.missionBonus=30;
state.bodyguardBoard.offer.expiresDay=99;
const repA=a.reputation,renown=Number(state.company.missionRenown)||0;
const days4=campaign.advanceTime(state,4);
assert.ok(days4.every(r=>r.expeditions.bodyguards.length===0),"pas avant 5 jours");
// Le cinquième jour : a rentre (jet 0,1), b blessé (jet 0,9 puis 1D3 = 2) ; l'offre au tableau n'expire pas (jour 99).
scripted.push(0.1,0.9,0.4);
const goldBefore=state.company.gold;
const [day5]=campaign.advanceTime(state,1);
const back=day5.expeditions.bodyguards[0];
assert.deepEqual(back.results.map(r=>[r.mercenary.id,r.issue,r.days,r.reputation,r.bonus]),[[a.id,"rentre",0,10,40],[b.id,"blesse",2,5,30]]);
assert.equal(back.bonusPaid,70);
assert.equal(back.renown,10);
assert.ok(state.company.gold<=goldBefore-70,"primes versées au retour (et salaires du jour)");
assert.equal(a.reputation,repA+10);
assert.equal(a.recovery,undefined);
assert.deepEqual([b.recovery.kind,b.recovery.daysLeft],["wounded",2]);
assert.equal(state.company.missionRenown,renown+10);
assert.equal(campaign.expeditionOf(state,a.id),null,"de retour au camp");
assert.equal(a.history.log.at(-1).kind,"bodyguard");

// Interface : le tableau de la Taverne, le choix des gardes, la fenêtre du retour.
const contract=fs.readFileSync(path.join(ROOT,"prototype-web","contract-ui.js"),"utf8");
assert.match(contract,/data-bodyguard-accept/);
assert.match(contract,/for\(const r of report\.bodyguards\|\|\[\]\) queueBodyguardReturn\(r\);/);
assert.match(contract,/const state=r=>\(r\.issue==="blesse"\?"Blessé":"Fatigué"\)\+\(female\(r\.mercenary\)\?"e":""\);/,"Blessée, Fatiguée pour une mercenaire");
const mission=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
assert.match(mission,/if\(contract&&contract\.kind==="bodyguard"\) return openBodyguardSelection\(contract\);/);
assert.match(mission,/if\(game\.missionSelect\?\.bodyguard\) return departBodyguards\(chosen\);/);
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(index,/<dialog id="bodyguard-return-dialog"/);
assert.match(index,/<script src="\/core\/bodyguard\.js"><\/script>/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8"),/bodyguardMissions: "bodyguard-missions\.json"/);
const texts=reference.bodyguardMissions.textes;
assert.match(texts.fatigue,/charmantes demoiselles/);
assert.match(texts.blesse,/bagarre dans une taverne/);
assert.ok(read("character-sheet-copy.json").history.events.bodyguard.blesse);

// Régression UI : deux missions de garde du corps rentrent le même matin.
// La deuxième ne doit pas remplacer la fenêtre de la première avant « D’accord ».
const uiStart=contract.indexOf("function bodyguardReturnLine(");
const uiEnd=contract.indexOf("\nfunction openExpeditionDialog(",uiStart);
assert.ok(uiStart>=0&&uiEnd>uiStart,"fonctions du dialogue trouvées");
const dialog={open:false,showModal(){this.open=true;},close(){this.open=false;}};
const elements={
  "bodyguard-return-dialog":dialog,
  "bodyguard-return-title":{textContent:""},
  "bodyguard-return-client":{textContent:""},
  "bodyguard-return-list":{innerHTML:""},
  "bodyguard-return-ok":{textContent:""}
};
const mockGame={campaign:{company:{roster:[{id:"guard-1"},{id:"guard-2"}]}},bodyguardReturns:[]};
const ui=new Function("game","$","bodyguardTexts","MercenairesRecruitDialogue","fmt","tavernLog","renderAvatar","esc",
  contract.slice(uiStart,uiEnd)+"\nreturn {queueBodyguardReturn,showNextBodyguardReturn};"
)(
  mockGame,id=>elements[id],()=>({rentre:"{prenom} est revenu",retour_titre:"Retour",ok:"D’accord"}),
  {firstName:m=>m.name,fill:(template,vars)=>template.replace("{prenom}",vars.prenom)},
  x=>String(x),()=>{} ,()=>"",x=>String(x)
);
const guardReport=(client,id)=>({
  expedition:{offer:{client}},renown:10,
  results:[{mercenary:{id,name:client,sex:"homme"},issue:"rentre",days:0,reputation:10,bonus:0}]
});
ui.queueBodyguardReturn(guardReport("Premier client","guard-1"));
assert.equal(dialog.open,true);
assert.equal(elements["bodyguard-return-client"].textContent,"Premier client");
ui.queueBodyguardReturn(guardReport("Deuxième client","guard-2"));
assert.equal(elements["bodyguard-return-client"].textContent,"Premier client","le second retour attend son tour");
assert.equal(mockGame.bodyguardReturns.length,1,"le second retour reste en file");
ui.showNextBodyguardReturn();
assert.equal(elements["bodyguard-return-client"].textContent,"Deuxième client","le second retour est affiché après validation");
assert.equal(mockGame.bodyguardReturns.length,0);
ui.showNextBodyguardReturn();
assert.equal(dialog.open,false,"la fenêtre se ferme après le dernier retour");
assert.match(contract,/addEventListener\("close"/,"le dialogue fermé par Échap relance la file");

console.log("Garde du corps : niveaux, paiement, offres, retour 50/25/25, départ, absence, prime, réputation, renommée, interface — OK");
