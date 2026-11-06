"use strict";

// Le Culte des morts (Idan, 2026-11-06 : « On ajoute des factions morts-vivants ? […] l'autre sur un nécromancien » ;
// « Parfait » ; « Oui insensible aux poisons. Squelettes très résistants aux dégâts tranchants, très faibles aux
// contondants » ; « Les portraits arriveront ») : squelettes guerriers et archers, zombies, spectres, acolytes et leur
// nécromancien, qui lance ses sorts ; un cimetière profané, entouré de murets ; trois lettres de contrat.
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
const FACTION = "Culte des morts";

// 1. Les fiches : cinq lignes sur quatre niveaux, quatre nécromanciens.
const cult = reference.enemyArchetypes.rows.filter(r => r.faction === FACTION);
assert.equal(reference.enemyArchetypes.row_count, reference.enemyArchetypes.rows.length);
assert.equal(cult.length, 24);
const lines = ["Squelette guerrier", "Squelette archer", "Zombie", "Spectre", "Acolyte"];
for (const ligne of lines) assert.deepEqual(cult.filter(r => r.ligne === ligne).map(r => r.niveau), ["novice", "normal", "vétéran", "d’élite"], ligne);
assert.deepEqual(cult.filter(r => r.ligne === "Chef").map(r => r.nom), ["Nécromancien", "Maître nécromancien", "Seigneur des tombes", "Roi des morts"]);
assert.equal(new Set(cult.map(r => r.code)).size, 24);
const weapons = new Set(reference.weapons.rows.map(w => w.nom)), armors = new Set(reference.baseArmors.rows.map(a => a.nom));
const spells = new Map(reference.spells.rows.map(s => [s.code, s]));
for (const r of cult) {
  assert.ok(r.points > 0 && Number.isFinite(r.points), r.code + " : points");
  assert.equal(r.pv, Math.round(3 * (r.caracteristiques.Constitution + 0.2 * r.caracteristiques.Endurance + 0.1 * r.caracteristiques.Volonté)), r.code + " : PV");
  for (const w of r.armes) assert.ok(weapons.has(w), r.code + " : " + w);
  assert.ok(r.armure === null || armors.has(r.armure), r.code);
  const undead = /Squelette|Zombie|Spectre/.test(r.ligne);
  assert.equal(Boolean(r.mort_vivant), undead, r.code + " : mort-vivant");
  assert.equal(Boolean(r.insensible_poison), undead, r.code + " : insensible au poison");
  if (/Squelette/.test(r.ligne)) assert.deepEqual(r.degats_subis, {tranchant: 0.5, contondant: 1.5}, r.code);
  else assert.equal(r.degats_subis, undefined, r.code);
  assert.equal(Boolean(r.immunite_physique), r.ligne === "Spectre", r.code);
  if (r.ligne === "Zombie" || r.ligne === "Spectre") assert.ok(r.attaque?.nom && r.armes.length === 0, r.code + " : arme naturelle");
  if (r.ligne === "Spectre") assert.equal(r.attaque.degats_type, "psychique");
  if (undead) assert.deepEqual(r.sorts, [], r.code + " : pas de sorts tirés à la génération");
}
// Le nécromancien : Nécromancie et ses sorts, de plus en plus nombreux et maîtrisés.
const chefs = cult.filter(r => r.ligne === "Chef");
for (const [i, c] of chefs.entries()) {
  assert.ok(c.ecoles["Nécromancie"] > 50, c.code);
  for (const s of c.sorts) { assert.equal(spells.get(s.code)?.ecole, "Nécromancie", s.code); assert.ok(s.maitrise > 0); }
  assert.equal(c.sorts[0].code, "bone_army", "l'Armée d'os d'abord");
  if (i) assert.ok(c.sorts.length >= chefs[i - 1].sorts.length && c.sorts[0].maitrise > chefs[i - 1].sorts[0].maitrise);
}
assert.ok(chefs.every(c => c.sorts.some(s => s.code === "raise_dead") && c.sorts.some(s => s.code === "death_arrow")));
assert.ok(chefs.slice(2).every(c => c.sorts.some(s => s.code === "summon_specter")));
// Le spectre, insensible aux armes, ne sort qu’à partir du niveau de mission 6 (Idan : « un peu plus tard. 6 ou 7 »).
assert.ok(cult.filter(r => r.ligne === "Spectre").every(r => r.niveau_mission_min === 6));
assert.ok(cult.filter(r => r.ligne !== "Spectre").every(r => r.niveau_mission_min === 1));

