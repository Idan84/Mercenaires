"use strict";

// Nos mercenaires à cheval (Idan, 2026-11-07 : « Pour pouvoir l'équiper […], il doit passer du temps chez le dresseur » ;
// « Pour les montures, on les contrôle comme on contrôle un mercenaire. Avec ou sans cavalier. ») : celui qui a apprivoisé
// et équipé sa monture part à cheval, avec les règles du Cavalier des voleurs (doc 04) ; seul, son cheval rejoint l'ordre du
// tour de notre équipe ; en fin de combat (« La monture peut mourir indépendamment du cavalier ou être blessée en fin de
// mission. Si le cavalier meurt, elle repart dans l'enclos […] elle a la même fiche qu'un mercenaire. ») : la chaîne mort →
// blessure → fatigue de nos mercenaires, le repos aux Écuries, l'enclos si son cavalier meurt.
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
  + "missionMountOf,settleOwnMissionMounts,endMissionActivation,missionActionAvailability,performMissionAttack,missionUnitAtCell,"
  + "enemyMissionActWithMount,enemyMissionAct,missionMagic};")
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

// 2 bis. Le cheval monté a son attaque (Idan : « oui, il a une attaque. La seule chose, c'est le déplacement commun ») : il
// joue juste après son cavalier, sur place ; ni déplacement, ni charge, ni second mouvement, ni sentinelle.
const adjacentTo = (unit, other) => {
  for (const c of combat.footprint(unit)) for (const [dq, dr] of [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]) {
    const cell = {q: c.q + dq, r: c.r + dr};
    if (combat.axialDistance(unit, cell) === 1 && !api.missionUnitAtCell(cell.q, cell.r)) { other.q = cell.q; other.r = cell.r; return cell; }
  }
  return null;
};
const saved = m;
const third = give(rider, "Destrier");
m = newMission([rider], foes(1));
const duo = m.players[0], target = m.enemies[0];
assert.ok(adjacentTo(duo, target), "l'ennemi au contact du couple");
target.camouflaged = false;
m.phase = "player"; m.activeUnit = duo; duo.acted = false;
api.endMissionActivation();
assert.equal(m.activeUnit, duo.mount, "son cheval joue juste après lui");
assert.ok(m.log.some(l => l.message === "Activation de " + duo.mount.character.name + "."));
const can = api.missionActionAvailability();
assert.deepEqual([can.move, can.charge, can.secondMove, can.sentinel, can.melee], [false, false, false, false, true]);
assert.equal(duo.mount.movementRemaining, 0, "le déplacement est commun");
const hpBefore = target.hp;
api.performMissionAttack(duo.mount, target, "melee", combat.axialDistance(duo.mount, target));
assert.ok(m.log.some(l => new RegExp("^" + duo.mount.character.name + " attaque ").test(l.message)), "il attaque avec ses sabots");
assert.ok(target.hp <= hpBefore);
api.endMissionActivation();
assert.notEqual(m.activeUnit, duo.mount, "puis le suivant");
// Un cavalier ennemi : son cheval frappe aussi, sur place.
const enemyRider = rules.applyArchetype(generator.createMercenary({id: 950, captain, forcedPeople: "Humain", forcedCulture: rules.archetype("thief_rider").culture}),
  rules.archetype("thief_rider"), {idPrefix: "c950", name: "Cavalier"});
