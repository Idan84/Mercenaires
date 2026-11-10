"use strict";

// Le Défi du capitaine, étapes 2 et 3 (Idan, 2026-11-09) :
// - « Après chaque refus (apprentissage, échange, poste, corvée), "Défier" s'ajoute à côté d'Intimider et Convaincre. Si on
//   gagne, il cède. Si on perd, le refus tient. » ;
// - « La désertion : le vrai duel remplace le duel automatique. Si on gagne, il reste, ou il est mis à mort. Si on perd, il
//   part avec son sac. » ; la fuite hors de l'arène est une victoire du capitaine (« Il court, mais se fait rattraper »).
// Le duel est celui de la fiche (tests/duel.test.js) ; ici, ce qu'il décide ensuite.
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
require("../game-core/recruit-dialogue.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const duelCopy=reference.duelDialogue;
assert.ok(duelCopy.request_confirm&&duelCopy.request_won&&duelCopy.request_lost);
assert.ok(reference.desertionDialogue.log.duel_lost);
assert.equal(reference.desertionDialogue.scene.outcome.duel,undefined,"plus de duel automatique");

let seed=71;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const affinity=createAffinityRules({reference});
const progression=Progression.createProgressionRules({reference});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,affinity,progression,random});
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6,7].map(id=>generator.createMercenary({id,captain}))});

// L'écran de combat (mission.js) sans page ; la relance (persuasion-ui.js) est remplacée par un témoin.
const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},open:false,parentElement:{clientWidth:900},
  classList:{add(){},remove(){},toggle(){}},addEventListener(){},close(){ this.open=false; },showModal(){ this.open=true; },querySelectorAll(){ return []; }});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const game={campaign:state,captain,referenceData:reference};
const engine=createCombatEngine(reference,{});
const calls=[];
const PERSUASION_HANDLERS={deal:(approach,data)=>{
  const m=state.company.roster.find(x=>String(x.id)===String(data.persuadeMember));
  calls.push({approach,data,recovery:m?.recovery?.kind||null});
}};
const logged=[];
const mission=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
const api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd",
  "MercenairesMagic","MercenairesMissionTerrain","campaignRules","PERSUASION_HANDLERS","tavernLog","confirm","renderGame",
  mission+"\nreturn {challengeFromRequest,challengeDeserter,startCaptainDuel,surrenderMissionDuel,chooseDuelVerdict,checkMissionEnd,leaveMission};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>engine,Progression,MissionEnd,
    {createMagicRules},MissionTerrain,()=>rules,PERSUASION_HANDLERS,(message,kind)=>logged.push([message,kind]),()=>true,()=>{});
const [boss,a,b,c,d,e,f]=state.company.roster;
const rest=()=>{ for(const m of state.company.roster) delete m.recovery; };
const flee=()=>{ Object.assign(game.mission.enemies[0],{offMap:true,fleeing:true,alive:false}); assert.equal(api.checkMissionEnd(),true); };
const lines=()=>game.mission.log.map(l=>l.message);

