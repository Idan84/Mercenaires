"use strict";

// Décor, étape 3 (Idan, 2026-11-06 : « Oui pour les paysages ») : sur les cartes de contrat, un paysage par faction (vieille
// carrière, camp, clairière en forêt, repaire, carrière), tiré au hasard à chaque combat ; tout le monde peut toujours se
// rejoindre. Grille carrée (doc 04, étape 4 ; Idan, 2026-11-17) : les murets, tombes, caisses et palissades en lignes
// d'arêtes, l'enceinte en palissade défendue de l'intérieur, la maison en plan ; sans altitude en phase 1.
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
  for (const k of ["groupes", "taille"]) range(land[k], land.faction + " : " + k);
  for (const k of ["collines", "hauteur_collines", "camp_hauteur", "rampes"]) assert.equal(land[k], undefined, land.faction + " : plus d'altitude (" + k + ")");
}
const land = faction => lands.rows.find(r => r.faction === faction);
const decorRow = code => reference.terrainDecors.rows.find(d => d.code === code);
// La palissade (Idan, 2026-11-06 : « palissade nouvelle ») : une arête (grille carrée), un seul sens, pas de corps à corps.
assert.equal(decorRow("palissade").arete, "palissade");
assert.equal(lands.enceinte.decor, "palissade");
assert.deepEqual([lands.enceinte.distance, lands.enceinte.ouvertures, lands.enceinte.largeur], [2, [2, 3], 2]);
assert.deepEqual(lands.rows.filter(r => !r.enceinte).map(r => r.faction), ["Hommes-bêtes", "Loups", "Licornes", "Cerbères", "Chiens sauvages", "Papillons", "Sangliers", "Pégases", "Mammouths", "Tricératops"], "la forêt suffit ; les bêtes n’ont pas de camp");
// Le cimetière du Culte des morts (Idan, 2026-11-06) : des tombes (des murets), entouré de murets.
assert.equal(land("Culte des morts").nom, "Cimetière");
assert.equal(land("Culte des morts").enceinte_decor, "muret");
assert.ok(land("Culte des morts").decors.tombe >= 5);
assert.equal(decorRow("tombe").arete, "muret");
// Le château en ruine de la Cour de sang (Idan, 2026-11-06 : « enceinte de murs ») : des cases Mur (un mur a de l'épaisseur).
assert.deepEqual([land("Cour de sang").nom, land("Cour de sang").enceinte_decor, decorRow("mur").case], ["Château en ruine", "mur", "mur"]);
for (const row of lands.rows) if (row.enceinte_decor) assert.ok(decorCodes.has(row.enceinte_decor), row.faction);
// La maison du repaire : un plan (des murs autour d'un plancher).
assert.equal(decorRow("maison").plan, "maison");
assert.ok(land("Hommes-bêtes").decors.foret >= 5 && land("Hommes-bêtes").zone_libre >= 3, "une clairière dans la forêt");
assert.ok(land("Voleurs").decors.maison > 0 && land("Ogres").decors.gros_rocher > 0);

