"use strict";

// Manuels de sorts (Idan, 2026-10-31 : « les manuels des sorts doivent être en vente ; c'est ce qui permettra de les
// apprendre »). Un manuel par sort de data/reference/spells.json : les sorts à venir ont leur manuel sans rien ajouter.
// - L'objet : type « manual », nom « Manuel : <sort> », catégorie = son école ; sans tier ni qualité. Créé par
//   createItemByName("manual", nom ou code du sort) (mercenary-generator.js).
// - Sa valeur : la même pour tous les sorts (economy.manual_value, 3 000 PO ; Idan, 2026-11-01) : item-value.js.
// - Les marchands vendent les manuels d'une école entière (merchants.json : {type:"manual", ecole}) : un article tiré
//   dans cette école (merchants.js).
// - Apprendre (Idan, 2026-11-02) : à l'École de magie, dans la salle de l'école du sort (game-core/spell-study.js) ;
//   canLearn dit seulement si le manuel peut lui servir (un manuel, au camp, un sort qu'il ne connaît pas). Pas de
//   prérequis d'école pour le mercenaire (doc 12) : seulement la salle construite.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesSpellManuals=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  const PREFIX="Manuel : ";

  function createManualRules({reference}={}){
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

    return {PREFIX,schools,spellsOf,spellByKey,spellOf,isManual,knows,canLearn};
  }

  return {createManualRules,PREFIX};
});
