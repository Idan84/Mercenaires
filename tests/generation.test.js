"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createGenerator} = require("../game-core/mercenary-generator.js");

const ROOT = path.resolve(__dirname, "..");
const files = {
  peoples:"peoples.json", cultures:"cultures.json", socialOrigins:"social-origins.json",
  alignments:"alignments.json", ancestries:"ancestries.json",
  ancestryCompatibility:"ancestry-compatibility.json",
  cultureOriginCompatibility:"culture-origin-compatibility.json",
  ancestryLevels:"ancestry-levels.json", d6Scale:"d6-generation-scale.json",
  generationMatrix:"generation-matrix.json", skills:"skills.json",
  characteristics:"characteristics.json", formulaConstants:"formula-constants.json",
  weapons:"weapons.json", baseArmors:"base-armors.json", boots:"boots.json", belts:"belts.json", amulets:"amulets.json", capes:"capes.json", gloves:"gloves.json",
  itemQualities:"item-qualities.json",
  equipmentSlots:"equipment-slots.json", startingEquipmentGeneration:"starting-equipment-generation.json",
  binaryAptitudeGrants:"binary-aptitude-grants.json",
  alignmentGeneration:"alignment-generation.json"
};

const reference = Object.fromEntries(Object.entries(files).map(([key,file]) => [
  key,
  JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"))
]));

function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const generator = createGenerator(reference, {
  random: mulberry32(0xC0FFEE),
  nameGenerator: (people,id) => `${people} ${id}`
});

const audit = generator.auditReferenceData();
assert.deepEqual(audit.issues, []);
assert.equal(audit.counts.peoples, 10);
assert.equal(audit.counts.cultures, 32);
assert.equal(audit.counts.cultureOriginCompatibilities, 224);
assert.equal(audit.counts.matrixRows, 106);
assert.equal(audit.counts.skills, 94);
assert.equal(audit.counts.baseArmors, 8);
assert.equal(audit.counts.equipmentSlots, 23, "dont gants et culotte (Idan, 2026-10-24)");
assert.deepEqual(generator.equipmentTierDistribution(0), {1:0.9,2:0.09,3:0.01});
assert.deepEqual(generator.equipmentTierDistribution(400), {1:0.25,2:0.45,3:0.30});
assert.equal(audit.probabilities.peopleProbability, 1);
assert.equal(audit.probabilities.ancestryLevelProbability, 1);
assert.equal(audit.matrixCoverage.filter(x => x.status === "missing-target").length, 0);

assert.equal(audit.pending.length, 0, `Gameplay generation still has pending rules: ${JSON.stringify(audit.pending)}`);
assert.equal(audit.binaryPending.length, 0);
assert.equal(audit.binaryDisabled.length, 1);
assert.equal(audit.binaryDisabled[0].target, "Vol");
assert.equal(audit.matrixCoverage.filter(x => x.status === "active").length, 106);
assert.equal(audit.matrixCoverage.filter(x => x.status === "blocked").length, 0);

function distributionMap(people) {
  return Object.fromEntries(generator.alignmentDistributionForPeople(people).map(x => [x.name, x]));
}

const orcAlignment = distributionMap("Orc");
assert.equal(orcAlignment["Chaotique mauvais"].probability, 0.4);
for (const name of ["Chaotique neutre","Neutre","Neutre mauvais"]) {
  assert.ok(Math.abs(orcAlignment[name].probability - 0.15) < 1e-12);
}
for (const name of ["Loyal bon","Neutre bon","Chaotique bon","Loyal neutre","Loyal mauvais"]) {
  assert.ok(Math.abs(orcAlignment[name].probability - 0.03) < 1e-12);
}
assert.ok(Math.abs(Object.values(orcAlignment).reduce((sum,x)=>sum+x.probability,0)-1) < 1e-9);

