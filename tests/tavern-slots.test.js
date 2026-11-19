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

// Le carrousel : la rangée, une flèche sur chaque bord ; l'accroche sur chaque carte ; rangée centrée quand tout tient, sans
// rien couper quand elle déborde (marges automatiques) ; recalculé quand la rangée change de taille.
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(index,/<div class="recruit-carousel">\s*<button type="button" class="recruit-nav" data-recruit-scroll="-1" aria-label="Candidats précédents">‹<\/button>\s*<div id="tavern-candidates" class="recruit-track"><\/div>\s*<button type="button" class="recruit-nav" data-recruit-scroll="1" aria-label="Candidats suivants">›<\/button>/);
const css=fs.readFileSync(path.join(ROOT,"prototype-web","styles.css"),"utf8");
assert.match(css,/\.recruit-track\{[^}]*overflow-x:auto;[^}]*scroll-snap-type:x mandatory/);
assert.match(css,/\.recruit-track \.recruit-card\{[^}]*scroll-snap-align:start\}/);
assert.match(css,/\.recruit-track>:first-child\{margin-left:auto\}\n\.recruit-track>:last-child\{margin-right:auto\}/);
assert.match(css,/\.recruit-track\{[^}]*scroll-padding-inline:2px/);
assert.match(css,/\.recruit-nav\{position:absolute;/,"les flèches ne prennent pas de place");
assert.match(css,/\.recruit-carousel\.is-static \.recruit-nav\{display:none\}/);
assert.doesNotMatch(css,/\.recruit-grid\{/);
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8");
assert.match(ui,/updateRecruitCarousel\(\);\n\}/,"après chaque rendu de la Taverne");
assert.match(ui,/if\(view==="recruits"\) updateRecruitCarousel\(\);/,"à l'ouverture de « Recruter »");
assert.match(ui,/new ResizeObserver\(\(\)=>updateRecruitCarousel\(\)\)\.observe\(track\)/);

// La carte refaite (Idan, 2026-11-19 : « Fond parchemin. On vire le bouton retour. Notre bouton (celui du formulaire
// capitaine) pour aller lui parler ») : pas de bouton retour, le parchemin d'Idan, le bouton de la charte à sa taille.
const recruitsView=index.slice(index.indexOf('<section id="tavern-recruits-view"'),index.indexOf("</section>",index.indexOf('<section id="tavern-recruits-view"')));
assert.doesNotMatch(recruitsView,/data-tavern-view="home"|Retour à la taverne/,"plus de bouton retour");
assert.doesNotMatch(css,/\.tavern-back\{/);
assert.match(css,/\.recruit-card::before\{[^}]*border-image:url\("assets\/creation\/parchemin\.webp"\) 180 fill \/ 40px stretch/);
assert.match(ui,/<button type="button" class="mission-btn recruit-talk-btn" data-tavern-open="\$\{m\.id\}">Aller lui parler<\/button>/);
// Réglages du même jour (« un background noir 60% + floutage », « Garde de l'espace quand le texte doit faire deux lignes »,
// « Réduis un peu le bouton … par rapport aux icônes d'interface », tailles réglées sur les barres des Elfes).
assert.match(css,/#tavern-recruits-view::before\{content:"";position:fixed;inset:0;z-index:0;background:rgba\(0,0,0,\.6\);[^}]*backdrop-filter:blur\(8px\)/);
assert.match(css,/\.recruit-name\{[^}]*min-height:calc\(2em \* 1\.08\)/,"deux lignes pour le nom");
assert.match(css,/\.recruit-origin\{[^}]*min-height:calc\(2em \* 1\.15\)/,"deux lignes pour l'origine");
assert.match(css,/\.recruit-card\{[^}]*width:max\(288px,calc\(var\(--recruit-portrait-w\) \+ 40px\)\);padding:22px 14px 16px/,"l'origine la plus longue tient en deux lignes");
assert.match(css,/\.recruit-card \.recruit-talk-btn\{flex:none;width:180px;min-width:0;height:61px;padding:0 0 2px;font-size:13\.5px\}/,"180 × 61, aux proportions de l'image");
assert.ok(Math.abs(180/61-760/257)<.01,"le bouton garde les proportions de bouton.webp");
assert.match(ui,/originPhrase\(\{people:m\.people\|\|"",culture:m\.culture\|\|"",ascendance:m\.ascendance\|\|""\}\)/,"l'origine comme sur la fiche au survol, ascendance comprise");
assert.match(ui,/\$\{m\.ascendance\?renderPicto\("ascendance",m\.ascendance,\{size:null\}\):""\}/,"la goutte de l'ascendance, s'il en a une");

console.log("Taverne : 3 + niveau de renommée (4 à 18 places), personne chassé si elle baisse, candidats en carrousel — OK");
