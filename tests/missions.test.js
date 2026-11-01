"use strict";

// Missions one shot (doc 17) : « Faire le ménage », camp ☠ gobelin ou orc, en boucle à la Taverne (Idan, 2026-10-24 ;
// camps par peuple et points de combat le 2026-11-01).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createMissionRules}=require("../game-core/missions.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
function seeded(seed){
  return function(){
    seed|=0;seed=seed+0x6D2B79F5|0;
    let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
const reference={oneShotMissions:read("one-shot-missions.json"),enemyArchetypes:read("enemy-archetypes.json"),weapons:read("weapons.json"),
  baseArmors:read("base-armors.json"),skills:read("skills.json"),itemQualities:read("item-qualities.json")};
const rules=createMissionRules({reference,random:seeded(7)});

// Camps (Idan, 2026-11-01) : gobelin ou orc au hasard ; points de combat : le chef, puis des ennemis tant que le total se
// rapproche du budget (55 à 75 à la difficulté 1) ; « normal » dans 5 % des tirages ; 35 PO par point.
const counts={Gobelins:[],Orcs:[]},normals=[],totals=[];
for(let i=0;i<4000;i++){
  const camp=rules.rollCamp();
  const sum=rules.points(camp.chief)+camp.enemies.reduce((t,code)=>t+rules.points(code),0);
  assert.equal(camp.points,sum,"points du camp");
  assert.ok(camp.points>=camp.budget-8&&camp.points<=camp.budget+8,`près du budget : ${camp.points} / ${camp.budget}`);
  assert.ok(camp.budget>=55&&camp.budget<=75);
  assert.equal(camp.chief,{Gobelins:"goblin_chief_1",Orcs:"orc_chief_1"}[camp.faction]);
  assert.equal(camp.campName,{Gobelins:"Camp gobelin",Orcs:"Camp orc"}[camp.faction]);
  assert.ok(camp.enemies.every(code=>{ const a=rules.archetype(code); return a.faction===camp.faction&&["novice","normal"].includes(a.niveau); }));
  counts[camp.faction].push(camp.enemies.length);
  normals.push(...camp.enemies.map(code=>rules.archetype(code).niveau==="normal"));
  totals.push(camp.points);
}
const mean=list=>list.reduce((t,x)=>t+x,0)/list.length;
assert.ok(Math.abs(counts.Gobelins.length-2000)<150,"un camp sur deux : "+counts.Gobelins.length);
assert.ok(Math.abs(mean(counts.Gobelins)-6.5)<0.25,"6,5 gobelins en moyenne, comme l'ancien 1D4+4 : "+mean(counts.Gobelins));
assert.ok(Math.min(...counts.Gobelins)>=3&&Math.max(...counts.Gobelins)<=10);
assert.ok(Math.abs(mean(counts.Orcs)-4.3)<0.25,"4,3 orcs en moyenne : "+mean(counts.Orcs));
assert.ok(Math.abs(mean(totals)-65)<1.5,"65 points en moyenne : "+mean(totals));
assert.ok(Math.abs(mean(normals)-0.05)<0.015,"5 % de « normaux » : "+mean(normals));
assert.equal(rules.points("goblin_chief_1"),30);
assert.equal(rules.points("orc_chief_1"),38);

// Offre : distance 1 à 3 jours, récompense = 2 000 + 1 200 par jour aller-retour + 35 PO par point de combat (Idan,
// 2026-11-01), valable 3 à 6 jours ; un des trois ordres du peuple du camp.
const orders={Gobelins:new Set(),Orcs:new Set()};
for(let day=1;day<=400;day++){
  const offer=rules.createOffer({day});
  orders[offer.faction].add(offer.order);
  assert.ok(offer.distance>=1&&offer.distance<=3);
  assert.equal(offer.enemyCount,offer.camp.enemies.length+1);
  assert.equal(offer.reward,2000+1200*2*offer.distance+Math.round(35*offer.camp.points));
  assert.equal(offer.campName,offer.camp.campName);
  assert.ok(offer.expiresDay-day>=3&&offer.expiresDay-day<=6);
  const text=rules.orderText(offer,{date:"1 Brumecendre",date_expiration:"5 Brumecendre",an:842});
  for(const line of [...text.paragraphs,text.signature]) assert.doesNotMatch(line,/\{[^}]+\}/,"tous les champs remplis : "+line);
  assert.doesNotMatch(text.paragraphs.join(" "),/\b1 jours\b/);
  if(offer.faction==="Orcs") assert.doesNotMatch(text.paragraphs.join(" "),/gobelin/i,"une lettre orque ne parle pas de gobelins");
  if(offer.order==="orc_rival") assert.ok(reference.oneShotMissions.noms.chefs_de_camp_orcs.some(n=>text.paragraphs.join(" ").includes(n)),"chef de camp orc");
}
assert.deepEqual([...orders.Gobelins].sort(),["emperor","goblin_rival","village"],"les trois ordres gobelins");
assert.deepEqual([...orders.Orcs].sort(),["emperor_orcs","orc_rival","village_orcs"],"les trois ordres orcs");

// Ennemis : la fiche figée remplace caractéristiques, PV, compétences et équipement d'un personnage de base.
const offer=rules.createOffer({day:4});
const base=()=>({id:900,name:"Base",stats:{Force:1,Courage:1,Charisme:12},resistances:{"Résistance physique":0},
  skills:{martial:{Lance:80,Arc:80,"Port d’armure lourde":true},social:{Intimidation:99},magic:{Feu:3}},
  equipment:{slots:{armor:null,weapon_set_1_main:null,weapon_set_1_off:null,weapon_set_2_main:null,ring_1:null},profile:{type:"magic"}},
  items:[{id:"old",name:"Hallebarde"}]});
const enemies=rules.buildEnemies(offer,()=>base());
assert.equal(enemies.length,offer.enemyCount);
const chief=enemies[enemies.length-1],caid=rules.archetype("goblin_chief_1");
assert.equal(chief.name,offer.fields.boss+" (Caïd gobelin)");
assert.deepEqual([chief.pvMax,chief.pv,chief.stats.Force,chief.stats.Charisme],[caid.pv,caid.pv,caid.caracteristiques.Force,caid.caracteristiques.Charisme]);
assert.equal(chief.skills.martial.Sabre,caid.competences_martiales.Sabre);
assert.equal(chief.skills.martial.Lance,0,"les autres compétences tombent à 0");
assert.equal(chief.skills.martial["Port d’armure lourde"],false);
assert.equal(chief.skills.martial["Port d’armure intermédiaire"],true);
assert.equal(chief.skills.social.Intimidation,caid.intimidation);
assert.equal(chief.skills.magic.Feu,3,"la magie de la base reste");
const [sabre,rondache,armor]=chief.items;
assert.deepEqual([sabre.name,sabre.itemType,sabre.tier,sabre.qualityCode,sabre.category,sabre.combatFamily,chief.equipment.slots.weapon_set_1_main],
  ["Sabre","weapon",3,"luxury","Lames longues","melee",sabre.id]);
assert.deepEqual([rondache.name,chief.equipment.slots.weapon_set_1_off],["Rondache",rondache.id]);
assert.deepEqual([armor.name,armor.templateId,armor.itemType,chief.equipment.slots.armor],["Cuir renforcé","armor:reinforced_leather","armor",armor.id]);
assert.equal(new Set(enemies.flatMap(e=>e.items.map(i=>i.id))).size,enemies.reduce((n,e)=>n+e.items.length,0),"identifiants uniques");
const names=enemies.slice(0,-1).map(e=>e.name);
assert.equal(new Set(names).size,names.length,"les doublons sont numérotés");
// Camp orc : des orcs, et le Chef de bande nommé.
let orcOffer=null;
for(let day=10;!orcOffer;day++){ const o=rules.createOffer({day}); if(o.faction==="Orcs") orcOffer=o; }
const orcs=rules.buildEnemies(orcOffer,()=>base());
const orcChief=orcs[orcs.length-1],bande=rules.archetype("orc_chief_1");
assert.equal(orcChief.name,orcOffer.fields.boss+" (Chef de bande orc)");
assert.equal(orcChief.pvMax,bande.pv);
assert.ok(orcs.every(e=>/orc/.test(e.archetype)));

// Issue : victoire = récompense + coffre (2D6 × 50 PO) + équipement des morts des deux camps ; défaite = −30 de renommée.
const fallen={id:1,items:[{id:"m1",name:"Épée longue",owner:1}]};
const win=rules.outcome(offer,{victory:true,deadEnemies:enemies.slice(0,2),deadMercenaries:[fallen],chestItems:[{id:"c1",name:"Bague du courage",owner:3}]});
assert.equal(win.reward,offer.reward);
assert.ok(win.chestGold>=100&&win.chestGold<=600&&win.chestGold%50===0);
assert.equal(win.loot.length,enemies[0].items.length+enemies[1].items.length+1);
assert.ok([...win.loot,...win.chestItems].every(it=>it.owner===null));
const lose=rules.outcome(offer,{victory:false,deadEnemies:enemies,deadMercenaries:[fallen]});
assert.deepEqual([lose.reward,lose.chestGold,lose.loot.length,lose.renown],[0,0,0,-30]);
assert.equal(rules.deathMultiplier(offer,false),2);
// Coffre (Idan, 2026-10-25) : 1D3 objets, T2 (70 %) ou T3 (30 %).
const chestCounts=new Set(),tiers={2:0,3:0};
for(let i=0;i<600;i++){ chestCounts.add(rules.chestItemCount(offer)); tiers[rules.chestTier(offer)]+=1; }
assert.deepEqual([...chestCounts].sort(),[1,2,3]);
assert.equal(tiers[2]+tiers[3],600,"jamais de T1");
assert.ok(tiers[2]>350&&tiers[2]<480,`T2 ≈ 70 % : ${tiers[2]} / 600`);
assert.equal(rules.deathMultiplier(offer,true),1);
assert.deepEqual(rules.mapSize(offer),{cols:20,rows:12});

// Campagne : une offre au tableau dès le départ, prise par une autre compagnie après sa date ; l'expédition ; la renommée
// de missions ; pas de prime pour un fuyard sorti de la carte.
const files={peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",ancestries:"ancestries.json",
  ancestryCompatibility:"ancestry-compatibility.json",cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",
  d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",characteristics:"characteristics.json",
  formulaConstants:"formula-constants.json",weapons:"weapons.json",baseArmors:"base-armors.json",itemQualities:"item-qualities.json",
  equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",
  alignmentGeneration:"alignment-generation.json",renamedNames:"renamed-names.json"};
const full=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,read(file)]));
const generator=createGenerator(full,{random:seeded(3),nameGenerator:(people,id)=>people+" "+id});
const tavern=createTavernRules({reference:full,random:seeded(4)});
const campaign=createCampaignRules({generator,tavern,reference:full,missions:createMissionRules({reference,random:seeded(5)})});
const captain=generator.createCaptain({id:1,name:"Capitaine"});
const squad=[2,3].map(id=>generator.createMercenary({id,captain}));
const game=campaign.createCampaign({captain,squad});
const first=game.missionBoard.offer;
assert.ok(first&&first.code==="cleanup");
assert.equal(campaign.ensureMissionOffer(game),false,"déjà une offre");
const reports=campaign.advanceTime(game,first.expiresDay-game.day);
assert.ok(reports.every(r=>!r.missionTaken),"valable jusqu'à sa date");
const [taken]=campaign.advanceTime(game,1);
assert.equal(taken.missionTaken,first,"prise par une autre compagnie le lendemain");
assert.notEqual(game.missionBoard.offer,first);
// Expédition (Idan, 2026-10-24) : l'escouade part, le camp continue ; elle arrive au bout de la distance, le combat
// l'attend ; après le combat, elle rentre en autant de jours avec l'or, les objets et les primes.
const signed=game.missionBoard.offer;
const departure=campaign.departExpedition(game,[2,3]);
assert.ok(departure.ok);
const trip=departure.expedition;
// Mission programmée (Idan, 2026-10-30) : départ le lendemain matin, puis les jours de marche ; d'ici là, l'escouade est
// au camp (on lui parle, on l'équipe, elle recharge son mana) mais ne part sur aucune autre mission.
assert.deepEqual([trip.offer,trip.memberIds,trip.status,trip.departDay,trip.arriveDay],[signed,[2,3],"scheduled",game.day+1,game.day+1+signed.distance]);
assert.notEqual(game.missionBoard.offer,signed,"une nouvelle offre au tableau : plusieurs escouades possibles");
assert.equal(campaign.isAvailable(squad[0],game),false,"pris par la mission");
assert.equal(campaign.awayOf(game,2),null,"encore au camp");
assert.equal(campaign.isAvailable(captain,game),true);
assert.deepEqual(campaign.departExpedition(game,[2]),{ok:false,reason:"Un de ces mercenaires est déjà en mission."});
const [leave]=campaign.advanceTime(game,1);
assert.deepEqual(leave.expeditions.departed,[trip],"départ le lendemain matin");
assert.equal(trip.status,"outbound");
assert.equal(campaign.awayOf(game,2),trip);
const outbound=campaign.advanceTime(game,signed.distance);
assert.ok(outbound.slice(0,-1).every(r=>!r.expeditions.arrived.length));
assert.deepEqual(outbound[outbound.length-1].expeditions.arrived,[trip],"arrivée au bout de la distance");
assert.equal(trip.status,"arrived");
assert.deepEqual(campaign.advanceTime(game,1)[0].expeditions.waiting,[trip],"le combat attend le joueur");
assert.deepEqual([campaign.canAdvanceDay(game).ok,campaign.canAdvanceDay(game).expedition],[false,trip],"pas de jour suivant avant le combat");
const won=rules.outcome(signed,{victory:true,deadEnemies:[{id:50,items:[{id:"g1",name:"Fronde",owner:50}]}],chestItems:[{id:"c2",name:"Bague du courage"}]});
const goldBefore=game.company.gold,stockBefore=game.company.stock.length;
campaign.completeExpeditionCombat(game,trip.id,{result:won,bonuses:[{id:2,bonus:100},{id:3,bonus:80}]});
assert.deepEqual([trip.status,trip.returnDay,game.company.gold,game.company.stock.length],["returning",game.day+signed.distance,goldBefore,stockBefore],"rien n'arrive avant le retour");
assert.equal(campaign.canAdvanceDay(game).ok,true,"combat livré : les jours reprennent");
const back=campaign.advanceTime(game,signed.distance).map(r=>r.expeditions.returned).flat();
assert.equal(back.length,1);
assert.deepEqual([back[0].gold,back[0].items,back[0].bonusPaid],[won.reward+won.chestGold,2,180]);
assert.equal(game.company.stock.length,stockBefore+2);
assert.equal(campaign.expeditionOf(game,2),null,"de retour au camp");
// Défaite : la renommée baisse tout de suite ; personne ne rentre, rien n'arrive.
const lost=campaign.departExpedition(game,[3]).expedition;
campaign.advanceTime(game,1+lost.offer.distance);
const missionRenown=Number(game.company.missionRenown)||0;
game.company.roster=game.company.roster.filter(m=>m.id!==3);
const none=campaign.completeExpeditionCombat(game,lost.id,{result:rules.outcome(lost.offer,{victory:false})});
assert.deepEqual([none.gold,none.items,game.company.missionRenown],[0,0,missionRenown-30]);
assert.equal((game.expeditions||[]).length,0);
game.company.missionRenown=0;
const renown=campaign.companyRenown(game).total;
game.company.missionRenown=-30;
assert.equal(campaign.companyRenown(game).total,renown-30);
assert.equal(campaign.companyRenown(game).parts.missions,-30);
for(const m of squad) m.contract={...(m.contract||{}),missionBonus:100};
const gold=game.company.gold;
const report=campaign.applyMissionAftermath(game,{results:[
  {id:2,dead:false,wounded:false,fatigueDays:3,offMap:true},
  {id:1,dead:false,wounded:false,fatigueDays:3,offMap:false}],captainDead:false});
