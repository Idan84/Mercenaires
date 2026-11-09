"use strict";

// Le Chenil, suite (Idan, 2026-11-09) : les chevaucheurs de loups gobelins (« oui loup chez les Gobelins »), le cerbère
// (« Il est vendu par les ogres des montagnes [...] Il est loyal mauvais. Il a 3 attaques de morsures séparés. Il est de
// taille 2. ( Donc à côté des ogres) Il va un peu moins vite qu'un destrier, mais il mange 3 loups au Petit déjeuner. Il vaut
// 35 PO et on peut aussi le chasser en meute » ; « on peut le monter » ; « Pas dans les camps orcs, mais Ogres. Il n'est pas
// monté » ; 1 place ; chasse 1D3) et le molosse de guerre (« Il est assez faible 5 Po. On en trouve dans les camps humains. Il
// est vendu par les gnomes des villes. On peut attaquer des meutes de chiens sauvages. Personne ne le monte. Il prend une
// demi place au chenil » ; neutre mauvais ; chasse 1D6 + 1D3, jusqu'à 6 étoiles).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const {createStableRules} = require("../game-core/stables.js");
const {createItemValues} = require("../game-core/item-value.js");
const Progression = require("../game-core/progression.js");
const MissionEnd = require("../game-core/mission-end.js");
const Magic = require("../game-core/magic.js");
const Missions = require("../game-core/missions.js");
require("../game-core/regeneration.js");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "prototype-web", "reference-data.js"), "utf8");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));
const sheet = code => reference.mounts.rows.find(r => r.code === code);

// 1. Les fiches.
const cerbere = sheet("cerbere"), molosse = sheet("molosse"), destrier = sheet("destrier"), loup = sheet("loup");
assert.deepEqual([cerbere.espece, cerbere.gabarit, cerbere.logement, cerbere.compagnon, cerbere.alignement, cerbere.entretien, cerbere.place, cerbere.titre],
  ["Canidés", 2, "trainer_kennel", true, "Loyal mauvais", 35, 1, "à dos de cerbère"]);
assert.equal(cerbere.attaque.attaques, 3, "trois morsures");
assert.deepEqual([molosse.espece, molosse.gabarit, molosse.logement, molosse.compagnon, molosse.alignement, molosse.entretien, molosse.place],
  ["Canidés", 0.5, "trainer_kennel", true, "Neutre mauvais", 5, 0.5]);
assert.equal(reference.peoples.rows.find(p => p.nom === "Ogre").places_dortoir, cerbere.gabarit, "taille 2, à côté des ogres");
assert.ok(Math.min(...reference.peoples.rows.map(p => Number(p.places_dortoir))) >= molosse.gabarit, "personne ne monte le molosse");
assert.ok(molosse.caracteristiques.Force < loup.caracteristiques.Force && molosse.caracteristiques.Constitution < loup.caracteristiques.Constitution, "assez faible");
const merchant = name => reference.merchants.rows.find(m => m.nom === name);
assert.ok(merchant("Bruga Roc-Fendu").vend.some(v => v.type === "mount" && v.objet === "Cerbère"));
assert.equal(merchant("Bruga Roc-Fendu").culture, "Ogres des montagnes");
assert.ok(merchant("Kippa Ressortdor").vend.some(v => v.type === "mount" && v.objet === "Molosse"));
assert.equal(merchant("Kippa Ressortdor").culture, "Gnomes des villes");
for (const code of ["cerbere", "molosse"]) assert.equal(reference.animalNames.rows.find(r => r.code === code)?.noms.length, 24, code + " : 24 noms");
const values = createItemValues({reference});
let seed = 61;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
Math.random = random;
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
assert.deepEqual([values.value(generator.createItemByName("mount", "Cerbère")), values.value(generator.createItemByName("mount", "Molosse"))], [10500, 1500]);

