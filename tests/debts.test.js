"use strict";

// Les dettes (Idan, 2026-11-10 : « on ne passe pas en négatif, on reste à 0 et on a des dettes envers chaque mercenaire. On
// fera une liste des dettes. Bien entendu ces dettes s'éteignent par le remboursement mais également par le décès du
// mercenaire. Si l'argent rentre, on décide (ou non) de rembourser ses dettes (à ceux encore vivants du moins…) » ;
// « on décide individuellement pour chaque mercenaire » ; « 1) au prorata 2) oui 3) le mercenaire subvient aux besoins de sa
// monture en attendant. On lui doit cet argent. Les autres, c'est le dresseur. Sinon, elles sont relâchées 4) ok
// 5) individuel mais totale »).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Debts=require("../game-core/debts.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createAffinityRules}=require("../game-core/affinity.js");
const Progression=require("../game-core/progression.js");
require("../game-core/regeneration.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
assert.ok(reference.debtsCopy?.panel?.title,"les textes : debts-copy.json");

// 1. Le module seul : le prorata, en PO entières.
const debts=Debts.createDebtRules();
const a={id:1,name:"A"},b={id:2,name:"B"},c={id:3,name:"C"};
let state={day:5,company:{gold:100,roster:[a,b,c]}};
let bill=debts.settle(state,[{creditor:a,amount:60,kind:"salary"},{creditor:b,amount:40,kind:"salary"}]);
assert.deepEqual([bill.paid,bill.owed,state.company.gold,debts.list(state).length],[100,0,0,0],"assez d'or : tout est payé");
state.company.gold=50;
bill=debts.settle(state,[{creditor:a,amount:60,kind:"salary"},{creditor:b,amount:40,kind:"salary"},{creditor:c,amount:0,kind:"salary"}]);
assert.deepEqual([bill.paid,bill.owed,state.company.gold],[50,50,0],"la caisse est vidée, jamais sous 0");
assert.deepEqual(debts.list(state).map(e=>[e.id,e.amount,e.salary,e.since]),[[1,30,30,5],[2,20,20,5]],"au prorata : la moitié de chacun");
// Le plus fort reste : 10 PO pour trois fois 7 PO ; 11 PO dues, réparties 4, 4, 3.
state={day:1,company:{gold:10,roster:[a,b,c]}};
bill=debts.settle(state,[a,b,c].map(m=>({creditor:m,amount:7,kind:"salary"})));
assert.deepEqual([bill.owed,debts.list(state).map(e=>e.amount).sort().join(",")],[11,"3,4,4"]);
// Une ligne sans créancier : rien n'est dû, l'appelant décide (unpaid).
state={day:1,company:{gold:0,roster:[a]}};
bill=debts.settle(state,[{creditor:null,amount:10,kind:"upkeep"},{creditor:a,amount:10,kind:"upkeep"}]);
assert.deepEqual([bill.unpaid.length,debts.owedTo(state,1)],[1,10]);
// Une caisse déjà sous 0 (ancienne sauvegarde) revient à 0.
state={day:1,company:{gold:-40,roster:[a]}};
debts.settle(state,[{creditor:a,amount:10,kind:"salary"}]);
assert.deepEqual([state.company.gold,debts.owedTo(state,1)],[0,10]);
// Les dettes s'additionnent ; le jour du premier impayé reste.
state.day=3;
debts.owe(state,a,5,"bonus");
assert.deepEqual(["amount","salary","bonus","since","last"].map(k=>debts.entryOf(state,1)[k]),[15,10,5,1,3]);
// Rembourser : toute sa dette, s'il y a l'or ; sinon rien.
assert.deepEqual(debts.repay(state,1),{ok:false,reason:"gold",amount:15});
state.company.gold=20;
assert.deepEqual(debts.repay(state,1),{ok:true,amount:15,name:"A",present:true});
assert.deepEqual([state.company.gold,debts.list(state).length],[5,0]);
// Les morts n'y sont plus.
debts.owe(state,a,5,"salary");
state.company.memorial=[{id:1}];
assert.deepEqual([debts.list(state).length,debts.repay(state,1).ok],[0,false]);

// 2. Dans la campagne.
let seed=17;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const affinity=createAffinityRules({reference});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,affinity,
  progression:Progression.createProgressionRules({reference}),random:()=>0.5});
