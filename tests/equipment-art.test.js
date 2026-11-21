"use strict";

// Images d'équipement (Idan, 2026-10-23) : chaque armure a ses 4 tiers, les 4 cadres existent, et la case
// d'objet affiche l'image dans son cadre (ou garde son picto tant que l'objet n'a pas d'image).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const web = path.join(root, "prototype-web");
const {pictoSlug} = require(path.join(web, "picto-ui.js"));
const EQUIPMENT_ART = new Function(fs.readFileSync(path.join(web, "equipment-art.js"), "utf8") + "\nreturn EQUIPMENT_ART;")();
const armors = JSON.parse(fs.readFileSync(path.join(root, "data/reference/base-armors.json"), "utf8")).rows;
const weapons = JSON.parse(fs.readFileSync(path.join(root, "data/reference/weapons.json"), "utf8")).rows;
const boots = JSON.parse(fs.readFileSync(path.join(root, "data/reference/boots.json"), "utf8")).rows;
const belts = JSON.parse(fs.readFileSync(path.join(root, "data/reference/belts.json"), "utf8")).rows;
const amulets = JSON.parse(fs.readFileSync(path.join(root, "data/reference/amulets.json"), "utf8")).rows;
const capes = JSON.parse(fs.readFileSync(path.join(root, "data/reference/capes.json"), "utf8")).rows;
const gloves = JSON.parse(fs.readFileSync(path.join(root, "data/reference/gloves.json"), "utf8")).rows;
const pants = JSON.parse(fs.readFileSync(path.join(root, "data/reference/pants.json"), "utf8")).rows;
const rings = JSON.parse(fs.readFileSync(path.join(root, "data/reference/rings.json"), "utf8")).rows;

for (const key of EQUIPMENT_ART) {
  assert.ok(fs.existsSync(path.join(web, "assets/equipment", key + ".webp")), key);
}
for (const armor of armors) {
  for (const tier of [1,2,3,4]) assert.ok(EQUIPMENT_ART.has(`armures/${pictoSlug(armor.nom)}-${tier}`), `${armor.nom} T${tier}`);
}
for (const weapon of weapons) {
  for (const tier of [1,2,3,4]) assert.ok(EQUIPMENT_ART.has(`armes/${pictoSlug(weapon.nom)}-${tier}`), `${weapon.nom} T${tier}`);
}
// Bottes (Idan, 2026-10-24) : 3 types × 4 tiers.
for (const pair of boots) {
  for (const tier of [1,2,3,4]) assert.ok(EQUIPMENT_ART.has(`bottes/${pictoSlug(pair.nom)}-${tier}`), `${pair.nom} T${tier}`);
}
// Ceintures (Idan, 2026-10-24) : 3 types × 4 tiers.
for (const belt of belts) {
  for (const tier of [1,2,3,4]) assert.ok(EQUIPMENT_ART.has(`ceintures/${pictoSlug(belt.nom)}-${tier}`), `${belt.nom} T${tier}`);
}
// Amulettes (Idan, 2026-10-24) : 3 types × 4 tiers.
for (const amulet of amulets) {
  for (const tier of [1,2,3,4]) assert.ok(EQUIPMENT_ART.has(`amulettes/${pictoSlug(amulet.nom)}-${tier}`), `${amulet.nom} T${tier}`);
}
// Capes (Idan, 2026-10-24) : 3 types × 4 tiers.
for (const cape of capes) {
  for (const tier of [1,2,3,4]) assert.ok(EQUIPMENT_ART.has(`capes/${pictoSlug(cape.nom)}-${tier}`), `${cape.nom} T${tier}`);
}
// Gants (Idan, 2026-10-24) : 3 types × 4 tiers.
for (const pair of gloves) {
  for (const tier of [1,2,3,4]) assert.ok(EQUIPMENT_ART.has(`gants/${pictoSlug(pair.nom)}-${tier}`), `${pair.nom} T${tier}`);
}
// Culottes (Idan, 2026-10-24) : 3 types × 4 tiers.
for (const row of pants) {
  for (const tier of [1,2,3,4]) assert.ok(EQUIPMENT_ART.has(`culottes/${pictoSlug(row.nom)}-${tier}`), `${row.nom} T${tier}`);
}
// Bagues (Idan, 2026-10-24) : 11 types × 4 tiers.
// Bague de mana (Idan, 2026-11-21) : image à dessiner par Idan ; le picto s'affiche en attendant.
const RINGS_AWAITING_ART = new Set(["Bague de mana"]);
for (const row of rings) {
  if (RINGS_AWAITING_ART.has(row.nom)) {
    for (const tier of [1,2,3,4]) assert.ok(!EQUIPMENT_ART.has(`bagues/${pictoSlug(row.nom)}-${tier}`), `${row.nom} T${tier} : image arrivée, retirer l'exception`);
    continue;
  }
  for (const tier of [1,2,3,4]) assert.ok(EQUIPMENT_ART.has(`bagues/${pictoSlug(row.nom)}-${tier}`), `${row.nom} T${tier}`);
}
for (const tier of [1,2,3,4]) assert.ok(EQUIPMENT_ART.has(`frames/frame-${tier}`), `cadre T${tier}`);

