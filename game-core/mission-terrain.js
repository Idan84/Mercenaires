"use strict";

// Décor des cartes de contrat (décor, étape 3 ; Idan, 2026-11-06 : « Oui pour les paysages ») : un paysage par faction
// (mission-landscapes.json), tiré au hasard à chaque combat. Module pur : la carte (colonnes, lignes ; cases carrées, q la
// colonne, r la ligne), les positions des deux camps, la faction ; il rend le décor : des cases ({q, r, code}) et des
// arêtes ({q, r, side, code} : entre la case et sa voisine du côté side, 0 est, 1 nord, 2 ouest, 3 sud ; (q, r) le côté
// défendu). L'écran de combat (prototype-web/mission.js) l'applique.
// Grille carrée (doc 04, « Étape 4 : les objets du décor » ; Idan, 2026-11-17) : le muret, la tombe, les caisses et la
// palissade sont des arêtes ; la maison, un plan de cases Mur et Plancher ; sans altitude en phase 1 (plus de collines, de
// rampes ni de camp en hauteur).
// Données : mission-landscapes.json (paysages, enceinte), terrain-decors.json, combat-cells.json, combat-edges.json.
(function(root,factory){
  // La grille carrée (game-core/combat-grid.js) : les cases, les arêtes, le plan d'une maison.
  const grid=typeof module!=="undefined"&&module.exports?require("./combat-grid.js"):root.MercenairesCombatGrid;
  const api=factory(grid);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesMissionTerrain=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(CombatGrid){
  const rows=x=>Array.isArray(x)?x:(x?.rows||[]);
  // Cases carrées (doc 04, « Passage aux cases carrées ») : q = la colonne, r = la ligne, 4 voisines, distance en losange.
  const DIRS=[{q:1,r:0},{q:0,r:-1},{q:-1,r:0},{q:0,r:1}];
  const column=q=>q;
  const axial=(col,r)=>({q:col,r});
  const key=c=>c.q+","+c.r;
  const distance=(a,b)=>Math.abs(a.q-b.q)+Math.abs(a.r-b.r);

  function createMissionTerrain({reference,random=Math.random}={}){
    const data=reference?.missionLandscapes||{};
    const landscapes=rows(data);
    const decorRows=new Map(rows(reference?.terrainDecors).map(d=>[d.code,d]));
    const cells=CombatGrid?CombatGrid.createCombatGrid({reference}):null;
    // Un décor qui dessine une arête ; une case trop chère pour y entrer à pied (100 PM : le mur, le gouffre, l'eau profonde).
    const isEdge=code=>Boolean(decorRows.get(code)?.arete||cells?.edgeRow(code)&&!cells?.cellRow(code));
    const blocks=code=>Number(cells?.cellRow(code)?.pm)>=(cells?.IMPASSABLE??100);
    const between=([min,max]=[0,0])=>min+Math.floor(random()*(max-min+1));
    // Densité (Idan, 2026-11-09 : la carte passe à 36 × 25) : les groupes de décor sont donnés pour la carte de référence
    // (carte_reference, 30 × 15) ; sur une carte plus grande, leur nombre suit la surface.
    const refMap=data.carte_reference||{colonnes:30,lignes:15};
    const scaled=(range,cols,rowCount)=>{
      const factor=(cols*rowCount)/((Number(refMap.colonnes)||30)*(Number(refMap.lignes)||15));
      return Math.round(between(range)*Math.max(1,factor));
    };
    const pick=list=>list[Math.floor(random()*list.length)];
    const weighted=weights=>{
      const entries=Object.entries(weights||{}).filter(([code,w])=>w>0&&decorRows.has(code));
      let roll=random()*entries.reduce((total,[,w])=>total+w,0);
      for(const [code,w] of entries){ roll-=w; if(roll<0) return code; }
      return entries[entries.length-1]?.[0]||null;
    };

    function landscape(faction){ return landscapes.find(l=>l.faction===faction)||null; }
    const nearest=(c,list)=>Math.min(...list.map(e=>distance(c,e)));
    // L'enceinte suit un carré autour du camp (cases carrées : des côtés droits, pas un losange en escalier).
    const nearestSquare=(c,list)=>Math.min(...list.map(e=>Math.max(Math.abs(c.q-e.q),Math.abs(c.r-e.r))));

    // La carte : ses cases, leurs voisines.
    function grid(cols,rowCount){
      const cells=[];
      for(let r=0;r<rowCount;r++) for(let col=0;col<cols;col++) cells.push(axial(col,r));
      const inside=c=>c.r>=0&&c.r<rowCount&&column(c.q,c.r)>=0&&column(c.q,c.r)<cols;
      const neighbors=c=>DIRS.map(d=>({q:c.q+d.q,r:c.r+d.r})).filter(inside);
      return {cells,inside,neighbors,cols,rows:rowCount};
    }

    // Enceinte (Idan, 2026-11-06 : « palissade nouvelle », « vas-y pour la palissade et l'enceinte ») : l'anneau des cases à
    // enceinte.distance de l'ennemi le plus proche, hors de la zone de l'escouade ; ouvertures de enceinte.largeur cases,
    // la première face à l'escouade (la colonne la plus à l'ouest de l'anneau), les autres à enceinte.ecart cases au moins.
    // Grille carrée : un mur (le château en ruine) reste un anneau de cases (il a de l'épaisseur) ; une palissade ou des
    // murets (le cimetière) sont des arêtes entre l'anneau et l'intérieur du camp, défendues de l'intérieur (la vue « un seul
    // sens » de la palissade : on voit du camp vers l'extérieur).
    function enclosure(map,land,{players,enemies}){
      // Le décor de l'enceinte : celui du paysage (les murets du cimetière), sinon la palissade.
      const wall={...(data.enceinte||{}),...(land.enceinte_decor?{decor:land.enceinte_decor}:{})};
      if(!land.enceinte||!decorRows.has(wall.decor)||!enemies.length) return null;
      const D=Number(wall.distance)||2,freeSquad=Number(data.zone_libre_escouade)||2;
      const ring=map.cells.filter(c=>nearestSquare(c,enemies)===D&&column(c.q,c.r)>2&&!players.some(p=>distance(p,c)<=freeSquad));
      if(!ring.length) return null;
      const inRing=new Set(ring.map(key)),open=new Set(),openings=[];
      const carve=anchor=>{
        const cells=[anchor];
        while(cells.length<(Number(wall.largeur)||1)){
          const next=cells.flatMap(c=>map.neighbors(c)).filter(n=>inRing.has(key(n))&&!open.has(key(n))&&!cells.some(x=>key(x)===key(n)));
          if(!next.length) break;
          cells.push(pick(next));
        }
        for(const c of cells) open.add(key(c));
        openings.push(cells);
      };
      const west=Math.min(...ring.map(c=>column(c.q,c.r)));
      carve(pick(ring.filter(c=>column(c.q,c.r)===west)));
      const count=Math.max(1,between(wall.ouvertures||[1,1]));
      for(let i=0;openings.length<count&&i<60;i++){
        const c=pick(ring);
        if(!open.has(key(c))&&openings.every(o=>distance(o[0],c)>=(Number(wall.ecart)||4))) carve(c);
      }
      const closed=ring.filter(c=>!open.has(key(c)));
      if(!isEdge(wall.decor)) return {radius:D,openings,wall:closed.map(c=>({q:c.q,r:c.r,code:wall.decor}))};
      const edges=[];
      for(const c of closed) DIRS.forEach((d,side)=>{
        const inner={q:c.q+d.q,r:c.r+d.r};
        if(map.inside(inner)&&nearestSquare(inner,enemies)===D-1) edges.push({q:inner.q,r:inner.r,side:(side+2)%4,code:wall.decor});
      });
      return {radius:D,openings,wall:edges};
    }

    // Décor : des groupes de décor tirés selon les poids du paysage, hors des zones libres (autour de l'escouade, du camp,
    // et sur les colonnes de déploiement de l'escouade). Une arête (le muret, la tombe, les caisses) : une ligne d'arêtes le
    // long d'un bord ; une maison (plan) : un plan de 3 à 4 cases de côté, des murs autour, du plancher dedans, une porte.
    function decor(map,land,{players,enemies},ring=null){
      const freeSquad=Number(data.zone_libre_escouade)||2,freeCamp=Number(land.zone_libre)||1;
      const walled=new Set((ring?.wall||[]).filter(d=>d.side==null).map(key)),doors=(ring?.openings||[]).flat();
      const allowed=c=>map.inside(c)&&column(c.q,c.r)>2&&!players.some(p=>distance(p,c)<=freeSquad)&&!enemies.some(e=>distance(e,c)<=freeCamp)
        &&!walled.has(key(c))&&!doors.some(o=>distance(o,c)<=1);
      const spots=map.cells.filter(allowed);
      const out=[...(ring?.wall||[])],taken=new Set(walled);
      const edgeKey=(c,side)=>{ const d=DIRS[side],n={q:c.q+d.q,r:c.r+d.r}; return [key(c),key(n)].sort().join("|"); };
      const edgesTaken=new Set((ring?.wall||[]).filter(d=>d.side!=null).map(d=>edgeKey(d,d.side)));
      for(let g=0,groups=scaled(land.groupes,map.cols,map.rows);g<groups&&spots.length;g++){
        const code=weighted(land.decors);
        if(!code) break;
        const size=between(land.taille||[1,1]);
        if(isEdge(code)){
          let cell=pick(spots);
          const side=Math.floor(random()*4),along=side%2===0?{q:0,r:1}:{q:1,r:0};
          for(let n=0;n<Math.max(1,size)&&cell&&allowed(cell);n++){
            const d=DIRS[side],k=edgeKey(cell,side);
            if(map.inside({q:cell.q+d.q,r:cell.r+d.r})&&!edgesTaken.has(k)){ edgesTaken.add(k); out.push({q:cell.q,r:cell.r,side,code}); }
            cell={q:cell.q+along.q,r:cell.r+along.r};
          }
          continue;
        }
        if(decorRows.get(code)?.plan&&cells){
          for(let tries=0;tries<20;tries++){
            const w=3+Math.floor(random()*2),h=3+Math.floor(random()*2),origin=pick(spots);
            const plan=cells.housePlan(origin,w,h,{wall:code,floor:"plancher",door:Math.floor(random()*2*(w+h))});
            if(!plan.every(c=>allowed(c)&&!taken.has(key(c)))) continue;
            for(const c of plan){ taken.add(key(c)); out.push(c); }
            break;
          }
          continue;
        }
        let cell=pick(spots);
        for(let n=0;n<size&&cell;n++){
          if(!taken.has(key(cell))){ taken.add(key(cell)); out.push({q:cell.q,r:cell.r,code}); }
          const next=map.neighbors(cell).filter(c=>allowed(c)&&!taken.has(key(c)));
          cell=next.length?pick(next):null;
        }
      }
      return out;
    }

    // Garde-fou : depuis l'escouade, chaque ennemi est atteignable à pied (pas de case infranchissable sur tous les chemins ;
    // une arête se franchit toujours, à son prix).
    function reachable(map,{players,enemies,decor:placed=[]}){
      const blocked=new Set(placed.filter(d=>d.side==null&&blocks(d.code)).map(key));
      const seen=new Set(players.map(key)),queue=[...players];
      while(queue.length){
        const cur=queue.shift();
        for(const n of map.neighbors(cur)){
          const k=key(n);
          if(seen.has(k)||blocked.has(k)) continue;
          seen.add(k);queue.push(n);
        }
      }
      return enemies.every(e=>seen.has(key(e)));
    }

    // La carte d'un contrat : le paysage de la faction ; jusqu'à « essais » tirages pour que tout le monde puisse se
    // rejoindre, sinon l'enceinte seule si elle laisse passer, puis rien.
    function generate({cols,rows:rowCount,faction,players=[],enemies=[]}){
      const land=landscape(faction);
      if(!land) return {landscape:null,decor:[]};
      const map=grid(cols,rowCount),spots={players,enemies,cols};
      let ring=null;
      for(let attempt=1;attempt<=(Number(data.essais)||30);attempt++){
        ring=enclosure(map,land,spots);
        const d=decor(map,land,spots,ring);
        if(reachable(map,{players,enemies,decor:d}))
          return {landscape:land.nom,decor:d,attempts:attempt,openings:ring?ring.openings:[]};
      }
      if(ring&&reachable(map,{players,enemies,decor:ring.wall})) return {landscape:land.nom,decor:ring.wall,attempts:0,openings:ring.openings};
      return {landscape:land.nom,decor:[],attempts:0};
    }

    return {landscape,generate,reachable,grid,enclosure};
  }

  return {createMissionTerrain,column,axial,distance};
});
