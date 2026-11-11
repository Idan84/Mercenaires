"use strict";

// L'usurier (Idan, 2026-11-11) : la question au tavernier, sa visite le lendemain (jusqu'à 10 000 PO par étoile, à rendre
// dans 2 × étoiles jours au plus, +2 % du montant par jour), le remboursement (avant, le jour même, après l'échéance :
// les intérêts courent), « Je ne peux pas payer », l'avertissement des voleurs (le lendemain, le capitaine seul, un tour,
// rien ne compte), la semaine de répit, le jet du matin (5 %, puis le double), leur retour (dès que le capitaine est au
// camp) : gagné, plus de dette mais plus de crédit, l'XP et l'équipement des voleurs ; perdu, Game Over. Pas de revolving.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createAffinityRules}=require("../game-core/affinity.js");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createMagicRules}=require("../game-core/magic.js");
const Progression=require("../game-core/progression.js");
const MissionEnd=require("../game-core/mission-end.js");
const MissionTerrain=require("../game-core/mission-terrain.js");
const Missions=require("../game-core/missions.js");
require("../game-core/regeneration.js");
require("../game-core/recruit-dialogue.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));

// 1. Les données.
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual(["usurer.amount_per_star","usurer.days_per_star","usurer.daily_rate","usurer.army_factor","usurer.pc_divisor",
  "usurer.grace_days","usurer.threat.start","usurer.threat.factor"].map(constant),[10000,2,0.02,5,3,7,5,2]);
assert.ok(reference.usurerDialogue.tavern.ask&&reference.usurerDialogue.warning.end.includes("zézette"));

let seed=53,dice=[];
const d100=n=>(n-1)/100+0.001;
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id});
const affinity=createAffinityRules({reference});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,affinity,
  progression:Progression.createProgressionRules({reference}),random:()=>dice.length?dice.shift():0.5});
const usurer=rules.usurerRules;
assert.ok(usurer,"l'usurier est branché");
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3].map(id=>generator.createMercenary({id,captain}))});
const [boss]=state.company.roster;
const morning=()=>{ state.day+=1; return usurer.morning(state); };

// 2. La Taverne, puis la visite du lendemain. Une compagnie a toujours au moins une étoile.
assert.equal(rules.companyRenownLevel(state),1);
assert.deepEqual(usurer.limits(state),{maxAmount:10000,maxDays:2,rate:0.02});
assert.equal(usurer.ask(state).ok,true);
assert.equal(usurer.ask(state).reason,"asked","déjà demandé");
assert.equal(usurer.pending(state),null,"il viendra demain");
assert.equal(usurer.morning(state).visit,undefined,"pas le jour même");
morning();
assert.equal(usurer.pending(state).kind,"visit");
assert.equal(rules.canAdvanceDay(state).usurer,true,"la scène d'abord");
// L'emprunt : dans les limites.
assert.equal(usurer.borrow(state,{amount:10001,days:2}).reason,"amount");
assert.equal(usurer.borrow(state,{amount:5000,days:3}).reason,"days");
const gold=state.company.gold;
let out=usurer.borrow(state,{amount:5000,days:2});
assert.deepEqual([out.ok,out.total,state.company.gold,out.loan.dueDay],[true,5200,gold+5000,state.day+2],"+2 % par jour");
assert.equal(usurer.pending(state),null);
assert.equal(usurer.canAsk(state).reason,"loan","pas de revolving");
// Rembourser avant l'échéance : les intérêts au jour près.
morning();
assert.equal(usurer.owed(state),5100);
state.company.gold=5099;
assert.deepEqual(usurer.repay(state),{ok:false,reason:"gold",amount:5100});
state.company.gold=6000;
assert.deepEqual(usurer.repay(state),{ok:true,amount:5100});
assert.deepEqual([state.company.gold,usurer.book(state).loan],[900,null]);

// 3. L'échéance : on paie, ou pas.
usurer.ask(state); morning();
usurer.borrow(state,{amount:1000,days:1});
morning();
assert.deepEqual(usurer.pending(state),{kind:"due",owed:1020});
state.company.gold=0;
assert.equal(usurer.refuse(state).ok,true,"Je ne peux pas payer");
assert.equal(usurer.pending(state),null,"il s'en va");
// Le lendemain, les voleurs (le capitaine au camp ; en mission, ils attendent son retour).
morning();
state.expeditions=[{id:"x",status:"travelling",memberIds:[boss.id],offer:{}}];
assert.equal(usurer.pending(state),null,"le capitaine est parti");
state.expeditions=[];
assert.equal(usurer.pending(state).kind,"warning");
// L'armée : 5 × PC du capitaine (sa réputation ÷ 3).
assert.equal(usurer.armyBudget(state),Math.round(5*boss.reputation/3));

// 4. Le combat d'avertissement, à l'écran (mission.js, sans page) : un tour, puis il s'arrête ; rien ne compte.
const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},open:false,parentElement:{clientWidth:900},dataset:{},
  classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){ this.open=false; },showModal(){ this.open=true; },querySelectorAll(){ return []; }});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const game={campaign:state,captain,referenceData:reference,generator};
