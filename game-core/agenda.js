"use strict";

// L'agenda d'un mercenaire au camp (refonte technique, Idan, 2026-11-04 : « Ok pour A ») : une seule liste des activités qui
// le retiennent au camp — les apprentissages (sort, port d'armure, empoisonnement) et les corvées (bûcheron, mineur) — au
// lieu de relier chaque activité à toutes les autres. Aucune règle ne change :
//
// - chaque activité est inscrite une fois (add), avec busyReason(state, id) → raison (aujourd'hui ou demain) ou null ;
// - une activité demande à l'agenda ce qui le retient ailleurs (elsewhere) : toutes les autres, dans l'ordre d'inscription ;
// - une corvée ne regarde les autres corvées que pour demain (tomorrowReason) : bûcheron aujourd'hui, mineur demain, c'est
//   possible ; une seule corvée par jour ;
// - reason(state, id) : ce qui le retient, toutes activités confondues (missions, garde du corps, entraînement libre).
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
    // Pour l'activité « key » : ce qui le retient ailleurs, ou null.
    function elsewhere(key,state,mercenaryId){
      const chore=entries.find(e=>e.key===key)?.chore;
      for(const e of entries){
        if(e.key===key) continue;
        const r=chore&&e.chore?e.rules.tomorrowReason(state,mercenaryId):e.rules.busyReason(state,mercenaryId);
        if(r) return r;
      }
      return null;
    }
    const keys=()=>entries.map(e=>e.key);
    const api={add,entryOf,reason,elsewhere,keys};
    return api;
  }
  return {createAgenda};
});
