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
// Ludus, Académie de la survie, Cercle des Fines Lames (Idan, 2026-11-03 : « Là où il est le plus doué à 75 % de chance,
// sinon au hasard » ; « Le reste, c'est nickel ») : le même entraînement pour tous les bâtiments, École comprise.
// - Chaque mercenaire (après le capitaine) va, à 75 % (camp.training.talent_share), là où il se classe le mieux dans la
//   compagnie (la part de ses camarades qu'il dépasse), parmi les salles et ailes qui ont une place libre ; sinon au
//   hasard parmi elles. Plus de place nulle part : la taverne.
// - Test hors École : chance = 100 / (1 + e^(−Δ/15)), de 2 à 95 %, Δ = (Volonté − 50) / 2 (le choix de la salle tient déjà
//   compte du talent) + Charisme du maître / 10 + affinité avec le maître / 10 ; à l'École, le test ci-dessus.
// - Gain : 20 × carac / 50 × (1 + 0,1 × niveau) × (1 + niveau du maître / 100) × (1 + Transmission du savoir du maître
//   / 100), la carac du bâtiment (apprend_avec : Intelligence, Endurance, Volonté, Dextérité) ; caractéristiques et
//   résistances montent ; une arme, une catégorie ou un style fait reculer les autres comme en combat
//   (progression.martialSpread).
// Les maîtres (Idan, 2026-11-03 : « Oui pour les maîtres ») : le Doctore au Ludus, le Vétéran à l'Académie de la survie,
// le Maître des lames au Cercle des Fines Lames aident comme le directeur à l'École : même test, même gain ; niveau du
// maître : sa valeur dans ce que travaille la salle ou l'aile. Chacun gagne 5 XP de Transmission du savoir par élève de
// son bâtiment et par jour.
// Constantes : formula-constants.json (school.training.*, camp.training.*). Doc 11 §7.
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
      oppositeRatio:k("progression.magic.opposite_regression_ratio",0.5),talentShare:k("camp.training.talent_share",0.75)
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
    // Niveau du directeur ou du maître dans la salle : sa valeur dans ce qu'elle travaille (son école dans la salle d'une
    // école, sa Puissance magique dans la salle généraliste, sa Force à la Meule…).
    function directorLevel(director,room){
      return director?valueOf(director,room):0;
    }
    // Chance de prendre la place dans un bâtiment autre que l'École (en %) : la Volonté, et le maître s'il y en a un.
    function trainingChance(m,master=null){
      const will=(stat(m,"Volonté")-C.willCenter)/C.willDivisor;
      const charisma=master?stat(master,"Charisme")/C.charismaDivisor:0;
      const liking=master?directorAffinity(master,m)/C.affinityDivisor:0;
      const delta=will+charisma+liking;
      return {chance:clamp(100/(1+Math.exp(-delta/C.slope)),C.min,C.max),delta,parts:{will,charisma,affinity:liking}};
    }
    // Ce que travaille une salle : son école, ou room.trains (Puissance magique pour la salle généraliste de l'École).
    const trainsOf=room=>room?.school||room?.trains||MAGIC_POWER;
    // La valeur du mercenaire pour ce que travaille la salle (caractéristique, résistance, compétence martiale ou école).
    function valueOf(m,room){
      if(room?.school) return schoolOf(m,room.school);
      const name=trainsOf(room);
      for(const group of [m?.stats,m?.resistances,m?.skills?.martial,m?.skills?.magic]){
        if(group&&name in group) return Number(group[name])||0;
      }
      return 0;
    }
    // Son rang dans la compagnie pour cette salle : la part de ses camarades qu'il dépasse (égalité : la moitié), de 0 à 1.
    function rankOf(m,room,peers){
      const others=(peers||[]).filter(x=>x&&x!==m);
      if(!others.length) return 0.5;
      const mine=valueOf(m,room);
      let score=0;
      for(const other of others){ const v=valueOf(other,room); score+=v<mine?1:v===mine?0.5:0; }
      return score/others.length;
    }
    // La salle où il est le plus doué, parmi open (à égalité, l'ordre des salles).
    function bestRoom(m,open,peers){
      let best=null,bestRank=-1;
      for(const room of open){ const rank=rankOf(m,room,peers); if(rank>bestRank){ best=room; bestRank=rank; } }
      return best;
    }
    // XP d'une journée dans la salle room ({ code, school, level, learnWith }).
    function dailyXp(m,room,director=null){
      const intelligence=stat(m,room?.learnWith||"Intelligence")/C.intelligenceDivisor;
      const roomFactor=1+C.roomBonus*(Number(room?.level)||0);
      const directorFactor=director?1+directorLevel(director,room)/C.directorDivisor:1;
      const transmission=director?1+(Number(director.skills?.camp?.[TRANSMISSION])||0)/C.transmissionDivisor:1;
      return Math.max(0,Math.round(C.baseXp*intelligence*roomFactor*directorFactor*transmission));
    }
    // L'XP d'une journée, à appliquer avec progression.apply : l'école et ses opposées, une caractéristique, une résistance
    // ou une compétence martiale (avec le recul des autres) ; m : le mercenaire (où ranger l'XP).
    function xpOf(room,xp,m=null){
      if(!room.school){
        const name=trainsOf(room);
        if(name===MAGIC_POWER||(m?.stats&&name in m.stats)) return {stats:{[name]:xp}};
        if(m?.resistances&&name in m.resistances) return {resistances:{[name]:xp}};
        const raw={[name]:xp};
        return {skills:{martial:progression?.martialSpread?progression.martialSpread(m,raw):raw}};
      }
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

    // Une salle de l'École de magie (son directeur, son test) : building magic_school, ou une salle sans building (ancien
    // appel, l'École seule).
    const atSchool=room=>!room.building||room.building===HALL;
    // Une journée. rooms : [{ code, building, school, trains, learnWith, level, places }] (salles et ailes construites) ;
    // candidates : les mercenaires disponibles, sans le capitaine ; captain : le capitaine s'il est disponible ;
    // captainChoice : le code de la salle choisie pour lui (null : la taverne) ; masters : les maîtres par bâtiment
    // ({ magic_school: directeur, ludus: Doctore, … }) ; director : l'ancien paramètre, le directeur de l'École seul ;
    // company : toute la compagnie (pour le rang ; par défaut, le capitaine et les candidats).
    // Renvoie { entries, directorXp, masterXp } (masterXp : l'XP de Transmission par bâtiment) ; chaque entrée : { id,
    // name, code, school, xp, chance, roll, captain, talent }, code null pour la taverne (test raté, ou plus de place :
    // full). L'XP est appliquée si progression est fourni.
    function runDay({rooms=[],candidates=[],captain=null,captainChoice=null,director=null,masters=null,company=null}={}){
      const free=new Map(rooms.map(room=>[room.code,Math.max(0,Number(room.places)||0)]));
      const byCode=new Map(rooms.map(room=>[room.code,room]));
      const peers=company||[captain,...candidates].filter(Boolean);
      const teachers=masters||{[HALL]:director};
      const buildingOf=room=>room.building||HALL;
      const masterOf=room=>teachers[buildingOf(room)]||null;
      const entries=[];
      const train=(m,room,extra)=>{
        free.set(room.code,free.get(room.code)-1);
        const xp=dailyXp(m,room,masterOf(room));
        if(progression&&xp>0) progression.apply(m,xpOf(room,xp,m));
        entries.push({id:m.id,name:m.name,code:room.code,school:room.school||null,xp,...extra});
      };
      if(captain){
        const room=captainChoice?byCode.get(captainChoice):null;
        if(room&&free.get(room.code)>0) train(captain,room,{captain:true,chance:null,roll:null});
        else entries.push({id:captain.id,name:captain.name,code:null,school:null,xp:0,captain:true,chance:null,roll:null});
      }
      for(const m of shuffled(candidates)){
        const open=rooms.filter(room=>free.get(room.code)>0);
        if(!open.length){ entries.push({id:m.id,name:m.name,code:null,school:null,xp:0,captain:false,chance:null,roll:null,full:true}); continue; }
        // Là où il est le plus doué (75 %), sinon au hasard parmi les places libres.
        const talent=random()<C.talentShare;
        const room=talent?bestRoom(m,open,peers):open[Math.min(open.length-1,Math.floor(random()*open.length))];
        const test=atSchool(room)?chance(m,masterOf(room)):trainingChance(m,masterOf(room));
        const roll=random()*100;
        const extra={captain:false,talent,chance:Math.round(test.chance*10)/10,roll:Math.round(roll*10)/10};
        if(roll<test.chance) train(m,room,extra);
        else entries.push({id:m.id,name:m.name,code:null,school:null,xp:0,aimed:room.code,...extra});
      }
      // Chaque maître compte les élèves de son bâtiment.
      const masterXp={};
      for(const [building,master] of Object.entries(teachers)){
        if(!master) continue;
        const students=entries.filter(e=>e.code&&buildingOf(byCode.get(e.code))===building&&e.id!==master.id).length;
        const xp=students?C.directorXp*students:0;
        if(!xp) continue;
        masterXp[building]=xp;
        if(progression) progression.apply(master,{skills:{camp:{[TRANSMISSION]:xp}}});
      }
      return {entries,directorXp:masterXp[HALL]||0,masterXp};
    }

    return {constants:C,HALL,SCHOOLS,bestSchool,chance,trainingChance,valueOf,rankOf,bestRoom,directorLevel,dailyXp,xpOf,runDay};
  }

  return {createSchoolTrainingRules};
});
