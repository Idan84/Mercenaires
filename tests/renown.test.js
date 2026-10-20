"use strict";

// Renommée de compagnie (09 §2 ; Idan, 2026-10-20, issue #111) : capitaine entier, membres vivants
// pondérés par rang (réputation / rang^1,5), héritage de 20 % de la part d'un mort au combat.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCampaignRules,serializeCampaign,restoreCampaign}=require("../game-core/campaign.js");

const ROOT=path.resolve(__dirname,"..");
const reference={formulaConstants:JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference","formula-constants.json"),"utf8"))};
const campaign=createCampaignRules({generator:null,tavern:null,reference});
const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-9,msg+" : "+a+" ≠ "+b);
const person=(id,reputation)=>({id,name:"M"+id,reputation});
const company=(captainRep,reps)=>({
  day:5,tavern:{candidates:[]},avatarsRetired:[],
  company:{name:"Test",gold:0,captainId:1,intendantId:null,roster:[person(1,captainRep),...reps.map((r,i)=>person(i+2,r))]}
});
const deaths=(...ids)=>({results:ids.map(id=>({id,dead:true})),captainDead:false});

// Capitaine seul : sa réputation entière, sans membre ni héritage.
let state=company(147,[]);
assert.deepEqual(campaign.companyRenown(state).parts,{captain:147,members:0,heritage:0});
assert.equal(campaign.companyRenown(state).total,147);

// Classement décroissant, quel que soit l'ordre du roster : 500, 300, 100.
state=company(147,[100,500,300]);
let renown=campaign.companyRenown(state);
assert.deepEqual(renown.ranking.map(x=>[x.reputation,x.rank]),[[500,1],[300,2],[100,3]]);
near(renown.parts.members,500+300/Math.pow(2,1.5)+100/Math.pow(3,1.5),"parts pondérées par rang");
near(renown.total,147+renown.parts.members,"total = capitaine + membres");

// Égalités : le plus ancien (ordre du roster) est mieux classé.
renown=campaign.companyRenown(company(147,[137,137,137]));
assert.deepEqual(renown.ranking.map(x=>x.id),[2,3,4]);

// Mort du premier mercenaire : héritage = 20 % de sa part avant retrait (500 → +100), puis reclassement.
state=company(147,[100,500,300]);
let report=campaign.applyMissionAftermath(state,deaths(3));
assert.equal(report.heritage.length,1);
assert.deepEqual({...report.heritage[0]},{id:3,name:"M3",day:5,reputation:500,rank:1,contribution:500,heritage:100});
renown=campaign.companyRenown(state);
assert.deepEqual(renown.ranking.map(x=>[x.reputation,x.rank]),[[300,1],[100,2]]);
near(renown.total,147+300+100/Math.pow(2,1.5)+100,"survivants reclassés + héritage fixe");
near(report.renown.before,147+500+300/Math.pow(2,1.5)+100/Math.pow(3,1.5),"renommée avant le bilan");
near(report.renown.after,renown.total,"renommée après le bilan");

// Bilan rejoué : pas de second héritage.
const replayed={results:[{id:3,dead:true}],captainDead:false};
state=company(147,[100,500,300]);
const first=campaign.applyMissionAftermath(state,replayed);
assert.equal(campaign.applyMissionAftermath(state,replayed),first,"même bilan : même rapport");
assert.equal(state.company.renownHeritage.length,1,"héritage compté une seule fois");

// Mort du deuxième : 20 % de 300 / 2^1,5.
state=company(147,[100,500,300]);
report=campaign.applyMissionAftermath(state,deaths(4));
near(report.heritage[0].heritage,0.2*300/Math.pow(2,1.5),"deuxième du classement");
assert.equal(report.heritage[0].rank,2);

// Plusieurs morts dans la même mission : classement du début de mission, l'ordre des résultats ne change rien.
const twoDeaths=order=>{ const s=company(147,[100,500,300]); campaign.applyMissionAftermath(s,deaths(...order)); return s.company.renownHeritage.map(h=>[h.id,h.heritage]).sort((a,b)=>a[0]-b[0]); };
assert.deepEqual(twoDeaths([3,4]),twoDeaths([4,3]));
const both=twoDeaths([4,3]);
near(both[0][1],0.2*500,"le premier garde son rang 1");
near(both[1][1],0.2*300/Math.pow(2,1.5),"le deuxième garde son rang 2");

// Héritage cumulé sur plusieurs missions, stable quand le roster évolue.
state=company(147,[100,500,300]);
campaign.applyMissionAftermath(state,deaths(3));            // 500 au rang 1 → +100
campaign.applyMissionAftermath(state,deaths(4));            // 300, désormais au rang 1 → +60
near(campaign.companyRenown(state).parts.heritage,160,"héritages cumulés");
state.company.roster.push(person(9,900));                   // une nouvelle vedette arrive
state.company.roster.find(m=>m.id===2).reputation=50;      // un survivant perd de la réputation
renown=campaign.companyRenown(state);
near(renown.parts.heritage,160,"l'héritage ne se repondère pas");
near(renown.total,147+900+50/Math.pow(2,1.5)+160,"seuls les vivants sont reclassés");

// Mort du capitaine : Game Over existant, pas d'héritage.
state=company(147,[100]);
report=campaign.applyMissionAftermath(state,{results:[{id:1,dead:true,isCaptain:true}],captainDead:true});
assert.equal(report.gameOver,true);
assert.equal(report.heritage.length,0);

// Roster vide hors capitaine, puis sauvegarde : l'héritage (identité, jour) survit au chargement.
state=company(147,[400]);
campaign.applyMissionAftermath(state,deaths(2));
assert.equal(campaign.companyRenown(state).parts.members,0);
const restored=restoreCampaign(serializeCampaign(state));
assert.equal(restored.ok,true);
assert.deepEqual(restored.state.company.renownHeritage,[{id:2,name:"M2",day:5,reputation:400,rank:1,contribution:400,heritage:80}]);
near(campaign.companyRenown(restored.state).total,147+80,"renommée après chargement");

// Ancienne sauvegarde sans héritage : 0.
const legacy=company(147,[137]);
assert.equal(campaign.companyRenown(legacy).parts.heritage,0);

console.log(JSON.stringify({ok:true},null,2));
