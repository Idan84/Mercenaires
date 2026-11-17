"use strict";

// L'écran de combat (Idan, 2026-11-04 : « la charge marche mal […] Dans l'interface de combat, une attaque, un déplacement
// ou un sort sélectionné doit montrer une surbrillance pour la portée. Les sorts de zone doivent montrer en surbrillance la
// zone lors de la sélection. On doit pouvoir cliquer sur attaquer au CAC en se déplaçant automatiquement (ça doit être
// implicite.) L'IA joue beaucoup trop vite […] Faut bosser les aperçus pour les sorts également » ; « Oui, oui et oui ») :
// la charge sur une ligne droite d'hexagones dans toute direction, la portée et la zone en surbrillance, l'attaque au corps
// à corps avec approche, le rythme du tour ennemi, l'aperçu des sorts.
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
let seed=11;
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
const EXPOSED="makeMissionUnit,sortMissionInitiative,selectNextMissionPlayer,teachMissionTestSpells,setMissionMode,targetableMissionCells,"
  +"handleMissionHexClick,missionChargeIfClear,missionRangeCells,missionSpellAreaCells,missionMeleeApproach,missionSpellPreviewRows,"
  +"missionAttackPreview,renderMissionHoverCard,runMissionEnemyTurn,missionFxEstimate,missionCells,missionKey,missionMagic,renderMission,"
  +"missionViewOn,startMissionCamera,missionView,missionMapSize,missionHexPixel,MISSION_CAMERA,fitMissionView";
// Le jeu sans page (les tests habituels) ; et avec une page factice, pour le rythme du tour ennemi.
const load=(window,document,setTimeout)=>new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression",
  "MercenairesMissionEnd","MercenairesMagic","window","document","setTimeout",source+"\nreturn {"+EXPOSED+"};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,Magic,window,document,setTimeout);
const api=load(undefined,undefined,undefined);
const timers=[];
const page=load({innerWidth:1600,addEventListener(){}},{querySelector:()=>null,querySelectorAll:()=>[]},(fn,ms)=>{ timers.push({fn,ms}); return timers.length; });

const at=(unit,q,r)=>{ unit.q=q; unit.r=r; return unit; };
const key=c=>api.missionKey(c.q,c.r);
const sorted=set=>[...set].sort();
function arm(character,name){
  const item={id:"ui-"+name+"-"+character.id,name,itemType:"weapon",slot:"weapon_set_1_main",owner:character.id,qualityCode:"standard"};
  character.items=[...character.items,item];
  character.equipment={...character.equipment,slots:{...character.equipment.slots,weapon_set_1_main:item.id,weapon_set_1_off:null,armor:null}};
}
function newMission(){
  const squad=[2,3,4].map(id=>generator.createMercenary({id,captain}));
  const foes=[5,6,7].map(id=>generator.createMercenary({id,captain}));
  for(const c of [...squad,...foes]){ arm(c,"Épée courte"); c.spells=[]; }
  for(const c of squad){ c.skills.magic.Feu=60; c.skills.magic.Vie=60; c.stats["Réserve de mana"]=200; c.mana=200; }
  const players=squad.map((c,i)=>api.makeMissionUnit(c,"player",i));
  const enemies=foes.map((c,i)=>api.makeMissionUnit(c,"enemy",i));
  game.mission={engine,endRules:MissionEnd.createMissionEndRules({reference}),progression:Progression.createProgressionRules({reference}),
    players,enemies,playerOrder:api.sortMissionInitiative(players,engine),enemyOrder:api.sortMissionInitiative(enemies,engine),
    activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null};
  api.selectNextMissionPlayer();
  const u=game.mission.activeUnit;
  // Le reste de la carte libre : les autres dans les coins.
  const corners=[[0,0],[12,0],[-4,8],[8,8],[1,0]];
  for(const x of [...players,...enemies].filter(x=>x!==u)) at(x,...corners.shift());
  return game.mission;
}

