"use strict";

// Les tags des mercenaires dans le jeu (game-core/company-tags.js ; doc 20 §12) : ce qui reçoit le biais, l'erreur de
// l'intendant (le tableau du doc), le tirage gardé par couple intendant / mercenaire, la vantardise du candidat, la
// compagnie vue par l'intendant.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const ROOT=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(ROOT,file),"utf8");
const source=read("prototype-web/reference-data.js");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.tagWorkshop,"tag-workshop.json","l'atelier est chargé avec les autres données");
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,JSON.parse(read("data/reference/"+file))]));
const R=file=>require(path.join(ROOT,"game-core",file));
const E=R("tag-engine.js");
const {createCompanyTags,isBiased}=R("company-tags.js");

let seed=7;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=R("mercenary-generator.js").createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const engine=R("combat-engine.js").createCombatEngine(reference,{});
const magic=R("magic.js").createMagicRules({reference,combat:engine});
const stars=R("stars.js").createStarRules({reference});
const variables=E.createTagVariables({reference,engine,gear:R("equipment-effects.js").createEquipmentEffects({engine}),magic,stars,
  profile:R("mercenary-profile.js").createProfileRules({reference,engine,magic})});
const affinity=R("affinity.js").createAffinityRules({reference});
const tags=createCompanyTags({reference,workshop:reference.tagWorkshop,variables,stars,affinity,random});

// ---- Ce qui reçoit le biais ----
for(const k of ["carac.force","carac.reserve_de_mana","mana","res.feu","comp.armes_de_tir","comp.discretion_effective","ecole.feu",
  "chance.soin","moy.chance.soin","tir.precision","tir.puissance","tir.dex_vit","pm"]) assert.ok(isBiased(k,10),k);
for(const [k,v] of [["port.legere",true],["nb_sorts",2],["sorts.soin",1],["cout.soin",5],["moy.cout.soin",5],["duree.soin",3],
  ["compagnie.etoiles",3],["etoiles",2],["tir.degats_tour",12],["pv_max",50],["nom","A"],["comp.x","texte"]]) assert.ok(!isBiased(k,v),k);
const vu=tags.seen({"carac.force":50,"carac.reserve_de_mana":40,"moy.cout.soin":10,"lancers.soin":4,"nb_sorts":3,"cout.soin":10,"port.legere":true},1.5);
assert.deepEqual(vu,{"carac.force":75,"carac.reserve_de_mana":60,"moy.cout.soin":10,"lancers.soin":6,"nb_sorts":3,"cout.soin":10,"port.legere":true});
const exact={"carac.force":50};
assert.equal(tags.seen(exact,1),exact,"sans biais : les mêmes valeurs");

// ---- L'erreur de l'intendant : le tableau du doc 20 §12 ----
const intendant=(intendance,intelligence)=>({id:"i",skills:{camp:{Intendance:intendance}},stats:intelligence==null?{}:{Intelligence:intelligence}});
for(const [nom,s,max] of [["Excellent",intendant(90,70),3],["Correct",intendant(80,70),5],["Cruxor",intendant(30,null),26],
  ["Mauvais",intendant(25,40),30],["Nul",intendant(0,30),45]])
  assert.ok(Math.abs(tags.maxError(s)*100-max)<0.6,nom+" : "+tags.maxError(s)*100);
assert.equal(tags.stewardCompetence(intendant(30,null)),35,"Cruxor : 0,75 × 30 + 0,25 × 50");
assert.equal(tags.stewardCompetence(intendant(200,200)),100,"bornée à 100");

// Le sens : P(surestimer) = 50 % + 25 % × Affinité / 100 + 25 % × R.
const tirage=(rand,opts)=>{ const t=createCompanyTags({reference,workshop:reference.tagWorkshop,variables,stars,random:(()=>{ let i=0; return ()=>rand[i++]; })()});
  return t.drawStewardBias({steward:intendant(0,30),...opts}); };
assert.deepEqual(tirage([0.5,0.49],{}),{size:0.5*tags.maxError(intendant(0,30)),sign:1});
assert.equal(tirage([0.5,0.51],{}).sign,-1);
assert.equal(tirage([0,0.74],{affinityPoints:100}).sign,1,"il aime le mercenaire : 75 %");
assert.equal(tirage([0,0.76],{affinityPoints:100}).sign,-1);
assert.equal(tirage([0,0.99],{affinityPoints:100,mercStars:6,companyStars:1}).sign,1,"aimé et plus étoilé que la compagnie : 100 %");
assert.equal(tirage([0,0],{affinityPoints:-100,mercStars:1,companyStars:9}).sign,-1,"détesté et moins étoilé : jamais surestimé");
assert.equal(tirage([0,0.6],{mercStars:1,companyStars:3.5}).sign,-1,"R = −0,5 : 37,5 %");

