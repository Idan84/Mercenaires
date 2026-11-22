#!/usr/bin/env node
"use strict";
// Assemble la page de l'atelier : atelier.src.html + profils.json + le moteur des tags → la page à publier (un seul
// fichier HTML).
// Usage : node scripts/atelier-tags/construit.js <page.html>
const fs=require("fs"),path=require("path");
const src=fs.readFileSync(path.join(__dirname,"atelier.src.html"),"utf8");
const data=fs.readFileSync(path.join(__dirname,"profils.json"),"utf8").replace(/</g,"\\u003c");
// Le moteur des tags du jeu (game-core/tag-engine.js) : le même langage et la même résolution que le jeu.
const moteur=fs.readFileSync(path.join(__dirname,"..","..","game-core","tag-engine.js"),"utf8").replace(/<\/script/gi,"<\\/script");
const out=src.replace("@@PROFILS@@",()=>data).replace("@@MOTEUR@@",()=>moteur);
fs.writeFileSync(process.argv[2],out); console.log("écrit",process.argv[2],out.length,"octets");
