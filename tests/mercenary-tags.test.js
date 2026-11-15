"use strict";

// Tags de la fiche mercenaire, phase 1 (Idan, 2026-11-12 ; doc 20) : « Ajoute un onglet dans la fiche mercenaire avec les
// tags qu'on peut cocher décocher. 3 Col : Occupations principales / Equipement / Rôle au combat. Présentation en
// accordéon avec cat et sous cat. On fait 3 grandes couleurs : Tons rouges / Tons verts / Tons bleus. Pas de case à
// cocher. Des tags grisés ou pas grisés. Une petite flèche à droite du tag pour ouvrir la sous catégorie. Tous les tags
// sont cochables (on peut taguer juste animal). » ; « Les sous tags allument les tags. » ; trois niveaux (« que le mec
// puisse mettre arc et épée, mets arc plus important ») et les tags de l'intendant (un point, ses refus retenus).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createTagRules,slug}=require("../game-core/mercenary-tags.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(ROOT,file),"utf8");
const source=read("prototype-web/reference-data.js");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.mercenaryTags,"mercenary-tags.json","les tags sont chargés avec les autres données");
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,JSON.parse(read("data/reference/"+file))]));
const rules=createTagRules({reference});

const names=nodes=>nodes.map(n=>n.nom);
const find=(nodes,...path)=>path.reduce((list,name)=>{
  const node=(Array.isArray(list)?list:list.enfants).find(n=>n.nom===name);
  assert.ok(node,"tag introuvable : "+path.join(" > "));
  return node;
},nodes);
const all=[];
const walk=node=>{ all.push(node); node.enfants.forEach(walk); };
for(const col of rules.columns) col.tags.forEach(walk);

// Trois colonnes, trois couleurs.
assert.deepEqual(rules.columns.map(c=>[c.code,c.nom,c.teinte]),[
  ["occupation","Occupations principales","rouge"],["equipment","Équipement","vert"],["role","Rôle au combat","bleu"]]);
const [occupation,equipment,role]=rules.columns.map(c=>c.tags);

// Occupations principales.
assert.deepEqual(names(occupation),["Mission","Garde du corps","Job","Entraînement","Poste"]);
assert.deepEqual(names(find(occupation,"Mission").enfants),["Camps","Chasses"]);
assert.deepEqual(names(find(occupation,"Mission","Camps").enfants),
  ["Gobelins","Orcs","Hommes-bêtes","Voleurs","Ogres","Culte des morts","Cour de sang"],"un camp par faction, tiré des ordres de mission");
assert.deepEqual(names(find(occupation,"Mission","Chasses").enfants),["Loups","Licornes","Cerbères","Chiens sauvages","Papillons"]);
assert.equal(find(occupation,"Garde du corps").enfants.length,0,"la garde du corps, sans sous-tags");
assert.deepEqual(names(find(occupation,"Job").enfants),["Bûcheron","Mines","Palais des plaisirs"],"pas la Cave : on n'y décide rien");
const training=find(occupation,"Entraînement");
for(const b of reference.campBuildings.rows){
  for(const name of [b.entraine,b.ecole].filter(Boolean)) assert.ok(names(training.enfants).includes(name),"tout ce que le camp entraîne : "+name);
}
for(const name of ["Port d’armure légère","Port d’armure intermédiaire","Port d’armure lourde","Empoisonnement des armes"]) assert.ok(names(training.enfants).includes(name),"les apprentissages : "+name);
assert.deepEqual(names(training.enfants).slice(0,3),["Force","Endurance","Vitesse"],"rangés par ce qu'on fait progresser");
assert.ok(names(find(occupation,"Entraînement","Feu").enfants).includes("Boule de feu"),"un sort, sous son école (sous-sous-tag)");
assert.equal(find(occupation,"Entraînement","Feu").enfants.length,reference.spells.rows.filter(s=>s.ecole==="Feu").length);
assert.deepEqual(names(find(occupation,"Entraînement","Équidés").enfants),["Destrier","Licorne","Pégase"],"les montures à apprivoiser");
assert.equal(find(occupation,"Entraînement","Force").enfants.length,0);
assert.deepEqual(names(find(occupation,"Poste").enfants),
  ["Intendant","Médecin","Directeur de l’École","Doctore","Vétéran","Maître des lames","Alchimiste","Maître des plaisirs","Dresseur","Officier"],"Officier, pas lieutenant");

