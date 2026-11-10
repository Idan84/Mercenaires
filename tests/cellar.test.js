"use strict";

// La Cave (Idan, 2026-11-10) : « On peut la construire pour 500 PO. Quand on s'y rend la première fois de chaque journée :
// On tire un mercenaire présent au camp et qui n'est pas blessé (mais qui peut être fatigué !). On tire un second mercenaire
// dont l'alignement est le plus éloigné possible du premier mercenaire. (tirage entre les plus éloignés) […] En tant que
// Capitaine, on peut décider de les arrêter ? Non. De parier sur le vainqueur ! […] On voit le combat entre nos deux employés
// se dérouler sous nos yeux. Les deux mercenaires gagnent l'XP de combat. Le perdant fait un jet de blessure. Le gagnant gagne
// 50XP en intimidation en bonus. » ; « C'est bien que le tavernier garde 10% » ; « Tout est validé ».
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createAffinityRules}=require("../game-core/affinity.js");
const {createCellarRules}=require("../game-core/cellar.js");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const Progression=require("../game-core/progression.js");
const MissionEnd=require("../game-core/mission-end.js");
require("../game-core/recruit-dialogue.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.cellarDialogue,"cellar-dialogue.json","le jeu charge les textes de la Cave");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;

// 1. Les données : la salle (500 PO, un niveau, 4 jours, à la Taverne), les constantes, les tonneaux, les textes.
const room=reference.campBuildings.rows.find(r=>r.code==="cellar");
assert.deepEqual([room.nom,room.niveaux,room.prix_base,room.jours_base,room.lieu],["La Cave",1,500,4,"taverne"]);
assert.deepEqual(["map.cols","map.rows","start.distance","odds.simulations","odds.margin","odds.min","xp.intimidation"].map(k=>constant("cellar."+k)),
  [9,9,2,100,0.1,1.01,50]);
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);
assert.equal(reference.campBuildings.row_count,reference.campBuildings.rows.length);
assert.equal(reference.terrainDecors.row_count,reference.terrainDecors.rows.length);
assert.equal(reference.terrainDecors.rows.find(r=>r.code==="tonneaux")?.couverture,"partielle","les tonneaux : couverture partielle");
const copy=reference.cellarDialogue;
assert.ok(copy.quarrels.length>=10,"des désaccords pour le folklore");
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","cellar-ui.js"),"utf8");
const mission=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
for(const key of Object.keys(copy).filter(k=>!["schema_version","name","description","quarrels"].includes(k)))
  assert.ok(ui.includes("copy."+key)||mission.includes("copy."+key)||mission.includes("cellarCopy()."+key),"texte utilisé : "+key);
const css=fs.readFileSync(path.join(ROOT,"prototype-web","styles.css"),"utf8");
assert.match(css,/\.hex-decor\[data-decor="tonneaux"\]\{background-image:url\("data:image\/svg\+xml,/,"le dessin des tonneaux");
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.ok(html.indexOf("/core/cellar.js")<html.indexOf("/core/campaign.js"),"cellar.js avant campaign.js");
assert.match(html,/data-tavern-view="cellar"/);
assert.match(html,/id="tavern-cellar"/);
assert.match(html,/<script src="cellar-ui.js"><\/script>/);

let seed=17;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
Math.random=random;
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const affinity=createAffinityRules({reference});
const progression=Progression.createProgressionRules({reference});

// 2. Les cotes : (1 − 10 %) ÷ chance, au centième, jamais sous ×1,01.
const pure=createCellarRules({reference,affinity,progression,random,camp:{buildingLevel:()=>1,expeditionOf:()=>null}});
assert.deepEqual([pure.oddsFor(0.75),pure.oddsFor(0.25),pure.oddsFor(0.5),pure.oddsFor(0.99)],[1.2,3.6,1.8,1.01]);

// 3. Le camp : rien avant la construction ; 500 PO, 4 jours.
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,affinity,progression,random});
const cellar=rules.cellarRules;
assert.ok(cellar&&rules.applyCellarFight);
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6,7].map(id=>generator.createMercenary({id,captain}))});
state.company.gold=10000;
assert.equal(cellar.draw(state),null,"pas de cave avant sa construction");
assert.deepEqual(rules.nextBuildingLevel(state,"cellar"),{code:"cellar",name:"La Cave",level:1,gold:500,days:4});
assert.equal(rules.startBuilding(state,"cellar").ok,true);
assert.equal(state.company.gold,9500);
rules.advanceTime(state,4);
assert.equal(rules.buildingLevel(state,"cellar"),1);
assert.equal(rules.nextBuildingLevel(state,"cellar"),null,"un seul niveau");

