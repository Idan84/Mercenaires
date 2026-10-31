"use strict";

// Notification du jour (Idan, 2026-10-31) : l'essentiel de la journée, de l'urgent au reste ; rien pour ce qui n'a pas
// eu lieu (pas de « aucun marchand »), l'argent en pied.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "prototype-web/day-news-ui.js"), "utf8");
const html = fs.readFileSync(path.join(root, "prototype-web/index.html"), "utf8");
const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const nodes = {};
const node = id => nodes[id] || (nodes[id] = {innerHTML:"", textContent:"", hidden:false, open:false, showModal(){ this.open = true; }, close(){ this.open = false; }});
const brakka = {id:2, name:"Brakka Os"}, lia = {id:3, name:"Lia Vent", sex:"Femme"};
const game = {campaign:{day:4, company:{gold:850, roster:[brakka, lia]}}, referenceData:null};
const ui = new Function("game","$","esc","fmt","renderAvatar","campaignCalendarDate","openCampScene",
  js + "\nreturn {dayDigest,showDayNews};")(game, node, esc, String, m => `<avatar ${m.id}>`, null, null);

const camp = {campName:"Camp gobelin", fields:{lieu:"Brumecendre"}, distance:2};
const report = {
  recovered:[{mercenary:lia, kind:"wounded"}],
  salaries:{total:70, count:2},
  tavern:{arrivals:[{mercenary:{id:9, name:"Erik"}}], departures:[]},
  expeditions:{arrived:[{memberIds:[2], offer:camp}], returned:[], departed:[]},
  merchant:{arrived:null, left:null},
  missionTaken:null, built:null
};
const entries = ui.dayDigest(report);
assert.deepEqual(entries.map(e => e.text), ["Escouade arrivée au camp gobelin de Brumecendre", "Guérie", "Nouveau candidat à la Taverne"],
  "l'urgent d'abord ; rien pour le marchand absent ni les départs de la Taverne");
assert.equal(entries[0].tone, "alert");
assert.equal(entries[2].go, "tavern", "« Voir » mène à la Taverne");

// Caisse dans le rouge : en tête des alertes ; le marchand arrivé a sa ligne.
game.campaign.company.gold = -40;
const second = ui.dayDigest({...report, expeditions:{}, merchant:{arrived:{name:"Ysolde", sex:"Femme"}}});
assert.equal(second[0].text, "Caisse dans le rouge");
assert.ok(second.some(e => e.text === "Marchande au camp : Ysolde" && e.go === "merchant"));

// Affichage : la date, une ligne par chose, les visages, l'argent en pied.
game.campaign.company.gold = 850;
ui.showDayNews(4, report);
assert.equal(node("day-news-title").textContent, "Jour 4", "sans calendrier, le numéro du jour");
const list = node("day-news-list").innerHTML;
assert.match(list, /day-news-entry--alert/);
assert.match(list, /<avatar 2>/);
assert.match(list, /data-day-news-go="tavern">Voir</);
assert.match(node("day-news-money").innerHTML, /Salaires <b>−70 PO<\/b> · Caisse <b>850 PO<\/b>/);
assert.equal(node("day-news-dialog").open, true);
// Une journée sans rien : pas de liste vide, seulement la date et l'argent.
ui.showDayNews(5, {salaries:{total:0}, tavern:{arrivals:[], departures:[]}, recovered:[], expeditions:{}});
assert.equal(node("day-news-list").hidden, true);

assert.match(html, /<script src="day-news-ui\.js"><\/script>/);
assert.doesNotMatch(html, /Aucune nouvelle\./);
for (const file of ["merchant-ui.js", "tavern-ui.js"]) {
  const source = fs.readFileSync(path.join(root, "prototype-web", file), "utf8");
  assert.doesNotMatch(source, /Pas de marchand au camp aujourd’hui|Personne n’a été engagé ailleurs/, file + " : pas de ligne pour ce qui n'a pas eu lieu");
}
console.log("Notification du jour : l'urgent d'abord, rien pour ce qui n'a pas eu lieu, visages, argent en pied — OK");
