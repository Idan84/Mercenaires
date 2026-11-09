"use strict";

// Le Mémorial (Idan, 2026-11-09 : « plus un bâtiment souvenir. Il est là dès le début. On y retrouve le portrait de tous
// ceux qui sont décédés au sein de la compagnie. Quand on clique dessus, on voit l'avatar complet avec sa date de décès, la
// cause de son décès (un peu drôle, c'est mieux !) et un épitaphe délirant ») : capacité illimitée, pas les animaux.
// Chaque mort y entre une fois : le jour, la cause (ce qui l'a fait tomber : nature, tueur, arme ou sort), la tournure de
// la cause et l'épitaphe tirées une fois pour toutes (jamais deux fois la même épitaphe dans une partie), et sa fiche
// réduite à ce que la galerie montre (nom, peuple, avatar, historique). Textes : data/reference/memorial.json.
// État : state.company.memorial (la liste des morts en duel de la désertion y était déjà).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesMemorial=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  // Ce que la galerie garde de la fiche (une fiche complète pèse ~18 Ko ; la sauvegarde en garde des centaines).
  const PROFILE_KEYS=["id","name","firstName","familyName","sex","role","people","culture","origin","alignment","ascendance",
    "ascendanceLevel","ascendanceLevelName","age","domain","reputation","avatar","contract","history"];
  // Les natures où un tueur est nommé ; sans tueur connu : <nature>_seul, sinon unknown.
  const KILLER_KINDS=new Set(["melee","ranged","charge","countercharge","opportunity","fleeing","backstab","spell","spell_feu",
    "spell_froid","spell_foudre","poison","curse","raised","raised_friendly","friendly","duel"]);

  const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
  function profileOf(m){
    const out={};
    for(const key of PROFILE_KEYS) if(m?.[key]!==undefined) out[key]=clone(m[key]);
    return out;
  }
  const isFemale=m=>String(m?.sex||"").trim().toLowerCase().startsWith("f");
  // {a|b} : masculin|féminin ; {cle} : la valeur ; {Cle} : la valeur avec une majuscule (comme recruit-dialogue.js).
  function fill(template,vars={},female=false){
    return String(template||"").replace(/\{([^{}]*)\}/g,(all,key)=>{
      if(key.includes("|")){ const [masculine,feminine]=key.split("|"); return female?feminine:masculine; }
      const name=key.charAt(0).toLowerCase()+key.slice(1);
      if(!(name in vars)) return all;
      const value=String(vars[name]);
      return key===name?value:value.charAt(0).toUpperCase()+value.slice(1);
    });
  }

  function createMemorialRules({reference,random=Math.random}={}){
    const copy=reference?.memorial||{};
    const causes=copy.causes||{};
    const epitaphs=Array.isArray(copy.epitaphs)?copy.epitaphs:[];
    const feminine=new Set(copy.feminins||[]);
    const pick=n=>n>0?Math.min(n-1,Math.floor(random()*n)):0;

    // La liste, du plus ancien au plus récent ; les entrées d'avant (cause en texte : « duel ») gardent leur sens.
    function entries(state){
      const company=state?.company;
      if(!company) return [];
      const list=company.memorial||(company.memorial=[]);
      for(const entry of list) if(typeof entry.cause==="string"||!entry.cause) entry.cause={kind:entry.cause||"unknown"};
      return list;
    }
    function deaths(state){ return entries(state).length; }
    function entryOf(state,id){ return entries(state).find(e=>String(e.id)===String(id))||null; }

    // La nature retenue pour les textes : celle de la cause si elle a ses tournures, sinon la famille (spell_feu → spell),
    // sans tueur connu <nature>_seul, et en dernier recours unknown.
    function causeKind(cause){
      const kind=String(cause?.kind||"unknown");
      const killer=Boolean(cause?.by?.name);
      const base=kind.startsWith("spell_")&&kind!=="spell_fumble"&&!causes[kind]?"spell":kind;
      if(KILLER_KINDS.has(base)&&!killer){
        const family=base.split("_")[0];
        return causes[base+"_seul"]?base+"_seul":causes[family+"_seul"]?family+"_seul":"unknown";
      }
      return causes[base]?base:"unknown";
    }
    function normalizeCause(cause){
      const out={kind:"unknown",...(typeof cause==="string"?{kind:cause}:cause||{})};
      if(out.by) out.by={name:String(out.by.name||""),proper:Boolean(out.by.proper),friendly:Boolean(out.by.friendly)};
      return out;
    }
    // Une épitaphe pas encore gravée ; toutes prises : n'importe laquelle.
    function pickEpitaph(state){
      if(!epitaphs.length) return null;
      const used=new Set(entries(state).map(e=>e.epitaph).filter(Number.isInteger));
      const free=epitaphs.map((_,i)=>i).filter(i=>!used.has(i));
      const pool=free.length?free:epitaphs.map((_,i)=>i);
      return pool[pick(pool.length)];
    }

    // Il entre au Mémorial (une seule fois) : day, le jour de sa mort ; cause, ce qui l'a fait tomber.
    function record(state,mercenary,{day=state?.day,cause=null}={}){
      if(!state?.company||!mercenary) return null;
      const existing=entryOf(state,mercenary.id);
      if(existing) return existing;
      const normalized=normalizeCause(cause);
      const kind=causeKind(normalized);
      normalized.variant=pick((causes[kind]||[]).length);
      const entry={id:mercenary.id,name:mercenary.name,day:Number(day)||0,cause:normalized,epitaph:pickEpitaph(state),
        profile:profileOf(mercenary)};
      entries(state).push(entry);
      return entry;
    }

    // Le tueur dans une phrase : « un Guerrier orc » (une Goule), ou le nom d'un camarade, sans article.
    function killerWithArticle(by){
      if(!by?.name) return "";
      if(by.proper||by.friendly) return by.name;
      const head=by.name.split(/[\s-]/)[0];
      return (feminine.has(head)||feminine.has(by.name)?"une ":"un ")+by.name;
    }
    // Les textes d'une entrée : la cause, sa ligne de détail (l'arme, le sort) et l'épitaphe.
    function describe(entry){
      const profile=entry?.profile||{};
      const female=isFemale(profile);
      const cause=normalizeCause(entry?.cause);
      const kind=causeKind(cause);
      const list=causes[kind]||[];
      const template=list.length?list[Math.min(list.length-1,Math.max(0,Number(cause.variant)||0))]:"";
      const prenom=profile.firstName||String(profile.name||entry?.name||"").split(/\s+/)[0]||"";
      const vars={prenom,tueur:cause.by?.name||"",un_tueur:killerWithArticle(cause.by)};
      const details=copy.details||{};
      const detail=cause.spell?fill(details.spell,{sort:cause.spell}):cause.weapon?fill(details.weapon,{arme:cause.weapon}):"";
      const epitaph=Number.isInteger(entry?.epitaph)&&epitaphs[entry.epitaph]!==undefined?fill(epitaphs[entry.epitaph],vars,female):"";
      return {kind,cause:fill(template,vars,female),detail,epitaph};
    }

    return {entries,deaths,entryOf,record,describe,causeKind,profileOf};
  }

  return {createMemorialRules,profileOf,fill,PROFILE_KEYS};
});
