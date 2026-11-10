"use strict";

// La mutinerie (Idan, 2026-11-10), étape 1 : le mode mutinerie (on lui doit de l'argent), −10 d'affinité par jour, le test
// général du matin, le test de chacun, la scène (rembourser l'un d'eux, Promettre, Faire peur) ; « le mutin ne déserte
// plus ! » ; au camp et pas blessé. Les formules validées (« 1 - Parfait ») :
// - général : Δ = 5 × J − Intimidation ÷ 2 − affinité moyenne ÷ 2 ; chance = 100 / (1 + e^(−Δ/10)), de 1 à 99 % ;
// - chacun : Δ = 5 × ses jours de dette + (Courage − Intimidation) ÷ 2 − affinité ÷ 2 − 20 ;
// - Promettre : Charisme ÷ (Charisme + 10 × somme des jours de dette) ; Faire peur : Intimidation ÷ (Intimidation + somme
//   des Courages).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createAffinityRules}=require("../game-core/affinity.js");
const Progression=require("../game-core/progression.js");
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
assert.deepEqual(["mutiny.affinity_per_day","mutiny.general.days_weight","mutiny.member.offset","mutiny.promise.days_factor"].map(constant),[-10,5,-20,10]);
assert.ok(reference.mutinyDialogue.scene.options.promise&&reference.mutinyDialogue.scene.options.fear);

// 2. Les règles, dans la campagne.
let seed=29,dice=[];
// Un jet de d100 voulu (1 à 100) : la valeur de random() qui le donne.
const d100=n=>(n-1)/100+0.001;
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id});
const affinity=createAffinityRules({reference});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,affinity,
  progression:Progression.createProgressionRules({reference}),random:()=>dice.length?dice.shift():0.5});
const mutiny=rules.mutinyRules,debts=rules.debtRules;
assert.ok(mutiny,"la mutinerie est branchée");
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6].map(id=>generator.createMercenary({id,captain}))});
const [boss,a,b,c,d,e]=state.company.roster;
const bond=m=>affinity.memberAffinity(boss,m).total;
const value=(m,name)=>mutiny.valueOf(m,name);
const logistic=delta=>Math.min(99,Math.max(1,100/(1+Math.exp(-delta/10))));
const close=(x,y,msg)=>assert.ok(Math.abs(x-y)<0.11,`${msg} : ${x} ≠ ${y}`);
// L'or ne manque pas : pas de mutinerie, rien ne bouge.
let report=mutiny.morning(state);
assert.deepEqual([report.days,state.company.mutiny.today],[0,null]);
assert.equal(mutiny.inMutiny(state,boss),false,"jamais le capitaine");

// On doit de l'argent à a, b et c (depuis le jour 1).
for(const m of [a,b,c]) debts.owe(state,m,50,"salary",{day:1});
assert.deepEqual(mutiny.mutineers(state),[a,b,c]);
// c est blessé : il ne vient pas, mais il perd son affinité.
c.recovery={kind:"wounded",daysLeft:5};
const before=[a,b,c,d].map(m=>Number(m.affinityAcquired)||0);
dice=[d100(100)];
report=mutiny.morning(state);
assert.deepEqual([a,b,c,d].map(m=>Number(m.affinityAcquired)||0),[before[0]-10,before[1]-10,before[2]-10,before[3]],"−10 par jour pour chaque mutin");
assert.equal(report.days,1);
// Le test général : J = 1, l'Intimidation du capitaine, l'affinité moyenne de a et b (c est blessé).
const general=1*5-value(boss,"Intimidation")/2-(bond(a)+bond(b))/2/2;
close(state.company.mutiny.today.chance,logistic(general),"chance générale");
assert.deepEqual([state.company.mutiny.today.broke,state.company.mutiny.today.status],[false,"calm"],"100 : ça ne passe pas");
assert.equal(rules.canAdvanceDay(state).ok,true);

// Le jour suivant, la mutinerie éclate (jet 1) ; a vient (jet 1), b non (jet 100).
state.day=2;
dice=[d100(1),d100(1),d100(100)];
report=mutiny.morning(state);
assert.equal(report.days,2,"deux jours d'affilée");
const today=state.company.mutiny.today;
assert.equal(today.broke,true);
assert.deepEqual(today.tests.map(t=>[t.id,t.comes]),[[a.id,true],[b.id,false]]);
const member=2*5+(value(a,"Courage")-value(boss,"Intimidation"))/2-bond(a)/2-20;
close(today.tests[0].chance,logistic(member),"chance de chacun");
assert.equal(mutiny.debtDays(state,a),2);
assert.deepEqual(mutiny.present(state),[a]);
assert.equal(today.status,"scene");
const blocked=rules.canAdvanceDay(state);
assert.deepEqual([blocked.ok,blocked.mutiny],[false,true],"la scène d'abord");

