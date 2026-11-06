"use strict";

// Renégociation salariale (Idan, 2026-11-04 : « Quand un mercenaire gagne une étoile de réputation, il fait un test (entre
// salaire perçu et salaire théorique). En fonction de son intelligence, il vient demander un meilleur salaire au
// capitaine… On rentre dans une phase de négociation. Avec gain ou perte d'affinité » ; « oui » ; « parfait ») : le test du
// matin, la demande (son salaire théorique), la négociation (Accepter, Proposer, Refuser ; rupture et relance), l'affinité.
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
assert.equal(files.salaryReviewDialogue,"salary-review-dialogue.json","le jeu charge les textes");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual(["chance.gap_weight","chance.intelligence_median","chance.intelligence_weight","chance.offset","chance.scale","chance.min",
  "chance.max","affinity.granted","affinity.refused","retry.max","concession_weight"].map(k=>constant("salary_review."+k)),[100,50,0.5,-15,10,5,95,5,-10,95,50]);
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);

let seed=53,dice=[];
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const affinity=createAffinityRules({reference});
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id,affinity});
// Le salaire théorique : la formule du recrutement (09 §4), inchangée.
{
  const cap=generator.createCaptain({id:1});
  for(let id=2;id<40;id++){
    const m=generator.createMercenary({id,captain:cap});
    assert.equal(m.salary,generator.salaryDemand(m,affinity.affinity(cap,m).total),"même formule qu'au recrutement");
  }
}
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,affinity,
  random:()=>dice.length?dice.shift():0.999});
const review=rules.salaryReviewRules;
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6].map(id=>generator.createMercenary({id,captain}))});
const company=state.company;
const [, a, b, c, d]=company.roster;
const aff=m=>Number(m.affinityAcquired)||0;
const salary=m=>m.contract.dailySalary;
const morning=()=>{ state.day+=1; return review.morning(state); };
// Une étoile de plus : la réputation au seuil du niveau suivant.
const STARS=reference.reputationStars.rows;
const nextStar=m=>{ const next=STARS.find(r=>r.niveau===review.starLevel(m.reputation)+1); m.reputation=Number(next.reputation_min); };
assert.deepEqual([92,93,113,137,1600].map(x=>review.starLevel(x)),[1,2,3,4,15]);

// Le premier matin note les étoiles de chacun, sans test ; ensuite, seulement une étoile de plus.
assert.deepEqual(morning().tests,[]);
assert.equal(captain.salaryStars,undefined,"le capitaine n'a pas de contrat");
assert.ok([a,b,c,d].every(m=>Number.isFinite(m.salaryStars)));
assert.deepEqual(morning().tests,[]);

// La chance : 100 / (1 + e^(−Δ/10)), Δ = 100 × écart + (Intelligence − 50) / 2 − 15, de 5 à 95 % ; assez payé : rien.
a.stats.Intelligence=53;
a.contract.dailySalary=30; // bien en dessous de ce qu'il vaut : une étoile de plus suffit à le faire réclamer
nextStar(a);
const gap=review.gap(state,a);
assert.ok(gap>0,"une étoile de plus : il se trouve sous-payé");
const expected=Math.max(5,Math.min(95,100/(1+Math.exp(-(100*gap+(53-50)/2-15)/10))));
assert.equal(review.requestChance(state,a),expected);
assert.equal(review.theoretical(state,a),generator.salaryDemand(a,affinity.memberAffinity(captain,a).total));
b.contract.dailySalary=5000;
nextStar(b);
assert.equal(review.requestChance(state,b),0,"assez payé");
dice=[0];
let r=morning();
assert.deepEqual(r.tests.map(t=>[t.id,t.asks]),[[a.id,true],[b.id,false]]);
assert.deepEqual(r.requests.map(x=>[x.id,x.demand,x.current]),[[a.id,review.theoretical(state,a),salary(a)]]);
assert.equal(review.pending(state).length,1);
assert.deepEqual(morning().tests,[],"pas d'étoile de plus, pas de test");
// Une demande attend : impossible de passer au jour suivant.
const blocked=rules.canAdvanceDay(state);
assert.deepEqual([blocked.ok,blocked.salaryReview],[false,a.id]);

// Accepter : il obtient tout ce qu'il demande, +5 ; la prime ne bouge pas.
const bonus=a.contract.missionBonus,demand=review.pendingOf(state,a.id).demand,before=aff(a);
const granted=review.accept(state,a.id);
assert.deepEqual([granted.ok,salary(a),aff(a)-before,a.contract.missionBonus,review.pending(state).length],[true,demand,5,bonus,0]);
assert.deepEqual(a.history.log.at(-1),{...a.history.log.at(-1),kind:"salary_raise",from:granted.from,to:demand});
assert.equal(rules.canAdvanceDay(state).ok,true);

