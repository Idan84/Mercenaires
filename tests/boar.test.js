"use strict";

// Le sanglier de combat (Idan, 2026-11-16 : « Je voudrais qu'on ajoute une monture : sanglier de combat + chasse » ;
// « Logé à la porcherie ! Nouvelle salle et le reste est validé » ; « 1D3 par étoile » ; la Porcherie « comme le Chenil ») :
// la carrure du destrier (tous le montent sauf les ogres), une case, Défenses 1D8 perforantes doublées en charge, compagnon
// à pied comme le loup, entretien 15 PO, Chaotique neutre, « à dos de sanglier », rang d'échange du destrier et du loup ;
// la chasse : 1D3 par étoile, à tous les niveaux, 1 000 PO par étoile, capture possible.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const {createStableRules} = require("../game-core/stables.js");
const {createItemValues} = require("../game-core/item-value.js");
const Missions = require("../game-core/missions.js");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "prototype-web", "reference-data.js"), "utf8");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));
const sheet = code => reference.mounts.rows.find(r => r.code === code);

// 1. La fiche.
const boar = sheet("sanglier"), destrier = sheet("destrier"), loup = sheet("loup");
assert.deepEqual([boar.nom, boar.espece, boar.gabarit, boar.taille, boar.logement, boar.compagnon, boar.place, boar.alignement, boar.entretien, boar.titre, boar.capturable],
  ["Sanglier de combat", "Sangliers de combat", destrier.gabarit, "normale", "trainer_pigsty", true, 1, "Chaotique neutre", 15, "à dos de sanglier", true]);
assert.deepEqual([boar.rang_echange, destrier.rang_echange, loup.rang_echange], [3, 3, 3], "le rang d'échange du destrier et du loup");
assert.deepEqual([boar.attaque.nom, boar.attaque.degats_pv_base, boar.attaque.bonus_charge], ["Défenses", "1D8", 2], "Défenses 1D8, doublées en charge");
const c = boar.caracteristiques;
assert.deepEqual([c.Force, c.Constitution, c.Vitesse, c.Courage], [85, 80, 70, 75]);
assert.ok(c.Esquive < loup.caracteristiques.Esquive && c.Esquive < destrier.caracteristiques.Esquive, "esquive faible");
assert.ok(reference.skills.rows.some(s => s.nom === "Sangliers de combat"), "la compétence existait déjà (Compagnon animal)");
assert.equal(reference.animalNames.rows.find(r => r.code === "sanglier")?.noms.length, 24, "24 noms");
// Son marchand (Idan, 2026-11-16 : « Marchand, Orc des steppes ») : Draz Crinsauvage.
const draz = reference.merchants.rows.find(m => m.nom === "Draz Crinsauvage");
assert.deepEqual([draz.culture, draz.vend.some(v => v.type === "mount" && v.objet === "Sanglier de combat")], ["Orcs des steppes", true]);

// 2. La Porcherie : une aile de la Grange, comme le Chenil.
const pigsty = reference.campBuildings.rows.find(r => r.code === "trainer_pigsty"), kennel = reference.campBuildings.rows.find(r => r.code === "trainer_kennel");
assert.deepEqual([pigsty.nom, pigsty.requiert, pigsty.entraine, pigsty.places_par_niveau, pigsty.prix_base, pigsty.niveaux, pigsty.jours],
  ["La Porcherie", "trainer_barn", "Sangliers de combat", kennel.places_par_niveau, kennel.prix_base, kennel.niveaux, kennel.jours]);
let seed = 116;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
Math.random = random;
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const stable = createStableRules({reference, random, makeItem: (type, name) => generator.createItemByName(type, name)});
assert.equal(stable.houseOf("sanglier"), stable.PIGSTY);
assert.deepEqual(stable.houseWords(stable.PIGSTY), {the: "la Porcherie", at: "à la Porcherie", need: "une Porcherie"});
const pig = id => ({...generator.createItemByName("mount", "Sanglier de combat"), id});
const state = {day: 3, company: {gold: 0, stock: [], roster: [], camp: {buildings: {trainer_barn: {level: 1}}}}};
assert.equal(stable.canStore(state, pig("a")).ok, false, "sans Porcherie, pas de sanglier");
state.company.camp.buildings.trainer_pigsty = {level: 1};
state.company.stock.push(pig("a"), pig("b"));
assert.equal(stable.used(state, stable.PIGSTY), 2);
assert.equal(stable.canStore(state, pig("c")).ok, false, "niveau 1 : deux places");
state.company.camp.buildings.trainer_pigsty.level = 2;
assert.equal(stable.canStore(state, pig("c")).ok, true, "niveau 2 : quatre places");
const values = createItemValues({reference});
assert.equal(values.value(pig("v")), 15 * values.value(generator.createItemByName("mount", "Destrier")) / destrier.entretien, "la valeur suit l'entretien, comme les autres");

// 3. La chasse : 1D3 par étoile, à tous les niveaux, sa chênaie, deux lettres.
const rules = Missions.createMissionRules({reference, random});
const hunt = rules.definition("hunt_boars");
assert.deepEqual([hunt.bete.code, hunt.bete.des, hunt.bete.faces, hunt.bete.faction, hunt.recompense.par_niveau, hunt.niveau.min, hunt.niveau.max],
  ["sanglier", 1, 3, "Sangliers", 1000, undefined, undefined]);
assert.ok(reference.missionLandscapes.rows.some(r => r.faction === "Sangliers" && !r.enceinte), "un paysage, sans camp");
const letters = reference.oneShotMissions.ordres.filter(o => o.mission === "hunt_boars");
assert.deepEqual(letters.map(o => o.faction), ["Sangliers", "Sangliers"], "deux lettres");
for (let level = 1; level <= 9; level++) {
  const offer = rules.createOffer({code: "hunt_boars", level});
  assert.ok(offer.enemyCount >= level && offer.enemyCount <= 3 * level, level + " étoiles : " + offer.enemyCount + " sangliers");
  assert.equal(offer.reward, 1000 * level);
  const enemies = rules.buildEnemies(offer);
  assert.equal(enemies.length, offer.enemyCount);
  assert.ok(enemies.every(e => e.role === "Sanglier de combat" && e.mount?.code === "sanglier" && e.mount.capturable), "des sangliers, capturables");
}

// 4. Au combat : la carrure du destrier (tous sauf les ogres), les Défenses en charge.
const engine = createCombatEngine(reference, {});
const captain = generator.createCaptain({id: 1});
const unit = (character, extra = {}) => ({character, q: 0, r: 0, alive: true, activeSet: 1, team: "player", ...extra});
const mount = rules.createMount("sanglier", {id: "s1"}), horse = rules.createMount("destrier", {id: "d1"});
let id = 10;
for (const people of ["Humain", "Orc", "Elfe", "Nain", "Gobelin", "Ogre"]) {
  const rider = unit(generator.createMercenary({id: id++, captain, forcedPeople: people}));
  assert.equal(engine.canRide(rider, unit(mount)), engine.canRide(rider, unit(horse)), people + " : comme le destrier");
  assert.equal(engine.canRide(rider, unit(mount)), people !== "Ogre", people);
}
assert.deepEqual(mount.items.map(i => [i.name, i.template.degats_pv_base, i.template.bonus_charge_base]), [["Défenses", "1D8", 2]]);

console.log(JSON.stringify({ok: true, sanglier: {valeur: values.value(pig("v")), porcherie: pigsty.nom}}, null, 2));
