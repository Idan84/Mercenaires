"use strict";

const REFERENCE_FILES = {
  peoples: "peoples.json",
  cultures: "cultures.json",
  socialOrigins: "social-origins.json",
  alignments: "alignments.json",
  ancestries: "ancestries.json",
  ancestryCompatibility: "ancestry-compatibility.json",
  cultureOriginCompatibility: "culture-origin-compatibility.json",
  ancestryLevels: "ancestry-levels.json",
  d6Scale: "d6-generation-scale.json",
  generationMatrix: "generation-matrix.json",
  skills: "skills.json",
  characteristics: "characteristics.json",
  formulaConstants: "formula-constants.json",
  weapons: "weapons.json",
  baseArmors: "base-armors.json",
  itemQualities: "item-qualities.json",
  equipmentSlots: "equipment-slots.json",
  startingEquipmentGeneration: "starting-equipment-generation.json",
  binaryAptitudeGrants: "binary-aptitude-grants.json",
  alignmentGeneration: "alignment-generation.json",
  biographies: "biographies.json",
  captainCreationCopy: "captain-creation-copy.json"
};

async function loadReferenceData(base = "/data/") {
  const entries = await Promise.all(Object.entries(REFERENCE_FILES).map(async ([key, file]) => {
    const response = await fetch(base + file);
    if (!response.ok) throw new Error(`Impossible de charger ${file} (${response.status})`);
    return [key, await response.json()];
  }));
  const data = Object.fromEntries(entries);
  data.avatars = await loadAvatarCatalog(data, base);
  return data;
}

// Avatars : ceux de Git (data/avatars.json) et ceux qu'Idan dépose sur Hostinger (media/avatars/,
// indexés par api/avatars.php). À identifiant égal, Hostinger l'emporte. Si l'un des deux manque
// (serveur local sans PHP, dossier vide…), on fait avec l'autre ; sans aucun, portraits génériques.
async function loadAvatarCatalog(reference, base = "/data/") {
  const catalog = globalThis.MercenairesAvatarCatalog;
  const fetchJson = async url => {
    try {
      const response = await fetch(url, { cache: "no-cache" });
      if (!response.ok || !/json/i.test(response.headers.get("content-type") || "")) return null;
      return await response.json();
    } catch {
      return null;
    }
  };
  const [git, hosted] = await Promise.all([fetchJson(base + "avatars.json"), fetchJson("/api/avatars.php")]);
  const media = hosted && Array.isArray(hosted.files) ? catalog.buildAvatarCatalog(hosted.files, reference) : { rows: [], warnings: [] };
  if (media.warnings.length) console.warn("Avatars Hostinger :", media.warnings);
  const rows = catalog.mergeCatalogs(git?.rows || [], media.rows);
  return { row_count: rows.length, rows, warnings: media.warnings, sources: { git: git?.rows?.length || 0, hostinger: media.rows.length } };
}
