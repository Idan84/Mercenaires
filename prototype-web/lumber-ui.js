"use strict";

// Cabane du bûcheron (Idan, 2026-11-03), Guilde des mineurs et Palais des plaisirs (Idan, 2026-11-04), interface. Sur la carte du bâtiment (Ma
// Compagnie) : « Envoyer bûcheronner » / « Envoyer à la mine » ouvre la liste des membres disponibles ; la réponse passe par
// la boîte de dialogue des échanges : il accepte, ou il refuse et on peut relancer une fois (Intimider, Convaincre) ou
// laisser tomber. Puis « Bûcherons (2 / 3) » : chacun (« dès demain », « intimidé », « convaincu »), et « Retirer ». Le
// journal du matin dit quels chantiers ont gagné des jours.
// Règles : game-core/lumber.js, game-core/persuasion.js ; textes : lumber-dialogue.json, mine-dialogue.json,
// palace-dialogue.json, persuasion-dialogue.json.
const CAMP_WORKS={
  lumber:{rules:"lumberjacks",copy:"lumberDialogue"},
  mine:{rules:"miners",copy:"mineDialogue"},
  palace:{rules:"palaceWorkers",copy:"palaceDialogue"}
};
function campWorkRules(course){ return campaignRules()[CAMP_WORKS[course]?.rules]||null; }
function campWorkCopy(course){ return game.referenceData?.[CAMP_WORKS[course]?.copy]||{}; }
function persuasionCopy(){ return game.referenceData?.persuasionDialogue||{}; }

// La carte du bâtiment : le bouton, puis ceux qui y travaillent.
function campWorkHtml(c,course){
  const rules=c&&typeof campaignRules==="function"?campWorkRules(course):null;
  if(!rules||!(rules.slots(c)>0)) return "";
  const copy=campWorkCopy(course).panel||{},labels=persuasionCopy().labels||{},company=c.company;
  const entries=rules.entriesOf(c),slots=rules.slots(c);
  const members=[...company.roster].sort((a,b)=>(b.id===company.captainId)-(a.id===company.captainId));
  const picks=members.filter(m=>rules.canSend(c,m).ok).map(m=>`<button type="button" class="steward-pick" data-course="${course}" data-work-send="${esc(m.id)}">
      ${renderAvatar(m,{variant:"compact",kind:"portrait"})}<b>${esc(m.name)}</b><small></small></button>`).join("");
  const offer=picks?`<details class="steward-offer camp-work-offer camp-work-offer--${course}"><summary class="talk-offer-btn" title="${esc(copy.send_tip||"")}">${esc(copy.send||"")}</summary><div class="steward-picks">${picks}</div></details>`:"";
  const rows=entries.map(entry=>{
    const m=company.roster.find(x=>x.id===entry.id);
    if(!m) return "";
    const notes=[entry.startDay>c.day?copy.starting:"",entry.approach?studyFill(labels[entry.approach]||"",m):""].filter(Boolean);
    return `<div class="study-row">
        <div class="building-info"><strong>${esc(m.name)}</strong>${notes.length?`<span>${esc(notes.join(" · "))}</span>`:""}</div>
        <div class="study-actions"><button type="button" class="secondary" data-course="${course}" data-work-withdraw="${esc(m.id)}">${esc(copy.withdraw||"")}</button></div>
      </div>`;
  }).join("");
  return offer+(rows?`<div class="study-list"><h4>${esc(copy.title||"")} (${fmt(entries.length)} / ${fmt(slots)})</h4>${rows}</div>`:"");
}
function lumberHtml(c){ return campWorkHtml(c,"lumber"); }
function mineHtml(c){ return campWorkHtml(c,"mine"); }
function palaceHtml(c){ return campWorkHtml(c,"palace"); }

