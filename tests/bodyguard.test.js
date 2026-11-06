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
const {createEquipmentDeals}=require("../game-core/equipment-deals.js");

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
assert.deepEqual([0,92,93,120,137,1600,9000].map(r=>rules.levelOf(r)),[1,1,2,3,4,15,15]);
// Salaire de référence : 10 × Réputation du niveau suivant / 30 ; au-delà de 15 étoiles, × 1,25.
// Seuils recalés le 2026-11-06 (reputation-stars.json).
assert.equal(Math.round(rules.referenceWage(3)),46,"3★ : 10 × 137 / 30");
assert.equal(Math.round(rules.referenceWage(15)),667,"15★ : 10 × 2 000 / 30");
// Paiement par mercenaire = W × (2 + jours × (1,3 + (jours − 3)/22)), arrondi à 10 ; plus c'est long, plus la journée paie.
assert.equal(rules.payment(3,3),270);
assert.equal(rules.payment(3,21),2120);
assert.equal(rules.payment(3,7,2),2*570,"par mercenaire");
assert.ok(rules.payment(3,21)/21>rules.payment(3,3)/3);
assert.equal(rules.payment(15,21),30990);

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
// Taverne à 5 missions (Idan, 2026-11-01) : sans contrat de ménage dans cette campagne, 5 gardes du corps.
assert.ok(campaign.boardOffers(state).length===5&&campaign.boardOffers(state).every(o=>o.kind==="bodyguard"));
assert.equal(campaign.fillTavernBoard(state),false,"tableau plein");
const slot=campaign.tavernSlots(state)[0];
slot.offer={...slot.offer,level:2,count:2,days:5,payment:1000};
const [a,b,c]=squad;
a.reputation=120;b.reputation=110;c.reputation=50;
assert.deepEqual(campaign.canGuard(state,captain),{ok:false,reason:"Le capitaine reste à la compagnie."});
assert.deepEqual(campaign.canGuard(state,c),{ok:false,reason:"Réputation trop faible."});
assert.equal(campaign.departBodyguard(state,[a.id]).ok,false,"exactement le nombre demandé");
const gold=state.company.gold;
const offerId=slot.offer.id;
// Au jour J, on organise J+1 (Idan, 2026-11-02) : on peut annuler avant le départ ; l'offre retourne dans sa case.
const first=campaign.departBodyguard(state,[a.id,b.id],offerId);
assert.equal(first.ok,true);
assert.deepEqual([slot.offer,slot.emptyUntil],[null,state.day+1]);
const cancelled=campaign.cancelExpedition(state,first.expedition.id);
assert.deepEqual([cancelled.ok,cancelled.returned,slot.offer.id,slot.emptyUntil],[true,true,offerId,null],"l'offre retourne au tableau");
assert.equal(campaign.expeditionOf(state,a.id),null);
assert.equal(campaign.cancelExpedition(state,first.expedition.id).reason,"Mission introuvable.");
const left=campaign.departBodyguard(state,[a.id,b.id],offerId);
assert.equal(left.ok,true);
assert.equal(state.company.gold,gold,"l'acompte n'arrive pas à la signature (Idan : « On reçoit l'argent le lendemain matin ! »)");
assert.deepEqual([slot.offer,slot.emptyUntil],[null,state.day+1],"case prise : vide jusqu'au lendemain");
assert.equal(campaign.isAvailable(a,state),false,"pris par la mission");
assert.ok(campaign.expeditionOf(state,b.id));
// Mission programmée (Idan, 2026-10-30) : départ le lendemain matin ; d'ici là, au camp, on lui parle et on l'équipe.
assert.equal(left.expedition.status,"scheduled");
assert.equal(campaign.awayOf(state,a.id),null,"encore au camp");
assert.deepEqual(campaign.canGuard(state,a),{ok:false,reason:"Il part déjà en mission demain."});
const deals=createEquipmentDeals({reference:{weapons:{rows:[]},equipmentSlots:{rows:[]}}});
assert.equal(deals.canDeal(state,a).ok,true,"on peut encore l'équiper");
a.contract.missionBonus=40;b.contract.missionBonus=30;
for(const o of campaign.boardOffers(state)) o.expiresDay=99;
const repA=a.reputation,renown=Number(state.company.missionRenown)||0;
const goldBeforeDeparture=state.company.gold;
const [leave]=campaign.advanceTime(state,1);
assert.deepEqual(leave.expeditions.departed,[left.expedition],"départ le lendemain matin");
assert.equal(left.expedition.status,"away");
assert.equal(left.expedition.paid,1000);
assert.equal(state.company.gold,goldBeforeDeparture+1000-leave.salaries.total,"l'acompte arrive le matin du départ");
assert.equal(campaign.cancelExpedition(state,left.expedition.id).reason,"L’escouade est déjà partie.");
// Ancienne sauvegarde : une garde du corps signée avant cette règle a déjà été payée à la signature ; pas de second
// paiement au départ, et l'annuler rend l'argent.
{
  const oldSquad=[20,21].map(id=>generator.createMercenary({id,captain}));
  const old=campaign.createCampaign({captain,squad:oldSquad});
  const offer={...campaign.boardOffers(old)[0],payment:500};
  const scheduled=id=>({id,kind:"bodyguard",offer,memberIds:[oldSquad[0].id],signedDay:old.day,departDay:old.day+1,returnDay:old.day+6,status:"scheduled"});
  old.expeditions=[scheduled("old-1")];
  const before=old.company.gold;
  const [morning]=campaign.advanceTime(old,1);
  assert.equal(old.company.gold,before-morning.salaries.total,"pas de second paiement au départ");
  old.expeditions.push({...scheduled("old-2"),memberIds:[oldSquad[1].id],signedDay:old.day,departDay:old.day+1});
  const kept=old.company.gold;
  assert.equal(campaign.cancelExpedition(old,"old-2").ok,true);
  assert.equal(old.company.gold,kept-500,"annulée : le paiement déjà reçu est rendu");
}
assert.equal(deals.canDeal(state,a).reason,"Il est en mission.");
const days4=campaign.advanceTime(state,4);
assert.ok(days4.every(r=>r.expeditions.bodyguards.length===0),"pas avant 5 jours d'absence");
// Le cinquième jour : a rentre (jet 0,1), b blessé (jet 0,9 puis 1D3 = 2) ; les offres au tableau n'expirent pas (jour 99).
assert.ok(slot.offer&&slot.offer.id!==offerId,"le lendemain, une nouvelle mission dans la case");
for(const o of campaign.boardOffers(state)) o.expiresDay=99;
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