// 4. Qui descend : pas le capitaine, pas un blessé, pas un parti ni un prisonnier ; un fatigué, si.
const [cap,a,b,c,d,e,f]=state.company.roster;
b.recovery={kind:"wounded",daysLeft:9,sinceDay:state.day};
c.recovery={kind:"fatigued",daysLeft:3,sinceDay:state.day};
d.dungeon={since:state.day};
state.expeditions=[{id:"x",memberIds:[e.id],status:"scheduled"}];
assert.deepEqual(cellar.eligible(state).map(m=>m.id).sort(),[a.id,c.id,f.id].sort());
assert.deepEqual([cellar.why(state,cap),cellar.why(state,b),cellar.why(state,d),cellar.why(state,e),cellar.why(state,c)],["captain","wounded","dungeon","away",null]);

// 5. Le tirage : le second parmi les plus éloignés du premier ; gardé toute la journée ; un autre le lendemain.
a.alignment="Loyal bon"; c.alignment="Chaotique mauvais"; f.alignment="Neutre";
const tonight=cellar.draw(state);
assert.equal(cellar.draw(state),tonight,"une seule bagarre par jour");
const [first,second]=cellar.fighters(state);
const others=cellar.eligible(state).filter(m=>m!==first);
assert.equal(cellar.alignmentDistance(first,second),Math.max(...others.map(m=>cellar.alignmentDistance(first,m))),"le plus éloigné");
if(first===f) assert.ok([a,c].includes(second));
else assert.equal(second,first===a?c:a,"Loyal bon contre Chaotique mauvais");
assert.ok(Number.isInteger(tonight.quarrel)&&copy.quarrels[tonight.quarrel],"un désaccord du jour");
// Seeds variés : le second est toujours un des plus éloignés.
for(let i=0;i<20;i++){
  delete state.company.cellar;
  cellar.draw(state);
  const [x,y]=cellar.fighters(state);
  const far=Math.max(...cellar.eligible(state).filter(m=>m!==x).map(m=>cellar.alignmentDistance(x,m)));
  assert.equal(cellar.alignmentDistance(x,y),far);
}
// Moins de deux : pas de bagarre.
{
  const lonely=rules.createCampaign({captain:generator.createCaptain({id:50}),squad:[51,52].map(id=>generator.createMercenary({id,captain}))});
  lonely.company.camp={...(lonely.company.camp||{}),buildings:{...(lonely.company.camp?.buildings||{}),cellar:{level:1,construction:null}}};
  lonely.company.roster[1].recovery={kind:"wounded",daysLeft:5};
  assert.equal(cellar.draw(lonely).none,true,"un seul disponible");
  assert.equal(cellar.ready(lonely).ok,false);
}

// 6. Les cotes du tavernier : lissées ; revues si l'un des deux change d'équipement.
delete state.company.cellar;
cellar.draw(state);
const [p1,p2]=cellar.fighters(state);
assert.equal(cellar.oddsOf(state),null);
assert.equal(cellar.placeBet(state,{on:p1.id,stake:10}).reason,"odds","pas de pari avant les cotes");
const odds=cellar.setOdds(state,{wins:74,n:98});
assert.deepEqual([odds.p,odds.a,odds.b],[0.75,1.2,3.6]);
assert.equal(cellar.oddsOf(state),odds);
const savedSlots=JSON.stringify(p2.equipment?.slots||{});
p2.equipment={...(p2.equipment||{}),slots:{...(p2.equipment?.slots||{}),weapon_set_1_main:null}};
assert.equal(cellar.oddsOf(state),null,"il a changé d'arme : le tavernier refait ses comptes");
p2.equipment.slots=JSON.parse(savedSlots);
assert.equal(cellar.oddsOf(state),odds);

