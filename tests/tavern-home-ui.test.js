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

// Depuis le 2026-11-11 (Idan) : l'accueil de la taverne n'a plus de boutons ni de bulle ; ses zones cliquables
// (tavern-scene-ui.js) mènent aux salles (La Cantine, 2026-11-08 ; La Cave, 2026-11-10) et au tavernier. Depuis le
// 2026-11-14, le picto Taverne de la barre du bas mène juste à la taverne (« pas de menu déroulant »).
const home=html.slice(html.indexOf('<div id="tavern-home"'),html.indexOf('<section id="tavern-missions-view"'));
assert.ok(!/<button/.test(home),"plus de boutons sur l'accueil de la taverne");
assert.ok(!/tavern-talk-btn/.test(html+css+js),"plus de bulle sur le tavernier");
assert.match(html,/<button id="hud-tavern-btn" class="hud-nav" type="button" data-hud-scene="tavern" title="Taverne">/,"le picto de la barre");
assert.ok(!/hud-tavern-menu|setHudTavernMenu|chooseHudTavern/.test(html+js),"plus de menu déroulant");
// Une zone : la taverne, puis la salle (ou le dialogue du tavernier).
const pick=new Function("openCampScene","openTavernTalk","showTavernView",
  js.slice(js.indexOf("function openTavernPlace(key){"),js.indexOf("function initializeTavernUi(){"))+"return openTavernPlace;");
const calls=[];
const openPlace=pick(scene=>calls.push(["scene",scene]),()=>calls.push(["talk"]),view=>calls.push(["view",view]));
openPlace("cellar");
assert.deepEqual(calls,[["scene","tavern"],["view","cellar"]]);
calls.length=0;
openPlace("talk");
assert.deepEqual(calls,[["scene","tavern"],["talk"]]);
assert.ok(!/data-tavern-drink/.test(html),"la bière et la tournée passent dans le dialogue");

const talk=html.slice(html.indexOf('<dialog id="tavern-talk-dialog"'),html.indexOf('<dialog id="recruit-talk-dialog"'));
assert.match(talk,/<ol id="tavern-talk-options" class="talk-options"><\/ol>/,"réponses écrites par tavern-ui.js");
// Menu du tavernier (données) : bière, tournée, conseils (ouverts depuis le 2026-10-21), partir ; puis qui ? et ses deux
// questions (doc 14 §6 bis : son titre, son affinité), avec un retour à chaque étape.
const dialogueCopy=JSON.parse(fs.readFileSync(path.join(root,"data/reference/tavern-dialogue.json"),"utf8"));
const keeper=dialogueCopy.tavernkeeper;
assert.deepEqual(keeper.options,{beer:"Boire une bière (1 PO)",round:"Payer sa tournée !",advice:"Demander des conseils",leave:"Partir",back:"Retour"});
const {createRecruitDialogue}=require(path.join(root,"game-core/recruit-dialogue.js"));
const inga={id:7,name:"Inga Longueforge",sex:"femme"};
const menu=new Function("recruitDialogue","game","MercenairesRecruitDialogue","tavernCandidate",
  js.slice(js.indexOf("function tavernTalkOptions(t){"),js.indexOf("function tavernTalkLine(t){"))+"return tavernTalkOptions;")(
  ()=>createRecruitDialogue({reference:{tavernDialogue:dialogueCopy}}),
  {campaign:{tavern:{candidates:[{mercenary:inga}]}}},
  {firstName:m=>m.name.split(" ")[0]},
  id=>id===7?{mercenary:inga}:null);
const labels=view=>menu(view).map(o=>o.label);
assert.deepEqual(labels({view:"main"}),["Boire une bière (1 PO)","Payer sa tournée !","Demander des conseils","Partir"]);
assert.deepEqual(labels({view:"who"}),["Inga","Retour"]);
assert.deepEqual(labels({view:"what",candidateId:7}),["Qu’est-ce qu’on dit d’elle ?","Elle m’apprécierait, à ton avis ?","Retour"]);
assert.deepEqual(menu({view:"what",candidateId:7}).slice(0,2).map(o=>[o.key,o.arg]),[["ask","title"],["ask","affinity"]]);
assert.ok(!/askTavernAdvice|t\.view==="stats"/.test(js),"plus de conseils sur les caractéristiques (Idan, 2026-11-19)");