assert.ok(rules.debtRules,"les dettes sont branchées");
const captain=generator.createCaptain({id:1});
const game=rules.createCampaign({captain,squad:[2,3,4,5].map(id=>generator.createMercenary({id,captain,forcedPeople:"Humain"}))});
const [boss,m2,m3,m4,m5]=game.company.roster;
for(const [m,salary] of [[m2,40],[m3,30],[m4,20],[m5,10]]) m.contract.dailySalary=salary;
const list=()=>rules.debtRules.list(game).map(e=>[e.id,e.amount]);

// Le matin : 100 PO de salaires pour 40 PO en caisse ; chacun touche 40 % ; le reste est dû.
game.company.gold=40;
let [day]=rules.advanceTime(game,1);
assert.equal(game.company.gold,0,"la caisse reste à 0");
assert.deepEqual([day.salaries.total,day.salaries.paid,day.salaries.owed],[100,40,60]);
assert.deepEqual(list(),[[m2.id,24],[m3.id,18],[m4.id,12],[m5.id,6]],"au prorata");
assert.deepEqual(day.salaries.debts.map(d=>d.amount),[24,18,12,6]);
// Sans or : tout est dû, jour après jour ; la caisse ne descend jamais sous 0.
rules.advanceTime(game,2);
assert.equal(game.company.gold,0);
assert.deepEqual(list(),[[m2.id,104],[m3.id,78],[m4.id,52],[m5.id,26]]);
assert.equal(rules.debtRules.entryOf(game,m2.id).since,2,"depuis le premier jour impayé");

// L'or rentre : rien n'est remboursé tout seul ; on choisit, un par un, toute sa dette.
game.company.gold=150;
for(const m of [m2,m3,m4,m5]) m.contract.dailySalary=0;
rules.advanceTime(game,1);
assert.equal(game.company.gold,150,"pas de remboursement automatique");
assert.equal(rules.debtRules.repay(game,m2.id).ok,true);
assert.equal(game.company.gold,46);
assert.deepEqual(rules.debtRules.repay(game,m3.id),{ok:false,reason:"gold",amount:78},"tout ou rien");
assert.deepEqual(list(),[[m3.id,78],[m4.id,52],[m5.id,26]]);

// La mort éteint la dette (fin de mission : mort).
rules.applyMissionAftermath(game,{results:[{id:m4.id,dead:true,wounded:false,cause:{kind:"unknown"}}]});
assert.ok(!game.company.roster.includes(m4));
assert.deepEqual(list(),[[m3.id,78],[m5.id,26]],"mort : plus rien ne lui est dû");
// Parti vivant (on le laisse partir) : il garde sa créance.
game.company.deserting=[{id:m5.id,day:game.day,chance:50,attempted:null}];
assert.equal(rules.desertionRules.letGo(game,m5.id).ok,true);
assert.ok(!game.company.roster.includes(m5));
assert.deepEqual(rules.debtRules.list(game).map(e=>[e.id,e.amount,e.present]),[[m3.id,78,true],[m5.id,26,false]],"parti : sa créance reste");
assert.equal(rules.debtRules.repay(game,m5.id).ok,true,"vivant : on peut encore le rembourser");

// Les primes de mission : au prorata, la part impayée est due.
for(const [m,bonus] of [[m2,60],[m3,40]]) m.contract.missionBonus=bonus;
game.company.gold=50;
let report=rules.applyMissionAftermath(game,{results:[{id:m2.id,dead:false,wounded:false,fatigueDays:0},{id:m3.id,dead:false,wounded:false,fatigueDays:0}]});
assert.deepEqual([report.bonusPaid,report.bonusOwed,game.company.gold],[50,50,0]);
assert.deepEqual(report.bonuses.map(b=>[b.mercenary.id,b.bonus,b.owed]),[[m2.id,60,30],[m3.id,40,20]]);
assert.deepEqual(["amount","salary","bonus"].map(k=>rules.debtRules.entryOf(game,m3.id)[k]),[98,78,20]);

