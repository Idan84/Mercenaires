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
// - Demandes (étape 3) : au camp, une par jour et par lieutenant : « rendre tel mercenaire un peu plus courageux »
//   (courage) ou « un peu plus respectueux » (respect). Chance = 10 + 80 / (1 + e^(−Δ/20)), Δ = moyenne (Charisme,
//   Intelligence) du lieutenant − Volonté du mercenaire, équipement compris. Gain = 20 % de l'écart entre le lieutenant
//   et le mercenaire (Courage contre Courage, ou affinité avec le capitaine contre affinité avec le capitaine), de 1 à
//   10 ; si le lieutenant n'est pas au-dessus, la demande échoue forcément. Le résultat tombe le lendemain matin
//   (resolveRequests, campaign.js). 30 jours entre deux demandes du même type pour un même mercenaire.
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
  // quarters(state) : quartiers du lieutenant construits (campaign.js) ; statOf(m, nom) : caractéristique avec
  // l'équipement (combat-engine.js, statWithGear), la caractéristique de base sinon.
  function createLieutenantRules({reference,tavern=null,affinityOf=()=>0,quarters=()=>0,statOf=null,random=Math.random}={}){
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
      quitMax:constant("tavern.negotiation.quit_max",75),
      cooldown:constant("lieutenant.request.cooldown_days",30),
      gainRatio:constant("lieutenant.request.gain_ratio",0.2),
      gainMin:constant("lieutenant.request.gain_min",1),
      gainMax:constant("lieutenant.request.gain_max",10)
    };
    const REQUEST_TYPES=["courage","respect"];

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
    // Les mercenaires qui comptent pour les 10 : la compagnie sans le capitaine, l'intendant, le médecin ni le directeur de
    // l'École.
    function countedMembers(state){
      const company=state.company;
      return rosterOf(state).filter(m=>m.id!==company.captainId&&m.id!==company.intendantId&&(company.medicId==null||m.id!==company.medicId)
        &&(company.directorId==null||m.id!==company.directorId)).length;
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
      if(state.company.medicId!=null&&m.id===state.company.medicId) return no("Le médecin ne peut pas être lieutenant.");
      if(state.company.directorId!=null&&m.id===state.company.directorId) return no("Le directeur de l’École ne peut pas être lieutenant.");
      if(isLieutenant(state,m)) return no("Il est déjà lieutenant.");
      if(m.lieutenantRefused) return no("Il a refusé de devenir lieutenant, pour de bon.");
      // Mission programmée (Idan, 2026-10-30) : encore au camp jusqu'au lendemain matin, on peut lui parler.
      if((state.expeditions||[]).some(e=>e.memberIds.includes(m.id)&&e.status!=="scheduled")) return no("Il est en mission.");
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

    // ---- Demandes au lieutenant (étape 3) ----
    const geared=(m,name)=>statOf?Number(statOf(m,name))||0:stat(m,name);
    const away=(state,m)=>(state.expeditions||[]).some(e=>e.memberIds.includes(m.id)&&e.status!=="scheduled");
    // Jours avant de pouvoir refaire cette demande pour ce mercenaire (0 : tout de suite).
    function requestWait(state,target,type){
      const last=target?.lieutenantRequests?.[type];
      return last==null?0:Math.max(0,Number(last)+C.cooldown-state.day);
    }
    // Sans cible : le lieutenant peut-il recevoir une demande aujourd'hui ? Avec cible : cette demande-là.
    function canRequest(state,lieutenant,type=null,target=null){
      if(!isLieutenant(state,lieutenant)) return no("Il n’est pas lieutenant.");
      if(away(state,lieutenant)) return no("Il est en mission.");
      if(lieutenant.lieutenantRequest) return {...no("Il s’occupe déjà de quelqu’un : réponse demain matin."),busy:true};
      if(type==null) return {ok:true};
      if(!REQUEST_TYPES.includes(type)) return no("Demande inconnue.");
      if(!target) return {ok:true};
      if(target===lieutenant) return no("Pas lui-même.");
      if(target.id===state.company.captainId) return no("Pas le capitaine.");
      if(away(state,target)) return no("Il est en mission.");
      const wait=requestWait(state,target,type);
      if(wait>0) return {...no(`Pas avant ${wait} jour${wait>1?"s":""}.`),wait};
      return {ok:true};
    }
    // Ce que l'on compare : le Courage, ou l'affinité avec le capitaine.
    function compared(state,m,type){ return type==="courage"?stat(m,"Courage"):Number(affinityOf(state,m))||0; }
    function requestChance(lieutenant,target){
      const delta=(geared(lieutenant,"Charisme")+geared(lieutenant,"Intelligence"))/2-geared(target,"Volonté");
      return 10+80/(1+Math.exp(-delta/20));
    }
    // Gain en cas de réussite ; 0 quand le lieutenant n'est pas au-dessus du mercenaire (échec forcé).
    function requestGain(state,lieutenant,target,type){
      const gap=compared(state,lieutenant,type)-compared(state,target,type);
      return gap>0?clamp(Math.round(C.gainRatio*gap),C.gainMin,C.gainMax):0;
    }
    function request(state,lieutenantId,type,targetId){
      const roster=rosterOf(state),lieutenant=roster.find(m=>m.id===lieutenantId),target=roster.find(m=>m.id===targetId);
      if(!target) return no("Mercenaire introuvable.");
      const allowed=canRequest(state,lieutenant,type,target);
      if(!allowed.ok) return allowed;
      lieutenant.lieutenantRequest={type,targetId:target.id,day:state.day};
      (target.lieutenantRequests||(target.lieutenantRequests={}))[type]=state.day;
      return {ok:true,lieutenant,target,type};
    }
    // Le lendemain matin : chaque demande de la veille est jouée ; le lieutenant donne le résultat.
    function resolveRequests(state){
      const reports=[];
      for(const lieutenant of lieutenantsOf(state)){
        const pending=lieutenant.lieutenantRequest;
        if(!pending||pending.day>=state.day) continue;
        delete lieutenant.lieutenantRequest;
        const target=rosterOf(state).find(m=>m.id===pending.targetId);
        if(!target) continue;
        const gain=requestGain(state,lieutenant,target,pending.type),chance=requestChance(lieutenant,target);
        const roll=Math.floor(random()*100)+1,forced=gain<=0,success=!forced&&roll<=chance;
        if(success){
          if(pending.type==="courage") target.stats.Courage=stat(target,"Courage")+gain;
          else target.affinityAcquired=(Number(target.affinityAcquired)||0)+gain;
          History.record(target,state.day,"lieutenant_request",{type:pending.type,gain,lieutenant:lieutenant.name});
        }
        reports.push({lieutenant,target,type:pending.type,success,gain:success?gain:0,chance,roll,forced});
      }
      return reports;
    }

    return {constants:C,lieutenantsOf,isLieutenant,countedMembers,openPosts,blocker,canPromote,candidates,demand,talkOf,
      startPromotion,offer,REQUEST_TYPES,requestWait,canRequest,requestChance,requestGain,request,resolveRequests};
  }

  return {createLieutenantRules};
});
