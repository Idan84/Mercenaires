"use strict";

// La barre du bas du camp (Idan, 2026-11-14 ; réglée par culture dans l'Atelier des barres) : le milieu de la barre
// illustrée de la culture du capitaine, d'un bord à l'autre de l'écran (« en bas, on va mettre que la partie centre de la
// barre et on va l'étendre jusqu'au bout ») ; au centre, le bouton Jour suivant d'Idan (next.png) dans l'anneau de la
// culture (ornement_central) ; à gauche de l'anneau, les six lieux en pictos d'Idan (« je pense que tu les câbleras sans
// moi ») ; le menu de l'accueil du camp est retiré (« on peut retirer les boutons du menu principal ») ; la partie droite
// viendra plus tard ; le journal est retiré pour l'instant.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const WEB=path.resolve(__dirname,"..","prototype-web");
const html=fs.readFileSync(path.join(WEB,"index.html"),"utf8");
const css=fs.readFileSync(path.join(WEB,"styles.css"),"utf8");
const js=fs.readFileSync(path.join(WEB,"screen-ui.js"),"utf8");
const merchantJs=fs.readFileSync(path.join(WEB,"merchant-ui.js"),"utf8");
const {HUD_BARS}=require("../prototype-web/hud-bars.js");
const {bottomLayout}=require("../scripts/build-hud-bars.js");

