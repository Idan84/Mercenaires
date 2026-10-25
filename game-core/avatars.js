"use strict";

// Avatars des mercenaires (décisions Idan du 2026-10-03 et du 2026-10-04) :
// - un avatar = un plein pied + un portrait ; c'est l'image attribuée qui donne le sexe du mercenaire ;
// - même peuple obligatoire ; sans avatar disponible, le mercenaire garde le portrait générique ;
// - parmi les avatars compatibles, le plus proche du mercenaire d'après les tags Bridge d'Idan
//   (culture, origine, magie, arme…), avec un peu de hasard ;
// - plus précis (Idan, 2026-10-25) : on compare l'image à ce qui se voit sur le mercenaire (les armes qu'il porte,
//   l'école d'un mage ou d'un mercenaire qui connaît un sort), et ce qu'elle montre de contraire (un arc pour un
//   épéiste, un mage pour un guerrier, du sang de dragon pour qui n'en a pas) coûte autant qu'un tag juste rapporte ;
// - priorités (Idan, 2026-10-25) : la culture et l'ascendance doivent correspondre, comme le peuple (sinon, portrait
//   générique) ; puis le profil ; puis l'arme tenue en main ou l'école du mage ; puis l'arme de dos. Le profil de
//   l'avatar dit quelle arme il tient : « CAC + Hache + Arc » tient la hache et porte l'arc ;
// - jamais deux fois le même visage en même temps ; les avatars des morts ne reviennent pas.
// Le catalogue réunit data/reference/avatars.json (scripts/build-avatars.js) et les avatars déposés sur
// Hostinger (api/avatars.php → avatar-catalog.js). Purement visuel.
(function(root,factory){
  const bio=typeof module!=="undefined"&&module.exports?require("./biography.js"):root.MercenairesBiography;
  const api=factory(bio);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesAvatars=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(bio){
  // Priorités d'Idan (2026-10-25) : la culture et l'ascendance sont obligatoires, comme le peuple (« culture et ascendance
  // doivent matcher au même niveau que peuple ») : un avatar sans la culture du mercenaire, ou avec une autre ascendance
  // (ou une ascendance quand il n'en a pas), n'est pas candidat. Ensuite le profil ; puis l'arme tenue en main (ou l'école
  // d'un mage) ; puis l'arme de dos (ou l'école d'un non-mage) et, à peine, l'origine et l'alignement. Les poids sont
  // étagés pour que chaque rang l'emporte sur tous les suivants réunis.
  const SCORE={profile:20,main:12,second:4,origin:2,alignment:1};
  // Ce qui se voit sur l'image et contredit le mercenaire coûte autant qu'un tag juste rapporte : à défaut d'avatar qui
  // lui ressemble, un avatar neutre passe avant un avatar qui le contredit ; aucun n'est exclu pour autant. Origine et
  // alignement ne se voient pas.
  const VISIBLE=["profile","main","second"];
  const MISMATCH_SHARE=1;
  // Un peu de hasard entre avatars équivalents, moins que le plus petit écart visible (l'arme de dos).
  const NOISE_MAX=2;
  const RANGED_CATEGORIES=["armes de tir","armes a feu"];

  function norm(value){
    return String(value??"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[’‘`´]/g,"'")
      .toLowerCase().replace(/\s+/g," ").trim();
  }
  const list=values=>(Array.isArray(values)?values:[]).map(norm).filter(Boolean);

  // Famille d'une arme ou d'une catégorie (weapons.json) : distance pour les armes de tir et à feu, sinon corps à corps.
  function weaponFamilies(weapons=[]){
    const families=new Map(RANGED_CATEGORIES.map(c=>[c,"ranged"]));
    for(const w of weapons){
      const category=String(w.domaine||"").split(",")[0].trim();
      const family=RANGED_CATEGORIES.includes(norm(category))?"ranged":"melee";
      families.set(norm(w.nom),family);
      if(category) families.set(norm(category),family);
    }
    return families;
  }
  const DEFAULT_FAMILIES=weaponFamilies();

  // Le mercenaire : son profil, ce qu'il tient en main (les armes de son profil, ou ses écoles s'il est mage) et ce qu'il
  // porte en plus (ses autres armes ; les écoles de ses sorts s'il n'est pas mage). À défaut d'équipement, ses armes
  // préférées comptent comme tenues en main.
  const WEAPON_SLOTS=["weapon_set_1_main","weapon_set_1_off","weapon_set_2_main","weapon_set_2_off"];
  function mercenaryLook(m,t,families){
    const profile=t.profile||null;
    const spellSchools=[...new Set((m.spells||[]).map(spell=>norm(spell.school)).filter(Boolean))];
    const items=new Map((m.items||[]).map(item=>[item.id,item]));
    const carried=WEAPON_SLOTS.map(slot=>items.get(m.equipment?.slots?.[slot])).filter(Boolean);
    const names=item=>[item.name,item.category].map(norm).filter(Boolean);
    const familyOf=item=>item.combatFamily||families.get(norm(item.name))||families.get(norm(item.category))||"melee";
    if(profile==="magic") return {
      main:[...new Set([...t.magic,...spellSchools])],
      second:carried.length?[...new Set(carried.flatMap(names))]:t.weapon.map(norm)
    };
    if(!carried.length) return {main:t.weapon.map(norm),second:spellSchools};
    return {
      main:[...new Set(carried.filter(item=>familyOf(item)===profile).flatMap(names))],
      second:[...new Set([...carried.filter(item=>familyOf(item)!==profile).flatMap(names),...spellSchools])]
    };
  }

  // L'avatar : le profil dit quelle arme est en main (Idan, 2026-10-25 : « CAC + Hache + Arc » tient la hache et porte
  // l'arc ; « Distance + Hache + Arc » tient l'arc). Un mage tient son école. Avec deux profils (« dans certains cas, il peut
  // avoir deux profils »), on le regarde sous celui du mercenaire (stance) : « CAC + Mage + Hache + Feu » tient sa hache
  // pour un guerrier, son école pour un mage. Sans profil, on ne sait pas ce qu'il tient : ses armes et écoles comptent
  // comme en main, comparées à tout ce que porte le mercenaire (anyHand).
  function avatarLook(avatar,families,stance=null){
    const tags=avatar.tags||{};
    const profiles=list(tags.profile),weapons=list(tags.weapon),schools=list(tags.magic);
    if(!profiles.length) return {main:[...weapons,...schools],second:[],anyHand:true};
    const as=stance&&profiles.includes(stance)?stance:profiles[0];
    if(as==="magic") return {main:schools,second:weapons};
    const held=w=>{ const family=families.get(w); return !family||family===as; };
    return {main:weapons.filter(held),second:[...weapons.filter(w=>!held(w)),...schools]};
  }

  // Ce que l'on sait du mercenaire, au même format que les tags du catalogue.
  // magic : écoles visibles (sorts connus ; meilleure école d'un mage) ; weapon : toutes les armes portées.
  function avatarTags(m,families=DEFAULT_FAMILIES){
    const t=bio.mercenaryTags(m);
    const look=mercenaryLook(m,t,families);
    const schools=new Set((m.spells||[]).map(spell=>norm(spell.school)).filter(Boolean));
    if(t.profile==="magic") t.magic.forEach(school=>schools.add(school));
    return {
      people:t.people,
      sex:m.sex?norm(m.sex):null,
      culture:[t.culture],origin:[t.origin],alignment:[t.alignment],
      ascendance:m.ascendance?[norm(m.ascendance)]:[],
      profile:t.profile?[t.profile]:[],
      main:look.main,second:look.second,
      magic:[...schools],
      weapon:[...new Set([...look.main,...look.second].filter(x=>!schools.has(x)))]
    };
  }

  // Contraintes dures : même culture (l'avatar la porte dans ses tags) et même ascendance (aucune des deux, ou la même).
  function sameCulture(avatar,tags){ return list(avatar.tags?.culture).some(c=>tags.culture.includes(c)); }
  function sameAscendance(avatar,tags){
    const wanted=list(avatar.tags?.ascendance);
    return tags.ascendance.length?wanted.some(a=>tags.ascendance.includes(a)):!wanted.length;
  }

  // null si une contrainte dure échoue (peuple, culture, ascendance, sexe déjà connu), sinon le score souple.
  function scoreAvatar(avatar,tags,families=DEFAULT_FAMILIES){
    if(norm(avatar.people)!==tags.people) return null;
    if(!sameCulture(avatar,tags)||!sameAscendance(avatar,tags)) return null;
    if(tags.sex&&avatar.sex&&norm(avatar.sex)!==tags.sex) return null;
    const look=avatarLook(avatar,families,tags.profile[0]||null);
    const wanted={...Object.fromEntries(Object.keys(SCORE).map(key=>[key,list(avatar.tags?.[key])])),main:look.main,second:look.second};
    const has={...tags,main:look.anyHand?[...(tags.main||[]),...(tags.second||[])]:tags.main};
    let score=0;
    for(const [key,weight] of Object.entries(SCORE)){
      if(!wanted[key].length) continue;
      if(wanted[key].some(v=>(has[key]||[]).includes(v))) score+=weight;
      else if(VISIBLE.includes(key)) score-=weight*MISMATCH_SHARE;
    }
    return score;
  }

  // weapons : weapons.json (famille de chaque arme, distance ou corps à corps) ; sans lui, seules les catégories d'armes
  // de tir et à feu sont reconnues comme armes à distance.
  function createAvatarRules({catalog=[],random=Math.random,weapons=[]}={}){
    const avatars=catalog.filter(a=>a&&a.id&&a.people&&a.full&&a.portrait);
    const byId=new Map(avatars.map(a=>[a.id,a]));
    const families=weapons.length?weaponFamilies(weapons):DEFAULT_FAMILIES;

    function choose(m,inUse=new Set()){
      const tags=avatarTags(m,families);
      let best=null;
      for(const avatar of avatars){
        if(inUse.has(avatar.id)) continue;
        const score=scoreAvatar(avatar,tags,families);
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

  return {createAvatarRules,avatarTags,scoreAvatar,weaponFamilies,avatarLook,sameCulture,sameAscendance,SCORE,VISIBLE,MISMATCH_SHARE,NOISE_MAX};
});
