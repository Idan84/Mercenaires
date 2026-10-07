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
  function emptyLog(){
    return {activations:0,chargeAttempts:0,knockouts:0,fleeHexes:0,backstabWounds:0,wounds:{},hpHealed:0,criticalSuccesses:0,criticalFailures:0};
  }
  function logOf(unit){ return unit.progress||(unit.progress=emptyLog()); }

  // Après chaque attaque résolue par le moteur de combat (crochet onAttack de createCombatEngine).
  function recordAttack(attacker,defender,options,result){
    if(!result?.ok) return;
    // Courage : la charge compte dès qu'elle est tentée, même ratée ou finie en chute (Idan, 2026-10-06).
    if(Number(options?.chargeDistance)>0) logOf(attacker).chargeAttempts++;
    if(result.wound){
      const log=logOf(defender);
      const resistance=RESISTANCE_BY_DAMAGE[result.matchup?.type]||"Résistance physique";
      log.wounds[resistance]=(log.wounds[resistance]||0)+1;
      if(result.backstab) log.backstabWounds++;
    }
    // Charisme : adversaire mis hors combat par ce coup (Idan, 2026-10-06).
    if(result.targetDown) logOf(attacker).knockouts++;
  }
  // Chaque activation du combattant pendant la mission (Force : porter son équipement).
  function recordActivation(unit){ logOf(unit).activations++; }
  // Chaque case parcourue en état de fuite.
  function recordFleeHex(unit){ logOf(unit).fleeHexes++; }
  // Pour les mécaniques à venir : soins (PV réellement restaurés) et critiques.
  function recordHeal(unit,hp){ logOf(unit).hpHealed+=Math.max(0,Number(hp)||0); }
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
      forceLoadXp:k("progression.force.load_ratio_xp",20)
    };
    const minimum=new Map((reference?.characteristics?.rows||[]).map(r=>[r.nom,Number(r.minimum)]));
    const weaponPenalty=new Map((reference?.weapons?.rows||[]).map(w=>[w.nom,Number(w.malus_vitesse_arme_base)||0]));
    const armorRows=reference?.baseArmors?.rows||[];
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

    // Journal → XP par caractéristique et par résistance (valeurs non nulles seulement). Le mercenaire
    // sert à la Force : XP par activation = coefficient × max(0, Charge / Force − seuil).
    function gains(log,mercenary=null){
      const l={...emptyLog(),...(log||{})};
      const stats={},resistances={};
      const add=(target,name,xp)=>{ if(xp) target[name]=(target[name]||0)+xp; };
      add(stats,"Chance",l.criticalFailures*C.chanceCriticalFailure+l.criticalSuccesses*C.chanceCriticalSuccess);
      add(stats,"Constitution",l.hpHealed*C.constitutionHpHealed);
      add(stats,"Courage",l.chargeAttempts*C.courageChargeAttempt);
      add(stats,"Vitesse",l.fleeHexes*C.speedFleeHex);
      add(stats,"Charisme",l.knockouts*C.charismaKnockout);
      add(stats,"Perception",l.backstabWounds*C.perceptionBackstabWound);
      const force=Number(mercenary?.stats?.Force)||0;
      if(l.activations&&force>0){
        add(stats,"Force",Math.round(l.activations*C.forceLoadXp*Math.max(0,loadOf(mercenary)/force-C.forceLoadThreshold)));
      }
      // Chaque blessure : +XP à la résistance du type, −XP à chacune des quatre autres.
      for(const [hit,count] of Object.entries(l.wounds||{})){
        for(const resistance of RESISTANCES) add(resistances,resistance,count*(resistance===hit?C.resistanceWound:C.resistanceOthers));
      }
      for(const target of [stats,resistances]) for(const name of Object.keys(target)) if(!target[name]) delete target[name];
      return {stats,resistances};
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
      return changes;
    }

    return {constants:C,xpForLevel,levelForXp,startingXp,loadOf,gains,apply};
  }

  return {createProgressionRules,emptyLog,recordActivation,recordAttack,recordFleeHex,recordHeal,recordCritical,RESISTANCES,RESISTANCE_BY_DAMAGE};
});
