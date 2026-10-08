"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createCombatEngine}=require("../game-core/combat-engine.js");

const ROOT=path.resolve(__dirname,"..");
const files={
  peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",
  alignments:"alignments.json",ancestries:"ancestries.json",
  ancestryCompatibility:"ancestry-compatibility.json",
  cultureOriginCompatibility:"culture-origin-compatibility.json",
  ancestryLevels:"ancestry-levels.json",d6Scale:"d6-generation-scale.json",
  generationMatrix:"generation-matrix.json",skills:"skills.json",
  characteristics:"characteristics.json",formulaConstants:"formula-constants.json",
  weapons:"weapons.json",baseArmors:"base-armors.json",itemQualities:"item-qualities.json",
  equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",
  binaryAptitudeGrants:"binary-aptitude-grants.json",alignmentGeneration:"alignment-generation.json"
};

const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[
  key,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"))
]));

const generator=createGenerator(reference,{random:()=>0,nameGenerator:(people,id)=>people+" "+id});
const combat=createCombatEngine(reference,{random:()=>0});

const a=generator.createMercenary({id:1,forcedPeople:"Humain",forcedCulture:"Cités libres",forcedOrigin:"Soldat / Guerrier / Combattant",forcedAscendance:null,forcedAlignment:"Neutre"});
const b=generator.createMercenary({id:2,forcedPeople:"Orc",forcedCulture:"Orcs des steppes",forcedOrigin:"Soldat / Guerrier / Combattant",forcedAscendance:null,forcedAlignment:"Chaotique mauvais"});

function unit(character,q,r){
  return {character,q,r,hp:character.pvMax,alive:true,activeSet:1,prone:false};
}

function setFamily(u,family){
  for(const set of [1,2]){
    u.activeSet=set;
    const w=combat.weaponTemplate(combat.activeWeaponItem(u));
    if(family==="melee"&&combat.isMeleeWeapon(w)) return true;
    if(family==="ranged"&&combat.isRangedWeapon(w)) return true;
  }
  return false;
}

const ua=unit(a,0,0),ub=unit(b,1,0);
assert.ok(combat.movementBase(ua)>=1);
assert.ok(Number.isFinite(combat.initiative(ua)));
assert.ok(Number.isFinite(combat.effectiveSpeed(ua)));
assert.ok(Number.isFinite(combat.effectiveDodge(ub)));

assert.equal(setFamily(ua,"melee"),true);
const range=combat.weaponRange(ua);
ub.q=range.max;ub.r=0;
const dist=combat.axialDistance(ua,ub);
assert.equal(combat.canAttackAtDistance(ua,dist,"melee"),true);
const melee=combat.resolveAttack(ua,ub,{mode:"melee",distance:dist});
assert.equal(melee.ok,true);
assert.equal(melee.hit,true);
assert.equal(melee.wound,true);
assert.ok(melee.damage>0);
assert.ok(ub.hp<b.pvMax);

if(setFamily(ua,"ranged")){
  ub.hp=b.pvMax;ub.alive=true;
  const rr=combat.weaponRange(ua);
  ub.q=Math.max(rr.min,Math.min(rr.max,3));ub.r=0;
  const rd=combat.axialDistance(ua,ub);
  assert.equal(combat.canAttackAtDistance(ua,rd,"ranged"),true);
  const ranged=combat.resolveAttack(ua,ub,{mode:"ranged",distance:rd});
  assert.equal(ranged.hit,true);
  assert.equal(ranged.wound,true);
  assert.ok(ranged.damage>0);
}

const sw=unit(a,0,0);
if(combat.canSwitchWeaponSet(sw)){
  const before=sw.activeSet;
  assert.equal(combat.switchWeaponSet(sw),true);
  assert.notEqual(sw.activeSet,before);
}

assert.equal(combat.axialDistance({q:0,r:0},{q:3,r:-3}),3);

