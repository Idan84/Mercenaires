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
// La boîte de dialogue de la charte (Idan, 2026-11-26 : « On fait une fenêtre ? » ; « Parfait ») : seule, à gauche ;
// la conversation sur le parchemin, les réponses en dessous (écrites par tavern-ui.js) ; « The Black Anvil » gardé.
assert.match(talk,/<dialog id="tavern-talk-dialog" class="talk-dialog talk-dialog--fiche talk-dialog--keeper"/);
assert.match(talk,/<div class="recruit-talk-box keeper-talk-box conv">[\s\S]*<p class="eyebrow">The Black Anvil<\/p>[\s\S]*<div class="conv-page"><div id="tavern-talk-log" class="talk-log" aria-live="polite"><\/div><\/div>\s*<div id="tavern-talk-choices"><\/div>/);
assert.match(talk,/<button type="button" class="conv-close" data-talk="leave"/,"la croix ferme");
assert.match(css,/\.talk-dialog--keeper::backdrop\{background:rgba\(0,0,0,\.35\);backdrop-filter:none/,"le tavernier reste visible");
assert.match(css,/\.talk-dialog--keeper>\.keeper-talk-box\{left:calc\(var\(--talk-marge\) - 10px\);right:auto;width:900px/,"à gauche");
assert.match(css,/\.talk-mini-keeper\{[^}]*url\("\/media\/video\/Img_Tavern\.jpg"\)/,"son portrait d'avant");
// La conversation : sa réplique d'accueil sous « The Black Anvil » ; la bière en récit (le message du journal) ; une
// question en bulle « Vous », puis sa réponse.
{
  const els={},el=id=>els[id]||(els[id]={innerHTML:"",scrollTop:0,scrollHeight:0,showModal(){this.open=true;},close(){this.open=false;}});
  const lines=[];
  let cards=0;
  const conv=new Function("game","$","esc","renderTalkLines","talkCaptain","tavernTalkOptions","tavernTalkLine","buyTavernDrink","askTavernAbout","usurerTavernChoice","requestAnimationFrame","showKeeperCard",
    js.slice(js.indexOf("const KEEPER_NAME="),js.indexOf("// Sa réponse (doc 14 §7)"))+"return {openTavernTalk,tavernTalk};");
  const g={};
  const api=conv(g,el,x=>String(x),(ls)=>{ lines.splice(0,lines.length,...ls); return ""; },()=>({name:"Cap"}),
    t=>t.view==="what"?[{key:"ask",arg:"title",label:"Qu’est-ce qu’on dit d’elle ?"},{key:"back",label:"Retour"}]:t.view==="who"?[{key:"who",arg:7,label:"Inga"},{key:"back",label:"Retour"}]:[{key:"beer",label:"Boire une bière (1 PO)"},{key:"advice",label:"Demander des conseils"},{key:"leave",label:"Partir"}],
    t=>t.view==="who"?"Qui donc ?":t.view==="what"?"Que veux-tu savoir ?":"Salut !",
    ()=>"Une bière : 1 PO.",kind=>{ g.tavernTalk.line="On l’appelle la Tueuse."; },null,()=>{},()=>{ cards++; });
  api.openTavernTalk();
  assert.equal(cards,1,"sa fiche (le faux easter egg) est posée à chaque conversation");
  assert.deepEqual(lines.map(l=>[l.who,l.text]),[["note","The Black Anvil"],["merc","Salut !"]]);
  assert.equal(lines[1].name,"Le tavernier");
  api.tavernTalk("beer");
  assert.deepEqual(lines.at(-1),{who:"note",text:"Une bière : 1 PO."},"la bière, en récit");
  api.tavernTalk("advice");
  assert.deepEqual(lines.at(-1),{who:"merc",name:"Le tavernier",text:"Qui donc ?"});
  api.tavernTalk("who","7");
  api.tavernTalk("ask","title");
  assert.deepEqual(lines.slice(-2).map(l=>[l.who,l.text]),[["you","Qu’est-ce qu’on dit d’elle ?"],["merc","On l’appelle la Tueuse."]],"la question en bulle, puis sa réponse");
  const before=lines.length;
  api.tavernTalk("back");
  assert.equal(lines.length,before,"Retour : on change de choix, sans rien dire");
  api.tavernTalk("leave");
  assert.equal(els["tavern-talk-dialog"].open,false);
}
// Sa fiche, le faux easter egg (Idan, 2026-11-26 : « une fiche au survol du tavernier quand on va lui parler. Par défaut,
// elle est repliée » ; « une image au hasard du tavernier et un texte qui correspond » ; « Nom par un titre de la photo, le
// titre par un sous-titre » ; « un long texte de 3 ou 4 paragraphes, esprit Monty Python »).
{
  assert.match(talk,/<div id="tavern-talk-card" class="recruit-fiche"><\/div>\s*<div class="recruit-talk-box keeper-talk-box conv">/,"la fiche sous la boîte");
  assert.match(talk,/<button type="button" class="conv-fold" aria-expanded="false" aria-label="Déplier la fiche"/,"repliée par défaut, la languette la déplie");
  assert.match(css,/\.talk-dialog--keeper\.has-card\.is-folded>\.keeper-talk-box\{left:calc\(var\(--talk-marge\) \+ var\(--talk-depasse\) - 10px\)\}/,"repliée : la fiche dépasse");
  assert.match(css,/\.talk-dialog--keeper\.has-card>\.keeper-talk-box\{left:calc\(var\(--talk-marge\) \+ 860px - var\(--talk-mord\) - 10px\)/,"dépliée : la boîte à sa droite");
  assert.match(css,/\.talk-dialog--keeper:not\(\.has-card\)>\.recruit-fiche,\.talk-dialog--keeper:not\(\.has-card\) \.conv-fold\{display:none\}/,"sans situation écrite : la boîte seule");
  // Le tirage : au hasard, parmi les situations écrites seulement (un titre et un texte).
  const pick=new Function("game",js.slice(js.indexOf("function keeperScenes("),js.indexOf("function showKeeperCard("))+"return {keeperScenes,pickKeeperScene};")({referenceData:{}});
  const rows=[{code:"a",image:"a.webp",titre:"A",texte:["x"]},{code:"b",image:"b.webp",titre:"",texte:[]},{code:"c",image:"c.webp",titre:"C",texte:["y"]}];
  assert.deepEqual(pick.keeperScenes(rows).map(r=>r.code),["a","c"]);
  assert.equal(pick.pickKeeperScene(pick.keeperScenes(rows),()=>0).code,"a");
  assert.equal(pick.pickKeeperScene(pick.keeperScenes(rows),()=>.99).code,"c");
  assert.equal(pick.pickKeeperScene([],()=>0),null,"rien d'écrit : pas de fiche");
  // Elle est repliée à chaque ouverture ; la languette, ce qui dépasse ou Espace la déplient.
  const show=js.slice(js.indexOf("function showKeeperCard("),js.indexOf("const KEEPER_NAME="));
  assert.match(show,/setTalkFolded\(dialog,true\)/);
  assert.match(js,/talk\.classList\.contains\("is-folded"\)&&event\.target\.closest\("#tavern-talk-card"\)/);
  assert.match(js,/else setTalkFolded\(talk,!talk\.classList\.contains\("is-folded"\)\)/,"Espace aussi");
  // Les données : les 20 images d'Idan, chacune présente ; les situations écrites ont un titre, un sous-titre et 3 ou 4
  // paragraphes.
  const scenes=JSON.parse(fs.readFileSync(path.join(root,"data/reference/tavern-keeper-scenes.json"),"utf8"));
  assert.equal(scenes.rows.length,20);
  assert.equal(scenes.row_count,20);
  for(const row of scenes.rows){
    assert.ok(fs.existsSync(path.join(root,"prototype-web",row.image)),row.image);
    if(row.titre||row.texte.length){
      assert.ok(row.titre&&row.sous_titre,`${row.code} : titre et sous-titre`);
      assert.ok(row.texte.length>=3&&row.texte.length<=4,`${row.code} : 3 ou 4 paragraphes`);
    }
  }
  assert.ok(scenes.rows.some(row=>row.titre),"au moins une situation écrite");
  // La fiche : le portrait en pied, le titre de la photo à la place du nom, le sous-titre à la place du titre, les
  // paragraphes dans la page (espaces insécables avant les deux-points).
  const hover=fs.readFileSync(path.join(root,"prototype-web/hover-card-ui.js"),"utf8");
  const render=new Function("esc","hoverCultureFrame","hoverKitFrame",hover.slice(hover.indexOf("function keeperTypo("),hover.indexOf("// Le nom et le titre dans le cartouche"))+"return renderKeeperCard;")(
    x=>String(x),()=>({key:"cites-libres",kit:null,vars:""}),()=>"");
  const card=render({image:"assets/tavernier/scenes/homard.webp",titre:"Étude du homard",sous_titre:"ou la juste température",texte:["Un : deux.","Trois."]});
  assert.match(card,/<article class="hover-card hover-card--keeper"/);
  assert.match(card,/<img src="assets\/tavernier\/scenes\/homard\.webp"/);
  assert.match(card,/<h3>Étude du homard<\/h3><p class="hc-title">[\s\S]*<span>ou la juste température<\/span>/);
  assert.match(card,/<div class="hc-page hc-keeper"><p>Un\u00a0: deux\.<\/p><p>Trois\.<\/p><\/div>/);
}
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
assert.deepEqual(labels({view:"what",candidateId:7}),["Qu’est-ce qu’on dit d’elle ?","Elle est douée pour quoi ?","Elle m’apprécierait, à ton avis ?","Retour"]);
assert.deepEqual(menu({view:"what",candidateId:7}).slice(0,3).map(o=>[o.key,o.arg]),[["ask","title"],["ask","tags"],["ask","affinity"]]);
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
  assert.deepEqual(api.recruitChoices(t).map(c=>c.label),["Et dans le métier, on vous appelle comment ?","Quels sont vos points forts ?","Quelle arme de corps à corps maniez-vous ?",
    "Quelle arme de tir avez-vous ?","Quelle armure portez-vous ?","Connaissez-vous des sorts ?","Retour"]);
  api.recruitTalkChoice("title");
  assert.deepEqual(t.lines.slice(-2).map(l=>l.who),["you","merc"]);
  assert.equal(t.lines.at(-2).text,q.title);
  assert.match(lastSay(),/Colosse 80/,"son titre, sur sa Force vantée (40 × 2)");
  assert.equal(cards.at(-1).title,"Colosse 80");
  // Ses points forts, tels qu'il les annonce (sans les règles des tags ici : il préfère garder la surprise).
  api.recruitTalkChoice("tags");
  assert.equal(t.lines.at(-2).text,"Quels sont vos points forts ?");
  assert.ok(dialogueCopy.answers.tags_none.includes(lastSay()));
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
  assert.deepEqual([...cards.at(-1).unknown].sort(),["affinity","bonus","mount","salary"],"ses tags sont connus (même aucun)");
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

// Un seul tag annoncé devient son titre (Idan, 2026-11-24 : « S'il a un seul tag, son titre devient le tag » ; « oui,
// candidats aussi ») ; plusieurs : le titre calculé.
{
  const dialogue=createRecruitDialogue({reference:{tavernDialogue:dialogueCopy}});
  const merc={id:7,name:"Inga Longueforge",sex:"femme",stats:{Force:40},items:[],equipment:{slots:{}}};
  const candidate={mercenary:merc};
  const game={referenceData:{},recruitDialogue:dialogue};
  let annonce=[{nom:"Veinard "}];
  const tagRules={candidateFactor:()=>2,candidateTags:(cd,ctx)=>{ assert.equal(cd,candidate); assert.equal(ctx.ok,true); return {affiches:annonce}; },
    titleTag:res=>res.affiches.length===1?res.affiches[0]:null,
    stewardCandidateTags:(cd,ctx)=>{ assert.equal(cd,candidate); assert.equal(ctx.steward.id,"cruxor"); return {affiches:[{nom:"Roc"}]}; }};
  const ctx={ok:true,steward:{id:"cruxor",name:"Cruxor Limortel"}}, cards=[];
  const api=new Function("game","$","tavernCandidate","tavernRules","profileRules","companyTagRules","companyTagContext","mercenaryHoverData",
    "captainAffinity","saveGame","renderMercenaryHoverCard","renderPicto","esc","fmt","MercenairesRecruitDialogue","requestAnimationFrame",
    js.slice(js.indexOf("function recruitDialogue(){"),js.indexOf("function submitRecruitOffer(){"))+"return {openRecruitTalk,recruitChoices,recruitTalkChoice};")(
    game,()=>({innerHTML:"",textContent:"",scrollTop:0,scrollHeight:0,querySelector:()=>null,showModal(){},close(){},focus(){}}),
    id=>id===7?candidate:null,()=>({negotiationState:()=>({salary:12,bonus:30,agreed:null})}),
    ()=>({evaluate:c=>({force:c.stats.Force}),composeTitle:(c,r)=>({name:"Colosse "+r.force})}),()=>tagRules,()=>ctx,
    ()=>({sets:[[],[]],schools:[]}),()=>({total:0}),()=>{},(m,o)=>{ cards.push(o); return ""; },()=>"",x=>String(x??""),n=>String(n),{firstName:m=>m.name.split(" ")[0]},()=>{});
  api.openRecruitTalk(7);
  api.recruitTalkChoice("about"); api.recruitTalkChoice("title");
  assert.equal(dialogue.known(candidate).title,"Veinard","un seul tag annoncé : son titre");
  annonce=[{nom:"Veinard"},{nom:"Roc"}];
  // Plusieurs tags : le titre composé de ses tags (Idan, 2026-11-24 : « Construis la nouvelle structure multi tags »).
  tagRules.tagTitle=res=>({name:res.affiches.length===2?"Trompe-la-mort":"?"});
  delete dialogue.known(candidate).asked.title;
  api.recruitTalkChoice("title");
  assert.equal(dialogue.known(candidate).title,"Trompe-la-mort","plusieurs tags : le titre composé");
  // Sans titre composé (anciennes règles) : le titre calculé, sur sa Force vantée.
  delete tagRules.tagTitle;
  delete dialogue.known(candidate).asked.title;
  api.recruitTalkChoice("title");
  assert.equal(dialogue.known(candidate).title,"Colosse 80","plusieurs tags : le titre calculé, sur sa Force vantée");
  // Ses tags sur sa fiche (Idan, 2026-11-24 : « tes suggestions sont parfaites ») : ce qu'il annonce, puis l'avis de
  // l'intendant (une option du dialogue : « branche-le comme une option de dialogue pour l'instant »), qui passe devant.
  const t=game.recruitTalk, lastSay=()=>t.lines.at(-1);
  assert.equal(cards.at(-1).unknown.has("tags"),true,"on ne sait rien de ses tags");
  api.recruitTalkChoice("tags");
  assert.ok(dialogueCopy.answers.tags.map(x=>x.replace("{tags}","Veinard et Roc")).includes(lastSay().text));
  assert.deepEqual([cards.at(-1).unknown.has("tags"),cards.at(-1).knownTags,cards.at(-1).tagSource],[false,["Veinard","Roc"],"D’après elle"]);
  api.recruitTalkChoice("back");
  assert.deepEqual(api.recruitChoices(t).find(c=>c.key==="steward"),{key:"steward",label:"Demander l’avis de l’intendant"});
  api.recruitTalkChoice("steward");
  assert.deepEqual(t.lines.at(-2),{who:"you",text:"Cruxor, qu’en pensez-vous ?"});
  assert.equal(lastSay().name,"Cruxor","l'intendant répond");
  assert.ok(dialogueCopy.steward.answers.map(x=>x.replace("{Tags}","Roc")).includes(lastSay().text));
  assert.deepEqual([cards.at(-1).knownTags,cards.at(-1).tagSource],[["Roc"],"D’après l’intendant"]);
  assert.equal(api.recruitChoices(t).some(c=>c.key==="steward"),false,"une fois demandé, l'option disparaît");
  assert.match(js,/esc\(line\.name\|\|first\)/,"le nom de celui qui parle");
}

// Le tavernier dit pour quoi un candidat est doué (Idan, 2026-11-24) : ses tags sur ses estimations (±10 %), payés comme
// ses autres réponses ; ils passent devant ce que le candidat annonce.
{
  const dialogue=createRecruitDialogue({reference:{tavernDialogue:dialogueCopy}});
  const merc={id:7,name:"Inga Longueforge",sex:"femme",stats:{Force:40}};
  const candidate={mercenary:merc}, game={tavernTalk:{candidateId:7}}, asks=[];
  const fn=js.slice(js.indexOf("function candidateTagNames("),js.indexOf("// Sa réponse à une question sur lui"))
    +js.slice(js.indexOf("function askTavernAbout(kind){"),js.indexOf("// Les salles de la taverne et son tavernier"));
  const ask=new Function("game","recruitDialogue","tavernCandidate","companyTagRules","companyTagContext","campaignRules","captainAffinity",
    "describedTitle","tavernTalkLine","tavernLog","saveGame","renderTavern","fmt",fn+"return askTavernAbout;")(
    game,()=>dialogue,id=>id===7?candidate:null,
    ()=>({describedTags:(estime,cd,ctx)=>{ assert.equal(cd,candidate); assert.equal(estime.stats.Force,44,"ses valeurs estimées"); return {affiches:[{nom:"Roc "},{nom:"Veinard"}]}; }}),
    ()=>({ok:true}),
    ()=>({askTavernkeeper:(state,id,kind,compute)=>{ asks.push(kind); return {ok:true,cost:1,answer:compute(()=>1.1)}; }}),
    ()=>({total:0}),()=>"",()=>"",()=>{},()=>{},()=>{},n=>String(n));
  ask("tags");
  assert.deepEqual(asks,["tags"]);
  assert.deepEqual(dialogue.known(candidate).keeperTags,["Roc","Veinard"]);
  assert.equal(game.tavernTalk.line,"Inga ? Roc et Veinard, si tu veux mon avis.");
  assert.deepEqual(dialogue.shownTags(dialogue.known(candidate)),{source:"keeper",names:["Roc","Veinard"]});
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
