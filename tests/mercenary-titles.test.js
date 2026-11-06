"use strict";

// Titres v3 (Idan, 2026-11-06) : « ce qu'il fait × comment il le fait ». Chaque rôle s'écrit avec l'arme, le style, l'école
// ou la sous-catégorie qui le porte ; 1 à 3 rôles se fondent en un seul titre (« Archer éclaireur »), suivi du mot de
// niveau du rôle principal, avant l'arme ou à la fin ; pas d'étoiles ; masculin seulement pour l'instant.
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
assert.equal(files.mercenaryTitles, "mercenary-titles.json", "le jeu charge les titres écrits");
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))]));
const titles = reference.mercenaryTitles;

// ---- Données ----
const filled = (value, label) => assert.ok(typeof value === "string" && value.trim() === value && value.length > 1, label);
const twoLines = (lines, label) => { assert.equal(lines?.length, 2, label); lines.forEach(x => filled(x, label)); };
assert.deepEqual(titles.paliers, [4, 6, 9, 11, 15]);
assert.equal(titles.row_count, titles.rows.length);
filled(titles.chair_a_canon.titre.m, "Chair à canon");
twoLines(titles.chair_a_canon.infobulle.m, "Chair à canon");
for (const cat of reference.mercenaryProfile.categories) {
  const row = titles.rows.find(r => r.code === cat.code);
  assert.ok(row, "niveau et infobulle pour " + cat.nom);
  assert.equal(row.paliers.m.length, 5, cat.nom);
  row.paliers.m.forEach(x => filled(x, cat.nom));
  assert.equal(row.paliers_place.length, 5, cat.nom + " : place de chaque mot de niveau");
  row.paliers_place.forEach(x => assert.ok(["avant", "fin"].includes(x), cat.nom + " : " + x));
  twoLines(row.infobulle.m, cat.nom);
  for (const spec of row.specialites) {
    assert.ok(cat.sous.some(s => s.code === spec.code), "sous-catégorie inconnue : " + spec.code);
    twoLines(spec.infobulle.m, cat.nom + " · " + spec.code);
  }
  // Chaque rôle sait s'écrire : par l'arme, ou par son mot par défaut.
  const role = titles.roles[cat.code];
  assert.ok(role && (role.arme || role.defaut), "rôle écrit : " + cat.nom);
  for (const code of Object.keys(role.sous || {})) assert.ok(cat.sous.some(s => s.code === code), cat.nom + " : " + code);
}
// Les mots qui ne se lisent pas avant l'arme vont à la fin (« Meneur au fouet à la grosse voix »).
for (const row of titles.rows) row.paliers.m.forEach((word, i) => {
  if (/^(qu|qui |à |aux )/.test(word)) assert.equal(row.paliers_place[i], "fin", row.code + " : " + word);
});
// Une entrée par arme qui frappe (les boucliers ne portent pas de rôle de dégâts), avec son complément.
const weaponNames = reference.weapons.rows.filter(w => !/Boucliers/.test(w.domaine)).map(w => w.nom);
assert.deepEqual(Object.keys(titles.armes).filter(k => k !== "description").sort(), [...weaponNames].sort());
for (const name of weaponNames) {
  const entry = titles.armes[name];
  filled(entry.titre, name);
  assert.match(entry.complement, /^(à|au|aux) /, name);
  if (entry.apres) assert.match(entry.apres, /^(à|au|aux) /, name);
}
for (const code of ["deux_armes", "deux_mains", "categorie", "bouclier", "une_main", "tir"]) filled(titles.styles[code]?.titre, code);
// Chaque école qui a un sort d'un rôle a son mot pour ce rôle (sinon le mot du rôle, sans école).
const profileData = reference.mercenaryProfile;
const spellCategory = spell => {
  const key = ["invocation", "resurrection"].includes(spell.effet) ? profileData.creatures[spell.creature] : profileData.sorts[spell.code];
  return key ? key.split(".") : null;
};
for (const spell of reference.spells.rows) {
  const [cat, sub] = spellCategory(spell) || [];
  if (!["healer", "buffer", "controleur", "dps_magie", "summoner"].includes(cat)) continue;
  const bySchool = titles.roles[cat].ecoles?.[spell.ecole];
  assert.ok(bySchool?.titre || bySchool?.[sub], cat + " · " + spell.ecole + " (" + spell.nom + ")");
}

