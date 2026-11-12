"use strict";

// Effets de l'équipement sur la fiche (Idan, 2026-10-24) : ceux que le combat applique, avec le set 1 en main,
// et les dégâts de chaque set avant la résistance de la cible.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createEquipmentEffects} = require("../game-core/equipment-effects.js");

const ROOT = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"));
const reference = {weapons:read("weapons.json"), baseArmors:read("base-armors.json"), boots:read("boots.json"), belts:read("belts.json"), amulets:read("amulets.json"), capes:read("capes.json"), gloves:read("gloves.json"), pants:read("pants.json"), rings:read("rings.json"),
  itemQualities:read("item-qualities.json"),
  skills:read("skills.json"), formulaConstants:read("formula-constants.json")};
const engine = createCombatEngine(reference);
const {effects} = createEquipmentEffects({engine});
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

const stats = {Vitesse:42, Esquive:31, "Dextérité":62, Intelligence:67, Courage:37, "Volonté":60};
const knight = {
  stats,
  skills:{martial:{"Armes d’hast":40, "Lance":20, "Lames longues":30, "Épée longue":10, "Lames courtes":20, "Dague":20, "Combat à deux armes":50}},
  items:[
    {id:"a", itemType:"armor", name:"Armure de plates", templateId:"armor:plate_armor", tier:1, qualityCode:"worn", qualityName:"Usée"},
    {id:"l", itemType:"weapon", name:"Lance", tier:2, qualityCode:"standard", qualityName:"Correcte"}
  ],
  equipment:{slots:{armor:"a", weapon_set_1_main:"l"}}
};
const e = effects(knight);
// Vitesse : 42 − 12 × 1,2 (armure usée) − 12 × (1 − 60/400) (la lance, plus divisée par deux à deux mains : Idan,
// 2026-11-02).
near(e.Vitesse.base, 42);
near(e.Vitesse.value, 42 - 14.4 - 12 * 0.85);
assert.deepEqual(e.Vitesse.lines.map(l => [l.label, l.reason]),
  [["Armure de plates (Usée)", "armor"], ["Lance (Correcte)", "weight"]]);
near(e.Vitesse.lines[0].delta, -14.4);
near(e.Vitesse.lines[1].delta, -10.2);
// Esquive : 31 − 16 × 1,2 ; la lance tenue seule, à une main par défaut, mais sans Combat à une main : rien de plus.
near(e.Esquive.value, 31 - 19.2);
// Résistances élémentaires (Idan, 2026-10-25) : l'armure compte ; plates −20 au feu, −25 au froid, usées (÷ 0,8).
near(e["Résistance au feu"].value, -25);
near(e["Résistance au froid"].value, -25 / 0.8);
assert.deepEqual(e["Résistance au feu"].lines.map(l => [l.label, l.reason]), [["Armure de plates (Usée)", "armorElement"]]);
// Initiative : la Vitesse au combat remplace la Vitesse.
near(e.Initiative.value - e.Initiative.base, e.Vitesse.value - 42);
near(e.Initiative.base, 42 + 0.25 * 67 + 0.10 * 37 + 0.05 * 60);
assert.equal(e.Dextérité.lines.length, 0, "une seule arme : Dextérité intacte");
near(e.Dextérité.value, 62);

// Deux armes en main : Dextérité / (2 − 50/100).
const duelist = {...knight,
  items:[{id:"s", itemType:"weapon", name:"Épée longue", tier:2, qualityCode:"standard"}, {id:"d", itemType:"weapon", name:"Dague", tier:2, qualityCode:"standard"}],
  equipment:{slots:{weapon_set_1_main:"s", weapon_set_1_off:"d"}}};
const d = effects(duelist);
near(d.Dextérité.value, 62 / 1.5);
assert.deepEqual(d.Dextérité.lines.map(l => l.reason), ["dual"]);
assert.equal(d.Esquive.lines.length, 0, "sans armure : Esquive intacte");

