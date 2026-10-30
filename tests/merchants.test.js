"use strict";

// Marchands, étape 1 (doc 18 ; Idan, 2026-10-30) : passage du jour (30 % + 4 % par étoile de renommée), marchand fixe
// de la partie, affinité avec le capitaine, stock de spécialités, prix, achat, départ le lendemain.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createMerchantRules}=require("../game-core/merchants.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createAffinityRules}=require("../game-core/affinity.js");
const {createNameRules}=require("../game-core/names.js");
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
const names=createNameRules({reference,random});
const values=createItemValues({reference});
const rules=createMerchantRules({reference,generator,affinity,names,random:scriptedRandom});

// Données : un marchand par culture (liste provisoire), chaque culture connue.
const cultures=new Set(reference.cultures.rows.map(c=>c.nom));
assert.equal(reference.merchants.rows.length,cultures.size);
for(const row of reference.merchants.rows){
  assert.ok(cultures.has(row.culture),row.culture);
  assert.ok(row.poids>0);
}
assert.equal(new Set(reference.merchants.rows.map(r=>r.id)).size,reference.merchants.rows.length,"identifiants uniques");

// Chance de passage : 30 % + 4 % par niveau d'étoiles de la renommée.
const levels=[...reference.reputationStars.rows].sort((a,b)=>a.niveau-b.niveau);
for(const row of levels) assert.ok(Math.abs(rules.arrivalChance(row.renommee_min)-(0.3+0.04*row.niveau))<1e-9,"niveau "+row.niveau);
assert.ok(Math.abs(rules.arrivalChance(500)-(0.3+0.04*levels.filter(r=>500>=r.renommee_min).length))<1e-9);
assert.ok(rules.arrivalChance(1e9)<=1);

// Une compagnie : capitaine Nain du chaos, pour comparer les spécialités et l'affinité.
const captain=generator.createCaptain({id:1,people:"Nain",culture:"Nains du chaos"});
const squad=Array.from({length:4},(_,i)=>generator.createMercenary({id:i+2,captain}));
const campaign=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,affinity,names,merchants:rules});
const state=campaign.createCampaign({captain,squad});
const renown=campaign.companyRenown(state).total;

// Pas de marchand : le tirage dépasse la chance.
scripted.push(0.999);
let morning=rules.morning(state,{renown});
assert.equal(morning.arrived,null);
assert.equal(rules.visitOf(state),null);
assert.ok(Math.abs(morning.chance-rules.arrivalChance(renown))<1e-12);

// Un marchand passe : le tirage (0) est sous la chance, le premier de la liste (poids égaux) vient.
scripted.push(0,0);
morning=rules.morning(state,{renown});
const first=reference.merchants.rows[0];
assert.equal(morning.arrived.id,first.id);
const merchant=morning.arrived;
assert.equal(merchant.culture,first.culture);
assert.equal(merchant.people,reference.cultures.rows.find(c=>c.nom===first.culture).peuples);
assert.ok(merchant.alignment,"alignement principal de la culture");
assert.ok(merchant.name&&!merchant.name.startsWith("Marchand "),"nom tiré dans les noms de la culture : "+merchant.name);
let visit=rules.visitOf(state);
assert.equal(visit.merchant,merchant);
assert.ok(visit.stock.length>=7&&visit.stock.length<=12,"6 + 1D6 objets : "+visit.stock.length);
assert.ok(visit.stock.every(({item})=>item.owner===null&&item.id));

// Affinité : la même que pour un mercenaire de ce peuple, de cette culture et de cet alignement.
const expected=affinity.affinity(state.company.roster[0],merchant).total;
assert.equal(visit.affinity,expected);
// Prix : valeur × 1,5 × (1 − 0,2 × affinité / 100).
for(const {item,price} of visit.stock){
  const value=values.value(item);
  assert.equal(price,value===null?null:Math.max(1,Math.round(value*1.5*(1-0.2*expected/100))),item.name);
}
const sample=visit.stock.find(x=>x.price!==null).item,base=values.value(sample);
assert.equal(rules.sellPrice(sample,0),Math.round(base*1.5));
assert.equal(rules.sellPrice(sample,50),Math.max(1,Math.round(base*1.5*0.9)),"+50 : −10 %");
assert.equal(rules.sellPrice(sample,-50),Math.max(1,Math.round(base*1.5*1.1)),"−50 : +10 %");
assert.ok(rules.sellPrice(sample,100)<rules.sellPrice(sample,-100));

