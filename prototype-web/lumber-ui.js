"use strict";

// Cabane du bûcheron (Idan, 2026-11-03) et Guilde des mineurs (Idan, 2026-11-04), interface. Sur la carte du bâtiment (Ma
// Compagnie) : « Envoyer bûcheronner » / « Envoyer à la mine » ouvre la liste des membres disponibles ; la réponse passe par
// la boîte de dialogue des échanges (de bon cœur, ou à contrecœur). Puis « Bûcherons de demain (2 / 3) » : chacun, et
// « Annuler ». Le journal du matin dit quels chantiers ont gagné des jours.
// Règles : game-core/lumber.js ; textes : data/reference/lumber-dialogue.json, mine-dialogue.json.
const CAMP_WORKS={
  lumber:{rules:"lumberjacks",copy:"lumberDialogue"},
  mine:{rules:"miners",copy:"mineDialogue"}
};
function campWorkRules(course){ return campaignRules()[CAMP_WORKS[course]?.rules]||null; }
function campWorkCopy(course){ return game.referenceData?.[CAMP_WORKS[course]?.copy]||{}; }

// La carte du bâtiment : le bouton, puis les travailleurs de demain.
function campWorkHtml(c,course){
  const rules=c&&typeof campaignRules==="function"?campWorkRules(course):null;
  if(!rules||!(rules.slots(c)>0)) return "";
  const copy=campWorkCopy(course).panel||{},company=c.company;
  const planned=rules.tomorrow(c),slots=rules.slots(c);
  const members=[...company.roster].sort((a,b)=>(b.id===company.captainId)-(a.id===company.captainId));
  const picks=members.filter(m=>rules.canSend(c,m).ok).map(m=>`<button type="button" class="steward-pick" data-course="${course}" data-work-send="${esc(m.id)}">
      ${renderAvatar(m,{variant:"compact",kind:"portrait"})}<b>${esc(m.name)}</b><small></small></button>`).join("");
  const offer=picks?`<details class="steward-offer camp-work-offer camp-work-offer--${course}"><summary class="talk-offer-btn" title="${esc(copy.send_tip||"")}">${esc(copy.send||"")}</summary><div class="steward-picks">${picks}</div></details>`:"";
  const rows=planned.map(entry=>{
    const m=company.roster.find(x=>x.id===entry.id);
    if(!m) return "";
    return `<div class="study-row">
        <div class="building-info"><strong>${esc(m.name)}</strong>${entry.grudging?`<span>${esc(copy.grudging||"")}</span>`:""}</div>
        <div class="study-actions"><button type="button" class="secondary" data-course="${course}" data-work-cancel="${esc(m.id)}">Annuler</button></div>
      </div>`;
  }).join("");
  return offer+(rows?`<div class="study-list"><h4>${esc(copy.title||"")} (${fmt(planned.length)} / ${fmt(slots)})</h4>${rows}</div>`:"");
}
function lumberHtml(c){ return campWorkHtml(c,"lumber"); }
function mineHtml(c){ return campWorkHtml(c,"mine"); }

// La réponse, dans la boîte de dialogue des échanges.
function openCampWorkAnswer(m,result,course){
  const copy=campWorkCopy(course).send||{};
  const lines=copy[result.grudging?"grudging":"willing"]||[];
  const reply=variantPhrase(lines,`${m.id}|${game.campaign.day}|${course}`);
  const hall=campWorkRules(course)?.HALL;
  $("deal-talk-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("deal-talk-name").textContent=m.name;
  $("deal-talk-origin").textContent=(game.referenceData?.campBuildings?.rows||[]).find(r=>r.code===hall)?.nom||"";
  $("deal-talk-log").innerHTML=`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(studyFill(copy.proposal,m))} »</span></p>
    <p class="talk-say talk-say--merc"><b>${esc(MercenairesRecruitDialogue.firstName(m))}</b><span>« ${esc(studyFill(reply,m))} »</span></p>
    <p class="talk-note">${esc(studyFill(result.grudging?copy.outcome_grudging:copy.outcome_willing,m))}</p>`;
  $("deal-talk-choices").innerHTML=`<ol class="talk-options"><li><button type="button" data-deal-leave>Partir</button></li></ol>`;
  $("deal-talk-dialog").showModal();
}

function sendCampWorker(memberId,course){
  const m=studyMember(memberId);
  if(!m) return;
  const result=campWorkRules(course).send(game.campaign,m.id);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  saveGame();
  renderGame();
  if(m.id===game.campaign.company.captainId){ tavernLog(campWorkCopy(course).panel?.captain||"","gear"); return; }
  openCampWorkAnswer(m,result,course);
}
function cancelCampWorker(memberId,course){
  const m=studyMember(memberId);
  const result=campWorkRules(course).cancel(game.campaign,m?.id);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  tavernLog(String(campWorkCopy(course).panel?.cancelled||"").replace("{nom}",m.name),"info");
  saveGame();
  renderGame();
}

// Journal du matin : les jours gagnés, chantier par chantier.
function logCampWork(report,course){
  if(!report?.workers?.length) return;
  const copy=campWorkCopy(course).log||{};
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
    const cancel=event.target.closest?.("[data-work-cancel]");
    if(cancel) cancelCampWorker(cancel.dataset.workCancel,cancel.dataset.course);
  });
}

if(typeof document!=="undefined") initializeCampWork();
