"use strict";

// Lieutenants, étape 2 (Idan, 2026-10-25 ; doc 11 §4) : combien, qui, promotion (salaire × (1 + Int/100), prime
// inchangée, négociation de la Taverne sur le salaire seul, plancher au salaire actuel, refus définitif −10, promu +10),
// aura (moitié de la formule du capitaine, sur ses stats ; sans cumul), encart, cadre, dialogue.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");
const {createLieutenantRules}=require("../game-core/lieutenants.js");
const {createStewardRules}=require("../game-core/steward.js");
const {createCombatEngine}=require("../game-core/combat-engine.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const files={
  peoples:"peoples.json",cultures:"cultures.json",socialOrigins:"social-origins.json",alignments:"alignments.json",
  ancestries:"ancestries.json",ancestryCompatibility:"ancestry-compatibility.json",
  cultureOriginCompatibility:"culture-origin-compatibility.json",ancestryLevels:"ancestry-levels.json",
  d6Scale:"d6-generation-scale.json",generationMatrix:"generation-matrix.json",skills:"skills.json",
  characteristics:"characteristics.json",formulaConstants:"formula-constants.json",weapons:"weapons.json",
  baseArmors:"base-armors.json",itemQualities:"item-qualities.json",equipmentSlots:"equipment-slots.json",
  startingEquipmentGeneration:"starting-equipment-generation.json",binaryAptitudeGrants:"binary-aptitude-grants.json",
  alignmentGeneration:"alignment-generation.json",dormitoryQuality:"dormitory-quality.json"
};
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,read(file)]));
let seed=9;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const tavern=createTavernRules({random:()=>0.999,reference});
const campaign=createCampaignRules({generator,tavern,reference});
const captain=generator.createCaptain({id:1});
const squad=Array.from({length:12},(_,i)=>generator.createMercenary({id:i+2,captain}));
const state=campaign.createCampaign({captain,squad});

// Dés pilotés : chaque jet D100 vaut rolls.shift() (ou 100 si la liste est vide).
let rolls=[];
const d100=()=>((rolls.length?rolls.shift():100)-0.5)/100;
const rules=createLieutenantRules({reference,tavern,random:d100,affinityOf:()=>0,quarters:s=>campaign.lieutenantQuarters(s)});

// Les constantes, telles qu'Idan les a données.
assert.deepEqual([rules.constants.perLieutenant,rules.constants.salaryIntelligence,rules.constants.promoted,rules.constants.refused],[10,1,10,-10]);
assert.equal(reference.formulaConstants.rows.find(r=>r.code==="lieutenant.aura.share").valeur,0.5);

// Combien : un quartier construit, et 10 mercenaires (sans le capitaine ni l'intendant) par lieutenant.
assert.equal(rules.countedMembers(state),12);
assert.equal(rules.blocker(state).kind,"quarters","pas de quartier : pas de lieutenant");
state.company.camp.lieutenantQuarters=2;
assert.equal(rules.blocker(state),null);
assert.equal(rules.openPosts(state),1,"12 mercenaires : un seul poste");
state.company.intendantId=squad[0].id;
state.company.roster.splice(state.company.roster.indexOf(squad[1]),1);
state.company.roster.splice(state.company.roster.indexOf(squad[2]),1);
assert.equal(rules.countedMembers(state),9,"l'intendant ne compte pas");
assert.deepEqual(rules.blocker(state),{kind:"members",needed:10,
  reason:"Il faut 10 mercenaires dans la compagnie pour un lieutenant (capitaine et intendant non compris)."});
state.company.roster.push(squad[1],squad[2]);

// Qui : ni le capitaine, ni l'intendant, ni un mercenaire en mission.
assert.deepEqual(rules.canPromote(state,captain),{ok:false,reason:"Le capitaine ne peut pas être lieutenant."});
assert.deepEqual(rules.canPromote(state,squad[0]),{ok:false,reason:"L’intendant ne peut pas être lieutenant."});
state.expeditions=[{id:"x",memberIds:[squad[3].id],status:"outbound"}];
assert.deepEqual(rules.canPromote(state,squad[3]),{ok:false,reason:"Il est en mission."});
state.expeditions=[];
assert.ok(rules.candidates(state).every(m=>m!==captain&&m!==squad[0]));

