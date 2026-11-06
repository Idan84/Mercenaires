"use strict";

// Mode sentinelle (Idan, 2026-11-06) : « Un personnage avec une arme de tir peut se mettre en sentinelle au lieu de tirer. En
// mode sentinelle, pendant le tour de l'adversaire, tire sur la première cible qui se déplace à sa portée. Il a un double
// bonus : plus de précision et plus de chance pour enchaîner plusieurs tirs (sauf arme à feu). Il ne peut passer en mode
// sentinelle que si aucun ennemi ne le voit » ; « les deux » (camouflé, ou hors de vue) ; « parfait » (+20 au Toucher,
// enchaînement comme au corps à corps) ; les ennemis aussi (« Bien sûr ! »).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const Progression=require("../game-core/progression.js");
const MissionEnd=require("../game-core/mission-end.js");
const Magic=require("../game-core/magic.js");
require("../game-core/regeneration.js"); // MercenairesRegeneration, lue par l'écran de combat

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const files={
  peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",
  ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",
  cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",
  d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",
  characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",
  baseArmors:"base-armors.json",itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",
  startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",
  alignmentGeneration:"alignment-generation.json",spells:"spells.json",belts:"belts.json",amulets:"amulets.json",
  summonArchetypes:"summon-archetypes.json"
};
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,read(file)]));
let seed=23;
Math.random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:Math.random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});

const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},parentElement:{clientWidth:900},
  classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){}});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const game={campaign:null,captain,referenceData:reference};
const engine=createCombatEngine(reference,{onAttack:Progression.recordAttack});
const source=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
const EXPOSED="makeMissionUnit,sortMissionInitiative,selectNextMissionPlayer,missionActionAvailability,missionCanStandSentinel,"
  +"standMissionSentinel,moveMissionUnitAlongPath,enemyMissionAct,renderMissionHoverCard";
const api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd",
  "MercenairesMagic",source+"\nreturn {"+EXPOSED+"};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,Magic);

const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual([constant("combat.sentinel.precision_bonus"),constant("combat.sentinel.chain_divisor")],[20,1]);
assert.deepEqual(engine.SENTINEL,{precision:20,chainDivisor:1});

const at=(unit,q,r)=>{ unit.q=q; unit.r=r; return unit; };
function arm(character,name){
  const item={id:"s-"+name+"-"+character.id,name,itemType:"weapon",slot:"weapon_set_1_main",owner:character.id,qualityCode:"standard"};
  character.items=[...character.items.filter(i=>i.itemType!=="weapon"),item];
  character.equipment={...character.equipment,slots:{...character.equipment.slots,weapon_set_1_main:item.id,weapon_set_1_off:null,
    weapon_set_2_main:null,weapon_set_2_off:null}};
}
// Un archer (le premier de l'escouade, actif) contre des épéistes ; tout le monde visible, la carte libre.
function newMission({archer="Arc",foeWeapon="Épée courte"}={}){
  const squad=[2,3].map(id=>generator.createMercenary({id,captain}));
  const foes=[5,6].map(id=>generator.createMercenary({id,captain}));
  for(const c of [...squad,...foes]){ arm(c,"Épée courte"); c.spells=[]; }
  arm(squad[0],archer);
  for(const c of foes) arm(c,foeWeapon);
  const players=squad.map((c,i)=>api.makeMissionUnit(c,"player",i));
  const enemies=foes.map((c,i)=>api.makeMissionUnit(c,"enemy",i));
  game.mission={engine,endRules:MissionEnd.createMissionEndRules({reference}),progression:Progression.createProgressionRules({reference}),
    players,enemies,playerOrder:[players[0],players[1]],enemyOrder:api.sortMissionInitiative(enemies,engine),
    activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null};
  api.selectNextMissionPlayer();
  at(players[0],1,4);at(players[1],0,0);at(enemies[0],8,4);at(enemies[1],12,0);
  for(const u of [...players,...enemies]){ u.hp=u.pvMax=100000; }
  return game.mission;
}
const said=(m,from)=>m.log.slice(from).map(x=>x.message);

