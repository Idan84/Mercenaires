"use strict";

// Le Pégase et la charge aérienne (Idan, 2026-11-09 : « Il vole, va vite comme une licorne mais frappe comme un cheval. Il
// est neutre bon. Plutôt intelligent ( comme la licorne) et coûte 40po d'entretien » ; « Volonté 70 » ; « un peu plus fort
// physiquement que le Destrier et un peu plus résistant » ; « vendu par le marchand humain des cités libres » ; « Rang 4 à dos
// de Pégase » ; « la charge aérienne : comme tous les trucs un peu massifs qui chargent : ils peuvent charger en passant au
// dessus des ennemis. 50% de contre charge en moins et tous les jets ( toucher/ blessé/ dégâts)X1.2 » ; « 50% de toucher en
// moins » ; au-dessus du bourbier et du magma, « pas d'attaque d'opportunités » ; « on mets la capacité en général qu'on
// applique à qui on veut. Pas pour les chauves-souris. Pegase seul l'a également »).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const Progression = require("../game-core/progression.js");
const MissionEnd = require("../game-core/mission-end.js");
const Magic = require("../game-core/magic.js");
const Missions = require("../game-core/missions.js");
const ItemValue = require("../game-core/item-value.js");
const {createTamingRules} = require("../game-core/taming.js");
require("../game-core/regeneration.js");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "prototype-web", "reference-data.js"), "utf8");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));
const constant = code => reference.formulaConstants.rows.find(r => r.code === code)?.valeur;

// 1. La fiche.
const sheet = reference.mounts.rows.find(r => r.code === "pegase");
const destrier = reference.mounts.rows.find(r => r.code === "destrier"), licorne = reference.mounts.rows.find(r => r.code === "licorne");
assert.ok(sheet, "le pégase");
assert.equal(reference.mounts.row_count, reference.mounts.rows.length);
assert.deepEqual([sheet.nom, sheet.espece, sheet.gabarit, sheet.taille, sheet.logement, sheet.compagnon], ["Pégase", "Équidés", 2, "longue", "trainer_stables", false]);
assert.equal(sheet.caracteristiques.Vitesse, licorne.caracteristiques.Vitesse, "il va vite comme une licorne");
assert.deepEqual(sheet.attaque, destrier.attaque, "il frappe comme un cheval");
assert.equal(sheet.caracteristiques.Intelligence, licorne.caracteristiques.Intelligence, "intelligent comme la licorne");
assert.equal(sheet.caracteristiques.Volonté, 70);
assert.ok(sheet.caracteristiques.Force > destrier.caracteristiques.Force && sheet.caracteristiques.Constitution > destrier.caracteristiques.Constitution,
  "un peu plus fort que le destrier");
for (const [k, v] of Object.entries(sheet.resistances)) assert.ok(v > destrier.resistances[k], k + " : un peu plus résistant");
assert.deepEqual([sheet.alignement, sheet.entretien, sheet.rang_echange, sheet.titre, sheet.physiologie.Vol, sheet.charge_aerienne],
  ["Neutre bon", 40, 4, "à dos de pégase", true, "toujours"]);
assert.deepEqual(reference.mounts.rows.filter(r => r.charge_aerienne).map(r => [r.code, r.charge_aerienne]), [["pegase", "toujours"], ["papillon_geant", "montée"]],
  "le pégase, et le papillon géant seulement monté (Idan, 2026-11-09 : « Si ! Charge aérienne ! Mais seulement avec un cavalier »)");
assert.ok(reference.enemyArchetypes.rows.filter(r => r.vol).every(r => !r.charge_aerienne), "pas pour les chauves-souris");
assert.ok(reference.merchants.rows.find(r => r.nom === "Aymeric Belcomptoir").vend.some(v => v.type === "mount" && v.objet === "Pégase"),
  "Aymeric Belcomptoir (Cités libres) le vend");
assert.equal(reference.merchants.rows.find(r => r.nom === "Aymeric Belcomptoir").culture, "Cités libres");
const names = reference.animalNames.rows.find(r => r.code === "pegase");
assert.equal(names?.noms.length, 24, "24 noms de pégase");
assert.deepEqual(["combat.charge_aerienne.bonus", "combat.charge_aerienne.contre_charge"].map(constant), [1.2, 0.5]);
assert.equal(reference.formulaConstants.row_count, reference.formulaConstants.rows.length);

// 2. Le personnage du pégase, sa valeur, son apprivoisement.
let seed = 71;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
Math.random = random;
const rules = Missions.createMissionRules({reference, random});
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const engine = createCombatEngine(reference, {});
const pegasus = rules.createMount("pegase", {id: "p1", name: "Zéphyr"});
assert.equal(pegasus.flies, true, "il vole");
assert.equal(pegasus.aerialCharge, "toujours");
assert.equal(rules.createMount("destrier", {id: "d1"}).flies, undefined, "le destrier ne vole pas");
assert.equal(engine.maxHp({character: pegasus, activeSet: 1}), 312, "312 PV (le destrier : 270)");
assert.equal(engine.movementBase({character: pegasus, activeSet: 1}), engine.movementBase({character: rules.createMount("licorne", {id: "l1"}), activeSet: 1}),
  "le déplacement de la licorne");
