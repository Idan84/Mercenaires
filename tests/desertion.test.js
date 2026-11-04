"use strict";

// Désertion (Idan, 2026-11-04 : « Chaque matin, quand l'affinité d'un mercenaire a baissé, il fait un test d'affinité avec
// le capitaine, puis en cas d'échec avec chacun des lieutenants. Si tous les tests échouent, le mercenaire se barre ! » ;
// « Variante plus douce » ; « il part avec son sac aussi ! » ; « Garde-fou : s'il reste, il est immunisé aux tests de
// désertion pendant 15 jours » ; « Si ! Il est mort dans un combat ») : le test du matin, la Tour de guet, la scène (Intimider,
// Convaincre, le défier, le laisser partir), le cachot, les déserteurs et le mémorial.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createAffinityRules}=require("../game-core/affinity.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.desertionDialogue,"desertion-dialogue.json","le jeu charge les textes");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual(["stay.offset","stay.scale","stay.min","stay.max","spot.per_level","spot.offset","spot.stealth_median","spot.scale",
  "spot.min","spot.max","persuade.affinity_weight","persuade.offset","persuade.stay_affinity","let_go.affinity","immunity_days"].map(k=>constant("desertion."+k)),
  [60,10,1,99,10,55,30,15,5,95,0.5,-60,20,10,15]);
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);

let seed=47,dice=[];
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id});
const affinity=createAffinityRules({reference});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,affinity,
  random:()=>dice.length?dice.shift():0.999});
const desertion=rules.desertionRules;
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6,7,8].map(id=>generator.createMercenary({id,captain}))});
const company=state.company;
const [, a, b, c, d, e, f, g]=company.roster;
const total=m=>affinity.memberAffinity(captain,m).total;
const drop=(m,n=5)=>{ m.affinityAcquired=(Number(m.affinityAcquired)||0)-n; };
const morning=()=>{ state.day+=1; return desertion.morning(state); };

// Les courbes : 50 % de rester à −60 (« variante plus douce »), de 1 à 99 % ; la Tour : 95 % au niveau 10 pour une Discrétion
// moyenne, rien sans Tour ; le retenir : dur.
assert.deepEqual([0,-20,-40,-60,-80].map(x=>Math.round(desertion.stayChance(x))),[99,98,88,50,12]);
a.skills.martial["Discrétion"]=30;
assert.equal(desertion.spotChance(state,a),0,"sans Tour de guet, jamais repéré");
company.camp.buildings={watchtower:{level:10,construction:null}};
assert.equal(Math.round(desertion.spotChance(state,a)),95);
company.camp.buildings.watchtower.level=5;
assert.equal(Math.round(desertion.spotChance(state,a)),42);
a.skills.martial["Discrétion"]=45;
assert.equal(Math.round(desertion.spotChance(state,a)),21);
company.camp.buildings={};

// Le premier matin note l'affinité de chacun, sans test ; ensuite, seulement ceux dont l'affinité a baissé.
company.intendantId=null; company.lieutenantIds=[];
assert.deepEqual(morning().tests,[]);
assert.ok(company.roster.every(m=>m.id===captain.id||Number.isFinite(m.loyalty.affinity)));
assert.equal(captain.loyalty,undefined,"le capitaine n'est jamais testé");
dice=[0];
drop(a);
let r=morning();
assert.deepEqual(r.tests.map(t=>[t.id,t.stayed,t.rolls.map(x=>x.who)]),[[a.id,true,["captain"]]]);
assert.equal(Math.round(r.tests[0].rolls[0].chance),Math.round(desertion.stayChance(total(a))));
assert.deepEqual(morning().tests,[],"pas de baisse, pas de test");

// Le capitaine rate, un lieutenant le retient (son affinité envers le lieutenant).
company.lieutenantIds=[g.id];
drop(b); dice=[0.999,0];
r=morning();
assert.deepEqual(r.tests.map(t=>[t.id,t.stayed,t.rolls.map(x=>x.who)]),[[b.id,true,["captain",g.id]]]);
assert.equal(r.tests[0].rolls[1].affinity,affinity.affinity(g,b).total);
// Tous ratés, sans Tour : il file avec son sac ; il perd son poste ; la liste des déserteurs garde son profil.
company.intendantId=b.id; company.intendantSince=state.day;
const items=b.items.length;
drop(b); dice=[0.999,0.999];
r=morning();
assert.deepEqual([r.fled.map(x=>x.mercenary.id),r.fled[0].spotted,r.fled[0].left,r.spotted],[[b.id],false,["steward"],[]]);
assert.equal(company.roster.includes(b),false);
assert.equal(company.intendantId,null);
const gone=company.deserters.at(-1);
assert.deepEqual([gone.id,gone.spotted,gone.letGo,gone.profile.items.length],[b.id,false,false,items]);
assert.equal(gone.profile.history.log.at(-1).kind,"desertion");
company.lieutenantIds=[];

