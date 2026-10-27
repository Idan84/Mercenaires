"use strict";

// Sorts de Vie dans l'écran de combat (doc 12 ; Idan, 2026-10-25 : « branche-les dans l'écran de combat actuel pour
// tester ») : bouton de test, barre de sorts, cases ciblables, soins, zone, Régénération, échec critique, IA, combat
// automatique ; recharge du mana au camp.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const Progression=require("../game-core/progression.js");
const MissionEnd=require("../game-core/mission-end.js");
const Magic=require("../game-core/magic.js");

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
  alignmentGeneration:"alignment-generation.json",spells:"spells.json",belts:"belts.json",amulets:"amulets.json"
};
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,read(file)]));
// Tirages : la file d'abord (tirages imposés), sinon une suite fixe.
let seed=5;
const queue=[];
Math.random=()=>queue.length?queue.shift():((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:Math.random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});

const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},parentElement:{clientWidth:900},
  classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){}});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const game={campaign:null,captain,referenceData:reference};
const engine=createCombatEngine(reference,{onAttack:Progression.recordAttack});
const source=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
const api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd","MercenairesMagic",
  source+"\nreturn {makeMissionUnit,sortMissionInitiative,selectNextMissionPlayer,teachMissionTestSpells,setMissionMode,targetableMissionCells,"
  +"handleMissionHexClick,resetMissionActivation,missionAiCast,missionActionAvailability,autoResolveMission,missionKey,renderMissionSpellBar,"
  +"missionMagic,endMissionActivation,missionWeaponEnchantStrike,pruneMissionTerrain,occupiedMissionKeys,missionReachablePaths,"
  +"renderMissionProgression,missionLineOfSight,missionCanAttack};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,Magic);

function newMission(){
  const squad=[2,3,4].map(id=>generator.createMercenary({id,captain}));
  const foes=[5,6,7].map(id=>generator.createMercenary({id,captain}));
  // Sans armure et bons en Vie : la réussite ne dépend que des tirages imposés.
  for(const c of squad){ c.equipment.slots.armor=null; c.skills.magic.Vie=60; c.skills.magic.Feu=60; c.stats["Réserve de mana"]=53; c.mana=53; c.spells=[]; }
  // Sans sort connu à la création (doc 12) : seuls les sorts de test comptent ici.
  for(const c of foes) c.spells=[];
  const players=squad.map((c,i)=>api.makeMissionUnit(c,"player",i));
  const enemies=foes.map((c,i)=>api.makeMissionUnit(c,"enemy",i));
  game.mission={engine,endRules:MissionEnd.createMissionEndRules({reference}),progression:Progression.createProgressionRules({reference}),
    players,enemies,playerOrder:api.sortMissionInitiative(players,engine),enemyOrder:api.sortMissionInitiative(enemies,engine),
    activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null};
  api.selectNextMissionPlayer();
  return game.mission;
}
const logged=re=>game.mission.log.some(x=>re.test(x.message));

let m=newMission();
const u=m.activeUnit,magic=api.missionMagic();
const others=m.players.filter(x=>x!==u);

// Avant le test : personne ne connaît de sort, pas de barre de sorts.
assert.equal(magic.knownSpells(u).length,0);
assert.equal(api.renderMissionSpellBar(u),"");
assert.equal(api.missionActionAvailability().testSpells,true);
// Bouton de test : toute l'escouade connaît tous les sorts écrits (Vie, Feu, Eau, Transmutation) pour ce combat ; le grimoire ne
// change pas.
api.teachMissionTestSpells();
assert.deepEqual(magic.knownSpells(u).map(s=>s.code),["quick_heal","deep_heal","regeneration","mass_heal","restitution","purge",
  "fire_bolt","fireball","fire_ring","flaming_weapon","fire_armor","magma",
  "fog","healing_water","ice_arrow","tsunami","frost_armor","freeze","ice_weapon",
  "sixth_sense","titan_strength","cheetah_speed","stone_skin","venom_spit","cauterize"]);
