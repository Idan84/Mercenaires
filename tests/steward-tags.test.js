"use strict";

// L'intendant qui tague (Idan, 2026-11-12 ; doc 20 §5 à §8) : « On doit pouvoir lui demander de le qualifier tout seul. »
// Il compare toujours à la bande (« Il faut jamais comparer à la génération de X mercenaires ») ; rien d'écrit en dur sur
// les camps ; les meilleurs ne vont ni en garde ni au travail ni à un poste (sauf Officier) ; ses tags se posent à trois
// niveaux. Code : game-core/steward-tags.js ; données : data/reference/steward-tags.json et la colonne tags de spells.json.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const ROOT=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(ROOT,file),"utf8");
const source=read("prototype-web/reference-data.js");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.stewardTags,"steward-tags.json","les règles de l'intendant sont chargées avec les autres données");
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,JSON.parse(read("data/reference/"+file))]));
const R=file=>require(path.join(ROOT,"game-core",file));

let seed=7;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const engine=R("combat-engine.js").createCombatEngine(reference);
const magic=R("magic.js").createMagicRules({reference,combat:engine});
const profile=R("mercenary-profile.js").createProfileRules({reference,engine,magic});
const missions=R("missions.js").createMissionRules({reference,random});
const tags=R("mercenary-tags.js").createTagRules({reference});
const stars=R("stars.js").createStarRules({reference});
const campPosts=R("camp-posts.js");
const armorPorts=R("armor-ports.js").createArmorPorts(reference);
const {createStewardTags,placeAmong}=R("steward-tags.js");
const steward=createStewardTags({reference,engine,magic,profile,missions,tags,stars,campPosts,armorPorts});
const generator=R("mercenary-generator.js").createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});

// Les données : chaque sort porte ses tags (des tags qui existent) ; les seuils.
for(const spell of reference.spells.rows){
  assert.ok(Array.isArray(spell.tags),"tags du sort : "+spell.nom);
  for(const id of spell.tags) assert.ok(tags.has(id),spell.nom+" : tag inconnu "+id);
}
assert.deepEqual(reference.spells.rows.find(s=>s.code==="quick_heal").tags,["role/soin"]);
assert.ok(reference.spells.rows.find(s=>s.code==="restitution").tags.includes("role/degats/anti-morts-vivants"));
const S=reference.stewardTags.seuils;
assert.equal(S.mission_bas,0.2,"les 20 % les moins bons de chaque rôle");
assert.equal(S.mediane,50);
assert.equal(S.quart_haut,75);
assert.equal(S.vol_bonus,25,"le vol : +25 points sur 100");
assert.equal(S.meilleur,75,"les meilleurs : le quart du haut dans un de leurs rôles");
for(const post of reference.stewardTags.postes) assert.ok(tags.childNamed("occupation/poste",post.tag),"poste : "+post.tag);
const bonusNames=new Set(tags.node("equipment/caracteristiques").enfants.map(n=>n.nom));
for(const [usage,names] of Object.entries(reference.stewardTags.usages))
  for(const name of names) assert.ok(name.startsWith("@")||bonusNames.has(name)||name==="Boucliers","usage "+usage+" : "+name);

// La place parmi d'autres : un seul, c'est la médiane.
assert.equal(placeAmong([10],10),50);
assert.equal(placeAmong([1,2,3,4],4),87.5);
assert.equal(placeAmong([],3),0);

