"use strict";

// Mode dieu (Idan, 2026-11-15 : « un godmod pour changer le peuple et la culture du capitaine ou d'un mercenaire dans une
// partie afin de faire voir la charte graphique en fonction de la culture sans tout refaire »). Un outil de test, pas une
// règle du jeu : seuls le peuple et la culture changent ; caractéristiques, compétences, nom, origine sociale, ascendance,
// alignement et historique restent ceux d'avant. Le portrait suit quand l'ancien ne convient plus (un portrait est d'un
// peuple, parfois d'une culture : game-core/avatars.js).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesGodmode=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  // Le portrait actuel convient-il au peuple, à la culture, à l'ascendance et au sexe du personnage ?
  function avatarFits(character,{avatars,avatarRules}){
    const current=avatarRules.byId.get(character.avatar?.id);
    return Boolean(current)&&avatars.scoreAvatar(current,avatars.avatarTags(character))!==null;
  }

  // culturesForPeople : les cultures d'un peuple (le générateur) ; avatars, avatarRules : game-core/avatars.js et les règles
  // de la partie (sans eux, le portrait ne change pas) ; inUse : les portraits déjà pris par les autres.
  function changeOrigin(character,{people,culture},{culturesForPeople,avatars=null,avatarRules=null,inUse=new Set()}={}){
    if(!character) throw new Error("Personnage introuvable");
    const cultures=culturesForPeople(people)||[];
    if(!cultures.length) throw new Error(`Peuple inconnu : ${people}`);
    if(!cultures.includes(culture)) throw new Error(`${culture} n'est pas une culture du peuple ${people}`);
    const before={people:character.people,culture:character.culture,avatar:character.avatar?.id||null};
    character.people=people;
    character.culture=culture;
    let avatarChanged=false;
    if(avatars&&avatarRules&&!avatarFits(character,{avatars,avatarRules})){
      const previous=character.avatar;
      delete character.avatar;
      // Aucun portrait de ce peuple et de cette culture : on garde l'ancien plutôt que rien.
      if(avatarRules.assign(character,inUse)) avatarChanged=true;
      else if(previous) character.avatar=previous;
    }
    return {before,people,culture,avatarChanged};
  }

  return {changeOrigin,avatarFits};
});
