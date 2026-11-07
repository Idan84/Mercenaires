"use strict";

// IA commune, premier jet (Idan, 2026-11-07, après le bêta-test : « Rendre l'IA plus performante : jouer des sorts.
// Savoir reculer. Se regrouper. Se cacher » ; « Nous et les ennemis » ; « On fait un premier jet ») : les sorts connus
// dans l'ordre, la zone sans allié, l'avance au pas du plus lent, le recul vers un allié valide et le coup de grâce ;
// nos mercenaires lancent leurs sorts en combat automatique.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const Progression = require("../game-core/progression.js");
const MissionEnd = require("../game-core/mission-end.js");
const Magic = require("../game-core/magic.js");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "prototype-web", "reference-data.js"), "utf8");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));
const constant = code => reference.formulaConstants.rows.find(r => r.code === code)?.valeur;

let seed = 41;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
Math.random = random;
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const captain = generator.createCaptain({id: 1});

const element = () => ({textContent: "", innerHTML: "", disabled: false, title: "", style: {}, parentElement: {clientWidth: 900},
  classList: {add() {}, remove() {}, toggle() {}}, addEventListener() {}, close() {}});
const elements = {};
const $ = id => elements[id] || (elements[id] = element());
const game = {campaign: null, captain, referenceData: reference};
const engine = createCombatEngine(reference, {onAttack: Progression.recordAttack});
const mission = fs.readFileSync(path.join(ROOT, "prototype-web", "mission.js"), "utf8");
const api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", mission + "\nconst logged=[];const log0=missionLog;missionLog=function(message,kind){ logged.push(message); return log0(message,kind); };"
  + "\nreturn {makeMissionUnit,sortMissionInitiative,setMissionMapSize,selectNextMissionPlayer,autoResolveMission,startMissionCamouflage,"
  + "missionAiSpellCodes,missionAiZoneTarget,missionAiKeepFormation,missionAiRetreat,missionOpponents,logged};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => engine, Progression, MissionEnd, Magic);
api.setMissionMapSize({cols: 24, rows: 12});

// Des combattants à mains nues (mêlée), placés à la main, sur une carte sans décor.
let nextId = 10;
const fighter = (team, q, r, extra = {}) => {
  const c = generator.createMercenary({id: nextId++, captain, forcedPeople: "Humain"});
  c.items = []; c.equipment.slots = Object.fromEntries(Object.keys(c.equipment.slots).map(k => [k, null]));
  Object.assign(c.stats, extra.stats || {});
  if (extra.spells) c.spells = extra.spells;
  if (extra.magic) Object.assign(c.skills.magic, extra.magic);
  const u = api.makeMissionUnit(c, team, 0);
  Object.assign(u, {q, r, camouflaged: false, movementRemaining: extra.move ?? 4, attackAvailable: true, quickAvailable: true});
  return u;
};
const battle = (players, enemies) => {
  game.mission = {engine, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, engine), enemyOrder: api.sortMissionInitiative(enemies, engine),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: [], relief: []};
  return game.mission;
};

// 0. Les réglages, dans les données.
assert.deepEqual(["zone_min_foes", "min_cast_chance", "cohesion_hexes", "ambush_turns", "retreat_hp_ratio", "finish_hp_ratio"]
  .map(k => constant("combat.ai." + k)), [2, 40, 3, 2, 0.3, 0.25]);

// 1. Les sorts essayés : la fiche d'abord ; sinon les sorts connus, invocations, zones, sorts sur un ennemi, renforts ;
// jamais les soins (missionAiCast s'en charge).
const mage = fighter("player", 2, 5, {spells: ["shock_weapon", "fire_bolt", "quick_heal", "fireball", "summon_wolves"].map(code => ({code, mastery: 1})),
  magic: {Feu: 100, Foudre: 100, Invocation: 100, Vie: 100}, stats: {Intelligence: 95}});
battle([mage], [fighter("enemy", 20, 5)]);
assert.deepEqual(api.missionAiSpellCodes(mage), ["summon_wolves", "fireball", "fire_bolt", "shock_weapon"]);
mage.character.aiSpells = ["fire_bolt"];
assert.deepEqual(api.missionAiSpellCodes(mage), ["fire_bolt"], "une fiche avec sa liste garde son ordre");
delete mage.character.aiSpells;

