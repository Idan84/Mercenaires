"use strict";

async function initializeGenerator() {
  const reference = await loadReferenceData();
  game.referenceData = reference;
  game.nameRules = MercenairesNames.createNameRules({ reference });
  game.generator = MercenairesCore.createGenerator(reference, {
    nameGenerator: (people, id, culture) => game.nameRules.generate({ people, culture }),
    affinity: MercenairesAffinity.createAffinityRules({ reference })
  });
  game.audit = game.generator.auditReferenceData();
  return game.generator;
}

function ensureGenerator() {
  if (!game.generator) throw new Error("Le moteur de génération n’est pas initialisé.");
  return game.generator;
}

function createCharacter(options = {}) {
  const id = options.id ?? nextCharacterId();
  return ensureGenerator().createMercenary({...options, id});
}

function createCaptainFromForm() {
  const ascendance = $("captain-ascendance").value || null;
  const id = nextCharacterId();
  return ensureGenerator().createCaptain({
    id,
    name: $("captain-name").value.trim() || "Bob",
    role: "Capitaine",
    forcedPeople: $("captain-people").value,
    forcedCulture: $("captain-culture").value,
    forcedOrigin: $("captain-origin").value,
    forcedAlignment: $("captain-alignment").value,
    forcedAscendance: ascendance,
    forcedAscendanceLevel: ascendance ? 3 : null
  });
}

function createInitialSquad(captain) {
  const count = ensureGenerator().rollInitialSquadSize(captain);
  return Array.from({length: count}, () => createCharacter({
    captain,
    forcedPeople: captain.people,
    forcedCulture: captain.culture,
    role: "Mercenaire initial"
  }));
}

function compatibleAscendances(people) {
  return ensureGenerator().compatibleAncestries(people).map(x => x.name);
}

function culturesForPeople(people) {
  return ensureGenerator().culturesForPeople(people);
}

function originsForCulture(culture) {
  return ensureGenerator().originsForCulture(culture);
}

function peopleNames() {
  return ensureGenerator().people();
}

function alignmentNames() {
  return ensureGenerator().alignments();
}
