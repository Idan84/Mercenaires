"use strict";

// Mode dieu (game-core/godmode.js) : changer le peuple et la culture d'un personnage en partie, pour voir la charte de sa
// culture. Seuls le peuple, la culture et, au besoin, le portrait changent.
const assert=require("node:assert/strict");
const avatars=require("../game-core/avatars.js");
const {changeOrigin,avatarFits}=require("../game-core/godmode.js");

const CULTURES={"Nain":["Nains des montagnes","Nains des cités humaines"],"Elfe":["Elfes noirs","Elfes des bois"]};
const culturesForPeople=people=>CULTURES[people]||[];
const av=(id,people,culture=null,sex="homme")=>({id,people,sex,full:id+"_full.webp",portrait:id+"_portrait.webp",
  tags:{culture:culture?[culture]:[]}});
const catalog=[av("nain-1","Nain"),av("elfe-noir-1","Elfe","Elfes noirs"),av("elfe-bois-1","Elfe","Elfes des bois"),
  av("elfe-bois-2","Elfe","Elfes des bois")];
const avatarRules=avatars.createAvatarRules({catalog,random:()=>0});
const character=()=>({id:7,name:"Brug",people:"Nain",culture:"Nains des montagnes",sex:"homme",ascendance:null,
  stats:{Force:60},avatar:{id:"nain-1",full:"nain-1_full.webp",portrait:"nain-1_portrait.webp"}});

// Même peuple, autre culture : le portrait sans culture convient encore, il reste.
let c=character();
let result=changeOrigin(c,{people:"Nain",culture:"Nains des cités humaines"},{culturesForPeople,avatars,avatarRules});
assert.equal(c.culture,"Nains des cités humaines");
assert.equal(c.avatar.id,"nain-1");
assert.equal(result.avatarChanged,false);
assert.deepEqual(result.before,{people:"Nain",culture:"Nains des montagnes",avatar:"nain-1"});

// Autre peuple : un portrait de ce peuple et de cette culture, jamais un portrait déjà pris.
c=character();
result=changeOrigin(c,{people:"Elfe",culture:"Elfes des bois"},{culturesForPeople,avatars,avatarRules,inUse:new Set(["elfe-bois-1"])});
assert.equal(c.people,"Elfe");
assert.equal(c.avatar.id,"elfe-bois-2");
assert.equal(result.avatarChanged,true);
assert.ok(avatarFits(c,{avatars,avatarRules}));
// Le reste ne bouge pas.
assert.equal(c.name,"Brug");
assert.deepEqual(c.stats,{Force:60});
assert.equal(c.ascendance,null);

// Aucun portrait libre : l'ancien reste.
c=character();
result=changeOrigin(c,{people:"Elfe",culture:"Elfes noirs"},{culturesForPeople,avatars,avatarRules,inUse:new Set(["elfe-noir-1"])});
assert.equal(c.culture,"Elfes noirs");
assert.equal(c.avatar.id,"nain-1");
assert.equal(result.avatarChanged,false);

// Sans règles de portraits : seuls le peuple et la culture changent.
c=character();
changeOrigin(c,{people:"Elfe",culture:"Elfes noirs"},{culturesForPeople});
assert.equal(c.avatar.id,"nain-1");

// Une culture d'un autre peuple, un peuple inconnu : refusés, rien ne change.
c=character();
assert.throws(()=>changeOrigin(c,{people:"Nain",culture:"Elfes noirs"},{culturesForPeople}),/pas une culture/);
assert.throws(()=>changeOrigin(c,{people:"Dragon",culture:"Dragons"},{culturesForPeople}),/Peuple inconnu/);
assert.equal(c.people,"Nain");
assert.equal(c.culture,"Nains des montagnes");

console.log("Mode dieu — OK");