// Bottes (Idan, 2026-10-24) : + 5 / 10 / 15 / 20 % de la caractéristique de base, au combat aussi.
const shod = character => ({...knight, stats:{...stats, Perception:50}, items:[...knight.items, character],
  equipment:{slots:{...knight.equipment.slots, boots:character.id}}});
const swift = effects(shod({id:"b", itemType:"boots", name:"Bottes de vitesse", tier:2, qualityName:"Correcte"}));
near(swift.Vitesse.value - e.Vitesse.value, 4.2, "Vitesse 42 + 10 %");
assert.deepEqual(swift.Vitesse.lines[0], {label:"Bottes de vitesse (Correcte)", delta:4.2, reason:"gear", percent:10});
near(swift.Initiative.value - e.Initiative.value, 4.2);
assert.equal(swift.Perception.lines.length, 0, "les bottes de vitesse ne touchent pas la Perception");
const dodger = effects(shod({id:"b", itemType:"boots", name:"Bottes d’esquive", tier:3}));
near(dodger.Esquive.value, 31 * 1.15 - 19.2);
assert.deepEqual(dodger.Esquive.lines.map(l => l.reason), ["gear","armor"]);
const watcher = shod({id:"b", itemType:"boots", name:"Bottes de perception", tier:1});
near(effects(watcher).Perception.value, 52.5);
near(engine.statWithGear({character:watcher, activeSet:1}, "Perception"), 52.5, "le combat lit la même Perception");

// Ceintures (Idan, 2026-10-24) : mêmes règles, sur l'emplacement Ceinturon.
const belted = (name, tier, more = {}) => {
  const c = {...knight, stats:{...stats, Endurance:60, Courage:50, "Réserve de mana":40, ...more},
    items:[...knight.items, {id:"c", itemType:"belt", name, tier, qualityName:"Usée"}], equipment:{slots:{...knight.equipment.slots, belt:"c"}}};
  return {c, e:effects(c)};
};
const tough = belted("Ceinture d’endurance", 3);
near(tough.e.Endurance.value, 69, "Endurance 60 + 15 %");
assert.deepEqual(tough.e.Endurance.lines, [{label:"Ceinture d’endurance (Usée)", delta:9, reason:"gear", percent:15}]);
const toughUnit = {character:tough.c, activeSet:1};
near(engine.movementBase(toughUnit) >= 1 ? engine.statWithGear(toughUnit, "Endurance") : 0, 69, "le combat lit la même Endurance");
const brave = belted("Ceinture de courage", 4);
near(brave.e.Courage.value, 60);
near(brave.e.Initiative.value - brave.e.Initiative.base - (brave.e.Vitesse.value - 42), 1, "Initiative : 0,1 × Courage bonifié");
assert.deepEqual(brave.e.Initiative.lines.map(l => l.reason), ["speed","courage"]);
near(engine.courageHold({character:brave.c, activeSet:1}, {character:{stats:{}, skills:{}}, activeSet:1}),
  engine.courageHold({character:{...brave.c, equipment:{slots:{}}}, activeSet:1}, {character:{stats:{}, skills:{}}, activeSet:1}) + 10,
  "tenir son Courage : +10 avec la ceinture T4");
const mage = belted("Ceinture de mana", 1);
near(mage.e["Réserve de mana"].value, 42);
assert.equal(mage.e.Endurance.lines.length, 0, "une ceinture de mana ne touche pas l'Endurance");

