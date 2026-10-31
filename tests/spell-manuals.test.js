"use strict";

// Manuels de sorts (Idan, 2026-10-31) : un manuel par sort, valeur selon le palier, vendus par école chez les marchands,
// lus à l'Intendance pour apprendre le sort au niveau 1 (manuel consommé, pas de prérequis, pas de doublon, pas en
// mission).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createManualRules}=require("../game-core/spell-manuals.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createItemValues}=require("../game-core/item-value.js");
const {createMerchantRules}=require("../game-core/merchants.js");
const {createAffinityRules}=require("../game-core/affinity.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"))]));

let seed=11;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const values=createItemValues({reference});
const manuals=createManualRules({reference});
const spells=reference.spells.rows;

// Un manuel par sort, sans tier ni qualité ; sa catégorie est son école ; sa valeur suit le palier.
const PRICES={Novice:300,Adepte:600,Expert:1200};
assert.deepEqual(manuals.schools,[...new Set(spells.map(s=>s.ecole))]);
for(const spell of spells){
  const byName=generator.createItemByName("manual",spell.nom,3),byCode=generator.createItemByName("manual",spell.code);
  assert.equal(byName.name,"Manuel : "+spell.nom);
  assert.equal(byCode.spellCode,spell.code);
  assert.equal(byName.itemType,"manual");
  assert.equal(byName.category,spell.ecole);
  assert.equal(byName.tier,undefined,"sans tier");
  assert.equal(byName.owner,null);
  assert.equal(values.value(byName),PRICES[spell.palier],spell.nom+" ("+spell.palier+")");
  assert.equal(manuals.spellOf(byName),spell);
}
assert.equal(generator.createItemByName("manual","Sort inconnu"),null);

// Apprendre : le sort au niveau 1, le manuel consommé.
const captain=generator.createCaptain({id:1});
const merc=generator.createMercenary({id:2,captain});
merc.spells=[];
const fireball=spells.find(s=>s.nom==="Boule de feu");
const book=generator.createItemByName("manual",fireball.nom);
const state={day:4,company:{roster:[captain,merc],captainId:1,stock:[book]},expeditions:[]};
const learned=manuals.learn(state,2,book.id);
assert.equal(learned.ok,true);
assert.deepEqual(merc.spells,[{code:fireball.code,name:"Boule de feu",school:"Feu",mastery:1}],"niveau 1, comme un sort de création");
assert.deepEqual(state.company.stock,[],"le manuel est consommé");
assert.equal(manuals.learn(state,2,book.id).reason,"Manuel introuvable à l’Intendance.");
// Déjà connu : refusé, le manuel reste.
const again=generator.createItemByName("manual",fireball.nom);
state.company.stock.push(again);
assert.equal(manuals.learn(state,2,again.id).reason,"Il connaît déjà ce sort.");
assert.equal(state.company.stock.length,1);
// Pas de prérequis d'école : le capitaine sans magie l'apprend aussi.
captain.spells=[];
assert.equal(manuals.learn(state,1,again.id).ok,true);
// En mission : non ; mission programmée (encore au camp) : oui.
const heal=generator.createItemByName("manual","Soin rapide");
state.company.stock.push(heal);
state.expeditions=[{memberIds:[2],status:"travel"}];
assert.equal(manuals.canLearn(state,merc,heal).reason,"Il est en mission.");
state.expeditions=[{memberIds:[2],status:"scheduled"}];
assert.equal(manuals.canLearn(state,merc,heal).ok,true);
assert.equal(manuals.canLearn(state,merc,generator.createItemByName("weapon","Épée longue",1)).ok,false,"une épée n'est pas un manuel");

// Chez les marchands : une ligne « manuels de l'école » ; chaque article est un manuel de cette école.
const shop={...reference,merchants:{rows:[{id:"test",nom:"Test",peuple:"Humain",culture:"Cités libres",alignement:"Neutre",poids:1,
  vend:[{type:"manual",ecole:"Feu"}],repliques:{}}]}};
const rules=createMerchantRules({reference:shop,generator,affinity:createAffinityRules({reference}),random:(()=>{ let first=true; return ()=>first?(first=false,0):random(); })()});
const shopState={day:1,company:{roster:[captain],captainId:1,stock:[],gold:100000}};
rules.morning(shopState,{renown:400});
const visit=rules.visitOf(shopState,{renown:400});
assert.equal(visit.offers.length,10);
for(const o of visit.offers){
  assert.equal(o.item.itemType,"manual");
  assert.equal(o.item.school,"Feu");
  assert.equal(o.price,rules.sellPrice(o.item,visit.affinity));
}
assert.equal(visit.buyback(generator.createItemByName("manual","Trait de feu")).specialty,true,"ses manuels");
assert.equal(visit.buyback(generator.createItemByName("manual","Soin rapide")).specialty,false,"une autre école");
const bought=rules.buy(shopState,visit.offers[0].id,{renown:400});
assert.equal(bought.ok,true);
assert.equal(shopState.company.stock.at(-1).itemType,"manual");

// L'interface : l'onglet « Manuels » de l'Intendance et « Apprendre à… ».
const qm=fs.readFileSync(path.join(ROOT,"prototype-web","quartermaster-ui.js"),"utf8");
const deal=fs.readFileSync(path.join(ROOT,"prototype-web","deal-ui.js"),"utf8");
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(qm,/\["manual","Manuels","book"\]/);
assert.match(deal,/Apprendre à…/);
assert.match(deal,/data-manual-learn/);
assert.match(html,/<script src="\/core\/spell-manuals\.js"><\/script>/);

console.log("Manuels de sorts : un par sort, valeur par palier, vente par école, apprentissage au niveau 1 — OK");
