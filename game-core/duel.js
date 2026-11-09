"use strict";

// Le Défi du capitaine (Idan, 2026-11-09) : le capitaine défie un mercenaire en combat singulier, dans une arène. « On va
// la faire gladiateur ! Si le capitaine perd, jet de mort normal. S'il gagne (enfin nous gagnons) un pop up arrive. On
// choisit si on le met à mort ou non. S'il n'est pas mis à mort, jet de blessure. » La fuite hors de l'arène est une
// victoire du capitaine (« Il court, mais se fait rattraper par les autres »). Le capitaine peut se rendre, pas le
// mercenaire.
// Effets sur la compagnie : « +5 en affinité pour le capitaine par case d'écart entre l'alignement du défié et
// l'alignement du mercenaire » (seulement si nous gagnons) ; « +10 en affinité pour les mercenaires alignement mauvais si
// le capitaine le tue ; +10 pour les mercenaires alignement bons s'il l'épargne » ; « Pour le mercenaire épargné par le
// capitaine : +50 en affinité ». « Dans tous les cas : +150 xp en intimidation pour le capitaine, +50 xp en charisme,
// + XP normale d'un combat ». Pas de limite par jour : les deux doivent être au camp, ni blessés ni fatigués, et le duel se
// termine comme une mission (fatigue ou blessure).
// Module pur : les constantes (duel.*), la disponibilité et les effets ; le combat est celui des missions (mission.js) et
// la fin de combat celle de mission-end.js, appliquée par campaign.js (applyDuel).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesDuel=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }

  function createDuelRules({reference,affinity=null,progression=null}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      cols:k("duel.map.cols",15),rows:k("duel.map.rows",15),distance:k("duel.start.distance",3),
      intimidationXp:k("duel.xp.intimidation",150),charismaXp:k("duel.xp.charisma",50),
      alignmentStep:k("duel.affinity.alignment_step",5),evilKill:k("duel.affinity.evil_kill",10),
      goodSpare:k("duel.affinity.good_spare",10),spared:k("duel.affinity.spared",50)
    };
    const normalize=value=>String(value||"").trim().toLocaleLowerCase("fr");
    // Bon / mauvais : l'axe de son alignement (Loyal bon, Neutre bon, Chaotique bon ; … mauvais).
    const isGood=m=>/\bbon$/.test(normalize(m?.alignment));
    const isEvil=m=>/\bmauvais$/.test(normalize(m?.alignment));
    // L'écart d'alignement : les cases de la grille 3 × 3, comme l'affinité (de 0 à 4).
    function alignmentDistance(a,b){
      const pa=affinity?.alignmentPosition?.(a?.alignment),pb=affinity?.alignmentPosition?.(b?.alignment);
      return pa&&pb?Math.abs(pa.row-pb.row)+Math.abs(pa.col-pb.col):0;
    }

    // Les témoins : toute la compagnie, sans le capitaine ni le défié.
    function witnesses(state,challenged){
      const captainId=state?.company?.captainId;
      return (state?.company?.roster||[]).filter(m=>m.id!==captainId&&m.id!==challenged?.id);
    }
    // L'affinité gagnée par chacun envers le capitaine : [{ id, name, delta, parts }] (rien si le capitaine perd).
    function companyEffects(state,challenged,{won=false,killed=false}={}){
      if(!won) return [];
      return witnesses(state,challenged).map(m=>{
        const distance=alignmentDistance(challenged,m);
        const parts={alignment:C.alignmentStep*distance,evil:killed&&isEvil(m)?C.evilKill:0,good:!killed&&isGood(m)?C.goodSpare:0};
        return {id:m.id,name:m.name,distance,delta:parts.alignment+parts.evil+parts.good,parts};
      }).filter(x=>x.delta);
    }
    // Les effets du duel (après la fin de combat) : l'affinité des témoins et du défié épargné, l'XP du capitaine.
    function applyEffects(state,{captain,challenged,won=false,killed=false}={}){
      const effects=companyEffects(state,challenged,{won,killed});
      const roster=state?.company?.roster||[];
      for(const e of effects){
        const m=roster.find(x=>x.id===e.id);
        if(m) m.affinityAcquired=(Number(m.affinityAcquired)||0)+e.delta;
      }
      const spared=won&&!killed&&challenged&&roster.includes(challenged)?C.spared:0;
      if(spared) challenged.affinityAcquired=(Number(challenged.affinityAcquired)||0)+spared;
      const xp={stats:{Charisme:C.charismaXp},skills:{social:{Intimidation:C.intimidationXp}}};
      const changes=captain&&progression?progression.apply(captain,xp):[];
      return {effects,spared,xp,changes};
    }

    return {constants:C,isGood,isEvil,alignmentDistance,witnesses,companyEffects,applyEffects};
  }

  return {createDuelRules,referenceConstant};
});
