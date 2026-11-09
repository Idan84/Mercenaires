"use strict";

// Marchands (doc 18 ; Idan, 2026-10-30 et 2026-10-31) : passage du jour (30 % + 4 % par étoile de renommée) ; Thorval
// Poudredefeu, nain du chaos, qui ne vend que quatre armes à feu ; 10 articles par passage, T2 à T4 selon la renommée ;
// affinité (initiale + acquise : +2 par achat, −3 par passage sans affaire) ; prix d'achat et de rachat (hors de sa liste,
// quantité, rareté, plafond) ; aide de l'intendant.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createMerchantRules}=require("../game-core/merchants.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createAffinityRules}=require("../game-core/affinity.js");
const {createItemValues}=require("../game-core/item-value.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules,serializeCampaign,restoreCampaign}=require("../game-core/campaign.js");

const ROOT=path.resolve(__dirname,"..");
// Les référentiels du jeu, comme le navigateur les charge (prototype-web/reference-data.js).
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.merchants,"merchants.json","merchants.json chargé par le jeu");
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"))]));

let seed=29;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const scripted=[];
const scriptedRandom=()=>scripted.length?scripted.shift():random();
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const affinity=createAffinityRules({reference});
const values=createItemValues({reference});
// Le parcours de Thorval se teste avec lui seul ; les deux marchands ensemble, plus bas.
// (avec ses quatre armes à feu d'origine : l'arbalète, la bague de la Foudre et les manuels de Foudre viennent après).
const FIREARM_NAMES=["Pistolet","Tromblon","Canon à main","Arquebuse"];
const thorvalOnly={...reference,merchants:{...reference.merchants,rows:reference.merchants.rows.filter(m=>m.id==="thorval-poudredefeu")
  .map(m=>({...m,vend:m.vend.filter(v=>FIREARM_NAMES.includes(v.objet))}))}};
const rules=createMerchantRules({reference:thorvalOnly,generator,affinity,random:scriptedRandom});
const near=(a,b,eps=1e-9)=>Math.abs(a-b)<eps;
const levels=[...reference.reputationStars.rows].sort((a,b)=>a.niveau-b.niveau);
const renownAt=level=>levels.find(r=>r.niveau===level).renommee_min;

// Données : Thorval Poudredefeu, nain du chaos (l'alignement par défaut des Nains du chaos), quatre armes à feu.
const FIREARMS=["Pistolet","Tromblon","Canon à main","Arquebuse"];
assert.ok(!reference.merchants.rows.some(m=>m.id==="marchand-test"),"le marchand test est remplacé");
const thorval=reference.merchants.rows[0];
assert.equal(thorval.nom,"Thorval Poudredefeu");
assert.equal(thorval.peuple,"Nain");
assert.equal(thorval.culture,"Nains du chaos");
assert.equal(thorval.alignement,reference.alignmentGeneration.culture_overrides["Nains du chaos"]);
assert.equal(thorval.portrait,"","le portrait viendra : son image, faite pour lui seul");
assert.deepEqual(thorval.vend,[...FIREARMS.map(objet=>({type:"weapon",objet})),{type:"weapon",objet:"Arbalète"},{type:"ring",objet:"Bague de la Foudre"},{type:"manual",ecole:"Foudre"}],
  "ses armes à feu, puis l'arbalète, la bague de la Foudre et les manuels de Foudre (JC3, 2026-10-31)");
for(const name of FIREARMS) for(const tier of [2,3,4]){
  const item=generator.createItemByName("weapon",name,tier);
  assert.equal(item?.name,name);
  assert.equal(item.tier,tier);
  assert.ok(values.value(item)>0,name+" T"+tier+" a une valeur");
}
assert.equal(rules.constants.stockSize,10);

// Chance de passage : 30 % + 4 % par niveau d'étoiles de la renommée.
for(const row of levels) assert.ok(near(rules.arrivalChance(row.renommee_min),0.3+0.04*row.niveau),"niveau "+row.niveau);
assert.ok(rules.arrivalChance(1e9)<=1);