assert.ok(m.players.every(p=>p.spells.length===25&&!(p.character.spells||[]).length));
assert.equal(api.missionActionAvailability().testSpells,false,"une seule fois par combat");
assert.ok(logged(/connaît tous les sorts \(Vie, Feu, Eau, Transmutation, niveau 1\)/));
const bar=api.renderMissionSpellBar(u);
assert.match(bar,/Mana 53\/53/);
assert.equal((bar.match(/data-spell=/g)||[]).length,25);
assert.match(bar,/Soin rapide<small>rapide · \d+ mana · \d+ %<\/small>/);

// Soin rapide : cases ciblables = le lanceur et les alliés à portée, jamais un ennemi lointain.
api.setMissionMode("spell:quick_heal");
let cells=api.targetableMissionCells();
assert.ok(cells.has(api.missionKey(u.q,u.r)),"sur soi-même");
for(const e of m.enemies) assert.ok(!cells.has(api.missionKey(e.q,e.r)));
u.hp=20;
const cost=magic.manaCost(u,"quick_heal");
queue.push(0,0.99,0.5); // réussite, pas de critique, 1D4 = 3
api.handleMissionHexClick(u.q,u.r);
assert.ok(u.hp>20,"soigné");
assert.equal(u.quickAvailable,false);
assert.equal(u.character.mana,53-cost,"le mana est dépensé");
assert.equal(m.mode,null);
assert.ok(logged(/lance Soin rapide sur (lui|elle)-même/));
assert.match(api.renderMissionSpellBar(u),/data-spell="quick_heal" title="[^"]*Action rapide déjà utilisée/);

// Soin profond : action principale ; l'action rapide déjà prise ne l'empêche pas.
const ally=others[0];
ally.hp=10;
ally.q=u.q+1;ally.r=u.r; // au contact
api.setMissionMode("spell:deep_heal");
assert.ok(api.targetableMissionCells().has(api.missionKey(ally.q,ally.r)));
queue.push(0,0.99,0.5,0.5);
api.handleMissionHexClick(ally.q,ally.r);
assert.ok(ally.hp>10);
assert.equal(u.attackAvailable,false,"l'action principale est prise");
assert.equal(api.missionActionAvailability().melee,false,"plus d'attaque ce tour-ci");

// Soin de masse : toutes les cases à portée ; soigne aussi l'ennemi dans le cercle.
api.resetMissionActivation(u);
u.character.mana=53;
const foe=m.enemies[0];
foe.q=u.q;foe.r=u.r+1;foe.hp=5;
api.setMissionMode("spell:mass_heal");
cells=api.targetableMissionCells();
assert.ok(cells.size>10,"des cases, pas seulement des personnages");
queue.push(0,0.99,0.5);
api.handleMissionHexClick(u.q,u.r);
assert.ok(foe.hp>5,"l'ennemi dans le cercle est soigné aussi");
assert.ok(logged(/Soin de masse \(rayon \d\)/));

// Régénération : un soin au début de chaque activation de la cible, puis l'effet disparaît.
api.resetMissionActivation(u);
u.character.mana=53;
ally.hp=10;
api.setMissionMode("spell:regeneration");
queue.push(0,0.99);
api.handleMissionHexClick(ally.q,ally.r);
const turns=ally.regeneration.turns;
assert.ok(turns>=2);
queue.push(0.5);
api.resetMissionActivation(ally);
assert.ok(ally.hp>10);
assert.equal(ally.regeneration?.turns??0,turns-1);
for(let i=0;i<turns;i++) api.resetMissionActivation(ally);
assert.equal(ally.regeneration,null,"fin de la Régénération");
assert.ok(logged(/Régénération : .* \(fin\)/));