// Inverse de la courbe 10 + 80/(1+exp(-delta/20)) : retrouve le delta d'une probabilité non bornée.
function deltaOf(p){
  assert.ok(p>10&&p<90,"probabilité bornée : delta non mesurable ("+p+")");
  return -20*Math.log(80/(p-10)-1);
}
function near(actual,expected,label){
  assert.ok(Math.abs(actual-expected)<1e-6,label+" : "+actual+" au lieu de "+expected);
}
function withMainWeapon(character,name){
  const item={id:"test-"+name,name,templateId:"test",itemType:"weapon",qualityCode:"standard"};
  return {
    ...character,
    items:[...(character.items||[]),item],
    equipment:{...character.equipment,slots:{...character.equipment.slots,weapon_set_1_main:item.id}}
  };
}

// Zone de menace : arme de mêlée standard 1 hex, arme d'hast 1–2 hex, rien avec une arme de tir.
const guard=unit(a,0,0);
assert.equal(setFamily(guard,"melee"),true);
assert.equal(combat.weaponRange(guard).max,1);
assert.equal(combat.threatens(guard,{q:1,r:0}),true);
assert.equal(combat.threatens(guard,{q:2,r:0}),false);
assert.equal(combat.threatens(guard,{q:0,r:0}),false);
assert.equal(combat.threatens({...guard,alive:false},{q:1,r:0}),false);

const pike=unit(withMainWeapon(a,"Hallebarde"),0,0);
assert.equal(combat.threatens(pike,{q:2,r:0}),true);
assert.equal(combat.threatens(pike,{q:3,r:0}),false);

// Sortir de la zone déclenche la réaction ; se déplacer à l'intérieur ne déclenche rien.
assert.deepEqual(combat.opportunityReactors([guard],{q:1,r:0},{q:2,r:0}),[guard]);
assert.deepEqual(combat.opportunityReactors([guard],{q:1,r:0},{q:1,r:-1}),[]);
assert.deepEqual(combat.opportunityReactors([pike],{q:1,r:0},{q:2,r:0}),[]);
assert.deepEqual(combat.opportunityReactors([pike],{q:2,r:0},{q:3,r:0}),[pike]);
assert.deepEqual(combat.opportunityReactors([guard,pike],{q:3,r:0},{q:4,r:0}),[]);

// Tir : réaction des adversaires qui menacent le tireur, sauf la cible du tir.
const shooter=unit(b,1,0),farTarget=unit(b,6,0);
assert.deepEqual(combat.rangedOpportunityReactors([guard],shooter,farTarget),[guard]);
assert.deepEqual(combat.rangedOpportunityReactors([guard],shooter,guard),[]);

// Toucher : opportunité = Esquive ×0,5 et Perception défensive annulée ; dos = Perception annulée.
const striker=unit(a,0,0),victim=unit(b,1,0);
setFamily(striker,"melee");
const dodge=combat.effectiveDodge(victim),perception=Number(b.stats.Perception)||0;
const pNormal=combat.hitProbability(striker,victim,"melee",1);
const pBack=combat.hitProbability(striker,victim,"melee",1,{backstab:true});
const pOpp=combat.hitProbability(striker,victim,"melee",1,{opportunity:true});
near(deltaOf(pBack)-deltaOf(pNormal),0.2*perception,"Frappe dans le dos (Toucher)");
near(deltaOf(pOpp)-deltaOf(pNormal),0.5*dodge+0.2*perception,"Attaque d'opportunité (Toucher)");

// Blesser : la Frappe dans le dos divise par deux la résistance d'armure au type de dégâts.
const weapon=combat.weaponTemplate(combat.activeWeaponItem(striker));
const normalMatchups=combat.damageMatchups(victim,weapon);
const backMatchups=combat.damageMatchups(victim,weapon,{backstab:true});
assert.ok(normalMatchups.length>0);
normalMatchups.forEach((m,i)=>{
  near(backMatchups[i].armorResistance,0.5*m.armorResistance,"résistance "+m.type);
  near(backMatchups[i].matchup,m.power-0.5*m.armorResistance,"matchup "+m.type);
});

