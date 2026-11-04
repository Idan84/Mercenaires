"use strict";

// Renégociation salariale (Idan, 2026-11-04 : « Quand un mercenaire gagne une étoile de réputation, il fait un test (entre
// salaire perçu et salaire théorique). En fonction de son intelligence, il vient demander un meilleur salaire au
// capitaine… On rentre dans une phase de négociation. Avec gain ou perte d'affinité » ; « oui » ; « parfait ») :
//
// - le matin, un membre au camp (pas en mission, pas au cachot) qui a gagné une étoile depuis la dernière fois compare son
//   salaire à son salaire théorique : la formule du recrutement (09 §4) avec ses valeurs du jour (réputation, prétentions,
//   Intelligence, affinité avec le capitaine) ; assez payé : rien ;
// - sinon, chance de venir réclamer = 100 / (1 + e^(−Δ/10)), Δ = 100 × écart + (Intelligence − 50) / 2 − 15, de 5 à 95 %
//   (écart = théorique ÷ salaire − 1) ; s'il ne vient pas, rien avant sa prochaine étoile ;
// - il réclame son salaire théorique ; la prime de mission ne bouge pas ;
// - la négociation (une scène au début de la journée, qui bloque le jeu) : Accepter, Proposer, Refuser ; jamais moins que son
//   salaire actuel ; comme à la Taverne (14 §9, salaire seul) : il accepte, fait une contre-proposition ou rompt (il garde
//   son salaire) ;
// - affinité : +5 s'il obtient tout ce qu'il demande ; 0 si on tombe d'accord plus bas ; −10 si on refuse ou s'il rompt ;
//   après une rupture, la relance (persuasion.js) : Intimider ou Convaincre pour qu'il accepte la dernière offre (chance
//   d'accepter cette offre + Intimidation ou Charisme ÷ 2, au plus 95 %) ; ratée : −10 × 2 (intimidé) ou × 0,5 (convaincu).
//
// Constantes : salary_review.* (formula-constants.json). État : m.salaryStars (le niveau d'étoiles déjà vu) ;
// state.company.salaryReviews (les demandes en attente de la scène). Module pur.
(function(root,factory){
  const node=typeof module!=="undefined"&&module.exports;
  const history=node?require("./history.js"):root.MercenairesHistory;
  const persuasion=node?require("./persuasion.js"):root.MercenairesPersuasion;
  const api=factory(history,persuasion);
  if(node) module.exports=api;
  root.MercenairesSalaryReview=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(History,Persuasion){
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
  const stat=(m,name)=>Number(m?.stats?.[name])||0;

  // camp : {
  //   awayOf(state, id) → en mission, affinityOf(state, m) → son affinité avec le capitaine (total),
  //   salaryDemand(m, affinité) → son salaire théorique (mercenary-generator.js),
  //   resistance(m, affinité) → sa résistance à la négociation (tavern.js) }.
  function createSalaryReviewRules({reference,random=Math.random,camp}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      gapWeight:k("salary_review.chance.gap_weight",100),intelligenceMedian:k("salary_review.chance.intelligence_median",50),
      intelligenceWeight:k("salary_review.chance.intelligence_weight",0.5),offset:k("salary_review.chance.offset",-15),
      scale:k("salary_review.chance.scale",10),min:k("salary_review.chance.min",5),max:k("salary_review.chance.max",95),
      granted:k("salary_review.affinity.granted",5),refused:k("salary_review.affinity.refused",-10),
      quitConcession:k("tavern.negotiation.quit_concession_coefficient",1.5),quitMax:k("tavern.negotiation.quit_max",95),
      retryMax:k("salary_review.retry.max",95)
    };
    const persuasion=Persuasion?Persuasion.createPersuasionRules({reference}):null;
    const STARS=[...(reference?.reputationStars?.rows||[])].sort((a,b)=>a.niveau-b.niveau);
    const rosterOf=state=>state?.company?.roster||[];
    const memberOf=(state,id)=>rosterOf(state).find(m=>m.id===id)||null;
    const no=reason=>({ok:false,reason});
    const roll=()=>Math.floor(random()*100)+1;
    const shift=(m,delta)=>{ if(delta) m.affinityAcquired=(Number(m.affinityAcquired)||0)+delta; return delta; };
    const salaryOf=m=>Number(m?.contract?.dailySalary)||0;
    const affinityOf=(state,m)=>Number(camp.affinityOf?.(state,m))||0;

    // Le niveau d'étoiles (1 à 15) d'une réputation.
    function starLevel(reputation){
      const value=Number(reputation)||0;
      let level=STARS.length?STARS[0].niveau:1;
      for(const row of STARS) if(value>=Number(row.reputation_min)) level=row.niveau;
      return level;
    }
    // Son salaire théorique, l'écart avec son salaire, sa chance de venir réclamer.
    const theoretical=(state,m)=>camp.salaryDemand(m,affinityOf(state,m));
    function gap(state,m){
      const salary=salaryOf(m);
      return salary>0?theoretical(state,m)/salary-1:0;
    }
    function requestChance(state,m){
      const g=gap(state,m);
      if(!(g>0)) return 0;
      const delta=C.gapWeight*g+C.intelligenceWeight*(stat(m,"Intelligence")-C.intelligenceMedian)+C.offset;
      return clamp(100/(1+Math.exp(-delta/C.scale)),C.min,C.max);
    }

    // Les demandes en attente de la scène.
    const pending=state=>(state.company.salaryReviews||[]).filter(e=>memberOf(state,e.id));
    const pendingOf=(state,id)=>pending(state).find(e=>e.id===id)||null;
    function canAdvance(state){
      const first=pending(state)[0];
      return first?{ok:false,reason:"Un mercenaire veut vous parler de son salaire : répondez-lui d’abord.",id:first.id}:{ok:true};
    }
    function close(state,entry){ state.company.salaryReviews=(state.company.salaryReviews||[]).filter(e=>e!==entry); }

    // Chaque matin : ceux qui ont gagné une étoile depuis la dernière fois.
    function morning(state){
      const report={tests:[],requests:[]};
      if(!camp.salaryDemand) return report;
      for(const m of rosterOf(state)){
        if(m.id===state.company.captainId||!(salaryOf(m)>0)) continue;
        // Au cachot, en mission, ou repéré en train de déserter : plus tard.
        if(m.dungeon||camp.awayOf(state,m.id)||pendingOf(state,m.id)||(state.company.deserting||[]).some(e=>e.id===m.id)) continue;
        const level=starLevel(m.reputation),before=m.salaryStars;
        m.salaryStars=level;
        if(!Number.isFinite(before)||level<=before) continue;
        const chance=requestChance(state,m),dice=chance>0?roll():null,asks=dice!=null&&dice<=chance;
        report.tests.push({id:m.id,level,chance,roll:dice,asks});
        if(!asks) continue;
        const demand=theoretical(state,m),current=salaryOf(m);
        const entry={id:m.id,day:state.day,demand,current,salary:demand,refused:null,rounds:0,broken:null};
        (state.company.salaryReviews||(state.company.salaryReviews=[])).push(entry);
        report.requests.push({id:m.id,mercenary:m,demand,current,chance,roll:dice});
      }
      return report;
    }

    // L'issue : son nouveau salaire (ou le même), l'affinité, l'historique.
    function settle(state,m,entry,salary,affinityDelta,extra={}){
      close(state,entry);
      const before=salaryOf(m);
      if(salary>before) m.contract={...(m.contract||{}),dailySalary:salary};
      shift(m,affinityDelta);
      if(salary>before) History?.record(m,state.day,"salary_raise",{from:before,to:salary});
      else History?.record(m,state.day,"salary_refused",{});
      return {ok:true,mercenary:m,salary:salaryOf(m),from:before,affinityDelta,...extra};
    }
    const open=(state,id)=>{
      const entry=pendingOf(state,id),m=memberOf(state,id);
      if(!entry) return {error:no("Il ne demande rien.")};
      if(entry.broken) return {error:no("La négociation est rompue.")};
      return {entry,m};
    };
    // Accepter ce qu'il demande maintenant (sa demande, ou sa contre-proposition) : +5 s'il obtient tout.
    function accept(state,id){
      const {entry,m,error}=open(state,id);
      if(error) return error;
      return settle(state,m,entry,entry.salary,entry.salary>=entry.demand?C.granted:0,{outcome:"accepted"});
    }
    // Refuser : il garde son salaire ; −10.
    function refuse(state,id){
      const {entry,m,error}=open(state,id);
      if(error) return error;
      return settle(state,m,entry,entry.current,C.refused,{outcome:"refused"});
    }
    // Une offre : accepted | invalid | counter | broken (il rompt ; la relance reste possible).
    function offer(state,id,amount){
      const {entry,m,error}=open(state,id);
      if(error) return {outcome:"invalid",...error};
      const salary=Math.max(0,Math.round(Number(amount)||0));
      if(salary<entry.current) return {outcome:"invalid",reason:"below",floor:entry.current};
      if(entry.refused!=null&&salary<entry.refused) return {outcome:"invalid",reason:"refused",floor:entry.refused};
      entry.rounds+=1;
      if(salary>=entry.salary) return settle(state,m,entry,salary,salary>=entry.demand?C.granted:0,{outcome:"accepted",automatic:true});
      // Comme à la Taverne (14 §9), sur le salaire seul.
      const concession=100*(1-salary/entry.salary);
      const resistance=camp.resistance?camp.resistance(m,affinityOf(state,m)):50;
      const pAccept=clamp(95-2*concession-0.4*(resistance-50),5,95);
      const acceptRoll=roll();
      if(acceptRoll<=pAccept) return settle(state,m,entry,salary,0,{outcome:"accepted",pAccept,acceptRoll,concession});
      entry.refused=salary;
      const pQuit=clamp(5+C.quitConcession*concession+0.10*(Number(m.salaryPretension)||0)+0.10*stat(m,"Volonté"),5,C.quitMax);
      const quitRoll=roll();
      if(quitRoll<=pQuit){
        entry.broken={offer:salary,pAccept,retried:false};
        return {outcome:"broken",offer:salary,pAccept,acceptRoll,pQuit,quitRoll,concession,mercenary:m};
      }
      const tenacity=clamp(resistance/100,0,1);
      const factor=clamp(0.35+0.45*tenacity+(random()*0.2-0.1),0.25,0.90);
      entry.salary=Math.max(salary,Math.ceil(salary+factor*(entry.salary-salary)));
      return {outcome:"counter",counter:entry.salary,pAccept,acceptRoll,pQuit,quitRoll,concession,factor,mercenary:m};
    }
    // Après une rupture : la relance, pour qu'il accepte la dernière offre ; ratée : −10 × 2 ou × 0,5.
    function retryChance(state,id,key){
      const entry=pendingOf(state,id);
      if(!entry?.broken) return 0;
      return Math.min(C.retryMax,entry.broken.pAccept+(persuasion?persuasion.bonus(memberOf(state,state.company.captainId),key):0));
    }
    function retry(state,id,key){
      const entry=pendingOf(state,id),m=memberOf(state,id);
      if(!entry?.broken) return no("Il n’a pas rompu la négociation.");
      if(!persuasion?.approachOf(key)) return no("Approche inconnue.");
      const chance=retryChance(state,id,key),dice=roll(),accepted=dice<=chance;
      if(accepted) return settle(state,m,entry,entry.broken.offer,0,{outcome:"accepted",approach:key,chance,roll:dice,accepted:true});
      return settle(state,m,entry,entry.current,Math.round(C.refused*persuasion.lossFactor(key)*100)/100,{outcome:"refused",approach:key,chance,roll:dice,accepted:false});
    }
    // Après une rupture, laisser tomber : il garde son salaire ; −10.
    function giveUp(state,id){
      const entry=pendingOf(state,id),m=memberOf(state,id);
      if(!entry?.broken) return no("Il n’a pas rompu la négociation.");
      return settle(state,m,entry,entry.current,C.refused,{outcome:"refused"});
    }

    return {constants:C,starLevel,theoretical,gap,requestChance,pending,pendingOf,canAdvance,morning,accept,refuse,offer,retryChance,retry,giveUp};
  }

  return {createSalaryReviewRules};
});
