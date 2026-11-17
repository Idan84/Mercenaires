"use strict";

// Le mammouth (Idan, 2026-11-16 : « On ajoute déjà un mamouth et une chasse » ; « Marchand Homme bête. Fais le très lent » ;
// « Le fait pas trop courageux... Quelques petits cochons qui crient et ils ont peur. Il est fort mais c'est pas un
// combattant » ; le tir sur le cavalier « par rapport aux autres ») : une bête à cornes de la Souille, gabarit 3 (tout le
// monde le monte, les ogres aussi), 3 cases sur la carte, 4 cases de déplacement, peu courageux, pas un combattant ; 50 PO
// d'entretien, 2 places ; vendu par Hroska Crocs-de-Neige ; chasse 1D2 par étoile dès 6★.
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

// 1. La fiche.
const mammoth = sheet("mammouth"), boar = sheet("sanglier"), pegasus = sheet("pegase");
assert.deepEqual([mammoth.nom, mammoth.espece, mammoth.gabarit, mammoth.taille, mammoth.logement, mammoth.place, mammoth.entretien,
  mammoth.alignement, mammoth.rang_echange, mammoth.titre, mammoth.capturable],
  ["Mammouth de guerre", "Bêtes à cornes", 3, "grande", "trainer_wallow", 2, 50, "Neutre", 4, "à dos de mammouth", true]);
const c = mammoth.caracteristiques;
assert.ok(c.Force > pegasus.caracteristiques.Force && c.Constitution > pegasus.caracteristiques.Constitution, "le plus fort de l'écurie");
assert.ok(c.Courage < boar.caracteristiques.Courage / 2, "peu courageux : des cochons qui crient lui font peur");
assert.ok(mammoth.competences_martiales["Armes naturelles"] < boar.competences_martiales["Armes naturelles"], "pas un combattant");
assert.deepEqual([mammoth.attaque.nom, mammoth.attaque.degats_pv_base, mammoth.attaque.bonus_charge], ["Défenses", "1D12", 2]);
assert.equal(reference.animalNames.rows.find(r => r.code === "mammouth")?.noms.length, 24, "24 noms");
const hroska = reference.merchants.rows.find(m => m.nom === "Hroska Crocs-de-Neige");
assert.deepEqual([hroska.peuple, hroska.culture, hroska.vend.some(v => v.type === "mount" && v.objet === "Mammouth de guerre")], ["Homme-bête", "Tribus nordiques", true]);

// 2. La Souille : 2 places par mammouth.
let seed = 1116;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
Math.random = random;
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const stable = createStableRules({reference, random, makeItem: (type, name) => generator.createItemByName(type, name)});
const item = (name, id) => ({...generator.createItemByName("mount", name), id});
const camp = {day: 3, company: {gold: 0, stock: [], roster: [], camp: {buildings: {trainer_barn: {level: 1}, trainer_wallow: {level: 1}}}}};
assert.equal(stable.houseOf("mammouth"), stable.WALLOW);
assert.equal(stable.canStore(camp, item("Mammouth de guerre", "m1")).ok, true, "niveau 1 : deux places, un mammouth");
camp.company.stock.push(item("Mammouth de guerre", "m1"));
assert.equal(stable.used(camp, stable.WALLOW), 2);
assert.equal(stable.canStore(camp, item("Sanglier de combat", "s1")).ok, false, "plus de place pour un sanglier");
assert.equal(createItemValues({reference}).value(item("Mammouth de guerre", "v")), 15000, "300 × 50 PO");

// 3. Au combat : tout le monde le monte ; très lent ; au tir, la monture prise selon les tailles (75 % sous un humain).
const engine = createCombatEngine(reference, {});
const rules = Missions.createMissionRules({reference, random});
const captain = generator.createCaptain({id: 1});
const unit = (character, extra = {}) => ({character, q: 0, r: 0, alive: true, activeSet: 1, team: "player", ...extra});
const beast = () => unit(rules.createMount("mammouth", {id: "m" + Math.floor(random() * 1e6)}));
assert.equal(engine.movementBase(beast()), 4, "très lent : le pas d'un piéton, la moitié d'un destrier");
assert.ok(engine.movementBase(beast()) * 2 <= engine.movementBase(unit(rules.createMount("destrier", {id: "d"}))));
let id = 10;
const chance = {};
for (const people of ["Humain", "Orc", "Nain", "Gobelin", "Ogre"]) {
  const rider = unit(generator.createMercenary({id: id++, captain, forcedPeople: people})), m = beast();
  assert.equal(engine.canRide(rider, m), true, people + " le monte");
  rider.mount = m; m.rider = rider;
  chance[people] = Math.round(engine.mountHitChance(rider));
}
assert.deepEqual([chance.Humain, chance.Ogre, chance.Gobelin], [75, 60, 86], "la monture visée : 3 ÷ (3 + le cavalier)");

