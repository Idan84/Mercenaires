"use strict";

// État de partie persistant (07-architecture.md) et horloge stratégique unique AdvanceTime(days),
// résolue jour par jour (10-mission-time-and-unavailability.md). L'état est un objet JSON pur.
(function(root,factory){
  const history=typeof module!=="undefined"&&module.exports?require("./history.js"):root.MercenairesHistory;
  const regeneration=typeof module!=="undefined"&&module.exports?require("./regeneration.js"):root.MercenairesRegeneration;
  // Entraînement libre à l'École de magie (facultatif hors du jeu : une page sans ce script n'a pas d'entraînement).
  const training=typeof module!=="undefined"&&module.exports?require("./school-training.js"):root.MercenairesSchoolTraining;
  // Apprentissage des sorts à l'École (facultatif de même).
  const study=typeof module!=="undefined"&&module.exports?require("./spell-study.js"):root.MercenairesSpellStudy;
  // Postes du camp : le directeur de l'École et les maîtres.
  const posts=typeof module!=="undefined"&&module.exports?require("./camp-posts.js"):root.MercenairesCampPosts;
  // Ports d'armure : pas d'armure sans son port.
  const armorPorts=typeof module!=="undefined"&&module.exports?require("./armor-ports.js"):root.MercenairesArmorPorts;
  // Apprendre un port d'armure à l'Académie (facultatif hors du jeu, comme l'apprentissage des sorts).
  const armorStudy=typeof module!=="undefined"&&module.exports?require("./armor-study.js"):root.MercenairesArmorStudy;
  // Cabane du bûcheron : les bûcherons du jour accélèrent les chantiers (facultatif hors du jeu, de même).
  const lumber=typeof module!=="undefined"&&module.exports?require("./lumber.js"):root.MercenairesLumber;
  // L'agenda : les apprentissages et les corvées qui retiennent un mercenaire au camp, en une seule liste.
  const agenda=typeof module!=="undefined"&&module.exports?require("./agenda.js"):root.MercenairesAgenda;
  // Le Cachot : on peut y jeter n'importe quel membre (facultatif hors du jeu, de même).
  const dungeon=typeof module!=="undefined"&&module.exports?require("./dungeon.js"):root.MercenairesDungeon;
  // La désertion : le test du matin, la Tour de guet, la scène (facultatif hors du jeu, de même).
  const desertion=typeof module!=="undefined"&&module.exports?require("./desertion.js"):root.MercenairesDesertion;
  const api=factory(history,regeneration,training,study,posts,armorPorts,armorStudy,lumber,agenda,dungeon,desertion);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesCampaign=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(History,Regeneration,Training,Study,Posts,ArmorPorts,ArmorStudy,Lumber,Agenda,Dungeon,Desertion){
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
  // missions (facultatif) : createMissionRules(...) de game-core/missions.js (tableau des contrats de la Taverne).
  // lieutenants : règles des lieutenants (lieutenants.js) ; leurs demandes de la veille sont jouées chaque matin.
  // bodyguard : règles des missions de garde du corps (bodyguard.js).
  // merchants (facultatif) : createMerchantRules(...) de game-core/merchants.js (le marchand du jour, doc 18).
  function createCampaignRules({generator,tavern,reference,biographies=null,avatars=null,progression=null,affinity=null,names=null,missions=null,lieutenants=null,bodyguard=null,magic=null,merchants=null,statOf=null,random=Math.random}){
    const STARTING_GOLD=referenceConstant(reference,"company.gold.initial",10000);
    // Régénération (sang de troll ; Idan, 2026-11-01) : une blessure guérit plus vite au camp (regeneration.js).
    const regeneration=Regeneration?Regeneration.createRegenerationRules({reference}):null;
    // Dispensaire (Idan, 2026-11-01) : la durée, déjà bornée de 7 à 60 jours, × (1 − 10 % par niveau), au moins 1 jour.
    const woundDaysFor=(mercenary,days,state=null)=>{
      const base=regeneration?regeneration.campDays(mercenary,days):days;
      const factor=state?woundCareFactor(state):1;
      return factor<1&&base>0?Math.max(1,Math.ceil(base*factor-1e-9)):base;
    };
    // Médecin (Idan, 2026-11-01 ; nomination : medic.js) : en poste, il raccourcit les blessures de Médecine / 250, en
    // plus du Dispensaire ; il apporte sa Médecine en Renommée ; il gagne 10 XP de Médecine par jour de blessure guéri.
    const MEDIC={divisor:referenceConstant(reference,"medic.wound.skill_divisor",250),renown:referenceConstant(reference,"medic.renown.skill_share",1),
      xpPerDay:referenceConstant(reference,"medic.xp.per_wound_day",10)};
    function medicOf(state){
      const id=state?.company?.medicId;
      return id==null?null:(state.company.roster||[]).find(m=>m.id===id)||null;
    }
    const medicSkill=state=>Math.max(0,Number(medicOf(state)?.skills?.camp?.["Médecine"])||0);
    function medicCareFactor(state){ return medicOf(state)?Math.max(0,1-medicSkill(state)/MEDIC.divisor):1; }
    function medicRenown(state){ return medicOf(state)?Math.round(MEDIC.renown*medicSkill(state)):0; }
    // Directeur de l'École de magie (Idan, 2026-11-01) et maîtres du Ludus, de l'Académie et du Cercle (Idan, 2026-11-03) ;
    // nomination : school-director.js ; postes : camp-posts.js. Chacun aide à l'entraînement libre dans son bâtiment.
    const postOf=(state,m)=>Posts?Posts.postOf(state,m):null;
    function directorOf(state){
      const id=state?.company?.directorId;
      return id==null?null:(state.company.roster||[]).find(m=>m.id===id)||null;
    }
    // Hors mission, comme l'intendant : ni dortoir, ni mission, ni garde du corps (médecin, directeur de l'École, maîtres).
    const offField=(state,m)=>m.id===state.company.intendantId||(state.company.medicId!=null&&m.id===state.company.medicId)||Boolean(postOf(state,m));
    // Bains chauds (Idan, 2026-11-01) : un jour de fatigue de moins par niveau, au moins 1 jour.
    const fatigueDaysFor=(days,state)=>Math.max(1,(Number(days)||0)-fatigueRelief(state));
    const STARTING_DORMITORY_CAPACITY=referenceConstant(reference,"camp.dormitory.initial_capacity",25);
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
        heritage:heritageEntries.reduce((sum,x)=>sum+(Number(x.heritage)||0),0),
        // Points de mission (doc 09 §2) : pour l'instant, la renommée perdue sur un contrat échoué (doc 17 §8).
        missions:Number(state.company.missionRenown)||0,
        // Camp (Idan, 2026-10-25) : la Renommée des niveaux de qualité atteints par le dortoir.
        camp:dormitoryQualityRenown(state),
        // Médecin (Idan, 2026-11-01) : sa Médecine, tant qu'il est en poste.
        medic:medicRenown(state)
      };
      return {total:parts.captain+parts.members+parts.heritage+parts.missions+parts.camp+parts.medic,parts,ranking,heritageEntries};
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

    // Armures, bottes, ceintures, amulettes, capes, gants, culottes et bagues du stock (Idan, 2026-10-24) : donnés une seule
    // fois, même à
    // une partie commencée avant.
    // Arme à deux mains (Idan, 2026-10-25 : la fronde passe à deux mains) : dans une partie commencée avant, l'objet tenu
    // en main secondaire avec elle retourne à l'Intendance, sans propriétaire.
    const TWO_HANDED=new Set((reference?.weapons?.rows||[]).filter(w=>w.prise==="2 mains").map(w=>w.nom));
    function ensureTwoHandedGrips(state){
      let changed=false;
      for(const m of rosterOf(state)){
        const slots=m.equipment?.slots||{},held=id=>(m.items||[]).find(item=>item.id===id)||null;
        for(const set of [1,2]){
          const main=held(slots[`weapon_set_${set}_main`]),off=held(slots[`weapon_set_${set}_off`]);
          if(!main||!off||!TWO_HANDED.has(main.name)) continue;
          m.items=m.items.filter(item=>item!==off);
          slots[`weapon_set_${set}_off`]=null;
          if(!Array.isArray(state.company.stock)) state.company.stock=[];
          state.company.stock.push({...off,owner:null,slot:null});
          changed=true;
        }
      }
      return changed;
    }

    // Combat à une main (Idan, 2026-11-02) : dans une partie commencée avant, les mercenaires et les candidats de la Taverne
    // reçoivent le style, comme à la génération mais sans tirage : leur meilleure arme de mêlée à une main.
    const ONE_HAND_MELEE=(reference?.weapons?.rows||[]).filter(w=>["1 main","Au choix"].includes(w.prise)
      &&!/Armes de tir|Armes à feu|Boucliers/.test(String(w.domaine||""))).map(w=>w.nom);
    function ensureOneHandedStyle(state){
      let changed=false;
      for(const m of [...rosterOf(state),...(state.tavern?.candidates||[]).map(c=>c.mercenary)]){
        const martial=m?.skills?.martial;
        if(!martial||"Combat à une main" in martial) continue;
        martial["Combat à une main"]=Math.max(0,...ONE_HAND_MELEE.map(name=>Number(martial[name])||0));
        changed=true;
      }
      return changed;
    }
    // Ancienne partie (Idan, 2026-11-03 : sans le port de son type, pas d'armure) : une armure portée sans son port
    // retourne dans l'inventaire du mercenaire, au dortoir.
    const armorPorts=ArmorPorts?ArmorPorts.createArmorPorts(reference):null;
    function ensureArmorPorts(state){
      if(!armorPorts) return false;
      let changed=false;
      for(const m of rosterOf(state)){
        const slots=m?.equipment?.slots,id=slots?.armor;
        const item=id?(m.items||[]).find(x=>x.id===id):null;
        if(!item||armorPorts.canWear(m,item).ok) continue;
        slots.armor=null;
        item.slot=null;
        changed=true;
      }
      return changed;
    }

    // Primes de mission divisées par deux (Idan, 2026-10-25 : « les temps sont durs ») : dans une partie commencée avant,
    // les contrats signés et les négociations en cours à la Taverne, une seule fois.
    function ensureHalvedMissionBonuses(state){
      if(state.company.missionBonusHalved) return false;
      const half=value=>Math.round((Number(value)||0)/2);
      for(const m of rosterOf(state)) if(m.contract&&m.contract.missionBonus!=null) m.contract.missionBonus=half(m.contract.missionBonus);
      for(const candidate of state.tavern?.candidates||[]){
        const n=candidate.negotiation;
        if(!n) continue;
        n.bonus=half(n.bonus);
        if(n.refused) n.refused.bonus=half(n.refused.bonus);
        if(n.agreed) n.agreed.bonus=half(n.agreed.bonus);
      }
      state.company.missionBonusHalved=true;
      return true;
    }

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
      if(!company.startingGloves){
        if(captain) company.stock.push(...generator.createStartingGlovesStock(captain));
        company.startingGloves=true;
        changed=true;
      }
      if(!company.startingPants){
        if(captain) company.stock.push(...generator.createStartingPantsStock(captain));
        company.startingPants=true;
        changed=true;
      }
      if(!company.startingRings){
        if(captain) company.stock.push(...generator.createStartingRingStock(captain));
        company.startingRings=true;
        changed=true;
      }
      // Casques et chapeaux (Idan, 2026-10-25) : 1D6, comme les autres objets à bonus.
      if(!company.startingHelmets){
        if(captain&&generator.createStartingHelmetStock) company.stock.push(...generator.createStartingHelmetStock(captain));
        company.startingHelmets=true;
        changed=true;
      }
      // Potions et fioles (Idan, 2026-10-29) : les parties en cours les reçoivent aussi.
      if(!company.startingPotions){
        if(captain&&generator.createStartingPotionStock) company.stock.push(...generator.createStartingPotionStock(captain));
        company.startingPotions=true;
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
    // Au cachot, pas de salaire (Idan, 2026-11-04).
    const salaried=state=>rosterOf(state).filter(m=>!m.dungeon);
    function payroll(state){
      return salaried(state).reduce((sum,m)=>sum+(Number(m.contract?.dailySalary)||0),0);
    }

    // Salaire journalier versé chaque jour ; l'or peut passer sous 0 (aucune conséquence définie pour l'instant).
    function paySalaries(state){
      const paid=salaried(state).filter(m=>Number(m.contract?.dailySalary)>0);
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
          medicId:null,
          directorId:null,
          doctoreId:null,
          veteranId:null,
          bladeMasterId:null,
          alchemistId:null,
          pleasureMasterId:null,
          camp:{dormitoryCapacity:STARTING_DORMITORY_CAPACITY},
          renownHeritage:[],
          // Armes et armures de rechange de la compagnie, sans propriétaire, listées à l'Intendance (Idan, 2026-10-23
          // et 2026-10-24).
          stock:[...generator.createStartingStock(captain),...generator.createStartingArmorStock(captain),
            ...generator.createStartingBootsStock(captain),...generator.createStartingBeltStock(captain),
            ...generator.createStartingAmuletStock(captain),...generator.createStartingCapeStock(captain),
            ...generator.createStartingGlovesStock(captain),...generator.createStartingPantsStock(captain),
            ...generator.createStartingRingStock(captain),...generator.createStartingHelmetStock(captain),
            ...(generator.createStartingPotionStock?generator.createStartingPotionStock(captain):[])],
          missionBonusHalved:true,
          startingArmors:true,
          startingBoots:true,
          startingBelts:true,
          startingAmulets:true,
          startingCapes:true,
          startingGloves:true,
          startingPants:true,
          startingRings:true,
          startingHelmets:true,
          startingPotions:true
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
      // Places de la Taverne : 3 + niveau de renommée (Idan, 2026-11-04).
      if(tavern.slotsFor) state.tavern.slots=tavern.slotsFor(companyRenown(state).total);
      tavern.fillTavern(state.tavern,state.day,candidateFactory(state));
      fillTavernBoard(state);
      // Historique (Idan, 2026-10-24) : le capitaine fonde la compagnie, l'escouade de départ l'accompagne.
      History.record(captain,state.day,"founded");
      for(const m of squad) History.record(m,state.day,"joined",{initial:true});
      return state;
    }

    // Dortoir (Idan, 2026-10-24) : un ogre prend deux places ; un halfling, un gnome ou un gobelin une demi ; tout autre
    // mercenaire une (peoples.json, places_dortoir) ; le capitaine et l'intendant n'en prennent pas.
    const PEOPLE_PLACES=new Map((reference?.peoples?.rows||[]).map(p=>[p.nom,Number(p.places_dortoir)||1]));
    function dormitoryPlaces(mercenary){
      return PEOPLE_PLACES.get(mercenary?.people)||1;
    }
    function dormitoryUsed(state){
      const company=state.company;
      return rosterOf(state).filter(m=>m.id!==company.captainId&&!offField(state,m))
        .reduce((sum,m)=>sum+dormitoryPlaces(m),0);
    }
    function dormitoryFree(state){
      return state.company.camp.dormitoryCapacity-dormitoryUsed(state);
    }

    // Agrandir le dortoir (Idan, 2026-10-25) : +5 places à chaque agrandissement, sans limite ; chacun coûte plus d'or
    // et de jours que le précédent. Le k-ième (k = 1 pour passer de 25 à 30 places) coûte 100 × 1,2^(k−1) PO, arrondi à
    // 10, et dure 2 + ⌊(k−1)/3⌋ jours (camp.dormitory.expansion_*). Un chantier à la fois ; l'or est payé au lancement,
    // les places sont prêtes le jour où le chantier se termine.
    const DORM_EXPANSION={
      places:referenceConstant(reference,"camp.dormitory.expansion_places",5),
      gold:referenceConstant(reference,"camp.dormitory.expansion_gold_base",100),
      growth:referenceConstant(reference,"camp.dormitory.expansion_gold_growth",1.2),
      days:referenceConstant(reference,"camp.dormitory.expansion_days_base",2),
      every:referenceConstant(reference,"camp.dormitory.expansion_days_every",3)
    };
    function dormitoryExpansionCost(number){
      return {number,places:DORM_EXPANSION.places,
        gold:Math.round(DORM_EXPANSION.gold*Math.pow(DORM_EXPANSION.growth,number-1)/10)*10,
        days:DORM_EXPANSION.days+Math.floor((number-1)/DORM_EXPANSION.every)};
    }
    // Le prochain agrandissement, ou celui qui est en chantier.
    function nextDormitoryExpansion(state){
      return dormitoryExpansionCost((Number(state.company.camp.dormitoryExpansions)||0)+1);
    }
    function startDormitoryExpansion(state){
      const camp=state.company.camp;
      if(camp.construction) return {ok:false,reason:"Un chantier est déjà en cours au dortoir."};
      const next=nextDormitoryExpansion(state);
      if(state.company.gold<next.gold) return {ok:false,reason:"Pas assez d’or : il faut "+next.gold+" PO.",cost:next};
      state.company.gold-=next.gold;
      camp.construction={kind:"dormitory",...next,startDay:state.day,endDay:state.day+next.days};
      return {ok:true,construction:camp.construction};
    }

    // Qualité du dortoir (Idan, 2026-10-25) : dix niveaux au-dessus du niveau 0 (dormitory-quality.json : nom, prix,
    // jours, Renommée, affinité). Même chantier que l'agrandissement : un seul à la fois au dortoir. À la fin du chantier,
    // la compagnie gagne la Renommée du niveau, pour de bon, et chaque membre de la compagnie (en expédition compris ;
    // pas le capitaine) gagne l'affinité du niveau avec le capitaine. Les recrues arrivées après n'ont rien.
    const QUALITY_LEVELS=(reference?.dormitoryQuality?.rows||[]).slice().sort((a,b)=>a.niveau-b.niveau);
    function dormitoryQualityLevel(state){ return Number(state.company.camp?.dormitoryQuality)||0; }
    function dormitoryQuality(state){
      const level=dormitoryQualityLevel(state);
      return QUALITY_LEVELS.find(q=>q.niveau===level)||{niveau:level,nom:"Niveau "+level};
    }
    function dormitoryQualityRenown(state){
      const level=dormitoryQualityLevel(state);
      return QUALITY_LEVELS.filter(q=>q.niveau>0&&q.niveau<=level).reduce((sum,q)=>sum+(Number(q.renommee)||0),0);
    }
    // Le prochain niveau, ou null au niveau maximal.
    function nextDormitoryQuality(state){
      const row=QUALITY_LEVELS.find(q=>q.niveau===dormitoryQualityLevel(state)+1);
      return row?{level:row.niveau,name:row.nom,gold:Number(row.prix)||0,days:Number(row.jours)||0,
        renown:Number(row.renommee)||0,affinity:Number(row.affinite)||0}:null;
    }
    function startDormitoryQuality(state){
      const camp=state.company.camp;
      if(camp.construction) return {ok:false,reason:"Un chantier est déjà en cours au dortoir."};
      const next=nextDormitoryQuality(state);
      if(!next) return {ok:false,reason:"Le dortoir est déjà au niveau de qualité maximal."};
      if(state.company.gold<next.gold) return {ok:false,reason:"Pas assez d’or : il faut "+next.gold+" PO.",cost:next};
      state.company.gold-=next.gold;
      camp.construction={kind:"dormitory_quality",...next,startDay:state.day,endDay:state.day+next.days};
      return {ok:true,construction:camp.construction};
    }

    // Quartiers du lieutenant (Idan, 2026-10-25) : ils se construisent au dortoir, un par niveau pair de qualité (le
    // premier dès le niveau 0, le deuxième au niveau 2… le sixième au niveau 10). Le k-ième coûte 1 000 × k² PO et dure
    // 5 × k jours (camp.lieutenant_quarter.*, formule de JC). Même chantier que le dortoir : un seul à la fois. Un
    // quartier loge un lieutenant.
    const LIEUTENANT_QUARTER={
      gold:referenceConstant(reference,"camp.lieutenant_quarter.gold_base",1000),
      days:referenceConstant(reference,"camp.lieutenant_quarter.days_base",5),
      step:referenceConstant(reference,"camp.lieutenant_quarter.quality_step",2)
    };
    const MAX_DORMITORY_QUALITY=QUALITY_LEVELS.length?QUALITY_LEVELS[QUALITY_LEVELS.length-1].niveau:10;
    function lieutenantQuarters(state){ return Number(state.company.camp?.lieutenantQuarters)||0; }
    function lieutenantQuarterCost(number){
      return {number,gold:LIEUTENANT_QUARTER.gold*number*number,days:LIEUTENANT_QUARTER.days*number,
        quality:LIEUTENANT_QUARTER.step*(number-1)};
    }
    // Le prochain quartier, avec le niveau de dortoir qu'il demande ; null quand tous sont construits.
    function nextLieutenantQuarter(state){
      const next=lieutenantQuarterCost(lieutenantQuarters(state)+1);
      return next.quality<=MAX_DORMITORY_QUALITY?next:null;
    }
    function startLieutenantQuarter(state){
      const camp=state.company.camp;
      if(camp.construction) return {ok:false,reason:"Un chantier est déjà en cours au dortoir."};
      const next=nextLieutenantQuarter(state);
      if(!next) return {ok:false,reason:"Tous les quartiers du lieutenant sont construits."};
      if(dormitoryQualityLevel(state)<next.quality) return {ok:false,reason:"Il faut un dortoir de niveau "+next.quality+".",cost:next};
      if(state.company.gold<next.gold) return {ok:false,reason:"Pas assez d’or : il faut "+next.gold+" PO.",cost:next};
      state.company.gold-=next.gold;
      camp.construction={kind:"lieutenant_quarter",...next,startDay:state.day,endDay:state.day+next.days};
      return {ok:true,construction:camp.construction};
    }

    // Chaque matin : le chantier terminé ajoute ses places au dortoir, monte sa qualité ou livre un quartier du lieutenant.
    function advanceConstruction(state){
      const camp=state.company.camp,work=camp.construction;
      if(!work||state.day<work.endDay) return null;
      camp.construction=null;
      if(work.kind==="lieutenant_quarter"){
        camp.lieutenantQuarters=work.number;
        return {kind:work.kind,number:work.number};
      }
      if(work.kind==="dormitory_quality"){
        camp.dormitoryQuality=work.level;
        const members=rosterOf(state).filter(m=>m.id!==state.company.captainId);
        for(const m of members) m.affinityAcquired=(Number(m.affinityAcquired)||0)+work.affinity;
        return {kind:work.kind,level:work.level,name:work.name,renown:work.renown,affinity:work.affinity,members:members.length};
      }
      camp.dormitoryCapacity+=work.places;
      camp.dormitoryExpansions=work.number;
      return {kind:work.kind,places:work.places,capacity:camp.dormitoryCapacity};
    }

    // Bâtiments du camp (Idan, 2026-11-01 ; camp-buildings.json, doc 11 §7 et §9) : le Dispensaire raccourcit les
    // blessures, les Bains chauds la fatigue et rechargent plus de mana ; l'École de magie (10 niveaux) et ses salles, une
    // par école de magie, n'ont pas encore d'effet. Le niveau n coûte prix_base × n² PO et jours_base × n jours. Un
    // chantier par bâtiment (chaque salle a le sien), en parallèle de celui du dortoir ; l'or est payé au lancement, le
    // niveau est atteint le matin du dernier jour. Une salle (colonne requiert) monte au plus jusqu'au niveau atteint par
    // son bâtiment : le niveau en chantier ne compte pas.
    const CAMP_BUILDINGS=new Map((reference?.campBuildings?.rows||[]).map(row=>[row.code,row]));
    function campBuildingRow(code){ return CAMP_BUILDINGS.get(code)||null; }
    function campBuildingCodes(){ return [...CAMP_BUILDINGS.keys()]; }
    // Les salles d'un bâtiment (École de magie : une par école), dans l'ordre des données.
    function campRoomCodes(parent){ return [...CAMP_BUILDINGS.values()].filter(row=>row.requiert===parent).map(row=>row.code); }
    function buildingLevel(state,code){ return Number(state?.company?.camp?.buildings?.[code]?.level)||0; }
    function buildingWork(state,code){ return state?.company?.camp?.buildings?.[code]?.construction||null; }
    // Places de l'École de magie et de ses salles (Idan, 2026-11-01) : 1 place, +1 tous les 2 niveaux (places_base +
    // ⌊niveau ÷ places_pas⌋), 6 au niveau 10 ; aucune avant la construction, ni pour un bâtiment sans places.
    function buildingPlaces(state,code){
      const row=CAMP_BUILDINGS.get(code),level=buildingLevel(state,code),step=Number(row?.places_pas)||0;
      return level>0&&step>0?(Number(row.places_base)||0)+Math.floor(level/step):0;
    }
    // Le prochain niveau ; pour une salle, requires dit le niveau du bâtiment qu'il faut d'abord atteindre (locked).
    function nextBuildingLevel(state,code){
      const row=CAMP_BUILDINGS.get(code);
      if(!row) return null;
      const level=buildingLevel(state,code)+1;
      if(level>(Number(row.niveaux)||0)) return null;
      const next={code,name:row.nom,level,gold:(Number(row.prix_base)||0)*level*level,days:(Number(row.jours_base)||0)*level};
      const parent=row.requiert?CAMP_BUILDINGS.get(row.requiert):null;
      if(parent){
        next.requires={code:parent.code,name:parent.nom,level};
        next.locked=buildingLevel(state,parent.code)<level;
      }
      return next;
    }
    function startBuilding(state,code){
      const row=CAMP_BUILDINGS.get(code);
      if(!row) return {ok:false,reason:"Bâtiment inconnu."};
      const camp=state.company.camp;
      camp.buildings=camp.buildings||{};
      const building=camp.buildings[code]||(camp.buildings[code]={level:0,construction:null});
      if(building.construction) return {ok:false,reason:"Un chantier est déjà en cours : "+row.nom+"."};
      const next=nextBuildingLevel(state,code);
      if(!next) return {ok:false,reason:row.nom+" : niveau maximal."};
      if(next.locked) return {ok:false,reason:row.nom+" : il faut d’abord "+next.requires.name+" au niveau "+next.level+".",cost:next};
      if(state.company.gold<next.gold) return {ok:false,reason:"Pas assez d’or : il faut "+next.gold+" PO.",cost:next};
      state.company.gold-=next.gold;
      const {requires,locked,...work}=next;
      building.construction={kind:"building",...work,startDay:state.day,endDay:state.day+next.days};
      return {ok:true,construction:building.construction};
    }
    // Entraînement libre à l'École de magie (Idan, 2026-11-02 ; règles : school-training.js) : chaque matin, le capitaine à
    // la place choisie par le joueur, puis les autres mercenaires disponibles (au camp, ni blessés, ni fatigués, ni en
    // mission, ni intendant, médecin ou directeur) dans un ordre tiré au hasard. La journée est gardée dans
    // camp.schoolDay pour l'affichage.
    const schoolTraining=Training?Training.createSchoolTrainingRules({reference,random,affinity,progression}):null;
    const SCHOOL_HALL="magic_school";
    // Les salles construites : la salle généraliste (l'École elle-même) puis les salles des écoles.
    function schoolRooms(state){
      if(!(buildingLevel(state,SCHOOL_HALL)>0)) return [];
      return [SCHOOL_HALL,...campRoomCodes(SCHOOL_HALL)].filter(code=>buildingLevel(state,code)>0).map(code=>({
        code,name:CAMP_BUILDINGS.get(code).nom,school:CAMP_BUILDINGS.get(code).ecole||null,
        level:buildingLevel(state,code),places:buildingPlaces(state,code)}));
    }
    // Bâtiments d'entraînement (Idan, 2026-11-03) : l'École de magie, le Ludus, l'Académie de la survie et le Cercle des
    // Fines Lames (ceux qui ont des places) ; chaque salle principale construite, puis ses ailes construites, avec ce
    // qu'elles travaillent (entraine, l'école, ou la Puissance magique pour la salle généraliste) et la caractéristique
    // qui fait le gain (apprend_avec du bâtiment).
    // Un bâtiment sans places à lui compte aussi s'il a une salle d'entraînement : les Bains chauds et leur Sauna (Idan,
    // 2026-11-04) ; sa salle principale, sans places, n'entraîne rien.
    const hasPlaces=row=>Number(row?.places_pas)>0;
    const TRAINING_HALLS=[...CAMP_BUILDINGS.values()].filter(row=>!row.requiert
      &&(hasPlaces(row)||campRoomCodes(row.code).some(code=>hasPlaces(CAMP_BUILDINGS.get(code))))).map(row=>row.code);
    function trainingRooms(state){
      const rooms=[];
      for(const hall of TRAINING_HALLS){
        if(!(buildingLevel(state,hall)>0)) continue;
        const hallRow=CAMP_BUILDINGS.get(hall);
        for(const code of [hall,...campRoomCodes(hall)].filter(code=>buildingLevel(state,code)>0&&hasPlaces(CAMP_BUILDINGS.get(code)))){
          const row=CAMP_BUILDINGS.get(code);
          rooms.push({code,building:hall,name:row.nom,label:code===SCHOOL_HALL?"Salle généraliste":row.nom,school:row.ecole||null,
            trains:row.entraine||row.ecole||(code===SCHOOL_HALL?"Puissance magique":null),learnWith:hallRow.apprend_avec||"Intelligence",
            level:buildingLevel(state,code),places:buildingPlaces(state,code)});
        }
      }
      return rooms;
    }
    // L'agenda (agenda.js ; Idan, 2026-11-04) : chaque apprentissage et chaque corvée y est inscrit une fois, et lui demande
    // ce qui retient un mercenaire ailleurs ; une seule activité à la fois, une seule corvée par jour.
    const agenda=Agenda?Agenda.createAgenda():null;
    const elsewhere=key=>(state,id)=>agenda?agenda.elsewhere(key,state,id):null;
    // Apprentissage des sorts (Idan, 2026-11-02 ; règles : spell-study.js) : l'élève prend une place dans la salle de
    // l'école du sort, avant l'entraînement libre ; élève et professeur restent au camp jusqu'à la fin.
    const spellStudy=Study?Study.createSpellStudyRules({reference,random,affinity,progression,camp:{
      roomOfSchool:school=>{
        const row=[...CAMP_BUILDINGS.values()].find(r=>r.requiert===SCHOOL_HALL&&r.ecole===school);
        return row?{code:row.code,name:row.nom}:null;
      },
      buildingLevel,buildingPlaces,directorOf,expeditionOf,busyElsewhere:elsewhere("spell")}}):null;
    // Apprendre un port d'armure à l'Académie, l'Empoisonnement des armes au Labo d'alchimie (Idan, 2026-11-03 ; règles :
    // armor-study.js) : une place de la salle principale, avant l'entraînement libre ; l'élève reste au camp jusqu'à la fin.
    const holderOfPost=key=>state=>Posts?Posts.holderOf(state,Posts.postByKey(key)):null;
    const aptitudeRules=(course,masterKey)=>ArmorStudy?ArmorStudy.createAptitudeStudyRules({reference,random,affinity,progression,course,camp:{
      buildingLevel,buildingPlaces,expeditionOf,masterOf:holderOfPost(masterKey),busyElsewhere:elsewhere(course)}}):null;
    const armorStudy=aptitudeRules("armor","veteran");
    const poisonStudy=aptitudeRules("poison","alchemist");
    // Cabane du bûcheron (Idan, 2026-11-03) et Guilde des mineurs (Idan, 2026-11-04) (règles : lumber.js) : les bûcherons et
    // les mineurs du jour, retenus au camp toute la journée.
    const campWorks=state=>[state.company.camp.construction,...Object.values(state.company.camp.buildings||{}).map(b=>b?.construction)].filter(Boolean);
    const campWorkRules=course=>Lumber?Lumber.createLumberRules({reference,random,affinity,course,camp:{
      buildingLevel,expeditionOf,offField:(state,m)=>offField(state,m),works:campWorks,busyElsewhere:elsewhere(course),
      masterOf:holderOfPost("pleasureMaster")}}):null;
    const lumberjacks=campWorkRules("lumber");
    const miners=campWorkRules("mine");
    // Palais des plaisirs (Idan, 2026-11-04) : on y fait travailler des mercenaires, qui rapportent de l'or.
    const palaceWorkers=campWorkRules("palace");
    // L'ordre d'inscription est celui des raisons affichées.
    // Le Cachot (Idan, 2026-11-04 ; règles : dungeon.js) : en y entrant, il perd son poste, quitte sa corvée et son
    // apprentissage (les règles de chacun : sortir de l'École coûte ce que ça coûte) ; il y reste jusqu'à ce qu'on le libère.
    function leaveForDungeon(state,m){
      const company=state.company,left=[],since=key=>Math.max(0,state.day-(Number(company[key])||state.day));
      const addDays=(key,days)=>{ const h=History.historyOf(m); h[key]=(Number(h[key])||0)+days; };
      if(company.intendantId===m.id){ addDays("stewardDays",since("intendantSince")); company.intendantId=null; delete company.intendantSince; left.push("steward"); }
      if(company.medicId!=null&&company.medicId===m.id){ addDays("medicDays",since("medicSince")); company.medicId=null; delete company.medicSince; left.push("medic"); }
      for(const post of Posts?Posts.POSTS:[]){
        if(company[post.key+"Id"]!==m.id) continue;
        addDays(post.key+"Days",since(post.key+"Since"));
        company[post.key+"Id"]=null; delete company[post.key+"Since"]; left.push(post.key);
      }
      if((company.lieutenantIds||[]).includes(m.id)){ company.lieutenantIds=company.lieutenantIds.filter(id=>id!==m.id); left.push("lieutenant"); }
      for(const chores of [lumberjacks,miners,palaceWorkers]) if(chores?.entryOf(state,m.id)){ chores.withdraw(state,m.id); left.push(chores.course); }
      const own=spellStudy?.studyOf(state,m.id);
      if(own){ spellStudy.stop(state,own.id); left.push("spell"); }
      const taught=spellStudy?.studiesOf(state).find(s=>s.teacherId===m.id);
      if(taught){ spellStudy.releaseTeacher(state,taught.id); left.push("teach"); }
      for(const aptitude of [armorStudy,poisonStudy]){
        const study=aptitude?.studyOf(state,m.id);
        if(study){ aptitude.stop(state,study.id); left.push(aptitude.course); }
      }
      return left;
    }
    const dungeonRules=Dungeon?Dungeon.createDungeonRules({reference,camp:{buildingLevel,expeditionOf,leave:leaveForDungeon}}):null;
    // Héritage (issue #111) : 20 % de la part du défunt juste avant son retrait (standing : sa place au classement), figés
    // pour toujours et comptés une seule fois. Le capitaine n'en laisse pas : sa mort met fin à la partie.
    function recordHeritage(state,mercenary,standing){
      const heritage=state.company.renownHeritage||(state.company.renownHeritage=[]);
      if(!standing||heritage.some(h=>h.id===mercenary.id)) return null;
      const entry={id:mercenary.id,name:mercenary.name,day:state.day,reputation:standing.reputation,
        rank:standing.rank,contribution:standing.contribution,heritage:standing.contribution*RENOWN_HERITAGE_SHARE};
      heritage.push(entry);
      return entry;
    }
    // Il quitte la compagnie (désertion, duel ; Idan, 2026-11-04) : poste, corvée, apprentissage (comme pour le Cachot) ;
    // son avatar n'est plus tiré à la Taverne. Déserteur : il part avec ce qu'il porte et son sac (« il part avec son sac
    // aussi ! »). Mort en duel : héritage de renommée (« Il est mort dans un combat ») ; ses affaires vont à l'Intendance.
    function leaveCompany(state,m,how){
      const standing=how==="duel"?companyRenown(state).ranking.find(x=>x.id===m.id):null;
      const left=leaveForDungeon(state,m);
      delete m.dungeon;
      const roster=rosterOf(state);
      roster.splice(roster.indexOf(m),1);
      if(m.avatar?.id) (state.avatarsRetired=state.avatarsRetired||[]).push(m.avatar.id);
      if(how!=="duel") return {left};
      const heritage=recordHeritage(state,m,standing);
      const items=m.items||[];
      if(items.length){
        if(!Array.isArray(state.company.stock)) state.company.stock=[];
        state.company.stock.push(...items.map(item=>({...item,owner:null,slot:null})));
      }
      m.items=[];
      if(m.equipment?.slots) for(const slot of Object.keys(m.equipment.slots)) m.equipment.slots[slot]=null;
      return {left,heritage,items};
    }
    // Désertion (Idan, 2026-11-04 ; règles : desertion.js) : l'affinité avec le capitaine, celle envers un lieutenant, la
    // Discrétion avec l'équipement (statOf, fourni par le jeu).
    const desertionRules=Desertion&&affinity?Desertion.createDesertionRules({reference,random,camp:{buildingLevel,awayOf,statOf,
      affinityOf:(state,m)=>{
        const captain=captainOf(state);
        const bond=captain?affinity.memberAffinity(captain,m):null;
        return bond?.ok?{total:bond.total,raw:bond.initial+bond.acquired+(bond.gear||0)}:null;
      },
      bondOf:(lieutenant,m)=>{ const bond=affinity.affinity(lieutenant,m); return bond?.ok?bond.total:0; },
      remove:leaveCompany}}):null;
    agenda?.add("dungeon",dungeonRules).add("spell",spellStudy).add("armor",armorStudy).add("poison",poisonStudy)
      .add("lumber",lumberjacks,{chore:true}).add("mine",miners,{chore:true}).add("palace",palaceWorkers,{chore:true});
    // Ce qui le retient demain (mission, garde du corps : au jour J, on organise J+1) ; une corvée, tant qu'on ne l'a pas
    // retiré (Idan, 2026-11-04).
    const studyBusy=(state,m)=>m&&agenda?agenda.tomorrowReason(state,m.id):null;
    // L'entraînement libre du jour : tout ce qui le retient, corvée du jour comprise.
    function trainingAvailable(state,m){ return Boolean(m)&&!m.recovery&&!expeditionOf(state,m.id)&&!(agenda&&agenda.reason(state,m.id)); }
    // Le choix du joueur pour le capitaine : une salle ou une aile construite, de n'importe quel bâtiment d'entraînement, ou
    // null (la taverne).
    function captainTraining(state){
      const code=state?.company?.camp?.captainTraining||null;
      return code&&trainingRooms(state).some(room=>room.code===code)?code:null;
    }
    function setCaptainTraining(state,code){
      if(code&&!trainingRooms(state).some(room=>room.code===code)) return {ok:false,reason:"Cette salle n’est pas construite."};
      state.company.camp.captainTraining=code||null;
      return {ok:true,code:code||null};
    }
    function runSchoolDay(state){
      const camp=state.company.camp;
      const rooms=trainingRooms(state);
      if(!schoolTraining||!rooms.length){ delete camp.schoolDay; return null; }
      const captain=rosterOf(state).find(m=>m.id===state.company.captainId)||null;
      const candidates=rosterOf(state).filter(m=>m!==captain&&!offField(state,m)&&trainingAvailable(state,m));
      // Les places prises par les élèves qui apprennent un sort ne sont plus libres.
      for(const room of rooms) room.places=Math.max(0,room.places-(spellStudy?spellStudy.learnersIn(state,room.code):0)
        -(armorStudy?armorStudy.learnersIn(state,room.code):0)-(poisonStudy?poisonStudy.learnersIn(state,room.code):0));
      const result=schoolTraining.runDay({rooms,candidates,captain:trainingAvailable(state,captain)?captain:null,
        captainChoice:captainTraining(state),masters:Posts?Posts.mastersOf(state):{magic_school:directorOf(state)},company:rosterOf(state)});
      camp.schoolDay={day:state.day,directorXp:result.directorXp,masterXp:result.masterXp,
        entries:result.entries.map(e=>({id:e.id,code:e.code,xp:e.xp,chance:e.chance,captain:e.captain||undefined,full:e.full||undefined}))};
      return {day:state.day,entries:result.entries,directorXp:result.directorXp,masterXp:result.masterXp,director:directorOf(state)};
    }
    // La journée d'entraînement du jour (gardée le matin) : { day, entries, directorXp } ou null.
    function schoolDayOf(state){
      const day=state?.company?.camp?.schoolDay;
      return day&&day.day===state.day?day:null;
    }
    // Ce que fait un mercenaire aujourd'hui à l'École : son entrée, ou null.
    function schoolEntryOf(state,mercenaryId){
      return schoolDayOf(state)?.entries.find(e=>e.id===mercenaryId)||null;
    }

    // Chaque matin : les chantiers terminés montent leur bâtiment d'un niveau.
    function advanceBuildings(state){
      const done=[];
      for(const [code,building] of Object.entries(state.company.camp.buildings||{})){
        const work=building?.construction;
        if(!work||state.day<work.endDay) continue;
        building.construction=null;
        building.level=work.level;
        done.push({kind:"building",code,name:work.name,level:work.level});
      }
      return done;
    }
    function woundCareFactor(state){
      return Math.max(0,1-(Number(CAMP_BUILDINGS.get("dispensary")?.soins_par_niveau)||0)*buildingLevel(state,"dispensary"))*medicCareFactor(state);
    }
    function fatigueRelief(state){
      return (Number(CAMP_BUILDINGS.get("baths")?.fatigue_jours_par_niveau)||0)*buildingLevel(state,"baths");
    }
    function manaBonusPercent(state){
      return (Number(CAMP_BUILDINGS.get("baths")?.mana_par_niveau)||0)*buildingLevel(state,"baths");
    }
    // Cercle des Fines Lames : la part en plus sur le paiement d'une garde du corps (0,05 par niveau ; 0 sans le Cercle).
    function bodyguardPayBonus(state){
      let bonus=0;
      for(const row of CAMP_BUILDINGS.values()) bonus+=(Number(row.garde_paie_par_niveau)||0)*buildingLevel(state,row.code);
      return Math.round(bonus*1000)/1000;
    }
    function campBuildingEffects(state){
      return {woundFactor:woundCareFactor(state),medicFactor:medicCareFactor(state),fatigueRelief:fatigueRelief(state),manaBonus:manaBonusPercent(state),
        bodyguardPay:bodyguardPayBonus(state)};
    }

    // Indisponibilité après mission (10-mission-time §4 à §6) : un blessé ou un fatigué ne peut pas
    // partir en mission tant que son compteur de jours n'est pas écoulé.
    // state (facultatif) : un mercenaire parti en expédition, ou dont la mission est programmée, n'est pas disponible non
    // plus.
    function isAvailable(mercenary,state=null){
      return !mercenary.recovery&&!(state&&expeditionOf(state,mercenary.id));
    }

    function recoverOneDay(state){
      const recovered=[];
      const medic=medicOf(state);
      for(const mercenary of rosterOf(state)){
        if(!mercenary.recovery) continue;
        mercenary.recovery.daysLeft-=1;
        if(mercenary.recovery.daysLeft<=0){
          const entry={mercenary,kind:mercenary.recovery.kind};
          // Médecin : XP de Médecine à chaque blessé guéri, selon les jours que la blessure a duré.
          if(medic&&medic!==mercenary&&entry.kind==="wounded"){
            const days=Math.max(1,state.day-(Number(mercenary.recovery.sinceDay)||state.day));
            entry.medicXp=MEDIC.xpPerDay*days;
            if(progression) progression.apply(medic,{skills:{camp:{"Médecine":entry.medicXp}}});
          }
          recovered.push(entry);
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
      const tavernReport=tavern.tavernMorning(state.tavern,state.day,candidateFactory(state),tavern.slotsFor?.(companyRenown(state).total));
      const offersLost=expireBoardOffers(state);
      const expeditions=advanceExpeditions(state);
      const built=advanceConstruction(state);
      const buildings=advanceBuildings(state);
      // Les bûcherons (niveaux 1 à 5) et les mineurs (6 à 10) du jour : un jour de moins sur les chantiers qui finissent le plus tôt.
      const lumber=lumberjacks?lumberjacks.morning(state):null;
      const mine=miners?miners.morning(state):null;
      // Le Palais des plaisirs : l'or de la journée.
      const palace=palaceWorkers?palaceWorkers.morning(state):null;
      // Le Cachot : −2 d'affinité par jour pour chaque prisonnier.
      const dungeon=dungeonRules?dungeonRules.morning(state):null;
      // Demandes au lieutenant (Idan, 2026-10-25) : le résultat tombe le lendemain matin.
      const lieutenantReports=lieutenants?lieutenants.resolveRequests(state):[];
      const mana=rechargeCampMana(state);
      // Missions programmées la veille : l'escouade a dormi au camp (mana rechargé), elle part ce matin.
      expeditions.departed=departScheduled(state);
      // Le marchand de la veille repart ; un autre passe peut-être (doc 18 ; Idan, 2026-10-30).
      const merchant=merchants?merchants.morning(state,{renown:companyRenown(state).total}):null;
      // Apprentissage des sorts (Idan, 2026-11-02) : un test par élève ; ceux qui savent sortent de l'École.
      const study=spellStudy?spellStudy.advance(state):null;
      // Ports d'armure à l'Académie, empoisonnement au Labo (Idan, 2026-11-03) : de même.
      const armor=armorStudy?armorStudy.advance(state):null;
      const poison=poisonStudy?poisonStudy.advance(state):null;
      // Entraînement libre (Idan, 2026-11-02) : ceux qui restent au camp choisissent leur journée.
      const school=runSchoolDay(state);
      // Désertion (Idan, 2026-11-04) : après tout ce qui fait bouger l'affinité du matin.
      const desertion=desertionRules?desertionRules.morning(state):null;
      return {day:state.day,recovered,salaries,tavern:tavernReport,offersLost,expeditions,built,buildings,lieutenants:lieutenantReports,mana,merchant,school,study,armorStudy:armor,poisonStudy:poison,lumber,mine,palace,dungeon,desertion};
    }

    // Recharge du mana (doc 12 ; Idan, 2026-10-25) : chaque jour, pour les membres présents au camp, pas pour ceux qui sont
    // en route (contrat ou garde du corps). Formule : magic.js (rechargeMana).
    function rechargeCampMana(state){
      if(!magic) return [];
      return rosterOf(state).filter(m=>!awayOf(state,m.id))
        .map(m=>({id:m.id,...magic.rechargeMana(m,{bonusPercent:manaBonusPercent(state)})})).filter(x=>x.gained>0);
    }

    // Taverne à 5 missions (Idan, 2026-11-01 : « la taverne a 5 missions […] Totalement aléatoire sur le type de
    // missions ») : 5 cases ; chaque case tire un type de mission au hasard, chacun avec la même chance (contrat « Faire le
    // ménage » ou garde du corps). Une offre non signée qui dépasse sa date est prise par une autre compagnie : une autre
    // la remplace aussitôt. Une offre signée laisse sa case vide 24 heures : la mission suivante arrive le lendemain.
    // Le contrat est au niveau de la Renommée (missions.js) ; la garde du corps suit le meilleur mercenaire (bodyguard.js).
    const TAVERN_SLOTS=referenceConstant(reference,"tavern.missions.slots",5);
    const TAVERN_EMPTY_DAYS=referenceConstant(reference,"tavern.missions.empty_days",1);
    const offerKind=offer=>offer?.kind==="bodyguard"?"bodyguard":"cleanup";
    function missionKinds(){ return [missions&&"cleanup",bodyguard&&"bodyguard"].filter(Boolean); }
    function createBoardOffer(state,kind){
      if(kind!=="bodyguard") return missions.createOffer({day:state.day,renown:companyRenown(state).total});
      const offer=bodyguard.createOffer({day:state.day,bestLevel:bestMercenaryLevel(state)});
      // Cercle des Fines Lames (Idan, 2026-11-03 : « On garde juste l'augmentation de la prime ») : on y croise des nobles,
      // la garde du corps paie mieux, × (1 + 5 % par niveau du Cercle), arrondi à 10 PO ; la fréquence ne change pas.
      const bonus=bodyguardPayBonus(state);
      if(bonus>0&&offer){
        offer.basePayment=offer.payment;
        offer.payBonus=bonus;
        offer.payment=Math.round(offer.payment*(1+bonus)/10)*10;
      }
      return offer;
    }
    // Le tableau ; une ancienne sauvegarde (une offre de contrat, une de garde du corps) passe ses offres aux premières cases.
    function boardOf(state){
      if(!state.tavernBoard){
        const old=[state.missionBoard?.offer,state.bodyguardBoard?.offer].filter(Boolean);
        state.tavernBoard={slots:Array.from({length:TAVERN_SLOTS},(_,i)=>({offer:old[i]||null,emptyUntil:null}))};
      }
      delete state.missionBoard;
      delete state.bodyguardBoard;
      while(state.tavernBoard.slots.length<TAVERN_SLOTS) state.tavernBoard.slots.push({offer:null,emptyUntil:null});
      return state.tavernBoard;
    }
    // Remplit les cases libres (et celles dont les 24 heures sont passées). true si une offre est arrivée.
    function fillTavernBoard(state){
      const kinds=missionKinds();
      if(!kinds.length) return false;
      let changed=false;
      for(const slot of boardOf(state).slots){
        if(slot.offer||(slot.emptyUntil!=null&&state.day<slot.emptyUntil)) continue;
        slot.offer=createBoardOffer(state,kinds[Math.min(kinds.length-1,Math.floor(random()*kinds.length))]);
        slot.emptyUntil=null;
        changed=true;
      }
      return changed;
    }
    function boardOffers(state){ return boardOf(state).slots.map(slot=>slot.offer).filter(Boolean); }
    // Une offre du tableau, par son identifiant ou son type (la première venue).
    function boardOffer(state,{id=null,kind=null}={}){
      return boardOffers(state).find(o=>(id==null||o.id===id)&&(kind==null||offerKind(o)===kind))||null;
    }
    function takeBoardOffer(state,offer){
      const slot=boardOf(state).slots.find(x=>x.offer?.id===offer.id);
      if(slot){ slot.offer=null; slot.emptyUntil=state.day+TAVERN_EMPTY_DAYS; }
    }
    function expireBoardOffers(state){
      const lost=[];
      for(const slot of boardOf(state).slots){
        if(!slot.offer||state.day<=slot.offer.expiresDay) continue;
        lost.push(slot.offer);
        slot.offer=null;
        slot.emptyUntil=null;
      }
      fillTavernBoard(state);
      return lost;
    }

    // Expéditions (doc 17, Idan 2026-10-24) : l'escouade part et le joueur continue de gérer son camp. Au bout des jours
    // de marche, elle arrive : le combat attend le joueur (« Commencer le combat »). Après le combat, les survivants
    // rentrent en autant de jours ; la récompense, le coffre, le butin et les primes arrivent avec eux. Plusieurs
    // escouades peuvent être en route en même temps.
    // Mission programmée (Idan, 2026-10-30 : « les soldats partent en mission le lendemain matin… on doit pouvoir encore
    // leur parler et les équiper. C'est fondamental. ») : signée, l'expédition attend au camp (status « scheduled »)
    // jusqu'au matin suivant ; ses membres ne partent pas sur une autre mission, mais on leur parle et on les équipe.
    // expeditionOf : la mission d'un mercenaire, programmée ou partie ; awayOf : seulement s'il a quitté le camp.
    function expeditionsOf(state){ return state.expeditions||(state.expeditions=[]); }
    function expeditionOf(state,mercenaryId){ return expeditionsOf(state).find(e=>e.memberIds.includes(mercenaryId))||null; }
    function awayOf(state,mercenaryId){ const e=expeditionOf(state,mercenaryId); return e&&e.status!=="scheduled"?e:null; }
    function busyReason(state,mercenaryId){
      return expeditionOf(state,mercenaryId)?.status==="scheduled"?"Il part déjà en mission demain.":"Il est en mission.";
    }
    // Le matin du départ : contrat en route (« outbound »), garde du corps absent (« away »). L'acompte de la garde du
    // corps arrive ce matin-là (Idan, 2026-11-02 : « On reçoit l'argent le lendemain matin ! »).
    function departScheduled(state){
      const departed=[];
      for(const expedition of expeditionsOf(state)){
        if(expedition.status!=="scheduled"||state.day<expedition.departDay) continue;
        expedition.status=expedition.kind==="bodyguard"?"away":"outbound";
        // payOnDeparture : les gardes signées avant cette règle ont déjà été payées à la signature (ancienne sauvegarde).
        if(expedition.kind==="bodyguard"&&expedition.payOnDeparture&&!expedition.paid){
          expedition.paid=Number(expedition.offer.payment)||0;
          state.company.gold+=expedition.paid;
        }
        departed.push(expedition);
      }
      return departed;
    }
    // Au jour J, on organise J+1 (Idan, 2026-11-02) : une mission signée aujourd'hui peut encore être annulée avant le
    // départ du lendemain matin. Le contrat retourne dans sa case du tableau ; la garde du corps n'a encore rien payé.
    function cancelExpedition(state,expeditionId){
      const list=expeditionsOf(state);
      const expedition=list.find(e=>e.id===expeditionId);
      if(!expedition) return {ok:false,reason:"Mission introuvable."};
      if(expedition.status!=="scheduled") return {ok:false,reason:"L’escouade est déjà partie."};
      list.splice(list.indexOf(expedition),1);
      // Ancienne sauvegarde : une garde du corps payée à la signature rend son paiement.
      if(expedition.kind==="bodyguard"&&!expedition.payOnDeparture) state.company.gold-=Number(expedition.offer.payment)||0;
      const slots=boardOf(state).slots;
      const slot=slots.find(x=>!x.offer&&x.emptyUntil===expedition.signedDay+TAVERN_EMPTY_DAYS)||slots.find(x=>!x.offer);
      if(slot){ slot.offer=expedition.offer; slot.emptyUntil=null; }
      return {ok:true,expedition,returned:Boolean(slot)};
    }
    function departExpedition(state,memberIds,offerId=null){
      const offer=boardOffer(state,{id:offerId,kind:"cleanup"});
      if(!offer) return {ok:false,reason:offerId==null?"Aucun contrat au tableau.":"Ce contrat n’est plus au tableau."};
      const roster=new Set(rosterOf(state).map(m=>m.id));
      const ids=[...new Set(memberIds)].filter(id=>roster.has(id));
      if(!ids.length) return {ok:false,reason:"Aucun mercenaire choisi."};
      if(ids.some(id=>expeditionOf(state,id))) return {ok:false,reason:"Un de ces mercenaires est déjà en mission."};
      if(state.company.medicId!=null&&ids.includes(state.company.medicId)) return {ok:false,reason:"Le médecin reste au camp."};
      const post=ids.map(id=>postOf(state,{id})).find(Boolean);
      if(post) return {ok:false,reason:`${post.title} reste au camp.`};
      const studying=ids.map(id=>studyBusy(state,{id})).find(Boolean);
      if(studying) return {ok:false,reason:studying};
      // Départ le lendemain matin, puis les jours de marche.
      const expedition={id:offer.id,offer,memberIds:ids,signedDay:state.day,departDay:state.day+1,arriveDay:state.day+1+offer.distance,status:"scheduled"};
      expeditionsOf(state).push(expedition);
      takeBoardOffer(state,offer);
      return {ok:true,expedition};
    }
    // Fin du combat : les morts quittent l'expédition, les autres prennent le chemin du retour. La renommée perdue sur un
    // échec compte tout de suite ; l'or, les objets et les primes attendent le retour. result : missions.outcome(...),
    // bonuses : [{id, bonus}] dues aux survivants (applyMissionAftermath, deferBonuses).
    function completeExpeditionCombat(state,expeditionId,{result,bonuses=[]}={}){
      const expedition=expeditionsOf(state).find(e=>e.id===expeditionId);
      if(!expedition||!result) return null;
      const roster=new Set(rosterOf(state).map(m=>m.id));
      expedition.memberIds=expedition.memberIds.filter(id=>roster.has(id));
      if(result.renown) state.company.missionRenown=(Number(state.company.missionRenown)||0)+result.renown;
      expedition.pending={victory:result.victory,reward:result.reward,chestGold:result.chestGold,items:[...result.loot,...result.chestItems],
        bonuses:bonuses.map(b=>({id:b.id,bonus:b.bonus}))};
      expedition.status="returning";
      expedition.returnDay=state.day+expedition.offer.distance;
      return expedition.memberIds.length?{expedition}:finishExpedition(state,expedition);
    }
    // Retour au camp : l'or (récompense et coffre) et les objets rejoignent la compagnie, les primes sont versées aux
    // survivants encore dans la compagnie. Personne ne rentre : rien n'arrive.
    function finishExpedition(state,expedition){
      const pending=expedition.pending||{},back=expedition.memberIds.length>0,roster=new Set(rosterOf(state).map(m=>m.id));
      const report={expedition,gold:0,items:0,bonusPaid:0};
      if(back){
        report.gold=(Number(pending.reward)||0)+(Number(pending.chestGold)||0);
        state.company.gold+=report.gold;
        if(!Array.isArray(state.company.stock)) state.company.stock=[];
        state.company.stock.push(...(pending.items||[]));
        report.items=(pending.items||[]).length;
        for(const b of pending.bonuses||[]) if(roster.has(b.id)){ state.company.gold-=b.bonus; report.bonusPaid+=b.bonus; }
      }
      expedition.status="done";
      state.expeditions=expeditionsOf(state).filter(e=>e!==expedition);
      return report;
    }
    // Une escouade arrivée attend ses ordres (Idan, 2026-10-24) : pas de jour suivant tant que son combat n'est pas livré.
    function canAdvanceDay(state){
      // Un mercenaire repéré par la Tour de guet attend qu'on décide de son sort (Idan, 2026-11-04).
      const leaving=desertionRules?desertionRules.canAdvance(state):{ok:true};
      if(!leaving.ok) return {...leaving,desertion:leaving.id};
      const waiting=expeditionsOf(state).find(e=>e.status==="arrived");
      return waiting?{ok:false,reason:"Une escouade attend vos ordres : livrez son combat avant de passer au jour suivant.",expedition:waiting}:{ok:true};
    }
    function advanceExpeditions(state){
      const arrived=[],returned=[],bodyguards=[];
      for(const expedition of [...expeditionsOf(state)]){
        if(expedition.status==="scheduled") continue;
        if(expedition.kind==="bodyguard"){
          if(state.day>=expedition.returnDay) bodyguards.push(finishBodyguard(state,expedition));
          continue;
        }
        if(expedition.status==="outbound"&&state.day>=expedition.arriveDay){ expedition.status="arrived"; arrived.push(expedition); }
        else if(expedition.status==="returning"&&state.day>=expedition.returnDay) returned.push(finishExpedition(state,expedition));
      }
      return {arrived,returned,bodyguards,waiting:expeditionsOf(state).filter(e=>e.status==="arrived")};
    }

    // Garde du corps (Idan, 2026-10-25 ; règles : bodyguard.js) : une case du tableau de la Taverne, comme le contrat.
    // Les offres montent avec le meilleur mercenaire de la compagnie (capitaine et intendant non compris).
    function bestMercenaryLevel(state){
      const company=state.company;
      return rosterOf(state).filter(m=>m.id!==company.captainId&&!offField(state,m))
        .reduce((best,m)=>Math.max(best,bodyguard.levelOf(m.reputation)),0);
    }
    // Qui peut partir : un mercenaire au camp, disponible (ni blessé, ni fatigué), du niveau demandé ; ni le capitaine ni
    // l'intendant.
    function canGuard(state,m,offer=boardOffer(state,{kind:"bodyguard"})){
      if(!m||!offer) return {ok:false,reason:"Aucune offre."};
      if(m.id===state.company.captainId) return {ok:false,reason:"Le capitaine reste à la compagnie."};
      if(m.id===state.company.intendantId) return {ok:false,reason:"L’intendant reste au camp."};
      if(state.company.medicId!=null&&m.id===state.company.medicId) return {ok:false,reason:"Le médecin reste au camp."};
      if(postOf(state,m)) return {ok:false,reason:`${postOf(state,m).title} reste au camp.`};
      if(studyBusy(state,m)) return {ok:false,reason:studyBusy(state,m)};
      if(!isAvailable(m,state)) return {ok:false,reason:m.recovery?"Il doit d’abord se remettre.":busyReason(state,m.id)};
      if(bodyguard.levelOf(m.reputation)<offer.level) return {ok:false,reason:"Réputation trop faible."};
      return {ok:true};
    }
    // Signature : les gardes partent le lendemain matin (mission programmée) et sont absents jusqu'au retour ; l'acompte
    // arrive le matin du départ (departScheduled).
    function departBodyguard(state,memberIds,offerId=null){
      const offer=bodyguard?boardOffer(state,{id:offerId,kind:"bodyguard"}):null;
      if(!offer) return {ok:false,reason:"Aucune offre de garde du corps."};
      const ids=[...new Set(memberIds)];
      if(ids.length!==offer.count) return {ok:false,reason:`Il faut ${offer.count} mercenaire${offer.count>1?"s":""}.`};
      const members=ids.map(id=>rosterOf(state).find(m=>m.id===id));
      for(const m of members){ const ok=canGuard(state,m,offer); if(!ok.ok) return {ok:false,reason:(m?.name?m.name+" : ":"")+ok.reason}; }
      const expedition={id:offer.id,kind:"bodyguard",offer,memberIds:ids,signedDay:state.day,departDay:state.day+1,returnDay:state.day+1+offer.days,status:"scheduled",payOnDeparture:true};
      expeditionsOf(state).push(expedition);
      takeBoardOffer(state,offer);
      return {ok:true,expedition,gold:offer.payment};
    }
    // Retour : chacun tire son sort (rentré, fatigué, blessé), gagne un peu de réputation et touche sa prime ; la
    // compagnie gagne un peu de renommée.
    function finishBodyguard(state,expedition){
      const results=[];
      let bonusPaid=0;
      for(const id of expedition.memberIds){
        const m=rosterOf(state).find(x=>x.id===id);
        if(!m) continue;
        const back=bodyguard.rollReturn();
        if(back.issue==="fatigue") m.recovery={kind:"fatigued",daysLeft:fatigueDaysFor(back.days,state),sinceDay:state.day};
        if(back.issue==="blesse") m.recovery={kind:"wounded",daysLeft:woundDaysFor(m,back.days,state),sinceDay:state.day};
        const reputation=bodyguard.reputationGain(back.issue);
        if(reputation){
          m.reputationCareerDelta=(Number(m.reputationCareerDelta)||0)+reputation;
          m.reputation=(Number(m.reputation)||0)+reputation;
          if(m.reputationBreakdown) m.reputationBreakdown.careerDelta=m.reputationCareerDelta;
        }
        const bonus=Number(m.contract?.missionBonus)||0;
        state.company.gold-=bonus;
        bonusPaid+=bonus;
        const days=back.issue==="blesse"?m.recovery.daysLeft:back.days;
        History.record(m,state.day,"bodyguard",{issue:back.issue,days,client:expedition.offer.client});
        results.push({mercenary:m,issue:back.issue,days,reputation,bonus});
      }
      const renown=results.length?bodyguard.renownGain():0;
      if(renown) state.company.missionRenown=(Number(state.company.missionRenown)||0)+renown;
      state.expeditions=expeditionsOf(state).filter(e=>e!==expedition);
      return {expedition,results,bonusPaid,renown};
    }

    // AdvanceTime(5) = cinq résolutions successives d'une journée. Seul un nombre entier de jours ≥ 0 est accepté.
    function advanceTime(state,days=1){
      if(!Number.isInteger(days)||days<0) throw new RangeError("AdvanceTime : nombre de jours entier ≥ 0 attendu, reçu "+days);
      const reports=[];
      for(let i=0;i<days;i++) reports.push(advanceOneDay(state));
      return reports;
    }

    // §10 — Signature : un accord conclu, et assez de places libres au Dortoir (deux pour un ogre, une demi pour un
    // halfling, un gnome ou un gobelin).
    function signCandidate(state,mercenaryId){
      const candidate=tavern.findCandidate(state.tavern,mercenaryId);
      if(!candidate) return {ok:false,reason:"Candidat introuvable."};
      const agreed=candidate.negotiation?.agreed;
      if(!agreed) return {ok:false,reason:"Aucun accord conclu avec ce candidat."};
      const places=dormitoryPlaces(candidate.mercenary);
      if(dormitoryFree(state)<places) return {ok:false,dormFull:true,places,
        reason:places>1?"Dortoir plein : il faut deux places pour un ogre.":"Dortoir plein : impossible de finaliser le recrutement."};
      const mercenary=candidate.mercenary;
      // Au jour J, on organise J+1 (Idan, 2026-11-02 : « on recrute immédiatement, mais on paye le salaire à j+1 et elle
      // peut partir en mission ou faire des actions concrètes à j+1. Seul l'équipement est immédiat ») : il rejoint la
      // compagnie tout de suite (on l'équipe, on planifie sa journée de demain) ; un poste attend le lendemain matin.
      mercenary.contract={dailySalary:agreed.salary,missionBonus:agreed.bonus,signedDay:state.day,joinDay:state.day+1};
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
    // options.deferBonuses : les primes ne sont pas versées tout de suite (report.bonusesDue) ; une expédition les verse au
    // retour de l'escouade (doc 17).
    function applyMissionAftermath(state,aftermath,options={}){
      if(appliedAftermaths.has(aftermath)) return appliedAftermaths.get(aftermath);
      const report={deaths:[],wounded:[],fatigued:[],bonuses:[],bonusPaid:0,bonusesDue:[],gameOver:false,progression:[],heritage:[]};
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
          const entry=recordHeritage(state,mercenary,standingAtStart.get(mercenary.id));
          if(entry) report.heritage.push(entry);
          roster.splice(roster.indexOf(mercenary),1);
          if(state.company.intendantId===mercenary.id) state.company.intendantId=null;
          if(state.company.medicId===mercenary.id) state.company.medicId=null;
          if(Posts) Posts.release(state,mercenary);
          // Son inventaire, gardé au dortoir, retourne à l'Intendance (Idan, 2026-10-30) ; ce qu'il portait reste avec
          // lui (butin d'une victoire, perdu sur une défaite).
          const worn=new Set(Object.values(mercenary.equipment?.slots||{}).filter(Boolean));
          const kept=(mercenary.items||[]).filter(item=>!worn.has(item.id));
          if(kept.length){
            if(!Array.isArray(state.company.stock)) state.company.stock=[];
            state.company.stock.push(...kept.map(item=>({...item,owner:null,slot:null})));
            mercenary.items=mercenary.items.filter(item=>worn.has(item.id));
            report.inventoryReturned=(report.inventoryReturned||[]).concat(kept);
          }
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
          mercenary.recovery={kind:"wounded",daysLeft:woundDaysFor(mercenary,result.woundDays,state),sinceDay:state.day};
          report.wounded.push(mercenary);
        }else{
          mercenary.recovery={kind:"fatigued",daysLeft:fatigueDaysFor(result.fatigueDays,state),sinceDay:state.day};
          report.fatigued.push(mercenary);
        }
        // Historique : une mission de plus, ses adversaires abattus, ses coups encaissés, sa blessure.
        History.recordMission(mercenary,state.day,{progress:result.progress,wounded:result.wounded,
          days:result.wounded?mercenary.recovery.daysLeft:result.fatigueDays});
        // §8 — La prime de mission individuelle n'est payée que si le mercenaire revient ; pas à celui qui a fui hors de
        // la carte (Idan, 2026-10-24, doc 17 §8).
        const bonus=result.offMap?0:Number(mercenary.contract?.missionBonus)||0;
        if(bonus>0&&options.deferBonuses) report.bonusesDue.push({id:mercenary.id,mercenary,bonus});
        else if(bonus>0){
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
      fillTavernBoard,boardOffers,boardOffer,
      canGuard,
      departBodyguard,
      bestMercenaryLevel,
      tavernSlots:state=>boardOf(state).slots,
      expeditionOf,
      awayOf,
      busyReason,
      departScheduled,
      canAdvanceDay,
      departExpedition,cancelExpedition,
      completeExpeditionCombat,
      dormitoryFree,
      dormitoryUsed,
      campBuildingRow,campBuildingCodes,campRoomCodes,buildingLevel,buildingPlaces,schoolRooms,trainingRooms,captainTraining,setCaptainTraining,runSchoolDay,schoolDayOf,schoolEntryOf,schoolTraining,spellStudy,armorStudy,poisonStudy,lumberjacks,miners,palaceWorkers,dungeonRules,desertionRules,agenda,studyBusy,buildingWork,nextBuildingLevel,startBuilding,campBuildingEffects,
      woundDaysFor,fatigueDaysFor,
      dormitoryPlaces,
      dormitoryExpansionCost,
      nextDormitoryExpansion,
      startDormitoryExpansion,
      dormitoryQuality,
      nextDormitoryQuality,
      startDormitoryQuality,
      lieutenantQuarters,
      lieutenantQuarterCost,
      nextLieutenantQuarter,
      startLieutenantQuarter,
      signCandidate,
      offerToCandidate,
      askTavernkeeper,
      intendantOf,
      assignIntendant,
      medicOf,medicCareFactor,medicRenown,
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
      ensureHalvedMissionBonuses,
      ensureTwoHandedGrips,
      ensureOneHandedStyle,
      ensureArmorPorts,
      ensureHistories,
      payroll
    };
  }

  return {createCampaignRules,serializeCampaign,restoreCampaign,SAVE_VERSION};
});
