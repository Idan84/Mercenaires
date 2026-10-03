function generateSkills(stats) {
  // V0 : les bonus de compétence de la matrice seront branchés dans la prochaine passe.
  const martial = Object.fromEntries(MARTIAL_SKILLS.map(k => [k, roll(20)]));
  const animal = Object.fromEntries(ANIMAL_SKILLS.map(k => [k, Math.random() < .5 ? 1 : roll(20)]));
  const magicBase = (stats.Intelligence + stats["Puissance magique"] + stats["Réserve de mana"]) / 3;
  const magic = Object.fromEntries(MAGIC_SCHOOLS.map(k => [k, Math.random() < .5 ? Math.max(1, Math.round(magicBase * (.5 + Math.random()))) : 1]));
  const campFactor = 1 + (stats.Charisme + stats.Intelligence) / 100;
  const camp = Object.fromEntries(CAMP_SKILLS.map(k => [k, Math.max(1, Math.round(campFactor * rollDice(6,6)))]));
  const craftFactor = 1 + (stats.Dextérité + stats.Intelligence) / 100;
  const craft = Object.fromEntries(CRAFT_SKILLS.map(k => [k, Math.max(1, Math.round(craftFactor * rollDice(6,6)))]));
  const social = Object.fromEntries(SOCIAL_SKILLS.map(k => [k, rollDice(10,6)]));
  return { martial, animal, magic, camp, craft, physiology: {"Régénération": 0}, social };
}

function calcReputation(character) {
  const values = [];
  values.push(...Object.values(character.stats));
  values.push(...Object.values(character.resistances));
  values.push(...Object.values(character.skills.martial).sort((a,b)=>b-a).slice(0,3));
  values.push(...Object.values(character.skills.magic).sort((a,b)=>b-a).slice(0,3));
  values.push(Math.max(...Object.values(character.skills.craft)));
  values.push(Math.max(...Object.values(character.skills.animal)));
  values.push(Math.max(...Object.values(character.skills.camp)));
  values.push(Math.max(...Object.values(character.skills.physiology)));
  const socialMax = Math.max(...Object.values(character.skills.social));
  values.push(socialMax, socialMax);
  const pool = values.filter(v => v > 0);
  const mean = pool.reduce((a,b)=>a+b,0) / pool.length;
  const max = Math.max(...pool);
  const min = Math.min(...pool);
  const base = mean * (1 + character.stats.Charisme/100) * (1 + max/100) * (1 + min/100);
  character.reputationBreakdown = {mean, max, min, base};
  return base + (character.reputationCareerDelta || 0);
}

function calcSalary(character) {
  const reputationFactor = Math.max(1, character.reputation / 30);
  const pretFactor = 1 + (character.salaryPretension - 35) / 100;
  const intFactor = 1 + .25 * Math.pow((character.stats.Intelligence - 100) / 100, 2);
  return reputationFactor * pretFactor * intFactor;
}

function computeDerived(character) {
  character.pvMax = Math.ceil(3 * (character.stats.Constitution + .2*character.stats.Endurance + .1*character.stats.Volonté));
  character.pv = character.pvMax;
  character.mana = character.stats["Réserve de mana"];
  character.reputationCareerDelta = character.reputationCareerDelta || 0;
  character.reputation = calcReputation(character);
  character.salaryPretension = character.salaryPretension ?? rollDice(10,6);
  character.salary = calcSalary(character);
}

function generateName(people, id) {
  const base = randomChoice(NAME_BANK[people] || ["Mercenaire"]);
  return `${base} ${id}`;
}

function peopleWeights(captain) {
  if (!captain) return {...PEOPLE_PROBABILITIES};
  const result = {};
  for (const [p, prob] of Object.entries(PEOPLE_PROBABILITIES)) {
    result[p] = Math.max(.001, prob + (p === captain.people ? .09 : -.01));
  }
  return result;
}

function chooseCulture(people, captain) {
  const list = CULTURES[people];
  const weights = Object.fromEntries(list.map(c => [c, 1]));
  if (captain && list.includes(captain.culture)) weights[captain.culture] *= 2;
  return weightedChoice(weights);
}

function chooseAscendance(people, captain) {
  if (Math.random() >= .20) return {name: null, level: null};
  const compatible = compatibleAscendances(people);
  const weights = Object.fromEntries(compatible.map(a => [a, 1]));
  if (captain && people === captain.people && captain.ascendance && compatible.includes(captain.ascendance)) {
    weights[captain.ascendance] *= 2;
  }
  return {name: weightedChoice(weights), level: rollAscendanceLevel()};
}

function createCharacter(options = {}) {
  const captain = options.captain !== undefined ? options.captain : game.captain;
  const people = options.forcedPeople || weightedChoice(peopleWeights(captain));
  const culture = options.forcedCulture || chooseCulture(people, captain);
  const origin = options.forcedOrigin || randomChoice(originsForCulture(culture));
  const alignment = options.forcedAlignment || randomChoice(ALIGNMENTS);
  const asc = options.forcedAscendance !== undefined
    ? {name: options.forcedAscendance || null, level: options.forcedAscendance ? (options.forcedAscendanceLevel || 3) : null}
    : chooseAscendance(people, captain);

  const id = game.idCounter++;
  const character = {
    id,
    name: options.name || generateName(people, id),
    role: options.role || "Mercenaire",
    people, culture, origin, alignment,
    ascendance: asc.name, ascendanceLevel: asc.level,
    stats: generateBaseStats(), resistances: generateResistances(),
    reputationCareerDelta: 0
  };

  applyIdentityModifier(character, people, "standard");
  if (asc.name) applyIdentityModifier(character, asc.name, "ascendance", asc.level);
  applyIdentityModifier(character, culture, "standard");
  applyIdentityModifier(character, origin, "standard");

  character.skills = generateSkills(character.stats);
  character.salaryPretension = rollDice(10,6);
  computeDerived(character);
  return character;
}

function createCaptainFromForm() {
  const asc = $("captain-ascendance").value || null;
  return createCharacter({
    name: $("captain-name").value.trim() || "Bob",
    role: "Capitaine",
    forcedPeople: $("captain-people").value,
    forcedCulture: $("captain-culture").value,
    forcedOrigin: $("captain-origin").value,
    forcedAlignment: $("captain-alignment").value,
    forcedAscendance: asc,
    forcedAscendanceLevel: asc ? 3 : null,
    captain: null
  });
}

function rollInitialSquadSize(captain) {
  const hasAsc = !!captain.ascendance;
  switch (captain.people) {
    case "Ogre": return roll(3) + (hasAsc ? 0 : 1);
    case "Elfe": case "Reptilien": case "Homme-bête": return rollDice(2,6) + (hasAsc ? 0 : 3);
    case "Nain": case "Orc": case "Humain": return rollDice(3,6) + (hasAsc ? 0 : 4);
    case "Gnome": case "Gobelin": case "Halfling": return rollDice(4,6) + (hasAsc ? 0 : 6);
    default: return rollDice(2,6)+3;
  }
}

function createInitialSquad(captain) {
  const n = rollInitialSquadSize(captain);
  return Array.from({length:n}, () => createCharacter({captain, forcedPeople: captain.people, forcedCulture: captain.culture, role: "Mercenaire initial"}));
}