// Charge : ForceEffectiveCharge = Force + PuissanceCharge au jet de Blesser.
const flatMatchup={matchup:0};
const pWound=combat.woundProbability(striker,victim,"melee",flatMatchup);
const pChargeWound=combat.woundProbability(striker,victim,"melee",flatMatchup,{chargePower:12});
near(deltaOf(pChargeWound)-deltaOf(pWound),12,"Force de charge (Blesser)");

// Une attaque d'opportunité est toujours une Frappe dans le dos, et seulement un coup de mêlée.
victim.hp=b.pvMax;victim.alive=true;
const opp=combat.resolveAttack(striker,victim,{mode:"melee",opportunity:true});
assert.equal(opp.ok,true);
assert.equal(opp.opportunity,true);
assert.equal(opp.backstab,true);
assert.equal(combat.resolveAttack(striker,victim,{mode:"melee",opportunity:true,chargeDistance:3}).ok,false);

// Encerclement : deux adversaires au contact, sur des cases de contact non adjacentes entre elles.
function meleeAt(q,r){ const u=unit(a,q,r); setFamily(u,"melee"); return u; }
const center={q:3,r:3};
assert.equal(combat.isEncircled(center,[meleeAt(4,3)]),false);
assert.equal(combat.isEncircled(center,[meleeAt(4,3),meleeAt(4,2)]),false,"deux cases de contact adjacentes");
assert.equal(combat.isEncircled(center,[meleeAt(4,3),meleeAt(3,2)]),true,"une case d'écart");
assert.equal(combat.isEncircled(center,[meleeAt(4,3),meleeAt(2,3)]),true,"cases opposées");
assert.equal(combat.isEncircled(center,[meleeAt(4,3),meleeAt(4,2),meleeAt(2,4)]),true,"trois assaillants");
assert.equal(combat.isEncircled(center,[meleeAt(4,3),{...meleeAt(2,3),alive:false}]),false,"assaillant hors combat");
const archer=unit(a,2,3);
if(setFamily(archer,"ranged")){
  assert.equal(combat.isEncircled(center,[meleeAt(4,3),archer]),false,"arme de tir active : pas au CAC");
}
const reach=unit(withMainWeapon(a,"Hallebarde"),5,3);
assert.equal(combat.isEncircled(center,[meleeAt(2,3),reach]),false,"arme d'hast à 2 hex : pas sur une case de contact");

// Une cible encerclée subit une Frappe dans le dos au CAC, pas au tir.
victim.hp=b.pvMax;victim.alive=true;
const encircledHit=combat.resolveAttack(striker,victim,{mode:"melee",encircled:true});
assert.equal(encircledHit.encircled,true);
assert.equal(encircledHit.backstab,true);
const plainHit=combat.resolveAttack(striker,victim,{mode:"melee"});
assert.equal(plainHit.backstab,false);
const gunner=unit(a,0,0),distantVictim=unit(b,3,0);
if(setFamily(gunner,"ranged")){
  const rangedRange=combat.weaponRange(gunner);
  distantVictim.q=Math.max(rangedRange.min,Math.min(rangedRange.max,3));
  const shot=combat.resolveAttack(gunner,distantVictim,{mode:"ranged",encircled:true});
  assert.equal(shot.backstab,false);
}

// En Fuite : ne menace plus personne, et toute attaque contre lui est une Frappe dans le dos.
const runner=meleeAt(4,3);runner.fleeing=true;
assert.equal(combat.threatens(runner,center),false);
assert.equal(combat.isEncircled(center,[runner,meleeAt(2,3)]),false);
victim.hp=b.pvMax;victim.alive=true;victim.fleeing=true;
const hitRunner=combat.resolveAttack(striker,victim,{mode:"melee"});
assert.equal(hitRunner.fleeingTarget,true);
assert.equal(hitRunner.backstab,true);
victim.fleeing=false;