// Restitution et Purge : pas de mort-vivant ni de poison pour l'instant, donc aucune cible.
api.resetMissionActivation(u);
u.character.mana=53;
api.setMissionMode("spell:restitution");
assert.equal(api.targetableMissionCells().size,0);
foe.character.undead=true;
assert.ok(api.targetableMissionCells().has(api.missionKey(foe.q,foe.r)));
const foeHp=foe.hp;
queue.push(0,0.99,0.5);
api.handleMissionHexClick(foe.q,foe.r);
assert.ok(foe.hp<foeHp,"des dégâts sans résistance");
assert.ok(foe.damageTaken>0);
foe.character.undead=false;
api.resetMissionActivation(u);
api.setMissionMode("spell:purge");
assert.equal(api.targetableMissionCells().size,0);
ally.poisoned=true;
assert.ok(api.targetableMissionCells().has(api.missionKey(ally.q,ally.r)));
queue.push(0);
api.handleMissionHexClick(ally.q,ally.r);
assert.equal(ally.poisoned,false);

// Échec critique : le lanceur perd le soin minimum.
api.resetMissionActivation(u);
u.character.mana=53;
const hp=u.hp;
api.setMissionMode("spell:quick_heal");
queue.push(0.99,0.99);
api.handleMissionHexClick(u.q,u.r);
assert.ok(u.hp<hp);
assert.ok(logged(/Échec critique .* le sort se retourne/));

// IA : Soin rapide sur l'allié le plus blessé sous 60 % de ses PV, à portée.
api.resetMissionActivation(u);
u.character.mana=53;
u.hp=u.pvMax;ally.hp=Math.floor(ally.pvMax*0.5);ally.regeneration=null;
const allyHp=ally.hp;
queue.push(0,0.99,0.5);
api.missionAiCast(u);
assert.ok(ally.hp>allyHp);
assert.equal(u.quickAvailable,false);

