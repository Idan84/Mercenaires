"use strict";

// Tableau des missions de la Taverne (Idan, 2026-10-31) : chaque mission au même gabarit ; au clic, le détail (faits,
// lettre, action). Trouver une mission (Idan, 2026-11-14) : les annonces sur le panneau de bois, trois par page.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "prototype-web/contract-ui.js"), "utf8");
const html = fs.readFileSync(path.join(root, "prototype-web/index.html"), "utf8");
const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const nodes = {};
const node = id => nodes[id] || (nodes[id] = {innerHTML:"", open:false, showModal(){ this.open = true; }, close(){ this.open = false; }, addEventListener(){},
  insertAdjacentHTML(where, text){ this.innerHTML += text; }});
const contract = {id:"c1", code:"cleanup", name:"Faire le ménage", campName:"Camp gobelin", faction:"Gobelins", difficulty:1, distance:2,
  reward:6800, day:1, expiresDay:5, order:"village", fields:{lieu:"Brumecendre", estimation:"une petite dizaine"}};
const guard = {id:"g1", kind:"bodyguard", client:"Une veuve fortunée", count:2, days:8, level:3, payment:1520, expiresDay:4};
// Taverne à 5 missions (Idan, 2026-11-01) : des cases, chacune une offre ou vide jusqu'au lendemain.
const slots = [{offer:contract}, {offer:guard}, {offer:null, emptyUntil:2}];
const game = {campaign:{day:1, tavernBoard:{slots}, expeditions:[], company:{roster:[]}},
  referenceData:{oneShotMissions:{missions:[{code:"cleanup", description:"Attaquer un camp ennemi.", illustration:""}]},
    bodyguardMissions:{illustration:"assets/missions/garde.webp", textes:{titre:"Garde du corps", offre:"{client} cherche {n} garde{s} du corps pour {jours} jours."}}}};
const listeners = {}, selections = [];
const arrows = {prev:{}, next:{}}, views = [];
const fakeDocument = {addEventListener:(type, fn) => { listeners[type] = fn; }, querySelector:selector => arrows[selector.replace(".mission-board-arrow--", "")]};
const ui = new Function("game","$","esc","fmt","saveGame","campaignRules","starRules","renderStarLevel","campaignCalendarDate",
  "MercenairesMissions","MercenairesRecruitDialogue","openMissionSelection","renderAvatar","document","startExpeditionCombat","showTavernView",
  js + "\nreturn {missionCards,renderContractBoard,openMissionDetail,initializeExpeditionUi,turnBoardPage,boardState,noticeLook};")(
  game, node, esc, String, () => {}, () => ({fillTavernBoard:() => false, tavernSlots:c => c.tavernBoard.slots, boardOffer:(c, {id}) => c.tavernBoard.slots.find(x => x.offer?.id === id)?.offer || null}),
  () => ({byLevel:level => ({level})}), info => `<stars ${info.level}>`, day => ({dayOfMonth:day, month:"Brumecendre", year:842}),
  {createMissionRules:() => ({orderText:() => ({from:"Chef de village", paragraphs:["À toute compagnie…"], signature:"Hugon"})})},
  {fill:(text, vars) => text.replace(/\{(\w+)\}/g, (all, key) => key in vars ? vars[key] : all)}, offer => selections.push(offer), () => "",
  fakeDocument, () => {}, view => views.push(view));
// Un clic sur un élément qui porte ce sélecteur (closest ne répond qu'à lui).
const clickOn = (attr, dataset = {}) => listeners.click({target:{closest:selector => selector.split(",").includes(attr) ? {dataset} : null}});

const cards = ui.missionCards();
assert.deepEqual(cards.map(c => [c.kind, c.type, c.title]),
  [["contract","Faire le ménage","Camp gobelin de Brumecendre"],["bodyguard","Garde du corps","Une veuve fortunée"],["empty",undefined,undefined]]);
for (const c of cards.filter(c => c.kind !== "empty")) for (const key of ["illustration","description","difficulty","reward","duration","facts","action"]) assert.ok(key in c, c.kind + " : " + key);
assert.equal(cards[0].difficulty.level, 1, "la difficulté de la mission, en étoiles");
assert.equal(cards[1].difficulty.label, "Réputation minimale");

