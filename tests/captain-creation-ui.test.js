"use strict";

// Création du capitaine (Idan, 2026-11-12/13) : la page creation-capitaine.html, ouverte par le jeu dans #creation-wizard,
// lit les données par window.captainCreationBridge (intro-ui.js) et rend ses réponses au jeu.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ROOT=path.resolve(__dirname,"..");
const WEB=path.join(ROOT,"prototype-web");
const read=f=>fs.readFileSync(path.join(WEB,f),"utf8");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const Avatars=require("../game-core/avatars.js");
const Creation=require("../game-core/creation.js");

const source=read("reference-data.js");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const generator=createGenerator(reference,{random:()=>.5,nameGenerator:(p,id)=>p+" "+id});

// --- Le pont du jeu (intro-ui.js) --------------------------------------------------------------------------------------
const catalog=[
  {id:"nain-h1",people:"Nain",sex:"homme",full:"/a/h1.jpg",portrait:"/a/h1_sq.jpg",tags:{culture:["Nains des montagnes"],weapon:["Arc"]}},
  {id:"nain-h2",people:"Nain",sex:"homme",full:"/a/h2.jpg",portrait:"/a/h2_sq.jpg",tags:{weapon:["Hache de guerre"],profile:["melee"]}},
  {id:"nain-f1",people:"Nain",sex:"femme",full:"/a/f1.jpg",portrait:"/a/f1_sq.jpg",tags:{}},
  {id:"nain-troll",people:"Nain",sex:"homme",full:"/a/t.jpg",portrait:"/a/t_sq.jpg",tags:{ascendance:["Sang de troll"]},ascendanceOnly:true},
  {id:"nain-u",people:"Nain",full:"/a/u.jpg",portrait:"/a/u_sq.jpg",tags:{}},
  {id:"orc-h",people:"Orc",sex:"homme",full:"/a/o.jpg",portrait:"/a/o_sq.jpg",tags:{}}
];
const game={referenceData:{...reference,avatars:{rows:catalog}}};
const win={};
const pictoJs=read("picto-ui.js");
const pictoSlug=new Function(pictoJs+"\nreturn pictoSlug;")();
const ui=new Function("game","window","peopleNames","culturesForPeople","originsForCulture","compatibleAscendances","pictoSlug",
  "MercenairesCreation","MercenairesAvatars","mercenaryAvatarUrl","backToMenu","esc",
  read("intro-ui.js")+"\nreturn {captainCreationData,captainCreationPortraits,captainCreation,renderAlignmentWheel};")(
  game,win,()=>generator.people(),p=>generator.culturesForPeople(p),c=>generator.originsForCulture(c),
  p=>generator.compatibleAncestries(p).map(x=>x.name),pictoSlug,Creation,Avatars,(m,kind)=>kind==="full"?m.avatar.full:m.avatar.portrait,
  ()=>{},s=>String(s));
assert.deepEqual(Object.keys(win.captainCreationBridge).sort(),["data","exit","finish","portraits","voice"]);

const data=ui.captainCreationData();
assert.equal(data.peoples.length,10);
for(const p of data.peoples){
  assert.ok(fs.existsSync(path.join(WEB,p.img)),"médaillon "+p.img);
  assert.ok(p.copy.d&&p.cultures.length,p.nom);
  for(const c of p.cultures){
    assert.ok(fs.existsSync(path.join(WEB,c.img)),"médaillon "+c.img);
    assert.ok(c.origins.length,c.nom);
    assert.ok(reference.alignments.rows.some(a=>a.nom===c.alignment),"alignement usuel de "+c.nom);
  }
  for(const a of p.ascendances) assert.ok(fs.existsSync(path.join(WEB,"assets/pictos/ascendance-"+pictoSlug(a)+".webp")),a);
}
assert.equal(data.peoples.find(p=>p.nom==="Elfe").cultures.find(c=>c.nom==="Elfes noirs").alignment,"Chaotique mauvais","exception de la culture");
assert.equal(data.peoples.find(p=>p.nom==="Elfe").cultures.find(c=>c.nom==="Elfes sylvains").alignment,"Loyal bon","alignement du peuple");
assert.ok(!data.weapons.some(w=>w.famille==="Boucliers"),"pas de bouclier comme arme favorite");
assert.equal(data.weapons.length,reference.weapons.rows.filter(w=>!/^Boucliers/.test(w.domaine)).length);
assert.deepEqual([data.outfits.length,data.spirits.length,data.characters.length],[4,10,6]);
assert.deepEqual(data.grid.flat().sort(),reference.alignments.rows.map(a=>a.nom).sort());

// Portraits : même peuple, même sexe (ou sans sexe), « Ascendance only » réservé ; l'arme favorite d'abord.
const ids=q=>ui.captainCreationPortraits({people:"Nain",culture:"Nains des montagnes",...q}).map(a=>a.id);
assert.deepEqual(ids({sex:"M",weapon:"Hache de guerre"}),["nain-h2","nain-h1","nain-u"]);
assert.deepEqual(ids({sex:"F"}),["nain-f1","nain-u"]);
assert.ok(ids({sex:"M",ascendance:"Sang de troll"}).includes("nain-troll"));
assert.ok(!ids({sex:"M"}).includes("nain-troll"),"« Ascendance only » : seulement pour son ascendance");
assert.deepEqual(ui.captainCreationPortraits({people:"Nain",sex:"M"})[0],{id:"nain-h1",portrait:"/a/h1_sq.jpg",full:"/a/h1.jpg"});
assert.equal(Avatars.captainPortraitsRanked(Array.from({length:30},(_,i)=>({id:"n"+i,people:"Nain",full:"f",portrait:"p",tags:{}})),{people:"Nain"}).length,12);