// Ce qu'il demande : salaire × (1 + Intelligence / 100) ; la prime ne bouge pas.
const m=squad[4];
m.stats.Intelligence=50;m.contract.dailySalary=40;m.contract.missionBonus=90;
assert.deepEqual(rules.demand(m),{salary:60,bonus:90,current:40});
m.stats.Intelligence=100;
assert.equal(rules.demand(m).salary,80,"à 100 d'Intelligence : le double");
m.stats.Intelligence=50;

// La négociation : plancher au salaire actuel ; accepter ses conditions = promotion assurée.
assert.equal(rules.startPromotion(state,m.id).talk.salary,60);
assert.deepEqual(rules.offer(state,m.id,39),{outcome:"invalid",reason:"below",floor:40});
const affinityBefore=Number(m.affinityAcquired)||0;
// Contre-proposition : refus (jet 100), il ne part pas (jet 100), il redescend sans passer sous l'offre.
rolls=[100,100];
const counter=rules.offer(state,m.id,45);
assert.equal(counter.outcome,"counter");
assert.ok(counter.counter>=45&&counter.counter<60,`contre-proposition ${counter.counter}`);
assert.deepEqual(rules.offer(state,m.id,44),{outcome:"invalid",reason:"refused",floor:45},"jamais sous l'offre refusée");
const accepted=rules.offer(state,m.id,counter.counter);
assert.equal(accepted.outcome,"accepted");
assert.equal(accepted.automatic,true,"ses conditions : accord d'office");
assert.deepEqual(state.company.lieutenantIds,[m.id]);
assert.equal(m.contract.dailySalary,counter.counter);
assert.equal(m.contract.missionBonus,90,"la prime de mission ne bouge pas");
assert.equal(m.affinityAcquired,affinityBefore+10,"promu : +10");
assert.equal(m.lieutenantTalk,undefined);
assert.equal(m.history.log.at(-1).kind,"lieutenant");
assert.deepEqual(rules.lieutenantsOf(state),[m]);
assert.equal(rules.isLieutenant(state,m),true);
assert.deepEqual(rules.canPromote(state,m),{ok:false,reason:"Il est déjà lieutenant."});
assert.equal(rules.blocker(state).kind,"members","deuxième lieutenant : il faut 20 mercenaires");

// Refus définitif : là où une recrue partirait (jet bas), il refuse pour de bon ; −10 d'affinité ; il reste.
for(let i=0;i<10;i++) state.company.roster.push(generator.createMercenary({id:100+i,captain}));
const n=squad[5];
n.stats.Intelligence=30;n.contract.dailySalary=50;
rules.startPromotion(state,n.id);
const before=Number(n.affinityAcquired)||0;
rolls=[100,1];
const refused=rules.offer(state,n.id,50);
assert.equal(refused.outcome,"refused");
assert.equal(n.lieutenantRefused,true);
assert.equal(n.affinityAcquired,before-10);
assert.ok(state.company.roster.includes(n),"il ne quitte pas la compagnie");
assert.deepEqual(rules.canPromote(state,n),{ok:false,reason:"Il a refusé de devenir lieutenant, pour de bon."});
// Accord sur un jet favorable, sous sa demande.
const o=squad[6];
o.stats.Intelligence=60;o.contract.dailySalary=50;
rules.startPromotion(state,o.id);
rolls=[1];
assert.equal(rules.offer(state,o.id,60).outcome,"accepted");
assert.equal(o.contract.dailySalary,60);
assert.equal(rules.lieutenantsOf(state).length,2);

// L'intendant : un lieutenant ne peut pas le devenir.
const steward=createStewardRules({reference});
assert.deepEqual(steward.canOffer(state,m),{ok:false,reason:"Un lieutenant ne peut pas être intendant."});

