"use strict";

// Politique sociale de la compagnie, à l'Intendance (Idan, 2026-11-04 : « Un mercenaire blessé touche 50 % de son salaire
// pendant les jours où il est blessé (c'est la nouvelle norme par défaut). Dans l'intendance, on a un curseur qu'on déplace
// librement de 0 à 100 %. Plus le taux est bas, plus l'affinité baisse sur les jours de blessure. A contrario, au-dessus de
// 50, on gagne de l'affinité. On va faire la même chose pour chaque corvée, mais par défaut, c'est 100 %. Avec les corvées,
// on perd moins d'affinité quand on monte le salaire. Un curseur par corvée » ; « Parfait et oui à tout ») :
//
// - un blessé (recovery.kind « wounded ») touche taux × son salaire ; par défaut 50 %, de 0 à 100 % ; chaque jour de
//   blessure, son affinité avec le capitaine bouge de (taux − 50) ÷ 25 : −2 à 0 %, 0 à 50 %, +2 à 100 % ; un fatigué touche
//   tout son salaire ;
// - une corvée (Bûcherons, Mineurs, Palais) : taux × son salaire les jours où il y travaille ; par défaut 100 %, de 0 à
//   200 % ; la perte d'affinité du jour × (2 − taux ÷ 100) : −2 à 0 %, −1 à 100 %, 0 à 200 % (jamais de gain), puis × 2
//   s'il a été intimidé, × 0,5 s'il a été convaincu ;
// - les curseurs vont par pas de 5 ; pas besoin d'intendant.
//
// Constantes : social.* (formula-constants.json). État : state.company.socialPolicy = { wounded, chores: { lumber, mine,
// palace } } (des pourcentages ; absent : les valeurs par défaut). Module pur.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesSocialPolicy=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const CHORES=["lumber","mine","palace"];
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));

  function createSocialPolicyRules({reference}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      woundedDefault:k("social.wounded.default_rate",50),woundedMax:k("social.wounded.max_rate",100),
      woundedNeutral:k("social.wounded.neutral_rate",50),woundedDivisor:k("social.wounded.affinity_divisor",25),
      choreDefault:k("social.chore.default_rate",100),choreMax:k("social.chore.max_rate",200),step:k("social.rate_step",5)
    };
    const policyOf=state=>state.company.socialPolicy||{};
    const valid=(value,max,fallback)=>Number.isFinite(Number(value))?clamp(Number(value),0,max):fallback;
    // Les taux, en %.
    const woundedRate=state=>valid(policyOf(state).wounded,C.woundedMax,C.woundedDefault);
    const choreRate=(state,course)=>valid(policyOf(state).chores?.[course],C.choreMax,C.choreDefault);
    // Régler un curseur (key : "wounded", ou une corvée) : par pas de 5, dans ses bornes.
    function setRate(state,key,value){
      const chore=CHORES.includes(key);
      if(!chore&&key!=="wounded") return {ok:false,reason:"Curseur inconnu."};
      const max=chore?C.choreMax:C.woundedMax;
      const rate=clamp(Math.round((Number(value)||0)/C.step)*C.step,0,max);
      const policy=state.company.socialPolicy||(state.company.socialPolicy={});
      if(chore) (policy.chores||(policy.chores={}))[key]=rate;
      else policy.wounded=rate;
      return {ok:true,key,rate};
    }
    // Ce qu'un jour de blessure fait à l'affinité ; le facteur de la perte d'une corvée.
    const woundedAffinity=state=>(woundedRate(state)-C.woundedNeutral)/C.woundedDivisor;
    const choreLossFactor=(state,course)=>Math.max(0,2-choreRate(state,course)/100);
    // Le salaire du jour : blessé, ou en corvée (course : la corvée où il travaille aujourd'hui, ou null).
    function payFactor(state,m,course=null){
      if(m?.recovery?.kind==="wounded") return woundedRate(state)/100;
      if(course) return choreRate(state,course)/100;
      return 1;
    }

    return {constants:C,CHORES,woundedRate,choreRate,setRate,woundedAffinity,choreLossFactor,payFactor};
  }

  return {createSocialPolicyRules,CHORES};
});
