"use strict";

// L'éclaireur (doc 04 ; Idan, 2026-11-09 : « On peut, avant le combat envoyer un éclaireur choisi parmi les mercenaires de la
// mission. Il peut ne pas revenir ! ( Test en fonction de sa discrétion et la perception de chaque ennemi) La chance de se
// faire repérer reste faible. S'il est repéré, on le récupère Indemne comme prisonnier si on gagne la mission. Sinon, il est
// considéré comme mort » ; « on ne peut pas envoyer un compagnon animal seul. Il peut y aller avec son maître, donc
// discrétion de son maître » ; « On envoie après les jours de marche, pas depuis la taverne »).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const Progression=require("../game-core/progression.js");
const MissionEnd=require("../game-core/mission-end.js");
const Magic=require("../game-core/magic.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"))]));
const read=file=>fs.readFileSync(path.join(ROOT,"prototype-web",file),"utf8");

// Tirages : force (toujours la même valeur) si posé, sinon une suite fixe.
let seed=29,force=null;
Math.random=()=>force!==null?force:((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:Math.random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});
const engine=createCombatEngine(reference,{onAttack:Progression.recordAttack});
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;

// 1. La règle : à 8 cases, derrière une couverture totale ; la chance d'être repéré reste faible.
assert.equal(constant("combat.scout.distance"),8);
const unitOf=(stats)=>({character:{stats,skills:{martial:{}},items:[],equipment:{slots:{}}},activeSet:1});
const scout30=unitOf({Perception:50,"Discrétion":30}),scout80=unitOf({Perception:70,"Discrétion":80});
const guard=unitOf({Perception:60,"Discrétion":30}),sharp=unitOf({Perception:90,"Discrétion":20}),sneaky=unitOf({Perception:40,"Discrétion":90});
const chance=(o,t)=>Math.round(engine.detectionChance(o,t,8,engine.coverDiscretion("totale"))*10)/10;
assert.equal(chance(guard,scout30),1.8,"un garde ordinaire contre un éclaireur peu discret : 1,8 %");
assert.equal(chance(guard,scout80),0.1,"contre un éclaireur discret : le plancher");
assert.ok(chance(sharp,scout30)>chance(guard,scout30),"un ennemi qui a l'œil le repère plus souvent");
// Capturé au premier ennemi qui le repère.
force=0;
let out=engine.resolveScouting(scout30,[guard,sharp]);
assert.deepEqual([out.captured,out.by,out.capture.length,out.spotted.length],[true,guard,1,0]);
// Pas vu : il cherche chaque ennemi, à découvert ; un ennemi très discret lui échappe.
force=0.5;
out=engine.resolveScouting(scout80,[guard,sharp,sneaky]);
assert.equal(out.captured,false);
assert.equal(out.capture.length,3,"chaque ennemi a tenté sa chance");
assert.deepEqual(out.spotted,[guard,sharp],"il voit les deux premiers, pas le plus discret");
force=null;
// Sa Discrétion à lui : son animal (à cheval ou à côté) ne le trahit pas.
const rider={...scout80,mount:{alive:true,character:{stats:{"Discrétion":5}}}};
force=0;
assert.equal(engine.resolveScouting(rider,[guard]).capture[0].p,engine.resolveScouting(scout80,[guard]).capture[0].p);
force=null;

// 2. En combat : capturé, il quitte le combat avec son animal ; revenu, les ennemis vus commencent repérés.
const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},parentElement:{clientWidth:900},
  classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){}});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const game={campaign:null,captain,referenceData:reference};
const mission=read("mission.js");
const api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd","MercenairesMagic",
  mission+"\nreturn {makeMissionUnit,sortMissionInitiative,resolveMissionScouting,revealMissionScouted,startMissionCamouflage,"
  +"resolveMissionAftermath,checkMissionEnd,setMissionMapSize,missionDeployBand,missionDeployCells,startMissionDeployment,"
  +"handleMissionHexClick,targetableMissionCells,startMissionAfterDeployment,retreatMissionExpedition,missionKey};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,Magic);
