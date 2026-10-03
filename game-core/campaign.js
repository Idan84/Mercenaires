"use strict";

// État de partie persistant (07-architecture.md) et horloge stratégique unique AdvanceTime(days),
// résolue jour par jour (10-mission-time-and-unavailability.md). L'état est un objet JSON pur.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesCampaign=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  // Sauvegarde : l'état de partie complet, sérialisé en JSON avec un format et une version.
  const SAVE_FORMAT="mercenaires-save";
  const SAVE_VERSION=1;

  function serializeCampaign(state,extra={}){
    return JSON.stringify({
      format:SAVE_FORMAT,
      version:SAVE_VERSION,
      savedAt:new Date().toISOString(),
      day:state.day,
      company:state.company.name,
      state,
      extra
    });
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

    // Une journée stratégique. Ordre V1 : Taverne (départs du matin, puis remplissage des places libres).
    function advanceOneDay(state){
      state.day+=1;
      const tavernReport=tavern.tavernMorning(state.tavern,state.day,candidateFactory(state));
      return {day:state.day,tavern:tavernReport};
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
      askCandidate
    };
  }

  return {createCampaignRules,serializeCampaign,restoreCampaign,SAVE_VERSION};
});
