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
  biographies: "biographies.json"
};

async function loadReferenceData(base = "/data/") {
  const entries = await Promise.all(Object.entries(REFERENCE_FILES).map(async ([key, file]) => {
    const response = await fetch(base + file);
    if (!response.ok) throw new Error(`Impossible de charger ${file} (${response.status})`);
    return [key, await response.json()];
  }));
  return Object.fromEntries(entries);
}
