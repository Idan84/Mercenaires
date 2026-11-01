"use strict";

// Domaine du mercenaire (Idan, 2026-11-01) : après les tirages, un grand domaine — Corps à corps, Distance ou Mage —, fixé
// à vie, puis accentué par des déplacements (dosage B : 2D6 sur les caractéristiques, 2D10 sur les compétences, en plus
// et en moins). Un sort tiré pousse vers Mage quand c'est serré ; on pousse l'arme ou l'école qu'il utilise vraiment.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.domains,"domains.json","le jeu charge domains.json");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
let seed=1101;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});

// Les trois domaines : ce qui monte, ce qui baisse.
const domains=reference.domains.rows;
assert.deepEqual(domains.map(d=>d.code),["melee","ranged","magic"]);
assert.deepEqual(domains.map(d=>d.nom),["Corps à corps","Distance","Mage"]);
for(const d of domains){ assert.equal(d.plus.length,2); assert.equal(d.moins.length,2); assert.ok(d.description); }

const captain=generator.createCaptain({id:1});
assert.ok(["melee","ranged","magic"].includes(captain.domain),"le capitaine aussi");
const recruits=Array.from({length:600},(_,i)=>generator.createMercenary({id:i+2,captain}));
const shares=Object.fromEntries(domains.map(d=>[d.code,recruits.filter(m=>m.domain===d.code).length/recruits.length]));
for(const [code,share] of Object.entries(shares)) assert.ok(share>0.1,"chaque domaine existe : "+code);
let statDelta=0;
for(const m of recruits){
  const t=m.generationTrace.domain,row=domains.find(d=>d.code===m.domain);
  assert.equal(t.code,m.domain);
  // L'équipement de départ (et donc l'avatar) suit le domaine.
  assert.equal(m.equipment.profile.type,m.domain,m.name);
  // Caractéristiques : 2D6 en plus sur les deux du domaine, 2D6 en moins sur deux autres (au plancher près).
  for(const name of row.plus){
    const c=m.generationTrace.characteristics[name].contributions.find(x=>x.kind==="domain");
    assert.ok(c&&c.dice==="2D6"&&c.delta>=2&&c.delta<=12,name);
  }
  for(const name of row.moins){
    const c=m.generationTrace.characteristics[name].contributions.find(x=>x.kind==="domain");
    assert.ok(c&&c.dice==="2D6"&&c.delta<=0&&c.delta>=-12,name);
  }
  statDelta+=t.moves.filter(x=>x.target in m.stats).reduce((s,x)=>s+x.delta,0);
  // Le sort pousse vers Mage seulement quand c'est serré (5 points).
  if(t.tippedBySpell){ assert.equal(m.domain,"magic"); assert.ok(m.spells.length>0); assert.ok(t.scores.magic>=Math.max(t.scores.melee,t.scores.ranged)-5); }
}
assert.ok(Math.abs(statDelta/recruits.length)<1.5,"des déplacements, pas des bonus : "+(statDelta/recruits.length).toFixed(2));

// Un mage pousse l'école de son sort (2 × 2D10) et perd sur ses armes ; un archer pousse son arc et sa catégorie.
const mage=recruits.find(m=>m.domain==="magic"&&m.spells.length);
const school=mage.spells[0].school;
const schoolMove=mage.generationTrace.skills[school].contributions.find(x=>x.kind==="domain");
assert.ok(schoolMove&&schoolMove.dice==="2 × 2D10"&&schoolMove.delta>0,"l'école de son sort");
const archer=recruits.find(m=>m.domain==="ranged");
const raised=archer.generationTrace.domain.moves.filter(x=>x.delta>0&&!(x.target in archer.stats)).map(x=>x.target);
assert.equal(raised.length,2,"son arme de tir et sa catégorie");
assert.ok(raised.some(name=>/Armes de tir|Armes à feu/.test(name)||reference.weapons.rows.some(w=>w.nom===name&&/Armes de tir|Armes à feu/.test(w.domaine||""))));

// Sans domains.json (anciennes tables) : le domaine est posé, rien n'est déplacé.
const partial={...reference};delete partial.domains;
const plain=createGenerator(partial,{random,nameGenerator:(people,id)=>people+" "+id}).createMercenary({id:9999,captain});
assert.ok(["melee","ranged","magic"].includes(plain.domain));
assert.deepEqual(plain.generationTrace.domain.moves,[]);

// Fiche : le picto à côté du nom ; les mercenaires d'avant le domaine prennent le profil de leur équipement.
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
assert.match(ui,/\$\("dialog-name"\)\.innerHTML = domainBadge\(c\) \+ esc\(c\.name\);/);
assert.match(ui,/function mercenaryDomain\(c\) \{ return c\?\.domain \|\| c\?\.equipment\?\.profile\?\.type \|\| null; \}/);
for(const code of ["melee","ranged","magic"]) assert.match(ui,new RegExp("\\b"+code+":'<path"));
console.log("Domaine du mercenaire : choix d'après les tirages, coup de pouce d'un sort, déplacements 2D6 / 2D10, équipement et fiche — OK",
  Object.fromEntries(Object.entries(shares).map(([k,v])=>[k,Math.round(100*v)+" %"])));
