"use strict";

// Noms des personnages (décision Idan du 2026-10-21) : le prénom respecte le sexe, et les humains portent
// des noms de la consonance de leur culture.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createNameRules,sexOf}=require("../game-core/names.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const table=read("character-names.json");
const cultures=read("cultures.json").rows;
const peoples=read("peoples.json").rows.map(r=>r.nom);
const seeded=(start=7)=>{let s=start;return()=>((s=(s*16807)%2147483647)-1)/2147483646;};
const rowById=id=>table.rows.find(r=>r.id===id);

// Données : chaque peuple a ses prénoms de femme et d'homme, chaque culture ses noms de famille.
assert.equal(table.rows.length,table.row_count);
assert.equal(new Set(table.rows.map(r=>r.id)).size,table.rows.length,"identifiants uniques");
for(const people of peoples){
  const own=table.rows.filter(r=>r.peuple===people);
  assert.ok(own.length,people);
  for(const key of ["prenoms_femme","prenoms_homme"]){
    assert.ok(own.some(r=>r[key].length>=12),people+" : au moins 12 "+key);
  }
}
for(const c of cultures){
  const rows=table.rows.filter(r=>r.culture===c.nom);
  assert.ok(rows.length,"culture sans noms : "+c.nom);
  assert.ok(rows.every(r=>r.peuple===c.peuples),c.nom);
  assert.ok(rows.every(r=>r.noms.length>=8),c.nom);
}
for(const r of table.rows){
  for(const key of ["prenoms_femme","prenoms_homme","noms"]) assert.equal(new Set(r[key]).size,r[key].length,r.id+" : doublon dans "+key);
  assert.ok(!r.prenoms_femme.some(n=>r.prenoms_homme.includes(n)),r.id+" : prénom dans les deux sexes");
  if(r.noms_femme) assert.equal(r.noms_femme.length,r.noms.length,r.id+" : noms au féminin dans le même ordre");
}
// Humains : chaque culture a ses propres prénoms et sa consonance.
const humanCultures=cultures.filter(c=>c.peuples==="Humain").map(c=>c.nom);
assert.deepEqual(new Set(table.rows.filter(r=>r.peuple==="Humain").map(r=>r.culture)),new Set(humanCultures));
for(const r of table.rows.filter(r=>r.peuple==="Humain")){
  assert.ok(r.consonance&&r.prenoms_femme.length>=12&&r.prenoms_homme.length>=12&&r.noms.length>=12,r.id);
}
const consonances=culture=>table.rows.filter(r=>r.culture===culture).map(r=>r.consonance).sort();
assert.deepEqual(consonances("Royaumes du Soleil Levant"),["Japonaise"]);
assert.deepEqual(consonances("Montagnes du Nord"),["Russe","Scandinave"]);
assert.deepEqual(consonances("Steppes désertiques"),["Indienne"]);
assert.deepEqual(consonances("Tribus de la jungle"),["Bantoue","Ouest-africaine"]);
assert.deepEqual(consonances("Cités libres"),["Anglaise","Française","Germanique","Italienne"]);

assert.equal(sexOf("Femme"),"femme");
assert.equal(sexOf("M"),"homme");
assert.equal(sexOf(""),null);

// Tirage : prénom et nom viennent de la même consonance, pour le sexe tiré.
const names=createNameRules({reference:{characterNames:table},random:seeded()});
for(let i=0;i<300;i++){
  const culture=humanCultures[i%humanCultures.length];
  const n=names.generate({people:"Humain",culture});
  const pool=rowById(n.naming.pool);
  assert.equal(pool.culture,culture);
  assert.ok(["femme","homme"].includes(n.naming.sex));
  assert.ok(pool[n.naming.sex==="femme"?"prenoms_femme":"prenoms_homme"].includes(n.firstName),n.name);
  assert.ok((n.naming.sex==="femme"&&pool.noms_femme?pool.noms_femme:pool.noms).includes(n.familyName),n.name);
  assert.equal(n.name,n.firstName+" "+n.familyName);
}
const japanese=rowById("humain-royaumes-du-soleil-levant-japonaise");
for(let i=0;i<50;i++){
  const n=names.generate({people:"Humain",culture:"Royaumes du Soleil Levant",sex:"femme"});
  assert.ok(japanese.prenoms_femme.includes(n.firstName),"plus de « Ysabeau Hoshikawa » : "+n.name);
  assert.equal(n.naming.sex,"femme");
}
// Russe : le nom de famille s'accorde.
const russian=rowById("humain-montagnes-du-nord-russe");
const russianRules=createNameRules({reference:{characterNames:{rows:[russian]}},random:seeded(3)});
const olga=russianRules.generate({people:"Humain",culture:"Montagnes du Nord",sex:"femme"});
assert.ok(russian.noms_femme.includes(olga.familyName),olga.name);
// Autres peuples : prénom du peuple, nom de la culture.
const orc=names.generate({people:"Orc",culture:"Orcs noirs",sex:"homme"});
assert.ok(rowById("orc").prenoms_homme.includes(orc.firstName));
assert.ok(rowById("orc-orcs-noirs").noms.includes(orc.familyName));
assert.equal(orc.naming.pool,"orc-orcs-noirs");
// Culture inconnue : un réservoir du peuple.
assert.ok(names.generate({people:"Humain",culture:"Inconnue"}));
assert.equal(names.generate({people:"Inconnu",culture:"Inconnue"}),null);

