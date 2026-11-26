"use strict";

// La barre du bas du camp (Idan, 2026-11-14 ; réglée par culture dans l'Atelier des barres) : le milieu de la barre
// illustrée de la culture du capitaine, d'un bord à l'autre de l'écran (« en bas, on va mettre que la partie centre de la
// barre et on va l'étendre jusqu'au bout ») ; au centre, le bouton Jour suivant d'Idan (next.png) dans l'anneau de la
// culture (ornement_central) ; à gauche de l'anneau, les six lieux en pictos d'Idan (« je pense que tu les câbleras sans
// moi ») ; la Taverne mène juste à la taverne (« pas de menu déroulant ») ; le lieu où l'on est est grisé ; le menu de
// l'accueil du camp est retiré (« on peut retirer les boutons du menu principal »). À droite de l'anneau (2026-11-14) :
// le bouton du lieu (« à droite du bouton play, un bouton contextuel » ; dans la taverne, ses cinq zones), puis Combat
// (les missions du jour), Nouvelles (le pigeon), Journal (« il remplace le log ; on peut l'ouvrir en cliquant dessus ») et
// Discussions (bientôt).
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
const placesNav=bottom.slice(bottom.indexOf('<nav class="hud-places"'),bottom.indexOf("</nav>"));
const actionsNav=bottom.slice(bottom.indexOf('<nav class="hud-actions"'),bottom.indexOf("</nav>",bottom.indexOf('<nav class="hud-actions"')));
const pictos=nav=>[...nav.matchAll(/<button id="(hud-[\w-]+-btn)" class="hud-nav"([^>]*)><img class="hud-nav-img" src="([^"]+)" alt="" width="200" height="200"><span class="hud-nav-label">([^<]+)<\/span><\/button>/g)]
  .map(([,id,attrs,src,label])=>({id,src,label,scene:attrs.match(/data-hud-scene="(\w+)"/)?.[1],action:attrs.match(/data-hud-action="(\w+)"/)?.[1],disabled:/\sdisabled\b/.test(attrs),title:attrs.match(/title="([^"]+)"/)?.[1]}));
const places=pictos(placesNav),actions=pictos(actionsNav);
assert.deepEqual(places.map(p=>p.label),["Château","Taverne","Dortoir","Marchand","Intendance","Construction"],"dans l'ordre des images d'Idan (1 à 6)");
assert.deepEqual(places.map(p=>p.scene),["home","tavern","dormitory","merchant","quartermaster","company"],"chaque picto ouvre son lieu");
assert.deepEqual(places.map(p=>p.src),["chateau","taverne","dortoir","marchand","intendance","construction"].map(k=>`assets/hud/pictos-bas/${k}.webp`));
for(const p of [...places,...actions]){
  assert.ok(fs.existsSync(path.join(WEB,p.src)),p.src);
  assert.ok(p.title,p.label+" : son nom au survol");
}
const CAMP_SCENES=JSON.parse(js.match(/const CAMP_SCENES=(\[[^\]]+\]);/)[1]);
for(const p of places.filter(p=>p.scene!=="home")) assert.ok(CAMP_SCENES.includes(p.scene),p.scene);
assert.deepEqual(places.filter(p=>p.disabled).map(p=>p.label),["Marchand"],"grisé : le Marchand tant qu'il n'y en a pas");
assert.ok(bottom.indexOf('<nav class="hud-places" aria-label="Lieux du camp">')<bottom.indexOf('id="hud-castle-btn"'));
assert.doesNotMatch(html+css,/hud-tavern-menu|data-hud-tavern/,"la Taverne n'a plus de menu déroulant (Idan, 2026-11-14)");
assert.doesNotMatch(placesNav,/aria-haspopup/);
// À droite : le bouton du lieu (son menu, rempli selon le lieu), puis les quatre actions.
assert.deepEqual(actions.map(a=>[a.label,a.action,a.src]),[["Combats du jour","combat"],["Nouvelles du jour","news"],["Journal","journal"],["Discussions","talk"]]
  .map(([label,action],i)=>[label,action,`assets/hud/pictos-bas/${["combat","nouvelles","journal","discussions"][i]}.webp`]),"les quatre pictos d'Idan");
assert.deepEqual(actions.filter(a=>a.disabled).map(a=>a.label),["Combats du jour","Discussions"],"grisés tant que rien n'attend (combat, discussion)");
assert.match(actionsNav,/<ul id="hud-action-menu" class="hud-menu-list" role="menu" hidden><\/ul>/,"le menu des combats, s'il y en a plusieurs");
assert.match(actionsNav,/<button id="hud-talk-btn"[^\n]*\n\s*<div id="hud-context" class="hud-context">\s*<button id="hud-context-btn" class="hud-context-btn" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="hud-context-menu"/,"le bouton du lieu à droite des pictos (Idan, 2026-11-14)");
assert.match(css,/\.hud-context \.hud-menu-list\{left:auto;right:0\}/,"son menu calé à droite");
assert.match(actionsNav,/<span class="hud-context-grave"><span id="hud-context-name" class="hud-context-name">Ce lieu<\/span><span class="hud-context-fleche" aria-hidden="true"><\/span><\/span><\/button>/,"le nom du lieu et sa flèche gravés, plus de « ••• »");
assert.match(css,/\.hud-context-btn\{[^}]*background:url\("assets\/hud\/bouton-lieu\.webp"\) center\/100% 100% no-repeat/,"le bouton capitaine en argent (Idan, 2026-11-26)");
assert.match(css,/\.hud-context \.hud-menu-list button::before\{[^}]*border-image:url\("assets\/hud\/bouton-lieu\.webp"\) 64 128 fill/,"le sous-menu : une pile de boutons argent, coins jamais déformés");
assert.match(css,/\.hud-context-grave\{display:flex;align-items:baseline;/,"le nom posé sur le bas de la flèche");
assert.match(actionsNav,/<ul id="hud-context-menu" class="hud-menu-list" role="menu" aria-label="Ce lieu" hidden><\/ul>/);
assert.match(actionsNav,/id="hud-journal-btn" class="hud-nav" type="button" data-hud-action="journal" aria-expanded="false" aria-controls="hud-journal"/);
assert.ok(bottom.indexOf('class="hud-play"')<bottom.indexOf('class="hud-actions"'),"à droite du bouton play");
assert.match(bottom,/<button id="hud-next-day-btn" class="hud-play" type="button" aria-label="Jour suivant" title="Jour suivant"><img class="hud-play-img" src="assets\/hud\/next\.webp"/,"le bouton d'Idan");
assert.ok(fs.existsSync(path.join(WEB,"assets","hud","next.webp")));
assert.match(bottom,/<img class="hud-ornament" alt="" aria-hidden="true" hidden>/,"l'anneau, posé quand la culture en a un");
assert.match(bottom,/<section id="hud-journal" class="hud-journal" aria-label="Journal de la compagnie" hidden>\s*<ol id="game-action-lines" class="hud-journal-lines"/,"le journal, fermé tant qu'on ne clique pas sur son picto");
assert.doesNotMatch(html+js,/hud-journal-last|hud-console-toggle/,"plus de dernière ligne au-dessus de la barre");
assert.match(bottom,/<div class="hud-bar-art" aria-hidden="true"><span class="hud-bar-piece hud-bar-center"><\/span><\/div>/,"le milieu de la barre seul");
// L'accueil du camp : le château seul, sans menu ; chaque lieu garde son « ← Retour au camp ».
assert.match(html,/<section id="camp-home" class="camp-hub" aria-label="Accueil du camp"><\/section>/);
assert.doesNotMatch(html+css,/camp-hub-menu|camp-hub-btn|camp-merchant/);
assert.equal((html.match(/data-camp-back>← Retour au camp<\/button>/g)||[]).length,(html.match(/class="camp-scene-nav"/g)||[]).length);
// Sauf la Taverne (Idan, 2026-11-14 : « tu peux retirer le bouton retour au camp, il ne sert à rien »).
assert.doesNotMatch(html.slice(html.indexOf('data-camp-scene-panel="tavern"'),html.indexOf('id="tavern-home"')),/data-camp-back/);

// --- Mise en page --------------------------------------------------------------------------------------------------------
assert.match(css,/--hud-bottom-h:calc\(var\(--hb-B\) \* var\(--bb-h\)\);/,"la place que prend la barre, selon la culture");
assert.match(css,/\.game-bottom-bar\{position:fixed;left:0;right:0;bottom:0;height:var\(--hud-bottom-h\);/);
assert.match(css,/\.game-bottom-bar \.hud-bar-art\{left:0;right:0;top:auto;bottom:calc\(var\(--hb-B\) \* var\(--bb-art-bas\)\);height:calc\(var\(--hb-B\) \* var\(--bb-art-haut\)\)\}/,"d'un bord à l'autre de l'écran");
assert.match(css,/\.hud-play\{position:absolute;left:50%;bottom:calc\(var\(--hb-B\) \* \(var\(--bb-centre\) - var\(--bb-bouton\) \/ 2\)\);/,"le bouton au milieu");
assert.match(css,/\.hud-ornament\{position:absolute;left:calc\(50% - var\(--hb-B\) \* var\(--bb-anneau\) \/ 2\);bottom:calc\(var\(--hb-B\) \* \(var\(--bb-centre\) - var\(--bb-anneau\) \/ 4\)\);z-index:2;/,"l'anneau autour du bouton, par-dessus");
assert.match(css,/\.hud-places\{position:absolute;right:calc\(50% \+ var\(--hb-B\) \* var\(--bb-pictos-droite\)\);bottom:calc\(var\(--hb-B\) \* \(var\(--bb-pictos-y\) - var\(--bb-picto\) \/ 2\)\);/,"les pictos contre l'anneau");
assert.match(css,/\.hud-actions\{position:absolute;left:calc\(50% \+ var\(--hb-B\) \* var\(--bb-pictos-gauche\)\);bottom:calc\(var\(--hb-B\) \* \(var\(--bb-pictos-y\) - var\(--bb-picto\) \/ 2\)\);/,"les actions contre l'anneau, à droite");
assert.match(css,/\.hud-context:not\(\.is-active\)\{visibility:hidden\}/,"sans menu, le bouton du lieu est caché, sa place reste");
assert.match(css,/\.hud-menu-list\{position:absolute;left:0;bottom:calc\(100% \+ 12px\);/,"son menu s'ouvre vers le haut");
assert.match(css,/\.hud-journal\{position:absolute;left:calc\(50% \+ var\(--hb-B-z\) \* var\(--bb-pictos-gauche\)\);[^}]*overflow-y:auto[^}]*zoom:var\(--ui-scale,1\)\}/,"le journal au-dessus des actions, qui défile");
assert.match(css,/\.hud-nav-label\{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect\(0 0 0 0\);/,"pictos seuls : le nom reste pour les lecteurs d'écran");
assert.match(css,/\.hud-nav:hover,\.hud-nav:focus-visible\{transform:scale\(1\.08\);/,"un très léger grossissement au survol");
assert.match(css,/\.hud-nav:active\{transform:scale\(\.94\);/,"enfoncé au clic, puis un petit rebond au relâchement");
assert.match(css,/\.hud-nav\{[^}]*transition:transform \.22s cubic-bezier\(\.34,1\.56,\.64,1\)/);
assert.match(css,/\.hud-nav\.is-current,\.hud-nav:disabled\{transform:none;filter:none;opacity:var\(--hud-inactifs,\.5\)/,"grisé : le lieu où l'on est (« quand on est sur le château, on le grise ») ; grisé = plus transparent, à 50 % (Idan, 2026-11-18)");
assert.match(css,/body\[data-screen="camp"\] \.app-shell\{padding-bottom:calc\(var\(--hud-bottom-z\) \+ 36px\)\}/,"les lieux s'arrêtent au-dessus de la barre");

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
  assert.ok(b.pictosGauche>b.bouton/2,key+" : les actions à droite du bouton");
  assert.ok(b.pictosY>b.picto/2&&b.pictosY+b.picto/2<s.ligne,key+" : les pictos dans la barre");
  assert.ok(b.hauteur>=s.ligne&&b.hauteur>=b.centre+b.bouton/2,key);
  // Sur le plus petit écran (1280 px : bande de 54,4 px), les six pictos tiennent dans la moitié gauche.
  assert.ok(b.pictosDroite+6*b.picto+5*b.ecart<640/54.4,key+" : les pictos tiennent dans l'écran");
  assert.ok(b.pictosGauche+5*b.picto+4*b.ecart<640/54.4,key+" : le bouton du lieu et les actions aussi");
}
// Le calcul : une barre dont la ligne du haut est à 50 px de l'image et la bande sombre de 60 à 160 px ; un anneau carré
// plein de 400 px (pour l'image WebP), sauf ses 100 premières colonnes.
const fakeBar={h:200,frameTop:40,bandTop:60,bandBottom:160};
const ring={w:400,h:200,left:Array(200).fill(100),right:Array(200).fill(300)};
const base={ligne:1.1,rogner:0,decalage:0,bouton:1.5,anneau:100,pictoTaille:.8,pictoEcart:.3,pictoAnneau:.2,pictoHaut:0};
const lay=bottomLayout(fakeBar,base,ring);
assert.equal(lay.centre,1.1,"sans décalage, le bouton est centré sur la ligne");
assert.equal(lay.anneau,4,"1600 × 1,5 / 600");
assert.equal(lay.artHaut,2,"la ligne (50 px) à 1,1 B et la bande finit au bas de l'écran : 0,01 B par pixel");
assert.equal(lay.artBas,-.4,"le bas de l'image, 40 px sous l'écran");
assert.equal(lay.pictosY,.5,"au milieu de la bande sombre (100 px)");
assert.equal(lay.pictosDroite,1.2,"le bord de l'anneau (moitié de 4 B, moins 100 colonnes de 0,01 B) plus 0,2 B");
assert.equal(lay.pictosGauche,1.2,"de même à droite (le bord à la colonne 300)");
assert.equal(bottomLayout(fakeBar,{...base,pictoHaut:.1},ring).pictosY,.4,"pictoHaut les relève");
assert.equal(bottomLayout(fakeBar,{...base,decalage:60},ring).centre,.95,"60 px de l'anneau : 0,15 B plus bas");
assert.equal(bottomLayout(fakeBar,{...base,rogner:10},ring).artHaut,2.2,"rogner : la bande finit 10 px plus haut, la barre grandit");
// Sur ses lignes, l'anneau ne touche pas les pictos : le bord du bouton compte.
const holed=bottomLayout(fakeBar,base,{w:400,h:200,left:Array(200).fill(null),right:Array(200).fill(null)});
assert.equal(holed.pictosDroite,Math.round((Math.sqrt(.75**2-.2**2)+.2)*1e4)/1e4);
assert.equal(holed.pictosGauche,holed.pictosDroite);

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
ui.applyHudBar("empire-de-la-nuit-blanche");
const nord=HUD_BARS["empire-de-la-nuit-blanche"];
assert.deepEqual(bottomBar.props,topBar.props,"la même barre en haut et en bas");
assert.equal(bottomBar.pieces.center.style.backgroundImage,'url("assets/hud/barres/empire-de-la-nuit-blanche/center.webp")');
assert.ok(bottomBar.classes.has("has-art")&&bottomBar.classes.has("has-ornament"));
const names={artBas:"art-bas",artHaut:"art-haut",centre:"centre",bouton:"bouton",anneau:"anneau",picto:"picto",ecart:"ecart",pictosDroite:"pictos-droite",pictosGauche:"pictos-gauche",pictosY:"pictos-y",hauteur:"h"};
assert.deepEqual(Object.fromEntries(Object.entries(rootProps).filter(([k])=>k.startsWith("--bb-"))),
  Object.fromEntries(Object.entries(names).map(([k,n])=>["--bb-"+n,String(nord.bas[k])])),"les réglages d'Idan pour la barre du bas");
assert.deepEqual([ornament.attrs.src,ornament.hidden],["assets/hud/barres/empire-de-la-nuit-blanche/ornement.webp",false]);
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
assert.deepEqual(calls,[["scene","tavern"],["journal","Destination : tavern."]],"la Taverne mène juste à la taverne");
calls.length=0;
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

// --- Le bouton du lieu et les actions (screen-ui.js) ---------------------------------------------------------------------
const els={};
const el=id=>els[id]||(els[id]={id,hidden:true,innerHTML:"",attrs:{},classes:new Set(),setAttribute(k,v){this.attrs[k]=v;},
  classList:{toggle(c,on){on?els[id].classes.add(c):els[id].classes.delete(c);}}});
const TAVERN={zones:[{key:"missions",label:"Trouver une mission"},{key:"recruits",label:"Recruter"},{key:"canteen",label:"La Cantine"},{key:"cellar",label:"La Cave"},{key:"talk",label:"Parler au tavernier"}],
  menu:["talk","missions","recruits","cellar","canteen"]};
const done=[];
const fakeGame={campaign:{day:12,expeditions:[]}};
let talks=[];
const right=new Function("$","document","esc","TAVERN_ZONES","TAVERN_MENU","openTavernPlace","showTodayNews","openExpeditionDialog","pendingTalks","openTalk","game",
  js.slice(js.indexOf("function toggleHudJournal("),js.indexOf("function setPauseOpen("))+"return {updateHudContext,setHudContextMenu,chooseHudContext,runHudAction,updateHudCombat,updateHudTalks};")(
  el,{body,querySelector:sel=>sel===`.hud-places [data-hud-scene="tavern"] .hud-nav-label`?{textContent:"Taverne"}:null}, x=>String(x),TAVERN.zones,TAVERN.menu,key=>done.push(["lieu",key]),()=>done.push(["nouvelles"]),id=>done.push(["combat",id]),()=>talks,key=>done.push(["parler",key]),fakeGame);
Object.assign(body.dataset,{screen:"camp",campScene:"home"});
right.updateHudContext();
assert.ok(!els["hud-context"].classes.has("is-active")&&els["hud-context-menu"].innerHTML==="","au château, pas de bouton du lieu (pour l'instant)");
body.dataset.campScene="tavern";
right.updateHudContext();
assert.ok(els["hud-context"].classes.has("is-active"));
assert.deepEqual([els["hud-context-name"].textContent,els["hud-context-menu"].attrs["aria-label"]],["Taverne","Taverne"],"le nom du lieu sur son bouton (Idan, 2026-11-26)");
assert.deepEqual([...els["hud-context-menu"].innerHTML.matchAll(/data-hud-context="(\w+)">([^<]+)</g)].map(m=>[m[1],m[2]]),
  [["talk","Parler au tavernier"],["missions","Trouver une mission"],["recruits","Recruter"],["cellar","La Cave"],["canteen","La Cantine"]],"« Tavernier - missions - recrutement - cave - menu »");
right.setHudContextMenu(true);
assert.deepEqual([els["hud-context-menu"].hidden,els["hud-context-btn"].attrs["aria-expanded"]],[false,"true"]);
right.chooseHudContext("cellar");
assert.deepEqual([done.shift(),els["hud-context-menu"].hidden],[["lieu","cellar"],true],"la salle choisie, le menu se referme");
// Combat (Idan, 2026-11-14 : « juste commencer le combat, sinon grisé ») : grisé sans escouade arrivée ; une seule : sa
// fenêtre « Commencer le combat » ; plusieurs : un menu.
const combatBtn=el("hud-combat-btn");
combatBtn.dataset={hudAction:"combat"};
combatBtn.offsetLeft=120;
el("hud-action-menu").dataset={};
el("hud-action-menu").style={};
right.updateHudCombat();
assert.deepEqual([combatBtn.disabled,combatBtn.title],[true,"Pas de combat aujourd’hui"]);
const camp=(id,status,name)=>({id,status,offer:{campName:name,fields:{lieu:"Brumecendre"}}});
fakeGame.campaign.expeditions=[camp("e1","outbound","Camp orque"),camp("e2","arrived","Camp gobelin")];
right.updateHudCombat();
assert.deepEqual([combatBtn.disabled,combatBtn.title],[false,"Commencer le combat"]);
right.runHudAction("combat",combatBtn);
assert.deepEqual(done.shift(),["combat","e2"],"la fenêtre « Commencer le combat » de l'escouade arrivée");
fakeGame.campaign.expeditions[0].status="arrived";
right.updateHudCombat();
assert.equal(combatBtn.title,"2 combats vous attendent");
right.runHudAction("combat",combatBtn);
assert.deepEqual(done,[],"plusieurs : on choisit d'abord");
assert.equal(el("hud-action-menu").hidden,false);
assert.deepEqual([...el("hud-action-menu").innerHTML.matchAll(/data-hud-pick="(\w+)">([^<]+)</g)].map(m=>[m[1],m[2]]),[["e1","Camp orque de Brumecendre"],["e2","Camp gobelin de Brumecendre"]]);
assert.equal(el("hud-action-menu").style.left,"120px","au-dessus de son picto");
right.runHudAction("combat",combatBtn);
assert.equal(el("hud-action-menu").hidden,true,"un second clic le referme");
right.runHudAction("news");
assert.deepEqual(done.shift(),["nouvelles"],"le pigeon rouvre les nouvelles du jour (day-news-ui.js)");
el("hud-journal").hidden=true;
right.runHudAction("journal");
assert.deepEqual([els["hud-journal"].hidden,els["hud-journal-btn"].attrs["aria-expanded"]],[false,"true"],"le journal s'ouvre au clic");
right.runHudAction("journal");
assert.equal(els["hud-journal"].hidden,true,"et se referme");
// Discussions (Idan, 2026-11-14 : « il doit ouvrir les fenêtres de dialogues avec les mercenaires qui viennent nous
// parler ») : grisé sans personne ; une seule discussion : elle s'ouvre ; plusieurs : un menu (discussions-ui.js).
const talkBtn=el("hud-talk-btn");
talkBtn.dataset={hudAction:"talk"};
talkBtn.offsetLeft=300;
right.updateHudTalks();
assert.deepEqual([talkBtn.disabled,talkBtn.title],[true,"Personne ne vous attend"]);
talks=[{key:"salary:2",label:"Zia veut vous parler de son salaire"}];
right.updateHudTalks();
assert.deepEqual([talkBtn.disabled,talkBtn.title],[false,"Zia veut vous parler de son salaire"]);
right.runHudAction("talk",talkBtn);
assert.deepEqual(done.shift(),["parler","salary:2"]);
talks=[{key:"desertion:1",label:"Brak veut quitter la compagnie"},...talks];
right.updateHudTalks();
assert.equal(talkBtn.title,"2 discussions vous attendent");
right.runHudAction("talk",talkBtn);
assert.deepEqual([el("hud-action-menu").hidden,el("hud-action-menu").style.left,[...el("hud-action-menu").innerHTML.matchAll(/data-hud-pick="([\w:]+)">([^<]+)</g)].map(m=>m[1])],
  [false,"300px",["desertion:1","salary:2"]],"dans l'ordre qu'on veut");
assert.deepEqual(done,[]);
assert.match(fs.readFileSync(path.join(WEB,"save-ui.js"),"utf8"),/serializeCampaign\(game\.campaign,\{tavernLog:game\.tavernLog\|\|\[\],dayNews:game\.dayNews\|\|null\}\)/,"les nouvelles du jour, gardées avec la partie");
assert.match(fs.readFileSync(path.join(WEB,"save-ui.js"),"utf8"),/game\.dayNews=save\.extra\.dayNews\|\|null;/);
assert.match(js,/function openCampScene[\s\S]*?updateCampHomeIcon\(\);\n  updateHudContext\(\);/,"le bouton du lieu suit le lieu");

console.log("camp bottom bar ok");
