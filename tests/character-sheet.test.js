"use strict";

// Textes de la fiche mercenaire (Idan, 2026-10-21) : data/reference/character-sheet-copy.json couvre
// toutes les origines, ascendances, caractéristiques et résistances des référentiels.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,"..","data","reference",f),"utf8"));
const copy=read("character-sheet-copy.json");
const names=f=>read(f).rows.map(r=>r.nom).sort();

assert.deepEqual(copy.origins.map(r=>r.nom).sort(),names("social-origins.json"));
assert.ok(copy.origins.every(r=>r.homme&&r.femme));
assert.deepEqual(copy.ancestries.map(r=>r.nom).sort(),names("ancestries.json"));
assert.ok(copy.ancestries.every(r=>/^d/.test(r.famille)&&/^d’un/.test(r.parent)),"« famille de… », « enfant d’un… »");

// Onglet Caractéristiques : Physique, Mental, Résistances ; Puissance magique et Réserve de mana vont
// dans l'onglet Magie (groupe « magie »).
const characteristics=read("characteristics.json").rows;
const shown=copy.stats.map(r=>r.nom);
assert.equal(new Set(shown).size,shown.length);
assert.ok(copy.stats.every(r=>["physique","mental","resistance","magie"].includes(r.groupe)&&typeof r.usage==="string"));
// Rangées par fonction (Idan, 2026-10-31) : chaque caractéristique utile une seule fois, plus les trois protections de
// l'armure ; rien d'inconnu.
const layoutNames=copy.stats_layout.colonnes.flat().flatMap(g=>g.stats);
assert.equal(copy.stats_layout.colonnes.length,3);
assert.equal(new Set(layoutNames).size,layoutNames.length,"une seule fois chacune");
for(const n of layoutNames) assert.ok(copy.stats.some(r=>r.nom===n&&r.usage)||copy.protections.some(r=>r.nom===n&&r.usage),"inconnue ou sans usage : "+n);
for(const r of copy.stats) if(r.usage&&r.groupe!=="magie") assert.ok(layoutNames.includes(r.nom),"absente de l'onglet : "+r.nom);
assert.equal(copy.protections.filter(r=>layoutNames.includes(r.nom)).length,3,"les trois protections de l'armure");
// Infobulles pour le joueur (Idan, 2026-10-24) : rien sur la création, les formules ni ce qui n'est pas encore en jeu.
for(const r of copy.stats) assert.doesNotMatch(r.usage,/création|pas encore|calculé|effective/i,r.nom);
const generated=characteristics.filter(r=>r.famille==="Caractéristique").map(r=>r.nom);
for(const n of generated){
  const group=copy.stats.find(r=>r.nom===n)?.groupe;
  assert.ok(group,"caractéristique absente de la fiche : "+n);
  if(["Puissance magique","Réserve de mana"].includes(n)) assert.equal(group,"magie",n+" va dans l'onglet Magie");
  else assert.notEqual(group,"magie",n);
}
for(const n of characteristics.filter(r=>r.famille==="Résistance").map(r=>r.nom)) assert.equal(copy.stats.find(r=>r.nom===n)?.groupe,"resistance",n);
assert.deepEqual(copy.stats.filter(r=>r.groupe==="physique").slice(0,2).map(r=>r.nom),["Points de vie","Initiative"]);
// Régénération et Intimidation passent dans les caractéristiques (Idan, 2026-10-21).
assert.equal(copy.stats.find(r=>r.nom==="Régénération")?.groupe,"physique");
// Régénération sur la fiche (Idan, 2026-11-01 : « il faut ») : dans la Défense, avec son usage ; masquée à 0 (tout le
// monde sauf le sang de troll).
const regen=copy.stats.find(r=>r.nom==="Régénération");
assert.match(regen.usage,/regagner des PV/);
assert.equal(regen.masquer_si_nul,true);
assert.ok(copy.stats_layout.colonnes.flat().find(g=>g.code==="defense").stats.includes("Régénération"));
assert.match(fs.readFileSync(path.join(__dirname,"..","prototype-web","ui.js"),"utf8"),/if\(row\.masquer_si_nul&&!\(value>0\)\) return "";/);
assert.equal(copy.stats.find(r=>r.nom==="Intimidation")?.groupe,"mental");

// Onglet Compétences : chaque catégorie martiale est dans une seule colonne ; les armures sont les aptitudes.
const skills=read("skills.json").rows;
const layout=copy.skills_layout;
const placed=[...layout.corps_a_corps,...layout.style,...layout.tir,...layout.discretion_et_pieges,layout.magie_en_armure];
assert.equal(new Set(placed).size,placed.length,"une catégorie dans une seule colonne");
// Armes naturelles (aux créatures) et Combat à mains nues (désactivé) ne sont pas sur la fiche (Idan, 2026-11-02).
assert.deepEqual(placed.sort(),skills.filter(r=>r.domaine==="Martial"&&r.niveau==="Catégorie"&&r.mercenaire!==false).map(r=>r.nom).sort());
assert.deepEqual(layout.styles_de_combat,["Combat à une main","Combat à deux armes","Combat à deux mains","Boucliers"]);
assert.ok(layout.styles_de_combat.every(n=>layout.style.includes(n)));
assert.deepEqual(layout.discretion_et_pieges,["Discrétion","Pièges"],"pas des styles de combat (Idan, 2026-10-21)");
assert.ok(!layout.style.includes("Discrétion")&&!layout.style.includes("Pièges"));
for(const a of layout.armures) assert.equal(skills.find(r=>r.nom===a.nom)?.type_de_valeur,"Binaire",a.nom);
for(const n of layout.aptitudes) assert.equal(skills.find(r=>r.nom===n)?.type_de_valeur,"Binaire",n);
assert.ok(skills.some(r=>r.parent===layout.animal),"l'animal se déplie sur ses espèces");

