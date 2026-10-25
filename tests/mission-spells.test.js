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
  +"renderMissionProgression};")
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
// Bouton de test : toute l'escouade connaît tous les sorts écrits (Vie, Feu) pour ce combat ; le grimoire ne change pas.
api.teachMissionTestSpells();
assert.deepEqual(magic.knownSpells(u).map(s=>s.code),["quick_heal","deep_heal","regeneration","mass_heal","restitution","purge",
  "fire_bolt","fireball","fire_ring","flaming_weapon","fire_armor","magma"]);
assert.ok(m.players.every(p=>p.spells.length===12&&!(p.character.spells||[]).length));
assert.equal(api.missionActionAvailability().testSpells,false,"une seule fois par combat");
assert.ok(logged(/connaît tous les sorts \(Vie, Feu, niveau 1\)/));
const bar=api.renderMissionSpellBar(u);
assert.match(bar,/Mana 53\/53/);
assert.equal((bar.match(/data-spell=/g)||[]).length,12);
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

console.log("Sorts de Vie et du Feu dans l'écran de combat, recharge du mana au camp — OK");
