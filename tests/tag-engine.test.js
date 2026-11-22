"use strict";

// Le moteur des tags (doc 20 §11 et §12 ; Idan, 2026-11-22 : « je veux que le jeu lise les datas de l'atelier ») :
// le langage des calculs, le nettoyage des données, l'arbre des tests (tags à plusieurs parents, inactifs, catégories
// qui « gardent X »), la compagnie, puis les données de l'atelier sur des recrues du vrai générateur.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const ROOT=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(ROOT,file),"utf8");
const E=require(path.join(ROOT,"game-core","tag-engine.js"));

// ---- Le langage des calculs ----
const ev=(src,vals={})=>E.evalue(E.analyse(src),n=>vals[n]);
assert.equal(ev("1 + 2 * 3"),7);
assert.equal(ev("(1 + 2) * 3"),9);
assert.equal(ev("-3 + 5"),2);
assert.equal(ev("10 / 0"),0,"diviser par 0 donne 0");
assert.equal(ev("max(1, 4, 2) + min(3, 9) + abs(-2) + arrondi(2.6)"),12);
assert.equal(ev("somme(1, vrai, 2)"),4);
assert.equal(ev("nombre(sorts)",{sorts:["a","b"]}),2);
assert.equal(ev("a > 2 et b < 1",{a:3,b:0}),true);
assert.equal(ev("a > 2 && non b",{a:3,b:true}),false);
assert.equal(ev("a ou b",{a:false,b:"x"}),true);
assert.equal(ev("a >= 3 and not b or faux",{a:3,b:false}),true,"les mots anglais aussi");
assert.equal(ev("sorts contient « mur de flammes »",{sorts:["Mur de Flammes"]}),true);
assert.equal(ev('monture contient "papillon"',{monture:"Papillon géant"}),true);
assert.equal(ev('peuple = "Elfe"',{peuple:"elfe "}),true,"sans majuscules ni espaces");
assert.equal(ev('culture = "Terres des Deux Fleuves"',{culture:"Terres des deux fleuves"}),true);
assert.equal(ev('peuple != "Elfe"',{peuple:"Nain"}),true);
assert.equal(ev("x > 1",{x:"1,5"}),true,"un texte chiffré se lit comme un nombre");
assert.equal(ev("a = vrai",{a:1}),true);
for(const [src,msg] of [["1 +","calcul incomplet"],["inconnu(3)","fonction inconnue « inconnu »"],['"abc',"guillemet non fermé"],
  ["","calcul vide"],["1 2","« 2 » en trop"],["a # b","caractère inattendu « # »"],["(1 + 2","« ) » attendu"]])
  assert.throws(()=>E.analyse(src),e=>e instanceof E.ErreurCalcul&&e.message===msg,src);
assert.throws(()=>ev("x + 1",{x:"abc"}),e=>e instanceof E.ErreurCalcul&&e.message==="« abc » n'est pas un nombre");
assert.deepEqual([...E.variablesDe(E.analyse("a + max(b, c.d) > seuil"))].sort(),["a","b","c.d","seuil"]);
assert.equal(E.cle("Base éclaireur vétéran"),"base_eclaireur_veteran");
assert.equal(E.norm("  Élite "),"elite");

// ---- Le nettoyage des données ----
const sale=E.clean({
  tags:[{id:"a",nom:"A",parents:["a","zz"]},{id:"b",nom:"B",parents:["a","a"],rang:"2",garder:"0",inactif:1},{nom:""}],
  tests:[{id:"t1",type:"niveau",calcul:"x"},{id:"t2",si:{test:"t3"}},{id:"t3",si:{test:"t2"}},{id:"t4",si:{test:"t1",rep:"?"}},
    {id:"t5",oui:["a","zz","a"],si:{test:"t5"}}],
  constantes:[{nom:"seuil",valeur:"abc"}]});
assert.deepEqual(sale.tags.map(t=>[t.id,t.nom,t.parents,t.rang,t.garder,t.inactif]),
  [["a","A",[],null,null,false],["b","B",["a"],2,null,true],["x1","Sans nom",[],null,null,false]]);
const T=id=>sale.tests.find(x=>x.id===id);
assert.deepEqual(T("t1").paliers.map(p=>[p.de,p.nom]),[[null,"Bas"],[50,"Haut"]],"un test à niveaux reçoit deux paliers");
assert.equal(T("t2").si,null,"une boucle de conditions est coupée");
assert.deepEqual(T("t3").si,{test:"t2",rep:"oui"});
assert.equal(T("t4").si.rep,T("t1").paliers[0].id,"un palier inconnu → le premier");
assert.equal(T("t5").si,null,"un test ne dépend pas de lui-même");
assert.deepEqual(T("t5").oui,["a"]);
assert.equal(sale.constantes[0].valeur,0);
assert.equal(E.clean({tags:[{}]},{uid:()=>"u1"}).tags[0].id,"u1");