// 7. Le pari : la mise sur la table (pas plus que notre or), une seule ; gagné : mise × cote ; +50 XP d'Intimidation.
const gold=state.company.gold;
assert.equal(cellar.placeBet(state,{on:p2.id,stake:gold+1}).reason,"gold");
assert.equal(cellar.placeBet(state,{on:999,stake:10}).reason,"fighter");
assert.deepEqual(cellar.placeBet(state,{on:p2.id,stake:100}),{ok:true,bet:{on:p2.id,stake:100,odds:3.6}});
assert.equal(state.company.gold,gold-100);
assert.equal(cellar.placeBet(state,{on:p1.id,stake:10}).reason,"bet","une seule mise");
const engine=createCombatEngine(reference,{random});
const end=MissionEnd.createMissionEndRules({reference,random});
const xpOf=m=>JSON.stringify(m.xp?.skills||{});
const before=xpOf(p2);
const loserHp=Math.round(engine.maxHp({character:p1,activeSet:1})*0.3);
const lost=end.resolveMissionEnd([{id:p1.id,name:p1.name,hp:loserHp,pvMax:engine.maxHp({character:p1,activeSet:1}),damageTaken:50,
  stats:p1.stats,progress:null,spared:true}],{});
const aftermath={...lost,results:[{id:p2.id,name:p2.name,dead:false,wounded:false,fatigueDays:0,outcome:"standing",progress:null},...lost.results]};
const p2Recovery=JSON.stringify(p2.recovery||null);
const report=rules.applyCellarFight(state,{winnerId:p2.id,aftermath});
assert.ok(report.cellar);
assert.deepEqual([report.cellar.bet.won,report.cellar.bet.payout],[true,360]);
assert.equal(state.company.gold,gold-100+360,"mise × cote, mise comprise");
assert.equal(report.cellar.xp.intimidation,50);
assert.notEqual(xpOf(p2),before,"+50 XP d'Intimidation au gagnant");
assert.equal(JSON.stringify(p2.recovery||null),p2Recovery,"le gagnant n'est ni blessé ni fatigué de plus");
assert.ok(["wounded","fatigued"].includes(p1.recovery?.kind),"le perdant : blessé, sinon fatigué");
assert.equal(lost.results[0].dead,false,"pas de jet de mort");
assert.ok(state.company.roster.includes(p1));
assert.deepEqual(p2.history.log.at(-1),{day:state.day,kind:"cellar_fight",opponent:p1.name,outcome:"won"});
assert.deepEqual(p1.history.log.at(-1),{day:state.day,kind:"cellar_fight",opponent:p2.name,outcome:"lost"});
assert.equal(cellar.tonight(state).done,true);
assert.equal(rules.applyCellarFight(state,{winnerId:p2.id,aftermath}),null,"une seule fois");
assert.equal(cellar.ready(state).reason,"done");
// Un pari perdu : la mise reste au tavernier.
rules.advanceTime(state,1);
for(const m of state.company.roster) delete m.recovery;
state.expeditions=[];
delete d.dungeon;
cellar.draw(state);
{
  const [x,y]=cellar.fighters(state);
  cellar.setOdds(state,{wins:49,n:98});
  const g=state.company.gold;
  cellar.placeBet(state,{on:x.id,stake:40});
  const r=end.resolveMissionEnd([{id:x.id,name:x.name,hp:0,pvMax:100,damageTaken:100,stats:x.stats,progress:null,spared:true}],{});
  const out=rules.applyCellarFight(state,{winnerId:y.id,aftermath:{...r,results:[{id:y.id,name:y.name,dead:false,wounded:false,fatigueDays:0,progress:null},...r.results]},fled:true});
  assert.deepEqual([out.cellar.bet.won,out.cellar.bet.payout,state.company.gold],[false,0,g-40]);
  assert.equal(x.history.log.at(-1).outcome,"fled");
}

// 8. La bagarre à l'écran (mission.js, sans page) : en coulisses pour les cotes, puis sous nos yeux, puis sans nous.
rules.advanceTime(state,1);
for(const m of state.company.roster) delete m.recovery;
const element=()=>({textContent:"",innerHTML:"",disabled:false,title:"",style:{},dataset:{},parentElement:{clientWidth:900},
  classList:{add(){},remove(){},toggle(){},contains(){ return false; }},addEventListener(){},close(){},showModal(){}});
const elements={};
const $=id=>elements[id]||(elements[id]=element());
const game={campaign:state,captain:null,referenceData:reference};
const logged=[];
const api=new Function("game","$","esc","fmt","renderAvatar","combatEngine","MercenairesProgression","MercenairesMissionEnd","MercenairesCombat","campaignRules","tavernLog",
  mission+"\nconst missionLines=[];missionLog=function(message,kind){ missionLines.push(message); if(game.mission) game.mission.log.push({message,kind}); };"
  +"\nrenderMission=function(){};"
  +"\nreturn {buildCellarMission,simulateCellarOdds,playCellarInBackstage,startCellarFight,resolveUnwatchedCellarFight,generateMissionDecor,setMissionMapSize,MISSION_MAP,missionLines};")
  .call(null,game,$,v=>String(v??""),v=>String(Math.round(Number(v)||0)),()=>"",()=>createCombatEngine(reference),Progression,MissionEnd,
    {createCombatEngine},()=>rules,(message)=>logged.push(message));
