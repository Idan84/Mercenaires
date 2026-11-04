"use strict";

// Renégociation salariale (Idan, 2026-11-04), interface. Le matin, un mercenaire qui a gagné une étoile vient réclamer : une
// ligne dans la notification du jour, puis la scène au début de la journée (après les déserteurs), qui bloque le jeu :
// Accepter, Négocier (comme avec le lieutenant), Refuser ; s'il rompt, la relance (Intimider, Convaincre) ou Laisser tomber.
// Règles : game-core/salary-review.js ; textes : data/reference/salary-review-dialogue.json.
function salaryReviewRules(){ return campaignRules().salaryReviewRules||null; }
function salaryCopy(){ return game.referenceData?.salaryReviewDialogue||{}; }
const salaryFemale=m=>String(m?.sex||"").trim().toLowerCase().startsWith("f");
const salaryFill=(text,m,vars={})=>MercenairesRecruitDialogue.fill(String(text||""),{prenom:MercenairesRecruitDialogue.firstName(m),nom:m?.name||"",...vars},salaryFemale(m));

// La notification du jour (day-news-ui.js) : une ligne par demande.
function salaryReviewNews(report){
  const news=salaryCopy().day_news||{};
  return (report?.requests||[]).map(r=>({tone:"alert",icon:"gold",text:salaryFill(news.request,r.mercenary),
    detail:salaryFill(news.detail,r.mercenary,{salaire:fmt(r.demand)}),faces:[r.mercenary]}));
}

function salaryTalkMember(){ return game.campaign?.company.roster.find(x=>x.id===game.salaryTalk?.id)||null; }
function openSalaryTalk(entry,resumed=false){
  const m=game.campaign.company.roster.find(x=>x.id===entry.id);
  if(!m) return;
  const scene=salaryCopy().scene||{},seed=`${m.id}|${entry.day}|salary`;
  const line=resumed?variantPhrase(scene.resume||[],seed):variantPhrase(scene.demand||[],seed);
  game.salaryTalk={id:m.id,mode:entry.broken?"broken":"choices",
    lines:[{who:"merc",text:salaryFill(line,m,{salaire:fmt(entry.salary),actuel:fmt(entry.current)})}]};
  renderSalaryTalk();
  $("salary-dialog").showModal();
}
// Le premier qui attend (après les déserteurs ; au chargement, après la scène précédente).
function checkSalaryReviews(){
  const dialog=$("salary-dialog");
  if(!game.campaign||!dialog||dialog.open||typeof campaignRules!=="function") return;
  if($("desertion-dialog")?.open||campaignRules().desertionRules?.pending(game.campaign).length) return;
  const entry=salaryReviewRules()?.pending(game.campaign)[0];
  if(entry) openSalaryTalk(entry,game.salaryTalk?.id===entry.id||entry.rounds>0);
}