// Au cachot, en mission : pas de test ; il viendra le premier matin où il est au camp.
company.camp.buildings={dungeon:{level:1,construction:null}};
rules.dungeonRules.jail(state,c.id);
const seenC=c.salaryStars;
nextStar(c);
assert.ok(!morning().tests.some(t=>t.id===c.id));
assert.equal(c.salaryStars,seenC);
rules.dungeonRules.release(state,c.id);
dice=[0.999];
assert.ok(morning().tests.some(t=>t.id===c.id&&!t.asks),"sorti du cachot, il fait son test");
state.expeditions=[{id:"x",memberIds:[d.id],status:"outbound"}];
nextStar(d);
assert.ok(!morning().tests.some(t=>t.id===d.id));
state.expeditions=[];

// Refuser : il garde son salaire, −10.
const ask=m=>{ nextStar(m); m.contract.dailySalary=Math.max(1,Math.round(review.theoretical(state,m)/2)); dice=[0]; morning(); return review.pendingOf(state,m.id); };
let entry=ask(d);
let keep=salary(d),was=aff(d);
const refused=review.refuse(state,d.id);
assert.deepEqual([refused.ok,salary(d),aff(d)-was,d.history.log.at(-1).kind],[true,keep,-10,"salary_refused"]);

// Proposer : jamais moins que son salaire ; sinon comme à la Taverne : il accepte (0), contre-propose ou rompt.
entry=ask(d);
keep=salary(d);
assert.deepEqual(review.offer(state,d.id,keep-1),{outcome:"invalid",reason:"below",floor:keep});
dice=[0.999,0.999,0.5];
let o=review.offer(state,d.id,keep+2);
assert.equal(o.outcome,"counter");
assert.ok(o.counter>keep+2&&o.counter<=entry.demand);
assert.deepEqual(review.offer(state,d.id,keep+1),{outcome:"invalid",reason:"refused",floor:keep+2},"pas moins que l'offre refusée");
was=aff(d);
dice=[0];
o=review.offer(state,d.id,keep+3);
assert.deepEqual([o.outcome,salary(d),aff(d)-was],["accepted",keep+3,0],"d'accord plus bas : rien");
// La concession se compte sur l'augmentation qu'on lui refuse (« Oui ») : il demande 55, il touche 47, résistance 40 :
// aucune augmentation, 5 % ; la moitié, 49 % ; les trois quarts, 74 %.
{
  const m=generator.createMercenary({id:90,captain});
  Object.assign(m,{salaryPretension:30,contract:{dailySalary:47,missionBonus:70}});
  Object.assign(m.stats,{Intelligence:50,"Volonté":50});
  const resistance=createTavernRules({random:()=>0.999,reference}).negotiationResistance(m,affinity.memberAffinity(captain,m).total);
  m.affinityAcquired=4*(resistance-40)+(Number(m.affinityAcquired)||0);
  company.roster.push(m);
  const pAt=offer=>{
    company.salaryReviews=[{id:m.id,day:state.day,demand:55,current:47,salary:55,refused:null,rounds:0,broken:null}];
    dice=[0.999,0.999,0.5];
    return Math.round(review.offer(state,m.id,offer).pAccept);
  };
  assert.deepEqual([pAt(47),pAt(51),pAt(53)],[5,49,74]);
  company.salaryReviews=[];
  company.roster.splice(company.roster.indexOf(m),1);
}
// Proposer sa demande, ou plus : accepté, +5.
entry=ask(d);
was=aff(d);
o=review.offer(state,d.id,entry.demand+3);
assert.deepEqual([o.outcome,o.automatic,salary(d),aff(d)-was],["accepted",true,entry.demand+3,5]);

// Il rompt : la relance ; ratée en convainquant : −5 ; réussie en intimidant : la dernière offre, 0 ; laisser tomber : −10.
const breakOff=m=>{ const e=ask(m); dice=[0.999,0]; const res=review.offer(state,m.id,e.current); assert.equal(res.outcome,"broken"); return e; };
entry=breakOff(d);
assert.equal(review.accept(state,d.id).reason,"La négociation est rompue.");
keep=salary(d); was=aff(d);
captain.stats.Charisme=54; captain.skills.social.Intimidation=38;
assert.equal(review.retryChance(state,d.id,"convince"),Math.min(95,entry.broken.pAccept+27));
dice=[0.999];
o=review.retry(state,d.id,"convince");
assert.deepEqual([o.accepted,salary(d),aff(d)-was],[false,keep,-5]);
entry=breakOff(d);
was=aff(d);
dice=[0];
o=review.retry(state,d.id,"intimidate");
assert.deepEqual([o.accepted,salary(d),aff(d)-was],[true,entry.broken.offer,0]);
breakOff(d);
was=aff(d);
o=review.giveUp(state,d.id);
assert.deepEqual([o.ok,aff(d)-was],[true,-10]);
dice=[0.999];
entry=breakOff(d);
was=aff(d);
o=review.retry(state,d.id,"intimidate");
assert.deepEqual([o.accepted,aff(d)-was],[false,-20],"intimidé, la perte × 2");