// Repéré par la Tour : la scène attend ; impossible de passer au jour suivant.
company.camp.buildings={watchtower:{level:10,construction:null}};
drop(c); dice=[0.999,0];
r=morning();
assert.deepEqual([r.spotted.map(x=>x.id),r.fled],[[c.id],[]]);
assert.deepEqual(desertion.pending(state).map(x=>[x.id,x.attempted]),[[c.id,null]]);
const blocked=rules.canAdvanceDay(state);
assert.deepEqual([blocked.ok,blocked.desertion],[false,c.id]);
// Une tentative ratée (Intimider) : plus que le défier ou le laisser partir.
dice=[0.999];
assert.deepEqual([desertion.persuade(state,c.id,"intimidate").accepted,desertion.pendingOf(state,c.id).attempted],[false,"intimidate"]);
assert.equal(desertion.persuade(state,c.id,"convince").reason,"Vous avez déjà essayé de le retenir.");
// Le laisser partir : +10, il part avec son sac.
const beforeLetGo=total(c);
const letGo=desertion.letGo(state,c.id);
assert.deepEqual([letGo.ok,letGo.affinityDelta,letGo.spotted,letGo.letGo,company.roster.includes(c)],[true,10,true,true,false]);
assert.equal(company.deserters.at(-1).affinity,Math.min(100,beforeLetGo+10));
assert.equal(rules.canAdvanceDay(state).ok,true);

// Convaincu : il reste, +20, et 15 jours sans test.
drop(d); dice=[0.999,0];
morning();
const beforeStay=Number(d.affinityAcquired)||0;
dice=[0];
const stayed=desertion.persuade(state,d.id,"convince");
assert.deepEqual([stayed.accepted,stayed.affinityDelta,(Number(d.affinityAcquired)||0)-beforeStay,stayed.immuneUntil],[true,20,20,state.day+15]);
assert.deepEqual(desertion.pending(state),[]);
assert.equal(d.history.log.at(-1).kind,"desertion_stayed");
for(let i=0;i<15;i++){ drop(d); assert.ok(!morning().tests.some(t=>t.id===d.id),"immunisé"); }
drop(d); dice=[0];
assert.ok(morning().tests.some(t=>t.id===d.id),"15 jours plus tard, de nouveau");
// La chance de le retenir : dure (Intimidation, ou Charisme ÷ 2, et −60).
captain.skills.social.Intimidation=38; captain.stats.Charisme=54;
d.affinityAcquired=0; d.affinityAcquired=-20-total(d);
assert.equal(total(d),-20);
assert.deepEqual([Math.round(desertion.persuadeChance(state,d,"intimidate")),Math.round(desertion.persuadeChance(state,d,"convince"))],[23,18]);

// Le défier en combat singulier : il meurt ; mémorial, héritage de renommée, ses affaires à l'Intendance.
drop(e); dice=[0.999,0];
morning();
const stock=(company.stock||[]).length,owned=e.items.length;
const fallen=desertion.duel(state,e.id);
assert.deepEqual([fallen.ok,company.roster.includes(e),company.memorial.at(-1).id,company.memorial.at(-1).cause],[true,false,e.id,"duel"]);
assert.equal(fallen.heritage?.id,e.id,"il est mort dans un combat : son héritage");
assert.ok(company.renownHeritage.some(h=>h.id===e.id));
assert.deepEqual([(company.stock||[]).length-stock,e.items.length,Object.values(e.equipment?.slots||{}).filter(Boolean).length],[owned,0,0]);
assert.equal(e.history.log.at(-1).kind,"duel");

// Au cachot : il ne part pas ; il le fera le matin qui suit sa libération (plus de test entre-temps).
company.camp.buildings={dungeon:{level:1,construction:null}};
assert.equal(rules.dungeonRules.jail(state,f.id).ok,true);
dice=[0.999];
r=morning();
assert.deepEqual([r.jailed.map(x=>x.id),r.fled,f.loyalty.wantsToLeave],[[f.id],[],true]);
drop(f); dice=[0];
assert.ok(!morning().tests.some(t=>t.id===f.id),"il veut partir : plus de test");
rules.dungeonRules.release(state,f.id);
r=morning();
assert.deepEqual([r.fled.map(x=>x.id),f.loyalty.wantsToLeave],[[f.id],undefined]);

// En mission : pas de test.
const [g2]=company.roster.filter(m=>m===g);
state.expeditions=[{id:"x",memberIds:[g2.id],status:"outbound"}];
drop(g2); dice=[0.999];
assert.ok(!morning().tests.some(t=>t.id===g2.id));
state.expeditions=[];

// La journée : la désertion, après tout le reste ; rien sans les règles d'affinité.
assert.ok("desertion" in rules.advanceTime(state,1)[0]);
const bare=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference});
assert.equal(bare.desertionRules,null);