// École du Feu dans l'écran de combat.
const reset=()=>{ api.resetMissionActivation(u); u.character.mana=53; };
const target=m.enemies[1];
target.q=u.q+3;target.r=u.r;target.alive=true;target.hp=target.pvMax;
// Trait de feu : les ennemis sont ciblables, pas les alliés ; dégâts de feu après la protection.
reset();
api.setMissionMode("spell:fire_bolt");
cells=api.targetableMissionCells();
assert.ok(cells.has(api.missionKey(target.q,target.r)));
assert.ok(!cells.has(api.missionKey(ally.q,ally.r)),"pas un allié");
queue.push(0,0.99,0.5,0);
let before=target.hp;
api.handleMissionHexClick(target.q,target.r);
assert.ok(target.hp<before,"touché, brûlé");
assert.ok(logged(/lance Trait de feu sur .* touché \(toucher \d+ %, jet 1\), \d+ PV de feu/));
// Boule de feu : touche tout le monde dans la zone, alliés et lanceur compris ; plus fort au centre.
reset();
for(const p of m.players) p.hp=p.pvMax;
api.setMissionMode("spell:fireball");
queue.push(0,0.99,0.5,0.5,0);
before=u.hp;
const neighbourHp=ally.hp;
api.handleMissionHexClick(u.q,u.r);
assert.ok(u.hp<before&&ally.hp<neighbourHp,"tir ami : le lanceur et son voisin sont brûlés");
assert.ok(logged(/Boule de feu \(rayon \d\).* elle tombe où il faut .* au centre, moins vers le bord/));
// Anneau de feu : le voisin brûle, pas le lanceur.
reset();
for(const p of m.players) p.hp=p.pvMax;
api.setMissionMode("spell:fire_ring");
assert.deepEqual([...api.targetableMissionCells()],[api.missionKey(u.q,u.r)],"une seule case : le lanceur");
queue.push(0,0.99,0.5);
api.handleMissionHexClick(u.q,u.r);
assert.equal(u.hp,u.pvMax,"le lanceur est épargné");
assert.ok(ally.hp<ally.pvMax,"le voisin brûle");
// Arme enflammée : chaque coup qui touche ajoute du feu ; les flammes durent 2 tours (débutant : 2 + M/50).
reset();
api.setMissionMode("spell:flaming_weapon");
queue.push(0,0.99);
api.handleMissionHexClick(u.q,u.r);
assert.equal(u.weaponEnchant.turns,3,"maîtrise 60,5 : 2 + 1 tours");
target.hp=target.pvMax;
queue.push(0.5);
api.missionWeaponEnchantStrike(u,target,{ok:true,hit:true,blocked:false});
assert.ok(target.hp<target.pvMax);
assert.ok(logged(/Arme enflammée : .* PV de feu/));
const hpAfter=target.hp;
api.missionWeaponEnchantStrike(u,target,{ok:true,hit:true,blocked:true});
assert.equal(target.hp,hpAfter,"un coup bloqué ne brûle pas");
api.resetMissionActivation(u);api.resetMissionActivation(u);api.resetMissionActivation(u);
assert.equal(u.weaponEnchant,null,"les flammes s'éteignent");
// Armure de feu : bonus contre le froid, compté par le moteur.
reset();
api.setMissionMode("spell:fire_armor");
queue.push(0);
api.handleMissionHexClick(ally.q,ally.r);
assert.equal(engine.elementalProtection(ally,"froid").bonus,magic.bonus(u,"fire_armor"));
// Flaque de magma : une case vide devient infranchissable, puis refroidit.
reset();
const spot={q:u.q,r:u.r+2};
api.setMissionMode("spell:magma");
assert.ok(!api.targetableMissionCells().has(api.missionKey(ally.q,ally.r)),"pas une case occupée");
queue.push(0);
api.handleMissionHexClick(spot.q,spot.r);
assert.equal(m.terrain.length,1);
assert.ok(api.occupiedMissionKeys().has(api.missionKey(spot.q,spot.r)),"personne ne peut y passer");
assert.ok(!api.missionReachablePaths(ally,10).has(api.missionKey(spot.q,spot.r)));
m.turn=m.terrain[0].untilTurn;
api.pruneMissionTerrain();
assert.equal(m.terrain.length,0);
assert.ok(logged(/La flaque de magma refroidit/));

// XP de la magie (doc 12, étape 3 ; Idan, 2026-10-25) : le journal de mission note chaque lancer, les PV rendus
// (Constitution du soigné), les brûlures (Résistance au feu de la cible) et le mana dépensé.
const casts=u.progress.spellCasts;
assert.ok(casts.quick_heal.casts>=1&&casts.quick_heal.effects>=1,"Soin rapide réussi, PV rendus");
assert.equal(casts.fire_bolt.effects,1,"Trait de feu qui brûle");
assert.equal(casts.magma.effects,1,"Flaque de magma posée");
assert.equal(casts.fire_bolt.school,"Feu");
assert.ok(u.progress.manaSpent>=cost);
assert.ok(ally.progress.hpHealed>0,"Constitution : les PV rendus comptent pour le soigné");
assert.ok(target.progress.wounds["Résistance au feu"]>=1,"Résistance au feu : la brûlure compte pour la cible");
assert.ok(target.id in u.progress.enemyWounds,"réputation : le lanceur a blessé un adversaire");
const casterXp=m.progression.gains(u.progress,u.character);
assert.ok(casterXp.skills.magic.Vie>0&&casterXp.skills.magic.Feu>0);
assert.ok(casterXp.skills.magic["Nécromancie"]<0&&casterXp.skills.magic.Eau<0,"les écoles opposées reculent");
assert.ok(casterXp.spells.quick_heal>=20&&casterXp.stats["Puissance magique"]>0&&casterXp.stats["Réserve de mana"]>0);
const recap=api.renderMissionProgression([{mercenary:u.character,xp:casterXp,changes:[],reputation:null}]);
assert.match(recap,/Sort Soin rapide \+\d+/);
assert.match(recap,/Sort Trait de feu \+\d+/);
assert.match(recap,/Écoles opposées −\d+/);
assert.match(recap,/Puissance magique \+\d+/);

