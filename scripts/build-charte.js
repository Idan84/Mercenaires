#!/usr/bin/env node
"use strict";

// La charte graphique en un seul endroit (Idan, 2026-11-15 : « il est grand temps qu'on regroupe notre charte graphique et
// nos images / icônes / svg à un endroit précis. Que je puisse facilement apporter des modifs… avoir des visions
// d'ensemble… un tableau simple 3 couleurs par cultures… quelques boutons globaux »).
//
// Étape 1 (sans toucher au jeu) : on rassemble ce qui est déjà validé dans le dossier charte/, rangé comme une page
// « Design System » (charte/ = project/ de la page) :
// - charte/tokens.json (généré ici) : la palette, les polices, les styles de texte, les ombres et les dimensions, valeurs
//   lues telles quelles dans le code du jeu (creation-capitaine.css, styles.css) ; les 3 tons des 32 cultures ;
// - charte/assets.json (généré ici) : l'inventaire des images par famille (pictos, ornements, textures…), avec leur
//   fichier source dans prototype-web/assets/ ;
// - charte/components/bundle.css (généré ici) : les règles du bouton, du parchemin, des filets et de la fiche au survol,
//   copiées du jeu, les couleurs et les polices branchées sur les jetons ;
// - charte/components/Cultures|FicheAuSurvol/preview.html (générés ici) ; les autres aperçus et les README sont écrits
//   à la main.
// Les images restent dans prototype-web/assets/ ; --out les copie dans les fichiers de la page (son adresse est dans
// charte/publication.json).
//
// Usage : node scripts/build-charte.js                (écrit les fichiers générés de charte/)
//         node scripts/build-charte.js --check        (vérifie qu'ils sont à jour, pour les tests)
//         node scripts/build-charte.js --out <dossier> (prépare en plus <dossier>/project/ pour publier la page, images
//                                                       comprises, et <dossier>/fichiers.json : la liste à publier)

const fs = require("fs");
const path = require("path");
const {HUD_BARS, midTone} = require("./build-culture-colors.js");

const ROOT = path.resolve(__dirname, "..");
const WEB = path.join(ROOT, "prototype-web");
const CHARTE = path.join(ROOT, "charte");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const CSS = {
  "prototype-web/creation-capitaine.css": read("prototype-web/creation-capitaine.css"),
  "prototype-web/styles.css": read("prototype-web/styles.css"),
};
const HOVER = require(path.join(WEB, "hover-card-ui.js"));
const ORNAMENTS = Object.fromEntries([...read("prototype-web/hover-card-ui.js")
  .match(/const HOVER_TITLE_ORNAMENTS=\{([\s\S]*?)\};/)[1].matchAll(/"([a-z-]+)":"([a-z-]+)"/g)].map(m => [m[1], m[2]]));
const CULTURE_COLORS = JSON.parse(read("data/reference/culture-colors.json")).rows;

// ---------------------------------------------------------------- lecture des règles du jeu

// La règle « selector{…} » (au début d'une ligne) d'un fichier CSS du jeu, telle quelle.
function cssRule(file, selector) {
  const css = CSS[file];
  const start = css.startsWith(selector + "{") ? 0 : css.indexOf("\n" + selector + "{") + 1;
  if (start === 0 && !css.startsWith(selector + "{")) throw new Error(`Règle introuvable dans ${file} : ${selector}`);
  const end = css.indexOf("}", start);
  return css.slice(start, end + 1);
}
// La valeur d'une variable déclarée dans une règle (« --encre:#2c1b10 »).
function cssVar(file, selector, name) {
  const m = cssRule(file, selector).match(new RegExp(`(?:^|[;{\\s])--${name}:([^;}]+)`));
  if (!m) throw new Error(`Variable --${name} introuvable dans ${selector} (${file})`);
  return m[1].trim();
}
// Une valeur écrite telle quelle dans une règle (ombre, couleur) : on vérifie qu'elle y est bien.
function cssLiteral(file, selector, value) {
  if (!cssRule(file, selector).includes(value)) throw new Error(`« ${value} » introuvable dans ${selector} (${file})`);
  return value;
}

const CC = "prototype-web/creation-capitaine.css", ST = "prototype-web/styles.css";

// ---------------------------------------------------------------- jetons

const color = (name, value, usage) => ({name, value, usage});
const fromRoot = (name, usage) => color(name, cssVar(CC, ":root", name), usage);

