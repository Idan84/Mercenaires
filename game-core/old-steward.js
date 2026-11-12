"use strict";

// Cruxor Limortel, l'ancien intendant (Idan, 2026-11-12) : « un vieux qui était intendant avant le nouveau capitaine,
// qui veut juste partir à la retraite, et qui demande en permanence à être remplacé. Il a 10 d'intendance et il est là
// par défaut. »
// - Il fait tout ce que fait un intendant (estimations à la Taverne, appui des échanges et des apprentissages, prix des
//   marchands, tags), avec son Intendance (old-steward.json, intendance).
// - Ce n'est pas un mercenaire : ni salaire, ni place au dortoir, ni fiche, ni mission. Il n'est pas dans la compagnie
//   (company.oldSteward : depuis quand, et le jour de son départ).
// - L'affinité d'un mercenaire envers lui : exactement celle qu'il a pour le capitaine (Idan : « B »).
// - Dès qu'un mercenaire devient intendant, il part pour de bon (« Il part pour de bon… il ira s'asseoir dans la
//   taverne », plus tard).
// Données : data/reference/old-steward.json. Interface : prototype-web/steward-ui.js.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesOldSteward=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const ID="cruxor";
  const num=(v,f=0)=>{ const n=Number(v); return Number.isFinite(n)?n:f; };
  const rosterOf=state=>state?.company?.roster||[];
  const captainOf=state=>rosterOf(state).find(m=>m.id===state?.company?.captainId)||null;

  function createOldSteward({reference}={}){
    const D=reference?.oldSteward||{};
    // Au début d'une partie : il est là.
    const start=day=>({since:num(day,1),retiredDay:null});
    // Il tient l'Intendance tant qu'il n'est pas parti et qu'aucun mercenaire n'est intendant.
    const present=state=>{
      const old=state?.company?.oldSteward;
      return Boolean(old&&old.retiredDay==null&&state.company.intendantId==null);
    };
    // Lui, comme un intendant (ce que lisent les règles : son nom, son Intendance).
    function person(state){
      if(!present(state)) return null;
      return {id:ID,npc:true,name:D.nom||"Cruxor Limortel",sex:D.sexe||"M",portrait:D.portrait||null,
        skills:{camp:{Intendance:num(D.intendance,10)}},stats:{},resistances:{}};
    }
    // L'intendant de la compagnie : le mercenaire nommé, sinon lui.
    function stewardOf(state){
      const id=state?.company?.intendantId;
      if(id!=null) return rosterOf(state).find(m=>m.id===id)||null;
      return person(state);
    }
    const isOld=steward=>Boolean(steward?.npc&&steward.id===ID);
    // L'affinité d'un mercenaire envers l'intendant : envers lui, celle qu'il a pour le capitaine (acquis compris) ;
    // envers un mercenaire, la règle de toujours (peuple, culture, alignement). affinity : affinity.js.
    function feeling(state,steward,m,affinity){
      if(!steward||!m||!affinity) return 0;
      if(isOld(steward)) return num(affinity.memberAffinity?.(captainOf(state),m)?.total);
      return num(affinity.affinity?.(steward,m)?.total);
    }
    // Un mercenaire devient intendant : il part pour de bon. true s'il vient de partir.
    function retire(state){
      const old=state?.company?.oldSteward;
      if(!old||old.retiredDay!=null) return false;
      old.retiredDay=num(state.day,1);
      return true;
    }
    const retired=state=>state?.company?.oldSteward?.retiredDay!=null;
    return {ID,copy:D,start,present,person,stewardOf,isOld,feeling,retire,retired};
  }

  return {ID,createOldSteward};
});
