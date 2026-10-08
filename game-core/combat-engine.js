"use strict";

(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesCombat=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const PHYSICAL_TYPES=[
    {name:"tranchant",weapon:"puissance_tranchante_base",armor:"resistance_tranchant"},
    {name:"perforant",weapon:"puissance_perforante_base",armor:"resistance_perforant"},
    {name:"contondant",weapon:"puissance_contondante_base",armor:"resistance_contondant"}
  ];

  function createCombatEngine(reference,options={}){
    const random=options.random||Math.random;
    const rows={};
    for(const [name,payload] of Object.entries(reference||{})) rows[name]=payload?.rows||[];

    const weapons=rows.weapons||[];
    const armors=rows.baseArmors||[];
    const qualities=rows.itemQualities||[];
    const skills=rows.skills||[];

    const weaponByName=new Map(weapons.map(x=>[x.nom,x]));
    const armorByCode=new Map(armors.map(x=>[x.code,x]));
    const qualityByCode=new Map(qualities.map(x=>[x.code,x]));
    const skillByName=new Map(skills.map(x=>[x.nom,x]));

    function die(sides){ return Math.floor(random()*sides)+1; }
    function d100(){ return die(100); }
    function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
    function constant(code,fallback){
      const value=Number((rows.formulaConstants||[]).find(r=>r.code===code)?.valeur);
      return Number.isFinite(value)?value:fallback;
    }
    const CRIT={
      min:constant("combat.melee.crit.min",1),
      max:constant("combat.melee.crit.max",25),
      luckDivisor:constant("combat.melee.crit.luck_divisor",10),
      fumbleThreshold:constant("combat.melee.fumble.threshold",96)
    };
    const BLOCK={
      min:constant("combat.shield.block.min_probability",5),
      max:constant("combat.shield.block.max_probability",80)
    };

    function axialDistance(a,b){
      const dq=a.q-b.q,dr=a.r-b.r;
      return (Math.abs(dq)+Math.abs(dr)+Math.abs(dq+dr))/2;
    }

    function itemBySlot(unit,slot){
      const id=unit.character.equipment?.slots?.[slot];
      return id?(unit.character.items||[]).find(x=>x.id===id)||null:null;
    }

    function activeWeaponItem(unit){ return itemBySlot(unit,"weapon_set_"+unit.activeSet+"_main"); }
    function activeOffhandItem(unit){ return itemBySlot(unit,"weapon_set_"+unit.activeSet+"_off"); }
    function armorItem(unit){ return itemBySlot(unit,"armor"); }
    function weaponTemplate(item){ return item?weaponByName.get(item.name)||null:null; }

    function armorTemplate(item){
      if(!item) return null;
      const code=String(item.templateId||"").replace(/^armor:/,"");
      return armorByCode.get(code)||armors.find(x=>x.nom===item.name)||null;
    }

    function quality(item){
      return qualityByCode.get(item?.qualityCode)||{
        multiplicateur_qualite:1,
        multiplicateur_malus:1
      };
    }

    function weaponCategory(character,weapon){
      return skillByName.get(weapon?.nom)?.parent
        || character.items?.find(x=>x.name===weapon?.nom)?.category
        || null;
    }

    function mastery(character,weapon){
      const category=weaponCategory(character,weapon);
      return {
        category,
        categoryScore:Number(character.skills?.martial?.[category])||0,
        weaponScore:Number(character.skills?.martial?.[weapon?.nom])||0
      };
    }

    function isShield(weapon){
      return /Boucliers/.test(String(weapon?.domaine||""));
    }

    function isRangedWeapon(weapon){
      return /Armes de tir|Armes à feu/.test(String(weapon?.domaine||""));
    }

    function isMeleeWeapon(weapon){
      return Boolean(weapon)&&!isRangedWeapon(weapon)&&!/Boucliers/.test(String(weapon.domaine||""));
    }

    function usesTwoHands(unit,weapon){
      if(!weapon) return false;
      if(weapon.prise==="2 mains") return true;
      return weapon.prise==="Au choix"&&!activeOffhandItem(unit);
    }

    function armorMobility(unit){
      const item=armorItem(unit),armor=armorTemplate(item);
      if(!armor) return {speed:0,dodge:0};
      const q=quality(item);
      const malus=Number(q.multiplicateur_malus)||1;
      return {
        speed:(Number(armor.malus_vitesse_base)||0)*malus,
        dodge:(Number(armor.malus_esquive_base)||0)*malus
      };
    }

    // Vitesse combat effective CAC V1 : les malus de tous les objets tenus s'additionnent (arme principale et
    // main secondaire : seconde arme ou bouclier).
    function weaponSpeedPenalty(unit){
      return heldItemSpeedPenalty(unit,activeWeaponItem(unit))+heldItemSpeedPenalty(unit,activeOffhandItem(unit));
    }

    // Malus vitesse arme effectif V1, pour un objet tenu.
    function heldItemSpeedPenalty(unit,item){
      const weapon=weaponTemplate(item);
      if(!weapon) return 0;
      const q=quality(item),m=mastery(unit.character,weapon);
      const qualityPenalty=(Number(weapon.malus_vitesse_arme_base)||0)*(Number(q.multiplicateur_malus)||1);
      const masteryFactor=Math.max(0,1-(m.categoryScore+m.weaponScore)/400);
      let penalty=qualityPenalty*masteryFactor;
      if(weapon.prise==="Au choix"&&usesTwoHands(unit,weapon)) penalty*=0.5;
      return Math.max(0,penalty);
    }

    function effectiveSpeed(unit){
      return Math.max(1,(Number(unit.character.stats?.Vitesse)||1)-armorMobility(unit).speed-weaponSpeedPenalty(unit));
    }

    function effectiveDodge(unit){
      if(unit.prone) return 0;
      return Math.max(1,(Number(unit.character.stats?.Esquive)||1)-armorMobility(unit).dodge);
    }

    function movementBase(unit){
      const score=effectiveSpeed(unit)
        +0.25*(Number(unit.character.stats?.Endurance)||0)
        +0.10*(Number(unit.character.stats?.["Volonté"])||0);
      return Math.max(1,Math.ceil(score/15));
    }

    function initiative(unit){
      return effectiveSpeed(unit)
        +0.25*(Number(unit.character.stats?.Intelligence)||0)
        +0.10*(Number(unit.character.stats?.Courage)||0)
        +0.05*(Number(unit.character.stats?.["Volonté"])||0);
    }

    function weaponRange(unit){
      const weapon=weaponTemplate(activeWeaponItem(unit));
      if(!weapon) return {min:1,max:1};
      const min=Number(weapon.portee_min_hex);
      const max=Number(weapon.portee_max_hex);
      return {
        min:Number.isFinite(min)&&min>0?min:1,
        max:Number.isFinite(max)&&max>0?max:1
      };
    }

    function canAttackAtDistance(unit,distance,mode){
      const weapon=weaponTemplate(activeWeaponItem(unit));
      if(!weapon) return false;
      if(mode==="ranged"&&!isRangedWeapon(weapon)) return false;
      if(mode==="melee"&&!isMeleeWeapon(weapon)) return false;
      const range=weaponRange(unit);
      return distance>=range.min&&distance<=range.max;
    }

    function effectiveArmorResistance(unit,type){
      const item=armorItem(unit),armor=armorTemplate(item);
      if(!armor) return 0;
      const meta=PHYSICAL_TYPES.find(x=>x.name===type);
      if(!meta) return 0;
      const base=Number(armor[meta.armor])||0;
      const mult=Number(quality(item).multiplicateur_qualite)||1;
      return base>=0?base*mult:base/mult;
    }

    // Frappe dans le dos V1 : la résistance au type de dégâts est divisée par deux pour l'étape Blesser.
    // Critique toucher — armure ignorée V1 : après un critique au Toucher, l'armure ne compte pas pour Blesser.
    function damageMatchups(defender,weapon,context={}){
      const factor=context.ignoreArmor?0:context.backstab?0.5:1;
      return PHYSICAL_TYPES.map(type=>{
        const power=Number(weapon?.[type.weapon])||0;
        if(power<=0) return null;
        const armorResistance=effectiveArmorResistance(defender,type.name)*factor;
        return {type:type.name,power,armorResistance,matchup:power-armorResistance};
      }).filter(Boolean);
    }

    function selectDamageMatchup(attacker,defender,weapon,context={}){
      const candidates=damageMatchups(defender,weapon,context);

      if(!candidates.length) return {type:"contondant",power:0,armorResistance:0,matchup:0};

      const sorted=[...candidates].sort((a,b)=>a.matchup-b.matchup);
      const intelligence=Number(attacker.character.stats?.Intelligence)||0;
      const roll=d100();
      if(roll<intelligence) return {...sorted[sorted.length-1],intelligenceRoll:roll,choice:"meilleur"};
      if((roll/2)>intelligence) return {...sorted[0],intelligenceRoll:roll,choice:"pire"};

      const avg=candidates.reduce((s,x)=>s+x.matchup,0)/candidates.length;
      const chosen=[...candidates].sort((a,b)=>Math.abs(a.matchup-avg)-Math.abs(b.matchup-avg))[0];
      return {...chosen,intelligenceRoll:roll,choice:"moyen"};
    }

    function logistic(delta){
      return 10+80/(1+Math.exp(-delta/20));
    }

    // Attaque d'opportunité V1 : Esquive ×0,5 et Perception défensive annulée.
    // Frappe dans le dos V1 : Perception défensive annulée.
    function hitProbability(attacker,defender,mode,distance,context={}){
      const weapon=weaponTemplate(activeWeaponItem(attacker));
      const m=mastery(attacker.character,weapon);
      const a=attacker.character.stats||{},d=defender.character.stats||{};
      const defensivePerception=context.opportunity||context.backstab?0:(Number(d.Perception)||0);
      const dodgeFactor=context.opportunity?0.5:1;
      let delta=(Number(a["Dextérité"])||0)
        +0.2*(m.categoryScore+m.weaponScore+(Number(a.Perception)||0)+effectiveSpeed(attacker))
        -dodgeFactor*effectiveDodge(defender)
        -0.2*(defensivePerception+effectiveSpeed(defender));

      if(mode==="ranged"){
        const range=weaponRange(attacker);
        const free=Math.ceil(range.max/4);
        if(distance>free&&range.max>free){
          delta-=40*(distance-free)/(range.max-free);
        }
      }
      return clamp(logistic(delta),10,90);
    }

    // Charge CAC V1 : ForceEffectiveCharge = Force + PuissanceCharge pour Blesser.
    function woundProbability(attacker,defender,mode,matchup,context={}){
      const weapon=weaponTemplate(activeWeaponItem(attacker));
      const m=mastery(attacker.character,weapon);
      const a=attacker.character.stats||{},d=defender.character.stats||{};
      let attackStat=0,twoHands=0;

      if(mode==="ranged"){
        attackStat=Number(a.Perception)||0;
      }else{
        attackStat=(Number(a.Force)||0)+(Number(context.chargePower)||0);
        if(usesTwoHands(attacker,weapon)){
          twoHands=Number(attacker.character.skills?.martial?.["Combat à deux mains"])||0;
        }
      }

      const delta=attackStat
        +0.2*(m.categoryScore+m.weaponScore+twoHands)
        +(Number(matchup?.matchup)||0)
        -(Number(d.Endurance)||0);
      return clamp(logistic(delta),10,90);
    }

    function parseDice(expr){
      const m=String(expr||"").trim().match(/^(\d+)D(\d+)$/i);
      return m?{count:Number(m[1]),sides:Number(m[2])}:{count:1,sides:4};
    }

    // roll : "max" (Critique de blessure positif) ou "min" (Échec critique de blessure) remplace le jet.
    function rollWeaponDamage(weapon,roll=null){
      const dice=parseDice(weapon?.degats_pv_base);
      let total=0;
      if(roll==="max") total=dice.count*dice.sides;
      else if(roll==="min") total=dice.count;
      else for(let i=0;i<dice.count;i++) total+=die(dice.sides);
      return {total,dice:dice.count+"D"+dice.sides};
    }

    // fixed.roll : jet de dégâts imposé ("max" / "min") ; fixed.resistanceRoll : D3 de la variation de
    // Résistance physique imposé (1 → 0,9, le plus favorable à l'attaquant ; 3 → 1,1, le plus favorable
    // à la réduction). Pour le contrecoup d'un échec critique de blessure, defender est l'attaquant lui-même.
    function physicalDamage(attacker,defender,mode,chargePower=0,fixed={}){
      const item=activeWeaponItem(attacker),weapon=weaponTemplate(item);
      const rolled=rollWeaponDamage(weapon,fixed.roll);
      const q=quality(item);
      let effective=rolled.total*(Number(q.multiplicateur_qualite)||1);

      if(mode==="melee"&&weapon?.prise==="Au choix"&&usesTwoHands(attacker,weapon)) effective*=1.5;
      if(chargePower>0) effective*=1+chargePower/100;

      const physicalResistance=clamp(Number(defender.character.resistances?.["Résistance physique"])||0,0,50);
      const resistanceRoll=fixed.resistanceRoll||die(3);
      const resistanceFactor=1-(physicalResistance/100)*((resistanceRoll+8)/10);
      const strengthFactor=mode==="melee"
        ? 2*(Number(attacker.character.stats?.Force)||0)/100
        : 1;

      return {
        damage:Math.max(0,Math.ceil(10*effective*strengthFactor*resistanceFactor)),
        weaponRoll:rolled.total,
        weaponDice:rolled.dice,
        resistanceRoll,
        physicalResistance,
        qualityMultiplier:Number(q.multiplicateur_qualite)||1
      };
    }

    // Blocage bouclier physique V1 : bouclier tenu en main secondaire du set actif ; null sans bouclier.
    // Maîtrise effective = moyenne de la catégorie Boucliers et du bouclier précis ; le bonus de blocage
    // (skills.json, bonus_blocage_base) suit la qualité.
    function blockChance(unit){
      const item=activeOffhandItem(unit),shield=weaponTemplate(item);
      if(!isShield(shield)) return null;
      const m=mastery(unit.character,shield);
      const bonus=(Number(skillByName.get(shield.nom)?.bonus_blocage_base)||0)*(Number(quality(item).multiplicateur_qualite)||1);
      const dexterity=Number(unit.character.stats?.["Dextérité"])||0;
      return clamp((dexterity+(m.categoryScore+m.weaponScore)/2)/2+bonus,BLOCK.min,BLOCK.max);
    }

    // Critique positif CAC V1 : 1 % à 25 % selon la Chance, après un Toucher puis après un Blesser réussis.
    // 04-combat « Critiques physiques V1 » : la V1 distance réutilise ce même principe.
    function criticalChance(unit){
      return clamp((Number(unit.character.stats?.Chance)||0)/CRIT.luckDivisor,CRIT.min,CRIT.max);
    }
    // Échec critique (Toucher ou Blesser) : naturel ≥ 96, puis D100 > Chance pour qu'il soit confirmé.
    function fumbleTest(unit,naturalRoll){
      if(naturalRoll<CRIT.fumbleThreshold) return {fumble:false};
      const fumbleRoll=d100();
      return {fumbleRoll,fumble:fumbleRoll>(Number(unit.character.stats?.Chance)||0)};
    }

    // Chaque attaque résolue est signalée au crochet options.onAttack(attaquant, défenseur, options,
    // résultat), par exemple pour le journal de progression (game-core/progression.js).
    function resolveAttack(attacker,defender,attackOptions={}){
      const result=resolveAttackRolls(attacker,defender,attackOptions);
      if(typeof options.onAttack==="function") options.onAttack(attacker,defender,attackOptions,result);
      return result;
    }

    function resolveAttackRolls(attacker,defender,options={}){
      const mode=options.mode||"melee";
      const distance=Number(options.distance)||axialDistance(attacker,defender);
      const item=activeWeaponItem(attacker),weapon=weaponTemplate(item);
      if(!weapon) return {ok:false,reason:"Aucune arme active."};
      if(!canAttackAtDistance(attacker,distance,mode)) return {ok:false,reason:"Cible hors portée ou arme incompatible."};

      // Toute attaque d'opportunité bénéficie de Frappe dans le dos (Attaque d'opportunité CAC V1),
      // de même que toute attaque au CAC contre une cible encerclée (Encerclement CAC V1).
      // Une cible En Fuite subit aussi une Frappe dans le dos (Frappe dans le dos V1).
      const opportunity=Boolean(options.opportunity);
      const encircled=mode==="melee"&&Boolean(options.encircled);
      const fleeingTarget=Boolean(defender.fleeing);
      const backstab=opportunity||encircled||fleeingTarget||Boolean(options.backstab);
      if(opportunity&&(mode!=="melee"||Number(options.chargeDistance)>0)) return {ok:false,reason:"Une attaque d'opportunité est un coup de mêlée simple."};

      let chargePower=0;
      if(Number(options.chargeDistance)>0){
        const fallRoll=d100();
        if(fallRoll<=2){
          attacker.prone=true;
          return {ok:true,mode,weapon:weapon.nom,charge:true,chargeFall:true,fallRoll,hit:false,wound:false,damage:0};
        }
        const bonus=Number(weapon.bonus_charge_base)||1;
        chargePower=Number(options.chargeDistance)*bonus*(Number(quality(item).multiplicateur_qualite)||1);
      }

      const tags={chargePower,opportunity,encircled,fleeingTarget,backstab};
      const pHit=hitProbability(attacker,defender,mode,distance,{opportunity,backstab});
      const hitRoll=d100(),hit=hitRoll<=pHit;
      if(!hit){
        // Échec critique CAC V1 : un naturel 96–100 déclenche un test de Chance ; raté → Au Sol.
        const fumble=fumbleTest(attacker,hitRoll);
        if(fumble.fumble) attacker.prone=true;
        return {ok:true,mode,weapon:weapon.nom,distance,pHit,hitRoll,hit:false,...fumble,wound:false,damage:0,...tags};
      }

      // Blocage bouclier physique V1 : après le Toucher, avant le critique ; au CAC comme au tir, même dans
      // le dos. Un coup bloqué ne compte pas comme un toucher réel : ni critique, ni Blesser, ni dégâts.
      const pBlock=blockChance(defender);
      const block={};
      if(pBlock!==null){
        const blockRoll=d100();
        Object.assign(block,{pBlock,blockRoll,blocked:blockRoll<=pBlock,shield:weaponTemplate(activeOffhandItem(defender)).nom});
        if(block.blocked) return {ok:true,mode,weapon:weapon.nom,distance,pHit,hitRoll,hit:true,...block,wound:false,damage:0,...tags};
      }

      const pCritical=criticalChance(attacker);
      const criticalHitRoll=d100(),criticalHit=criticalHitRoll<=pCritical;
      const crit={...block,pCritical,criticalHitRoll,criticalHit};
      const matchup=selectDamageMatchup(attacker,defender,weapon,{backstab,ignoreArmor:criticalHit});
      const pWound=woundProbability(attacker,defender,mode,matchup,{chargePower});
      const woundRoll=d100(),wound=woundRoll<=pWound;
      if(!wound){
        // Échec critique de blessure CAC V1 : naturel 96–100 puis test de Chance raté → l'attaquant
        // encaisse les dégâts minimum de son propre coup, réduits au mieux par sa Résistance physique.
        const woundFumble=fumbleTest(attacker,woundRoll);
        const recoil={woundFumbleRoll:woundFumble.fumbleRoll,woundFumble:woundFumble.fumble};
        if(woundFumble.fumble){
          const self=physicalDamage(attacker,attacker,mode,chargePower,{roll:"min",resistanceRoll:3});
          attacker.hp-=self.damage;
          attacker.damageTaken=(Number(attacker.damageTaken)||0)+self.damage;
          if(attacker.hp<=0) attacker.alive=false;
          Object.assign(recoil,{selfDamage:self.damage,attackerHp:attacker.hp,attackerDown:!attacker.alive});
        }
        return {ok:true,mode,weapon:weapon.nom,distance,pHit,hitRoll,hit:true,...crit,matchup,pWound,woundRoll,wound:false,...recoil,damage:0,...tags};
      }

      // Critique de blessure positif CAC V1 : dégâts de l'arme au maximum et variation de Résistance à 0,9.
      const criticalWoundRoll=d100(),criticalWound=criticalWoundRoll<=pCritical;
      Object.assign(crit,{criticalWoundRoll,criticalWound});
      const damageData=physicalDamage(attacker,defender,mode,chargePower,criticalWound?{roll:"max",resistanceRoll:1}:{});
      // Les PV restent signés : la profondeur sous 0 sert au jet de mort de fin de mission (Issue #13).
      defender.hp-=damageData.damage;
      // Les soins n'effacent pas l'usure : la fatigue de fin de mission se calcule sur le cumul (10-mission-time §5).
      defender.damageTaken=(Number(defender.damageTaken)||0)+damageData.damage;
      if(defender.hp<=0) defender.alive=false;

      return {
        ok:true,mode,weapon:weapon.nom,distance,pHit,hitRoll,hit:true,...crit,
        matchup,pWound,woundRoll,wound:true,...damageData,
        targetHp:defender.hp,targetDown:!defender.alive,...tags
      };
    }

    // Attaque d'opportunité CAC V1 : un combattant menace les hexagones atteignables par son arme de mêlée active.
    // Un personnage En Fuite ne menace personne : il ne fait pas d'attaque d'opportunité (décision Idan, Issue #8).
    function threatens(unit,hex){
      if(!unit?.alive||unit.fleeing) return false;
      if(!isMeleeWeapon(weaponTemplate(activeWeaponItem(unit)))) return false;
      return canAttackAtDistance(unit,axialDistance(unit,hex),"melee");
    }

    // Sortir de la zone menacée déclenche la réaction ; s'y déplacer ne déclenche rien.
    function opportunityReactors(opponents,from,to){
      return opponents.filter(o=>threatens(o,from)&&!threatens(o,to));
    }

    // Tirer sur une autre cible que l'adversaire qui menace déclenche sa réaction.
    function rangedOpportunityReactors(opponents,shooter,target){
      return opponents.filter(o=>o!==target&&threatens(o,shooter));
    }

    // Encerclement CAC V1 : au moins deux adversaires au contact, armés pour le CAC,
    // sur des cases de contact non adjacentes entre elles.
    function isEncircled(target,opponents){
      const contact=opponents.filter(o=>axialDistance(o,target)===1&&threatens(o,target));
      return contact.some((a,i)=>contact.slice(i+1).some(b=>axialDistance(a,b)>1));
    }

    function intimidation(unit){
      return Number(unit?.character?.skills?.social?.Intimidation)||0;
    }

    // Courage post-attaque CAC V1 / Courage post-tir V1, avec le malus de Courage en sous-nombre V1.
    function courageHold(subject,opponent,surplus=0){
      const s=subject.character.stats||{};
      return clamp((Number(s.Courage)||0)+0.25*(Number(s["Volonté"])||0)-0.25*intimidation(opponent)-10*surplus,5,95);
    }

    // Courage en sous-nombre V1 : mêlée locale = groupe connecté de combattants liés par leurs zones de menace CAC.
    function localMelee(subject,units){
      const alive=units.filter(u=>u.alive);
      const linked=(a,b)=>a.team!==b.team&&(threatens(a,b)||threatens(b,a));
      const group=new Set([subject]),queue=[subject];
      while(queue.length){
        const cur=queue.shift();
        for(const other of alive) if(!group.has(other)&&linked(cur,other)){ group.add(other); queue.push(other); }
      }
      const allies=[...group].filter(u=>u.team===subject.team).length;
      const enemies=group.size-allies;
      return {allies,enemies,surplus:Math.max(0,enemies-allies)};
    }

    // Qui teste son Courage après une attaque, et avec quelle probabilité de tenir.
    // context : { defenderSurplus, attackerEncircles }.
    function resolveCourage(attacker,defender,result,context={}){
      if(!result?.ok||result.chargeFall) return null;
      let subject,source,pHold,rule;
      if(result.wound){
        // Une cible déjà En Fuite ne reteste pas (décision Idan, Issue #8).
        if(!defender.alive||defender.fleeing) return null;
        const surplus=result.mode==="melee"?Math.max(0,Number(context.defenderSurplus)||0):0;
        subject=defender;source=attacker;
        pHold=courageHold(defender,attacker,surplus);
        rule=surplus>0?"outnumbered":"wounded";
      }else{
        // Tir : le tireur ne teste jamais. CAC : un attaquant qui participe à un encerclement ne teste pas.
        if(result.mode!=="melee"||!attacker.alive||attacker.fleeing||context.attackerEncircles) return null;
        subject=attacker;source=defender;
        pHold=100-(100-courageHold(attacker,defender))/2;
        rule="no-wound";
      }
      const roll=d100();
      return {subject,source,pHold,roll,flees:roll>pHold,rule};
    }

    // Reprise de contrôle — En Fuite V1 ; ennemi de référence = ennemi actif le plus proche (vivant, pas En Fuite).
    function recoveryChance(unit,referenceEnemy,fleeTurn){
      const s=unit.character.stats||{};
      return clamp((Number(s.Courage)||0)+0.25*(Number(s["Volonté"])||0)-0.25*intimidation(referenceEnemy)+10*fleeTurn,5,95);
    }

    function rollRecovery(unit,referenceEnemy,fleeTurn){
      const p=recoveryChance(unit,referenceEnemy,fleeTurn),roll=d100();
      return {p,roll,recovered:roll<=p};
    }

    // Comportement automatique — En Fuite V1 : 1 Course effrénée, 2 Cachons-nous, 3 Feu à volonté.
    function rollFleeBehavior(){ return die(3); }

    function canSwitchWeaponSet(unit){
      const other=unit.activeSet===1?2:1;
      return Boolean(itemBySlot(unit,"weapon_set_"+other+"_main"));
    }

    function switchWeaponSet(unit){
      if(!canSwitchWeaponSet(unit)) return false;
      unit.activeSet=unit.activeSet===1?2:1;
      return true;
    }

    function chargeData(attacker,defender){
      const weapon=weaponTemplate(activeWeaponItem(attacker));
      if(!isMeleeWeapon(weapon)) return {valid:false};

      const dq=defender.q-attacker.q,dr=defender.r-attacker.r;
      const distance=axialDistance(attacker,defender);
      const straight=dq===0||dr===0||dq+dr===0;
      if(!straight||distance<2) return {valid:false};

      let step;
      if(dq===0) step={q:0,r:Math.sign(dr)};
      else if(dr===0) step={q:Math.sign(dq),r:0};
      else step={q:Math.sign(dq),r:Math.sign(dr)};

      const travel=distance-1;
      const base=movementBase(attacker);
      return {
        valid:travel>=base&&travel<=2*base,
        travel,
        path:Array.from({length:travel},(_,i)=>({q:attacker.q+step.q*(i+1),r:attacker.r+step.r*(i+1)})),
        destination:{q:defender.q-step.q,r:defender.r-step.r},
        min:base,
        max:2*base
      };
    }

    return {
      axialDistance,
      activeWeaponItem,
      weaponTemplate,
      armorItem,
      armorTemplate,
      quality,
      isRangedWeapon,
      isMeleeWeapon,
      effectiveSpeed,
      effectiveDodge,
      movementBase,
      initiative,
      weaponRange,
      canAttackAtDistance,
      hitProbability,
      damageMatchups,
      selectDamageMatchup,
      woundProbability,
      criticalChance,
      blockChance,
      resolveAttack,
      canSwitchWeaponSet,
      switchWeaponSet,
      chargeData,
      threatens,
      isEncircled,
      intimidation,
      courageHold,
      localMelee,
      resolveCourage,
      recoveryChance,
      rollRecovery,
      rollFleeBehavior,
      opportunityReactors,
      rangedOpportunityReactors
    };
  }

  return {createCombatEngine};
});