const darkElfAlignment = Object.fromEntries(
  generator.alignmentDistributionForPeople("Elfe","Elfes noirs").map(x => [x.name,x])
);
assert.equal(darkElfAlignment["Chaotique mauvais"].probability, 0.4);
for (const name of ["Chaotique neutre","Neutre","Neutre mauvais"]) {
  assert.ok(Math.abs(darkElfAlignment[name].probability - 0.15) < 1e-12);
}
// Nains du chaos (Idan, 2026-10-23) : Chaotique neutre, comme les Elfes noirs ont Chaotique mauvais.
const chaosDwarfAlignment = Object.fromEntries(
  generator.alignmentDistributionForPeople("Nain","Nains du chaos").map(x => [x.name,x])
);
assert.equal(chaosDwarfAlignment["Chaotique neutre"].probability, 0.4);
for (const name of ["Chaotique bon","Neutre bon","Neutre","Neutre mauvais","Chaotique mauvais"]) {
  assert.ok(Math.abs(chaosDwarfAlignment[name].probability - 0.09) < 1e-12);
}

const humanAlignment = distributionMap("Humain");
assert.equal(humanAlignment.Neutre.probability, 0.4);
for (const name of [
  "Loyal bon","Neutre bon","Chaotique bon",
  "Loyal neutre","Chaotique neutre",
  "Loyal mauvais","Neutre mauvais","Chaotique mauvais"
]) {
  assert.ok(Math.abs(humanAlignment[name].probability - 0.075) < 1e-12);
}

const reptilianAlignment = distributionMap("Reptilien");
assert.equal(reptilianAlignment["Loyal neutre"].probability, 0.4);
for (const name of ["Loyal bon","Neutre bon","Neutre","Loyal mauvais","Neutre mauvais"]) {
  assert.ok(Math.abs(reptilianAlignment[name].probability - 0.09) < 1e-12);
}
for (const name of ["Chaotique bon","Chaotique neutre","Chaotique mauvais"]) {
  assert.ok(Math.abs(reptilianAlignment[name].probability - 0.05) < 1e-12);
}

const alignmentCaptain = {alignment:"Chaotique mauvais"};
const humanWithCaptainAlignment = Object.fromEntries(
  generator.alignmentDistributionForPeople("Humain", null, alignmentCaptain).map(x => [x.name,x])
);
assert.ok(Math.abs(humanWithCaptainAlignment["Chaotique mauvais"].probability - 0.225) < 1e-12);
assert.ok(Math.abs(Object.values(humanWithCaptainAlignment).reduce((sum,x)=>sum+x.probability,0)-1) < 1e-12);
for (const name of Object.keys(humanAlignment)) {
  if (name === "Chaotique mauvais") continue;
  assert.ok(humanWithCaptainAlignment[name].probability < humanAlignment[name].probability);
}

const cosmetics = new Set(audit.cosmetics.map(x => x.target));
for (const expected of ["Âge","Taille","Corpulence","Biographie courte"]) {
  assert.ok(cosmetics.has(expected), `Cosmetic field not surfaced: ${expected}`);
}

