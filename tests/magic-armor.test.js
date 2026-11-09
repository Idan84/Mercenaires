"use strict";

// Magie en armure (Idan, 2026-11-09) : boucliers 10 / 15 / 20 (Rondache, Écu, Pavois), casque 5 (pas les chapeaux),
// × la qualité (le tier pour le casque) ; la compétence « Magie en armure » retire la moitié de sa valeur au malus, jamais
// sous 0 ; nains 2D6, autres 1 ; 80 XP par sort raté tant que l'équipement gêne encore.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createMagicRules}=require("../game-core/magic.js");
const P=require("../game-core/progression.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const src=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=src.slice(src.indexOf("REFERENCE_FILES"),src.indexOf("};",src.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,read(f)]));
const combat=createCombatEngine(reference,{random:()=>0.5});
const magic=createMagicRules({reference,combat,random:()=>0.5});

// Données : boucliers, casque et chapeaux, compétence, constantes.
const skill=name=>reference.skills.rows.find(r=>r.nom===name);
assert.deepEqual(["Rondache","Écu","Pavois"].map(n=>Number(skill(n).alteration_magique_base)),[10,15,20]);
const helmet=name=>reference.helmets.rows.find(r=>r.nom===name);
assert.equal(Number(helmet("Casque de constitution").alteration_magique_base),5);
assert.equal(Number(helmet("Chapeau d’intelligence").alteration_magique_base),0,"pas les chapeaux");
assert.equal(Number(helmet("Chapeau du dresseur").alteration_magique_base),0,"pas les chapeaux");
assert.equal(skill("Magie en armure").domaine,"Martial");
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual([constant("magic.armor_skill.factor"),constant("generation.magic_armor.base"),
  constant("generation.magic_armor.dwarf_d6"),constant("progression.magic_armor.failure_xp")],[0.5,1,2,80]);

// Un lanceur : armure, armes des deux sets, casque ; Magie en armure notée ou non.
function caster({armor=null,armorQuality="standard",set1=[],set2=[],head=null,headTier=2,activeSet=1,armorSkill}={}){
  const items=[],slots={};
  const put=(slot,item)=>{ if(!item) return; const id="i"+items.length; items.push({id,...item}); slots[slot]=id; };
  put("armor",armor&&{name:armor,qualityCode:armorQuality,templateId:""});
  [[1,set1],[2,set2]].forEach(([n,set])=>{
    put(`weapon_set_${n}_main`,set[0]&&{name:set[0],qualityCode:set[2]||"standard"});
    put(`weapon_set_${n}_off`,set[1]&&{name:set[1],qualityCode:set[2]||"standard"});
  });
  put("head",head&&{name:head,tier:headTier,qualityCode:null});
  const martial=armorSkill===undefined?{}:{"Magie en armure":armorSkill};
  return {character:{stats:{Intelligence:50},skills:{martial,magic:{Vie:50}},items,equipment:{slots},spells:[{code:"quick_heal",school:"Vie",mastery:1}]},
    team:"player",q:0,r:0,activeSet,alive:true};
}

// Boucliers : 10 / 15 / 20 × la qualité, seulement dans le set actif.
assert.equal(magic.gearPenalty(caster({set1:["Épée courte","Rondache"]})),10);
assert.equal(magic.gearPenalty(caster({set1:["Épée courte","Écu"]})),15);
assert.equal(magic.gearPenalty(caster({set1:["Épée courte","Pavois"]})),20);
assert.equal(magic.gearPenalty(caster({set1:["Épée courte","Pavois","worn"]})),24,"usé × 1,2");
assert.equal(magic.gearPenalty(caster({set1:["Épée courte","Pavois","luxury"]})),16,"Grand Luxe × 0,8");
assert.equal(magic.gearPenalty(caster({set1:["Épée courte"],set2:["Épée courte","Pavois"]})),0,"bouclier rangé dans l'autre set");
assert.equal(magic.gearPenalty(caster({set1:["Épée courte"],set2:["Épée courte","Pavois"],activeSet:2})),20);

// Casque : 5 × la qualité de son tier (T1 1,2 ; T2 1 ; T3 0,8 ; T4 0,6) ; les chapeaux ne gênent pas.
assert.deepEqual([1,2,3,4].map(t=>Math.round(magic.gearPenalty(caster({head:"Casque de constitution",headTier:t}))*10)/10),[6,5,4,3]);
assert.equal(magic.gearPenalty(caster({head:"Chapeau d’intelligence"})),0);

// Tout s'ajoute : plates (45) + pavois (20) + casque T2 (5) = 70.
const plated=extra=>caster({armor:"Armure de plates",set1:["Épée courte","Pavois"],head:"Casque de constitution",...extra});
assert.equal(magic.gearPenalty(plated()),70);

// La compétence retire la moitié de sa valeur, jamais sous 0 ; sans valeur notée, 1.
assert.equal(magic.armorSkill(plated()),1);
assert.equal(magic.armorPenalty(plated()),69.5);
assert.equal(magic.armorPenalty(plated({armorSkill:0})),70);
assert.equal(magic.armorPenalty(plated({armorSkill:40})),50);
assert.equal(magic.armorPenalty(plated({armorSkill:140})),0);
assert.equal(magic.armorPenalty(plated({armorSkill:400})),0,"jamais sous 0");
assert.equal(magic.armorPenalty(caster({armorSkill:0})),0,"rien de porté, aucun malus");
const chance=magic.castChance(plated({armorSkill:40}),"quick_heal");
assert.equal(chance.gear,70);
assert.equal(chance.armor,50);

// Progression : 80 XP par sort raté tant que l'équipement gêne encore ; rien pour un sort réussi ou sans gêne.
const progression=P.createProgressionRules({reference});
const unit={character:{skills:{martial:{"Magie en armure":1}}}};
P.recordSpell(unit,{code:"quick_heal",school:"Vie",success:false,hindered:true});
P.recordSpell(unit,{code:"quick_heal",school:"Vie",success:false,hindered:true});
P.recordSpell(unit,{code:"quick_heal",school:"Vie",success:true,hindered:true});
P.recordSpell(unit,{code:"quick_heal",school:"Vie",success:false,hindered:false});
assert.equal(unit.progress.armorFailures,2);
const gains=progression.gains(unit.progress,unit.character,{stars:1});
assert.equal(gains.skills.martial["Magie en armure"],160*progression.starMultiplier(1));
assert.equal(progression.gains(unit.progress,unit.character,{stars:5}).skills.martial["Magie en armure"],160*progression.starMultiplier(5),
  "le multiplicateur d'étoiles s'applique");

// Génération : nains 2D6, tous les autres 1 (créés comme recrues, capitaines et ennemis).
let seed=11;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random});
const captain=generator.createCaptain({id:1});
assert.ok(Number.isFinite(captain.skills.martial["Magie en armure"]));
const byPeople={};
for(let id=2;id<400;id++){
  const m=generator.createMercenary({id,captain});
  (byPeople[m.people]=byPeople[m.people]||[]).push(m.skills.martial["Magie en armure"]);
}
assert.ok(byPeople.Nain?.length>10,"assez de nains tirés");
assert.ok(byPeople.Nain.every(v=>Number.isInteger(v)&&v>=2&&v<=12),"nains : 2D6");
assert.ok(new Set(byPeople.Nain).size>3,"nains : des valeurs variées");
for(const [people,values] of Object.entries(byPeople)) if(people!=="Nain") assert.ok(values.every(v=>v===1),people+" : 1");

console.log("Magie en armure : boucliers, casque, compétence, génération et progression OK");
