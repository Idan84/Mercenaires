"use strict";

// Kits graphiques par culture (Chatty, Idan, 2026-11-16) : data/reference/culture-kits.json, les pièces du jeu
// (scripts/build-culture-kit.sh) et le cadre posé sur la fiche au survol (prototype-web/hover-card-ui.js). Pour l'instant
// les Elfes noirs, « refaits totalement » : cadre de base cohérent (coins sobres, bordures, raccords en T à la même
// épaisseur, clous au même pas), puis les ornements, aux réglages choisis par Idan dans sa planche.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const WEB = path.join(ROOT, "prototype-web");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const json = file => JSON.parse(read("data/reference/" + file));
const {imageSize} = require(path.join(ROOT, "scripts/build-images-index.js"));
const HUD_BARS = new Function(read("prototype-web/hud-bars.js") + "\nreturn HUD_BARS;")();
const kits = json("culture-kits.json"), colors = json("culture-colors.json");

// 1. Les données : une ligne par kit, sa culture, ses pièces.
assert.equal(kits.row_count, kits.rows.length);
assert.deepEqual(kits.columns.map(c => c.key), ["cle", "culture", "dossier", "geometrie", "fiche"]);
for (const kit of kits.rows) {
  assert.equal(HUD_BARS[kit.cle]?.culture, kit.culture, kit.cle + " : culture de sa barre");
  assert.equal(kit.dossier, "assets/fiche/kits/" + kit.cle);
  assert.ok(fs.existsSync(path.join(ROOT, "assets-src/Kits", kit.cle, "README.md")), kit.cle + " : masters et mesures");
  const G = kit.geometrie, piece = f => path.join(WEB, kit.dossier, f);
  const files = [G.sangles.gros.h, G.sangles.gros.v, G.sangles.fine.h, G.sangles.fine.v, G.coinSobre.f, G.raccordT.f,
    ...Object.values(G.ornementsCoin), G.couronne.f, G.chaine.f, G.chaineTorsadee.f, G.texture];
  for (const f of files) assert.ok(fs.existsSync(piece(f)), `${kit.cle} : ${f}`);
  // Les proportions écrites dans les données sont celles des images.
  for (const g of [G.couronne, G.chaine, G.chaineTorsadee]) assert.deepEqual(imageSize(piece(g.f)), {w: g.w, h: g.h}, g.f);
  assert.ok(fs.existsSync(path.join(WEB, "assets/pictos/culture-" + kit.cle + ".webp")), kit.cle + " : logo en picto");
  assert.deepEqual(imageSize(path.join(WEB, "assets/pictos/culture-" + kit.cle + ".webp")), {w: 256, h: 256});
}