// La scène : les chances de Promettre et de Faire peur.
const promise=mutiny.confrontChance(state,"promise");
close(promise.chance,100*value(boss,"Charisme")/(value(boss,"Charisme")+10*2),"Promettre");
const fear=mutiny.confrontChance(state,"fear");
close(fear.chance,100*value(boss,"Intimidation")/(value(boss,"Intimidation")+value(a,"Courage")),"Faire peur");
// Réussi : tranquille pour la journée.
dice=[d100(1)];
let out=mutiny.confront(state,"promise");
assert.deepEqual([out.ok,out.success,today.status,rules.canAdvanceDay(state).ok],[true,true,"calm",true]);
assert.equal(mutiny.confront(state,"fear").ok,false,"plus personne n'attend");

// Raté : le combat, qui bloque la journée (étape 2).
state.day=3;
dice=[d100(1),d100(1),d100(1)];
mutiny.morning(state);
assert.deepEqual(mutiny.present(state),[a,b]);
dice=[d100(100)];
out=mutiny.confront(state,"fear");
assert.deepEqual([out.success,state.company.mutiny.today.status],[false,"fight"]);
assert.ok(mutiny.fighting(state));
assert.equal(rules.canAdvanceDay(state).ok,false,"le combat d'abord");
mutiny.fought(state);
assert.equal(rules.canAdvanceDay(state).ok,true);

// Rembourser l'un d'eux pendant la scène : il quitte le groupe ; tous remboursés, le camp est tranquille.
state.day=4;
dice=[d100(1),d100(1),d100(1)];
mutiny.morning(state);
assert.deepEqual(mutiny.present(state),[a,b]);
state.company.gold=1000;
assert.equal(debts.repay(state,a.id).ok,true);
assert.deepEqual(mutiny.settled(state,a.id).members,[b]);
assert.equal(debts.repay(state,b.id).ok,true);
assert.deepEqual(mutiny.settled(state,b.id),{ok:true,calm:true,members:[]});
assert.equal(rules.canAdvanceDay(state).ok,true);
// Le capitaine absent (en mission) : personne ne vient le voir ; les jours continuent de compter.
state.day=5;
assert.deepEqual(mutiny.mutineers(state),[c]);
delete c.recovery;
state.expeditions=[{id:"x",status:"travelling",memberIds:[boss.id],offer:{}}];
dice=[d100(1),d100(1)];
report=mutiny.morning(state);
assert.deepEqual([report.days,state.company.mutiny.today.status],[5,"none"]);
state.expeditions=[];
// Plus de dettes : le compteur repart de zéro.
debts.forget(state,c.id);
report=mutiny.morning(state);
assert.deepEqual([report.days,state.company.mutiny.days,state.company.mutiny.today],[0,0,null]);

// 3. « Le mutin ne déserte plus ! » : son affinité baisse, mais il ne fait pas le test de désertion.
state.day=6;
debts.owe(state,d,10,"salary");
d.loyalty={affinity:bond(d)+100};
e.loyalty={affinity:bond(e)+100};
dice=Array(40).fill(d100(100));
const desertion=rules.desertionRules.morning(state);
assert.ok(!desertion.tests.some(t=>t.id===d.id),"le mutin ne teste pas");
assert.ok(desertion.tests.some(t=>t.id===e.id),"l'autre, si");

// 4. L'écran.
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.ok(html.indexOf("/core/mutiny.js")>0&&html.indexOf("/core/mutiny.js")<html.indexOf("/core/campaign.js"),"le module avant la campagne");
assert.match(html,/<dialog id="mutiny-dialog" class="talk-dialog talk-dialog--recruit"/);
assert.match(html,/<script src="mutiny-ui\.js"><\/script>/);
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","mutiny-ui.js"),"utf8");
const logged=[];
const api=new Function("game","$","esc","fmt","campaignRules","tavernLog","saveGame","renderGame","renderAvatar","variantPhrase","MercenairesRecruitDialogue",
  ui+"\nreturn {logMutiny,mutinyNews};")({campaign:state,referenceData:reference},()=>({}),v=>String(v??""),v=>String(v),()=>rules,
  (t,k)=>logged.push([t,k]),()=>{},()=>{},()=>"",l=>l[0],globalThis.MercenairesRecruitDialogue);
const scene={today:{status:"scene",members:[a.id,b.id]}};
api.logMutiny(scene);
assert.equal(logged.at(-1)[0],"Mutinerie : 2 mercenaires viennent réclamer leur solde au capitaine.");
api.logMutiny({today:{status:"scene",members:[a.id]}});
assert.equal(logged.at(-1)[0],`Mutinerie : ${a.name} vient réclamer sa solde au capitaine.`);
assert.deepEqual(api.mutinyNews(scene).map(n=>[n.text,n.detail]),[["Mutinerie !","2 mercenaires veulent leur solde"]]);
assert.deepEqual(api.mutinyNews({today:{status:"calm",members:[]}}),[]);

console.log("Mutinerie, étape 1 : −10 par jour, le test général, le test de chacun, la scène (rembourser, Promettre, Faire peur), le mutin ne déserte plus — OK");
