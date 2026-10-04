#!/usr/bin/env node
"use strict";

// Avatars des mercenaires : masters d'Idan (assets-src/avatars/, tagués dans Bridge)
// → catalogue du jeu (data/reference/avatars.json) et images web (prototype-web/assets/avatars/).
//
// - Un avatar = un plein pied (image haute) + un portrait (image carrée) portant le même
//   peuple et le même numéro dans le nom : « Ogre_12_….jpg » et « Ogre_12_Square_….jpg ».
//   Le portrait est reconnu à sa forme carrée, pas à son nom.
// - Les tags sont les mots-clés de l'image (IPTC et XMP, ceux qu'écrit Bridge). Chaque mot-clé
//   est rangé dans sa famille (peuple, sexe, culture, origine, alignement, ascendance, profil,
//   magie, arme) d'après les référentiels de data/reference/. Un mot-clé inconnu est signalé.
// - L'identifiant (« ogre-012 ») ne dépend que du peuple et du numéro : retaguer ou renommer
//   une image ne change pas l'avatar des parties sauvegardées.
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

const rows=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8")).rows;
const norm=v=>String(v??"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[’‘`´]/g,"'")
  .toLowerCase().replace(/\s+/g," ").trim();
const slug=v=>norm(v).replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");

// Vocabulaire : famille → valeurs de référence.
const PROFILES={"Corps à corps":"melee","Distance":"ranged","Magie":"magic"};
const SEXES={femme:["F","Femme","Femelle"],homme:["M","H","Homme","Masculin","Mâle"]};
function vocabulary(){
  const weapons=rows("weapons.json");
  const weaponCategories=[...new Set(weapons.map(w=>String(w.domaine||"").split(",")[0].trim()).filter(Boolean))].sort();
  return {
    people:rows("peoples.json").map(r=>r.nom),
    culture:rows("cultures.json").map(r=>r.nom),
    origin:rows("social-origins.json").map(r=>r.nom),
    alignment:rows("alignments.json").map(r=>r.nom),
    ascendance:rows("ancestries.json").map(r=>r.nom),
    profile:Object.keys(PROFILES),
    magic:rows("skills.json").filter(r=>r.domaine==="Magie").map(r=>r.nom),
    weaponCategories,
    weapon:[...weaponCategories,...weapons.map(w=>w.nom)],
    weaponsByCategory:Object.fromEntries(weaponCategories.map(c=>[c,weapons.filter(w=>String(w.domaine).startsWith(c+",")).map(w=>w.nom)]))
  };
}

// Mot-clé → {family, value}. Accepte « Famille|Valeur » (mots-clés hiérarchiques) et les pluriels simples.
function classifier(vocab){
  const index=new Map();
  const add=(family,label,value=label)=>index.set(norm(label),{family,value});
  for(const family of ["people","culture","origin","alignment","ascendance","magic","weapon"]) for(const v of vocab[family]) add(family,v);
  for(const [label,code] of Object.entries(PROFILES)) add("profile",label,code);
  for(const [sex,labels] of Object.entries(SEXES)) for(const l of labels) add("sex",l,sex);
  const singular=k=>k.split(/([ -])/).map(w=>w.length>3?w.replace(/[sx]$/,""):w).join("");
  return keyword=>{
    const last=String(keyword).split("|").pop();
    const k=norm(last);
    return index.get(k)||index.get(singular(k))||null;
  };
}

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
  const vocab=vocabulary();
  if(process.argv.includes("--bridge")) writeBridgeKeywords(vocab);
  const classify=classifier(vocab);
  const groups=new Map(), warnings=[];
  for(const file of walk(SRC).sort()){
    const rel=path.relative(SRC,file);
    const match=path.basename(file).match(/^(.+?)_(\d+)(?:_|\.|$)/);
    if(!match){ warnings.push(`${rel} : nom sans « Peuple_Numéro », ignoré`); continue; }
    const folder=path.dirname(rel).split(path.sep)[0];
    const people=classify(match[1])?.family==="people"?classify(match[1]).value
      :classify(folder)?.family==="people"?classify(folder).value:null;
    if(!people){ warnings.push(`${rel} : peuple inconnu (« ${match[1]} »), ignoré`); continue; }
    const id=`${slug(people)}-${String(Number(match[2])).padStart(3,"0")}`;
    const {w,h}=size(file);
    const kind=Math.abs(w-h)<=w*0.05?"portrait":"full";
    const g=groups.get(id)||{id,people,files:{},keywords:new Set()};
    if(g.files[kind]) warnings.push(`${id} : deux images « ${kind} » (${path.relative(SRC,g.files[kind])}, ${rel})`);
    g.files[kind]=file;
    for(const k of keywordsOf(file)) g.keywords.add(k);
    groups.set(id,g);
  }

  fs.rmSync(OUT_IMG,{recursive:true,force:true});
  fs.mkdirSync(OUT_IMG,{recursive:true});
  const catalog=[];
  for(const g of [...groups.values()].sort((a,b)=>a.id.localeCompare(b.id))){
    if(!g.files.full||!g.files.portrait){ warnings.push(`${g.id} : il manque le ${g.files.full?"portrait":"plein pied"}, ignoré`); continue; }
    const tags={culture:[],origin:[],alignment:[],ascendance:[],profile:[],magic:[],weapon:[]};
    let sex=null;
    for(const k of g.keywords){
      const c=classify(k);
      if(!c){ warnings.push(`${g.id} : mot-clé inconnu « ${k} »`); continue; }
      if(c.family==="people"){ if(c.value!==g.people) warnings.push(`${g.id} : tag peuple « ${k} » ≠ ${g.people}`); continue; }
      if(c.family==="sex"){ if(sex&&sex!==c.value) warnings.push(`${g.id} : deux sexes tagués`); sex=c.value; continue; }
      if(!tags[c.family].includes(c.value)) tags[c.family].push(c.value);
    }
    if(tags.magic.length&&!tags.profile.length) tags.profile.push("magic");
    for(const k of Object.keys(tags)) if(!tags[k].length) delete tags[k];
    const full=`${g.id}_full.webp`, portrait=`${g.id}_portrait.webp`;
    execFileSync("convert",[g.files.full,"-strip","-resize",`${FULL_WIDTH}x`,"-quality",String(QUALITY),path.join(OUT_IMG,full)]);
    execFileSync("convert",[g.files.portrait,"-strip","-resize",`${PORTRAIT_SIZE}x${PORTRAIT_SIZE}^`,"-gravity","center","-extent",`${PORTRAIT_SIZE}x${PORTRAIT_SIZE}`,"-quality",String(QUALITY),path.join(OUT_IMG,portrait)]);
    catalog.push({id:g.id,people:g.people,sex,tags,full,portrait,source:path.relative(SRC,g.files.full).split(path.sep).join("/")});
  }

  const doc={
    source:"Généré par scripts/build-avatars.js depuis assets-src/avatars/ (tags Bridge d'Idan). Ne pas modifier à la main.",
    row_count:catalog.length,
    rows:catalog
  };
  fs.writeFileSync(OUT_JSON,JSON.stringify(doc,null,2)+"\n","utf8");
  const byPeople={};
  for(const a of catalog) byPeople[a.people]=(byPeople[a.people]||0)+1;
  console.log(`${catalog.length} avatars :`,byPeople);
  if(warnings.length){ console.log(`\n${warnings.length} remarque(s) :`); for(const w of warnings) console.log(" - "+w); }
}

main();
