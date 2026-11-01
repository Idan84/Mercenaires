"use strict";

// Régénération (Physiologie ; Idan, 2026-11-01 : « les mercenaires qui ont du sang de troll […] régénèrent environ 2D6 PV
// par tour en permanence ; ça doit dépendre en partie des points de régénération qu'ils ont eu à la création »).
// Seul le sang de troll en donne à la création (generation-matrix.json : 4D6 à 10D6 selon la lignée).
// - En combat : au début de chacune de ses activations, s'il est debout, il regagne
//   ceil(2D6 × (0,5 + Régénération / 50)) PV, sans dépasser ses PV max. Le feu la bloque : brûlé depuis sa
//   dernière activation, il ne régénère pas cette fois (l'écran de combat tient le drapeau).
// - Au camp : la convalescence d'une blessure dure jours / (1 + Régénération / 100) : deux fois moins à 100.
// - Progression : elle monte à chaque brûlure (progression.js, progression.regeneration.burn_xp).
// Constantes : formula-constants.json, regeneration.*.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesRegeneration=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  const SKILL="Régénération";

  function createRegenerationRules({reference,random=Math.random}={}){
    const constants=new Map(rows(reference?.formulaConstants).map(r=>[r.code,Number(r.valeur)]));
    const k=(code,fallback)=>Number.isFinite(constants.get(code))?constants.get(code):fallback;
    const C={count:k("regeneration.combat.dice_count",2),sides:k("regeneration.combat.dice_sides",6),
      base:k("regeneration.combat.base",0.5),divisor:k("regeneration.combat.divisor",50),camp:k("regeneration.camp.divisor",100)};

    // Les points de Régénération d'un personnage (skills.physiology), 0 s'il n'en a pas.
    const points=character=>Math.max(0,Number(character?.skills?.physiology?.[SKILL])||0);
    const factor=character=>C.base+points(character)/C.divisor;
    const amountFor=(character,dice)=>Math.ceil(dice*factor(character)-1e-9);

    // Fourchette par tour en combat ; null sans Régénération.
    function range(character){
      if(!points(character)) return null;
      return {min:amountFor(character,C.count),max:amountFor(character,C.count*C.sides)};
    }
    // Un tour de régénération : {amount, dice} ; null sans Régénération.
    function roll(character){
      if(!points(character)) return null;
      let dice=0;
      for(let i=0;i<C.count;i++) dice+=1+Math.floor(random()*C.sides);
      return {amount:amountFor(character,dice),dice};
    }
    // Convalescence d'une blessure au camp : jours / (1 + Régénération / 100), arrondi au supérieur, au moins 1.
    function campDays(character,days){
      const d=Number(days)||0;
      if(!points(character)||d<=0) return d;
      return Math.max(1,Math.ceil(d/(1+points(character)/C.camp)-1e-9));
    }

    return {SKILL,constants:C,points,factor,range,roll,campDays};
  }

  return {createRegenerationRules,SKILL};
});
