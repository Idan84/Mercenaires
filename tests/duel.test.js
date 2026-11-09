"use strict";

// Le Défi du capitaine (Idan, 2026-11-09) : « On ajoute sur la carte du mercenaire un bouton de défi » ; « On va la faire
// gladiateur ! Si le capitaine perd, jet de mort normal. S'il gagne (enfin nous gagnons) un pop up arrive. On choisit si on
// le met à mort ou non. S'il n'est pas mis à mort, jet de blessure » ; « +5 en affinité pour le capitaine par case d'écart
// entre l'alignement du défié et l'alignement du mercenaire ; +10 en affinité pour les mercenaires alignement mauvais s'il
// le capitaine le tue ; +10 en affinité pour les mercenaires alignement bons s'il l'épargne ; Dans tous les cas : +150 xp en
// intimidation pour le capitaine, +50 xp en charisme, +XP normale d'un combat ; Pour le mercenaire épargné : +50 en
// affinité » ; « Le capitaine peut se rendre... le mercenaire, non » ; « la fuite et la sortie de la carte, c'est la
// victoire du capitaine ».
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createAffinityRules}=require("../game-core/affinity.js");
const {createDuelRules}=require("../game-core/duel.js");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createMagicRules}=require("../game-core/magic.js");
const Progression=require("../game-core/progression.js");
const MissionEnd=require("../game-core/mission-end.js");
const MissionTerrain=require("../game-core/mission-terrain.js");
require("../game-core/recruit-dialogue.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.duelDialogue,"duel-dialogue.json","le jeu charge les textes du duel");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual(["map.cols","map.rows","start.distance","xp.intimidation","xp.charisma","affinity.alignment_step","affinity.evil_kill",
  "affinity.good_spare","affinity.spared"].map(k=>constant("duel."+k)),[15,15,3,150,50,5,10,10,50]);
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);

let seed=29;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const affinity=createAffinityRules({reference});
const progression=Progression.createProgressionRules({reference});

// 1. Les effets : l'écart d'alignement (grille 3 × 3), les bons et les mauvais.
const duel=createDuelRules({reference,affinity,progression});
const who=alignment=>({alignment});
assert.deepEqual([duel.isGood(who("Loyal bon")),duel.isGood(who("Neutre")),duel.isEvil(who("Chaotique mauvais")),duel.isEvil(who("Neutre bon"))],[true,false,true,false]);
assert.equal(duel.alignmentDistance(who("Loyal bon"),who("Chaotique mauvais")),4);
assert.equal(duel.alignmentDistance(who("Neutre"),who("Neutre bon")),1);
assert.equal(duel.alignmentDistance(who("Neutre"),who("Neutre")),0);

// 2. Le camp : la disponibilité, puis l'issue.
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,affinity,progression,random});
assert.ok(rules.duelRules&&rules.canChallenge&&rules.applyDuel);
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6].map(id=>generator.createMercenary({id,captain}))});
const [cap,a,b,c,d,e]=state.company.roster;
assert.equal(rules.canChallenge(state,cap.id).ok,false,"pas lui-même");
assert.equal(rules.canChallenge(state,a.id).ok,true);
a.recovery={kind:"wounded",daysLeft:3};
assert.match(rules.canChallenge(state,a.id).reason,/blessé/);
delete a.recovery;
cap.recovery={kind:"fatigued",daysLeft:2};
assert.match(rules.canChallenge(state,a.id).reason,/Le capitaine est fatigué/);
delete cap.recovery;
a.dungeon={since:1};
assert.match(rules.canChallenge(state,a.id).reason,/cachot/);
delete a.dungeon;

