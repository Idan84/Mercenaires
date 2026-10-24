"use strict";

// Intendant, interface (Idan, 2026-10-24) : panneau de l'Intendance, réponses aux propositions, conversation
// (évaluer un candidat), répliques ; carte dans Ma Compagnie, exclu des missions.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createStewardRules} = require("../game-core/steward.js");
const recruit = require("../game-core/recruit-dialogue.js");

const ROOT = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"));
const reference = {formulaConstants:read("formula-constants.json"), stewardDialogue:read("steward-dialogue.json")};

// Répliques : quatre variantes par réponse, toutes différentes.
const copy = reference.stewardDialogue;
for (const kind of ["offer","recall"]) {
  for (const mood of ["accepted","flattered","vexed","neutral"]) assert.equal(copy[kind][mood].length, 4, `${kind} ${mood}`);
  assert.ok(copy[kind].proposal && copy[kind].outcome_accepted && copy[kind].outcome_refused);
}
assert.equal(new Set(["offer","recall"].flatMap(k => ["accepted","flattered","vexed","neutral"].flatMap(m => copy[k][m]))).size, 32);
assert.equal(copy.talk.answers.length, 4);

const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const fmt = value => String(Math.round(Number(value) || 0));
const elements = {};
const $ = id => elements[id] || (elements[id] = {innerHTML:"", textContent:"", showModal(){ this.open = true; }, close(){ this.open = false; }});
const variantPhrase = (list) => list[0];
const merc = (id, name, sex, extra = {}) => ({id, name, firstName:name.split(" ")[0], sex, stats:{Courage:30, Intelligence:80},
  skills:{camp:{Intendance:62}}, history:{missions:0, timesWounded:0, log:[]}, ...extra});
const roster = [merc(1, "Edda Brasfort", "femme"), merc(2, "Osric Holloway", "homme"), merc(3, "Isolde Marlowe", "femme", {stewardOfferDay:4})];
const candidate = {mercenary:merc(9, "Borin Cendremarteau", "homme", {stats:{Force:60}})};
const game = {referenceData:reference, campaign:{day:4, company:{captainId:1, intendantId:null, roster}, tavern:{candidates:[candidate]}}};
let saved = 0, rendered = 0;
const js = fs.readFileSync(path.join(ROOT, "prototype-web/steward-ui.js"), "utf8");
const ui = new Function("game","$","esc","fmt","renderAvatar","variantPhrase","MercenairesSteward","MercenairesRecruitDialogue","saveGame","renderGame",
  "recruitDialogue","adviceStats","tavernCandidate","sheetStatValue",
  js + "\nreturn {renderStewardPanel,offerStewardship,openStewardTalk,stewardTalk,stewardRules:()=>stewardRulesCache,setRules:r=>{stewardRulesCache=r;}};")(
  game, $, esc, fmt, m => `<avatar ${m.id}>`, variantPhrase, {createStewardRules}, recruit, () => saved++, () => rendered++,
  () => ({keeper:{groups:[{groupe:"physique", label:"Physique"}]}}), () => ["Force"],
  id => game.campaign.tavern.candidates.find(c => c.mercenary.id === id), (m, stat) => m.stats[stat]);

// Sans intendant : proposer le poste, sauf au capitaine ; un mercenaire déjà sollicité aujourd'hui est grisé.
ui.renderStewardPanel();
const none = elements["steward-panel"].innerHTML;
assert.match(none, /<small>Pas d’intendant<\/small>/);
assert.match(none, /<summary>Proposer le poste à…<\/summary>/);
assert.doesNotMatch(none, /data-steward-offer="1"/, "jamais le capitaine");
assert.match(none, /data-steward-offer="2">/);
assert.match(none, /data-steward-offer="3" disabled>[\s\S]*déjà sollicité aujourd’hui/);
assert.doesNotMatch(none, /data-character-id/, "proposer n'ouvre pas la fiche");

