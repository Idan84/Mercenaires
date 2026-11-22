"use strict";

// Styles de combat (Idan, 2026-11-02) :
// - « On ajoute combat à une main. Un petit bonus d'esquive en fonction de la carac » ; « Coefficient 0.2 » ; le pistolet
//   tenu seul compte ;
// - « On ajoute un bouton attaquer à 2 mains. Le joueur choisit à chaque tour s'il veut perdre de l'esquive et frapper fort
//   ou pas » ; « il faut virer la division du malus de vitesse » ;
// - Armes naturelles retirées des fiches de mercenaires (gardées aux créatures) ; Combat à mains nues désactivé.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createCombatEngine}=require("../game-core/combat-engine.js");
const {createEquipmentEffects}=require("../game-core/equipment-effects.js");
const {createGenerator}=require("../game-core/mercenary-generator.js");
const {createTavernRules}=require("../game-core/tavern.js");
const {createCampaignRules}=require("../game-core/campaign.js");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"prototype-web","reference-data.js"),"utf8");
const block=source.slice(source.indexOf("REFERENCE_FILES"),source.indexOf("};",source.indexOf("REFERENCE_FILES")));
const files=Object.fromEntries([...block.matchAll(/^\s*(\w+):\s*"([\w.-]+\.json)"/gm)].map(m=>[m[1],m[2]]));
const reference=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",f),"utf8"))]));
const constant=code=>reference.formulaConstants.rows.find(r=>r.code===code)?.valeur;
assert.equal(constant("combat.one_handed.dodge_factor"),0.2);
assert.equal(constant("progression.skill.one_handed_attack_xp"),40,"doublé après le bêta-test (Idan, 2026-11-07), puis à nouveau (2026-11-08)");

// Données : le nouveau style ; les deux compétences retirées des mercenaires.
const skills=reference.skills.rows;
const style=skills.find(r=>r.nom==="Combat à une main");
assert.deepEqual([style.domaine,style.niveau,style.type_de_valeur,style.valeur_maximale,style.mercenaire],["Martial","Catégorie","Progressive",100,true]);
assert.deepEqual(skills.filter(r=>r.mercenaire===false).map(r=>r.nom).sort(),["Armes naturelles","Combat à mains nues"]);

const engine=createCombatEngine(reference);
const fighter=(main,off=null,martial={},stats={})=>({character:{
  stats:{Esquive:40,Vitesse:50,Dextérité:50,Perception:50,Force:50,Chance:0,...stats},
  skills:{martial:{"Combat à une main":50,"Combat à deux mains":30,...martial}},
  items:[{id:"m",itemType:"weapon",name:main,tier:1},...(off?[{id:"o",itemType:"weapon",name:off,tier:1}]:[])],
  equipment:{slots:{weapon_set_1_main:"m",weapon_set_1_off:off?"o":null}}},activeSet:1,q:0,r:0});

// Une arme à une main tenue seule : Esquive + 0,2 × Combat à une main (50 → +10).
const sabre=fighter("Sabre");
assert.deepEqual([engine.fightsOneHanded(sabre),engine.oneHandDodge(sabre),engine.effectiveDodge(sabre)],[true,10,50]);
assert.equal(engine.effectiveDodge(fighter("Pistolet")),50,"le pistolet tenu seul compte (Idan : « oui »)");
for(const [main,off,why] of [["Sabre","Écu","avec un bouclier"],["Sabre","Dague","avec une seconde arme"],["Épée à deux mains",null,"arme à deux mains"],
  ["Fronde",null,"la fronde se tient à deux mains"],["Écu",null,"un bouclier seul n'est pas une arme"]]){
  const u=fighter(main,off);
  assert.deepEqual([engine.fightsOneHanded(u),engine.effectiveDodge(u)],[false,40],why);
}
sabre.prone=true;
assert.equal(engine.effectiveDodge(sabre),0,"Au Sol : l'Esquive reste à 0");
sabre.prone=false;

// Arme « Au choix » tenue seule : à une main par défaut ; « Attaquer à deux mains » l'empoigne.
const sword=fighter("Épée longue"),weapon=engine.weaponTemplate(engine.activeWeaponItem(sword));
assert.equal(weapon.prise,"Au choix");
assert.deepEqual([engine.canGripTwoHands(sword),engine.usesTwoHands(sword,weapon),engine.fightsOneHanded(sword),engine.effectiveDodge(sword)],[true,false,true,50]);
const oneHanded={speed:engine.heldItemSpeedPenalty(sword,engine.activeWeaponItem(sword)),power:engine.attackPower(sword,"melee"),
  damage:engine.physicalDamage(sword,fighter("Sabre"),"melee",0,{roll:"max",resistanceRoll:1}).damage};
sword.twoHandGrip=true;
assert.deepEqual([engine.usesTwoHands(sword,weapon),engine.fightsOneHanded(sword),engine.effectiveDodge(sword)],[true,false,40],"il perd l'esquive de la main libre");
assert.equal(engine.heldItemSpeedPenalty(sword,engine.activeWeaponItem(sword)),oneHanded.speed,"plus de malus de vitesse divisé par deux");
assert.ok(Math.abs(engine.attackPower(sword,"melee")-oneHanded.power-0.2*30)<1e-9,"Combat à deux mains compte pour blesser");
const twoHandedDamage=engine.physicalDamage(sword,fighter("Sabre"),"melee",0,{roll:"max",resistanceRoll:1}).damage;
assert.ok(twoHandedDamage/oneHanded.damage>1.4&&twoHandedDamage/oneHanded.damage<1.6,`dégâts × 1,5 : ${oneHanded.damage} → ${twoHandedDamage}`);
assert.equal(engine.canGripTwoHands(fighter("Épée longue","Écu")),false,"avec un bouclier, pas de deux mains");
assert.equal(engine.canGripTwoHands(fighter("Sabre")),false,"le sabre se tient à une main");

