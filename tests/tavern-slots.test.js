"use strict";

// Places de la Taverne (Idan, 2026-11-04 : « 3 + nombre d'étoiles de réputation de la compagnie » ; le niveau de renommée,
// de 1 à 15 ; « Oui, parfait ») : de 4 à 18 places ; si la renommée baisse, personne n'est chassé. Les candidats défilent
// en carrousel (« fais un système qui défile comme un carousel »).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual([constant("tavern.slots.base"),constant("tavern.slots.per_renown_level")],[3,1]);
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);

// Le niveau de renommée (reputation-stars.json, renommee_min ; seuils × 1,5 depuis le 2026-11-08) : 1 à 15 ; 3 + niveau,
// de 4 à 18 places.
const stay=createTavernRules({random:()=>0.999,reference});
assert.deepEqual([0,371,372,1883,1884,72399,72400,999999].map(stay.renownLevel),[1,1,2,5,6,14,15,15]);
assert.deepEqual([0,372,1884,72400,999999].map(stay.slotsFor),[4,5,9,18,18]);
assert.equal(createTavernRules({reference:{formulaConstants:reference.formulaConstants}}).slotsFor(8000),5,"sans les étoiles : tavern.slots.initial");

let seed=37;
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:stay,reference,random:()=>0.999});
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6,7,8,9].map(id=>generator.createMercenary({id,captain}))});
const renown=()=>rules.companyRenown(state).total;
const expected=()=>3+stay.renownLevel(renown());

// Au départ : 3 + le niveau de la compagnie.
assert.equal(state.tavern.slots,expected());
assert.equal(state.tavern.candidates.length,state.tavern.slots);

// La renommée monte (ici, 5 000 points de mission) : les nouvelles places se remplissent le lendemain matin.
const before=state.tavern.candidates.length;
state.company.missionRenown=5000;
const [up]=rules.advanceTime(state,1);
assert.ok(expected()>before);
assert.deepEqual([state.tavern.slots,state.tavern.candidates.length,up.tavern.arrivals.length],[expected(),expected(),expected()-before]);

// Elle retombe : personne n'est chassé ; aucun nouveau candidat tant qu'il n'y a pas de place.
const present=state.tavern.candidates.map(c=>c.mercenary.id);
state.company.missionRenown=-2000;
const [down]=rules.advanceTime(state,1);
assert.equal(state.tavern.slots,4);
assert.deepEqual([down.tavern.departures.length,down.tavern.arrivals.length],[0,0]);
assert.deepEqual(state.tavern.candidates.map(c=>c.mercenary.id),present);
// Quand ils partent d'eux-mêmes, on redescend jusqu'aux places du jour, sans en ajouter.
const leave=createTavernRules({random:()=>0,reference});
const morning=leave.tavernMorning(state.tavern,state.day+1,()=>generator.createMercenary({id:999,captain}),4);
assert.deepEqual([morning.departures.length,morning.arrivals.length,state.tavern.candidates.length],[present.length,4,4]);