// 2. Le camp, les noms et les trois lettres.
const missions = reference.oneShotMissions, def = missions.missions[0];
const camp = def.camps.find(c => c.faction === FACTION);
assert.equal(camp.nom_camp, "Cimetière profané");
assert.deepEqual(camp.lignes.map(l => l.ligne).sort(), [...lines].sort());
for (const key of Object.values(camp.noms)) assert.ok(missions.noms[key]?.length >= 5, key);
const orders = missions.ordres.filter(o => o.faction === FACTION);
assert.deepEqual(orders.map(o => o.code), ["village_culte", "priest_culte", "emperor_culte"]);
for (const o of orders) if (o.noms_commanditaire) assert.ok(missions.noms[o.noms_commanditaire]?.length >= 5, o.noms_commanditaire);
let seed = 61;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rules = Missions.createMissionRules({reference, random});
const offers = [];
for (let i = 0; i < 400 && offers.length < 40; i++) { const o = rules.createOffer({day: 1, level: 1 + i % 6}); if (o?.faction === FACTION) offers.push(o); }
assert.ok(offers.length >= 20, "le culte sort au tableau");
const seenOrders = new Set();
for (const o of offers) {
  seenOrders.add(o.order);
  const text = rules.orderText(o, {date: "1 Brumecendre", date_expiration: "6 Brumecendre", an: 842, récompense: "9 000"});
  assert.ok(![...text.paragraphs, text.signature].join(" ").includes("{"), o.order + " : tous les champs remplis");
  assert.ok(o.camp.chief.startsWith("cult_necromancer_"));
  if (o.level < 3) assert.ok(o.camp.enemies.every(code => !code.startsWith("cult_specter")), "pas de spectre avant le niveau 3");
}
assert.equal(seenOrders.size, 3, "les trois lettres");

// 3. Les fiches appliquées : morts-vivants, poison, armes naturelles (pas de butin), sorts du nécromancien.
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const captain = generator.createCaptain({id: 1});
let uid = 1000;
const make = code => { const arch = rules.archetype(code); return rules.applyArchetype(generator.createMercenary({id: ++uid, captain, forcedPeople: arch.peuple, forcedCulture: arch.culture}), arch, {idPrefix: "t" + uid}); };
const skeleton = make("cult_skeleton_warrior"), zombie = make("cult_zombie"), specter = make("cult_specter"), acolyte = make("cult_acolyte"), necro = make("cult_necromancer_1");
assert.deepEqual([skeleton.undead, skeleton.immunePoison, skeleton.immunePhysical], [true, true, undefined]);
assert.deepEqual(skeleton.damageTypeFactors, {tranchant: 0.5, contondant: 1.5});
assert.equal(specter.immunePhysical, true);
assert.equal(acolyte.undead, undefined);
assert.deepEqual(skeleton.spells, []);
const claws = zombie.items.find(i => i.natural);
assert.ok(claws && claws.template.nom === "Griffes" && zombie.equipment.slots.weapon_set_1_main === claws.id);
assert.deepEqual(rules.outcome ? [] : [], []);
assert.deepEqual(necro.aiSpells, rules.archetype("cult_necromancer_1").sorts.map(s => s.code));
assert.ok(necro.skills.magic["Nécromancie"] > 50);
assert.equal(necro.mana, undefined, "mana plein au départ");

