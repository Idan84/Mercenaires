"use strict";

// Les images de chaque culture déposées par Idan sur Hostinger (2026-11-27 : « Enregistre les chemins par Culture et les
// noms des fichiers. Je veux que le jeu aille chercher directement dedans ») : data/reference/culture-media.json,
// lu par prototype-web/culture-media.js avec l'index api/cultures.php.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const table = JSON.parse(read("data/reference/culture-media.json"));
const cultures = JSON.parse(read("data/reference/cultures.json")).rows.map(row => row.nom);
const colors = JSON.parse(read("data/reference/culture-colors.json")).rows;
const {cultureMediaKey, cultureMediaResolve} = require(path.join(ROOT, "prototype-web/culture-media.js"));

// Un dossier par culture, les 32, sous media/cultures/<peuple>/<culture>/, en minuscules sans accents ; le premier,
// celui d'Idan : elfes/elfes_sylvains. La clé est celle du jeu (la même que culture-colors.json).
assert.equal(table.base, "media/cultures");
assert.deepEqual(table.fichiers, {barreHaut: "Barre_haut.png", picto: "picto.png"});
assert.equal(table.row_count, 32);
assert.deepEqual(table.rows.map(row => row.nom).sort(), [...cultures].sort());
assert.equal(new Set(table.rows.map(row => row.dossier)).size, 32);
for (const row of table.rows) {
  assert.match(row.dossier, /^[a-z]+(?:_[a-z]+)*\/[a-z0-9]+(?:_[a-z0-9]+)*$/, row.nom);
  assert.equal(row.cle, colors.find(color => color.nom === row.nom).cle, row.nom);
  assert.equal(row.cle, cultureMediaKey(row.nom), row.nom);
}
assert.equal(table.rows.find(row => row.nom === "Elfes sylvains").dossier, "elfes/elfes_sylvains");
assert.match(read("data/reference/CATALOG.md"), /\| culture-media\.json \| 32 \| nom, cle, dossier /);

// L'adresse : le dossier de la culture (par son nom ou sa clé), le nom du fichier, majuscules indifférentes, la date de
// l'index pour passer le cache ; rien si l'image n'est pas déposée, si l'index manque ou pour un fichier inconnu.
const index = {base: "media/cultures", files: [
  {path: "elfes/elfes_sylvains/Barre_haut.png", v: 1764255000},
  {path: "Elfes/Elfes_Noirs/PICTO.png", v: 42}
]};
assert.equal(cultureMediaResolve(table, index, "Elfes sylvains", "barreHaut"), "/media/cultures/elfes/elfes_sylvains/Barre_haut.png?v=1764255000");
assert.equal(cultureMediaResolve(table, index, "elfes-sylvains", "barreHaut"), "/media/cultures/elfes/elfes_sylvains/Barre_haut.png?v=1764255000");
assert.equal(cultureMediaResolve(table, index, "Elfes noirs", "picto"), "/media/cultures/Elfes/Elfes_Noirs/PICTO.png?v=42");
assert.equal(cultureMediaResolve(table, index, "Elfes sylvains", "picto"), null);
assert.equal(cultureMediaResolve(table, index, "Elfes sylvains", "inconnu"), null);
assert.equal(cultureMediaResolve(table, null, "Elfes sylvains", "barreHaut"), null);
assert.equal(cultureMediaResolve(null, index, "Elfes sylvains", "barreHaut"), null);
assert.equal(cultureMediaResolve(table, index, "Culture inconnue", "barreHaut"), null);

// L'index ne se garde pas en cache (la date de chaque image change quand Idan la remplace).
const php = read("prototype-web/api/cultures.php");
assert.match(php, /avatar_find_dir\(\$site, \['media', 'cultures'\]\)/);
assert.match(php, /Cache-Control: no-cache/);

console.log("culture-media : ok");
