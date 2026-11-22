"use strict";

// Dialogue de recrutement à la Taverne (Idan, 2026-10-21 ; refonte doc 14 §6 bis, Idan, 2026-11-19 et 2026-11-22) : le
// candidat salue selon son affinité avec le capitaine, puis on ne pose que des questions dont la réponse remplit une case
// de sa fiche (titre, armes, armure, magie, salaire et prime), regroupées sous « Puis-je en savoir plus sur vous ? ».
// L'aubergiste répond sur son titre et son affinité. Textes : data/reference/tavern-dialogue.json ; la négociation
// elle-même reste dans tavern.js (doc 14 §9).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesRecruitDialogue=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  // Les questions sur lui (« Puis-je en savoir plus sur vous ? »), dans l'ordre du menu.
  const ABOUT_QUESTIONS=["title","set1","set2","armor","magic"];

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
    const constant=(code,fallback)=>{
      const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
      return Number.isFinite(value)?value:fallback;
    };
    const AFFINITY_WORD=constant("tavern.affinity_word.threshold",33.3);
    // Les écoles de magie, une question par école (« Connais-tu des sorts de [école] ? »).
    const SCHOOLS=[...new Set((reference?.spells?.rows||[]).map(r=>r.ecole).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fr"));

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
    function withArticles(names){
      return (names||[]).map(name=>weaponForms.get(name)||String(name||"").toLocaleLowerCase("fr")).join(" et ");
    }

    // « de Feu », « d'Eau ».
    function ofSchool(name){
      return (/^[aeiouyàâéèêëîïôöûüh]/i.test(String(name||""))?"d’":"de ")+name;
    }
    function schoolQuestion(name){
      return fill(copy.questions?.school,{ecole:ofSchool(name)});
    }

    // Les réponses du candidat : title / no_title, set1 / set1_none, set2 / set2_none, armor / armor_none,
    // school_yes / school_no (vars : titre, armes, armure, ecole).
    function answer(kind,m,vars={}){
      return say(copy.answers?.[kind],m,kind,vars);
    }

    // Répliques : salary, offer, sign, counter, left, accepted, floor, dorm_full, dorm_full_ogre, dorm_full_note.
    // seed permet de varier la contre-proposition d'un tour de négociation à l'autre.
    function line(kind,m,vars={},seed=0){
      return say(copy.lines?.[kind],m,kind+"|"+seed,vars);
    }

    // Ce qu'on sait d'un candidat (tavern.candidates[] : {mercenary, …}), gardé sur lui tant qu'il est à la taverne : la
    // fiche garde ce qu'on a appris, une question posée disparaît, une réponse reste figée (doc 14 §6 bis).
    // {asked: {title, set1, set2, armor} (ce qu'on lui a demandé), schools: {école: oui / non}, salary (il a dit ses
    // prétentions), title (le dernier titre entendu, de lui ou du tavernier), affinity (l'estimation du tavernier)}
    function known(candidate){
      const k=candidate.recruitKnown||(candidate.recruitKnown={});
      k.asked=k.asked||{};
      k.schools=k.schools||{};
      return k;
    }
    const schoolsLeft=k=>SCHOOLS.filter(name=>!Object.hasOwn(k.schools||{},name));
    // Les questions qu'il reste à lui poser sur lui (la magie tant qu'une école n'est pas demandée).
    function aboutLeft(k){
      return ABOUT_QUESTIONS.filter(key=>key==="magic"?schoolsLeft(k).length>0:!k.asked?.[key]);
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
      schools:SCHOOLS.slice(),
      schoolQuestion,
      ofSchool,
      withArticles,
      greeting,
      answer,
      line,
      known,
      aboutLeft,
      schoolsLeft,
      affinityWord,
      described
    };
  }

  return {createRecruitDialogue,fill,firstName};
});
