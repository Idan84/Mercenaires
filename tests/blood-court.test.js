"use strict";

// La Cour de sang (Idan, 2026-11-06 : « l'autre plutôt basée sur un vampire comme capitaine » ; « Ajoute aussi des
// chauves-souris. Elles volent donc ignorent les pénalités de mouvement ! » ; « Elles survolent tout » ; « les vampires et
// rejetons sont très classe et dandy, pas bête sauvage. C'est plutôt estoc, drain de vie, sort d'illusions » ; « murs ok ») :
// gardes de sang, rejetons, arbalétriers asservis, goules, loups et chauves-souris, et leur vampire, qui régénère et lance
// ses sorts ; un château en ruine, sur un plateau, entouré de murs ; trois lettres de contrat.
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
const FACTION = "Cour de sang";

// 1. Les fiches : six lignes sur quatre niveaux, quatre vampires.
const court = reference.enemyArchetypes.rows.filter(r => r.faction === FACTION);
assert.equal(court.length, 28);
const lines = ["Garde de sang", "Rejeton", "Arbalétrier asservi", "Goule", "Loup", "Chauve-souris"];
for (const ligne of lines) assert.deepEqual(court.filter(r => r.ligne === ligne).map(r => r.niveau), ["novice", "normal", "vétéran", "d’élite"], ligne);
const chiefs = court.filter(r => r.ligne === "Chef");
assert.deepEqual(chiefs.map(r => r.nom), ["Vampire", "Seigneur vampire", "Comte de sang", "Prince de la nuit"]);
assert.equal(new Set(court.map(r => r.code)).size, 28);
const weapons = new Set(reference.weapons.rows.map(w => w.nom)), armors = new Set(reference.baseArmors.rows.map(a => a.nom));
const spells = new Map(reference.spells.rows.map(s => [s.code, s]));
for (const r of court) {
  assert.ok(r.points > 0 && Number.isFinite(r.points), r.code + " : points");
  assert.equal(r.pv, Math.round(3 * (r.caracteristiques.Constitution + 0.2 * r.caracteristiques.Endurance + 0.1 * r.caracteristiques.Volonté)), r.code + " : PV");
  for (const w of r.armes) assert.ok(weapons.has(w), r.code + " : " + w);
  assert.ok(r.armure === null || armors.has(r.armure), r.code);
  const undead = ["Rejeton", "Goule", "Chef"].includes(r.ligne);
  assert.equal(Boolean(r.mort_vivant), undead, r.code + " : mort-vivant");
  assert.equal(Boolean(r.insensible_poison), undead, r.code + " : insensible au poison");
  assert.equal(Boolean(r.vol), r.ligne === "Chauve-souris", r.code + " : vol");
  if (["Goule", "Loup", "Chauve-souris"].includes(r.ligne)) assert.ok(r.attaque?.nom && r.armes.length === 0, r.code + " : arme naturelle");
  // Dandys : l'Estoc seul, le Drain de vie et l'Illusion.
  if (["Rejeton", "Chef"].includes(r.ligne)) {
    assert.deepEqual(r.armes, ["Estoc"], r.code);
    assert.ok(r.competences_martiales["Combat à une main"] > 0, r.code + " : combat à une main");
    assert.equal(r.sorts[0].code, "life_drain", r.code + " : le Drain de vie d'abord");
    for (const s of r.sorts) assert.ok(["Nécromancie", "Illusion"].includes(spells.get(s.code)?.ecole), s.code);
    assert.ok(r.sorts.slice(1).every(s => spells.get(s.code).ecole === "Illusion"), r.code + " : puis l'Illusion");
  }
}
assert.deepEqual(chiefs.map(c => c.regeneration), [50, 75, 100, 150], "Régénération du vampire");
assert.deepEqual(chiefs.map(c => c.sorts[0].maitrise), [65, 80, 100, 130], "maîtrise comme les nécromanciens");
assert.ok(chiefs.every((c, i) => c.sorts.every(s => s.maitrise === c.sorts[0].maitrise) && (!i || c.sorts.length >= chiefs[i - 1].sorts.length)));
assert.ok(court.every(r => r.niveau_mission_min === 1));

