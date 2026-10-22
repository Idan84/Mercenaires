"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createCoverage,status}=require("../game-core/avatar-coverage.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const files={peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",baseArmors:"base-armors.json",itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json"};
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,read(f)]));
const seeded=()=>{let s=5;return()=>{s=(s*16807)%2147483647;return s/2147483647;};};
const names=(p,i)=>p+" "+i;

// Statut : rapport avatars / besoin.
assert.equal(status(0,27),"manquant");
assert.equal(status(13,27),"sous-représenté");
assert.equal(status(14,27),"juste");
assert.equal(status(27,27),"ok");

// Catalogue minimal : trois orcs (Git puis Hostinger), un nain sans tag.
const av=(id,people,extra={})=>({id,people,sex:null,tags:{},full:id+"_full.webp",portrait:id+"_portrait.webp",...extra});
const catalog=[
  av("orc-001","Orc",{sex:"femme",full:"/media/avatars/Orcs/Orc_1.jpg",tags:{culture:["Orcs noirs"],profile:["ranged"],weapon:["Arbalète"]}}),
  av("orc-002","Orc",{sex:"homme",full:"/media/avatars/Orcs/Orc_2.jpg",tags:{weapon:["Armes de tir"],magic:["Feu"]}}),
  av("orc-003","Orc",{sex:"homme",tags:{profile:["melee"]}}),
  av("nain-001","Nain")
];
const coverage=createCoverage({
  reference,catalog,samples:200,
  generator:createGenerator(reference,{random:seeded(),nameGenerator:names})
});
assert.equal(coverage.need,100,"avatars visés par peuple : avatars.coverage.need (Idan, 2026-10-22)");
assert.deepEqual(coverage.peoples,read("peoples.json").rows.map(r=>r.nom));

// Besoin : le même pour tous les peuples.
const orc=coverage.forPeople("Orc");
assert.equal(orc.need,100);
assert.equal(coverage.forPeople("Ogre").need,100);
assert.equal(orc.avatars,3);
assert.deepEqual([orc.femmes,orc.hommes,orc.sansSexe,orc.sansTags],[1,2,0,0]);
assert.deepEqual(orc.sources,{git:1,hostinger:2});
assert.equal(orc.status,"sous-représenté");

// Familles : parts, cibles, avatars tagués (une arme compte dans sa catégorie).
const row=(family,value)=>orc.families[family].find(x=>x.value===value);
assert.equal(row("weapon","Armes de tir")?.avatars,2,"Arbalète et « Armes de tir » comptent comme Armes de tir");
assert.equal(row("profile","Distance")?.avatars,1);
assert.equal(row("profile","Corps à corps")?.avatars,1);
assert.equal(row("culture","Orcs noirs")?.avatars,1);
for(const f of Object.keys(orc.families)){
  for(const x of orc.families[f]){
    assert.ok(x.share>0&&x.share<=1,f+" : part");
    assert.equal(x.target,Math.round(x.share*orc.need),f+" : cible");
    assert.equal(x.gap,Math.max(0,x.target-x.avatars),f+" : manque");
  }
  const gaps=orc.families[f].map(x=>x.gap);
  assert.deepEqual(gaps,[...gaps].sort((a,b)=>b-a),f+" : trié par manque");
}
assert.ok(Math.abs(orc.families.culture.reduce((t,x)=>t+x.share,0)-1)<1e-9,"une culture par mercenaire");
assert.ok(orc.families.magic.every(x=>/^[A-ZÉ]/.test(x.value)),"noms de magie lisibles");

// Peuple sans avatar, avatar sans tag.
const nain=coverage.forPeople("Nain");
assert.equal(nain.sansTags,1);
assert.equal(coverage.forPeople("Gobelin").status,"manquant");

console.log(JSON.stringify({ok:true,orc:{need:orc.need,status:orc.status}},null,2));
