"use strict";

// S'entraîner avec son compagnon (Idan, 2026-11-07 : « on peut envoyer passer du temps au chenil ou à l'écurie un
// mercenaire pour s'entraîner avec son compagnon » ; « Charisme + Intelligence + Intimidation. Un mix des trois. C'est un
// entraînement libre comme pour les écoles de magie. Il y va en fonction de ses envies ») : les Écuries (Équidés) et le
// Chenil (Canidés), ailes de la Grange du dresseur, dans l'entraînement libre ; seulement pour celui qui y a son animal
// apprivoisé (pas au repos) ; gain avec la moyenne de ses Charisme, Intelligence et Intimidation ; la famille et Compagnon
// animal montent ; le Dresseur gagne sa Transmission du savoir.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const {createTavernRules} = require("../game-core/tavern.js");
const {createCampaignRules} = require("../game-core/campaign.js");
const {createProgressionRules} = require("../game-core/progression.js");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "prototype-web", "reference-data.js"), "utf8");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));
const row = code => reference.campBuildings.rows.find(r => r.code === code);

// 1. Les données : ce que travaillent les ailes, avec quoi on apprend.
assert.equal(row("trainer_barn").apprend_avec, "Charisme, Intelligence, Intimidation");
assert.deepEqual([row("trainer_stables").entraine, row("trainer_kennel").entraine], ["Équidés", "Canidés"]);

// 2. La campagne : la Grange, les Écuries, le Chenil ; un humain et son loup, un autre avec un destrier, un sans animal.
let seed = 61, dice = [];
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const rules = createCampaignRules({generator, tavern: createTavernRules({random: () => 0.999, reference}), reference,
  progression: createProgressionRules({reference}), random: () => dice.length ? dice.shift() : random()});
const stable = rules.stableRules;
const captain = generator.createCaptain({id: 1});
const state = rules.createCampaign({captain, squad: [2, 3, 4, 5].map(id => generator.createMercenary({id, captain, forcedPeople: "Humain"}))});
const [, wolfMan, rider, walker, trainer] = state.company.roster;
state.company.camp.buildings = {trainer_barn: {level: 3, construction: null}, trainer_stables: {level: 2, construction: null},
  trainer_kennel: {level: 1, construction: null}};
const [wolf] = stable.admit(state, [{code: "loup", origin: "test"}]).kept;
const [horse] = stable.admit(state, [{code: "destrier", origin: "test"}]).kept;
const give = (m, item, tamed = true) => { state.company.stock = state.company.stock.filter(i => i !== item); item.owner = m.id; if (tamed) item.tamedBy = m.id; m.items.push(item); };
give(wolfMan, wolf);
give(rider, horse);
const rooms = () => rules.trainingRooms(state);
const room = code => rooms().find(r => r.code === code);
assert.deepEqual(rooms().filter(r => r.building === "trainer_barn").map(r => [r.code, r.trains, r.learnWith, r.places, r.animal]),
  [["trainer_stables", "Équidés", "Charisme, Intelligence, Intimidation", 4, true], ["trainer_kennel", "Canidés", "Charisme, Intelligence, Intimidation", 2, true]],
  "dans l'entraînement libre ; la Grange elle-même n'entraîne rien ; places : celles des animaux");
assert.deepEqual([...room("trainer_kennel").only], [wolfMan.id], "le Chenil : celui qui y a son loup apprivoisé");
assert.deepEqual([...room("trainer_stables").only], [rider.id]);
horse.recovery = {kind: "wounded", daysLeft: 2};
assert.equal(room("trainer_stables").only.size, 0, "son cheval au repos : pas d'entraînement");
delete horse.recovery;
horse.tamedBy = null;
assert.equal(room("trainer_stables").only.size, 0, "pas encore apprivoisé : non plus");
horse.tamedBy = rider.id;

// 3. Le gain : la moyenne de ses Charisme, Intelligence et Intimidation (formule de l'entraînement libre).
const training = rules.schoolTraining;
Object.assign(wolfMan.stats, {Charisme: 40, Intelligence: 60});
wolfMan.skills.social = {...wolfMan.skills.social, Intimidation: 80};
assert.equal(training.learnValue(wolfMan, "Charisme, Intelligence, Intimidation"), 60);
assert.equal(training.dailyXp(wolfMan, room("trainer_kennel")), Math.round(40 * 60 / 50 * 1.1), "Chenil niveau 1, sans Dresseur : 53 XP (XP doublée)");
assert.deepEqual(training.xpOf(room("trainer_kennel"), 53, wolfMan), {skills: {animal: {"Canidés": 53, "Compagnon animal": 53}}},
  "la famille et Compagnon animal");

// 4. Une matinée : il y va selon ses envies ; les autres n'y vont pas ; le Dresseur gagne sa Transmission du savoir.
state.company.trainerId = trainer.id;
for (const m of state.company.roster) m.stats["Volonté"] = 95;
const before = Number(wolfMan.skills.animal?.["Canidés"]) || 0, companionBefore = Number(wolfMan.skills.animal?.["Compagnon animal"]) || 0;
let kennelDays = 0, intruders = 0;
for (let day = 0; day < 12; day++) {
  const [morning] = rules.advanceTime(state, 1);
  for (const e of morning.school?.entries || []) {
    if (e.code === "trainer_kennel" && e.id !== wolfMan.id) intruders++;
    if (e.code === "trainer_stables" && e.id !== rider.id) intruders++;
    if (e.code === "trainer_kennel") kennelDays++;
  }
}
assert.equal(intruders, 0, "seulement ceux qui y ont leur animal");
assert.ok(kennelDays > 0, "il s'entraîne avec son loup");
assert.ok((Number(wolfMan.skills.animal["Canidés"]) || 0) > before, "ses Canidés montent");
assert.ok((Number(wolfMan.skills.animal["Compagnon animal"]) || 0) > companionBefore, "son Compagnon animal aussi");

console.log(JSON.stringify({ok: true, kennelDays, canides: [before, wolfMan.skills.animal["Canidés"]]}, null, 2));
