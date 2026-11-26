"use strict";

// La Cantine (Idan, 2026-11-08) : une salle de la Taverne où le tavernier cuisine ; 10 niveaux au prix des autres bâtiments
// (500 × n² PO) ; chaque jour, 40 × niveau XP dans la caractéristique du plat du jour, pour tous les mercenaires au camp
// (blessés et fatigués compris), pas pour ceux qui sont partis ; dix plats, un par peuple ; le plat du peuple du capitaine
// à l'ouverture, puis un nouveau plat par niveau du Labo d'alchimie à partir du niveau 2, gratuit, effet inconnu avant de
// le goûter. Règles : game-core/canteen.js ; écran : prototype-web/canteen-ui.js.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createProgressionRules}=require("../game-core/progression.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.canteenDishes,"canteen-dishes.json","le jeu charge les plats");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
let seed=17;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const progression=createProgressionRules({reference});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,progression,random});
const canteen=rules.canteenRules;
assert.ok(canteen,"la campagne a sa Cantine");

// Données : dix plats, un par peuple (noms d'Idan), chacun sur une caractéristique qui existe.
const dishes=reference.canteenDishes.rows;
assert.equal(reference.canteenDishes.row_count,dishes.length);
assert.deepEqual(dishes.map(d=>[d.caracteristique,d.nom,d.peuple]),[
  ["Force","Ragoût de Mamie Ogresse","Ogre"],["Endurance","Fromage au lait de poule","Nain"],
  ["Vitesse","Hérisson rôti à la sauce des bois","Reptilien"],["Perception","Poêlée de champignons","Gnome"],
  ["Esquive","Lapin rôti et ses carottes confites","Gobelin"],["Chance","Tourte aux trèfles","Halfling"],
  ["Constitution","Soupe de Géant Vert","Orc"],["Intelligence","Têtes de harengs","Elfe"],
  ["Courage","Chili aux piments doux","Homme-bête"],["Dextérité","Tataki d'hirondelle","Humain"]]);
const peoples=reference.peoples.rows.map(r=>r.nom).sort();
assert.deepEqual(dishes.map(d=>d.peuple).sort(),peoples,"un plat par peuple");
const stats=new Set(reference.characteristics.rows.map(r=>r.nom));
for(const d of dishes) assert.ok(stats.has(d.caracteristique),d.caracteristique);
const k=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual([k("canteen.xp_per_level"),k("canteen.unlock_from_lab_level")],[40,2]);

// La salle : une ligne de camp-buildings.json à la Taverne (lieu taverne), 10 niveaux, 500 × n² PO.
const row=rules.campBuildingRow("canteen");
assert.deepEqual([row.nom,row.niveaux,row.prix_base,row.lieu,row.requiert],["La Cantine",10,500,"taverne",null]);
// La Cave (Idan, 2026-11-10) : l'autre salle de la Taverne.
assert.ok(reference.campBuildings.rows.filter(r=>!["canteen","cellar"].includes(r.code)).every(r=>r.lieu===null),"les autres sont au camp");
assert.equal(rules.campBuildingRow("cellar")?.lieu,"taverne");

const captain=generator.createCaptain({id:1});
captain.people="Nain";
const state=rules.createCampaign({captain,squad:[2,3,4].map(id=>generator.createMercenary({id,captain}))});
state.company.gold=1e6;
assert.deepEqual(rules.nextBuildingLevel(state,"canteen"),{code:"canteen",name:"La Cantine",level:1,gold:500,days:4});
assert.equal(canteen.canteenOf(state),null,"pas de Cantine avant sa construction");
assert.equal(canteen.offer(state),null);
assert.equal(canteen.morning(state),null);
assert.equal(rules.startBuilding(state,"canteen").ok,true);
rules.advanceTime(state,4);
assert.equal(rules.buildingLevel(state,"canteen"),1);
assert.deepEqual(state.company.canteen,{dishes:["fromage_lait_de_poule"],current:"fromage_lait_de_poule",offer:null},"le plat du peuple du capitaine, offert");
for(let n=2;n<=10;n++){ state.company.camp.buildings.canteen={level:n-1,construction:null}; assert.equal(rules.nextBuildingLevel(state,"canteen").gold,500*n*n); }
state.company.camp.buildings.canteen={level:1,construction:null};

