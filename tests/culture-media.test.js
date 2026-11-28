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
assert.deepEqual(table.fichiers, {barreHaut: "Barre_haut.png", picto: "picto.png", ux: "ux.png", play: "play.png"});
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

// Les barres du camp (Idan, 2026-11-28 : « ux contient le bas et le haut dernière version » ; « on adapte le CSS pour que
// ça marche ») : avec son ux.png, la culture montre l'image d'Idan dans les deux barres (à la place du pack et du kit), son
// play.png dans le bouton, et place textes, bouton et pictos sur le gabarit ; sans, rien ne change.
{
  const html = read("prototype-web/index.html"), css = read("prototype-web/styles.css"), js = read("prototype-web/screen-ui.js");
  assert.match(html, /<script src="culture-media\.js"><\/script>\s*<script src="hud-kit-ui\.js"><\/script>\s*<script src="screen-ui\.js"><\/script>/);
  assert.equal((html.match(/<div class="hud-media" aria-hidden="true"><\/div>/g) || []).length, 2, "une couche par barre");
  assert.match(css, /\.game-top-bar \.hud-media\{top:0;background-position:0 0\}/);
  assert.match(css, /\.game-bottom-bar \.hud-media\{bottom:0;background-position:0 100%\}/);
  assert.match(css, /\.is-media \.hud-bar-art,\.is-media \.hud-kit\{display:none\}/);
  const start = js.indexOf("const HUD_BAR_PIECES=");
  const hud = new Function("document", "HUD_BARS", "hudKitFor", "hudKitBars", "cultureMediaUrl",
    js.slice(start, js.indexOf("// Le nom de la compagnie tient dans sa place", start)) + "return {applyHudBar,HUD_MEDIA_LAYOUT};");
  const fakeEl = () => {
    const el = {props: {}, classes: new Set(), media: {style: {}}, layer: {innerHTML: "x"}, pieces: {center: {style: {}}, right: {style: {}}}};
    el.style = {setProperty: (k, v) => { el.props[k] = v; }, removeProperty: k => { delete el.props[k]; }};
    el.classList = {toggle: (c, on) => on ? el.classes.add(c) : el.classes.delete(c)};
    el.querySelector = sel => sel === ".hud-media" ? el.media : sel === ".hud-kit" ? el.layer : el.pieces[sel.replace(".hud-bar-", "")] || null;
    return el;
  };
  const topBar = fakeEl(), bottomBar = fakeEl(), rootProps = {};
  const ornament = {attrs: {}, hidden: false, setAttribute(k, v) { this.attrs[k] = v; }};
  const play = {attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }};
  const doc = {documentElement: {style: {setProperty: (k, v) => { rootProps[k] = v; }, removeProperty: k => { delete rootProps[k]; }}},
    querySelector: sel => ({".game-top-bar": topBar, ".game-bottom-bar": bottomBar, ".hud-ornament": ornament, ".hud-play-img": play})[sel] || null};
  const files = {ux: "/media/cultures/elfes/elfes_sylvains/ux.png?v=7", play: "/media/cultures/elfes/elfes_sylvains/play.png?v=7"};
  const ui = hud(doc, {"elfes-sylvains": {h: 90}}, () => ({}), () => { throw new Error("pas de kit"); },
    (culture, kind) => culture === "elfes-sylvains" ? files[kind] || null : null);
  ui.applyHudBar("elfes-sylvains");
  assert.ok(topBar.classes.has("is-media") && bottomBar.classes.has("is-media") && bottomBar.classes.has("is-media-play"));
  assert.ok(!topBar.classes.has("has-art") && !topBar.classes.has("has-kit") && !bottomBar.classes.has("has-ornament"), "ni pack ni kit");
  assert.deepEqual([topBar.media.style.backgroundImage, bottomBar.media.style.backgroundImage], [`url("${files.ux}")`, `url("${files.ux}")`]);
  assert.deepEqual([play.attrs.src, ornament.hidden], [files.play, true]);
  const near = (a, b) => assert.ok(Math.abs(Number(a) - b) < 1e-3, `${a} ≈ ${b}`);
  near(rootProps["--ht-barre"], 96 / 163.2); near(rootProps["--ht-gauche"], 250 / 96); near(rootProps["--bb-bouton"], 176 / 163.2);
  near(rootProps["--bb-centre"], 172 / 163.2); near(rootProps["--bb-pictos-droite"], 520 / 163.2);
  ui.applyHudBar("orcs-noirs");
  assert.ok(!topBar.classes.has("is-media") && !bottomBar.classes.has("is-media-play") && topBar.media.style.backgroundImage === "", "une autre culture : rien");
}

console.log("culture-media : ok");
