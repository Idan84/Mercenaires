"use strict";

// L'inventaire des images, fichier par fichier (Idan, 2026-11-16 : « voir le détail des images ») : chaque famille du
// catalogue (data/reference/images.json) donne ses motifs ; scripts/build-images-index.js les déroule en fichiers, avec
// leur taille, pour l'onglet Images de la Design Lab (bouton « Voir les N images »).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {expandBraces, globToRegExp, expandMotifs, imageSize, buildIndex} = require("../scripts/build-images-index.js");

const ROOT = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");

// Les motifs : {a,b}, * (un nom) et **/ (des dossiers).
assert.deepEqual(expandBraces("a/{b,c}/{d,e}.webp"), ["a/b/d.webp", "a/b/e.webp", "a/c/d.webp", "a/c/e.webp"]);
assert.ok(globToRegExp("assets/*.webp").test("assets/x.webp"));
assert.ok(!globToRegExp("assets/*.webp").test("assets/sous/x.webp"));
assert.ok(globToRegExp("assets/**/*.webp").test("assets/x.webp") && globToRegExp("assets/**/*.webp").test("assets/a/b/x.webp"));
assert.deepEqual(expandMotifs(["assets/enemy-ranks/*.webp"]).length, 4);

// Les tailles lues dans l'en-tête des fichiers, comme ImageMagick les donnerait.
const web = file => path.join(ROOT, "prototype-web", file);
assert.deepEqual(imageSize(web("assets/pictos/peuple-orc.webp")), {w: 256, h: 256}, "WebP");
assert.deepEqual(imageSize(web("assets/pictos/goutte-halo.webp")), {w: 256, h: 256}, "WebP animé");
assert.deepEqual(imageSize(web("assets/intro/capitaine-mourant.jpg")), {w: 1376, h: 768}, "JPEG");
assert.ok(imageSize(web("assets/fiche/ornements/" + fs.readdirSync(web("assets/fiche/ornements"))[0])), "SVG");

// Chaque famille du dépôt : ses motifs donnent exactement le nombre de fichiers annoncé, chacun avec sa taille.
const catalogue = JSON.parse(read("data/reference/images.json"));
const index = buildIndex(catalogue);
for (const row of catalogue.rows) {
  assert.ok(Array.isArray(row.motifs), `${row.cle} : motifs`);
  if (!row.motifs.length) { assert.match(row.fichiers, /Hostinger/, `${row.cle} : sans motifs, lue sur Hostinger`); continue; }
  const files = index.familles[row.cle];
  assert.equal(files.length, row.nombre, `${row.cle} : ${files.length} fichiers pour ${row.nombre} annoncés`);
  for (const f of files) {
    assert.ok(f.largeur > 0 && f.hauteur > 0 && f.octets > 0, `${row.cle} : taille de ${f.chemin}`);
    for (const ex of row.exemples) assert.ok(index.familles[row.cle].some(x => x.chemin === ex), `${row.cle} : l'exemple ${ex} fait partie de la famille`);
  }
}
// Une image n'appartient qu'à une famille.
const all = Object.values(index.familles).flat().map(f => f.chemin);
assert.equal(new Set(all).size, all.length, "aucune image dans deux familles");

// Le site assemblé contient l'inventaire, et la Design Lab l'affiche.
assert.match(read("scripts/build-site.sh"), /node scripts\/build-images-index\.js "\$OUT\/data\/images-fichiers\.json"/);
const lab = read("prototype-web/design/images-lab.js");
assert.match(lab, /fetch\("\/data\/images-fichiers\.json"/);
assert.match(lab, /Voir les \$\{files\.length\} images/);
assert.match(read("prototype-web/design/design.js"), /ImagesLab\.wire\(\$\("viewer"\),data\)/);

console.log(`Inventaire des images : ${all.length} fichiers dans ${Object.keys(index.familles).length} familles — OK`);
