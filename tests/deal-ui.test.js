"use strict";

// Échanges d'équipement, interface (Idan, 2026-10-24) : menus de la fiche et de l'Intendance, répliques du mercenaire.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createEquipmentDeals} = require("../game-core/equipment-deals.js");
const {createItemCards} = require("../game-core/item-card.js");
const recruit = require("../game-core/recruit-dialogue.js");

const ROOT = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"));
const reference = {weapons:read("weapons.json"), formulaConstants:read("formula-constants.json"), boots:read("boots.json"),
  baseArmors:read("base-armors.json"), itemQualities:read("item-qualities.json"), itemTitles:read("item-titles.json"),
  skills:read("skills.json"), equipmentSlots:read("equipment-slots.json"), equipmentDialogue:read("equipment-dialogue.json")};

// Répliques : chaque cas a ses quatre variantes, toutes différentes.
const copy = reference.equipmentDialogue;
const cases = [["donner",true,"content"],["donner",false,"content"],["retirer",true,"mecontent"],["retirer",false,"mecontent"],
  ["troquer",true,"content"],["troquer",false,"content"],["troquer",true,"mecontent"],["troquer",false,"mecontent"]];
for (const [action, accord, humeur] of cases) {
  const row = copy.replies.find(r => r.action === action && r.accord === accord && r.humeur === humeur);
  assert.ok(row && row.lignes.length === 4, `${action} ${accord} ${humeur}`);
}
assert.equal(new Set(copy.replies.flatMap(r => r.lignes)).size, 32);
for (const action of ["donner","retirer","troquer"]) assert.ok(copy.proposals[action] && copy.outcomes[action]);

const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const item = (id, name, tier, itemType = "weapon", extra = {}) => ({id, name, tier, itemType, owner:null, slot:null,
  qualityName:{1:"Usée",2:"Correcte",3:"Grand Luxe"}[tier], ...extra});
const slots = () => ({armor:null, boots:null, weapon_set_1_main:null, weapon_set_1_off:null, weapon_set_2_main:null, weapon_set_2_off:null});
const captain = {id:1, name:"Edda Brasfort", stats:{Intelligence:60}, items:[], equipment:{slots:slots()}};
const borin = {id:2, name:"Borin Cendremarteau", firstName:"Borin", sex:"homme", stats:{Intelligence:70}, items:[item("a", "Hachette", 1, "weapon", {owner:2, slot:"weapon_set_1_main"})],
  equipment:{slots:{...slots(), weapon_set_1_main:"a"}}};
const game = {referenceData:reference, campaign:{day:3, company:{captainId:1, roster:[captain, borin],
  stock:[item("s1", "Anneau", 2, "ring"), item("b1", "Bottes de perception", 2, "boots"), item("b2", "Bottes de perception", 2, "boots"),
    item("b3", "Bottes de vitesse", 3, "boots"), item("w1", "Sabre", 2)]}}};
// Un anneau n'a pas encore d'emplacement : il reste dans le stock.
const js = fs.readFileSync(path.join(ROOT, "prototype-web/deal-ui.js"), "utf8");
const ui = new Function("game","$","esc","gearTile","itemCardRules","affinityRules","MercenairesEquipmentDeals","MercenairesRecruitDialogue",
  "renderAvatar","saveGame","renderGame","renderSheet",
  js + "\nreturn {sheetDealMenu,stockDealMenu,dealLines,dealRules};")(
  game, () => null, esc, (slot, it) => `<tile ${it.id}>`, () => createItemCards({reference}),
  () => ({memberAffinity:() => ({total:0})}), {createEquipmentDeals}, recruit, () => "", () => {}, () => {}, () => {});

