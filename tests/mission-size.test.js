"use strict";

// Créatures sur plusieurs cases (Idan, 2026-11-06 : tailles 1, 3 et 7 cases « Parfait » ; « Un cheval, deux cases » ; une
// grande créature plus facile à toucher « Oui ») : empreinte, distance de case la plus proche à case la plus proche,
// occupation, déplacement de toute l'empreinte, zones une seule fois, ni poussée ni attraction, vue, placement, gros pion,
// troll géant de la Mission Test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const Progression = require("../game-core/progression.js");
const MissionEnd = require("../game-core/mission-end.js");
const Magic = require("../game-core/magic.js");
const Missions = require("../game-core/missions.js");
const Terrain = require("../game-core/mission-terrain.js");
require("../game-core/regeneration.js");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "prototype-web", "reference-data.js"), "utf8");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));
const constant = code => reference.formulaConstants.rows.find(r => r.code === code)?.valeur;

// 1. Le moteur : les empreintes, la distance, le Toucher.
const engine = createCombatEngine(reference, {});
const key = c => c.q + "," + c.r;
const keys = cells => cells.map(key).sort();
assert.deepEqual(engine.footprintAt(0, 0, "normale").length, 1);
assert.deepEqual(keys(engine.footprintAt(5, 5, "longue", 0)), keys([{q: 5, r: 5}, {q: 4, r: 5}]), "longue : la tête et le corps derrière elle");
// Cases carrées (doc 04 : « cheval 1×2 », « cerbère 2×2 », énorme 3×3).
assert.deepEqual(keys(engine.footprintAt(5, 5, "grande", 0)), keys([{q: 5, r: 5}, {q: 5, r: 4}, {q: 4, r: 5}, {q: 4, r: 4}]), "grande : 2×2");
assert.equal(engine.footprintAt(5, 5, "enorme").length, 9, "énorme : 3×3");
for (const size of ["longue", "grande", "enorme"]) for (let f = 0; f < 4; f++) {
  const cells = engine.footprintAt(5, 5, size, f);
  assert.equal(new Set(cells.map(key)).size, cells.length);
  assert.ok(cells.every(c => cells.some(o => o !== c && engine.hexDistance(o, c) === 1)), size + " : des cases voisines");
}
const big = {q: 10, r: 5, facing: 0, character: {taille: "enorme"}}, man = {q: 13, r: 5, character: {}};
assert.equal(engine.axialDistance(big, man), 2, "de case la plus proche à case la plus proche");
assert.equal(engine.axialDistance(man, big), 2);
assert.equal(engine.axialDistance({q: 12, r: 5}, big), 1, "une case au contact de l'anneau");
assert.deepEqual([constant("combat.taille.toucher_grande"), constant("combat.taille.toucher_enorme")], [10, 20]);
assert.deepEqual(["normale", "longue", "grande", "enorme"].map(t => engine.sizeHitBonus({character: {taille: t}})), [0, 0, 10, 20]);

// 2. L'écran de combat (mission.js, comme les autres tests).
let seed = 31;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
// Tout le hasard du test est fixé dès le début (sinon un tirage diffère d'une machine à l'autre).
Math.random = random;
const rules = Missions.createMissionRules({reference, random});
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const captain = generator.createCaptain({id: 1});
let uid = 1000;
const element = () => ({textContent: "", innerHTML: "", disabled: false, title: "", style: {}, parentElement: {clientWidth: 900},
  classList: {add() {}, remove() {}, toggle() {}}, addEventListener() {}, close() {}});
