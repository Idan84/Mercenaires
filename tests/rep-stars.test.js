"use strict";

// Étoiles de réputation et de renommée (Idan, 2026-11-15) : l'étoile à facettes en bronze, argent ou or pour les étoiles
// pleines (« On va partir sur A pour l'étoile pleine ») ; pour les vides, « un gris transparent avec un très léger dégradé :
// le bas est un peu plus foncé que le haut ». Images : prototype-web/assets/ui/etoiles/.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const web = path.join(root, "prototype-web");
const js = fs.readFileSync(path.join(web, "ui.js"), "utf8");
const css = fs.readFileSync(path.join(web, "styles.css"), "utf8");
const esc = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Le rendu : cinq étoiles, les pleines puis les vides, sans caractère ★ ; le niveau lu par un lecteur d'écran.
const from = js.indexOf("function renderStarLevel("), to = js.indexOf("\nfunction ", from + 1);
assert.ok(from >= 0 && to > from, "renderStarLevel dans ui.js");
const renderStarLevel = new Function("esc", js.slice(from, to) + "return renderStarLevel;")(esc);
const out = renderStarLevel({stars: 3, metalKey: "gold", label: "3 étoiles d'or"}, "Réputation 900");
assert.match(out, /^<span class="rep-stars rep-stars--gold" role="img" title="3 étoiles d'or — Réputation 900" aria-label="3 étoiles d'or">/);
assert.equal((out.match(/<i class="rep-star"><\/i>/g) || []).length, 3, "trois étoiles pleines");
assert.equal((out.match(/<i class="rep-star rep-star--empty"><\/i>/g) || []).length, 2, "deux étoiles vides");
assert.ok(!out.includes("★"));
assert.equal(renderStarLevel(null), "—");

// Les images : une par métal et la vide, chacune reliée à sa classe ; la vide l'emporte sur le métal.
const IMAGES = {bronze: "bronze", silver: "argent", gold: "or"};
for (const [metal, file] of Object.entries(IMAGES)) {
  assert.ok(fs.existsSync(path.join(web, "assets/ui/etoiles", file + ".svg")), file + ".svg");
  assert.ok(css.includes(`.rep-stars--${metal} .rep-star{background-image:url("assets/ui/etoiles/${file}.svg")}`), metal);
}
const empty = `.rep-stars .rep-star--empty{background-image:url("assets/ui/etoiles/vide.svg");filter:none}`;
assert.ok(css.indexOf(empty) > css.indexOf(".rep-stars--gold .rep-star{"), "la règle de l'étoile vide vient après celles des métaux");
// L'étoile vide : un dégradé vertical, plus foncé et un peu plus opaque en bas qu'en haut.
const vide = fs.readFileSync(path.join(web, "assets/ui/etoiles/vide.svg"), "utf8");
const stops = [...vide.matchAll(/<stop offset="([\d.]+)" stop-color="#([0-9a-f]{6})" stop-opacity="([\d.]+)"\/>/g)]
  .map(m => ({offset: +m[1], gray: parseInt(m[2].slice(0, 2), 16), opacity: +m[3]}));
assert.match(vide, /x1="0" y1="0" x2="0" y2="1"/, "dégradé vertical");
assert.equal(stops.length, 2);
assert.ok(stops[1].gray < stops[0].gray && stops[1].opacity > stops[0].opacity, "le bas plus foncé que le haut");
assert.ok(stops.every(s => s.opacity < .6), "transparente");
// Plus de caractère ★ coloré : ni lettre-espacement ni ombre de texte sur les étoiles.
assert.doesNotMatch(css, /\.rep-stars[^{]*\{[^}]*(letter-spacing|text-shadow)/);
assert.doesNotMatch(css, /rep-stars-empty/);

console.log("Étoiles de réputation : facettes bronze / argent / or, vide en gris transparent — OK");
