"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createAvatarRules,avatarTags,scoreAvatar,SCORE}=require("../game-core/avatars.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const norm=v=>String(v).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[’‘`´]/g,"'").toLowerCase().trim();

// Un mercenaire minimal, dans la forme produite par le générateur.
const merc=(extra={})=>({
  id:1,name:"Brug 3",people:"Ogre",culture:"Ogres des cités humaines",origin:"Soldat / Guerrier / Combattant",alignment:"Neutre",
  ascendance:null,stats:{Force:90,Endurance:80,Courage:30,Vitesse:10},
  skills:{magic:{Feu:40,Eau:10}},
  equipment:{profile:{type:"magic"}},
  weaponPreferences:{twoHands:{weapon:"Marteau de guerre",category:"Armes contondantes"}},
  ...extra
});
const av=(id,extra={})=>({id,people:"Ogre",sex:null,tags:{},full:id+"_full.webp",portrait:id+"_portrait.webp",...extra});

// Tags du mercenaire : rien d'inventé, tout vient du générateur.
const tags=avatarTags(merc());
assert.equal(tags.people,"ogre");
assert.deepEqual(tags.profile,["magic"]);
assert.deepEqual(tags.magic,["feu"]);
assert.ok(tags.weapon.includes("marteau de guerre")&&tags.weapon.includes("armes contondantes"));

// Contraintes dures : peuple, et sexe s'il est déjà connu.
assert.equal(scoreAvatar(av("a",{people:"Halfling"}),tags),null,"autre peuple : exclu");
assert.equal(scoreAvatar(av("b"),tags),0,"même peuple sans tag : candidat");
assert.equal(scoreAvatar(av("c",{sex:"femme"}),avatarTags(merc({sex:"homme"}))),null,"sexe connu et différent : exclu");
assert.equal(scoreAvatar(av("d",{sex:"femme"}),tags),0,"sexe inconnu : l'image décide");

// Score souple : ce qui se voit compte le plus. Casse, accents et apostrophes ignorés.
assert.equal(scoreAvatar(av("e",{tags:{profile:["magic"],magic:["Feu"]}}),tags),SCORE.profile+SCORE.magic);
assert.equal(scoreAvatar(av("f",{tags:{weapon:["armes CONTONDANTES"],culture:["Ogres des cites humaines"]}}),tags),SCORE.weapon+SCORE.culture);
assert.equal(scoreAvatar(av("g",{tags:{magic:["Glace"]}}),tags),0,"tag non retrouvé : 0, l'avatar reste candidat");

// Choix : le meilleur l'emporte malgré le hasard (0 à 5).
const rules=createAvatarRules({catalog:[av("ogre-001"),av("ogre-002",{sex:"femme",tags:{profile:["magic"],magic:["Feu"]}}),av("halfling-001",{people:"Halfling"})],random:()=>0.999});
const m=merc();
assert.equal(rules.assign(m,new Set()).id,"ogre-002");
assert.deepEqual(Object.keys(m.avatar),["id","full","portrait"]);
assert.equal(m.sex,"femme","le sexe vient de l'image");
assert.equal(rules.assign(m,new Set()).id,"ogre-002","un avatar attribué ne change plus");

// Unicité : un visage déjà porté n'est pas redonné ; sans avatar libre, portrait générique.
const used=new Set(["ogre-002"]);
assert.equal(rules.assign(merc({id:2}),used).id,"ogre-001");
const none=merc({id:3});
assert.equal(rules.assign(none,used),null);
assert.equal(none.avatar,undefined);
assert.equal(rules.assign(merc({id:4,people:"Nain"}),new Set()),null,"peuple sans avatar : portrait générique");

// Avatar retiré du catalogue : remplacé au chargement, en gardant le sexe du mercenaire.
const orphan=merc({id:5,sex:"homme",avatar:{id:"ogre-999",full:"x",portrait:"y"}});
assert.equal(rules.assign(orphan,new Set()).id,"ogre-001","ogre-002 est une femme : exclu");

// Catalogue réel : fichiers présents, identifiants uniques, tags tous issus des référentiels.
const catalog=read("avatars.json");
assert.equal(catalog.rows.length,catalog.row_count);
const names=(file,filter=()=>true)=>new Set(read(file).rows.filter(filter).map(r=>norm(r.nom)));
const weapons=read("weapons.json").rows;
const known={
  culture:names("cultures.json"),origin:names("social-origins.json"),alignment:names("alignments.json"),
  ascendance:names("ancestries.json"),magic:names("skills.json",r=>r.domaine==="Magie"),
  profile:new Set(["melee","ranged","magic"]),
  weapon:new Set([...weapons.map(w=>norm(w.nom)),...weapons.map(w=>norm(String(w.domaine).split(",")[0]))])
};
const peoples=names("peoples.json");
const dir=path.join(ROOT,"prototype-web","assets","avatars");
const ids=new Set();
for(const a of catalog.rows){
  assert.ok(!ids.has(a.id),"identifiant en double : "+a.id); ids.add(a.id);
  assert.ok(peoples.has(norm(a.people)),a.id+" : peuple inconnu "+a.people);
  assert.ok([null,"femme","homme"].includes(a.sex),a.id+" : sexe inconnu "+a.sex);
  for(const f of [a.full,a.portrait]) assert.ok(fs.existsSync(path.join(dir,f)),a.id+" : fichier manquant "+f);
  for(const [k,values] of Object.entries(a.tags)){
    assert.ok(known[k],a.id+" : famille de tags inconnue "+k);
    for(const v of values) assert.ok(known[k].has(norm(v)),a.id+" : tag inconnu "+k+":"+v);
  }
}
// Depuis le 2026-10-21, tous les avatars sont sur Hostinger (media/avatars/) : le catalogue Git peut être vide.
const files=fs.existsSync(dir)?fs.readdirSync(dir).sort():[];
assert.deepEqual(files,catalog.rows.flatMap(a=>[a.full,a.portrait]).sort(),"images web en trop ou manquantes");

// Campagne : avatars à la création et dès la Taverne, uniques, libérés au départ, jamais redonnés après la mort.
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createBiographyRules}=require("../game-core/biography.js");
const {createCampaignRules,serializeCampaign,restoreCampaign}=require("../game-core/campaign.js");
const files2={peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",baseArmors:"base-armors.json",itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json"};
const reference=Object.fromEntries(Object.entries(files2).map(([k,f])=>[k,read(f)]));
const seeded=()=>{let s=11;return()=>{s=(s*16807)%2147483647;return s/2147483647;};};
const generator=createGenerator(reference,{random:seeded(),nameGenerator:(p,i)=>p+" "+i});
// Catalogue de test : 30 avatars par peuple, la moitié tagués « femme ».
const testCatalog=[...peoples].flatMap(p=>Array.from({length:30},(_,i)=>av(p+"-"+i,{people:p,sex:i%2?"femme":null})));
const avatarRules=createAvatarRules({catalog:testCatalog,random:seeded()});
const campaign=createCampaignRules({generator,tavern:createTavernRules({reference,random:()=>0.999}),reference,biographies:createBiographyRules({catalog:read("biographies.json").rows}),avatars:avatarRules});
const captain=generator.createCaptain({id:1});
const state=campaign.createCampaign({captain,squad:[2,3,4,5].map(id=>generator.createMercenary({id,captain}))});
const present=()=>[...state.company.roster,...state.tavern.candidates.map(c=>c.mercenary)];
assert.ok(present().every(x=>x.avatar?.id),"compagnie et Taverne : tout le monde a un visage");
assert.equal(new Set(present().map(x=>x.avatar.id)).size,present().length,"jamais deux fois le même visage");
assert.ok(present().every(x=>norm(avatarRules.byId.get(x.avatar.id).people)===norm(x.people)),"même peuple");
for(const x of present()){ const a=avatarRules.byId.get(x.avatar.id); if(a.sex) assert.equal(x.sex,a.sex,"sexe de l'image"); }

// Un candidat qui repart libère son visage.
const leaving=state.tavern.candidates[0];
const freed=leaving.mercenary.avatar.id;
state.tavern.candidates=state.tavern.candidates.slice(1);
const onlyFreed=createAvatarRules({catalog:[testCatalog.find(a=>a.id===freed)]});
const inUseAfterLeave=new Set([...present().map(x=>x.avatar.id),...state.avatarsRetired]);
assert.ok(!inUseAfterLeave.has(freed),"visage libéré au départ du candidat");
assert.equal(onlyFreed.assign(generator.createMercenary({id:99,forcedPeople:leaving.mercenary.people}),inUseAfterLeave)?.id,freed);

// Un mort garde son visage : il n'est plus jamais attribué.
const fallen=state.company.roster.find(x=>x.id!==state.company.captainId);
const fallenAvatar=fallen.avatar.id;
campaign.applyMissionAftermath(state,{results:[{id:fallen.id,dead:true}],captainDead:false});
assert.ok(state.avatarsRetired.includes(fallenAvatar));

// Sauvegarde : avatars conservés ; une partie antérieure aux avatars est complétée au chargement.
const reloaded=restoreCampaign(serializeCampaign(state)).state;
assert.deepEqual(reloaded.company.roster.map(x=>x.avatar),state.company.roster.map(x=>x.avatar));
for(const x of [...reloaded.company.roster,...reloaded.tavern.candidates.map(c=>c.mercenary)]){ delete x.avatar; delete x.sex; }
delete reloaded.avatarsRetired;
assert.equal(campaign.ensureAvatars(reloaded),true,"complément : à sauvegarder");
assert.equal(campaign.ensureAvatars(reloaded),false,"rien de nouveau : pas de sauvegarde inutile");
const again=[...reloaded.company.roster,...reloaded.tavern.candidates.map(c=>c.mercenary)].map(x=>x.avatar.id);
assert.equal(new Set(again).size,again.length);

// Avatars déplacés sur Hostinger (mêmes identifiants, autres fichiers) : mêmes visages, nouveaux fichiers, à sauvegarder.
const moved=createAvatarRules({catalog:testCatalog.map(a=>({...a,full:"/media/avatars/"+a.full,portrait:"/media/avatars/"+a.portrait}))});
const campaignMoved=createCampaignRules({generator,tavern:createTavernRules({reference,random:()=>0.999}),reference,biographies:createBiographyRules({catalog:read("biographies.json").rows}),avatars:moved});
assert.equal(campaignMoved.ensureAvatars(reloaded),true,"fichiers changés : à sauvegarder");
const everyoneMoved=[...reloaded.company.roster,...reloaded.tavern.candidates.map(c=>c.mercenary)];
assert.deepEqual(everyoneMoved.map(x=>x.avatar.id),again,"mêmes visages");
assert.ok(everyoneMoved.every(x=>x.avatar.full.startsWith("/media/avatars/")&&x.avatar.portrait.startsWith("/media/avatars/")));
assert.equal(campaignMoved.ensureAvatars(reloaded),false);

console.log(JSON.stringify({ok:true,avatars:catalog.row_count},null,2));
