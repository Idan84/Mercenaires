"use strict";

// Le Mémorial (Idan, 2026-11-09) : « plus un bâtiment souvenir. Il est là dès le début. On y retrouve le portrait de tous
// ceux qui sont décédés au sein de la compagnie. Quand on clique dessus, on voit l'avatar complet avec sa date de décès, la
// cause de son décès (un peu drôle, c'est mieux !) et un épitaphe délirant » ; « Une seule place [pour la nécromancie]...
// pour les morts, illimités ! » ; pas les animaux ; « si on peut garder son historique, c'est cool » ; « L'xp depend ici du
// nombre de morts dans la compagnie. A 10 morts, c'est l'équivalent du lvl 1 » ; « linéaire ? On ouvre à 1 mort ? ».
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createAffinityRules}=require("../game-core/affinity.js");
const {createMemorialRules}=require("../game-core/memorial.js");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createMagicRules}=require("../game-core/magic.js");
const Progression=require("../game-core/progression.js");
const MissionEnd=require("../game-core/mission-end.js");
const MissionTerrain=require("../game-core/mission-terrain.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.memorial,"memorial.json","le jeu charge les textes du Mémorial");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual([constant("camp.memorial.deaths_per_level"),constant("camp.memorial.places")],[10,1]);

// 1. Les textes : une centaine d'épitaphes, des tournures pour chaque nature de cause ; rien que des {…} connus.
const copy=reference.memorial;
assert.ok(copy.epitaphs.length>=100,"une centaine d'épitaphes : "+copy.epitaphs.length);
assert.equal(new Set(copy.epitaphs).size,copy.epitaphs.length,"toutes différentes");
for(const kind of ["melee","ranged","charge","countercharge","opportunity","fleeing","backstab","fumble","spell","spell_feu","spell_froid",
  "spell_foudre","spell_seul","spell_fumble","poison","poison_seul","curse","raised","raised_friendly","friendly","captured","duel","unknown"])
  assert.ok(copy.causes[kind]?.length>0,"des tournures pour "+kind);
const known=new Set(["prenom","Prenom","tueur","Tueur","un_tueur","Un_tueur","arme","sort","n","date","jours"]);
for(const text of [...copy.epitaphs,...Object.values(copy.causes).flat(),...Object.values(copy.details),...Object.values(copy.panel)])
  for(const [,key] of text.matchAll(/\{([^{}]*)\}/g)) assert.ok(key.includes("|")||known.has(key),"inconnu : {"+key+"} dans « "+text+" »");

// 2. Les règles : une entrée par mort, sa fiche réduite (pas d'objets), une épitaphe jamais reprise.
let seed=47;
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});
const memorial=createMemorialRules({reference,random:genRandom});
const scratch={day:12,company:{}};
const dead=generator.createMercenary({id:50,captain});
dead.sex="homme";
dead.avatar={id:"humain-001",portrait:"Humain_001_square.jpg",full:"Humain_001.jpg"};
const entry=memorial.record(scratch,dead,{cause:{kind:"melee",by:{name:"Guerrier orc vétéran"},weapon:"Hache de guerre"}});
assert.deepEqual([entry.id,entry.day,entry.cause.kind,Number.isInteger(entry.epitaph)],[50,12,"melee",true]);
assert.equal(memorial.record(scratch,dead),entry,"une seule fois");
assert.equal(entry.profile.items,undefined,"pas ses objets");
assert.deepEqual([entry.profile.avatar,entry.profile.people,entry.profile.name],[dead.avatar,dead.people,dead.name],"son avatar, son peuple");
assert.ok(JSON.stringify(entry.profile).length<JSON.stringify(dead).length/2,"une fiche réduite");
let text=memorial.describe(entry);
assert.ok(text.cause.includes("un Guerrier orc vétéran"),text.cause);
assert.equal(text.detail,"Arme du crime : Hache de guerre.");
assert.ok(text.epitaph.length>10&&!/[{}]/.test(text.epitaph),text.epitaph);
// Une goule : « une » ; une morte : le féminin ; sans tueur connu : la tournure sans tueur.
const herself=generator.createMercenary({id:51,captain});
herself.sex="femme";
const ghoul=memorial.record(scratch,herself,{cause:{kind:"backstab",by:{name:"Goule"},weapon:"Griffes"}});
assert.equal(memorial.describe({...ghoul,cause:{...ghoul.cause,variant:0}}).cause,
  "Frappée dans le dos par une Goule. Ne s’est jamais retournée, et pour cause.");
