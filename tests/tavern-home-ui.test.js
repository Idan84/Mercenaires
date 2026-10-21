"use strict";

// Accueil de la Taverne (Idan, 2026-10-21) : « Trouver une mission » et « Recruter » à gauche, une bulle sur
// le tavernier ouvre un dialogue façon jeu de rôle ; bière et tournée débitent l'or et passent au journal.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"prototype-web/index.html"),"utf8");
const js=fs.readFileSync(path.join(root,"prototype-web/tavern-ui.js"),"utf8");
const css=fs.readFileSync(path.join(root,"prototype-web/styles.css"),"utf8");

const home=html.slice(html.indexOf('<div id="tavern-home"'),html.indexOf('<section id="tavern-missions-view"'));
assert.deepEqual([...home.matchAll(/data-tavern-view="(\w+)"><span>([^<]+)<\/span>/g)].map(m=>[m[1],m[2]]),
  [["missions","Trouver une mission"],["recruits","Recruter"]]);
assert.ok(!/data-tavern-drink/.test(html),"la bière et la tournée passent dans le dialogue");

const talk=html.slice(html.indexOf('<dialog id="tavern-talk-dialog"'),html.indexOf('<dialog id="recruit-talk-dialog"'));
assert.match(talk,/<ol id="tavern-talk-options" class="talk-options"><\/ol>/,"réponses écrites par tavern-ui.js");
// Menu du tavernier (données) : bière, tournée, conseils (ouverts depuis le 2026-10-21), partir ; puis qui ?
// quoi ? quelle caractéristique ? avec un retour à chaque étape.
const keeper=JSON.parse(fs.readFileSync(path.join(root,"data/reference/tavern-dialogue.json"),"utf8")).tavernkeeper;
assert.deepEqual(keeper.options,{beer:"Boire une bière (1 PO)",round:"Payer sa tournée !",advice:"Demander des conseils",leave:"Partir",back:"Retour"});
const menu=new Function("recruitDialogue","game","MercenairesRecruitDialogue",
  js.slice(js.indexOf("function adviceStats(group){"),js.indexOf("function tavernTalkLine(t){"))+"return tavernTalkOptions;")(
  ()=>({keeper}),
  {campaign:{tavern:{candidates:[{mercenary:{id:7,name:"Inga Longueforge"}}]}},referenceData:{characterSheetCopy:{stats:[{nom:"Force",groupe:"physique"},{nom:"Courage",groupe:"mental"}]}}},
  {firstName:m=>m.name.split(" ")[0]});
const labels=view=>menu(view).map(o=>o.label);
assert.deepEqual(labels({view:"main"}),["Boire une bière (1 PO)","Payer sa tournée !","Demander des conseils","Partir"]);
assert.deepEqual(labels({view:"who"}),["Inga","Retour"]);
assert.deepEqual(labels({view:"what"}),[...keeper.groups.map(g=>g.label),"Retour"]);
assert.deepEqual(labels({view:"stats",group:"physique"}),["Force","Retour"]);
assert.match(css,/\[data-tavern-view="home"\] \.tavern-talk-btn\{display:grid\}/,"bulle visible sur l'accueil seulement");

// Logique : bière 1 PO, tournée 1 PO par membre, refus sans assez d'or ; tout va au journal.
const extract=(start,end)=>js.slice(js.indexOf(start),js.indexOf(end));
const code=extract("function buyTavernDrink(kind){","function openTavernTalk(){");
const run=(campaign,captain)=>{
  const log=[];
  const game={campaign,captain};
  const api=new Function("game","tavernLog","saveGame","renderTavern",code+"return {buyTavernDrink,captainFirstName};")(
    game,(message,kind)=>log.push([message,kind]),()=>{},()=>{});
  return {api,log};
};
const campaign={company:{gold:20,captainId:1,roster:[{id:1,name:"Bob le Rouge"},{id:2},{id:3}]}};
const {api,log}=run(campaign);
api.buyTavernDrink("beer");
assert.equal(campaign.company.gold,19);
api.buyTavernDrink("round");
assert.equal(campaign.company.gold,16,"3 membres, 3 PO");
assert.deepEqual(log.map(x=>x[0]),["Une bière : 1 PO.","Tournée générale : 3 PO pour 3 membres."]);
campaign.company.gold=2;
api.buyTavernDrink("round");
assert.equal(campaign.company.gold,2);
assert.equal(log.at(-1)[0],"Pas assez d'or : 3 PO nécessaires.");
assert.equal(api.captainFirstName(),"Bob","prénom du capitaine dans « Salut [Prénom] ! »");
campaign.company.roster[0].firstName="Aldric";
assert.equal(api.captainFirstName(),"Aldric");
console.log("Taverne : accueil, dialogue du tavernier, bière et tournée — OK");
