"use strict";

// Missions one shot (doc 17) : « Faire le ménage », camp ☠ gobelin ou orc, en boucle à la Taverne (Idan, 2026-10-24 ;
// camps par peuple et points de combat le 2026-11-01).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createMissionRules}=require("../game-core/missions.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
function seeded(seed){
  return function(){
    seed|=0;seed=seed+0x6D2B79F5|0;
    let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
const reference={oneShotMissions:read("one-shot-missions.json"),enemyArchetypes:read("enemy-archetypes.json"),weapons:read("weapons.json"),
  baseArmors:read("base-armors.json"),skills:read("skills.json"),itemQualities:read("item-qualities.json"),
  reputationStars:read("reputation-stars.json"),spells:read("spells.json")};
const rules=createMissionRules({reference,random:seeded(7)});

// Camps (Idan, 2026-11-01) : gobelin, orc, homme-bête, voleurs ou ogre au hasard. Budget par métal (doc 17 §16) :
// Bronze (niveaux 1 à 5) tirage 40–60 × niveau, Argent (6 à 10) 60–80 × niveau, Or (11 à 15) niveau² × tirage 8–12 ;
// monstres Bronze novice / normal 50–50, Argent novice / normal / vétéran 25–50–25, Or vétéran / élite 50–50 ; chef 1,
// chef 2, chef 3 ou 4 ; au plus 100 ennemis.
const CAMPS=Object.fromEntries(reference.oneShotMissions.missions[0].camps.map(c=>[c.faction,c]));
assert.deepEqual(Object.keys(CAMPS),["Gobelins","Orcs","Hommes-bêtes","Voleurs","Ogres","Culte des morts","Cour de sang"]);
const metalOf=L=>L<=5?"Bronze":L<=10?"Argent":"Or";
const BUDGET={Bronze:[40,60,1],Argent:[60,80,1],Or:[8,12,2]};
const LEVELS={Bronze:["novice","normal"],Argent:["novice","normal","vétéran"],Or:["vétéran","d’élite"]};
const CHIEFS={Bronze:["chef 1"],Argent:["chef 2"],Or:["chef 3","chef 4"]};
const mean=list=>list.reduce((t,x)=>t+x,0)/list.length;
const factions=Object.fromEntries(Object.keys(CAMPS).map(f=>[f,0])),drawn={},chiefs={},budgets={},sizes={};
for(const L of [1,3,5,6,8,10,11,13,15]) for(let i=0;i<300;i++){
  const camp=rules.rollCamp(undefined,null,{level:L}),metal=metalOf(L),[low,high,power]=BUDGET[metal],unit=Math.pow(L,power);
  assert.ok(camp.budget>=low*unit&&camp.budget<=high*unit&&camp.budget%unit===0,`budget ${metal} niveau ${L} : ${camp.budget}`);
  assert.equal(camp.points,rules.points(camp.chief)+camp.enemies.reduce((t,code)=>t+rules.points(code),0),"points du camp");
  // À une demi-créature près (la plus lourde du métal : une élite De luxe pèse jusqu'à 88 points).
  if(camp.enemies.length<100) assert.ok(Math.abs(camp.points-camp.budget)<=45,`près du budget : ${camp.points} / ${camp.budget}`);
  else assert.ok(camp.points<=camp.budget+45,`plafond de 100 ennemis : ${camp.points} / ${camp.budget}`);
  assert.ok(camp.enemies.length<=100);
  assert.equal(rules.archetype(camp.chief).faction,camp.faction);
  assert.ok(CHIEFS[metal].includes(rules.archetype(camp.chief).niveau),`chef ${metal}`);
  assert.equal(camp.campName,CAMPS[camp.faction].nom_camp);
  factions[camp.faction]++;
  for(const code of camp.enemies){ const a=rules.archetype(code); assert.equal(a.faction,camp.faction); assert.ok(LEVELS[metal].includes(a.niveau),metal+" : "+a.niveau);
    (drawn[metal]=drawn[metal]||[]).push(a.niveau); }
  (chiefs[metal]=chiefs[metal]||[]).push(rules.archetype(camp.chief).niveau);
  (budgets[L]=budgets[L]||[]).push(camp.budget);(sizes[L]=sizes[L]||[]).push(camp.enemies.length);
}
const share=(list,value)=>list.filter(x=>x===value).length/list.length;
for(const [f,n] of Object.entries(factions)) assert.ok(Math.abs(n/2700-1/7)<0.03,`un camp sur sept : ${f} ${n}`);
assert.ok(Math.abs(share(drawn.Bronze,"novice")-0.5)<0.05,"Bronze : 50 % de novices");
assert.ok(Math.abs(share(drawn.Argent,"normal")-0.5)<0.05&&Math.abs(share(drawn.Argent,"vétéran")-0.25)<0.05,"Argent : 25–50–25");
assert.ok(Math.abs(share(drawn.Or,"d’élite")-0.5)<0.05,"Or : 50 % d'élites");
assert.ok(Math.abs(share(chiefs.Or,"chef 4")-0.5)<0.08,"Or : chef 3 ou chef 4");
for(const [L,expected] of [[1,50],[3,150],[5,250],[6,420],[10,700],[11,1210],[15,2250]]) assert.ok(Math.abs(mean(budgets[L])/expected-1)<0.06,`budget moyen niveau ${L} : ${mean(budgets[L])} / ${expected}`);
assert.ok(mean(sizes[3])>9&&mean(sizes[3])<14,"3★ bronze : une douzaine d'ennemis : "+mean(sizes[3]));
assert.ok(mean(sizes[15])>50&&Math.max(...sizes[15])<=100,"5★ or : une armée, au plus 100 : "+mean(sizes[15]));
// « 100 + chef » (Idan, 2026-11-02 : « j'ai dit 100 pour qu'on n'ait pas vraiment de limites ») : 100 troupes au plus,
// plus le chef.
{
  const big=createMissionRules({reference,random:seeded(3)});
  let most=0;
  for(let i=0;i<400;i++){ const camp=big.rollCamp(undefined,null,{level:15}); assert.ok(camp.enemies.length<=100&&camp.chief); most=Math.max(most,camp.enemies.length); }
  assert.equal(most,100,"le plafond est atteint en 5★ or, le chef en plus");
}

// Chef permis au niveau de la mission (Idan, 2026-11-02) : le chef du métal s'il est permis (niveau_mission_min), sinon le
// cran en dessous (chef 4, 3, 2, 1) ; si le peuple du camp n'en a aucun, un autre camp.
{
  const archetypes=JSON.parse(JSON.stringify(reference.enemyArchetypes));
  const chiefRow=(faction,level)=>archetypes.rows.find(r=>r.faction===faction&&r.ligne==="Chef"&&r.niveau===level);
  const withChiefs=()=>createMissionRules({reference:{...reference,enemyArchetypes:archetypes},random:seeded(11)});
  // Gobelins : chefs 3 et 4 réservés au niveau 12 ; en Or niveau 11, on descend au chef 2.
  chiefRow("Gobelins","chef 3").niveau_mission_min=12;
  chiefRow("Gobelins","chef 4").niveau_mission_min=12;
  let r=withChiefs();
  for(let i=0;i<50;i++) assert.equal(r.archetype(r.rollCamp(r.definition(),CAMPS.Gobelins,{level:11}).chief).niveau,"chef 2");
  assert.ok(["chef 3","chef 4"].includes(r.archetype(r.rollCamp(r.definition(),CAMPS.Gobelins,{level:12}).chief).niveau));
  // Ogres : aucun chef avant le niveau 15 ; au niveau 3, jamais de camp ogre, toujours un chef.
  for(const n of ["chef 1","chef 2","chef 3","chef 4"]) chiefRow("Ogres",n).niveau_mission_min=15;
  r=withChiefs();
  const seen=new Set();
  for(let i=0;i<500;i++){ const camp=r.rollCamp(undefined,null,{level:3}); seen.add(camp.faction); assert.ok(camp.chief); assert.equal(r.archetype(camp.chief).faction,camp.faction); }
  assert.deepEqual([...seen].sort(),["Cour de sang","Culte des morts","Gobelins","Hommes-bêtes","Orcs","Voleurs"],"un autre camp que les ogres");
  assert.equal(r.rollCamp(r.definition(),CAMPS.Ogres,{level:3}).chief,null,"camp imposé (Design Lab) : sans chef");
  // Aucun peuple n'a de chef permis : le camp n'a pas de chef, et l'offre ne le compte pas.
  for(const row of archetypes.rows.filter(x=>x.ligne==="Chef")) row.niveau_mission_min=15;
  r=withChiefs();
  const offer=r.createOffer({level:3});
  assert.equal(offer.camp.chief,null);
  assert.equal(offer.enemyCount,offer.camp.enemies.length);
}

// Niveau de la mission : niveau de Renommée de la compagnie (reputation-stars.json) + écart de −3 à +2, borné de 1 à 15.
// Seuils recalés le 2026-11-06 (reputation-stars.json).
assert.deepEqual([rules.renownLevel(0),rules.renownLevel(451),rules.renownLevel(452),rules.renownLevel(800),rules.renownLevel(6400)],[1,2,3,6,15]);
const levelsAt=renown=>Array.from({length:3000},()=>rules.rollMissionLevel(rules.definition(),renown));
const at3=levelsAt(500),at15=levelsAt(8000);
assert.deepEqual([...new Set(at3)].sort((a,b)=>a-b),[1,2,3,4,5]);
assert.ok(Math.abs(share(at3,1)-2/6)<0.04,"3★ bronze : −3 et −2 tombent au niveau 1");
assert.deepEqual([...new Set(at15)].sort((a,b)=>a-b),[12,13,14,15]);
assert.ok(Math.abs(share(at15,15)-0.5)<0.04,"5★ or : 0, +1 et +2 restent au niveau 15");

// Offre (Idan, 2026-11-01) : jours de marche 1 à niveau ; récompense = 5 000 + tirage 30–40 × budget × niveau ; valable 3 à
// 6 jours ; un des trois ordres du peuple du camp.
const orders=Object.fromEntries(Object.keys(CAMPS).map(f=>[f,new Set()]));
for(let day=1;day<=800;day++){
  const level=1+day%15,offer=rules.createOffer({day,level});
  orders[offer.faction].add(offer.order);
  assert.deepEqual([offer.level,offer.difficulty],[level,level]);
  assert.ok(offer.distance>=1&&offer.distance<=level,`marche 1 à ${level} : ${offer.distance}`);
  assert.equal(offer.enemyCount,offer.camp.enemies.length+1);
  const k=(offer.reward-5000)/(offer.camp.budget*level);
  assert.ok(Number.isInteger(k)&&k>=30&&k<=40,`récompense : ${offer.reward}`);
  assert.equal(offer.campName,offer.camp.campName);
  assert.ok(offer.expiresDay-day>=3&&offer.expiresDay-day<=6);
  const text=rules.orderText(offer,{date:"1 Brumecendre",date_expiration:"5 Brumecendre",an:842});
  for(const line of [...text.paragraphs,text.signature]) assert.doesNotMatch(line,/\{[^}]+\}/,"tous les champs remplis : "+line);
  assert.doesNotMatch(text.paragraphs.join(" "),/\b1 jours\b/);
  if(offer.faction!=="Gobelins") assert.doesNotMatch(text.paragraphs.join(" "),/gobelin/i,"seule une lettre gobeline parle de gobelins");
  const bosses=reference.oneShotMissions.noms[CAMPS[offer.faction].noms.chefs];
  if(/rival/.test(offer.order)) assert.ok(bosses.some(n=>text.paragraphs.join(" ").includes(n)),"le chef de camp du bon peuple");
}
assert.ok(rules.createOffer({day:1,renown:0}).level<=3,"compagnie à 1★ bronze : niveaux 1 à 3");
assert.equal(rules.estimation(95),"une véritable armée");
assert.deepEqual([...orders.Gobelins].sort(),["emperor","goblin_rival","village"],"les trois ordres gobelins");
assert.deepEqual([...orders.Orcs].sort(),["emperor_orcs","orc_rival","village_orcs"],"les trois ordres orcs");
assert.deepEqual([...orders["Hommes-bêtes"]].sort(),["beastman_rival","emperor_hommes_betes","village_hommes_betes"]);
assert.deepEqual([...orders.Voleurs].sort(),["emperor_voleurs","thief_rival","village_voleurs"]);
assert.deepEqual([...orders.Ogres].sort(),["emperor_ogres","ogre_rival","village_ogres"]);
assert.deepEqual([...orders["Culte des morts"]].sort(),["emperor_culte","priest_culte","village_culte"]);
assert.deepEqual([...orders["Cour de sang"]].sort(),["emperor_cour","noble_cour","village_cour"]);
// Chaque peuple de camp : ses lignes (cinq, six pour la Cour de sang) sur quatre niveaux et quatre chefs, avec leurs points.
for(const [faction,camp] of Object.entries(CAMPS)){
  const own=reference.enemyArchetypes.rows.filter(a=>a.faction===faction);
  assert.equal(own.length,4*camp.lignes.length+4,faction);
  for(const l of camp.lignes) for(const level of ["novice","normal","vétéran","d’élite"]){
    const a=own.find(x=>x.ligne===l.ligne&&x.niveau===level);
    assert.ok(a&&a.points>0,`${faction} ${l.ligne} ${level}`);
  }
}

// Ennemis : la fiche figée remplace caractéristiques, PV, compétences et équipement d'un personnage de base.
let offer=null;
for(let day=4;!offer;day++){ const o=rules.createOffer({day,level:1}); if(o.faction==="Gobelins") offer=o; }
const base=()=>({id:900,name:"Base",stats:{Force:1,Courage:1,Charisme:12},resistances:{"Résistance physique":0},
  skills:{martial:{Lance:80,Arc:80,"Port d’armure lourde":true},social:{Intimidation:99},magic:{Feu:3}},
  equipment:{slots:{armor:null,weapon_set_1_main:null,weapon_set_1_off:null,weapon_set_2_main:null,ring_1:null},profile:{type:"magic"}},
  items:[{id:"old",name:"Hallebarde"}]});
const enemies=rules.buildEnemies(offer,()=>base());
assert.equal(enemies.length,offer.enemyCount);
const chief=enemies[enemies.length-1],caid=rules.archetype("goblin_chief_1");
assert.equal(chief.name,offer.fields.boss+" (Caïd gobelin)");
assert.deepEqual([chief.pvMax,chief.pv,chief.stats.Force,chief.stats.Charisme],[caid.pv,caid.pv,caid.caracteristiques.Force,caid.caracteristiques.Charisme]);
assert.equal(chief.skills.martial.Sabre,caid.competences_martiales.Sabre);
assert.equal(chief.skills.martial.Lance,0,"les autres compétences tombent à 0");
assert.equal(chief.skills.martial["Port d’armure lourde"],false);
assert.equal(chief.skills.martial["Port d’armure intermédiaire"],true);
assert.equal(chief.skills.social.Intimidation,caid.intimidation);
assert.equal(chief.skills.magic.Feu,3,"la magie de la base reste");
const [sabre,rondache,armor]=chief.items;
assert.deepEqual([sabre.name,sabre.itemType,sabre.tier,sabre.qualityCode,sabre.category,sabre.combatFamily,chief.equipment.slots.weapon_set_1_main],
  ["Sabre","weapon",3,"luxury","Lames longues","melee",sabre.id]);
assert.deepEqual([rondache.name,chief.equipment.slots.weapon_set_1_off],["Rondache",rondache.id]);
assert.deepEqual([armor.name,armor.templateId,armor.itemType,chief.equipment.slots.armor],["Cuir renforcé","armor:reinforced_leather","armor",armor.id]);
assert.equal(new Set(enemies.flatMap(e=>e.items.map(i=>i.id))).size,enemies.reduce((n,e)=>n+e.items.length,0),"identifiants uniques");
const names=enemies.slice(0,-1).map(e=>e.name);
assert.equal(new Set(names).size,names.length,"les doublons sont numérotés");
// Camp orc : des orcs, et le Chef de bande nommé.
let orcOffer=null;
for(let day=10;!orcOffer;day++){ const o=rules.createOffer({day,level:2}); if(o.faction==="Orcs") orcOffer=o; }
const orcs=rules.buildEnemies(orcOffer,()=>base());
const orcChief=orcs[orcs.length-1],bande=rules.archetype("orc_chief_1");
assert.equal(orcChief.name,orcOffer.fields.boss+" (Chef de bande orc)");
assert.equal(orcChief.pvMax,bande.pv);
assert.ok(orcs.every(e=>/orc/.test(e.archetype)));

// Issue : victoire = récompense + coffre + butin des ennemis morts (selon leur fiche) + équipement de nos morts ; défaite =
// −30 de renommée.
const fallen={id:1,items:[{id:"m1",name:"Épée longue",owner:1}]};
const win=rules.outcome(offer,{victory:true,deadEnemies:enemies.slice(0,2),deadMercenaries:[fallen],chestItems:[{id:"c1",name:"Bague du courage",owner:3}]});
assert.equal(win.reward,offer.reward);
assert.ok(win.chestGold>=0&&win.chestGold<=Math.floor(100*offer.camp.budget*offer.level/2));
assert.ok(win.loot.some(i=>i.id==="m1")&&win.loot.length<=enemies[0].items.length+enemies[1].items.length+1,"nos morts rendent tout");
assert.ok([...win.loot,...win.chestItems].every(it=>it.owner===null));
const lose=rules.outcome(offer,{victory:false,deadEnemies:enemies,deadMercenaries:[fallen]});
assert.deepEqual([lose.reward,lose.chestGold,lose.loot.length,lose.renown],[0,0,0,-30]);
assert.equal(rules.deathMultiplier(offer,false),2);
// Bestiaire (Idan, 2026-11-01) : butin et niveau de mission minimum par créature. L'équipement peut se casser au combat :
// 100 % − 10 % par tier de chance de récupérer chaque objet porté ; rien en plus ; dès le niveau 1.
// Culte des morts (2026-11-06) : les spectres, insensibles aux armes, à partir du niveau de mission 6 (Idan : « un peu plus tard. 6 ou 7 »).
for(const a of reference.enemyArchetypes.rows){
  // Le troll (Idan, 2026-11-06 : « à partir de 6* ») aussi.
  assert.deepEqual([a.niveau_mission_min,a.butin],[["Spectre","Troll"].includes(a.ligne)?6:1,{equipement:100-10*a.tier,objets:[]}],"butin : "+a.code);
}
{
  const breakRules=createMissionRules({reference,random:seeded(21)});
  let novice=null;
  for(let day=50;!novice;day++) novice=rules.buildEnemies(rules.createOffer({day,level:1}),()=>base()).find(e=>breakRules.archetype(e.archetype).tier===1);
  let kept=0,carried=0;
  // Une arme naturelle (griffes, morsure) ne se ramasse jamais : on ne compte que l'équipement.
  for(let i=0;i<500;i++){ kept+=breakRules.outcome(offer,{victory:true,deadEnemies:[novice]}).loot.length; carried+=novice.items.filter(it=>!it.natural).length; }
  assert.ok(Math.abs(kept/carried-0.9)<0.04,`T1 : 90 % récupérés (${kept} / ${carried})`);
}
// Chefs (Idan, 2026-11-01 : « les chefs qui n'ont pas de points mesurés ») : toutes les fiches ont leurs points, et chaque
// chef pèse plus que le précédent de son peuple.
assert.ok(reference.enemyArchetypes.rows.every(a=>Number.isInteger(a.points)&&a.points>0),"toutes les fiches ont leurs points");
for(const faction of Object.keys(CAMPS)){
  const chiefs=["chef 1","chef 2","chef 3","chef 4"].map(n=>reference.enemyArchetypes.rows.find(a=>a.faction===faction&&a.niveau===n).points);
  assert.ok(chiefs.every((p,i)=>!i||p>chiefs[i-1]),faction+" : "+chiefs.join(" < "));
}
{
  const tuned=JSON.parse(JSON.stringify(reference));
  const arch=code=>tuned.enemyArchetypes.rows.find(a=>a.code===code);
  // Butin : 0 % d'équipement, une potion sûre, un manuel jamais.
  arch(enemies[0].archetype).butin={equipement:0,objets:[{type:"potion",nom:"Potion de soins",tier:1,chance:100},{type:"manual",nom:"Boule de feu",chance:0}]};
  const made=[];
  const t=createMissionRules({reference:tuned,random:seeded(11)});
  const r=t.outcome(offer,{victory:true,deadEnemies:[enemies[0]],makeItem:(type,name,tier)=>(made.push([type,name,tier]),{id:"x",name,owner:5})});
  assert.deepEqual(made,[["potion","Potion de soins",1]]);
  assert.deepEqual(r.loot.map(i=>[i.name,i.owner]),[["Potion de soins",null]],"équipement à 0 % : rien de porté ; la potion, sans propriétaire");
  // Équipement à 50 % : à peu près la moitié des objets portés.
  arch(enemies[0].archetype).butin={equipement:50,objets:[]};
  const half=createMissionRules({reference:tuned,random:seeded(12)});
  let kept=0,carried=0;
  for(let i=0;i<400;i++){ kept+=half.outcome(offer,{victory:true,deadEnemies:[enemies[0]]}).loot.length; carried+=enemies[0].items.length; }
  assert.ok(Math.abs(kept/carried-0.5)<0.08,`≈ 50 % : ${kept} / ${carried}`);
  // Niveau minimum : les gobelins « Archer » attendent une mission 7 (2★ argent) ; à la difficulté 1, jamais d'archer.
  for(const a of tuned.enemyArchetypes.rows) if(a.faction==="Gobelins"&&a.ligne==="Archer") a.niveau_mission_min=7;
  const gate=createMissionRules({reference:tuned,random:seeded(13)}),goblinCamp=CAMPS.Gobelins;
  const lines=level=>new Set(Array.from({length:200},()=>gate.rollCamp(undefined,goblinCamp,{level}).enemies).flat().map(c=>gate.archetype(c).ligne));
  assert.ok(!lines(1).has("Archer"),"pas d'archer avant la mission 7");
  assert.ok(lines(7).has("Archer"),"des archers à la mission 7");
  assert.equal(gate.missionMin(gate.archetype("goblin_archer_novice")),7);
}
// Coffre (Idan, 2026-11-01 : « la partie loterie du butin ») : or = tirage 1–100 × budget × niveau ÷ 2 ; T1 1D6 × niveau,
// T2 1D3 × niveau, T3 ⌈1D6 × niveau ÷ 5⌉, T4 ⌈1D6 × niveau ÷ 5⌉ − 2 ; chaque sort d'une seule école à niveau %.
const chestAt=(level,budget)=>({code:"cleanup",level,camp:{budget}});
const golds=Array.from({length:2000},()=>rules.rollChestGold(chestAt(3,150)));
assert.ok(Math.min(...golds)>=225&&Math.max(...golds)<=22500,"1 à 100 × 150 × 3 ÷ 2");
assert.ok(Math.abs(mean(golds)/(50.5*150*3/2)-1)<0.05,"moyenne : "+mean(golds));
const plans=level=>Array.from({length:1500},()=>rules.chestPlan(chestAt(level,50)));
const tierCount=(plan,t)=>plan.tiers.filter(x=>x===t).length,range=(list,t)=>{ const n=list.map(p=>tierCount(p,t)); return [Math.min(...n),Math.max(...n)]; };
const p1=plans(1),p3=plans(3),p15=plans(15);
assert.deepEqual([range(p1,1),range(p1,2),range(p1,3),range(p1,4)],[[1,6],[1,3],[1,2],[0,0]],"1★ bronze");
assert.deepEqual([range(p15,1),range(p15,2),range(p15,3),range(p15,4)],[[15,90],[15,45],[3,18],[1,16]],"5★ or");
assert.ok(Math.abs(mean(p3.map(p=>tierCount(p,4)>0?1:0))-0.5)<0.05,"3★ bronze : un T4 une fois sur deux");
assert.ok(Math.abs(mean(p1.map(p=>p.manuals.length))-0.9)<0.1,"1★ bronze : 90 sorts à 1 % : "+mean(p1.map(p=>p.manuals.length)));
assert.ok(Math.abs(mean(p15.map(p=>p.manuals.length))-13.5)<0.5,"5★ or : 90 sorts à 15 %");
assert.ok(p15.every(p=>p.manuals.every(code=>reference.spells.rows.some(sp=>sp.code===code))));
assert.equal(rules.deathMultiplier(offer,true),1);
assert.deepEqual(rules.mapSize(offer),{cols:30,rows:15},"carte de 30 × 15 (Idan : « une ambiance à la X-com »)");

// Campagne : une offre au tableau dès le départ, prise par une autre compagnie après sa date ; l'expédition ; la renommée
// de missions ; pas de prime pour un fuyard sorti de la carte.
const files={peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",ancestries:"ancestries.json",
  ancestryCompatibility:"ancestry-compatibility.json",cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",
  d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",characteristics:"characteristics.json",
  formulaConstants:"formula-constants.json",weapons:"weapons.json",baseArmors:"base-armors.json",itemQualities:"item-qualities.json",
  equipmentSlots:"equipment-slots.json",startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",
  alignmentGeneration:"alignment-generation.json",renamedNames:"renamed-names.json"};
const full=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,read(file)]));
const generator=createGenerator(full,{random:seeded(3),nameGenerator:(people,id)=>people+" "+id});
const tavern=createTavernRules({reference:full,random:seeded(4)});
const campaign=createCampaignRules({generator,tavern,reference:full,missions:createMissionRules({reference,random:seeded(5)})});
const captain=generator.createCaptain({id:1,name:"Capitaine"});
const squad=[2,3].map(id=>generator.createMercenary({id,captain}));
const game=campaign.createCampaign({captain,squad});
// Taverne à 5 missions (Idan, 2026-11-01) : 5 cases, ici toutes des contrats (pas de garde du corps dans cette campagne).
const offers=()=>campaign.boardOffers(game);
assert.equal(campaign.tavernSlots(game).length,5);
assert.ok(offers().length===5&&offers().every(o=>o.code==="cleanup"),"5 contrats au tableau");
assert.equal(campaign.fillTavernBoard(game),false,"tableau plein");
const first=offers().reduce((a,b)=>a.expiresDay<=b.expiresDay?a:b);
const reports=campaign.advanceTime(game,first.expiresDay-game.day);
assert.ok(reports.every(r=>!r.offersLost.includes(first)),"valable jusqu'à sa date");
const [taken]=campaign.advanceTime(game,1);
assert.ok(taken.offersLost.includes(first),"prise par une autre compagnie le lendemain");
assert.ok(!offers().includes(first)&&offers().length===5,"aussitôt remplacée");
// Expédition (Idan, 2026-10-24) : l'escouade part, le camp continue ; elle arrive au bout de la distance, le combat
// l'attend ; après le combat, elle rentre en autant de jours avec l'or, les objets et les primes.
const signed=offers()[2],signedSlot=campaign.tavernSlots(game)[2];
assert.deepEqual(campaign.departExpedition(game,[2,3],"inconnu"),{ok:false,reason:"Ce contrat n’est plus au tableau."});
const departure=campaign.departExpedition(game,[2,3],signed.id);
assert.ok(departure.ok);
const trip=departure.expedition;
// Mission programmée (Idan, 2026-10-30) : départ le lendemain matin, puis les jours de marche ; d'ici là, l'escouade est
// au camp (on lui parle, on l'équipe, elle recharge son mana) mais ne part sur aucune autre mission.
assert.deepEqual([trip.offer,trip.memberIds,trip.status,trip.departDay,trip.arriveDay],[signed,[2,3],"scheduled",game.day+1,game.day+1+signed.distance]);
assert.deepEqual([signedSlot.offer,signedSlot.emptyUntil,offers().length],[null,game.day+1,4],"case prise : vide jusqu'au lendemain ; les autres restent (plusieurs escouades possibles)");
assert.equal(campaign.isAvailable(squad[0],game),false,"pris par la mission");
assert.equal(campaign.awayOf(game,2),null,"encore au camp");
assert.equal(campaign.isAvailable(captain,game),true);
assert.deepEqual(campaign.departExpedition(game,[2]),{ok:false,reason:"Un de ces mercenaires est déjà en mission."});
const [leave]=campaign.advanceTime(game,1);
assert.ok(signedSlot.offer&&signedSlot.offer!==signed&&signedSlot.emptyUntil===null,"24 heures après : une nouvelle mission dans la case");
assert.deepEqual(leave.expeditions.departed,[trip],"départ le lendemain matin");
assert.equal(trip.status,"outbound");
assert.equal(campaign.awayOf(game,2),trip);
const outbound=campaign.advanceTime(game,signed.distance);
assert.ok(outbound.slice(0,-1).every(r=>!r.expeditions.arrived.length));
assert.deepEqual(outbound[outbound.length-1].expeditions.arrived,[trip],"arrivée au bout de la distance");
assert.equal(trip.status,"arrived");
assert.deepEqual(campaign.advanceTime(game,1)[0].expeditions.waiting,[trip],"le combat attend le joueur");
assert.deepEqual([campaign.canAdvanceDay(game).ok,campaign.canAdvanceDay(game).expedition],[false,trip],"pas de jour suivant avant le combat");
const won=rules.outcome(signed,{victory:true,deadEnemies:[{id:50,items:[{id:"g1",name:"Fronde",owner:50}]}],chestItems:[{id:"c2",name:"Bague du courage"}]});
const goldBefore=game.company.gold,stockBefore=game.company.stock.length;
campaign.completeExpeditionCombat(game,trip.id,{result:won,bonuses:[{id:2,bonus:100},{id:3,bonus:80}]});
assert.deepEqual([trip.status,trip.returnDay,game.company.gold,game.company.stock.length],["returning",game.day+signed.distance,goldBefore,stockBefore],"rien n'arrive avant le retour");
assert.equal(campaign.canAdvanceDay(game).ok,true,"combat livré : les jours reprennent");
const back=campaign.advanceTime(game,signed.distance).map(r=>r.expeditions.returned).flat();
assert.equal(back.length,1);
assert.deepEqual([back[0].gold,back[0].items,back[0].bonusPaid],[won.reward+won.chestGold,2,180]);
assert.equal(game.company.stock.length,stockBefore+2);
assert.equal(campaign.expeditionOf(game,2),null,"de retour au camp");
// Défaite : la renommée baisse tout de suite ; personne ne rentre, rien n'arrive.
const lost=campaign.departExpedition(game,[3]).expedition;
campaign.advanceTime(game,1+lost.offer.distance);
const missionRenown=Number(game.company.missionRenown)||0;
game.company.roster=game.company.roster.filter(m=>m.id!==3);
const none=campaign.completeExpeditionCombat(game,lost.id,{result:rules.outcome(lost.offer,{victory:false})});
assert.deepEqual([none.gold,none.items,game.company.missionRenown],[0,0,missionRenown-30]);
assert.equal((game.expeditions||[]).length,0);
game.company.missionRenown=0;
const renown=campaign.companyRenown(game).total;
game.company.missionRenown=-30;
assert.equal(campaign.companyRenown(game).total,renown-30);
assert.equal(campaign.companyRenown(game).parts.missions,-30);
for(const m of squad) m.contract={...(m.contract||{}),missionBonus:100};
const gold=game.company.gold;
const report=campaign.applyMissionAftermath(game,{results:[
  {id:2,dead:false,wounded:false,fatigueDays:3,offMap:true},
  {id:1,dead:false,wounded:false,fatigueDays:3,offMap:false}],captainDead:false});