const PALETTE = [
  fromRoot("parchemin", "Teinte du parchemin d'Idan, déclarée dans la charte (encore utilisée par aucun écran ; le parchemin lui-même est l'image Interface/parchemin.webp)."),
  fromRoot("encre", "Texte principal sur le parchemin : titres, champs, phrases (lisible sur `parchemin`, `ivoire`, `hc-page`)."),
  fromRoot("encre-secondaire", "Texte et traits secondaires sur le parchemin : en-têtes de parchemin, étiquettes, filets, lien « ‹ Retour »."),
  fromRoot("or", "Or de la charte sur fond sombre : filets de l'en-tête, numéros des étapes, étapes franchies."),
  fromRoot("or-clair", "Or clair sur fond sombre : texte du bouton d'Idan, titre de l'en-tête, étape en cours, contours de focus."),
  fromRoot("ivoire", "Texte clair sur la scène sombre : réplique de Cruxor, noms des médaillons au survol."),
  fromRoot("texte-inactif", "Libellés des étapes pas encore atteintes, sur fond sombre."),
  fromRoot("bordeaux", "Bordeaux de la charte ; utilisé par quelques textes de l'ancienne interface (styles.css)."),
  fromRoot("laiton", "Laiton : losange des étapes franchies, sur fond sombre."),
  fromRoot("trait", "Trait fin sur le parchemin (encre secondaire à 40 %), déclaré dans la charte ; encore utilisé par aucun écran."),
];
const LEGACY = [
  ["ink", "Fond de page sombre de l'interface d'origine (corps de la page de création)."],
  ["line", "Bordure des vignettes (armes, portraits) de l'interface d'origine."],
  ["line-2", "Bordure au survol et des champs de l'interface d'origine."],
  ["gold", "Or de l'interface d'origine : choix coché, titres de familles, scores."],
  ["gold-hi", "Or clair de l'interface d'origine : contours de focus des vignettes et des champs."],
  ["text", "Texte clair de l'interface d'origine (corps de la page)."],
  ["muted", "Texte discret de l'interface d'origine (petits libellés)."],
  ["pick", "Fond d'une vignette choisie dans l'interface d'origine."],
].map(([name, usage]) => fromRoot(name, usage));
const HOVER_CARD = [
  color("hc-parchemin", cssVar(ST, ".hover-card", "hc-parchemin"), "Fiche au survol : lettres du nom et du titre (remplies de la texture du parchemin, ce ton en dessous) et ornements du titre, sur la texture de la culture."),
  color("encre-2", cssVar(ST, ".hover-card", "encre-2"), "Fiche au survol : texte secondaire sur la page de la fiche."),
  color("hc-fond", cssLiteral(ST, ".hover-card", "#15100c"), "Fiche au survol : le fond de la carte, autour du portrait, du cartouche et de la page."),
  color("hc-page", cssLiteral(ST, ".hc-page", "#eadcbc"), "Fiche au survol : la page de papier sous le cartouche (sous le papier froissé)."),
];

// Les 3 tons de chaque culture. « moyen » est celui validé par Idan (data/reference/culture-colors.json, tiré de la texture
// de sa barre : la phrase d'origine de la fiche au survol) ; « sombre » et « clair » en sont tirés (proposés, à valider) :
// même teinte, luminosité OKLab plus basse ou plus haute, couleur (chroma) bornée. Changer le moyen change les deux autres.
const TONES = {sombre: {L: 0.38, maxC: 0.12}, clair: {L: 0.8, maxC: 0.08}};
const cultures = CULTURE_COLORS.map(row => ({...row,
  sombre: midTone(row.couleur, TONES.sombre.L, TONES.sombre.maxC), clair: midTone(row.couleur, TONES.clair.L, TONES.clair.maxC)}));
const CULTURE_TOKENS = cultures.flatMap(c => [
  color(`culture-${c.cle}-sombre`, c.sombre, `${c.nom} : ton sombre (proposé, pas encore utilisé) — texte ou trait de la culture sur un fond clair.`),
  color(`culture-${c.cle}-moyen`, c.couleur, `${c.nom} : ton moyen (validé) — phrase d'origine de la fiche au survol, sur \`hc-page\`.`),
  color(`culture-${c.cle}-clair`, c.clair, `${c.nom} : ton clair (proposé, pas encore utilisé) — fond léger ou reflet de la culture.`),
]);

const style = (name, family, fontSize, lineHeight, fontWeight, extra, selector, file, sample, usage) =>
  ({name, family, fontSize, ...(lineHeight == null ? {} : {lineHeight}), fontWeight, ...extra, sample, usage: `${usage} (${selector}, ${path.basename(file)})`});