// Les alignements des témoins : un bon, un mauvais, un neutre, un aligné comme le défié.
a.alignment="Loyal bon"; b.alignment="Chaotique mauvais"; c.alignment="Neutre"; d.alignment="Loyal bon"; e.alignment="Neutre bon";
const affinityOf=m=>Number(m.affinityAcquired)||0;
const end=MissionEnd.createMissionEndRules({reference});
const fighters=(capHp,foe,foeHp,extra={})=>end.resolveMissionEnd([
  {id:cap.id,name:cap.name,hp:capHp,pvMax:200,damageTaken:200-capHp,stats:cap.stats,isCaptain:true,progress:null},
  {id:foe.id,name:foe.name,hp:foeHp,pvMax:200,damageTaken:200-foeHp,stats:foe.stats,progress:null,...extra}]);

// a) Victoire, mise à mort de a (Loyal bon) : les témoins gagnent 5 × l'écart ; les mauvais +10 ; a au Mémorial.
let before=[b,c,d,e].map(affinityOf);
const intimidation=Number(cap.skills.social.Intimidation),charisma=Number(cap.stats.Charisme);
let report=rules.applyDuel(state,{mercenaryId:a.id,won:true,killed:true,
  aftermath:fighters(150,a,-10,{killed:true,cause:{kind:"challenged",by:{name:cap.name,proper:true}}})});
assert.equal(state.company.roster.includes(a),false,"mis à mort");
assert.deepEqual([b,c,d,e].map(affinityOf).map((v,i)=>v-before[i]),[5*4+10,5*2,0,5*1],"Chaotique mauvais 4 cases + mauvais ; Neutre 2 ; Loyal bon 0 ; Neutre bon 1");
assert.ok(cap.skills.social.Intimidation>intimidation&&cap.stats.Charisme>=charisma,"Intimidation et Charisme");
assert.equal(report.duel.outcome,"killed");
const fallen=rules.memorialRules.entryOf(state,a.id);
assert.equal(fallen.cause.kind,"challenged");
assert.ok(rules.memorialRules.describe(fallen).cause.includes(cap.name));
assert.equal(fallen.profile.history.log.at(-1).kind,"duel");
assert.deepEqual(cap.history.log.at(-1),{day:state.day,kind:"duel_fought",opponent:a.name,role:"captain",outcome:"killed"});
assert.equal(report.bonusPaid,0,"pas de prime");
assert.ok(report.progression.every(p=>p.reputation===null),"pas de réputation");

// b) Victoire, b épargné (Chaotique mauvais) : +5 × écart, les bons +10, b +50 ; jet de blessure seul.
before=[b,c,d,e].map(affinityOf);
const spareEnd=fighters(120,b,-30,{spared:true});
const spared=spareEnd.results.find(r=>r.id===b.id);
assert.equal(spared.dead,false,"épargné : pas de jet de mort");
assert.ok(spared.wound?.spared,"le jet de blessure");
report=rules.applyDuel(state,{mercenaryId:b.id,won:true,killed:false,aftermath:spareEnd});
assert.ok(state.company.roster.includes(b));
assert.deepEqual([b,c,d,e].map(affinityOf).map((v,i)=>v-before[i]),[50,5*2,5*4+10,5*3+10],"b +50 ; Neutre 2 ; Loyal bon 4 + bon ; Neutre bon 3 + bon");
assert.ok(b.recovery,"blessé ou fatigué après le duel");
assert.equal(b.history.log.at(-1).outcome,"spared");

// c) Défaite (le capitaine se rend) : pas d'affinité ; l'XP du capitaine quand même.
delete cap.recovery; delete c.recovery;
before=[c,d,e].map(affinityOf);
const intimidationBefore=cap.skills.social.Intimidation;
report=rules.applyDuel(state,{mercenaryId:c.id,won:false,aftermath:fighters(80,c,150)});
assert.deepEqual([c,d,e].map(affinityOf),before,"rien si le capitaine perd");
assert.ok(cap.skills.social.Intimidation>intimidationBefore,"l'XP dans tous les cas");
assert.equal(report.duel.outcome,"lost");
assert.equal(c.history.log.at(-1).outcome,"lost");
// Le capitaine mort au jet de mort : la partie est finie.
const doomed=end.resolveMissionEnd([{id:cap.id,name:cap.name,hp:-500,pvMax:200,damageTaken:700,stats:cap.stats,isCaptain:true,killed:true}]);
assert.equal(doomed.captainDead,true);