const engine=createCombatEngine(reference,{});
const missionRules=Missions.createMissionRules({reference,random:genRandom});
let uid=1000,notes=[],saved=[];
const createCharacter=({forcedPeople,forcedCulture})=>generator.createMercenary({id:++uid,captain,forcedPeople,forcedCulture});
const mission=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
const api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd",
  "MercenairesMagic","MercenairesMissionTerrain","campaignRules","missionRules","createCharacter","tavernLog","renderGame","saveGame",
  "deleteSavedGame","showUsurerNote",mission+"\nreturn {startUsurerFight,endMissionActivation,checkMissionEnd,leaveMission};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,{createMagicRules},
    MissionTerrain,()=>rules,()=>missionRules,createCharacter,()=>{},()=>{},()=>saved.push("save"),()=>saved.push("delete"),t=>notes.push(t));
const xpBefore=JSON.stringify(boss.skills);
assert.equal(api.startUsurerFight("final"),false,"pas encore");
assert.equal(api.startUsurerFight("warning"),true);
let m=game.mission;
assert.deepEqual([m.players.length,m.players[0].character.id],[1,boss.id],"le capitaine, seul");
assert.ok(m.enemies.length>=1,"une armée");
assert.ok(m.log[0].message.includes("voleurs"));
api.endMissionActivation();
assert.equal(m.over,true,"le combat s'arrête à la fin de son tour");
assert.ok(notes[0].includes("zézette"),"la fenêtre : ils reviendront");
assert.equal(JSON.stringify(boss.skills),xpBefore,"ni XP");
assert.equal(usurer.book(state).default.warned,true);
assert.equal(usurer.book(state).default.threatFrom,state.day+7,"une semaine de répit");
api.leaveMission();
assert.equal(game.mission,null);

// 5. La menace : rien pendant la semaine, puis un jet chaque matin, 5 % puis le double.
for(let i=0;i<6;i++){ dice=[d100(1)]; assert.equal(morning().threat,undefined,"la semaine de répit"); }
const chances=[];
for(let i=0;i<6;i++){ dice=[d100(100)]; chances.push(morning().threat.chance); }
assert.deepEqual(chances,[5,10,20,40,80,100]);
assert.equal(usurer.book(state).default.hit,state.day,"à 100 %, ils reviennent");
assert.equal(usurer.pending(state).kind,"final");
// Payer arrête la menace, même maintenant ; les intérêts ont couru.
const loanDays=state.day-usurer.book(state).loan.signedDay;
assert.equal(usurer.owed(state),Math.round(1000*(1+0.02*loanDays)));

// 6. Leur retour : gagné, plus de dette, plus de crédit, l'équipement des voleurs tombés.
dice=[];
assert.equal(api.startUsurerFight("final"),true);
m=game.mission;
const stock=state.company.stock.length;
// Tous à terre, leurs montures aussi (un cavalier tombé, son cheval continue le combat).
for(const u of m.enemies){ Object.assign(u,{alive:false,hp:0}); if(u.mount) Object.assign(u.mount,{alive:false,hp:0}); }
assert.equal(api.checkMissionEnd(),true);
assert.equal(m.winner,"player");
const u=usurer.book(state);
assert.deepEqual([u.loan,u.default,u.banned],[null,null,true],"la médiation musclée a fonctionné");
assert.equal(usurer.canAsk(state).reason,"banned","plus jamais d'emprunt");
assert.ok(state.company.stock.length>stock,"l'équipement des voleurs, à l'Intendance");
assert.ok(boss.history.log.some(h=>h.kind==="usurer_fight"));
assert.ok(!state.gameOver);
api.leaveMission();

// Perdu : Game Over, même s'il a survécu.
const lost=rules.createCampaign({captain:generator.createCaptain({id:50}),squad:[]});
game.campaign=lost;
usurer.ask(lost); lost.day+=1; usurer.morning(lost);
usurer.borrow(lost,{amount:100,days:1});
lost.day+=1; usurer.morning(lost); usurer.refuse(lost);
lost.day+=1; usurer.morning(lost);
assert.equal(api.startUsurerFight("warning"),true); api.endMissionActivation(); api.leaveMission();
usurer.book(lost).default.hit=lost.day;
assert.equal(api.startUsurerFight("final"),true);
m=game.mission;
Object.assign(m.players[0],{alive:false,offMap:true,hp:1});
assert.equal(api.checkMissionEnd(),true);
assert.equal(m.winner,"enemy");
assert.deepEqual([lost.gameOver?.reason,saved.at(-1)],["usurer","delete"]);

// 7. L'écran.
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.ok(html.indexOf("/core/usurer.js")>0&&html.indexOf("/core/usurer.js")<html.indexOf("/core/campaign.js"));
assert.match(html,/<dialog id="usurer-dialog" class="talk-dialog"/);
assert.match(html,/<script src="usurer-ui\.js"><\/script>/);
const tavernUi=fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8");
assert.match(tavernUi,/usurerTavernOptions\(\)/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","save-ui.js"),"utf8"),/hommes de l’usurier/);

console.log("L'usurier : la Taverne, la visite, l'emprunt (10 000 PO/★, 2 × ★ jours, +2 %/j), le remboursement, le refus, l'avertissement, la menace (5 %, ×2), le retour des voleurs (gagné, perdu) — OK");