// Le matin : 40 × niveau XP d'Endurance à tous ceux qui sont au camp, blessés et fatigués compris ; pas aux partis.
const [, wounded, tired, away]=state.company.roster;
wounded.recovery={kind:"wounded",daysLeft:20,sinceDay:state.day};
tired.recovery={kind:"fatigued",daysLeft:5,sinceDay:state.day};
state.expeditions=[{id:"x",memberIds:[away.id],status:"outbound"}];
const xpOf=m=>m.xp?.stats?.Endurance??progression.startingXp(m.stats.Endurance);
const before=new Map(state.company.roster.map(m=>[m.id,xpOf(m)]));
const report=canteen.morning(state);
assert.deepEqual([report.dish.code,report.xp],["fromage_lait_de_poule",40]);
assert.deepEqual(report.eaters.map(e=>e.id).sort(),[1,wounded.id,tired.id].sort(),"le capitaine, le blessé, le fatigué ; pas celui qui est parti");
for(const m of [captain,wounded,tired]) assert.equal(xpOf(m)-before.get(m.id),40,m.name);
assert.equal(xpOf(away),before.get(away.id));
state.company.camp.buildings.canteen={level:7,construction:null};
assert.equal(canteen.morning(state).xp,280,"40 × 7");
// La journée l'appelle (rapport du matin).
state.company.camp.buildings.canteen={level:1,construction:null};
assert.equal(rules.advanceTime(state,1)[0].canteen.eaters.length,3);

// Nouveaux plats : un par niveau du Labo d'alchimie à partir du niveau 2 ; le tavernier en propose un, gardé jusqu'à ce
// qu'on le goûte ; gratuit ; le plat du jour ne change pas tout seul.
assert.equal(canteen.offer(state),null,"sans Labo, pas de proposition");
state.company.camp.buildings.alchemy_lab={level:1,construction:null};
assert.equal(canteen.offer(state),null,"Labo niveau 1 : pas encore");
state.company.camp.buildings.alchemy_lab={level:2,construction:null};
const proposed=canteen.offer(state);
assert.ok(proposed&&proposed.code!=="fromage_lait_de_poule");
assert.equal(canteen.offer(state).code,proposed.code,"la même proposition tant qu'on ne l'a pas goûtée");
const gold=state.company.gold;
assert.deepEqual(canteen.unlock(state),{ok:true,dish:proposed});
assert.equal(state.company.gold,gold,"gratuit");
assert.deepEqual(state.company.canteen.dishes,["fromage_lait_de_poule",proposed.code]);
assert.equal(state.company.canteen.current,"fromage_lait_de_poule");
assert.equal(canteen.offer(state),null,"un seul plat au niveau 2");
assert.equal(canteen.unlock(state).ok,false);
assert.deepEqual(canteen.setDish(state,proposed.code),{ok:true,dish:proposed});
assert.equal(canteen.setDish(state,"tataki_hirondelle"===proposed.code?"ragout_mamie_ogresse":"tataki_hirondelle").ok,false,"pas un plat inconnu");
assert.equal(canteen.morning(state).dish.code,proposed.code);
// Labo niveau 10 : les neuf autres plats.
state.company.camp.buildings.alchemy_lab={level:10,construction:null};
while(canteen.offer(state)) canteen.unlock(state);
assert.equal(state.company.canteen.dishes.length,10);
assert.equal(canteen.lockedDishes(state).length,0);

// Écran : la Cantine dans la Taverne (zone de l'accueil de la taverne, vue, une fois construite).
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","tavern-scene-ui.js"),"utf8"),/\{key:"canteen",label:"La Cantine"\}/,"une zone de l'accueil de la taverne");
assert.match(html,/<section id="tavern-canteen-view"[\s\S]*<div id="tavern-canteen"/);
assert.match(html,/<script src="\/core\/canteen\.js"><\/script>/);
assert.match(html,/<script src="canteen-ui\.js"><\/script>/);
const elements={};
const $=id=>elements[id]||(elements[id]={innerHTML:""});
const fmt=v=>String(Math.round(Number(v)||0)).replace(/\B(?=(\d{3})+(?!\d))/g," ");
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const log=[];
const game={campaign:null};
const ui=new Function("game","$","fmt","esc","campaignRules","tavernLog","saveGame","renderGame","campBuildingAction",
  fs.readFileSync(path.join(ROOT,"prototype-web","canteen-ui.js"),"utf8")+"\nreturn {renderCanteen,chooseCanteenDish,tasteCanteenDish,logCanteen,canteenEffect,canteenBackground,openCanteenChoice,turnCanteenDish,confirmCanteenDish};")(
  game,$,fmt,esc,()=>rules,(message,kind)=>log.push({message,kind}),()=>{},()=>{},(c,code,level)=>`<button data-camp-build="${code}">${level?"Améliorer":"Construire"}</button>`);
assert.deepEqual(["Force","Endurance","Courage","Intelligence","Dextérité"].map(ui.canteenEffect),
  ["augmente la Force","augmente l’Endurance","augmente le Courage","augmente l’Intelligence","augmente la Dextérité"]);
