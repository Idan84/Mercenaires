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

// Charge : le chemin suit la ligne droite jusqu'à la case d'arrivée.
const charger=unit(a,0,0),chargeTarget=unit(b,4,0);
const charge=combat.chargeData(charger,chargeTarget);
assert.equal(charge.path.length,charge.travel);
assert.deepEqual(charge.path[0],{q:1,r:0});
assert.deepEqual(charge.path[charge.path.length-1],charge.destination);

console.log(JSON.stringify({ok:true},null,2));
