"use strict";

// Échanges d'équipement entre la compagnie et un mercenaire (Idan, 2026-10-24) : Donner (un objet du stock va dans
// un emplacement vide), Retirer (un objet du mercenaire part au stock), Troquer (les deux à la fois).
// - Le mercenaire juge le marché à la valeur perçue des objets : tier × Int/100 + attache × (1 − Int/100), l'attache
//   valant 3,5 pour un objet qu'il possède (le bête tient à ce qu'il a, même cassé) et 2,5 pour un objet proposé
//   (le bête voit mal la différence entre un T1 et un T4).
// - Chance d'accord = 10 + 80 / (1 + e^(−Δ/20)), la courbe du combat ; Δ = 20 × (valeur perçue reçue − valeur
//   perçue cédée) + 0,5 × Affinité. Jet D100 : accord si le jet ne dépasse pas la chance.
// - Accord ou refus, l'affinité acquise bouge selon la valeur perçue : + 2 par point gagné, − 2 par point perdu.
// - Pas de limite par jour (Idan, 2026-11-04 : « faut virer la règle du 1 par jour. Trop contraignant ») : chaque
//   proposition a son jet et bouge l'affinité ; le capitaine s'équipe librement (ni jet, ni affinité).
// - Un objet donné appartient ensuite au mercenaire ; un objet retiré retourne au stock, sans propriétaire.
// - Chaque proposition entre dans l'historique du mercenaire (history.js).
// - Potions et fioles (Idan, 2026-10-29) : consommables de la compagnie, distribués librement dans les 4 emplacements
//   de ceinture (ni jet, ni affinité, ni limite par jour, ni historique).
// - L'intendant, s'il y en a un, appuie la proposition : Δ + 0,2 × Intendance + 0,25 × affinité envers lui.
// - Inventaire (Idan, 2026-10-30) : les objets du mercenaire qu'il ne porte pas, gardés au dortoir, sans limite.
//   Donner les y met (même jet) ; Retirer peut aussi les reprendre (même jet). Entre ses propres objets — emplacements
//   portés, set 1, set 2, inventaire — tout est libre : ni jet, ni affinité, ni limite par jour (rearrange, swapSets),
//   tant qu'il est au camp. S'il meurt en mission, l'inventaire retourne à l'Intendance (campaign.js).
// - Armure (Idan, 2026-11-03) : sans le port de son type, il ne peut pas la porter (armor-ports.js) ; l'inventaire la
//   garde.
// - Relance après un refus (Idan, 2026-11-04 ; persuasion.js) : une fois, Intimider (+ Intimidation du capitaine) ou
//   Convaincre (+ Charisme ÷ 2) ; l'affinité de l'échange, déjà comptée, est revue : une perte × 2 (intimidé) ou × 0,5
//   (convaincu), accord ou refus ; un gain accordé, rien s'il a été intimidé.
// Constantes : formula-constants.json (equipment_deal.*).
(function(root,factory){
  const history=typeof module!=="undefined"&&module.exports?require("./history.js"):root.MercenairesHistory;
  const armorPorts=typeof module!=="undefined"&&module.exports?require("./armor-ports.js"):root.MercenairesArmorPorts;
  const persuasion=typeof module!=="undefined"&&module.exports?require("./persuasion.js"):root.MercenairesPersuasion;
  const api=factory(history,armorPorts,persuasion);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesEquipmentDeals=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(History,ArmorPorts,Persuasion){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const WEAPON_SLOT=/^weapon_set_(\d+)_(main|off)$/;
  const BELT_POCKET=/^belt_item_[1-4]$/;
  // L'inventaire, comme « emplacement » d'un échange.
  const INVENTORY="inventory";
  // Un emplacement de ceinture : on y range une fiole sans négocier.
  const isPocket=slot=>BELT_POCKET.test(String(slot));

  function createEquipmentDeals({reference,affinityRules=null,random=Math.random}={}){
    const weapons=new Map(rows(reference?.weapons).map(r=>[r.nom,r]));
    const ports=ArmorPorts.createArmorPorts(reference);
    const persuasion=Persuasion?Persuasion.createPersuasionRules({reference}):null;
    const REFUSAL="dealRefusal";
    const constant=(code,fallback)=>{
      const value=Number(rows(reference?.formulaConstants).find(r=>r.code===code)?.valeur);
      return Number.isFinite(value)?value:fallback;
    };
    const C={
      ownedValue:constant("equipment_deal.owned_value",3.5),
      offeredValue:constant("equipment_deal.offered_value",2.5),
      valueWeight:constant("equipment_deal.value_weight",20),
      affinityWeight:constant("equipment_deal.affinity_weight",0.5),
      affinityPerValue:constant("equipment_deal.affinity_per_value",2),
      stewardSkill:constant("equipment_deal.steward_skill_weight",0.2),
      stewardAffinity:constant("equipment_deal.steward_affinity_weight",0.25)
    };

    const rosterOf=state=>state?.company?.roster||[];
    const stockOf=state=>state?.company?.stock||[];
    const captainOf=state=>rosterOf(state).find(m=>m.id===state.company.captainId)||null;
    const isCaptain=(state,mercenary)=>Boolean(mercenary)&&mercenary.id===state?.company?.captainId;
    function itemIn(mercenary,slot){
      const id=mercenary?.equipment?.slots?.[slot];
      return id?(mercenary.items||[]).find(item=>item.id===id)||null:null;
    }
    // Ce qu'il possède sans le porter.
    function inventoryOf(mercenary){
      const worn=new Set(Object.values(mercenary?.equipment?.slots||{}).filter(Boolean));
      return (mercenary?.items||[]).filter(item=>!worn.has(item.id));
    }

    // Valeur perçue d'un objet par le mercenaire : le tier pour l'instant (Idan, 2026-10-24), brouillé par la bêtise.
    function perceivedValue(item,mercenary,owned){
      if(!item) return 0;
      const sense=clamp(Number(mercenary?.stats?.Intelligence)||0,0,100)/100;
      // Une monture (Idan, 2026-11-07) : son rang d'échange (mounts.json : le destrier comme un T3, la licorne comme un T4).
      return (Number(item.exchangeTier??item.tier)||1)*sense+(owned?C.ownedValue:C.offeredValue)*(1-sense);
    }

    function no(reason){ return {ok:false,reason}; }
    // L'objet peut-il aller dans cet emplacement ? Armure, bottes, ou arme selon la main et la prise de l'autre main.
    function slotAccepts(mercenary,slot,item){
      if(!item) return no("Aucun objet.");
      // Les fioles vont dans les poches de ceinture, pas dans l'inventaire.
      if(slot===INVENTORY) return item.itemType==="potion"?no("Une fiole se range dans une poche de ceinture."):{ok:true};
      if(slot==="armor") return item.itemType==="armor"?ports.canWear(mercenary,item):no("Cet emplacement reçoit une armure.");
      if(slot==="boots") return item.itemType==="boots"?{ok:true}:no("Cet emplacement reçoit des bottes.");
      if(slot==="belt") return item.itemType==="belt"?{ok:true}:no("Cet emplacement reçoit une ceinture.");
      if(slot==="amulet") return item.itemType==="amulet"?{ok:true}:no("Cet emplacement reçoit une amulette.");
      if(slot==="cape") return item.itemType==="cape"?{ok:true}:no("Cet emplacement reçoit une cape.");
      // Gants et culotte (Idan, 2026-10-24).
      if(slot==="gloves") return item.itemType==="gloves"?{ok:true}:no("Cet emplacement reçoit des gants.");
      if(slot==="pants") return item.itemType==="pants"?{ok:true}:no("Cet emplacement reçoit une culotte.");
      // Six bagues (Idan, 2026-10-24).
      if(/^ring_[1-6]$/.test(String(slot))) return item.itemType==="ring"?{ok:true}:no("Cet emplacement reçoit une bague.");
      // Casques et chapeaux (Idan, 2026-10-25).
      if(slot==="head") return item.itemType==="helmet"?{ok:true}:no("Cet emplacement reçoit un casque ou un chapeau.");
      // Potions et fioles (Idan, 2026-10-29) : les 4 emplacements de ceinture.
      if(isPocket(slot)) return item.itemType==="potion"?{ok:true}:no("Cet emplacement reçoit une potion ou une fiole.");
      // Monture (Idan, 2026-11-07 : « S'il accepte il a la monture dans son inventaire en statut "non equipable". Pour
      // pouvoir l'équiper […], il doit passer du temps chez le dresseur ») : seulement celle qu'il a apprivoisée.
      if(slot==="mount"){
        if(item.itemType!=="mount") return no("Cet emplacement reçoit une monture.");
        return item.tamedBy!=null&&item.tamedBy===mercenary?.id?{ok:true}:no("Il doit d’abord l’apprivoiser chez le Dresseur.");
      }
      if(item.itemType==="mount") return no("Une monture va dans son emplacement de monture.");
      const match=String(slot).match(WEAPON_SLOT);
      if(!match||item.itemType!=="weapon") return no("Cet objet ne va pas dans cet emplacement.");
      const weapon=weapons.get(item.name)||{};
      const shield=/Boucliers/.test(String(weapon.domaine||""));
      const other=itemIn(mercenary,`weapon_set_${match[1]}_${match[2]==="main"?"off":"main"}`);
      if(match[2]==="main"){
        if(shield) return no("Un bouclier se tient en main secondaire.");
        if(weapon.prise==="2 mains"&&other) return no("Arme à deux mains : la main secondaire doit être libre.");
        return {ok:true};
      }
      if(weapon.prise==="2 mains") return no("Une arme à deux mains se tient en arme principale.");
      if(weapons.get(other?.name)?.prise==="2 mains") return no("L’arme principale se tient déjà à deux mains.");
      return {ok:true};
    }

    // Emplacements qui peuvent recevoir l'objet, avec ce qu'il y remplacerait (Intendance : « Donner à… »).
    function compatibleSlots(mercenary,item){
      const slots=Object.keys(mercenary?.equipment?.slots||{});
      return slots.filter(slot=>slotAccepts(mercenary,slot,item).ok).map(slot=>({slot,current:itemIn(mercenary,slot)}));
    }

    function actionFor(current,offered){
      if(current&&offered) return "troquer";
      if(current) return "retirer";
      if(offered) return "donner";
      return null;
    }

    // L'intendant appuie la proposition (Idan, 2026-10-24 ; formule de JC validée) : + 0,2 × son Intendance
    // + 0,25 × l'affinité du mercenaire envers lui (même règle qu'envers le capitaine : peuple, culture, alignement).
    // Pas d'aide quand c'est à l'intendant lui-même qu'on parle.
    function stewardHelp(state,mercenary){
      const id=state?.company?.intendantId;
      const steward=id==null?null:rosterOf(state).find(m=>m.id===id)||null;
      if(!steward||steward===mercenary) return {steward:null,bonus:0};
      const skill=clamp(Number(steward.skills?.camp?.Intendance)||0,0,100);
      const affinity=Number(affinityRules?.affinity?.(steward,mercenary)?.total)||0;
      return {steward,bonus:C.stewardSkill*skill+C.stewardAffinity*affinity};
    }

    // Le marché vu par le mercenaire : valeurs perçues, chance d'accord et effet sur l'affinité. Sans jet ni mutation.
    // slot : un emplacement, ou INVENTORY (itemId : l'objet de l'inventaire à reprendre).
    // approach : la relance (Intimider, Convaincre), qui s'ajoute à l'écart.
    function evaluate(state,{mercenaryId,slot,stockItemId=null,itemId=null}={},approach=null){
      const mercenary=rosterOf(state).find(m=>m.id===mercenaryId);
      if(!mercenary) return no("Mercenaire introuvable.");
      const given=slot===INVENTORY?(itemId==null?null:inventoryOf(mercenary).find(item=>String(item.id)===String(itemId))||null):itemIn(mercenary,slot);
      if(slot===INVENTORY&&itemId!=null&&!given) return no("Objet introuvable dans son inventaire.");
      const received=stockItemId==null?null:stockOf(state).find(item=>item.id===stockItemId)||null;
      if(stockItemId!=null&&!received) return no("Objet introuvable à l’Intendance.");
      const action=actionFor(given,received);
      if(!action) return no("Rien à échanger.");
      if(received){
        const fit=slotAccepts(mercenary,slot,received);
        if(!fit.ok) return fit;
      }
      const base={ok:true,action,mercenary,slot,given,received};
      if(isCaptain(state,mercenary)||isPocket(slot)) return {...base,free:true,chance:100,affinityDelta:0,mood:"neutral"};
      const valueGiven=perceivedValue(given,mercenary,true),valueReceived=perceivedValue(received,mercenary,false);
      const gain=valueReceived-valueGiven;
      const affinity=Number(affinityRules?.memberAffinity(captainOf(state),mercenary)?.total)||0;
      const help=stewardHelp(state,mercenary);
      const persuade=persuasion&&approach?persuasion.bonus(captainOf(state),approach):0;
      const delta=C.valueWeight*gain+C.affinityWeight*affinity+help.bonus+persuade;
      return {...base,free:false,valueGiven,valueReceived,gain,affinity,steward:help.steward,stewardBonus:help.bonus,delta,
        chance:10+80/(1+Math.exp(-delta/20)),
        affinityDelta:Math.round(C.affinityPerValue*gain),
        mood:gain>0?"pleased":gain<0?"displeased":"neutral"};
    }

    // Pas de limite par jour (Idan, 2026-11-04) : seulement pas pendant une mission.
    function canDeal(state,mercenary,slot=null){
      if(!mercenary) return no("Mercenaire introuvable.");
      // Parti en expédition (doc 17) : pas d'échange avant son retour. Mission programmée (Idan, 2026-10-30) : il est
      // encore au camp jusqu'au lendemain matin, on peut l'équiper.
      if((state.expeditions||[]).some(e=>e.memberIds.includes(mercenary.id)&&e.status!=="scheduled")) return no("Il est en mission.");
      return {ok:true};
    }

    function moveToStock(state,mercenary,item){
      if(!item) return null;
      mercenary.items=mercenary.items.filter(x=>x!==item);
      const slots=mercenary.equipment?.slots||{};
      for(const key of Object.keys(slots)) if(slots[key]===item.id) slots[key]=null;
      const stored={...item,owner:null,slot:null};
      stockOf(state).push(stored);
      return stored;
    }
    function equipFromStock(state,mercenary,slot,item){
      state.company.stock=stockOf(state).filter(x=>x!==item);
      const owned={...item,owner:mercenary.id,slot:slot===INVENTORY?null:slot};
      (mercenary.items||(mercenary.items=[])).push(owned);
      if(slot!==INVENTORY) mercenary.equipment.slots[slot]=owned.id;
      return owned;
    }

    // Réaménagement libre (Idan, 2026-10-30) : ses propres objets, d'un emplacement à l'autre ou vers l'inventaire.
    function canRearrange(state,mercenary){
      if(!mercenary) return no("Mercenaire introuvable.");
      if((state.expeditions||[]).some(e=>e.memberIds.includes(mercenary.id)&&e.status!=="scheduled")) return no("Il est en mission.");
      return {ok:true};
    }
    // Met l'objet itemId (à lui) dans slot, ou dans l'inventaire. L'objet qui occupait slot prend la place libérée s'il y
    // va, sinon il part dans l'inventaire ; une arme à deux mains en arme principale libère la main secondaire.
    function rearrange(state,{mercenaryId,itemId,slot}={}){
      const mercenary=rosterOf(state).find(m=>m.id===mercenaryId);
      const allowed=canRearrange(state,mercenary);
      if(!allowed.ok) return allowed;
      const item=(mercenary.items||[]).find(x=>String(x.id)===String(itemId));
      if(!item) return no("Objet introuvable.");
      const slots=mercenary.equipment.slots;
      const from=Object.keys(slots).find(key=>slots[key]===item.id)||null;
      if(item.itemType==="potion"||isPocket(slot)) return no("Les fioles se rangent depuis l’Intendance.");
      if(slot===INVENTORY){
        if(!from) return no("Il est déjà dans son inventaire.");
        slots[from]=null;
        item.slot=null;
        return {ok:true,item,from,slot,displaced:null,freed:null};
      }
      if(!(slot in slots)) return no("Emplacement inconnu.");
      if(from===slot) return no("Il le porte déjà là.");
      const before={...slots};
      if(from) slots[from]=null;
      const displaced=itemIn(mercenary,slot);
      slots[slot]=null;
      let freed=null;
      const match=String(slot).match(WEAPON_SLOT);
      if(match&&match[2]==="main"&&weapons.get(item.name)?.prise==="2 mains"){
        const off=`weapon_set_${match[1]}_off`;
        freed=itemIn(mercenary,off);
        if(freed) slots[off]=null;
      }
      const fit=slotAccepts(mercenary,slot,item);
      if(!fit.ok){ Object.assign(slots,before); return fit; }
      slots[slot]=item.id;
      item.slot=slot;
      if(displaced){
        if(from&&slotAccepts(mercenary,from,displaced).ok){ slots[from]=displaced.id; displaced.slot=from; }
        else displaced.slot=null;
      }
      if(freed) freed.slot=null;
      return {ok:true,item,from,slot,displaced,freed};
    }
    // Où cet objet (à lui) peut aller : chaque emplacement où rearrange réussirait, avec ce qu'il y remplacerait. Essai sur
    // une copie du mercenaire, rien ne bouge.
    function placeOptions(mercenary,item){
      if(!mercenary||!item) return [];
      return Object.keys(mercenary.equipment?.slots||{}).filter(slot=>!isPocket(slot)).map(slot=>{
        const copy={...mercenary,equipment:{...mercenary.equipment,slots:{...mercenary.equipment.slots}},items:(mercenary.items||[]).map(x=>({...x}))};
        const trial=rearrange({company:{roster:[copy]},expeditions:[]},{mercenaryId:copy.id,itemId:item.id,slot});
        return trial.ok?{slot,current:itemIn(mercenary,slot)}:null;
      }).filter(Boolean);
    }
    // Échange le set 1 et le set 2, main par main.
    function swapSets(state,{mercenaryId}={}){
      const mercenary=rosterOf(state).find(m=>m.id===mercenaryId);
      const allowed=canRearrange(state,mercenary);
      if(!allowed.ok) return allowed;
      const slots=mercenary.equipment.slots;
      for(const hand of ["main","off"]){
        const a=`weapon_set_1_${hand}`,b=`weapon_set_2_${hand}`;
        [slots[a],slots[b]]=[slots[b]??null,slots[a]??null];
        for(const key of [a,b]){ const item=itemIn(mercenary,key); if(item) item.slot=key; }
      }
      return {ok:true};
    }

    // Propose le marché : jet, affinité, puis échange si le mercenaire accepte.
    function propose(state,request){
      const deal=evaluate(state,request);
      if(!deal.ok) return deal;
      const allowed=canDeal(state,deal.mercenary,deal.slot);
      if(!allowed.ok) return {...allowed,action:deal.action};
      const {mercenary,slot,given,received}=deal;
      let roll=null,accepted=true;
      if(!deal.free){
        roll=Math.floor(random()*100)+1;
        accepted=roll<=deal.chance;
        mercenary.affinityAcquired=(Number(mercenary.affinityAcquired)||0)+deal.affinityDelta;
      }
      if(accepted){
        if(given) moveToStock(state,mercenary,given);
        if(received) equipFromStock(state,mercenary,slot,received);
      }
      // Historique (Idan, 2026-10-24) : l'échange proposé, accepté ou refusé ; pas les fioles.
      const brief=item=>item?{name:item.name,tier:item.tier}:null;
      if(!isPocket(slot)) History?.record(mercenary,state.day,"deal",{action:deal.action,accepted,free:deal.free,given:brief(given),received:brief(received)});
      // Refusé : on peut relancer une fois aujourd'hui.
      const canRetry=!accepted&&!deal.free&&Boolean(persuasion);
      if(canRetry) persuasion.markRefused(mercenary,REFUSAL,state.day,{request:{mercenaryId:mercenary.id,slot,stockItemId:request.stockItemId??null,itemId:request.itemId??null}});
      return {ok:true,action:deal.action,free:deal.free,accepted,roll,chance:deal.chance,affinityDelta:deal.affinityDelta,
        mood:deal.mood,mercenaryId:mercenary.id,slot,given,received,steward:deal.steward||null,canRetry};
    }
    // Après un refus, aujourd'hui : une relance, Intimider ou Convaincre, sur le même échange.
    function retry(state,mercenaryId,approach){
      const mercenary=rosterOf(state).find(m=>m.id===mercenaryId);
      if(!persuasion?.approachOf(approach)) return no("Approche inconnue.");
      const again=persuasion.canRetry(mercenary,REFUSAL,state.day);
      if(!again.ok) return again;
      const deal=evaluate(state,again.refusal.request,approach);
      if(!deal.ok) return deal;
      const allowed=canDeal(state,mercenary,deal.slot);
      if(!allowed.ok) return allowed;
      const {slot,given,received}=deal;
      const roll=Math.floor(random()*100)+1,accepted=persuasion.decide(approach,roll<=deal.chance);
      persuasion.markRetried(mercenary,REFUSAL,approach,accepted);
      const affinityDelta=persuasion.outcomeExtra(deal.affinityDelta,approach,accepted);
      mercenary.affinityAcquired=(Number(mercenary.affinityAcquired)||0)+affinityDelta;
      if(accepted){
        if(given) moveToStock(state,mercenary,given);
        if(received) equipFromStock(state,mercenary,slot,received);
        const brief=item=>item?{name:item.name,tier:item.tier}:null;
        History?.record(mercenary,state.day,"deal",{action:deal.action,accepted:true,free:false,given:brief(given),received:brief(received)});
      }
      return {ok:true,action:deal.action,free:false,accepted,approach,roll,chance:deal.chance,affinityDelta,mood:deal.mood,
        mercenaryId:mercenary.id,slot,given,received,steward:deal.steward||null};
    }

    return {constants:C,perceivedValue,slotAccepts,compatibleSlots,evaluate,canDeal,propose,retry,isPocket,INVENTORY,inventoryOf,
      canRearrange,rearrange,placeOptions,swapSets};
  }

  return {createEquipmentDeals};
});