// Tiers de l'étal : T2 70 − 4 × niveau, T3 25 + 2 × niveau, T4 5 + 2 × niveau ; rien d'autre.
for(const row of levels){
  const chances=rules.tierChances(row.renommee_min),L=row.niveau;
  assert.deepEqual(chances.map(c=>c.tier),[2,3,4]);
  assert.ok(near(chances.reduce((s,c)=>s+c.chance,0),1));
  assert.ok(near(chances[0].chance,(70-4*L)/100)&&near(chances[1].chance,(25+2*L)/100)&&near(chances[2].chance,(5+2*L)/100),"niveau "+L);
}
assert.deepEqual(rules.tierChances(renownAt(2)).map(c=>Math.round(c.chance*100)),[62,29,9],"compagnie neuve");
assert.deepEqual(rules.tierChances(renownAt(15)).map(c=>Math.round(c.chance*100)),[10,55,35],"5 étoiles d'or");

// Une campagne avec un capitaine humain chaotique neutre : affinité initiale +44 avec Thorval (un nain du chaos n'aime
// pas grand monde : 0 pour le peuple, +4 pour le même alignement).
const captain=generator.createCaptain({id:1});
Object.assign(captain,{people:"Humain",culture:"Impériaux",alignment:"Chaotique neutre"});
const squad=Array.from({length:4},(_,i)=>generator.createMercenary({id:i+2,captain}));
const campaign=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,affinity,merchants:rules});
const state=campaign.createCampaign({captain,squad});
const renown=renownAt(2);
const merchant={id:thorval.id,people:"Nain",culture:"Nains du chaos",alignment:"Chaotique neutre"};
assert.equal(rules.affinityWith(state,merchant),44);

// Pas de marchand : le tirage dépasse la chance.
scripted.push(0.999);
let morning=rules.morning(state,{renown});
assert.equal(morning.arrived,null);
assert.equal(rules.visitOf(state,{renown}),null);
assert.deepEqual(state.market,{visit:null,merchants:{}});

// Thorval passe : 10 articles de sa liste, T2 à T4, sans propriétaire, au prix valeur × 1,5 × (1 − 0,2 × 44 / 100).
scripted.push(0);
morning=rules.morning(state,{renown});
assert.equal(morning.arrived.id,"thorval-poudredefeu");
assert.equal(morning.arrived.name,"Thorval Poudredefeu");
let visit=rules.visitOf(state,{renown});
assert.equal(visit.offers.length,10);
assert.equal(visit.affinity,44);
assert.equal(visit.steward,null,"pas d'intendant");
for(const o of visit.offers){
  assert.ok(FIREARMS.includes(o.item.name)&&o.item.itemType==="weapon",o.item.name);
  assert.ok([2,3,4].includes(o.item.tier));
  assert.equal(o.item.owner,null);
  assert.equal(o.price,Math.round(values.value(o.item)*1.5*(1-0.2*44/100)));
}
assert.equal(new Set(visit.offers.map(o=>o.item.id)).size,10,"dix objets distincts");
// Les exemples de la proposition (Idan, 2026-10-31) : affinité +44, compagnie neuve, sans intendant.
const item=(name,tier)=>generator.createItemByName("weapon",name,tier);
assert.equal(rules.sellPrice(item("Pistolet",2),44),739);
assert.equal(rules.sellPrice(item("Tromblon",4),44),17955,"T4 De luxe : prix × 2,5 (Idan, 2026-11-01)");
assert.equal(rules.buybackPrice(item("Pistolet",2),{affinity:44,specialty:true,level:2}),470);
assert.equal(rules.buybackPrice(item("Tromblon",4),{affinity:44,specialty:true,level:2}),15667);
assert.equal(rules.buybackPrice(item("Tromblon",4),{affinity:44,specialty:true,level:11}),12730);
assert.equal(rules.buybackPrice(item("Épée longue",1),{affinity:44,level:2}),25);

