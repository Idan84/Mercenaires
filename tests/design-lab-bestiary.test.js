"use strict";

// Design Lab, onglets Bestiaire et Missions (Idan, 2026-11-01 : « un bestiaire ennemi […] Idem pour les factions […] la
// fiche mission "Faire le ménage", une série de textes avec variables ») : étape 1, lecture seule des données.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const context={};
vm.createContext(context);
for(const file of ["bestiary-lab.js","missions-lab.js"])
  vm.runInContext(fs.readFileSync(path.join(ROOT,"prototype-web/design",file),"utf8"),context);
const {BestiaryLab,MissionsLab}=vm.runInContext("({BestiaryLab,MissionsLab})",context);
const plain=x=>JSON.parse(JSON.stringify(x)); // objets nés dans le contexte vm
const reference={enemyArchetypes:read("enemy-archetypes.json"),summonArchetypes:read("summon-archetypes.json"),
  oneShotMissions:read("one-shot-missions.json"),bodyguardMissions:read("bodyguard-missions.json")};

// Bestiaire : toutes les fiches, rangées par faction puis par ligne, avec les camps qui les tirent.
const built=BestiaryLab.build(reference),bestiary=plain(built);
const enemies=reference.enemyArchetypes.rows;
assert.equal(bestiary.total,enemies.length);
assert.deepEqual(bestiary.factions.map(f=>f.name),[...new Set(enemies.map(e=>e.faction))]);
assert.equal(bestiary.factions.reduce((s,f)=>s+f.lines.reduce((n,l)=>n+l.rows.length,0),0),enemies.length,"aucune fiche perdue");
const goblins=bestiary.factions.find(f=>f.name==="Gobelins");
assert.deepEqual(goblins.lines.find(l=>l.name==="Lancier").rows.map(e=>e.niveau),["novice","normal","vétéran","d’élite"]);
assert.equal(goblins.camps.length,1);
assert.deepEqual([goblins.camps[0].camp,goblins.camps[0].chance,goblins.camps[0].lines.Frondeur],["Camp gobelin","14 %","32 %"]);
// Les créatures partagées (le troll, faction Créatures) : leurs camps, ceux des peuples qui les appellent.
const creatures=bestiary.factions.find(f=>f.name==="Créatures");
assert.deepEqual(creatures.camps.map(c=>c.camp).sort(),["Camp gobelin","Camp homme-bête","Camp orc","Cimetière profané"]);
assert.ok(creatures.camps.filter(c=>c.camp!=="Cimetière profané").every(c=>c.lines.Troll==="9 %"),"le troll : 10 sur 110 dans chaque camp");
assert.equal(creatures.camps.find(c=>c.camp==="Cimetière profané").lines["Troll mort-vivant"],"9 %");
const html=BestiaryLab.render(built);
for(const e of enemies) assert.ok(html.includes("("+e.code+")"),"fiche affichée : "+e.code);
for(const f of bestiary.factions) assert.ok(html.includes(`id="${BestiaryLab.anchor(f.name)}"`));
assert.ok(html.includes("Loup")&&html.includes(`id="${BestiaryLab.anchor("Invocations")}"`),"les invocations ont leur section");
assert.equal(BestiaryLab.nav(bestiary).length,bestiary.factions.length+1);
// Butin et niveau de mission minimum (Idan, 2026-11-01) : colonnes « Dès » et « Butin », le détail au survol.
assert.match(html,/<th title="Niveau de mission minimum">Dès<\/th><th title="[^"]*">Butin<\/th>/);
{
  const tuned=JSON.parse(JSON.stringify(reference)),troll=tuned.enemyArchetypes.rows.find(e=>e.code==="orc_spearman_veteran");
  troll.niveau_mission_min=7;troll.butin={equipement:50,objets:[{type:"potion",nom:"Potion de soins",tier:1,chance:10}]};
  const row=BestiaryLab.render(BestiaryLab.build(tuned)).split("<tr").find(r=>r.includes("(orc_spearman_veteran)"));
  assert.match(row,/title="Mission 2★ argent ou plus">2★ argent<\/td>/);
  assert.match(row,/title="Équipement porté : 50 % par objet\nPotion de soins \(tier 1\) : 10 %">50 % \+1<\/td>/);
}

// Missions : « Faire le ménage » (camps, ordres, variables) et la garde du corps.
const builtMissions=MissionsLab.build(reference),missions=plain(builtMissions);
assert.deepEqual(missions.types.map(t=>t.code),["cleanup","hunt_wolves","hunt_unicorn","bodyguard"]);
// Les chasses (Idan, 2026-11-07) : leurs règles et leurs lettres, sans camp.
assert.deepEqual(missions.types.filter(t=>t.kind==="hunt").map(t=>[t.code,t.orders.length]),[["hunt_wolves",2],["hunt_unicorn",2]]);
assert.match(MissionsLab.render(builtMissions),/3D6 par étoile, au plus 100 · fiche fixe : loup/);
const cleanup=missions.types[0];
assert.deepEqual(cleanup.camps.map(c=>c.faction),reference.oneShotMissions.missions[0].camps.map(c=>c.faction));
assert.equal(cleanup.camps.reduce((s,c)=>s+c.orders.length,0),reference.oneShotMissions.ordres.filter(o=>o.mission==="cleanup").length,"chaque ordre sous son peuple");
const orcChief=code=>{ const a=enemies.find(e=>e.code===code); return {name:a.nom,points:a.points}; };
assert.deepEqual(cleanup.camps.find(c=>c.faction==="Orcs").chiefs,[{metal:"Bronze",list:[orcChief("orc_chief_1")]},
  {metal:"Argent",list:[orcChief("orc_chief_2")]},{metal:"Or",list:[orcChief("orc_chief_3"),orcChief("orc_chief_4")]}],"chef selon le métal");
assert.equal(orcChief("orc_chief_1").name,"Chef de bande orc");
// Toute variable écrite dans un texte est expliquée dans le Lab.
for(const t of missions.types) for(const v of t.variables) assert.ok(MissionsLab.VARIABLES[v],"variable sans explication : {"+v+"}");
const page=MissionsLab.render(builtMissions);
assert.match(page,/<mark class="mis-var" title="Village tiré dans « lieux »">\{lieu\}<\/mark>/);
assert.match(page,/5\s000 \+ 30–40 × budget × niveau \(PO\)/);
assert.match(page,/<b>Or<\/b> \(niveaux 11 à 15\) : niveau² × 8–12 points · vétéran 50 %, d’élite 50 % · chef 3 50 %, chef 4 50 %/);
assert.match(page,/T4 ⌈1D6 × niveau ÷ 5⌉ − 2/);
assert.match(page,/<span class="mis-gender" title="Accord selon le genre">\{rentré\|rentrée\}<\/span>/);

// Page du Lab : deux boutons, deux scripts.
const index=fs.readFileSync(path.join(ROOT,"prototype-web/design/index.html"),"utf8");
assert.match(index,/data-mode="bestiary"[^>]*>Bestiaire</);
assert.match(index,/data-mode="missions"[^>]*>Missions</);
assert.match(index,/<script src="\.\/bestiary-lab\.js"><\/script>\s*<script src="\.\/missions-lab\.js"><\/script>\s*<script src="\.\/design\.js">/);
console.log("Design Lab, Bestiaire et Missions : "+enemies.length+" fiches, "+missions.types.length+" types de mission, variables expliquées — OK");
