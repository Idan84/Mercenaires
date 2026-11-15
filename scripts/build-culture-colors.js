#!/usr/bin/env node
"use strict";

// Couleurs des cultures (Idan, 2026-11-15 : « tu reprends les textures des 32 cultures, on fait une table couleur par
// culture. On s'en servira à plein d'endroits »). Pour chaque culture : la bande de texture du milieu de sa barre
// (prototype-web/assets/hud/barres/<cle>/center.webp, de bandTop à bandBottom rognée de 8 % en haut et en bas, comme le
// cartouche du nom de la fiche au survol), sa couleur moyenne (ImageMagick), puis une gamme de la même teinte et de la
// même saturation, du plus sombre au plus pâle. Les textures sont très sombres et très unies : la gamme garde leur
// teinte et monte la luminosité. En plus, la couleur du bijou du bout de sa barre : sept textures sont grises (Caravanes de
// ferrailleurs, Orcs noirs, Orcs des villes, Gobelins des villes, Nains du chaos, Nains esclaves, Gnomes des villes), leur
// gamme est la même ; le bijou, lui, a la couleur de la culture. Écrit data/reference/culture-colors.json.
//
// Usage : node scripts/build-culture-colors.js

const fs = require("fs");
const path = require("path");
const {execFileSync} = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const HUD_BARS = new Function(fs.readFileSync(path.join(ROOT, "prototype-web/hud-bars.js"), "utf8") + "\nreturn HUD_BARS;")();
const TEXTURE_INSET = 0.08; // comme HOVER_TEXTURE_INSET (prototype-web/hover-card-ui.js)
const MAX_SATURATION = 0.7; // une texture presque noire peut avoir une saturation HSL extrême : on la borne
// La gamme : luminosité HSL de chaque ton.
const RAMP = [["sombre", 0.16], ["moyen", 0.3], ["vif", 0.46], ["clair", 0.7], ["pale", 0.9]];
// Le texte posé sur la texture : la réserve du parchemin (--hc-parchemin) ou l'encre, celui qui contraste le plus.
const PARCHEMIN = "#ebdfc4";
const ENCRE = "#2c1b10";

const hex = rgb => "#" + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const parse = text => [0, 2, 4].map(i => parseInt(text.replace("#", "").slice(i, i + 2), 16));

