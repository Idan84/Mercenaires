"use strict";

// Magie — Soin rapide (doc 12 « Décisions du 2026-10-25 » ; Idan) : maîtrise = École + Niveau du sort / 2, soin, portée,
// mana, réussite, armure, ligne de vue, cible alliée ou soi-même, CC et EC.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createMagicRules}=require("../game-core/magic.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const reference={
  weapons:read("weapons.json"),baseArmors:read("base-armors.json"),itemQualities:read("item-qualities.json"),
  skills:read("skills.json"),formulaConstants:read("formula-constants.json"),boots:read("boots.json"),belts:read("belts.json"),
  amulets:read("amulets.json"),capes:read("capes.json"),gloves:read("gloves.json"),pants:read("pants.json"),
  rings:read("rings.json"),helmets:read("helmets.json"),spells:read("spells.json")
};
// Tirages imposés : chaque appel à random() prend la valeur suivante.
let queue=[];
const random=()=>queue.length?queue.shift():0.5;
const combat=createCombatEngine(reference,{random});
const magic=createMagicRules({reference,combat,random});

function mage({pm,vie,level=1,int,chance=54,mana=53,items=[],slots={}}){
  return {
    name:"Mage",stats:{"Puissance magique":pm,Intelligence:int,Chance:chance,"Réserve de mana":mana,Constitution:50,Endurance:50,Volonté:50},
    skills:{magic:{Vie:vie,Nécromancie:20,Illusion:20}},mana,
    spells:[{code:"quick_heal",name:"Soin rapide",school:"Vie",mastery:level}],
    items,equipment:{slots}
  };
}
const unit=(character,extra={})=>({character,team:"player",q:0,r:0,activeSet:1,hp:100,pvMax:200,alive:true,quickAvailable:true,...extra});

// Données : un seul sort pour l'instant, Soin rapide (Vie), action rapide, allié ou soi-même, ligne de vue.
const spell=magic.spell("quick_heal");
assert.equal(spell.nom,"Soin rapide");
assert.deepEqual([spell.ecole,spell.action,spell.cible,spell.ligne_de_vue],["Vie","rapide","allie_ou_soi",true]);

// Débutant (Puissance 53, Vie 31, sort 1, Intelligence 35) : maîtrise 31,5 ; soin 9 à 35 ; portée 3 ; 11 mana ; 57 %.
const beginner=unit(mage({pm:53,vie:31,level:1,int:35}));
assert.equal(magic.mastery(beginner,"quick_heal"),31.5);
assert.deepEqual(magic.effectRange(beginner,"quick_heal"),{min:9,max:35});
assert.equal(magic.range(beginner,"quick_heal"),3);
assert.equal(magic.manaCost(beginner,"quick_heal"),11);
assert.equal(Math.round(magic.castChance(beginner,"quick_heal").p*10)/10,57.1);

// Expert (Puissance 69, Vie 84, sort 100, Intelligence 73) : maîtrise 134 ; soin 26 à 102 ; portée 7 ; 7 mana ; 94 %.
const expert=unit(mage({pm:69,vie:84,level:100,int:73,mana:80}));
assert.equal(magic.mastery(expert,"quick_heal"),134);
assert.deepEqual(magic.effectRange(expert,"quick_heal"),{min:26,max:102});
assert.equal(magic.range(expert,"quick_heal"),7);
assert.equal(magic.manaCost(expert,"quick_heal"),7);
assert.equal(Math.round(magic.castChance(expert,"quick_heal").p*10)/10,94.4);
assert.ok(magic.castChance(unit(mage({pm:200,vie:300,level:100,int:300})),"quick_heal").p<=95,"jamais plus de 95 %");

// L'école pèse deux fois plus que le sort : Vie 84 au niveau 1 ≈ Vie 56 au niveau 50.
const gifted=unit(mage({pm:53,vie:84,level:1,int:53})),practiced=unit(mage({pm:53,vie:56,level:50,int:53}));
assert.equal(magic.mastery(gifted,"quick_heal"),84.5);
assert.equal(magic.mastery(practiced,"quick_heal"),81);

// Équipement : la Bague du soigneur monte l'école (T4 : +25 %), l'amulette la Puissance magique (T4 : +20 %).
const ringed=unit(mage({pm:53,vie:56,int:53,items:[{id:"r",name:"Bague du soigneur",tier:4},{id:"a",name:"Amulette de puissance magique",tier:4}],
  slots:{ring_1:"r",amulet:"a"}}));
assert.equal(magic.schoolLevel(ringed,"Vie"),70);
assert.equal(magic.mastery(ringed,"quick_heal"),70.5);
assert.equal(Math.round(magic.effectFactor(ringed,"quick_heal")*1e4)/1e4,Math.round(2*63.6/100*(0.5+70.5/100)*1e4)/1e4);

