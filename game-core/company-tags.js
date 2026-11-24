"use strict";

// Les tags des mercenaires dans le jeu (doc 20 §12 ; Idan, 2026-11-22 : « le tagging est fait automatiquement à chaque
// update du mercenaire »). Les tests de l'atelier (game-core/tag-engine.js), sur des valeurs vues à travers un biais :
// - le candidat se décrit lui-même (il se vante) : toutes ses capacités × un tirage entre 1,10 et 3,00, une fois par
//   candidat ;
// - l'intendant décrit nos mercenaires (le capitaine compris) : une erreur tirée pour chaque couple intendant /
//   mercenaire, sa taille entre 0 et l'erreur au plus de l'intendant, son sens selon son affinité et l'écart d'étoiles ;
//   gardée sur le mercenaire (tagBias) tant qu'il ne change pas d'étoile et qu'on ne change pas d'intendant.
// « Le meilleur de la compagnie » se compare sur ce que l'intendant voit, chacun avec son biais. Sans intendant, personne
// ne décrit nos mercenaires : aucun tag (Idan, 2026-11-22). Celui qui n'a aucun tag reçoit un tag de consolation (Idan,
// 2026-11-24 ; data/reference/tag-consolation.json). Un seul tag devient son titre (titleTag) ; plusieurs : un titre
// composé (tagTitle). Les constantes : data/reference/formula-constants.json
// (tags.*). Le hasard est donné (random).
(function(root,factory){
  const engine=typeof module!=="undefined"&&module.exports?require("./tag-engine.js"):root.MercenairesTagEngine;
  const api=factory(engine);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesCompanyTags=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Engine){
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  // Ce qui reçoit le biais (doc 20 §12) : les capacités (caractéristiques, réserve de mana comprise, compétences et écoles
  // de magie, résistances, Précision, Puissance au tir, Dextérité + Vitesse, chances de réussite des sorts, Discrétion,
  // PM). Pas les oui / non, les noms, les nombres de sorts, les coûts en mana, les durées ni les étoiles.
  // Les auras et les bonus des sorts aussi (Idan, 2026-11-22 : « Oui »).
  const BIASED_PREFIXES=["carac.","res.","comp.","ecole.","chance.","aura.","bonus."];
  const BIASED_KEYS=new Set(["mana","tir.precision","tir.puissance","tir.dex_vit","moy.chance.soin","pm"]);
  const isBiased=(key,value)=>typeof value==="number"&&(BIASED_KEYS.has(key)||BIASED_PREFIXES.some(p=>key.startsWith(p)));
  // Ce qui change les variables d'un mercenaire (pour ne les recalculer que quand il change).
  const signature=c=>JSON.stringify([c.stats,c.resistances,c.skills,c.items,c.equipment,c.spells,c.reputation,c.pvMax,c.mana,
    c.people,c.culture,c.origin,c.alignment,c.ascendance,c.ascendanceLevel,c.domain,c.name]);

  // reference : les tables du jeu ; workshop : l'atelier (tags, tests, constantes) ; variables : createTagVariables ;
  // stars : les règles des étoiles ; affinity : les règles d'affinité.
  function createCompanyTags({reference,workshop,variables,stars=null,affinity=null,random=Math.random}={}){
    const constant=(code,fallback)=>{
      const value=Number(rows(reference?.formulaConstants).find(r=>r.code===code)?.valeur);
      return Number.isFinite(value)?value:fallback;
    };
    const C={
      candidateMin:constant("tags.candidate.min",1.1),
      candidateMax:constant("tags.candidate.max",3),
      intendanceWeight:constant("tags.steward.intendance_weight",0.75),
      intelligenceWeight:constant("tags.steward.intelligence_weight",0.25),
      defaultIntelligence:constant("tags.steward.default_intelligence",50),
      maxError:constant("tags.steward.max_error",0.5),
      exponent:constant("tags.steward.exponent",1.5),
      starsGap:constant("tags.steward.stars_gap",5),
      affinityWeight:constant("tags.steward.affinity_weight",0.25),
      starsWeight:constant("tags.steward.stars_weight",0.25),
      oldStewardAffinity:constant("tags.steward.old_steward_affinity",0)
    };
    const doc=Engine.clean(workshop||{});
    const tree=Engine.createTagTree(doc);
    // Les tags de consolation (Idan, 2026-11-24 : « Ceux qui ont aucun tag en gagnent un au hasard parmi ces 8 ! Bravo à
    // eux ! ») : data/reference/tag-consolation.json. Celui qui n'a aucun tag affiché en reçoit un, tiré une fois et gardé
    // sur lui (tagConsolation : le mercenaire, ou le candidat de la Taverne) ; il ne s'affiche que tant qu'il n'a aucun
    // autre tag.
    const CONSOLATION=rows(reference?.tagConsolation).filter(r=>r&&r.nom);
    function consolation(holder,res){
      if(!holder||res.affiches.length||!CONSOLATION.length) return res;
      let i=holder.tagConsolation;
      if(!Number.isInteger(i)||i<0||i>=CONSOLATION.length) i=holder.tagConsolation=Math.floor(random()*CONSOLATION.length);
      const r=CONSOLATION[i];
      const tag={id:"consolation-"+(r.code||i),nom:String(r.nom),parents:[],groupe:false,note:"",rang:null,garder:null,inactif:false,consolation:true};
      return {...res,affiches:[tag]};
    }

    // Les valeurs exactes d'un mercenaire (équipement compris ; role : capitaine, lieutenant ou rien), recalculées seulement
    // quand il change.
    const cache=new WeakMap();
    function valuesOf(c,role=""){
      const sig=signature(c)+"|"+role, hit=cache.get(c);
      if(hit&&hit.sig===sig) return hit.values;
      const values=variables.of(c,{role});
      cache.set(c,{sig,values});
      return values;
    }
    // Les valeurs vues : les capacités × facteur ; le nombre de soins suit la réserve de mana vue.
    function seen(values,factor){
      if(factor===1) return values;
      const out={...values};
      for(const [key,value] of Object.entries(values)) if(isBiased(key,value)) out[key]=value*factor;
      const cost=Number(values["moy.cout.soin"]);
      if(cost>0&&Number.isFinite(out["carac.reserve_de_mana"])) out["lancers.soin"]=Math.floor(out["carac.reserve_de_mana"]/cost);
      return out;
    }

    // L'intendant : sa compétence (0 à 100) et son erreur au plus.
    function stewardCompetence(steward){
      const intendance=Number(steward?.skills?.camp?.Intendance)||0;
      const iq=Number(steward?.stats?.Intelligence);
      return clamp(C.intendanceWeight*intendance+C.intelligenceWeight*(Number.isFinite(iq)?iq:C.defaultIntelligence),0,100);
    }
    const maxError=steward=>C.maxError*Math.pow(1-stewardCompetence(steward)/100,C.exponent);
    // Le tirage d'un couple intendant / mercenaire : la taille (de 0 à l'erreur au plus) puis le sens (surestimer avec la
    // chance P).
    function drawStewardBias({steward,mercStars=1,companyStars=1,affinityPoints=0}){
      const size=random()*maxError(steward);
      const R=clamp((mercStars-companyStars)/C.starsGap,-1,1);
      const p=0.5+C.affinityWeight*clamp(Number(affinityPoints)||0,-100,100)/100+C.starsWeight*R;
      return {size,sign:random()<p?1:-1};
    }
    const starsOf=m=>Number(stars?.personal?.(m?.reputation)?.level)||1;
    // Le biais d'un mercenaire, gardé sur lui (m.tagBias) ; refait quand l'intendant change ou qu'il change d'étoile.
    function stewardBias(m,{steward,companyStars=1}={}){
      if(!steward||!m) return null;
      const key=String(steward.id??steward.name??""), level=starsOf(m), b=m.tagBias;
      if(b&&b.steward===key&&b.stars===level&&Number.isFinite(b.size)&&(b.sign===1||b.sign===-1)) return b;
      const points=steward.npc?C.oldStewardAffinity:Number(affinity?.affinity?.(steward,m)?.total)||0;
      const d=drawStewardBias({steward,mercStars:level,companyStars,affinityPoints:points});
      return (m.tagBias={steward:key,stars:level,size:d.size,sign:d.sign});
    }
    const factorOf=b=>b?1+b.sign*b.size:1;

    // Ce que l'intendant voit de chaque membre (le capitaine et les mercenaires) : Map membre → valeurs vues.
    // roleOf(m) : « capitaine », « lieutenant » ou rien.
    function company({members=[],steward=null,companyStars=1,roleOf=()=>""}={}){
      const out=new Map();
      for(const m of members) out.set(m,seen(valuesOf(m,roleOf(m)||""),factorOf(stewardBias(m,{steward,companyStars}))));
      return out;
    }
    const others=(view,members,self)=>members.filter(x=>x!==self).map(x=>view.get(x)).filter(Boolean);
    // Les tags d'un membre : {affiches, restent, motif, reps} (tag-engine). view : company(), à réutiliser pour toute la
    // compagnie.
    function tagsOf(m,{members=[],steward=null,companyStars=1,roleOf=()=>"",view=null}={}){
      // Sans intendant, aucun tag (Idan, 2026-11-22 : « Sans intendant […] aucun tag s'affiche »).
      if(!steward) return {affiches:[],restent:[],motif:new Map(),reps:[]};
      const v=view||company({members,steward,companyStars,roleOf});
      const mine=v.get(m)||seen(valuesOf(m,roleOf(m)||""),factorOf(stewardBias(m,{steward,companyStars})));
      return consolation(m,tree.tags(Engine.withCompany(mine,others(v,members,m),companyStars)));
    }
    // Un personnage décrit par un autre (le tavernier qui estime un candidat, recruit-dialogue.js described) : ses tags sur
    // ces valeurs, comparés à la compagnie telle que l'intendant la voit ; holder garde son tag de consolation.
    function describedTags(character,holder,{members=[],steward=null,companyStars=1,roleOf=()=>"",view=null}={}){
      const v=view||company({members,steward,companyStars,roleOf});
      return consolation(holder,tree.tags(Engine.withCompany(valuesOf(character),others(v,members,null),companyStars)));
    }
    // Un candidat vu par notre intendant (Idan, 2026-11-24 : « Pour l'intendant, branche-le comme une option de dialogue ») :
    // son biais, comme pour nos mercenaires (tiré pour le couple intendant / candidat et gardé sur lui, tagBias), comparé à
    // la compagnie telle que l'intendant la voit. Sans intendant, rien.
    function stewardCandidateTags(candidate,{members=[],steward=null,companyStars=1,roleOf=()=>"",view=null}={}){
      if(!steward||!candidate?.mercenary) return {affiches:[],restent:[],motif:new Map(),reps:[]};
      const v=view||company({members,steward,companyStars,roleOf}), m=candidate.mercenary;
      const mine=seen(valuesOf(m),factorOf(stewardBias(m,{steward,companyStars})));
      return consolation(candidate,tree.tags(Engine.withCompany(mine,others(v,members,null),companyStars)));
    }
    // Le candidat (tavern.candidates[] : {mercenary, …}) : son tirage, gardé sur lui (tagSelfBias).
    function candidateFactor(candidate){
      if(!Number.isFinite(candidate.tagSelfBias)) candidate.tagSelfBias=C.candidateMin+random()*(C.candidateMax-C.candidateMin);
      return candidate.tagSelfBias;
    }
    // Ses tags tels qu'il les annonce, comparés à la compagnie telle que l'intendant la voit.
    function candidateTags(candidate,{members=[],steward=null,companyStars=1,roleOf=()=>"",view=null}={}){
      const v=view||company({members,steward,companyStars,roleOf});
      const mine=seen(valuesOf(candidate.mercenary),candidateFactor(candidate));
      return consolation(candidate,tree.tags(Engine.withCompany(mine,others(v,members,null),companyStars)));
    }
    // Son titre composé à partir de ses tags affichés (Idan, 2026-11-24 ; tag-engine.js, composeTitle) : shown, le résultat
    // de tagsOf / candidateTags / describedTags, ou une liste de tags ou d'identifiants. → {name, tags, speciaux} ou null.
    const parId=new Map(doc.tags.map(t=>[t.id,t]));
    function tagTitle(shown){
      const list=Array.isArray(shown)?shown:(shown?.affiches||[]);
      const tags=list.map(t=>parId.get(typeof t==="string"?t:t?.id)||(t&&typeof t==="object"&&t.nom?t:null)).filter(Boolean);
      return Engine.composeTitle(doc,tags);
    }
    return {constants:C,doc,tree,consolations:CONSOLATION,isBiased,valuesOf,seen,stewardCompetence,maxError,drawStewardBias,stewardBias,factorOf,company,
      tagsOf,candidateFactor,candidateTags,describedTags,stewardCandidateTags,titleTag,tagTitle};
  }

  // Le titre (Idan, 2026-11-24 : « S'il a un seul tag, son titre devient le tag ») : un seul tag affiché, tag de
  // consolation compris, devient son titre (son nom, et sa note en infobulle) ; plusieurs : le titre composé (tagTitle) ;
  // aucun (pas d'intendant) : le titre calculé (doc 19). res : tagsOf, candidateTags ou describedTags.
  function titleTag(res){
    const shown=res?.affiches||[];
    return shown.length===1?shown[0]:null;
  }

  return {createCompanyTags,isBiased,titleTag};
});