// Fiche : case vide → Donner (un exemplaire par objet et par tier, meilleur tier d'abord).
const boots = ui.sheetDealMenu(borin, "boots");
assert.match(boots, /<p class="deal-menu-title">Bottes<\/p>/);
assert.doesNotMatch(boots, /Retirer/);
assert.match(boots, /<p class="deal-menu-label">Donner<\/p>/);
assert.deepEqual([...boots.matchAll(/data-deal-stock="([^"]+)"/g)].map(m => m[1]), ["b3","b1"], "doublon regroupé, T3 d'abord");
assert.match(boots, /Bottes du messager ailé \(T3\)/, "titre de l'objet selon son tier");
// Case remplie → Retirer et Troquer contre.
const hand = ui.sheetDealMenu(borin, "weapon_set_1_main");
assert.match(hand, /<p class="deal-menu-current">Hachette émoussée \(T1\)|<p class="deal-menu-current">[^<]+\(T1\)<\/p>/);
assert.match(hand, /data-deal-member="2" data-deal-slot="weapon_set_1_main" data-deal-stock="">Retirer/);
assert.match(hand, /<p class="deal-menu-label">Troquer contre<\/p>/);
assert.match(hand, /data-deal-stock="w1"/);
assert.match(ui.sheetDealMenu(borin, "armor"), /Aucun objet de l’Intendance ne va ici\./);
assert.match(ui.sheetDealMenu(captain, "armor"), /Le capitaine s’équipe librement\./);

// Intendance : « Donner à… », le capitaine d'abord, emplacement par emplacement.
const give = ui.stockDealMenu("w1");
assert.match(give, /<p class="deal-menu-title">Donner à…<\/p>/);
assert.ok(give.indexOf("Edda Brasfort · capitaine") < give.indexOf("Borin Cendremarteau"));
assert.match(give, /data-deal-member="2" data-deal-slot="weapon_set_1_main" data-deal-stock="w1">\s*Set 1 — arme principale<small>contre [^<]+\(T1\)<\/small>/);
assert.match(give, /data-deal-member="2" data-deal-slot="weapon_set_2_main" data-deal-stock="w1">\s*Set 2 — arme principale<small>libre<\/small>/);
assert.match(ui.stockDealMenu("s1"), /Personne ne peut le porter\./);

// Une tentative par jour : le menu le dit, sans actions.
borin.equipmentDealDay = 3;
const later = ui.sheetDealMenu(borin, "weapon_set_1_main");
assert.match(later, /Vous lui avez déjà parlé d’équipement aujourd’hui\./);
assert.doesNotMatch(later, /data-deal-stock/);
assert.match(ui.stockDealMenu("w1"), /<small class="deal-menu-note">Vous lui avez déjà parlé d’équipement aujourd’hui\.<\/small>/);
delete borin.equipmentDealDay;

// Répliques : proposition du capitaine, réponse selon l'action, l'accord et l'humeur, ce qui change.
const sabre = game.campaign.company.stock.find(x => x.id === "w1"), hachette = borin.items[0];
const swapLines = ui.dealLines(borin, {action:"troquer", accepted:false, mood:"pleased", given:hachette, received:sabre});
assert.match(swapLines.proposal, /^Je vous propose un échange : [^(]+\(T2\) contre [^(]+\(T1\)\.$/);
assert.ok(copy.replies.find(r => r.action === "troquer" && !r.accord && r.humeur === "content").lignes
  .map(l => recruit.fill(l, {}, false)).includes(swapLines.reply), "refus d'un bon échange : il tient au sien");
assert.equal(swapLines.outcome, "Borin garde son équipement.");
const giveLines = ui.dealLines(borin, {action:"donner", accepted:true, mood:"pleased", given:null, received:sabre});
assert.match(giveLines.proposal, /^Voici pour vous : .+ \(T2\)\.$/);
assert.match(giveLines.outcome, /^.+ \(T2\) rejoint l’équipement de Borin\.$/);
const takeLines = ui.dealLines(borin, {action:"retirer", accepted:true, mood:"displeased", given:hachette, received:null});
assert.match(takeLines.outcome, /\(T1\) retourne à l’Intendance\.$/);
console.log("Échanges d'équipement, interface : menus de la fiche et de l'Intendance, répliques — OK");