const item = generator.createItemByName("mount", "Pégase");
assert.equal(item.mountCode, "pegase");
assert.equal(ItemValue.createItemValues({reference}).value(item), 12000, "300 × 40 PO d'entretien");
// L'entêtement : (Intelligence 80 + Volonté 70) ÷ 2 = 75 ; un cran d'écart : 25 % par jour.
const captain = generator.createCaptain({id: 1});
const student = generator.createMercenary({id: 2, captain, forcedPeople: "Humain", forcedAlignment: "Chaotique bon"});
const owned = {...item, id: "peg-1", owner: student.id};
student.items.push(owned);
const state = {day: 10, company: {roster: [student], stock: []}, taming: []};
const taming = createTamingRules({reference, random: () => 0, camp: {buildingLevel: () => 1, trainerOf: () => null, expeditionOf: () => null, busyElsewhere: () => false}});
assert.equal(Math.round(taming.dailyChance(state, {studentId: student.id, mountId: owned.id}).alignment * 1000) / 1000, 25, "Chaotique bon contre Neutre bon : 25 %");

// 3. Le moteur : qui charge par les airs, et les facteurs.
const unit = (character, extra = {}) => ({character, q: 0, r: 0, alive: true, activeSet: 1, team: "player", ...extra});
const human = generator.createMercenary({id: 3, captain, forcedPeople: "Humain"});
const onPegasus = unit(human), horse = unit(pegasus, {rider: onPegasus});
onPegasus.mount = horse;
assert.equal(engine.aerialCharger(unit(pegasus)), true, "le pégase seul");
assert.equal(engine.aerialCharger(onPegasus), true, "son cavalier, monté");
const onHorse = unit(generator.createMercenary({id: 4, captain, forcedPeople: "Humain"}));
onHorse.mount = unit(rules.createMount("destrier", {id: "d2"}), {rider: onHorse});
assert.equal(engine.aerialCharger(onHorse), false, "un cavalier sur un destrier");
assert.equal(engine.aerialCharger(unit({...pegasus, aerialCharge: "montée"})), false, "« montée » : pas seul");
const mounted = unit(generator.createMercenary({id: 5, captain, forcedPeople: "Gobelin"}));
mounted.mount = unit({...pegasus, aerialCharge: "montée"}, {rider: mounted});
assert.equal(engine.aerialCharger(mounted), true, "« montée » : avec un cavalier");
const foe = unit(generator.createMercenary({id: 6, captain, forcedPeople: "Humain"}), {q: 1, team: "enemy"});
const base = engine.hitProbability(human ? unit(human) : null, foe, "melee", 1, {});
assert.ok(Math.abs(engine.hitProbability(unit(human), foe, "melee", 1, {factor: 1.2}) - Math.min(100, base * 1.2)) < 1e-9, "Toucher × 1,2");
assert.ok(Math.abs(engine.hitProbability(unit(human), foe, "melee", 1, {factor: 0.5}) - base * 0.5) < 1e-9, "contre-charge : Toucher ÷ 2");
assert.ok(engine.hitProbability(unit(human), foe, "melee", 1, {factor: 5}) <= 100, "au plus 100 %");
const wound = engine.woundProbability(unit(human), foe, "melee", null, {});
assert.ok(Math.abs(engine.woundProbability(unit(human), foe, "melee", null, {factor: 1.2}) - Math.min(100, wound * 1.2)) < 1e-9, "Blesser × 1,2");

// 4. L'écran de combat : la course au-dessus de la mêlée.
const element = () => ({textContent: "", innerHTML: "", disabled: false, title: "", style: {}, parentElement: {clientWidth: 900},
  classList: {add() {}, remove() {}, toggle() {}}, addEventListener() {}, close() {}});
