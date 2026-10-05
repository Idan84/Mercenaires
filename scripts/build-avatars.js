#!/usr/bin/env node
"use strict";

// Avatars des mercenaires, version Git : masters d'Idan (assets-src/avatars/, tagués dans Bridge)
// → catalogue du jeu (data/reference/avatars.json) et images web (prototype-web/assets/avatars/).
// Appariement plein pied / portrait, identifiants et classement des mots-clés :
// game-core/avatar-catalog.js, partagé avec le catalogue lu sur Hostinger (api/avatars.php).
//
// Usage : node scripts/build-avatars.js   (nécessite ImageMagick : identify, convert)
//         node scripts/build-avatars.js --bridge   (écrit aussi le fichier de mots-clés Bridge)

const fs=require("node:fs");
const path=require("node:path");
const {execFileSync}=require("node:child_process");

const ROOT=path.resolve(__dirname,"..");
const SRC=path.join(ROOT,"assets-src","avatars");
const OUT_IMG=path.join(ROOT,"prototype-web","assets","avatars");
const OUT_JSON=path.join(ROOT,"data","reference","avatars.json");
const BRIDGE_FILE=path.join(SRC,"mots-cles-bridge.txt");
const FULL_WIDTH=560, PORTRAIT_SIZE=384, QUALITY=82;

const catalog=require("../game-core/avatar-catalog.js");

const readTable=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const reference={
  peoples:readTable("peoples.json"),cultures:readTable("cultures.json"),socialOrigins:readTable("social-origins.json"),
  alignments:readTable("alignments.json"),ancestries:readTable("ancestries.json"),skills:readTable("skills.json"),
  weapons:readTable("weapons.json")
};

function keywordsOf(file){
  const out=new Set();
  try{
    const iptc=execFileSync("identify",["-format","%[IPTC:2:25]",file],{encoding:"utf8",stdio:["ignore","pipe","ignore"]});
    for(const k of iptc.split(/[;\n]/)) if(k.trim()) out.add(k.trim());
  }catch{}
  try{
    const xmp=execFileSync("convert",[file,"xmp:-"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]});
    for(const bag of xmp.matchAll(/<(dc:subject|lr:hierarchicalSubject)>([\s\S]*?)<\/\1>/g)){
      for(const li of bag[2].matchAll(/<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/g)) if(li[1].trim()) out.add(li[1].trim());
    }
  }catch{}
  return [...out];
}

function size(file){
  const [w,h]=execFileSync("identify",["-format","%w %h",file+"[0]"],{encoding:"utf8"}).trim().split(" ").map(Number);
  return {w,h};
}

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);
    return e.isDirectory()?walk(p):/\.(jpe?g|png|webp)$/i.test(e.name)?[p]:[];
  });
}

function writeBridgeKeywords(vocab){
  // Format d'import de Bridge (panneau Mots-clés → Importer) : une valeur par ligne, indentée par
  // des tabulations ; [Entre crochets] = catégorie non applicable, seules les valeurs se cochent.
  const lines=[];
  const block=(title,values)=>{ lines.push(`[${title}]`); for(const v of values) lines.push("\t"+v); };
  block("Peuple",vocab.people);
  block("Sexe",["F","M"]);
  block("Profil",vocab.profile);
  block("Magie",vocab.magic);
  lines.push("[Arme]");
  for(const c of vocab.weaponCategories){ lines.push("\t"+c); for(const w of vocab.weaponsByCategory[c]) lines.push("\t\t"+w); }
  block("Culture",vocab.culture);
  block("Origine",vocab.origin);
  block("Ascendance",vocab.ascendance);
  block("Alignement",vocab.alignment);
  fs.writeFileSync(BRIDGE_FILE,lines.join("\r\n")+"\r\n","utf8");
  console.log("Mots-clés Bridge : "+path.relative(ROOT,BRIDGE_FILE));
}

function main(){
  const vocab=catalog.vocabulary(reference);
  if(process.argv.includes("--bridge")) writeBridgeKeywords(vocab);
  const files=walk(SRC).map(file=>{
    const {w,h}=size(file);
    return {path:path.relative(SRC,file).split(path.sep).join("/"),abs:file,w,h,keywords:keywordsOf(file)};
  });
  const {avatars,warnings}=catalog.groupAvatarFiles(files,reference);

  fs.rmSync(OUT_IMG,{recursive:true,force:true});
  fs.mkdirSync(OUT_IMG,{recursive:true});
  const rows=[];
  for(const a of avatars){
    const full=`${a.id}_full.webp`, portrait=`${a.id}_portrait.webp`;
    execFileSync("convert",[a.files.full.abs,"-strip","-resize",`${FULL_WIDTH}x`,"-quality",String(QUALITY),path.join(OUT_IMG,full)]);
    execFileSync("convert",[a.files.portrait.abs,"-strip","-resize",`${PORTRAIT_SIZE}x${PORTRAIT_SIZE}^`,"-gravity","center","-extent",`${PORTRAIT_SIZE}x${PORTRAIT_SIZE}`,"-quality",String(QUALITY),path.join(OUT_IMG,portrait)]);
    rows.push({id:a.id,people:a.people,sex:a.sex,tags:a.tags,full,portrait,source:a.files.full.path});
  }

  const doc={
    source:"Généré par scripts/build-avatars.js depuis assets-src/avatars/ (tags Bridge d'Idan). Ne pas modifier à la main.",
    row_count:rows.length,
    rows
  };
  fs.writeFileSync(OUT_JSON,JSON.stringify(doc,null,2)+"\n","utf8");
  const byPeople={};
  for(const a of rows) byPeople[a.people]=(byPeople[a.people]||0)+1;
  console.log(`${rows.length} avatars :`,byPeople);
  if(warnings.length){ console.log(`\n${warnings.length} remarque(s) :`); for(const w of warnings) console.log(" - "+w); }
}

main();