// Courage : Courage + 0,25 × Volonté − 0,25 × Intimidation adverse − 10 × surplus, borné à 5–95.
function teamUnit(character,team,q,r){ const u=unit(character,q,r); u.team=team; setFamily(u,"melee"); return u; }
const hero=teamUnit(a,"player",3,3),brute=teamUnit(b,"enemy",4,3);
const heroScore=a.stats.Courage+0.25*a.stats["Volonté"]-0.25*combat.intimidation(brute);
near(combat.courageHold(hero,brute),Math.min(95,Math.max(5,heroScore)),"Courage de base");
near(combat.courageHold(hero,brute,2),Math.min(95,Math.max(5,heroScore-20)),"Courage en sous-nombre");
assert.equal(combat.courageHold({character:{stats:{Courage:0,"Volonté":0}}},brute),5);
assert.equal(combat.courageHold({character:{stats:{Courage:300,"Volonté":0}}},brute),95);

// Mêlée locale : groupe connecté par les zones de menace CAC.
const brute2=teamUnit(b,"enemy",2,3),farBrute=teamUnit(b,"enemy",8,0);
assert.deepEqual(combat.localMelee(hero,[hero,brute,brute2,farBrute]),{allies:1,enemies:2,surplus:1});
const buddy=teamUnit(a,"player",5,3);
assert.deepEqual(combat.localMelee(hero,[hero,brute,brute2,buddy,farBrute]),{allies:2,enemies:2,surplus:0});

// Qui teste ? random 0 → D100 = 1 (tient toujours) ; panicky → D100 = 100 (fuit toujours).
const panicky=createCombatEngine(reference,{random:()=>0.999});
const woundMelee={ok:true,mode:"melee",hit:true,wound:true};
const missMelee={ok:true,mode:"melee",hit:false,wound:false};
const woundShot={ok:true,mode:"ranged",hit:true,wound:true};
const missShot={ok:true,mode:"ranged",hit:false,wound:false};
let c=combat.resolveCourage(brute,hero,woundMelee);
assert.equal(c.subject,hero);assert.equal(c.rule,"wounded");assert.equal(c.flees,false);
near(c.pHold,combat.courageHold(hero,brute),"cible blessée");
c=panicky.resolveCourage(brute,hero,woundMelee,{defenderSurplus:2});
assert.equal(c.rule,"outnumbered");assert.equal(c.flees,true);
near(c.pHold,combat.courageHold(hero,brute,2),"cible blessée en sous-nombre");
c=combat.resolveCourage(brute,hero,woundShot,{defenderSurplus:2});
assert.equal(c.rule,"wounded","le sous-nombre ne s'applique qu'au CAC");
c=combat.resolveCourage(brute,hero,missMelee);
assert.equal(c.subject,brute);assert.equal(c.rule,"no-wound");
near(c.pHold,100-(100-combat.courageHold(brute,hero))/2,"attaquant sans blessure");
assert.equal(combat.resolveCourage(brute,hero,missMelee,{attackerEncircles:true}),null);
assert.equal(combat.resolveCourage(brute,hero,missShot),null,"le tireur ne teste jamais");
assert.equal(combat.resolveCourage(brute,{...hero,fleeing:true},woundMelee),null,"déjà En Fuite : pas de nouveau test");
assert.equal(combat.resolveCourage(brute,{...hero,alive:false},woundMelee),null);
assert.equal(combat.resolveCourage(brute,hero,{ok:true,chargeFall:true}),null);

// Reprise de contrôle : +10 par tour commencé En Fuite, borné à 5–95.
near(combat.recoveryChance(hero,brute,1),Math.min(95,Math.max(5,heroScore+10)),"reprise tour 1");
near(combat.recoveryChance(hero,brute,3),Math.min(95,Math.max(5,heroScore+30)),"reprise tour 3");
near(combat.recoveryChance(hero,null,1),Math.min(95,Math.max(5,a.stats.Courage+0.25*a.stats["Volonté"]+10)),"sans ennemi actif");
assert.equal(combat.rollRecovery(hero,brute,1).recovered,true);
assert.equal(panicky.rollRecovery(hero,brute,1).recovered,false);
assert.equal(combat.rollFleeBehavior(),1);
assert.equal(panicky.rollFleeBehavior(),3);

