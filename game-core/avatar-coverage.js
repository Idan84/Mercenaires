"use strict";

// Couverture des avatars : pour chaque peuple, ce qui manque ou est sous-représenté parmi les avatars,
// au regard de ce que le jeu génère vraiment. Outil de production pour Idan et Jean-Mimi (Design Lab),
// sans effet sur le jeu.
//
// - Besoin d'un peuple = taille maximale de la compagnie de départ (règle du générateur) + places de la
//   Taverne (tavern.slots.initial) : de quoi donner un visage à chacun en début de partie.
// - Pour chaque famille de tags (culture, profil, catégorie d'arme, magie principale, ascendance) :
//   part des mercenaires générés qui portent la valeur, cible = part × besoin, avatars tagués.
(function(root,factory){
  const deps=typeof module!=="undefined"&&module.exports
    ?{catalog:require("./avatar-catalog.js"),avatars:require("./avatars.js")}
    :{catalog:root.MercenairesAvatarCatalog,avatars:root.MercenairesAvatars};
  const api=factory(deps);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesAvatarCoverage=api;
})(typeof globalThis!=="undefined"?globalThis:this,function({catalog,avatars}){
  const norm=catalog.norm;
  const FAMILIES=["culture","profile","weapon","magic","ascendance"];
  const PROFILE_LABELS={melee:"Corps à corps",ranged:"Distance",magic:"Magie"};

  function constant(reference,code,fallback){
    const row=(reference?.formulaConstants?.rows||[]).find(r=>r.code===code);
    const value=Number(row?.valeur??row?.value);
    return Number.isFinite(value)?value:fallback;
  }

  function status(count,need){
    if(!count) return "manquant";
    if(count<need/2) return "sous-représenté";
    if(count<need) return "juste";
    return "ok";
  }

  // Valeurs d'un mercenaire généré, par famille (catégories d'arme plutôt qu'armes précises).
  function mercenaryValues(m,categoryOf,magicNames){
    const t=avatars.avatarTags(m);
    return {
      culture:m.culture?[m.culture]:[],
      profile:t.profile.map(p=>PROFILE_LABELS[p]||p),
      weapon:[...new Set(t.weapon.map(w=>categoryOf.get(w)).filter(Boolean))],
      magic:t.magic.slice(0,1).map(x=>magicNames.get(x)||x),
      ascendance:m.ascendance?[m.ascendance]:[]
    };
  }

  // Valeurs d'un avatar, dans les mêmes termes.
  function avatarValues(a,categoryOf,labels){
    const tags=a.tags||{};
    return {
      culture:(tags.culture||[]).map(norm),
      profile:(tags.profile||[]).map(p=>norm(PROFILE_LABELS[p]||p)),
      weapon:[...new Set((tags.weapon||[]).map(w=>labels.has(norm(w))?norm(w):categoryOf.get(norm(w))).filter(Boolean))].map(norm),
      magic:(tags.magic||[]).map(norm),
      ascendance:(tags.ascendance||[]).map(norm)
    };
  }

  // generator : générateur du jeu (createMercenary, rollInitialSquadSize) ; maxGenerator : le même, dont
  // le hasard tire toujours le maximum, pour la taille maximale de la compagnie de départ.
  function createCoverage({reference,catalog:rows=[],generator,maxGenerator,samples=300}){
    const weapons=reference?.weapons?.rows||[];
    const categoryOf=new Map();
    const labels=new Set();
    for(const w of weapons){
      const category=String(w.domaine||"").split(",")[0].trim();
      if(!category) continue;
      categoryOf.set(norm(w.nom),category);
      categoryOf.set(norm(category),category);
      labels.add(norm(category));
    }
    const magicNames=new Map((reference?.skills?.rows||[]).filter(r=>r.domaine==="Magie").map(r=>[norm(r.nom),r.nom]));
    const tavernSlots=constant(reference,"tavern.slots.initial",5);
    const peoples=(reference?.peoples?.rows||[]).map(r=>r.nom);

    function forPeople(people){
      const own=rows.filter(a=>norm(a.people)===norm(people));
      const need=maxGenerator.rollInitialSquadSize({people,ascendance:null})+tavernSlots;
      const demand=Object.fromEntries(FAMILIES.map(f=>[f,new Map()]));
      for(let i=0;i<samples;i++){
        const values=mercenaryValues(generator.createMercenary({id:i+1,forcedPeople:people}),categoryOf,magicNames);
        for(const f of FAMILIES) for(const v of values[f]) demand[f].set(v,(demand[f].get(v)||0)+1);
      }
      const tagged=own.map(a=>avatarValues(a,categoryOf,labels));
      const families={};
      for(const f of FAMILIES){
        families[f]=[...demand[f].entries()].map(([value,n])=>{
          const share=n/samples;
          const target=Math.round(share*need);
          const count=tagged.filter(t=>t[f].includes(norm(value))).length;
          return {value,share,target,avatars:count,gap:Math.max(0,target-count)};
        }).sort((a,b)=>b.gap-a.gap||b.share-a.share);
      }
      const sources={git:own.filter(a=>!String(a.full).startsWith("/")).length,hostinger:own.filter(a=>String(a.full).startsWith("/")).length};
      return {
        people,need,avatars:own.length,sources,
        femmes:own.filter(a=>a.sex==="femme").length,
        hommes:own.filter(a=>a.sex==="homme").length,
        sansSexe:own.filter(a=>!a.sex).length,
        sansTags:own.filter(a=>!Object.keys(a.tags||{}).length).length,
        status:status(own.length,need),
        families
      };
    }

    return {peoples,tavernSlots,forPeople};
  }

  return {createCoverage,status,FAMILIES,PROFILE_LABELS};
});
