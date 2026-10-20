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
const ui=new Function("game","esc","mercenaryAvatarUrl","renderAvatar",js+"\\nreturn {choiceLabel,renderProgress,renderAvatarChoice,renderChoiceStep,renderCompanyNameStep,avatarSexGroup,wizard,WIZARD_STEPS};")(
    {referenceData:{avatars:{rows:avatars}}},
    esc,
    (mercenary)=>"assets/"+mercenary.avatar.portrait,
    ()=>"<figure>Full portrait preview</figure>"
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
const portrait=ui.renderAvatarChoice();
assert.match(portrait,/Femmes/);
assert.match(portrait,/Hommes/);
assert.match(portrait,/Autres portraits/);
assert.equal((portrait.match(/data-wizard-avatar=/g)||[]).length,3);
assert.doesNotMatch(portrait,/<span>elfe-h<\/span>/);
assert.doesNotMatch(portrait,/Votre capitaine/);
assert.doesNotMatch(portrait,/3 portraits/);
assert.equal(ui.avatarSexGroup({sex:"femme"}),"women");
assert.equal(ui.avatarSexGroup({sex:"homme"}),"men");
assert.equal(ui.avatarSexGroup({sex:""}),"other");
const company=ui.renderCompanyNameStep();
assert.match(company,/Des salaires\. Des morts\./);
assert.doesNotMatch(company,/blason|couleurs viendront/i);
console.log("Wizard UI: 9 milestones, compact origin labels, portrait groups, clean copy — OK");