// Issue #13 : les PV restent signés sous 0 (profondeur conservée pour la fin de mission), et la cible est hors combat.
const doomed=unit(b,1,0);doomed.hp=1;
const finisher=unit(a,0,0);setFamily(finisher,"melee");
const finish=combat.resolveAttack(finisher,doomed,{mode:"melee",distance:1});
assert.equal(finish.wound,true);
assert.equal(doomed.hp,1-finish.damage);
assert.ok(doomed.hp<0,"PV négatifs conservés");
assert.equal(doomed.alive,false);
assert.equal(finish.targetHp,doomed.hp);
assert.equal(finish.targetDown,true);

// Fin de mission V1 : les dégâts subis s'additionnent sur toute la mission (base de la durée de fatigue).
const worn=unit(b,1,0);worn.damageTaken=7;
const hitter=unit(a,0,0);setFamily(hitter,"melee");
const blow=combat.resolveAttack(hitter,worn,{mode:"melee",distance:1});
assert.equal(blow.wound,true);
assert.equal(worn.damageTaken,7+blow.damage);
assert.equal(doomed.damageTaken,finish.damage);

// Charge : le chemin suit la ligne droite jusqu'à la case d'arrivée.
const charger=unit(a,0,0),chargeTarget=unit(b,4,0);
const charge=combat.chargeData(charger,chargeTarget);
assert.equal(charge.path.length,charge.travel);
assert.deepEqual(charge.path[0],{q:1,r:0});
assert.deepEqual(charge.path[charge.path.length-1],charge.destination);

// Critiques physiques V1 (04-combat) : probabilité de critique = Chance / 10, bornée à 1–25 %.
const lucky=(character,luck)=>({...character,stats:{...character.stats,Chance:luck}});
assert.equal(combat.criticalChance(unit(lucky(a,0),0,0)),1);
assert.equal(combat.criticalChance(unit(lucky(a,75),0,0)),7.5);
assert.equal(combat.criticalChance(unit(lucky(a,400),0,0)),25);

// Jets imposés : chaque valeur est le résultat du dé lancé (D100, dé d'arme ou D3), dans l'ordre des jets.
function scripted(rolls,sides){
  let i=0;
  return createCombatEngine(reference,{random:()=>{ const n=rolls[Math.min(i,rolls.length-1)],s=sides[Math.min(i,sides.length-1)]; i++; return (n-0.5)/s; }});
}
function expectedDamage(attacker,target,roll,variation){
  const item=combat.activeWeaponItem(attacker),weapon=combat.weaponTemplate(item);
  const q=Number(combat.quality(item).multiplicateur_qualite)||1;
  // Prise d'arme V1 : une arme Au choix sans arme secondaire est tenue à deux mains (×1,5).
  const grip=weapon.prise==="Au choix"&&!attacker.character.equipment.slots["weapon_set_"+attacker.activeSet+"_off"]?1.5:1;
  const rp=Math.max(0,Math.min(50,Number(target.character.resistances?.["Résistance physique"])||0));
  return Math.ceil(10*roll*q*grip*2*(Number(attacker.character.stats.Force)||0)/100*(1-(rp/100)*variation));
}
const diceOf=u=>{ const m=String(combat.weaponTemplate(combat.activeWeaponItem(u)).degats_pv_base).match(/^(\d+)D(\d+)$/i); return {count:Number(m[1]),sides:Number(m[2])}; };

