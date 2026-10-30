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

  // options.affinity (facultatif) : createAffinityRules(...) de game-core/affinity.js, pour le facteur
  // d'affinité du salaire demandé ; sans lui, le facteur vaut 1.
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
    const baseArmorRows = rows.baseArmors || [];
    const bootsRows = rows.boots || [];
    const beltRows = rows.belts || [];
    const amuletRows = rows.amulets || [];
    const capeRows = rows.capes || [];
    const gloveRows = rows.gloves || [];
    const pantsRows = rows.pants || [];
    const ringRows = rows.rings || [];
    const helmetRows = rows.helmets || [];
    const potionRows = rows.potions || [];
    const spellRows = rows.spells || [];
    const itemQualityRows = rows.itemQualities || [];
    const equipmentSlotRows = rows.equipmentSlots || [];
    const binaryAptitudeRows = rows.binaryAptitudeGrants || [];
    const alignmentGeneration = reference.alignmentGeneration || {};
    const startingEquipmentGeneration = reference.startingEquipmentGeneration || {};

    const peopleByName = new Map(peopleRows.map(r => [r.nom, r]));
    const cultureByName = new Map(cultureRows.map(r => [r.nom, r]));
    const magicSchoolNames = skillRows.filter(r => r.domaine === "Magie" && r.niveau === "Catégorie").map(r => r.nom);
    const skillByName = new Map(skillRows.map(r => [r.nom, r]));
    const charByName = new Map(characteristicRows.map(r => [r.nom, r]));
    const matrixByTarget = new Map(matrixRows.map(r => [r.cible, r]));
    const constants = new Map(formulaConstantRows.map(r => [r.code, Number(r.valeur)]));
    const weaponByName = new Map(weaponRows.map(r => [r.nom, r]));
    const itemQualityByCode = new Map(itemQualityRows.map(r => [r.code, r]));

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

    function alignmentPosition(name) {
      const grid = alignmentGeneration.grid || [];
      for (let row = 0; row < grid.length; row++) {
        const col = (grid[row] || []).indexOf(name);
        if (col >= 0) return {row, col};
      }
      return null;
    }

    function adjacentAlignments(name) {
      const position = alignmentPosition(name);
      const grid = alignmentGeneration.grid || [];
      if (!position) return [];
      const result = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const row = grid[position.row + dr];
          const value = row?.[position.col + dc];
          if (value) result.push(value);
        }
      }
      return result;
    }

    function applyCaptainAlignmentInfluence(entries, captain) {
      if (!captain?.alignment) return entries;

      const bonus = constant("generation.captain.alignment_bonus_pp", 15) / 100;
      if (!(bonus > 0)) return entries;

      const captainEntry = entries.find(entry => entry.name === captain.alignment);
      if (!captainEntry) return entries;

      const current = Number(captainEntry.probability) || 0;
      const target = Math.min(1, current + bonus);
      const otherTotal = 1 - current;
      if (otherTotal <= 0) return entries;

      const scale = (1 - target) / otherTotal;
      return entries.map(entry => {
        const baseProbability = Number(entry.probability) || 0;
        const probability = entry.name === captain.alignment ? target : baseProbability * scale;
        return {...entry, baseProbability, probability, captainDelta: probability - baseProbability};
      });
    }

    function alignmentDistributionForPeople(people, culture = null, captain = null) {
      const cultureOverride = culture ? alignmentGeneration.culture_overrides?.[culture] : null;
      const principal = cultureOverride || peopleByName.get(people)?.alignement_principal;
      const all = alignmentRows.map(r => r.nom);
      if (!principal || !all.includes(principal)) {
        const fallback = all.map(name => ({name, probability: all.length ? 1 / all.length : 0, bucket:"fallback"}));
        return applyCaptainAlignmentInfluence(fallback, captain);
      }

      const distribution = alignmentGeneration.distribution || {};
      const principalProbability = Number(distribution.principal) || 0.4;
      const nearbyTotal = Number(distribution.nearby_total) || 0.45;
      const distantTotal = Number(distribution.distant_total) || 0.15;
      const nearby = adjacentAlignments(principal).filter(name => name !== principal);
      const nearbySet = new Set(nearby);
      const distant = all.filter(name => name !== principal && !nearbySet.has(name));

      const entries = [{name: principal, probability: principalProbability, bucket:"principal"}];

      if (distant.length === 0) {
        const remaining = 1 - principalProbability;
        for (const name of nearby) entries.push({name, probability: nearby.length ? remaining / nearby.length : 0, bucket:"nearby"});
        return applyCaptainAlignmentInfluence(entries, captain);
      }

      for (const name of nearby) entries.push({name, probability: nearby.length ? nearbyTotal / nearby.length : 0, bucket:"nearby"});
      for (const name of distant) entries.push({name, probability: distant.length ? distantTotal / distant.length : 0, bucket:"distant"});

      return applyCaptainAlignmentInfluence(entries, captain);
    }

    function chooseAlignment(people, culture = null, captain = null) {
      const distribution = alignmentDistributionForPeople(people, culture, captain);
      return weightedChoice(distribution.map(entry => ({value: entry.name, weight: entry.probability})));
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

    // Cultures sans école de magie (12-magic.md ; Idan, 2026-10-25) : elles n'ont que deux tirages de sorts ; en
    // compensation, +1D6 à une caractéristique (cultures.json, compensation_sans_ecole : Courage pour les nains des
    // montagnes et ceux réduits en esclavage dans les colonies, Force pour les ogres des cités humaines et des montagnes).
    function applyNoSchoolCompensation(character, trace) {
      const stat = cultureByName.get(character.culture)?.compensation_sans_ecole;
      if (!stat || !(stat in character.stats)) return;
      const count = constant("generation.spells.no_school_bonus_d6", 1);
      const rolled = rollDice(count, 6);
      character.stats[stat] += rolled;
      const statTrace = trace.characteristics[stat];
      if (!statTrace) return;
      statTrace.contributions.push({name: character.culture + " (sans école de magie)", kind: "culture", intensity: 1, dice: `${count}D6`, roll: rolled, delta: rolled});
      statTrace.final = character.stats[stat];
    }

    // Sorts connus à la création (12-magic.md ; Idan, 2026-10-25), capitaine compris : trois tirages, dans l'ordre l'école
    // de la culture (cultures.json, ecole_magie ; pas de tirage pour une culture sans école), la meilleure école, la
    // deuxième meilleure. Chance = min(75, École × Intelligence / 150) %, × 1,1 pour un deuxième sort, × 1,3 pour un
    // troisième. Le sort est tiré au hasard parmi ceux de l'école qu'il ne connaît pas encore (rien si l'école n'en a pas
    // ou plus : deux sorts d'une même école sont possibles, jamais deux fois le même) ; il démarre au niveau 1.
    function drawStartingSpells(character) {
      const known = [];
      const draws = [];
      if (!spellRows.length) return {known, draws};
      const values = character.skills.magic || {};
      const level = school => Number(values[school]) || 0;
      const ranked = [...magicSchoolNames].sort((a, b) => level(b) - level(a));
      const intelligence = Number(character.stats.Intelligence) || 0;
      const multipliers = [1, constant("generation.spells.second_spell_multiplier", 1.1), constant("generation.spells.third_spell_multiplier", 1.3)];
      const steps = [["culture", cultureByName.get(character.culture)?.ecole_magie || null], ["best", ranked[0]], ["second", ranked[1]]];
      for (const [source, school] of steps) {
        if (!school) continue;
        const base = Math.min(constant("generation.spells.chance_max", 75), level(school) * intelligence / constant("generation.spells.chance_divisor", 150));
        const chance = base * multipliers[Math.min(known.length, multipliers.length - 1)];
        const available = spellRows.filter(spell => spell.ecole === school && !known.some(k => k.code === spell.code));
        const draw = {source, school, chance, roll: null, spell: null};
        if (available.length) {
          draw.roll = random() * 100;
          if (draw.roll < chance) {
            const spell = available[Math.floor(random() * available.length)];
            known.push({code: spell.code, name: spell.nom, school, mastery: constant("generation.spells.starting_level", 1)});
            draw.spell = spell.code;
          }
        }
        draws.push(draw);
      }
      return {known, draws};
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

    function automaticAptitudeSources(row, identity) {
      const automatic = row.automatic || {};
      const sources = [];
      if ((automatic.peoples || []).includes(identity.people)) sources.push({kind:"people",name:identity.people});
      if (identity.ascendance && (automatic.ancestries || []).includes(identity.ascendance)) sources.push({kind:"ascendance",name:identity.ascendance});
      if ((automatic.cultures || []).includes(identity.culture)) sources.push({kind:"culture",name:identity.culture});
      if ((automatic.origins || []).includes(identity.origin)) sources.push({kind:"origin",name:identity.origin});
      return sources;
    }

    function probabilityAptitudeSources(row, identity) {
      const bonuses = row.bonuses_pp || {};
      const sources = [];
      const candidates = [
        ["people", identity.people, bonuses.peoples || {}],
        ["ascendance", identity.ascendance, bonuses.ancestries || {}],
        ["culture", identity.culture, bonuses.cultures || {}],
        ["origin", identity.origin, bonuses.origins || {}]
      ];
      for (const [kind, name, map] of candidates) {
        if (!name) continue;
        const pp = Number(map[name]) || 0;
        if (pp) sources.push({kind,name,pp});
      }
      return sources;
    }

    function applyArmorHierarchy(skills, trace) {
      const heavy = "Port d’armure lourde";
      const intermediate = "Port d’armure intermédiaire";
      const light = "Port d’armure légère";

      if (skills.martial[heavy]) {
        skills.martial[intermediate] = true;
        skills.martial[light] = true;
        if (trace.skills[intermediate]) {
          trace.skills[intermediate].final = true;
          trace.skills[intermediate].inheritedFrom = heavy;
        }
        if (trace.skills[light]) {
          trace.skills[light].final = true;
          trace.skills[light].inheritedFrom = heavy;
        }
      } else if (skills.martial[intermediate]) {
        skills.martial[light] = true;
        if (trace.skills[light]) {
          trace.skills[light].final = true;
          trace.skills[light].inheritedFrom = intermediate;
        }
      }
    }

    function generateBinaryAptitudes(skills, identity, trace) {
      const armorRules = reference.binaryAptitudeGrants?.armor_rules || {};
      const magicValues = Object.values(skills.magic || {}).filter(Number.isFinite);
      const maxMagic = maxNumeric(magicValues, 0);

      for (const row of binaryAptitudeRows) {
        const group = row.domaine === "Physiologie" ? "physiology" : "martial";
        let value = false;
        let formula = "Binaire";
        let generationBonusSources = [];
        const details = {
          mode: row.mode || "disabled",
          magicMax: maxMagic
        };

        if (row.mode === "automatic") {
          const sources = automaticAptitudeSources(row, identity);
          value = sources.length > 0;
          formula = "Automatique selon identité";
          generationBonusSources = sources;
          details.sources = sources;
        } else if (row.mode === "probability") {
          const sources = probabilityAptitudeSources(row, identity);
          let probabilityBeforePenalty = sum(sources.map(x => x.pp));
          let warriorBonus = 0;
          let magicMultiplier = 1;

          if (row.armor === true) {
            const warriorThreshold = Number(armorRules.warrior_magic_threshold);
            if (Number.isFinite(warriorThreshold) && maxMagic <= warriorThreshold) {
              warriorBonus = Number(armorRules.warrior_bonus_pp?.[row.aptitude]) || 0;
              if (warriorBonus) probabilityBeforePenalty += warriorBonus;
            }

            const penaltyThreshold = Number(armorRules.magic_penalty_threshold);
            if (Number.isFinite(penaltyThreshold) && maxMagic > penaltyThreshold) {
              magicMultiplier = Number(armorRules.magic_penalty_multiplier) || 1;
            }
          }

          const probability = Math.max(0, Math.min(100, probabilityBeforePenalty * magicMultiplier));
          const percentileRoll = random() * 100;
          value = percentileRoll < probability;
          formula = "Somme bonus identité/profil → jet %";
          generationBonusSources = sources;
          Object.assign(details, {
            sources,
            probabilityBeforePenalty,
            warriorBonus,
            magicMultiplier,
            probability,
            percentileRoll
          });
        } else if (row.mode === "disabled") {
          value = false;
          formula = row.reason || "Désactivé";
          details.reason = row.reason || null;
        }

        skills[group][row.aptitude] = value;
        trace.skills[row.aptitude] = {
          group,
          raw: value,
          rawFormula: formula,
          generationBonus: false,
          generationBonusSources,
          contributions: [],
          final: value,
          binary: true,
          ...details
        };
      }

      applyArmorHierarchy(skills, trace);
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

      // Pièges, Discrétion et Combat à mains nues partent des caractéristiques (≈ 60) ; le facteur les ramène
      // à l'échelle des armes, tirées au 1D20 / 2D20 (Idan, 2026-10-21).
      const statSkillFactor = constant("generation.martial.stat_skill_factor", 0.5);
      const factorText = String(statSkillFactor).replace(".", ",");

      if (skillByName.has("Pièges")) {
        setRawSkill(
          skills, trace, "martial", "Pièges",
          ((character.stats.Intelligence + character.stats.Perception) / 2) * randomBetween(0.8, 1.2) * statSkillFactor,
          {rawFormula: `Moyenne(Intelligence, Perception) × Rand(0,8 ; 1,2) × ${factorText}`}
        );
      }

      if (skillByName.has("Discrétion")) {
        setRawSkill(
          skills, trace, "martial", "Discrétion",
          ((character.stats.Dextérité + character.stats.Perception + character.stats.Esquive) / 3) * randomBetween(0.8, 1.2) * statSkillFactor,
          {rawFormula: `Moyenne(Dextérité, Perception, Esquive) × Rand(0,8 ; 1,2) × ${factorText}`}
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
          ((character.stats.Force + character.stats.Dextérité) / 2) * randomBetween(0.8, 1.2) * statSkillFactor,
          {rawFormula: `Moyenne(Force, Dextérité) × Rand(0,8 ; 1,2) × ${factorText}`}
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
      // Ajustements en D6 d'un peuple, hors échelle de la Matrice (peoples.json, ajustements_d6 ; Idan, 2026-10-29 :
      // −1D6 de Discrétion aux Ogres).
      for (const [target, count] of Object.entries(peopleByName.get(identity.people)?.ajustements_d6 || {})) {
        const location = findSkillLocation(skills, target);
        if (!count || !location || !Number.isFinite(location.values[target])) continue;
        const rolled = rollDice(Math.abs(count), 6);
        const delta = Math.sign(count) * rolled;
        location.values[target] = Math.max(0, location.values[target] + delta);
        trace.skills[target]?.contributions.push({name: identity.people, kind: "people", intensity: Math.sign(count), dice: `${Math.abs(count)}D6`, roll: rolled, delta});
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

    function isRangedWeapon(weapon) {
      return /Armes de tir|Armes à feu/.test(String(weapon?.domaine || ""));
    }

    function isShieldWeapon(weapon) {
      return /Boucliers/.test(String(weapon?.domaine || ""));
    }

    function isMeleeWeapon(weapon) {
      return !isRangedWeapon(weapon) && !isShieldWeapon(weapon);
    }

    function mean(values) {
      const numeric = values.filter(Number.isFinite);
      return numeric.length ? sum(numeric) / numeric.length : 0;
    }

    function computeEquipmentProfile(character) {
      const bestMelee = bestWeaponPreference(character.skills, isMeleeWeapon);
      const bestRanged = bestWeaponPreference(character.skills, isRangedWeapon);
      const bestMagicEntry = Object.entries(character.skills.magic || {})
        .filter(([,value]) => Number.isFinite(value))
        .sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))[0] || null;
      const bestMagic = bestMagicEntry ? bestMagicEntry[1] : 0;

      const scores = {
        melee: 0.6 * ((bestMelee?.score || 0) / 2) + 0.4 * mean([
          character.stats.Force, character.stats.Dextérité, character.stats.Endurance, character.stats.Courage
        ]),
        ranged: 0.6 * ((bestRanged?.score || 0) / 2) + 0.4 * mean([
          character.stats.Dextérité, character.stats.Perception, character.stats.Vitesse
        ]),
        // Même échelle que les armes : la meilleure école est aussi divisée par 2 (décision Idan + Chatty, Issue #12).
        magic: 0.6 * (bestMagic / 2) + 0.4 * mean([
          character.stats.Intelligence, character.stats["Puissance magique"], character.stats["Réserve de mana"]
        ])
      };

      const type = Object.entries(scores)
        .sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "melee";

      return {
        type,
        scores,
        bestMelee,
        bestRanged,
        bestMagic: bestMagicEntry ? {school:bestMagicEntry[0], score:bestMagicEntry[1]} : null
      };
    }

    function equipmentTierDistribution(reputation) {
      const anchors = [...(startingEquipmentGeneration.rows || [])]
        .filter(row => Number.isFinite(Number(row.reputation)))
        .sort((a,b) => Number(a.reputation) - Number(b.reputation));
      if (!anchors.length) return {1:0.9,2:0.09,3:0.01};

      const rep = Number(reputation) || 0;
      if (rep <= Number(anchors[0].reputation)) return {1:Number(anchors[0].t1),2:Number(anchors[0].t2),3:Number(anchors[0].t3)};
      const last = anchors[anchors.length - 1];
      if (rep >= Number(last.reputation)) return {1:Number(last.t1),2:Number(last.t2),3:Number(last.t3)};

      for (let i = 0; i < anchors.length - 1; i++) {
        const a = anchors[i];
        const b = anchors[i + 1];
        const ar = Number(a.reputation);
        const br = Number(b.reputation);
        if (rep < ar || rep > br) continue;
        const t = (rep - ar) / (br - ar);
        return {
          1: Number(a.t1) + (Number(b.t1) - Number(a.t1)) * t,
          2: Number(a.t2) + (Number(b.t2) - Number(a.t2)) * t,
          3: Number(a.t3) + (Number(b.t3) - Number(a.t3)) * t
        };
      }
      return {1:0.9,2:0.09,3:0.01};
    }

    function rollEquipmentTier(reputation) {
      const distribution = equipmentTierDistribution(reputation);
      return weightedChoice([1,2,3].map(tier => ({value:tier, weight:distribution[tier]})));
    }

    function highestArmorClass(skills) {
      if (skills.martial["Port d’armure lourde"] === true) return "Lourde";
      if (skills.martial["Port d’armure intermédiaire"] === true) return "Intermédiaire";
      if (skills.martial["Port d’armure légère"] === true) return "Légère";
      return "Vêtement";
    }

    function qualityForTier(tier) {
      const qualityCode = startingEquipmentGeneration.quality_by_tier?.[String(tier)] || ({1:"worn",2:"standard",3:"luxury"})[tier];
      return itemQualityByCode.get(qualityCode) || {code:qualityCode,nom:`T${tier}`};
    }

    let itemSequence = 0;
    function makeItemId(character, slot) {
      itemSequence += 1;
      const owner = character.id ?? "anon";
      const randomPart = Math.floor(random() * 0x7fffffff).toString(36);
      return `item-${owner}-${itemSequence}-${randomPart}`;
    }

    function createItemInstance(character, payload) {
      const tier = rollEquipmentTier(character.reputation);
      const quality = qualityForTier(tier);
      return {
        id: makeItemId(character, payload.slot),
        templateId: payload.templateId,
        name: payload.name,
        itemType: payload.itemType,
        slot: payload.slot,
        owner: character.id ?? null,
        tier,
        qualityCode: quality.code || null,
        qualityName: quality.nom || null,
        category: payload.category || null,
        combatFamily: payload.combatFamily || null,
        grip: payload.grip || null,
        description: payload.description || null
      };
    }

    function weaponItem(character, preference, slot) {
      if (!preference) return null;
      const template = weaponByName.get(preference.weapon);
      if (!template) return null;
      return createItemInstance(character, {
        templateId:`weapon:${normalizeKey(template.nom)}`,
        name:template.nom,
        itemType:"weapon",
        slot,
        category:preference.category,
        combatFamily:isRangedWeapon(template) ? "ranged" : "melee",
        grip:template.prise
      });
    }

    function armorItem(character, armorClass) {
      const candidates = baseArmorRows.filter(row => row.type_armure === armorClass);
      if (!candidates.length) return null;
      const template = randomChoice(candidates);
      return createItemInstance(character, {
        templateId:`armor:${template.code || normalizeKey(template.nom)}`,
        name:template.nom,
        itemType:"armor",
        slot:"armor",
        category:armorClass,
        description:template.description
      });
    }

    // Bottes, ceinture, amulette, cape, gants, culotte et bague (Idan, 2026-10-24) : un des types de boots.json, belts.json,
    // amulets.json, capes.json, gloves.json, pants.json ou rings.json ; tier selon la réputation, comme le reste.
    const STAT_GEAR = {
      boots:{rows:bootsRows, slot:"boots", category:"Bottes"},
      belt:{rows:beltRows, slot:"belt", category:"Ceinture"},
      amulet:{rows:amuletRows, slot:"amulet", category:"Amulette"},
      cape:{rows:capeRows, slot:"cape", category:"Cape"},
      gloves:{rows:gloveRows, slot:"gloves", category:"Gants"},
      pants:{rows:pantsRows, slot:"pants", category:"Culotte"},
      ring:{rows:ringRows, slot:"ring_1", category:"Bague"},
      // Casques et chapeaux (Idan, 2026-10-25).
      helmet:{rows:helmetRows, slot:"head", category:"Casque"}
    };
    function statGearItem(character, itemType, template) {
      if (!template) return null;
      const gear = STAT_GEAR[itemType];
      return createItemInstance(character, {
        templateId:`${itemType}:${template.code || normalizeKey(template.nom)}`,
        name:template.nom,
        itemType,
        slot:gear.slot,
        category:gear.category
      });
    }

    // Stock d'armes de la compagnie à sa création (Idan, 2026-10-23) : 2D20 armes tirées parmi toutes celles du
    // référentiel (boucliers compris), doublons possibles. Poids d'une arme = 1 + 2 × A, au moins 0,25 ; A additionne
    // les intensités de la matrice de génération du peuple et de la culture du capitaine, sur l'arme et sur sa
    // catégorie. Tier de chaque arme : table de l'équipement de départ, à la réputation du capitaine.
    // Les armes du stock n'ont pas de propriétaire : elles attendent à l'Intendance.
    function captainWeaponAffinity(weapon, captain) {
      const targets = [weapon.nom, skillByName.get(weapon.nom)?.parent].filter(Boolean);
      const sources = [captain.people, captain.culture].filter(Boolean).map(normalizeKey);
      return sum(targets.flatMap(target => sources.map(key => Number(matrixByTarget.get(target)?.[key]) || 0)));
    }

    function startingStockWeight(weapon, captain) {
      const k = constant("company.starting_stock.affinity_weight", 2);
      const floor = constant("company.starting_stock.min_weight", 0.25);
      return Math.max(floor, 1 + k * captainWeaponAffinity(weapon, captain));
    }

    function createStartingStock(captain) {
      const count = rollDice(constant("company.starting_stock.dice_count", 2), constant("company.starting_stock.dice_sides", 20));
      const entries = weaponRows.map(weapon => ({value:weapon, weight:startingStockWeight(weapon, captain)}));
      return Array.from({length:count}, () => {
        const weapon = weightedChoice(entries);
        const item = weaponItem(captain, {weapon:weapon.nom, category:skillByName.get(weapon.nom)?.parent || null}, null);
        return {...item, owner:null};
      });
    }

    // Armures du stock de départ (Idan, 2026-10-24) : 1D6 armures de chaque type (Vêtement, Légère, Intermédiaire,
    // Lourde), chacune tirée au hasard dans son type ; tier par la même table, à la réputation du capitaine.
    function createStartingArmorStock(captain) {
      const count = () => rollDice(constant("company.starting_stock.armor_dice_count", 1), constant("company.starting_stock.armor_dice_sides", 6));
      const types = [...new Set(baseArmorRows.map(row => row.type_armure).filter(Boolean))];
      return types.flatMap(type => Array.from({length:count()}, () => ({...armorItem(captain, type), owner:null})));
    }

    // Bottes, ceintures, amulettes, capes, gants, culottes et bagues du stock de départ (Idan, 2026-10-24) : 1D6 de chaque,
    // chacun d'un
    // type tiré au hasard.
    function createStartingStatGearStock(captain, itemType, prefix) {
      const gear = STAT_GEAR[itemType];
      if (!gear.rows.length) return [];
      const count = rollDice(constant(`company.starting_stock.${prefix}_dice_count`, 1), constant(`company.starting_stock.${prefix}_dice_sides`, 6));
      return Array.from({length:count}, () => ({...statGearItem(captain, itemType, randomChoice(gear.rows)), owner:null}));
    }
    function createStartingBootsStock(captain) { return createStartingStatGearStock(captain, "boots", "boots"); }
    function createStartingBeltStock(captain) { return createStartingStatGearStock(captain, "belt", "belt"); }
    function createStartingAmuletStock(captain) { return createStartingStatGearStock(captain, "amulet", "amulet"); }
    function createStartingCapeStock(captain) { return createStartingStatGearStock(captain, "cape", "cape"); }
    function createStartingGlovesStock(captain) { return createStartingStatGearStock(captain, "gloves", "gloves"); }
    function createStartingPantsStock(captain) { return createStartingStatGearStock(captain, "pants", "pants"); }
    function createStartingRingStock(captain) { return createStartingStatGearStock(captain, "ring", "ring"); }
    function createStartingHelmetStock(captain) { return createStartingStatGearStock(captain, "helmet", "helmet"); }

    // Potions et fioles (Idan, 2026-10-29) : objets de ceinture à usage unique (potions.json), sans tier ni qualité
    // pour l'instant ; elles vont dans les emplacements belt_item_1 à belt_item_4.
    function potionItem(character, template) {
      if (!template) return null;
      return {
        id: makeItemId(character, "belt_item"),
        templateId: `potion:${template.code || normalizeKey(template.nom)}`,
        name: template.nom,
        itemType: "potion",
        slot: null,
        owner: character.id ?? null,
        tier: 1,
        qualityCode: null,
        qualityName: null,
        category: "Potion",
        combatFamily: null,
        grip: null,
        description: template.description || null
      };
    }
    // Stock de départ : 1D6 fioles de chaque sorte, comme les autres objets (Idan, 2026-10-29).
    function createStartingPotionStock(captain) {
      const count = () => rollDice(constant("company.starting_stock.potion_dice_count", 1), constant("company.starting_stock.potion_dice_sides", 6));
      return potionRows.flatMap(template => Array.from({length:count()}, () => ({...potionItem(captain, template), owner:null})));
    }

    // Coffre d'un camp ennemi (doc 17 §8) : un objet à bonus tiré au hasard (bottes, ceinture, amulette, cape, gants,
    // culotte ou bague), tier selon la réputation du personnage donné, sans propriétaire.
    // Objet du coffre d'un camp (Idan, 2026-10-25 : « il faut pouvoir trouver de l'équipement T2 ou T3 à ce stade ») :
    // une famille tirée au hasard (arme, armure, bottes, ceinture, amulette, cape, gants, culotte, bague, casque), puis un
    // objet de cette famille, au tier donné et à sa qualité, sans propriétaire.
    function createChestItem(character, tier) {
      const families = ["weapon", "armor", ...Object.keys(STAT_GEAR).filter(kind => STAT_GEAR[kind].rows.length)];
      const family = randomChoice(families);
      let item;
      if (family === "weapon") {
        const weapon = randomChoice(weaponRows);
        item = weaponItem(character, {weapon:weapon.nom, category:skillByName.get(weapon.nom)?.parent || null}, null);
      } else if (family === "armor") {
        item = armorItem(character, randomChoice([...new Set(baseArmorRows.map(row => row.type_armure).filter(Boolean))]));
      } else {
        item = statGearItem(character, family, randomChoice(STAT_GEAR[family].rows));
      }
      if (!item) return null;
      const quality = qualityForTier(tier);
      return {...item, tier, qualityCode:quality.code || null, qualityName:quality.nom || null, owner:null};
    }

    // Un objet précis, désigné par son type et son nom, à un tier donné et à sa qualité, sans propriétaire (marchands,
    // Idan 2026-10-30). itemType : weapon, armor, potion ou un objet à bonus (boots, belt, amulet…). null s'il est inconnu.
    function createItemByName(itemType, name, tier = 1) {
      const holder = {id:"shop", reputation:0};
      let item = null;
      if (itemType === "weapon") {
        item = weaponItem(holder, {weapon:name, category:skillByName.get(name)?.parent || null}, null);
      } else if (itemType === "armor") {
        const row = baseArmorRows.find(r => r.nom === name);
        item = row ? createItemInstance(holder, {templateId:`armor:${row.code || normalizeKey(row.nom)}`, name:row.nom,
          itemType:"armor", slot:"armor", category:row.type_armure, description:row.description}) : null;
      } else if (itemType === "potion") {
        const row = potionRows.find(r => r.nom === name);
        return row ? {...potionItem(holder, row), owner:null} : null;
      } else if (STAT_GEAR[itemType]) {
        const row = STAT_GEAR[itemType].rows.find(r => r.nom === name);
        item = row ? statGearItem(holder, itemType, row) : null;
      }
      if (!item) return null;
      const quality = qualityForTier(tier);
      return {...item, tier, qualityCode:quality.code || null, qualityName:quality.nom || null, owner:null};
    }

    function createLootItem(character) {
      const kinds = Object.keys(STAT_GEAR).filter(kind => STAT_GEAR[kind].rows.length);
      if (!kinds.length) return null;
      const kind = randomChoice(kinds);
      return {...statGearItem(character, kind, randomChoice(STAT_GEAR[kind].rows)), owner:null};
    }

    function generateStartingEquipment(character) {
      const profile = computeEquipmentProfile(character);
      const slots = Object.fromEntries(equipmentSlotRows.map(slot => [slot.id, null]));
      const items = [];

      let primaryPreference;
      if (profile.type === "melee") primaryPreference = profile.bestMelee;
      else if (profile.type === "ranged") primaryPreference = profile.bestRanged;
      else {
        const options = [profile.bestMelee, profile.bestRanged].filter(Boolean).sort((a,b) => b.score - a.score);
        primaryPreference = options[0] || null;
      }

      const primary = weaponItem(character, primaryPreference, "weapon_set_1_main");
      if (primary) {
        items.push(primary);
        slots.weapon_set_1_main = primary.id;
      }

      const secondaryChance = Number(startingEquipmentGeneration.secondary_weapon_chance);
      if (primary && random() < (Number.isFinite(secondaryChance) ? secondaryChance : 0.5)) {
        const complementary = primary.combatFamily === "ranged" ? profile.bestMelee : profile.bestRanged;
        if (complementary && complementary.score > 1) {
          const secondary = weaponItem(character, complementary, "weapon_set_2_main");
          if (secondary) {
            items.push(secondary);
            slots.weapon_set_2_main = secondary.id;
          }
        }
      }

      const armorClass = highestArmorClass(character.skills);
      const armor = armorItem(character, armorClass);
      if (armor) {
        items.push(armor);
        slots.armor = armor.id;
      }

      // Bottes, ceinture, amulette, cape, gants, culotte, puis bague (Idan, 2026-10-24) : 5 % de chance chacun, d'un type
      // tiré au hasard ; la bague va dans le premier emplacement de bague.
      for (const [itemType, chanceKey] of [["boots","boots_chance"],["belt","belt_chance"],["amulet","amulet_chance"],["cape","cape_chance"],["gloves","gloves_chance"],["pants","pants_chance"],["ring","ring_chance"],["helmet","helmet_chance"]]) {
        const gear = STAT_GEAR[itemType];
        const chance = Number(startingEquipmentGeneration[chanceKey]);
        if (gear.rows.length && random() < (Number.isFinite(chance) ? chance : 0.05)) {
          const item = statGearItem(character, itemType, randomChoice(gear.rows));
          items.push(item);
          slots[gear.slot] = item.id;
        }
      }
      // Une fiole (Idan, 2026-10-29) : 5 % de chance, d'une sorte tirée au hasard, dans le premier emplacement de ceinture.
      const potionChance = Number(startingEquipmentGeneration.potion_chance);
      if (potionRows.length && random() < (Number.isFinite(potionChance) ? potionChance : 0.05)) {
        const potion = {...potionItem(character, randomChoice(potionRows)), slot:"belt_item_1"};
        items.push(potion);
        slots.belt_item_1 = potion.id;
      }

      return {
        profile:{
          type:profile.type,
          scores:profile.scores,
          bestMagic:profile.bestMagic
        },
        armorClass,
        slots,
        items
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

    // Affinité avec le capitaine qui recrute (09 §4 ; Idan, 2026-10-20) : ±20 % au plus, une bonne
    // affinité fait baisser le salaire demandé. Pas de capitaine (capitaine lui-même, ennemis) : facteur 1.
    function salaryAffinityFactor(character, captain) {
      const result = captain && options.affinity ? options.affinity.affinity(captain, character) : null;
      if (!result?.ok) return {affinity: null, factor: 1};
      return {affinity: result.total, factor: 1 - constant("salary.affinity.max_effect", 0.2) * result.total / 100};
    }

    function calcSalary(character, captain = null) {
      const base = Math.max(1, character.reputation / 30);
      const pretensions = 1 + (character.salaryPretension - 35) / 100;
      const intelligence = 1 + 0.25 * Math.pow((character.stats.Intelligence - 100) / 100, 2);
      return Math.round(10 * base * pretensions * intelligence * salaryAffinityFactor(character, captain).factor);
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
        // « draw » : niveau tiré comme pour une ascendance naturelle (mesures du besoin en avatars).
        const drawn = forced && createOptions.forcedAscendanceLevel === "draw" ? rollAncestryLevel() : null;
        ancestry = drawn ? {name: forced, level: drawn.level, levelName: drawn.name} : forced ? {
          name: forced,
          level: Number(createOptions.forcedAscendanceLevel) || 3,
          levelName: ancestryLevels.find(x => x.level === (Number(createOptions.forcedAscendanceLevel) || 3))?.nom || null
        } : {name:null, level:null, levelName:null};
      } else {
        ancestry = chooseAncestry(people, captain);
      }

      validateForcedIdentity({people, culture, origin, ascendance: ancestry.name});

      const alignment = createOptions.forcedAlignment || chooseAlignment(people, culture, captain);
      const identity = {
        people,
        culture,
        origin,
        alignment,
        ascendance: ancestry.name,
        ascendanceLevel: ancestry.level
      };

      const trace = {
        identity: {
          ...identity,
          ascendanceLevelName: ancestry.levelName,
          alignmentPrincipal: alignmentGeneration.culture_overrides?.[culture] || peopleByName.get(people)?.alignement_principal || null,
          alignmentPrincipalSource: alignmentGeneration.culture_overrides?.[culture] ? "culture" : "people",
          alignmentDistribution: alignmentDistributionForPeople(people, culture, captain),
          alignmentCaptainInfluence: captain?.alignment ? {
            alignment: captain.alignment,
            bonusPp: constant("generation.captain.alignment_bonus_pp", 15)
          } : null
        },
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
      const generatedIdentity = createOptions.name ? null : nameGenerator(people, createOptions.id, culture);
      const fullName = createOptions.name || (typeof generatedIdentity === "string" ? generatedIdentity : generatedIdentity?.name) || people;
      const character = {
        id: createOptions.id ?? null,
        name: fullName,
        firstName: createOptions.firstName || (generatedIdentity && typeof generatedIdentity === "object" ? generatedIdentity.firstName : null) || null,
        familyName: createOptions.familyName || (generatedIdentity && typeof generatedIdentity === "object" ? generatedIdentity.familyName : null) || null,
        // Réservoir et sexe du nom tiré, pour le réaccorder au sexe de l'avatar (game-core/names.js).
        naming: (generatedIdentity && typeof generatedIdentity === "object" ? generatedIdentity.naming : null) || null,
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
      applyNoSchoolCompensation(character, trace);
      character.skills = generateRawSkills(character, identity, trace);
      applySkillModifiers(character.skills, identity, trace);
      generateBinaryAptitudes(character.skills, identity, trace);
      character.weaponPreferences = computeWeaponPreferences(character.skills);
      const startingSpells = drawStartingSpells(character);
      character.spells = startingSpells.known;
      trace.spells = startingSpells.draws;

      character.salaryPretension = rollDice(10,6);
      character.pvMax = Math.ceil(3 * (
        character.stats.Constitution
        + 0.2 * character.stats.Endurance
        + 0.1 * character.stats.Volonté
      ));
      character.pv = character.pvMax;
      character.mana = character.stats["Réserve de mana"];
      character.reputation = calcReputation(character);
      const startingEquipment = generateStartingEquipment(character);
      character.equipment = {
        profile: startingEquipment.profile,
        armorClass: startingEquipment.armorClass,
        slots: startingEquipment.slots
      };
      character.items = startingEquipment.items;
      character.salary = calcSalary(character, captain);

      trace.derived = {
        pvMax: {formula: "ceil(3 × (Constitution + 0,2×Endurance + 0,1×Volonté))", value: character.pvMax},
        mana: {formula: "Réserve de mana", value: character.mana},
        salaryPretension: {formula: "10D6", value: character.salaryPretension},
        reputation: {value: character.reputation},
        salary: {
          formula: "round(10 × max(1, Réputation / 30) × FacteurPrétentions × FacteurIntelligence × FacteurAffinité)",
          ...salaryAffinityFactor(character, captain),
          value: character.salary
        },
        weaponPreferences: character.weaponPreferences,
        startingEquipment: {
          profile: character.equipment.profile,
          armorClass: character.equipment.armorClass,
          itemIds: character.items.map(item => item.id)
        }
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
      if (skill.nom === "Pièges") return {status:"derived", rule:`Moyenne(Intelligence, Perception) × Rand(0,8 ; 1,2) × ${String(constant("generation.martial.stat_skill_factor", 0.5)).replace(".", ",")}`};
      if (skill.nom === "Discrétion") return {status:"derived", rule:`Moyenne(Dextérité, Perception, Esquive) × Rand(0,8 ; 1,2) × ${String(constant("generation.martial.stat_skill_factor", 0.5)).replace(".", ",")}`};
      if (skill.nom === "Combat à deux armes") return {status:"derived", rule:"Max arme de mêlée 1 main × Rand(0,8 ; 1,2)"};
      if (skill.nom === "Combat à mains nues") return {status:"derived", rule:`Moyenne(Force, Dextérité) × Rand(0,8 ; 1,2) × ${String(constant("generation.martial.stat_skill_factor", 0.5)).replace(".", ",")}`};
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
      if (skill.niveau === "Aptitude") {
        const configured = binaryAptitudeRows.find(r => r.aptitude === skill.nom);
        if (configured) {
          if (configured.mode === "disabled") {
            return {status:"binary-disabled", reason:configured.reason || "Désactivée pour cette version."};
          }
          if (configured.mode === "automatic" || configured.mode === "probability") {
            return {status:"binary", rule:configured.mode === "automatic" ? "Automatique selon identité" : "Probabilité selon identité/profil"};
          }
          return {status:"binary-pending", reason:"Aptitude binaire sans règle de génération."};
        }
        return {status:"catalog", reason:"Acquisition/effet hors pipeline brut actuel."};
      }
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
        const alignmentDistribution = alignmentDistributionForPeople(p.nom);
        const alignmentProbability = sum(alignmentDistribution.map(x => x.probability));
        if (!p.alignement_principal || !alignmentRows.some(a => a.nom === p.alignement_principal)) {
          issues.push(`Invalid principal alignment for ${p.nom}: ${p.alignement_principal || "missing"}`);
        }
        if (Math.abs(alignmentProbability - 1) > 1e-9) {
          issues.push(`Alignment probability sum for ${p.nom} = ${alignmentProbability}`);
        }
      }
      for (const c of cultureRows) {
        if (!originsForCulture(c.nom).length) issues.push(`No origin for ${c.nom}`);
      }

      const requiredEquipmentSlots = ["armor","weapon_set_1_main","weapon_set_2_main","ring_1","ring_6","belt_item_1","belt_item_4","mount"];
      const equipmentSlotIds = new Set(equipmentSlotRows.map(row => row.id));
      for (const slot of requiredEquipmentSlots) if (!equipmentSlotIds.has(slot)) issues.push(`Missing equipment slot ${slot}`);
      for (const armorClass of ["Vêtement","Légère","Intermédiaire","Lourde"]) {
        if (!baseArmorRows.some(row => row.type_armure === armorClass)) issues.push(`Missing armor class ${armorClass}`);
      }
      for (const anchor of startingEquipmentGeneration.rows || []) {
        const total = Number(anchor.t1) + Number(anchor.t2) + Number(anchor.t3);
        if (Math.abs(total - 1) > 1e-9) issues.push(`Equipment tier probability sum at reputation ${anchor.reputation} = ${total}`);
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
            status: ["generated","derived","binary"].includes(classification.status) ? "active" : "blocked",
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
          generatedCharacteristics: characteristicRows.filter(r => r.genere_a_la_creation === true).length,
          binaryAptitudes: binaryAptitudeRows.length,
          baseArmors: baseArmorRows.length,
          equipmentSlots: equipmentSlotRows.length
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
          .map(x => ({target:x.name,reason:x.reason})),
        binaryPending: skillCoverage
          .filter(x => x.status === "binary-pending")
          .map(x => ({target:x.name,reason:x.reason})),
        binaryDisabled: skillCoverage
          .filter(x => x.status === "binary-disabled")
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
      alignmentDistributionForPeople,
      adjacentAlignments,
      equipmentTierDistribution,
      startingStockWeight,
      createStartingStock,
      createStartingArmorStock,
      createStartingBootsStock,
      createStartingBeltStock,
      createStartingAmuletStock,
      createStartingCapeStock,
      createStartingGlovesStock,
      createStartingPantsStock,
      createStartingRingStock,
      createStartingHelmetStock,
      createStartingPotionStock,
      potionItem,
      createItemByName,
      createLootItem,
      createChestItem,
      people: () => peopleRows.map(r => r.nom),
      alignments: () => alignmentRows.map(r => r.nom),
      ancestries: () => ancestryRows.map(r => r.nom),
      normalizeKey
    };
  }

  return {createGenerator, normalizeKey};
});
