"use strict";

// La grille de combat en cases carrées (doc 04, « Le modèle de la case », étapes 1, 2 et 4 ; Idan, 2026-11-17, V1) : les
// cases et les arêtes (données), chaque décor qui dessine une case ou une arête, le coût d'un pas au quart de point,
// l'Esquive de la case et de l'arête qui fait face (double en charge, sauf aérienne), la vue « un seul sens », le corps
// à corps à travers une arête.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Grid=require("../game-core/combat-grid.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.combatCells,"combat-cells.json","le jeu charge les cases");
assert.equal(files.combatEdges,"combat-edges.json","le jeu charge les arêtes");
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"))]));

// 1. Les données : les valeurs de la V1 d'Idan (artefact « Grille de combat », doc 04).
const cells=reference.combatCells,edges=reference.combatEdges;
assert.equal(cells.row_count,cells.rows.length);
assert.equal(edges.row_count,edges.rows.length);
const cell=code=>cells.rows.find(c=>c.code===code);
assert.deepEqual(cells.rows.map(c=>[c.code,c.pm,c.se_cacher,c.bloque_vue,c.esquive]),[
  ["terrain",1,0,false,0],
  ["vegetation_souple",1.5,30,false,0],
  ["foret",1.5,0,true,30],
  ["plancher",0.75,0,false,0],
  ["boue",2,0,false,0],
  ["eau_peu_profonde",2,10,false,0],
  ["eau_profonde",100,0,false,0],
  ["eboulis",2,30,false,0],
  ["gouffre",100,0,false,0],
  ["mur",100,0,true,0],
]);
for(const c of cells.rows) assert.equal(c.pm*4,Math.round(c.pm*4),c.code+" : au quart de point");
assert.deepEqual(edges.rows.map(e=>[e.code,e.pm,e.esquive,e.vue,e.corps_a_corps]),[
  ["muret",0.5,30,"laisse",true],
  ["palissade",2,60,"sens",false],
  ["muraille_meurtriere",4,100,"sens",false],
]);
// Chaque décor d'aujourd'hui est le dessin d'une case ou d'une arête (étape 4), jamais des deux.
const draws=Object.fromEntries(reference.terrainDecors.rows.map(d=>[d.code,d.case||d.arete]));
for(const d of reference.terrainDecors.rows){
  assert.ok(Boolean(d.case)!==Boolean(d.arete),d.code+" : une case ou une arête");
  assert.ok(d.case?cell(d.case):edges.rows.some(e=>e.code===d.arete),d.code+" : sa règle existe");
}
assert.deepEqual(draws,{buissons:"vegetation_souple",ble_haut:"vegetation_souple",foret:"foret",marais:"boue",
  eau_peu_profonde:"eau_peu_profonde",eau_profonde:"eau_profonde",eboulis:"eboulis",gros_rocher:"mur",mur:"mur",maison:"mur",
  gouffre:"gouffre",muret:"muret",tombe:"muret",caisses:"muret",tonneaux:"muret",palissade:"palissade"});
// Les capacités de terrain, par case.
const skill=code=>reference.terrainSkills.rows.find(s=>s.code===code);
for(const s of reference.terrainSkills.rows) for(const c of Object.keys(s.cases||{})) assert.ok(cell(c),s.code+" : "+c);
assert.deepEqual(skill("deplacement_aquatique").cases,{eau_peu_profonde:{pm:1,discretion:30},eau_profonde:{pm:2}});
assert.deepEqual(skill("respiration_aquatique").cases,{eau_profonde:{pm:1,esquive:80},eau_peu_profonde:{esquive:25}});
assert.deepEqual(skill("deplacement_sylvain").cases,{foret:{pm:1,discretion:30}});
assert.deepEqual(skill("vol").cases,{});

