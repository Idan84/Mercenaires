#!/usr/bin/env node
"use strict";
// Les feuilles de Jean-Mi couchées à l'horizontale, pour le détail d'un contrat (Idan, 2026-11-14 : « deux feuilles
// différentes de papier pour la même mission… c'est ce qui me gêne le plus ») : l'annonce et la lettre du commanditaire
// sur la même feuille, chacune sur une moitié, de part et d'autre du pli.
//   node scripts/make-landscape-sheets.js prototype-web/assets/taverne
// lit feuille-1.webp … feuille-8.webp (debout) et écrit feuille-1-large.webp … feuille-8-large.webp, tournées d'un quart
// de tour : la même feuille que sur le panneau, sans étirer ses bords déchirés. Le coin arraché va en haut à gauche, sous
// la gravure (qui prend la feuille en masque) : jamais sous les pictos, la lettre ou le cachet.
const TURN={1:"gauche",4:"gauche",5:"gauche retournée",6:"droite retournée",7:"droite retournée"}; // les autres : à droite
const {chromium}=require("playwright");const fs=require("fs");
(async()=>{const [dir]=process.argv.slice(2);
if(!dir){console.error("usage : make-landscape-sheets.js <dossier>");process.exit(1);}
const b=await chromium.launch();const p=await b.newPage();
for(let n=1;n<=8;n++){
  const data="data:image/webp;base64,"+fs.readFileSync(`${dir}/feuille-${n}.webp`).toString("base64");
  const out=await p.evaluate(async ({data,turn})=>{const img=new Image();img.src=data;await img.decode();
    const c=document.createElement("canvas");c.width=img.naturalHeight;c.height=img.naturalWidth;const g=c.getContext("2d");
    if(turn.includes("retournée")){g.translate(c.width,0);g.scale(-1,1);}
    if(turn.startsWith("gauche")){g.translate(0,c.height);g.rotate(-Math.PI/2);}else{g.translate(c.width,0);g.rotate(Math.PI/2);}
    g.drawImage(img,0,0);
    return {w:c.width,h:c.height,url:c.toDataURL("image/webp",0.9)};},{data,turn:TURN[n]||"droite"});
  fs.writeFileSync(`${dir}/feuille-${n}-large.webp`,Buffer.from(out.url.split(",")[1],"base64"));console.log(`feuille-${n}-large`,out.w+"x"+out.h);}
await b.close();})();
