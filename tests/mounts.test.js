"use strict";

// Combat à cheval (Idan, 2026-11-07 ; doc 04, « Combat à cheval ») : le destrier (une fiche fixe, mounts.json), le Cavalier des
// voleurs (4 niveaux, poids 10 au camp), la taille du couple, le déplacement du cheval, le Courage et la Volonté partagés,
// le cavalier plus haut au corps à corps, la charge avec la Force du cheval, le jet du tir (cheval ou cavalier), la zone qui
// touche les deux, le cheval tombé (le cavalier au sol), le cavalier tombé (le cheval seul se bat), « Viser le cheval ».
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createGenerator} = require("../game-core/mercenary-generator.js");
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
const constant = code => reference.formulaConstants.rows.find(r => r.code === code)?.valeur;

// 1. Les données.
assert.equal(files.mounts, "mounts.json", "les montures sont chargées");
assert.equal(reference.mounts.row_count, reference.mounts.rows.length);
const destrier = reference.mounts.rows.find(r => r.code === "destrier");
assert.ok(destrier, "le destrier");
assert.deepEqual([destrier.gabarit, destrier.taille, destrier.espece, destrier.capturable], [2, "longue", "Équidés", true]);
assert.deepEqual(
  ["Force", "Constitution", "Dextérité", "Vitesse", "Endurance", "Esquive", "Courage", "Volonté", "Perception", "Intelligence"].map(k => destrier.caracteristiques[k]),
  [90, 70, 30, 90, 85, 20, 35, 30, 60, 10], "les caractéristiques validées par Idan");
assert.deepEqual(destrier.attaque, {nom: "Sabots", degats_pv_base: "1D8", puissance_contondante: 50});
const riders = reference.enemyArchetypes.rows.filter(r => r.ligne === "Cavalier");
assert.deepEqual(riders.map(r => r.code), ["thief_rider_novice", "thief_rider", "thief_rider_veteran", "thief_rider_elite"]);
for (const r of riders) {
  assert.equal(r.faction, "Voleurs");
  assert.equal(r.monture, "destrier");
  assert.deepEqual(r.armes, ["Lance", "Rondache"]);
  assert.ok(r.competences_animales["Compagnon animal"] > 0 && r.competences_animales["Équidés"] > 0);
  assert.ok(Number(r.points) > 0, r.code + " : des points mesurés");
}
const thieves = reference.oneShotMissions.missions[0].camps.find(c => c.faction === "Voleurs");
assert.deepEqual(thieves.lignes.find(l => l.ligne === "Cavalier"), {ligne: "Cavalier", poids: 10}, "le Cavalier, poids 10 au camp des voleurs");
assert.deepEqual(["combat.monture.hauteur_cac", "combat.monture.force_charge", "combat.monture.partage_diviseur"].map(constant), [1, 0.5, 100]);
assert.equal(reference.formulaConstants.row_count, reference.formulaConstants.rows.length);