// Aura (combat-engine.js) : moitié de la formule du capitaine, sur ses stats ; sans cumul, la plus forte à portée.
const engine=createCombatEngine(reference);
const unit=(id,stats,extra)=>({id,team:"player",alive:true,offMap:false,q:0,r:0,character:{id,stats,items:[],equipment:{slots:{}}},activeSet:1,...extra});
const lt=unit("lt",{Courage:60,Charisme:40},{isLieutenant:true,q:3});
assert.equal(engine.lieutenantAuraBonus(lt),Math.round(0.5*(0.35*60+0.25*40)),"0,5 × (21 + 10) = 15,5 → 16");
const hero=unit("hero",{Courage:40,Charisme:40});
assert.deepEqual(engine.allyAura(hero,[hero,lt]),{bonus:16,from:"lieutenant",source:lt,whip:0});
const cap=unit("cap",{Courage:50,Charisme:50},{isCaptain:true,q:2});
assert.equal(engine.allyAura(hero,[hero,lt,cap]).bonus,30,"le capitaine (30) l'emporte : pas de cumul");
assert.equal(engine.allyAura(hero,[hero,lt,{...cap,q:20}]).from,"lieutenant","capitaine hors de portée");
assert.equal(engine.allyAura(lt,[lt]).bonus,0,"pas pour lui-même");
assert.equal(engine.allyAura(hero,[hero,{...lt,team:"enemy"}]).bonus,0,"pas pour l'ennemi");
assert.equal(engine.captainAura(hero,[hero,lt]),0,"l'aura du capitaine reste la sienne");
const courage=engine.resolveCourage(unit("foe",{},{team:"enemy"}),hero,{ok:true,wound:true,mode:"ranged"},{units:[hero,lt]});
assert.deepEqual([courage.aura,courage.auraFrom],[16,"lieutenant"]);
// XP de Charisme du lieutenant quand l'allié tient grâce à son aura (Idan, 2026-11-08) : le résultat nomme qui la donne.
assert.equal(courage.auraSource,lt);

// Étape 3 : demandes au lieutenant (courage, respect), une par jour ; résultat le lendemain matin ; 30 jours par type.
const C=rules.constants;
assert.deepEqual([C.cooldown,C.gainRatio,C.gainMin,C.gainMax],[30,0.2,1,10]);
const target=squad[7];
m.stats.Courage=70;target.stats.Courage=40;
m.stats.Charisme=60;m.stats.Intelligence=50;target.stats["Volonté"]=55;
assert.equal(rules.requestGain(state,m,target,"courage"),6,"20 % de 30 points");
assert.equal(Math.round(rules.requestChance(m,target)),50,"Δ = (60 + 50)/2 − 55 = 0 : 50 %");
target.stats["Volonté"]=25;
assert.equal(Math.round(rules.requestChance(m,target)),75,"Δ = +30 : 75 %");
assert.equal(rules.requestGain(state,m,{stats:{Courage:70}},"courage"),0,"pas au-dessus : échec forcé");
assert.equal(rules.requestGain(state,m,{stats:{Courage:10}},"courage"),10,"au plus +10");
assert.equal(rules.requestGain(state,m,{stats:{Courage:68}},"courage"),1,"au moins +1");
assert.deepEqual(rules.canRequest(state,m,"courage",captain),{ok:false,reason:"Pas le capitaine."});
assert.deepEqual(rules.canRequest(state,m,"courage",m),{ok:false,reason:"Pas lui-même."});
assert.deepEqual(rules.canRequest(state,squad[8],"courage",target),{ok:false,reason:"Il n’est pas lieutenant."});
assert.equal(rules.request(state,m.id,"courage",target.id).ok,true);
assert.deepEqual(m.lieutenantRequest,{type:"courage",targetId:target.id,day:state.day});
assert.equal(rules.canRequest(state,m).busy,true,"une demande par jour");
assert.equal(rules.request(state,o.id,"courage",target.id).wait,30,"30 jours avant de redemander le courage pour lui");
assert.equal(rules.request(state,o.id,"respect",target.id).ok,true,"le respect est un autre type");
// Le lendemain matin (campaign.js) : jet 1, réussite ; le respect échoue forcément (affinités égales, ici 0).
rolls=[1,100];
const affinityTarget=Number(target.affinityAcquired)||0;
const withLieutenants=createCampaignRules({generator,tavern,reference,lieutenants:rules});
const [morning]=withLieutenants.advanceTime(state,1);
assert.deepEqual(morning.lieutenants.map(r=>[r.lieutenant.id,r.type,r.success,r.gain,r.forced]),
  [[m.id,"courage",true,6,false],[o.id,"respect",false,0,true]]);