// 1. La charge : cases carrées (doc 04), de 1 à 2 fois le mouvement de base ; en ligne droite sur une colonne ou une ligne,
// ou en biais (Idan, 2026-11-17 : « 2 pour la diagonale »), case par case par les côtés, collé à la cible à l'arrivée.
let m=newMission();
let u=at(m.activeUnit,2,4);
const base=engine.movementBase(u);
const foe=m.enemies[0];
const slanted=api.missionCells().find(c=>c.q!==u.q&&c.r!==u.r&&(at(foe,c.q,c.r),api.missionChargeIfClear(u,foe)));
assert.ok(slanted,"une charge en biais");
at(foe,slanted.q,slanted.r);
{
  const biais=api.missionChargeIfClear(u,foe);
  assert.equal(biais.travel,engine.axialDistance(u,foe)-1,"la course se compte en losange");
  assert.equal(engine.axialDistance(biais.destination,foe),1,"il finit collé à la cible par un côté");
}
const straight=api.missionCells().find(c=>{
  if(c.r!==u.r) return false;
  at(foe,c.q,c.r);
  return engine.chargeData(u,foe).valid&&engine.chargeData(u,foe).travel===base;
});
assert.ok(straight,"une case de charge en ligne droite");
at(foe,straight.q,straight.r);
let charge=api.missionChargeIfClear(u,foe);
assert.ok(charge,"la charge en ligne droite");
assert.equal(charge.path.length,base);
assert.equal(engine.axialDistance(charge.destination,foe),1,"il finit au contact");
// Un personnage sur la ligne l'empêche ; un bourbier aussi ; une fois dégagée, elle repasse.
const ally=m.players.find(x=>x!==u),blocker=charge.path[Math.floor(charge.path.length/2)],home={q:ally.q,r:ally.r};
at(ally,blocker.q,blocker.r);
assert.equal(api.missionChargeIfClear(u,foe),null,"un allié sur la ligne");
at(ally,home.q,home.r);
m.mire=[{q:blocker.q,r:blocker.r,untilTurn:9}];
assert.equal(api.missionChargeIfClear(u,foe),null,"un bourbier sur la ligne");
m.mire=[];
m.terrain=[{q:blocker.q,r:blocker.r,untilTurn:9}];
assert.equal(api.missionChargeIfClear(u,foe),null,"une flaque de magma sur la ligne");
m.terrain=[];
m.fog=[{q:blocker.q,r:blocker.r,untilTurn:9}];
assert.ok(api.missionChargeIfClear(u,foe),"le brouillard ne gêne pas");
m.fog=[];
api.setMissionMode("charge");
assert.ok(api.targetableMissionCells().has(key(foe)),"la cible de la charge est cliquable");
// La portée de la charge : les cases de 1 + base à 1 + 2 × base.
assert.deepEqual(sorted(api.missionRangeCells()),sorted(api.missionCells().filter(c=>{ const d=engine.axialDistance(u,c); return d-1>=base&&d-1<=2*base; }).map(key)));

// 2. La portée de l'attaque : au corps à corps (épée courte), les six voisins.
api.setMissionMode("melee");
assert.deepEqual(sorted(api.missionRangeCells()),sorted(api.missionCells().filter(c=>engine.axialDistance(u,c)===1).map(key)));
api.setMissionMode("move");
assert.equal(api.missionRangeCells().size,0,"le déplacement garde ses cases atteignables");

// 3. Attaquer au corps à corps en se déplaçant : hors d'atteinte mais à portée de mouvement, l'ennemi est cliquable ; le clic
// l'approche par le plus court chemin, puis frappe.
m=newMission();
u=at(m.activeUnit,2,4);
const target=at(m.enemies[0],5,4);
assert.ok(u.movementRemaining>=2,"assez de mouvement pour s'approcher");
api.setMissionMode("melee");
const approach=api.missionMeleeApproach(u,target);
assert.equal(approach.path.length,2,"deux cases jusqu'au contact");
assert.equal(approach.distance,1);
assert.ok(api.targetableMissionCells().has(key(target)));
const preview=api.missionAttackPreview(u,target);
assert.deepEqual(preview[0].approach,{steps:2,risk:0});
assert.match(api.renderMissionHoverCard(target.q,target.r),/<dt>Approche<\/dt><dd>2 cases<\/dd>/);
// Trop loin : ni approche ni cible.
const far=at(m.enemies[1],2+u.movementRemaining+2,4);
assert.equal(api.missionMeleeApproach(u,far),null);
assert.equal(api.targetableMissionCells().has(key(far)),false);
const end=approach.path[approach.path.length-1],before=m.log.length;
api.handleMissionHexClick(target.q,target.r);
const said=m.log.slice(before).map(x=>x.message);
const name=x=>x.character.name;
assert.equal(said[0],name(u)+" s’approche de "+name(target)+" (2 cases).");
assert.ok(said[1].startsWith(name(u)+" attaque "+name(target)+" avec Épée courte"),said[1]);
assert.equal(api.missionKey(u.q,u.r),key(end),"il frappe depuis la fin du chemin");

