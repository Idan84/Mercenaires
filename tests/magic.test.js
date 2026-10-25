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
    skills:{magic:{Vie:vie,Feu:vie,Nécromancie:20,Illusion:20}},mana,
    spells:["quick_heal","deep_heal","regeneration","mass_heal","restitution","purge"].map(code=>({code,school:"Vie",mastery:level}))
      .concat(["fire_bolt","fireball","fire_ring","flaming_weapon","fire_armor","magma"].map(code=>({code,school:"Feu",mastery:level}))),
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
assert.deepEqual([out.ok,out.success,out.critical,out.fumble,out.dice,out.cost],[true,true,false,false,3,11]);
assert.equal(out.amount,magic.effectAmount(caster,"quick_heal",3));
// Coup critique : réussite puis D100 ≤ Chance / 10 : le dé fait son maximum.
queue=[0.0,0.0];
out=magic.cast(caster,ally,"quick_heal");
assert.deepEqual([out.success,out.critical,out.dice,out.amount],[true,true,4,35]);
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

// École de la Vie (Idan, 2026-10-25) : six sorts, même modèle ; seuls les dés, l'action, la portée, la durée, la zone,
// le mana de base et la difficulté (palier : Novice 30, Adepte 50, Expert 70) changent.
assert.deepEqual(magic.schoolSpells("Vie").map(x=>x.code),["quick_heal","deep_heal","regeneration","mass_heal","restitution","purge"]);
assert.deepEqual(magic.schoolSpells("Vie").map(x=>[x.palier,x.difficulte]),[["Novice",30],["Adepte",50],["Adepte",50],["Expert",70],["Adepte",50],["Novice",30]]);
assert.deepEqual(magic.schoolSpells("Vie").map(x=>x.action),["rapide","principale","principale","principale","principale","rapide"]);
// Débutant : Soin profond 18 à 104 au contact, 23 mana, 31 % ; Régénération 2 tours, 18 mana ; Soin de masse rayon 1,
// 27 mana, 17 % ; Restitution 9 à 87, portée 3, 14 mana ; Purge 8 mana, sans dés.
assert.deepEqual(magic.effectRange(beginner,"deep_heal"),{min:18,max:104});
assert.deepEqual([magic.range(beginner,"deep_heal"),magic.manaCost(beginner,"deep_heal")],[1,23]);
assert.equal(Math.round(magic.castChance(beginner,"deep_heal").p),31);
assert.deepEqual([magic.duration(beginner,"regeneration"),magic.manaCost(beginner,"regeneration"),magic.range(beginner,"regeneration")],[2,18,3]);
assert.deepEqual([magic.zoneRadius(beginner,"mass_heal"),magic.manaCost(beginner,"mass_heal"),magic.range(beginner,"mass_heal")],[1,27,3]);
assert.equal(Math.round(magic.castChance(beginner,"mass_heal").p),17);
assert.deepEqual(magic.effectRange(beginner,"restitution"),{min:9,max:87});
assert.deepEqual([magic.range(beginner,"restitution"),magic.manaCost(beginner,"restitution")],[3,14]);
assert.deepEqual([magic.manaCost(beginner,"purge"),magic.effectRange(beginner,"purge").max],[8,0]);
// Expert : portée de Soin profond 3, Régénération 4 tours, Soin de masse rayon 3 ; 14 et 17 mana.
assert.deepEqual([magic.range(expert,"deep_heal"),magic.duration(expert,"regeneration"),magic.zoneRadius(expert,"mass_heal")],[3,4,3]);
assert.deepEqual([magic.manaCost(expert,"deep_heal"),magic.manaCost(expert,"mass_heal")],[14,17]);

