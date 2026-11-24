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
// Arrondi au-dessus et au-dessous (Idan, 2026-11-23 : « arr sup (nombre d'étoiles de la compagnie/5) »).
assert.deepEqual(["arrondi_sup(1/5)","arrondi_sup(5/5)","arrondi_sup(6/5)","arrondi_inf(9/5)"].map(ev),[1,1,2,1]);
assert.equal(ev("somme(3 >= 2, 1 >= 2, 5 >= 2)"),2,"compter des conditions vraies");
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
assert.deepEqual(sale.tags.map(t=>[t.titre,t.court,t.titre_fem,t.court_fem,t.seul]),[["","",false,false,false],["","",false,false,false],["","",false,false,false]],"pas encore de formes de titre");
assert.deepEqual(sale.titres,{longueur_max:40,suivants_max:2,familles:[],speciaux:[]},"les réglages des titres par défaut");
assert.deepEqual(E.clean({tags:[{id:"a"},{id:"b"}],titres:{longueur_max:"44",suivants_max:9,familles:["b","zz"],speciaux:[{id:"s",tags:["a","zz","b"],titre:"X",court_fem:1}]}}).titres,
  {longueur_max:44,suivants_max:5,familles:["b"],speciaux:[{id:"s",tags:["a","b"],titre:"X",court:"",titre_fem:false,court_fem:true}]},"bornés, tags inconnus retirés");

