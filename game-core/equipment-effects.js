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
// - Force, Pièges : + gants (Idan, 2026-10-24) ;
// - Initiative : calculée avec la Vitesse au combat, le Courage avec la ceinture et la Volonté avec l'amulette ;
// - Dextérité : + gants de dextérité, réduite par le combat à deux armes.
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

    // Bottes, ceinture, amulette et cape (Idan, 2026-10-24) : + un pourcentage de la valeur de base, ou des points.
    function gearLines(unit,stat){
      return engine.gearBonuses(unit,stat).filter(x=>x.bonus).map(x=>({label:itemLabel(x.item),delta:x.bonus,reason:"gear",
        ...(x.points!=null?{points:x.points}:{percent:x.percent})}));
    }

    function speedLines(unit){
      const lines=gearLines(unit,"Vitesse");
      const armor=engine.armorItem(unit),mobility=engine.armorMobility(unit);
      if(armor&&mobility.speed) lines.push({label:itemLabel(armor),delta:-mobility.speed,reason:"armor"});
      for(const item of [engine.activeWeaponItem(unit),engine.activeOffhandItem(unit)]){
        if(!item) continue;
        const penalty=engine.heldItemSpeedPenalty(unit,item);
        if(!penalty) continue;
        const weapon=engine.weaponTemplate(item);
        lines.push({label:itemLabel(item),delta:-penalty,reason:"weight",
          twoHands:weapon?.prise==="Au choix"&&engine.usesTwoHands(unit,weapon)});
      }
      return lines;
    }

    // { Vitesse, Esquive, Perception, Endurance, Courage, Réserve de mana, Puissance magique, Volonté, Chance, Résistance
    // physique, Discrétion, Force, Pièges, Initiative, Dextérité } : {base, value, lines} pour chaque valeur concernée.
    function effects(character){
      if(!engine||!character?.stats) return {};
      const unit={character,activeSet:1},bare=bareUnit(character);
      const result={};
      const add=(name,base,value,lines)=>{ result[name]={base,value,lines}; };

      add("Vitesse",Number(character.stats.Vitesse)||0,engine.effectiveSpeed(unit),speedLines(unit));
      const armor=engine.armorItem(unit),dodge=engine.armorMobility(unit).dodge;
      add("Esquive",Number(character.stats.Esquive)||0,engine.effectiveDodge(unit),
        [...gearLines(unit,"Esquive"),...(armor&&dodge?[{label:itemLabel(armor),delta:-dodge,reason:"armor"}]:[])]);
      for(const stat of ["Perception","Endurance","Courage","Réserve de mana","Puissance magique","Volonté","Chance",
        "Résistance physique","Discrétion","Force","Pièges"]){
        add(stat,engine.baseValue(unit,stat),engine.statWithGear(unit,stat),gearLines(unit,stat));
      }
      const speedGap=engine.effectiveSpeed(unit)-engine.effectiveSpeed(bare);
      const courageGap=0.10*(engine.statWithGear(unit,"Courage")-engine.statWithGear(bare,"Courage"));
      const willGap=0.05*(engine.statWithGear(unit,"Volonté")-engine.statWithGear(bare,"Volonté"));
      add("Initiative",engine.initiative(bare),engine.initiative(unit),[
        ...(speedGap?[{label:"Vitesse au combat",delta:speedGap,reason:"speed"}]:[]),
        ...(courageGap?[{label:"Courage avec l’équipement",delta:courageGap,reason:"courage"}]:[]),
        ...(willGap?[{label:"Volonté avec l’équipement",delta:willGap,reason:"will"}]:[])]);
      const dexterity=Number(character.stats["Dextérité"])||0,dual=engine.effectiveDexterity(unit);
      const gloved=engine.statWithGear(unit,"Dextérité");
      add("Dextérité",dexterity,dual,[...gearLines(unit,"Dextérité"),
        ...(engine.isDualWielding(unit)?[{label:"Combat à deux armes",delta:dual-gloved,reason:"dual"}]:[])]);
      return result;
    }

    // Cible sans Résistance physique ni armure : les dégâts restent ceux d'avant la résistance.
    const TARGET={character:{resistances:{},items:[],equipment:null}};
    const capitalize=text=>text.charAt(0).toUpperCase()+text.slice(1);

    // Un coup : jet minimum et maximum de l'arme (qualité, prise à deux mains, Force en mêlée), types et puissances.
    function strike(character,set,hand){
      const unit={character,activeSet:set,attackHand:hand};
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
      return {hand,name:item.name,mode,dice:low.weaponDice,min:low.damage,max:high.damage,factors,
        types:engine.damageMatchups(TARGET,weapon).map(m=>({type:capitalize(m.type),power:m.power}))};
    }

    // [{set, strikes}] pour les sets 1 et 2 : l'arme principale, et la main secondaire au combat à deux armes.
    function attacks(character){
      if(!engine||!character) return [];
      return [1,2].map(set=>{
        const dual=engine.isDualWielding({character,activeSet:set});
        return {set,strikes:[strike(character,set,"main"),dual?strike(character,set,"off"):null].filter(Boolean)};
      });
    }

    return {effects,attacks};
  }

  return {createEquipmentEffects};
});