assert.equal(report.bonusPaid,0,"le fuyard sorti de la carte ne touche pas sa prime ; le capitaine n'en a pas");
assert.equal(game.company.gold,gold);
squad[0].recovery=null;
const deferred=campaign.applyMissionAftermath(game,{results:[{id:2,dead:false,wounded:false,fatigueDays:3,offMap:false}],captainDead:false},{deferBonuses:true});
assert.deepEqual([deferred.bonusPaid,deferred.bonusesDue.map(b=>[b.id,b.bonus])],[0,[[2,100]]],"expédition : prime due au retour");
assert.equal(game.company.gold,gold);
// Inventaire (Idan, 2026-10-30) : un mort en mission rend à l'Intendance ce qu'il gardait au dortoir ; ce qu'il portait
// reste avec lui (butin d'une victoire).
const dead=squad[0],deadWorn=Object.values(dead.equipment.slots).filter(Boolean);
dead.items.push({id:"bag1",name:"Dague",tier:1,itemType:"weapon",owner:dead.id,slot:null});
const stockBeforeDeath=game.company.stock.length;
const death=campaign.applyMissionAftermath(game,{results:[{id:dead.id,dead:true}],captainDead:false});
assert.deepEqual(death.inventoryReturned.map(x=>x.id),["bag1"]);
assert.equal(game.company.stock.length,stockBeforeDeath+1);
assert.deepEqual([game.company.stock.at(-1).id,game.company.stock.at(-1).owner],["bag1",null]);
assert.deepEqual(dead.items.map(x=>x.id).sort(),[...deadWorn].sort(),"il garde ce qu'il portait");