// Chaque style recopie une déclaration « font: … » du jeu : on vérifie qu'elle y est.
function checkedStyle(declaration, selector, file, ...args) {
  cssLiteral(file, selector, declaration);
  return style(...args.slice(0, 6), selector, file, ...args.slice(6));
}
const TYPE_GROUPS = [
  {name: "Capitales (Cinzel)", family: "titre", styles: [
    checkedStyle("font:700 24px/1 var(--police-titre);letter-spacing:.2em", ".brand", CC, "marque", "titre", "24px", 1, 700, {letterSpacing: ".2em"}, "BLOOD & WAGES", "En capitales, or clair sur la scène : le titre de l'en-tête entre ses deux pointes de lance"),
    checkedStyle("font:700 24px/1.2 var(--police-titre);letter-spacing:.1em", ".parch .fiche-titre", CC, "titre-fiche-parchemin", "titre", "24px", 1.2, 700, {letterSpacing: ".1em"}, "NAINS DES MONTAGNES", "En capitales, encre sur le parchemin : le nom de ce qu'on regarde, entre deux pointes de lance"),
    checkedStyle("font:700 18px/1 var(--police-titre);letter-spacing:.12em", ".btn", CC, "bouton", "titre", "18px", 1, 700, {letterSpacing: ".12em"}, "CONTINUER", "En capitales : le texte du bouton d'Idan"),
    checkedStyle("font:700 14px/1 var(--police-titre);letter-spacing:.16em", ".parch-head", CC, "en-tete-parchemin", "titre", "14px", 1, 700, {letterSpacing: ".16em"}, "ÉTAPE 3 · CULTURE", "En capitales, encre secondaire : la ligne au-dessus du titre d'un parchemin, entre deux filets"),
    checkedStyle("font:700 13.5px/1 var(--police-titre);letter-spacing:.1em", ".lbl", CC, "etiquette", "titre", "13.5px", 1, 700, {letterSpacing: ".1em"}, "NOM DE LA COMPAGNIE", "En capitales, encre secondaire : l'étiquette d'un champ"),
  ]},
  {name: "Texte (EB Garamond)", family: "texte", styles: [
    checkedStyle("font:700 42px/1.1 var(--police-texte)", ".parch .parch-title", CC, "titre-parchemin", "texte", "42px", 1.1, 700, {}, "Choisissez votre culture", "Le grand titre d'un parchemin"),
    checkedStyle("font:500 26px var(--police-texte)", ".parch input.champ", CC, "saisie", "texte", "26px", null, 500, {}, "La Compagnie du Corbeau", "Ce que le joueur écrit dans un champ"),
    checkedStyle("font:italic 500 23px/1.45 var(--police-texte)", ".message", CC, "replique", "texte", "23px", 1.45, 500, {fontStyle: "italic"}, "« Encore un qui veut devenir capitaine… »", "En italique, ivoire sur la scène : la réplique de Cruxor"),
    checkedStyle("font:600 20px/1 var(--police-texte)", ".retour", CC, "lien-retour", "texte", "20px", 1, 600, {}, "‹ Retour", "Le lien « ‹ Retour » à gauche du bouton"),
    checkedStyle("font:italic 500 19px/1.4 var(--police-texte)", ".fiche-texte", CC, "texte-fiche", "texte", "19px", 1.4, 500, {fontStyle: "italic"}, "Des forgerons têtus, nés sous la montagne.", "En italique : la description sous le titre d'une fiche du parchemin"),
    checkedStyle("font:500 18px/1.38 var(--police-texte)", ".fiche-cols p", CC, "texte", "texte", "18px", 1.38, 500, {}, "Robustes et rancuniers, ils n'oublient jamais une dette.", "Le texte courant sur le parchemin"),
  ]},
  {name: "Fiche au survol (EB Garamond)", family: "texte", styles: [
    // Tailles de la fiche : une part de la hauteur du cartouche (565 px × 14,35 % = 81,08 px) ; ici en pixels.
    checkedStyle("font:700 calc(var(--hc-cart-h) * .54 * var(--hc-name-fit,1))/1.05 var(--police-texte);letter-spacing:.01em", ".hc-banner h3", ST, "nom-fiche", "texte", "43.8px", 1.05, 700, {letterSpacing: ".01em"}, "Hargrim Pierremarteau", "Le nom, dans le cartouche (0,54 × la hauteur du cartouche ; plus petit au-delà de 20 caractères)"),
    checkedStyle("font:italic 500 calc(var(--hc-cart-h) * .29)/1.15 var(--police-texte)", ".hc-title", ST, "titre-fiche", "texte", "23.5px", 1.15, 500, {fontStyle: "italic"}, "Canonnier en herbe", "En italique, le titre sous le nom (0,29 × la hauteur du cartouche ; au masculin pour tous)"),
    checkedStyle("font:700 20px/1.15 var(--police-texte)", ".hc-origin", ST, "phrase-origine", "texte", "20px", 1.15, 700, {}, "Nain des montagnes au sang de dragon", "La phrase d'origine, dans le ton moyen de la culture"),
  ]},
];

