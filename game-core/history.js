"use strict";

// Historique d'un mercenaire (Idan, 2026-10-24) : « tout ce qui concerne le mercenaire, aussi bien en journal qu'en
// stats accumulées ». Compteurs cumulés (missions, adversaires abattus, retours blessé, coups encaissés, critiques) et
// journal de faits datés. Le journal garde des faits (jour, nature, données), pas du texte : l'interface les raconte
// (character-sheet-copy.json, history).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesHistory=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const COUNTERS=["missions","knockouts","timesWounded","woundsTaken","criticals","stewardDays","medicDays"];

  // since : jour d'arrivée dans la compagnie.
  function historyOf(mercenary,since=1){
    const history=mercenary.history||(mercenary.history={since,log:[]});
    for(const key of COUNTERS) if(!Number.isFinite(history[key])) history[key]=0;
    if(!Array.isArray(history.log)) history.log=[];
    return history;
  }

  function record(mercenary,day,kind,data={}){
    historyOf(mercenary,day).log.push({day,kind,...data});
  }

  // Retour de mission : progress est le journal de combat (progression.js) ; days, la convalescence ou le repos.
  function recordMission(mercenary,day,{progress=null,wounded=false,days=0}={}){
    const history=historyOf(mercenary);
    const knockouts=Number(progress?.knockouts)||0;
    history.missions+=1;
    history.knockouts+=knockouts;
    history.woundsTaken+=Number(progress?.woundsTaken)||0;
    history.criticals+=Number(progress?.criticalSuccesses)||0;
    if(wounded) history.timesWounded+=1;
    history.log.push({day,kind:"mission",knockouts,wounded:Boolean(wounded),days:Number(days)||0});
  }

  // Jours passés dans la compagnie (0 le jour de l'arrivée).
  function daysInCompany(mercenary,day){
    const since=Number(mercenary?.history?.since??mercenary?.contract?.signedDay??1);
    return Math.max(0,(Number(day)||since)-since);
  }

  return {COUNTERS,historyOf,record,recordMission,daysInCompany};
});
