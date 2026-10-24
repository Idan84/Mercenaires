"use strict";

// Carte d'objet (Idan, 2026-10-24) : titres par tier et effets avec la qualité, comme le combat les applique.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createItemCards} = require("../game-core/item-card.js");

const ROOT = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "reference", file), "utf8"));
const reference = {
  weapons:read("weapons.json"), skills:read("skills.json"), baseArmors:read("base-armors.json"),
  itemQualities:read("item-qualities.json"), itemTitles:read("item-titles.json"), boots:read("boots.json"), belts:read("belts.json")
};
const cards = createItemCards({reference});
const item = (itemType, name, tier, qualityCode, extra = {}) => ({itemType, name, tier, qualityCode, ...extra});
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

// Un titre pour chaque arme et chaque armure, à chaque tier.
for (const row of [...reference.weapons.rows, ...reference.baseArmors.rows, ...reference.boots.rows, ...reference.belts.rows]) {
  const titles = reference.itemTitles.rows.find(r => r.nom === row.nom);
  assert.ok(titles, row.nom);
  for (const tier of [1,2,3,4]) assert.ok(String(titles["t" + tier] || "").trim(), `${row.nom} T${tier}`);
}
assert.equal(cards.title(item("weapon","Lance",1,"worn")), "Vieille lance", "l'exemple d'Idan");
assert.equal(cards.title(item("weapon","Lance",4,null)), "Lance luxueuse");

// Lance Grand Luxe : dégâts et charge × 1,2, poids × 0,8, puissance inchangée.
const lance = cards.card(item("weapon","Lance",3,"luxury"));
assert.equal(lance.kind, "weapon");
assert.equal(lance.title, "Lance de guerrier");
assert.equal(lance.category, "Armes d’hast");
assert.deepEqual(lance.damage, {dice:"1D8", factor:1.2});
assert.deepEqual(lance.powers, [{type:"Perforant", value:55}]);
assert.deepEqual(lance.range, {min:1, max:2});
near(lance.weight, 9.6);
near(lance.charge, 2.4);
assert.equal(lance.counterCharge, true);
assert.equal(lance.block, null);

// Écu usé : blocage × 0,8, poids × 1,2, contact.
const ecu = cards.card(item("weapon","Écu",1,"worn"));
near(ecu.block, 8);
near(ecu.weight, 12);
assert.deepEqual(ecu.range, {min:1, max:1});

// Traits des armes de tir et à feu.
assert.equal(cards.card(item("weapon","Arquebuse",2,"standard")).reload, true);
assert.equal(cards.card(item("weapon","Arquebuse",2,"standard")).chainShots, false);
assert.equal(cards.card(item("weapon","Arc",2,"standard")).chainShots, true);
assert.equal(cards.card(item("weapon","Tromblon",2,"standard")).area, true);

// Armure de plates usée : résistance × 0,8 si positive, ÷ 0,8 si négative ; handicap × 1,2.
const plates = cards.card(item("armor","Armure de plates",1,"worn",{templateId:"armor:plate_armor"}));
assert.equal(plates.kind, "armor");
assert.equal(plates.title, "Plates cabossées");
assert.equal(plates.category, "Lourde");
near(plates.resistances.find(r => r.type === "Tranchant").value, 72);
near(plates.resistances.find(r => r.type === "Foudroyant").value, -56.25);
near(plates.dodge, 19.2);
near(plates.speed, 14.4);
near(plates.magic, 54);
assert.equal(cards.card(item("ring","Anneau",2,"standard")), null, "ni arme, ni armure, ni bottes : pas de carte");

// Bottes (Idan, 2026-10-24) : +5 / 10 / 15 / 20 % de la caractéristique de base selon le tier ; la qualité n'y change rien.
const swift = cards.card(item("boots","Bottes de vitesse",1,"worn"));
assert.deepEqual([swift.kind, swift.title, swift.stat, swift.bonus], ["boots","Godillots troués","Vitesse",5]);
assert.equal(cards.card(item("boots","Bottes d’esquive",3,"luxury")).bonus, 15);
assert.equal(cards.card(item("boots","Bottes de perception",4,null)).bonus, 20);
// Ceintures (Idan, 2026-10-24) : mêmes règles.
const lion = cards.card(item("belt","Ceinture de courage",2,"standard"));
assert.deepEqual([lion.kind, lion.category, lion.title, lion.stat, lion.bonus], ["belt","Ceinture","Ceinturon du lion","Courage",10]);
assert.equal(cards.card(item("belt","Ceinture de mana",4,null)).stat, "Réserve de mana");