// École de l'Eau dans l'écran de combat (Idan, 2026-10-27). Maîtrise 60,5 : Eau 60, sort 1.
for(const p of m.players) p.character.skills.magic.Eau=60;
const wet=m.enemies[1],distant=m.enemies[2];
// Le reste de l'escouade et des ennemis loin de la scène, pour que les cases utilisées soient libres.
for(const x of [...m.players,...m.enemies]) if(![u,ally,wet,distant].includes(x)){ x.q=-50;x.r=-50; }
u.q=2;u.r=4;ally.q=2;ally.r=5;wet.q=3;wet.r=4;distant.q=6;distant.r=4;
for(const x of [ally,wet,distant]){ x.alive=true;x.hp=x.pvMax;x.fleeing=false; }
// Brouillard : un rideau de 5 cases en travers, devant le lanceur ; plus de ligne de vue à travers, ni tir, ni sort.
reset();
api.setMissionMode("spell:fog");
assert.ok(api.targetableMissionCells().has(api.missionKey(4,4)));
queue.push(0);
api.handleMissionHexClick(4,4);
assert.equal(m.fog.length,5);
assert.ok(m.fog.some(f=>f.q===4&&f.r===4)&&m.fog.every(f=>f.untilTurn===m.turn+3),"3 tours, fixes");
assert.ok(logged(/lance Brouillard .* un rideau de brouillard de 5 cases coupe la ligne de vue pendant 3 tours/));
assert.equal(api.missionLineOfSight(u,distant),false,"le rideau est entre le lanceur et la cible");
assert.equal(api.missionLineOfSight(u,wet),true,"le voisin, devant le rideau, reste visible");
reset();
api.setMissionMode("spell:ice_arrow");
cells=api.targetableMissionCells();
assert.ok(cells.has(api.missionKey(wet.q,wet.r))&&!cells.has(api.missionKey(distant.q,distant.r)),"pas de sort à travers le brouillard");
// Un arc ne tire pas à travers non plus ; on traverse le brouillard librement.
const bow={id:"test-bow",name:"Arc",category:"Armes de tir",tier:1,qualityCode:"correcte"};
u.character.items.push(bow);
const mainSlot="weapon_set_"+u.activeSet+"_main",held=u.character.equipment.slots[mainSlot],offSlot="weapon_set_"+u.activeSet+"_offhand";
const heldOff=u.character.equipment.slots[offSlot];
u.character.equipment.slots[mainSlot]="test-bow";u.character.equipment.slots[offSlot]=null;
assert.equal(api.missionCanAttack(u,distant,"ranged"),false,"tir bloqué par le brouillard");
assert.equal(engine.usableHands(u,engine.axialDistance(u,distant)).some(h=>h.mode==="ranged"),true,"à portée sans le brouillard");
u.character.equipment.slots[mainSlot]=held;u.character.equipment.slots[offSlot]=heldOff;
u.character.items=u.character.items.filter(x=>x!==bow);
assert.ok(api.missionReachablePaths(ally,10).has(api.missionKey(4,4)),"on passe dans le brouillard");
m.turn=m.fog[0].untilTurn;
api.pruneMissionTerrain();
assert.equal(m.fog.length,0);
assert.ok(logged(/Le brouillard se dissipe/));
assert.equal(api.missionLineOfSight(u,distant),true);
// Tsunami : une ligne de 3 + 1 cases depuis la case voisine ; l'ennemi voisin et celui du bout de la ligne sont frappés.
reset();
distant.q=5;distant.r=4;
api.setMissionMode("spell:tsunami");
cells=api.targetableMissionCells();
assert.ok(cells.has(api.missionKey(3,4))&&!cells.has(api.missionKey(2,4))&&!cells.has(api.missionKey(5,4)),"seulement les cases voisines");
queue.push(0,0.99,0.5,0.5);
let wetHp=wet.hp,distantHp=distant.hp;
api.handleMissionHexClick(3,4);
assert.ok(wet.hp<wetHp&&distant.hp<distantHp,"les deux sont dans la vague");
assert.equal(ally.hp,ally.pvMax,"l'allié, à côté, est épargné");
assert.ok(logged(/lance Tsunami \(ligne de 4 cases\).* PV de froid pour chacun/));
// Gel : malus tout de suite, puis il couvre la prochaine activation de la cible et tombe à la suivante.
reset();
wet.hp=wet.pvMax;
const speed=engine.statWithGear(wet,"Vitesse"),moveBase=engine.movementBase(wet);
api.setMissionMode("spell:freeze");
queue.push(0);
api.handleMissionHexClick(wet.q,wet.r);
assert.ok(wet.statMalus.malus>0);
assert.equal(engine.statWithGear(wet,"Vitesse"),speed-wet.statMalus.malus);
assert.ok(logged(/lance Gel sur .* −\d+ en Vitesse et en Dextérité.*pendant 1 tour\./));
api.resetMissionActivation(wet);
assert.ok(wet.statMalus,"la prochaine activation est gelée");
assert.ok(wet.movementRemaining<=moveBase);
api.resetMissionActivation(wet);
assert.equal(wet.statMalus,null);
assert.equal(engine.statWithGear(wet,"Vitesse"),speed);
assert.ok(logged(/dégèle : Vitesse et Dextérité reviennent/));
// Eau guérissante sur l'allié blessé.
reset();
ally.hp=Math.round(ally.pvMax/2);
const hurt=ally.hp;
api.setMissionMode("spell:healing_water");
queue.push(0,0.99,0.5);
api.handleMissionHexClick(ally.q,ally.r);
assert.ok(ally.hp>hurt);
assert.ok(logged(/lance Eau guérissante sur .* : \+\d+ PV/));
// Flèche de glace : des PV de froid.
reset();
api.setMissionMode("spell:ice_arrow");
queue.push(0,0.99,0.5,0);
wetHp=wet.hp;
api.handleMissionHexClick(wet.q,wet.r);
assert.ok(wet.hp<wetHp);
assert.ok(logged(/lance Flèche de glace sur .* touché .* PV de froid/));
// Arme de glace : du froid à chaque coup qui touche ; le givre fond.
reset();
api.setMissionMode("spell:ice_weapon");
queue.push(0,0.99);
api.handleMissionHexClick(u.q,u.r);
assert.equal(u.weaponEnchant.element,"froid");
assert.ok(logged(/chaque coup qui touche ajoute du froid/));
wet.hp=wet.pvMax;
queue.push(0.5);
api.missionWeaponEnchantStrike(u,wet,{ok:true,hit:true,blocked:false});
assert.ok(wet.hp<wet.pvMax);
assert.ok(logged(/Arme de glace : .* PV de froid/));
api.resetMissionActivation(u);api.resetMissionActivation(u);api.resetMissionActivation(u);
assert.equal(u.weaponEnchant,null);
assert.ok(logged(/Le givre de l’arme de .* fond/));
// Armure de froid : protection contre le feu, comptée par le moteur, puis dissipée.
reset();
api.setMissionMode("spell:frost_armor");
queue.push(0);
api.handleMissionHexClick(ally.q,ally.r);
assert.equal(engine.elementalProtection(ally,"feu").bonus,magic.bonus(u,"frost_armor"));
api.resetMissionActivation(ally);api.resetMissionActivation(ally);api.resetMissionActivation(ally);
assert.equal(engine.elementalProtection(ally,"feu").bonus,0);
assert.ok(logged(/L’armure de froid de .* se dissipe/));

