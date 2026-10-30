"use strict";

// Marchands (doc 18 ; Idan, 2026-10-30), étape 1 : le passage du jour et l'achat.
// - Chaque matin, un marchand passe au camp avec une probabilité de 30 % + 4 % par étoile de renommée de la compagnie
//   (merchants.arrival.*) : on vient voir plus souvent une grande compagnie. Il reste la journée et repart le lendemain
//   matin.
// - Les marchands et ce qu'ils vendent sont dans data/reference/merchants.json. Pour l'instant, un seul marchand test, qui
//   ne vend que des épées longues T1 : Idan répartit les biens entre les marchands. Chaque ligne du stock (type d'objet,
//   nom, tier) est en vente sans limite de quantité.
// - Prix demandé = valeur cachée de l'objet (item-value.js) × 1,5 × (1 − 0,2 × Affinité / 100), arrondi à la pièce.
//   L'affinité marchand ↔ capitaine se calcule comme celle d'un mercenaire (affinity.js) quand le marchand a un peuple et
//   un alignement ; sinon elle est nulle. Elle n'est pas affichée.
// - On n'achète pas au-delà de l'or de la compagnie ; l'objet acheté rejoint l'Intendance.
// La revente, la baisse de prix par quantité, la négociation et l'aide de l'intendant viendront aux étapes suivantes.
(function(root,factory){
  const deps=typeof module!=="undefined"&&module.exports
    ?{itemValue:require("./item-value.js"),stars:require("./stars.js")}
    :{itemValue:root.MercenairesItemValue,stars:root.MercenairesStars};
  const api=factory(deps);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesMerchants=api;
})(typeof globalThis!=="undefined"?globalThis:this,function({itemValue,stars}){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);

  // reference : data/reference/ ; generator : createGenerator(...) (createItemByName) ; affinity : createAffinityRules
  // (facultatif : affinité nulle sans lui).
  function createMerchantRules({reference,generator,affinity=null,random=Math.random}={}){
    const constants=new Map(rows(reference?.formulaConstants).map(r=>[r.code,Number(r.valeur)]));
    const constant=(code,fallback)=>Number.isFinite(constants.get(code))?constants.get(code):fallback;
    const C={
      base:constant("merchants.arrival.base",0.3),
      perStar:constant("merchants.arrival.per_star",0.04),
      margin:constant("merchants.price.sell_margin",1.5),
      affinityFactor:constant("merchants.price.affinity_factor",0.2)
    };
    const list=rows(reference?.merchants);
    const values=itemValue.createItemValues({reference});
    const starRules=stars.createStarRules({reference});

    function weighted(entries){
      let r=random()*entries.reduce((sum,x)=>sum+(Number(x.poids)||0),0);
      for(const x of entries){ if((r-=Number(x.poids)||0)<0) return x; }
      return entries[entries.length-1]||null;
    }
    const merchantById=id=>list.find(m=>m.id===id)||null;
    // Ce que le reste du jeu voit d'un marchand.
    const view=m=>m?{id:m.id,name:m.nom||m.id,sex:m.sexe||null,people:m.peuple||null,culture:m.culture||null,alignment:m.alignement||null}:null;

    // Chance qu'un marchand passe ce matin : 30 % + 4 % par niveau d'étoiles de la renommée (1 à 15), au plus 100 %.
    function arrivalChance(renown){
      const level=Number(starRules.company(renown)?.level)||0;
      return Math.min(1,C.base+C.perStar*level);
    }

    // Affinité du marchand avec le capitaine (−100 à +100), comme pour un mercenaire ; 0 si elle n'est pas calculable.
    function affinityWith(state,merchant){
      const captain=state.company.roster.find(m=>m.id===state.company.captainId);
      const result=captain&&affinity&&merchant?.people&&merchant?.alignment?affinity.affinity(captain,merchant):null;
      return result?.ok?result.total:0;
    }

    // Prix demandé par le marchand pour un objet, ou null si l'objet n'a pas de valeur.
    function sellPrice(item,affinityScore=0){
      const value=values.value(item);
      if(value===null) return null;
      return Math.max(1,Math.round(value*C.margin*(1-C.affinityFactor*(Number(affinityScore)||0)/100)));
    }

    // Le matin (campaign.js, advanceOneDay) : le marchand de la veille repart ; un autre passe peut-être.
    // renown : renommée totale de la compagnie. Renvoie {chance, left, arrived}.
    function morning(state,{renown=0}={}){
      if(!state.market) state.market={visit:null};
      const left=view(merchantById(state.market.visit?.merchantId));
      state.market.visit=null;
      const chance=arrivalChance(renown);
      if(!list.length||random()>=chance) return {chance,left,arrived:null};
      const merchant=weighted(list);
      state.market.visit={merchantId:merchant.id,day:state.day};
      return {chance,left,arrived:view(merchant)};
    }

    // Une ligne du stock : un objet neuf de ce type, de ce nom et de ce tier.
    function itemOf(line){
      return generator.createItemByName(line?.type,line?.objet,Number(line?.tier)||1);
    }

    // Le marchand présent aujourd'hui et ce qu'il vend (un objet d'exemple par ligne, avec son prix) ; null s'il n'y en a pas.
    function visitOf(state){
      const visit=state.market?.visit;
      if(!visit||visit.day!==state.day) return null;
      const row=merchantById(visit.merchantId);
      if(!row) return null;
      const merchant=view(row),score=affinityWith(state,merchant);
      const offers=(row.stock||[]).map((line,index)=>{ const item=itemOf(line); return item?{index,item,price:sellPrice(item,score)}:null; }).filter(Boolean);
      return {merchant,affinity:score,offers};
    }

    // Achat d'un objet de la ligne index du stock : l'or de la compagnie doit suffire ; l'objet rejoint l'Intendance.
    function buy(state,index){
      const visit=visitOf(state);
      if(!visit) return {ok:false,reason:"Aucun marchand au camp aujourd'hui."};
      const offer=visit.offers.find(o=>o.index===Number(index));
      if(!offer) return {ok:false,reason:"Cet objet n'est pas en vente."};
      if(offer.price===null) return {ok:false,reason:"Cet objet n'a pas de prix."};
      if(state.company.gold<offer.price) return {ok:false,reason:"Pas assez d'or.",price:offer.price};
      state.company.gold-=offer.price;
      if(!Array.isArray(state.company.stock)) state.company.stock=[];
      state.company.stock.push(offer.item);
      return {ok:true,item:offer.item,price:offer.price,merchant:visit.merchant};
    }

    return {constants:C,arrivalChance,affinityWith,sellPrice,morning,visitOf,buy};
  }

  return {createMerchantRules};
});
