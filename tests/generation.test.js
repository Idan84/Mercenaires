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
  weapons:"weapons.json"
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
assert.equal(audit.probabilities.peopleProbability, 1);
assert.equal(audit.probabilities.ancestryLevelProbability, 1);
assert.equal(audit.matrixCoverage.filter(x => x.status === "missing-target").length, 0);

assert.equal(audit.pending.length, 0, `Gameplay generation still has pending rules: ${JSON.stringify(audit.pending)}`);
assert.equal(audit.matrixCoverage.filter(x => x.status === "active").length, 106);
assert.equal(audit.matrixCoverage.filter(x => x.status === "blocked").length, 0);

const cosmetics = new Set(audit.cosmetics.map(x => x.target));
for (const expected of ["Âge","Taille","Corpulence","Biographie courte"]) {
  assert.ok(cosmetics.has(expected), `Cosmetic field not surfaced: ${expected}`);
}

for (let i = 0; i < 1000; i++) {
  const c = generator.createMercenary({id:i+1});
  assert.ok(generator.culturesForPeople(c.people).includes(c.culture), `Invalid culture: ${c.people} / ${c.culture}`);
  assert.ok(generator.originsForCulture(c.culture).includes(c.origin), `Invalid origin: ${c.culture} / ${c.origin}`);
  if (c.ascendance) assert.ok(generator.isAncestryCompatible(c.people, c.ascendance), `Invalid ancestry: ${c.people} / ${c.ascendance}`);
  assert.ok(Object.values(c.stats).every(v => Number.isFinite(v) && v >= 1));
  assert.ok(Object.values(c.resistances).every(v => Number.isFinite(v) && v >= 1));
  assert.ok(Number.isFinite(c.pvMax) && c.pvMax >= 1);
  assert.ok(Number.isFinite(c.reputation) && c.reputation > 0);
  assert.ok(Number.isFinite(c.salary) && c.salary > 0);
  assert.equal(c.mana, c.stats["Réserve de mana"]);
  for (const key of ["oneHand","twoHands","ranged"]) {
    const pref = c.weaponPreferences[key];
    assert.ok(pref, `Missing weapon preference ${key}`);
    assert.ok(Number.isFinite(pref.score));
    assert.equal(pref.score, pref.categoryScore + pref.specificScore);
  }
}

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
  ["Pièges", "Moyenne(Intelligence, Perception) × Rand(0,8 ; 1,2)"],
  ["Discrétion", "Moyenne(Dextérité, Perception, Esquive) × Rand(0,8 ; 1,2)"],
  ["Combat à deux armes", "Max(armes de mêlée 1 main) × Rand(0,8 ; 1,2)"],
  ["Combat à mains nues", "Moyenne(Force, Dextérité) × Rand(0,8 ; 1,2)"],
  ["Combat à deux mains", "Max(armes de mêlée 2 mains) × Rand(0,8 ; 1,2)"]
]) {
  assert.equal(goblin.generationTrace.skills[skill].rawFormula, formula);
  assert.ok(Number.isFinite(goblin.skills.martial[skill]));
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