// Les annonces : l'illustration (vide pour l'instant), le titre, les étoiles, l'or (le picto de la barre du haut) et le
// sablier ; ni type, ni description, ni case vide (« Rien. Même pas de parchemin. On a le fond en bois »).
ui.renderContractBoard();
const board = node("tavern-contracts").innerHTML;
assert.match(board, /^<div class="board-page">/, "une page d'annonces");
assert.equal((board.match(/<article class="board-notice"/g) || []).length, 2, "une annonce par mission, rien pour la case vide");
assert.match(board, /data-mission-open="contract:c1"/);
assert.match(board, /<div class="board-notice-art"><\/div>/, "sans image : le cadre vide");
assert.match(board, /<div class="board-notice-art" data-fade="[1-4]"><img src="assets\/missions\/garde\.webp"/, "avec image : l'illustration, et son masque d'estompage");
// La charte de la création : le lieu en Cinzel, « de … » en Garamond italique, le filet à la fleur de lys.
assert.match(board, /<h3 class="board-notice-title"><span class="board-notice-name">Camp gobelin<\/span><span class="board-notice-place">de Brumecendre<\/span><\/h3>/);
assert.match(board, /<h3 class="board-notice-title"><span class="board-notice-name board-notice-name--l">Une veuve fortunée<\/span><\/h3>/, "garde du corps : le client seul, titre long un peu plus petit");
assert.match(board, /<span class="board-notice-rule" aria-hidden="true"><i><\/i><\/span>/);
assert.match(board, /<stars 1>[\s\S]*<img class="board-notice-gold" src="assets\/hud\/picto-or\.webp" alt=""><b>6\u202f800<\/b>[\s\S]*M5\.5 2\.8h13[\s\S]*2 jours de marche/,
  "étoiles, or (avec l'espace des milliers), sablier et durée");