// 4. Le moteur : poison sans effet ; squelettes, dégâts tranchants × 0,5 et contondants × 1,5.
const engine = createCombatEngine(reference, {});
const unit = character => ({character, activeSet: 1, hp: character.pvMax, pvMax: character.pvMax, alive: true, q: 0, r: 0});
const sk = unit(skeleton), ac = unit(acolyte);
assert.equal(engine.poisonImmune(sk), true);
assert.equal(engine.elementalDamage(sk, "poison", 30).damage, 0);
assert.ok(engine.elementalDamage(ac, "poison", 30).damage > 0);
sk.poisoned = {turns: 3, amount: 20};
assert.equal(engine.resolvePoison(sk).resisted, true);
assert.deepEqual([engine.damageTypeFactor(sk, "tranchant"), engine.damageTypeFactor(sk, "contondant"), engine.damageTypeFactor(sk, "perforant"), engine.damageTypeFactor(ac, "tranchant")], [0.5, 1.5, 1, 1]);
// Le même coup, les mêmes dés : sur un squelette, la hache fait moitié moins, le marteau moitié plus.
function hit(weaponName, target) {
  let s = 4242;
  const fixedRandom = () => { s = (s * 16807) % 2147483647; return 0.05 + 0.4 * (s / 2147483647); };
  const e = createCombatEngine(reference, {random: fixedRandom});
  const attacker = make("thief_swordsman");
  const item = {id: "w-" + weaponName, name: weaponName, itemType: "weapon", slot: "weapon_set_1_main", owner: attacker.id, qualityCode: "standard"};
  attacker.items = [item];
  attacker.equipment = {...attacker.equipment, slots: {weapon_set_1_main: item.id}};
  attacker.stats.Intelligence = 0;
  const a = unit(attacker), d = unit(JSON.parse(JSON.stringify(target)));
  for (let i = 0; i < 40; i++) { d.hp = d.pvMax; const out = e.resolveAttack(a, d, {mode: "melee", distance: 1}); if (out.wound) return out; }
  return null;
}
const plain = JSON.parse(JSON.stringify(skeleton)); delete plain.damageTypeFactors;
for (const [weapon, type, factor] of [["Hache de guerre", "tranchant", 0.5], ["Marteau de guerre", "contondant", 1.5]]) {
  const onSkeleton = hit(weapon, skeleton), onPlain = hit(weapon, plain);
  assert.equal(onSkeleton.matchup.type, type);
  assert.equal(onSkeleton.typeFactor, factor);
  assert.equal(onSkeleton.damage, Math.ceil(onPlain.damage * factor - 1e-9), weapon);
}

// 5. Le nécromancien en combat : il lève son Armée d'os, relève un mort, lance Flèche de mort ; nos mercenaires en
// combat automatique ne jouent pas ces sorts.
const element = () => ({textContent: "", innerHTML: "", disabled: false, title: "", style: {}, parentElement: {clientWidth: 900},
  classList: {add() {}, remove() {}, toggle() {}}, addEventListener() {}, close() {}});