const shadow = (name, file, selector, value, usage) => ({name, value: cssLiteral(file, selector, value), usage});
const SHADOWS = [
  shadow("ombre-parchemin", CC, ".parch::before", "0 26px 34px rgba(0,0,0,.65)", "Sous le parchemin d'Idan (en filtre drop-shadow, qui suit ses bords)."),
  shadow("ombre-bouton", CC, ".btn::before", "0 6px 6px rgba(0,0,0,.55)", "Sous le bouton d'Idan, au repos et au survol (en filtre drop-shadow)."),
  shadow("ombre-bouton-appui", CC, ".btn:active::before", "0 3px 3px rgba(0,0,0,.55)", "Sous le bouton d'Idan quand on appuie (il descend de 2 px)."),
  shadow("ombre-texte-bouton", CC, ".btn", "0 1px 2px rgba(0,0,0,.85)", "Ombre du texte du bouton (text-shadow)."),
  shadow("ombre-texte-marque", CC, ".brand", "0 2px 8px #000", "Ombre du titre de l'en-tête sur la scène (text-shadow)."),
  shadow("ombre-replique", CC, ".message", "0 2px 6px #000,0 0 24px rgba(0,0,0,.65)", "Ombre de la réplique de Cruxor sur la scène (text-shadow)."),
  shadow("ombre-fiche", ST, ".hover-card", "0 26px 50px rgba(0,0,0,.75)", "Sous la fiche au survol."),
  shadow("ombre-nom-fiche", ST, ".hc-banner h3", "0 3px 3px rgba(0,0,0,.55)", "Sous le nom de la fiche au survol (en filtre drop-shadow : les lettres sont remplies de texture)."),
  shadow("ombre-titre-fiche", ST, ".hc-title span", "1px 1px 1.5px rgba(0,0,0,.65)", "Sous le titre de la fiche au survol (en filtre drop-shadow)."),
  shadow("ombre-ornement-titre", ST, ".hc-orn", "1px 1px 1.5px rgba(0,0,0,.65)", "Sous les ornements du titre de la fiche au survol (en filtre drop-shadow)."),
  shadow("ombre-picto", ST, ".hc-emblem .picto", "0 2px 3px rgba(36,24,12,.55)", "Sous les pictos peuple, culture, ascendance de la fiche au survol (en filtre drop-shadow)."),
  shadow("ombre-phrase-origine", ST, ".hc-origin", "0 1px 1.5px rgba(40,22,8,.3)", "Sous la phrase d'origine de la fiche au survol (text-shadow)."),
];

const dim = (name, file, selector, literal, value, usage) => (cssLiteral(file, selector, literal), {name, value, usage});
const DIMENSIONS = [
  dim("bouton-largeur", CC, ".btn", "width:240px", "240px", "Largeur du bouton d'Idan."),
  dim("bouton-hauteur", CC, ".btn", "height:81px", "81px", "Hauteur du bouton d'Idan."),
  dim("parchemin-largeur", CC, ".parch", "width:580px", "580px", "Largeur du petit parchemin (les grands font la largeur de la bande des étapes)."),
  dim("parchemin-bord", CC, ".parch::before", "border-width:100px", "100px", "Épaisseur des bords du parchemin d'Idan (ses coins ne sont jamais déformés)."),
  dim("fiche-largeur", ST, ".hover-card", "--hc-w:860px", "860px", "Largeur de la fiche au survol."),
  dim("fiche-hauteur", ST, ".hover-card", "--hc-h:565px", "565px", "Hauteur de la fiche au survol."),
  dim("picto-origine", ST, ".hc-emblem .picto", "width:52px;height:52px", "52px", "Taille des pictos peuple, culture, ascendance de la fiche au survol."),
  dim("ecart-pictos-origine", ST, ".hc-emblems", "gap:26px", "26px", "Écart entre les pictos peuple, culture, ascendance de la fiche au survol."),
];

function families() {
  return {titre: cssVar(CC, ":root", "police-titre").replace(/,/g, ", "), texte: cssVar(CC, ":root", "police-texte").replace(/,/g, ", ")};
}

function buildTokens() {
  return {
    name: "Charte Blood & Wages", version: 1,
    meta: {source: "Généré par scripts/build-charte.js à partir de prototype-web/creation-capitaine.css, prototype-web/styles.css et data/reference/culture-colors.json."},
    color: {themes: [{id: "jeu", name: "Jeu"}], tokens: [...PALETTE, ...HOVER_CARD, ...LEGACY, ...CULTURE_TOKENS]},
    type: {fonts: [], families: families(), groups: TYPE_GROUPS},
    shadow: {note: "Ombres de la charte, copiées du jeu ; certaines s'emploient en text-shadow ou en filtre drop-shadow (voir chaque usage).", tokens: SHADOWS},
    dimensions: {note: "Tailles fixes de la charte, copiées du jeu.", tokens: DIMENSIONS},
  };
}

// ---------------------------------------------------------------- images

