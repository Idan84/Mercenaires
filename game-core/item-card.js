"use strict";

// Carte d'objet (Idan, 2026-10-24 : « faire une carte jeu et pas dev ») : titre selon le tier
// (data/reference/item-titles.json) et effets de l'arme ou de l'armure, tels que le combat les applique
// (combat-engine.js) :
// - qualité (item-qualities.json) : dégâts, bonus de charge et de blocage × multiplicateur qualité ; lourdeur
//   d'arme, gêne d'armure et altération magique × multiplicateur malus ; résistance d'armure × multiplicateur
//   qualité si elle est positive, ÷ sinon ;
// - puissances tranchante, perforante et contondante : la qualité ne les change pas ;
// - bottes (boots.json), ceintures (belts.json) et amulettes (amulets.json) : + bonus_t<tier> % de la caractéristique
//   de base qu'elles servent ;
//   la qualité ne le change pas.
// Renvoie des valeurs, pas du texte : l'interface les met en forme.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesItemCard=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const POWERS=[["Tranchant","puissance_tranchante_base"],["Perforant","puissance_perforante_base"],["Contondant","puissance_contondante_base"]];
  const RESISTANCES=[["Tranchant","resistance_tranchant"],["Perforant","resistance_perforant"],["Contondant","resistance_contondant"],
    ["Brûlant","resistance_brulant"],["Glaçant","resistance_glacant"],["Foudroyant","resistance_foudroyant"],["Corrosif","resistance_corrosif"]];
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  const number=value=>Number(value)||0;

  function createItemCards({reference}={}){
    const weapons=new Map(rows(reference?.weapons).map(r=>[r.nom,r]));
    const skills=new Map(rows(reference?.skills).map(r=>[r.nom,r]));
    const armors=rows(reference?.baseArmors);
    // Équipement à bonus de caractéristique, par type d'objet : catégorie affichée et modèles.
    const statGear={boots:{category:"Bottes",byName:new Map(rows(reference?.boots).map(r=>[r.nom,r]))},
      belt:{category:"Ceinture",byName:new Map(rows(reference?.belts).map(r=>[r.nom,r]))},
      amulet:{category:"Amulette",byName:new Map(rows(reference?.amulets).map(r=>[r.nom,r]))}};
    const qualities=new Map(rows(reference?.itemQualities).map(r=>[r.code,r]));
    const titles=new Map(rows(reference?.itemTitles).map(r=>[r.nom,r]));

    function quality(item){
      const q=qualities.get(item?.qualityCode)||{};
      return {
        code:item?.qualityCode||null,
        name:q.nom||item?.qualityName||null,
        good:Number(q.multiplicateur_qualite)||1,
        bad:Number(q.multiplicateur_malus)||1
      };
    }

    function title(item){
      return titles.get(item?.name)?.["t"+item?.tier]||item?.name||"";
    }

    function armorTemplate(item){
      const code=String(item?.templateId||"").replace(/^armor:/,"");
      return armors.find(a=>a.code===code)||armors.find(a=>a.nom===item?.name)||null;
    }

    function weaponCard(item,weapon,q){
      const skill=skills.get(weapon.nom)||{};
      const min=Number(weapon.portee_min_hex),max=Number(weapon.portee_max_hex);
      const charge=Number(weapon.bonus_charge_base);
      const block=Number(skill.bonus_blocage_base);
      return {
        kind:"weapon",
        category:skill.parent||item.category||null,
        grip:weapon.prise||null,
        damage:{dice:weapon.degats_pv_base||null,factor:q.good},
        powers:POWERS.map(([type,key])=>({type,value:number(weapon[key])})).filter(p=>p.value>0),
        range:{min:Number.isFinite(min)&&min>0?min:1,max:Number.isFinite(max)&&max>0?max:1},
        weight:number(weapon.malus_vitesse_arme_base)*q.bad,
        charge:charge>0?charge*q.good:null,
        block:block>0?block*q.good:null,
        counterCharge:Boolean(weapon.contre_charge),
        reload:Boolean(skill.recharge_action_rapide),
        chainShots:skill.cadence_tir==="Répétable",
        area:Boolean(skill.attaque_de_zone),
        examples:skill.exemples||null
      };
    }

    function armorCard(item,armor,q){
      return {
        kind:"armor",
        category:armor.type_armure||item.category||null,
        resistances:RESISTANCES.map(([type,key])=>{
          const base=number(armor[key]);
          return {type,value:base>=0?base*q.good:base/q.good};
        }),
        dodge:number(armor.malus_esquive_base)*q.bad,
        speed:number(armor.malus_vitesse_base)*q.bad,
        magic:number(armor.alteration_magique_base)*q.bad,
        description:armor.description||null
      };
    }

    function statGearCard(item,template){
      return {kind:item.itemType,category:statGear[item.itemType].category,stat:template.caracteristique,
        bonus:number(template["bonus_t"+(Number(item.tier)||1)])};
    }

    // Carte d'un objet, ou null si ce n'est ni une arme, ni une armure, ni des bottes, une ceinture ou une amulette
    // connues.
    function card(item){
      if(!item) return null;
      const q=quality(item);
      const head={title:title(item),name:item.name,tier:Number(item.tier)||1,quality:q};
      if(item.itemType==="weapon"&&weapons.has(item.name)) return {...head,...weaponCard(item,weapons.get(item.name),q)};
      const gear=statGear[item.itemType]?.byName.get(item.name);
      if(gear) return {...head,...statGearCard(item,gear)};
      const armor=item.itemType==="armor"?armorTemplate(item):null;
      return armor?{...head,...armorCard(item,armor,q)}:null;
    }

    return {card,title};
  }

  return {createItemCards};
});
