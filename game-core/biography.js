"use strict";

// Biographies de mercenaires : banque de packs tagués (proposition Chatty,
// docs/design/15-biographies-and-narrative-tags.md). Un pack est un petit texte cohérent
// {id, short, rumor, motto} ; le moteur choisit le plus compatible avec le mercenaire,
// puis le pack choisi est figé sur le mercenaire. Les textes restent des modèles ({nom}, {Il|Elle})
// rendus à l'affichage : le sexe viendra de l'avatar, attribué après la bio (review Chatty, PR #34).
// Purement cosmétique : aucune formule n'en dépend.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesBiography=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  // Poids de départ proposés par Chatty (doc 15), à tester.
  const SCORE={origin:15,culture:12,profile:10,high:8,low:8,magic:8,weapon:6,alignment:4};
  const NOISE_MAX=5;
  // Caractéristiques retenues comme « forte » et « faible » : les deux plus hautes et les deux plus basses.
  const HIGH_LOW_COUNT=2;

  // Comparaison tolérante : casse, accents et espaces ignorés.
  function norm(value){
    return String(value??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
  }
  function list(value){ return (Array.isArray(value)?value:[]).map(norm).filter(Boolean); }

  // Ce que le générateur sait du mercenaire, sous forme de tags.
  function mercenaryTags(m){
    const stats=Object.entries(m.stats||{}).filter(([,v])=>Number.isFinite(v)).sort((a,b)=>b[1]-a[1]);
    const magic=Object.entries(m.skills?.magic||{}).filter(([,v])=>Number.isFinite(v)).sort((a,b)=>b[1]-a[1]);
    const weapons=Object.values(m.weaponPreferences||{}).filter(Boolean).flatMap(p=>[p.weapon,p.category]);
    return {
      people:norm(m.people),
      culture:norm(m.culture),
      origin:norm(m.origin),
      alignment:norm(m.alignment),
      profile:norm(m.equipment?.profile?.type),
      high:stats.slice(0,HIGH_LOW_COUNT).map(([name])=>norm(name)),
      low:stats.slice(-HIGH_LOW_COUNT).map(([name])=>norm(name)),
      magic:magic.length?[norm(magic[0][0])]:[],
      weapon:weapons.map(norm).filter(Boolean),
      gender:m.sex?norm(m.sex):null
    };
  }

  // null si une contrainte dure échoue (peuple, genre), sinon le score souple.
  function scorePack(pack,tags){
    const t=pack.tags||{};
    const people=list(t.people);
    if(people.length&&!people.includes(tags.people)) return null;
    const gender=norm(pack.gender||"any");
    if(gender!=="any"&&gender!==tags.gender) return null;
    const one=(key,value)=>list(t[key]).includes(value)?SCORE[key]:0;
    const any=(key,values)=>list(t[key]).some(v=>values.includes(v))?SCORE[key]:0;
    return one("origin",tags.origin)+one("culture",tags.culture)+one("profile",tags.profile)
      +one("alignment",tags.alignment)+any("high",tags.high)+any("low",tags.low)
      +any("magic",tags.magic)+any("weapon",tags.weapon);
  }

  // Variantes genrées dans le texte : {Il|Elle}. Première forme tant que le sexe est inconnu.
  function fillText(text,m){
    const female=norm(m.sex)==="femme";
    const name=String(m.name||"").replace(/\s+\d+$/,"");
    return String(text||"")
      .replace(/\{nom\}/g,name)
      .replace(/\{([^{}|]*)\|([^{}|]*)\}/g,(all,masc,fem)=>female?fem:masc);
  }

  // catalog : lignes de data/reference/biographies.json.
  function createBiographyRules({catalog=[],random=Math.random}={}){
    const packs=catalog.filter(p=>p&&p.id&&p.short);

    // Le meilleur pack compatible et jamais utilisé dans cette sauvegarde, ou null.
    function choose(m,used=new Set()){
      const tags=mercenaryTags(m);
      let best=null;
      for(const pack of packs){
        if(used.has(pack.id)) continue;
        const score=scorePack(pack,tags);
        if(score===null) continue;
        // `weight` est réservé : futur poids de tirage parmi les finalistes, pas un multiplicateur (Chatty).
        const value=score+random()*NOISE_MAX;
        if(!best||value>best.value) best={pack,value,score};
      }
      return best;
    }

    // Fige le pack choisi sur le mercenaire (textes modèles) et réserve son identifiant.
    function assign(m,used=new Set()){
      if(m.biography?.id) return m.biography;
      const best=choose(m,used);
      if(!best) return null;
      const p=best.pack;
      m.biography={id:p.id,short:p.short||"",rumor:p.rumor||"",motto:p.motto||""};
      used.add(p.id);
      return m.biography;
    }

    // Texte affiché : variantes et {nom} résolus avec ce que l'on sait du mercenaire à cet instant.
    function render(m){
      const bio=m.biography;
      if(!bio?.id) return null;
      return {id:bio.id,short:fillText(bio.short,m),rumor:fillText(bio.rumor,m),motto:fillText(bio.motto,m)};
    }

    return {packs,choose,assign,render};
  }

  return {createBiographyRules,mercenaryTags,scorePack,fillText,SCORE};
});
