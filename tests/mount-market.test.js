"use strict";

// Le marché des montures (Idan, 2026-11-07 : « pour le marchand des humains des steppes, l'achat et la vente du cheval. Je
// te propose que la valeur d'un animal soit de 300x cout d'entretien. On peut donc acheter et vendre des chevaux comme les
// autres biens. On ajoute un onglet dans intendance pour le voir. On ne peut vendre un animal que s'il n'appartient pas à un
// mercenaire […] on peut proposer à un mercenaire une monture (comme les autres Items, il accepte / refuse.) S'il accepte il
// a la monture dans son inventaire en statut "non equipable" » ; « Le marchand elfe Sylvain en vend et en achète ») : la
// licorne, la valeur (300 × entretien), Amar (destrier) et Ysolwen (licorne), une place aux Écuries pour acheter, la vente
// depuis l'Intendance, la proposition à un mercenaire (rang d'échange), « non équipable » tant qu'il ne l'a pas apprivoisée.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const {createTavernRules} = require("../game-core/tavern.js");
const {createCampaignRules} = require("../game-core/campaign.js");
const {createMerchantRules} = require("../game-core/merchants.js");
const {createAffinityRules} = require("../game-core/affinity.js");
const {createItemValues} = require("../game-core/item-value.js");
const {createEquipmentDeals} = require("../game-core/equipment-deals.js");
const {createCombatEngine} = require("../game-core/combat-engine.js");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "prototype-web", "reference-data.js"), "utf8");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));
const constant = code => reference.formulaConstants.rows.find(r => r.code === code)?.valeur;

// 1. Les données : la licorne, l'alignement, la valeur, les marchands.
assert.equal(reference.mounts.row_count, reference.mounts.rows.length);
const sheet = code => reference.mounts.rows.find(r => r.code === code);
const destrier = sheet("destrier"), licorne = sheet("licorne");
assert.deepEqual([destrier.alignement, destrier.rang_echange, destrier.entretien], ["Neutre", 3, 10]);
assert.ok(reference.mounts.rows.every(r => !("tolerance" in r)), "plus de tolérance (Idan, 2026-11-07 : « On supprime la tolérance »)");
assert.deepEqual([licorne.alignement, licorne.rang_echange, licorne.entretien, licorne.gabarit, licorne.taille],
  ["Loyal bon", 4, 30, 2, "longue"]);
assert.deepEqual(["Vitesse", "Endurance", "Courage"].map(k => [destrier.caracteristiques[k], licorne.caracteristiques[k]]),
  [[90, 110], [85, 100], [35, 30]], "plus rapide, plus endurante, un peu moins courageuse");
assert.ok(licorne.caracteristiques.Intelligence >= 80 && licorne.caracteristiques["Volonté"] >= 80, "intelligente, une grande volonté");
assert.deepEqual(["Résistance au feu", "Résistance au froid", "Résistance à la foudre"].map(k => licorne.resistances[k]), [50, 50, 50]);
assert.deepEqual(licorne.attaque, {nom: "Corne", degats_pv_base: "1D10", puissance_perforante: 70}, "elle frappe plus fort, de sa corne");
assert.equal(constant("economy.mount_value_per_upkeep"), 300);
const sells = (id, name) => reference.merchants.rows.find(m => m.id === id).vend.some(v => v.type === "mount" && v.objet === name);
assert.ok(sells("amar-rathore", "Destrier"), "Amar Rathore, humain des steppes, vend des destriers");
assert.ok(sells("ysolwen-chanteseve", "Licorne"), "Ysolwen Chantesève, elfe sylvaine, vend des licornes");
const engine = createCombatEngine(reference, {});
assert.equal(engine.movementBase({character: {stats: licorne.caracteristiques}, activeSet: 1}), 10, "10 cases (le destrier : 8)");

// 2. L'objet monture et sa valeur.
let seed = 83;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const values = createItemValues({reference});
const horse = generator.createItemByName("mount", "Destrier");
const unicorn = generator.createItemByName("mount", "Licorne");
assert.deepEqual([horse.itemType, horse.slot, horse.mountCode, horse.exchangeTier, horse.tier], ["mount", "mount", "destrier", 3, undefined], "sans tier");
assert.deepEqual([values.value(horse), values.value(unicorn)], [3000, 9000], "300 × entretien");

// 3. Le marchand : une place aux Écuries pour acheter ; la vente depuis l'Intendance.
const rules = createCampaignRules({generator, tavern: createTavernRules({random: () => 0.999, reference}), reference, random});
const stable = rules.stableRules;
const captain = generator.createCaptain({id: 1});
const state = rules.createCampaign({captain, squad: [2, 3].map(id => generator.createMercenary({id, captain}))});
state.company.gold = 100000;
const merchants = createMerchantRules({reference, generator, affinity: createAffinityRules({reference}), random,
  canStore: (s, item) => stable.canStore(s, item)});
