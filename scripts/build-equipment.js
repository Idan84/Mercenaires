#!/usr/bin/env node
"use strict";

// Images d'équipement (Idan, 2026-10-23) : masters dans assets-src/Equipements/ (1024 px, fond noir)
// → versions du jeu dans prototype-web/assets/equipment/ (WebP 256 px).
// - Armures/<Nom>_<tier>[_horodatage].jpg et Armes/<Nom>_<tier>[...].jpg : le nom est reconnu sans accents,
//   majuscules ni petits mots (« Armure_cuir » = « Armure de cuir »), dans n'importe quel ordre
//   (« Double_arme_hast » = « Arme d'hast double »), et abrégé s'il reste sans ambiguïté
//   (« Fleau » = « Fléau d'armes ») ;
//   sortie <dossier>/<slug du nom de référence>-<tier>.webp, le slug étant celui de picto-ui.js ;
// - Frames/frame_<tier>.jpg : cadre de tier, recadré sur le cadre lui-même → frames/frame-<tier>.webp.
// Écrit aussi prototype-web/equipment-art.js, la liste des images disponibles (pas de requête vers une image
// absente). Nécessite ImageMagick (convert).
const fs=require("fs");
const path=require("path");
const {execFileSync}=require("child_process");

const ROOT=path.resolve(__dirname,"..");
const SRC=path.join(ROOT,"assets-src","Equipements");
const OUT=path.join(ROOT,"prototype-web","assets","equipment");
const STOPWORDS=new Set(["de","d","des","du","la","le","l","a","et"]);

function plain(name){
  return String(name).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
}
// Même calcul que pictoSlug (prototype-web/picto-ui.js).
function slug(name){
  return plain(name).replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
function words(name){
  return plain(name).split(/[^a-z0-9]+/).filter(word=>word&&!STOPWORDS.has(word));
}
// Nom de référence désigné par un nom de fichier : mêmes mots, sinon le seul nom qui contient tous ses mots.
function findReference(raw,names){
  const wanted=words(raw),key=list=>[...list].sort().join("-");
  if(!wanted.length) return null;
  const exact=names.filter(name=>key(words(name))===key(wanted));
  if(exact.length===1) return exact[0];
  const loose=names.filter(name=>{ const have=new Set(words(name)); return wanted.every(word=>have.has(word)); });
  return loose.length===1?loose[0]:null;
}
function rows(file){
  return JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8")).rows;
}
function masters(dir){
  const full=path.join(SRC,dir);
  return fs.existsSync(full)?fs.readdirSync(full).filter(f=>/\.(jpe?g|png|webp)$/i.test(f)).sort():[];
}
function convert(args){
  execFileSync("convert",args,{stdio:["ignore","ignore","inherit"]});
}

const families=[
  {dir:"Armures",out:"armures",names:rows("base-armors.json").map(r=>r.nom)},
  {dir:"Armes",out:"armes",names:rows("weapons.json").map(r=>r.nom)}
];
const available=[];
const problems=[];

for(const family of families){
  fs.mkdirSync(path.join(OUT,family.out),{recursive:true});
  for(const file of masters(family.dir)){
    const match=path.parse(file).name.match(/^(.*?)[ _-]+(\d)(?:[ _-]+\d{6,})?$/);
    const name=match&&findReference(match[1],family.names);
    if(!name){ problems.push(`${family.dir}/${file} : nom ou tier non reconnu`); continue; }
    const out=`${family.out}/${slug(name)}-${match[2]}`;
    convert([path.join(SRC,family.dir,file),"-resize","256x256","-quality","82",path.join(OUT,out+".webp")]);
    available.push(out);
    console.log(`${family.dir}/${file} → ${out}.webp`);
  }
}

fs.mkdirSync(path.join(OUT,"frames"),{recursive:true});
for(const file of masters("Frames")){
  const match=file.match(/frame[ _-]*(\d)/i);
  if(!match){ problems.push(`Frames/${file} : tier non reconnu`); continue; }
  const out=`frames/frame-${match[1]}`;
  // Recadré sur le cadre (le noir autour disparaît à l'écran, mode « screen »), puis carré de 256 px.
  convert([path.join(SRC,"Frames",file),"-fuzz","12%","-trim","+repage","-resize","256x256!","-quality","85",path.join(OUT,out+".webp")]);
  available.push(out);
  console.log(`Frames/${file} → ${out}.webp`);
}

available.sort();
fs.writeFileSync(path.join(ROOT,"prototype-web","equipment-art.js"),
  `"use strict";\n\n// Généré par scripts/build-equipment.js : images d'équipement présentes dans assets/equipment/.\n`+
  `const EQUIPMENT_ART=new Set(${JSON.stringify(available,null,2)});\n`);
for(const problem of problems) console.warn("⚠ "+problem);
console.log(`${available.length} images d'équipement.`);
if(problems.length) process.exitCode=1;
