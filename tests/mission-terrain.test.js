"use strict";

// Décor, étape 3 (Idan, 2026-11-06 : « Oui pour les paysages », « camp en hauteur oui ») : sur les cartes de contrat, un
// paysage par faction (vieille carrière, camp, clairière en forêt, repaire, carrière), tiré au hasard à chaque combat ;
// le camp des carrières sur un plateau bordé de falaises, avec des rampes ; tout le monde peut toujours se rejoindre.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const Progression = require("../game-core/progression.js");
const MissionEnd = require("../game-core/mission-end.js");
const Magic = require("../game-core/magic.js");
const Terrain = require("../game-core/mission-terrain.js");
require("../game-core/regeneration.js");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "prototype-web", "reference-data.js"), "utf8");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
assert.equal(files.missionLandscapes, "mission-landscapes.json", "le jeu charge les paysages");
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));
const read = file => fs.readFileSync(path.join(ROOT, "prototype-web", file), "utf8");

// 1. Les données : un paysage par faction des camps de contrat, des décors qui existent.
const lands = reference.missionLandscapes;
assert.equal(lands.row_count, lands.rows.length);
// Les camps, et les chasses (Idan, 2026-11-07 : les loups en forêt, les licornes en clairière).
const factions = [...new Set(reference.oneShotMissions.missions.flatMap(m => [...(m.camps || []).map(c => c.faction), m.bete?.faction].filter(Boolean)))];
assert.deepEqual(lands.rows.map(r => r.faction).sort(), [...factions].sort(), "un paysage par faction");
const decorCodes = new Set(reference.terrainDecors.rows.map(d => d.code));
const range = (pair, label) => { assert.ok(Array.isArray(pair) && pair.length === 2 && pair[0] <= pair[1] && pair[0] >= 0, label); };
for (const land of lands.rows) {
  assert.ok(land.nom, land.faction);
  for (const [code, weight] of Object.entries(land.decors)) { assert.ok(decorCodes.has(code), land.faction + " : " + code); assert.ok(weight > 0); }
  assert.ok(Object.keys(land.decors).some(code => ["marais", "eau_peu_profonde"].includes(code)), land.faction + " : un peu d'eau en accent");
  for (const k of ["groupes", "taille", "collines", "rampes"]) range(land[k], land.faction + " : " + k);
  assert.ok(land.camp_hauteur >= 0 && land.camp_hauteur <= 3);
  assert.ok(land.camp_hauteur === 0 || land.rampes[0] >= 1, land.faction + " : un camp en hauteur a ses rampes");
}
const land = faction => lands.rows.find(r => r.faction === faction);
// La palissade (Idan, 2026-11-06 : « palissade nouvelle ») : bois, infranchissable, laisse voir, couverture partielle.
const pale = reference.terrainDecors.rows.find(d => d.code === "palissade");
assert.deepEqual([pale.nom, pale.cout_mouvement, pale.bloque_vue, pale.couverture], ["Palissade", null, false, "partielle"]);
assert.equal(lands.enceinte.decor, "palissade");
assert.deepEqual([lands.enceinte.distance, lands.enceinte.ouvertures, lands.enceinte.largeur], [2, [2, 3], 2]);
assert.deepEqual(lands.rows.filter(r => !r.enceinte).map(r => r.faction), ["Hommes-bêtes", "Loups", "Licornes", "Cerbères", "Chiens sauvages"], "la forêt suffit ; les bêtes n’ont pas de camp");
// Le cimetière du Culte des morts (Idan, 2026-11-06) : des tombes, entouré de murets.
assert.equal(land("Culte des morts").nom, "Cimetière");
assert.equal(land("Culte des morts").enceinte_decor, "muret");
assert.ok(land("Culte des morts").decors.tombe >= 5);
const tomb = reference.terrainDecors.rows.find(d => d.code === "tombe");
assert.deepEqual([tomb.nom, tomb.cout_mouvement, tomb.bloque_vue, tomb.couverture], ["Tombe", null, false, "partielle"]);
// Le château en ruine de la Cour de sang (Idan, 2026-11-06 : « camp en hauteur, enceinte de murs », « murs ok ») : un plateau,
// des murs (qui bloquent la vue).
assert.deepEqual([land("Cour de sang").nom, land("Cour de sang").enceinte_decor, land("Cour de sang").camp_hauteur], ["Château en ruine", "mur", 2]);
for (const row of lands.rows) if (row.enceinte_decor) assert.ok(decorCodes.has(row.enceinte_decor), row.faction);
assert.deepEqual(["Gobelins", "Ogres", "Cour de sang"].map(f => land(f).camp_hauteur), [2, 2, 2], "les carrières et le château : le camp en hauteur");
assert.deepEqual(["Orcs", "Hommes-bêtes", "Voleurs"].map(f => land(f).camp_hauteur), [0, 0, 0]);
assert.ok(land("Hommes-bêtes").decors.foret >= 5 && land("Hommes-bêtes").zone_libre >= 3, "une clairière dans la forêt");
assert.ok(land("Voleurs").decors.maison > 0 && land("Ogres").decors.gros_rocher > 0);