// 4. Les sorts : la portée, la zone, l'aperçu.
m=newMission();
u=at(m.activeUnit,2,4);
const enemy=at(m.enemies[0],6,4),friend=at(m.players.find(x=>x!==u),2,5);
api.teachMissionTestSpells();
const magic=api.missionMagic();
api.setMissionMode("spell:fireball");
const reach=magic.range(u,"fireball");
assert.deepEqual(sorted(api.missionRangeCells()),sorted(api.missionCells().filter(c=>{ const d=engine.axialDistance(u,c); return d>0&&d<=reach; }).map(key)),"la portée du sort");
// Boule de feu : le disque autour de la case visée ; Anneau de feu : l'anneau autour du lanceur ; Tsunami, Mur de flammes.
const radius=magic.zoneRadius(u,"fireball");
assert.deepEqual(sorted(api.missionSpellAreaCells(u,"fireball",enemy).map(key)),
  sorted(api.missionCells().filter(c=>engine.axialDistance(enemy,c)<=radius).map(key)));
assert.deepEqual(sorted(api.missionSpellAreaCells(u,"fire_ring",enemy).map(key)),
  sorted(api.missionCells().filter(c=>{ const d=engine.axialDistance(u,c); return d>=1&&d<=magic.zoneRadius(u,"fire_ring"); }).map(key)));
const aside={q:3,r:4};
assert.deepEqual(api.missionSpellAreaCells(u,"tsunami",aside),magic.lineCells(u,aside,magic.zoneLength(u,"tsunami")));
assert.deepEqual(api.missionSpellAreaCells(u,"flame_wall",enemy),magic.wallCells(u,enemy,magic.zoneLength(u,"flame_wall")));
assert.deepEqual(api.missionSpellAreaCells(u,"fire_bolt",enemy),[],"un trait n'a pas de zone");
// L'aperçu : réussite, coût, toucher, dégâts après la protection élémentaire de la cible.
const rows=(code,c)=>api.missionSpellPreviewRows(u,code,c.q,c.r);
const range=(code,c)=>{ const r=magic.effectRange(u,code); return [r.min,r.max].map(x=>c?engine.elementalDamage(c,magic.spell(code).element,x).damage:x); };
const shown=([a,b])=>a===b?String(a):a+"–"+b;
let html=rows("fire_bolt",enemy);
assert.match(html,/<dt>Réussite<\/dt>/);
assert.match(html,new RegExp("<dt>Coût</dt><dd>"+magic.manaCost(u,"fire_bolt")+" mana</dd>"));
assert.match(html,/<dt>Toucher<\/dt>/);
assert.ok(html.includes("<dt>Dégâts</dt><dd>"+shown(range("fire_bolt",enemy))+" PV</dd>"),html);
html=rows("fireball",enemy);
assert.match(html,/<dt>Précision<\/dt>/);
assert.ok(html.includes("<dt>Zone</dt><dd>rayon "+radius+"</dd>"));
assert.doesNotMatch(html,/<dt>Toucher<\/dt>/,"une zone ne vise pas à la Dextérité");
assert.ok(rows("quick_heal",friend).includes("<dt>Soins</dt><dd>"+shown(range("quick_heal"))+" PV</dd>"));
html=rows("regeneration",friend);
assert.match(html,/<dt>Soins \/ tour<\/dt>/);
assert.match(html,new RegExp("<dt>Durée</dt><dd>"+magic.duration(u,"regeneration")+" tours?</dd>"));
assert.match(rows("blessing",friend),new RegExp("<dt>"+magic.targetStats("blessing").join(", ")+"</dt><dd>\\+"+Math.round(magic.bonus(u,"blessing"))+"</dd>"));
assert.match(rows("fire_ring",u),/<dt>Zone<\/dt><dd>rayon \d+ \(anneau\)<\/dd>/);
// Sur la case survolée : les dégâts d'un sort physique passent par l'étape Blesser.
u.character.skills.magic.Télékinésie=60;
assert.match(rows("projection",enemy),/<dt>Blesser<\/dt>/);
assert.match(api.renderMissionHoverCard(enemy.q,enemy.r),/hc-spell/);