// Mise en forme pour le joueur (prototype-web/item-card-ui.js).
const ui = fs.readFileSync(path.join(ROOT, "prototype-web/item-card-ui.js"), "utf8");
const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const game = {referenceData:reference};
const {renderItemCard} = new Function("game","esc","MercenairesItemCard","equipmentArt","document",
  ui + "\nreturn {renderItemCard};"
)(game, esc, {createItemCards}, () => "assets/equipment/armes/lance-3.webp", undefined);
const lanceCard = renderItemCard(item("weapon","Lance",3,"luxury"));
assert.match(lanceCard, /class="item-card item-card--t3"/);
assert.match(lanceCard, /<strong class="item-card-title">Lance de guerrier<\/strong>/);
assert.match(lanceCard, /Lance · Armes d’hast/);
assert.match(lanceCard, /T3 · Grand Luxe/);
assert.match(lanceCard, /<dt>Dégâts<\/dt><dd>1D8 <em class="item-card-shift item-card-shift--up">\+20 %<\/em><\/dd>/);
assert.match(lanceCard, /<dt>Portée<\/dt><dd>1 à 2 cases<\/dd>/);
assert.match(lanceCard, /<dt>Poids<\/dt><dd>−10 Vitesse<\/dd>/, "arrondie pour le joueur");
assert.match(lanceCard, /<dt>Charge<\/dt><dd>\+2,4 % dégâts \/ case<\/dd>/);
assert.match(lanceCard, /Contre-charge/);
assert.match(lanceCard, /À deux mains : dégâts ×1,5, poids ÷2/);
assert.match(lanceCard, /Grand Luxe : dégâts, charge et blocage \+20 %, poids −20 %\./);
const platesCard = renderItemCard(item("armor","Armure de plates",1,"worn",{templateId:"armor:plate_armor"}));
assert.match(platesCard, /Armure de plates · Armure lourde/);
assert.match(platesCard, /item-card-row--malus"><dt>Foudroyant<\/dt><dd>−56<\/dd>/);
assert.match(platesCard, /item-card-row--bonus"><dt>Tranchant<\/dt><dd>\+72<\/dd>/);
assert.match(platesCard, /<p class="item-card-group">Handicap<\/p>/);
assert.match(platesCard, /Usée : résistances −20 %, handicap \+20 %\./);
assert.equal(renderItemCard(item("ring","Anneau",2,"standard")), "");
const dodgeCard = renderItemCard(item("boots","Bottes d’esquive",2,"standard"));
assert.match(dodgeCard, /<strong class="item-card-title">Bottes de faufileur<\/strong>/);
assert.match(dodgeCard, /item-card-row--bonus"><dt>Esquive<\/dt><dd>\+10 %<\/dd>/);
assert.match(dodgeCard, /Ajoute 10 % de l’Esquive de base du porteur/);
assert.doesNotMatch(dodgeCard, /item-card-quality/, "la qualité ne change pas le bonus des bottes");
const lionCard = renderItemCard(item("belt","Ceinture de courage",2,"standard"));
assert.match(lionCard, /item-card-row--bonus"><dt>Courage<\/dt><dd>\+10 %<\/dd>/);
assert.match(lionCard, /Ajoute 10 % du Courage de base du porteur/);
assert.match(renderItemCard(item("belt","Ceinture d’endurance",1,"worn")), /Ajoute 5 % de l’Endurance de base du porteur/);
assert.match(renderItemCard(item("belt","Ceinture de mana",3,"luxury")), /Ajoute 15 % de la Réserve de mana de base du porteur/);
assert.doesNotMatch(lionCard, /item-card-quality/);
console.log("Carte d'objet : titres par tier, effets avec la qualité, mise en forme — OK");
