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
const real=P.createProgressionRules({reference});
// Les mécanismes plus bas sont vérifiés avec les XP d'origine, d'avant les deux doublements (Idan, 2026-11-07 : « On
// double l'xp gagné partout » ; 2026-11-08 : « multiplie l'xp Gagné par 2 à nouveau ») : chaque gain est linéaire dans
// sa constante, et les valeurs réelles (× 4) sont vérifiées juste en dessous.
const XP_CODE=/^progression\.(?!xp_curve).*_xp$/;
// Les calculs de journal ci-dessous gardent la courbe d'avant les zones (10 × N², diviseurs à 1) ; la courbe par zones
// (Idan, 2026-11-08) est vérifiée à part, avec real.
const FLAT=/^progression\.xp_curve\.zone_\d_divisor$/;
const rules=P.createProgressionRules({reference:{...reference,formulaConstants:{...reference.formulaConstants,
  rows:reference.formulaConstants.rows.map(r=>XP_CODE.test(r.code)&&r.version!=="V2"?{...r,valeur:r.valeur/4}:FLAT.test(r.code)?{...r,valeur:1}:r)}}});

// Constantes d'équilibrage lues dans formula-constants.json (valeurs de 08-progression-and-experience.md
// et décisions Idan du 2026-10-06) ; toutes les XP doublées après le bêta-test (Idan, 2026-11-07 : « On double l'xp
// gagné partout »), puis doublées à nouveau (Idan, 2026-11-08 : « multiplie l'xp Gagné par 2 à nouveau ») ; la courbe,
// les seuils et les parts de régression inchangés.
assert.deepEqual(real.constants,{
  curve:10,zoneWidth:50,zoneDivisors:[4,2,1,0.75],startPosition:0.5,chanceCriticalFailure:120,chanceCriticalSuccess:-20,resistanceWound:32,resistanceOthers:-8,
  constitutionHpHealed:4,courageChargeAttempt:200,speedFleeHex:8,charismaKnockout:200,perceptionBackstabWound:40,
  forceLoadThreshold:0.25,forceLoadXp:80,
  dexterityChain:200,dodgeWoundTaken:40,enduranceHeavyArmorHex:8,willCourageHeld:80,willRecovery:80,intelligenceWorstChoice:120,
  skillWeaponAttack:40,skillWeaponHit:20,skillWeaponWound:20,skillTwoHandedAttack:40,skillOneHandedAttack:40,skillDualSequence:40,skillShieldBlock:40,
  skillIntimidation:200,mountReturn:200,regenerationBurn:120,skillRegressionRatio:0.5,
  spellCast:40,spellSuccess:20,spellEffect:20,schoolRegressionRatio:0.5,schoolFloor:1,magicPowerSpellEffect:80,manaReserveManaSpent:8,
  // XP de combat (Idan, 2026-11-08) : valeurs telles quelles (pas de doublement) ; multiplicateur d'étoiles.
  speedHexMoved:1,constitutionDamageTaken:2,enduranceContactTurn:10,perceptionLongShot:20,willSpellResisted:80,charismaAuraHold:40,
  // Magie en armure (Idan, 2026-11-09 : « passons à 80xp ») : par sort raté tant que l'équipement gêne encore.
  magicArmorFailure:80,
  starBonus:0.25
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
// Courbe par zones, lissée (Idan, 2026-11-08 : « De 0 à 50, c'est très facile (on divise par 4) De 51 à 100, (on divise
// par 2) De 101 à 150 comme aujourd'hui De 151 à 200 on divise par 0,75 » ; « on lisse le tout » ; « Après 200, on
// durcit encore un peu ») : coût du point n → n+1 = 10 × (2n+1) × multiplicateur (¼ au milieu de 0–50, ½ de 51–100, 1 de
// 101–150, 1/0,75 de 151–200, en ligne droite entre deux milieux, même pente au-delà), arrondi.
{
  const cost=n=>real.xpForLevel(n+1)-real.xpForLevel(n);
  assert.deepEqual([10,50,100,150,200,250].map(real.xpForLevel),[255,7561,48970,173107,407826,784210]);
  // Les repères de la proposition à marches (6 250, 43 750, 168 750, 402 083) à quelques pour cent près.
  for(const [n,step] of [[50,6250],[100,43750],[150,168750],[200,402083]]) assert.ok(Math.abs(real.xpForLevel(n)/step-1)<0.21,n+" : "+real.xpForLevel(n));
  for(const [n,m] of [[10,0.25],[25,0.25],[75,0.5],[125,1],[175,1/0.75]]) assert.ok(Math.abs(cost(n)/(10*(2*n+1))-m)<0.02,"multiplicateur au milieu des zones : "+n);
  assert.ok(Math.abs(cost(50)-cost(49))<20&&Math.abs(cost(100)-cost(99))<50,"pas de marche à 50 ni à 100");
  for(let n=1;n<400;n++) assert.ok(cost(n)>=cost(n-1),"chaque point coûte au moins autant que le précédent : "+n);
  assert.ok(cost(250)/(10*501)>1.8,"au-delà de 200, plus dur que 1/0,75");
  for(const n of [0,1,49,50,51,100,199,200,333]){ assert.equal(real.levelForXp(real.xpForLevel(n)),n); if(n) assert.equal(real.levelForXp(real.xpForLevel(n)-1),n-1); }
  assert.equal(real.startingXp(50),Math.round(7561+0.5*cost(50)));
  // Caractéristiques et compétences sur la même courbe (« ça c'est certain ») : 30,6 = 30 + 60 % de la tranche.
  assert.ok(Math.abs(real.continuousLevel(real.xpForContinuous(30.6))-30.6)<1e-9);
}

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
// Combat à une main (Idan, 2026-11-02) : +10 XP par attaque avec une arme à une main tenue seule, mêlée ou tir ; c'est un
// style, il fait reculer les autres styles possédés.
const solo={};
P.recordAttack(solo,{},{},{ok:true,mode:"melee",weapon:"Sabre",oneHanded:true,hit:false,wound:false});
P.recordAttack(solo,{},{},{ok:true,mode:"ranged",weapon:"Pistolet",oneHanded:true,hit:false,wound:false});
P.recordAttack(solo,{},{},{ok:true,mode:"melee",weapon:"Épée longue",twoHanded:true,hit:false,wound:false});
assert.deepEqual([solo.progress.oneHandedAttacks,solo.progress.twoHandedAttacks],[2,1]);
g=rules.gains({oneHandedAttacks:2},{skills:{martial:{"Combat à une main":20,"Combat à deux mains":10,"Combat à deux armes":10,"Boucliers":0}}}).skills.martial;
assert.deepEqual(g,{"Combat à une main":20,"Combat à deux mains":-5,"Combat à deux armes":-5});
g=rules.gains({twoHandedAttacks:1},{skills:{martial:{"Combat à une main":20,"Combat à deux mains":30}}}).skills.martial;
assert.deepEqual(g,{"Combat à deux mains":10,"Combat à une main":-5},"un gain de deux mains fait reculer une main");
assert.deepEqual(rules.gains({intimidations:2}).skills,{social:{Intimidation:100}});
assert.deepEqual(rules.gains({weaponUses:{"Épée longue":{attacks:1,hits:0,wounds:0}}}).skills.martial,{"Épée longue":10,"Lames longues":10},"sans mercenaire : pas de régression");

// Application : niveau continu (30,6 = niveau 30, à 60 % vers 31), sans plafond (Idan, 2026-11-06 : « sky is the limit »).
const near=(x,y,label)=>assert.ok(Math.abs(x-y)<1e-6,label+" : "+x+" ≠ "+y);
near(rules.xpForContinuous(30.6),9000+0.6*610,"XP de 30,6");
near(rules.continuousLevel(9366),30.6,"niveau de 9 366 XP");
const learner={skills:{martial:{"Lames longues":30.6,"Épée longue":99.9,"Combat à mains nues":132.4,"Dague":0}}};
let sk=rules.apply(learner,{skills:{martial:{"Lames longues":100,"Épée longue":10000,"Combat à mains nues":50,"Inconnue":10,"Dague":-5}}});
near(learner.skills.martial["Lames longues"],30+466/610,"+100 XP depuis 30,6");
near(learner.skills.martial["Épée longue"],rules.continuousLevel(rules.xpForContinuous(99.9)+10000),"pas de plafond à 100");
assert.ok(learner.skills.martial["Épée longue"]>100,"au-delà de 100");
assert.ok(learner.skills.martial["Combat à mains nues"]>132.4,"une valeur au-delà de 100 monte encore");
assert.equal(learner.skills.martial["Dague"],0,"jamais sous 0");
assert.deepEqual(sk.map(c=>c.name),["Lames longues","Épée longue","Combat à mains nues","Dague"],"compétence inconnue ignorée");
assert.equal(sk[0].family,"skills");
rules.apply(learner,{skills:{martial:{"Combat à mains nues":-200}}});
assert.ok(learner.skills.martial["Combat à mains nues"]<132.4,"et elle peut redescendre");
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

// Réputation de carrière (09 §1, Exploits et carrière ; barème confirmé par Idan le 2026-10-20) ; retour de mission
// divisé par deux le 2026-11-08 (Idan : +10 indemne ou fatigué, +5 blessé).
assert.deepEqual(rules.reputationConstants,{
  criticalSuccess:1,criticalFailure:-1,enemyWoundShare:0.01,enemyKnockoutShare:0.1,returnWounded:5,returnUnhurt:10
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
assert.equal(heroGain.sources.missionReturn,10,"retour indemne par défaut");
assert.ok(Math.abs(heroGain.total-(1+10.8+108+10))<1e-9);
// Un gobelin rapporte peu, un dragon beaucoup, une armée de troufions s'additionne (Idan, 2026-10-20).
const army={};
for(let i=0;i<30;i++) P.recordAttack(army,{id:"g"+i,team:"enemy",reputation:60},{},{ok:true,wound:true,damage:9,targetDown:true});
assert.ok(rules.reputationGains(army.progress).sources.enemyKnockouts>rules.reputationGains(renowned.progress).sources.enemyKnockouts);
// Échecs critiques, retour blessé (exclusif du retour indemne) et mission sans combat.
const clumsy={...P.emptyLog(),criticalFailures:2};
assert.deepEqual(rules.reputationGains(clumsy,{wounded:true}),{
  sources:{criticalSuccesses:0,criticalFailures:-2,enemyWounds:0,enemyKnockouts:0,missionReturn:5},total:3
});
assert.equal(rules.reputationGains(null).total,10,"mission sans combat : seulement le retour indemne");

// Campagne : le gain s'ajoute au delta de carrière et à la réputation totale ; un bilan rejoué ne recrédite rien.
const veteran=restored.state.company.roster.find(m=>m.id===m1.id);
const repBefore=veteran.reputation,deltaBefore=Number(veteran.reputationCareerDelta)||0,charismaXp=veteran.xp.stats.Charisme;
const heroAftermath={results:[{id:veteran.id,dead:false,wounded:true,woundDays:10,progress:renowned.progress}],captainDead:false};
const repReport=campaign.applyMissionAftermath(restored.state,heroAftermath);
const repLine=repReport.progression[0].reputation;
assert.equal(repLine.sources.missionReturn,5,"issue « Blessé » : +5");
assert.equal(repLine.before,repBefore);
assert.ok(Math.abs(veteran.reputation-(repBefore+repLine.total))<1e-9);
assert.ok(Math.abs(veteran.reputationCareerDelta-(deltaBefore+repLine.total))<1e-9);
assert.equal(veteran.reputationBreakdown.careerDelta,veteran.reputationCareerDelta);
assert.equal(campaign.applyMissionAftermath(restored.state,heroAftermath),repReport,"bilan rejoué : même rapport");
assert.ok(Math.abs(veteran.reputation-(repBefore+repLine.total))<1e-9,"bilan rejoué : pas de double crédit");
// La part calculée suit la progression (doc 09 ; Idan, 2026-11-08 : « brancher le recalcul ») : recalculée chaque matin
// avec les valeurs du jour, la carrière gardée telle quelle.
{
  const calculatedBefore=veteran.reputation-veteran.reputationCareerDelta,careerBefore=veteran.reputationCareerDelta;
  assert.ok(Math.abs(calculatedBefore-veteran.reputationBreakdown.calculated)<1e-9);
  veteran.stats.Charisme+=20;
  campaign.advanceTime(restored.state,1);
  assert.ok(veteran.reputationBreakdown.calculated>calculatedBefore*1.1,"plus de Charisme, plus de réputation");
  assert.equal(veteran.reputationCareerDelta,careerBefore);
  assert.ok(Math.abs(veteran.reputation-(veteran.reputationBreakdown.calculated+careerBefore))<1e-9);
  assert.equal(generator.recalculateReputation({name:"sans fiche"}),null);
}
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
assert.ok(master.spells.every(x=>x.mastery>100),"un sort dépasse 100 (sans plafond, 2026-11-06)");

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

// XP de combat (Idan, 2026-11-08 : « On ajoute : Vitesse +1 par case parcourue en combat… Constitution +2 XP par PV de
// dégâts encaissés et survécus… Endurance +10 par tour passé au contact d'un ennemi… Perception +20 par tir qui touche
// au-delà de la moitié de la portée… Volonté +80 par sort ennemi résisté… Charisme +40 quand un allié proche réussit son
// test de Courage et qu'il a utilisé son aura »).
{
  const archer={team:"player"},target={team:"enemy"},ally={team:"player"},foe={team:"enemy"};
  P.recordAttack(archer,target,{},{ok:true,mode:"ranged",weapon:"Arc court",hit:true,wound:false,distance:7,rangeMax:12});
  P.recordAttack(archer,target,{},{ok:true,mode:"ranged",weapon:"Arc court",hit:true,wound:false,distance:6,rangeMax:12});
  P.recordAttack(archer,target,{},{ok:true,mode:"ranged",weapon:"Arc court",hit:true,blocked:true,shield:"Rondache",wound:false,distance:11,rangeMax:12});
  P.recordAttack(archer,target,{},{ok:true,mode:"ranged",weapon:"Arc court",hit:false,wound:false,distance:11,rangeMax:12});
  assert.equal(archer.progress.longShots,1,"au-delà de la moitié de la portée, touché pour de bon : 7 sur 12 oui ; 6 non ; bloqué ou raté non");
  P.recordSpellResisted(target,ally);
  P.recordSpellResisted(target,foe);
  assert.equal(target.progress.spellsResisted,1,"un sort ennemi seulement");
  P.recordAuraHold(archer);P.recordAuraHold(null);
  P.recordContactTurn(archer);P.recordContactTurn(archer);
  P.recordDamageTaken(archer,35);
  const walker={character:{equipment:{slots:{}},items:[]}};
  for(let i=0;i<12;i++) real.recordStep(walker);
  assert.equal(walker.progress.hexesMoved,12);
  assert.deepEqual(real.gains(walker.progress).stats,{Vitesse:12},"+1 par case, en fuite ou non");
  const g=real.gains(archer.progress).stats;
  assert.deepEqual([g.Perception,g.Charisme,g.Endurance,g.Constitution],[20,40,20,70]);
  assert.equal(real.gains(target.progress).stats["Volonté"],80);
  // Multiplicateur d'étoiles (Idan, 2026-11-08) : × (1 + 0,25 par étoile au-delà de 1), sur toute l'XP de la mission.
  assert.deepEqual([1,2,3,5,10,15].map(real.starMultiplier),[1,1.25,1.5,2,3.25,4.5]);
  assert.equal(real.starMultiplier(undefined),1,"sans mission : × 1");
  const swordsman={progress:{...P.emptyLog(),weaponUses:{"Épée longue":{attacks:3,hits:2,wounds:1}},hexesMoved:4}};
  const merc={skills:{martial:{"Épée longue":40,"Lames longues":40,Hache:20,"Haches":20}}};
  const one=real.gains(swordsman.progress,merc),five=real.gains(swordsman.progress,merc,{stars:5});
  assert.equal(five.stats.Vitesse,2*one.stats.Vitesse);
  for(const [name,xp] of Object.entries(one.skills.martial)) assert.ok(Math.abs(five.skills.martial[name]-2*xp)<1e-9,name+" : × 2 en 5★, régression comprise");
}

console.log(JSON.stringify({ok:true,charisme:[charismaBefore,m1.stats.Charisme],reputation:[repBefore,veteran.reputation]},null,2));
