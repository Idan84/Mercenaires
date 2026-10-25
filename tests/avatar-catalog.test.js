"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {buildAvatarCatalog,groupAvatarFiles,mergeCatalogs,fileUrl}=require("../game-core/avatar-catalog.js");
const {createAvatarRules}=require("../game-core/avatars.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const reference={
  peoples:read("peoples.json"),cultures:read("cultures.json"),socialOrigins:read("social-origins.json"),
  alignments:read("alignments.json"),ancestries:read("ancestries.json"),skills:read("skills.json"),weapons:read("weapons.json")
};
const FULL={w:768,h:1376}, SQUARE={w:1024,h:1024};

// Index tel que le renvoie api/avatars.php (mots-clés Bridge d'Idan, hiérarchiques ou non).
const files=[
  {path:"Ogres/Ogre_12_20261004.jpg",...FULL,keywords:["Blood&Wages|Gender|F","Blood&Wages|Magie|Eau","Ogres des cités humaines"]},
  {path:"Ogres/Ogre_12_Square_20261004.jpg",...SQUARE,keywords:["Arbalète"]},
  {path:"Reptiliens/Lezard_3.png",...FULL,keywords:["Corps à corps","Mot inventé"]},
  {path:"Reptiliens/Lezard_3_Square.png",...SQUARE,keywords:[]},
  {path:"Halflings/Halfling_7_été #1.jpg",...FULL,keywords:["M","F"]},
  {path:"Halflings/Halfling_7_Square.jpg",...SQUARE,keywords:[]},
  {path:"Ogres/Ogre_20.jpg",...FULL,keywords:[]},
  {path:"Ogres/sans-numero.jpg",...FULL,keywords:[]},
  {path:"Divers/Truc_4.jpg",...FULL,keywords:[]}
];
const {rows,warnings}=buildAvatarCatalog(files,reference);
const byId=Object.fromEntries(rows.map(r=>[r.id,r]));

// Appariement : même peuple, même numéro ; le portrait est l'image carrée.
assert.deepEqual(rows.map(r=>r.id),["halfling-007","ogre-012","reptilien-003"]);
assert.equal(byId["ogre-012"].full,"/media/avatars/Ogres/Ogre_12_20261004.jpg");
assert.equal(byId["ogre-012"].portrait,"/media/avatars/Ogres/Ogre_12_Square_20261004.jpg");
assert.equal(byId["ogre-012"].source,"Ogres/Ogre_12_20261004.jpg");

// Mots-clés des deux images réunis ; dernier segment d'un mot-clé hiérarchique ; la magie donne le profil.
assert.equal(byId["ogre-012"].sex,"femme");
assert.deepEqual(byId["ogre-012"].tags,{culture:["Ogres des cités humaines"],profile:["magic"],magic:["Eau"],weapon:["Arbalète"]});

// Peuple tiré du dossier quand le nom ne le donne pas.
assert.equal(byId["reptilien-003"].people,"Reptilien");
assert.deepEqual(byId["reptilien-003"].tags,{profile:["melee"]});

// Adresses encodées : espaces, accents, #.
assert.equal(byId["halfling-007"].full,"/media/avatars/Halflings/Halfling_7_%C3%A9t%C3%A9%20%231.jpg");
assert.equal(fileUrl("/media/avatars","a b/c.jpg"),"/media/avatars/a%20b/c.jpg");

// Remarques pour Idan : rien n'est ignoré en silence.
const expected=[
  "reptilien-003 : mot-clé inconnu « Mot inventé »",
  "halfling-007 : deux sexes tagués",
  "ogre-020 : il manque le portrait, ignoré",
  "Ogres/sans-numero.jpg : nom sans « Peuple_Numéro », ignoré",
  "Divers/Truc_4.jpg : peuple inconnu (« Truc »), ignoré"
];
for(const w of expected) assert.ok(warnings.includes(w),"remarque attendue : "+w+"\n"+warnings.join("\n"));
assert.equal(warnings.length,expected.length,warnings.join("\n"));
assert.ok(groupAvatarFiles([{path:"Ogres/Ogre_1.jpg",...FULL},{path:"Ogres/Ogre_1_b.jpg",...FULL}],reference).warnings[0].includes("deux images « full »"));
assert.deepEqual(buildAvatarCatalog([],reference),{rows:[],warnings:[]});

