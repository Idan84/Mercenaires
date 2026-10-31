#!/usr/bin/env node
"use strict";

// Étalonnage de l'évaluation des mercenaires (game-core/mercenary-profile.js ; Idan, 2026-10-31 : « la réputation doit
// être en gros au barycentre de nos résultats »). Génère des recrues avec le vrai générateur et leur équipement de
// départ, puis :
// - l'étalon (adversaire de mesure) prend leurs caractéristiques médianes ;
// - pour chaque facette, les recrues se répartissent dans les niveaux comme leur réputation (même part au niveau 1, 2, 3…) ;
//   au-delà du niveau de la meilleure recrue, chaque niveau demande × progression (1,25, comme la réputation) ;
// - vérifie que la moyenne de leurs facettes tombe sur leur niveau de réputation.
// Écrit etalon.caracteristiques, seuils et mesure dans data/reference/mercenary-profile.json (le reste est écrit à la main).
// À relancer quand la génération, le combat ou les facettes changent.
//
// Usage : node scripts/build-mercenary-profile.js [--recruits 4000]

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
for(const facet of data.facettes){
  const values=measures.map(v=>v[facet.code]).filter(v=>v!=null&&Number.isFinite(v)).sort((a,b)=>a-b);
  if(!values.length) throw new Error("Aucune recrue ne mesure la facette "+facet.code);
  const quantile=p=>values[Math.min(values.length-1,Math.max(0,Math.floor(p*values.length)))];
  const steps=[];
  for(let level=2;level<=15;level++){
    let min=level<=maxRecruitLevel?quantile(share(level-1)):steps[steps.length-1]*progression;
    if(steps.length&&min<=steps[steps.length-1]) min=steps[steps.length-1]*1.0001+1e-6;
    steps.push(Math.round(min*1000)/1000);
  }
  data.seuils[facet.code]=steps;
}

// Vérification : moyenne des facettes de chaque recrue contre son niveau de réputation.
profile=createProfileRules({reference,engine,magic});
let gap=0,absGap=0,within1=0;
const titles={},forts={},faibles={};
recruits.forEach((m,i)=>{
  const result=profile.evaluate(m);
  const d=result.mean-repLevels[i];
  gap+=d; absGap+=Math.abs(d); if(Math.abs(d)<=1) within1++;
  titles[result.title.key]=(titles[result.title.key]||0)+1;
  forts[result.strengths.length]=(forts[result.strengths.length]||0)+1;
  faibles[result.weaknesses.length]=(faibles[result.weaknesses.length]||0)+1;
});
const pct=n=>Math.round(1000*n/count)/10;
data.mesure={
  date:new Date().toISOString().slice(0,10),
  recrues:count,
  graine:SEED,
  reputation:Object.fromEntries([...new Set(repLevels)].sort((a,b)=>a-b).map(l=>[l,pct(repLevels.filter(x=>x===l).length)])),
  barycentre:{ecart_moyen:Math.round(100*gap/count)/100,ecart_absolu_moyen:Math.round(100*absGap/count)/100,a_un_niveau_pres:pct(within1)},
  titres:Object.fromEntries(Object.entries(titles).sort((a,b)=>b[1]-a[1]).map(([k,n])=>[k,pct(n)])),
  points_forts:Object.fromEntries(Object.entries(forts).map(([k,n])=>[k,pct(n)])),
  points_faibles:Object.fromEntries(Object.entries(faibles).map(([k,n])=>[k,pct(n)]))
};

// Écriture : tableaux de seuils sur une ligne.
let json=JSON.stringify(data,null,2)+"\n";
json=json.replace(/\[\n\s+([-\d.,\s]+?)\n\s+\]/g,(match,inner)=>"["+inner.split(/,\s*/).join(", ")+"]");
fs.writeFileSync(OUT,json);
console.log("Recrues :",count,"· réputation (%) :",JSON.stringify(data.mesure.reputation));
console.log("Barycentre : écart moyen",data.mesure.barycentre.ecart_moyen,"· écart absolu",data.mesure.barycentre.ecart_absolu_moyen,"· à un niveau près",data.mesure.barycentre.a_un_niveau_pres+" %");
console.log("Titres (%) :",JSON.stringify(data.mesure.titres));
console.log("Points forts (%) :",JSON.stringify(data.mesure.points_forts),"· points faibles (%) :",JSON.stringify(data.mesure.points_faibles));
