"use strict";

// Sorts connus à la création (12-magic.md ; Idan, 2026-10-25) : trois tirages (école de la culture, meilleure école,
// deuxième meilleure), chance = min(75, École × Intelligence / 75) % × 1 / 1,1 / 1,3 (diviseur 150 avant les écoles divisées par deux, 2026-11-05), sort au hasard dans l'école, niveau 1,
// capitaine compris ; cultures sans école : deux tirages et +1D6 Courage (nains) ou Force (ogres).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const files={peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",
  ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",cultureOriginCompatibility:"culture-origin-compatibility.json",
  ancestryLevels:"ancestry-levels.json",d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",
  characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",baseArmors:"base-armors.json",
  itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",
  binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json",spells:"spells.json"};
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,read(file)]));
let seed=11;
const random=()=>((seed=(seed*16807)%2147483647)-1)/2147483646;
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});

// Tableau d'Idan : chaque culture a une école, sauf quatre qui ont une compensation.
const cultures=reference.cultures.rows;
const SCHOOLS=reference.skills.rows.filter(r=>r.domaine==="Magie"&&r.niveau==="Catégorie").map(r=>r.nom);
assert.equal(SCHOOLS.length,9);
for(const c of cultures){
  assert.ok(Boolean(c.ecole_magie)!==Boolean(c.compensation_sans_ecole),c.nom+" : une école ou une compensation");
  if(c.ecole_magie) assert.ok(SCHOOLS.includes(c.ecole_magie),c.nom);
}
const cultureOf=name=>cultures.find(c=>c.nom===name);
assert.equal(cultureOf("Nains du chaos").ecole_magie,"Foudre");
assert.equal(cultureOf("Cités libres").ecole_magie,"Vie");
assert.equal(cultureOf("Ogres des steppes").ecole_magie,"Feu");
assert.equal(cultureOf("Gnomes des villes").ecole_magie,"Illusion");
assert.deepEqual(cultures.filter(c=>!c.ecole_magie).map(c=>[c.nom,c.compensation_sans_ecole]),[
  ["Nains des montagnes","Courage"],["Nains esclaves","Courage"],
  ["Ogres des cités humaines","Force"],["Ogres des montagnes","Force"]
].sort((a,b)=>cultures.findIndex(c=>c.nom===a[0])-cultures.findIndex(c=>c.nom===b[0])));
for(const school of SCHOOLS) assert.ok(cultures.some(c=>c.ecole_magie===school),school+" : au moins une culture");

// Chaque tirage suit la règle : ordre, école, chance, réussite.
const multipliers=[1,1.1,1.3];
function checkDraws(m){
  // La valeur au moment du tirage : sans le passage à 1 des écoles à 20 ou moins (fin de génération, 2026-11-06).
  const cleared=s=>(m.generationTrace.skills[s]?.contributions||[]).filter(x=>x.kind==="unpracticed").reduce((t,x)=>t+x.delta,0);
  const values=m.skills.magic,level=s=>(Number(values[s])||0)-cleared(s);
  const ranked=[...SCHOOLS].sort((a,b)=>level(b)-level(a));
  const cultureSchool=cultureOf(m.culture).ecole_magie||null;
  const expected=[["culture",cultureSchool],["best",ranked[0]],["second",ranked[1]]].filter(([,s])=>s);
  assert.deepEqual(m.generationTrace.spells.map(d=>[d.source,d.school]),expected,m.name+" : trois tirages dans l'ordre");
  let count=0;
  for(const d of m.generationTrace.spells){
    // Aucun sort dans une école à 20 ou moins (Idan, 2026-11-06).
    const chance=level(d.school)<=20?0:Math.min(75,level(d.school)*m.stats.Intelligence/75)*multipliers[count];
    assert.ok(Math.abs(d.chance-chance)<1e-9,m.name+" : chance du tirage "+d.source);
    const written=reference.spells.rows.some(s=>s.ecole===d.school);
    if(!written) assert.equal(d.roll,null,"une école sans sort écrit ne donne rien");
    if(d.spell){ assert.ok(d.roll<d.chance); count++; }
    else if(d.roll!==null&&written&&reference.spells.rows.filter(s=>s.ecole===d.school).length>m.spells.filter(k=>k.school===d.school).length) assert.ok(d.roll>=d.chance);
  }
  // Rattrapage du mage (Idan, 2026-11-01) : un Mage sans sort en apprend un dans sa meilleure école.
  assert.equal(m.spells.length,count+(m.generationTrace.mageSpell?1:0));
  assert.equal(new Set(m.spells.map(s=>s.code)).size,m.spells.length,"jamais deux fois le même sort");
  for(const s of m.spells){
    const row=reference.spells.rows.find(r=>r.code===s.code);
    assert.equal(s.school,row.ecole);
    assert.equal(s.name,row.nom);
    assert.equal(s.mastery,1,"un sort connu à la création démarre au niveau 1");
  }
}
const captain=generator.createCaptain({id:1});
assert.ok(Array.isArray(captain.spells)&&captain.generationTrace.spells.length>=2,"le capitaine tire ses sorts aussi");
checkDraws(captain);
const recruits=Array.from({length:1500},(_,i)=>generator.createMercenary({id:i+2,captain}));
recruits.forEach(checkDraws);
const withSpell=recruits.filter(m=>m.spells.length&&!m.generationTrace.mageSpell).length;
// Les neuf écoles sont écrites (catalogue validé le 2026-10-31) : environ une recrue sur deux tire un sort (de 740 à 816
// sur 1 500 selon le tirage).
assert.ok(withSpell>650&&withSpell<900,"environ une recrue sur deux tire un sort ("+withSpell+")");
// Rattrapage : tout Mage connaît au moins un sort ; seuls les Mages sans tirage réussi en reçoivent un.
assert.ok(recruits.filter(m=>m.domain==="magic").every(m=>m.spells.length>0),"pas de Mage sans sort");
assert.ok(recruits.every(m=>!m.generationTrace.mageSpell||(m.domain==="magic"&&m.spells.length===1)));

