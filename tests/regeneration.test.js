"use strict";

// Régénération (sang de troll ; Idan, 2026-11-01) : environ 2D6 PV par tour en combat selon les points de création,
// bloquée un tour par le feu ; convalescence au camp divisée (÷ 2 à 100) ; elle monte à chaque brûlure.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createRegenerationRules}=require("../game-core/regeneration.js");
const Progression=require("../game-core/progression.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const reference={formulaConstants:read("formula-constants.json"),characteristics:read("characteristics.json"),skills:read("skills.json")};

let queue=[];
const rules=createRegenerationRules({reference,random:()=>queue.length?queue.shift():0.5});
const troll=points=>({name:"Troll",skills:{physiology:{"Régénération":points}}});

// Sans Régénération : rien (ni en combat, ni au camp).
assert.equal(rules.points(troll(0)),0);
assert.equal(rules.points({name:"Humain"}),0);
assert.equal(rules.range(troll(0)),null);
assert.equal(rules.roll(troll(0)),null);
assert.equal(rules.campDays(troll(0),9),9);

// En combat : ceil(2D6 × (0,5 + R / 50)). Lointain ancêtre (≈ 14), lignée proche (≈ 27), bâtard (≈ 35), maximum (100).
assert.deepEqual(rules.range(troll(14)),{min:2,max:10});
assert.deepEqual(rules.range(troll(27)),{min:3,max:13});
assert.deepEqual(rules.range(troll(35)),{min:3,max:15});
assert.deepEqual(rules.range(troll(100)),{min:5,max:30});
queue=[0.5,0.5];
assert.deepEqual(rules.roll(troll(27)),{amount:Math.ceil(8*1.04-1e-9),dice:8},"4 + 4 = 8 × 1,04");
queue=[0,0];
assert.equal(rules.roll(troll(25)).amount,2,"2 × 1,0");

// Au camp : jours / (1 + R / 100), au moins 1 : deux fois moins à 100.
assert.equal(rules.campDays(troll(100),10),5);
assert.equal(rules.campDays(troll(27),10),8,"10 / 1,27 = 7,9");
assert.equal(rules.campDays(troll(100),1),1);
assert.equal(rules.campDays(troll(50),0),0);

// Progression : à chaque brûlure, +120 XP de Régénération (30 avant les deux doublements de l'XP), pour qui en a déjà.
const progression=Progression.createProgressionRules({reference});
const log={wounds:{"Résistance au feu":3,"Résistance physique":2}};
const xpTroll=progression.gains(log,{...troll(20),stats:{},resistances:{}});
assert.deepEqual(xpTroll.skills.physiology,{"Régénération":360});
const xpHuman=progression.gains(log,{name:"Humain",skills:{physiology:{"Régénération":0}},stats:{},resistances:{}});
assert.equal(xpHuman.skills.physiology,undefined,"pas de Régénération : pas de progression");
const mercenary={...troll(20),stats:{},resistances:{},xp:{}};
const changes=progression.apply(mercenary,xpTroll);
assert.ok(mercenary.skills.physiology["Régénération"]>20,"elle monte");
assert.ok(changes.some(c=>c.name==="Régénération"));

// Campagne : la convalescence d'un blessé tient compte de la Régénération.
const campaign=fs.readFileSync(path.join(ROOT,"game-core","campaign.js"),"utf8");
assert.match(campaign,/daysLeft:woundDaysFor\(mercenary,result\.woundDays,state\)/);
assert.match(campaign,/daysLeft:woundDaysFor\(m,back\.days,state\)/);
// Écran de combat : au début de chaque activation ; le feu pose le drapeau « brûlé ».
const mission=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
assert.match(mission,/tickMissionRegeneration\(unit\);\n  tickMissionNaturalRegeneration\(unit\);/);
assert.match(mission,/if\(element==="feu"&&amount>0\) unit\.burned=true;/);
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(html,/<script src="\/core\/regeneration\.js"><\/script>\n  <script src="\/core\/campaign\.js"><\/script>/);

console.log("Régénération : 2D6 × (0,5 + R / 50) par tour, bloquée par le feu, convalescence divisée, progression à chaque brûlure — OK");
