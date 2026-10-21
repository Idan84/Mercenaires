"use strict";

// Textes de la fiche mercenaire (Idan, 2026-10-21) : data/reference/character-sheet-copy.json couvre
// toutes les origines, ascendances, caractéristiques et résistances des référentiels.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","reference",f),"utf8"));
const copy=read("character-sheet-copy.json");
const names=f=>read(f).rows.map(r=>r.nom).sort();

assert.deepEqual(copy.origins.map(r=>r.nom).sort(),names("social-origins.json"));
assert.ok(copy.origins.every(r=>r.homme&&r.femme));
assert.deepEqual(copy.ancestries.map(r=>r.nom).sort(),names("ancestries.json"));
assert.ok(copy.ancestries.every(r=>/^d/.test(r.famille)&&/^d’un/.test(r.parent)),"« famille de… », « enfant d’un… »");

// Onglet Caractéristiques : Physique, Mental, Résistances ; la magie va dans son onglet.
const characteristics=read("characteristics.json").rows;
const shown=copy.stats.map(r=>r.nom);
assert.equal(new Set(shown).size,shown.length);
assert.ok(copy.stats.every(r=>["physique","mental","resistance"].includes(r.groupe)&&r.usage));
const generated=characteristics.filter(r=>r.famille==="Caractéristique").map(r=>r.nom);
for(const n of generated){
  if(["Puissance magique","Réserve de mana"].includes(n)) assert.ok(!shown.includes(n),n+" va dans l'onglet Magie");
  else assert.ok(shown.includes(n),"caractéristique absente de la fiche : "+n);
}
for(const n of characteristics.filter(r=>r.famille==="Résistance").map(r=>r.nom)) assert.equal(copy.stats.find(r=>r.nom===n)?.groupe,"resistance",n);
assert.deepEqual(copy.stats.filter(r=>r.groupe==="physique").slice(0,2).map(r=>r.nom),["Points de vie","Initiative"]);
console.log("Fiche : textes d'origine, d'ascendance et des caractéristiques — OK");