// ---- Le tirage gardé par couple intendant / mercenaire ----
const captain=generator.createCaptain({id:1});
const roster=Array.from({length:12},(_,i)=>generator.createMercenary({id:i+2,captain}));
const members=[captain,...roster];
const cruxor={id:"old-steward",npc:true,name:"Cruxor Limortel",skills:{camp:{Intendance:30}},stats:{}};
const m=roster[0];
const b1=tags.stewardBias(m,{steward:cruxor,companyStars:1});
assert.ok(b1.size>=0&&b1.size<=tags.maxError(cruxor)&&(b1.sign===1||b1.sign===-1));
assert.deepEqual(m.tagBias,b1,"gardé sur le mercenaire (la sauvegarde)");
assert.equal(tags.stewardBias(m,{steward:cruxor,companyStars:5}),b1,"gardé tant que rien ne change");
const nouvel=roster[5];
nouvel.skills.camp={...(nouvel.skills.camp||{}),Intendance:80};
const b2=tags.stewardBias(m,{steward:nouvel,companyStars:1});
assert.equal(b2.steward,String(nouvel.id),"un nouvel intendant : un nouveau tirage");
assert.ok(b2.size<=tags.maxError(nouvel));
m.reputation=(Number(m.reputation)||0)+100000;
const b3=tags.stewardBias(m,{steward:nouvel,companyStars:1});
assert.notEqual(b3.stars,b2.stars,"il change d'étoile : un nouveau tirage");
assert.equal(tags.stewardBias(m,{steward:null}),null,"sans intendant : pas de biais");
// Cruxor : affinité neutre, sans consulter les règles d'affinité.
const sansAffinite=createCompanyTags({reference,workshop:reference.tagWorkshop,variables,stars,random,
  affinity:{affinity:()=>{ throw new Error("Cruxor n'a pas d'affinité"); }}});
delete roster[1].tagBias;
assert.ok(sansAffinite.stewardBias(roster[1],{steward:cruxor}));

// ---- Les valeurs, recalculées seulement quand il change ----
const v1=tags.valuesOf(roster[2]);
assert.equal(tags.valuesOf(roster[2]),v1,"le même mercenaire, inchangé : les mêmes valeurs");
roster[2].stats.Force=(Number(roster[2].stats.Force)||0)+10;
assert.notEqual(tags.valuesOf(roster[2]),v1,"il change : recalculées");
assert.equal(tags.valuesOf(roster[2])["carac.force"],v1["carac.force"]+10);

// ---- Les tags de la compagnie ----
// Un intendant parfait (Intendance et Intelligence 100 : aucune erreur) : les valeurs exactes, comme l'atelier.
const tree=E.createTagTree(E.clean(reference.tagWorkshop));
const parfait={id:"parfait",skills:{camp:{Intendance:100}},stats:{Intelligence:100}};
assert.equal(tags.maxError(parfait),0);
for(const x of members) delete x.tagBias;
for(const x of members.slice(0,6)){
  const direct=tree.tags(E.withCompany(tags.valuesOf(x),members.filter(o=>o!==x).map(o=>tags.valuesOf(o)),3));
  assert.deepEqual(tags.tagsOf(x,{members,steward:parfait,companyStars:3}).affiches.map(t=>t.id),direct.affiches.map(t=>t.id),x.name);
}
// Sans intendant, aucun tag (Idan, 2026-11-22 : « Sans intendant […] aucun tag s'affiche »).
for(const x of members.slice(0,6)) assert.deepEqual(tags.tagsOf(x,{members,steward:null,companyStars:3}).affiches,[],x.name);
// Avec Cruxor : chacun vu à travers son biais (au plus 26 %), le meilleur de la compagnie comparé sur ce qu'il voit.
for(const x of members) delete x.tagBias;
const view=tags.company({members,steward:cruxor,companyStars:3});
for(const x of members){
  const f=tags.factorOf(x.tagBias);
  assert.ok(f>=1-tags.maxError(cruxor)-1e-9&&f<=1+tags.maxError(cruxor)+1e-9,x.name+" : "+f);
  assert.equal(view.get(x)["carac.force"],tags.valuesOf(x)["carac.force"]*f);
  assert.equal(view.get(x)["nb_sorts"],tags.valuesOf(x)["nb_sorts"]);
  const out=tags.tagsOf(x,{members,steward:cruxor,companyStars:3,view});
  for(const t of out.affiches) assert.equal(out.motif.has(t.id),false);
  assert.ok(out.motif.has(reference.tagWorkshop.tags.find(t=>t.inactif).id),"un tag inactif ne s'affiche jamais");
}
const seul=tags.tagsOf(roster[3],{members,steward:cruxor,companyStars:3});
assert.deepEqual(seul.affiches.map(t=>t.id),tags.tagsOf(roster[3],{members,steward:cruxor,companyStars:3,view}).affiches.map(t=>t.id),
  "le même résultat, la vue de la compagnie donnée ou non");

