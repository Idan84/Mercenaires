"use strict";

// Médecin (Idan, 2026-11-01) : une fois le Dispensaire construit, le capitaine propose à un mercenaire de devenir
// médecin ; il peut refuser, « même règle que l'intendant » (game-core/steward.js) : même envie (40 − 0,6 × Courage
// + 2 × Missions + 8 × Blessures, de 2 à 95 %), même retour sur le terrain, même effet d'un refus sur l'affinité
// (± (Intelligence − Courage) / 10 ; flatté une seule fois), une proposition par jour. Comme l'intendant, c'est un
// mercenaire hors mission : il reste au camp et vit au Dispensaire (pas de place au dortoir).
// Ses effets (blessures plus courtes, renommée, XP de Médecine à chaque blessé guéri) sont dans campaign.js.
(function(root,factory){
  const node=typeof module!=="undefined"&&module.exports;
  const steward=node?require("./steward.js"):root.MercenairesSteward;
  const history=node?require("./history.js"):root.MercenairesHistory;
  const posts=node?require("./camp-posts.js"):root.MercenairesCampPosts;
  // Relance après un refus (Idan, 2026-11-04) : Intimider ou Convaincre, ajoutés à la chance.
  const persuasion=node?require("./persuasion.js"):root.MercenairesPersuasion;
  const api=factory(steward,history,posts,persuasion);
  if(node) module.exports=api;
  root.MercenairesMedic=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Steward,History,Posts,Persuasion){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  // dormitory : { free(state), places(mercenaire) } ; dispensaryLevel(state) : niveau du Dispensaire (campaign.js).
  function createMedicRules({reference,random=Math.random,dormitory=null,dispensaryLevel=()=>0}={}){
    const steward=Steward.createStewardRules({reference,random,dormitory});
    const C=steward.constants;
    const rosterOf=state=>state?.company?.roster||[];
    const stat=(m,name)=>Number(m?.stats?.[name])||0;
    const no=reason=>({ok:false,reason});
    const persuasion=Persuasion?Persuasion.createPersuasionRules({reference}):null;
    const REFUSAL="medicRefusal";
    const persuade=(state,key)=>persuasion&&key?persuasion.bonus(rosterOf(state).find(m=>m.id===state.company.captainId),key):0;
    function medicOf(state){
      const id=state?.company?.medicId;
      return id==null?null:rosterOf(state).find(m=>m.id===id)||null;
    }
    function daysAsMedic(state){
      return medicOf(state)?Math.max(0,state.day-(Number(state.company.medicSince)||state.day)):0;
    }
    function totalMedicDays(state,m){
      return (Number(m?.history?.medicDays)||0)+(medicOf(state)===m?daysAsMedic(state):0);
    }
    // Même envie que pour l'Intendance : le brave veut le terrain, le vieux blessé moins.
    const appointChance=m=>steward.appointChance(m);
    const returnChance=(state,m)=>clamp(C.returnBase-steward.desire(m)+C.perDay*daysAsMedic(state),C.min,C.max);
    function refusalAffinity(m){
      const delta=Math.round((stat(m,"Intelligence")-stat(m,"Courage"))/C.refusalDivisor);
      return delta>0&&m.medicFlattered?0:delta;
    }

    function canOffer(state,m,{retry=false}={}){
      if(!m) return no("Mercenaire introuvable.");
      if(!(dispensaryLevel(state)>0)) return no("Il faut d’abord construire le Dispensaire.");
      if(m.id===state.company.captainId) return no("Le capitaine ne peut pas être médecin.");
      if(Number(m.contract?.joinDay)>state.day) return no("Il rejoint la compagnie demain matin.");
      if((state.company.lieutenantIds||[]).includes(m.id)) return no("Un lieutenant ne peut pas être médecin.");
      if(m.id===state.company.intendantId) return no("L’intendant ne peut pas être médecin.");
      const post=Posts.postOf(state,m);
      if(post) return no(`${post.title} ne peut pas être médecin.`);
      const mission=(state.expeditions||[]).find(e=>e.memberIds.includes(m.id));
      if(mission) return no(mission.status==="scheduled"?"Il part en mission demain.":"Il est en mission.");
      if(!retry&&m.medicOfferDay===state.day) return no("Vous lui en avez déjà parlé aujourd’hui.");
      return {ok:true};
    }

    const roll=()=>Math.floor(random()*100)+1;
    function refuse(m,state,kind){
      const affinityDelta=refusalAffinity(m);
      if(affinityDelta) m.affinityAcquired=(Number(m.affinityAcquired)||0)+affinityDelta;
      if(affinityDelta>0) m.medicFlattered=true;
      History.record(m,state.day,kind,{accepted:false});
      return {affinityDelta,mood:affinityDelta>0?"flattered":affinityDelta<0?"vexed":"neutral"};
    }

    // Refusé : le refus du jour (une relance possible), ou la relance ratée.
    function refused(state,m,kind,record,base,retry){
      if(retry) return {ok:true,accepted:false,...base,mercenary:m};
      const r=refuse(m,state,record);
      persuasion?.markRefused(m,REFUSAL,state.day,{kind,affinityDelta:r.affinityDelta,mood:r.mood});
      return {ok:true,accepted:false,...base,mercenary:m,...r,canRetry:Boolean(persuasion)};
    }
    // Proposer le poste de médecin ; approach : la relance.
    function offer(state,mercenaryId,{approach=null,retry=false}={}){
      const m=rosterOf(state).find(x=>x.id===mercenaryId);
      const current=medicOf(state);
      if(current) return no(current===m?"Il est déjà médecin.":"La compagnie a déjà un médecin.");
      const allowed=canOffer(state,m,{retry});
      if(!allowed.ok) return allowed;
      const chance=approach?clamp(steward.desire(m)+persuade(state,approach),C.min,C.max):appointChance(m),dice=roll();
      m.medicOfferDay=state.day;
      if(dice<=chance){
        state.company.medicId=m.id;
        state.company.medicSince=state.day;
        History.record(m,state.day,"medic",{accepted:true});
        return {ok:true,accepted:true,roll:dice,chance,affinityDelta:0,mood:"neutral",mercenary:m};
      }
      return refused(state,m,"offer","medic",{roll:dice,chance},retry);
    }

    // Proposer au médecin de revenir sur le terrain : il reprend une place au dortoir ; approach : la relance.
    function recall(state,{approach=null,retry=false}={}){
      const m=medicOf(state);
      if(!m) return no("La compagnie n’a pas de médecin.");
      if(!retry&&m.medicOfferDay===state.day) return no("Vous lui en avez déjà parlé aujourd’hui.");
      if(dormitory&&dormitory.free(state)<dormitory.places(m)) return {...no("Le dortoir est plein : pas de place pour son retour."),dormFull:true};
      const chance=clamp(returnChance(state,m)+persuade(state,approach),C.min,C.max),dice=roll(),days=daysAsMedic(state);
      m.medicOfferDay=state.day;
      if(dice<=chance){
        History.historyOf(m).medicDays=(Number(m.history?.medicDays)||0)+days;
        state.company.medicId=null;
        delete state.company.medicSince;
        History.record(m,state.day,"medic_recall",{accepted:true,days});
        return {ok:true,accepted:true,roll:dice,chance,affinityDelta:0,mood:"neutral",days,mercenary:m};
      }
      return refused(state,m,"recall","medic_recall",{roll:dice,chance,days},retry);
    }
    // Après un refus (le poste, ou le retour sur le terrain), aujourd'hui : une relance, Intimider ou Convaincre.
    function retry(state,mercenaryId,approach){
      const m=rosterOf(state).find(x=>x.id===mercenaryId);
      if(!persuasion) return no("Pas de relance.");
      return persuasion.retryRefusal(m,REFUSAL,state.day,approach,
        (refusal,key)=>refusal.kind==="recall"?recall(state,{approach:key,retry:true}):offer(state,mercenaryId,{approach:key,retry:true}),"medicFlattered");
    }

    return {constants:C,medicOf,daysAsMedic,totalMedicDays,appointChance,returnChance,refusalAffinity,canOffer,offer,recall,retry};
  }

  return {createMedicRules};
});
