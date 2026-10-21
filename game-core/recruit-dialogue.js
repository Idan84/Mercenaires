"use strict";

// Dialogue de recrutement à la Taverne (Idan, 2026-10-21) : le candidat salue selon son affinité avec le
// capitaine, répond sincèrement aux questions (arme, style, tir, magie, origine, prétentions), puis négocie.
// Textes : data/reference/tavern-dialogue.json ; la négociation elle-même reste dans tavern.js (doc 14 §9).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesRecruitDialogue=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const INFO_QUESTIONS=["weapon","style","ranged","magic","origin"];

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
    const sheet=reference?.characterSheetCopy||{};
    const styles=sheet.skills_layout?.styles_de_combat||[];
    const weaponForms=new Map((copy.weapons||[]).map(r=>[r.nom,r.avec_article]));
    const keeper=copy.tavernkeeper||{};
    const adjectives=new Map((keeper.adjectives||[]).map(r=>[r.nom,r]));

    function say(list,m,seed,vars={}){
      const options=Array.isArray(list)?list:[];
      if(!options.length) return "";
      const template=options[hash((m?.id??m?.name)+"|"+seed)%options.length];
      return fill(template,{prenom:firstName(m),...vars},isFemale(m));
    }

    function weaponWithArticle(name){
      return weaponForms.get(name)||String(name||"").toLocaleLowerCase("fr");
    }

    function best(entries){
      return entries.filter(x=>Number.isFinite(x.value)).sort((a,b)=>b.value-a.value)[0]||null;
    }

    // Arme de mêlée de prédilection : la meilleure des préférences « une main » et « deux mains » (doc 03).
    function favoriteWeapon(m){
      const prefs=m?.weaponPreferences||{};
      return [prefs.oneHand,prefs.twoHands].filter(p=>p?.weapon).sort((a,b)=>(b.score||0)-(a.score||0))[0]?.weapon||null;
    }

    function favoriteStyle(m){
      return best(styles.map(name=>({name,value:Number(m?.skills?.martial?.[name])})))?.name||null;
    }

    // Une école à 1 (la valeur plancher) n'est pas une magie pratiquée.
    function favoriteSchool(m){
      const school=best(Object.entries(m?.skills?.magic||{}).map(([name,value])=>({name,value:Number(value)})));
      return school&&school.value>1?school.name:null;
    }

    function originText(m){
      const row=(sheet.origins||[]).find(r=>r.nom===m?.origin);
      if(row) return isFemale(m)?row.femme:row.homme;
      return String(m?.origin||"").toLocaleLowerCase("fr");
    }

    function greeting(m,affinity){
      const a=Math.max(-100,Math.min(100,Math.round(Number(affinity)||0)));
      const row=(copy.greetings||[]).find(r=>a>=r.min&&a<=r.max);
      return row?fill(row.texte,{prenom:firstName(m)},isFemale(m)):"";
    }

    function answer(kind,m){
      const a=copy.answers||{};
      if(kind==="weapon"){
        const weapon=favoriteWeapon(m);
        return weapon?say(a.weapon,m,kind,{arme:weaponWithArticle(weapon)}):say(a.no_weapon,m,kind);
      }
      if(kind==="style"){
        const style=favoriteStyle(m);
        return style?say(a.style?.[style],m,kind):"";
      }
      if(kind==="ranged"){
        const weapon=m?.weaponPreferences?.ranged?.weapon;
        return weapon?say(a.ranged,m,kind,{arme:weaponWithArticle(weapon)}):say(a.no_ranged,m,kind);
      }
      if(kind==="magic"){
        const school=favoriteSchool(m);
        return school?say(a.magic?.[school],m,kind):say(a.no_magic,m,kind);
      }
      if(kind==="origin") return say(a.origin,m,kind,{origine:originText(m)});
      return "";
    }

    // Répliques : salary, offer, sign, counter, left, accepted, floor, dorm_full, dorm_full_note.
    // seed permet de varier la contre-proposition d'un tour de négociation à l'autre.
    function line(kind,m,vars={},seed=0){
      return say(copy.lines?.[kind],m,kind+"|"+seed,vars);
    }

    // Conseils du tavernier (Idan, 2026-10-21) : ce que le candidat dit de lui-même (estimate), situé parmi les
    // vraies valeurs de la compagnie (members : [{name, firstName?, value}]). Seuils de présentation seulement.
    function adviceTier(estimate,members){
      const values=(members||[]).filter(x=>Number.isFinite(x.value)).sort((a,b)=>a.value-b.value);
      if(!values.length||!Number.isFinite(estimate)) return null;
      // Rang moyen : une égalité compte pour moitié (au niveau de la médiane, on est dans la moyenne).
      const share=(values.filter(x=>x.value<estimate).length+values.filter(x=>x.value===estimate).length/2)/values.length;
      const tier=estimate>values.at(-1).value?"top"
        :share>=0.75?"well_above"
        :share>0.55?"above"
        :share>=0.45?"average"
        :share>=0.25?"below"
        :estimate>=values[0].value?"well_below":"bottom";
      return {tier,max:values.at(-1),min:values[0],median:values[Math.floor((values.length-1)/2)]};
    }

    function advice(m,statName,estimate,members){
      const place=adviceTier(estimate,members);
      if(!place) return "";
      const row=adjectives.get(statName),female=isFemale(m);
      const adj=row?(female?row.femme:row.homme):(female?"douée":"doué")+" en "+String(statName).toLocaleLowerCase("fr");
      return say(keeper.tiers?.[place.tier],m,"advice|"+statName,
        {adj,nom_max:firstName(place.max),nom_min:firstName(place.min),nom_median:firstName(place.median)});
    }

    // Répliques du tavernier : greeting, ask_who, nobody, ask_what, no_gold (m : candidat dont on parle).
    function keeperLine(key,vars={},m=null){
      return fill(keeper[key],{...(m?{prenom:firstName(m)}:{}),...vars},isFemale(m));
    }

    return {
      keeper,
      keeperLine,
      adviceTier,
      advice,
      questions:copy.questions||{},
      infoQuestions:INFO_QUESTIONS.slice(),
      greeting,
      answer,
      line,
      favoriteWeapon,
      favoriteStyle,
      favoriteSchool
    };
  }

  return {createRecruitDialogue,fill,firstName};
});
