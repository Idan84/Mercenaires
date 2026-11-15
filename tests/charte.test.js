"use strict";

// La charte graphique (Idan, 2026-11-15 : « il est grand temps qu'on regroupe notre charte graphique et nos images /
// icônes / svg à un endroit précis ») : le dossier charte/, rangé comme la page Design System, généré en partie par
// scripts/build-charte.js à partir du code du jeu. Ce test vérifie qu'il est à jour et complet.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const CHARTE = path.join(ROOT, "charte");
const readJson = file => JSON.parse(fs.readFileSync(path.join(CHARTE, file), "utf8"));
const {generatedFiles} = require(path.join(ROOT, "scripts/build-charte.js"));

// 1. Les fichiers générés sont à jour : une valeur changée dans le jeu (couleur, police, ombre, règle du bouton…) doit être
// reportée dans la charte (node scripts/build-charte.js).
const generated = generatedFiles();
delete generated._assets;
for (const [file, text] of Object.entries(generated)) {
  assert.equal(fs.readFileSync(path.join(CHARTE, file), "utf8"), text, `charte/${file} pas à jour : node scripts/build-charte.js`);
}

// 2. Les jetons : des listes (la forme que lit la page), des noms valides et uniques, des couleurs en hexadécimal (ou rgba).
const tokens = readJson("tokens.json");
const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const names = [];
for (const family of ["color", "shadow", "dimensions"]) {
  assert.ok(Array.isArray(tokens[family].tokens), family);
  for (const token of tokens[family].tokens) {
    assert.match(token.name, NAME, token.name);
    assert.ok(token.usage, `${token.name} : une note d'usage`);
    names.push(token.name);
  }
}
assert.equal(new Set(names).size, names.length, "noms de jetons uniques");
for (const token of tokens.color.tokens) assert.match(token.value, /^(#[0-9a-f]{6}|rgba\(\d+,\d+,\d+,[\d.]+\))$/, token.name);
assert.deepEqual(tokens.color.themes, [{id: "jeu", name: "Jeu"}]);
assert.deepEqual(Object.keys(tokens.type.families), ["titre", "texte"]);
for (const group of tokens.type.groups) for (const style of group.styles) assert.match(style.name, NAME, style.name);

// 3. Trois tons par culture ; le moyen est celui de data/reference/culture-colors.json.
const cultureColors = JSON.parse(fs.readFileSync(path.join(ROOT, "data/reference/culture-colors.json"), "utf8")).rows;
const byName = Object.fromEntries(tokens.color.tokens.map(token => [token.name, token.value]));
for (const row of cultureColors) {
  for (const tone of ["sombre", "moyen", "clair"]) assert.ok(byName[`culture-${row.cle}-${tone}`], `${row.nom} : ton ${tone}`);
  assert.equal(byName[`culture-${row.cle}-moyen`], row.couleur, `${row.nom} : ton moyen`);
}
assert.equal(tokens.color.tokens.filter(token => token.name.startsWith("culture-")).length, cultureColors.length * 3);

// 4. Les images : chaque fichier source existe (--out les copie dans les fichiers de la page).
const assets = readJson("assets.json");
assert.match(readJson("publication.json").url, /^https:\/\/claude\.ai\/artifact\//);
let count = 0;
for (const group of assets.groups) {
  assert.ok(fs.existsSync(path.join(CHARTE, "assets", group.name, "README.md")), `${group.name} : un README`);
  for (const file of group.files) {
    count++;
    if (!file.source.includes("(--")) {
      const abs = path.join(ROOT, file.source);
      assert.ok(fs.existsSync(abs), file.source);
      assert.equal(fs.statSync(abs).size, file.size, `${file.source} : taille`);
    }
  }
}

// 5. Les composants : un aperçu (le marqueur @dsCard en première ligne) et un mode d'emploi ; la couverture seule.
const components = fs.readdirSync(path.join(CHARTE, "components"), {withFileTypes: true}).filter(e => e.isDirectory()).map(e => e.name);
for (const name of components) {
  const preview = fs.readFileSync(path.join(CHARTE, "components", name, "preview.html"), "utf8");
  assert.match(preview.split("\n")[0], /^<!-- @dsCard /, `${name} : marqueur`);
  assert.doesNotMatch(preview, /<iframe|<object|<embed/, name);
  assert.equal(fs.existsSync(path.join(CHARTE, "components", name, "README.md")), name !== "Cover", `${name} : README`);
}
assert.ok(fs.statSync(path.join(CHARTE, "README.md")).size > 0);

// 6. La charte sur le site (onglet Charte de la Design Lab) : scripts/build-site.sh la copie et en tire les aperçus.
const site = fs.readFileSync(path.join(ROOT, "scripts/build-site.sh"), "utf8");
assert.match(site, /cp charte\/tokens\.json charte\/assets\.json charte\/README\.md "\$OUT\/charte\/"/);
assert.match(site, /node scripts\/build-charte\.js --site "\$OUT\/charte\/site"/);
const lab = fs.readFileSync(path.join(ROOT, "prototype-web/design/index.html"), "utf8");
assert.match(lab, /data-mode="charte"/);
assert.match(lab, /<script src="\.\/charte-lab\.js"><\/script>/);

console.log(`Charte : ${names.length} jetons, ${count} images, ${components.length} aperçus — OK`);
