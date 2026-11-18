"use strict";

const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"prototype-web/design/graph/index.html"),"utf8");
const start=html.indexOf("const N=[");
const end=html.indexOf("const map=new Map");
assert.ok(start>=0&&end>start,"Catalogue des influences introuvable");
const fragment=html.slice(start,end);
const context=vm.createContext({});
vm.runInContext(fragment+"\nglobalThis.catalogue={N,E};",context,{timeout:2000});
const {N,E}=context.catalogue;
assert.ok(N.length>=50,"Le graphe doit couvrir les grands systèmes");
assert.ok(E.length>=100,"Inventaire de dépendances incomplet");
const ids=new Set(N.map(x=>x[0]));
assert.equal(ids.size,N.length,"Identifiants de nœuds en double");
for(const e of E){
  assert.ok(ids.has(e.a),"Nœud source absent : "+e.a);
  assert.ok(ids.has(e.b),"Nœud cible absent : "+e.b);
  assert.ok(e.a!==e.b,"Boucle sur elle-même : "+e.a);
  assert.ok([1,2,3].includes(e.w),"Intensité invalide : "+e.a+" -> "+e.b);
  assert.ok(["implemented","planned","idea"].includes(e.s),"Statut invalide");
  assert.ok(e.source,"Source obligatoire : "+e.a+" -> "+e.b);
}
assert.ok(E.some(e=>e.a==="chance"&&e.b==="critique"&&e.s==="implemented"));
assert.ok(E.some(e=>e.a==="rep"&&e.b==="renommee"&&e.s==="implemented"));
// Les six parts de la renommée (doc 09 §2) : réputation (capitaine 1er, puis les autres), héritage, missions, dortoir,
// médecin ; et la renommée donne le niveau des missions.
for(const from of ["heritage","missions","camp","artisanat"]) assert.ok(E.some(e=>e.a===from&&e.b==="renommee"&&e.s==="implemented"),from+" → renommée");
assert.ok(/Capitaine toujours 1er/.test(E.find(e=>e.a==="rep"&&e.b==="renommee").detail));
assert.ok(E.some(e=>e.a==="renommee"&&e.b==="missions"&&e.s==="implemented"),"le niveau des missions suit la renommée");
// Recrutement (Idan, 2026-10-20) : l'affinité pèse sur la négociation et le salaire, la renommée sur les recrues.
assert.ok(E.some(e=>e.a==="affinite"&&e.b==="negociation"&&e.s==="implemented"));
assert.ok(E.some(e=>e.a==="affinite"&&e.b==="salaire"&&e.s==="implemented"));
assert.ok(E.some(e=>e.a==="renommee"&&e.b==="recrues"&&e.s==="implemented"));
assert.ok(E.some(e=>e.a==="renommee"&&e.b==="marchands"&&e.s==="implemented"),"marchands : étoiles de renommée (merchants.js)");
// Bois et pierre (Idan, 2026-11-18) : Cabane, Guilde et corvées ; la Force fait le rendement des ouvriers.
for(const r of ["bois","pierre"]) assert.ok(E.some(e=>e.a==="corvees"&&e.b===r&&e.s==="implemented")&&E.some(e=>e.a==="camp"&&e.b===r),r);
assert.ok(E.some(e=>e.a==="force"&&e.b==="corvees"&&e.s==="implemented"),"la Force fait le rendement des ouvriers");
assert.ok(!E.some(e=>e.a==="chance"&&e.b==="toucher"),"Chance ne modifie pas directement Toucher V1");
assert.ok(!E.some(e=>e.a==="kill"&&e.b==="heritage"),"Tuer un ennemi n'est pas l'héritage d'un mercenaire mort");
console.log("Design Graph catalogue: "+N.length+" noeuds / "+E.length+" liens valides.");
