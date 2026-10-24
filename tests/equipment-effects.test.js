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
const reference = {weapons:read("weapons.json"), baseArmors:read("base-armors.json"), boots:read("boots.json"), belts:read("belts.json"), amulets:read("amulets.json"), capes:read("capes.json"),
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
// Vitesse : 42 − 12 × 1,2 (armure usée) − 12 × (1 − 60/400) × 0,5 (lance tenue à deux mains).
near(e.Vitesse.base, 42);
near(e.Vitesse.value, 42 - 14.4 - 12 * 0.85 * 0.5);
assert.deepEqual(e.Vitesse.lines.map(l => [l.label, l.reason, Boolean(l.twoHands)]),
  [["Armure de plates (Usée)", "armor", false], ["Lance (Correcte)", "weight", true]]);
near(e.Vitesse.lines[0].delta, -14.4);
near(e.Vitesse.lines[1].delta, -5.1);
// Esquive : 31 − 16 × 1,2.
near(e.Esquive.value, 31 - 19.2);
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
near(shadow.e["Discrétion"].value, 36, "Discrétion 30 + 20 %");
assert.equal(shadow.e["Résistance physique"].lines.length, 0, "une cape de discrétion ne touche pas la Résistance physique");

// Sans équipement : rien ne change.
const bare = effects({stats, skills:{}, items:[], equipment:{slots:{}}});
for (const name of ["Vitesse","Esquive","Perception","Endurance","Courage","Réserve de mana","Puissance magique","Volonté","Chance",
  "Résistance physique","Discrétion","Initiative","Dextérité"]) near(bare[name].value, bare[name].base);
// Dégâts par set (Idan, 2026-10-24) : jet minimum et maximum du combat contre une cible sans résistance.
const {attacks} = createEquipmentEffects({engine});
const fighter = {stats:{Force:60},
  items:[{id:"l", name:"Lance", qualityCode:"luxury", qualityName:"Grand Luxe"}, {id:"s", name:"Épée longue", qualityCode:"standard"},
    {id:"d", name:"Dague", qualityCode:"worn", qualityName:"Usée"}, {id:"a", name:"Arquebuse", qualityCode:"standard"}],
  equipment:{slots:{weapon_set_1_main:"l", weapon_set_2_main:"s", weapon_set_2_off:"d"}}};
const [set1, set2] = attacks(fighter);
// Lance 1D8, Grand Luxe ×1,2, à deux mains ×1,5, Force 60 ×1,2 : ⌈10 × 1 × 2,16⌉ à ⌈10 × 8 × 2,16⌉.
assert.deepEqual(set1.strikes.map(s => [s.name, s.mode, s.dice, s.min, s.max]), [["Lance","melee","1D8",22,173]]);
assert.deepEqual(set1.strikes[0].types, [{type:"Perforant", power:55}]);
assert.deepEqual(set1.strikes[0].factors.map(f => [f.label, Math.round(f.factor * 100) / 100]), [["Grand Luxe",1.2],["À deux mains",1.5],["Force",1.2]]);
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
const from = ui.indexOf("const DAMAGE_MODES"), to = ui.indexOf("function renderEquipment(c)");
const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const {renderDamageCard} = new Function("esc","equipmentEffectRules", ui.slice(from, to) + "\nreturn {renderDamageCard};")(
  esc, () => createEquipmentEffects({engine}));
fighter.equipment.slots = {weapon_set_1_main:"l", weapon_set_2_main:"s", weapon_set_2_off:"d"};
const card = renderDamageCard(fighter);
assert.match(card, /<h4>Dégâts<\/h4>/);
assert.match(card, /<small>Set 1 · Mêlée<\/small><strong>Lance<\/strong>/);
assert.match(card, /<b>≈ 98<\/b><small>22 à 173 PV<\/small>/, "moyenne en gros, fourchette");
assert.match(card, /Perforant <b>55<\/b>/);
assert.match(card, /1D8 · Grand Luxe ×1,2 · À deux mains ×1,5 · Force ×1,2/);
assert.match(card, /<small>Set 2 · Main secondaire<\/small><strong>Dague<\/strong>/);
assert.match(card, /Avant l’armure et la résistance de la cible/);
fighter.equipment.slots = {};
assert.equal((renderDamageCard(fighter).match(/Aucune arme/g) || []).length, 2);
console.log("Effets de l'équipement sur la fiche : Vitesse, Esquive, Perception, Initiative, Dextérité, bottes, dégâts par set — OK");
