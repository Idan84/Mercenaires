#!/usr/bin/env node
"use strict";

// Mesures du besoin en avatars (game-core/avatar-demand.js ; Idan, 2026-10-30) : pour chaque culture et chaque ascendance
// possible, ce que tiennent en main les mercenaires tirés par le vrai générateur (arme précise ou école), une fois pour
// toutes. Écrit data/reference/avatar-demand.json, lu par l'onglet Avatars du Design Lab.
// À relancer quand la génération change (matrice, armes, compétences, ascendances…) : le Lab signale des mesures périmées.
//
// Usage : node scripts/build-avatar-demand.js                  (toutes les cultures, un processus par cœur)
//         node scripts/build-avatar-demand.js --draws 40000,8000   (tirages sans ascendance, par ascendance)

const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {fork}=require("node:child_process");

const ROOT=path.resolve(__dirname,"..");
const OUT=path.join(ROOT,"data","reference","avatar-demand.json");
const demand=require("../game-core/avatar-demand.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");

// Les mêmes tables, sous les mêmes noms, que le jeu (prototype-web/reference-data.js) : l'empreinte doit être identique.
function loadReference(){
  const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
  const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
  const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
  for(const key of demand.FINGERPRINT_TABLES) if(!files[key]) throw new Error(`Table ${key} absente de REFERENCE_FILES`);
  return Object.fromEntries(Object.entries(files).map(([key,file])=>[key,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"))]));
}

function parseDraws(argv){
  const i=argv.indexOf("--draws");
  const [none,ascendance]=(i>=0?argv[i+1]:"40000,8000").split(",").map(Number);
  if(!(none>0&&ascendance>0)) throw new Error("--draws attend deux nombres : sans ascendance, par ascendance");
  return {none,ascendance};
}

// Processus enfant : mesure une culture et renvoie le résultat.
if(process.argv[2]==="--child"){
  process.on("message",({people,culture,draws})=>{
    const reference=loadReference();
    const ascendances=demand.measureCulture({reference,people,culture,draws,
      createGenerator:random=>createGenerator(reference,{random,nameGenerator:(p,id)=>p+" "+id})});
    process.send({people,culture,ascendances});
    process.exit(0);
  });
  return;
}

const draws=parseDraws(process.argv);
const reference=loadReference();
const order=reference.peoples.rows.map(r=>r.nom);
const jobs=reference.cultures.rows
  .flatMap(c=>String(c.peuples||"").split(",").map(p=>p.trim()).filter(Boolean).map(people=>({people,culture:c.nom})))
  .filter(j=>order.includes(j.people))
  .sort((a,b)=>order.indexOf(a.people)-order.indexOf(b.people));
const started=Date.now();
const results=[];
let next=0;
function runOne(){
  if(next>=jobs.length) return Promise.resolve();
  const job=jobs[next++];
  return new Promise((resolve,reject)=>{
    const child=fork(__filename,["--child"]);
    child.once("message",result=>{
      results.push(result);
      console.log(`${results.length}/${jobs.length} ${job.culture} (${Math.round((Date.now()-started)/1000)} s)`);
    });
    child.once("exit",code=>code===0?resolve():reject(new Error(`${job.culture} : sortie ${code}`)));
    child.send({...job,draws});
  }).then(runOne);
}
Promise.all(Array.from({length:Math.max(1,Math.min(os.cpus().length,jobs.length))},runOne)).then(()=>{
  results.sort((a,b)=>jobs.findIndex(j=>j.culture===a.culture&&j.people===a.people)-jobs.findIndex(j=>j.culture===b.culture&&j.people===b.people));
  const out={
    description:"Besoin en avatars : pour chaque culture et chaque ascendance possible (null = sans ascendance), ce que tiennent en main les mercenaires tirés par le générateur du jeu (profil, arme précise ou école) et combien de fois. Généré par scripts/build-avatar-demand.js, ne pas éditer.",
    generated_on:new Date().toISOString().slice(0,10),
    fingerprint:demand.fingerprint(reference),
    draws,
    rows:results
  };
  fs.writeFileSync(OUT,JSON.stringify(out,null,1)+"\n");
  console.log(`Écrit ${path.relative(ROOT,OUT)} : ${results.length} cultures, empreinte ${out.fingerprint}`);
}).catch(error=>{ console.error(error); process.exit(1); });