// 2. Le moteur.
let seed = 53;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
Math.random = random;
const rules = Missions.createMissionRules({reference, random});
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const captain = generator.createCaptain({id: 1});
let uid = 2000;
const engine = createCombatEngine(reference, {});
const horseChar = rules.createMount("destrier", {id: "h1", name: "Destrier"});
assert.equal(horseChar.taille, "longue");
assert.equal(engine.maxHp({character: horseChar, activeSet: 1}), 270, "270 PV, la formule de nos mercenaires");
assert.equal(engine.movementBase({character: horseChar, activeSet: 1}), 8, "8 cases de déplacement");
const human = generator.createMercenary({id: ++uid, captain, forcedPeople: "Humain"});
const ogre = generator.createMercenary({id: ++uid, captain, forcedPeople: "Ogre"});
const goblin = generator.createMercenary({id: ++uid, captain, forcedPeople: "Gobelin"});
assert.equal(engine.canRide({character: human}, {character: horseChar}), true, "un humain (1) monte un destrier (2)");
assert.equal(engine.canRide({character: goblin}, {character: horseChar}), true);
assert.equal(engine.canRide({character: ogre}, {character: horseChar}), false, "un ogre (2) ne peut pas");
const foot0 = () => ({character: generator.createMercenary({id: 777777, captain, forcedPeople: "Humain"}), q: 1, r: 1, alive: true, activeSet: 1, team: "player"});
const pair = (character, skills = {}) => {
  character.skills.animal = {...character.skills.animal, ...skills};
  const rider = {character, q: 5, r: 5, facing: 3, alive: true, activeSet: 1, team: "enemy"};
  const horse = {character: horseChar, q: 5, r: 5, facing: 3, alive: true, activeSet: 1, team: "enemy", rider};
  rider.mount = horse;
  return rider;
};
const rider = pair(human, {"Compagnon animal": 30, "Équidés": 20});
assert.equal(engine.sizeOf(rider), "longue", "le couple a la taille du cheval");
assert.equal(engine.footprint(rider).length, 2);
assert.equal(engine.movementBase(rider), 8, "c'est le cheval qui marche");
assert.equal(engine.riderShare(rider), 0.5, "part = (Compagnon animal + Équidés) ÷ 100");
human.stats.Courage = 60;
assert.equal(engine.mentalStat(rider, "Courage"), 47.5, "cheval 35 + (cavalier 60 − 35) × 0,5");
assert.equal(engine.mentalStat(rider, "Force"), engine.statWithGear(rider, "Force"), "seuls le Courage et la Volonté se partagent");
human.skills.animal["Compagnon animal"] = 90;
assert.equal(engine.riderShare(rider), 1, "au plus 1");
assert.equal(engine.mentalStat(rider, "Courage"), 60);
assert.equal(Math.round(engine.mountHitChance(rider) * 10) / 10, 66.7, "humain sur destrier : 2 ÷ 3 pour le cheval");
assert.equal(engine.mountHitChance(pair(goblin)), 80, "gobelin sur destrier : 2 ÷ 2,5");
assert.equal(engine.pairOf(rider.mount), rider, "un cheval monté répond par son cavalier");
assert.equal(engine.threatens(rider.mount, {q: 4, r: 5}), true, "monté, le cheval menace aussi, de ses sabots (Idan : « oui »)");
// Une fiche complète, comme un mercenaire (Idan : « la monture doit avoir une fiche complète comme les mercenaires. Les ennemis
// également » ; « Parfait ») ; la Discrétion d'un couple est la plus basse des deux (« Dur de se camoufler sur un dragon »).
assert.deepEqual(["Charisme", "Puissance magique", "Réserve de mana"].map(k => horseChar.stats[k]), [30, 0, 0]);
assert.deepEqual([horseChar.skills.martial["Discrétion"], horseChar.skills.social.Intimidation, horseChar.skills.physiology["Vision nocturne"]], [10, 40, false]);
assert.deepEqual(Object.keys(horseChar.skills).sort(), ["animal", "camp", "craft", "magic", "martial", "physiology", "social", "technique"]);
const unicornChar = rules.createMount("licorne", {id: "u1"});
assert.deepEqual([unicornChar.stats.Charisme, unicornChar.stats["Puissance magique"], unicornChar.stats["Réserve de mana"], unicornChar.skills.social.Intimidation], [70, 50, 40, 20]);
human.skills.martial["Discrétion"] = 35;
assert.equal(engine.stealthOf(rider), 10, "à cheval : la plus basse des deux");
assert.equal(engine.stealthOf({...rider, mount: null}), engine.statWithGear({...rider, mount: null}, "Discrétion"), "à pied : la sienne");
assert.ok(engine.detectionChance(foot0(), rider, 3) > engine.detectionChance(foot0(), {...rider, mount: null}, 3), "plus facile à repérer à cheval");
// L'Intimidation d'un couple : la plus haute des deux (Idan : « Le gobelin sur le dragon... Bah, c'est pas l'intimidation du
// Gobelin qui compte ! »).
human.skills.social = {...human.skills.social, Intimidation: 10};
assert.equal(engine.intimidation(rider), 40, "celle du destrier");
assert.equal(engine.intimidation(rider.mount), 40, "le cheval monté répond pour le couple");
human.skills.social.Intimidation = 65;
assert.equal(engine.intimidation(rider), 65, "celle du cavalier");
assert.equal(engine.intimidation({...rider, mount: null}), 65, "à pied : la sienne");
// Au corps à corps, le cavalier compte comme un niveau plus haut (rien contre le cheval).
const foot = {character: generator.createMercenary({id: ++uid, captain, forcedPeople: "Humain"}), q: 3, r: 5, alive: true, activeSet: 1, team: "player"};
const alone = {...rider, mount: null};
const delta = (a, d) => engine.hitProbability(a, d, "melee", 1);
const logistic = p => -20 * Math.log(80 / (p - 10) - 1);
assert.ok(Math.abs(logistic(delta(rider, foot)) - logistic(delta(alone, foot)) - 10) < 0.01, "+10 pour le cavalier contre un fantassin");
assert.ok(Math.abs(logistic(delta(foot, alone)) - logistic(delta(foot, rider)) - 10) < 0.01, "−10 pour le fantassin contre le cavalier");
assert.equal(delta(foot, rider.mount), delta(foot, {...rider.mount, rider: null}), "rien contre le cheval");
// Charge : la moitié de la Force du cheval s'ajoute à celle du cavalier.
assert.equal(engine.mountChargeForce(rider, 10), 45);
assert.equal(engine.mountChargeForce(rider, 0), 0, "seulement en charge");
const dmg = (a, power) => engine.physicalDamage(a, foot, "melee", power, {roll: "max", resistanceRoll: 1}).damage;
human.items = [{id: "l", name: "Lance", itemType: "weapon"}];
human.equipment = {slots: {weapon_set_1_main: "l"}};
assert.ok(dmg(rider, 10) > dmg(alone, 10), "la charge à cheval frappe plus fort");
assert.equal(dmg(rider, 0), dmg(alone, 0), "hors charge, rien de plus");
// Courage : un coup qui blesse le cheval fait tester le couple, par son cavalier.
const courage = engine.resolveCourage(foot, rider.mount, {ok: true, mode: "melee", wound: true}, {units: []});
assert.equal(courage.subject, rider);

