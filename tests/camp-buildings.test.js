"use strict";

// Dortoir (Idan, 2026-10-25). Agrandir : +5 places par agrandissement, sans limite ; 100 PO et 2 jours au début, puis
// chaque agrandissement coûte plus d'or (× 1,2) et de jours (+1 tous les trois). Qualité : dix niveaux (500 × n² PO,
// 3 × n jours, +50 de Renommée, +5 d'affinité pour chaque membre de la compagnie). Quartiers du lieutenant : un par
// niveau pair de qualité, 1 000 × k² PO et 5 × k jours. Un chantier à la fois au dortoir.
// Panneau « Constructions » de Ma Compagnie (prototype-web/camp-buildings-ui.js).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules,serializeCampaign,restoreCampaign}=require("../game-core/campaign.js");

const ROOT=path.resolve(__dirname,"..");
const files={
  peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",
  ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",
  cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",
  d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",
  characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",
  baseArmors:"base-armors.json",boots:"boots.json",belts:"belts.json",amulets:"amulets.json",capes:"capes.json",
  gloves:"gloves.json",pants:"pants.json",rings:"rings.json",itemQualities:"item-qualities.json",
  equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",
  binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json",
  dormitoryQuality:"dormitory-quality.json"
};
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[
  key,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"))]));
let seed=7;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference});
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3].map(id=>generator.createMercenary({id,captain}))});

// Le barème : 100 PO et 2 jours, puis × 1,2 (arrondi à 10) et un jour de plus tous les trois agrandissements.
const cost=k=>rules.dormitoryExpansionCost(k);
assert.deepEqual(cost(1),{number:1,places:5,gold:100,days:2});
assert.deepEqual([1,2,3,4,5,6,7].map(k=>cost(k).gold),[100,120,140,170,210,250,300]);
assert.deepEqual([1,2,3,4,6,7,10,12].map(k=>cost(k).days),[2,2,2,3,3,4,5,5]);
const total=n=>Array.from({length:n},(_,i)=>cost(i+1)).reduce((sum,c)=>({gold:sum.gold+c.gold,days:sum.days+c.days}),{gold:0,days:0});
assert.deepEqual(total(12),{gold:3960,days:42},"100 places : environ 4 000 PO et 42 jours");
assert.equal(cost(32).gold,28490,"le dernier palier avant 200 places");
assert.equal(total(32).days,219);

// Lancer un chantier : l'or part tout de suite, les places arrivent le jour de la fin du chantier.
assert.deepEqual(rules.nextDormitoryExpansion(state),cost(1));
const gold=state.company.gold;
let started=rules.startDormitoryExpansion(state);
assert.equal(started.ok,true);
assert.equal(state.company.gold,gold-100);
assert.deepEqual(state.company.camp.construction,{kind:"dormitory",number:1,places:5,gold:100,days:2,startDay:1,endDay:3});
assert.deepEqual(rules.startDormitoryExpansion(state),{ok:false,reason:"Un chantier est déjà en cours au dortoir."},"un chantier à la fois");
let [day2,day3]=rules.advanceTime(state,2);
assert.equal(day2.built,null);
assert.equal(state.company.camp.dormitoryCapacity,45);
assert.deepEqual(day3.built,{kind:"dormitory",places:5,capacity:45});
assert.equal(state.company.camp.construction,null);
assert.equal(state.company.camp.dormitoryExpansions,1);
assert.deepEqual(rules.nextDormitoryExpansion(state),cost(2),"le suivant coûte plus");

// Pas assez d'or : rien ne se passe.
state.company.gold=119;
assert.deepEqual(rules.startDormitoryExpansion(state),{ok:false,reason:"Pas assez d’or : il faut 120 PO.",cost:cost(2)});
assert.equal(state.company.gold,119);
assert.equal(state.company.camp.construction,null,"pas de chantier lancé");

// Le chantier est sauvegardé avec la partie.
state.company.gold=5000;
rules.startDormitoryExpansion(state);
const restored=restoreCampaign(serializeCampaign(state)).state;
assert.equal(restored.company.camp.construction.endDay,state.day+2);
rules.advanceTime(restored,2);
assert.equal(restored.company.camp.dormitoryCapacity,50);

