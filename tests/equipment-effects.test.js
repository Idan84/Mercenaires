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
const reference = {weapons:read("weapons.json"), baseArmors:read("base-armors.json"), boots:read("boots.json"), itemQualities:read("item-qualities.json"),
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
assert.deepEqual(swift.Vitesse.lines[0], {label:"Bottes de vitesse (Correcte)", delta:4.2, reason:"boots", percent:10});
near(swift.Initiative.value - e.Initiative.value, 4.2);
assert.equal(swift.Perception.lines.length, 0, "les bottes de vitesse ne touchent pas la Perception");
const dodger = effects(shod({id:"b", itemType:"boots", name:"Bottes d’esquive", tier:3}));
near(dodger.Esquive.value, 31 * 1.15 - 19.2);
assert.deepEqual(dodger.Esquive.lines.map(l => l.reason), ["boots","armor"]);
const watcher = shod({id:"b", itemType:"boots", name:"Bottes de perception", tier:1});
near(effects(watcher).Perception.value, 52.5);
near(engine.statWithBoots({character:watcher, activeSet:1}, "Perception"), 52.5, "le combat lit la même Perception");

// Sans équipement : rien ne change.
const bare = effects({stats, skills:{}, items:[], equipment:{slots:{}}});
for (const name of ["Vitesse","Esquive","Perception","Initiative","Dextérité"]) near(bare[name].value, bare[name].base);
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