function newMission(){
  const squad=[2,3,4].map(id=>generator.createMercenary({id,captain}));
  const foes=[5,6,7].map(id=>generator.createMercenary({id,captain}));
  const players=squad.map((c,i)=>api.makeMissionUnit(c,"player",i)),enemies=foes.map((c,i)=>api.makeMissionUnit(c,"enemy",i));
  game.mission={engine,endRules:MissionEnd.createMissionEndRules({reference}),progression:Progression.createProgressionRules({reference}),
    players,enemies,playerOrder:api.sortMissionInitiative(players,engine),enemyOrder:api.sortMissionInitiative(enemies,engine),
    activeUnit:null,phase:"player",turn:1,mode:null,log:[],over:false,winner:null,aftermath:null};
  return game.mission;
}
const logged=re=>game.mission.log.some(x=>re.test(x.message));
// Capturé : lui et son compagnon quittent la carte et l'ordre du tour.
let m=newMission();
const [s1,p2]=m.players;
const wolf={id:"pet",character:{name:"Croc",mount:{itemId:77}},team:"player",master:s1,alive:true,hp:10,pvMax:10};
m.players.push(wolf);m.playerOrder.push(wolf);
force=0;
out=api.resolveMissionScouting(s1);
force=null;
assert.equal(out.captured,true);
assert.ok(!m.players.includes(s1)&&!m.players.includes(wolf)&&!m.playerOrder.includes(s1),"il quitte le combat, son loup avec lui");
assert.deepEqual(m.capturedScout,{id:s1.character.id,name:s1.character.name,animals:[{itemId:77,name:"Croc"}]});
assert.ok(logged(/part en éclaireur avec Croc et ne revient pas : l’ennemi l’a repéré \([\d,]+ %, jet 0,01\)\. Prisonnier/));
// Défaite : il est perdu ; victoire : libéré indemne, sans bilan.
m.winner="enemy";
api.resolveMissionAftermath();
const lost=m.aftermath.results.find(r=>r.id===s1.character.id);
assert.deepEqual([lost.dead,lost.captured,lost.wounded],[true,true,false],"défaite : l'éclaireur prisonnier est perdu");
assert.ok(logged(/éclaireur prisonnier de l’ennemi : la mission perdue, il ne revient pas/));
m=newMission();
force=0;
api.resolveMissionScouting(m.players[0]);
force=null;
m.winner="player";
api.resolveMissionAftermath();
assert.ok(!m.aftermath.results.some(r=>r.id===m.capturedScout.id),"victoire : il n'a pas de bilan");
assert.ok(logged(/prisonnier de l’ennemi, est libéré indemne : il rentre avec l’escouade/));
// Parti seul et capturé : personne ne se bat, la mission est perdue, et lui avec.
m=newMission();
for(const u of m.players.slice(1)){ u.alive=false; }
m.players=[m.players[0]];m.playerOrder=[m.players[0]];
force=0;
api.resolveMissionScouting(m.players[0]);
force=null;
assert.equal(api.checkMissionEnd(),true);
assert.equal(m.winner,"enemy");
assert.ok(m.aftermath.results.some(r=>r.id===m.capturedScout.id&&r.dead&&r.captured));
// Revenu : il rejoint l'escouade ; les ennemis qu'il a vus commencent repérés.
m=newMission();
force=0.999;
out=api.resolveMissionScouting(m.players[0]);
assert.equal(out.captured,false);
api.startMissionCamouflage();
force=null;
assert.ok(m.players.includes(m.players[0])&&!m.capturedScout);
for(const u of m.enemies) u.camouflaged=true;
api.revealMissionScouted({spotted:[m.enemies[1]]});
assert.deepEqual(m.enemies.map(u=>u.camouflaged),[true,false,true],"seuls les ennemis vus sont repérés");
assert.ok(logged(/revient de son repérage sans avoir été vu : il a repéré 0 ennemi \(il y en a peut-être d’autres\)/));

// 3. Le combat d'expédition : l'éclaireur avant le camouflage, les ennemis vus révélés après ; le choix après les jours de
// marche (fenêtre « Escouade sur place »), pas à la Taverne.
const start=mission.slice(mission.indexOf("function startExpeditionCombat("),mission.indexOf("function resolveMissionScouting("));
assert.match(start,/const scouting=scout\?resolveMissionScouting\(scout\):null;\n[^\n]*\n  if\(scouting\?\.captured&&!livingMissionUnits\("player"\)\.length&&checkMissionEnd\(\)\)\{ renderMission\(\); return; \}\n[^\n]*\n  if\(scouting&&!scouting\.captured\)\{ startMissionDeployment\(scouting\); return; \}\n  startMissionCamouflage\(\);\n  selectNextMissionPlayer\(\);/,
  "parti seul et capturé : la mission est perdue ; revenu : le déploiement ; sans éclaireur (ou capturé) : comme avant");
