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
  boots: "boots.json",
  belts: "belts.json",
  amulets: "amulets.json",
  capes: "capes.json",
  gloves: "gloves.json",
  pants: "pants.json",
  rings: "rings.json",
  helmets: "helmets.json",
  enemyArchetypes: "enemy-archetypes.json",
  summonArchetypes: "summon-archetypes.json",
  potions: "potions.json",
  oneShotMissions: "one-shot-missions.json",
  dormitoryQuality: "dormitory-quality.json",
  campBuildings: "camp-buildings.json",
  itemQualities: "item-qualities.json",
  equipmentSlots: "equipment-slots.json",
  startingEquipmentGeneration: "starting-equipment-generation.json",
  binaryAptitudeGrants: "binary-aptitude-grants.json",
  alignmentGeneration: "alignment-generation.json",
  peopleAffinity: "people-affinity.json",
  reputationStars: "reputation-stars.json",
  affinityPhrases: "affinity-phrases.json",
  campCalendar: "camp-calendar.json",
  equipmentSilhouetteFiles: "equipment-silhouettes.json",
  characterNames: "character-names.json",
  biographies: "biographies.json",
  captainCreationCopy: "captain-creation-copy.json",
  characterSheetCopy: "character-sheet-copy.json",
  tavernDialogue: "tavern-dialogue.json",
  equipmentDialogue: "equipment-dialogue.json",
  stewardDialogue: "steward-dialogue.json",
  medicDialogue: "medic-dialogue.json",
  schoolDirectorDialogue: "school-director-dialogue.json",
  spellStudyDialogue: "spell-study-dialogue.json",
  lieutenantDialogue: "lieutenant-dialogue.json",
  bodyguardMissions: "bodyguard-missions.json",
  merchants: "merchants.json",
  mercenaryProfile: "mercenary-profile.json",
  mercenaryTitles: "mercenary-titles.json",
  dayNews: "day-news.json",
  spells: "spells.json",
  domains: "domains.json",
  itemTitles: "item-titles.json",
  renamedNames: "renamed-names.json"
};

async function loadReferenceData(base = "/data/") {
  const entries = await Promise.all(Object.entries(REFERENCE_FILES).map(async ([key, file]) => {
    const response = await fetch(base + file);
    if (!response.ok) throw new Error(`Impossible de charger ${file} (${response.status})`);
    return [key, await response.json()];
  }));
  const data = Object.fromEntries(entries);
  [data.avatars, data.equipmentSilhouettes] = await Promise.all([loadAvatarCatalog(data, base), loadSilhouetteCatalog(data)]);
  return data;
}

// Silhouettes d'équipement (Idan, 2026-10-21) : déposées sur Hostinger dans media/Avatars_Equipements,
// indexées par api/silhouettes.php. Sans index (serveur local sans PHP), la fiche garde son mannequin.
async function loadSilhouetteCatalog(reference) {
  const catalog = globalThis.MercenairesAvatarCatalog;
  try {
    const response = await fetch("/api/silhouettes.php", { cache: "no-cache" });
    if (!response.ok || !/json/i.test(response.headers.get("content-type") || "")) return { rows: [], warnings: [] };
    const hosted = await response.json();
    const built = catalog.buildSilhouetteCatalog(hosted.files || [], reference, { baseUrl: catalog.fileUrl("/", hosted.base || "media/Avatars_Equipements") });
    if (built.warnings.length) console.warn("Silhouettes Hostinger :", built.warnings);
    return built;
  } catch {
    return { rows: [], warnings: [] };
  }
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
  const baseUrl = catalog.fileUrl("/", hosted?.base || "media/avatars");
  const media = hosted && Array.isArray(hosted.files) ? catalog.buildAvatarCatalog(hosted.files, reference, { baseUrl }) : { rows: [], warnings: [] };
  if (media.warnings.length) console.warn("Avatars Hostinger :", media.warnings);
  const rows = catalog.mergeCatalogs(git?.rows || [], media.rows);
  return { row_count: rows.length, rows, warnings: media.warnings, sources: { git: git?.rows?.length || 0, hostinger: media.rows.length } };
}