// 2. Le générateur : pas de décor sur l'escouade ni dans le camp ; le plateau des carrières bordé de falaises, une rampe
// au moins face à l'escouade ; ailleurs, jamais de falaise ; chacun peut toujours atteindre l'ennemi.
let seed = 21;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const terrain = Terrain.createMissionTerrain({reference, random});
const cols = 30, rows = 15, mid = 7;
const order = [...Array(rows).keys()].sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);
function deploy(nP, nE) {
  const players = [...Array(nP)].map((_, i) => Terrain.axial(1 + Math.floor(i / rows), order[i % rows]));
  const enemies = [], perCol = Math.max(1, Math.min(rows, Math.max(3, Math.ceil((nE - 1) / 2))));
  for (let i = 0; i < nE - 1; i++) enemies.push(Terrain.axial(cols - 4 - Math.floor(i / perCol), order[i % perCol]));
  enemies.push(Terrain.axial(cols - 2, mid));
  return {players, enemies};
}
const key = c => c.q + "," + c.r;
const map = terrain.grid(cols, rows);
const stats = {};
for (const row of lands.rows) {
  const s = stats[row.faction] = {decor: 0};
  for (let i = 0; i < 120; i++) {
    const spots = deploy(3 + i % 4, 4 + i % 14);
    const out = terrain.generate({cols, rows, faction: row.faction, ...spots});
    assert.equal(out.landscape, row.nom);
    assert.ok(out.attempts >= 1, "une carte avec son décor");
    s.decor += out.decor.length;
    const h = new Map(out.relief.map(c => [key(c), c.h]));
    const height = c => h.get(key(c)) || 0;
    assert.equal(new Set(out.decor.map(key)).size, out.decor.length, "une case, un décor");
    // L'enceinte : la palissade, ou le décor du paysage (les murets du cimetière).
    const wallCode = row.enceinte_decor || lands.enceinte.decor;
    const pales = row.enceinte ? out.decor.filter(d => d.code === wallCode && Math.min(...spots.enemies.map(e => Terrain.distance(e, d))) === lands.enceinte.distance) : [];
    for (const d of out.decor) {
      assert.ok(row.decors[d.code] || (row.enceinte && d.code === wallCode), row.faction + " : " + d.code);
      assert.ok(Terrain.column(d.q, d.r) > 2, "pas sur les colonnes de l'escouade");
      assert.ok(spots.players.every(p => Terrain.distance(p, d) > lands.zone_libre_escouade), "autour de l'escouade, libre");
      assert.ok(spots.enemies.every(e => Terrain.distance(e, d) > row.zone_libre), "autour du camp, libre");
    }
    for (const c of out.relief) assert.ok(Number.isInteger(c.h) && c.h >= 1 && c.h <= 3);
    // L'enceinte : la palissade à 2 cases de l'ennemi le plus proche ; 2 ou 3 ouvertures de 2 cases, la première face à
    // l'escouade ; rien devant une ouverture ; pas d'enceinte dans la clairière.
    const nearest = c => Math.min(...spots.enemies.map(e => Terrain.distance(e, c)));
    if (row.enceinte) {
      s.walled = (s.walled || 0) + 1;
      assert.ok(pales.length > 0, row.faction + " : une enceinte");
      for (const p of pales) assert.equal(nearest(p), lands.enceinte.distance, "à 2 cases du camp");
      assert.ok(out.openings.length >= lands.enceinte.ouvertures[0] && out.openings.length <= lands.enceinte.ouvertures[1], "2 ou 3 ouvertures");
      const doors = out.openings.flat();
      for (const o of out.openings) assert.ok(o.length >= 1 && o.length <= lands.enceinte.largeur);
      s.wide = (s.wide || 0) + out.openings.filter(o => o.length === lands.enceinte.largeur).length;
      s.doors = (s.doors || 0) + out.openings.length;
      for (const c of doors) assert.equal(nearest(c), lands.enceinte.distance);
      assert.ok(out.decor.every(d => !doors.some(c => key(c) === key(d))), "l'ouverture est libre");
      assert.ok(out.decor.filter(d => !pales.includes(d)).every(d => doors.every(c => Terrain.distance(c, d) > 1)), "rien devant une ouverture");
      const ring = map.cells.filter(c => nearest(c) === lands.enceinte.distance && Terrain.column(c.q, c.r) > 2
        && spots.players.every(p => Terrain.distance(p, c) > lands.zone_libre_escouade));
      const westCol = Math.min(...ring.map(c => Terrain.column(c.q, c.r)));
      assert.equal(Terrain.column(out.openings[0][0].q, out.openings[0][0].r), westCol, "une ouverture face à l'escouade");
      if (row.camp_hauteur) for (const o of out.openings) {
        assert.equal(height(o[0]), row.camp_hauteur, "l'enceinte au bord du plateau");
        assert.ok(map.neighbors(o[0]).some(n => height(n) === row.camp_hauteur - 1), "une rampe à chaque ouverture");
      }
    } else assert.equal(out.decor.filter(d => d.code === lands.enceinte.decor).length, 0, row.faction + " : pas de palissade");
    const cliffs = map.cells.filter(c => map.neighbors(c).some(n => Math.abs(height(n) - height(c)) >= 2));
    if (row.camp_hauteur) {
      assert.ok(spots.enemies.every(e => height(e) === row.camp_hauteur), "le camp sur la hauteur");
      assert.ok(cliffs.length > 0, "bordé de falaises");
      const west = Math.min(...spots.enemies.map(e => Terrain.column(e.q, e.r)));
      const ramp = map.cells.some(c => height(c) === row.camp_hauteur - 1 && Terrain.column(c.q, c.r) <= west - 1
        && map.neighbors(c).some(n => height(n) === row.camp_hauteur));
      assert.ok(ramp, "une rampe face à l'escouade");
    } else assert.equal(cliffs.length, 0, row.faction + " : pas de falaise");
    assert.ok(terrain.reachable(map, {...spots, decor: out.decor, relief: out.relief}), "tout le monde peut se rejoindre");
  }
  s.decor = Math.round(s.decor / 120);
}
assert.ok(stats["Hommes-bêtes"].decor > 2 * stats.Orcs.decor, "la forêt est épaisse : " + JSON.stringify(stats));
for (const row of lands.rows.filter(r => r.enceinte)) assert.ok(stats[row.faction].wide > 0.8 * stats[row.faction].doors, "des ouvertures de 2 cases : " + row.faction);
// Le garde-fou : un mur qui ferme la carte ne passe pas, le tirage recommence ; un camp bouclé par les falaises, non plus.
const wall = map.cells.filter(c => Terrain.column(c.q, c.r) === 15).map(c => ({...c, code: "mur"}));
const spots = deploy(3, 5);
assert.equal(terrain.reachable(map, {...spots, decor: wall}), false);
const sealed = map.cells.filter(c => spots.enemies.some(e => Terrain.distance(e, c) <= 1)).map(c => ({...c, h: 2}));
assert.equal(terrain.reachable(map, {...spots, relief: sealed}), false, "sans rampe, le camp est inaccessible");
assert.deepEqual(terrain.generate({cols, rows, faction: "Inconnus", ...spots}), {landscape: null, decor: [], relief: []});

