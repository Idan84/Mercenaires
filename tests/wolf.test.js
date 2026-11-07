"use strict";

// Le loup de combat (Idan, 2026-11-07 : « Non on limite à un compagnon/ monture pour l'instant » ; « C'est exactement à quoi
// je pensais » (les petits peuples le montent) ; « ceux de la cours de sang + Marchand gobelin » (« Gobelin des villes ! ») ;
// « Alignement chaotique neutre. Entretien 10 Po » ; « Il loge au chenil » ; le Chenil comme les Écuries : « Parfait ») :
// sa fiche (celle du Loup de la Cour de sang), le Chenil, Fizzi Doigts-Légers, l'apprivoiser (tout le monde : c'est un
// compagnon), au combat (monté par un petit, à côté d'un grand), la capture des loups de la Cour de sang.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const {createTavernRules} = require("../game-core/tavern.js");
const {createCampaignRules} = require("../game-core/campaign.js");
const {createMerchantRules} = require("../game-core/merchants.js");
const {createAffinityRules} = require("../game-core/affinity.js");
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

// 1. Les données : le loup, le Chenil, Fizzi, les loups de la Cour de sang.
const wolf = reference.mounts.rows.find(r => r.code === "loup");
const courtWolf = reference.enemyArchetypes.rows.find(r => r.code === "court_wolf");
assert.deepEqual([wolf.nom, wolf.espece, wolf.gabarit, wolf.taille, wolf.entretien, wolf.alignement, wolf.rang_echange, wolf.logement, wolf.compagnon, wolf.capturable],
  ["Loup", "Canidés", 1, "normale", 10, "Chaotique neutre", 3, "trainer_kennel", true, true]);
assert.deepEqual(wolf.caracteristiques, courtWolf.caracteristiques, "la fiche du Loup de la Cour de sang");
assert.deepEqual(wolf.attaque, courtWolf.attaque, "sa morsure");
assert.ok(!("tolerance" in wolf));
for (const code of ["destrier", "licorne"]) {
  const row = reference.mounts.rows.find(r => r.code === code);
  assert.deepEqual([row.logement, row.compagnon], ["trainer_stables", false], code + " : aux Écuries, il faut pouvoir le monter");
}
const kennel = reference.campBuildings.rows.find(r => r.code === "trainer_kennel");
const stablesRow = reference.campBuildings.rows.find(r => r.code === "trainer_stables");
assert.deepEqual([kennel.nom, kennel.requiert, kennel.places_par_niveau, kennel.prix_base, kennel.jours_base, kennel.niveaux],
  ["Le Chenil", "trainer_barn", 2, stablesRow.prix_base, stablesRow.jours_base, stablesRow.niveaux], "comme les Écuries");
const fizzi = reference.merchants.rows.find(m => m.id === "fizzi-doigts-legers");
assert.deepEqual([fizzi.peuple, fizzi.culture], ["Gobelin", "Gobelins des villes"]);
assert.ok(fizzi.vend.some(v => v.type === "mount" && v.objet === "Loup"), "Fizzi vend des loups");
assert.deepEqual(reference.enemyArchetypes.rows.filter(r => r.capture === "loup").map(r => r.code),
  ["court_wolf_novice", "court_wolf", "court_wolf_veteran", "court_wolf_elite"], "les loups de la Cour de sang");
assert.ok(reference.animalNames.rows.find(r => r.code === "loup").noms.length >= 20, "ses noms");

// 2. La campagne : le Chenil, ses places, l'achat chez Fizzi, l'entretien.
let seed = 53, dice = [];
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
Math.random = random;
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const campMagic = Magic.createMagicRules({reference, combat: createCombatEngine(reference, {})});
const campaign = createCampaignRules({generator, tavern: createTavernRules({random: () => 0.999, reference}), reference,
  progression: Progression.createProgressionRules({reference}), magic: {rechargeMana: (c, o) => campMagic.rechargeMana(c, o)},
  random: () => dice.length ? dice.shift() : 0.5});
const stable = campaign.stableRules;
const captain = generator.createCaptain({id: 1});
const state = campaign.createCampaign({captain, squad: [
  generator.createMercenary({id: 2, captain, forcedPeople: "Gobelin"}),
  generator.createMercenary({id: 3, captain, forcedPeople: "Humain"}),
  generator.createMercenary({id: 4, captain, forcedPeople: "Ogre"})]});
const [, goblin, human, ogre] = state.company.roster;
state.company.gold = 100000;
const merchants = createMerchantRules({reference, generator, affinity: createAffinityRules({reference}), random,
  canStore: (s, item) => stable.canStore(s, item), onAcquire: (s, item) => stable.giveName(s, item)});
