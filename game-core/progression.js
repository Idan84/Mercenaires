"use strict";

// Progression naturelle (08-progression-and-experience.md §1–2 ; décisions Idan du 2026-10-06) :
// - la valeur d'une caractéristique est son niveau : XP cumulée = coefficient × Niveau² ;
// - pendant la mission, chaque combattant tient un journal de ce qu'il vit (charges tentées,
//   adversaires mis hors combat, blessures subies, cases parcourues en fuite, activations…) ;
// - en fin de mission, ce journal devient de l'XP : une caractéristique peut monter ou descendre,
//   l'XP ne descend jamais sous 0 ;
// - une valeur générée démarre dans la tranche de son niveau à la position
//   progression.xp_curve.start_position (0 = bas de la tranche, 0,5 = milieu), pour qu'une petite
//   perte ne fasse pas tomber un point dès la première mission.
// Compétences (décisions Idan du 2026-10-20) : même courbe, plafond à la valeur maximale de la compétence
// (100) ; les valeurs générées ayant des décimales, une compétence est un niveau continu : 30,6 = niveau 30,
// à 60 % de la tranche vers 31. On progresse dans ce qu'on pratique au détriment des autres armes et styles.
// Magie (12-magic.md, étape 3 ; Idan, 2026-10-25) : chaque lancer donne de l'XP au sort et à son école (comme l'arme et
// sa catégorie) ; ses deux écoles opposées perdent la moitié du gain de l'école, un quart chacune.
// Toutes les valeurs sont des constantes d'équilibrage (data/reference/formula-constants.json).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesProgression=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const RESISTANCES=["Résistance physique","Résistance au feu","Résistance au froid","Résistance à la foudre","Résistance au poison"];
  // Type de dégâts (moteur de combat) → résistance correspondante. Les sous-types physiques comptent pour
  // la Résistance physique.
  const RESISTANCE_BY_DAMAGE={
    tranchant:"Résistance physique",perforant:"Résistance physique",contondant:"Résistance physique",physique:"Résistance physique",
    feu:"Résistance au feu",froid:"Résistance au froid",foudre:"Résistance à la foudre",poison:"Résistance au poison"
  };

  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }

  // Journal d'un combattant pour une mission.
  // loadRatios : Charge ÷ Force relevée à chaque activation (Force : porter son équipement).
  // weaponUses : par arme, {attacks, hits, wounds} ; blocks : blocages par bouclier.
  function emptyLog(){
    return {
      activations:0,loadRatios:[],chargeAttempts:0,knockouts:0,fleeHexes:0,backstabWounds:0,wounds:{},hpHealed:0,
      criticalSuccesses:0,criticalFailures:0,
      chains:0,woundsTaken:0,heavyArmorHexes:0,courageHeld:0,recoveries:0,worstChoices:0,
      weaponUses:{},twoHandedAttacks:0,dualSequences:0,blocks:{},intimidations:0,
      enemyWounds:{},enemyKnockouts:{},
      spellCasts:{},manaSpent:0,spellCriticalSuccesses:0,spellCriticalFailures:0
    };
  }
  function logOf(unit){ return unit.progress||(unit.progress=emptyLog()); }
  // Réputation personnelle d'un combattant (unité de mission ou personnage). Les gains de carrière ne sont
  // appliqués qu'en fin de mission : la valeur lue en cours de mission est celle du début de la mission.
  function reputationOf(unit){ return Number(unit?.reputation??unit?.character?.reputation)||0; }
  function unitKey(unit){ return String(unit?.id??unit?.character?.id??unit?.name); }

  // Après chaque attaque résolue par le moteur de combat (crochet onAttack de createCombatEngine).
  function recordAttack(attacker,defender,options,result){
    if(!result?.ok) return;
    // Une charge à deux armes reste une seule charge tentée : la seconde arme (chargeFollowUp) ne compte pas.
    if(Number(options?.chargeDistance)>0&&!options.chargeFollowUp) recordChargeAttempt(attacker);
    if(result.wound){
      // Moteur V1 : une attaque blesse avec une seule composante, physique (result.matchup.type).
      recordWound(defender,result.matchup?.type);
      if(result.backstab) logOf(defender).backstabWounds++;
      // Esquive : chaque coup encaissé qui blesse (Idan, 2026-10-20).
      logOf(defender).woundsTaken++;
    }
    // Boucliers : chaque blocage du défenseur.
    if(result.blocked&&result.shield){
      const blocks=logOf(defender).blocks;
      blocks[result.shield]=(blocks[result.shield]||0)+1;
    }
    // Compétences d'armes : chaque attaque portée avec l'arme (pas la chute de charge, pas le projectile
    // perdu, qui est le même tir), avec ses touchers réels et ses blessures.
    if(result.weapon&&!result.chargeFall&&!result.accidental){
      const uses=logOf(attacker).weaponUses;
      const use=uses[result.weapon]||(uses[result.weapon]={attacks:0,hits:0,wounds:0});
      use.attacks++;
      if(result.hit&&!result.blocked) use.hits++;
      if(result.wound) use.wounds++;
      if(result.twoHanded&&result.mode==="melee") logOf(attacker).twoHandedAttacks++;
    }
    // Intelligence : apprendre de ses erreurs quand il choisit le pire type de dégâts (Idan, 2026-10-20).
    if(result.matchup?.choice==="pire"&&!result.accidental) logOf(attacker).worstChoices++;
    const adversary=!(attacker.team&&attacker.team===defender.team);
    // Réputation (09 §1, Exploits et carrière) : participation à la blessure d'un adversaire, une seule fois
    // par ennemi, dès que le coup lui inflige des dégâts ; on garde sa réputation pour le bilan.
    if(result.wound&&Number(result.damage)>0&&adversary) logOf(attacker).enemyWounds[unitKey(defender)]=reputationOf(defender);
    // Charisme : adversaire mis hors combat par ce coup (Idan, 2026-10-06) ; pas un allié touché par accident.
    // Réputation : le même coup est le coup de grâce.
    if(result.targetDown&&adversary){
      logOf(attacker).knockouts++;
      logOf(attacker).enemyKnockouts[unitKey(defender)]=reputationOf(defender);
    }
    // Chance : chaque critique (Toucher ou Blesser) et chaque échec critique confirmé.
    if(result.criticalHit) recordCritical(attacker,"success");
    if(result.criticalWound) recordCritical(attacker,"success");
    if(result.fumble) recordCritical(attacker,"failure");
    if(result.woundFumble){
      recordCritical(attacker,"failure");
      // Le contrecoup est une blessure physique subie par l'attaquant (« quelle que soit sa source »).
      recordWound(attacker,"physique");
    }
  }
  // Chaque composante de dégâts qui blesse effectivement (doc 08, Résistances) : dégâts mixtes, dégâts sur
  // la durée et coups multiples appelleront recordWound une fois par composante et par blessure.
  function recordWound(unit,damageType){
    const log=logOf(unit);
    const resistance=RESISTANCE_BY_DAMAGE[damageType]||"Résistance physique";
    log.wounds[resistance]=(log.wounds[resistance]||0)+1;
  }
  // Courage : la charge compte dès qu'elle est tentée, même ratée, finie en chute ou brisée avant le coup
  // (Idan, 2026-10-06). recordAttack la compte quand l'attaque de charge est résolue ; une charge arrêtée
  // avant son attaque (contre-charge, attaque d'opportunité) est signalée directement.
  function recordChargeAttempt(unit){ logOf(unit).chargeAttempts++; }
  // Chaque activation du combattant pendant la mission. carried = {load, force} au moment de l'activation :
  // un changement d'équipement en cours de mission ne réécrit pas l'XP de Force déjà acquise.
  function recordActivation(unit,carried=null){
    const log=logOf(unit);
    log.activations++;
    const force=Number(carried?.force)||0;
    if(force>0) (log.loadRatios||(log.loadRatios=[])).push((Number(carried.load)||0)/force);
  }
  // Chaque case parcourue en état de fuite.
  function recordFleeHex(unit){ logOf(unit).fleeHexes++; }
  // Dextérité : chaque enchaînement réussi (attaque, tir ou séquence à deux armes supplémentaire).
  function recordChain(unit){ logOf(unit).chains++; }
  // Combat à deux armes : chaque séquence où les DEUX armes ont réellement frappé (revue Chatty du
  // 2026-10-20) : une seconde arme déchargée ou hors de portée ne donne rien.
  function recordDualSequence(unit,results){
    const hands=new Set((results||[]).filter(r=>r?.ok).map(r=>r.hand==="off"?"off":"main"));
    if(hands.has("main")&&hands.has("off")) logOf(unit).dualSequences++;
  }
  // Volonté : chaque test de Courage réussi et chaque reprise de contrôle en fuite.
  function recordCourageHeld(unit){ logOf(unit).courageHeld++; }
  function recordRecovery(unit){ logOf(unit).recoveries++; }
  // Intimidation : un adversaire rate son test de Courage face à ce combattant (pas un allié).
  function recordIntimidation(unit,subject){
    if(unit&&!(unit.team&&unit.team===subject?.team)) logOf(unit).intimidations++;
  }
  // Constitution : PV réellement restaurés par un soin (sort, régénération…), au mercenaire soigné.
  function recordHeal(unit,hp){ logOf(unit).hpHealed+=Math.max(0,Number(hp)||0); }
  // Chaque sort lancé, même raté (12-magic.md, étape 3 ; Idan, 2026-10-25). school : école du sort ; success : il
  // réussit ; effect : il a un vrai effet (PV soignés, dégâts qui passent la protection, effet posé, poison purgé) ;
  // mana : mana dépensé, même en cas d'échec ; critical : coup critique ; fumble : échec critique confirmé.
  function recordSpell(unit,{code,school=null,success=false,effect=false,mana=0,critical=false,fumble=false}={}){
    if(!unit||!code) return;
    const log=logOf(unit);
    const casts=log.spellCasts||(log.spellCasts={});
    const cast=casts[code]||(casts[code]={school,casts:0,successes:0,effects:0});
    cast.casts++;
    if(success) cast.successes++;
    if(success&&effect) cast.effects++;
    log.manaSpent=(Number(log.manaSpent)||0)+Math.max(0,Number(mana)||0);
    // Chance et réputation : les critiques des sorts comptent comme ceux des armes (Idan, 2026-10-25).
    if(critical) log.spellCriticalSuccesses=(Number(log.spellCriticalSuccesses)||0)+1;
    if(fumble) log.spellCriticalFailures=(Number(log.spellCriticalFailures)||0)+1;
  }
  // Dégâts d'un sort ou d'une arme enflammée : chaque blessure d'un élément compte pour sa résistance (doc 08), et pour
  // le lanceur, comme un coup d'arme, la blessure et la mise hors combat d'un adversaire (Charisme, réputation).
  function recordSpellDamage(source,target,damage,{element=null,down=false}={}){
    if(!target||!(Number(damage)>0)) return;
    if(element) recordWound(target,element);
    if(!source||(source.team&&source.team===target.team)) return;
    logOf(source).enemyWounds[unitKey(target)]=reputationOf(target);
    if(down){
      logOf(source).knockouts++;
      logOf(source).enemyKnockouts[unitKey(target)]=reputationOf(target);
    }
  }
  // Critiques : success = critique positif, failure = échec critique confirmé.
  function recordCritical(unit,kind){
    if(kind==="success") logOf(unit).criticalSuccesses++;
    else if(kind==="failure") logOf(unit).criticalFailures++;
  }

  function createProgressionRules({reference}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      curve:k("progression.xp_curve.coefficient",10),
      startPosition:k("progression.xp_curve.start_position",0.5),
      chanceCriticalFailure:k("progression.chance.critical_failure_xp",30),
      chanceCriticalSuccess:k("progression.chance.critical_success_xp",-5),
      resistanceWound:k("progression.resistance.wound_xp",8),
      resistanceOthers:k("progression.resistance.other_resistances_xp",-2),
      constitutionHpHealed:k("progression.constitution.hp_healed_xp",1),
      courageChargeAttempt:k("progression.courage.charge_attempt_xp",50),
      speedFleeHex:k("progression.speed.flee_hex_xp",2),
      charismaKnockout:k("progression.charisma.knockout_xp",50),
      perceptionBackstabWound:k("progression.perception.backstab_wound_xp",10),
      forceLoadThreshold:k("progression.force.load_ratio_threshold",0.25),
      forceLoadXp:k("progression.force.load_ratio_xp",20),
      // Décisions Idan du 2026-10-20.
      dexterityChain:k("progression.dexterity.chain_xp",50),
      dodgeWoundTaken:k("progression.dodge.wound_taken_xp",10),
      enduranceHeavyArmorHex:k("progression.endurance.heavy_armor_hex_xp",2),
      willCourageHeld:k("progression.will.courage_held_xp",20),
      willRecovery:k("progression.will.recovery_xp",20),
      intelligenceWorstChoice:k("progression.intelligence.worst_choice_xp",30),
      skillWeaponAttack:k("progression.skill.weapon_attack_xp",10),
      skillWeaponHit:k("progression.skill.weapon_hit_xp",5),
      skillWeaponWound:k("progression.skill.weapon_wound_xp",5),
      skillTwoHandedAttack:k("progression.skill.two_handed_attack_xp",10),
      skillDualSequence:k("progression.skill.dual_sequence_xp",10),
      skillShieldBlock:k("progression.skill.shield_block_xp",10),
      skillIntimidation:k("progression.skill.intimidation_xp",50),
      skillRegressionRatio:k("progression.skill.regression_ratio",0.5),
      // Magie (Idan, 2026-10-25).
      spellCast:k("progression.magic.spell_cast_xp",10),
      spellSuccess:k("progression.magic.spell_success_xp",5),
      spellEffect:k("progression.magic.spell_effect_xp",5),
      schoolRegressionRatio:k("progression.magic.opposite_regression_ratio",0.5),
      schoolFloor:k("progression.magic.school_floor",1),
      magicPowerSpellEffect:k("progression.magic_power.spell_effect_xp",20),
      manaReserveManaSpent:k("progression.mana_reserve.mana_spent_xp",2)
    };
    // Réputation de carrière (09-reputation-renown-and-salaries.md §1, Exploits et carrière ; Idan, 2026-10-20).
    const R={
      criticalSuccess:k("reputation.career.critical_success",1),
      criticalFailure:k("reputation.career.critical_failure",-1),
      enemyWoundShare:k("reputation.career.enemy_wound_share",0.01),
      enemyKnockoutShare:k("reputation.career.enemy_knockout_share",0.1),
      returnWounded:k("reputation.career.return_wounded",10),
      returnUnhurt:k("reputation.career.return_unhurt",20)
    };
    const minimum=new Map((reference?.characteristics?.rows||[]).map(r=>[r.nom,Number(r.minimum)]));
    const weaponPenalty=new Map((reference?.weapons?.rows||[]).map(w=>[w.nom,Number(w.malus_vitesse_arme_base)||0]));
    const armorRows=reference?.baseArmors?.rows||[];
    // Compétences martiales : arme précise → catégorie (skills.json, parent) ; plafond = valeur_maximale.
    const skillRows=reference?.skills?.rows||[];
    const weaponNames=new Set((reference?.weapons?.rows||[]).map(w=>w.nom));
    const categoryOf=new Map(skillRows.filter(r=>weaponNames.has(r.nom)&&r.parent).map(r=>[r.nom,r.parent]));
    const skillMax=new Map(skillRows.map(r=>[r.nom,Number(r.valeur_maximale)]));
    // Les trois styles de combat progressent l'un au détriment des autres ; « Boucliers » en fait partie et
    // sort donc des catégories d'armes.
    const STYLES=["Combat à deux mains","Combat à deux armes","Boucliers"];
    // Écoles de magie : leurs deux écoles opposées (skills.json, ecoles_opposees).
    const oppositeSchools=new Map(skillRows.filter(r=>r.ecoles_opposees)
      .map(r=>[r.nom,String(r.ecoles_opposees).split(",").map(x=>x.trim()).filter(Boolean)]));
    const weaponCategories=new Set([...categoryOf.values()].filter(c=>!STYLES.includes(c)));
    const SPELL_MAX=100;
    const LOAD_SLOTS=["weapon_set_1_main","weapon_set_1_off","weapon_set_2_main","weapon_set_2_off","armor"];

    // Charge portée (Force, décision Idan du 2026-10-07) : malus de vitesse de base de l'armure et de
    // toutes les armes équipées (les deux sets, qu'il transporte), qui représente leur poids.
    function loadOf(mercenary){
      let load=0;
      for(const slot of LOAD_SLOTS){
        const id=mercenary?.equipment?.slots?.[slot];
        const item=id?(mercenary.items||[]).find(x=>x.id===id):null;
        if(!item) continue;
        if(slot==="armor"){
          const code=String(item.templateId||"").replace(/^armor:/,"");
          const armor=armorRows.find(a=>a.code===code)||armorRows.find(a=>a.nom===item.name);
          load+=Number(armor?.malus_vitesse_base)||0;
        }else{
          load+=weaponPenalty.get(item.name)||0;
        }
      }
      return load;
    }

    const xpForLevel=level=>C.curve*level*level;
    const levelForXp=xp=>Math.floor(Math.sqrt(Math.max(0,xp)/C.curve)+1e-9);
    // XP d'une valeur qui n'en a pas encore (valeur générée) : position dans la tranche de son niveau.
    function startingXp(value){
      const level=Math.max(0,Math.floor(Number(value)||0));
      return Math.round(xpForLevel(level)+C.startPosition*(xpForLevel(level+1)-xpForLevel(level)));
    }

    // Endurance : armure lourde (base-armors.json, type_armure) portée au moment du déplacement.
    function wearsHeavyArmor(mercenary){
      const id=mercenary?.equipment?.slots?.armor;
      const item=id?(mercenary.items||[]).find(x=>x.id===id):null;
      if(!item) return false;
      const code=String(item.templateId||"").replace(/^armor:/,"");
      const armor=armorRows.find(a=>a.code===code)||armorRows.find(a=>a.nom===item.name);
      return armor?.type_armure==="Lourde";
    }

    // Niveau continu d'une compétence : 30,6 = niveau 30, à 60 % de la tranche vers 31 (Idan, 2026-10-20).
    function continuousLevel(xp){
      const level=levelForXp(xp);
      const span=xpForLevel(level+1)-xpForLevel(level);
      return level+(Math.max(0,xp)-xpForLevel(level))/span;
    }
    function xpForContinuous(value){
      const v=Math.max(0,Number(value)||0),level=Math.floor(v);
      return xpForLevel(level)+(v-level)*(xpForLevel(level+1)-xpForLevel(level));
    }

    // Compétences martiales : XP de pratique, puis régression (Idan, 2026-10-20) : chaque gain fait perdre au
    // total ratio × gain, à parts égales, aux compétences que le mercenaire possède (valeur > 0) dans :
    // - les armes des autres catégories, pour un gain d'arme (pas les armes de la même catégorie) ;
    // - les autres catégories d'armes, pour un gain de catégorie ;
    // - les autres styles (deux mains, deux armes, boucliers), pour un gain de style.
    function martialGains(l,mercenary){
      const raw={};
      const add=(name,xp)=>{ if(xp) raw[name]=(raw[name]||0)+xp; };
      for(const [weapon,use] of Object.entries(l.weaponUses||{})){
        const xp=use.attacks*C.skillWeaponAttack+use.hits*C.skillWeaponHit+use.wounds*C.skillWeaponWound;
        add(weapon,xp);
        const category=categoryOf.get(weapon);
        if(category) add(category,xp);
      }
      add("Combat à deux mains",l.twoHandedAttacks*C.skillTwoHandedAttack);
      add("Combat à deux armes",l.dualSequences*C.skillDualSequence);
      for(const [shield,count] of Object.entries(l.blocks||{})){
        add(shield,count*C.skillShieldBlock);
        add("Boucliers",count*C.skillShieldBlock);
      }
      const result={...raw};
      const owned=mercenary?.skills?.martial||{};
      const has=name=>Number(owned[name])>0;
      for(const [name,xp] of Object.entries(raw)){
        if(xp<=0) continue;
        let others;
        if(STYLES.includes(name)) others=STYLES.filter(x=>x!==name&&has(x));
        else if(weaponCategories.has(name)) others=[...weaponCategories].filter(x=>x!==name&&has(x));
        else if(categoryOf.has(name)) others=[...categoryOf.keys()].filter(x=>categoryOf.get(x)!==categoryOf.get(name)&&has(x));
        else others=[];
        for(const other of others) result[other]=(result[other]||0)-C.skillRegressionRatio*xp/others.length;
      }
      for(const name of Object.keys(result)) if(!result[name]) delete result[name];
      return result;
    }

    // Magie : par lancer, XP au sort et à son école (lancer + réussite + vrai effet) ; chaque gain d'école fait perdre
    // ratio × gain à ses deux écoles opposées, à parts égales (Idan, 2026-10-25). Les sorts ne régressent pas.
    function magicGains(l){
      const schools={},spells={};
      for(const [code,cast] of Object.entries(l.spellCasts||{})){
        const xp=(Number(cast.casts)||0)*C.spellCast+(Number(cast.successes)||0)*C.spellSuccess+(Number(cast.effects)||0)*C.spellEffect;
        if(!xp) continue;
        spells[code]=(spells[code]||0)+xp;
        if(cast.school) schools[cast.school]=(schools[cast.school]||0)+xp;
      }
      const result={...schools};
      for(const [school,xp] of Object.entries(schools)){
        const opposites=oppositeSchools.get(school)||[];
        for(const other of opposites) result[other]=(result[other]||0)-C.schoolRegressionRatio*xp/opposites.length;
      }
      for(const name of Object.keys(result)) if(!result[name]) delete result[name];
      return {schools:result,spells};
    }

    // Journal → XP par caractéristique, résistance et compétence (valeurs non nulles seulement).
    // Force : XP par activation = coefficient × max(0, Charge / Force − seuil).
    // Le mercenaire sert aux régressions de compétences (celles qu'il possède).
    // spells : XP de chaque sort lancé (par code), appliquée aux sorts du grimoire.
    function gains(log,mercenary=null){
      const l={...emptyLog(),...(log||{})};
      const stats={},resistances={};
      const add=(target,name,xp)=>{ if(xp) target[name]=(target[name]||0)+xp; };
      add(stats,"Chance",(l.criticalFailures+l.spellCriticalFailures)*C.chanceCriticalFailure
        +(l.criticalSuccesses+l.spellCriticalSuccesses)*C.chanceCriticalSuccess);
      add(stats,"Constitution",l.hpHealed*C.constitutionHpHealed);
      add(stats,"Courage",l.chargeAttempts*C.courageChargeAttempt);
      add(stats,"Vitesse",l.fleeHexes*C.speedFleeHex);
      add(stats,"Charisme",l.knockouts*C.charismaKnockout);
      add(stats,"Perception",l.backstabWounds*C.perceptionBackstabWound);
      add(stats,"Force",Math.round((l.loadRatios||[]).reduce((sum,ratio)=>sum+C.forceLoadXp*Math.max(0,ratio-C.forceLoadThreshold),0)));
      add(stats,"Dextérité",l.chains*C.dexterityChain);
      add(stats,"Esquive",l.woundsTaken*C.dodgeWoundTaken);
      add(stats,"Endurance",l.heavyArmorHexes*C.enduranceHeavyArmorHex);
      add(stats,"Volonté",l.courageHeld*C.willCourageHeld+l.recoveries*C.willRecovery);
      add(stats,"Intelligence",l.worstChoices*C.intelligenceWorstChoice);
      // Puissance magique : chaque sort réussi qui a un vrai effet ; Réserve de mana : chaque point de mana dépensé.
      add(stats,"Puissance magique",Object.values(l.spellCasts||{}).reduce((sum,cast)=>sum+(Number(cast.effects)||0),0)*C.magicPowerSpellEffect);
      add(stats,"Réserve de mana",Math.round((Number(l.manaSpent)||0)*C.manaReserveManaSpent));
      // Chaque blessure : +XP à la résistance du type, −XP à chacune des quatre autres.
      for(const [hit,count] of Object.entries(l.wounds||{})){
        for(const resistance of RESISTANCES) add(resistances,resistance,count*(resistance===hit?C.resistanceWound:C.resistanceOthers));
      }
      for(const target of [stats,resistances]) for(const name of Object.keys(target)) if(!target[name]) delete target[name];
      const skills={};
      const martial=martialGains(l,mercenary);
      if(Object.keys(martial).length) skills.martial=martial;
      if(l.intimidations) skills.social={Intimidation:l.intimidations*C.skillIntimidation};
      const magic=magicGains(l);
      if(Object.keys(magic.schools).length) skills.magic=magic.schools;
      return Object.keys(magic.spells).length?{stats,resistances,skills,spells:magic.spells}:{stats,resistances,skills};
    }

    // Applique l'XP au mercenaire (mercenary.xp garde l'XP de chaque valeur) ; renvoie les changements.
    // La valeur fait foi : si elle a changé par ailleurs, son XP repart de sa position de départ.
    function apply(mercenary,xp){
      const changes=[];
      mercenary.xp=mercenary.xp||{};
      for(const family of ["stats","resistances"]){
        const values=mercenary[family];
        for(const [name,delta] of Object.entries(xp?.[family]||{})){
          if(!values||!(name in values)) continue;
          const before=Number(values[name])||0;
          const store=mercenary.xp[family]||(mercenary.xp[family]={});
          const stored=store[name];
          const xpBefore=Number.isFinite(stored)&&levelForXp(stored)===before?stored:startingXp(before);
          // Plancher : 0 XP, ou l'XP du minimum de la valeur (characteristics.json) s'il est plus haut.
          const floor=Number.isFinite(minimum.get(name))?Math.max(0,minimum.get(name)):0;
          const xpAfter=Math.max(xpForLevel(floor),xpBefore+delta);
          const after=levelForXp(xpAfter);
          store[name]=xpAfter;
          values[name]=after;
          changes.push({family,name,xp:delta,before,after,xpBefore,xpAfter});
        }
      }
      // Compétences : niveau continu, plafond à valeur_maximale (100). Une valeur générée au-delà du plafond
      // n'est pas touchée (Idan, 2026-10-20) : elle ne monte plus, mais peut redescendre.
      for(const [group,entries] of Object.entries(xp?.skills||{})){
        const values=mercenary.skills?.[group];
        for(const [name,delta] of Object.entries(entries||{})){
          if(!values||!Number.isFinite(Number(values[name]))) continue;
          const before=Number(values[name]);
          const skillStore=mercenary.xp.skills||(mercenary.xp.skills={});
          const store=skillStore[group]||(skillStore[group]={});
          const stored=store[name];
          const xpBefore=Number.isFinite(stored)&&Math.abs(continuousLevel(stored)-before)<1e-6?stored:xpForContinuous(before);
          const cap=Number.isFinite(skillMax.get(name))?skillMax.get(name):Infinity;
          // Une école ne descend pas sous la valeur « sans l'école » de la génération (1).
          const floor=group==="magic"?xpForContinuous(Math.min(before,C.schoolFloor)):0;
          let xpAfter=Math.max(floor,xpBefore+delta);
          if(delta>0) xpAfter=before>=cap?xpBefore:Math.min(xpAfter,xpForContinuous(cap));
          const after=Math.round(continuousLevel(xpAfter)*1e6)/1e6;
          store[name]=xpAfter;
          values[name]=after;
          changes.push({family:"skills",group,name,xp:delta,before,after,xpBefore,xpAfter});
        }
      }
      // Sorts du grimoire (mercenary.spells : {code, name, school, mastery}) : même courbe, niveau continu de 1 à 100.
      // Un sort prêté pour un seul combat (bouton de test) n'est pas dans le grimoire : son XP reste dans le bilan.
      for(const [code,delta] of Object.entries(xp?.spells||{})){
        const known=(mercenary.spells||[]).find(x=>x.code===code);
        if(!known||!(delta>0)) continue;
        const before=Math.max(1,Number(known.mastery)||1);
        const store=mercenary.xp.spells||(mercenary.xp.spells={});
        const stored=store[code];
        const xpBefore=Number.isFinite(stored)&&Math.abs(continuousLevel(stored)-before)<1e-6?stored:xpForContinuous(before);
        const xpAfter=before>=SPELL_MAX?xpBefore:Math.min(xpBefore+delta,xpForContinuous(SPELL_MAX));
        const after=Math.round(continuousLevel(xpAfter)*1e6)/1e6;
        store[code]=xpAfter;
        known.mastery=after;
        changes.push({family:"spells",name:known.name||code,code,xp:delta,before,after,xpBefore,xpAfter});
      }
      return changes;
    }

    // Activation d'un combattant en mission, avec sa charge et sa Force du moment.
    function recordUnitActivation(unit){
      recordActivation(unit,{load:loadOf(unit.character),force:unit.character?.stats?.Force});
    }
    // Chaque case parcourue : Endurance si l'armure portée à ce moment est lourde.
    function recordStep(unit){
      if(wearsHeavyArmor(unit.character)) logOf(unit).heavyArmorHexes++;
    }

    // Journal → gains de réputation d'un survivant. wounded = issue « Blessé » de fin de mission
    // (10-mission-time §7) ; la fatigue seule n'est pas une blessure : retour indemne. Les deux bonus de
    // retour sont exclusifs. Les parts de la réputation des ennemis gardent leurs décimales.
    function reputationGains(log,{wounded=false}={}){
      const l={...emptyLog(),...(log||{})};
      const total=values=>Object.values(values||{}).reduce((sum,v)=>sum+(Number(v)||0),0);
      const sources={
        criticalSuccesses:(l.criticalSuccesses+l.spellCriticalSuccesses)*R.criticalSuccess,
        criticalFailures:(l.criticalFailures+l.spellCriticalFailures)*R.criticalFailure,
        enemyWounds:total(l.enemyWounds)*R.enemyWoundShare,
        enemyKnockouts:total(l.enemyKnockouts)*R.enemyKnockoutShare,
        missionReturn:wounded?R.returnWounded:R.returnUnhurt
      };
      return {sources,total:total(sources)};
    }

    // ReputationPerso = ReputationCalculee + ReputationCareerDelta : le gain s'ajoute au delta persistant
    // et à la réputation totale ; la part calculée n'est pas touchée ici.
    function applyReputation(mercenary,gain){
      const before=Number(mercenary.reputation)||0;
      const delta=Number(gain?.total)||0;
      mercenary.reputationCareerDelta=(Number(mercenary.reputationCareerDelta)||0)+delta;
      mercenary.reputation=before+delta;
      if(mercenary.reputationBreakdown) mercenary.reputationBreakdown.careerDelta=mercenary.reputationCareerDelta;
      return {before,after:mercenary.reputation};
    }

    return {
      constants:C,reputationConstants:R,xpForLevel,levelForXp,startingXp,continuousLevel,xpForContinuous,loadOf,wearsHeavyArmor,
      gains,apply,reputationGains,applyReputation,recordActivation:recordUnitActivation,recordStep
    };
  }

  return {
    createProgressionRules,emptyLog,recordActivation,recordAttack,recordChargeAttempt,recordWound,recordFleeHex,recordHeal,
    recordSpell,recordSpellDamage,
    recordCritical,recordChain,recordDualSequence,recordCourageHeld,recordRecovery,recordIntimidation,RESISTANCES,RESISTANCE_BY_DAMAGE
  };
});
