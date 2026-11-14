"use strict";

// Les Discussions (Idan, 2026-11-14) : un déserteur repéré, les mutins, l'usurier, une demande d'augmentation. Leurs scènes
// s'ouvrent toujours le matin (« C'est bien. On change pas »), mais on peut fermer sans répondre et y revenir par le picto
// Discussions, dans l'ordre qu'on veut ; le jour suivant attend toujours leurs réponses (« ce qui bloque Next Day »).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const WEB=path.resolve(__dirname,"..","prototype-web");
const js=fs.readFileSync(path.join(WEB,"discussions-ui.js"),"utf8");
const html=fs.readFileSync(path.join(WEB,"index.html"),"utf8");
const css=fs.readFileSync(path.join(WEB,"styles.css"),"utf8");

const brak={id:1,name:"Brak"},zia={id:2,name:"Zia"},olf={id:3,name:"Olf"};
const game={campaign:{day:3,company:{roster:[brak,zia,olf]}}};
const state={desertion:[{id:1,day:3}],mutiny:{status:"scene"},fight:null,usurer:{kind:"visit"},salary:[{id:2,rounds:0},{id:3,rounds:1}]};
const rules={
  desertionRules:{pending:()=>state.desertion,pendingOf:(c,id)=>state.desertion.find(e=>e.id===id)||null},
  mutinyRules:{pending:()=>state.mutiny,fighting:()=>state.fight},
  usurerRules:{pending:()=>state.usurer},
  salaryReviewRules:{pending:()=>state.salary}
};
const calls=[];
const dialogs={};
const $=id=>dialogs[id]||(dialogs[id]={open:false,close(){ this.open=false; calls.push(["close",id]); }});
const api=new Function("game","campaignRules","$","document","openDesertionScene","checkMutiny","checkUsurer","openSalaryTalk",
  "usurerCopy","salaryCopy","salaryFill","desertionChoice","mutinyChoice","usurerChoice","salaryTalkChoice","renderGame",
  js+"\nreturn {pendingTalks,talkPutOff,putOffTalk,resumeTalk,openTalk,openFirstTalk,laterTalk,TALK_DIALOGS};")(
  game,()=>rules,$,undefined,
  e=>calls.push(["desertion",e.id]),()=>calls.push(["mutiny"]),()=>calls.push(["usurer"]),(e,resumed)=>calls.push(["salary",e.id,resumed]),
  ()=>({day_news:{visit:"L’usurier est arrivé",due:"L’usurier réclame son dû"}}),()=>({day_news:{request:"{nom} veut vous parler de son salaire"}}),
  (text,m)=>String(text).replace("{nom}",m.name),
  key=>calls.push(["desertion-choice",key]),key=>calls.push(["mutiny-choice",key]),key=>calls.push(["usurer-choice",key]),
  key=>calls.push(["salary-choice",key]),()=>calls.push(["render"]));

// Ceux qui attendent, dans l'ordre des scènes du matin.
assert.deepEqual(api.pendingTalks().map(t=>[t.key,t.label]),[
  ["desertion:1","Brak veut quitter la compagnie"],["mutiny","Les mutins réclament leur solde"],["usurer","L’usurier est arrivé"],
  ["salary:2","Zia veut vous parler de son salaire"],["salary:3","Olf veut vous parler de son salaire"]]);
state.mutiny=null; state.fight={status:"fight"};
assert.equal(api.pendingTalks()[1].label,"Les mutins ont tiré l’épée","le combat des mutins attend aussi");