const stall = items => { state.market = {visit: {merchantId: "fizzi-doigts-legers", day: state.day, stock: items.map((item, id) => ({id, item})), sold: {}, traded: false}, merchants: {}}; };
const values = createItemValues({reference});
const wolfItem = generator.createItemByName("mount", "Loup");
assert.deepEqual([wolfItem.mountCode, wolfItem.exchangeTier, values.value(wolfItem)], ["loup", 3, 3000], "300 × 10 PO");
stall([generator.createItemByName("mount", "Loup"), generator.createItemByName("mount", "Loup"), generator.createItemByName("mount", "Loup")]);
assert.equal(merchants.buy(state, 0).reason, "Il faut d’abord un Chenil (à la Grange du dresseur).");
state.company.camp.buildings = {trainer_barn: {level: 1, construction: null}, trainer_stables: {level: 1, construction: null}};
assert.equal(merchants.buy(state, 0).reason, "Il faut d’abord un Chenil (à la Grange du dresseur).", "les Écuries ne logent pas les loups");
assert.equal(campaign.nextBuildingLevel(state, "trainer_kennel").locked, false, "une aile de la Grange");
state.company.camp.buildings.trainer_kennel = {level: 1, construction: null};
assert.deepEqual([stable.places(state), stable.places(state, stable.KENNEL)], [2, 2]);
assert.equal(campaign.campBuildingEffects(state).kennelPlaces, 2);
const bought = merchants.buy(state, 0);
assert.equal(bought.ok, true, bought.reason);
assert.ok(reference.animalNames.rows.find(r => r.code === "loup").noms.includes(bought.item.petName), "un nom de loup : " + bought.item.petName);
assert.equal(merchants.buy(state, 1).ok, true);
assert.equal(merchants.buy(state, 2).reason, "Pas de place au Chenil.");
assert.deepEqual([stable.mountsIn(state, stable.KENNEL).length, stable.mountsIn(state).length, stable.free(state)], [2, 0, 2],
  "deux loups au Chenil, les Écuries libres");
assert.equal(stable.admit(state, [{code: "destrier", origin: "test"}]).kept.length, 1, "un destrier va aux Écuries");
assert.deepEqual(stable.admit(state, [{code: "loup", origin: "test"}]).released.map(c => c.code), ["loup"], "plus de place au Chenil");
assert.equal(stable.upkeep(state), 30, "10 PO par loup et par destrier");
assert.equal(merchants.visitOf(state).buyback(bought.item).specialty, true, "Fizzi les rachète comme les siens");

// 3. L'apprivoiser : tout le monde (c'est un compagnon) ; seul un petit le monte.
const taming = campaign.tamingRules;
const give = (m, item) => { state.company.stock = state.company.stock.filter(i => i !== item); item.owner = m.id; m.items.push(item); return item; };
const [wolfA, wolfB] = stable.mountsIn(state, stable.KENNEL);
give(human, wolfA);
give(ogre, wolfB);
assert.equal(taming.canTame(state, human, wolfA.id).ok, true, "un humain l'apprivoise");
assert.equal(taming.canTame(state, ogre, wolfB.id).ok, true, "un ogre aussi");
const horse = give(ogre, stable.mountsIn(state)[0]);
assert.equal(taming.canTame(state, ogre, horse.id).reason, "Il est trop grand pour la monter.", "un cheval, non");
assert.deepEqual([goblin, human, ogre].map(m => stable.rides(m, wolfA)), [true, false, false], "seuls les petits peuples le montent");
const odds = taming.dailyChance(state, {studentId: human.id, mountId: wolfA.id});
assert.equal(odds.stubborn, (wolf.caracteristiques.Intelligence + wolf.caracteristiques["Volonté"]) / 2, "son entêtement : 35");

// 4. Au combat : le gobelin le monte ; l'humain l'emmène à ses côtés (il joue juste après lui).
const element = () => ({textContent: "", innerHTML: "", disabled: false, title: "", style: {}, parentElement: {clientWidth: 900},
  classList: {add() {}, remove() {}, toggle() {}}, addEventListener() {}, close() {}});
const elements = {};
const $ = id => elements[id] || (elements[id] = element());
const game = {campaign: state, captain, referenceData: reference};
let api = null;
const rules = Missions.createMissionRules({reference, random});
const combat = createCombatEngine(reference, {onAttack: Progression.recordAttack, heightOf: u => api.missionUnitHeight(u)});
const mission = fs.readFileSync(path.join(ROOT, "prototype-web", "mission.js"), "utf8");
api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", "missionRules", "campaignRules", mission + "\nreturn {makeMissionUnit,sortMissionInitiative,setMissionMapSize,"
  + "placeMissionArmy,missionUnitHeight,missionUnits,deployMissionCompanions,missionCapturedMounts,admitMissionMounts,missionOwnMounts,"
  + "missionLooseMount,missionRemountable,missionDismountCells};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => combat, Progression, MissionEnd, Magic,
    () => rules, () => campaign);