// Conditions : action principale libre ; Soin profond au contact ; Restitution sur un mort-vivant seulement ;
// Purge sur une cible empoisonnée ; Soin de masse sur une case à portée et en ligne de vue.
const adjacent=unit(mage({pm:50,vie:1,int:50}),{q:1,r:0});
const twoAway=unit(mage({pm:50,vie:1,int:50}),{q:2,r:0});
assert.equal(magic.canCast(caster,adjacent,"deep_heal").ok,true);
assert.match(magic.canCast(caster,twoAway,"deep_heal").reason,/hors de portée/);
assert.match(magic.canCast({...caster,attackAvailable:false},adjacent,"deep_heal").reason,/action principale/);
assert.equal(magic.canCast({...caster,attackAvailable:false},adjacent,"quick_heal").ok,true,"l'action rapide reste libre");
const undead=unit({...mage({pm:50,vie:1,int:50}),undead:true},{q:2,r:0,team:"enemy"});
assert.match(magic.canCast(caster,foe,"restitution").reason,/morts-vivants/);
assert.equal(magic.canCast(caster,undead,"restitution").ok,true);
assert.match(magic.canCast(caster,adjacent,"purge").reason,/empoisonnée/);
assert.equal(magic.canCast(caster,{...adjacent,poisoned:true},"purge").ok,true);
assert.equal(magic.canCast(caster,{q:3,r:0},"mass_heal").ok,true);
assert.equal(magic.canCast(caster,{q:0,r:0},"mass_heal").ok,true,"centrée sur le lanceur");
assert.match(magic.canCast(caster,{q:4,r:0},"mass_heal").reason,/hors de portée/);
assert.match(magic.canCast(caster,{q:2,r:0},"mass_heal",{lineOfSight:false}).reason,/ligne de vue/);

// Soin profond : 2D6 ; CC = 12 ; EC = les deux dés à 1 contre le lanceur.
queue=[0.0,0.99,0.5,0.0];
out=magic.cast(caster,adjacent,"deep_heal");
assert.deepEqual([out.success,out.critical,out.dice,out.amount,out.cost],[true,false,5,44,23]);
queue=[0.0,0.0];
assert.deepEqual([magic.cast(caster,adjacent,"deep_heal").dice,magic.effectRange(caster,"deep_heal").max],[12,104]);
queue=[0.99,0.99];
assert.equal(magic.cast(caster,adjacent,"deep_heal").selfDamage,18);
// Régénération : l'effet garde le facteur du lancer ; un tour = 1D4, au maximum si le lancer était critique.
queue=[0.0,0.99];
out=magic.cast(caster,ally,"regeneration");
assert.deepEqual([out.success,out.effect.turns,out.effect.cumulable,out.amount],[true,2,false,0]);
queue=[0.5];
assert.deepEqual(magic.tick(out.effect),{amount:26,dice:3,turnsLeft:1});
assert.equal(magic.tick({...out.effect,critical:true}).amount,35);
assert.equal(magic.tick({...out.effect,turns:0}).amount,0);
// Soin de masse : un seul jet pour tous ; tout le monde dans le cercle, ennemis et lanceur compris.
queue=[0.0,0.99,0.5];
out=magic.cast(caster,{q:1,r:0},"mass_heal");
assert.deepEqual([out.success,out.amount,out.zone.radius],[true,26,1]);
const inZone=magic.unitsInZone(out.zone.center,out.zone.radius,[caster,ally,foe,far,{...adjacent,alive:false}]);
assert.deepEqual(inZone,[caster,foe],"le lanceur et l'ennemi adjacent ; pas l'allié à 3 cases ni un mort");
// Restitution : 1D10 de dégâts contre un mort-vivant (aucune résistance : le combat les appliquera telles quelles).
queue=[0.0,0.99,0.5];
out=magic.cast(caster,undead,"restitution");
assert.deepEqual([out.success,out.dice,out.amount],[true,6,52]);
// Purge : pas de jet de critique ; en échec critique, simple échec (pas de dés).
queue=[0.0];
out=magic.cast(caster,{...adjacent,poisoned:true},"purge");
assert.deepEqual([out.success,out.purge,out.critical,out.amount],[true,true,false,0]);
queue=[0.99,0.99];
out=magic.cast(caster,{...adjacent,poisoned:true},"purge");
assert.deepEqual([out.success,out.fumble,out.selfDamage],[false,true,0]);

// École du Feu (Idan, 2026-10-25). Les mages de test ont le même niveau en Feu qu'en Vie.
assert.deepEqual(magic.schoolSpells("Feu").map(x=>[x.code,x.palier,x.difficulte,x.action]),[
  ["fire_bolt","Novice",30,"principale"],["fireball","Expert",70,"principale"],["fire_ring","Novice",30,"principale"],
  ["flaming_weapon","Novice",30,"rapide"],["fire_armor","Novice",30,"rapide"],["magma","Adepte",50,"rapide"]]);
