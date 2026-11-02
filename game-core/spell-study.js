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
//   chez le professeur × sa Transmission / 100 s'il est plus haut (au plus 100).
// - Professeur : il connaît le sort ; il accepte selon 10 + 80 / (1 + e^(−Δ/20)), Δ = (son affinité avec le capitaine
//   + son affinité envers l'élève) / 2 ; le capitaine enseigne sans test ; il reste au camp jusqu'à la fin (on peut le
//   libérer) ; +5 XP de Transmission du savoir par jour d'enseignement.
// - Sortir avant la fin : le manuel est perdu, rien n'est acquis.
// - Affinité avec le capitaine : l'élève +5 s'il accepte, −2 s'il refuse, +10 quand il connaît le sort, −10 si on le
//   fait sortir ; le professeur +3 s'il accepte, −2 s'il refuse, +5 quand l'élève connaît le sort, −3 si on le libère.
// Constantes : formula-constants.json (spell_study.*). Doc 11 §7 et doc 12.
(function(root,factory){
  const node=typeof module!=="undefined"&&module.exports;
  const history=node?require("./history.js"):root.MercenairesHistory;
  const manuals=node?require("./spell-manuals.js"):root.MercenairesSpellManuals;
  const api=factory(history,manuals);
  if(node) module.exports=api;
  root.MercenairesSpellStudy=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(History,Manuals){
  const TRANSMISSION="Transmission du savoir";
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const curve=(delta,slope)=>10+80/(1+Math.exp(-delta/slope));

  // camp : { roomOfSchool(school) → { code, name } | null, buildingLevel(state, code), buildingPlaces(state, code),
  //          directorOf(state), expeditionOf(state, id) } (campaign.js).
  function createSpellStudyRules({reference,random=Math.random,affinity=null,progression=null,camp}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      offerAffinity:k("spell_study.offer.affinity_weight",0.5),offerSchool:k("spell_study.offer.school_weight",0.5),
      offerCenter:k("spell_study.offer.school_center",50),slope:k("spell_study.offer.slope",20),
      stewardSkill:k("equipment_deal.steward_skill_weight",0.2),stewardAffinity:k("equipment_deal.steward_affinity_weight",0.25),
      dailyCenter:k("spell_study.daily.center",100),dailySlope:k("spell_study.daily.slope",20),
      roomBonus:k("spell_study.daily.room_bonus",0.1),dailyMax:k("spell_study.daily.max",95),
      directorDivisor:k("spell_study.daily.director_divisor",10),teacherDivisor:k("spell_study.daily.teacher_divisor",5),
      transmissionDivisor:k("spell_study.teacher.transmission_divisor",100),maxLevel:k("spell_study.max_level",100),
      teacherXp:k("spell_study.xp.teacher_transmission",5),directorXp:k("school.training.director_transmission_xp",5),
      affinity:{accept:k("spell_study.affinity.accept",5),refuse:k("spell_study.affinity.refuse",-2),
        learned:k("spell_study.affinity.learned",10),stopped:k("spell_study.affinity.stopped",-10),
        teacherAccept:k("spell_study.affinity.teacher_accept",3),teacherRefuse:k("spell_study.affinity.teacher_refuse",-2),
        teacherLearned:k("spell_study.affinity.teacher_learned",5),teacherReleased:k("spell_study.affinity.teacher_released",-3)}
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
    function busyReason(state,mercenaryId){
      if(studyOf(state,mercenaryId)) return "Il apprend un sort à l’École de magie.";
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
    function canStudy(state,m,item){
      const check=manuals.canLearn(state,m,item);
      if(!check.ok) return check;
      if(camp.expeditionOf(state,m.id)) return no("Il part en mission demain.");
      const busy=busyReason(state,m.id);
      if(busy) return no(busy);
      const room=roomFor(check.spell);
      if(!room||!(camp.buildingLevel(state,room.code)>0)) return no("Il faut d’abord construire la "+(room?.name||"salle de cette école")+".");
      if(learnersIn(state,room.code)>=camp.buildingPlaces(state,room.code)) return no("La "+room.name+" n’a plus de place.");
      if(!isCaptain(state,m)&&m.studyOfferDay===state.day) return no("Vous lui en avez déjà parlé aujourd’hui.");
      return {ok:true,spell:check.spell,room};
    }
    // L'appui de l'intendant, comme pour un échange d'équipement (pas quand on lui parle à lui).
    function stewardHelp(state,m){
      const steward=state.company.intendantId==null?null:memberOf(state,state.company.intendantId);
      if(!steward||steward===m) return 0;
      return C.stewardSkill*clamp(Number(steward.skills?.camp?.Intendance)||0,0,100)+C.stewardAffinity*feeling(steward,m);
    }
    // La chance qu'il accepte (en %), sans jet.
    function offerChance(state,m,spell){
      if(isCaptain(state,m)) return {chance:100,delta:null};
      const delta=C.offerAffinity*affinityWithCaptain(state,m)+C.offerSchool*(schoolOf(m,spell.ecole)-C.offerCenter)+stewardHelp(state,m);
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
        return {ok:true,accepted:false,chance,roll:dice,affinityDelta,mercenary:m,spell,room};
      }
      state.company.stock=(state.company.stock||[]).filter(i=>i!==item);
      const study={id:"study-"+state.day+"-"+m.id,studentId:m.id,spellCode:spell.code,spellName:spell.nom,school:spell.ecole,
        room:room.code,startDay:state.day,days:0,teacherId:null};
      studiesOf(state).push(study);
      const affinityDelta=shiftAffinity(state,m,C.affinity.accept);
      History.record(m,state.day,"study",{accepted:true,spell:spell.nom});
      return {ok:true,accepted:true,chance,roll:captain?null:dice,affinityDelta,mercenary:m,spell,room,study};
    }

    // Le test du matin : la chance (en %) et son détail.
    function dailyChance(state,study){
      const m=memberOf(state,study.studentId);
      const director=camp.directorOf(state);
      const teacher=study.teacherId==null?null:memberOf(state,study.teacherId);
      const base=(stat(m,"Intelligence")+schoolOf(m,study.school))/2;
      const directorBonus=director?(schoolOf(director,study.school)+transmissionOf(director))/C.directorDivisor:0;
      const teacherBonus=teacher?transmissionOf(teacher)/C.teacherDivisor:0;
      const x=base+directorBonus+teacherBonus;
      const level=camp.buildingLevel(state,study.room);
      const chance=Math.min(C.dailyMax,100/(1+Math.exp(-(x-C.dailyCenter)/C.dailySlope))*(1+C.roomBonus*level));
      return {chance,x,base,directorBonus,teacherBonus,roomLevel:level};
    }
    // Le niveau du sort à la sortie : celui de la salle, ou celui du professeur × sa Transmission / 100 s'il est plus haut.
    function learnedLevel(state,study){
      const roomLevel=Math.max(1,camp.buildingLevel(state,study.room));
      const teacher=study.teacherId==null?null:memberOf(state,study.teacherId);
      const known=teacher?(teacher.spells||[]).find(s=>s.code===study.spellCode):null;
      const taught=known?Math.round((Number(known.mastery)||0)*transmissionOf(teacher)/C.transmissionDivisor):0;
      return clamp(Math.max(roomLevel,taught),1,C.maxLevel);
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
      for(const study of [...studies]){
        const m=memberOf(state,study.studentId);
        if(!m){ studies.splice(studies.indexOf(study),1); continue; }
        if(study.teacherId!=null&&!memberOf(state,study.teacherId)) study.teacherId=null;
        const teacher=study.teacherId==null?null:memberOf(state,study.teacherId);
        study.days+=1;
        const {chance}=dailyChance(state,study);
        const dice=roll();
        if(teacher&&progression&&C.teacherXp>0) progression.apply(teacher,{skills:{camp:{[TRANSMISSION]:C.teacherXp}}});
        tested.push({id:study.id,studentId:m.id,chance,roll:dice});
        if(dice>=chance) continue;
        const level=learnedLevel(state,study);
        grant(m,study,level);
        studies.splice(studies.indexOf(study),1);
        const affinityDelta=shiftAffinity(state,m,C.affinity.learned);
        const teacherDelta=teacher?shiftAffinity(state,teacher,C.affinity.teacherLearned):0;
        History.record(m,state.day,"study_done",{spell:study.spellName,level,days:study.days});
        if(teacher) History.record(teacher,state.day,"teach_done",{spell:study.spellName,student:m.name});
        learned.push({study,mercenary:m,teacher,level,days:study.days,affinityDelta,teacherDelta});
      }
      const learners=studies.length+learned.length;
      const directorXp=director&&learners?C.directorXp*learners:0;
      if(director&&progression&&directorXp>0) progression.apply(director,{skills:{camp:{[TRANSMISSION]:directorXp}}});
      return {learned,tested,directorXp};
    }

    // Professeurs possibles : au camp, connaissent le sort, ni l'élève, ni déjà pris par l'École.
    function canTeach(state,study,t){
      if(!study) return no("Apprentissage introuvable.");
      if(!t) return no("Mercenaire introuvable.");
      if(study.teacherId!=null) return no("Il a déjà un professeur.");
      if(t.id===study.studentId) return no("Il ne peut pas s’enseigner le sort.");
      if(!(t.spells||[]).some(s=>s.code===study.spellCode)) return no("Il ne connaît pas ce sort.");
      if(camp.expeditionOf(state,t.id)) return no("Il est en mission.");
      const busy=busyReason(state,t.id);
      if(busy) return no(busy);
      if(!isCaptain(state,t)&&t.teachOfferDay===state.day) return no("Vous lui en avez déjà parlé aujourd’hui.");
      return {ok:true};
    }
    function teachChance(state,study,t){
      if(isCaptain(state,t)) return {chance:100,delta:null};
      const student=memberOf(state,study.studentId);
      const delta=(affinityWithCaptain(state,t)+feeling(student,t))/2;
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
      if(accepted) study.teacherId=t.id;
      const affinityDelta=shiftAffinity(state,t,accepted?C.affinity.teacherAccept:C.affinity.teacherRefuse);
      History.record(t,state.day,"teach",{accepted,spell:study.spellName,student:student?.name||""});
      return {ok:true,accepted,chance,roll:captain?null:dice,affinityDelta,mercenary:t,student,study};
    }
    // Libérer le professeur : l'élève continue seul.
    function releaseTeacher(state,studyId){
      const study=studyById(state,studyId);
      if(!study||study.teacherId==null) return no("Pas de professeur à libérer.");
      const t=memberOf(state,study.teacherId);
      study.teacherId=null;
      const affinityDelta=shiftAffinity(state,t,C.affinity.teacherReleased);
      return {ok:true,mercenary:t,affinityDelta,study};
    }
    // Le faire sortir avant la fin : le manuel est perdu, rien n'est acquis.
    function stop(state,studyId){
      const study=studyById(state,studyId);
      if(!study) return no("Apprentissage introuvable.");
      const studies=studiesOf(state);
      studies.splice(studies.indexOf(study),1);
      const m=memberOf(state,study.studentId);
      const affinityDelta=shiftAffinity(state,m,C.affinity.stopped);
      if(m) History.record(m,state.day,"study_stopped",{spell:study.spellName,days:study.days});
      return {ok:true,mercenary:m,affinityDelta,study};
    }

    return {constants:C,studiesOf,studyById,studyOf,teachingOf,busyReason,learnersIn,canStudy,offerChance,offer,dailyChance,
      learnedLevel,advance,canTeach,teachChance,offerTeacher,releaseTeacher,stop};
  }

  return {createSpellStudyRules};
});