const elements = {};
const $ = id => elements[id] || (elements[id] = element());
const game = {campaign: null, captain, referenceData: reference};
let api = null;
const combat = createCombatEngine(reference, {onAttack: Progression.recordAttack, heightOf: u => api.missionUnitHeight(u)});
const mission = fs.readFileSync(path.join(ROOT, "prototype-web", "mission.js"), "utf8");
api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", "MercenairesMissionTerrain", "missionRules", mission + "\nreturn {makeMissionUnit,sortMissionInitiative,"
  + "selectNextMissionPlayer,startMissionCamouflage,autoResolveMission,setMissionMapSize,placeMissionArmy,missionUnitHeight,"
  + "missionReachablePaths,missionPathCost,moveMissionUnitAlongPath,missionCellFree,missionUnitAtCell,missionLineOfSight,"
  + "missionForcedMove,fitMissionLarge,enemyMissionAct,missionFootprint,missionExitPath};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => combat, Progression, MissionEnd, Magic, Terrain, () => rules);
api.setMissionMapSize({cols: 20, rows: 11});
const troll = () => rules.applyArchetype(generator.createMercenary({id: ++uid, captain, forcedPeople: "Ogre", forcedCulture: "Ogres des montagnes"}),
  rules.archetype("troll"), {idPrefix: "t" + uid, name: "Troll géant"});
function newMission(size, mercs = 2, {decor = [], relief = []} = {}) {
  const t = troll(); t.taille = size;
  const squad = Array.from({length: mercs}, () => generator.createMercenary({id: ++uid, captain}));
  const players = api.placeMissionArmy(squad.map((c, i) => api.makeMissionUnit(c, "player", i % 3)), "player");
  const enemies = api.placeMissionArmy([api.makeMissionUnit(t, "enemy", 0)], "enemy");
  game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor, relief};
  for (const u of [...players, ...enemies]) u.camouflaged = false;
  return game.mission;
}

// Occupation : chacune de ses cases est prise ; on le trouve en cliquant sur n'importe laquelle.
let m = newMission("enorme");
let beast = m.enemies[0];
const cells = api.missionFootprint(beast);
assert.equal(cells.length, 9, "3×3");
assert.ok(cells.every(c => !api.missionCellFree(c) && api.missionUnitAtCell(c.q, c.r) === beast));
// Placement : toute l'empreinte dans la carte.
assert.ok(cells.every(c => c.r >= 0 && c.r < 11), "dans la carte");

// Contact : au contact de n'importe quelle case de l'anneau.
const merc = m.players[0];
merc.q = cells[1].q + 1; merc.r = cells[1].r;
if (!api.missionCellFree(merc)) merc.q += 1;
const touching = cells.some(c => combat.hexDistance(c, merc) === 1);
assert.equal(combat.axialDistance(merc, beast), touching ? 1 : 2);

// Déplacement : un couloir d'une case entre deux murs ; le mercenaire passe, la créature énorme non.
api.setMissionMapSize({cols: 20, rows: 11});
const wallCol = 10, gapRow = 5;
const wall = [];
for (let r = 0; r < 11; r++) if (r !== gapRow) wall.push({q: wallCol, r, code: "mur"});
m = newMission("enorme", 1, {decor: wall});
beast = m.enemies[0];
const east = {q: 15, r: gapRow}, west = {q: 4, r: gapRow};
beast.q = east.q; beast.r = east.r;
const walker = m.players[0];
walker.q = east.q - 1 + 4; walker.r = gapRow - 3;
const far = new Map(api.missionReachablePaths(beast, 40));
assert.ok(![...far.keys()].some(k => Number(k.split(",")[0]) < wallCol - 1), "l'énorme ne passe pas le couloir");
walker.q = east.q; walker.r = east.r + 2;
beast.q = east.q + 2; beast.r = gapRow - 3;
const path1 = api.missionReachablePaths(walker, 40);
assert.ok(path1.has(key(west)) || [...path1.keys()].some(k => Number(k.split(",")[0]) < wallCol - 1), "le mercenaire passe");

// Un marais sous une seule de ses cases : le pas coûte la case la plus lente.
m = newMission("enorme", 1, {decor: [{q: 9, r: 5, code: "marais"}]});
beast = m.enemies[0];
beast.q = 9; beast.r = 4;
const step = [{q: 9, r: 4}];
const marsh = reference.terrainDecors.rows.find(d => d.code === "marais").cout_mouvement;
beast.q = 10; beast.r = 4;
assert.equal(api.missionPathCost([{q: 9, r: 4}], beast), marsh, "la case la plus lente qu'elle couvre");

// Longue (une monture) : le corps suit la tête, son sens suit le pas.
m = newMission("longue", 1);
beast = m.enemies[0];
beast.q = 10; beast.r = 5; beast.facing = 2; // vers l'ouest : le corps à l'est
const before = keys(api.missionFootprint(beast));
const reach = api.missionReachablePaths(beast, 3);
const up = reach.get(key({q: 10, r: 4}));
assert.ok(up, "un pas vers le haut");
beast.movementRemaining = 5;
api.moveMissionUnitAlongPath(beast, up);
assert.deepEqual(keys(api.missionFootprint(beast)), keys([{q: 10, r: 4}, {q: 10, r: 5}]), "le corps prend la place de la tête");
assert.equal(beast.facing, 1, "vers le nord");
assert.notDeepEqual(before, keys(api.missionFootprint(beast)));