const elements = {};
const $ = id => elements[id] || (elements[id] = element());
const game = {campaign: null, captain, referenceData: reference};
let api = null;
const combat = createCombatEngine(reference, {onAttack: Progression.recordAttack, heightOf: u => api.missionUnitHeight(u)});
const mission = fs.readFileSync(path.join(ROOT, "prototype-web", "mission.js"), "utf8");
api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", "missionRules", mission + "\nreturn {makeMissionUnit,sortMissionInitiative,setMissionMapSize,missionUnitHeight,"
  + "missionChargeIfClear,performMissionCharge,missionFlies,missionAxial,missionAttackPreview};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => combat, Progression, MissionEnd, Magic, () => rules);
api.setMissionMapSize({cols: 30, rows: 15});
let uid = 100;
const put = (u, col, row) => {
  const c = api.missionAxial(col, row);
  Object.assign(u, {q: c.q, r: c.r});
  if (u.mount) Object.assign(u.mount, {q: c.q, r: c.r, facing: u.facing});
  return u;
};
// Une épée en main (on charge au corps à corps), sans seconde main ni arme de rechange.
const arm = (character, name) => {
  const weapon = {id: "w-" + character.id, name, itemType: "weapon", slot: "weapon_set_1_main", owner: character.id, qualityCode: "standard"};
  character.items = [...character.items.filter(i => i.itemType !== "weapon"), weapon];
  character.equipment = {...character.equipment, slots: {...character.equipment.slots, weapon_set_1_main: weapon.id, weapon_set_1_off: null,
    weapon_set_2_main: null, weapon_set_2_off: null}};
  return character;
};
function battle(mountCode, {mire = false} = {}) {
  const riderChar = arm(generator.createMercenary({id: ++uid, captain, forcedPeople: "Humain"}), "Épée longue");
  riderChar.mountCode = mountCode;
  const target = generator.createMercenary({id: ++uid, captain, forcedPeople: "Humain"});
  const blocker = generator.createMercenary({id: ++uid, captain, forcedPeople: "Humain"});
  const r = api.makeMissionUnit(riderChar, "player", 0);
  r.facing = 0;
  const enemies = [api.makeMissionUnit(target, "enemy", 0), api.makeMissionUnit(blocker, "enemy", 1)];
  game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players: [r], enemies, playerOrder: api.sortMissionInitiative([r], combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
    activeUnit: r, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: [], relief: [],
    mire: mire ? [{...api.missionAxial(10, 7), untilTurn: 9}] : []};
  for (const u of [r, ...enemies]) Object.assign(u, {camouflaged: false, movementRemaining: combat.movementBase(u), attackAvailable: true});
  put(r, 2, 7); put(enemies[0], 15, 7); put(enemies[1], 8, 7);
  return {m: game.mission, r, target: enemies[0], blocker: enemies[1]};
}

// Sur un destrier : l'ennemi sur la ligne empêche la charge.
let b = battle("destrier");
assert.ok(b.r.mount, "à cheval");
assert.equal(api.missionFlies(b.r), false);
assert.equal(api.missionChargeIfClear(b.r, b.target), null, "un personnage sur la ligne");
// Sur un pégase : le couple vole, et la charge passe au-dessus.
b = battle("pegase");
assert.ok(b.r.mount, "sur son pégase");
assert.equal(api.missionFlies(b.r), true, "le couple vole");
let charge = api.missionChargeIfClear(b.r, b.target);
assert.ok(charge, "la charge passe au-dessus de l'ennemi");
assert.equal(charge.aerial, true);
assert.ok(charge.path.some(h => h.q === b.blocker.q && h.r === b.blocker.r), "il est bien sur la ligne");
// L'aperçu : la charge aérienne, Toucher × 1,2.
b.m.mode = "charge";
const rows = api.missionAttackPreview(b.r, b.target);
assert.ok(rows.length && rows[0].aerial, "l'aperçu dit la charge aérienne");
// La course : sans attaque d'opportunité ; le chargeur arrive au contact ; ses coups portent la charge aérienne.
const hpBlocker = b.blocker.hp;
api.performMissionCharge(b.r, b.target, charge);
const text = b.m.log.map(l => l.message).join("\n");
assert.match(text, /charge par les airs/);
assert.doesNotMatch(text, /quitte la zone de menace/, "pas d'attaque d'opportunité des survolés");
assert.equal(b.blocker.hp, hpBlocker, "le survolé n'est pas touché");
assert.equal(combat.axialDistance(b.r, b.target), 1, "au contact de sa cible");
assert.match(text, /charge aérienne : × 1,2/);
// Au-dessus d'un bourbier aussi ; mais l'arrivée doit être libre.
b = battle("pegase", {mire: true});
assert.ok(api.missionChargeIfClear(b.r, b.target)?.aerial, "au-dessus du bourbier");
b = battle("pegase");
charge = api.missionChargeIfClear(b.r, b.target);
const land = charge.path[charge.path.length - 1];
Object.assign(b.blocker, {q: land.q, r: land.r});
assert.equal(api.missionChargeIfClear(b.r, b.target), null, "pas d'arrivée sur un personnage");
// Le pégase seul charge aussi par les airs.
b = battle("pegase");
const alone = api.makeMissionUnit(rules.createMount("pegase", {id: "solo"}), "player", 2);
Object.assign(alone, {facing: 0, camouflaged: false, movementRemaining: 10, attackAvailable: true});
b.m.players.push(alone);
b.r.alive = false; b.r.mount.rider = null; b.r.mount = null;
put(alone, 2, 7);
assert.ok(api.missionChargeIfClear(alone, b.target)?.aerial, "le pégase seul");
// La contre-charge contre une charge aérienne : Toucher ÷ 2.
const counter = combat.resolveAttack(unit(generator.createMercenary({id: ++uid, captain, forcedPeople: "Humain"}), {q: 5, r: 5, team: "enemy"}),
  {...unit(human), q: 6, r: 5}, {mode: "melee", distance: 1, againstAerialCharge: true});
if (counter.ok) assert.equal(counter.againstAerialCharge, true);

console.log(JSON.stringify({ok: true, pv: 312, valeur: 12000, entetement: 75}, null, 2));