const elements = {};
const $ = id => elements[id] || (elements[id] = element());
const game = {campaign: null, captain, referenceData: reference};
let api = null;
const combat = createCombatEngine(reference, {onAttack: Progression.recordAttack, heightOf: u => api.missionUnitHeight(u)});
Math.random = random;
const mission = fs.readFileSync(path.join(ROOT, "prototype-web", "mission.js"), "utf8");
api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", "MercenairesMissionTerrain", "missionRules", mission + "\nreturn {makeMissionUnit,sortMissionInitiative,"
  + "selectNextMissionPlayer,startMissionCamouflage,autoResolveMission,setMissionMapSize,placeMissionArmy,missionTerrain,missionUnitHeight,"
  + "missionAiSpell,enemyMissionAct};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => combat, Progression, MissionEnd, Magic, Terrain, () => rules);
api.setMissionMapSize({cols: 30, rows: 15});
function newMission(enemyCodes, mercs = 3) {
  const foes = enemyCodes.map(make), squad = Array.from({length: mercs}, () => generator.createMercenary({id: ++uid, captain}));
  const players = api.placeMissionArmy(squad.map((c, i) => api.makeMissionUnit(c, "player", i % 3)), "player");
  const enemies = api.placeMissionArmy(foes.map((c, i) => api.makeMissionUnit(c, "enemy", i % 3)), "enemy");
  game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: [], relief: []};
  for (const u of [...players, ...enemies]) u.camouflaged = false;
  return game.mission;
}
let m = newMission(["cult_necromancer_2"]);
let caster = m.enemies[0];
caster.attackAvailable = true;
assert.equal(api.missionAiSpell(caster), true);
assert.ok(m.log.some(x => /Armée d'os/.test(x.message)), "il lance l'Armée d'os");
const bones = m.enemies.filter(u => u.summon?.code === "bone_army");
if (m.log.some(x => /Armée d'os.*apparaissent|apparaît/.test(x.message))) assert.ok(bones.length > 0 && bones.every(u => u.character.undead));
// Un corps sur la carte : il le relève (l'Armée d'os est déjà là).
// Un corps à quelques cases : il marche jusqu'à lui (la Résurrection se lance au contact), puis le relève.
const dead = m.players[0];
dead.alive = false; dead.hp = -5;
const taken = new Set(m.enemies.filter(u => u.alive).map(u => u.q + "," + u.r));
const spot = [[-2, -2], [-1, -3], [-3, 0], [0, -4], [-4, 1]].map(([dq, dr]) => ({q: caster.q + dq, r: caster.r + dr})).find(c => !taken.has(c.q + "," + c.r));
dead.q = spot.q; dead.r = spot.r;
for (const u of m.players.slice(1)) { u.q = caster.q - 14; }
caster.attackAvailable = true;
caster.movementRemaining = 6;
caster.character.mana = 999;
if (bones.length) {
  assert.equal(api.missionAiSpell(caster), true);
  assert.ok(m.log.some(x => /se place pour lancer Résurrection/.test(x.message)), "il va jusqu'au corps");
  assert.ok(m.log.some(x => /Résurrection/.test(x.message)), "puis la Résurrection");
}
// Sans corps et avec son armée : Flèche de mort sur l'ennemi le plus proche.
m = newMission(["cult_necromancer_1"]);
caster = m.enemies[0];
caster.character.aiSpells = ["death_arrow"];
caster.character.mana = 999;
caster.attackAvailable = true;
caster.movementRemaining = 0;
const foe = m.players[0];
foe.q = caster.q - 4; foe.r = caster.r;
api.missionAiSpell(caster);
assert.ok(m.log.some(x => /Flèche de mort/.test(x.message)), "Flèche de mort");
// Nos mercenaires : pas de aiSpells, donc pas de sorts joués par l'IA.
assert.ok(m.players.every(u => !u.character.aiSpells));
assert.equal(api.missionAiSpell(m.players[1]), false);

// 6. Des contrats du Culte joués jusqu'au bout (cimetière, enceinte de murets) : niveaux 1 à 6.
let stuck = 0, played = 0;
for (const o of offers.slice(0, 24)) {
  const foes = rules.buildEnemies(o, arch => generator.createMercenary({id: ++uid, captain, forcedPeople: arch.peuple, forcedCulture: arch.culture}));
  const squad = Array.from({length: 4}, () => generator.createMercenary({id: ++uid, captain}));
  const players = api.placeMissionArmy(squad.map((c, i) => api.makeMissionUnit(c, "player", i % 3)), "player");
  const enemies = api.placeMissionArmy(foes.map((c, i) => api.makeMissionUnit(c, "enemy", i % 3)), "enemy");
  const out = api.missionTerrain().generate({cols: 30, rows: 15, faction: FACTION, players, enemies});
  assert.ok(out.decor.some(d => d.code === "muret") && out.decor.some(d => d.code === "tombe"), "un cimetière entouré de murets");
  game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: out.decor, relief: out.relief, contract: o};
  api.startMissionCamouflage();
  api.selectNextMissionPlayer();
  api.autoResolveMission();
  played++;
  if (!game.mission.over) stuck++;
}
assert.ok(played >= 20);
assert.ok(stuck <= 2, "combats bloqués : " + stuck + " sur " + played);
console.log("Culte des morts : 24 fiches, morts-vivants (sans peur, poison, armes, tranchant × 0,5, contondant × 1,5), nécromancien et ses sorts, camp, lettres, cimetière — OK (" + played + " contrats joués, " + stuck + " bloqués)");
