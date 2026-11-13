"use strict";

// La barre du haut du camp (Idan, 2026-11-13, d'après sa maquette) : le blason, le nom et les étoiles de la compagnie, ses
// chiffres (or, salaires, mercenaires) avec les pictos d'Idan, la date et le bouton menu (Échap) ; plus de logo au camp.
// La barre du bas garde la Taverne, le Château, Jour suivant et le journal. La culture du capitaine est posée sur
// <body data-captain-culture> pour l'habillage de la barre par culture (32 cultures).
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
  "à gauche : blason, nom, étoiles, puis or, salaires, mercenaires ; à droite : la date et le bouton menu");
// Les pictos d'Idan (or, salaires, mercenaires) : des images, plus des icônes au trait.
const pictos=[...top.matchAll(/<img class="hud-picto" src="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(pictos,["assets/hud/picto-or.webp","assets/hud/picto-salaires.webp","assets/hud/picto-mercenaires.webp"]);
for(const p of pictos) assert.ok(fs.existsSync(path.join(WEB,p)),p);
assert.match(top,/<button id="hud-pause-btn" type="button" aria-label="Ouvrir le menu de pause \(Échap\)" title="Menu \(Échap\)"><span class="hud-icon" data-hud-icon="menu"><\/span><\/button>/);
assert.match(js,/  menu:'<path d="M4\.5 7h15M4\.5 12h15M4\.5 17h15"\/>',/);
assert.deepEqual(ids(bottom),["hud-tavern","hud-tavern-btn","hud-tavern-menu","hud-castle-btn","hud-next-day-btn","hud-journal","hud-console-toggle","hud-journal-last","game-action-lines"],
  "en bas : Taverne et Château à gauche, Jour suivant au centre, le journal à droite");
assert.match(top,/<img id="hud-blason" class="hud-blason" alt="Blason de la compagnie" width="84" height="84" hidden>/,"pas de blason tant qu'il n'est pas connu");

// --- Mise en page --------------------------------------------------------------------------------------------------------
assert.match(css,/:root\{--hud-top-h:58px\}/);
assert.match(css,/\.game-top-bar\{position:fixed;top:0;left:0;right:0;box-sizing:border-box;display:grid;grid-template-columns:minmax\(0,1fr\) auto;/);
assert.match(css,/\.game-top-bar #hud-day::before\{content:"\\00a0·\\00a0";/,"la date sur une ligne : « 1 Brumecendre · Jour 1 »");
assert.match(css,/body\[data-screen="camp"\] \.topbar\{display:none\}/,"plus de logo au camp, même sur l'accueil");
assert.match(css,/body\[data-screen="camp"\]:not\(\[data-camp-scene="home"\]\) \.app-shell\{padding-top:calc\(var\(--hud-top-h\) \+ 24px\)\}/,"chaque lieu commence sous la barre");
assert.match(css,/body\[data-screen="camp"\]\[data-camp-scene="home"\] \.app-shell\{padding-top:calc\(var\(--hud-top-h\) \+ 18px\)\}/);
assert.match(css,/\.hud-side--left \.hud-menu-list\{left:0;right:auto\}/,"le menu Taverne s'ouvre depuis la gauche");
assert.match(css,/body\[data-screen="mission"\] \.game-hud\{display:none\}/,"en combat, aucune des deux barres");

// --- Blason, culture du capitaine, chiffres ---------------------------------------------------------------------------------------
const start=js.indexOf("const HUD_BLASON_COUNT=60;");
const hud=new Function("game","$","document","pictoSlug",js.slice(start,js.indexOf("function renderGameHud(){",start))+"return {hudBlasonUrl,hudNumber,renderHudIdentity};");
const body={dataset:{}};
const img={attrs:{},hidden:true,getAttribute(k){return this.attrs[k]??null;},setAttribute(k,v){this.attrs[k]=v;}};
const game={campaign:{company:{blason:7}},captain:{people:"Nain",culture:"Nains des montagnes"}};
const slug=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const ui=hud(game,id=>id==="hud-blason"?img:null,{body},slug);
assert.equal(ui.hudBlasonUrl(1),"assets/creation/blasons/b01.webp");
assert.equal(ui.hudBlasonUrl(60),"assets/creation/blasons/b60.webp");
for(const bad of [0,61,1.5,null,undefined,"x"]) assert.equal(ui.hudBlasonUrl(bad),"",String(bad));
for(let n=1;n<=60;n++) assert.ok(fs.existsSync(path.join(WEB,ui.hudBlasonUrl(n))),"blason "+n);
ui.renderHudIdentity();
assert.deepEqual([body.dataset.captainCulture,img.attrs.src,img.hidden],["nains-des-montagnes","assets/creation/blasons/b07.webp",false]);
assert.equal("captainPeople" in body.dataset,false,"la barre suit la culture, pas le peuple (Idan)");
// L'espace des milliers, comme sur la maquette : « 10 000 ».
assert.match(ui.hudNumber(10000),/^10\s000$/u);
assert.equal(ui.hudNumber(313.4),"313");
// Une partie d'avant la nouvelle création : pas de blason, la barre s'en passe.
delete game.campaign.company.blason;
ui.renderHudIdentity();
assert.equal(img.hidden,true);
// Retour au menu : plus de partie, plus de culture sur la page.
game.campaign=null;
ui.renderHudIdentity();
assert.equal("captainCulture" in body.dataset,false);
assert.match(js,/renderGameHud\(\)\{\n  const hud=\$\("game-hud"\);\n  const active=[^\n]+\n  hud\.classList\.toggle\("hidden",!active\);\n  renderHudIdentity\(\);/);

console.log("camp top bar ok");