// La journée : la renégociation, après la désertion ; rien sans les règles d'affinité.
assert.ok("salaryReview" in rules.advanceTime(state,1)[0]);
assert.equal(createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference}).salaryReviewRules,null);

// Interface : la notification du jour, les choix, la scène bloquante.
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const MercenairesRecruitDialogue={fill:(text,vars,female)=>String(text||"").replace(/\{([^|}]*)\|([^}]*)\}/g,(_,m,w)=>female?w:m).replace(/\{(\w+)\}/g,(_,k)=>vars[k]??""),firstName:m=>m.name};
const ui=new Function("game","campaignRules","renderAvatar","fmt","esc","MercenairesRecruitDialogue",
  fs.readFileSync(path.join(ROOT,"prototype-web","salary-review-ui.js"),"utf8")+"\nreturn {salaryReviewNews,salaryChoicesHtml};")(
  {campaign:state,referenceData:reference},()=>rules,()=>"",fmt,esc,MercenairesRecruitDialogue);
const zia={id:9,name:"Zia",sex:"F"};
assert.deepEqual(ui.salaryReviewNews({requests:[{mercenary:zia,demand:64}]}).map(n=>[n.tone,n.icon,n.text,n.detail]),
  [["alert","gold","Zia veut vous parler de son salaire","Elle demande 64 PO par jour"]]);
const labels=html=>[...html.matchAll(/data-salary-talk="(\w+)"[^>]*>([^<]*)</g)].map(m=>[m[1],m[2]]);
const open={current:40,salary:64,demand:64};
assert.deepEqual(labels(ui.salaryChoicesHtml(zia,open,"choices")),[["accept","Accepter : 64 PO par jour"],["negotiate","Négocier"],["refuse","Refuser"]]);
assert.deepEqual(labels(ui.salaryChoicesHtml(zia,open,"broken")),[["intimidate","Intimider"],["convince","Convaincre"],["give_up","Laisser tomber"]]);
assert.deepEqual(labels(ui.salaryChoicesHtml(zia,null,"ended")),[["continue","Continuer"]]);
assert.match(ui.salaryChoicesHtml(zia,open,"negotiate"),/<form id="salary-offer" class="talk-offer">[\s\S]*<input id="salary-offer-salary" type="number" min="40" value="64">/);
const salaryUi=fs.readFileSync(path.join(ROOT,"prototype-web","salary-review-ui.js"),"utf8");
assert.match(salaryUi,/addEventListener\("cancel",event=>event\.preventDefault\(\)\)/,"on ne la ferme pas avec Échap");
assert.match(salaryUi,/desertionRules\?\.pending\(game\.campaign\)\.length\) return;/,"les déserteurs d'abord");
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(index,/<dialog id="salary-dialog" class="talk-dialog talk-dialog--recruit"/);
assert.ok(index.indexOf('<script src="/core/salary-review.js">')>index.indexOf('<script src="/core/persuasion.js">')
  &&index.indexOf('<script src="/core/salary-review.js">')<index.indexOf('<script src="/core/campaign.js">'));
assert.ok(index.indexOf('<script src="salary-review-ui.js">')>index.indexOf('<script src="desertion-ui.js">'));
const tavernUi=fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8");
assert.match(tavernUi,/if\(allowed\.salaryReview!=null\)\{ if\(typeof checkSalaryReviews==="function"\) checkSalaryReviews\(\); return; \}/);
const ui2=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
assert.match(ui2,/checkDesertions\(\);\n[^\n]*\n  if \(typeof checkSalaryReviews === "function"\) checkSalaryReviews\(\);\n\}/);
assert.match(ui2,/entry\.kind==="salary_raise"/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","day-news-ui.js"),"utf8"),/entries\.push\(\.\.\.salaryReviewNews\(report\.salaryReview\)\)/);
const events=reference.characterSheetCopy.history.events;
assert.ok(events.salary_raise&&events.salary_refused);
const scene=reference.salaryReviewDialogue.scene;
assert.ok(scene.demand.length>=3&&scene.you.refuse.length>=3&&scene.merc.counter.length>=3&&scene.merc.broken.length>=3);

console.log("Renégociation salariale : une étoile de plus, le test (écart et Intelligence), la demande, la négociation, la relance, l'affinité — OK");