let sawNonMageArmorBonus = false;
let sawHighMagicArmorPenalty = false;
let secondaryWeaponCount = 0;
const bootsSeen = {}, beltsSeen = {}, amuletsSeen = {}, capesSeen = {}, glovesSeen = {};
const profileCounts = {melee:0, ranged:0, magic:0};
for (let i = 0; i < 1000; i++) {
  const c = generator.createMercenary({id:i+1});
  profileCounts[c.equipment.profile.type] += 1;
  const meanOf = values => values.reduce((a,b) => a + b, 0) / values.length;
  const expectedMagicScore = 0.6 * ((c.equipment.profile.bestMagic?.score || 0) / 2)
    + 0.4 * meanOf([c.stats.Intelligence, c.stats["Puissance magique"], c.stats["Réserve de mana"]]);
  assert.ok(Math.abs(c.equipment.profile.scores.magic - expectedMagicScore) < 1e-9, "Profil Magie : école divisée par 2 (Issue #12)");
  assert.ok(generator.culturesForPeople(c.people).includes(c.culture), `Invalid culture: ${c.people} / ${c.culture}`);
  assert.ok(generator.originsForCulture(c.culture).includes(c.origin), `Invalid origin: ${c.culture} / ${c.origin}`);
  if (c.ascendance) assert.ok(generator.isAncestryCompatible(c.people, c.ascendance), `Invalid ancestry: ${c.people} / ${c.ascendance}`);
  assert.ok(Object.values(c.stats).every(v => Number.isFinite(v) && v >= 1));
  assert.ok(Object.values(c.resistances).every(v => Number.isFinite(v) && v >= 1));
  assert.ok(Number.isFinite(c.pvMax) && c.pvMax >= 1);
  assert.ok(Number.isFinite(c.reputation) && c.reputation > 0);
  assert.ok(Number.isFinite(c.salary) && c.salary > 0);
  assert.equal(Number.isInteger(c.salary), true);
  const expectedSalary = Math.round(
    10
    * Math.max(1, c.reputation / 30)
    * (1 + (c.salaryPretension - 35) / 100)
    * (1 + 0.25 * Math.pow((c.stats.Intelligence - 100) / 100, 2))
  );
  assert.equal(c.salary, expectedSalary);
  assert.equal(c.mana, c.stats["Réserve de mana"]);
  assert.equal(typeof c.skills.physiology["Vision nocturne"], "boolean");
  assert.equal(typeof c.skills.physiology.Vol, "boolean");
  assert.equal(typeof c.skills.martial["Empoisonnement des armes"], "boolean");
  assert.equal(typeof c.skills.martial["Port d’armure légère"], "boolean");
  assert.equal(typeof c.skills.martial["Port d’armure intermédiaire"], "boolean");
  assert.equal(typeof c.skills.martial["Port d’armure lourde"], "boolean");
  assert.equal(c.skills.physiology.Vol, false);

  assert.ok(c.equipment && c.equipment.profile && c.equipment.slots);
  assert.equal(Object.keys(c.equipment.slots).length, 23);
  assert.ok(["melee","ranged","magic"].includes(c.equipment.profile.type));
  assert.ok(Number.isFinite(c.equipment.profile.scores.melee));
  assert.ok(Number.isFinite(c.equipment.profile.scores.ranged));
  assert.ok(Number.isFinite(c.equipment.profile.scores.magic));
  assert.ok(Array.isArray(c.items));
  assert.ok(c.items.length >= 2 && c.items.length <= 8, "armure, arme, seconde arme, bottes, ceinture, amulette, cape et gants possibles");
  assert.ok(c.equipment.slots.armor);
  assert.ok(c.equipment.slots.weapon_set_1_main);
  const armorItem = c.items.find(item => item.id === c.equipment.slots.armor);
  const primaryItem = c.items.find(item => item.id === c.equipment.slots.weapon_set_1_main);
  assert.equal(armorItem.itemType, "armor");
  assert.equal(primaryItem.itemType, "weapon");
  const expectedArmorClass = c.skills.martial["Port d’armure lourde"] ? "Lourde"
    : c.skills.martial["Port d’armure intermédiaire"] ? "Intermédiaire"
    : c.skills.martial["Port d’armure légère"] ? "Légère" : "Vêtement";
  assert.equal(c.equipment.armorClass, expectedArmorClass);
  assert.equal(armorItem.category, expectedArmorClass);
  for (const item of c.items) {
    assert.equal(item.owner, c.id);
    assert.ok([1,2,3].includes(item.tier));
    assert.ok(["worn","standard","luxury"].includes(item.qualityCode));
    assert.equal(c.equipment.slots[item.slot], item.id);
  }
  if (c.equipment.slots.weapon_set_2_main) {
    secondaryWeaponCount += 1;
    const secondaryItem = c.items.find(item => item.id === c.equipment.slots.weapon_set_2_main);
    assert.equal(secondaryItem.itemType, "weapon");
    assert.notEqual(secondaryItem.combatFamily, primaryItem.combatFamily);
  }
  // Bottes (Idan, 2026-10-24) : 5 % de chance, type au hasard.
  if (c.equipment.slots.boots) {
    const boots = c.items.find(item => item.id === c.equipment.slots.boots);
    assert.equal(boots.itemType, "boots");
    assert.ok(reference.boots.rows.some(row => row.nom === boots.name && "boots:" + row.code === boots.templateId), boots.name);
    bootsSeen[boots.name] = (bootsSeen[boots.name] || 0) + 1;
  }
  // Ceinture (Idan, 2026-10-24) : mêmes règles que les bottes.
  if (c.equipment.slots.belt) {
    const belt = c.items.find(item => item.id === c.equipment.slots.belt);
    assert.equal(belt.itemType, "belt");
    assert.ok(reference.belts.rows.some(row => row.nom === belt.name && "belt:" + row.code === belt.templateId), belt.name);
    beltsSeen[belt.name] = (beltsSeen[belt.name] || 0) + 1;
  }
  // Amulette (Idan, 2026-10-24) : mêmes règles.
  if (c.equipment.slots.amulet) {
    const amulet = c.items.find(item => item.id === c.equipment.slots.amulet);
    assert.equal(amulet.itemType, "amulet");
    assert.ok(reference.amulets.rows.some(row => row.nom === amulet.name && "amulet:" + row.code === amulet.templateId), amulet.name);
    amuletsSeen[amulet.name] = (amuletsSeen[amulet.name] || 0) + 1;
  }
  // Cape (Idan, 2026-10-24) : mêmes règles.
  if (c.equipment.slots.cape) {
    const cape = c.items.find(item => item.id === c.equipment.slots.cape);
    assert.equal(cape.itemType, "cape");
    assert.ok(reference.capes.rows.some(row => row.nom === cape.name && "cape:" + row.code === cape.templateId), cape.name);
    capesSeen[cape.name] = (capesSeen[cape.name] || 0) + 1;
  }
  // Gants (Idan, 2026-10-24) : mêmes règles.
  if (c.equipment.slots.gloves) {
    const pair = c.items.find(item => item.id === c.equipment.slots.gloves);
    assert.equal(pair.itemType, "gloves");
    assert.ok(reference.gloves.rows.some(row => row.nom === pair.name && "gloves:" + row.code === pair.templateId), pair.name);
    glovesSeen[pair.name] = (glovesSeen[pair.name] || 0) + 1;
  }
  for (const emptySlot of ["head","pants","ring_1","ring_2","ring_3","ring_4","ring_5","ring_6","weapon_set_1_off","weapon_set_2_off","belt_item_1","belt_item_2","belt_item_3","belt_item_4","mount"]) {
    assert.equal(c.equipment.slots[emptySlot], null);
  }

  const light = c.generationTrace.skills["Port d’armure légère"];
  const intermediate = c.generationTrace.skills["Port d’armure intermédiaire"];
  const heavy = c.generationTrace.skills["Port d’armure lourde"];
  if (heavy.magicMax <= 50) {
    sawNonMageArmorBonus = true;
    assert.equal(heavy.warriorBonus, 20);
    assert.equal(intermediate.warriorBonus, 30);
    assert.equal(light.warriorBonus, 50);
  }
  if (heavy.magicMax > 75) {
    sawHighMagicArmorPenalty = true;
    assert.equal(heavy.magicMultiplier, 0.8);
    assert.equal(intermediate.magicMultiplier, 0.8);
    assert.equal(light.magicMultiplier, 0.8);
  }
  if (c.skills.martial["Port d’armure lourde"]) {
    assert.equal(c.skills.martial["Port d’armure intermédiaire"], true);
    assert.equal(c.skills.martial["Port d’armure légère"], true);
  }
  if (c.skills.martial["Port d’armure intermédiaire"]) {
    assert.equal(c.skills.martial["Port d’armure légère"], true);
  }

  for (const key of ["oneHand","twoHands","ranged"]) {
    const pref = c.weaponPreferences[key];
    assert.ok(pref, `Missing weapon preference ${key}`);
    assert.ok(Number.isFinite(pref.score));
    assert.equal(pref.score, pref.categoryScore + pref.specificScore);
  }
}
assert.equal(sawNonMageArmorBonus, true);
assert.equal(sawHighMagicArmorPenalty, true);
assert.ok(secondaryWeaponCount > 350 && secondaryWeaponCount < 650, `Unexpected secondary weapon rate: ${secondaryWeaponCount}/1000`);
const bootsTotal = Object.values(bootsSeen).reduce((a,b) => a + b, 0);
assert.ok(bootsTotal >= 25 && bootsTotal <= 80, `bottes à la création ≈ 5 % : ${bootsTotal}/1000`);
assert.equal(Object.keys(bootsSeen).length, 3, "les trois types de bottes");
const beltsTotal = Object.values(beltsSeen).reduce((a,b) => a + b, 0);
assert.ok(beltsTotal >= 25 && beltsTotal <= 80, `ceintures à la création ≈ 5 % : ${beltsTotal}/1000`);
assert.equal(Object.keys(beltsSeen).length, 3, "les trois types de ceintures");
const amuletsTotal = Object.values(amuletsSeen).reduce((a,b) => a + b, 0);
assert.ok(amuletsTotal >= 25 && amuletsTotal <= 80, `amulettes à la création ≈ 5 % : ${amuletsTotal}/1000`);
assert.equal(Object.keys(amuletsSeen).length, 3, "les trois types d'amulettes");
const capesTotal = Object.values(capesSeen).reduce((a,b) => a + b, 0);
assert.ok(capesTotal >= 25 && capesTotal <= 80, `capes à la création ≈ 5 % : ${capesTotal}/1000`);
assert.equal(Object.keys(capesSeen).length, 3, "les trois types de capes");
const glovesTotal = Object.values(glovesSeen).reduce((a,b) => a + b, 0);
assert.ok(glovesTotal >= 25 && glovesTotal <= 80, `gants à la création ≈ 5 % : ${glovesTotal}/1000`);
assert.equal(Object.keys(glovesSeen).length, 3, "les trois types de gants");
// Issue #12 : avant correction, ~89 % des mercenaires sortaient « Magie ». Garde-fou contre un retour accidentel.
assert.ok(profileCounts.magic < 600, `Profil Magie trop fréquent : ${JSON.stringify(profileCounts)}`);
assert.ok(profileCounts.melee > 200 && profileCounts.ranged > 50, `Profils CAC / Distance trop rares : ${JSON.stringify(profileCounts)}`);

