"use strict";

// L'agenda d'un mercenaire au camp (refonte technique, Idan, 2026-11-04 : « Ok pour A ») : une seule liste des activités qui
// le retiennent au camp — les apprentissages (sort, port d'armure, empoisonnement) et les corvées (bûcheron, mineur) — au
// lieu de relier chaque activité à toutes les autres (la refonte n'a changé aucune règle ; depuis, une corvée d'aujourd'hui
// n'empêche plus d'organiser demain) :
//
// - chaque activité est inscrite une fois (add), avec busyReason(state, id) → raison (aujourd'hui ou demain) ou null ;
// - une activité demande à l'agenda ce qui le retient ailleurs (elsewhere) : toutes les autres, dans l'ordre d'inscription ;
// - tomorrowReason(state, id) : ce qui le retient demain, pour organiser J+1 (apprentissage, mission, garde du corps,
//   corvée) ; une corvée y compte par son propre tomorrowReason : elle dure jusqu'à ce qu'on le retire, et une fois retiré,
//   il est libre le lendemain (Idan, 2026-11-04 : « Oui ») ; une seule corvée à la fois ;
// - reason(state, id) : ce qui le retient, aujourd'hui ou demain, toutes activités confondues (l'entraînement libre du jour).
//
// Les postes (intendant, médecin, maîtres…), les missions et les blessures restent vérifiés à part, comme avant.
// Ajouter une activité : une ligne add() dans campaign.js. Module pur (portage Unreal : un tableau d'activités).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesAgenda=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function createAgenda(){
    const entries=[];
    // rules : { busyReason(state, id), tomorrowReason(state, id) pour une corvée } ; ignoré s'il manque (module absent).
    function add(key,rules,{chore=false}={}){
      if(rules&&typeof rules.busyReason==="function") entries.push({key,rules,chore:Boolean(chore)});
      return api;
    }
    // La première activité qui le retient : {key, reason} ou null.
    function entryOf(state,mercenaryId){
      for(const e of entries){
        const reason=e.rules.busyReason(state,mercenaryId);
        if(reason) return {key:e.key,reason};
      }
      return null;
    }
    const reason=(state,mercenaryId)=>entryOf(state,mercenaryId)?.reason||null;
    // Ce qui le retient demain (sauf l'activité « except », celle qui demande), ou null.
    function tomorrowReason(state,mercenaryId,except=null){
      for(const e of entries){
        if(e.key===except) continue;
        const r=e.chore?e.rules.tomorrowReason(state,mercenaryId):e.rules.busyReason(state,mercenaryId);
        if(r) return r;
      }
      return null;
    }
    // Pour l'activité « key » : ce qui le retient ailleurs demain, ou null.
    const elsewhere=(key,state,mercenaryId)=>tomorrowReason(state,mercenaryId,key);
    const keys=()=>entries.map(e=>e.key);
    const api={add,entryOf,reason,tomorrowReason,elsewhere,keys};
    return api;
  }
  return {createAgenda};
});
