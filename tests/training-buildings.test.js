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

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
let seed=9;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,
  bodyguard:createBodyguardRules({reference,random}),random});
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
  blade_circle:["Cercle des Fines Lames","Dextérité",[["Salle des Lames longues","Lames longues"],["Salle des Lames courtes","Lames courtes"],
    ["Salle des Deux armes","Combat à deux armes"],["Salle de la Main seule","Combat à une main"]]]
};
const known=new Set([...reference.characteristics.rows.map(r=>r.nom),...reference.skills.rows.map(r=>r.nom)]);
for(const [code,[name,trains,wings]] of Object.entries(BUILDINGS)){
  const b=row(code);
  assert.deepEqual([b.nom,b.entraine,b.niveaux,b.prix_base,b.jours_base,b.requiert,b.places_pas],[name,trains,10,1000,4,null,0],code);
  const rooms=rules.campRoomCodes(code).map(row);
  assert.deepEqual(rooms.map(r=>[r.nom,r.entraine]),wings,code+" : ses ailes");
  for(const r of [b,...rooms]){
    assert.ok(known.has(r.entraine),r.code+" : "+r.entraine+" existe");
    assert.deepEqual([r.niveaux,r.prix_base,r.jours_base,r.places_pas],[10,1000,4,0],r.code+" : barème, pas encore de places");
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
assert.equal(rules.buildingPlaces(state,"ludus"),0,"pas encore de places");

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
assert.match(html,/<strong title="Le Doctore y endurcit les corps[^"]*">Ludus<\/strong><span>Résistance physique · Niveau 1<\/span>/);
assert.match(html,/<strong title="« On pousse la meule à la place de l'âne\. L'âne, lui, se repose\. »">La Meule<\/strong><span>Force · À construire<\/span>/,"l'info-bulle au survol du nom");
assert.match(html,/Académie de la survie<\/strong><span>Boucliers · À construire<\/span>/);
assert.doesNotMatch(html,/Le Four/,"pas d'aile avant l'Académie");
assert.match(html,/Cercle des Fines Lames<\/strong><span>Dextérité · Niveau 10 · garde du corps \+50 %<\/span>/);
assert.match(html,/Salle de la Main seule<\/strong><span>Combat à une main · À construire<\/span>/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","contract-ui.js"),"utf8"),/\(dont \+\$\{fmt\(Math\.round\(guard\.payBonus\*100\)\)\} % du Cercle des Fines Lames\)/);

console.log("Ludus, Académie de la survie, Cercle des Fines Lames : 10 niveaux, ailes, noms, garde du corps + 5 % par niveau du Cercle — OK");
