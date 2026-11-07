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
// Le mana au camp, chaque matin, comme dans le jeu (tavern-ui.js).
const campMagic = Magic.createMagicRules({reference, combat: createCombatEngine(reference, {})});
const campaign = createCampaignRules({generator, tavern: createTavernRules({random: () => 0.999, reference}), reference,
  progression: Progression.createProgressionRules({reference}), magic: {rechargeMana: (c, o) => campMagic.rechargeMana(c, o)},
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
  + "enemyMissionAct,missionMagic,handleMissionHexClick,renderMissionSpellBar,setMissionMode,missionSpellUnit,targetableMissionCells,"
  + "missionReactors,useMissionPotion,performMissionAttack,dismountMission,remountMission,missionDismountCells,missionLooseMount,"
  + "moveMissionUnitAlongPath,shortestMissionPath,missionSecondMove};")
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

// 2 bis. Le cheval monté a son attaque (Idan : « oui, il a une attaque. La seule chose, c'est le déplacement commun » ; « faut
// pas que l'animal joue après. Ils jouent en même temps, on rajoute des boutons.. l'attaque principale de l'animal qui compte
// pas pour le mercenaire ») : dans l'activation de son cavalier, le bouton « Attaque de la monture » ; ses sorts dans la barre.
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
api.selectNextMissionPlayer();
assert.equal(m.activeUnit, duo, "le cavalier joue");
const can = api.missionActionAvailability();
assert.deepEqual([can.mountMelee, can.melee, can.move], [true, true, true], "l'attaque de sa monture, en plus de la sienne");
assert.equal(duo.mount.movementRemaining, 0, "le déplacement est celui du couple");
m.mode = "mountMelee";
const hpBefore = target.hp;
api.handleMissionHexClick(target.q, target.r);
assert.ok(m.log.some(l => new RegExp("^" + duo.mount.character.name + " attaque ").test(l.message)), "le cheval attaque avec ses sabots");
assert.ok(target.hp <= hpBefore);
assert.equal(duo.mount.attackAvailable, false, "l'action principale du cheval est prise");
assert.equal(m.activeUnit === duo && duo.attackAvailable, true, "celle du cavalier reste : il joue toujours");
assert.equal(api.missionActionAvailability().mountMelee, false);
// Le cavalier apprend (Idan : « xp catégorie animal pour le cavalier ») : chaque attaque de sa monture, comme une arme.
assert.equal(duo.progress.animalUses["Équidés"].attacks, 1);
const learned = Progression.createProgressionRules({reference}).gains(duo.progress, rider).skills.animal;
assert.ok(learned["Équidés"] >= 10 && learned["Compagnon animal"] === learned["Équidés"], "Équidés et Compagnon animal : " + JSON.stringify(learned));
// Les exploits de sa monture comptent pour sa réputation (Idan : « réputation 1 ») : participation et coup de grâce.
assert.equal(duo.mount.master, duo);
if (target.hp < hpBefore) assert.ok(Object.keys(duo.progress.enemyWounds).length > 0, "sa participation à la blessure");
Progression.recordAttack(duo.mount, target, {mode: "melee"}, {ok: true, wound: true, damage: 12, targetDown: true, weapon: "Sabots", hit: true});
assert.ok(Object.keys(duo.progress.enemyKnockouts).length > 0, "le coup de grâce de sa monture compte pour lui");
assert.ok(Progression.createProgressionRules({reference}).reputationGains(duo.progress).sources.enemyKnockouts > 0);
api.endMissionActivation();
assert.ok(!m.log.some(l => l.message === "Activation de " + duo.mount.character.name + "."), "le cheval ne joue pas après");
// Le cheval monté menace aussi (Idan : « pourquoi la monture ne fait pas des attaques d'opportunités ? » ; « oui ») : un
// ennemi qui quitte le contact du couple subit aussi son attaque d'opportunité.
assert.ok(api.missionReactors(target).includes(duo.mount), "le cheval réagit");
const away = {q: target.q + (target.q - duo.q) * 3, r: target.r};
assert.ok(combat.opportunityReactors(api.missionReactors(target), target, {...target, q: away.q, r: away.r}).includes(duo.mount));
// Une potion de soins avec « Viser le cheval » : c'est le cheval qui la boit (Idan : « oui »).
const potion = generator.createItemByName("potion", "Potion de soins");
rider.items.push(potion);
rider.equipment.slots.belt_item_1 = potion.id;
duo.mount.hp = 100; duo.quickAvailable = true;
m.activeUnit = duo; m.phase = "player"; m.aimMount = true;
assert.equal(api.useMissionPotion(duo, "belt_item_1"), true);
assert.ok(duo.mount.hp > 100, "le cheval est soigné : " + duo.mount.hp);
assert.ok(m.log.some(l => /fait boire à Destrier/.test(l.message)));
m.aimMount = false;
// Un coup d'IA sur un couple (Idan : « oui ») : le jet du tir décide qui le prend.
const strikes = {horse: 0, rider: 0};
for (let i = 0; i < 40; i++) {
  const before = m.log.length;
  target.attackAvailable = true;
  api.performMissionAttack(target, duo, "melee", combat.axialDistance(target, duo));
  const line = m.log.slice(before).find(l => /^Coup sur /.test(l.message));
  if (line) strikes[/le cheval le prend/.test(line.message) ? "horse" : "rider"]++;
  duo.hp = duo.pvMax; duo.mount.hp = duo.mount.pvMax; duo.alive = true; duo.mount.alive = true; duo.fleeing = false; target.fleeing = false;
  if (m.over) break;
}
assert.ok(strikes.horse > strikes.rider && strikes.rider > 0, "le cheval prend environ 2 coups sur 3 : " + JSON.stringify(strikes));
// Un cavalier ennemi : son cheval frappe aussi, dans la même activation, sur place.
const enemyRider = rules.applyArchetype(generator.createMercenary({id: 950, captain, forcedPeople: "Humain", forcedCulture: rules.archetype("thief_rider").culture}),
  rules.archetype("thief_rider"), {idPrefix: "c950", name: "Cavalier"});
const keepCampaign = game.campaign;
game.campaign = null;
m = newMission([walker], [enemyRider]);
const foeRider = m.enemies[0], victim = m.players[0];
adjacentTo(foeRider, victim);
victim.camouflaged = false;
victim.character.undead = true; // sans peur : il reste au contact
foeRider.fleeing = false;
api.enemyMissionAct(foeRider);
assert.ok(m.log.some(l => /^Destrier de Cavalier attaque /.test(l.message)), "le cheval du Cavalier attaque : " + m.log.map(l => l.message).join(" | "));
delete victim.character.undead;
game.campaign = keepCampaign;
// Descendre / Monter (Idan : « un bouton descendre de la monture / monter. […] La monture joue alors seule dans l'ordre, juste
// après le mercenaire. Monter : il faut être adjacent. Cela prend une action rapide. » ; « Le cavalier descend : il aura son
// deuxième déplacement et la monture son deuxième à son tour. » ; « Qui peut monter : seulement son cavalier. »).
game.campaign = null;
m = newMission([rider, other], foes(1));
let pairUnit = m.players.find(u => u.character === rider);
let steed = pairUnit.mount;
m.enemies[0].camouflaged = false;
while (m.activeUnit !== pairUnit) { if (m.activeUnit) api.endMissionActivation(); else api.selectNextMissionPlayer(); }
let can2 = api.missionActionAvailability();
assert.deepEqual([can2.dismount, can2.remount], [true, false]);
// Sans avoir bougé : il pose le pied, garde son premier déplacement ; elle aura le sien, juste après lui.
const spot = api.missionDismountCells(pairUnit)[0];
assert.equal(api.dismountMission(pairUnit, spot), true);
assert.ok(!pairUnit.mount && !steed.rider, "deux groupes");
assert.deepEqual([pairUnit.q, pairUnit.r], [spot.q, spot.r], "sur une case au contact");
assert.equal(pairUnit.quickAvailable, false, "une action rapide");
assert.equal(pairUnit.movementRemaining, combat.movementBase(pairUnit), "son déplacement, à pied");
assert.ok(m.players.includes(steed), "elle joue seule");
assert.equal(m.playerOrder.indexOf(steed), m.playerOrder.indexOf(pairUnit) + 1, "juste après lui");
assert.equal(api.missionLooseMount(pairUnit), steed);
assert.equal(api.missionLooseMount(m.players.find(u => u.character === other)), null, "seul son cavalier peut la monter");
api.endMissionActivation();
assert.equal(m.activeUnit, steed, "elle joue juste après lui");
assert.equal(steed.movementRemaining, combat.movementBase(steed), "son déplacement normal");
assert.equal(steed.attackAvailable, true);
api.endMissionActivation();
// Tour suivant : il remonte (au contact, action rapide) ; le couple repart avec le déplacement de la monture.
for (const u of m.players) u.acted = false;
m.activeUnit = null;
while (m.activeUnit !== pairUnit) { if (m.activeUnit) api.endMissionActivation(); else api.selectNextMissionPlayer(); }
assert.equal(combat.axialDistance(pairUnit, steed), 1);
assert.equal(api.missionActionAvailability().remount, true);
assert.equal(api.remountMission(pairUnit), true);
assert.equal(pairUnit.mount, steed);
assert.ok(!m.players.includes(steed) && !m.playerOrder.includes(steed), "le couple, de nouveau");
assert.equal(pairUnit.movementRemaining, combat.movementBase(pairUnit), "le déplacement de la monture");
assert.equal(combat.movementBase(pairUnit), combat.movementBase(steed));
assert.equal(pairUnit.quickAvailable, false);
// Après un déplacement du couple : il descend avec son second déplacement à lui, elle aura le sien à son tour.
const step = api.shortestMissionPath(pairUnit, {q: pairUnit.q, r: pairUnit.r + 1}, pairUnit) || api.shortestMissionPath(pairUnit, {q: pairUnit.q, r: pairUnit.r - 1}, pairUnit);
assert.ok(step, "un pas possible");
const remaining = pairUnit.movementRemaining;
assert.equal(api.moveMissionUnitAlongPath(pairUnit, step), step.length);
pairUnit.movementRemaining = remaining - step.length;
pairUnit.quickAvailable = true;
{
  assert.equal(api.dismountMission(pairUnit, api.missionDismountCells(pairUnit)[0]), true);
  assert.equal(pairUnit.movementRemaining, 0, "son premier déplacement est fait");
  assert.equal(api.missionActionAvailability().secondMove, true, "il lui reste le second");
  assert.equal(steed.carryOver.movementRemaining, 0, "elle aussi a fait son premier");
  api.endMissionActivation();
  assert.equal(m.activeUnit, steed);
  assert.equal(api.missionActionAvailability().secondMove, true, "et garde son second");
  api.endMissionActivation();
}
// Cavalier KO : la monture n'a pas sa propre initiative, elle joue juste après lui.
m = newMission([rider, other], foes(1));
pairUnit = m.players.find(u => u.character === rider);
steed = pairUnit.mount;
pairUnit.hp = -5; pairUnit.alive = false;
api.checkMissionEnd();
assert.equal(m.playerOrder.indexOf(steed), m.playerOrder.indexOf(pairUnit) + 1, "juste après son cavalier");
game.campaign = keepCampaign;

// La licorne et son sort (Idan : « Reprend le sort qui existe déjà. On lui donne juste des points de mana et des niveaux de
// compétences de magie. Comme un mercenaire ») : Création de double, Illusion 50, Réserve de mana 40, lancé depuis la barre de
// sorts de son cavalier, par elle.
const unicornItem = give(rider, "Licorne");
m = newMission([rider], foes(1));
// Les jets du sort, fixés (réussite, pas d'échec critique) : la magie lit Math.random à sa création.
const seededRandom = Math.random;
Math.random = () => 0.3;
const mage = m.players[0].mount, magic = api.missionMagic();
Math.random = seededRandom;
assert.equal(mage.character.name.split(" ")[0], "Licorne");
assert.deepEqual(magic.knownSpells(mage).map(s => s.code), ["decoy"], "elle connaît Création de double");
assert.deepEqual([magic.manaMax(mage), magic.currentMana(mage), magic.manaCost(mage, "decoy"), magic.range(mage, "decoy")], [40, 40, 17, 5]);
m.enemies[0].camouflaged = false;
api.selectNextMissionPlayer();
assert.equal(m.activeUnit, m.players[0]);
const bar = api.renderMissionSpellBar(m.activeUnit);
assert.match(bar, /Licorne · mana 40\/40/);
assert.match(bar, /data-spell="decoy" data-spell-caster="mount"/);
api.setMissionMode("spell:decoy", {caster: "mount"});
assert.equal(api.missionSpellUnit(), mage, "c'est la licorne qui lance");
const cell = [...api.targetableMissionCells()][0].split(",").map(Number);
api.handleMissionHexClick(cell[0], cell[1]);
const decoy = m.players.find(u => u.decoy && u.summon?.casterId === mage.id);
assert.ok(decoy, "elle lance son double : " + m.log.slice(-4).map(l => l.message).join(" | "));
assert.equal(magic.currentMana(mage), 23, "40 − 17 mana");
assert.equal(m.players[0].attackAvailable, true, "le cavalier garde son action");
const after2 = api.settleOwnMissionMounts(m);
assert.deepEqual(m.mountAftermath.results.map(r => r.id), [unicornItem.id], "son double n'est pas une monture");
// Sa fiche à elle (Idan : « Mana de la licorne + xp licorne ») : son mana gardé, son XP (ici, Réserve de mana et son sort).
assert.equal(unicornItem.sheet.mana, 23, "le mana de la fin du combat");
assert.ok(unicornItem.sheet.xp.spells.decoy > 0 && unicornItem.sheet.xp.skills.magic.Illusion > 0 && unicornItem.sheet.xp.stats["Réserve de mana"] > 0,
  "son sort, l'Illusion et la Réserve de mana gagnent de l'XP, sur sa fiche à elle");
assert.ok(unicornItem.sheet.spells[0].mastery > 1, "son sort progresse");
delete unicornItem.recovery;
campaign.advanceTime(state, 1);
assert.ok(unicornItem.sheet.mana > 23, "au camp, elle recharge son mana comme un mercenaire : " + unicornItem.sheet.mana);
unicornItem.sheet.mana = 30;
unicornItem.sheet.stats.Vitesse = 120;
m = newMission([rider], foes(1));
assert.equal(api.missionMagic().currentMana(m.players[0].mount), 30, "elle part avec son mana");
assert.equal(m.players[0].mount.character.stats.Vitesse, 120, "et ses progrès");
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
// Rentrer vivant avec elle (Idan : « 50 XP oui ») : Équidés et Compagnon animal, s'il survit lui aussi.
m.aftermath = {results: [{id: rider.id, name: rider.name, dead: false}]};
const equides = Number(rider.skills.animal["Équidés"]) || 0;
after = api.settleOwnMissionMounts(m);
assert.deepEqual(m.mountReturns, [{id: rider.id, family: "Équidés", xp: 100}], "+100 XP au retour (50, doublé après le bêta-test)");
assert.ok(Number(rider.skills.animal["Équidés"]) > equides, "ses Équidés montent : " + equides + " → " + rider.skills.animal["Équidés"]);
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

console.log("Nos mercenaires à cheval : monture apprivoisée et équipée, règles du Cavalier, le cheval monté attaque dans l'activation de son cavalier (bouton, sorts), l'XP animale du cavalier, le double de la licorne, son mana et son XP, cheval seul dans notre ordre du tour, mort / blessure / fatigue en fin de combat, repos, l'enclos si le cavalier meurt — OK");
