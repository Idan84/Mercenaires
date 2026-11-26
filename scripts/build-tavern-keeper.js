#!/usr/bin/env node
"use strict";
// Les situations du tavernier (Idan, 2026-11-26 : media/Avatar_Tavernier.zip sur Hostinger, « 20 images d'avatars à mettre
// au hasard ») : le portrait en pied de sa fiche au survol, dans sa boîte de dialogue (tavern-keeper-scenes.json, colonne
// image). Tous les pixels d'Idan sont gardés (768 × 1376) ; WebP qualité 92, avec l'encodeur de Chromium (celui
// d'ImageMagick ignore la qualité). Le nom du fichier d'Idan donne le code (le début du nom, avant son identifiant).
// Sortie : prototype-web/assets/tavernier/scenes/<code>.webp.
// Usage : node scripts/build-tavern-keeper.js <dossier du zip décompressé>.
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require("playwright");

const ROOT=path.resolve(__dirname,"..");
const OUT=path.join(ROOT,"prototype-web","assets","tavernier","scenes");
const WEBP_QUALITY=0.92;
// Le début du nom de fichier d'Idan → le code de la situation.
const FILES={
  "Dwarf_decorating_cupcakes":"cupcakes",
  "Dwarf_eating_butter_from_tub":"beurre",
  "Dwarf_in_banana_costume_hiding":"banane",
  "Dwarf_in_barrel_stealing_sausage":"tutu",
  "Dwarf_in_lobster_costume_sitting":"homard",
  "Dwarf_jumping_behind_bar":"grenouille",
  "Dwarf_knitting_sock_behind_bar":"tricot",
  "Dwarf_lounging_in_ale_trough":"abreuvoir",
  "Dwarf_riding_giant_rooster":"coq",
  "Dwarf_sleeping_in_bread_loaf":"miche",
  "Dwarf_stuck_in_ale_barrel":"bouffon",
  "Dwarf_sweeping_tavern_floor":"paillettes",
  "Dwarf_tangled_in_sausage_chains":"saucisses",
  "Dwarf_tavern_keeper_bathing_with":"bain",
  "Dwarf_tavern_keeper_casting_spell":"sortilege",
  "Dwarf_tavern_keeper_tripping_ove":"marmite",
  "Dwarf_tavern_keeper_wearing_fair":"fee",
  "Dwarf_tavern_keeper_wearing_sweater":"pull",
  "Dwarf_wearing_chicken_costume":"poule",
  "Dwarf_wearing_oversized_armor":"armure"
};

async function main(){
  const src=process.argv[2];
  if(!src||!fs.existsSync(src)){ console.error("Usage : node scripts/build-tavern-keeper.js <dossier du zip décompressé>"); process.exit(1); }
  const files=fs.readdirSync(src).filter(name=>/\.jpe?g$/i.test(name));
  // Le préfixe le plus long d'abord (« …_wearing_sweater » avant un préfixe plus court qui le contiendrait).
  const prefixes=Object.keys(FILES).sort((a,b)=>b.length-a.length);
  fs.mkdirSync(OUT,{recursive:true});
  const browser=await chromium.launch();
  const page=await browser.newPage();
  try{
    for(const prefix of Object.keys(FILES)){
      const file=files.find(name=>prefixes.find(p=>name.startsWith(p))===prefix);
      if(!file) throw new Error(`manque ${prefix}*.jpg`);
      const data="data:image/jpeg;base64,"+fs.readFileSync(path.join(src,file)).toString("base64");
      const webp=await page.evaluate(async({data,quality})=>{
        const img=new Image();
        img.src=data;
        await img.decode();
        const c=document.createElement("canvas");
        c.width=img.naturalWidth;c.height=img.naturalHeight;
        c.getContext("2d").drawImage(img,0,0);
        return c.toDataURL("image/webp",quality);
      },{data,quality:WEBP_QUALITY});
      const dest=path.join(OUT,`${FILES[prefix]}.webp`);
      fs.writeFileSync(dest,Buffer.from(webp.split(",")[1],"base64"));
      console.log(path.relative(ROOT,dest),fs.statSync(dest).size);
    }
  }finally{ await browser.close(); }
}

main().catch(error=>{ console.error(error); process.exit(1); });