// 3. L'écran de combat (mission.js, comme les autres tests).
const element = () => ({textContent: "", innerHTML: "", disabled: false, title: "", style: {}, parentElement: {clientWidth: 900},
  classList: {add() {}, remove() {}, toggle() {}}, addEventListener() {}, close() {}});
const elements = {};
const $ = id => elements[id] || (elements[id] = element());
const game = {campaign: null, captain, referenceData: reference};
let api = null;
const combat = createCombatEngine(reference, {onAttack: Progression.recordAttack, gridMap: () => api.missionGridMap()});
const mission = fs.readFileSync(path.join(ROOT, "prototype-web", "mission.js"), "utf8");
api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", "missionRules", mission + "\nreturn {makeMissionUnit,sortMissionInitiative,selectNextMissionPlayer,"
  + "startMissionCamouflage,autoResolveMission,setMissionMapSize,placeMissionArmy,missionGridMap,missionUnits,missionUnitAtCell,"
  + "missionUnitsWithMounts,settleMissionMounts,missionAimed,performMissionAttack,checkMissionEnd,missionChargeIfClear,performMissionCharge};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => combat, Progression, MissionEnd, Magic, () => rules);
api.setMissionMapSize({cols: 30, rows: 15});
const cavalier = (code = "thief_rider", people = "Humain") => {
  const arch = rules.archetype(code);
  return rules.applyArchetype(generator.createMercenary({id: ++uid, captain, forcedPeople: people, forcedCulture: people === "Humain" ? arch.culture : undefined}), arch, {idPrefix: "c" + uid, name: arch.nom});
};
function newMission(foes, mercs = 3) {
  const squad = Array.from({length: mercs}, () => generator.createMercenary({id: ++uid, captain}));
  const players = api.placeMissionArmy(squad.map((c, i) => api.makeMissionUnit(c, "player", i % 3)), "player");
  const enemies = api.placeMissionArmy(foes.map((c, i) => api.makeMissionUnit(c, "enemy", i % 3)), "enemy");
  game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: []};
  for (const u of [...players, ...enemies]) u.camouflaged = false;
  return game.mission;
}

// Le Cavalier part à cheval ; le cheval, sous lui, reste hors des listes du combat.
let m = newMission([cavalier()]);
let r = m.enemies[0];
assert.ok(r.mount, "le Cavalier a son destrier");
assert.equal(r.mount.rider, r);
assert.equal(r.mount.character.name, "Destrier de Cavalier");
assert.equal(r.mount.pvMax, 270);
assert.deepEqual([r.mount.q, r.mount.r, r.mount.facing], [r.q, r.r, r.facing], "le cheval est sous son cavalier");
assert.equal(combat.footprint(r).length, 2, "deux cases");
assert.ok(!api.missionUnits().includes(r.mount), "hors des listes tant qu'il est monté");
for (const c of combat.footprint(r)) assert.equal(api.missionUnitAtCell(c.q, c.r), r, "chacune de ses cases désigne le cavalier");
assert.ok(api.missionUnitsWithMounts().includes(r.mount), "une zone touche aussi le cheval");
r.q -= 1;
assert.equal(r.mount.q, r.q, "le cheval suit son cavalier");
// Un ogre ne monte pas un destrier.
m = newMission([cavalier("thief_rider", "Ogre")]);
assert.ok(!m.enemies[0].mount, "un ogre reste à pied");
assert.equal(combat.sizeOf(m.enemies[0]), "normale");

// « Viser le cheval » : au corps à corps, le coup va au cheval.
m = newMission([cavalier()]);
r = m.enemies[0];
assert.equal(api.missionAimed(r), r, "par défaut, le cavalier");
m.aimMount = true;
assert.equal(api.missionAimed(r), r.mount, "« Viser le cheval »");
m.aimMount = false;

