"use strict";

// Directeur de l'École de magie (Idan, 2026-11-01 : « même mécanisme pour la nomination que l'intendant ») : une fois
// l'École construite, le capitaine propose à un mercenaire de la diriger ; il peut refuser, même règle que l'intendant
// (game-core/steward.js) : même envie (40 − 0,6 × Courage + 2 × Missions + 8 × Blessures, de 2 à 95 %), même retour
// sur le terrain, même effet d'un refus sur l'affinité (± (Intelligence − Courage) / 10 ; flatté une seule fois), une
// proposition par jour. Comme l'intendant et le médecin, c'est un mercenaire hors mission : il reste au camp et vit à
// l'École (pas de place au dortoir). Son aide à l'entraînement : school-training.js.
// Les maîtres (Idan, 2026-11-03 : « Oui pour les maîtres ») : le Doctore au Ludus, le Vétéran à l'Académie de la survie,
// le Maître des lames au Cercle des Fines Lames, nommés de la même façon (post : camp-posts.js). Champs du poste key :
// company[key + "Id"], company[key + "Since"], m[key + "OfferDay"], m[key + "Flattered"], journal key et key + "_recall",
// compteur history[key + "Days"].
(function(root,factory){
  const node=typeof module!=="undefined"&&module.exports;
  const steward=node?require("./steward.js"):root.MercenairesSteward;
  const history=node?require("./history.js"):root.MercenairesHistory;
  const posts=node?require("./camp-posts.js"):root.MercenairesCampPosts;
  const api=factory(steward,history,posts);
  if(node) module.exports=api;
  root.MercenairesSchoolDirector=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Steward,History,Posts){
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const capitalize=text=>text.charAt(0).toUpperCase()+text.slice(1);
  // « de » ou « d’ » devant le titre (« n’a pas d’Alchimiste »).
  const of=noun=>(/^[aeiouyéèêëàâîïôû]/i.test(noun)?"d’":"de ")+noun;

  // dormitory : { free(state), places(mercenaire) } ; buildingLevel(state, code) : niveau d'un bâtiment (campaign.js) ;
  // schoolLevel(state) : l'ancien paramètre, le niveau de l'École de magie ; post : "director" (par défaut), "doctore",
  // "veteran" ou "bladeMaster".
  function createSchoolDirectorRules({reference,random=Math.random,dormitory=null,schoolLevel=null,buildingLevel=null,post="director"}={}){
    const P=Posts.postByKey(post);
    if(!P) throw new Error(`Poste inconnu : ${post}`);
    const steward=Steward.createStewardRules({reference,random,dormitory});
    const C=steward.constants;
    const ID=P.key+"Id",SINCE=P.key+"Since",OFFER_DAY=P.key+"OfferDay",FLATTERED=P.key+"Flattered",DAYS=P.key+"Days";
    const RECALL=P.key+"_recall";
    const levelOf=state=>buildingLevel?buildingLevel(state,P.building):schoolLevel?schoolLevel(state):0;
    const rosterOf=state=>state?.company?.roster||[];
    const stat=(m,name)=>Number(m?.stats?.[name])||0;
    const no=reason=>({ok:false,reason});
    const directorOf=state=>Posts.holderOf(state,P);
    function daysAsDirector(state){
      return directorOf(state)?Math.max(0,state.day-(Number(state.company[SINCE])||state.day)):0;
    }
    function totalDirectorDays(state,m){
      return (Number(m?.history?.[DAYS])||0)+(directorOf(state)===m?daysAsDirector(state):0);
    }
    // Même envie que pour l'Intendance : le brave veut le terrain, le vieux blessé moins.
    const appointChance=m=>steward.appointChance(m);
    const returnChance=(state,m)=>clamp(C.returnBase-steward.desire(m)+C.perDay*daysAsDirector(state),C.min,C.max);
    function refusalAffinity(m){
      const delta=Math.round((stat(m,"Intelligence")-stat(m,"Courage"))/C.refusalDivisor);
      return delta>0&&m[FLATTERED]?0:delta;
    }

    function canOffer(state,m){
      if(!m) return no("Mercenaire introuvable.");
      if(!(levelOf(state)>0)) return no(`Il faut d’abord construire ${P.place}.`);
      if(m.id===state.company.captainId) return no(`Le capitaine ne peut pas diriger ${P.short}.`);
      if(Number(m.contract?.joinDay)>state.day) return no("Il rejoint la compagnie demain matin.");
      if((state.company.lieutenantIds||[]).includes(m.id)) return no(`Un lieutenant ne peut pas diriger ${P.short}.`);
      if(m.id===state.company.intendantId) return no(`L’intendant ne peut pas diriger ${P.short}.`);
      if(state.company.medicId!=null&&m.id===state.company.medicId) return no(`Le médecin ne peut pas diriger ${P.short}.`);
      const other=Posts.postOf(state,m);
      if(other&&other!==P) return no(`${other.title} ne peut pas diriger ${P.short}.`);
      const mission=(state.expeditions||[]).find(e=>e.memberIds.includes(m.id));
      if(mission) return no(mission.status==="scheduled"?"Il part en mission demain.":"Il est en mission.");
      if(m[OFFER_DAY]===state.day) return no("Vous lui en avez déjà parlé aujourd’hui.");
      return {ok:true};
    }

    const roll=()=>Math.floor(random()*100)+1;
    function refuse(m,state,kind){
      const affinityDelta=refusalAffinity(m);
      if(affinityDelta) m.affinityAcquired=(Number(m.affinityAcquired)||0)+affinityDelta;
      if(affinityDelta>0) m[FLATTERED]=true;
      History.record(m,state.day,kind,{accepted:false});
      return {affinityDelta,mood:affinityDelta>0?"flattered":affinityDelta<0?"vexed":"neutral"};
    }

    // Proposer le poste.
    function offer(state,mercenaryId){
      const m=rosterOf(state).find(x=>x.id===mercenaryId);
      const current=directorOf(state);
      if(current) return no(current===m?`Il dirige déjà ${P.short}.`:`${capitalize(P.short)} a déjà un ${P.noun}.`);
      const allowed=canOffer(state,m);
      if(!allowed.ok) return allowed;
      const chance=appointChance(m),dice=roll();
      m[OFFER_DAY]=state.day;
      if(dice<=chance){
        state.company[ID]=m.id;
        state.company[SINCE]=state.day;
        History.record(m,state.day,P.key,{accepted:true});
        return {ok:true,accepted:true,roll:dice,chance,affinityDelta:0,mood:"neutral",mercenary:m};
      }
      return {ok:true,accepted:false,roll:dice,chance,mercenary:m,...refuse(m,state,P.key)};
    }

    // Lui proposer de revenir sur le terrain : il reprend une place au dortoir.
    function recall(state){
      const m=directorOf(state);
      if(!m) return no(`${capitalize(P.short)} n’a pas ${of(P.noun)}.`);
      if(m[OFFER_DAY]===state.day) return no("Vous lui en avez déjà parlé aujourd’hui.");
      if(dormitory&&dormitory.free(state)<dormitory.places(m)) return {...no("Le dortoir est plein : pas de place pour son retour."),dormFull:true};
      const chance=returnChance(state,m),dice=roll(),days=daysAsDirector(state);
      m[OFFER_DAY]=state.day;
      if(dice<=chance){
        History.historyOf(m)[DAYS]=(Number(m.history?.[DAYS])||0)+days;
        state.company[ID]=null;
        delete state.company[SINCE];
        History.record(m,state.day,RECALL,{accepted:true,days});
        return {ok:true,accepted:true,roll:dice,chance,affinityDelta:0,mood:"neutral",days,mercenary:m};
      }
      return {ok:true,accepted:false,roll:dice,chance,days,mercenary:m,...refuse(m,state,RECALL)};
    }

    return {constants:C,post:P,directorOf,daysAsDirector,totalDirectorDays,appointChance,returnChance,refusalAffinity,canOffer,offer,recall};
  }

  return {createSchoolDirectorRules,POSTS:Posts.POSTS};
});
