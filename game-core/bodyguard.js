"use strict";

// Missions de garde du corps (Idan, 2026-10-25 ; formules de JC validées) : de l'or contre l'absence d'un ou plusieurs
// mercenaires. Données et textes : data/reference/bodyguard-missions.json.
// - Offre (une à la fois à la Taverne, valable 3 à 6 jours) : 1 à 3 mercenaires, d'un niveau de réputation minimal (en
//   étoiles, 1 à 15), pour 3 à 21 jours. Le niveau est tiré (1★ 10 %, 2★ 30 %, 3★ 30 %, 4★ 20 %, 5★ 10 %) puis monte
//   avec le meilleur mercenaire de la compagnie (décalage, validé par Idan).
// - Paiement d'avance, par mercenaire = W × (2 + jours × (1,3 + (jours − 3) / 22)), arrondi à 10 PO ; W = salaire de
//   référence du niveau : 10 × Réputation minimale du niveau suivant / 30 (au-delà de 15 étoiles : × 1,25). Plus c'est
//   long, plus la journée paie. Un mercenaire payé bien plus que son niveau fait perdre de l'or sur les courtes missions.
// - Pas de combat. Au retour, chacun tire : 50 % rentré, 25 % fatigué (1D3 jours), 25 % blessé (1D3 jours) ; il gagne
//   un peu de réputation (5, ou 2,5 s'il est blessé) et la compagnie un peu de renommée (+5 depuis le bêta-test ; Idan,
//   2026-11-07) ; sa prime est versée.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesBodyguard=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);

  function createBodyguardRules({reference,random=Math.random}={}){
    const data=reference?.bodyguardMissions||{};
    const thresholds=rows(reference?.reputationStars).map(r=>Number(r.reputation_min)).sort((a,b)=>a-b);
    const maxLevel=thresholds.length||15;
    const pay=data.paiement||{};
    const die=sides=>1+Math.floor(random()*sides);
    const between=(min,max)=>min+Math.floor(random()*(max-min+1));
    const pick=list=>list.length?list[Math.floor(random()*list.length)]:"";
    function weighted(list){
      let r=random()*list.reduce((sum,x)=>sum+(Number(x.poids)||0),0);
      for(const x of list){ if((r-=Number(x.poids)||0)<0) return x; }
      return list[list.length-1];
    }

    // Niveau de réputation (étoiles) d'une réputation ; 0 sans référentiel.
    function levelOf(reputation){
      let level=0;
      thresholds.forEach((min,i)=>{ if(Number(reputation)>=min) level=i+1; });
      return level;
    }
    // Salaire de référence d'un niveau : 10 × Réputation minimale du niveau suivant / 30.
    function referenceWage(level){
      const next=level<thresholds.length?thresholds[level]:(thresholds[thresholds.length-1]||0)*(Number(pay.au_dela_15)||1.25);
      return 10*Math.max(1,next/30);
    }
    // Paiement d'avance pour count mercenaires.
    function payment(level,days,count=1){
      const forfait=Number(pay.forfait_jours)||2,base=Number(pay.base)||1.3,divisor=Number(pay.diviseur)||22,round=Number(pay.arrondi)||10;
      const each=referenceWage(level)*(forfait+days*(base+(days-3)/divisor));
      return count*Math.round(each/round)*round;
    }

    // Une offre (Idan, 2026-11-08 : « Ecart : -4 / +1 pour les 3 types de missions ») : le niveau de renommée de la
    // compagnie (companyLevel, 1 à 15) + un écart tiré dans niveau.ecart, chaque écart avec la même chance, de 1 à 15.
    function createOffer({day=1,companyLevel=1}={}){
      const crew=data.mercenaires||{min:1,max:3},duration=data.duree_jours||{min:3,max:21};
      const [minDays,maxDays]=data.validite_jours||[3,6];
      const [low,high]=data.niveau?.ecart||[-4,1];
      const level=Math.max(1,Math.min(maxLevel,(Number(companyLevel)||1)+between(low,high)));
      const count=between(crew.min,crew.max),days=between(duration.min,duration.max);
      return {id:`bodyguard-${day}-${Math.floor(random()*1e9).toString(36)}`,kind:"bodyguard",day,
        expiresDay:day+minDays+Math.floor(random()*(maxDays-minDays+1)),level,count,days,client:pick(data.clients||[]),
        payment:payment(level,days,count)};
    }

    // Le tirage du retour, pour un mercenaire : {issue : rentre | fatigue | blesse, days}.
    function rollReturn(){
      const row=weighted(data.retour||[{issue:"rentre",poids:1}]);
      return {issue:row.issue,days:row.jours_faces?die(row.jours_faces):0};
    }
    function reputationGain(issue){ return Number(data.reputation?.[issue])||0; }
    function renownGain(){ return Number(data.renommee)||0; }

    return {levelOf,referenceWage,payment,createOffer,rollReturn,reputationGain,renownGain,texts:data.textes||{}};
  }

  return {createBodyguardRules};
});
