"use strict";

// Noms des animaux et renommer (Idan, 2026-11-07 : « à la capture ou à l'achat de l'animal, on lui attribue un nom ( il
// faut faire une liste de noms pour chaque animal). Je voudrais ajouter la possibilité pour le joueur de renommer un
// mercenaire ou un animal librement. ») : une liste par animal (animal-names.json), un nom qu'aucun autre de nos animaux ne
// porte, à la capture (stables.admit) et à l'achat (merchants, onAcquire) ; renommer une monture (stables.rename) ou un
// mercenaire (campaign.renameMember).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const {createTavernRules} = require("../game-core/tavern.js");
const {createCampaignRules} = require("../game-core/campaign.js");
const {createMerchantRules} = require("../game-core/merchants.js");
const {createAffinityRules} = require("../game-core/affinity.js");
const {cleanName} = require("../game-core/stables.js");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "prototype-web", "reference-data.js"), "utf8");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));

// 1. Les listes : une par animal, sans doublon.
const names = reference.animalNames;
assert.equal(names.row_count, names.rows.length);
for (const code of reference.mounts.rows.map(r => r.code)) {
  const row = names.rows.find(r => r.code === code);
  assert.ok(row && row.noms.length >= 20, "une liste pour " + code);
  assert.equal(new Set(row.noms).size, row.noms.length, "sans doublon : " + code);
}

// 2. À la capture : un nom de sa liste, jamais deux fois le même.
let seed = 41;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const rules = createCampaignRules({generator, tavern: createTavernRules({random: () => 0.999, reference}), reference, random});
const stable = rules.stableRules;
const captain = generator.createCaptain({id: 1});
const state = rules.createCampaign({captain, squad: [2, 3].map(id => generator.createMercenary({id, captain}))});
state.company.camp.buildings = {trainer_barn: {level: 1, construction: null}, trainer_stables: {level: 10, construction: null}};
const listOf = code => names.rows.find(r => r.code === code).noms;
const {kept} = stable.admit(state, Array.from({length: 6}, () => ({code: "destrier", origin: "test"})));
assert.equal(kept.length, 6);
for (const m of kept) assert.ok(listOf("destrier").includes(m.petName), "un nom de destrier : " + m.petName);
assert.equal(new Set(kept.map(m => m.petName)).size, 6, "six noms différents");
assert.ok(kept.every(m => m.name === "Destrier"), "l'objet garde son espèce (les marchands la reconnaissent)");
// La liste épuisée : un nom de la liste suivi d'un numéro.
const full = {company: {stock: listOf("licorne").map((n, i) => ({id: "l" + i, itemType: "mount", mountCode: "licorne", petName: n})), roster: []}};
const extra = {itemType: "mount", mountCode: "licorne", name: "Licorne"};
assert.match(stable.giveName(full, extra), /^.+ 2$/, "la liste épuisée : « Nacre 2 »");
assert.equal(stable.giveName(full, extra), extra.petName, "déjà nommée : on ne la renomme pas");

// 3. À l'achat : le marchand appelle onAcquire.
state.company.gold = 100000;
const merchants = createMerchantRules({reference, generator, affinity: createAffinityRules({reference}), random,
  canStore: (s, item) => stable.canStore(s, item), onAcquire: (s, item) => stable.giveName(s, item)});
state.market = {visit: {merchantId: "ysolwen-chanteseve", day: state.day, stock: [{id: 0, item: generator.createItemByName("mount", "Licorne")}], sold: {}, traded: false}, merchants: {}};
const bought = merchants.buy(state, 0);
assert.equal(bought.ok, true, bought.reason);
assert.ok(listOf("licorne").includes(bought.item.petName), "un nom de licorne : " + bought.item.petName);
// Un objet ordinaire n'a pas de nom.
const sword = generator.createItemByName("weapon", "Épée longue");
assert.equal(stable.giveName(state, sword), null);
assert.equal(sword.petName, undefined);

// 4. Renommer une monture, librement.
const horse = kept[0], first = horse.petName;
assert.deepEqual(stable.rename(state, horse.id, "   Gros  Bidou\u0007 "), {ok: true, mount: horse, before: first, name: "Gros Bidou"});
assert.equal(horse.petName, "Gros Bidou");
assert.equal(stable.rename(state, horse.id, "   ").ok, false, "il faut un nom");
assert.equal(stable.rename(state, "nope", "X").ok, false);
assert.equal(cleanName("x".repeat(60)).length, 40, "40 caractères au plus");

// 5. Renommer un mercenaire : son nom, son prénom (les dialogues l'emploient).
const merc = state.company.roster[1];
const result = rules.renameMember(state, merc.id, "Brann  le Rouge");
assert.equal(result.ok, true);
assert.deepEqual([merc.name, merc.firstName, merc.familyName], ["Brann le Rouge", "Brann", "le Rouge"]);
rules.renameMember(state, merc.id, "Brann");
assert.deepEqual([merc.name, merc.firstName, merc.familyName], ["Brann", "Brann", null]);
assert.equal(rules.renameMember(state, merc.id, "").ok, false, "il faut un nom");
assert.equal(rules.renameMember(state, 999, "X").ok, false);

console.log(JSON.stringify({ok: true, destriers: kept.map(m => m.petName), licorne: bought.item.petName}, null, 2));
