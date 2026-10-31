"use strict";

// Étoiles de réputation (décision Idan du 2026-10-20) : la réputation personnelle et la renommée de
// compagnie s'affichent en 15 niveaux, 1 à 5 étoiles de bronze, puis d'argent, puis d'or.
// Données : data/reference/reputation-stars.json (seuils minimaux de chaque niveau).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesStars=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const METAL_KEYS={Bronze:"bronze",Argent:"silver",Or:"gold"};
  const METAL_LABELS={Bronze:"de bronze",Argent:"d'argent",Or:"d'or"};

  function createStarRules({reference}={}){
    const rows=[...(reference?.reputationStars?.rows||[])].sort((a,b)=>a.niveau-b.niveau);

    // Plus haut niveau dont le seuil est atteint ; scale = "reputation_min" ou "renommee_min".
    function levelFor(value,scale){
      const v=Number(value)||0;
      let found=rows[0]||null;
      for(const row of rows) if(v>=Number(row[scale])) found=row;
      if(!found) return null;
      const next=rows.find(r=>r.niveau===found.niveau+1)||null;
      return {
        level:found.niveau,
        stars:found.etoiles,
        metal:found.metal,
        metalKey:METAL_KEYS[found.metal]||"bronze",
        label:found.etoiles+" étoile"+(found.etoiles>1?"s":"")+" "+(METAL_LABELS[found.metal]||found.metal),
        phrase:found.phrase||null,
        variants:found.variantes||[],
        max:!next,
        value:v,
        nextAt:next?Number(next[scale]):null
      };
    }

    // Un niveau donné (1 à 15), pour les étoiles qui ne viennent pas d'une valeur de réputation (évaluation du
    // mercenaire, mercenary-profile.js).
    function byLevel(level){
      const row=rows.find(r=>r.niveau===level);
      return row?levelFor(row.reputation_min,"reputation_min"):null;
    }

    return {
      rows,
      byLevel,
      personal:reputation=>levelFor(reputation,"reputation_min"),
      company:renown=>levelFor(renown,"renommee_min")
    };
  }

  return {createStarRules};
});