// L'attaque dit quel style elle a fait travailler (XP de Combat à une main ou à deux mains).
const miss=createCombatEngine(reference,{random:()=>0.5});
const target=fighter("Sabre");target.q=1;
const lone=fighter("Épée longue");
let r=miss.resolveAttack(lone,target,{mode:"melee",distance:1});
assert.deepEqual([r.ok,r.oneHanded,r.twoHanded],[true,true,false]);
lone.twoHandGrip=true;
r=miss.resolveAttack(lone,target,{mode:"melee",distance:1});
assert.deepEqual([r.oneHanded,r.twoHanded],[false,true]);

// IA : à deux mains quand Combat à deux mains vaut au moins Combat à une main (un ennemi sans Combat à une main : oui).
assert.equal(engine.prefersTwoHands(fighter("Épée longue")),false,"30 contre 50");
assert.equal(engine.prefersTwoHands(fighter("Épée longue",null,{"Combat à deux mains":60})),true);
assert.equal(engine.prefersTwoHands({character:{skills:{martial:{"Combat à deux mains":20}}}}),true,"ennemi d'archétype");

// Fiche : la ligne « Combat à une main » dans le détail de l'Esquive.
const {effects}=createEquipmentEffects({engine});
const dodge=effects(fighter("Sabre").character).Esquive;
assert.equal(dodge.value,50);
assert.deepEqual(dodge.lines.find(l=>l.reason==="style"),{label:"Combat à une main",delta:10,reason:"style"});

// Génération : le style est tiré ; ni Armes naturelles ni Combat à mains nues chez un mercenaire.
let seed=21;
const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
const generator=createGenerator(reference,{random,nameGenerator:(people,id)=>people+" "+id});
const captain=generator.createCaptain({id:1});
for(let id=2;id<40;id++){
  const m=generator.createMercenary({id,captain});
  assert.ok(Number.isFinite(m.skills.martial["Combat à une main"]),"Combat à une main tiré");
  assert.ok(!("Armes naturelles" in m.skills.martial)&&!("Combat à mains nues" in m.skills.martial));
}

// Ancienne partie : Combat à une main = la meilleure arme de mêlée à une main, sans tirage ; une seule fois.
const rules=createCampaignRules({generator,tavern:createTavernRules({random:()=>0.999,reference}),reference});
const state=rules.createCampaign({captain,squad:[generator.createMercenary({id:50,captain})]});
const veteran=state.company.roster[1];
delete veteran.skills.martial["Combat à une main"];
Object.assign(veteran.skills.martial,{"Sabre":44,"Dague":12,"Épée à deux mains":80,"Pistolet":90,"Épée longue":30});
assert.equal(rules.ensureOneHandedStyle(state),true);
assert.ok(veteran.skills.martial["Combat à une main"]>=44,"au moins le sabre (ni la grande épée ni le pistolet)");
assert.equal(rules.ensureOneHandedStyle(state),false,"rien à faire la seconde fois");
assert.match(fs.readFileSync(path.join(ROOT,"prototype-web","save-ui.js"),"utf8"),/campaignRules\(\)\.ensureOneHandedStyle\(game\.campaign\)/);

// Fiche : le style à la place des mains nues ; plus d'Armes naturelles.
const layout=reference.characterSheetCopy.skills_layout;
assert.deepEqual(layout.styles_de_combat,["Combat à une main","Combat à deux armes","Combat à deux mains","Boucliers"]);
assert.ok(!layout.corps_a_corps.includes("Armes naturelles"));

// Combat : le bouton, la prise remise à une main à chaque tour, l'IA, l'attaque du joueur.
const html=fs.readFileSync(path.join(ROOT,"prototype-web","index.html"),"utf8");
assert.match(html,/<button id="mission-attack-btn" class="secondary">Attaquer<\/button>\s*<button id="mission-two-hands-btn" class="secondary hidden" title="[^"]+">Attaquer à deux mains<\/button>/);
const mission=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
assert.match(mission,/unit\.secondMove=false;\s*\/\/[^\n]*\n\s*unit\.twoHandGrip=false;/,"à chaque tour, la main libre");
assert.match(mission,/if\(reset\) resetMissionActivation\(unit\);\s*\/\/[^\n]*\n\s*unit\.twoHandGrip=game\.mission\.engine\.prefersTwoHands\(unit\);/);
assert.match(mission,/if\(m\.twoHands&&mode==="melee"&&m\.engine\.canGripTwoHands\(a\)\)\{\s*a\.twoHandGrip=true;/);
assert.match(mission,/\$\("mission-two-hands-btn"\)\.addEventListener\("click",\(\)=>setMissionMode\("melee",\{twoHands:true\}\)\);/);

console.log("Styles de combat : une main (Esquive + 0,2), attaquer à deux mains, plus de malus ÷ 2, armes naturelles et mains nues retirées — OK");