// Achat : pas assez d'or, puis un achat ; l'article quitte l'étal et rejoint l'Intendance ; +2 d'affinité.
const offer=visit.offers[0];
state.company.gold=offer.price-1;
assert.equal(rules.buy(state,offer.id,{renown}).ok,false);
assert.equal(state.company.gold,offer.price-1,"rien n'est payé");
state.company.gold=100000;
const stockBefore=state.company.stock.length;
const bought=rules.buy(state,offer.id,{renown});
assert.equal(bought.ok,true);
assert.equal(bought.price,offer.price);
assert.equal(state.company.gold,100000-offer.price);
assert.equal(state.company.stock.length,stockBefore+1);
assert.equal(state.company.stock.at(-1),offer.item);
assert.equal(rules.buy(state,offer.id,{renown}).ok,false,"chaque article ne se vend qu'une fois");
visit=rules.visitOf(state,{renown});
assert.equal(visit.offers.length,9);
assert.equal(visit.affinity,46,"+2 par article acheté");
assert.equal(state.market.visit.traded,true);

// Le lendemain : il repart, sans perte d'affinité (il y a eu une affaire).
state.day+=1;
scripted.push(0.999);
morning=rules.morning(state,{renown});
assert.equal(morning.left.id,"thorval-poudredefeu");
assert.equal(rules.affinityWith(state,merchant),46);
assert.equal(rules.buy(state,1,{renown}).ok,false,"plus de marchand");
// Un passage sans achat ni vente : −3 quand il repart.
scripted.push(0);
rules.morning(state,{renown});
state.day+=1;
scripted.push(0.999);
rules.morning(state,{renown});
assert.equal(rules.affinityWith(state,merchant),43,"−3 pour un passage sans affaire");
// L'affinité totale reste entre −100 et +100 ; l'acquise ne s'accumule pas au-delà.
state.market.merchants[thorval.id].acquired=56;
assert.equal(rules.affinityWith(state,merchant),100);
state.day+=1;
scripted.push(0);
rules.morning(state,{renown});
const top=rules.visitOf(state,{renown}).offers[0];
rules.buy(state,top.id,{renown});
assert.equal(state.market.merchants[thorval.id].acquired,56,"déjà au maximum");
state.market.merchants[thorval.id].acquired=0;

// Vendre : ses armes au prix de rachat (avec la rareté), le reste × 0,4, de moins en moins cher par exemplaire.
state.company.stock=[item("Tromblon",4),item("Épée longue",1),item("Épée longue",1),item("Épée longue",1),item("Épée longue",2)];
visit=rules.visitOf(state,{renown});
const tromblon=state.company.stock[0];
assert.deepEqual(visit.buyback(tromblon),{specialty:true,price:15667});
assert.equal(visit.buyback(state.company.stock[1]).specialty,false);
const goldBefore=state.company.gold;
const sold=rules.sell(state,tromblon.id,{renown});
assert.equal(sold.ok,true);
assert.equal(sold.price,15667);
assert.equal(state.company.gold,goldBefore+15667);
assert.ok(!state.company.stock.includes(tromblon),"il l'emporte");
const swords=state.company.stock.filter(i=>i.tier===1).map(i=>rules.sell(state,i.id,{renown}).price);
const base=72*0.8*(1+0.2*44/100)*0.4;
assert.deepEqual(swords,[0,1,2].map(n=>Math.round(base*0.85**n)),"0,85 par exemplaire déjà vendu");
assert.equal(rules.sell(state,state.company.stock[0].id,{renown}).price,Math.round(360*0.8*(1+0.2*44/100)*0.4),"un autre tier : pas de baisse");
assert.equal(state.company.stock.length,0);
assert.deepEqual(state.market.visit.sold,{"weapon|Tromblon|4":1,"weapon|Épée longue|1":3,"weapon|Épée longue|2":1});
assert.equal(rules.sell(state,"inconnu",{renown}).ok,false);
state.company.stock=[{id:"x",itemType:"weapon",name:"Objet de quête",tier:1}];
assert.equal(rules.sell(state,"x",{renown}).reason,"Il n’en veut pas.");
state.company.stock=[];

