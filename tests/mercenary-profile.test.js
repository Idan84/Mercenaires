"use strict";

// Évaluation d'un mercenaire (Idan, 2026-10-31) : facettes notées sur les 15 niveaux de la réputation, calées sur les
// recrues (la réputation au barycentre), points forts et faibles, gêne d'équipement, titre ; recalculée avec
// l'équipement porté.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createMagicRules} = require("../game-core/magic.js");
const {createStarRules} = require("../game-core/stars.js");
const {createProfileRules} = require("../game-core/mercenary-profile.js");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "prototype-web", "reference-data.js"), "utf8");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
assert.equal(files.mercenaryProfile, "mercenary-profile.json", "le jeu charge les données de l'évaluation");
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));
const data = reference.mercenaryProfile;

// Données : chaque facette a 14 seuils croissants (niveaux 2 à 15) ; chaque titre a sa forme masculine et féminine.
for (const facet of data.facettes) {
  const steps = data.seuils[facet.code];
  assert.equal(steps?.length, 14, facet.code + " : 14 seuils");
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i] > steps[i - 1], facet.code + " : seuils croissants");
}
for (const group of ["principal", "complement"]) {
  for (const [key, entry] of Object.entries(data.titres[group])) assert.ok(entry.m && entry.f, group + "." + key + " : masculin et féminin");
}
assert.ok(Object.keys(data.etalon.caracteristiques).length >= 10, "l'étalon a ses caractéristiques médianes");

// Des recrues tirées par le vrai générateur, avec une autre graine que l'étalonnage.
let seed = 4242;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
Math.random = random;
const generator = createGenerator(reference, {random, nameGenerator:(people, id) => people + " " + id});
const engine = createCombatEngine(reference, {});
const magic = createMagicRules({reference, combat:engine});
const profile = createProfileRules({reference, engine, magic});
const stars = createStarRules({reference});
const captain = generator.createCaptain({id:1});
const recruits = Array.from({length:500}, (_, i) => generator.createMercenary({id:i + 2, captain}));
const results = recruits.map(m => profile.evaluate(m));

// La réputation au barycentre (Idan) : la moyenne des facettes de chaque recrue tombe sur sa réputation.
const gaps = results.map((r, i) => r.mean - stars.personal(recruits[i].reputation).level);
const meanGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
assert.ok(Math.abs(meanGap) < 0.4, "écart moyen à la réputation : " + meanGap.toFixed(2));
assert.ok(gaps.filter(g => Math.abs(g) <= 1).length / gaps.length > 0.75, "à un niveau près pour les trois quarts");
// Les recrues restent en bronze, comme leur réputation.
assert.ok(results.every(r => r.entries.every(e => e.level >= 1 && e.level <= 6)));

// Lecture : au plus 3 lignes fortes et 2 faibles, jamais la même ; toujours au moins une ligne d'étoiles. Ce qu'il fait
// (armes, sorts) mène, sauf si un autre point fort le dépasse d'au moins mene_ecart niveaux ; les autres lignes fortes
// dépassent sa moyenne d'au moins fort_ecart, ou sont une façon d'agir de son meilleur niveau.
const ATTACK = new Set(["contact", "tir", "magie"]);
for (const r of results) {
  assert.ok(r.strengths.length >= 1 && r.strengths.length <= 3 && r.weaknesses.length <= 2);
  assert.ok(r.strengths.every(s => !r.weaknesses.includes(s)), "jamais fort et faible à la fois");
  const usages = r.entries.filter(e => !e.secondary && ATTACK.has(e.family));
  const best = Math.max(...usages.map(e => e.level));
  const lead = r.strengths[0];
  if (usages.length) {
    if (!ATTACK.has(lead.family)) {
      assert.ok(lead.level >= best + data.selection.mene_ecart, "un autre point fort ne mène que de loin");
      assert.ok(ATTACK.has(r.strengths[1]?.family), "sa meilleure façon d'agir suit");
    } else assert.equal(lead.level, best, "il est mené par sa meilleure façon d'agir");
  }
  for (const s of r.strengths.slice(1)) {
    assert.ok(s.level >= r.mean + data.selection.fort_ecart || (ATTACK.has(s.family) && (s.level >= lead.level - data.selection.ecart_usage || s === r.strengths[1])),
      "ligne forte : au-dessus de sa moyenne ou façon d'agir de son niveau");
  }
  for (const w of r.weaknesses) if (w.level != null) assert.ok(w.level < r.mean || w.level === 1, "point faible sous sa moyenne");
  assert.ok(r.title.text.length > 3);
  assert.notEqual(r.title.key, "rang", "un titre qui dit à quoi il sert");
}

