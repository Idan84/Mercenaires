"use strict";

// Valeur cachée des objets en pièces d'or (Idan, 2026-10-24) : prix de base × tier × qualité, pour les futurs marchands.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createItemValues} = require("../game-core/item-value.js");
const {createGenerator} = require("../game-core/mercenary-generator.js");

const ROOT = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"));
const files = {
  peoples:"peoples.json", cultures:"cultures.json", socialOrigins:"social-origins.json", alignments:"alignments.json",
  ancestries:"ancestries.json", ancestryCompatibility:"ancestry-compatibility.json",
  cultureOriginCompatibility:"culture-origin-compatibility.json", ancestryLevels:"ancestry-levels.json",
  d6Scale:"d6-generation-scale.json", generationMatrix:"generation-matrix.json", skills:"skills.json",
  characteristics:"characteristics.json", formulaConstants:"formula-constants.json", weapons:"weapons.json",
  baseArmors:"base-armors.json", itemQualities:"item-qualities.json", equipmentSlots:"equipment-slots.json",
  startingEquipmentGeneration:"starting-equipment-generation.json", binaryAptitudeGrants:"binary-aptitude-grants.json",
  alignmentGeneration:"alignment-generation.json", boots:"boots.json", belts:"belts.json", amulets:"amulets.json",
  capes:"capes.json", gloves:"gloves.json", pants:"pants.json", rings:"rings.json", enemyArchetypes:"enemy-archetypes.json"
};
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const values = createItemValues({reference});
const item = (itemType, name, tier, qualityCode, extra = {}) => ({itemType, name, tier, qualityCode, ...extra});

// Chaque arme, armure et objet à bonus a un prix de base entier et positif.
for (const key of ["weapons","baseArmors","boots","belts","amulets","capes","gloves","pants","rings"]) {
  for (const row of reference[key].rows) assert.ok(Number.isInteger(row.prix_base) && row.prix_base > 0, `${row.nom} : prix_base`);
}

// Multiplicateurs validés : T1 ×1, T2 ×3, T3 ×8, T4 ×25 ; Usée ×0,6, Correcte ×1, De bonne facture ×1,5, De luxe ×2,5 (Idan, 2026-11-01).
assert.deepEqual([1,2,3,4].map(values.tierMultiplier), [1,3,8,25]);
assert.deepEqual(["worn","standard","luxury","deluxe"].map(code => values.qualityMultiplier({qualityCode:code})), [0.6,1,1.5,2.5]);
assert.equal(values.qualityMultiplier({}), 1, "sans qualité : Correcte");

// Les exemples donnés à Idan.
assert.equal(values.basePrice(item("weapon","Épée longue",1,"standard")), 120);
assert.equal(values.value(item("weapon","Épée longue",1,"worn")), 72);
assert.equal(values.value(item("weapon","Épée longue",2,"standard")), 360);
assert.equal(values.value(item("weapon","Épée longue",3,"luxury")), 1440);
assert.equal(values.value(item("weapon","Épée longue",4,"luxury")), 4500);
assert.equal(values.value(item("weapon","Épée longue",4,"deluxe")), 7500,"T4 De luxe");
assert.equal(values.basePrice(item("weapon","Arquebuse",1)), 240, "arme à feu × 1,5");
assert.equal(values.value(item("armor","Armure de plates",3,"luxury",{templateId:"armor:plate_armor"})), 7200);
assert.equal(values.value(item("armor","",1,"standard",{templateId:"armor:gambeson"})), 60, "armure retrouvée par son code");
assert.equal(values.value(item("ring","Bague de Feu",2,"worn")), 270);
assert.equal(values.value(item("boots","Bottes de vitesse",1,null)), 100);

// Objet sans modèle connu (casques à venir…) : pas de valeur.
assert.equal(values.value(item("helmet","Casque",1,"standard")), null);
assert.equal(values.value(item("weapon","Épée en bois",1,"standard")), null);
assert.equal(values.value(null), null);

// Tout ce que le jeu fabrique a une valeur : stock de départ, butin, équipement des ennemis.
let n = 0;
const random = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
const generator = createGenerator(reference, {random, nameGenerator:(people, id) => people + " " + id});
const captain = generator.createCaptain({id:1, forcedPeople:"Humain", forcedCulture:"Cités libres"});
const stock = [generator.createStartingStock(captain), generator.createStartingArmorStock(captain), generator.createStartingBootsStock(captain),
  generator.createStartingBeltStock(captain), generator.createStartingAmuletStock(captain), generator.createStartingCapeStock(captain),
  generator.createStartingGlovesStock(captain), generator.createStartingPantsStock(captain), generator.createStartingRingStock(captain)].flat();
assert.ok(stock.length > 10);
for (const it of [...stock, ...Array.from({length:30}, () => generator.createLootItem(captain))]) {
  assert.ok(Number.isInteger(values.value(it)) && values.value(it) > 0, `${it.itemType} ${it.name}`);
}
for (const arch of reference.enemyArchetypes.rows) {
  for (const name of arch.armes) assert.ok(values.basePrice(item("weapon", name, arch.tier)), `${arch.code} : ${name}`);
  if (arch.armure) assert.ok(values.basePrice(item("armor", arch.armure, arch.tier)), `${arch.code} : ${arch.armure}`);
}

console.log("Valeur des objets : prix de base, tier, qualité, stock de départ, butin, ennemis — OK");