// La rareté baisse avec la renommée : rien à 5 étoiles d'or ; rien sur un T2 ; rien hors de sa liste.
const t4=item("Canon à main",4),v4=values.value(t4);
assert.equal(rules.buybackPrice(t4,{specialty:true,level:15}),Math.round(v4*0.8));
assert.equal(rules.buybackPrice(t4,{specialty:true,level:1}),Math.round(v4*0.8*1.4));
assert.equal(rules.buybackPrice(item("Canon à main",3),{specialty:true,level:1}),Math.round(values.value(item("Canon à main",3))*0.8*1.2));
assert.equal(rules.buybackPrice(item("Canon à main",2),{specialty:true,level:1}),Math.round(values.value(item("Canon à main",2))*0.8));
// Plafond : jamais plus de 90 % de ce qu'il en demanderait.
const ask=rules.sellPrice(t4,100,0.1);
assert.equal(rules.buybackPrice(t4,{affinity:100,steward:0.1,specialty:true,level:1}),Math.round(0.9*ask));
for(const level of [1,5,15]) for(const score of [-100,0,100]) for(const steward of [0,0.1]){
  assert.ok(rules.buybackPrice(t4,{affinity:score,steward,specialty:true,level})<rules.sellPrice(t4,score,steward),"jamais d'aller-retour gagnant");
}

// L'intendant : 1 % par tranche de 10 points d'Intendance si l'affinité du marchand avec lui est d'au moins +20.
const steward=state.company.roster.find(m=>m.id!==state.company.captainId);
Object.assign(steward,{people:"Nain",culture:"Nains du chaos",alignment:"Chaotique neutre"});
steward.skills.camp.Intendance=57;
state.company.intendantId=steward.id;
visit=rules.visitOf(state,{renown});
assert.equal(visit.steward,steward);
assert.ok(near(visit.stewardBonus,0.05));
for(const o of visit.offers) assert.equal(o.price,rules.sellPrice(o.item,44,0.05));
assert.equal(visit.buyback(item("Pistolet",2)).price,Math.round(540*0.8*(1+0.2*44/100)*1.05));
Object.assign(steward,{people:"Orc",culture:"Orcs",alignment:"Loyal bon"});
assert.deepEqual(rules.stewardHelp(state,merchant),{steward:null,bonus:0},"il ne l'aime pas : pas d'aide");
Object.assign(steward,{people:"Nain",culture:"Nains du chaos",alignment:"Chaotique neutre"});
steward.skills.camp.Intendance=9;
assert.deepEqual(rules.stewardHelp(state,merchant),{steward:null,bonus:0},"moins de 10 en Intendance");
state.company.intendantId=null;

