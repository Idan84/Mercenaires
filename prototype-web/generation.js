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

// Depuis la création du capitaine (intro-ui.js), le prénom, le nom de famille et les réponses aux questions de
// personnalité (arme favorite, tenue, esprit, caractère : game-core/creation.js) accompagnent le formulaire.
function createCaptainFromForm() {
  const ascendance = $("captain-ascendance").value || null;
  const id = nextCharacterId();
  const created = typeof captainCreation !== "undefined" ? captainCreation.result : null;
  return ensureGenerator().createCaptain({
    id,
    name: $("captain-name").value.trim() || "Bob",
    firstName: created?.prenom || null,
    familyName: created?.nom || null,
    captainChoices: created ? MercenairesCreation.captainChoices(game.referenceData?.captainCreationCopy, created.reponses) : null,
    role: "Capitaine",
    forcedPeople: $("captain-people").value,
    forcedCulture: $("captain-culture").value,
    forcedOrigin: $("captain-origin").value,
    forcedAlignment: $("captain-alignment").value,
    forcedAscendance: ascendance,
    forcedAscendanceLevel: ascendance ? 3 : null
  });
}

// Le générateur tire l'escouade et applique le garde-fou des domaines (1 Mage, 1 Distance, 1 CAC ; doc 02).
function createInitialSquad(captain) {
  return ensureGenerator().createInitialSquad(captain, {role: "Mercenaire initial", nextId: () => nextCharacterId()});
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
