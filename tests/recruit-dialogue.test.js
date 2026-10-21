"use strict";

// Dialogue de recrutement à la Taverne (Idan, 2026-10-21) : salutation selon l'affinité (20 tranches),
// réponses sincères aux questions, répliques de négociation ; textes dans data/reference/tavern-dialogue.json.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createRecruitDialogue,fill}=require("../game-core/recruit-dialogue.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","reference",f),"utf8"));
const copy=read("tavern-dialogue.json");
const sheet=read("character-sheet-copy.json");
const dialogue=createRecruitDialogue({reference:{tavernDialogue:copy,characterSheetCopy:sheet}});

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

// Couverture des données : chaque arme a son article, chaque style et chaque école leur réplique.
const weapons=read("weapons.json").rows.map(r=>r.nom).sort();
assert.deepEqual(copy.weapons.map(r=>r.nom).sort(),weapons);
for(const style of sheet.skills_layout.styles_de_combat) assert.ok(copy.answers.style[style]?.length,style);
const schools=read("skills.json").rows.filter(r=>r.domaine==="Magie"&&r.niveau==="Catégorie").map(r=>r.nom);
for(const school of schools) assert.ok(copy.answers.magic[school]?.length,school);

// Réponses sincères sur de vrais mercenaires : la vraie prédilection, sans gabarit oublié.
const files={peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",baseArmors:"base-armors.json",itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json"};
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,read(f)]));
let seed=42;
const generator=createGenerator(reference,{random:()=>((seed=(seed*1103515245+12345)%2147483648)/2147483648),nameGenerator:(p,id)=>"Aldo "+p+id});
const article=new Map(copy.weapons.map(r=>[r.nom,r.avec_article]));
for(let i=0;i<60;i++){
  const m=generator.createMercenary();
  for(const kind of dialogue.infoQuestions){
    const text=dialogue.answer(kind,m);
    assert.ok(text&&!/[{}]/.test(text),`${kind} : « ${text} »`);
  }
  const weapon=dialogue.favoriteWeapon(m);
  assert.ok(dialogue.answer("weapon",m).toLowerCase().includes(article.get(weapon).toLowerCase()),"arme de prédilection : "+weapon);
  const ranged=m.weaponPreferences?.ranged?.weapon;
  if(ranged) assert.ok(dialogue.answer("ranged",m).toLowerCase().includes(article.get(ranged).toLowerCase()),"arme de tir : "+ranged);
  const school=dialogue.favoriteSchool(m);
  if(school) assert.ok(copy.answers.magic[school].includes(dialogue.answer("magic",m)),"école : "+school);
  const style=dialogue.favoriteStyle(m);
  assert.ok(copy.answers.style[style].includes(dialogue.answer("style",m)),"style : "+style);
  assert.equal(dialogue.answer("weapon",m),dialogue.answer("weapon",m),"toujours la même réponse");
  for(const kind of Object.keys(copy.lines)){
    const text=dialogue.line(kind,m,{salaire:47,prime:140,compagnie:"la Compagnie de Bob"});
    assert.ok(text&&!/[{}]/.test(text),`${kind} : « ${text} »`);
  }
}
const female={id:1,name:"Inga Longueforge",sex:"femme",origin:"Soldat / Guerrier / Combattant"};
assert.equal(dialogue.line("accepted",female,{compagnie:"la Compagnie de Bob"}),"Parfait. Ravie de faire partie de la Compagnie de Bob.");
assert.match(dialogue.answer("origin",female),/J’étais guerrière\./);
assert.match(dialogue.line("left",female),/^Inga /);
console.log("Taverne : dialogue de recrutement (salutations, réponses sincères, négociation) — OK");