// École de la Transmutation dans l'écran de combat (Idan, 2026-10-27). Maîtrise 60,5 : bonus +32 %, 1 tour, portée 5.
for(const p of m.players) p.character.skills.magic.Transmutation=60;
for(const x of [ally,wet]){ x.alive=true;x.hp=x.pvMax;x.statBuffs=null;x.poisoned=false; }
// Force de titan sur soi : l'activation en cours compte, l'effet tombe au début de la suivante.
reset();
const strength=engine.statWithGear(u,"Force");
api.setMissionMode("spell:titan_strength");
queue.push(0);
api.handleMissionHexClick(u.q,u.r);
assert.ok(engine.statWithGear(u,"Force")>strength);
assert.ok(logged(/lance Force de titan sur (lui|elle)-même .* : \+32 % de Force, pour cette activation\./));
api.resetMissionActivation(u);
assert.equal(engine.statWithGear(u,"Force"),strength);
assert.ok(logged(/Force de titan : l’effet prend fin pour/));
// Vitesse du guépard et Peau de pierre sur un allié : sa prochaine activation, puis plus rien.
reset();
const speedBefore=engine.statWithGear(ally,"Vitesse"),stoneBefore=engine.statWithGear(ally,"Résistance physique");
api.setMissionMode("spell:cheetah_speed");
queue.push(0);
api.handleMissionHexClick(ally.q,ally.r);
u.quickAvailable=true;
api.setMissionMode("spell:stone_skin");
queue.push(0);
api.handleMissionHexClick(ally.q,ally.r);
assert.ok(engine.statWithGear(ally,"Vitesse")>speedBefore);
assert.equal(engine.statWithGear(ally,"Résistance physique"),stoneBefore+16,"+10 + M/10 points");
assert.ok(logged(/lance Peau de pierre sur .* : \+16 de Résistance physique, pour sa prochaine activation\./));
api.resetMissionActivation(ally);
assert.ok(engine.statWithGear(ally,"Vitesse")>speedBefore,"sa prochaine activation en profite");
api.resetMissionActivation(ally);
assert.deepEqual([engine.statWithGear(ally,"Vitesse"),engine.statWithGear(ally,"Résistance physique")],[speedBefore,stoneBefore]);
// Cautérisation : un petit soin.
reset();
ally.hp=Math.round(ally.pvMax/2);
const burnt=ally.hp;
api.setMissionMode("spell:cauterize");
queue.push(0,0.99,0.5);
api.handleMissionHexClick(ally.q,ally.r);
assert.ok(ally.hp>burnt);
// Crachat de venin sur soi : le tir sert à la prochaine activation (l'action rapide vient d'être prise).
reset();
wet.q=u.q+3;wet.r=u.r;wet.hp=wet.pvMax;
api.setMissionMode("spell:venom_spit");
queue.push(0);
api.handleMissionHexClick(u.q,u.r);
assert.ok(u.venom&&u.venom.min===2&&u.venom.max===10);
assert.ok(logged(/pourra cracher du venin \(action rapide, 2 à 10 cases\) à sa prochaine activation/));
assert.match(api.renderMissionSpellBar(u),/data-venom="1"[^>]*disabled/,"action rapide déjà prise");
reset();
assert.ok(u.venom,"encore là pour cette activation");
assert.doesNotMatch(api.renderMissionSpellBar(u),/data-venom="1"[^>]*disabled/);
api.setMissionMode("venom");
cells=api.targetableMissionCells();
assert.ok(cells.has(api.missionKey(wet.q,wet.r))&&!cells.has(api.missionKey(ally.q,ally.r)),"un ennemi à portée, pas un allié");
queue.push(0,0.5);
let venomHp=wet.hp;
api.handleMissionHexClick(wet.q,wet.r);
assert.ok(wet.hp<venomHp);
assert.equal(u.quickAvailable,false);
assert.ok(logged(/crache du venin sur .* touché .* PV de poison/));
assert.equal(wet.poisoned.turns,3);
assert.ok(logged(/est empoisonnée? pour 3 tours/));
// Poison : au début de l'activation, jet de résistance raté → dégâts légers ; réussi → l'effet est annulé.
venomHp=wet.hp;
queue.push(0.99);
api.resetMissionActivation(wet);
assert.equal(wet.hp,venomHp-Math.ceil(wet.poisoned.amount*(1-engine.elementalProtection(wet,"poison").applied/100)-1e-9));
assert.equal(wet.poisoned.turns,2);
assert.ok(logged(/souffre du poison \(résistance .* jet 100\) : −\d+ PV/));
assert.ok(wet.progress.wounds["Résistance au poison"]>=1,"la Résistance au poison progresse");
queue.push(0);
api.resetMissionActivation(wet);
assert.equal(wet.poisoned,false);
assert.ok(logged(/résiste au poison .* l’effet est annulé/));
// Le venin tombe au début de l'activation suivante ; Purge retire le poison d'un allié.
api.resetMissionActivation(u);
assert.equal(u.venom,null);
assert.ok(logged(/ne peut plus cracher de venin/));
reset();
ally.poisoned={turns:3,amount:5};
api.setMissionMode("spell:purge");
assert.ok(api.targetableMissionCells().has(api.missionKey(ally.q,ally.r)));
queue.push(0);
api.handleMissionHexClick(ally.q,ally.r);
assert.equal(ally.poisoned,false);
// Mort du poison au début de son activation : on passe au suivant.
m=newMission();
const doomed=m.playerOrder.find(p=>p!==m.activeUnit);
doomed.poisoned={turns:3,amount:99999};
queue.push(0.99);
api.endMissionActivation();
assert.equal(doomed.alive,false);
assert.notEqual(m.activeUnit,doomed);

