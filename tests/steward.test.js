"use strict";

// Intendant (Idan, 2026-10-24) : proposer le poste (Courage, missions, blessures), revenir sur le terrain (+ jours
// d'intendance), une proposition par mercenaire et par jour, un seul intendant, affinité au refus, évaluation des
// candidats, appui aux échanges d'équipement.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createStewardRules} = require("../game-core/steward.js");
const {createEquipmentDeals} = require("../game-core/equipment-deals.js");

const ROOT = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"));
const reference = {formulaConstants:read("formula-constants.json"), weapons:read("weapons.json")};
let roll = 0;
const rules = createStewardRules({reference, random:() => roll});

const merc = (id, Courage, Intelligence, history = {}) => ({id, name:"M" + id, stats:{Courage, Intelligence},
  skills:{camp:{Intendance:50}}, history:{missions:0, timesWounded:0, log:[], ...history}});

// Les exemples envoyés à Idan : envie = 40 − 0,6 × Courage + 2 × missions + 8 × blessures, de 2 à 95 %.
const chance = (courage, missions, wounds) => Math.round(rules.appointChance(merc(9, courage, 50, {missions, timesWounded:wounds})));
assert.deepEqual([31, 49, 62].map(c => chance(c, 0, 0)), [21, 11, 3], "au début, dur de trouver un intendant");
assert.deepEqual([31, 49, 62].map(c => chance(c, 5, 1)), [39, 29, 21]);
assert.deepEqual([31, 49, 62].map(c => chance(c, 10, 2)), [57, 47, 39]);
assert.deepEqual([31, 49, 62].map(c => chance(c, 20, 4)), [93, 83, 75]);
assert.equal(chance(90, 0, 0), 2, "jamais moins de 2 %");
assert.equal(chance(10, 40, 9), 95, "jamais plus de 95 %");

function company(...members) {
  return {day:5, company:{captainId:1, intendantId:null, roster:[merc(1, 50, 50), ...members]}};
}

// Refus : rien ne change de poste ; le malin est flatté une seule fois, le brave se vexe à chaque fois.
const clever = merc(2, 30, 80), brave = merc(3, 80, 30);
const state = company(clever, brave);
roll = 0.999;
const first = rules.offer(state, 2);
assert.deepEqual([first.ok, first.accepted, first.roll, first.affinityDelta, first.mood], [true, false, 100, 5, "flattered"]);
assert.equal(clever.affinityAcquired, 5);
assert.equal(state.company.intendantId, null);
assert.deepEqual(rules.offer(state, 2), {ok:false, reason:"Vous lui en avez déjà parlé aujourd’hui."}, "une fois par jour");
state.day = 6;
assert.equal(rules.offer(state, 2).affinityDelta, 0, "flatté une seule fois");
assert.equal(clever.affinityAcquired, 5);
assert.equal(rules.offer(state, 3).affinityDelta, -5);
state.day = 7;
assert.equal(rules.offer(state, 3).mood, "vexed", "vexé à chaque fois");
assert.equal(brave.affinityAcquired, -10);
assert.deepEqual(clever.history.log.map(e => [e.day, e.kind, e.accepted]), [[5, "steward", false], [6, "steward", false]]);
assert.equal(rules.offer(state, 1).reason, "Le capitaine ne peut pas être intendant.");

// Accord : il devient intendant ; un seul à la fois.
state.day = 8;
roll = 0;
const yes = rules.offer(state, 2);
assert.deepEqual([yes.accepted, state.company.intendantId, state.company.intendantSince], [true, 2, 8]);
assert.equal(clever.affinityAcquired, 5, "un accord ne change pas l'affinité");
assert.equal(rules.stewardOf(state), clever);
state.day = 9;
assert.equal(rules.offer(state, 3).reason, "La compagnie a déjà un intendant.");

