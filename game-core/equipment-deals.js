"use strict";

// Échanges d'équipement entre la compagnie et un mercenaire (Idan, 2026-10-24) : Donner (un objet du stock va dans
// un emplacement vide), Retirer (un objet du mercenaire part au stock), Troquer (les deux à la fois).
// - Le mercenaire juge le marché à la valeur perçue des objets : tier × Int/100 + attache × (1 − Int/100), l'attache
//   valant 3,5 pour un objet qu'il possède (le bête tient à ce qu'il a, même cassé) et 2,5 pour un objet proposé
//   (le bête voit mal la différence entre un T1 et un T4).
// - Chance d'accord = 10 + 80 / (1 + e^(−Δ/20)), la courbe du combat ; Δ = 20 × (valeur perçue reçue − valeur
//   perçue cédée) + 0,5 × Affinité. Jet D100 : accord si le jet ne dépasse pas la chance.
// - Accord ou refus, l'affinité acquise bouge selon la valeur perçue : + 2 par point gagné, − 2 par point perdu.
// - Une seule tentative par mercenaire et par jour ; le capitaine s'équipe librement (ni jet, ni affinité).
// - Un objet donné appartient ensuite au mercenaire ; un objet retiré retourne au stock, sans propriétaire.
// - Chaque proposition entre dans l'historique du mercenaire (history.js).
// - L'intendant, s'il y en a un, appuie la proposition : Δ + 0,2 × Intendance + 0,25 × affinité envers lui.
// Constantes : formula-constants.json (equipment_deal.*).
(function(root,factory){
  const history=typeof module!=="undefined"&&module.exports?require("./history.js"):root.MercenairesHistory;
  const api=factory(history);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesEquipmentDeals=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(History){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const WEAPON_SLOT=/^weapon_set_(\d+)_(main|off)$/;

  function createEquipmentDeals({reference,affinityRules=null,random=Math.random}={}){
    const weapons=new Map(rows(reference?.weapons).map(r=>[r.nom,r]));
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

    // Valeur perçue d'un objet par le mercenaire : le tier pour l'instant (Idan, 2026-10-24), brouillé par la bêtise.
    function perceivedValue(item,mercenary,owned){
      if(!item) return 0;
      const sense=clamp(Number(mercenary?.stats?.Intelligence)||0,0,100)/100;
      return (Number(item.tier)||1)*sense+(owned?C.ownedValue:C.offeredValue)*(1-sense);
    }

    function no(reason){ return {ok:false,reason}; }
    // L'objet peut-il aller dans cet emplacement ? Armure, bottes, ou arme selon la main et la prise de l'autre main.
    function slotAccepts(mercenary,slot,item){
      if(!item) return no("Aucun objet.");
      if(slot==="armor") return item.itemType==="armor"?{ok:true}:no("Cet emplacement reçoit une armure.");
      if(slot==="boots") return item.itemType==="boots"?{ok:true}:no("Cet emplacement reçoit des bottes.");
      if(slot==="belt") return item.itemType==="belt"?{ok:true}:no("Cet emplacement reçoit une ceinture.");
      if(slot==="amulet") return item.itemType==="amulet"?{ok:true}:no("Cet emplacement reçoit une amulette.");
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
    function evaluate(state,{mercenaryId,slot,stockItemId=null}={}){
      const mercenary=rosterOf(state).find(m=>m.id===mercenaryId);
      if(!mercenary) return no("Mercenaire introuvable.");
      const given=itemIn(mercenary,slot);
      const received=stockItemId==null?null:stockOf(state).find(item=>item.id===stockItemId)||null;
      if(stockItemId!=null&&!received) return no("Objet introuvable à l’Intendance.");
      const action=actionFor(given,received);
      if(!action) return no("Rien à échanger.");
      if(received){
        const fit=slotAccepts(mercenary,slot,received);
        if(!fit.ok) return fit;
      }
      const base={ok:true,action,mercenary,slot,given,received};
      if(isCaptain(state,mercenary)) return {...base,free:true,chance:100,affinityDelta:0,mood:"neutral"};
      const valueGiven=perceivedValue(given,mercenary,true),valueReceived=perceivedValue(received,mercenary,false);
      const gain=valueReceived-valueGiven;
      const affinity=Number(affinityRules?.memberAffinity(captainOf(state),mercenary)?.total)||0;
      const help=stewardHelp(state,mercenary);
      const delta=C.valueWeight*gain+C.affinityWeight*affinity+help.bonus;
      return {...base,free:false,valueGiven,valueReceived,gain,affinity,steward:help.steward,stewardBonus:help.bonus,delta,
        chance:10+80/(1+Math.exp(-delta/20)),
        affinityDelta:Math.round(C.affinityPerValue*gain),
        mood:gain>0?"pleased":gain<0?"displeased":"neutral"};
    }

    // Une tentative par mercenaire et par jour (Idan, 2026-10-24) ; le capitaine n'en a pas besoin.
    function canDeal(state,mercenary){
      if(!mercenary) return no("Mercenaire introuvable.");
      if(isCaptain(state,mercenary)) return {ok:true};
      if(mercenary.equipmentDealDay===state.day) return no("Vous lui avez déjà parlé d’équipement aujourd’hui.");
      return {ok:true};
    }

    function moveToStock(state,mercenary,slot){
      const item=itemIn(mercenary,slot);
      if(!item) return null;
      mercenary.items=mercenary.items.filter(x=>x!==item);
      mercenary.equipment.slots[slot]=null;
      const stored={...item,owner:null,slot:null};
      stockOf(state).push(stored);
      return stored;
    }
    function equipFromStock(state,mercenary,slot,item){
      state.company.stock=stockOf(state).filter(x=>x!==item);
      const owned={...item,owner:mercenary.id,slot};
      (mercenary.items||(mercenary.items=[])).push(owned);
      mercenary.equipment.slots[slot]=owned.id;
      return owned;
    }

    // Propose le marché : jet, affinité, puis échange si le mercenaire accepte.
    function propose(state,request){
      const deal=evaluate(state,request);
      if(!deal.ok) return deal;
      const allowed=canDeal(state,deal.mercenary);
      if(!allowed.ok) return {...allowed,action:deal.action};
      const {mercenary,slot,given,received}=deal;
      let roll=null,accepted=true;
      if(!deal.free){
        roll=Math.floor(random()*100)+1;
        accepted=roll<=deal.chance;
        mercenary.affinityAcquired=(Number(mercenary.affinityAcquired)||0)+deal.affinityDelta;
        mercenary.equipmentDealDay=state.day;
      }
      if(accepted){
        if(given) moveToStock(state,mercenary,slot);
        if(received) equipFromStock(state,mercenary,slot,received);
      }
      // Historique (Idan, 2026-10-24) : l'échange proposé, accepté ou refusé.
      const brief=item=>item?{name:item.name,tier:item.tier}:null;
      History?.record(mercenary,state.day,"deal",{action:deal.action,accepted,free:deal.free,given:brief(given),received:brief(received)});
      return {ok:true,action:deal.action,free:deal.free,accepted,roll,chance:deal.chance,affinityDelta:deal.affinityDelta,
        mood:deal.mood,mercenaryId:mercenary.id,slot,given,received,steward:deal.steward||null};
    }

    return {constants:C,perceivedValue,slotAccepts,compatibleSlots,evaluate,canDeal,propose};
  }

  return {createEquipmentDeals};
});