// ---- L'arbre des tests ----
const doc=E.clean({
  tags:[
    {id:"role",nom:"Rôle",groupe:true},
    {id:"soin",nom:"Soin",parents:["role"]},
    {id:"soigneur",nom:"Soigneur",parents:["soin"],rang:1},
    {id:"reconnu",nom:"Soigneur reconnu",parents:["soigneur"],rang:2},
    {id:"tir",nom:"Tireur",groupe:true,garder:1},
    {id:"archer",nom:"Archer",parents:["tir"],rang:1},
    {id:"sniper",nom:"Sniper",parents:["archer"],rang:3},
    {id:"salve",nom:"Maître de la salve",parents:["archer"],rang:3},
    {id:"pieges",nom:"Poseur de pièges",parents:["role"],inactif:true},
    {id:"demineur",nom:"Démineur",parents:["pieges"]},
    // Deux parents : il tombe dès que l'un tombe.
    {id:"mixte",nom:"Soigneur piégeur",parents:["soigneur","pieges"]},
  ],
  tests:[
    {id:"t-soin",nom:"Soin ?",calcul:"soins >= 1",non:["soin"]},
    {id:"t-reconnu",nom:"Reconnu ?",calcul:"soins >= seuil_reconnu",non:["reconnu"],si:{test:"t-soin",rep:"oui"}},
    {id:"t-tir",nom:"Tir",type:"niveau",calcul:"precision",paliers:[{id:"p0",nom:"Faible",elimine:["archer"]},{id:"p1",de:60,nom:"Bon",elimine:["sniper"]},{id:"p2",de:130,nom:"Excellent"}]},
    {id:"t-salve",nom:"Salve ?",calcul:"repetable",non:["salve"],si:{test:"t-tir",rep:"p1"}},
    {id:"t-manuel",nom:"À la main"},
  ],
  constantes:[{nom:"Seuil reconnu",valeur:3}]});
const tree=E.createTagTree(doc);
const ids=list=>list.map(t=>t.id);
const run=values=>tree.tags(values);

// Rien : il tombe partout ; les tests du dessous ne sont pas posés.
let r=run({soins:0,precision:10,repetable:false});
assert.deepEqual(ids(r.restent),[]);
assert.deepEqual(ids(r.affiches),[]);
assert.equal(r.motif.get("soin"),"1. Soin ? → non");
assert.equal(r.motif.get("soigneur"),"son parent « Soin » est éliminé");
assert.equal(r.motif.get("archer"),"2. Tir → Faible");
assert.equal(r.motif.get("pieges"),"tag inactif (pas encore dans le jeu)");
assert.equal(r.motif.get("demineur"),"son parent « Poseur de pièges » est éliminé");
const rep=id=>r.reps.find(x=>x.x.id===id);
assert.deepEqual([rep("t-reconnu").num,rep("t-reconnu").saute],["1.1","posé seulement si « Soin ? » → oui"]);
assert.deepEqual([rep("t-salve").num,rep("t-salve").saute],["2.1","posé seulement si « Tir » → Bon"]);
assert.deepEqual([rep("t-manuel").num,rep("t-manuel").a,rep("t-manuel").rep,rep("t-manuel").libelle],["3",{manuel:true},undefined,"sans réponse"]);

// Le meilleur : la catégorie Tireur ne garde que son tag de plus haut rang (à rang égal, l'ordre de la liste).
r=run({soins:5,precision:150,repetable:true});
assert.deepEqual(ids(r.restent),["soin","soigneur","reconnu","archer","sniper","salve"]);
assert.deepEqual(ids(r.affiches),["reconnu","sniper"],"le plus bas de la branche Soin, le plus haut rang du Tireur");
assert.equal(r.motif.get("mixte"),"son parent « Poseur de pièges » est éliminé","un parent tombé suffit");
assert.equal(r.reps.find(x=>x.x.id==="t-salve").saute,"posé seulement si « Tir » → Bon");

// Entre les deux.
r=run({soins:2,precision:80,repetable:false});
assert.equal(r.motif.get("reconnu"),"1.1. Reconnu ? → non");
assert.equal(r.motif.get("sniper"),"2. Tir → Bon");
assert.equal(r.motif.get("salve"),"2.1. Salve ? → non");
assert.deepEqual(ids(r.affiches),["soigneur","archer"]);

