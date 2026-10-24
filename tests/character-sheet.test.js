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

// Onglet Caractéristiques : Physique, Mental, Résistances ; Puissance magique et Réserve de mana vont
// dans l'onglet Magie (groupe « magie »).
const characteristics=read("characteristics.json").rows;
const shown=copy.stats.map(r=>r.nom);
assert.equal(new Set(shown).size,shown.length);
assert.ok(copy.stats.every(r=>["physique","mental","resistance","magie"].includes(r.groupe)&&typeof r.usage==="string"));
// Infobulles pour le joueur (Idan, 2026-10-24) : rien sur la création, les formules ni ce qui n'est pas encore en jeu.
for(const r of copy.stats) assert.doesNotMatch(r.usage,/création|pas encore|calculé|effective/i,r.nom);
const generated=characteristics.filter(r=>r.famille==="Caractéristique").map(r=>r.nom);
for(const n of generated){
  const group=copy.stats.find(r=>r.nom===n)?.groupe;
  assert.ok(group,"caractéristique absente de la fiche : "+n);
  if(["Puissance magique","Réserve de mana"].includes(n)) assert.equal(group,"magie",n+" va dans l'onglet Magie");
  else assert.notEqual(group,"magie",n);
}
for(const n of characteristics.filter(r=>r.famille==="Résistance").map(r=>r.nom)) assert.equal(copy.stats.find(r=>r.nom===n)?.groupe,"resistance",n);
assert.deepEqual(copy.stats.filter(r=>r.groupe==="physique").slice(0,2).map(r=>r.nom),["Points de vie","Initiative"]);
// Régénération et Intimidation passent dans les caractéristiques (Idan, 2026-10-21).
assert.equal(copy.stats.find(r=>r.nom==="Régénération")?.groupe,"physique");
assert.equal(copy.stats.find(r=>r.nom==="Intimidation")?.groupe,"mental");

// Onglet Compétences : chaque catégorie martiale est dans une seule colonne ; les armures sont les aptitudes.
const skills=read("skills.json").rows;
const layout=copy.skills_layout;
const placed=[...layout.corps_a_corps,...layout.style,...layout.tir,...layout.discretion_et_pieges];
assert.equal(new Set(placed).size,placed.length,"une catégorie dans une seule colonne");
assert.deepEqual(placed.sort(),skills.filter(r=>r.domaine==="Martial"&&r.niveau==="Catégorie").map(r=>r.nom).sort());
assert.ok(layout.styles_de_combat.every(n=>layout.style.includes(n)));
assert.deepEqual(layout.discretion_et_pieges,["Discrétion","Pièges"],"pas des styles de combat (Idan, 2026-10-21)");
assert.ok(!layout.style.includes("Discrétion")&&!layout.style.includes("Pièges"));
for(const a of layout.armures) assert.equal(skills.find(r=>r.nom===a.nom)?.type_de_valeur,"Binaire",a.nom);
for(const n of layout.aptitudes) assert.equal(skills.find(r=>r.nom===n)?.type_de_valeur,"Binaire",n);
assert.ok(skills.some(r=>r.parent===layout.animal),"l'animal se déplie sur ses espèces");

// Onglet Magie : chaque école a deux opposées, réciproques, et les oppositions forment une seule boucle ;
// la roue peut donc poser chaque école en face de ses deux opposées.
const schools=skills.filter(r=>r.domaine==="Magie"&&r.niveau==="Catégorie");
const opposites=new Map(schools.map(r=>[r.nom,String(r.ecoles_opposees||"").split(",").map(x=>x.trim()).filter(Boolean)]));
for(const [name,list] of opposites){
  assert.equal(list.length,2,name);
  for(const o of list) assert.ok(opposites.get(o)?.includes(name),`${name} ↔ ${o}`);
}
const cycle=[schools[0].nom];
while(cycle.length<schools.length){
  const next=opposites.get(cycle.at(-1)).find(x=>!cycle.includes(x));
  assert.ok(next,"oppositions en une seule boucle");
  cycle.push(next);
}
assert.ok(opposites.get(cycle.at(-1)).includes(cycle[0]));
console.log("Fiche : textes d'origine, d'ascendance, des caractéristiques, des compétences et de la magie — OK");
