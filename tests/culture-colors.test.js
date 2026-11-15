"use strict";

// Couleurs des cultures (Idan, 2026-11-15 : « tu reprends les textures des 32 cultures, on fait une table couleur par
// culture. On s'en servira à plein d'endroits ») : data/reference/culture-colors.json, généré par
// scripts/build-culture-colors.js depuis la texture de la barre de chaque culture.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"));
const table = read("culture-colors.json");
const cultures = read("cultures.json").rows.map(row => row.nom);
const HUD_BARS = new Function(fs.readFileSync(path.join(ROOT, "prototype-web/hud-bars.js"), "utf8") + "\nreturn HUD_BARS;")();
const COLORS = ["texture", "sombre", "moyen", "vif", "clair", "pale", "bijou", "texte"];

// Une ligne par culture, dans l'ordre de cultures.json, avec le dossier de sa barre.
assert.equal(table.row_count, 32);
assert.deepEqual(table.rows.map(row => row.nom), cultures);
for (const row of table.rows) {
  assert.equal(HUD_BARS[row.cle]?.culture, row.nom, row.nom + " : dossier de sa barre");
  assert.ok(fs.existsSync(path.join(ROOT, "prototype-web/assets/hud/barres", row.cle, "center.webp")), row.nom);
  for (const key of COLORS) assert.match(row[key], /^#[0-9a-f]{6}$/, `${row.nom} : ${key}`);
  assert.ok(row.teinte >= 0 && row.teinte < 360 && row.saturation >= 0 && row.saturation <= 70, row.nom);
}

// La gamme : la même teinte, du plus sombre au plus pâle.
const luminance = color => { const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
for (const row of table.rows) {
  const ramp = ["texture", "sombre", "moyen", "vif", "clair", "pale"].map(key => luminance(row[key]));
  for (let i = 1; i < ramp.length; i++) assert.ok(ramp[i] > ramp[i - 1], `${row.nom} : la gamme monte`);
}

// Le texte posé sur ces textures sombres : la réserve du parchemin de la fiche au survol.
const css = fs.readFileSync(path.join(ROOT, "prototype-web/styles.css"), "utf8");
const parchment = css.match(/--hc-parchemin:(#[0-9a-f]{6})/)[1];
for (const row of table.rows) assert.equal(row.texte, parchment, row.nom);

// Chargée par le jeu (game.referenceData.cultureColors) et rangée au catalogue.
assert.match(fs.readFileSync(path.join(ROOT, "prototype-web/reference-data.js"), "utf8"), /cultureColors: "culture-colors\.json"/);
assert.match(fs.readFileSync(path.join(ROOT, "data/reference/CATALOG.md"), "utf8"), /\| culture-colors\.json \| 32 \|/);

console.log(`Couleurs des cultures : ${table.rows.length} cultures, ${table.rows.filter(row => row.saturation === 0).length} textures grises — OK`);