const ui=read("contract-ui.js"),html=read("index.html");
assert.match(html,/id="expedition-dialog-scout"[^>]*data-expedition-scout=""[^>]*>Envoyer un éclaireur</);
assert.match(html,/id="expedition-scout-list"/);
assert.match(ui,/startExpeditionCombat\(go\.dataset\.expeditionScoutGo,\{scoutId:Number\(go\.dataset\.scoutId\)\}\)/);
assert.match(ui,/e\.memberIds\.map\(mid=>game\.campaign\.company\.roster\.find/,"un mercenaire de l'escouade (un animal ne part pas seul)");
assert.match(ui,/\.sort\(\(a,b\)=>discretion\(b\)-discretion\(a\)\)/,"les plus discrets d'abord");

// 4. Revenu : le rapport (la carte, les ennemis vus), puis le déploiement libre sur la bande de 4 cases, ou la retraite.
assert.equal(reference.formulaConstants.rows.find(r=>r.code==="combat.deploy.band").valeur,4);
api.setMissionMapSize({cols:36,rows:25});
const at=(col,r)=>({q:col,r}); // cases carrées : q = la colonne
assert.deepEqual([at(3,12),at(4,12),at(32,12),at(31,12),at(18,3),at(18,4),at(18,21),at(18,20)].map(c=>api.missionDeployBand(c)),
  [true,false,true,false,true,false,true,false],"la bande : 4 cases sur chaque bord");
m=newMission();
const place=(u,col,r)=>{ const c=at(col,r); u.q=c.q; u.r=c.r; };
m.players.forEach((u,i)=>place(u,1,10+i));
m.enemies.forEach((u,i)=>place(u,17+i,12));
api.startMissionDeployment({spotted:[m.enemies[0]]});
assert.equal(m.phase,"deploy");
assert.deepEqual(m.enemies.map(u=>u.camouflaged),[false,true,true],"seuls les ennemis vus par l'éclaireur sont sur la carte");
assert.equal(api.targetableMissionCells().size,0,"rien à placer tant qu'on n'a choisi personne");
const [d1]=m.players;
api.handleMissionHexClick(d1.q,d1.r);
assert.equal(m.deploySelected,d1,"un clic sur l'un des nôtres le choisit");
const band=api.targetableMissionCells();
assert.ok(band.size>200&&[...band].every(k=>{ const [q,r]=k.split(",").map(Number); return api.missionDeployBand({q,r}); }),"ses cases : la bande");
assert.ok(!band.has(api.missionKey(m.players[1].q,m.players[1].r)),"pas sur un des nôtres");
const center=at(18,12);
api.handleMissionHexClick(center.q,center.r);
assert.notDeepEqual([d1.q,d1.r],[center.q,center.r],"pas au milieu de la carte");
const far=at(34,22);
api.handleMissionHexClick(far.q,far.r);
assert.deepEqual([d1.q,d1.r,m.deploySelected],[far.q,far.r,null],"posé de l'autre côté de la carte, sur la bande");
assert.ok(logged(/Déploiement : cliquez un de vos hommes/));
force=0.999;
api.startMissionAfterDeployment();
force=null;
assert.equal(m.phase,"player");
assert.equal(m.enemies[0].camouflaged,false,"l'ennemi vu par l'éclaireur reste repéré");
assert.ok(m.activeUnit&&m.activeUnit.team==="player","le combat commence, notre équipe d'abord");
// Rebrousser chemin : le contrat perdu (la renommée de l'échec), sans combat ni mort ; l'escouade rentre.
m=newMission();
api.startMissionDeployment({spotted:[]});
const calls=[];
globalThis.missionRules=()=>({outcome:(offer,o)=>({victory:o.victory,reward:0,chestGold:0,chestItems:[],loot:[],renown:-30,hunt:false})});
globalThis.campaignRules=()=>({completeExpeditionCombat:(state,id,o)=>{ calls.push({id,...o}); return {expedition:{id}}; }});
globalThis.renderGame=()=>{};
game.campaign={company:{captainId:1}};
Object.assign(m,{expeditionId:"exp-1",contract:{distance:3}});
api.retreatMissionExpedition();
assert.equal(calls.length,1);
assert.deepEqual([calls[0].id,calls[0].result.victory,calls[0].result.renown,calls[0].result.retreat,calls[0].bonuses],["exp-1",false,-30,true,[]]);
assert.equal(game.mission,null,"retour au camp");
game.campaign=null;
const retreatLine=m.log.map(x=>x.message).find(t=>/rebrousse chemin/.test(t));
assert.equal(retreatLine,"L’escouade rebrousse chemin : le contrat est perdu, sans combat ni mort, et la renommée de la compagnie baisse (-30). Retour au camp dans 3 jours.");
assert.ok(!m.aftermath,"personne ne passe la fin de mission : ni mort, ni blessure");
const html2=read("index.html");
assert.match(html2,/id="mission-deploy-start-btn" class="primary deploy-only"[^>]*>Lancer le combat</);
assert.match(html2,/id="mission-retreat-btn" class="secondary deploy-only"[^>]*>Rebrousser chemin</);

console.log("Éclaireur : capture rare, prisonnier libéré ou perdu, ennemis vus repérés, choix après la marche — OK");
