"use strict";

// Titres des mercenaires (Idan, 2026-10-31, version 2) : 10 catégories de rôle faites de sous-catégories mesurées, notées
// sur les 15 niveaux de la réputation et calées sur les recrues ; 1 à 3 titres ou « Chair à canon » ; une sous-catégorie
// qui se détache précise le titre ; tout se recalcule avec l'équipement porté.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const {createCombatEngine} = require("../game-core/combat-engine.js");
const {createMagicRules} = require("../game-core/magic.js");
const {createProfileRules} = require("../game-core/mercenary-profile.js");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "prototype-web", "reference-data.js"), "utf8");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
assert.equal(files.mercenaryProfile, "mercenary-profile.json", "le jeu charge les données des titres");
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));
const data = reference.mercenaryProfile;
const S = data.selection;

// Données : 10 catégories, 5 sous-catégories au plus ; chaque sort et chaque créature rangés dans une seule sous-catégorie
// qui existe ; chaque source mesurée a 14 seuils croissants (niveaux 2 à 15), comme chaque catégorie.
assert.deepEqual(data.categories.map(c => c.nom),
  ["Healer", "Summoner", "Buffer", "Contrôleur", "DPS au CAC", "DPS à distance", "DPS magiques", "Tank", "Éclaireur", "Meneur"]);
