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
  alignmentGeneration:"alignment-generation.json",spells:"spells.json",belts:"belts.json",amulets:"amulets.json",
  summonArchetypes:"summon-archetypes.json"
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
  +"renderMissionProgression,missionLineOfSight,missionCanAttack,frenzyMissionActivation,maintainMissionSummons,checkMissionEnd,onMissionAttack,moveMissionUnitAlongPath,"
  +"renderMissionConsole,missionAttackFx,tickMissionStorms,missionParalyzedSkip,missionStormAt};")
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
// Bouton de test : toute l'escouade connaît tous les sorts écrits (Vie, Feu, Eau, Transmutation, Foudre, Télékinésie, Illusion)
// pour ce combat ; le grimoire ne change pas.
api.teachMissionTestSpells();
assert.deepEqual(magic.knownSpells(u).map(s=>s.code),["quick_heal","deep_heal","regeneration","mass_heal","restitution","purge",
  "fire_bolt","fireball","fire_ring","flaming_weapon","fire_armor","magma",
  "fog","healing_water","ice_arrow","tsunami","frost_armor","freeze","ice_weapon",
  "sixth_sense","titan_strength","cheetah_speed","stone_skin","venom_spit","cauterize",
  "shock","lightning_bolt","shock_weapon","chain_lightning","thunder","celerity","spark","electric_arc","paralysis","storm",
  "attraction","projection","telekinetic_move","clash","force_field","stone_throw",
  "fear","illusory_support","mass_courage","hidden_advance","psychic_shock","frenzy",
  "raise_dead","summon_specter","life_drain","death_arrow","necrosis","wither",
  "summon_raven","quagmire","transposition","summon_wolves","summon_bears","summon_crocodiles"]);
