#!/usr/bin/env node
"use strict";

// Étalonnage des titres des mercenaires (game-core/mercenary-profile.js ; Idan, 2026-10-31). Génère des recrues avec le
// vrai générateur et leur équipement de départ, puis :
// - l'étalon (adversaire de mesure) prend leurs caractéristiques médianes ;
// - pour chaque source de mesure, les recrues se répartissent dans les niveaux comme leur réputation (même part au
//   niveau 1, 2, 3…) ; au-delà du niveau de la meilleure recrue, chaque niveau demande × progression (1,25, comme la
//   réputation) ; une source de sorts mesurée chez trop peu de recrues prend les seuils de sa famille ;
// - compte les titres obtenus (Chair à canon, 1 à 3 titres, catégories, sous-catégories).
// Écrit etalon.caracteristiques, seuils et mesure dans data/reference/mercenary-profile.json (le reste est écrit à la main).
// À relancer quand la génération, le combat, les sorts ou les sous-catégories changent.
//
// Usage : node scripts/build-mercenary-profile.js [--recruits 4000] [--check]

const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createMagicRules}=require("../game-core/magic.js");
const {createStarRules}=require("../game-core/stars.js");
const {createProfileRules}=require("../game-core/mercenary-profile.js");

const ROOT=path.resolve(__dirname,"..");
const OUT=path.join(ROOT,"data","reference","mercenary-profile.json");
const SEED=20261031;

// Les mêmes tables, sous les mêmes noms, que le jeu (prototype-web/reference-data.js).
function loadReference(){
  const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
  const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
  const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
  if(!files.mercenaryProfile) throw new Error("Table mercenaryProfile absente de REFERENCE_FILES");
  return Object.fromEntries(Object.entries(files).map(([key,file])=>[key,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"))]));
}

const argv=process.argv.slice(2);
const count=Number(argv[argv.indexOf("--recruits")+1])||(argv.includes("--recruits")?0:4000);
if(!(count>0)) throw new Error("--recruits attend un nombre");

const reference=loadReference();
let seed=SEED;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
Math.random=random;
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});
const recruits=Array.from({length:count},(_,i)=>generator.createMercenary({id:i+2,captain}));

// Réputation des recrues : part à chaque niveau.
const stars=createStarRules({reference});
const repLevels=recruits.map(m=>stars.personal(m.reputation).level);
const maxRecruitLevel=Math.max(...repLevels);
const share=level=>repLevels.filter(l=>l<=level).length/repLevels.length;

// L'étalon : caractéristiques médianes.
const median=values=>{ const a=[...values].sort((x,y)=>x-y); return a[a.length>>1]; };
const data=reference.mercenaryProfile;
data.etalon.caracteristiques=Object.fromEntries(Object.keys(recruits[0].stats).map(stat=>[stat,Math.round(median(recruits.map(m=>Number(m.stats[stat])||0)))]));
data.seuils={};

const engine=createCombatEngine(reference,{});
const magic=createMagicRules({reference,combat:engine});
let profile=createProfileRules({reference,engine,magic});
const measures=recruits.map(m=>profile.measure(m));

// Seuils : niveau k atteint à la part de recrues dont la réputation est sous k ; puis × progression par niveau.
const progression=Number(data.selection?.progression)||1.25;
const minSample=Number(data.selection?.echantillon_min)||30;
function thresholds(values){
  values=values.filter(v=>v!=null&&Number.isFinite(v)).sort((a,b)=>a-b);
  const quantile=p=>values[Math.min(values.length-1,Math.max(0,Math.floor(p*values.length)))];
  const steps=[];
  for(let level=2;level<=15;level++){
    let min=level<=maxRecruitLevel?quantile(share(level-1)):steps[steps.length-1]*progression;
    // Arrondi au millième, toujours croissant (un petit échantillon peut donner deux fois la même valeur).
    let step=Math.round(min*1000)/1000;
    if(steps.length&&step<=steps[steps.length-1]) step=Math.round((steps[steps.length-1]+0.001)*1000)/1000;
    steps.push(step);
  }
  return steps;
}
const keys=[...new Set(measures.flatMap(m=>Object.keys(m)))].sort();
const kindOf=key=>profile.categories.flatMap(c=>c.sous).find(sub=>"sorts:"+sub.key===key)?.sorts;
const pools={};
const samples={};
for(const key of keys){
  const values=measures.map(m=>m[key]).filter(v=>v!=null);
  samples[key]=values.length;
  if(key.startsWith("sorts:")) (pools["sorts_"+kindOf(key)]||=[]).push(...values);
  if(values.length>=minSample) data.seuils[key]=thresholds(values);
}
for(const [key,values] of Object.entries(pools)) data.seuils[key]=thresholds(values);

// Catégories : leur meilleure sous-catégorie, étalonnée à son tour, pour que chacune sorte aussi souvent chez ceux qui la
// pratiquent, quel que soit son nombre de sources.
profile=createProfileRules({reference,engine,magic});
const raws={};
for(const m of recruits) for(const cat of profile.evaluate(m).categories) (raws[cat.code]||=[]).push(cat.raw);
for(const [code,values] of Object.entries(raws)) data.seuils["categorie:"+code]=thresholds(values);

// Vérification : titres des recrues.
profile=createProfileRules({reference,engine,magic});
const pct=n=>Math.round(1000*n/count)/10;
const counts={},byCategory={},bySub={},bestByRep={};
let specific=0,titled=0;
recruits.forEach((m,i)=>{
  const result=profile.evaluate(m);
  counts[result.titles.length]=(counts[result.titles.length]||0)+1;
  for(const t of result.titles){
    titled++;
    byCategory[t.categoryName]=(byCategory[t.categoryName]||0)+1;
    if(t.sub){ specific++; bySub[t.label]=(bySub[t.label]||0)+1; }
  }
  const rep=repLevels[i];
  (bestByRep[rep]||=[]).push(result.categories[0]?.level||0);
});
const sorted=obj=>Object.fromEntries(Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([k,n])=>[k,pct(n)]));
data.mesure={
  date:new Date().toISOString().slice(0,10),
  recrues:count,
  graine:SEED,
  reputation:Object.fromEntries([...new Set(repLevels)].sort((a,b)=>a-b).map(l=>[l,pct(repLevels.filter(x=>x===l).length)])),
  titres:{chair_a_canon:pct(counts[0]||0),un:pct(counts[1]||0),deux:pct(counts[2]||0),trois:pct(counts[3]||0)},
  categories_des_titres:sorted(byCategory),
  titres_specifiques:Math.round(1000*specific/Math.max(1,titled))/10,
  sous_categories:sorted(bySub),
  meilleure_categorie_par_reputation:Object.fromEntries(Object.entries(bestByRep).map(([rep,list])=>[rep,Math.round(100*list.reduce((s,v)=>s+v,0)/list.length)/100])),
  echantillons:samples
};

