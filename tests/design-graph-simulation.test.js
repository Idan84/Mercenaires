"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=name=>JSON.parse(fs.readFileSync(path.join(root,"data/reference",name),"utf8"));
const core=require("../prototype-web/design/graph/simulation-core.js");
const reference={
  formulaConstants:read("formula-constants.json"),
  characteristics:read("characteristics.json"),
  peopleAffinity:read("people-affinity.json"),
  alignmentGeneration:read("alignment-generation.json"),
  weapons:read("weapons.json"),
  skills:read("skills.json"),
  baseArmors:read("base-armors.json"),
  itemQualities:read("item-qualities.json"),
  dormitoryQuality:read("dormitory-quality.json")
};
const s=core.createSimulator({
  reference,
  campaign:require("../game-core/campaign.js"),
  tavern:require("../game-core/tavern.js"),
  combat:require("../game-core/combat-engine.js"),
  progression:require("../game-core/progression.js"),
  affinity:require("../game-core/affinity.js")
});
assert.deepEqual(s.capabilities,{economy:true,combat:true,progression:true,affinity:true});

const economy={captain:200,first:300,second:120,heritage:50,reputation:100,
  salary:25,courage:50,pretensions:35,intelligence:60,will:70,offerPercent:75};
const ce=s.compare("economy",economy,{...economy,captain:300});
assert.equal(ce.after.metrics.renown-ce.before.metrics.renown,100);
assert.equal(economy.captain,200,"La simulation ne modifie pas le scénario original");
assert.equal(ce.after.metrics.bonus,ce.before.metrics.bonus);
assert.ok(s.compare("economy",economy,{...economy,courage:90}).after.metrics.bonus<
  s.run("economy",economy).metrics.bonus);
assert.ok(s.compare("economy",economy,{...economy,offerPercent:50}).after.metrics.pAccept<
  s.run("economy",economy).metrics.pAccept);
const reversed=s.compare("economy",economy,{...economy,second:800});
assert.ok(reversed.after.metrics.renown>reversed.before.metrics.renown,"Le classement doit être recalculé");
// Les six parts de la renommée (doc 09 §2 ; Idan, 2026-11-08 : le capitaine 1er, puis le meilleur mercenaire au rang 2) :
// capitaine, mercenaires, héritage, missions, dortoir, médecin.
{
  const base=s.run("economy",economy).metrics;
  assert.equal(base.renownCaptain,200);
  assert.ok(Math.abs(base.renownOthers-(300/Math.pow(2,1.5)+120/Math.pow(3,1.5)))<1e-9,"meilleur mercenaire au rang 2, le suivant au rang 3");
  assert.deepEqual([base.renownMissions,base.renownCamp,base.renownMedic],[0,0,0]);
  const full=s.run("economy",{...economy,missions:-24,dorm:3,medic:62}).metrics;
  assert.deepEqual([full.renownMissions,full.renownCamp,full.renownMedic],[-24,150,62]);
  assert.ok(Math.abs(full.renown-(base.renown-24+150+62))<1e-9,"les six parts s'additionnent");
  assert.equal(full.renownOthers,base.renownOthers,"le médecin fictif (réputation 0) ne change pas le classement");
}

const weapon=reference.weapons.rows.find(w=>w.puissance_tranchante_base>0&&w.nom&&!/Boucliers/.test(w.domaine||""));
assert.ok(weapon,"Le référentiel doit avoir une arme physique");
const fight={
  weapon:weapon.nom,armor:"",defArmor:"",force:50,dexterity:50,speed:50,luck:50,
  perception:50,endurance:50,dodge:50,intelligence:50,courage:50,will:50,
  mastery:35,defDodge:50,defEndurance:50,defPerception:50,defSpeed:50,distance:1,chargePower:0
};
const cf=s.run("combat",fight);
assert.ok(Number.isFinite(cf.metrics.hit));
assert.ok(Number.isFinite(cf.metrics.wound));
assert.ok(s.run("combat",{...fight,dexterity:80}).metrics.hit>=cf.metrics.hit);
assert.ok(s.run("combat",{...fight,force:80}).metrics.wound>=cf.metrics.wound);
assert.ok(s.run("combat",{...fight,defEndurance:80}).metrics.wound<=cf.metrics.wound);
assert.ok(s.run("combat",{...fight,luck:80}).metrics.crit>=cf.metrics.crit);
const absent=s.run("combat",{...fight,distance:999});
assert.equal(absent.metrics.hit,null,"Hors portée : ne jamais annoncer de probabilité de toucher");