// 3. Les combats de contrat : le paysage de la faction, appliqué à la carte ; la Mission Test ne change pas.
const mission = read("mission.js");
const start = mission.slice(mission.indexOf("function startExpeditionCombat("), mission.indexOf("function missionTerrain("));
assert.match(start, /missionTerrain\(\)\?\.generate\(\{cols:MISSION_MAP\.cols,rows:MISSION_MAP\.rows,faction:offer\.faction,players,enemies\}\)/);
assert.match(start, /decor:terrain\?\.decor\|\|\[\],relief:terrain\?\.relief\|\|\[\]/);
assert.match(mission, /game\.mission\.relief=generateMissionRelief\(\);\n\s+game\.mission\.decor=generateMissionDecor\(\);/, "la Mission Test garde les siens");
assert.match(mission, /filter\(row=>row\.code!==wall\)/, "sans palissade au hasard");
assert.match(read("index.html"), /<script src="\/core\/mission-terrain\.js"><\/script>/);

// 4. Les combats automatiques finissent, sur chaque paysage : 30 par faction, carte de contrat 30 × 15.
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const captain = generator.createCaptain({id: 1});
const element = () => ({textContent: "", innerHTML: "", disabled: false, title: "", style: {}, parentElement: {clientWidth: 900},
  classList: {add() {}, remove() {}, toggle() {}}, addEventListener() {}, close() {}});