assert.doesNotMatch(board, /Faire le ménage|Garde du corps|Attaquer un camp|cherche 2 gardes|Nouvelle mission demain|PO</, "ni type, ni description, ni case vide");
assert.doesNotMatch(board, /M14\.8 9\.2/, "plus de symbole dollar");
// Chaque annonce a son allure (travers, papier, auréole, attache), toujours la même pour la même offre.
const looks = [...board.matchAll(/data-pin="(clou|punaises|cire)"(?: data-wax="(?:rouge|noire|bleue)"| data-head="[123]")? style="(--tilt:-?[\d.]+deg;--dy:-?[\d.]+;--tone:[\d.]+;--hue:-?[\d.]+deg;--stain-o:[01];--stain-x:\d+%;--stain-y:\d+%(?:;--sat:[\d.]+;--sale:1;--sale-x1:\d+%;--sale-y1:\d+%;--sale-x2:\d+%;--sale-y2:\d+%)?;--w:[\d.]+;--h:[\d.]+;--pli1:[^"]*)" data-paper="[1-8]"/g)];
assert.equal(looks.length, 2, "une allure par annonce");
ui.renderContractBoard();
assert.deepEqual([...node("tavern-contracts").innerHTML.matchAll(/data-pin="[^"]+"(?: data-(?:wax|head)="[^"]+")? style="[^"]+" data-paper="\d"/g)].map(m => m[0]), looks.map(m => m[0]), "la même allure à chaque affichage");
assert.match(board, /<span class="board-notice-paper" aria-hidden="true"><\/span>/);
// L'illustration du camp (Jean-Mi, 2026-11-14 : une gravure par peuple), sinon celle de la mission.
game.referenceData.oneShotMissions.missions[0].camps = [{faction:"Orcs", illustrations:["assets/missions/camp-orc-1.webp"]}, {faction:"Gobelins", illustrations:["assets/missions/camp-gobelin.webp"]}];
assert.equal(ui.missionCards()[0].illustration, "assets/missions/camp-gobelin.webp", "la gravure du camp de ce peuple");
// Plusieurs gravures pour un camp : chaque offre en tire une, toujours la même ; les offres se les partagent.
const variants = ["a", "b", "c"].map(x => "assets/missions/camp-gobelin-" + x + ".webp");
game.referenceData.oneShotMissions.missions[0].camps[1].illustrations = variants;
const picks = Array.from({length:12}, (_, i) => { contract.id = "v" + i; return ui.missionCards()[0].illustration; });
assert.ok(picks.every(p => variants.includes(p)), "une des gravures du camp");
assert.ok(new Set(picks).size > 1, "des offres différentes, des gravures différentes");
contract.id = "v3";
assert.equal(ui.missionCards()[0].illustration, picks[3], "la même offre, la même gravure");
contract.id = "c1";
delete game.referenceData.oneShotMissions.missions[0].camps;
// Une chasse : les gravures de la bête (missions[].illustrations).
game.referenceData.oneShotMissions.missions[0].illustrations = ["assets/missions/chasse-loups-1.webp"];
assert.equal(ui.missionCards()[0].illustration, "assets/missions/chasse-loups-1.webp", "sans camp : les gravures de la mission");
delete game.referenceData.oneShotMissions.missions[0].illustrations;
const realMissions = JSON.parse(fs.readFileSync(path.join(root, "data/reference/one-shot-missions.json"), "utf8")).missions;
for (const camp of realMissions.find(m => m.code === "cleanup").camps)
  for (const pic of camp.illustrations || [])
    assert.ok(fs.existsSync(path.join(root, "prototype-web", pic)), camp.faction + " : " + pic);
for (const mission of realMissions)
  for (const pic of mission.illustrations || [])
    assert.ok(fs.existsSync(path.join(root, "prototype-web", pic)), mission.code + " : " + pic);
// Les gardes du corps : la gravure du client, sinon l'illustration commune.
game.referenceData.bodyguardMissions.illustrations_clients = {"Une veuve fortunée":["assets/missions/garde-veuve-1.webp"]};
assert.equal(ui.missionCards().find(c => c.kind === "bodyguard").illustration, "assets/missions/garde-veuve-1.webp", "la gravure du client");
delete game.referenceData.bodyguardMissions.illustrations_clients;
const realGuards = JSON.parse(fs.readFileSync(path.join(root, "data/reference/bodyguard-missions.json"), "utf8"));
for (const client of realGuards.clients) assert.ok(realGuards.illustrations_clients[client]?.length, client + " : une gravure");
for (const [client, pics] of Object.entries(realGuards.illustrations_clients))
  for (const pic of pics) assert.ok(fs.existsSync(path.join(root, "prototype-web", pic)), client + " : " + pic);
assert.match(board, /<span class="board-notice-pins" aria-hidden="true"><i><\/i>/);
for (const wax of ["rouge", "noire", "bleue"]) assert.ok(fs.existsSync(path.join(root, "prototype-web/assets/taverne/cire-" + wax + ".webp")), "la cire " + wax);
// La matière du panneau (Jean-Mi, détourée par scripts/key-green-sheet.js) : chaque fichier existe et le CSS s'en sert.
const boardCss = fs.readFileSync(path.join(root, "prototype-web/styles.css"), "utf8");
for (const file of ["fleche-fer", "clou-1", "clou-2", "clou-3", "punaise-1", "punaise-2", "punaise-3", "lambeau-1", "lambeau-2", "lambeau-3"]) {
  assert.ok(fs.existsSync(path.join(root, "prototype-web/assets/taverne/" + file + ".webp")), file);
  assert.ok(boardCss.includes("assets/taverne/" + file + ".webp"), "le CSS utilise " + file);
}
assert.ok(looks.every(m => /data-pin="cire" data-wax=|data-pin="(?:clou|punaises)" data-head=/.test(m[0])), "une tête de clou pour les clous et punaises, une cire pour les cachets");
for (const file of ["estompe-1", "estompe-2", "estompe-3", "estompe-4"]) {
  assert.ok(fs.existsSync(path.join(root, "prototype-web/assets/taverne/" + file + ".webp")), file);
  assert.ok(boardCss.includes("assets/taverne/" + file + ".webp"), "le CSS utilise " + file);
}
// Idan, 2026-11-14 : un papier tirait vers le rouge. Sur 2 000 annonces : jamais plus de 1° vers le rouge, et environ
// une sur quatre est un vieux papier, désaturé et sali.
const many = Array.from({length: 2000}, (_, i) => ui.noticeLook("contract:offre-" + i));
assert.ok(many.every(l => Number(/--hue:(-?[\d.]+)deg/.exec(l.style)[1]) >= -1), "plus de papier rouge");
const oldShare = many.filter(l => l.style.includes("--sale:1")).length / many.length;
assert.ok(oldShare > .2 && oldShare < .36, "un vieux papier sur quatre environ : " + oldShare);
assert.ok(many.filter(l => l.style.includes("--sale:1")).every(l => /--hue:1\.0deg;.*--sat:\.72/.test(l.style)), "les vieux papiers : teint neutre, désaturés");
assert.deepEqual(new Set(many.map(l => l.fade)), new Set([1, 2, 3, 4]), "les quatre masques servent");
// Idan, 2026-11-14 : « trop le même gabarit, les mêmes défauts ». Huit feuilles de Jean-Mi, toutes tirées ; taille,
// plis, froissé et taches changent d'une annonce à l'autre.
for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
  assert.ok(fs.existsSync(path.join(root, "prototype-web/assets/taverne/feuille-" + n + ".webp")), "feuille " + n);
  assert.ok(boardCss.includes("assets/taverne/feuille-" + n + ".webp"), "le CSS utilise la feuille " + n);
}
assert.ok(!boardCss.includes("papier-annonce-"), "plus de papiers fabriqués");
assert.deepEqual(new Set(many.map(l => l.paper)), new Set([1, 2, 3, 4, 5, 6, 7, 8]), "les huit feuilles servent");
assert.ok(many.every(l => !([1, 6, 7].includes(l.paper) && l.pin === "punaises")), "pas de punaise sur un coin du haut arraché");
const varOf = (l, name) => (new RegExp("--" + name + ":(-?[\\d.]+)").exec(l.style) || [])[1];
assert.ok(many.every(l => +varOf(l, "w") >= .9 && +varOf(l, "w") <= 1 && +varOf(l, "h") >= .83 && +varOf(l, "h") <= .92), "des tailles un peu différentes");
assert.ok(new Set(many.map(l => varOf(l, "pli1"))).size > 10, "les plis ne tombent pas toujours au même endroit");
for (const mark of ["tache-o", "coul-o", "bord-o", "points-o"]) {
  const share = many.filter(l => l.style.includes("--" + mark + ":1")).length / many.length;
  assert.ok(share > .2 && share < .55, mark + " : " + share);
}
// Les titres longs rapetissent (Idan, 2026-11-14 : « réduis la police des longs titres »).
assert.match(board, /<span class="board-notice-name(?: board-notice-name--(?:m|l|xl))?">/);
for (const cls of ["m", "l", "xl"]) assert.ok(boardCss.includes(".board-notice-name--" + cls + "{"), "cran " + cls);
// Argent et Or (Idan, 2026-11-14) : le métal du niveau marque l'annonce (ici, le faux barème ne donne pas de métal).
assert.doesNotMatch(board, /data-metal=/, "bronze ou inconnu : rien de plus");
for (const metal of ["silver", "gold"]) assert.ok(boardCss.includes('.board-notice[data-metal="' + metal + '"] .board-notice-name{'), "titre " + metal);
assert.ok(many.every(l => [1, 2, 3, 4].every(k => { const x = varOf(l, "p" + k + "x"); return x === undefined || +x <= 20 || +x >= 80; })), "les chiures restent dans les marges");
assert.deepEqual([arrows.prev.hidden, arrows.next.hidden], [true, true], "une seule page : pas de flèches");
assert.doesNotMatch(js, /Escouades en mission/, "les escouades parties ne sont plus sur le tableau");

