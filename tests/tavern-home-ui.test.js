"use strict";

// Accueil de la Taverne (Idan, 2026-10-21, puis 2026-11-11 : le menu passe dans la barre du bas) ; le dialogue du
// tavernier, façon jeu de rôle ; bière et tournée débitent l'or et passent au journal.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"prototype-web/index.html"),"utf8");
const js=fs.readFileSync(path.join(root,"prototype-web/tavern-ui.js"),"utf8");
const css=fs.readFileSync(path.join(root,"prototype-web/styles.css"),"utf8");

// Depuis le 2026-11-11 (Idan) : l'accueil de la taverne n'a plus de boutons ni de bulle ; un bouton « Taverne » de la
// barre du bas ouvre un menu déroulant : les salles (La Cantine, 2026-11-08 ; La Cave, 2026-11-10) et le tavernier.
const home=html.slice(html.indexOf('<div id="tavern-home"'),html.indexOf('<section id="tavern-missions-view"'));
assert.ok(!/<button/.test(home),"plus de boutons sur l'accueil de la taverne");
assert.ok(!/tavern-talk-btn/.test(html+css+js),"plus de bulle sur le tavernier");
const bar=html.slice(html.indexOf('<div id="hud-tavern"'),html.indexOf("</ul>",html.indexOf('<div id="hud-tavern"')));
assert.match(bar,/<button id="hud-tavern-btn"[^>]*aria-expanded="false"[^>]*>.*Taverne/,"le bouton de la barre");
assert.deepEqual([...bar.matchAll(/data-hud-tavern="(\w+)">([^<]+)<\/button>/g)].map(m=>[m[1],m[2]]),
  [["missions","Trouver une mission"],["recruits","Recruter"],["canteen","La Cantine"],["cellar","La Cave"],["talk","Parler au tavernier"]]);
assert.match(bar,/<ul id="hud-tavern-menu"[^>]*hidden>/,"menu fermé au départ");
// Choisir une option : la taverne, puis la salle (ou le dialogue du tavernier) ; le menu se referme.
const pick=new Function("$","openCampScene","openTavernTalk","showTavernView",
  js.slice(js.indexOf("function setHudTavernMenu(open){"),js.indexOf("function initializeHudTavern(){"))+"return {setHudTavernMenu,chooseHudTavern};");
const calls=[];
const els={"hud-tavern-menu":{hidden:false},"hud-tavern-btn":{setAttribute:(k,v)=>calls.push([k,v])},"hud-tavern":{classList:{toggle:(c,on)=>calls.push([c,on])}}};
const ui=pick(id=>els[id],scene=>calls.push(["scene",scene]),()=>calls.push(["talk"]),view=>calls.push(["view",view]));
ui.chooseHudTavern("cellar");
assert.deepEqual(calls,[["aria-expanded","false"],["is-open",false],["scene","tavern"],["view","cellar"]]);
assert.equal(els["hud-tavern-menu"].hidden,true);
calls.length=0;
ui.chooseHudTavern("talk");
assert.deepEqual(calls.slice(2),[["scene","tavern"],["talk"]]);
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
console.log("Taverne : menu de la barre du bas, dialogue du tavernier, bière et tournée — OK");