// Équipement : ce qu'il porte ou doit porter ; ni monture ni potion ; les styles de combat (« on a oublié les styles de
// combat ! »), les boucliers sous Bouclier.
assert.deepEqual(names(equipment),["Arme","Style de combat","Armure","Caractéristiques"]);
assert.deepEqual(names(find(equipment,"Arme").enfants),["Lames longues","Lames courtes","Armes d’hast","Haches","Armes contondantes",
  "Armes articulées","Bâtons","Armes de tir","Armes à feu"]);
assert.ok(names(find(equipment,"Arme","Lames longues").enfants).includes("Épée longue"));
assert.deepEqual(names(find(equipment,"Style de combat").enfants),["Une main","Deux armes","Deux mains","Bouclier"]);
assert.deepEqual(find(equipment,"Style de combat").enfants.map(n=>n.competence),["Combat à une main","Combat à deux armes","Combat à deux mains","Boucliers"],
  "chaque style garde sa compétence");
assert.deepEqual(names(find(equipment,"Style de combat","Bouclier").enfants),["Écu","Rondache","Pavois"]);
const weaponTags=[...find(equipment,"Arme").enfants.flatMap(f=>names(f.enfants)),...names(find(equipment,"Style de combat","Bouclier").enfants)];
assert.deepEqual([...weaponTags].sort(),reference.weapons.rows.map(w=>w.nom).sort(),"chaque arme une fois, sous sa famille (les boucliers sous Bouclier)");
assert.deepEqual(names(find(equipment,"Armure").enfants),["Légère","Intermédiaire","Lourde","Vêtements"]);
assert.deepEqual(names(find(equipment,"Armure","Lourde").enfants),["Armure de plates","Armure d'écailles"]);
assert.equal(find(equipment,"Armure","Vêtements").enfants.length,0,"les vêtements, directement");
const bonus=names(find(equipment,"Caractéristiques").enfants);
for(const key of ["rings","amulets","belts","capes","gloves","helmets","pants","boots"]) for(const r of reference[key].rows) assert.ok(bonus.includes(r.caracteristique),"tout ce qu'un objet augmente : "+r.caracteristique);
for(const name of ["Intelligence","Puissance magique","Feu","Réserve de mana","Charisme"]) assert.ok(bonus.includes(name),"le mage du feu, le Palais : "+name);
assert.ok(!all.some(n=>n.id.startsWith("equipment/")&&/monture|potion/i.test(n.nom)),"ni monture ni potion");

// Rôle au combat : une seule liste, des sous-tags et des sous-sous-tags.
assert.deepEqual(names(role),["Dégâts","Soin","Soutien","Protection","Entrave","Contrôle du terrain","Commandement","Éclaireur","Magie","Animal","Régénération","Vol"]);
assert.deepEqual(names(find(role,"Dégâts").enfants),["De zone","Charge","À distance","Tranchant","Perforant","Contondant","Brûlant","Glaçant",
  "Foudroyant","Corrosif","Poison","Nécrotique","Anti morts-vivants","Anti invocations"],"les types de dégâts directement sous Dégâts");
assert.deepEqual(names(find(role,"Soin").enfants),["De zone","Dans la durée"]);
assert.deepEqual(names(find(role,"Soutien").enfants),["Enchantements","Dégâts élémentaires","Discrétion","Récupération de mana","Purges"]);
assert.deepEqual(names(find(role,"Soutien","Dégâts élémentaires").enfants),["Brûlant","Glaçant","Foudroyant"]);
assert.deepEqual(names(find(role,"Protection","Protection élémentaire").enfants),["Contre le feu","Contre le froid","Contre la foudre"]);
assert.deepEqual(names(find(role,"Entrave").enfants),["Immobilisation","Affaiblissement","Démoralisateur","Anti-magie","Anti-soins"]);
assert.deepEqual(names(find(role,"Magie").enfants),["Feu","Eau","Foudre","Vie","Nécromancie","Illusion","Invocation","Transmutation","Télékinésie"]);
assert.ok(find(role,"Magie").enfants.every(n=>n.enfants.length===0));
assert.deepEqual(names(find(role,"Animal").enfants),["Équidés","Canidés","Papillons"]);
assert.deepEqual(names(find(role,"Animal","Canidés").enfants),["Loup","Molosse","Cerbère"]);

