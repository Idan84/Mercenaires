"use strict";

// Le troll (Idan, 2026-11-06 : « On va ajouter un troll. Niveau 1 à 4. Peut être chez les orcs, les gobelins ou les hommes
// bêtes à partir de 6*. Il est lent, bête mais fort et très intimidant. Il se régénère et tape avec une grosse massue. En
// force : 80/100/120/140. En PV : 300/600/900/1200 » ; Régénération 100/150/200/300 « ok »).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const Missions = require("../game-core/missions.js");
const Regeneration = require("../game-core/regeneration.js");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "prototype-web", "reference-data.js"), "utf8");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));
const FACTIONS = ["Gobelins", "Orcs", "Hommes-bêtes"];

// 1. Les fiches : un troll sur quatre niveaux dans chacun des trois peuples, identique de l'un à l'autre.
const trolls = reference.enemyArchetypes.rows.filter(r => r.ligne === "Troll");
assert.deepEqual([...new Set(trolls.map(r => r.faction))].sort(), [...FACTIONS].sort());
const stats = r => JSON.stringify([r.caracteristiques, r.pv, r.regeneration, r.intimidation, r.attaque, r.points]);
for (const faction of FACTIONS) {
  const own = trolls.filter(r => r.faction === faction);
  assert.deepEqual(own.map(r => r.niveau), ["novice", "normal", "vétéran", "d’élite"], faction);
  assert.deepEqual(own.map(r => r.caracteristiques.Force), [80, 100, 120, 140], faction + " : Force");
  assert.deepEqual(own.map(r => r.pv), [300, 600, 900, 1200], faction + " : PV");
  assert.deepEqual(own.map(r => r.regeneration), [100, 150, 200, 300], faction + " : Régénération");
  assert.deepEqual(own.map(stats), trolls.filter(r => r.faction === "Orcs").map(stats), faction + " : le même troll");
}
const maxIntimidation = Math.max(...reference.enemyArchetypes.rows.filter(r => r.ligne !== "Troll").map(r => r.intimidation));
for (const r of trolls) {
  assert.ok(r.points > 0, r.code + " : points");
  assert.equal(r.niveau_mission_min, 6, r.code + " : à partir du niveau 6");
  assert.ok(r.intimidation > maxIntimidation, r.code + " : très intimidant");
  assert.ok(r.caracteristiques.Vitesse <= 40 && r.caracteristiques.Intelligence <= 16, r.code + " : lent et bête");
  assert.deepEqual([r.armes, r.armure, r.attaque.nom], [[], null, "Grosse massue"], r.code + " : sa grosse massue");
}

// 2. Les camps : une ligne Troll (poids 10) chez les trois peuples ; jamais avant le niveau 6, puis de temps en temps.
const camps = reference.oneShotMissions.missions[0].camps;
for (const faction of FACTIONS) assert.equal(camps.find(c => c.faction === faction).lignes.find(l => l.ligne === "Troll")?.poids, 10, faction);
let seed = 91;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rules = Missions.createMissionRules({reference, random});
const isTroll = code => rules.archetype(code).ligne === "Troll";
let before = 0, after = 0, campsAfter = 0;
for (let i = 0; i < 600; i++) {
  const low = rules.rollCamp(undefined, camps.find(c => c.faction === FACTIONS[i % 3]), {level: 1 + i % 5});
  before += low.enemies.filter(isTroll).length;
  const high = rules.rollCamp(undefined, camps.find(c => c.faction === FACTIONS[i % 3]), {level: 6 + i % 10});
  after += high.enemies.filter(isTroll).length;
  if (high.enemies.some(isTroll)) campsAfter++;
}
assert.equal(before, 0, "pas de troll avant le niveau 6");
assert.ok(after > 0 && campsAfter > 100, "des trolls à partir du niveau 6 : " + campsAfter + " camps sur 600");

// 3. La fiche appliquée : sa massue (pas de butin), sa Régénération, son Intimidation.
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const captain = generator.createCaptain({id: 1});
const arch = rules.archetype("orc_troll_elite");
const troll = rules.applyArchetype(generator.createMercenary({id: 2, captain, forcedPeople: arch.peuple, forcedCulture: arch.culture}), arch, {idPrefix: "t"});
const club = troll.items.find(i => i.natural);
assert.ok(club && club.template.nom === "Grosse massue" && troll.equipment.slots.weapon_set_1_main === club.id);
assert.equal(troll.pvMax, 1200);
assert.equal(troll.skills.physiology["Régénération"], 300);
assert.equal(troll.skills.social.Intimidation, 100);
const regen = Regeneration.createRegenerationRules({reference, random});
assert.equal(regen.points(troll), 300);
console.log("Troll : 3 peuples × 4 niveaux, Force 80 à 140, PV 300 à 1200, Régénération 100 à 300, dès le niveau 6 (" + campsAfter + " camps sur 600 en ont) — OK");
