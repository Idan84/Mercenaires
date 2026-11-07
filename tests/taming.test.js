"use strict";

// Apprivoiser une monture à la Grange du dresseur (Idan, 2026-11-07 : « il doit chaque jour tenter de réussir un jet en
// fonction de 5 caracs ( intelligence/ charisme/ intimidation/ animal/ animal spécifique) Le dresseur offre un bonus. Sauf
// qu'en plus, il y a un second test à faire : les montures/ compagnons ont un alignement et une tolérance à l'écart
// d'alignement » ; « faudrait que ce facteur soit pondéré par la volonté et l'intelligence de l'animal […] Un orc a
// statistiquement très peu de chances de monter sur une licorne, mais c'est pas impossible au sens propre.. peut-être 1 pour
// 1000 ? » ; « la grange du dresseur et y nommer un mercenaire maître ») : l'écart d'alignement, les deux tests, le bonus du
// Dresseur, l'entrée le lendemain, l'apprivoisement (il peut l'équiper), l'XP du Dresseur, l'historique, le Cachot.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const {createTavernRules} = require("../game-core/tavern.js");
const {createCampaignRules} = require("../game-core/campaign.js");
const {createProgressionRules} = require("../game-core/progression.js");
const {createEquipmentDeals} = require("../game-core/equipment-deals.js");
const Taming = require("../game-core/taming.js");
const Posts = require("../game-core/camp-posts.js");

const ROOT = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const source = read("prototype-web/reference-data.js");
const block = source.slice(source.indexOf("REFERENCE_FILES"), source.indexOf("};", source.indexOf("REFERENCE_FILES")));
const files = Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m => [m[1], m[2]]));
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(read(path.join("data", "reference", file)))]));
const constant = code => reference.formulaConstants.rows.find(r => r.code === code)?.valeur;
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

// 1. Les constantes, l'écart d'alignement (crans Loyal–Chaotique + crans Bon–Mauvais).
assert.deepEqual(["taming.daily.center", "taming.daily.slope", "taming.trainer.divisor"].map(constant), [60, 10, 20]);
assert.equal(reference.formulaConstants.row_count, reference.formulaConstants.rows.length);
const gap = Taming.alignmentGap;
assert.deepEqual([gap("Loyal bon", "Loyal bon"), gap("Neutre bon", "Loyal bon"), gap("Neutre", "Loyal bon"),
  gap("Chaotique neutre", "Loyal bon"), gap("Chaotique mauvais", "Loyal bon"), gap("Loyal mauvais", "Neutre")], [0, 1, 2, 3, 4, 2]);

// 2. La campagne : la Grange, deux montures, un élève et un Dresseur.
let seed = 29, dice = [];
const genRandom = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const generator = createGenerator(reference, {random: genRandom, nameGenerator: (people, id) => people + " " + id});
const rules = createCampaignRules({generator, tavern: createTavernRules({random: () => 0.999, reference}), reference,
  progression: createProgressionRules({reference}), random: () => dice.length ? dice.shift() : 0.999});
const taming = rules.tamingRules;
assert.ok(taming, "l'apprivoisement est branché");
const captain = generator.createCaptain({id: 1});
const state = rules.createCampaign({captain, squad: [2, 3, 4, 5].map(id => generator.createMercenary({id, captain}))});
const [, student, trainer, ogre, other] = state.company.roster;
state.company.intendantId = null;
const give = (m, name) => { const item = generator.createItemByName("mount", name); item.owner = m.id; m.items.push(item); return item; };
const horse = give(student, "Destrier"), unicorn = give(student, "Licorne");
const setSkills = (m, value) => {
  Object.assign(m.stats, {Intelligence: value, Charisme: value});
  m.skills.social = {...m.skills.social, Intimidation: value};
  m.skills.animal = {...m.skills.animal, "Compagnon animal": value, "Équidés": value};
};
setSkills(student, 50);
student.people = "Humain";
student.alignment = "Chaotique mauvais";

assert.equal(taming.canTame(state, student, horse.id).reason, "Il faut d’abord construire la Grange du dresseur.");
state.company.camp.buildings = {trainer_barn: {level: 1, construction: null}, trainer_stables: {level: 2, construction: null}};
assert.equal(taming.canTame(state, student, horse.id).ok, true);
assert.equal(taming.canTame(state, other, horse.id).reason, "Cette monture n’est pas à lui.");
ogre.people = "Ogre";
const ogreHorse = give(ogre, "Destrier");
assert.equal(taming.canTame(state, ogre, ogreHorse.id).reason, "Il est trop grand pour la monter.", "un ogre ne monte pas un cheval");

// 3. Les deux tests du jour. X = moyenne des 5 (+ le Dresseur) ; chance = 100 / (1 + e^(−(X − 60) / 10)).
let odds = taming.dailyChance(state, {studentId: student.id, mountId: horse.id});
assert.deepEqual([odds.own, odds.trainerBonus, odds.x, odds.gap, odds.stubborn], [50, 0, 50, 2, 20],
  "le destrier, neutre, peu têtu (Intelligence 10, Volonté 30)");
