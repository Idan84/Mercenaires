"use strict";

// Le Cachot (Idan, 2026-11-04 : « On va créer un bâtiment "Le cachot". Avec 10 niveaux et un nombre de places par niveau. Un
// mercenaire qui refuse après test inti ou charisme peut aller au cachot. L'affinité va forcément en prendre un coup…
// Surtout qu'au cachot, on n'a pas de salaire… D'ailleurs le capitaine peut envoyer n'importe qui au cachot » ; « Parfait
// pour tout. Non l'affinité ne revient pas après ») :
//
// - 1 cellule par niveau (camp.dungeon.cells_per_level) ;
// - n'importe quel membre, sauf le capitaine et ceux qui partent ou sont partis en mission ; tout de suite, jusqu'à ce
//   qu'on le libère ; il garde son lit au dortoir ;
// - il perd son poste (intendant, médecin, directeur, maître, lieutenant), quitte sa corvée et son apprentissage
//   (camp.leave, campaign.js) ;
// - affinité −10 en y entrant (camp.dungeon.entry_affinity), puis −2 chaque matin (camp.dungeon.daily_affinity) ; elle ne
//   revient pas à la libération ;
// - pas de salaire ; ni mission, ni garde du corps, ni entraînement, ni corvée, ni apprentissage, ni poste (l'agenda).
// L'état : m.dungeon = { since } sur le mercenaire. Module pur.
(function(root,factory){
  const history=typeof module!=="undefined"&&module.exports?require("./history.js"):root.MercenairesHistory;
  const api=factory(history);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesDungeon=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(History){
  const HALL="dungeon";
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  // Au cachot ? (les autres modules le regardent directement : intendant, médecin, maîtres, lieutenant.)
  const isJailed=m=>Boolean(m?.dungeon);

  // camp : { buildingLevel(state, code), expeditionOf(state, id), leave(state, m) → il quitte poste, corvée, apprentissage }.
  function createDungeonRules({reference,camp}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      perLevel:k("camp.dungeon.cells_per_level",1),
      entry:k("camp.dungeon.entry_affinity",-10),
      daily:k("camp.dungeon.daily_affinity",-2)
    };
    const rosterOf=state=>state?.company?.roster||[];
    const memberOf=(state,id)=>rosterOf(state).find(m=>m.id===id)||null;
    const no=reason=>({ok:false,reason});
    const shift=(m,delta)=>{ m.affinityAcquired=(Number(m.affinityAcquired)||0)+delta; return delta; };

    const cells=state=>Math.max(0,(Number(camp.buildingLevel(state,HALL))||0)*C.perLevel);
    const prisoners=state=>rosterOf(state).filter(isJailed);
    // Pour l'agenda : au cachot, aujourd'hui comme demain.
    const busyReason=(state,mercenaryId)=>isJailed(memberOf(state,mercenaryId))?"Il est au cachot.":null;

    function canJail(state,m){
      if(!m) return no("Mercenaire introuvable.");
      if(!(cells(state)>0)) return no("Il faut d’abord construire le Cachot.");
      if(m.id===state.company.captainId) return no("Le capitaine n’ira pas au cachot.");
      if(isJailed(m)) return no("Il est déjà au cachot.");
      const expedition=camp.expeditionOf(state,m.id);
      if(expedition) return no(expedition.status==="scheduled"?"Il part en mission demain.":"Il est en mission.");
      if(prisoners(state).length>=cells(state)) return no("Le Cachot est plein.");
      return {ok:true};
    }
    // Au cachot, tout de suite : il quitte poste, corvée et apprentissage ; affinité −10.
    function jail(state,mercenaryId){
      const m=memberOf(state,mercenaryId);
      const check=canJail(state,m);
      if(!check.ok) return check;
      const left=camp.leave?camp.leave(state,m):[];
      m.dungeon={since:state.day};
      const affinityDelta=shift(m,C.entry);
      History?.record(m,state.day,"dungeon",{});
      return {ok:true,mercenary:m,affinityDelta,left};
    }
    // Le libérer : il reprend sa place dans la compagnie ; l'affinité perdue ne revient pas.
    function release(state,mercenaryId){
      const m=memberOf(state,mercenaryId);
      if(!isJailed(m)) return no("Il n’est pas au cachot.");
      const days=Math.max(0,state.day-(Number(m.dungeon.since)||state.day));
      delete m.dungeon;
      History?.record(m,state.day,"dungeon_release",{days});
      return {ok:true,mercenary:m,days};
    }
    // Chaque matin : −2 d'affinité pour chacun.
    function morning(state){
      return prisoners(state).map(m=>({id:m.id,mercenary:m,affinityDelta:shift(m,C.daily)}));
    }
    const daysIn=(state,m)=>isJailed(m)?Math.max(0,state.day-(Number(m.dungeon.since)||state.day)):0;

    return {constants:C,HALL,cells,prisoners,isJailed,busyReason,canJail,jail,release,morning,daysIn};
  }

  return {createDungeonRules,HALL,isJailed};
});
