"use strict";

// Création du capitaine : forces et faiblesses d'un peuple, d'une culture, d'une origine sociale ou
// d'une ascendance, lues dans la matrice de génération (data/reference/generation-matrix.json) avec la
// même correspondance nom → colonne que le générateur (normalizeKey). Rien d'inventé : un modificateur
// positif est une force, un modificateur négatif une faiblesse.
(function(root,factory){
  const core=typeof module!=="undefined"&&module.exports?require("./mercenary-generator.js"):root.MercenairesCore;
  const api=factory(core);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesCreation=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(core){
  function traitsFor(reference,name){
    const key=core.normalizeKey(name);
    const forces=[],faiblesses=[];
    if(!key) return {forces,faiblesses};
    for(const row of reference?.generationMatrix?.rows||[]){
      const value=Number(row[key]);
      if(!Number.isFinite(value)||value===0) continue;
      (value>0?forces:faiblesses).push({name:row.cible,value,domain:row.domaine||null});
    }
    const order=(a,b)=>Math.abs(b.value)-Math.abs(a.value)||a.name.localeCompare(b.name,"fr");
    return {forces:forces.sort(order),faiblesses:faiblesses.sort(order)};
  }

  return {traitsFor};
});
