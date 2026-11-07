"use strict";

// Les Écuries (Idan, 2026-11-07 : « Pour chaque monture, on fait test de survie. Si elle survit et qu'on a de la place, elle
// est stockée dans l'enclos » ; « la grange du dresseur » ; « Commençons par écuries » ; « Avec les niveaux, on augmente le
// nombre de places » ; « Un animal aura un coût d'entretien » ; « Tout est validé ! ») : la Grange du dresseur et son aile
// les Écuries (2 places par niveau), l'entretien du matin (10 PO par destrier), le test de survie (le jet de mort de nos
// mercenaires), l'arrivée (une place ou relâché), le retour d'une escouade avec ses montures, « Relâcher », la capture en fin
// de combat.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const {createTavernRules} = require("../game-core/tavern.js");
const {createCampaignRules} = require("../game-core/campaign.js");
const {createCombatEngine} = require("../game-core/combat-engine.js");
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

// 1. Les données.
assert.equal(reference.campBuildings.row_count, reference.campBuildings.rows.length);
const barn = reference.campBuildings.rows.find(r => r.code === "trainer_barn");
const stablesRow = reference.campBuildings.rows.find(r => r.code === "trainer_stables");
assert.deepEqual([barn.nom, barn.niveaux, barn.prix_base, barn.jours_base, barn.requiert], ["Grange du dresseur", 10, 500, 4, null]);
assert.deepEqual([stablesRow.nom, stablesRow.niveaux, stablesRow.requiert, stablesRow.places_par_niveau], ["Les Écuries", 10, "trainer_barn", 2]);
assert.ok(reference.campBuildings.rows.every(r => Number.isFinite(r.places_par_niveau)), "la colonne partout");
assert.equal(reference.mounts.rows.find(r => r.code === "destrier").entretien, 10, "10 PO par jour pour un destrier");
const html = fs.readFileSync(path.join(ROOT, "prototype-web", "index.html"), "utf8");
assert.ok(html.indexOf("/core/stables.js") > 0 && html.indexOf("/core/stables.js") < html.indexOf("/core/campaign.js"), "le module avant la campagne");
assert.ok(html.includes('src="stable-ui.js"'));

// 2. Les règles, dans la campagne.
let seed = 61, dice = [];
const genRandom = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const generator = createGenerator(reference, {random: genRandom, nameGenerator: (people, id) => people + " " + id});
const rules = createCampaignRules({generator, tavern: createTavernRules({random: () => 0.999, reference}), reference,
  random: () => dice.length ? dice.shift() : 0.5});
const stable = rules.stableRules;
assert.ok(stable, "les Écuries sont branchées");
const captain = generator.createCaptain({id: 1});
const state = rules.createCampaign({captain, squad: [2, 3, 4].map(id => generator.createMercenary({id, captain}))});
assert.equal(stable.places(state), 0, "rien sans les Écuries");
assert.equal(rules.nextBuildingLevel(state, "trainer_stables").locked, true, "il faut d'abord la Grange");
state.company.camp.buildings = {trainer_barn: {level: 3, construction: null}, trainer_stables: {level: 1, construction: null}};
assert.equal(stable.places(state), 2, "2 places au niveau 1");
assert.equal(rules.campBuildingEffects(state).stablePlaces, 2);
assert.equal(rules.nextBuildingLevel(state, "trainer_stables").locked, false);
state.company.camp.buildings.trainer_stables.level = 3;
assert.equal(stable.places(state), 6, "2 places par niveau");
state.company.camp.buildings.trainer_stables.level = 1;

// Arrivée : une place chacune, sinon relâchée.
const destrier = origin => ({code: "destrier", name: "Destrier", origin});
let admitted = stable.admit(state, [destrier("Mission Test"), destrier("Mission Test"), destrier("Mission Test")]);
assert.equal(admitted.kept.length, 2);
assert.equal(admitted.released.length, 1, "pas de place : relâché");
assert.equal(stable.mountsOf(state).length, 2);
assert.equal(stable.mountsOf(state)[0].day, state.day);
assert.equal(stable.upkeep(state), 20);

// Entretien du matin, comme les salaires.
const gold = state.company.gold, payroll = rules.payroll(state);
const [report] = rules.advanceTime(state, 1);
assert.equal(report.stable.total, 20, "10 PO par destrier");
assert.equal(state.company.gold, gold - payroll - 20);

// Relâcher : une place se libère.
const first = stable.mountsOf(state)[0];
assert.equal(stable.release(state, first.id).ok, true);
assert.equal(stable.mountsOf(state).length, 1);
assert.equal(stable.release(state, "inconnu").ok, false);

// Le test de survie : le jet de mort de nos mercenaires.
assert.deepEqual(stable.rollSurvival({hp: 0, pvMax: 270, stats: {"Volonté": 30}}), {survives: true, pDeath: 0, roll: null}, "à 0 PV, elle vit");
dice = [0.98];
let roll = stable.rollSurvival({hp: -27, pvMax: 270, stats: {"Volonté": 30}});
assert.equal(roll.pDeath, 48.5, "−10 % des PV : 50 − Volonté ÷ 20 (seuil à −20 % depuis le bêta-test)");
assert.deepEqual([roll.roll, roll.survives], [99, true]);
dice = [0.4];
assert.equal(stable.rollSurvival({hp: -27, pvMax: 270, stats: {"Volonté": 30}}).survives, false);
assert.equal(stable.capturable("destrier"), true);
assert.equal(stable.capturable("inconnu"), false);

