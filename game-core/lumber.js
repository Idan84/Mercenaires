"use strict";

// Cabane du bûcheron (Idan, 2026-11-03 : « l'idée c'est d'envoyer des mercenaires bûcheronner pour accélérer la
// construction du camp. Pas une ressource de bois […] sur les constructions actuelles de niveau 1 à 5 (y'aura la mine pour
// 6 à 10). On peut envoyer 1 mercenaire par niveau de cabane […] pour 1 journée » ; chantier : « A » (celui qui finit le plus
// tôt) ; dortoir : « Oui » ; effet « fixe » ; « Pas de rejet direct, mais test qui implique une baisse d'affinité. Il y va
// mais à contrecœur… test assez dur et petite perte à chaque fois » ; « Parfait »). Module pur : campaign.js lui donne le
// camp et appelle morning(state) chaque matin, après les chantiers terminés.
//
// - Places : 1 bûcheron par niveau de la Cabane et par jour (camp.lumber.workers_per_level).
// - Au jour J, on organise J+1 : on l'envoie aujourd'hui, il bûcheronne demain toute la journée (ni mission, ni garde du
//   corps, ni entraînement libre, ni apprentissage) ; on peut annuler d'ici là.
// - Il y va toujours : chance d'y aller de bon cœur = 10 + 80 / (1 + e^(−Δ/20)), Δ = 0,5 × affinité avec le capitaine − 30
//   + l'appui de l'intendant ; raté, il y va à contrecœur : affinité −2. Le capitaine, sans test.
// - Effet : chaque bûcheron retire 1 jour (camp.lumber.days_per_worker) au chantier qui finit le plus tôt, parmi ceux de
//   niveau 1 à 5 (camp.lumber.max_work_level) : un bâtiment (son niveau en construction), la qualité du dortoir (son
//   niveau), un agrandissement du dortoir (son rang), un quartier du lieutenant (son numéro). Un chantier finit au plus tôt
//   le lendemain matin.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesLumber=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const HALL="lumber_camp";
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const curve=(delta,slope)=>10+80/(1+Math.exp(-delta/slope));
  // Le « niveau » d'un chantier, pour la règle des niveaux 1 à 5.
  function workLevel(work){
    if(!work) return 0;
    if(work.kind==="dormitory"||work.kind==="lieutenant_quarter") return Number(work.number)||0;
    return Number(work.level)||0;
  }
  function workName(work){
    if(work?.kind==="dormitory") return "Agrandissement du dortoir";
    if(work?.kind==="dormitory_quality") return "Qualité du dortoir";
    if(work?.kind==="lieutenant_quarter") return "Quartier du lieutenant";
    return work?.name||"Chantier";
  }

  // camp : { buildingLevel(state, code), expeditionOf(state, id), busyElsewhere(state, id) → raison ou null (un
  //          apprentissage), offField(state, m) (intendant, médecin, maîtres : à leur poste), works(state) → les chantiers
  //          en cours (objets construction, modifiés sur place) } (campaign.js).
  function createLumberRules({reference,random=Math.random,affinity=null,camp}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      perLevel:k("camp.lumber.workers_per_level",1),daysPerWorker:k("camp.lumber.days_per_worker",1),
      maxLevel:k("camp.lumber.max_work_level",5),offset:k("camp.lumber.offer_offset",-30),grudge:k("camp.lumber.grudge_affinity",-2),
      offerAffinity:k("spell_study.offer.affinity_weight",0.5),slope:k("spell_study.offer.slope",20),
      stewardSkill:k("equipment_deal.steward_skill_weight",0.2),stewardAffinity:k("equipment_deal.steward_affinity_weight",0.25)
    };
    const rosterOf=state=>state?.company?.roster||[];
    const memberOf=(state,id)=>rosterOf(state).find(m=>m.id===id)||null;
    const captainOf=state=>memberOf(state,state.company.captainId);
    const isCaptain=(state,m)=>Boolean(m)&&m.id===state.company.captainId;
    const no=reason=>({ok:false,reason});
    const roll=()=>random()*100;

    // Les bûcherons : [{ id, day, grudging }] (day : le jour de travail).
    function entriesOf(state){
      const camp_=state.company.camp;
      if(!Array.isArray(camp_.lumberjacks)) camp_.lumberjacks=[];
      return camp_.lumberjacks;
    }
    const slots=state=>Math.max(0,(Number(camp.buildingLevel(state,HALL))||0)*C.perLevel);
    const plannedFor=(state,day)=>entriesOf(state).filter(e=>e.day===day);
    const tomorrow=state=>plannedFor(state,state.day+1);
    function busyReason(state,mercenaryId){
      const entry=entriesOf(state).find(e=>e.id===mercenaryId&&e.day>=state.day);
      if(!entry) return null;
      return entry.day>state.day?"Il part bûcheronner demain matin.":"Il bûcheronne aujourd’hui.";
    }
    const affinityWithCaptain=(state,m)=>Number(affinity?.memberAffinity?.(captainOf(state),m)?.total)||0;
    const feeling=(toward,who)=>Number(affinity?.affinity?.(toward,who)?.total)||0;
    function stewardHelp(state,m){
      const steward=state.company.intendantId==null?null:memberOf(state,state.company.intendantId);
      if(!steward||steward===m) return 0;
      return C.stewardSkill*clamp(Number(steward.skills?.camp?.Intendance)||0,0,100)+C.stewardAffinity*feeling(steward,m);
    }
    // La chance qu'il y aille de bon cœur (en %), sans jet.
    function chance(state,m){
      if(isCaptain(state,m)) return {chance:100,delta:null};
      const delta=C.offerAffinity*affinityWithCaptain(state,m)+C.offset+stewardHelp(state,m);
      return {chance:curve(delta,C.slope),delta};
    }

    function canSend(state,m){
      if(!m) return no("Mercenaire introuvable.");
      if(!(slots(state)>0)) return no("Il faut d’abord construire la Cabane du bûcheron.");
      if(entriesOf(state).some(e=>e.id===m.id&&e.day===state.day+1)) return no("Il part déjà bûcheronner demain.");
      if(camp.offField?.(state,m)) return no("Il ne quitte pas son poste au camp.");
      if(m.recovery) return no("Il doit d’abord se remettre.");
      const expedition=camp.expeditionOf(state,m.id);
      if(expedition) return no(expedition.status==="scheduled"?"Il part en mission demain.":"Il est en mission.");
      const busy=camp.busyElsewhere?.(state,m.id);
      if(busy) return no(busy);
      if(tomorrow(state).length>=slots(state)) return no("La Cabane n’a plus de place demain.");
      return {ok:true};
    }
    // L'envoyer bûcheronner demain : il y va toujours, de bon cœur ou à contrecœur (affinité −2).
    function send(state,mercenaryId){
      const m=memberOf(state,mercenaryId);
      const check=canSend(state,m);
      if(!check.ok) return check;
      const odds=chance(state,m).chance;
      const captain=isCaptain(state,m);
      const dice=captain?0:roll();
      const grudging=!(dice<odds);
      let affinityDelta=0;
      if(grudging){ m.affinityAcquired=(Number(m.affinityAcquired)||0)+C.grudge; affinityDelta=C.grudge; }
      entriesOf(state).push({id:m.id,day:state.day+1,grudging});
      return {ok:true,grudging,chance:odds,roll:captain?null:dice,affinityDelta,mercenary:m};
    }
    // Annuler avant demain (l'affinité perdue ne revient pas).
    function cancel(state,mercenaryId){
      const list=entriesOf(state),i=list.findIndex(e=>e.id===mercenaryId&&e.day===state.day+1);
      if(i<0) return no("Il ne part pas bûcheronner demain.");
      list.splice(i,1);
      return {ok:true};
    }

    // Les chantiers que le bois peut accélérer aujourd'hui : niveau 1 à 5, pas déjà au plus court.
    const eligible=state=>(camp.works(state)||[]).filter(work=>{
      const level=workLevel(work);
      return level>=1&&level<=C.maxLevel&&Number(work.endDay)>state.day+1;
    });
    // Chaque matin : les bûcherons du jour travaillent ; chacun retire un jour au chantier qui finit le plus tôt.
    function morning(state){
      const list=entriesOf(state);
      for(let i=list.length-1;i>=0;i--) if(list[i].day<state.day||!memberOf(state,list[i].id)) list.splice(i,1);
      const workers=list.filter(e=>e.day===state.day&&!camp.expeditionOf(state,e.id));
      const reduced=new Map();
      for(const worker of workers){
        const works=eligible(state).sort((a,b)=>a.endDay-b.endDay);
        const work=works[0];
        if(!work) break;
        work.endDay=Math.max(state.day+1,work.endDay-C.daysPerWorker);
        const entry=reduced.get(work)||{name:workName(work),days:0,endDay:work.endDay};
        entry.days+=1;
        entry.endDay=work.endDay;
        reduced.set(work,entry);
        worker.helped=entry.name;
      }
      return {workers:workers.map(w=>({id:w.id,grudging:w.grudging,mercenary:memberOf(state,w.id)})),reduced:[...reduced.values()]};
    }

    return {constants:C,HALL,slots,entriesOf,plannedFor,tomorrow,busyReason,chance,canSend,send,cancel,morning,workLevel,workName};
  }

  return {createLumberRules,HALL,workLevel,workName};
});