// « Rien que pour toi, capitaine » (Idan, 2026-10-31) : à +100 d'affinité, une fois par passage, un objet hors de sa
// liste, T3 ou T4, à 50 % de son prix normal.
const SELLS=new Set(FIREARMS.map(n=>"weapon|"+n));
state.day+=1;
scripted.push(0);
rules.morning(state,{renown});
assert.equal(rules.affinityWith(state,merchant),44);
assert.equal(rules.visitOf(state,{renown}).special,null,"pas à +44");
assert.equal(rules.buySpecial(state,{renown}).ok,false);
assert.match(thorval.repliques.rien_que_pour_toi[0],/\{prix\}/);
// L'achat qui le porte à +100 : il sort aussitôt l'objet.
state.market.merchants[thorval.id].acquired=54;
const visitBefore=rules.visitOf(state,{renown});
assert.equal(visitBefore.affinity,98);
state.company.gold=100000;
const reaching=rules.buy(state,visitBefore.offers[0].id,{renown});
assert.equal(reaching.special,true,"+100 : l'objet rien que pour toi");
visit=rules.visitOf(state,{renown});
assert.equal(visit.affinity,100);
const gift=visit.special;
assert.ok(gift&&gift.item,"il a un objet de côté");
assert.ok(!SELLS.has(gift.item.itemType+"|"+gift.item.name),"jamais dans sa liste");
assert.ok([3,4].includes(gift.item.tier),"T3 ou T4");
assert.equal(gift.item.owner,null);
assert.equal(gift.price,Math.round(rules.sellPrice(gift.item,100)*0.5),"moitié de son prix normal");
assert.equal(rules.visitOf(state,{renown}).special.item,gift.item,"le même pendant tout le passage");
// L'exemple de la proposition : un arc T3 à 720 PO, un arc T4 à 1 500 PO avant la qualité De luxe (× 2,5 : 3 750 PO).
assert.equal(Math.round(rules.sellPrice(item("Arc",3),100)*0.5),720);
assert.equal(Math.round(rules.sellPrice(item("Arc",4),100)*0.5),3750);
// L'acheter : une seule fois ; il rejoint l'Intendance.
state.company.gold=gift.price-1;
assert.equal(rules.buySpecial(state,{renown}).reason,"Pas assez d'or.");
state.company.gold=100000;
const took=rules.buySpecial(state,{renown});
assert.equal(took.ok,true);
assert.equal(took.price,gift.price);
assert.equal(state.company.gold,100000-gift.price);
assert.equal(state.company.stock.at(-1),gift.item);
assert.equal(rules.visitOf(state,{renown}).special,null);
assert.equal(rules.buySpecial(state,{renown}).ok,false,"une fois par passage");
// Revendu à Thorval, il ne rapporte rien de plus : hors de sa liste.
assert.equal(rules.visitOf(state,{renown}).buyback(gift.item).specialty,false);
// Au passage suivant, toujours à +100 : un autre objet, dès son arrivée.
state.day+=1;
scripted.push(0);
rules.morning(state,{renown});
assert.equal(rules.affinityWith(state,merchant),100,"une affaire a eu lieu : pas de perte");
assert.ok(rules.visitOf(state,{renown}).special,"dès son arrivée");
// Sur de nombreux passages : familles variées, jamais sa liste, T3 et T4 selon l'étal (76 % / 24 % pour une compagnie neuve).
const specialProbe={day:1,company:{roster:[captain],captainId:captain.id,stock:[]},market:{visit:null,merchants:{[thorval.id]:{acquired:56}}}};
const giftTiers={3:0,4:0},families=new Set();
for(let i=0;i<600;i++){
  specialProbe.day+=1;
  scripted.push(0);
  rules.morning(specialProbe,{renown});
  const g=specialProbe.market.visit.special.item;
  assert.ok(!SELLS.has(g.itemType+"|"+g.name));
  giftTiers[g.tier]+=1;
  families.add(g.itemType);
  specialProbe.market.visit.traded=true;
}
assert.ok(Math.abs(giftTiers[3]/600-29/38)<0.06,"T3 : "+giftTiers[3]/600);
assert.equal(families.size,10,"les dix familles d'équipement : "+[...families].join(", "));
assert.ok(!families.has("potion"));
state.market.merchants[thorval.id].acquired=0;

// Campagne : le tirage a lieu chaque matin ; la sauvegarde garde la visite, l'étal et l'affinité acquise.
state.day+=1;
scripted.push(0);
const [report]=campaign.advanceTime(state,1);
assert.equal(report.merchant.arrived.id,"thorval-poudredefeu");
assert.equal(rules.visitOf(state,{renown}).offers.length,10);
const restored=restoreCampaign(serializeCampaign(state));
assert.equal(restored.ok,true);
assert.deepEqual(restored.state.market,JSON.parse(JSON.stringify(state.market)));
// Les tiers tirés suivent la renommée.
const counts={2:0,3:0,4:0};
const probe={day:1,company:{roster:[captain],captainId:captain.id,stock:[]}};
for(let i=0;i<400;i++){
  probe.day+=1;
  scripted.push(0);
  rules.morning(probe,{renown});
  for(const a of probe.market.visit.stock) counts[a.item.tier]+=1;
}
const total=counts[2]+counts[3]+counts[4];
assert.equal(total,4000);
for(const [tier,expected] of [[2,0.62],[3,0.29],[4,0.09]]) assert.ok(Math.abs(counts[tier]/total-expected)<0.03,"T"+tier+" : "+counts[tier]/total);
// Une ancienne sauvegarde (marchand test disparu, ou pas de marché) : rien ne casse.
state.market={visit:{merchantId:"marchand-test",day:state.day}};
assert.equal(rules.visitOf(state,{renown}),null);
scripted.push(0.999);
assert.equal(rules.morning(state,{renown}).left,null);
assert.deepEqual(state.market,{visit:null,merchants:{}});
delete state.market;
scripted.push(0.999);
assert.equal(rules.morning(state,{renown}).arrived,null);
assert.deepEqual(state.market,{visit:null,merchants:{}});