// Retour d'une escouade : ses montures entrent aux Écuries (ou sont relâchées faute de place).
state.expeditions = [{id: "x1", kind: "contract", memberIds: [state.company.roster[1].id], status: "arrived", arriveDay: state.day,
  offer: {distance: 1, campName: "Camp de voleurs", fields: {lieu: "Valombre"}}}];
rules.completeExpeditionCombat(state, "x1", {result: {victory: true, reward: 0, chestGold: 0, loot: [], chestItems: [],
  mounts: [destrier("Camp de voleurs de Valombre"), destrier("Camp de voleurs de Valombre")]}});
assert.equal(state.expeditions[0].pending.mounts.length, 2, "elles rentrent avec l'escouade");
const [backReport] = rules.advanceTime(state, 1);
const returned = backReport.expeditions.returned[0];
assert.equal(returned.mounts.kept.length, 1, "une place libre");
assert.equal(returned.mounts.released.length, 1, "l'autre relâchée");
assert.equal(stable.mountsOf(state).at(-1).origin, "Camp de voleurs de Valombre");

// 3. La capture en fin de combat (mission.js).
let fightSeed = 71;
const random = () => ((fightSeed = (fightSeed * 16807) % 2147483647) / 2147483647);
Math.random = random;
const missionRulesApi = Missions.createMissionRules({reference, random});
const element = () => ({textContent: "", innerHTML: "", disabled: false, title: "", style: {}, parentElement: {clientWidth: 900},
  classList: {add() {}, remove() {}, toggle() {}}, addEventListener() {}, close() {}});
const elements = {};
const $ = id => elements[id] || (elements[id] = element());
const game = {campaign: state, captain, referenceData: reference};
let api = null;
const combat = createCombatEngine(reference, {onAttack: Progression.recordAttack, heightOf: u => api.missionUnitHeight(u)});
const mission = fs.readFileSync(path.join(ROOT, "prototype-web", "mission.js"), "utf8");
api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", "missionRules", "campaignRules", mission + "\nreturn {makeMissionUnit,sortMissionInitiative,setMissionMapSize,"
  + "placeMissionArmy,missionUnitHeight,settleMissionMounts,missionCapturedMounts,admitMissionMounts};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => combat, Progression, MissionEnd, Magic,
    () => missionRulesApi, () => rules);
api.setMissionMapSize({cols: 30, rows: 15});
let uid = 500;
function riders(n) {
  const arch = missionRulesApi.archetype("thief_rider");
  const foes = Array.from({length: n}, () => missionRulesApi.applyArchetype(generator.createMercenary({id: ++uid, captain, forcedPeople: "Humain", forcedCulture: arch.culture}), arch, {idPrefix: "r" + uid, name: arch.nom}));
  const enemies = api.placeMissionArmy(foes.map((c, i) => api.makeMissionUnit(c, "enemy", i % 3)), "enemy");
  const players = api.placeMissionArmy([api.makeMissionUnit(generator.createMercenary({id: ++uid, captain}), "player", 0)], "player");
  game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: [], relief: []};
  return game.mission;
}
// Trois cavaliers : un cheval à peine tombé (il vit), un cheval très blessé (le jet de mort), un cheval parti avec son
// cavalier (perdu).
let m = riders(3);
const [a, b, c] = m.enemies;
const [ha, hb, hc] = [a.mount, b.mount, c.mount];
ha.hp = 0; ha.alive = false; a.hp = -10; a.alive = false;
hb.hp = -27; hb.alive = false; b.hp = -10; b.alive = false;
c.alive = false; c.offMap = true;
// (le bilan complet de fin de combat appelle l'interface : ici, seulement le règlement des montures.)
api.settleMissionMounts();
assert.ok(m.enemies.includes(ha) && m.enemies.includes(hb) && m.enemies.includes(hc), "les chevaux tombés sont sur la carte");
assert.ok(hc.offMap, "le troisième est parti avec son cavalier");
let captured = api.missionCapturedMounts(m);
assert.ok(captured.some(x => x.detail === ""), "à 0 PV, pris sans jet");
assert.ok(captured.length >= 1 && captured.length <= 2);
assert.ok(captured.every(x => x.code === "destrier" && x.origin === "Mission Test"));
assert.ok(!captured.some(x => x === undefined));
// Mission Test : tout de suite aux Écuries (à l'Intendance), s'il reste une place.
const clearMounts = () => { state.company.stock = (state.company.stock || []).filter(i => i.itemType !== "mount"); };
clearMounts();
state.company.camp.buildings.trainer_stables.level = 1;
api.admitMissionMounts(captured);
assert.equal(stable.mountsOf(state).length, Math.min(2, captured.length));
assert.ok(stable.mountsOf(state).every(i => i.itemType === "mount" && i.owner == null), "une monture est un objet de l'Intendance");
assert.ok(m.log.some(l => /Destrier capturé.*il rejoint les Écuries \(\d \/ 2\)/.test(l.message)));
// Pas de place : relâché.
clearMounts();
stable.admit(state, [destrier("Mission Test"), destrier("Mission Test")]);
api.admitMissionMounts([destrier("Mission Test")]);
assert.equal(stable.mountsOf(state).length, 2);
assert.ok(m.log.some(l => /pas de place aux Écuries : il est relâché/.test(l.message)));

console.log(JSON.stringify({ok: true, places: "2 par niveau", entretien: "10 PO par destrier et par jour", captures: captured.length}, null, 2));