// Armure : son Altération magique se retire de la réussite, × le malus de sa qualité (usée 1,2 ; Grand Luxe 0,8).
const armored=(name,qualityCode)=>unit(mage({pm:53,vie:31,int:35,items:[{id:"x",name,qualityCode,templateId:""}],slots:{armor:"x"}}));
const base=magic.castChance(beginner,"quick_heal").p;
assert.equal(magic.armorPenalty(armored("Armure de plates","standard")),45);
assert.equal(Math.round(magic.castChance(armored("Armure de plates","standard"),"quick_heal").p*10)/10,Math.round((base-45)*10)/10);
assert.equal(magic.armorPenalty(armored("Armure de plates","worn")),54);
assert.equal(magic.armorPenalty(armored("Armure de plates","luxury")),36);
assert.equal(magic.armorPenalty(armored("Armure de cuir","standard")),5);
assert.equal(magic.armorPenalty(armored("Vêtements","standard")),0);
assert.equal(magic.castChance(unit(mage({pm:53,vie:1,level:1,int:10,items:[{id:"x",name:"Armure de plates"}],slots:{armor:"x"}})),"quick_heal").p,0,
  "jamais sous 0");

// Cible : un allié ou soi-même, à portée et en ligne de vue ; action rapide disponible ; assez de mana.
const caster=unit(mage({pm:53,vie:31,int:35}));
const ally=unit(mage({pm:50,vie:1,int:50}),{q:3,r:0});
const far=unit(mage({pm:50,vie:1,int:50}),{q:4,r:0});
const foe=unit(mage({pm:50,vie:1,int:50}),{q:1,r:0,team:"enemy"});
assert.equal(magic.canCast(caster,caster,"quick_heal").ok,true,"sur soi-même");
assert.equal(magic.canCast(caster,ally,"quick_heal").ok,true,"allié à 3 cases, portée 3");
assert.match(magic.canCast(caster,far,"quick_heal").reason,/hors de portée/);
assert.match(magic.canCast(caster,foe,"quick_heal").reason,/allié/);
assert.match(magic.canCast(caster,ally,"quick_heal",{lineOfSight:false}).reason,/ligne de vue/);
assert.equal(magic.canCast(caster,caster,"quick_heal",{lineOfSight:false}).ok,true,"sur soi-même, pas besoin de ligne de vue");
assert.match(magic.canCast({...caster,quickAvailable:false},ally,"quick_heal").reason,/action rapide/);
assert.match(magic.canCast(unit({...mage({pm:53,vie:31,int:35}),mana:10}),caster,"quick_heal").reason,/mana/);
assert.match(magic.canCast(unit({...mage({pm:53,vie:31,int:35}),spells:[]}),caster,"quick_heal").reason,/ne connaît pas/);
assert.match(magic.canCast(caster,{...ally,alive:false},"quick_heal").reason,/hors combat/);

// Lancer : réussite (D100 ≤ 57), dé normal ; le mana est toujours payé.
queue=[0.0,0.99,0.5];
let out=magic.cast(caster,ally,"quick_heal");
assert.deepEqual([out.ok,out.success,out.critical,out.fumble,out.die,out.cost],[true,true,false,false,3,11]);
assert.equal(out.amount,magic.effectAmount(caster,"quick_heal",3));
// Coup critique : réussite puis D100 ≤ Chance / 10 : le dé fait son maximum.
queue=[0.0,0.0];
out=magic.cast(caster,ally,"quick_heal");
assert.deepEqual([out.success,out.critical,out.die,out.amount],[true,true,4,35]);
// Échec simple : D100 > 57, sous 96 : rien ne se passe, mais le mana est payé.
queue=[0.9];
out=magic.cast(caster,ally,"quick_heal");
assert.deepEqual([out.success,out.fumble,out.amount,out.selfDamage,out.cost],[false,false,0,0,11]);
// Échec critique : naturel 96 à 100, puis D100 > Chance : le lanceur perd le soin minimum.
queue=[0.99,0.99];
out=magic.cast(caster,ally,"quick_heal");
assert.deepEqual([out.success,out.fumble,out.selfDamage],[false,true,9]);
// Naturel 96 à 100 mais D100 ≤ Chance : simple échec.
queue=[0.97,0.0];
out=magic.cast(caster,ally,"quick_heal");
assert.deepEqual([out.success,out.fumble,out.selfDamage],[false,false,0]);
// Un lancer impossible ne tire rien et ne coûte rien.
queue=[];
out=magic.cast(caster,far,"quick_heal");
assert.equal(out.ok,false);
assert.equal(out.cost,undefined);

console.log("Magie : Soin rapide OK");