// Noms sans tiret bas avant le numéro (dépôt Hostinger du 2026-10-21) : même identifiant qu'avec.
const compact=buildAvatarCatalog([
  {path:"Halflings/Halfling001.jpg",...FULL,keywords:["F"]},
  {path:"Halflings/Halfling001_square.jpg",...SQUARE,keywords:[]},
  {path:"Reptiliens/Reptilien014.jpg",...FULL,keywords:["H"]},
  {path:"Reptiliens/Reptilien014_square.jpg",...SQUARE,keywords:[]}
],reference);
assert.deepEqual(compact.warnings,[]);
assert.deepEqual(compact.rows.map(r=>[r.id,r.sex]),[["halfling-001","femme"],["reptilien-014","homme"]]);
assert.equal(compact.rows[0].portrait,"/media/avatars/Halflings/Halfling001_square.jpg");

// « Ascendance only » (Idan, 2026-10-25) : l'avatar est réservé à son ascendance ; sans ascendance tagguée, ignoré.
const only=buildAvatarCatalog([
  {path:"Ogres/Ogre_30.jpg",...FULL,keywords:["Blood&Wages|Ascendance|Sang de troll","Blood&Wages|Ascendance|Ascendance only"]},
  {path:"Ogres/Ogre_30_Square.jpg",...SQUARE,keywords:[]},
  {path:"Ogres/Ogre_31.jpg",...FULL,keywords:["Sang de troll"]},
  {path:"Ogres/Ogre_31_Square.jpg",...SQUARE,keywords:[]},
  {path:"Ogres/Ogre_32.jpg",...FULL,keywords:["Ascendance seule"]},
  {path:"Ogres/Ogre_32_Square.jpg",...SQUARE,keywords:[]}
],reference);
assert.deepEqual(only.rows.map(r=>[r.id,r.ascendanceOnly||false,r.tags.ascendance||[]]),
  [["ogre-030",true,["Sang de troll"]],["ogre-031",false,["Sang de troll"]],["ogre-032",false,[]]]);
assert.deepEqual(only.warnings,["ogre-032 : « Ascendance only » sans ascendance tagguée, ignoré"]);

// Git + Hostinger : à identifiant égal, Hostinger l'emporte.
const git=[{id:"ogre-012",full:"ogre-012_full.webp",portrait:"ogre-012_portrait.webp"},{id:"ogre-001",full:"a",portrait:"b"}];
const merged=mergeCatalogs(git,rows);
assert.deepEqual(merged.map(a=>a.id),["halfling-007","ogre-001","ogre-012","reptilien-003"]);
assert.equal(merged.find(a=>a.id==="ogre-012").full,byId["ogre-012"].full);

// Partie sauvegardée avec l'ancien fichier : même visage, fichiers du catalogue actuel.
const m={id:1,people:"Ogre",sex:"femme",avatar:{id:"ogre-012",full:"ogre-012_full.webp",portrait:"ogre-012_portrait.webp"}};
const rules=createAvatarRules({catalog:merged});
assert.deepEqual(rules.assign(m,new Set()),{id:"ogre-012",full:byId["ogre-012"].full,portrait:byId["ogre-012"].portrait});

console.log(JSON.stringify({ok:true,avatars:rows.length,warnings:warnings.length},null,2));

// Noms changés (renamed-names.json, Idan 2026-10-23/24) : un avatar tagué sous l'ancien nom dans Bridge
// reste reconnu sous le nouveau.
{
  const renamed={...reference,renamedNames:read("renamed-names.json")};
  const old=[
    {path:"Nains/Nain_2.jpg",...FULL,keywords:["Blood&Wages|Arme|Armes à feu|Arquebuse / Mousquet","Massue / Gourdin","Blood&Wages|Culture|Nains des plaines"]},
    {path:"Nains/Nain_2_Square.jpg",...SQUARE,keywords:[]}
  ];
  const dwarf=buildAvatarCatalog(old,renamed).rows[0];
  assert.deepEqual(dwarf.tags.weapon,["Arquebuse","Massue"]);
  assert.deepEqual(dwarf.tags.culture,["Nains du chaos"]);
}
console.log("Catalogue d'avatars : anciens noms reconnus — OK");
