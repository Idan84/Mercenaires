"use strict";

// État de partie persistant (07-architecture.md) et horloge stratégique unique AdvanceTime(days),
// résolue jour par jour (10-mission-time-and-unavailability.md). L'état est un objet JSON pur.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesCampaign=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const STARTING_GOLD=1000;
  const STARTING_DORMITORY_CAPACITY=20;

  // generator : createGenerator(...) ; tavern : createTavernRules(...).
  function createCampaignRules({generator,tavern}){
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

    // AdvanceTime(5) = cinq résolutions successives d'une journée.
    function advanceTime(state,days=1){
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

    function askCandidate(state,mercenaryId,key){
      const candidate=tavern.findCandidate(state.tavern,mercenaryId);
      if(!candidate) return {ok:false,reason:"Candidat introuvable."};
      return tavern.askQuestion(candidate,key,tavern.bestIntendant(rosterOf(state)));
    }

    return {
      STARTING_GOLD,
      STARTING_DORMITORY_CAPACITY,
      createCampaign,
      advanceTime,
      dormitoryFree,
      signCandidate,
      offerToCandidate,
      askCandidate
    };
  }

  return {createCampaignRules};
});
