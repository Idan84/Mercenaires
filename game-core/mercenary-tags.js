"use strict";

// Tags de la fiche mercenaire, phase 1 (Idan, 2026-11-12 ; doc 20) : « Ce qui compte, c'est qu'il puisse retrouver
// rapidement, dans sa compagnie, qui doit faire quoi. » Trois colonnes (Occupations principales, Équipement, Rôle au
// combat), des tags, des sous-tags et des sous-sous-tags ; « Tous les tags sont cochables (on peut taguer juste
// animal) » ; « Les sous tags allument les tags » ; éteindre un tag éteint ses sous-tags. Aucun tag n'en exclut un
// autre. L'arbre vient de data/reference/mercenary-tags.json ; ses listes « source » sont tirées des données du jeu.
// Identifiant d'un tag : son chemin (« role/degats/tranchant ») ; un mercenaire garde la liste de ses tags allumés
// (member.tags). Aucune règle de jeu ne lit les tags.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesTags=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const slug=name=>String(name||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase()
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  const rowsOf=table=>Array.isArray(table?.rows)?table.rows:[];
  const unique=list=>[...new Set(list.filter(Boolean))];
  // « ordre » d'abord, puis les autres dans l'ordre des données.
  function ordered(names,order=[]){
    const rank=new Map(order.map((name,i)=>[name,i]));
    return unique(names).map((name,i)=>({name,i})).sort((a,b)=>(rank.get(a.name)??order.length+a.i)-(rank.get(b.name)??order.length+b.i)).map(x=>x.name);
  }
  const matches=(code,patterns)=>patterns.some(p=>p.endsWith("*")?String(code).startsWith(p.slice(0,-1)):code===p);

  // Les listes tirées des données : des noms, et parfois des enfants par nom.
  const SOURCES={
    // Les factions des ordres de ces missions (Camps : celles de « Faire le ménage » ; Chasses : les bêtes).
    missions(spec,ref){
      const codes=spec.missions||[];
      return unique(rowsOf({rows:ref.oneShotMissions?.ordres}).filter(o=>matches(o.mission,codes)).map(o=>o.faction)).map(name=>({nom:name}));
    },
    // Ce que travaillent les bâtiments du camp et leurs salles d'école ; sous une école, ses sorts ; sous une famille
    // d'animaux, ses montures (à apprivoiser).
    entrainements(spec,ref){
      const buildings=rowsOf(ref.campBuildings);
      const names=[...buildings.map(b=>b.entraine),...buildings.map(b=>b.ecole),...(spec.aussi||[])];
      return ordered(names,spec.ordre).map(name=>{
        const spells=rowsOf(ref.spells).filter(s=>s.ecole===name).map(s=>s.nom);
        const mounts=rowsOf(ref.mounts).filter(m=>m.espece===name).map(m=>m.nom);
        const children=spells.length?spells:mounts;
        return children.length?{nom:name,enfants:children}:{nom:name};
      });
    },
    // Les familles de compétences martiales qui ont des armes (weapons.json), et leurs armes.
    armes(spec,ref){
      const weapons=new Set(rowsOf(ref.weapons).map(w=>w.nom));
      const skills=rowsOf(ref.skills);
      const families=skills.filter(s=>!s.parent&&skills.some(w=>w.parent===s.nom&&weapons.has(w.nom))).map(s=>s.nom);
      return ordered(families,spec.ordre).map(name=>({nom:name,enfants:skills.filter(w=>w.parent===name&&weapons.has(w.nom)).map(w=>w.nom)}));
    },
    // Les classes d'armure et leurs armures ; celles de « a_plat » directement (Vêtements).
    armures(spec,ref){
      const armors=rowsOf(ref.baseArmors),flat=new Set(spec.a_plat||[]);
      const classes=ordered(armors.map(a=>a.type_armure),spec.ordre);
      return classes.flatMap(type=>{
        const names=armors.filter(a=>a.type_armure===type).map(a=>a.nom);
        return flat.has(type)?names.map(name=>({nom:name})):[{nom:type,enfants:names}];
      });
    },
    // Tout ce qu'un objet peut augmenter.
    bonus(spec,ref){
      const tables=["rings","amulets","belts","capes","gloves","helmets","pants","boots"].flatMap(key=>rowsOf(ref[key]).map(r=>r.caracteristique));
      const weapons=rowsOf(ref.weapons).flatMap(w=>[w.bonus_caracteristique,w.aura_caracteristique]);
      return ordered([...tables,...weapons],spec.ordre).map(name=>({nom:name}));
    },
    ecoles(spec,ref){
      return ordered(rowsOf(ref.skills).filter(s=>s.domaine==="Magie"&&!s.parent).map(s=>s.nom),spec.ordre).map(name=>({nom:name}));
    },
    animaux(spec,ref){
      const mounts=rowsOf(ref.mounts);
      return ordered(mounts.map(m=>m.espece),spec.ordre).map(name=>({nom:name,enfants:mounts.filter(m=>m.espece===name).map(m=>m.nom)}));
    }
  };

  function buildNode(spec,parentId,ref){
    const node=typeof spec==="string"?{nom:spec}:spec;
    const id=parentId+"/"+slug(node.nom);
    const children=node.source?(SOURCES[node.source]?.(node,ref)||[]):(node.enfants||[]);
    return {id,nom:node.nom,enfants:children.map(child=>buildNode(child,id,ref))};
  }

  function createTagRules({reference}={}){
    const ref=reference||{};
    const columns=(ref.mercenaryTags?.colonnes||[]).map(col=>({
      code:col.code,nom:col.nom,teinte:col.teinte,
      tags:(col.tags||[]).map(tag=>buildNode(tag,col.code,ref))
    }));
    const byId=new Map();
    const walk=(node,depth)=>{ byId.set(node.id,{node,depth}); node.enfants.forEach(child=>walk(child,depth+1)); };
    for(const col of columns) col.tags.forEach(tag=>walk(tag,1));

    const has=id=>byId.has(id);
    // Les parents d'un tag (pas la colonne).
    const ancestors=id=>{
      const parts=String(id).split("/"),out=[];
      for(let i=2;i<parts.length;i++) out.push(parts.slice(0,i).join("/"));
      return out;
    };
    // Les tags connus, sans doublon, dans l'ordre de l'arbre ; un tag allumé allume ses parents.
    function normalize(tags){
      const on=new Set();
      for(const id of Array.isArray(tags)?tags:[]) if(has(id)){ on.add(id); ancestors(id).forEach(a=>on.add(a)); }
      return [...byId.keys()].filter(id=>on.has(id));
    }
    const isOn=(tags,id)=>Array.isArray(tags)&&tags.includes(id);
    // Allumer : le tag et ses parents. Éteindre : le tag et tous ses sous-tags.
    function toggle(tags,id){
      if(!has(id)) return normalize(tags);
      const current=normalize(tags);
      if(current.includes(id)) return current.filter(t=>t!==id&&!t.startsWith(id+"/"));
      return normalize([...current,id]);
    }
    function toggleMemberTag(member,id){
      if(!member||!has(id)) return {ok:false,reason:"Tag inconnu."};
      member.tags=toggle(member.tags,id);
      return {ok:true,on:member.tags.includes(id),tags:member.tags};
    }
    return {intro:ref.mercenaryTags?.intro||"",columns,has,node:id=>byId.get(id)?.node||null,depth:id=>byId.get(id)?.depth||0,ancestors,normalize,isOn,toggle,toggleMemberTag};
  }

  return {createTagRules,slug};
});