// 5. Le rythme du tour ennemi : sans page, tout le tour d'un coup ; avec la page, un ennemi, puis une pause (plus courte avec
// « Accélérer »), et l'ennemi qui joue est mis en évidence.
assert.equal(page.missionFxEstimate([{step:{q:0,r:0}},{text:"Raté"}]),90+300);
assert.equal(page.missionFxEstimate(Array(200).fill({text:"x"})),0,"trop d'animations : aucune n'est jouée");
m=newMission();
for(const x of m.players) x.acted=true;
m.activeUnit=null;
api.runMissionEnemyTurn();
assert.equal(m.phase,"player","sans page : le tour ennemi est joué d'un coup");
assert.equal(m.turn,2);
m=newMission();
m.activeUnit=null;
// Sans animation en attente : la pause seule.
Object.defineProperty(m,"fx",{get:()=>[],set(){}});
const living=m.enemyOrder.filter(x=>x.alive).length;
page.runMissionEnemyTurn();
assert.equal(m.phase,"enemy");
assert.equal(timers.length,1,"un ennemi a joué, le suivant attend");
assert.equal(m.pacedUnit,m.enemyOrder[0]);
assert.equal(timers[0].ms,900);
game.missionFast=true;
timers.shift().fn();
assert.equal(m.pacedUnit,m.enemyOrder[1]);
assert.equal(timers[0].ms,150,"accéléré");
while(timers.length) timers.shift().fn();
assert.equal(m.phase,"player","la file vide : le tour revient au joueur");
assert.equal(m.turn,2);
assert.equal(m.pacedUnit,null);
assert.ok(living>=2);
delete game.missionFast;

