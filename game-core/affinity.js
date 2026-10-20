"use strict";

// Affinité capitaine ↔ mercenaire, phase 1. Décision Idan du 2026-10-20.
// Module pur : aucune mutation du mercenaire, aucun effet automatique sur les négociations.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesAffinity=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const PEOPLES=["Humain","Nain","Elfe","Halfling","Gnome","Reptilien","Orc","Gobelin","Ogre","Homme-bête"];
  // Ligne : peuple du mercenaire ; colonne : peuple du capitaine. Matrice volontairement asymétrique.
  const PEOPLE_MATRIX=[
    [3,2,2,3,1,1,-1,-1,-2,-2],
    [2,3,1,3,1,1,-3,-2,-2,-2],
    [2,1,3,3,1,1,-1,-1,-2,-2],
    [3,3,3,3,2,2,1,1,1,1],
    [2,2,2,3,3,2,-1,1,-2,-2],
    [2,2,2,3,1,3,-1,-1,-1,-1],
    [1,-1,-1,1,-3,1,3,1,3,2],
    [1,-1,-2,1,1,1,3,3,3,2],
    [1,1,1,1,1,1,2,1,3,2],
    [-2,-2,-3,-1,-2,1,1,-1,3,3]
  ];
  const ALIGNMENT_GRID=[
    ["Loyal bon","Neutre bon","Chaotique bon"],
    ["Loyal neutre","Neutre","Chaotique neutre"],
    ["Loyal mauvais","Neutre mauvais","Chaotique mauvais"]
  ];
  const normalize=x=>String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
  const aliases={
    humains:"Humain",nains:"Nain",elfes:"Elfe",halflings:"Halfling",
    gnomes:"Gnome",reptiliens:"Reptilien",orcs:"Orc",gobelins:"Gobelin",
    ogres:"Ogre",hommesbetes:"Homme-bête",hommebete:"Homme-bête"
  };
  function peopleIndex(value){
    const key=normalize(value);
    const canonical=aliases[key]||PEOPLES.find(x=>normalize(x)===key);
    return PEOPLES.indexOf(canonical);
  }
  function alignmentPosition(value){
    const key=normalize(value);
    for(let row=0;row<3;row++) for(let col=0;col<3;col++)
      if(normalize(ALIGNMENT_GRID[row][col])===key) return {row,col};
    return null;
  }
  function clamp(x,min,max){return Math.max(min,Math.min(max,x));}
  function affinity(captain,mercenary,acquired=0){
    const captainPeople=peopleIndex(captain?.people);
    const mercenaryPeople=peopleIndex(mercenary?.people);
    const captainAlignment=alignmentPosition(captain?.alignment);
    const mercenaryAlignment=alignmentPosition(mercenary?.alignment);
    if(captainPeople<0||mercenaryPeople<0||!captainAlignment||!mercenaryAlignment)
      return {ok:false,reason:"Peuple ou alignement inconnu : affinité non calculable."};
    const people=PEOPLE_MATRIX[mercenaryPeople][captainPeople];
    const sameCulture=Boolean(captain?.culture&&mercenary?.culture&&normalize(captain.culture)===normalize(mercenary.culture));
    const culture=sameCulture?2:0;
    const distance=Math.abs(captainAlignment.row-mercenaryAlignment.row)+Math.abs(captainAlignment.col-mercenaryAlignment.col);
    const alignment=4-2*distance; // 0 à 4 cases : +4, +2, 0, -2, -4
    const raw=people+culture+alignment; // min -7, max +9
    const initial=Math.round(raw<0?raw*100/7:raw*100/9);
    const career=Number.isFinite(Number(acquired))?Number(acquired):0;
    return {ok:true,initial,acquired:career,total:clamp(initial+career,-100,100),
      components:{people,culture,alignment,distance,raw,sameCulture}};
  }
  return {PEOPLES,PEOPLE_MATRIX,ALIGNMENT_GRID,alignmentPosition,affinity};
});
