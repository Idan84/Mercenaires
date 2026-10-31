"use strict";

// Intendance (Idan, 2026-10-23, refaite le 2026-10-31) : le stock de la compagnie en icônes, rangé par catégorie, doublons
// regroupés en une case avec leur nombre ; le nom et le détail au survol, pas de texte en double.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "prototype-web/quartermaster-ui.js"), "utf8");
const html = fs.readFileSync(path.join(root, "prototype-web/index.html"), "utf8");
const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const elements = {"quartermaster-stock":{innerHTML:""},"quartermaster-tabs":{innerHTML:""}};
const game = {campaign:{company:{stock:[]}}};
// Nom public selon le tier (item-titles.json), nom de base en petit (item-card-ui.js) ; jamais le tier (Idan, 2026-10-30).
const publicName = item => ({"Tromblon|1":"Tromblon qui crache","Tromblon|3":"Tromblon damasquiné"})[item.name+"|"+item.tier] || item.name;
const baseName = item => publicName(item) !== item.name ? item.name : "";
const ui = new Function("game","$","esc","gearTile","gearIcon","itemPublicName","itemBaseName",
  js + "\nreturn {stockGroups,renderQuartermaster,stockView};"
)(game, id => elements[id], esc, (slot,item) => `<tile ${item.qualityCode}>`, kind => `<icon ${kind}>`, publicName, baseName);

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
const list = elements["quartermaster-stock"].innerHTML;
assert.match(list, /<section class="stock-group" data-stock-group="weapon:Armes à feu">\s*<h3>Armes à feu<\/h3>/, "catégorie en petit intitulé");
assert.match(list, /aria-label="Tromblon qui crache × 2">\s*<tile worn><span class="stock-count">2<\/span>/, "une case, le nombre en pastille, le nom au survol");
assert.match(list, /aria-label="Tromblon damasquiné">\s*<tile luxury>\s*<\/li>/, "seul : pas de pastille");
assert.doesNotMatch(list, /stock-name|stock-tier|× \d+<\/span>/, "pas de nom ni de type en toutes lettres");
assert.doesNotMatch(list, /\bT[1-6]\b|Usée|Grand Luxe/, "jamais le tier ni la qualité en toutes lettres");

// Armures (Idan, 2026-10-24) : après les armes, de la plus légère à la plus lourde.
const armor = (name, category, tier) => ({...weapon(name, null, tier), category, itemType:"armor"});
game.campaign.company.stock = [armor("Armure de plates","Lourde",1), weapon("Écu","Boucliers",2), armor("Vêtements","Vêtement",1),
  armor("Gambison","Légère",2), armor("Cotte de mailles","Intermédiaire",1), armor("Armure de plates","Lourde",1)];
assert.deepEqual(ui.stockGroups(game.campaign.company.stock).map(g => [g.category, g.count]),
  [["Boucliers",1],["Vêtements",1],["Armures légères",1],["Armures intermédiaires",1],["Armures lourdes",2]]);
ui.renderQuartermaster();
// Onglets en icônes (Idan, 2026-10-31) : le nombre dessous, le nom au survol ; un onglet vide est grisé.
const tabs = () => elements["quartermaster-tabs"].innerHTML;
assert.match(tabs(), /class="stock-tab active" aria-selected="true" data-stock-tab="weapon" title="Armes" aria-label="Armes : 1"><icon melee><small>1<\/small>/);
assert.match(tabs(), /data-stock-tab="armor" title="Armures" aria-label="Armures : 5"><icon armor><small>5<\/small>/);
assert.match(tabs(), /data-stock-tab="boots" title="Bottes" aria-label="Bottes : 0" disabled><icon boots>/);
assert.match(tabs(), /data-stock-tab="potion" title="Potions"[^>]*><icon flask>/);
assert.doesNotMatch(elements["quartermaster-stock"].innerHTML, /Armures lourdes/, "l'onglet Armes ne montre que les armes");
ui.stockView.tab = "armor";
ui.renderQuartermaster();
assert.match(elements["quartermaster-stock"].innerHTML, /<h3>Armures lourdes<\/h3>/);
assert.doesNotMatch(elements["quartermaster-stock"].innerHTML, /Boucliers/);
// Un onglet devenu vide laisse la place au premier onglet qui a quelque chose.
ui.stockView.tab = "boots";
ui.renderQuartermaster();
assert.equal(ui.stockView.tab, "weapon");
// Bottes, ceintures, amulettes, capes, gants, culottes, bagues : chacun son onglet, dans cet ordre.
for (const [type, category] of [["boots","Bottes"],["belt","Ceinture"],["amulet","Amulette"],["cape","Cape"],["gloves","Gants"],["pants","Culotte"],["ring","Bague"]]) {
  game.campaign.company.stock.push({...weapon("Objet " + type, category, 1), itemType:type});
  ui.stockView.tab = type;
  ui.renderQuartermaster();
  assert.match(tabs(), new RegExp(`data-stock-tab="${type}"[^>]*aria-label="[^"]+ : 1"><icon`));
  assert.match(elements["quartermaster-stock"].innerHTML, new RegExp(`<h3>${category}<\\/h3>`));
}
assert.deepEqual(ui.stockGroups(game.campaign.company.stock).map(g => g.category).slice(4),
  ["Armures lourdes","Bottes","Ceinture","Amulette","Cape","Gants","Culotte","Bague"]);
ui.stockView.tab = "weapon";

game.campaign.company.stock = [];
ui.renderQuartermaster();
assert.match(elements["quartermaster-stock"].innerHTML, /Stock vide/);

assert.match(html, /id="quartermaster-tabs" class="stock-tabs" role="tablist"/);
assert.match(html, /id="quartermaster-stock"/);
assert.doesNotMatch(html, /quartermaster-count|Les échanges d’équipement et les retours de mission viendront ici/, "pas de texte en double");
assert.ok(html.indexOf('src="quartermaster-ui.js"') > 0 && html.indexOf('src="quartermaster-ui.js"') < html.indexOf('src="ui.js"'));
console.log("Intendance : onglets en icônes, cases d'objets, doublons regroupés, catégories, armures, bottes… — OK");
