"use strict";

// Potions et fioles (Idan, 2026-10-29) : Potion de soins (20 % des PV max), Potion de mana (20 % du mana max), Fiole de
// poison (l'arme active empoisonne pendant 3 tours, au corps à corps comme au tir). Objets de ceinture à usage unique,
// sur soi seulement, par une action rapide. 1D6 de chaque au stock de départ, 5 % pour une recrue ; distribués librement.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createItemCards}=require("../game-core/item-card.js");
const {createItemValues}=require("../game-core/item-value.js");
const {createEquipmentDeals}=require("../game-core/equipment-deals.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");

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
  binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json",potions:"potions.json"
};
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,read(file)]));

// Les données, telles qu'Idan les a données.
const potions=reference.potions.rows;
assert.deepEqual(potions.map(p=>[p.nom,p.code,p.effet,p.pourcentage,p.tours]),[
  ["Potion de soins","healing_potion","soin",20,null],
  ["Potion de mana","mana_potion","mana",20,null],
  ["Fiole de poison","poison_vial","poison_arme",null,3]]);
assert.equal(potions[2].degats_poison,10);

// Génération : 1D6 de chaque au stock de départ ; 5 % de chance pour une recrue, dans le premier emplacement de ceinture.
assert.equal(reference.startingEquipmentGeneration.potion_chance,0.05);
let seed=11;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});
const stock=generator.createStartingPotionStock(captain);
for(const p of potions){
  const n=stock.filter(item=>item.name===p.nom).length;
  assert.ok(n>=1&&n<=6,`${p.nom} : ${n}`);
}
for(const item of stock) assert.deepEqual([item.itemType,item.slot,item.category,item.owner,item.tier,item.qualityCode],["potion",null,"Potion",null,1,null]);
assert.equal(new Set(stock.map(item=>item.id)).size,stock.length,"un identifiant par fiole");
let carried=0;
for(let i=0;i<400;i++){
  const m=generator.createMercenary({id:100+i,captain});
  const id=m.equipment.slots.belt_item_1;
  if(!id) continue;
  carried++;
  assert.equal(m.items.find(item=>item.id===id).itemType,"potion");
}
assert.ok(carried>5&&carried<45,`environ 5 % à la création : ${carried} / 400`);

// Campagne : au stock de départ ; une partie commencée avant les reçoit aussi.
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference});
const state=rules.createCampaign({captain,squad:[]});
assert.ok(state.company.stock.some(item=>item.itemType==="potion"));
assert.equal(state.company.startingPotions,true);
const old=rules.createCampaign({captain,squad:[]});
old.company.stock=old.company.stock.filter(item=>item.itemType!=="potion");
delete old.company.startingPotions;
assert.equal(rules.ensureStartingStock(old),true);
assert.equal(old.company.stock.filter(item=>item.itemType==="potion").length>=3,true,"partie commencée avant : les fioles arrivent");

// Échanges : les 4 poches de ceinture ne prennent que des fioles, données et reprises librement (ni jet, ni affinité,
// ni limite par jour, ni historique).
const deals=createEquipmentDeals({reference,random:()=>0.99,affinityRules:{memberAffinity:()=>({total:-100})}});
assert.equal(deals.slotAccepts({},"belt_item_1",{itemType:"potion"}).ok,true);
assert.equal(deals.slotAccepts({},"belt_item_4",{itemType:"potion"}).ok,true);
assert.equal(deals.slotAccepts({},"belt_item_1",{itemType:"ring"}).ok,false);
assert.equal(deals.slotAccepts({},"belt",{itemType:"potion"}).ok,false);
const merc=generator.createMercenary({id:900,captain});
merc.equipment.slots.belt_item_1=null;
merc.items=merc.items.filter(item=>item.itemType!=="potion");
const camp={day:4,company:{captainId:1,roster:[merc],stock:stock.map(item=>({...item}))},expeditions:[]};
merc.equipmentDealDay=4;
assert.equal(deals.canDeal(camp,merc).ok,false,"déjà parlé d'équipement aujourd'hui");
assert.equal(deals.canDeal(camp,merc,"belt_item_2").ok,true,"une fiole : pas de limite par jour");
const heal=camp.company.stock.find(item=>item.name==="Potion de soins");
const given=deals.propose(camp,{mercenaryId:merc.id,slot:"belt_item_2",stockItemId:heal.id});
assert.deepEqual([given.ok,given.free,given.accepted,given.roll],[true,true,true,null]);
assert.equal(merc.items.find(item=>item.id===merc.equipment.slots.belt_item_2).name,"Potion de soins");
assert.ok(!(merc.history?.log||[]).some(h=>h.kind==="deal"),"pas d'historique pour une fiole");
assert.equal(merc.affinityAcquired,undefined);
const back=deals.propose(camp,{mercenaryId:merc.id,slot:"belt_item_2"});
assert.deepEqual([back.action,back.free,back.accepted],["retirer",true,true]);
assert.equal(merc.equipment.slots.belt_item_2,null);
assert.ok(camp.company.stock.some(item=>item.id===heal.id&&item.owner===null));
assert.deepEqual(deals.compatibleSlots(merc,heal).map(s=>s.slot),["belt_item_1","belt_item_2","belt_item_3","belt_item_4"]);

// Valeur cachée (Idan : « je te laisse faire ») : le prix de base, sans tier ni qualité.
const values=createItemValues({reference});
assert.deepEqual(potions.map(p=>values.value({itemType:"potion",name:p.nom,tier:1,qualityCode:null})),[25,25,20]);

// Carte d'objet : l'effet, sans tier ni qualité.
const cards=createItemCards({reference});
const card=cards.card({itemType:"potion",name:"Fiole de poison",tier:1});
assert.deepEqual([card.kind,card.effect,card.turns,card.poison],["potion","poison_arme",3,10]);
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","item-card-ui.js"),"utf8");
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const {renderItemCard}=new Function("game","esc","MercenairesItemCard","equipmentArt","document",ui+"\nreturn {renderItemCard};")(
  {referenceData:reference},esc,{createItemCards},()=>null,undefined);
const html=renderItemCard({itemType:"potion",name:"Potion de soins",tier:1});
assert.match(html,/\+20 % des PV max/);
assert.match(html,/Action rapide en combat, sur soi/);
assert.match(html,/Usage unique/);
assert.doesNotMatch(html,/T1 ·/);
assert.match(renderItemCard({itemType:"potion",name:"Fiole de poison",tier:1}),/corps à corps et tir/);

// Écrans : l'onglet Potions de l'Intendance, la table chargée par le jeu.
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","quartermaster-ui.js"),"utf8"),/\["potion","Potions"\]/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8"),/potions: "potions\.json"/);

console.log("Potions et fioles : données, génération, stock, échanges libres, valeur, carte — OK");