assert.equal(memorial.causeKind({kind:"poison"}),"poison_seul");
assert.equal(memorial.causeKind({kind:"spell_feu",by:{name:"Acolyte"}}),"spell_feu");
assert.equal(memorial.causeKind({kind:"spell_feu"}),"spell_seul");
assert.equal(memorial.causeKind({kind:"raised"}),"unknown");
assert.equal(memorial.causeKind("duel"),"unknown","un duel sans capitaine nommé");
const friendly=memorial.describe({...ghoul,cause:{kind:"friendly",by:{name:"Brunhild",proper:true,friendly:true},variant:0}});
assert.ok(friendly.cause.includes("Brunhild")&&!friendly.cause.includes("un Brunhild"),friendly.cause);
// Les épitaphes : jamais deux fois tant qu'il en reste.
const crowd={day:1,company:{}};
for(let i=0;i<copy.epitaphs.length;i++) memorial.record(crowd,{id:1000+i,name:"M "+i,sex:i%2?"femme":"homme"},{cause:null});
assert.equal(new Set(crowd.company.memorial.map(e=>e.epitaph)).size,copy.epitaphs.length,"toutes différentes");
assert.ok(Number.isInteger(memorial.record(crowd,{id:5000,name:"Le dernier"}).epitaph),"toutes prises : on en reprend une");
// Une entrée d'avant (la désertion : cause en texte) garde son sens.
const old={day:3,company:{memorial:[{id:7,name:"Ancien",day:2,cause:"duel",profile:{name:"Ancien"}}]}};
assert.deepEqual(memorial.entries(old)[0].cause,{kind:"duel"});

// 3. En combat : la cause est notée quand l'un des nôtres tombe (le coup, sa propre maladresse, un sort, le relevé en zombie).
const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},parentElement:{clientWidth:900},
  classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){}});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const game={campaign:null,captain,referenceData:reference};
const engine=createCombatEngine(reference,{onAttack:(...a)=>api.onMissionAttack(...a)});
const magicRules=()=>createMagicRules({reference,combat:engine});
const mission=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
const api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd",
  "MercenairesMagic","MercenairesMissionTerrain",
  mission+"\nreturn {makeMissionUnit,sortMissionInitiative,onMissionAttack,damageMissionUnitBySpell,resolveMissionAftermath,noteMissionDown};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,
    {createMagicRules},MissionTerrain);
const squad=[60,61,62,63].map(id=>generator.createMercenary({id,captain}));
const foes=[70,71].map(id=>generator.createMercenary({id,captain}));
const players=squad.map((c,i)=>api.makeMissionUnit(c,"player",i));
const enemies=foes.map((c,i)=>api.makeMissionUnit(c,"enemy",i));
enemies[0].character.role="Guerrier orc";
game.mission={engine,endRules:MissionEnd.createMissionEndRules({reference}),progression:Progression.createProgressionRules({reference}),
  players,enemies,playerOrder:api.sortMissionInitiative(players,engine),enemyOrder:api.sortMissionInitiative(enemies,engine),
  activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null};
const [p0,p1,p2,p3]=players,[orc,other]=enemies;
// Un coup d'épée qui le fait tomber pendant qu'il fuit.
p0.fleeing=true; p0.alive=false; p0.hp=-30;
api.onMissionAttack(orc,p0,{mode:"melee"},{ok:true,mode:"melee",weapon:"Épée longue",targetDown:true,wound:true,damage:40});
assert.deepEqual(p0.downCause,{kind:"fleeing",weapon:"Épée longue",by:{name:"Guerrier orc",proper:false,friendly:false}});
// Un tir.
p1.alive=false; p1.hp=-5;
api.onMissionAttack(orc,p1,{mode:"ranged"},{ok:true,mode:"ranged",weapon:"Arc long",targetDown:true});
assert.equal(p1.downCause.kind,"ranged");
// Sa propre arme (échec critique de blessure).
api.onMissionAttack(p2,orc,{mode:"melee"},{ok:true,mode:"melee",weapon:"Hache",attackerDown:true});
assert.deepEqual(p2.downCause,{kind:"fumble",weapon:"Hache"});
// Un sort de feu.
p3.hp=10;
api.damageMissionUnitBySpell(p3,50,other,"feu");
assert.equal(p3.alive,false);
assert.equal(p3.downCause.kind,"spell_feu");
assert.equal(p3.downCause.by.name,other.character.role||other.character.name.replace(/\s+\d+$/,""));
// Un ennemi qui tombe : rien à noter (le Mémorial ne garde que les nôtres).
orc.hp=1;
api.damageMissionUnitBySpell(orc,50,p0,"froid");
assert.equal(orc.downCause,undefined);
// Le bilan de fin de mission porte la cause de chacun.
api.resolveMissionAftermath();
const results=new Map(game.mission.aftermath.results.map(r=>[r.id,r]));
assert.equal(results.get(p0.character.id).cause.kind,"fleeing");
assert.equal(results.get(p3.character.id).cause.kind,"spell_feu");

// 4. Dans la campagne : un mort de mission entre au Mémorial (sa dernière mission dans son historique), un mort en duel aussi.
const affinity=createAffinityRules({reference});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,affinity,random:genRandom,
  progression:Progression.createProgressionRules({reference})});
