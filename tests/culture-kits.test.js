"use strict";

// Kits graphiques par culture (Chatty, Idan) : data/reference/culture-kits.json, les pièces du jeu
// (scripts/build-culture-kit.sh), le cadre posé sur la fiche au survol (prototype-web/hover-card-ui.js) et les barres du
// camp (prototype-web/hud-kit-ui.js). Les trois cultures elfes (Idan, 2026-11-18) : un cadre en une pièce découpé (coin,
// bordures retournées, barre du milieu, jonctions en T), puis les ornements, aux réglages choisis par Idan dans ses
// planches « Fiches des Elfes » et « Barres des Elfes ».
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
assert.deepEqual(kits.rows.map(k => k.cle), ["elfes-noirs", "elfes-sylvains", "elfes-des-grandes-cites"]);
assert.deepEqual(kits.columns.map(c => c.key), ["cle", "culture", "dossier", "geometrie", "fiche", "barres", "plein"]);
for (const kit of kits.rows) {
  assert.equal(HUD_BARS[kit.cle]?.culture, kit.culture, kit.cle + " : culture de sa barre");
  assert.equal(kit.dossier, "assets/fiche/kits/" + kit.cle);
  assert.ok(fs.existsSync(path.join(ROOT, "assets-src/Kits", kit.cle, "README.md")), kit.cle + " : masters et mesures");
  assert.ok(fs.existsSync(path.join(ROOT, "assets-src/Kits", kit.cle, "cadre.png")), kit.cle + " : le cadre en une pièce");
  const G = kit.geometrie, K = G.cadre, piece = f => path.join(WEB, kit.dossier, f);
  const files = [K.coin.f, K.h.f, K.v.f, K.m.f, K.mh.f, K.jonction.f, ...Object.values(G.ornementsCoin), ...Object.values(G.poses).map(p => p.f),
    G.suspendu.f, G.allonge.f, G.texture, G.rond.f, G.bouton.f, G.embleme.f, ...(G.ornementTitre.f ? [G.ornementTitre.f] : [])];
  for (const f of files) assert.ok(fs.existsSync(piece(f)), `${kit.cle} : ${f}`);
  // Les proportions écrites dans les données sont celles des images.
  for (const g of [K.jonction, ...Object.values(G.poses), G.suspendu, G.allonge, G.rond, G.embleme, ...(G.ornementTitre.f ? [G.ornementTitre] : [])]) {
    assert.deepEqual(imageSize(piece(g.f)), {w: g.w, h: g.h}, `${kit.cle} : ${g.f}`);
  }
  // Le cadre : le coin à sa taille, les cellules à leur épaisseur et leur pas ; la barre du milieu couchée.
  assert.deepEqual(imageSize(piece(K.coin.f)), {w: K.coin.n, h: K.coin.n}, kit.cle + " : coin");
  assert.equal(imageSize(piece(K.h.f)).h, K.h.coeur, kit.cle + " : bande du haut");
  assert.equal(imageSize(piece(K.v.f)).w, K.v.coeur, kit.cle + " : bande de gauche");
  assert.equal(imageSize(piece(K.m.f)).w, K.m.coeur, kit.cle + " : barre du milieu");
  assert.deepEqual(imageSize(piece(K.mh.f)), {w: imageSize(piece(K.m.f)).h, h: K.m.coeur}, kit.cle + " : barre du milieu couchée");
  assert.deepEqual([K.jonction.barre, K.jonction.tige], [K.h.coeur, K.m.coeur], kit.cle + " : la jonction rejoint la bande et la barre");
  assert.ok(fs.existsSync(path.join(WEB, "assets/pictos/culture-" + kit.cle + ".webp")), kit.cle + " : logo en picto");
  assert.deepEqual(imageSize(path.join(WEB, "assets/pictos/culture-" + kit.cle + ".webp")), {w: 256, h: 256});
  assert.ok(fs.existsSync(path.join(ROOT, "assets-src/Kits", kit.cle, "logo.png")), kit.cle + " : logo du kit");
}
const byKey = Object.fromEntries(kits.rows.map(k => [k.cle, k]));
const elfes = byKey["elfes-noirs"], sylvains = byKey["elfes-sylvains"], cites = byKey["elfes-des-grandes-cites"];

