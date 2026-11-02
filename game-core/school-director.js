"use strict";

// Directeur de l'École de magie (Idan, 2026-11-01 : « même mécanisme pour la nomination que l'intendant ») : une fois
// l'École construite, le capitaine propose à un mercenaire de la diriger ; il peut refuser, même règle que l'intendant
// (game-core/steward.js) : même envie (40 − 0,6 × Courage + 2 × Missions + 8 × Blessures, de 2 à 95 %), même retour
// sur le terrain, même effet d'un refus sur l'affinité (± (Intelligence − Courage) / 10 ; flatté une seule fois), une
// proposition par jour. Comme l'intendant et le médecin, c'est un mercenaire hors mission : il reste au camp et vit à
// l'École (pas de place au dortoir). Pas encore d'effet.
(function(root,factory){
  const node=typeof module!=="undefined"&&module.exports;
  const steward=node?require("./steward.js"):root.MercenairesSteward;
  const history=node?require("./history.js"):root.MercenairesHistory;
  const api=factory(steward,history);
  if(node) module.exports=api;
  root.MercenairesSchoolDirector=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Steward,History){
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  // dormitory : { free(state), places(mercenaire) } ; schoolLevel(state) : niveau de l'École de magie (campaign.js).
  function createSchoolDirectorRules({reference,random=Math.random,dormitory=null,schoolLevel=()=>0}={}){
    const steward=Steward.createStewardRules({reference,random,dormitory});
    const C=steward.constants;
    const rosterOf=state=>state?.company?.roster||[];
    const stat=(m,name)=>Number(m?.stats?.[name])||0;
    const no=reason=>({ok:false,reason});
    function directorOf(state){
      const id=state?.company?.directorId;
      return id==null?null:rosterOf(state).find(m=>m.id===id)||null;
    }
    function daysAsDirector(state){
      return directorOf(state)?Math.max(0,state.day-(Number(state.company.directorSince)||state.day)):0;
    }
    function totalDirectorDays(state,m){
      return (Number(m?.history?.directorDays)||0)+(directorOf(state)===m?daysAsDirector(state):0);
    }
    // Même envie que pour l'Intendance : le brave veut le terrain, le vieux blessé moins.
    const appointChance=m=>steward.appointChance(m);
    const returnChance=(state,m)=>clamp(C.returnBase-steward.desire(m)+C.perDay*daysAsDirector(state),C.min,C.max);
    function refusalAffinity(m){
      const delta=Math.round((stat(m,"Intelligence")-stat(m,"Courage"))/C.refusalDivisor);
      return delta>0&&m.directorFlattered?0:delta;
    }

    function canOffer(state,m){
      if(!m) return no("Mercenaire introuvable.");
      if(!(schoolLevel(state)>0)) return no("Il faut d’abord construire l’École de magie.");
      if(m.id===state.company.captainId) return no("Le capitaine ne peut pas diriger l’École.");
      if(Number(m.contract?.joinDay)>state.day) return no("Il rejoint la compagnie demain matin.");
      if((state.company.lieutenantIds||[]).includes(m.id)) return no("Un lieutenant ne peut pas diriger l’École.");
      if(m.id===state.company.intendantId) return no("L’intendant ne peut pas diriger l’École.");
      if(state.company.medicId!=null&&m.id===state.company.medicId) return no("Le médecin ne peut pas diriger l’École.");
      const mission=(state.expeditions||[]).find(e=>e.memberIds.includes(m.id));
      if(mission) return no(mission.status==="scheduled"?"Il part en mission demain.":"Il est en mission.");
      if(m.directorOfferDay===state.day) return no("Vous lui en avez déjà parlé aujourd’hui.");
      return {ok:true};
    }

    const roll=()=>Math.floor(random()*100)+1;
    function refuse(m,state,kind){
      const affinityDelta=refusalAffinity(m);
      if(affinityDelta) m.affinityAcquired=(Number(m.affinityAcquired)||0)+affinityDelta;
      if(affinityDelta>0) m.directorFlattered=true;
      History.record(m,state.day,kind,{accepted:false});
      return {affinityDelta,mood:affinityDelta>0?"flattered":affinityDelta<0?"vexed":"neutral"};
    }

    // Proposer la direction de l'École.
    function offer(state,mercenaryId){
      const m=rosterOf(state).find(x=>x.id===mercenaryId);
      const current=directorOf(state);
      if(current) return no(current===m?"Il dirige déjà l’École.":"L’École a déjà un directeur.");
      const allowed=canOffer(state,m);
      if(!allowed.ok) return allowed;
      const chance=appointChance(m),dice=roll();
      m.directorOfferDay=state.day;
      if(dice<=chance){
        state.company.directorId=m.id;
        state.company.directorSince=state.day;
        History.record(m,state.day,"director",{accepted:true});
        return {ok:true,accepted:true,roll:dice,chance,affinityDelta:0,mood:"neutral",mercenary:m};
      }
      return {ok:true,accepted:false,roll:dice,chance,mercenary:m,...refuse(m,state,"director")};
    }

    // Proposer au directeur de revenir sur le terrain : il reprend une place au dortoir.
    function recall(state){
      const m=directorOf(state);
      if(!m) return no("L’École n’a pas de directeur.");
      if(m.directorOfferDay===state.day) return no("Vous lui en avez déjà parlé aujourd’hui.");
      if(dormitory&&dormitory.free(state)<dormitory.places(m)) return {...no("Le dortoir est plein : pas de place pour son retour."),dormFull:true};
      const chance=returnChance(state,m),dice=roll(),days=daysAsDirector(state);
      m.directorOfferDay=state.day;
      if(dice<=chance){
        History.historyOf(m).directorDays=(Number(m.history?.directorDays)||0)+days;
        state.company.directorId=null;
        delete state.company.directorSince;
        History.record(m,state.day,"director_recall",{accepted:true,days});
        return {ok:true,accepted:true,roll:dice,chance,affinityDelta:0,mood:"neutral",days,mercenary:m};
      }
      return {ok:true,accepted:false,roll:dice,chance,days,mercenary:m,...refuse(m,state,"director_recall")};
    }

    return {constants:C,directorOf,daysAsDirector,totalDirectorDays,appointChance,returnChance,refusalAffinity,canOffer,offer,recall};
  }

  return {createSchoolDirectorRules};
});