assert.ok(m.players.every(p=>p.spells.length===59&&!(p.character.spells||[]).length));
assert.equal(api.missionActionAvailability().testSpells,false,"une seule fois par combat");
assert.ok(logged(/connaît tous les sorts \(Vie, Feu, Eau, Transmutation, Foudre, Télékinésie, Illusion, Nécromancie, Invocation, niveau 1\)/));
const bar=api.renderMissionSpellBar(u);
assert.match(bar,/Mana 53\/53/);
assert.equal((bar.match(/data-spell=/g)||[]).length,59);
assert.match(bar,/Soin rapide<small>rapide · \d+ mana · \d+ %<\/small>/);
// Écran de combat (2026-10-29) : au-delà de 8 sorts, un onglet par école ; une seule école affichée à la fois.
assert.equal((bar.match(/data-spell-school=/g)||[]).length,9);
assert.equal((bar.match(/class="mission-school"/g)||[]).length,1);
assert.equal((bar.match(/class="mission-school hidden"/g)||[]).length,8);
m.spellSchool="Feu";
assert.match(api.renderMissionSpellBar(u),/class="mission-school-tab selected" type="button" data-spell-school="Feu"/);
m.spellSchool=null;

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
// École de la Foudre dans l'écran de combat (Idan, 2026-10-27). Maîtrise 60,5.
for(const p of m.players) p.character.skills.magic.Foudre=60;
for(const x of [u,ally,wet,distant]){ x.alive=true;x.hp=x.pvMax;x.poisoned=false;x.statBuffs=null; }
wet.q=u.q+1;wet.r=u.r;distant.q=u.q+4;distant.r=u.r;
// Décharge électrique : un ennemi voisin seulement, sans jet de toucher.
reset();
api.setMissionMode("spell:shock");
cells=api.targetableMissionCells();
assert.ok(cells.has(api.missionKey(wet.q,wet.r))&&!cells.has(api.missionKey(distant.q,distant.r)),"au contact");
queue.push(0,0.99,0.5,0.5);
api.handleMissionHexClick(wet.q,wet.r);
assert.ok(wet.hp<wet.pvMax);
assert.ok(logged(/lance Décharge électrique sur .* : \d+ PV de foudre/));
// Foudre : à travers le brouillard ; l'Éclair, lui, a besoin de voir.
reset();
m.fog=[{q:u.q+2,r:u.r,untilTurn:m.turn+3}];
assert.equal(api.missionLineOfSight(u,distant),false);
api.setMissionMode("spell:lightning_bolt");
assert.ok(!api.targetableMissionCells().has(api.missionKey(distant.q,distant.r)),"l'Éclair a besoin de la ligne de vue");
api.setMissionMode("spell:thunder");
assert.ok(api.targetableMissionCells().has(api.missionKey(distant.q,distant.r)),"la Foudre tombe à travers le brouillard");
queue.push(0,0.99,0.5);
api.handleMissionHexClick(distant.q,distant.r);
assert.ok(distant.hp<distant.pvMax);
assert.ok(logged(/lance Foudre sur .* : \d+ PV de foudre/));
m.fog=[];
// Boule d'éclairs : la cible voisine, puis les rebonds, alliés et lanceur compris.
reset();
for(const x of [u,ally,wet,distant]){ x.alive=true;x.hp=x.pvMax; }
api.setMissionMode("spell:chain_lightning");
queue.push(0,0.99,0.5,0.5);
api.handleMissionHexClick(wet.q,wet.r);
assert.ok(wet.hp<wet.pvMax);
assert.ok(u.hp<u.pvMax||ally.hp<ally.pvMax,"les rebonds touchent aussi nos personnages");
assert.ok(logged(/lance Boule d'éclairs sur .* puis de moins en moins à chaque rebond — .*\(80 %\)/));
// Arme électrique : de la foudre à chaque coup qui touche ; l'arme cesse de crépiter.
reset();
api.setMissionMode("spell:shock_weapon");
queue.push(0,0.99);
api.handleMissionHexClick(u.q,u.r);
assert.equal(u.weaponEnchant.element,"foudre");
wet.alive=true;wet.hp=wet.pvMax;
queue.push(0.5);
api.missionWeaponEnchantStrike(u,wet,{ok:true,hit:true,blocked:false});
assert.ok(wet.hp<wet.pvMax);
assert.ok(logged(/Arme électrique : .* PV de foudre/));
api.resetMissionActivation(u);api.resetMissionActivation(u);api.resetMissionActivation(u);
assert.ok(logged(/cesse de crépiter/));
// Célérité : sur soi seulement, cette activation et la suivante.
reset();
const pace=engine.statWithGear(u,"Vitesse");
api.setMissionMode("spell:celerity");
assert.deepEqual([...api.targetableMissionCells()],[api.missionKey(u.q,u.r)]);
queue.push(0);
api.handleMissionHexClick(u.q,u.r);
assert.ok(engine.statWithGear(u,"Vitesse")>pace);
assert.ok(logged(/lance Célérité \(.* : \+\d+ % de Vitesse, pour cette activation et la suivante\./));
api.resetMissionActivation(u);
assert.ok(engine.statWithGear(u,"Vitesse")>pace,"la suivante aussi");
api.resetMissionActivation(u);
assert.equal(engine.statWithGear(u,"Vitesse"),pace);

// Les quatre sorts validés par Idan le 2026-10-31 (Foudre à 10). Maîtrise 60,5.
for(const x of [u,ally,wet,distant]){ x.alive=true;x.hp=x.pvMax;x.statBuffs=null;x.paralyzed=null; }
u.q=2;u.r=4;ally.q=2;ally.r=5;wet.q=3;wet.r=4;distant.q=6;distant.r=4;
// Étincelle : action rapide, portée 1 + 1 (Maîtrise / 50) : l'ennemi voisin, pas celui à 4 cases ; sans jet de toucher.
reset();
api.setMissionMode("spell:spark");
cells=api.targetableMissionCells();
assert.ok(cells.has(api.missionKey(wet.q,wet.r))&&!cells.has(api.missionKey(distant.q,distant.r)));
queue.push(0,0.99,0.5);
api.handleMissionHexClick(wet.q,wet.r);
assert.ok(wet.hp<wet.pvMax);
assert.equal(u.quickAvailable,false,"action rapide");
assert.ok(logged(/lance Étincelle sur .* : \d+ PV de foudre/));
// Arc électrique : une ligne de 4 + 2 cases depuis la case voisine ; les deux ennemis de la ligne, pas l'allié à côté.
reset();
for(const x of [wet,distant]) x.hp=x.pvMax;
api.setMissionMode("spell:electric_arc");
cells=api.targetableMissionCells();
assert.ok(cells.has(api.missionKey(3,4))&&!cells.has(api.missionKey(4,4)),"seulement les cases voisines");
queue.push(0,0.99,0.5,0.5);
api.handleMissionHexClick(3,4);
assert.ok(wet.hp<wet.pvMax&&distant.hp<distant.pvMax,"les deux sont sur l'arc");
assert.equal(ally.hp,ally.pvMax,"l'allié, à côté, est épargné");
assert.ok(logged(/lance Arc électrique \(ligne de 6 cases\).* PV de foudre pour chacun/));
// Paralysie : la cible perd sa prochaine activation, sauf si D100 ≤ sa résistance (Constitution + protection − 30).
reset();
api.setMissionMode("spell:paralysis");
assert.ok(api.targetableMissionCells().has(api.missionKey(distant.q,distant.r)),"portée 6 + 2");
queue.push(0,0.99);
api.handleMissionHexClick(distant.q,distant.r);
assert.deepEqual(distant.paralyzed,{turns:1});
assert.ok(logged(/lance Paralysie sur .* est paralysée? \(résistance \d+ %, jet 100\) et perdra sa prochaine activation/));
assert.equal(api.missionParalyzedSkip(distant),true,"l'activation est perdue");
assert.equal(distant.paralyzed,null);
assert.equal(api.missionParalyzedSkip(distant),false,"une seule");
assert.ok(logged(/est paralysée? : (il|elle) perd son activation/));
reset();
api.setMissionMode("spell:paralysis");
queue.push(0,0);
api.handleMissionHexClick(distant.q,distant.r);
assert.equal(distant.paralyzed??null,null);
assert.ok(logged(/lance Paralysie sur .* résiste \(résistance \d+ %, jet 1\)/));
// Tempête : rayon 2 + 1, 3 tours, à travers le brouillard ; une vague au lancer, puis une à chaque tour, puis elle se dissipe.
reset();
for(const x of [u,ally,wet,distant]) x.hp=x.pvMax;
m.fog=[{q:4,r:4,untilTurn:m.turn+3}];
api.setMissionMode("spell:storm");
assert.ok(api.targetableMissionCells().has(api.missionKey(distant.q,distant.r)),"sans ligne de vue");
queue.push(0,0.99,0.99,0.5,0.5,0.5,0.5,0.5,0.5);
api.handleMissionHexClick(distant.q,distant.r);
m.fog=[];
assert.equal(m.storms.length,1);
assert.equal(m.storms[0].radius,3);
assert.equal(m.storms[0].turnsLeft,2);
assert.ok(api.missionStormAt(distant.q,distant.r)&&!api.missionStormAt(u.q-2,u.r));
assert.ok(logged(/lance Tempête \(rayon 3, 3 tours\).* le ciel se charge/));
assert.ok(logged(/La tempête frappe : .* −\d+ PV/));
api.tickMissionStorms();
assert.equal(m.storms[0].turnsLeft,1);
api.tickMissionStorms();
assert.equal(m.storms.length,0);
assert.ok(logged(/La tempête se dissipe/));
for(const x of [u,ally,wet,distant]){ x.alive=true;x.hp=x.pvMax; }

// École de la Télékinésie dans l'écran de combat (Idan, 2026-10-28). Maîtrise 60,5 : 3 cases de déplacement forcé.
for(const p of m.players) p.character.skills.magic["Télékinésie"]=60;
for(const x of [u,ally,wet,distant]){ x.alive=true;x.hp=x.pvMax;x.statBuffs=null;x.statMalus=null; }
u.q=2;u.r=4;ally.q=2;ally.r=5;wet.q=4;wet.r=4;distant.q=6;distant.r=4;
// Projection : dégâts contondants (Blesser), puis repoussé dans l'axe ; l'ennemi derrière l'arrête : choc.
reset();
api.setMissionMode("spell:projection");
queue.push(0,0.99,0.5,0.5,0,0,0,0);
api.handleMissionHexClick(wet.q,wet.r);
assert.deepEqual([wet.q,wet.r],[5,4],"une case, puis il heurte l'ennemi de derrière");
assert.ok(wet.hp<wet.pvMax);
assert.ok(logged(/lance Projection sur .* : \d+ PV contondants \(Blesser \d+ %, jet 1\)/));
assert.ok(logged(/est repoussée? de 1 case et heurte /));
assert.ok(logged(/^Choc : .* PV contondants/));
assert.ok(wet.progress.wounds["Résistance physique"]>=1,"le contondant fait progresser la Résistance physique");
// Attraction : de loin, tiré jusqu'au contact du lanceur, sans obstacle : pas de choc.
reset();
wet.q=-50;wet.r=-50;
api.setMissionMode("spell:attraction");
queue.push(0,0.99,0.5,0.5,0,0);
api.handleMissionHexClick(distant.q,distant.r);
assert.deepEqual([distant.q,distant.r],[3,4],"au contact du lanceur");
assert.ok(logged(/est attirée? de 3 cases\./));
// Déplacement : deux clics, la cible puis une case libre voisine.
reset();
api.setMissionMode("spell:telekinetic_move");
cells=api.targetableMissionCells();
assert.ok(cells.has(api.missionKey(distant.q,distant.r))&&cells.has(api.missionKey(ally.q,ally.r))&&!cells.has(api.missionKey(u.q,u.r)),"un allié ou un ennemi, pas soi");
api.handleMissionHexClick(distant.q,distant.r);
cells=api.targetableMissionCells();
assert.ok(cells.has(api.missionKey(4,4))&&!cells.has(api.missionKey(u.q,u.r))&&!cells.has(api.missionKey(6,4)),"ses cases voisines libres");
queue.push(0);
api.handleMissionHexClick(4,4);
assert.deepEqual([distant.q,distant.r],[4,4]);
assert.ok(logged(/lance Déplacement sur .* est déplacée? d’une case/));
assert.equal(u.quickAvailable,false);
// Entrechoc : un ennemi, puis son voisin ; les deux sont frappés.
reset();
wet.q=5;wet.r=4;wet.hp=wet.pvMax;distant.hp=distant.pvMax;
api.setMissionMode("spell:clash");
api.handleMissionHexClick(distant.q,distant.r);
cells=api.targetableMissionCells();
assert.deepEqual([...cells],[api.missionKey(wet.q,wet.r)],"seul l'ennemi voisin");
queue.push(0,0.99,0.5,0.5,0,0,0,0);
api.handleMissionHexClick(wet.q,wet.r);
assert.ok(distant.hp<distant.pvMax&&wet.hp<wet.pvMax);
assert.ok(logged(/lance Entrechoc sur .* et .* — .* PV contondants .* ; .* PV contondants/));
// Lancer de pierre : un tir de fronde, pas au contact.
reset();
wet.hp=wet.pvMax;
api.setMissionMode("spell:stone_throw");
cells=api.targetableMissionCells();
assert.ok(cells.has(api.missionKey(wet.q,wet.r)),"à 3 cases : à portée de fronde");
queue.push(0,0.99,0.5,0,0,0);
api.handleMissionHexClick(wet.q,wet.r);
assert.ok(wet.hp<wet.pvMax);
assert.ok(logged(/lance Lancer de pierre sur .* touché .* PV contondants/));
distant.q=3;distant.r=4;
reset();
api.setMissionMode("spell:stone_throw");
assert.ok(!api.targetableMissionCells().has(api.missionKey(3,4)),"trop près pour une fronde");
// Champ de protection sur un allié : la moitié des tirs déviés, 4 tours.
reset();
api.setMissionMode("spell:force_field");
queue.push(0);
api.handleMissionHexClick(ally.q,ally.r);
assert.deepEqual([ally.projectileShield.chance,ally.projectileShield.untilTurn],[50,m.turn+4]);
assert.ok(logged(/lance Champ de protection sur .* 50 % de chances de dévier chaque projectile, pendant 4 tours/));
const sling={id:"test-sling",name:"Fronde",category:"Armes de tir",tier:1,qualityCode:"correcte"};
distant.character.items.push(sling);
const slingSlot="weapon_set_"+distant.activeSet+"_main",slingOff="weapon_set_"+distant.activeSet+"_offhand";
distant.character.equipment.slots[slingSlot]="test-sling";distant.character.equipment.slots[slingOff]=null;
distant.q=6;distant.r=5;
queue.push(0.3);
let shot=engine.resolveAttack(distant,ally,{mode:"ranged",distance:engine.axialDistance(distant,ally)});
assert.deepEqual([shot.ok,shot.deflected,shot.hit],[true,true,false],"tir d'arme dévié (jet 31 ≤ 50)");
queue.push(0.7);
shot=engine.resolveAttack(distant,ally,{mode:"ranged",distance:engine.axialDistance(distant,ally)});
assert.notEqual(shot.deflected,true,"jet 71 : le tir passe le champ");
m.turn=ally.projectileShield.untilTurn;
api.pruneMissionTerrain();
assert.equal(ally.projectileShield,null);
assert.ok(logged(/Le champ de protection de .* se dissipe/));

// École de l'Illusion dans l'écran de combat (Idan, 2026-10-28). Maîtrise 60,5 : bonus + M/5 = +12, rayon et durée 3.
for(const p of m.players) p.character.skills.magic.Illusion=60;
for(const x of [u,ally,wet,distant]){ x.alive=true;x.hp=x.pvMax;x.fleeing=false;x.frenzy=null;x.statBuffs=null;x.projectileShield=null; }
u.q=2;u.r=4;ally.q=2;ally.r=5;wet.q=5;wet.r=4;distant.q=6;distant.r=4;
// Peur : chaque ennemi de la zone teste son Courage ; l'un fuit, l'autre tient.
reset();
api.setMissionMode("spell:fear");
queue.push(0,0.99,0);
api.handleMissionHexClick(5,4);
assert.equal(wet.fleeing,true);
assert.equal(distant.fleeing,false);
assert.ok(logged(/lance Peur \(rayon 3\)/));
assert.ok(logged(/panique et prend la fuite \(Courage \d+ %.*jet 100\)/));
assert.ok(logged(/tient bon \(Courage \d+ %.*jet 1\)/));
assert.equal(ally.fleeing,false,"les alliés de la zone ne testent pas");
// Frénésie sur le fuyard : la fuite cesse, +10 % de Force, plus de peur ; il fonce sur l'ennemi le plus proche.
reset();
wet.q=4;wet.r=4;
const strengthBefore=engine.statWithGear(wet,"Force");
api.setMissionMode("spell:frenzy");
queue.push(0);
api.handleMissionHexClick(wet.q,wet.r);
assert.equal(wet.fleeing,false);
assert.equal(wet.frenzy.turns,2);
assert.ok(Math.abs(engine.statWithGear(wet,"Force")-(strengthBefore+0.1*wet.character.stats.Force))<1e-9,"+10 % de la Force de base");
assert.ok(logged(/entre en frénésie pour ses 2 prochaines activations \(\+10 % de Force, plus de peur, fin de la fuite\)/));
assert.equal(engine.resolveCourage(u,wet,{ok:true,wound:true,mode:"melee"},{units:[...m.players,...m.enemies]}),null,"plus de test de Courage");
api.frenzyMissionActivation(wet);
assert.ok(logged(/est en frénésie et fonce sur /));
api.resetMissionActivation(wet);api.resetMissionActivation(wet);api.resetMissionActivation(wet);
assert.equal(wet.frenzy,null);
assert.ok(logged(/sort de sa frénésie/));
// Soutien illusoire : beaucoup de Courage pour un allié, de loin. (Le frénétique a pu blesser et faire fuir le lanceur.)
for(const x of [u,ally]){ x.alive=true;x.hp=x.pvMax;x.fleeing=false; }
u.q=2;u.r=4;ally.q=2;ally.r=5;wet.q=-50;wet.r=-50;
reset();
const braveBefore=engine.statWithGear(ally,"Courage");
api.setMissionMode("spell:illusory_support");
queue.push(0);
api.handleMissionHexClick(ally.q,ally.r);
assert.equal(engine.statWithGear(ally,"Courage"),braveBefore+42,"+30 + M/5");
// Courage de masse et Avancée cachée : les alliés de la zone, lanceur compris.
reset();
const discreetBefore=[u,ally].map(x=>engine.statWithGear(x,"Discrétion"));
const courageBefore=engine.statWithGear(u,"Courage");
api.setMissionMode("spell:mass_courage");
queue.push(0);
api.handleMissionHexClick(ally.q,ally.r);
assert.equal(engine.statWithGear(u,"Courage"),courageBefore+32,"+20 + M/5");
assert.ok(logged(/lance Courage de masse \(rayon 3\).* : \+32 de Courage, pendant 3 tours — /));
u.attackAvailable=true;
api.setMissionMode("spell:hidden_advance");
queue.push(0);
api.handleMissionHexClick(ally.q,ally.r);
assert.deepEqual([u,ally].map(x=>engine.statWithGear(x,"Discrétion")),discreetBefore.map(v=>v+52),"+40 + M/5 : massif");
// Choc psychique : comme une flèche ; dégâts × Volonté du lanceur / Volonté de la cible.
reset();
distant.hp=distant.pvMax;
api.setMissionMode("spell:psychic_shock");
queue.push(0,0.99,0.5,0);
api.handleMissionHexClick(distant.q,distant.r);
assert.ok(distant.hp<distant.pvMax);
assert.ok(logged(/lance Choc psychique sur .* touché .* \d+ PV psychiques \(Volonté × [\d,]+\)/));

// École de la Nécromancie dans l'écran de combat (Idan, 2026-10-28). Maîtrise 60,5 et Charisme 50 : zombie à 55 %,
// maintien 82 %, entretien 4 mana ; Flétrissement 3 activations ; Drain de vie : cette activation et les 2 suivantes.
for(const p of m.players){ p.character.skills.magic["Nécromancie"]=60; p.character.stats.Charisme=50; }
for(const x of [u,ally,wet,distant]){ x.alive=true;x.hp=x.pvMax;x.fleeing=false;x.frenzy=null;x.statBuffs=null;x.regeneration=null; }
u.q=2;u.r=4;ally.q=2;ally.r=5;wet.q=3;wet.r=4;distant.q=6;distant.r=4;
assert.equal(magic.holdChance(u,"summon_specter").toFixed(1),"81.7");
assert.equal(magic.upkeepCost(u,"summon_specter"),4);
assert.equal(magic.zombieShare(u,"raise_dead"),55.25);
// Flétrissement : plus aucun soin pendant ses 3 prochaines activations, même la Régénération.
reset();
api.setMissionMode("spell:wither");
queue.push(0);
api.handleMissionHexClick(distant.q,distant.r);
assert.equal(distant.withered.turns,3);
assert.ok(logged(/ne peut plus être soignée? ni récupérer de PV pendant ses 3 prochaines activations/));
distant.hp=distant.pvMax-50;
distant.regeneration={code:"regeneration",factor:1,turns:1,critical:true};
api.resetMissionActivation(distant);
assert.equal(distant.hp,distant.pvMax-50);
assert.ok(logged(/Régénération : .* récupère 0 PV — flétrie?, aucun soin/));
api.resetMissionActivation(distant);api.resetMissionActivation(distant);
assert.ok(distant.withered,"encore flétri pendant sa 3e activation");
api.resetMissionActivation(distant);
assert.equal(distant.withered,null);
assert.ok(logged(/n’est plus flétrie? : les soins agissent de nouveau/));
// Flèche de mort : comme une flèche ; ni armure ni résistance.
reset();
let hpBefore=distant.hp;
api.setMissionMode("spell:death_arrow");
queue.push(0,0.99,0.5,0);
api.handleMissionHexClick(distant.q,distant.r);
assert.equal(distant.hp,hpBefore-magic.effectAmount(u,"death_arrow",4));
assert.ok(logged(/lance Flèche de mort sur .* touché .* \d+ PV nécrotiques \(ni armure ni résistance\)/));
// Nécrose : au contact, 2D8, sans jet de toucher.
reset();
hpBefore=wet.hp;
api.setMissionMode("spell:necrosis");
assert.deepEqual([...api.targetableMissionCells()],[api.missionKey(wet.q,wet.r)],"au contact seulement");
queue.push(0,0.99,0.5,0.5);
api.handleMissionHexClick(wet.q,wet.r);
assert.equal(wet.hp,hpBefore-magic.effectAmount(u,"necrosis",10));
// Les dégâts nécrotiques ne touchent pas les morts-vivants.
reset();
wet.character.undead=true;
assert.match(magic.canCast(u,wet,"necrosis").reason,/ne fonctionne que sur les vivants/);
wet.character.undead=false;
// Drain de vie : sur soi, la moitié des PV retirés au corps à corps, pas sous zéro ; flétri, rien.
reset();
api.setMissionMode("spell:life_drain");
queue.push(0);
api.handleMissionHexClick(u.q,u.r);
assert.deepEqual(u.lifeDrain,{code:"life_drain",percent:50,turns:2});
assert.ok(logged(/lance Drain de vie .* : 50 % des PV .* pour cette activation et les 2 suivantes/));
u.hp=u.pvMax-60;
let strike={ok:true,wound:true,mode:"melee",damage:40,targetHp:10};
api.onMissionAttack(u,wet,{},strike);
assert.deepEqual(strike.drain,{amount:20,healed:20});
strike={ok:true,wound:true,mode:"melee",damage:40,targetHp:-30};
api.onMissionAttack(u,wet,{},strike);
assert.equal(strike.drain.amount,5,"seuls les 10 PV qui restaient comptent");
strike={ok:true,wound:true,mode:"ranged",damage:40,targetHp:10};
api.onMissionAttack(u,wet,{},strike);
assert.equal(strike.drain,undefined,"pas au tir");
u.withered={turns:1};
strike={ok:true,wound:true,mode:"melee",damage:40,targetHp:10};
api.onMissionAttack(u,wet,{},strike);
assert.deepEqual(strike.drain,{amount:20,healed:0});
u.withered=null;u.lifeDrain=null;u.hp=u.pvMax;
// Sarbacane (Idan, 2026-10-29) : la fléchette qui blesse empoisonne la cible, par le même crochet du moteur.
const dart={ok:true,wound:true,mode:"ranged",damage:12,targetHp:50,poison:{turns:3,amount:10}};
api.onMissionAttack(u,wet,{},dart);
assert.deepEqual([wet.poisoned.turns,wet.poisoned.amount,wet.poisoned.sourceId,dart.poisonApplied],[3,10,u.id,true]);
wet.poisoned=false;
// Invocation de spectre : une case libre voisine ; il joue au tour suivant.
reset();
api.setMissionMode("spell:summon_specter");
assert.ok(!api.targetableMissionCells().has(api.missionKey(wet.q,wet.r)),"une case libre");
queue.push(0);
api.handleMissionHexClick(1,4);
const specter=m.players.find(x=>x.character.archetype==="specter");
assert.ok(specter&&specter.summon.casterId===u.id&&specter.summon.upkeep===4);
assert.deepEqual([specter.q,specter.r,specter.hp,specter.acted,specter.camouflaged],[1,4,100,true,true]);
assert.equal(u.character.mana,53-20);
assert.ok(m.playerOrder.includes(specter));
assert.equal(engine.movementBase(specter),6,"rapide");
assert.ok(logged(/lance Invocation de spectre .* : Spectre apparaît \(100 PV\) ; entretien 4 mana par tour/));
// Immunisé aux dégâts physiques (armes et sorts) ; sans peur ; son Toucher spectral est psychique.
assert.equal(engine.spellPhysicalHit(u,specter,50,{type:"contondant",power:30,mastery:60}).immune,true);
const brute={id:"brute",team:"enemy",q:0,r:4,alive:true,hp:100,pvMax:100,activeSet:1,
  character:{name:"Brute",stats:{"Dextérité":60,Force:60,Perception:40,Esquive:30},skills:{martial:{"Lames courtes":50,Dague:50}},
    items:[{id:"d",name:"Dague",itemType:"weapon"}],equipment:{slots:{weapon_set_1_main:"d"}}}};
queue.push(0);
const pass=engine.resolveAttack(brute,specter,{mode:"melee",distance:1});
assert.deepEqual([pass.hit,pass.immune,pass.damage,specter.hp],[true,true,0,100]);
assert.equal(engine.resolveCourage(brute,specter,{ok:true,wound:true,mode:"melee"},{units:[]}),null,"un mort-vivant n'a pas peur");
queue.push(0,0.99,0.5);
const touch=engine.resolveAttack(specter,brute,{mode:"melee",distance:1});
const will=Math.min(2,Math.max(0.5,50/engine.statWithGear(brute,"Volonté")));
assert.deepEqual([touch.psychic,touch.weapon,touch.damage],[true,"Toucher spectral",Math.ceil(10*4*will-1e-9)]);
// Chaque tour : test de Charisme, puis entretien ; raté, le spectre disparaît.
queue.push(0);
api.maintainMissionSummons();
assert.equal(u.character.mana,33-4);
assert.ok(logged(/garde Spectre \(Charisme 82 %, jet 1\) : −4 mana/));
queue.push(0.99);
api.maintainMissionSummons();
assert.deepEqual([specter.alive,specter.vanished],[false,true]);
assert.ok(logged(/perd le contrôle de Spectre \(Charisme 82 %, jet 100\) : il disparaît/));
// Plus assez de mana : il disparaît aussi.
reset();
api.setMissionMode("spell:summon_specter");
queue.push(0);
api.handleMissionHexClick(1,4);
const specter2=m.players.find(x=>x.character.archetype==="specter"&&x.alive);
assert.equal(specter2.character.name,"Spectre 2");
u.character.mana=2;
queue.push(0);
api.maintainMissionSummons();
assert.equal(specter2.alive,false);
assert.ok(logged(/n’a plus assez de mana pour garder Spectre 2 \(4 nécessaires\) : il disparaît/));
// Résurrection : un ennemi mort, au contact, se relève en zombie de notre camp, à 55 %.
reset();
wet.alive=false;wet.hp=-5;
api.setMissionMode("spell:raise_dead");
assert.ok(api.targetableMissionCells().has(api.missionKey(wet.q,wet.r)));
queue.push(0);
api.handleMissionHexClick(wet.q,wet.r);
const zombie=m.players.find(x=>x.character.archetype==="zombie");
assert.ok(zombie&&wet.raised);
assert.deepEqual([zombie.team,zombie.q,zombie.r,zombie.character.undead],["player",wet.q,wet.r,true]);
assert.equal(zombie.character.stats.Force,Math.round(wet.character.stats.Force*0.55));
assert.equal(zombie.pvMax,Math.round(wet.pvMax*0.55));
assert.equal(zombie.character.items,wet.character.items,"il garde son arme et son armure");
assert.ok(logged(/se relève en zombie, avec 55 % de ses forces/));
assert.equal(magic.isCorpse(wet),false,"un corps ne se relève qu'une fois");
// L'invocateur tombe : le zombie retombe en poussière.
u.alive=false;
api.checkMissionEnd();
assert.equal(zombie.alive,false);
assert.ok(logged(/ \(zombie\) : son invocateur est hors combat : il tombe en poussière/));
u.alive=true;u.hp=u.pvMax;
// Un allié relevé : il ne survivra pas au combat (jet de mort forcément raté au bilan).
reset();
ally.q=2;ally.r=5;ally.alive=false;ally.hp=-3;
api.setMissionMode("spell:raise_dead");
queue.push(0);
api.handleMissionHexClick(ally.q,ally.r);
assert.ok(logged(/ne survivra pas à ce combat/));
for(const e of m.enemies) e.alive=false;
api.checkMissionEnd();
assert.equal(m.over,true);
const raisedResult=m.aftermath.results.find(r=>r.id===ally.character.id);
assert.deepEqual([raisedResult.dead,raisedResult.death.raised],[true,true]);
assert.equal(m.aftermath.results.length,3,"ni zombie ni spectre au bilan");
assert.ok(logged(/relevé en zombie par un nécromancien/));

// École de l'Invocation dans l'écran de combat (Idan, 2026-10-28). Maîtrise 60,5, Charisme 50 : maintien 82 %, loups
// 1D6 + 1, entretien 4 (loups) ou 5 (ours, crocodiles) ; Bourbier 3 tours.
m=newMission();
api.teachMissionTestSpells();
const caller=m.activeUnit,[f1,f2,f3]=m.enemies,helper=m.players.find(p=>p!==caller);
for(const p of m.players){ p.character.skills.magic.Invocation=60; p.character.stats.Charisme=50; }
m.players.forEach((p,i)=>{ p.q=0;p.r=8-i; });
caller.q=2;caller.r=4;helper.q=0;helper.r=4;f1.q=4;f1.r=4;f2.q=10;f2.r=4;f3.q=10;f3.r=2;
for(const e of m.enemies) e.camouflaged=false;
const recharge=()=>{ api.resetMissionActivation(caller); caller.character.mana=200; caller.character.stats["Réserve de mana"]=200; };
const pick=()=>{ const [q,r]=[...api.targetableMissionCells()][0].split(",").map(Number); return {q,r}; };
// Loups : 1D6 + 1 autour de la case ; une meute = une invocation.
recharge();
api.setMissionMode("spell:summon_wolves");
queue.push(0,0.5);
api.handleMissionHexClick(1,4);
const wolves=m.players.filter(x=>x.character.archetype==="wolf");
assert.equal(wolves.length,5);
assert.equal(new Set(wolves.map(w=>w.summon.group)).size,1,"un seul groupe");
assert.equal(new Set(wolves.map(w=>api.missionKey(w.q,w.r))).size,5,"chacun sa case");
assert.deepEqual(wolves.map(w=>w.character.name),["Loup","Loup 2","Loup 3","Loup 4","Loup 5"]);
assert.deepEqual([wolves[0].pvMax,engine.movementBase(wolves[0]),wolves[0].summon.upkeep],[60,6,4]);
assert.ok(logged(/5 loups apparaissent \(1D6 : 4, \+1 pour la Maîtrise\) \(60 PV chacun\) ; entretien 4 mana par tour pour le groupe/));
assert.notEqual(engine.resolveCourage(f1,wolves[0],{ok:true,wound:true,mode:"melee"},{units:[...m.players,...m.enemies]}),null,"un loup peut avoir peur");
const manaBefore=caller.character.mana;
queue.push(0);
api.maintainMissionSummons();
assert.equal(caller.character.mana,manaBefore-4,"un seul entretien pour la meute");
assert.ok(logged(/garde ses 5 loups \(Charisme 82 %, jet 1\) : −4 mana/));
queue.push(0.99);
api.maintainMissionSummons();
assert.ok(wolves.every(w=>!w.alive&&w.vanished));
assert.ok(logged(/perd le contrôle de ses 5 loups \(Charisme 82 %, jet 100\) : ils disparaissent/));
// Ours : 1D3, lents et forts ; Crocodiles : 1D3, très lents, très discrets.
recharge();
api.setMissionMode("spell:summon_bears");
queue.push(0,0);
api.handleMissionHexClick(1,4);
const bear=m.players.find(x=>x.character.archetype==="bear");
assert.deepEqual([bear.pvMax,engine.movementBase(bear),engine.weaponTemplate(engine.activeWeaponItem(bear)).degats_pv_base],[250,3,"1D8"]);
assert.ok(logged(/Ours apparaît \(1D3 : 1\) \(250 PV\) ; entretien 5 mana par tour/));
recharge();
api.setMissionMode("spell:summon_crocodiles");
queue.push(0,0.99);
api.handleMissionHexClick(2,3);
const crocs=m.players.filter(x=>x.character.archetype==="crocodile");
assert.equal(crocs.length,3);
assert.deepEqual([engine.movementBase(crocs[0]),engine.statWithGear(crocs[0],"Discrétion"),crocs[0].pvMax],[2,90,200]);
// Corbeau : un éclaireur rapide, très discret, à la Perception aiguë.
recharge();
api.setMissionMode("spell:summon_raven");
queue.push(0);
api.handleMissionHexClick(pick().q,pick().r);
const raven=m.players.find(x=>x.character.archetype==="raven");
assert.deepEqual([engine.movementBase(raven),raven.pvMax,engine.statWithGear(raven,"Discrétion"),engine.statWithGear(raven,"Perception")],[8,25,95,85]);
// Transposition : le lanceur et une de ses invocations échangent leurs places, sans attaque d'opportunité.
recharge();
api.setMissionMode("spell:transposition");
const swapCells=api.targetableMissionCells();
assert.ok(swapCells.has(api.missionKey(raven.q,raven.r))&&swapCells.has(api.missionKey(bear.q,bear.r)));
assert.ok(!swapCells.has(api.missionKey(helper.q,helper.r)),"pas un allié");
const ravenAt={q:raven.q,r:raven.r},callerAt={q:caller.q,r:caller.r};
queue.push(0);
api.handleMissionHexClick(raven.q,raven.r);
assert.deepEqual([caller.q,caller.r,raven.q,raven.r],[ravenAt.q,ravenAt.r,callerAt.q,callerAt.r]);
assert.ok(logged(/lance Transposition sur Corbeau .* : ils échangent leurs places/));
// Bourbier : la case où se tient l'ennemi ; il ne bouge plus, et personne ne la traverse.
recharge();
api.setMissionMode("spell:quagmire");
queue.push(0);
api.handleMissionHexClick(f1.q,f1.r);
assert.ok(logged(/lance Bourbier .* : la case devient un bourbier pendant 3 tours ; .* y est pris/));
api.resetMissionActivation(f1);
assert.equal(f1.movementRemaining,0);
assert.ok(logged(/est pris dans le bourbier : pas de déplacement/));
assert.equal(api.missionReachablePaths(f1,5).size,1,"pas même une case");
f1.q=12;f1.r=8;
f3.q=5;f3.r=4;f3.movementRemaining=5;
for(const path of api.missionReachablePaths(f3,5).values())
  assert.ok(!path.slice(0,-1).some(c=>c.q===4&&c.r===4),"on ne traverse pas le bourbier");
api.moveMissionUnitAlongPath(f3,[{q:4,r:4},{q:3,r:4}]);
assert.deepEqual([f3.q,f3.r,f3.movementRemaining],[4,4,0]);
assert.ok(logged(/s’enlise dans le bourbier/));
m.turn+=3;
api.pruneMissionTerrain();
assert.ok(logged(/Le bourbier sèche/));
// L'invocateur tombe : toute la meute disparaît.
recharge();
caller.q=2;caller.r=4;
api.setMissionMode("spell:summon_wolves");
queue.push(0,0);
api.handleMissionHexClick(pick().q,pick().r);
caller.alive=false;
api.checkMissionEnd();
assert.ok(logged(/2 loups : leur invocateur est hors combat : ils disparaissent/));
assert.ok(m.players.filter(x=>x.summon).every(x=>!x.alive),"le corbeau, l'ours et les crocodiles aussi");

// Mort du poison au début de son activation : on passe au suivant.
m=newMission();
const doomed=m.playerOrder.find(p=>p!==m.activeUnit);
doomed.poisoned={turns:3,amount:99999};
queue.push(0.99);
api.endMissionActivation();
assert.equal(doomed.alive,false);
assert.notEqual(m.activeUnit,doomed);
// Joueur en frénésie : il joue seul son activation, puis on passe au suivant.
m=newMission();
const berserk=m.playerOrder.find(p=>p!==m.activeUnit);
berserk.frenzy={turns:1};
api.endMissionActivation();
assert.notEqual(m.activeUnit,berserk);
assert.equal(berserk.acted,true);
assert.ok(logged(new RegExp(berserk.character.name+" est en frénésie et fonce sur ")));

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

// Écran de combat (2026-10-29) : file d'effets visuels (purement visuelle) et console allégée.
{
  const mission=newMission(),a=mission.players[0],d=mission.enemies[0];
  mission.fx=[];
  api.missionAttackFx(a,d,{ok:true,hit:false});
  api.missionAttackFx(a,d,{ok:true,hit:true,blocked:true});
  api.missionAttackFx(a,d,{ok:true,hit:true,wound:true,targetDown:true});
  assert.deepEqual(mission.fx.filter(f=>f.id===d.id).map(f=>f.text),["Raté","Bloqué","Hors combat"]);
  assert.ok(mission.fx.every(f=>f.hp!==undefined&&f.q!==undefined),"PV et case notés à l'instant de l'événement");
  mission.autoRunning=true;
  api.missionAttackFx(a,d,{ok:true,hit:false});
  assert.equal(mission.fx.length,6,"rien en combat automatique");
  mission.autoRunning=false;
  const log=[{message:"Tour 1",kind:"turn"},...[1,2,3].map(n=>({message:"A"+n+" repère B (50 %, jet 3).",kind:"info"})),{message:"C repère D (5 %, jet 1).",kind:"info"}];
  assert.match(api.renderMissionConsole(log),/<details class="combat-log-group"><summary>4 repérages<\/summary>/);
  assert.doesNotMatch(api.renderMissionConsole(log.slice(0,3)),/<details/,"moins de 3 : pas de regroupement");
}

console.log("Sorts de Vie, du Feu, de l'Eau, de la Transmutation, de la Foudre, de la Télékinésie, de l'Illusion, de la Nécromancie et de l'Invocation dans l'écran de combat, poison, recharge du mana au camp — OK");
