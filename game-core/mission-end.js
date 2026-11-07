"use strict";

// Fin de mission V1 (10-mission-time-and-unavailability.md) : jet de mort, blessure, fatigue
// et durées d'indisponibilité. Valeurs PLAYTEST validées par Idan pour le code (Issue #14),
// toutes réglables dans data/reference/formula-constants.json.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesMissionEnd=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }

  // Un participant : {id, name, hp (signés), pvMax, damageTaken (cumul de la mission), stats, isCaptain, offMap}.
  function createMissionEndRules({random=Math.random,reference}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      deathHpCoefficient:k("mission.death.hp_ratio_coefficient",1000),
      deathWillpowerDivisor:k("mission.death.willpower_divisor",20),
      // Les chances de mort divisées par deux (Idan, 2026-11-07, après le bêta-test).
      deathChanceFactor:k("mission.death.chance_factor",1),
      woundZoneRatio:k("mission.wound.zone_ratio",0.5),
      woundBase:k("mission.wound.base",35),
      woundDangerCoefficient:k("mission.wound.danger_coefficient",0.65),
      woundEnduranceDivisor:k("mission.wound.endurance_divisor",6),
      woundMin:k("mission.wound.min",20),
      woundMax:k("mission.wound.max",95),
      severityBase:k("mission.wound_severity.base",50),
      severityHpCoefficient:k("mission.wound_severity.hp_ratio_coefficient",250),
      durationBaseDays:k("mission.wound_duration.base_days",7),
      durationSeverityDivisor:k("mission.wound_duration.severity_divisor",1),
      durationEnduranceDivisor:k("mission.wound_duration.endurance_divisor",300),
      campCareFactor:k("mission.wound_duration.camp_care_factor",1),
      durationMinDays:k("mission.wound_duration.min_days",7),
      durationMaxDays:k("mission.wound_duration.max_days",60),
      fatigueBaseDays:k("mission.fatigue.base_days",5),
      fatigueDamageCoefficient:k("mission.fatigue.damage_ratio_coefficient",2),
      fatigueEnduranceDivisor:k("mission.fatigue.endurance_divisor",100),
      fatigueMinDays:k("mission.fatigue.min_days",1),
      fatigueMaxDays:k("mission.fatigue.max_days",7)
    };

    function d100(){ return Math.floor(random()*100)+1; }
    function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
    function stat(p,name){ return Number(p.stats?.[name])||0; }
    function hpRatio(p){ return p.hp/p.pvMax; }

    // §3 — Jet de mort, uniquement sous 0 PV. multiplier : défaite d'une mission « Faire le ménage », l'ennemi tient le
    // terrain, la probabilité est doublée (doc 17 §8), toujours bornée à 100 %. Puis × mission.death.chance_factor (0,5 :
    // au plus 50 % ; Idan, 2026-11-07 : « On divise par deux les chances de mort »).
    function deathChance(p,multiplier=1){
      if(p.hp>=0) return null;
      return clamp((-C.deathHpCoefficient*hpRatio(p)-stat(p,"Volonté")/C.deathWillpowerDivisor)*multiplier,0,100)*C.deathChanceFactor;
    }

    // §4 — Jet de blessure, uniquement entre 0 et 50 % des PV max (zone portée de 20 à 50 % par Idan).
    function woundChance(p){
      if(p.hp<0||p.hp>C.woundZoneRatio*p.pvMax) return null;
      const danger=100*(1-p.hp/(C.woundZoneRatio*p.pvMax));
      return clamp(C.woundBase+C.woundDangerCoefficient*danger-stat(p,"Endurance")/C.woundEnduranceDivisor,C.woundMin,C.woundMax);
    }

    // §6 — Gravité et durée d'une blessure : de 7 à 60 jours (Idan, 2026-10-03).
    function woundSeverity(p){
      return clamp(C.severityBase-C.severityHpCoefficient*hpRatio(p),0,100);
    }

    function woundDays(p,{campCareFactor=C.campCareFactor}={}){
      const days=(C.durationBaseDays+woundSeverity(p)/C.durationSeverityDivisor)*(1-stat(p,"Endurance")/C.durationEnduranceDivisor)*campCareFactor;
      return Math.ceil(clamp(days,C.durationMinDays,C.durationMaxDays));
    }

    // §5 — Fatigue : automatique pour tout survivant non blessé ; seule la durée varie.
    function fatigueDays(p){
      const ratio=(Number(p.damageTaken)||0)/p.pvMax;
      const days=Math.ceil(C.fatigueBaseDays+C.fatigueDamageCoefficient*ratio-stat(p,"Endurance")/C.fatigueEnduranceDivisor);
      return clamp(days,C.fatigueMinDays,C.fatigueMaxDays);
    }

    // §7 — Chaîne : mort → blessure automatique → jet de blessure → fatigue.
    function resolveParticipant(p,options={}){
      const result={
        id:p.id,name:p.name,isCaptain:Boolean(p.isCaptain),offMap:Boolean(p.offMap),progress:p.progress||null,
        hp:p.hp,pvMax:p.pvMax,damageTaken:Number(p.damageTaken)||0,
        death:null,wound:null,dead:false,wounded:false,severity:null,woundDays:null,fatigueDays:null
      };
      // Relevé en zombie par un nécromancien (Idan, 2026-10-28) : son jet de mort est forcément raté.
      if(p.raised){ result.death={p:100,roll:null,raised:true}; result.dead=true; result.outcome="dead"; return result; }
      const pDeath=deathChance(p,Number(options.deathMultiplier)||1);
      if(pDeath!==null){
        const roll=d100();
        result.death={p:pDeath,roll};
        if(roll<=pDeath){ result.dead=true; result.outcome="dead"; return result; }
        result.wound={automatic:true};
        result.wounded=true;
      }else{
        const pWound=woundChance(p);
        if(pWound!==null){
          const roll=d100();
          result.wound={automatic:false,p:pWound,roll};
          result.wounded=roll<=pWound;
        }
      }
      if(result.wounded){
        result.severity=woundSeverity(p);
        result.woundDays=woundDays(p,options);
        result.outcome="wounded";
      }else{
        result.fatigueDays=fatigueDays(p);
        result.outcome="fatigued";
      }
      return result;
    }

    function resolveMissionEnd(participants,options={}){
      const results=participants.map(p=>resolveParticipant(p,options));
      return {results,captainDead:results.some(r=>r.isCaptain&&r.dead)};
    }

    return {
      constants:C,
      deathChance,
      woundChance,
      woundSeverity,
      woundDays,
      fatigueDays,
      resolveParticipant,
      resolveMissionEnd
    };
  }

  return {createMissionEndRules,referenceConstant};
});
