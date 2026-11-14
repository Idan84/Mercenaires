#!/usr/bin/env node
"use strict";
// Les gravures des annonces de mission (Idan et Jean-Mi, 2026-11-14) : Idan dépose les images sur Hostinger
// (media/background/Taverne/Missions/, liste : api/background.php) ; on choisit lesquelles garder (« N'utilise pas celles
// que tu ne trouves pas bonnes ») et on les prépare pour le rendu « produit » sur le papier de l'annonce :
//   marges rognées, fond crème ramené au blanc (le blanc disparaît, l'encre semble imprimée), 1000 px de large, WebP
//   encodé par Chromium (ImageMagick ignore la qualité du WebP).
// Usage : node scripts/build-mission-art.js [--force]   (outils : curl, ImageMagick « convert », Playwright)
//   sans --force, les gravures déjà rangées ne sont pas refaites.
// Les images retenues sont listées ci-dessous, avec leur nom dans prototype-web/assets/missions/ ; les écartées aussi,
// avec la raison. Les camps les déclarent dans data/reference/one-shot-missions.json (camps[].illustrations).
const fs=require("fs");
const os=require("os");
const path=require("path");
const {execFileSync}=require("child_process");

const SITE="https://bloodandwages.idanwizen.com";
const OUT=path.join(__dirname,"..","prototype-web","assets","missions");
const WIDTH=1000;
const QUALITY=0.8;

const KEEP=[
  ["Orc_warrior_guarding_war_camp_a9cf545c.jpg","camp-orc-1"],
  ["Orc_warrior_standing_guard_536c622a.jpg","camp-orc-2"],
  ["Orc_warrior_standing_guard_894f7d18.jpg","camp-orc-3"],
  ["Thief_at_bandit_hideout_6808b4ff.jpg","camp-voleurs-1"],
  ["Thief_at_bandit_hideout_6f991c2c.jpg","camp-voleurs-2"],
  ["Thief_guarding_bandit_hideout_39ee5d23.jpg","camp-voleurs-3"],
  ["Thief_in_bandit_hideout_fb6e104f.jpg","camp-voleurs-4"],
  ["Ogre_encampment_with_cauldron_an…_9a91bb9a.jpg","camp-ogre-1"],
  ["Ogre_in_encampment_with_weapons_0c709554.jpg","camp-ogre-2"],
  ["Ogre_encampment_with_giant_cauldron_d0008d80.jpg","camp-ogre-3"],
  ["Ogre_encampment_with_cauldron_an…_b50c0c65.jpg","camp-ogre-4"],
  ["Vampire_silhouette_in_ruined_castle_ccb42c11.jpg","chateau-maudit-1"],
  ["Vampire_in_ruined_castle_window_d9d4443a.jpg","chateau-maudit-2"],
  ["Vampire_at_castle_window_c4c62323.jpg","chateau-maudit-3"],
  ["Hooded_figure_in_ancient_graveyard_93e85a0f.jpg","cimetiere-profane-1"],
  ["Hooded_figure_holding_lantern_gr…_1a5d46be.jpg","cimetiere-profane-2"]
];
// Écartées : les raisons servent pour la prochaine série.
const REJECTED={
  "Ogre_encampment_with_cauldron_an…_08bb96c7.jpg":"fond noir tout autour : un rectangle sombre sur l'annonce, l'encre ne se pose plus sur le papier",
  "Ogre_encampment_with_cauldron_an…_ef1e4da0.jpg":"presque la même que camp-ogre-3 (ogre assis à droite du chaudron) : une variante de plus sans rien de neuf"
};

function listMissions(){
  const index=JSON.parse(execFileSync("curl",["-sf",SITE+"/api/background.php"],{encoding:"utf8"}));
  const files=new Map();
  for(const f of index.files) if(/^Taverne\/Missions\/[^/]+\.(png|jpe?g|webp)$/i.test(f.path)) files.set(path.basename(f.path),f.path);
  return {base:index.base,files};
}

// Le blanc du papier : la teinte des coins (le fond de la gravure), ramenée au blanc pur.
function whitePoint(file){
  const out=execFileSync("convert",[file,"-colorspace","Gray","-format","%[fx:p{4,4}] %[fx:p{w-5,4}] %[fx:p{4,h-5}] %[fx:p{w-5,h-5}]","info:"],{encoding:"utf8"});
  const v=out.trim().split(/\s+/).map(Number).sort((a,b)=>b-a);
  return Math.max(.85,Math.min(1,(v[0]+v[1])/2-.012));
}

async function main(){
  const {base,files}=listMissions();
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"missions-"));
  const unknown=[...files.keys()].filter(n=>!KEEP.some(([src])=>src===n)&&!(n in REJECTED));
  if(unknown.length) console.log("À trier (ni gardées ni écartées) :\n  "+unknown.join("\n  "));
  const {chromium}=require("playwright");
  const browser=await chromium.launch();
  const page=await browser.newPage();
  fs.mkdirSync(OUT,{recursive:true});
  const force=process.argv.includes("--force");
  for(const [src,name] of KEEP){
    if(!force&&fs.existsSync(path.join(OUT,name+".webp"))) continue;
    const rel=files.get(src);
    if(!rel){ console.log("absente sur Hostinger : "+src); continue; }
    const raw=path.join(tmp,name+path.extname(src));
    execFileSync("curl",["-sf","-o",raw,SITE+"/"+base+"/"+rel.split("/").map(encodeURIComponent).join("/")]);
    const png=path.join(tmp,name+".png");
    const white=whitePoint(raw);
    execFileSync("convert",[raw,"-fuzz","10%","-trim","+repage","-level","0%,"+(white*100).toFixed(1)+"%","-bordercolor","white","-border","25","-resize",WIDTH+"x",png]);
    const data="data:image/png;base64,"+fs.readFileSync(png).toString("base64");
    const webp=await page.evaluate(async({data,q})=>{
      const img=new Image(); img.src=data; await img.decode();
      const c=document.createElement("canvas"); c.width=img.naturalWidth; c.height=img.naturalHeight;
      c.getContext("2d").drawImage(img,0,0);
      return c.toDataURL("image/webp",q);
    },{data,q:QUALITY});
    const dest=path.join(OUT,name+".webp");
    fs.writeFileSync(dest,Buffer.from(webp.split(",")[1],"base64"));
    console.log(name+".webp",Math.round(fs.statSync(dest).size/1024)+" Ko","(blanc à "+(white*100).toFixed(0)+" %)");
  }
  await browser.close();
  fs.rmSync(tmp,{recursive:true,force:true});
}

main().catch(err=>{ console.error(err); process.exit(1); });
