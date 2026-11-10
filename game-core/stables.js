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
// - entretien : chaque matin, entretien (PO, mounts.json) par monture, payé avec les salaires (impayé : debts.js) ;
//   « Relâcher » (sans propriétaire) libère sa place ;
// - nos montures au combat (Idan, 2026-11-07 : « La monture peut mourir indépendamment du cavalier ou être blessée en fin de
//   mission. Si le cavalier meurt, elle repart dans l'enclos et peut être attribuée à un autre mercenaire. Globalement, elle
//   a la même fiche qu'un mercenaire. ») : la chaîne de fin de mission de nos mercenaires (mort → blessure → fatigue,
//   mission-end.js), puis le repos (item.recovery, un jour de moins chaque matin) ; au repos, elle ne part pas en mission ;
//   son cavalier mort, elle retourne à l'Intendance, sans propriétaire (un autre devra l'apprivoiser) ;
// - sa fiche à elle (item.sheet : caractéristiques, résistances, compétences, sorts, XP, mana), créée depuis mounts.json
//   la première fois qu'on en a besoin : elle progresse avec l'XP de ses combats et garde son mana d'un combat à l'autre
//   (Idan, 2026-11-07 : « Mana de la licorne + xp licorne »), comme un mercenaire ;
// - son nom (Idan, 2026-11-07 : « à la capture ou à l'achat de l'animal, on lui attribue un nom ») : un nom de sa liste
//   (animal-names.json) qu'aucun autre de nos animaux ne porte (item.petName) ; le joueur le renomme librement ;
// - son logement (mounts.json, logement ; Idan, 2026-11-07 : « Il loge au chenil ») : les Écuries pour les chevaux et la
//   licorne, le Chenil (trainer_kennel, l'autre aile de la Grange, 2 places par niveau) pour le loup ; chacun ses places.
// Module pur ; makeItem(type, nom) fabrique l'objet (le générateur).
(function(root,factory){
  // Le jet de mort (mission-end.js) : lu au moment de créer les règles, le script peut se charger après celui-ci.
  const end=()=>typeof module!=="undefined"&&module.exports?require("./mission-end.js"):root.MercenairesMissionEnd;
  const api=factory(end);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesStables=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(missionEnd){
  // La Serre (Idan, 2026-11-09 : « J'ai envie de faire les papillons ! ») : la troisième aile, pour les papillons.
  const BARN="trainer_barn",STABLES="trainer_stables",KENNEL="trainer_kennel",GREENHOUSE="trainer_greenhouse";
  // Les logements : leurs mots dans les phrases (« Pas de place au Chenil. »).
  const HOUSE_WORDS={
    [STABLES]:{the:"les Écuries",at:"aux Écuries",need:"des Écuries"},
    [KENNEL]:{the:"le Chenil",at:"au Chenil",need:"un Chenil"},
    [GREENHOUSE]:{the:"la Serre",at:"à la Serre",need:"une Serre"}
  };
  const houseWords=code=>HOUSE_WORDS[code]||HOUSE_WORDS[STABLES];
  const rows=x=>Array.isArray(x)?x:(x?.rows||[]);
  const isMount=item=>item?.itemType==="mount";
  // Un nom choisi par le joueur : sans caractères de contrôle, espaces réduits, 40 caractères au plus.
  const cleanName=name=>String(name??"").replace(/[\u0000-\u001f\u007f]/g,"").replace(/\s+/g," ").trim().slice(0,40);

  function createStableRules({reference,random=Math.random,camp={},makeItem=null}={}){
    const sheets=new Map(rows(reference?.mounts).map(s=>[s.code,s]));
    const spellRows=new Map(rows(reference?.spells).map(s=>[s.code,s]));
    const namesByCode=new Map(rows(reference?.animalNames).map(r=>[r.code,r.noms||[]]));
    const houseRows=new Map(rows(reference?.campBuildings).filter(r=>r.code in HOUSE_WORDS).map(r=>[r.code,r]));
    const MissionEnd=missionEnd();
    const endRules=MissionEnd?MissionEnd.createMissionEndRules({reference,random}):null;
    const d100=()=>Math.floor(random()*100)+1;
    const levelOf=(state,code)=>typeof camp.buildingLevel==="function"?camp.buildingLevel(state,code):Number(state?.company?.camp?.buildings?.[code]?.level)||0;

    const peopleSize=new Map(rows(reference?.peoples).map(p=>[p.nom,Number(p.places_dortoir)||1]));
    function sheet(code){ return sheets.get(code)||null; }
    // Peut-il la monter ? Plus petit qu'elle (gabarit : les places du dortoir de son peuple ; combat-engine.js, canRide).
    function rides(mercenary,item){ return (peopleSize.get(mercenary?.people)||1)<(Number(sheetOf(item)?.gabarit)||1); }
    function sheetOf(item){ return sheet(item?.mountCode); }
    // Toutes les montures de la compagnie : celles de l'Intendance, puis celles des mercenaires (avec leur propriétaire).
    function mountsOf(state){
      const company=state.company;
      const stock=(company.stock||[]).filter(isMount);
      const owned=(company.roster||[]).flatMap(m=>(m.items||[]).filter(isMount));
      return [...stock,...owned];
    }
    function ownerOf(state,item){ return item?.owner==null?null:(state.company.roster||[]).find(m=>m.id===item.owner)||null; }
    // Son logement (un objet monture, ou le code d'un animal) : les Écuries, ou le Chenil pour le loup.
    function houseOf(itemOrCode){
      const s=typeof itemOrCode==="string"?sheet(itemOrCode):sheetOf(itemOrCode);
      return s?.logement&&s.logement in HOUSE_WORDS?s.logement:STABLES;
    }
    function places(state,house=STABLES){ return (Number(houseRows.get(house)?.places_par_niveau)||0)*levelOf(state,house); }
    function mountsIn(state,house=STABLES){ return mountsOf(state).filter(i=>houseOf(i)===house); }
    // Sa place (mounts.json, place ; 1 par défaut) : le molosse n'en prend qu'une demie (Idan, 2026-11-09).
    function placeOf(itemOrCode){
      const s=typeof itemOrCode==="string"?sheet(itemOrCode):sheetOf(itemOrCode);
      const p=Number(s?.place);
      return Number.isFinite(p)&&p>0?p:1;
    }
    function used(state,house=STABLES){ return mountsIn(state,house).reduce((sum,i)=>sum+placeOf(i),0); }
    function free(state,house=STABLES){ return Math.max(0,places(state,house)-used(state,house)); }
    // Un objet qui demande une place dans son logement (un achat chez un marchand) : {ok, reason}.
    function canStore(state,item){
      if(!isMount(item)) return {ok:true};
      const house=houseOf(item),words=houseWords(house);
      return free(state,house)>=placeOf(item)?{ok:true}:{ok:false,reason:places(state,house)?"Pas de place "+words.at+".":"Il faut d’abord "+words.need+" (à la Grange du dresseur)."};
    }
    function upkeepOf(item){ return Number(sheetOf(item)?.entretien)||0; }
    function upkeep(state){ return mountsOf(state).reduce((sum,m)=>sum+upkeepOf(m),0); }

    // L'entretien se paie chaque matin avec les salaires, sur la même note (campaign.js, paySalaries ; les dettes :
    // debts.js).

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
        if(free(state,houseOf(s.code))<placeOf(s.code)){ released.push(c); continue; }
        const item=typeof makeItem==="function"?makeItem("mount",s.nom):null;
        if(!item){ released.push(c); continue; }
        Object.assign(item,{owner:null,origin:c.origin||null,day});
        giveName(state,item);
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
    function ownSheet(item){
      if(!isMount(item)) return null;
      if(item.sheet) return item.sheet;
      const s=sheetOf(item);
      if(!s) return null;
      item.sheet={stats:{...(s.caracteristiques||{})},resistances:{...(s.resistances||{})},
        skills:{martial:{...(s.competences_martiales||{})},magic:{...(s.competences_magiques||{})},social:{...(s.competences_sociales||{})},
          physiology:{...(s.physiologie||{})}},
        spells:(s.sorts||[]).map(x=>({code:x.code,name:spellRows.get(x.code)?.nom||x.code,school:spellRows.get(x.code)?.ecole||null,
          mastery:Number(x.maitrise)||1})),xp:{}};
      return item.sheet;
    }
    function remove(state,item){
      const company=state.company;
      company.stock=(company.stock||[]).filter(i=>i!==item);
      for(const m of company.roster||[]){
        if(!(m.items||[]).includes(item)) continue;
        m.items=m.items.filter(i=>i!==item);
        for(const [slot,id] of Object.entries(m.equipment?.slots||{})) if(String(id)===String(item.id)) m.equipment.slots[slot]=null;
      }
    }
    // learn(sheet, progress) : l'XP de son combat sur sa fiche (progression.js) ; r.mana : son mana à la fin du combat.
    function applyAftermath(state,results=[],{woundDays=d=>d,fatigueDays=d=>d,learn=null}={}){
      const report={dead:[],wounded:[],fatigued:[],progression:[]};
      for(const r of results||[]){
        const item=mountById(state,r.id);
        if(!item) continue;
        if(r.dead){ remove(state,item); report.dead.push(item); continue; }
        const sheet=ownSheet(item);
        if(sheet&&Number.isFinite(Number(r.mana))) sheet.mana=Number(r.mana);
        if(sheet&&learn&&r.progress){
          const changes=learn(sheet,r.progress)||[];
          if(changes.length) report.progression.push({mount:item,changes});
        }
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

    // Son nom, à son arrivée (capture, achat) : un de sa liste qu'aucun autre de nos animaux ne porte ; la liste épuisée, un
    // nom de la liste suivi d'un numéro.
    function giveName(state,item){
      if(!isMount(item)) return null;
      if(item.petName) return item.petName;
      const used=new Set(mountsOf(state).filter(i=>i!==item).map(i=>i.petName).filter(Boolean));
      const list=namesByCode.get(item.mountCode)||[];
      const unused=list.filter(n=>!used.has(n));
      let name=unused.length?unused[Math.floor(random()*unused.length)]:null;
      if(!name){
        const base=list.length?list[Math.floor(random()*list.length)]:(sheetOf(item)?.nom||"Monture");
        let n=2;
        while(used.has(base+" "+n)) n++;
        name=base+" "+n;
      }
      item.petName=name;
      return name;
    }
    // Le renommer librement (Idan, 2026-11-07 : « renommer un mercenaire ou un animal librement »).
    function rename(state,id,name){
      const item=mountById(state,id),clean=cleanName(name);
      if(!item) return {ok:false,reason:"Monture introuvable."};
      if(!clean) return {ok:false,reason:"Il faut un nom."};
      const before=item.petName||item.name;
      item.petName=clean;
      return {ok:true,mount:item,before,name:clean};
    }

    return {BARN,STABLES,KENNEL,GREENHOUSE,houseOf,houseWords,mountsIn,placeOf,used,rides,sheet,sheetOf,isMount,mountsOf,ownerOf,places,free,canStore,upkeepOf,upkeep,rollSurvival,capturable,admit,release,
      applyAftermath,recoverOneDay,returnToStable,ownSheet,giveName,rename};
  }

  return {createStableRules,BARN,STABLES,KENNEL,GREENHOUSE,isMount,cleanName,houseWords};
});
