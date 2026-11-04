"use strict";

// Intendant (Idan, 2026-10-24) : le capitaine propose à un mercenaire de devenir intendant ; il peut refuser.
// - Envie d'intendance = 40 − 0,6 × Courage + 2 × Missions + 8 × Blessures (retours de mission blessé, history.js) :
//   plus il est courageux, moins il veut quitter le terrain ; un vieux mercenaire souvent blessé, davantage.
//   Chance d'accepter = Envie, bornée de 2 à 95 % : au début de la partie, on a du mal à trouver un intendant.
// - Revenir sur le terrain : 60 − Envie + 1 par jour passé à l'intendance (le goût du sang lui manque), 2 à 95 %.
// - Une proposition par mercenaire et par jour ; un seul intendant ; jamais le capitaine.
// - Refus (proposé par JC, validé par Idan) : l'affinité bouge de (Intelligence − Courage) / 10, arrondi. Le malin se
//   sent flatté qu'on lui confie la compagnie (une seule fois), le brave se vexe qu'on veuille l'écarter du combat
//   (à chaque fois). Un accord ne change pas l'affinité : il a eu ce qu'il voulait.
// - Évaluer un candidat de la Taverne : estimation à ±20 % × (1 − Intendance/100) (14 §7), figée par candidat et
//   par caractéristique, gratuite.
// - Revenir sur le terrain : il reprend sa place au dortoir ; si le dortoir n'en a plus assez, son retour est bloqué
//   (Idan, 2026-10-24). dormitory : { free(state), places(mercenaire) }, les règles du dortoir de campaign.js.
// L'aide de l'intendant aux échanges d'équipement est dans equipment-deals.js. Constantes : steward.*.
(function(root,factory){
  const history=typeof module!=="undefined"&&module.exports?require("./history.js"):root.MercenairesHistory;
  const posts=typeof module!=="undefined"&&module.exports?require("./camp-posts.js"):root.MercenairesCampPosts;
  // Relance après un refus (Idan, 2026-11-04) : Intimider ou Convaincre, ajoutés à la chance.
  const persuasion=typeof module!=="undefined"&&module.exports?require("./persuasion.js"):root.MercenairesPersuasion;
  const api=factory(history,posts,persuasion);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesSteward=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(History,Posts,Persuasion){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function createStewardRules({reference,random=Math.random,dormitory=null}={}){
    const constant=(code,fallback)=>{
      const value=Number(rows(reference?.formulaConstants).find(r=>r.code===code)?.valeur);
      return Number.isFinite(value)?value:fallback;
    };
    const C={
      base:constant("steward.appoint.base",40),
      courage:constant("steward.appoint.courage_weight",0.6),
      missions:constant("steward.appoint.mission_weight",2),
      wounds:constant("steward.appoint.wound_weight",8),
      returnBase:constant("steward.return.base",60),
      perDay:constant("steward.return.per_day",1),
      min:constant("steward.chance.min",2),
      max:constant("steward.chance.max",95),
      refusalDivisor:constant("steward.refusal.affinity_divisor",10),
      maxError:constant("steward.estimate.max_error",0.2)
    };

    const rosterOf=state=>state?.company?.roster||[];
    const stat=(m,name)=>Number(m?.stats?.[name])||0;
    function no(reason){ return {ok:false,reason}; }
    // La relance (persuasion.js) : + Intimidation du capitaine, ou + son Charisme ÷ 2, en points de chance.
    const persuasion=Persuasion?Persuasion.createPersuasionRules({reference}):null;
    const REFUSAL="stewardRefusal";
    const persuade=(state,key)=>persuasion&&key?persuasion.bonus(rosterOf(state).find(m=>m.id===state.company.captainId),key):0;
    function stewardOf(state){
      const id=state?.company?.intendantId;
      return id==null?null:rosterOf(state).find(m=>m.id===id)||null;
    }

    function desire(m){
      const history=m?.history||{};
      return C.base-C.courage*stat(m,"Courage")+C.missions*(Number(history.missions)||0)+C.wounds*(Number(history.timesWounded)||0);
    }
    function appointChance(m){ return clamp(desire(m),C.min,C.max); }
    function daysAsSteward(state){
      return stewardOf(state)?Math.max(0,state.day-(Number(state.company.intendantSince)||state.day)):0;
    }
    function returnChance(state,m){ return clamp(C.returnBase-desire(m)+C.perDay*daysAsSteward(state),C.min,C.max); }

    // Refus : + flatté (une seule fois) ou − vexé (à chaque fois).
    function refusalAffinity(m){
      const delta=Math.round((stat(m,"Intelligence")-stat(m,"Courage"))/C.refusalDivisor);
      return delta>0&&m.stewardFlattered?0:delta;
    }

    function canOffer(state,m,{retry=false}={}){
      if(!m) return no("Mercenaire introuvable.");
      if(m.id===state.company.captainId) return no("Le capitaine ne peut pas être intendant.");
      // Recruté aujourd'hui : un poste attend le lendemain matin (Idan, 2026-11-02).
      if(Number(m.contract?.joinDay)>state.day) return no("Il rejoint la compagnie demain matin.");
      // Le lieutenant reste sur le terrain (Idan, 2026-10-25).
      if((state.company.lieutenantIds||[]).includes(m.id)) return no("Un lieutenant ne peut pas être intendant.");
      if(state.company.medicId!=null&&m.id===state.company.medicId) return no("Le médecin ne peut pas être intendant.");
      // Le directeur de l'École et les maîtres (camp-posts.js).
      const post=Posts.postOf(state,m);
      if(post) return no(`${post.title} ne peut pas être intendant.`);
      // Parti en expédition (doc 17) : on lui en parlera à son retour. Mission programmée : l'intendant reste au camp,
      // celui qui part demain ne peut pas l'être.
      const mission=(state.expeditions||[]).find(e=>e.memberIds.includes(m.id));
      if(mission) return no(mission.status==="scheduled"?"Il part en mission demain.":"Il est en mission.");
      if(!retry&&m.stewardOfferDay===state.day) return no("Vous lui en avez déjà parlé aujourd’hui.");
      return {ok:true};
    }

    function roll(){ return Math.floor(random()*100)+1; }
    function refuse(m,state,kind){
      const affinityDelta=refusalAffinity(m);
      if(affinityDelta) m.affinityAcquired=(Number(m.affinityAcquired)||0)+affinityDelta;
      if(affinityDelta>0) m.stewardFlattered=true;
      History.record(m,state.day,kind,{accepted:false});
      return {affinityDelta,mood:affinityDelta>0?"flattered":affinityDelta<0?"vexed":"neutral"};
    }

    // Refusé : le refus du jour (une relance possible), ou la relance ratée (rien de plus ici : retryRefusal revoit
    // l'affinité du premier refus).
    function refused(state,m,kind,record,base,retry){
      if(retry) return {ok:true,accepted:false,...base,mercenary:m};
      const r=refuse(m,state,record);
      persuasion?.markRefused(m,REFUSAL,state.day,{kind,affinityDelta:r.affinityDelta,mood:r.mood});
      return {ok:true,accepted:false,...base,mercenary:m,...r,canRetry:Boolean(persuasion)};
    }
    // Proposer le poste d'intendant ; approach : la relance.
    function offer(state,mercenaryId,{approach=null,retry=false}={}){
      const m=rosterOf(state).find(x=>x.id===mercenaryId);
      const current=stewardOf(state);
      if(current) return no(current===m?"Il est déjà intendant.":"La compagnie a déjà un intendant.");
      const allowed=canOffer(state,m,{retry});
      if(!allowed.ok) return allowed;
      const chance=approach?clamp(desire(m)+persuade(state,approach),C.min,C.max):appointChance(m),dice=roll();
      m.stewardOfferDay=state.day;
      if(dice<=chance){
        state.company.intendantId=m.id;
        state.company.intendantSince=state.day;
        History.record(m,state.day,"steward",{accepted:true});
        return {ok:true,accepted:true,roll:dice,chance,affinityDelta:0,mood:"neutral",mercenary:m};
      }
      return refused(state,m,"offer","steward",{roll:dice,chance},retry);
    }

    // Proposer à l'intendant de revenir sur le terrain ; approach : la relance.
    function recall(state,{approach=null,retry=false}={}){
      const m=stewardOf(state);
      if(!m) return no("La compagnie n’a pas d’intendant.");
      const allowed=canOffer(state,m,{retry});
      if(!allowed.ok) return allowed;
      if(dormitory&&dormitory.free(state)<dormitory.places(m)) return {...no("Le dortoir est plein : pas de place pour son retour."),dormFull:true};
      const chance=clamp(C.returnBase-desire(m)+C.perDay*daysAsSteward(state)+persuade(state,approach),C.min,C.max),dice=roll(),days=daysAsSteward(state);
      m.stewardOfferDay=state.day;
      if(dice<=chance){
        History.historyOf(m).stewardDays=(Number(m.history?.stewardDays)||0)+days;
        state.company.intendantId=null;
        delete state.company.intendantSince;
        History.record(m,state.day,"recall",{accepted:true,days});
        return {ok:true,accepted:true,roll:dice,chance,affinityDelta:0,mood:"neutral",days,mercenary:m};
      }
      return refused(state,m,"recall","recall",{roll:dice,chance,days},retry);
    }
    // Après un refus (le poste, ou le retour sur le terrain), aujourd'hui : une relance, Intimider ou Convaincre.
    function retry(state,mercenaryId,approach){
      const m=rosterOf(state).find(x=>x.id===mercenaryId);
      if(!persuasion) return no("Pas de relance.");
      return persuasion.retryRefusal(m,REFUSAL,state.day,approach,
        (refusal,key)=>refusal.kind==="recall"?recall(state,{approach:key,retry:true}):offer(state,mercenaryId,{approach:key,retry:true}),"stewardFlattered");
    }

    // Évaluer une caractéristique d'un candidat de la Taverne : estimation figée, gratuite.
    function estimate(state,candidate,key,value){
      const steward=stewardOf(state);
      if(!steward) return no("La compagnie n’a pas d’intendant.");
      const known=candidate.stewardEstimates?.[key];
      if(Number.isFinite(known)) return {ok:true,estimate:known,repeated:true,steward};
      const real=Number(value);
      if(!Number.isFinite(real)) return no("Valeur inconnue : "+key);
      const skill=clamp(Number(steward.skills?.camp?.Intendance)||0,0,100);
      const error=C.maxError*(1-skill/100);
      const result=Math.round(real*(1-error+random()*2*error));
      (candidate.stewardEstimates||(candidate.stewardEstimates={}))[key]=result;
      return {ok:true,estimate:result,repeated:false,steward,maxError:error};
    }

    // Jours d'intendance : les passages terminés et celui en cours.
    function totalStewardDays(state,m){
      return (Number(m?.history?.stewardDays)||0)+(stewardOf(state)===m?daysAsSteward(state):0);
    }

    return {constants:C,stewardOf,desire,appointChance,returnChance,daysAsSteward,totalStewardDays,refusalAffinity,canOffer,offer,recall,retry,estimate};
  }

  return {createStewardRules};
});
