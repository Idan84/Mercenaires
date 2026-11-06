"use strict";

// Apprentissage d'un sort à l'École de magie (Idan, 2026-11-02 : « Il faut le manuel. L'école de magie correspondante
// construite. On parle à un mercenaire pour le convaincre d'apprendre un sort. […] S'il accepte, le manuel est détruit et
// il occupe une place dans l'école. Il ressort quand il connaît le sort »). Module pur : campaign.js lui donne les salles
// (camp) et appelle advance(state) chaque matin.
//
// - Conviction, comme pour l'équipement : chance = 10 + 80 / (1 + e^(−Δ/20)), Δ = 0,5 × affinité avec le capitaine
//   + 0,5 × (école du sort − 50) + l'appui de l'intendant (0,2 × Intendance + 0,25 × affinité envers lui) ; une
//   tentative par jour ; le capitaine apprend sans test. Accord : le manuel est détruit, il prend une place dans la salle
//   de l'école du sort et ne part plus en mission jusqu'à la fin.
// - Chaque matin : chance = 100 / (1 + e^(−(X − 100)/20)) × (1 + 0,1 × niveau de la salle), au plus 95 %, avec
//   X = (Intelligence + école du sort) / 2 + (école du directeur + sa Transmission du savoir) / 10 + Transmission du
//   professeur / 5. Réussi : il connaît le sort au niveau de la salle (1 à 10) ou, avec un professeur, au niveau du sort
//   chez le professeur × sa Transmission / 100 s'il est plus haut (sans plafond depuis le 2026-11-06).
// - Professeur : il connaît le sort ; il accepte selon 10 + 80 / (1 + e^(−Δ/20)), Δ = (son affinité avec le capitaine
//   + son affinité envers l'élève) / 2 ; le capitaine enseigne sans test ; il reste au camp jusqu'à la fin (on peut le
//   libérer) ; +5 XP de Transmission du savoir par jour d'enseignement.
// - Sortir avant la fin : le manuel est perdu, rien n'est acquis.
// - Affinité avec le capitaine : l'élève +5 s'il accepte, −2 s'il refuse, +10 quand il connaît le sort, −10 si on le
//   fait sortir ; le professeur +3 s'il accepte, −2 s'il refuse, +5 quand l'élève connaît le sort, −3 si on le libère.
// - Perfectionner un sort (Idan, 2026-11-02 : « consommer des manuels contre de l'xp de sort ») : un manuel du même sort,
//   sans test ; le manuel est détruit, il passe une journée dans la salle de l'école du sort (une place prise, au camp)
//   et gagne le lendemain matin 1 000 × Intelligence / 50 × (1 + 0,1 × niveau de la salle) × (1 + Transmission du
//   savoir du directeur / 100) XP de sort, sans plafond (Idan, 2026-11-06) ; affinité +2.
// - Au jour J, on organise J+1 (Idan, 2026-11-02) : à l'accord, il est inscrit pour le lendemain matin (sa place est
//   réservée, le manuel mis de côté) ; le lendemain matin, il entre à l'École, le manuel est détruit et l'affinité tombe ;
//   d'ici là, on peut annuler (le manuel revient à l'Intendance). Un professeur accepté aujourd'hui enseigne dès demain.
//   Pas de suite planifiée pendant un apprentissage.
// - Relance après un refus (Idan, 2026-11-04 ; persuasion.js) : pour l'élève comme pour le professeur, une relance,
//   Intimider (+ Intimidation du capitaine) ou Convaincre (+ Charisme ÷ 2) ; si elle échoue, la perte du refus est × 2
//   (intimidé) ou × 0,5 (convaincu) ; si elle réussit en intimidant, il ne gagne pas l'affinité du premier matin (élève +5,
//   professeur +3) ; convaincu, il la garde.
// Constantes : formula-constants.json (spell_study.*). Doc 11 §7 et doc 12.
(function(root,factory){
  const node=typeof module!=="undefined"&&module.exports;
  const history=node?require("./history.js"):root.MercenairesHistory;
  const manuals=node?require("./spell-manuals.js"):root.MercenairesSpellManuals;
  const persuasion=node?require("./persuasion.js"):root.MercenairesPersuasion;
  const api=factory(history,manuals,persuasion);
  if(node) module.exports=api;
  root.MercenairesSpellStudy=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(History,Manuals,Persuasion){
  const TRANSMISSION="Transmission du savoir";
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const curve=(delta,slope)=>10+80/(1+Math.exp(-delta/slope));

  // camp : { roomOfSchool(school) → { code, name } | null, buildingLevel(state, code), buildingPlaces(state, code),
  //          directorOf(state), expeditionOf(state, id), busyElsewhere(state, id) → raison ou null (une armure à
  //          l'Académie) } (campaign.js).
  function createSpellStudyRules({reference,random=Math.random,affinity=null,progression=null,camp}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const persuasion=Persuasion?Persuasion.createPersuasionRules({reference}):null;
    const C={
      offerAffinity:k("spell_study.offer.affinity_weight",0.5),offerSchool:k("spell_study.offer.school_weight",0.5),
      offerCenter:k("spell_study.offer.school_center",50),slope:k("spell_study.offer.slope",20),
      stewardSkill:k("equipment_deal.steward_skill_weight",0.2),stewardAffinity:k("equipment_deal.steward_affinity_weight",0.25),
      dailyCenter:k("spell_study.daily.center",100),dailySlope:k("spell_study.daily.slope",20),
      roomBonus:k("spell_study.daily.room_bonus",0.1),dailyMax:k("spell_study.daily.max",95),
      directorDivisor:k("spell_study.daily.director_divisor",10),teacherDivisor:k("spell_study.daily.teacher_divisor",5),
      transmissionDivisor:k("spell_study.teacher.transmission_divisor",100),
      teacherXp:k("spell_study.xp.teacher_transmission",5),directorXp:k("school.training.director_transmission_xp",5),
      perfectXp:k("spell_study.perfect.base_xp",1000),perfectIntelligence:k("spell_study.perfect.intelligence_divisor",50),
      perfectRoom:k("spell_study.perfect.room_bonus",0.1),perfectTransmission:k("spell_study.perfect.transmission_divisor",100),
      affinity:{accept:k("spell_study.affinity.accept",5),refuse:k("spell_study.affinity.refuse",-2),
        learned:k("spell_study.affinity.learned",10),stopped:k("spell_study.affinity.stopped",-10),
        teacherAccept:k("spell_study.affinity.teacher_accept",3),teacherRefuse:k("spell_study.affinity.teacher_refuse",-2),
        teacherLearned:k("spell_study.affinity.teacher_learned",5),teacherReleased:k("spell_study.affinity.teacher_released",-3),
        perfect:k("spell_study.affinity.perfect",2)}
    };
    const manuals=Manuals.createManualRules({reference});
    const rosterOf=state=>state?.company?.roster||[];
    const memberOf=(state,id)=>rosterOf(state).find(m=>m.id===id)||null;
    const captainOf=state=>memberOf(state,state.company.captainId);
    const isCaptain=(state,m)=>Boolean(m)&&m.id===state.company.captainId;
    const stat=(m,name)=>Number(m?.stats?.[name])||0;
    const schoolOf=(m,school)=>Number(m?.skills?.magic?.[school])||0;
    const transmissionOf=m=>Number(m?.skills?.camp?.[TRANSMISSION])||0;
    const no=reason=>({ok:false,reason});
    const roll=()=>random()*100;

    function studiesOf(state){
      const camp_=state.company.camp;
      if(!Array.isArray(camp_.studies)) camp_.studies=[];
      return camp_.studies;
    }
    const studyById=(state,id)=>studiesOf(state).find(s=>s.id===id)||null;
    const studyOf=(state,mercenaryId)=>studiesOf(state).find(s=>s.studentId===mercenaryId)||null;
    const teachingOf=(state,mercenaryId)=>studiesOf(state).find(s=>s.teacherId!=null&&s.teacherId===mercenaryId)||null;
    // Retenu à l'École (élève ou professeur) : la raison, ou null.
    const isPerfect=study=>study?.kind==="perfect";
    // Inscrit pour le lendemain matin, pas encore entré à l'École.
    const isPlanned=study=>study?.status==="planned";
    // Le professeur compte pour le test du matin testDay s'il enseignait la veille (accepté avant testDay − 1).
    const teacherCounts=(study,testDay)=>study.teacherId!=null&&!(Number(study.teacherFrom)>=testDay);
    // Retenu ailleurs au camp (une armure à l'Académie) : la raison, ou null.
    const elsewhere=(state,mercenaryId)=>camp?.busyElsewhere?.(state,mercenaryId)||null;
    function busyReason(state,mercenaryId){
      const own=studyOf(state,mercenaryId);
      if(own&&isPlanned(own)) return "Il entre à l’École de magie demain matin.";
      if(own) return isPerfect(own)?"Il perfectionne un sort à l’École de magie.":"Il apprend un sort à l’École de magie.";
      if(teachingOf(state,mercenaryId)) return "Il enseigne un sort à l’École de magie.";
      return null;
    }
    const learnersIn=(state,roomCode)=>studiesOf(state).filter(s=>s.room===roomCode).length;
    const affinityWithCaptain=(state,m)=>Number(affinity?.memberAffinity?.(captainOf(state),m)?.total)||0;
    // Affinité de « who » envers « toward » (peuple, culture, alignement), comme envers le capitaine.
    const feeling=(toward,who)=>Number(affinity?.affinity?.(toward,who)?.total)||0;
    function shiftAffinity(state,m,delta){
      if(!m||isCaptain(state,m)||!delta) return 0;
      m.affinityAcquired=(Number(m.affinityAcquired)||0)+delta;
      return delta;
    }
    function roomFor(spell){ return spell?camp.roomOfSchool(spell.ecole):null; }

    // Peut-on lui proposer d'apprendre ce manuel ? {ok, spell, room} ou {ok:false, reason}.
    function canStudy(state,m,item,{retry=false}={}){
      const check=manuals.canLearn(state,m,item);
      if(!check.ok) return check;
      if(camp.expeditionOf(state,m.id)) return no("Il part en mission demain.");
      const busy=busyReason(state,m.id)||elsewhere(state,m.id);
      if(busy) return no(busy);
      const room=roomFor(check.spell);
      if(!room||!(camp.buildingLevel(state,room.code)>0)) return no("Il faut d’abord construire la "+(room?.name||"salle de cette école")+".");
      if(learnersIn(state,room.code)>=camp.buildingPlaces(state,room.code)) return no("La "+room.name+" n’a plus de place.");
      if(!retry&&!isCaptain(state,m)&&m.studyOfferDay===state.day) return no("Vous lui en avez déjà parlé aujourd’hui.");
      return {ok:true,spell:check.spell,room};
    }
    // L'appui de l'intendant, comme pour un échange d'équipement (pas quand on lui parle à lui).
    function stewardHelp(state,m){
      const steward=state.company.intendantId==null?null:memberOf(state,state.company.intendantId);
      if(!steward||steward===m) return 0;
      return C.stewardSkill*clamp(Number(steward.skills?.camp?.Intendance)||0,0,100)+C.stewardAffinity*feeling(steward,m);
    }
    // La relance : ce qu'elle ajoute à l'écart (l'Intimidation du capitaine, ou son Charisme ÷ 2).
    const persuade=(state,key)=>persuasion&&key?persuasion.bonus(captainOf(state),key):0;
    // La chance qu'il accepte (en %), sans jet ; approach : la relance (Intimider, Convaincre).
    function offerChance(state,m,spell,approach=null){
      if(isCaptain(state,m)) return {chance:100,delta:null};
      const delta=C.offerAffinity*affinityWithCaptain(state,m)+C.offerSchool*(schoolOf(m,spell.ecole)-C.offerCenter)+stewardHelp(state,m)+persuade(state,approach);
      return {chance:curve(delta,C.slope),delta};
    }
    // Lui proposer d'apprendre le sort du manuel itemId (à l'Intendance).
    function offer(state,mercenaryId,itemId){
      const item=(state.company.stock||[]).find(i=>String(i.id)===String(itemId));
      if(!item) return no("Manuel introuvable à l’Intendance.");
      const m=memberOf(state,mercenaryId);
      const check=canStudy(state,m,item);
      if(!check.ok) return check;
      const {spell,room}=check;
      const {chance}=offerChance(state,m,spell);
      const captain=isCaptain(state,m);
      const dice=captain?0:roll();
      if(!captain) m.studyOfferDay=state.day;
      const accepted=dice<chance;
      if(!accepted){
        const affinityDelta=shiftAffinity(state,m,C.affinity.refuse);
        History.record(m,state.day,"study",{accepted:false,spell:spell.nom});
        persuasion?.markRefused(m,"studyRefusal",state.day,{itemId:item.id});
        return {ok:true,accepted:false,chance,roll:dice,affinityDelta,mercenary:m,spell,room,canRetry:Boolean(persuasion)};
      }
      return startStudy(state,m,item,spell,room,{chance,roll:captain?null:dice});
    }
    // Après un refus, aujourd'hui : une relance, Intimider ou Convaincre ; si elle échoue, la perte du refus × 2 ou × 0,5.
    function retryOffer(state,mercenaryId,approach){
      const m=memberOf(state,mercenaryId);
      if(!persuasion?.approachOf(approach)) return no("Approche inconnue.");
      const again=persuasion.canRetry(m,"studyRefusal",state.day);
      if(!again.ok) return again;
      const item=(state.company.stock||[]).find(i=>String(i.id)===String(again.refusal.itemId));
      if(!item) return no("Manuel introuvable à l’Intendance.");
      const check=canStudy(state,m,item,{retry:true});
      if(!check.ok) return check;
      const {spell,room}=check;
      const {chance}=offerChance(state,m,spell,approach),dice=roll(),accepted=dice<chance;
      persuasion.markRetried(m,"studyRefusal",approach,accepted);
      if(!accepted){
        const affinityDelta=shiftAffinity(state,m,persuasion.refusalExtra(C.affinity.refuse,approach));
        return {ok:true,accepted:false,approach,chance,roll:dice,affinityDelta,mercenary:m,spell,room};
      }
      const started=startStudy(state,m,item,spell,room,{chance,roll:dice});
      started.study.approach=approach;
      return {...started,approach};
    }
    function startStudy(state,m,item,spell,room,{chance,roll}){
      state.company.stock=(state.company.stock||[]).filter(i=>i!==item);
      const study={id:"study-"+state.day+"-"+m.id,status:"planned",studentId:m.id,spellCode:spell.code,spellName:spell.nom,
        school:spell.ecole,room:room.code,startDay:state.day+1,days:0,teacherId:null,manual:item};
      studiesOf(state).push(study);
      History.record(m,state.day,"study",{accepted:true,spell:spell.nom});
      return {ok:true,accepted:true,chance,roll,affinityDelta:0,mercenary:m,spell,room,study};
    }

    // Perfectionner : un manuel du même sort, une journée dans la salle, sans test.
    function canPerfect(state,m,item){
      const spell=manuals.spellOf(item);
      if(!spell) return no("Ce n’est pas un manuel de sort.");
      if(!m) return no("Mercenaire introuvable.");
      const known=(m.spells||[]).find(s=>s.code===spell.code);
      if(!known) return no("Il ne connaît pas ce sort.");
      if(camp.expeditionOf(state,m.id)) return no(camp.expeditionOf(state,m.id).status==="scheduled"?"Il part en mission demain.":"Il est en mission.");
      const busy=busyReason(state,m.id)||elsewhere(state,m.id);
      if(busy) return no(busy);
      const room=roomFor(spell);
      if(!room||!(camp.buildingLevel(state,room.code)>0)) return no("Il faut d’abord construire la "+(room?.name||"salle de cette école")+".");
      if(learnersIn(state,room.code)>=camp.buildingPlaces(state,room.code)) return no("La "+room.name+" n’a plus de place.");
      return {ok:true,spell,room,known};
    }
    // L'XP qu'il gagnera demain matin (salle et directeur d'aujourd'hui).
    function perfectXp(state,m,roomCode){
      const director=camp.directorOf(state);
      const transmission=director?1+transmissionOf(director)/C.perfectTransmission:1;
      return Math.round(C.perfectXp*stat(m,"Intelligence")/C.perfectIntelligence*(1+C.perfectRoom*camp.buildingLevel(state,roomCode))*transmission);
    }
    function perfect(state,mercenaryId,itemId){
      const item=(state.company.stock||[]).find(i=>String(i.id)===String(itemId));
      if(!item) return no("Manuel introuvable à l’Intendance.");
      const m=memberOf(state,mercenaryId);
      const check=canPerfect(state,m,item);
      if(!check.ok) return check;
      const {spell,room}=check;
      state.company.stock=(state.company.stock||[]).filter(i=>i!==item);
      const study={id:"perfect-"+state.day+"-"+m.id,kind:"perfect",status:"planned",studentId:m.id,spellCode:spell.code,
        spellName:spell.nom,school:spell.ecole,room:room.code,startDay:state.day+1,days:0,teacherId:null,manual:item};
      studiesOf(state).push(study);
      return {ok:true,mercenary:m,spell,room,study,xp:perfectXp(state,m,room.code),affinityDelta:0};
    }

    // Le test du matin : la chance (en %) et son détail.
    function dailyChance(state,study,testDay=state.day+1){
      const m=memberOf(state,study.studentId);
      const director=camp.directorOf(state);
      const teacher=teacherCounts(study,testDay)?memberOf(state,study.teacherId):null;
      const base=(stat(m,"Intelligence")+schoolOf(m,study.school))/2;
      const directorBonus=director?(schoolOf(director,study.school)+transmissionOf(director))/C.directorDivisor:0;
      const teacherBonus=teacher?transmissionOf(teacher)/C.teacherDivisor:0;
      const x=base+directorBonus+teacherBonus;
      const level=camp.buildingLevel(state,study.room);
      const chance=Math.min(C.dailyMax,100/(1+Math.exp(-(x-C.dailyCenter)/C.dailySlope))*(1+C.roomBonus*level));
      return {chance,x,base,directorBonus,teacherBonus,roomLevel:level};
    }
    // Le niveau du sort à la sortie : celui de la salle, ou celui du professeur × sa Transmission / 100 s'il est plus haut.
    function learnedLevel(state,study,testDay=state.day+1){
      const roomLevel=Math.max(1,camp.buildingLevel(state,study.room));
      const teacher=teacherCounts(study,testDay)?memberOf(state,study.teacherId):null;
      const known=teacher?(teacher.spells||[]).find(s=>s.code===study.spellCode):null;
      const taught=known?Math.round((Number(known.mastery)||0)*transmissionOf(teacher)/C.transmissionDivisor):0;
      return Math.max(1,roomLevel,taught);
    }
    function grant(m,study,level){
      if(!Array.isArray(m.spells)) m.spells=[];
      if(!m.spells.some(s=>s.code===study.spellCode)) m.spells.push({code:study.spellCode,name:study.spellName,school:study.school,mastery:level});
    }

    // Chaque matin : un test par élève ; l'XP du professeur et du directeur. Renvoie les sorts appris ce matin.
    function advance(state){
      const studies=studiesOf(state);
      const learned=[],tested=[];
      const director=camp.directorOf(state);
      const perfected=[],started=[];
      for(const study of [...studies]){
        const m=memberOf(state,study.studentId);
        if(!m){ studies.splice(studies.indexOf(study),1); continue; }
        // Inscrit la veille : il entre ce matin ; le manuel est détruit, l'affinité tombe ; premier test demain.
        if(isPlanned(study)){
          if(state.day<Number(study.startDay)) continue;
          study.status="active";
          study.startDay=state.day;
          delete study.manual;
          const gain=isPerfect(study)?C.affinity.perfect:C.affinity.accept*(persuasion?persuasion.gainFactor(study.approach):1);
          const affinityDelta=shiftAffinity(state,m,gain);
          started.push({study,mercenary:m,affinityDelta});
          continue;
        }
        // Perfectionner : la journée est passée, l'XP tombe ce matin.
        if(isPerfect(study)){
          const known=(m.spells||[]).find(s=>s.code===study.spellCode);
          const before=Number(known?.mastery)||0;
          const xp=perfectXp(state,m,study.room);
          if(known&&progression) progression.apply(m,{spells:{[study.spellCode]:xp}});
          const after=Number(known?.mastery)||before;
          studies.splice(studies.indexOf(study),1);
          History.record(m,state.day,"perfect",{spell:study.spellName,xp,before:Math.floor(before),after:Math.floor(after)});
          perfected.push({study,mercenary:m,xp,before,after});
          continue;
        }
        if(study.teacherId!=null&&!memberOf(state,study.teacherId)) study.teacherId=null;
        // Le professeur de la veille compte pour ce test ; celui accepté hier commence aujourd'hui (+3 d'affinité).
        const teacher=teacherCounts(study,state.day)?memberOf(state,study.teacherId):null;
        if(study.teacherId!=null&&study.teacherStarted===false&&!(Number(study.teacherFrom)>state.day)){
          study.teacherStarted=true;
          shiftAffinity(state,memberOf(state,study.teacherId),C.affinity.teacherAccept*(persuasion?persuasion.gainFactor(study.teacherApproach):1));
        }
        study.days+=1;
        const {chance}=dailyChance(state,study,state.day);
        const dice=roll();
        if(teacher&&progression&&C.teacherXp>0) progression.apply(teacher,{skills:{camp:{[TRANSMISSION]:C.teacherXp}}});
        tested.push({id:study.id,studentId:m.id,chance,roll:dice});
        if(dice>=chance) continue;
        const level=learnedLevel(state,study,state.day);
        grant(m,study,level);
        studies.splice(studies.indexOf(study),1);
        const affinityDelta=shiftAffinity(state,m,C.affinity.learned);
        const teacherDelta=teacher?shiftAffinity(state,teacher,C.affinity.teacherLearned):0;
        History.record(m,state.day,"study_done",{spell:study.spellName,level,days:study.days});
        if(teacher) History.record(teacher,state.day,"teach_done",{spell:study.spellName,student:m.name});
        learned.push({study,mercenary:m,teacher,level,days:study.days,affinityDelta,teacherDelta});
      }
      // Le directeur compte les élèves qui ont passé la veille à l'École.
      const learners=studies.filter(s=>!isPlanned(s)&&!started.some(x=>x.study===s)).length+learned.length+perfected.length;
      const directorXp=director&&learners?C.directorXp*learners:0;
      if(director&&progression&&directorXp>0) progression.apply(director,{skills:{camp:{[TRANSMISSION]:directorXp}}});
      return {learned,tested,perfected,started,directorXp};
    }

    // Professeurs possibles : au camp, connaissent le sort, ni l'élève, ni déjà pris par l'École.
    function canTeach(state,study,t,{retry=false}={}){
      if(!study) return no("Apprentissage introuvable.");
      if(isPerfect(study)) return no("Pas de professeur pour perfectionner un sort.");
      if(!t) return no("Mercenaire introuvable.");
      if(study.teacherId!=null) return no("Il a déjà un professeur.");
      if(t.id===study.studentId) return no("Il ne peut pas s’enseigner le sort.");
      if(!(t.spells||[]).some(s=>s.code===study.spellCode)) return no("Il ne connaît pas ce sort.");
      if(camp.expeditionOf(state,t.id)) return no("Il est en mission.");
      const busy=busyReason(state,t.id)||elsewhere(state,t.id);
      if(busy) return no(busy);
      if(!retry&&!isCaptain(state,t)&&t.teachOfferDay===state.day) return no("Vous lui en avez déjà parlé aujourd’hui.");
      return {ok:true};
    }
    function teachChance(state,study,t,approach=null){
      if(isCaptain(state,t)) return {chance:100,delta:null};
      const student=memberOf(state,study.studentId);
      const delta=(affinityWithCaptain(state,t)+feeling(student,t))/2+persuade(state,approach);
      return {chance:curve(delta,C.slope),delta};
    }
    function offerTeacher(state,studyId,teacherId){
      const study=studyById(state,studyId);
      const t=memberOf(state,teacherId);
      const check=canTeach(state,study,t);
      if(!check.ok) return check;
      const student=memberOf(state,study.studentId);
      const {chance}=teachChance(state,study,t);
      const captain=isCaptain(state,t);
      const dice=captain?0:roll();
      if(!captain) t.teachOfferDay=state.day;
      const accepted=dice<chance;
      if(accepted){ study.teacherId=t.id; study.teacherFrom=state.day+1; study.teacherStarted=false; study.teacherApproach=null; }
      const affinityDelta=accepted?0:shiftAffinity(state,t,C.affinity.teacherRefuse);
      History.record(t,state.day,"teach",{accepted,spell:study.spellName,student:student?.name||""});
      if(!accepted) persuasion?.markRefused(t,"teachRefusal",state.day,{studyId:study.id});
      return {ok:true,accepted,chance,roll:captain?null:dice,affinityDelta,mercenary:t,student,study,canRetry:!accepted&&Boolean(persuasion)};
    }
    // Après un refus d'enseigner, aujourd'hui : une relance.
    function retryTeacher(state,studyId,teacherId,approach){
      const study=studyById(state,studyId);
      const t=memberOf(state,teacherId);
      if(!persuasion?.approachOf(approach)) return no("Approche inconnue.");
      const again=persuasion.canRetry(t,"teachRefusal",state.day);
      if(!again.ok) return again;
      if(String(again.refusal.studyId)!==String(studyId)) return no("Il n’a rien refusé aujourd’hui.");
      const check=canTeach(state,study,t,{retry:true});
      if(!check.ok) return check;
      const student=memberOf(state,study.studentId);
      const {chance}=teachChance(state,study,t,approach),dice=roll(),accepted=dice<chance;
      persuasion.markRetried(t,"teachRefusal",approach,accepted);
      if(accepted){
        study.teacherId=t.id; study.teacherFrom=state.day+1; study.teacherStarted=false; study.teacherApproach=approach;
        History.record(t,state.day,"teach",{accepted:true,spell:study.spellName,student:student?.name||""});
      }
      const affinityDelta=accepted?0:shiftAffinity(state,t,persuasion.refusalExtra(C.affinity.teacherRefuse,approach));
      return {ok:true,accepted,approach,chance,roll:dice,affinityDelta,mercenary:t,student,study};
    }
    // Libérer le professeur : l'élève continue seul.
    function releaseTeacher(state,studyId){
      const study=studyById(state,studyId);
      if(!study||study.teacherId==null) return no("Pas de professeur à libérer.");
      const t=memberOf(state,study.teacherId);
      // Pas encore commencé (accepté aujourd'hui) : on change simplement d'avis.
      const started=study.teacherStarted!==false;
      study.teacherId=null;
      delete study.teacherFrom; delete study.teacherStarted;
      const affinityDelta=started?shiftAffinity(state,t,C.affinity.teacherReleased):0;
      return {ok:true,mercenary:t,affinityDelta,study};
    }
    // Le faire sortir avant la fin : le manuel est perdu, rien n'est acquis.
    function stop(state,studyId){
      const study=studyById(state,studyId);
      if(!study) return no("Apprentissage introuvable.");
      const studies=studiesOf(state);
      studies.splice(studies.indexOf(study),1);
      const m=memberOf(state,study.studentId);
      if(isPlanned(study)){
        if(study.manual) (state.company.stock||(state.company.stock=[])).push(study.manual);
        return {ok:true,mercenary:m,affinityDelta:0,study,cancelled:true};
      }
      const affinityDelta=shiftAffinity(state,m,C.affinity.stopped);
      if(m) History.record(m,state.day,"study_stopped",{spell:study.spellName,days:study.days});
      return {ok:true,mercenary:m,affinityDelta,study};
    }

    return {constants:C,studiesOf,studyById,studyOf,teachingOf,busyReason,learnersIn,canStudy,offerChance,offer,retryOffer,canPerfect,perfectXp,perfect,dailyChance,
      learnedLevel,advance,canTeach,teachChance,offerTeacher,retryTeacher,releaseTeacher,stop,isPlanned};
  }

  return {createSpellStudyRules};
});