api.setMissionMapSize({cols:13,rows:9});
cellar.draw(state);
const [l,r]=cellar.fighters(state);
const backstage=api.playCellarInBackstage(l,r);
assert.equal(backstage.over,true,"la bagarre va jusqu'au bout");
assert.ok(["player","enemy"].includes(backstage.winner));
assert.deepEqual([backstage.players.length,backstage.enemies.length],[1,1]);
assert.ok(backstage.decor.length>0&&backstage.decor.every(x=>x.code==="tonneaux"),"des tonneaux, rien d'autre");
{
  // Au départ : au centre, à 2 cases l'un de l'autre, les tonneaux à plus de 2 cases d'eux.
  const fresh=api.buildCellarMission(l,r,{simulation:true});
  const [u,v]=[fresh.players[0],fresh.enemies[0]];
  assert.equal(engine.hexDistance(u,v),2);
  assert.deepEqual([api.MISSION_MAP.cols,api.MISSION_MAP.rows],[9,9],"une cave de 9 × 9");
  assert.ok(fresh.decor.every(x=>engine.hexDistance(u,x)>2&&engine.hexDistance(v,x)>2),"les tonneaux loin des combattants");
  assert.deepEqual([u.isLieutenant,v.isLieutenant,u.isCaptain,v.isCaptain],[false,false,false,false],"pas d'aura à la cave");
  api.setMissionMapSize({cols:13,rows:9});
}
assert.equal(game.mission,undefined,"la vraie mission n'a pas bougé");
assert.deepEqual([api.MISSION_MAP.cols,api.MISSION_MAP.rows],[13,9],"la carte revient comme avant");
assert.equal(cellar.tonight(state).done,false,"en coulisses, rien ne s'applique");
assert.ok(!l.recovery&&!r.recovery);
assert.ok(!api.generateMissionDecor().some(x=>x.code==="tonneaux"),"pas de tonneaux en Mission Test");
const sim=api.simulateCellarOdds(l,r,8);
assert.ok(sim.n===8&&sim.wins>=0&&sim.wins<=8);
cellar.setOdds(state,sim);
const g0=state.company.gold;
assert.equal(cellar.placeBet(state,{on:l.id,stake:25}).ok,true);
assert.equal(api.startCellarFight(),true);
const fight=game.mission;
assert.ok(fight.cellar&&fight.over,"sans page, la bagarre se joue d'un trait");
assert.ok(fight.companyReport?.cellar,"le bilan est appliqué");
const won=fight.companyReport.cellar.winner.id===l.id;
assert.equal(state.company.gold,g0-25+(won?Math.round(25*cellar.tonight(state).bet.odds):0));
assert.ok(api.missionLines.some(t=>t.startsWith("La Cave : "+l.name+" et "+r.name)));
assert.ok(api.missionLines.some(t=>/^Vous misez 25 PO sur /.test(t)));
assert.ok(api.missionLines.some(t=>/\+50 XP d’Intimidation\.$/.test(t)));
assert.ok(api.missionLines.some(t=>/^Pari (gagné|perdu) : 25 PO misés sur /.test(t)));
assert.ok(!api.missionLines.includes("Tour ennemi."),"pas d'ennemi à la cave");
assert.equal(fight.aftermath.results.find(x=>x.outcome==="standing")?.id,fight.companyReport.cellar.winner.id);
// Le lendemain : une bagarre tirée mais pas regardée a lieu quand même, sans pari.
game.mission=null;
rules.advanceTime(state,1);
for(const m of state.company.roster) delete m.recovery;
cellar.draw(state);
const g1=state.company.gold;
const unwatched=api.resolveUnwatchedCellarFight();
assert.ok(unwatched?.cellar,"elle a lieu sans nous");
assert.equal(cellar.tonight(state).done,true);
assert.equal(state.company.gold,g1,"personne n'a parié");
assert.match(logged.at(-1),/^Pendant la nuit, à la cave : /);
assert.equal(api.resolveUnwatchedCellarFight(),null,"une seule fois");
assert.ok(fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8").includes("resolveUnwatchedCellarFight()"),"avant le jour suivant");

console.log("cellar ok");