const listDir = dir => fs.readdirSync(path.join(WEB, dir)).filter(f => !f.startsWith(".")).sort();
const IDAN = "Idan";
function buildAssets() {
  const group = (name, tile, files) => ({name, tile, files});
  const fromPrefix = (prefix) => listDir("assets/pictos").filter(f => f.startsWith(prefix + "-"))
    .map(f => ({name: f.slice(prefix.length + 1), source: `prototype-web/assets/pictos/${f}`}));
  const ornamentKeys = [...new Set(Object.values(ORNAMENTS))];
  return [
    group("Peuples", "s", fromPrefix("peuple")),
    group("Cultures", "s", fromPrefix("culture")),
    group("Ascendances", "s", fromPrefix("ascendance")),
    group("Écoles de magie", "s", fromPrefix("ecole")),
    group("Ornements du titre", "m", listDir("assets/fiche/ornements").map(f => {
      const used = Object.keys(ORNAMENTS).filter(k => ORNAMENTS[k] === f.replace(/\.svg$/, ""));
      if (!ornamentKeys.includes(f.replace(/\.svg$/, ""))) throw new Error(`Ornement sans culture : ${f}`);
      return {name: f, source: `prototype-web/assets/fiche/ornements/${f}`, cultures: used};
    })),
    group("Ornements de la charte", "s", [
      ...["lance.svg", "couronne.svg", "fleur-de-lys.svg"].map(f => ({name: f, source: `prototype-web/assets/creation/svg/${f}`})),
      ...["fil", "fil-centre", "fil-v", "croix", "chevron", "losange"].map(v => ({name: `${v}.svg`, source: `${CC} (--${v})`, dataUri: v})),
    ]),
    group("Interface", "m", [
      ...["bouton.webp", "parchemin.webp", "cachet.webp"].map(f => ({name: f, source: `prototype-web/assets/creation/${f}`, author: IDAN})),
      {name: "papier-froisse.webp", source: "prototype-web/assets/taverne/papier-froisse.webp", author: "ambientCG (texture « Paper003 »)", licence: "CC0"},
    ]),
    group("Pictos du camp", "s", [
      ...["picto-or.webp", "picto-mercenaires.webp", "picto-salaires.webp", "next.webp"].map(f => ({name: f, source: `prototype-web/assets/hud/${f}`})),
      ...listDir("assets/hud/pictos-bas").map(f => ({name: `bas-${f}`, source: `prototype-web/assets/hud/pictos-bas/${f}`})),
    ]),
    group("Textures des cultures", "l", CULTURE_COLORS.map(row => ({name: `${row.cle}.webp`, source: `prototype-web/assets/hud/barres/${row.cle}/center.webp`}))),
  ];
}

