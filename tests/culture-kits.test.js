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
assert.deepEqual(kits.columns.map(c => c.key), ["cle", "culture", "dossier", "geometrie", "fiche", "barres"]);
for (const kit of kits.rows) {
  assert.equal(HUD_BARS[kit.cle]?.culture, kit.culture, kit.cle + " : culture de sa barre");
  assert.equal(kit.dossier, "assets/fiche/kits/" + kit.cle);
  assert.ok(fs.existsSync(path.join(ROOT, "assets-src/Kits", kit.cle, "README.md")), kit.cle + " : masters et mesures");
  const G = kit.geometrie, piece = f => path.join(WEB, kit.dossier, f);
  const files = [G.sangles.gros.h, G.sangles.gros.v, G.sangles.fine.h, G.sangles.fine.v, G.coinSobre.f, G.raccordT.f,
    ...Object.values(G.ornementsCoin), G.couronne.f, G.chaine.f, G.chaineTorsadee.f, G.texture, G.rond.f, G.bouton.f, G.embleme.f];
  for (const f of files) assert.ok(fs.existsSync(piece(f)), `${kit.cle} : ${f}`);
  // Les proportions écrites dans les données sont celles des images.
  for (const g of [G.couronne, G.chaine, G.chaineTorsadee, G.rond, G.embleme]) assert.deepEqual(imageSize(piece(g.f)), {w: g.w, h: g.h}, g.f);
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
// La sangle sous le nom passe sous la séparation verticale (Idan, 2026-11-16) : posée avant elle.
assert.ok(html.indexOf("cellule-fine.webp") < html.indexOf("cellule-fine-v.webp"), "la sangle sous le nom sous la séparation");
assert.match(read("prototype-web/styles.css"), /\.hover-card\[data-kit\] \.hc-banner\{padding-bottom:14px\}\n\.hover-card\[data-kit\] \.hc-title\{margin-top:-5px\}/, "de l'air sous le titre, le nom en place");
assert.match(read("prototype-web/styles.css"), /\.hover-card\[data-kit\] \.hc-page\{padding-top:27px\}/, "de l'air entre la sangle sous le nom et les pictos");
assert.match(read("prototype-web/hover-card-ui.js"), /\$\{hoverKitFrame\(frame\.kit\)\}\n {2}<\/article>/, "le cadre par-dessus la carte");
assert.match(read("prototype-web/hover-card-ui.js"), /data-kit="\$\{esc\(frame\.kit\.cle\)\}"/);

// 4. Le style et le chargement.
const css = read("prototype-web/styles.css");
assert.match(css, /\.hover-card\[data-kit\] \.hc-banner\{background:linear-gradient\(rgba\(12,2,16,var\(--hc-kit-sombre\)\),[^}]*var\(--hc-texture\) 50% 50%\/var\(--hc-kit-grain\) repeat/);
assert.match(css, /\.hover-card\[data-kit\] \.hc-orn\{width:var\(--hc-orn-w\);height:var\(--hc-orn-h\)\}/);
assert.match(css, /\.hc-cadre\{position:absolute;inset:0;z-index:2;pointer-events:none\}/);
assert.match(read("prototype-web/reference-data.js"), /cultureKits: "culture-kits\.json"/);
assert.match(read("data/reference/CATALOG.md"), /\| culture-kits\.json \| 1 \| cle, culture, dossier, geometrie, fiche, barres /);
assert.match(read("scripts/build-pictos.sh"), /for src in assets-src\/Kits\/\*\/logo\.png; do/);
assert.match(read("prototype-web/godmode.css"), /\.godmode-preview-scale\{width:860px;margin:25px;transform:scale\(\.45\)/, "l'aperçu du mode dieu montre les ornements qui débordent");

// 5. Les barres du camp au kit (planche d'Idan du 2026-11-16 : « Et voilà chef ! ») : ses réglages, les pièces, leur place
// en bandes B (81,6 px sur un écran de 1920 × 1080), et les textes, le bouton et les pictos déplacés comme dans la planche.
const K = elfes.barres;
assert.deepEqual(K.ecran, {w: 1920, h: 1080, B: 81.6});
assert.deepEqual(K.haut.bande, {cale: "gauche", distance: 40, largeur: 1850, hauteur: 50, fond: "cuir", sombre: 60, grain: 250});
assert.deepEqual([K.haut.sangleHaut, K.haut.sangleBas], [{style: "gros", ep: 12, dy: -3}, {style: "gros", ep: 12, dy: 3}]);
assert.deepEqual(K.haut.emblemeDroit, {visible: true, taille: 180, dx: 78, dy: -39});
assert.equal(K.haut.emblemeGauche.visible, false);
assert.deepEqual(K.haut.textes, {ecart: -40, dy: -58});
assert.deepEqual([K.bas.bande.haut, K.bas.sangleHaut, K.bas.sangleBas.style], [990, {style: "gros", ep: 16, dy: 0}, "aucune"]);
assert.deepEqual([K.bas.rond, K.bas.bouton, K.bas.pictos], [{taille: 370, dx: 0, dy: 6.5}, {taille: 98, dx: 0, dy: 0}, {ecart: 50, dy: 0}]);
assert.deepEqual(K.ornements.couronne, {place: "sur-bas-droite", taille: 220, dx: 400, dy: -5.5, retournee: false});
assert.deepEqual(K.ornements.chaine, {place: "sous-haut-gauche", taille: 230, dx: -300, dy: 0});
assert.equal(K.ornements.chaineTorsadee.place, "aucune");
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
const pieceSrcs = html => [...html.matchAll(/(?:src="|url\(')([^"']+)/g)].map(m => m[1]);
for (const src of new Set(pieceSrcs(L.piecesHaut + L.piecesBas))) assert.ok(fs.existsSync(path.join(WEB, src)), src);
const pieces = html => (html.match(/class="hud-kit-piece"/g) || []).length;
assert.equal(pieces(L.piecesHaut), 5, "en haut : la bande, ses deux sangles, la chaîne, l'emblème");
assert.equal(pieces(L.piecesBas), 4, "en bas : la bande, sa sangle du haut, la couronne, le rond");
// La barre du haut ferrée à gauche : du bord gauche jusqu'à 70 px du bord droit ; l'emblème au bout, depuis le bord droit ;
// la chaîne « à gauche » depuis le bord gauche ; les sangles gardent le pas de leurs clous (round).
assert.match(L.piecesHaut, /^<span class="hud-kit-piece" style="left:calc\(var\(--hb-B\) \* 0\);right:calc\(var\(--hb-B\) \* 0\.8578\);top:calc\(var\(--hb-B\) \* 0\.4902\);height:calc\(var\(--hb-B\) \* 0\.6127\);background:linear-gradient\(rgba\(12,2,16,0\.6\)/);
assert.match(L.piecesHaut, /cellule-gros\.webp'\) 0 0\/auto 100% round no-repeat/);
assert.match(L.piecesHaut, /embleme-fin-de-barre\.webp" alt="" style="right:calc\(var\(--hb-B\) \* 0\);top:calc\(var\(--hb-B\) \* 0\.0368\);width:calc\(var\(--hb-B\) \* 2\.2059\)/);
assert.match(L.piecesHaut, /chaine\.webp" alt="" style="left:calc\(var\(--hb-B\) \* 0\.5821\);/);
// La barre du bas depuis le bas et le milieu de l'écran : le trou du rond sur le bouton, la couronne à droite.
assert.match(L.piecesBas, /rond-central\.webp" alt="" style="left:calc\(50% \+ var\(--hb-B\) \* -2\.268\);bottom:calc\(var\(--hb-B\) \* -0\.0063\);width:calc\(var\(--hb-B\) \* 4\.5343\)/);
assert.match(L.piecesBas, /couronne\.webp" alt="" style="left:calc\(50% \+ var\(--hb-B\) \* 8\.2598\);bottom:/);
// Seulement pour la culture qui a ses barres.
const forKit = new Function("game", read("prototype-web/hud-kit-ui.js") + "\nreturn hudKitFor;")({referenceData: {cultureKits: kits}});
assert.equal(forKit("elfes-noirs"), elfes);
assert.equal(forKit("elfes-sylvains"), null);

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
  ui.applyHudBar("elfes-sylvains");
  assert.ok(topBar.classes.has("has-art") && !topBar.classes.has("has-kit") && !bottomBar.classes.has("has-kit"));
  assert.deepEqual([topBar.layer.innerHTML, play.attrs.src, rootProps["--ht-gauche"], rootProps["--bb-bouton-dx"]], ["", "assets/hud/next.webp", undefined, undefined]);
}
const html2 = read("prototype-web/index.html");
assert.equal((html2.match(/<div class="hud-kit" aria-hidden="true"><\/div>/g) || []).length, 2, "une couche du kit dans chaque barre");
assert.match(html2, /<script src="hud-bars\.js"><\/script>\s*<script src="hud-kit-ui\.js"><\/script>\s*<script src="screen-ui\.js"><\/script>/);
assert.match(css, /\.hud-kit\{position:absolute;inset:0;pointer-events:none\}/);
assert.match(css, /\.has-kit \.hud-bar-art\{display:none\}/);
assert.match(css, /\.game-bottom-bar\.has-kit \.hud-play-img\{width:100%;height:100%\}/);
assert.match(read("scripts/build-culture-kit.sh"), /rond-central\.png" -crop 2724x1446\+14\+34 \+repage -resize 1200x/);

console.log(`Kits des cultures : ${kits.rows.map(k => k.culture).join(", ")} — cadre, ornements, logo, couleur, barres du camp — OK`);
