"use strict";

// La Serre et les papillons (Idan, 2026-11-09 : « J'ai envie de faire les papillons ! ») : le papillon télépathe (« Il vol,
// il va vite. Il ne se monte pas. Il a une discrétion très très élevée. 300 ? Mais il n'attaque pas... C'est un peu le drone
// de repérage ! Il coûte pas cher, 3 PO. Il est vendu par les halflings explorateurs » ; chaotique bon ; pas de chasse), le
// papillon vénéneux (« moins discret. Il peut empoisonner au cac sans se faire repérer. Son attaque ne fait pas de dégâts,
// mais empoisonne comme une sarbacane. Il est vendu par les halflings des villes. Entretien 4 Po. Il est chaotique neutre » ;
// Discrétion 150 ; chasse 3D6 jusqu'à 6★) et le papillon géant (« Il fait la taille d'un loup. Coute 10 Po. Il vole mais ne
// frappe pas. Il est malgré tout discret. Il sert de monture de déplacement ou d'eclaireur moins efficace. Il est vendu par
// le halfling des villages isolés » ; charge aérienne « seulement avec un cavalier » ; neutre bon ; Discrétion 100 ; « à dos
// de papillon » ; seulement vendu). Un combat où ne restent que des papillons qui n'attaquent pas est perdu.
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
const Profile = require("../game-core/mercenary-profile.js");
require("../game-core/regeneration.js");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "prototype-web", "reference-data.js"), "utf8");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));
const sheet = code => reference.mounts.rows.find(r => r.code === code);

// 1. La Serre et les fiches.
const serre = reference.campBuildings.rows.find(r => r.code === "trainer_greenhouse"), kennel = reference.campBuildings.rows.find(r => r.code === "trainer_kennel");
assert.deepEqual([serre.nom, serre.requiert, serre.places_par_niveau, serre.entraine, serre.prix_base, serre.niveaux],
  ["La Serre", "trainer_barn", 2, "Papillons", kennel.prix_base, kennel.niveaux], "une aile de la Grange, comme le Chenil");
const [telepathe, veneneux, geant] = ["papillon_telepathe", "papillon_veneneux", "papillon_geant"].map(sheet);
for (const s of [telepathe, veneneux, geant]) {
  assert.deepEqual([s.espece, s.logement, s.physiologie.Vol, s.compagnon], ["Papillons", "trainer_greenhouse", true, true], s.code);
}
assert.deepEqual([telepathe.competences_martiales["Discrétion"], telepathe.attaque, telepathe.alignement, telepathe.entretien, telepathe.capturable],
  [300, null, "Chaotique bon", 3, false]);
assert.ok(telepathe.caracteristiques.Vitesse >= 100, "il va vite");
assert.deepEqual([veneneux.competences_martiales["Discrétion"], veneneux.alignement, veneneux.entretien, veneneux.capturable], [150, "Chaotique neutre", 4, true]);
assert.deepEqual([veneneux.attaque.empoisonne, veneneux.attaque.sans_degats], [true, true], "il empoisonne sans dégâts");
assert.deepEqual([geant.competences_martiales["Discrétion"], geant.attaque, geant.alignement, geant.entretien, geant.gabarit, geant.titre, geant.charge_aerienne, geant.capturable],
  [100, null, "Neutre bon", 10, sheet("loup").gabarit, "à dos de papillon", "montée", false]);
const merchant = name => reference.merchants.rows.find(m => m.nom === name);
assert.deepEqual([["Callie Loincompas", "Papillon télépathe"], ["Jasper Bonnebourse", "Papillon vénéneux"], ["Dottie Mielbruyère", "Papillon géant"]]
  .map(([n, o]) => [merchant(n).culture, merchant(n).vend.some(v => v.type === "mount" && v.objet === o)]),
  [["Explorateurs", true], ["Halflings des cités humaines", true], ["Halflings des villages isolés", true]]);
for (const code of ["papillon_telepathe", "papillon_veneneux", "papillon_geant"]) assert.equal(reference.animalNames.rows.find(r => r.code === code)?.noms.length, 24);
const hunts = reference.oneShotMissions.missions.filter(m => m.bete?.code?.startsWith("papillon"));
assert.deepEqual(hunts.map(h => [h.code, h.bete.code, h.bete.des, h.bete.faces, h.niveau.max]), [["hunt_butterflies", "papillon_veneneux", 3, 6, 6]],
  "une chasse : les vénéneux seulement, 3D6 par étoile, jusqu'à 6★");

// 2. Les papillons : sans arme, ils n'attaquent pas ; la Serre et ses demi-places.
let seed = 77;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
Math.random = random;
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const rules = Missions.createMissionRules({reference, random});
const tele = rules.createMount("papillon_telepathe", {id: "t1"}), venom = rules.createMount("papillon_veneneux", {id: "v1"}), giant = rules.createMount("papillon_geant", {id: "g1"});
assert.deepEqual([tele.noAttack, tele.items.length, tele.flies], [true, 0, true], "le télépathe n'attaque pas");
assert.deepEqual([giant.noAttack, giant.items.length, giant.aerialCharge], [true, 0, "montée"]);
assert.equal(venom.noAttack, undefined);
assert.deepEqual([venom.items[0].template.empoisonne, venom.items[0].template.sans_degats], [true, true]);
const values = createItemValues({reference});
assert.deepEqual(["Papillon télépathe", "Papillon vénéneux", "Papillon géant"].map(n => values.value(generator.createItemByName("mount", n))), [900, 1200, 3000]);
const stable = createStableRules({reference, random, makeItem: (type, name) => generator.createItemByName(type, name)});
const state = {day: 3, company: {gold: 0, stock: [], roster: [], camp: {buildings: {trainer_barn: {level: 1}, trainer_greenhouse: {level: 1}}}}};
assert.equal(stable.houseOf("papillon_telepathe"), stable.GREENHOUSE);
assert.equal(stable.houseWords(stable.GREENHOUSE).at, "à la Serre");
state.company.stock.push({...generator.createItemByName("mount", "Papillon télépathe"), id: "a"}, {...generator.createItemByName("mount", "Papillon vénéneux"), id: "b"});
assert.equal(stable.used(state, stable.GREENHOUSE), 1, "deux petits papillons : une place");
assert.equal(stable.canStore(state, {...generator.createItemByName("mount", "Papillon géant"), id: "c"}).ok, true, "le géant prend la dernière");