// Amulettes (Idan, 2026-10-24) : mêmes règles, sur l'emplacement Amulette.
const amuleted = (name, tier) => {
  const c = {...knight, stats:{...stats, Chance:40, "Puissance magique":50},
    items:[...knight.items, {id:"m", itemType:"amulet", name, tier, qualityName:"Correcte"}], equipment:{slots:{...knight.equipment.slots, amulet:"m"}}};
  return {c, e:effects(c), unit:{character:c, activeSet:1}, bare:{character:{...c, equipment:{slots:{...knight.equipment.slots}}}, activeSet:1}};
};
const stern = amuleted("Amulette de volonté", 4);
near(stern.e["Volonté"].value, 72, "Volonté 60 + 20 %");
assert.deepEqual(stern.e["Volonté"].lines, [{label:"Amulette de volonté (Correcte)", delta:12, reason:"gear", percent:20}]);
near(stern.e.Initiative.value - stern.e.Initiative.base - (stern.e.Vitesse.value - 42), 0.6, "Initiative : 0,05 × Volonté bonifiée");
assert.deepEqual(stern.e.Initiative.lines.map(l => l.reason), ["speed","will"]);
const nobody = {character:{stats:{}, skills:{}}, activeSet:1};
near(engine.courageHold(stern.unit, nobody), engine.courageHold(stern.bare, nobody) + 3, "tenir son Courage : 0,25 × Volonté bonifiée");
const lucky = amuleted("Amulette de chance", 2);
near(lucky.e.Chance.value, 44);
near(engine.criticalChance(lucky.unit), engine.criticalChance(lucky.bare) * 44 / 40, "critique : la Chance bonifiée");
const sage = amuleted("Amulette de puissance magique", 1);
near(sage.e["Puissance magique"].value, 52.5);
assert.equal(sage.e.Chance.lines.length, 0, "une amulette de puissance magique ne touche pas la Chance");

// Bâtons (Idan, 2026-10-29 ; par tier, 2026-11-05) : tenus dans le set actif, Bâton long + 5 / 10 / 15 / 20 % de
// Puissance magique, Bâton court + 5 / 10 / 15 / 20 % de Réserve de mana (T1 à T4) ; rangés dans l'autre set, rien.
const staffed = (name, slot, tier = 1) => {
  const c = {...knight, stats:{...stats, "Puissance magique":60, "Réserve de mana":50},
    items:[...knight.items, {id:"b", itemType:"weapon", name, tier, qualityName:"Correcte"}], equipment:{slots:{armor:"a", [slot]:"b"}}};
  return {c, e:effects(c), unit:{character:c, activeSet:1}};
};
const longStaff = staffed("Bâton long", "weapon_set_1_main");
near(longStaff.e["Puissance magique"].value, 63);
assert.deepEqual(longStaff.e["Puissance magique"].lines, [{label:"Bâton long (Correcte)", delta:3, reason:"gear", percent:5}]);
near(longStaff.e["Réserve de mana"].value, 50);
for (const [tier, value] of [[2,66],[3,69],[4,72]]) near(staffed("Bâton long", "weapon_set_1_main", tier).e["Puissance magique"].value, value, `Bâton long T${tier}`);
const shortStaff = staffed("Bâton court", "weapon_set_1_off");
near(shortStaff.e["Réserve de mana"].value, 52.5);
near(engine.statWithGear(shortStaff.unit, "Réserve de mana"), 52.5, "le combat et la magie lisent la même valeur");
near(engine.statWithGear({...shortStaff.unit, activeSet:2}, "Réserve de mana"), 50, "set 2 en main : le bâton du set 1 ne compte pas");
near(staffed("Bâton court", "weapon_set_1_off", 4).e["Réserve de mana"].value, 60, "Bâton court T4 : + 20 %");
near(staffed("Bâton long", "weapon_set_2_main").e["Puissance magique"].value, 60);
// Deux bâtons courts (Idan, 2026-11-05 : « surtout qu'on peut en mettre 2 ») : les deux comptent.
{
  const c = {...knight, stats:{...stats, "Réserve de mana":50}, items:[...knight.items,
    {id:"s1", itemType:"weapon", name:"Bâton court", tier:2, qualityName:"Correcte"}, {id:"s2", itemType:"weapon", name:"Bâton court", tier:3, qualityName:"Correcte"}],
    equipment:{slots:{armor:"a", weapon_set_1_main:"s1", weapon_set_1_off:"s2"}}};
  near(engine.statWithGear({character:c, activeSet:1}, "Réserve de mana"), 50 * 1.25, "T2 + T3 : + 10 % + 15 %");
}
// Fouet, Trident (5 / 10 / 15 / 20 %), Marteau de guerre, Épée à deux mains (3 / 6 / 9 / 12 %) ; Idan, 2026-11-05.
const held = (name, tier = 1) => {
  const c = {...knight, stats:{...stats, Charisme:40}, skills:{...knight.skills, magic:{Eau:50, Foudre:30, Feu:40}},
    items:[...knight.items, {id:"h", itemType:"weapon", name, tier, qualityName:"Correcte"}], equipment:{slots:{armor:"a", weapon_set_1_main:"h"}}};
  return effects(c);
};
near(held("Fouet").Charisme.value, 42);
near(held("Fouet", 4).Charisme.value, 48);
near(held("Trident").Eau.value, 52.5);
near(held("Trident", 3).Eau.value, 57.5);
near(held("Marteau de guerre").Foudre.value, 30.9);
near(held("Marteau de guerre", 4).Foudre.value, 33.6);
near(held("Trident").Foudre.value, 30, "le trident ne touche que l'Eau");
near(held("Épée à deux mains").Feu.value, 41.2, "Épée à deux mains T1 + 3 % en Feu");
near(held("Épée à deux mains", 2).Feu.value, 42.4, "Épée à deux mains T2 + 6 % en Feu");

