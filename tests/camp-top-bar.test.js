"use strict";

// La barre du haut du camp (Idan, 2026-11-13) : la compagnie (blason, nom, étoiles), ses chiffres (or, salaires,
// mercenaires), la date et Échap ; plus de logo au camp. La barre du bas garde la Taverne, le Château, Jour suivant et le
// journal. Le peuple du capitaine est posé sur <body data-captain-people> pour l'habillage des barres par peuple.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const WEB=path.resolve(__dirname,"..","prototype-web");
const html=fs.readFileSync(path.join(WEB,"index.html"),"utf8");
const css=fs.readFileSync(path.join(WEB,"styles.css"),"utf8");
const js=fs.readFileSync(path.join(WEB,"screen-ui.js"),"utf8");

// --- Les deux barres -----------------------------------------------------------------------------------------------------
const top=html.slice(html.indexOf('<div class="game-top-bar">'),html.indexOf('<div class="game-bottom-bar">'));
const bottom=html.slice(html.indexOf('<div class="game-bottom-bar">'),html.indexOf("</aside>",html.indexOf('<div class="game-bottom-bar">')));
const ids=part=>[...part.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]);
assert.deepEqual(ids(top),["hud-blason","hud-company","hud-renown","hud-gold-stat","hud-gold","hud-upkeep","hud-roster","hud-calendar","hud-date","hud-day","hud-pause-btn"],
  "en haut : blason, nom, étoiles, puis or, salaires, mercenaires, puis la date et Échap");
assert.deepEqual(ids(bottom),["hud-tavern","hud-tavern-btn","hud-tavern-menu","hud-castle-btn","hud-next-day-btn","hud-journal","hud-console-toggle","hud-journal-last","game-action-lines"],
  "en bas : Taverne et Château à gauche, Jour suivant au centre, le journal à droite");
assert.match(top,/<img id="hud-blason" class="hud-blason" alt="Blason de la compagnie" width="44" height="44" hidden>/,"pas de blason tant qu'il n'est pas connu");

// --- Mise en page --------------------------------------------------------------------------------------------------------
assert.match(css,/:root\{--hud-top-h:58px\}/);
assert.match(css,/\.game-top-bar\{position:fixed;top:0;left:0;right:0;/);
assert.match(css,/body\[data-screen="camp"\] \.topbar\{display:none\}/,"plus de logo au camp, même sur l'accueil");
assert.match(css,/body\[data-screen="camp"\]:not\(\[data-camp-scene="home"\]\) \.app-shell\{padding-top:calc\(var\(--hud-top-h\) \+ 24px\)\}/,"chaque lieu commence sous la barre");
assert.match(css,/body\[data-screen="camp"\]\[data-camp-scene="home"\] \.app-shell\{padding-top:calc\(var\(--hud-top-h\) \+ 18px\)\}/);
assert.match(css,/\.hud-side--left \.hud-menu-list\{left:0;right:auto\}/,"le menu Taverne s'ouvre depuis la gauche");
assert.match(css,/body\[data-screen="mission"\] \.game-hud\{display:none\}/,"en combat, aucune des deux barres");

// --- Blason et peuple du capitaine ---------------------------------------------------------------------------------------
const start=js.indexOf("const HUD_BLASON_COUNT=60;");
const hud=new Function("game","$","document","pictoSlug",js.slice(start,js.indexOf("function renderGameHud(){",start))+"return {hudBlasonUrl,renderHudIdentity};");
const body={dataset:{}};
const img={attrs:{},hidden:true,getAttribute(k){return this.attrs[k]??null;},setAttribute(k,v){this.attrs[k]=v;}};
const game={campaign:{company:{blason:7}},captain:{people:"Homme-bête"}};
const slug=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const ui=hud(game,id=>id==="hud-blason"?img:null,{body},slug);
assert.equal(ui.hudBlasonUrl(1),"assets/creation/blasons/b01.webp");
assert.equal(ui.hudBlasonUrl(60),"assets/creation/blasons/b60.webp");
for(const bad of [0,61,1.5,null,undefined,"x"]) assert.equal(ui.hudBlasonUrl(bad),"",String(bad));
for(let n=1;n<=60;n++) assert.ok(fs.existsSync(path.join(WEB,ui.hudBlasonUrl(n))),"blason "+n);
ui.renderHudIdentity();
assert.deepEqual([body.dataset.captainPeople,img.attrs.src,img.hidden],["homme-bete","assets/creation/blasons/b07.webp",false]);
// Une partie d'avant la nouvelle création : pas de blason, la barre s'en passe.
delete game.campaign.company.blason;
ui.renderHudIdentity();
assert.equal(img.hidden,true);
// Retour au menu : plus de partie, plus de peuple sur la page.
game.campaign=null;
ui.renderHudIdentity();
assert.equal("captainPeople" in body.dataset,false);
assert.match(js,/renderGameHud\(\)\{\n  const hud=\$\("game-hud"\);\n  const active=[^\n]+\n  hud\.classList\.toggle\("hidden",!active\);\n  renderHudIdentity\(\);/);

console.log("camp top bar ok");