// Le fond de l'écran (Idan, 2026-11-26 : « 10 backgrounds à mettre en plein écran (sous la barre de jeu). L'image à mettre
// dépend du niveau de la cantine ») : celle de son niveau, de 1 à 10, en plein écran sous les barres.
assert.deepEqual([0,1,5,10,12].map(n=>ui.canteenBackground(n)),
  ["assets/cantine/cantine-1.webp","assets/cantine/cantine-1.webp","assets/cantine/cantine-5.webp","assets/cantine/cantine-10.webp","assets/cantine/cantine-10.webp"]);
for(let n=1;n<=10;n++) assert.ok(fs.existsSync(path.join(ROOT,"prototype-web",ui.canteenBackground(n))),"le fond du niveau "+n);
const css=fs.readFileSync(path.join(ROOT,"prototype-web","styles.css"),"utf8");
// « Au menu » en manuscrit de brasserie ; deux lignes réservées pour le nom et la phrase (rien ne saute en tournant).
assert.match(css,/\.canteen-menu-kicker\{[^}]*"Parisienne",cursive[^}]*transform:rotate\(var\(--kicker-angle\)\)/,"la Parisienne, de travers");
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8"),/fonts\.googleapis\.com\/css2\?[^"]*family=Parisienne/);
assert.match(css,/#tavern-canteen-view \.canteen-dish-name\{[^}]*min-height:2\.3em/);
assert.match(css,/\.canteen-dish-phrase\{[^}]*min-height:2\.7em/);
assert.match(css,/#tavern-canteen-view::before\{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background:#201916 var\(--canteen-bg,url\("assets\/cantine\/cantine-1\.webp"\)\) center\/cover no-repeat\}/,"plein écran, sous les barres");
const props={};
elements["tavern-canteen-view"]={innerHTML:"",style:{setProperty:(k,v)=>{props[k]=v;}}};
const fresh=rules.createCampaign({captain,squad:[]});
game.campaign=fresh;
ui.renderCanteen();
assert.equal(elements["tavern-canteen"].innerHTML,"","pas de menu avant la construction (elle se fait dans la fenêtre Construction)");
// Le parchemin (Idan, 2026-11-26 : « Retire tout le blabla actuel. On met un petit parchemin […] Au menu ; titre du plat ;
// image du plat dans un cadre doré ; phrase explicative du plat (pas une phrase qui dit ce plat vous donne +40 xp par
// jour) ; en dessous, un bouton capitaine : changer le menu, uniquement si un autre plat est dispo »).
fresh.company.camp.buildings={canteen:{level:2,construction:null}};
ui.renderCanteen();
let screen=elements["tavern-canteen"].innerHTML;
assert.equal(props["--canteen-bg"],'url("assets/cantine/cantine-2.webp")',"le fond du niveau 2");
const fromage=canteen.dish("fromage_lait_de_poule");
assert.match(screen,/<p class="canteen-menu-kicker">Au menu<\/p>\s*<h2 class="canteen-dish-name">Fromage au lait de poule<\/h2>\s*<div class="canteen-dish-row"><figure class="canteen-dish-img"><img src="assets\/cantine\/plats\/fromage_lait_de_poule\.webp" alt="Fromage au lait de poule"><\/figure>/);
assert.ok(screen.includes(`<p class="canteen-dish-phrase">${esc(fromage.phrase)}</p>`),"sa phrase");
assert.ok(!/XP|Niveau|Améliorer|data-camp-build|<select/.test(screen),"plus de blabla : ni chiffres, ni niveau, ni amélioration, ni liste");
assert.ok(!screen.includes("data-canteen-change"),"un seul plat, rien d'autre au menu : pas de bouton");
// Le Labo de niveau 2 : le tavernier propose un plat ; le bouton capitaine « Changer le menu » apparaît.
fresh.company.camp.buildings.alchemy_lab={level:2,construction:null};
ui.renderCanteen();
screen=elements["tavern-canteen"].innerHTML;
assert.match(screen,/<button type="button" class="mission-btn canteen-change" data-canteen-change>Changer le menu<\/button>/,"le bouton capitaine");
assert.ok(!screen.includes("data-canteen-turn"),"pas de flèches avant le clic");
const offered=canteen.offer(fresh);
// « Le clic transforme le bouton en Certain de manger ça ? et des flèches apparaissent à gauche et à droite de l'icône du
// plat. On fait tourner et on peut valider » : le choix commence sur le plat du jour.
ui.openCanteenChoice(true);
screen=elements["tavern-canteen"].innerHTML;
assert.match(screen,/data-canteen-turn="-1" aria-label="Plat précédent"><\/button><figure class="canteen-dish-img"><img src="assets\/cantine\/plats\/fromage_lait_de_poule\.webp"[^>]*><\/figure><button type="button" class="canteen-arrow canteen-arrow--next" data-canteen-turn="1"/,"les flèches de part et d'autre du plat");
assert.match(screen,/data-canteen-confirm>Certain de manger ça \?<\/button>/);
assert.ok(!screen.includes("data-canteen-change"),"le bouton s'est transformé");
// Le plat suivant : celui du tavernier, avec sa vraie phrase (Idan : « Non, mets la vraie phrase »).
ui.turnCanteenDish(1);
screen=elements["tavern-canteen"].innerHTML;
assert.ok(screen.includes(`<h2 class="canteen-dish-name">${esc(offered.nom)}</h2>`)&&screen.includes(offered.image),"le plat du tavernier");
assert.ok(screen.includes(`<p class="canteen-dish-phrase">${esc(offered.phrase)}</p>`),"sa vraie phrase");
// On fait tourner : on revient au fromage, dans un sens comme dans l'autre.
ui.turnCanteenDish(1);
assert.match(elements["tavern-canteen"].innerHTML,/fromage_lait_de_poule\.webp/,"en tournant");
ui.turnCanteenDish(-1);
assert.ok(elements["tavern-canteen"].innerHTML.includes(offered.image));
ui.turnCanteenDish(-1);
// Valider le plat du jour : on referme, rien ne change.
ui.confirmCanteenDish();
assert.match(elements["tavern-canteen"].innerHTML,/data-canteen-change>Changer le menu/,"on referme");
assert.equal(fresh.company.canteen.current,"fromage_lait_de_poule");
// Valider le plat du tavernier : il est goûté (son effet est connu) et passe au menu.
ui.openCanteenChoice(true);
ui.turnCanteenDish(1);
ui.confirmCanteenDish();
assert.match(log.at(-1).message,new RegExp(`^Le tavernier fait goûter un nouveau plat : ${offered.nom}\\. Il augmente`));
assert.equal(fresh.company.canteen.current,offered.code,"au menu");
assert.deepEqual(fresh.company.canteen.dishes,["fromage_lait_de_poule",offered.code]);
// Puis un autre plat goûté : il passe au menu.
ui.openCanteenChoice(true);
ui.turnCanteenDish(-1);
ui.confirmCanteenDish();
assert.equal(fresh.company.canteen.current,"fromage_lait_de_poule","on revient au fromage");
assert.match(log.at(-1).message,/^La Cantine : dès demain, Fromage au lait de poule au menu/);
ui.chooseCanteenDish(offered.code);
assert.equal(fresh.company.canteen.current,offered.code);
// Les phrases du menu : une par plat, sans chiffres ; les images, une par plat.
for(const d of canteen.dishes()){
  assert.ok(d.phrase&&!/\d|XP/.test(d.phrase),d.code+" : une phrase sans chiffres");
  assert.equal(d.image,`assets/cantine/plats/${d.code}.webp`);
  assert.ok(fs.existsSync(path.join(ROOT,"prototype-web",d.image)),d.image);
}
assert.equal(canteen.dish("ragout_mamie_ogresse").phrase,"Le Ragoût de Mamie Ogresse, au bon goût de Mamie, rendra toute la compagnie plus forte !","la phrase d'Idan");
// Les phrases d'Idan (2026-11-26), sous le nom du plat.
assert.deepEqual(["fromage_lait_de_poule","herisson_roti","lapin_roti","tataki_hirondelle"].map(code=>canteen.dish(code).phrase),
  ["Après en avoir mangé, vous pouvez tout endurer !","Un peu piquant, mais il vous fera aller plus vite… aux toilettes !","Attrapez-le si vous pouvez !","Sauvage, attrapée à la main !"]);
assert.equal(canteen.dish("tataki_hirondelle").nom,"Tataki d'hirondelle","on ne renomme pas le plat");
ui.logCanteen({dish:offered,xp:80,eaters:[{id:1,changes:[{before:40,after:41}]},{id:2,changes:[]}]});
assert.equal(log.at(-1).message,`La Cantine sert ${offered.nom} : +80 XP de ${offered.caracteristique} pour 2 mercenaires (1 gagne un point).`);
const buildings=fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8");
// Elle se construit dans la fenêtre Construction (Idan, 2026-11-26 : « On ajoute la possibilité de construire dans la
// fenêtre construction ») ; les autres salles de la Taverne (la Cave) restent à la Taverne.
assert.match(buildings,/const CAMP_BUILT_HERE=new Set\(\["canteen"\]\);/,"la Cantine dans la fenêtre Construction");
assert.match(buildings,/if\(!row\|\|row\.requiert\|\|\(row\.lieu&&!CAMP_BUILT_HERE\.has\(code\)\)\) return "";/,"la Cave, non");

console.log("La Cantine : salle de la Taverne, 10 plats, 40 × niveau XP par jour, nouveaux plats avec le Labo, écran — OK");
