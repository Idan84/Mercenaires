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
const phrases = JSON.parse(fs.readFileSync(path.join(root, "data/reference/affinity-phrases.json"), "utf8"));
const game = { referenceData: { affinityPhrases: phrases } };
const presentation = new Function("game",
  extract("variantPhrase", "renderCaptainAffinity") + "\nreturn affinityPresentation;"
)(game);

// Dix niveaux, quatre phrases de même sens chacun (Idan, 2026-10-24), toutes différentes.
assert.equal(phrases.rows.length, 10);
const levelPhrases = level => { const row = phrases.rows[level]; return [row.phrase, ...row.variantes]; };
for (const row of phrases.rows) assert.equal(row.variantes.length, 3);
assert.equal(new Set(phrases.rows.flatMap(r => [r.phrase, ...r.variantes])).size, 40);

// Seuils et cœurs : [score, cœurs, niveau, phrase approuvée du niveau].
const cases = [
  [-100, 0, 0, "Rêve en permanence de vous arracher les organes."],
  [-80, 1, 0, "Rêve en permanence de vous arracher les organes."],
  [-79, 1, 1, "Envisage sérieusement d'empoisonner votre prochain repas."],
  [-60, 2, 1, "Envisage sérieusement d'empoisonner votre prochain repas."],
  [-59, 2, 2, "Vous méprise avec une constance presque admirable."],
  [-39, 3, 3, "Préférerait recevoir ses ordres d'un gobelin ivre."],
  [-19, 4, 4, "Vous supporte, essentiellement pour votre argent."],
  [0, 5, 4, "Vous supporte, essentiellement pour votre argent."],
  [1, 5, 5, "Vous trouve moins insupportable que prévu."],
  [21, 6, 6, "Éprouve pour vous un respect prudent, mais sincère."],
  [41, 7, 7, "Vous suivrait au combat, même sans prime exceptionnelle."],
  [61, 8, 8, "Donnerait sa vie pour vous. Enfin, probablement."],
  [79, 8, 8, "Donnerait sa vie pour vous. Enfin, probablement."],
  [80, 9, 9, "Fantasme toutes les nuits en pensant à vous."],
  [100, 10, 9, "Fantasme toutes les nuits en pensant à vous."]
];
for (const [score, hearts, level, approved] of cases) {
  assert.equal(levelPhrases(level)[0], approved, "phrase approuvée du niveau " + level);
  const shown = presentation(score, { id: 7 });
  assert.equal(shown.filled, hearts, "cœurs " + score);
  assert.ok(levelPhrases(level).includes(shown.phrase), "affinité " + score + " : " + shown.phrase);
}
assert.equal(presentation(-900).filled, 0, "score négatif borné");
assert.equal(presentation(900).filled, 10, "score positif borné");
// Même mercenaire, même niveau : même phrase ; d'un mercenaire à l'autre, les quatre phrases sortent.
assert.equal(presentation(30, { id: 12 }).phrase, presentation(35, { id: 12 }).phrase);
const seen = new Set(Array.from({ length: 60 }, (_, id) => presentation(30, { id }).phrase));
assert.deepEqual([...seen].sort(), levelPhrases(6).sort(), "quatre variantes réparties sur la compagnie");

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
assert.ok(levelPhrases(0).some(p => low.includes(p)), "phrase du niveau le plus bas");
assert.doesNotMatch(low, /(?:-100|score|acquise|alignement|culture|peuple)/i);
affinity = { total: 100 };
const high = render(member);
assert.match(high, /♥{10}/);
assert.ok(levelPhrases(9).some(p => high.includes(p)), "phrase du niveau le plus haut");
assert.doesNotMatch(high, /\+100/);
assert.equal(render({ id: "not-recruited" }), "", "pas de bloc hors effectif");
assert.match(css, /\.sheet-column \.player-affinity\{/, "l'affinité occupe sa colonne de la fiche");
console.log("Affinité fiche : seuils, cœurs, variantes et absence de score — OK");
