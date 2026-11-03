"use strict";

// Médecin, interface (Idan, 2026-11-01 : « on déplace sa fiche à côté de l'intendant ») : en haut de l'Intendance,
// à côté de l'intendant. Sans médecin et avec un Dispensaire : « Nommer un médecin » ouvre la liste des mercenaires
// (Médecine de chacun) ; avec un médecin : son portrait, son nom, ses effets au survol, et « Le renvoyer sur le
// terrain ». Ses réponses passent par la boîte de dialogue des échanges, comme celles de l'intendant.
// Règles : game-core/medic.js ; effets : game-core/campaign.js ; textes : data/reference/medic-dialogue.json.
let medicRulesCache=null;
function medicRules(){
  if(!medicRulesCache&&game.referenceData) medicRulesCache=MercenairesMedic.createMedicRules({reference:game.referenceData,
    dormitory:{free:state=>campaignRules().dormitoryFree(state),places:m=>campaignRules().dormitoryPlaces(m)},
    dispensaryLevel:state=>campaignRules().buildingLevel(state,"dispensary")});
  return medicRulesCache;
}
function medicCopy(){ return game.referenceData?.medicDialogue||{}; }
function currentMedic(){ return game.campaign?medicRules().medicOf(game.campaign):null; }
function medicSkill(m){ return Math.round(Number(m?.skills?.camp?.["Médecine"])||0); }
function medicFill(text,m,vars={}){
  const female=String(m?.sex||"").trim().toLowerCase().startsWith("f");
  return MercenairesRecruitDialogue.fill(text,{prenom:MercenairesRecruitDialogue.firstName(m),...vars},female);
}

function renderMedicPanel(){
  const panel=$("medic-panel");
  if(!panel||!game.campaign) return;
  const copy=medicCopy().panel||{},medic=currentMedic(),c=game.campaign,rules=campaignRules();
  if(medic){
    const days=medicRules().daysAsMedic(c),reduction=Math.round((1-rules.medicCareFactor(c))*100);
    const detail=[medicFill(copy.effect,medic,{medecine:fmt(medicSkill(medic)),reduction:reduction+" %",renommee:fmt(rules.medicRenown(c))}),
      medicFill(days?copy.since:copy.since_today,medic,{jours:stewardDays(days)})].join(" · ");
    panel.innerHTML=`<div class="steward-card medic-card" title="${esc(detail)}">
      <button type="button" class="steward-face" data-character-id="${esc(medic.id)}" aria-label="Voir la fiche de ${esc(medic.name)}">${renderAvatar(medic,{variant:"compact",kind:"portrait"})}</button>
      <div class="steward-info"><small>${esc(medicFill(copy.medic_title,medic))}</small><strong>${esc(medic.name)}</strong></div>
      <button type="button" class="talk-offer-btn" data-medic-recall>${esc(copy.recall||"")}</button>
    </div>`;
    return;
  }
  if(!(rules.buildingLevel(c,"dispensary")>0)){
    panel.innerHTML=`<p class="medic-locked" title="${esc(copy.no_dispensary||"")}">${esc(copy.appoint||"")}</p>`;
    return;
  }
  const company=c.company,lieutenants=company.lieutenantIds||[];
  const picks=company.roster.filter(m=>m.id!==company.captainId&&m.id!==company.intendantId&&!MercenairesCampPosts.postOf(c,m)&&!lieutenants.includes(m.id)&&!rules.expeditionOf(c,m.id))
    .sort((a,b)=>medicSkill(b)-medicSkill(a)).map(m=>{
      const asked=m.medicOfferDay===c.day,arriving=Number(m.contract?.joinDay)>c.day;
      return `<button type="button" class="steward-pick" data-medic-offer="${esc(m.id)}"${asked||arriving?` disabled title="${esc(arriving?"Il rejoint la compagnie demain matin.":copy.asked_today||"")}"`:` title="Médecine ${fmt(medicSkill(m))}"`}>
        ${renderAvatar(m,{variant:"compact",kind:"portrait"})}<b>${esc(m.name)}</b><small>Médecine ${fmt(medicSkill(m))}</small></button>`;
    }).join("");
  panel.innerHTML=picks?`<details class="steward-offer"><summary class="talk-offer-btn" title="${esc(copy.appoint_tip||"")}">${esc(copy.appoint||"")}</summary><div class="steward-picks">${picks}</div></details>`:"";
}

// Réponse à une proposition (poste ou retour sur le terrain), dans la boîte de dialogue des échanges.
function openMedicAnswer(m,kind,result){
  const copy=medicCopy()[kind]||{};
  const lines=copy[result.accepted?"accepted":result.mood]||copy.neutral||[];
  const reply=variantPhrase(lines,`${m.id}|${game.campaign.day}|medic-${kind}`);
  const first=MercenairesRecruitDialogue.firstName(m);
  $("deal-talk-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("deal-talk-name").textContent=m.name;
  $("deal-talk-origin").textContent="Dispensaire";
  $("deal-talk-log").innerHTML=`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(copy.proposal||"")} »</span></p>
    <p class="talk-say talk-say--merc"><b>${esc(first)}</b><span>« ${esc(medicFill(reply,m))} »</span></p>
    <p class="talk-note">${esc(medicFill(result.accepted?copy.outcome_accepted:copy.outcome_refused,m))}</p>`;
  $("deal-talk-choices").innerHTML=`<ol class="talk-options"><li><button type="button" data-deal-leave>Partir</button></li></ol>`;
  $("deal-talk-dialog").showModal();
}

function offerMedicPost(id){
  const m=game.campaign?.company.roster.find(x=>String(x.id)===String(id));
  if(!m) return;
  const result=medicRules().offer(game.campaign,m.id);
  if(!result.ok) return;
  saveGame();
  renderGame();
  openMedicAnswer(m,"offer",result);
}
function recallMedic(){
  const m=currentMedic();
  if(!m) return;
  const result=medicRules().recall(game.campaign);
  if(!result.ok){ if(typeof tavernLog==="function") tavernLog(result.dormFull?medicCopy().recall?.dorm_full||result.reason:result.reason,"info"); return; }
  saveGame();
  renderGame();
  openMedicAnswer(m,"recall",result);
}

function initializeMedic(){
  document.addEventListener("click",event=>{
    const offer=event.target.closest?.("[data-medic-offer]");
    if(offer){ offerMedicPost(offer.dataset.medicOffer); return; }
    if(event.target.closest?.("[data-medic-recall]")) recallMedic();
  });
}

if(typeof document!=="undefined") initializeMedic();