// Les camps se lisent dans les fiches ennemies (rien d'écrit en dur).
const types=steward.missionTypes({},3);
const traitsOf=faction=>types.find(t=>t.faction===faction)?.traits.map(t=>t.code)||[];
assert.ok(traitsOf("Culte des morts").includes("mort_vivant"),"le Culte des morts : des morts-vivants");
// Le vol (Idan, 2026-11-16, avec les pégases : « Accepter » la moyenne de tous les types de mission) : papillons et
// pégases volent tous ; la Cour de sang (une fiche sur sept, les chauves-souris) n'est signalée que si elle dépasse la
// moyenne, qui bouge avec chaque bête ajoutée (sous elle avec les pégases, au-dessus avec le tricératops).
assert.ok(["Papillons","Pégases"].every(f=>traitsOf(f).includes("vol")),"papillons et pégases : des bêtes qui volent");
{
  const flies=s=>Boolean(s.vol||s.physiologie?.Vol===true);
  const missions=reference.oneShotMissions.missions;
  const campShare=f=>{ const rows=reference.enemyArchetypes.rows.filter(a=>a.faction===f); return rows.filter(flies).length/Math.max(1,rows.length); };
  const camps=[...new Set(missions.flatMap(m=>(m.camps||[]).map(c=>c.faction)))].map(campShare);
  const hunts=missions.filter(m=>m.bete).map(m=>flies(reference.mounts.rows.find(r=>r.code===m.bete.code))?1:0);
  const mean=[...camps,...hunts].reduce((a,b)=>a+b,0)/(camps.length+hunts.length);
  assert.equal(traitsOf("Cour de sang").includes("vol"),campShare("Cour de sang")>mean,"la Cour de sang : signalée selon la moyenne ("+campShare("Cour de sang").toFixed(3)+" contre "+mean.toFixed(3)+")");
}
assert.ok(traitsOf("Voleurs").includes("monture"),"les Voleurs : des cavaliers");
assert.deepEqual(traitsOf("Orcs"),[],"un camp sans trait distinctif n'est pas tagué");

// Une compagnie.
function company(count,{buildings=["magic_school","ludus","survival_academy","blade_circle","watchtower","alchemy_lab","lumber_camp",
  "miners_guild","pleasure_palace","trainer_barn","magic_room_fire","magic_room_life"]}={}){
  const captain=generator.createCaptain({id:1});
  const roster=[captain];
  for(let i=0;i<count;i++) roster.push(generator.createMercenary({id:100+i,captain}));
  return {day:10,company:{captainId:1,roster,lieutenantIds:[],intendantId:null,medicId:null,
    camp:{buildings:Object.fromEntries(buildings.map(code=>[code,{level:2,construction:null}]))}}};
}
const lit=(result,prefix)=>Object.keys(result.levels).filter(id=>id===prefix||id.startsWith(prefix+"/"));

const state=company(24);
const t0=Date.now();
const out=steward.evaluate(state,{level:3});
assert.ok(Date.now()-t0<5000,"25 mercenaires en quelques secondes au plus");
assert.equal(out.size,25,"tout le monde est tagué");
let gardes=0,meilleurs=0;
for(const c of state.company.roster){
  const r=out.get(c.id),f=r.facts;
  for(const [id,level] of Object.entries(r.levels)){
    assert.ok(tags.has(id),"tag inconnu : "+id);
    assert.ok([1,2,3].includes(level),"trois niveaux : "+id);
  }
  // Son rôle principal : plein.
  if(f.main) assert.equal(r.levels["role/"+f.main],3,c.name+" : son rôle principal, plein");
  // Les meilleurs restent en mission : ni garde, ni job, ni poste (sauf Officier).
  if(f.meilleur){
    meilleurs++;
    assert.deepEqual(lit(r,"occupation/garde-du-corps"),[],c.name+" : pas de garde pour un des meilleurs");
    assert.deepEqual(lit(r,"occupation/job"),[],c.name+" : pas de job pour un des meilleurs");
    assert.deepEqual(lit(r,"occupation/poste").filter(id=>id!=="occupation/poste/officier"),[],c.name+" : pas de poste pour un des meilleurs");
  }
  if(r.levels["occupation/garde-du-corps"]) gardes++;
  // Bûcheron, Mines : ceux qui n'ont pas le niveau Mission.
  if(f.eligible) assert.ok(!r.levels["occupation/job/bucheron"]&&!r.levels["occupation/job/mines"],c.name+" : bon pour la mission, pas au bois");
  else assert.ok(r.levels["occupation/job/mines"]||f.meilleur,c.name+" : sans mission, à la mine");
  // Un seul style conseillé, aucun pour les profils cachés.
  const styles=tags.node("equipment/style-de-combat").enfants.filter(n=>r.levels[n.id]);
  assert.ok(styles.length<=1,c.name+" : un seul style");
  if(f.profile==="soutien"||f.profile==="pur_distance") assert.equal(styles.length,0,c.name+" : profil caché, pas de style");
  // L'armure conseillée : une qu'il sait porter.
  const armorRow=reference.baseArmors.rows.find(a=>a.nom===f.armor);
  assert.ok(armorRow,c.name+" : une armure conseillée");
  assert.ok(armorPorts.canWear(c,{itemType:"armor",templateId:"armor:"+armorRow.code}).ok,c.name+" : il sait porter "+f.armor);
}
assert.ok(meilleurs>0&&meilleurs<state.company.roster.length,"des meilleurs, mais pas tout le monde");
assert.ok(gardes>0,"des gardes du corps parmi les autres");

