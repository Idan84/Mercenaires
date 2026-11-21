"use strict";

// Tags de la fiche mercenaire (Idan, 2026-11-12 ; doc 20) : « Ce qui compte, c'est qu'il puisse retrouver rapidement, dans
// sa compagnie, qui doit faire quoi. » Trois colonnes (Occupations principales, Équipement, Rôle au combat), des tags,
// des sous-tags et des sous-sous-tags ; « Tous les tags sont cochables (on peut taguer juste animal) » ; aucun tag n'en
// exclut un autre. L'arbre vient de data/reference/mercenary-tags.json ; ses listes « source » sont tirées des données du
// jeu. Identifiant d'un tag : son chemin (« role/degats/tranchant »).
// Un tag est allumé ou éteint, sans niveau (Idan, 2026-11-20). Un sous-tag allumé allume ses parents (« Les sous tags
// allument les tags ») ; le clic bascule allumé ↔ éteint, et éteindre un tag éteint ses sous-tags.
// Deux sources sur un mercenaire : member.tags (liste d'identifiants, ce que le joueur a mis) et member.stewardTags (ce que
// l'intendant a mis, marqué d'un point) ; member.stewardRefused : les tags de l'intendant que le joueur a éteints, qu'il ne
// remet plus. Retaguer ne remplace que stewardTags. Aucune règle de jeu ne lit les tags.
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
      return unique((ref.oneShotMissions?.ordres||[]).filter(o=>matches(o.mission,codes)).map(o=>o.faction)).map(name=>({nom:name}));
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
    // Les familles de compétences martiales qui ont des armes (weapons.json), et leurs armes ; sauf : familles rangées
    // ailleurs (les boucliers, sous Style de combat).
    armes(spec,ref){
      const skip=new Set(spec.sauf||[]);
      return ordered(weaponFamilies(ref).filter(f=>!skip.has(f)),spec.ordre).map(name=>({nom:name,enfants:familyWeapons(ref,name)}));
    },
    // Les styles de combat de la fiche (character-sheet-copy.json), renommés (noms) ; sous le Bouclier, les boucliers.
    styles(spec,ref){
      const styles=ref.characterSheetCopy?.skills_layout?.styles_de_combat||[];
      return styles.map(name=>{
        const shields=familyWeapons(ref,name);
        return {nom:spec.noms?.[name]||name,competence:name,...(shields.length?{enfants:shields}:{})};
      });
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
  function familyWeapons(ref,family){
    const weapons=new Set(rowsOf(ref.weapons).map(w=>w.nom));
    return rowsOf(ref.skills).filter(w=>w.parent===family&&weapons.has(w.nom)).map(w=>w.nom);
  }
  function weaponFamilies(ref){
    const skills=rowsOf(ref.skills);
    return skills.filter(s=>!s.parent&&familyWeapons(ref,s.nom).length).map(s=>s.nom);
  }

  function buildNode(spec,parentId,ref){
    const node=typeof spec==="string"?{nom:spec}:spec;
    const id=parentId+"/"+slug(node.nom);
    const children=node.source?(SOURCES[node.source]?.(node,ref)||[]):(node.enfants||[]);
    return {id,nom:node.nom,...(node.competence?{competence:node.competence}:{}),enfants:children.map(child=>buildNode(child,id,ref))};
  }

  function createTagRules({reference}={}){
    const ref=reference||{};
    const columns=(ref.mercenaryTags?.colonnes||[]).map(col=>({
      code:col.code,nom:col.nom,teinte:col.teinte,
      tags:(col.tags||[]).map(tag=>buildNode(tag,col.code,ref))
    }));
    const byId=new Map(),order=[];
    const walk=(node,depth)=>{ byId.set(node.id,{node,depth}); order.push(node.id); node.enfants.forEach(child=>walk(child,depth+1)); };
    for(const col of columns) col.tags.forEach(tag=>walk(tag,1));

    const has=id=>byId.has(id);
    const node=id=>byId.get(id)?.node||null;
    // Les parents d'un tag (pas la colonne).
    const ancestors=id=>{
      const parts=String(id).split("/"),out=[];
      for(let i=2;i<parts.length;i++) out.push(parts.slice(0,i).join("/"));
      return out;
    };
    const descendants=id=>order.filter(t=>t.startsWith(id+"/"));
    // Un tag par nom, sous un parent (« role/degats » + « Tranchant »).
    const childNamed=(parentId,name)=>node(parentId)?.enfants.find(c=>c.nom===name)?.id||null;
    // Une liste propre : les identifiants connus, sans doublon (un tag disparu des données est oublié ; rien si la donnée
    // manque).
    const idsOf=raw=>Array.isArray(raw)?unique(raw.filter(has)):[];
    // Ce que montre la fiche : pour chaque tag allumé, s'il vient de l'intendant (le point) — le joueur l'emporte sur
    // l'intendant ; un tag allumé par ses seuls sous-tags porte le point si tous ceux-là le portent.
    function view(member){
      const own=new Set(idsOf(member?.tags)),refused=new Set(member?.stewardRefused||[]);
      const steward=new Set(idsOf(member?.stewardTags));
      const out={};
      for(const id of [...order].reverse()){
        const mine=own.has(id),his=!refused.has(id)&&steward.has(id);
        const kids=node(id).enfants.map(c=>out[c.id]).filter(Boolean);
        if(!mine&&!his&&!kids.length) continue;
        out[id]={steward:mine?false:his?true:kids.every(k=>k.steward)};
      }
      return out;
    }
    // Le clic : allume un tag éteint ; éteint un tag allumé (lui et ses sous-tags). Éteindre un tag de l'intendant, c'est le
    // refuser : il ne le remettra pas.
    function toggle(member,id){
      if(!member||!has(id)) return {ok:false,reason:"Tag inconnu."};
      const on=!view(member)[id];
      const own=new Set(idsOf(member.tags)),refused=new Set(member.stewardRefused||[]),steward=new Set(idsOf(member.stewardTags));
      if(on){
        own.add(id);
        refused.delete(id);
      }else{
        for(const t of [id,...descendants(id)]){
          own.delete(t);
          if(steward.has(t)) refused.add(t);
        }
      }
      member.tags=order.filter(t=>own.has(t));
      member.stewardRefused=[...refused].filter(has);
      return {ok:true,on};
    }
    // Ce que l'intendant pose (une liste d'identifiants) : remplace ses tags d'avant, garde ceux du joueur et ses refus.
    function setSteward(member,ids){
      if(!member) return;
      member.stewardTags=idsOf(ids);
    }
    // Tous les tags allumés d'un mercenaire, dans l'ordre de l'arbre.
    const litIds=member=>{ const shown=view(member); return order.filter(id=>shown[id]); };
    return {intro:String(ref.mercenaryTags?.intro||""),columns,has,node,childNamed,depth:id=>byId.get(id)?.depth||0,ancestors,
      descendants,idsOf,view,toggle,setSteward,litIds,order};
  }

  return {createTagRules,slug};
});
