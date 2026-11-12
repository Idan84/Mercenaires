"use strict";

// Deux règles (Idan, 2026-11-12) : « Les armes contondantes ne peuvent pas être empoisonnées… Les armes à feu non plus » ;
// « toutes les armes qui ne font pas de dégâts tranchants ou perforants » — et « je pense qu'il faudrait mettre des malus
// de discrétion sur les grosses armures » (les mêmes points que l'Esquive : « parfait »).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createEquipmentEffects}=require("../game-core/equipment-effects.js");
const ROOT=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(ROOT,file),"utf8");
const source=read("prototype-web/reference-data.js");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,JSON.parse(read("data/reference/"+file))]));
const engine=createCombatEngine(reference);

// Le poison : une arme tranchante ou perforante, jamais une arme à feu.
const weapon=name=>reference.weapons.rows.find(w=>w.nom===name);
for(const name of ["Bâton court","Bâton long","Fléau d’armes","Fronde","Marteau de guerre","Masse d’armes","Massue","Nunchaku","Écu","Rondache","Pavois",
  "Arquebuse","Pistolet","Tromblon","Canon à main"]) assert.equal(engine.poisonableWeapon(weapon(name)),false,name);
for(const name of ["Dague","Épée longue","Arc","Arbalète","Sarbacane","Pic de guerre","Lance","Hache de guerre"]) assert.equal(engine.poisonableWeapon(weapon(name)),true,name);
assert.equal(engine.poisonableWeapon(null),false);
const ui=read("prototype-web/mission.js");
assert.match(ui,/poison_arme"&&!game\.mission\.engine\.poisonableWeapon\(/,"le combat refuse d'enduire une arme qui ne porte pas le poison");

// Le coup : l'arme enduite doit pouvoir porter le poison.
assert.match(read("game-core/combat-engine.js"),/&&poisonableWeapon\(weaponTemplate\(activeWeaponItem\(attacker\)\)\);/,"une fiole sur un marteau n'empoisonne pas");

// La Discrétion sous l'armure : les mêmes points que l'Esquive, × le malus de la qualité.
const armors=Object.fromEntries(reference.baseArmors.rows.map(a=>[a.nom,a]));
assert.deepEqual(Object.fromEntries(Object.entries(armors).map(([n,a])=>[n,a.malus_discretion_base])),
  {"Armure de plates":16,"Vêtements":0,"Gambison":2,"Armure d'écailles":12,"Cotte de mailles":8,"Brigandine":9,"Armure de cuir":3,"Cuir renforcé":5});
for(const a of Object.values(armors)) assert.equal(a.malus_discretion_base,a.malus_esquive_base,"les mêmes points que l'Esquive : "+a.nom);
const sneaky=armor=>({id:"s",stats:{Esquive:40,Vitesse:40,Perception:40},skills:{martial:{"Discrétion":50}},
  items:armor?[{id:"a",name:armor,itemType:"armor",tier:2}]:[],equipment:{slots:armor?{armor:"a"}:{}}});
assert.equal(engine.effectiveStealth({character:sneaky(null),activeSet:1}),50);
assert.equal(engine.effectiveStealth({character:sneaky("Armure de plates"),activeSet:1}),34);
assert.equal(engine.effectiveStealth({character:sneaky("Gambison"),activeSet:1}),48);
const watcher={character:{id:"w",stats:{Perception:60},skills:{}},activeSet:1};
assert.ok(engine.detectionChance(watcher,{character:sneaky("Armure de plates"),activeSet:1},6)>engine.detectionChance(watcher,{character:sneaky(null),activeSet:1},6),
  "en plates, on se fait repérer plus facilement");
const fx=createEquipmentEffects({engine}).effects(sneaky("Armure de plates"));
assert.deepEqual(fx["Discrétion"],{base:50,value:34,lines:[{label:"Armure de plates",delta:-16,reason:"armor"}]},"la fiche montre le malus");
console.log("Poison sur les armes tranchantes ou perforantes seulement, malus de Discrétion des armures — OK");
