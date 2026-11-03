"use strict";

// Historique du mercenaire (Idan, 2026-10-24) : compteurs cumulés et journal, tenus par la campagne (création,
// recrutement, fin de mission, échanges d'équipement) et racontés dans l'onglet Historique de la fiche.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const History = require("../game-core/history.js");
const P = require("../game-core/progression.js");
const {createGenerator} = require("../game-core/mercenary-generator.js");
const {createMissionEndRules} = require("../game-core/mission-end.js");
const {createTavernRules} = require("../game-core/tavern.js");
const {createCampaignRules} = require("../game-core/campaign.js");
const {createEquipmentDeals} = require("../game-core/equipment-deals.js");
const recruit = require("../game-core/recruit-dialogue.js");

const ROOT = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"));
const files = {peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",baseArmors:"base-armors.json",itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json",characterSheetCopy:"character-sheet-copy.json",itemTitles:"item-titles.json",campCalendar:"camp-calendar.json"};
const reference = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));

// Module : compteurs à zéro, journal de faits, jours dans la compagnie.
const lone = {};
History.recordMission(lone, 4, {progress:{...P.emptyLog(), knockouts:2, woundsTaken:3, criticalSuccesses:1}, wounded:true, days:5});
assert.deepEqual(lone.history, {since:1, log:[{day:4, kind:"mission", knockouts:2, wounded:true, days:5}],
  missions:1, knockouts:2, timesWounded:1, woundsTaken:3, criticals:1, stewardDays:0, medicDays:0, directorDays:0,
  doctoreDays:0, veteranDays:0, bladeMasterDays:0, alchemistDays:0});
assert.equal(History.daysInCompany({history:{since:3}}, 10), 7);
assert.equal(History.daysInCompany({contract:{signedDay:2}}, 2), 0, "le jour de l'arrivée : 0 jour");

// Campagne : le capitaine fonde la compagnie, l'escouade de départ l'accompagne.
const generator = createGenerator(reference, {nameGenerator:(people, id) => `${people} ${id}`});
const progression = P.createProgressionRules({reference});
const campaign = createCampaignRules({generator, tavern:createTavernRules({reference, random:() => 0.999}), reference, progression});
const captain = generator.createCaptain({id:10});
const state = campaign.createCampaign({captain, squad:[11, 12].map(id => generator.createMercenary({id, captain}))});
const [m1, m2] = state.company.roster.filter(m => m.id !== captain.id);
assert.deepEqual(captain.history.log, [{day:1, kind:"founded"}]);
assert.deepEqual(m1.history.log, [{day:1, kind:"joined", initial:true}]);
assert.equal(m1.history.since, 1);

// Fin de mission : une mission de plus, les adversaires abattus, la blessure ; les morts quittent la compagnie.
const endRules = createMissionEndRules({reference, random:() => 0});
const participant = (m, hp, progress) => ({id:m.id, name:m.name, hp, pvMax:m.pvMax, damageTaken:0, stats:m.stats, progress});
state.day = 3;
campaign.applyMissionAftermath(state, endRules.resolveMissionEnd([
  participant(m1, m1.pvMax, {...P.emptyLog(), knockouts:2, woundsTaken:1, criticalSuccesses:1})
]));
assert.deepEqual([m1.history.missions, m1.history.knockouts, m1.history.woundsTaken, m1.history.criticals], [1, 2, 1, 1]);
const back = m1.history.log.at(-1);
assert.deepEqual([back.day, back.kind, back.knockouts], [3, "mission", 2]);
assert.equal(back.wounded, m1.recovery.kind === "wounded");
assert.equal(back.days, m1.recovery.daysLeft);
assert.equal(m2.history.missions, 0, "absent de la mission");

// Échange d'équipement : la proposition entre dans le journal, acceptée ou refusée.
const deals = createEquipmentDeals({reference, random:() => 0, affinityRules:{memberAffinity:() => ({total:0})}});
state.company.stock.push({id:"gift", name:"Bottes de vitesse", tier:2, itemType:"boots", owner:null, slot:null});
state.day = 4;
assert.equal(deals.propose(state, {mercenaryId:m2.id, slot:"boots", stockItemId:"gift"}).accepted, true);
assert.deepEqual(m2.history.log.at(-1), {day:4, kind:"deal", action:"donner", accepted:true, free:false,
  given:null, received:{name:"Bottes de vitesse", tier:2}});