// Qualité : dix niveaux au-dessus du niveau 0, 500 × n² PO et 3 × n jours, +50 de Renommée et +5 d'affinité.
const levels=reference.dormitoryQuality.rows;
assert.equal(levels.length,11);
assert.deepEqual(levels.map(l=>l.nom),["Paille humide","Paillasses","Châlits de bois","Lits et couvertures","Chambrées",
  "Chambrées chauffées","Matelas de laine","Bains et chambrées","Chambres de quatre","Quartiers de vétérans","Quartiers de seigneur"]);
for(const l of levels.slice(1)) assert.deepEqual([l.prix,l.jours,l.renommee,l.affinite],[500*l.niveau**2,3*l.niveau,50,5],l.nom);
assert.equal(levels.reduce((sum,l)=>sum+l.prix,0),192500);
const q=rules.createCampaign({captain,squad:[4,5,6].map(id=>generator.createMercenary({id,captain}))});
assert.deepEqual(rules.dormitoryQuality(q),levels[0],"niveau 0 au départ");
assert.deepEqual(rules.nextDormitoryQuality(q),{level:1,name:"Paillasses",gold:500,days:3,renown:50,affinity:5});
const renownBefore=rules.companyRenown(q).total;
const [away,home]=q.company.roster.filter(m=>m.id!==captain.id);
away.affinityAcquired=-10;
q.expeditions=[{id:"x",memberIds:[away.id],status:"outbound"}];
const goldBefore=q.company.gold;
assert.equal(rules.startDormitoryQuality(q).ok,true);
assert.equal(q.company.gold,goldBefore-500);
assert.deepEqual(rules.startDormitoryExpansion(q),{ok:false,reason:"Un chantier est déjà en cours au dortoir."},"un chantier à la fois au dortoir");
assert.deepEqual(rules.startDormitoryQuality(q),{ok:false,reason:"Un chantier est déjà en cours au dortoir."});
const reports=rules.advanceTime(q,3);
assert.equal(reports[1].built,null);
assert.deepEqual(reports[2].built,{kind:"dormitory_quality",level:1,name:"Paillasses",renown:50,affinity:5,members:3});
assert.equal(rules.dormitoryQuality(q).nom,"Paillasses");
assert.equal(rules.companyRenown(q).parts.camp,50);
assert.equal(Math.round(rules.companyRenown(q).total-renownBefore),50,"la Renommée gagnée reste");
assert.equal(away.affinityAcquired,-5,"en expédition : dans la compagnie, il gagne aussi");
assert.equal(home.affinityAcquired,5);
assert.equal(Number(q.company.roster.find(m=>m.id===captain.id).affinityAcquired)||0,0,"pas le capitaine");
q.expeditions=[];
// Pas assez d'or ; puis le dernier niveau ; puis plus rien.
q.company.gold=1999;
assert.deepEqual(rules.startDormitoryQuality(q),{ok:false,reason:"Pas assez d’or : il faut 2000 PO.",
  cost:{level:2,name:"Châlits de bois",gold:2000,days:6,renown:50,affinity:5}});
q.company.camp.dormitoryQuality=9;
q.company.gold=60000;
rules.startDormitoryQuality(q);
rules.advanceTime(q,30);
assert.equal(rules.dormitoryQuality(q).nom,"Quartiers de seigneur");
assert.equal(rules.companyRenown(q).parts.camp,500);
assert.equal(rules.nextDormitoryQuality(q),null);
assert.deepEqual(rules.startDormitoryQuality(q),{ok:false,reason:"Le dortoir est déjà au niveau de qualité maximal."});

// Quartiers du lieutenant (Idan, 2026-10-25) : le k-ième coûte 1 000 × k² PO, dure 5 × k jours et demande un dortoir de
// niveau 2 × (k−1) ; six en tout, le dernier au niveau 10. Même chantier que le dortoir.
assert.deepEqual([1,2,3,4,5,6].map(k=>rules.lieutenantQuarterCost(k)),[
  {number:1,gold:1000,days:5,quality:0},{number:2,gold:4000,days:10,quality:2},{number:3,gold:9000,days:15,quality:4},
  {number:4,gold:16000,days:20,quality:6},{number:5,gold:25000,days:25,quality:8},{number:6,gold:36000,days:30,quality:10}]);