// Onglet Magie : chaque école a deux opposées, réciproques, et les oppositions forment une seule boucle ;
// la roue peut donc poser chaque école en face de ses deux opposées.
const schools=skills.filter(r=>r.domaine==="Magie"&&r.niveau==="Catégorie");
const opposites=new Map(schools.map(r=>[r.nom,String(r.ecoles_opposees||"").split(",").map(x=>x.trim()).filter(Boolean)]));
for(const [name,list] of opposites){
  assert.equal(list.length,2,name);
  for(const o of list) assert.ok(opposites.get(o)?.includes(name),`${name} ↔ ${o}`);
}
const cycle=[schools[0].nom];
while(cycle.length<schools.length){
  const next=opposites.get(cycle.at(-1)).find(x=>!cycle.includes(x));
  assert.ok(next,"oppositions en une seule boucle");
  cycle.push(next);
}
assert.ok(opposites.get(cycle.at(-1)).includes(cycle[0]));
// Aura du capitaine (Idan, 2026-10-24) : sur sa fiche, à la place du salaire ; 35 % de son Courage + 25 % de son
// Charisme, équipement compris (le moteur fait le calcul).
{
  const ui=fs.readFileSync(path.join(__dirname,"..","prototype-web","ui.js"),"utf8");
  const from=ui.indexOf("function captainAuraBox"),to=ui.indexOf("\n}\n",from)+3;
  const constants={rows:[{code:"captain.aura.courage_ratio",valeur:0.35},{code:"captain.aura.charisma_ratio",valeur:0.25},
    {code:"captain.aura.range_hex",valeur:10}]};
  let asked=null;
  const engine={captainAuraBonus:unit=>{ asked=unit; return 31; }};
  const chief={id:1,stats:{Courage:50,Charisme:54}};
  const box=new Function("game","fmt","combatEngine",ui.slice(from,to)+"\nreturn captainAuraBox;")(
    {referenceData:{formulaConstants:constants}},v=>String(Math.round(v)),()=>engine)(chief);
  assert.equal(asked.character,chief,"le moteur calcule l'aura du capitaine, avec son équipement");
  assert.match(box,/<small>Aura du capitaine<\/small>/);
  assert.match(box,/ses alliés à 10 cases ou moins gagnent 35&nbsp;% de son Courage et 25&nbsp;% de son Charisme, équipement compris/);
  assert.match(box,/<strong>\+31 Courage<\/strong>/);
  assert.match(ui,/\?captainAuraBox\(c\)/,"le capitaine montre son aura au lieu du salaire");
  assert.doesNotMatch(ui,/ne touche ni salaire ni prime/);
}
// Onglet Caractéristiques (Idan, 2026-10-25) : au survol d'une valeur, un grand détail sur la largeur des trois colonnes,
// avec le nom et la valeur en tête, placé sous ou au-dessus de la ligne survolée.
{
  const ui=fs.readFileSync(path.join(__dirname,"..","prototype-web","ui.js"),"utf8");
  const css=fs.readFileSync(path.join(__dirname,"..","prototype-web","styles.css"),"utf8");
  assert.match(ui,/const head=`<span class="sheet-stat-pop-head"><strong>\$\{esc\(name\)\}<\/strong><b>\$\{fmt\(value\)\}<\/b><\/span>`;/);
  assert.match(ui,/function placeStatPopover\(value\)\{/);
  assert.match(ui,/\$\("dialog-content"\)\.addEventListener\("mouseover", placeStat\);/);
  assert.match(css,/\.sheet-stats \.sheet-stat-pop\{right:0;[^}]*font-size:16px/);
  assert.match(css,/\.sheet-stat-pop-head b\{color:#ffd77a;font:700 32px Georgia,serif\}/);
}
// Dialogues (Idan, 2026-10-25) : portrait de 400 px sur la gauche (recrutement, échanges, intendant).
{
  const css=fs.readFileSync(path.join(__dirname,"..","prototype-web","styles.css"),"utf8");
  assert.match(css,/\.talk-dialog--recruit\[open\]\{display:grid;grid-template-columns:400px minmax\(0,1fr\);grid-template-rows:auto minmax\(0,1fr\) auto;align-items:start;height:440px\}/);
  // Hauteur fixe (Idan, 2026-11-10) : le portrait ne zoome plus quand la conversation s'allonge.
  assert.match(css,/\.talk-dialog--recruit \.avatar-frame--talk\{width:400px;height:440px;min-height:0/);
  const html=fs.readFileSync(path.join(__dirname,"..","prototype-web","index.html"),"utf8");
  for(const id of ["recruit","steward","deal"]) assert.match(html,new RegExp(`<dialog id="${id}-talk-dialog" class="talk-dialog talk-dialog--recruit"`));
}
console.log("Fiche : textes d'origine, d'ascendance, des caractéristiques, des compétences et de la magie — OK");
