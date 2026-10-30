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

function mage({pm,vie,level=1,int,chance=54,mana=53,charisma=50,items=[],slots={}}){
  return {
    name:"Mage",stats:{"Puissance magique":pm,Intelligence:int,Chance:chance,"Réserve de mana":mana,Constitution:50,Endurance:50,Volonté:50,Charisme:charisma},
    skills:{magic:{Vie:vie,Feu:vie,Eau:vie,Transmutation:vie,Foudre:vie,Télékinésie:vie,Illusion:vie,Nécromancie:vie,Invocation:vie}},mana,
    spells:["quick_heal","deep_heal","regeneration","mass_heal","restitution","purge"].map(code=>({code,school:"Vie",mastery:level}))
      .concat(["fire_bolt","fireball","fire_ring","flaming_weapon","fire_armor","magma"].map(code=>({code,school:"Feu",mastery:level})))
      .concat(["fog","healing_water","ice_arrow","tsunami","frost_armor","freeze","ice_weapon"].map(code=>({code,school:"Eau",mastery:level})))
      .concat(["sixth_sense","titan_strength","cheetah_speed","stone_skin","venom_spit","cauterize"].map(code=>({code,school:"Transmutation",mastery:level})))
      .concat(["shock","lightning_bolt","shock_weapon","chain_lightning","thunder","celerity"].map(code=>({code,school:"Foudre",mastery:level})))
      .concat(["attraction","projection","telekinetic_move","clash","force_field","stone_throw"].map(code=>({code,school:"Télékinésie",mastery:level})))
      .concat(["fear","illusory_support","mass_courage","hidden_advance","psychic_shock","frenzy"].map(code=>({code,school:"Illusion",mastery:level})))
      .concat(["raise_dead","summon_specter","life_drain","death_arrow","necrosis","wither"].map(code=>({code,school:"Nécromancie",mastery:level})))
      .concat(["summon_raven","quagmire","transposition","summon_wolves","summon_bears","summon_crocodiles"].map(code=>({code,school:"Invocation",mastery:level}))),
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

// Grimoire d'abord : le sort prêté au niveau 1 par le bouton de test ne remplace pas le niveau du sort déjà connu.
assert.equal(magic.spellLevel({...practiced,spells:[{code:"quick_heal"}]},"quick_heal"),50);
assert.equal(magic.spellLevel({...unit(mage({pm:53,vie:56,int:53})),character:{...mage({pm:53,vie:56,int:53}),spells:[]},spells:[{code:"quick_heal"}]},"quick_heal"),1);

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

// École de l'Eau (Idan, 2026-10-27). Les mages de test ont le même niveau en Eau qu'en Vie.
assert.deepEqual(magic.schoolSpells("Eau").map(x=>[x.code,x.palier,x.difficulte,x.action]),[
  ["fog","Adepte",50,"principale"],["healing_water","Novice",30,"rapide"],["ice_arrow","Novice",30,"principale"],
  ["tsunami","Adepte",50,"principale"],["frost_armor","Novice",30,"rapide"],["freeze","Adepte",50,"rapide"],["ice_weapon","Novice",30,"rapide"]]);
// Eau guérissante : 1D3, moins que Soin rapide (1D4) ; 10 mana de base.
assert.deepEqual(magic.effectRange(beginner,"healing_water"),{min:9,max:26});
assert.ok(magic.effectRange(expert,"healing_water").max<magic.effectRange(expert,"quick_heal").max);
assert.deepEqual([magic.manaCost(beginner,"healing_water"),magic.range(beginner,"healing_water")],[9,3]);
// Flèche de glace : le Trait de feu en froid.
assert.deepEqual([magic.range(beginner,"ice_arrow"),magic.range(expert,"ice_arrow"),magic.manaCost(beginner,"ice_arrow")],[15,25,9]);
assert.deepEqual(magic.effectRange(beginner,"ice_arrow"),magic.effectRange(beginner,"fire_bolt"));
// Tsunami : la case voisine seulement ; une ligne de 3 + M/50 cases, de 3 à 5.
assert.deepEqual([magic.range(beginner,"tsunami"),magic.range(expert,"tsunami")],[1,1]);
assert.deepEqual([magic.zoneLength(beginner,"tsunami"),magic.zoneLength(expert,"tsunami"),magic.zoneLength(archmage,"tsunami")],[3,5,5]);
// Brouillard : 5 cases, 3 tours fixes (Idan : « fixe »), posé jusqu'à 2 + M/25 cases.
assert.deepEqual([magic.zoneLength(beginner,"fog"),magic.duration(beginner,"fog"),magic.duration(archmage,"fog")],[5,3,3]);
assert.deepEqual([magic.range(beginner,"fog"),magic.range(expert,"fog")],[3,7]);
// Gel : −(20 + M/5) en Vitesse et en Dextérité, pendant 1 + M/100 tours, à 1 + M/50 cases.
assert.deepEqual(magic.targetStats("freeze"),["Vitesse","Dextérité"]);
assert.deepEqual([magic.bonus(beginner,"freeze"),magic.bonus(expert,"freeze")],[26,46]);
assert.deepEqual([magic.duration(beginner,"freeze"),magic.duration(expert,"freeze"),magic.duration(archmage,"freeze")],[1,2,2],"1 ou 2 tours (Idan)");
assert.deepEqual([magic.range(beginner,"freeze"),magic.range(expert,"freeze")],[1,3]);
// Armure de froid et Arme de glace : les miroirs de l'Armure de feu et de l'Arme enflammée.
assert.deepEqual([magic.bonus(beginner,"frost_armor"),magic.bonus(expert,"frost_armor")],[36,56]);
assert.deepEqual([magic.duration(beginner,"ice_weapon"),magic.duration(expert,"ice_weapon")],[2,4]);

// Tsunami : pas sur sa propre case ; la vague part de la case voisine, droit devant, et frappe tout le monde dans la ligne.
assert.match(magic.canCast(caster,{q:0,r:0},"tsunami").reason,/case voisine/);
assert.match(magic.canCast(caster,{q:2,r:0},"tsunami").reason,/hors de portée/);
assert.equal(magic.canCast(caster,{q:0,r:1},"tsunami").ok,true);
queue=[0,0.99,0.5,0.5];
out=magic.cast(caster,{q:1,r:0},"tsunami");
assert.deepEqual([out.success,out.element,out.dice,out.zone.shape,out.zone.length],[true,"froid",8,"ligne",3]);
assert.deepEqual(out.zone.cells,[{q:1,r:0},{q:2,r:0},{q:3,r:0}]);
assert.deepEqual(magic.unitsInCells(out.zone.cells,[caster,adjacent,twoAway,ally,enemy]),[adjacent,twoAway,ally],"alliés compris");
// Brouillard : 5 cases centrées sur la case visée, en travers de la direction du lanceur.
queue=[0];
out=magic.cast(caster,{q:3,r:0},"fog");
assert.equal(out.fog.turns,3);
assert.equal(out.fog.cells.length,5);
assert.ok(out.fog.cells.some(c=>c.q===3&&c.r===0),"centré sur la case visée");
assert.equal(out.fog.cells.filter(c=>c.r===0).length,1,"en travers : une seule case sur la ligne du lanceur");
assert.deepEqual(magic.wallCells({q:0,r:0},{q:0,r:3},5),[{q:-2,r:3},{q:-1,r:3},{q:0,r:3},{q:1,r:3},{q:2,r:3}]);
// Ligne de vue : les cases traversées, extrémités comprises.
assert.deepEqual(combat.hexLine({q:0,r:0},{q:3,r:0}),[{q:0,r:0},{q:1,r:0},{q:2,r:0},{q:3,r:0}]);
assert.equal(combat.hexLine({q:0,r:0},{q:2,r:1}).length,4);
assert.deepEqual(combat.hexLine({q:2,r:2},{q:2,r:2}),[{q:2,r:2}]);
assert.match(magic.canCast(caster,enemy,"ice_arrow",{lineOfSight:false}).reason,/ligne de vue/);
// Gel : le malus baisse avec la protection contre le froid de la cible (Résistance au froid 20 : 26 × 0,8 → 21).
const frozen=mage({pm:50,vie:1,int:50});
Object.assign(frozen.stats,{Vitesse:50,Dextérité:40});
frozen.resistances={"Résistance au froid":20};
const chilled=unit(frozen,{q:1,r:0,team:"enemy"});
assert.match(magic.canCast(caster,adjacent,"freeze").reason,/ennemi/);
assert.match(magic.canCast(caster,{...chilled,q:2},"freeze").reason,/hors de portée/);
queue=[0];
out=magic.cast(caster,chilled,"freeze");
assert.deepEqual(out.effect,{code:"freeze",element:"froid",stats:["Vitesse","Dextérité"],raw:26,malus:21,protection:20,turns:1,cumulable:false});
queue=[0];
assert.equal(magic.cast(caster,{...chilled,elementalBonus:{froid:{bonus:36,turns:2}}},"freeze").effect.malus,12,"l'Armure de feu protège du Gel");
// Le moteur retire le malus des caractéristiques : Vitesse, Dextérité, donc mouvement, toucher et initiative.
const slowed={...chilled,statMalus:{stats:out.effect.stats,malus:21}};
assert.deepEqual([combat.statWithGear(chilled,"Vitesse"),combat.statWithGear(slowed,"Vitesse")],[50,29]);
assert.deepEqual([combat.statWithGear(chilled,"Dextérité"),combat.statWithGear(slowed,"Dextérité")],[40,19]);
assert.equal(combat.statWithGear(slowed,"Intelligence"),50,"les autres caractéristiques ne changent pas");
assert.ok(combat.movementBase(slowed)<combat.movementBase(chilled));
// Eau guérissante, Flèche de glace, Arme de glace, Armure de froid.
queue=[0,0.99,0.5];
out=magic.cast(caster,ally,"healing_water");
assert.deepEqual([out.success,out.effet,out.dice,out.amount],[true,"soin",2,magic.effectAmount(caster,"healing_water",2)]);
queue=[0,0.99,0.5,0];
out=magic.cast(caster,enemy,"ice_arrow",{units:[caster,enemy]});
assert.deepEqual([out.success,out.element,out.hit],[true,"froid",true]);
queue=[0,0.99];
out=magic.cast(caster,adjacent,"ice_weapon");
assert.deepEqual([out.effect.element,out.effect.turns],["froid",2]);
queue=[0.5];
assert.equal(magic.weaponStrike(out.effect).element,"froid");
queue=[0];
out=magic.cast(caster,ally,"frost_armor");
assert.deepEqual(out.effect,{code:"frost_armor",element:"feu",bonus:36,turns:2,cumulable:false});
assert.equal(combat.elementalDamage(armoredUnit(null,4,{elementalBonus:{feu:{bonus:36,turns:2}}}),"feu",100).damage,60,"Armure de froid contre le feu");

// École de la Transmutation (Idan, 2026-10-27) : des bonus, action rapide, portée 3 + M/25, 1 tour (2 pour un maître).
assert.deepEqual(magic.schoolSpells("Transmutation").map(x=>[x.code,x.palier,x.difficulte,x.action,x.cible]),[
  ["sixth_sense","Adepte",50,"rapide","allie_ou_soi"],["titan_strength","Novice",30,"rapide","allie_ou_soi"],
  ["cheetah_speed","Novice",30,"rapide","allie_ou_soi"],["stone_skin","Novice",30,"rapide","allie_ou_soi"],
  ["venom_spit","Adepte",50,"rapide","allie_ou_soi"],["cauterize","Novice",30,"rapide","allie_ou_soi"]]);
assert.deepEqual([magic.range(beginner,"titan_strength"),magic.range(expert,"titan_strength")],[4,8],"portée moyenne : 3 + M/25");
assert.deepEqual([magic.duration(beginner,"titan_strength"),magic.duration(expert,"titan_strength"),magic.duration(archmage,"titan_strength")],[1,2,2]);
assert.deepEqual([magic.bonus(beginner,"titan_strength"),magic.bonus(expert,"titan_strength")],[26,46],"+20 + M/5 %");
assert.deepEqual([magic.bonus(beginner,"stone_skin"),magic.bonus(expert,"stone_skin")],[13,23],"Peau de pierre : +10 + M/10 points");
assert.deepEqual(magic.targetStats("sixth_sense"),["Perception","Dextérité"]);
assert.deepEqual([magic.manaCost(beginner,"titan_strength"),magic.manaCost(beginner,"sixth_sense"),magic.manaCost(beginner,"venom_spit")],[9,11,11]);
assert.deepEqual(magic.effectRange(beginner,"cauterize"),magic.effectRange(beginner,"healing_water"),"Cautérisation : 1D3, comme Eau guérissante");
// Le bonus posé, puis compté par le moteur : un pourcentage de la valeur de base, ou des points.
queue=[0];
out=magic.cast(caster,ally,"titan_strength");
assert.deepEqual(out.effect,{code:"titan_strength",stats:["Force"],value:26,unit:"pourcentage",turns:1,cumulable:false});
queue=[0];
assert.deepEqual(magic.cast(caster,ally,"stone_skin").effect.unit,"points");
const brawler=mage({pm:50,vie:1,int:50});
Object.assign(brawler.stats,{Force:50,Vitesse:40,Perception:60,Dextérité:44});
brawler.resistances={"Résistance physique":5};
const buffed=unit(brawler,{statBuffs:{titan_strength:{stats:["Force"],value:26,unit:"pourcentage"},stone_skin:{stats:["Résistance physique"],value:13,unit:"points"},
  sixth_sense:{stats:["Perception","Dextérité"],value:50,unit:"pourcentage"}}});
assert.equal(combat.statWithGear(buffed,"Force"),63);
assert.equal(combat.statWithGear(buffed,"Résistance physique"),18);
assert.deepEqual([combat.statWithGear(buffed,"Perception"),combat.statWithGear(buffed,"Dextérité")],[90,66]);
assert.equal(combat.statWithGear(buffed,"Vitesse"),40,"une caractéristique sans bonus ne bouge pas");
assert.equal(combat.statWithGear({...buffed,statMalus:{stats:["Dextérité"],malus:10}},"Dextérité"),56,"bonus et Gel s'additionnent");
// Crachat de venin : un tir accordé, qui garde la Puissance et la Maîtrise du lanceur.
queue=[0];
out=magic.cast(caster,ally,"venom_spit");
assert.deepEqual([out.effect.element,out.effect.mastery,out.effect.min,out.effect.max,out.effect.turns],["poison",31.5,2,10,1]);
assert.equal(out.effect.factor,magic.effectFactor(caster,"venom_spit"));
const spitter=unit(mage({pm:50,vie:1,int:50}),{venom:out.effect});
const target5=unit(mage({pm:50,vie:1,int:50}),{q:5,r:0,team:"enemy"});
assert.match(magic.canSpit(unit(mage({pm:50,vie:1,int:50})),target5).reason,/venin/);
assert.match(magic.canSpit(spitter,{...target5,q:1}).reason,/hors de portée/i);
assert.match(magic.canSpit(spitter,{...target5,q:11}).reason,/hors de portée/i);
assert.match(magic.canSpit(spitter,ally).reason,/ennemi/);
assert.match(magic.canSpit({...spitter,quickAvailable:false},target5).reason,/action rapide/);
assert.match(magic.canSpit(spitter,target5,{lineOfSight:false}).reason,/ligne de vue/);
assert.equal(magic.spitChance(spitter,target5),magic.hitChance(spitter,target5,"venom_spit",{mastery:31.5,reach:10}));
queue=[0,0.5];
out=magic.spit(spitter,target5);
assert.deepEqual([out.hit,out.dice,out.element],[true,3,"poison"]);
assert.equal(out.amount,Math.ceil(30*spitter.venom.factor-1e-9));
assert.deepEqual(out.poison,{turns:3,amount:Math.ceil(10*spitter.venom.factor-1e-9)},"empoisonne 3 tours : le minimum du venin");
queue=[0.99];
assert.deepEqual([magic.spit(spitter,target5).hit,magic.spit(spitter,target5).poison],[false,undefined]);
// Poison (moteur) : jet de résistance D100 ≤ Constitution / 2 + Résistance au poison ; l'armure ne protège pas.
const sick=unit(mage({pm:50,vie:1,int:50}),{poisoned:{turns:3,amount:20}});
assert.equal(combat.poisonResistChance(sick),25,"Constitution 50 / 2");
queue=[0];
assert.deepEqual(combat.resolvePoison(sick),{p:25,roll:1,resisted:true,damage:0});
queue=[0.5];
let tick=combat.resolvePoison(sick);
assert.deepEqual([tick.resisted,tick.roll,tick.damage],[false,51,20]);
const tough=mage({pm:50,vie:1,int:50});
tough.resistances={"Résistance au poison":20};
queue=[0.5];
tick=combat.resolvePoison(unit(tough,{poisoned:{turns:3,amount:20}}));
assert.deepEqual([tick.p,tick.resisted,tick.damage],[45,false,16],"la Résistance au poison aide au jet et réduit les dégâts");
assert.equal(combat.elementalDamage(armoredUnit("Armure de plates",4),"poison",100).armor,0,"l'armure ne compte pas contre le poison");
assert.equal(combat.resolvePoison(unit(tough)),null,"pas empoisonné : rien");
assert.equal(magic.isPoisoned(sick),true);

// École de la Foudre (Idan, 2026-10-27).
assert.deepEqual(magic.schoolSpells("Foudre").map(x=>[x.code,x.palier,x.difficulte,x.action,x.cible]),[
  ["shock","Adepte",50,"principale","ennemi"],["lightning_bolt","Novice",30,"principale","ennemi"],
  ["shock_weapon","Novice",30,"rapide","allie_ou_soi"],["chain_lightning","Expert",70,"principale","ennemi"],
  ["thunder","Adepte",50,"principale","ennemi"],["celerity","Novice",30,"rapide","soi"]]);
// Décharge électrique : au contact, 2D8 ; portée moyenne des attaques : 6 + M/25, au plus 12 ; Éclair comme la Flèche de glace.
assert.deepEqual([magic.range(beginner,"shock"),magic.range(expert,"shock")],[1,1]);
assert.deepEqual(magic.dice("shock"),{count:2,sides:8});
assert.deepEqual(magic.effectRange(beginner,"shock"),{min:18,max:139});
assert.deepEqual([magic.range(beginner,"chain_lightning"),magic.range(expert,"chain_lightning"),magic.range(archmage,"chain_lightning")],[7,11,12]);
assert.deepEqual([magic.range(beginner,"thunder"),magic.range(expert,"thunder"),magic.range(archmage,"thunder")],[7,11,12]);
assert.deepEqual([magic.range(beginner,"lightning_bolt"),magic.effectRange(beginner,"lightning_bolt")],[15,magic.effectRange(beginner,"ice_arrow")]);
assert.deepEqual([magic.duration(beginner,"shock_weapon"),magic.duration(expert,"shock_weapon")],[2,4]);
// Célérité : sur soi seulement, 2 tours fixes, +20 + M/5 % de Vitesse.
assert.deepEqual([magic.duration(beginner,"celerity"),magic.duration(archmage,"celerity"),magic.bonus(beginner,"celerity")],[2,2,26]);
queue=[0];
out=magic.cast(caster,ally,"celerity");
assert.deepEqual(out.effect,{code:"celerity",stats:["Vitesse"],value:26,unit:"pourcentage",turns:2,cumulable:false},"la cible est toujours le lanceur");
// Foudre : pas besoin de ligne de vue (le brouillard ne l'arrête pas) ; Décharge et Éclair, si.
assert.equal(magic.canCast(caster,enemy,"thunder",{lineOfSight:false}).ok,true);
assert.match(magic.canCast(caster,foe,"shock",{lineOfSight:false}).reason,/ligne de vue/);
assert.match(magic.canCast(caster,enemy,"shock").reason,/hors de portée/);
// Décharge : sans jet de toucher, 2D8 de foudre.
queue=[0,0.99,0.5,0.5];
out=magic.cast(caster,foe,"shock");
assert.deepEqual([out.success,out.element,out.dice,out.hit,out.amount],[true,"foudre",10,undefined,magic.effectAmount(caster,"shock",10)]);
// Boule d'éclairs : la cible, puis quatre rebonds vers le plus proche pas encore touché, à 3 cases au plus, alliés et
// lanceur compris ; 100, 80, 60, 40, 20 %.
const at=(q,r,team="enemy")=>unit(mage({pm:50,vie:1,int:50}),{q,r,team});
const c0=at(5,0),c1=at(6,0),c2=at(6,1,"player"),c3=at(9,1),c4=at(11,1),loner=at(20,0);
let chain=magic.chainTargets(caster,c0,"chain_lightning",[caster,c0,c1,c2,c3,c4,loner]);
assert.deepEqual(chain.map(x=>x.unit),[c0,c1,c2,c3,c4],"le plus proche à chaque fois ; l'allié c2 compris ; pas l'isolé");
assert.deepEqual(chain.map(x=>x.factor),[1,0.8,0.6,0.4,0.2]);
// À égalité de distance, un ennemi du lanceur d'abord ; plus personne à 3 cases : la chaîne s'arrête.
const side=at(6,-1,"player");
chain=magic.chainTargets(caster,c0,"chain_lightning",[caster,c0,side,c1]);
assert.deepEqual(chain.map(x=>x.unit),[c0,c1,side],"c1 (ennemi) avant side (allié), puis side");
assert.deepEqual(magic.chainTargets(caster,loner,"chain_lightning",[caster,c0,loner]).map(x=>x.unit),[loner],"personne à 3 cases");
const near0=at(2,0,"player");
assert.ok(magic.chainTargets(caster,near0,"chain_lightning",[caster,near0]).some(x=>x.unit===caster),"le lanceur peut être touché");
queue=[0,0.99,0.5,0.5];
out=magic.cast(caster,c0,"chain_lightning",{units:[caster,c0,c1,c2,c3,c4]});
assert.deepEqual([out.success,out.element,out.dice,out.chain.length],[true,"foudre",8,5]);

// École de la Télékinésie (Idan, 2026-10-28) : dégâts contondants qui passent par l'armure.
assert.deepEqual(magic.schoolSpells("Télékinésie").map(x=>[x.code,x.palier,x.difficulte,x.action,x.cible]),[
  ["attraction","Adepte",50,"principale","ennemi"],["projection","Novice",30,"principale","ennemi"],
  ["telekinetic_move","Novice",30,"rapide","allie_ou_ennemi"],["clash","Adepte",50,"principale","ennemi"],
  ["force_field","Adepte",50,"principale","allie_ou_soi"],["stone_throw","Novice",30,"rapide","ennemi"]]);
assert.deepEqual([magic.range(beginner,"attraction"),magic.range(expert,"attraction")],[15,25],"grande portée : 12 + M/10");
assert.deepEqual([magic.range(beginner,"projection"),magic.range(expert,"projection"),magic.range(archmage,"projection")],[7,11,12]);
assert.deepEqual([magic.forceSteps(beginner,"projection"),magic.forceSteps(expert,"projection")],[2,4],"2 + M/50 cases");
assert.deepEqual([magic.dice("attraction"),magic.dice("projection"),magic.dice("clash"),magic.dice("stone_throw")],
  [{count:1,sides:6},{count:1,sides:8},{count:2,sides:8},{count:1,sides:6}],"un cran de dé de plus, l'armure comptant (Idan)");
assert.deepEqual([magic.duration(beginner,"force_field"),magic.duration(archmage,"force_field"),magic.bonus(beginner,"force_field")],[4,4,50]);
// Lancer de pierre : la Fronde, de 2 à 14 cases.
assert.match(magic.canCast(caster,foe,"stone_throw").reason,/Trop près/);
assert.equal(magic.canCast(caster,enemy,"stone_throw").ok,true);
assert.match(magic.canCast(caster,{...enemy,q:15},"stone_throw").reason,/hors de portée/);
// Déplacement : un autre personnage, allié ou ennemi, puis une case libre voisine de lui.
assert.match(magic.canCast(caster,caster,"telekinetic_move").reason,/autre personnage/);
assert.equal(magic.canCast(caster,ally,"telekinetic_move").ok,true);
queue=[0];
assert.match(magic.cast(caster,ally,"telekinetic_move",{destination:{q:5,r:0}}).reason,/case libre voisine/);
assert.match(magic.cast(caster,ally,"telekinetic_move",{destination:{q:4,r:0},destinationFree:false}).reason,/case libre voisine/);
queue=[0];
out=magic.cast(caster,ally,"telekinetic_move",{destination:{q:4,r:0}});
assert.deepEqual([out.success,out.move],[true,{kind:"case",destination:{q:4,r:0}}]);
// Projection : dégâts contondants (puissance 35), 2 cases droit dans l'axe, et un choc tiré d'avance (1D4).
queue=[0,0.99,0.5,0.5];
out=magic.cast(caster,enemy,"projection");
assert.deepEqual(out.physical,{type:"contondant",power:35,mastery:31.5});
assert.deepEqual([out.dice,out.move.kind,out.move.steps,out.move.cells],[5,"repousse",2,[{q:6,r:0},{q:7,r:0}]]);
assert.equal(out.move.chocAmount,Math.ceil(10*3*magic.effectFactor(caster,"projection")-1e-9));
assert.deepEqual(magic.pushCells({q:0,r:0},{q:0,r:2},3),[{q:0,r:3},{q:0,r:4},{q:0,r:5}],"dans l'axe, quelle que soit la direction");
// Attraction : vers le lanceur, jusqu'à la case voisine de lui.
assert.deepEqual(magic.pullCells({q:0,r:0},{q:5,r:0},2),[{q:4,r:0},{q:3,r:0}]);
assert.deepEqual(magic.pullCells({q:0,r:0},{q:3,r:0},9),[{q:2,r:0},{q:1,r:0}],"jamais sur la case du lanceur");
assert.deepEqual(magic.pullCells({q:0,r:0},{q:1,r:0},3),[],"déjà au contact");
// Entrechoc : deux ennemis côte à côte, à portée.
const pairA=at(3,0),pairB=at(4,0),pairFar=at(5,0);
assert.equal(magic.canCastPair(caster,pairA,pairB,"clash").ok,true);
assert.match(magic.canCastPair(caster,pairA,pairFar,"clash").reason,/côte à côte/);
assert.match(magic.canCastPair(caster,pairA,ally,"clash").reason,/second ennemi/);
assert.match(magic.canCastPair(caster,pairA,pairB,"clash",{secondLineOfSight:false}).reason,/ligne de vue/);
queue=[0,0.99,0.5,0.5];
out=magic.cast(caster,pairA,"clash",{second:pairB});
assert.deepEqual([out.success,out.second===pairB,out.physical.power],[true,true,55]);
assert.match(magic.cast(caster,pairA,"clash",{second:pairFar}).reason,/côte à côte/);
// Champ de protection : 50 % de dévier les sorts qui volent comme une flèche (et le venin).
queue=[0];
out=magic.cast(caster,ally,"force_field");
assert.deepEqual(out.effect,{code:"force_field",chance:50,turns:4});
const shielded=unit(mage({pm:50,vie:1,int:50}),{q:5,r:0,team:"enemy",projectileShield:{chance:50}});
queue=[0,0.99,0.5,0.4];
out=magic.cast(caster,shielded,"lightning_bolt",{units:[caster,shielded]});
assert.deepEqual([out.success,out.deflected,out.deflectRoll,out.hit],[true,true,41,false]);
queue=[0,0.99,0.5,0.6,0];
out=magic.cast(caster,shielded,"lightning_bolt",{units:[caster,shielded]});
assert.deepEqual([out.deflected,out.hit],[undefined,true],"jet 61 > 50 : le projectile passe");
queue=[0.3];
assert.equal(magic.spit({...spitter,quickAvailable:true},shielded).deflected,true,"le venin aussi");
// Moteur : l'étape Blesser d'un sort contondant (Puissance magique + 0,2 × Maîtrise + puissance − armure − Endurance).
const blunt=unit(mage({pm:50,vie:1,int:50}));
const plated=armoredUnit("Armure de plates",4,{});
plated.character.stats={Endurance:50};
const stripped=armoredUnit(null,4,{});
stripped.character.stats={Endurance:50};
queue=[0,0];
let wound=combat.spellPhysicalHit(blunt,stripped,100,{type:"contondant",power:35,mastery:50});
assert.deepEqual([wound.armorResistance,wound.matchup,wound.wound,wound.resistanceRoll],[0,35,true,1]);
assert.equal(Math.round(wound.pWound),Math.round(10+80/(1+Math.exp(-(50+10+35-50)/20))));
assert.equal(wound.damage,100,"Résistance physique 0");
queue=[0.99];
wound=combat.spellPhysicalHit(blunt,plated,100,{type:"contondant",power:35,mastery:50});
assert.deepEqual([wound.armorResistance,wound.matchup,wound.wound,wound.damage],[38,-3,false,0],"l'armure encaisse");
queue=[0.99];
assert.ok(combat.spellPhysicalHit(blunt,plated,100,{type:"contondant",power:35,mastery:50}).pWound
  <combat.spellPhysicalHit(blunt,stripped,100,{type:"contondant",power:35,mastery:50}).pWound,"l'armure fait baisser la chance de blesser");
// Moteur : un tir d'arme sur un personnage protégé est dévié avant le Toucher.
assert.match(fs.readFileSync(path.join(ROOT,"game-core","combat-engine.js"),"utf8"),/if\(mode==="ranged"&&defender\.projectileShield\)/);

// École de l'Illusion (Idan, 2026-10-28).
assert.deepEqual(magic.schoolSpells("Illusion").map(x=>[x.code,x.palier,x.difficulte,x.action,x.cible]),[
  ["fear","Expert",70,"principale","case"],["illusory_support","Novice",30,"rapide","allie_ou_soi"],
  ["mass_courage","Adepte",50,"principale","case"],["hidden_advance","Adepte",50,"principale","case"],
  ["psychic_shock","Novice",30,"principale","ennemi"],["frenzy","Adepte",50,"rapide","personnage"]]);
assert.deepEqual([magic.range(beginner,"fear"),magic.zoneRadius(beginner,"fear"),magic.zoneRadius(archmage,"fear")],[7,2,3],"zone de 2 à 3 cases");
assert.deepEqual([magic.range(beginner,"illusory_support"),magic.bonus(beginner,"illusory_support"),magic.bonus(expert,"illusory_support")],[15,36,56]);
assert.deepEqual([magic.duration(beginner,"illusory_support"),magic.duration(archmage,"illusory_support")],[2,2],"2 tours");
assert.deepEqual([magic.duration(beginner,"mass_courage"),magic.duration(expert,"mass_courage"),magic.duration(archmage,"mass_courage")],[2,3,3],"2 à 3 tours");
assert.deepEqual([magic.bonus(beginner,"mass_courage"),magic.bonus(beginner,"hidden_advance"),magic.bonus(expert,"hidden_advance")],[26,46,66]);
assert.deepEqual(magic.targetStats("hidden_advance"),["Discrétion"]);
assert.deepEqual([magic.range(beginner,"frenzy"),magic.duration(expert,"frenzy"),magic.bonus(expert,"frenzy")],[3,2,10],"portée courte, 2 tours, +10 %");
// Peur : la zone et la Maîtrise du lanceur ; Frénésie : sur n'importe qui, le lanceur compris.
queue=[0];
out=magic.cast(caster,{q:4,r:0},"fear");
assert.deepEqual([out.success,out.zone,out.fear],[true,{center:{q:4,r:0},radius:2},{mastery:31.5}]);
assert.equal(magic.canCast(caster,caster,"frenzy").ok,true);
queue=[0];
out=magic.cast(caster,foe,"frenzy");
assert.deepEqual(out.effect,{code:"frenzy",stats:["Force"],value:10,unit:"pourcentage",turns:2});
queue=[0];
out=magic.cast(caster,{q:1,r:0},"mass_courage");
assert.deepEqual([out.zone.radius,out.effect.stats,out.effect.value,out.effect.unit,out.effect.turns],[2,["Courage"],26,"points",2]);
// Choc psychique : × Volonté du lanceur / Volonté de la cible, de 0,5 à 2 ; ni armure ni résistance.
const willed=w=>unit({...mage({pm:50,vie:1,int:50}),stats:{Volonté:w}},{q:5,r:0,team:"enemy"});
assert.deepEqual([magic.willFactor(caster,willed(25)),magic.willFactor(caster,willed(40)),magic.willFactor(caster,willed(100)),magic.willFactor(caster,willed(400))],[2,1.25,0.5,0.5]);
queue=[0,0.99,0.5,0];
out=magic.cast(caster,enemy,"psychic_shock",{units:[caster,enemy]});
assert.deepEqual([out.success,out.psychic,out.physical,out.hit],[true,true,undefined,true]);
// Moteur : la Peur, le test de Courage avec la Maîtrise et la Volonté du lanceur à la place de l'Intimidation.
const brave=extra=>({character:{name:"Brave",stats:{Courage:50,Volonté:50},items:[],equipment:{slots:{}}},activeSet:1,team:"enemy",alive:true,...extra});
const seer={character:{name:"Mage",stats:{Volonté:60},items:[],equipment:{slots:{}}},activeSet:1,team:"player"};
assert.equal(combat.fearHold(brave(),seer,56.5),50+12.5-0.25*(56.5+60));
queue=[0.99];
let fear=combat.resolveFear(brave(),seer,56.5);
assert.deepEqual([fear.roll,fear.flees],[100,true]);
queue=[0];
assert.equal(combat.resolveFear(brave(),seer,56.5).flees,false);
assert.equal(combat.resolveFear(brave({fleeing:true}),seer,56.5),null,"déjà en fuite");
assert.equal(combat.resolveFear(brave({frenzy:{turns:2}}),seer,56.5),null,"en frénésie : plus de peur");
// Frénésie : plus de test de Courage après une blessure ni après un coup qui ne blesse pas.
assert.equal(combat.resolveCourage(seer,brave({frenzy:{turns:1}}),{ok:true,wound:true,mode:"melee"},{units:[]}),null);
assert.equal(combat.resolveCourage(brave({frenzy:{turns:1}}),seer,{ok:true,wound:false,mode:"melee"},{units:[]}),null);
// Le bonus de Discrétion (Avancée cachée) passe par les compétences.
assert.equal(combat.statWithGear({character:{skills:{martial:{Discrétion:30}},items:[],equipment:{slots:{}}},activeSet:1,
  statBuffs:{hidden_advance:{stats:["Discrétion"],value:46,unit:"points"}}},"Discrétion"),76);

// École de la Nécromancie (Idan, 2026-10-28) : le Charisme compte ; profils débutant / recrue / expert (Charisme supposé
// égal à l'Intelligence : 35 / 53 / 73).
const novice=unit(mage({pm:53,vie:31,int:35,charisma:35}));
const recruit=unit(mage({pm:53,vie:56,int:53,charisma:53}));
const master=unit(mage({pm:69,vie:84,level:100,int:73,charisma:73}));
// Maintien : la formule de réussite d'un sort, Charisme à la place de l'Intelligence, difficulté 30 : 57 / 81 / 94 %.
assert.deepEqual([novice,recruit,master].map(x=>Math.round(magic.holdChance(x,"raise_dead"))),[57,81,94]);
// Entretien 5 × (1 − M/300) : 5 / 5 / 3 ; mana des sorts : Résurrection 27 / 25 / 17, Spectre 23 / 21 / 14.
assert.deepEqual([novice,recruit,master].map(x=>magic.upkeepCost(x,"summon_specter")),[5,5,3]);
assert.deepEqual([novice,recruit,master].map(x=>magic.manaCost(x,"raise_dead")),[27,25,17]);
assert.deepEqual([novice,recruit,master].map(x=>magic.manaCost(x,"summon_specter")),[23,21,14]);
// Zombie : (M + Charisme) / 2 %, de 10 à 100 : 33 / 55 / 100.
assert.deepEqual([novice,recruit,master].map(x=>Math.round(magic.zombieShare(x,"raise_dead"))),[33,55,100]);
assert.equal(magic.zombieShare(unit(mage({pm:50,vie:1,int:50,charisma:5})),"raise_dead"),10,"au moins 10 %");
// Durées : Drain de vie 2 / 3 / 3, Flétrissement 3 / 3 / 4 ; portée de la Flèche de mort 7 / 8 / 11.
assert.deepEqual([novice,recruit,master].map(x=>magic.duration(x,"life_drain")),[2,3,3]);
assert.deepEqual([novice,recruit,master].map(x=>magic.duration(x,"wither")),[3,3,4]);
assert.deepEqual([novice,recruit,master].map(x=>magic.range(x,"death_arrow")),[7,8,11]);
// Résurrection : le corps d'un combattant mort, au contact, sur lequel personne ne se tient.
const corpse=unit(mage({pm:50,vie:1,int:50}),{q:1,r:0,team:"enemy",alive:false});
assert.equal(magic.isCorpse(corpse),true);
assert.equal(magic.canCast(recruit,corpse,"raise_dead").ok,true);
assert.match(magic.canCast(recruit,{...corpse,alive:true},"raise_dead").reason,/le corps d'un combattant mort/);
assert.match(magic.canCast(recruit,{...corpse,raised:true},"raise_dead").reason,/le corps d'un combattant mort/);
assert.match(magic.canCast(recruit,{...corpse,summon:{}},"raise_dead").reason,/le corps d'un combattant mort/,"une invocation ne laisse pas de corps");
assert.match(magic.canCast(recruit,corpse,"raise_dead",{cellFree:false}).reason,/Quelqu'un se tient sur le corps/);
assert.match(magic.canCast(recruit,{...corpse,q:2},"raise_dead").reason,/hors de portée/);
queue=[0];
let raised=magic.cast(recruit,corpse,"raise_dead");
assert.deepEqual(raised.summon,{code:"raise_dead",creature:"zombie",upkeep:5,share:54.75,cell:{q:1,r:0}});
// Invocation de spectre : une case libre voisine.
queue=[0];
assert.deepEqual(magic.cast(recruit,{q:0,r:1},"summon_specter").summon,{code:"summon_specter",creature:"specter",upkeep:5,share:100,cell:{q:0,r:1},
  count:{count:1,rolled:null,dice:null,bonus:0}});
assert.equal(magic.canCast(recruit,{q:0,r:1},"summon_specter",{cellFree:false}).ok,false);
// Drain de vie : 50 % ; Flétrissement : sa durée.
queue=[0];
assert.deepEqual(magic.cast(recruit,recruit,"life_drain").effect,{code:"life_drain",percent:50,turns:3});
const victim=unit(mage({pm:50,vie:1,int:50}),{q:5,r:0,team:"enemy"});
queue=[0];
assert.deepEqual(magic.cast(recruit,victim,"wither").effect,{code:"wither",turns:3});
// Flèche de mort et Nécrose : dégâts nécrotiques ; jamais sur un mort-vivant.
queue=[0,0.99,0.5,0];
const arrow=magic.cast(recruit,victim,"death_arrow",{units:[recruit,victim]});
assert.deepEqual([arrow.necrotic,arrow.physical,arrow.psychic,arrow.hit],[true,undefined,undefined,true]);
assert.equal(arrow.amount,Math.ceil(10*4*magic.effectFactor(recruit,"death_arrow")-1e-9));
assert.match(magic.canCast(recruit,{...victim,character:{...victim.character,undead:true}},"death_arrow").reason,/ne fonctionne que sur les vivants/);
assert.match(magic.canCast(recruit,victim,"necrosis").reason,/hors de portée/,"au contact");
// Dégâts moyens : Flèche de mort ≈ 30 / 40 / 89, Nécrose ≈ 78 / 102 / 229.
const average=(x,code,mean)=>Math.round(10*mean*magic.effectFactor(x,code));
assert.deepEqual([novice,recruit,master].map(x=>average(x,"death_arrow",3.5)),[30,40,89]);
assert.deepEqual([novice,recruit,master].map(x=>average(x,"necrosis",9)),[78,102,229]);
// Moteur : un mort-vivant ne teste jamais son Courage.
const ghoul={character:{name:"Goule",undead:true,stats:{Courage:10,Volonté:10},items:[],equipment:{slots:{}}},activeSet:1,team:"enemy",alive:true};
assert.equal(combat.resolveFear(ghoul,seer,90),null);

// École de l'Invocation (Idan, 2026-10-28) : les mêmes règles d'invocation que la Nécromancie.
// Mana et réussite : Corbeau 9 / 9 / 6 (entretien 2), Loups 23 / 21 / 14 (entretien 5), Ours et Crocodiles 27 / 25 / 17
// (entretien 6 / 5 / 4 ; Expert : 17 / 33 / 87 %).
assert.deepEqual([novice,recruit,master].map(x=>[magic.manaCost(x,"summon_raven"),magic.upkeepCost(x,"summon_raven")]),[[9,2],[9,2],[6,2]]);
assert.deepEqual([novice,recruit,master].map(x=>[magic.manaCost(x,"summon_wolves"),magic.upkeepCost(x,"summon_wolves")]),[[23,5],[21,5],[14,3]]);
assert.deepEqual([novice,recruit,master].map(x=>[magic.manaCost(x,"summon_bears"),magic.upkeepCost(x,"summon_bears")]),[[27,6],[25,5],[17,4]]);
assert.deepEqual([novice,recruit,master].map(x=>Math.round(magic.castChance(x,"summon_crocodiles").p)),[17,33,87]);
// Loups : 1D6 + 1 par tranche de 50 de Maîtrise (débutant +0, recrue +1, expert +2) ; Ours, Crocodiles : 1D3 ; Corbeau : un seul.
queue=[0.99];
assert.deepEqual(magic.summonCount(recruit,"summon_wolves"),{count:7,rolled:6,dice:"1D6",bonus:1});
queue=[0];
assert.deepEqual(magic.summonCount(master,"summon_wolves"),{count:3,rolled:1,dice:"1D6",bonus:2});
queue=[0.5];
assert.equal(magic.summonCount(novice,"summon_bears").count,2);
assert.deepEqual(magic.summonCount(master,"summon_raven"),{count:1,rolled:null,dice:null,bonus:0});
queue=[0,0.5];
assert.equal(magic.cast(recruit,{q:0,r:1},"summon_wolves").summon.count.count,5,"le dé est tiré au lancer");
// Bourbier : une case, même occupée, 2 + M/50 tours (2 à 3), portée 6 + M/25.
assert.deepEqual([novice,recruit,master].map(x=>[magic.duration(x,"quagmire"),magic.range(x,"quagmire")]),[[2,7],[3,8],[3,11]]);
queue=[0];
assert.deepEqual(magic.cast(recruit,{q:5,r:0},"quagmire").mire,{q:5,r:0,turns:3});
// Transposition : une de ses invocations, n'importe où ; pas celle d'un autre, pas un allié.
const pet=unit(mage({pm:50,vie:1,int:50}),{q:30,r:-8,summon:{casterId:"me"}});
const owner={...recruit,id:"me"};
assert.equal(magic.canCast(owner,pet,"transposition").ok,true,"portée illimitée, sans ligne de vue");
assert.match(magic.canCast(owner,{...pet,summon:{casterId:"other"}},"transposition").reason,/une de vos invocations/);
assert.match(magic.canCast(owner,{...pet,summon:null},"transposition").reason,/une de vos invocations/);
queue=[0];
assert.deepEqual(magic.cast(owner,pet,"transposition",{lineOfSight:false}).swap,{from:{q:0,r:0},to:{q:30,r:-8}});

// Infobulle d'un sort du grimoire (Idan, 2026-10-30 : à qui il sert, combien de mana…) : la description, puis les
// chiffres de ce mercenaire, les mêmes que ceux du combat (prototype-web/ui.js, spellTip).
{
  const ui=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
  const code=ui.slice(ui.indexOf("const SPELL_EFFECT_LABELS"),ui.indexOf("// Grimoire : mercenary.spells"));
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const spellTip=new Function("esc","magicRules",code+"\nreturn spellTip;")(esc,()=>magic);
  const tip=spellTip(beginner.character,magic.spell("quick_heal"));
  assert.match(tip,/<strong>Soin rapide<\/strong><span>Vie<\/span><em>Restaure des PV à un allié ou au lanceur[^<]*<\/em>/);
  assert.match(tip,/<dt>Mana<\/dt><dd>11<\/dd>/);
  assert.match(tip,/<dt>Réussite<\/dt><dd>57 %<\/dd>/);
  assert.match(tip,/<dt>Portée<\/dt><dd>3 cases<\/dd>/);
  assert.match(tip,/<dt>Soins<\/dt><dd>9 à 35 PV<\/dd>/);
  assert.doesNotMatch(tip,/action rapide/,"l'action est déjà dans la description");
  assert.match(spellTip(beginner.character,magic.spell("titan_strength")),/<dt>Bonus<\/dt><dd>\+\d+ %<\/dd>[^]*<dt>Durée<\/dt><dd>\d+ tours?<\/dd>/);
  assert.equal(spellTip(beginner.character,null),"");
}

console.log("Magie : écoles de la Vie, du Feu, de l'Eau, de la Transmutation, de la Foudre, de la Télékinésie, de l'Illusion, de la Nécromancie et de l'Invocation OK");
