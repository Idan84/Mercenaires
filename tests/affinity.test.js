"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createAffinityRules}=require("../game-core/affinity.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const reference={
  peopleAffinity:read("people-affinity.json"),
  alignmentGeneration:read("alignment-generation.json"),
  formulaConstants:read("formula-constants.json")
};
const {affinity,memberAffinity,ALIGNMENT_GRID,PEOPLES,PEOPLE_MATRIX,RAW_MIN,RAW_MAX,constants}=createAffinityRules({reference});

// Données : les dix peuples du jeu, une matrice 10 × 10 de −3 à +3, la grille canonique des alignements.
assert.deepEqual([...PEOPLES].sort(),read("peoples.json").rows.map(r=>r.nom).sort());
assert.equal(PEOPLE_MATRIX.length,10);
assert.ok(PEOPLE_MATRIX.every(row=>row.length===10&&row.every(v=>Number.isInteger(v)&&v>=-3&&v<=3)));
assert.equal(ALIGNMENT_GRID.flat().length,9);
assert.equal(new Set(ALIGNMENT_GRID.flat()).size,9);
assert.deepEqual(new Set(ALIGNMENT_GRID.flat()),new Set(read("alignments.json").rows.map(r=>r.nom)));
assert.deepEqual(constants,{sameCulture:2,sameAlignment:4,alignmentStep:2});
assert.equal(RAW_MIN,-7);
assert.equal(RAW_MAX,9);

const person=(people,alignment,culture="Culture A")=>({people,alignment,culture});
const human=person("Humain","Loyal bon");
const orc=person("Orc","Chaotique mauvais");
assert.equal(affinity(human,orc).components.people,1);
assert.equal(affinity(orc,human).components.people,-1);
assert.equal(affinity(human,human).components.distance,0);
assert.equal(affinity(human,orc).components.distance,4);
assert.equal(affinity(human,human).components.culture,2);
assert.equal(affinity(human,{...human,culture:"Culture B"}).components.culture,0);
assert.equal(affinity(person("Nain","Loyal bon"),person("Nain","Loyal bon")).total,100);
assert.equal(affinity(person("Gnome","Loyal bon","A"),person("Orc","Chaotique mauvais","B")).total,-100);
assert.equal(affinity(human,human,200).total,100);
assert.equal(affinity(human,human,-200).total,-100);
assert.equal(affinity(human,person("Inconnu","Neutre")).ok,false);
for(const a of ALIGNMENT_GRID.flat())for(const b of ALIGNMENT_GRID.flat()){
 const x=affinity(person("Humain",a),person("Elfe",b));
 assert.equal(x.ok,true);
 assert.ok(x.total>=-100&&x.total<=100);
}
// Branche positive et branche négative : brut +5 → 56, brut −3 → −43.
assert.equal(affinity(person("Humain","Neutre","A"),person("Humain","Neutre bon","B")).initial,Math.round(5*100/9));
assert.equal(affinity(person("Humain","Loyal bon","A"),person("Orc","Chaotique mauvais","B")).initial,Math.round(-3*100/7));

// Cultures à part (Idan, 2026-10-31) : les Nains du chaos et les Elfes noirs haïssent leurs cousins et en sont haïs
// (−6), s'aiment bien entre eux (+2), n'aiment pas grand monde d'autre (−2 sur la matrice, plancher −3).
const chaosDwarf=person("Nain","Chaotique neutre","Nains du chaos"),darkElf=person("Elfe","Chaotique mauvais","Elfes noirs");
const feels=(who,toward)=>affinity(toward,who);
const rule=(who,toward)=>feels(who,toward).components;
assert.deepEqual([rule(chaosDwarf,person("Nain","Loyal bon","Nains des montagnes")).people,rule(chaosDwarf,person("Nain","Loyal bon","Nains des montagnes")).cultureRule],[-6,"cousins"]);
assert.equal(rule(person("Nain","Loyal bon","Nains des montagnes"),chaosDwarf).people,-6,"réciproque");
assert.equal(rule(darkElf,person("Elfe","Neutre bon","Elfes sylvains")).people,-6);
assert.equal(rule(person("Elfe","Neutre bon","Elfes sylvains"),darkElf).people,-6,"réciproque");
assert.deepEqual([rule(chaosDwarf,darkElf).people,rule(chaosDwarf,darkElf).cultureRule],[2,"allies"]);
assert.equal(rule(darkElf,chaosDwarf).people,2);
assert.deepEqual([rule(chaosDwarf,person("Humain","Neutre")).people,rule(chaosDwarf,person("Humain","Neutre")).cultureRule],[0,"others"],"2 − 2");
assert.equal(rule(chaosDwarf,person("Orc","Loyal bon")).people,-3,"plancher de la matrice");
assert.equal(rule(darkElf,person("Halfling","Neutre")).people,1,"3 − 2");
assert.equal(rule(person("Humain","Neutre"),darkElf).people,2,"les autres ne les détestent pas pour autant");
assert.deepEqual([rule(chaosDwarf,chaosDwarf).people,rule(chaosDwarf,chaosDwarf).cultureRule],[3,null],"entre eux : rien ne change");
// Les exemples de la proposition (affinité finale).
const examples=[
  [chaosDwarf,person("Nain","Loyal bon","Nains des montagnes"),-100],
  [chaosDwarf,person("Nain","Chaotique neutre","Nains des montagnes"),-29],
  [person("Nain","Loyal bon","Nains des montagnes"),chaosDwarf,-100],
  [person("Elfe","Neutre bon","Elfes sylvains"),darkElf,-100],
  [chaosDwarf,darkElf,44],
  [chaosDwarf,person("Humain","Neutre"),22],
  [chaosDwarf,person("Halfling","Neutre"),33],
  [darkElf,person("Humain","Neutre"),0],
  [person("Humain","Neutre"),darkElf,22],
  [chaosDwarf,chaosDwarf,100]
];
for(const [who,toward,total] of examples) assert.equal(feels(who,toward).total,total,`${who.culture} → ${toward.culture}`);
assert.ok(feels(chaosDwarf,person("Nain","Loyal bon","Nains des montagnes")).initial>=-100,"la part initiale reste bornée");

