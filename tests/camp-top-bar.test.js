"use strict";

// La barre du haut du camp (Idan, 2026-11-13, d'après sa maquette ; réglée par culture dans l'Atelier des barres,
// 2026-11-14) : la barre illustrée de la culture du capitaine (packs d'Idan, scripts/build-hud-bars.js → hud-bars.js),
// sans embout à gauche ni blason ; le nom et les étoiles de la compagnie sur une ligne, ses chiffres (or, salaires,
// mercenaires) avec les pictos d'Idan, la date et le bouton menu (Échap) ; plus de logo au camp. La barre du bas :
// tests/camp-bottom-bar.test.js.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const WEB=path.resolve(__dirname,"..","prototype-web");
const html=fs.readFileSync(path.join(WEB,"index.html"),"utf8");
const css=fs.readFileSync(path.join(WEB,"styles.css"),"utf8");
const js=fs.readFileSync(path.join(WEB,"screen-ui.js"),"utf8");

// --- La barre ------------------------------------------------------------------------------------------------------------
const top=html.slice(html.indexOf('<div class="game-top-bar">'),html.indexOf('<div class="game-bottom-bar">'));
const ids=part=>[...part.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]);
assert.deepEqual(ids(top),["hud-company","hud-renown","hud-gold-stat","hud-gold","hud-upkeep","hud-roster","hud-calendar","hud-date","hud-day","hud-pause-btn"],
  "à gauche : nom, étoiles, puis or, salaires, mercenaires ; à droite : la date et le bouton menu");
assert.doesNotMatch(top+js+css,/hud-blason|--bl-|BLASON_BODIES/,"plus de blason dans la barre (Idan, 2026-11-14 : l'essai sans blason)");
assert.ok(!html.includes('<script src="blason-bodies.js"></script>'));
assert.match(top,/<div class="hud-bar-art" aria-hidden="true"><span class="hud-bar-piece hud-bar-center"><\/span><span class="hud-bar-piece hud-bar-right"><\/span><\/div>/,
  "pas d'embout à gauche : le milieu sort de l'écran (« laisse la ligne centre aller tout au bout »)");