close(odds.skill, 100 / (1 + Math.exp(1)));
close(odds.alignment, 64, 1e-9);
assert.equal(Math.round(odds.chance), 17, "plus de tolérance (Idan, 2026-11-07 : « On supprime la tolérance ») : 27 % × 64 %");
// Le Dresseur : (Compagnon animal + Intelligence + Charisme + Intimidation) ÷ 20.
state.company.trainerId = trainer.id;
setSkills(trainer, 50);
odds = taming.dailyChance(state, {studentId: student.id, mountId: horse.id});
assert.deepEqual([odds.trainerBonus, odds.x, odds.skill], [10, 60, 50], "avec le Dresseur : 50 %");
state.company.trainerId = student.id;
assert.equal(taming.dailyChance(state, {studentId: student.id, mountId: horse.id}).trainerBonus, 0, "pas son propre Dresseur");
state.company.trainerId = trainer.id;
// La licorne : loyale bonne, entêtement (Intelligence + Volonté) / 2 = 82,5.
odds = taming.dailyChance(state, {studentId: student.id, mountId: unicorn.id});
assert.deepEqual([odds.gap, odds.stubborn], [4, 82.5]);
close(odds.alignment, 100 * 0.175 ** 4);
assert.ok(odds.alignment > 0.05 && odds.alignment < 0.15, "chaotique mauvais : environ 1 pour 1000");
student.alignment = "Neutre bon";
close(taming.dailyChance(state, {studentId: student.id, mountId: unicorn.id}).alignment, 17.5, 1e-9);
student.alignment = "Loyal bon";
assert.equal(taming.dailyChance(state, {studentId: student.id, mountId: unicorn.id}).alignment, 100);
student.alignment = "Chaotique mauvais";

// 4. Au jour J, on organise J+1 : il entre le lendemain matin ; on peut annuler d'ici là.
const day0 = state.day;
let started = taming.start(state, student.id, horse.id);
assert.equal(started.ok, true);
assert.deepEqual([started.taming.status, started.taming.startDay], ["planned", day0 + 1]);
assert.equal(taming.busyReason(state, student.id), "Il entre à la Grange du dresseur demain matin.");
assert.equal(rules.agenda.reason(state, student.id), "Il entre à la Grange du dresseur demain matin.", "l'agenda le retient");
assert.equal(taming.canTame(state, student, unicorn.id).reason, "Il entre à la Grange du dresseur demain matin.", "une à la fois");
const cancelled = taming.stop(state, started.taming.id);
assert.deepEqual([cancelled.ok, cancelled.cancelled], [true, true]);
assert.equal(taming.tamingsOf(state).length, 0);
started = taming.start(state, student.id, horse.id);

// Le lendemain : il entre (pas de test ce matin-là).
let [report] = rules.advanceTime(state, 1);
assert.deepEqual(report.taming.started.map(s => s.mercenary.id), [student.id]);
assert.deepEqual([report.taming.tested.length, taming.tamingOf(state, student.id).status], [0, "active"]);
assert.equal(taming.busyReason(state, student.id), "Il apprivoise sa monture à la Grange du dresseur.");
assert.deepEqual(student.history.log.filter(e => e.kind === "taming").map(e => e.mount), ["Destrier"]);
// Premier test, raté ; le Dresseur gagne 5 XP de Transmission du savoir par élève.
const transmission = Number(trainer.skills.camp["Transmission du savoir"]);
[report] = rules.advanceTime(state, 1);
assert.deepEqual(report.taming.tested.map(t => [t.studentId, t.success]), [[student.id, false]]);
assert.equal(report.taming.masterXp, 10);
assert.ok(trainer.skills.camp["Transmission du savoir"] > transmission, "XP de Transmission");
assert.equal(horse.tamedBy, undefined);
// Réussi : il l'a apprivoisée et peut l'équiper (emplacement Monture).
const deals = createEquipmentDeals({reference, random: () => 0, affinityRules: {memberAffinity: () => ({total: 0})}});
assert.equal(deals.slotAccepts(student, "mount", horse).ok, false, "pas encore");
dice = [0, 0];
[report] = rules.advanceTime(state, 1);
assert.deepEqual(report.taming.tamed.map(t => [t.mercenary.id, t.mount.id, t.days]), [[student.id, horse.id, 2]]);
assert.equal(horse.tamedBy, student.id);
assert.equal(taming.tamingOf(state, student.id), null, "il sort de la Grange");
assert.deepEqual(student.history.log.filter(e => e.kind === "taming_done").map(e => e.days), [2]);
assert.equal(taming.canTame(state, student, horse.id).reason, "Il l’a déjà apprivoisée.");
assert.equal(deals.slotAccepts(student, "mount", horse).ok, true);
const placed = deals.rearrange(state, {mercenaryId: student.id, itemId: horse.id, slot: "mount"});
assert.equal(placed.ok, true, placed.reason);
assert.equal(student.equipment.slots.mount, horse.id, "il la monte");
assert.equal(deals.slotAccepts(other, "mount", horse).ok, false, "chaque monture s'apprivoise par son cavalier");

