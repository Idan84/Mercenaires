#!/usr/bin/env node
"use strict";
// Atelier des tags (Idan, 2026-11-20) : tire des recrues avec le vrai générateur du jeu (game-core) et les aplatit en
// variables lisibles par les calculs de l'atelier (caractéristiques et compétences équipement compris, capacités,
// équipement porté, sorts, réussite / coût / durée des sorts par tag de rôle, moyennes des soins, mesures des titres).
// Usage : node scripts/atelier-tags/profils.js [nombre de recrues, 240 par défaut] → scripts/atelier-tags/profils.json
// (plus trois recrues par ascendance au niveau 3, pour les capacités rares). Puis : node scripts/atelier-tags/construit.js
const fs=require("node:fs"),path=require("node:path");
const ROOT=path.resolve(__dirname,"..","..");
const {createGenerator}=require(ROOT+"/game-core/mercenary-generator.js");
const {createCombatEngine}=require(ROOT+"/game-core/combat-engine.js");
const {createEquipmentEffects}=require(ROOT+"/game-core/equipment-effects.js");
const {createMagicRules}=require(ROOT+"/game-core/magic.js");
const {createStarRules}=require(ROOT+"/game-core/stars.js");
const {createProfileRules}=require(ROOT+"/game-core/mercenary-profile.js");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const N=Number(process.argv[2])||240;
let seed=20261120;const random=()=>((seed=(seed*16807)%2147483647)/2147483647);Math.random=random;
const gen=createGenerator(reference,{random,nameGenerator:(p,id)=>p+" "+id});
const engine=createCombatEngine(reference,{});
const gear=createEquipmentEffects({engine});
const magic=createMagicRules({reference,combat:engine});
const stars=createStarRules({reference});
const prof=createProfileRules({reference,engine,magic});
const pdata=reference.mercenaryProfile;
const spellRows=new Map(reference.spells.rows.map(r=>[r.code,r]));
const mountRows=new Map((reference.mounts?.rows||[]).map(r=>[r.code,r]));
const weaponRows=new Map(reference.weapons.rows.map(r=>[r.nom,r]));
const key=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[’']/g,"_").replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
const r1=v=>Math.round(v*10)/10;
const DOMAINE={melee:"contact",ranged:"distance",magic:"magie"};

const VARS=[]; const seen=new Map();
function v(k,label,groupe,type){ if(!seen.has(k)){ seen.set(k,VARS.length); VARS.push({k,label,groupe,type}); } return seen.get(k); }

const captain=gen.createCaptain({id:1});
const rows=[];
// Les recrues au hasard, puis trois par ascendance au niveau 3 (les capacités rares : vol, régénération, respiration aquatique).
const demandes=Array.from({length:N},()=>({}));
for(const a of gen.ancestries()){ const ps=gen.people().filter(p=>gen.isAncestryCompatible(p,a)); if(!ps.length) continue;
  for(let k=0;k<3;k++) demandes.push({forcedPeople:ps[Math.floor(random()*ps.length)],forcedAscendance:a,forcedAscendanceLevel:3}); }
for(let i=0;i<demandes.length;i++){
  const c=gen.createMercenary({id:i+2,captain,...demandes[i]});
  const unit={character:c,activeSet:1};
  const out={};
  const put=(k,label,groupe,type,val)=>{ v(k,label,groupe,type); out[k]=val; };
  // Identité
  put("nom","Nom","Identité","texte",c.name);
  put("peuple","Peuple","Identité","texte",c.people||"");
  put("culture","Culture","Identité","texte",c.culture||"");
  put("origine","Origine","Identité","texte",c.origin||"");
  put("alignement","Alignement","Identité","texte",c.alignment||"");
  put("ascendance","Ascendance","Identité","texte",c.ascendance||"");
  put("niveau_ascendance","Niveau d'ascendance","Identité","nombre",Number(c.ascendanceLevel)||0);
  put("domaine","Domaine (contact, distance, magie)","Identité","texte",DOMAINE[c.domain]||c.domain||"");
  put("etoiles","Étoiles (réputation)","Identité","nombre",stars.personal(c.reputation).level);
  put("pv_max","PV max","Identité","nombre",Number(c.pvMax)||0);
  put("mana","Mana","Identité","nombre",Number(c.mana)||0);
  // Caractéristiques à l'instant T (Idan, 2026-11-21 : « On doit prendre en compte l'équipement ») : la valeur que montre
  // la fiche du jeu (equipment-effects.js), armure, armes, casque et combat à deux armes compris ; sinon, avec l'équipement.
  const fx=gear.effects(c);
  const avec=s=>Number.isFinite(Number(fx[s]?.value))?Number(fx[s].value):Number(engine.statWithGear(unit,s))||0;
  for(const s of Object.keys(c.stats)) put("carac."+key(s),s,"Caractéristiques (équipement et armure compris)","nombre",r1(avec(s)));
  // Résistances à l'instant T (Idan, 2026-11-21) : équipement compris ; pour le feu, le froid, la foudre et le poison, la
  // protection du combat (résistance + armure portée + bonus, sans plafond), comme elementalDamage la compte.
  const ELEMENT={"Résistance au feu":"feu","Résistance au froid":"froid","Résistance à la foudre":"foudre","Résistance au poison":"poison"};
  for(const s of Object.keys(c.resistances||{})){
    const el=ELEMENT[s], v=el&&engine.elementalProtection?Number(engine.elementalProtection(unit,el).total):Number(engine.statWithGear(unit,s));
    put("res."+key(s.replace(/^Résistance (au |à la |aux |à l’|physique)?/,"")||"physique"),s,"Résistances (équipement et armure compris)","nombre",r1(Number.isFinite(v)?v:Number(c.resistances[s])||0));
  }
  // Compétences
  const mart=c.skills?.martial||{};
  const CATS=["Lames longues","Lames courtes","Armes d’hast","Armes articulées","Haches","Bâtons","Boucliers","Armes à feu","Armes contondantes","Armes de tir","Armes flexibles","Combat à deux armes","Combat à une main","Combat à deux mains","Discrétion","Pièges","Magie en armure"];
  for(const s of CATS) if(s in mart) put("comp."+key(s),s,"Compétences (équipement compris)","nombre",r1(Number(engine.statWithGear(unit,s))||Number(mart[s])||0));
  put("comp.intimidation","Intimidation","Compétences (équipement compris)","nombre",r1(Number(engine.statWithGear(unit,"Intimidation"))||0));
  put("comp.perception_effective","Perception effective","Compétences (équipement compris)","nombre",r1(Number(engine.statWithGear(unit,"Perception"))||0));
  put("comp.discretion_effective","Discrétion effective (armure comprise)","Compétences (équipement compris)","nombre",r1(Number(engine.effectiveStealth(unit))||0));
  put("port.legere","Port d'armure légère","Compétences (équipement compris)","oui/non",mart["Port d’armure légère"]===true);
  put("port.intermediaire","Port d'armure intermédiaire","Compétences (équipement compris)","oui/non",mart["Port d’armure intermédiaire"]===true);
  put("port.lourde","Port d'armure lourde","Compétences (équipement compris)","oui/non",mart["Port d’armure lourde"]===true);
  put("empoisonnement","Empoisonnement des armes","Compétences (équipement compris)","oui/non",mart["Empoisonnement des armes"]===true);
  // Écoles
  for(const s of Object.keys(c.skills?.magic||{})) put("ecole."+key(s),s,"Écoles de magie (équipement compris)","nombre",r1(Number(engine.statWithGear(unit,s))||0));
  // Capacités
  const terr=engine.terrainSkillsOf(unit).map(t=>t.code);
  put("capacite.vol","Vol (par lui-même)","Capacités","oui/non",Boolean(engine.skillFlies(unit)));
  put("capacite.regeneration","Régénération","Capacités","nombre",Number(c.skills?.physiology?.["Régénération"])||0);
  put("capacite.vision_nocturne","Vision nocturne","Capacités","oui/non",c.skills?.physiology?.["Vision nocturne"]===true);
  put("capacite.respiration_aquatique","Respiration aquatique","Capacités","oui/non",terr.includes("respiration_aquatique"));
  put("capacite.deplacement_aquatique","Déplacement aquatique","Capacités","oui/non",terr.includes("deplacement_aquatique"));
  put("capacite.deplacement_sylvain","Déplacement sylvain","Capacités","oui/non",terr.includes("deplacement_sylvain"));
  // Équipement porté
  const items=new Map((c.items||[]).map(it=>[it.id,it]));
  const slot=s=>items.get(c.equipment?.slots?.[s])||null;
  const fam=it=>it?(it.combatFamily==="ranged"?"distance":it.combatFamily==="melee"?"contact":it.combatFamily||""):"";
  for(const [n,s] of [[1,"weapon_set_1"],[2,"weapon_set_2"]]){
    const m=slot(s+"_main"),o=slot(s+"_off");
    put("arme"+n,"Set "+n+" : arme","Équipement porté","texte",m?.name||"");
    put("arme"+n+".categorie","Set "+n+" : catégorie de l'arme","Équipement porté","texte",m?.category||"");
    put("arme"+n+".famille","Set "+n+" : contact ou distance","Équipement porté","texte",fam(m));
    put("arme"+n+".prise","Set "+n+" : prise","Équipement porté","texte",m?.grip||"");
    put("arme"+n+".main_gauche","Set "+n+" : main gauche","Équipement porté","texte",o?.name||"");
    put("arme"+n+".bouclier","Set "+n+" : bouclier","Équipement porté","oui/non",Boolean(o&&(o.category==="Boucliers"||weaponRows.get(o.name)?.categorie==="Boucliers")));
  }
  const arm=slot("armor");
  put("armure","Armure","Équipement porté","texte",arm?.name||"");
  put("armure.classe","Classe d'armure","Équipement porté","texte",c.equipment?.armorClass||"");
  const mount=slot("mount"); const mrow=mount&&mountRows.get(mount.mountCode);
  put("monture","Monture","Équipement porté","texte",mrow?.nom||mount?.name||"");
  put("monture.vol","Monture volante","Équipement porté","oui/non",Boolean(mrow?.physiologie?.Vol));
  const belt=["belt_item_1","belt_item_2","belt_item_3","belt_item_4"].map(slot).filter(Boolean);
  put("ceinture","Objets à la ceinture","Équipement porté","liste",belt.map(b=>b.name));
  // Sorts
  const known=(c.spells||[]).filter(s=>spellRows.has(s.code));
  put("sorts","Sorts connus","Sorts","liste",known.map(s=>spellRows.get(s.code).nom));
  put("nb_sorts","Nombre de sorts","Sorts","nombre",known.length);
  const tagCount={};
  for(const s of known) for(const t of (spellRows.get(s.code).tags||[])) if(String(t).startsWith("role/")) tagCount[t]=(tagCount[t]||0)+1;
  for(const r of reference.spells.rows) for(const t of (r.tags||[])) if(String(t).startsWith("role/")) v("sorts."+t.slice(5).replace(/\//g,".").replace(/-/g,"_"),"Sorts « "+t.slice(5).replace(/\//g," › ").replace(/-/g," ")+" »","Sorts","nombre");
  for(const [t,n] of Object.entries(tagCount)) out["sorts."+t.slice(5).replace(/\//g,".").replace(/-/g,"_")]=n;
  // Chance de réussir (magic.castChance : maîtrise de l'école, Intelligence, armure) : la meilleure parmi ses sorts de chaque tag.
  const chance={}; let best=0;
  for(const sp of known){ const pc=Math.round(Number(magic.castChance(unit,sp.code)?.p)||0); best=Math.max(best,pc);
    for(const t of (spellRows.get(sp.code).tags||[])) if(String(t).startsWith("role/")) chance[t]=Math.max(chance[t]||0,pc); }
  put("chance.sort","Chance de réussir son meilleur sort (%)","Sorts : chance de réussite (%)","nombre",best);
  for(const r of reference.spells.rows) for(const t of (r.tags||[])) if(String(t).startsWith("role/")) v("chance."+t.slice(5).replace(/\//g,".").replace(/-/g,"_"),"Chance de réussir son meilleur sort « "+t.slice(5).replace(/\//g," › ").replace(/-/g," ")+" » (%)","Sorts : chance de réussite (%)","nombre");
  for(const [t,pc] of Object.entries(chance)) out["chance."+t.slice(5).replace(/\//g,".").replace(/-/g,"_")]=pc;
  // Coût en mana (magic.manaCost) et durée en tours (magic.duration) : le sort le moins cher, la plus longue durée, par tag.
  const cle=t=>t.slice(5).replace(/\//g,".").replace(/-/g,"_");
  const cout={},duree={};
  for(const sp of known){ const row=spellRows.get(sp.code), mc=Math.round(Number(magic.manaCost(unit,sp.code))||0), du=row.duree_base!=null?Number(magic.duration(unit,sp.code))||0:0;
    for(const t of (row.tags||[])) if(String(t).startsWith("role/")){ cout[t]=Math.min(cout[t]??Infinity,mc); if(du) duree[t]=Math.max(duree[t]||0,du); } }
  for(const r of reference.spells.rows) for(const t of (r.tags||[])) if(String(t).startsWith("role/")){
    v("cout."+cle(t),"Coût en mana de son sort « "+t.slice(5).replace(/\//g," › ").replace(/-/g," ")+" » le moins cher","Sorts : coût en mana","nombre");
    if(r.duree_base!=null) v("duree."+cle(t),"Durée (tours) de son sort « "+t.slice(5).replace(/\//g," › ").replace(/-/g," ")+" » le plus long","Sorts : durée en tours","nombre"); }
  for(const [t,c] of Object.entries(cout)) out["cout."+cle(t)]=c;
  // Coût moyen de ses sorts de chaque tag (Idan, 2026-11-21 : Maître du champ de bataille, « la moyenne »).
  const somme={},nb={};
  for(const sp of known){ const mc=Number(magic.manaCost(unit,sp.code))||0;
    for(const t of (spellRows.get(sp.code).tags||[])) if(String(t).startsWith("role/")){ somme[t]=(somme[t]||0)+mc; nb[t]=(nb[t]||0)+1; } }
  // (Les soins ont déjà leurs moyennes plus bas.)
  for(const r of reference.spells.rows) for(const t of (r.tags||[])) if(String(t).startsWith("role/")&&t!=="role/soin")
    v("moy.cout."+cle(t),"Coût moyen en mana de ses sorts « "+t.slice(5).replace(/\//g," › ").replace(/-/g," ")+" »","Sorts : coût en mana","nombre");
  for(const [t,n] of Object.entries(nb)) if(t!=="role/soin") out["moy.cout."+cle(t)]=r1(somme[t]/n);
  for(const [t,dd] of Object.entries(duree)) out["duree."+cle(t)]=dd;
  const reserve=Number(engine.statWithGear(unit,"Réserve de mana"))||0;
  // Moyennes sur tous ses sorts de soin (Idan, 2026-11-21 : « on peut prendre la moyenne de tous les sorts de soin »).
  const soins=known.filter(sp=>(spellRows.get(sp.code).tags||[]).includes("role/soin"));
  const moy=f=>soins.length?soins.reduce((t,sp)=>t+f(sp),0)/soins.length:0;
  const moyCout=moy(sp=>Number(magic.manaCost(unit,sp.code))||0);
  put("moy.chance.soin","Réussite moyenne de ses sorts de soin (%)","Sorts : moyennes des soins","nombre",Math.round(moy(sp=>Number(magic.castChance(unit,sp.code)?.p)||0)));
  put("moy.cout.soin","Coût moyen en mana de ses sorts de soin","Sorts : moyennes des soins","nombre",r1(moyCout));
  put("moy.ecole.soin","Niveau moyen des écoles de ses sorts de soin (équipement compris)","Sorts : moyennes des soins","nombre",r1(moy(sp=>Number(engine.statWithGear(unit,spellRows.get(sp.code).ecole))||0)));
  put("lancers.soin","Nombre de soins qu'il peut lancer avec sa réserve (coût moyen de ses soins)","Sorts : moyennes des soins","nombre",moyCout?Math.floor(reserve/moyCout):0);
  put("sorts.soin_rapide","Sorts de soin en action rapide","Sorts","nombre",known.filter(sp=>(spellRows.get(sp.code).tags||[]).includes("role/soin")&&spellRows.get(sp.code).action==="rapide").length);
  // Mesures des titres (doc 19)
  const ev=prof.evaluate(c);
  const vals=ev?.values||{};
  for(const s of Object.keys(pdata.sources).filter(k=>k!=="description")){
    v("mesure."+s,"Mesure : "+s.replace(/_/g," "),"Mesures du jeu (titres, doc 19)","nombre");
    v("niveau."+s,"Niveau : "+s.replace(/_/g," ")+" (1 à 15)","Niveaux du jeu (titres, doc 19)","nombre");
    if(vals[s]!=null){ out["mesure."+s]=r1(vals[s]); out["niveau."+s]=prof.level(s,vals[s])?.level||0; }
  }
  for(const cat of pdata.categories){
    v("titre."+cat.code,"Titre « "+cat.nom+" » : niveau","Niveaux du jeu (titres, doc 19)","nombre");
    const found=ev?.categories?.find(x=>x.code===cat.code); if(found) out["titre."+cat.code]=found.level;
  }
  rows.push(out);
}
// Valeurs manquantes : 0, faux, "" ou [] selon le type.
const vide=t=>t==="nombre"?0:t==="oui/non"?false:t==="liste"?[]:"";
const profils=rows.map(o=>VARS.map(x=>o[x.k]===undefined?vide(x.type):o[x.k]));
const res={genere:"Recrues tirées par le générateur du jeu (game-core), le "+new Date().toISOString().slice(0,10)+", graine "+20261120,vars:VARS,profils};
fs.writeFileSync(path.join(__dirname,"profils.json"),JSON.stringify(res));
console.log(VARS.length,"variables",profils.length,"profils",JSON.stringify(res).length,"octets");
const by=(k)=>{const i=seen.get(k);const c={};for(const p of profils){const x=String(p[i]);c[x]=(c[x]||0)+1;}return c;};
console.log("domaine",by("domaine"));console.log("etoiles",by("etoiles"));console.log("vol",by("capacite.vol"),"regen>0",profils.filter(p=>p[seen.get("capacite.regeneration")]>0).length,"resp",by("capacite.respiration_aquatique"));
console.log("nb_sorts",by("nb_sorts"));console.log("soin",by("sorts.soin"));
console.log(VARS.filter(x=>x.groupe.startsWith("Sorts")).length, VARS.map(x=>x.k).join(" "));
