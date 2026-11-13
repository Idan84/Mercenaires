"use strict";

// Choix du capitaine dans l'assistant de création (Idan, 2026-11-12) : arme favorite (+3D6 arme, +2D6 famille), tenue
// (ports d'armure), esprit (+2D6 école ; « Franchement aucune ! » : points d'écoles répartis dans les caractéristiques
// non magiques, sorts perdus), caractère (+2D6). Sans choix, le capitaine est tiré exactement comme avant.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));

const captain=(seed,captainChoices,extra={})=>{
  let s=seed;
  const random=()=>((s=(s*16807)%2147483647)/2147483647);
  const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
  return generator.createCaptain({id:1,name:"Idan Wizen",firstName:"Idan",familyName:"Wizen",forcedPeople:"Elfe",forcedCulture:"Elfes sylvains",...extra,...(captainChoices?{captainChoices}:{})});
};
const SCHOOLS=reference.skills.rows.filter(r=>r.domaine==="Magie"&&r.niveau==="Catégorie").map(r=>r.nom);
const PORTS=["légère","intermédiaire","lourde"].map(t=>"Port d’armure "+t);

for(let seed=1;seed<=40;seed++){
  const base=captain(seed,null);
  // Sans choix : rien ne change (mêmes tirages, même capitaine).
  assert.deepEqual(captain(seed,{}).stats,base.stats);
  assert.equal(base.name,"Idan Wizen"); assert.equal(base.firstName,"Idan"); assert.equal(base.familyName,"Wizen");

  const picked=captain(seed,{weapon:"Hache de guerre",armorPorts:2,school:"Feu",stat:"Perception"});
  const weaponGain=picked.skills.martial["Hache de guerre"]-base.skills.martial["Hache de guerre"];
  const familyGain=picked.skills.martial.Haches-base.skills.martial.Haches;
  assert.ok(weaponGain>=3&&weaponGain<=18,"arme favorite : +3D6");
  assert.ok(familyGain>=2&&familyGain<=12,"famille : +2D6");
  const schoolGain=picked.skills.magic.Feu-base.skills.magic.Feu;
  assert.ok(schoolGain>=2&&schoolGain<=12,"école : +2D6");
  const statGain=picked.stats.Perception-base.stats.Perception;
  assert.ok(statGain>=2&&statGain<=12,"caractère : +2D6");
  assert.deepEqual(PORTS.map(p=>picked.skills.martial[p]),[true,true,false],"cuir : légère et intermédiaire");
  for(const name of Object.keys(base.stats)) if(name!=="Perception") assert.equal(picked.stats[name],base.stats[name]);
  assert.deepEqual(picked.spells,base.spells,"une affinité ne retire ni n'ajoute de sort");
  assert.equal(picked.generationTrace.captainChoices.weapon.roll,weaponGain);

  assert.deepEqual(PORTS.map(p=>captain(seed,{armorPorts:0}).skills.martial[p]),PORTS.map(p=>base.skills.martial[p]),"le vent : rien en plus");
  assert.deepEqual(PORTS.map(p=>captain(seed,{armorPorts:1}).skills.martial[p]),[true,false,false]);
  const tin=captain(seed,{armorPorts:3});
  assert.deepEqual(PORTS.map(p=>tin.skills.martial[p]),[true,true,true],"boîte de conserve : les trois ports");
  const armor=tin.items.find(i=>i.itemType==="armor"||/armure|gambison|cuir|maille|plates|vêtements/i.test(i.name));
  assert.ok(armor,"il part avec une armure");

  // « Franchement aucune ! »
  const none=captain(seed,{noMagic:true});
  for(const school of SCHOOLS) assert.equal(none.skills.magic[school],1,"écoles ramenées à « non pratiquée »");
  assert.deepEqual(none.spells,[],"il perd ses sorts");
  assert.notEqual(none.domain,"magic");
  for(const stat of ["Puissance magique","Réserve de mana"]) assert.equal(none.stats[stat],base.stats[stat],"les caractéristiques magiques ne bougent pas");
  const points=SCHOOLS.reduce((t,s)=>t+Math.max(0,base.skills.magic[s]-1),0);
  const statsGain=Object.keys(base.stats).reduce((t,s)=>t+none.stats[s]-base.stats[s],0);
  assert.equal(statsGain,Math.round(points),"tous les points d'écoles passent dans les caractéristiques");
  assert.equal(none.generationTrace.captainChoices.noMagic.points,Math.round(points));
}

// Une arme inconnue ou une école inconnue n'ajoute rien ; aucune exception.
const odd=captain(3,{weapon:"Bouclier en carton",school:"Cuisine",stat:"Beauté"});
assert.deepEqual(odd.stats,captain(3,null).stats);

console.log("captain choices ok");