// 5. Le faire sortir : rien n'est acquis ; la monture qui n'est plus à lui ; le Cachot.
taming.start(state, student.id, unicorn.id);
rules.advanceTime(state, 1);
const active = taming.tamingOf(state, student.id);
assert.equal(active.status, "active");
assert.equal(taming.stop(state, active.id).cancelled, false);
assert.deepEqual(student.history.log.filter(e => e.kind === "taming_stopped").map(e => e.mount), ["Licorne"]);
assert.equal(unicorn.tamedBy, undefined);
taming.start(state, student.id, unicorn.id);
rules.advanceTime(state, 1);
student.items = student.items.filter(i => i !== unicorn);
[report] = rules.advanceTime(state, 1);
assert.deepEqual(report.taming.dropped.map(d => d.mercenary.id), [student.id], "la monture n'est plus à lui");
assert.equal(taming.tamingsOf(state).length, 0);
student.items.push(unicorn);
state.company.camp.buildings.dungeon = {level: 1, construction: null};
taming.start(state, student.id, unicorn.id);
const jailed = rules.dungeonRules.jail(state, student.id);
assert.equal(jailed.ok, true, jailed.reason);
assert.ok(jailed.left.includes("taming"), "au Cachot, il quitte la Grange");
assert.equal(taming.tamingsOf(state).length, 0);

// 6. Le Dresseur : un poste à la Grange ; ses répliques, son compteur, ses lignes d'historique.
const post = Posts.postByKey("trainer");
assert.deepEqual([post.building, post.noun, post.skill], ["trainer_barn", "Dresseur", "Compagnon animal"]);
const master = reference.campMastersDialogue.masters.trainer;
for (const mood of ["accepted", "flattered", "vexed"]) assert.ok(master.offer[mood].length >= 3, mood);
const sheet = reference.characterSheetCopy.history;
assert.ok(sheet.counters.some(c => c.key === "trainerDays" && c.hideZero));
for (const key of ["trainer", "trainer_recall"]) assert.ok(sheet.events[key].accord && sheet.events[key].refus, key);
for (const key of ["taming", "taming_done", "taming_stopped"]) assert.match(sheet.events[key], /\{monture\}/, key);
assert.match(read("game-core/history.js"), /"trainerDays"/);

// 7. L'interface : le module chargé, les boutons aux Écuries, le journal du matin, le statut, le panneau du Dresseur.
const html = read("prototype-web/index.html");
assert.ok(html.indexOf("/core/taming.js") > 0 && html.indexOf("/core/taming.js") < html.indexOf("/core/campaign.js"));
assert.match(html, /<div id="trainer-panel" class="steward-panel director-panel"><\/div>/);
assert.match(read("prototype-web/school-director-ui.js"), /trainer:"trainer-panel"/);
assert.match(read("prototype-web/tavern-ui.js"), /logTaming\(report\.taming\)/);
assert.match(read("prototype-web/ui.js"), /\{kind:"steward",label:"Apprivoise sa monture"\}/);
const fmt = value => String(Math.round(Number(value) || 0));
const esc = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const lines = [];
const ui = new Function("game", "campaignRules", "fmt", "esc", "tavernLog", "saveGame", "renderGame",
  read("prototype-web/stable-ui.js") + "\nreturn {stableHtml,logTaming,startTaming};")(
  {campaign: state, referenceData: reference}, () => rules, fmt, esc, (text, kind) => lines.push([text, kind]), () => {}, () => {});
assert.equal(rules.dungeonRules.release(state, student.id).ok, true);
let shown = ui.stableHtml(state);
assert.match(shown, new RegExp(`data-taming-start="${unicorn.id}"[^>]*title="Chaque jour : [^"]+"[^>]*>Apprivoiser</button>`));
assert.doesNotMatch(shown, new RegExp(`data-taming-start="${horse.id}"`), "déjà apprivoisée");
ui.startTaming(unicorn.id);
assert.deepEqual(lines.pop(), [`${student.name} entre demain matin à la Grange du dresseur pour apprivoiser sa licorne.`, "turn"]);
shown = ui.stableHtml(state);
assert.match(shown, /Entre à la Grange demain matin/);
assert.match(shown, /data-taming-stop="[^"]+">Annuler<\/button>/);
ui.logTaming({started: [], tamed: [{mercenary: student, mount: horse, days: 3}]});
assert.deepEqual(lines.pop(), [`${student.name} a apprivoisé son destrier (3 jours) : il peut le monter.`, "gear"]);

console.log("Apprivoiser : 5 caractéristiques + le Dresseur, l'alignement pondéré par l'entêtement (licorne : ~1 pour 1000 pour un chaotique mauvais), J+1, l'équiper, l'XP du Dresseur, l'historique, le Cachot — OK");