// Le contenu d'une image de la liste : un fichier du jeu, ou un SVG écrit en data URI dans creation-capitaine.css.
function assetBytes(file) {
  if (file.dataUri) {
    const m = cssVar(CC, ":root", file.dataUri).match(/^url\("data:image\/svg\+xml,(.*)"\)$/);
    if (!m) throw new Error(`--${file.dataUri} n'est pas un SVG en data URI`);
    return Buffer.from(decodeURIComponent(m[1]), "utf8");
  }
  return fs.readFileSync(path.join(ROOT, file.source));
}
const MIME = {".webp": "image/webp", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg"};

// ---------------------------------------------------------------- feuille de style des aperçus

// Les règles du jeu recopiées pour les aperçus. Les couleurs, polices et ombres passent par les jetons (une valeur changée
// sur la page se voit dans les aperçus) ; les images par la page ({{asset:Groupe/fichier}}). Les états (survol, appui,
// focus) ont aussi une classe, pour les montrer côte à côte.
const BUNDLE_RULES = [
  [CC, ".orn", ".brand", ".brand::before,.brand::after", ".brand::after", ".rule", ".rule::before,.rule::after", ".rule::after",
    ".message", ".message::before", ".message::after",
    ".parch", ".parch::before", ".parch-head", ".parch-head::before,.parch-head::after", ".parch-head::after", ".parch .parch-title",
    ".divider", ".divider::before,.divider::after", ".divider::after", ".divider .orn", ".divider .losange",
    ".parch .divider.haut", ".parch .divider.bas", ".lbl", ".lbl small", ".parch input.champ", ".parch input.champ:focus", ".parch input.champ::placeholder", ".parch-nav",
    ".retour", ".retour::after", ".retour:hover", ".retour:focus-visible",
    ".parch .fiche-titre", ".fiche-titre::before,.fiche-titre::after", ".fiche-titre::after", ".fiche-texte",
    ".btn", ".btn::before", ".btn .fl", ".btn:hover", ".btn:hover::before", ".btn:active", ".btn:active::before", ".btn:focus-visible",
    ".btn[disabled]", ".btn[disabled]::before"],
  [ST, ".hover-card", ".hc-portrait", ".hc-banner", ".hc-banner h3", ".hc-title", ".hc-title span", ".hc-title.is-two-lines span",
    ".hc-orn", ".hc-orn--r", ".hc-page", ".hc-origins", ".hc-emblems", ".hc-emblem", ".hc-emblem .picto", ".hc-origin"],
];
const TOKEN_PROPS = ["--hc-parchemin", "--or", "--or-clair", "--encre", "--encre-2", "--police-titre", "--police-texte"];
const STATES = {":hover": ".etat-survol", ":active": ".etat-appui", ":focus-visible": ".etat-focus", ":focus": ".etat-focus"};

function buildBundleCss(assets) {
  const bySource = new Map();
  for (const g of assets) for (const f of g.files) if (!f.dataUri) bySource.set(f.source.replace(/^prototype-web\//, ""), `${g.name}/${f.name}`);
  const asset = src => { const key = bySource.get(src); if (!key) throw new Error(`Image hors de la charte : ${src}`); return `{{asset:${key}}}`; };
  const shadows = [...SHADOWS].sort((a, b) => b.value.length - a.value.length);
  const out = [
    "/* Charte Blood & Wages — règles du jeu recopiées pour les aperçus par scripts/build-charte.js (ne pas modifier à la main). */",
    ":root{" + ["fil", "fil-centre", "fil-v", "croix", "chevron", "losange"].map(v => `--${v}:url("{{asset:Ornements de la charte/${v}.svg}}")`)
      .concat(["lance", "couronne"].map(v => `--${v}:url("{{asset:Ornements de la charte/${v}.svg}}")`))
      .concat(["--police-titre:var(--font-titre)", "--police-texte:var(--font-texte)"]).join(";") + "}",
  ];
  for (const [file, ...selectors] of BUNDLE_RULES) {
    out.push(`/* ${file} */`);
    for (const selector of selectors) {
      let rule = cssRule(file, selector);
      let body = rule.slice(selector.length + 1, -1);
      // Les variables qui sont des jetons ne sont pas redéclarées : celles de tokens.css s'appliquent.
      body = body.split(/;(?![^(]*\))/).filter(decl => !TOKEN_PROPS.some(p => decl.trim().startsWith(p + ":"))).join(";");
      body = body.replace(/url\("assets\/([^"]+)"\)/g, (_, src) => `url("${asset("assets/" + src)}")`);
      for (const s of shadows) body = body.split(s.value).join(`var(--${s.name})`);
      body = body.replace(/background:#15100c/, "background:var(--hc-fond)").replace(/,#eadcbc;/, ",var(--hc-page);");
      const sel = selector.split(",").flatMap(part => {
        const st = Object.keys(STATES).find(k => part.includes(k));
        return st ? [part, part.replace(st, STATES[st])] : [part];
      }).join(",");
      out.push(`${sel}{${body.trim()}}`);
    }
  }
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------- aperçus générés

const FONTS_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&amp;family=EB+Garamond:ital,wght@0,500;0,600;0,700;1,500&amp;display=swap">';
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function cultureFrameVars(cle) {
  const bar = HUD_BARS[cle], inset = (bar.bandBottom - bar.bandTop) * 0.08;
  const top = bar.bandTop + inset, band = bar.bandBottom - bar.bandTop - 2 * inset;
  return [`--hc-texture:url("{{asset:Textures des cultures/${cle}.webp}}")`, `--hc-tex-w:${(bar.center / band).toFixed(4)}`,
    `--hc-tex-h:${(bar.h / band).toFixed(4)}`, `--hc-tex-y:${(top / band).toFixed(4)}`,
    `--hc-orn:url("{{asset:Ornements du titre/${ORNAMENTS[cle]}.svg}}")`, `--hc-culture:var(--culture-${cle}-moyen)`].join(";");
}

function culturesPreview() {
  const rows = cultures.map(c => {
    const tones = ["sombre", "moyen", "clair"].map(t => `<span class="ton" style="--c:var(--culture-${c.cle}-${t})"><i></i><b data-var="--culture-${c.cle}-${t}"></b></span>`).join("");
    return `<li style="${esc(cultureFrameVars(c.cle))}"><img class="picto" src="{{asset:Cultures/${c.cle}.webp}}" alt=""><span class="nom">${esc(c.nom)}</span>` +
      `<span class="bande"><i class="hc-orn"></i><em>Titre</em><i class="hc-orn hc-orn--r"></i></span>${tones}` +
      `<span class="phrase">${esc(HOVER.originPhrase({people: peopleOf(c.nom), culture: c.nom}))}</span></li>`;
  }).join("\n");
  return `<!-- @dsCard group="Cultures" height=2100 subtitle="Les 32 cultures : picto, texture, ornement du titre, 3 tons, phrase d'origine" -->
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>Cultures</title>
${FONTS_LINK}
<style>
  body{margin:0;background:var(--hc-fond);font-family:var(--font-texte);color:var(--ivoire)}
  .entete,.cultures li{display:grid;grid-template-columns:40px 170px 200px repeat(3,84px) minmax(0,1fr);align-items:center;gap:0 12px;padding:0 12px}
  .entete{height:40px;font:700 11px/1 var(--font-titre);letter-spacing:.12em;text-transform:uppercase;color:var(--or)}
  .cultures{list-style:none;margin:0;padding:0}
  .cultures li{height:64px;border-top:1px solid rgba(201,164,97,.18)}
  .picto{width:40px;height:40px;object-fit:contain}
  .nom{font:600 16px/1.15 var(--font-texte)}
  .bande{display:flex;align-items:center;justify-content:center;gap:8px;height:46px;--hc-cart-h:56px;
    background:var(--hc-texture) 50% calc(var(--hc-cart-h) * var(--hc-tex-y) * -1)/max(100%,calc(var(--hc-cart-h) * var(--hc-tex-w))) calc(var(--hc-cart-h) * var(--hc-tex-h)) no-repeat}
  .bande em{font:italic 500 17px/1 var(--font-texte);color:var(--hc-parchemin);filter:drop-shadow(var(--ombre-titre-fiche))}
  .bande .hc-orn{width:46px;height:11px;translate:0 .1em}
  .ton{display:grid;justify-items:center;gap:3px}
  .ton i{display:block;width:80px;height:26px;background:var(--c);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
  .ton b{font:500 12px/1 ui-monospace,monospace;color:var(--muted)}
  .phrase{align-self:stretch;display:flex;align-items:center;padding:0 10px;background:var(--hc-page);font:700 16px/1.1 var(--font-texte);color:var(--hc-culture);text-shadow:var(--ombre-phrase-origine)}
</style></head>
<body>
<div class="entete"><span></span><span>Culture</span><span>Texture et ornement du titre</span><span>Sombre</span><span>Moyen</span><span>Clair</span><span>Phrase d'origine</span></div>
<ul class="cultures">
${rows}
</ul>
<script>
  var root=getComputedStyle(document.documentElement);
  document.querySelectorAll("b[data-var]").forEach(function(b){b.textContent=root.getPropertyValue(b.dataset.var).trim();});
</script>
</body>
</html>
`;
}
function peopleOf(cultureName) {
  const people = JSON.parse(read("data/reference/cultures.json")).rows.find(r => r.nom === cultureName);
  return (people?.peuples || "").split(",")[0].trim();
}

// Deux fiches au survol, zones 1 et 2 seulement (exemples tirés de recrues du jeu).
const FICHE_EXAMPLES = [
  {cle: "nains-des-montagnes", name: "Hargrim Pierremarteau", title: "Canonnier en herbe", people: "Nain", ascendance: "Sang de dragon"},
  {cle: "elfes-noirs", name: "Ithrandil Voile-noir", title: "Intimidateur en herbe", people: "Elfe", ascendance: ""},
  {cle: "reptiliens-des-marecages", name: "Akriss Thiss-Raa", title: "Empoisonneur en herbe à la sarbacane", people: "Reptilien", ascendance: "Sang de sirène"},
];
function fichePreview() {
  const cards = FICHE_EXAMPLES.map(e => {
    const c = cultures.find(x => x.cle === e.cle);
    const pictos = [`Peuples/${slug(e.people)}.webp`, `Cultures/${e.cle}.webp`, ...(e.ascendance ? [`Ascendances/${slug(e.ascendance)}.webp`] : [])];
    const phrase = HOVER.originPhrase({people: e.people, culture: c.nom, ascendance: e.ascendance});
    return `<div class="extrait"><article class="hover-card" style="${esc(cultureFrameVars(e.cle))}">
  <div class="hc-portrait"></div>
  <header class="hc-banner"><h3>${esc(e.name)}</h3><p class="hc-title"><i class="hc-orn"></i><span>${esc(e.title)}</span><i class="hc-orn hc-orn--r"></i></p></header>
  <div class="hc-page"><section class="hc-origins" aria-label="Origines"><div class="hc-emblems">${pictos.map(p => `<span class="hc-emblem"><img class="picto" src="{{asset:${p}}}" alt=""></span>`).join("")}</div><p class="hc-origin">${esc(phrase)}</p></section></div>
</article></div>`;
  }).join("\n");
  return `<!-- @dsCard group="Fiches" height=820 subtitle="Zones 1 (cartouche du nom) et 2 (origines), sur trois cultures" -->
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>Fiche au survol</title>
${FONTS_LINK}
<style>body{margin:0;padding:20px 0;background:var(--ink);display:grid;gap:20px;justify-content:center}.extrait{height:245px;overflow:hidden}</style></head>
<body>
${cards}
</body>
</html>
`;
}

// ---------------------------------------------------------------- écriture

const json = data => JSON.stringify(data, null, 2) + "\n";
function generatedFiles() {
  const assets = buildAssets();
  const manifest = {
    schema_version: 1,
    description: "Les images de la charte, par famille (le dossier assets/<famille>/ de la page Design System). Généré par scripts/build-charte.js ; ne pas modifier à la main.",
    groups: assets.map(g => ({name: g.name, tile: g.tile, files: g.files.map(f => {
      const bytes = assetBytes(f);
      return {name: f.name, source: f.source, size: bytes.length, type: MIME[path.extname(f.name)],
        ...(f.author ? {author: f.author} : {}), ...(f.licence ? {licence: f.licence} : {}), ...(f.cultures ? {cultures: f.cultures} : {})};
    })})),
  };
  return {
    "tokens.json": json(buildTokens()),
    "assets.json": json(manifest),
    "components/bundle.css": buildBundleCss(assets),
    "components/Cultures/preview.html": culturesPreview(),
    "components/FicheAuSurvol/preview.html": fichePreview(),
    _assets: assets,
  };
}

function main(argv) {
  const files = generatedFiles();
  const assets = files._assets; delete files._assets;
  if (argv.includes("--check")) {
    const stale = Object.keys(files).filter(f => !fs.existsSync(path.join(CHARTE, f)) || fs.readFileSync(path.join(CHARTE, f), "utf8") !== files[f]);
    if (stale.length) { console.error(`charte/ pas à jour (node scripts/build-charte.js) : ${stale.join(", ")}`); process.exit(1); }
    return;
  }
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(CHARTE, file)), {recursive: true});
    fs.writeFileSync(path.join(CHARTE, file), text);
  }
  console.log(`charte/ : ${Object.keys(files).join(", ")}`);
  const outIndex = argv.indexOf("--out");
  if (outIndex >= 0) assemble(path.resolve(argv[outIndex + 1]), assets);
}

// Prépare <out>/project/ (la page) : les fichiers de charte/ (sauf assets.json et publication.json), les images copiées
// dans project/assets/<famille>/ (fichiers de la page, servis comme ses textes : Idan, 2026-11-15, les images envoyées
// à part dans le stock de la page ne se chargeaient pas chez lui), les {{asset:…}} des aperçus remplacés par leur chemin
// depuis l'aperçu (../../assets/…), et l'index design-system.json. <out>/fichiers.json : la liste à publier.
function assemble(out, assets) {
  const pubFile = path.join(CHARTE, "publication.json");
  const pub = fs.existsSync(pubFile) ? JSON.parse(fs.readFileSync(pubFile, "utf8")) : {};
  const project = path.join(out, "project");
  fs.rmSync(out, {recursive: true, force: true});
  const written = [];
  const known = new Set();
  for (const g of assets) for (const f of g.files) {
    const rel = `assets/${g.name}/${f.name}`;
    fs.mkdirSync(path.join(project, "assets", g.name), {recursive: true});
    fs.writeFileSync(path.join(project, rel), assetBytes(f));
    written.push(`project/${rel}`);
    known.add(`${g.name}/${f.name}`);
  }
  const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  // Depuis un aperçu (project/components/<Comp>/preview.html), et pour bundle.css que la page lit à l'adresse de l'aperçu.
  const resolve = text => text.replace(/\{\{asset:([^}]+)\}\}/g, (_, key) => {
    if (!known.has(key)) throw new Error(`Image hors de la charte : ${key}`);
    return "../../assets/" + key.split("/").map(encodeURIComponent).join("/");
  });
  for (const abs of walk(CHARTE)) {
    const rel = path.relative(CHARTE, abs);
    if (["assets.json", "publication.json"].includes(rel)) continue;
    const dest = path.join(project, rel);
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    fs.writeFileSync(dest, /\.(html|css)$/.test(rel) ? resolve(fs.readFileSync(abs, "utf8")) : fs.readFileSync(abs));
    written.push(`project/${rel}`);
  }
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const assetGroups = Object.fromEntries(assets.map(g => [g.name, {name: g.name, tile: g.tile, order: g.files.map(f => f.name)}]));
  const index = {v: 3, layout: "files", createdOnFiles: pub.createdOnFiles || {v: 1, at: now}, title: "Charte Blood & Wages",
    namespace: "BloodWages", libraries: [], sections: {}, groups: assets.map(g => g.name), assetGroups, blobs: {}, docs: {sections: []},
    lastChange: {by: "Idan", at: now, via: "Claude Code", note: process.env.CHARTE_NOTE || "Charte : ce qui est déjà validé, rassemblé."}};
  fs.writeFileSync(path.join(project, "design-system.json"), json(index));
  fs.writeFileSync(path.join(out, "fichiers.json"), json(Object.fromEntries(written.map(p => [p, p]))));
  console.log(`${out} : ${written.length} fichiers + index`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = {generatedFiles};