// 2. Le générateur : pas de décor sur l'escouade ni dans le camp ; une case, un décor ; une arête, un décor ; l'enceinte à
// 2 cases du camp, une palissade ou des murets en arêtes, défendues de l'intérieur, un mur en cases ; chacun peut toujours
// atteindre l'ennemi.
let seed = 21;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const terrain = Terrain.createMissionTerrain({reference, random});
// La carte des contrats et des chasses : 36 × 25, le camp au centre (Idan, 2026-11-09 : « 36 × 25 c'est parfait »).
const cols = 36, rows = 25, mid = 12;
const order = [...Array(rows).keys()].sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);
// Comme placeMissionArmy : l'escouade à gauche ; le chef au centre de la carte, les autres autour de lui, au plus près d'abord.
function deploy(nP, nE) {
  const players = [...Array(nP)].map((_, i) => Terrain.axial(1 + Math.floor(i / rows), order[i % rows]));
  const chief = Terrain.axial(Math.floor(cols / 2), mid);
  const around = terrain.grid(cols, rows).cells.map((c, i) => ({c, i, d: Terrain.distance(c, chief)})).filter(x => x.d > 0)
    .sort((a, b) => a.d - b.d || a.i - b.i).map(x => x.c);
  return {players, enemies: [...around.slice(0, nE - 1), chief]};
}
const key = c => c.q + "," + c.r;
const SIDES = [{q: 1, r: 0}, {q: 0, r: -1}, {q: -1, r: 0}, {q: 0, r: 1}];
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
    const cellsOut = out.decor.filter(d => d.side == null), edgesOut = out.decor.filter(d => d.side != null);
    const other = d => ({q: d.q + SIDES[d.side].q, r: d.r + SIDES[d.side].r});
    const edgeKey = d => [key(d), key(other(d))].sort().join("|");
    assert.equal(new Set(cellsOut.map(key)).size, cellsOut.length, "une case, un décor");
    assert.equal(new Set(edgesOut.map(edgeKey)).size, edgesOut.length, "une arête, un décor");
    for (const d of edgesOut) assert.ok(decorRow(d.code).arete, d.code + " : une arête");
    for (const d of cellsOut) assert.ok(!decorRow(d.code)?.arete, d.code + " : une case");
    const nearest = c => Math.min(...spots.enemies.map(e => Math.max(Math.abs(e.q - c.q), Math.abs(e.r - c.r))));
    // L'enceinte : la palissade, ou le décor du paysage (les murets du cimetière, les murs du château).
    const wallCode = row.enceinte_decor || lands.enceinte.decor, wallEdge = Boolean(decorRow(wallCode).arete), D = lands.enceinte.distance;
    const pales = !row.enceinte ? [] : wallEdge
      ? edgesOut.filter(d => d.code === wallCode && nearest(d) === D - 1 && nearest(other(d)) === D)
      : cellsOut.filter(d => d.code === wallCode && nearest(d) === D);
    for (const d of out.decor) {
      const plan = d.code === "plancher" && row.decors.maison;
      assert.ok(row.decors[d.code] || plan || (row.enceinte && d.code === wallCode), row.faction + " : " + d.code);
      assert.ok(Terrain.column(d.q, d.r) > 2, "pas sur les colonnes de l'escouade");
      assert.ok(spots.players.every(p => Terrain.distance(p, d) > lands.zone_libre_escouade), "autour de l'escouade, libre");
      if (!pales.includes(d)) assert.ok(spots.enemies.every(e => Terrain.distance(e, d) > row.zone_libre), "autour du camp, libre");
    }
    // Une maison : un plan, des murs autour d'un plancher.
    if (cellsOut.some(d => d.code === "maison")) { s.houses = (s.houses || 0) + 1; assert.ok(cellsOut.some(d => d.code === "plancher"), "un plancher dans la maison"); }
    // L'enceinte : 2 ou 3 ouvertures de 2 cases, la première face à l'escouade ; rien devant une ouverture ; pas d'enceinte
    // dans la clairière. Cases carrées : l'enceinte suit un carré autour du camp (des côtés droits).
    if (row.enceinte) {
      s.walled = (s.walled || 0) + 1;
      assert.ok(pales.length > 0, row.faction + " : une enceinte");
      if (wallEdge) for (const p of pales) assert.equal(nearest(p), D - 1, "défendue de l'intérieur du camp");
      else for (const p of pales) assert.equal(nearest(p), D, "à 2 cases du camp");
      assert.ok(out.openings.length >= lands.enceinte.ouvertures[0] && out.openings.length <= lands.enceinte.ouvertures[1], "2 ou 3 ouvertures");
      const doors = out.openings.flat();
      for (const o of out.openings) assert.ok(o.length >= 1 && o.length <= lands.enceinte.largeur);
      s.wide = (s.wide || 0) + out.openings.filter(o => o.length === lands.enceinte.largeur).length;
      s.doors = (s.doors || 0) + out.openings.length;
      for (const c of doors) assert.equal(nearest(c), D);
      assert.ok(cellsOut.every(d => !doors.some(c => key(c) === key(d))), "l'ouverture est libre");
      assert.ok(pales.every(d => !doors.some(c => key(c) === key(wallEdge ? other(d) : d))), "pas de palissade devant une ouverture");
      assert.ok(out.decor.filter(d => !pales.includes(d)).every(d => doors.every(c => Terrain.distance(c, d) > 1)), "rien devant une ouverture");
      const ring = map.cells.filter(c => nearest(c) === D && Terrain.column(c.q, c.r) > 2
        && spots.players.every(p => Terrain.distance(p, c) > lands.zone_libre_escouade));
      const westCol = Math.min(...ring.map(c => Terrain.column(c.q, c.r)));
      assert.equal(Terrain.column(out.openings[0][0].q, out.openings[0][0].r), westCol, "une ouverture face à l'escouade");
    } else assert.equal(out.decor.filter(d => d.code === lands.enceinte.decor).length, 0, row.faction + " : pas de palissade");
    assert.equal(out.relief, undefined, "plus de relief");
    assert.ok(terrain.reachable(map, {...spots, decor: out.decor}), "tout le monde peut se rejoindre");
  }
  s.decor = Math.round(s.decor / 120);
}
assert.ok(stats["Hommes-bêtes"].decor > 2 * stats.Orcs.decor, "la forêt est épaisse : " + JSON.stringify(stats));
for (const row of lands.rows.filter(r => r.enceinte)) assert.ok(stats[row.faction].wide > 0.8 * stats[row.faction].doors, "des ouvertures de 2 cases : " + row.faction);
assert.ok(stats.Voleurs.houses > 0, "des maisons au repaire");
// Le garde-fou : un mur qui ferme la carte ne passe pas, le tirage recommence ; une palissade, si (elle se franchit, + 2).
const wall = map.cells.filter(c => Terrain.column(c.q, c.r) === 15).map(c => ({...c, code: "mur"}));
const spots = deploy(3, 5);
assert.equal(terrain.reachable(map, {...spots, decor: wall}), false);
const fence = map.cells.filter(c => Terrain.column(c.q, c.r) === 15).map(c => ({...c, side: 0, code: "palissade"}));
assert.equal(terrain.reachable(map, {...spots, decor: fence}), true, "une palissade se franchit");
assert.deepEqual(terrain.generate({cols, rows, faction: "Inconnus", ...spots}), {landscape: null, decor: []});

