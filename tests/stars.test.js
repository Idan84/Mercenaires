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
assert.deepEqual(stars.personal(0),{level:1,stars:1,metal:"Bronze",metalKey:"bronze",label:"1 étoile de bronze",phrase:"Même sa mère ne sait pas qui c’est.",
  variants:table.rows[0].variantes,max:false,value:0,nextAt:93});
// Une phrase par niveau pour la fiche (Idan, 2026-10-21), toutes différentes ; trois variantes de même sens par
// niveau (Idan, 2026-10-24), elles aussi toutes différentes.
assert.equal(new Set(table.rows.map(r=>r.phrase)).size,15);
for(const row of table.rows) assert.equal(row.variantes.length,3,"3 variantes au niveau "+row.niveau);
assert.equal(new Set(table.rows.flatMap(r=>[r.phrase,...r.variantes])).size,60);
assert.equal(stars.personal(50000).phrase,"Les enfants apprennent son nom avant le leur.");
// Seuils × 1,5 par étoile depuis le 2026-11-08 (Idan : « × 1,5 par étoile ») : 93, 140, 209, 314, 471… 18 100, chacun
// 1,5 fois le précédent (arrondi). Auparavant (2026-11-06) : 93, 113, 137, 160, puis ×1,25 (200… 1 600).
assert.deepEqual(table.rows.map(r=>r.reputation_min),[0,93,140,209,314,471,706,1059,1589,2383,3575,5363,8044,12066,18100]);
for(let i=2;i<15;i++) assert.equal(table.rows[i].reputation_min,Math.round(93*1.5**(i-1)),"× 1,5 au niveau "+(i+1));
assert.equal(stars.personal(92).level,1);
assert.equal(stars.personal(93).level,2,"le seuil est atteint dès qu'on l'égale");
assert.equal(stars.personal(123).label,"2 étoiles de bronze","recrue médiane");
assert.equal(stars.personal(140).label,"3 étoiles de bronze");
assert.equal(stars.personal(471).label,"1 étoile d'argent");
assert.equal(stars.personal(3574).label,"5 étoiles d'argent");
assert.equal(stars.personal(3575).label,"1 étoile d'or");
const legend=stars.personal(50000);
assert.equal(legend.label,"5 étoiles d'or");
assert.equal(legend.max,true);
assert.equal(legend.nextAt,null);
assert.equal(stars.personal(-30).level,1,"jamais sous 1 étoile");

// Renommée de compagnie : même échelle × 4.
assert.equal(stars.company(510).label,"2 étoiles de bronze","compagnie de départ médiane");
assert.equal(stars.company(1884).label,"1 étoile d'argent");
assert.equal(stars.company(72400).label,"5 étoiles d'or");
assert.equal(stars.company(72399).label,"4 étoiles d'or");

// Sans table : rien à afficher.
assert.equal(createStarRules({}).personal(100),null);

console.log("Stars: OK");
