"use strict";

// Valeur d'un objet en pièces d'or (Idan, 2026-10-24 : « une valeur en pièce d'or à l'équipement en caché », pour les
// futurs marchands). Cachée : rien ne l'affiche au joueur.
// Valeur = prix de base (prix_base de l'arme, de l'armure ou de l'objet à bonus : objet T1, qualité Correcte)
//        × multiplicateur du tier (formula-constants.json, economy.item_value.tier_<n>_multiplier)
//        × multiplicateur prix de la qualité (item-qualities.json, multiplicateur_prix), arrondie à la pièce.
// Le prix d'achat ou de revente chez un marchand viendra avec les marchands (intendant, etc.).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesItemValue=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  const TIER_FALLBACK={1:1,2:3,3:8,4:25};

  function createItemValues({reference}={}){
    const byName=data=>new Map(rows(data).map(r=>[r.nom,r]));
    const weapons=byName(reference?.weapons);
    const armors=rows(reference?.baseArmors);
    const statGear={boots:byName(reference?.boots),belt:byName(reference?.belts),amulet:byName(reference?.amulets),
      cape:byName(reference?.capes),gloves:byName(reference?.gloves),pants:byName(reference?.pants),ring:byName(reference?.rings)};
    const qualities=new Map(rows(reference?.itemQualities).map(r=>[r.code,r]));
    const constants=new Map(rows(reference?.formulaConstants).map(r=>[r.code,Number(r.valeur)]));

    function template(item){
      if(item?.itemType==="weapon") return weapons.get(item.name)||null;
      if(item?.itemType==="armor"){
        const code=String(item.templateId||"").replace(/^armor:/,"");
        return armors.find(a=>a.code===code)||armors.find(a=>a.nom===item.name)||null;
      }
      return statGear[item?.itemType]?.get(item?.name)||null;
    }

    function tierMultiplier(tier){
      const t=Number(tier)||1,value=constants.get(`economy.item_value.tier_${t}_multiplier`);
      return Number.isFinite(value)?value:(TIER_FALLBACK[t]||1);
    }

    function qualityMultiplier(item){
      const value=Number(qualities.get(item?.qualityCode)?.multiplicateur_prix);
      return Number.isFinite(value)&&value>0?value:1;
    }

    // Prix de base de l'objet, ou null s'il n'a pas de modèle connu (casques à venir, objets de quête…).
    function basePrice(item){
      const price=Number(template(item)?.prix_base);
      return Number.isFinite(price)?price:null;
    }

    // Valeur en pièces d'or, ou null si l'objet n'a pas de prix de base.
    function value(item){
      const base=basePrice(item);
      return base===null?null:Math.round(base*tierMultiplier(item.tier)*qualityMultiplier(item));
    }

    return {value,basePrice,tierMultiplier,qualityMultiplier};
  }

  return {createItemValues};
});
