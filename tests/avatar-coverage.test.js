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

// Ascendances (Idan, 2026-10-25) : toutes celles du peuple, même rares, avec leur part exacte.
const compat=read("ancestry-compatibility.json").rows;
const humain=coverage.forPeople("Humain");
const possible=compat.filter(r=>r.peuple==="Humain"&&r.possible&&r.ascendance).map(r=>r.ascendance).sort();
assert.deepEqual(humain.families.ascendance.map(x=>x.value).sort(),possible,"les "+possible.length+" ascendances possibles des humains");
const presence=Number(read("peoples.json").rows.find(r=>r.nom==="Humain").probabilite_d_ascendance);
assert.ok(Math.abs(humain.families.ascendance.reduce((t,x)=>t+x.share,0)-presence)<1e-9,"leurs parts font la probabilité d'ascendance");

// Combinaisons (Idan, 2026-10-25 : « il faut que je croise ») : culture · profil · arme portée ou école du mage.
const combos=orc.combinations;
assert.ok(Math.abs(combos.reduce((t,x)=>t+x.share,0)-1)<1e-9,"une combinaison par mercenaire");
assert.deepEqual(combos.map(x=>x.share),[...combos.map(x=>x.share)].sort((a,b)=>b-a),"les plus fréquentes d'abord");
for(const c of combos){
  assert.ok(c.culture&&["Corps à corps","Distance","Magie"].includes(c.profile));
  assert.equal(c.kind,c.profile==="Magie"?"magic":"weapon");
  assert.equal(c.target,Math.round(c.share*100));
  assert.equal(c.gap,Math.max(0,c.target-c.avatars));
}
const axes=createCoverage({reference,samples:200,generator:createGenerator(reference,{random:seeded(),nameGenerator:names}),catalog:[
  av("orc-a","Orc",{tags:{culture:["Orcs noirs"],profile:["melee"],weapon:["Hache double"]}}),
  av("orc-b","Orc",{tags:{culture:["Orcs noirs"],profile:["melee"],weapon:["Haches"]}}),
  av("orc-c","Orc",{tags:{culture:["Orcs des villes"],profile:["melee"],weapon:["Haches"]}}),
  av("orc-d","Orc",{tags:{culture:["Orcs noirs"],profile:["ranged"],weapon:["Haches"]}}),
  av("orc-e","Orc",{tags:{culture:["Orcs noirs"],profile:["melee"],weapon:["Hache double","Arc"]}}),
  av("orc-f","Orc",{tags:{culture:["Orcs noirs"],profile:["melee"],weapon:["Arc"]}})
]}).forPeople("Orc").combinations.find(x=>x.culture==="Orcs noirs"&&x.profile==="Corps à corps"&&x.value==="Haches");
assert.ok(axes,"des guerriers orcs noirs à la hache");
assert.equal(axes.avatars,3,"il faut la culture, le profil et l'arme tenue en main (une hache précise compte dans sa catégorie ; "
  +"« CAC + Hache + Arc » tient la hache, un arc seul ne compte pas pour un guerrier)");
for(const c of orc.cultureProfiles){
  assert.ok(Math.abs(Object.values(c.profiles).reduce((t,x)=>t+x,0)-1)<1e-9,c.culture+" : profils");
}
assert.ok(Math.abs(orc.cultureProfiles.reduce((t,x)=>t+x.share,0)-1)<1e-9);

// Peuple sans avatar, avatar sans tag.
const nain=coverage.forPeople("Nain");
assert.equal(nain.sansTags,1);
assert.equal(coverage.forPeople("Gobelin").status,"manquant");

console.log(JSON.stringify({ok:true,orc:{need:orc.need,status:orc.status}},null,2));
