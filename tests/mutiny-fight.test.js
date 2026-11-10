"use strict";

// La mutinerie, étape 2 : le combat (Idan, 2026-11-10 : « la conversation s'échauffe, et le capitaine doit se battre face à
// l'ensemble des mutins » ; « Pour qu'un mercenaire rejoigne le capitaine, plusieurs règles. Il doit être au camp et pas
// blessé. On fait un test d'affinité envers le capitaine bien dur. Genre 50% de chance si l'affinité est au max. 0% si
// l'affinité est négatie » ; « Oui, épargner ou mise à mort et dettes toujours dues. On est tranquille pour la journée. Le
// capitaine gagne les même bonus pour chaque mutin qu'en défie » ; « S'il perd. Game Over ! »).
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
require("../game-core/regeneration.js");
require("../game-core/recruit-dialogue.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
assert.equal(reference.formulaConstants.rows.find(r=>r.code==="mutiny.ally.affinity_factor")?.valeur,0.5);
assert.ok(reference.mutinyDialogue.fight.start&&reference.memorial.causes.mutiny?.length);

let seed=41,dice=[];
const d100=n=>(n-1)/100+0.001;
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id});
const affinity=createAffinityRules({reference});
const progression=Progression.createProgressionRules({reference});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,affinity,progression,
  random:()=>dice.length?dice.shift():0.5});
const mutiny=rules.mutinyRules,debts=rules.debtRules;
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6].map(id=>generator.createMercenary({id,captain}))});
const [boss,a,b,c,d,e]=state.company.roster;
const bond=m=>affinity.memberAffinity(boss,m).total;

// Une mutinerie qui tourne au combat : a et b viennent, la menace échoue.
function riot(day,members){
  state.day=day;
  for(const m of members) if(!debts.owedTo(state,m.id)) debts.owe(state,m,40,"salary");
  dice=[d100(1),...members.map(()=>d100(1))];
  mutiny.morning(state);
  dice=[d100(100)];
  const out=mutiny.confront(state,"fear");
  assert.equal(out.success,false);
  assert.ok(mutiny.fighting(state));
}

// 1. Les alliés : au camp, pas blessé, chance = 0,5 × affinité (0 si elle est négative) ; un seul tirage par combat.
riot(2,[a,b]);
c.recovery={kind:"wounded",daysLeft:3};
d.affinityAcquired=500;
e.affinityAcquired=-500;
assert.equal(mutiny.allyChance(state,d),Math.round(0.5*bond(d)*10)/10);
assert.equal(bond(d),100,"affinité au plus haut");
assert.equal(mutiny.allyChance(state,d),50,"50 % au plus");
assert.equal(mutiny.allyChance(state,e),0,"0 % si elle est négative");
dice=[d100(1)];
const allies=mutiny.rally(state);
assert.deepEqual(allies.map(x=>[x.id,x.chance,x.joins]),[[d.id,50,true],[e.id,0,false]],"ni les mutins, ni le blessé, ni le capitaine");
assert.equal(mutiny.rally(state),allies,"tiré une fois");
assert.deepEqual(mutiny.fighters(state),[a,b]);

// 2. Le combat, à l'écran (mission.js, sans page).
const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},open:false,parentElement:{clientWidth:900},dataset:{},
  classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){ this.open=false; },showModal(){ this.open=true; },querySelectorAll(){ return []; }});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const game={campaign:state,captain,referenceData:reference};
const engine=createCombatEngine(reference,{});
const saved=[];
const mission=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
const api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd",
  "MercenairesMagic","MercenairesMissionTerrain","campaignRules","tavernLog","confirm","renderGame","saveGame","deleteSavedGame",
  mission+"\nreturn {startMutinyFight,chooseDuelVerdict,checkMissionEnd,leaveMission};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,
    {createMagicRules},MissionTerrain,()=>rules,()=>{},()=>true,()=>{},()=>saved.push("save"),()=>saved.push("delete"));
const lines=()=>game.mission.log.map(l=>l.message);
const down=u=>Object.assign(u,{alive:false,hp:Math.min(u.hp,0)});

