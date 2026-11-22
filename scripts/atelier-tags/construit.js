#!/usr/bin/env node
"use strict";
// Assemble la page de l'atelier : atelier.src.html + profils.json + le moteur des tags → la page à publier (un seul
// fichier HTML).
// Usage : node scripts/atelier-tags/construit.js <page.html> [--site]
//   sans option : la page de l'artefact claude.ai (enregistrée dans la base de l'artefact) ;
//   --site : la page de la Design Lab (design/atelier/, enregistrée sur Hostinger, scripts/build-site.sh).
const fs=require("fs"),path=require("path");
const src=fs.readFileSync(path.join(__dirname,"atelier.src.html"),"utf8");
const data=fs.readFileSync(path.join(__dirname,"profils.json"),"utf8").replace(/</g,"\\u003c");
// Le moteur des tags du jeu (game-core/tag-engine.js) : le même langage et la même résolution que le jeu.
const moteur=fs.readFileSync(path.join(__dirname,"..","..","game-core","tag-engine.js"),"utf8").replace(/<\/script/gi,"<\\/script");
const hebergement=process.argv.includes("--site")?"site":"artefact";
const out=src.replace("@@PROFILS@@",()=>data).replace("@@MOTEUR@@",()=>moteur).replace("@@HEBERGEMENT@@",hebergement);
const sortie=process.argv.slice(2).find(a=>!a.startsWith("--"));
if(!sortie){ console.error("Usage : node scripts/atelier-tags/construit.js <page.html> [--site]"); process.exit(1); }
fs.mkdirSync(path.dirname(path.resolve(sortie)),{recursive:true});
fs.writeFileSync(sortie,out); console.log("écrit",sortie,"("+hebergement+")",out.length,"octets");
