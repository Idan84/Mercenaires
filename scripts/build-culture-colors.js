#!/usr/bin/env node
"use strict";

// Couleurs des cultures (Idan, 2026-11-15 : « tu reprends les textures des 32 cultures, on fait une table couleur par
// culture. On s'en servira à plein d'endroits » ; puis « 1 seule couleur par culture. Un seul code hexa »). Pour chaque
// culture : la couleur moyenne de la texture de sa barre (prototype-web/assets/hud/barres/<cle>/center.webp, la bande
// de bandTop à bandBottom rognée de 8 % en haut et en bas, comme le fond du cartouche du nom de la fiche au survol),
// mesurée par ImageMagick. Écrit data/reference/culture-colors.json.
//
// Usage : node scripts/build-culture-colors.js

const fs = require("fs");
const path = require("path");
const {execFileSync} = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const HUD_BARS = new Function(fs.readFileSync(path.join(ROOT, "prototype-web/hud-bars.js"), "utf8") + "\nreturn HUD_BARS;")();
const TEXTURE_INSET = 0.08; // comme HOVER_TEXTURE_INSET (prototype-web/hover-card-ui.js)

// La couleur moyenne de la bande de texture d'une culture.
function textureColor(key, bar) {
  const inset = (bar.bandBottom - bar.bandTop) * TEXTURE_INSET;
  const top = Math.round(bar.bandTop + inset), height = Math.round(bar.bandBottom - bar.bandTop - 2 * inset);
  const image = path.join(ROOT, "prototype-web/assets/hud/barres", key, "center.webp");
  const value = execFileSync("convert", [image, "-crop", `${bar.center}x${height}+0+${top}`, "+repage", "-alpha", "off",
    "-resize", "1x1!", "-format", "%[hex:p{0,0}]", "info:"], {encoding: "utf8"}).trim().slice(0, 6);
  return "#" + value.toLowerCase();
}

const cultures = JSON.parse(fs.readFileSync(path.join(ROOT, "data/reference/cultures.json"), "utf8")).rows.map(row => row.nom);
const rows = cultures.map(nom => {
  const key = Object.keys(HUD_BARS).find(k => HUD_BARS[k].culture === nom);
  if (!key) throw new Error("pas de barre pour la culture " + nom);
  return {nom, cle: key, couleur: textureColor(key, HUD_BARS[key])};
});

const table = {
  schema_version: 1,
  name: "culture-colors",
  description: "Couleur des cultures (Idan, 2026-11-15 : « une table couleur par culture. On s'en servira à plein d'endroits », « 1 seule couleur par culture. Un seul code hexa ») : la couleur moyenne de la texture de la barre de chaque culture (la bande du milieu, comme le fond du cartouche du nom de la fiche au survol). Généré par scripts/build-culture-colors.js ; ne pas modifier à la main.",
  columns: [
    {key: "nom", source: "Culture (cultures.json)"},
    {key: "cle", source: "Dossier de sa barre : prototype-web/assets/hud/barres/<cle>/"},
    {key: "couleur", source: "Couleur moyenne de la texture de sa barre (code hexadécimal)"}
  ],
  rows,
  row_count: rows.length
};
fs.writeFileSync(path.join(ROOT, "data/reference/culture-colors.json"), JSON.stringify(table, null, 2) + "\n");
console.log(`${rows.length} cultures : data/reference/culture-colors.json`);
