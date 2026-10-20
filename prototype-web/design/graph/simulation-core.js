"use strict";

// Adaptateur de simulation : appelle les fonctions exportées par game-core.
// Aucun tirage non déterministe, aucune sauvegarde modifiée, aucune règle réimplémentée.
(function(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MercenairesDesignSimulation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const atLeast = (v, min = 0) => Math.max(min, num(v));
  const statNames = ["Force","Dextérité","Vitesse","Chance","Perception","Endurance","Esquive","Intelligence","Courage","Volonté","Constitution","Charisme"];
  const resistNames = ["Résistance physique","Résistance au feu","Résistance au froid","Résistance à la foudre","Résistance au poison"];

  function createSimulator({reference = {}, campaign, tavern, combat, progression, affinity} = {}) {
    if (!campaign?.createCampaignRules || !tavern?.createTavernRules) {
      throw new Error("Modules de campagne et de taverne indisponibles.");
    }
    const company = campaign.createCampaignRules({generator:{},tavern:{},reference});
    // RNG fixée pour lire pAccept et pQuit du moteur de négociation, sans simulation aléatoire.
    const hiring = tavern.createTavernRules({reference, random:() => 0.9999999});
    const battle = combat?.createCombatEngine ? combat.createCombatEngine(reference, {random:() => 0.5}) : null;
    const growth = progression?.createProgressionRules ? progression.createProgressionRules({reference}) : null;
    const relations = affinity?.createAffinityRules ? affinity.createAffinityRules({reference}) : null;

    function economy(v) {
      const imported=v.companySnapshot;
      const state=imported?.roster?.length
        ? {company:{
            captainId:imported.captainId,
            roster:imported.roster.map(m=>({id:m.id,name:m.name,reputation:num(m.reputation)})),
            renownHeritage:[{heritage:atLeast(v.heritage)}]
          }}
        : {company:{
            captainId:"captain",
            roster:[
              {id:"captain",name:"Capitaine",reputation:atLeast(v.captain)},
              {id:"first",name:"Mercenaire A",reputation:atLeast(v.first)},
              {id:"second",name:"Mercenaire B",reputation:atLeast(v.second)}
            ],
            renownHeritage:[{heritage:atLeast(v.heritage)}]
          }};
      if(imported?.roster?.length){
        const roster=state.company.roster;
        const assignments=[[imported.captainId,v.captain],[imported.firstId,v.first],[imported.secondId,v.second]];
        for(const [id,reputation] of assignments){
          if(id===undefined||id===null)continue;
          const member=roster.find(m=>String(m.id)===String(id));
          if(member)member.reputation=atLeast(reputation);
        }
      }
      const renown = company.companyRenown(state);
      const mercenary = {
        reputation:atLeast(v.reputation),
        salary:atLeast(v.salary),
        salaryPretension:atLeast(v.pretensions),
        stats:{Courage:atLeast(v.courage),Intelligence:atLeast(v.intelligence),"Volonté":atLeast(v.will)}
      };
      const bonus = hiring.missionBonusDemand(mercenary);
      const resistance = hiring.negotiationResistance(mercenary);
      const departure = hiring.engagedElsewhereChance(mercenary);
      const fraction = atLeast(v.offerPercent) / 100;
      const offer = {
        salary:Math.round(mercenary.salary*fraction),
        bonus:Math.round(bonus*fraction)
      };
      const outcome = hiring.makeOffer({mercenary,negotiation:null},offer);
      return {
        metrics:{
          renown:renown.total,
          renownCaptain:renown.parts.captain,
          renownOthers:renown.parts.members,
          renownLegacy:renown.parts.heritage,
          bonus,
          resistance,
          departure,
          pAccept:outcome.automatic?100:(outcome.pAccept ?? null),
          pQuit:outcome.automatic?0:(outcome.pQuit ?? 0),
          offerSalary:offer.salary,
          offerBonus:offer.bonus
        },
        notes:[
          "Salaire demandé saisi : il n'est pas recalculé automatiquement quand la réputation change.",
          "Probabilités et contre-offres issues du moteur, avec RNG fixe (aucun jet ne décide du résultat).",
          "La réputation de compagnie n'affecte pas encore les offres de mission ou les candidats.",
          imported?.roster?.length?"Réputation calculée à partir de tous les membres de la sauvegarde importée.":"Réputation calculée avec trois membres fictifs."
        ],
        source:["game-core/campaign.js","game-core/tavern.js"]
      };
    }

    function combatScenario(v) {
      if (!battle) throw new Error("Moteur de combat indisponible.");
      const weapons=(reference.weapons?.rows||[]).filter(w=>battle.isMeleeWeapon(w)||battle.isRangedWeapon(w));
      const weapon=weapons.find(w=>w.nom===v.weapon)||weapons[0];
      if (!weapon) throw new Error("Référentiel des armes non chargé.");
      const armorRows=reference.baseArmors?.rows||[];
      function unit(own,armorCode){
        const stats=Object.fromEntries(statNames.map(name=>[name,atLeast(own[name],0)]));
        const equipment={slots:{}};
        const items=[];
        if (own.weapon){
          items.push({id:"main",name:weapon.nom,templateId:"weapon:"+weapon.nom});
          equipment.slots.weapon_set_1_main="main";
        }
        if(armorCode){
          const armor=armorRows.find(a=>a.code===armorCode);
          if(armor){
            items.push({id:"armor",name:armor.nom,templateId:"armor:"+armor.code});
            equipment.slots.armor="armor";
          }
        }
        const category=(reference.skills?.rows||[]).find(s=>s.nom===weapon.nom)?.parent||"";
        const martial={[category]:atLeast(own.mastery)};
        martial[weapon.nom]=atLeast(own.mastery);
        return {activeSet:1,prone:false,alive:true,fleeing:false,character:{stats,skills:{martial},equipment,items}};
      }
      const attacker=unit({
        weapon:true,mastery:v.mastery,
        Force:v.force,"Dextérité":v.dexterity,Vitesse:v.speed,Chance:v.luck,
        Perception:v.perception,Intelligence:v.intelligence,Endurance:v.endurance,
        Esquive:v.dodge,Courage:v.courage,"Volonté":v.will
      },v.armor);
      const defender=unit({
        weapon:false,mastery:0,Force:50,"Dextérité":50,Vitesse:v.defSpeed,
        Chance:50,Perception:v.defPerception,Intelligence:50,Endurance:v.defEndurance,
        Esquive:v.defDodge,Courage:50,"Volonté":50
      },v.defArmor);
      const mode=battle.isRangedWeapon(weapon)?"ranged":"melee";
      const distance=Math.max(1,Math.round(num(v.distance,1)));
      const candidates=battle.damageMatchups(defender,weapon);
      const matchup=candidates.length?[...candidates].sort((a,b)=>b.matchup-a.matchup)[0]:{matchup:0,type:"aucun"};
      const range=battle.weaponRange(attacker);
      const inRange=battle.canAttackAtDistance(attacker,distance,mode);
      const hit=inRange?battle.hitProbability(attacker,defender,mode,distance):null;
      const wound=battle.woundProbability(attacker,defender,mode,matchup,{chargePower:mode==="melee"?atLeast(v.chargePower):0});
      return {
        metrics:{
          hit,
          wound,
          crit:battle.criticalChance(attacker),
          speed:battle.effectiveSpeed(attacker),
          dodge:battle.effectiveDodge(attacker),
          initiative:battle.initiative(attacker),
          movement:battle.movementBase(attacker),
          chain:mode==="melee"||battle.isRepeatable(weapon)?battle.chainChance(attacker,2,mode):null,
          armorMatchup:matchup.matchup
        },
        notes:[
          "Toucher = probabilité conditionnelle si la cible est à portée.",
          "Blesser = probabilité conditionnelle après un toucher, avec la meilleure composante physique de l'arme.",
          "La charge est simulée uniquement par sa puissance au jet Blesser ; le déplacement et les autres conditions de charge ne le sont pas.",
          "Arme : "+weapon.nom+" · Portée : "+range.min+"–"+range.max+" · Mode : "+mode
        ],
        source:["game-core/combat-engine.js","data/reference/weapons.json","data/reference/formula-constants.json"]
      };
    }

    function progressionScenario(v) {
      if(!growth||!progression?.emptyLog) throw new Error("Module de progression indisponible.");
      const base=atLeast(v.baseStat);
      const mercenary={
        stats:Object.fromEntries(statNames.map(name=>[name,base])),
        resistances:Object.fromEntries(resistNames.map(name=>[name,base])),
        skills:{martial:{},social:{Intimidation:base}},
        reputation:atLeast(v.personalReputation),
        xp:{}
      };
      const log=progression.emptyLog();
      for(const name of ["criticalSuccesses","criticalFailures","knockouts","chargeAttempts","hpHealed","fleeHexes","chains","woundsTaken","heavyArmorHexes","courageHeld","recoveries","intimidations","backstabWounds","worstChoices"])
        log[name]=Math.max(0,Math.round(num(v[name])));
      const wounds=Math.max(0,Math.round(num(v.physicalWounds)));
      if(wounds) log.wounds["Résistance physique"]=wounds;
      const opponent=atLeast(v.enemyReputation);
      if(num(v.enemyWounded)>0) log.enemyWounds["scenario-enemy"]=opponent;
      if(num(v.enemyKnockout)>0) log.enemyKnockouts["scenario-enemy"]=opponent;
      const earned=growth.gains(log,mercenary);
      const changes=growth.apply(mercenary,earned);
      const rep=growth.reputationGains(log,{wounded:Boolean(num(v.returnWounded))});
      const metrics={reputationGain:rep.total};
      for(const name of statNames){
        const key="stat."+name;
        metrics[key]=mercenary.stats[name];
        metrics["xp."+name]=earned.stats[name]||0;
      }
      for(const name of resistNames) metrics["resist."+name]=mercenary.resistances[name];
      metrics.intimidationXP=earned.skills.social?.Intimidation||0;
      return {
        metrics,
        notes:[
          "Les statistiques initiales sont fixées au niveau choisi ; application de l'XP sur une copie jetable.",
          "La réputation acquise inclut le retour de mission et les événements du journal.",
          "Un même ennemi contribue au plus une fois à la blessure et une fois à la mise hors combat."
        ],
        details:{reputationSources:rep.sources,levelChanges:changes},
        source:["game-core/progression.js","data/reference/formula-constants.json","data/reference/characteristics.json"]
      };
    }

    function affinityScenario(v) {
      if(!relations?.affinity || !relations.PEOPLES?.length)
        throw new Error("Règles ou référentiels d'affinité indisponibles.");
      const captain={people:v.captainPeople,alignment:v.captainAlignment,culture:"Culture A"};
      const mercenary={people:v.mercenaryPeople,alignment:v.mercenaryAlignment,culture:Number(v.sameCulture)?"Culture A":"Culture B"};
      const result=relations.affinity(captain,mercenary,num(v.acquired));
      if(!result.ok)throw new Error(result.reason);
      return {
        metrics:{
          affinityInitial:result.initial,affinityAcquired:result.acquired,affinityTotal:result.total,
          people:result.components.people,culture:result.components.culture,
          alignment:result.components.alignment,distance:result.components.distance
        },
        notes:[
          "Score calculé à partir des données des peuples et de la grille des neuf alignements.",
          "L'influence de l'affinité sur les négociations n'est pas encore chiffrée."
        ],
        source:["game-core/affinity.js","data/reference/people-affinity.json","data/reference/alignment-generation.json"]
      };
    }

    const runners={economy,combat:combatScenario,progression:progressionScenario,affinity:affinityScenario};
    function run(mode,scenario) {
      if(!Object.prototype.hasOwnProperty.call(runners,mode))throw new Error("Simulation inconnue : "+mode);
      return runners[mode](scenario||{});
    }
    function compare(mode,before,after){
      const a=run(mode,before),b=run(mode,after);
      const keys=[...new Set([...Object.keys(a.metrics),...Object.keys(b.metrics)])];
      return {before:a,after:b,rows:keys.map(key=>{
        const old=a.metrics[key],value=b.metrics[key];
        return {key,before:old,after:value,delta:old===null||value===null?null:value-old,changed:old!==value};
      })};
    }
    return {run,compare,capabilities:{economy:true,combat:!!battle,progression:!!growth,affinity:!!relations?.PEOPLES?.length}};
  }
  return {createSimulator};
});
