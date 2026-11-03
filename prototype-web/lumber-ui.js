"use strict";

// Cabane du bûcheron, interface (Idan, 2026-11-03). Sur la carte de la Cabane (Ma Compagnie) : « Envoyer bûcheronner »
// ouvre la liste des membres disponibles ; la réponse passe par la boîte de
// dialogue des échanges (de bon cœur, ou à contrecœur). Puis « Bûcherons de demain (2 / 3) » : chacun, et « Annuler ». Le journal
// du matin dit quels chantiers ont gagné des jours.
// Règles : game-core/lumber.js ; textes : data/reference/lumber-dialogue.json.
function lumberRules(){ return campaignRules().lumberjacks; }
function lumberCopy(){ return game.referenceData?.lumberDialogue||{}; }

// La carte de la Cabane : le bouton, puis les bûcherons de demain.
function lumberHtml(c){
  const rules=c&&typeof campaignRules==="function"?campaignRules().lumberjacks:null;
  if(!rules||!(rules.slots(c)>0)) return "";
  const copy=lumberCopy().panel||{},company=c.company;
  const planned=rules.tomorrow(c),slots=rules.slots(c);
  const members=[...company.roster].sort((a,b)=>(b.id===company.captainId)-(a.id===company.captainId));
  const picks=members.filter(m=>rules.canSend(c,m).ok).map(m=>`<button type="button" class="steward-pick" data-lumber-send="${esc(m.id)}">
      ${renderAvatar(m,{variant:"compact",kind:"portrait"})}<b>${esc(m.name)}</b><small></small></button>`).join("");
  const offer=picks?`<details class="steward-offer lumber-offer"><summary class="talk-offer-btn" title="${esc(copy.send_tip||"")}">${esc(copy.send||"")}</summary><div class="steward-picks">${picks}</div></details>`:"";
  const rows=planned.map(entry=>{
    const m=company.roster.find(x=>x.id===entry.id);
    if(!m) return "";
    return `<div class="study-row">
        <div class="building-info"><strong>${esc(m.name)}</strong>${entry.grudging?`<span>${esc(copy.grudging||"")}</span>`:""}</div>
        <div class="study-actions"><button type="button" class="secondary" data-lumber-cancel="${esc(m.id)}">Annuler</button></div>
      </div>`;
  }).join("");
  return offer+(rows?`<div class="study-list"><h4>${esc(copy.title||"")} (${fmt(planned.length)} / ${fmt(slots)})</h4>${rows}</div>`:"");
}

// La réponse, dans la boîte de dialogue des échanges.
function openLumberAnswer(m,result){
  const copy=lumberCopy().send||{};
  const lines=copy[result.grudging?"grudging":"willing"]||[];
  const reply=variantPhrase(lines,`${m.id}|${game.campaign.day}|lumber`);
  $("deal-talk-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("deal-talk-name").textContent=m.name;
  $("deal-talk-origin").textContent="Cabane du bûcheron";
  $("deal-talk-log").innerHTML=`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(studyFill(copy.proposal,m))} »</span></p>
    <p class="talk-say talk-say--merc"><b>${esc(MercenairesRecruitDialogue.firstName(m))}</b><span>« ${esc(studyFill(reply,m))} »</span></p>
    <p class="talk-note">${esc(studyFill(result.grudging?copy.outcome_grudging:copy.outcome_willing,m))}</p>`;
  $("deal-talk-choices").innerHTML=`<ol class="talk-options"><li><button type="button" data-deal-leave>Partir</button></li></ol>`;
  $("deal-talk-dialog").showModal();
}

function sendLumberjack(memberId){
  const m=studyMember(memberId);
  if(!m) return;
  const result=lumberRules().send(game.campaign,m.id);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  saveGame();
  renderGame();
  if(m.id===game.campaign.company.captainId){ tavernLog("Le capitaine ira bûcheronner demain.","gear"); return; }
  openLumberAnswer(m,result);
}
function cancelLumberjack(memberId){
  const m=studyMember(memberId);
  const result=lumberRules().cancel(game.campaign,m?.id);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  tavernLog(`${m.name} n’ira pas bûcheronner demain.`,"info");
  saveGame();
  renderGame();
}

// Journal du matin : les jours gagnés, chantier par chantier.
function logLumber(report){
  if(!report?.workers?.length) return;
  if(!report.reduced.length){ tavernLog("Les bûcherons n’ont trouvé aucun chantier à accélérer.","info"); return; }
  for(const r of report.reduced) tavernLog(`${r.name} : ${fmt(r.days)} jour${r.days>1?"s":""} de moins grâce aux bûcherons.`,"turn");
}

function initializeLumber(){
  document.addEventListener("click",event=>{
    const send=event.target.closest?.("[data-lumber-send]");
    if(send){ sendLumberjack(send.dataset.lumberSend); return; }
    const cancel=event.target.closest?.("[data-lumber-cancel]");
    if(cancel) cancelLumberjack(cancel.dataset.lumberCancel);
  });
}

if(typeof document!=="undefined") initializeLumber();