// Le carrousel : la rangée, une flèche de chaque côté ; l'accroche sur chaque carte ; trois candidats par écran, trois de plus
// à chaque flèche (Idan, 2026-11-19) ; moins de trois : centrés (marges automatiques) ; recalculé quand la place change.
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(index,/<div class="recruit-carousel">\s*<button type="button" class="recruit-nav" data-recruit-scroll="-1" aria-label="Candidats précédents">‹<\/button>\s*<div id="tavern-candidates" class="recruit-track"><\/div>\s*<button type="button" class="recruit-nav" data-recruit-scroll="1" aria-label="Candidats suivants">›<\/button>/);
const css=fs.readFileSync(path.join(ROOT,"prototype-web","styles.css"),"utf8");
assert.doesNotMatch(css,/\.recruit-track\{[^}]*overflow/,"la rangée ne défile pas : rien ne coupe les ombres des cartes");
assert.match(css,/\.recruit-carousel\{[^}]*overflow-x:clip;/,"les cartes hors de la page ne débordent pas de l'écran");
assert.match(css,/\.recruit-track \.recruit-card\{flex:0 0 auto;translate:var\(--recruit-shift,0px\) 0;transition:translate \.5s ease,opacity \.4s ease\}/,"les cartes glissent");
assert.match(css,/\.recruit-track \.recruit-card\.is-off\{opacity:0;visibility:hidden;pointer-events:none;/,"hors de la page, elles s'effacent");
assert.match(css,/\.recruit-track>:first-child\{margin-left:auto\}\n\.recruit-track>:last-child\{margin-right:auto\}/);
assert.match(css,/\.recruit-nav:disabled\{cursor:default;translate:0 0;opacity:0;pointer-events:none\}/,"la flèche inactive s'efface");
assert.match(css,/\.mission-board-arrow:disabled\{cursor:default;translate:0 0;opacity:0;pointer-events:none\}/,"sur le panneau des missions aussi");
// « Flèche en permanence : les mêmes que pour les missions » : jamais cachées, l'équerre de fer du panneau à sa taille.
assert.doesNotMatch(css,/\.recruit-nav[^{]*\{[^}]*display:none/,"les flèches restent affichées");
assert.match(css,/#tavern-recruits-view\{--board-w:max\(100vw,100vh \* 2000 \/ 1116\);/);
assert.match(css,/\.mission-board\{--board-w:max\(100vw,100vh \* 2000 \/ 1116\);/,"la même largeur de panneau que les missions");
assert.match(css,/#tavern-recruits-view\{[^}]*--recruit-fleche-w:calc\(var\(--board-w\) \* \.088\)/,"la flèche du panneau : 8,8 % de sa largeur");
assert.match(css,/\.recruit-nav\{[^}]*width:var\(--recruit-fleche-w\);aspect-ratio:640\/284;[^}]*fleche-fer\.webp/);
assert.doesNotMatch(css,/\.recruit-nav::(before|after)/,"plus de plaque sous les flèches (« c'est horrible ! »)");
assert.match(css,/\.mission-board-arrow\{[^}]*width:calc\(var\(--board-w\) \* \.088\);aspect-ratio:640\/284;[^}]*fleche-fer\.webp/);
assert.doesNotMatch(css,/\.recruit-grid\{/);
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8");
assert.match(ui,/updateRecruitCarousel\(\);\n\}/,"après chaque rendu de la Taverne");
assert.match(ui,/if\(view==="recruits"\) updateRecruitCarousel\(\);/,"à l'ouverture de « Recruter »");
assert.match(ui,/new ResizeObserver\(\(\)=>updateRecruitCarousel\(\)\)\.observe\(carousel\)/);
assert.match(ui,/const RECRUITS_PER_PAGE=3;/);
assert.match(ui,/track\.addEventListener\("wheel",pageWheel\(scrollRecruits\),\{passive:false\}\)/,"la molette tourne les pages, comme sur le panneau");
// Le carrousel, joué : huit candidats, trois par page, la dernière page montre les trois derniers.
{
  const cards=Array.from({length:8},()=>{const set=new Set();return {offsetWidth:320,set,classList:{toggle:(c,on)=>on?set.add(c):set.delete(c)}};});
  const prev={disabled:null},next={disabled:null},carousel={querySelectorAll:()=>[prev,next]};
  const track={style:{width:"",props:{},setProperty(k,v){this.props[k]=v;}},querySelector:()=>cards[0],querySelectorAll:()=>cards,closest:()=>carousel};
  const box={$:()=>track,getComputedStyle:()=>({columnGap:"32px",paddingLeft:"2px",paddingRight:"2px"})};
  require("node:vm").runInNewContext(ui.slice(ui.indexOf("const RECRUITS_PER_PAGE"),ui.indexOf("function initializeRecruitCarousel"))+";this.update=updateRecruitCarousel;this.turn=scrollRecruits;",box);
  const shown=()=>cards.map((c,i)=>c.set.has("is-off")?null:i).filter(i=>i!==null);
  box.update();
  assert.equal(track.style.width,"1028px","la largeur de trois cartes");
  assert.deepEqual([shown(),track.style.props["--recruit-shift"],prev.disabled,next.disabled],[[0,1,2],"0px",true,false]);
  box.turn(1);
  assert.deepEqual([shown(),track.style.props["--recruit-shift"],prev.disabled,next.disabled],[[3,4,5],"-1056px",false,false],"trois autres");
  box.turn(1);
  assert.deepEqual([shown(),track.style.props["--recruit-shift"],prev.disabled,next.disabled],[[5,6,7],"-1760px",false,true],"la dernière page : les trois derniers");
  box.turn(-1);
  assert.deepEqual(shown(),[2,3,4]);
}


// La carte refaite (Idan, 2026-11-19 : « Fond parchemin. On vire le bouton retour. Notre bouton (celui du formulaire
// capitaine) pour aller lui parler ») : pas de bouton retour, le parchemin d'Idan, le bouton de la charte à sa taille.
const recruitsView=index.slice(index.indexOf('<section id="tavern-recruits-view"'),index.indexOf("</section>",index.indexOf('<section id="tavern-recruits-view"')));
assert.doesNotMatch(recruitsView,/data-tavern-view="home"|Retour à la taverne/,"plus de bouton retour");
assert.doesNotMatch(css,/\.tavern-back\{/);
// Les feuilles des annonces de missions (« Le parchemin des mercenaires varie et reprend ceux des missions »), en neuf
// parts, au teint de leur papier, avec l'ombre portée des annonces.
assert.match(css,/\.recruit-card::before\{[^}]*border-image:var\(--feuille\) 80 fill \/ 34px stretch;[^}]*filter:brightness\(var\(--tone,1\)\) hue-rotate\(var\(--hue,0deg\)\) saturate\(var\(--sat,1\)\) drop-shadow\(calc\(var\(--board-w\) \* -\.005\) calc\(var\(--board-w\) \* \.011\) calc\(var\(--board-w\) \* \.014\) rgba\(0,0,0,\.6\)\)/,"une ombre plus grande et plus floue");
for(let n=2;n<=8;n++) assert.ok(css.includes(`.recruit-card[data-paper="${n}"]{--feuille:url("assets/taverne/feuille-${n}.webp")}`),"feuille "+n);
const tavernVm=require("node:vm"),paperBox={};
tavernVm.runInNewContext(ui.slice(ui.indexOf("function recruitPaper("),ui.indexOf("function renderTavernCard(")).concat(";box.f=recruitPaper;"),{box:paperBox});
const papers=Array.from({length:400},(_,i)=>paperBox.f(i));
assert.deepEqual(new Set(papers.map(p=>p.paper)).size,8,"les huit feuilles");
assert.deepEqual(paperBox.f(42),paperBox.f(42),"toujours le même papier pour le même candidat");
assert.ok(papers.every(p=>/^--tone:(0\.9\d*|1\.0[0-2]\d*);--hue:-?\d+\.\d deg;--sat:(1|\.72)$/.test(p.style.replace("deg"," deg"))),"teint des annonces");
assert.match(ui,/<button type="button" class="mission-btn recruit-talk-btn" data-tavern-open="\$\{m\.id\}">Aller lui parler<\/button>/);
// Réglages du même jour (« un background noir 60% + floutage », « Garde de l'espace quand le texte doit faire deux lignes »,
// « Réduis un peu le bouton … par rapport aux icônes d'interface », tailles réglées sur les barres des Elfes).
assert.match(css,/#tavern-recruits-view::before\{content:"";position:fixed;inset:0;z-index:0;[^}]*border-image:url\("assets\/creation\/parchemin\.webp"\) 180 fill \/ 80px stretch/,"un grand parchemin sur tout l'écran, à la place du voile");
// Plus foncé que les feuilles, texture plus marquée (Idan, 2026-11-19 : « On doit être plus foncé que les parchemins des
// mercenaires ») : le parchemin assombri, le papier froissé découpé à sa forme par-dessus, les cartes au-dessus des deux.
assert.match(css,/#tavern-recruits-view::before\{[^}]*filter:brightness\(\.66\)/,"le grand parchemin est assombri");
assert.match(css,/#tavern-recruits-view::after\{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;mix-blend-mode:multiply;[^}]*url\("assets\/taverne\/papier-froisse\.webp"\)[^}]*mask-border:url\("assets\/creation\/parchemin\.webp"\) 180 fill \/ 80px stretch\}/,"la texture froissée, découpée à la forme du parchemin");
assert.match(css,/\.recruit-carousel\{position:relative;z-index:1;/,"les cartes et les flèches passent au-dessus de la texture");
assert.match(css,/\.recruit-name\{[^}]*min-height:calc\(2em \* 1\.08\)/,"deux lignes pour le nom");
assert.match(css,/\.recruit-origin\{[^}]*min-height:calc\(2em \* 1\.15\)/,"deux lignes pour l'origine");
assert.match(css,/--recruit-pad:clamp\(16px,calc\(\(100vw - 904px - 2 \* \(var\(--board-w\) \* \.088 \+ 24px\)\) \/ 6\),50px\);--recruit-card-w:calc\(max\(260px,var\(--recruit-portrait-w\)\) \+ 2 \* var\(--recruit-pad\)\)/,"260 px de texte : l'origine la plus longue tient en deux lignes ; 50 px de marge");
assert.match(css,/\.recruit-card\{[^}]*width:var\(--recruit-card-w\);padding:22px var\(--recruit-pad\) 16px/);
assert.match(css,/\.recruit-track\{[^}]*gap:42px;/,"les cartes écartées de 42 px");
assert.match(css,/\.recruit-days\{font:italic 600 17px\/1\.2 var\(--police-texte\);[^}]*white-space:nowrap\}/,"la petite phrase plus grosse et plus grasse");
assert.match(index,/family=EB\+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&display=swap/,"l'italique gras chargé");
assert.match(css,/\.recruit-card \.recruit-talk-btn\{flex:none;width:180px;min-width:0;height:61px;padding:0 0 2px;font-size:12\.5px\}/,"180 × 61, aux proportions de l'image");
assert.ok(Math.abs(180/61-760/257)<.01,"le bouton garde les proportions de bouton.webp");
assert.match(ui,/originPhrase\(\{people:m\.people\|\|"",culture:m\.culture\|\|"",ascendance:m\.ascendance\|\|""\}\)/,"l'origine comme sur la fiche au survol, ascendance comprise");
assert.match(ui,/\$\{m\.ascendance\?renderPicto\("ascendance",m\.ascendance,\{size:null\}\):""\}/,"la goutte de l'ascendance, s'il en a une");

console.log("Taverne : 3 + niveau de renommée (4 à 18 places), personne chassé si elle baisse, candidats en carrousel — OK");
