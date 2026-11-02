"use strict";
// Régression UI du parcours de création : préserver les identifiants de génération,
// tout en simplifiant l'affichage et en groupant les portraits selon leur sexe.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const js=fs.readFileSync(path.join(root,"prototype-web/intro-ui.js"),"utf8");
const css=fs.readFileSync(path.join(root,"prototype-web/styles.css"),"utf8");
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const avatars=[
  {id:"elfe-h",people:"Elfe",full:"h_full.webp",portrait:"h_portrait.webp",sex:"homme",tags:{}},
  {id:"elfe-f",people:"Elfe",full:"f_full.webp",portrait:"f_portrait.webp",sex:"femme",tags:{}},
  {id:"elfe-u",people:"Elfe",full:"u_full.webp",portrait:"u_portrait.webp",sex:"",tags:{}}
];
const ui=new Function("game","esc","mercenaryAvatarUrl","renderAvatar","MercenairesAvatars",js+"\nreturn {choiceLabel,renderProgress,renderAvatarChoice,renderChoiceStep,renderCompanyNameStep,avatarSexGroup,wizard,WIZARD_STEPS};")(
    {referenceData:{avatars:{rows:avatars}}},
    esc,
    (mercenary)=>"assets/"+mercenary.avatar.portrait,
    ()=>"<figure>Full portrait preview</figure>",
    require("../game-core/avatars.js")
  );