// 2. Le coût d'un pas : la case d'arrivée, plus l'arête franchie ; au quart de point.
const grid=Grid.createCombatGrid({reference});
const map=grid.createMap({
  decor:[{q:1,r:0,code:"buissons"},{q:2,r:0,code:"plancher"},{q:3,r:0,code:"mur"},{q:1,r:1,code:"foret"},
    {q:0,r:2,code:"eau_profonde"},{q:1,r:2,code:"eau_peu_profonde"}],
  edges:[{q:5,r:5,side:0,code:"muret"},{q:5,r:6,side:1,code:"palissade"},{q:8,r:8,side:2,code:"muraille_meurtriere"}],
});
const at=(q,r)=>({q,r});
assert.equal(grid.cell(map,at(9,9)).code,"terrain","sans décor : le Terrain par défaut");
assert.equal(grid.cell(map,at(1,0)).code,"vegetation_souple","les buissons dessinent de la végétation souple");
assert.equal(grid.stepCost(map,at(0,0),at(1,0)),1.5);
assert.equal(grid.stepCost(map,at(1,0),at(2,0)),0.75,"le plancher : 0,75");
assert.equal(grid.stepCost(map,at(2,0),at(3,0)),100,"le mur : 100 PM");
assert.equal(grid.blocksMove(map,at(3,0)),true);
assert.equal(grid.stepCost(map,at(5,5),at(6,5)),1.5,"le muret : la case (1) + 0,5");
assert.equal(grid.stepCost(map,at(6,5),at(5,5)),1.5,"dans les deux sens");
assert.equal(grid.stepCost(map,at(5,6),at(5,5)),3,"la palissade : + 2");
assert.equal(grid.stepCost(map,at(8,8),at(7,8)),5,"la muraille : + 4");
assert.equal(grid.stepCost(map,at(5,5),at(5,4)),1,"pas d'arête de ce côté");
// Qui vole ignore les malus des cases et des arêtes, garde le plancher.
for(const [from,to] of [[at(0,0),at(1,0)],[at(2,0),at(3,0)],[at(5,6),at(5,5)],[at(8,8),at(7,8)]]) assert.equal(grid.stepCost(map,from,to,{flies:true}),1);
assert.equal(grid.stepCost(map,at(1,0),at(2,0),{flies:true}),0.75);
// Les capacités de terrain changent le PM de la case.
const sylvain=[skill("deplacement_sylvain")],aquatique=[skill("deplacement_aquatique")],respiration=[skill("respiration_aquatique")];
assert.equal(grid.stepCost(map,at(1,0),at(1,1),{skills:sylvain}),1,"Déplacement sylvain : 1 PM en forêt");
assert.equal(grid.stepCost(map,at(1,0),at(1,1)),1.5);
assert.equal(grid.stepCost(map,at(0,1),at(0,2),{skills:aquatique}),2,"Déplacement aquatique : 2 PM dans l'eau profonde");
assert.equal(grid.stepCost(map,at(0,1),at(0,2),{skills:respiration}),1,"Respiration aquatique : 1 PM");
assert.equal(grid.blocksMove(map,at(0,2),{skills:respiration}),false);
assert.equal(grid.stepCost(map,at(0,1),at(0,2),{skills:[...aquatique,...respiration]}),1,"le plus bas");

// 3. L'Esquive : la case, et l'arête qui fait face au tireur ; double en charge, sauf aérienne.
assert.equal(grid.cellDodge(map,at(1,1)),30,"la forêt : +30");
assert.equal(grid.cellDodge(map,at(0,2)),0,"l'eau profonde sans capacité : rien");
assert.equal(grid.cellDodge(map,at(0,2),{skills:respiration}),80,"Respiration aquatique : +80 dans l'eau profonde");
assert.equal(grid.cellDodge(map,at(1,2),{skills:respiration}),25,"+25 dans l'eau peu profonde");
assert.equal(grid.dodge(map,at(5,5),at(12,5)),30,"le muret face au tireur, à l'est");
assert.equal(grid.dodge(map,at(5,5),at(12,7)),30,"un tir de biais regarde l'arête qui fait face (surtout à l'est)");
assert.equal(grid.dodge(map,at(5,5),at(0,5)),0,"de l'autre côté, le muret ne protège pas");
assert.equal(grid.dodge(map,at(5,5),at(5,12)),60,"au sud, la palissade : la même Esquive des deux côtés (« plaqué contre la muraille, il le touchera pas »)");
assert.equal(grid.dodge(map,at(5,5),at(5,0)),0,"au nord, rien");
assert.equal(grid.dodge(map,at(5,5),at(9,1)),0,"pile en diagonale, un muret seul ne protège pas");
assert.equal(grid.dodge(map,at(6,5),at(0,5)),30,"le même muret protège la case d'à côté, de l'autre côté");
assert.equal(grid.dodge(map,at(5,5),at(12,5),{charge:true}),60,"en charge, l'Esquive compte double");
assert.equal(grid.dodge(map,at(5,5),at(12,5),{charge:true,aerial:true}),30,"la charge aérienne y échappe");
assert.equal(grid.dodge(map,at(5,6),at(5,0)),60,"la palissade, face au nord");
assert.equal(grid.dodge(map,at(5,6),at(5,0),{charge:true}),120,"« Je charge face à la palissade, il a 120 d'esquive »");
assert.equal(grid.dodge(map,at(1,1),at(1,9),{charge:true}),60,"la forêt en charge : 2 × 30");
// Un coin fermé par deux arêtes protège la diagonale : la plus faible des deux.
{
  const corner=grid.createMap({edges:[{q:0,r:0,side:0,code:"muret"},{q:0,r:0,side:1,code:"palissade"}]});
  assert.equal(grid.dodge(corner,at(0,0),at(4,-4)),30,"le coin fermé : la plus faible des deux arêtes");
  assert.equal(grid.dodge(corner,at(0,0),at(5,-4)),30,"surtout à l'est : le muret");
  assert.equal(grid.dodge(corner,at(0,0),at(4,-5)),60,"surtout au nord : la palissade");
  const line=grid.createMap({edges:[{q:0,r:0,side:0,code:"muret"},{q:0,r:-1,side:0,code:"muret"}]});
  assert.equal(grid.dodge(line,at(0,0),at(4,-4)),30,"une ligne de murets continue protège aussi la diagonale");
}
// Une Esquive négative est possible (la neige, le marais : doc 04) : le module l'additionne telle quelle.
{
  const cold=Grid.createCombatGrid({reference:{...reference,combatCells:{rows:[...cells.rows,{code:"neige_test",pm:2,esquive:-10}]}}});
  assert.equal(cold.cellDodge(cold.createMap({decor:[{q:0,r:0,code:"neige_test"}]}),at(0,0)),-10);
}