function salaryChoicesHtml(m,entry,mode){
  const scene=salaryCopy().scene||{},options=game.referenceData?.persuasionDialogue?.options||{};
  if(mode==="negotiate"&&entry) return `<form id="salary-offer" class="talk-offer">
      <label>${esc(scene.salary_label||"")}<span><input id="salary-offer-salary" type="number" min="${entry.current}" value="${entry.salary}"> PO</span></label>
      <button type="submit" class="talk-offer-btn">${esc(scene.submit||"")}</button>
      <button type="button" class="talk-offer-back" data-salary-talk="back">${esc(scene.back||"")}</button>
    </form>`;
  const choices=mode==="ended"||!entry?[{key:"continue",label:scene.continue}]
    :mode==="broken"?[{key:"intimidate",label:options.intimidate},{key:"convince",label:options.convince},{key:"give_up",label:options.leave}]
    :[{key:"accept",label:salaryFill(scene.accept_terms,m,{salaire:fmt(entry.salary)})},{key:"negotiate",label:scene.negotiate},{key:"refuse",label:scene.refuse}];
  return `<ol class="talk-options">${choices.map(o=>`<li><button type="button" data-salary-talk="${o.key}">${esc(o.label||"")}</button></li>`).join("")}</ol>`;
}
function renderSalaryTalk(){
  const t=game.salaryTalk,m=salaryTalkMember()||t?.mercenary;
  if(!t||!m) return;
  const first=MercenairesRecruitDialogue.firstName(m);
  $("salary-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("salary-name").textContent=m.name;
  $("salary-origin").textContent=salaryCopy().scene?.origin||"";
  const log=$("salary-log");
  log.innerHTML=t.lines.map(line=>line.who==="note"
    ?`<p class="talk-note">${esc(line.text)}</p>`
    :`<p class="talk-say talk-say--${line.who}"><b>${line.who==="you"?"Vous":esc(first)}</b><span>« ${esc(line.text)} »</span></p>`).join("");
  log.scrollTop=log.scrollHeight;
  $("salary-choices").innerHTML=salaryChoicesHtml(m,salaryReviewRules()?.pendingOf(game.campaign,m.id),t.mode);
}

// L'issue : la note, le journal ; puis « Continuer ».
function salaryEnded(t,m,result){
  const scene=salaryCopy().scene||{},log=salaryCopy().log||{},raised=result.salary>result.from;
  t.lines.push({who:"note",text:salaryFill(raised?scene.outcome?.raise:scene.outcome?.kept,m,{salaire:fmt(result.salary)})});
  tavernLog(salaryFill(raised?log.raise:log.kept,m,{salaire:fmt(result.salary)}),raised?"gear":"bad");
  t.mode="ended";
  t.mercenary=m;
}
function salaryTalkChoice(key,amount){
  const t=game.salaryTalk,m=salaryTalkMember();
  if(!t) return;
  if(key==="continue"){
    game.salaryTalk=null;
    $("salary-dialog").close();
    renderGame();
    return;
  }
  if(!m) return;
  const rules=salaryReviewRules(),c=game.campaign,scene=salaryCopy().scene||{},you=scene.you||{},merc=scene.merc||{};
  const seed=`${m.id}|${c.day}|${t.lines.length}`,say=(who,text,vars={})=>t.lines.push({who,text:salaryFill(text,m,vars)});
  if(key==="back"){ t.mode="choices"; renderSalaryTalk(); return; }
  if(key==="negotiate"){ t.mode="negotiate"; renderSalaryTalk(); $("salary-offer-salary")?.focus(); return; }
  if(key==="accept"){
    const salary=rules.pendingOf(c,m.id)?.salary;
    const result=rules.accept(c,m.id);
    if(!result.ok){ tavernLog(result.reason,"warn"); return; }
    say("you",you.accept,{salaire:fmt(salary)});
    say("merc",variantPhrase(result.affinityDelta>0?merc.granted:merc.accepted,seed));
    salaryEnded(t,m,result);
  }else if(key==="refuse"){
    const result=rules.refuse(c,m.id);
    if(!result.ok){ tavernLog(result.reason,"warn"); return; }
    say("you",variantPhrase(you.refuse,seed));
    say("merc",variantPhrase(merc.vexed,seed));
    salaryEnded(t,m,result);
  }else if(key==="offer"){
    say("you",you.offer,{salaire:fmt(amount)});
    const result=rules.offer(c,m.id,amount);
    t.mode="choices";
    if(result.outcome==="invalid"){
      const floor=result.reason==="below"?merc.floor_below:result.reason==="refused"?merc.floor_refused:null;
      if(floor) say("merc",floor,{salaire:fmt(result.floor)}); else t.lines.push({who:"note",text:result.reason||""});
    }else if(result.outcome==="counter") say("merc",variantPhrase(merc.counter,seed),{salaire:fmt(result.counter)});
    else if(result.outcome==="broken"){
      say("merc",variantPhrase(merc.broken,seed));
      say("note",scene.outcome?.broken);
      t.mode="broken";
    }else if(result.ok){
      say("merc",variantPhrase(result.affinityDelta>0?merc.granted:merc.accepted,seed));
      salaryEnded(t,m,result);
    }
  }else if(key==="intimidate"||key==="convince"){
    const result=rules.retry(c,m.id,key);
    if(!result.ok){ tavernLog(result.reason,"warn"); return; }
    say("you",variantPhrase(you[key],seed));
    say("merc",variantPhrase(merc.retry?.[result.accepted?"accepted":"refused"],seed));
    salaryEnded(t,m,result);
  }else if(key==="give_up"){
    const result=rules.giveUp(c,m.id);
    if(!result.ok){ tavernLog(result.reason,"warn"); return; }
    salaryEnded(t,m,result);
  }else return;
  saveGame();
  renderSalaryTalk();
}

function initializeSalaryReview(){
  // La scène ne se ferme pas avec Échap : il faut lui répondre.
  document.getElementById("salary-dialog")?.addEventListener("cancel",event=>event.preventDefault());
  document.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-salary-talk]");
    if(button) salaryTalkChoice(button.dataset.salaryTalk);
  });
  document.addEventListener("submit",event=>{
    if(event.target?.id!=="salary-offer") return;
    event.preventDefault();
    salaryTalkChoice("offer",Number(document.getElementById("salary-offer-salary").value));
  });
}

if(typeof document!=="undefined") initializeSalaryReview();
