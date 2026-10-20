"use strict";

// Taverne — recrutement V1 (docs/design/14-tavern-recruitment.md).
// État pur et sérialisable : la Taverne contient des candidats `Mercenary` persistants,
// enveloppés avec leur entretien et leur négociation, qui ne polluent pas le mercenaire.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesTavern=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const QUESTIONS_PER_CANDIDATE=3;

  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }

  // options : { random, reference } ; reference = référentiels de data/reference/ (formulaConstants).
  function createTavernRules(options={}){
    const random=options.random||Math.random;
    const INITIAL_SLOTS=referenceConstant(options.reference,"tavern.slots.initial",5);
    // Départ après un refus (PLAYTEST) : poids de la concession demandée et plafond de la probabilité.
    const QUIT_CONCESSION_COEFFICIENT=referenceConstant(options.reference,"tavern.negotiation.quit_concession_coefficient",0.75);
    const QUIT_MAX=referenceConstant(options.reference,"tavern.negotiation.quit_max",75);
    // Affinité avec le capitaine (14 §9 ; Idan, 2026-10-20) : une bonne affinité adoucit la négociation.
    const AFFINITY_RESISTANCE=referenceConstant(options.reference,"tavern.negotiation.affinity_coefficient",0.25);
    function d100(){ return Math.floor(random()*100)+1; }
    function uniform(min,max){ return min+random()*(max-min); }

    function stat(m,name){ return Number(m?.stats?.[name])||0; }

    // §4 — Test quotidien « Engagé ailleurs » (PLAYTEST).
    function engagedElsewhereChance(m){
      return clamp(2+0.10*(Number(m.reputation)||0)-0.10*(Number(m.salary)||0),2,35);
    }

    // §8 — Prime de mission demandée (PLAYTEST), payée seulement si le mercenaire revient de mission.
    function missionBonusDemand(m){
      const courageFactor=clamp(1.5-stat(m,"Courage")/100,0.5,1.5);
      const pretensionFactor=1+((Number(m.salaryPretension)||0)-35)/200;
      return Math.round(3*(Number(m.salary)||0)*courageFactor*pretensionFactor);
    }

    // §6 — Informations visibles avant entretien : profil CAC / Distance / Magie et prédilection.
    function visibleProfile(m){
      const type=m?.equipment?.profile?.type||null;
      const prefs=m?.weaponPreferences||{};
      let predilection=null;
      if(type==="melee") predilection=[prefs.oneHand,prefs.twoHands].filter(Boolean).sort((a,b)=>b.score-a.score)[0]?.weapon||null;
      else if(type==="ranged") predilection=prefs.ranged?.weapon||null;
      else if(type==="magic") predilection=m?.equipment?.profile?.bestMagic?.school||null;
      return {
        name:m.name,people:m.people,culture:m.culture,
        profile:type,predilection,
        reputation:Math.round(Number(m.reputation)||0),
        salary:Number(m.salary)||0,
        missionBonus:missionBonusDemand(m)
      };
    }

    function wrapCandidate(mercenary,day){
      return {
        mercenary,
        arrivedDay:day,
        interview:{questionsLeft:QUESTIONS_PER_CANDIDATE,answers:[]},
        negotiation:null
      };
    }

    function createTavernState(){
      return {slots:INITIAL_SLOTS,candidates:[]};
    }

    // §3 — Remplir exactement les places libres avec de nouveaux mercenaires.
    function fillTavern(tavern,day,generateCandidate){
      const arrivals=[];
      while(tavern.candidates.length<tavern.slots){
        const candidate=wrapCandidate(generateCandidate(),day);
        tavern.candidates.push(candidate);
        arrivals.push(candidate);
      }
      return arrivals;
    }

    // §3 — Matin : tests « Engagé ailleurs » des candidats présents, puis remplissage des places libres.
    function tavernMorning(tavern,day,generateCandidate){
      const departures=[];
      tavern.candidates=tavern.candidates.filter(candidate=>{
        const p=engagedElsewhereChance(candidate.mercenary),roll=d100();
        if(roll<=p){ departures.push({candidate,p,roll}); return false; }
        return true;
      });
      const arrivals=fillTavern(tavern,day,generateCandidate);
      return {departures,arrivals};
    }

    function findCandidate(tavern,id){
      return tavern.candidates.find(c=>c.mercenary.id===id)||null;
    }

    function readValue(m,key){
      return key.split(".").reduce((node,part)=>node?.[part],m);
    }

    // §7 — Entretien : 3 questions par candidat pour tout son séjour ; une réponse obtenue reste figée.
    // Avec un Intendant : ±20 % réduit par son Intendance. Sans Intendant : le candidat se survend (×1,10 à ×3,00).
    function askQuestion(candidate,key,intendant=null){
      const known=candidate.interview.answers.find(a=>a.key===key);
      if(known) return {ok:true,answer:known,repeated:true};
      if(candidate.interview.questionsLeft<=0) return {ok:false,reason:"Plus de question disponible pour ce candidat."};
      const value=Number(readValue(candidate.mercenary,key));
      if(!Number.isFinite(value)) return {ok:false,reason:"Valeur inconnue : "+key};
      let estimate,source;
      if(intendant){
        const intendance=clamp(Number(intendant.skills?.camp?.Intendance)||0,0,100);
        const maxError=0.20*(1-intendance/100);
        estimate=Math.round(value*uniform(1-maxError,1+maxError));
        source={type:"intendant",id:intendant.id,name:intendant.name,maxError};
      }else{
        estimate=Math.round(value*uniform(1.10,3.00));
        source={type:"candidate"};
      }
      const answer={key,estimate,source};
      candidate.interview.answers.push(answer);
      candidate.interview.questionsLeft-=1;
      return {ok:true,answer,repeated:false};
    }

    function negotiationState(candidate){
      if(!candidate.negotiation){
        candidate.negotiation={
          salary:Number(candidate.mercenary.salary)||0,
          bonus:missionBonusDemand(candidate.mercenary),
          refused:null,
          rounds:0,
          agreed:null
        };
      }
      return candidate.negotiation;
    }

    // affinity : affinité du candidat avec le capitaine qui négocie (−100 à +100 ; 0 si inconnue).
    function negotiationResistance(m,affinity=0){
      return clamp(0.50*(Number(m.salaryPretension)||0)+0.25*stat(m,"Intelligence")+0.25*stat(m,"Volonté")-AFFINITY_RESISTANCE*(Number(affinity)||0),0,100);
    }

    function componentRatio(offer,current){
      return current<=0?1:Math.min(offer/current,1);
    }

    // §9 — Négociation du contrat (salaire journalier + prime de mission).
    // Résultat : accepted | invalid | left | counter. context.affinity : affinité avec le capitaine.
    function makeOffer(candidate,offer,context={}){
      const n=negotiationState(candidate),m=candidate.mercenary;
      if(n.agreed) return {outcome:"accepted",agreed:n.agreed,already:true};
      const salary=Math.max(0,Math.round(Number(offer?.salary)||0));
      const bonus=Math.max(0,Math.round(Number(offer?.bonus)||0));

      // Règle anti-spam : après un refus, aucune composante ne peut descendre sous l'offre refusée.
      if(n.refused&&(salary<n.refused.salary||bonus<n.refused.bonus)){
        return {outcome:"invalid",reason:"Une nouvelle offre ne peut pas être inférieure à l'offre déjà refusée.",floor:{...n.refused}};
      }

      n.rounds+=1;
      // Acceptation automatique, composante par composante.
      if(salary>=n.salary&&bonus>=n.bonus){
        n.agreed={salary,bonus};
        return {outcome:"accepted",agreed:n.agreed,automatic:true};
      }

      const ratio=0.65*componentRatio(salary,n.salary)+0.35*componentRatio(bonus,n.bonus);
      const concession=100*(1-ratio);
      const resistance=negotiationResistance(m,context.affinity);
      const pAccept=clamp(95-2.0*concession-0.4*(resistance-50),5,95);
      const acceptRoll=d100();
      if(acceptRoll<=pAccept){
        n.agreed={salary,bonus};
        return {outcome:"accepted",agreed:n.agreed,pAccept,acceptRoll,concession};
      }

      n.refused={salary,bonus};
      const pQuit=clamp(5+QUIT_CONCESSION_COEFFICIENT*concession+0.10*(Number(m.salaryPretension)||0)+0.10*stat(m,"Volonté"),5,QUIT_MAX);
      const quitRoll=d100();
      if(quitRoll<=pQuit) return {outcome:"left",pAccept,acceptRoll,pQuit,quitRoll,concession};

      // Contre-proposition : jamais inférieure à l'offre du joueur, composante par composante.
      const tenacity=clamp(resistance/100,0,1);
      const factor=clamp(0.35+0.45*tenacity+uniform(-0.10,0.10),0.25,0.90);
      n.salary=Math.max(salary,Math.ceil(salary+factor*(n.salary-salary)));
      n.bonus=Math.max(bonus,Math.ceil(bonus+factor*(n.bonus-bonus)));
      return {outcome:"counter",counter:{salary:n.salary,bonus:n.bonus},pAccept,acceptRoll,pQuit,quitRoll,concession,factor};
    }

    function removeCandidate(tavern,candidate){
      tavern.candidates=tavern.candidates.filter(c=>c!==candidate);
    }

    return {
      INITIAL_SLOTS,
      QUESTIONS_PER_CANDIDATE,
      createTavernState,
      engagedElsewhereChance,
      missionBonusDemand,
      visibleProfile,
      fillTavern,
      tavernMorning,
      findCandidate,
      askQuestion,
      negotiationState,
      negotiationResistance,
      makeOffer,
      removeCandidate
    };
  }

  return {createTavernRules,referenceConstant};
});
