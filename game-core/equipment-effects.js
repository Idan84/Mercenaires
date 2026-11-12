"use strict";

// Effets de l'équipement sur les caractéristiques de la fiche (Idan, 2026-10-24). Ce sont ceux que le combat
// applique déjà (combat-engine.js), avec le set d'armes 1 en main ; la caractéristique sauvegardée ne change pas :
// - Vitesse : + bottes de vitesse − handicap de vitesse de l'armure − poids des objets tenus (qualité, maîtrise,
//   prise à deux mains) ;
// - Esquive : + bottes et cape d'esquive − handicap d'esquive de l'armure ;
// - Perception : + bottes de perception ;
// - Endurance, Courage, Réserve de mana : + ceinture (Idan, 2026-10-24) ;
// - Puissance magique, Volonté, Chance : + amulette (Idan, 2026-10-24) ;
// - Esquive, Résistance physique, Discrétion : + cape (Idan, 2026-10-24 ; des points pour la Résistance physique) ;
//   Discrétion : − handicap de l'armure (Idan, 2026-11-12) ;
// - Force, Pièges : + gants (Idan, 2026-10-24) ;
// - Charisme, Intimidation : + culotte (Idan, 2026-10-24) ;
// - Chance, Courage : + bagues ; écoles de magie : + bague de l'école, − bagues des écoles opposées (Idan, 2026-10-24) ;
// - Constitution, Intelligence, Compagnon animal : + casque ou chapeau ; Puissance magique et Vitesse : − Casque de
//   constitution (Idan, 2026-10-25) ;
// - Initiative : calculée avec la Vitesse au combat, le Courage avec la ceinture, la Volonté avec l'amulette et
//   l'Intelligence avec le chapeau ;
// - Points de vie : PV max calculés avec la Constitution, l'Endurance et la Volonté équipées (Idan, 2026-10-25) ;
// - Dextérité : + gants de dextérité, réduite par le combat à deux armes ;
// - Résistances au feu, au froid et à la foudre : + ou − la valeur de l'armure pour l'élément (Idan, 2026-10-25).
// Chaque effet donne la valeur de base, la valeur équipée et les lignes du détail (objet ou raison, écart).
// Dégâts de chaque set d'armes (Idan, 2026-10-24) : ceux du combat avant la résistance de la cible.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesEquipmentEffects=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function createEquipmentEffects({engine}={}){
    function bareUnit(character){
      return {character:{...character,equipment:null,items:[]},activeSet:1};
    }

    function itemLabel(item){
      return item.qualityName?`${item.name} (${item.qualityName})`:item.name;
    }

    // Bottes, ceinture, amulette, cape, gants, culotte et bagues (Idan, 2026-10-24) : + un pourcentage de la valeur de base, ou des points.
    function gearLines(unit,stat){
      return engine.gearBonuses(unit,stat).filter(x=>x.bonus).map(x=>({label:itemLabel(x.item),delta:x.bonus,reason:"gear",
        ...(x.points!=null?{points:x.points}:{percent:x.percent})}));
    }

    function speedLines(unit){
      const lines=gearLines(unit,"Vitesse");
      const armor=engine.armorItem(unit),mobility=engine.armorMobility(unit);
      if(armor&&mobility.speed) lines.push({label:itemLabel(armor),delta:-mobility.speed,reason:"armor"});
      const helmet=engine.itemBySlot?.(unit,"head"),helmetWeight=engine.headgearSpeedPenalty?.(unit)||0;
      if(helmet&&helmetWeight) lines.push({label:itemLabel(helmet),delta:-helmetWeight,reason:"helmet"});
      for(const item of [engine.activeWeaponItem(unit),engine.activeOffhandItem(unit)]){
        if(!item) continue;
        const penalty=engine.heldItemSpeedPenalty(unit,item);
        if(!penalty) continue;
        // Plus de malus divisé par deux pour une arme « Au choix » à deux mains (Idan, 2026-11-02).
        lines.push({label:itemLabel(item),delta:-penalty,reason:"weight"});
      }
      return lines;
    }

    // { Vitesse, Esquive, Perception, Endurance, Courage, Réserve de mana, Puissance magique, Volonté, Chance, Résistance
    // physique, Discrétion, Force, Pièges, Charisme, Intimidation, écoles de magie, Initiative, Points de vie, Dextérité } :
    // {base, value,
    // lines} pour chaque valeur concernée.
    function effects(character){
      if(!engine||!character?.stats) return {};
      const unit={character,activeSet:1},bare=bareUnit(character);
      const result={};
      const add=(name,base,value,lines)=>{ result[name]={base,value,lines}; };

      add("Vitesse",Number(character.stats.Vitesse)||0,engine.effectiveSpeed(unit),speedLines(unit));
      const armor=engine.armorItem(unit),dodge=engine.armorMobility(unit).dodge;
      // Combat à une main (Idan, 2026-11-02) : arme à une main tenue seule dans le premier set.
      const oneHand=engine.oneHandDodge?engine.oneHandDodge(unit):0;
      add("Esquive",Number(character.stats.Esquive)||0,engine.effectiveDodge(unit),
        [...gearLines(unit,"Esquive"),...(armor&&dodge?[{label:itemLabel(armor),delta:-dodge,reason:"armor"}]:[]),
          ...(oneHand?[{label:"Combat à une main",delta:oneHand,reason:"style"}]:[])]);
      for(const stat of ["Perception","Endurance","Courage","Réserve de mana","Puissance magique","Volonté","Chance",
        "Résistance physique","Discrétion","Force","Pièges","Charisme","Intimidation","Constitution","Intelligence","Compagnon animal",
        ...(engine.MAGIC_SCHOOLS||[])]){
        add(stat,engine.baseValue(unit,stat),engine.statWithGear(unit,stat),gearLines(unit,stat));
      }
      // Discrétion : moins le malus de l'armure (Idan, 2026-11-12).
      const stealth=engine.armorMobility(unit).stealth||0;
      if(stealth&&engine.effectiveStealth) add("Discrétion",engine.baseValue(unit,"Discrétion"),engine.effectiveStealth(unit),
        [...gearLines(unit,"Discrétion"),{label:itemLabel(armor),delta:-stealth,reason:"armor"}]);
      const speedGap=engine.effectiveSpeed(unit)-engine.effectiveSpeed(bare);
      const courageGap=0.10*(engine.statWithGear(unit,"Courage")-engine.statWithGear(bare,"Courage"));
      const willGap=0.05*(engine.statWithGear(unit,"Volonté")-engine.statWithGear(bare,"Volonté"));
      const mindGap=0.25*(engine.statWithGear(unit,"Intelligence")-engine.statWithGear(bare,"Intelligence"));
      add("Initiative",engine.initiative(bare),engine.initiative(unit),[
        ...(speedGap?[{label:"Vitesse au combat",delta:speedGap,reason:"speed"}]:[]),
        ...(courageGap?[{label:"Courage avec l’équipement",delta:courageGap,reason:"courage"}]:[]),
        ...(willGap?[{label:"Volonté avec l’équipement",delta:willGap,reason:"will"}]:[]),
        ...(mindGap?[{label:"Intelligence avec l’équipement",delta:mindGap,reason:"intelligence"}]:[])]);
      const hpGap=stat=>engine.statWithGear(unit,stat)-engine.statWithGear(bare,stat);
      add("Points de vie",engine.maxHp(bare),engine.maxHp(unit),[["Constitution",3],["Endurance",0.6],["Volonté",0.3]]
        .filter(([stat])=>hpGap(stat)).map(([stat,factor])=>({label:stat+" avec l’équipement",delta:factor*hpGap(stat),reason:"hp"})));
      // Résistances élémentaires (Idan, 2026-10-25) : + ou − la valeur de l'armure portée pour l'élément (plates −20 au feu,
      // écailles +35…), comme les dégâts de feu les comptent ; la protection appliquée reste bornée de −50 à +75.
      for(const [stat,element] of [["Résistance au feu","feu"],["Résistance au froid","froid"],["Résistance à la foudre","foudre"]]){
        const protection=engine.elementalProtection?.(unit,element);
        if(!protection) continue;
        const armor=engine.armorItem(unit);
        add(stat,engine.baseValue(unit,stat),protection.resistance+protection.armor,[...gearLines(unit,stat),
          ...(armor&&protection.armor?[{label:itemLabel(armor),delta:protection.armor,reason:"armorElement"}]:[])]);
      }
      const dexterity=Number(character.stats["Dextérité"])||0,dual=engine.effectiveDexterity(unit);
      const gloved=engine.statWithGear(unit,"Dextérité");
      const weaponDex=engine.attackStatBonus?.(unit,"Dextérité")||0,held=engine.activeWeaponItem(unit);
      add("Dextérité",dexterity,dual,[...gearLines(unit,"Dextérité"),
        ...(weaponDex?[{label:itemLabel(held),delta:weaponDex,reason:"weaponAttack"}]:[]),
        ...(engine.isDualWielding(unit)?[{label:"Combat à deux armes",delta:dual-gloved-weaponDex,reason:"dual"}]:[])]);
      return result;
    }

    // Cible sans Résistance physique ni armure : les dégâts restent ceux d'avant la résistance.
    const TARGET={character:{resistances:{},items:[],equipment:null}};
    const capitalize=text=>text.charAt(0).toUpperCase()+text.slice(1);

    // Un coup : jet minimum et maximum de l'arme (qualité, prise à deux mains, Force en mêlée), Précision et Puissance
    // de l'attaquant, types et pénétrations d'armure.
    // twoHands : l'arme « Au choix » tenue seule, empoignée à deux mains (« Attaquer à deux mains », Idan, 2026-11-02).
    function strike(character,set,hand,{twoHands:grip=false}={}){
      const unit={character,activeSet:set,attackHand:hand,twoHandGrip:grip};
      const item=engine.activeWeaponItem(unit),weapon=engine.weaponTemplate(item);
      if(!weapon) return null;
      const mode=engine.isRangedWeapon(weapon)?"ranged":"melee";
      const damage=roll=>engine.physicalDamage(unit,TARGET,mode,0,{roll,resistanceRoll:2});
      const low=damage("min"),high=damage("max");
      const twoHands=mode==="melee"&&weapon.prise==="Au choix"&&engine.usesTwoHands(unit,weapon);
      const factors=[
        low.qualityMultiplier!==1?{label:item.qualityName||"Qualité",factor:low.qualityMultiplier}:null,
        twoHands?{label:"À deux mains",factor:1.5}:null,
        mode==="melee"?{label:"Force",factor:2*engine.statWithGear(unit,"Force")/100}:null
      ].filter(Boolean);
      return {hand,name:item.name,mode,twoHands,dice:low.weaponDice,min:low.damage,max:high.damage,factors,
        precision:engine.attackPrecision(unit),power:engine.attackPower(unit,mode),
        types:engine.damageMatchups(TARGET,weapon).map(m=>({type:capitalize(m.type),power:m.power}))};
    }

    // [{set, strikes}] pour les sets 1 et 2 : l'arme principale, la main secondaire au combat à deux armes, et l'arme
    // « Au choix » tenue seule une seconde fois, empoignée à deux mains.
    function attacks(character){
      if(!engine||!character) return [];
      return [1,2].map(set=>{
        const unit={character,activeSet:set},dual=engine.isDualWielding(unit);
        const gripped=!dual&&engine.canGripTwoHands?.(unit)?strike(character,set,"main",{twoHands:true}):null;
        return {set,strikes:[strike(character,set,"main"),dual?strike(character,set,"off"):null,gripped].filter(Boolean)};
      });
    }

    return {effects,attacks};
  }

  return {createEquipmentEffects};
});