// Tir : un jet décide qui prend le tir.
m = newMission([cavalier()]);
r = m.enemies[0];
const shooter = m.players.find(p => combat.isRangedWeapon(combat.weaponTemplate(combat.activeWeaponItem(p)))) || m.players[0];
let horseShots = 0, shots = 0;
for (let i = 0; i < 60; i++) {
  const shot = combat.rollShotTarget(r);
  shots++;
  if (shot.target === r.mount) horseShots++;
}
assert.ok(horseShots > shots * 0.45 && horseShots < shots * 0.9, "le cheval prend environ deux tirs sur trois : " + horseShots + "/" + shots);
void shooter;

// Le cheval tombe : le cavalier tombe au sol et continue à pied ; le cheval entre dans les listes (pour la capture).
m = newMission([cavalier()]);
r = m.enemies[0];
const horse = r.mount;
horse.hp = -5; horse.alive = false;
api.checkMissionEnd();
assert.equal(r.mount, null, "plus de monture");
assert.equal(r.prone, true, "le cavalier est au sol");
assert.equal(combat.sizeOf(r), "normale", "à pied, une case");
assert.ok(m.enemies.includes(horse) && !horse.alive, "le cheval tombé reste sur la carte");
assert.ok(m.log.some(l => /s’effondre : Cavalier tombe au sol/.test(l.message)));
assert.equal(Number.isFinite(horse.q) && Number.isFinite(horse.r), true, "le cheval garde sa place");

// Le cavalier tombe : le cheval reste seul, se bat et fuit comme tout combattant.
m = newMission([cavalier()]);
r = m.enemies[0];
const lone = r.mount;
r.hp = -5; r.alive = false;
api.checkMissionEnd();
assert.equal(m.over, false, "le cheval tient encore le terrain");
assert.ok(m.enemies.includes(lone) && lone.alive && !lone.rider, "le cheval seul");
assert.ok(m.enemyOrder.includes(lone), "il prend sa place dans l'ordre du tour");
assert.equal(combat.threatens(lone, {q: lone.q - 1, r: lone.r}), true, "seul, il menace avec ses sabots");
assert.ok(m.log.some(l => /se retrouve sans cavalier/.test(l.message)));

// Le cavalier sort de la carte : le cheval est parti avec lui.
m = newMission([cavalier()]);
r = m.enemies[0];
const gone = r.mount;
r.alive = false; r.offMap = true;
api.checkMissionEnd();
assert.ok(gone.offMap && !gone.alive, "parti avec son cavalier");
assert.equal(m.over, true);

// Des combats entiers, sans erreur : le couple charge, le cheval prend des tirs, chacun finit.
let charges = 0, horseHits = 0, alones = 0, over = 0, horseCharges = 0;
for (let i = 0; i < 12; i++) {
  m = newMission([cavalier(["thief_rider_novice", "thief_rider", "thief_rider_veteran", "thief_rider_elite"][i % 4])], 3);
  api.startMissionCamouflage(); api.selectNextMissionPlayer(); api.autoResolveMission();
  if (m.over) over++;
  charges += m.log.filter(l => /^Cavalier.* charge /.test(l.message)).length;
  horseHits += m.log.filter(l => / attaque Destrier de /.test(l.message)).length;
  horseCharges += m.log.filter(l => /^Destrier de Cavalier.* charge /.test(l.message)).length;
  alones += m.log.filter(l => /se retrouve sans cavalier/.test(l.message)).length;
}
assert.equal(over, 12, "chaque combat se termine");
assert.ok(charges > 0, "le cavalier charge : " + charges);
assert.ok(horseHits > 0, "le cheval prend des coups : " + horseHits);
// Le cheval frappe aussi en charge (Idan : « La monture frappe également ») : une charge en ligne droite sur une cible qui
// tient (sans peur, beaucoup de PV) ; le cheval frappe juste après son cavalier. Cases carrées : les charges suivent une
// colonne ou une ligne, plus rares en combat entier, d'où une scène fixe.
for (let i = 0; i < 10 && !horseCharges; i++) {
  m = newMission([cavalier()], 1);
  const rider = m.enemies[0], foe = m.players[0];
  for (const u of [rider, rider.mount]) Object.assign(u, {q: 18, r: 7, facing: 2, attackAvailable: true});
  Object.assign(foe, {q: 6, r: 7, hp: 5000, frenzy: true});
  const charge = api.missionChargeIfClear(rider, foe);
  assert.ok(charge, "une charge en ligne droite");
  api.performMissionCharge(rider, foe, charge);
  horseCharges += m.log.filter(l => /^Destrier de Cavalier.* charge /.test(l.message)).length;
}
assert.ok(horseCharges > 0, "le cheval frappe aussi en charge (Idan : « La monture frappe également ») : " + horseCharges);

console.log(JSON.stringify({ok: true, destrier: {pv: 270, deplacement: 8}, combats: over, charges, coupsSurLeCheval: horseHits, chevauxSeuls: alones}, null, 2));
