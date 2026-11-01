"use strict";

// Manuels de sorts (Idan, 2026-10-31 : « les manuels des sorts doivent être en vente ; c'est ce qui permettra de les
// apprendre »). Un manuel par sort de data/reference/spells.json : les sorts à venir ont leur manuel sans rien ajouter.
// - L'objet : type « manual », nom « Manuel : <sort> », catégorie = son école ; sans tier ni qualité. Créé par
//   createItemByName("manual", nom ou code du sort) (mercenary-generator.js).
// - Sa valeur : la même pour tous les sorts (economy.manual_value, 3 000 PO ; Idan, 2026-11-01) : item-value.js.
// - Les marchands vendent les manuels d'une école entière (merchants.json : {type:"manual", ecole}) : un article tiré
//   dans cette école (merchants.js).
// - Apprendre : à l'Intendance, un membre de la compagnie présent au camp lit le manuel et connaît le sort au niveau 1,
//   comme un sort de création (generation.spells.starting_level) ; le manuel est consommé. Pas de prérequis d'école
//   (doc 12 : « pas de prérequis d'école pour connaître ou lancer un sort ») ; on n'apprend pas un sort déjà connu.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesSpellManuals=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  const PREFIX="Manuel : ";

  function createManualRules({reference}={}){
    const constants=new Map(rows(reference?.formulaConstants).map(r=>[r.code,Number(r.valeur)]));
    const startingLevel=Number.isFinite(constants.get("generation.spells.starting_level"))?constants.get("generation.spells.starting_level"):1;
    const spells=rows(reference?.spells);
    const schools=[...new Set(spells.map(s=>s.ecole).filter(Boolean))];

    const spellByKey=key=>spells.find(s=>s.code===key||s.nom===key||PREFIX+s.nom===key)||null;
    const spellsOf=school=>spells.filter(s=>s.ecole===school);
    const isManual=item=>item?.itemType==="manual";
    const spellOf=item=>isManual(item)?spellByKey(item.spellCode)||spellByKey(item.name):null;
    const knows=(mercenary,code)=>(mercenary?.spells||[]).some(s=>s.code===code);
    const away=(state,mercenary)=>(state.expeditions||[]).some(e=>e.memberIds.includes(mercenary.id)&&e.status!=="scheduled");
    const no=reason=>({ok:false,reason});

    // Peut-il apprendre ce manuel ? {ok} ou {ok:false, reason}.
    function canLearn(state,mercenary,item){
      const spell=spellOf(item);
      if(!spell) return no("Ce n’est pas un manuel de sort.");
      if(!mercenary) return no("Mercenaire introuvable.");
      if(away(state,mercenary)) return no("Il est en mission.");
      if(knows(mercenary,spell.code)) return no("Il connaît déjà ce sort.");
      return {ok:true,spell};
    }

    // Lire un manuel de l'Intendance : le sort au niveau 1, le manuel consommé.
    function learn(state,mercenaryId,itemId){
      const stock=state.company.stock||[];
      const item=stock.find(i=>String(i.id)===String(itemId));
      if(!item) return no("Manuel introuvable à l’Intendance.");
      const mercenary=state.company.roster.find(m=>m.id===mercenaryId)||null;
      const check=canLearn(state,mercenary,item);
      if(!check.ok) return check;
      const spell=check.spell;
      if(!Array.isArray(mercenary.spells)) mercenary.spells=[];
      mercenary.spells.push({code:spell.code,name:spell.nom,school:spell.ecole,mastery:startingLevel});
      state.company.stock=stock.filter(i=>i!==item);
      return {ok:true,mercenary,spell,item};
    }

    return {PREFIX,schools,spellsOf,spellByKey,spellOf,isManual,knows,canLearn,learn};
  }

  return {createManualRules,PREFIX};
});