const lowGenerator = createGenerator(reference, {
  random: () => 0,
  nameGenerator: (people,id) => `${people} ${id}`
});

const nightElf = lowGenerator.createMercenary({
  id:1501,
  forcedPeople:"Elfe",
  forcedCulture:"Elfes noirs",
  forcedOrigin:"Hors-la-loi",
  forcedAscendance:null,
  forcedAlignment:"Neutre"
});
assert.equal(nightElf.skills.physiology["Vision nocturne"], true);
assert.equal(nightElf.skills.martial["Empoisonnement des armes"], true);
assert.equal(nightElf.generationTrace.skills["Empoisonnement des armes"].probability, 70);
assert.deepEqual(
  nightElf.generationTrace.skills["Empoisonnement des armes"].sources.map(x => [x.kind,x.name,x.pp]),
  [["culture","Elfes noirs",45],["origin","Hors-la-loi",25]]
);

const demonHuman = lowGenerator.createMercenary({
  id:1502,
  forcedPeople:"Humain",
  forcedCulture:"Cités libres",
  forcedOrigin:"Commerçant",
  forcedAscendance:"Sang de démon",
  forcedAscendanceLevel:1,
  forcedAlignment:"Neutre"
});
assert.equal(demonHuman.skills.physiology["Vision nocturne"], true);
assert.equal(demonHuman.generationTrace.skills["Vision nocturne"].sources[0].name, "Sang de démon");