assert.equal(report.bonusPaid,0,"le fuyard sorti de la carte ne touche pas sa prime ; le capitaine n'en a pas");
assert.equal(game.company.gold,gold);
squad[0].recovery=null;
const deferred=campaign.applyMissionAftermath(game,{results:[{id:2,dead:false,wounded:false,fatigueDays:3,offMap:false}],captainDead:false},{deferBonuses:true});
assert.deepEqual([deferred.bonusPaid,deferred.bonusesDue.map(b=>[b.id,b.bonus])],[0,[[2,100]]],"expédition : prime due au retour");
assert.equal(game.company.gold,gold);
// Inventaire (Idan, 2026-10-30) : un mort en mission rend à l'Intendance ce qu'il gardait au dortoir ; ce qu'il portait
// reste avec lui (butin d'une victoire).
const dead=squad[0],deadWorn=Object.values(dead.equipment.slots).filter(Boolean);
dead.items.push({id:"bag1",name:"Dague",tier:1,itemType:"weapon",owner:dead.id,slot:null});
const stockBeforeDeath=game.company.stock.length;
const death=campaign.applyMissionAftermath(game,{results:[{id:dead.id,dead:true}],captainDead:false});
assert.deepEqual(death.inventoryReturned.map(x=>x.id),["bag1"]);
assert.equal(game.company.stock.length,stockBeforeDeath+1);
assert.deepEqual([game.company.stock.at(-1).id,game.company.stock.at(-1).owner],["bag1",null]);
assert.deepEqual(dead.items.map(x=>x.id).sort(),[...deadWorn].sort(),"il garde ce qu'il portait");

