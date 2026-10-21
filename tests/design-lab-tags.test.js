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

const rows=[
  {id:"ok-001",sex:"femme",tags:{profile:["melee"],weapon:["Épée longue"]}},
  {id:"nu-001",sex:"homme",tags:{}},
  {id:"anonyme-001",sex:null,tags:{profile:["ranged"],weapon:["Arc"]}},
  {id:"sansprofil-001",sex:"femme",tags:{culture:["Elfes sylvains"]}},
  {id:"desarme-001",sex:"homme",tags:{profile:["melee"]}},
  {id:"mage-001",sex:"femme",tags:{profile:["magic"]}},
  {id:"ecole-001",sex:"femme",tags:{profile:["magic"],magic:["Feu"]}}
];
const todo=Object.fromEntries(tagTodos({rows}).map(t=>[t.avatar.id,t.signature]));
assert.deepEqual(todo,{
  "anonyme-001":"sex",
  "desarme-001":"weapon",
  "mage-001":"magic",
  "nu-001":"tags",
  "sansprofil-001":"profile"
},"un avatar complet n'apparaît pas ; un avatar sans tag n'a qu'une ligne « aucun tag »");
console.log("Design Lab, Affiner les tags : OK");
