"use strict";

// Lieutenants (Idan, 2026-10-25 ; formules de JC validées, doc 11 §4 « Le lieutenant »).
// - Combien : un quartier construit au dortoir par lieutenant, et 10 mercenaires par lieutenant (20 pour le deuxième…).
//   Le capitaine et l'intendant ne comptent pas dans les 10 ; les lieutenants, oui. Si l'effectif baisse ensuite, le
//   lieutenant garde son grade, mais on ne peut pas en nommer d'autre.
// - Qui : un mercenaire de la compagnie, au camp ; jamais le capitaine ni l'intendant ; jamais celui qui a refusé.
// - Promotion : il accepte forcément le poste, mais renégocie son salaire selon son Intelligence : il demande
//   salaire × (1 + Intelligence / 100) ; la prime de mission ne bouge pas. On négocie comme avec une recrue
//   (doc 14 §9 : Résistance, chance d'accepter, chance de partir, contre-proposition), sur le salaire seul, sans pouvoir
//   offrir moins que son salaire actuel. Là où une recrue partirait, il refuse définitivement de devenir lieutenant.
//   Affinité : +10 s'il est promu, −10 s'il refuse.
// - Son aura au combat est dans combat-engine.js (lieutenant.aura.share).
// Constantes : lieutenant.* (formula-constants.json) ; la négociation reprend celles de la Taverne (tavern.negotiation.*).
(function(root,factory){
  const history=typeof module!=="undefined"&&module.exports?require("./history.js"):root.MercenairesHistory;
  const api=factory(history);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesLieutenants=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(History){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  // tavern : les règles de la Taverne (négociation) ; affinityOf(state, m) : affinité du mercenaire avec le capitaine ;
  // quarters(state) : quartiers du lieutenant construits (campaign.js).
  function createLieutenantRules({reference,tavern=null,affinityOf=()=>0,quarters=()=>0,random=Math.random}={}){
    const constant=(code,fallback)=>{
      const value=Number(rows(reference?.formulaConstants).find(r=>r.code===code)?.valeur);
      return Number.isFinite(value)?value:fallback;
    };
    const C={
      perLieutenant:constant("lieutenant.mercenaries_per_lieutenant",10),
      salaryIntelligence:constant("lieutenant.salary.intelligence_ratio",1),
      promoted:constant("lieutenant.affinity.promoted",10),
      refused:constant("lieutenant.affinity.refused",-10),
      quitConcession:constant("tavern.negotiation.quit_concession_coefficient",0.75),
      quitMax:constant("tavern.negotiation.quit_max",75)
    };

    const rosterOf=state=>state?.company?.roster||[];
    const stat=(m,name)=>Number(m?.stats?.[name])||0;
    const salaryOf=m=>Math.round(Number(m?.contract?.dailySalary??m?.salary)||0);
    const bonusOf=m=>Math.round(Number(m?.contract?.missionBonus)||0);
    function no(reason){ return {ok:false,reason}; }

    function lieutenantIds(state){ return state?.company?.lieutenantIds||[]; }
    function lieutenantsOf(state){
      const ids=new Set(lieutenantIds(state));
      return rosterOf(state).filter(m=>ids.has(m.id));
    }
    function isLieutenant(state,m){ return Boolean(m)&&lieutenantIds(state).includes(m.id); }
    // Les mercenaires qui comptent pour les 10 : la compagnie sans le capitaine ni l'intendant.
    function countedMembers(state){
      const company=state.company;
      return rosterOf(state).filter(m=>m.id!==company.captainId&&m.id!==company.intendantId).length;
    }
    // Postes ouverts : le plus petit des quartiers construits et des dizaines de mercenaires.
    function openPosts(state){
      return Math.min(Number(quarters(state))||0,Math.floor(countedMembers(state)/C.perLieutenant));
    }
    // Pourquoi on ne peut pas nommer de lieutenant de plus, ou null.
    function blocker(state){
      const have=lieutenantsOf(state).length;
      if(have>=(Number(quarters(state))||0)) return {kind:"quarters",reason:"Il faut un quartier du lieutenant libre : construisez-en un au dortoir."};
      const needed=(have+1)*C.perLieutenant;
      if(countedMembers(state)<needed) return {kind:"members",needed,
        reason:`Il faut ${needed} mercenaires dans la compagnie pour ${have?"un lieutenant de plus":"un lieutenant"} (capitaine et intendant non compris).`};
      return null;
    }

    function canPromote(state,m){
      if(!m) return no("Mercenaire introuvable.");
      if(m.id===state.company.captainId) return no("Le capitaine ne peut pas être lieutenant.");
      if(m.id===state.company.intendantId) return no("L’intendant ne peut pas être lieutenant.");
      if(isLieutenant(state,m)) return no("Il est déjà lieutenant.");
      if(m.lieutenantRefused) return no("Il a refusé de devenir lieutenant, pour de bon.");
      if((state.expeditions||[]).some(e=>e.memberIds.includes(m.id))) return no("Il est en mission.");
      const block=blocker(state);
      return block?no(block.reason):{ok:true};
    }
    // Ceux à qui l'on peut proposer le poste.
    function candidates(state){ return rosterOf(state).filter(m=>canPromote(state,m).ok); }

    // Ce qu'il demande pour être lieutenant : le salaire × (1 + Intelligence / 100) ; la prime ne bouge pas.
    function demand(m){
      return {salary:Math.round(salaryOf(m)*(1+C.salaryIntelligence*stat(m,"Intelligence")/100)),bonus:bonusOf(m),current:salaryOf(m)};
    }
    // La négociation en cours (gardée sur le mercenaire : on peut partir et revenir).
    function talkOf(m){
      if(!m.lieutenantTalk){ const d=demand(m); m.lieutenantTalk={salary:d.salary,current:d.current,bonus:d.bonus,refused:null,rounds:0}; }
      return m.lieutenantTalk;
    }
    function startPromotion(state,mercenaryId){
      const m=rosterOf(state).find(x=>x.id===mercenaryId);
      const allowed=canPromote(state,m);
      if(!allowed.ok) return allowed;
      return {ok:true,mercenary:m,talk:talkOf(m)};
    }

    function promote(state,m,salary){
      const company=state.company;
      company.lieutenantIds=[...lieutenantIds(state).filter(id=>rosterOf(state).some(x=>x.id===id)),m.id];
      m.contract={...(m.contract||{}),dailySalary:salary};
      m.affinityAcquired=(Number(m.affinityAcquired)||0)+C.promoted;
      delete m.lieutenantTalk;
      History.record(m,state.day,"lieutenant",{accepted:true,salary});
    }

    // Une offre de salaire. Résultat : accepted | invalid | refused (pour de bon) | counter.
    function offer(state,mercenaryId,salaryOffer){
      const m=rosterOf(state).find(x=>x.id===mercenaryId);
      const allowed=canPromote(state,m);
      if(!allowed.ok) return {outcome:"invalid",...allowed};
      const n=talkOf(m),salary=Math.max(0,Math.round(Number(salaryOffer)||0));
      if(salary<n.current) return {outcome:"invalid",reason:"below",floor:n.current};
      if(n.refused!=null&&salary<n.refused) return {outcome:"invalid",reason:"refused",floor:n.refused};
      n.rounds+=1;
      if(salary>=n.salary){
        promote(state,m,salary);
        return {outcome:"accepted",salary,automatic:true,affinityDelta:C.promoted,mercenary:m};
      }
      const concession=100*(1-salary/n.salary);
      const affinity=Number(affinityOf(state,m))||0;
      const resistance=tavern?.negotiationResistance?tavern.negotiationResistance(m,affinity):50;
      const pAccept=clamp(95-2*concession-0.4*(resistance-50),5,95);
      const acceptRoll=Math.floor(random()*100)+1;
      if(acceptRoll<=pAccept){
        promote(state,m,salary);
        return {outcome:"accepted",salary,pAccept,acceptRoll,concession,affinityDelta:C.promoted,mercenary:m};
      }
      n.refused=salary;
      const pQuit=clamp(5+C.quitConcession*concession+0.10*(Number(m.salaryPretension)||0)+0.10*stat(m,"Volonté"),5,C.quitMax);
      const quitRoll=Math.floor(random()*100)+1;
      if(quitRoll<=pQuit){
        m.lieutenantRefused=true;
        m.affinityAcquired=(Number(m.affinityAcquired)||0)+C.refused;
        delete m.lieutenantTalk;
        History.record(m,state.day,"lieutenant",{accepted:false});
        return {outcome:"refused",pAccept,acceptRoll,pQuit,quitRoll,concession,affinityDelta:C.refused,mercenary:m};
      }
      // Contre-proposition, comme à la Taverne : jamais sous l'offre du joueur.
      const tenacity=clamp(resistance/100,0,1);
      const factor=clamp(0.35+0.45*tenacity+(random()*0.2-0.1),0.25,0.90);
      n.salary=Math.max(salary,Math.ceil(salary+factor*(n.salary-salary)));
      return {outcome:"counter",counter:n.salary,pAccept,acceptRoll,pQuit,quitRoll,concession,factor,mercenary:m};
    }

    return {constants:C,lieutenantsOf,isLieutenant,countedMembers,openPosts,blocker,canPromote,candidates,demand,talkOf,
      startPromotion,offer};
  }

  return {createLieutenantRules};
});
