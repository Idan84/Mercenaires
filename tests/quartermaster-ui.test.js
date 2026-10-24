"use strict";

// Intendance (Idan, 2026-10-23) : stock d'armes de la compagnie rangé par catégorie, doublons regroupés.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "prototype-web/quartermaster-ui.js"), "utf8");
const html = fs.readFileSync(path.join(root, "prototype-web/index.html"), "utf8");
const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const elements = {"quartermaster-stock":{innerHTML:""},"quartermaster-count":{textContent:""},"quartermaster-tabs":{innerHTML:""}};
const game = {campaign:{company:{stock:[]}}};
const ui = new Function("game","$","esc","gearTile",
  js + "\nreturn {stockGroups,renderQuartermaster,stockView};"
)(game, id => elements[id], esc, (slot,item) => `<tile ${item.qualityCode}>`);

const weapon = (name, category, tier) => ({
  name, category, tier, itemType:"weapon", owner:null,
  qualityCode:{1:"worn",2:"standard",3:"luxury"}[tier], qualityName:{1:"Usée",2:"Correcte",3:"Grand Luxe"}[tier]
});
game.campaign.company.stock = [
  weapon("Tromblon","Armes à feu",1), weapon("Écu","Boucliers",2), weapon("Arquebuse","Armes à feu",1),
  weapon("Tromblon","Armes à feu",1), weapon("Tromblon","Armes à feu",3)
];

const groups = ui.stockGroups(game.campaign.company.stock);
assert.deepEqual(groups.map(g => [g.category, g.count]), [["Armes à feu",4],["Boucliers",1]], "catégories triées");
assert.deepEqual(groups[0].rows.map(r => [r.item.name, r.item.tier, r.count]),
  [["Arquebuse",1,1],["Tromblon",1,2],["Tromblon",3,1]], "même arme et même tier : une ligne × 2");

ui.renderQuartermaster();
assert.equal(elements["quartermaster-count"].textContent, "5 armes");
const list = elements["quartermaster-stock"].innerHTML;
assert.match(list, /<details class="stock-group" data-stock-group="weapon:Armes à feu">\s*<summary><h3>Armes à feu <small>4<\/small><\/h3><\/summary>/,
  "catégorie en accordéon, fermée par défaut");
