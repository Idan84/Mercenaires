"use strict";
// Apprivoiser une monture à la Grange du dresseur (Idan, 2026-11-07 : « Pour pouvoir l'équiper ( c'est valable par monture
// et non pas une catégorie de monture... S'il perd un cheval, il doit apprivoiser un autre cheval), il doit passer du temps
// chez le dresseur. Ici, un peu comme les apprentissages, il doit chaque jour tenter de réussir un jet en fonction de 5
// caracs ( intelligence/ charisme/ intimidation/ animal/ animal spécifique). Le dresseur offre un bonus. Sauf qu'en plus, il
// y a un second test à faire : les montures/ compagnons ont un alignement et une tolérance à l'écart d'alignement. » ;
// « faudrait que ce facteur soit pondéré par la volonté et l'intelligence de l'animal […] Un orc a statistiquement très peu
// de chances de monter sur une licorne, mais c'est pas impossible au sens propre.. peut-être 1 pour 1000 ? »). Module pur :
// campaign.js lui donne le camp et appelle advance(state) chaque matin.
//
// - La monture : un objet « mount » à lui (stables.js), qu'il n'a pas encore apprivoisé (item.tamedBy). Il faut la Grange,
//   et pouvoir la monter (Idan, 2026-11-07 : « un ogre ne peut pas monter sur un cheval » : sa taille, ses places au
//   dortoir, sous le gabarit de la monture).
// - Au jour J, on organise J+1 : il entre à la Grange le lendemain matin (on peut annuler d'ici là), et reste au camp (ni
//   mission, ni garde du corps, ni entraînement, ni autre apprentissage) jusqu'à la fin. Pas de test pour qu'il y aille : il
//   a déjà accepté la monture.
// - Chaque matin (le premier test le matin suivant son entrée), deux tests, à réussir le même jour :
//   1. X = moyenne (Intelligence, Charisme, Intimidation, Compagnon animal, la famille de la monture : Équidés…) + bonus du
//      Dresseur ; chance = 100 / (1 + e^(−(X − 60) / 10)) ; bonus du Dresseur = (Compagnon animal + Intelligence + Charisme
//      + Intimidation) ÷ 20 (environ +10), s'il y en a un (et qu'il n'est pas l'élève).
//   2. L'alignement : écart = crans sur l'axe Loyal–Chaotique + crans sur l'axe Bon–Mauvais (0 à 4) ; dans la tolérance de la
//      monture (mounts.json), réussi d'office ; au-delà, chance = 100 × ((100 − entêtement) / 100)^(crans de trop), entêtement
//      = (Intelligence + Volonté de l'animal) / 2. La licorne (82,5) : 17,5 % pour un cran de trop, 0,1 % pour quatre (un orc
//      chaotique mauvais : environ 1 pour 1000).
//   Réussi : il l'a apprivoisée (item.tamedBy) et peut l'équiper (emplacement Monture) ; il sort de la Grange.
// - Le Dresseur gagne 5 XP de Transmission du savoir par élève et par jour, comme les autres maîtres.
// - Le faire sortir, ou la monture qui n'est plus à lui : rien n'est acquis.
// - Son historique : l'entrée à la Grange (taming), la monture apprivoisée (taming_done), la sortie sans elle
//   (taming_stopped).
// Constantes : taming.*.
(function(root,factory){
  const history=typeof module!=="undefined"&&module.exports?require("./history.js"):root.MercenairesHistory;
  const api=factory(history);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesTaming=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(History){
  const HALL="trainer_barn";
  const TRANSMISSION="Transmission du savoir";
  const rows=x=>Array.isArray(x)?x:(x?.rows||[]);
  function referenceConstant(reference,code,fallback){
    const value=Number(rows(reference?.formulaConstants).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  // Alignement : (loi, morale) de 0 à 2 ; « Neutre » seul vaut (1, 1).
  const LAW={loyal:0,neutre:1,chaotique:2},MORAL={bon:0,neutre:1,mauvais:2};
  function axes(alignment){
    const words=String(alignment||"").toLocaleLowerCase("fr").trim().split(/\s+/).filter(Boolean);
    if(!words.length) return null;
    const law=LAW[words[0]],moral=words.length>1?MORAL[words[1]]:words[0]==="neutre"?1:undefined;
    return law==null||moral==null?null:{law,moral};
  }
  function alignmentGap(a,b){
    const x=axes(a),y=axes(b);
    if(!x||!y) return 0;
    return Math.abs(x.law-y.law)+Math.abs(x.moral-y.moral);
  }

  // camp : { buildingLevel(state, code), trainerOf(state) (le Dresseur), expeditionOf(state, id), busyElsewhere(state, id) }.
  function createTamingRules({reference,random=Math.random,progression=null,camp={}}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      center:k("taming.daily.center",60),slope:k("taming.daily.slope",10),
      trainerDivisor:k("taming.trainer.divisor",20),masterXp:k("school.training.director_transmission_xp",5)
    };
    const sheets=new Map(rows(reference?.mounts).map(s=>[s.code,s]));
    // La taille d'un peuple : ses places au dortoir, comme en combat (combat-engine.js, canRide).
    const peopleSize=new Map(rows(reference?.peoples).map(p=>[p.nom,Number(p.places_dortoir)||1]));
    const rosterOf=state=>state?.company?.roster||[];
    const memberOf=(state,id)=>rosterOf(state).find(m=>m.id===id)||null;
    const stat=(m,name)=>Number(m?.stats?.[name])||0;
    const intimidation=m=>Number(m?.skills?.social?.Intimidation)||0;
    const animal=(m,name)=>Number(m?.skills?.animal?.[name])||0;
    const no=reason=>({ok:false,reason});
    const roll=()=>random()*100;
    const trainerOf=state=>camp.trainerOf?.(state)||null;

    function tamingsOf(state){
      const c=state.company.camp;
      if(!Array.isArray(c.tamings)) c.tamings=[];
      return c.tamings;
    }
    const tamingById=(state,id)=>tamingsOf(state).find(t=>t.id===id)||null;
    const tamingOf=(state,mercenaryId)=>tamingsOf(state).find(t=>t.studentId===mercenaryId)||null;
    const isPlanned=t=>t?.status==="planned";
    const mountOf=(m,mountId)=>(m?.items||[]).find(i=>i.itemType==="mount"&&String(i.id)===String(mountId))||null;
    const sheetOf=item=>sheets.get(item?.mountCode)||null;
    function busyReason(state,mercenaryId){
      const own=tamingOf(state,mercenaryId);
      if(!own) return null;
      return isPlanned(own)?"Il entre à la Grange du dresseur demain matin.":"Il apprivoise sa monture à la Grange du dresseur.";
    }
    // Ses montures à apprivoiser.
    const untamed=m=>(m?.items||[]).filter(i=>i.itemType==="mount"&&i.tamedBy!==m.id);

    function canTame(state,m,mountId){
      if(!m) return no("Mercenaire introuvable.");
      if(!(camp.buildingLevel?.(state,HALL)>0)) return no("Il faut d’abord construire la Grange du dresseur.");
      const item=mountOf(m,mountId);
      if(!item) return no("Cette monture n’est pas à lui.");
      if(item.tamedBy===m.id) return no("Il l’a déjà apprivoisée.");
      if((peopleSize.get(m.people)||1)>=(Number(sheetOf(item)?.gabarit)||1)) return no("Il est trop grand pour la monter.");
      const expedition=camp.expeditionOf?.(state,m.id);
      if(expedition) return no(expedition.status==="scheduled"?"Il part en mission demain.":"Il est en mission.");
      const busy=busyReason(state,m.id)||camp.busyElsewhere?.(state,m.id);
      if(busy) return no(busy);
      return {ok:true,item};
    }
    function start(state,mercenaryId,mountId){
      const m=memberOf(state,mercenaryId),check=canTame(state,m,mountId);
      if(!check.ok) return check;
      const taming={id:"taming-"+state.day+"-"+m.id,status:"planned",studentId:m.id,mountId:check.item.id,startDay:state.day+1,days:0};
      tamingsOf(state).push(taming);
      return {ok:true,taming,mercenary:m,mount:check.item};
    }

    // Les deux tests du matin : la chance (en %) de chacun, leur produit, et leur détail.
    function dailyChance(state,taming){
      const m=memberOf(state,taming.studentId),item=mountOf(m,taming.mountId),sheet=sheetOf(item);
      const family=sheet?.espece||item?.category||null;
      const own=(stat(m,"Intelligence")+stat(m,"Charisme")+intimidation(m)+animal(m,"Compagnon animal")+(family?animal(m,family):0))/5;
      const trainer=trainerOf(state);
      const trainerBonus=trainer&&trainer!==m?(animal(trainer,"Compagnon animal")+stat(trainer,"Intelligence")+stat(trainer,"Charisme")+intimidation(trainer))/C.trainerDivisor:0;
      const x=own+trainerBonus;
      const skill=100/(1+Math.exp(-(x-C.center)/C.slope));
      const gap=alignmentGap(m?.alignment,sheet?.alignement);
      const excess=Math.max(0,gap-(Number(sheet?.tolerance)||0));
      const stubborn=clamp(((Number(sheet?.caracteristiques?.Intelligence)||0)+(Number(sheet?.caracteristiques?.["Volonté"])||0))/2,0,100);
      const alignment=excess?100*Math.pow((100-stubborn)/100,excess):100;
      return {skill,alignment,chance:skill*alignment/100,x,own,trainerBonus,gap,excess,stubborn};
    }

    // Chaque matin : l'entrée des inscrits de la veille, les deux tests, l'XP du Dresseur.
    function advance(state){
      const list=tamingsOf(state),tamed=[],tested=[],started=[],dropped=[];
      const trainer=trainerOf(state);
      let students=0;
      for(const taming of [...list]){
        const m=memberOf(state,taming.studentId),item=mountOf(m,taming.mountId);
        if(!m||!item||item.tamedBy===m.id){ list.splice(list.indexOf(taming),1); if(m) dropped.push({taming,mercenary:m}); continue; }
        if(isPlanned(taming)){
          if(state.day<Number(taming.startDay)) continue;
          taming.status="active";
          taming.startDay=state.day;
          History?.record?.(m,state.day,"taming",{mount:item.name});
          started.push({taming,mercenary:m,mount:item});
          continue;
        }
        students+=1;
        taming.days+=1;
        const odds=dailyChance(state,taming);
        const skillRoll=roll(),alignmentRoll=odds.excess?roll():null;
        const success=skillRoll<odds.skill&&(alignmentRoll==null||alignmentRoll<odds.alignment);
        tested.push({id:taming.id,studentId:m.id,...odds,skillRoll,alignmentRoll,success});
        if(!success) continue;
        item.tamedBy=m.id;
        list.splice(list.indexOf(taming),1);
        History?.record?.(m,state.day,"taming_done",{mount:item.name,days:taming.days});
        tamed.push({taming,mercenary:m,mount:item,days:taming.days});
      }
      const masterXp=trainer&&students?C.masterXp*students:0;
      if(trainer&&progression&&masterXp>0) progression.apply(trainer,{skills:{camp:{[TRANSMISSION]:masterXp}}});
      return {tamed,tested,started,dropped,masterXp};
    }

    // Le faire sortir (ou annuler son inscription) : rien n'est acquis.
    function stop(state,tamingId){
      const taming=tamingById(state,tamingId);
      if(!taming) return no("Apprivoisement introuvable.");
      const list=tamingsOf(state),m=memberOf(state,taming.studentId),item=mountOf(m,taming.mountId);
      list.splice(list.indexOf(taming),1);
      if(m&&!isPlanned(taming)) History?.record?.(m,state.day,"taming_stopped",{mount:item?.name||""});
      return {ok:true,taming,mercenary:m,cancelled:isPlanned(taming)};
    }

    return {constants:C,HALL,alignmentGap,tamingsOf,tamingById,tamingOf,isPlanned,busyReason,untamed,canTame,start,dailyChance,advance,stop};
  }

  return {createTamingRules,alignmentGap,HALL};
});
