"use strict";

// État de partie persistant (07-architecture.md) et horloge stratégique unique AdvanceTime(days),
// résolue jour par jour (10-mission-time-and-unavailability.md). L'état est un objet JSON pur.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesCampaign=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  // Sauvegarde : l'état de partie complet, sérialisé en JSON avec un format et une version.
  // La trace de génération des mercenaires (détail de calcul pour le Design Lab, ~85 % du poids)
  // n'est pas sauvegardée : un mercenaire passe d'environ 36 Ko à 5 Ko.
  const SAVE_FORMAT="mercenaires-save";
  const SAVE_VERSION=1;

  function withoutGenerationTrace(key,value){
    return key==="generationTrace"?undefined:value;
  }

  function serializeCampaign(state,extra={}){
    return JSON.stringify({
      format:SAVE_FORMAT,
      version:SAVE_VERSION,
      savedAt:new Date().toISOString(),
      day:state.day,
      company:state.company.name,
      state,
      extra
    },withoutGenerationTrace);
  }

  function restoreCampaign(text){
    let data;
    try{ data=JSON.parse(text); }catch(error){ return {ok:false,reason:"Sauvegarde illisible."}; }
    if(data?.format!==SAVE_FORMAT) return {ok:false,reason:"Ce n'est pas une sauvegarde de Mercenaires."};
    if(data.version!==SAVE_VERSION) return {ok:false,reason:"Version de sauvegarde non prise en charge : "+data.version+"."};
    const state=data.state;
    if(!Number.isInteger(state?.day)||!Array.isArray(state?.company?.roster)||!Array.isArray(state?.tavern?.candidates)){
      return {ok:false,reason:"Sauvegarde incomplète."};
    }
    return {ok:true,state,extra:data.extra||{},savedAt:data.savedAt||null};
  }

  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }

  // generator : createGenerator(...) ; tavern : createTavernRules(...) ; reference : data/reference/.
  function createCampaignRules({generator,tavern,reference}){
    const STARTING_GOLD=referenceConstant(reference,"company.gold.initial",1000);
    const STARTING_DORMITORY_CAPACITY=referenceConstant(reference,"camp.dormitory.initial_capacity",40);
    function rosterOf(state){ return state.company.roster; }

    // Un candidat de la Taverne est généré avec les biais du capitaine, comme tout nouveau mercenaire.
    function candidateFactory(state){
      return ()=>generator.createMercenary({id:state.nextId++,captain:state.company.roster.find(m=>m.id===state.company.captainId)||null});
    }

    function createCampaign({captain,squad=[],companyName=null}){
      const ids=[captain,...squad].map(m=>Number(m.id)||0);
      const state={
        day:1,
        nextId:Math.max(0,...ids)+1,
        company:{
          name:companyName||"Compagnie de "+captain.name,
          gold:STARTING_GOLD,
          captainId:captain.id,
          roster:[captain,...squad],
          intendantId:null,
          camp:{dormitoryCapacity:STARTING_DORMITORY_CAPACITY}
        },
        tavern:tavern.createTavernState()
      };
      tavern.fillTavern(state.tavern,state.day,candidateFactory(state));
      return state;
    }

    function dormitoryFree(state){
      return state.company.camp.dormitoryCapacity-rosterOf(state).length;
    }

    // Indisponibilité après mission (10-mission-time §4 à §6) : un blessé ou un fatigué ne peut pas
    // partir en mission tant que son compteur de jours n'est pas écoulé.
    function isAvailable(mercenary){
      return !mercenary.recovery;
    }

    function recoverOneDay(state){
      const recovered=[];
      for(const mercenary of rosterOf(state)){
        if(!mercenary.recovery) continue;
        mercenary.recovery.daysLeft-=1;
        if(mercenary.recovery.daysLeft<=0){
          recovered.push({mercenary,kind:mercenary.recovery.kind});
          delete mercenary.recovery;
        }
      }
      return recovered;
    }

    // Une journée stratégique. Ordre V1 : guérison et repos, puis Taverne (départs du matin, puis remplissage des places libres).
    function advanceOneDay(state){
      state.day+=1;
      const recovered=recoverOneDay(state);
      const tavernReport=tavern.tavernMorning(state.tavern,state.day,candidateFactory(state));
      return {day:state.day,recovered,tavern:tavernReport};
    }

    // AdvanceTime(5) = cinq résolutions successives d'une journée. Seul un nombre entier de jours ≥ 0 est accepté.
    function advanceTime(state,days=1){
      if(!Number.isInteger(days)||days<0) throw new RangeError("AdvanceTime : nombre de jours entier ≥ 0 attendu, reçu "+days);
      const reports=[];
      for(let i=0;i<days;i++) reports.push(advanceOneDay(state));
      return reports;
    }

    // §10 — Signature : un accord conclu, et une place libre au Dortoir.
    function signCandidate(state,mercenaryId){
      const candidate=tavern.findCandidate(state.tavern,mercenaryId);
      if(!candidate) return {ok:false,reason:"Candidat introuvable."};
      const agreed=candidate.negotiation?.agreed;
      if(!agreed) return {ok:false,reason:"Aucun accord conclu avec ce candidat."};
      if(dormitoryFree(state)<=0) return {ok:false,reason:"Dortoir plein : impossible de finaliser le recrutement."};
      const mercenary=candidate.mercenary;
      mercenary.contract={dailySalary:agreed.salary,missionBonus:agreed.bonus,signedDay:state.day};
      rosterOf(state).push(mercenary);
      tavern.removeCandidate(state.tavern,candidate);
      return {ok:true,mercenary};
    }

    // Négociation rompue : le candidat quitte immédiatement la Taverne ; sa place sera remplie le lendemain matin.
    function offerToCandidate(state,mercenaryId,offer){
      const candidate=tavern.findCandidate(state.tavern,mercenaryId);
      if(!candidate) return {outcome:"invalid",reason:"Candidat introuvable."};
      const result=tavern.makeOffer(candidate,offer);
      if(result.outcome==="left") tavern.removeCandidate(state.tavern,candidate);
      return result;
    }

    // L'Intendant est un rôle que le joueur assigne à un mercenaire de la compagnie ;
    // sans assignation, la compagnie n'a pas d'Intendant (décision Idan, PR #11).
    function intendantOf(state){
      return rosterOf(state).find(m=>m.id===state.company.intendantId)||null;
    }

    function assignIntendant(state,mercenaryId){
      if(mercenaryId===null||mercenaryId===undefined){ state.company.intendantId=null; return {ok:true,intendant:null}; }
      const mercenary=rosterOf(state).find(m=>m.id===mercenaryId);
      if(!mercenary) return {ok:false,reason:"Seul un membre de la compagnie peut être Intendant."};
      state.company.intendantId=mercenary.id;
      return {ok:true,intendant:mercenary};
    }

    // Bilan de fin de mission appliqué à la compagnie (10-mission-time §7 et §8, décisions Idan du 2026-10-03) :
    // les morts quittent la compagnie, les blessés et les fatigués deviennent indisponibles,
    // la prime de mission de chaque survivant sous contrat est payée, et la mort du capitaine met fin à la partie.
    // aftermath : résultat de MercenairesMissionEnd.resolveMissionEnd. Les participants hors compagnie sont ignorés.
    function applyMissionAftermath(state,aftermath){
      const report={deaths:[],wounded:[],fatigued:[],bonuses:[],bonusPaid:0,gameOver:false};
      for(const result of aftermath.results){
        const roster=rosterOf(state);
        const mercenary=roster.find(m=>m.id===result.id);
        if(!mercenary) continue;
        if(result.dead){
          roster.splice(roster.indexOf(mercenary),1);
          if(state.company.intendantId===mercenary.id) state.company.intendantId=null;
          report.deaths.push(mercenary);
          continue;
        }
        if(result.wounded){
          mercenary.recovery={kind:"wounded",daysLeft:result.woundDays,sinceDay:state.day};
          report.wounded.push(mercenary);
        }else{
          mercenary.recovery={kind:"fatigued",daysLeft:result.fatigueDays,sinceDay:state.day};
          report.fatigued.push(mercenary);
        }
        // §8 — La prime de mission individuelle n'est payée que si le mercenaire revient.
        const bonus=Number(mercenary.contract?.missionBonus)||0;
        if(bonus>0){
          state.company.gold-=bonus;
          report.bonusPaid+=bonus;
          report.bonuses.push({mercenary,bonus});
        }
      }
      if(aftermath.captainDead){
        state.gameOver={day:state.day,reason:"captain-dead"};
        report.gameOver=true;
      }
      return report;
    }

    function askCandidate(state,mercenaryId,key){
      const candidate=tavern.findCandidate(state.tavern,mercenaryId);
      if(!candidate) return {ok:false,reason:"Candidat introuvable."};
      return tavern.askQuestion(candidate,key,intendantOf(state));
    }

    return {
      STARTING_GOLD,
      STARTING_DORMITORY_CAPACITY,
      createCampaign,
      advanceTime,
      dormitoryFree,
      signCandidate,
      offerToCandidate,
      intendantOf,
      assignIntendant,
      askCandidate,
      isAvailable,
      applyMissionAftermath
    };
  }

  return {createCampaignRules,serializeCampaign,restoreCampaign,SAVE_VERSION};
});
