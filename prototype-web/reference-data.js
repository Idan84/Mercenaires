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
  terrainDecors: "terrain-decors.json",
  combatCells: "combat-cells.json",
  combatEdges: "combat-edges.json",
  terrainSkills: "terrain-skills.json",
  missionLandscapes: "mission-landscapes.json",
  mounts: "mounts.json",
  animalNames: "animal-names.json",
  potions: "potions.json",
  oneShotMissions: "one-shot-missions.json",
  dormitoryQuality: "dormitory-quality.json",
  campBuildings: "camp-buildings.json",
  canteenDishes: "canteen-dishes.json",
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
  campMastersDialogue: "camp-masters-dialogue.json",
  spellStudyDialogue: "spell-study-dialogue.json",
  armorStudyDialogue: "armor-study-dialogue.json",
  poisonStudyDialogue: "poison-study-dialogue.json",
  lumberDialogue: "lumber-dialogue.json",
  mineDialogue: "mine-dialogue.json",
  persuasionDialogue: "persuasion-dialogue.json",
  palaceDialogue: "palace-dialogue.json",
  dungeonDialogue: "dungeon-dialogue.json",
  memorial: "memorial.json",
  duelDialogue: "duel-dialogue.json",
  cellarDialogue: "cellar-dialogue.json",
  desertionDialogue: "desertion-dialogue.json",
  salaryReviewDialogue: "salary-review-dialogue.json",
  socialPolicyCopy: "social-policy-copy.json",
  debtsCopy: "debts-copy.json",
  mutinyDialogue: "mutiny-dialogue.json",
  usurerDialogue: "usurer-dialogue.json",
  lieutenantDialogue: "lieutenant-dialogue.json",
  bodyguardMissions: "bodyguard-missions.json",
  merchants: "merchants.json",
  mercenaryProfile: "mercenary-profile.json",
  mercenaryTitles: "mercenary-titles.json",
  oldSteward: "old-steward.json",
  dayNews: "day-news.json",
  spells: "spells.json",
  domains: "domains.json",
  itemTitles: "item-titles.json",
  renamedNames: "renamed-names.json",
  cultureColors: "culture-colors.json",
  cultureKits: "culture-kits.json",
  tagWorkshop: "tag-workshop.json"
};

async function loadReferenceData(base = "/data/") {
  const entries = await Promise.all(Object.entries(REFERENCE_FILES).map(async ([key, file]) => {
    const response = await fetch(base + file);
    if (!response.ok) throw new Error(`Impossible de charger ${file} (${response.status})`);
    return [key, await response.json()];
  }));
  const data = Object.fromEntries(entries);
  [data.avatars, data.equipmentSilhouettes, data.cultureKits, data.tagWorkshop] = await Promise.all([loadAvatarCatalog(data, base),
    loadSilhouetteCatalog(data), loadCultureSettings(data.cultureKits), loadTagWorkshop(data.tagWorkshop)]);
  return data;
}