// Portées, rayons, durées, bonus : débutant (maîtrise 31,5) et expert (134), plafonds à très haute maîtrise.
assert.deepEqual([magic.range(beginner,"fire_bolt"),magic.range(expert,"fire_bolt")],[15,25],"Trait de feu : 12 + M/10 (l'arc : 18)");
assert.deepEqual([magic.range(beginner,"fireball"),magic.zoneRadius(beginner,"fireball")],[7,3]);
assert.deepEqual([magic.range(expert,"fireball"),magic.zoneRadius(expert,"fireball")],[11,5]);
const archmage=unit(mage({pm:100,vie:300,level:100,int:100}));
assert.deepEqual([magic.range(archmage,"fireball"),magic.zoneRadius(archmage,"fireball")],[12,5],"portée 6 à 12, rayon 3 à 5");
assert.deepEqual([magic.zoneRadius(beginner,"fire_ring"),magic.zoneRadius(expert,"fire_ring")],[2,2],"l'anneau : toujours 2 cases");
assert.deepEqual([magic.duration(beginner,"magma"),magic.duration(expert,"magma")],[5,9],"Flaque de magma : 4 + M/25 tours");
assert.deepEqual([magic.duration(beginner,"flaming_weapon"),magic.duration(expert,"flaming_weapon")],[2,4]);
assert.deepEqual([magic.bonus(beginner,"fire_armor"),magic.bonus(expert,"fire_armor")],[36,56],"Armure de feu : +30 + M/5 contre le froid");
assert.deepEqual([magic.manaCost(beginner,"fire_bolt"),magic.manaCost(beginner,"fireball"),magic.manaCost(beginner,"fire_ring")],[9,27,18]);
assert.equal(Math.round(magic.castChance(beginner,"fire_ring").p),57,"Anneau de feu : difficulté abaissée à 30");
assert.equal(magic.precisionChance(beginner,"fireball",4),45.75,"50 + M/2 − 5 × distance");
assert.equal(magic.precisionChance(expert,"fireball",2),95,"au plus 95 %");

// Cibles : Trait de feu vise un ennemi ; Flaque de magma une case vide ; Anneau de feu le lanceur lui-même.
const enemy=unit(mage({pm:50,vie:1,int:50}),{q:5,r:0,team:"enemy"});
assert.match(magic.canCast(caster,ally,"fire_bolt").reason,/ennemi/);
assert.equal(magic.canCast(caster,enemy,"fire_bolt").ok,true);
assert.equal(magic.canCast(caster,{q:2,r:0},"magma").ok,true);
assert.match(magic.canCast(caster,{q:2,r:0},"magma",{cellFree:false}).reason,/case vide/);
assert.match(magic.canCast(caster,{q:0,r:0},"magma").reason,/case vide/);
assert.equal(magic.canCast(caster,null,"fire_ring").ok,true,"pas de cible à choisir");
// Toucher comme une flèche : il baisse avec la distance, monte contre une cible au sol.
const near=unit(mage({pm:50,vie:1,int:50}),{q:2,r:0,team:"enemy"}),farFoe=unit(mage({pm:50,vie:1,int:50}),{q:14,r:0,team:"enemy"});
assert.ok(magic.hitChance(caster,near,"fire_bolt")>magic.hitChance(caster,farFoe,"fire_bolt"));
assert.ok(magic.hitChance(caster,{...near,prone:true},"fire_bolt")>magic.hitChance(caster,near,"fire_bolt"));
for(const t of [near,farFoe]){ const p=magic.hitChance(caster,t,"fire_bolt"); assert.ok(p>=10&&p<=90); }