// 2. La zone : sur un ennemi, au moins deux ennemis dedans, aucun allié.
const f1 = fighter("enemy", 7, 5), f2 = fighter("enemy", 8, 5), lone = fighter("enemy", 7, 9);
battle([mage], [f1, f2]);
assert.ok([f1, f2].includes(api.missionAiZoneTarget(mage, "fireball", [f1, f2])), "deux ennemis groupés : la Boule de feu part");
battle([mage], [lone]);
assert.equal(api.missionAiZoneTarget(mage, "fireball", [lone]), null, "un seul ennemi : pas de zone");
const friend = fighter("player", 9, 5);
battle([mage, friend], [f1, f2]);
assert.equal(api.missionAiZoneTarget(mage, "fireball", [f1, f2]), null, "un allié dans la zone : pas de zone");

// 3. Se regrouper : le rapide n'avance pas à plus de 3 cases devant le plus en retard.
const fast = fighter("player", 1, 5), slow = fighter("player", 0, 5), far = fighter("enemy", 18, 5);
battle([fast, slow], [far]);
const line = [2, 3, 4, 5, 6].map(q => ({q, r: 5}));
const kept = api.missionAiKeepFormation(fast, line);
assert.deepEqual(kept.map(c => c.q), [2, 3], "au plus 3 cases devant le plus lent (lui à 18 de l'ennemi : pas en deçà de 15)");
battle([fast], [far]);
assert.equal(api.missionAiKeepFormation(fast, line).length, 5, "seul : il avance");

// 4. Reculer : blessé, pas au contact, un allié valide derrière lui : il recule, plus loin de l'ennemi.
const hurt = fighter("player", 8, 5), mate = fighter("player", 3, 5), foe = fighter("enemy", 12, 5);
const reset = () => { hurt.q = 8; hurt.r = 5; hurt.hp = Math.floor(hurt.pvMax * 0.2); hurt.movementRemaining = 4; foe.hp = foe.pvMax; mate.hp = mate.pvMax; };
battle([hurt, mate], [foe]);
reset();
assert.equal(api.missionAiRetreat(hurt), true);
assert.ok(engine.axialDistance(hurt, foe) > 4, "il s'éloigne : " + engine.axialDistance(hurt, foe));
// Le coup de grâce d'abord : l'ennemi à 10 % de ses PV, à sa portée.
reset(); foe.hp = Math.floor(foe.pvMax * 0.1);
assert.equal(api.missionAiRetreat(hurt), false, "« Je recule pas si […] je vais faire le coup de grace »");
// Pas d'allié valide pour le couvrir : il se bat.
reset(); mate.hp = Math.floor(mate.pvMax * 0.1);
assert.equal(api.missionAiRetreat(hurt), false, "sans allié valide, il se bat");
// Au contact : il se bat.
reset(); foe.q = 9;
assert.equal(api.missionAiRetreat(hurt), false, "au contact, il se bat");
foe.q = 12;
// En bonne santé : il ne recule pas.
reset(); hurt.hp = hurt.pvMax;
assert.equal(api.missionAiRetreat(hurt), false);

// 5. En combat automatique, nos mercenaires lancent leurs sorts (avant : seulement les soins).
const caster = fighter("player", 2, 5, {spells: [{code: "fire_bolt", mastery: 20}], magic: {Feu: 100}, stats: {Intelligence: 95}});
const target = fighter("enemy", 9, 5);
battle([caster], [target]);
api.startMissionCamouflage();
api.selectNextMissionPlayer();
api.autoResolveMission();
assert.ok(api.logged.some(t => /^Humain \d+ (lance|rate) Trait de feu/.test(t)), "il lance son Trait de feu");
// (La fin de chaque combat automatique est vérifiée sur tous les paysages : mission-terrain.test.js.)

console.log(JSON.stringify({ok: true, casts: api.logged.filter(t => / (lance|rate) /.test(t)).length, turns: game.mission.turn}, null, 2));
