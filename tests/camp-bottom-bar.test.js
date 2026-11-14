"use strict";

// La barre du bas du camp (Idan, 2026-11-14) : le milieu de la barre illustrée de la culture du capitaine, d'un bord à
// l'autre de l'écran (« en bas, on va mettre que la partie centre de la barre et on va l'étendre jusqu'au bout ») ; au
// centre, l'anneau de la culture (ornement_central) et le bouton Jour suivant d'Idan (next.png) ; quatre lieux de chaque
// côté, en pictos seuls (« que des pictos »), retirés pour l'instant (« retire temporairement tous les boutons dedans sauf
// le next ») ; le journal au-dessus de la barre. Une culture à la fois : « on fait que la barre nordique ».
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const WEB=path.resolve(__dirname,"..","prototype-web");
const html=fs.readFileSync(path.join(WEB,"index.html"),"utf8");
const css=fs.readFileSync(path.join(WEB,"styles.css"),"utf8");
const js=fs.readFileSync(path.join(WEB,"screen-ui.js"),"utf8");
const merchantJs=fs.readFileSync(path.join(WEB,"merchant-ui.js"),"utf8");
const {HUD_BARS}=require("../prototype-web/hud-bars.js");

// --- Les boutons ----------------------------------------------------------------------------------------------------------
const bottom=html.slice(html.indexOf('<div class="game-bottom-bar">'),html.indexOf("</aside>",html.indexOf('<div class="game-bottom-bar">')));
const places=[...bottom.matchAll(/<button id="(hud-[\w-]+-btn)" class="hud-nav"[^>]*>(.*?)<\/button>/g)].map(([,id,inner])=>{
  const tag=bottom.slice(bottom.indexOf(`<button id="${id}"`),bottom.indexOf(">",bottom.indexOf(`<button id="${id}"`)));
  return {id,scene:tag.match(/data-hud-scene="(\w+)"/)?.[1]||null,disabled:/\sdisabled\b/.test(tag),title:tag.match(/title="([^"]+)"/)?.[1],
    icon:inner.match(/data-hud-icon="(\w+)"/)?.[1],label:inner.match(/<span class="hud-nav-label">([^<]+)<\/span>/)?.[1]};
});
assert.deepEqual(places.map(p=>p.label),["Château","Marchand","Intendance","Taverne","Dortoir","Construction","Mes bâtiments","Ce bâtiment"],"l'ordre d'Idan");
assert.deepEqual(places.map(p=>p.scene),["home","merchant","quartermaster","tavern","dormitory","company",null,null],"chaque lieu ouvre sa scène");
const CAMP_SCENES=JSON.parse(js.match(/const CAMP_SCENES=(\[[^\]]+\]);/)[1]);
for(const p of places.filter(p=>p.scene&&p.scene!=="home")) assert.ok(CAMP_SCENES.includes(p.scene),p.scene);
assert.deepEqual(places.filter(p=>p.disabled).map(p=>p.label),["Marchand","Mes bâtiments","Ce bâtiment"],
  "grisés : le Marchand tant qu'il n'y en a pas, Mes bâtiments et Ce bâtiment (plus tard)");
