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

// Bâtons (Idan, 2026-10-29) : un pourcentage de Puissance magique ou de Réserve de mana, selon le tier (5 / 10 / 15 / 20 ;
// Idan, 2026-11-05), quelle que soit la qualité.
assert.deepEqual(cards.card(item("weapon","Bâton long",1,"worn")).stat, {name:"Puissance magique", percent:5});
assert.deepEqual(cards.card(item("weapon","Bâton long",3,"luxury")).stat, {name:"Puissance magique", percent:15});
assert.deepEqual(cards.card(item("weapon","Bâton court",4,"luxury")).stat, {name:"Réserve de mana", percent:20});
// Saï (Idan, 2026-10-29) : parade de 5 % contre les coups tranchants.
assert.deepEqual(cards.card(item("weapon","Sai",1,"standard")).parry, {type:"tranchant", chance:5});
assert.equal(cards.card(item("weapon","Dague",1,"standard")).parry, null);
// Traits d'armes (Idan, 2026-10-29) : fouet, fléau, trident, marteau de guerre.
// Par tier (Idan, 2026-11-05) : fouet (Charisme et aura de Courage) et trident 5 / 10 / 15 / 20 ; marteau et grande épée
// 3 / 6 / 9 / 12 ; le fléau reste fixe.
const whip = cards.card(item("weapon","Fouet",1,"standard"));
assert.deepEqual([whip.stat, whip.aura, whip.range], [{name:"Charisme", percent:5}, {name:"Courage", percent:5, range:3}, {min:1, max:2}]);
const whip4 = cards.card(item("weapon","Fouet",4,"standard"));
assert.deepEqual([whip4.stat, whip4.aura], [{name:"Charisme", percent:20}, {name:"Courage", percent:20, range:3}]);
assert.equal(cards.card(item("weapon","Fléau d’armes",1,"standard")).blockCut, 50);
assert.equal(cards.card(item("weapon","Fléau d’armes",4,"standard")).blockCut, 50);
assert.deepEqual(cards.card(item("weapon","Trident",1,"standard")).stat, {name:"Eau", percent:5});
assert.deepEqual(cards.card(item("weapon","Trident",2,"standard")).stat, {name:"Eau", percent:10});
assert.deepEqual(cards.card(item("weapon","Marteau de guerre",1,"standard")).stat, {name:"Foudre", percent:3});
assert.deepEqual(cards.card(item("weapon","Marteau de guerre",4,"standard")).stat, {name:"Foudre", percent:12});
assert.deepEqual(cards.card(item("weapon","Grande épée",3,"standard")).stat, {name:"Feu", percent:9});
assert.equal(cards.card(item("weapon","Sarbacane",1,"standard")).poison, true);
assert.deepEqual(cards.card(item("weapon","Nunchaku",1,"standard")).attackBonus, {stat:"Dextérité", source:"Télékinésie", percent:10});

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
assert.doesNotMatch(lanceCard, /\bT[1-6]\b/, "jamais le tier sur la carte (Idan, 2026-10-30)");
assert.match(lanceCard, /<dt>Dégâts<\/dt><dd>12 à 96 PV<\/dd>/, "en PV, qualité comprise, sans dés (Idan, 2026-10-30)");
assert.match(lanceCard, /<p class="item-card-group">Pénétration d’armure<\/p><div class="item-card-row"><dt>Perforant<\/dt>/);
assert.match(lanceCard, /<dt>Portée<\/dt><dd>1 à 2 cases<\/dd>/);
assert.match(lanceCard, /<dt>Poids<\/dt><dd>−10 Vitesse<\/dd>/, "arrondie pour le joueur");
assert.match(lanceCard, /<dt>Charge<\/dt><dd>\+2,4 % de dégâts par case d’élan<\/dd>/);
assert.match(lanceCard, /Contre-charge/);
assert.match(lanceCard, /À deux mains : dégâts ×1,5, poids ÷2/);
assert.doesNotMatch(lanceCard, /Grand Luxe|item-card-quality/, "la qualité est déjà dans les valeurs (Idan, 2026-10-30)");
const platesCard = renderItemCard(item("armor","Armure de plates",1,"worn",{templateId:"armor:plate_armor"}));
assert.match(platesCard, /Armure de plates · Armure lourde/);
assert.match(platesCard, /item-card-row--malus"><dt>Foudroyant<\/dt><dd>−56<\/dd>/);
assert.match(platesCard, /item-card-row--bonus"><dt>Tranchant<\/dt><dd>\+72<\/dd>/);
assert.match(platesCard, /<p class="item-card-group">Protection<\/p>/, "pas « Résistances » : la Résistance physique est autre chose (Idan, 2026-10-30)");
assert.match(platesCard, /<p class="item-card-group">Handicap<\/p>/);
assert.doesNotMatch(platesCard, /Usée/);
assert.equal(renderItemCard(item("ring","Anneau",2,"standard")), "");
// L'image de l'objet dans le cadre de la carte (Idan, 2026-10-30).
assert.match(lanceCard, /^<div class="item-card-wrap"><div class="item-card item-card--t3">\s*<figure class="item-card-art"><img src="assets\/equipment\/armes\/lance-3\.webp" alt=""><\/figure>/);
assert.doesNotMatch(lanceCard, /item-card-showcase/);
const large = new Function("game","esc","MercenairesItemCard","equipmentArt","equipmentArtLarge","document",
  ui + "\nreturn {renderItemCard};"
)(game, esc, {createItemCards}, () => "assets/equipment/armes/lance-3.webp", () => "assets/equipment-large/armes/lance-3.webp", undefined);
assert.match(large.renderItemCard(item("weapon","Lance",3,"luxury")), /<figure class="item-card-art"><img src="assets\/equipment-large\/armes\/lance-3\.webp"/);
const sheetUi = fs.readFileSync(path.join(ROOT, "prototype-web/ui.js"), "utf8");
assert.match(sheetUi, /function equipmentArtLarge\(item\)\{\s*return equipmentArt\(item\)\?\.replace\("assets\/equipment\/","assets\/equipment-large\/"\)\|\|null;/);
assert.doesNotMatch(sheetUi, /gear-caption/, "plus de nom d'objet sur la silhouette");
for (const file of fs.readdirSync(path.join(ROOT, "prototype-web/assets/equipment"), {recursive:true}).filter(f => /\.webp$/.test(f) && !/^frames/.test(f))) {
  assert.ok(fs.existsSync(path.join(ROOT, "prototype-web/assets/equipment-large", file)), "grande image manquante : " + file);
}
const dodgeCard = renderItemCard(item("boots","Bottes d’esquive",2,"standard"));
assert.match(dodgeCard, /<strong class="item-card-title">Bottes de faufileur<\/strong>/);
assert.match(dodgeCard, /item-card-row--bonus"><dt>Esquive<\/dt><dd>\+10 %<\/dd>/);
assert.doesNotMatch(dodgeCard, /item-card-traits|Ajoute/, "pas de phrase qui répète les lignes (Idan, 2026-10-30)");
assert.doesNotMatch(dodgeCard, /item-card-quality/, "la qualité ne change pas le bonus des bottes");
const lionCard = renderItemCard(item("belt","Ceinture de courage",2,"standard"));
assert.match(lionCard, /item-card-row--bonus"><dt>Courage<\/dt><dd>\+10 %<\/dd>/);
assert.match(lionCard, /<dt>Courage<\/dt><dd>\+10 %<\/dd>/);
assert.match(renderItemCard(item("belt","Ceinture d’endurance",1,"worn")), /<dt>Endurance<\/dt><dd>\+5 %<\/dd>/);
assert.match(renderItemCard(item("belt","Ceinture de mana",3,"luxury")), /<dt>Réserve de mana<\/dt><dd>\+15 %<\/dd>/);
assert.doesNotMatch(lionCard, /item-card-quality/);
const cloverCard = renderItemCard(item("amulet","Amulette de chance",2,"standard"));
assert.match(cloverCard, /item-card-row--bonus"><dt>Chance<\/dt><dd>\+10 %<\/dd>/);
assert.match(cloverCard, /<dt>Chance<\/dt><dd>\+10 %<\/dd>/);
assert.match(renderItemCard(item("amulet","Amulette de volonté",3,"luxury")), /<dt>Volonté<\/dt><dd>\+15 %<\/dd>/);
assert.match(renderItemCard(item("amulet","Amulette de puissance magique",1,"worn")), /<dt>Puissance magique<\/dt><dd>\+5 %<\/dd>/);
assert.doesNotMatch(cloverCard, /item-card-quality/);
const rampartCard = renderItemCard(item("cape","Cape de résistance physique",3,"standard"));
assert.match(rampartCard, /item-card-row--bonus"><dt>Résistance physique<\/dt><dd>\+15<\/dd>/);
assert.doesNotMatch(rampartCard, /item-card-traits/);
assert.match(renderItemCard(item("cape","Cape d’esquive",2,"standard")), /<dt>Esquive<\/dt><dd>\+10 %<\/dd>/);
assert.match(renderItemCard(item("cape","Cape de discrétion",4,"luxury")), /<dt>Discrétion<\/dt><dd>\+20 %<\/dd>/);
assert.match(renderItemCard(item("gloves","Gants de force",2,"standard")), /<dt>Force<\/dt><dd>\+10 %<\/dd>/);
assert.match(renderItemCard(item("gloves","Gants de dextérité",1,"worn")), /<dt>Dextérité<\/dt><dd>\+5 %<\/dd>/);
assert.match(renderItemCard(item("gloves","Gants de pièges",3,"standard")), /<dt>Pièges<\/dt><dd>\+15 %<\/dd>/);
assert.match(renderItemCard(item("pants","String du Charisme",2,"standard")), /<dt>Charisme<\/dt><dd>\+10 %<\/dd>/);
assert.match(renderItemCard(item("pants","Culotte d’Intimidation",1,"worn")), /<dt>Intimidation<\/dt><dd>\+5 %<\/dd>/);
const briefsCard = renderItemCard(item("pants","Slip d’Affinité",4,"luxury"));
assert.match(briefsCard, /item-card-row--bonus"><dt>Affinité avec le capitaine<\/dt><dd>\+20<\/dd>/);
assert.doesNotMatch(briefsCard, /item-card-traits/);
assert.doesNotMatch(briefsCard, /item-card-quality/);
assert.match(renderItemCard(item("ring","Bague du courage",1,"worn")), /<dt>Courage<\/dt><dd>\+5 %<\/dd>/);
const fireCard = renderItemCard(item("ring","Bague de Feu",1,"worn"));
assert.match(fireCard, /<dt>Feu<\/dt><dd>\+10 %<\/dd>/);
assert.match(fireCard, /item-card-row--malus"><dt>Eau<\/dt><dd>−15 %<\/dd>/);
assert.match(fireCard, /item-card-row--malus"><dt>Télékinésie<\/dt><dd>−15 %<\/dd>/);
assert.doesNotMatch(fireCard, /item-card-traits|Retire/);
assert.doesNotMatch(renderItemCard(item("ring","Bague de l’Eau",4,"luxury")), /item-card-row--malus/);
console.log("Carte d'objet : titres par tier, effets avec la qualité, mise en forme — OK");
