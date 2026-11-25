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
const many = Array.from({length: 2000}, (_, i) => ui.noticeLook("contract:offre-" + i, 1 + i % 15));
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
// Les plus abîmées pour les missions basses, les plus propres pour les hautes, sans rigidité (Idan, 2026-11-14).
const wear = [2, 6, 5, 1, 7, 8, 4, 3];
const meanRank = lvl => { const ls = Array.from({length: 600}, (_, i) => ui.noticeLook("contract:usure-" + i, lvl)); return ls.reduce((a, l) => a + wear.indexOf(l.paper), 0) / ls.length; };
assert.ok(meanRank(1) < 1.5 && meanRank(15) > 5.5 && meanRank(8) > 2.5 && meanRank(8) < 4.5, "rang moyen : " + [1, 8, 15].map(meanRank).join(" / "));
assert.ok(new Set(Array.from({length: 600}, (_, i) => ui.noticeLook("contract:usure-" + i, 1).paper)).size >= 3, "même au niveau 1, plusieurs feuilles");
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
for (const file of ["dague-argent-1", "dague-argent-2", "dague-or-1", "dague-or-2"]) {
  assert.ok(fs.existsSync(path.join(root, "prototype-web/assets/taverne/" + file + ".webp")), file);
  assert.ok(boardCss.includes("assets/taverne/" + file + ".webp"), "le CSS utilise " + file);
}
assert.ok(many.every(l => [1, 2, 3, 4].every(k => { const x = varOf(l, "p" + k + "x"); return x === undefined || +x <= 20 || +x >= 80; })), "les chiures restent dans les marges");
assert.deepEqual([arrows.prev.hidden, arrows.next.hidden], [true, true], "une seule page : pas de flèches");
assert.doesNotMatch(js, /Escouades en mission/, "les escouades parties ne sont plus sur le tableau");

