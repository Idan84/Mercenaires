"use strict";

// Intendance (Idan, 2026-10-23) : stock d'armes de la compagnie rangé par catégorie, doublons regroupés.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "prototype-web/quartermaster-ui.js"), "utf8");
const html = fs.readFileSync(path.join(root, "prototype-web/index.html"), "utf8");
const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const elements = {"quartermaster-stock":{innerHTML:""},"quartermaster-count":{textContent:""}};
const game = {campaign:{company:{stock:[]}}};
const ui = new Function("game","$","esc","gearTile",
  js + "\nreturn {stockGroups,renderQuartermaster};"
)(game, id => elements[id], esc, (slot,item) => `<tile ${item.qualityCode}>`);

const weapon = (name, category, tier) => ({
  name, category, tier, itemType:"weapon", owner:null,
  qualityCode:{1:"worn",2:"standard",3:"luxury"}[tier], qualityName:{1:"Usée",2:"Correcte",3:"Grand Luxe"}[tier]
});
game.campaign.company.stock = [
  weapon("Tromblon","Armes à feu",1), weapon("Écu","Boucliers",2), weapon("Arquebuse / Mousquet","Armes à feu",1),
  weapon("Tromblon","Armes à feu",1), weapon("Tromblon","Armes à feu",3)
];

const groups = ui.stockGroups(game.campaign.company.stock);
assert.deepEqual(groups.map(g => [g.category, g.count]), [["Armes à feu",4],["Boucliers",1]], "catégories triées");
assert.deepEqual(groups[0].rows.map(r => [r.item.name, r.item.tier, r.count]),
  [["Arquebuse / Mousquet",1,1],["Tromblon",1,2],["Tromblon",3,1]], "même arme et même tier : une ligne × 2");

ui.renderQuartermaster();
assert.equal(elements["quartermaster-count"].textContent, "5 armes");
const list = elements["quartermaster-stock"].innerHTML;
assert.match(list, /<h3>Armes à feu <small>4<\/small><\/h3>/);
assert.match(list, /Tromblon<\/span>\s*<span class="stock-tier stock-tier--worn">T1 · Usée<\/span>\s*<span class="stock-count">× 2<\/span>/);
assert.match(list, /stock-tier--luxury">T3 · Grand Luxe/);
assert.match(list, /<tile standard>/, "case d'objet de la fiche (picto, contour de qualité, détail au survol)");

game.campaign.company.stock = [];
ui.renderQuartermaster();
assert.equal(elements["quartermaster-count"].textContent, "0 arme");
assert.match(elements["quartermaster-stock"].innerHTML, /Le stock est vide/);

assert.match(html, /id="quartermaster-stock"/);
assert.ok(html.indexOf('src="quartermaster-ui.js"') > 0 && html.indexOf('src="quartermaster-ui.js"') < html.indexOf('src="ui.js"'));
console.log("Intendance : stock par catégorie, doublons regroupés, tiers — OK");