for(const p of places){
  assert.ok(p.title,p.label+" : son nom au survol");
  assert.match(js,new RegExp(`\\n  ${p.icon}:'<`),p.label+" : son picto ("+p.icon+")");
}
assert.ok(bottom.indexOf('id="hud-tavern-menu"')>bottom.indexOf('id="hud-tavern-btn"'),"la Taverne garde son menu");
// Pour l'instant, seul le bouton Jour suivant est dans la barre ; chaque lieu garde son « ← Retour au camp ».
assert.equal([...bottom.matchAll(/<nav class="hud-side hud-side--(?:left|right)" aria-label="[^"]+" hidden>/g)].length,2,"les lieux, cachés");
assert.match(css,/\.hud-side\[hidden\]\{display:none\}/);
assert.match(css,/\.hud-center\{position:relative;grid-column:2;/,"le bouton reste au centre, avec ou sans les lieux");
assert.doesNotMatch(css,/\.camp-scene-nav\{display:none\}/,"le retour au camp reste visible dans chaque lieu");
assert.equal((html.match(/data-camp-back>← Retour au camp<\/button>/g)||[]).length,(html.match(/class="camp-scene-nav"/g)||[]).length);
assert.match(bottom,/<button id="hud-next-day-btn" class="hud-play" type="button" aria-label="Jour suivant" title="Jour suivant"><img class="hud-play-img" src="assets\/hud\/next\.webp"/,"le bouton d'Idan");
assert.ok(fs.existsSync(path.join(WEB,"assets","hud","next.webp")));
assert.match(bottom,/<img class="hud-ornament" alt="" aria-hidden="true" hidden>/,"l'anneau, posé quand la culture en a un");

// --- Mise en page --------------------------------------------------------------------------------------------------------
assert.match(css,/\.game-bottom-bar\{--hb-k:calc\(var\(--hb-B\) \/ var\(--hb-band,90\)\);position:fixed;left:0;right:0;bottom:0;height:var\(--hud-bottom-h\);/);
assert.match(css,/\.game-bottom-bar \.hud-bar-art\{left:0;right:0;/,"d'un bord à l'autre de l'écran");
assert.match(css,/\.game-bottom-bar \.hud-bar-left,\.game-bottom-bar \.hud-bar-right\{display:none\}/,"sans les embouts");
assert.match(css,/\.game-bottom-bar \.hud-bar-center\{left:0;right:0\}/,"le milieu de la barre seul, répété");
assert.match(css,/\.hud-nav-label\{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect\(0 0 0 0\);/,"pictos seuls : le nom reste pour les lecteurs d'écran");
assert.match(css,/--or-k:calc\(var\(--hb-B\) \* 1\.75 \/ var\(--or-hole,295\)\);/,"le trou de l'anneau fait 1,75 bande");
assert.match(css,/--nx-d:calc\(var\(--hb-B\) \* 1\.82\);/,"le disque du bouton passe sous l'anneau");
assert.match(css,/body\[data-screen="camp"\] \.app-shell\{padding-bottom:calc\(var\(--hud-bottom-h\) \+ 36px\)\}/,"les lieux s'arrêtent au-dessus de la barre");
assert.doesNotMatch(css,/100dvh - 392px|100dvh - 142px|padding-bottom:112px/,"plus de hauteur fixe pour l'ancienne barre");

// --- Les anneaux (hud-bars.js) -------------------------------------------------------------------------------------------
const rings=Object.entries(HUD_BARS).filter(([,bar])=>bar.ornament);
assert.ok(rings.some(([key])=>key==="montagnes-du-nord"),"l'anneau des Montagnes du Nord (Humains/nordique)");
for(const [key,{ornament:o}] of rings){
  assert.ok(fs.existsSync(path.join(WEB,"assets","hud","barres",key,"ornement.webp")),key);
  assert.ok(o.w<=800&&o.hole>o.h/4&&o.x0<o.cx-o.hole/2&&o.x1>o.cx+o.hole/2&&o.y0<o.cy-o.hole/2&&o.y1>o.cy+o.hole/2,key+" : un trou dans l'anneau");
}
for(const [key,bar] of Object.entries(HUD_BARS)) if(!bar.ornament) assert.ok(!fs.existsSync(path.join(WEB,"assets","hud","barres",key,"ornement.webp")),key);

// --- Barre et anneau selon la culture (screen-ui.js) ----------------------------------------------------------------------
const start=js.indexOf("const HUD_BAR_PIECES=");
const hud=new Function("document","HUD_BARS",js.slice(start,js.indexOf("// Le nom de la compagnie tient dans sa place",start))+"return {applyHudBar};");
const fakeBar=()=>{
  const bar={props:{},classes:new Set(),pieces:{left:{style:{}},center:{style:{}},right:{style:{}}}};
  bar.style={setProperty:(k,v)=>{bar.props[k]=v;},removeProperty:k=>{delete bar.props[k];}};
  bar.classList={toggle:(c,on)=>on?bar.classes.add(c):bar.classes.delete(c)};
  bar.querySelector=sel=>bar.pieces[sel.replace(".hud-bar-","")]||null;
  return bar;
};
const topBar=fakeBar(),bottomBar=fakeBar(),rootProps={};
const ornament={attrs:{},hidden:true,setAttribute(k,v){this.attrs[k]=v;}};
const doc={documentElement:{style:{setProperty:(k,v)=>{rootProps[k]=v;},removeProperty:k=>{delete rootProps[k];}}},
  querySelector:sel=>({".game-top-bar":topBar,".game-bottom-bar":bottomBar,".hud-ornament":ornament})[sel]||null};
const ui=hud(doc,HUD_BARS);
ui.applyHudBar("montagnes-du-nord");
const nord=HUD_BARS["montagnes-du-nord"];
assert.deepEqual(bottomBar.props,topBar.props,"la même barre en haut et en bas");
assert.equal(bottomBar.pieces.center.style.backgroundImage,'url("assets/hud/barres/montagnes-du-nord/center.webp")');
assert.ok(bottomBar.classes.has("has-art")&&bottomBar.classes.has("has-ornament"));
assert.deepEqual(rootProps,Object.fromEntries(Object.entries(nord.ornament).map(([k,v])=>["--or-"+k,String(v)])),"les mesures de l'anneau");
assert.deepEqual([ornament.attrs.src,ornament.hidden],["assets/hud/barres/montagnes-du-nord/ornement.webp",false]);
const without=Object.keys(HUD_BARS).find(key=>!HUD_BARS[key].ornament);
ui.applyHudBar(without);
assert.ok(topBar.classes.has("has-art"),"en haut, toutes les cultures");
assert.ok(!bottomBar.classes.has("has-art")&&!bottomBar.classes.has("has-ornament"),"en bas, une culture sans anneau : le cadre provisoire et le bouton seul");
assert.deepEqual([bottomBar.props,bottomBar.pieces.center.style.backgroundImage,rootProps,ornament.hidden],[{},"",{},true]);
ui.applyHudBar("culture-a-venir");
assert.ok(!bottomBar.classes.has("has-art")&&!topBar.classes.has("has-art"),"sans pack : le cadre provisoire, en haut et en bas");

// --- Le lieu où l'on est, les clics --------------------------------------------------------------------------------------
const mark=new Function("document",js.slice(js.indexOf("function updateCampHomeIcon(){"),js.indexOf("function closeCampSceneFromOutside("))+"return updateCampHomeIcon;");
const button=(scene,id="")=>({id,dataset:{hudScene:scene},classes:new Set(),attrs:{},disabled:false,textContent:" "+scene+" ",
  classList:{toggle(c,on){on?this.owner.classes.add(c):this.owner.classes.delete(c);}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}});
const buttons=["home","quartermaster","tavern"].map(scene=>{const b=button(scene,scene==="tavern"?"hud-tavern-btn":"");b.classList.owner=b;return b;});
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
open({...button("dormitory"),textContent:"Dortoir"});
assert.deepEqual(calls,[["scene","dormitory"],["journal","Destination : Dortoir."]]);
calls.length=0;
open({...button("merchant"),disabled:true});
assert.deepEqual(calls,[],"un bouton grisé ne fait rien");
// Le Marchand de la barre suit le marchand du jour (merchant-ui.js).
assert.match(merchantJs,/hudButton\.disabled=!visit;\n    hudButton\.title=visit\?"Marchand : "\+visit\.merchant\.name:"Pas de marchand aujourd’hui";/);

console.log("camp bottom bar ok");
