"use strict";

// Domaine du mercenaire (Idan, 2026-11-01) : après les tirages, un grand domaine — Combat rapproché, Distance ou Mage —,
// puis accentué par des déplacements (dosage B : 2D6 sur les caractéristiques, 2D10 sur les compétences, en plus
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
assert.deepEqual(domains.map(d=>d.nom),["Combat rapproché","Distance","Mage"]); // Idan, 2026-11-06 : « renomme en Combat rapproché »
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

// Un mage pousse l'école de son sort (2D10 depuis les écoles divisées par deux, 2026-11-05) et perd sur ses armes ; un archer
// pousse son arc et sa catégorie.
const mage=recruits.find(m=>m.domain==="magic"&&m.spells.length);
const school=mage.spells[0].school;
const schoolMove=mage.generationTrace.skills[school].contributions.find(x=>x.kind==="domain");
assert.ok(schoolMove&&schoolMove.dice==="2D10"&&schoolMove.delta>0,"l'école de son sort");
const archer=recruits.find(m=>m.domain==="ranged");
const raised=archer.generationTrace.domain.moves.filter(x=>x.delta>0&&!(x.target in archer.stats)).map(x=>x.target);
assert.equal(raised.length,2,"son arme de tir et sa catégorie");
assert.ok(raised.some(name=>/Armes de tir|Armes à feu/.test(name)||reference.weapons.rows.some(w=>w.nom===name&&/Armes de tir|Armes à feu/.test(w.domaine||""))));

// Sans domains.json (anciennes tables) : le domaine est posé, rien n'est déplacé.
const partial={...reference};delete partial.domains;
const plain=createGenerator(partial,{random,nameGenerator:(people,id)=>people+" "+id}).createMercenary({id:9999,captain});
assert.ok(["melee","ranged","magic"].includes(plain.domain));
assert.deepEqual(plain.generationTrace.domain.moves,[]);

// Rattrapage du mage (Idan, 2026-11-01 : « Qu'il connaisse au moins un sort de sa meilleure école ») : un Mage sans sort
// tiré en apprend un dans sa meilleure école (après l'accentuation) ; les autres ne reçoivent rien.
let caught=0;
for(const m of recruits){
  const g=m.generationTrace.mageSpell;
  if(m.domain==="magic") assert.ok(m.spells.length>0,"un Mage connaît un sort : "+m.name);
  if(!g) continue;
  caught++;
  assert.equal(m.domain,"magic");assert.equal(m.spells.length,1);assert.equal(m.spells[0].code,g.spell);
  assert.ok(!m.generationTrace.spells.some(d=>d.spell),"seulement s'il n'a rien tiré");
  const best=Math.max(...Object.entries(m.skills.magic).filter(([s])=>reference.spells.rows.some(r=>r.ecole===s)).map(([,v])=>v));
  assert.equal(m.skills.magic[g.school],best,"sa meilleure école");
  assert.equal(reference.spells.rows.find(r=>r.code===g.spell).ecole,g.school);
}
assert.ok(caught>0,"des mages rattrapés");
assert.ok(recruits.filter(m=>m.domain!=="magic").every(m=>m.generationTrace.mageSpell===null));

// Domaine imposé (garde-fou de l'escouade) : posé et accentué vers lui, l'équipement suit.
const ogreCaptain=generator.createCaptain({id:2001,forcedPeople:"Ogre",forcedCulture:"Ogres des montagnes"});
for(const code of ["melee","ranged","magic"]){
  const m=generator.createMercenary({id:2002,captain:ogreCaptain,forcedPeople:"Ogre",forcedCulture:"Ogres des montagnes",forcedDomain:code});
  assert.equal(m.domain,code);assert.equal(m.generationTrace.domain.forced,true);assert.equal(m.equipment.profile.type,code);
  assert.ok(m.generationTrace.domain.moves.some(x=>x.delta>0),"accentué vers "+code);
}
assert.equal(generator.createMercenary({id:2003,captain}).generationTrace.domain.forced,false);

