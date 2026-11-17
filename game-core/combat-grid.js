"use strict";

// La grille de combat en cases carrées (doc 04, « Le modèle de la case », étapes 1, 2 et 4 ; Idan, 2026-11-17, V1).
// Module pur, sans écran : il dit ce que coûte un pas, l'Esquive qu'une case et une arête donnent, si une arête coupe la
// vue ou empêche de frapper à travers. Données : combat-cells.json (les cases), combat-edges.json (les arêtes),
// terrain-decors.json (chaque décor est le dessin d'une case ou d'une arête), terrain-skills.json (par case).
//
// Une carte : createMap({decor, edges}).
//   decor : [{q, r, code}] ; code est un décor (son dessin mène à sa case) ou directement une case. Sans décor : Terrain
//           par défaut.
//   edges : [{q, r, side, code}] ; l'arête entre la case (q, r) et sa voisine du côté side (0 est, 1 nord, 2 ouest,
//           3 sud) ; code est une arête ou un décor qui en dessine une. (q, r) est le côté défendu (la vue « un seul
//           sens » : on voit de (q, r) vers l'extérieur, pas l'inverse).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesCombatGrid=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const rows=x=>Array.isArray(x)?x:(x?.rows||[]);
  const SIDES=[{q:1,r:0},{q:0,r:-1},{q:-1,r:0},{q:0,r:1}];
  const DEFAULT_CELL="terrain";
  const key=c=>c.q+","+c.r;
  const edgeKey=(a,b)=>{ const ka=key(a),kb=key(b); return ka<kb?ka+"|"+kb:kb+"|"+ka; };
  const sideBetween=(a,b)=>SIDES.findIndex(d=>a.q+d.q===b.q&&a.r+d.r===b.r);

  function createCombatGrid({reference}={}){
    const cells=new Map(rows(reference?.combatCells).map(c=>[c.code,c]));
    const edgeRows=new Map(rows(reference?.combatEdges).map(e=>[e.code,e]));
    const decors=new Map(rows(reference?.terrainDecors).map(d=>[d.code,d]));
    // Au-delà, une case est trop chère pour qu'on y entre à pied (« Juste une valeur de déplacement de 100 PM »).
    const IMPASSABLE=100;

    function cellRow(code){ return cells.get(code)||cells.get(decors.get(code)?.case)||null; }
    function edgeRow(code){ return edgeRows.get(code)||edgeRows.get(decors.get(code)?.arete)||null; }

    function createMap({decor=[],edges=[]}={}){
      const cellAt=new Map(),edgeAt=new Map();
      for(const d of decor){ const row=cellRow(d.code); if(row) cellAt.set(key(d),{row,decor:d.code}); }
      for(const e of edges){
        const row=edgeRow(e.code),d=SIDES[((Number(e.side)||0)%4+4)%4];
        if(!row) continue;
        const a={q:e.q,r:e.r},b={q:e.q+d.q,r:e.r+d.r};
        edgeAt.set(edgeKey(a,b),{row,decor:e.code,defended:a,a,b});
      }
      return {cellAt,edgeAt};
    }

    // La case (sa règle) ; sans décor, le Terrain par défaut.
    function cell(map,c){ return map?.cellAt?.get(key(c))?.row||cells.get(DEFAULT_CELL)||{code:DEFAULT_CELL,pm:1,esquive:0,bloque_vue:false,se_cacher:0}; }
    // L'arête entre deux cases voisines par un côté, ou null.
    function edge(map,a,b){ return sideBetween(a,b)<0?null:map?.edgeAt?.get(edgeKey(a,b))||null; }

    // Ce que les capacités de terrain (terrain-skills.json, cases) donnent sur une case : le PM le plus bas, les bonus
    // de Discrétion et d'Esquive qui s'ajoutent.
    function skillEffect(skills,code){
      const out={pm:undefined,discretion:0,esquive:0};
      for(const s of skills||[]){
        const x=s?.cases?.[code];
        if(!x) continue;
        if(x.pm!=null) out.pm=out.pm==null?Number(x.pm):Math.min(out.pm,Number(x.pm));
        out.discretion+=Number(x.discretion)||0;
        out.esquive+=Number(x.esquive)||0;
      }
      return out;
    }
    function cellPm(map,c,skills){
      const row=cell(map,c),own=skillEffect(skills,row.code).pm;
      return own!=null?own:Number(row.pm)||1;
    }

    // Un pas de from à to (voisines par un côté) : le PM de la case d'arrivée, plus le malus de l'arête franchie. Qui
    // vole ignore les malus (« Ceux qui volent ignorent les malus de déplacement des cases et des arêtes ») : au plus 1.
    function stepCost(map,from,to,{skills=[],flies=false}={}){
      const pm=cellPm(map,to,skills);
      if(flies) return Math.min(1,pm);
      return pm+(from?Number(edge(map,from,to)?.row.pm)||0:0);
    }
    // Trop cher pour y entrer à pied (le mur, l'eau profonde sans Respiration aquatique) : qui vole passe au-dessus, sans
    // s'y arrêter.
    function blocksMove(map,c,{skills=[]}={}){ return cellPm(map,c,skills)>=IMPASSABLE; }

    // L'Esquive de la case où il se tient (avec ses capacités de terrain ; négative possible).
    function cellDodge(map,c,{skills=[]}={}){
      const row=cell(map,c);
      return (Number(row.esquive)||0)+skillEffect(skills,row.code).esquive;
    }
    // Les arêtes de la cible qui font face à from (doc 04 : « un tir de biais regarde l'arête qui fait face au tireur »).
    // Pile en diagonale, une arête seule ne protège pas (« Elle protège si une autre arête de la même case ou adjacente
    // protège ») : il en faut deux qui ferment le coin. Chaque groupe protège de la plus faible de ses arêtes ; la
    // meilleure protection compte.
    function facingEdgeGroups(target,from){
      const dq=from.q-target.q,dr=from.r-target.r,sq=Math.sign(dq),sr=Math.sign(dr);
      const at=(c,d)=>[c,{q:c.q+d.q,r:c.r+d.r}];
      if(!dq&&!dr) return [];
      if(Math.abs(dq)>Math.abs(dr)) return [[at(target,{q:sq,r:0})]];
      if(Math.abs(dr)>Math.abs(dq)) return [[at(target,{q:0,r:sr})]];
      const east=at(target,{q:sq,r:0}),north=at(target,{q:0,r:sr});
      const besideQ={q:target.q,r:target.r+sr},besideR={q:target.q+sq,r:target.r};
      return [[east,north],[east,at(besideQ,{q:sq,r:0})],[north,at(besideR,{q:0,r:sr})]];
    }
    function edgeDodge(map,target,from){
      let best=0;
      for(const group of facingEdgeGroups(target,from)){
        const values=group.map(([a,b])=>Number(edge(map,a,b)?.row.esquive)||0);
        best=Math.max(best,Math.min(...values));
      }
      return best;
    }
    // L'Esquive que le terrain donne à la cible face à from : sa case et l'arête qui fait face. En charge, elle compte
    // double (Idan : « Je charge face à la palissade, il a 120 d'esquive ») ; la charge aérienne y échappe.
    function dodge(map,target,from,{skills=[],charge=false,aerial=false}={}){
      const total=cellDodge(map,target,{skills})+(from?edgeDodge(map,target,from):0);
      return charge&&!aerial?2*total:total;
    }

    // L'arête coupe-t-elle la vue de from vers to (voisines) ? « sens » : on voit du côté défendu vers l'extérieur.
    function edgeBlocksSight(map,from,to){
      const e=edge(map,from,to);
      if(!e) return false;
      if(e.row.vue==="bloque") return true;
      if(e.row.vue==="sens") return key(e.defended)!==key(from);
      return false;
    }
    // Peut-on frapper au corps à corps de a vers b (voisines) à travers leur arête ?
    function meleeThrough(map,a,b){ return edge(map,a,b)?.row.corps_a_corps!==false; }

    // Une maison (doc 04, étape 4 : « un plan : des cases Mur autour de cases Plancher ; la porte est une case Plancher dans le
    // mur ») : un rectangle de width × height cases dont le coin nord-ouest est origin ; le tour en wall (le décor qui dessine
    // le mur), le dedans et la porte en floor. door : l'indice de la porte parmi les cases du tour qui ne sont pas des coins.
    function housePlan(origin,width,height,{wall="maison",floor="plancher",door=0}={}){
      const cells=[],edgeCells=[];
      for(let dr=0;dr<height;dr++) for(let dq=0;dq<width;dq++){
        const c={q:origin.q+dq,r:origin.r+dr},border=dq===0||dr===0||dq===width-1||dr===height-1;
        const corner=(dq===0||dq===width-1)&&(dr===0||dr===height-1);
        cells.push({...c,code:border?wall:floor});
        if(border&&!corner) edgeCells.push(cells.length-1);
      }
      if(edgeCells.length) cells[edgeCells[((Number(door)||0)%edgeCells.length+edgeCells.length)%edgeCells.length]].code=floor;
      return cells;
    }

    return {SIDES,IMPASSABLE,cellRow,edgeRow,createMap,cell,edge,skillEffect,stepCost,blocksMove,cellDodge,edgeDodge,dodge,
      facingEdgeGroups,edgeBlocksSight,meleeThrough,housePlan};
  }

  return {createCombatGrid,SIDES,edgeKey,sideBetween};
});