// Combat automatique avec les sorts de test : il va jusqu'au bout.
m=newMission();
api.teachMissionTestSpells();
api.autoResolveMission();
assert.equal(m.over,true);

// Page : le bouton de test et la barre de sorts.
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(html,/<button id="mission-test-spells-btn" class="secondary"[^>]*>Sorts \(test\)<\/button>/);
assert.match(html,/<div id="mission-spells" class="mission-spells"><\/div>/);
assert.match(source,/\$\("mission-test-spells-btn"\)\.addEventListener\("click",teachMissionTestSpells\);/);

// Recharge au camp : Réserve × (10 + Volonté / 2) % par jour, jusqu'à la Réserve ; pas en route.
const {createCampaignRules}=require("../game-core/campaign.js");
const {createTavernRules}=require("../game-core/tavern.js");
const magicRules=Magic.createMagicRules({reference,combat:engine});
const c={stats:{"Réserve de mana":53,Volonté:52},mana:0,items:[],equipment:{slots:{}}};
assert.deepEqual(magicRules.rechargeMana(c),{before:0,after:20,gained:20,max:53});
assert.equal(magicRules.rechargeMana(c).after,40);
assert.equal(magicRules.rechargeMana(c).after,53,"jusqu'à la Réserve");
assert.equal(magicRules.rechargeMana(c).gained,0);
const campaign=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,
  magic:{rechargeMana:x=>magicRules.rechargeMana(x)}});
const state=campaign.createCampaign({captain,squad:[2,3].map(id=>generator.createMercenary({id,captain}))});
const [home,away]=state.company.roster.filter(x=>x.id!==captain.id);
home.mana=0;away.mana=0;
state.expeditions=[{id:"x",kind:"bodyguard",memberIds:[away.id],status:"away",returnDay:state.day+5}];
const [report]=campaign.advanceTime(state,1);
assert.ok(home.mana>0,"au camp : recharge");
assert.equal(away.mana,0,"en route : rien");
assert.ok(report.mana.some(x=>x.id===home.id));

console.log("Sorts de Vie, du Feu, de l'Eau et de la Transmutation dans l'écran de combat, poison, recharge du mana au camp — OK");