// Achat : pas assez d'or, puis achat ; l'objet rejoint l'Intendance.
const target=visit.stock.find(x=>x.price!==null);
state.company.gold=target.price-1;
let bought=rules.buy(state,target.item.id);
assert.equal(bought.ok,false);
assert.equal(state.company.gold,target.price-1,"rien n'est payé");
state.company.gold=target.price+100;
const stockBefore=state.company.stock.length;
bought=rules.buy(state,target.item.id);
assert.equal(bought.ok,true);
assert.equal(bought.price,target.price);
assert.equal(state.company.gold,100);
assert.equal(state.company.stock.length,stockBefore+1);
assert.equal(state.company.stock.at(-1).id,target.item.id);
assert.equal(state.company.stock.at(-1).owner,null);
assert.ok(!rules.visitOf(state).stock.some(x=>x.item.id===target.item.id),"plus en vente");
assert.equal(rules.buy(state,target.item.id).ok,false,"déjà vendu");

// Le lendemain : il repart ; s'il revient plus tard, c'est le même marchand (même nom).
state.day+=1;
scripted.push(0.999);
morning=rules.morning(state,{renown});
assert.equal(morning.left,merchant);
assert.equal(morning.arrived,null);
assert.equal(rules.visitOf(state),null);
assert.equal(rules.buy(state,"x").ok,false);
state.day+=1;
scripted.push(0,0);
morning=rules.morning(state,{renown});
assert.equal(morning.arrived.name,merchant.name,"le même marchand toute la partie");
assert.equal(Object.keys(state.market.merchants).length,1);

// Spécialités culturelles : les armes du peuple et de la culture du marchand (matrice de génération).
function weaponShares(culture,people,count=3000){
  const stock=generator.createMerchantStock({id:"m",people,culture,reputation:0},{count,weaponShare:1});
  const tally={};
  for(const item of stock) tally[item.name]=(tally[item.name]||0)+1;
  return name=>(tally[name]||0)/stock.length;
}
const chaos=weaponShares("Nains du chaos","Nain"),sylvains=weaponShares("Elfes sylvains","Elfe");
assert.ok(chaos("Arquebuse")>2*sylvains("Arquebuse"),"arquebuses chez le marchand nain du chaos");
assert.ok(sylvains("Arc")>2*chaos("Arc"),"arcs chez le marchand elfe sylvain");
// Deux tiers d'armes, le reste en armures, objets à bonus et potions.
const mixed=generator.createMerchantStock({id:"m",people:"Nain",culture:"Nains du chaos",reputation:0},{count:3000,weaponShare:2/3});
const weaponShare=mixed.filter(i=>i.itemType==="weapon").length/mixed.length;
assert.ok(weaponShare>0.62&&weaponShare<0.71,"part des armes : "+weaponShare);
for(const kind of ["armor","boots","ring","potion"]) assert.ok(mixed.some(i=>i.itemType===kind),kind);
// Tier selon la renommée ÷ 4 : une compagnie célèbre voit plus de T3.
const t3=reputation=>{
  const items=generator.createMerchantStock({id:"m",people:"Humain",culture:"Cités libres",reputation},{count:2000,weaponShare:1});
  return items.filter(i=>i.tier===3).length/items.length;
};
assert.ok(t3(2000/4)>t3(0)+0.15);

// Campagne : le marchand passe (ou non) chaque matin ; la sauvegarde garde le marché.
const [report]=campaign.advanceTime(state,1);
assert.ok(report.merchant&&typeof report.merchant.chance==="number");
assert.equal(report.merchant.left?.id,merchant.id,"le marchand de la veille repart");
const restored=restoreCampaign(serializeCampaign(state));
assert.equal(restored.ok,true);
assert.deepEqual(restored.state.market,JSON.parse(JSON.stringify(state.market)));
// Une partie sans marché (ancienne sauvegarde) : il se crée au premier matin.
delete state.market;
scripted.push(0.999);
assert.equal(rules.morning(state,{renown}).arrived,null);
assert.deepEqual(state.market,{merchants:{},visit:null});

console.log("Marchands : passage du jour, marchand fixe, affinité, spécialités, prix, achat, départ — OK");
