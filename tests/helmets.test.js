"use strict";

// Casques et chapeaux (Idan, 2026-10-25) : Casque de constitution (Constitution +5/10/15/20 %, Puissance magique
// −20/15/10/5 %, Vitesse −4/3/2/1), Chapeau d'intelligence (Intelligence), Chapeau du dresseur (Compagnon animal).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createEquipmentEffects}=require("../game-core/equipment-effects.js");
const {createItemCards}=require("../game-core/item-card.js");
const {createItemValues}=require("../game-core/item-value.js");
const {createEquipmentDeals}=require("../game-core/equipment-deals.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {pictoSlug}=require("../prototype-web/picto-ui.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const files={
  peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",
  ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",
  cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",
  d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",
  characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",
  baseArmors:"base-armors.json",boots:"boots.json",belts:"belts.json",amulets:"amulets.json",capes:"capes.json",
  gloves:"gloves.json",pants:"pants.json",rings:"rings.json",helmets:"helmets.json",itemQualities:"item-qualities.json",
  itemTitles:"item-titles.json",equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",
  binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json"
};
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,read(file)]));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ≠ ${b}`);

// Les données, telles qu'Idan les a données.
const helmets=reference.helmets.rows;
assert.deepEqual(helmets.map(h=>[h.nom,h.caracteristique]),
  [["Casque de constitution","Constitution"],["Chapeau d’intelligence","Intelligence"],["Chapeau du dresseur","Compagnon animal"]]);
for(const h of helmets) assert.deepEqual([h.bonus_t1,h.bonus_t2,h.bonus_t3,h.bonus_t4],[5,10,15,20],h.nom);
const constitution=helmets[0];
assert.equal(constitution.malus_caracteristique,"Puissance magique");
assert.deepEqual([1,2,3,4].map(t=>constitution["malus_t"+t]),[20,15,10,5]);
assert.deepEqual([1,2,3,4].map(t=>constitution["vitesse_t"+t]),[4,3,2,1]);
for(const h of helmets.slice(1)) assert.deepEqual([1,2,3,4].map(t=>[h["malus_t"+t],h["vitesse_t"+t]]),[[0,0],[0,0],[0,0],[0,0]],h.nom);

// Le moteur : bonus, malus de Puissance magique, poids sur la Vitesse ; la compétence animale.
const engine=createCombatEngine(reference);
const wearer=(name,tier)=>({character:{stats:{Constitution:60,Intelligence:50,"Puissance magique":40,Vitesse:50,Esquive:30},
  skills:{animal:{"Compagnon animal":30}},items:[{id:"h",itemType:"helmet",name,tier}],equipment:{slots:{head:"h"}}},activeSet:1});
const tank=wearer("Casque de constitution",1);
near(engine.statWithGear(tank,"Constitution"),63);
near(engine.statWithGear(tank,"Puissance magique"),32,"−20 %");
assert.equal(engine.headgearSpeedPenalty(tank),4);
assert.equal(engine.effectiveSpeed(tank),46);
assert.equal(engine.headgearSpeedPenalty(wearer("Casque de constitution",4)),1);
near(engine.statWithGear(wearer("Casque de constitution",4),"Puissance magique"),38,"−5 % au T4");
near(engine.statWithGear(wearer("Chapeau d’intelligence",3),"Intelligence"),57.5);
assert.equal(engine.headgearSpeedPenalty(wearer("Chapeau d’intelligence",3)),0,"un chapeau ne pèse rien");
// L'Intelligence du chapeau compte au combat : Initiative (0,25 × Intelligence).
const bare={character:{...wearer("Chapeau d’intelligence",4).character,items:[],equipment:{slots:{}}},activeSet:1};
near(engine.initiative(wearer("Chapeau d’intelligence",4))-engine.initiative(bare),0.25*10);
assert.equal(engine.baseValue(wearer("Chapeau du dresseur",2),"Compagnon animal"),30);
near(engine.statWithGear(wearer("Chapeau du dresseur",2),"Compagnon animal"),33);

// La fiche : les lignes du détail.
const {effects}=createEquipmentEffects({engine});
const e=effects(tank.character);
assert.deepEqual(e.Constitution.lines.map(l=>[l.label,l.percent]),[["Casque de constitution",5]]);
assert.deepEqual(e["Puissance magique"].lines.map(l=>[l.label,l.percent]),[["Casque de constitution",-20]]);
assert.deepEqual(e.Vitesse.lines.map(l=>[l.label,l.delta,l.reason]),[["Casque de constitution",-4,"helmet"]]);
near(e["Compagnon animal"].value,30);
near(effects(wearer("Chapeau du dresseur",4).character)["Compagnon animal"].value,36);
assert.deepEqual(effects(wearer("Chapeau d’intelligence",4).character).Initiative.lines.map(l=>[l.label,l.delta]),[["Intelligence avec l’équipement",2.5]]);

// La carte d'objet.
const cards=createItemCards({reference});
const card=cards.card({itemType:"helmet",name:"Casque de constitution",tier:2,qualityCode:"standard"});
assert.equal(card.title,"Heaume à plumet");
assert.equal(card.category,"Casque");
assert.deepEqual([card.stat,card.bonus,card.malus,card.opposites,card.speed],["Constitution",10,15,["Puissance magique"],3]);
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","item-card-ui.js"),"utf8");
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const {renderItemCard}=new Function("game","esc","MercenairesItemCard","equipmentArt","document",ui+"\nreturn {renderItemCard};")(
  {referenceData:reference},esc,{createItemCards},()=>null,undefined);
const html=renderItemCard({itemType:"helmet",name:"Casque de constitution",tier:2,qualityCode:"standard"});
assert.match(html,/Ajoute 10 % de la Constitution de base du porteur/);
assert.match(html,/Retire 15 % de la Puissance magique de base du porteur/);
assert.match(html,/Pèse sur la tête : −3 Vitesse/);
assert.match(renderItemCard({itemType:"helmet",name:"Chapeau du dresseur",tier:4,qualityCode:"luxury"}),/Ajoute 20 % du Compagnon animal de base du porteur/);
for(const h of helmets){
  const titles=reference.itemTitles.rows.find(r=>r.nom===h.nom);
  assert.ok(titles&&titles.famille==="casque",h.nom);
  for(const t of [1,2,3,4]) assert.ok(titles["t"+t],`${h.nom} T${t}`);
}

// Valeur cachée : 100 PO de base, comme les autres objets à bonus.
assert.equal(createItemValues({reference}).value({itemType:"helmet",name:"Chapeau d’intelligence",tier:2,qualityCode:"standard"}),300);

// Échanges : l'emplacement Casque / Chapeau ne prend qu'un casque ou un chapeau.
const deals=createEquipmentDeals({reference,random:()=>0,affinityRules:{memberAffinity:()=>({total:0})}});
assert.equal(deals.slotAccepts({},"head",{itemType:"helmet"}).ok,true);
assert.equal(deals.slotAccepts({},"head",{itemType:"ring"}).ok,false);
assert.equal(deals.slotAccepts({},"ring_1",{itemType:"helmet"}).ok,false);

// Génération : 5 % à la création, 1D6 au stock de départ, possibles dans le butin ; le stock les donne aussi aux parties
// commencées avant.
assert.equal(reference.startingEquipmentGeneration.helmet_chance,0.05);
let seed=11;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});
const stock=generator.createStartingHelmetStock(captain);
assert.ok(stock.length>=1&&stock.length<=6);
for(const item of stock) assert.deepEqual([item.itemType,item.slot,item.category,item.owner],["helmet","head","Casque",null]);
const loot=Array.from({length:200},()=>generator.createLootItem(captain));
assert.ok(loot.some(item=>item.itemType==="helmet"),"un casque peut tomber du coffre");
let worn=0;
for(let i=0;i<400;i++){ const m=generator.createMercenary({id:100+i,captain}); if(m.equipment.slots.head) worn++; }
assert.ok(worn>5&&worn<45,`environ 5 % à la création : ${worn} / 400`);
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference});
const state=rules.createCampaign({captain,squad:[]});
assert.ok(state.company.stock.some(item=>item.itemType==="helmet"));
assert.equal(state.company.startingHelmets,true);
const old=rules.createCampaign({captain,squad:[]});
old.company.stock=old.company.stock.filter(item=>item.itemType!=="helmet");
delete old.company.startingHelmets;
assert.equal(rules.ensureStartingStock(old),true);
assert.ok(old.company.stock.some(item=>item.itemType==="helmet"),"partie commencée avant : les casques arrivent");

// Images (Jean-Mimi) : 3 casques × 4 tiers, en 256 et 512 px ; l'Intendance a son onglet.
const art=fs.readFileSync(path.join(ROOT,"prototype-web","equipment-art.js"),"utf8");
for(const h of helmets) for(const t of [1,2,3,4]){
  const key=`casques/${pictoSlug(h.nom)}-${t}`;
  assert.ok(art.includes(`"${key}"`),key);
  assert.ok(fs.existsSync(path.join(ROOT,"prototype-web","assets","equipment-large",key+".webp")),"grande image "+key);
}
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8"),/const EQUIPMENT_ART_DIRS=\{helmet:"casques",/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","quartermaster-ui.js"),"utf8"),/\["helmet","Casques"\]/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8"),/helmets: "helmets\.json"/);

console.log("Casques : données, moteur, fiche, carte, valeur, échanges, génération, stock, images — OK");