const nonMage = lowGenerator.createMercenary({
  id:1503,
  forcedPeople:"Humain",
  forcedCulture:"Cités libres",
  forcedOrigin:"Commerçant",
  forcedAscendance:null,
  forcedAlignment:"Neutre"
});
assert.ok(nonMage.generationTrace.skills["Port d’armure légère"].magicMax <= 50);
assert.equal(nonMage.generationTrace.skills["Port d’armure légère"].probability, 50);
assert.equal(nonMage.generationTrace.skills["Port d’armure intermédiaire"].probability, 30);
assert.equal(nonMage.generationTrace.skills["Port d’armure lourde"].probability, 20);

assert.throws(() => generator.createMercenary({
  id:2001,
  forcedPeople:"Ogre",
  forcedCulture:"Ogres des montagnes",
  forcedOrigin:generator.originsForCulture("Ogres des montagnes")[0],
  forcedAscendance:"Sang de troll",
  forcedAscendanceLevel:3
}), /not compatible/);

const troll = generator.createMercenary({
  id:2002,
  forcedPeople:"Orc",
  forcedCulture:"Orcs des steppes",
  forcedOrigin:generator.originsForCulture("Orcs des steppes")[0],
  forcedAscendance:"Sang de troll",
  forcedAscendanceLevel:3,
  forcedAlignment:"Chaotique mauvais"
});
assert.ok(troll.skills.physiology["Régénération"] > 0);
assert.equal(troll.generationTrace.skills["Régénération"].raw, 0);
assert.ok(troll.generationTrace.skills["Régénération"].contributions.some(x => x.name === "Sang de troll" && x.dice === "10D6"));