// 3. Les combats de contrat : le paysage de la faction, appliqué à la carte ; la Mission Test ne change pas.
const mission = read("mission.js");
const start = mission.slice(mission.indexOf("function startExpeditionCombat("), mission.indexOf("function missionTerrain("));
assert.match(start, /missionTerrain\(\)\?\.generate\(\{cols:MISSION_MAP\.cols,rows:MISSION_MAP\.rows,faction:offer\.faction,players,enemies\}\)/);
assert.match(start, /decor:terrain\?\.decor\|\|\[\]/);
assert.doesNotMatch(mission, /generateMissionRelief|\.relief\b|relief:/, "plus de relief");
assert.match(mission, /game\.mission\.decor=generateMissionDecor\(\);/, "la Mission Test garde les siens");
assert.match(mission, /filter\(row=>row\.code!==wall&&row\.code!==CELLAR_DECOR\)/, "sans palissade ni tonneaux au hasard");
assert.match(read("index.html"), /<script src="\/core\/mission-terrain\.js"><\/script>/);

// 4. Les combats automatiques finissent, sur chaque paysage : 30 par faction, carte de contrat 36 × 25, le camp au centre.
// Le capitaine non plus ne dépend pas du nombre de paysages vérifiés plus haut (2026-11-16 : les Hauts plateaux changeaient
// le capitaine, donc tous les mercenaires des combats) : la graine qu'il avait jusqu'ici.
seed = 1116735952;
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
// Le crochet d'attaque du jeu (XP, alerte de l'ennemi touché, poison) : comme en partie.
const engine = createCombatEngine(reference, {onAttack: (...args) => api.onMissionAttack(...args), gridMap: () => api.missionGridMap()});
api = new Function("game", "$", "esc", "fmt", "renderAvatar", "combatEngine", "MercenairesProgression", "MercenairesMissionEnd",
  "MercenairesMagic", "MercenairesMissionTerrain", mission + "\nreturn {onMissionAttack,makeMissionUnit,sortMissionInitiative,selectNextMissionPlayer,"
  + "startMissionCamouflage,autoResolveMission,setMissionMapSize,placeMissionArmy,missionTerrain,missionGridMap};")
  .call(null, game, $, v => String(v ?? ""), v => String(Math.round(Number(v) || 0)), () => "", () => engine, Progression, MissionEnd, Magic, Terrain);
