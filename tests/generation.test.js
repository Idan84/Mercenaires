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
  weapons:"weapons.json", baseArmors:"base-armors.json", boots:"boots.json", belts:"belts.json", amulets:"amulets.json", capes:"capes.json", gloves:"gloves.json", pants:"pants.json", rings:"rings.json",
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
assert.equal(audit.counts.skills, 96, "dont Combat à une main (Idan, 2026-11-02) et Magie en armure (2026-11-09)");
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
// Armes naturelles et Combat à mains nues ne sont plus tirés pour les mercenaires (Idan, 2026-11-02) : leurs lignes de
// la Matrice sont en sommeil.
assert.equal(audit.matrixCoverage.filter(x => x.status === "active").length, 104);
assert.deepEqual(audit.matrixCoverage.filter(x => x.status === "disabled").map(x => x.target).sort(), ["Armes naturelles", "Combat à mains nues"]);
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
const bootsSeen = {}, beltsSeen = {}, amuletsSeen = {}, capesSeen = {}, glovesSeen = {}, pantsSeen = {}, ringsSeen = {};
const offHandsSeen = {};
const skillByName = new Map(reference.skills.rows.map(row => [row.nom, row]));
const profileCounts = {melee:0, ranged:0, magic:0};
for (let i = 0; i < 1000; i++) {
  const c = generator.createMercenary({id:i+1});
  profileCounts[c.equipment.profile.type] += 1;
  const meanOf = values => values.reduce((a,b) => a + b, 0) / values.length;
  // L'école est à l'échelle d'une arme depuis le 2026-11-05 : plus de division par 2 (arme + catégorie, elles, le sont).
  const expectedMagicScore = 0.6 * (c.equipment.profile.bestMagic?.score || 0)
    + 0.4 * meanOf([c.stats.Intelligence, c.stats["Puissance magique"], c.stats["Réserve de mana"]]);
  assert.ok(Math.abs(c.equipment.profile.scores.magic - expectedMagicScore) < 1e-9, "Profil Magie : 0,6 × école + 0,4 × moyenne (Issue #12, écoles à l'échelle des armes)");
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
  assert.ok(c.items.length >= 2 && c.items.length <= 10, "armure, arme, seconde arme, bottes, ceinture, amulette, cape, gants, culotte et bague possibles");
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
    assert.ok(c.skills.martial[secondaryItem.name] > 1, `set 2 : ${secondaryItem.name} pratiquée (Idan, 2026-11-06)`);
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
  // Culottes (Idan, 2026-10-24) : mêmes règles.
  if (c.equipment.slots.pants) {
    const pants = c.items.find(item => item.id === c.equipment.slots.pants);
    assert.equal(pants.itemType, "pants");
    assert.ok(reference.pants.rows.some(row => row.nom === pants.name && "pants:" + row.code === pants.templateId), pants.name);
    pantsSeen[pants.name] = (pantsSeen[pants.name] || 0) + 1;
  }
  // Bague (Idan, 2026-10-24) : mêmes règles, dans le premier emplacement de bague.
  if (c.equipment.slots.ring_1) {
    const ring = c.items.find(item => item.id === c.equipment.slots.ring_1);
    assert.equal(ring.itemType, "ring");
    assert.ok(reference.rings.rows.some(row => row.nom === ring.name && "ring:" + row.code === ring.templateId), ring.name);
    ringsSeen[ring.name] = (ringsSeen[ring.name] || 0) + 1;
  }
  // Compétences non pratiquées (Idan, 2026-11-06) : armes précises, catégories, styles et écoles à 20 ou moins → 1 ; aucun
// sort dans une école à 20 ou moins.
  {
    const unpracticed = new Set([...reference.weapons.rows.map(w => w.nom), ...reference.weapons.rows.map(w => skillByName.get(w.nom)?.parent).filter(Boolean),
      "Combat à une main","Combat à deux mains","Combat à deux armes","Boucliers"]);
    for (const name of unpracticed) {
      const v = c.skills.martial[name];
      if (Number.isFinite(v)) assert.ok(v === 1 || v > 20, `${name} : ${v} (20 ou moins, 0 compris → 1)`);
    }
    for (const [school, v] of Object.entries(c.skills.magic)) assert.ok(v === 1 || v > 20, `${school} : ${v} (20 ou moins, 0 compris → 1)`);
    for (const spell of c.spells || []) assert.ok(c.skills.magic[spell.school] > 20, `${spell.name} : école ${spell.school} à ${c.skills.magic[spell.school]}`);
  }
// Seconde main (Idan, 2026-11-04) : une arme principale de corps à corps à une main ; Boucliers ≥ 50 : le bouclier le
  // mieux maîtrisé ; Combat à deux armes ≥ 50 : la meilleure arme de corps à corps à une main ; les deux : la meilleure
  // compétence décide.
  {
    const rows = reference.weapons.rows, w = name => rows.find(x => x.nom === name);
    const main = c.items.find(item => item.id === c.equipment.slots.weapon_set_1_main);
    const off = c.items.find(item => item.id === c.equipment.slots.weapon_set_1_off);
    const isShield = x => /Boucliers/.test(x.domaine), isRanged = x => /Armes de tir|Armes à feu/.test(x.domaine);
    const oneHand = x => ["1 main","Au choix"].includes(x.prise);
    const mk = c.skills.martial, shield = mk.Boucliers, dual = mk["Combat à deux armes"];
    const eligible = main && !isRanged(w(main.name)) && oneHand(w(main.name));
    const expected = !eligible ? null : shield >= 50 && (dual < 50 || shield >= dual) ? "shield" : dual >= 50 ? "dual" : null;
    const score = x => (mk[x.nom] ?? -Infinity) + (mk[skillByName.get(x.nom)?.parent] ?? -Infinity);
    const best = filter => rows.filter(filter).sort((a,b) => score(b) - score(a) || a.nom.localeCompare(b.nom, "fr"))[0].nom;
    if (!expected) assert.equal(c.equipment.slots.weapon_set_1_off, null);
    else {
      assert.equal(off.slot, "weapon_set_1_off");
      // Seconde arme : une arme légère (malus de vitesse ≤ 8 ; Idan, 2026-11-05).
      const practicedLight = x => !isShield(x) && !isRanged(x) && oneHand(x) && x.malus_vitesse_arme_base <= 8 && mk[x.nom] > 1;
      assert.equal(off.name, expected === "shield" ? best(isShield) : rows.some(practicedLight) ? best(practicedLight) : "Dague");
      offHandsSeen[expected] = (offHandsSeen[expected] || 0) + 1;
    }
  }
  for (const emptySlot of ["head","ring_2","ring_3","ring_4","ring_5","ring_6","weapon_set_2_off","belt_item_1","belt_item_2","belt_item_3","belt_item_4","mount"]) {
    assert.equal(c.equipment.slots[emptySlot], null);
  }

  const light = c.generationTrace.skills["Port d’armure légère"];
  const intermediate = c.generationTrace.skills["Port d’armure intermédiaire"];
  const heavy = c.generationTrace.skills["Port d’armure lourde"];
  // Seuils de magie des ports d'armure : 25 et 37,5 depuis les écoles divisées par deux (2026-11-05 ; 50 et 75 avant).
  if (heavy.magicMax <= 25) {
    sawNonMageArmorBonus = true;
    assert.equal(heavy.warriorBonus, 20);
    assert.equal(intermediate.warriorBonus, 30);
    assert.equal(light.warriorBonus, 50);
  }
  if (heavy.magicMax > 37.5) {
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
const pantsTotal = Object.values(pantsSeen).reduce((a,b) => a + b, 0);
assert.ok(pantsTotal >= 25 && pantsTotal <= 80, `culottes à la création ≈ 5 % : ${pantsTotal}/1000`);
assert.equal(Object.keys(pantsSeen).length, 3, "les trois types de culottes");
const ringsTotal = Object.values(ringsSeen).reduce((a,b) => a + b, 0);
assert.ok(ringsTotal >= 25 && ringsTotal <= 80, `bagues à la création ≈ 5 % : ${ringsTotal}/1000`);
assert.ok(Object.keys(ringsSeen).length >= 8, "la plupart des onze types de bagues");
// Seconde main (Idan, 2026-11-04) : environ 6 % de boucliers et 12 % de secondes armes.
assert.ok(offHandsSeen.shield >= 25 && offHandsSeen.shield <= 110, `boucliers à la création ≈ 6 % : ${offHandsSeen.shield}/1000`);
assert.ok(offHandsSeen.dual >= 60 && offHandsSeen.dual <= 190, `secondes armes à la création ≈ 12 % : ${offHandsSeen.dual}/1000`);
assert.deepEqual(["generation.skills.unpracticed_max","generation.skills.unpracticed_value"].map(code => reference.formulaConstants.rows.find(r => r.code === code)?.valeur), [20,1]);
assert.deepEqual(["generation.off_hand.shield_min","generation.off_hand.dual_min","generation.off_hand.light_max_speed_malus"].map(code => reference.formulaConstants.rows.find(r => r.code === code)?.valeur), [50,50,8]);
assert.deepEqual(reference.weapons.rows.filter(x => !/Armes de tir|Armes à feu|Boucliers/.test(x.domaine) && ["1 main","Au choix"].includes(x.prise) && x.malus_vitesse_arme_base <= 8).map(x => x.nom).sort(),
  ["Bâton court","Dague","Estoc","Fouet","Hachette","Kukri","Nunchaku","Sai","Épée courte"].sort(), "les neuf armes légères");
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
assert.ok(nonMage.generationTrace.skills["Port d’armure légère"].magicMax <= 25);
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

// Ogres (Idan, 2026-10-29) : −1D6 de Discrétion, hors échelle de la Matrice (peoples.json, ajustements_d6).
for (let i = 0; i < 20; i++) {
  const ogre = generator.createMercenary({id:2100 + i, forcedPeople:"Ogre"});
  const trace = ogre.generationTrace.skills["Discrétion"];
  const malus = trace.contributions.filter(x => x.name === "Ogre");
  assert.equal(malus.length, 1, "un seul malus de peuple");
  assert.equal(malus[0].dice, "1D6");
  assert.ok(malus[0].delta <= -1 && malus[0].delta >= -6, String(malus[0].delta));
  assert.equal(trace.final, ogre.skills.martial["Discrétion"]);
  assert.ok(ogre.skills.martial["Discrétion"] >= 0);
}
const human = generator.createMercenary({id:2150, forcedPeople:"Humain"});
assert.ok(!human.generationTrace.skills["Discrétion"].contributions.some(x => x.kind === "people"), "les autres peuples : rien");

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
  ["Combat à une main", "Max(armes de mêlée 1 main) × Rand(0,8 ; 1,2)"],
  ["Combat à deux mains", "Max(armes de mêlée 2 mains) × Rand(0,8 ; 1,2)"]
]) {
  assert.equal(goblin.generationTrace.skills[skill].rawFormula, formula);
  assert.ok(Number.isFinite(goblin.skills.martial[skill]));
}
// Pièges, Discrétion : tirés des caractéristiques puis ramenés à l'échelle des armes (× 0,5, Idan 2026-10-21).
for (const [skill, stats] of [
  ["Pièges", ["Intelligence", "Perception"]],
  ["Discrétion", ["Dextérité", "Perception", "Esquive"]]
]) {
  const mean = stats.reduce((sum, name) => sum + goblin.stats[name], 0) / stats.length;
  const raw = goblin.generationTrace.skills[skill].raw;
  assert.ok(raw >= mean * 0.8 * 0.5 - 1e-9 && raw <= mean * 1.2 * 0.5 + 1e-9, `${skill} : ${raw} hors de [${mean * 0.4} ; ${mean * 0.6}]`);
}
// Ni Armes naturelles (aux créatures) ni Combat à mains nues (désactivé) chez un mercenaire (Idan, 2026-11-02).
for (const skill of ["Armes naturelles", "Combat à mains nues"]) {
  assert.ok(!(skill in goblin.skills.martial), skill);
  assert.ok(!goblin.generationTrace.skills[skill], skill);
}
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
assert.equal(generator.startingStockWeight(weaponByName("Arc"), {people:"Ogre", culture:"Nains des montagnes"}), 0.25, "plancher (les orcs ont +1 à l’Arc depuis le 2026-11-01)");
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
const pantsCounts = [], pantsTypes = new Set();
for (let i = 0; i < 400; i++) {
  const stock = stockGenerator.createStartingPantsStock(chaosDwarf);
  pantsCounts.push(stock.length);
  for (const item of stock) {
    assert.deepEqual([item.itemType, item.owner, item.category], ["pants", null, "Culotte"]);
    pantsTypes.add(item.name);
  }
}
assert.ok(Math.min(...pantsCounts) >= 1 && Math.max(...pantsCounts) <= 6, "1D6 culottes");
assert.equal(pantsTypes.size, 3);
const ringCounts = [], ringTypes = new Set();
for (let i = 0; i < 400; i++) {
  const stock = stockGenerator.createStartingRingStock(chaosDwarf);
  ringCounts.push(stock.length);
  for (const item of stock) {
    assert.deepEqual([item.itemType, item.owner, item.category], ["ring", null, "Bague"]);
    ringTypes.add(item.name);
  }
}
assert.ok(Math.min(...ringCounts) >= 1 && Math.max(...ringCounts) <= 6, "1D6 bagues");
assert.equal(ringTypes.size, 11);

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