// La boîte de dialogue des échanges : la demande, sa réponse ; après un refus, Intimider, Convaincre ou laisser tomber.
const talkSay=(who,text,you)=>`<p class="talk-say talk-say--${you?"you":"merc"}"><b>${esc(who)}</b><span>« ${esc(text)} »</span></p>`;
function openCampWork(m,result,course){
  const copy=campWorkCopy(course).send||{};
  const reply=variantPhrase(copy[result.accepted?"accepted":"refused"]||[],`${m.id}|${game.campaign.day}|${course}`);
  const hall=campWorkRules(course)?.HALL;
  $("deal-talk-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("deal-talk-name").textContent=m.name;
  $("deal-talk-origin").textContent=(game.referenceData?.campBuildings?.rows||[]).find(r=>r.code===hall)?.nom||"";
  $("deal-talk-log").innerHTML=talkSay("Vous",studyFill(copy.proposal,m),true)
    +talkSay(MercenairesRecruitDialogue.firstName(m),studyFill(reply,m),false)
    +(result.accepted?`<p class="talk-note">${esc(studyFill(copy.outcome_accepted,m))}</p>`:"");
  campWorkChoices(m,course,!result.accepted);
  $("deal-talk-dialog").showModal();
}
function campWorkChoices(m,course,retry){
  const options=persuasionCopy().options||{};
  $("deal-talk-choices").innerHTML=retry
    ?`<ol class="talk-options">${["intimidate","convince"].map(key=>`<li><button type="button" data-course="${course}" data-work-retry="${key}" data-member="${esc(m.id)}">${esc(options[key]||"")}</button></li>`).join("")}
        <li><button type="button" data-deal-leave>${esc(options.leave||"")}</button></li></ol>`
    :`<ol class="talk-options"><li><button type="button" data-deal-leave>Partir</button></li></ol>`;
}
function retryCampWorker(memberId,course,approach){
  const m=studyMember(memberId);
  if(!m) return;
  const result=campWorkRules(course).retry(game.campaign,m.id,approach);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  const pers=persuasionCopy(),copy=campWorkCopy(course).send||{},seed=`${m.id}|${game.campaign.day}|${course}|${approach}`;
  const line=variantPhrase(pers.captain?.[approach]||[],seed);
  const reply=variantPhrase(pers.reply?.[approach]?.[result.accepted?"accepted":"refused"]||[],seed);
  $("deal-talk-log").insertAdjacentHTML("beforeend",talkSay("Vous",studyFill(line,m),true)
    +talkSay(MercenairesRecruitDialogue.firstName(m),studyFill(reply,m),false)
    +`<p class="talk-note">${esc(studyFill(result.accepted?copy.outcome_accepted:pers.final_refused,m))}</p>`);
  campWorkChoices(m,course,false);
  saveGame();
  renderGame();
}

function sendCampWorker(memberId,course){
  const m=studyMember(memberId);
  if(!m) return;
  const result=campWorkRules(course).send(game.campaign,m.id);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  saveGame();
  renderGame();
  if(m.id===game.campaign.company.captainId){ tavernLog(campWorkCopy(course).panel?.captain||"","gear"); return; }
  openCampWork(m,result,course);
}
function withdrawCampWorker(memberId,course){
  const m=studyMember(memberId);
  const result=campWorkRules(course).withdraw(game.campaign,m?.id);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  tavernLog(String(campWorkCopy(course).panel?.withdrawn||"").replace("{nom}",m.name),"info");
  saveGame();
  renderGame();
}

// Journal du matin : les jours gagnés, chantier par chantier ; au Palais, l'or de la journée.
function logCampWork(report,course){
  if(!report?.workers?.length) return;
  const copy=campWorkCopy(course).log||{};
  if(report.gold!=null){ tavernLog(String(copy.earned||"").replace("{or}",fmt(report.gold)),"turn"); return; }
  if(!report.reduced.length){ tavernLog(copy.none||"","info"); return; }
  for(const r of report.reduced){
    const days=`${fmt(r.days)} jour${r.days>1?"s":""}`;
    tavernLog(String(copy.reduced||"").replace("{chantier}",r.name).replace("{jours}",days),"turn");
  }
}

function initializeCampWork(){
  document.addEventListener("click",event=>{
    const send=event.target.closest?.("[data-work-send]");
    if(send){ sendCampWorker(send.dataset.workSend,send.dataset.course); return; }
    const retry=event.target.closest?.("[data-work-retry]");
    if(retry){ retryCampWorker(retry.dataset.member,retry.dataset.course,retry.dataset.workRetry); return; }
    const withdraw=event.target.closest?.("[data-work-withdraw]");
    if(withdraw) withdrawCampWorker(withdraw.dataset.workWithdraw,withdraw.dataset.course);
  });
}

if(typeof document!=="undefined") initializeCampWork();
