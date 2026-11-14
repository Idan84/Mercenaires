"use strict";

// L'usurier (Idan, 2026-11-11), interface. À la Taverne : « Vous ne connaîtriez pas quelqu'un… » (le tavernier fait passer
// le mot) et, avec un emprunt en cours, « Faire porter son dû » (remboursement anticipé, intérêts au jour près). Les scènes
// du matin, qui bloquent la journée : la visite (le montant, le jour), l'échéance (payer, ou « Je ne peux pas payer »), les
// voleurs (l'avertissement, puis leur retour : un combat, mission.js startUsurerFight). Payer arrête la menace, à tout
// moment. Règles : game-core/usurer.js ; textes : data/reference/usurer-dialogue.json.
function usurerRules(){ return typeof campaignRules==="function"?campaignRules().usurerRules||null:null; }
function usurerCopy(){ return game.referenceData?.usurerDialogue||{}; }
function usurerFill(text,vars={}){ return String(text||"").replace(/\{(\w+)\}/g,(all,key)=>key in vars?vars[key]:all); }
function usurerCaptainName(){ const c=game.campaign; return c?.company.roster.find(m=>m.id===c.company.captainId)?.name||"Le capitaine"; }

// La Taverne (tavern-ui.js) : les options du tavernier.
function usurerTavernOptions(){
  const c=game.campaign,rules=usurerRules(),copy=usurerCopy().tavern||{};
  if(!c||!rules) return [];
  const out=[];
  if(rules.canAsk(c).ok) out.push({key:"usurer",label:copy.ask});
  if(rules.book(c).loan) out.push({key:"usurer_pay",label:usurerFill(copy.repay,{montant:fmt(rules.owed(c))})});
  return out;
}
function usurerTavernChoice(key){
  const c=game.campaign,rules=usurerRules(),copy=usurerCopy(),tavern=copy.tavern||{};
  if(!c||!rules) return null;
  if(key==="usurer"){
    const result=rules.ask(c);
    if(!result.ok) return tavern.waiting;
    tavernLog(copy.log?.asked,"info");
    saveGame();
    return variantPhrase(tavern.answer||[],`${c.day}|usurer`);
  }
  if(key==="usurer_pay"){
    const result=rules.repay(c);
    if(!result.ok) return usurerFill(tavern.no_gold,{montant:fmt(result.amount||0)});
    tavernLog(usurerFill(copy.log?.repaid,{montant:fmt(result.amount)}),"gear");
    saveGame();
    renderGame();
    return tavern.repaid;
  }
  return null;
}

// La notification et le journal du matin.
function usurerNews(report){
  const c=game.campaign,rules=usurerRules(),news=usurerCopy().day_news||{};
  const scene=c&&rules?rules.pending(c):null;
  if(!scene) return [];
  if(scene.kind==="visit") return [{tone:"alert",icon:"merchant",text:news.visit,detail:news.visit_detail}];
  if(scene.kind==="due") return [{tone:"alert",icon:"gold",text:news.due,detail:usurerFill(news.due_detail,{total:fmt(scene.owed)})}];
  return [{tone:"alert",icon:"swords",text:news[scene.kind]}];
}
function logUsurer(report){
  const log=usurerCopy().log||{};
  if(report?.threat) tavernLog(usurerFill(log.threat,{chance:fmt(report.threat.chance)}),report.threat.hit?"bad":"warn");
}

// La fenêtre : une note, puis les choix.
function usurerSay(html){ $("usurer-log").insertAdjacentHTML("beforeend",html); }
const usurerNote=text=>`<p class="talk-note">${esc(text)}</p>`;
const usurerLine=text=>`<p class="talk-say talk-say--merc"><b>${esc(usurerCopy().scene?.name||"")}</b><span>${esc(text)}</span></p>`;
function usurerOptions(list){
  $("usurer-options").innerHTML=list.map(o=>`<li><button type="button" data-usurer="${o.key}"${o.disabled?` disabled title="${esc(o.title||"")}"`:""}>${esc(o.label)}</button></li>`).join("");
}
function usurerPayOption(label){
  const c=game.campaign,rules=usurerRules(),owed=rules.owed(c),short=(Number(c.company.gold)||0)<owed;
  return {key:"pay",label:usurerFill(label,{total:fmt(owed)}),disabled:short,title:short?usurerFill(usurerCopy().tavern?.no_gold,{montant:fmt(owed)}):""};
}
// La visite : le montant (1 à 10 000 × étoiles), le jour (1 à 2 × étoiles jours), ce qu'il faudra rendre.
function usurerVisitForm(){
  const c=game.campaign,rules=usurerRules(),copy=usurerCopy().visit||{},lim=rules.limits(c);
  const owedToMen=campaignRules().debtRules?.total(c)||0;
  const start=Math.min(lim.maxAmount,Math.max(100,Math.ceil((owedToMen||lim.maxAmount/2)/100)*100));
  $("usurer-form").innerHTML=`<div class="usurer-form">
    <label><span>${esc(copy.amount||"")}</span><input type="number" id="usurer-amount" min="1" max="${lim.maxAmount}" step="100" value="${start}"></label>
    <label><span>${esc(copy.days||"")}</span><input type="range" id="usurer-days" min="1" max="${lim.maxDays}" step="1" value="${lim.maxDays}"><output id="usurer-days-out">${lim.maxDays}</output></label>
    <p id="usurer-total" class="usurer-total"></p></div>`;
  updateUsurerTotal();
}
function usurerTerms(){
  const lim=usurerRules().limits(game.campaign);
  const amount=Math.max(1,Math.min(lim.maxAmount,Math.floor(Number($("usurer-amount")?.value)||0)));
  const days=Math.max(1,Math.min(lim.maxDays,Math.floor(Number($("usurer-days")?.value)||1)));
  return {amount,days};
}
function updateUsurerTotal(){
  const c=game.campaign,rules=usurerRules();
  if(!$("usurer-total")||!rules) return;
  const {amount,days}=usurerTerms();
  $("usurer-days-out").textContent=fmt(days);
  $("usurer-total").textContent=usurerFill(usurerCopy().visit?.total,{jour:fmt(c.day+days),total:fmt(rules.owedOn({amount,signedDay:c.day},c.day+days))});
}