const progress={
  baseStat:50,personalReputation:200,criticalSuccesses:0,criticalFailures:0,
  knockouts:0,chargeAttempts:0,hpHealed:0,fleeHexes:0,chains:0,woundsTaken:0,
  heavyArmorHexes:0,courageHeld:0,recoveries:0,intimidations:0,backstabWounds:0,
  worstChoices:0,physicalWounds:0,enemyReputation:100,enemyWounded:0,
  enemyKnockout:0,returnWounded:0
};
const cp=s.compare("progression",progress,{...progress,criticalSuccesses:2});
assert.equal(cp.after.metrics.reputationGain-cp.before.metrics.reputationGain,2);
assert.equal(cp.after.metrics["xp.Chance"]-cp.before.metrics["xp.Chance"],-40,"−20 par coup critique (doublé deux fois)");
assert.ok(s.run("progression",{...progress,knockouts:2}).metrics["xp.Charisme"]>0);
assert.ok(s.run("progression",{...progress,chargeAttempts:2}).metrics["xp.Courage"]>0);

const all=reference.alignmentGeneration.grid.flat(), peoples=reference.peopleAffinity.peoples;
const base={captainPeople:peoples[0],mercenaryPeople:peoples[0],captainAlignment:all[0],mercenaryAlignment:all[0],sameCulture:1,acquired:0};
const ca=s.run("affinity",base);
assert.ok(ca.metrics.affinityTotal<=100&&ca.metrics.affinityTotal>=-100);
assert.ok(s.run("affinity",{...base,sameCulture:0}).metrics.affinityTotal<=ca.metrics.affinityTotal);
assert.ok(s.run("affinity",{...base,mercenaryAlignment:all[8]}).metrics.affinityTotal<=ca.metrics.affinityTotal);
assert.ok(s.run("affinity",{...base,acquired:-200}).metrics.affinityTotal>=-100);
assert.equal(s.run("affinity",base).metrics.distance,0);
console.log("Design Graph simulation: all tests passed");


const saveImport=require("../prototype-web/design/graph/save-import.js");
const save={
  format:"mercenaires-save",version:1,
  state:{
    company:{
      name:"La Compagnie de test",captainId:10,
      roster:[
        {id:10,name:"Capitaine",reputation:180},
        {id:20,name:"Héros",reputation:300},
        {id:30,name:"Soldat",reputation:200},
        {id:40,name:"Archer",reputation:50,skills:{camp:{"Médecine":45}}}
      ],
      renownHeritage:[{heritage:15},{heritage:5}],
      missionRenown:9,camp:{dormitoryQuality:2},medicId:40
    },
    tavern:{candidates:[{mercenary:{id:99,reputation:80,salary:17,salaryPretension:35,stats:{Courage:55,Intelligence:60,"Volonté":70}}}]}
  }
};
const loaded=saveImport.parse(JSON.stringify(save));
assert.equal(loaded.rosterCount,4);
assert.equal(loaded.economy.companySnapshot.roster.length,4);
assert.equal(loaded.economy.heritage,20);
assert.equal(loaded.economy.salary,17);
assert.deepEqual([loaded.economy.missions,loaded.economy.dorm,loaded.economy.medic,loaded.economy.companySnapshot.medicId],[9,2,45,40]);
const expectedCompany=require("../game-core/campaign.js").createCampaignRules({generator:{},tavern:{},reference})
  .companyRenown(save.state);
const importedCompany=s.run("economy",loaded.economy);
assert.ok(Math.abs(importedCompany.metrics.renown-expectedCompany.total)<1e-8);
assert.deepEqual([importedCompany.metrics.renownMissions,importedCompany.metrics.renownCamp,importedCompany.metrics.renownMedic],
  [expectedCompany.parts.missions,expectedCompany.parts.camp,expectedCompany.parts.medic]);
assert.deepEqual([expectedCompany.parts.missions,expectedCompany.parts.camp,expectedCompany.parts.medic],[9,100,45]);
const modified=s.compare("economy",loaded.economy,{...loaded.economy,first:500});
assert.ok(modified.after.metrics.renown>modified.before.metrics.renown);
assert.equal(save.state.company.roster[1].reputation,300,"Aucune mutation de la sauvegarde source");
assert.throws(()=>saveImport.parse("{bad json"));
assert.throws(()=>saveImport.parse({format:"unrelated",state:save.state}));
assert.throws(()=>saveImport.parse({state:{company:{captainId:999,roster:save.state.company.roster}}}));
console.log("Design Graph save import: all tests passed");
