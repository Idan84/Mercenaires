#!/usr/bin/env node
"use strict";

// Couleurs des cultures (Idan, 2026-11-15 : « tu reprends les textures des 32 cultures, on fait une table couleur par
// culture. On s'en servira à plein d'endroits » ; puis « 1 seule couleur par culture. Un seul code hexa » ; puis « c'est
// trop sombre. Il nous faut un ton moyen / clair de la barre. C'est pas grave si certains sont identiques ou très
// proches »). Pour chaque culture : la couleur moyenne de la texture de sa barre (prototype-web/assets/hud/barres/<cle>/
// center.webp, la bande de bandTop à bandBottom rognée de 8 % en haut et en bas, comme le fond du cartouche du nom de la
// fiche au survol), mesurée par ImageMagick, puis montée à un ton moyen : même teinte, luminosité OKLab 0,55 pour toutes,
// couleur (chroma) multipliée d'autant, bornée. Les barres grises donnent le même gris. Écrit
// data/reference/culture-colors.json.
//
// Usage : node scripts/build-culture-colors.js

const fs = require("fs");
const path = require("path");
const {execFileSync} = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const HUD_BARS = new Function(fs.readFileSync(path.join(ROOT, "prototype-web/hud-bars.js"), "utf8") + "\nreturn HUD_BARS;")();
const TEXTURE_INSET = 0.08; // comme HOVER_TEXTURE_INSET (prototype-web/hover-card-ui.js)
const TONE_L = 0.55;        // la luminosité du ton moyen (OKLab, de 0 noir à 1 blanc)
const TONE_MAX_C = 0.14;    // la chroma la plus forte, pour ne pas criarder
// Les couleurs choisies par Idan, qui priment sur le calcul : celles des cultures refaites avec leur kit graphique
// (Idan, 2026-11-16, Elfes noirs : « on peut changer leurs couleurs », puis l'aubergine dans sa planche de la fiche).
const CHOICES = {"elfes-noirs": "#5b2463"};

// OKLab (Björn Ottosson) : sRGB ↔ L (luminosité), C (chroma), h (teinte).
const toLinear = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const toSrgb = v => { v = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, v)) * 255); };
function hexToOklch(hex) {
  const [r, g, b] = [1, 3, 5].map(i => toLinear(parseInt(hex.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return {L, C: Math.hypot(A, B), h: Math.atan2(B, A)};
}
function oklchToHex({L, C, h}) {
  const A = C * Math.cos(h), B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  return "#" + rgb.map(v => toSrgb(v).toString(16).padStart(2, "0")).join("");
}
// Le ton moyen d'une couleur sombre : même teinte, luminosité TONE_L, chroma multipliée d'autant (bornée, et baissée tant
// que la couleur sort de ce qu'un écran sait afficher).
function midTone(hex, L = TONE_L, maxC = TONE_MAX_C) {
  const dark = hexToOklch(hex);
  let C = Math.min(maxC, dark.C * (L / Math.max(dark.L, 0.05)));
  for (let i = 0; i < 40; i++) {
    const out = oklchToHex({L, C, h: dark.h});
    if (Math.abs(hexToOklch(out).C - C) < 0.006) return out;
    C *= 0.92;
  }
  return oklchToHex({L, C, h: dark.h});
}

// La couleur moyenne de la bande de texture d'une culture.
function textureColor(key, bar) {
  const inset = (bar.bandBottom - bar.bandTop) * TEXTURE_INSET;
  const top = Math.round(bar.bandTop + inset), height = Math.round(bar.bandBottom - bar.bandTop - 2 * inset);
  const image = path.join(ROOT, "prototype-web/assets/hud/barres", key, "center.webp");
  const value = execFileSync("convert", [image, "-crop", `${bar.center}x${height}+0+${top}`, "+repage", "-alpha", "off",
    "-resize", "1x1!", "-format", "%[hex:p{0,0}]", "info:"], {encoding: "utf8"}).trim().slice(0, 6);
  return "#" + value.toLowerCase();
}

// Aussi utilisé par scripts/build-charte.js (les trois tons de chaque culture de la charte).
if (require.main !== module) { module.exports = {HUD_BARS, CHOICES, textureColor, midTone, hexToOklch, oklchToHex}; return; }

const cultures = JSON.parse(fs.readFileSync(path.join(ROOT, "data/reference/cultures.json"), "utf8")).rows.map(row => row.nom);
const rows = cultures.map(nom => {
  const key = Object.keys(HUD_BARS).find(k => HUD_BARS[k].culture === nom);
  if (!key) throw new Error("pas de barre pour la culture " + nom);
  return {nom, cle: key, couleur: CHOICES[key] || midTone(textureColor(key, HUD_BARS[key]))};
});

const table = {
  schema_version: 1,
  name: "culture-colors",
  description: "Couleur des cultures (Idan, 2026-11-15 : « une table couleur par culture. On s'en servira à plein d'endroits », « 1 seule couleur par culture. Un seul code hexa », « il nous faut un ton moyen / clair de la barre ») : un ton moyen de la texture de la barre de chaque culture (sa couleur moyenne, de la bande du milieu, montée à la même luminosité pour toutes, OKLab 0,55, en gardant sa teinte) ; sauf les couleurs choisies par Idan pour les cultures refaites avec leur kit graphique (Elfes noirs). Généré par scripts/build-culture-colors.js ; ne pas modifier à la main.",
  columns: [
    {key: "nom", source: "Culture (cultures.json)"},
    {key: "cle", source: "Dossier de sa barre : prototype-web/assets/hud/barres/<cle>/"},
    {key: "couleur", source: "Ton moyen de la texture de sa barre, ou la couleur choisie par Idan (code hexadécimal)"}
  ],
  rows,
  row_count: rows.length
};
fs.writeFileSync(path.join(ROOT, "data/reference/culture-colors.json"), JSON.stringify(table, null, 2) + "\n");
console.log(`${rows.length} cultures : data/reference/culture-colors.json`);
