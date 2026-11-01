"use strict";

// Titres écrits (Idan, 2026-11-01) : le mot du rôle, toujours le même (« Soigneur »), puis un mot décalé selon le palier
// d'étoiles (4–5, 6–8, 9–10, 11–14, 15) ; un titre spécialisé ajoute « spécialité : … » ; l'infobulle donne deux lignes
// sur le rôle ou la spécialité ; masculin et féminin écrits à la main. Le titre brut n'est plus montré.
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

// Données : une ligne par catégorie, une spécialité par sous-catégorie notée ; mot, 5 paliers, 2 lignes, au masculin
// et au féminin.
assert.deepEqual(titles.paliers, [4, 6, 9, 11, 15]);
assert.equal(titles.row_count, titles.rows.length);
const filled = (value, label) => assert.ok(typeof value === "string" && value.trim() === value && value.length > 1, label);
const both = (pair, label, check) => { for (const g of ["m", "f"]) check(pair?.[g], label + " (" + g + ")"); };
const twoLines = (pair, label) => both(pair, label, (lines, l) => { assert.equal(lines?.length, 2, l); lines.forEach(x => filled(x, l)); });
both(titles.chair_a_canon.titre, "Chair à canon", filled);
twoLines(titles.chair_a_canon.infobulle, "Chair à canon");
for (const cat of reference.mercenaryProfile.categories) {
  const row = titles.rows.find(r => r.code === cat.code);
  assert.ok(row, "titre écrit pour " + cat.nom);
  both(row.mot, cat.nom, filled);
  both(row.paliers, cat.nom, (list, l) => { assert.equal(list?.length, 5, l); list.forEach(x => filled(x, l)); assert.equal(new Set(list).size, 5, l + " : cinq mots différents"); });
  twoLines(row.infobulle, cat.nom);
  for (const sub of cat.sous.filter(s => !s.a_venir)) {
    const spec = row.specialites.find(s => s.code === sub.code);
    assert.ok(spec, "spécialité écrite pour " + cat.nom + " · " + sub.nom);
    both(spec.etiquette, sub.nom, filled);
    twoLines(spec.infobulle, cat.nom + " · " + sub.nom);
  }
  for (const spec of row.specialites) assert.ok(cat.sous.some(s => s.code === spec.code), "spécialité inconnue : " + spec.code);
}
// Les infobulles décrivent le rôle, sans dire au joueur quoi faire (Idan) : pas de « à garder », « à placer »…
const allLines = [titles.chair_a_canon, ...titles.rows, ...titles.rows.flatMap(r => r.specialites)]
  .flatMap(x => [...x.infobulle.m, ...x.infobulle.f]);
for (const line of allLines) assert.doesNotMatch(line, /^À (garder|placer|mettre|envoyer|protéger)|\b(placez|gardez|mettez|envoyez)\b/i, line);

// Paliers et textes.
const random = (() => { let seed = 7; return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); })();
const generator = createGenerator(reference, {random, nameGenerator: (people, id) => people + " " + id});
const engine = createCombatEngine(reference, {});
const profile = createProfileRules({reference, engine, magic: createMagicRules({reference, combat: engine})});
assert.deepEqual([4, 5, 6, 8, 9, 10, 11, 14, 15].map(profile.tierIndex), [0, 0, 1, 1, 2, 2, 3, 3, 4]);
const healer = {category: "healer", level: 7, sub: null};
assert.deepEqual(profile.titleCopy(healer), {name: "Soigneur de garde", specialty: null,
  lines: ["Ferme les plaies, recolle les doigts et rend leurs couleurs aux mourants.", "Ses compagnons l'adorent, surtout quand ils saignent."]});
assert.equal(profile.titleCopy({...healer, level: 15}, {female: true}).name, "Soigneuse miraculeuse");
const dodger = profile.titleCopy({category: "tank", level: 12, sub: {code: "esquiveur"}}, {female: true});
assert.equal(dodger.name, "Encaisseuse inébranlable");
assert.equal(dodger.specialty, "esquive");
assert.match(dodger.lines[1], /elle non plus/);
assert.equal(profile.titleCopy({category: "tank", level: 4, sub: {code: "auto_soigneur"}}, {female: true}).specialty, "se soigne toute seule");
assert.equal(profile.titleCopy(null).name, "Chair à canon");
assert.equal(createProfileRules({reference: {...reference, mercenaryTitles: undefined}, engine}).titleCopy(healer), null, "sans données, le nom brut");

// Sur de vraies recrues : chaque titre a son texte.
let written = 0;
const captain = generator.createCaptain({id: 1});
for (let i = 0; i < 150; i++) {
  const m = generator.createMercenary({id: i + 2, captain});
  const result = profile.evaluate(m);
  for (const t of result.titles) {
    const copy = profile.titleCopy(t, {female: /^f/i.test(m.sex || "")});
    assert.ok(copy && copy.name && copy.lines.length === 2, t.label);
    assert.equal(Boolean(copy.specialty), Boolean(t.sub), t.label);
    written++;
  }
}
assert.ok(written > 30, "des titres sur les recrues : " + written);

// Fiche : titre écrit, ligne de spécialité, infobulle de deux lignes ; le nom brut seulement sans les données.
const ui = fs.readFileSync(path.join(ROOT, "prototype-web", "ui.js"), "utf8");
assert.match(ui, /rules\.titleCopy\?\.\(t,\{female\}\)/);
assert.match(ui, /<small class="sheet-eval-spec">spécialité : \$\{esc\(copy\.specialty\)\}<\/small>/);
assert.match(ui, /copy\.lines\.map\(line=>`<em>\$\{esc\(line\)\}<\/em>`\)/);
console.log("Titres écrits : 10 rôles, " + titles.rows.reduce((n, r) => n + r.specialites.length, 0) + " spécialités, masculin et féminin — OK (" + written + " titres de recrues)");