// Critique au Toucher puis critique de blessure (tous les D100 à 1) : armure ignorée, dégâts maximum, variation 0,9.
const critAttacker=unit(a,0,0),critTarget=unit(b,1,0);setFamily(critAttacker,"melee");
const crit=combat.resolveAttack(critAttacker,critTarget,{mode:"melee",distance:1});
assert.equal(crit.criticalHit,true);
assert.equal(crit.criticalWound,true);
assert.equal(crit.matchup.armorResistance,0,"Critique toucher — armure ignorée V1");
assert.equal(crit.matchup.matchup,crit.matchup.power);
const critDice=diceOf(critAttacker);
assert.equal(crit.weaponRoll,critDice.count*critDice.sides,"jet de dégâts maximum");
assert.equal(crit.resistanceRoll,1,"variation de Résistance physique la plus favorable à l'attaquant (0,9)");
assert.equal(crit.damage,expectedDamage(critAttacker,critTarget,critDice.count*critDice.sides,0.9));

// Échec critique CAC V1 : naturel 96–100 au Toucher, puis D100 > Chance → Au Sol.
const fumbler=unit(lucky(a,40),0,0),fumbleTarget=unit(b,1,0);setFamily(fumbler,"melee");
let r=scripted([97,41],[100,100]).resolveAttack(fumbler,fumbleTarget,{mode:"melee",distance:1});
assert.deepEqual([r.hit,r.fumbleRoll,r.fumble,fumbler.prone],[false,41,true,true]);
fumbler.prone=false;
r=scripted([97,40],[100,100]).resolveAttack(fumbler,fumbleTarget,{mode:"melee",distance:1});
assert.deepEqual([r.fumbleRoll,r.fumble,fumbler.prone],[40,false,false],"D100 ≤ Chance : rattrapé");
r=scripted([95],[100]).resolveAttack(fumbler,fumbleTarget,{mode:"melee",distance:1});
assert.deepEqual([r.hit,r.fumbleRoll,r.fumble],[false,undefined,false],"sous 96 : simple raté");

// Échec critique de blessure CAC V1 : Toucher 1, pas de critique (100), choix du type, Blesser 99, Chance ratée.
const clumsy=unit(lucky(a,40),0,0),spared=unit(b,1,0);setFamily(clumsy,"melee");
assert.ok(combat.damageMatchups(spared,combat.weaponTemplate(combat.activeWeaponItem(clumsy))).length>0);
const clumsyHp=clumsy.hp;
r=scripted([1,100,50,99,41],[100,100,100,100,100]).resolveAttack(clumsy,spared,{mode:"melee",distance:1});
const clumsyDice=diceOf(clumsy);
assert.deepEqual([r.hit,r.criticalHit,r.wound,r.woundFumble],[true,false,false,true]);
assert.equal(r.selfDamage,expectedDamage(clumsy,clumsy,clumsyDice.count,1.1),"dégâts minimum de son propre coup, sa Résistance à 1,1");
assert.equal(clumsy.hp,clumsyHp-r.selfDamage);
assert.equal(clumsy.damageTaken,r.selfDamage);
assert.equal(spared.hp,spared.character.pvMax,"le défenseur ne subit rien");
assert.equal(r.attackerHp,clumsy.hp);

// La chute en charge met aussi Au Sol (Charge CAC V1), désormais posée par le moteur.
const faller=unit(a,0,0),chargeVictim=unit(b,4,0);setFamily(faller,"melee");
const fall=combat.resolveAttack(faller,chargeVictim,{mode:"melee",distance:1,chargeDistance:3});
assert.deepEqual([fall.chargeFall,faller.prone],[true,true]);

// La V1 distance réutilise le même principe de critiques (04-combat).
const critShooter=unit(a,0,0),mark=unit(b,2,0);
if(setFamily(critShooter,"ranged")){
  const d=Math.max(combat.weaponRange(critShooter).min,1);mark.q=d;
  const shot=combat.resolveAttack(critShooter,mark,{mode:"ranged",distance:d});
  assert.equal(shot.criticalHit,true);
  assert.equal(shot.criticalWound,true);
}

console.log(JSON.stringify({ok:true},null,2));