assert.ok(rules.memorialRules,"les règles du Mémorial");
const state=rules.createCampaign({captain,squad:[80,81,82,83].map(id=>generator.createMercenary({id,captain}))});
const [, m1, m2]=state.company.roster;
assert.equal(rules.memorialRules.deaths(state),0,"là dès le début, vide");
assert.equal(rules.trainingRooms(state).some(r=>r.code==="memorial"),false,"pas d'étude sans mort");
const report=rules.applyMissionAftermath(state,{results:[
  {id:m1.id,name:m1.name,dead:true,progress:{knockouts:2,woundsTaken:3,criticalSuccesses:1},cause:{kind:"melee",by:{name:"Troll"},weapon:"Massue"}},
  {id:m2.id,name:m2.name,dead:true,captured:true}],captainDead:false});
assert.equal(state.company.roster.includes(m1),false);
assert.deepEqual(report.memorial.map(e=>e.id),[m1.id,m2.id]);
const e1=rules.memorialRules.entryOf(state,m1.id),e2=rules.memorialRules.entryOf(state,m2.id);
assert.deepEqual([e1.cause.kind,e1.cause.by.name,e1.cause.weapon,e2.cause.kind],["melee","Troll","Massue","captured"]);
assert.deepEqual([e1.profile.history.missions,e1.profile.history.knockouts,e1.profile.history.log.at(-1).kind],[1,2,"death"]);
assert.equal(e2.profile.history.log.at(-1).captured,true);
assert.notEqual(e1.epitaph,e2.epitaph);

// 5. L'étude de la Nécromancie au Mémorial : une place, niveau = morts ÷ 10, le test et le gain de l'École sans directeur.
let room=rules.trainingRooms(state).find(r=>r.code==="memorial");
assert.deepEqual([room.places,room.level,room.school,room.schoolTest],[1,0.2,"Nécromancie",true]);
for(let i=0;i<8;i++) rules.memorialRules.record(state,{id:9000+i,name:"Ancien "+i},{cause:null});
room=rules.trainingRooms(state).find(r=>r.code==="memorial");
assert.equal(room.level,1,"10 morts : niveau 1");
const school=rules.schoolTraining;
const average={stats:{Intelligence:50,Volonté:50},skills:{magic:{}}};
assert.equal(school.dailyXp(average,room),88,"80 × 1 × 1,1");
assert.equal(school.dailyXp(average,{...room,level:10}),160,"100 morts : niveau 10");
assert.equal(school.dailyXp(average,{...room,level:30}),320,"pas de limite");
// Le capitaine peut y aller ; une seule place.
const [cap,m3,m4]=state.company.roster;
assert.equal(rules.setCaptainTraining(state,"memorial").ok,true);
const necro=Number(cap.skills.magic.Nécromancie)||0;
const day=rules.runSchoolDay(state);
const here=day.entries.filter(e=>e.code==="memorial");
assert.deepEqual(here.map(e=>e.id),[cap.id],"le capitaine prend la seule place");
assert.ok(cap.skills.magic.Nécromancie>necro,"il progresse en Nécromancie");

// 6. Le duel de la désertion (le vrai duel depuis le 2026-11-10, Défi du capitaine étape 3) : mis à mort, au Mémorial,
// défié par son capitaine.
const desertion=rules.desertionRules;
state.company.deserting=[{id:m3.id,day:state.day}];
const killedAftermath={captainDead:false,results:[{id:m3.id,name:m3.name,dead:true,wounded:false,outcome:"dead",
  cause:{kind:"challenged",by:{name:cap.name,proper:true}},progress:null}]};
assert.equal(rules.applyDuel(state,{mercenaryId:m3.id,won:true,killed:true,aftermath:killedAftermath}).duel.outcome,"killed");
assert.equal(desertion.duelOutcome(state,m3.id,{won:true}).outcome,"killed");
const e3=rules.memorialRules.entryOf(state,m3.id);
assert.deepEqual([e3.cause.kind,e3.cause.by.name],["challenged",cap.name]);
assert.ok(rules.memorialRules.describe(e3).cause.includes(cap.name));
assert.equal(state.company.memorial.filter(e=>e.id===m3.id).length,1,"une seule fois");

// 7. L'écran : la carte dans Ma Compagnie, la scène, les scripts, les textes de l'historique.
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(html,/<script src="\/core\/memorial\.js"><\/script>[\s\S]*<script src="\/core\/campaign\.js"><\/script>/);
assert.match(html,/<script src="memorial-ui\.js"><\/script>/);
assert.match(html,/data-camp-scene-panel="memorial"/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","screen-ui.js"),"utf8"),/CAMP_SCENES=\[[^\]]*"memorial"/);
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","memorial-ui.js"),"utf8");
assert.match(ui,/data-open-camp-scene="memorial"/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","camp-buildings-ui.js"),"utf8"),/memorialCardHtml\(c\)/);
const events=reference.characterSheetCopy.history.events;
assert.ok(events.death&&events.death_knockouts&&events.death_captured);

console.log("Mémorial : textes, entrées, causes notées en combat, morts de mission et en duel, étude de la Nécromancie — OK");