// Objets du coffre (Idan, 2026-10-25) : toutes les familles d'équipement, au tier tiré et à sa qualité, sans propriétaire.
const families=new Set();
for(let i=0;i<400;i++){
  const item=generator.createChestItem(captain,3);
  assert.deepEqual([item.tier,item.qualityCode,item.owner],[3,"luxury",null],item.name);
  families.add(item.itemType);
}
for(const family of ["weapon","armor"]) assert.ok(families.has(family),family);
assert.equal(generator.createChestItem(captain,2).qualityCode,"standard");
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8"),/game\.generator\.createChestItem\(captain,rules\.chestTier\(offer\)\)/);

// Primes de mission divisées par deux (Idan, 2026-10-25) : une partie commencée avant voit ses contrats divisés une fois.
const halved=campaign.createCampaign({captain,squad:[generator.createMercenary({id:70,captain})]});
assert.equal(halved.company.missionBonusHalved,true,"partie neuve : déjà au nouveau barème");
assert.equal(campaign.ensureHalvedMissionBonuses(halved),false);
delete halved.company.missionBonusHalved;
const veteran=halved.company.roster.find(m=>m.id===70);
veteran.contract.missionBonus=151;
assert.equal(campaign.ensureHalvedMissionBonuses(halved),true);
assert.equal(veteran.contract.missionBonus,76);
assert.equal(campaign.ensureHalvedMissionBonuses(halved),false,"une seule fois");

console.log("Missions one shot : camp ☠, offre, ordres, ennemis, butin, coffre T2/T3, renommée, tableau de la Taverne, primes ÷ 2 — OK");
