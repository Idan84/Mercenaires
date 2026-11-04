"use strict";

// Relancer après un refus (Idan, 2026-11-04 : « On peut retenter via deux options de dialogues (ou laisser tomber) :
// Intimider, Convaincre. On refait le test en ajoutant son intimidation ou son charisme (moitié du cha). En intimidation, ça
// double la perte d'affinité. En charisme, ça la divise par deux » ; « valable pour tout test de refus » ; « Oui Go ! ») :
//
// - après un refus, une seule relance, l'une ou l'autre (ou laisser tomber) ; puis c'est non pour aujourd'hui ;
// - le test est refait avec, en plus de son écart habituel (Δ), l'Intimidation du capitaine (× persuasion.intimidate.weight)
//   ou son Charisme ÷ 2 (× persuasion.convince.weight) ;
// - la perte d'affinité qui suit est multipliée par 2 (intimidé) ou par 0,5 (convaincu) : pour une corvée, la perte de
//   chaque jour, pendant toute l'affectation.
//
// Module pur : chaque test de refus lui demande le bonus et le facteur de perte, et garde le refus du jour sur le mercenaire
// (markRefused, canRetry, markRetried). Les corvées (lumber.js), les apprentissages (spell-study.js, armor-study.js), les
// échanges d'équipement (equipment-deals.js) ; les postes suivront.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesPersuasion=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  // La valeur d'un capitaine : une caractéristique, ou une compétence (Intimidation : skills.social).
  function valueOf(m,name){
    if(m?.stats&&name in m.stats) return Number(m.stats[name])||0;
    for(const group of Object.values(m?.skills||{})) if(group&&typeof group==="object"&&name in group) return Number(group[name])||0;
    return 0;
  }
  function createPersuasionRules({reference}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const APPROACHES={
      intimidate:{key:"intimidate",name:"Intimidation",weight:k("persuasion.intimidate.weight",1),lossFactor:k("persuasion.intimidate.loss_factor",2),
        gainFactor:k("persuasion.intimidate.gain_factor",0)},
      convince:{key:"convince",name:"Charisme",weight:k("persuasion.convince.weight",0.5),lossFactor:k("persuasion.convince.loss_factor",0.5),
        gainFactor:k("persuasion.convince.gain_factor",1)}
    };
    const approachOf=key=>APPROACHES[key]||null;
    // Ce que la relance ajoute à l'écart (Δ) du test : l'Intimidation du capitaine, ou son Charisme ÷ 2.
    function bonus(captain,key){
      const a=approachOf(key);
      return a?a.weight*valueOf(captain,a.name):0;
    }
    // Le facteur de la perte d'affinité : 2 (intimidé), 0,5 (convaincu), 1 sans relance.
    const lossFactor=key=>approachOf(key)?.lossFactor??1;
    // Le gain d'affinité d'un accord (un apprentissage : +5 au premier matin) : rien s'il a été intimidé, entier s'il a été
    // convaincu (Idan, 2026-11-04 : « S'il a été intimidé, il ne gagne pas les +5 du premier matin. Convaincu, il les
    // garde »).
    const gainFactor=key=>approachOf(key)?.gainFactor??1;
    // Quand la relance échoue : ce qu'il faut ajouter à la perte du refus pour qu'elle soit × 2 ou × 0,5.
    const refusalExtra=(refuseDelta,key)=>Math.round((Number(refuseDelta)||0)*(lossFactor(key)-1)*100)/100;
    // Après une relance, ce qu'il faut ajouter à l'affinité déjà comptée (delta, accord ou refus, comme pour un échange
    // d'équipement) : une perte × 2 ou × 0,5 ; un gain accordé, × 0 s'il a été intimidé.
    function outcomeExtra(delta,key,accepted){
      const d=Number(delta)||0;
      if(d<0) return Math.round(d*(lossFactor(key)-1)*100)/100;
      if(d>0&&accepted) return Math.round(d*(gainFactor(key)-1)*100)/100;
      return 0;
    }
    // Le refus du jour, gardé sur le mercenaire (m[field] = { day, retried, accepted, approach, … }) : une seule relance.
    function markRefused(m,field,day,extra={}){ m[field]={day,retried:false,accepted:false,approach:null,...extra}; return m[field]; }
    function canRetry(m,field,day){
      const refusal=m?.[field];
      if(!refusal||refusal.day!==day||refusal.accepted) return {ok:false,reason:"Il n’a rien refusé aujourd’hui."};
      if(refusal.retried) return {ok:false,reason:"Vous avez déjà insisté aujourd’hui."};
      return {ok:true,refusal};
    }
    function markRetried(m,field,key,accepted){ Object.assign(m[field],{retried:true,approach:key,accepted}); return m[field]; }
    return {APPROACHES,approachOf,bonus,lossFactor,gainFactor,refusalExtra,outcomeExtra,markRefused,canRetry,markRetried,valueOf};
  }
  return {createPersuasionRules,valueOf};
});