assert.equal(api.startMutinyFight(),true);
let m=game.mission;
assert.deepEqual(m.players.map(u=>u.character.id),[boss.id,d.id],"le capitaine et son allié");
assert.deepEqual(m.enemies.map(u=>u.character.id),[a.id,b.id],"les mutins");
assert.ok(lines().some(t=>t.startsWith("Les mutins tirent l’épée")&&t.endsWith("2 mutins.")));
assert.ok(lines().includes(`À ses côtés : ${d.name}.`));
assert.ok(m.players.every(u=>!m.enemies.some(x=>x.q===u.q&&x.r===u.r)),"chacun sa case");

// Victoire : a à terre, b s'enfuit (rattrapé) ; le verdict de chacun : a mis à mort, b épargné.
const intimidation=Number(boss.skills.social.Intimidation),charisma=Number(boss.stats.Charisme);
down(m.enemies[0]);
Object.assign(m.enemies[1],{offMap:true,fleeing:true,alive:false});
assert.equal(api.checkMissionEnd(),true);
assert.equal(m.winner,"player");
assert.deepEqual(m.mutiny.queue,[a.id,b.id]);
assert.equal($("duel-verdict-dialog").open,true,"le verdict");
api.chooseDuelVerdict(true);
assert.equal($("duel-verdict-dialog").open,true,"le suivant");
api.chooseDuelVerdict(false);
assert.equal(m.mutiny.resolved,true);
assert.ok(!state.company.roster.includes(a),"mis à mort");
assert.equal(state.company.memorial.at(-1).cause.kind,"mutiny");
assert.equal(debts.owedTo(state,a.id),0,"sa mort éteint sa dette");
assert.ok(state.company.roster.includes(b),"épargné");
assert.equal(debts.owedTo(state,b.id),40,"dettes toujours dues");
assert.ok(Number(boss.skills.social.Intimidation)>intimidation&&Number(boss.stats.Charisme)>=charisma,"les bonus du défi");
assert.ok(lines().some(t=>t.includes("+300 XP d’Intimidation")&&t.includes("(2 mutins)")),"deux fois les bonus du défi");
assert.equal(mutiny.fighting(state),null);
assert.equal(rules.canAdvanceDay(state).ok,true,"tranquille pour la journée");
assert.ok(boss.history.log.at(-1).kind==="mutiny_fought"&&boss.history.log.at(-1).count===2);
assert.ok(b.history.log.some(h=>h.kind==="mutiny_fought"&&h.role==="mutineer"));
assert.ok(d.history.log.some(h=>h.kind==="mutiny_fought"&&h.role==="ally"));
assert.ok(!state.gameOver);
api.leaveMission();
assert.equal(game.mission,null);

// Défaite : le capitaine tombe, même si son allié tient encore. « S'il perd. Game Over ! »
for(const x of state.company.roster) delete x.recovery;
riot(5,[b]);
dice=[d100(1)];
assert.equal(api.startMutinyFight(),true);
m=game.mission;
assert.ok(m.players.length>=1&&m.players[0].character.id===boss.id);
Object.assign(m.players[0],{alive:false,hp:1});
assert.equal(api.checkMissionEnd(),true);
assert.equal(m.winner,"enemy");
assert.equal(m.mutiny.resolved,true,"pas de verdict");
assert.deepEqual([Boolean(state.gameOver),state.gameOver?.reason],[true,"mutiny"]);
assert.ok(m.companyReport.gameOver);
assert.equal(saved.at(-1),"delete","la sauvegarde est effacée");

// 3. L'écran : le texte de fin, l'historique.
const saveUi=fs.readFileSync(path.join(ROOT,"prototype-web","save-ui.js"),"utf8");
assert.match(saveUi,/par ses mutins/);
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
assert.match(ui,/entry\.kind==="mutiny_fought"/);
assert.ok(reference.characterSheetCopy.history.events.mutiny_fought.captain.won);

console.log("Mutinerie, étape 2 : les alliés (50 % au plus), le combat, le verdict de chaque mutin, les bonus du défi, Game Over — OK");
