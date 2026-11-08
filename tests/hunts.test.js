"use strict";

// Les chasses (Idan, 2026-11-07 : « Récompense de 1000 Po par étoile. 0,25 à 1 jour de marche par étoile. Arrondi sup.
// Textes cohérents avec l'espèce : Version Meute de Loup : 3D6 par étoile. Version Licorne : 1D6 par étoile. On élimine
// les animaux. On peut en capturer ou se prendre une pilée ! On génère des missions -2 / +2 étoiles par rapport à
// l'étoile » ; « Les fiches fixes » ; ni coffre ni butin : « Oui » ; une case sur cinq au tableau, les loups 3 fois sur 4 ; depuis le 2026-11-08 : une case sur trois, loups et licornes à égalité) :
// le tirage, les bêtes, la récompense, le tableau, les lettres, le paysage, des combats entiers, la capture. Après le
// bêta-test (Idan, 2026-11-07 : « On passe la mission loup à 1D6 loups au lieu de 3D6 et les licornes en 1D3 »).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const {createTavernRules} = require("../game-core/tavern.js");
const {createCampaignRules} = require("../game-core/campaign.js");
const {createMissionTerrain} = require("../game-core/mission-terrain.js");
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

let seed = 97;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
Math.random = random;
const rules = Missions.createMissionRules({reference, random});

// 1. Les données : deux chasses, leurs bêtes, leurs lettres.
const wolves = rules.definition("hunt_wolves"), unicorns = rules.definition("hunt_unicorn");
assert.deepEqual([wolves.bete.code, wolves.bete.des, wolves.bete.faces, wolves.poids, wolves.niveau.ecart, wolves.recompense.par_niveau, wolves.marche.facteur],
  ["loup", 1, 6, 1, [-4, 1], 1000, [0.25, 1]]);
assert.deepEqual([unicorns.bete.code, unicorns.bete.des, unicorns.bete.faces, unicorns.poids], ["licorne", 1, 3, 1]);
assert.equal(wolves.coffre, undefined, "ni coffre");
for (const def of [wolves, unicorns]) {
  const orders = reference.oneShotMissions.ordres.filter(o => o.mission === def.code);
  assert.equal(orders.length, 2, def.code + " : deux lettres");
  for (const o of orders) assert.ok(reference.oneShotMissions.noms[o.noms_commanditaire]?.length, o.code + " : ses commanditaires");
}

// 2. Le tirage : renommée ± 2, les bêtes, la marche, la récompense.
const renown = 0, base = rules.renownLevel(renown);
const seen = {hunt_wolves: 0, hunt_unicorn: 0};
for (let i = 0; i < 400; i++) {
  const offer = rules.createHunt({day: 1, renown});
  seen[offer.code]++;
  const def = rules.definition(offer.code), L = offer.level;
  assert.ok(L >= Math.max(1, base - 2) && L <= base + 2, "étoiles : " + L);
  const dice = def.bete.des * L;
  assert.ok(offer.enemyCount >= dice && offer.enemyCount <= Math.min(100, dice * def.bete.faces), "bêtes : " + offer.enemyCount);
  assert.ok(offer.distance >= Math.ceil(0.25 * L) && offer.distance <= L, "marche : " + offer.distance + " pour " + L + " étoiles");
  assert.equal(offer.reward, 1000 * L);
  assert.equal(offer.hunt, true);
  assert.ok(def.bete.lieux.includes(offer.campName));
  const letter = rules.orderText(offer, {date: "1er du mois", récompense: offer.reward});
  assert.ok(letter && letter.paragraphs.every(p => !/\{[^}]+\}/.test(p)), "la lettre est remplie");
}
const huntTotal = seen.hunt_wolves + seen.hunt_unicorn;
assert.ok(seen.hunt_wolves > 0.4 * huntTotal && seen.hunt_unicorn > 0.4 * huntTotal, "loups et licornes à égalité (Idan, 2026-11-08) : " + JSON.stringify(seen));
const big = rules.createOffer({code: "hunt_wolves", level: 15});
assert.ok(big.enemyCount <= 100, "au plus 100");
assert.ok(big.distance >= 4 && big.distance <= 15);