// Case d'objet de la fiche (ui.js).
const js = fs.readFileSync(path.join(web, "ui.js"), "utf8");
const from = js.indexOf("const EQUIPMENT_ART_DIRS"), to = js.indexOf("function renderEquipment");
assert.ok(from > 0 && to > from);
const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const {gearTile} = new Function("EQUIPMENT_ART","pictoSlug","esc","gearIcon","gearKind","gearTooltip",
  js.slice(from, to) + "\nreturn {gearTile};"
)(EQUIPMENT_ART, pictoSlug, esc, kind => `<svg ${kind}>`, () => "armor", item => `<tip ${item.name}>`);

const armorTile = gearTile({id:"armor",label:"Armure"}, {itemType:"armor", name:"Armure d'écailles", tier:3, qualityCode:"luxury"});
assert.match(armorTile, /class="gear-tile is-filled gear-tile--luxury gear-tile--art gear-tile--t3"/);
assert.match(armorTile, /<img class="gear-art" src="assets\/equipment\/armures\/armure-d-ecailles-3\.webp"/);
assert.doesNotMatch(armorTile, /<svg/, "l'image remplace le picto");
assert.match(gearTile({id:"boots",label:"Bottes"}, {itemType:"boots", name:"Bottes d’esquive", tier:2, qualityCode:"standard"}),
  /src="assets\/equipment\/bottes\/bottes-d-esquive-2\.webp"/);
const weaponTile = gearTile({id:"weapon_set_1_main",label:"Arme"}, {itemType:"weapon", name:"Arme d'hast double", tier:1, qualityCode:"worn"});
assert.match(weaponTile, /gear-tile--art gear-tile--t1/);
assert.match(weaponTile, /src="assets\/equipment\/armes\/arme-d-hast-double-1\.webp"/);
const ringTile = gearTile({id:"ring_1",label:"Bague"}, {itemType:"ring", name:"Anneau", tier:2, qualityCode:"standard"});
assert.doesNotMatch(ringTile, /gear-tile--art|<img/, "objet sans image : le picto reste");
assert.match(ringTile, /<svg armor>/);

const css = fs.readFileSync(path.join(web, "styles.css"), "utf8");
for (const tier of [1,2,3,4]) assert.match(css, new RegExp(`\\.gear-tile--t${tier}::after\\{background-image:url\\("assets/equipment/frames/frame-${tier}\\.webp"\\)\\}`));
const html = fs.readFileSync(path.join(web, "index.html"), "utf8");
assert.ok(html.indexOf('src="equipment-art.js"') > 0 && html.indexOf('src="equipment-art.js"') < html.indexOf('src="ui.js"'));
console.log(`Équipement illustré : ${EQUIPMENT_ART.size} images, armures et armes × 4 tiers, cadres, cases d'objet — OK`);
