"use strict";

// Entraînement libre à l'École de magie (Idan, 2026-11-02 : « un mercenaire hors mission, pas blessé pas fatigué ne
// restera pas oisif au camp […] il faut tous les jours un ordre de tirage pour tous les mercenaires dispo. Avec cet
// ordre, on fait un test pour voir s'il prend la place dispo ou non »). Module pur : campaign.js lui donne, chaque matin,
// les salles construites (places, niveau), les mercenaires disponibles, le directeur et le choix du capitaine.
//
// - Ordre : le capitaine d'abord, à la place choisie par le joueur, sans test ; puis les autres dans un ordre tiré au
//   hasard. Chacun vise la salle de sa meilleure école si elle a une place libre, sinon la salle généraliste (l'École
//   elle-même) ; plus de place : il passe la journée à la taverne.
// - Test : chance = 100 / (1 + e^(−Δ/15)) %, de 2 à 95 %, Δ = (Volonté − 50) / 2 + (meilleure école − 70)
//   + Charisme du directeur / 10 + affinité avec le directeur / 10 (affinity.js, comme avec le capitaine).
// - Gain par jour : 20 × Intelligence / 50 × (1 + 0,1 × niveau de la salle) × (1 + niveau du directeur / 100)
//   × (1 + Transmission du savoir du directeur / 100) ; niveau du directeur : son école dans la salle de cette école, sa
//   Puissance magique dans la salle généraliste ; sans directeur, ces deux facteurs valent 1. Salle d'une école : l'XP va
//   à l'école, ses deux opposées perdent la moitié du gain à elles deux (progression.js) ; salle généraliste : l'XP va à
//   la Puissance magique. Le directeur gagne 5 XP de Transmission du savoir par élève et par jour.
// Constantes : formula-constants.json (school.training.*). Doc 11 §7.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesSchoolTraining=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const HALL="magic_school";
  const TRANSMISSION="Transmission du savoir";
  const MAGIC_POWER="Puissance magique";
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  // affinity (facultatif) : createAffinityRules(...) ; progression (facultatif) : createProgressionRules(...).
  function createSchoolTrainingRules({reference,random=Math.random,affinity=null,progression=null}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      slope:k("school.training.chance_slope",15),min:k("school.training.chance_min",2),max:k("school.training.chance_max",95),
      willCenter:k("school.training.will_center",50),willDivisor:k("school.training.will_divisor",2),
      schoolCenter:k("school.training.school_center",70),
      charismaDivisor:k("school.training.director_charisma_divisor",10),affinityDivisor:k("school.training.director_affinity_divisor",10),
      baseXp:k("school.training.base_xp",20),intelligenceDivisor:k("school.training.intelligence_divisor",50),
      roomBonus:k("school.training.room_level_bonus",0.1),directorDivisor:k("school.training.director_level_divisor",100),
      transmissionDivisor:k("school.training.transmission_divisor",100),directorXp:k("school.training.director_transmission_xp",5),
      oppositeRatio:k("progression.magic.opposite_regression_ratio",0.5)
    };
    const skillRows=reference?.skills?.rows||[];
    const SCHOOLS=skillRows.filter(r=>r.domaine==="Magie"&&r.ecoles_opposees).map(r=>r.nom);
    const OPPOSITES=new Map(skillRows.filter(r=>r.ecoles_opposees)
      .map(r=>[r.nom,String(r.ecoles_opposees).split(",").map(x=>x.trim()).filter(Boolean)]));
    const stat=(m,name)=>Number(m?.stats?.[name])||0;
    const schoolOf=(m,school)=>Number(m?.skills?.magic?.[school])||0;

    // Sa meilleure école (valeur de base ; à égalité, l'ordre des données) : { school, value }, school null sans école.
    function bestSchool(m){
      let best={school:null,value:0};
      for(const school of SCHOOLS){
        const value=schoolOf(m,school);
        if(value>best.value) best={school,value};
      }
      return best.value>1?best:{school:null,value:best.value};
    }
    function directorAffinity(director,m){
      if(!director||!affinity||director===m) return 0;
      const result=affinity.affinity(director,m);
      return result?.ok?Number(result.initial)||0:0;
    }
    // Chance de prendre la place visée (en %), et le détail de Δ.
    function chance(m,director=null){
      const best=bestSchool(m);
      const will=(stat(m,"Volonté")-C.willCenter)/C.willDivisor;
      const school=best.value-C.schoolCenter;
      const charisma=director?stat(director,"Charisme")/C.charismaDivisor:0;
      const liking=director?directorAffinity(director,m)/C.affinityDivisor:0;
      const delta=will+school+charisma+liking;
      return {chance:clamp(100/(1+Math.exp(-delta/C.slope)),C.min,C.max),delta,parts:{will,school,charisma,affinity:liking},best};
    }
    // Niveau du directeur dans la salle : son école (salle d'une école), sa Puissance magique (salle généraliste).
    function directorLevel(director,room){
      if(!director) return 0;
      return room.school?schoolOf(director,room.school):stat(director,MAGIC_POWER);
    }
    // XP d'une journée dans la salle room ({ code, school, level }).
    function dailyXp(m,room,director=null){
      const intelligence=stat(m,"Intelligence")/C.intelligenceDivisor;
      const roomFactor=1+C.roomBonus*(Number(room?.level)||0);
      const directorFactor=director?1+directorLevel(director,room)/C.directorDivisor:1;
      const transmission=director?1+(Number(director.skills?.camp?.[TRANSMISSION])||0)/C.transmissionDivisor:1;
      return Math.max(0,Math.round(C.baseXp*intelligence*roomFactor*directorFactor*transmission));
    }
    // L'XP d'une journée, à appliquer avec progression.apply : l'école et ses opposées, ou la Puissance magique.
    function xpOf(room,xp){
      if(!room.school) return {stats:{[MAGIC_POWER]:xp}};
      const opposites=OPPOSITES.get(room.school)||[];
      const magic={[room.school]:xp};
      for(const other of opposites) magic[other]=(magic[other]||0)-C.oppositeRatio*xp/opposites.length;
      return {skills:{magic}};
    }

    function shuffled(list){
      const copy=[...list];
      for(let i=copy.length-1;i>0;i--){
        const j=Math.floor(random()*(i+1));
        [copy[i],copy[j]]=[copy[j],copy[i]];
      }
      return copy;
    }

    // Une journée. rooms : [{ code, school (null pour la salle généraliste), level, places }] (salles construites) ;
    // candidates : les mercenaires disponibles, sans le capitaine ; captain : le capitaine s'il est disponible ;
    // captainChoice : le code de la salle choisie pour lui (null : la taverne) ; director : le directeur ou null.
    // Renvoie { entries, directorXp } ; chaque entrée : { id, name, code, school, xp, chance, roll, captain }, code null
    // pour la taverne (place visée prise ou test raté). L'XP est appliquée si progression est fourni.
    function runDay({rooms=[],candidates=[],captain=null,captainChoice=null,director=null}={}){
      const free=new Map(rooms.map(room=>[room.code,Math.max(0,Number(room.places)||0)]));
      const byCode=new Map(rooms.map(room=>[room.code,room]));
      const bySchool=new Map(rooms.filter(room=>room.school).map(room=>[room.school,room]));
      const entries=[];
      const train=(m,room,extra)=>{
        free.set(room.code,free.get(room.code)-1);
        const xp=dailyXp(m,room,director);
        if(progression&&xp>0) progression.apply(m,xpOf(room,xp));
        entries.push({id:m.id,name:m.name,code:room.code,school:room.school||null,xp,...extra});
      };
      if(captain){
        const room=captainChoice?byCode.get(captainChoice):null;
        if(room&&free.get(room.code)>0) train(captain,room,{captain:true,chance:null,roll:null});
        else entries.push({id:captain.id,name:captain.name,code:null,school:null,xp:0,captain:true,chance:null,roll:null});
      }
      for(const m of shuffled(candidates)){
        const test=chance(m,director);
        const own=test.best.school?bySchool.get(test.best.school):null;
        const room=own&&free.get(own.code)>0?own:(byCode.get(HALL)&&free.get(HALL)>0?byCode.get(HALL):null);
        if(!room){ entries.push({id:m.id,name:m.name,code:null,school:null,xp:0,captain:false,chance:null,roll:null,full:true}); continue; }
        const roll=random()*100;
        const extra={captain:false,chance:Math.round(test.chance*10)/10,roll:Math.round(roll*10)/10};
        if(roll<test.chance) train(m,room,extra);
        else entries.push({id:m.id,name:m.name,code:null,school:null,xp:0,...extra});
      }
      const students=entries.filter(e=>e.code&&!(director&&e.id===director.id)).length;
      const directorXp=director&&students?C.directorXp*students:0;
      if(progression&&directorXp>0) progression.apply(director,{skills:{camp:{[TRANSMISSION]:directorXp}}});
      return {entries,directorXp};
    }

    return {constants:C,HALL,SCHOOLS,bestSchool,chance,directorLevel,dailyXp,xpOf,runDay};
  }

  return {createSchoolTrainingRules};
});
