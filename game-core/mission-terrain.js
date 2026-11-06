"use strict";

// Décor et relief des cartes de contrat (décor, étape 3 ; Idan, 2026-11-06 : « Oui pour les paysages », « camp en hauteur
// oui ») : un paysage par faction (mission-landscapes.json), tiré au hasard à chaque combat. Module pur : la carte (colonnes,
// lignes, en « offset » lignes impaires décalées, logique en axial q, r), les positions des deux camps, la faction ; il
// rend le décor ({q, r, code}) et le relief ({q, r, h}). L'écran de combat (prototype-web/mission.js) l'applique.
// Données : mission-landscapes.json, terrain-decors.json, formula-constants.json (combat.altitude.*).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesMissionTerrain=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const rows=x=>Array.isArray(x)?x:(x?.rows||[]);
  const DIRS=[{q:1,r:0},{q:1,r:-1},{q:0,r:-1},{q:-1,r:0},{q:-1,r:1},{q:0,r:1}];
  const column=(q,r)=>q+((r-(r&1))>>1);
  const axial=(col,r)=>({q:col-((r-(r&1))>>1),r});
  const key=c=>c.q+","+c.r;
  const distance=(a,b)=>(Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;

  function createMissionTerrain({reference,random=Math.random}={}){
    const data=reference?.missionLandscapes||{};
    const landscapes=rows(data);
    const decorRows=new Map(rows(reference?.terrainDecors).map(d=>[d.code,d]));
    const constant=(code,fallback)=>{
      const value=Number(rows(reference?.formulaConstants).find(r=>r.code===code)?.valeur);
      return Number.isFinite(value)?value:fallback;
    };
    const cliff=constant("combat.altitude.cliff",2),maxHeight=constant("combat.altitude.max",3);
    const between=([min,max]=[0,0])=>min+Math.floor(random()*(max-min+1));
    const pick=list=>list[Math.floor(random()*list.length)];
    const weighted=weights=>{
      const entries=Object.entries(weights||{}).filter(([code,w])=>w>0&&decorRows.has(code));
      let roll=random()*entries.reduce((total,[,w])=>total+w,0);
      for(const [code,w] of entries){ roll-=w; if(roll<0) return code; }
      return entries[entries.length-1]?.[0]||null;
    };

    function landscape(faction){ return landscapes.find(l=>l.faction===faction)||null; }

    // La carte : ses cases, leurs voisines.
    function grid(cols,rowCount){
      const cells=[];
      for(let r=0;r<rowCount;r++) for(let col=0;col<cols;col++) cells.push(axial(col,r));
      const inside=c=>c.r>=0&&c.r<rowCount&&column(c.q,c.r)>=0&&column(c.q,c.r)<cols;
      const neighbors=c=>DIRS.map(d=>({q:c.q+d.q,r:c.r+d.r})).filter(inside);
      return {cells,inside,neighbors};
    }

    // Relief : le plateau du camp (ses cases et leurs voisines, à camp_hauteur), bordé de falaises ; chaque rampe est un
    // cône qui descend d'un niveau par case depuis une case du bord ; les collines, des cônes de hauteur 1 à
    // hauteur_collines au milieu de la carte. Chaque case prend le plus haut.
    function relief(map,land,{enemies,cols}){
      const H=Math.min(maxHeight,Number(land.camp_hauteur)||0);
      const plateau=new Set();
      if(H>0) for(const c of map.cells) if(enemies.some(e=>distance(c,e)<=1)) plateau.add(key(c));
      const cones=[];
      if(H>0){
        const edge=map.cells.filter(c=>plateau.has(key(c))&&map.neighbors(c).some(n=>!plateau.has(key(n))));
        const west=Math.min(...edge.map(c=>column(c.q,c.r)));
        // Une rampe au moins face à l'escouade (le bord ouest du plateau), les autres ailleurs sur le bord.
        const anchors=[];
        const count=Math.max(1,between(land.rampes||[1,1]));
        const westEdge=edge.filter(c=>column(c.q,c.r)===west);
        if(westEdge.length) anchors.push(pick(westEdge));
        for(let i=0;anchors.length<count&&i<40;i++){
          const c=pick(edge);
          if(anchors.every(a=>distance(a,c)>=4)) anchors.push(c);
        }
        for(const a of anchors) cones.push({...a,h:H});
      }
      const middle=map.cells.filter(c=>{ const col=column(c.q,c.r); return col>=4&&col<=cols-6; });
      for(let i=0,n=between(land.collines||[0,0]);i<n&&middle.length;i++)
        cones.push({...pick(middle),h:1+Math.floor(random()*Math.max(1,Number(land.hauteur_collines)||1))});
      const out=[];
      for(const c of map.cells){
        const h=Math.max(plateau.has(key(c))?H:0,...cones.map(cone=>cone.h-distance(cone,c)),0);
        if(h>0) out.push({q:c.q,r:c.r,h:Math.min(maxHeight,h)});
      }
      return out;
    }

    // Décor : des groupes de décor tirés selon les poids du paysage, hors des zones libres (autour de l'escouade, du camp,
    // et sur les colonnes de déploiement de l'escouade).
    function decor(map,land,{players,enemies}){
      const freeSquad=Number(data.zone_libre_escouade)||2,freeCamp=Number(land.zone_libre)||1;
      const allowed=c=>column(c.q,c.r)>2&&!players.some(p=>distance(p,c)<=freeSquad)&&!enemies.some(e=>distance(e,c)<=freeCamp);
      const spots=map.cells.filter(allowed);
      const out=[],taken=new Set();
      for(let g=0,groups=between(land.groupes);g<groups&&spots.length;g++){
        const code=weighted(land.decors);
        if(!code) break;
        let cell=pick(spots);
        for(let n=0,size=between(land.taille||[1,1]);n<size&&cell;n++){
          if(!taken.has(key(cell))){ taken.add(key(cell)); out.push({q:cell.q,r:cell.r,code}); }
          const next=map.neighbors(cell).filter(c=>allowed(c)&&!taken.has(key(c)));
          cell=next.length?pick(next):null;
        }
      }
      return out;
    }

    // Garde-fou : depuis l'escouade, chaque ennemi est atteignable à pied (ni décor infranchissable, ni falaise).
    function reachable(map,{players,enemies,decor:placed=[],relief:heights=[]}){
      const blocked=new Set(placed.filter(d=>decorRows.get(d.code)?.cout_mouvement==null).map(key));
      const height=new Map(heights.map(c=>[key(c),c.h]));
      const h=c=>height.get(key(c))||0;
      const seen=new Set(players.map(key)),queue=[...players];
      while(queue.length){
        const cur=queue.shift();
        for(const n of map.neighbors(cur)){
          const k=key(n);
          if(seen.has(k)||blocked.has(k)||Math.abs(h(n)-h(cur))>=cliff) continue;
          seen.add(k);queue.push(n);
        }
      }
      return enemies.every(e=>seen.has(key(e)));
    }

    // La carte d'un contrat : le paysage de la faction ; jusqu'à « essais » tirages pour que tout le monde puisse se
    // rejoindre, sinon le relief seul (les rampes y mènent toujours), puis rien.
    function generate({cols,rows:rowCount,faction,players=[],enemies=[]}){
      const land=landscape(faction);
      if(!land) return {landscape:null,decor:[],relief:[]};
      const map=grid(cols,rowCount),spots={players,enemies,cols};
      for(let attempt=1;attempt<=(Number(data.essais)||30);attempt++){
        const r=relief(map,land,spots),d=decor(map,land,spots);
        if(reachable(map,{players,enemies,decor:d,relief:r})) return {landscape:land.nom,decor:d,relief:r,attempts:attempt};
      }
      const r=relief(map,land,spots);
      if(reachable(map,{players,enemies,relief:r})) return {landscape:land.nom,decor:[],relief:r,attempts:0};
      return {landscape:land.nom,decor:[],relief:[],attempts:0};
    }

    return {landscape,generate,reachable,grid};
  }

  return {createMissionTerrain,column,axial,distance};
});