// Réglages des cultures en direct (Idan, 2026-11-21 : « que le jeu lise directement les réglages que je mets dans le design
// lab pour les cultures ») : chaque « Enregistrer » de l'onglet Cultures range ses réglages sur Hostinger
// (design/api/reglages.php → media/reglages/index.json, le plus récent en premier). Le jeu reprend, pour chaque culture et
// chaque panneau (barres, fiche, plein), le dernier enregistrement par-dessus son kit (data/reference/culture-kits.json),
// comme le Design Lab (cultures-lab.js, fondre) : seulement les réglages que le kit connaît, du même type. Sans index
// (serveur local, tests, réseau), le kit du dépôt.
const CULTURE_PANELS = ["barres", "fiche", "plein"];
const CULTURE_EXTRA_SETTINGS = ["inactifs"];
function mergeCultureSetting(base, saved) {
  if (base && typeof base === "object" && !Array.isArray(base)) {
    const merged = Object.fromEntries(Object.entries(base).map(([key, value]) => [key, mergeCultureSetting(value, saved?.[key])]));
    for (const key of CULTURE_EXTRA_SETTINGS) {
      if (!(key in base) && typeof saved?.[key] === "number" && Number.isFinite(saved[key])) merged[key] = saved[key];
    }
    return merged;
  }
  if (Array.isArray(base)) return Array.isArray(saved) ? saved : base;
  return saved !== null && typeof saved === typeof base && (typeof saved !== "number" || Number.isFinite(saved)) ? saved : base;
}
function applyCultureSettings(cultureKits, index) {
  const saved = Array.isArray(index?.reglages) ? index.reglages : [];
  const latest = {};
  for (const entry of saved) {
    if (!entry || !CULTURE_PANELS.includes(entry.panneau) || !entry.reglages || typeof entry.reglages !== "object") continue;
    const key = entry.culture + "|" + entry.panneau, date = String(entry.date || "");
    if (!latest[key] || date > String(latest[key].date || "")) latest[key] = entry;
  }
  const rows = (cultureKits?.rows || []).map(kit => {
    const row = { ...kit };
    for (const panel of CULTURE_PANELS) {
      const entry = latest[kit.cle + "|" + panel];
      if (entry && kit[panel] && typeof kit[panel] === "object") row[panel] = mergeCultureSetting(kit[panel], entry.reglages);
    }
    return row;
  });
  return { ...cultureKits, rows };
}
async function loadCultureSettings(cultureKits) {
  try {
    const response = await fetch("/media/reglages/index.json?t=" + Date.now(), { cache: "no-store" });
    if (!response.ok || !/json/i.test(response.headers.get("content-type") || "")) return cultureKits;
    return applyCultureSettings(cultureKits, await response.json());
  } catch {
    return cultureKits;
  }
}

// L'atelier des tags en direct (Idan, 2026-11-22 : « je veux que le jeu lise les datas de l'atelier ») : la dernière version
// enregistrée dans le Design Lab (design/atelier/ → media/atelier/actuel.json ; doc 20 §12). Sans elle (serveur local,
// tests, réseau), la copie du dépôt (data/reference/tag-workshop.json).
async function loadTagWorkshop(workshop) {
  try {
    const response = await fetch("/media/atelier/actuel.json?t=" + Date.now(), { cache: "no-store" });
    if (!response.ok || !/json/i.test(response.headers.get("content-type") || "")) return workshop;
    const live = await response.json();
    const doc = live?.doc;
    return doc && Array.isArray(doc.tags) && Array.isArray(doc.tests) ? { ...doc, version: live.version, date: live.date } : workshop;
  } catch {
    return workshop;
  }
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
const AVATAR_INDEX_RETRIES = 5;
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
  // api/avatars.php lit les nouvelles images quelques secondes par appel (« complete »: false tant qu'il en reste) : on le
  // redemande jusqu'à ce que l'index soit complet, quelques fois au plus (Idan, 2026-11-03 : « ça lit pas tout »).
  const readIndex = async () => {
    let index = await fetchJson("/api/avatars.php");
    for (let i = 0; index && index.complete === false && i < AVATAR_INDEX_RETRIES; i++) index = await fetchJson("/api/avatars.php");
    return index;
  };
  const [git, hosted] = await Promise.all([fetchJson(base + "avatars.json"), readIndex()]);
  const baseUrl = catalog.fileUrl("/", hosted?.base || "media/avatars");
  const media = hosted && Array.isArray(hosted.files) ? catalog.buildAvatarCatalog(hosted.files, reference, { baseUrl }) : { rows: [], warnings: [] };
  if (media.warnings.length) console.warn("Avatars Hostinger :", media.warnings);
  const rows = catalog.mergeCatalogs(git?.rows || [], media.rows);
  return { row_count: rows.length, rows, warnings: media.warnings, complete: hosted ? hosted.complete !== false : true,
    sources: { git: git?.rows?.length || 0, hostinger: media.rows.length } };
}
