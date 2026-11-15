"use strict";

// Tests UI du roster : affichage compact, places du dortoir (ni le capitaine ni l'intendant ; un ogre en prend deux,
// un halfling, un gnome ou un gobelin une demi ; Idan 2026-10-24), trois tris.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "prototype-web/ui.js"), "utf8");
const html = fs.readFileSync(path.join(root, "prototype-web/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "prototype-web/styles.css"), "utf8");
const extract = (from, to) => {
  const a = js.indexOf(from), b = js.indexOf(to, a + from.length);
  assert.ok(a >= 0 && b > a, from + " → " + to);
  return js.slice(a, b);
};
const escapeHTML = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const squad = [
  { id: 1, firstName: "Florine", familyName: "Orangefeuillu", name: "Florine Orangefeuillu", role: "Mercenaire initial", people: "Humain", culture: "Tribus de la jungle", pvMax: 223, reputation: 200, contract: { dailySalary: 37 }, affinity: -40 },
  { id: 2, firstName: "Octave", familyName: "Rivièrebrune", name: "Octave Rivièrebrune", role: "Recrue", people: "Nain", culture: "Montagnards", pvMax: 202, reputation: 350, contract: { dailySalary: 59 }, affinity: 80 },
  { id: 3, firstName: "Morgane", familyName: "Serpentvert", name: "Morgane Serpentvert", role: "Recrue", people: "Elfe", culture: "Forestiers", pvMax: 202, reputation: 130, contract: { dailySalary: 48 }, affinity: null }
];
const captain={id:0,name:"Capitaine"};
const game={captain,campaign:{company:{captainId:0,roster:[captain,...squad],camp:{dormitoryCapacity:40}}}};
const captainAffinity=c=>c.affinity==null?null:{total:c.affinity};
const affinityPresentation=score=>({filled:Math.floor((score+100)/20),phrase:"Affinité test"});
const renderCard=new Function("game","renderAvatar","renderPicto","renderReputationStars","captainAffinity","affinityPresentation","recoveryLabel","fmt","esc",extract("function rosterMetricIcon(", "\nfunction renderAudit()")+"\nreturn characterRow;")(
  game, () => "<figure class='avatar-frame'>portrait</figure>",
  (_,name)=>name?'<img class="picto" alt="" title="'+name+'">':"",
  c=>'<span class="rep-stars">★★★</span>',
  captainAffinity,affinityPresentation,()=> "Blessé",
  String,escapeHTML
);
const card=renderCard(squad[0]);
assert.match(card,/Florine Orangefeuillu/);
assert.match(card,/class="roster-name"/);
// Pictos peuple, culture puis ascendance, en colonne au bord droit ; « Sang de … » à côté de la culture (Idan, 2026-10-23).
assert.match(card,/class="roster-pictos"><img class="picto" alt="" title="Humain"><img class="picto" alt="" title="Tribus de la jungle"><\/span>/);
assert.match(card,/class="roster-culture">Tribus de la jungle<\/span>/,"sans ascendance : la culture seule");
const blooded=renderCard({...squad[1],ascendance:"Sang de dragon"});
assert.match(blooded,/title="Nain"><img class="picto" alt="" title="Montagnards"><img class="picto" alt="" title="Sang de dragon"><\/span>/);
assert.match(blooded,/class="roster-culture">Montagnards · Sang de dragon<\/span>/);
assert.match(card,/class="roster-metric-icon"/);
assert.match(card,/37 PO/);
assert.match(card,/roster-affinity-hearts/);
assert.match(card,/Affinité test/);
assert.match(card,/Tribus de la jungle/);
assert.doesNotMatch(card,/Mercenaire initial|Nom de famille|PV 223|PO\/j/);
assert.doesNotMatch(card,/>Humain ·/);
assert.equal((card.match(/<svg /g)||[]).length,2,"deux icônes : réputation et salaire");
assert.equal(renderCard(squad[2]).includes("roster-affinity-hearts"),false,"pas de score d'affinité inventé");

// Flèches précédent / suivant à côté du nom dans la fiche (Idan, 2026-10-24).
assert.match(html,/<button id="sheet-prev" class="sheet-nav"[^>]*>‹<\/button>\s*<h2 id="dialog-name"><\/h2>\s*<button id="sheet-next" class="sheet-nav"[^>]*>›<\/button>/);
assert.match(js,/function stepSheet\(step\)/);

const elements={
  "initial-count":{innerHTML:"",title:""},
  "roster-sort":{value:""},
  "roster-sort-direction":{
    textContent:"",attributes:{},
    setAttribute(k,v){this.attributes[k]=v},
    getAttribute(k){return this.attributes[k]}
  },
  "initial-squad":{innerHTML:""}
};
const {createCampaignRules}=require("../game-core/campaign.js");
const peoples=JSON.parse(fs.readFileSync(path.join(root,"data/reference/peoples.json"),"utf8"));
const rules=createCampaignRules({generator:{},tavern:{},reference:{peoples}});
const roster=new Function("game","$","teamCharacters","characterRow","captainAffinity","campaignRules",
  extract("let rosterSortKey=", "\nfunction renderGenerated()") +
  "\nreturn {rosterSortValue,sortMercenaryRoster,renderMercenaryRoster};"
)(game,id=>elements[id],()=>[captain,...squad],c=>"<item>"+c.id+"</item>",captainAffinity,()=>rules);
assert.deepEqual(roster.sortMercenaryRoster(squad,"reputation").map(x=>x.id),[2,1,3]);
assert.deepEqual(roster.sortMercenaryRoster(squad,"reputation",false).map(x=>x.id),[3,1,2]);
assert.deepEqual(roster.sortMercenaryRoster(squad,"salary").map(x=>x.id),[2,3,1]);
assert.deepEqual(roster.sortMercenaryRoster(squad,"salary",false).map(x=>x.id),[1,3,2]);
assert.deepEqual(roster.sortMercenaryRoster(squad,"affinity").map(x=>x.id),[2,1,3]);
assert.deepEqual(roster.sortMercenaryRoster(squad,"affinity",false).map(x=>x.id),[1,2,3],"affinité absente toujours en dernier");
assert.deepEqual(squad.map(x=>x.id),[1,2,3],"ne pas muter l'ordre de l'effectif");
roster.renderMercenaryRoster();
assert.match(elements["initial-count"].innerHTML,/3 mercenaires/);
assert.match(elements["initial-count"].innerHTML,/Dortoir : 3 \/ 40/,"le capitaine ne prend pas de place");
squad[2].people="Ogre";
roster.renderMercenaryRoster();
assert.match(elements["initial-count"].innerHTML,/Dortoir : 4 \/ 40/,"un ogre prend deux places");
game.campaign.company.intendantId=2;
roster.renderMercenaryRoster();
assert.match(elements["initial-count"].innerHTML,/Dortoir : 3 \/ 40/,"l'intendant ne prend pas de place");
assert.match(elements["initial-count"].title,/un ogre en prend deux ; un halfling, un gnome ou un gobelin une demi/);
squad[0].people="Gobelin";
roster.renderMercenaryRoster();
assert.match(elements["initial-count"].innerHTML,/Dortoir : 2,5 \/ 40/,"un gobelin : une demi-place");
squad[0].people="Humain";
delete game.campaign.company.intendantId;
squad[2].people="Elfe";
roster.renderMercenaryRoster();
assert.equal(elements["roster-sort"].value,"reputation");
assert.equal(elements["initial-squad"].innerHTML,"<item>2</item><item>1</item><item>3</item>");
assert.match(html,/id="roster-sort"/);
assert.match(html,/value="affinity"/);
assert.match(html,/id="roster-sort-direction"/);
assert.match(css,/\.roster-count\{[^}]*color:#eadcbc/);
assert.match(css,/#initial-squad\{grid-template-columns:1fr\}/);
console.log("Roster cards, capacity and sorting: OK");