function toHsl([r, g, b]) {
  [r, g, b] = [r / 255, g / 255, b / 255];
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
function fromHsl([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
function luminance(rgb) {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// La couleur moyenne de la bande de texture d'une culture.
function textureColor(key, bar) {
  const inset = (bar.bandBottom - bar.bandTop) * TEXTURE_INSET;
  const top = Math.round(bar.bandTop + inset), height = Math.round(bar.bandBottom - bar.bandTop - 2 * inset);
  const image = path.join(ROOT, "prototype-web/assets/hud/barres", key, "center.webp");
  const value = execFileSync("convert", [image, "-crop", `${bar.center}x${height}+0+${top}`, "+repage", "-alpha", "off",
    "-resize", "1x1!", "-format", "%[hex:p{0,0}]", "info:"], {encoding: "utf8"}).trim().slice(0, 6);
  return parse(value);
}

// La couleur du bijou : le bout droit de la barre (de la fin de la bande au bord de l'embout droit, celui qu'on pose de
// chaque côté du titre de la fiche au survol), réduit à 12 couleurs ; parmi ses couleurs opaques d'au moins 2 % de ses
// pixels, la plus franche (chroma : écart entre la plus forte et la plus faible des composantes, pondéré par sa part ; le
// bois et le métal rouillé, bruns sombres, en ont peu). Sans couleur franche (chroma < 0,2) : la plus claire, le métal.
const JEWEL_COLORS = 12, JEWEL_MIN_SHARE = 0.02, JEWEL_MIN_CHROMA = 0.2;
function jewelColor(key, bar) {
  const image = path.join(ROOT, "prototype-web/assets/hud/barres", key, "right.webp");
  const histogram = execFileSync("convert", [image, "-crop", `${bar.bandRight}x${bar.h}+${bar.right - bar.bandRight}+0`, "+repage",
    "-resize", "50%", "+dither", "-colors", String(JEWEL_COLORS), "-format", "%c", "histogram:info:-"], {encoding: "utf8"});
  const tones = [...histogram.matchAll(/^\s*(\d+):\s*\(([\d.]+),([\d.]+),([\d.]+),([\d.]+)\)/gm)]
    .map(m => ({count: +m[1], rgb: [+m[2], +m[3], +m[4]], alpha: +m[5]})).filter(tone => tone.alpha > 200);
  const total = tones.reduce((sum, tone) => sum + tone.count, 0) || 1;
  const scored = tones.map(tone => ({...tone, chroma: (Math.max(...tone.rgb) - Math.min(...tone.rgb)) / 255, light: toHsl(tone.rgb)[2], share: tone.count / total}))
    .filter(tone => tone.share >= JEWEL_MIN_SHARE);
  const vivid = scored.filter(tone => tone.chroma >= JEWEL_MIN_CHROMA).sort((a, b) => b.chroma * Math.sqrt(b.share) - a.chroma * Math.sqrt(a.share))[0];
  const metal = [...scored].sort((a, b) => b.light - a.light)[0] || tones[0];
  return (vivid || metal).rgb;
}

const cultures = JSON.parse(fs.readFileSync(path.join(ROOT, "data/reference/cultures.json"), "utf8")).rows.map(row => row.nom);
const rows = cultures.map(nom => {
  const key = Object.keys(HUD_BARS).find(k => HUD_BARS[k].culture === nom);
  if (!key) throw new Error("pas de barre pour la culture " + nom);
  const texture = textureColor(key, HUD_BARS[key]);
  const [h, s] = toHsl(texture), saturation = Math.min(s, MAX_SATURATION);
  const row = {nom, cle: key, texture: hex(texture), teinte: Math.round(h), saturation: Math.round(saturation * 100)};
  for (const [name, lightness] of RAMP) row[name] = hex(fromHsl([h, saturation, lightness]));
  row.bijou = hex(jewelColor(key, HUD_BARS[key]));
  row.texte = contrast(texture, parse(PARCHEMIN)) >= contrast(texture, parse(ENCRE)) ? PARCHEMIN : ENCRE;
  return row;
});

const table = {
  schema_version: 1,
  name: "culture-colors",
  description: "Couleurs des cultures (Idan, 2026-11-15 : « tu reprends les textures des 32 cultures, on fait une table couleur par culture. On s'en servira à plein d'endroits »). Généré par scripts/build-culture-colors.js depuis la texture de la barre de chaque culture (la bande du milieu, comme le fond du cartouche du nom de la fiche au survol) : sa couleur moyenne, puis une gamme de la même teinte, du plus sombre au plus pâle ; et la couleur du bijou du bout de sa barre (beaucoup de textures sont grises ou noires, le bijou porte alors la couleur de la culture). Ne pas modifier à la main.",
  columns: [
    {key: "nom", source: "Culture (cultures.json)"},
    {key: "cle", source: "Dossier de sa barre : prototype-web/assets/hud/barres/<cle>/"},
    {key: "texture", source: "Couleur moyenne de la texture (la bande du milieu de sa barre)"},
    {key: "teinte", source: "Teinte de la texture, en degrés (HSL)"},
    {key: "saturation", source: `Saturation de la texture, en % (HSL), bornée à ${MAX_SATURATION * 100} %`},
    ...RAMP.map(([name, lightness]) => ({key: name, source: `La teinte et la saturation de la texture, luminosité ${Math.round(lightness * 100)} %`})),
    {key: "bijou", source: "Couleur du bijou du bout droit de sa barre (celui posé de chaque côté du titre de la fiche au survol) : sa couleur la plus franche, sinon son métal"},
    {key: "texte", source: `Couleur du texte posé sur la texture : la réserve du parchemin (${PARCHEMIN}) ou l'encre (${ENCRE}), la plus lisible`}
  ],
  rows,
  row_count: rows.length
};
fs.writeFileSync(path.join(ROOT, "data/reference/culture-colors.json"), JSON.stringify(table, null, 2) + "\n");
console.log(`${rows.length} cultures : data/reference/culture-colors.json`);