// ---- Le candidat se vante ----
const candidat={mercenary:generator.createMercenary({id:99,captain})};
const f=tags.candidateFactor(candidat);
assert.ok(f>=1.1&&f<=3,"entre 1,10 et 3,00 : "+f);
assert.equal(candidat.tagSelfBias,f);
assert.equal(tags.candidateFactor(candidat),f,"un seul tirage par candidat");
const annonce=tags.candidateTags(candidat,{members,steward:cruxor,companyStars:3,view});
for(const t of annonce.affiches) assert.equal(annonce.motif.has(t.id),false);
// Ce qu'il annonce : ses capacités × son tirage.
candidat.tagSelfBias=3;
const fort=tags.candidateTags(candidat,{members,steward:cruxor,companyStars:3,view});
const attendu=tree.tags(E.withCompany(tags.seen(tags.valuesOf(candidat.mercenary),3),members.map(x=>view.get(x)),3));
assert.deepEqual(fort.affiches.map(t=>t.id),attendu.affiches.map(t=>t.id),"ses valeurs × 3, contre la compagnie vue par l'intendant");

// ---- Branché dans le jeu (Idan, 2026-11-22) : plus d'onglet ni de demande de tags ----
const ui=read("prototype-web/ui.js"), stewardUi=read("prototype-web/steward-ui.js"), html=read("prototype-web/index.html");
assert.match(html,/<script src="\/core\/tag-engine\.js"><\/script>\s*<script src="\/core\/company-tags\.js"><\/script>/);
assert.doesNotMatch(html,/mercenary-tags\.js|steward-tags\.js/,"l'ancien moteur n'est plus chargé");
assert.doesNotMatch(ui,/"Rôle et occupations"|renderTagsTab|data-tag-toggle|data-tag-steward|stewardRetag/,"plus d'onglet Rôle et occupations ni de demande à l'intendant");
assert.doesNotMatch(stewardUi,/data-steward-retag|>Retaguer la compagnie</,"plus de « Retaguer la compagnie »");
assert.match(ui,/MercenairesCompanyTags\.createCompanyTags\(\{reference, workshop: reference\.tagWorkshop,/);
assert.match(ui,/const steward = c && typeof stewardRules === "function" \? stewardRules\(\)\.personOf\(c\) : null;/,"l'intendant nommé, sinon Cruxor");

// ---- Le jeu lit l'atelier du Design Lab (media/atelier/actuel.json), sinon la copie du dépôt ----
(async()=>{
  const src=read("prototype-web/reference-data.js");
  assert.match(src,/data\.tagWorkshop\] = await Promise\.all\(\[[^\]]*loadTagWorkshop\(data\.tagWorkshop\)\]\)/);
  const load=fetch=>new Function("fetch",src.slice(src.indexOf("async function loadTagWorkshop("),src.indexOf("// Silhouettes d'équipement"))+"\nreturn loadTagWorkshop;")(fetch);
  const copie={tags:[{id:"a"}],tests:[],constantes:[]};
  const reponse=(ok,body,type="application/json")=>async url=>{ reponse.url=url; return {ok,headers:{get:()=>type},json:async()=>body}; };
  const live={version:7,date:"2026-11-22T10:00:00+00:00",doc:{tags:[{id:"b"}],tests:[],constantes:[{nom:"x",valeur:1}]}};
  const lu=await load(reponse(true,live))(copie);
  assert.deepEqual(lu,{...live.doc,version:7,date:live.date},"la dernière version du Design Lab");
  assert.match(reponse.url,/^\/media\/atelier\/actuel\.json\?t=\d+$/);
  assert.equal(await load(reponse(false,null))(copie),copie,"pas de version : la copie du dépôt");
  assert.equal(await load(reponse(true,"<html>","text/html"))(copie),copie,"pas du JSON : la copie du dépôt");
  assert.equal(await load(reponse(true,{version:1,doc:{}}))(copie),copie,"une version mal formée : la copie du dépôt");
  assert.equal(await load(async()=>{ throw new Error("réseau"); })(copie),copie,"pas de réseau : la copie du dépôt");
  console.log("company-tags tests ok");
})().catch(e=>{ console.error(e); process.exit(1); });
