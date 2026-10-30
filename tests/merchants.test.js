"use strict";

// Marchands, étape 1 (doc 18 ; Idan, 2026-10-30) : passage du jour (30 % + 4 % par étoile de renommée), un marchand
// test qui ne vend que des épées longues T1, prix (valeur × 1,5, affinité), achat, départ le lendemain.
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
const rules=createMerchantRules({reference,generator,affinity,random:scriptedRandom});

// Données : un seul marchand test, qui ne vend que des épées longues T1.
assert.deepEqual(reference.merchants.rows.map(m=>m.id),["marchand-test"]);
assert.deepEqual(reference.merchants.rows[0].stock,[{type:"weapon",objet:"Épée longue",tier:1}]);

// Un objet précis à un tier donné (générateur).
const sword=generator.createItemByName("weapon","Épée longue",1);
assert.equal(sword.name,"Épée longue");
assert.equal(sword.itemType,"weapon");
assert.equal(sword.tier,1);
assert.equal(sword.qualityCode,"worn","T1 = Usée");
assert.equal(sword.owner,null);
assert.equal(generator.createItemByName("weapon","Épée inconnue",1),null);
assert.equal(generator.createItemByName("armor","Cotte de mailles",3).tier,3);
assert.equal(generator.createItemByName("armor","Cotte de mailles",3).qualityCode,"luxury");

// Chance de passage : 30 % + 4 % par niveau d'étoiles de la renommée.
const levels=[...reference.reputationStars.rows].sort((a,b)=>a.niveau-b.niveau);
for(const row of levels) assert.ok(Math.abs(rules.arrivalChance(row.renommee_min)-(0.3+0.04*row.niveau))<1e-9,"niveau "+row.niveau);
assert.ok(rules.arrivalChance(1e9)<=1);

const captain=generator.createCaptain({id:1});
const squad=Array.from({length:4},(_,i)=>generator.createMercenary({id:i+2,captain}));
const campaign=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,affinity,merchants:rules});
const state=campaign.createCampaign({captain,squad});
const renown=campaign.companyRenown(state).total;

// Pas de marchand : le tirage dépasse la chance.
scripted.push(0.999);
let morning=rules.morning(state,{renown});
assert.equal(morning.arrived,null);
assert.equal(rules.visitOf(state),null);
assert.ok(Math.abs(morning.chance-rules.arrivalChance(renown))<1e-12);

// Le marchand test passe.
scripted.push(0,0);
morning=rules.morning(state,{renown});
assert.equal(morning.arrived.id,"marchand-test");
assert.equal(morning.arrived.name,"Marchand test");
let visit=rules.visitOf(state);
assert.equal(visit.offers.length,1);
assert.equal(visit.offers[0].item.name,"Épée longue");
assert.equal(visit.offers[0].item.tier,1);
// Sans peuple ni alignement, l'affinité est nulle : prix = valeur × 1,5.
assert.equal(visit.affinity,0);
const value=values.value(visit.offers[0].item);
assert.equal(value,72,"Épée longue T1 Usée : 120 × 1 × 0,6");
assert.equal(visit.offers[0].price,108);
// Prix et affinité : × (1 − 0,2 × Affinité / 100).
assert.equal(rules.sellPrice(visit.offers[0].item,0),108);
assert.equal(rules.sellPrice(visit.offers[0].item,50),Math.round(72*1.5*0.9));
assert.equal(rules.sellPrice(visit.offers[0].item,-50),Math.round(72*1.5*1.1));
// Un marchand qui a un peuple et un alignement : la même affinité qu'un mercenaire.
const someone={people:captain.people,culture:captain.culture,alignment:captain.alignment};
assert.equal(rules.affinityWith(state,someone),affinity.affinity(state.company.roster[0],someone).total);

// Achat : pas assez d'or, puis deux achats ; chaque épée rejoint l'Intendance, sans limite de quantité.
state.company.gold=107;
assert.equal(rules.buy(state,0).ok,false);
assert.equal(state.company.gold,107,"rien n'est payé");
state.company.gold=1000;
const stockBefore=state.company.stock.length;
const first=rules.buy(state,0),second=rules.buy(state,0);
assert.equal(first.ok,true);
assert.equal(second.ok,true);
assert.equal(first.price,108);
assert.equal(state.company.gold,1000-216);
assert.equal(state.company.stock.length,stockBefore+2);
assert.notEqual(first.item.id,second.item.id,"deux épées distinctes");
assert.ok(state.company.stock.slice(-2).every(i=>i.name==="Épée longue"&&i.tier===1&&i.owner===null));
assert.equal(rules.buy(state,5).ok,false,"pas de ligne 5");

// Le lendemain : il repart.
state.day+=1;
scripted.push(0.999);
morning=rules.morning(state,{renown});
assert.equal(morning.left.id,"marchand-test");
assert.equal(morning.arrived,null);
assert.equal(rules.visitOf(state),null);
assert.equal(rules.buy(state,0).ok,false);

// Campagne : le tirage a lieu chaque matin ; la sauvegarde garde la visite.
scripted.push(0,0);
const [report]=campaign.advanceTime(state,1);
assert.equal(report.merchant.arrived.id,"marchand-test");
assert.equal(rules.visitOf(state).merchant.id,"marchand-test");
const restored=restoreCampaign(serializeCampaign(state));
assert.equal(restored.ok,true);
assert.deepEqual(restored.state.market,{visit:{merchantId:"marchand-test",day:state.day}});
// Une partie sans marché (ancienne sauvegarde) : il se crée au premier matin.
delete state.market;
scripted.push(0.999);
assert.equal(rules.morning(state,{renown}).arrived,null);
assert.deepEqual(state.market,{visit:null});

console.log("Marchands : passage du jour, marchand test (épées longues T1), prix, achat, départ — OK");
