"use strict";

// Régression UI : dix textes et dix cœurs, aucun score d'affinité sur la fiche.
// Les calculs d'affinité du moteur restent inchangés.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const ui = fs.readFileSync(path.join(root, "prototype-web/ui.js"), "utf8");
const css = fs.readFileSync(path.join(root, "prototype-web/styles.css"), "utf8");
const extract = (start, end) => {
  const a = ui.indexOf("function " + start + "(");
  const b = ui.indexOf("function " + end + "(", a);
  assert.ok(a >= 0 && b > a, "fonctions " + start + " / " + end + " présentes");
  return ui.slice(a, b);
};
const presentation = new Function(
  extract("affinityPresentation", "renderCaptainAffinity") + "\nreturn affinityPresentation;"
)();

const cases = [
  [-100, 0, "Rêve en permanence de vous arracher les organes."],
  [-80, 1, "Rêve en permanence de vous arracher les organes."],
  [-79, 1, "Envisage sérieusement d'empoisonner votre prochain repas."],
  [-60, 2, "Envisage sérieusement d'empoisonner votre prochain repas."],
  [-59, 2, "Vous méprise avec une constance presque admirable."],
  [-39, 3, "Préférerait recevoir ses ordres d'un gobelin ivre."],
  [-19, 4, "Vous supporte, essentiellement pour votre argent."],
  [0, 5, "Vous supporte, essentiellement pour votre argent."],
  [1, 5, "Vous trouve moins insupportable que prévu."],
  [21, 6, "Éprouve pour vous un respect prudent, mais sincère."],
  [41, 7, "Vous suivrait au combat, même sans prime exceptionnelle."],
  [61, 8, "Donnerait sa vie pour vous. Enfin, probablement."],
  [79, 8, "Donnerait sa vie pour vous. Enfin, probablement."],
  [80, 9, "Fantasme toutes les nuits en pensant à vous."],
  [100, 10, "Fantasme toutes les nuits en pensant à vous."]
];
for (const [score, hearts, phrase] of cases) {
  assert.deepEqual(presentation(score), { filled: hearts, phrase }, "affinité " + score);
}
assert.equal(presentation(-900).filled, 0, "score négatif borné");
assert.equal(presentation(900).filled, 10, "score positif borné");

const member = { id: "merc-1" };
let affinity = { total: -100 };
const render = new Function(
  "game", "captainAffinity", "affinityPresentation", "esc",
  extract("renderCaptainAffinity", "fmtDelta") + "\nreturn renderCaptainAffinity;"
)(
  { campaign: { company: { roster: [member] } } },
  () => affinity,
  presentation,
  x => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;")
);
const low = render(member);
assert.match(low, /player-affinity-hearts/);
assert.match(low, /♡{10}/);
assert.match(low, /Rêve en permanence/);
assert.doesNotMatch(low, /(?:-100|score|acquise|alignement|culture|peuple)/i);
affinity = { total: 100 };
const high = render(member);
assert.match(high, /♥{10}/);
assert.match(high, /Fantasme toutes les nuits/);
assert.doesNotMatch(high, /\+100/);
assert.equal(render({ id: "not-recruited" }), "", "pas de bloc hors effectif");
assert.match(css, /\.sheet-column \.player-affinity\{/, "l'affinité occupe sa colonne de la fiche");
console.log("Affinité fiche : seuils, cœurs et absence de score — OK");