const lq=rules.createCampaign({captain,squad:[]});
assert.equal(rules.lieutenantQuarters(lq),0,"aucun au départ");
assert.deepEqual(rules.nextLieutenantQuarter(lq),rules.lieutenantQuarterCost(1));
lq.company.gold=999;
assert.deepEqual(rules.startLieutenantQuarter(lq),{ok:false,reason:"Pas assez d’or : il faut 1000 PO.",cost:rules.lieutenantQuarterCost(1)});
lq.company.gold=10000;
assert.equal(rules.startLieutenantQuarter(lq).ok,true,"le premier dès le niveau 0");
assert.equal(lq.company.gold,9000);
assert.deepEqual(lq.company.camp.construction,{kind:"lieutenant_quarter",number:1,gold:1000,days:5,quality:0,startDay:1,endDay:6});
assert.deepEqual(rules.startDormitoryQuality(lq),{ok:false,reason:"Un chantier est déjà en cours au dortoir."},"même chantier");
const quarterDays=rules.advanceTime(lq,5);
assert.equal(quarterDays[3].built,null);
assert.deepEqual(quarterDays[4].built,{kind:"lieutenant_quarter",number:1});
assert.equal(rules.lieutenantQuarters(lq),1);
assert.deepEqual(rules.startLieutenantQuarter(lq),{ok:false,reason:"Il faut un dortoir de niveau 2.",cost:rules.lieutenantQuarterCost(2)},
  "le deuxième attend le niveau 2");
lq.company.camp.dormitoryQuality=2;
assert.equal(rules.startLieutenantQuarter(lq).ok,true);
assert.equal(restoreCampaign(serializeCampaign(lq)).state.company.camp.construction.kind,"lieutenant_quarter","sauvegardé");
rules.advanceTime(lq,10);
assert.equal(rules.lieutenantQuarters(lq),2);
lq.company.camp.lieutenantQuarters=6;
assert.equal(rules.nextLieutenantQuarter(lq),null);
assert.deepEqual(rules.startLieutenantQuarter(lq),{ok:false,reason:"Tous les quartiers du lieutenant sont construits."});
for(const [code,value] of [["camp.lieutenant_quarter.gold_base",1000],["camp.lieutenant_quarter.days_base",5],["camp.lieutenant_quarter.quality_step",2]]){
  assert.equal(reference.formulaConstants.rows.find(r=>r.code===code)?.valeur,value,code);
}

// Interface (Idan, 2026-10-25) : Ma Compagnie montre le dortoir et un bouton pour y aller ; l'écran Dortoir, sur le fond
// de son niveau de qualité, propose d'agrandir ou d'améliorer.
const elements={};
const $=id=>elements[id]||(elements[id]={innerHTML:""});
const fmt=value=>String(Math.round(Number(value)||0)).replace(/\B(?=(\d{3})+(?!\d))/g," ");
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const log=[],styles={};
let saved=0,rendered=0;
const documentStub={baseURI:"https://jeu.test/",body:{style:{setProperty:(key,value)=>{ styles[key]=value; }}}};
const game={campaign:rules.createCampaign({captain,squad:[]})};
const js=fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8");
const ui=new Function("game","$","fmt","esc","campaignRules","dormitoryPlacesText","tavernLog","saveGame","renderGame","document",
  js+"\nreturn {renderCampBuildings,renderDormitory,expandDormitory,improveDormitory,buildLieutenantQuarter,logCampWork};")(
  game,$,fmt,esc,()=>rules,places=>String(places),(message,kind)=>log.push({message,kind}),()=>saved++,()=>rendered++,documentStub);
