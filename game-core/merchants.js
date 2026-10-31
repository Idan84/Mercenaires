"use strict";

// Marchands (doc 18 ; Idan, 2026-10-30 et 2026-10-31).
// - Passage : chaque matin, un marchand passe au camp avec une probabilité de 30 % + 4 % par étoile de renommée
//   (merchants.arrival.*). Il reste la journée et repart le lendemain matin.
// - Chaque marchand a un nom, un portrait, une culture (son peuple et l'alignement par défaut de sa culture) et la liste
//   des objets qu'il vend (data/reference/merchants.json, vend). Il n'a jamais autre chose.
// - Son étal : 10 articles par passage (merchants.stock.size), chacun tiré au hasard dans sa liste ; le tier selon le
//   niveau d'étoiles de la renommée (1 à 15) : poids du tier = base + par niveau × niveau (merchants.stock.tier_<n>_*),
//   pour l'instant T2 70 − 4 × niveau, T3 25 + 2 × niveau, T4 5 + 2 × niveau. Chaque article se vend une fois.
// - Affinité avec le capitaine : celle d'un mercenaire (affinity.js : peuple, culture, alignement) + l'affinité acquise
//   (+2 par article acheté, −3 à chaque passage sans achat ni vente), bornée de −100 à +100. Elle n'est pas affichée.
// - L'intendant : si l'affinité du marchand avec lui est d'au moins +20, il fait baisser les prix d'achat et monter les
//   prix de vente de 1 % par tranche de 10 points d'Intendance (merchants.steward.*).
// - Vous achetez : valeur cachée (item-value.js) × 1,5 × (1 − 0,2 × Affinité / 100) × (1 − bonus de l'intendant).
// - Vous vendez (depuis l'Intendance) : valeur × 0,8 × (1 + 0,2 × Affinité / 100) × (1 + bonus de l'intendant)
//   × 0,4 hors de sa liste × 0,85 par exemplaire du même objet au même tier déjà vendu pendant le passage
//   × (1 + rareté) sur sa liste : +20 % pour un T3, +40 % pour un T4 à 1 étoile de bronze, jusqu'à 0 à 5 étoiles d'or.
//   Jamais plus de 90 % du prix qu'il en demanderait. Ce qu'il rachète disparaît.
// - « Rien que pour toi, capitaine » (Idan, 2026-10-31) : à +100 d'affinité, pendant son passage, il propose une fois un
//   objet hors de sa liste (une famille d'équipement au hasard, puis un objet ; T3 ou T4, mêmes chances que l'étal) à
//   50 % de son prix normal (merchants.special.*). Sa réplique : merchants.json, repliques.rien_que_pour_toi.
// - Manuels de sorts (Idan, 2026-10-31 ; spell-manuals.js) : une ligne {type:"manual", ecole} de sa liste vend les
//   manuels de toute l'école ; chaque article de cette ligne est un manuel tiré dans l'école (sans tier).
// Constantes : merchants.* (formula-constants.json).
(function(root,factory){
  const deps=typeof module!=="undefined"&&module.exports
    ?{itemValue:require("./item-value.js"),stars:require("./stars.js")}
    :{itemValue:root.MercenairesItemValue,stars:root.MercenairesStars};
  const api=factory(deps);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesMerchants=api;
})(typeof globalThis!=="undefined"?globalThis:this,function({itemValue,stars}){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  // reference : data/reference/ ; generator : createGenerator(...) (createItemByName) ; affinity : createAffinityRules
  // (facultatif : affinité initiale nulle sans lui).
  function createMerchantRules({reference,generator,affinity=null,random=Math.random}={}){
    const constants=new Map(rows(reference?.formulaConstants).map(r=>[r.code,Number(r.valeur)]));
    const constant=(code,fallback)=>Number.isFinite(constants.get(code))?constants.get(code):fallback;
    const C={
      base:constant("merchants.arrival.base",0.3),
      perStar:constant("merchants.arrival.per_star",0.04),
      stockSize:constant("merchants.stock.size",10),
      margin:constant("merchants.price.sell_margin",1.5),
      affinityFactor:constant("merchants.price.affinity_factor",0.2),
      buyback:constant("merchants.buyback.base",0.8),
      buybackAffinity:constant("merchants.buyback.affinity_factor",0.2),
      offSpecialty:constant("merchants.buyback.off_specialty",0.4),
      quantityDecay:constant("merchants.buyback.quantity_decay",0.85),
      cap:constant("merchants.buyback.cap",0.9),
      perPurchase:constant("merchants.affinity.per_purchase",2),
      idleVisit:constant("merchants.affinity.idle_visit",-3),
      stewardMinAffinity:constant("merchants.steward.min_affinity",20),
      stewardStep:constant("merchants.steward.skill_step",10),
      stewardPerStep:constant("merchants.steward.per_step",0.01),
      specialAffinity:constant("merchants.special.min_affinity",100),
      specialPrice:constant("merchants.special.price_factor",0.5),
      specialMinTier:constant("merchants.special.min_tier",3)
    };
    // Les familles d'équipement où il pioche l'objet « rien que pour toi » (pas les fioles) : type d'objet et référentiel.
    const FAMILIES=[["weapon","weapons"],["armor","baseArmors"],["helmet","helmets"],["boots","boots"],["belt","belts"],
      ["amulet","amulets"],["cape","capes"],["gloves","gloves"],["pants","pants"],["ring","rings"]];
    // Poids des tiers de l'étal : merchants.stock.tier_<n>_base et _per_level ; un tier sans constante n'est jamais tiré.
    const TIERS=[];
    for(let tier=1;tier<=10;tier++){
      const base=constants.get(`merchants.stock.tier_${tier}_base`);
      if(Number.isFinite(base)) TIERS.push({tier,base,perLevel:constant(`merchants.stock.tier_${tier}_per_level`,0)});
    }
    if(!TIERS.length) TIERS.push({tier:1,base:1,perLevel:0});
    const rarity=tier=>constant(`merchants.buyback.rarity_tier_${Number(tier)||1}`,0);
    const list=rows(reference?.merchants);
    const spells=rows(reference?.spells);
    const values=itemValue.createItemValues({reference});
    const starRules=stars.createStarRules({reference});
    const maxLevel=Math.max(2,starRules.rows.length);

    function weighted(entries,weightOf){
      const total=entries.reduce((sum,x)=>sum+Math.max(0,weightOf(x)),0);
      let r=random()*total;
      for(const x of entries){ if((r-=Math.max(0,weightOf(x)))<0) return x; }
      return entries[entries.length-1]||null;
    }
    const merchantById=id=>list.find(m=>m.id===id)||null;
    // Ce que le reste du jeu voit d'un marchand.
    const view=m=>m?{id:m.id,name:m.nom||m.id,sex:m.sexe||null,people:m.peuple||null,culture:m.culture||null,alignment:m.alignement||null,
      portrait:m.portrait||null,sells:(m.vend||[]).map(v=>({type:v.type,name:v.objet||null,school:v.ecole||null})),lines:m.repliques||{}}:null;
    const levelOf=renown=>clamp(Number(starRules.company(renown)?.level)||1,1,maxLevel);

    // Chance qu'un marchand passe ce matin : 30 % + 4 % par niveau d'étoiles de la renommée (1 à 15), au plus 100 %.
    function arrivalChance(renown){
      const level=Number(starRules.company(renown)?.level)||0;
      return Math.min(1,C.base+C.perStar*level);
    }

    // Chances de chaque tier sur l'étal, selon la renommée : [{tier, chance}], la somme fait 1.
    function tierChances(renown){
      const level=levelOf(renown);
      const weights=TIERS.map(t=>({tier:t.tier,weight:Math.max(0,t.base+t.perLevel*level)}));
      const total=weights.reduce((sum,t)=>sum+t.weight,0)||1;
      return weights.map(t=>({tier:t.tier,chance:t.weight/total}));
    }

    // L'étal d'un passage : stockSize articles tirés dans la liste du marchand, chacun avec son tier.
    function rollStock(row,renown){
      const sells=row?.vend||[];
      if(!sells.length) return [];
      const chances=tierChances(renown),stock=[];
      for(let i=0;stock.length<C.stockSize&&i<C.stockSize*3;i++){
        const line=sells[Math.floor(random()*sells.length)]||sells[0];
        const tier=weighted(chances,t=>t.chance).tier;
        // Une ligne de manuels : un sort tiré dans l'école.
        const school=line.type==="manual"?spells.filter(s=>s.ecole===line.ecole):null;
        const name=school?school[Math.floor(random()*school.length)]?.nom:line.objet;
        const item=name?generator.createItemByName(line.type,name,tier):null;
        if(item) stock.push({id:stock.length,item});
      }
      return stock;
    }

    // « Rien que pour toi » : un objet hors de sa liste, d'une famille tirée au hasard, en T3 ou T4 (chances de l'étal
    // ramenées à ces tiers) ; null si rien ne convient.
    function rollSpecial(row,renown){
      const sells=new Set((row?.vend||[]).map(v=>v.type+"|"+v.objet));
      const families=FAMILIES.map(([type,key])=>({type,names:rows(reference?.[key]).map(r=>r.nom).filter(n=>n&&!sells.has(type+"|"+n))}))
        .filter(f=>f.names.length);
      if(!families.length) return null;
      const high=tierChances(renown).filter(t=>t.tier>=C.specialMinTier&&t.chance>0);
      const chances=high.length?high:[{tier:C.specialMinTier,chance:1}];
      for(let i=0;i<20;i++){
        const family=families[Math.floor(random()*families.length)]||families[0];
        const name=family.names[Math.floor(random()*family.names.length)]||family.names[0];
        const item=generator.createItemByName(family.type,name,weighted(chances,t=>t.chance).tier);
        if(item&&values.value(item)!==null) return item;
      }
      return null;
    }

    function marketOf(state){
      if(!state.market) state.market={visit:null,merchants:{}};
      if(!state.market.merchants) state.market.merchants={};
      return state.market;
    }
    const acquiredOf=(state,id)=>Number(state?.market?.merchants?.[id]?.acquired)||0;
    const captainOf=state=>state.company.roster.find(m=>m.id===state.company.captainId)||null;
    // Affinité initiale (peuple, culture, alignement) du marchand avec quelqu'un de la compagnie ; null si incalculable.
    function initialWith(person,merchant){
      const result=person&&affinity&&merchant?.people&&merchant?.alignment?affinity.affinity(person,merchant):null;
      return result?.ok?result.initial:null;
    }

    // Affinité du marchand avec le capitaine (−100 à +100) : initiale + acquise.
    function affinityWith(state,merchant){
      return clamp((initialWith(captainOf(state),merchant)??0)+acquiredOf(state,merchant?.id),-100,100);
    }

    // Affinité acquise : elle bouge sans sortir l'affinité totale de −100 à +100.
    function changeAffinity(state,merchant,delta){
      if(!merchant?.id||!delta) return 0;
      const market=marketOf(state),initial=initialWith(captainOf(state),merchant)??0;
      const before=acquiredOf(state,merchant.id);
      const after=clamp(before+delta,-100-initial,100-initial);
      market.merchants[merchant.id]={...(market.merchants[merchant.id]||{}),acquired:after};
      return after-before;
    }

    // L'intendant : {steward, bonus} ; bonus = 1 % par tranche de 10 points d'Intendance, si l'affinité du marchand avec
    // lui est d'au moins +20.
    function stewardHelp(state,merchant){
      const id=state?.company?.intendantId;
      const steward=id==null?null:state.company.roster.find(m=>m.id===id)||null;
      const score=initialWith(steward,merchant);
      if(!steward||score===null||score<C.stewardMinAffinity) return {steward:null,bonus:0};
      const skill=clamp(Number(steward.skills?.camp?.Intendance)||0,0,100);
      const bonus=Math.floor(skill/C.stewardStep)*C.stewardPerStep;
      return bonus>0?{steward,bonus}:{steward:null,bonus:0};
    }

    // Prix demandé par le marchand (vous achetez), ou null si l'objet n'a pas de valeur.
    function sellPrice(item,affinityScore=0,stewardBonus=0){
      const value=values.value(item);
      if(value===null) return null;
      return Math.max(1,Math.round(value*C.margin*(1-C.affinityFactor*(Number(affinityScore)||0)/100)*(1-(Number(stewardBonus)||0))));
    }

    const specialtyOf=(merchant,item)=>(merchant?.sells||[]).some(s=>s.type===item?.itemType&&(s.school?s.school===item?.school:s.name===item?.name));
    const quantityKey=item=>`${item?.itemType}|${item?.name}|${Number(item?.tier)||1}`;

    // Prix de rachat (vous vendez), ou null si l'objet n'a pas de valeur. options : affinity, steward (bonus), specialty,
    // level (étoiles de la renommée, 1 à 15), sold (exemplaires identiques déjà vendus pendant le passage).
    function buybackPrice(item,{affinity:score=0,steward=0,specialty=false,level=1,sold=0}={}){
      const value=values.value(item),ask=sellPrice(item,score,steward);
      if(value===null||ask===null) return null;
      const rare=specialty?rarity(item.tier)*clamp((maxLevel-level)/(maxLevel-1),0,1):0;
      const price=value*C.buyback*(1+C.buybackAffinity*(Number(score)||0)/100)*(1+(Number(steward)||0))
        *(specialty?1:C.offSpecialty)*Math.pow(C.quantityDecay,Math.max(0,Number(sold)||0))*(1+rare);
      return Math.max(1,Math.round(Math.min(price,C.cap*ask)));
    }

    // À +100 d'affinité, une fois par passage : il met de côté l'objet « rien que pour toi » (visit.special).
    function ensureSpecial(state,{renown=0}={}){
      const visit=state.market?.visit,row=merchantById(visit?.merchantId);
      if(!visit||!row||visit.special) return visit?.special||null;
      if(affinityWith(state,view(row))<C.specialAffinity) return null;
      const item=rollSpecial(row,renown);
      visit.special=item?{item,taken:false}:{item:null,taken:true};
      return visit.special;
    }

    // Le matin (campaign.js, advanceOneDay) : le marchand de la veille repart (−3 d'affinité s'il n'a rien vendu ni
    // acheté) ; un autre passe peut-être. renown : renommée totale de la compagnie. Renvoie {chance, left, arrived}.
    function morning(state,{renown=0}={}){
      const market=marketOf(state);
      const previous=market.visit,left=view(merchantById(previous?.merchantId));
      if(left&&!previous.traded) changeAffinity(state,left,C.idleVisit);
      market.visit=null;
      const chance=arrivalChance(renown);
      if(!list.length||random()>=chance) return {chance,left,arrived:null};
      const row=weighted(list,m=>Number(m.poids)||0);
      market.visit={merchantId:row.id,day:state.day,stock:rollStock(row,renown),sold:{},traded:false};
      ensureSpecial(state,{renown});
      return {chance,left,arrived:view(row)};
    }

    // Le marchand présent aujourd'hui, son étal et ses prix ; null s'il n'y en a pas.
    // {merchant, affinity, steward, level, offers:[{id, item, price}], special:{item, price} (rien que pour toi, ou null),
    //  buyback(item) → {price, specialty}}
    function visitOf(state,{renown=0}={}){
      const visit=state.market?.visit;
      if(!visit||visit.day!==state.day) return null;
      const merchant=view(merchantById(visit.merchantId));
      if(!merchant) return null;
      const score=affinityWith(state,merchant),help=stewardHelp(state,merchant),level=levelOf(renown);
      const offers=(visit.stock||[]).map(a=>({id:a.id,item:a.item,price:sellPrice(a.item,score,help.bonus)}));
      const buyback=item=>{
        const specialty=specialtyOf(merchant,item);
        return {specialty,price:buybackPrice(item,{affinity:score,steward:help.bonus,specialty,level,sold:visit.sold?.[quantityKey(item)]||0})};
      };
      const kept=visit.special?.item&&!visit.special.taken?visit.special.item:null;
      const askedFor=kept?sellPrice(kept,score,help.bonus):null;
      const special=kept&&askedFor!==null?{item:kept,price:Math.max(1,Math.round(askedFor*C.specialPrice))}:null;
      return {merchant,affinity:score,steward:help.steward,stewardBonus:help.bonus,level,offers,special,buyback};
    }

    // Achat de l'article id de l'étal : l'or doit suffire ; l'objet rejoint l'Intendance ; +2 d'affinité.
    function buy(state,id,options={}){
      const visit=visitOf(state,options);
      if(!visit) return {ok:false,reason:"Aucun marchand au camp aujourd'hui."};
      const offer=visit.offers.find(o=>o.id===Number(id));
      if(!offer) return {ok:false,reason:"Cet objet n'est plus en vente."};
      if(offer.price===null) return {ok:false,reason:"Cet objet n'a pas de prix."};
      if(state.company.gold<offer.price) return {ok:false,reason:"Pas assez d'or.",price:offer.price};
      state.company.gold-=offer.price;
      if(!Array.isArray(state.company.stock)) state.company.stock=[];
      state.company.stock.push(offer.item);
      const market=state.market;
      market.visit.stock=market.visit.stock.filter(a=>a.id!==offer.id);
      market.visit.traded=true;
      changeAffinity(state,visit.merchant,C.perPurchase);
      // L'achat qui le porte à +100 : il sort aussitôt l'objet « rien que pour toi ».
      const special=ensureSpecial(state,options);
      return {ok:true,item:offer.item,price:offer.price,merchant:visit.merchant,special:Boolean(special?.item&&!special.taken)};
    }

    // Achat de l'objet « rien que pour toi » : une fois par passage, l'or doit suffire ; il rejoint l'Intendance.
    function buySpecial(state,options={}){
      const visit=visitOf(state,options);
      if(!visit) return {ok:false,reason:"Aucun marchand au camp aujourd'hui."};
      if(!visit.special) return {ok:false,reason:"Il n'a rien de côté pour vous."};
      const {item,price}=visit.special;
      if(state.company.gold<price) return {ok:false,reason:"Pas assez d'or.",price};
      state.company.gold-=price;
      if(!Array.isArray(state.company.stock)) state.company.stock=[];
      state.company.stock.push(item);
      state.market.visit.special.taken=true;
      state.market.visit.traded=true;
      changeAffinity(state,visit.merchant,C.perPurchase);
      return {ok:true,item,price,merchant:visit.merchant,special:true};
    }

    // Vente d'un objet de l'Intendance : il disparaît, la compagnie touche le prix de rachat.
    function sell(state,itemId,options={}){
      const visit=visitOf(state,options);
      if(!visit) return {ok:false,reason:"Aucun marchand au camp aujourd'hui."};
      const stock=state.company.stock||[];
      const item=stock.find(i=>String(i.id)===String(itemId));
      if(!item) return {ok:false,reason:"Objet introuvable à l’Intendance."};
      const {price,specialty}=visit.buyback(item);
      if(price===null) return {ok:false,reason:"Il n’en veut pas."};
      state.company.stock=stock.filter(i=>i!==item);
      state.company.gold+=price;
      const v=state.market.visit,key=quantityKey(item);
      v.sold={...(v.sold||{}),[key]:(Number(v.sold?.[key])||0)+1};
      v.traded=true;
      return {ok:true,item,price,specialty,merchant:visit.merchant};
    }

    return {constants:C,arrivalChance,tierChances,affinityWith,stewardHelp,sellPrice,buybackPrice,morning,visitOf,buy,buySpecial,sell,ensureSpecial};
  }

  return {createMerchantRules};
});
