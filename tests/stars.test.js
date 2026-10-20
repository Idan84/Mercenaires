"use strict";

// Étoiles de réputation (décision Idan du 2026-10-20) : 15 niveaux, bronze, argent, or.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createStarRules}=require("../game-core/stars.js");

const ROOT=path.resolve(__dirname,"..");
const table=JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference","reputation-stars.json"),"utf8"));
const stars=createStarRules({reference:{reputationStars:table}});

// La table : 15 niveaux, 5 par métal, seuils croissants, renommée = 4 × réputation.
assert.equal(table.rows.length,15);
assert.deepEqual(table.rows.map(r=>r.metal),[..."BBBBB"].map(()=>"Bronze").concat(Array(5).fill("Argent"),Array(5).fill("Or")));
assert.deepEqual(table.rows.map(r=>r.etoiles),[1,2,3,4,5,1,2,3,4,5,1,2,3,4,5]);
for(let i=1;i<15;i++){
  assert.ok(table.rows[i].reputation_min>table.rows[i-1].reputation_min,"seuils croissants");
  assert.equal(table.rows[i].renommee_min,4*table.rows[i].reputation_min);
}

// Réputation personnelle.
assert.deepEqual(stars.personal(0),{level:1,stars:1,metal:"Bronze",metalKey:"bronze",label:"1 étoile de bronze",max:false,value:0,nextAt:100});
assert.equal(stars.personal(99).level,1);
assert.equal(stars.personal(100).level,2,"le seuil est atteint dès qu'on l'égale");
assert.equal(stars.personal(137).label,"3 étoiles de bronze","recrue médiane");
assert.equal(stars.personal(250).label,"1 étoile d'argent");
assert.equal(stars.personal(799).label,"5 étoiles d'argent");
assert.equal(stars.personal(800).label,"1 étoile d'or");
const legend=stars.personal(5000);
assert.equal(legend.label,"5 étoiles d'or");
assert.equal(legend.max,true);
assert.equal(legend.nextAt,null);
assert.equal(stars.personal(-30).level,1,"jamais sous 1 étoile");

// Renommée de compagnie : même échelle × 4.
assert.equal(stars.company(510).label,"3 étoiles de bronze","compagnie de départ médiane");
assert.equal(stars.company(1000).label,"1 étoile d'argent");
assert.equal(stars.company(8000).label,"5 étoiles d'or");
assert.equal(stars.company(7999).label,"4 étoiles d'or");

// Sans table : rien à afficher.
assert.equal(createStarRules({}).personal(100),null);

console.log("Stars: OK");
