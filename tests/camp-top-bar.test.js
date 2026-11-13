"use strict";

// La barre du haut du camp (Idan, 2026-11-13, d'après sa maquette) : la barre illustrée de la culture du capitaine (packs
// d'Idan, scripts/build-hud-bars.js → hud-bars.js), le blason, le nom et les étoiles de la compagnie, ses chiffres (or,
// salaires, mercenaires) avec les pictos d'Idan, la date et le bouton menu (Échap) ; plus de logo au camp. La barre du bas
// garde la Taverne, le Château, Jour suivant et le journal.
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
assert.match(top,/<img id="hud-blason" class="hud-blason" alt="Blason de la compagnie" width="160" height="160" hidden>/,"pas de blason tant qu'il n'est pas connu");

// --- Mise en page --------------------------------------------------------------------------------------------------------
// Une seule mesure règle la barre : la hauteur de la bande sombre (85 px pour un écran de 2000 px, comme la maquette).
assert.match(css,/--hb-B:clamp\(52px,4\.25vw,85px\);/);
assert.match(css,/--hud-top-h:calc\(var\(--hb-top\) \+ var\(--hb-B\) \* 1\.3\);/,"les lieux commencent sous la barre");
assert.match(css,/\.game-top-bar\{--hb-k:calc\(var\(--hb-B\) \/ var\(--hb-band,90\)\);position:fixed;top:0;/);
assert.match(css,/\.hud-bar-center\{[^}]*background-repeat:repeat-x;/,"le milieu de la barre se répète");
assert.match(css,/\.game-top-bar:not\(\.has-art\) \.hud-bar-art\{/,"un cadre provisoire sans pack");
assert.match(html,/<div class="hud-bar-art" aria-hidden="true"><span class="hud-bar-piece hud-bar-left"><\/span><span class="hud-bar-piece hud-bar-center"><\/span><span class="hud-bar-piece hud-bar-right"><\/span><\/div>/);
for(const file of ["hud-bars.js","blason-bodies.js"]) assert.ok(html.indexOf(`<script src="${file}"></script>`)>0&&html.indexOf(`<script src="${file}"></script>`)<html.indexOf('<script src="screen-ui.js"></script>'),file);
// Le blason (Idan, 2026-11-13) : son écu fait deux bandes de haut et se centre sur la bande ; la barre part de son milieu
// (rien ne dépasse à gauche) ; le texte commence après ses décors.
assert.match(css,/--bl-S:min\(calc\(var\(--hb-B\) \* 2 \/ \(var\(--bl-y1\) - var\(--bl-y0\)\)\),/);
assert.match(css,/\.hud-bar-art\{position:absolute;left:calc\(var\(--bl-cx\) - var\(--hb-k\) \* var\(--hb-li,0\)\);/);
assert.match(css,/clip-path:inset\(-60% -10% -60% calc\(var\(--hb-k\) \* var\(--hb-li,0\)\)\);/,"l'embout gauche est caché derrière le blason");
assert.match(css,/\.hud-top-content\{[^}]*left:var\(--bl-right\);/);
assert.match(css,/#hud-company\.is-two-lines\{[^}]*-webkit-line-clamp:2;/,"un nom trop long passe sur deux lignes");
assert.match(css,/\.game-top-bar #hud-day::before\{content:"\\00a0·\\00a0";/,"la date sur une ligne : « 1 Brumecendre · Jour 1 »");
assert.match(css,/body\[data-screen="camp"\] \.topbar\{display:none\}/,"plus de logo au camp, même sur l'accueil");
assert.match(css,/body\[data-screen="camp"\]:not\(\[data-camp-scene="home"\]\) \.app-shell\{padding-top:calc\(var\(--hud-top-h\) \+ 24px\)\}/,"chaque lieu commence sous la barre");
assert.match(css,/body\[data-screen="camp"\]\[data-camp-scene="home"\] \.app-shell\{padding-top:calc\(var\(--hud-top-h\) \+ 18px\)\}/);
assert.match(css,/\.hud-side--left \.hud-menu-list\{left:0;right:auto\}/,"le menu Taverne s'ouvre depuis la gauche");
assert.match(css,/body\[data-screen="mission"\] \.game-hud\{display:none\}/,"en combat, aucune des deux barres");

// --- Les barres par culture (hud-bars.js) ---------------------------------------------------------------------------------
const {HUD_BARS}=require("../prototype-web/hud-bars.js");
const cultures=JSON.parse(fs.readFileSync(path.join(WEB,"..","data","reference","cultures.json"),"utf8")).rows;
const slugOf=s=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
assert.deepEqual(Object.keys(HUD_BARS).sort(),cultures.map(c=>slugOf(c.nom)).sort(),"les 32 cultures ont leur barre (Idan, 2026-11-13)");
for(const [key,bar] of Object.entries(HUD_BARS)){
  assert.ok(cultures.some(c=>c.nom===bar.culture),bar.culture);
  assert.equal(key,slugOf(bar.culture));
  for(const piece of ["left","center","right"]) assert.ok(fs.existsSync(path.join(WEB,"assets","hud","barres",key,piece+".webp")),key+"/"+piece);
  assert.ok(bar.frameTop<=bar.bandTop&&bar.bandTop<bar.bandBottom&&bar.bandBottom<=bar.frameBottom&&bar.frameBottom<bar.h,key+" : cadre et bande");
  assert.ok(bar.bandBottom-bar.bandTop>=40,key+" : bande assez haute pour écrire");
  assert.ok(bar.bandLeft<bar.left&&bar.bandRight<bar.right,key+" : la bande traverse les embouts");
}
// Le script reconnaît la culture d'un pack par son dossier (peuple, puis mots).
const {cultureOfPack}=require("../scripts/build-hud-bars.js");
const packCulture=pack=>cultureOfPack(pack,cultures)?.nom;
assert.equal(packCulture("Humains/nordique"),"Montagnes du Nord","un humain nordique : pas les Tribus nordiques (hommes-bêtes)");
assert.equal(packCulture("Orcs/orques-noirs"),"Orcs noirs");
assert.equal(packCulture("Gnomes/gnomes-forets"),"Gnomes des forêts");
assert.equal(packCulture("Gobelins/gobelins-cavernes-ferrailleurs"),"Caravanes de ferrailleurs");
assert.equal(packCulture("Elfes/elfes-solaires"),"Elfes des grandes cités");
assert.equal(packCulture("Nains/nains-fer-entrave"),"Nains esclaves");
assert.equal(packCulture("Hommes Betes/hommes-betes-runiques"),"Tribus nordiques");
assert.equal(packCulture("Humains/grandes-steppes"),"Steppes désertiques","les Clans des grandes steppes sont des hommes-bêtes");
assert.equal(packCulture("Hommes Betes/hommes-betes-steppes"),"Clans des grandes steppes");
assert.equal(packCulture("Elfes/inconnus"),undefined);

// L'écu des 60 blasons (blason-bodies.js) : [gauche, haut, droite, bas] de l'écu, puis l'étendue de l'image [gauche, haut, droite].
const {BLASON_BODIES}=require("../prototype-web/blason-bodies.js");
assert.equal(Object.keys(BLASON_BODIES).length,60);
for(const [n,b] of Object.entries(BLASON_BODIES)){
  assert.equal(b.length,7,"blason "+n);
  const [x0,y0,x1,y1,ox0,oy0,ox1]=b;
  assert.ok(0<=x0&&x0<x1&&x1<=1&&0<=y0&&y0<y1&&y1<=1,"écu du blason "+n);
  assert.ok(ox0<=x0&&oy0<=y0&&ox1>=x1,"l'image entière contient l'écu ("+n+")");
  assert.ok(y1-y0>=.5&&x1-x0>=.35,"un écu, pas un détail ("+n+")");
}

// --- Blason, culture du capitaine, chiffres ---------------------------------------------------------------------------------------
const start=js.indexOf("const HUD_BLASON_COUNT=60;");
const hud=new Function("game","$","document","pictoSlug","HUD_BARS","BLASON_BODIES",js.slice(start,js.indexOf("function renderGameHud(){",start))+"return {hudBlasonUrl,hudNumber,renderHudIdentity};");
// La barre : ses variables CSS et les images de ses trois morceaux.
const props={},pieces={left:{style:{}},center:{style:{}},right:{style:{}}},classes=new Set();
const bar={style:{setProperty:(k,v)=>{props[k]=v;},removeProperty:k=>{delete props[k];}},classList:{toggle:(c,on)=>on?classes.add(c):classes.delete(c)},
  querySelector:sel=>pieces[sel.replace(".hud-bar-","")]||null};
const body={dataset:{}};
const rootProps={},root={style:{setProperty:(k,v)=>{rootProps[k]=v;},removeProperty:k=>{delete rootProps[k];}}};
const img={attrs:{},hidden:true,getAttribute(k){return this.attrs[k]??null;},setAttribute(k,v){this.attrs[k]=v;}};
const game={campaign:{company:{blason:7}},captain:{people:"Nain",culture:"Nains des montagnes"}};
const slug=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const ui=hud(game,id=>id==="hud-blason"?img:null,{body,documentElement:root,querySelector:sel=>sel===".game-top-bar"?bar:null},slug,HUD_BARS,BLASON_BODIES);
assert.equal(ui.hudBlasonUrl(1),"assets/creation/blasons-hd/b01.webp","le blason en haute définition (il est grand)");
assert.equal(ui.hudBlasonUrl(60),"assets/creation/blasons-hd/b60.webp");
for(const bad of [0,61,1.5,null,undefined,"x"]) assert.equal(ui.hudBlasonUrl(bad),"",String(bad));
for(let n=1;n<=60;n++) assert.ok(fs.existsSync(path.join(WEB,ui.hudBlasonUrl(n))),"blason "+n);
ui.renderHudIdentity();
assert.deepEqual([body.dataset.captainCulture,img.attrs.src,img.hidden],["nains-des-montagnes","assets/creation/blasons-hd/b07.webp",false]);
assert.deepEqual(rootProps,Object.fromEntries(["x0","y0","x1","y1","ox0","oy0","ox1"].map((k,i)=>["--bl-"+k,String(BLASON_BODIES[7][i])])),"l'écu du blason 7");
const nains=HUD_BARS["nains-des-montagnes"];
assert.ok(classes.has("has-art"),"la barre illustrée des Nains des montagnes");
assert.deepEqual(props,{"--hb-h":String(nains.h),"--hb-lw":String(nains.left),"--hb-rw":String(nains.right),"--hb-bt":String(nains.bandTop),
  "--hb-band":String(nains.bandBottom-nains.bandTop),"--hb-li":String(nains.bandLeft),"--hb-ri":String(nains.bandRight)});
assert.equal(pieces.center.style.backgroundImage,'url("assets/hud/barres/nains-des-montagnes/center.webp")');
// Une culture sans pack (une culture ajoutée plus tard) : le cadre provisoire, sans image ni mesure.
game.captain.culture="Culture à venir";
ui.renderHudIdentity();
assert.ok(!classes.has("has-art"));
assert.deepEqual([Object.keys(props).length,pieces.left.style.backgroundImage],[0,""]);
game.captain.culture="Nains des montagnes";
assert.equal("captainPeople" in body.dataset,false,"la barre suit la culture, pas le peuple (Idan)");
// L'espace des milliers, comme sur la maquette : « 10 000 ».
assert.match(ui.hudNumber(10000),/^10\s000$/u);
assert.equal(ui.hudNumber(313.4),"313");
// Une partie d'avant la nouvelle création : pas de blason, la barre s'en passe.
delete game.campaign.company.blason;
ui.renderHudIdentity();
assert.equal(img.hidden,true);
assert.deepEqual(rootProps,{},"sans blason, les valeurs par défaut de styles.css");
// Retour au menu : plus de partie, plus de culture sur la page.
game.campaign=null;
ui.renderHudIdentity();
assert.equal("captainCulture" in body.dataset,false);
assert.match(js,/renderGameHud\(\)\{\n  const hud=\$\("game-hud"\);\n  const active=[^\n]+\n  hud\.classList\.toggle\("hidden",!active\);\n  renderHudIdentity\(\);/);

console.log("camp top bar ok");
