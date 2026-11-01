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
  forceLoadThreshold:0.25,forceLoadXp:20,
  dexterityChain:50,dodgeWoundTaken:10,enduranceHeavyArmorHex:2,willCourageHeld:20,willRecovery:20,intelligenceWorstChoice:30,
  skillWeaponAttack:10,skillWeaponHit:5,skillWeaponWound:5,skillTwoHandedAttack:10,skillDualSequence:10,skillShieldBlock:10,
  skillIntimidation:50,regenerationBurn:30,skillRegressionRatio:0.5,
  spellCast:10,spellSuccess:5,spellEffect:5,schoolRegressionRatio:0.5,schoolFloor:1,magicPowerSpellEffect:20,manaReserveManaSpent:2
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
assert.deepEqual(rules.gains(a.progress),{stats:{Courage:100,Charisme:50},resistances:{},skills:{}});
assert.deepEqual(rules.gains(d.progress),{
  stats:{Chance:25,Constitution:12,Vitesse:6,Perception:10,Esquive:2*10},
  resistances:{"Résistance physique":16,"Résistance au feu":-4,"Résistance au froid":-4,"Résistance à la foudre":-4,"Résistance au poison":-4},
  skills:{}
});
assert.deepEqual(rules.gains(null),{stats:{},resistances:{},skills:{}});

// Nouvelles sources (Idan, 2026-10-20) : Dextérité, Esquive, Endurance, Volonté, Intelligence.
assert.deepEqual(rules.gains({chains:2,woundsTaken:3,heavyArmorHexes:10,courageHeld:2,recoveries:1,worstChoices:1}).stats,
  {"Dextérité":2*50,Esquive:3*10,Endurance:10*2,"Volonté":2*20+1*20,Intelligence:1*30});
const ev={team:"player"},foeEv={team:"enemy"};
P.recordChain(ev);P.recordDualSequence(ev,[{ok:true},{ok:true,hand:"off"}]);P.recordCourageHeld(ev);P.recordRecovery(ev);
// Revue Chatty (2026-10-20) : l'XP de Combat à deux armes exige que les DEUX armes aient frappé dans la séquence.
const lone={};
P.recordDualSequence(lone,[{ok:true}]);
P.recordDualSequence(lone,[{ok:true},{ok:false,hand:"off",reason:"Pistolet est déchargé"}]);
P.recordDualSequence(lone,[{ok:true,hand:"off"}]);
P.recordDualSequence(lone,[]);
assert.equal(lone.progress?.dualSequences||0,0,"une seule arme a frappé (l'autre déchargée ou hors de portée) : rien");
P.recordIntimidation(ev,foeEv);P.recordIntimidation(ev,{team:"player"});
assert.deepEqual([ev.progress.chains,ev.progress.dualSequences,ev.progress.courageHeld,ev.progress.recoveries,ev.progress.intimidations],[1,1,1,1,1],"un allié qui fuit ne compte pas pour l'Intimidation");
// recordAttack : pratique des armes, touchers réels, blessures, deux mains, blocages, pire choix ; Esquive sur blessure reçue.
const user={},target={};
P.recordAttack(user,target,{},{ok:true,mode:"melee",weapon:"Épée longue",twoHanded:true,hit:true,wound:true,matchup:{type:"tranchant",choice:"pire"}});
P.recordAttack(user,target,{},{ok:true,mode:"melee",weapon:"Épée longue",twoHanded:true,hit:true,blocked:true,shield:"Écu",wound:false});
P.recordAttack(user,target,{},{ok:true,mode:"ranged",weapon:"Arc",twoHanded:true,hit:false,wound:false});
P.recordAttack(user,target,{chargeDistance:3},{ok:true,mode:"melee",weapon:"Épée longue",chargeFall:true,hit:false,wound:false});
P.recordAttack(user,target,{},{ok:true,mode:"ranged",weapon:"Arc",accidental:true,hit:true,wound:true,matchup:{type:"perforant",choice:"pire"}});
assert.deepEqual(user.progress.weaponUses,{"Épée longue":{attacks:2,hits:1,wounds:1},Arc:{attacks:1,hits:0,wounds:0}},"ni la chute de charge ni le projectile perdu");
assert.deepEqual([user.progress.twoHandedAttacks,user.progress.worstChoices],[2,1],"deux mains : au corps à corps seulement");
assert.deepEqual([target.progress.blocks,target.progress.woundsTaken],[{"Écu":1},2],"le blessé par accident encaisse aussi");
const selfHurt={};P.recordAttack(selfHurt,{},{},{ok:true,hit:true,wound:false,woundFumble:true});
assert.equal(selfHurt.progress.woundsTaken,0,"le contrecoup n'est pas un coup encaissé");
// Endurance : armure lourde (plates, écailles) au moment du pas.
const plated={character:{equipment:{slots:{armor:"p"}},items:[{id:"p",templateId:"armor:plate_armor",name:"Armure de plates"}]}};
const leathered={character:{equipment:{slots:{armor:"l"}},items:[{id:"l",templateId:"armor:leather",name:"Armure de cuir"}]}};
rules.recordStep(plated);rules.recordStep(plated);rules.recordStep(leathered);
assert.deepEqual([plated.progress.heavyArmorHexes,leathered.progress?.heavyArmorHexes||0],[2,0]);

