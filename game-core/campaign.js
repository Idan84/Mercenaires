"use strict";

// État de partie persistant (07-architecture.md) et horloge stratégique unique AdvanceTime(days),
// résolue jour par jour (10-mission-time-and-unavailability.md). L'état est un objet JSON pur.
(function(root,factory){
  const history=typeof module!=="undefined"&&module.exports?require("./history.js"):root.MercenairesHistory;
  const api=factory(history);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesCampaign=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(History){
  // Sauvegarde : l'état de partie complet, sérialisé en JSON avec un format et une version.
  // La trace de génération des mercenaires (détail de calcul pour le Design Lab, ~85 % du poids)
  // n'est pas sauvegardée : un mercenaire passe d'environ 36 Ko à 5 Ko.
  const SAVE_FORMAT="mercenaires-save";
  const SAVE_VERSION=1;

  function withoutGenerationTrace(key,value){
    return key==="generationTrace"?undefined:value;
  }

  function serializeCampaign(state,extra={}){
    return JSON.stringify({
      format:SAVE_FORMAT,
      version:SAVE_VERSION,
      savedAt:new Date().toISOString(),
      day:state.day,
      company:state.company.name,
      state,
      extra
    },withoutGenerationTrace);
  }

  function restoreCampaign(text){
    let data;
    try{ data=JSON.parse(text); }catch(error){ return {ok:false,reason:"Sauvegarde illisible."}; }
    if(data?.format!==SAVE_FORMAT) return {ok:false,reason:"Ce n'est pas une sauvegarde de Mercenaires."};
    if(data.version!==SAVE_VERSION) return {ok:false,reason:"Version de sauvegarde non prise en charge : "+data.version+"."};
    const state=data.state;
    if(!Number.isInteger(state?.day)||!Array.isArray(state?.company?.roster)||!Array.isArray(state?.tavern?.candidates)){
      return {ok:false,reason:"Sauvegarde incomplète."};
    }
    return {ok:true,state,extra:data.extra||{},savedAt:data.savedAt||null};
  }

  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }

  // generator : createGenerator(...) ; tavern : createTavernRules(...) ; reference : data/reference/ ;
  // biographies (facultatif) : createBiographyRules(...) de game-core/biography.js.
  // avatars (facultatif) : createAvatarRules(...) de game-core/avatars.js.
  // progression (facultatif) : createProgressionRules(...) de game-core/progression.js.
  // affinity (facultatif) : createAffinityRules(...) de game-core/affinity.js (négociation à la Taverne).
  function createCampaignRules({generator,tavern,reference,biographies=null,avatars=null,progression=null,affinity=null,names=null}){
    const STARTING_GOLD=referenceConstant(reference,"company.gold.initial",10000);
    const STARTING_DORMITORY_CAPACITY=referenceConstant(reference,"camp.dormitory.initial_capacity",40);
    const RENOWN_RANK_EXPONENT=referenceConstant(reference,"company.renown.rank_exponent",1.5);
    const RENOWN_HERITAGE_SHARE=referenceConstant(reference,"company.renown.heritage_share",0.2);
    // Qualité des recrues (14 §5 ; Idan, 2026-10-20) : le tavernier présente le meilleur de N prétendants,
    // N = 1 + ⌊(Renommée − 500) / 250⌋, borné de 1 à 5.
    const SUITORS={base:referenceConstant(reference,"tavern.renown.suitors_base",500),
      step:referenceConstant(reference,"tavern.renown.suitors_step",250),max:referenceConstant(reference,"tavern.renown.suitors_max",5)};
    function rosterOf(state){ return state.company.roster; }

    // Renommée de compagnie (09 §2 ; Idan, 2026-10-20, issue #111). Les membres vivants autres que le
    // capitaine sont classés par réputation décroissante ; le rang i compte pour réputation / i^1,5.
    // À réputation égale, le plus ancien dans la compagnie (ordre du roster) est mieux classé.
    function renownRanking(state){
      return rosterOf(state)
        .filter(m=>m.id!==state.company.captainId)
        .map((m,seniority)=>({m,seniority,reputation:Number(m.reputation)||0}))
        .sort((a,b)=>b.reputation-a.reputation||a.seniority-b.seniority)
        .map(({m,reputation},index)=>({
          id:m.id,name:m.name,reputation,rank:index+1,
          contribution:reputation/Math.pow(index+1,RENOWN_RANK_EXPONENT)
        }));
    }

    // Renommée = réputation entière du capitaine + parts pondérées des membres vivants + héritage des morts.
    // Pas de plafond ; l'héritage ne se perd pas.
    function companyRenown(state){
      const captain=rosterOf(state).find(m=>m.id===state.company.captainId);
      const ranking=renownRanking(state);
      const heritageEntries=state.company.renownHeritage||[];
      const parts={
        captain:Number(captain?.reputation)||0,
        members:ranking.reduce((sum,x)=>sum+x.contribution,0),
        heritage:heritageEntries.reduce((sum,x)=>sum+(Number(x.heritage)||0),0)
      };
      return {total:parts.captain+parts.members+parts.heritage,parts,ranking,heritageEntries};
    }

    // Biographie figée sur le mercenaire ; une bio n'est jamais réutilisée dans une même sauvegarde,
    // même après la mort de son mercenaire (proposition Chatty, doc 15). Seuls les membres de la
    // compagnie en ont une : la bio est découverte au recrutement, pas à la Taverne (Idan, 2026-10-04).
    function assignBiography(state,mercenary){
      if(!biographies||mercenary.biography?.id) return mercenary.biography||null;
      state.biographiesUsed=state.biographiesUsed||[];
      const used=new Set(state.biographiesUsed);
      const bio=biographies.assign(mercenary,used);
      if(bio&&!state.biographiesUsed.includes(bio.id)) state.biographiesUsed.push(bio.id);
      return bio;
    }

    // Avatars (décisions Idan du 2026-10-04) : attribués dès la création de la compagnie et dès
    // l'arrivée à la Taverne, puisque la carte du candidat montre son visage. Un visage n'est jamais
    // porté par deux mercenaires présents (compagnie et Taverne) ; un candidat qui repart libère le
    // sien ; celui d'un mort n'est plus attribué (state.avatarsRetired).
    function avatarsInUse(state){
      const present=[...rosterOf(state),...state.tavern.candidates.map(c=>c.mercenary)];
      return new Set([...present.map(m=>m.avatar?.id).filter(Boolean),...(state.avatarsRetired||[])]);
    }

    // Le nom généré suit le sexe donné par l'avatar (Idan, 2026-10-21 ; game-core/names.js).
    function assignAvatar(state,mercenary){
      const avatar=avatars?avatars.assign(mercenary,avatarsInUse(state)):(mercenary.avatar||null);
      names?.fitSex(mercenary);
      return avatar;
    }

    // Parties sauvegardées avant les avatars, nouveaux avatars ajoutés au catalogue, avatar retiré du
    // catalogue ou dont les fichiers ont changé : on complète. Renvoie true si l'état a changé, pour que
    // l'interface sauvegarde.
    function ensureAvatars(state){
      if(!avatars) return false;
      const everyone=()=>[...rosterOf(state),...state.tavern.candidates.map(c=>c.mercenary)];
      const snapshot=()=>JSON.stringify(everyone().map(m=>[m.avatar||null,m.sex||null]));
      const before=snapshot();
      state.avatarsRetired=state.avatarsRetired||[];
      for(const m of everyone()) assignAvatar(state,m);
      return snapshot()!==before;
    }

    // Parties sauvegardées avant les biographies : on complète les membres qui n'en ont pas.
    // Renvoie true si l'état a changé, pour que l'interface le sauvegarde aussitôt (review Chatty, PR #34).
    function ensureBiographies(state){
      const before=JSON.stringify(state.biographiesUsed||null);
      state.biographiesUsed=state.biographiesUsed||[];
      const everyone=[...rosterOf(state),...state.tavern.candidates.map(c=>c.mercenary)];
      for(const m of everyone){
        if(m.biography?.id&&!state.biographiesUsed.includes(m.biography.id)) state.biographiesUsed.push(m.biography.id);
      }
      for(const m of rosterOf(state)) assignBiography(state,m);
      return JSON.stringify(state.biographiesUsed)!==before;
    }

    // Parties sauvegardées avant le stock d'armes de départ (Idan, 2026-10-23) : la compagnie reçoit le sien,
    // tiré pour son capitaine. Renvoie true si l'état a changé, pour que l'interface sauvegarde.
    // Parties sauvegardées avant l'historique (Idan, 2026-10-24) : chaque membre reçoit le sien, à partir de son jour
    // d'arrivée (contrat), sans les missions passées, qui n'ont pas été comptées. Renvoie true si l'état a changé.
    function ensureHistories(state){
      let changed=false;
      for(const m of rosterOf(state)){
        if(m.history) continue;
        const since=Number(m.contract?.signedDay)||1;
        History.historyOf(m,since);
        if(m.id===state.company.captainId) History.record(m,since,"founded");
        else History.record(m,since,"joined",{initial:Boolean(m.contract?.initial)});
        changed=true;
      }
      return changed;
    }

    // Armures, bottes, ceintures, amulettes et capes du stock (Idan, 2026-10-24) : données une seule fois, même à une
    // partie commencée avant.
    function ensureStartingStock(state){
      const company=state.company;
      const captain=rosterOf(state).find(m=>m.id===company.captainId);
      let changed=false;
      if(!Array.isArray(company.stock)){
        company.stock=captain?generator.createStartingStock(captain):[];
        changed=true;
      }
      if(!company.startingArmors){
        if(captain) company.stock.push(...generator.createStartingArmorStock(captain));
        company.startingArmors=true;
        changed=true;
      }
      if(!company.startingBoots){
        if(captain) company.stock.push(...generator.createStartingBootsStock(captain));
        company.startingBoots=true;
        changed=true;
      }
      if(!company.startingBelts){
        if(captain) company.stock.push(...generator.createStartingBeltStock(captain));
        company.startingBelts=true;
        changed=true;
      }
      if(!company.startingAmulets){
        if(captain) company.stock.push(...generator.createStartingAmuletStock(captain));
        company.startingAmulets=true;
        changed=true;
      }
      if(!company.startingCapes){
        if(captain) company.stock.push(...generator.createStartingCapeStock(captain));
        company.startingCapes=true;
        changed=true;
      }
      return changed;
    }

    // Noms changés par Idan (data/reference/renamed-names.json : « Nains des plaines » → « Nains du chaos »,
    // « Massue / Gourdin » → « Massue »…). Dans une partie sauvegardée avant, l'ancien nom est remplacé partout
    // où il figure, en valeur (culture, objet, arme de prédilection) comme en clé (compétences), ainsi que
    // l'identifiant de modèle d'une arme. Renvoie true si l'état a changé, pour que l'interface sauvegarde.
    const RENAMES=new Map();
    for(const row of reference?.renamedNames?.rows||[]){
      RENAMES.set(row.ancien,row.nouveau);
      if(row.famille==="arme"&&generator?.normalizeKey) RENAMES.set("weapon:"+generator.normalizeKey(row.ancien),"weapon:"+generator.normalizeKey(row.nouveau));
    }
    function ensureRenamedNames(value){
      if(!value||typeof value!=="object") return false;
      let changed=false;
      for(const key of Object.keys(value)){
        const item=value[key];
        if(typeof item==="string"&&RENAMES.has(item)){ value[key]=RENAMES.get(item); changed=true; }
        else if(item&&typeof item==="object"&&ensureRenamedNames(item)) changed=true;
        if(!Array.isArray(value)&&RENAMES.has(key)){
          const next=RENAMES.get(key);
          if(!(next in value)) value[next]=value[key];
          delete value[key];
          changed=true;
        }
      }
      return changed;
    }

    // Un candidat de la Taverne est généré avec les biais du capitaine, comme tout nouveau mercenaire.
    function suitorCount(state){
      const n=1+Math.floor((companyRenown(state).total-SUITORS.base)/SUITORS.step);
      return Math.max(1,Math.min(SUITORS.max,n));
    }

    // Chaque nouveau candidat est le plus réputé de N prétendants tirés avec le même identifiant.
    function candidateFactory(state){
      return ()=>{
        const captain=captainOf(state);
        const id=state.nextId++;
        let mercenary=null;
        for(let i=suitorCount(state);i>0;i--){
          const suitor=generator.createMercenary({id,captain});
          if(!mercenary||suitor.reputation>mercenary.reputation) mercenary=suitor;
        }
        assignAvatar(state,mercenary);
        return mercenary;
      };
    }

    function captainOf(state){
      return state.company.roster.find(m=>m.id===state.company.captainId)||null;
    }

    // L'escouade initiale est sous contrat (décision Idan, 2026-10-04), aux conditions qu'elle demande :
    // salaire demandé et prime de mission demandée (09-reputation §4 et §6). Le capitaine n'a pas de contrat.
    function giveInitialContract(state,mercenary){
      if(mercenary.contract||mercenary.id===state.company.captainId) return false;
      mercenary.contract={dailySalary:Number(mercenary.salary)||0,missionBonus:tavern.missionBonusDemand(mercenary),signedDay:state.day,initial:true};
      return true;
    }

    // Parties sauvegardées avant les contrats initiaux : on les complète. Renvoie true si l'état a changé.
    function ensureInitialContracts(state){
      let changed=false;
      for(const m of rosterOf(state)) changed=giveInitialContract(state,m)||changed;
      return changed;
    }

    // Masse salariale journalière : tous les membres sous contrat, blessés et fatigués compris
    // (la politique de salaire des blessés, 09-reputation §7, n'existe pas encore : taux de 100 %).
    function payroll(state){
      return rosterOf(state).reduce((sum,m)=>sum+(Number(m.contract?.dailySalary)||0),0);
    }

    // Salaire journalier versé chaque jour ; l'or peut passer sous 0 (aucune conséquence définie pour l'instant).
    function paySalaries(state){
      const paid=rosterOf(state).filter(m=>Number(m.contract?.dailySalary)>0);
      const total=payroll(state);
      state.company.gold-=total;
      return {total,count:paid.length};
    }

    function createCampaign({captain,squad=[],companyName=null}){
      const ids=[captain,...squad].map(m=>Number(m.id)||0);
      const state={
        day:1,
        nextId:Math.max(0,...ids)+1,
        company:{
          name:companyName||"Compagnie de "+captain.name,
          gold:STARTING_GOLD,
          captainId:captain.id,
          roster:[captain,...squad],
          intendantId:null,
          camp:{dormitoryCapacity:STARTING_DORMITORY_CAPACITY},
          renownHeritage:[],
          // Armes et armures de rechange de la compagnie, sans propriétaire, listées à l'Intendance (Idan, 2026-10-23
          // et 2026-10-24).
          stock:[...generator.createStartingStock(captain),...generator.createStartingArmorStock(captain),
            ...generator.createStartingBootsStock(captain),...generator.createStartingBeltStock(captain),
            ...generator.createStartingAmuletStock(captain),...generator.createStartingCapeStock(captain)],
          startingArmors:true,
          startingBoots:true,
          startingBelts:true,
          startingAmulets:true,
          startingCapes:true
        },
        tavern:tavern.createTavernState(),
        biographiesUsed:[],
        avatarsRetired:[]
      };
      // L'avatar avant la bio : le sexe vient de l'image (doc 15).
      for(const m of state.company.roster){
        giveInitialContract(state,m);
        assignAvatar(state,m);
        assignBiography(state,m);
      }
      tavern.fillTavern(state.tavern,state.day,candidateFactory(state));
      // Historique (Idan, 2026-10-24) : le capitaine fonde la compagnie, l'escouade de départ l'accompagne.
      History.record(captain,state.day,"founded");
      for(const m of squad) History.record(m,state.day,"joined",{initial:true});
      return state;
    }

    // Dortoir (Idan, 2026-10-24) : un ogre prend deux places, tout autre mercenaire une (halflings, gobelins et gnomes
    // compris ; peoples.json, places_dortoir) ; le capitaine et l'intendant n'en prennent pas.
    const PEOPLE_PLACES=new Map((reference?.peoples?.rows||[]).map(p=>[p.nom,Number(p.places_dortoir)||1]));
    function dormitoryPlaces(mercenary){
      return PEOPLE_PLACES.get(mercenary?.people)||1;
    }
    function dormitoryUsed(state){
      const company=state.company;
      return rosterOf(state).filter(m=>m.id!==company.captainId&&m.id!==company.intendantId)
        .reduce((sum,m)=>sum+dormitoryPlaces(m),0);
    }
    function dormitoryFree(state){
      return state.company.camp.dormitoryCapacity-dormitoryUsed(state);
    }

    // Indisponibilité après mission (10-mission-time §4 à §6) : un blessé ou un fatigué ne peut pas
    // partir en mission tant que son compteur de jours n'est pas écoulé.
    function isAvailable(mercenary){
      return !mercenary.recovery;
    }

    function recoverOneDay(state){
      const recovered=[];
      for(const mercenary of rosterOf(state)){
        if(!mercenary.recovery) continue;
        mercenary.recovery.daysLeft-=1;
        if(mercenary.recovery.daysLeft<=0){
          recovered.push({mercenary,kind:mercenary.recovery.kind});
          delete mercenary.recovery;
        }
      }
      return recovered;
    }

    // Une journée stratégique. Ordre V1 : guérison et repos, salaires du jour, puis Taverne
    // (départs du matin, puis remplissage des places libres).
    function advanceOneDay(state){
      state.day+=1;
      const recovered=recoverOneDay(state);
      const salaries=paySalaries(state);
      const tavernReport=tavern.tavernMorning(state.tavern,state.day,candidateFactory(state));
      return {day:state.day,recovered,salaries,tavern:tavernReport};
    }

    // AdvanceTime(5) = cinq résolutions successives d'une journée. Seul un nombre entier de jours ≥ 0 est accepté.
    function advanceTime(state,days=1){
      if(!Number.isInteger(days)||days<0) throw new RangeError("AdvanceTime : nombre de jours entier ≥ 0 attendu, reçu "+days);
      const reports=[];
      for(let i=0;i<days;i++) reports.push(advanceOneDay(state));
      return reports;
    }

    // §10 — Signature : un accord conclu, et assez de places libres au Dortoir (deux pour un ogre).
    function signCandidate(state,mercenaryId){
      const candidate=tavern.findCandidate(state.tavern,mercenaryId);
      if(!candidate) return {ok:false,reason:"Candidat introuvable."};
      const agreed=candidate.negotiation?.agreed;
      if(!agreed) return {ok:false,reason:"Aucun accord conclu avec ce candidat."};
      const places=dormitoryPlaces(candidate.mercenary);
      if(dormitoryFree(state)<places) return {ok:false,dormFull:true,places,
        reason:places>1?"Dortoir plein : il faut deux places pour un ogre.":"Dortoir plein : impossible de finaliser le recrutement."};
      const mercenary=candidate.mercenary;
      mercenary.contract={dailySalary:agreed.salary,missionBonus:agreed.bonus,signedDay:state.day};
      rosterOf(state).push(mercenary);
      History.record(mercenary,state.day,"joined",{initial:false});
      assignBiography(state,mercenary);
      tavern.removeCandidate(state.tavern,candidate);
      return {ok:true,mercenary};
    }

    // Négociation rompue : le candidat quitte immédiatement la Taverne ; sa place sera remplie le lendemain matin.
    function offerToCandidate(state,mercenaryId,offer){
      const candidate=tavern.findCandidate(state.tavern,mercenaryId);
      if(!candidate) return {outcome:"invalid",reason:"Candidat introuvable."};
      const captain=captainOf(state);
      const bond=captain&&affinity?affinity.memberAffinity(captain,candidate.mercenary):null;
      const result=tavern.makeOffer(candidate,offer,{affinity:bond?.ok?bond.total:0});
      if(result.outcome==="left") tavern.removeCandidate(state.tavern,candidate);
      return result;
    }

    // L'Intendant est un rôle que le joueur assigne à un mercenaire de la compagnie ;
    // sans assignation, la compagnie n'a pas d'Intendant (décision Idan, PR #11).
    function intendantOf(state){
      return rosterOf(state).find(m=>m.id===state.company.intendantId)||null;
    }

    function assignIntendant(state,mercenaryId){
      if(mercenaryId===null||mercenaryId===undefined){ state.company.intendantId=null; return {ok:true,intendant:null}; }
      const mercenary=rosterOf(state).find(m=>m.id===mercenaryId);
      if(!mercenary) return {ok:false,reason:"Seul un membre de la compagnie peut être Intendant."};
      state.company.intendantId=mercenary.id;
      return {ok:true,intendant:mercenary};
    }

    // Bilan de fin de mission appliqué à la compagnie (10-mission-time §7 et §8, décisions Idan du 2026-10-03) :
    // les morts quittent la compagnie, les blessés et les fatigués deviennent indisponibles,
    // la prime de mission de chaque survivant sous contrat est payée, et la mort du capitaine met fin à la partie.
    // aftermath : résultat de MercenairesMissionEnd.resolveMissionEnd. Les participants hors compagnie sont ignorés.
    // Un bilan déjà appliqué ne crédite pas une seconde fois l'XP, la réputation ni les primes.
    const appliedAftermaths=new WeakMap();
    function applyMissionAftermath(state,aftermath){
      if(appliedAftermaths.has(aftermath)) return appliedAftermaths.get(aftermath);
      const report={deaths:[],wounded:[],fatigued:[],bonuses:[],bonusPaid:0,gameOver:false,progression:[],heritage:[]};
      // Classement du début de mission : les morts d'une même mission sont pondérés sur ce même classement,
      // quel que soit l'ordre des résultats (Idan, 2026-10-20).
      const renownBefore=companyRenown(state);
      const standingAtStart=new Map(renownBefore.ranking.map(x=>[x.id,x]));
      for(const result of aftermath.results){
        const roster=rosterOf(state);
        const mercenary=roster.find(m=>m.id===result.id);
        if(!mercenary) continue;
        if(result.dead){
          // Héritage (issue #111) : 20 % de la part du défunt juste avant son retrait, figés pour toujours
          // et comptés une seule fois. Le capitaine n'en laisse pas : sa mort met fin à la partie.
          const standing=standingAtStart.get(mercenary.id);
          const heritage=state.company.renownHeritage||(state.company.renownHeritage=[]);
          if(standing&&!heritage.some(h=>h.id===mercenary.id)){
            const entry={id:mercenary.id,name:mercenary.name,day:state.day,reputation:standing.reputation,
              rank:standing.rank,contribution:standing.contribution,heritage:standing.contribution*RENOWN_HERITAGE_SHARE};
            heritage.push(entry);
            report.heritage.push(entry);
          }
          roster.splice(roster.indexOf(mercenary),1);
          if(state.company.intendantId===mercenary.id) state.company.intendantId=null;
          if(mercenary.avatar?.id) (state.avatarsRetired=state.avatarsRetired||[]).push(mercenary.avatar.id);
          report.deaths.push(mercenary);
          continue;
        }
        // XP naturelle de la mission (08-progression-and-experience.md §2 ; Idan, 2026-10-06) : appliquée
        // en fin de mission aux survivants, y compris ceux qui ont fui le combat.
        // Réputation de carrière (09 §1) : retour de mission, critiques et ennemis blessés / mis hors combat.
        if(progression){
          const xp=progression.gains(result.progress,mercenary);
          const changes=progression.apply(mercenary,xp);
          const gain=progression.reputationGains(result.progress,{wounded:result.wounded});
          report.progression.push({mercenary,xp,changes,reputation:{...gain,...progression.applyReputation(mercenary,gain)}});
        }
        if(result.wounded){
          mercenary.recovery={kind:"wounded",daysLeft:result.woundDays,sinceDay:state.day};
          report.wounded.push(mercenary);
        }else{
          mercenary.recovery={kind:"fatigued",daysLeft:result.fatigueDays,sinceDay:state.day};
          report.fatigued.push(mercenary);
        }
        // Historique : une mission de plus, ses adversaires abattus, ses coups encaissés, sa blessure.
        History.recordMission(mercenary,state.day,{progress:result.progress,wounded:result.wounded,
          days:result.wounded?result.woundDays:result.fatigueDays});
        // §8 — La prime de mission individuelle n'est payée que si le mercenaire revient.
        const bonus=Number(mercenary.contract?.missionBonus)||0;
        if(bonus>0){
          state.company.gold-=bonus;
          report.bonusPaid+=bonus;
          report.bonuses.push({mercenary,bonus});
        }
      }
      if(aftermath.captainDead){
        state.gameOver={day:state.day,reason:"captain-dead"};
        report.gameOver=true;
      }
      report.renown={before:renownBefore.total,after:companyRenown(state).total};
      appliedAftermaths.set(aftermath,report);
      return report;
    }

    function askCandidate(state,mercenaryId,key){
      const candidate=tavern.findCandidate(state.tavern,mercenaryId);
      if(!candidate) return {ok:false,reason:"Candidat introuvable."};
      return tavern.askQuestion(candidate,key,intendantOf(state));
    }

    // Conseils du tavernier : chaque question coûte de l'or (tavern.advice.cost), même déjà posée.
    function askTavernkeeper(state,mercenaryId,key,value){
      const candidate=tavern.findCandidate(state.tavern,mercenaryId);
      if(!candidate) return {ok:false,reason:"Candidat introuvable."};
      const cost=referenceConstant(reference,"tavern.advice.cost",1);
      if(state.company.gold<cost) return {ok:false,reason:"gold",cost};
      const result=tavern.rumor(candidate,key,value);
      if(!result) return {ok:false,reason:"Valeur inconnue : "+key};
      state.company.gold-=cost;
      return {ok:true,cost,...result};
    }

    return {
      STARTING_GOLD,
      STARTING_DORMITORY_CAPACITY,
      createCampaign,
      advanceTime,
      dormitoryFree,
      dormitoryUsed,
      dormitoryPlaces,
      signCandidate,
      offerToCandidate,
      askTavernkeeper,
      intendantOf,
      assignIntendant,
      askCandidate,
      isAvailable,
      applyMissionAftermath,
      companyRenown,
      suitorCount,
      assignBiography,
      ensureBiographies,
      ensureInitialContracts,
      ensureAvatars,
      ensureRenamedNames,
      ensureStartingStock,
      ensureHistories,
      payroll
    };
  }

  return {createCampaignRules,serializeCampaign,restoreCampaign,SAVE_VERSION};
});
