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
// Module pur : chaque test de refus lui demande le bonus et le facteur de perte. Étape 1 : les corvées (lumber.js) ; les
// autres tests (apprentissages, équipements, postes) suivront.
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
      intimidate:{key:"intimidate",name:"Intimidation",weight:k("persuasion.intimidate.weight",1),lossFactor:k("persuasion.intimidate.loss_factor",2)},
      convince:{key:"convince",name:"Charisme",weight:k("persuasion.convince.weight",0.5),lossFactor:k("persuasion.convince.loss_factor",0.5)}
    };
    const approachOf=key=>APPROACHES[key]||null;
    // Ce que la relance ajoute à l'écart (Δ) du test : l'Intimidation du capitaine, ou son Charisme ÷ 2.
    function bonus(captain,key){
      const a=approachOf(key);
      return a?a.weight*valueOf(captain,a.name):0;
    }
    // Le facteur de la perte d'affinité : 2 (intimidé), 0,5 (convaincu), 1 sans relance.
    const lossFactor=key=>approachOf(key)?.lossFactor??1;
    return {APPROACHES,approachOf,bonus,lossFactor,valueOf};
  }
  return {createPersuasionRules,valueOf};
});