// Compétences : pratique puis régression (Idan, 2026-10-20) : la moitié du gain est perdue, à parts égales,
// par les armes des AUTRES catégories (pas la même), les autres catégories, les autres styles possédés.
const fighter={skills:{martial:{
  "Épée longue":12,"Sabre":10,"Hachette":20,"Dague":5,"Arc":0,
  "Lames longues":30,"Haches":20,"Lames courtes":10,"Armes de tir":0,
  "Combat à deux mains":30,"Combat à deux armes":10,"Boucliers":0
}}};
let g=rules.gains({weaponUses:{"Épée longue":{attacks:2,hits:1,wounds:1}}},fighter).skills.martial;
assert.deepEqual(g,{"Épée longue":30,"Lames longues":30,"Hachette":-7.5,"Dague":-7.5,"Haches":-7.5,"Lames courtes":-7.5},
  "Sabre (même catégorie) épargné ; Arc et Armes de tir, à 0, non possédés");
g=rules.gains({twoHandedAttacks:1},fighter).skills.martial;
assert.deepEqual(g,{"Combat à deux mains":10,"Combat à deux armes":-5},"styles : Boucliers à 0 n'est pas possédé");
g=rules.gains({blocks:{"Écu":2}},{skills:{martial:{"Écu":5,"Rondache":3,"Dague":8,"Boucliers":10,"Combat à deux mains":4}}}).skills.martial;
assert.deepEqual(g,{"Écu":20,"Boucliers":20,"Dague":-10,"Combat à deux mains":-10},"bouclier précis : les armes des autres catégories ; Boucliers : les autres styles");
assert.deepEqual(rules.gains({intimidations:2}).skills,{social:{Intimidation:100}});
assert.deepEqual(rules.gains({weaponUses:{"Épée longue":{attacks:1,hits:0,wounds:0}}}).skills.martial,{"Épée longue":10,"Lames longues":10},"sans mercenaire : pas de régression");

// Application : niveau continu (30,6 = niveau 30, à 60 % vers 31), plafond 100, valeur générée au-delà intacte.
const near=(x,y,label)=>assert.ok(Math.abs(x-y)<1e-6,label+" : "+x+" ≠ "+y);
near(rules.xpForContinuous(30.6),9000+0.6*610,"XP de 30,6");
near(rules.continuousLevel(9366),30.6,"niveau de 9 366 XP");
const learner={skills:{martial:{"Lames longues":30.6,"Épée longue":99.9,"Combat à mains nues":132.4,"Dague":0}}};
let sk=rules.apply(learner,{skills:{martial:{"Lames longues":100,"Épée longue":10000,"Combat à mains nues":50,"Inconnue":10,"Dague":-5}}});
near(learner.skills.martial["Lames longues"],30+466/610,"+100 XP depuis 30,6");
assert.equal(learner.skills.martial["Épée longue"],100,"plafond 100");
assert.equal(learner.skills.martial["Combat à mains nues"],132.4,"valeur générée au-delà de 100 : ne monte plus");
assert.equal(learner.skills.martial["Dague"],0,"jamais sous 0");
assert.deepEqual(sk.map(c=>c.name),["Lames longues","Épée longue","Combat à mains nues","Dague"],"compétence inconnue ignorée");
assert.equal(sk[0].family,"skills");
rules.apply(learner,{skills:{martial:{"Combat à mains nues":-50}}});
assert.ok(learner.skills.martial["Combat à mains nues"]<132.4,"mais elle peut redescendre");
rules.apply(learner,{skills:{martial:{"Lames longues":10}}});
near(learner.xp.skills.martial["Lames longues"],9366+100+10,"l'XP gardée sert de base à la mission suivante");

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