// 4. La vue à travers une arête, et le corps à corps.
assert.equal(grid.edgeBlocksSight(map,at(5,5),at(6,5)),false,"le muret laisse voir");
assert.equal(grid.edgeBlocksSight(map,at(5,6),at(5,5)),false,"la palissade : du côté défendu vers l'extérieur, on voit");
assert.equal(grid.edgeBlocksSight(map,at(5,5),at(5,6)),true,"de l'extérieur vers l'intérieur, non");
assert.equal(grid.edgeBlocksSight(map,at(8,8),at(7,8)),false,"la meurtrière : on voit dehors");
assert.equal(grid.edgeBlocksSight(map,at(7,8),at(8,8)),true,"pas dedans");
assert.equal(grid.meleeThrough(map,at(5,5),at(6,5)),true,"on frappe par-dessus un muret");
assert.equal(grid.meleeThrough(map,at(5,6),at(5,5)),false,"pas à travers une palissade (« du bois plein. On fait le tour »)");
assert.equal(grid.meleeThrough(map,at(7,8),at(8,8)),false,"ni à travers une meurtrière");
assert.equal(grid.meleeThrough(map,at(0,0),at(1,1)),true,"sans arête entre les deux");
// Une arête dessinée par un décor (la tombe : un muret).
const tomb=grid.createMap({edges:[{q:0,r:0,side:3,code:"tombe"}]});
assert.equal(grid.edge(tomb,at(0,1),at(0,0)).row.code,"muret");
assert.equal(grid.stepCost(tomb,at(0,0),at(0,1)),1.5);

// Garde-fou du décor (Idan, 2026-11-18 : « on ne peut pas mettre d'enceinte totale de mur (1 ennemi, coincé dans une
// muraille de tous les côtés, il peut tirer et est presque invincible) ») : les cases qu'on n'atteint pas à pied sans
// passer par un mur ni franchir une palissade ou une muraille.
const ring=(code,open=-1)=>[0,1,2,3].filter(s=>s!==open).map(side=>({q:5,r:5,side,code}));
const pockets=map=>grid.closedPockets(map,{cols:10,rows:10,from:[at(0,0)]});
assert.deepEqual(pockets(grid.createMap({})),[],"sans décor, rien d'enfermé");
assert.deepEqual(pockets(grid.createMap({edges:ring("palissade")})),[at(5,5)],"une case entourée de palissade");
assert.deepEqual(pockets(grid.createMap({edges:ring("muraille_meurtriere")})),[at(5,5)],"ou de muraille");
assert.deepEqual(pockets(grid.createMap({edges:ring("palissade",2)})),[],"une ouverture suffit");
assert.deepEqual(pockets(grid.createMap({edges:ring("muret")})),[],"un muret n'enferme pas (on frappe par-dessus)");
const rocks=[at(4,5),at(6,5),at(5,4),at(5,6)].map(c=>({...c,code:"gros_rocher"}));
assert.deepEqual(pockets(grid.createMap({decor:rocks})),[at(5,5)],"entourée de rochers");
assert.deepEqual(pockets(grid.createMap({decor:rocks.slice(1)})),[],"un rocher de moins, on passe");
// Une maison : sa porte la laisse ouverte ; un rocher devant la porte la ferme.
const house=grid.housePlan(at(3,3),4,4,{door:0});
assert.deepEqual(pockets(grid.createMap({decor:house})),[]);
const door=house.find(c=>c.code==="plancher"&&(c.q===3||c.q===6||c.r===3||c.r===6));
const outside=[at(door.q,door.r-1),at(door.q,door.r+1),at(door.q-1,door.r),at(door.q+1,door.r)].find(c=>!house.some(h=>h.q===c.q&&h.r===c.r));
assert.equal(pockets(grid.createMap({decor:[...house,{...outside,code:"mur"}]})).length,4+1,"le dedans (2 × 2) et la porte");

console.log(JSON.stringify({ok:true,cases:cells.rows.length,aretes:edges.rows.length,decors:reference.terrainDecors.rows.length},null,2));