// 1. Le moteur : + 20 au Toucher (au tir seulement) ; l'enchaînement divisé par N, au lieu de 1,5 × N.
let m=newMission();
let archer=m.players[0],foe=m.enemies[0];
// Toucher = 10 + 80 / (1 + e^(−delta / 20)) : on retrouve le delta pour mesurer le bonus.
const delta=p=>-20*Math.log(80/(p-10)-1);
const plain=engine.hitProbability(archer,foe,"ranged",7),sharp=engine.hitProbability(archer,foe,"ranged",7,{sentinel:true});
assert.ok(plain>10&&sharp<90,"ni plancher ni plafond : "+plain+" → "+sharp);
assert.ok(Math.abs(delta(sharp)-delta(plain)-20)<1e-6,"+20 au delta du Toucher");
assert.equal(engine.hitProbability(archer,foe,"melee",1,{sentinel:true}),engine.hitProbability(archer,foe,"melee",1),"au tir seulement");
for(const n of [2,3]){
  assert.ok(Math.abs(engine.chainChance(archer,n,"ranged",{sentinel:true})-Math.min(100,engine.chainChance(archer,n,"melee")))<1e-9,"comme au corps à corps");
  assert.ok(engine.chainChance(archer,n,"ranged",{sentinel:true})>=engine.chainChance(archer,n,"ranged"));
}

// 2. Qui peut se mettre en sentinelle : un tireur qu'aucun ennemi ne voit (camouflé, ou hors de leur ligne de vue).
assert.equal(m.activeUnit,archer);
assert.equal(api.missionCanStandSentinel(archer),false,"vu par les ennemis");
assert.equal(api.missionActionAvailability().sentinel,false);
archer.camouflaged=true;
assert.equal(api.missionCanStandSentinel(archer),true,"camouflé");
archer.camouflaged=false;
m.fog=[{q:4,r:4,untilTurn:9},{q:4,r:3,untilTurn:9},{q:5,r:2,untilTurn:9},{q:5,r:1,untilTurn:9},{q:6,r:1,untilTurn:9},{q:6,r:0,untilTurn:9},
  {q:3,r:2,untilTurn:9},{q:4,r:1,untilTurn:9},{q:4,r:0,untilTurn:9},{q:3,r:3,untilTurn:9}];
const seenBy=m.enemies.filter(e=>!m.fog.length||!engine.hexLine(e,archer).some(c=>m.fog.some(f=>f.q===c.q&&f.r===c.r)));
assert.equal(seenBy.length,0,"le brouillard coupe toutes les lignes de vue");
assert.equal(api.missionCanStandSentinel(archer),true,"hors de vue, même repéré");
m.fog=[];
const swordsman=m.players[1];
assert.equal(api.missionCanStandSentinel({...swordsman,camouflaged:true,attackAvailable:true}),false,"il faut une arme de tir");
archer.camouflaged=true;
archer.attackAvailable=false;
assert.equal(api.missionCanStandSentinel(archer),false,"au lieu de tirer : il n'a pas déjà attaqué");
archer.attackAvailable=true;
assert.equal(api.missionActionAvailability().sentinel,true);
let before=m.log.length;
api.standMissionSentinel();
assert.deepEqual(archer.sentinel,{turn:1});
assert.equal(archer.attackAvailable,false);
assert.equal(archer.acted,true,"son activation s'arrête là");
assert.notEqual(m.activeUnit,archer);
assert.deepEqual(said(m,before).slice(0,1),[archer.character.name+" se met en sentinelle."]);
assert.match(api.renderMissionHoverCard(archer.q,archer.r),/En sentinelle/);