// Retour sur le terrain : 60 − Envie + 1 par jour d'intendance.
const veteran = merc(4, 49, 50, {missions:10, timesWounded:2});
const field = {day:10, company:{captainId:1, intendantId:4, intendantSince:10, roster:[merc(1, 50, 50), veteran]}};
assert.deepEqual([0, 10, 30, 60].map(d => { field.day = 10 + d; return Math.round(rules.returnChance(field, veteran)); }), [13, 23, 43, 73]);
field.day = 40;
roll = 0.999;
const stay = rules.recall(field);
assert.deepEqual([stay.accepted, stay.days, field.company.intendantId], [false, 30, 4]);
assert.equal(rules.recall(field).reason, "Vous lui en avez déjà parlé aujourd’hui.");
field.day = 41;
roll = 0;
// Dortoir plein (Idan, 2026-10-24) : pas de retour sur le terrain, et la proposition du jour n'est pas consommée.
const dorm = {free:() => 0.5, places:() => 1};
const blocked = createStewardRules({reference, random:() => 0, dormitory:dorm}).recall(field);
assert.deepEqual([blocked.ok, blocked.dormFull, blocked.reason], [false, true, "Le dortoir est plein : pas de place pour son retour."]);
assert.equal(field.company.intendantId, 4);
assert.notEqual(veteran.stewardOfferDay, 41, "le refus faute de place ne compte pas comme la proposition du jour");
const back = rules.recall(field);
assert.deepEqual([back.accepted, back.days, field.company.intendantId, field.company.intendantSince], [true, 31, null, undefined]);
assert.equal(veteran.history.stewardDays, 31);
assert.deepEqual(veteran.history.log.map(e => e.kind), ["recall", "recall"]);
assert.equal(rules.recall(field).reason, "La compagnie n’a pas d’intendant.");

// Évaluer un candidat : ±20 % × (1 − Intendance/100), figé, gratuit.
const candidate = {mercenary:{id:50}};
roll = 1;
const guess = rules.estimate(state, candidate, "Force", 60);
assert.deepEqual([guess.ok, guess.estimate, guess.repeated], [true, 66, false], "Intendance 50 : jusqu'à +10 %");
roll = 0;
assert.deepEqual([rules.estimate(state, candidate, "Force", 60).estimate, rules.estimate(state, candidate, "Force", 60).repeated], [66, true], "figé");
assert.equal(rules.estimate(field, candidate, "Force", 60).ok, false, "sans intendant");
clever.skills.camp.Intendance = 100;
assert.equal(rules.estimate(state, {mercenary:{id:51}}, "Force", 60).estimate, 60, "Intendance 100 : exact");

// Appui aux échanges : Δ + 0,2 × Intendance + 0,25 × affinité envers l'intendant.
clever.skills.camp.Intendance = 50;
const deals = createEquipmentDeals({reference, random:() => 0, affinityRules:{memberAffinity:() => ({total:0}), affinity:() => ({total:40})}});
const owner = {...merc(5, 50, 20), items:[{id:"a", name:"Sabre", tier:1, itemType:"weapon"}], equipment:{slots:{weapon_set_1_main:"a"}}};
const shop = {day:9, company:{captainId:1, intendantId:null, roster:[merc(1, 50, 50), owner], stock:[{id:"s", name:"Lance", tier:3, itemType:"weapon"}]}};
const alone = deals.evaluate(shop, {mercenaryId:5, slot:"weapon_set_1_main", stockItemId:"s"});
assert.equal(Math.round(alone.chance), 42);
shop.company.roster.push(clever);
shop.company.intendantId = 2;
const helped = deals.evaluate(shop, {mercenaryId:5, slot:"weapon_set_1_main", stockItemId:"s"});
assert.deepEqual([helped.steward, helped.stewardBonus, Math.round(helped.chance)], [clever, 20, 62], "l'exemple envoyé à Idan");
clever.equipment = {slots:{}};
clever.items = [];
assert.equal(deals.evaluate(shop, {mercenaryId:2, slot:"weapon_set_1_main", stockItemId:"s"}).stewardBonus, 0, "pas d'appui pour lui-même");
// Expédition (doc 17) : un mercenaire parti en mission n'est ni nommé intendant ni sollicité pour un échange.
const traveler = merc(7, 50, 50);
const away = {...company(traveler), expeditions:[{memberIds:[7]}]};
assert.deepEqual(rules.offer(away, 7), {ok:false, reason:"Il est en mission."});
assert.deepEqual(deals.canDeal(away, traveler), {ok:false, reason:"Il est en mission."});
console.log("Intendant : accepter, revenir, une fois par jour, un seul, affinité au refus, évaluer, appuyer les échanges — OK");