// ---- Le titre (Idan, 2026-11-24) : un tag, son nom ; plusieurs, le titre du tag qui mène puis des mots courts ----
{
  const d=E.clean({tags:[
    {id:"fait",groupe:true},{id:"est",groupe:true},{id:"role",groupe:true},{id:"tir",parents:["fait"],groupe:true},{id:"cac",parents:["fait"],groupe:true},
    {id:"archer",nom:"Archer",parents:["tir"],titre:"Archer",court:"à l'arc",rang:1},
    {id:"arbalete",nom:"Arbalétrier",parents:["tir"],titre:"Arbalétrier",court:"à l'arbalète",court_fem:true,rang:1},
    {id:"eclaireur",nom:"Éclaireur",parents:["role"],titre:"Éclaireur",court:"{éclaireur|éclaireuse}"},
    {id:"brute",nom:"Grosse Brute",parents:["est"],titre:"Grosse brute",titre_fem:true,court:"{costaud|costaude}"},
    {id:"hopital",nom:"Un hôpital",parents:["role"],titre:"Hôpital ambulant",court:"guérisseur",seul:true},
    {id:"perce",nom:"Perce-armure",parents:["cac"],titre:"Perce-armure",court:"perce-armure",rang:2},
    {id:"loin",nom:"De loin et de près",parents:["cac","tir"],court:"polyvalent",rang:2},
    {id:"veinard",nom:"Veinard",parents:["est"],titre:"Veinard",court:"généralement {veinard|veinarde} / {chanceux|chanceuse}"},
    {id:"roc",nom:"Roc",parents:["est"],titre:"Roc",court:"robuste"},
    {id:"peur",nom:"Sans peur",parents:["est"],titre:"Casse-cou",court:"sans peur"},
    {id:"increvable",nom:"Increvable",parents:["est"],titre:"Increvable",court:"increvable"},
    {id:"muet",nom:"Muet",parents:["est"]}],
    titres:{longueur_max:40,familles:["cac","role","tir","est"],speciaux:[{id:"chat",tags:["veinard","increvable"],titre:"Chat à neuf vies",court:"à neuf vies"},
      {id:"trompe",tags:["veinard","roc"],titre:"Trompe-la-mort"},{id:"bayard",tags:["veinard","peur"],court:"sans peur et sans malchance"}]}});
  const p=id=>d.tags.find(t=>t.id===id), titre=(...ids)=>E.composeTitle(d,ids.map(p))?.name??null;
  assert.equal(titre(),null);
  assert.equal(titre("loin"),"De loin et de près","un seul tag : son nom");
  assert.equal(titre("veinard","archer"),"Archer généralement veinard","ce qu'il fait mène, ce qu'il est suit");
  assert.equal(titre("archer","perce"),"Perce-armure à l'arc","l'ordre des familles (CAC, puis tir) ; l'arme en complément");
  // Les exemples d'Idan (2026-11-24) : le complément d'abord, l'accord avec le dernier nom, la variante qui tient.
  assert.equal(titre("archer","eclaireur","veinard"),"Éclaireur à l'arc généralement veinard");
  assert.equal(titre("arbalete","eclaireur","veinard"),"Éclaireur à l'arbalète chanceuse","« généralement veinarde » ne tient pas");
  assert.equal(titre("perce","veinard","peur"),"Perce-armure sans peur et sans malchance");
  assert.equal(titre("hopital","eclaireur","veinard"),"Hôpital ambulant","un titre seul");
  assert.equal(titre("brute","veinard"),"Grosse brute généralement veinarde","l'accord avec un titre au féminin");
  assert.equal(titre("eclaireur","brute"),"Éclaireur costaud");
  assert.equal(titre("roc","peur","archer"),"Archer robuste et sans peur","« et » avant le dernier, deux mots au plus");
  assert.equal(titre("loin","perce","peur"),"Perce-armure sans peur et polyvalent","sans titre, il suit avec ce qu'il est");
  assert.equal(titre("loin","veinard"),"Veinard polyvalent","sans titre, il ne mène pas");
  assert.equal(titre("muet","veinard"),"Veinard","sans mot court, il ne suit pas");
  assert.equal(titre("muet","loin"),"De loin et de près","personne n'a de titre : le premier (rang le plus haut), sous son nom");
  assert.equal(titre("veinard","increvable"),"Chat à neuf vies","un titre spécial mène");
  assert.equal(titre("archer","veinard","increvable","roc"),"Archer à neuf vies robuste","ou suit, en complément, avant les autres mots");
  assert.equal(titre("veinard","roc","archer"),"Archer généralement veinard et robuste","un titre spécial sans mot court ne suit pas : les tags suivent seuls");
  assert.deepEqual(E.composeTitle(d,["veinard","increvable","peur"].map(p)).speciaux,["chat"]);
  assert.deepEqual(E.composeTitle(d,["archer","veinard","muet"].map(p)).tags.map(t=>t.id),["archer","veinard"],"les tags du titre");
  // Une ligne sur la fiche au survol : un mot qui fait dépasser longueur_max est sauté.
  const court=E.clean({...d,titres:{...d.titres,longueur_max:24}});
  const t2=(...ids)=>E.composeTitle(court,ids.map(id=>court.tags.find(t=>t.id===id))).name;
  assert.equal(t2("perce","veinard","roc"),"Perce-armure chanceux","« Perce-armure trompe-la-mort »… non : spécial sans mot court ; la variante courte");
  assert.equal(t2("perce","roc","peur"),"Perce-armure robuste","« Perce-armure robuste et sans peur » (34) ne tient pas");
  const un=E.clean({...d,titres:{...d.titres,suivants_max:1}});
  assert.equal(E.composeTitle(un,["archer","roc","peur"].map(id=>un.tags.find(t=>t.id===id))).name,"Archer robuste");
}

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

