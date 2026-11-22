"use strict";

// Dialogue de recrutement à la Taverne (Idan, 2026-10-21 ; doc 14 §6 bis, 2026-11-19 et 2026-11-22) : salutation selon
// l'affinité (20 tranches), les questions qui remplissent la fiche du candidat (« Puis-je en savoir plus sur vous ? »),
// répliques de négociation, questions au tavernier ; textes dans data/reference/tavern-dialogue.json.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createRecruitDialogue,fill}=require("../game-core/recruit-dialogue.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","reference",f),"utf8"));
const copy=read("tavern-dialogue.json");
const dialogue=createRecruitDialogue({reference:{tavernDialogue:copy,spells:read("spells.json"),formulaConstants:read("formula-constants.json")}});

// Salutations : 20 tranches contiguës de −100 à +100, une phrase par affinité.
assert.equal(copy.greetings.length,20);
assert.equal(copy.greetings[0].min,-100);
assert.equal(copy.greetings.at(-1).max,100);
copy.greetings.forEach((row,i)=>{ if(i) assert.equal(row.min,copy.greetings[i-1].max+1,"tranches contiguës"); });
for(let a=-100;a<=100;a++) assert.ok(dialogue.greeting({name:"X"},a),"affinité "+a);
assert.notEqual(dialogue.greeting({name:"X"},-100),dialogue.greeting({name:"X"},100));

// Gabarits : genre, majuscule, valeurs.
assert.equal(fill("{Ravi|Ravie} de voir {arme}. {Arme} !",{arme:"l’arc"},true),"Ravie de voir l’arc. L’arc !");
assert.equal(fill("{un idiot|une idiote}",{},false),"un idiot");

// Couverture des données : chaque arme a son article ; une question par école de magie (« de Feu », « d’Eau »).
const weapons=read("weapons.json").rows.map(r=>r.nom).sort();
assert.deepEqual(copy.weapons.map(r=>r.nom).sort(),weapons);
const schools=read("skills.json").rows.filter(r=>r.domaine==="Magie"&&r.niveau==="Catégorie").map(r=>r.nom).sort((a,b)=>a.localeCompare(b,"fr"));
assert.deepEqual(dialogue.schools,schools);
assert.equal(dialogue.schoolQuestion("Feu"),"Connais-tu des sorts de Feu ?");
assert.equal(dialogue.schoolQuestion("Eau"),"Connais-tu des sorts d’Eau ?");
assert.equal(dialogue.schoolQuestion("Illusion"),"Connais-tu des sorts d’Illusion ?");

// Les questions du tableau (doc 14 §6 bis) : le menu, puis ce qu'on lui demande sur lui ; une question posée disparaît,
// la magie tant qu'une école n'est pas demandée.
const q=copy.questions;
assert.equal(q.about,"Puis-je en savoir plus sur vous ?");
assert.deepEqual([q.title,q.set1,q.set2,q.armor,q.salary],["Comment on t’appelle, dans le métier ?","Quelle arme de corps à corps manies-tu ?",
  "Quelle arme de tir as-tu ?","Quelle armure portes-tu ?","Combien demandes-tu ?"]);
assert.deepEqual(dialogue.aboutQuestions,["title","set1","set2","armor","magic"]);
const candidate={mercenary:{id:9}};
const k=dialogue.known(candidate);
assert.equal(candidate.recruitKnown,k,"gardé sur le candidat");
assert.deepEqual(dialogue.aboutLeft(k),["title","set1","set2","armor","magic"]);
k.asked.title=true; k.asked.armor=true;
for(const name of schools.slice(1)) k.schools[name]=false;
assert.deepEqual(dialogue.aboutLeft(k),["set1","set2","magic"]);
assert.deepEqual(dialogue.schoolsLeft(k),[schools[0]]);
k.schools[schools[0]]=true;
assert.deepEqual(dialogue.aboutLeft(k),["set1","set2"]);
assert.equal(dialogue.known(candidate),k,"même objet la seconde fois");

// L'affinité en un mot (doc 14 §7) : un tiers de l'échelle chacun.
assert.deepEqual([-100,-34,-33.3,0,33.3,34,100].map(dialogue.affinityWord),["Hostile","Hostile","Neutre","Neutre","Neutre","Amical","Amical"]);

// Le candidat tel qu'on le décrit : ses capacités passées par l'estimation, arrondies ; le reste ne bouge pas, l'original
// non plus.
const real={id:3,name:"Aldo",stats:{Force:41,Courage:10},resistances:{Feu:5},skills:{martial:{Arc:12},magic:{Vie:7},camp:{Intendance:3}},spells:[{code:"soin"}]};
const boasted=dialogue.described(real,v=>v*1.5);
assert.deepEqual(boasted.stats,{Force:62,Courage:15});
assert.deepEqual(boasted.resistances,{Feu:8});
assert.deepEqual(boasted.skills,{martial:{Arc:18},magic:{Vie:11},camp:{Intendance:5}});
assert.equal(boasted.spells,real.spells);
assert.equal(real.stats.Force,41,"l'original ne change pas");