// 2. Le camp, les noms et les trois lettres.
const missions = reference.oneShotMissions, def = missions.missions[0];
const camp = def.camps.find(c => c.faction === FACTION);
assert.equal(camp.nom_camp, "Château maudit");
assert.deepEqual(camp.lignes.map(l => l.ligne).sort(), [...lines].sort());
for (const key of Object.values(camp.noms)) assert.ok(missions.noms[key]?.length >= 5, key);
const orders = missions.ordres.filter(o => o.faction === FACTION);
assert.deepEqual(orders.map(o => o.code), ["village_cour", "noble_cour", "emperor_cour"]);
for (const o of orders) if (o.noms_commanditaire) assert.ok(missions.noms[o.noms_commanditaire]?.length >= 5, o.noms_commanditaire);
let seed = 73;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rules = Missions.createMissionRules({reference, random});
const offers = [];
for (let i = 0; i < 500 && offers.length < 40; i++) { const o = rules.createOffer({day: 1, level: 1 + i % 6}); if (o?.faction === FACTION) offers.push(o); }
assert.ok(offers.length >= 20, "la cour sort au tableau");
const seenOrders = new Set();
for (const o of offers) {
  seenOrders.add(o.order);
  const text = rules.orderText(o, {date: "1 Brumecendre", date_expiration: "6 Brumecendre", an: 842, récompense: "9 000"});
  assert.ok(![...text.paragraphs, text.signature].join(" ").includes("{"), o.order + " : tous les champs remplis");
  // 1★ : sans chef possible (Idan, 2026-11-08 : chef au plus la moitié du budget).
  assert.ok(o.level === 1 && !o.camp.chief || o.camp.chief.startsWith("court_vampire_"), o.level + " : " + o.camp.chief);
}
assert.equal(seenOrders.size, 3, "les trois lettres");

// 3. Les fiches appliquées : vol, Régénération, sorts du vampire, armes naturelles.
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const captain = generator.createCaptain({id: 1});
let uid = 1000;
const make = code => { const arch = rules.archetype(code); return rules.applyArchetype(generator.createMercenary({id: ++uid, captain, forcedPeople: arch.peuple, forcedCulture: arch.culture}), arch, {idPrefix: "t" + uid}); };
const bat = make("court_bat"), guard = make("court_blood_guard"), vampire = make("court_vampire_1"), spawn = make("court_spawn"), wolf = make("court_wolf");
assert.equal(bat.flies, true);
assert.equal(guard.flies, undefined);
assert.equal(vampire.skills.physiology["Régénération"], 50);
assert.deepEqual([vampire.undead, vampire.immunePoison], [true, true]);
assert.deepEqual(vampire.aiSpells, rules.archetype("court_vampire_1").sorts.map(s => s.code));
assert.deepEqual(spawn.aiSpells, ["life_drain", "psychic_shock"]);
assert.ok(wolf.items.find(i => i.natural)?.template.nom === "Morsure");

// 4. L'écran de combat : le vol, le Drain de vie, la régénération.
const element = () => ({textContent: "", innerHTML: "", disabled: false, title: "", style: {}, parentElement: {clientWidth: 900},
  classList: {add() {}, remove() {}, toggle() {}}, addEventListener() {}, close() {}});
const elements = {};
const $ = id => elements[id] || (elements[id] = element());
const game = {campaign: null, captain, referenceData: reference};
let api = null;
const combat = createCombatEngine(reference, {onAttack: Progression.recordAttack, gridMap: () => api.missionGridMap()});
Math.random = random;
const mission = fs.readFileSync(path.join(ROOT, "prototype-web", "mission.js"), "utf8");
api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", "MercenairesMissionTerrain", "missionRules", mission + "\nreturn {makeMissionUnit,sortMissionInitiative,"
  + "selectNextMissionPlayer,startMissionCamouflage,autoResolveMission,setMissionMapSize,placeMissionArmy,missionTerrain,missionGridMap,"
  + "missionAiSpell,enemyMissionAct,missionReachablePaths,missionPathCost,resetMissionActivation};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => combat, Progression, MissionEnd, Magic, Terrain, () => rules);
api.setMissionMapSize({cols: 30, rows: 15});
function newMission(enemyCodes, mercs = 2, {decor = []} = {}) {
  const foes = enemyCodes.map(make), squad = Array.from({length: mercs}, () => generator.createMercenary({id: ++uid, captain}));
  const players = api.placeMissionArmy(squad.map((c, i) => api.makeMissionUnit(c, "player", i % 3)), "player");
  const enemies = api.placeMissionArmy(foes.map((c, i) => api.makeMissionUnit(c, "enemy", i % 3)), "enemy");
  game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor};
  for (const u of [...players, ...enemies]) u.camouflaged = false;
  return game.mission;
}
// Vol : un mur de 5 cases (100 PM à pied) et une palissade (une arête, + 2) entre la chauve-souris et la case visée ; elle
// passe au-dessus, 1 point par case (« Ceux qui volent ignorent les malus de déplacement des cases et des arêtes »), mais
// ne s'arrête pas sur le mur ; le garde, lui, doit contourner.
const wall = [-2, -1, 0, 1, 2].map(dr => ({q: 15 - Math.floor((7 + dr) / 2), r: 7 + dr, code: "mur"}));
const fence = {q: wall[2].q + 1, r: 7, side: 0, code: "palissade"};
let m = newMission(["court_bat", "court_blood_guard"], 1, {decor: [...wall, fence]});
const [flyer, walker] = m.enemies;
flyer.q = wall[2].q - 2; flyer.r = 7; walker.q = flyer.q; walker.r = 6;
const target = {q: wall[2].q + 2, r: 7};
const key = c => c.q + "," + c.r;
const flyPaths = api.missionReachablePaths(flyer, 4), walkPaths = api.missionReachablePaths(walker, 4);
assert.ok(flyPaths.has(key(target)), "la chauve-souris passe au-dessus du mur et de la palissade");
assert.equal(api.missionPathCost(flyPaths.get(key(target)), flyer), 4, "1 point par case");
assert.ok(wall.every(w => !flyPaths.has(key(w))), "pas d'arrêt sur le mur");
assert.ok(!walkPaths.has(key(target)), "le garde doit contourner");