// --- Les lieux ------------------------------------------------------------------------------------------------------------
const bottom=html.slice(html.indexOf('<div class="game-bottom-bar">'),html.indexOf("</aside>",html.indexOf('<div class="game-bottom-bar">')));
const places=[...bottom.matchAll(/<button id="(hud-[\w-]+-btn)" class="hud-nav"([^>]*)><img class="hud-nav-img" src="([^"]+)" alt="" width="200" height="200"><span class="hud-nav-label">([^<]+)<\/span><\/button>/g)]
  .map(([,id,attrs,src,label])=>({id,src,label,scene:attrs.match(/data-hud-scene="(\w+)"/)?.[1],disabled:/\sdisabled\b/.test(attrs),title:attrs.match(/title="([^"]+)"/)?.[1]}));
assert.deepEqual(places.map(p=>p.label),["Château","Taverne","Dortoir","Marchand","Intendance","Construction"],"dans l'ordre des images d'Idan (1 à 6)");
assert.deepEqual(places.map(p=>p.scene),["home","tavern","dormitory","merchant","quartermaster","company"],"chaque picto ouvre son lieu");
assert.deepEqual(places.map(p=>p.src),["chateau","taverne","dortoir","marchand","intendance","construction"].map(k=>`assets/hud/pictos-bas/${k}.webp`));
for(const p of places){
  assert.ok(fs.existsSync(path.join(WEB,p.src)),p.src);
  assert.ok(p.title,p.label+" : son nom au survol");
}
const CAMP_SCENES=JSON.parse(js.match(/const CAMP_SCENES=(\[[^\]]+\]);/)[1]);
for(const p of places.filter(p=>p.scene!=="home")) assert.ok(CAMP_SCENES.includes(p.scene),p.scene);
assert.deepEqual(places.filter(p=>p.disabled).map(p=>p.label),["Marchand"],"grisé : le Marchand tant qu'il n'y en a pas");
assert.ok(bottom.indexOf('<nav class="hud-places" aria-label="Lieux du camp">')<bottom.indexOf('id="hud-castle-btn"'));
assert.ok(bottom.indexOf('id="hud-tavern-menu"')>bottom.indexOf('id="hud-tavern-btn"')&&bottom.indexOf('id="hud-tavern-menu"')<bottom.indexOf('id="hud-dormitory-btn"'),"la Taverne garde son menu");
assert.match(bottom,/<button id="hud-next-day-btn" class="hud-play" type="button" aria-label="Jour suivant" title="Jour suivant"><img class="hud-play-img" src="assets\/hud\/next\.webp"/,"le bouton d'Idan");
assert.ok(fs.existsSync(path.join(WEB,"assets","hud","next.webp")));
assert.match(bottom,/<img class="hud-ornament" alt="" aria-hidden="true" hidden>/,"l'anneau, posé quand la culture en a un");
assert.match(bottom,/<section id="hud-journal" class="hud-journal" aria-label="Journal de la compagnie" hidden>/,"le journal, retiré pour l'instant");
assert.match(bottom,/<div class="hud-bar-art" aria-hidden="true"><span class="hud-bar-piece hud-bar-center"><\/span><\/div>/,"le milieu de la barre seul");
// L'accueil du camp : le château seul, sans menu ; chaque lieu garde son « ← Retour au camp ».
assert.match(html,/<section id="camp-home" class="camp-hub" aria-label="Accueil du camp"><\/section>/);
assert.doesNotMatch(html+css,/camp-hub-menu|camp-hub-btn|camp-merchant/);
assert.equal((html.match(/data-camp-back>← Retour au camp<\/button>/g)||[]).length,(html.match(/class="camp-scene-nav"/g)||[]).length);

// --- Mise en page --------------------------------------------------------------------------------------------------------
assert.match(css,/--hud-bottom-h:calc\(var\(--hb-B\) \* var\(--bb-h\)\);/,"la place que prend la barre, selon la culture");
assert.match(css,/\.game-bottom-bar\{position:fixed;left:0;right:0;bottom:0;height:var\(--hud-bottom-h\);/);
assert.match(css,/\.game-bottom-bar \.hud-bar-art\{left:0;right:0;top:auto;bottom:calc\(var\(--hb-B\) \* var\(--bb-art-bas\)\);height:calc\(var\(--hb-B\) \* var\(--bb-art-haut\)\)\}/,"d'un bord à l'autre de l'écran");
assert.match(css,/\.hud-play\{position:absolute;left:50%;bottom:calc\(var\(--hb-B\) \* \(var\(--bb-centre\) - var\(--bb-bouton\) \/ 2\)\);/,"le bouton au milieu");
assert.match(css,/\.hud-ornament\{position:absolute;left:calc\(50% - var\(--hb-B\) \* var\(--bb-anneau\) \/ 2\);bottom:calc\(var\(--hb-B\) \* \(var\(--bb-centre\) - var\(--bb-anneau\) \/ 4\)\);z-index:2;/,"l'anneau autour du bouton, par-dessus");
assert.match(css,/\.hud-places\{position:absolute;right:calc\(50% \+ var\(--hb-B\) \* var\(--bb-pictos-droite\)\);bottom:calc\(var\(--hb-B\) \* \(var\(--bb-pictos-y\) - var\(--bb-picto\) \/ 2\)\);/,"les pictos contre l'anneau");
assert.match(css,/\.hud-nav-label\{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect\(0 0 0 0\);/,"pictos seuls : le nom reste pour les lecteurs d'écran");
assert.match(css,/\.hud-nav:disabled\{filter:grayscale\(1\)/);
assert.match(css,/\.hud-places \.hud-menu-list\{left:0;right:auto\}/,"le menu Taverne s'ouvre au-dessus de son picto");
assert.match(css,/body\[data-screen="camp"\] \.app-shell\{padding-bottom:calc\(var\(--hud-bottom-h\) \+ 36px\)\}/,"les lieux s'arrêtent au-dessus de la barre");

// --- La barre du bas de chaque culture (hud-bars.js, bas) ----------------------------------------------------------------
const settings=JSON.parse(fs.readFileSync(path.join(__dirname,"..","scripts","hud-bars-reglages.json"),"utf8")).cultures;
for(const [key,bar] of Object.entries(HUD_BARS)){
  assert.ok(bar.ornament&&bar.bas,key+" : son anneau et sa barre du bas");
  assert.ok(fs.existsSync(path.join(WEB,"assets","hud","barres",key,"ornement.webp")),key);
  const o=bar.ornament,b=bar.bas,s=settings[key].bas;
  assert.ok(o.w<=800&&o.hole>o.h/4&&o.x0<o.cx-o.hole/2&&o.x1>o.cx+o.hole/2&&o.y0<o.cy-o.hole/2&&o.y1>o.cy+o.hole/2,key+" : un trou dans l'anneau");
  assert.equal(b.bouton,s.bouton,key);
  assert.equal(b.centre,Math.round((s.ligne-s.decalage*s.bouton/600)*1e4)/1e4,key+" : le bouton sous la ligne, de decalage pixels de l'anneau");
  assert.equal(b.anneau,Math.round(1600*s.bouton/600*s.anneau/100*1e4)/1e4,key+" : l'anneau fait 1600 px quand le bouton en fait 600");
  assert.ok(b.artBas<0&&b.artBas+b.artHaut>s.ligne,key+" : l'image dépasse sous l'écran et au-dessus de la ligne");
  assert.ok(b.pictosDroite>b.bouton/2,key+" : les pictos à gauche du bouton");
  assert.ok(b.pictosY>b.picto/2&&b.pictosY+b.picto/2<s.ligne,key+" : les pictos dans la barre");
  assert.ok(b.hauteur>=s.ligne&&b.hauteur>=b.centre+b.bouton/2,key);
  // Sur le plus petit écran (1280 px : bande de 54,4 px), les six pictos tiennent dans la moitié gauche.
  assert.ok(b.pictosDroite+6*b.picto+5*b.ecart<640/54.4,key+" : les pictos tiennent dans l'écran");
}
// Le calcul : une barre dont la ligne du haut est à 50 px de l'image et la bande sombre de 60 à 160 px ; un anneau carré
// plein de 400 px (pour l'image WebP), sauf ses 100 premières colonnes.
const fakeBar={h:200,frameTop:40,bandTop:60,bandBottom:160};
const ring={w:400,h:200,left:Array(200).fill(100)};
const base={ligne:1.1,rogner:0,decalage:0,bouton:1.5,anneau:100,pictoTaille:.8,pictoEcart:.3,pictoAnneau:.2,pictoHaut:0};
const lay=bottomLayout(fakeBar,base,ring);
assert.equal(lay.centre,1.1,"sans décalage, le bouton est centré sur la ligne");
assert.equal(lay.anneau,4,"1600 × 1,5 / 600");
assert.equal(lay.artHaut,2,"la ligne (50 px) à 1,1 B et la bande finit au bas de l'écran : 0,01 B par pixel");
assert.equal(lay.artBas,-.4,"le bas de l'image, 40 px sous l'écran");
assert.equal(lay.pictosY,.5,"au milieu de la bande sombre (100 px)");
assert.equal(lay.pictosDroite,1.2,"le bord de l'anneau (moitié de 4 B, moins 100 colonnes de 0,01 B) plus 0,2 B");
assert.equal(bottomLayout(fakeBar,{...base,pictoHaut:.1},ring).pictosY,.4,"pictoHaut les relève");
assert.equal(bottomLayout(fakeBar,{...base,decalage:60},ring).centre,.95,"60 px de l'anneau : 0,15 B plus bas");
assert.equal(bottomLayout(fakeBar,{...base,rogner:10},ring).artHaut,2.2,"rogner : la bande finit 10 px plus haut, la barre grandit");
// Sur ses lignes, l'anneau ne touche pas les pictos : le bord du bouton compte.
assert.equal(bottomLayout(fakeBar,base,{w:400,h:200,left:Array(200).fill(null)}).pictosDroite,Math.round((Math.sqrt(.75**2-.2**2)+.2)*1e4)/1e4);

// --- Barre et anneau selon la culture (screen-ui.js) ----------------------------------------------------------------------
const start=js.indexOf("const HUD_BAR_PIECES=");
const hud=new Function("document","HUD_BARS",js.slice(start,js.indexOf("// Le nom de la compagnie tient dans sa place",start))+"return {applyHudBar};");
const fakeEl=()=>{
  const el={props:{},classes:new Set(),pieces:{center:{style:{}},right:{style:{}}}};
  el.style={setProperty:(k,v)=>{el.props[k]=v;},removeProperty:k=>{delete el.props[k];}};
  el.classList={toggle:(c,on)=>on?el.classes.add(c):el.classes.delete(c)};
  el.querySelector=sel=>el.pieces[sel.replace(".hud-bar-","")]||null;
  return el;
};
const topBar=fakeEl(),bottomBar=fakeEl(),rootProps={};
const ornament={attrs:{},hidden:true,setAttribute(k,v){this.attrs[k]=v;}};
const doc={documentElement:{style:{setProperty:(k,v)=>{rootProps[k]=v;},removeProperty:k=>{delete rootProps[k];}}},
  querySelector:sel=>({".game-top-bar":topBar,".game-bottom-bar":bottomBar,".hud-ornament":ornament})[sel]||null};
const ui=hud(doc,HUD_BARS);
ui.applyHudBar("montagnes-du-nord");
const nord=HUD_BARS["montagnes-du-nord"];
assert.deepEqual(bottomBar.props,topBar.props,"la même barre en haut et en bas");
assert.equal(bottomBar.pieces.center.style.backgroundImage,'url("assets/hud/barres/montagnes-du-nord/center.webp")');
assert.ok(bottomBar.classes.has("has-art")&&bottomBar.classes.has("has-ornament"));
const names={artBas:"art-bas",artHaut:"art-haut",centre:"centre",bouton:"bouton",anneau:"anneau",picto:"picto",ecart:"ecart",pictosDroite:"pictos-droite",pictosY:"pictos-y",hauteur:"h"};
assert.deepEqual(Object.fromEntries(Object.entries(rootProps).filter(([k])=>k.startsWith("--bb-"))),
  Object.fromEntries(Object.entries(names).map(([k,n])=>["--bb-"+n,String(nord.bas[k])])),"les réglages d'Idan pour la barre du bas");
assert.deepEqual([ornament.attrs.src,ornament.hidden],["assets/hud/barres/montagnes-du-nord/ornement.webp",false]);
ui.applyHudBar("culture-a-venir");
assert.ok(!bottomBar.classes.has("has-art")&&!topBar.classes.has("has-art")&&!bottomBar.classes.has("has-ornament"),"sans pack : le cadre provisoire et le bouton seul");
assert.deepEqual([bottomBar.props,rootProps,ornament.hidden],[{},{},true],"et les valeurs de départ de styles.css");

// --- Le lieu où l'on est, les clics --------------------------------------------------------------------------------------
const mark=new Function("document",js.slice(js.indexOf("function updateCampHomeIcon(){"),js.indexOf("function closeCampSceneFromOutside("))+"return updateCampHomeIcon;");
const button=(scene,id="",label=scene)=>{
  const b={id,dataset:{hudScene:scene},classes:new Set(),attrs:{},disabled:false,textContent:" "+label+" ",setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}};
  b.classList={toggle:(c,on)=>on?b.classes.add(c):b.classes.delete(c)};
  return b;
};
const buttons=[button("home"),button("quartermaster"),button("tavern","hud-tavern-btn")];
const body={dataset:{screen:"camp",campScene:"quartermaster"}};
mark({body,querySelectorAll:()=>buttons})();
assert.deepEqual(buttons.map(b=>[b.classes.has("is-current"),b.attrs["aria-current"]||""]),[[false,""],[true,"page"],[false,""]],"l'Intendance est marquée");
const calls=[];
const open=new Function("document","openCampScene","gameAction",js.slice(js.indexOf("function openHudScene(button){"),js.indexOf("function toggleHudJournal("))+"return openHudScene;")(
  {body},scene=>calls.push(["scene",scene]),message=>calls.push(["journal",message]));
open(buttons[1]);
assert.deepEqual(calls,[],"rien sur le lieu où l'on est déjà");
open(buttons[2]);
assert.deepEqual(calls,[],"la Taverne ouvre son menu (tavern-ui.js)");
open(buttons[0]);
assert.deepEqual(calls,[["scene","home"],["journal","Retour au château."]]);
calls.length=0;
open(button("dormitory","","Dortoir"));
assert.deepEqual(calls,[["scene","dormitory"],["journal","Destination : Dortoir."]]);
calls.length=0;
const roster=button("mercenaries","","Effectif 15 / 25");
roster.dataset.destination="Mes mercenaires";
open(roster);
assert.deepEqual(calls,[["scene","mercenaries"],["journal","Destination : Mes mercenaires."]],"les mercenaires de la barre du haut");
calls.length=0;
open({...button("merchant"),disabled:true});
assert.deepEqual(calls,[],"un bouton grisé ne fait rien");
// Le Marchand de la barre suit le marchand du jour (merchant-ui.js).
assert.match(merchantJs,/hudButton\.disabled=!visit;\n  hudButton\.title=visit\?"Marchand : "\+visit\.merchant\.name:"Pas de marchand aujourd’hui";/);

console.log("camp bottom bar ok");
