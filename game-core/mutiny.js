"use strict";

// La mutinerie (Idan, 2026-11-10 : « quand on doit de l'argent à un mercenaire, il passe dans un statut particulier, mode
// "mutinerie". Chaque jour, une grosse baisse d'affinité pour chaque mercenaire à qui on doit de l'argent. ( -10 ?) Chaque
// matin où on doit de l'argent à au moins un mercenaire, on passe un test de mutinerie générale qui va dépendre du nombre
// de jour où il y a des mercenaires en mode mutinerie, de l'intimidation du capitaine et de la moyenne des affinités des
// mercenaires. Si le test passe, pour chaque mercenaire, on fait un test qui dépend du nombre de jours où on a une dette, de
// leur courage, de l'intimidation du capitaine et de leur affinité. Ceux qui passent le test viennent parler au capitaine. Le
// Capitaine promet (charisme) alors de les rembourser au plus vite (d'où l'intérêt de pouvoir rembourser individuellement)
// ou tente de leur faire peur (là, on prendra Intimidation vs la somme des courages). On fait un test collectif en fonction
// du choix du capitaine. Si ça passe, on est tranquille pour la journée. Sinon la conversation s'échauffe, et le capitaine
// doit se battre face à l'ensemble des mutins. ») ; les formules proposées, validées le même jour (« 1 - Parfait ») ; « le
// mutin ne déserte plus ! » ; seuls ceux qui sont au camp et pas blessés se mutinent (« 6 - Oui »).
// - le mode mutinerie : un membre de la compagnie (pas le capitaine) à qui l'on doit de l'argent (debts.js) ; chaque matin,
//   mutiny.affinity_per_day d'affinité ;
// - le test général, chaque matin où au moins un membre est en mode mutinerie, s'il y a au camp un mutin qui peut venir et
//   que le capitaine y est : chance = 100 / (1 + e^(−Δ/échelle)), de 1 à 99 %, Δ = 5 × J − Intimidation du capitaine ÷ 2 −
//   affinité moyenne des mutins ÷ 2 ; J : les jours d'affilée avec des dettes ;
// - le test de chacun, si la mutinerie éclate : Δ = 5 × ses jours de dette + (son Courage − Intimidation du capitaine) ÷ 2 −
//   son affinité ÷ 2 − 20 ; ceux qui le réussissent viennent parler au capitaine (la scène attend le joueur) ;
// - la scène : rembourser l'un d'eux le fait sortir du groupe ; Promettre : Charisme ÷ (Charisme + 10 × la somme de leurs
//   jours de dette) ; Faire peur : Intimidation ÷ (Intimidation + la somme de leurs Courages) ; réussi, le camp est
//   tranquille pour la journée ; raté, le combat (mission.js, étape 2).
// Module pur. L'état : state.company.mutiny = { days, today: { day, chance, roll, broke, average, tests: [{ id, chance, roll,
// comes }], members: [id], status: "none" | "calm" | "scene" | "fight", approach, result } }.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesMutiny=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
  const logistic=(delta,scale)=>100/(1+Math.exp(-delta/scale));
  // Une valeur : une caractéristique, ou une compétence (Intimidation : skills.social).
  function valueOf(m,name){
    if(m?.stats&&name in m.stats) return Number(m.stats[name])||0;
    for(const group of Object.values(m?.skills||{})) if(group&&typeof group==="object"&&name in group) return Number(group[name])||0;
    return 0;
  }

  // debts : createDebtRules (owedTo, entryOf) ; camp : { awayOf(state, id), affinityOf(state, m) → { total },
  // statOf(m, nom) → avec l'équipement (facultatif) }.
  function createMutinyRules({reference,random=Math.random,debts,camp={}}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      affinityPerDay:k("mutiny.affinity_per_day",-10),
      scale:k("mutiny.scale",10),min:k("mutiny.min",1),max:k("mutiny.max",99),
      generalDays:k("mutiny.general.days_weight",5),generalIntimidation:k("mutiny.general.intimidation_weight",0.5),
      generalAffinity:k("mutiny.general.affinity_weight",0.5),
      memberDays:k("mutiny.member.days_weight",5),memberCourage:k("mutiny.member.courage_weight",0.5),
      memberIntimidation:k("mutiny.member.intimidation_weight",0.5),memberAffinity:k("mutiny.member.affinity_weight",0.5),
      memberOffset:k("mutiny.member.offset",-20),promiseDays:k("mutiny.promise.days_factor",10),
      allyFactor:k("mutiny.ally.affinity_factor",0.5)
    };
    const rosterOf=state=>state?.company?.roster||[];
    const memberOf=(state,id)=>rosterOf(state).find(m=>String(m.id)===String(id))||null;
    const captainOf=state=>memberOf(state,state?.company?.captainId);
    const roll=()=>Math.floor(random()*100)+1;
    const statOf=(m,name)=>camp.statOf?Number(camp.statOf(m,name))||0:valueOf(m,name);
    const affinityOf=(state,m)=>Number(camp.affinityOf?.(state,m)?.total)||0;
    const atCamp=(state,m)=>Boolean(m)&&!m.dungeon&&!camp.awayOf?.(state,m.id);
    const chanceOf=delta=>clamp(logistic(delta,C.scale),C.min,C.max);
    const round=x=>Math.round(x*10)/10;

    // En mode mutinerie : on lui doit de l'argent.
    function inMutiny(state,m){ return Boolean(m)&&m.id!==state?.company?.captainId&&Number(debts?.owedTo(state,m.id))>0; }
    function mutineers(state){ return rosterOf(state).filter(m=>inMutiny(state,m)); }
    // Peut venir parler au capitaine : au camp, pas blessé.
    function canRise(state,m){ return inMutiny(state,m)&&atCamp(state,m)&&m.recovery?.kind!=="wounded"; }
    // Ses jours de dette : depuis le premier jour impayé.
    function debtDays(state,m){
      const since=Number(debts?.entryOf(state,m.id)?.since);
      return Number.isFinite(since)?Math.max(1,state.day-since+1):0;
    }
    function stateOf(state){ return state.company.mutiny||(state.company.mutiny={days:0,today:null}); }

    // Les chances (en %).
    function generalChance(state,{days=stateOf(state).days,members=rosterOf(state).filter(m=>canRise(state,m))}={}){
      const intimidation=statOf(captainOf(state),"Intimidation");
      const average=members.length?members.reduce((sum,m)=>sum+affinityOf(state,m),0)/members.length:0;
      const delta=C.generalDays*days-C.generalIntimidation*intimidation-C.generalAffinity*average;
      return {chance:round(chanceOf(delta)),delta:round(delta),days,intimidation:round(intimidation),average:round(average)};
    }
    function memberChance(state,m){
      const days=debtDays(state,m),courage=statOf(m,"Courage"),intimidation=statOf(captainOf(state),"Intimidation"),affinity=affinityOf(state,m);
      const delta=C.memberDays*days+C.memberCourage*courage-C.memberIntimidation*intimidation-C.memberAffinity*affinity+C.memberOffset;
      return {chance:round(chanceOf(delta)),delta:round(delta),days,courage:round(courage),affinity:round(affinity)};
    }
    // Le test collectif de la scène.
    function confrontChance(state,approach,members=present(state)){
      const captain=captainOf(state);
      if(approach==="promise"){
        const charisma=statOf(captain,"Charisme"),days=members.reduce((sum,m)=>sum+debtDays(state,m),0);
        return {chance:round(100*charisma/Math.max(1e-9,charisma+C.promiseDays*days)),charisma:round(charisma),days};
      }
      if(approach==="fear"){
        const intimidation=statOf(captain,"Intimidation"),courage=members.reduce((sum,m)=>sum+statOf(m,"Courage"),0);
        return {chance:round(100*intimidation/Math.max(1e-9,intimidation+courage)),intimidation:round(intimidation),courage:round(courage)};
      }
      return null;
    }

    // Le matin : les jours d'affilée, l'affinité de chaque mutin, puis les tests.
    function morning(state){
      const book=stateOf(state);
      const owed=mutineers(state);
      if(!owed.length){ book.days=0; book.today=null; return {days:0,mutineers:[]}; }
      book.days=(Number(book.days)||0)+1;
      const affinity=owed.map(m=>{ m.affinityAcquired=(Number(m.affinityAcquired)||0)+C.affinityPerDay; return {id:m.id,delta:C.affinityPerDay}; });
      const today={day:state.day,status:"none",members:[],tests:[]};
      book.today=today;
      const report={days:book.days,mutineers:owed,affinity,today};
      const able=owed.filter(m=>canRise(state,m));
      if(!able.length||!atCamp(state,captainOf(state))) return report;
      const general=generalChance(state,{members:able});
      Object.assign(today,{chance:general.chance,average:general.average,roll:roll()});
      today.broke=today.roll<=today.chance;
      if(!today.broke){ today.status="calm"; return report; }
      for(const m of able){
        const test=memberChance(state,m),dice=roll();
        today.tests.push({id:m.id,chance:test.chance,roll:dice,comes:dice<=test.chance});
      }
      today.members=today.tests.filter(t=>t.comes).map(t=>t.id);
      today.status=today.members.length?"scene":"calm";
      return report;
    }

    // Ceux qui sont venus et qui sont encore là (toujours au camp, toujours en mode mutinerie).
    function present(state){
      const today=stateOf(state).today;
      return today&&today.day===state.day?today.members.map(id=>memberOf(state,id)).filter(m=>canRise(state,m)):[];
    }
    // La scène en attente : des mutins devant le capitaine, pas encore apaisés.
    function pending(state){
      const today=stateOf(state).today;
      if(!today||today.day!==state.day||today.status!=="scene") return null;
      if(!present(state).length){ today.status="calm"; return null; }
      return today;
    }
    function canAdvance(state){
      const today=stateOf(state).today;
      if(pending(state)) return {ok:false,reason:"Des mutins attendent le capitaine : réglez d’abord la mutinerie."};
      if(today&&today.day===state.day&&today.status==="fight") return {ok:false,reason:"Les mutins ont tiré l’épée : le combat d’abord."};
      return {ok:true};
    }
    // Remboursé pendant la scène : il quitte le groupe.
    function settled(state,id){
      const today=stateOf(state).today;
      if(!today||today.day!==state.day||today.status!=="scene") return null;
      today.members=today.members.filter(x=>String(x)!==String(id)||inMutiny(state,memberOf(state,id)));
      return pending(state)?{ok:true,members:present(state)}:{ok:true,calm:true,members:[]};
    }
    // Promettre ou faire peur : un test pour tout le groupe.
    function confront(state,approach){
      const today=pending(state);
      if(!today) return {ok:false,reason:"Personne ne vous attend."};
      const members=present(state);
      const odds=confrontChance(state,approach,members);
      if(!odds) return {ok:false,reason:"Approche inconnue."};
      const dice=roll(),success=dice<=odds.chance;
      today.approach=approach;
      today.result={approach,chance:odds.chance,roll:dice,success,members:members.map(m=>m.id)};
      today.status=success?"calm":"fight";
      return {ok:true,approach,chance:odds.chance,roll:dice,success,members};
    }
    // Le combat qui attend (la scène ratée ; au chargement d'une partie, il reprend là).
    function fighting(state){
      const today=stateOf(state).today;
      return today&&today.day===state.day&&today.status==="fight"?today:null;
    }
    // Le combat (Idan, 2026-11-10) : ceux qui se battent aux côtés du capitaine (« Il doit être au camp et pas blessé. On
    // fait un test d'affinité envers le capitaine bien dur. Genre 50% de chance si l'affinité est au max. 0% si l'affinité
    // est négative ») : chance = facteur × affinité, 0 si elle est négative ; un seul tirage par combat (gardé).
    function allyChance(state,m){ return round(Math.max(0,C.allyFactor*affinityOf(state,m))); }
    function rally(state){
      const today=fighting(state);
      if(!today) return [];
      if(Array.isArray(today.allies)) return today.allies;
      const foes=new Set((today.result?.members||[]).map(String));
      today.allies=rosterOf(state).filter(m=>m.id!==state.company.captainId&&!foes.has(String(m.id))&&atCamp(state,m)&&m.recovery?.kind!=="wounded")
        .map(m=>{ const chance=allyChance(state,m),dice=chance>0?roll():null; return {id:m.id,chance,roll:dice,joins:dice!=null&&dice<=chance}; });
      return today.allies;
    }
    // Les mutins du combat : ceux du groupe, toujours là.
    function fighters(state){
      const today=fighting(state);
      return today?(today.result?.members||[]).map(id=>memberOf(state,id)).filter(Boolean):[];
    }
    // La mutinerie du jour, une fois le combat livré (étape 2).
    function fought(state){
      const today=stateOf(state).today;
      if(today&&today.day===state.day&&today.status==="fight") today.status="calm";
      return today;
    }

    return {constants:C,valueOf,inMutiny,mutineers,canRise,debtDays,generalChance,memberChance,confrontChance,morning,present,pending,
      canAdvance,settled,confront,fighting,allyChance,rally,fighters,fought};
  }

  return {createMutinyRules};
});
