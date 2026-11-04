"use strict";

// Politique sociale, à l'Intendance (Idan, 2026-11-04 : « Un mercenaire blessé touche 50 % de son salaire pendant les jours où
// il est blessé (c'est la nouvelle norme par défaut). Dans l'intendance, on a un curseur qu'on déplace librement de 0 à
// 100 %. […] On va faire la même chose pour chaque corvée, mais par défaut, c'est 100 %. Avec les corvées, on perd moins
// d'affinité quand on monte le salaire. Un curseur par corvée » ; « Parfait et oui à tout ») : le salaire des blessés et des
// corvées, leur affinité, les curseurs.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.socialPolicyCopy,"social-policy-copy.json","le jeu charge les textes");
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.deepEqual(["wounded.default_rate","wounded.max_rate","wounded.neutral_rate","wounded.affinity_divisor","chore.default_rate","chore.max_rate","rate_step"]
  .map(k=>constant("social."+k)),[50,100,50,25,100,200,5]);
assert.equal(reference.formulaConstants.row_count,reference.formulaConstants.rows.length);

let seed=59,dice=[];
const genRandom=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random:genRandom,nameGenerator:(people,id)=>people+" "+id});
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference,
  random:()=>dice.length?dice.shift():0.999});
const social=rules.socialPolicy;
const captain=generator.createCaptain({id:1});
const state=rules.createCampaign({captain,squad:[2,3,4,5,6].map(id=>generator.createMercenary({id,captain}))});
const company=state.company;
const [, a, b, c, d, e]=company.roster;
company.intendantId=null;
for(const [m,salary] of [[a,40],[b,30],[c,20],[d,10],[e,50]]) m.contract.dailySalary=salary;
const aff=m=>Number(m.affinityAcquired)||0;

// Par défaut : blessés 50 %, corvées 100 % ; les curseurs vont par pas de 5, dans leurs bornes.
assert.deepEqual([social.woundedRate(state),social.choreRate(state,"lumber"),social.choreRate(state,"mine"),social.choreRate(state,"palace")],[50,100,100,100]);
assert.deepEqual(social.setRate(state,"wounded",142),{ok:true,key:"wounded",rate:100});
assert.deepEqual(social.setRate(state,"lumber",233),{ok:true,key:"lumber",rate:200});
assert.deepEqual(social.setRate(state,"mine",-4),{ok:true,key:"mine",rate:0});
assert.deepEqual(social.setRate(state,"palace",72),{ok:true,key:"palace",rate:70});
assert.equal(social.setRate(state,"captain",50).ok,false);
delete company.socialPolicy;

// Le salaire du jour : un blessé, la moitié ; un fatigué, tout ; le capitaine n'a pas de contrat.
const full=rules.payroll(state);
a.recovery={kind:"wounded",daysLeft:5,sinceDay:state.day};
b.recovery={kind:"fatigued",daysLeft:5,sinceDay:state.day};
assert.equal(rules.payroll(state),full-20,"blessé : 50 % de 40 PO");
social.setRate(state,"wounded",0);
assert.equal(rules.payroll(state),full-40);
social.setRate(state,"wounded",100);
assert.equal(rules.payroll(state),full);

// Chaque jour de blessure : (taux − 50) ÷ 25 d'affinité ; le fatigué, rien.
for(const [rate,delta] of [[0,-2],[25,-1],[50,0],[75,1],[100,2]]){
  social.setRate(state,"wounded",rate);
  const before=[aff(a),aff(b)];
  state.day+=1;
  const paid=rules.paySalaries(state);
  assert.deepEqual([aff(a)-before[0],aff(b)-before[1]],[delta,0],`blessés à ${rate} %`);
  assert.deepEqual(paid.wounded.map(w=>[w.id,w.salary,w.affinityDelta]),[[a.id,40*rate/100,delta]]);
}
delete a.recovery; delete b.recovery;
delete company.socialPolicy;

