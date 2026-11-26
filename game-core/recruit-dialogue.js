"use strict";

// Dialogue de recrutement à la Taverne (Idan, 2026-10-21 ; refonte doc 14 §6 bis, Idan, 2026-11-19 et 2026-11-22) : le
// candidat salue selon son affinité avec le capitaine, puis on ne pose que des questions dont la réponse remplit une case
// de sa fiche (titre, armes, armure, magie, salaire et prime), regroupées sous « Puis-je en savoir plus sur vous ? »,
// toutes au vouvoiement (Idan, 2026-11-22 : « on a un langage décalé presque corporate »). L'aubergiste répond sur son
// titre et son affinité. Textes : data/reference/tavern-dialogue.json ; la négociation
// elle-même reste dans tavern.js (doc 14 §9).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesRecruitDialogue=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  // Les questions sur lui (« Puis-je en savoir plus sur vous ? »), dans l'ordre du menu.
  const ABOUT_QUESTIONS=["title","tags","set1","set2","armor","magic"];

  function isFemale(m){
    return String(m?.sex||"").trim().toLowerCase().startsWith("f");
  }

  function firstName(m){
    return m?.firstName||String(m?.name||"").trim().split(/\s+/)[0]||"";
  }

  function capitalize(text){
    return text?text[0].toLocaleUpperCase("fr")+text.slice(1):text;
  }

  // {masculin|féminin} selon le sexe ; {clé} remplacée par vars.clé ; {Clé} avec une majuscule initiale.
  function fill(template,vars={},female=false){
    return String(template||"").replace(/\{([^{}]*)\}/g,(all,key)=>{
      if(key.includes("|")){
        const [masculine,feminine]=key.split("|");
        return female?feminine:masculine;
      }
      const name=key.charAt(0).toLowerCase()+key.slice(1);
      if(!(name in vars)) return all;
      const value=String(vars[name]);
      return key===name?value:capitalize(value);
    });
  }

  // Choix stable d'une variante : un même mercenaire répond toujours de la même façon.
  function hash(text){
    let h=2166136261;
    for(const ch of String(text)){
      h^=ch.codePointAt(0);
      h=Math.imul(h,16777619);
    }
    return h>>>0;
  }

  function createRecruitDialogue({reference}={}){
    const copy=reference?.tavernDialogue||{};
    const keeper=copy.tavernkeeper||{};
    const weaponForms=new Map((copy.weapons||[]).map(r=>[r.nom,r.avec_article]));
    // Deux armes identiques (Idan, 2026-11-24 : « On met les deux, ça rend les dialogues plus vivants ! ») : « deux
    // nunchakus » ou « un nunchaku dans chaque main », une chance sur deux, stable pour un même mercenaire.
    const weaponPairs=new Map((copy.weapons||[]).map(r=>[r.nom,[r.deux,r.chaque_main].filter(Boolean)]));
    const constant=(code,fallback)=>{
      const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
      return Number.isFinite(value)?value:fallback;
    };
    const AFFINITY_WORD=constant("tavern.affinity_word.threshold",33.3);

    function say(list,m,seed,vars={}){
      const options=Array.isArray(list)?list:[];
      if(!options.length) return "";
      const template=options[hash((m?.id??m?.name)+"|"+seed)%options.length];
      return fill(template,{prenom:firstName(m),...vars},isFemale(m));
    }

    function greeting(m,affinity){
      const a=Math.max(-100,Math.min(100,Math.round(Number(affinity)||0)));
      const row=(copy.greetings||[]).find(r=>a>=r.min&&a<=r.max);
      return row?fill(row.texte,{prenom:firstName(m)},isFemale(m)):"";
    }

    // Ses armes, avec leur article : « l’épée longue et l’écu ».
    function withArticles(names,m=null){
      const list=names||[], pairs=list.length===2&&list[0]===list[1]?weaponPairs.get(list[0])||[]:[];
      if(pairs.length) return pairs[hash((m?.id??m?.name??"")+"|paire|"+list[0])%pairs.length];
      return list.map(name=>weaponForms.get(name)||String(name||"").toLocaleLowerCase("fr")).join(" et ");
    }

    // « de Feu », « d'Eau ».
    function ofSchool(name){
      return (/^[aeiouyàâéèêëîïôöûüh]/i.test(String(name||""))?"d’":"de ")+name;
    }
    // Ses écoles, d'une seule réponse (Idan, 2026-11-22 : « on lui demande s'il connait des sorts, il répond en listant les
    // écoles ») : « d’Eau, de Feu et de Vie ».
    function schoolList(names){
      const parts=(names||[]).map(ofSchool);
      return parts.length>1?parts.slice(0,-1).join(", ")+" et "+parts.at(-1):parts.join("");
    }

    // Les réponses du candidat : title / no_title, set1 / set1_none, set2 / set2_none, armor / armor_clothes /
    // armor_none, magic / no_magic (vars : titre, armes, armure, ecoles).
    function answer(kind,m,vars={}){
      return say(copy.answers?.[kind],m,kind,vars);
    }

    // Répliques : salary, offer, sign, counter, left, accepted, floor, dorm_full, dorm_full_ogre, dorm_full_note ; welcome, la
    // phrase d'accueil du pop-up après la signature, et left_gone, celle du pop-up du départ (Idan, 2026-11-26).
    // seed permet de varier la contre-proposition d'un tour de négociation à l'autre.
    function line(kind,m,vars={},seed=0){
      return say(copy.lines?.[kind],m,kind+"|"+seed,vars);
    }

    // Ce qu'on sait d'un candidat (tavern.candidates[] : {mercenary, …}), gardé sur lui tant qu'il est à la taverne : la
    // fiche garde ce qu'on a appris, une question posée disparaît, une réponse reste figée (doc 14 §6 bis).
    // {asked: {title, tags, set1, set2, armor, magic, steward} (ce qu'on lui a demandé), salary (il a dit ses prétentions), title (le
    // titre qu'il se donne), keeperTitle (celui que donne le tavernier), affinity (l'estimation du tavernier), tags,
    // keeperTags, stewardTags (les noms de ses tags : ce qu'il annonce, ce que dit le tavernier, ce que voit l'intendant)}
    function known(candidate){
      const k=candidate.recruitKnown||(candidate.recruitKnown={});
      k.asked=k.asked||{};
      return k;
    }
    // Les questions qu'il reste à lui poser sur lui.
    function aboutLeft(k){
      return ABOUT_QUESTIONS.filter(key=>!k.asked?.[key]);
    }
    // Le titre sur sa fiche : celui du tavernier d'abord (Idan, 2026-11-22 : « priorité au tavernier »), sinon le sien ;
    // null tant qu'on ne sait rien.
    function shownTitle(k){
      return k.keeperTitle??k.title??null;
    }
    // Ses tags sur sa fiche (Idan, 2026-11-24 : « tes suggestions sont parfaites ») : la source la plus fiable qu'on ait,
    // l'intendant, puis le tavernier, puis ce qu'il annonce lui-même ; {source, names}, ou null tant qu'on ne sait rien.
    function shownTags(k){
      for(const [source,names] of [["steward",k.stewardTags],["keeper",k.keeperTags],["candidate",k.tags]])
        if(Array.isArray(names)) return {source,names};
      return null;
    }
    // D'où viennent ses tags, en quelques mots (« D'après le tavernier »).
    function tagSourceLabel(source,m){
      return fill(copy.tag_sources?.[source],{},isFemale(m));
    }
    // Une liste de tags dite à voix haute : « Veinard, Roc et Éclaireur ».
    function listNames(names){
      const list=(names||[]).filter(Boolean);
      return list.length>1?list.slice(0,-1).join(", ")+" et "+list.at(-1):list[0]||"";
    }
    // L'intendant donne son avis sur un candidat : l'option du menu, sa question, sa réponse.
    function stewardOption(){ return copy.steward?.option||""; }
    function stewardAsk(steward){ return fill(copy.steward?.ask,{intendant:firstName(steward)}); }
    function stewardAnswer(steward,m,names){
      return names.length?say(copy.steward?.answers,m,"steward|"+(steward?.id??steward?.name),{tags:listNames(names)})
        :say(copy.steward?.none,m,"steward-none");
    }

    // L'affinité en un mot, chacun pour un tiers de l'échelle (doc 14 §7) : Hostile, Neutre, Amical.
    function affinityWord(points){
      const p=Number(points)||0;
      return p<-AFFINITY_WORD?"Hostile":p>AFFINITY_WORD?"Amical":"Neutre";
    }

    // Le candidat tel qu'on le décrit (doc 14 §7) : ses capacités (caractéristiques, résistances, compétences) passées par
    // estimate(valeur) — sa vantardise, ou la précision de l'aubergiste —, arrondies. Le reste ne change pas.
    function described(m,estimate){
      const scale=obj=>Object.fromEntries(Object.entries(obj||{}).map(([key,value])=>[key,
        typeof value==="number"?Math.round(estimate(value)):value&&typeof value==="object"&&!Array.isArray(value)?scale(value):value]));
      return {...m,stats:scale(m.stats),resistances:scale(m.resistances),skills:scale(m.skills)};
    }

    // Répliques de l'aubergiste : greeting, ask_who, nobody, ask_what, no_gold, title, no_title (m : candidat dont on
    // parle).
    function keeperLine(key,vars={},m=null){
      return fill(keeper[key],{...(m?{prenom:firstName(m)}:{}),...vars},isFemale(m));
    }
    // Ses deux questions sur un candidat (title, affinity) et ses réponses.
    function keeperQuestion(kind,m){
      return fill(keeper.questions?.[kind],{prenom:firstName(m)},isFemale(m));
    }
    function keeperAnswer(kind,m,vars={}){
      return say(keeper.answers?.[kind],m,"keeper|"+kind,vars);
    }

    return {
      keeper,
      keeperLine,
      keeperQuestion,
      keeperAnswer,
      questions:copy.questions||{},
      aboutQuestions:ABOUT_QUESTIONS.slice(),
      ofSchool,
      schoolList,
      withArticles,
      greeting,
      answer,
      line,
      known,
      aboutLeft,
      shownTitle,
      shownTags,
      tagSourceLabel,
      listNames,
      stewardOption,
      stewardAsk,
      stewardAnswer,
      affinityWord,
      described
    };
  }

  return {createRecruitDialogue,fill,firstName};
});
