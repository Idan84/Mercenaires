#!/usr/bin/env node
"use strict";
// L'inventaire des images du jeu, fichier par fichier, pour l'onglet Images de la Design Lab (Idan, 2026-11-16 :
// « C'est là que je pourrais voir le détail des images et faire les maj comme un grand ? »).
//
// Chaque famille du catalogue (data/reference/images.json) donne ses « motifs » : des chemins de prototype-web/ avec
// * (un nom), ** (des dossiers) et {a,b} (des variantes). Ce script les déroule en fichiers et lit la taille de chacun
// (largeur × hauteur en pixels, octets), sans outil externe : PNG, JPEG, WebP (fixe ou animé), GIF et SVG.
// Les familles lues sur Hostinger (avatars, décors) n'ont pas de motifs : leurs fichiers ne sont pas dans le dépôt.
//
// Usage : node scripts/build-images-index.js <fichier.json>   (scripts/build-site.sh l'écrit dans <site>/data/)
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WEB = path.join(ROOT, "prototype-web");

// {a,b} → toutes les variantes (accolades non imbriquées).
function expandBraces(pattern) {
  const m = pattern.match(/\{([^{}]*)\}/);
  if (!m) return [pattern];
  return m[1].split(",").flatMap(part => expandBraces(pattern.slice(0, m.index) + part + pattern.slice(m.index + m[0].length)));
}

// « **/ » : zéro ou plusieurs dossiers ; « * » : n'importe quel nom, sans « / ».
function globToRegExp(pattern) {
  let re = "";
  for (let i = 0; i < pattern.length;) {
    if (pattern.startsWith("**/", i)) { re += "(?:[^/]+/)*"; i += 3; }
    else if (pattern[i] === "*") { re += "[^/]*"; i++; }
    else { re += pattern[i].replace(/[.+?^${}()|[\]\\]/g, "\\$&"); i++; }
  }
  return new RegExp("^" + re + "$");
}

function walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join("/")];
  });
}

// Les fichiers d'une liste de motifs, triés, sans doublon.
function expandMotifs(motifs, root = WEB) {
  const found = new Set();
  for (const pattern of motifs.flatMap(expandBraces)) {
    const fixed = pattern.split("/").findIndex(seg => /[*]/.test(seg));
    const prefix = (fixed < 0 ? pattern.split("/").slice(0, -1) : pattern.split("/").slice(0, fixed)).join("/");
    const re = globToRegExp(pattern);
    for (const rel of walk(path.join(root, prefix))) {
      const file = prefix ? prefix + "/" + rel : rel;
      if (re.test(file)) found.add(file);
    }
  }
  return [...found].sort((a, b) => a.localeCompare(b, "fr", {numeric: true}));
}

// Largeur × hauteur lues dans l'en-tête du fichier ; null si le format n'est pas reconnu.
function imageSize(file) {
  const buf = fs.readFileSync(file);
  const ascii = (start, end) => buf.toString("latin1", start, end);
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) return {w: buf.readUInt32BE(16), h: buf.readUInt32BE(20)};
  if (ascii(0, 3) === "GIF") return {w: buf.readUInt16LE(6), h: buf.readUInt16LE(8)};
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    const chunk = ascii(12, 16);
    if (chunk === "VP8X") return {w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3)};
    if (chunk === "VP8L") { const b = buf.readUInt32LE(21); return {w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff)}; }
    if (chunk === "VP8 ") return {w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff};
    return null;
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i + 9 < buf.length;) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return {w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5)};
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  }
  const text = buf.toString("utf8", 0, Math.min(buf.length, 4096));
  const svg = text.match(/<svg\b[^>]*>/);
  if (svg) {
    const num = name => { const m = svg[0].match(new RegExp(`\\b${name}="([\\d.]+)(?:px)?"`)); return m ? Math.round(+m[1]) : null; };
    const box = svg[0].match(/viewBox="[\d.\-]+[ ,]+[\d.\-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/);
    const w = num("width") ?? (box ? Math.round(+box[1]) : null), h = num("height") ?? (box ? Math.round(+box[2]) : null);
    return w && h ? {w, h} : null;
  }
  return null;
}

function buildIndex(catalogue = JSON.parse(fs.readFileSync(path.join(ROOT, "data/reference/images.json"), "utf8"))) {
  const familles = {};
  for (const row of catalogue.rows) {
    if (!row.motifs.length) continue;
    familles[row.cle] = expandMotifs(row.motifs).map(chemin => {
      const full = path.join(WEB, chemin), size = imageSize(full);
      return {chemin, octets: fs.statSync(full).size, largeur: size?.w ?? null, hauteur: size?.h ?? null};
    });
  }
  return {description: "Les fichiers de chaque famille d'images (data/reference/images.json, colonne motifs), avec leur taille. Généré par scripts/build-images-index.js.", familles};
}

if (require.main === module) {
  const out = process.argv[2];
  if (!out) { console.error("Usage : node scripts/build-images-index.js <fichier.json>"); process.exit(1); }
  const index = buildIndex();
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, JSON.stringify(index) + "\n");
  const n = Object.values(index.familles).reduce((s, f) => s + f.length, 0);
  console.log(`Inventaire des images : ${n} fichiers, ${Object.keys(index.familles).length} familles → ${out}`);
}

module.exports = {expandBraces, globToRegExp, expandMotifs, imageSize, buildIndex};