// 3. Pendant le tour adverse : le premier ennemi visible qui fait un pas à sa portée essuie son tir, avec le bonus ; puis la
// sentinelle s'arrête.
m.phase="enemy";
const shots=[];
const realResolve=engine.resolveAttack;
engine.resolveAttack=(a,d,o)=>{ const r=realResolve(a,d,o); if(a===archer) shots.push({o,r}); return r; };
foe.camouflaged=true;
api.moveMissionUnitAlongPath(foe,[{q:7,r:4}]);
assert.equal(shots.length,0,"un ennemi camouflé ne déclenche rien");
foe.camouflaged=false;
// Au contact (sous la portée minimale de l'arc) : rien.
at(foe,3,4);
api.moveMissionUnitAlongPath(foe,[{q:2,r:4}]);
assert.equal(shots.length,0,"hors de sa portée");
at(foe,8,4);
before=m.log.length;
const moved=api.moveMissionUnitAlongPath(foe,[{q:7,r:4},{q:6,r:4},{q:5,r:4}]);
assert.ok(shots.length>=1,"il tire");
assert.equal(shots[0].o.sentinel,true);
assert.equal(shots[0].o.mode,"ranged");
assert.equal(shots[0].r.sentinel,true);
assert.equal(shots[0].r.pHit,engine.hitProbability(archer,foe,"ranged",shots[0].r.distance,{backstab:true,sentinel:true}),"+20, et il tire caché");
assert.equal(said(m,before)[0],archer.character.name+", en sentinelle, tire sur "+foe.character.name+".");
assert.equal(archer.sentinel,null,"un seul tir de sentinelle");
assert.ok(moved===3||foe.fleeing||!foe.alive,"il reprend sa route après le tir");
const count=shots.length;
api.moveMissionUnitAlongPath(foe,[{q:4,r:4}].filter(c=>!(foe.q===c.q&&foe.r===c.r)));
assert.equal(shots.length,count,"la sentinelle est finie");
engine.resolveAttack=realResolve;

// 4. Sans cible, elle s'arrête au début de sa prochaine activation.
m=newMission();
archer=m.players[0];
archer.camouflaged=true;
api.standMissionSentinel();
assert.ok(archer.sentinel);
for(const p of m.players) p.acted=false;
m.activeUnit=null;
api.selectNextMissionPlayer();
assert.equal(m.activeUnit,archer);
assert.equal(archer.sentinel,null);

// 5. Une arme à feu déchargée ne peut pas guetter.
m=newMission({archer:"Arquebuse"});
archer=m.players[0];
archer.camouflaged=true;
assert.equal(api.missionCanStandSentinel(archer),true,"chargée au début de la mission");
archer.unloaded=[engine.activeWeaponItem(archer).id];
assert.equal(api.missionCanStandSentinel(archer),false,"déchargée");

// 6. Les ennemis aussi : un tireur ennemi sans cible visible, que personne ne voit, guette ; puis tire sur le mercenaire qui
// bouge à sa portée.
m=newMission({foeWeapon:"Arc"});
const watcher=m.enemies[0];
for(const p of m.players) p.camouflaged=true;
watcher.camouflaged=true;
m.phase="enemy";
api.enemyMissionAct(watcher);
assert.ok(watcher.sentinel,"l'IA se met en sentinelle");
m.phase="player";
const runner=m.players[1];
runner.camouflaged=false;
at(runner,0,4);
before=m.log.length;
api.moveMissionUnitAlongPath(runner,[{q:1,r:3}]);
assert.equal(said(m,before)[0],watcher.character.name+", en sentinelle, tire sur "+runner.character.name+".");
assert.equal(watcher.sentinel,null);

// 7. Le bouton de la page.
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(html,/<button id="mission-sentinel-btn" class="secondary" title="[^"]+">Sentinelle<\/button>/);
assert.match(source,/\["mission-sentinel-btn","sentinel"\]/);
console.log("Mode sentinelle : qui peut guetter, tir pendant le tour adverse (+20, enchaînement comme au contact), fin, ennemis aussi — OK");
