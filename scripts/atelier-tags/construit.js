#!/usr/bin/env node
"use strict";
// Assemble la page de l'atelier : atelier.src.html + profils.json → la page à publier (un seul fichier HTML).
// Usage : node scripts/atelier-tags/construit.js <page.html>
const fs=require("fs"),path=require("path");
const src=fs.readFileSync(path.join(__dirname,"atelier.src.html"),"utf8");
const data=fs.readFileSync(path.join(__dirname,"profils.json"),"utf8").replace(/</g,"\\u003c");
const out=src.replace("@@PROFILS@@",()=>data);
fs.writeFileSync(process.argv[2],out); console.log("écrit",process.argv[2],out.length,"octets");