ui.openMissionDetail("contract:c1");
const detail = node("mission-detail-body").innerHTML;
assert.equal(node("mission-detail").open, true);
// Le détail (Idan, 2026-11-14) : l'annonce en grand (même feuille, même attache, sans ouverture au clic), l'essentiel
// en pictos, la lettre du commanditaire scellée, le retour et le bouton de la création.
assert.match(detail, /<article class="board-notice board-notice--detail board-notice--lettre" aria-label="Camp gobelin de Brumecendre" data-pin=/);
assert.match(detail, /<h2 id="mission-detail-title" class="board-notice-title"><span class="board-notice-name">Camp gobelin<\/span><span class="board-notice-place">de Brumecendre<\/span><\/h2>/);
assert.doesNotMatch(detail, /data-mission-open|board-notice-stats|Commanditaire|Difficulté<|mission-detail-description/, "ni ouverture, ni libellés techniques");
assert.match(detail, /<ul class="mission-facts"><li><img class="mission-fact-picto" src="assets\/hud\/picto-or\.webp" alt=""><span><b>6\u202f800 pièces d’or<\/b><small>et le butin<\/small><\/span><\/li>/);
assert.match(detail, /<b>2 jours de marche<\/b><small>4 jours aller-retour<\/small>/);
assert.match(detail, /<li><svg[^>]*>[\s\S]*?<\/svg><span><b>Jusqu’au [^<]+<\/b><\/span><\/li>/, "l'échéance, sans précision inutile");
for (const icon of ["route", "swords", "candle"]) assert.ok(js.includes("  " + icon + ":'<path"), "picto " + icon);
assert.match(detail, /<article class="mission-letter" aria-label="La lettre du commanditaire">\s*<p class="mission-letter-head">À toute compagnie…<\/p>/);
assert.match(detail, /<img class="mission-letter-seal" src="assets\/creation\/cachet\.webp" alt="">/);
// « Deux feuilles différentes de papier pour la même mission… c'est ce qui me gêne le plus » (Idan, 2026-11-14) : une
// seule feuille, la sienne couchée, l'annonce d'un côté du pli et la lettre de l'autre.
assert.equal((detail.match(/class="board-notice[ "]/g) || []).length, 1, "une seule feuille");
assert.match(detail, /<\/ul><article class="mission-letter"[\s\S]*<\/article>\s*<\/article><\/div>/, "la lettre est sur la feuille de l'annonce");
for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
  assert.ok(fs.existsSync(path.join(root, "prototype-web/assets/taverne/feuille-" + n + "-large.webp")), "feuille couchée " + n);
  assert.ok(boardCss.includes(`.board-notice--lettre[data-paper${n === 1 ? "" : `="${n}"`}]{--feuille:url("assets/taverne/feuille-${n}-large.webp")}`), "le CSS couche la feuille " + n);
}
assert.doesNotMatch(boardCss, /feuille-3\.webp"\) 0 0 \/ 100% 100% no-repeat;color/, "plus de feuille à part pour la lettre");
assert.match(detail, /<button type="button" class="mission-retour" data-mission-close>‹ Retour au panneau<\/button><button type="button" class="mission-btn" data-contract-accept="c1">/);
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
assert.doesNotMatch(node("mission-detail-body").innerHTML, /mission-letter/, "pas de lettre pour une garde du corps");
assert.match(node("mission-detail-body").innerHTML, /<div class="mission-sheets"><article class="board-notice board-notice--detail" /, "l'annonce seule, debout");
assert.match(node("mission-detail-body").innerHTML, /<b>[^<]+ pièces d’or<\/b><small>payées d’avance<\/small>/);
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

// Le choix de l'escouade (Idan, 2026-11-15 : « ni la mise en page, ni le contenu n'allait » ; puis « Oui, vas-y avec la
// maquette de Chatty ») : la mission en grand ; à gauche, les mercenaires au camp (recherche, tags, galerie et flèches) ;
// à droite, l'escouade ; le retour en bas à gauche.
const missionJs = fs.readFileSync(path.join(root, "prototype-web/mission.js"), "utf8");
const choiceCss = fs.readFileSync(path.join(root, "prototype-web/styles.css"), "utf8");
const choiceStart = html.indexOf('<dialog id="mission-select-dialog"');
const choiceDialog = html.slice(choiceStart, html.indexOf("</dialog>", choiceStart));
assert.match(choiceDialog, /class="mission-detail mission-choice"/, "sur le panneau assombri, comme le détail");
const at = id => choiceDialog.indexOf(id);
assert.ok(at('id="mission-select-title"') < at('class="mission-recruits"') && at('class="mission-recruits"') < at('class="mission-squad"'),
  "la mission en haut, les mercenaires au camp à gauche, l'escouade à droite");
assert.ok(at('id="mission-select-search"') < at('id="mission-select-tags"') && at('id="mission-select-tags"') < at('id="mission-select-list"'),
  "la recherche, les tags, puis la galerie");
assert.match(choiceDialog, /<aside class="mission-squad"[\s\S]*id="mission-select-count"[\s\S]*id="mission-squad-slots"[\s\S]*id="mission-squad-fatigue"[\s\S]*id="mission-select-cost"[\s\S]*class="mission-btn">Partir demain</,
  "l'escouade : le compte, les places, les fatigués, les primes, le départ");
assert.match(choiceDialog, /<footer class="mission-choice-foot">\s*<button type="button" id="cancel-mission-select-btn" class="mission-retour">/, "le retour en bas à gauche");
assert.match(choiceCss, /\.mission-recruits::before\{[^}]*parchemin\.webp/, "les mercenaires au camp sur le parchemin de la création");
assert.equal((choiceDialog.match(/class="mission-corner mission-corner--(tl|tr|bl|br)"/g) || []).length, 4, "les coins de bronze du panneau");
// « Je veux pas des flèches de défilement. Ce sont des flèches de clic » ; « on a 12 mercenaires visibles. On clique, on
// en voit 12 autres » ; « avec des clics, on ne devrait jamais avoir des portraits coupés » : des pages de cartes entières,
// à gauche comme à droite, jamais de défilement.
assert.match(choiceCss, /\.mission-roster\{[^}]*overflow:hidden[^}]*grid-template-columns:repeat\(var\(--cols,5\),var\(--card,180px\)\)/);
assert.doesNotMatch(choiceCss, /\.mission-roster\{[^}]*(overflow-y:auto|mask:)/, "ni défilement ni carte à moitié effacée");
assert.match(choiceCss, /\.mission-squad-frame\{(?![^}]*overflow-y:auto)[^}]*\}/, "l'escouade ne défile pas non plus");
assert.match(choiceCss, /\.mission-pick\.is-off-page\{display:none\}/);
assert.match(choiceDialog, /data-roster-page="-1"[\s\S]*data-roster-page="1"/, "des flèches pour la galerie");
assert.doesNotMatch(choiceDialog, /data-squad-page/, "« Comme ça pas de flèche » pour l'escouade");
assert.doesNotMatch(choiceDialog, /data-roster-scroll/);
assert.match(choiceCss, /\.mission-scroll\{[^}]*fleche-fer\.webp/, "la flèche de fer du panneau");
// « Un léger problème d'alignement de ces flèches » : celle du haut est celle du bas retournée, sur le même axe.
assert.match(choiceCss, /\.mission-scroll--down\{[^}]*transform:rotate\(90deg\)\}/);
assert.match(choiceCss, /\.mission-scroll--up\{[^}]*transform:rotate\(90deg\) scaleX\(-1\)\}/);
assert.match(choiceCss, /\.mission-scroll:disabled\{/, "grisées au début et à la fin, comme celles du panneau");
// « Gardons le carré pour la sélection, c'est natif. Le 4:3 plus petit à droite. »
assert.match(choiceCss, /\.mission-pick-portrait\{[^}]*aspect-ratio:1\}/);
assert.match(choiceCss, /\.mission-slot-portrait\{[^}]*aspect-ratio:4\/3\}/);
const choice = missionJs.slice(missionJs.indexOf("function openMissionSelection("), missionJs.indexOf("function startMissionFromSelection("));
assert.doesNotMatch(choice, /scrollBy|scrollTop|updateMissionRosterScroll/, "plus de défilement");
{
  const grid = new Function(choice.slice(choice.indexOf("function missionChoiceGrid("), choice.indexOf("// La page qui contient")) + "\nreturn missionChoiceGrid;")();
  const pageOf = new Function(choice.slice(choice.indexOf("function missionChoicePage("), choice.indexOf("// Les flèches, comme celles du panneau")) + "\nreturn missionChoicePage;")();
  // Toutes les cartes tiennent en entier dans la page, avec un portrait confortable.
  for (const [width, height, extra] of [[994, 740, 100], [830, 560, 100], [589, 368, 100], [1400, 1000, 90]]) {
    const g = grid({width, height, extra, gapX: 14, gapY: 18});
    assert.ok(g.cols * g.side + (g.cols - 1) * 14 <= width, `${width}×${height} : la largeur tient`);
    assert.ok(g.rows * (g.side + extra) + (g.rows - 1) * 18 <= height, `${width}×${height} : la hauteur tient`);
    assert.ok(g.side >= 120 && g.side <= 200, `${width}×${height} : un portrait confortable (${g.side})`);
    assert.equal(g.size, g.cols * g.rows);
  }
  const big = grid({width: 994, height: 740, extra: 100, gapX: 14, gapY: 18});
  assert.equal(big.size, 21, "en 1920 × 1080 : trois rangées de sept");
  // Rien ne tient à 120 : un portrait plus petit plutôt qu'aucun.
  assert.ok(grid({width: 600, height: 300, extra: 100}).side >= 80);
  assert.deepEqual(pageOf(30, 21, 0), {page: 0, pages: 2});
  assert.deepEqual(pageOf(30, 21, 5), {page: 1, pages: 2}, "pas au-delà de la dernière page");
  assert.deepEqual(pageOf(30, 21, -1), {page: 0, pages: 2});
  assert.deepEqual(pageOf(13, 12, Infinity), {page: 1, pages: 2}, "le nouveau venu : la dernière page");
  assert.deepEqual(pageOf(0, 12, 0), {page: 0, pages: 1});
}
assert.match(choice, /function missionPageArrows\(scope,page,pages\)\{[\s\S]*?arrow\.hidden=pages<2;[\s\S]*?arrow\.disabled=off;/, "cachées s'il n'y a qu'une page, grisées au bout");
// « La molette tourne les pages aussi » (un choix global, AGENTS.md), sur la galerie et sur le panneau des annonces.
assert.match(missionJs, /addEventListener\("wheel",pageWheel\(dir=>showMissionRosterPage\(/);
assert.match(fs.readFileSync(path.join(root, "prototype-web/contract-ui.js"), "utf8"), /addEventListener\("wheel",pageWheel\(turnBoardPage\),\{passive:false\}\)/);
assert.match(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"), /jamais de défilement[\s\S]*flèches de clic et par la molette/, "la règle, pour tout le jeu");
{
  const wheel = new Function("Date", choice.slice(choice.indexOf("function pageWheel("), choice.indexOf("// L'escouade : les portraits choisis")) + "\nreturn pageWheel;");
  let now = 1000; const turns = [];
  const handler = wheel({now: () => now})(dir => turns.push(dir));
  const ev = (deltaY) => ({deltaX: 0, deltaY, deltaMode: 0, preventDefault() {}});
  handler(ev(120)); assert.deepEqual(turns, [1], "un cran de molette : la page suivante");
  for (let i = 0; i < 10; i++) { now += 16; handler(ev(30)); }
  assert.deepEqual(turns, [1], "le même geste (pavé tactile) ne tourne qu'une page");
  now += 400; handler(ev(-120)); assert.deepEqual(turns, [1, -1], "un geste plus tard, vers le haut : la page précédente");
}
// « Au lieu de les avoir sélectionnés à gauche, on les retire à gauche » ; retiré de l'escouade, il revient.
assert.match(choice, /card\.hidden=order\.includes\(Number\(input\?\.value\)\)\|\|/);
assert.match(choice, /renderMissionSquad\(\);\s*refreshMissionRoster\(\);/);
assert.doesNotMatch(choice + choiceCss, /mission-pick-seal/, "plus de cachet : le choisi n'est plus à gauche");
// « La taille de portrait relative au nombre de mercenaires de l'escouade… pas de flèche » : tout tient, toujours ; « ils
// sont trop petits… ils devraient être à 4 col - 5 lignes. Ça rentre » : les plus grands possibles.
{
  const squadGrid = new Function(choice.slice(choice.indexOf("function missionSquadGrid("), choice.indexOf("function layoutMissionSquad(")) + "\nreturn missionSquadGrid;")();
  const fits = (g, count, width, height) => {
    const rows = Math.ceil(count / g.cols);
    return g.cols * g.side + (g.cols - 1) * 10 <= width && rows * (g.side * 3 / 4 + (g.named ? 46 : 16)) + (rows - 1) * 10 <= height;
  };
  let last = null;
  for (let count = 1; count <= 20; count++) {
    const g = squadGrid({count, width: 476, height: 496});
    assert.ok(fits(g, count, 476, 496), `${count} : toute l'escouade tient`);
    if (last) {
      assert.ok(g.side <= last.side, `${count} : un de plus ne fait jamais grandir les portraits`);
      assert.ok(!g.named || last.named, `${count} : ni revenir les noms`);
    }
    last = g;
  }
  const twenty = squadGrid({count: 20, width: 476, height: 496});
  assert.equal(twenty.cols, 4, "20 en 1920 × 1080 : 4 colonnes…");
  assert.equal(Math.ceil(20 / twenty.cols), 5, "… et 5 rangées");
  assert.ok(twenty.side >= 95, `des portraits plus grands qu'avant (${twenty.side})`);
  // « Je préfère que ça soit dynamique. On remplit le panneau en fonction du nombre de mercenaires » : seul, il le remplit.
  const one = squadGrid({count: 1, width: 476, height: 496});
  assert.deepEqual([one.cols, one.side, one.named], [1, 476, true], "un seul : toute la largeur du panneau, avec son nom");
  assert.ok(squadGrid({count: 2, width: 476, height: 496}).side < one.side, "un de plus : plus petits");
  const six = squadGrid({count: 6, width: 476, height: 496});
  assert.deepEqual([six.cols, six.named], [3, true], "6 : trois par rangée, avec le nom");
  const small = squadGrid({count: 19, width: 476, height: 178});
  assert.equal(Math.ceil(19 / small.cols), 3, "petit écran : trois rangées");
  assert.ok(fits(small, 19, 476, 178));
  assert.equal(squadGrid({count: 0, width: 476, height: 496}).cols, 1, "personne : rien à placer");
}
// « Tous ceux qui peuvent pas partir en mission sont déjà filtrés (blessés, autres missions…). Les fatigués sont là. »
assert.match(choice, /const available=eligible\.filter\(c=>!missionWounded\(c\)\);[\s\S]*renderMissionChoice\(available,/, "les blessés ne sont pas dans la galerie");
assert.match(choice, /&&rules\.canGuard\(c,m,offer\)\.ok\);/, "garde du corps : seulement ceux qui peuvent la prendre");
// L'état sous le portrait : prêt, fatigué −20 % (encore fatigué au combat) ou reposé à l'arrivée.
assert.match(choice, /kind:"ready",label:missionFem\(c,"Prêt"\)/);
assert.match(choice, /kind:"rested",label:missionFem\(c,"Reposé"\)\+" à l’arrivée"/);
assert.match(choice, /kind:"tired",label:missionFem\(c,"Fatigué"\)\+" −"\+missionFatiguePercent\(\)\+" %"/);
// « Picto de combat, on va le virer » ; ni grisés, ni PV, ni peuple, ni mots de dev.
assert.doesNotMatch(choice, /unavailable|"disabled"|profile\?\.type|maxHp|c\.people/);
// Les tags (Idan, 2026-11-22 ; doc 20 §12) : « Tous » (éteint à l'ouverture), puis ceux de l'atelier que portent les
// mercenaires de la galerie, les plus portés d'abord, au-delà de quatre dans « Autres compétences » (Idan, 2026-11-22).
assert.match(choice, /const lists=typeof mercenaryTagLists==="function"\?mercenaryTagLists\(list\):new Map\(\);/);
assert.match(choice, /tab\("","Tous"\)\s*\+main\.map\(id=>tab\(id,names\.get\(id\)\)\)/);
assert.match(missionJs, /const MISSION_CHOICE_TABS=4;/);
assert.match(choice, />Autres compétences<\/button>/);
assert.match(missionJs, /picked\?picked\.textContent:"Autres compétences"/);
assert.doesNotMatch(missionJs, /missionTag|tagRules/, "plus de tag de la mission (l'ancien arbre)");
// L'escouade : x / 20, la croix, et la règle de la fatigue en clair.
assert.match(choice, /\$\("mission-select-count"\)\.textContent=ids\.length\+" \/ "\+max;/);
assert.match(choice, /class="mission-slot-remove" data-squad-remove=/);
assert.match(choice, /" encore fatigué"\+\(still>1\?"s":""\)\+" au combat \(−"/);
assert.match(choice, /min:1,max:20/, "un contrat : de 1 à 20");
// « Les persos sont cliquables et ça ouvre la fiche complète ? » → clic sur le nom : la fiche s'ouvre par-dessus ; le
// portrait, lui, ajoute à l'escouade.
assert.match(choice, /<button type="button" class="mission-pick-name" data-sheet-open="\$\{c\.id\}"/);
assert.match(missionJs, /function openMissionChoiceSheet\(event\)\{[\s\S]*?event\.preventDefault\(\);[\s\S]*?showCharacter\(c\);/);
assert.match(missionJs, /\$\("mission-select-list"\)\.addEventListener\("click",openMissionChoiceSheet\);/);
// La fiche au survol (Idan, 2026-11-15) : le contenu d'Idan ; le cadre de SA culture. Branchée dans le choix de
// l'escouade (Idan, 2026-11-16 : « On devait le brancher dans les missions ») : la galerie et l'escouade, au survol.
{
  const hoverSrc = fs.readFileSync(path.join(root, "prototype-web/hover-card-ui.js"), "utf8");
  // Où la poser : à droite du portrait s'il y a la place, sinon à gauche, sinon du côté le plus large en rapetissant ;
  // jamais hors de l'écran, avec la marge des ornements qui débordent.
  const {hoverCardPlacement} = require(path.join(root, "prototype-web/hover-card-ui.js"));
  const view = {w: 1920, h: 1080}, card = {w: 860, h: 565};
  assert.deepEqual(hoverCardPlacement({anchor: {left: 300, top: 400, right: 450, bottom: 620}, view, card}), {x: 462, y: 228, scale: 1, side: "right"});
  assert.deepEqual(hoverCardPlacement({anchor: {left: 1500, top: 100, right: 1650, bottom: 300}, view, card}), {x: 628, y: 30, scale: 1, side: "left"}, "l'escouade, à droite : à gauche du portrait, sous le haut de l'écran");
  const small = hoverCardPlacement({anchor: {left: 500, top: 600, right: 620, bottom: 760}, view: {w: 1366, h: 768}, card});
  assert.equal(small.side, "right");
  assert.ok(small.scale < 1 && small.scale >= .6 && small.x >= 632 && small.x + 860 * small.scale <= 1366 - 30 + .5, JSON.stringify(small));
  assert.ok(small.y + 565 * small.scale <= 768 - 30 + .5, "dans l'écran");
  assert.ok(hoverCardPlacement({anchor: {left: 10, top: 10, right: 50, bottom: 50}, view: {w: 800, h: 450}, card}).scale <= (450 - 60) / 565 + .001, "un petit écran : plus petite");
  assert.match(choice, /<label class="mission-pick" data-hover-card="\$\{c\.id\}"/, "la galerie");
  assert.match(missionJs, /<div class="mission-slot" data-hover-card="\$\{c\.id\}">/, "l'escouade");
  assert.match(missionJs, /box\.innerHTML=renderMercenaryHoverCard\(c\);[\s\S]*?fitHoverCard\(card\);[\s\S]*?hoverCardPlacement\(/);
  assert.match(missionJs, /for\(const id of \["mission-select-list","mission-squad-slots"\]\)\{\s*\$\(id\)\.addEventListener\("pointerover",onMissionChoiceHover\);\s*\$\(id\)\.addEventListener\("pointerout",onMissionChoiceHoverOut\);/);
  assert.match(missionJs, /\$\("mission-select-dialog"\)\.addEventListener\("close",hideMissionChoiceHover\);/);
  assert.match(missionJs, /if\(event\.pointerType&&event\.pointerType!=="mouse"\) return;/, "à la souris seulement");
  assert.match(html, /<div id="mission-choice-hover" class="mission-choice-hover" aria-hidden="true" hidden><\/div>\s*<\/dialog>/, "dans la fenêtre du choix (au premier plan)");
  assert.match(choiceCss, /\.mission-choice-hover\{position:fixed;[^}]*pointer-events:none;transform:scale\(var\(--hc-scale,1\)\);transform-origin:0 0\}/);
  assert.match(html, /<script src="contract-ui\.js"><\/script>\s*<script src="hover-card-ui\.js"><\/script>/);
  const HUD_BARS = new Function(fs.readFileSync(path.join(root, "prototype-web/hud-bars.js"), "utf8") + "\nreturn HUD_BARS;")();
  // Les tags de l'atelier, calculés par le jeu (mercenaryTagList, ui.js) : déjà les plus précis.
  const tagList = [{id: "a1", name: "Archer", parent: "Tireur"}, {id: "s1", name: "Soigneur occasionnel", parent: "Soigneur"}, {id: "g1", name: "Grosse Brute", parent: "Ce qu'il est"}];
  const stubs = {
    game: {referenceData: {spells: {rows: [{code: "boule", nom: "Boule de feu", ecole: "Feu"}, {code: "soin", nom: "Soin", ecole: "Vie"}]}, mounts: {rows: [{code: "loup", nom: "Loup de combat"}]}}},
    mercenaryTagList: () => tagList,
    profileRules: () => null, captainAffinity: () => null, tavernRules: () => ({missionBonusDemand: () => 40}), HUD_BARS
  };
  const api = new Function(...Object.keys(stubs), hoverSrc + "\nreturn {mercenaryHoverData, hoverCultureFrame, originPhrase};")(...Object.values(stubs));
  const merc = {name: "Yazga", people: "Orc", culture: "Orcs des steppes", contract: {missionBonus: 81},
    spells: [{code: "boule"}, {code: "soin"}, {code: "boule"}],
    items: [{id: 1, name: "Épée longue", category: "Lames longues"}, {id: 2, name: "Épée courte", category: "Lames courtes"},
      {id: 3, name: "Arc", category: "Armes de tir"}, {id: 4, name: "Armure de cuir", category: "Légère"},
      {id: 5, itemType: "mount", name: "Croc-Noir", mountCode: "loup"}],
    equipment: {slots: {weapon_set_1_main: 1, weapon_set_1_off: 2, weapon_set_2_main: 3, armor: 4, mount: 5}}};
  const d = api.mercenaryHoverData(merc);
  // Zone 2 : la phrase d'origine, le peuple et la culture en une fois, puis « au sang de » (Idan, 2026-11-15).
  assert.equal(d.origin, "Orc des steppes");
  assert.equal(api.originPhrase({people: "Nain", culture: "Nains des montagnes"}), "Nain des montagnes", "« Nains / Nains des montagnes devient Nains des montagnes ! »");
  assert.equal(api.originPhrase({people: "Humain", culture: "Cités libres"}), "Humain des cités libres");
  // Les Montagnes du Nord devenues l'Empire de la nuit blanche (Idan, 2026-11-19) : « de l'empire », pas « des empire ».
  assert.equal(api.originPhrase({people: "Humain", culture: "Empire de la nuit blanche"}), "Humain de l'empire de la nuit blanche");
  assert.equal(api.originPhrase({people: "Gobelin", culture: "Caravanes de ferrailleurs"}), "Gobelin des caravanes de ferrailleurs");
  assert.equal(api.originPhrase({people: "Nain", culture: "Nains des montagnes", ascendance: "Sang de dragon"}), "Nain des montagnes au sang de dragon");
  assert.equal(api.originPhrase({people: "Elfe", culture: "Elfes noirs", ascendance: "Sang d’orc"}), "Elfe noir au sang d’orc");
  assert.equal(api.originPhrase({people: "Homme-bête", culture: "Tribus nordiques"}), "Homme-bête des tribus nordiques");
  assert.equal(api.originPhrase({people: "Halfling", culture: "Explorateurs"}), "Halfling explorateur");
  // Au masculin pour tous, la phrase comme le titre (« Humain (pour un homme et une femme) »).
  assert.doesNotMatch(hoverSrc, /isFemale|female/);
  // « Sur la fiche au survol, ça remplace les tags actuels » (Idan, 2026-11-22) : les tags de l'atelier, dans leur ordre,
  // en bleu comme le rôle au combat.
  assert.deepEqual(d.tags.map(t => t.name), ["Archer", "Soigneur occasionnel", "Grosse Brute"]);
  assert.deepEqual(d.tags.map(t => t.tone), ["bleu", "bleu", "bleu"]);
  assert.ok(d.tags.every(t => t.mission === false && !("parent" in t)));
  assert.doesNotMatch(hoverSrc, /tagRules|litIds|HOVER_TAG_BRANCHES/, "plus l'ancien arbre des tags");
  // Le nom de chaque arme et de l'armure (Idan, 2026-11-16 : « épée longue et écu », « Arc », « Armure de cuir »), les deux
  // mains (« deux épées, c'est pas épée et bouclier »).
  assert.deepEqual(d.sets, [["Épée longue", "Épée courte"], ["Arc"]], "« deux épées, c'est pas épée et bouclier »");
  assert.equal(d.armor, "Armure de cuir");
  const {hoverWeapons} = new Function(...Object.keys(stubs), hoverSrc + "\nreturn {hoverWeapons};")(...Object.values(stubs));
  assert.equal(hoverWeapons(["Épée longue", "Écu"]), "Épée longue et écu");
  assert.equal(hoverWeapons(["Arc"]), "Arc");
  assert.equal(hoverWeapons(["Nunchaku", "Nunchaku"]), "Nunchaku × 2", "deux armes identiques (Idan, 2026-11-24)");
  assert.equal(hoverWeapons([]), "");
  assert.equal(api.mercenaryHoverData({...merc, items: [{id: 4, category: "Intermédiaire"}]}).armor, "Armure intermédiaire", "sans nom : son type");
  assert.deepEqual(d.schools, ["Feu", "Vie"], "les écoles où il a au moins un sort");
  assert.deepEqual(d.mount, {name: "Croc-Noir", kind: "Loup de combat", code: "loup"}, "« Ah oui » : sa monture");
  assert.deepEqual(api.mercenaryHoverData({...merc, items: [...merc.items.slice(0, 4), {id: 5, itemType: "mount", name: "Loup de combat", petName: "Croc-Noir", mountCode: "loup"}]}).mount,
    {name: "Croc-Noir", kind: "Loup de combat", code: "loup"}, "le nom qu'on lui a donné, puis son espèce");
  assert.equal(d.bonus, 81);
  assert.equal(api.mercenaryHoverData({...merc, contract: null}).bonus, 40, "sans contrat : la prime qu'il demanderait");
  // Les écoles : les 9 pictos d'Idan (assets/pictos/ecole-<slug>.webp), un par école de magie.
  assert.match(hoverSrc, /renderPicto\("school",name,/);
  const {pictoPath} = require(path.join(root, "prototype-web/picto-ui.js"));
  for (const school of ["Feu", "Eau", "Foudre", "Vie", "Nécromancie", "Illusion", "Invocation", "Transmutation", "Télékinésie"]) {
    const file = pictoPath("school", school);
    assert.ok(fs.existsSync(path.join(root, "prototype-web", file)), school + " : " + file);
  }
  // Zone 1, le cartouche du nom : la texture de SA culture seule (la bande de la pièce du milieu, sans le cadre), pour
  // chacune des 32 ; la carte et l'avatar en dimensions fixes, aux proportions de Chatty ; les anciens cadres retirés.
  for (const bar of Object.values(HUD_BARS)) {
    const frame = api.hoverCultureFrame(bar.culture);
    const inset = (bar.bandBottom - bar.bandTop) * .08, band = bar.bandBottom - bar.bandTop - 2 * inset;
    assert.ok(frame.vars.includes(`assets/hud/barres/${frame.key}/center.webp`), bar.culture);
    assert.ok(frame.vars.includes(`--hc-tex-y:${((bar.bandTop + inset) / band).toFixed(4)}`) && frame.vars.includes(`--hc-tex-h:${(bar.h / band).toFixed(4)}`), bar.culture);
    assert.equal(HUD_BARS[frame.key].culture, bar.culture);
    // L'ornement du titre : un motif par culture, chacun le sien, et son SVG existe.
    assert.ok(frame.vars.includes(`--hc-orn:url("assets/fiche/ornements/${frame.ornament}.svg")`), bar.culture);
    assert.ok(fs.existsSync(path.join(root, "prototype-web/assets/fiche/ornements", frame.ornament + ".svg")), frame.ornament);
  }
  const ornaments = Object.values(HUD_BARS).map(bar => api.hoverCultureFrame(bar.culture).ornament);
  assert.equal(new Set(ornaments).size, 32, "« 1 par culture »");
  for (const file of fs.readdirSync(path.join(root, "prototype-web/assets/fiche/ornements"))) {
    const svg = fs.readFileSync(path.join(root, "prototype-web/assets/fiche/ornements", file), "utf8");
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 104 24">/, file + " : court, toujours la même boîte");
    assert.doesNotMatch(svg, /(?:fill|stroke)="(?!#000"|none")/, file + " : monochrome");
  }
  const css = choiceCss;
  assert.match(hoverSrc, /<section class="hc-origins" aria-label="Origines"><div class="hc-emblems">\$\{emblems\}<\/div><p class="hc-origin">\$\{esc\(d\.origin\)\}<\/p><\/section>/);
  assert.match(css, /\.hc-emblem \.picto\{[^}]*filter:drop-shadow/);
  assert.match(css, /\.hc-origin\{[^}]*font:700 [^}]*color:var\(--hc-culture,var\(--encre\)\);text-shadow:/);
  // Le nom (en gras) et le titre : en réserve du parchemin, remplis de sa texture, une légère ombre portée ; le titre plus grand.
  assert.match(css, /--hc-encre-titre:linear-gradient\([^;]*url\("assets\/creation\/parchemin\.webp"\)[^;]*var\(--hc-parchemin\);/);
  // Le nom en grand : les noms de 20 caractères tiennent ; au-delà, il rapetisse d'autant (20 / longueur).
  assert.match(css, /\.hc-banner h3\{[^}]*font:700 calc\(var\(--hc-cart-h\) \* \.54 \* var\(--hc-name-fit,1\)\)/);
  assert.match(hoverSrc, /const nameFit=Math\.max\(\.6,Math\.min\(1,20\/d\.name\.length\)\);/);
  assert.match(css, /\.hc-banner h3\{[^}]*font:700 [^}]*background:var\(--hc-encre-titre\);[^}]*background-clip:text;[^}]*filter:drop-shadow\(0 3px 3px rgba\(0,0,0,\.55\)\)/);
  assert.match(css, /\.hc-title\{[^}]*font:italic 500 calc\(var\(--hc-cart-h\) \* \.29\)[^}]*color:var\(--hc-parchemin\)/);
  assert.match(css, /\.hc-title span\{[^}]*background:var\(--hc-encre-titre\);[^}]*background-clip:text;[^}]*filter:drop-shadow\(1px 1px 1\.5px rgba\(0,0,0,\.65\)\)/);
  // Les ornements du titre : courts, fins, monochromes, centrés sur le milieu des minuscules.
  assert.match(css, /\.hc-orn\{[^}]*width:calc\(var\(--hc-cart-h\) \* \.64\);height:calc\(var\(--hc-cart-h\) \* \.148\);translate:0 \.085em;background:var\(--hc-parchemin\);[^}]*mask:var\(--hc-orn\) center\/contain no-repeat\}/);
  assert.match(css, /\.hc-orn--r\{transform:scaleX\(-1\)\}/);
  assert.match(hoverSrc, /function fitHoverCard\(root\)/);
  assert.match(css, /\.hover-card\{--hc-w:860px;--hc-h:565px;--hc-cart-h:calc\(var\(--hc-h\) \* \.1435\);/);
  assert.match(css, /\.hc-portrait\{position:absolute;left:1\.2%;top:1\.5%;width:34%;height:97%;/);
  assert.match(css, /\.hc-banner\{position:absolute;left:36\.2%;right:1\.2%;top:1\.5%;height:14\.35%;/);
  assert.doesNotMatch(hoverSrc + css, /hc-corner|hover-card-ring|hover-card-bar|hc-side/, "plus de cadres : ils viendront en dernier");
  // Sous le cartouche, deux colonnes (Idan, 2026-11-16) : à gauche les origines, une fente dans le parchemin (plus épaisse
  // au milieu qu'aux extrémités, « beaucoup plus fine »), à droite la réputation, l'affinité et la prime ; les cœurs à
  // facettes, comme les étoiles de la réputation (« un style commun »).
  const head = hoverSrc.slice(hoverSrc.indexOf('<div class="hc-head">'), hoverSrc.indexOf("${tags?"));
  const at2 = needle => head.indexOf(needle);
  assert.ok(at2('<section class="hc-origins"') > 0 && at2('<section class="hc-origins"') < at2('<i class="hc-fente" aria-hidden="true"></i>')
    && at2('<i class="hc-fente"') < at2('<div class="hc-stats">') && at2("Réputation") < at2("${affinity}") && at2("${affinity}") < at2('<span class="hc-label" title="Prime de mission">Prime</span>'), "origines | fente | réputation, affinité, prime");
  assert.match(css, /\.hc-head\{display:grid;grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\);/, "la fente au milieu, dans l'axe de la couronne");
  assert.match(css, /\.hc-fente\{[^}]*width:3px;[^}]*background:#8a6a40;clip-path:polygon\(50% 0,100% 50%,50% 100%,0 50%\)\}/);
  assert.match(css, /\.hc-origins\{display:grid;grid-template-columns:minmax\(0,1fr\);/, "la phrase passe sur deux lignes dans sa colonne");
  assert.match(hoverSrc, /`<i class="hc-heart\$\{i<filled\?" is-full":""\}"><\/i>`/);
  assert.match(css, /\.hc-heart\{[^}]*background:url\("assets\/ui\/coeurs\/vide\.svg"\)/);
  assert.match(css, /\.hc-heart\.is-full\{background-image:url\("assets\/ui\/coeurs\/plein\.svg"\)/);
  for (const f of ["plein", "vide"]) assert.match(fs.readFileSync(path.join(root, "prototype-web/assets/ui/coeurs", f + ".svg"), "utf8"), /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100"><!-- Blood & Wages : cœur [^>]*à facettes/);
  assert.match(css, /\.hc-bonus img\{width:24px;height:24px;/, "des pièces d'or plus petites");
  assert.match(css, /\.hc-bonus b\{font:700 18px\/1 /);
  // Les tags : au plus 5, en quinconce (trois en haut, deux décalés dessous, rangées centrées) ; à partir de 6, la dernière
  // plaque dit combien d'autres (Idan, 2026-11-16).
  {
    const {hoverTagPlates} = require(path.join(root, "prototype-web/hover-card-ui.js"));
    const t = n => Array.from({length: n}, (_, i) => ({name: "T" + (i + 1), tone: "bleu", mission: false}));
    const cols = n => hoverTagPlates(t(n)).map(p => p.col);
    assert.deepEqual([cols(1), cols(2), cols(3), cols(4), cols(5)], [[3], [2, 4], [1, 3, 5], [1, 3, 5, 3], [1, 3, 5, 2, 4]]);
    const six = hoverTagPlates(t(6)), eight = hoverTagPlates(t(8));
    assert.deepEqual(six.map(p => p.name), ["T1", "T2", "T3", "T4", "2 autres rôles"]);
    assert.deepEqual([eight.length, eight[4].name, eight[4].more, eight[4].hidden], [5, "4 autres rôles", true, ["T5", "T6", "T7", "T8"]]);
    assert.match(hoverSrc, /hoverTagPlates\(d\.tags\)\.map\(tag=>`<li class="hc-tag[\s\S]*?style="grid-column:\$\{tag\.col\}\/span 2"/);
    // Un tag allumé, sans niveau (Idan, 2026-11-20) : toujours la plaque pleine ; la plaque « N autres rôles » garde le
    // contour seul (Idan, 2026-11-16).
    assert.doesNotMatch(hoverSrc, /level/, "plus de niveau sur les plaques");
    assert.doesNotMatch(css, /\.hc-tag\.is-n\d/);
    assert.ok(d.tags.every(t => !("level" in t)));
    assert.match(hoverSrc, /\$\{tag\.more\?" is-more":""\}" style=/);
    assert.match(css, /\.hc-tag\.is-more::after\{[^}]*clip-path:polygon\(evenodd,/);
    assert.match(css, /\.hc-tag\.is-more::before\{opacity:0\}/);
    assert.equal(eight[4].more, true, "la plaque « N autres rôles » : le contour seul");
    // Deux tags au même nom : le nom du parent devant, l'adjectif accordé (Idan, 2026-11-16 : « oui »).
    const {hoverTagFullName} = require(path.join(root, "prototype-web/hover-card-ui.js"));
    assert.deepEqual([hoverTagFullName("Dégâts", "De zone"), hoverTagFullName("Soin", "De zone"), hoverTagFullName("Dégâts", "Brûlant"),
      hoverTagFullName("Dégâts élémentaires", "Glaçant")], ["Dégâts de zone", "Soin de zone", "Dégâts brûlants", "Dégâts élémentaires glaçants"]);
    const dupApi = new Function(...Object.keys(stubs), hoverSrc + "\nreturn {mercenaryHoverData};")(...Object.values({...stubs,
      mercenaryTagList: () => [{id: "d", name: "De zone", parent: "Dégâts"}, {id: "s", name: "De zone", parent: "Soin"}, {id: "p", name: "Protection", parent: "Rôles"}]}));
    assert.deepEqual(dupApi.mercenaryHoverData(merc).tags.map(t => t.name), ["Dégâts de zone", "Soin de zone", "Protection"], "le parent seulement en cas de doublon");
    assert.match(css, /\.hc-tags\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\);/);
    // La fiche du candidat (Idan, 2026-11-22 : « la fiche au survol avec des ? quand on ne connait pas les infos ») : les cases
    // inconnues en « ? », les autres comme d'habitude ; la prime donnée (celle de la négociation).
    const render = new Function(...Object.keys(stubs), "renderAvatar", "renderPicto", "renderReputationStars", "goldAmount", "esc",
      hoverSrc + "\nreturn renderMercenaryHoverCard;")(...Object.values(stubs), () => "<i class=\"avatar\"></i>", () => "", () => "<i class=\"stars\"></i>", n => String(n), x => String(x ?? ""));
    const full = render(merc);
    assert.doesNotMatch(full, /hc-unknown|hc-tag--unknown/, "sans masque : tout est montré");
    assert.match(full, /Épée longue et épée courte/);
    const masked = render(merc, {unknown: new Set(["title", "affinity", "bonus", "tags", "kit", "magic"]), bonus: 99});
    assert.equal((masked.match(/class="hc-unknown"/g) || []).length, 3, "affinité, prime, magie");
    assert.match(masked, /<li class="hc-tag hc-tag--bleu is-more hc-tag--unknown" style="grid-column:3\/span 2">\?<\/li>/, "un seul tag « ? »");
    assert.equal((masked.match(/<span class="hc-kit-item"><i>\?<\/i><\/span>/g) || []).length, 3, "les deux sets et l'armure");
    assert.match(masked, /<p class="hc-title">[\s\S]*?<span>\?<\/span>/, "le titre");
    assert.doesNotMatch(masked, /Épée longue|Archer|hc-steed-portrait|hc-school"/, "rien de ce qu'on ne sait pas, ni la monture");
    assert.match(masked, /class="avatar"/, "son portrait");
    assert.match(masked, /class="hc-origin">Orc des steppes</, "ses origines, visibles");
    assert.match(render(merc, {unknown: new Set(["title"]), bonus: 99}), /<b>99 PO<\/b>/, "la prime qu'il demande");
    // Ce qu'on apprend en lui parlant (doc 14 §6 bis ; Idan, 2026-11-22 : « il faut ajouter absolument le salaire dans cette
    // fiche ») : le salaire à côté de la prime (fiche du candidat seulement), chaque case de l'équipement à part, le titre
    // entendu, l'affinité en un mot ; ses écoles quand il les a dites.
    assert.doesNotMatch(full, /hc-stat--salary/, "pas de salaire sur la fiche au survol de nos mercenaires");
    assert.match(render(merc, {unknown: new Set(["salary", "bonus"])}), /<div class="hc-stat hc-stat--salary"><span class="hc-label" title="Salaire journalier">Salaire<\/span><span class="hc-unknown">\?<\/span><\/div>/);
    const learnt = render(merc, {unknown: new Set(["tags", "mount", "set2", "armor"]), salary: 12, bonus: 30, title: "Mage Légendaire Omnipotent",
      affinityWord: "Amical"});
    assert.match(learnt, /Salaire<\/span><span class="hc-bonus"><img src="assets\/hud\/picto-or\.webp" alt=""><b>12 PO<\/b><\/span><\/div>\s*<div class="hc-stat hc-stat--bonus">[\s\S]*?<b>30 PO<\/b>/, "le salaire, puis la prime");
    assert.deepEqual([...learnt.matchAll(/<span class="hc-kit-item"><i>([^<]*)<\/i><\/span>/g)].map(x => x[1]), ["Épée longue et épée courte", "?", "?"], "chaque case à part");
    assert.match(learnt, /<span>Mage Légendaire Omnipotent<\/span>/, "le titre entendu (vanté)");
    assert.match(learnt, /<span class="hc-label">Affinité<\/span><b class="hc-affinity-word">Amical<\/b>/, "un mot à la place des cœurs");
    assert.match(learnt, /<span class="hc-school" role="img" aria-label="Feu">[\s\S]*?aria-label="Vie"/, "ses écoles, toutes");
    assert.doesNotMatch(learnt, /hc-steed-portrait|hc-unknown">\?<\/span><\/div>\s*<\/div>/, "toujours sans la monture");
  }
  // La fenêtre du candidat (Idan, 2026-11-22) : sa fiche à côté de la discussion, un fond noir flou derrière.
  {
    const tavernJs = fs.readFileSync(path.join(root, "prototype-web/tavern-ui.js"), "utf8");
    assert.match(html, /<dialog id="recruit-talk-dialog" class="talk-dialog talk-dialog--recruit talk-dialog--fiche" aria-labelledby="recruit-talk-name">\s*<div id="recruit-talk-card" class="recruit-fiche"><\/div>\s*<div class="recruit-talk-box conv">/);
    // La boîte de dialogue (Idan, 2026-11-24, d'après la maquette de Chatty) : une croix pour fermer, la conversation sur le
    // parchemin (elle seule défile), les réponses en dessous.
    assert.match(html, /<button type="button" class="conv-close" data-talk="leave" aria-label="Fermer"[^>]*>✕<\/button>\s*<button type="button" class="conv-fold" aria-expanded="true" aria-label="Replier la fiche"[^>]*><\/button>\s*<div class="conv-page"><div id="recruit-talk-log" class="talk-log" aria-live="polite"><\/div><\/div>\s*<div id="recruit-talk-choices"><\/div>/);
    // La fiche repliée sous la boîte (Idan, 2026-11-25) : la boîte glisse par-dessus, la fiche dépasse de --talk-depasse.
    assert.match(css, /\.talk-dialog--fiche\.is-folded>\.recruit-talk-box\{left:calc\(var\(--talk-marge\) \+ var\(--talk-depasse\)\)\}/);
    assert.match(tavernJs, /function setRecruitFolded\(folded\)\{\s*game\.recruitFolded=folded;/);
    // Chaque réplique : la vignette et le nom de qui parle, la réplique dans une bulle ; le récit sans bulle.
    const lines = new Function("esc", "mercenaryAvatarUrl", "avatarInitials",
      tavernJs.slice(tavernJs.indexOf("function talkMini(person){"), tavernJs.indexOf("function renderRecruitTalk(){")) + "return renderTalkLines;")(
      x => String(x), p => p.portrait, p => p.name.slice(0, 2).toUpperCase());
    const said = lines([{who: "merc", text: "Bonjour"}, {who: "you", text: "Salut"}, {who: "note", text: "Il part."}],
      line => line.who === "you" ? {name: "Bob", portrait: "bob.webp"} : {name: "Zora"}, "Zora");
    assert.match(said, /^<div class="talk-say talk-say--merc"><span class="talk-mini" aria-hidden="true"><i>ZO<\/i><\/span><div class="talk-say-body"><b>Zora<\/b><span>«\u00a0Bonjour\u00a0»<\/span><\/div><\/div>/);
    assert.match(said, /<div class="talk-say talk-say--you"><span class="talk-mini" aria-hidden="true"><i>BO<\/i><img src="bob\.webp" alt=""[^>]*><\/span><div class="talk-say-body"><b>Vous<\/b>/);
    assert.match(said, /<p class="talk-note">Il part\.<\/p>$/);
    assert.match(tavernJs, /\$\("recruit-talk-card"\)\.innerHTML=renderMercenaryHoverCard\(m,recruitCardOptions\(candidate\)\);/);
    // Les cases : ce qu'on a appris (recruitDialogue().known) ; le salaire et la prime, une fois ses prétentions dites, suivent
    // la négociation.
    const cardOptions = new Function("recruitDialogue", "tavernRules",
      tavernJs.slice(tavernJs.indexOf("function recruitCardOptions(candidate){"), tavernJs.indexOf("function renderRecruitTalk(){")) + "return recruitCardOptions;");
    const {createRecruitDialogue} = require(path.join(root, "game-core/recruit-dialogue.js"));
    const dialogue = createRecruitDialogue({reference: {tavernDialogue: JSON.parse(fs.readFileSync(path.join(root, "data/reference/tavern-dialogue.json"), "utf8"))}});
    const candidate = {mercenary: merc};
    const negotiation = {salary: 12, bonus: 30, agreed: null};
    const optionsOf = cardOptions(() => dialogue, () => ({negotiationState: () => negotiation}));
    const fresh = optionsOf(candidate);
    assert.deepEqual([...fresh.unknown].sort(), ["affinity", "armor", "bonus", "magic", "mount", "salary", "set1", "set2", "tags", "title"]);
    const k = dialogue.known(candidate);
    Object.assign(k, {salary: true, title: "Mage Légendaire Omnipotent", affinity: -40});
    k.asked.set1 = true;
    k.asked.magic = true;
    negotiation.agreed = {salary: 10, bonus: 25};
    const later = optionsOf(candidate);
    assert.deepEqual([...later.unknown].sort(), ["armor", "mount", "set2", "tags"]);
    assert.deepEqual([later.salary, later.bonus, later.title, later.affinityWord], [10, 25, "Mage Légendaire Omnipotent", "Hostile"]);
    k.keeperTitle = "Chair à canon";
    assert.equal(optionsOf(candidate).title, "Chair à canon", "priorité au tavernier");
    assert.match(css, /\.talk-dialog--fiche::backdrop\{background:rgba\(0,0,0,\.82\);backdrop-filter:blur\(8px\);/);
    // Les volumes (Idan, 2026-11-24) : l'écran de référence entier ; la fiche à la marge du bord gauche, centrée en hauteur ; la
    // discussion avec la même marge en haut, en bas et à droite, qui mord sur la fiche avec une ombre douce de contact (lumière en haut à gauche).
    assert.match(css, /\.talk-dialog--fiche\{--talk-marge:104px;--talk-mord:24px;--talk-depasse:100px;width:1920px;height:1080px;/);
    assert.match(css, /\.talk-dialog--fiche\[open\]\{display:block;height:1080px\}/);
    assert.match(css, /\.talk-dialog--fiche>\.recruit-fiche\{position:absolute;left:var\(--talk-marge\);top:calc\(50% - 282\.5px\);width:860px;height:565px\}/);
    assert.match(css, /\.talk-dialog--fiche>\.recruit-talk-box\{position:absolute;z-index:1;top:var\(--talk-marge\);right:var\(--talk-marge\);bottom:var\(--talk-marge\);left:calc\(var\(--talk-marge\) \+ 860px - var\(--talk-mord\)\);[^}]*box-shadow:0 0 16px 3px rgba\(0,0,0,\.6\),11px 18px 50px #000a/);
  }
  // Avant les tags, la couronne et ses rinceaux dans la couleur de la culture (Idan, 2026-11-16) : la planche d'Idan
  // tracée en SVG noir, servi de masque.
  assert.match(hoverSrc, /<\/div>\s*<i class="hc-sep" aria-hidden="true"><\/i>\s*\$\{tags\?`<ul class="hc-tags">\$\{tags\}<\/ul><i class="hc-fente hc-fente--h" aria-hidden="true"><\/i>`:""\}\s*<div class="hc-kit">/);
  // Sous les tags, la fente du parchemin couchée, puis l'équipement en trois colonnes : set 1, set 2, armure (Idan, 2026-11-16).
  assert.match(css, /\.hc-fente--h\{align-self:auto;width:auto;height:3px;margin:6px 2px\}/, "de la marge avant et après le bloc armes");
  assert.match(hoverSrc, /const kitValues=\[hoverWeapons\(d\.sets\[0\]\)\|\|"Mains nues",hoverWeapons\(d\.sets\[1\]\)\|\|"—",d\.armor\|\|"Sans armure"\];\s*const kit=\["set1","set2","armor"\]\.map\(\(key,i\)=>hidden\("kit"\)\|\|hidden\(key\)\?"\?":kitValues\[i\]\)\s*\.map\(value=>`<span class="hc-kit-item"><i>\$\{esc\(value\)\}<\/i><\/span>`\)/, "les noms seuls");
  // Entre les colonnes de l'équipement et entre les écoles, la fente du parchemin (Idan : « Oui »).
  assert.match(css, /\.hc-kit-item\+\.hc-kit-item::before,\.hc-school\+\.hc-school::before\{content:"";position:absolute;[^}]*width:3px;background:#8a6a40;clip-path:polygon\(50% 0,100% 50%,50% 100%,0 50%\)\}/);
  assert.doesNotMatch(css, /\.hc-(kit-item|school)[^{]*\{[^}]*border-left/);
  // Dessous, deux colonnes : les écoles de magie à gauche, la monture à droite, la fente entre les deux ; seule, l'une ou
  // l'autre se centre (Idan, 2026-11-16).
  assert.match(hoverSrc, /<div class="hc-foot\$\{magic&&steed\?" is-2":""\}">\$\{magic\}\$\{magic&&steed\?`<i class="hc-fente" aria-hidden="true"><\/i>`:""\}\$\{steed\}<\/div>/);
  assert.match(hoverSrc, /<div class="hc-kit">\$\{kit\}<\/div>\s*\$\{foot\}\s*<\/div>/);
  assert.match(css, /\.hc-foot\.is-2\{grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\);/);
  // La monture : son portrait seul, un peu plus petit (Idan, 2026-11-16 : « réduire un peu l'avatar monture, virer le nom
  // de la monture ») ; son nom reste pour les lecteurs d'écran.
  assert.match(hoverSrc, /const showSteed=Boolean\(d\.mount\)&&!hidden\("magic"\)&&!hidden\("mount"\);[\s\S]*?const steed=showSteed\?hoverMountPortrait\(d\.mount\):"";/, "le portrait seul, sans le nom");
  assert.match(css, /\.hc-steed-portrait\{[^}]*width:72px;height:72px;/, "réduire un peu l'avatar monture");
  assert.doesNotMatch(css, /\.hc-steed[\s>{]/, "plus de bloc portrait + nom");
  {
    const {hoverMountPortrait} = new Function(...Object.keys(stubs), "esc", hoverSrc + "\nreturn {hoverMountPortrait};")(...Object.values(stubs), esc);
    const fig = hoverMountPortrait({name: "Croc-Noir", kind: "Loup de combat", code: "loup"});
    assert.match(fig, /aria-label="Croc-Noir, Loup de combat"/);
    assert.doesNotMatch(fig.replace(/aria-label="[^"]*"/, ""), /Croc-Noir/, "le nom n'est plus affiché");
  }
  assert.doesNotMatch(hoverSrc + css, /hc-rule/, "plus de filet : les fentes du parchemin");
  // Les écoles : les pictos seuls, 48 px, sur une ligne, qui rétrécissent pour tout faire tenir (Idan, 2026-11-16).
  assert.match(hoverSrc, /`<span class="hc-school" role="img" aria-label="\$\{esc\(name\)\}">\$\{renderPicto\("school",name,\{size:"md"\}\)\}<\/span>`/, "pictos seuls, sans nom");
  assert.match(css, /\.hc-school\{position:relative;flex:0 0 min\(48px,calc\(\(100% - \(var\(--n,1\) - 1\) \* var\(--ecart\)\) \/ var\(--n,1\)\)\);/, "48 px, rétrécis pour tout faire tenir");
  // Une ligne ; à côté de la monture, au-delà de 4, deux lignes, la première la plus longue (« Deux lignes »).
  const {hoverSchoolRows} = new Function(...Object.keys(stubs), hoverSrc + "\nreturn {hoverSchoolRows};")(...Object.values(stubs));
  const nine = ["Transmutation", "Nécromancie", "Télékinésie", "Invocation", "Illusion", "Foudre", "Feu", "Eau", "Vie"];
  assert.deepEqual(hoverSchoolRows(nine, false).map(r => r.length), [9]);
  assert.deepEqual(hoverSchoolRows(nine.slice(0, 4), true).map(r => r.length), [4]);
  assert.deepEqual(hoverSchoolRows(nine.slice(0, 5), true).map(r => r.length), [3, 2]);
  assert.deepEqual(hoverSchoolRows(nine, true).map(r => r.length), [5, 4]);
  assert.deepEqual(hoverSchoolRows([], true), []);
  assert.doesNotMatch(hoverSrc, /Écoles de magie/, "« Retire le école de magie »");
  assert.doesNotMatch(hoverSrc, /"Set [12]"|\["Armure",/, "« pas besoin de mettre set 1 ou set 2 », « pas besoin de mettre armure également »");
  assert.match(css, /\.hc-kit\{display:grid;grid-auto-columns:minmax\(0,1fr\);grid-auto-flow:column\}/);
  assert.match(css, /\.hc-sep\{[^}]*height:34px;margin:8px 0 5px;/, "la couronne descendue sous la tête, de l\'air dessous");
  assert.match(css, /\.hc-sep\{[^}]*background:var\(--hc-culture,var\(--encre\)\);[^}]*mask:url\("assets\/fiche\/separateurs\/couronne\.svg"\) center\/contain no-repeat;/);
  const sep = fs.readFileSync(path.join(root, "prototype-web/assets/fiche/separateurs/couronne.svg"), "utf8");
  assert.match(sep, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 1278\.0+ 298\.0+">/);
  assert.doesNotMatch(sep, /(?:fill|stroke)="(?!#000"|none")/, "monochrome, coloré par le CSS");
  // Le nom et le titre tiennent dans le cartouche sans son bas réservé (fiches au kit : plus d'air sous le titre).
  assert.match(hoverSrc, /room=banner\.clientHeight-\(parseFloat\(cs\.paddingTop\)\|\|0\)-\(parseFloat\(cs\.paddingBottom\)\|\|0\)/);
}
console.log("Tableau des missions : annonces sur le panneau, trois par page, flèches, départ annulable, détail, action, choix de l'escouade — OK");
