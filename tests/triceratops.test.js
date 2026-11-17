"use strict";

// Le tricératops (Idan, 2026-11-17 : « Vendu par le marchand cité temple. C'est une forteresse sur pattes ! En gros, je
// verrai le profil du mammouth en mieux » ; « Courage : 40 » ; « Chasse : à partir de 7* » ; plus gros que le mammouth,
// « Fait le triceratops » en 3 cases et gabarit 4) : une bête à cornes de la Souille, la plus solide du jeu, lente, qui
// protège mieux son cavalier (la monture prend 80 % des tirs sous un humain) ; chasse 1D2 par étoile dès 7★.
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

// 1. La fiche : le mammouth en mieux.
const trike = sheet("triceratops"), mammoth = sheet("mammouth");
assert.deepEqual([trike.nom, trike.espece, trike.gabarit, trike.taille, trike.logement, trike.place, trike.entretien,
  trike.alignement, trike.rang_echange, trike.titre, trike.capturable, trike.caracteristiques.Courage],
  ["Tricératops", "Bêtes à cornes", 4, "grande", "trainer_wallow", 2, 70, "Neutre", 4, "à dos de tricératops", true, 40]);
assert.ok(trike.gabarit > mammoth.gabarit, "plus gros que le mammouth");
const phys = s => s.resistances["Résistance physique"];
assert.ok(reference.mounts.rows.every(s => s === trike || phys(s) < phys(trike)), "une forteresse : la meilleure résistance physique");
assert.ok(trike.caracteristiques.Courage > mammoth.caracteristiques.Courage, "moins peureux que le mammouth");
assert.ok(trike.competences_martiales["Armes naturelles"] > mammoth.competences_martiales["Armes naturelles"]);
assert.deepEqual([trike.attaque.nom, trike.attaque.degats_pv_base, trike.attaque.bonus_charge], ["Cornes", "1D12", 2]);
assert.equal(reference.animalNames.rows.find(r => r.code === "triceratops")?.noms.length, 24, "24 noms");
const azhiss = reference.merchants.rows.find(m => m.nom === "Azhiss Kaal'Thesh");
assert.deepEqual([azhiss.culture, azhiss.vend.some(v => v.type === "mount" && v.objet === "Tricératops")], ["Reptiliens des cités-temples", true]);

// 2. La Souille : 2 places ; sa valeur.
let seed = 1117;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
Math.random = random;
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const stable = createStableRules({reference, random, makeItem: (type, name) => generator.createItemByName(type, name)});
const item = (name, id) => ({...generator.createItemByName("mount", name), id});
const camp = {day: 3, company: {gold: 0, stock: [item("Tricératops", "t1")], roster: [], camp: {buildings: {trainer_barn: {level: 1}, trainer_wallow: {level: 1}}}}};
assert.equal(stable.houseOf("triceratops"), stable.WALLOW);
assert.equal(stable.used(camp, stable.WALLOW), 2, "2 places");
assert.equal(createItemValues({reference}).value(item("Tricératops", "v")), 21000, "300 × 70 PO");

// 3. Au combat : plus solide que le mammouth, aussi lent ; tout le monde le monte ; il protège mieux son cavalier.
const engine = createCombatEngine(reference, {});
const rules = Missions.createMissionRules({reference, random});
const captain = generator.createCaptain({id: 1});
const unit = (character, extra = {}) => ({character, q: 0, r: 0, alive: true, activeSet: 1, team: "player", ...extra});
const beast = code => unit(rules.createMount(code, {id: code + Math.floor(random() * 1e6)}));
assert.ok(engine.maxHp(beast("triceratops")) > engine.maxHp(beast("mammouth")), "plus de PV que le mammouth");
assert.equal(engine.movementBase(beast("triceratops")), engine.movementBase(beast("mammouth")), "aussi lent");
const chance = {};
let id = 10;
for (const people of ["Humain", "Gobelin", "Ogre"]) {
  const rider = unit(generator.createMercenary({id: id++, captain, forcedPeople: people})), m = beast("triceratops");
  assert.equal(engine.canRide(rider, m), true, people + " le monte");
  rider.mount = m; m.rider = rider;
  chance[people] = Math.round(engine.mountHitChance(rider));
}
assert.deepEqual(chance, {Humain: 80, Gobelin: 89, Ogre: 67}, "la monture visée : 4 ÷ (4 + le cavalier)");

