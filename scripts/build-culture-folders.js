"use strict";
// Les 32 dossiers des images par culture sur Hostinger, media/cultures/<peuple>/<culture>/ (Idan, 2026-11-28 : « Sur
// hostinger, tu peux me créer les dossiers peuples et cultures, comme ça on est certain qu'il n'y a pas de faute de
// frappes ! ») : la mise en ligne n'envoie que des fichiers, alors chaque dossier reçoit un LISEZ-MOI.txt qui rappelle les
// noms attendus (data/reference/culture-media.json). Le jeu ne lit que les images (api/cultures.php) ; la mise en ligne
// n'efface et n'écrase jamais rien d'autre dans media/ (scripts/deploy-obsolete.sh).
// Usage : node scripts/build-culture-folders.js <dossier du site>   (appelé par scripts/build-site.sh)
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const table = JSON.parse(fs.readFileSync(path.join(ROOT, "data/reference/culture-media.json"), "utf8"));

// Ce que le jeu fait de chaque fichier (les clés de « fichiers »).
const ROLES = {
  barreHaut: "la barre du haut du camp, exportée par l'Atelier des cultures (l'écran entier, 3840 × 2160)",
  barreBas: "la barre du bas du camp, exportée par l'Atelier des cultures (l'écran entier, 3840 × 2160)",
  play: "le bouton Jour suivant (l'écran entier, 3840 × 2160)",
  ficheSurvol: "le cadre de la fiche au survol, exporté par l'Atelier des cultures (1840 × 1250)",
  fichePopup: "le cadre du pop-up, exporté par l'Atelier des cultures (2006 × 938)",
  picto: "le picto de la culture (pas encore affiché par le jeu)"
};

function lisezMoi(row) {
  const lines = Object.entries(table.fichiers).map(([key, file]) => `- ${file} : ${ROLES[key] || key}`);
  return [
    `${row.nom} — ${table.base}/${row.dossier}/`,
    "",
    "Les images de la culture, que le jeu lit sous ces noms exacts (majuscules indifférentes) :",
    ...lines,
    "",
    "Les barres ne s'affichent que si les deux sont là (Barre_haut.png et Barre_bas.png) ; sinon le jeu garde les siennes.",
    "Ce fichier est posé par la mise en ligne pour créer le dossier : le jeu ne le lit pas.",
    ""
  ].join("\r\n");
}

function buildCultureFolders(siteDir) {
  for (const row of table.rows) {
    const dir = path.join(siteDir, table.base, ...row.dossier.split("/"));
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(path.join(dir, "LISEZ-MOI.txt"), lisezMoi(row));
  }
  return table.rows.length;
}

if (require.main === module) {
  const out = process.argv[2];
  if (!out) {
    console.error("Usage : node scripts/build-culture-folders.js <dossier du site>");
    process.exit(1);
  }
  console.log(`Dossiers des cultures : ${buildCultureFolders(out)}.`);
}

module.exports = {buildCultureFolders, lisezMoi};
