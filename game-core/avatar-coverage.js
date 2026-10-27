"use strict";

// Couverture des avatars : pour chaque peuple, ce qui manque ou est sous-représenté parmi les avatars,
// au regard de ce que le jeu génère vraiment. Outil de production pour Idan et Jean-Mimi (Design Lab),
// sans effet sur le jeu.
//
// - Besoin d'un peuple = nombre d'avatars visé, le même pour tous les peuples (avatars.coverage.need, 100 :
//   Idan, 2026-10-22). Il remplace « compagnie de départ maximale + Taverne » (35 au plus), trop court.
// - Pour chaque famille de tags (culture, profil, catégorie d'arme, magie principale, ascendance) :
//   part des mercenaires générés qui portent la valeur, cible = part × besoin, avatars tagués.
// - Ascendances (Idan, 2026-10-25 : « il manque des ascendances ») : toutes celles que le peuple peut avoir, même
//   rares, avec leur part exacte (probabilité d'ascendance × poids / somme des poids), sans tirage.
// - Combinaisons (Idan, 2026-10-25 : « il faut que je croise ») : culture · profil · catégorie de l'arme tenue en main
//   (ou école du mage), les plus fréquentes d'abord, avec les avatars qui ont les trois tags (l'arme de l'avatar qui
//   correspond à son profil : « CAC + Hache + Arc » tient la hache) ; et, pour chaque culture, sa répartition par profil.
// - Culture et ascendance obligatoires (Idan, 2026-10-25) : part des mercenaires générés qui n'ont aucun avatar possible
//   (portrait générique), et ligne « Aucune » des ascendances (les avatars sans ascendance, pour les mercenaires qui n'en
//   ont pas).
// - Ascendances × cultures (Idan, 2026-10-26) : pour chaque ascendance (« Aucune » comprise) et chaque culture du peuple,
//   part des mercenaires (part de la culture × part de l'ascendance, tirées indépendamment), cible et avatars possibles,
//   selon les règles du jeu (une ascendance généraliste sert aussi « Aucune », pas « Ascendance only »). Culture et
//   ascendance étant obligatoires, chaque case possible vise au moins un avatar : sans lui, portrait générique.
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

  // Ascendances possibles du peuple et part exacte de chacune ; « Aucune » pour les mercenaires sans ascendance.
  const NO_ASCENDANCE="Aucune";
  function ancestryShares(reference,people){
    const presence=Number((reference?.peoples?.rows||[]).find(r=>r.nom===people)?.probabilite_d_ascendance)||0;
    const rows=(reference?.ancestryCompatibility?.rows||[]).filter(r=>r.peuple===people&&r.possible===true&&r.ascendance);
    const total=rows.reduce((sum,r)=>sum+(Number(r.poids_relatif)||1),0);
    return new Map([[NO_ASCENDANCE,1-presence],...rows.map(r=>[r.ascendance,total?presence*(Number(r.poids_relatif)||1)/total:0])]);
  }

  // Ce qui se voit d'abord : profil, et catégorie de l'arme tenue en main (celle de son profil), ou école pour un mage.
  function lookOf(m,categoryOf,magicNames,families){
    const t=avatars.avatarTags(m,families);
    const profile=t.profile[0]||null;
    if(profile==="magic"){
      const school=Object.entries(m.skills?.magic||{}).filter(([,v])=>Number.isFinite(v)).sort((a,b)=>b[1]-a[1])[0]?.[0];
      return {profile,kind:"magic",value:school?magicNames.get(norm(school))||school:null};
    }
    return {profile,kind:"weapon",value:t.main.map(w=>categoryOf.get(w)).find(Boolean)||null};
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

  // Valeurs d'un avatar, dans les mêmes termes ; held : par profil, catégories des armes qu'il tient en main (un avatar à
  // deux profils tient l'arme de chacun).
  function avatarValues(a,categoryOf,labels,families){
    const tags=a.tags||{};
    const held=Object.fromEntries(Object.entries(PROFILE_LABELS).map(([code,label])=>[norm(label),
      [...new Set(avatars.avatarLook(a,families,code).main.map(w=>labels.has(norm(w))?norm(w):categoryOf.get(norm(w))).filter(Boolean))].map(norm)]));
    return {
      held,ascendanceOnly:Boolean(a.ascendanceOnly),
      culture:(tags.culture||[]).map(norm),
      profile:(tags.profile||[]).map(p=>norm(PROFILE_LABELS[p]||p)),
      weapon:[...new Set((tags.weapon||[]).map(w=>labels.has(norm(w))?norm(w):categoryOf.get(norm(w))).filter(Boolean))].map(norm),
      magic:(tags.magic||[]).map(norm),
      ascendance:(tags.ascendance||[]).map(norm)
    };
  }

  // generator : générateur du jeu (createMercenary).
  function createCoverage({reference,catalog:rows=[],generator,samples=300}){
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
    const weaponFamilies=avatars.weaponFamilies(weapons);
    const need=constant(reference,"avatars.coverage.need",100);
    const peoples=(reference?.peoples?.rows||[]).map(r=>r.nom);

    function forPeople(people){
      const own=rows.filter(a=>norm(a.people)===norm(people));
      const demand=Object.fromEntries(FAMILIES.map(f=>[f,new Map()]));
      const combos=new Map(),cultures=new Map();
      let withoutAvatar=0;
      for(let i=0;i<samples;i++){
        const m=generator.createMercenary({id:i+1,forcedPeople:people});
        const tags=avatars.avatarTags(m,weaponFamilies);
        if(!own.some(a=>avatars.scoreAvatar(a,tags,weaponFamilies)!==null)) withoutAvatar++;
        const values=mercenaryValues(m,categoryOf,magicNames);
        for(const f of FAMILIES) if(f!=="ascendance") for(const v of values[f]) demand[f].set(v,(demand[f].get(v)||0)+1);
        const look=lookOf(m,categoryOf,magicNames,weaponFamilies);
        const profile=PROFILE_LABELS[look.profile]||look.profile;
        const key=[m.culture,profile,look.value].join("|");
        if(!combos.has(key)) combos.set(key,{culture:m.culture,profile,kind:look.kind,value:look.value,n:0});
        combos.get(key).n++;
        if(!cultures.has(m.culture)) cultures.set(m.culture,{n:0,profiles:new Map()});
        const c=cultures.get(m.culture);
        c.n++;
        c.profiles.set(profile,(c.profiles.get(profile)||0)+1);
      }
      for(const [ascendance,share] of ancestryShares(reference,people)) demand.ascendance.set(ascendance,share*samples);
      const tagged=own.map(a=>avatarValues(a,categoryOf,labels,weaponFamilies));
      const families={};
      for(const f of FAMILIES){
        families[f]=[...demand[f].entries()].map(([value,n])=>{
          const share=n/samples;
          const target=Math.round(share*need);
          const count=f==="ascendance"&&value===NO_ASCENDANCE?tagged.filter(t=>!t.ascendance.length||!t.ascendanceOnly).length
            :tagged.filter(t=>t[f].includes(norm(value))).length;
          return {value,share,target,avatars:count,gap:Math.max(0,target-count)};
        }).sort((a,b)=>b.gap-a.gap||b.share-a.share);
      }
      // Combinaisons : avatars qui ont la culture, le profil et l'arme (sa catégorie) ou l'école.
      const combinations=[...combos.values()].map(c=>{
        const share=c.n/samples;
        const target=Math.round(share*need);
        const count=tagged.filter(t=>t.culture.includes(norm(c.culture))&&t.profile.includes(norm(c.profile))
          &&c.value&&(c.kind==="weapon"?t.held[norm(c.profile)]||[]:t.magic).includes(norm(c.value))).length;
        return {culture:c.culture,profile:c.profile,kind:c.kind,value:c.value,share,target,avatars:count,gap:Math.max(0,target-count)};
      }).sort((a,b)=>b.share-a.share||b.gap-a.gap);
      // Ascendances × cultures : les cultures dans l'ordre de leur part, l'ascendance « Aucune » d'abord.
      const cultureOrder=[...cultures.entries()].sort((a,b)=>b[1].n-a[1].n).map(([culture,c])=>({culture,share:c.n/samples}));
      const ascendanceCultures={
        cultures:cultureOrder,
        rows:[...ancestryShares(reference,people).entries()].map(([ascendance,share])=>({
          ascendance,share,
          cells:cultureOrder.map(c=>{
            const cellShare=share*c.share;
            const target=cellShare>0?Math.max(1,Math.round(cellShare*need)):0;
            const count=tagged.filter(t=>t.culture.includes(norm(c.culture))&&(ascendance===NO_ASCENDANCE
              ?!t.ascendance.length||!t.ascendanceOnly:t.ascendance.includes(norm(ascendance)))).length;
            return {culture:c.culture,share:cellShare,target,avatars:count,gap:Math.max(0,target-count)};
          })
        }))
      };
      // Profils par culture : part dans la culture, et, par case culture × profil, cible et avatars qui ont les deux tags.
      const cultureProfiles=[...cultures.entries()].map(([culture,c])=>({
        culture,share:c.n/samples,
        profiles:Object.fromEntries(Object.values(PROFILE_LABELS).map(label=>[label,(c.profiles.get(label)||0)/c.n])),
        cells:Object.values(PROFILE_LABELS).map(label=>{
          const share=(c.profiles.get(label)||0)/samples;
          const target=Math.round(share*need);
          const count=tagged.filter(t=>t.culture.includes(norm(culture))&&t.profile.includes(norm(label))).length;
          return {profile:label,share,target,avatars:count,gap:Math.max(0,target-count)};
        })
      })).sort((a,b)=>b.share-a.share);
      const sources={git:own.filter(a=>!String(a.full).startsWith("/")).length,hostinger:own.filter(a=>String(a.full).startsWith("/")).length};
      return {
        people,need,avatars:own.length,sources,
        femmes:own.filter(a=>a.sex==="femme").length,
        hommes:own.filter(a=>a.sex==="homme").length,
        sansSexe:own.filter(a=>!a.sex).length,
        sansTags:own.filter(a=>!Object.keys(a.tags||{}).length).length,
        status:status(own.length,need),
        withoutAvatar:withoutAvatar/samples,
        families,combinations,cultureProfiles,ascendanceCultures
      };
    }

    return {peoples,need,forPeople};
  }

  return {createCoverage,status,ancestryShares,FAMILIES,PROFILE_LABELS,NO_ASCENDANCE};
});
