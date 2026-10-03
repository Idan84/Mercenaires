"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createBiographyRules,mercenaryTags,scorePack,fillText,SCORE}=require("../game-core/biography.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const catalog=read("biographies.json").rows;

// Un mercenaire minimal, dans la forme produite par le générateur.
const merc=(extra={})=>({
  id:1,name:"Morga 12",people:"Orc",culture:"Orcs noirs",origin:"Soldat / Guerrier / Combattant",alignment:"Chaotique mauvais",
  stats:{Force:80,Endurance:75,Courage:20,Vitesse:15,Intelligence:40,Charisme:35},
  skills:{magic:{Feu:12,Vie:30}},
  equipment:{profile:{type:"melee"}},
  weaponPreferences:{twoHands:{weapon:"Hache de guerre",category:"Haches"}},
  biography:null,
  ...extra
});
const pack=(id,tags={},extra={})=>({id,short:"Texte "+id,rumor:"",motto:"",tags,gender:"any",weight:1,...extra});

// Tags calculés : rien d'inventé, tout vient du mercenaire.
const tags=mercenaryTags(merc());
assert.equal(tags.people,"orc");
assert.equal(tags.origin,"soldat / guerrier / combattant");
assert.equal(tags.profile,"melee");
assert.deepEqual(tags.high,["force","endurance"]);
assert.deepEqual(tags.low,["courage","vitesse"]);
assert.deepEqual(tags.magic,["vie"]);
assert.deepEqual(tags.weapon,["hache de guerre","haches"]);
assert.equal(tags.gender,null);

// Contraintes dures : peuple et genre.
assert.equal(scorePack(pack("a",{people:["Nain"]}),tags),null,"autre peuple : exclu");
assert.equal(scorePack(pack("b",{people:["Nain","Orc"]}),tags),0,"un des peuples listés : accepté");
assert.equal(scorePack(pack("c",{},{gender:"femme"}),tags),null,"bio genrée exclue tant que le sexe est inconnu");
assert.equal(scorePack(pack("d",{},{gender:"femme"}),mercenaryTags(merc({sex:"femme"}))),0);

// Score souple : poids de Chatty, accents et casse ignorés.
assert.equal(scorePack(pack("e",{origin:["Soldat / Guerrier / Combattant"]}),tags),SCORE.origin);
assert.equal(scorePack(pack("f",{profile:["melee"],high:["Force"],low:["Courage"]}),tags),SCORE.profile+SCORE.high+SCORE.low);
assert.equal(scorePack(pack("g",{culture:["orcs NOIRS"],magic:["Vie"],weapon:["Haches"],alignment:["chaotique mauvais"]}),tags),
  SCORE.culture+SCORE.magic+SCORE.weapon+SCORE.alignment);
assert.equal(scorePack(pack("h",{high:["Intelligence"]}),tags),0,"tag non trouvé : 0, mais la bio reste candidate");

// Texte : {nom} sans le numéro du prototype, variantes genrées.
assert.equal(fillText("{nom} court. {Il|Elle} revient.",merc()),"Morga court. Il revient.");
assert.equal(fillText("{nom} court. {Il|Elle} revient.",merc({sex:"femme"})),"Morga court. Elle revient.");

// Choix : la meilleure correspondance l'emporte malgré le bruit (0 à 5).
const rules=createBiographyRules({catalog:[pack("generique"),pack("soldat",{origin:["Soldat / Guerrier / Combattant"]}),pack("nain",{people:["Nain"]})],random:()=>0.999});
const m=merc();
const bio=rules.assign(m,new Set());
assert.equal(bio.id,"soldat");
assert.deepEqual(Object.keys(m.biography),["id","short","rumor","motto"],"contenu figé sur le mercenaire");
assert.equal(rules.assign(m,new Set()).id,"soldat","une bio déjà attribuée ne change plus");

// Unicité : une bio n'est jamais réutilisée ; sans candidate restante, pas de bio.
const used=new Set();
const first=rules.assign(merc({id:2}),used), second=rules.assign(merc({id:3}),used), third=rules.assign(merc({id:4}),used);
assert.equal(first.id,"soldat");
assert.equal(second.id,"generique");
assert.equal(third,null,"le pack Nain ne convient pas à un Orc, les autres sont pris");
assert.deepEqual([...used],["soldat","generique"]);