// 4. La chasse : 1D2 mammouths par étoile, dès 6★, sur 3 cases chacun.
const hunt = rules.definition("hunt_mammoths");
assert.deepEqual([hunt.bete.code, hunt.bete.des, hunt.bete.faces, hunt.niveau.min, hunt.bete.faction], ["mammouth", 1, 2, 6, "Mammouths"]);
assert.ok(reference.missionLandscapes.rows.some(r => r.faction === "Mammouths" && r.nom === "Toundra"));
const herd = rules.buildEnemies(rules.createOffer({code: "hunt_mammoths", level: 6}));
assert.ok(herd.length >= 6 && herd.length <= 12 && herd.every(e => e.taille === "grande" && e.mount?.code === "mammouth"), "6 à 12 mammouths : " + herd.length);

// 5. Des combats entiers : un ogre à dos de mammouth dans notre équipe, puis contre une harde. Personne ne se chevauche
// au départ, et chaque combat se termine.
const element = () => ({textContent: "", innerHTML: "", disabled: false, title: "", style: {}, parentElement: {clientWidth: 900},
  classList: {add() {}, remove() {}, toggle() {}}, addEventListener() {}, close() {}});
const elements = {};
const $ = id => elements[id] || (elements[id] = element());
const game = {campaign: null, captain, referenceData: reference};
let api = null;
const combat = createCombatEngine(reference, {onAttack: Progression.recordAttack, gridMap: () => api.missionGridMap()});
const mission = fs.readFileSync(path.join(ROOT, "prototype-web", "mission.js"), "utf8");
api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", "missionRules", mission + "\nreturn {makeMissionUnit,sortMissionInitiative,selectNextMissionPlayer,"
  + "startMissionCamouflage,autoResolveMission,setMissionMapSize,placeMissionArmy,missionGridMap,missionUnits,missionMountOf};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => combat, Progression, MissionEnd, Magic, () => rules);
api.setMissionMapSize({cols: 36, rows: 25});
let mountedAtStart = 0;
function battle(squad, foes) {
  const players = api.placeMissionArmy(squad.map((x, i) => api.makeMissionUnit(x, "player", i % 3)), "player");
  const enemies = api.placeMissionArmy(foes.map((x, i) => api.makeMissionUnit(x, "enemy", i % 3)), "enemy");
  game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: []};
  for (const u of [...players, ...enemies]) u.camouflaged = false;
  // Au départ, une case par occupant (un cavalier est sur les cases de sa monture).
  const cells = new Map();
  for (const u of [...players, ...enemies].filter(u => u.alive && !u.rider)) for (const cell of combat.footprint(u)) {
    const k = cell.q + "," + cell.r;
    assert.ok(!cells.has(k), "deux occupants sur " + k);
    cells.set(k, u);
  }
  // L'ogre part bien à dos de mammouth (au départ : il peut tomber pendant le combat).
  if (players.some(u => u.character?.id === 500 && u.mount)) mountedAtStart++;
  api.startMissionCamouflage(); api.selectNextMissionPlayer(); api.autoResolveMission();
  return game.mission;
}
const ogre = generator.createMercenary({id: 500, captain, forcedPeople: "Ogre"});
const ridden = {...generator.createItemByName("mount", "Mammouth de guerre"), owner: ogre.id, slot: "mount", tamedBy: ogre.id};
ogre.items.push(ridden); ogre.equipment.slots.mount = ridden.id;
assert.equal(api.missionMountOf(ogre)?.code, "mammouth", "l'ogre part à dos de mammouth");
let over = 0;
for (let k = 0; k < 6; k++) {
  const squad = [ogre, ...[1, 2, 3].map(i => generator.createMercenary({id: 600 + 10 * k + i, captain}))];
  const m = battle(squad, Array.from({length: 4 + k % 3}, (_, i) => generator.createMercenary({id: 700 + 10 * k + i, captain})));
  if (m.over) over++;
}
assert.equal(over, 6, "avec un mammouth monté, chaque combat se termine");
assert.equal(mountedAtStart, 6, "l'ogre est monté à chaque combat");
over = 0;
for (let k = 0; k < 6; k++) {
  const squad = [1, 2, 3, 4, 5, 6].map(i => generator.createMercenary({id: 800 + 10 * k + i, captain}));
  const m = battle(squad, rules.buildEnemies(rules.createOffer({code: "hunt_mammoths", level: 6})));
  if (m.over) over++;
}
assert.equal(over, 6, "contre une harde, chaque combat se termine");

console.log(JSON.stringify({ok: true, mammouth: {cases: engine.movementBase(beast()), monture_visee: chance}}, null, 2));