ui.openMissionDetail("contract:c1");
const detail = node("mission-detail-body").innerHTML;
assert.equal(node("mission-detail").open, true);
assert.match(detail, /<h2 id="mission-detail-title">Camp gobelin de Brumecendre<\/h2>/);
assert.match(detail, /Commanditaire<\/dt><dd>Chef de village/);
assert.match(detail, /class="contract-letter"><p>À toute compagnie…<\/p>/);
assert.match(detail, /data-contract-accept="c1">Accepter le contrat<\/button>/);
// « Accepter le contrat » (Idan, 2026-11-01 : le lancement du camp gobelin ne marchait plus) : le bouton est dans la
// fenêtre de détail, hors du tableau ; le clic la ferme et ouvre le choix de l'escouade.
ui.initializeExpeditionUi();
clickOn("[data-contract-accept]", {contractAccept:"c1"});
assert.equal(node("mission-detail").open, false, "le détail se ferme");
assert.deepEqual(selections, [contract], "le choix de l'escouade s'ouvre, avec le contrat");
const tavern = fs.readFileSync(path.join(root, "prototype-web/tavern-ui.js"), "utf8");
assert.doesNotMatch(tavern, /\$\("tavern-contracts"\)\.addEventListener/, "plus d'écoute sur l'ancien tableau (sinon deux ouvertures)");
ui.openMissionDetail("bodyguard:g1");
assert.match(node("mission-detail-body").innerHTML, /data-bodyguard-accept="g1">Choisir les gardes<\/button>/);
assert.doesNotMatch(node("mission-detail-body").innerHTML, /contract-letter/);
clickOn("[data-bodyguard-accept]", {bodyguardAccept:"g1"});
assert.deepEqual(selections, [contract, guard], "et la garde du corps, pareil");