// Deux gardes du corps rentrent le même matin (Chatty, PR #310 ; issue #503) : la seconde fenêtre attend « D’accord ».
{
  const uiStart=contract.indexOf("function bodyguardReturnLine(");
  const uiEnd=contract.indexOf("\nfunction openExpeditionDialog(",uiStart);
  assert.ok(uiStart>=0&&uiEnd>uiStart,"fonctions du dialogue trouvées");
  const dialog={open:false,showModal(){this.open=true;},close(){this.open=false;}};
  const elements={"bodyguard-return-dialog":dialog,"bodyguard-return-title":{textContent:""},"bodyguard-return-client":{textContent:""},
    "bodyguard-return-list":{innerHTML:""},"bodyguard-return-ok":{textContent:""}};
  const mockGame={campaign:{company:{roster:[{id:"guard-1"},{id:"guard-2"}]}},bodyguardReturns:[]};
  const ui=new Function("game","$","bodyguardTexts","MercenairesRecruitDialogue","fmt","tavernLog","renderAvatar","esc",
    contract.slice(uiStart,uiEnd)+"\nreturn {queueBodyguardReturn,showNextBodyguardReturn};")(
    mockGame,id=>elements[id],()=>({rentre:"{prenom} est revenu",retour_titre:"Retour",ok:"D’accord"}),
    {firstName:m=>m.name,fill:(template,vars)=>template.replace("{prenom}",vars.prenom)},x=>String(x),()=>{},()=>"",x=>String(x));
  const guardReport=(client,id)=>({expedition:{offer:{client}},renown:10,
    results:[{mercenary:{id,name:client,sex:"homme"},issue:"rentre",days:0,reputation:10,bonus:0}]});
  ui.queueBodyguardReturn(guardReport("Premier client","guard-1"));
  assert.deepEqual([dialog.open,elements["bodyguard-return-client"].textContent],[true,"Premier client"]);
  ui.queueBodyguardReturn(guardReport("Deuxième client","guard-2"));
  assert.equal(elements["bodyguard-return-client"].textContent,"Premier client","le second retour attend son tour");
  assert.equal(mockGame.bodyguardReturns.length,1,"le second retour reste en file");
  ui.showNextBodyguardReturn();
  assert.equal(elements["bodyguard-return-client"].textContent,"Deuxième client","affiché après « D’accord »");
  assert.equal(mockGame.bodyguardReturns.length,0);
  ui.showNextBodyguardReturn();
  assert.equal(dialog.open,false,"la fenêtre se ferme après le dernier retour");
  assert.match(contract,/\$\("bodyguard-return-dialog"\)\?\.addEventListener\("close",\(\)=>\{\s*if\(game\.bodyguardReturns\?\.length\) showNextBodyguardReturn\(\);/,"fermée par Échap : la file continue");
}

console.log("Garde du corps : niveaux, paiement, offres, retour 50/25/25, départ, absence, prime, réputation, renommée, interface — OK");