// La caméra au début de chaque tour (Idan, 2026-11-14 : « une petite animation de caméra qui se met sur lui […] sauf si
// après le dézoom on a des bords vides de la carte » ; 2026-11-16 : « Zoomer et rester »).
{
  const frames=[];
  const win=reduce=>({innerWidth:1600,addEventListener(){},requestAnimationFrame:fn=>frames.push(fn),matchMedia:()=>({matches:reduce})});
  const cam=load(win(false),{querySelector:()=>null,querySelectorAll:()=>[]},setTimeout);
  $("mission-map").parentElement={clientWidth:1000,clientHeight:600};
  const {width,height}=cam.missionMapSize();
  assert.ok(width*2>1000&&height*2>600,"à × 2, la carte dépasse l'écran");
  // Sur un bord : la vue s'arrête au bord de la carte (pas de vide), le combattant n'est plus au centre.
  assert.deepEqual(cam.missionViewOn(cam.missionHexPixel(0,0),2,true),{scale:2,x:0,y:0});
  // Au milieu : centré.
  const middle=cam.missionViewOn({x:width/2,y:height/2},2,true);
  assert.equal(middle.x,500-width);
  assert.equal(middle.y,300-height);
  // Une carte plus petite que l'écran reste centrée.
  const small=cam.missionViewOn(cam.missionHexPixel(0,0),0.2,true);
  assert.equal(small.x,(1000-width*0.2)/2);
  assert.equal(small.y,(600-height*0.2)/2);
  // « Zoomer et rester » (Idan, 2026-11-16 : « ça zoom pas, ça fait juste un mouvement de caméra inutile ») : la carte
  // entière à l'écran, la caméra zoome vraiment (deux fois la carte entière) sur lui et reste là.
  const unit={id:"u-cam",q:6,r:4};
  Object.assign(cam.missionView,{fitted:true,anim:null});
  cam.fitMissionView();
  const fit=cam.missionView.scale,zoomed=Math.min(2.4,fit*2);
  assert.equal(cam.MISSION_CAMERA.zoom,2);
  cam.startMissionCamera(unit);
  frames.shift()(1000);
  frames.shift()(1000+cam.MISSION_CAMERA.duration/2);
  assert.ok(cam.missionView.scale>fit&&cam.missionView.scale<zoomed,"elle zoome en glissant");
  frames.shift()(1000+cam.MISSION_CAMERA.duration);
  assert.equal(frames.length,0);
  assert.deepEqual({scale:cam.missionView.scale,x:cam.missionView.x,y:cam.missionView.y},cam.missionViewOn(cam.missionHexPixel(6,4),zoomed,true),
    "zoomée sur lui, sans vide au-delà des bords");
  assert.equal(cam.missionView.fitted,false,"elle reste zoomée");
  // Le zoom choisi par le joueur : la caméra glisse sur le suivant à ce zoom, sans à-coup.
  Object.assign(cam.missionView,{scale:1,x:-40,y:-30,fitted:false,anim:null});
  cam.startMissionCamera(unit);
  const end=cam.missionViewOn(cam.missionHexPixel(6,4),1,true);
  frames.shift()(1000);
  frames.shift()(1000+cam.MISSION_CAMERA.duration/2);
  assert.equal(cam.missionView.scale,1,"au zoom du joueur tout du long");
  frames.shift()(1000+cam.MISSION_CAMERA.duration);
  assert.equal(frames.length,0);
  assert.deepEqual({scale:cam.missionView.scale,x:cam.missionView.x,y:cam.missionView.y},end);
  assert.equal(cam.missionView.anim,null);
  assert.equal(cam.missionView.fitted,false);
  assert.doesNotMatch(source,/MISSION_CAMERA\.peak/,"plus d'aller-retour de zoom");
  // Le joueur qui zoome ou fait glisser la carte l'interrompt.
  cam.startMissionCamera(unit);
  cam.missionView.anim=null;
  frames.shift()(0);
  assert.equal(frames.length,0,"interrompue : plus d'image");
  // Moins de mouvement demandé par le système : la vue va directement à sa place.
  const still=load(win(true),{querySelector:()=>null,querySelectorAll:()=>[]},setTimeout);
  Object.assign(still.missionView,{scale:1,x:0,y:0,fitted:false,anim:null});
  still.startMissionCamera(unit);
  assert.equal(frames.length,0);
  assert.deepEqual({scale:still.missionView.scale,x:still.missionView.x,y:still.missionView.y},end);
  // Elle part sur le nôtre qui commence son tour, et sur l'ennemi qu'on voit jouer, depuis sa case de départ (s'il était visible).
  assert.match(source,/const turnUnit=m\.phase==="deploy"\|\|m\.over\?null:u\|\|m\.pacedUnit;/);
  assert.match(source,/m\.pacedStart=\{id:unit\.id,q:unit\.q,r:unit\.r,unseen\};/);
  $("mission-map").parentElement={clientWidth:900};
}

const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(index,/<button id="mission-speed-btn" class="secondary hidden"[^>]*>Accélérer<\/button>/);
const css=fs.readFileSync(path.join(ROOT,"prototype-web","styles.css"),"utf8");
assert.match(css,/\.hex-cell\.in-range\{/);
assert.match(css,/\.hex-cell\.aoe,/);
// En combat, pas de barre du bas (Idan, 2026-11-06 : « Ça permet d'agrandir un peu la carte ») : la carte prend sa place.
assert.match(css,/body\[data-screen="mission"\] \.game-hud\{display:none\}/);
assert.match(css,/\.mission-panel\{[^}]*height:calc\(100dvh - 16px\)/);
assert.doesNotMatch(css,/body\[data-screen="mission"\] \.app-shell\{[^}]*74px/);

console.log("Écran de combat : charge en ligne et en biais, portée et zone en surbrillance, approche au corps à corps, rythme du tour ennemi, aperçu des sorts — OK");
