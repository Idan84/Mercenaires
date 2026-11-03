"use strict";

// Design Lab, onglet Avatars : liste « Affiner les tags » (demande d'Idan, 2026-10-21).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const ROOT=path.resolve(__dirname,"..");
const context={MercenairesAvatarCatalog:{slug:s=>String(s).toLowerCase()},localStorage:{getItem:()=>null,setItem:()=>{}}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT,"prototype-web/design/avatars-lab.js"),"utf8")+"\nthis.AvatarsLab=AvatarsLab;",context);
const {tagTodos}=context.AvatarsLab;

const culture=["Elfes sylvains"];
const rows=[
  {id:"ok-001",sex:"femme",tags:{culture,profile:["melee"],weapon:["Épée longue"]}},
  {id:"nu-001",sex:"homme",tags:{}},
  {id:"anonyme-001",sex:null,tags:{culture,profile:["ranged"],weapon:["Arc"]}},
  {id:"sansprofil-001",sex:"femme",tags:{culture}},
  {id:"desarme-001",sex:"homme",tags:{culture,profile:["melee"]}},
  {id:"mage-001",sex:"femme",tags:{culture,profile:["magic"]}},
  {id:"ecole-001",sex:"femme",tags:{culture,profile:["magic"],magic:["Feu"]}},
  // Sans culture : le jeu ne le donne à aucune recrue (Idan, 2026-11-03 : Elf_137).
  {id:"apatride-001",sex:"homme",tags:{profile:["magic"],magic:["Eau"]}},
  {id:"gobelin-002",sex:"femme",tags:{culture:["Gobelins des cavernes"],profile:["melee"],weapon:["Dague"]}}
];
// Les remarques du catalogue (en bas de page jusqu'ici) rejoignent la liste, sans doublon ; une image écartée a sa ligne.
const warnings=["gobelin-002 : deux sexes tagués","gobelin-002 : deux sexes tagués","gobelin-002 : deux sexes tagués","ogre-012 : il manque le portrait, ignoré",
  "Ogres/Ogre.jpg : nom sans « Peuple_Numéro », ignoré"];
const todos=tagTodos({rows,warnings});
const todo=Object.fromEntries(todos.map(t=>[t.avatar.id,t.problems.map(p=>p.label).join(" · ")]));
assert.deepEqual(todo,{
  "Ogres/Ogre.jpg":"nom sans « Peuple_Numéro », ignoré",
  "anonyme-001":"sexe manquant (F ou H)",
  "apatride-001":"culture manquante : aucune recrue ne l'aura",
  "desarme-001":"arme manquante pour un profil Corps à corps ou Distance",
  "gobelin-002":"deux sexes tagués",
  "mage-001":"école de magie manquante",
  "nu-001":"aucun tag (profil, culture, arme…)",
  "ogre-012":"il manque le portrait, ignoré",
  "sansprofil-001":"profil manquant (Corps à corps, Distance ou Magie)"
},"un avatar complet n'apparaît pas ; un avatar sans tag n'a qu'une ligne « aucun tag »");
assert.equal(todos.find(t=>t.avatar.id==="Ogres/Ogre.jpg").avatar.source,"Ogres/Ogre.jpg");
// Une seule liste : plus de « Remarques » en bas de page ; un index incomplet est signalé et redemandé.
const lab=fs.readFileSync(path.join(ROOT,"prototype-web/design/avatars-lab.js"),"utf8");
assert.doesNotMatch(lab,/cov-warnings|Remarques sur les avatars/);
assert.match(lab,/if\(avatars\.complete===false\) alerts\.push\(/);
const loader=fs.readFileSync(path.join(ROOT,"prototype-web/reference-data.js"),"utf8");
assert.match(loader,/index && index\.complete === false && i < AVATAR_INDEX_RETRIES/);
assert.match(loader,/complete: hosted \? hosted\.complete !== false : true/);
console.log("Design Lab, Affiner les tags : OK");