// À niveau égal, l'arme du set 1 mène : un archer (arc en set 1, arme de contact en set 2) est un tireur.
for (const [i, r] of results.entries()) {
  const first = engine.weaponTemplate(engine.activeWeaponItem({character:recruits[i], activeSet:1}));
  if (!first || !engine.isRangedWeapon(first)) continue;
  const tir = r.entries.find(e => e.family === "tir" && !e.secondary), contact = r.entries.find(e => e.family === "contact");
  if (tir && contact && tir.level >= contact.level && ["contact", "tir"].includes(r.strengths[0].family)) {
    assert.equal(r.strengths[0].family, "tir", "arc en set 1, tir au niveau du contact : tireur");
  }
}

// Les tirs enchaînés comptent : l'arc (« Répétable ») vaut plus qu'un seul tir, l'arbalète non.
const bowUser = recruits.find(m => engine.weaponTemplate(engine.activeWeaponItem({character:m, activeSet:1}))?.nom === "Arc");
assert.ok(bowUser, "un archer dans l'échantillon");
assert.ok(engine.isRepeatable(engine.weaponTemplate(engine.activeWeaponItem({character:bowUser, activeSet:1}))));
const target = {character:recruits[0], activeSet:1};
const bowUnit = {character:bowUser, activeSet:1};
assert.ok(profile.perTurn(bowUnit, target, "ranged", 4) > profile.strike(bowUnit, target, "ranged", 4).damage, "l'arc enchaîne ses tirs");
const crossbowUser = recruits.find(m => engine.weaponTemplate(engine.activeWeaponItem({character:m, activeSet:1}))?.nom === "Arbalète");
assert.ok(crossbowUser, "un arbalétrier dans l'échantillon");
const crossbowUnit = {character:crossbowUser, activeSet:1};
assert.equal(profile.perTurn(crossbowUnit, target, "ranged", 4), profile.strike(crossbowUnit, target, "ranged", 4).damage, "l'arbalète tire une fois");

// Sans arme de contact : c'est un point faible.
const bowOnly = recruits.findIndex(m => [1, 2].every(set => {
  const weapon = engine.weaponTemplate(engine.activeWeaponItem({character:m, activeSet:set}));
  return !weapon || !engine.isMeleeWeapon(weapon);
}));
assert.ok(bowOnly >= 0, "une recrue sans arme de contact dans l'échantillon");
assert.equal(results[bowOnly].weaknesses[0].code, "sans_contact");

// Le titre perce-armure garde ses dégâts face aux plates ; « contre la piétaille » les perd.
for (const r of results) {
  const family = r.title.key.replace(/_(perce|leger)$/, "");
  if (!/_(perce|leger)$/.test(r.title.key)) continue;
  const ratio = r.values[family + "_lourd"] / r.values[family + "_leger"];
  if (r.title.key.endsWith("_perce")) assert.ok(ratio >= data.selection.perce_ratio, r.title.key + " " + ratio);
  else assert.ok(ratio <= data.selection.leger_ratio, r.title.key + " " + ratio);
}

// Dynamique : la même recrue, en armure de plates, encaisse mieux et voit sa magie gênée.
const caster = recruits.find((m, i) => results[i].levels.magie_attaque != null && !engine.armorItem({character:m, activeSet:1})?.name?.includes("plates"));
assert.ok(caster, "un lanceur de sorts d'attaque dans l'échantillon");
const before = profile.evaluate(caster);
const plated = {...caster, items:[...caster.items, {id:"plate", name:"Armure de plates", itemType:"armor", tier:1, qualityCode:"standard"}],
  equipment:{...caster.equipment, slots:{...caster.equipment.slots, armor:"plate"}}};
const after = profile.evaluate(plated);
assert.ok(after.levels.encaisser_coups > before.levels.encaisser_coups, "les plates font mieux encaisser");
assert.ok(after.values.magie_attaque < before.values.magie_attaque, "les plates font rater des sorts");
assert.ok(after.hindrance && ["magie_attaque", "initiative", "magie_zone", "soin", "soin_masse", "soutien", "invocation", "controle"].includes(after.hindrance.code),
  "une gêne de l'armure : " + JSON.stringify(after.hindrance));

// Titre au féminin.
const woman = {...recruits[0], sex:"Femme"};
const man = {...recruits[0], sex:"Homme"};
const key = profile.evaluate(man).title.key;
assert.equal(profile.evaluate(woman).title.text.startsWith(data.titres.principal[key].f), true);
assert.equal(profile.evaluate(man).title.text.startsWith(data.titres.principal[key].m), true);

// Interface : au-dessus du portrait, dans chaque onglet qui l'affiche ; le module est chargé.
const ui = fs.readFileSync(path.join(ROOT, "prototype-web", "ui.js"), "utf8");
assert.equal((ui.match(/<aside class="sheet-portrait">\s*\$\{renderEvaluation\(c\)\}\$\{renderAvatar\(c,/g) || []).length, 5);
const index = fs.readFileSync(path.join(ROOT, "prototype-web", "index.html"), "utf8");
assert.match(index, /<script src="\/core\/mercenary-profile\.js"><\/script>/);
console.log("Évaluation des mercenaires : facettes, échelle de la réputation, points forts et faibles, gêne, titre — OK");
