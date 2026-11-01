"use strict";

// Tableau des missions de la Taverne (Idan, 2026-10-31) : une carte par mission au même gabarit (illustration ou emblème,
// type, titre, description, difficulté en étoiles, récompense, durée) ; au clic, le détail (faits, lettre, action).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "prototype-web/contract-ui.js"), "utf8");
const html = fs.readFileSync(path.join(root, "prototype-web/index.html"), "utf8");
const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const nodes = {};
const node = id => nodes[id] || (nodes[id] = {innerHTML:"", open:false, showModal(){ this.open = true; }, close(){ this.open = false; }});
const contract = {id:"c1", code:"cleanup", name:"Faire le ménage", campName:"Camp gobelin", faction:"Gobelins", difficulty:1, distance:2,
  reward:6800, day:1, expiresDay:5, order:"village", fields:{lieu:"Brumecendre", estimation:"une petite dizaine"}};
const guard = {id:"g1", kind:"bodyguard", client:"Une veuve fortunée", count:2, days:8, level:3, payment:1520, expiresDay:4};
// Taverne à 5 missions (Idan, 2026-11-01) : des cases, chacune une offre ou vide jusqu'au lendemain.
const slots = [{offer:contract}, {offer:guard}, {offer:null, emptyUntil:2}];
const game = {campaign:{day:1, tavernBoard:{slots}, expeditions:[], company:{roster:[]}},
  referenceData:{oneShotMissions:{missions:[{code:"cleanup", description:"Attaquer un camp ennemi.", illustration:""}]},
    bodyguardMissions:{illustration:"assets/missions/garde.webp", textes:{titre:"Garde du corps", offre:"{client} cherche {n} garde{s} du corps pour {jours} jours."}}}};
const listeners = {}, selections = [];
const fakeDocument = {addEventListener:(type, fn) => { listeners[type] = fn; }};
const ui = new Function("game","$","esc","fmt","saveGame","campaignRules","starRules","renderStarLevel","campaignCalendarDate",
  "MercenairesMissions","MercenairesRecruitDialogue","openMissionSelection","renderAvatar","document","startExpeditionCombat",
  js + "\nreturn {missionCards,renderContractBoard,openMissionDetail,initializeExpeditionUi};")(
  game, node, esc, String, () => {}, () => ({fillTavernBoard:() => false, tavernSlots:c => c.tavernBoard.slots, boardOffer:(c, {id}) => c.tavernBoard.slots.find(x => x.offer?.id === id)?.offer || null}),
  () => ({byLevel:level => ({level})}), info => `<stars ${info.level}>`, day => ({dayOfMonth:day, month:"Brumecendre", year:842}),
  {createMissionRules:() => ({orderText:() => ({from:"Chef de village", paragraphs:["À toute compagnie…"], signature:"Hugon"})})},
  {fill:(text, vars) => text.replace(/\{(\w+)\}/g, (all, key) => key in vars ? vars[key] : all)}, offer => selections.push(offer), () => "",
  fakeDocument, () => {});
// Un clic sur un élément qui porte ce sélecteur (closest ne répond qu'à lui).
const clickOn = (attr, dataset = {}) => listeners.click({target:{closest:selector => selector.split(",").includes(attr) ? {dataset} : null}});

const cards = ui.missionCards();
assert.deepEqual(cards.map(c => [c.kind, c.type, c.title]),
  [["contract","Faire le ménage","Camp gobelin de Brumecendre"],["bodyguard","Garde du corps","Une veuve fortunée"],["empty",undefined,undefined]]);
for (const c of cards.filter(c => c.kind !== "empty")) for (const key of ["illustration","description","difficulty","reward","duration","facts","action"]) assert.ok(key in c, c.kind + " : " + key);
assert.equal(cards[0].difficulty.level, 1, "la difficulté de la mission, en étoiles");
assert.equal(cards[1].difficulty.label, "Réputation minimale");

ui.renderContractBoard();
const board = node("tavern-contracts").innerHTML;
assert.equal((board.match(/class="mission-card"/g) || []).length, 2, "une carte par mission");
assert.match(board, /<article class="mission-card mission-card--empty" aria-label="Case libre"><p>Nouvelle mission demain<\/p><\/article>/, "case prise : vide jusqu'au lendemain");
assert.match(board, /data-mission-open="contract:c1"/);
assert.match(board, /class="mission-emblem"/, "sans image : un emblème");
assert.match(board, /<img src="assets\/missions\/garde\.webp"/, "avec image : l'illustration");
assert.match(board, /<stars 1>[\s\S]*6800 PO[\s\S]*2 jours de marche/);
assert.match(board, /Une veuve fortunée cherche 2 gardes du corps pour 8 jours\./);

ui.openMissionDetail("contract:c1");
const detail = node("mission-detail-body").innerHTML;
assert.equal(node("mission-detail").open, true);
assert.match(detail, /<h2 id="mission-detail-title">Camp gobelin de Brumecendre<\/h2>/);
assert.match(detail, /Commanditaire<\/dt><dd>Chef de village/);
assert.match(detail, /class="contract-letter"><p>À toute compagnie…<\/p>/);
assert.match(detail, /data-contract-accept="c1">Accepter le contrat<\/button>/);
// « Accepter le contrat » (Idan, 2026-11-01 : le lancement du camp gobelin ne marchait plus) : le bouton est dans la
// fenêtre de détail, hors du tableau ; le clic la ferme et ouvre le choix de l'escouade.
ui.initializeExpeditionUi();
clickOn("[data-contract-accept]", {contractAccept:"c1"});
assert.equal(node("mission-detail").open, false, "le détail se ferme");
assert.deepEqual(selections, [contract], "le choix de l'escouade s'ouvre, avec le contrat");
const tavern = fs.readFileSync(path.join(root, "prototype-web/tavern-ui.js"), "utf8");
assert.doesNotMatch(tavern, /\$\("tavern-contracts"\)\.addEventListener/, "plus d'écoute sur l'ancien tableau (sinon deux ouvertures)");
ui.openMissionDetail("bodyguard:g1");
assert.match(node("mission-detail-body").innerHTML, /data-bodyguard-accept="g1">Choisir les gardes<\/button>/);
assert.doesNotMatch(node("mission-detail-body").innerHTML, /contract-letter/);
clickOn("[data-bodyguard-accept]", {bodyguardAccept:"g1"});
assert.deepEqual(selections, [contract, guard], "et la garde du corps, pareil");

slots[0].offer = null;
slots[1].offer = null;
ui.renderContractBoard();
assert.equal((node("tavern-contracts").innerHTML.match(/Nouvelle mission demain/g) || []).length, 3, "toutes les cases prises");

assert.match(html, /<dialog id="mission-detail" class="mission-detail"/);
for (const file of ["one-shot-missions.json", "bodyguard-missions.json"]) {
  const data = JSON.parse(fs.readFileSync(path.join(root, "data/reference", file), "utf8"));
  const holder = file === "one-shot-missions.json" ? data.missions[0] : data;
  assert.ok("illustration" in holder, file + " : champ illustration");
}
console.log("Tableau des missions : cartes au même gabarit, illustration ou emblème, détail, action — OK");
