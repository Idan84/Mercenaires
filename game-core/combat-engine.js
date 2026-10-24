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
    const boots=rows.boots||[];

    const weaponByName=new Map(weapons.map(x=>[x.nom,x]));
    const armorByCode=new Map(armors.map(x=>[x.code,x]));
    const qualityByCode=new Map(qualities.map(x=>[x.code,x]));
    const skillByName=new Map(skills.map(x=>[x.nom,x]));
    const bootsByName=new Map(boots.map(x=>[x.nom,x]));

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
    const CHAIN={
      max:constant("combat.melee.chain.max_probability",100),
      rangedDivisor:constant("combat.ranged.chain.divisor",1.5)
    };
    // Approximation projectile V1 ; couloir de tir décidé par Idan le 2026-10-08.
    const STRAY={
      initial:constant("combat.ranged.stray.initial_factor",0.35),
      decay:constant("combat.ranged.stray.decay_factor",0.5),
      coneAngle:constant("combat.ranged.stray.cone_angle",30),
      startRatio:constant("combat.ranged.stray.corridor_start_ratio",0.5)
    };
    const DUAL={dexterityBase:constant("combat.dual_wield.dexterity_denominator_base",2)};
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

    // Combat à deux armes CAC V1 : pendant l'attaque de la main secondaire (unit.attackHand === "off"), les
    // deux mains sont permutées : l'arme secondaire devient l'arme qui frappe et toutes les règles
    // (portée, maîtrise, prise, dégâts, recharge…) s'appliquent à elle.
    function activeWeaponItem(unit){ return unit.attackHand==="off"?offhandSlotItem(unit):itemBySlot(unit,"weapon_set_"+unit.activeSet+"_main"); }
    function activeOffhandItem(unit){ return unit.attackHand==="off"?itemBySlot(unit,"weapon_set_"+unit.activeSet+"_main"):offhandSlotItem(unit); }
    // Prise d'arme et mode deux mains V1 : une arme « 2 mains » exige une main secondaire vide (ni bouclier
    // ni seconde arme). Un objet rangé en main secondaire à côté d'elle, ou une arme « 2 mains » rangée en main
    // secondaire, n'est donc pas tenu : il ne bloque pas, ne frappe pas et ne ralentit pas.
    function offhandSlotItem(unit){
      const off=itemBySlot(unit,"weapon_set_"+unit.activeSet+"_off");
      if(!off) return null;
      const main=itemBySlot(unit,"weapon_set_"+unit.activeSet+"_main");
      if(weaponTemplate(main)?.prise==="2 mains"||weaponTemplate(off)?.prise==="2 mains") return null;
      return off;
    }
    function armorItem(unit){ return itemBySlot(unit,"armor"); }
    function bootsItem(unit){ return itemBySlot(unit,"boots"); }

    // Bottes (Idan, 2026-10-24) : + bonus_t<tier> % de la caractéristique de base qu'elles servent (Vitesse,
    // Esquive ou Perception) ; 0 sans bottes ou pour une autre caractéristique.
    function bootsBonus(unit,stat){
      const item=bootsItem(unit),template=item?bootsByName.get(item.name):null;
      if(!template||template.caracteristique!==stat) return 0;
      return (Number(unit.character.stats?.[stat])||0)*(Number(template["bonus_t"+item.tier])||0)/100;
    }
    function statWithBoots(unit,stat){
      return (Number(unit.character.stats?.[stat])||0)+bootsBonus(unit,stat);
    }
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

    // Combat à deux armes CAC V1 : une arme (pas un bouclier) dans chaque main du set actif.
    function isDualWielding(unit){
      const main=weaponTemplate(itemBySlot(unit,"weapon_set_"+unit.activeSet+"_main"));
      const off=weaponTemplate(offhandSlotItem(unit));
      return Boolean(main&&off&&!isShield(main)&&!isShield(off));
    }
    // Dextérité effective = Dextérité, ou Dextérité / (2 − maîtrise Combat à deux armes / 100) à deux armes.
    function effectiveDexterity(unit){
      const dexterity=Number(unit.character.stats?.["Dextérité"])||0;
      if(!isDualWielding(unit)) return dexterity;
      const skill=clamp(Number(unit.character.skills?.martial?.["Combat à deux armes"])||0,0,100);
      return dexterity/(DUAL.dexterityBase-skill/100);
    }
    // Les mains qui peuvent frapper cette cible à cette distance, chacune avec son mode (arme principale d'abord).
    function usableHands(unit,distance){
      const hands=isDualWielding(unit)?["main","off"]:["main"];
      return hands.map(hand=>withHand(unit,hand,()=>{
        const weapon=weaponTemplate(activeWeaponItem(unit));
        const mode=isRangedWeapon(weapon)?"ranged":"melee";
        return canAttackAtDistance(unit,distance,mode)?{hand,mode,weapon:weapon.nom}:null;
      })).filter(Boolean);
    }
    function withHand(unit,hand,fn){
      const before=unit.attackHand;
      unit.attackHand=hand==="off"?"off":undefined;
      try{ return fn(); }finally{ if(before===undefined) delete unit.attackHand; else unit.attackHand=before; }
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
      return Math.max(1,(statWithBoots(unit,"Vitesse")||1)-armorMobility(unit).speed-weaponSpeedPenalty(unit));
    }

    function effectiveDodge(unit){
      if(unit.prone) return 0;
      return Math.max(1,(statWithBoots(unit,"Esquive")||1)-armorMobility(unit).dodge);
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

    // Armes à feu — recharge V1 : une arme à recharge (skills.json, recharge_action_rapide) doit être chargée
    // pour tirer et se décharge après son tir ; une Action rapide recharge une arme. Pas de munitions ordinaires.
    // État propre à la mission : unit.unloaded liste les armes déchargées ; tout est chargé au départ.
    function needsLoading(weapon){
      return Boolean(skillByName.get(weapon?.nom)?.recharge_action_rapide);
    }
    function isLoaded(unit,item){
      return !item||!needsLoading(weaponTemplate(item))||!(unit.unloaded||[]).includes(item.id);
    }
    function heldUnloaded(unit){
      return [activeWeaponItem(unit),activeOffhandItem(unit)].find(item=>item&&!isLoaded(unit,item))||null;
    }
    function canReload(unit){ return Boolean(heldUnloaded(unit)); }
    // Recharge une arme tenue (arme principale d'abord) ; renvoie l'objet rechargé, ou null.
    function reload(unit){
      const item=heldUnloaded(unit);
      if(item) unit.unloaded=unit.unloaded.filter(id=>id!==item.id);
      return item;
    }

    function canAttackAtDistance(unit,distance,mode){
      if(!isLoaded(unit,activeWeaponItem(unit))) return false;
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
      const defensivePerception=context.opportunity||context.backstab?0:statWithBoots(defender,"Perception");
      const dodgeFactor=context.opportunity?0.5:1;
      let delta=effectiveDexterity(attacker)
        +0.2*(m.categoryScore+m.weaponScore+statWithBoots(attacker,"Perception")+effectiveSpeed(attacker))
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
        attackStat=statWithBoots(attacker,"Perception");
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

    // Enchaînement d'attaques CAC V1 : P_N = min(100, (Dextérité effective + Vitesse combat effective) / N).
    // Enchaînement de tirs distance V1 : même calcul divisé par 1,5 × N, armes « Répétable » seulement.
    function isRepeatable(weapon){
      return skillByName.get(weapon?.nom)?.cadence_tir==="Répétable";
    }
    function chainChance(attacker,n,mode){
      const divisor=mode==="ranged"?CHAIN.rangedDivisor*n:n;
      return Math.min(CHAIN.max,(effectiveDexterity(attacker)+effectiveSpeed(attacker))/divisor);
    }
    // L'attaque précédente doit avoir réellement touché (pas bloquée), sans échec critique, contre une cible
    // encore vivante. Un critique positif n'arrête pas la chaîne.
    function canChain(attacker,defender,result,mode){
      if(!result?.ok||!result.hit||result.blocked||result.fumble||result.woundFumble) return false;
      if(!attacker.alive||!defender.alive) return false;
      return mode!=="ranged"||isRepeatable(weaponTemplate(activeWeaponItem(attacker)));
    }
    // Tente d'ouvrir l'attaque numéro n (n ≥ 2) ; null si la chaîne s'arrête d'elle-même.
    function rollChain(attacker,defender,result,n,mode){
      if(!canChain(attacker,defender,result,mode)) return null;
      const p=chainChance(attacker,n,mode),roll=d100();
      return {n,p,roll,continues:roll<=p};
    }

    // Contre-charge V1 : la cible directe d'une charge réagit une fois si son arme active le permet
    // (contre_charge) et, pour une arme à feu, si elle est chargée. Un personnage En Fuite ne réagit pas.
    // Renvoie {at, mode} (at = cases parcourues par le chargeur avant la réaction), ou null :
    // - arme à distance : à mi-course, arrondie au-dessus pour une course impaire (2N+1 → N+1, Idan 2026-10-08) ;
    // - mêlée / arme d'hast : première case du trajet dans la portée de contact de l'arme.
    // À deux armes (décision Idan, 2026-10-08), chaque arme qui le permet riposte une fois, à son propre moment :
    // counterchargeTriggers renvoie ces réactions, dans l'ordre de la course ({at, mode, hand}).
    function counterchargeTriggers(reactor,charger,charge){
      if(!reactor?.alive||reactor.fleeing) return [];
      const path=charge?.path||[];
      const hands=isDualWielding(reactor)?["main","off"]:["main"];
      return hands.map(hand=>withHand(reactor,hand,()=>{
        const item=activeWeaponItem(reactor),weapon=weaponTemplate(item);
        if(!weapon?.contre_charge||!isLoaded(reactor,item)) return null;
        const mode=isRangedWeapon(weapon)?"ranged":"melee";
        const inReach=at=>at>=1&&at<=path.length&&canAttackAtDistance(reactor,axialDistance(reactor,path[at-1]),mode);
        if(mode==="ranged"){
          const at=Math.ceil(path.length/2);
          return inReach(at)?{at,mode,hand}:null;
        }
        for(let at=1;at<=path.length;at++) if(inReach(at)) return {at,mode,hand};
        return null;
      })).filter(Boolean).sort((x,y)=>x.at-y.at);
    }
    function counterchargeTrigger(reactor,charger,charge){
      return counterchargeTriggers(reactor,charger,charge)[0]||null;
    }

    // Combat à deux armes CAC V1 : la séquence n s'ouvre si au moins une attaque de la séquence précédente a
    // réellement touché, sans échec critique, contre une cible encore vivante ; P_n = min(100, (Dextérité
    // effective + Vitesse combat effective) / n). Une paire sans arme de mêlée s'arrête à sa paire de base.
    function rollPairChain(attacker,defender,results,n){
      if(!results.length||results.some(r=>r.fumble||r.woundFumble)) return null;
      if(!results.some(r=>r.ok&&r.hit&&!r.blocked)||!results.some(r=>r.mode==="melee")) return null;
      if(!attacker.alive||!defender.alive) return null;
      const p=chainChance(attacker,n,"melee"),roll=d100();
      return {n,p,roll,continues:roll<=p};
    }

    // Chaque attaque résolue est signalée au crochet options.onAttack(attaquant, défenseur, options,
    // résultat), par exemple pour le journal de progression (game-core/progression.js).
    // attackOptions.hand = "off" : attaque avec l'arme de la main secondaire (combat à deux armes).
    function resolveAttack(attacker,defender,attackOptions={}){
      const result=withHand(attacker,attackOptions.hand,()=>resolveAttackRolls(attacker,defender,attackOptions));
      if(attackOptions.hand==="off") result.hand="off";
      if(typeof options.onAttack==="function"){
        options.onAttack(attacker,defender,attackOptions,result);
        if(result.stray?.unit) options.onAttack(attacker,result.stray.unit,attackOptions,result.stray.result);
      }
      return result;
    }

    function resolveAttackRolls(attacker,defender,options={}){
      const mode=options.mode||"melee";
      const distance=Number(options.distance)||axialDistance(attacker,defender);
      const item=activeWeaponItem(attacker),weapon=weaponTemplate(item);
      if(!weapon) return {ok:false,reason:"Aucune arme active."};
      if(!isLoaded(attacker,item)) return {ok:false,reason:item.name+" est déchargé : une action rapide le recharge."};
      if(!canAttackAtDistance(attacker,distance,mode)) return {ok:false,reason:"Cible hors portée ou arme incompatible."};

      // Toute attaque d'opportunité bénéficie de Frappe dans le dos (Attaque d'opportunité CAC V1),
      // de même que toute attaque au CAC contre une cible encerclée (Encerclement CAC V1).
      // Une cible En Fuite subit aussi une Frappe dans le dos (Frappe dans le dos V1).
      const opportunity=Boolean(options.opportunity);
      const encircled=mode==="melee"&&Boolean(options.encircled);
      const fleeingTarget=Boolean(defender.fleeing);
      const backstab=opportunity||encircled||fleeingTarget||Boolean(options.backstab);
      if(opportunity&&(mode!=="melee"||Number(options.chargeDistance)>0)) return {ok:false,reason:"Une attaque d'opportunité est un coup de mêlée simple."};
      // Le coup part : une arme à recharge est désormais déchargée, qu'il touche ou non.
      if(needsLoading(weapon)) attacker.unloaded=[...(attacker.unloaded||[]),item.id];

      // options.chargeFollowUp : seconde arme d'une charge à deux armes (décision Idan, 2026-10-08) ; la chute
      // de charge n'est tirée qu'une fois, pour la première arme.
      let chargePower=0;
      if(Number(options.chargeDistance)>0){
        const fallRoll=options.chargeFollowUp?100:d100();
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
      // twoHanded : arme tenue à deux mains (XP de la compétence Combat à deux mains).
      const head={ok:true,mode,weapon:weapon.nom,distance,pHit,hitRoll,twoHanded:usesTwoHands(attacker,weapon)};
      if(!hit){
        // Échec critique CAC V1 : un naturel 96–100 déclenche un test de Chance ; raté → Au Sol.
        const fumble=fumbleTest(attacker,hitRoll);
        if(fumble.fumble) attacker.prone=true;
        const missed={...head,hit:false,...fumble,wound:false,damage:0,...tags};
        // Approximation projectile V1 : options.bystanders = les autres combattants présents.
        if(mode==="ranged"&&Array.isArray(options.bystanders)) missed.stray=resolveStray(attacker,defender,options.bystanders,weapon);
        return missed;
      }
      return {...head,hit:true,...resolveHit(attacker,defender,mode,{chargePower,backstab}),...tags};
    }

    // Suite d'un Toucher réussi : blocage, critique au Toucher, Blesser, critique de blessure, dégâts.
    function resolveHit(attacker,defender,mode,{chargePower=0,backstab=false}={}){
      const weapon=weaponTemplate(activeWeaponItem(attacker));

      // Blocage bouclier physique V1 : après le Toucher, avant le critique ; au CAC comme au tir, même dans
      // le dos. Un coup bloqué ne compte pas comme un toucher réel : ni critique, ni Blesser, ni dégâts.
      const pBlock=blockChance(defender);
      const block={};
      if(pBlock!==null){
        const blockRoll=d100();
        Object.assign(block,{pBlock,blockRoll,blocked:blockRoll<=pBlock,shield:weaponTemplate(activeOffhandItem(defender)).nom});
        if(block.blocked) return {...block,wound:false,damage:0};
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
        return {...crit,matchup,pWound,woundRoll,wound:false,...recoil,damage:0};
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

      return {...crit,matchup,pWound,woundRoll,wound:true,...damageData,targetHp:defender.hp,targetDown:!defender.alive};
    }

    // Approximation projectile V1. Couloir de tir (Idan, 2026-10-08) : cône de 30° depuis le tireur, centré sur
    // l'axe tireur → cible, compté de la moitié de la distance de la cible jusqu'à la portée max de l'arme.
    function cartesian(h){ return {x:Math.sqrt(3)*(h.q+h.r/2),y:1.5*h.r}; }
    function inFiringCorridor(shooter,target,unit){
      const reach=axialDistance(shooter,unit);
      if(reach<STRAY.startRatio*axialDistance(shooter,target)||reach>weaponRange(shooter).max) return false;
      const s=cartesian(shooter),t=cartesian(target),u=cartesian(unit);
      const ax=t.x-s.x,ay=t.y-s.y,bx=u.x-s.x,by=u.y-s.y;
      const cos=(ax*bx+ay*by)/(Math.hypot(ax,ay)*Math.hypot(bx,by));
      return cos>=Math.cos(STRAY.coneAngle/2*Math.PI/180)-1e-9;
    }
    // Candidats : alliés et ennemis du couloir, du plus proche de la cible initiale au plus lointain ;
    // à égalité, un ennemi du tireur d'abord, puis le plus proche du tireur.
    function strayCandidates(shooter,target,units){
      const ally=u=>Boolean(shooter.team)&&u.team===shooter.team;
      return units
        .filter(u=>u!==shooter&&u!==target&&u.alive&&!u.offMap&&inFiringCorridor(shooter,target,u))
        .sort((a,b)=>axialDistance(a,target)-axialDistance(b,target)||ally(a)-ally(b)||axialDistance(shooter,a)-axialDistance(shooter,b));
    }
    // P_accident,i = P_toucher(candidat) × 0,35 × 0,5^(i−1) ; le premier touché devient la cible réelle
    // (blocage, critique, Blesser, dégâts). Ne s'applique pas aux armes de zone.
    function resolveStray(shooter,target,units,weapon){
      if(skillByName.get(weapon.nom)?.attaque_de_zone) return null;
      const tries=[];
      let factor=STRAY.initial;
      for(const unit of strayCandidates(shooter,target,units)){
        const distance=axialDistance(shooter,unit),backstab=Boolean(unit.fleeing);
        const p=hitProbability(shooter,unit,"ranged",distance,{backstab})*factor,roll=d100();
        tries.push({unit,p,roll});
        if(roll<=p){
          const result={ok:true,mode:"ranged",weapon:weapon.nom,distance,pHit:p,hitRoll:roll,hit:true,accidental:true,
            ...resolveHit(shooter,unit,"ranged",{backstab}),chargePower:0,opportunity:false,encircled:false,fleeingTarget:backstab,backstab};
          return {tries,unit,result};
        }
        factor*=STRAY.decay;
      }
      return {tries,unit:null,result:null};
    }

    // Attaque d'opportunité CAC V1 : un combattant menace les hexagones atteignables par son arme de mêlée active.
    // Un personnage En Fuite ne menace personne : il ne fait pas d'attaque d'opportunité (décision Idan, Issue #8).
    // À deux armes, chaque arme de mêlée tenue menace sa propre portée.
    function threatens(unit,hex){
      if(!unit?.alive||unit.fleeing) return false;
      return usableHands(unit,axialDistance(unit,hex)).some(h=>h.mode==="melee");
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
        step,
        min:base,
        max:2*base
      };
    }

    return {
      axialDistance,
      activeWeaponItem,
      activeOffhandItem,
      weaponTemplate,
      armorItem,
      armorTemplate,
      bootsItem,
      bootsBonus,
      statWithBoots,
      quality,
      isRangedWeapon,
      isMeleeWeapon,
      armorMobility,
      heldItemSpeedPenalty,
      usesTwoHands,
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
      physicalDamage,
      criticalChance,
      isDualWielding,
      effectiveDexterity,
      usableHands,
      blockChance,
      isRepeatable,
      needsLoading,
      isLoaded,
      canReload,
      reload,
      chainChance,
      rollChain,
      rollPairChain,
      resolveAttack,
      canSwitchWeaponSet,
      switchWeaponSet,
      chargeData,
      counterchargeTrigger,
      counterchargeTriggers,
      inFiringCorridor,
      strayCandidates,
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
