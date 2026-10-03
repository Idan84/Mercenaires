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
console.log(JSON.stringify({ok:true},null,2));