// Charge à deux armes : la seconde arme (chargeFollowUp) ne compte pas une seconde charge tentée.
const twoBlades={};
P.recordAttack(twoBlades,{},{chargeDistance:3},{ok:true,hit:false});
P.recordAttack(twoBlades,{},{chargeDistance:3,chargeFollowUp:true},{ok:true,hit:false});
assert.equal(twoBlades.progress.chargeAttempts,1);

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

// Campagne : l'XP de compétence est appliquée au survivant, avec la régression de ses autres armes.
const swordsman=state.company.roster.find(m=>m.id===m1.id);
const swordBefore=swordsman.skills.martial["Épée longue"];
const practice=campaign.applyMissionAftermath(state,endRules.resolveMissionEnd([
  participant(swordsman,swordsman.pvMax,{...P.emptyLog(),weaponUses:{"Épée longue":{attacks:3,hits:2,wounds:1}}})
]));
assert.equal(practice.progression[0].xp.skills.martial["Épée longue"],3*10+2*5+1*5);
assert.ok(swordsman.skills.martial["Épée longue"]>swordBefore,"l'arme pratiquée progresse");
assert.ok(Object.values(practice.progression[0].xp.skills.martial).some(n=>n<0),"les armes des autres catégories reculent");

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

// Réputation de carrière (09 §1, Exploits et carrière ; barème confirmé par Idan le 2026-10-20).
assert.deepEqual(rules.reputationConstants,{
  criticalSuccess:1,criticalFailure:-1,enemyWoundShare:0.01,enemyKnockoutShare:0.1,returnWounded:10,returnUnhurt:20
});
const renowned={id:"player-1",team:"player",character:{reputation:137}};
const ally={id:"player-2",team:"player",character:{reputation:120}};
const grunt={id:"enemy-1",team:"enemy",character:{reputation:80}};
const dragon={id:"enemy-2",team:"enemy",reputation:1000};
P.recordAttack(renowned,grunt,{},{ok:true,hit:true,wound:true,damage:4});
P.recordAttack(renowned,grunt,{},{ok:true,hit:true,wound:true,damage:6,targetDown:true});
P.recordAttack(renowned,dragon,{},{ok:true,hit:true,wound:true,damage:0});
P.recordAttack(renowned,ally,{},{ok:true,hit:true,wound:true,damage:5,targetDown:true,accidental:true});
assert.deepEqual(renowned.progress.enemyWounds,{"enemy-1":80},"un ennemi blessé compte une fois ; sans dégâts ni allié, rien");
assert.deepEqual(renowned.progress.enemyKnockouts,{"enemy-1":80},"le coup de grâce garde la réputation de l'ennemi");
P.recordAttack(renowned,dragon,{},{ok:true,hit:true,wound:true,damage:30,targetDown:true,criticalWound:true});
const heroGain=rules.reputationGains(renowned.progress);
assert.equal(heroGain.sources.criticalSuccesses,1);
assert.ok(Math.abs(heroGain.sources.enemyWounds-0.01*(80+1000))<1e-9,"1 % de la réputation de chaque ennemi blessé");
assert.ok(Math.abs(heroGain.sources.enemyKnockouts-0.1*(80+1000))<1e-9,"10 % de la réputation de chaque ennemi mis hors combat");
assert.equal(heroGain.sources.missionReturn,20,"retour indemne par défaut");
assert.ok(Math.abs(heroGain.total-(1+10.8+108+20))<1e-9);
// Un gobelin rapporte peu, un dragon beaucoup, une armée de troufions s'additionne (Idan, 2026-10-20).
const army={};
for(let i=0;i<30;i++) P.recordAttack(army,{id:"g"+i,team:"enemy",reputation:60},{},{ok:true,wound:true,damage:9,targetDown:true});
assert.ok(rules.reputationGains(army.progress).sources.enemyKnockouts>rules.reputationGains(renowned.progress).sources.enemyKnockouts);
// Échecs critiques, retour blessé (exclusif du retour indemne) et mission sans combat.
const clumsy={...P.emptyLog(),criticalFailures:2};
assert.deepEqual(rules.reputationGains(clumsy,{wounded:true}),{
  sources:{criticalSuccesses:0,criticalFailures:-2,enemyWounds:0,enemyKnockouts:0,missionReturn:10},total:8
});
assert.equal(rules.reputationGains(null).total,20,"mission sans combat : seulement le retour indemne");