// « Plus tard » : la scène se ferme sans réponse, sans se rouvrir toute seule ; une scène réglée se ferme comme
// « Continuer ».
game.desertionScene={id:1};
api.laterTalk("desertion");
assert.deepEqual([api.talkPutOff("desertion:1"),calls.shift()],[true,["desertion-choice","continue"]]);
game.salaryTalk={id:3};
api.laterTalk("salary");
assert.deepEqual([api.talkPutOff("salary:3"),api.talkPutOff("salary:2"),calls.shift()],[true,false,["salary-choice","continue"]]);
api.laterTalk("mutiny");
api.laterTalk("usurer");
assert.deepEqual([api.talkPutOff("mutiny"),api.talkPutOff("usurer"),calls.splice(0)],[true,true,[["mutiny-choice","continue"],["usurer-choice","continue"]]]);
state.desertion=[];
game.desertionScene={id:1};
api.resumeTalk("desertion:1");
api.laterTalk("desertion");
assert.equal(api.talkPutOff("desertion:1"),false,"déjà réglée : rien à remettre");
assert.deepEqual(calls.splice(0),[["desertion-choice","continue"]]);
state.desertion=[{id:1,day:3}];

// Le picto Discussions : parler à qui on veut, même remis à plus tard ; pas par-dessus une autre scène.
assert.equal(api.openTalk("salary:3"),true);
assert.deepEqual([calls.shift(),api.talkPutOff("salary:3")],[["salary",3,true],false],"reprise là où on en était");
$("mutiny-dialog").open=true;
assert.equal(api.openTalk("desertion:1"),false,"une scène est déjà ouverte");
$("mutiny-dialog").open=false;
assert.equal(api.openTalk("inconnu"),false);
// Le jour suivant : la première qui attend.
assert.equal(api.openFirstTalk(),true);
assert.deepEqual(calls.splice(0),[["desertion",1]]);
assert.equal(api.talkPutOff("desertion:1"),false);
// Un nouveau jour : plus rien de remis à plus tard.
api.putOffTalk("usurer");
game.campaign.day=4;
assert.equal(api.talkPutOff("usurer"),false);

// L'interface : « Plus tard » dans chaque scène, en dernier (le premier choix garde le focus) ; Échap fait de même.
for(const kind of ["desertion","mutiny","usurer","salary"]){
  const start=html.indexOf(`<dialog id="${kind}-dialog"`),end=html.indexOf("</dialog>",start);
  assert.match(html.slice(start,end),/<button type="button" class="talk-later" data-talk-later="\w+"[^>]*>Plus tard<\/button>\n  $/,kind);
  assert.ok(html.slice(start,end).includes(`data-talk-later="${kind}"`),kind);
}
assert.deepEqual(api.TALK_DIALOGS,["desertion-dialog","mutiny-dialog","usurer-dialog","salary-dialog"]);
assert.match(js,/addEventListener\("cancel",event=>\{\n      event\.preventDefault\(\);\n      laterTalk\(id\.replace\("-dialog",""\)\);/);
assert.match(css,/\.talk-later\{position:absolute;top:12px;right:14px;/);
assert.match(css,/\.talk-dialog--recruit>:nth-last-child\(2\):has\(\+\.talk-later\)\{max-height:260px;overflow-y:auto\}/,"les choix défilent toujours");
assert.ok(html.indexOf('<script src="discussions-ui.js">')>html.indexOf('<script src="usurer-ui.js">')
  &&html.indexOf('<script src="discussions-ui.js">')<html.indexOf('<script src="screen-ui.js">'));
// Les scènes du matin ne rouvrent pas celles remises à plus tard.
for(const [file,pattern] of [["desertion-ui.js",/find\(e=>!later\("desertion:"\+e\.id\)\)/],["mutiny-ui.js",/talkPutOff\("mutiny"\)\) return;/],
  ["usurer-ui.js",/usurerRules\(\)\.pending\(game\.campaign\)&&!later\("usurer"\)\) openUsurerScene\(\);/],["salary-review-ui.js",/find\(e=>!later\("salary:"\+e\.id\)\)/]])
  assert.match(fs.readFileSync(path.join(WEB,file),"utf8"),pattern,file);

console.log("Discussions : plus tard, le picto pour y revenir, le jour suivant qui attend — OK");
