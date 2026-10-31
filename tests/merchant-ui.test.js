"use strict";

// Écran du marchand (Idan, 2026-10-31) : portrait (ou initiales en attendant l'image) et nom ; onglets Acheter / Vendre ;
// une case par objet, le prix dessous ; à la vente, ses armes d'abord, avec un liseré ; l'affinité n'est pas affichée.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "prototype-web/merchant-ui.js"), "utf8");
const html = fs.readFileSync(path.join(root, "prototype-web/index.html"), "utf8");
const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const nodes = {};
const node = id => nodes[id] || (nodes[id] = {innerHTML:"", textContent:"", disabled:false});
const item = (id, name, tier) => ({id, name, tier, itemType:"weapon"});
const stock = [item("s1","Lance",1), item("s2","Lance",1), item("s3","Pistolet",3), {...item("s4","Gambison",2), itemType:"armor"}];
const game = {campaign:{day:3, company:{gold:800, stock, roster:[]}}};
let visit = null;
game.merchantRules = {visitOf:() => visit};
// Les onglets de catégorie de l'Intendance (quartermaster-ui.js), réutilisés pour la vente.
const STOCK_KINDS = ["weapon","armor","potion"];
const STOCK_TABS = [["weapon","Armes","melee"],["armor","Armures","armor"],["potion","Potions","flask"]];
const ui = new Function("game","$","esc","fmt","gearTile","gearIcon","renderAvatar","itemPublicName","tavernLog","saveGame","renderGame",
  "campaignRules","affinityRules","MercenairesMerchants","STOCK_KINDS","STOCK_TABS",
  js + "\nreturn {renderMerchant,merchantView,logMerchantMorning};")(
  game, node, esc, String, (slot, it) => `<tile ${it.id}>`, icon => `<icon ${icon}>`, m => `<avatar ${m.name}>`, it => it.name, () => {}, () => {}, () => {},
  () => ({companyRenown:() => ({total:400})}), () => null, {}, STOCK_KINDS, STOCK_TABS);

// Pas de marchand : le bouton du camp est grisé.
ui.renderMerchant();
assert.equal(node("camp-merchant-btn").disabled, true);
assert.match(node("merchant-head").innerHTML, /Pas de marchand aujourd’hui/);
assert.equal(node("merchant-tabs").innerHTML, "");

// Thorval est là : son nom sur le bouton, ses initiales en attendant son portrait, la caisse.
visit = {merchant:{id:"thorval-poudredefeu", name:"Thorval Poudredefeu", culture:"Nains du chaos", portrait:null}, affinity:44, steward:null,
  offers:[{id:0, item:item("a0","Pistolet",2), price:739}, {id:1, item:item("a1","Tromblon",4), price:7182}, {id:2, item:item("a2","Pistolet",2), price:739}],
  buyback:it => it.name === "Pistolet" ? {specialty:true, price:1900} : it.name === "Gambison" ? {specialty:false, price:null} : {specialty:false, price:20}};
ui.renderMerchant();
assert.equal(node("camp-merchant-btn").disabled, false);
assert.equal(node("camp-merchant-note").textContent, "Thorval Poudredefeu");
const head = node("merchant-head").innerHTML;
assert.match(head, /<h2>Thorval Poudredefeu<\/h2><small>Nains du chaos<\/small>/);
assert.match(head, /class="merchant-initials">TP</);
assert.match(head, /<b>800<\/b> PO/);
assert.doesNotMatch(head + node("merchant-content").innerHTML, /44|ffinit/, "l'affinité n'est pas affichée");
assert.match(node("merchant-tabs").innerHTML, /data-merchant-tab="buy">Acheter<small>3<\/small>/);
assert.match(node("merchant-tabs").innerHTML, /data-merchant-tab="sell">Vendre<small>4<\/small>/);
// Acheter : du plus cher au moins cher ; deux articles identiques en une case « 2 » ; trop cher → grisé.
let content = node("merchant-content").innerHTML;
assert.equal((content.match(/class="merchant-card"/g) || []).length, 2);
assert.match(content, /<tile a0><span class="stock-count">2<\/span>/);
assert.ok(content.indexOf("<tile a1>") < content.indexOf("<tile a0>"));
assert.match(content, /7182 PO<\/b>\s*<button type="button" class="merchant-action primary" data-merchant-buy="1" disabled title="Pas assez d’or">Acheter/);
assert.match(content, /739 PO<\/b>\s*<button type="button" class="merchant-action primary" data-merchant-buy="0">Acheter/);

// Vendre : par catégorie (les armes d'abord) ; deux lances en une case « 2 » ; ses armes d'abord, avec un liseré ; ce
// dont il ne veut pas est grisé.
ui.merchantView.tab = "sell";
ui.renderMerchant();
content = node("merchant-content").innerHTML;
assert.match(content, /class="stock-tab active" aria-selected="true" data-merchant-kind="weapon" title="Armes" aria-label="Armes : 3"><icon melee><small>3<\/small>/);
assert.match(content, /data-merchant-kind="potion"[^>]*disabled/, "catégorie vide : grisée");
assert.doesNotMatch(content, /<tile s4>/, "l'armure est dans son onglet");
assert.ok(content.indexOf("<tile s3>") < content.indexOf("<tile s1>"), "ses armes d'abord");
assert.match(content, /class="merchant-card merchant-card--wanted"[^>]*>\s*<span class="merchant-tile"><tile s3>/);
assert.match(content, /<tile s1><span class="stock-count">2<\/span>/);
assert.doesNotMatch(content, /<tile s2>/);
ui.merchantView.kind = "armor";
ui.renderMerchant();
assert.match(node("merchant-content").innerHTML, /data-merchant-sell="s4" disabled title="Il n’en veut pas">Vendre/);

// Son portrait, quand l'image existe ; l'intendant qui négocie, par son visage.
visit.merchant.portrait = "assets/merchants/thorval-poudredefeu.png";
visit.steward = {name:"Brunhild"};
ui.renderMerchant();
assert.match(node("merchant-head").innerHTML, /<img src="assets\/merchants\/thorval-poudredefeu\.png" alt="">/);
assert.match(node("merchant-head").innerHTML, /title="Brunhild négocie pour vous"><avatar Brunhild>/);

assert.match(html, /<div id="merchant-head" class="merchant-head"><\/div>/);
assert.match(html, /<div id="merchant-tabs" class="merchant-tabs" role="tablist"/);
console.log("Écran du marchand : portrait, onglets Acheter / Vendre, cases et prix, ses armes d'abord — OK");
