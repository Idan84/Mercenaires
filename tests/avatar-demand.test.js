"use strict";

// Besoin en avatars (Idan, 2026-10-30) : N mercenaires d'une culture, seuils S, un avatar par case, repli sur le profil.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const demand=require("../game-core/avatar-demand.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");

const ROOT=path.resolve(__dirname,"..");
// Les tables du jeu sous leurs noms (prototype-web/reference-data.js), comme scripts/build-avatar-demand.js.
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const load=()=>Object.fromEntries(Object.entries(files).map(([key,file])=>[key,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"))]));
const reference=load();

// Réglages (formula-constants.json).
assert.deepEqual(demand.settingsOf(reference),{mercenaries:50,threshold:0.1,thresholdAscendance:0.2,fallbackFactor:2});

// Loi binomiale : besoin = plus petit nombre d'avatars tel que le risque d'en manquer reste sous S.
assert.equal(demand.binomialNeed(0,50,0.1),0);
assert.equal(demand.binomialNeed(0.01,100,0.05),3,"1 % sur 100 tirages, S = 5 % : 3 avatars");
assert.equal(demand.binomialNeed(0.1,100,0.1),14);
assert.equal(demand.binomialNeed(0.001,100,0.1),0,"case trop rare : repli direct");
for(const [p,n,s] of [[0.32,50,0.1],[0.036,50,0.2],[0.004,50,0.1]]){
  const need=demand.binomialNeed(p,n,s);
  assert.ok(demand.riskAbove(p,n,need)<=s+1e-12);
  if(need>0) assert.ok(demand.riskAbove(p,n,need-1)>s);
}

// Débordement d'un groupe : une seule case avec a avatars précis → P(Y > f) = P(X > a + f).
{
  const py=demand.overflowDistribution([{p:0.2,assigned:3}],50);
  assert.ok(Math.abs(py.reduce((s,x)=>s+x,0)-1)<1e-9);
  const tail=f=>py.slice(f+1).reduce((s,x)=>s+x,0);
  for(const f of [0,1,4]) assert.ok(Math.abs(tail(f)-demand.riskAbove(0.2,50,3+f))<1e-9);
  // Deux cases sans avatar précis : leurs mercenaires débordent tous, comme une seule case de part p1 + p2.
  const two=demand.overflowDistribution([{p:0.1,assigned:0},{p:0.05,assigned:0}],50);
  const one=demand.overflowDistribution([{p:0.15,assigned:0}],50);
  assert.ok(two.every((x,i)=>Math.abs(x-one[i])<1e-12));
}

// Parts d'ascendance exactes : sans ascendance 80 % chez les nains, le reste au poids relatif.
{
  const shares=new Map(demand.ascendanceShares(reference,"Nain"));
  assert.ok(Math.abs(shares.get(null)-0.8)<1e-12);
  assert.ok(Math.abs([...shares.values()].reduce((s,x)=>s+x,0)-1)<1e-12);
  assert.ok(shares.get("Sang d’humain")>shares.get("Sang de dragon"),"poids 3 contre 2");
}

// Niveau d'ascendance tiré comme dans le jeu quand on impose l'ascendance (« draw »).
{
  let s=3;
  const generator=createGenerator(reference,{random:()=>(s=(s*16807)%2147483647)/2147483647,nameGenerator:(p,i)=>p+i});
  const levels=new Set(Array.from({length:200},(_,i)=>generator.createMercenary({id:i+1,forcedPeople:"Nain",forcedCulture:"Nains du chaos",
    forcedAscendance:"Sang de dragon",forcedAscendanceLevel:"draw"}).ascendanceLevel));
  assert.deepEqual([...levels].sort(),[1,2,3]);
}

// Empreinte : la même avant et après avoir généré des mercenaires ; change avec la matrice de génération.
{
  const before=demand.fingerprint(reference);
  let s=9;
  const generator=createGenerator(reference,{random:()=>(s=(s*16807)%2147483647)/2147483647,nameGenerator:(p,i)=>p+i});
  for(let i=0;i<20;i++) generator.createMercenary({id:i+1,forcedPeople:"Ogre"});
  assert.equal(demand.fingerprint(reference),before);
  const changed=load();
  changed.generationMatrix.rows[0]={...changed.generationMatrix.rows[0],nain:9};
  assert.notEqual(demand.fingerprint(changed),before);
  const other=load();
  other.formulaConstants.rows.push({code:"tavern.test",valeur:1});
  assert.equal(demand.fingerprint(other),before,"une constante hors génération ne périme pas les mesures");
}

// Mesure : mêmes tirages à chaque fois (graine par culture et ascendance), une ligne par ascendance possible.
{
  const make=random=>createGenerator(reference,{random,nameGenerator:(p,i)=>p+i});
  const a=demand.measureCulture({reference,createGenerator:make,people:"Nain",culture:"Nains du chaos",draws:{none:60,ascendance:20}});
  const b=demand.measureCulture({reference,createGenerator:make,people:"Nain",culture:"Nains du chaos",draws:{none:60,ascendance:20}});
  assert.deepEqual(a,b);
  assert.deepEqual(a.map(x=>x.ascendance),demand.ascendanceShares(reference,"Nain").map(([name])=>name));
  assert.equal(a[0].looks.reduce((s,l)=>s+l.count,0),60);
  assert.ok(a[0].looks.every(l=>["melee","ranged","magic"].includes(l.profile)&&l.value));
}

// Calcul sur des mesures et un catalogue fabriqués.
const measures={fingerprint:demand.fingerprint(reference),generated_on:"2026-10-30",rows:[{people:"Nain",culture:"Nains du chaos",ascendances:[
  {ascendance:null,draws:1000,looks:[{profile:"ranged",value:"Arquebuse",count:500},{profile:"melee",value:"Hache de guerre",count:300},
    {profile:"magic",value:"Feu",count:198},{profile:"magic",value:"Vie",count:2}]},
  // Distance chez les dragons : quatre cases trop rares, mais leur groupe de repli a besoin d'un avatar.
  {ascendance:"Sang de dragon",draws:100,looks:[{profile:"melee",value:"Hache de guerre",count:64},{profile:"ranged",value:"Arquebuse",count:9},
    {profile:"ranged",value:"Arbalète",count:9},{profile:"ranged",value:"Fronde",count:9},{profile:"ranged",value:"Tromblon",count:9}]}
]}]};
const av=(id,tags,extra={})=>({id,people:"Nain",full:id+".jpg",portrait:id+"_p.jpg",tags:{culture:["Nains du chaos"],...tags},...extra});
const catalog=[
  av("arq-1",{profile:["ranged"],weapon:["Arquebuse"]}),
  av("arq-2",{profile:["ranged"],weapon:["Arquebuse"]}),
  av("tir",{profile:["ranged"],weapon:["Armes de tir"]}),                       // catégorie : repli seulement
  av("hache",{profile:["melee"],weapon:["Hache de guerre"]}),
  av("deux",{profile:["melee","ranged"],weapon:["Hache de guerre","Arquebuse"]}), // deux cases possibles, une seule prise
  av("dragon",{profile:["melee"],weapon:["Hache de guerre"],ascendance:["Sang de dragon"]},{ascendanceOnly:true}),
  av("dragon-epee-1",{profile:["melee"],weapon:["Épée longue"],ascendance:["Sang de dragon"]},{ascendanceOnly:true}),
  av("dragon-epee-2",{profile:["melee"],weapon:["Épée longue"],ascendance:["Sang de dragon"]},{ascendanceOnly:true}),
  av("autre",{profile:["melee"],weapon:["Hache de guerre"],culture:["Nains des montagnes"]}),
  av("ogre",{profile:["melee"],weapon:["Hache de guerre"]},{people:"Ogre"})
];
const model=demand.createDemand({reference,measures,catalog});
assert.equal(model.stale,false);
assert.deepEqual(model.cultures,[{people:"Nain",culture:"Nains du chaos"}]);
assert.equal(model.forCulture("Inconnue"),null);
const chaos=model.forCulture("Nains du chaos");
assert.equal(chaos.avatars,8,"avatars du peuple et de la culture");
const cell=(ascendance,value)=>chaos.cells.find(c=>c.ascendance===ascendance&&c.value===value);
const arquebuse=cell(null,"Arquebuse");
assert.ok(Math.abs(arquebuse.p-0.4)<1e-12,"80 % sans ascendance × 50 %");
assert.equal(arquebuse.need,demand.binomialNeed(0.4,50,0.1));
const dragonShare=new Map(demand.ascendanceShares(reference,"Nain")).get("Sang de dragon");
assert.equal(cell("Sang de dragon","Hache de guerre").need,demand.binomialNeed(dragonShare*0.64,50,0.2));
assert.equal(cell(null,"Vie"),undefined,"case trop rare : pas de besoin précis");
assert.ok(chaos.rare>0);
// Chaque avatar ne sert qu'une fois, précis ou repli.
const used=[...chaos.cells.flatMap(c=>c.avatars),...chaos.groups.flatMap(g=>g.avatars)];
assert.equal(new Set(used).size,used.length);
assert.ok(!used.includes("autre")&&!used.includes("ogre"));
assert.ok(!chaos.cells.some(c=>c.avatars.includes("tir")),"une catégorie d'arme ne vaut pas une arme précise");
assert.equal(arquebuse.assigned+cell(null,"Hache de guerre").assigned,4,"arq-1, arq-2, hache et « deux » dans l'une des deux cases");
// Couleurs : vert si assez d'avatars précis ; orange si le repli du groupe suffit (risque ≤ 2 × S) ; rouge sinon.
for(const c of chaos.cells){
  const g=chaos.groups.find(x=>x.ascendance===c.ascendance&&x.profile===c.profile);
  assert.equal(c.color,c.assigned>=c.need?"vert":g.ok?"orange":"rouge");
}
const dragon=cell("Sang de dragon","Hache de guerre");
assert.equal(dragon.assigned,1);
assert.ok(dragon.need>1);
const dragonGroup=chaos.groups.find(g=>g.ascendance==="Sang de dragon"&&g.profile==="melee");
assert.deepEqual(dragonGroup.avatars.sort(),["dragon-epee-1","dragon-epee-2"].slice(0,dragonGroup.need).sort(),"épées de dragon en repli");
assert.equal(dragon.color,dragonGroup.ok?"orange":"rouge");
assert.equal(dragonGroup.ok,dragonGroup.risk<=0.4+1e-12,"repli à 2 × 20 %");
assert.equal(chaos.summary.cells,chaos.cells.length);
// Groupe de repli en manque sans case rouge (cases trop rares) : compté comme une case rouge, à produire « toute arme ».
const dragonRanged=chaos.groups.find(g=>g.ascendance==="Sang de dragon"&&g.profile==="ranged");
assert.ok(!chaos.cells.some(c=>c.ascendance==="Sang de dragon"&&c.profile==="ranged"),"cases trop rares");
assert.equal(dragonRanged.need,1);
assert.equal(dragonRanged.assigned,0);
assert.equal(dragonRanged.ok,false);
assert.equal(dragonRanged.alone,true);
for(const g of chaos.groups) assert.equal(g.alone,!g.ok&&!chaos.cells.some(c=>c.ascendance===g.ascendance&&c.profile===g.profile&&c.color==="rouge"));
assert.equal(chaos.summary.redGroups,chaos.groups.filter(g=>g.alone).length);
assert.equal(chaos.summary.green+chaos.summary.orange+chaos.summary.red,chaos.cells.length+chaos.summary.redGroups);
assert.equal(chaos.summary.missingPrecise,chaos.cells.reduce((s,c)=>s+Math.max(0,c.need-c.assigned),0));
assert.equal(chaos.summary.missingAlone,chaos.groups.filter(g=>g.alone).reduce((s,g)=>s+g.need-g.assigned,0));
assert.equal(chaos.summary.toProduce,chaos.summary.missingPrecise+chaos.summary.missingAlone);
assert.ok(chaos.summary.missingAlone>=1);
assert.deepEqual(chaos.unmeasured.sort(),["Sang de djinn","Sang de démon","Sang divin","Sang d’humain"].sort(),"ascendances sans mesure signalées");
assert.equal(demand.createDemand({reference,measures:{...measures,fingerprint:"00000000"},catalog}).stale,true);

// Les mesures du dépôt : toutes les cultures, toutes leurs ascendances.
const real=JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference","avatar-demand.json"),"utf8"));
for(const c of reference.cultures.rows){
  const row=real.rows.find(r=>r.culture===c.nom);
  assert.ok(row,`mesures de ${c.nom}`);
  assert.deepEqual(row.ascendances.map(a=>a.ascendance),demand.ascendanceShares(reference,row.people).map(([name])=>name),c.nom);
  for(const a of row.ascendances) assert.equal(a.looks.reduce((s,l)=>s+l.count,0),a.draws);
}
if(real.fingerprint!==demand.fingerprint(reference))
  console.warn("Attention : la génération a changé depuis les mesures du "+real.generated_on+" — relancer node scripts/build-avatar-demand.js");
// Ordre de grandeur (Idan, 2026-10-30) : environ 85 avatars précis par culture naine pour 50 nains, 10 % / 20 %.
const live=demand.createDemand({reference,measures:real,catalog:[]});
for(const culture of ["Nains des montagnes","Nains du chaos","Nains esclaves"]){
  const need=live.forCulture(culture).summary.need;
  assert.ok(need>=70&&need<=105,culture+" : "+need);
}

console.log("Besoin en avatars : binomiale, mesures figées, un avatar par case, repli sur le profil, couleurs, groupes de repli sans case — OK");