// Réponses → règles (game-core/creation.js) : les indices des phrases de captain-creation-copy.json.
const copy=reference.captainCreationCopy;
assert.deepEqual(Creation.captainChoices(copy,{weapon:"Arc",outfit:3,spirit:1,character:1}),{weapon:"Arc",armorPorts:3,school:"Feu",stat:"Perception"});
assert.deepEqual(Creation.captainChoices(copy,{outfit:0,spirit:9,character:5}),{armorPorts:0,noMagic:true,stat:"Dextérité"});
assert.deepEqual(copy.characters.map(c=>c.carac),["Vitesse","Perception","Courage","Intelligence","Force","Dextérité"]);

// La roue des alignements reste celle de la fiche du mercenaire (lecture seule).
assert.match(ui.renderAlignmentWheel(["Neutre"],"Neutre",{interactive:false}),/role="img"/);

// --- La page --------------------------------------------------------------------------------------------------------------
const page=read("creation-capitaine.js"),css=read("creation-capitaine.css"),html=read("creation-capitaine.html");
const steps=[...page.slice(page.indexOf("const STEPS=["),page.indexOf("];",page.indexOf("const STEPS=["))).matchAll(/key:"(\w+)"/g)].map(m=>m[1]);
assert.deepEqual(steps,["name","people","culture","origin","ascendance","weapon","armor","spirit","trait","avatar","alignment","company","recap"]);
assert.match(html,/<script src="creation-capitaine\.js"><\/script>/);
assert.match(html,/<link rel="stylesheet" href="creation-capitaine\.css">/);
// Chaque fichier cité par la page existe (images, ornements, blasons, voix).
for(const ref of new Set([...(page+css).matchAll(/assets\/creation\/[\w./-]+\.(?:webp|svg|mp3)/g)].map(m=>m[0]))) assert.ok(fs.existsSync(path.join(WEB,ref)),ref);
for(let n=1;n<=10;n++) assert.ok(fs.existsSync(path.join(WEB,`assets/creation/voix/cruxor-${n}.mp3`)));
for(let n=1;n<=60;n++) for(const dir of ["blasons","blasons-hd"]) assert.ok(fs.existsSync(path.join(WEB,`assets/creation/${dir}/b${String(n).padStart(2,"0")}.webp`)));
// Aucune adresse d'image entre guillemets dans un attribut style="…" (elle le couperait).
assert.match(page,/const imageCss=url=>url\?`url\('/);
// Le jeu : un hôte vide, plus l'ancien assistant.
const index=read("index.html");
assert.match(index,/<section id="creation-wizard" class="creation-host hidden" aria-label="Création du capitaine"><\/section>/);
assert.doesNotMatch(index,/wizard-body|wizard-next-btn/);
assert.doesNotMatch(read("styles.css"),/\.wizard-|\.avatar-sex-btn|\.captain-avatar/);

// Portraits des mercenaires et contrôle du Design Lab (game-core/avatars.js) : inchangés.
{
  const rows=[
    {id:"orc-sang-h",people:"Orc",full:"a.webp",portrait:"a.webp",sex:"homme",tags:{ascendance:["Sang d’humain"]}},
    {id:"orc-troll",people:"Orc",full:"b.webp",portrait:"b.webp",sex:"homme",tags:{ascendance:["Sang de troll"]},ascendanceOnly:true},
    {id:"orc",people:"Orc",full:"c.webp",portrait:"c.webp",sex:"homme",tags:{}}
  ];
  const trolls=[1,2,3].map(k=>({id:"troll-"+k,people:"Orc",full:"t.webp",portrait:"t.webp",sex:"homme",tags:{ascendance:["Sang de troll"]},ascendanceOnly:true}));
  const all=[...rows,...trolls,{id:"orc-f",people:"Orc",full:"f.webp",portrait:"f.webp",sex:"femme",tags:{culture:["Orcs noirs"]}},
    {id:"orc-f2",people:"Orc",full:"g.webp",portrait:"g.webp",sex:"femme",tags:{culture:["Orcs des villes"]}}];
  const choose=(ascendance,sex)=>Avatars.captainPortraits(all,{people:"Orc",culture:"Orcs noirs",ascendance,sex});
  const trollMen=choose("Sang de troll","homme");
  assert.deepEqual([trollMen.portraits.map(a=>a.id),trollMen.own,trollMen.added],[["orc-troll","troll-1","troll-2","troll-3"],4,0]);
  assert.deepEqual(choose("Sang de troll","femme").portraits.map(a=>a.id),["orc-f"]);
  assert.deepEqual(Avatars.captainCoverage(all,{people:"Orc",culture:"Orcs noirs",ascendances:[null,"Sang de troll"]}),[
    {ascendance:null,sex:"homme",count:2,missing:1},{ascendance:null,sex:"femme",count:1,missing:2},
    {ascendance:"Sang de troll",sex:"homme",count:4,missing:0},{ascendance:"Sang de troll",sex:"femme",count:0,missing:3}]);
}

console.log("captain creation ui ok");