// Le seul soigneur part toujours en mission (« Ton seul soigneur, même médiocre, part toujours »).
const heal=reference.spells.rows.find(s=>s.code==="quick_heal");
const isHeal=code=>(reference.spells.rows.find(s=>s.code===code)?.tags||[]).includes("role/soin");
for(const c of state.company.roster) c.spells=(c.spells||[]).filter(s=>!isHeal(s.code));
const healer=state.company.roster[5];
healer.spells=[...(healer.spells||[]),{code:heal.code,name:heal.nom,school:heal.ecole,mastery:20}];
healer.skills.magic.Vie=Math.max(Number(healer.skills.magic.Vie)||0,40);
const withHealer=steward.evaluate(state,{level:3}).get(healer.id);
assert.ok(withHealer.levels["role/soin"],"il soigne : Soin");
assert.ok(withHealer.facts.eligible&&withHealer.levels["occupation/mission"],"le seul soigneur part en mission");

// La bande : ni l'intendant, ni le médecin. Ses places ne changent rien pour les autres.
const other=state.company.roster[3],intendant=state.company.roster[8];
const before=steward.evaluate({...state,company:{...state.company,roster:state.company.roster.filter(m=>m!==intendant)}},{level:3}).get(other.id).facts.roles;
state.company.intendantId=intendant.id;
const after=steward.evaluate(state,{level:3}).get(other.id).facts.roles;
assert.deepEqual(after,before,"l'intendant n'est pas comparé avec la bande");
state.company.intendantId=null;

// Un job seulement si le bâtiment est construit.
const bare=company(12,{buildings:[]});
for(const r of steward.evaluate(bare,{level:3}).values()){
  assert.deepEqual(lit(r,"occupation/job"),[],"aucun bâtiment : aucun job");
  assert.deepEqual(lit(r,"occupation/entrainement"),[],"aucun bâtiment : aucun entraînement");
}

// Dans le jeu : chargé avant ui.js ; « Demander à l'intendant » dans l'onglet, « Retaguer la compagnie » à l'Intendance.
const html=read("prototype-web/index.html"),ui=read("prototype-web/ui.js"),stewardUi=read("prototype-web/steward-ui.js");
assert.ok(html.indexOf('src="/core/steward-tags.js"')>html.indexOf('src="/core/mercenary-tags.js"')&&html.indexOf('src="/core/steward-tags.js"')<html.indexOf('src="ui.js"'));
assert.match(ui,/steward\.evaluate\(c, \{level: campaignRules\(\)\.companyRenownLevel\(c\)\}\)/,"au niveau de renommée de la compagnie");
assert.match(ui,/rules\.setSteward\(m, found\.levels\)/,"il ne remplace que ses tags");
assert.match(stewardUi,/data-steward-retag/);
assert.match(stewardUi,/stewardRetag\(\)/);
console.log("L'intendant qui tague : comparé à la bande, camps lus dans les fiches, meilleurs gardés pour la mission — OK");
