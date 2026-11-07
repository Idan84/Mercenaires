"use strict";

// Nos mercenaires à cheval (Idan, 2026-11-07 : « Pour pouvoir l'équiper […], il doit passer du temps chez le dresseur » ;
// « Pour les montures, on les contrôle comme on contrôle un mercenaire. Avec ou sans cavalier. ») : celui qui a apprivoisé
// et équipé sa monture part à cheval, avec les règles du Cavalier des voleurs (doc 04) ; seul, son cheval rejoint l'ordre du
// tour de notre équipe ; en fin de combat, notre monture KO passe le test de survie, et morte, elle est perdue.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const {createTavernRules} = require("../game-core/tavern.js");
const {createCampaignRules} = require("../game-core/campaign.js");
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

let seed = 71, dice = [];
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
Math.random = random;
const rules = Missions.createMissionRules({reference, random});
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const campaign = createCampaignRules({generator, tavern: createTavernRules({random: () => 0.999, reference}), reference,
  random: () => dice.length ? dice.shift() : 0.5});
const captain = generator.createCaptain({id: 1});
const state = campaign.createCampaign({captain, squad: [2, 3, 4].map(id => generator.createMercenary({id, captain, forcedPeople: "Humain"}))});
state.company.camp.buildings = {trainer_barn: {level: 1, construction: null}, trainer_stables: {level: 2, construction: null}};
const [, rider, walker, other] = state.company.roster;
const give = (m, name, {tamed = true, equip = true} = {}) => {
  const item = generator.createItemByName("mount", name);
  item.owner = m.id;
  item.slot = equip ? "mount" : null;
  if (tamed) item.tamedBy = m.id;
  m.items.push(item);
  if (equip) m.equipment.slots.mount = item.id;
  return item;
};

// L'écran de combat (mission.js), comme les autres tests.
const element = () => ({textContent: "", innerHTML: "", disabled: false, title: "", style: {}, parentElement: {clientWidth: 900},
  classList: {add() {}, remove() {}, toggle() {}}, addEventListener() {}, close() {}});
const elements = {};
const $ = id => elements[id] || (elements[id] = element());
const game = {campaign: state, captain, referenceData: reference};
let api = null;
const combat = createCombatEngine(reference, {onAttack: Progression.recordAttack, heightOf: u => api.missionUnitHeight(u)});
const mission = fs.readFileSync(path.join(ROOT, "prototype-web", "mission.js"), "utf8");
api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", "missionRules", "campaignRules", mission + "\nreturn {makeMissionUnit,sortMissionInitiative,selectNextMissionPlayer,"
  + "startMissionCamouflage,autoResolveMission,setMissionMapSize,placeMissionArmy,missionUnitHeight,missionUnits,checkMissionEnd,"
  + "missionMountOf,settleOwnMissionMounts};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => combat, Progression, MissionEnd, Magic,
    () => rules, () => campaign);
api.setMissionMapSize({cols: 30, rows: 15});
function newMission(squad, foes) {
  const players = api.placeMissionArmy(squad.map((c, i) => api.makeMissionUnit(c, "player", i % 3)), "player");
  const enemies = api.placeMissionArmy(foes.map((c, i) => api.makeMissionUnit(c, "enemy", i % 3)), "enemy");
  game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: [], relief: []};
  for (const u of [...players, ...enemies]) u.camouflaged = false;
  return game.mission;
}
const foes = n => Array.from({length: n}, (_, i) => generator.createMercenary({id: 900 + i, captain}));

// 1. Qui part à cheval : apprivoisée et équipée, par lui.
const horse = give(rider, "Destrier");
const untamed = give(walker, "Destrier", {tamed: false, equip: false});
assert.deepEqual(api.missionMountOf(rider), {code: "destrier", item: horse});
assert.equal(api.missionMountOf(walker), null, "dans son inventaire, pas apprivoisée : à pied");
untamed.tamedBy = other.id;
walker.equipment.slots.mount = untamed.id;
assert.equal(api.missionMountOf(walker), null, "apprivoisée par un autre : à pied");
walker.equipment.slots.mount = null;
let m = newMission([rider, walker], foes(2));
const pair = m.players[0];
assert.ok(pair.mount, "il part à cheval");
assert.match(pair.mount.character.name, new RegExp("^Destrier d(e |’)" + rider.name + "$"));
assert.equal(pair.mount.character.mount.itemId, horse.id, "le cheval sait quelle monture il est");
assert.equal(pair.mount.team, "player");
assert.equal(combat.footprint(pair).length, 2, "deux cases, comme le Cavalier");
assert.equal(combat.movementBase(pair), 8, "c'est le cheval qui marche");
assert.ok(!m.players[1].mount, "l'autre à pied");
assert.ok(!api.missionUnits().includes(pair.mount), "monté, hors des listes");

// 2. Le cavalier tombe : son cheval reste seul et rejoint l'ordre du tour de notre équipe (on le contrôle comme un mercenaire).
const lone = pair.mount;
pair.hp = -5; pair.alive = false;
api.checkMissionEnd();
assert.ok(m.players.includes(lone) && lone.alive && !lone.rider, "le cheval seul, dans notre équipe");
assert.ok(m.playerOrder.includes(lone), "il prend sa place dans notre ordre du tour");

// 3. Fin de combat : notre monture KO passe le test de survie ; morte, elle est perdue.
lone.hp = -Math.round(lone.pvMax * 2); lone.alive = false;
api.settleOwnMissionMounts(m);
assert.ok(!rider.items.includes(horse), "morte : il la perd");
assert.equal(rider.equipment.slots.mount, null, "l'emplacement Monture est libre");
assert.ok(m.log.some(l => /ne se relève pas .* : la monture est perdue\./.test(l.message)));
// KO de peu : elle survit (le même jet que nos mercenaires) et reste à lui.
const second = give(rider, "Destrier");
m = newMission([rider], foes(1));
const mount2 = m.players[0].mount;
mount2.hp = 0; mount2.alive = false;
api.checkMissionEnd();
api.settleOwnMissionMounts(m);
assert.ok(rider.items.includes(second), "à 0 PV, elle vit");
assert.equal(m.players[0].prone, true, "son cavalier est tombé au sol");

// 4. Des combats entiers, sans erreur, avec un cavalier dans notre équipe (hors campagne : le bilan de la compagnie est
// l'affaire de l'interface).
game.campaign = null;
let over = 0;
for (let i = 0; i < 8; i++) {
  m = newMission([rider, walker, other], foes(3 + i % 2));
  api.startMissionCamouflage(); api.selectNextMissionPlayer(); api.autoResolveMission();
  if (m.over) over++;
}
assert.equal(over, 8, "chaque combat se termine");

console.log("Nos mercenaires à cheval : monture apprivoisée et équipée, règles du Cavalier, cheval seul dans notre ordre du tour, test de survie en fin de combat — OK");