// 3. Les bêtes : la fiche fixe de nos animaux ; ni coffre ni butin.
const offer = rules.createOffer({code: "hunt_wolves", level: 1});
const beasts = rules.buildEnemies(offer);
assert.equal(beasts.length, offer.enemyCount);
assert.ok(beasts.every(b => b.mount?.code === "loup" && b.gabarit === 1), "des loups, la fiche de mounts.json");
assert.equal(beasts[0].name, beasts.length > 1 ? "Loup 1" : "Loup", "numérotés s'ils sont plusieurs");
assert.deepEqual(rules.chestPlan(offer), {tiers: [], manuals: []});
assert.equal(rules.rollChestGold(offer), 0);
assert.deepEqual(rules.outcome(offer, {victory: true}), {victory: true, reward: offer.reward, chestGold: 0, chestItems: [], loot: [], renown: 0, hunt: true});
assert.equal(rules.outcome(offer, {victory: false}).renown, -30, "un échec fait baisser la renommée, comme un contrat");

// 4. Le paysage : une forêt pour les loups, une clairière pour les licornes, sans enceinte.
const terrain = createMissionTerrain({reference});
assert.deepEqual(["Loups", "Licornes"].map(f => [terrain.landscape(f)?.nom, terrain.landscape(f)?.enceinte]), [["Forêt profonde", false], ["Clairière", false]]);

// 5. Le tableau : une case sur trois.
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const campMagic = Magic.createMagicRules({reference, combat: createCombatEngine(reference, {})});
const campaign = createCampaignRules({generator, tavern: createTavernRules({random: () => 0.999, reference}), reference,
  progression: Progression.createProgressionRules({reference}), magic: {rechargeMana: (c, o) => campMagic.rechargeMana(c, o)}, random,
  missions: rules, bodyguard: require("../game-core/bodyguard.js").createBodyguardRules({reference, random})});
const captain = generator.createCaptain({id: 1});
const state = campaign.createCampaign({captain, squad: [2, 3, 4].map(id => generator.createMercenary({id, captain, forcedPeople: "Humain"}))});
let hunts = 0, total = 0;
for (let i = 0; i < 80; i++) {
  delete state.tavernBoard;
  campaign.fillTavernBoard(state);
  for (const o of campaign.boardOffers(state)) { total++; if (o.hunt) hunts++; }
}
assert.ok(hunts / total > 0.25 && hunts / total < 0.42, "une case sur trois (Idan, 2026-11-08 : types équiprobables) : " + hunts + " / " + total);
// Une chasse se signe comme un contrat.
const hunt = campaign.boardOffers(state).find(o => o.hunt) || (() => { const o = rules.createOffer({code: "hunt_wolves", level: 1}); state.tavernBoard.slots[0].offer = o; return o; })();
const departed = campaign.departExpedition(state, [state.company.roster[1].id], hunt.id);
assert.equal(departed.ok, true, departed.reason);

// 6. Des combats entiers contre des bêtes, et la capture.
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
  + "placeMissionArmy,missionUnitHeight,selectNextMissionPlayer,startMissionCamouflage,autoResolveMission,missionCapturedMounts,"
  + "contractResultLines};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => combat, Progression, MissionEnd, Magic,
    () => rules, () => campaign);
api.setMissionMapSize({cols: 30, rows: 15});
const squad = [2, 3, 4, 5, 6].map(id => generator.createMercenary({id: 100 + id, captain, forcedPeople: "Humain"}));
// Hors campagne pour le combat (le bilan de la compagnie est l'affaire de l'interface) ; la campagne pour la capture.
game.campaign = null;
let over = 0, captured = 0, wins = 0;
for (const code of ["hunt_wolves", "hunt_wolves", "hunt_unicorn", "hunt_unicorn"]) {
  const o = rules.createOffer({code, level: 1});
  const players = api.placeMissionArmy(squad.map((c, i) => api.makeMissionUnit(c, "player", i % 3)), "player");
  const enemies = api.placeMissionArmy(rules.buildEnemies(o).map((c, i) => api.makeMissionUnit(c, "enemy", i % 3)), "enemy");
  game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: [], relief: [], contract: o};
  api.startMissionCamouflage(); api.selectNextMissionPlayer(); api.autoResolveMission();
  if (game.mission.over) over++;
  if (game.mission.winner === "player") { wins++; game.campaign = state; captured += api.missionCapturedMounts(game.mission).length; game.campaign = null; }
  for (const c of squad) { delete c.progress; }
}
assert.equal(over, 4, "chaque chasse se termine");
assert.ok(captured >= 0);
const lines = api.contractResultLines({victory: true, reward: 3000, chestGold: 0, chestItems: [], loot: [], hunt: true}, {days: 2, bonuses: 0});
assert.deepEqual(lines.map(l => l.text), ["Contrat rempli : 3000 PO de récompense.", "Retour au camp dans 2 jours."], "ni coffre ni butin au bilan");

console.log(JSON.stringify({ok: true, seen, board: [hunts, total], fights: {over, wins, captured}}, null, 2));