// Catalogue réel : chaque pack est valide et tous ses tags existent dans les référentiels.
const known={
  people:new Set(read("peoples.json").rows.map(r=>r.nom)),
  culture:new Set(read("cultures.json").rows.map(r=>r.nom)),
  origin:new Set(read("social-origins.json").rows.map(r=>r.nom)),
  alignment:new Set(read("alignments.json").rows.map(r=>r.nom)),
  profile:new Set(["melee","ranged","magic"]),
  high:new Set(read("characteristics.json").rows.map(r=>r.nom)),
  low:new Set(read("characteristics.json").rows.map(r=>r.nom)),
  magic:new Set(read("skills.json").rows.filter(r=>r.domaine==="Magie").map(r=>r.nom))
};
const ids=new Set();
for(const p of catalog){
  assert.ok(p.id&&p.short,"pack incomplet : "+JSON.stringify(p).slice(0,80));
  assert.ok(!ids.has(p.id),"identifiant en double : "+p.id); ids.add(p.id);
  assert.ok(["any","homme","femme"].includes(p.gender),p.id+" : genre inconnu");
  for(const [key,values] of Object.entries(p.tags)){
    if(!known[key]) continue;
    for(const v of values) assert.ok(known[key].has(v),p.id+" : tag inconnu "+key+":"+v);
  }
  for(const text of [p.short,p.rumor,p.motto]) assert.ok(!/\{(?!nom\})[^|}]*\}/.test(text),p.id+" : variable inconnue dans « "+text+" »");
}
assert.equal(catalog.length,read("biographies.json").row_count);

// Une compagnie générée : bios toutes différentes.
const {createGenerator}=require("../game-core/mercenary-generator.js");
const files={peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",baseArmors:"base-armors.json",itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json"};
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,read(f)]));
const generator=createGenerator(reference,{random:(()=>{let s=7;return()=>{s=(s*16807)%2147483647;return s/2147483647;};})(),nameGenerator:(p,i)=>p+" "+i});
const real=createBiographyRules({catalog});
const company=new Set(),given=[];
for(let i=1;i<=40;i++){ const b=real.assign(generator.createMercenary({id:i}),company); if(b) given.push(b.id); }
assert.equal(new Set(given).size,given.length,"aucune bio en double dans la compagnie");
assert.ok(given.length>=5,"le catalogue d'exemple sert au moins à quelques mercenaires");

// Campagne : bios attribuées à la création et à l'arrivée en Taverne, jamais réutilisées, conservées par la sauvegarde.
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules,serializeCampaign,restoreCampaign}=require("../game-core/campaign.js");
const tavernRules=createTavernRules({reference,random:()=>0.999});
const campaignRules=createCampaignRules({generator,tavern:tavernRules,reference,biographies:createBiographyRules({catalog})});
const captain=generator.createCaptain({id:1});
const state=campaignRules.createCampaign({captain,squad:[2,3,4].map(id=>generator.createMercenary({id,captain}))});
const bios=[...state.company.roster,...state.tavern.candidates.map(c=>c.mercenary)].map(m=>m.biography?.id).filter(Boolean);
assert.ok(bios.length>0);
assert.equal(new Set(bios).size,bios.length,"bios uniques dans la partie");
assert.deepEqual([...state.biographiesUsed].sort(),[...bios].sort());
const reloaded=restoreCampaign(serializeCampaign(state)).state;
assert.deepEqual(reloaded.company.roster.map(m=>m.biography),state.company.roster.map(m=>m.biography),"bios figées dans la sauvegarde");
// Une partie antérieure aux bios est complétée au chargement.
for(const m of reloaded.company.roster) m.biography=null;
delete reloaded.biographiesUsed;
campaignRules.ensureBiographies(reloaded);
assert.ok(reloaded.company.roster.some(m=>m.biography?.id));
const after=[...reloaded.company.roster,...reloaded.tavern.candidates.map(c=>c.mercenary)].map(m=>m.biography?.id).filter(Boolean);
assert.equal(new Set(after).size,after.length,"toujours uniques après complément");

console.log(JSON.stringify({ok:true,packs:catalog.length,attribuees:given.length+"/40"},null,2));
