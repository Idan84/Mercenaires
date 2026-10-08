"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const P=require("../game-core/progression.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createMissionEndRules}=require("../game-core/mission-end.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules,serializeCampaign,restoreCampaign}=require("../game-core/campaign.js");

const ROOT=path.resolve(__dirname,"..");
const files={peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",baseArmors:"base-armors.json",itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json"};
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const rules=P.createProgressionRules({reference});

// Constantes d'équilibrage lues dans formula-constants.json (valeurs de 08-progression-and-experience.md
// et décisions Idan du 2026-10-06).
assert.deepEqual(rules.constants,{
  curve:10,startPosition:0.5,chanceCriticalFailure:30,chanceCriticalSuccess:-5,resistanceWound:8,resistanceOthers:-2,
  constitutionHpHealed:1,courageChargeAttempt:50,speedFleeHex:2,charismaKnockout:50,perceptionBackstabWound:10,
  forceLoadThreshold:0.25,forceLoadXp:20
});
const tuned=P.createProgressionRules({reference:{formulaConstants:{rows:[{code:"progression.charisma.knockout_xp",valeur:80}]}}});
assert.equal(tuned.constants.charismaKnockout,80,"une constante modifiée est prise en compte");
assert.equal(tuned.constants.courageChargeAttempt,50,"les autres gardent leur valeur par défaut");

// Courbe : XP cumulée = 10 × Niveau² ; la valeur est le niveau.
assert.equal(rules.xpForLevel(50),25000);
assert.equal(rules.levelForXp(25000),50);
assert.equal(rules.levelForXp(26009),50);
assert.equal(rules.levelForXp(26010),51);
assert.equal(rules.levelForXp(-5),0);
assert.equal(rules.startingXp(50),25505,"milieu de la tranche 25 000 – 26 010");

// Journal : ce que le moteur de combat signale.
const a={},d={};
P.recordAttack(a,d,{chargeDistance:3},{ok:true,chargeFall:true,hit:false,wound:false});
P.recordAttack(a,d,{chargeDistance:2},{ok:true,hit:false,wound:false});
assert.equal(a.progress.chargeAttempts,2,"charge tentée, même ratée ou finie en chute");
P.recordAttack(a,d,{},{ok:true,hit:true,wound:true,matchup:{type:"tranchant"},backstab:true,targetDown:false});
P.recordAttack(a,d,{},{ok:true,hit:true,wound:true,matchup:{type:"contondant"},backstab:false,targetDown:true});
P.recordAttack(a,d,{},{ok:false,reason:"hors portée"});
assert.deepEqual(d.progress.wounds,{"Résistance physique":2});
assert.equal(d.progress.backstabWounds,1);
assert.equal(a.progress.knockouts,1,"hors combat compté pour l'attaquant");
assert.equal(d.progress.knockouts,0);
P.recordFleeHex(d);P.recordFleeHex(d);P.recordFleeHex(d);
P.recordHeal(d,12);P.recordCritical(d,"failure");P.recordCritical(d,"success");

// Critiques (04-combat « Critiques physiques V1 ») : chaque critique positif et chaque échec critique confirmé
// comptent pour la Chance ; le contrecoup d'un échec critique de blessure est une blessure physique subie.
const lucky={},foe2={};
P.recordAttack(lucky,foe2,{},{ok:true,hit:true,criticalHit:true,wound:true,criticalWound:true,matchup:{type:"tranchant"}});
P.recordAttack(lucky,foe2,{},{ok:true,hit:false,fumbleRoll:99,fumble:true,wound:false});
P.recordAttack(lucky,foe2,{},{ok:true,hit:false,fumbleRoll:12,fumble:false,wound:false});
P.recordAttack(lucky,foe2,{},{ok:true,hit:true,wound:false,woundFumbleRoll:98,woundFumble:true,selfDamage:3});
assert.deepEqual([lucky.progress.criticalSuccesses,lucky.progress.criticalFailures],[2,2]);
assert.deepEqual(lucky.progress.wounds,{"Résistance physique":1},"le contrecoup compte comme blessure subie");
assert.equal(rules.gains(lucky.progress).stats.Chance,2*30-2*5);

// Journal → XP.
assert.deepEqual(rules.gains(a.progress),{stats:{Courage:100,Charisme:50},resistances:{}});
assert.deepEqual(rules.gains(d.progress),{
  stats:{Chance:25,Constitution:12,Vitesse:6,Perception:10},
  resistances:{"Résistance physique":16,"Résistance au feu":-4,"Résistance au froid":-4,"Résistance à la foudre":-4,"Résistance au poison":-4}
});
assert.deepEqual(rules.gains(null),{stats:{},resistances:{}});

// Contrat par composante (doc 08, dégâts mixtes) : une blessure à deux composantes appellera recordWound deux fois.
const mixed={};
P.recordWound(mixed,"tranchant");P.recordWound(mixed,"feu");
assert.deepEqual(mixed.progress.wounds,{"Résistance physique":1,"Résistance au feu":1});
assert.deepEqual(rules.gains(mixed.progress).resistances,{
  "Résistance physique":8-2,"Résistance au feu":8-2,"Résistance au froid":-4,"Résistance à la foudre":-4,"Résistance au poison":-4
});

// Force (Idan, 2026-10-07) : charge = malus de vitesse de base de l'armure et des armes équipées (deux sets) ;
// XP par activation = 20 × max(0, Charge / Force − 0,25).
const porter=(force,slots,items)=>({stats:{Force:force},equipment:{slots},items});
const lourd=porter(55,{weapon_set_1_main:"a",weapon_set_2_main:"c",armor:"b"},[
  {id:"a",name:"Hache double"},{id:"b",templateId:"armor:plate_armor",name:"Armure de plates"},{id:"c",name:"Dague"},{id:"x",name:"Marteau de guerre"}
]);
assert.equal(rules.loadOf(lourd),40+12+0,"armes et armure équipées seulement");
const activate=(character,times)=>{ const u={character}; for(let i=0;i<times;i++) rules.recordActivation(u); return u.progress; };
const heavyLog=activate(lourd,5);
assert.equal(heavyLog.activations,5);
assert.equal(rules.gains(heavyLog).stats.Force,70,"5 × 20 × (52/55 − 0,25) ≈ 70");
const leger=porter(77,{weapon_set_1_main:"a",armor:"b"},[{id:"a",name:"Dague"},{id:"b",templateId:"armor:leather",name:"Armure de cuir"}]);
assert.equal(rules.loadOf(leger),2);
assert.equal(rules.gains(activate(leger,5)).stats.Force,undefined,"équipement léger pour lui : rien");
assert.equal(rules.gains(activate(lourd,0)).stats.Force,undefined,"sans activation : rien");
assert.equal(rules.gains(activate(porter(0,{},[]),5)).stats.Force,undefined,"Force nulle : pas de division");
// Charge et Force relevées à chaque activation (revue Chatty du 2026-10-08) : changer d'équipement ensuite
// ne réécrit pas l'XP déjà acquise.
const changing={character:porter(55,{...lourd.equipment.slots},lourd.items)};
for(let i=0;i<5;i++) rules.recordActivation(changing);
changing.character.equipment.slots={weapon_set_1_main:"c"};
assert.equal(rules.gains(changing.progress).stats.Force,70,"équipement retiré après coup : XP inchangée");
rules.recordActivation(changing);
assert.equal(rules.gains(changing.progress).stats.Force,70,"activation avec une Dague seule (charge 0) : rien de plus");
const a2={};P.recordActivation(a2);P.recordActivation(a2);
assert.deepEqual([a2.progress.activations,a2.progress.loadRatios],[2,[]],"sans charge relevée : activations seules");

// Application : la valeur monte quand l'XP franchit le niveau suivant, baisse quand elle repasse dessous.
const merc={stats:{Charisme:50,Courage:20},resistances:{"Résistance au feu":5,"Résistance physique":1}};
let changes=rules.apply(merc,{stats:{Charisme:500},resistances:{"Résistance au feu":-4}});
assert.deepEqual(changes.map(c=>[c.name,c.before,c.after,c.xpAfter]),[["Charisme",50,50,26005],["Résistance au feu",5,5,301]],"pas de baisse dès la première perte");
changes=rules.apply(merc,{stats:{Charisme:50}});
assert.deepEqual([merc.stats.Charisme,merc.xp.stats.Charisme],[51,26055],"l'XP est gardée d'une mission à l'autre");
rules.apply(merc,{resistances:{"Résistance au feu":-60}});
assert.equal(merc.resistances["Résistance au feu"],4,"une résistance peut baisser");
rules.apply(merc,{resistances:{"Résistance physique":-1000}});
assert.deepEqual([merc.resistances["Résistance physique"],merc.xp.resistances["Résistance physique"]],[1,10],"jamais sous le minimum de la valeur");
merc.stats.Courage=30;
rules.apply(merc,{stats:{Courage:50}});
assert.equal(merc.xp.stats.Courage,rules.startingXp(30)+50,"valeur changée ailleurs : son XP repart de sa position de départ");
assert.deepEqual(rules.apply(merc,{stats:{Inconnue:50}}),[],"caractéristique absente ignorée");

// Moteur de combat : chaque attaque passe par le crochet onAttack.
const generator=createGenerator(reference,{random:()=>0,nameGenerator:(p,id)=>p+" "+id});
const calls=[];
const engine=createCombatEngine(reference,{random:()=>0,onAttack:(...args)=>{ calls.push(args); P.recordAttack(...args); }});
const hero=generator.createMercenary({id:1,forcedPeople:"Humain"}),foe=generator.createMercenary({id:2,forcedPeople:"Orc"});
const unit=(character,q)=>({character,q,r:0,hp:character.pvMax,alive:true,activeSet:1,prone:false});
const uh=unit(hero,0),uf=unit(foe,1);
for(const set of [1,2]){ uh.activeSet=set; if(engine.isMeleeWeapon(engine.weaponTemplate(engine.activeWeaponItem(uh)))) break; }
const result=engine.resolveAttack(uh,uf,{mode:"melee",distance:1});
assert.equal(calls.length,1);
assert.equal(calls[0][3],result,"le crochet reçoit le résultat de l'attaque");
if(result.wound) assert.equal(uf.progress.wounds["Résistance physique"],1);

// Charge tentée, via le crochet du vrai moteur : chute pendant la charge (D100 = 1) puis charge ratée (D100 = 100).
for(const [roll,label] of [[0,"chute"],[0.999,"raté"]]){
  const hook=createCombatEngine(reference,{random:()=>roll,onAttack:P.recordAttack});
  const ca=unit(hero,0),cd=unit(foe,4);
  for(const set of [1,2]){ ca.activeSet=set; if(hook.isMeleeWeapon(hook.weaponTemplate(hook.activeWeaponItem(ca)))) break; }
  const r=hook.resolveAttack(ca,cd,{mode:"melee",distance:1,chargeDistance:3});
  assert.equal(roll?r.hit:r.chargeFall,roll?false:true,label);
  assert.equal(ca.progress.chargeAttempts,1,"charge tentée comptée : "+label);
  assert.equal(rules.gains(ca.progress).stats.Courage,50,label);
}

// Charisme : un allié mis hors combat par accident (projectile raté) ne compte pas.
const ownTeam={team:"player"},ally2={team:"player"},foe3={team:"enemy"};
P.recordAttack(ownTeam,ally2,{},{ok:true,hit:true,wound:true,matchup:{type:"perforant"},targetDown:true});
P.recordAttack(ownTeam,foe3,{},{ok:true,hit:true,wound:true,matchup:{type:"perforant"},targetDown:true});
assert.equal(ownTeam.progress.knockouts,1);

// Charge brisée avant son attaque (contre-charge, attaque d'opportunité) : toujours une charge tentée.
const brokenCharge={};P.recordChargeAttempt(brokenCharge);
assert.equal(rules.gains(brokenCharge.progress).stats.Courage,50);

// Fin de mission : XP appliquée aux survivants, pas aux morts.
const campaign=createCampaignRules({generator,tavern:createTavernRules({reference,random:()=>0.999}),reference,progression:rules});
const captain=generator.createCaptain({id:10});
const state=campaign.createCampaign({captain,squad:[11,12].map(id=>generator.createMercenary({id,captain}))});
const [m1,m2]=state.company.roster.filter(m=>m.id!==captain.id);
const charismaBefore=m1.stats.Charisme;
const endRules=createMissionEndRules({reference,random:()=>0});
const participant=(m,hp,progress)=>({id:m.id,name:m.name,hp,pvMax:m.pvMax,damageTaken:0,stats:m.stats,progress});
const aftermath=endRules.resolveMissionEnd([
  participant(m1,m1.pvMax,{...P.emptyLog(),knockouts:30}),
  participant(m2,-m2.pvMax,{...P.emptyLog(),knockouts:30})
]);
assert.equal(aftermath.results[0].progress.knockouts,30,"le journal suit le participant");
assert.equal(aftermath.results[1].dead,true);
const report=campaign.applyMissionAftermath(state,aftermath);
assert.equal(report.progression.length,1,"seul le survivant progresse");
assert.equal(report.progression[0].mercenary,m1);
assert.equal(report.progression[0].xp.stats.Charisme,1500);
assert.equal(m1.stats.Charisme,rules.levelForXp(rules.startingXp(charismaBefore)+1500));
assert.ok(m1.stats.Charisme>charismaBefore,"30 adversaires hors combat : le Charisme monte");

// Bilan : chaque ligne porte l'XP par valeur et les changements affichés dans le tableau « Progression ».
const line=report.progression[0];
assert.ok(line.changes.some(c=>c.name==="Charisme"&&c.after>c.before&&c.xp===1500));

// Sauvegarde puis reprise : l'XP gardée sur le mercenaire survit à la sauvegarde et la mission suivante repart d'elle.
const xpSaved=m1.xp.stats.Charisme;
const restored=restoreCampaign(serializeCampaign(state));
assert.equal(restored.ok,true);
const m1Restored=restored.state.company.roster.find(m=>m.id===m1.id);
assert.equal(m1Restored.xp.stats.Charisme,xpSaved);
const again=campaign.applyMissionAftermath(restored.state,endRules.resolveMissionEnd([
  participant(m1Restored,m1Restored.pvMax,{...P.emptyLog(),knockouts:1})
]));
assert.equal(again.progression[0].changes.find(c=>c.name==="Charisme").xpBefore,xpSaved);
assert.equal(m1Restored.xp.stats.Charisme,xpSaved+50);

console.log(JSON.stringify({ok:true,charisme:[charismaBefore,m1.stats.Charisme]},null,2));