// 2. Les lignes d'ennemis : quatre niveaux chacune, des points mesurés, dans leurs camps.
const lineOf = (faction, ligne) => reference.enemyArchetypes.rows.filter(r => r.faction === faction && r.ligne === ligne);
const camp = faction => reference.oneShotMissions.missions.find(m => m.code === "cleanup").camps.find(c => c.faction === faction);
for (const [faction, ligne, min, capture] of [["Gobelins", "Chevaucheur", 1, undefined], ["Ogres", "Cerbère", 6, "cerbere"], ["Voleurs", "Molosse", 1, "molosse"]]) {
  const rows = lineOf(faction, ligne);
  assert.deepEqual(rows.map(r => r.niveau), ["novice", "normal", "vétéran", "d’élite"], ligne);
  assert.ok(rows.every(r => r.points > 0 && r.niveau_mission_min === min), ligne + " : points, niveau minimum");
  assert.ok(rows.every((r, i) => !i || r.points > rows[i - 1].points), ligne + " : de plus en plus forts");
  assert.ok(rows.every(r => r.capture === capture), ligne + " : capture");
  assert.deepEqual(camp(faction).lignes.find(l => l.ligne === ligne), {ligne, poids: 10}, ligne + " : poids 10 au camp");
}
const riders = lineOf("Gobelins", "Chevaucheur");
assert.ok(riders.every(r => r.monture === "loup" && r.peuple === "Gobelin" && r.competences_animales["Canidés"] > 0), "des gobelins sur des loups");
assert.ok(riders.every(r => r.armes.join() === "Lance,Rondache"), "lance et rondache, comme le Cavalier");
const cerberi = lineOf("Ogres", "Cerbère");
assert.equal(cerberi[1].pv, 339, "le cerbère normal : notre fiche");
assert.ok(cerberi.every(r => r.attaque.attaques === 3 && !r.monture), "trois morsures, pas monté");
assert.ok(cerberi[1].points > 3 * reference.enemyArchetypes.rows.find(r => r.code === "court_wolf").points - 1, "il mange 3 loups au petit déjeuner");

// 3. Le Chenil : un molosse prend une demi-place.
const stable = createStableRules({reference, random, makeItem: (type, name) => generator.createItemByName(type, name)});
const state = {day: 5, company: {gold: 0, stock: [], roster: [], camp: {buildings: {trainer_barn: {level: 1}, trainer_kennel: {level: 1}}}}};
assert.equal(stable.places(state, stable.KENNEL), 2);
const dog = () => ({...generator.createItemByName("mount", "Molosse"), id: "d" + Math.random(), owner: null});
state.company.stock.push(dog(), dog(), dog());
assert.equal(stable.used(state, stable.KENNEL), 1.5, "trois molosses : une place et demie");
assert.equal(stable.canStore(state, dog()).ok, true, "encore un molosse");
assert.equal(stable.canStore(state, {...generator.createItemByName("mount", "Loup"), id: "w"}).ok, false, "pas un loup");
const admitted = stable.admit(state, [{code: "molosse"}, {code: "molosse"}]);
assert.deepEqual([admitted.kept.length, admitted.released.length], [1, 1], "la demi-place restante, puis plus rien");

// 4. Au combat : les trois morsures (chacune son jet, aussi en attaque d'opportunité), les chevaucheurs sur leurs loups.
const rules = Missions.createMissionRules({reference, random});
const engine = createCombatEngine(reference, {});
const beast = rules.createMount("cerbere", {id: "c1"});
const unit = (character, extra = {}) => ({character, q: 0, r: 0, alive: true, activeSet: 1, team: "player", ...extra});
assert.equal(engine.strikeCount(unit(beast)), 3);
assert.equal(engine.usableHands(unit(beast), 1).length, 3, "trois coups au contact");
assert.equal(engine.strikeCount(unit(rules.createMount("loup", {id: "l1"}))), 1);
assert.ok(engine.movementBase(unit(beast)) < engine.movementBase(unit(rules.createMount("destrier", {id: "h1"}))), "un peu moins vite qu'un destrier");
const human = generator.createMercenary({id: 900, captain: generator.createCaptain({id: 899}), forcedPeople: "Humain"});
const ogre = generator.createMercenary({id: 901, captain: generator.createCaptain({id: 902}), forcedPeople: "Ogre"});
assert.equal(engine.canRide(unit(human), unit(beast)), true, "on peut le monter");
assert.equal(engine.canRide(unit(ogre), unit(beast)), false, "pas un ogre");
assert.equal(engine.canRide(unit(generator.createMercenary({id: 903, captain: generator.createCaptain({id: 904}), forcedPeople: "Gobelin"})), unit(rules.createMount("molosse", {id: "m1"}))), false, "personne ne monte le molosse");