// 2. Les réglages d'Idan pour la fiche (ses lignes du 2026-11-18) ; le cadre remonté de 7 px pour les trois (« ça manque
// un peu de padding dans ce cartouche »).
for (const kit of kits.rows) {
  const F = kit.fiche;
  assert.deepEqual(F.cadre, {ep: 16}, kit.cle);
  assert.deepEqual(F.cotes, {haut: -7, bas: 0, gauche: 0, droite: 0}, kit.cle);
  assert.deepEqual([F.separation.ep, F.separation.jonctions, F.sousNom.ep, F.sousNom.jonctions], [16, true, 16, true], kit.cle);
  for (const a of ["hg", "hd", "bd", "bg"]) assert.deepEqual(F.coins[a], {sens: "miroir", dx: 0, dy: 0}, kit.cle + " " + a);
  assert.deepEqual(F.cuir.grain, 100, kit.cle);
}
let F = elfes.fiche;
assert.deepEqual([F.separation.dx, F.sousNom.dy], [1.5, 4]);
assert.deepEqual(F.ornementsCoin.hg, {modele: "riche", taille: 176, sens: "miroir", dx: -20, dy: -29.5});
assert.deepEqual(F.ornementsCoin.hd, {modele: "leger", taille: 158, sens: "rotation", dx: 29, dy: -21.5});
assert.deepEqual(F.pose, {modele: "couronne", place: "bas-centre", taille: 220, dx: 151.5, dy: -6, retourne: false});
assert.deepEqual(F.suspendu, {place: "haut-portrait", taille: 178, dx: 0, dy: -4});
assert.deepEqual(F.allonge, {place: "separation", taille: 29, longueur: 61, espacement: 0, dx: -0.5, dy: -48});
assert.deepEqual([F.titre, F.cuir.sombre, F.nom], [{hauteur: 20, ecart: 2}, 30, "clair"]);
F = sylvains.fiche;
assert.deepEqual(F.ornementsCoin.hd, {modele: "leger", taille: 180, sens: "rotation", dx: 10, dy: -2});
assert.deepEqual(F.pose, {modele: "dryade", place: "bas-centre", taille: 230, dx: 327.5, dy: 2, retourne: false});
assert.deepEqual(F.suspendu, {place: "haut-portrait", taille: 200, dx: 150, dy: -3});
assert.deepEqual(F.allonge, {place: "separation", taille: 42.5, longueur: 49, espacement: 0, dx: -1, dy: -110});
assert.deepEqual([F.titre.hauteur, F.cuir.sombre, F.nom], [20, 20, "clair"]);
F = cites.fiche;
assert.deepEqual([F.separation.dx, F.ornementsCoin.hg.taille, F.ornementsCoin.bd.modele], [7, 223, "aucun"]);
assert.deepEqual(F.pose, {modele: "arc", place: "bas-centre", taille: 220, dx: 149.5, dy: 5.5, retourne: false});
assert.deepEqual(F.allonge, {place: "separation", taille: 58.5, longueur: 40, espacement: 0, dx: 545, dy: 39});
assert.deepEqual([F.titre.hauteur, F.cuir.sombre, F.nom], [16, 0, "or"], "le cuir ivoire, le nom doré (Idan, 2026-11-18 : « écrire les noms en lettres dorées »)");
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
for (const v of ['--hc-texture:url("assets/fiche/kits/elfes-noirs/texture.webp")', "--hc-kit-grain:256px", "--hc-kit-voile:12,2,16", "--hc-kit-sombre:0.3",
  "--hc-orn-h:calc(var(--hc-cart-h) * 0.2467)", "--hc-orn-ecart:calc(var(--hc-cart-h) * 0.0247)", '--hc-orn:url("assets/fiche/ornements/pointe-epines.svg")', "--hc-culture:#5b2463"]) {
  assert.ok(frame.vars.includes(v), v);
}
// Un ornement du titre en silhouette (image du kit) : le motif remplit sa boîte, sans partie vide.
const fs2 = api.hoverCultureFrame("Elfes sylvains");
assert.equal(fs2.kit, sylvains);
for (const v of ['--hc-orn:url("assets/fiche/kits/elfes-sylvains/titre.webp")', "--hc-kit-voile:4,18,6", "--hc-orn-vide:calc(var(--hc-cart-h) * 0.0000)"]) assert.ok(fs2.vars.includes(v), v);
const other = api.hoverCultureFrame("Cités libres");
assert.equal(other.kit, null);
assert.ok(other.vars.includes("assets/hud/barres/cites-libres/center.webp"), "les autres cultures gardent la texture de leur barre");
assert.equal(api.hoverKitFrame(null), "");
const srcsOf = html => [...html.matchAll(/(?:src="|url\(')([^"']+)/g)].map(m => m[1]);
for (const kit of kits.rows) {
  const html = api.hoverKitFrame(kit), srcs = srcsOf(html);
  assert.match(html, /^<div class="hc-cadre" aria-hidden="true">/);
  for (const src of new Set(srcs)) assert.ok(fs.existsSync(path.join(WEB, src)), src);
  const count = f => srcs.filter(s => s.endsWith("/" + f)).length;
  const K = kit.geometrie.cadre;
  assert.deepEqual([count(K.coin.f), count(K.h.f), count(K.v.f), count(K.m.f), count(K.mh.f), count(K.jonction.f)], [4, 2, 2, 1, 1, 4],
    kit.cle + " : 4 coins, bordures haut / bas et gauche / droite, barre du milieu, bande sous le nom, 4 jonctions");
  // Chaque pièce du cadre posée au pixel près : la partie entière en left / top, le reste en translation.
  const poses = [...html.matchAll(/<i style="left:(-?[\d.]+)px;top:(-?[\d.]+)px;translate:(-?[\d.]+)px (-?[\d.]+)px/g)];
  assert.equal(poses.length, 14, kit.cle + " : 14 pièces du cadre");
  for (const [, l, t, dx, dy] of poses) assert.ok(Number.isInteger(+l) && Number.isInteger(+t) && +dx >= 0 && +dx < 1 && +dy >= 0 && +dy < 1, `${kit.cle} : ${l} ${t} ${dx} ${dy}`);
  // Bordures du bas et de droite retournées autour de leur bord extérieur, posé sur le bord du cadre.
  const B = {y1: 565 + kit.fiche.cotes.bas, x1: 860 + kit.fiche.cotes.droite};
  assert.match(html, new RegExp(`<i style="left:-?[\\d.]+px;top:${B.y1}px;translate:[^"]*${K.h.f.replace(".", "\\.")}'\\) [^"]*repeat-x;transform-origin:0 0;transform:scaleY\\(-1\\)"`), kit.cle + " : bordure du bas");
  assert.match(html, new RegExp(`<i style="left:${B.x1}px;top:-?[\\d.]+px;translate:[^"]*${K.v.f.replace(".", "\\.")}'\\) [^"]*repeat-y;transform-origin:0 0;transform:scaleX\\(-1\\)"`), kit.cle + " : bordure de droite");
  // Les épaisseurs sont des pixels entiers (le navigateur arrondit la taille d'un motif répété) ; la bande du haut fait 16.
  assert.match(html, new RegExp(`width:[\\d.]+px;height:16px;background:url\\('[^']*${K.h.f.replace(".", "\\.")}'\\)`), kit.cle + " : bordure du haut, 16 px");
  // Les jonctions : en haut et en bas de la barre du milieu, aux deux bouts de la bande sous le nom.
  for (const m of ["matrix(1,0,0,1,0,0)", "matrix(1,0,0,-1,0,0)", "matrix(0,1,1,0,0,0)", "matrix(0,1,-1,0,0,0)"]) assert.ok(html.includes(m), `${kit.cle} : jonction ${m}`);
  assert.match(html, /clip-path:inset\(0 [\d.]+px [\d.]+px 0\);transform-origin:0 0;transform:/, kit.cle + " : coins coupés au bout des bras");
  // La bande sous le nom passe sous la barre du milieu : posée avant elle.
  assert.ok(html.indexOf(K.mh.f) < html.indexOf(K.m.f + "'"), kit.cle + " : la bande sous le nom sous la barre du milieu");
}
{
  const html = api.hoverKitFrame(elfes), srcs = srcsOf(html), count = f => srcs.filter(s => s.endsWith("/" + f)).length;
  assert.equal(count("coin-orne-riche.webp"), 1);
  assert.equal(count("coin-orne-leger.webp"), 3);
  assert.equal(count("couronne.webp") + count("chaine.webp"), 2);
  assert.equal(count("chaine-torsadee.webp"), 5, "la chaîne torsadée répétée sur 61 % de la séparation : 5 maillons de 60 px");
  // La bordure garde le pas des clous de sa cellule (au plus 5 % d'écart, le nombre de clous s'ajustant à la longueur).
  const haut = html.match(/url\('[^']*cell-h\.webp'\) [\d.-]+px 0\/([\d.]+)px 16px repeat-x"/);
  assert.ok(haut && Math.abs(+haut[1] / 16 - 1) < .05, `pas de la bordure du haut : ${haut && haut[1]} px pour 16`);
  assert.match(html, /couronne\.webp" alt="" style="left:[\d.]+px;top:[\d.]+px;width:220px/);
}
assert.equal(srcsOf(api.hoverKitFrame(sylvains)).filter(s => s.endsWith("/pose-dryade.webp")).length, 1, "la dryade couchée en bas");
assert.equal(srcsOf(api.hoverKitFrame(cites)).filter(s => /coin-orne-/.test(s)).length, 3, "pas d'ornement en bas à droite");
assert.match(read("prototype-web/styles.css"), /\.hover-card\[data-kit\] \.hc-banner\{padding-bottom:14px\}\n\.hover-card\[data-kit\] \.hc-title\{margin-top:-5px\}/, "de l'air sous le titre, le nom en place");
assert.match(read("prototype-web/styles.css"), /\.hover-card\[data-kit\] \.hc-page\{padding-top:27px\}/, "de l'air entre la bande sous le nom et les pictos");
assert.match(read("prototype-web/hover-card-ui.js"), /\$\{hoverKitFrame\(frame\.kit\)\}\n {2}<\/article>/, "le cadre par-dessus la carte");
assert.match(read("prototype-web/hover-card-ui.js"), /data-kit="\$\{esc\(frame\.kit\.cle\)\}"\$\{frame\.kit\.fiche\.nom==="or"\?' data-kit-nom="or"':""\}/);

// 4. Le style et le chargement.
const css = read("prototype-web/styles.css");
assert.match(css, /\.hover-card\[data-kit\] \.hc-banner\{background:linear-gradient\(rgba\(var\(--hc-kit-voile,12,2,16\),var\(--hc-kit-sombre\)\),[^}]*var\(--hc-texture\) 50% 50%\/var\(--hc-kit-grain\) repeat/);
assert.match(css, /\.hover-card\[data-kit-nom="or"\] \.hc-banner h3\{background:linear-gradient\(180deg,#b98a2e 0%,#94681a 55%,#6f4b10 100%\);-webkit-background-clip:text;/, "le nom doré, l'or des textes de la barre du haut");
assert.match(css, /\.hover-card\[data-kit-nom="or"\] \.hc-title span\{background:none;[^}]*-webkit-text-fill-color:#2c1d0c;color:#2c1d0c;/, "le titre à l'encre");
assert.match(css, /\.hover-card\[data-kit\] \.hc-orn\{width:var\(--hc-orn-w\);height:var\(--hc-orn-h\)\}/);
assert.match(css, /\.hc-cadre\{position:absolute;inset:0;z-index:2;pointer-events:none\}/);
assert.match(read("prototype-web/reference-data.js"), /cultureKits: "culture-kits\.json"/);
assert.match(read("data/reference/CATALOG.md"), /\| culture-kits\.json \| 3 \| cle, culture, dossier, geometrie, fiche, barres, plein /);
assert.match(read("scripts/build-pictos.sh"), /for src in assets-src\/Kits\/\*\/logo\.png; do/);
assert.match(read("prototype-web/godmode.css"), /\.godmode-preview-scale\{width:860px;margin:25px;transform:scale\(\.45\)/, "l'aperçu du mode dieu montre les ornements qui débordent");

// 5. Les barres du camp au kit : les réglages d'Idan (planche « Barres des Elfes »), les pièces, leur place en bandes B
// (81,6 px sur un écran de 1920 × 1080), et les textes, le bouton et les pictos déplacés comme dans la planche.
let K = elfes.barres;
assert.deepEqual(K.ecran, {w: 1920, h: 1080, B: 81.6});
assert.deepEqual(K.haut.bande, {cale: "gauche", distance: 40, largeur: 1850, hauteur: 50, fond: "cuir", sombre: 60, grain: 250});
assert.deepEqual([K.haut.sangleHaut, K.haut.sangleBas], [{style: "bande", ep: 13, dy: -3}, {style: "bande", ep: 13, dy: 3}]);
assert.deepEqual(K.haut.emblemeDroit, {visible: true, taille: 180, dx: 78, dy: -39});
assert.equal(K.haut.emblemeGauche.visible, false);
assert.deepEqual(K.haut.textes, {ecart: -40, dy: -58});
assert.deepEqual([K.bas.bande.haut, K.bas.sangleHaut, K.bas.sangleBas.style], [990, {style: "bande", ep: 18, dy: 0}, "aucune"]);
assert.deepEqual([K.bas.rond, K.bas.bouton, K.bas.pictos], [{taille: 370, dx: 0, dy: 6.5}, {taille: 98, dx: 0, dy: 0}, {ecart: 50, dy: 0}]);
assert.deepEqual(K.ornements.pose, {modele: "couronne", place: "sur-bas-droite", taille: 220, dx: 400, dy: -5.5, retourne: false});
assert.deepEqual(K.ornements.suspendu, {place: "sous-haut-gauche", taille: 230, dx: -300, dy: 0});
assert.equal(K.ornements.allonge.place, "aucune");
assert.equal(K.contenu, "clair");
K = sylvains.barres;
assert.deepEqual([K.haut.bande.sombre, K.bas.bande.sombre, K.haut.emblemeDroit, K.haut.textes.dy, K.bas.rond], [40, 40, {visible: true, taille: 158, dx: 35.5, dy: -34}, -30.5, {taille: 360, dx: 0, dy: 7}]);
assert.deepEqual(K.ornements.pose, {modele: "dragon", place: "sur-bas-droite", taille: 271, dx: 433, dy: 7, retourne: false});
K = cites.barres;
assert.deepEqual([K.haut.bande.sombre, K.bas.bande.sombre, K.haut.emblemeDroit, K.haut.textes.dy, K.bas.rond], [0, 0, {visible: true, taille: 155, dx: 59, dy: -42.5}, -44.5, {taille: 345, dx: 0, dy: 4}]);
assert.deepEqual([K.ornements.pose.place, K.ornements.suspendu], ["aucune", {place: "sous-haut-gauche", taille: 230, dx: -342, dy: -5}]);
assert.deepEqual([K.contenu, K.inactifs], ["dore", 50], "le cuir ivoire : textes et pictos dorés, pictos inactifs à 50 %");
const kitUi = require(path.join(WEB, "hud-kit-ui.js"));
const L = kitUi.hudKitBars(elfes, HUD_BARS["elfes-noirs"]);
const B = 81.6, ph = HUD_BARS["elfes-noirs"].haut, pb = HUD_BARS["elfes-noirs"].bas, htB = B * ph.barre;
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < .01, `${msg} : ${a} pour ${b} (au centième de pixel)`);
// Les textes : 58 px plus haut avec la barre à 40 px du haut, 40 px plus près du milieu à chaque bout de la barre (1850 px).
near(L.haut.top * htB, htB * ph.top + 40 - 58, "haut des textes");
near(L.haut.gauche * htB, htB * .5 + 40, "textes à gauche");
const right0 = htB * ph.marge + htB / 100 * 304 * ph.embout;
near(L.haut.marge * htB, right0 + 70 + 40, "textes à droite");
assert.equal(L.haut.contenu, ph.contenu, "les textes gardent leur taille");
// Le bouton : 98 px, 6,5 px plus bas avec le rond ; les pictos écartés de 50 px de chaque côté.
near(L.bas.bouton * B, 98, "bouton");
near(L.bas.centre * B, pb.centre * B - 6.5, "centre du bouton");
near(L.bas.boutonDx, 0, "bouton au milieu");
near(L.bas.pictosDroite * B, pb.pictosDroite * B + 50, "lieux du camp");
near(L.bas.pictosGauche * B, pb.pictosGauche * B + 50, "actions du jour");
assert.equal(L.bas.hauteur, pb.hauteur);
assert.equal(L.bouton, "assets/fiche/kits/elfes-noirs/bouton-jour-suivant.webp");
assert.deepEqual([L.dore, L.inactifs], [false, null]);
for (const kit of kits.rows) {
  const Lk = kitUi.hudKitBars(kit, HUD_BARS[kit.cle]);
  for (const src of new Set(srcsOf(Lk.piecesHaut + Lk.piecesBas))) assert.ok(fs.existsSync(path.join(WEB, src)), src);
}
const pieces = html => (html.match(/class="hud-kit-piece"/g) || []).length;
assert.equal(pieces(L.piecesHaut), 5, "en haut : la bande, ses deux sangles, l'ornement suspendu, l'emblème");
assert.equal(pieces(L.piecesBas), 4, "en bas : la bande, sa sangle du haut, l'ornement posé, le rond");
// La barre du haut ferrée à gauche : du bord gauche jusqu'à 70 px du bord droit ; l'emblème au bout, depuis le bord droit ;
// l'ornement suspendu « à gauche » depuis le bord gauche ; les sangles (la bande du cadre) gardent le pas de leur motif
// (round), celle du bas de la barre du haut retournée (son liseré extérieur dehors).
assert.match(L.piecesHaut, /^<span class="hud-kit-piece" style="left:calc\(var\(--hb-B\) \* 0\);right:calc\(var\(--hb-B\) \* 0\.8578\);top:calc\(var\(--hb-B\) \* 0\.4902\);height:calc\(var\(--hb-B\) \* 0\.6127\);background:linear-gradient\(rgba\(12,2,16,0\.6\)/);
assert.match(L.piecesHaut, /cell-h\.webp'\) 0 0\/auto 100% round no-repeat"/);
assert.match(L.piecesHaut, /cell-h\.webp'\) 0 0\/auto 100% round no-repeat;transform:scaleY\(-1\)"/);
assert.match(L.piecesHaut, /embleme-fin-de-barre\.webp" alt="" style="right:calc\(var\(--hb-B\) \* 0\);top:calc\(var\(--hb-B\) \* 0\.0368\);width:calc\(var\(--hb-B\) \* 2\.2059\)/);
assert.match(L.piecesHaut, /chaine\.webp" alt="" style="left:calc\(var\(--hb-B\) \* 0\.5821\);/);
// La barre du bas depuis le bas et le milieu de l'écran : le trou du rond sur le bouton, la couronne à droite.
assert.match(L.piecesBas, /rond-central\.webp" alt="" style="left:calc\(50% \+ var\(--hb-B\) \* -2\.268\);bottom:calc\(var\(--hb-B\) \* -0\.0063\);width:calc\(var\(--hb-B\) \* 4\.5343\)/);
assert.match(L.piecesBas, /couronne\.webp" alt="" style="left:calc\(50% \+ var\(--hb-B\) \* 8\.2598\);bottom:/);
// Les Grandes cités : le cuir ivoire non assombri, dans sa teinte ; textes et pictos dorés.
const Lc = kitUi.hudKitBars(cites, HUD_BARS["elfes-des-grandes-cites"]);
assert.deepEqual([Lc.dore, Lc.inactifs], [true, .5]);
assert.match(Lc.piecesHaut, /background:linear-gradient\(rgba\(34,22,8,0\),rgba\(34,22,8,0\)\),url\('assets\/fiche\/kits\/elfes-des-grandes-cites\/texture\.webp'\)/);
assert.equal(pieces(Lc.piecesBas), 3, "en bas : la bande, sa sangle, le rond (pas d'ornement posé)");
assert.ok(kitUi.hudKitBars(sylvains, HUD_BARS["elfes-sylvains"]).piecesBas.includes("pose-dragon.webp"), "le dragon couché sur la barre du bas");
// Seulement pour les cultures qui ont leurs barres.
const forKit = new Function("game", read("prototype-web/hud-kit-ui.js") + "\nreturn hudKitFor;")({referenceData: {cultureKits: kits}});
assert.equal(forKit("elfes-noirs"), elfes);
assert.equal(forKit("elfes-sylvains"), sylvains);
assert.equal(forKit("cites-libres"), null);

// 6. Le jeu (screen-ui.js) : les pièces du kit à la place de la barre du pack, le bouton du kit ; une autre culture
// retrouve sa barre et le bouton d'Idan.
{
  const js = read("prototype-web/screen-ui.js");
  const start = js.indexOf("const HUD_BAR_PIECES=");
  const hud = new Function("document", "HUD_BARS", "hudKitFor", "hudKitBars", js.slice(start, js.indexOf("// Le nom de la compagnie tient dans sa place", start)) + "return {applyHudBar};");
  const fakeEl = () => {
    const el = {props: {}, classes: new Set(), layer: {innerHTML: ""}, pieces: {center: {style: {}}, right: {style: {}}}};
    el.style = {setProperty: (k, v) => { el.props[k] = v; }, removeProperty: k => { delete el.props[k]; }};
    el.classList = {toggle: (c, on) => on ? el.classes.add(c) : el.classes.delete(c)};
    el.querySelector = sel => sel === ".hud-kit" ? el.layer : el.pieces[sel.replace(".hud-bar-", "")] || null;
    return el;
  };
  const topBar = fakeEl(), bottomBar = fakeEl(), rootProps = {};
  const ornament = {attrs: {}, hidden: true, setAttribute(k, v) { this.attrs[k] = v; }};
  const play = {attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }};
  const doc = {documentElement: {style: {setProperty: (k, v) => { rootProps[k] = v; }, removeProperty: k => { delete rootProps[k]; }}},
    querySelector: sel => ({".game-top-bar": topBar, ".game-bottom-bar": bottomBar, ".hud-ornament": ornament, ".hud-play-img": play})[sel] || null};
  const ui = hud(doc, HUD_BARS, forKit, kitUi.hudKitBars);
  ui.applyHudBar("elfes-noirs");
  assert.ok(topBar.classes.has("has-kit") && bottomBar.classes.has("has-kit") && !topBar.classes.has("has-art") && !bottomBar.classes.has("has-ornament"));
  assert.deepEqual([topBar.layer.innerHTML, bottomBar.layer.innerHTML], [L.piecesHaut, L.piecesBas]);
  assert.deepEqual([play.attrs.src, ornament.hidden], [L.bouton, true]);
  assert.deepEqual([rootProps["--ht-gauche"], rootProps["--ht-top"], rootProps["--ht-marge"]], [String(L.haut.gauche), String(L.haut.top), String(L.haut.marge)]);
  assert.deepEqual([rootProps["--bb-bouton"], rootProps["--bb-centre"], rootProps["--bb-pictos-droite"], rootProps["--bb-bouton-dx"]],
    [String(L.bas.bouton), String(L.bas.centre), String(L.bas.pictosDroite), "0"]);
  assert.deepEqual(topBar.props, {}, "pas de mesures du pack");
  assert.ok(!topBar.classes.has("is-dore") && !bottomBar.classes.has("is-dore") && !("--hud-inactifs" in bottomBar.props));
  // Les Grandes cités : leurs barres dorées, les pictos inactifs à 50 %.
  ui.applyHudBar("elfes-des-grandes-cites");
  assert.ok(topBar.classes.has("has-kit") && topBar.classes.has("is-dore") && bottomBar.classes.has("is-dore"));
  assert.equal(bottomBar.props["--hud-inactifs"], "0.5");
  ui.applyHudBar("cites-libres");
  assert.ok(topBar.classes.has("has-art") && !topBar.classes.has("has-kit") && !bottomBar.classes.has("has-kit") && !topBar.classes.has("is-dore"));
  assert.ok(!("--hud-inactifs" in bottomBar.props));
  assert.deepEqual([topBar.layer.innerHTML, play.attrs.src, rootProps["--ht-gauche"], rootProps["--bb-bouton-dx"]], ["", "assets/hud/next.webp", undefined, undefined]);
}
const html2 = read("prototype-web/index.html");
assert.equal((html2.match(/<div class="hud-kit" aria-hidden="true"><\/div>/g) || []).length, 2, "une couche du kit dans chaque barre");
assert.match(html2, /<script src="hud-bars\.js"><\/script>\s*<script src="hud-kit-ui\.js"><\/script>\s*<script src="screen-ui\.js"><\/script>/);
assert.match(css, /\.hud-kit\{position:absolute;inset:0;pointer-events:none\}/);
assert.match(css, /\.has-kit \.hud-bar-art\{display:none\}/);
assert.match(css, /\.game-bottom-bar\.has-kit \.hud-play-img\{width:100%;height:100%\}/);
assert.match(read("scripts/build-culture-kit.sh"), /rond-central\.png" -crop 2724x1446\+14\+34 \+repage -resize 1200x/);
// Les pictos inactifs (le lieu où l'on est, ceux sans rien à faire) : comme les autres, plus transparents (Idan,
// 2026-11-18), pour toutes les cultures ; dorés sur les barres au cuir clair.
assert.match(css, /\.hud-nav\.is-current,\.hud-nav:disabled\{transform:none;filter:none;opacity:var\(--hud-inactifs,\.5\);cursor:default\}/);
assert.doesNotMatch(css, /grayscale\(1\) brightness\(\.65\)/);
assert.match(css, /\.game-top-bar\.is-dore \.hud-stat\{background:linear-gradient\(180deg,#f6e9c4,#e6cf94\)/);
assert.match(css, /\.game-top-bar\.is-dore \.hud-stat dd\{color:#2c1d0c;text-shadow:none\}/);
assert.match(css, /\.game-top-bar\.is-dore #hud-company,\.game-top-bar\.is-dore #hud-date,\.game-top-bar\.is-dore #hud-day\{color:#94681a;/);
assert.match(css, /\.game-bottom-bar\.is-dore \.hud-nav-img\{filter:sepia\(1\) saturate\(2\.4\)/);

console.log(`Kits des cultures : ${kits.rows.map(k => k.culture).join(", ")} — cadre en une pièce, jonctions, ornements, logo, barres du camp — OK`);