ui.wizard.choice={people:"Elfe",culture:"Elfes noirs",name:"Capitaine",avatar:"elfe-h",companyName:""};
assert.equal(ui.WIZARD_STEPS.length,9);
assert.equal((ui.renderProgress().match(/wizard-progress-item /g)||[]).length,9);
assert.match(css,/grid-template-columns:\s*repeat\(9,minmax\(0,1fr\)\)/);
assert.match(css,/\.wizard-progress-item b\s*\{\s*white-space:\s*nowrap/);
assert.equal(ui.choiceLabel("origin","Soldat / Guerrier / Combattant"),"Guerrier");
assert.equal(ui.choiceLabel("origin","Paysan / Ouvrier"),"Travailleur");
assert.equal(ui.choiceLabel("origin","Noble"),"Noble");
assert.equal(ui.wizard.choice.avatar,"elfe-h");
const choices=ui.renderChoiceStep({key:"origin",options:()=>["Paysan / Ouvrier","Soldat / Guerrier / Combattant"]});
assert.match(choices,/Travailleur/);
assert.match(choices,/Guerrier/);
assert.doesNotMatch(choices,/2 options/);
assert.match(choices,/data-wizard-choice="Paysan \/ Ouvrier"/);
// Portraits (Idan, 2026-10-25) : deux boutons ronds ♂ / ♀ en bascule ; sans sexe renseigné, dans les deux listes.
let portrait=ui.renderAvatarChoice();
assert.match(portrait,/<button type="button" class="avatar-sex-btn is-active" data-wizard-avatar-sex="men" aria-pressed="true" aria-label="Hommes" title="Hommes">♂<\/button>/);
assert.match(portrait,/<button type="button" class="avatar-sex-btn" data-wizard-avatar-sex="women" aria-pressed="false" aria-label="Femmes" title="Femmes">♀<\/button>/);
assert.deepEqual([...portrait.matchAll(/data-wizard-avatar="([^"]+)"/g)].map(m=>m[1]),["elfe-h","elfe-u"],"le portrait choisi est un homme : les hommes");
ui.wizard.avatarSex="women";
portrait=ui.renderAvatarChoice();
assert.match(portrait,/class="avatar-sex-btn is-active" data-wizard-avatar-sex="women"/);
assert.deepEqual([...portrait.matchAll(/data-wizard-avatar="([^"]+)"/g)].map(m=>m[1]),["elfe-f","elfe-u"]);
assert.doesNotMatch(portrait,/Autres portraits|<h4>/);
assert.doesNotMatch(portrait,/<span>elfe-h<\/span>/);
assert.doesNotMatch(portrait,/Votre capitaine/);
assert.doesNotMatch(portrait,/3 portraits/);
assert.match(js,/const sex=event\.target\.closest\("\[data-wizard-avatar-sex\]"\);\s*if\(sex\)\{wizard\.avatarSex=sex\.dataset\.wizardAvatarSex;renderWizard\(\);return;\}/);
assert.match(css,/\.avatar-sex-btn\{[^}]*border-radius:50%/);
assert.equal(ui.avatarSexGroup({sex:"femme"}),"women");
assert.equal(ui.avatarSexGroup({sex:"homme"}),"men");
assert.equal(ui.avatarSexGroup({sex:""}),"other");
const company=ui.renderCompanyNameStep();
assert.match(company,/Des salaires\. Des morts\./);
assert.doesNotMatch(company,/blason|couleurs viendront/i);
// Portrait après l'ascendance (Idan, 2026-10-29) : seuls les portraits de l'ascendance choisie ; sans ascendance, pas de
// portrait réservé à une ascendance. Même règle que pour les mercenaires (game-core/avatars.js).
assert.deepEqual(ui.WIZARD_STEPS.map(s=>s.key),["name","people","culture","origin","ascendance","avatar","alignment","companyName","recap"]);
{
  const Avatars=require("../game-core/avatars.js");
  const rows=[
    {id:"orc-sang-h",people:"Orc",full:"a.webp",portrait:"a.webp",sex:"homme",tags:{ascendance:["Sang d’humain"]}},
    {id:"orc-troll",people:"Orc",full:"b.webp",portrait:"b.webp",sex:"homme",tags:{ascendance:["Sang de troll"]},ascendanceOnly:true},
    {id:"orc",people:"Orc",full:"c.webp",portrait:"c.webp",sex:"homme",tags:{}}
  ];
  const w=new Function("game","esc","mercenaryAvatarUrl","renderAvatar","MercenairesAvatars",js+"\nreturn {captainAvatarOptions,setChoice,wizard};")(
    {referenceData:{avatars:{rows}}},esc,m=>"assets/"+m.avatar.portrait,()=>"",Avatars);
  // Au moins 3 choix par culture × ascendance × genre (Idan, 2026-11-01) : moins de 3 portraits de l'ascendance, on
  // complète avec ceux d'un capitaine sans ascendance, après ceux de l'ascendance.
  w.wizard.choice={people:"Orc",culture:"",ascendance:"Sang de troll",avatar:null};
  assert.deepEqual(w.captainAvatarOptions().map(a=>a.id),["orc-troll","orc-sang-h","orc"]);
  assert.deepEqual(w.captainAvatarOptions("femme").map(a=>a.id),[],"pas de portrait de femme : rien à compléter");
  w.wizard.choice.avatar="orc-troll";
  w.setChoice("ascendance","");
  assert.deepEqual(w.captainAvatarOptions().map(a=>a.id),["orc-sang-h","orc"],"sans ascendance : pas de portrait « Ascendance only »");
  assert.equal(w.wizard.choice.avatar,null,"un portrait devenu incompatible est retiré");
  // Trois portraits de l'ascendance pour ce genre : pas de complément.
  const trolls=[1,2,3].map(k=>({id:"troll-"+k,people:"Orc",full:"t.webp",portrait:"t.webp",sex:"homme",tags:{ascendance:["Sang de troll"]},ascendanceOnly:true}));
  const all=[...rows,...trolls,{id:"orc-f",people:"Orc",full:"f.webp",portrait:"f.webp",sex:"femme",tags:{culture:["Orcs noirs"]}},
    {id:"orc-f2",people:"Orc",full:"g.webp",portrait:"g.webp",sex:"femme",tags:{culture:["Orcs des villes"]}}];
  const choose=(ascendance,sex)=>Avatars.captainPortraits(all,{people:"Orc",culture:"Orcs noirs",ascendance,sex});
  const trollMen=choose("Sang de troll","homme");
  assert.deepEqual([trollMen.portraits.map(a=>a.id),trollMen.own,trollMen.added],[["orc-troll","troll-1","troll-2","troll-3"],4,0]);
  assert.deepEqual(choose("Sang de troll","femme").portraits.map(a=>a.id),["orc-f"],"complément de la même culture et du même genre");
  assert.equal(choose("Sang de troll","femme").added,1);
  // Contrôle du Lab : ascendance × genre, portraits de l'ascendance seulement (sans le complément).
  assert.deepEqual(Avatars.captainCoverage(all,{people:"Orc",culture:"Orcs noirs",ascendances:[null,"Sang de troll"]}),[
    {ascendance:null,sex:"homme",count:2,missing:1},{ascendance:null,sex:"femme",count:1,missing:2},
    {ascendance:"Sang de troll",sex:"homme",count:4,missing:0},{ascendance:"Sang de troll",sex:"femme",count:0,missing:3}]);
}
// Étape Portrait sur ordinateur (Idan, 2026-11-02 : « Pourquoi l'avatar plein pied n'est pas plus grand et pourquoi une
// scroll bar à droite ? ») : la liste remplit son panneau (plus de 55vh qui débordait) ; le portrait prend la hauteur.
const desktop=css.slice(css.indexOf("/* Étape Portrait sur ordinateur"));
assert.match(desktop,/@media \(min-width: 941px\)\{\s*\.wizard-layout:has\(\.captain-avatar-groups\)\{height:100%;grid-template-rows:minmax\(0,1fr\)\}/);
assert.match(desktop,/\.wizard-options-panel \.captain-avatar-groups\{flex:1;min-height:0;max-height:none\}/);
assert.match(desktop,/\.wizard-detail-panel:has\(\.avatar-frame--detail\) \.avatar-frame\{margin:0;width:auto;height:100%;max-height:100%;max-width:100%\}/);
console.log("Wizard UI: 9 milestones, compact origin labels, ♂/♀ portrait toggle, portrait after ascendance, clean copy — OK");