// 3. L'arène : le duel dans l'écran de combat (mission.js), jusqu'au verdict.
const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},open:false,parentElement:{clientWidth:900},
  classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){ this.open=false; },showModal(){ this.open=true; }});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const arena=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,affinity,progression,random});
const lead=generator.createCaptain({id:100});
const camp=arena.createCampaign({captain:lead,squad:[101,102].map(id=>generator.createMercenary({id,captain:lead}))});
const game={campaign:camp,captain:lead,referenceData:reference};
const engine=createCombatEngine(reference,{});
const mission=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
const api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd",
  "MercenairesMagic","MercenairesMissionTerrain","campaignRules",
  mission+"\nreturn {startCaptainDuel,surrenderMissionDuel,chooseDuelVerdict,checkMissionEnd,duelButtonHtml,MISSION_MAP};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,
    {createMagicRules},MissionTerrain,()=>arena);
const [boss,rival,third]=camp.company.roster;
assert.match(api.duelButtonHtml(rival),/data-duel-challenge="102"|data-duel-challenge="101"/);
assert.equal(api.duelButtonHtml(boss),"","pas de bouton sur sa propre fiche");
assert.equal(api.startCaptainDuel(rival.id),true);
let m=game.mission;
assert.deepEqual([api.MISSION_MAP.cols,api.MISSION_MAP.rows],[15,15]);
assert.deepEqual([m.players.length,m.enemies.length,m.players[0].character,m.enemies[0].character],[1,1,boss,rival]);
assert.equal(engine.axialDistance(m.players[0],m.enemies[0]),3,"face à face, à 3 cases");
assert.ok(!m.players[0].mount&&!m.enemies[0].mount,"sans monture");
assert.ok(!m.decor.some(x=>engine.axialDistance(x,m.players[0])<=1||engine.axialDistance(x,m.enemies[0])<=1),"rien autour d'eux");
// Il fuit hors de l'arène : victoire du capitaine, la fenêtre du verdict.
Object.assign(m.enemies[0],{offMap:true,fleeing:true,alive:false});
assert.equal(api.checkMissionEnd(),true);
assert.deepEqual([m.over,m.winner,m.duel.pending,elements["duel-verdict-dialog"].open],[true,"player",true,true]);
assert.ok(m.log.some(l=>/rattrape/.test(l.message)),"la compagnie le rattrape");
api.chooseDuelVerdict(false);
assert.deepEqual([m.duel.resolved,camp.company.roster.includes(rival)],[true,true],"épargné");
assert.equal(m.companyReport.duel.outcome,"spared");
assert.ok(m.log.some(l=>/Le pouce se lève/.test(l.message)));
// Un autre duel : le capitaine se rend.
delete boss.recovery; delete third.recovery;
assert.equal(api.startCaptainDuel(third.id),true);
m=game.mission;
api.surrenderMissionDuel();
assert.deepEqual([m.over,m.winner,m.duel.resolved,m.companyReport.duel.outcome],[true,"enemy",true,"lost"]);
assert.ok(m.log.some(l=>/se rend/.test(l.message)));

// 4. L'écran : le bouton, la fenêtre, les scripts.
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(html,/<script src="\/core\/duel\.js"><\/script>[\s\S]*<script src="\/core\/campaign\.js"><\/script>/);
assert.match(html,/id="mission-surrender-btn"/);
assert.match(html,/id="duel-verdict-dialog"[\s\S]*data-duel-verdict="kill"[\s\S]*data-duel-verdict="spare"/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8"),/duelButtonHtml\(c\)/);
const events=reference.characterSheetCopy.history.events.duel_fought;
assert.ok(events.captain.killed&&events.captain.spared&&events.captain.lost&&events.challenged.spared&&events.challenged.lost);

console.log("Défi du capitaine : disponibilité, arène, fuite, verdict, reddition, affinité, XP, Mémorial — OK");