// Étape 2. Défier après un refus : la discussion se ferme, le duel commence.
$("deal-talk-dialog").open=true;
assert.equal(api.challengeFromRequest("deal",{persuadeMember:String(a.id),persuadeKind:"deal"}),true);
assert.equal($("deal-talk-dialog").open,false,"la discussion se ferme");
assert.deepEqual(game.mission.duel.request,{kind:"deal",data:{persuadeMember:String(a.id),persuadeKind:"deal"}});
// Il fuit (rattrapé) : victoire ; épargné, il cède — avant le bilan du duel, qui le laisse fatigué ou blessé.
flee();
api.chooseDuelVerdict(false);
assert.deepEqual(calls.map(x=>[x.approach,x.data.persuadeMember,x.recovery]),[["challenge_won",String(a.id),null]],"il cède, encore en forme");
assert.ok(a.recovery,"puis le bilan du duel");
assert.ok(lines().includes(`${a.name} a perdu le duel : ${String(a.sex).startsWith("F")?"elle":"il"} cède.`));
api.leaveMission();
assert.equal($("deal-talk-dialog").open,true,"la discussion reprend, avec l'issue");
// Le capitaine se rend : le refus tient.
rest();
assert.equal(api.challengeFromRequest("deal",{persuadeMember:String(b.id)}),true);
api.surrenderMissionDuel();
assert.deepEqual(calls.at(-1).approach,"challenge_lost");
assert.ok(lines().includes(`${boss.name} a perdu le duel : le refus de ${b.name} tient.`));
// Mis à mort : il ne refusera plus rien ; pas de relance.
rest();
const before=calls.length;
assert.equal(api.challengeFromRequest("deal",{persuadeMember:String(c.id)}),true);
flee();
api.chooseDuelVerdict(true);
assert.equal(calls.length,before,"mort : pas de relance");
assert.ok(!state.company.roster.includes(c));
$("deal-talk-dialog").open=false;
api.leaveMission();
assert.equal($("deal-talk-dialog").open,false,"pas de discussion à reprendre");
// Impossible s'il ne peut pas se battre aujourd'hui.
rest();
d.recovery={kind:"wounded",daysLeft:5};
assert.equal(api.challengeFromRequest("deal",{persuadeMember:String(d.id)}),false);

// Étape 3. La désertion : le vrai duel, depuis la scène.
rest();
const desert=id=>{ state.company.deserting=[{id,day:state.day,chance:50,attempted:null}]; };
// Gagné, épargné : il reste (15 jours sans test) ; la scène suivante, s'il y en a.
desert(e.id);
$("desertion-dialog").open=true;
assert.equal(api.challengeDeserter(e.id),true);
assert.equal($("desertion-dialog").open,false);
assert.equal(game.mission.duel.desertion,true);
flee();
api.chooseDuelVerdict(false);
assert.deepEqual([state.company.roster.includes(e),state.company.deserting,e.loyalty.immuneUntil],[true,[],state.day+15]);
assert.ok(lines().includes(`${e.name} reste dans la compagnie.`));
assert.ok(logged.some(([t])=>t===`${e.name} reste dans la compagnie.`));
// Perdu : il part avec son sac.
rest();
desert(f.id);
assert.equal(api.challengeDeserter(f.id),true);
api.surrenderMissionDuel();
assert.deepEqual([state.company.roster.includes(f),state.company.deserters.at(-1).id,state.company.deserting],[false,f.id,[]]);
assert.ok(lines().some(t=>t===`${f.name} a battu le capitaine en combat singulier et quitte la compagnie, avec son sac.`));
// Gagné, mis à mort : le Mémorial (défié par son capitaine).
rest();
desert(e.id);
assert.equal(api.challengeDeserter(e.id),true);
flee();
api.chooseDuelVerdict(true);
assert.deepEqual([state.company.roster.includes(e),state.company.deserting],[false,[]]);
assert.equal(state.company.memorial.at(-1).id,e.id);
assert.equal(state.company.memorial.at(-1).cause.kind,"challenged");
assert.ok(lines().some(t=>t===`${e.name} est ${String(e.sex).startsWith("F")?"morte":"mort"} en combat singulier contre le capitaine.`));
assert.equal(rules.canAdvanceDay(state).ok,true);

// Les écrans : « Défier » dans les relances et dans la scène de désertion.
const persuasionUi=fs.readFileSync(path.join(ROOT,"prototype-web","persuasion-ui.js"),"utf8");
assert.match(persuasionUi,/data-persuade="challenge"/);
assert.match(persuasionUi,/challengeFromRequest\(button\.dataset\.persuadeKind,\{\.\.\.button\.dataset\}\)/);
const desertionUi=fs.readFileSync(path.join(ROOT,"prototype-web","desertion-ui.js"),"utf8");
assert.match(desertionUi,/challengeDeserter\(m\.id\)/);
assert.ok(!/rules\.duel\(/.test(desertionUi),"plus de duel automatique");

console.log("Défi du capitaine, étapes 2 et 3 : après un refus (il cède, le refus tient, mort), la désertion (il reste, il part, Mémorial) — OK");