// 3. L'entretien des montures : celle d'un mercenaire, on la lui doit ; sans propriétaire, au Dresseur ; sans Dresseur,
// relâchée ; celle du capitaine, il la nourrit lui-même.
for(const id of [m2.id,m3.id]) rules.debtRules.forget(game,id);
game.company.camp.buildings={trainer_barn:{level:3,construction:null},trainer_stables:{level:3,construction:null}};
const give=(m,name)=>{
  const item=generator.createItemByName("mount",name);
  item.owner=m?m.id:null;
  if(m) m.items.push(item); else game.company.stock.push(item);
  return item;
};
const ridden=give(m2,"Destrier"),captains=give(boss,"Destrier"),loose=give(null,"Destrier");
const upkeep=rules.stableRules.upkeepOf(ridden);
assert.ok(upkeep>0);
game.company.gold=0;
[day]=rules.advanceTime(game,1);
assert.deepEqual(list(),[[m2.id,upkeep]],"sa monture : on la lui doit");
assert.deepEqual(day.stable.released.map(i=>i.id),[loose.id],"sans Dresseur : relâchée");
assert.ok(!rules.stableRules.mountsOf(game).includes(loose));
assert.ok(rules.stableRules.mountsOf(game).includes(captains),"celle du capitaine reste, sans dette");
// Avec un Dresseur : les montures sans propriétaire, on les lui doit.
const loose2=give(null,"Destrier");
game.company.trainerId=m3.id;
rules.advanceTime(game,1);
assert.deepEqual(list(),[[m2.id,2*upkeep],[m3.id,upkeep]],"le Dresseur avance l'entretien");
assert.ok(rules.stableRules.mountsOf(game).includes(loose2));
assert.equal(rules.debtRules.entryOf(game,m3.id).upkeep,upkeep);

// 4. L'écran : le menu « Dettes » de l'Intendance, le journal, la notification.
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.ok(html.indexOf("/core/debts.js")>0&&html.indexOf("/core/debts.js")<html.indexOf("/core/campaign.js"),"le module avant la campagne");
assert.match(html,/<div id="debts-panel" class="steward-panel"><\/div>/);
assert.match(html,/<script src="debts-ui\.js"><\/script>/);
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","debts-ui.js"),"utf8");
const nodes={};
const $=id=>nodes[id]||(nodes[id]={innerHTML:"",querySelector:()=>null});
const logged=[];
const api=new Function("game","$","esc","fmt","campaignRules","tavernLog","saveGame","renderGame",
  ui+"\nreturn {debtsPanelHtml,renderDebtsPanel,logDebts,debtNews,repayDebt};")(
  {campaign:game,referenceData:reference},$,v=>String(v??""),v=>String(v),()=>rules,(t,k)=>logged.push([t,k]),()=>{},()=>{});
game.company.gold=upkeep;
const panel=api.debtsPanelHtml(game);
assert.match(panel,new RegExp("Dettes · "+3*upkeep+" PO"));
assert.match(panel,new RegExp(`data-debt-repay="${m3.id}">Rembourser`),"assez d'or pour lui");
assert.match(panel,new RegExp(`data-debt-repay="${m2.id}" disabled title="Pas assez d’or"`),"pas assez pour lui");
api.repayDebt(m3.id);
assert.equal(game.company.gold,0);
assert.ok(logged.some(([t])=>t.startsWith(m3.name+" est rembours")));
api.logDebts(day);
assert.ok(logged.some(([t])=>/avancées par/.test(t)));
assert.ok(logged.some(([t])=>/personne pour payer son entretien, relâché/.test(t)));
assert.deepEqual(api.debtNews(day).map(e=>e.text),["Caisse vide","Destrier relâché"].map((t,i)=>i?(loose.petName||"Destrier")+" relâché":t));
rules.debtRules.forget(game,m2.id);
assert.equal(api.debtsPanelHtml(game),"","pas de dettes : pas de menu");

console.log("Dettes : la caisse à 0, le prorata, les primes, l'entretien (cavalier, Dresseur, relâchée), la mort, le départ, le remboursement individuel et total — OK");