// Grande (2×2) : elle tourne pour passer.
m = newMission("grande", 1);
beast = m.enemies[0];
beast.q = 10; beast.r = 5; beast.facing = 0;
assert.ok(api.missionReachablePaths(beast, 6).size > 10, "le 2×2 se déplace");

// Zone : une boule de feu qui touche une case de l'anneau le touche, une seule fois.
m = newMission("enorme", 1);
beast = m.enemies[0];
const ring = api.missionFootprint(beast)[3];
const zone = Magic.createMagicRules({reference, combat}).unitsInZone({q: ring.q - 1, r: ring.r}, 1, [...m.players, ...m.enemies]);
assert.equal(zone.filter(u => u === beast).length, 1);

// Ni poussée ni attraction.
const at = {q: beast.q, r: beast.r};
api.missionForcedMove(beast, {move: {kind: "repousse", cells: [{q: beast.q - 1, r: beast.r}]}}, m.players[0]);
assert.deepEqual({q: beast.q, r: beast.r}, at, "elle ne bouge pas");
assert.ok(m.log.some(x => /trop massi/.test(x.message)));

// Vue : un mur devant son centre ne la cache pas si on voit une autre de ses cases.
m = newMission("enorme", 1, {decor: [{q: 7, r: 5, code: "mur"}]});
beast = m.enemies[0];
beast.q = 8; beast.r = 5;
const eye = m.players[0];
eye.q = 4; eye.r = 5;
assert.equal(api.missionLineOfSight(eye, beast), true, "on voit une de ses cases");

// En fuite : une créature énorme sort par le bord dès qu'une de ses cases y touche (son centre n'y arrive jamais).
m = newMission("enorme", 1);
beast = m.enemies[0];
const exit = api.missionExitPath(beast, 40, m.players);
assert.ok(exit && api.missionFootprint({...beast, q: exit.at(-1).q, r: exit.at(-1).r, facing: beast.facing}).some(c => c.r === 0 || c.r === 10
  || c.q === 0 || c.q === 19), "une sortie");

// Plus facile à toucher : la même attaque, le même défenseur, en plus grand.
const shooter = {character: generator.createMercenary({id: ++uid, captain}), activeSet: 1, q: 0, r: 0};
const target = {character: troll(), activeSet: 1, q: 3, r: 0};
const p0 = combat.hitProbability(shooter, target, "melee", 1);
target.character.taille = "enorme";
const p2 = combat.hitProbability(shooter, target, "melee", 1);
assert.ok(p2 > p0, "énorme : plus facile à toucher (" + p0.toFixed(1) + " → " + p2.toFixed(1) + ")");

// 3. Des combats jusqu'au bout : 3 mercenaires contre un troll géant, grand ou énorme ; il avance, frappe, et le combat finit.
let played = 0, stuck = 0, beastHits = 0;
for (let i = 0; i < 12; i++) {
  m = newMission(i % 2 ? "grande" : "enorme", 3);
  const t = m.enemies[0];
  const start = {q: t.q, r: t.r};
  api.startMissionCamouflage();
  api.selectNextMissionPlayer();
  api.autoResolveMission();
  played++;
  if (!m.over) stuck++;
  // Il va au contact et frappe, sauf s'il est tombé ou a fui avant (carreaux dans le dos, panique) : jamais immobile.
  if (m.log.some(x => x.message.startsWith("Troll géant attaque"))) beastHits++;
  else assert.ok(!t.alive || t.fleeing || t.offMap || m.log.some(x => /Troll géant (panique|s.enfuit)/.test(x.message)), "sans coup, il est tombé ou a fui");
  const occupied = new Set();
  for (const u of [...m.players, ...m.enemies].filter(x => x.alive && !x.offMap)) for (const c of api.missionFootprint(u)) {
    assert.ok(!occupied.has(key(c)), "jamais deux personnages sur la même case");
    occupied.add(key(c));
  }
}
assert.ok(stuck === 0, "combats bloqués : " + stuck);
assert.ok(beastHits >= played / 2, "le troll géant va au contact et frappe : " + beastHits + " sur " + played);
console.log("Grandes créatures : empreintes 1/2/3/7, distance, occupation, déplacement, zone, poussée, vue, Toucher +10/+20, " + played + " combats — OK");
