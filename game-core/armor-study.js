"use strict";

// Apprendre un port d'armure à l'Académie de la survie (Idan, 2026-11-03 : « comme un sort » ; « Parfait » ; « pas de
// professeur pour ça »). Module pur : campaign.js lui donne le camp et appelle advance(state) chaque matin.
//
// - Dans l'ordre : légère, puis intermédiaire, puis lourde (armor-ports.js). Pas de manuel : le seul coût est le temps.
// - Conviction, comme pour un sort : chance = 10 + 80 / (1 + e^(−Δ/20)), Δ = 0,5 × affinité avec le capitaine + l'appui
//   de l'intendant (0,2 × Intendance + 0,25 × affinité envers lui) ; une tentative par jour ; le capitaine sans test.
// - Au jour J, on organise J+1 : il entre à l'Académie le lendemain matin (on peut annuler d'ici là) ; il prend une
//   place de la salle principale et reste au camp (ni mission, ni garde du corps, ni entraînement libre) jusqu'à la fin.
// - Chaque matin (le premier test le matin suivant son entrée) : chance = 100 / (1 + e^(−(X − 100)/20)) × (1 + 0,1 ×
//   niveau de l'Académie), au plus 95 %, X = (Force + Endurance) / 2 − 10 par cran au-delà de la légère + Transmission du
//   savoir du Vétéran / 5 s'il a lui-même ce port. Réussi : il a le port (et ceux d'en dessous).
// - Le faire sortir avant la fin : rien n'est acquis.
// - Affinité avec le capitaine, comme pour un sort : +5 à l'entrée, −2 s'il refuse, +10 quand il sait, −10 si on le fait
//   sortir. Le Vétéran gagne 5 XP de Transmission du savoir par élève et par jour.
// Constantes : spell_study.* (les mêmes que pour un sort), armor_study.daily.class_malus, armor_study.daily.veteran_divisor.
(function(root,factory){
  const node=typeof module!=="undefined"&&module.exports;
  const history=node?require("./history.js"):root.MercenairesHistory;
  const ports=node?require("./armor-ports.js"):root.MercenairesArmorPorts;
  const api=factory(history,ports);
  if(node) module.exports=api;
  root.MercenairesArmorStudy=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(History,ArmorPorts){
  const TRANSMISSION="Transmission du savoir";
  const HALL="survival_academy";
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const curve=(delta,slope)=>10+80/(1+Math.exp(-delta/slope));

  // camp : { buildingLevel(state, code), buildingPlaces(state, code), veteranOf(state), expeditionOf(state, id),
  //          busyElsewhere(state, id) → raison ou null (un sort à l'École) } (campaign.js).
  function createArmorStudyRules({reference,random=Math.random,affinity=null,progression=null,camp}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      offerAffinity:k("spell_study.offer.affinity_weight",0.5),slope:k("spell_study.offer.slope",20),
      stewardSkill:k("equipment_deal.steward_skill_weight",0.2),stewardAffinity:k("equipment_deal.steward_affinity_weight",0.25),
      dailyCenter:k("spell_study.daily.center",100),dailySlope:k("spell_study.daily.slope",20),
      roomBonus:k("spell_study.daily.room_bonus",0.1),dailyMax:k("spell_study.daily.max",95),
      classMalus:k("armor_study.daily.class_malus",10),veteranDivisor:k("armor_study.daily.veteran_divisor",5),
      veteranXp:k("school.training.director_transmission_xp",5),
      affinity:{accept:k("spell_study.affinity.accept",5),refuse:k("spell_study.affinity.refuse",-2),
        learned:k("spell_study.affinity.learned",10),stopped:k("spell_study.affinity.stopped",-10)}
    };
    const ports=ArmorPorts.createArmorPorts(reference);
    const rosterOf=state=>state?.company?.roster||[];
    const memberOf=(state,id)=>rosterOf(state).find(m=>m.id===id)||null;
    const captainOf=state=>memberOf(state,state.company.captainId);
    const isCaptain=(state,m)=>Boolean(m)&&m.id===state.company.captainId;
    const stat=(m,name)=>Number(m?.stats?.[name])||0;
    const transmissionOf=m=>Number(m?.skills?.camp?.[TRANSMISSION])||0;
    const no=reason=>({ok:false,reason});
    const roll=()=>random()*100;
    const lower=type=>String(type||"").toLocaleLowerCase("fr");

    function studiesOf(state){
      const camp_=state.company.camp;
      if(!Array.isArray(camp_.armorStudies)) camp_.armorStudies=[];
      return camp_.armorStudies;
    }
    const studyById=(state,id)=>studiesOf(state).find(s=>s.id===id)||null;
    const studyOf=(state,mercenaryId)=>studiesOf(state).find(s=>s.studentId===mercenaryId)||null;
    const isPlanned=study=>study?.status==="planned";
    function busyReason(state,mercenaryId){
      const own=studyOf(state,mercenaryId);
      if(!own) return null;
      return isPlanned(own)?"Il entre à l’Académie de la survie demain matin.":"Il apprend à porter une armure à l’Académie de la survie.";
    }
    const learnersIn=(state,roomCode)=>roomCode===HALL?studiesOf(state).length:0;
    // Le prochain port qu'il peut apprendre : "Légère", "Intermédiaire", "Lourde", ou null s'il les a tous.
    const nextClass=m=>ports.CLASSES[ports.portLevel(m)]||null;
    const affinityWithCaptain=(state,m)=>Number(affinity?.memberAffinity?.(captainOf(state),m)?.total)||0;
    const feeling=(toward,who)=>Number(affinity?.affinity?.(toward,who)?.total)||0;
    function shiftAffinity(state,m,delta){
      if(!m||isCaptain(state,m)||!delta) return 0;
      m.affinityAcquired=(Number(m.affinityAcquired)||0)+delta;
      return delta;
    }

    // Peut-on lui proposer d'apprendre son prochain port ? {ok, type} ou {ok:false, reason}.
    function canStudy(state,m){
      if(!m) return no("Mercenaire introuvable.");
      if(!(camp.buildingLevel(state,HALL)>0)) return no("Il faut d’abord construire l’Académie de la survie.");
      const type=nextClass(m);
      if(!type) return no("Il sait déjà porter une armure lourde.");
      const expedition=camp.expeditionOf(state,m.id);
      if(expedition) return no(expedition.status==="scheduled"?"Il part en mission demain.":"Il est en mission.");
      const busy=busyReason(state,m.id)||camp.busyElsewhere?.(state,m.id);
      if(busy) return no(busy);
      if(learnersIn(state,HALL)>=camp.buildingPlaces(state,HALL)) return no("L’Académie de la survie n’a plus de place.");
      if(!isCaptain(state,m)&&m.armorStudyOfferDay===state.day) return no("Vous lui en avez déjà parlé aujourd’hui.");
      return {ok:true,type};
    }
    // L'appui de l'intendant, comme pour un sort (pas quand on lui parle à lui).
    function stewardHelp(state,m){
      const steward=state.company.intendantId==null?null:memberOf(state,state.company.intendantId);
      if(!steward||steward===m) return 0;
      return C.stewardSkill*clamp(Number(steward.skills?.camp?.Intendance)||0,0,100)+C.stewardAffinity*feeling(steward,m);
    }
    // La chance qu'il accepte (en %), sans jet.
    function offerChance(state,m){
      if(isCaptain(state,m)) return {chance:100,delta:null};
      const delta=C.offerAffinity*affinityWithCaptain(state,m)+stewardHelp(state,m);
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
      if(!captain) m.armorStudyOfferDay=state.day;
      if(!(dice<chance)){
        const affinityDelta=shiftAffinity(state,m,C.affinity.refuse);
        History.record(m,state.day,"armor_study",{accepted:false,armor:type});
        return {ok:true,accepted:false,chance,roll:dice,affinityDelta,mercenary:m,type};
      }
      const study={id:"armor-"+state.day+"-"+m.id,status:"planned",studentId:m.id,type,startDay:state.day+1,days:0};
      studiesOf(state).push(study);
      History.record(m,state.day,"armor_study",{accepted:true,armor:type});
      return {ok:true,accepted:true,chance,roll:captain?null:dice,affinityDelta:0,mercenary:m,type,study};
    }

    // Le test du matin : la chance (en %) et son détail.
    function dailyChance(state,study){
      const m=memberOf(state,study.studentId);
      const veteran=camp.veteranOf?.(state)||null;
      const rank=ports.CLASSES.indexOf(study.type);
      const base=(stat(m,"Force")+stat(m,"Endurance"))/2;
      const classMalus=C.classMalus*Math.max(0,rank);
      const veteranBonus=veteran&&veteran!==m&&ports.portLevel(veteran)>rank?transmissionOf(veteran)/C.veteranDivisor:0;
      const x=base-classMalus+veteranBonus;
      const level=camp.buildingLevel(state,HALL);
      const chance=Math.min(C.dailyMax,100/(1+Math.exp(-(x-C.dailyCenter)/C.dailySlope))*(1+C.roomBonus*level));
      return {chance,x,base,classMalus,veteranBonus,roomLevel:level};
    }
    // Il sait : ce port et ceux d'en dessous.
    function grant(m,type){
      const martial=m.skills?.martial||((m.skills||(m.skills={})).martial={});
      for(const t of ports.CLASSES.slice(0,ports.CLASSES.indexOf(type)+1)) martial[ArmorPorts.portOf(t)]=true;
    }

    // Chaque matin : l'entrée des inscrits de la veille, un test par élève, l'XP du Vétéran.
    function advance(state){
      const studies=studiesOf(state);
      const learned=[],tested=[],started=[];
      const veteran=camp.veteranOf?.(state)||null;
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
        grant(m,study.type);
        studies.splice(studies.indexOf(study),1);
        const affinityDelta=shiftAffinity(state,m,C.affinity.learned);
        History.record(m,state.day,"armor_study_done",{armor:study.type,days:study.days});
        learned.push({study,mercenary:m,type:study.type,days:study.days,affinityDelta});
      }
      // Le Vétéran compte les élèves qui ont passé la veille à l'Académie.
      const veteranXp=veteran&&learners?C.veteranXp*learners:0;
      if(veteran&&progression&&veteranXp>0) progression.apply(veteran,{skills:{camp:{[TRANSMISSION]:veteranXp}}});
      return {learned,tested,started,veteranXp};
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
      if(m) History.record(m,state.day,"armor_study_stopped",{armor:study.type,days:study.days});
      return {ok:true,mercenary:m,affinityDelta,study};
    }

    return {constants:C,HALL,lower,studiesOf,studyById,studyOf,isPlanned,busyReason,learnersIn,nextClass,canStudy,offerChance,offer,
      dailyChance,advance,stop};
  }

  return {createArmorStudyRules,HALL};
});
