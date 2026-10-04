"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {traitsFor}=require("../game-core/creation.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const reference={generationMatrix:read("generation-matrix.json")};
const value=(list,name)=>list.find(t=>t.name===name)?.value;

// Forces et faiblesses : les modificateurs de la matrice, rien d'autre.
const ogre=traitsFor(reference,"Ogre");
assert.equal(value(ogre.forces,"Force"),3);
assert.equal(value(ogre.forces,"Endurance"),3);
assert.equal(value(ogre.faiblesses,"Intelligence"),-2);
assert.ok(ogre.forces.every(t=>t.value>0)&&ogre.faiblesses.every(t=>t.value<0));
assert.ok(Math.abs(ogre.forces[0].value)>=Math.abs(ogre.forces.at(-1).value),"les plus marquées d'abord");

// Même correspondance nom → colonne que le générateur : accents, apostrophes, barres obliques.
assert.ok(traitsFor(reference,"Sang d’elfe").forces.length>0,"ascendance");
assert.ok(traitsFor(reference,"Soldat / Guerrier / Combattant").forces.length>0,"origine sociale");
assert.ok(traitsFor(reference,"Orcs noirs").forces.length+traitsFor(reference,"Orcs noirs").faiblesses.length>0,"culture");
assert.deepEqual(traitsFor(reference,"Chaotique bon"),{forces:[],faiblesses:[]},"pas de colonne : rien");
assert.deepEqual(traitsFor(reference,""),{forces:[],faiblesses:[]});

// Chaque peuple, culture, origine et ascendance du référentiel a au moins un trait.
for(const [file,label] of [["peoples.json","peuple"],["cultures.json","culture"],["social-origins.json","origine"],["ancestries.json","ascendance"]]){
  for(const row of read(file).rows){
    const t=traitsFor(reference,row.nom);
    assert.ok(t.forces.length+t.faiblesses.length>0,`${label} sans trait : ${row.nom}`);
  }
}

console.log(JSON.stringify({ok:true},null,2));