// ---- Composition ----
const random = (() => { let seed = 7; return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); })();
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const engine = createCombatEngine(reference, {});
const magic = createMagicRules({reference, combat: engine});
const profile = createProfileRules({reference, engine, magic});
const captain = generator.createCaptain({id: 1});
const base = generator.createMercenary({id: 2, captain});
const role = (category, level, code, source) => ({category, categoryName: category, level, top: {code, source}});
const title = (character, list, context = {}) => profile.composeTitle(character, {titles: list, cannonFodder: !list.length}, context).name;

assert.equal(title(base, []), "Chair à canon");
assert.equal(title(base, [role("eclaireur", 5, "vigie", "perception")]), "Guetteur en herbe");
assert.equal(title(base, [role("eclaireur", 9, "vigie", "perception")]), "Guetteur qui voit tout");
// Trois rôles : « et » avant le dernier.
assert.equal(title(base, [role("eclaireur", 5, "vigie", "perception"), role("tank", 5, "esquiveur", "esquive"), role("meneur", 4, "demoralisateur", "intimidation")]),
  "Guetteur insaisissable et intimidateur en herbe");
assert.equal(title(base, [role("tank", 7, "auto_soigneur", "potions_soin"), role("eclaireur", 6, "infiltrateur", "discretion")]), "Increvable rôdeur rembourré");
// L'aura : capitaine ou lieutenant, Chef de guerre ; sinon elle vient du fouet.
assert.equal(title(base, [role("meneur", 5, "soutien", "aura")], {captain: true}), "Chef de guerre en herbe");
assert.equal(title(base, [role("meneur", 7, "soutien", "aura")]), "Meneur au fouet à la grosse voix");

// Avec ses armes.
const weaponItem = (id, name) => ({id, name, itemType: "weapon", tier: 1, qualityCode: "standard",
  category: reference.weapons.rows.find(w => w.nom === name).domaine.split(",")[0].trim()});
const armed = (slots) => ({...base, items: [...base.items.filter(i => i.itemType !== "weapon"), ...Object.entries(slots).map(([slot, name]) => weaponItem(slot, name))],
  equipment: {...base.equipment, slots: {...base.equipment.slots, weapon_set_1_main: null, weapon_set_1_off: null, weapon_set_2_main: null, weapon_set_2_off: null,
    ...Object.fromEntries(Object.keys(slots).map(slot => [slot, slot]))}}});
const club = armed({weapon_set_1_main: "Massue"});
assert.equal(title(club, [role("dps_cac", 4, "perce_armure", "contact_lourd")]), "Assommeur en herbe à la massue", "le mot de niveau avant l'arme");
assert.equal(title(club, [role("dps_cac", 9, "perce_armure", "contact_lourd")]), "Assommeur à la massue qu'on évite", "« qu'on évite » à la fin");
assert.equal(title(club, [role("eclaireur", 5, "vigie", "perception"), role("dps_cac", 5, "perce_armure", "contact_lourd")]), "Guetteur en herbe à la massue",
  "l'arme d'un second rôle en complément");
assert.equal(title(armed({weapon_set_1_main: "Épée longue"}), [role("dps_cac", 5, "foules", "contact_leger"), role("tank", 5, "esquiveur", "esquive")]), "Épéiste insaisissable en herbe");
assert.equal(title(armed({weapon_set_1_main: "Arc"}), [role("dps_distance", 5, "foules", "tir_leger"), role("eclaireur", 5, "vigie", "perception")]), "Archer éclaireur en herbe");
assert.equal(title(armed({weapon_set_1_main: "Épée longue", weapon_set_1_off: "Dague"}), [role("dps_cac", 5, "foules", "contact_leger")]), "Ambidextre en herbe",
  "deux armes différentes dans les mains");