const elements = {};
const $ = id => elements[id] || (elements[id] = element());
const game = {campaign: null, captain, referenceData: reference};
let api = null;
// Le hasard du test avant le moteur (qui garde Math.random à sa création) : les combats se rejouent à l'identique.
Math.random = random;
const engine = createCombatEngine(reference, {onAttack: Progression.recordAttack, heightOf: u => api.missionUnitHeight(u)});
api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", "MercenairesMissionTerrain", mission + "\nreturn {makeMissionUnit,sortMissionInitiative,selectNextMissionPlayer,"
  + "startMissionCamouflage,autoResolveMission,setMissionMapSize,placeMissionArmy,missionTerrain,missionUnitHeight};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => engine, Progression, MissionEnd, Magic, Terrain);
api.setMissionMapSize({cols, rows});
let stuck = 0;
for (const row of lands.rows) for (let k = 0; k < 30; k++) {
  const squad = [1, 2, 3, 4].slice(0, 3 + k % 2).map(i => generator.createMercenary({id: 5000 + 100 * k + i, captain}));
  const foes = [...Array(4 + k % 5)].map((_, i) => generator.createMercenary({id: 5050 + 100 * k + i, captain}));
  const players = api.placeMissionArmy(squad.map((c, i) => api.makeMissionUnit(c, "player", i % 3)), "player");
  const enemies = api.placeMissionArmy(foes.map((c, i) => api.makeMissionUnit(c, "enemy", i % 3)), "enemy");
  const out = api.missionTerrain().generate({cols, rows, faction: row.faction, players, enemies});
  game.mission = {engine, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, engine), enemyOrder: api.sortMissionInitiative(enemies, engine),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: out.decor, relief: out.relief};
  api.startMissionCamouflage();
  api.selectNextMissionPlayer();
  api.autoResolveMission();
  if (!game.mission.over) stuck++;
}
assert.equal(stuck, 0, "combats bloqués : " + stuck);
console.log("Enceinte : palissade à 2 cases, 2 ou 3 ouvertures, une rampe à chaque ouverture des carrières. Paysages des contrats : " + Object.entries(stats).map(([f, s]) => f + " " + s.decor).join(", ")
  + " cases de décor en moyenne ; camp en hauteur des carrières, rampes, garde-fou, combats automatiques — OK");