// Trait de feu : réussite, pas de critique, 1D6 = 4, touché.
queue=[0,0.99,0.5,0];
out=magic.cast(caster,enemy,"fire_bolt",{units:[caster,enemy]});
assert.deepEqual([out.success,out.element,out.dice,out.hit,out.victim===enemy],[true,"feu",4,true,true]);
assert.equal(out.amount,magic.effectAmount(caster,"fire_bolt",4));
// Raté : le trait part dans la ligne de tir et touche un personnage qui s'y trouve.
const between=unit(mage({pm:50,vie:1,int:50}),{q:3,r:0});
queue=[0,0.99,0.5,0.99,0];
out=magic.cast(caster,enemy,"fire_bolt",{units:[caster,between,enemy]});
assert.deepEqual([out.hit,out.stray?.unit===between,out.victim===between],[false,true,true]);
// Boule de feu : précision ratée, elle dévie de 2 cases (1D3) dans la première direction ; dégâts dégressifs.
queue=[0,0.99,0.5,0.5,0.99,0.5,0];
out=magic.cast(caster,{q:4,r:0},"fireball");
assert.deepEqual([out.dice,out.zone.radius,out.zone.precision.ok,out.zone.precision.deviation,out.zone.center],[8,3,false,2,{q:6,r:0}]);
assert.deepEqual([0,1,2,3,4].map(d=>magic.zoneFactor(out.zone,d)),[1,0.75,0.5,0.25,0]);
queue=[0,0.99,0.5,0.5,0];
assert.deepEqual(magic.cast(caster,{q:4,r:0},"fireball").zone.center,{q:4,r:0},"précision réussie : sur la case visée");
// Anneau de feu : autour du lanceur, de 1 à 2 cases, pas le lanceur.
queue=[0,0.99,0.5];
out=magic.cast(caster,null,"fire_ring");
assert.deepEqual([out.zone.center,out.zone.radius,out.zone.minDistance,out.zone.degressive],[{q:0,r:0},2,1,false]);
assert.deepEqual(magic.unitsInZone(out.zone.center,out.zone.radius,[caster,adjacent,twoAway,unit(mage({pm:50,vie:1,int:50}),{q:3,r:0})],1),[adjacent,twoAway]);
// Arme enflammée, Armure de feu, Flaque de magma : effets posés par l'écran de combat.
queue=[0,0.99];
out=magic.cast(caster,adjacent,"flaming_weapon");
assert.deepEqual([out.effect.element,out.effect.turns,out.amount],["feu",2,0]);
queue=[0.5];
assert.deepEqual(magic.weaponStrike(out.effect),{amount:magic.effectAmount(caster,"flaming_weapon",3),dice:3,element:"feu"});
queue=[0];
out=magic.cast(caster,ally,"fire_armor");
assert.deepEqual(out.effect,{code:"fire_armor",element:"froid",bonus:36,turns:2,cumulable:false});
queue=[0];
out=magic.cast(caster,{q:2,r:0},"magma");
assert.deepEqual(out.terrain,{q:2,r:0,turns:5});
// Échec critique d'un sort de feu : le lanceur subit le minimum, en feu.
queue=[0.99,0.99];
out=magic.cast(caster,enemy,"fire_bolt",{units:[caster,enemy]});
assert.deepEqual([out.fumble,out.element,out.selfDamage],[true,"feu",magic.effectAmount(caster,"fire_bolt",1)]);

// Protection contre le feu (moteur) : Résistance au feu + armure (plates −20, écailles +35) + bonus, de −50 à +75.
const armoredUnit=(armor,res,extra={})=>({character:{resistances:{"Résistance au feu":res,"Résistance au froid":res},stats:{},items:armor?[{id:"a",name:armor}]:[],equipment:{slots:armor?{armor:"a"}:{}}},activeSet:1,...extra});
assert.deepEqual(combat.elementalDamage(armoredUnit("Armure de plates",4),"feu",100),{resistance:4,armor:-20,bonus:0,total:-16,applied:-16,amount:100,damage:116});
assert.equal(combat.elementalDamage(armoredUnit("Armure d'écailles",4),"feu",100).damage,61);
assert.equal(combat.elementalDamage(armoredUnit("Armure d'écailles",48),"feu",100).applied,75,"jamais plus de 75 %");
assert.equal(combat.elementalDamage(armoredUnit(null,4,{elementalBonus:{froid:{bonus:36,turns:2}}}),"froid",100).damage,60,"Armure de feu contre le froid");

console.log("Magie : écoles de la Vie et du Feu OK");