// Refus (dé à 100) : la réponse s'affiche, rien ne change de poste.
ui.setRules(createStewardRules({reference, random:() => 0.999}));
ui.offerStewardship("2");
assert.equal(game.campaign.company.intendantId, null);
assert.match(elements["deal-talk-log"].innerHTML, /J’ai besoin de quelqu’un pour tenir l’Intendance/);
assert.match(elements["deal-talk-log"].innerHTML, new RegExp(copy.offer.flattered[0].replace(/[?…]/g, ".")), "le malin, flatté");
assert.match(elements["deal-talk-log"].innerHTML, /Osric reste sur le terrain\./);
assert.equal(elements["deal-talk-dialog"].open, true);
assert.deepEqual([saved, rendered], [1, 1]);

// Accord (dé à 1) : elle devient l'intendante.
game.campaign.day = 5;
ui.setRules(createStewardRules({reference, random:() => 0}));
ui.offerStewardship("3");
assert.equal(game.campaign.company.intendantId, 3);
assert.match(elements["deal-talk-log"].innerHTML, /Isolde devient l’intendante de la compagnie\./);
ui.renderStewardPanel();
const panel = elements["steward-panel"].innerHTML;
assert.match(panel, /<small>L’intendante<\/small>/);
assert.match(panel, /<strong>Isolde Marlowe<\/strong>/);
assert.match(panel, /Intendance 62 · Nommée aujourd’hui/);
assert.match(panel, /data-character-id="3"/, "son portrait ouvre sa fiche");
game.campaign.day = 8;
ui.renderStewardPanel();
assert.match(elements["steward-panel"].innerHTML, /En poste depuis 3 jours/);

// Lui parler : évaluer un candidat (chiffre, figé), revenir.
ui.openStewardTalk();
assert.equal(elements["steward-talk-dialog"].open, true);
assert.match(elements["steward-talk-options"].innerHTML, /data-steward-choice="evaluate">Que pensez-vous des candidats de la Taverne \?/);
ui.stewardTalk("evaluate");
assert.match(elements["steward-talk-line"].textContent, /Lequel \?/);
assert.match(elements["steward-talk-options"].innerHTML, /data-steward-choice="who" data-arg="9">Borin/);
ui.stewardTalk("who", "9");
ui.stewardTalk("group", "physique");
ui.stewardTalk("stat", "Force");
assert.match(elements["steward-talk-line"].textContent, /Borin \? Je dirais \d+ en Force\./);
assert.ok(Number.isFinite(candidate.stewardEstimates.Force), "estimation figée sur le candidat");
ui.stewardTalk("stat", "Force");
assert.match(elements["steward-talk-line"].textContent, /Comme je vous l’ai dit : \d+ en Force\./);

// Dortoir plein (Idan, 2026-10-24) : il ne peut pas revenir, et le dit.
ui.setRules(createStewardRules({reference, random:() => 0, dormitory:{free:() => 0, places:() => 1}}));
ui.stewardTalk("recall");
assert.equal(game.campaign.company.intendantId, 3);
assert.match(elements["steward-talk-line"].textContent, /où voulez-vous que je dorme, capitaine.+Le dortoir est plein\./);
ui.setRules(createStewardRules({reference, random:() => 0}));

// Revenir sur le terrain : accord (dé à 1), la compagnie n'a plus d'intendant.
ui.stewardTalk("recall");
assert.equal(game.campaign.company.intendantId, null);
assert.equal(elements["steward-talk-dialog"].open, false);
assert.match(elements["deal-talk-log"].innerHTML, /Isolde retourne sur le terrain : la compagnie n’a plus d’intendant\./);

// Ma Compagnie et les missions (ui.js, mission.js).
const ui2 = fs.readFileSync(path.join(ROOT, "prototype-web/ui.js"), "utf8");
assert.match(ui2, /\$\("captain-summary"\)\.innerHTML = characterRow\(game\.captain, true\) \+ \(steward \? characterRow\(steward\) : ""\)/);
assert.match(ui2, /filter\(c=>c!==game\.captain&&c\.id!==game\.campaign\?\.company\.intendantId\)/);
assert.match(fs.readFileSync(path.join(ROOT, "prototype-web/mission.js"), "utf8"), /allCharacters\(\)\.filter\(c=>\(!game\.campaign\|\|c\.id!==game\.campaign\.company\.intendantId\)&&!away\(c\)\)/);
console.log("Intendant, interface : panneau, proposer, répondre, évaluer, revenir, Ma Compagnie, missions — OK");