// Objets du coffre (Idan, 2026-10-25) : toutes les familles d'équipement, au tier tiré et à sa qualité, sans propriétaire.
const families=new Set();
for(let i=0;i<400;i++){
  const item=generator.createChestItem(captain,3);
  assert.deepEqual([item.tier,item.qualityCode,item.owner],[3,"luxury",null],item.name);
  families.add(item.itemType);
}
for(const family of ["weapon","armor"]) assert.ok(families.has(family),family);
assert.equal(generator.createChestItem(captain,2).qualityCode,"standard");
{
  // Qualités (Idan, 2026-11-01) : une par tier — Usée, Correcte, De bonne facture, De luxe.
  const t4=generator.createChestItem(captain,4);
  assert.deepEqual([t4.tier,t4.qualityCode,t4.qualityName],[4,"deluxe","De luxe"]);
  assert.equal(generator.createChestItem(captain,3).qualityName,"De bonne facture");
}
const missionUi=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
assert.match(missionUi,/rules\.chestPlan\(offer\)/);
assert.match(missionUi,/plan\.tiers\.map\(tier=>game\.generator\.createChestItem\(captain,tier\)\)/);
assert.match(missionUi,/plan\.manuals\.map\(code=>game\.generator\.createItemByName\("manual",code\)\)/);

// Primes de mission divisées par deux (Idan, 2026-10-25) : une partie commencée avant voit ses contrats divisés une fois.
const halved=campaign.createCampaign({captain,squad:[generator.createMercenary({id:70,captain})]});
assert.equal(halved.company.missionBonusHalved,true,"partie neuve : déjà au nouveau barème");
assert.equal(campaign.ensureHalvedMissionBonuses(halved),false);
delete halved.company.missionBonusHalved;
const veteran=halved.company.roster.find(m=>m.id===70);
veteran.contract.missionBonus=151;
assert.equal(campaign.ensureHalvedMissionBonuses(halved),true);
assert.equal(veteran.contract.missionBonus,76);
assert.equal(campaign.ensureHalvedMissionBonuses(halved),false,"une seule fois");

console.log("Missions one shot : niveau, budget par métal, monstres, récompense, coffre loterie, casse au combat, carte 30 × 15, ordres, renommée, primes ÷ 2 — OK");