// Capes (Idan, 2026-10-24) : Esquive et Discrétion en pourcentage ; Résistance physique en points (+5 à +20).
const caped = (name, tier) => {
  const c = {...knight, resistances:{"Résistance physique":5}, skills:{martial:{"Discrétion":30}},
    items:[...knight.items, {id:"k", itemType:"cape", name, tier, qualityName:"Correcte"}], equipment:{slots:{...knight.equipment.slots, cape:"k"}}};
  return {c, e:effects(c), unit:{character:c, activeSet:1}};
};
const rampart = caped("Cape de résistance physique", 3);
near(rampart.e["Résistance physique"].value, 20, "Résistance physique 5 + 15 points");
assert.deepEqual(rampart.e["Résistance physique"].lines, [{label:"Cape de résistance physique (Correcte)", delta:15, reason:"gear", points:15}]);
near(engine.statWithGear(rampart.unit, "Résistance physique"), 20, "le combat lit la même Résistance physique");
const dancer = caped("Cape d’esquive", 2);
near(dancer.e.Esquive.value, 31 * 1.10 - 19.2, "Esquive 31 + 10 % − armure");
assert.deepEqual(dancer.e.Esquive.lines.map(l => l.reason), ["gear","armor"]);
const shadow = caped("Cape de discrétion", 4);
// … moins le malus de Discrétion des plates (Idan, 2026-11-12 : 16 × 1,2 pour sa qualité, comme l'Esquive).
near(shadow.e["Discrétion"].value, 36 - 19.2, "Discrétion 30 + 20 % − armure");
assert.deepEqual(shadow.e["Discrétion"].lines.map(l => l.reason), ["gear","armor"]);
assert.equal(shadow.e["Résistance physique"].lines.length, 0, "une cape de discrétion ne touche pas la Résistance physique");

