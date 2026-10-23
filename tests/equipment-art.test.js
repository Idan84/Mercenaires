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

for (const key of EQUIPMENT_ART) {
  assert.ok(fs.existsSync(path.join(web, "assets/equipment", key + ".webp")), key);
}
for (const armor of armors) {
  for (const tier of [1,2,3,4]) assert.ok(EQUIPMENT_ART.has(`armures/${pictoSlug(armor.nom)}-${tier}`), `${armor.nom} T${tier}`);
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
const weaponTile = gearTile({id:"weapon_set_1_main",label:"Arme"}, {itemType:"weapon", name:"Hache de guerre", tier:1, qualityCode:"worn"});
assert.doesNotMatch(weaponTile, /gear-tile--art|<img/, "pas encore d'image d'arme : le picto reste");
assert.match(weaponTile, /<svg armor>/);

const css = fs.readFileSync(path.join(web, "styles.css"), "utf8");
for (const tier of [1,2,3,4]) assert.match(css, new RegExp(`\\.gear-tile--t${tier}::after\\{background-image:url\\("assets/equipment/frames/frame-${tier}\\.webp"\\)\\}`));
const html = fs.readFileSync(path.join(web, "index.html"), "utf8");
assert.ok(html.indexOf('src="equipment-art.js"') > 0 && html.indexOf('src="equipment-art.js"') < html.indexOf('src="ui.js"'));
console.log(`Équipement illustré : ${EQUIPMENT_ART.size} images, armures × 4 tiers, cadres, cases d'objet — OK`);