// Une variable inconnue est une erreur du test (sans réponse), pas un plantage.
assert.deepEqual(tree.answer(doc.tests[0],{autre:1}),{erreur:"variable inconnue « soins »"});
// Une réponse forcée (l'atelier) passe par solve.
r=tree.solve(x=>x.id==="t-soin"?{a:null,rep:true,force:true}:{a:tree.answer(x,{soins:0,precision:0,repetable:false}),rep:tree.answer(x,{soins:0,precision:0,repetable:false}).rep});
assert.equal(r.motif.has("soin"),false);
assert.equal(r.reps.find(x=>x.x.id==="t-soin").force,true);
assert.equal(r.motif.get("reconnu"),"1.1. Reconnu ? → non");

// ---- La compagnie ----
const comp=E.withCompany({"carac.force":50,"comp.haches":10,"nom":"A"},[{"carac.force":70},{"comp.haches":5}],3);
assert.equal(comp["compagnie.etoiles"],3);
assert.equal(comp["compagnie.taille"],3);
assert.equal(comp["compagnie.max.carac.force"],70);
assert.equal(comp["compagnie.max.comp.haches"],10);
assert.equal("compagnie.max.nom" in comp,false);
assert.equal(E.withCompany({})["compagnie.etoiles"],1);

// ---- L'atelier utilise ce moteur (une seule source) ----
const atelier=read("scripts/atelier-tags/atelier.src.html");
assert.ok(atelier.includes("<script>@@MOTEUR@@</script>")&&atelier.includes("const E=MercenairesTagEngine;"));
assert.ok(!/function (lexer|analyse|propre)\(/.test(atelier)&&!/const (MOTS|FONCTIONS)=/.test(atelier),"pas de seconde copie du langage dans l'atelier");
assert.ok(read("scripts/atelier-tags/construit.js").includes("game-core\",\"tag-engine.js\""));

// ---- Les données de l'atelier sur des recrues du jeu ----
const source=read("prototype-web/reference-data.js");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,JSON.parse(read("data/reference/"+file))]));
const R=file=>require(path.join(ROOT,"game-core",file));
let seed=20261122;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const gen=R("mercenary-generator.js").createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const engine=R("combat-engine.js").createCombatEngine(reference,{});
const magic=R("magic.js").createMagicRules({reference,combat:engine});
const tagVars=E.createTagVariables({reference,engine,gear:R("equipment-effects.js").createEquipmentEffects({engine}),magic,
  stars:R("stars.js").createStarRules({reference}),profile:R("mercenary-profile.js").createProfileRules({reference,engine,magic})});
const captain=gen.createCaptain({id:1});
const recrues=Array.from({length:40},(_,i)=>tagVars.of(gen.createMercenary({id:i+2,captain})));
const cles=Object.keys(recrues[0]).sort();
assert.ok(cles.length>300,"toutes les variables de l'atelier");
for(const v of recrues) assert.deepEqual(Object.keys(v).sort(),cles,"la même liste de variables pour chacun");
const VARS=new Set(tagVars.vars().map(x=>x.k));
for(const k of ["carac.force","comp.armes_de_tir","tir.precision","tir.puissance","tir.dex_vit","tir.repetable","pm","sorts","nb_sorts","moy.cout.soin","lancers.soin"])
  assert.ok(VARS.has(k),k);

const donnees=E.clean(JSON.parse(read("data/reference/tag-workshop.json")));
const arbre=E.createTagTree(donnees);
// Chaque calcul se lit, et ne parle que de variables du jeu, de la compagnie ou de constantes de l'atelier.
for(const x of donnees.tests.filter(x=>x.calcul.trim())){
  const vars=E.variablesDe(E.analyse(x.calcul));
  for(const n of vars) assert.ok(VARS.has(n)||n.startsWith("compagnie.")||arbre.constante(n),x.nom+" : « "+n+" »");
}
const tireur=new Set(arbre.descendants(donnees.tags.find(t=>t.nom.trim()==="Tireur").id));
let tireurs=0;
for(const e of [1,3]) for(const v of recrues){
  const out=arbre.tags(E.withCompany(v,recrues.filter(o=>o!==v),e));
  for(const x of out.reps) if(!x.saute) assert.equal(x.a.erreur,undefined,x.x.nom+" : "+x.a.erreur);
  for(const t of out.affiches){ assert.equal(t.groupe,false); assert.equal(out.motif.has(t.id),false); }
  for(const t of donnees.tags.filter(t=>t.inactif)) assert.ok(out.motif.has(t.id),"inactif : "+t.nom);
  if(e===1&&out.affiches.some(t=>tireur.has(t.id))) tireurs++;
}
assert.ok(tireurs>0,"des tireurs parmi les recrues à 1 étoile");

console.log("tag-engine tests ok ("+recrues.length+" recrues, "+donnees.tests.length+" tests, "+tireurs+" tireurs à 1★)");
