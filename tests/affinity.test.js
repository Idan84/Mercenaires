"use strict";
const assert=require("node:assert/strict");
const {affinity,ALIGNMENT_GRID,PEOPLES,PEOPLE_MATRIX}=require("../game-core/affinity.js");
assert.equal(ALIGNMENT_GRID.flat().length,9);
assert.equal(new Set(ALIGNMENT_GRID.flat()).size,9);
assert.equal(PEOPLES.length,10);
assert.equal(PEOPLE_MATRIX.length,10);
assert.ok(PEOPLE_MATRIX.every(row=>row.length===10));
const person=(people,alignment,culture="Culture A")=>({people,alignment,culture});
const human=person("Humain","Loyal bon");
const orc=person("Orc","Chaotique mauvais");
assert.equal(affinity(human,orc).components.people,1);
assert.equal(affinity(orc,human).components.people,-1);
assert.equal(affinity(human,human).components.distance,0);
assert.equal(affinity(human,orc).components.distance,4);
assert.equal(affinity(human,human).components.culture,2);
assert.equal(affinity(human,{...human,culture:"Culture B"}).components.culture,0);
assert.equal(affinity(person("Nain","Loyal bon"),person("Nain","Loyal bon")).total,100);
assert.equal(affinity(person("Gnome","Loyal bon","A"),person("Orc","Chaotique mauvais","B")).total,-100);
assert.equal(affinity(human,human,200).total,100);
assert.equal(affinity(human,human,-200).total,-100);
assert.equal(affinity(human,person("Inconnu","Neutre")).ok,false);
for(const a of ALIGNMENT_GRID.flat())for(const b of ALIGNMENT_GRID.flat()){
 const x=affinity(person("Humain",a),person("Elfe",b));
 assert.equal(x.ok,true);
 assert.ok(x.total>=-100&&x.total<=100);
}
console.log("Affinity: OK");
