#!/usr/bin/env node
"use strict";
// Les plats de la Cantine (Idan, 2026-11-26 : « plats_cuisine.zip. Bon appétit ! ») : media/plats_cuisine.zip sur Hostinger,
// une image carrée par plat (noms d'origine ci-dessous). Sortie : prototype-web/assets/cantine/plats/<code>.webp, 640 × 640,
// WebP qualité 92 avec l'encodeur de Chromium (celui d'ImageMagick ignore la qualité) ; le code est celui de
// canteen-dishes.json (colonne image). Usage : node scripts/build-canteen-dishes.js <dossier du zip décompressé>.
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require("playwright");

const ROOT=path.resolve(__dirname,"..");
const OUT=path.join(ROOT,"prototype-web","assets","cantine","plats");
const SIZE=640;
const WEBP_QUALITY=0.92;
// Le début du nom de chaque image d'Idan → le code du plat.
const FILES={
  "Ogre_stew_in_wooden_bowl":"ragout_mamie_ogresse",
  "Cheese_wheel_on_wooden_board":"fromage_lait_de_poule",
  "Crispy_roasted_hedgehog_on_platter":"herisson_roti",
  "Skillet_with_mushrooms_and_garlic":"poelee_champignons",
  "Roasted_rabbit_with_caramelized":"lapin_roti",
  "Savory_pie_on_wooden_board":"tourte_aux_trefles",
  "Bowl_of_green_fantasy_soup":"soupe_geant_vert",
  "Tu_peux_retirer_le_texte":"tetes_de_harengs",
  "Steaming_bowl_of_chili_peppers":"chili_piments_doux",
  "Roasted_bird_tataki_on_plate":"tataki_hirondelle"
};

async function main(){
  const src=process.argv[2];
  if(!src||!fs.existsSync(src)){ console.error("Usage : node scripts/build-canteen-dishes.js <dossier du zip décompressé>"); process.exit(1); }
  const files=fs.readdirSync(src).filter(f=>/\.(jpe?g|png|webp)$/i.test(f));
  fs.mkdirSync(OUT,{recursive:true});
  const browser=await chromium.launch();
  const page=await browser.newPage();
  try{
    for(const [prefix,code] of Object.entries(FILES)){
      const file=files.find(f=>f.startsWith(prefix));
      if(!file) throw new Error(`pas d'image pour ${code} (${prefix}…)`);
      const type=/\.png$/i.test(file)?"png":/\.webp$/i.test(file)?"webp":"jpeg";
      const data=`data:image/${type};base64,`+fs.readFileSync(path.join(src,file)).toString("base64");
      const webp=await page.evaluate(async({data,size,quality})=>{
        const img=new Image();
        img.src=data;
        await img.decode();
        const c=document.createElement("canvas");
        c.width=c.height=size;
        const g=c.getContext("2d");
        g.imageSmoothingQuality="high";
        // Recadré au carré, au centre, puis réduit.
        const s=Math.min(img.naturalWidth,img.naturalHeight);
        g.drawImage(img,(img.naturalWidth-s)/2,(img.naturalHeight-s)/2,s,s,0,0,size,size);
        return c.toDataURL("image/webp",quality);
      },{data,size:SIZE,quality:WEBP_QUALITY});
      const dest=path.join(OUT,`${code}.webp`);
      fs.writeFileSync(dest,Buffer.from(webp.split(",")[1],"base64"));
      console.log(path.relative(ROOT,dest),fs.statSync(dest).size,"←",file);
    }
  }finally{ await browser.close(); }
}

main().catch(error=>{ console.error(error); process.exit(1); });