const goblin = generator.createMercenary({
  id:2003,
  forcedPeople:"Gobelin",
  forcedCulture:"Gobelins des cavernes",
  forcedOrigin:"Hors-la-loi",
  forcedAscendance:null,
  forcedAlignment:"Chaotique mauvais"
});
const dague = goblin.generationTrace.skills.Dague;
assert.equal(dague.rawFormula, "2D20");
assert.equal(dague.generationBonus, true);
assert.ok(dague.contributions.some(x => x.name === "Gobelin"));
assert.ok(dague.contributions.some(x => x.name === "Gobelins des cavernes"));
assert.ok(dague.contributions.some(x => x.name === "Hors-la-loi"));

for (const [skill, formula] of [
  ["Pièges", "Moyenne(Intelligence, Perception) × Rand(0,8 ; 1,2) × 0,5"],
  ["Discrétion", "Moyenne(Dextérité, Perception, Esquive) × Rand(0,8 ; 1,2) × 0,5"],
  ["Combat à deux armes", "Max(armes de mêlée 1 main) × Rand(0,8 ; 1,2)"],
  ["Combat à mains nues", "Moyenne(Force, Dextérité) × Rand(0,8 ; 1,2) × 0,5"],
  ["Combat à deux mains", "Max(armes de mêlée 2 mains) × Rand(0,8 ; 1,2)"]
]) {
  assert.equal(goblin.generationTrace.skills[skill].rawFormula, formula);
  assert.ok(Number.isFinite(goblin.skills.martial[skill]));
}
// Mains nues, Pièges, Discrétion : tirés des caractéristiques puis ramenés à l'échelle des armes (× 0,5, Idan 2026-10-21).
for (const [skill, stats] of [
  ["Pièges", ["Intelligence", "Perception"]],
  ["Discrétion", ["Dextérité", "Perception", "Esquive"]],
  ["Combat à mains nues", ["Force", "Dextérité"]]
]) {
  const mean = stats.reduce((sum, name) => sum + goblin.stats[name], 0) / stats.length;
  const raw = goblin.generationTrace.skills[skill].raw;
  assert.ok(raw >= mean * 0.8 * 0.5 - 1e-9 && raw <= mean * 1.2 * 0.5 + 1e-9, `${skill} : ${raw} hors de [${mean * 0.4} ; ${mean * 0.6}]`);
}
assert.equal(goblin.generationTrace.skills["Armes naturelles"].rawFormula, "0");
assert.ok(Number.isFinite(goblin.skills.martial["Armes naturelles"]));
assert.ok(Number.isFinite(goblin.skills.camp["Médecine"]));
assert.ok(Number.isFinite(goblin.skills.camp["Artisanat"]));
assert.equal(
  goblin.generationTrace.skills["Médecine"].rawFormula,
  "(1 + (Charisme + Intelligence) / 100) × 6D6"
);
assert.equal(
  goblin.generationTrace.skills["Artisanat"].rawFormula,
  "(1 + (Charisme + Intelligence) / 100) × 6D6"
);
for (const pref of Object.values(goblin.weaponPreferences)) {
  assert.ok(pref.weapon);
  assert.ok(pref.category);
  assert.equal(pref.score, pref.categoryScore + pref.specificScore);
}