const company=()=>elements["camp-buildings"].innerHTML,dormitory=()=>elements["dormitory-view"].innerHTML;
ui.renderCampBuildings();
assert.match(company(),/<h3>Constructions<\/h3>/);
assert.match(company(),/<strong>Dortoir<\/strong><span>0 \/ 40 places occupées<\/span>\s*<span>Qualité : Paille humide \(niveau 0\)<\/span><span>Quartiers du lieutenant : aucun<\/span><\/div>/);
assert.match(company(),/<button type="button" class="primary" data-open-camp-scene="dormitory" data-destination="Dortoir">Aller au dortoir<\/button>/);
assert.doesNotMatch(company(),/data-dorm-expand|data-dorm-quality/,"les chantiers se lancent au dortoir");
assert.equal(styles["--dormitory-bg"],'url("https://jeu.test/assets/dormitory/dortoir-0.jpg")',"niveau 0 : son image");
assert.match(dormitory(),/data-open-camp-scene="company" data-destination="Ma Compagnie">← Ma Compagnie<\/button>/);
assert.match(dormitory(),/<p class="eyebrow">Dortoir<\/p>\s*<h2>Paille humide<\/h2>\s*<p class="dormitory-meta">Niveau 0 · 0 \/ 40 places occupées · Quartiers du lieutenant : aucun<\/p>/);
assert.match(dormitory(),/<button type="button" class="primary" data-dorm-quarter>Construire : quartier du lieutenant n° 1<\/button>\s*<span class="building-cost">1 000 PO · 5 jours<\/span>/);
assert.match(dormitory(),/<button type="button" class="primary" data-dorm-expand>Agrandir : \+5 places<\/button>\s*<span class="building-cost">100 PO · 2 jours<\/span>/);
assert.match(dormitory(),/<button type="button" class="primary" data-dorm-quality>Améliorer : Paillasses<\/button>\s*<span class="building-cost">500 PO · 3 jours · Renommée \+50, affinité \+5<\/span>/);
ui.expandDormitory();
assert.deepEqual(log.at(-1),{message:"Agrandissement du dortoir lancé : 100 PO, +5 places dans 2 jours.",kind:"gear"});
assert.deepEqual([saved,rendered],[1,1]);
ui.renderCampBuildings();
assert.match(dormitory(),/<p class="building-work">Chantier en cours : \+5 places, prêtes dans 2 jours\.<\/p>/);
assert.doesNotMatch(dormitory(),/data-dorm-expand|data-dorm-quality|data-dorm-quarter/,"pas de second chantier");
assert.match(company(),/<span class="building-work">Chantier en cours : \+5 places, prêtes dans 2 jours\.<\/span>/,"le chantier se voit aussi dans Ma Compagnie");
rules.advanceTime(game.campaign,1);
ui.renderCampBuildings();
assert.match(dormitory(),/prêtes dans 1 jour\./);
rules.advanceTime(game.campaign,1);
game.campaign.company.gold=300;
ui.renderCampBuildings();
assert.match(company(),/0 \/ 45 places occupées/);
assert.doesNotMatch(company(),/Chantier en cours/);
assert.match(dormitory(),/data-dorm-expand>Agrandir : \+5 places<\/button>\s*<span class="building-cost">120 PO · 2 jours<\/span>/);
assert.match(dormitory(),/data-dorm-quality disabled>Améliorer : Paillasses<\/button>\s*<span class="building-cost">500 PO · 3 jours · Renommée \+50, affinité \+5 · pas assez d’or<\/span>/);
game.campaign.company.gold=5000;
ui.improveDormitory();
assert.deepEqual(log.at(-1),{message:"Amélioration du dortoir lancée : Paillasses (niveau 1), 500 PO, prêt dans 3 jours.",kind:"gear"});
ui.renderCampBuildings();
assert.match(dormitory(),/Chantier en cours : Paillasses \(niveau 1\), prêt dans 3 jours\./);
ui.logCampWork({kind:"dormitory_quality",level:1,name:"Paillasses",renown:50,affinity:5,members:12});
assert.deepEqual(log.at(-1),{message:"Le dortoir passe au niveau 1 : Paillasses. Renommée +50 ; affinité +5 pour 12 mercenaires.",kind:"turn"});
ui.logCampWork({kind:"lieutenant_quarter",number:1});
assert.deepEqual(log.at(-1),{message:"Le quartier du lieutenant n° 1 est prêt au dortoir.",kind:"turn"});
ui.logCampWork({kind:"dormitory",places:5,capacity:45});
assert.deepEqual(log.at(-1),{message:"Le dortoir est agrandi : +5 places, 45 en tout.",kind:"turn"});
// Quartier du lieutenant : bloqué tant que le dortoir n'a pas le niveau demandé, puis un chantier comme les autres.
Object.assign(game.campaign.company.camp,{construction:null,dormitoryQuality:1,lieutenantQuarters:1});
game.campaign.company.gold=10000;
ui.renderCampBuildings();
assert.match(company(),/<span>Quartiers du lieutenant : 1<\/span>/);
assert.match(dormitory(),/data-dorm-quarter disabled>Construire : quartier du lieutenant n° 2<\/button>\s*<span class="building-cost">4 000 PO · 10 jours · dortoir de niveau 2 requis<\/span>/);
game.campaign.company.camp.dormitoryQuality=2;
ui.renderDormitory();
assert.match(dormitory(),/data-dorm-quarter>Construire : quartier du lieutenant n° 2<\/button>\s*<span class="building-cost">4 000 PO · 10 jours<\/span>/);
ui.buildLieutenantQuarter();
assert.deepEqual(log.at(-1),{message:"Construction lancée : quartier du lieutenant n° 2, 4 000 PO, prêt dans 10 jours.",kind:"gear"});
ui.renderCampBuildings();
assert.match(dormitory(),/<p class="building-work">Chantier en cours : quartier du lieutenant n° 2, prêt dans 10 jours\.<\/p>/);
game.campaign.company.camp.lieutenantQuarters=6;
game.campaign.company.camp.construction=null;
ui.renderDormitory();
assert.match(dormitory(),/<p class="building-work">Tous les quartiers du lieutenant sont construits\.<\/p>/);
// Le fond suit le niveau : une image par niveau, de 0 à 10, toutes présentes.
for(const level of [1,2,7,10]){
  game.campaign.company.camp.construction=null;
  game.campaign.company.camp.dormitoryQuality=level;
  ui.renderDormitory();
  assert.equal(styles["--dormitory-bg"],`url("https://jeu.test/assets/dormitory/dortoir-${level}.jpg")`);
}
assert.match(dormitory(),/<h2>Quartiers de seigneur<\/h2>[\s\S]*Qualité maximale\./);
for(const row of reference.dormitoryQuality.rows){
  assert.equal(row.image,`dortoir-${row.niveau}.jpg`);
  assert.ok(fs.existsSync(path.join(ROOT,"prototype-web","assets","dormitory",row.image)),row.image);
  assert.ok(fs.existsSync(path.join(ROOT,"assets-src","fonds","Dortoirs",row.image)),"master "+row.image);
}

