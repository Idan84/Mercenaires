"use strict";

// Avatars des mercenaires (décisions Idan du 2026-10-03 et du 2026-10-04) :
// - un avatar = un plein pied + un portrait ; c'est l'image attribuée qui donne le sexe du mercenaire ;
// - même peuple obligatoire ; sans avatar disponible, le mercenaire garde le portrait générique ;
// - parmi les avatars compatibles, le plus proche du mercenaire d'après les tags Bridge d'Idan
//   (culture, origine, magie, arme…), avec un peu de hasard ;
// - plus précis (Idan, 2026-10-25) : on compare l'image à ce qui se voit sur le mercenaire (les armes qu'il porte,
//   l'école d'un mage ou d'un mercenaire qui connaît un sort), et ce qu'elle montre de contraire (un arc pour un
//   épéiste, un mage pour un guerrier, du sang de dragon pour qui n'en a pas) coûte autant qu'un tag juste rapporte ;
// - jamais deux fois le même visage en même temps ; les avatars des morts ne reviennent pas.
// Le catalogue réunit data/reference/avatars.json (scripts/build-avatars.js) et les avatars déposés sur
// Hostinger (api/avatars.php → avatar-catalog.js). Purement visuel.
(function(root,factory){
  const bio=typeof module!=="undefined"&&module.exports?require("./biography.js"):root.MercenairesBiography;
  const api=factory(bio);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesAvatars=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(bio){
  // Poids de départ, à régler : ce qui se voit sur l'image compte le plus.
  const SCORE={profile:10,magic:10,weapon:8,ascendance:8,culture:6,origin:4,alignment:2};
  // Ce qui se voit sur l'image et contredit le mercenaire : − poids × part. À défaut d'avatar qui lui ressemble, un
  // avatar neutre passe avant un avatar qui le contredit ; aucun n'est exclu pour autant.
  const VISIBLE=["profile","magic","weapon","ascendance","culture"];
  const MISMATCH_SHARE=1;
  const NOISE_MAX=5;

  function norm(value){
    return String(value??"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[’‘`´]/g,"'")
      .toLowerCase().replace(/\s+/g," ").trim();
  }
  const list=values=>(Array.isArray(values)?values:[]).map(norm).filter(Boolean);

  // Armes visibles : celles qu'il porte (deux sets) et leurs catégories ; à défaut d'équipement, ses armes préférées.
  const WEAPON_SLOTS=["weapon_set_1_main","weapon_set_1_off","weapon_set_2_main","weapon_set_2_off"];
  function visibleWeapons(m,t){
    const items=new Map((m.items||[]).map(item=>[item.id,item]));
    const carried=WEAPON_SLOTS.map(slot=>items.get(m.equipment?.slots?.[slot])).filter(Boolean);
    if(!carried.length) return t.weapon.map(norm);
    return [...new Set(carried.flatMap(item=>[item.name,item.category]).map(norm).filter(Boolean))];
  }
  // Écoles visibles : celles des sorts qu'il connaît, et sa meilleure école s'il a le profil Magie. Un guerrier dont
  // la meilleure école est faible n'a pas l'air d'un mage.
  function visibleSchools(m,t){
    const schools=new Set((m.spells||[]).map(spell=>norm(spell.school)).filter(Boolean));
    if(t.profile==="magic") t.magic.forEach(school=>schools.add(school));
    return [...schools];
  }

  // Ce que l'on sait du mercenaire, au même format que les tags du catalogue.
  function avatarTags(m){
    const t=bio.mercenaryTags(m);
    return {
      people:t.people,
      sex:m.sex?norm(m.sex):null,
      culture:[t.culture],origin:[t.origin],alignment:[t.alignment],
      ascendance:m.ascendance?[norm(m.ascendance)]:[],
      profile:t.profile?[t.profile]:[],
      magic:visibleSchools(m,t),
      weapon:visibleWeapons(m,t)
    };
  }

  // null si une contrainte dure échoue (peuple, sexe déjà connu), sinon le score souple.
  function scoreAvatar(avatar,tags){
    if(norm(avatar.people)!==tags.people) return null;
    if(tags.sex&&avatar.sex&&norm(avatar.sex)!==tags.sex) return null;
    let score=0;
    for(const [key,weight] of Object.entries(SCORE)){
      const wanted=list(avatar.tags?.[key]);
      if(!wanted.length) continue;
      if(wanted.some(v=>tags[key].includes(v))) score+=weight;
      else if(VISIBLE.includes(key)) score-=weight*MISMATCH_SHARE;
    }
    return score;
  }

  function createAvatarRules({catalog=[],random=Math.random}={}){
    const avatars=catalog.filter(a=>a&&a.id&&a.people&&a.full&&a.portrait);
    const byId=new Map(avatars.map(a=>[a.id,a]));

    function choose(m,inUse=new Set()){
      const tags=avatarTags(m);
      let best=null;
      for(const avatar of avatars){
        if(inUse.has(avatar.id)) continue;
        const score=scoreAvatar(avatar,tags);
        if(score===null) continue;
        const value=score+random()*NOISE_MAX;
        if(!best||value>best.value) best={avatar,value,score};
      }
      return best;
    }

    // Pose l'avatar sur le mercenaire ; le sexe de l'image devient celui du mercenaire.
    // Un avatar déjà attribué est gardé, avec les fichiers actuels du catalogue (image déplacée sur
    // Hostinger, nouveau format…).
    function assign(m,inUse=new Set()){
      if(m.avatar?.id&&byId.has(m.avatar.id)){
        const a=byId.get(m.avatar.id);
        if(m.avatar.full!==a.full||m.avatar.portrait!==a.portrait) m.avatar={id:a.id,full:a.full,portrait:a.portrait};
        return m.avatar;
      }
      const best=choose(m,inUse);
      if(!best) return null;
      const a=best.avatar;
      m.avatar={id:a.id,full:a.full,portrait:a.portrait};
      if(a.sex&&!m.sex) m.sex=a.sex;
      inUse.add(a.id);
      return m.avatar;
    }

    return {avatars,byId,choose,assign};
  }

  return {createAvatarRules,avatarTags,scoreAvatar,SCORE,VISIBLE,MISMATCH_SHARE};
});
