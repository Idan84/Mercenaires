"use strict";

// Échanges d'équipement (Idan, 2026-10-24) : Donner, Retirer, Troquer ; jet selon la valeur perçue (Intelligence)
// et l'affinité ; l'affinité bouge selon la valeur perçue, accord ou refus ; une tentative par jour ; capitaine libre.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createEquipmentDeals} = require("../game-core/equipment-deals.js");

const ROOT = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"));
const reference = {weapons:read("weapons.json"), formulaConstants:read("formula-constants.json")};
const near = (a, b, tolerance = 0.05) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`);

let roll = 0;
let affinity = 0;
const deals = createEquipmentDeals({reference, random:() => roll, affinityRules:{memberAffinity:() => ({total:affinity})}});

// Valeur perçue : tier × Int/100 + 3,5 (possédé) ou 2,5 (proposé) × (1 − Int/100).
assert.equal(deals.perceivedValue({tier:3}, {stats:{Intelligence:100}}, true), 3);
near(deals.perceivedValue({tier:1}, {stats:{Intelligence:20}}, true), 3);
near(deals.perceivedValue({tier:4}, {stats:{Intelligence:20}}, false), 2.8);
assert.equal(deals.perceivedValue(null, {stats:{Intelligence:50}}, false), 0);

const item = (id, name, tier, itemType = "weapon", extra = {}) => ({id, name, tier, itemType, owner:null, slot:null, ...extra});
function world(intelligence, {mine = null, slot = "weapon_set_1_main", stock = []} = {}) {
  const merc = {id:2, name:"Borin", stats:{Intelligence:intelligence}, items:[], equipment:{slots:{
    armor:null, boots:null, weapon_set_1_main:null, weapon_set_1_off:null, weapon_set_2_main:null, weapon_set_2_off:null, ring_1:null}}};
  if (mine) { merc.items.push({...mine, owner:2, slot}); merc.equipment.slots[slot] = mine.id; }
  const captain = {id:1, name:"Capitaine", stats:{Intelligence:60}, items:[], equipment:{slots:{weapon_set_1_main:null, armor:null}}};
  return {day:4, company:{captainId:1, roster:[captain, merc], stock}};
}

// Les exemples envoyés à Idan (affinité 0) : [chance %, affinité acquise].
const example = (intelligence, mine, offered) => {
  const state = world(intelligence, {mine:mine && item("a", "Sabre", mine), stock:offered ? [item("s", "Lance", offered)] : []});
  const deal = deals.evaluate(state, {mercenaryId:2, slot:"weapon_set_1_main", stockItemId:offered ? "s" : null});
  return [Math.round(deal.chance), deal.affinityDelta, deal.action];
};
assert.deepEqual(example(80, null, 2), [81, 4, "donner"]);
assert.deepEqual(example(20, null, 2), [83, 5, "donner"]);
assert.deepEqual(example(80, 1, 3), [74, 3, "troquer"], "l'intelligent prend la meilleure arme");
assert.deepEqual(example(20, 1, 3), [42, -1, "troquer"], "le bête garde son épée cassée");
assert.deepEqual(example(80, 4, 1), [16, -5, "troquer"]);
assert.deepEqual(example(20, 4, 1), [26, -3, "troquer"]);
assert.deepEqual(example(80, 3, null), [13, -6, "retirer"]);
assert.deepEqual(example(20, 3, null), [13, -7, "retirer"]);
// L'affinité compte pour moitié : +100 ajoute 50 à Δ.
affinity = 100;
assert.equal(example(80, 3, null)[0], 38);
affinity = 0;

// Emplacements : armure, bottes, mains selon la prise.
const merc = world(50, {mine:item("h", "Hallebarde", 1)}).company.roster[1];
const ok = (slot, it) => deals.slotAccepts(merc, slot, it).ok;
assert.ok(ok("armor", item("x", "Brigandine", 1, "armor")));
assert.ok(!ok("armor", item("x", "Lance", 1)));
assert.ok(ok("boots", item("x", "Bottes de vitesse", 1, "boots")));
assert.ok(ok("belt", item("x", "Ceinture de courage", 1, "belt")), "ceinture : emplacement Ceinturon");
assert.ok(!ok("belt", item("x", "Bottes de vitesse", 1, "boots")));
assert.ok(!ok("belt_item_1", item("x", "Ceinture de courage", 1, "belt")), "pas dans les poches de ceinture");
assert.ok(ok("amulet", item("x", "Amulette de chance", 1, "amulet")), "amulette : emplacement Amulette");
assert.ok(!ok("amulet", item("x", "Ceinture de courage", 1, "belt")));
assert.ok(!ok("belt", item("x", "Amulette de chance", 1, "amulet")));
assert.ok(!ok("weapon_set_1_off", item("x", "Dague", 1)), "la hallebarde tient les deux mains");
assert.ok(!ok("weapon_set_2_off", item("x", "Arc", 1)), "arme à deux mains : arme principale");
assert.ok(!ok("weapon_set_2_main", item("x", "Écu", 1)), "bouclier : main secondaire");
assert.ok(ok("weapon_set_2_off", item("x", "Écu", 1)));
assert.ok(ok("weapon_set_2_main", item("x", "Épée longue", 1)));
assert.ok(!ok("ring_1", item("x", "Dague", 1)));
assert.deepEqual(deals.compatibleSlots(merc, item("x", "Épée longue", 1)).map(s => [s.slot, s.current?.name || null]),
  [["weapon_set_1_main","Hallebarde"],["weapon_set_2_main",null],["weapon_set_2_off",null]]);

// Accord : l'objet change de main ; l'affinité bouge ; plus de tentative ce jour-là.
const give = world(50, {stock:[item("s", "Lance", 2)]});
roll = 0;
const accepted = deals.propose(give, {mercenaryId:2, slot:"weapon_set_1_main", stockItemId:"s"});
const borin = give.company.roster[1];
assert.deepEqual([accepted.ok, accepted.action, accepted.accepted, accepted.roll], [true, "donner", true, 1]);
assert.equal(give.company.stock.length, 0);
assert.deepEqual(borin.items.map(i => [i.id, i.owner, i.slot]), [["s", 2, "weapon_set_1_main"]], "l'objet donné lui appartient");
assert.equal(borin.equipment.slots.weapon_set_1_main, "s");
assert.equal(borin.affinityAcquired, accepted.affinityDelta);
assert.ok(accepted.affinityDelta > 0, "un cadeau fait monter l'affinité");
assert.equal(borin.equipmentDealDay, 4);
const again = deals.propose(give, {mercenaryId:2, slot:"weapon_set_1_main"});
assert.deepEqual([again.ok, again.reason], [false, "Vous lui avez déjà parlé d’équipement aujourd’hui."]);
assert.equal(borin.equipment.slots.weapon_set_1_main, "s", "rien ne bouge");

// Refus : rien ne change de main, mais l'affinité baisse quand même (on voulait lui reprendre son arme).
give.day = 5;
roll = 0.999;
const refused = deals.propose(give, {mercenaryId:2, slot:"weapon_set_1_main"});
assert.deepEqual([refused.ok, refused.action, refused.accepted, refused.roll, refused.mood], [true, "retirer", false, 100, "displeased"]);
assert.equal(borin.equipment.slots.weapon_set_1_main, "s");
assert.equal(give.company.stock.length, 0);
assert.ok(refused.affinityDelta < 0);
assert.equal(borin.affinityAcquired, accepted.affinityDelta + refused.affinityDelta, "accord ou refus, l'affinité bouge");

// Troquer accepté : l'ancien objet retourne au stock, sans propriétaire.
give.day = 6;
give.company.stock.push(item("t", "Lance", 3));
roll = 0;
const swap = deals.propose(give, {mercenaryId:2, slot:"weapon_set_1_main", stockItemId:"t"});
assert.deepEqual([swap.action, swap.accepted], ["troquer", true]);
assert.deepEqual(give.company.stock.map(i => [i.id, i.owner, i.slot]), [["s", null, null]]);
assert.deepEqual(borin.items.map(i => i.id), ["t"]);

// Objet incompatible : refusé avant le jet, sans compter la tentative.
give.day = 7;
give.company.stock.push(item("e", "Écu", 1));
const wrong = deals.propose(give, {mercenaryId:2, slot:"weapon_set_1_main", stockItemId:"e"});
assert.deepEqual([wrong.ok, wrong.reason], [false, "Un bouclier se tient en main secondaire."]);
assert.equal(borin.equipmentDealDay, 6);

// Le capitaine s'équipe librement : ni jet, ni affinité, ni limite par jour.
const self = world(50, {stock:[item("c1", "Sabre", 1), item("c2", "Brigandine", 1, "armor")]});
roll = 0.999;
const first = deals.propose(self, {mercenaryId:1, slot:"weapon_set_1_main", stockItemId:"c1"});
const second = deals.propose(self, {mercenaryId:1, slot:"armor", stockItemId:"c2"});
assert.deepEqual([first.free, first.accepted, first.roll, second.accepted], [true, true, null, true]);
const captain = self.company.roster[0];
assert.equal(captain.affinityAcquired, undefined);
assert.equal(captain.equipmentDealDay, undefined);
assert.equal(self.company.stock.length, 0);

// Requêtes invalides.
assert.equal(deals.propose(self, {mercenaryId:99, slot:"armor"}).ok, false);
assert.equal(deals.propose(world(50), {mercenaryId:2, slot:"armor"}).reason, "Rien à échanger.");
console.log("Échanges d'équipement : valeur perçue, chance, affinité, une tentative par jour, capitaine libre — OK");