// Identifiants : le chemin, unique.
assert.equal(new Set(all.map(n=>n.id)).size,all.length,"un identifiant par tag");
assert.equal(find(role,"Dégâts","Brûlant").id,"role/degats/brulant");
assert.equal(find(role,"Soutien","Dégâts élémentaires","Brûlant").id,"role/soutien/degats-elementaires/brulant");
assert.equal(slug("Armes d’hast"),"armes-d-hast");
assert.equal(rules.depth("occupation/entrainement/feu/boule-de-feu"),3);

// Trois niveaux : le clic fait le tour grisé → pâle → moyen → plein → grisé ; un sous-tag allume ses parents au moins à son
// niveau ; éteindre un tag éteint ses sous-tags ; tout se coche, même seul.
const member={name:"Brunehilde"};
assert.deepEqual(rules.cycle(member,"occupation/entrainement/feu/boule-de-feu"),{ok:true,level:1});
assert.deepEqual(member.tags,{"occupation/entrainement/feu/boule-de-feu":1},"gardé sur le mercenaire (sauvegardé avec lui)");
let shown=rules.view(member);
assert.deepEqual(Object.keys(shown).sort(),["occupation/entrainement","occupation/entrainement/feu","occupation/entrainement/feu/boule-de-feu"],"le sous-tag allume ses parents");
assert.ok(Object.values(shown).every(t=>t.level===1&&!t.steward));
rules.cycle(member,"occupation/entrainement/feu/boule-de-feu");
rules.cycle(member,"occupation/entrainement/feu/boule-de-feu");
assert.equal(rules.levelOf(member,"occupation/entrainement"),3,"le parent au moins aussi fort que son sous-tag le plus fort");
assert.deepEqual(rules.cycle(member,"role/animal"),{ok:true,level:1});
assert.ok(rules.levelOf(member,"role/animal")===1&&!rules.litIds(member).some(t=>t.startsWith("role/animal/")),"Animal seul");
rules.cycle(member,"role/animal"); rules.cycle(member,"role/animal");
assert.deepEqual(rules.cycle(member,"role/animal"),{ok:true,level:0},"après plein : éteint");
assert.deepEqual(rules.cycle(member,"occupation/entrainement/feu"),{ok:true,level:0},"Feu plein (par son sort) : le clic l'éteint");
assert.equal(rules.levelOf(member,"occupation/entrainement/feu/boule-de-feu"),0,"Feu éteint : ses sorts aussi");
assert.equal(rules.levelOf(member,"occupation/entrainement"),0,"plus rien dessous : Entraînement s'éteint aussi");
assert.equal(rules.cycle(member,"nulle/part").ok,false,"un tag inconnu ne change rien");
assert.deepEqual(rules.levelsOf(["equipment/arme/lames-longues/epee-longue","vieux/tag"]),{"equipment/arme/lames-longues/epee-longue":3},
  "une ancienne liste (phase 1) compte au niveau plein ; un tag disparu est oublié");
assert.deepEqual(rules.levelsOf({"role/vol":7,"role/soin":0,"role/inconnu":2}),{"role/vol":3});