// Membre de la compagnie : la part acquise vient de affinityAcquired (0 par défaut, anciennes sauvegardes).
assert.equal(memberAffinity(human,{...human}).acquired,0);
assert.equal(memberAffinity(human,{...human,culture:"B",affinityAcquired:-30}).total,affinity(human,{...human,culture:"B"}).initial-30);
// Slip d'Affinité (Idan, 2026-10-24) : la culotte portée ajoute ses points à l'affinité avec le capitaine.
const withPants=createAffinityRules({reference:{...reference,pants:read("pants.json")}});
const wearing=(name,tier)=>({...human,culture:"B",affinityAcquired:-30,items:[{id:"p",itemType:"pants",name,tier}],equipment:{slots:{pants:"p"}}});
const briefs=withPants.memberAffinity(human,wearing("Slip d’Affinité",3));
assert.deepEqual([briefs.gear,briefs.gearItem.name,briefs.acquired,briefs.total],[15,"Slip d’Affinité",-30,affinity(human,{...human,culture:"B"}).initial-30+15]);
assert.equal(withPants.memberAffinity(human,wearing("String du Charisme",4)).gear,0,"les autres culottes ne touchent pas l'affinité");
assert.equal(withPants.memberAffinity(human,{...wearing("Slip d’Affinité",4),affinityAcquired:95}).total,100,"bornée à 100");
assert.equal(withPants.memberAffinity(human,{...human,culture:"B"}).gear,0,"sans culotte : rien");

// Personnages générés : tous ont un peuple et un alignement reconnus.
const {createGenerator}=require("../game-core/mercenary-generator.js");
const files={peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",baseArmors:"base-armors.json",itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json"};
let seed=7;const random=()=>((seed=(seed*16807)%2147483647)-1)/2147483646;
const generator=createGenerator(Object.fromEntries(Object.entries(files).map(([k,f])=>[k,read(f)])),{random,nameGenerator:(p,id)=>p+" "+id});
const captain=generator.createCaptain({id:1});
for(let i=0;i<200;i++){
  const x=memberAffinity(captain,generator.createMercenary({id:i+2,captain}));
  assert.equal(x.ok,true,x.reason);
}
// Salaire demandé (09 §4 ; Idan, 2026-10-20) : × (1 − 0,2 × Affinité / 100). Même graine, avec et sans
// affinité : seul le salaire change, d'au plus 20 %.
const fullReference={...Object.fromEntries(Object.entries(files).map(([k,f])=>[k,read(f)])),peopleAffinity:reference.peopleAffinity};
const seededRandom=start=>{let x=start;return ()=>((x=(x*16807)%2147483647)-1)/2147483646;};
const plain=createGenerator(fullReference,{random:seededRandom(11),nameGenerator:(p,id)=>p+" "+id});
const bonded=createGenerator(fullReference,{random:seededRandom(11),nameGenerator:(p,id)=>p+" "+id,affinity:createAffinityRules({reference})});
const capPlain=plain.createCaptain({id:1}),capBonded=bonded.createCaptain({id:1});
assert.equal(capBonded.salary,capPlain.salary,"le capitaine n'a pas de capitaine : facteur 1");
let lower=0,higher=0;
for(let i=0;i<150;i++){
  const a=plain.createMercenary({id:i+2,captain:capPlain}),b=bonded.createMercenary({id:i+2,captain:capBonded});
  assert.equal(b.reputation,a.reputation,"même mercenaire");
  const total=affinity(capBonded,b).total;
  const raw=10*Math.max(1,b.reputation/30)*(1+(b.salaryPretension-35)/100)*(1+0.25*((b.stats.Intelligence-100)/100)**2);
  assert.equal(b.salary,Math.round(raw*(1-0.2*total/100)));
  assert.equal(b.generationTrace.derived.salary.affinity,total);
  if(total>0&&b.salary<a.salary) lower++;
  if(total<0&&b.salary>a.salary) higher++;
}
assert.ok(lower>0&&higher>0,"bonne affinité : moins cher ; mauvaise : plus cher");
console.log("Affinity: OK");
