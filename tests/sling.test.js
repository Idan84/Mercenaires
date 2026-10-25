"use strict";

// La fronde se tient à deux mains (Idan, 2026-10-25) : une main la fait tourner, l'autre tient et recharge les pierres.
// Une partie commencée avant peut tenir un objet en main secondaire avec elle : il retourne à l'Intendance.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCombatEngine}=require("../game-core/combat-engine.js");
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
  baseArmors:"base-armors.json",itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",
  startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",
  alignmentGeneration:"alignment-generation.json"
};
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,read(file)]));

const sling=reference.weapons.rows.find(w=>w.nom==="Fronde");
assert.equal(sling.prise,"2 mains");

// Le moteur la tient à deux mains ; l'Intendance refuse un objet en main secondaire avec elle.
const engine=createCombatEngine(reference);
const slinger={character:{stats:{},skills:{},items:[{id:"f",itemType:"weapon",name:"Fronde",tier:1}],
  equipment:{slots:{weapon_set_1_main:"f",weapon_set_1_off:null}}},activeSet:1};
assert.equal(engine.usesTwoHands(slinger,sling),true);
const deals=createEquipmentDeals({reference});
assert.equal(deals.slotAccepts(slinger.character,"weapon_set_1_off",{itemType:"weapon",name:"Dague"}).ok,false);
assert.equal(deals.slotAccepts({equipment:{slots:{weapon_set_1_off:"d"}},items:[{id:"d",name:"Dague"}]},"weapon_set_1_main",
  {itemType:"weapon",name:"Fronde"}).reason,"Arme à deux mains : la main secondaire doit être libre.");

// Partie commencée avant : la dague tenue avec la fronde retourne à l'Intendance, sans propriétaire.
let seed=5;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference});
const captain=generator.createCaptain({id:1});
const merc=generator.createMercenary({id:2,captain});
const state=rules.createCampaign({captain,squad:[merc]});
merc.items=[{id:"f2",itemType:"weapon",name:"Fronde",tier:2,owner:2},{id:"d2",itemType:"weapon",name:"Dague",tier:1,owner:2}];
merc.equipment.slots.weapon_set_1_main="f2";
merc.equipment.slots.weapon_set_1_off="d2";
const stock=state.company.stock.length;
assert.equal(rules.ensureTwoHandedGrips(state),true);
assert.equal(merc.equipment.slots.weapon_set_1_off,null);
assert.deepEqual(merc.items.map(i=>i.name),["Fronde"]);
assert.equal(state.company.stock.length,stock+1);
assert.deepEqual([state.company.stock.at(-1).name,state.company.stock.at(-1).owner],["Dague",null]);
assert.equal(rules.ensureTwoHandedGrips(state),false,"rien à faire la seconde fois");
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","save-ui.js"),"utf8"),/campaignRules\(\)\.ensureTwoHandedGrips\(game\.campaign\)/);

console.log("Fronde : à deux mains, main secondaire libre, parties commencées avant — OK");