// Durgan Battefer (Idan, 2026-10-31) : nain des montagnes (l'alignement principal des nains), plates, casques de
// constitution, amulettes de volonté, bagues du courage, marteaux et haches de guerre.
const durgan=reference.merchants.rows.find(m=>m.id==="durgan-battefer");
assert.equal(durgan.nom,"Durgan Battefer");
assert.equal(durgan.culture,"Nains des montagnes");
assert.equal(durgan.alignement,reference.peoples.rows.find(p=>p.nom==="Nain").alignement_principal);
assert.ok(!(durgan.culture in reference.alignmentGeneration.culture_overrides));
const DURGAN=[["armor","Armure de plates"],["helmet","Casque de constitution"],["amulet","Amulette de volonté"],["ring","Bague du courage"],["weapon","Marteau de guerre"],["weapon","Hache de guerre"]];
assert.deepEqual(durgan.vend.map(v=>[v.type,v.objet]),DURGAN);
for(const [type,name] of DURGAN) for(const tier of [2,3,4]){
  const it=generator.createItemByName(type,name,tier);
  assert.equal(it?.name,name,name);
  assert.ok(values.value(it)>0,name+" T"+tier+" a une valeur");
}
assert.match(durgan.repliques.rien_que_pour_toi[0],/\{objet\}[\s\S]*\{prix\}/);
// Tous les marchands (Idan, 2026-10-31) : leur alignement est celui de leur culture (ou, à défaut, de leur peuple),
// chaque objet de leur liste existe en T2 à T4 et a une valeur, chacun a sa réplique « rien que pour toi ».
const merchantRows=reference.merchants.rows;
// 32 marchands dont 16 marchandes (Idan, 2026-10-31) : un par culture.
assert.equal(merchantRows.length,32);
assert.equal(merchantRows.filter(m=>m.sexe==="Femme").length,16);
assert.deepEqual(new Set(merchantRows.map(m=>m.culture)),new Set(reference.cultures.rows.map(c=>c.nom)),"une culture chacun");
assert.equal(new Set(merchantRows.map(m=>m.id)).size,32);
for(const id of ["thorval-poudredefeu","durgan-battefer","orvald-sans-collier","jiraya-senin","ysolwen-chanteseve"]) assert.ok(merchantRows.some(m=>m.id===id),id);
const defaultAlignment=m=>reference.alignmentGeneration.culture_overrides[m.culture]||reference.peoples.rows.find(p=>p.nom===m.peuple).alignement_principal;
for(const m of merchantRows){
  assert.ok(reference.cultures.rows.some(c=>c.nom===m.culture&&String(c.peuples).includes(m.peuple)),m.nom+" : culture de son peuple");
  assert.equal(m.alignement,defaultAlignment(m),m.nom+" : alignement par défaut de sa culture");
  // Les montures (Idan, 2026-11-07 : Amar le destrier, Ysolwen la licorne) viennent en plus.
  const gear=m.vend.filter(v=>v.type!=="mount");
  assert.ok(gear.length>=6&&gear.length<=7,m.nom+" : autant d'objets que les autres");
  for(const v of m.vend){
    // Une ligne de manuels : tous les sorts de l'école de sa culture (Idan, 2026-10-31).
    if(v.type==="manual"){
      assert.equal(v.ecole,reference.cultures.rows.find(c=>c.nom===m.culture).ecole_magie,m.nom+" : manuels de l'école de sa culture");
      const school=reference.spells.rows.filter(s=>s.ecole===v.ecole);
      assert.ok(school.length>0,v.ecole);
      for(const spell of school) assert.ok(values.value(generator.createItemByName("manual",spell.nom))>0,spell.nom);
      continue;
    }
    for(const tier of [2,3,4]){
      const it=generator.createItemByName(v.type,v.objet,tier);
      assert.equal(it?.name,v.objet,m.nom+" : "+v.objet);
      assert.ok(values.value(it)>0,v.objet+" T"+tier+" a une valeur");
    }
  }
  assert.match(m.repliques.rien_que_pour_toi[0],/\{objet\}[\s\S]*\{prix\}/,m.nom);
}
assert.equal(merchantRows.find(m=>m.id==="ysolwen-chanteseve").sexe,"Femme");
// Chacun passe à son tour (même poids), avec son étal à lui seul.
const both=createMerchantRules({reference,generator,affinity,random});
const twoProbe={day:1,company:{roster:[captain],captainId:captain.id,stock:[]}};
const seen={};
for(let i=0;i<2500;i++){
  twoProbe.day+=1;
  const m=both.morning(twoProbe,{renown:renownAt(2)});
  if(!m.arrived) continue;
  seen[m.arrived.id]=(seen[m.arrived.id]||0)+1;
  const sells=new Set(merchantRows.find(r=>r.id===m.arrived.id).vend.map(v=>v.type==="manual"?"manual|"+v.ecole:v.type+"|"+v.objet));
  for(const a of twoProbe.market.visit.stock) assert.ok(sells.has(a.item.itemType==="manual"?"manual|"+a.item.school:a.item.itemType+"|"+a.item.name),m.arrived.id+" : "+a.item.name);
}
const passes=Object.values(seen).reduce((a,b)=>a+b,0);
for(const m of merchantRows) assert.ok(Math.abs((seen[m.id]||0)/passes-1/merchantRows.length)<0.02,"autant de passages : "+JSON.stringify(seen));
// Qui vend quoi (Idan, 2026-10-31) : chaque objet et chaque école de manuels chez au moins deux marchands.
const {coverage,targetOf}=require("../scripts/merchant-coverage.js");
const cover=coverage();
assert.deepEqual(cover.unknown,[]);
// Les montures (Idan, 2026-11-07) : un marchand chacune (Amar le destrier, Ysolwen la licorne, Fizzi le loup ; Aymeric le
// pégase, Idan, 2026-11-09 : « Il est vendu par le marchand humain des cités libres » ; Bruga le cerbère, « vendu par les ogres
// des montagnes » ; Kippa le molosse, « vendu par les gnomes des villes »).
assert.deepEqual(cover.items.filter(i=>i.sellers.length<targetOf(i)).map(i=>i.name),[],"chaque objet chez au moins deux marchands");
assert.deepEqual(cover.items.filter(i=>i.type==="mount").map(i=>[i.name,i.sellers]),[["Cerbère",["Bruga"]],["Destrier",["Amar"]],["Licorne",["Ysolwen"]],["Loup",["Fizzi"]],["Molosse",["Kippa"]],["Pégase",["Aymeric"]]]);
// Ses plates sont « ses armes » à la revente ; il hait les nains du chaos et en est haï (doc 02).
const plates=generator.createItemByName("armor","Armure de plates",3);
twoProbe.market.visit={merchantId:"durgan-battefer",day:twoProbe.day,stock:[],sold:{},traded:false};
assert.equal(both.visitOf(twoProbe,{renown}).buyback(plates).specialty,true);
assert.equal(both.visitOf(twoProbe,{renown}).buyback(item("Pistolet",3)).specialty,false);
assert.equal(affinity.affinity({people:"Nain",culture:"Nains du chaos",alignment:"Chaotique neutre"},{people:"Nain",culture:"Nains des montagnes",alignment:"Neutre bon"}).components.cultureRule,"cousins");

// Sans nom, un objet à bonus est tiré au hasard dans sa famille (accessoires sur les morts, Idan, 2026-11-08), au tier
// demandé et à sa qualité, sans propriétaire ; une arme ou une armure garde son nom obligatoire.
for(const type of ["helmet","amulet","cape","gloves","belt","pants","boots","ring"]){
  const names=new Set();
  for(let i=0;i<30;i++){
    const it=generator.createItemByName(type,null,3);
    assert.ok(it&&it.itemType===type&&it.tier===3&&it.owner===null&&it.qualityCode,type);
    names.add(it.name);
  }
  assert.ok(names.size>1,type+" : tiré au hasard");
}
assert.equal(generator.createItemByName("weapon",null,2),null);

console.log("Marchands : Thorval Poudredefeu (4 armes à feu, 10 articles T2–T4), affinité, achat, rachat, intendant, rien que pour toi ; 32 marchands, chaque objet chez deux d'entre eux — OK");