// Les corvées : le salaire × le taux les jours de corvée ; la perte × (2 − taux ÷ 100), relance comprise.
company.camp.buildings={lumber_camp:{level:3,construction:null}};
dice=[0,0,0];
assert.equal(rules.lumberjacks.send(state,c.id).accepted,true);
assert.equal(rules.lumberjacks.send(state,d.id).accepted,true);
company.camp.lumberjacks.find(x=>x.id===d.id).approach="intimidate";
const before=rules.payroll(state);
state.day+=1;
social.setRate(state,"lumber",150);
assert.equal(rules.payroll(state),before+Math.round(0.5*20+0.5*10),"en corvée : 150 % du salaire");
for(const [rate,plain,intimidated] of [[0,-2,-4],[100,-1,-2],[150,-0.5,-1],[200,0,0]]){
  social.setRate(state,"lumber",rate);
  const r=rules.lumberjacks.morning(state);
  assert.deepEqual(r.workers.map(w=>[w.id,w.affinityDelta]),[[c.id,plain],[d.id,intimidated]],`corvée à ${rate} %`);
}
assert.ok(!Object.is(rules.lumberjacks.morning(state).workers[0].affinityDelta,-0),"à 200 % : 0, pas −0");

// La journée : le rapport des salaires garde les blessés.
a.recovery={kind:"wounded",daysLeft:3,sinceDay:state.day};
assert.deepEqual(rules.advanceTime(state,1)[0].salaries.wounded.map(w=>w.id),[a.id]);

// Interface : le menu de l'Intendance, le curseur des blessés, un curseur par corvée construite.
const fmt=value=>String(Math.round(Number(value)||0));
const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const ui=new Function("game","campaignRules","fmt","esc",
  fs.readFileSync(path.join(ROOT,"prototype-web","social-policy-ui.js"),"utf8")+"\nreturn {socialPolicyHtml};")(
  {campaign:state,referenceData:reference},()=>rules,fmt,esc);
delete company.socialPolicy;
let html=ui.socialPolicyHtml(state);
const sliders=h=>[...h.matchAll(/<span>([^<]*)<\/span>\s*<input type="range" min="0" max="(\d+)" step="5" value="(\d+)" data-social-rate="(\w+)">\s*<output data-social-output="\w+">(\d+) %<\/output>/g)]
  .map(m=>[m[4],m[1],Number(m[2]),Number(m[3]),Number(m[5])]);
assert.match(html,/<summary class="talk-offer-btn">Politique sociale<\/summary>/);
assert.deepEqual(sliders(html),[["wounded","Blessés",100,50,50],["lumber","Bûcherons",200,100,100]]);
company.camp.buildings={lumber_camp:{level:3,construction:null},miners_guild:{level:6,construction:null},pleasure_palace:{level:1,construction:null}};
social.setRate(state,"palace",130);
html=ui.socialPolicyHtml(state);
assert.deepEqual(sliders(html).map(s=>[s[0],s[1],s[3]]),[["wounded","Blessés",50],["lumber","Bûcherons",100],["mine","Mineurs",100],["palace","Palais des plaisirs",130]]);
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(index,/<div class="role-panels"><div id="social-policy-panel" class="steward-panel"><\/div>/);
assert.ok(index.indexOf('<script src="/core/social-policy.js">')>0&&index.indexOf('<script src="/core/social-policy.js">')<index.indexOf('<script src="/core/campaign.js">'));
assert.match(index,/<script src="social-policy-ui\.js"><\/script>/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","quartermaster-ui.js"),"utf8"),/if\(typeof renderSocialPolicyPanel==="function"\) renderSocialPolicyPanel\(\);/);

console.log("Politique sociale : blessés à 50 % (0 à 100 %, −2 à +2 par jour), un curseur par corvée (0 à 200 %, la perte × (2 − taux)) — OK");