// Cultures sans école : deux tirages seulement, et +1D6 à la caractéristique de compensation.
for(const [culture,people,stat] of [["Nains des montagnes","Nain","Courage"],["Ogres des montagnes","Ogre","Force"]]){
  const m=generator.createMercenary({id:9000,captain,forcedPeople:people,forcedCulture:culture});
  assert.deepEqual(m.generationTrace.spells.map(d=>d.source),["best","second"],culture+" : pas de tirage de culture");
  const bonus=m.generationTrace.characteristics[stat].contributions.filter(c=>/sans école de magie/.test(c.name));
  assert.equal(bonus.length,1,culture+" : une compensation");
  assert.ok(bonus[0].delta>=1&&bonus[0].delta<=6&&bonus[0].dice==="1D6");
  assert.equal(m.generationTrace.characteristics[stat].final,m.stats[stat]);
}
const elf=generator.createMercenary({id:9001,captain,forcedPeople:"Elfe",forcedCulture:"Elfes sylvains"});
assert.equal(elf.generationTrace.spells[0].source,"culture");
assert.equal(elf.generationTrace.spells[0].school,"Vie");
assert.ok(!Object.values(elf.generationTrace.characteristics).some(t=>t.contributions.some(c=>/sans école/.test(c.name))),"pas de compensation avec une école");

// Tous les sorts supposés écrits (six par école) : la répartition validée par Idan (≈ 50 / 35 / 12,5 / 2,5 %).
const full=JSON.parse(JSON.stringify(reference));
for(const school of SCHOOLS) if(!full.spells.rows.some(r=>r.ecole===school))
  for(let i=0;i<6;i++) full.spells.rows.push({code:school+"_"+i,nom:school+" "+i,ecole:school});
seed=23;
const fullGenerator=createGenerator(full,{random,nameGenerator:(people,id)=>people+" "+id});
const fullCaptain=fullGenerator.createCaptain({id:1});
const counts=[0,0,0,0];
let sameSchool=0;
const N=3000;
for(let i=0;i<N;i++){
  const m=fullGenerator.createMercenary({id:i+2,captain:fullCaptain});
  counts[m.spells.length-(m.generationTrace.mageSpell?1:0)]++; // les tirages seuls, sans le rattrapage du mage
  if(new Set(m.spells.map(s=>s.school)).size<m.spells.length) sameSchool++;
}
const share=counts.map(c=>100*c/N);
assert.ok(share[0]>44&&share[0]<55,"aucun sort : "+share[0].toFixed(1)+" %");
assert.ok(share[1]>29&&share[1]<40,"un sort : "+share[1].toFixed(1)+" %");
assert.ok(share[2]>9&&share[2]<17,"deux sorts : "+share[2].toFixed(1)+" %");
assert.ok(share[3]>1.2&&share[3]<5,"trois sorts : "+share[3].toFixed(1)+" %");
assert.ok(sameSchool>0,"deux sorts d'une même école sont possibles (école de la culture = n°1 ou n°2)");

// Sans données de sorts, aucun tirage.
const bare=createGenerator({...reference,spells:{rows:[]}},{random,nameGenerator:(people,id)=>people+" "+id});
const plain=bare.createMercenary({id:1});
assert.deepEqual(plain.spells,[]);
assert.deepEqual(plain.generationTrace.spells,[]);

console.log(JSON.stringify({ok:true,recruitsWithSpell:withSpell,fullDistribution:share.map(x=>Math.round(x*10)/10),sameSchool},null,2));
