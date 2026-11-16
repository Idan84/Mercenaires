"use strict";

// Couleur des cultures (Idan, 2026-11-15 : « une table couleur par culture », « 1 seule couleur par culture. Un seul code
// hexa ») : data/reference/culture-colors.json, généré par scripts/build-culture-colors.js depuis la texture de la barre
// de chaque culture.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"));
const table = read("culture-colors.json");
const cultures = read("cultures.json").rows.map(row => row.nom);
const HUD_BARS = new Function(fs.readFileSync(path.join(ROOT, "prototype-web/hud-bars.js"), "utf8") + "\nreturn HUD_BARS;")();
const {CHOICES} = require(path.join(ROOT, "scripts/build-culture-colors.js"));

// Une ligne par culture, dans l'ordre de cultures.json : le dossier de sa barre et un seul code hexa.
assert.equal(table.row_count, 32);
assert.deepEqual(table.rows.map(row => row.nom), cultures);
assert.deepEqual(table.columns.map(column => column.key), ["nom", "cle", "couleur"]);
for (const row of table.rows) {
  assert.deepEqual(Object.keys(row), ["nom", "cle", "couleur"], row.nom);
  assert.equal(HUD_BARS[row.cle]?.culture, row.nom, row.nom + " : dossier de sa barre");
  assert.ok(fs.existsSync(path.join(ROOT, "prototype-web/assets/hud/barres", row.cle, "center.webp")), row.nom);
  assert.match(row.couleur, /^#[0-9a-f]{6}$/, row.nom);
  // Les couleurs choisies par Idan (cultures refaites avec leur kit graphique) priment, telles quelles.
  if (CHOICES[row.cle]) { assert.equal(row.couleur, CHOICES[row.cle], row.nom + " : couleur choisie par Idan"); continue; }
  // Un ton moyen, pas la couleur sombre de la barre (« il nous faut un ton moyen / clair de la barre ») : ni noir ni blanc.
  const [r, g, b] = [1, 3, 5].map(i => parseInt(row.couleur.slice(i, i + 2), 16));
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  assert.ok(luma > 90 && luma < 150, `${row.nom} : ${row.couleur}, luminosité ${luma.toFixed(0)}`);
}
assert.match(fs.readFileSync(path.join(ROOT, "data/reference/CATALOG.md"), "utf8"), /\| culture-colors\.json \| 32 \| nom, cle, couleur /);

assert.equal(table.rows.find(row => row.cle === "elfes-noirs").couleur, "#5b2463", "Elfes noirs : l'aubergine de la planche d'Idan");
console.log(`Couleur des cultures : ${table.rows.length} cultures, un code hexa chacune — OK`);