// Ancienne partie sans historique : chacun reçoit le sien, à partir de son contrat.
delete m2.history;
delete captain.history;
m2.contract.signedDay = 2;
assert.equal(campaign.ensureHistories(state), true);
assert.deepEqual(m2.history.log, [{day:2, kind:"joined", initial:true}]);
assert.deepEqual(captain.history.log, [{day:1, kind:"founded"}]);
assert.equal(campaign.ensureHistories(state), false);

// Onglet Historique : compteurs et journal racontés, du plus récent au plus ancien.
const ui = fs.readFileSync(path.join(ROOT, "prototype-web/ui.js"), "utf8");
const from = ui.indexOf("function historyItemLabel"), to = ui.indexOf("function renderHistoryTab");
const end = ui.indexOf("\n}\n", to) + 3;
const calendar = fs.readFileSync(path.join(ROOT, "prototype-web/camp-calendar.js"), "utf8");
const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const fmt = value => String(Math.round(Number(value) || 0));
const {createItemCards} = require("../game-core/item-card.js");
const cards = createItemCards({reference});
const game = {referenceData:reference, campaign:{day:10}};
const render = new Function("game","esc","fmt","itemCardRules","MercenairesRecruitDialogue","MercenairesHistory",
  calendar.slice(0, calendar.indexOf("// Petit calendrier")) + ui.slice(from, end) + "\nreturn {renderHistoryTab,historyEntryText};")(
  game, esc, fmt, () => cards, recruit, History);
const hero = {sex:"femme", history:{since:2, missions:3, knockouts:5, timesWounded:1, woundsTaken:4, criticals:2, log:[
  {day:2, kind:"joined", initial:false},
  {day:6, kind:"mission", knockouts:1, wounded:false, days:2},
  {day:8, kind:"mission", knockouts:0, wounded:true, days:6},
  {day:9, kind:"deal", action:"troquer", accepted:false, free:false, given:{name:"Lance", tier:1}, received:{name:"Lance", tier:3}}]}};
const tab = render.renderHistoryTab(hero);
assert.match(tab, /<strong>8<\/strong><small>Jours dans la compagnie<\/small>/);
assert.match(tab, /<strong>5<\/strong><small>Adversaires abattus<\/small>/);
assert.match(tab, /<strong>1<\/strong><small>Retours de mission blessé<\/small>/);
const texts = [...tab.matchAll(/<span>([^<]+)<\/span><\/li>/g)].map(m => m[1]);
assert.deepEqual(texts, [
  "Refuse d’échanger Vieille lance contre Lance de guerrier.",
  "Revient de mission. Blessée : 6 jours de convalescence.",
  "Revient de mission après avoir abattu 1 adversaire.",
  "Signe son contrat avec la compagnie."
], "du plus récent au plus ancien, accordé au féminin");
assert.match(tab, /<time>Jour 9 · [^<]+<\/time>/, "date du calendrier du camp");
assert.match(render.renderHistoryTab({history:{log:[]}}), /Rien à raconter pour l’instant\./);
// Intendant (Idan, 2026-10-24) : nomination, refus, retour sur le terrain ; jours d'intendance montrés s'il y en a.
assert.equal(render.historyEntryText({sex:"femme"}, {kind:"steward", accepted:true}), "Devient l’intendante de la compagnie.");
assert.equal(render.historyEntryText({}, {kind:"steward", accepted:false}), "Refuse le poste d’intendant.");
assert.equal(render.historyEntryText({}, {kind:"recall", accepted:true, days:12}), "Quitte l’Intendance et retourne sur le terrain après 12 jours.");
assert.doesNotMatch(tab, /Jours d’intendance/, "pas de case à zéro");
assert.match(render.renderHistoryTab({history:{stewardDays:12, log:[]}}), /<strong>12<\/strong><small>Jours d’intendance<\/small>/);
assert.equal(render.historyEntryText({}, {kind:"deal", action:"donner", free:true, received:{name:"Lance", tier:2}}),
  "Prend Lance basique à l’Intendance.", "le capitaine s'équipe lui-même");
console.log("Historique : compteurs, journal (création, recrutement, mission, échanges), migration, onglet — OK");