// 3. Au combat.
const engine = createCombatEngine(reference, {});
const captain = generator.createCaptain({id: 1});
const unit = (character, extra = {}) => ({character, q: 0, r: 0, alive: true, activeSet: 1, team: "player", ...extra});
const goblin = generator.createMercenary({id: 2, captain, forcedPeople: "Gobelin"});
const human = generator.createMercenary({id: 3, captain, forcedPeople: "Humain"});
assert.equal(engine.canRide(unit(goblin), unit(giant)), true, "un petit monte le géant");
assert.equal(engine.canRide(unit(human), unit(giant)), false, "pas un humain");
assert.equal(engine.canRide(unit(goblin), unit(tele)), false, "personne ne monte le télépathe");
const rider = unit(goblin), mount = unit(giant, {rider});
rider.mount = mount;
assert.equal(engine.aerialCharger(rider), true, "charge aérienne avec un cavalier");
assert.equal(engine.aerialCharger(unit(giant)), false, "seul, non");
// La piqûre : un coup qui blesse n'enlève aucun PV, mais empoisonne (10 PV par tour, 3 tours, comme la sarbacane).
let poisoned = 0, hpLost = 0;
for (let i = 0; i < 60; i++) {
  const target = unit(generator.createMercenary({id: 100 + i, captain}), {q: 1, team: "enemy"});
  target.hp = engine.maxHp(target);
  const before = target.hp;
  const r = engine.resolveAttack(unit(venom), target, {mode: "melee", distance: 1});
  if (r.wound) { assert.equal(r.damage, 0, "sans dégâts"); if (r.poison) { poisoned++; assert.deepEqual([r.poison.turns, r.poison.amount, r.poison.source], [3, 10, "blowgun"]); } }
  hpLost += before - target.hp;
}
assert.ok(poisoned > 0, "il empoisonne");
assert.equal(hpLost, 0, "jamais de dégâts directs");
// Le titre de celui qui monte le géant.
const profile = Profile.createMercenaryProfile ? Profile.createMercenaryProfile({reference}) : null;
if (profile?.titleOf) {
  const item = {...generator.createItemByName("mount", "Papillon géant"), id: "gx", owner: goblin.id, tamedBy: goblin.id};
  goblin.items.push(item); goblin.equipment.slots.mount = item.id;
  assert.match(String(profile.titleOf(goblin)?.title || profile.titleOf(goblin)), /à dos de papillon/);
}

// 4. L'écran de combat : la fin du combat, l'animal qui n'attaque pas.
const element = () => ({textContent: "", innerHTML: "", disabled: false, title: "", style: {}, parentElement: {clientWidth: 900},
  classList: {add() {}, remove() {}, toggle() {}}, addEventListener() {}, close() {}});
const elements = {};
const $ = id => elements[id] || (elements[id] = element());
const game = {campaign: null, captain, referenceData: reference};
let api = null;
const combat = createCombatEngine(reference, {onAttack: Progression.recordAttack, gridMap: () => api.missionGridMap()});
const mission = fs.readFileSync(path.join(ROOT, "prototype-web", "mission.js"), "utf8");
api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", "missionRules", mission + "\nreturn {makeMissionUnit,sortMissionInitiative,setMissionMapSize,missionGridMap,checkMissionEnd,"
  + "enemyMissionActivation,missionAxial};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => combat, Progression, MissionEnd, Magic, () => rules);
api.setMissionMapSize({cols: 30, rows: 15});
const battle = (players, enemies) => {
  game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: []};
  for (const u of [...players, ...enemies]) Object.assign(u, {camouflaged: false, attackAvailable: true});
  return game.mission;
};
const put = (u, col, row) => { const c = api.missionAxial(col, row); Object.assign(u, {q: c.q, r: c.r}); return u; };
const scout = put(api.makeMissionUnit(rules.createMount("papillon_telepathe", {id: "t2", name: "Murmure"}), "player", 0), 10, 7);
const merc = put(api.makeMissionUnit(generator.createMercenary({id: 300, captain}), "player", 1), 2, 2);
const foe = put(api.makeMissionUnit(generator.createMercenary({id: 301, captain}), "enemy", 0), 11, 7);
let m = battle([scout, merc], [foe]);
assert.equal(api.checkMissionEnd(), false, "le mercenaire tient encore le terrain");
merc.alive = false;
assert.equal(api.checkMissionEnd(), true, "seul le papillon reste : le combat est fini");
assert.equal(m.winner, "enemy", "perdu");
// Au contact d'un ennemi, le papillon qui n'attaque pas s'éloigne.
m = battle([put(scout, 10, 7)], [put(foe, 11, 7)]);
scout.alive = true; scout.movementRemaining = 9;
const before = combat.axialDistance(scout, foe);
api.enemyMissionActivation(scout, {reset: false});
assert.ok(combat.axialDistance(scout, foe) > before, "il s'écarte : " + combat.axialDistance(scout, foe));
assert.ok(foe.hp === foe.pvMax, "sans attaquer");

console.log(JSON.stringify({ok: true, empoisonnes: poisoned}, null, 2));