assert.equal(target.stats.Courage,46,"Courage +6, pour de bon");
assert.equal(Number(target.affinityAcquired)||0,affinityTarget,"échec : rien ne change");
assert.equal(m.lieutenantRequest,undefined);
assert.equal(target.history.log.at(-1).kind,"lieutenant_request");
assert.deepEqual(withLieutenants.advanceTime(state,1)[0].lieutenants,[],"rien le surlendemain");
assert.equal(rules.requestWait(state,target,"courage"),28);
state.day+=28;
assert.equal(rules.canRequest(state,m,"courage",target).ok,true,"au bout de 30 jours");
// Respect réussi : l'affinité acquise monte ; échec forcé quand le lieutenant n'est pas au-dessus.
const respectRules=createLieutenantRules({reference,tavern,random:d100,quarters:s=>campaign.lieutenantQuarters(s),
  affinityOf:(s,x)=>x===m?40:x===target?10:0});
rolls=[1];
respectRules.request(state,m.id,"respect",target.id);
state.day+=1;
const [respect]=respectRules.resolveRequests(state);
assert.deepEqual([respect.success,respect.gain],[true,6],"20 % de (40 − 10)");
assert.equal(Number(target.affinityAcquired)||0,affinityTarget+6);
target.stats.Courage=90;
rolls=[1];
respectRules.request(state,m.id,"courage",target.id);
state.day+=1;
const [forced]=respectRules.resolveRequests(state);
assert.deepEqual([forced.success,forced.forced],[false,true],"échec forcé, même sur un jet de 1");
assert.equal(target.stats.Courage,90);

// Interface : l'encart, le dialogue, le cadre, le combat, l'historique.
const index=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(index,/<div id="captain-summary"><\/div>\s*<section id="lieutenants-panel" class="lieutenants-panel" aria-label="Lieutenants"><\/section>/);
assert.match(index,/<dialog id="lieutenant-talk-dialog" class="talk-dialog talk-dialog--recruit"/);
assert.match(index,/<script src="\/core\/lieutenants\.js"><\/script>/);
assert.match(index,/<script src="lieutenant-ui\.js"><\/script>/);
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
assert.match(ui,/renderLieutenants\(\);/);
assert.match(ui,/class="roster-card \$\{captain\?"roster-captain":""\}\$\{lieutenant\?" roster-lieutenant":""\}"/);
assert.match(ui,/if\(entry\.kind==="lieutenant"\)/);
const mission=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
assert.match(mission,/isLieutenant:team==="player"&&lieutenantIds\.includes\(character\.id\),/);
assert.match(mission,/function missionAuraNote\(aura,from="captain",whip=0\)/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","styles.css"),"utf8"),/\.roster-lieutenant\{border-color:#e0b85f;/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8"),/lieutenantDialogue: "lieutenant-dialogue\.json"/);
const copy=read("lieutenant-dialogue.json");
for(const key of ["demand","accepted","counter","refused"]) assert.ok(copy.promote[key].length>=4,key);
assert.ok(read("character-sheet-copy.json").history.events.lieutenant.accord);
for(const key of ["greetings","busy","accepted"]) assert.ok(copy.talk[key].length>=2,key);
for(const key of ["courage_success","respect_success","failure"]) assert.ok(copy.report[key].length>=4,key);
assert.ok(copy.report.respect_success.every(t=>/vous respecte un peu plus/.test(t)),"le respect : seulement « il vous respecte un peu plus »");
assert.ok(copy.report.courage_success.every(t=>/Courage \+\{gain\}/.test(t)),"le courage : la valeur");
assert.ok(read("character-sheet-copy.json").history.events.lieutenant_request.courage);
assert.match(index,/<dialog id="lieutenant-report-dialog" class="talk-dialog talk-dialog--recruit"/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8"),/queueLieutenantReports\(report\.lieutenants\)/);
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","tavern-ui.js"),"utf8"),/lieutenants:\{resolveRequests:state=>/);
const lui=fs.readFileSync(path.join(ROOT,"prototype-web","lieutenant-ui.js"),"utf8");
assert.match(lui,/data-lieutenant-speak="\$\{esc\(m\.id\)\}"/);
assert.match(lui,/statOf:\(m,name\)=>combatEngine\(\)\.statWithGear/);

console.log("Lieutenants : combien, qui, promotion et négociation, refus définitif, intendant, aura sans cumul, demandes et rapport du matin, interface — OK");
