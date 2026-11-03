"use strict";

// Ports d'armure (Idan, 2026-11-03 : « le mercenaire ne devrait pas pouvoir l'équiper du tout. C'est un oubli dans le
// code ») : sans le port de son type, pas d'armure (légère ⇐ intermédiaire ⇐ lourde) ; les Vêtements ne demandent rien.
// Une ancienne partie : l'armure portée sans son port retourne dans l'inventaire.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createArmorPorts}=require("../game-core/armor-ports.js");
const {createEquipmentDeals}=require("../game-core/equipment-deals.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));

const ports=createArmorPorts(reference);
const armor=(name,id=name)=>{
  const row=reference.baseArmors.rows.find(r=>r.nom===name);
  return {id,name,tier:1,itemType:"armor",templateId:"armor:"+row.code,owner:null,slot:null};
};
assert.deepEqual(["Vêtements","Gambison","Cotte de mailles","Armure de plates"].map(n=>ports.armorClass(armor(n))),["Vêtement","Légère","Intermédiaire","Lourde"]);
assert.equal(ports.armorClass({itemType:"weapon",name:"Sabre"}),null);
const merc=(...known)=>({id:2,name:"Borin",stats:{Intelligence:50},skills:{martial:Object.fromEntries(known.map(type=>["Port d’armure "+type,true]))},
  items:[],equipment:{slots:{armor:null,weapon_set_1_main:null}}});
assert.deepEqual([merc().skills.martial,ports.portLevel(merc()),ports.portLevel(merc("légère")),ports.portLevel(merc("lourde"))],[{},0,1,3]);

// L'emplacement d'armure refuse ce qu'il ne sait pas porter ; l'inventaire garde tout.
const deals=createEquipmentDeals({reference,random:()=>0});
const none=merc(),light=merc("légère"),heavy=merc("lourde");
assert.deepEqual(deals.slotAccepts(none,"armor",armor("Vêtements")),{ok:true},"les Vêtements ne demandent rien");
assert.deepEqual(deals.slotAccepts(none,"armor",armor("Gambison")),{ok:false,reason:"Il ne sait pas porter une armure légère."});
assert.deepEqual(deals.slotAccepts(light,"armor",armor("Gambison")),{ok:true});
assert.deepEqual(deals.slotAccepts(light,"armor",armor("Cotte de mailles")),{ok:false,reason:"Il ne sait pas porter une armure intermédiaire."});
assert.deepEqual(deals.slotAccepts(light,"armor",armor("Armure de plates")),{ok:false,reason:"Il ne sait pas porter une armure lourde."});
assert.deepEqual(["Gambison","Cotte de mailles","Armure de plates"].map(n=>deals.slotAccepts(heavy,"armor",armor(n)).ok),[true,true,true],"le port lourd vaut les deux autres");
assert.deepEqual(deals.slotAccepts(none,"inventory",armor("Armure de plates")),{ok:true});
assert.deepEqual(deals.compatibleSlots(none,armor("Armure de plates")).map(s=>s.slot),[],"l'Intendance ne la lui propose pas");
// Ses propres objets : pas d'armure de son inventaire sans le port.
const own=armor("Cotte de mailles","own");
light.items.push({...own,owner:2});
const state={day:3,company:{captainId:1,roster:[light]},expeditions:[]};
assert.equal(deals.rearrange(state,{mercenaryId:2,itemId:"own",slot:"armor"}).reason,"Il ne sait pas porter une armure intermédiaire.");
assert.equal(light.equipment.slots.armor,null);
assert.deepEqual(deals.placeOptions(light,light.items[0]).map(o=>o.slot),[]);
// Une proposition de l'Intendance passe par le même contrôle.
state.company.stock=[armor("Armure de plates","stock")];
assert.equal(deals.evaluate(state,{mercenaryId:2,slot:"armor",stockItemId:"stock"}).ok,false);

// Les recrues et le capitaine partent avec une armure qu'ils savent porter.
let seed=9;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});
const squad=[];
for(let id=2;id<150;id++) squad.push(generator.createMercenary({id,captain}));
for(const m of [captain,...squad]){
  const worn=(m.items||[]).find(x=>x.id===m.equipment.slots.armor);
  if(worn) assert.ok(ports.canWear(m,worn).ok,`${m.name} : ${worn.name}`);
}

// Ancienne partie : l'armure portée sans son port retourne dans son inventaire, une seule fois.
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference});
const game=rules.createCampaign({captain,squad:squad.slice(0,3)});
const victim=game.company.roster[1];
for(const type of ["légère","intermédiaire","lourde"]) delete victim.skills.martial["Port d’armure "+type];
const plates={...armor("Armure de plates","old-plates"),owner:victim.id,slot:"armor"};
victim.items.push(plates);
victim.equipment.slots.armor=plates.id;
assert.equal(rules.ensureArmorPorts(game),true);
assert.deepEqual([victim.equipment.slots.armor,plates.slot,victim.items.includes(plates)],[null,null,true],"dans son inventaire");
assert.equal(rules.ensureArmorPorts(game),false,"rien à faire la seconde fois");
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","save-ui.js"),"utf8"),/campaignRules\(\)\.ensureArmorPorts\(game\.campaign\)/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8"),/<script src="\/core\/armor-ports\.js"><\/script>[\s\S]*<script src="\/core\/equipment-deals\.js"><\/script>/);

console.log("Ports d'armure : pas d'armure sans son port, l'inventaire la garde, anciennes parties — OK");