const element = () => ({textContent: "", innerHTML: "", disabled: false, title: "", style: {}, parentElement: {clientWidth: 900},
  classList: {add() {}, remove() {}, toggle() {}}, addEventListener() {}, close() {}});
const elements = {};
const $ = id => elements[id] || (elements[id] = element());
const game = {campaign: null, captain: generator.createCaptain({id: 1}), referenceData: reference};
let api = null;
const combat = createCombatEngine(reference, {onAttack: Progression.recordAttack, heightOf: u => api.missionUnitHeight(u)});
const mission = fs.readFileSync(path.join(ROOT, "prototype-web", "mission.js"), "utf8");
api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", "missionRules", mission + "\nreturn {makeMissionUnit,sortMissionInitiative,setMissionMapSize,missionUnitHeight,"
  + "performMissionAttack,resolveOpportunityAttacks,missionAxial};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => combat, Progression, MissionEnd, Magic, () => rules);
api.setMissionMapSize({cols: 30, rows: 15});
let uid = 1000;
const archetypeUnit = (code, team, i) => {
  const arch = rules.archetype(code);
  const c = rules.applyArchetype(generator.createMercenary({id: ++uid, captain: game.captain, forcedPeople: arch.peuple, forcedCulture: arch.culture}), arch, {idPrefix: "k" + uid, name: arch.nom});
  return api.makeMissionUnit(c, team, i);
};
const battle = (players, enemies) => {
  game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: [], relief: []};
  for (const u of [...players, ...enemies]) Object.assign(u, {camouflaged: false, attackAvailable: true});
  return game.mission;
};
// Un cerbère mord trois fois (sauf si sa cible tombe avant, ou un échec critique).
let strikes = 0, sequences = 0;
for (let i = 0; i < 30; i++) {
  const dog3 = archetypeUnit("ogre_cerberus", "enemy", 0), target = api.makeMissionUnit(generator.createMercenary({id: ++uid, captain: game.captain}), "player", 0);
  const m = battle([target], [dog3]);
  const a = api.missionAxial(10, 7), b = api.missionAxial(11, 7);
  Object.assign(dog3, {q: a.q, r: a.r}); Object.assign(target, {q: b.q, r: b.r, hp: 99999, pvMax: 99999});
  api.performMissionAttack(dog3, target, "melee", 1);
  const first = m.log.findIndex(l => / attaque /.test(l.message)), lines = m.log.slice(first).map(l => l.message);
  const end = lines.findIndex((l, k) => k > 0 && /enchaîne|ne parvient pas/.test(l));
  strikes += lines.slice(0, end < 0 ? lines.length : end).filter(l => / attaque .* avec Morsure/.test(l)).length;
  sequences++;
}
assert.ok(strikes / sequences > 2.5, "trois morsures par séquence : " + strikes / sequences);
// Le chevaucheur gobelin part sur son loup.
const goblinRider = archetypeUnit("goblin_rider", "enemy", 0);
assert.ok(goblinRider.mount, "sur son loup");
assert.equal(goblinRider.mount.character.mount.code, "loup");
assert.equal(goblinRider.mount.character.name, "Loup de Chevaucheur gobelin");

console.log(JSON.stringify({ok: true, morsures: Math.round(10 * strikes / sequences) / 10}, null, 2));
