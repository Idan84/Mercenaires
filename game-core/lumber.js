"use strict";

// Cabane du bûcheron (Idan, 2026-11-03 : « On peut envoyer 1 mercenaire par niveau de cabane ») et Guilde des mineurs
// (Idan, 2026-11-04 ; le test « pareil ») : course "lumber" ou "mine". Module pur : campaign.js lui donne le camp et appelle
// morning(state) chaque matin.
//
// Les corvées (Idan, 2026-11-04 : « on va mettre les mercenaires en durée indéterminée. On peut les retirer quand on le
// souhaite. Par contre, chaque jour fait baisser l'affinité » ; « Dans les 3 cas, ils peuvent refuser. -1 par jour c'est
// bien » ; « Oui Go ! ») :
// - Places : 1 par niveau du bâtiment (camp.<course>.workers_per_level), prises tant qu'il y reste.
// - On l'envoie aujourd'hui : il commence demain matin, puis chaque jour jusqu'à ce qu'on le retire ; retiré, il est libre
//   le lendemain. Une seule corvée à la fois ; ni mission, ni garde du corps, ni entraînement libre, ni apprentissage.
// - Il peut refuser : chance d'accepter = 10 + 80 / (1 + e^(−Δ/20)), Δ = 0,5 × affinité avec le capitaine − 30
//   (camp.lumber.offer_offset) + l'appui de l'intendant ; une relance après un refus (persuasion.js) : Intimider
//   (+ Intimidation du capitaine) ou Convaincre (+ Charisme ÷ 2) ; puis c'est non pour aujourd'hui. Le capitaine, sans test.
// - Chaque matin de travail : affinité −1 (camp.lumber.daily_affinity), × 2 s'il a été intimidé, × 0,5 s'il a été convaincu.
// - Effet (Idan, 2026-11-18 : « ils rapportent du bois et de la pierre » ; « Cabane et Guilde produisent ») : chaque matin,
//   du bois (Cabane) ou de la pierre (Guilde) dans les réserves de la compagnie (company.wood, company.stone) :
//   - le bâtiment : 20 × 0,5 × étoiles de renommée de la compagnie × niveau du bâtiment (camp.resources.hall_*) ;
//   - chaque ouvrier : 15 × (Force ÷ 50)² (camp.resources.worker_*) : « envoyer un mec très fort, c'est très utile, un
//     gobelin avec 10 en force, ça rapporte rien ».
//
// Le Palais des plaisirs (Idan, 2026-11-04 : « On peut y faire travailler nos mercenaires, ils rapportent des pièces d'or en
// fonction de leur charisme et de leur réputation. Il faut un test d'affinité pour envoyer un mercenaire » ; « Il faut que
// ça soit rentable » ; « Le maître augmente les gains » ; « Parfait ») : course "palace", même affectation, même refus et
// même relance, −1 d'affinité par jour ; test plus facile (camp.palace.offer_offset : ~50 % à affinité 0). Chaque matin,
// chacun rapporte Charisme × (1 + 0,2 × niveau de réputation) PO (camp.palace.reputation_weight ; niveau 1 à 15,
// reputation-stars.json), × (1 + Charisme du Maître des plaisirs ÷ 200) s'il y en a un (camp.palace.master_divisor).
(function(root,factory){
  const Persuasion=typeof module!=="undefined"&&module.exports?require("./persuasion.js"):root.MercenairesPersuasion;
  const OldSteward=typeof module!=="undefined"&&module.exports?require("./old-steward.js"):root.MercenairesOldSteward;
  const api=factory(Persuasion,OldSteward);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesLumber=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Persuasion,OldSteward){
  const HALL="lumber_camp";
  const COURSES={
    lumber:{hall:"lumber_camp",key:"lumberjacks",offerKey:"lumberOffer",prefix:"camp.lumber",resource:"wood",text:{
      noHall:"Il faut d’abord construire la Cabane du bûcheron.",already:"Il bûcheronne déjà.",
      full:"La Cabane n’a plus de place.",tomorrow:"Il part bûcheronner demain matin.",working:"Il bûcheronne.",
      notAssigned:"Il ne bûcheronne pas."}},
    mine:{hall:"miners_guild",key:"miners",offerKey:"mineOffer",prefix:"camp.mine",resource:"stone",text:{
      noHall:"Il faut d’abord construire la Guilde des mineurs.",already:"Il travaille déjà à la mine.",
      full:"La Guilde n’a plus de place.",tomorrow:"Il descend à la mine demain matin.",working:"Il travaille à la mine.",
      notAssigned:"Il ne travaille pas à la mine."}},
    palace:{hall:"pleasure_palace",key:"palaceWorkers",offerKey:"palaceOffer",prefix:"camp.palace",effect:"gold",text:{
      noHall:"Il faut d’abord construire le Palais des plaisirs.",already:"Il travaille déjà au Palais.",
      full:"Le Palais n’a plus de place.",tomorrow:"Il commence au Palais demain matin.",working:"Il travaille au Palais.",
      notAssigned:"Il ne travaille pas au Palais."}}
  };
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const curve=(delta,slope)=>10+80/(1+Math.exp(-delta/slope));

  // course : "lumber" (Cabane, par défaut), "mine" (Guilde) ou "palace" (Palais des plaisirs).
  // camp : { buildingLevel(state, code), expeditionOf(state, id), busyElsewhere(state, id) → raison ou null (un
  //          apprentissage, l'autre corvée), offField(state, m) (intendant, médecin, maîtres : à leur poste),
  //          companyLevel(state) → étoiles de renommée de la compagnie (1 à 15), masterOf(state) → le Maître des plaisirs }
  //          (campaign.js).
  function createLumberRules({reference,random=Math.random,affinity=null,camp,course="lumber"}={}){
    const oldSteward=OldSteward?OldSteward.createOldSteward({reference}):null;
    const COURSE=COURSES[course]||COURSES.lumber,T=COURSE.text,hall=COURSE.hall;
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const persuasion=Persuasion?Persuasion.createPersuasionRules({reference}):null;
    const C={
      perLevel:k(COURSE.prefix+".workers_per_level",1),
      hallYield:k("camp.resources.hall_yield",20),starWeight:k("camp.resources.hall_star_weight",0.5),
      workerYield:k("camp.resources.worker_yield",15),forceRef:k("camp.resources.worker_force_ref",50),
      forceExponent:k("camp.resources.worker_force_exponent",2),
      offset:k(COURSE.prefix+".offer_offset",k("camp.lumber.offer_offset",-30)),
      daily:k(COURSE.prefix+".daily_affinity",k("camp.lumber.daily_affinity",-1)),
      reputationWeight:k("camp.palace.reputation_weight",0.2),masterDivisor:k("camp.palace.master_divisor",200),
      offerAffinity:k("spell_study.offer.affinity_weight",0.5),slope:k("spell_study.offer.slope",20),
      stewardSkill:k("equipment_deal.steward_skill_weight",0.2),stewardAffinity:k("equipment_deal.steward_affinity_weight",0.25)
    };
    const rosterOf=state=>state?.company?.roster||[];
    const memberOf=(state,id)=>rosterOf(state).find(m=>m.id===id)||null;
    const captainOf=state=>memberOf(state,state.company.captainId);
    const isCaptain=(state,m)=>Boolean(m)&&m.id===state.company.captainId;
    const no=reason=>({ok:false,reason});
    const roll=()=>random()*100;
    const stat=(m,name)=>Number(m?.stats?.[name])||0;
    // Niveau de réputation (1 à 15 : reputation-stars.json, colonne reputation_min).
    const STARS=[...(reference?.reputationStars?.rows||[])].sort((a,b)=>a.niveau-b.niveau);
    function reputationLevel(m){
      let level=1;
      for(const row of STARS) if((Number(m?.reputation)||0)>=Number(row.reputation_min)) level=Number(row.niveau)||level;
      return level;
    }
    // Au Palais : ce qu'il rapporte en une journée (PO).
    function earnings(state,m){
      const master=camp.masterOf?.(state)||null;
      const masterFactor=master?1+stat(master,"Charisme")/C.masterDivisor:1;
      return Math.round(stat(m,"Charisme")*(1+C.reputationWeight*reputationLevel(m))*masterFactor);
    }

    // Les bûcherons (camp.lumberjacks), les mineurs (camp.miners) : [{ id, startDay, approach }] (approach : null,
    // "intimidate" ou "convince"). Anciennes sauvegardes ({ id, day } : une seule journée) : gardées à partir de ce jour-là.
    function entriesOf(state){
      const camp_=state.company.camp;
      if(!Array.isArray(camp_[COURSE.key])) camp_[COURSE.key]=[];
      const list=camp_[COURSE.key];
      for(let i=list.length-1;i>=0;i--){
        const e=list[i];
        if(e.startDay!=null) continue;
        if(!(Number(e.day)>=state.day)){ list.splice(i,1); continue; }
        list[i]={id:e.id,startDay:Number(e.day),approach:null};
      }
      return list;
    }
    const slots=state=>Math.max(0,(Number(camp.buildingLevel(state,hall))||0)*C.perLevel);
    const entryOf=(state,id)=>entriesOf(state).find(e=>e.id===id)||null;
    const working=(state,day=state.day)=>entriesOf(state).filter(e=>e.startDay<=day);
    function busyReason(state,mercenaryId){
      const entry=entryOf(state,mercenaryId);
      if(!entry) return null;
      return entry.startDay>state.day?T.tomorrow:T.working;
    }
    // Retenu demain (pour organiser J+1) : tant qu'on ne l'a pas retiré, il y est encore demain.
    const tomorrowReason=busyReason;
    const affinityWithCaptain=(state,m)=>Number(affinity?.memberAffinity?.(captainOf(state),m)?.total)||0;
    const feeling=(toward,who)=>Number(affinity?.affinity?.(toward,who)?.total)||0;
    function stewardHelp(state,m){
      // Le mercenaire nommé, sinon Cruxor (old-steward.js), apprécié comme le capitaine.
      const steward=oldSteward?oldSteward.stewardOf(state):state.company.intendantId==null?null:memberOf(state,state.company.intendantId);
      if(!steward||steward===m) return 0;
      const liking=oldSteward?oldSteward.feeling(state,steward,m,affinity):feeling(steward,m);
      return C.stewardSkill*clamp(Number(steward.skills?.camp?.Intendance)||0,0,100)+C.stewardAffinity*liking;
    }
    // La chance qu'il accepte (en %), sans jet ; approach : la relance (Intimider, Convaincre).
    function chance(state,m,approach=null){
      if(isCaptain(state,m)) return {chance:100,delta:null};
      const extra=persuasion&&approach?persuasion.bonus(captainOf(state),approach):0;
      const delta=C.offerAffinity*affinityWithCaptain(state,m)+C.offset+stewardHelp(state,m)+extra;
      return {chance:curve(delta,C.slope),delta,extra};
    }
    // La perte d'affinité de chaque matin de travail.
    const dailyLoss=approach=>C.daily*(persuasion?persuasion.lossFactor(approach):1);

    function canSend(state,m){
      if(!m) return no("Mercenaire introuvable.");
      if(!(slots(state)>0)) return no(T.noHall);
      if(entryOf(state,m.id)) return no(T.already);
      if(camp.offField?.(state,m)) return no("Il ne quitte pas son poste au camp.");
      if(m.recovery) return no("Il doit d’abord se remettre.");
      const expedition=camp.expeditionOf(state,m.id);
      if(expedition) return no(expedition.status==="scheduled"?"Il part en mission demain.":"Il est en mission.");
      const busy=camp.busyElsewhere?.(state,m.id);
      if(busy) return no(busy);
      if(entriesOf(state).length>=slots(state)) return no(T.full);
      if(!isCaptain(state,m)&&m[COURSE.offerKey]?.day===state.day) return no("Vous lui en avez déjà parlé aujourd’hui.");
      return {ok:true};
    }
    function assign(state,m,approach){
      const entry={id:m.id,startDay:state.day+1,approach:approach||null};
      entriesOf(state).push(entry);
      return entry;
    }
    // L'envoyer, à partir de demain : il accepte ou refuse (le capitaine accepte toujours).
    function send(state,mercenaryId){
      const m=memberOf(state,mercenaryId);
      const check=canSend(state,m);
      if(!check.ok) return check;
      const odds=chance(state,m).chance;
      if(isCaptain(state,m)) return {ok:true,accepted:true,chance:odds,roll:null,mercenary:m,entry:assign(state,m,null)};
      const dice=roll(),accepted=dice<odds;
      m[COURSE.offerKey]={day:state.day,retried:false,accepted};
      return {ok:true,accepted,chance:odds,roll:dice,mercenary:m,entry:accepted?assign(state,m,null):null,canRetry:!accepted};
    }
    // Après un refus, aujourd'hui : une seule relance, Intimider ou Convaincre.
    function canRetry(state,m){
      const offer=m?.[COURSE.offerKey];
      if(!offer||offer.day!==state.day||offer.accepted) return no("Il n’a rien refusé aujourd’hui.");
      if(offer.retried) return no("Vous avez déjà insisté aujourd’hui.");
      if(entriesOf(state).length>=slots(state)) return no(T.full);
      return {ok:true};
    }
    function retry(state,mercenaryId,approach){
      const m=memberOf(state,mercenaryId);
      if(!persuasion?.approachOf(approach)) return no("Approche inconnue.");
      const check=canRetry(state,m);
      if(!check.ok) return check;
      const odds=chance(state,m,approach).chance,dice=roll(),accepted=persuasion.decide(approach,dice<odds);
      Object.assign(m[COURSE.offerKey],{retried:true,accepted,approach});
      return {ok:true,accepted,approach,chance:odds,roll:dice,mercenary:m,entry:accepted?assign(state,m,approach):null,dailyLoss:dailyLoss(approach)};
    }
    // Le retirer (avant de commencer, ou en cours) : il est libre dès demain ; l'affinité perdue ne revient pas.
    function withdraw(state,mercenaryId){
      const list=entriesOf(state),i=list.findIndex(e=>e.id===mercenaryId);
      if(i<0) return no(T.notAssigned);
      const [entry]=list.splice(i,1);
      return {ok:true,entry};
    }

    // Les chantiers que le bois (niveaux 1 à 5) ou la pierre (6 à 10) peut accélérer aujourd'hui, pas déjà au plus court.
    // Le bois ou la pierre d'une journée : le bâtiment (niveau × étoiles de renommée), puis chaque ouvrier selon sa Force.
    const hallOutput=state=>Math.round(C.hallYield*C.starWeight*(Number(camp.companyLevel?.(state))||1)
      *(Number(camp.buildingLevel(state,hall))||0));
    const workerOutput=m=>Math.round(C.workerYield*Math.pow(Math.max(0,stat(m,"Force"))/C.forceRef,C.forceExponent));
    // Chaque matin : ceux qui travaillent aujourd'hui perdent un peu d'affinité ; le bâtiment et ses ouvriers rapportent.
    function morning(state){
      const list=entriesOf(state);
      for(let i=list.length-1;i>=0;i--) if(!memberOf(state,list[i].id)) list.splice(i,1);
      const workers=working(state).filter(e=>!camp.expeditionOf(state,e.id));
      const report=[];
      for(const worker of workers){
        const m=memberOf(state,worker.id);
        // La politique sociale (Idan, 2026-11-04) : × (2 − taux ÷ 100) selon le salaire de la corvée.
        const delta=isCaptain(state,m)?0:(dailyLoss(worker.approach)*(camp.lossFactor?camp.lossFactor(state):1))||0;
        if(delta) m.affinityAcquired=(Number(m.affinityAcquired)||0)+delta;
        report.push({id:worker.id,approach:worker.approach,affinityDelta:delta,mercenary:m});
      }
      // Au Palais : de l'or, chacun selon son Charisme et sa réputation (et le Maître des plaisirs).
      if(COURSE.effect==="gold"){
        let gold=0;
        for(const r of report){ r.gold=earnings(state,r.mercenary); gold+=r.gold; }
        state.company.gold=(Number(state.company.gold)||0)+gold;
        return {workers:report,gold};
      }
      // Cabane et Guilde : du bois ou de la pierre, même sans ouvrier.
      const resource=COURSE.resource,fromHall=hallOutput(state);
      let total=fromHall;
      for(const r of report){ r.output=workerOutput(r.mercenary); total+=r.output; }
      state.company[resource]=(Number(state.company[resource])||0)+total;
      return {workers:report,resource,hall:fromHall,total};
    }

    return {constants:C,HALL:hall,course,slots,entriesOf,entryOf,working,busyReason,tomorrowReason,chance,dailyLoss,reputationLevel,earnings,canSend,send,
      canRetry,retry,withdraw,cancel:withdraw,morning,hallOutput,workerOutput};
  }

  return {createLumberRules,HALL,COURSES};
});
