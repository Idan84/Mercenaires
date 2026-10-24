"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createMissionEndRules}=require("../game-core/mission-end.js");

const ROOT=path.resolve(__dirname,"..");
const reference={
  formulaConstants:JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference","formula-constants.json"),"utf8"))
};

// Suite de tirages imposés (valeurs de random() dans [0,1[), puis répétition du dernier.
function scripted(values){ let i=0; return ()=>values[Math.min(i++,values.length-1)]; }
const roll=n=>(n-0.5)/100; // random() qui donne exactement ce d100
const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<0.05,label+" : "+actual+" ≠ "+expected);

const rules=createMissionEndRules({reference,random:()=>0.5});
const merc=(hp,extra={})=>({id:1,name:"Test",hp,pvMax:100,damageTaken:0,stats:{Endurance:50,"Volonté":40},...extra});

// Toutes les constantes viennent des données de référence (aucune valeur de repli utilisée).
const codes=reference.formulaConstants.rows.map(r=>r.code).filter(c=>c.startsWith("mission."));
assert.equal(codes.length,21);
assert.equal(Object.keys(rules.constants).length,21);

// §3 — Jet de mort (formule validée) : à -10 % des PV max, la base vaut 100 %, moins Volonté / 20.
assert.equal(rules.deathChance(merc(0)),null);
assert.equal(rules.deathChance(merc(5)),null);
assert.equal(rules.deathChance(merc(-10)),98);
assert.equal(rules.deathChance(merc(-1,{stats:{"Volonté":100}})),5);
assert.equal(rules.deathChance(merc(-1,{stats:{"Volonté":400}})),0);
// Défaite d'un contrat « Faire le ménage » (doc 17 §8) : probabilité doublée, bornée à 100 %.
assert.equal(rules.deathChance(merc(-1,{stats:{"Volonté":100}}),2),10);
assert.equal(rules.deathChance(merc(-10),2),100);
const doubled=createMissionEndRules({reference,random:scripted([roll(15)])}).resolveMissionEnd([merc(-1,{stats:{"Volonté":100}})],{deathMultiplier:2});
assert.deepEqual([doubled.results[0].death.p,doubled.results[0].dead],[10,false],"15 > 10 % : il fait le mort et s'échappe");
assert.equal(rules.deathChance(merc(-50)),100);

// §4 — Jet de blessure entre 0 et 50 % PV (zone portée de 20 à 50 % par Idan ; courbe Chatty, Endurance 50).
for(const [hp,expected] of [[50,26.67],[37.5,42.92],[25,59.17],[12.5,75.42],[0,91.67]]){
  near(rules.woundChance(merc(hp)),expected,"P_Blessure à "+hp+" % PV");
}
assert.equal(rules.woundChance(merc(51)),null,"au-dessus de 50 % PV : pas de jet");
assert.equal(rules.woundChance(merc(-1)),null,"sous 0 PV : jet de mort, pas de jet de blessure");
assert.equal(rules.woundChance(merc(50,{stats:{Endurance:120}})),20,"plancher");
assert.equal(rules.woundChance(merc(0,{stats:{Endurance:0}})),95,"plafond");

// §6 — Gravité (exemples Chatty) et durée de blessure : 7 jours + 1 jour par point de gravité, de 7 à 60 jours
// (Idan, 2026-10-03), Endurance 50, sans bonus médical.
for(const [hp,expected] of [[20,0],[10,25],[0,50],[-10,75],[-20,100],[-35,100],[40,0]]){
  assert.equal(rules.woundSeverity(merc(hp)),expected,"gravité à "+hp+" % PV");
}
for(const [hp,days] of [[20,7],[10,27],[0,48],[-10,60],[-20,60]]) assert.equal(rules.woundDays(merc(hp)),days,"durée à "+hp+" % PV");
assert.equal(rules.woundDays(merc(-10,{stats:{Endurance:0}})),60,"plafond de 60 jours");
assert.equal(rules.woundDays(merc(0),{campCareFactor:0.5}),24,"un camp soignant raccourcit la convalescence");
assert.equal(rules.woundDays(merc(20,{stats:{Endurance:300}})),7,"au moins 7 jours");

// §5 — Fatigue : durée selon les dégâts cumulés, base portée à 5 jours (Idan, 2026-10-03), Endurance 50.
for(const [taken,days] of [[0,5],[50,6],[100,7],[200,7],[1000,7]]){
  assert.equal(rules.fatigueDays(merc(100,{damageTaken:taken})),days,"fatigue après "+taken+" PV encaissés");
}
assert.equal(rules.fatigueDays(merc(100,{stats:{Endurance:400}})),1,"au moins 1 jour");

// §7 — Chaîne de résolution.
const chain=values=>createMissionEndRules({reference,random:scripted(values)});

// Sous 0 PV, jet de mort raté : mort, rien d'autre.
let r=chain([roll(98)]).resolveParticipant(merc(-10));
assert.equal(r.outcome,"dead");
assert.deepEqual(r.death,{p:98,roll:98});
assert.equal(r.wound,null);
assert.equal(r.fatigueDays,null);

// Sous 0 PV, survit : blessure automatique, sans compteur Fatigue.
r=chain([roll(99)]).resolveParticipant(merc(-10,{damageTaken:150}));
assert.equal(r.outcome,"wounded");
assert.equal(r.dead,false);
assert.deepEqual(r.wound,{automatic:true});
assert.equal(r.severity,75);
assert.equal(r.woundDays,60);
assert.equal(r.fatigueDays,null);

// Zone critique, jet de blessure réussi puis raté.
r=chain([roll(59)]).resolveParticipant(merc(10));
assert.equal(r.outcome,"wounded");
assert.equal(r.wound.automatic,false);
assert.equal(r.woundDays,27);
r=chain([roll(79)]).resolveParticipant(merc(10,{damageTaken:100}));
assert.equal(r.outcome,"fatigued");
assert.equal(r.wounded,false);
assert.equal(r.fatigueDays,7);

// Au-dessus de 50 % PV : aucun jet, fatigue automatique.
let draws=0;
const counting=createMissionEndRules({reference,random:()=>{ draws++; return 0; }});
r=counting.resolveParticipant(merc(80,{damageTaken:20,offMap:true}));
assert.equal(draws,0);
assert.equal(r.outcome,"fatigued");
assert.equal(r.fatigueDays,5);
assert.equal(r.offMap,true);
assert.equal(r.death,null);
assert.equal(r.wound,null);

// Mort du capitaine signalée (Game Over en campagne).
const team=[merc(-5,{id:1,isCaptain:true}),merc(50,{id:2})];
assert.equal(chain([roll(1)]).resolveMissionEnd(team).captainDead,true);
assert.equal(chain([roll(100)]).resolveMissionEnd(team).captainDead,false);
const outcomes=chain([roll(100)]).resolveMissionEnd(team).results.map(x=>x.outcome);
assert.deepEqual(outcomes,["wounded","fatigued"]);

console.log(JSON.stringify({ok:true},null,2));