// ---- Les tags qui regroupent (Idan, 2026-11-24 : le Bélier) ----
// Un tag ne s'efface que devant un enfant réellement affiché : un enfant écarté par une catégorie « garder 1 » ne cache
// pas son parent. Bélier (Charge + Perce-armure) remplace les deux ; un spécialiste plus haut le fait s'effacer.
{
  const d=E.clean({tags:[
    {id:"cac",nom:"CAC",groupe:true},
    {id:"charge",nom:"Spécialiste de la charge",parents:["cac"]},
    {id:"legende",nom:"Charge légendaire",parents:["charge"]},
    {id:"armures",nom:"Armures",groupe:true,garder:1,parents:["cac"]},
    {id:"perce",nom:"Perce-armure",parents:["armures"],rang:2},
    {id:"pro",nom:"Ouvre-boîte professionnel",parents:["perce"],rang:4},
    {id:"destructeur",nom:"Destructeur d'armure",parents:["pro"],rang:6},
    {id:"belier",nom:"Bélier",parents:["perce","charge"],rang:3},
    {id:"bl1",nom:"Bélier légendaire",parents:["belier","legende"],rang:5},
    {id:"bl2",nom:"Bélier légendaire",parents:["belier","pro"],rang:5}]});
  const t=E.createTagTree(d);
  const vus=garde=>{ const motif=new Map(d.tags.filter(x=>!garde.includes(x.id)&&!x.groupe).map(x=>[x.id,"x"]));
    for(let encore=true;encore;){ encore=false; for(const x of d.tags) if(!motif.has(x.id)&&x.parents.some(p=>motif.has(p))){ motif.set(x.id,"p"); encore=true; } }
    return [...new Set(t.displayed(motif).affiches.map(x=>x.nom))].sort(); };
  assert.deepEqual(vus(["charge","perce","belier"]),["Bélier"],"le Bélier remplace ses deux parents");
  assert.deepEqual(vus(["charge","legende","perce","belier","bl1"]),["Bélier légendaire"]);
  assert.deepEqual(vus(["charge","perce","pro","belier","bl2"]),["Bélier légendaire"],"Charge + Ouvre-boîte professionnel");
  assert.deepEqual(vus(["charge","perce","pro","destructeur","belier","bl2"]),["Destructeur d'armure","Spécialiste de la charge"],
    "le spécialiste plus haut n'est pas bloqué, et la charge reste visible");
  assert.deepEqual(vus(["charge","legende","perce","pro","destructeur","belier","bl1","bl2"]),["Charge légendaire","Destructeur d'armure"]);
  assert.deepEqual(vus(["charge"]),["Spécialiste de la charge"]);
}

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
// L'onglet des titres (Idan, 2026-11-24) : la composition du jeu, les deux formes de chaque tag, les titres spéciaux.
assert.ok(atelier.includes('data-onglet="titres"')&&atelier.includes('id="v-titres"'));
assert.ok((atelier.match(/E\.composeTitle\(doc,/g)||[]).length>=2,"l'essai de l'onglet et celui de la recrue");
assert.ok(atelier.includes('id="tag-titre"')&&atelier.includes('id="tag-court"'),"le tag choisi : son titre et son mot court");
assert.ok(atelier.includes('inactif:false,titre:"",court:""'),"un nouveau tag a ses deux formes, vides");
assert.ok(!/function composeTitle\(/.test(atelier),"pas de seconde copie de la composition");

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
for(const k of ["carac.force","comp.armes_de_tir","tir.precision","tir.puissance","tir.dex_vit","tir.repetable","pm","sorts","nb_sorts","moy.cout.soin","lancers.soin",
  "nb_ecoles_sorts","moy.chance.sorts","moy.cout.sorts","lancers.sorts"])
  assert.ok(VARS.has(k),k);
// Par école (Idan, 2026-11-23 : tags des écoles de magie) : ses sorts de l'école, leur réussite et leur coût moyens, et
// combien il peut en lancer avec sa réserve.
const ECOLES=["vie","feu","eau","transmutation","foudre","telekinesie","illusion","necromancie","invocation"];
for(const e of ECOLES) for(const k of ["sorts.ecole.","moy.chance.ecole.","moy.cout.ecole.","lancers.ecole."]) assert.ok(VARS.has(k+e),k+e);
for(const v of recrues){
  assert.equal(ECOLES.reduce((t,e)=>t+v["sorts.ecole."+e],0),v.nb_sorts,"ses sorts, école par école");
  assert.equal(ECOLES.filter(e=>v["sorts.ecole."+e]>0).length,v.nb_ecoles_sorts);
  for(const e of ECOLES) if(v["moy.cout.ecole."+e]>0) assert.equal(v["lancers.ecole."+e],Math.floor(v["carac.reserve_de_mana"]/v["moy.cout.ecole."+e]));
}
assert.ok(recrues.some(v=>v.nb_ecoles_sorts>=1&&v["moy.chance.sorts"]>0),"des recrues qui lancent des sorts");
// La maîtrise de l'arme et du bouclier portés, arme + catégorie (Idan, 2026-11-24 : tags du Tank).
for(const k of ["arme1.maitrise","arme2.maitrise","arme1.bouclier.maitrise","arme2.bouclier.maitrise"]) assert.ok(VARS.has(k),k);
{
  const c=gen.createMercenary({id:900,captain}), v=tagVars.of(c), mk=c.skills.martial;
  const items=new Map(c.items.map(it=>[it.id,it])), main=items.get(c.equipment.slots.weapon_set_1_main);
  if(main) assert.ok(Math.abs(v["arme1.maitrise"]-((Number(mk[main.name])||0)+(Number(mk[main.category])||0)))<0.11,"arme + catégorie");
  for(const r of recrues){ if(!r["arme1.bouclier"]) assert.equal(r["arme1.bouclier.maitrise"],0); if(!r.arme1) assert.equal(r["arme1.maitrise"],0); }
  assert.ok(recrues.some(r=>r["arme1.maitrise"]>0),"des recrues armées");
}
// Le corps à corps (Idan, 2026-11-24 : tags de la catégorie CAC) : les valeurs du combat, au meilleur set de contact.
{
  const K=["contact.puissance","contact.precision","contact.force_charge","contact.bonus_charge","contact.percee_plates","contact.percee_ecailles","contact.deux_armes","contact.fleau"];
  for(const k of K) assert.ok(VARS.has(k),k);
  const engine=R("combat-engine.js").createCombatEngine(reference,{});
  let vus=0;
  for(let i=0;i<30;i++){
    const c=gen.createMercenary({id:950+i,captain}), v=tagVars.of(c);
    const sets=[1,2].map(set=>({set,u:{character:c,activeSet:set}})).filter(x=>{ const it=engine.activeWeaponItem(x.u); return it&&engine.weaponTemplate(it)&&it.combatFamily!=="ranged"; });
    if(!sets.length){ assert.equal(v["contact.puissance"],0); assert.equal(v["contact.force_charge"],0); continue; }
    vus++;
    const best=Math.max(...sets.map(x=>engine.attackPower(x.u,"melee")));
    assert.ok(Math.abs(v["contact.puissance"]-best)<0.06,"puissance au contact = celle du combat");
    assert.ok(v["contact.force_charge"]>v["contact.puissance"],"la charge ajoute à la puissance");
    assert.ok(v["contact.percee_ecailles"]>=v["contact.percee_plates"],"les écailles se passent mieux que les plates");
    assert.ok([1,2].includes(v["contact.bonus_charge"]));
  }
  assert.ok(vus>10,"des recrues armées pour le contact");
}
// Les moyennes des soins pour chaque tag de sort (Idan, 2026-11-23 : sorts de soutien et entraves).
for(const t of ["soutien.enchantements","entrave.immobilisation","entrave.affaiblissement","entrave.demoralisateur"])
  for(const k of ["moy.chance.","moy.ecole.","lancers."]) assert.ok(VARS.has(k+t),k+t);
for(const v of recrues) for(const t of ["soutien.enchantements","entrave.immobilisation"]){
  if(!v["sorts."+t]){ assert.equal(v["lancers."+t],0); assert.equal(v["moy.chance."+t],0); continue; }
  assert.equal(v["lancers."+t],Math.floor(v["carac.reserve_de_mana"]/v["moy.cout."+t]));
  assert.ok(v["moy.chance."+t]>=0&&v["moy.chance."+t]<=v["chance."+t],"la moyenne ne dépasse pas la meilleure");
}

const donnees=E.clean(JSON.parse(read("data/reference/tag-workshop.json")));
const arbre=E.createTagTree(donnees);
// Les titres de l'atelier : chaque tag peut mener ou suivre ; deux tags, quels qu'ils soient, tiennent sur une ligne.
{
  const vrais=donnees.tags.filter(t=>!t.groupe);
  for(const t of vrais) assert.ok(t.titre.trim()||t.court.trim(),"titre ou mot court : "+t.nom);
  assert.ok(donnees.titres.familles.length>=8,"les familles : qui mène");
  for(const s of donnees.titres.speciaux) assert.ok(s.tags.length>=2&&(s.titre.trim()||s.court.trim()),"titre spécial "+s.id);
  for(const a of vrais) for(const b of vrais) if(a!==b){
    const t=E.composeTitle(donnees,[a,b]);
    assert.ok(t.name.length<=donnees.titres.longueur_max,a.nom+" + "+b.nom+" : "+t.name);
  }
}
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

// ---- Les auras de courage (Commandement, Idan, 2026-11-22) ----
{
  const m=gen.createMercenary({id:500,captain});
  const unit={character:m,activeSet:1};
  const sans=tagVars.of(m);
  assert.equal(sans.role,"");
  assert.equal(sans["aura.officier"],0,"une recrue n'est ni capitaine ni lieutenant");
  const cap=tagVars.of(m,{role:"capitaine"}), lt=tagVars.of(m,{role:"lieutenant"});
  assert.equal(cap.role,"capitaine");
  assert.equal(cap["aura.officier"],engine.captainAuraBonus(unit),"capitaine : 0,35 × Courage + 0,25 × Charisme");
  assert.equal(lt["aura.officier"],engine.lieutenantAuraBonus(unit),"lieutenant : la moitié");
  assert.ok(cap["aura.officier"]>lt["aura.officier"]&&lt["aura.officier"]>0);
  assert.equal(cap["aura.courage"],Math.max(cap["aura.officier"],cap["bonus.commandement"]));
  // Le fouet : 5 / 10 / 15 / 20 % selon le tier, dans l'un ou l'autre set.
  for(const [tier,pct] of [[1,5],[3,15],[4,20]]){
    const c=JSON.parse(JSON.stringify(m)), it={...gen.createItemByName("weapon","Fouet",tier),id:"fouet-"+tier};
    c.items=[...(c.items||[]),it]; c.equipment.slots.weapon_set_2_main=it.id;
    assert.equal(tagVars.of(c)["aura.fouet"],pct,"fouet T"+tier);
  }
  // Le sort de courage : son bonus (magic.bonus), le meilleur de ses sorts de commandement.
  const mage=JSON.parse(JSON.stringify(m)); mage.spells=[...(mage.spells||[]),{code:"mass_courage"},{code:"illusory_support"}];
  mage.skills.magic={...(mage.skills.magic||{}),Illusion:60};
  const vm=tagVars.of(mage), um={character:mage,activeSet:1};
  assert.equal(vm["bonus.commandement"],Math.max(magic.bonus(um,"mass_courage"),magic.bonus(um,"illusory_support")));
  assert.ok(vm["bonus.commandement"]>=30);
  assert.equal(vm["aura.courage"],vm["bonus.commandement"],"sans être officier : le sort");
  assert.ok(E.comparableKey("aura.courage")&&!E.comparableKey("bonus.commandement"));
  assert.ok("compagnie.max.aura.courage" in E.withCompany(vm,[cap],3),"la plus forte aura de la compagnie");
}

console.log("tag-engine tests ok ("+recrues.length+" recrues, "+donnees.tests.length+" tests, "+tireurs+" tireurs à 1★)");