assert.equal(title(armed({weapon_set_1_main: "Dague", weapon_set_1_off: "Dague"}), [role("dps_cac", 5, "foules", "contact_leger")]), "Poignardeur en herbe");
assert.equal(title(armed({weapon_set_1_main: "Dague"}), [role("dps_cac", 5, "assassin", "assassin")]), "Assassin en herbe", "la dague va de soi");
assert.equal(title(armed({weapon_set_1_main: "Kukri"}), [role("dps_cac", 5, "assassin", "assassin")]), "Assassin en herbe au kukri");
assert.equal(title(armed({weapon_set_1_main: "Hallebarde"}), [role("dps_cac", 5, "foules", "contact_leger"), role("tank", 5, "gardien_ligne", "contre_charge")]),
  "Hallebardier piquier en herbe");
const shielded = armed({weapon_set_1_main: "Épée longue", weapon_set_1_off: "Écu"});
assert.equal(title(shielded, [role("tank", 5, "inblessable", "encaisser")]), "Rempart en herbe");
assert.equal(title(club, [role("tank", 5, "inblessable", "encaisser")]), "Cuirassé en herbe");

// Avec ses sorts : l'école du meilleur sort de la sous-catégorie.
const spellOf = code => { const s = reference.spells.rows.find(r => r.code === code); return {code, name: s.nom, school: s.ecole, mastery: 40}; };
const mage = {...base, skills: {...base.skills, magic: {...base.skills.magic, Foudre: 60, Vie: 60, Feu: 60}},
  spells: [spellOf("paralysis"), spellOf("lightning_bolt"), spellOf("quick_heal"), spellOf("flaming_weapon")]};
assert.equal(title(mage, [role("controleur", 6, "boss", "sorts:controleur.boss")]), "Mage de Foudre paralyseur agaçant");
assert.equal(title(mage, [role("dps_magie", 5, "tueur", "sorts:dps_magie.tueur"), role("controleur", 5, "boss", "sorts:controleur.boss")]),
  "Mage de Foudre paralyseur en herbe");
assert.equal(title(mage, [role("controleur", 5, "boss", "sorts:controleur.boss"), role("dps_magie", 5, "tueur", "sorts:dps_magie.tueur")]),
  "Mage de Foudre paralyseur en herbe", "les dégâts d'une école déjà nommée ne se répètent pas");
assert.equal(title(mage, [role("healer", 9, "urgentiste", "sorts:healer.urgentiste")]), "Guérisseur aux doigts de fée");
assert.equal(title(mage, [role("buffer", 5, "dps", "sorts:buffer.dps"), role("healer", 5, "urgentiste", "sorts:healer.urgentiste")]), "Forgeflamme guérisseur en herbe");

// ---- Sur de vraies recrues : un titre, propre, avec son infobulle ----
let titled = 0;
const names = new Set();
for (let i = 0; i < 300; i++) {
  const m = generator.createMercenary({id: i + 3, captain});
  const result = profile.evaluate(m);
  const copy = profile.composeTitle(m, result, {});
  assert.ok(copy && copy.name, "un titre");
  assert.doesNotMatch(copy.name, /\s{2}|^\s|\s$|undefined|null|\{/, copy.name);
  const words = copy.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  assert.equal(new Set(words).size, words.length, "pas de mot répété : " + copy.name);
  twoLines(copy.lines, copy.name);
  if (!result.cannonFodder) { titled++; names.add(copy.name); }
}
assert.ok(titled > 50, "des recrues ont un titre : " + titled);
assert.ok(names.size > 30, "des titres variés : " + names.size);
assert.equal(createProfileRules({reference: {...reference, mercenaryTitles: undefined}, engine}).composeTitle(base, profile.evaluate(base)), null, "sans données, pas de titre");

// ---- Fiche : un seul titre, pas d'étoiles, pas de petite ligne ----
const ui = fs.readFileSync(path.join(ROOT, "prototype-web", "ui.js"), "utf8");
const render = ui.slice(ui.indexOf("function renderEvaluation("), ui.indexOf("function renderProfileTab("));
assert.match(render, /rules\.composeTitle\?\.\(c,result,context\)/);
assert.doesNotMatch(render, /renderStarLevel|sheet-eval-spec|spécialité/);
assert.match(render, /copy\.lines\.map\(line=>`<em>\$\{esc\(line\)\}<\/em>`\)/);
console.log("Titres v3 : " + weaponNames.length + " armes, 10 rôles, titres composés — OK (" + titled + " recrues titrées, " + names.size + " titres différents)");
