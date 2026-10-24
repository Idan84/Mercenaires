"use strict";

// Effets de l'équipement sur les caractéristiques de la fiche (Idan, 2026-10-24). Ce sont ceux que le combat
// applique déjà (combat-engine.js), avec le set d'armes 1 en main ; la caractéristique sauvegardée ne change pas :
// - Vitesse : − handicap de vitesse de l'armure − poids des objets tenus (qualité, maîtrise, prise à deux mains) ;
// - Esquive : − handicap d'esquive de l'armure ;
// - Initiative : calculée avec la Vitesse au combat ;
// - Dextérité : réduite par le combat à deux armes.
// Chaque effet donne la valeur de base, la valeur équipée et les lignes du détail (objet ou raison, écart).
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

    function speedLines(unit){
      const lines=[];
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

    // { Vitesse, Esquive, Initiative, Dextérité } : {base, value, lines} pour chaque caractéristique concernée.
    function effects(character){
      if(!engine||!character?.stats) return {};
      const unit={character,activeSet:1},bare=bareUnit(character);
      const result={};
      const add=(name,base,value,lines)=>{ result[name]={base,value,lines}; };

      add("Vitesse",Number(character.stats.Vitesse)||0,engine.effectiveSpeed(unit),speedLines(unit));
      const armor=engine.armorItem(unit),dodge=engine.armorMobility(unit).dodge;
      add("Esquive",Number(character.stats.Esquive)||0,engine.effectiveDodge(unit),
        armor&&dodge?[{label:itemLabel(armor),delta:-dodge,reason:"armor"}]:[]);
      const speedGap=engine.effectiveSpeed(unit)-engine.effectiveSpeed(bare);
      add("Initiative",engine.initiative(bare),engine.initiative(unit),
        speedGap?[{label:"Vitesse au combat",delta:speedGap,reason:"speed"}]:[]);
      const dexterity=Number(character.stats["Dextérité"])||0,dual=engine.effectiveDexterity(unit);
      add("Dextérité",dexterity,dual,
        engine.isDualWielding(unit)?[{label:"Combat à deux armes",delta:dual-dexterity,reason:"dual"}]:[]);
      return result;
    }

    return {effects};
  }

  return {createEquipmentEffects};
});
