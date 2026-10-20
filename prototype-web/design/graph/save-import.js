"use strict";

// Import local en lecture seule des sauvegardes de Blood & Wages.
// Ne stocke ni n'envoie les fichiers : extrait uniquement les valeurs nécessaires au scénario.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.MercenairesDesignSaveImport=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const safeNumber=x=>Number.isFinite(Number(x))?Number(x):0;
  function parse(text){
    const data=typeof text==="string"?JSON.parse(text):text;
    if(data?.format&&data.format!=="mercenaires-save")throw new Error("Format de sauvegarde non reconnu.");
    const state=data?.state||data;
    const company=state?.company;
    if(!Array.isArray(company?.roster)||!company.roster.length)
      throw new Error("Sauvegarde incomplète : membres de la compagnie introuvables.");
    const captain=company.roster.find(m=>String(m.id)===String(company.captainId));
    if(!captain)throw new Error("Capitaine introuvable dans l'effectif.");
    const others=company.roster
      .map((m,index)=>({raw:m,index}))
      .filter(x=>String(x.raw.id)!==String(captain.id))
      .sort((a,b)=>safeNumber(b.raw.reputation)-safeNumber(a.raw.reputation)||a.index-b.index);
    const first=others[0]?.raw,second=others[1]?.raw;
    const heritage=(company.renownHeritage||[]).reduce((sum,h)=>sum+safeNumber(h.heritage),0);
    const candidate=(state.tavern?.candidates||[]).find(c=>c?.mercenary)?.mercenary||first||captain;
    const economy={
      captain:safeNumber(captain.reputation),
      first:safeNumber(first?.reputation),
      second:safeNumber(second?.reputation),
      heritage,
      reputation:safeNumber(candidate.reputation),
      salary:safeNumber(candidate.salary),
      courage:safeNumber(candidate.stats?.Courage),
      pretensions:safeNumber(candidate.salaryPretension),
      intelligence:safeNumber(candidate.stats?.Intelligence),
      will:safeNumber(candidate.stats?.["Volonté"]),
      offerPercent:75,
      companySnapshot:{
        captainId:company.captainId,firstId:first?.id,secondId:second?.id,
        roster:company.roster.map(m=>({id:m.id,name:String(m.name||"Mercenaire"),reputation:safeNumber(m.reputation)}))
      }
    };
    return {economy,rosterCount:company.roster.length,companyName:String(company.name||"Compagnie sans nom")};
  }
  return {parse};
});