// Gants (Idan, 2026-10-24) : Force (dégâts et blessure au CAC), Dextérité (toucher, blocage), Pièges.
const gloved = (name, tier, more = {}) => {
  const c = {...knight, stats:{...stats, Force:60, ...more}, skills:{...knight.skills, martial:{...(knight.skills?.martial||{}), "Pièges":30}},
    items:[...knight.items, {id:"g", itemType:"gloves", name, tier, qualityName:"Correcte"}], equipment:{slots:{...knight.equipment.slots, gloves:"g"}}};
  return {c, e:effects(c), unit:{character:c, activeSet:1}, bare:{character:{...c, equipment:{slots:{...knight.equipment.slots}}}, activeSet:1}};
};
const strong = gloved("Gants de force", 4);
near(strong.e.Force.value, 72, "Force 60 + 20 %");
assert.deepEqual(strong.e.Force.lines, [{label:"Gants de force (Correcte)", delta:12, reason:"gear", percent:20}]);
near(engine.statWithGear(strong.unit, "Force"), 72, "le combat lit la même Force");
const deft = gloved("Gants de dextérité", 2);
near(deft.e["Dextérité"].value, 62 * 1.10, "Dextérité 62 + 10 %");
assert.equal(deft.e["Dextérité"].lines[0].reason, "gear");
near(engine.effectiveDexterity(deft.unit), engine.effectiveDexterity(deft.bare) * 1.10, "toucher : la Dextérité avec les gants");
const trapper = gloved("Gants de pièges", 3);
near(trapper.e["Pièges"].value, 34.5, "Pièges 30 + 15 %");
assert.equal(strong.e["Pièges"].lines.length, 0, "des gants de force ne touchent pas les Pièges");

// Culottes (Idan, 2026-10-24) : Charisme et Intimidation (le combat lit l'Intimidation de l'adversaire) ; le Slip
// d'Affinité ne touche aucune valeur de la fiche.
const worn = (name, tier) => {
  const c = {...knight, stats:{...stats, Charisme:50}, skills:{...knight.skills, social:{Intimidation:40}},
    items:[...knight.items, {id:"p", itemType:"pants", name, tier, qualityName:"Correcte"}], equipment:{slots:{...knight.equipment.slots, pants:"p"}}};
  return {c, e:effects(c), unit:{character:c, activeSet:1}};
};
const charmer = worn("String du Charisme", 3);
near(charmer.e.Charisme.value, 57.5, "Charisme 50 + 15 %");
assert.deepEqual(charmer.e.Charisme.lines, [{label:"String du Charisme (Correcte)", delta:7.5, reason:"gear", percent:15}]);
const bully = worn("Culotte d’Intimidation", 4);
near(bully.e.Intimidation.base, 40, "l'Intimidation de base vient des compétences sociales");
near(bully.e.Intimidation.value, 48, "Intimidation 40 + 20 %");
near(engine.statWithGear(bully.unit, "Intimidation"), 48, "le combat lit la même Intimidation");
const friend = worn("Slip d’Affinité", 4);
for (const name of Object.keys(friend.e)) assert.equal(friend.e[name].lines.filter(l => l.reason === "gear").length, 0, name);

// Bagues (Idan, 2026-10-24) : six emplacements, cumulables ; bague de magie : + son école, − les deux écoles opposées.
const ringed = rings => {
  const items = rings.map(([name, tier], k) => ({id:"r" + k, itemType:"ring", name, tier, qualityName:"Correcte"}));
  const slots = Object.fromEntries(items.map((it, k) => ["ring_" + (k + 1), it.id]));
  const c = {...knight, stats:{...stats, Chance:50}, skills:{...knight.skills, magic:{Feu:40, Eau:30, "Télékinésie":20, Vie:10}},
    items:[...knight.items, ...items], equipment:{slots:{...knight.equipment.slots, ...slots}}};
  return {c, e:effects(c), unit:{character:c, activeSet:1}};
};
const fortunate = ringed([["Bague de la chance", 3]]);
near(fortunate.e.Chance.value, 57.5, "Chance 50 + 15 %");
near(engine.statWithGear(fortunate.unit, "Chance"), 57.5, "le combat lit la même Chance (critiques)");
const bold = ringed([["Bague du courage", 2], ["Bague du courage", 2]]);
near(bold.e.Courage.value, 37 * 1.2, "deux bagues identiques se cumulent : Courage 37 + 2 × 10 %");
const pyro = ringed([["Bague de Feu", 2], ["Bague de Feu", 1]]);
near(pyro.e.Feu.value, 50, "Feu 40 + 15 % + 10 %");
near(pyro.e.Eau.value, 22.5, "Eau 30 − 10 % − 15 %");
near(pyro.e["Télékinésie"].value, 15, "Télékinésie 20 − 10 % − 15 %");
assert.deepEqual(pyro.e.Eau.lines.map(l => l.percent), [-10, -15]);
near(pyro.e.Vie.value, 10, "une école non opposée ne bouge pas");
const master = ringed([["Bague de Feu", 4]]);
near(master.e.Feu.value, 50, "T4 : + 25 %");
assert.equal(master.e.Eau.lines.length, 0, "T4 : plus de malus");