// Campagne : le gain s'ajoute au delta de carrière et à la réputation totale ; un bilan rejoué ne recrédite rien.
const veteran=restored.state.company.roster.find(m=>m.id===m1.id);
const repBefore=veteran.reputation,deltaBefore=Number(veteran.reputationCareerDelta)||0,charismaXp=veteran.xp.stats.Charisme;
const heroAftermath={results:[{id:veteran.id,dead:false,wounded:true,woundDays:10,progress:renowned.progress}],captainDead:false};
const repReport=campaign.applyMissionAftermath(restored.state,heroAftermath);
const repLine=repReport.progression[0].reputation;
assert.equal(repLine.sources.missionReturn,10,"issue « Blessé » : +10");
assert.equal(repLine.before,repBefore);
assert.ok(Math.abs(veteran.reputation-(repBefore+repLine.total))<1e-9);
assert.ok(Math.abs(veteran.reputationCareerDelta-(deltaBefore+repLine.total))<1e-9);
assert.equal(veteran.reputationBreakdown.careerDelta,veteran.reputationCareerDelta);
assert.equal(campaign.applyMissionAftermath(restored.state,heroAftermath),repReport,"bilan rejoué : même rapport");
assert.ok(Math.abs(veteran.reputation-(repBefore+repLine.total))<1e-9,"bilan rejoué : pas de double crédit");
assert.equal(veteran.xp.stats.Charisme,charismaXp+2*50,"bilan rejoué : l'XP n'est pas recréditée non plus");
const reloaded=restoreCampaign(serializeCampaign(restored.state));
assert.equal(reloaded.state.company.roster.find(m=>m.id===m1.id).reputationCareerDelta,veteran.reputationCareerDelta,"le delta de carrière est sauvegardé");

// Magie (12-magic.md, étape 3 ; Idan, 2026-10-25) : par lancer, +10 au sort et à son école, +5 s'il réussit, +5 s'il a
// un vrai effet ; les deux écoles opposées perdent la moitié du gain de l'école, un quart chacune. Puissance magique :
// +20 par sort réussi qui a un effet ; Réserve de mana : +2 par point de mana dépensé ; Chance et réputation : critiques
// comme les armes.
const mage={team:"player"};
P.recordSpell(mage,{code:"quick_heal",school:"Vie",success:true,effect:true,mana:11});
P.recordSpell(mage,{code:"quick_heal",school:"Vie",success:true,effect:false,mana:11});
P.recordSpell(mage,{code:"quick_heal",school:"Vie",success:false,effect:true,mana:11,fumble:true});
P.recordSpell(mage,{code:"fire_bolt",school:"Feu",success:true,effect:true,mana:10,critical:true});
const magicXp=rules.gains(mage.progress);
assert.deepEqual(magicXp.spells,{quick_heal:20+15+10,fire_bolt:20},"un sort raté donne seulement l'XP du lancer");
assert.deepEqual(magicXp.skills.magic,{Vie:45,Feu:20,"Nécromancie":-11.25,Illusion:-11.25,"Télékinésie":-5,Eau:-5},
  "les deux écoles opposées perdent un quart du gain chacune");
