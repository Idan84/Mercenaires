"use strict";

// Affinité capitaine ↔ mercenaire, phase 1. Décision Idan du 2026-10-20 (PR #114, code de Chatty).
// Module pur : aucune mutation du mercenaire, aucun effet automatique sur les négociations.
// Données : data/reference/people-affinity.json (matrice des peuples), alignment-generation.json (grille 3×3),
// formula-constants.json (affinity.*).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesAffinity=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const normalize=x=>String(x??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
  const aliases={
    humains:"Humain",nains:"Nain",elfes:"Elfe",halflings:"Halfling",
    gnomes:"Gnome",reptiliens:"Reptilien",orcs:"Orc",gobelins:"Gobelin",
    ogres:"Ogre",hommesbetes:"Homme-bête",hommebete:"Homme-bête"
  };
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }
  function clamp(x,min,max){return Math.max(min,Math.min(max,x));}

  function createAffinityRules({reference}={}){
    const PEOPLES=reference?.peopleAffinity?.peoples||[];
    // Ligne : peuple du mercenaire ; colonne : peuple du capitaine. Matrice volontairement asymétrique.
    const PEOPLE_MATRIX=reference?.peopleAffinity?.matrix||[];
    const ALIGNMENT_GRID=reference?.alignmentGeneration?.grid||[];
    const C={
      sameCulture:referenceConstant(reference,"affinity.culture.same_bonus",2),
      sameAlignment:referenceConstant(reference,"affinity.alignment.same_points",4),
      alignmentStep:referenceConstant(reference,"affinity.alignment.step_penalty",2)
    };
    // Bornes de l'affinité brute, déduites des données (V1 : de −7 à +9) : le score est normalisé sur
    // deux branches, négatif × 100 / |min| et positif × 100 / max.
    const matrixValues=PEOPLE_MATRIX.flat();
    const maxDistance=ALIGNMENT_GRID.length&&ALIGNMENT_GRID[0].length?ALIGNMENT_GRID.length+ALIGNMENT_GRID[0].length-2:0;
    const RAW_MIN=Math.min(...matrixValues)+C.sameAlignment-C.alignmentStep*maxDistance;
    const RAW_MAX=Math.max(...matrixValues)+C.sameCulture+C.sameAlignment;

    function peopleIndex(value){
      const key=normalize(value);
      const canonical=aliases[key]||PEOPLES.find(x=>normalize(x)===key);
      return PEOPLES.indexOf(canonical);
    }
    function alignmentPosition(value){
      const key=normalize(value);
      for(let row=0;row<ALIGNMENT_GRID.length;row++) for(let col=0;col<ALIGNMENT_GRID[row].length;col++)
        if(normalize(ALIGNMENT_GRID[row][col])===key) return {row,col};
      return null;
    }
    // acquired : affinité gagnée ou perdue en jeu (phase 2, champ persistant affinityAcquired). La part
    // initiale n'est jamais figée : elle suit un futur changement d'alignement du capitaine.
    function affinity(captain,mercenary,acquired=0){
      const captainPeople=peopleIndex(captain?.people);
      const mercenaryPeople=peopleIndex(mercenary?.people);
      const captainAlignment=alignmentPosition(captain?.alignment);
      const mercenaryAlignment=alignmentPosition(mercenary?.alignment);
      if(captainPeople<0||mercenaryPeople<0||!captainAlignment||!mercenaryAlignment)
        return {ok:false,reason:"Peuple ou alignement inconnu : affinité non calculable."};
      const people=PEOPLE_MATRIX[mercenaryPeople][captainPeople];
      const sameCulture=Boolean(captain?.culture&&mercenary?.culture&&normalize(captain.culture)===normalize(mercenary.culture));
      const culture=sameCulture?C.sameCulture:0;
      const distance=Math.abs(captainAlignment.row-mercenaryAlignment.row)+Math.abs(captainAlignment.col-mercenaryAlignment.col);
      const alignment=C.sameAlignment-C.alignmentStep*distance; // 0 à 4 cases : +4, +2, 0, -2, -4
      const raw=people+culture+alignment;
      const initial=Math.round(raw<0?raw*100/Math.abs(RAW_MIN):raw*100/RAW_MAX);
      const career=Number.isFinite(Number(acquired))?Number(acquired):0;
      return {ok:true,initial,acquired:career,total:clamp(initial+career,-100,100),
        components:{people,culture,alignment,distance,raw,sameCulture}};
    }
    // Slip d'Affinité (Idan, 2026-10-24) : la culotte portée (data/reference/pants.json, caractéristique « Affinité »)
    // ajoute bonus_t<tier> points d'affinité avec le capitaine. { item, points } ou null.
    const AFFINITY_GEAR=new Map((reference?.pants?.rows||[]).filter(r=>r.caracteristique==="Affinité").map(r=>[r.nom,r]));
    function gearAffinity(mercenary){
      const id=mercenary?.equipment?.slots?.pants;
      const item=id?(mercenary.items||[]).find(x=>x.id===id):null;
      const template=item?AFFINITY_GEAR.get(item.name):null;
      const points=template?Number(template["bonus_t"+item.tier])||0:0;
      return points?{item,points}:null;
    }
    // Affinité d'un membre de la compagnie envers son capitaine, avec sa part acquise sauvegardée et le Slip d'Affinité
    // qu'il porte (gear : points de l'objet, 0 sans).
    function memberAffinity(captain,mercenary){
      const result=affinity(captain,mercenary,Number(mercenary?.affinityAcquired)||0);
      if(!result.ok) return result;
      const gear=gearAffinity(mercenary);
      return {...result,gear:gear?.points||0,gearItem:gear?.item||null,total:clamp(result.initial+result.acquired+(gear?.points||0),-100,100)};
    }
    return {constants:C,PEOPLES,PEOPLE_MATRIX,ALIGNMENT_GRID,RAW_MIN,RAW_MAX,alignmentPosition,affinity,gearAffinity,memberAffinity};
  }

  return {createAffinityRules};
});