api.setMissionMapSize({cols, rows});
// Le camp au centre (Idan, 2026-11-09) : le chef au milieu de la carte, les autres autour de lui, au plus près d'abord ;
// l'escouade à gauche.
{
  game.mission = {engine, players: [], enemies: []};
  const camp = api.placeMissionArmy([...Array(8)].map((_, i) => api.makeMissionUnit(generator.createMercenary({id: 4900 + i, captain}), "enemy", i % 3)), "enemy");
  const chief = camp[camp.length - 1];
  assert.deepEqual([Terrain.column(chief.q, chief.r), chief.r], [18, 12], "le chef au centre de la carte");
  assert.ok(camp.slice(0, -1).every(u => Terrain.distance(u, chief) <= 2), "les autres autour de lui");
  assert.equal(camp.slice(0, -1).filter(u => Terrain.distance(u, chief) === 1).length, 4, "le premier cercle plein (4 cases carrées)");
  const squad = api.placeMissionArmy([1, 2, 3].map(i => api.makeMissionUnit(generator.createMercenary({id: 4950 + i, captain}), "player", i % 3)), "player");
  assert.ok(squad.every(u => Terrain.column(u.q, u.r) === 1), "l'escouade sur le bord gauche");
}
// Le hasard des combats ne dépend pas du nombre de paysages tirés plus haut (2026-11-09 : un paysage de plus décalait les
// tirages et tombait sur un duel interminable déjà possible, un elfe à couvert contre un orc qui se régénère).
seed = 1594012420;
let stuck = 0;
for (const row of lands.rows) for (let k = 0; k < 30; k++) {
  const squad = [1, 2, 3, 4].slice(0, 3 + k % 2).map(i => generator.createMercenary({id: 5000 + 100 * k + i, captain}));
  const foes = [...Array(4 + k % 5)].map((_, i) => generator.createMercenary({id: 5050 + 100 * k + i, captain}));
  const players = api.placeMissionArmy(squad.map((c, i) => api.makeMissionUnit(c, "player", i % 3)), "player");
  const enemies = api.placeMissionArmy(foes.map((c, i) => api.makeMissionUnit(c, "enemy", i % 3)), "enemy");
  const out = api.missionTerrain().generate({cols, rows, faction: row.faction, players, enemies});
  game.mission = {engine, endRules: MissionEnd.createMissionEndRules({reference}), progression: Progression.createProgressionRules({reference}),
    players, enemies, playerOrder: api.sortMissionInitiative(players, engine), enemyOrder: api.sortMissionInitiative(enemies, engine),
    activeUnit: null, phase: "player", turn: 1, mode: null, log: [], over: false, winner: null, aftermath: null, decor: out.decor};
  api.startMissionCamouflage();
  api.selectNextMissionPlayer();
  api.autoResolveMission();
  if (!game.mission.over) stuck++;
}
assert.equal(stuck, 0, "combats bloqués : " + stuck);
console.log("Enceinte : palissade en arêtes autour du camp, 2 ou 3 ouvertures. Paysages des contrats : " + Object.entries(stats).map(([f, s]) => f + " " + s.decor).join(", ")
  + " décors en moyenne ; maisons en plan, garde-fou, combats automatiques — OK");