// Interface : le journal (l'intendant le signale ; sans lui, on l'apprend quand même), les choix, la scène bloquante.
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const MercenairesRecruitDialogue={fill:(text,vars,female)=>String(text||"").replace(/\{([^|}]*)\|([^}]*)\}/g,(_,m,w)=>female?w:m).replace(/\{(\w+)\}/g,(_,k)=>vars[k]??""),firstName:m=>m.name};
const lines=[];
const ui=new Function("game","campaignRules","renderAvatar","fmt","esc","MercenairesRecruitDialogue","tavernLog",
  fs.readFileSync(path.join(ROOT,"prototype-web","desertion-ui.js"),"utf8")+"\nreturn {logDesertion,desertionChoicesHtml,desertionNews};")(
  {campaign:state,referenceData:reference},()=>rules,()=>"",fmt,esc,MercenairesRecruitDialogue,(message,kind)=>lines.push([message,kind]));
const runaway={name:"Brak",sex:"M"};
company.intendantId=a.id;
ui.logDesertion({fled:[{mercenary:runaway}],spotted:[{mercenary:{name:"Zia",sex:"F"}}]});
company.intendantId=null;
ui.logDesertion({fled:[{mercenary:runaway}],spotted:[]});
assert.deepEqual(lines,[[`${a.name} : « Brak a filé cette nuit, avec son sac. »`,"bad"],["La Vigie a repéré Zia qui filait.","warn"],
  ["Brak a disparu cette nuit, avec son sac.","bad"]]);
// La notification du jour : des lignes urgentes.
const news=ui.desertionNews({fled:[{mercenary:runaway}],spotted:[{mercenary:{name:"Zia",sex:"F"}}]});
assert.deepEqual(news.map(n=>[n.tone,n.text,n.detail,n.faces[0].name]),[["alert","Brak a filé cette nuit","Avec son sac","Brak"],
  ["alert","La Vigie a repéré Zia","Décidez de son sort","Zia"]]);
company.intendantId=a.id;
assert.equal(ui.desertionNews({fled:[{mercenary:runaway}]})[0].detail,"Signalé par l’intendant");
company.intendantId=null;
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","day-news-ui.js"),"utf8"),/entries\.push\(\.\.\.desertionNews\(report\.desertion\)\)/);
const labels=html=>[...html.matchAll(/data-desertion="(\w+)"[^>]*>([^<]*)</g)].map(m=>[m[1],m[2]]);
assert.deepEqual(labels(ui.desertionChoicesHtml({id:9,name:"Zia",sex:"F"},{attempted:null})),
  [["intimidate","Intimider"],["convince","Convaincre"],["duel","La défier en combat singulier"],["let_go","La laisser partir"]]);
assert.deepEqual(labels(ui.desertionChoicesHtml(runaway,{attempted:"convince"})),[["duel","Le défier en combat singulier"],["let_go","Le laisser partir"]]);
assert.deepEqual(labels(ui.desertionChoicesHtml(runaway,null)),[["continue","Continuer"]]);
const desertionUi=fs.readFileSync(path.join(ROOT,"prototype-web","desertion-ui.js"),"utf8");
assert.match(desertionUi,/addEventListener\("cancel",event=>event\.preventDefault\(\)\)/,"on ne la ferme pas avec Échap");
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(index,/<dialog id="desertion-dialog" class="talk-dialog talk-dialog--recruit"/);
assert.ok(index.indexOf('<script src="/core/desertion.js">')>index.indexOf('<script src="/core/persuasion.js">')
  &&index.indexOf('<script src="/core/desertion.js">')<index.indexOf('<script src="/core/campaign.js">'));
assert.match(index,/<script src="desertion-ui\.js"><\/script>/);
const tavernUi=fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8");
assert.match(tavernUi,/logDesertion\(report\.desertion\)/);
assert.match(tavernUi,/if\(allowed\.desertion!=null\)\{ if\(typeof checkDesertions==="function"\) checkDesertions\(\); return; \}/);
assert.match(tavernUi,/statOf:\(m,name\)=>combatEngine\(\)\.statWithGear/);
const ui2=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
assert.match(ui2,/if \(typeof checkDesertions === "function"\) checkDesertions\(\);\n/);
assert.match(ui2,/\["desertion_stayed","desertion","desertion_let_go","duel"\]\.includes\(entry\.kind\)/);
const events=reference.characterSheetCopy.history.events;
assert.ok(["desertion_stayed","desertion","desertion_let_go","duel"].every(kind=>events[kind]));
const copy=reference.desertionDialogue.scene;
assert.ok(copy.spotted.length>=3&&copy.says.length>=3&&["intimidate","convince","duel","let_go"].every(k=>copy.captain[k].length>=3));
assert.ok(["intimidate","convince"].every(k=>copy.reply[k].accepted.length>=3&&copy.reply[k].refused.length>=3));

console.log("Désertion : test du matin (capitaine puis lieutenants), Tour de guet, scène (retenir, défier, laisser partir), cachot, déserteurs et mémorial — OK");
