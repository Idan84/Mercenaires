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
  itemQualities:read("item-qualities.json"), itemTitles:read("item-titles.json"), boots:read("boots.json"), belts:read("belts.json"),
  amulets:read("amulets.json"), capes:read("capes.json"), gloves:read("gloves.json"), pants:read("pants.json"), rings:read("rings.json")
};
const cards = createItemCards({reference});
const item = (itemType, name, tier, qualityCode, extra = {}) => ({itemType, name, tier, qualityCode, ...extra});
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

// Un titre pour chaque arme et chaque armure, à chaque tier.
for (const row of [...reference.weapons.rows, ...reference.baseArmors.rows, ...reference.boots.rows, ...reference.belts.rows, ...reference.amulets.rows,
  ...reference.capes.rows, ...reference.gloves.rows, ...reference.pants.rows, ...reference.rings.rows]) {
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
assert.equal(lance.stat, null);

// Bâtons (Idan, 2026-10-29) : + 5 % de Puissance magique ou + 10 % de Réserve de mana, quelle que soit la qualité.
assert.deepEqual(cards.card(item("weapon","Bâton long",1,"worn")).stat, {name:"Puissance magique", percent:5});
assert.deepEqual(cards.card(item("weapon","Bâton court",4,"luxury")).stat, {name:"Réserve de mana", percent:10});
// Saï (Idan, 2026-10-29) : parade de 5 % contre les coups tranchants.
assert.deepEqual(cards.card(item("weapon","Sai",1,"standard")).parry, {type:"tranchant", chance:5});
assert.equal(cards.card(item("weapon","Dague",1,"standard")).parry, null);

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
// Amulettes (Idan, 2026-10-24) : mêmes règles.
const clover = cards.card(item("amulet","Amulette de chance",2,"standard"));
assert.deepEqual([clover.kind, clover.category, clover.title, clover.stat, clover.bonus], ["amulet","Amulette","Trèfle de cuivre","Chance",10]);
assert.equal(cards.card(item("amulet","Amulette de puissance magique",4,null)).bonus, 20);
// Capes (Idan, 2026-10-24) : un pourcentage, sauf la cape de résistance physique (des points).
const rampart = cards.card(item("cape","Cape de résistance physique",3,"standard"));
assert.deepEqual([rampart.kind, rampart.category, rampart.title, rampart.stat, rampart.bonus, rampart.points],
  ["cape","Cape","Cape du rempart","Résistance physique",15,true]);
assert.equal(cards.card(item("cape","Cape d’esquive",1,null)).points, false);
// Gants (Idan, 2026-10-24) : mêmes règles que les bottes.
const titan = cards.card(item("gloves","Gants de force",4,"luxury"));
assert.deepEqual([titan.kind, titan.category, titan.title, titan.stat, titan.bonus, titan.points], ["gloves","Gants","Les Poings du Titan","Force",20,false]);
// Culottes (Idan, 2026-10-24) : Charisme et Intimidation en %, Affinité avec le capitaine en points.
const terror = cards.card(item("pants","Culotte d’Intimidation",4,"standard"));
assert.deepEqual([terror.kind, terror.category, terror.title, terror.stat, terror.bonus, terror.points], ["pants","Culotte","La Culotte de la Terreur","Intimidation",20,false]);
const brother = cards.card(item("pants","Slip d’Affinité",3,"standard"));
assert.deepEqual([brother.title, brother.stat, brother.bonus, brother.points], ["Slip du frère d’armes","Affinité",15,true]);
// Bagues (Idan, 2026-10-24) : Chance et Courage en % ; bague de magie : + son école, − les deux écoles opposées.
const fortune = cards.card(item("ring","Bague de la chance",4,"standard"));
assert.deepEqual([fortune.kind, fortune.category, fortune.title, fortune.stat, fortune.bonus, fortune.malus], ["ring","Bague","L’Anneau de Dame Fortune","Chance",20,0]);
const ember = cards.card(item("ring","Bague de Feu",2,"standard"));
assert.deepEqual([ember.title, ember.stat, ember.bonus, ember.malus, ember.opposites], ["Bague de la flammèche","Feu",15,10,["Télékinésie","Eau"]]);
assert.deepEqual(cards.card(item("ring","Bague de Feu",4,"standard")).opposites, [], "T4 : plus de malus");

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
// L'image de l'objet en grand, à côté de la carte (Idan, 2026-10-25) : figure séparée, plus de vignette dans la carte.
assert.match(lanceCard, /^<div class="item-card-wrap"><figure class="item-card-showcase item-card--t3"><img src="assets\/equipment\/armes\/lance-3\.webp" alt=""><\/figure><div class="item-card item-card--t3">/);
assert.doesNotMatch(lanceCard, /item-card-art/);
const large = new Function("game","esc","MercenairesItemCard","equipmentArt","equipmentArtLarge","document",
  ui + "\nreturn {renderItemCard};"
)(game, esc, {createItemCards}, () => "assets/equipment/armes/lance-3.webp", () => "assets/equipment-large/armes/lance-3.webp", undefined);
assert.match(large.renderItemCard(item("weapon","Lance",3,"luxury")), /<figure class="item-card-showcase item-card--t3"><img src="assets\/equipment-large\/armes\/lance-3\.webp"/);
const sheetUi = fs.readFileSync(path.join(ROOT, "prototype-web/ui.js"), "utf8");
assert.match(sheetUi, /function equipmentArtLarge\(item\)\{\s*return equipmentArt\(item\)\?\.replace\("assets\/equipment\/","assets\/equipment-large\/"\)\|\|null;/);
assert.doesNotMatch(sheetUi, /gear-caption/, "plus de nom d'objet sur la silhouette");
for (const file of fs.readdirSync(path.join(ROOT, "prototype-web/assets/equipment"), {recursive:true}).filter(f => /\.webp$/.test(f) && !/^frames/.test(f))) {
  assert.ok(fs.existsSync(path.join(ROOT, "prototype-web/assets/equipment-large", file)), "grande image manquante : " + file);
}
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
const cloverCard = renderItemCard(item("amulet","Amulette de chance",2,"standard"));
assert.match(cloverCard, /item-card-row--bonus"><dt>Chance<\/dt><dd>\+10 %<\/dd>/);
assert.match(cloverCard, /Ajoute 10 % de la Chance de base du porteur/);
assert.match(renderItemCard(item("amulet","Amulette de volonté",3,"luxury")), /Ajoute 15 % de la Volonté de base du porteur/);
assert.match(renderItemCard(item("amulet","Amulette de puissance magique",1,"worn")), /Ajoute 5 % de la Puissance magique de base du porteur/);
assert.doesNotMatch(cloverCard, /item-card-quality/);
const rampartCard = renderItemCard(item("cape","Cape de résistance physique",3,"standard"));
assert.match(rampartCard, /item-card-row--bonus"><dt>Résistance physique<\/dt><dd>\+15<\/dd>/);
assert.match(rampartCard, /Ajoute 15 points de Résistance physique au porteur/);
assert.match(renderItemCard(item("cape","Cape d’esquive",2,"standard")), /Ajoute 10 % de l’Esquive de base du porteur/);
assert.match(renderItemCard(item("cape","Cape de discrétion",4,"luxury")), /Ajoute 20 % de la Discrétion de base du porteur/);
assert.match(renderItemCard(item("gloves","Gants de force",2,"standard")), /Ajoute 10 % de la Force de base du porteur/);
assert.match(renderItemCard(item("gloves","Gants de dextérité",1,"worn")), /Ajoute 5 % de la Dextérité de base du porteur/);
assert.match(renderItemCard(item("gloves","Gants de pièges",3,"standard")), /Ajoute 15 % des Pièges de base du porteur/);
assert.match(renderItemCard(item("pants","String du Charisme",2,"standard")), /Ajoute 10 % du Charisme de base du porteur/);
assert.match(renderItemCard(item("pants","Culotte d’Intimidation",1,"worn")), /Ajoute 5 % de l’Intimidation de base du porteur/);
const briefsCard = renderItemCard(item("pants","Slip d’Affinité",4,"luxury"));
assert.match(briefsCard, /item-card-row--bonus"><dt>Affinité avec le capitaine<\/dt><dd>\+20<\/dd>/);
assert.match(briefsCard, /Ajoute 20 points d’affinité avec le capitaine/);
assert.doesNotMatch(briefsCard, /item-card-quality/);
assert.match(renderItemCard(item("ring","Bague du courage",1,"worn")), /Ajoute 5 % du Courage de base du porteur/);
const fireCard = renderItemCard(item("ring","Bague de Feu",1,"worn"));
assert.match(fireCard, /Ajoute 10 % du Feu de base du porteur/);
assert.match(fireCard, /item-card-row--malus"><dt>Eau<\/dt><dd>−15 %<\/dd>/);
assert.match(fireCard, /Retire 15 % de la Télékinésie et de l’Eau de base du porteur/);
assert.doesNotMatch(renderItemCard(item("ring","Bague de l’Eau",4,"luxury")), /Retire/);
console.log("Carte d'objet : titres par tier, effets avec la qualité, mise en forme — OK");
