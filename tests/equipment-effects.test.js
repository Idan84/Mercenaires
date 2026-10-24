"use strict";

// Effets de l'équipement sur la fiche (Idan, 2026-10-24) : ceux que le combat applique, avec le set 1 en main.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createEquipmentEffects} = require("../game-core/equipment-effects.js");

const ROOT = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"));
const reference = {weapons:read("weapons.json"), baseArmors:read("base-armors.json"), itemQualities:read("item-qualities.json"),
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

// Sans équipement : rien ne change.
const bare = effects({stats, skills:{}, items:[], equipment:{slots:{}}});
for (const name of ["Vitesse","Esquive","Initiative","Dextérité"]) near(bare[name].value, bare[name].base);
console.log("Effets de l'équipement sur la fiche : Vitesse, Esquive, Initiative, Dextérité — OK");