const visit = (merchantId, items) => { state.market = {visit: {merchantId, day: state.day, stock: items.map((item, id) => ({id, item})), sold: {}, traded: false}, merchants: {}}; };
visit("amar-rathore", [generator.createItemByName("mount", "Destrier"), generator.createItemByName("mount", "Destrier")]);
const offer = merchants.visitOf(state).offers[0];
const affinityAmar = merchants.visitOf(state).affinity;
assert.equal(offer.price, Math.round(3000 * 1.5 * (1 - 0.2 * affinityAmar / 100)), "le prix habituel : valeur × 1,5 selon l'affinité");
assert.deepEqual(merchants.buy(state, 0), {ok: false, reason: "Il faut d’abord des Écuries (à la Grange du dresseur).", price: offer.price});
state.company.camp.buildings = {trainer_barn: {level: 1, construction: null}, trainer_stables: {level: 1, construction: null}};
const gold = state.company.gold;
assert.equal(merchants.buy(state, 0).ok, true);
assert.equal(state.company.gold, gold - offer.price);
assert.equal(stable.mountsOf(state).length, 1, "aux Écuries, à l'Intendance");
assert.ok(state.company.stock.some(i => i.itemType === "mount"));
// Une deuxième place, puis plus rien.
stable.admit(state, [{code: "destrier", origin: "test"}]);
assert.equal(merchants.buy(state, 1).reason, "Pas de place aux Écuries.");
// Vendre à Ysolwen (qui n'en vend pas : × 0,4) puis à Amar (sa liste).
const sold = state.company.stock.find(i => i.itemType === "mount");
assert.equal(merchants.visitOf(state).buyback(sold).specialty, true);
const before = state.company.gold, sale = merchants.sell(state, sold.id);
assert.equal(sale.ok, true);
assert.equal(state.company.gold, before + sale.price);
assert.equal(stable.mountsOf(state).length, 1, "une place se libère");
visit("ysolwen-chanteseve", [generator.createItemByName("mount", "Licorne")]);
assert.equal(merchants.visitOf(state).offers[0].price, Math.round(9000 * 1.5 * (1 - 0.2 * merchants.visitOf(state).affinity / 100)));
const bought = merchants.buy(state, 0);
assert.equal(bought.ok, true, "une licorne chez l’elfe sylvaine : " + bought.reason);
assert.equal(stable.upkeep(state), 40, "10 + 30 PO par jour");

// 4. Proposer une monture à un mercenaire : son inventaire, « non équipable » ; on ne vend ni ne relâche la sienne.
let roll = 0;
const deals = createEquipmentDeals({reference, random: () => roll, affinityRules: {memberAffinity: () => ({total: 0})}});
assert.equal(deals.perceivedValue(horse, {stats: {Intelligence: 100}}, false), 3, "un destrier vu comme un T3");
assert.equal(deals.perceivedValue(unicorn, {stats: {Intelligence: 100}}, false), 4, "une licorne vue comme un T4");
const merc = state.company.roster[1];
const mount = state.company.stock.find(i => i.itemType === "mount");
assert.equal(deals.compatibleSlots(merc, mount).length, 0, "aucun emplacement : non équipable");
assert.equal(deals.slotAccepts(merc, "mount", mount).reason, "Il doit d’abord l’apprivoiser chez le Dresseur.");
roll = 0;
const given = deals.propose(state, {mercenaryId: merc.id, slot: deals.INVENTORY, stockItemId: mount.id});
assert.equal(given.ok, true);
assert.equal(given.accepted, true, "il accepte");
const owned = merc.items.find(i => i.itemType === "mount");
assert.ok(owned && owned.owner === merc.id && !owned.slot, "dans son inventaire");
assert.ok(!state.company.stock.some(i => i.id === owned.id), "plus à l'Intendance");
assert.equal(stable.mountsOf(state).length, 2, "toujours aux Écuries");
assert.equal(stable.ownerOf(state, owned), merc);
assert.equal(stable.release(state, owned.id).ok, false, "on ne relâche pas la monture d'un mercenaire");
assert.equal(merchants.sell(state, owned.id).ok, false, "ni ne la vend");
// Apprivoisée par lui (étape suivante) : il peut l'équiper ; par un autre, non.
owned.tamedBy = merc.id;
assert.equal(deals.slotAccepts(merc, "mount", owned).ok, true);
owned.tamedBy = captain.id;
assert.equal(deals.slotAccepts(merc, "mount", owned).ok, false, "chaque monture s'apprivoise par son cavalier");

console.log(JSON.stringify({ok: true, destrier: values.value(horse), licorne: values.value(unicorn)}, null, 2));