// Garde-fou de l'escouade initiale (Idan, 2026-11-01 : « Il faut 1 mage / 1 distance et 1 CAC sur une escouade ») :
// chaque domaine absent ajoute un mercenaire du même peuple et de la même culture, tiré normalement jusqu'à 30 fois,
// sinon imposé. Au plus 2 en plus ; une seule place (un identifiant) par renfort.
assert.equal(reference.formulaConstants.rows.find(r=>r.code==="generation.initial_squad.domain_attempts").valeur,30);
let guarded=0,forcedCount=0;
for(const [people,culture] of [["Ogre","Ogres des montagnes"],["Gnome","Gnomes des villes"],["Orc","Orcs noirs"],["Humain","Cités libres"]]){
  for(let i=0;i<12;i++){
    const cap=generator.createCaptain({id:3000,forcedPeople:people,forcedCulture:culture});
    const ids=[];
    const squad=generator.createInitialSquad(cap,{nextId:index=>{ids.push(index);return 3001+index;}});
    for(const code of ["melee","ranged","magic"]) assert.ok(squad.some(m=>m.domain===code),culture+" : "+code);
    assert.deepEqual(ids,squad.map((_,index)=>index),"un identifiant par place");
    assert.deepEqual(squad.map(m=>m.id),squad.map((_,index)=>3001+index));
    const extras=squad.filter(m=>m.generationTrace.squadGuard);
    assert.ok(extras.length<=2);
    assert.ok(squad.slice(squad.length-extras.length).every(m=>m.generationTrace.squadGuard),"les renforts viennent après le tirage");
    const rolled=squad.slice(0,squad.length-extras.length);
    assert.ok(rolled.length>=1);
    for(const m of extras){
      const g=m.generationTrace.squadGuard;
      assert.equal(m.domain,g.domain);assert.ok(!rolled.some(r=>r.domain===g.domain),"seulement un domaine absent");
      assert.equal(m.people,people);assert.equal(m.culture,culture);assert.equal(m.role,"Mercenaire initial");
      assert.ok(g.attempts>=1&&g.attempts<=31);assert.equal(g.forced,g.attempts===31);
      guarded++;if(g.forced) forcedCount++;
    }
  }
}
assert.ok(guarded>0&&forcedCount>0,"des renforts, dont des imposés (ogres)");
const generationUi=fs.readFileSync(path.join(ROOT,"prototype-web","generation.js"),"utf8");
assert.match(generationUi,/ensureGenerator\(\)\.createInitialSquad\(captain, \{role: "Mercenaire initial", nextId: \(\) => nextCharacterId\(\)\}\)/,"le jeu passe par le garde-fou");

// Matrice (Idan, 2026-11-01 : rééquilibrer les cultures, viser 5 à 80 % par domaine ; deux séries de points, les
// gnomes des villes laissés en exception) : valeurs attendues après les deux séries.
const matrix=Object.fromEntries(reference.generationMatrix.rows.map(r=>[r.cible,r]));
for(const [cible,col,value] of [["Arc","elfes_des_grandes_cites",1],["Dague","gnome",2],["Lames courtes","gnome",2],
  ["Massue","halflings_des_villages_isoles",2],["Arbalète","homme_bete",1],["Tromblon","ogre",2],["Canon à main","ogre",2],
  ["Armes à feu","ogre",1],["Télékinésie","ogre",3],["Puissance magique","ogre",-1],["Arc","orc",1],["Arbalète","orc",1],
  ["Arbalète","orcs_noirs",2],["Arc","orcs_noirs",1],["Arc","clans_des_grandes_steppes",1],["Arc","tribus_des_forets_anciennes",1],
  ["Épée courte","elfes_sylvains",1],["Sarbacane","reptiliens_des_cites_temples",2]])
  assert.equal(matrix[cible][col],value,cible+" / "+col);

// Fiche : le picto à côté du nom ; les mercenaires d'avant le domaine prennent le profil de leur équipement.
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
assert.match(ui,/\$\("dialog-name"\)\.innerHTML = domainBadge\(c\) \+ esc\(c\.name\) \+/);
assert.match(ui,/function mercenaryDomain\(c\) \{ return c\?\.domain \|\| c\?\.equipment\?\.profile\?\.type \|\| null; \}/);
for(const code of ["melee","ranged","magic"]) assert.match(ui,new RegExp("\\b"+code+":'<path"));
console.log("Domaine du mercenaire : choix d'après les tirages, coup de pouce d'un sort, déplacements 2D6 / 2D10, garde-fou de l'escouade, équipement et fiche — OK",
  Object.fromEntries(Object.entries(shares).map(([k,v])=>[k,Math.round(100*v)+" %"])));