// Sans équipement : rien ne change.
const bare = effects({stats, skills:{}, items:[], equipment:{slots:{}}});
for (const name of ["Vitesse","Esquive","Perception","Endurance","Courage","Réserve de mana","Puissance magique","Volonté","Chance",
  "Résistance physique","Discrétion","Force","Pièges","Charisme","Intimidation","Initiative","Dextérité"]) near(bare[name].value, bare[name].base);
// Dégâts par set (Idan, 2026-10-24) : jet minimum et maximum du combat contre une cible sans résistance.
const {attacks} = createEquipmentEffects({engine});
const fighter = {stats:{Force:60},
  items:[{id:"l", name:"Lance", qualityCode:"luxury", qualityName:"Grand Luxe"}, {id:"s", name:"Épée longue", qualityCode:"standard"},
    {id:"d", name:"Dague", qualityCode:"worn", qualityName:"Usée"}, {id:"a", name:"Arquebuse", qualityCode:"standard"}],
  equipment:{slots:{weapon_set_1_main:"l", weapon_set_2_main:"s", weapon_set_2_off:"d"}}};
const [set1, set2] = attacks(fighter);
// Lance 1D8 (Au choix), tenue seule : à une main par défaut, Grand Luxe ×1,2, Force 60 ×1,2 : ⌈10 × 1,44⌉ à ⌈10 × 8 × 1,44⌉ ;
// puis empoignée à deux mains (« Attaquer à deux mains », Idan, 2026-11-02) ×1,5 : ⌈10 × 2,16⌉ à ⌈10 × 8 × 2,16⌉.
assert.deepEqual(set1.strikes.map(s => [s.name, s.mode, s.twoHands, s.dice, s.min, s.max]), [["Lance","melee",false,"1D8",15,116],["Lance","melee",true,"1D8",22,173]]);
assert.deepEqual(set1.strikes[0].types, [{type:"Perforant", power:55}]);
assert.deepEqual(set1.strikes[0].factors.map(f => [f.label, Math.round(f.factor * 100) / 100]), [["Grand Luxe",1.2],["Force",1.2]]);
assert.deepEqual(set1.strikes[1].factors.map(f => [f.label, Math.round(f.factor * 100) / 100]), [["Grand Luxe",1.2],["À deux mains",1.5],["Force",1.2]]);
// Deux armes : chaque main frappe ; la lance n'est plus à deux mains.
assert.deepEqual(set2.strikes.map(s => [s.hand, s.name, s.min, s.max]), [["main","Épée longue",12,96],["off","Dague",10,39]]);
assert.deepEqual(set2.strikes[0].types.map(t => t.type), ["Tranchant","Perforant"]);
// Arme de tir : ni Force ni bonus à deux mains.
fighter.equipment.slots = {weapon_set_1_main:"a"};
const [shot, none] = attacks(fighter);
assert.deepEqual(shot.strikes.map(s => [s.mode, s.min, s.max, s.factors.length]), [["ranged",10,120,0]]);
assert.deepEqual(none.strikes, [], "set vide : pas d'attaque");