// 4. La chasse : 1D2 par étoile dès 7★, dans la jungle.
const hunt = rules.definition("hunt_triceratops");
assert.deepEqual([hunt.bete.code, hunt.bete.des, hunt.bete.faces, hunt.niveau.min], ["triceratops", 1, 2, 7]);
assert.ok(reference.missionLandscapes.rows.some(r => r.faction === "Tricératops" && r.nom === "Jungle"));
const herd = rules.buildEnemies(rules.createOffer({code: "hunt_triceratops", level: 7}));
assert.ok(herd.length >= 7 && herd.length <= 14 && herd.every(e => e.taille === "grande" && e.mount?.code === "triceratops"), "7 à 14 tricératops : " + herd.length);

// 5. Des combats entiers : un ogre à dos de tricératops, puis contre un troupeau ; chacun se termine.
const element = () => ({textContent: "", innerHTML: "", disabled: false, title: "", style: {}, parentElement: {clientWidth: 900},
  classList: {add() {}, remove() {}, toggle() {}}, addEventListener() {}, close() {}});
const elements = {};
const $ = id => elements[id] || (elements[id] = element());
const game = {campaign: null, captain, referenceData: reference};
let api = null;
const combat = createCombatEngine(reference, {onAttack: Progression.recordAttack, heightOf: u => api.missionUnitHeight(u)});
const mission = fs.readFileSync(path.join(ROOT, "prototype-web", "mission.js"), "utf8");
api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", "missionRules", mission + "\nreturn {makeMissionUnit,sortMissionInitiative,selectNextMissionPlayer,"
  + "startMissionCamouflage,autoResolveMission,setMissionMapSize,placeMissionArmy,missionUnitHeight,missionMountOf};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => combat, Progression, MissionEnd, Magic, () => rules);
api.setMissionMapSize({cols: 36, rows: 25});
function battle(squad, foes) {
  const players = api.placeMissionArmy(squad.map((x, i) => api.makeMissionUnit(x, "player", i % 3)), "player");
  const enemies = api.placeMissionArmy(foes.map((x, i) => api.makeMissionUnit(x, "enemy", i % 3)), "enemy");
  game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: [], relief: []};
  for (const u of [...players, ...enemies]) u.camouflaged = false;
  api.startMissionCamouflage(); api.selectNextMissionPlayer(); api.autoResolveMission();
  return game.mission;
}
const ogre = generator.createMercenary({id: 500, captain, forcedPeople: "Ogre"});
const ridden = {...generator.createItemByName("mount", "Tricératops"), owner: ogre.id, slot: "mount", tamedBy: ogre.id};
ogre.items.push(ridden); ogre.equipment.slots.mount = ridden.id;
assert.equal(api.missionMountOf(ogre)?.code, "triceratops", "l'ogre part à dos de tricératops");
let over = 0;
for (let k = 0; k < 4; k++) {
  const squad = [ogre, ...[1, 2, 3].map(i => generator.createMercenary({id: 600 + 10 * k + i, captain}))];
  if (battle(squad, Array.from({length: 4 + k % 3}, (_, i) => generator.createMercenary({id: 700 + 10 * k + i, captain}))).over) over++;
}
for (let k = 0; k < 4; k++) {
  const squad = [1, 2, 3, 4, 5, 6].map(i => generator.createMercenary({id: 800 + 10 * k + i, captain}));
  if (battle(squad, rules.buildEnemies(rules.createOffer({code: "hunt_triceratops", level: 7}))).over) over++;
}
assert.equal(over, 8, "chaque combat se termine");

console.log(JSON.stringify({ok: true, triceratops: {pv: engine.maxHp(beast("triceratops")), cases: engine.movementBase(beast("triceratops")), monture_visee: chance}}, null, 2));
