"use strict";

// Bâtiments d'entraînement, première étape (Idan, 2026-11-03 : « Je te laisse coder Ludus / Survie / Fines Lames ») :
// sur le modèle de l'École de magie, chacun à construire puis 10 niveaux, ses ailes au plus au niveau du bâtiment (même
// barème : niveau n = 1 000 × n² PO et 4 × n jours). Noms et info-bulles validés par Idan ; colonne entraine : ce qu'ils
// travailleront (l'entraînement viendra ensuite, pas encore de places). Le Cercle des Fines Lames : la garde du corps paie
// mieux, + 5 % par niveau (« On garde juste l'augmentation de la prime, pas la fréquence »). Doc 11 §7.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createBodyguardRules}=require("../game-core/bodyguard.js");
const {createProgressionRules}=require("../game-core/progression.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
let seed=9;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,
  bodyguard:createBodyguardRules({reference,random}),progression:createProgressionRules({reference}),random});
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3].map(id=>generator.createMercenary({id,captain}))});
const at=(code,level)=>{ state.company.camp.buildings=state.company.camp.buildings||{}; state.company.camp.buildings[code]={level,construction:null}; };

// Données : les trois bâtiments, leurs ailes, ce qu'ils travaillent.
const rows=reference.campBuildings.rows,row=code=>rows.find(r=>r.code===code);
const BUILDINGS={
  ludus:["Ludus","Résistance physique",[["La Meule","Force"],["La Longue Piste","Endurance"],["La Course au Cochon","Vitesse"],
    ["La Quintaine","Esquive"],["Le Réfectoire du Doctore","Constitution"]]],
  survival_academy:["Académie de la survie","Boucliers",[["Le Four","Résistance au feu"],["Le Frigo","Résistance au froid"],
    ["La Décharge","Résistance à la foudre"],["La Cantine","Résistance au poison"],["Le Placard","Discrétion"]]],
  // Les ailes du Cercle (Idan, 2026-11-03 : « je garde tes noms dandy »).
  blade_circle:["Cercle des Fines Lames","Dextérité",[["La Salle des Miroirs","Lames longues"],["Le Boudoir","Lames courtes"],
    ["Le Bal masqué","Combat à deux armes"],["Le Salon de thé","Combat à une main"]]],
  // La Tour de guet (Idan, 2026-11-03 : Armes à feu, Pièges, Courage, Volonté : « Non » ; « pas d'instructeur ici » ;
  // deuxième fonction : « Rien pour l'instant ! »).
  watchtower:["Tour de guet","Perception",[["Le Créneau","Armes de tir"]]],
  // Le Labo d'alchimie (Idan, 2026-11-03 : « Dans la salle principale, on peut entraîner sa résistance au poison » ;
  // « piège et armes à feu, c'est validé » ; les potions plus tard).
  alchemy_lab:["Labo d’alchimie","Résistance au poison",[["La Poudrière","Armes à feu"],["La Cave","Pièges"]]],
  // La Cabane du bûcheron (Idan, 2026-11-03 : « On aura une salle d'entraînement aux haches » ; « Pas de chef pour l'instant »).
  lumber_camp:["Cabane du bûcheron","Haches",[]],
  // La Guilde des mineurs (Idan, 2026-11-04 : « on y apprend les armes contondantes » ; « Le Puits » ; la Force).
  miners_guild:["Guilde des mineurs","Armes contondantes",[]]
};
const known=new Set([...reference.characteristics.rows.map(r=>r.nom),...reference.skills.rows.map(r=>r.nom)]);
for(const [code,[name,trains,wings]] of Object.entries(BUILDINGS)){
  const b=row(code);
  assert.deepEqual([b.nom,b.entraine,b.niveaux,b.prix_base,b.jours_base,b.requiert,b.places_base,b.places_pas],[name,trains,10,1000,4,null,1,2],code);
  const rooms=rules.campRoomCodes(code).map(row);
  assert.deepEqual(rooms.map(r=>[r.nom,r.entraine]),wings,code+" : ses ailes");
  for(const r of [b,...rooms]){
    assert.ok(known.has(r.entraine),r.code+" : "+r.entraine+" existe");
    assert.deepEqual([r.niveaux,r.prix_base,r.jours_base,r.places_base,r.places_pas],[10,1000,4,1,2],r.code+" : barème, places comme l'École");
    assert.ok(r.description.length>20,r.code+" : une info-bulle");
  }
}
assert.match(row("ludus_force").description,/On pousse la meule à la place de l'âne/);
assert.match(row("survival_stealth").description,/Il cherche encore le dernier/);
assert.deepEqual(rows.filter(r=>r.garde_paie_par_niveau).map(r=>[r.code,r.garde_paie_par_niveau]),[["blade_circle",0.05]]);
for(const r of rows) assert.deepEqual(Object.keys(r),reference.campBuildings.columns.map(c=>c.key),r.code+" : toutes les colonnes");
assert.equal(reference.campBuildings.row_count,rows.length);

// Une aile monte au plus jusqu'au niveau de son bâtiment.
assert.deepEqual(rules.nextBuildingLevel(state,"ludus_force"),
  {code:"ludus_force",name:"La Meule",level:1,gold:1000,days:4,requires:{code:"ludus",name:"Ludus",level:1},locked:true});
state.company.gold=100000;
assert.equal(rules.startBuilding(state,"ludus_force").reason,"La Meule : il faut d’abord Ludus au niveau 1.");
assert.equal(rules.startBuilding(state,"ludus").ok,true);
rules.advanceTime(state,4);
assert.equal(rules.buildingLevel(state,"ludus"),1);
assert.equal(rules.startBuilding(state,"ludus_force").ok,true);
assert.equal(rules.buildingPlaces(state,"ludus"),1,"1 place, +1 tous les 2 niveaux");
// La caractéristique qui fait le gain (Idan, 2026-11-03) : Intelligence, Endurance, Volonté, Dextérité.
assert.deepEqual(["magic_school","ludus","survival_academy","blade_circle"].map(code=>row(code).apprend_avec),["Intelligence","Endurance","Volonté","Dextérité"]);
assert.equal(reference.formulaConstants.rows.find(r=>r.code==="camp.training.talent_share").valeur,0.75);

// Cercle des Fines Lames : la garde du corps paie mieux, + 5 % par niveau, arrondi à 10 PO ; la fréquence ne change pas.
const guards=()=>{
  for(const slot of state.tavernBoard.slots){ slot.offer=null; slot.emptyUntil=null; }
  for(let i=0;i<20;i++){ rules.fillTavernBoard(state); if(rules.boardOffers(state).some(o=>o.kind==="bodyguard")) break;
    for(const slot of state.tavernBoard.slots){ slot.offer=null; slot.emptyUntil=null; } }
  return rules.boardOffers(state).filter(o=>o.kind==="bodyguard");
};
const plain=guards();
assert.ok(plain.length&&plain.every(o=>o.payBonus===undefined&&o.basePayment===undefined),"sans le Cercle : rien ne change");
at("blade_circle",3);
assert.equal(rules.campBuildingEffects(state).bodyguardPay,0.15);
const paid=guards();
assert.ok(paid.length);
for(const o of paid){
  assert.equal(o.payBonus,0.15);
  assert.equal(o.payment,Math.round(o.basePayment*1.15/10)*10,"+15 % au niveau 3, arrondi à 10 PO");
  assert.equal(o.payment%10,0);
}
at("blade_circle",10);
assert.equal(rules.campBuildingEffects(state).bodyguardPay,0.5,"+50 % au niveau 10");
assert.match(fs.readFileSync(path.join(ROOT,"game-core","campaign.js"),"utf8"),
  /slot\.offer=createBoardOffer\(state,kinds\[Math\.min\(kinds\.length-1,Math\.floor\(random\(\)\*kinds\.length\)\)\]\);/,"le tirage du type de mission reste à chances égales");

// Interface : un encart par bâtiment, ce qu'il travaille devant son état, ses ailes une fois construit ; l'effet du Cercle.
const elements={};
const $=id=>elements[id]||(elements[id]={innerHTML:""});
const fmt=value=>String(Math.round(Number(value)||0)).replace(/\B(?=(\d{3})+(?!\d))/g," ");
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const game={campaign:state};
const ui=new Function("game","$","fmt","esc","campaignRules","dormitoryPlacesText","tavernLog","saveGame","renderGame","document",
  fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8")+"\nreturn {renderCampBuildings};")(
  game,$,fmt,esc,()=>rules,places=>String(places),()=>{},()=>{},()=>{},{baseURI:"https://jeu.test/",body:{style:{setProperty:()=>{}}}});
delete state.company.camp.buildings.survival_academy;
ui.renderCampBuildings();
const html=elements["camp-buildings"].innerHTML;
assert.match(html,/<strong title="Le Doctore y endurcit les corps[^"]*">Ludus<\/strong><span>Résistance physique · Niveau 1 · <span class="building-places" title="[^"]*">\d\/1 place<\/span><\/span>/);
assert.match(html,/<strong title="« On pousse la meule à la place de l'âne\. L'âne, lui, se repose\. »">La Meule<\/strong><span>Force · À construire<\/span>/,"l'info-bulle au survol du nom");
assert.match(html,/Académie de la survie<\/strong><span>Boucliers · À construire<\/span>/);
assert.doesNotMatch(html,/Le Four/,"pas d'aile avant l'Académie");
assert.match(html,/Cercle des Fines Lames<\/strong><span>Dextérité · Niveau 10 · <span class="building-places" title="[^"]*">\d\/6 places<\/span> · garde du corps \+50 %<\/span>/);
assert.match(html,/<strong title="« La tasse dans une main, l'épée dans l'autre\. Ne rien renverser\. »">Le Salon de thé<\/strong><span>Combat à une main · À construire<\/span>/);
// Le capitaine choisit parmi les salles de tous les bâtiments, rangées par bâtiment : la salle principale par ce qu'elle
// travaille, les ailes par leur nom.
assert.match(html,/<optgroup label="Ludus"><option value="ludus">Résistance physique<\/option><\/optgroup><optgroup label="Cercle des Fines Lames"><option value="blade_circle">Dextérité<\/option><\/optgroup><\/select>/);

// Entraînement libre (Idan, 2026-11-03) : chaque matin, les disponibles s'entraînent dans tous les bâtiments ; au Ludus,
// la Résistance physique monte, le gain vient de l'Endurance.
state.company.camp.buildings={ludus:{level:10,construction:null},ludus_force:{level:10,construction:null},blade_circle:{level:10,construction:null}};
for(const m of state.company.roster) m.stats["Volonté"]=95;
assert.deepEqual(rules.setCaptainTraining(state,"ludus_force"),{ok:true,code:"ludus_force"});
const forceBefore=captain.stats.Force,xpBefore=captain.xp?.stats?.Force||0;
const [morning]=rules.advanceTime(state,1);
const entries=morning.school.entries;
assert.deepEqual(entries.find(e=>e.captain)?.code,"ludus_force","le capitaine à La Meule, sans test");
assert.ok((captain.xp?.stats?.Force||0)>xpBefore||captain.stats.Force>forceBefore,"sa Force progresse");
const others=entries.filter(e=>!e.captain);
assert.equal(others.length,2);
for(const e of others) assert.equal(e.chance,81.8,"hors École, la Volonté seule : Δ = (95 − 50) / 2 = 22,5 → 81,8 %");
assert.ok(others.every(e=>["ludus","ludus_force","blade_circle"].includes(e.code||e.aimed)),"une salle d'un bâtiment construit");
assert.ok(others.some(e=>e.code),"au moins un s'entraîne");
const lines=[];
const logUi=new Function("game","$","fmt","esc","campaignRules","dormitoryPlacesText","tavernLog","saveGame","renderGame","document",
  fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8")+"\nreturn {logSchoolDay};")(
  game,$,fmt,esc,()=>rules,String,message=>lines.push(message),()=>{},()=>{},{});
logUi.logSchoolDay({entries:[{code:"ludus"},{code:"ludus_force"},{code:"blade_circle"},{code:null}]});
assert.deepEqual(lines,["Ludus : 2 élèves aujourd’hui.","Cercle des Fines Lames : 1 élève aujourd’hui."],"une ligne par bâtiment");

// La Tour de guet : la Perception à la Vigie, les Armes de tir au Créneau, apprises avec la Perception ; pas de maître.
assert.equal(row("watchtower").apprend_avec,"Perception");
assert.match(row("watchtower").description,/Dans la Vigie : « Là-haut, on voit venir les ennuis\. Et la pluie\. »/);
assert.equal(require("../game-core/camp-posts.js").postOfBuilding("watchtower"),null,"pas d'instructeur");
state.company.camp.buildings={watchtower:{level:1,construction:null},watchtower_ranged:{level:1,construction:null}};
assert.deepEqual(rules.trainingRooms(state).map(r=>[r.code,r.building,r.trains,r.learnWith,r.places]),
  [["watchtower","watchtower","Perception","Perception",1],["watchtower_ranged","watchtower","Armes de tir","Perception",1]]);

// Le Labo d'alchimie : la Résistance au poison à l'Alambic, appris avec l'Intelligence ; un chef de salle, l'Alchimiste
// (Idan, 2026-11-03 : « En fait, on va nommer un alchimiste comme chef de salle ! »).
assert.equal(row("alchemy_lab").apprend_avec,"Intelligence");
assert.match(row("alchemy_lab").description,/Dans l’Alambic : « Ça bout, ça fume, ça sent le chou\. Personne ne sait ce que c’est\. »/);
assert.equal(require("../game-core/camp-posts.js").postOfBuilding("alchemy_lab")?.key,"alchemist","l'Alchimiste");
state.company.camp.buildings={alchemy_lab:{level:1,construction:null},alchemy_firearms:{level:1,construction:null},alchemy_traps:{level:1,construction:null}};
assert.deepEqual(rules.trainingRooms(state).map(r=>[r.code,r.trains,r.learnWith]),
  [["alchemy_lab","Résistance au poison","Intelligence"],["alchemy_firearms","Armes à feu","Intelligence"],["alchemy_traps","Pièges","Intelligence"]]);

// La Cabane du bûcheron : les Haches au Billot, apprises avec la Force ; pas de chef.
assert.equal(row("lumber_camp").apprend_avec,"Force");
assert.equal(require("../game-core/camp-posts.js").postOfBuilding("lumber_camp"),null,"pas de chef");
state.company.camp.buildings={lumber_camp:{level:1,construction:null}};
assert.deepEqual(rules.trainingRooms(state).map(r=>[r.code,r.building,r.trains,r.learnWith,r.places]),[["lumber_camp","lumber_camp","Haches","Force",1]]);

// La Guilde des mineurs : les Armes contondantes au Puits, apprises avec la Force ; pas de chef.
assert.equal(row("miners_guild").apprend_avec,"Force");
assert.equal(require("../game-core/camp-posts.js").postOfBuilding("miners_guild"),null,"pas de chef");
state.company.camp.buildings={miners_guild:{level:1,construction:null}};
assert.deepEqual(rules.trainingRooms(state).map(r=>[r.code,r.building,r.trains,r.learnWith,r.places]),[["miners_guild","miners_guild","Armes contondantes","Force",1]]);

// La fiche de l'offre montre le paiement, sans commentaire (Idan : « tu veux toujours mettre du blabla inutile ! »).
assert.doesNotMatch(fs.readFileSync(path.join(ROOT,"prototype-web","contract-ui.js"),"utf8"),/du Cercle des Fines Lames/);

console.log("Ludus, Académie de la survie, Cercle des Fines Lames : 10 niveaux, ailes, noms, garde du corps + 5 % par niveau du Cercle, entraînement libre — OK");
