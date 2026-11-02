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

// Aura du capitaine (Idan, 2026-10-24) : 35 % de son Courage + 25 % de son Charisme, équipement compris, arrondi, aux
// alliés à 10 cases ou moins, tant qu'il est sur la carte ; pas pour lui-même ni pour l'ennemi. Elle compte aussi pour la
// reprise de contrôle.
const captain={...teamUnit(a,"player",3,5),isCaptain:true};
const units=[hero,brute,captain];
const aura=Math.round(0.35*a.stats.Courage+0.25*a.stats.Charisme);
assert.ok(aura>0);
assert.equal(combat.captainAuraBonus(captain),aura);
assert.equal(combat.captainAura(hero,units),aura);
assert.equal(combat.captainAura(captain,units),0,"pas pour le capitaine lui-même");
assert.equal(combat.captainAura(brute,units),0,"pas pour l'ennemi");
assert.equal(combat.captainAura(hero,[hero,{...captain,q:3+11}]),0,"hors de portée (11 cases)");
assert.equal(combat.captainAura(hero,[hero,{...captain,q:3+10,r:3}]),aura,"10 cases : à portée");
assert.equal(combat.captainAura(hero,[hero,{...captain,alive:false}]),0,"capitaine tombé");
assert.equal(combat.captainAura(hero,[hero,{...captain,alive:false,offMap:true}]),0,"capitaine sorti de la carte");
c=combat.resolveCourage(brute,hero,woundMelee,{units});
assert.equal(c.aura,aura);
near(c.pHold,Math.min(95,Math.max(5,heroScore+aura)),"cible blessée avec l'aura");
c=combat.resolveCourage(brute,hero,missMelee,{units});
assert.equal(c.aura,0,"l'attaquant ennemi n'a pas d'aura");
near(combat.recoveryChance(hero,brute,1,units),Math.min(95,Math.max(5,heroScore+10+aura)),"reprise de contrôle avec l'aura");
assert.equal(combat.rollRecovery(hero,brute,1,units).aura,aura);
{
  // L'équipement compte : Bague du courage T4 (+20 % de Courage) et String du Charisme T4 (+20 % de Charisme).
  const geared=createCombatEngine({...reference,...Object.fromEntries(["rings","pants"].map(k=>[k,
    JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",k+".json"),"utf8"))]))},{random:()=>0});
  const chief={id:50,stats:{Courage:60,Charisme:40},items:[{id:"r",itemType:"ring",name:"Bague du courage",tier:4},
    {id:"p",itemType:"pants",name:"String du Charisme",tier:4}],equipment:{slots:{ring_1:"r",pants:"p"}}};
  assert.equal(geared.captainAuraBonus({character:{...chief,items:[],equipment:{slots:{}}}}),31,"0,35 × 60 + 0,25 × 40");
  assert.equal(geared.captainAuraBonus({character:chief}),37,"0,35 × 72 + 0,25 × 48 = 37,2");
}

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
  // Prise d'arme (Idan, 2026-11-02) : une arme Au choix tenue seule n'est à deux mains (×1,5) que si on l'empoigne.
  const grip=combat.usesTwoHands(attacker,weapon)&&weapon.prise==="Au choix"?1.5:1;
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

// Blocage bouclier physique V1 : bouclier en main secondaire du set actif.
function withShield(character,shieldName,qualityCode="standard",stats={}){
  const shield={id:"shield-"+character.id,templateId:"weapon:shield",name:shieldName,itemType:"weapon",slot:"weapon_set_1_off",owner:character.id,qualityCode,category:"Boucliers"};
  return {
    ...character,stats:{...character.stats,...stats},items:[...character.items,shield],
    equipment:{...character.equipment,slots:{...character.equipment.slots,weapon_set_1_off:shield.id}}
  };
}
const guardChar=withShield(a,"Écu");
const shieldMastery=c=>((Number(c.skills.martial.Boucliers)||0)+(Number(c.skills.martial["Écu"])||0))/2;
const blockOf=(c,bonus)=>Math.min(80,Math.max(5,((Number(c.stats["Dextérité"])||0)+shieldMastery(c))/2+bonus));
assert.equal(combat.blockChance(unit(guardChar,1,0)),blockOf(guardChar,10),"(Dextérité + maîtrise effective) / 2 + bonus de l'Écu");
assert.equal(combat.blockChance(unit(withShield(a,"Écu","luxury"),1,0)),blockOf(guardChar,10*1.2),"le bonus suit la qualité");
assert.equal(combat.blockChance(unit(withShield(a,"Pavois","standard",{"Dextérité":300}),1,0)),80,"plafond 80 %");
assert.equal(combat.blockChance(unit({...withShield(a,"Rondache","worn",{"Dextérité":0}),skills:{...a.skills,martial:{...a.skills.martial,Boucliers:0,"Rondache":0}}},1,0)),5,"plancher 5 %");
assert.equal(combat.blockChance(unit(a,0,0)),null,"sans bouclier : pas de jet");

// Coup bloqué (D100 à 1 : touche, puis bloque) : ni critique, ni Blesser, ni dégâts.
const shieldBearer=unit(guardChar,1,0),guardAttacker=unit(b,0,0);setFamily(guardAttacker,"melee");
const blocked=combat.resolveAttack(guardAttacker,shieldBearer,{mode:"melee",distance:1});
assert.deepEqual([blocked.hit,blocked.blocked,blocked.shield,blocked.wound,blocked.criticalHit,shieldBearer.hp],[true,true,"Écu",false,undefined,guardChar.pvMax]);
assert.equal(combat.resolveAttack(guardAttacker,shieldBearer,{mode:"melee",opportunity:true}).blocked,true,"possible même dans le dos");
// Blocage raté (D100 = 100) : l'attaque continue normalement, avec le jet de blocage dans le résultat.
r=scripted([1,100,100,50,1,100],[100]).resolveAttack(guardAttacker,shieldBearer,{mode:"melee",distance:1});
assert.deepEqual([r.blocked,r.blockRoll,r.criticalHit,r.wound],[false,100,false,true]);
// Contre un projectile physique aussi.
const guardShooter=unit(a,0,0);
if(setFamily(guardShooter,"ranged")){
  const d=Math.max(combat.weaponRange(guardShooter).min,1);
  assert.equal(combat.resolveAttack(guardShooter,unit(guardChar,d,0),{mode:"ranged",distance:d}).blocked,true);
}

// Parade du saï (Idan, 2026-10-29) : 5 % par saï tenu contre un coup tranchant de mêlée (deux saïs : 10 %).
const wield=(character,name)=>{
  const it={id:"wield-"+name,name,itemType:"weapon",qualityCode:"standard"};
  return {...character,items:[...character.items,it],equipment:{...character.equipment,slots:{...character.equipment.slots,weapon_set_1_main:it.id,weapon_set_1_off:null}}};
};
assert.equal(combat.parryChance(unit(wield(a,"Sai"),1,0),"tranchant"),5);
assert.equal(combat.parryChance(unit(withDual(a,"Sai","Sai"),1,0),"tranchant"),10);
assert.equal(combat.parryChance(unit(wield(a,"Sai"),1,0),"perforant"),0,"seulement les coups tranchants");
assert.equal(combat.parryChance(unit(wield(a,"Dague"),1,0),"tranchant"),0);
// Hachette (tranchante) : touche (1), pas de critique (100), choix du type (1), parade (1) : ni Blesser ni dégâts.
const parrier=unit(wield(b,"Sai"),1,0),slasher=unit(wield(a,"Hachette"),0,0),parrierHp=parrier.hp;
r=scripted([1,100,1,1],[100]).resolveAttack(slasher,parrier,{mode:"melee",distance:1});
assert.deepEqual([r.hit,r.parried,r.parryWeapon,r.pParry,r.wound,r.damage,parrier.hp],[true,true,"Sai",5,false,0,parrierHp]);
assert.equal(combat.rollChain(slasher,parrier,r,2,"melee"),null,"un coup paré n’ouvre pas d’enchaînement");
// Parade ratée (6) : le coup continue, avec le jet de parade dans le résultat.
r=scripted([1,100,1,6,1,100],[100]).resolveAttack(slasher,parrier,{mode:"melee",distance:1});
assert.deepEqual([r.parried,r.pParry,r.parryRoll,r.wound],[undefined,5,6,true]);
// Un estoc (perforant) n'est pas paré : pas de jet de parade.
const stabber=unit(wield(a,"Estoc"),0,0);
r=scripted([1,100,1,1,100],[100]).resolveAttack(stabber,unit(wield(b,"Sai"),1,0),{mode:"melee",distance:1});
assert.deepEqual([r.pParry,r.parried],[undefined,undefined]);

// Fléau d'armes (Idan, 2026-10-29) : la chance de blocage du bouclier adverse est divisée par deux.
const flailer=unit(wield(b,"Fléau d’armes"),0,0),blocker=unit(guardChar,1,0);
r=scripted([1,100],[100]).resolveAttack(flailer,blocker,{mode:"melee",distance:1});
assert.equal(r.pBlock,combat.blockChance(blocker)/2);
// Fouet (Idan, 2026-10-29) : allonge 2 ; + 10 % du Courage de base aux autres alliés à 3 cases, en plus de l'aura du capitaine,
// sans cumul entre fouets.
const whipper={...unit(wield(a,"Fouet"),0,0),team:"player",alive:true};
assert.equal(combat.canAttackAtDistance(whipper,2,"melee"),true);
assert.equal(combat.canAttackAtDistance(whipper,3,"melee"),false);
const whipFriend={...unit(b,2,0),team:"player",alive:true},courageBase=Number(b.stats.Courage)||0;
let whipAura=combat.allyAura(whipFriend,[whipper,whipFriend]);
assert.deepEqual([whipAura.whip,whipAura.bonus],[courageBase*0.1,courageBase*0.1]);
assert.equal(combat.allyAura(whipper,[whipper,whipFriend]).whip,0,"pas sur lui-même");
assert.equal(combat.allyAura({...whipFriend,q:4},[whipper,whipFriend]).whip,0,"au-delà de 3 cases");
assert.equal(combat.allyAura(whipFriend,[whipper,{...whipper,id:"w2",q:1},whipFriend]).whip,courageBase*0.1,"pas de cumul");
assert.equal(combat.allyAura({...whipFriend,team:"enemy"},[whipper,whipFriend]).whip,0,"pas les ennemis");

// Nunchaku (Idan, 2026-10-29) : en attaquant avec lui, + 10 % de sa Télékinésie en Dextérité ; pas avec une autre arme.
const kinetic=c=>({...c,skills:{...c.skills,magic:{...(c.skills.magic||{}),"Télékinésie":60}}});
const nunchakuUser=unit(wield(kinetic(a),"Nunchaku"),0,0),daggerUser=unit(wield(kinetic(a),"Dague"),0,0);
assert.equal(combat.attackStatBonus(nunchakuUser,"Dextérité"),6);
assert.equal(combat.effectiveDexterity(nunchakuUser),combat.statWithGear(nunchakuUser,"Dextérité")+6);
assert.equal(combat.effectiveDexterity(daggerUser),combat.statWithGear(daggerUser,"Dextérité"));
// Sarbacane (Idan, 2026-10-29) : une fléchette qui blesse empoisonne (3 tours, 10 PV par tour) ; ratée, rien.
const blower=unit(wield(a,"Sarbacane"),0,0),dartTarget=unit(b,3,0);
r=scripted([1,100,1,1,100,1,2],[100]).resolveAttack(blower,dartTarget,{mode:"ranged",distance:3});
assert.equal(r.wound,true);
assert.deepEqual(r.poison,{turns:3,amount:10,source:"blowgun"});
r=scripted([100,100],[100]).resolveAttack(blower,dartTarget,{mode:"ranged",distance:3});
assert.equal(r.poison,undefined);

// Vitesse combat effective CAC V1 : le malus du bouclier s'ajoute à celui de l'arme ; l'arme Au choix a le même malus
// à une ou à deux mains (Idan, 2026-11-02 : plus de malus divisé par deux).
const penalty=(c,slot)=>{
  const item=c.items.find(x=>x.id===c.equipment.slots[slot]),w=combat.weaponTemplate(item);
  const m=(Number(c.skills.martial[w.nom])||0)+(Number(c.skills.martial[item.category||""])||0);
  return w.malus_vitesse_arme_base*(Number(combat.quality(item).multiplicateur_malus)||1)*Math.max(0,1-m/400);
};
const bare=unit({...a,stats:{...a.stats,Vitesse:100}},0,0),shielded=unit(withShield(a,"Écu","standard",{Vitesse:100}),0,0);
const swordPenalty=penalty(a,"weapon_set_1_main");
const near2=(x,y,label)=>assert.ok(Math.abs(x-y)<1e-9,label+" : "+x+" ≠ "+y);
assert.ok(combat.effectiveSpeed(shielded)>1,"Vitesse assez haute pour ne pas toucher le plancher");
near2(combat.effectiveSpeed(bare)-combat.effectiveSpeed(shielded),penalty(guardChar,"weapon_set_1_off"),"avec bouclier");
bare.twoHandGrip=true;
const gripped=combat.effectiveSpeed(bare);
bare.twoHandGrip=false;
near2(gripped,combat.effectiveSpeed(bare),"empoignée à deux mains : même malus");

// Enchaînement d'attaques CAC V1 : P_N = min(100, (Dextérité + Vitesse combat effective) / N) ;
// Enchaînement de tirs distance V1 : divisé par 1,5 × N.
const chainer=unit(a,0,0),chainTarget=unit(b,1,0);setFamily(chainer,"melee");
const chainBase=(Number(a.stats["Dextérité"])||0)+combat.effectiveSpeed(chainer);
near(combat.chainChance(chainer,2,"melee"),Math.min(100,chainBase/2),"attaque n°2");
near(combat.chainChance(chainer,3,"melee"),Math.min(100,chainBase/3),"attaque n°3");
near(combat.chainChance(chainer,2,"ranged"),Math.min(100,chainBase/3),"tir n°2");
assert.equal(combat.chainChance(unit({...a,stats:{...a.stats,"Dextérité":900}},0,0),2,"melee"),100,"plafond 100");
const realHit={ok:true,hit:true,wound:false};
assert.deepEqual(combat.rollChain(chainer,chainTarget,realHit,2,"melee"),{n:2,p:combat.chainChance(chainer,2,"melee"),roll:1,continues:true});
assert.equal(panicky.rollChain(chainer,chainTarget,realHit,2,"melee").continues,false,"D100 > P_N : la chaîne s'arrête");
assert.ok(combat.rollChain(chainer,chainTarget,{ok:true,hit:true,criticalHit:true,wound:true,criticalWound:true},2,"melee"),"un critique positif n'arrête pas la chaîne");
for(const [stop,label] of [
  [{ok:true,hit:false},"raté"],[{ok:true,hit:true,blocked:true},"bloqué"],[{ok:true,hit:false,fumble:true},"échec critique au Toucher"],
  [{ok:true,hit:true,wound:false,woundFumble:true},"échec critique de blessure"],[{ok:false},"attaque impossible"]
]) assert.equal(combat.rollChain(chainer,chainTarget,stop,2,"melee"),null,label);
assert.equal(combat.rollChain(chainer,{...chainTarget,alive:false},realHit,2,"melee"),null,"cible hors combat");
assert.equal(combat.rollChain({...chainer,alive:false},chainTarget,realHit,2,"melee"),null,"attaquant hors combat");
// Cadence : seules les armes « Répétable » enchaînent les tirs.
assert.deepEqual(["Arc","Fronde","Sarbacane","Arbalète","Pistolet"].map(nom=>combat.isRepeatable({nom})),[true,true,true,false,false]);
const crossbow=unit(a,0,0);
if(setFamily(crossbow,"ranged")&&combat.weaponTemplate(combat.activeWeaponItem(crossbow)).nom==="Arbalète"){
  assert.equal(combat.rollChain(crossbow,chainTarget,realHit,2,"ranged"),null,"Arbalète : tir unique");
}

// Armes à feu — recharge V1 : chargée pour tirer, déchargée après le tir, une Action rapide recharge.
function withMainWeapon(character,name){
  const item={id:"main-"+name+"-"+character.id,name,itemType:"weapon",slot:"weapon_set_1_main",owner:character.id,qualityCode:"standard"};
  return {...character,items:[...character.items,item],equipment:{...character.equipment,slots:{...character.equipment.slots,weapon_set_1_main:item.id}}};
}
assert.deepEqual(["Pistolet","Arquebuse","Tromblon","Canon à main","Arc","Arbalète"].map(nom=>combat.needsLoading({nom})),[true,true,true,true,false,false]);
const gunner2=unit(withMainWeapon(a,"Pistolet"),0,0),gunTarget=unit(b,3,0);
const pistol=combat.activeWeaponItem(gunner2);
assert.deepEqual([combat.isLoaded(gunner2,pistol),combat.canReload(gunner2),combat.canAttackAtDistance(gunner2,3,"ranged")],[true,false,true],"chargée au début de la mission");
const firstShot=combat.resolveAttack(gunner2,gunTarget,{mode:"ranged",distance:3});
assert.equal(firstShot.ok,true);
assert.deepEqual([combat.isLoaded(gunner2,pistol),combat.canAttackAtDistance(gunner2,3,"ranged")],[false,false],"déchargée après le tir");
const dry=combat.resolveAttack(gunner2,gunTarget,{mode:"ranged",distance:3});
assert.equal(dry.ok,false);
assert.match(dry.reason,/déchargé/);
assert.equal(combat.canReload(gunner2),true);
assert.equal(combat.reload(gunner2),pistol,"une Action rapide recharge l'arme");
assert.deepEqual([combat.isLoaded(gunner2,pistol),combat.canReload(gunner2),combat.reload(gunner2)],[true,false,null]);
// Raté ou non, le coup est parti : l'arme se décharge aussi (D100 = 100 → raté).
const missGunner=unit(withMainWeapon(a,"Pistolet"),0,0);
assert.equal(panicky.resolveAttack(missGunner,gunTarget,{mode:"ranged",distance:3}).hit,false);
assert.equal(combat.isLoaded(missGunner,combat.activeWeaponItem(missGunner)),false);
// Un arc ne se décharge jamais.
const bowman=unit(withMainWeapon(a,"Arc"),0,0);
combat.resolveAttack(bowman,gunTarget,{mode:"ranged",distance:3});
assert.deepEqual([combat.isLoaded(bowman,combat.activeWeaponItem(bowman)),combat.canReload(bowman)],[true,false]);

// Contre-charge V1 : quand la cible directe réagit pendant la course du chargeur.
// Chargeur en q=0, cible en q=travel+1 : trajet q=1..travel, la dernière case est au contact.
const chargeLine=(travel,reactorCharacter)=>{
  const charger=unit(a,0,0),reactor=unit(reactorCharacter,travel+1,0);setFamily(charger,"melee");
  const charge=combat.chargeData(charger,reactor);
  assert.equal(charge.travel,travel);
  return {charger,reactor,charge};
};
let cc=chargeLine(4,withMainWeapon(b,"Lance"));
assert.deepEqual(cc.charge.step,{q:1,r:0},"direction de la charge");
assert.deepEqual(combat.counterchargeTrigger(cc.reactor,cc.charger,cc.charge),{at:3,mode:"melee",hand:"main"},"Lance (portée 1–2) : à l'entrée dans sa portée, 2 cases avant la cible");
cc=chargeLine(4,withMainWeapon(b,"Arc"));
assert.deepEqual(combat.counterchargeTrigger(cc.reactor,cc.charger,cc.charge),{at:2,mode:"ranged",hand:"main"},"à distance : mi-course");
cc=chargeLine(5,withMainWeapon(b,"Arc"));
assert.deepEqual(combat.counterchargeTrigger(cc.reactor,cc.charger,cc.charge),{at:3,mode:"ranged",hand:"main"},"course impaire 2N+1 → case N+1 (Idan, 2026-10-08)");
cc=chargeLine(4,withMainWeapon(b,"Pistolet"));
assert.equal(combat.counterchargeTrigger(cc.reactor,cc.charger,cc.charge).mode,"ranged");
cc.reactor.unloaded=[combat.activeWeaponItem(cc.reactor).id];
assert.equal(combat.counterchargeTrigger(cc.reactor,cc.charger,cc.charge),null,"arme à feu déchargée : pas de contre-charge");
cc=chargeLine(4,withMainWeapon(b,"Épée longue"));
assert.equal(combat.counterchargeTrigger(cc.reactor,cc.charger,cc.charge),null,"arme sans contre-charge");
cc=chargeLine(4,withMainWeapon(b,"Lance"));cc.reactor.fleeing=true;
assert.equal(combat.counterchargeTrigger(cc.reactor,cc.charger,cc.charge),null,"un personnage En Fuite ne réagit pas");

// Approximation projectile V1, couloir de tir d'Idan (2026-10-08) : cône de 30° (15° de chaque côté de l'axe
// tireur → cible), de la moitié de la distance de la cible jusqu'à la portée max de l'arme.
const strayShooter={...unit(withMainWeapon(a,"Arc"),0,0),team:"player"};
const strayTarget={...unit(b,6,0),team:"enemy"};
const at=(q,r,team)=>({...unit(b,q,r),team});
const onAxis=at(4,0,"enemy"),tooClose=at(2,0,"enemy"),behind=at(8,0,"player"),slightlyOff=at(5,-1,"player"),wide=at(4,-2,"enemy"),far=at(20,0,"enemy");
assert.equal(combat.weaponRange(strayShooter).max,18);
assert.deepEqual([onAxis,tooClose,behind,slightlyOff,wide,far].map(u=>combat.inFiringCorridor(strayShooter,strayTarget,u)),
  [true,false,true,true,false,false],"axe, trop près, derrière la cible, à ~11°, à 30°, hors portée");
// Tri : distance à la cible initiale, puis un ennemi du tireur d'abord, puis le plus proche du tireur.
assert.deepEqual(combat.strayCandidates(strayShooter,strayTarget,[strayShooter,strayTarget,behind,slightlyOff,onAxis,wide,{...at(5,0,"enemy"),alive:false}]),
  [onAxis,slightlyOff,behind]);
// Raté (100, Chance sauvée par 1), puis le 1er candidat est touché (D100 = 1) : P = P_toucher × 0,35.
const bystanders=[strayShooter,strayTarget,onAxis,slightlyOff];
r=scripted([100,1,1,100,50,100],[100]).resolveAttack(strayShooter,strayTarget,{mode:"ranged",distance:6,bystanders});
assert.deepEqual([r.hit,r.stray.unit,r.stray.result.accidental,r.stray.result.hit,r.stray.tries.length],[false,onAxis,true,true,1]);
near(r.stray.tries[0].p,combat.hitProbability(strayShooter,onAxis,"ranged",4)*0.35,"premier candidat ×0,35");
// Le 1er est manqué (100), le 2e touché : facteur 0,35 × 0,5.
r=scripted([100,1,100,1,100,50,100],[100]).resolveAttack(strayShooter,strayTarget,{mode:"ranged",distance:6,bystanders});
assert.equal(r.stray.unit,slightlyOff);
near(r.stray.tries[1].p,combat.hitProbability(strayShooter,slightlyOff,"ranged",5)*0.35*0.5,"deuxième candidat ×0,175");
// Personne de touché : le tir se perd.
r=scripted([100,1,100,100],[100]).resolveAttack(strayShooter,strayTarget,{mode:"ranged",distance:6,bystanders});
assert.deepEqual([r.stray.unit,r.stray.tries.length],[null,2]);
// Sans liste de présents, au CAC, ou avec une arme de zone (Tromblon) : pas d'approximation.
assert.equal(scripted([100,1],[100]).resolveAttack(strayShooter,strayTarget,{mode:"ranged",distance:6}).stray,undefined);
const blunderbuss={...unit(withMainWeapon(a,"Tromblon"),0,0),team:"player"},nearMark=at(4,0,"enemy");
assert.equal(scripted([100,1],[100]).resolveAttack(blunderbuss,nearMark,{mode:"ranged",distance:4,bystanders:[at(3,0,"enemy")]}).stray,null);

// Combat à deux armes CAC V1 : une arme (pas un bouclier) dans chaque main du set actif.
function withDual(character,mainName,offName,mastery=0){
  const main={id:"dual-main-"+mainName,name:mainName,itemType:"weapon",qualityCode:"standard"};
  const off={id:"dual-off-"+offName,name:offName,itemType:"weapon",qualityCode:"standard"};
  return {
    ...character,items:[...character.items,main,off],
    skills:{...character.skills,martial:{...character.skills.martial,"Combat à deux armes":mastery}},
    equipment:{...character.equipment,slots:{...character.equipment.slots,weapon_set_1_main:main.id,weapon_set_1_off:off.id}}
  };
}
const dex=Number(a.stats["Dextérité"])||0;
assert.equal(combat.isDualWielding(unit(withDual(a,"Épée courte","Dague"),0,0)),true);
assert.equal(combat.isDualWielding(unit(withShield(a,"Écu"),0,0)),false,"un bouclier n'est pas une seconde arme");
assert.equal(combat.isDualWielding(unit(a,0,0)),false);
near(combat.effectiveDexterity(unit(withDual(a,"Épée courte","Dague",0),0,0)),dex/2,"maîtrise 0 : Dextérité / 2");
near(combat.effectiveDexterity(unit(withDual(a,"Épée courte","Dague",50),0,0)),dex/1.5,"maîtrise 50 : Dextérité / 1,5");
near(combat.effectiveDexterity(unit(withDual(a,"Épée courte","Dague",100),0,0)),dex,"maîtrise 100 : Dextérité complète");
assert.equal(combat.effectiveDexterity(unit(a,0,0)),dex,"une seule arme : Dextérité normale");
const pair=unit(withDual(a,"Épée courte","Dague",40),0,0);
near(combat.chainChance(pair,2,"melee"),Math.min(100,(combat.effectiveDexterity(pair)+combat.effectiveSpeed(pair))/2),"P_N avec la Dextérité effective");

// Chaque main frappe avec son arme et son mode ; épée + pistolet : la lame au contact, le pistolet aussi à distance.
assert.deepEqual(combat.usableHands(pair,1).map(h=>[h.hand,h.mode,h.weapon]),[["main","melee","Épée courte"],["off","melee","Dague"]]);
const swordGun=unit(withDual(a,"Épée courte","Pistolet"),0,0);
assert.deepEqual(combat.usableHands(swordGun,1).map(h=>[h.hand,h.mode]),[["main","melee"],["off","ranged"]]);
assert.deepEqual(combat.usableHands(swordGun,3).map(h=>[h.hand,h.mode]),[["off","ranged"]]);
const offShot=combat.resolveAttack(swordGun,unit(b,3,0),{mode:"ranged",distance:3,hand:"off"});
assert.deepEqual([offShot.ok,offShot.weapon,offShot.hand,swordGun.attackHand],[true,"Pistolet","off",undefined],"la main secondaire tire, puis les mains reviennent en place");
assert.deepEqual(combat.usableHands(swordGun,3),[],"pistolet déchargé : plus rien à distance");
assert.deepEqual(combat.usableHands(swordGun,1).map(h=>h.hand),["main"],"la lame reste utilisable");
// La menace couvre la portée de chaque arme de mêlée tenue (Lance en main secondaire : 2 cases).
assert.equal(combat.threatens(unit(withDual(a,"Dague","Lance"),0,0),{q:2,r:0}),true);
assert.equal(combat.threatens(unit(withMainWeapon(a,"Dague"),0,0),{q:2,r:0}),false);

// Séquence suivante : au moins un toucher réel, aucun échec critique, une arme de mêlée, cible vivante.
const pairTarget=unit(b,1,0),hitM={ok:true,mode:"melee",hit:true},missM={ok:true,mode:"melee",hit:false};
assert.deepEqual(combat.rollPairChain(pair,pairTarget,[missM,hitM],2),{n:2,p:combat.chainChance(pair,2,"melee"),roll:1,continues:true},"une des deux a touché");
assert.equal(combat.rollPairChain(pair,pairTarget,[missM,{...missM,hit:true,blocked:true}],2),null,"rien n'a réellement touché");
assert.equal(combat.rollPairChain(pair,pairTarget,[hitM,{...missM,fumble:true}],2),null,"un échec critique coupe la chaîne");
assert.equal(combat.rollPairChain(pair,pairTarget,[{...hitM,mode:"ranged"},{...hitM,mode:"ranged"}],2),null,"deux pistolets : la paire de base seulement");
assert.equal(combat.rollPairChain(pair,{...pairTarget,alive:false},[hitM],2),null,"cible hors combat");

// Charge et contre-charge à deux armes (décision Idan, 2026-10-08).
// Contre-charge : chaque arme qui le permet riposte à son moment, dans l'ordre de la course.
cc=chargeLine(4,withDual(b,"Lance","Pistolet"));
assert.deepEqual(combat.counterchargeTriggers(cc.reactor,cc.charger,cc.charge),[{at:2,mode:"ranged",hand:"off"},{at:3,mode:"melee",hand:"main"}],"pistolet à mi-course, puis lance à l'entrée dans sa portée");
cc=chargeLine(4,withDual(b,"Épée courte","Pistolet"));
assert.deepEqual(combat.counterchargeTriggers(cc.reactor,cc.charger,cc.charge),[{at:2,mode:"ranged",hand:"off"}],"l'épée courte ne contre-charge pas");
// Charge : la seconde arme ne retire pas la chute de charge (D100 = 1 tomberait) mais garde le bonus de charge.
const followUp=combat.resolveAttack(unit(withDual(a,"Épée courte","Dague"),0,0),unit(b,1,0),{mode:"melee",distance:1,hand:"off",chargeDistance:3,chargeFollowUp:true});
assert.deepEqual([followUp.chargeFall,followUp.hit,followUp.weapon,followUp.chargePower>0],[undefined,true,"Dague",true]);

// Prise d'arme et mode deux mains V1 (revue Chatty du 2026-10-20) : une arme « 2 mains » exige une main
// secondaire vide ; ce qui y est rangé n'est pas tenu : pas de paire, pas de blocage, pas de malus de vitesse.
const greatAxeDagger=unit(withDual(a,"Hache double","Dague"),0,0);
assert.equal(combat.isDualWielding(greatAxeDagger),false,"Hache double + Dague : pas de combat à deux armes");
assert.deepEqual(combat.usableHands(greatAxeDagger,1).map(h=>h.hand),["main"]);
assert.equal(combat.activeOffhandItem(greatAxeDagger),null);
const greatAxeShield=unit(withShield(withMainWeapon(a,"Hache double"),"Écu"),0,0);
assert.equal(combat.blockChance(greatAxeShield),null,"Hache double + Écu : le bouclier ne bloque pas");
const axeOnly=unit({...withMainWeapon(a,"Hache double"),stats:{...a.stats,Vitesse:100}},0,0);
const axeShieldFast=unit(withShield(withMainWeapon(a,"Hache double"),"Écu","standard",{Vitesse:100}),0,0);
near(combat.effectiveSpeed(axeShieldFast),combat.effectiveSpeed(axeOnly),"l'écu rangé ne ralentit pas");
assert.equal(combat.isDualWielding(unit(withDual(a,"Épée courte","Arc"),0,0)),false,"Arc (2 mains) en main secondaire : pas tenu");
assert.equal(combat.isDualWielding(unit(withDual(a,"Écu","Dague"),0,0)),false,"un bouclier en main principale n'est pas une arme");
// Le cas normal ne change pas : arme « Au choix » ou « 1 main » avec bouclier ou seconde arme.
assert.ok(combat.blockChance(unit(withShield(withMainWeapon(a,"Épée longue"),"Écu"),1,0))>0);
assert.equal(combat.isDualWielding(unit(withDual(a,"Épée longue","Dague"),0,0)),true);

console.log(JSON.stringify({ok:true},null,2));