assert.equal(magicXp.stats["Puissance magique"],2*20,"deux sorts réussis avec un vrai effet");
assert.equal(magicXp.stats["Réserve de mana"],43*2,"le mana d'un sort raté compte aussi");
assert.equal(magicXp.stats.Chance,30-5,"échec critique confirmé +30, coup critique −5");
assert.equal(rules.reputationGains(mage.progress).sources.criticalSuccesses,1,"un coup critique de sort compte pour la réputation");
assert.equal(rules.reputationGains(mage.progress).sources.criticalFailures,-1,"un échec critique de sort aussi");
assert.equal(rules.gains({}).spells,undefined,"sans sort lancé, le bilan garde sa forme habituelle");
// Pratiquer deux écoles opposées : le gain de l'une et la perte venue de l'autre s'additionnent.
const both={};
P.recordSpell(both,{code:"fire_bolt",school:"Feu",success:true,effect:true});
P.recordSpell(both,{code:"water_test",school:"Eau",success:true,effect:true});
assert.deepEqual(rules.gains(both.progress).skills.magic,{Feu:15,Eau:15,"Télékinésie":-5,Foudre:-5});

const wizard={stats:{"Puissance magique":50,"Réserve de mana":40,Chance:40},resistances:{},
  skills:{magic:{Vie:56.5,"Nécromancie":1,Illusion:20,Feu:1,"Télékinésie":1,Eau:1}},
  spells:[{code:"quick_heal",name:"Soin rapide",school:"Vie",mastery:1}]};
const wizardChanges=rules.apply(wizard,magicXp);
assert.ok(Math.abs(wizard.skills.magic.Vie-(56+(31925+45-31360)/1130))<1e-6,"Vie 56,5 : +45 XP sur la tranche de 1 130");
assert.equal(wizard.skills.magic["Nécromancie"],1,"une école ne descend pas sous 1, la valeur « sans l'école »");
assert.ok(wizard.skills.magic.Illusion<20,"l'école opposée recule");
assert.ok(Math.abs(wizard.skills.magic.Feu-(1+20/30))<1e-6);
assert.equal(wizard.spells[0].mastery,2.3,"sort du grimoire : 10 + 45 XP = niveau 2, à 30 % de la tranche vers 3");
assert.equal(wizard.xp.spells.quick_heal,55);
assert.ok(wizardChanges.some(c=>c.family==="spells"&&c.code==="quick_heal"&&c.before===1&&c.after===2.3));
assert.ok(!wizardChanges.some(c=>c.code==="fire_bolt"),"un sort prêté pour le combat (hors grimoire) ne change rien");
assert.equal(wizard.stats["Puissance magique"],50);
assert.ok(wizardChanges.some(c=>c.name==="Réserve de mana"&&c.xp===86));
const master={stats:{},resistances:{},skills:{magic:{}},spells:[{code:"quick_heal",mastery:100},{code:"purge",mastery:99.9}]};
rules.apply(master,{spells:{quick_heal:5000,purge:5000}});
assert.deepEqual(master.spells.map(x=>x.mastery),[100,100],"un sort plafonne à 100");

// Dégâts d'un sort : la blessure d'un élément compte pour la résistance de la cible ; le lanceur compte la blessure et
// la mise hors combat d'un adversaire (Charisme, réputation), pas celle d'un allié touché par accident.
const pyro={id:"pyro",team:"player"},goblin={id:"gob",team:"enemy",reputation:30},friend={id:"ami",team:"player"};
P.recordSpellDamage(pyro,goblin,12,{element:"feu",down:true});
P.recordSpellDamage(pyro,friend,8,{element:"feu",down:true});
P.recordSpellDamage(pyro,goblin,0,{element:"feu"});
P.recordSpellDamage(null,friend,5,{element:"feu"});
assert.deepEqual(goblin.progress.wounds,{"Résistance au feu":1},"une protection totale (0 dégât) ne blesse pas");
assert.deepEqual(friend.progress.wounds,{"Résistance au feu":2});
assert.equal(pyro.progress.knockouts,1);
assert.deepEqual(pyro.progress.enemyKnockouts,{gob:30});
assert.deepEqual(pyro.progress.enemyWounds,{gob:30});
assert.deepEqual(rules.gains(goblin.progress).resistances,{"Résistance au feu":8,"Résistance physique":-2,"Résistance au froid":-2,"Résistance à la foudre":-2,"Résistance au poison":-2});

console.log(JSON.stringify({ok:true,charisme:[charismaBefore,m1.stats.Charisme],reputation:[repBefore,veteran.reputation]},null,2));
