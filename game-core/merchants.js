"use strict";

// Marchands (doc 18 ; Idan, 2026-10-30), étape 1 : le passage du jour et l'achat.
// - Chaque matin, un marchand passe au camp avec une probabilité de 30 % + 4 % par étoile de renommée de la compagnie
//   (merchants.arrival.*) : on vient voir plus souvent une grande compagnie. Il reste la journée et repart le lendemain
//   matin.
// - Les marchands viennent de data/reference/merchants.json (liste provisoire : un par culture, tiré selon son poids).
//   Chacun est un personnage fixe de la partie : peuple de sa culture, alignement principal de la culture, nom tiré dans
//   les noms de la culture à sa première visite (state.market.merchants).
// - Son affinité avec le capitaine se calcule comme celle d'un mercenaire (peuple, culture, alignement ; affinity.js).
// - Son stock (provisoire, à affiner) : 6 + 1D6 objets, deux tiers d'armes de ses spécialités (le peuple et la culture du
//   marchand, comme le stock de départ de la compagnie), le reste en armures, objets à bonus et potions ; tier selon la
//   renommée de la compagnie ÷ 4 dans la table de l'équipement de départ (mercenary-generator.js, createMerchantStock).
// - Prix demandé = valeur cachée de l'objet (item-value.js) × 1,5 × (1 − 0,2 × Affinité / 100), arrondi à la pièce.
//   On n'achète pas au-delà de l'or de la compagnie ; l'objet acheté rejoint l'Intendance.
// La revente, la baisse de prix par quantité et la négociation viendront aux étapes suivantes.
(function(root,factory){
  const deps=typeof module!=="undefined"&&module.exports
    ?{itemValue:require("./item-value.js"),stars:require("./stars.js")}
    :{itemValue:root.MercenairesItemValue,stars:root.MercenairesStars};
  const api=factory(deps);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesMerchants=api;
})(typeof globalThis!=="undefined"?globalThis:this,function({itemValue,stars}){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);

  // reference : data/reference/ ; generator : createGenerator(...) (createMerchantStock) ; affinity : createAffinityRules
  // (facultatif : affinité nulle sans lui) ; names : createNameRules (facultatif : le marchand porte alors le nom de sa
  // culture).
  function createMerchantRules({reference,generator,affinity=null,names=null,random=Math.random}={}){
    const constants=new Map(rows(reference?.formulaConstants).map(r=>[r.code,Number(r.valeur)]));
    const constant=(code,fallback)=>Number.isFinite(constants.get(code))?constants.get(code):fallback;
    const C={
      base:constant("merchants.arrival.base",0.3),
      perStar:constant("merchants.arrival.per_star",0.04),
      stockBase:constant("merchants.stock.base",6),
      stockDice:constant("merchants.stock.dice_sides",6),
      weaponShare:constant("merchants.stock.weapon_share",2/3),
      renownDivisor:constant("merchants.stock.renown_divisor",4)||4,
      margin:constant("merchants.price.sell_margin",1.5),
      affinityFactor:constant("merchants.price.affinity_factor",0.2)
    };
    const list=rows(reference?.merchants);
    const peopleOf=new Map(rows(reference?.cultures).map(c=>[c.nom,c.peuples]));
    const principal=new Map(rows(reference?.peoples).map(p=>[p.nom,p.alignement_principal]));
    const overrides=reference?.alignmentGeneration?.culture_overrides||{};
    const values=itemValue.createItemValues({reference});
    const starRules=stars.createStarRules({reference});

    function weighted(entries){
      let r=random()*entries.reduce((sum,x)=>sum+(Number(x.poids)||0),0);
      for(const x of entries){ if((r-=Number(x.poids)||0)<0) return x; }
      return entries[entries.length-1]||null;
    }
    function marketOf(state){
      if(!state.market) state.market={merchants:{},visit:null};
      if(!state.market.merchants) state.market.merchants={};
      return state.market;
    }
    function captainOf(state){
      return state.company.roster.find(m=>m.id===state.company.captainId)||null;
    }

    // Chance qu'un marchand passe ce matin : 30 % + 4 % par niveau d'étoiles de la renommée (1 à 15), au plus 100 %.
    function arrivalChance(renown){
      const level=Number(starRules.company(renown)?.level)||0;
      return Math.min(1,C.base+C.perStar*level);
    }

    // Le marchand d'une ligne de merchants.json, créé à sa première visite puis gardé toute la partie.
    function merchantOf(state,row){
      const market=marketOf(state);
      if(market.merchants[row.id]) return market.merchants[row.id];
      const culture=row.culture,people=peopleOf.get(culture)||null;
      const identity=names?.generate({people,culture})||null;
      const merchant={id:row.id,culture,people,alignment:overrides[culture]||principal.get(people)||null,
        name:identity?.name||"Marchand "+culture,sex:identity?.naming?.sex||null};
      market.merchants[row.id]=merchant;
      return merchant;
    }

    // Affinité du marchand avec le capitaine (−100 à +100), comme pour un mercenaire ; 0 si elle n'est pas calculable.
    function affinityWith(state,merchant){
      const captain=captainOf(state);
      const result=captain&&affinity&&merchant?affinity.affinity(captain,merchant,Number(merchant.affinityAcquired)||0):null;
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
      const market=marketOf(state);
      const left=market.visit?market.merchants[market.visit.merchantId]||null:null;
      market.visit=null;
      const chance=arrivalChance(renown);
      if(!list.length||random()>=chance) return {chance,left,arrived:null};
      const merchant=merchantOf(state,weighted(list));
      const count=C.stockBase+(C.stockDice>0?1+Math.floor(random()*C.stockDice):0);
      const seller={id:merchant.id,people:merchant.people,culture:merchant.culture,reputation:Math.max(0,Number(renown)||0)/C.renownDivisor};
      market.visit={merchantId:merchant.id,day:state.day,stock:generator.createMerchantStock(seller,{count,weaponShare:C.weaponShare})};
      return {chance,left,arrived:merchant};
    }

    // Le marchand présent aujourd'hui, avec son stock et ses prix ; null s'il n'y en a pas.
    function visitOf(state){
      const visit=state.market?.visit;
      if(!visit||visit.day!==state.day) return null;
      const merchant=state.market.merchants?.[visit.merchantId];
      if(!merchant) return null;
      const score=affinityWith(state,merchant);
      return {merchant,affinity:score,stock:visit.stock.map(item=>({item,price:sellPrice(item,score)}))};
    }

    // Achat d'un objet du stock : l'or de la compagnie doit suffire ; l'objet rejoint l'Intendance.
    function buy(state,itemId){
      const visit=visitOf(state);
      if(!visit) return {ok:false,reason:"Aucun marchand au camp aujourd'hui."};
      const entry=visit.stock.find(x=>x.item.id===itemId);
      if(!entry) return {ok:false,reason:"Cet objet n'est plus en vente."};
      if(entry.price===null) return {ok:false,reason:"Cet objet n'a pas de prix."};
      if(state.company.gold<entry.price) return {ok:false,reason:"Pas assez d'or.",price:entry.price};
      state.company.gold-=entry.price;
      state.market.visit.stock=state.market.visit.stock.filter(item=>item.id!==itemId);
      if(!Array.isArray(state.company.stock)) state.company.stock=[];
      const item={...entry.item,owner:null};
      state.company.stock.push(item);
      return {ok:true,item,price:entry.price,merchant:visit.merchant};
    }

    return {constants:C,arrivalChance,merchantOf,affinityWith,sellPrice,morning,visitOf,buy};
  }

  return {createMerchantRules};
});
