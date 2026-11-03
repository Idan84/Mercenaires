"use strict";

// Postes du camp tenus par un mercenaire hors mission (il reste au camp, vit dans son bâtiment : pas de place au dortoir) :
// le directeur de l'École de magie (Idan, 2026-11-01) et les maîtres des bâtiments d'entraînement (Idan, 2026-11-03 :
// « Oui pour les maîtres ») : le Doctore au Ludus, le Vétéran à l'Académie de la survie, le Maître des lames au Cercle
// des Fines Lames ; l'Alchimiste au Labo d'alchimie (Idan, 2026-11-03 : « on va nommer un alchimiste comme chef de salle »).
// Le titulaire d'un poste : state.company[key + "Id"] (directorId, doctoreId, veteranId, bladeMasterId, alchemistId).
// Nomination et retour sur le terrain : school-director.js ; aide à l'entraînement : school-training.js.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesCampPosts=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  // noun : le titre seul ; title : le titulaire (« Le Doctore ne peut pas être intendant. ») ; place : le bâtiment
  // (« Il faut d'abord construire le Ludus. ») ; short : le bâtiment dans une phrase (« Le capitaine ne peut pas diriger
  // le Ludus. »).
  const POSTS=[
    {key:"director",building:"magic_school",noun:"directeur",title:"Le directeur de l’École",place:"l’École de magie",short:"l’École"},
    {key:"doctore",building:"ludus",noun:"Doctore",title:"Le Doctore",place:"le Ludus",short:"le Ludus"},
    {key:"veteran",building:"survival_academy",noun:"Vétéran",title:"Le Vétéran",place:"l’Académie de la survie",short:"l’Académie"},
    {key:"bladeMaster",building:"blade_circle",noun:"Maître des lames",title:"Le Maître des lames",place:"le Cercle des Fines Lames",short:"le Cercle"},
    {key:"alchemist",building:"alchemy_lab",noun:"Alchimiste",title:"L’Alchimiste",place:"le Labo d’alchimie",short:"le Labo"}
  ];
  const idKey=post=>post.key+"Id";
  const postByKey=key=>POSTS.find(post=>post.key===key)||null;
  const postOfBuilding=code=>POSTS.find(post=>post.building===code)||null;
  const holderId=(state,post)=>state?.company?.[idKey(post)]??null;
  function holderOf(state,post){
    const id=holderId(state,post);
    return id==null?null:(state.company.roster||[]).find(m=>m.id===id)||null;
  }
  // Le poste que tient ce mercenaire, ou null.
  function postOf(state,m){
    if(!m) return null;
    return POSTS.find(post=>{ const id=holderId(state,post); return id!=null&&id===m.id; })||null;
  }
  // Les titulaires en poste, par bâtiment : { magic_school: directeur, ludus: Doctore, … }.
  function mastersOf(state){
    const masters={};
    for(const post of POSTS){ const m=holderOf(state,post); if(m) masters[post.building]=m; }
    return masters;
  }
  // Il quitte la compagnie : ses postes se libèrent.
  function release(state,m){
    for(const post of POSTS) if(m&&holderId(state,post)===m.id) state.company[idKey(post)]=null;
  }

  return {POSTS,idKey,postByKey,postOfBuilding,holderOf,postOf,mastersOf,release};
});