// --check (garde-fou de la publication) : l'étalonnage du fichier doit être celui que donnent les règles d'aujourd'hui ; un
// rééquilibrage du combat, des sorts ou de la génération oblige à relancer ce script.
if(argv.includes("--check")){
  const saved=JSON.parse(fs.readFileSync(OUT,"utf8"));
  const close=(a,b)=>typeof a==="number"&&typeof b==="number"?Math.abs(a-b)<=Math.max(0.0011,1e-4*Math.abs(a)):JSON.stringify(a)===JSON.stringify(b);
  const diff=[];
  for(const [key,steps] of Object.entries(data.seuils)){
    const old=saved.seuils?.[key];
    if(!old||old.length!==steps.length||steps.some((v,i)=>!close(v,old[i]))) diff.push(key);
  }
  for(const key of Object.keys(saved.seuils||{})) if(!data.seuils[key]) diff.push(key);
  for(const [stat,value] of Object.entries(data.etalon.caracteristiques)) if(!close(value,saved.etalon?.caracteristiques?.[stat])) diff.push("etalon."+stat);
  if(diff.length){
    console.error("Étalonnage des titres périmé ("+diff.slice(0,8).join(", ")+(diff.length>8?"…":"")+") : relancer node scripts/build-mercenary-profile.js");
    process.exit(1);
  }
  console.log("Étalonnage des titres à jour.");
  process.exit(0);
}

// Écriture : tableaux de seuils sur une ligne.
let json=JSON.stringify(data,null,2)+"\n";
json=json.replace(/\[\n\s+([-\d.,\s]+?)\n\s+\]/g,(match,inner)=>"["+inner.split(/,\s*/).join(", ")+"]");
fs.writeFileSync(OUT,json);
console.log("Recrues :",count,"· réputation (%) :",JSON.stringify(data.mesure.reputation));
console.log("Titres (%) :",JSON.stringify(data.mesure.titres));
console.log("Catégories des titres (%) :",JSON.stringify(data.mesure.categories_des_titres));
console.log("Titres spécifiques (%) :",data.mesure.titres_specifiques,"·",JSON.stringify(data.mesure.sous_categories));
console.log("Meilleure catégorie par réputation :",JSON.stringify(data.mesure.meilleure_categorie_par_reputation));
console.log("Échantillons :",JSON.stringify(samples));
