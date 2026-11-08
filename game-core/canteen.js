"use strict";

// La Cantine (Idan, 2026-11-08 : « On ajoute également un autre bâtiment ! La cantine ! On la construit pour 500Po comme les
// autres. On monte le niveau de la cantine (de 1 à 10) qui multiplie l'effet. Niveau 1 : 40. L'effet fait monter l'XP d'une
// carac en fonction du plat que l'on cuisine. Cela touche automatiquement tous les mercenaires au camp (blessé et fatigués
// compris) mais pas ceux à l'exterieur (en mission). On va avoir 10 plats. Chaque peuple commence avec un plat […] A partir
// du niveau 2 du laboratoire d'alchimie, […] le cantinier nous propose de débloquer un nouveau plat. On ne sait pas ce qu'il
// fait avant de l'avoir débloqué. Ensuite, on peut choisir le plat de la cantine » ; « 40 × niveau : oui » ; « prix : oui » ;
// « Débloquage gratuit. Le premier est inclus dans la construction du bâtiment » ; « Perso du décor. En fait, mieux. C'est le
// tavernier. Et c'est pas un bâtiment, mais une salle à la taverne ») :
//
// - une salle de la Taverne (camp-buildings.json, canteen, lieu taverne) : 10 niveaux, 500 × n² PO et jours_base × n jours,
//   comme les autres bâtiments (campaign.js, startBuilding) ;
// - chaque matin, le plat du jour donne canteen.xp_per_level × niveau XP dans sa caractéristique (canteen-dishes.json) à
//   chaque membre présent au camp, blessés, fatigués et prisonniers compris ; pas à ceux qui sont partis (contrat, chasse,
//   garde du corps) ;
// - à l'ouverture, le plat du peuple du capitaine ; puis un nouveau plat par niveau du Labo d'alchimie à partir de
//   canteen.unlock_from_lab_level (2), gratuit : le tavernier en propose un, tiré au hasard parmi les autres, dont on ne
//   connaît que le nom ; une fois goûté (débloqué), son effet est connu et on peut le choisir comme plat du jour.
// L'état : state.company.canteen = { dishes: [codes débloqués], current: code du plat du jour, offer: code proposé | null }.
// Module pur.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesCanteen=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const HALL="canteen";
  const LAB="alchemy_lab";
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }

  // camp : { buildingLevel(state, code), awayOf(state, id) → vrai s'il est parti (contrat, chasse, garde du corps) } ;
  // progression : createProgressionRules(...) (apply).
  function createCanteenRules({reference,camp,progression=null,random=Math.random}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={xpPerLevel:k("canteen.xp_per_level",40),unlockFrom:k("canteen.unlock_from_lab_level",2)};
    const DISHES=(reference?.canteenDishes?.rows||[]).slice();
    const byCode=new Map(DISHES.map(d=>[d.code,d]));
    const rosterOf=state=>state?.company?.roster||[];
    const level=state=>Number(camp?.buildingLevel?.(state,HALL))||0;
    const labLevel=state=>Number(camp?.buildingLevel?.(state,LAB))||0;
    function dishes(){ return DISHES.slice(); }
    function dish(code){ return byCode.get(code)||null; }
    // Le plat du peuple du capitaine (le premier de la liste s'il n'y en a pas).
    function startingDish(state){
      const captain=rosterOf(state).find(m=>m.id===state?.company?.captainId);
      return (DISHES.find(d=>d.peuple===captain?.people)||DISHES[0])?.code||null;
    }
    // L'état de la Cantine, créé à son ouverture (niveau 1) avec le plat du peuple du capitaine ; null avant.
    function canteenOf(state){
      if(!(level(state)>0)) return null;
      const company=state.company;
      if(!company.canteen){
        const first=startingDish(state);
        company.canteen={dishes:first?[first]:[],current:first,offer:null};
      }
      return company.canteen;
    }
    // XP du plat du jour par mercenaire et par jour : xp_per_level × niveau.
    function xpPerDay(state){ return C.xpPerLevel*level(state); }
    // Plats que le Labo permet d'ajouter en plus du premier : un par niveau à partir de unlock_from_lab_level.
    function unlockSlots(state){ return Math.max(0,labLevel(state)-C.unlockFrom+1); }
    function lockedDishes(state){
      const c=canteenOf(state);
      return c?DISHES.filter(d=>!c.dishes.includes(d.code)):[];
    }
    // La proposition du tavernier : un plat encore inconnu, tiré au hasard une fois puis gardé jusqu'à ce qu'on le goûte ;
    // null s'il n'y a pas de place (Labo) ou plus de plat.
    function offer(state){
      const c=canteenOf(state);
      if(!c) return null;
      if(c.dishes.length-1>=unlockSlots(state)) return null;
      const locked=lockedDishes(state);
      if(!locked.length) return null;
      if(!c.offer||c.dishes.includes(c.offer)||!byCode.has(c.offer)) c.offer=locked[Math.floor(random()*locked.length)].code;
      return dish(c.offer);
    }
    // Goûter le plat proposé : il est débloqué (gratuit), son effet est connu ; le plat du jour ne change pas.
    function unlock(state){
      const proposed=offer(state);
      if(!proposed) return {ok:false,reason:canteenOf(state)?"Le tavernier n’a pas de nouveau plat à proposer.":"La Cantine n’est pas encore ouverte."};
      const c=canteenOf(state);
      c.dishes.push(proposed.code);
      c.offer=null;
      return {ok:true,dish:proposed};
    }
    // Choisir le plat du jour parmi les plats débloqués.
    function setDish(state,code){
      const c=canteenOf(state);
      if(!c) return {ok:false,reason:"La Cantine n’est pas encore ouverte."};
      if(!c.dishes.includes(code)) return {ok:false,reason:"Ce plat n’est pas encore au menu."};
      c.current=code;
      return {ok:true,dish:dish(code)};
    }
    // Le matin : chaque membre présent au camp mange le plat du jour. Rapport : { dish, xp, eaters: [{ id, changes }] }.
    function morning(state){
      const c=canteenOf(state),served=c?dish(c.current):null,xp=xpPerDay(state);
      if(!served||!(xp>0)||!progression) return null;
      const eaters=[];
      for(const m of rosterOf(state)){
        if(camp?.awayOf?.(state,m.id)) continue;
        if(!m.stats||!(served.caracteristique in m.stats)) continue;
        const changes=progression.apply(m,{stats:{[served.caracteristique]:xp}});
        eaters.push({id:m.id,changes});
      }
      return {dish:served,xp,eaters};
    }
    return {HALL,LAB,constants:C,dishes,dish,startingDish,canteenOf,level,xpPerDay,unlockSlots,lockedDishes,offer,unlock,setDish,morning};
  }

  return {createCanteenRules,HALL,LAB};
});