// Branchements : la page, le rendu, le journal du matin, la Renommée.
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(index,/<div id="captain-summary"><\/div>\s*<section id="lieutenants-panel"[^>]*><\/section>\s*<section id="camp-buildings"/);
assert.match(index,/<script src="camp-buildings-ui.js"><\/script>/);
assert.match(index,/<section class="camp-scene hidden dormitory-scene" data-camp-scene-panel="dormitory" aria-label="Dortoir">[\s\S]*?<section id="dormitory-view" class="dormitory-panel"><\/section>/);
const screen=fs.readFileSync(path.join(ROOT,"prototype-web","screen-ui.js"),"utf8");
assert.match(screen,/const CAMP_SCENES=\["company","dormitory",/);
assert.match(screen,/open\.dataset\.destination\|\|open\.textContent\.trim\(\)/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","styles.css"),"utf8"),/\[data-camp-scene="dormitory"\]::before \{\s*background-image: var\(--dormitory-bg/);
const main=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
assert.match(main,/renderCampBuildings\(\);/);
assert.match(main,/initializeCampBuildingsUi\(\);/);
assert.match(main,/" \+ dortoir " \+ fmt\(renown\.parts\.camp\)/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8"),/logCampWork\(report\.built\)/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8"),/dormitoryQuality: "dormitory-quality\.json"/);

console.log("Dortoir : agrandir, qualité (Renommée, affinité), un chantier à la fois, sauvegarde, Ma Compagnie, écran Dortoir et ses fonds — OK");