// Drain de vie : le vampire se le lance (action rapide) quand un ennemi est à portée de ses pas, puis frappe ; pas deux fois.
m = newMission(["court_vampire_1"], 1);
let vamp = m.enemies[0], foe = m.players[0];
foe.q = vamp.q - 3; foe.r = vamp.r;
vamp.character.mana = 999;
api.resetMissionActivation(vamp);
// Le jet du sort réussit (tirage suivant 0,3) : on vérifie le choix du sort, pas la chance.
const keptSeed = seed;
seed = 38332;
assert.equal(api.missionAiSpell(vamp), true);
seed = keptSeed;
assert.ok(m.log.some(x => /lance Drain de vie/.test(x.message)), "Drain de vie sur lui-même");
assert.ok(vamp.lifeDrain && vamp.attackAvailable !== false, "action rapide : il peut encore agir");
const before = m.log.length;
api.missionAiSpell(vamp);
assert.ok(!m.log.slice(before).some(x => /Drain de vie/.test(x.message)), "pas deux fois");
// Loin de tout ennemi : pas de Drain de vie.
m = newMission(["court_vampire_1"], 1);
vamp = m.enemies[0];
vamp.character.aiSpells = ["life_drain"];
api.resetMissionActivation(vamp);
assert.equal(api.missionAiSpell(vamp), false, "personne à portée de ses pas");

// Régénération : blessé, il regagne des PV au début de son activation ; brûlé, non.
m = newMission(["court_vampire_2"], 1);
vamp = m.enemies[0];
vamp.hp = 100;
api.resetMissionActivation(vamp);
assert.ok(vamp.hp > 100 && m.log.some(x => /se régénère/.test(x.message)), "il régénère");
const hp = vamp.hp;
vamp.burned = true;
api.resetMissionActivation(vamp);
assert.equal(vamp.hp, hp, "brûlé : pas de régénération");

// 5. Des contrats de la Cour joués jusqu'au bout (château en ruine, plateau, enceinte de murs) : niveaux 1 à 6.
let stuck = 0, played = 0;
for (const o of offers.slice(0, 24)) {
  const foes = rules.buildEnemies(o, arch => generator.createMercenary({id: ++uid, captain, forcedPeople: arch.peuple, forcedCulture: arch.culture}));
  const squad = Array.from({length: 4}, () => generator.createMercenary({id: ++uid, captain}));
  const players = api.placeMissionArmy(squad.map((c, i) => api.makeMissionUnit(c, "player", i % 3)), "player");
  const enemies = api.placeMissionArmy(foes.map((c, i) => api.makeMissionUnit(c, "enemy", i % 3)), "enemy");
  const out = api.missionTerrain().generate({cols: 30, rows: 15, faction: FACTION, players, enemies});
  assert.equal(out.landscape, "Château en ruine");
  assert.ok(out.decor.some(d => d.code === "mur" && d.side == null), "un château entouré de murs (des cases : un mur a de l'épaisseur)");
  game.mission = {engine: combat, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, combat), enemyOrder: api.sortMissionInitiative(enemies, combat),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: out.decor, contract: o};
  api.startMissionCamouflage();
  api.selectNextMissionPlayer();
  api.autoResolveMission();
  played++;
  if (!game.mission.over) stuck++;
}
assert.ok(played >= 20);
assert.ok(stuck <= 2, "combats bloqués : " + stuck + " sur " + played);
console.log("Cour de sang : 28 fiches, vol des chauves-souris, vampire (régénération, Drain de vie, Illusion), camp, lettres, château en ruine — OK (" + played + " contrats joués, " + stuck + " bloqués)");