// Les pictos d'Idan (or, salaires, mercenaires).
const pictos=[...top.matchAll(/<img class="hud-picto" src="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(pictos,["assets/hud/picto-or.webp","assets/hud/picto-salaires.webp","assets/hud/picto-mercenaires.webp"]);
for(const p of pictos) assert.ok(fs.existsSync(path.join(WEB,p)),p);
assert.match(top,/<button id="hud-pause-btn" type="button" aria-label="Ouvrir le menu de pause \(Échap\)" title="Menu \(Échap\)"><span class="hud-icon" data-hud-icon="menu"><\/span><\/button>/);
assert.match(js,/  menu:'<path d="M4\.5 7h15M4\.5 12h15M4\.5 17h15"\/>',/);
// Le menu de l'accueil du camp est retiré : les mercenaires de la barre ouvrent « Mes mercenaires » (souris et clavier).
assert.match(top,/<div class="hud-stat hud-stat--link" title="Mes mercenaires : [^"]+" data-hud-scene="mercenaries" data-destination="Mes mercenaires" role="button" tabindex="0">/);
assert.match(js,/\$\("game-hud"\)\.addEventListener\("keydown",event=>\{\n    const button=event\.target\.closest\?\.\('\[role="button"\]\[data-hud-scene\]'\);/);

// --- Mise en page --------------------------------------------------------------------------------------------------------
// Une seule mesure règle la barre : la hauteur de la bande sombre (85 px pour un écran de 2000 px, comme la maquette) ; les
// réglages d'Idan pour la culture, en bandes B, sont posés sur la page (--ht-*).
assert.match(css,/--hb-B:clamp\(52px,4\.25vw,85px\);/);
assert.match(css,/--hb-top:calc\(var\(--hb-B\) \* var\(--ht-top\)\);/,"la bande sombre à --ht-top bandes du haut de l'écran");
assert.match(css,/--hud-top-h:calc\(var\(--hb-top\) \+ var\(--hb-B\) \* 1\.3\);/,"les lieux commencent sous la barre");
assert.match(css,/\.game-top-bar\{--hb-k:calc\(var\(--hb-B\) \/ var\(--hb-band,90\)\);position:fixed;top:0;/);
assert.match(css,/\.hud-bar-art\{position:absolute;left:0;right:calc\(var\(--hb-B\) \* \.12\);top:calc\(var\(--hb-B\) \* var\(--ht-haut\)\);/,"la barre part du bord gauche");
assert.match(css,/\.hud-bar-center\{left:0;right:calc\(var\(--hb-k\) \* var\(--hb-rw,0\) - 1px\);background-repeat:repeat-x;/,"le milieu se répète jusqu'à l'embout droit");
assert.match(css,/\.hud-top-content\{[^}]*left:calc\(var\(--hb-B\) \* \.5\);right:calc\(var\(--hb-B\) \* var\(--ht-marge\) \+ var\(--hb-k\) \* var\(--hb-ri,0\)\);/,"de l'air à droite du bouton menu (--ht-marge)");
assert.match(css,/--ht-u:calc\(var\(--hb-B\) \* var\(--ht-s\)\);/,"la taille du contenu (--ht-s)");
assert.match(css,/\.game-top-bar \.hud-company\{flex:0 1 auto;flex-direction:row;/,"les étoiles sur la ligne du nom");
assert.match(css,/\.game-top-bar \.hud-stat\{box-sizing:border-box;height:calc\(var\(--hb-B\) \* var\(--ht-fonds\)\);[^}]*border:0;/,"des fonds sombres sans contour, de la hauteur réglée");
assert.match(css,/\.game-top-bar:not\(\.has-art\) \.hud-bar-art\{/,"un cadre provisoire sans pack");
assert.match(css,/#hud-company\.is-two-lines\{[^}]*-webkit-line-clamp:2;/,"un nom trop long passe sur deux lignes");
assert.match(css,/\.game-top-bar #hud-day::before\{content:"\\00a0·\\00a0";/,"la date sur une ligne : « 1 Brumecendre · Jour 1 »");
assert.match(css,/body\[data-screen="camp"\] \.topbar\{display:none\}/,"plus de logo au camp, même sur l'accueil");
assert.match(css,/body\[data-screen="camp"\]:not\(\[data-camp-scene="home"\]\) \.app-shell\{padding-top:calc\(var\(--hud-top-h\) \+ 24px\)\}/,"chaque lieu commence sous la barre");
assert.match(css,/body\[data-screen="camp"\]\[data-camp-scene="home"\] \.app-shell\{padding-top:calc\(var\(--hud-top-h\) \+ 18px\)\}/);
assert.match(css,/body\[data-screen="mission"\] \.game-hud\{display:none\}/,"en combat, aucune des deux barres");
assert.ok(html.indexOf('<script src="hud-bars.js"></script>')>0&&html.indexOf('<script src="hud-bars.js"></script>')<html.indexOf('<script src="screen-ui.js"></script>'));

// --- Les barres par culture (hud-bars.js) ---------------------------------------------------------------------------------
const {HUD_BARS}=require("../prototype-web/hud-bars.js");
const cultures=JSON.parse(fs.readFileSync(path.join(WEB,"..","data","reference","cultures.json"),"utf8")).rows;
const slugOf=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
assert.deepEqual(Object.keys(HUD_BARS).sort(),cultures.map(c=>slugOf(c.nom)).sort(),"les 32 cultures ont leur barre (Idan, 2026-11-13)");
// Les réglages d'Idan (Atelier des barres), une ligne par culture.
const settings=JSON.parse(fs.readFileSync(path.join(__dirname,"..","scripts","hud-bars-reglages.json"),"utf8")).cultures;
assert.deepEqual(Object.keys(settings).sort(),Object.keys(HUD_BARS).sort(),"les 32 cultures ont leurs réglages");
const {topLayout}=require("../scripts/build-hud-bars.js");
for(const [key,bar] of Object.entries(HUD_BARS)){
  assert.ok(cultures.some(c=>c.nom===bar.culture),bar.culture);
  assert.equal(key,slugOf(bar.culture));
  for(const piece of ["center","right"]) assert.ok(fs.existsSync(path.join(WEB,"assets","hud","barres",key,piece+".webp")),key+"/"+piece);
  assert.ok(bar.frameTop<=bar.bandTop&&bar.bandTop<bar.bandBottom&&bar.bandBottom<=bar.frameBottom&&bar.frameBottom<bar.h,key+" : cadre et bande");
  assert.ok(bar.bandBottom-bar.bandTop>=40,key+" : bande assez haute pour écrire");
  assert.ok(bar.bandRight<bar.right,key+" : la bande entre dans l'embout droit");
  // La barre du haut de la culture, d'après les réglages d'Idan.
  assert.deepEqual(bar.haut,topLayout(bar,settings[key].haut),key+" : réglages de la barre du haut");
  assert.ok(bar.haut.top>=bar.haut.haut&&bar.haut.contenu>.5&&bar.haut.contenu<=1.2&&bar.haut.fonds>0&&bar.haut.fonds<1&&bar.haut.marge>=0,key);
}
assert.deepEqual(topLayout({bandTop:50,bandBottom:150},{contenu:85,fonds:.54,margeMenu:1.5,haut:.1}),{top:.6,haut:.1,contenu:.85,fonds:.54,marge:1.5},
  "la bande sombre commence à haut + bandTop / bande bandes du haut de l'écran");
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

// --- La culture du capitaine, les chiffres ---------------------------------------------------------------------------------
const start=js.indexOf("const HUD_BAR_PIECES=");
const hud=new Function("game","$","document","pictoSlug","HUD_BARS",
  js.slice(start,js.indexOf("// Le nom de la compagnie tient dans sa place",start))
  +js.slice(js.indexOf("function hudNumber("),js.indexOf("\n",js.indexOf("function hudNumber(")))
  +js.slice(js.indexOf("function renderHudIdentity(){"),js.indexOf("function renderGameHud(){"))
  +"return {hudNumber,renderHudIdentity};");
const fakeBar=()=>{
  const bar={props:{},classes:new Set(),pieces:{center:{style:{}},right:{style:{}}}};
  bar.style={setProperty:(k,v)=>{bar.props[k]=v;},removeProperty:k=>{delete bar.props[k];}};
  bar.classList={toggle:(c,on)=>on?bar.classes.add(c):bar.classes.delete(c)};
  bar.querySelector=sel=>bar.pieces[sel.replace(".hud-bar-","")]||null;
  return bar;
};
const bar=fakeBar(),body={dataset:{}},rootProps={};
const root={style:{setProperty:(k,v)=>{rootProps[k]=v;},removeProperty:k=>{delete rootProps[k];}}};
const game={campaign:{company:{}},captain:{people:"Nain",culture:"Nains des montagnes"}};
const ui=hud(game,()=>null,{body,documentElement:root,querySelector:sel=>sel===".game-top-bar"?bar:null},slugOf,HUD_BARS);
ui.renderHudIdentity();
const nains=HUD_BARS["nains-des-montagnes"];
assert.equal(body.dataset.captainCulture,"nains-des-montagnes");
assert.ok(bar.classes.has("has-art"),"la barre illustrée des Nains des montagnes");
assert.deepEqual(bar.props,{"--hb-h":String(nains.h),"--hb-rw":String(nains.right),"--hb-bt":String(nains.bandTop),
  "--hb-band":String(nains.bandBottom-nains.bandTop),"--hb-ri":String(nains.bandRight)});
assert.equal(bar.pieces.center.style.backgroundImage,'url("assets/hud/barres/nains-des-montagnes/center.webp")');
assert.equal(bar.pieces.right.style.backgroundImage,'url("assets/hud/barres/nains-des-montagnes/right.webp")');
assert.deepEqual(Object.fromEntries(Object.entries(rootProps).filter(([k])=>k.startsWith("--ht-"))),
  {"--ht-top":String(nains.haut.top),"--ht-haut":String(nains.haut.haut),"--ht-s":String(nains.haut.contenu),"--ht-fonds":String(nains.haut.fonds),"--ht-marge":String(nains.haut.marge)},
  "les réglages d'Idan pour les Nains des montagnes");
// Une culture sans pack (une culture ajoutée plus tard) : le cadre provisoire et les valeurs de départ de styles.css.
game.captain.culture="Culture à venir";
ui.renderHudIdentity();
assert.ok(!bar.classes.has("has-art"));
assert.deepEqual([Object.keys(bar.props).length,bar.pieces.center.style.backgroundImage,Object.keys(rootProps).length],[0,"",0]);
game.captain.culture="Nains des montagnes";
assert.equal("captainPeople" in body.dataset,false,"la barre suit la culture, pas le peuple (Idan)");
// L'espace des milliers, comme sur la maquette : « 10 000 ».
assert.match(ui.hudNumber(10000),/^10\s000$/u);
assert.equal(ui.hudNumber(313.4),"313");
// Retour au menu : plus de partie, plus de culture sur la page.
game.campaign=null;
ui.renderHudIdentity();
assert.equal("captainCulture" in body.dataset,false);
assert.match(js,/renderGameHud\(\)\{\n  const hud=\$\("game-hud"\);\n  const active=[^\n]+\n  hud\.classList\.toggle\("hidden",!active\);\n  renderHudIdentity\(\);/);

console.log("camp top bar ok");