// Trois par page ; les flèches pour les trois suivantes (cachées s'il n'y a qu'une page, grisées au bout).
const more = n => Array.from({length:n}, (_, i) => ({offer:{...contract, id:"m" + i, campName:"Camp n°" + i}}));
slots.splice(0, slots.length, ...more(7));
ui.renderContractBoard();
assert.equal((node("tavern-contracts").innerHTML.match(/<article class="board-notice"/g) || []).length, 3, "trois annonces par page");
assert.deepEqual([arrows.prev.hidden, arrows.prev.disabled, arrows.next.hidden, arrows.next.disabled], [false, true, false, false]);
ui.turnBoardPage(1);
assert.equal(ui.boardState.page, 1);
assert.match(node("tavern-contracts").innerHTML, /<div class="board-page">[\s\S]*Camp n°3[\s\S]*Camp n°5/, "la page suivante arrive");
ui.turnBoardPage(1);
ui.renderContractBoard();
assert.equal(ui.boardState.page, 2);
assert.equal((node("tavern-contracts").innerHTML.match(/<article class="board-notice"/g) || []).length, 1, "la dernière page : la septième");
assert.deepEqual([arrows.prev.disabled, arrows.next.disabled], [false, true], "au bout : la flèche suivante grisée");
ui.turnBoardPage(1);
assert.equal(ui.boardState.page, 2, "pas au-delà");

// Une mission qui part demain reste sur le tableau, avec « Annuler » sur l'annonce elle-même.
game.campaign.expeditions = [{id:"e1", kind:"contract", status:"scheduled", offer:contract}, {id:"e2", kind:"contract", status:"outbound", offer:contract}];
ui.boardState.page = 0;
ui.renderContractBoard();
const scheduled = node("tavern-contracts").innerHTML;
assert.match(scheduled, /^<div class="board-page"><article class="board-notice board-notice--scheduled" aria-label="Camp gobelin de Brumecendre" data-pin=/, "en tête, sans ouverture du détail");
assert.match(scheduled, /<p class="board-notice-stamp">Départ demain<\/p>/, "le tampon");
assert.match(scheduled, /<button type="button" data-expedition-cancel="e1"[^>]*>Annuler le départ<\/button>/);
assert.doesNotMatch(scheduled, /data-expedition-cancel="e2"/, "une escouade déjà partie n'est pas sur le tableau");
game.campaign.expeditions = [];

// Plus aucune offre : le bois nu.
slots.splice(0, slots.length, {offer:null, emptyUntil:2});
ui.renderContractBoard();
assert.equal(node("tavern-contracts").innerHTML, "", "toutes les cases prises : rien sur le panneau");

// Un clic sur le mur, autour du cadre, ramène à la taverne ; pas sur le panneau.
const boardAt = (clientX, clientY) => listeners.click({clientX, clientY, target:{closest:selector => selector === "[data-mission-board]"
  ? {getBoundingClientRect:() => ({left:0, top:0, width:2000, height:1116})} : null}});
boardAt(1000, 558);
assert.deepEqual(views, [], "sur les planches : on reste");
boardAt(100, 558);
boardAt(1000, 1100);
assert.deepEqual(views, ["home", "home"], "sur le mur : retour à la taverne");

const missionsView = html.slice(html.indexOf('<section id="tavern-missions-view"'), html.indexOf('<section id="tavern-canteen-view"'));
assert.match(missionsView, /<div class="mission-board" data-mission-board>/);
assert.match(missionsView, /data-board-page="-1"[\s\S]*id="tavern-contracts"[\s\S]*data-board-page="1"/, "une flèche de chaque côté");
assert.doesNotMatch(missionsView, /Retour à la taverne/, "plus de bouton retour");
assert.ok(fs.existsSync(path.join(root, "prototype-web/assets/taverne/panneau-missions.webp")), "le fond du panneau");
assert.match(html, /<dialog id="mission-detail" class="mission-detail"/);
for (const file of ["one-shot-missions.json", "bodyguard-missions.json"]) {
  const data = JSON.parse(fs.readFileSync(path.join(root, "data/reference", file), "utf8"));
  const holder = file === "one-shot-missions.json" ? data.missions[0] : data;
  assert.ok("illustration" in holder, file + " : champ illustration");
}
console.log("Tableau des missions : annonces sur le panneau, trois par page, flèches, départ annulable, détail, action — OK");
