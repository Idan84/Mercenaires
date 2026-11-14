"use strict";

// Les Discussions (Idan, 2026-11-14) : ceux qui viennent parler au capitaine et que le jour suivant attend — un déserteur
// repéré par la Vigie, les mutins, l'usurier (ou ses voleurs), une demande d'augmentation. Le matin, leurs scènes
// s'ouvrent toujours toutes seules, l'une après l'autre (« C'est bien. On change pas ») ; mais on peut fermer sans répondre
// (« Plus tard », ou Échap) et y revenir par le picto Discussions de la barre du bas (« ouvrir à nous via un menu
// déroulant pour parler à chaque personne dans l'ordre qu'on veut ou après avoir fait autre chose »). Le jour suivant
// attend toujours leurs réponses (« ce qui bloque Next Day ») : il rouvre la première. Une scène remise à plus tard ne se
// rouvre plus toute seule ce jour-là ; après un rechargement de la page, elles se rouvrent toutes, comme un nouveau matin
// (rien n'est sauvegardé). Les scènes : desertion-ui.js, mutiny-ui.js, usurer-ui.js, salary-review-ui.js.

// Les scènes remises à plus tard aujourd'hui (des clés : « desertion:<id> », « mutiny », « usurer », « salary:<id> »).
function talkPutOffList(){
  const day=game.campaign?.day??null;
  if(!game.talksPutOff||game.talksPutOff.day!==day) game.talksPutOff={day,keys:[]};
  return game.talksPutOff.keys;
}
function talkPutOff(key){ return Boolean(game.campaign)&&talkPutOffList().includes(String(key)); }
function putOffTalk(key){
  const keys=talkPutOffList();
  if(!keys.includes(String(key))) keys.push(String(key));
}
function resumeTalk(key){
  const keys=talkPutOffList(),i=keys.indexOf(String(key));
  if(i>=0) keys.splice(i,1);
}

// Ceux qui attendent, dans l'ordre des scènes du matin ; le texte de chacun, celui de la notification du jour.
function pendingTalks(){
  const c=game.campaign;
  if(!c||typeof campaignRules!=="function") return [];
  const rules=campaignRules(),talks=[];
  const member=id=>c.company.roster.find(m=>m.id===id)||null;
  for(const e of rules.desertionRules?.pending(c)||[]){
    const m=member(e.id);
    if(m) talks.push({key:"desertion:"+e.id,kind:"desertion",label:m.name+" veut quitter la compagnie",open:()=>openDesertionScene(e)});
  }
  const mutiny=rules.mutinyRules;
  if(mutiny?.pending(c)) talks.push({key:"mutiny",kind:"mutiny",label:"Les mutins réclament leur solde",open:()=>checkMutiny()});
  else if(mutiny?.fighting(c)) talks.push({key:"mutiny",kind:"mutiny",label:"Les mutins ont tiré l’épée",open:()=>checkMutiny()});
  const lender=rules.usurerRules?.pending(c);
  if(lender){
    const news=typeof usurerCopy==="function"?usurerCopy().day_news||{}:{};
    talks.push({key:"usurer",kind:"usurer",label:news[lender.kind]||"L’usurier",open:()=>checkUsurer()});
  }
  for(const e of rules.salaryReviewRules?.pending(c)||[]){
    const m=member(e.id);
    if(m) talks.push({key:"salary:"+e.id,kind:"salary",label:typeof salaryFill==="function"?salaryFill(salaryCopy().day_news?.request,m):m.name,
      open:()=>openSalaryTalk(e,game.salaryTalk?.id===e.id||e.rounds>0)});
  }
  return talks;
}

const TALK_DIALOGS=["desertion-dialog","mutiny-dialog","usurer-dialog","salary-dialog"];
function talkOpen(){ return TALK_DIALOGS.some(id=>$(id)?.open); }

// Parler à quelqu'un (le menu du picto, le jour suivant) : sa scène, même remise à plus tard.
function openTalk(key){
  if(!game.campaign||talkOpen()) return false;
  const talk=pendingTalks().find(t=>t.key===String(key));
  if(!talk) return false;
  resumeTalk(talk.key);
  talk.open();
  return true;
}
function openFirstTalk(){
  const first=pendingTalks()[0];
  return first?openTalk(first.key):false;
}

// « Plus tard » : la scène se ferme sans réponse ; une scène déjà réglée se ferme comme avec « Continuer ».
function laterTalk(kind){
  const c=game.campaign,rules=c&&typeof campaignRules==="function"?campaignRules():null;
  if(!rules) return;
  if(kind==="desertion"){
    const id=game.desertionScene?.id;
    if(id!=null&&rules.desertionRules?.pendingOf(c,id)) putOffTalk("desertion:"+id);
    if(game.desertionScene) desertionChoice("continue");
    else{ $("desertion-dialog")?.close(); renderGame(); }
  }else if(kind==="mutiny"){
    if(rules.mutinyRules?.pending(c)||rules.mutinyRules?.fighting(c)) putOffTalk("mutiny");
    mutinyChoice("continue");
  }else if(kind==="usurer"){
    if(rules.usurerRules?.pending(c)) putOffTalk("usurer");
    usurerChoice("continue");
  }else if(kind==="salary"){
    const id=game.salaryTalk?.id;
    if(id!=null&&(rules.salaryReviewRules?.pending(c)||[]).some(e=>e.id===id)) putOffTalk("salary:"+id);
    if(game.salaryTalk) salaryTalkChoice("continue");
    else{ $("salary-dialog")?.close(); renderGame(); }
  }
}

function initializeDiscussions(){
  document.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-talk-later]");
    if(button) laterTalk(button.dataset.talkLater);
  });
  // Échap ferme aussi sans répondre.
  for(const id of TALK_DIALOGS){
    document.getElementById(id)?.addEventListener("cancel",event=>{
      event.preventDefault();
      laterTalk(id.replace("-dialog",""));
    });
  }
}

if(typeof document!=="undefined") initializeDiscussions();
