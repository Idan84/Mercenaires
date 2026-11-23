#!/usr/bin/env node
"use strict";
// Atelier des tags (Idan, 2026-11-20) : tire des recrues avec le vrai générateur du jeu (game-core) et les aplatit en
// variables lisibles par les calculs de l'atelier (caractéristiques et compétences équipement compris, capacités,
// équipement porté, sorts, réussite / coût / durée des sorts par tag de rôle, moyennes des soins, mesures des titres).
// Usage : node scripts/atelier-tags/profils.js [nombre de recrues, 240 par défaut] → scripts/atelier-tags/profils.json
// (plus trois recrues par ascendance au niveau 3, pour les capacités rares). Puis : node scripts/atelier-tags/construit.js
const fs=require("node:fs"),path=require("node:path");
const ROOT=path.resolve(__dirname,"..","..");
const {createGenerator}=require(ROOT+"/game-core/mercenary-generator.js");
const {createCombatEngine}=require(ROOT+"/game-core/combat-engine.js");
const {createEquipmentEffects}=require(ROOT+"/game-core/equipment-effects.js");
const {createMagicRules}=require(ROOT+"/game-core/magic.js");
const {createStarRules}=require(ROOT+"/game-core/stars.js");
const {createProfileRules}=require(ROOT+"/game-core/mercenary-profile.js");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const N=Number(process.argv[2])||240;
let seed=20261120;const random=()=>((seed=(seed*16807)%2147483647)/2147483647);Math.random=random;
const gen=createGenerator(reference,{random,nameGenerator:(p,id)=>p+" "+id});
const engine=createCombatEngine(reference,{});
const gear=createEquipmentEffects({engine});
const magic=createMagicRules({reference,combat:engine});
const stars=createStarRules({reference});
const prof=createProfileRules({reference,engine,magic});
const pdata=reference.mercenaryProfile;
// Les variables d'un mercenaire : le moteur des tags du jeu (game-core/tag-engine.js), le même que le jeu utilise.
const {createTagVariables}=require(ROOT+"/game-core/tag-engine.js");
const tagVars=createTagVariables({reference,engine,gear,magic,stars,profile:prof});
const VARS=tagVars.vars(); const seen={get:k=>VARS.findIndex(x=>x.k===k)};

const captain=gen.createCaptain({id:1});
const rows=[];
// Les recrues au hasard, puis trois par ascendance au niveau 3 (les capacités rares : vol, régénération, respiration aquatique).
const demandes=Array.from({length:N},()=>({}));
for(const a of gen.ancestries()){ const ps=gen.people().filter(p=>gen.isAncestryCompatible(p,a)); if(!ps.length) continue;
  for(let k=0;k<3;k++) demandes.push({forcedPeople:ps[Math.floor(random()*ps.length)],forcedAscendance:a,forcedAscendanceLevel:3}); }
for(let i=0;i<demandes.length;i++){
  const c=gen.createMercenary({id:i+2,captain,...demandes[i]});
  rows.push(tagVars.of(c));
}
// Valeurs manquantes : 0, faux, "" ou [] selon le type.
const vide=t=>t==="nombre"?0:t==="oui/non"?false:t==="liste"?[]:"";
const profils=rows.map(o=>VARS.map(x=>o[x.k]===undefined?vide(x.type):o[x.k]));
const res={genere:"Recrues tirées par le générateur du jeu (game-core), le "+new Date().toISOString().slice(0,10)+", graine "+20261120,vars:VARS,profils};
fs.writeFileSync(path.join(__dirname,"profils.json"),JSON.stringify(res));
console.log(VARS.length,"variables",profils.length,"profils",JSON.stringify(res).length,"octets");
const by=(k)=>{const i=seen.get(k);const c={};for(const p of profils){const x=String(p[i]);c[x]=(c[x]||0)+1;}return c;};
console.log("domaine",by("domaine"));console.log("etoiles",by("etoiles"));console.log("vol",by("capacite.vol"),"regen>0",profils.filter(p=>p[seen.get("capacite.regeneration")]>0).length,"resp",by("capacite.respiration_aquatique"));
console.log("nb_sorts",by("nb_sorts"));console.log("soin",by("sorts.soin"));
console.log(VARS.filter(x=>x.groupe.startsWith("Sorts")).length, VARS.map(x=>x.k).join(" "));
