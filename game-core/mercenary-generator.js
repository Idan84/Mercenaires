"use strict";

(function(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MercenairesCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  const CORE_STAT_FAMILY = "Caractéristique";
  const RESISTANCE_FAMILY = "Résistance";

  function normalizeKey(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/’/g, "'")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function sum(values) {
    return values.reduce((a, b) => a + b, 0);
  }

  function maxNumeric(values, fallback = 0) {
    const nums = values.filter(Number.isFinite);
    return nums.length ? Math.max(...nums) : fallback;
  }

  function createGenerator(reference, options = {}) {
    const random = options.random || Math.random;
    const nameGenerator = options.nameGenerator || ((people, id) => `${people || "Mercenaire"} ${id || ""}`.trim());

    const rows = {};
    for (const [name, payload] of Object.entries(reference)) rows[name] = payload?.rows || [];

    const peopleRows = rows.peoples || [];
    const cultureRows = rows.cultures || [];
    const originRows = rows.socialOrigins || [];
    const alignmentRows = rows.alignments || [];
    const ancestryRows = rows.ancestries || [];
    const ancestryCompatRows = rows.ancestryCompatibility || [];
    const cultureOriginRows = rows.cultureOriginCompatibility || [];
    const ancestryLevelRows = rows.ancestryLevels || [];
    const d6Rows = rows.d6Scale || [];
    const matrixRows = rows.generationMatrix || [];
    const skillRows = rows.skills || [];
    const characteristicRows = rows.characteristics || [];
    const formulaConstantRows = rows.formulaConstants || [];
    const weaponRows = rows.weapons || [];

    const peopleByName = new Map(peopleRows.map(r => [r.nom, r]));
    const skillByName = new Map(skillRows.map(r => [r.nom, r]));
    const charByName = new Map(characteristicRows.map(r => [r.nom, r]));
    const matrixByTarget = new Map(matrixRows.map(r => [r.cible, r]));
    const constants = new Map(formulaConstantRows.map(r => [r.code, Number(r.valeur)]));

    const childrenByParent = new Map();
    for (const skill of skillRows) {
      if (!skill.parent) continue;
      if (!childrenByParent.has(skill.parent)) childrenByParent.set(skill.parent, []);
      childrenByParent.get(skill.parent).push(skill);
    }

    const ancestryLevels = [...ancestryLevelRows]
      .sort((a, b) => Number(a.multiplicateur_d_effet) - Number(b.multiplicateur_d_effet))
      .map((row, i) => ({...row, level: i + 1}));

    const standardD6 = new Map(d6Rows.map(r => [Number(r.intensite), Number(r.standard_nombre_de_d6)]));
    const ancestryD6 = new Map(
      d6Rows.map(r => [Number(r.intensite), {
        1: Number(r.ascendance_niveau_1_d6),
        2: Number(r.ascendance_niveau_2_d6),
        3: Number(r.ascendance_niveau_3_d6)
      }])
    );

    const fundamentalStats = characteristicRows
      .filter(r => r.genere_a_la_creation === true && r.famille === CORE_STAT_FAMILY && r.type_de_valeur === "Numérique")
      .sort((a,b) => (a.ordre ?? 999) - (b.ordre ?? 999));

    const resistances = characteristicRows
      .filter(r => r.genere_a_la_creation === true && r.famille === RESISTANCE_FAMILY && r.type_de_valeur === "Numérique")
      .sort((a,b) => (a.ordre ?? 999) - (b.ordre ?? 999));

    const cosmeticFields = characteristicRows
      .filter(r => r.genere_a_la_creation === true && r.famille === "Cosmétique")
      .map(r => r.nom);

    function roll(sides) {
      return Math.floor(random() * sides) + 1;
    }

    function rollDice(count, sides) {
      let total = 0;
      for (let i = 0; i < count; i++) total += roll(sides);
      return total;
    }

    function randomBetween(min, max) {
      return min + (max - min) * random();
    }

    function weightedChoice(entries) {
      const valid = entries.filter(e => Number(e.weight) > 0);
      if (!valid.length) throw new Error("Weighted choice without positive weights");
      const total = sum(valid.map(e => Number(e.weight)));
      let cursor = random() * total;
      for (const entry of valid) {
        cursor -= Number(entry.weight);
        if (cursor <= 0) return entry.value;
      }
      return valid[valid.length - 1].value;
    }

    function randomChoice(values) {
      if (!values.length) throw new Error("Random choice from empty list");
      return values[Math.floor(random() * values.length)];
    }

    function constant(code, fallback) {
      const value = constants.get(code);
      return Number.isFinite(value) ? value : fallback;
    }

    function culturesForPeople(people) {
      return cultureRows
        .filter(r => String(r.peuples || "").split(",").map(x => x.trim()).includes(people))
        .map(r => r.nom);
    }

    function originsForCulture(culture) {
      return cultureOriginRows
        .filter(r => r.culture === culture && r.possible === true && r.origine_sociale)
        .map(r => r.origine_sociale);
    }

    function compatibleAncestries(people) {
      return ancestryCompatRows
        .filter(r => r.peuple === people && r.possible === true && r.ascendance)
        .map(r => ({name: r.ascendance, weight: Number(r.poids_relatif) || 1}));
    }

    function isAncestryCompatible(people, ancestry) {
      return compatibleAncestries(people).some(x => x.name === ancestry);
    }

    function isCultureCompatible(people, culture) {
      return culturesForPeople(people).includes(culture);
    }

    function isOriginCompatible(culture, origin) {
      return originsForCulture(culture).includes(origin);
    }

    function rollAncestryLevel() {
      const selected = weightedChoice(ancestryLevels.map(r => ({value: r, weight: Number(r.probabilite_de_base) || 0})));
      return {level: selected.level, name: selected.nom, multiplier: selected.multiplicateur_d_effet};
    }

    function modifierDiceCount(intensity, kind, ancestryLevel = 1) {
      const n = Math.abs(Number(intensity) || 0);
      if (!n) return 0;
      if (kind === "ascendance") return ancestryD6.get(n)?.[ancestryLevel] || 0;
      return standardD6.get(n) || 0;
    }

    function identitySources(identity) {
      const result = [
        {name: identity.people, kind: "people"},
      ];
      if (identity.ascendance) {
        result.push({name: identity.ascendance, kind: "ascendance", ancestryLevel: identity.ascendanceLevel});
      }
      result.push(
        {name: identity.culture, kind: "culture"},
        {name: identity.origin, kind: "origin"}
      );
      return result.filter(x => x.name);
    }

    function matrixContributions(target, identity) {
      const row = matrixByTarget.get(target);
      if (!row) return [];
      return identitySources(identity).map(source => {
        const intensity = Number(row[normalizeKey(source.name)]) || 0;
        return {...source, intensity};
      }).filter(x => x.intensity !== 0);
    }

    function rollContribution(contribution) {
      const count = modifierDiceCount(contribution.intensity, contribution.kind, contribution.ancestryLevel);
      const rolled = count ? rollDice(count, 6) : 0;
      return {
        ...contribution,
        dice: count ? `${count}D6` : "0D6",
        roll: rolled,
        delta: Math.sign(contribution.intensity) * rolled
      };
    }

    function hasPositiveGenerationModifier(skillName, identity) {
      let current = skillName;
      const visited = new Set();
      while (current && !visited.has(current)) {
        visited.add(current);
        if (matrixContributions(current, identity).some(x => x.intensity > 0)) return true;
        current = skillByName.get(current)?.parent || null;
      }
      return false;
    }

    function generateBaseCharacteristics(trace) {
      const stats = {};
      for (const row of fundamentalStats) {
        const dice = rollDice(3, 20);
        const value = 20 + dice;
        stats[row.nom] = value;
        trace.characteristics[row.nom] = {base: value, baseFormula: "20 + 3D20", contributions: [], final: value};
      }
      const resistanceValues = {};
      for (const row of resistances) {
        const value = roll(6);
        resistanceValues[row.nom] = value;
        trace.resistances[row.nom] = {base: value, baseFormula: "1D6", contributions: [], final: value};
      }
      return {stats, resistances: resistanceValues};
    }

    function applyIdentityStatModifiers(character, identity, trace) {
      for (const row of matrixRows) {
        if (!["Caractéristique", "Résistance"].includes(row.type)) continue;
        const bucket = row.type === "Caractéristique" ? character.stats : character.resistances;
        const traceBucket = row.type === "Caractéristique" ? trace.characteristics : trace.resistances;
        if (!(row.cible in bucket)) continue;
        const contributions = matrixContributions(row.cible, identity).map(rollContribution);
        if (!contributions.length) continue;
        bucket[row.cible] += sum(contributions.map(x => x.delta));
        const minimum = Number(charByName.get(row.cible)?.minimum);
        if (Number.isFinite(minimum)) bucket[row.cible] = Math.max(minimum, bucket[row.cible]);
        traceBucket[row.cible].contributions.push(...contributions);
        traceBucket[row.cible].final = bucket[row.cible];
      }
      for (const [name, t] of Object.entries(trace.characteristics)) t.final = character.stats[name];
      for (const [name, t] of Object.entries(trace.resistances)) t.final = character.resistances[name];
    }

    function createSkillStore() {
      return {
        martial: {},
        animal: {},
        magic: {},
        craft: {},
        camp: {},
        technique: {},
        social: {},
        physiology: {}
      };
    }

    function addPending(trace, target, reason, domain = "Compétence") {
      if (trace.pending.some(x => x.target === target && x.reason === reason)) return;
      trace.pending.push({target, domain, reason});
    }

    function setRawSkill(skills, trace, group, name, raw, details = {}) {
      skills[group][name] = raw;
      trace.skills[name] = {
        group,
        raw,
        rawFormula: details.rawFormula || null,
        generationBonus: details.generationBonus || false,
        generationBonusSources: details.generationBonusSources || [],
        contributions: [],
        final: raw
      };
    }

    function generationBonusSources(skillName, identity) {
      const result = [];
      let current = skillName;
      const visited = new Set();
      while (current && !visited.has(current)) {
        visited.add(current);
        const positives = matrixContributions(current, identity).filter(x => x.intensity > 0);
        for (const p of positives) result.push({...p, target: current});
        current = skillByName.get(current)?.parent || null;
      }
      return result;
    }

    function generateRawSkills(character, identity, trace) {
      const skills = createSkillStore();

      const martialSubskills = skillRows.filter(r => r.niveau === "Sous-catégorie" && String(r.domaine || "").includes("Martial"));
      for (const skill of martialSubskills) {
        const bonusSources = generationBonusSources(skill.nom, identity);
        const hasBonus = bonusSources.length > 0;
        const raw = hasBonus ? rollDice(2, 20) : roll(20);
        setRawSkill(skills, trace, "martial", skill.nom, raw, {
          rawFormula: hasBonus ? "2D20" : "1D20",
          generationBonus: hasBonus,
          generationBonusSources: bonusSources
        });
      }

      const isRangedWeapon = weapon => /Armes de tir|Armes à feu/.test(String(weapon.domaine || ""));
      const isShield = weapon => /Boucliers/.test(String(weapon.domaine || ""));
      const oneHandMeleeValues = weaponRows
        .filter(w => !isRangedWeapon(w) && !isShield(w) && ["1 main", "Au choix"].includes(w.prise))
        .map(w => skills.martial[w.nom])
        .filter(Number.isFinite);
      const twoHandMeleeValues = weaponRows
        .filter(w => !isRangedWeapon(w) && !isShield(w) && ["2 mains", "Au choix"].includes(w.prise))
        .map(w => skills.martial[w.nom])
        .filter(Number.isFinite);

      const specialMartial = new Set([
        "Pièges",
        "Discrétion",
        "Combat à deux armes",
        "Combat à mains nues",
        "Combat à deux mains",
        "Armes naturelles"
      ]);

      if (skillByName.has("Pièges")) {
        setRawSkill(
          skills, trace, "martial", "Pièges",
          ((character.stats.Intelligence + character.stats.Perception) / 2) * randomBetween(0.8, 1.2),
          {rawFormula: "Moyenne(Intelligence, Perception) × Rand(0,8 ; 1,2)"}
        );
      }

      if (skillByName.has("Discrétion")) {
        setRawSkill(
          skills, trace, "martial", "Discrétion",
          ((character.stats.Dextérité + character.stats.Perception + character.stats.Esquive) / 3) * randomBetween(0.8, 1.2),
          {rawFormula: "Moyenne(Dextérité, Perception, Esquive) × Rand(0,8 ; 1,2)"}
        );
      }

      if (skillByName.has("Combat à deux armes")) {
        setRawSkill(
          skills, trace, "martial", "Combat à deux armes",
          maxNumeric(oneHandMeleeValues) * randomBetween(0.8, 1.2),
          {rawFormula: "Max(armes de mêlée 1 main) × Rand(0,8 ; 1,2)"}
        );
      }

      if (skillByName.has("Combat à mains nues")) {
        setRawSkill(
          skills, trace, "martial", "Combat à mains nues",
          ((character.stats.Force + character.stats.Dextérité) / 2) * randomBetween(0.8, 1.2),
          {rawFormula: "Moyenne(Force, Dextérité) × Rand(0,8 ; 1,2)"}
        );
      }

      if (skillByName.has("Combat à deux mains")) {
        setRawSkill(
          skills, trace, "martial", "Combat à deux mains",
          maxNumeric(twoHandMeleeValues) * randomBetween(0.8, 1.2),
          {rawFormula: "Max(armes de mêlée 2 mains) × Rand(0,8 ; 1,2)"}
        );
      }

      if (skillByName.has("Armes naturelles")) {
        setRawSkill(skills, trace, "martial", "Armes naturelles", 0, {rawFormula: "0"});
      }

      const martialCategories = skillRows.filter(r => r.niveau === "Catégorie" && r.domaine === "Martial");
      for (const category of martialCategories) {
        if (specialMartial.has(category.nom)) continue;
        const children = (childrenByParent.get(category.nom) || [])
          .map(x => skills.martial[x.nom])
          .filter(Number.isFinite);
        if (!children.length) {
          skills.martial[category.nom] = null;
          addPending(trace, category.nom, "Catégorie martiale sans sous-catégorie : règle de tirage brut non définie.");
          continue;
        }
        const factor = randomBetween(0.8, 1.2);
        const raw = maxNumeric(children) * factor;
        setRawSkill(skills, trace, "martial", category.nom, raw, {
          rawFormula: "Max(sous-catégories) × Rand(0,8 ; 1,2)"
        });
      }

      const animalChildren = skillRows.filter(r => r.parent === "Compagnon animal");
      for (const skill of animalChildren) {
        const bonusSources = generationBonusSources(skill.nom, identity);
        const hasBonus = bonusSources.length > 0;
        let raw;
        let formula;
        if (hasBonus) {
          raw = rollDice(2,20);
          formula = "2D20";
        } else if (random() < 0.5) {
          raw = 1;
          formula = "50 % → 1";
        } else {
          raw = roll(20);
          formula = "50 % → 1D20";
        }
        setRawSkill(skills, trace, "animal", skill.nom, raw, {
          rawFormula: formula,
          generationBonus: hasBonus,
          generationBonusSources: bonusSources
        });
      }
      const animalValues = Object.values(skills.animal).filter(Number.isFinite);
      if (animalValues.length) {
        setRawSkill(skills, trace, "animal", "Compagnon animal", maxNumeric(animalValues) * randomBetween(0.8,1.2), {
          rawFormula: "Max(sous-compétences) × Rand(0,8 ; 1,2)"
        });
      }

      const magicSchools = skillRows.filter(r => r.domaine === "Magie" && r.niveau === "Catégorie");
      const magicBase = (character.stats.Intelligence + character.stats["Puissance magique"] + character.stats["Réserve de mana"]) / 3;
      for (const skill of magicSchools) {
        const bonusSources = generationBonusSources(skill.nom, identity);
        const hasBonus = bonusSources.length > 0;
        const present = hasBonus || random() < 0.5;
        const raw = present ? magicBase * randomBetween(0.5, 1.5) : 1;
        setRawSkill(skills, trace, "magic", skill.nom, raw, {
          rawFormula: present ? "Moyenne(Int, PM, Mana) × Rand(0,5 ; 1,5)" : "1",
          generationBonus: hasBonus,
          generationBonusSources: bonusSources
        });
      }

      const campSkills = skillRows.filter(r => r.domaine === "Camp" && r.niveau === "Catégorie");
      const campFactor = 1 + (character.stats.Charisme + character.stats.Intelligence) / 100;
      for (const skill of campSkills) {
        setRawSkill(skills, trace, "camp", skill.nom, campFactor * rollDice(6,6), {
          rawFormula: "(1 + (Charisme + Intelligence) / 100) × 6D6"
        });
      }

      const craftSkills = skillRows.filter(r => r.parent === "Artisanat");
      const craftFactor = 1 + (character.stats.Dextérité + character.stats.Intelligence) / 100;
      for (const skill of craftSkills) {
        setRawSkill(skills, trace, "craft", skill.nom, craftFactor * rollDice(6,6), {
          rawFormula: "(1 + (Dextérité + Intelligence) / 100) × 6D6"
        });
      }

      if (skillByName.has("Régénération")) {
        setRawSkill(skills, trace, "physiology", "Régénération", 0, {rawFormula: "0"});
      }

      const socialSkills = skillRows.filter(r => r.domaine === "Social" && r.niveau === "Catégorie");
      for (const skill of socialSkills) {
        setRawSkill(skills, trace, "social", skill.nom, rollDice(10,6), {rawFormula: "10D6"});
      }

      return skills;
    }

    function findSkillLocation(skills, target) {
      for (const [group, values] of Object.entries(skills)) {
        if (Object.prototype.hasOwnProperty.call(values, target)) return {group, values};
      }
      return null;
    }

    function applySkillModifiers(skills, identity, trace) {
      for (const row of matrixRows.filter(r => r.type === "Compétence")) {
        const location = findSkillLocation(skills, row.cible);
        if (!location) continue;
        const current = location.values[row.cible];
        if (!Number.isFinite(current)) continue;
        const contributions = matrixContributions(row.cible, identity).map(rollContribution);
        if (!contributions.length) continue;
        const final = Math.max(0, current + sum(contributions.map(x => x.delta)));
        location.values[row.cible] = final;
        trace.skills[row.cible].contributions.push(...contributions);
        trace.skills[row.cible].final = final;
      }
      for (const [name, entry] of Object.entries(trace.skills)) {
        const location = findSkillLocation(skills, name);
        if (location && Number.isFinite(location.values[name])) entry.final = location.values[name];
      }
    }

    function numericSkillValues(group) {
      return Object.values(group || {}).filter(Number.isFinite);
    }

    function weaponPreferenceScore(skills, weapon) {
      const specific = skills.martial[weapon.nom];
      const categoryName = skillByName.get(weapon.nom)?.parent || null;
      const category = categoryName ? skills.martial[categoryName] : null;
      if (!Number.isFinite(specific) || !Number.isFinite(category)) return null;
      return {
        weapon: weapon.nom,
        category: categoryName,
        categoryScore: category,
        specificScore: specific,
        score: category + specific,
        prise: weapon.prise,
        domaine: weapon.domaine
      };
    }

    function bestWeaponPreference(skills, predicate) {
      const candidates = weaponRows
        .filter(predicate)
        .map(weapon => weaponPreferenceScore(skills, weapon))
        .filter(Boolean)
        .sort((a,b) => b.score - a.score || a.weapon.localeCompare(b.weapon, "fr"));
      return candidates[0] || null;
    }

    function computeWeaponPreferences(skills) {
      const ranged = weapon => /Armes de tir|Armes à feu/.test(String(weapon.domaine || ""));
      const shield = weapon => /Boucliers/.test(String(weapon.domaine || ""));
      const melee = weapon => !ranged(weapon) && !shield(weapon);

      return {
        oneHand: bestWeaponPreference(skills, weapon => melee(weapon) && ["1 main", "Au choix"].includes(weapon.prise)),
        twoHands: bestWeaponPreference(skills, weapon => melee(weapon) && ["2 mains", "Au choix"].includes(weapon.prise)),
        ranged: bestWeaponPreference(skills, weapon => ranged(weapon))
      };
    }

    function calcReputation(character) {
      const pool = [
        ...fundamentalStats.map(r => character.stats[r.nom]),
        ...resistances.map(r => character.resistances[r.nom])
      ].filter(Number.isFinite);

      const martialTop = numericSkillValues(character.skills.martial).sort((a,b)=>b-a).slice(0,3);
      const magicTop = numericSkillValues(character.skills.magic).sort((a,b)=>b-a).slice(0,3);
      pool.push(...martialTop, ...magicTop);
      pool.push(
        maxNumeric(numericSkillValues(character.skills.craft)),
        maxNumeric(numericSkillValues(character.skills.animal)),
        maxNumeric(numericSkillValues(character.skills.camp)),
        maxNumeric(numericSkillValues(character.skills.physiology))
      );
      const socialMax = maxNumeric(numericSkillValues(character.skills.social));
      pool.push(socialMax, socialMax);

      const positive = pool.filter(v => v > 0);
      const mean = sum(positive) / positive.length;
      const max = Math.max(...positive);
      const min = Math.min(...positive);
      const calculated = mean
        * (1 + character.stats.Charisme / 100)
        * (1 + max / 100)
        * (1 + min / 100);

      character.reputationBreakdown = {
        pool: positive,
        mean,
        max,
        min,
        calculated,
        careerDelta: character.reputationCareerDelta || 0
      };
      return calculated + (character.reputationCareerDelta || 0);
    }

    function calcSalary(character) {
      const base = Math.max(1, character.reputation / 30);
      const pretensions = 1 + (character.salaryPretension - 35) / 100;
      const intelligence = 1 + 0.25 * Math.pow((character.stats.Intelligence - 100) / 100, 2);
      return base * pretensions * intelligence;
    }

    function choosePeople(captain) {
      const peopleBonus = constant("generation.captain.people_bonus_pp", 9) / 100;
      const otherMalus = constant("generation.captain.other_people_malus_pp", -1) / 100;
      return weightedChoice(peopleRows.map(row => ({
        value: row.nom,
        weight: Math.max(0.000001, Number(row.probabilite_de_base) + (captain ? (row.nom === captain.people ? peopleBonus : otherMalus) : 0))
      })));
    }

    function chooseCulture(people, captain) {
      const cultures = culturesForPeople(people);
      if (!cultures.length) throw new Error(`No culture configured for ${people}`);
      const multiplier = constant("generation.captain.culture_weight_multiplier", 2);
      return weightedChoice(cultures.map(culture => ({
        value: culture,
        weight: captain && culture === captain.culture ? multiplier : 1
      })));
    }

    function chooseOrigin(culture) {
      const origins = originsForCulture(culture);
      if (!origins.length) throw new Error(`No social origin configured for ${culture}`);
      return randomChoice(origins);
    }

    function chooseAncestry(people, captain) {
      const peopleConfig = peopleByName.get(people);
      const presence = Number(peopleConfig?.probabilite_d_ascendance) || 0;
      if (random() >= presence) return {name: null, level: null, levelName: null};

      const compatible = compatibleAncestries(people);
      if (!compatible.length) throw new Error(`No ancestry compatibility configured for ${people}`);
      const captainMultiplier = constant("generation.captain.ascendance_weight_multiplier", 2);
      const name = weightedChoice(compatible.map(entry => ({
        value: entry.name,
        weight: entry.weight * (
          captain && captain.people === people && captain.ascendance === entry.name
            ? captainMultiplier
            : 1
        )
      })));
      const level = rollAncestryLevel();
      return {name, level: level.level, levelName: level.name};
    }

    function validateForcedIdentity({people, culture, origin, ascendance}) {
      if (!peopleByName.has(people)) throw new Error(`Unknown people: ${people}`);
      if (culture && !isCultureCompatible(people, culture)) throw new Error(`Culture ${culture} is not compatible with ${people}`);
      if (culture && origin && !isOriginCompatible(culture, origin)) throw new Error(`Origin ${origin} is not compatible with ${culture}`);
      if (ascendance && !isAncestryCompatible(people, ascendance)) throw new Error(`Ancestry ${ascendance} is not compatible with ${people}`);
    }

    function createMercenary(createOptions = {}) {
      const captain = createOptions.captain ?? null;
      const people = createOptions.forcedPeople || choosePeople(captain);
      const culture = createOptions.forcedCulture || chooseCulture(people, captain);
      const origin = createOptions.forcedOrigin || chooseOrigin(culture);
      let ancestry;

      if (Object.prototype.hasOwnProperty.call(createOptions, "forcedAscendance")) {
        const forced = createOptions.forcedAscendance || null;
        ancestry = forced ? {
          name: forced,
          level: Number(createOptions.forcedAscendanceLevel) || 3,
          levelName: ancestryLevels.find(x => x.level === (Number(createOptions.forcedAscendanceLevel) || 3))?.nom || null
        } : {name:null, level:null, levelName:null};
      } else {
        ancestry = chooseAncestry(people, captain);
      }

      validateForcedIdentity({people, culture, origin, ascendance: ancestry.name});

      const alignment = createOptions.forcedAlignment || randomChoice(alignmentRows.map(r => r.nom));
      const identity = {
        people,
        culture,
        origin,
        alignment,
        ascendance: ancestry.name,
        ascendanceLevel: ancestry.level
      };

      const trace = {
        identity: {...identity, ascendanceLevelName: ancestry.levelName},
        characteristics: {},
        resistances: {},
        skills: {},
        cosmetics: cosmeticFields.map(target => ({
          target,
          status: target === "Nom du mercenaire" ? "generated" : "deferred",
          reason: target === "Nom du mercenaire"
            ? "Nom provisoire généré actuellement."
            : "Champ cosmétique : sera généré après le profil mécanique et pourra dépendre de ses caractéristiques."
        })),
        pending: []
      };

      const base = generateBaseCharacteristics(trace);
      const character = {
        id: createOptions.id ?? null,
        name: createOptions.name || nameGenerator(people, createOptions.id),
        role: createOptions.role || "Mercenaire",
        people,
        culture,
        origin,
        alignment,
        ascendance: ancestry.name,
        ascendanceLevel: ancestry.level,
        ascendanceLevelName: ancestry.levelName,
        stats: base.stats,
        resistances: base.resistances,
        age: null,
        size: null,
        corpulence: null,
        biography: null,
        reputationCareerDelta: Number(createOptions.reputationCareerDelta) || 0,
        generationTrace: trace
      };

      applyIdentityStatModifiers(character, identity, trace);
      character.skills = generateRawSkills(character, identity, trace);
      applySkillModifiers(character.skills, identity, trace);
      character.weaponPreferences = computeWeaponPreferences(character.skills);

      character.salaryPretension = rollDice(10,6);
      character.pvMax = Math.ceil(3 * (
        character.stats.Constitution
        + 0.2 * character.stats.Endurance
        + 0.1 * character.stats.Volonté
      ));
      character.pv = character.pvMax;
      character.mana = character.stats["Réserve de mana"];
      character.reputation = calcReputation(character);
      character.salary = calcSalary(character);

      trace.derived = {
        pvMax: {formula: "ceil(3 × (Constitution + 0,2×Endurance + 0,1×Volonté))", value: character.pvMax},
        mana: {formula: "Réserve de mana", value: character.mana},
        salaryPretension: {formula: "10D6", value: character.salaryPretension},
        reputation: {value: character.reputation},
        salary: {value: character.salary},
        weaponPreferences: character.weaponPreferences
      };

      return character;
    }

    function createCaptain(createOptions = {}) {
      return createMercenary({
        ...createOptions,
        captain: null,
        forcedAscendanceLevel: createOptions.forcedAscendance ? 3 : null,
        role: createOptions.role || "Capitaine"
      });
    }

    function rollInitialSquadSize(captain) {
      const hasAscendance = Boolean(captain.ascendance);
      switch (captain.people) {
        case "Ogre":
          return roll(3) + (hasAscendance ? 0 : 1);
        case "Elfe":
        case "Reptilien":
        case "Homme-bête":
          return rollDice(2,6) + (hasAscendance ? 0 : 3);
        case "Nain":
        case "Orc":
        case "Humain":
          return rollDice(3,6) + (hasAscendance ? 0 : 4);
        case "Gnome":
        case "Gobelin":
        case "Halfling":
          return rollDice(4,6) + (hasAscendance ? 0 : 6);
        default:
          return rollDice(2,6) + 3;
      }
    }

    function createInitialSquad(captain, createOptions = {}) {
      const count = rollInitialSquadSize(captain);
      return Array.from({length: count}, (_, index) => createMercenary({
        ...createOptions,
        captain,
        forcedPeople: captain.people,
        forcedCulture: captain.culture,
        role: createOptions.role || "Mercenaire initial",
        id: typeof createOptions.nextId === "function" ? createOptions.nextId(index) : null
      }));
    }

    function classifySkill(skill) {
      if (skill.nom === "Sort à créer") return {status:"placeholder", reason:"Sort placeholder, pas une compétence initiale."};
      if (skill.niveau === "Sous-catégorie" && String(skill.domaine || "").includes("Martial")) return {status:"generated", rule:"Martial 1D20 / 2D20"};
      if (skill.parent === "Compagnon animal") return {status:"generated", rule:"Animal"};
      if (skill.nom === "Compagnon animal") return {status:"derived", rule:"Max × Rand(0,8 ; 1,2)"};
      if (skill.domaine === "Magie" && skill.niveau === "Catégorie") return {status:"generated", rule:"École de magie"};
      if (skill.domaine === "Camp" && skill.niveau === "Catégorie") return {status:"generated", rule:"Camp 6D6 pondéré"};
      if (skill.parent === "Artisanat") return {status:"generated", rule:"Artisanat 6D6 pondéré"};
      if (skill.nom === "Pièges") return {status:"derived", rule:"Moyenne(Intelligence, Perception) × Rand(0,8 ; 1,2)"};
      if (skill.nom === "Discrétion") return {status:"derived", rule:"Moyenne(Dextérité, Perception, Esquive) × Rand(0,8 ; 1,2)"};
      if (skill.nom === "Combat à deux armes") return {status:"derived", rule:"Max arme de mêlée 1 main × Rand(0,8 ; 1,2)"};
      if (skill.nom === "Combat à mains nues") return {status:"derived", rule:"Moyenne(Force, Dextérité) × Rand(0,8 ; 1,2)"};
      if (skill.nom === "Combat à deux mains") return {status:"derived", rule:"Max arme de mêlée 2 mains × Rand(0,8 ; 1,2)"};
      if (skill.nom === "Armes naturelles") return {status:"generated", rule:"0 puis modificateurs"};
      if (skill.nom === "Régénération") return {status:"generated", rule:"0 puis modificateurs"};
      if (skill.domaine === "Social" && skill.niveau === "Catégorie") return {status:"generated", rule:"10D6"};
      if (skill.niveau === "Catégorie" && skill.domaine === "Martial") {
        const children = childrenByParent.get(skill.nom) || [];
        return children.length
          ? {status:"derived", rule:"Max × Rand(0,8 ; 1,2)"}
          : {status:"pending", reason:"Catégorie martiale sans sous-catégorie et sans tirage brut défini."};
      }
      if (skill.niveau === "Aptitude") return {status:"catalog", reason:"Acquisition/effet hors pipeline brut actuel."};
      return {status:"catalog", reason:"Pas de règle de génération brute V1."};
    }

    function auditReferenceData() {
      const issues = [];
      const peopleProbability = sum(peopleRows.map(r => Number(r.probabilite_de_base) || 0));
      const ancestryLevelProbability = sum(ancestryLevelRows.map(r => Number(r.probabilite_de_base) || 0));
      if (Math.abs(peopleProbability - 1) > 1e-9) issues.push(`People probability sum = ${peopleProbability}`);
      if (Math.abs(ancestryLevelProbability - 1) > 1e-9) issues.push(`Ancestry level probability sum = ${ancestryLevelProbability}`);

      for (const p of peopleRows) {
        if (!culturesForPeople(p.nom).length) issues.push(`No culture for ${p.nom}`);
        if (!compatibleAncestries(p.nom).length) issues.push(`No ancestry compatibility for ${p.nom}`);
      }
      for (const c of cultureRows) {
        if (!originsForCulture(c.nom).length) issues.push(`No origin for ${c.nom}`);
      }

      const skillCoverage = skillRows.map(skill => ({name: skill.nom, ...classifySkill(skill)}));
      const matrixCoverage = matrixRows.map(row => {
        if (["Caractéristique","Résistance"].includes(row.type)) {
          return {target: row.cible, type: row.type, status: charByName.has(row.cible) ? "active" : "missing-target"};
        }
        if (row.type === "Compétence") {
          const skill = skillByName.get(row.cible);
          if (!skill) return {target:row.cible, type:row.type, status:"missing-target"};
          const classification = classifySkill(skill);
          return {
            target: row.cible,
            type: row.type,
            status: ["generated","derived"].includes(classification.status) ? "active" : "blocked",
            reason: classification.reason || null
          };
        }
        return {target:row.cible, type:row.type, status:"ignored"};
      });

      const characteristicCoverage = characteristicRows
        .filter(r => r.genere_a_la_creation === true)
        .map(r => {
          if (r.famille === CORE_STAT_FAMILY || r.famille === RESISTANCE_FAMILY) return {name:r.nom,status:"generated"};
          if (r.nom === "Réputation") return {name:r.nom,status:"derived"};
          if (r.nom === "Prétentions salariales") return {name:r.nom,status:"generated"};
          if (r.nom === "Nom du mercenaire") return {name:r.nom,status:"generated"};
          if (r.famille === "Cosmétique") return {
            name:r.nom,
            status:r.nom === "Nom du mercenaire" ? "generated" : "cosmetic",
            reason:"Champ descriptif non-codant, généré après le profil mécanique."
          };
          return {name:r.nom,status:"catalog"};
        });

      return {
        counts: {
          peoples: peopleRows.length,
          cultures: cultureRows.length,
          ancestryCompatibilities: ancestryCompatRows.length,
          cultureOriginCompatibilities: cultureOriginRows.length,
          matrixRows: matrixRows.length,
          skills: skillRows.length,
          generatedCharacteristics: characteristicRows.filter(r => r.genere_a_la_creation === true).length
        },
        probabilities: {peopleProbability, ancestryLevelProbability},
        issues,
        characteristicCoverage,
        skillCoverage,
        matrixCoverage,
        cosmetics: characteristicCoverage
          .filter(x => x.status === "cosmetic")
          .map(x => ({target:x.name,reason:x.reason})),
        pending: skillCoverage
          .filter(x => x.status === "pending")
          .map(x => ({target:x.name,reason:x.reason}))
      };
    }

    return {
      createMercenary,
      createCaptain,
      createInitialSquad,
      rollInitialSquadSize,
      auditReferenceData,
      culturesForPeople,
      originsForCulture,
      compatibleAncestries,
      isAncestryCompatible,
      isCultureCompatible,
      isOriginCompatible,
      people: () => peopleRows.map(r => r.nom),
      alignments: () => alignmentRows.map(r => r.nom),
      ancestries: () => ancestryRows.map(r => r.nom),
      normalizeKey
    };
  }

  return {createGenerator, normalizeKey};
});