// Le dialogue avec un candidat (doc 14 §6 bis ; Idan, 2026-11-22 : « On va regrouper toutes les questions […] comme Puis-je
// en savoir plus sur vous ? (on aura donc 3 choix en menu 1) ») : le menu, ses questions sur lui (la magie : il liste ses
// écoles) ; chaque réponse remplit sa fiche et la question disparaît.
{
  const els=new Map();
  const $=id=>els.get(id)||(els.set(id,{innerHTML:"",textContent:"",scrollTop:0,scrollHeight:0,querySelector:()=>null,showModal(){},close(){},focus(){}}),els.get(id));
  const dialogue=createRecruitDialogue({reference:{tavernDialogue:dialogueCopy}});
  const merc={id:7,name:"Inga Longueforge",sex:"femme",stats:{Force:40},items:[{id:"a",name:"Gambison",category:"Légère"}],equipment:{slots:{armor:"a"}}};
  const candidate={mercenary:merc};
  const negotiation={salary:12,bonus:30,agreed:null};
  const game={referenceData:{},recruitDialogue:dialogue};
  const cards=[];
  const api=new Function("game","$","tavernCandidate","tavernRules","profileRules","companyTagRules","mercenaryHoverData","captainAffinity",
    "saveGame","renderMercenaryHoverCard","renderPicto","esc","fmt","MercenairesRecruitDialogue","requestAnimationFrame",
    js.slice(js.indexOf("function recruitDialogue(){"),js.indexOf("function submitRecruitOffer(){"))+"return {openRecruitTalk,recruitChoices,recruitTalkChoice};")(
    game,$,id=>id===7?candidate:null,()=>({negotiationState:()=>negotiation}),
    // Le titre suit sa Force : sa vantardise (×2 ici, le tirage de ses tags) se voit.
    ()=>({evaluate:c=>({force:c.stats.Force}),composeTitle:(c,r)=>({name:"Colosse "+r.force})}),
    ()=>({candidateFactor:()=>2}),
    ()=>({sets:[["Épée longue","Écu"],[]],schools:["Eau","Vie"]}),()=>({total:0}),
    ()=>{},(m,o)=>{ cards.push(o); return ""; },()=>"",x=>String(x??""),n=>String(n),
    {firstName:m=>m.name.split(" ")[0]},()=>{});
  api.openRecruitTalk(7);
  const t=game.recruitTalk,q=dialogueCopy.questions;
  const keys=()=>api.recruitChoices(t).map(c=>c.key);
  const lastSay=()=>t.lines.at(-1).text;
  assert.deepEqual(api.recruitChoices(t).map(c=>c.label),["Puis-je en savoir plus sur vous ?","Quelles sont vos prétentions salariales ?","Partir"],"trois choix");
  assert.deepEqual([...cards.at(-1).unknown].sort(),["affinity","armor","bonus","magic","mount","salary","set1","set2","tags","title"]);
  api.recruitTalkChoice("about");
  assert.deepEqual(api.recruitChoices(t).map(c=>c.label),["Comment vous appelle-t-on, dans le métier ?","Quelle arme de corps à corps maniez-vous ?",
    "Quelle arme de tir avez-vous ?","Quelle armure portez-vous ?","Connaissez-vous des sorts ?","Retour"]);
  api.recruitTalkChoice("title");
  assert.deepEqual(t.lines.slice(-2).map(l=>l.who),["you","merc"]);
  assert.equal(t.lines.at(-2).text,q.title);
  assert.match(lastSay(),/Colosse 80/,"son titre, sur sa Force vantée (40 × 2)");
  assert.equal(cards.at(-1).title,"Colosse 80");
  api.recruitTalkChoice("set1");
  assert.match(lastSay(),/l’épée longue et l’écu/i);
  api.recruitTalkChoice("set2");
  assert.ok(dialogueCopy.answers.set2_none.includes(lastSay()),"rien en set 2");
  api.recruitTalkChoice("back");
  assert.equal(t.mode,"choices");
  api.recruitTalkChoice("about");
  assert.deepEqual(keys(),["armor","magic","back"],"une question posée disparaît");
  api.recruitTalkChoice("armor");
  assert.match(lastSay(),/^Gambison\./);
  api.recruitTalkChoice("magic");
  assert.equal(t.lines.at(-2).text,"Connaissez-vous des sorts ?");
  assert.match(lastSay(),/des sorts d’Eau et de Vie\./,"il liste ses écoles");
  assert.equal(t.mode,"choices","plus rien à lui demander : retour au menu");
  assert.deepEqual(api.recruitChoices(t).map(c=>c.label),["Quelles sont vos prétentions salariales ?","Partir"]);
  assert.deepEqual([...cards.at(-1).unknown].sort(),["affinity","bonus","mount","salary","tags"]);
  api.recruitTalkChoice("salary");
  assert.equal(t.lines.at(-2).text,"Quelles sont vos prétentions salariales ?");
  assert.match(lastSay(),/12 PO par jour et 30 PO par mission/);
  assert.deepEqual(keys(),["negotiate","sign","leave"]);
  assert.deepEqual([cards.at(-1).salary,cards.at(-1).bonus,cards.at(-1).unknown.has("salary")],[12,30,false],"le salaire et la prime sur sa fiche");
  // Le tavernier a parlé : son titre passe devant (Idan, 2026-11-22 : « priorité au tavernier »). Rouvrir la fenêtre : la
  // fiche garde ce qu'on a appris.
  dialogue.known(candidate).keeperTitle="Chair à canon";
  api.openRecruitTalk(7);
  assert.deepEqual(api.recruitChoices(game.recruitTalk).map(c=>c.key),["negotiate","sign","leave"]);
  assert.equal(cards.at(-1).title,"Chair à canon");
}

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
console.log("Taverne : picto de la barre du bas, zones, dialogue du tavernier, bière et tournée — OK");