// Réponses sur de vrais mercenaires : ses armes portées avec leur article, sans gabarit oublié ; toujours la même réponse.
const files={peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",baseArmors:"base-armors.json",itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json"};
const reference=Object.fromEntries(Object.entries(files).map(([key,f])=>[key,read(f)]));
let seed=42;
const generator=createGenerator(reference,{random:()=>((seed=(seed*1103515245+12345)%2147483648)/2147483648),nameGenerator:(p,id)=>"Aldo "+p+id});
const article=new Map(copy.weapons.map(r=>[r.nom,r.avec_article]));
const noTemplate=text=>text&&!/[{}]/.test(text);
for(let i=0;i<60;i++){
  const m=generator.createMercenary();
  const slot=name=>(m.items||[]).find(item=>String(item.id)===String(m.equipment?.slots?.[name]));
  const names=[slot("weapon_set_1_main"),slot("weapon_set_1_off")].filter(Boolean).map(item=>item.name);
  const phrase=dialogue.withArticles(names);
  for(const name of names) assert.ok(phrase.includes(article.get(name)),"l’article de "+name);
  const text=dialogue.answer("set1",m,{armes:phrase});
  assert.ok(noTemplate(text)&&text.toLowerCase().includes(phrase.toLowerCase()),`set 1 : « ${text} »`);
  assert.equal(dialogue.answer("set1",m,{armes:phrase}),text,"toujours la même réponse");
  for(const kind of ["set1_none","set2_none","armor_clothes","armor_none","no_title"]) assert.ok(noTemplate(dialogue.answer(kind,m)),kind);
  for(const kind of ["set2","title","armor"]) assert.ok(noTemplate(dialogue.answer(kind,m,{armes:"l’arc",titre:"Archer en herbe",armure:"Gambison"})),kind);
  for(const kind of ["school_yes","school_no"]) assert.ok(noTemplate(dialogue.answer(kind,m,{ecole:dialogue.ofSchool("Eau")})),kind);
  for(const kind of Object.keys(copy.lines)){
    const line=dialogue.line(kind,m,{salaire:47,prime:140,compagnie:"la Compagnie de Bob"});
    assert.ok(noTemplate(line),`${kind} : « ${line} »`);
  }
}
const female={id:1,name:"Inga Longueforge",sex:"femme"};
assert.equal(dialogue.line("accepted",female,{compagnie:"la Compagnie de Bob"}),"Parfait. Ravie de faire partie de la Compagnie de Bob.");
assert.match(dialogue.line("left",female),/^Inga /);
assert.match(dialogue.answer("school_no",female,{ecole:"d’Eau"}),/d’Eau/);

// Le tavernier : ses deux questions sur un candidat (doc 14 §6 bis), au masculin ou au féminin, et ses réponses.
assert.equal(dialogue.keeperQuestion("title",{name:"Aldo Fer",sex:"homme"}),"Qu’est-ce qu’on dit de lui ?");
assert.equal(dialogue.keeperQuestion("affinity",{name:"Aldo Fer",sex:"homme"}),"Il m’apprécierait, à ton avis ?");
assert.equal(dialogue.keeperQuestion("title",female),"Qu’est-ce qu’on dit d’elle ?");
assert.equal(dialogue.keeperQuestion("affinity",female),"Elle m’apprécierait, à ton avis ?");
assert.equal(dialogue.keeperAnswer("title",female,{titre:"Mage Légendaire Omnipotent"}),"Inga ? On l’appelle Mage Légendaire Omnipotent, à ce qu’on raconte.");
for(const word of ["Hostile","Neutre","Amical","no_title"]) assert.ok(noTemplate(dialogue.keeperAnswer(word,female)),word);
assert.equal(dialogue.keeperAnswer("Amical",female),"Inga ? Elle t’aime bien, ça se voit.");
assert.ok(!("tiers" in copy.tavernkeeper)&&!("adjectives" in copy.tavernkeeper),"plus de conseils sur les caractéristiques (Idan, 2026-11-19)");
assert.equal(dialogue.keeperLine("greeting",{capitaine:"Idan"}),"Salut Idan ! Comment vont les affaires ?");
assert.equal(dialogue.keeperLine("ask_what",{cout:1},female),"Tu veux savoir quoi sur Inga ? C’est 1 PO la question.");
console.log("Taverne : dialogue de recrutement (salutations, questions de la fiche, négociation) et questions au tavernier — OK");