assert.doesNotMatch(list, / open>/);
assert.match(list, /Tromblon<\/span>\s*<span class="stock-tier stock-tier--worn">T1 · Usée<\/span>\s*<span class="stock-count">× 2<\/span>/);
assert.match(list, /stock-tier--luxury">T3 · Grand Luxe/);
assert.match(list, /<tile standard>/, "case d'objet de la fiche (picto, contour de qualité, détail au survol)");

// Armures (Idan, 2026-10-24) : après les armes, de la plus légère à la plus lourde.
const armor = (name, category, tier) => ({...weapon(name, null, tier), category, itemType:"armor"});
game.campaign.company.stock = [armor("Armure de plates","Lourde",1), weapon("Écu","Boucliers",2), armor("Vêtements","Vêtement",1),
  armor("Gambison","Légère",2), armor("Cotte de mailles","Intermédiaire",1), armor("Armure de plates","Lourde",1)];
assert.deepEqual(ui.stockGroups(game.campaign.company.stock).map(g => [g.category, g.count]),
  [["Boucliers",1],["Vêtements",1],["Armures légères",1],["Armures intermédiaires",1],["Armures lourdes",2]]);
ui.renderQuartermaster();
assert.equal(elements["quartermaster-count"].textContent, "1 arme · 5 armures");
// Onglets par grande catégorie (Idan, 2026-10-24) : Armes d'abord, avec leur nombre.
const tabs = () => elements["quartermaster-tabs"].innerHTML;
assert.match(tabs(), /class="stock-tab active" aria-selected="true" data-stock-tab="weapon">Armes <small>1<\/small>/);
assert.match(tabs(), /data-stock-tab="armor">Armures <small>5<\/small>/);
assert.match(tabs(), /data-stock-tab="boots">Bottes <small>0<\/small>/);
assert.doesNotMatch(elements["quartermaster-stock"].innerHTML, /Armures lourdes/, "l'onglet Armes ne montre que les armes");
ui.stockView.tab = "armor";
ui.renderQuartermaster();
assert.match(elements["quartermaster-stock"].innerHTML, /<h3>Armures lourdes <small>2<\/small><\/h3>/);
assert.doesNotMatch(elements["quartermaster-stock"].innerHTML, /Boucliers/);
ui.stockView.tab = "boots";
ui.renderQuartermaster();
assert.match(elements["quartermaster-stock"].innerHTML, /Aucune paire de bottes en stock\./);
// Bottes (Idan, 2026-10-24) : après les armures.
game.campaign.company.stock.push({...weapon("Bottes de vitesse", "Bottes", 1), itemType:"boots"}, {...weapon("Bottes d’esquive", "Bottes", 2), itemType:"boots"});
assert.deepEqual(ui.stockGroups(game.campaign.company.stock).map(g => g.category).slice(-2), ["Armures lourdes","Bottes"]);
ui.renderQuartermaster();
assert.equal(elements["quartermaster-count"].textContent, "1 arme · 5 armures · 2 paires de bottes");
assert.match(elements["quartermaster-stock"].innerHTML, /<h3>Bottes <small>2<\/small><\/h3>/);
// Ceintures (Idan, 2026-10-24) : leur onglet, après les bottes.
game.campaign.company.stock.push({...weapon("Ceinture de courage", "Ceinture", 1), itemType:"belt"});
ui.renderQuartermaster();
assert.equal(elements["quartermaster-count"].textContent, "1 arme · 5 armures · 2 paires de bottes · 1 ceinture");
assert.match(elements["quartermaster-tabs"].innerHTML, /data-stock-tab="belt">Ceintures <small>1<\/small>/);
ui.stockView.tab = "belt";
ui.renderQuartermaster();
assert.match(elements["quartermaster-stock"].innerHTML, /<h3>Ceinture <small>1<\/small><\/h3>/);
// Amulettes (Idan, 2026-10-24) : leur onglet, après les ceintures.
game.campaign.company.stock.push({...weapon("Amulette de chance", "Amulette", 1), itemType:"amulet"});
ui.renderQuartermaster();
assert.equal(elements["quartermaster-count"].textContent, "1 arme · 5 armures · 2 paires de bottes · 1 ceinture · 1 amulette");
assert.match(elements["quartermaster-tabs"].innerHTML, /data-stock-tab="amulet">Amulettes <small>1<\/small>/);
ui.stockView.tab = "amulet";
ui.renderQuartermaster();
assert.match(elements["quartermaster-stock"].innerHTML, /<h3>Amulette <small>1<\/small><\/h3>/);
// Capes (Idan, 2026-10-24) : leur onglet, après les amulettes.
game.campaign.company.stock.push({...weapon("Cape d’esquive", "Cape", 1), itemType:"cape"});
ui.renderQuartermaster();
assert.equal(elements["quartermaster-count"].textContent, "1 arme · 5 armures · 2 paires de bottes · 1 ceinture · 1 amulette · 1 cape");
assert.match(elements["quartermaster-tabs"].innerHTML, /data-stock-tab="cape">Capes <small>1<\/small>/);
ui.stockView.tab = "cape";
ui.renderQuartermaster();
assert.match(elements["quartermaster-stock"].innerHTML, /<h3>Cape <small>1<\/small><\/h3>/);
// Gants (Idan, 2026-10-24) : leur onglet, après les capes.
game.campaign.company.stock.push({...weapon("Gants de force", "Gants", 1), itemType:"gloves"});
ui.renderQuartermaster();
assert.equal(elements["quartermaster-count"].textContent, "1 arme · 5 armures · 2 paires de bottes · 1 ceinture · 1 amulette · 1 cape · 1 paire de gants");
assert.match(elements["quartermaster-tabs"].innerHTML, /data-stock-tab="gloves">Gants <small>1<\/small>/);
ui.stockView.tab = "gloves";
ui.renderQuartermaster();
assert.match(elements["quartermaster-stock"].innerHTML, /<h3>Gants <small>1<\/small><\/h3>/);
ui.stockView.tab = "weapon";

// Une catégorie ouverte le reste quand l'écran se redessine.
ui.stockView.open.add("weapon:Boucliers");
ui.renderQuartermaster();
assert.match(elements["quartermaster-stock"].innerHTML, /data-stock-group="weapon:Boucliers" open>/);
ui.stockView.tab = "armor";
ui.renderQuartermaster();
assert.doesNotMatch(elements["quartermaster-stock"].innerHTML, / open>/, "les autres restent fermées");
ui.stockView.tab = "weapon";

game.campaign.company.stock = [];
ui.renderQuartermaster();
assert.equal(elements["quartermaster-count"].textContent, "0 arme");
assert.match(elements["quartermaster-stock"].innerHTML, /Le stock est vide/);

assert.match(html, /id="quartermaster-tabs" class="stock-tabs" role="tablist"/);
assert.match(html, /id="quartermaster-stock"/);
assert.ok(html.indexOf('src="quartermaster-ui.js"') > 0 && html.indexOf('src="quartermaster-ui.js"') < html.indexOf('src="ui.js"'));
console.log("Intendance : onglets, catégories en accordéon, doublons regroupés, tiers, armures, bottes — OK");
