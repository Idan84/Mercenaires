"use strict";

// Cruxor Limortel, l'ancien intendant (Idan, 2026-11-12) : « un vieux qui était intendant avant le nouveau capitaine,
// qui veut juste partir à la retraite… Il a 10 d'intendance et il est là par défaut » ; il fait tout ce que fait un
// intendant ; les mercenaires l'apprécient comme le capitaine (« B ») ; il ne demande à partir que quand on lui parle,
// en fin de phrase ; il part pour de bon quand un mercenaire le remplace ; ni salaire, ni place.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const ROOT=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(ROOT,file),"utf8");
const source=read("prototype-web/reference-data.js");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
assert.equal(files.oldSteward,"old-steward.json","Cruxor est chargé avec les autres données");
const reference=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,JSON.parse(read("data/reference/"+file))]));
const R=file=>require(path.join(ROOT,"game-core",file));

// Les données.
const D=reference.oldSteward;
assert.equal(D.nom,"Cruxor Limortel");
assert.equal(D.intendance,30,"30 d'Intendance (Idan, 2026-11-22)");
assert.ok(D.talk.greetings.length>=6&&D.talk.endings.length>=12,"de quoi varier");
assert.ok(D.talk.stay.length>=3&&D.talk.farewell.length>=2);
assert.equal(D.talk.options.stay,"Vous comptez rester encore longtemps ?");

let seed=11;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=R("mercenary-generator.js").createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const affinity=R("affinity.js").createAffinityRules({reference});
const {createOldSteward,ID}=R("old-steward.js");
const old=createOldSteward({reference});
const steward=R("steward.js").createStewardRules({reference,random:()=>0});

const captain=generator.createCaptain({id:1});
const roster=[captain,...[2,3,4].map(id=>generator.createMercenary({id,captain}))];
const state={day:3,company:{captainId:1,intendantId:null,roster,oldSteward:old.start(1),camp:{buildings:{}},gold:1000}};

// Là par défaut : l'intendant, sans être un mercenaire.
assert.equal(old.present(state),true);
const cruxor=steward.personOf(state);
assert.deepEqual([cruxor.id,cruxor.name,cruxor.npc,cruxor.skills.camp.Intendance],[ID,"Cruxor Limortel",true,30]);
assert.equal(steward.stewardOf(state),null,"aucun mercenaire n'est intendant");
assert.ok(!roster.some(m=>m.id===ID),"il n'est pas dans la compagnie : ni salaire, ni place au dortoir");

// Apprécié comme le capitaine (acquis compris).
const m=roster[1];
m.affinityAcquired=12;
assert.equal(old.feeling(state,cruxor,m,affinity),Number(affinity.memberAffinity(captain,m).total));

// Il estime les candidats de la Taverne, avec son Intendance (30 : erreur jusqu'à 14 %).
const candidate={};
const estimate=steward.estimate(state,candidate,"Force",100);
assert.ok(estimate.ok&&estimate.steward.id===ID);
assert.ok(Math.abs(estimate.maxError-0.14)<1e-9);

// Il appuie les échanges d'équipement : 0,2 × 30 + 0,25 × l'affinité du mercenaire pour le capitaine.
const deals=R("equipment-deals.js").createEquipmentDeals({reference,affinityRules:affinity});
const help=deals.stewardHelp(state,m);
assert.equal(help.steward.id,ID);
assert.ok(Math.abs(help.bonus-(0.2*30+0.25*Number(affinity.memberAffinity(captain,m).total)))<1e-9);

// Remplacé : il part pour de bon.
const result=steward.offer(state,m.id);
assert.deepEqual([result.accepted,result.oldRetired,state.company.intendantId],[true,true,m.id]);
assert.equal(state.company.oldSteward.retiredDay,3);
assert.equal(steward.personOf(state),m,"le nouvel intendant");
state.day=9;
const back=steward.recall(state);
assert.equal(back.accepted,true);
assert.equal(steward.personOf(state),null,"le nouvel intendant revenu sur le terrain : plus d'intendant, Cruxor ne revient pas");
assert.equal(old.present(state),false);

// Une nouvelle partie commence avec lui.
const campaign=read("game-core/campaign.js");
assert.match(campaign,/oldSteward:\{since:1,retiredDay:null\}/);

// L'écran : sa carte et « Nommer un intendant » à l'Intendance ; il glisse sa retraite en fin de phrase ; « Vous comptez
// rester encore longtemps ? » ; ses adieux quand un mercenaire accepte.
const ui=read("prototype-web/steward-ui.js"),html=read("prototype-web/index.html");
assert.ok(html.indexOf('src="/core/old-steward.js"')>0&&html.indexOf('src="/core/old-steward.js"')<html.indexOf('src="/core/steward.js"'));
assert.match(ui,/if\(steward&&isOldSteward\(steward\)\)[\s\S]{0,700}\$\{appoint\(picks\(\)\)\}/,"sa carte, et de quoi le remplacer");
assert.match(ui,/variantPhrase\(old\.greetings[\s\S]{0,120}variantPhrase\(old\.endings/,"sa retraite en fin de phrase");
assert.match(ui,/old\?\["evaluate","stay","leave"\]/);
assert.match(ui,/result\.oldRetired\?oldStewardFarewell\(m\):""/);
console.log("Cruxor Limortel : intendant par défaut, apprécié comme le capitaine, part quand on le remplace — OK");