const captain = generator.createCaptain({
  id:2004,
  forcedPeople:"Humain",
  forcedCulture:"Cités libres",
  forcedOrigin:"Noble",
  forcedAlignment:"Neutre",
  forcedAscendance:"Sang d’elfe"
});
assert.equal(captain.ascendanceLevel, 3);
assert.equal(captain.ascendanceLevelName, "Bâtard");
assert.equal(captain.alignment, "Neutre"); // forced captain choice must bypass people distribution

// Stock d'armes de départ (Idan, 2026-10-23) : 2D20 armes, poids 1 + 2 × A (peuple et culture, arme et catégorie),
// au moins 0,25 ; tier selon la réputation du capitaine ; sans propriétaire.
const chaosDwarf = {people:"Nain", culture:"Nains du chaos", reputation:130, id:7};
const weaponByName = name => reference.weapons.rows.find(w => w.nom === name);
assert.equal(generator.startingStockWeight(weaponByName("Arquebuse"), chaosDwarf), 13, "A = 2 + 2 + 1 + 1");
assert.equal(generator.startingStockWeight(weaponByName("Hache de guerre"), chaosDwarf), 7, "A = 2 + 1");
assert.equal(generator.startingStockWeight(weaponByName("Fouet"), chaosDwarf), 1, "aucune affinité");
assert.equal(generator.startingStockWeight(weaponByName("Arc"), {people:"Nain", culture:"Nains des montagnes"}), 1, "Arc −1, Armes de tir +1");
assert.equal(generator.startingStockWeight(weaponByName("Arc"), {people:"Orc", culture:"Nains des montagnes"}), 0.25, "plancher");
const stockGenerator = createGenerator(reference, {random: mulberry32(23), nameGenerator: (people,id) => `${people} ${id}`});
const counts = [], firearms = [], tiers = {1:0, 2:0, 3:0};
let shields = 0;
for (let i = 0; i < 400; i++) {
  const stock = stockGenerator.createStartingStock(chaosDwarf);
  counts.push(stock.length);
  for (const item of stock) {
    assert.equal(item.owner, null);
    assert.equal(item.itemType, "weapon");
    assert.ok(weaponByName(item.name), item.name);
    assert.ok(item.category);
    tiers[item.tier] += 1;
    if (item.category === "Armes à feu") firearms.push(item);
    if (item.category === "Boucliers") shields += 1;
  }
}
const total = counts.reduce((a,b) => a + b, 0);
assert.ok(Math.min(...counts) >= 2 && Math.max(...counts) <= 40, "2D20");
assert.ok(Math.abs(total / counts.length - 21) < 1.5, "moyenne de 2D20 ≈ 21");
assert.ok(firearms.length / total > 0.25, "un Nain du chaos a beaucoup d'armes à feu");
assert.ok(shields > 0, "boucliers compris");
assert.ok(tiers[1] > tiers[2] && tiers[2] > tiers[3] && tiers[3] > 0, "T1 > T2 > T3, T3 possible");

// Armures du stock de départ (Idan, 2026-10-24) : 1D6 par type d'armure, tirées dans le type, T3 rare.
const armorTypes = ["Vêtement","Légère","Intermédiaire","Lourde"];
const armorTiers = {1:0, 2:0, 3:0};
const perType = Object.fromEntries(armorTypes.map(type => [type, []]));
for (let i = 0; i < 400; i++) {
  const armors = stockGenerator.createStartingArmorStock(chaosDwarf);
  for (const type of armorTypes) perType[type].push(armors.filter(item => item.category === type).length);
  for (const item of armors) {
    const template = reference.baseArmors.rows.find(row => "armor:" + row.code === item.templateId);
    assert.ok(template && template.nom === item.name && template.type_armure === item.category, item.name);
    assert.equal(item.owner, null);
    assert.equal(item.itemType, "armor");
    armorTiers[item.tier] += 1;
  }
}
for (const type of armorTypes) {
  assert.ok(Math.min(...perType[type]) >= 1 && Math.max(...perType[type]) <= 6, "1D6 " + type);
  assert.ok(Math.abs(perType[type].reduce((a,b) => a + b, 0) / 400 - 3.5) < 0.3, "moyenne de 1D6 ≈ 3,5 " + type);
}
const armorTotal = armorTiers[1] + armorTiers[2] + armorTiers[3];
assert.ok(armorTiers[3] > 0 && armorTiers[3] / armorTotal < 0.06, "T3 rare");