function openUsurerScene(){
  const c=game.campaign,rules=usurerRules(),scene=rules?.pending(c),copy=usurerCopy();
  if(!scene) return;
  const seed=`${c.day}|${scene.kind}`;
  $("usurer-origin").textContent=copy.scene?.origin||"";
  $("usurer-name").textContent=copy.scene?.name||"";
  $("usurer-log").innerHTML="";
  $("usurer-form").innerHTML="";
  if(scene.kind==="visit"){
    const lim=rules.limits(c);
    usurerSay(usurerNote(variantPhrase(copy.visit?.arrival||[],seed))+usurerLine(usurerFill(copy.visit?.terms,{max:fmt(lim.maxAmount),jours:fmt(lim.maxDays)})));
    usurerVisitForm();
    usurerOptions([{key:"borrow",label:copy.visit?.accept},{key:"decline",label:copy.visit?.decline}]);
  }else if(scene.kind==="due"){
    usurerSay(usurerLine(usurerFill(variantPhrase(copy.due?.arrival||[],seed),{total:fmt(scene.owed)})));
    usurerOptions([usurerPayOption(copy.due?.pay),{key:"refuse",label:copy.due?.cannot}]);
  }else{
    const part=copy[scene.kind]||{};
    usurerSay(usurerNote(part.arrival));
    const pay=usurerPayOption(part.pay);
    usurerOptions([{key:"fight",label:part.fight},...(pay.disabled?[]:[pay])]);
  }
  game.usurerScene={kind:scene.kind};
  if(!$("usurer-dialog").open) $("usurer-dialog").showModal();
}
// La scène qui attend (après le passage au jour suivant, au chargement ; après les mutins).
function checkUsurer(){
  const dialog=$("usurer-dialog");
  if(!game.campaign||!dialog||dialog.open||!usurerRules()||game.mission) return;
  if(["desertion-dialog","mutiny-dialog"].some(id=>$(id)?.open)) return;
  // Les mutins d'abord, sauf remis à plus tard ; l'usurier remis à plus tard attend le picto Discussions (discussions-ui.js).
  const later=key=>typeof talkPutOff==="function"&&talkPutOff(key);
  if(campaignRules().mutinyRules?.pending(game.campaign)&&!later("mutiny")) return;
  if(usurerRules().pending(game.campaign)&&!later("usurer")) openUsurerScene();
}
// Après l'avertissement des voleurs (mission.js) : leur message, puis le camp.
function showUsurerNote(text){
  $("usurer-origin").textContent=usurerCopy().scene?.origin||"";
  $("usurer-name").textContent=usurerCopy().scene?.name||"";
  $("usurer-log").innerHTML=`<p class="talk-say talk-say--merc"><span>${esc(text)}</span></p>`;
  $("usurer-form").innerHTML="";
  usurerOptions([{key:"continue",label:usurerCopy().warning?.continue||"Continuer"}]);
  game.usurerScene={kind:"note"};
  if(!$("usurer-dialog").open) $("usurer-dialog").showModal();
}

function usurerChoice(key){
  const c=game.campaign,rules=usurerRules(),copy=usurerCopy(),log=copy.log||{};
  if(!c||!rules) return;
  const close=()=>{ game.usurerScene=null; $("usurer-dialog").close(); };
  if(key==="continue"){
    close();
    if(game.mission?.usurer&&typeof leaveMission==="function") leaveMission();
    else renderGame();
    return;
  }
  if(key==="borrow"){
    const result=rules.borrow(c,usurerTerms());
    if(!result.ok) return;
    const vars={montant:fmt(result.loan.amount),jour:fmt(result.loan.dueDay),total:fmt(result.total)};
    usurerSay(usurerNote(usurerFill(copy.visit?.accepted,vars)));
    tavernLog(usurerFill(log.borrowed,vars),"gear");
  }else if(key==="decline"){
    if(!rules.decline(c).ok) return;
    usurerSay(usurerNote(copy.visit?.declined));
  }else if(key==="pay"){
    const result=rules.repay(c);
    if(!result.ok) return;
    usurerSay(usurerNote(game.usurerScene?.kind==="due"?copy.due?.paid:copy.paid));
    tavernLog(usurerFill(log.repaid,{montant:fmt(result.amount)}),"gear");
  }else if(key==="refuse"){
    if(!rules.refuse(c).ok) return;
    usurerSay(usurerNote(copy.due?.angry));
    tavernLog(log.refused,"bad");
  }else if(key==="fight"){
    const kind=game.usurerScene?.kind;
    close();
    if(typeof startUsurerFight==="function") startUsurerFight(kind);
    return;
  }else return;
  $("usurer-form").innerHTML="";
  usurerOptions([{key:"continue",label:copy.warning?.continue||"Continuer"}]);
  saveGame();
}

function initializeUsurer(){
  document.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-usurer]");
    if(button&&!button.disabled) usurerChoice(button.dataset.usurer);
  });
  document.addEventListener("input",event=>{
    if(event.target?.id==="usurer-amount"||event.target?.id==="usurer-days") updateUsurerTotal();
  });
}

if(typeof document!=="undefined") initializeUsurer();
