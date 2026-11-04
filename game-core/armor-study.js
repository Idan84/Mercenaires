"use strict";

// Apprendre une aptitude dans un bâtiment du camp, au fil des jours : un port d'armure à l'Académie de la survie (Idan,
// 2026-11-03 : « comme un sort » ; « Parfait » ; « pas de professeur pour ça ») ; l'Empoisonnement des armes au Labo
// d'alchimie (Idan, 2026-11-03 : « Il faut qu'on puisse l'apprendre au labo… Ça doit dépendre d'intelligence, de
// dextérité (pour pas en mettre partout !) et de résistance au poison (au cas où on en met partout) » ; « Oui, vas-y »).
// Module pur : campaign.js lui donne le camp et appelle advance(state) chaque matin.
//
// - Ports d'armure : dans l'ordre, légère, puis intermédiaire, puis lourde (armor-ports.js) ; Empoisonnement des armes :
//   une aptitude. Pas de manuel : le seul coût est le temps.
// - Conviction, comme pour un sort : chance = 10 + 80 / (1 + e^(−Δ/20)), Δ = 0,5 × affinité avec le capitaine + l'appui
//   de l'intendant (0,2 × Intendance + 0,25 × affinité envers lui) ; une tentative par jour ; le capitaine sans test.
// - Au jour J, on organise J+1 : il entre le lendemain matin (on peut annuler d'ici là) ; il prend une place de la salle
//   principale et reste au camp (ni mission, ni garde du corps, ni entraînement libre, ni autre apprentissage) jusqu'à la
//   fin.
// - Chaque matin (le premier test le matin suivant son entrée) : chance = 100 / (1 + e^(−(X − 100)/20)) × (1 + 0,1 ×
//   niveau du bâtiment), au plus 95 % ;
//   armure : X = (Force + Endurance) / 2 − 10 par cran au-delà de la légère + Transmission du savoir du Vétéran / 5 s'il a
//   lui-même ce port ;
//   empoisonnement : X = (Intelligence + Dextérité) / 2 + Résistance au poison + Transmission du savoir de l'Alchimiste / 5
//   s'il a lui-même l'aptitude.
//   Réussi : il a l'aptitude (pour une armure, ce port et ceux d'en dessous).
// - Le faire sortir avant la fin : rien n'est acquis.
// - Affinité avec le capitaine, comme pour un sort : +5 à l'entrée, −2 s'il refuse, +10 quand il sait, −10 si on le fait
//   sortir. Le maître du bâtiment gagne 5 XP de Transmission du savoir par élève et par jour.
// Constantes : spell_study.* (les mêmes que pour un sort), armor_study.daily.*, poison_study.daily.*.
(function(root,factory){
  const node=typeof module!=="undefined"&&module.exports;
  const history=node?require("./history.js"):root.MercenairesHistory;
  const ports=node?require("./armor-ports.js"):root.MercenairesArmorPorts;
  // Relance après un refus (Idan, 2026-11-04) : Intimider ou Convaincre ; si elle échoue, la perte du refus × 2 ou × 0,5.
  const persuasion=node?require("./persuasion.js"):root.MercenairesPersuasion;
  const api=factory(history,ports,persuasion);
  if(node) module.exports=api;
  root.MercenairesArmorStudy=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(History,ArmorPorts,Persuasion){
  const TRANSMISSION="Transmission du savoir";
  const POISONER="Empoisonnement des armes";
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const curve=(delta,slope)=>10+80/(1+Math.exp(-delta/slope));
  const stat=(m,name)=>Number(m?.stats?.[name])||0;
  const resistance=(m,name)=>Number(m?.resistances?.[name])||0;
  const martial=m=>m?.skills?.martial||((m.skills||(m.skills={})).martial={});

  // Ce qu'on apprend : le bâtiment, ce qui reste à apprendre, la valeur de base du test, ce que sait le maître, ce qu'on
  // acquiert, et les textes des refus (le journal garde des faits : kind, données).
  const COURSES={
    armor:{hall:"survival_academy",store:"armorStudies",offerDay:"armorStudyOfferDay",kind:"armor_study",
      text:{build:"Il faut d’abord construire l’Académie de la survie.",known:"Il sait déjà porter une armure lourde.",
        full:"L’Académie de la survie n’a plus de place.",planned:"Il entre à l’Académie de la survie demain matin.",
        active:"Il apprend à porter une armure à l’Académie de la survie."},
      setup:(k,reference)=>{
        const armor=ArmorPorts.createArmorPorts(reference),malus=k("armor_study.daily.class_malus",10);
        return {
          divisor:k("armor_study.daily.veteran_divisor",5),
          next:m=>armor.CLASSES[armor.portLevel(m)]||null,
          base:(m,type)=>(stat(m,"Force")+stat(m,"Endurance"))/2-malus*Math.max(0,armor.CLASSES.indexOf(type)),
          masterKnows:(master,type)=>armor.portLevel(master)>armor.CLASSES.indexOf(type),
          grant:(m,type)=>{ for(const t of armor.CLASSES.slice(0,armor.CLASSES.indexOf(type)+1)) martial(m)[ArmorPorts.portOf(t)]=true; }
        };
      }},
    poison:{hall:"alchemy_lab",store:"poisonStudies",offerDay:"poisonStudyOfferDay",kind:"poison_study",
      text:{build:"Il faut d’abord construire le Labo d’alchimie.",known:"Il sait déjà empoisonner une arme.",
        full:"Le Labo d’alchimie n’a plus de place.",planned:"Il entre au Labo d’alchimie demain matin.",
        active:"Il apprend à empoisonner une arme au Labo d’alchimie."},
      setup:k=>{
        const weight=k("poison_study.daily.resistance_weight",1);
        return {
          divisor:k("poison_study.daily.master_divisor",5),
          next:m=>m?.skills?.martial?.[POISONER]===true?null:POISONER,
          base:m=>(stat(m,"Intelligence")+stat(m,"Dextérité"))/2+weight*resistance(m,"Résistance au poison"),
          masterKnows:master=>master?.skills?.martial?.[POISONER]===true,
          grant:m=>{ martial(m)[POISONER]=true; }
        };
      }}
  };

  // camp : { buildingLevel(state, code), buildingPlaces(state, code), masterOf(state) (le maître du bâtiment ;
  //          veteranOf, l'ancien nom), expeditionOf(state, id), busyElsewhere(state, id) → raison ou null (un autre
  //          apprentissage) } (campaign.js). course : "armor" (par défaut) ou "poison".
  function createAptitudeStudyRules({reference,random=Math.random,affinity=null,progression=null,camp,course="armor"}={}){
    const COURSE=COURSES[course];
    if(!COURSE) throw new Error(`Apprentissage inconnu : ${course}`);
    const HALL=COURSE.hall,TEXT=COURSE.text;
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const persuasion=Persuasion?Persuasion.createPersuasionRules({reference}):null;
    const REFUSAL=course+"Refusal";
    const RULE=COURSE.setup(k,reference);
    const C={
      offerAffinity:k("spell_study.offer.affinity_weight",0.5),slope:k("spell_study.offer.slope",20),
      stewardSkill:k("equipment_deal.steward_skill_weight",0.2),stewardAffinity:k("equipment_deal.steward_affinity_weight",0.25),
      dailyCenter:k("spell_study.daily.center",100),dailySlope:k("spell_study.daily.slope",20),
      roomBonus:k("spell_study.daily.room_bonus",0.1),dailyMax:k("spell_study.daily.max",95),
      masterDivisor:RULE.divisor,masterXp:k("school.training.director_transmission_xp",5),
      affinity:{accept:k("spell_study.affinity.accept",5),refuse:k("spell_study.affinity.refuse",-2),
        learned:k("spell_study.affinity.learned",10),stopped:k("spell_study.affinity.stopped",-10)}
    };
    const masterOf=state=>(camp.masterOf||camp.veteranOf)?.(state)||null;
    const rosterOf=state=>state?.company?.roster||[];
    const memberOf=(state,id)=>rosterOf(state).find(m=>m.id===id)||null;
    const captainOf=state=>memberOf(state,state.company.captainId);
    const isCaptain=(state,m)=>Boolean(m)&&m.id===state.company.captainId;
    const transmissionOf=m=>Number(m?.skills?.camp?.[TRANSMISSION])||0;
    const no=reason=>({ok:false,reason});
    const roll=()=>random()*100;
    const lower=type=>String(type||"").toLocaleLowerCase("fr");

    function studiesOf(state){
      const camp_=state.company.camp;
      if(!Array.isArray(camp_[COURSE.store])) camp_[COURSE.store]=[];
      return camp_[COURSE.store];
    }
    const studyById=(state,id)=>studiesOf(state).find(s=>s.id===id)||null;
    const studyOf=(state,mercenaryId)=>studiesOf(state).find(s=>s.studentId===mercenaryId)||null;
    const isPlanned=study=>study?.status==="planned";
    function busyReason(state,mercenaryId){
      const own=studyOf(state,mercenaryId);
      if(!own) return null;
      return isPlanned(own)?TEXT.planned:TEXT.active;
    }
    const learnersIn=(state,roomCode)=>roomCode===HALL?studiesOf(state).length:0;
    // Ce qu'il apprendrait : un port d'armure (« Légère »…) ou l'aptitude ; null s'il sait déjà tout.
    const nextClass=m=>RULE.next(m);
    const affinityWithCaptain=(state,m)=>Number(affinity?.memberAffinity?.(captainOf(state),m)?.total)||0;
    const feeling=(toward,who)=>Number(affinity?.affinity?.(toward,who)?.total)||0;
    function shiftAffinity(state,m,delta){
      if(!m||isCaptain(state,m)||!delta) return 0;
      m.affinityAcquired=(Number(m.affinityAcquired)||0)+delta;
      return delta;
    }

    // Peut-on lui proposer d'apprendre ? {ok, type} ou {ok:false, reason}.
    function canStudy(state,m,{retry=false}={}){
      if(!m) return no("Mercenaire introuvable.");
      if(!(camp.buildingLevel(state,HALL)>0)) return no(TEXT.build);
      const type=nextClass(m);
      if(!type) return no(TEXT.known);
      const expedition=camp.expeditionOf(state,m.id);
      if(expedition) return no(expedition.status==="scheduled"?"Il part en mission demain.":"Il est en mission.");
      const busy=busyReason(state,m.id)||camp.busyElsewhere?.(state,m.id);
      if(busy) return no(busy);
      if(learnersIn(state,HALL)>=camp.buildingPlaces(state,HALL)) return no(TEXT.full);
      if(!retry&&!isCaptain(state,m)&&m[COURSE.offerDay]===state.day) return no("Vous lui en avez déjà parlé aujourd’hui.");
      return {ok:true,type};
    }
    // L'appui de l'intendant, comme pour un sort (pas quand on lui parle à lui).
    function stewardHelp(state,m){
      const steward=state.company.intendantId==null?null:memberOf(state,state.company.intendantId);
      if(!steward||steward===m) return 0;
      return C.stewardSkill*clamp(Number(steward.skills?.camp?.Intendance)||0,0,100)+C.stewardAffinity*feeling(steward,m);
    }
    // La chance qu'il accepte (en %), sans jet ; approach : la relance (Intimider, Convaincre).
    function offerChance(state,m,approach=null){
      if(isCaptain(state,m)) return {chance:100,delta:null};
      const extra=persuasion&&approach?persuasion.bonus(captainOf(state),approach):0;
      const delta=C.offerAffinity*affinityWithCaptain(state,m)+stewardHelp(state,m)+extra;
      return {chance:curve(delta,C.slope),delta};
    }
    function offer(state,mercenaryId){
      const m=memberOf(state,mercenaryId);
      const check=canStudy(state,m);
      if(!check.ok) return check;
      const {type}=check;
      const {chance}=offerChance(state,m);
      const captain=isCaptain(state,m);
      const dice=captain?0:roll();
      if(!captain) m[COURSE.offerDay]=state.day;
      if(!(dice<chance)){
        const affinityDelta=shiftAffinity(state,m,C.affinity.refuse);
        History.record(m,state.day,COURSE.kind,{accepted:false,armor:type});
        persuasion?.markRefused(m,REFUSAL,state.day);
        return {ok:true,accepted:false,chance,roll:dice,affinityDelta,mercenary:m,type,canRetry:Boolean(persuasion)};
      }
      return startStudy(state,m,type,{chance,roll:captain?null:dice});
    }
    function startStudy(state,m,type,{chance,roll}){
      const study={id:course+"-"+state.day+"-"+m.id,status:"planned",studentId:m.id,type,startDay:state.day+1,days:0};
      studiesOf(state).push(study);
      History.record(m,state.day,COURSE.kind,{accepted:true,armor:type});
      return {ok:true,accepted:true,chance,roll,affinityDelta:0,mercenary:m,type,study};
    }
    // Après un refus, aujourd'hui : une relance, Intimider ou Convaincre ; si elle échoue, la perte du refus × 2 ou × 0,5.
    function retry(state,mercenaryId,approach){
      const m=memberOf(state,mercenaryId);
      if(!persuasion?.approachOf(approach)) return no("Approche inconnue.");
      const again=persuasion.canRetry(m,REFUSAL,state.day);
      if(!again.ok) return again;
      const check=canStudy(state,m,{retry:true});
      if(!check.ok) return check;
      const {chance}=offerChance(state,m,approach),dice=roll(),accepted=dice<chance;
      persuasion.markRetried(m,REFUSAL,approach,accepted);
      if(!accepted){
        const affinityDelta=shiftAffinity(state,m,persuasion.refusalExtra(C.affinity.refuse,approach));
        return {ok:true,accepted:false,approach,chance,roll:dice,affinityDelta,mercenary:m,type:check.type};
      }
      return {...startStudy(state,m,check.type,{chance,roll:dice}),approach};
    }

    // Le test du matin : la chance (en %) et son détail.
    function dailyChance(state,study){
      const m=memberOf(state,study.studentId);
      const master=masterOf(state);
      const base=RULE.base(m,study.type);
      const masterBonus=master&&master!==m&&RULE.masterKnows(master,study.type)?transmissionOf(master)/C.masterDivisor:0;
      const x=base+masterBonus;
      const level=camp.buildingLevel(state,HALL);
      const chance=Math.min(C.dailyMax,100/(1+Math.exp(-(x-C.dailyCenter)/C.dailySlope))*(1+C.roomBonus*level));
      return {chance,x,base,masterBonus,roomLevel:level};
    }

    // Chaque matin : l'entrée des inscrits de la veille, un test par élève, l'XP du maître.
    function advance(state){
      const studies=studiesOf(state);
      const learned=[],tested=[],started=[];
      const master=masterOf(state);
      let learners=0;
      for(const study of [...studies]){
        const m=memberOf(state,study.studentId);
        if(!m){ studies.splice(studies.indexOf(study),1); continue; }
        if(isPlanned(study)){
          if(state.day<Number(study.startDay)) continue;
          study.status="active";
          study.startDay=state.day;
          started.push({study,mercenary:m,affinityDelta:shiftAffinity(state,m,C.affinity.accept)});
          continue;
        }
        learners+=1;
        study.days+=1;
        const {chance}=dailyChance(state,study);
        const dice=roll();
        tested.push({id:study.id,studentId:m.id,chance,roll:dice});
        if(dice>=chance) continue;
        RULE.grant(m,study.type);
        studies.splice(studies.indexOf(study),1);
        const affinityDelta=shiftAffinity(state,m,C.affinity.learned);
        History.record(m,state.day,COURSE.kind+"_done",{armor:study.type,days:study.days});
        learned.push({study,mercenary:m,type:study.type,days:study.days,affinityDelta});
      }
      // Le maître compte les élèves qui ont passé la veille dans son bâtiment.
      const masterXp=master&&learners?C.masterXp*learners:0;
      if(master&&progression&&masterXp>0) progression.apply(master,{skills:{camp:{[TRANSMISSION]:masterXp}}});
      return {learned,tested,started,masterXp};
    }

    // Le faire sortir (ou annuler son inscription) : rien n'est acquis.
    function stop(state,studyId){
      const study=studyById(state,studyId);
      if(!study) return no("Apprentissage introuvable.");
      const studies=studiesOf(state);
      studies.splice(studies.indexOf(study),1);
      const m=memberOf(state,study.studentId);
      if(isPlanned(study)) return {ok:true,mercenary:m,affinityDelta:0,study,cancelled:true};
      const affinityDelta=shiftAffinity(state,m,C.affinity.stopped);
      if(m) History.record(m,state.day,COURSE.kind+"_stopped",{armor:study.type,days:study.days});
      return {ok:true,mercenary:m,affinityDelta,study};
    }

    return {constants:C,course,HALL,lower,studiesOf,studyById,studyOf,isPlanned,busyReason,learnersIn,nextClass,canStudy,offerChance,offer,retry,
      dailyChance,advance,stop};
  }
  const createArmorStudyRules=options=>createAptitudeStudyRules({...options,course:"armor"});
  const createPoisonStudyRules=options=>createAptitudeStudyRules({...options,course:"poison"});

  return {createAptitudeStudyRules,createArmorStudyRules,createPoisonStudyRules,COURSES,HALL:COURSES.armor.hall};
});