const subKeys = new Set(data.categories.flatMap(c => c.sous.map(s => c.code + "." + s.code)));
for (const c of data.categories) assert.ok(c.sous.length >= 1 && c.sous.length <= 5, c.code + " : 1 à 5 sous-catégories");
const spells = reference.spells.rows || reference.spells;
for (const [code, key] of Object.entries(data.sorts)) {
  if (code === "description") continue;
  assert.ok(spells.some(s => s.code === code), "sort inconnu : " + code);
  assert.ok(subKeys.has(key), code + " → " + key);
}
for (const [creature, key] of Object.entries(data.creatures)) if (creature !== "description") assert.ok(subKeys.has(key), creature + " → " + key);
// Garde-fou (Idan, 2026-10-31) : chaque sort a un rôle (sorts, ou sa créature) ou est déclaré sans rôle ; chaque créature
// invocable a le sien. Un sort ou une créature ajoutés sans ce choix bloquent la publication.
const summonEffects = new Set(["invocation", "resurrection"]);
for (const s of spells) {
  const mapped = summonEffects.has(s.effet) ? Boolean(data.creatures[s.creature]) : Boolean(data.sorts[s.code]);
  assert.ok(mapped || data.sans_role.sorts.includes(s.code),
    "sort sans rôle : " + s.code + " (" + s.nom + ") — le ranger dans mercenary-profile.json (sorts, creatures) ou sans_role");
}
const creatures = reference.summonArchetypes.rows || reference.summonArchetypes;
for (const c of creatures) assert.ok(data.creatures[c.code], "créature sans rôle : " + c.code + " — la ranger dans mercenary-profile.json (creatures)");
const increasing = (key, steps) => {
  assert.equal(steps?.length, 14, key + " : 14 seuils");
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i] > steps[i - 1], key + " : seuils croissants");
};
for (const c of data.categories) {
  increasing("categorie:" + c.code, data.seuils["categorie:" + c.code]);
  for (const sub of c.sous.filter(sub => !sub.a_venir)) for (const src of sub.sources) {
    if (src === "sorts") increasing("sorts_" + sub.sorts, data.seuils["sorts:" + c.code + "." + sub.code] || data.seuils["sorts_" + sub.sorts]);
    else increasing(src, data.seuils[src]);
  }
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
const captain = generator.createCaptain({id:1});
const recruits = Array.from({length:600}, (_, i) => generator.createMercenary({id:i + 2, captain}));
const results = recruits.map(m => profile.evaluate(m));

// Attribution (Idan ; affinée le 2026-11-01) : une catégorie hors du domaine du mercenaire demande ecart_hors_domaine
// étoile de plus ; titre 1 = meilleure catégorie éligible ; titres 2 et 3 éligibles et à ecart_titre près de la
// précédente ; spécificité à ecart_specificite d'écart, ou seule sous-catégorie.
const inDomain = (m, code) => S.domaines[m.domain].includes(code);
const minFor = (m, cat) => S.titre_min + (inDomain(m, cat.code) ? 0 : S.ecart_hors_domaine);
for (const [index, r] of results.entries()) {
  const m = recruits[index];
  const eligible = r.categories.filter(cat => cat.level >= minFor(m, cat));
  assert.equal(r.cannonFodder, !eligible.length);
  assert.ok(r.titles.length <= S.max_titres);
  r.titles.forEach((t, i) => {
    assert.ok(t.level >= minFor(m, {code:t.category}), "un titre a au moins " + S.titre_min + " étoiles (une de plus hors du domaine)");
    assert.equal(t.category, eligible[i].code, "dans l'ordre des catégories éligibles");
    if (i) assert.ok(r.titles[i - 1].level - t.level <= S.ecart_titre, "à ecart_titre près de la précédente");
    const subs = eligible[i].subs;
    const expected = subs.length === 1 ? subs[0].level >= S.specificite_min : subs[0].level - subs[1].level >= S.ecart_specificite;
    assert.equal(Boolean(t.sub), expected, "spécificité : " + JSON.stringify(subs.map(s => s.level)));
    assert.equal(t.label, t.sub ? t.categoryName + " · " + t.sub.nom : t.categoryName);
  });
  const next = eligible[r.titles.length];
  if (r.titles.length && r.titles.length < S.max_titres && next) {
    assert.ok(r.titles[r.titles.length - 1].level - next.level > S.ecart_titre, "le titre suivant manquait");
  }
}
// Calage (Idan, 2026-11-01 : « certains trucs sont trop surestimés ce qui fait qu'ils ont trois titres au début ») : les
// niveaux suivent une répartition fixe ; les rôles que tout le monde pratique (Tank, Éclaireur, Meneur) sont plus
// exigeants. Au début, environ deux recrues sur trois sont de la chair à canon ; trois titres restent rares.
const fodder = results.filter(r => r.cannonFodder).length / results.length;
assert.ok(fodder > 0.5 && fodder < 0.8, "Chair à canon : " + fodder);
assert.ok(results.filter(r => r.titles.length === 3).length / results.length < 0.03, "trois titres : rare au début");
assert.ok(results.filter(r => r.titles.length === 1).length > 3 * results.filter(r => r.titles.length >= 2).length);
const share = code => results.filter(r => r.titles.some(t => t.category === code)).length / results.length;
for (const code of ["tank", "meneur", "eclaireur"]) assert.ok(share(code) < 0.1, code + " : " + share(code));
for (const code of ["dps_cac", "dps_distance"]) assert.ok(share(code) < 0.2, code + " : " + share(code));
// Le titre principal suit le domaine (hors domaine : seulement à une étoile de plus).
const offDomain = results.filter((r, i) => r.titles[0] && !inDomain(recruits[i], r.titles[0].category)).length;
assert.ok(offDomain / Math.max(1, results.filter(r => r.titles.length).length) < 0.05, "titre principal hors du domaine : " + offDomain);

// Seulement ce qui agit (Idan, 2026-11-01). Soigneur : un sort qui soigne vraiment ; les protections sont au Renforceur.
const HEALS = new Set(["soin", "soin_de_zone", "soin_sur_duree", "transfert_pv", "delivrance"]);
for (const [i, r] of results.entries()) {
  if (r.titles.some(t => t.category === "healer")) assert.ok(recruits[i].spells.some(k => HEALS.has(magic.spell(k.code)?.effet)), "Soigneur sans sort de soin");
}
for (const code of ["fire_armor", "frost_armor", "force_field", "stone_skin", "bear_endurance", "scale_skin", "cat_agility"]) assert.equal(data.sorts[code], "buffer.protecteur", code);
assert.equal(data.sorts.deliverance, "healer.urgentiste");
assert.ok(!data.categories.find(c => c.code === "healer").sous.some(s => s.code === "protecteur"));
// Aura : seulement le capitaine, un lieutenant (la moitié) ou un fouet ; une recrue n'en a pas.
const whip = m => ["weapon_set_1_main", "weapon_set_1_off", "weapon_set_2_main", "weapon_set_2_off"].some(slot => {
  const item = (m.items || []).find(x => x.id === m.equipment?.slots?.[slot]);
  return item && reference.weapons.rows.find(w => w.nom === item.name)?.aura_caracteristique === "Courage";
});
for (const [i, r] of results.entries()) assert.equal(r.values.aura != null, whip(recruits[i]), "aura d'une recrue : seulement avec un fouet");
const asCaptain = profile.evaluate(captain, {captain:true}).values.aura, asLieutenant = profile.evaluate(captain, {lieutenant:true}).values.aura;
assert.ok(asCaptain > 0 && Math.abs(asLieutenant - asCaptain / 2) < 1e-9, "le lieutenant a la moitié de l'aura du capitaine");
// Les pièges n'existent pas encore en combat : Poseur de pièges n'est pas noté.
assert.equal(data.categories.find(c => c.code === "eclaireur").sous.find(s => s.code === "pieges").a_venir, true);
assert.ok(results.every(r => r.values.pieges === undefined));

// Ce qu'il ne sait pas faire n'est pas noté : sans sort, pas de Healer ; sans arme de tir, pas de DPS à distance.
for (const [i, r] of results.entries()) {
  const m = recruits[i];
  if (!(m.spells || []).length) assert.ok(!r.categories.some(c => ["healer", "summoner", "buffer", "controleur", "dps_magie"].includes(c.code)));
  const ranged = [1, 2].some(set => engine.isRangedWeapon(engine.weaponTemplate(engine.activeWeaponItem({character:m, activeSet:set}))));
  if (!ranged) assert.ok(!r.categories.some(c => c.code === "dps_distance"));
}

// Les tirs enchaînés comptent : l'arc (« Répétable ») vaut plus qu'un seul tir, l'arbalète non.
const holding = name => recruits.find(m => engine.weaponTemplate(engine.activeWeaponItem({character:m, activeSet:1}))?.nom === name);
const target = {character:recruits[0], activeSet:1};
const bowUnit = {character:holding("Arc"), activeSet:1}, crossbowUnit = {character:holding("Arbalète"), activeSet:1};
assert.ok(bowUnit.character && crossbowUnit.character, "un archer et un arbalétrier dans l'échantillon");
assert.ok(profile.perTurn(bowUnit, target, "ranged", 4) > profile.strike(bowUnit, target, "ranged", 4).damage, "l'arc enchaîne ses tirs");
assert.equal(profile.perTurn(crossbowUnit, target, "ranged", 4), profile.strike(crossbowUnit, target, "ranged", 4).damage, "l'arbalète tire une fois");

// Sorts : chacun dans sa sous-catégorie (Soin profond : Urgentiste ; loups : Summoner de masse ; corbeau : Éclaireur
// magique) ; Purge et Célérité n'en ont pas.
const spell = code => magic.spell(code);
assert.equal(profile.spellRole(spell("deep_heal")), "healer.urgentiste");
assert.equal(profile.spellRole(spell("summon_wolves")), "summoner.masse");
assert.equal(profile.spellRole(spell("summon_raven")), "eclaireur.magique");
assert.equal(profile.spellRole(spell("raise_dead")), "summoner.necromancien");
assert.equal(profile.spellRole(spell("purge")), null);
assert.equal(profile.spellRole(spell("celerity")), null);

// Dynamique : la même recrue, en armure de plates, encaisse mieux (Tank · Inblessable).
const someone = recruits.find(m => !engine.armorItem({character:m, activeSet:1})?.name?.includes("plates"));
const plated = {...someone, items:[...someone.items, {id:"plate", name:"Armure de plates", itemType:"armor", tier:1, qualityCode:"standard"}],
  equipment:{...someone.equipment, slots:{...someone.equipment.slots, armor:"plate"}}};
assert.ok(profile.measure(plated).encaisser > profile.measure(someone).encaisser, "les plates font mieux encaisser");

// Interface : au-dessus du portrait, dans chaque onglet qui l'affiche ; le module est chargé.
const ui = fs.readFileSync(path.join(ROOT, "prototype-web", "ui.js"), "utf8");
assert.equal((ui.match(/<aside class="sheet-portrait">\s*\$\{renderEvaluation\(c\)\}\$\{renderAvatar\(c,/g) || []).length, 5);
assert.match(ui, /Chair à canon/);
const index = fs.readFileSync(path.join(ROOT, "prototype-web", "index.html"), "utf8");
assert.match(index, /<script src="\/core\/mercenary-profile\.js"><\/script>/);
console.log("Titres des mercenaires : 10 catégories, sous-catégories, échelle de la réputation, 1 à 3 titres, Chair à canon — OK");