// Case « Dégâts » de l'onglet Équipement (prototype-web/ui.js).
const ui = fs.readFileSync(path.join(ROOT, "prototype-web/ui.js"), "utf8");
const from = ui.indexOf("function renderDamageCard"), to = ui.indexOf("function renderEquipment(c)");
const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const sheetCopy = JSON.parse(fs.readFileSync(path.join(ROOT, "data/reference/character-sheet-copy.json"), "utf8"));
const weapons = JSON.parse(fs.readFileSync(path.join(ROOT, "data/reference/weapons.json"), "utf8"));
const {renderDamageCard} = new Function("esc","equipmentEffectRules","game", ui.slice(from, to) + "\nreturn {renderDamageCard};")(
  esc, () => createEquipmentEffects({engine}), {referenceData:{characterSheetCopy:sheetCopy, weapons}});
fighter.equipment.slots = {weapon_set_1_main:"l", weapon_set_2_main:"s", weapon_set_2_off:"d"};
const card = renderDamageCard(fighter);
assert.match(card, /<h4>Dégâts<\/h4>/);
// Idan (2026-10-30) : quatre chiffres pour comparer, des scores et non des chances — Précision, Puissance, Dégâts
// (fourchette et type), Pénétration d'armure — rien de la recette (dés, multiplicateurs), rien pour un set vide.
assert.match(card, /<th scope="col"><small>Set 1<\/small><strong>Lance<\/strong><\/th><th scope="col"><small>Set 1 · à deux mains<\/small><strong>Lance<\/strong><\/th><th scope="col"><small>Set 2<\/small><strong>Épée longue<\/strong><\/th><th scope="col"><small>Set 2 · main secondaire<\/small><strong>Dague<\/strong><\/th>/,
  "une colonne par arme qui frappe ; la lance tenue seule, aussi à deux mains");
const lanceUnit = {character:fighter, activeSet:1};
const cells = name => card.match(new RegExp(`<tr><th scope="row"><span class="sheet-stat-name" tabindex="0">${name}[^]*?</tr>`))[0].match(/<td>[^]*?<\/td>/g);
assert.equal(cells("Précision")[0], `<td><b>${Math.round(engine.attackPrecision(lanceUnit))}</b></td>`);
assert.equal(cells("Puissance")[0], `<td><b>${Math.round(engine.attackPower(lanceUnit, "melee"))}</b></td>`);
assert.deepEqual(cells("Dégâts"), ["<td><b>15 à 116</b> PV<small>en perforant</small></td>","<td><b>22 à 173</b> PV<small>en perforant</small></td>",
  "<td><b>12 à 96</b> PV<small>en tranchant ou perforant</small></td>", "<td><b>10 à 39</b> PV<small>en tranchant ou perforant</small></td>"],
  "du plus petit au plus grand coup, et son type");
assert.deepEqual(cells("Pénétration d’armure").slice(0, 3), ["<td><b>55</b></td>","<td><b>55</b></td>",
  "<td><span><b>50</b> tranchant</span><span><b>40</b> perforant</span></td>"], "une pénétration par type");
assert.match(card, /<strong>Précision<\/strong><em>Les chances de toucher[^<]*<\/em><span>Nouvelles recrues : de 50 à 145\.<\/span>/);
assert.match(card, /<span>Selon l’arme : de 10 à 95\.<\/span>/);
assert.doesNotMatch(card, /1D8|×1,2|Mêlée|Tir<|≈|Avant l’armure|PV par coup|%/);
fighter.equipment.slots = {weapon_set_1_main:"l"};
assert.doesNotMatch(renderDamageCard(fighter), /Set 2|Aucune arme/, "set 2 vide : rien");
fighter.equipment.slots = {};
assert.equal(renderDamageCard(fighter), "", "aucune arme : pas de case Dégâts");
console.log("Effets de l'équipement sur la fiche : Vitesse, Esquive, Perception, Initiative, Dextérité, bottes, dégâts par set — OK");