// L'intendant : ses tags portent le point ; le joueur l'emporte ; éteindre un de ses tags le refuse, il ne le remet pas.
const merc={name:"Ragnar",tags:{"role/vol":2}};
rules.setSteward(merc,{"role/degats/tranchant":3,"role/vol":1,"occupation/garde-du-corps":2});
shown=rules.view(merc);
assert.deepEqual(shown["role/degats/tranchant"],{level:3,steward:true});
assert.deepEqual(shown["role/degats"],{level:3,steward:true},"un parent allumé par les seuls tags de l'intendant porte le point");
assert.deepEqual(shown["role/vol"],{level:2,steward:false},"le joueur l'emporte sur l'intendant");
rules.cycle(merc,"occupation/garde-du-corps");
assert.deepEqual(rules.view(merc)["occupation/garde-du-corps"],{level:3,steward:false},"cliquer un tag de l'intendant : il devient celui du joueur");
rules.cycle(merc,"occupation/garde-du-corps");
assert.equal(rules.levelOf(merc,"occupation/garde-du-corps"),0);
assert.deepEqual(merc.stewardRefused,["occupation/garde-du-corps"],"éteint : refusé");
rules.setSteward(merc,{"occupation/garde-du-corps":2,"role/soin":1});
assert.equal(rules.levelOf(merc,"occupation/garde-du-corps"),0,"retaguer ne remet pas un tag refusé");
assert.equal(rules.levelOf(merc,"role/soin"),1,"retaguer remplace les tags de l'intendant…");
assert.equal(rules.levelOf(merc,"role/degats/tranchant"),0);
assert.equal(rules.levelOf(merc,"role/vol"),2,"… jamais ceux du joueur");
rules.cycle(merc,"occupation/garde-du-corps");
assert.ok(!merc.stewardRefused.includes("occupation/garde-du-corps"),"le joueur le rallume : plus refusé");

// La fiche : l'onglet Tags, pour ceux de la compagnie ; des tags grisés ou non, une flèche, pas de case à cocher.
const ui=read("prototype-web/ui.js"),css=read("prototype-web/styles.css"),html=read("prototype-web/index.html");
assert.match(ui,/\["history", "Historique"\],\n  \["tags", "Rôle et occupations"\]\n\];/,"le dernier onglet : « À la place de tags, on met rôle et occupations »");
assert.equal(rules.intro,"Ces tags vous permettent de vous souvenir à quoi peut servir ce mercenaire.","la petite phrase en haut de l'onglet");
assert.match(ui,/<p class="sheet-tags-intro">\$\{esc\(rules\.intro\)\}<\/p>/);
assert.match(ui,/: hasSteward\(\)\s*\? `<button type="button" class="talk-offer-btn" data-tag-steward=/,"« Demander à l'intendant » s'il y a un intendant (un mercenaire ou Cruxor)");
assert.match(ui,/stewardRetag\(\[c\.id\]\)/,"il tague ce mercenaire (en comparant à toute la bande)");
assert.match(ui,/key !== "tags" \|\| renamable\(c\)/,"pas pour un candidat ni un ennemi");
assert.match(ui,/class="tag-pill\$\{level \? ` is-on lvl-\$\{level\}` : ""\}\$\{lit\?\.steward \? " is-steward" : ""\}" data-tag-toggle=/);
assert.match(ui,/class="tag-open" data-tag-open=.*>▸<\/button>/);
assert.ok(!/renderTagsTab[\s\S]{0,1500}checkbox/.test(ui),"pas de case à cocher");
assert.match(ui,/rules\.cycle\(c, toggle\.dataset\.tagToggle\)[\s\S]{0,80}saveGame\(\)/,"sauvegardé à chaque clic");
assert.match(css,/\.tag-pill\.lvl-1\{--tag-mix:38%/,"pâle");
assert.match(css,/\.tag-pill\.lvl-2\{--tag-mix:68%\}/,"moyen");
assert.match(css,/\.tag-pill\.is-steward::after\{content:""/,"le point de l'intendant");
assert.ok(html.indexOf('src="/core/mercenary-tags.js"')>0&&html.indexOf('src="/core/mercenary-tags.js"')<html.indexOf('src="ui.js"'));
for(const [tone,hue] of [["rouge",/--tag-1:#9a2a20/],["vert",/--tag-1:#315d36/],["bleu",/--tag-1:#284980/]]) assert.match(css,new RegExp("\\.tags-col--"+tone+"\\{"+hue.source),"tons "+tone+"s");
assert.match(css,/\.sheet-tags\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,"trois colonnes");
assert.match(css,/@media\(max-width:900px\)\{\.sheet-tags\{grid-template-columns:1fr\}\}/,"une colonne sur téléphone");
console.log("Tags de la fiche : 3 colonnes, listes tirées des données, 3 niveaux, tags de l'intendant — OK");