// Pas de doublon tant que le réservoir n'est pas épuisé.
const tiny={rows:[{id:"t",peuple:"Gnome",culture:null,poids:1,prenoms_femme:["A","B"],prenoms_homme:["C"],noms:["X","Y"],noms_femme:null}]};
const tinyRules=createNameRules({reference:{characterNames:tiny},random:seeded(5)});
const drawn=Array.from({length:4},()=>tinyRules.generate({people:"Gnome",sex:"femme"}).name).concat(
  Array.from({length:2},()=>tinyRules.generate({people:"Gnome",sex:"homme"}).name));
assert.equal(new Set(drawn).size,6);

// Réaccord après l'avatar : le prénom change de sexe, la consonance et la famille restent.
const ivan={people:"Humain",culture:"Montagnes du Nord",...russianRules.generate({people:"Humain",culture:"Montagnes du Nord",sex:"homme"})};
const family=ivan.familyName,index=russian.noms.indexOf(family);
assert.ok(index>=0);
ivan.sex="Femme";
assert.equal(russianRules.fitSex(ivan),true);
assert.ok(russian.prenoms_femme.includes(ivan.firstName),ivan.name);
assert.equal(ivan.familyName,russian.noms_femme[index],"Volkov devient Volkova");
assert.equal(ivan.name,ivan.firstName+" "+ivan.familyName);
assert.equal(ivan.naming.sex,"femme");
assert.equal(russianRules.fitSex(ivan),false,"déjà accordé");
// Sans sexe connu (pas d'avatar sexué), le nom fixe le sexe.
const nobody={people:"Orc",culture:"Orcs noirs",...names.generate({people:"Orc",culture:"Orcs noirs",sex:"femme"})};
assert.equal(names.fitSex(nobody),true);
assert.equal(nobody.sex,"femme");
// Nom saisi par le joueur ou ancienne sauvegarde : rien ne bouge.
const typed={name:"Bob",people:"Humain",culture:"Cités libres",sex:"femme"};
assert.equal(names.fitSex(typed),false);
assert.equal(typed.name,"Bob");
assert.equal(typed.sex,"femme");

// En partie : chaque membre et chaque candidat porte un prénom du sexe de son avatar.
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createAvatarRules}=require("../game-core/avatars.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const files={peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",baseArmors:"base-armors.json",itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json",characterNames:"character-names.json"};
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,read(f)]));
const gameNames=createNameRules({reference,random:seeded(13)});
const generator=createGenerator(reference,{random:seeded(17),nameGenerator:(people,id,culture)=>gameNames.generate({people,culture})});
// Un tiers des avatars de femmes, un tiers d'hommes, un tiers sans sexe tagué.
const catalog=peoples.flatMap(p=>Array.from({length:30},(_,i)=>({id:p+"-"+i,people:p,sex:[null,"femme","homme"][i%3],tags:{},full:p+i+".webp",portrait:p+i+"-p.webp"})));
const campaign=createCampaignRules({generator,tavern:createTavernRules({reference,random:()=>0.999}),reference,avatars:createAvatarRules({catalog,random:seeded(19)}),names:gameNames});
const captain=generator.createCaptain({id:1,name:"Capitaine Bob",forcedPeople:"Humain",forcedCulture:"Royaumes du Soleil Levant"});
const squad=[2,3,4,5,6,7].map(id=>generator.createMercenary({id,captain,forcedPeople:"Humain",forcedCulture:"Royaumes du Soleil Levant"}));
const state=campaign.createCampaign({captain,squad});
assert.equal(captain.name,"Capitaine Bob","le nom saisi par le joueur ne bouge pas");
const everyone=[...state.company.roster.slice(1),...state.tavern.candidates.map(c=>c.mercenary)];
assert.ok(everyone.length>=10);
for(const m of everyone){
  assert.ok(m.naming,m.name);
  assert.equal(m.naming.sex,sexOf(m.sex),m.name+" : sexe du nom = sexe du personnage");
  const pool=rowById(m.naming.pool);
  assert.equal(pool.peuple,m.people);
  assert.ok(firstNamesOf(pool,m.naming.sex).includes(m.firstName),m.name);
  assert.equal(m.name,m.firstName+" "+m.familyName);
}
for(const m of squad) assert.equal(rowById(m.naming.pool).consonance,"Japonaise",m.name);
function firstNamesOf(pool,sex){
  const key=sex==="femme"?"prenoms_femme":"prenoms_homme";
  return pool[key].length?pool[key]:rowById(pool.peuple.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z]+/g,"-"))[key];
}

console.log("Names: OK");
