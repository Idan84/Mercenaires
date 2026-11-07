"use strict";

// Les Écuries (Idan, 2026-11-07 : « On ajoute des montures aux ennemis. La monture est mise KO au combat. En fonction du type
// de monture, elle est capturable ou non. Pour chaque monture, on fait test de survie. Si elle survit et qu'on a de la place,
// elle est stockée dans l'enclos. » ; « On peut déjà créer un premier bâtiment, la grange du dresseur » ; « des salles qui
// permettent de stocker des montures. Commençons par écuries » ; « Avec les niveaux, on augmente le nombre de places » ;
// « Un animal aura un coût d'entretien » ; « On peut donc acheter et vendre des chevaux comme les autres biens » ;
// « On ne peut vendre un animal que s'il n'appartient pas à un mercenaire, comme les autres Items ») :
//
// - une monture est un objet (itemType « mount », mounts.json) : sans propriétaire, au stock de l'Intendance ; donnée à un
//   mercenaire, dans ses objets ; où qu'elle soit, elle loge aux Écuries ;
// - la Grange du dresseur (trainer_barn, 10 niveaux) et son aile les Écuries (trainer_stables, au plus au niveau de la
//   Grange) : places = places_par_niveau (2) × niveau des Écuries (camp-buildings.json) ; un achat ou une capture demande
//   une place libre ;
// - capture : après une victoire, chaque monture capturable restée KO sur la carte passe le jet de mort de nos mercenaires
//   (doc 10 §3, mission-end.js : à 0 PV ou plus, elle survit) ; une monture partie avec son cavalier n'est pas prise ;
//   après un contrat, elle rentre avec l'escouade (la place se juge à l'arrivée) ;
// - entretien : chaque matin, entretien (PO, mounts.json) par monture ; « Relâcher » (sans propriétaire) libère sa place ;
// - nos montures au combat (Idan, 2026-11-07 : « La monture peut mourir indépendamment du cavalier ou être blessée en fin de
//   mission. Si le cavalier meurt, elle repart dans l'enclos et peut être attribuée à un autre mercenaire. Globalement, elle
//   a la même fiche qu'un mercenaire. ») : la chaîne de fin de mission de nos mercenaires (mort → blessure → fatigue,
//   mission-end.js), puis le repos (item.recovery, un jour de moins chaque matin) ; au repos, elle ne part pas en mission ;
//   son cavalier mort, elle retourne à l'Intendance, sans propriétaire (un autre devra l'apprivoiser).
// Module pur ; makeItem(type, nom) fabrique l'objet (le générateur).
(function(root,factory){
  // Le jet de mort (mission-end.js) : lu au moment de créer les règles, le script peut se charger après celui-ci.
  const end=()=>typeof module!=="undefined"&&module.exports?require("./mission-end.js"):root.MercenairesMissionEnd;
  const api=factory(end);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesStables=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(missionEnd){
  const BARN="trainer_barn",STABLES="trainer_stables";
  const rows=x=>Array.isArray(x)?x:(x?.rows||[]);
  const isMount=item=>item?.itemType==="mount";

  function createStableRules({reference,random=Math.random,camp={},makeItem=null}={}){
    const sheets=new Map(rows(reference?.mounts).map(s=>[s.code,s]));
    const stablesRow=rows(reference?.campBuildings).find(r=>r.code===STABLES)||null;
    const MissionEnd=missionEnd();
    const endRules=MissionEnd?MissionEnd.createMissionEndRules({reference,random}):null;
    const d100=()=>Math.floor(random()*100)+1;
    const levelOf=(state,code)=>typeof camp.buildingLevel==="function"?camp.buildingLevel(state,code):Number(state?.company?.camp?.buildings?.[code]?.level)||0;

    function sheet(code){ return sheets.get(code)||null; }
    function sheetOf(item){ return sheet(item?.mountCode); }
    // Toutes les montures de la compagnie : celles de l'Intendance, puis celles des mercenaires (avec leur propriétaire).
    function mountsOf(state){
      const company=state.company;
      const stock=(company.stock||[]).filter(isMount);
      const owned=(company.roster||[]).flatMap(m=>(m.items||[]).filter(isMount));
      return [...stock,...owned];
    }
    function ownerOf(state,item){ return item?.owner==null?null:(state.company.roster||[]).find(m=>m.id===item.owner)||null; }
    function places(state){ return (Number(stablesRow?.places_par_niveau)||0)*levelOf(state,STABLES); }
    function free(state){ return Math.max(0,places(state)-mountsOf(state).length); }
    // Un objet qui demande une place aux Écuries (un achat chez un marchand) : {ok, reason}.
    function canStore(state,item){
      if(!isMount(item)) return {ok:true};
      return free(state)>0?{ok:true}:{ok:false,reason:places(state)?"Pas de place aux Écuries.":"Il faut d’abord des Écuries (à la Grange du dresseur)."};
    }
    function upkeepOf(item){ return Number(sheetOf(item)?.entretien)||0; }
    function upkeep(state){ return mountsOf(state).reduce((sum,m)=>sum+upkeepOf(m),0); }

    // Chaque matin : l'entretien des montures, comme les salaires (l'or peut passer sous 0).
    function payUpkeep(state){
      const total=upkeep(state);
      if(total) state.company.gold-=total;
      return {total,count:mountsOf(state).length};
    }

    // Le test de survie d'une monture tombée : le jet de mort de nos mercenaires (pDeath null : à 0 PV ou plus, elle vit).
    function rollSurvival({hp,pvMax,stats}={}){
      const p=endRules?endRules.deathChance({hp:Number(hp)||0,pvMax:Number(pvMax)||1,stats:stats||{}}):null;
      if(p==null) return {survives:true,pDeath:0,roll:null};
      const roll=d100();
      return {survives:roll>p,pDeath:p,roll};
    }
    function capturable(code){ return Boolean(sheet(code))&&sheet(code).capturable!==false; }

    // Arrivée de montures capturées ({code, origin}) : une place chacune, à l'Intendance ; sans place, elle est relâchée.
    function admit(state,captured=[],{day=state.day}={}){
      const kept=[],released=[];
      for(const c of captured||[]){
        const s=sheet(c?.code);
        if(!s) continue;
        if(free(state)<=0){ released.push(c); continue; }
        const item=typeof makeItem==="function"?makeItem("mount",s.nom):null;
        if(!item){ released.push(c); continue; }
        Object.assign(item,{owner:null,origin:c.origin||null,day});
        if(!Array.isArray(state.company.stock)) state.company.stock=[];
        state.company.stock.push(item);
        kept.push(item);
      }
      return {kept,released};
    }
    // Relâcher une monture de l'Intendance (pas celle d'un mercenaire).
    function release(state,id){
      const stock=state.company.stock||[],item=stock.find(i=>isMount(i)&&String(i.id)===String(id));
      if(!item){
        const owned=mountsOf(state).find(i=>String(i.id)===String(id));
        return {ok:false,reason:owned?"Elle appartient à "+(ownerOf(state,owned)?.name||"un mercenaire")+".":"Monture introuvable."};
      }
      state.company.stock=stock.filter(i=>i!==item);
      return {ok:true,mount:item};
    }

    // Fin de mission de nos montures : results de resolveMissionEnd (id = celui de l'objet monture) ; days : les durées au
    // camp (Dispensaire, médecin, bains chauds), comme pour nos mercenaires.
    const mountById=(state,id)=>mountsOf(state).find(i=>String(i.id)===String(id))||null;
    function remove(state,item){
      const company=state.company;
      company.stock=(company.stock||[]).filter(i=>i!==item);
      for(const m of company.roster||[]){
        if(!(m.items||[]).includes(item)) continue;
        m.items=m.items.filter(i=>i!==item);
        for(const [slot,id] of Object.entries(m.equipment?.slots||{})) if(String(id)===String(item.id)) m.equipment.slots[slot]=null;
      }
    }
    function applyAftermath(state,results=[],{woundDays=d=>d,fatigueDays=d=>d}={}){
      const report={dead:[],wounded:[],fatigued:[]};
      for(const r of results||[]){
        const item=mountById(state,r.id);
        if(!item) continue;
        if(r.dead){ remove(state,item); report.dead.push(item); continue; }
        item.recovery=r.wounded?{kind:"wounded",daysLeft:woundDays(r.woundDays),sinceDay:state.day}
          :{kind:"fatigued",daysLeft:fatigueDays(r.fatigueDays),sinceDay:state.day};
        report[r.wounded?"wounded":"fatigued"].push(item);
      }
      return report;
    }
    // Chaque matin : un jour de repos de moins.
    function recoverOneDay(state){
      const recovered=[];
      for(const item of mountsOf(state)){
        if(!item.recovery) continue;
        item.recovery.daysLeft-=1;
        if(item.recovery.daysLeft>0) continue;
        recovered.push({mount:item,kind:item.recovery.kind,owner:ownerOf(state,item)});
        delete item.recovery;
      }
      return recovered;
    }
    // Son cavalier mort : ses montures retournent à l'Intendance, sans propriétaire.
    function returnToStable(state,m){
      const mounts=(m?.items||[]).filter(isMount);
      if(!mounts.length) return [];
      for(const item of mounts) remove(state,item);
      const back=mounts.map(item=>({...item,owner:null,slot:null}));
      if(!Array.isArray(state.company.stock)) state.company.stock=[];
      state.company.stock.push(...back);
      return back;
    }

    return {BARN,STABLES,sheet,sheetOf,isMount,mountsOf,ownerOf,places,free,canStore,upkeepOf,upkeep,payUpkeep,rollSurvival,capturable,admit,release,
      applyAftermath,recoverOneDay,returnToStable};
  }

  return {createStableRules,BARN,STABLES,isMount};
});
