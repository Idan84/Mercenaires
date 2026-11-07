"use strict";

// Les Écuries (Idan, 2026-11-07 : « On ajoute des montures aux ennemis. La monture est mise KO au combat. En fonction du type
// de monture, elle est capturable ou non. Pour chaque monture, on fait test de survie. Si elle survit et qu'on a de la place,
// elle est stockée dans l'enclos. » ; « On peut déjà créer un premier bâtiment, la grange du dresseur » ; « des salles qui
// permettent de stocker des montures. Commençons par écuries » ; « Avec les niveaux, on augmente le nombre de places » ;
// « Un animal aura un coût d'entretien » ; « Tout est validé ! ») :
//
// - la Grange du dresseur (trainer_barn, 10 niveaux) et son aile les Écuries (trainer_stables, au plus au niveau de la
//   Grange) : places = places_par_niveau (2) × niveau des Écuries (camp-buildings.json) ;
// - capture : après une victoire, chaque monture capturable restée KO sur la carte passe le jet de mort de nos mercenaires
//   (doc 10 §3, mission-end.js : à 0 PV ou plus, elle survit) ; une monture partie avec son cavalier n'est pas prise ;
// - arrivée : elle entre aux Écuries s'il reste une place, sinon elle est relâchée ; après un contrat, elle rentre avec
//   l'escouade (la place se juge à l'arrivée) ;
// - entretien : chaque matin, entretien (PO, mounts.json) par monture ; « Relâcher » libère sa place.
// L'état : company.stable = [{ id, code, name, day, origin }]. Module pur.
(function(root,factory){
  // Le jet de mort (mission-end.js) : lu au moment de créer les règles, le script peut se charger après celui-ci.
  const end=()=>typeof module!=="undefined"&&module.exports?require("./mission-end.js"):root.MercenairesMissionEnd;
  const api=factory(end);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesStables=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(missionEnd){
  const BARN="trainer_barn",STABLES="trainer_stables";
  const rows=x=>Array.isArray(x)?x:(x?.rows||[]);

  function createStableRules({reference,random=Math.random,camp={}}={}){
    const sheets=new Map(rows(reference?.mounts).map(s=>[s.code,s]));
    const stablesRow=rows(reference?.campBuildings).find(r=>r.code===STABLES)||null;
    const MissionEnd=missionEnd();
    const endRules=MissionEnd?MissionEnd.createMissionEndRules({reference,random}):null;
    const d100=()=>Math.floor(random()*100)+1;
    const levelOf=(state,code)=>typeof camp.buildingLevel==="function"?camp.buildingLevel(state,code):Number(state?.company?.camp?.buildings?.[code]?.level)||0;

    function sheet(code){ return sheets.get(code)||null; }
    function mountsOf(state){ return state.company.stable||(state.company.stable=[]); }
    function places(state){ return (Number(stablesRow?.places_par_niveau)||0)*levelOf(state,STABLES); }
    function free(state){ return Math.max(0,places(state)-mountsOf(state).length); }
    function upkeepOf(mount){ return Number(sheet(mount?.code)?.entretien)||0; }
    function upkeep(state){ return mountsOf(state).reduce((sum,m)=>sum+upkeepOf(m),0); }

    // Chaque matin : l'entretien des montures, comme les salaires (l'or peut passer sous 0).
    function payUpkeep(state){
      const list=mountsOf(state),total=upkeep(state);
      if(total) state.company.gold-=total;
      return {total,count:list.length};
    }

    // Le test de survie d'une monture tombée : le jet de mort de nos mercenaires (pDeath null : à 0 PV ou plus, elle vit).
    function rollSurvival({hp,pvMax,stats}={}){
      const p=endRules?endRules.deathChance({hp:Number(hp)||0,pvMax:Number(pvMax)||1,stats:stats||{}}):null;
      if(p==null) return {survives:true,pDeath:0,roll:null};
      const roll=d100();
      return {survives:roll>p,pDeath:p,roll};
    }
    function capturable(code){ return sheet(code)?.capturable!==false&&Boolean(sheet(code)); }

    // Arrivée de montures capturées : une place chacune ; sans place, elle est relâchée.
    function admit(state,captured=[],{day=state.day}={}){
      const kept=[],released=[];
      for(const c of captured||[]){
        if(!sheet(c?.code)) continue;
        if(free(state)<=0){ released.push(c); continue; }
        state.company.stableSeq=(Number(state.company.stableSeq)||0)+1;
        const mount={id:"mount-"+state.company.stableSeq,code:c.code,name:c.name||sheet(c.code).nom,day,origin:c.origin||null};
        mountsOf(state).push(mount);
        kept.push(mount);
      }
      return {kept,released};
    }
    function release(state,id){
      const list=mountsOf(state),i=list.findIndex(m=>String(m.id)===String(id));
      if(i<0) return {ok:false,reason:"Monture introuvable."};
      const [mount]=list.splice(i,1);
      return {ok:true,mount};
    }

    return {BARN,STABLES,sheet,mountsOf,places,free,upkeepOf,upkeep,payUpkeep,rollSurvival,capturable,admit,release};
  }

  return {createStableRules,BARN,STABLES};
});