m = newMission([walker], [enemyRider]);
const foeRider = m.enemies[0], victim = m.players[0];
adjacentTo(foeRider, victim);
victim.camouflaged = false;
const at = {q: foeRider.q, r: foeRider.r};
foeRider.fleeing = false;
api.enemyMissionActWithMount(foeRider);
assert.ok(m.log.some(l => /^Destrier de Cavalier attaque /.test(l.message)), "le cheval du Cavalier attaque : " + m.log.map(l => l.message).join(" | "));
// La licorne et son sort (Idan : « Reprend le sort qui existe déjà. On lui donne juste des points de mana et des niveaux de
// compétences de magie. Comme un mercenaire ») : Création de double, Illusion 50, Réserve de mana 40.
const unicornItem = give(rider, "Licorne");
m = newMission([rider], foes(1));
const mage = m.players[0].mount, magic = api.missionMagic();
assert.equal(mage.character.name.split(" ")[0], "Licorne");
assert.deepEqual(magic.knownSpells(mage).map(s => s.code), ["decoy"], "elle connaît Création de double");
assert.deepEqual([magic.manaMax(mage), magic.currentMana(mage), magic.manaCost(mage, "decoy"), magic.range(mage, "decoy")], [40, 40, 17, 5]);
m.enemies[0].camouflaged = false;
m.phase = "player"; m.activeUnit = m.players[0]; m.players[0].acted = false;
api.endMissionActivation();
assert.equal(m.activeUnit, mage, "la licorne joue après son cavalier");
api.enemyMissionAct(mage, {reset: false});
const decoy = m.players.find(u => u.decoy && u.summon?.casterId === mage.id);
assert.ok(decoy, "elle lance son double : " + m.log.slice(-4).map(l => l.message).join(" | "));
assert.equal(magic.currentMana(mage), 23, "40 − 17 mana");
api.settleOwnMissionMounts(m);
assert.deepEqual(m.mountAftermath.results.map(r => r.id), [unicornItem.id], "son double n'est pas une monture");
rider.items = rider.items.filter(i => i !== third && i !== unicornItem);
rider.equipment.slots.mount = horse.id;
m = game.mission = saved;

// 3. Fin de combat (Idan : « La monture peut mourir indépendamment du cavalier ou être blessée en fin de mission. […]
// Globalement, elle a la même fiche qu'un mercenaire. ») : la chaîne de nos mercenaires, puis le repos aux Écuries.
lone.hp = -Math.round(lone.pvMax * 2); lone.alive = false;
let after = api.settleOwnMissionMounts(m);
assert.deepEqual(after.dead.map(i => i.id), [horse.id], "morte : elle est perdue");
assert.ok(!rider.items.includes(horse), "il ne l'a plus");
assert.equal(rider.equipment.slots.mount, null, "l'emplacement Monture est libre");
assert.ok(m.log.some(l => /^Destrier d.* — Mort .* : la monture est perdue\.$/.test(l.message)));
// Sans une égratignure : fatiguée, comme un mercenaire ; au repos, son cavalier part à pied.
const second = give(rider, "Destrier");
m = newMission([rider], foes(1));
after = api.settleOwnMissionMounts(m);
assert.deepEqual(after.fatigued.map(i => i.id), [second.id]);
assert.equal(second.recovery.kind, "fatigued");
assert.ok(second.recovery.daysLeft >= 1, "indisponible quelques jours");
assert.equal(api.missionMountOf(rider), null, "au repos : il part à pied");
assert.ok(!newMission([rider], foes(1)).players[0].mount);
// Chaque matin, un jour de moins ; reposée, elle repart.
const days = second.recovery.daysLeft;
const reports = campaign.advanceTime(state, days);
assert.deepEqual(reports.at(-1).stable.recovered.map(r => [r.mount.id, r.kind, r.owner.id]), [[second.id, "fatigued", rider.id]]);
assert.equal(second.recovery, undefined);
assert.equal(api.missionMountOf(rider).item, second, "reposée, il la monte");
// Blessée : les jours de blessure, comptés comme ceux de nos mercenaires (Dispensaire, médecin).
campaign.applyMountAftermath(state, [{id: second.id, dead: false, wounded: true, woundDays: 12}]);
assert.deepEqual([second.recovery.kind, second.recovery.daysLeft], ["wounded", 12]);
delete second.recovery;
// Son cavalier meurt : elle repart dans l'enclos, sans propriétaire ; un autre devra l'apprivoiser.
const death = campaign.applyMissionAftermath(state, {results: [{id: rider.id, name: rider.name, dead: true}], captainDead: false});
assert.deepEqual(death.mountsReturned.map(i => i.id), [second.id]);
const back = state.company.stock.find(i => i.id === second.id);
assert.ok(back && back.owner === null && back.slot === null, "à l'Intendance, aux Écuries");
assert.ok(!state.company.roster.includes(rider));
assert.equal(back.tamedBy, rider.id, "apprivoisée par le défunt : un autre devra l'apprivoiser");

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

console.log("Nos mercenaires à cheval : monture apprivoisée et équipée, règles du Cavalier, le cheval monté attaque après son cavalier (sur place), le double de la licorne, cheval seul dans notre ordre du tour, mort / blessure / fatigue en fin de combat, repos, l'enclos si le cavalier meurt — OK");