// Bottes du stock de départ (Idan, 2026-10-24) : 1D6 paires, type au hasard, sans propriétaire.
const bootsCounts = [], bootsTypes = new Set();
for (let i = 0; i < 400; i++) {
  const boots = stockGenerator.createStartingBootsStock(chaosDwarf);
  bootsCounts.push(boots.length);
  for (const item of boots) {
    assert.equal(item.itemType, "boots");
    assert.equal(item.owner, null);
    assert.equal(item.category, "Bottes");
    assert.ok([1,2,3].includes(item.tier));
    bootsTypes.add(item.name);
  }
}
assert.ok(Math.min(...bootsCounts) >= 1 && Math.max(...bootsCounts) <= 6, "1D6 paires");
assert.ok(Math.abs(bootsCounts.reduce((a,b) => a + b, 0) / 400 - 3.5) < 0.3, "moyenne de 1D6 ≈ 3,5");
assert.equal(bootsTypes.size, 3);
const beltCounts = [], beltTypes = new Set();
for (let i = 0; i < 400; i++) {
  const belts = stockGenerator.createStartingBeltStock(chaosDwarf);
  beltCounts.push(belts.length);
  for (const item of belts) {
    assert.deepEqual([item.itemType, item.owner, item.category], ["belt", null, "Ceinture"]);
    beltTypes.add(item.name);
  }
}
assert.ok(Math.min(...beltCounts) >= 1 && Math.max(...beltCounts) <= 6, "1D6 ceintures");
assert.equal(beltTypes.size, 3);
const amuletCounts = [], amuletTypes = new Set();
for (let i = 0; i < 400; i++) {
  const amulets = stockGenerator.createStartingAmuletStock(chaosDwarf);
  amuletCounts.push(amulets.length);
  for (const item of amulets) {
    assert.deepEqual([item.itemType, item.owner, item.category], ["amulet", null, "Amulette"]);
    amuletTypes.add(item.name);
  }
}
assert.ok(Math.min(...amuletCounts) >= 1 && Math.max(...amuletCounts) <= 6, "1D6 amulettes");
assert.equal(amuletTypes.size, 3);
const capeCounts = [], capeTypes = new Set();
for (let i = 0; i < 400; i++) {
  const capes = stockGenerator.createStartingCapeStock(chaosDwarf);
  capeCounts.push(capes.length);
  for (const item of capes) {
    assert.deepEqual([item.itemType, item.owner, item.category], ["cape", null, "Cape"]);
    capeTypes.add(item.name);
  }
}
assert.ok(Math.min(...capeCounts) >= 1 && Math.max(...capeCounts) <= 6, "1D6 capes");
assert.equal(capeTypes.size, 3);
const gloveCounts = [], gloveTypes = new Set();
for (let i = 0; i < 400; i++) {
  const pairs = stockGenerator.createStartingGlovesStock(chaosDwarf);
  gloveCounts.push(pairs.length);
  for (const item of pairs) {
    assert.deepEqual([item.itemType, item.owner, item.category], ["gloves", null, "Gants"]);
    gloveTypes.add(item.name);
  }
}
assert.ok(Math.min(...gloveCounts) >= 1 && Math.max(...gloveCounts) <= 6, "1D6 paires de gants");
assert.equal(gloveTypes.size, 3);

console.log(JSON.stringify({
  ok:true,
  generated:1000,
  audit:{
    counts:audit.counts,
    matrixActive:audit.matrixCoverage.filter(x => x.status === "active").length,
    matrixBlocked:audit.matrixCoverage.filter(x => x.status === "blocked").length,
    pending:audit.pending
  }
}, null, 2));