api.setMissionMapSize({cols: 30, rows: 15});
const equip = (m, item) => { if (!m.items.includes(item)) give(m, item); item.tamedBy = m.id; item.slot = "mount"; m.equipment.slots.mount = item.id; };
equip(human, wolfA);
const goblinWolf = stable.admit(state, [{code: "loup", origin: "test"}]);
assert.equal(goblinWolf.kept.length, 0, "le Chenil est plein");
state.company.camp.buildings.trainer_kennel.level = 2;
const third = stable.admit(state, [{code: "loup", origin: "test"}]).kept[0];
equip(goblin, third);
const foes = [generator.createMercenary({id: 900, captain})];
const players = api.placeMissionArmy([goblin, human].map((c, i) => api.makeMissionUnit(c, "player", i)), "player");
const enemies = api.placeMissionArmy(foes.map((c, i) => api.makeMissionUnit(c, "enemy", i)), "enemy");
game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
  players, enemies, playerOrder: api.sortMissionInitiative(players, combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
  activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: [], relief: []};
const [goblinUnit, humanUnit] = players;
assert.ok(goblinUnit.mount && goblinUnit.mount.character.name === third.petName, "le gobelin part sur son loup, qui porte son nom");
assert.equal(humanUnit.mount, undefined, "l'humain ne le monte pas");
assert.ok(humanUnit.companion, "son loup l'attend");
api.deployMissionCompanions();
const pet = game.mission.players.find(u => u.follows === humanUnit.id);
assert.ok(pet && pet.character.name === wolfA.petName, "son loup est sur la carte");
assert.equal(combat.axialDistance(humanUnit, pet), 1, "à côté de lui");
assert.deepEqual([pet.rider, pet.master, pet.acted, pet.attackAvailable], [null, humanUnit, false, true], "il joue, seul");
const order = game.mission.playerOrder;
assert.equal(order.indexOf(pet), order.indexOf(humanUnit) + 1, "juste après lui dans l'ordre");
assert.equal(humanUnit.companion, undefined);
assert.equal(api.missionRemountable(humanUnit), null, "l'humain ne peut pas le monter");
assert.ok(api.missionOwnMounts(game.mission).some(u => u === pet), "sa fin de mission, comme une monture");
// Ses attaques, à pied, donnent l'XP animale à son maître (Idan : « Oui bien sur ») ; celles du loup monté aussi.
Progression.recordAttack(pet, enemies[0], {mode: "melee"}, {ok: true, hit: true, wound: true, damage: 8, weapon: "Morsure"});
assert.deepEqual(humanUnit.progress.animalUses["Canidés"], {attacks: 1, hits: 1, wounds: 1}, "l'humain apprend de son loup");
Progression.recordAttack(goblinUnit.mount, enemies[0], {mode: "melee"}, {ok: true, hit: true, weapon: "Morsure"});
assert.equal(goblinUnit.progress.animalUses["Canidés"].attacks, 1, "le gobelin de celui qu'il monte");
// Le titre (Idan : « Oui ») : « à dos de loup » pour celui qui le monte, rien pour celui qui l'emmène à pied.
const {createProfileRules} = require("../game-core/mercenary-profile.js");
const profile = createProfileRules({reference, engine: combat});
const titleOf = m => profile.composeTitle(m, {titles: [], cannonFodder: true}, {}, {}).name;
assert.match(titleOf(goblin), /^Chair à canon à dos de loup$/, "le gobelin : " + titleOf(goblin));
assert.equal(titleOf(human), "Chair à canon", "l'humain l'emmène à pied");

// 5. La capture : un loup de la Cour de sang KO passe le test de survie et rejoint le Chenil.
const prey = generator.createMercenary({id: 950, captain});
rules.applyArchetype(prey, rules.archetype("court_wolf"), {idPrefix: "test-wolf", name: "Loup"});
const preyUnit = api.makeMissionUnit(prey, "enemy", 1);
preyUnit.q = 20; preyUnit.r = 2;
game.mission.enemies.push(preyUnit);
preyUnit.alive = false; preyUnit.hp = 0;
const captured = api.missionCapturedMounts(game.mission);
assert.deepEqual(captured.map(c => [c.code, c.name]), [["loup", "Loup"]], "un loup capturé");
state.company.camp.buildings.trainer_kennel.level = 3;
api.admitMissionMounts(captured);
assert.ok(game.mission.log.some(l => /Loup capturé.*il rejoint le Chenil \(4 \/ 6\)/.test(l.message)), "il rejoint le Chenil");
assert.equal(stable.mountsIn(state, stable.KENNEL).length, 4);

console.log(JSON.stringify({ok: true, loups: stable.mountsIn(state, stable.KENNEL).map(m => m.petName)}, null, 2));
