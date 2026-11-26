#!/usr/bin/env node
"use strict";
// Les fonds de la Cantine (Idan, 2026-11-26 : « 10 backgrounds à mettre en plein écran (sous la barre de jeu). L'image à
// mettre dépend du niveau de la cantine ») : media/cantine_taverne.zip sur Hostinger, cantine_<niveau>.jpg (1 à 10).
// Tous les pixels d'Idan sont gardés (la qualité avant le poids, comme la taverne) ; WebP qualité 95, avec l'encodeur de
// Chromium (celui d'ImageMagick ignore la qualité). Sortie : prototype-web/assets/cantine/cantine-<niveau>.webp, lue par
// canteen-ui.js (le fond de l'écran La Cantine).
// Usage : node scripts/build-canteen-bg.js <dossier des cantine_N.jpg> (le zip décompressé).
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require("playwright");

const ROOT=path.resolve(__dirname,"..");
const OUT=path.join(ROOT,"prototype-web","assets","cantine");
const LEVELS=10;
const WEBP_QUALITY=0.95;

async function main(){
  const src=process.argv[2];
  if(!src||!fs.existsSync(src)){ console.error("Usage : node scripts/build-canteen-bg.js <dossier des cantine_N.jpg>"); process.exit(1); }
  fs.mkdirSync(OUT,{recursive:true});
  const browser=await chromium.launch();
  const page=await browser.newPage();
  try{
    for(let n=1;n<=LEVELS;n++){
      const file=path.join(src,`cantine_${n}.jpg`);
      if(!fs.existsSync(file)) throw new Error(`manque ${file}`);
      const data="data:image/jpeg;base64,"+fs.readFileSync(file).toString("base64");
      const webp=await page.evaluate(async({data,quality})=>{
        const img=new Image();
        img.src=data;
        await img.decode();
        const c=document.createElement("canvas");
        c.width=img.naturalWidth;c.height=img.naturalHeight;
        c.getContext("2d").drawImage(img,0,0);
        return c.toDataURL("image/webp",quality);
      },{data,quality:WEBP_QUALITY});
      const dest=path.join(OUT,`cantine-${n}.webp`);
      fs.writeFileSync(dest,Buffer.from(webp.split(",")[1],"base64"));
      console.log(path.relative(ROOT,dest),fs.statSync(dest).size);
    }
  }finally{ await browser.close(); }
}

main().catch(error=>{ console.error(error); process.exit(1); });
