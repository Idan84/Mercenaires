"use strict";

// Désertion (Idan, 2026-11-04 : « Chaque matin, quand l'affinité d'un mercenaire a baissé, il fait un test d'affinité avec
// le capitaine, puis en cas d'échec avec chacun des lieutenants. Si tous les tests échouent, le mercenaire se barre ! (Sauf
// s'il est au cachot, il le fera à sa sortie.) Départ : deux options : la tour de guet l'a repéré ou pas. […] Si il est passé
// inaperçu, l'intendant nous le signale […]. S'il est repéré : […] intimidation, persuasion (charisme). Les deux tests sont
// durs. Par défi au combat (pour l'instant, c'est auto, le capitaine gagne et le mercenaire va rejoindre le futur
// mémorial…). On peut aussi le laisser partir (son affinité remonte un peu, mais il part !). Après un test d'affinité raté,
// on peut encore le défier en combat singulier. Cette interface arrive en début de journée et on ne peut pas faire autre
// chose avant d'avoir résolu ça » ; « Variante plus douce » ; « en effet » ; « il part avec son sac aussi » ; « oui » ;
// « on la fait bien remonter […]. Garde-fou : s'il reste, il est immunisé aux tests de désertion pendant 15 jours » ; « Si !
// Il est mort dans un combat ») :
//
// - chaque matin, chaque membre présent au camp (pas en mission), sauf le capitaine, dont l'affinité avec le capitaine a
//   baissé depuis la veille (le bilan sur 24 heures) ;
// - chance de rester = 100 / (1 + e^(−(affinité + 60) / 10)), de 1 à 99 % : avec le capitaine, puis avec chaque lieutenant
//   présent au camp (son affinité envers le lieutenant : peuple, culture, alignement) ; tous ratés : il part cette nuit ;
// - au cachot : il ne part pas ; il veut partir (plus de test) et tente de filer le matin qui suit sa libération ;
// - la Tour de guet : chance de le repérer = 100 / (1 + e^(−Δ/15)), Δ = 10 × niveau − 55 − (Discrétion − 30), de 5 à
//   95 % ; sans Tour, jamais ;
// - inaperçu : il part avec ce qu'il porte et son sac ; l'intendant le signale (sans intendant, on l'apprend quand même) ;
// - repéré : une scène au début de la journée, qui bloque le jeu : Intimider ou Convaincre (une tentative, dur :
//   10 + 80 / (1 + e^(−Δ/20)), Δ = 0,5 × affinité + Intimidation ou Charisme ÷ 2 − 60) ; s'il reste, +20 d'affinité et 15
//   jours sans test ; sinon (ou d'emblée) : le défier en combat singulier (le vrai duel, depuis le 2026-11-10 : duelOutcome)
//   ou le laisser partir (+10 d'affinité, gardé dans son profil).
//
// Constantes : desertion.* (formula-constants.json). État : m.loyalty = { affinity (la veille), immuneUntil, wantsToLeave } ;
// state.company.deserting (les repérés, en attente de la scène), deserters, memorial. Module pur ; campaign.js fournit
// l'affinité, les lieutenants, la Tour et le départ de la compagnie (camp.remove).
(function(root,factory){
  const node=typeof module!=="undefined"&&module.exports;
  const history=node?require("./history.js"):root.MercenairesHistory;
  const persuasion=node?require("./persuasion.js"):root.MercenairesPersuasion;
  const api=factory(history,persuasion);
  if(node) module.exports=api;
  root.MercenairesDesertion=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(History,Persuasion){
  const TOWER="watchtower";
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
  const logistic=(delta,scale)=>100/(1+Math.exp(-delta/scale));

  // camp : {
  //   buildingLevel(state, code), awayOf(state, id) → en mission,
  //   affinityOf(state, m) → { total, raw } (avec le capitaine ; raw : sans les bornes ±100), bondOf(lieutenant, m) → son
  //   affinité envers le lieutenant, statOf(m, nom) → avec l'équipement,
  //   inMutiny(state, m) → on lui doit de l'argent (mutiny.js : il ne déserte pas),
  //   remove(state, m, how) → il quitte la compagnie (how : "fled", "let_go", "duel") ; { left, heritage } }.
  function createDesertionRules({reference,random=Math.random,camp}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      stayOffset:k("desertion.stay.offset",60),stayScale:k("desertion.stay.scale",10),
      stayMin:k("desertion.stay.min",1),stayMax:k("desertion.stay.max",99),
      spotPerLevel:k("desertion.spot.per_level",10),spotOffset:k("desertion.spot.offset",55),
      stealthMedian:k("desertion.spot.stealth_median",30),spotScale:k("desertion.spot.scale",15),
      spotMin:k("desertion.spot.min",5),spotMax:k("desertion.spot.max",95),
      persuadeWeight:k("desertion.persuade.affinity_weight",0.5),persuadeOffset:k("desertion.persuade.offset",-60),
      stayAffinity:k("desertion.persuade.stay_affinity",20),letGoAffinity:k("desertion.let_go.affinity",10),
      immunityDays:k("desertion.immunity_days",15)
    };
    const persuasion=Persuasion?Persuasion.createPersuasionRules({reference}):null;
    const rosterOf=state=>state?.company?.roster||[];
    const memberOf=(state,id)=>rosterOf(state).find(m=>m.id===id)||null;
    const captainOf=state=>memberOf(state,state.company.captainId);
    const no=reason=>({ok:false,reason});
    const roll=()=>Math.floor(random()*100)+1;
    const shift=(m,delta)=>{ m.affinityAcquired=(Number(m.affinityAcquired)||0)+delta; return delta; };
    const listOf=(state,key)=>state.company[key]||(state.company[key]=[]);

    // Les chances (en %).
    const stayChance=affinity=>clamp(logistic((Number(affinity)||0)+C.stayOffset,C.stayScale),C.stayMin,C.stayMax);
    const stealthOf=m=>camp.statOf?Number(camp.statOf(m,"Discrétion"))||0:Number(m?.skills?.martial?.["Discrétion"])||0;
    function spotChance(state,m){
      const level=Number(camp.buildingLevel(state,TOWER))||0;
      if(level<=0) return 0;
      return clamp(logistic(C.spotPerLevel*level-C.spotOffset-(stealthOf(m)-C.stealthMedian),C.spotScale),C.spotMin,C.spotMax);
    }
    function persuadeChance(state,m,key){
      const total=camp.affinityOf(state,m)?.total||0;
      const delta=C.persuadeWeight*total+(persuasion?persuasion.bonus(captainOf(state),key):0)+C.persuadeOffset;
      return 10+80/(1+Math.exp(-delta/20));
    }
    const lieutenantsAtCamp=(state,m)=>(state.company.lieutenantIds||[]).map(id=>memberOf(state,id))
      .filter(l=>l&&l!==m&&!l.dungeon&&!camp.awayOf(state,l.id));

    // Les repérés, en attente de la scène.
    const pending=state=>(state.company.deserting||[]).filter(e=>memberOf(state,e.id));
    const pendingOf=(state,id)=>pending(state).find(e=>e.id===id)||null;
    function canAdvance(state){
      const first=pending(state)[0];
      return first?{ok:false,reason:"Un mercenaire veut quitter la compagnie : décidez d’abord de son sort.",id:first.id}:{ok:true};
    }

    // Il quitte la compagnie : la liste des déserteurs garde son profil (et son sac).
    function leave(state,m,{spotted,letGo}){
      const affinity=camp.affinityOf(state,m)?.total??null;
      History?.record(m,state.day,letGo?"desertion_let_go":"desertion",{});
      const out=camp.remove(state,m,letGo?"let_go":"fled");
      listOf(state,"deserters").push({id:m.id,name:m.name,day:state.day,spotted,letGo,affinity,profile:m});
      return {id:m.id,mercenary:m,spotted,letGo,left:out?.left||[]};
    }
    // La nuit : repéré par la Tour (la scène attend le joueur), ou parti sans bruit.
    function flee(state,m,report){
      const chance=spotChance(state,m),dice=chance>0?roll():null;
      if(dice!=null&&dice<=chance){
        listOf(state,"deserting").push({id:m.id,day:state.day,chance,attempted:null});
        report.spotted.push({id:m.id,mercenary:m,chance,roll:dice});
        return;
      }
      report.fled.push({...leave(state,m,{spotted:false,letGo:false}),chance,roll:dice});
    }

    // Chaque matin, après tout ce qui fait bouger l'affinité.
    function morning(state){
      const report={tests:[],fled:[],spotted:[],jailed:[]};
      if(!camp.affinityOf||!captainOf(state)) return report;
      for(const m of [...rosterOf(state)]){
        if(m.id===state.company.captainId) continue;
        const bond=camp.affinityOf(state,m);
        if(!bond) continue;
        const loyalty=m.loyalty||(m.loyalty={});
        const before=loyalty.affinity,away=Boolean(camp.awayOf(state,m.id));
        loyalty.affinity=bond.raw;
        if(away||pendingOf(state,m.id)) continue;
        // En mode mutinerie, on lui doit de l'argent : il ne part pas sans (Idan, 2026-11-10 : « le mutin ne déserte plus ! »).
        if(camp.inMutiny?.(state,m)) continue;
        // Sorti du cachot : il file.
        if(loyalty.wantsToLeave&&!m.dungeon){ delete loyalty.wantsToLeave; flee(state,m,report); continue; }
        if(loyalty.wantsToLeave||!(Number.isFinite(before)&&bond.raw<before)) continue;
        if(Number(loyalty.immuneUntil)>=state.day) continue;
        // Le capitaine, puis chaque lieutenant présent.
        const rolls=[];
        const hold=(who,affinity)=>{ const chance=stayChance(affinity),dice=roll(); rolls.push({who,affinity,chance,roll:dice}); return dice<=chance; };
        let stayed=hold("captain",bond.total);
        for(const lieutenant of stayed?[]:lieutenantsAtCamp(state,m)) if(hold(lieutenant.id,camp.bondOf?camp.bondOf(lieutenant,m):0)){ stayed=true; break; }
        report.tests.push({id:m.id,stayed,rolls});
        if(stayed) continue;
        if(m.dungeon){ loyalty.wantsToLeave=true; report.jailed.push({id:m.id,mercenary:m}); continue; }
        flee(state,m,report);
      }
      return report;
    }

    // La scène : une tentative, Intimider ou Convaincre.
    function persuade(state,mercenaryId,key){
      const entry=pendingOf(state,mercenaryId),m=memberOf(state,mercenaryId);
      if(!entry) return no("Il ne veut pas partir.");
      if(!persuasion?.approachOf(key)) return no("Approche inconnue.");
      if(entry.attempted) return no("Vous avez déjà essayé de le retenir.");
      const chance=persuadeChance(state,m,key),dice=roll(),accepted=dice<=chance;
      entry.attempted=key;
      if(!accepted) return {ok:true,accepted:false,approach:key,chance,roll:dice,mercenary:m};
      state.company.deserting=state.company.deserting.filter(e=>e!==entry);
      const affinityDelta=shift(m,C.stayAffinity);
      const loyalty=m.loyalty||(m.loyalty={});
      loyalty.immuneUntil=state.day+C.immunityDays;
      loyalty.affinity=camp.affinityOf(state,m)?.raw??loyalty.affinity;
      History?.record(m,state.day,"desertion_stayed",{approach:key});
      return {ok:true,accepted:true,approach:key,chance,roll:dice,affinityDelta,immuneUntil:loyalty.immuneUntil,mercenary:m};
    }
    // Le défier en combat singulier (Idan, 2026-11-09, étape 3 du Défi du capitaine : « Le vrai duel remplace le duel
    // automatique. Si on gagne, il reste, ou il est mis à mort. Si on perd, il part avec son sac » ; la fuite hors de l'arène
    // est une victoire du capitaine) : le duel se joue à l'écran (mission.js) et se termine comme un défi de la fiche
    // (campaign.js, applyDuel : mise à mort ou jet de blessure, XP, affinité de la compagnie) ; puis son sort, ici : mis à
    // mort, il n'est plus là ; épargné, il reste (desertion.immunity_days jours sans test, comme s'il avait été retenu) ;
    // vainqueur, il part avec son sac. won : le capitaine a gagné.
    function duelOutcome(state,mercenaryId,{won=false}={}){
      const entry=(state.company.deserting||[]).find(e=>e.id===mercenaryId);
      if(!entry) return no("Il ne veut pas partir.");
      state.company.deserting=state.company.deserting.filter(e=>e!==entry);
      const m=memberOf(state,mercenaryId);
      if(!m) return {ok:true,outcome:"killed",id:mercenaryId};
      if(!won) return {ok:true,outcome:"left",...leave(state,m,{spotted:true,letGo:false})};
      const loyalty=m.loyalty||(m.loyalty={});
      loyalty.immuneUntil=state.day+C.immunityDays;
      loyalty.affinity=camp.affinityOf(state,m)?.raw??loyalty.affinity;
      History?.record(m,state.day,"desertion_stayed",{approach:"duel"});
      return {ok:true,outcome:"stayed",mercenary:m,immuneUntil:loyalty.immuneUntil};
    }
    // Le laisser partir : son affinité remonte un peu, mais il part.
    function letGo(state,mercenaryId){
      const entry=pendingOf(state,mercenaryId),m=memberOf(state,mercenaryId);
      if(!entry) return no("Il ne veut pas partir.");
      state.company.deserting=state.company.deserting.filter(e=>e!==entry);
      const affinityDelta=shift(m,C.letGoAffinity);
      return {ok:true,affinityDelta,...leave(state,m,{spotted:true,letGo:true})};
    }

    return {constants:C,TOWER,stayChance,spotChance,persuadeChance,pending,pendingOf,canAdvance,morning,persuade,duelOutcome,letGo};
  }

  return {createDesertionRules};
});