// 2. Les Elfes noirs : les réglages de la planche d'Idan (sa ligne du 2026-11-16), sa couleur, son ornement du titre.
const elfes = kits.rows.find(k => k.cle === "elfes-noirs");
assert.ok(elfes, "kit des Elfes noirs");
const F = elfes.fiche;
assert.deepEqual(F.cadre, {ep: 16, style: "gros", sobres: true});
assert.deepEqual(F.cotes, {haut: -7.5, bas: 0, gauche: 0, droite: 0});
assert.equal(F.coins.hd.dy, 0.5);
assert.deepEqual([F.separation.style, F.separation.ep, F.separation.raccords], ["fine", 16, "dessous"]);
assert.deepEqual(F.sousNom, {style: "fine", dy: 4.5});
assert.deepEqual(F.ornementsCoin.hg, {modele: "riche", taille: 176, sens: "miroir", dx: -20, dy: -29.5});
assert.deepEqual(F.ornementsCoin.hd, {modele: "leger", taille: 158, sens: "rotation", dx: 29, dy: -21.5});
assert.deepEqual(F.couronne, {place: "bas-centre", taille: 220, dx: 151.5, dy: -6, retournee: false});
assert.deepEqual(F.chaine, {place: "haut-portrait", taille: 178, dx: 80.5, dy: -4});
assert.deepEqual(F.chaineTorsadee, {place: "separation", taille: 29.5, longueur: 61, espacement: 0, dx: 0, dy: 0});
assert.deepEqual(F.titre, {hauteur: 20, ecart: 2});
assert.deepEqual(F.cuir, {grain: 250, sombre: 30});
assert.equal(colors.rows.find(r => r.cle === "elfes-noirs").couleur, "#5b2463");
const pointe = read("prototype-web/assets/fiche/ornements/pointe-epines.svg");
assert.match(pointe, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 104 24"><svg x="68\.56" y="0" width="35\.44" height="24"/, "la pointe, côté titre, dans la boîte commune");
assert.equal(elfes.geometrie.ornementTitre.largeur, 35.44);

// 3. La fiche au survol pose le cadre du kit, et seulement pour sa culture.
const stubs = {game: {referenceData: {cultureKits: kits, cultureColors: colors}}, HUD_BARS};
const api = new Function(...Object.keys(stubs), read("prototype-web/hover-card-ui.js") + "\nreturn {hoverCultureFrame, hoverKitFrame, renderMercenaryHoverCard};")(...Object.values(stubs));
const frame = api.hoverCultureFrame("Elfes noirs");
assert.equal(frame.kit, elfes);
assert.equal(frame.ornament, "pointe-epines");
for (const v of ['--hc-texture:url("assets/fiche/kits/elfes-noirs/texture.webp")', "--hc-kit-grain:640px", "--hc-kit-sombre:0.3",
  "--hc-orn-h:calc(var(--hc-cart-h) * 0.2467)", "--hc-orn-ecart:calc(var(--hc-cart-h) * 0.0247)", "--hc-culture:#5b2463"]) {
  assert.ok(frame.vars.includes(v), v);
}
const other = api.hoverCultureFrame("Elfes sylvains");
assert.equal(other.kit, null);
assert.ok(other.vars.includes("assets/hud/barres/elfes-sylvains/center.webp"), "les autres cultures gardent la texture de leur barre");
assert.equal(api.hoverKitFrame(null), "");
const html = api.hoverKitFrame(elfes);
assert.match(html, /^<div class="hc-cadre" aria-hidden="true">/);
const srcs = [...html.matchAll(/(?:src="|url\(')([^"']+)/g)].map(m => m[1]);
for (const src of new Set(srcs)) assert.ok(fs.existsSync(path.join(WEB, src)), src);
const count = f => srcs.filter(s => s.endsWith("/" + f)).length;
assert.equal(count("coin-sobre.webp"), 4, "les 4 coins sobres");
assert.equal(count("raccord-t.webp"), 2, "raccords en T en haut et en bas");
assert.equal(count("cellule-gros.webp"), 2, "bordures du haut et du bas");
assert.equal(count("cellule-gros-v.webp"), 2, "bordures gauche et droite");
assert.equal(count("cellule-fine-v.webp") + count("cellule-fine.webp"), 2, "séparation et sous le nom, à petits clous");
assert.equal(count("coin-orne-riche.webp"), 1);
assert.equal(count("coin-orne-leger.webp"), 3);
assert.equal(count("couronne.webp") + count("chaine.webp"), 2);
assert.equal(count("chaine-torsadee.webp"), 5, "la chaîne torsadée répétée sur 61 % de la séparation : 5 maillons de 61 px");
// Le cadre de base cohérent : la bordure garde le pas des clous du coin sobre (au plus 5 % d'écart, le nombre de
// clous s'ajustant à la longueur), sa sangle a l'épaisseur du cadre, et le coin est coupé avant l'embout de ses bras.
const s = F.cadre.ep / elfes.geometrie.coinSobre.coeur, pas = elfes.geometrie.sangles.gros.pas * s;
const haut = html.match(/url\('[^']*cellule-gros\.webp'\) [\d.-]+px 0\/([\d.]+)px ([\d.]+)px repeat-x/);
assert.ok(haut && Math.abs(+haut[1] / pas - 1) < .05, `pas de la bordure du haut : ${haut && haut[1]} px pour ${pas.toFixed(2)}`);
assert.ok(Math.abs(+haut[2] - (238 + 24) * s) < .05, "épaisseur de la sangle (liserés compris)");
assert.match(html, /coin-sobre\.webp" alt="" style="[^"]*clip-path:inset\(0 [\d.]+px [\d.]+px 0\)/);
assert.match(html, /couronne\.webp" alt="" style="left:[\d.]+px;top:[\d.]+px;width:220px/);
assert.match(read("prototype-web/hover-card-ui.js"), /\$\{hoverKitFrame\(frame\.kit\)\}\n {2}<\/article>/, "le cadre par-dessus la carte");
assert.match(read("prototype-web/hover-card-ui.js"), /data-kit="\$\{esc\(frame\.kit\.cle\)\}"/);

// 4. Le style et le chargement.
const css = read("prototype-web/styles.css");
assert.match(css, /\.hover-card\[data-kit\] \.hc-banner\{background:linear-gradient\(rgba\(12,2,16,var\(--hc-kit-sombre\)\),[^}]*var\(--hc-texture\) 50% 50%\/var\(--hc-kit-grain\) repeat/);
assert.match(css, /\.hover-card\[data-kit\] \.hc-orn\{width:var\(--hc-orn-w\);height:var\(--hc-orn-h\)\}/);
assert.match(css, /\.hc-cadre\{position:absolute;inset:0;z-index:2;pointer-events:none\}/);
assert.match(read("prototype-web/reference-data.js"), /cultureKits: "culture-kits\.json"/);
assert.match(read("data/reference/CATALOG.md"), /\| culture-kits\.json \| 1 \| cle, culture, dossier, geometrie, fiche /);
assert.match(read("scripts/build-pictos.sh"), /for src in assets-src\/Kits\/\*\/logo\.png; do/);
assert.match(read("prototype-web/godmode.css"), /\.godmode-preview-scale\{width:860px;margin:25px;transform:scale\(\.45\)/, "l'aperçu du mode dieu montre les ornements qui débordent");

console.log(`Kits des cultures : ${kits.rows.map(k => k.culture).join(", ")} — cadre, ornements, logo, couleur — OK`);
