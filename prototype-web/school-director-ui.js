"use strict";

// Directeur de l'École de magie, interface (Idan, 2026-11-01 : « même mécanisme pour la nomination que l'intendant ») :
// en haut de l'Intendance, à côté de l'intendant et du médecin. Sans directeur et avec une École construite : « Nommer
// un directeur de l'École » ouvre la liste des mercenaires (meilleure école de chacun) ; avec un directeur : son
// portrait, son nom, et « Le renvoyer sur le terrain ». Ses réponses passent par la boîte de dialogue des échanges, comme
// celles de l'intendant et du médecin. Pas encore d'effet.
// Règles : game-core/school-director.js ; textes : data/reference/school-director-dialogue.json.
let schoolDirectorRulesCache=null;
function schoolDirectorRules(){
  if(!schoolDirectorRulesCache&&game.referenceData) schoolDirectorRulesCache=MercenairesSchoolDirector.createSchoolDirectorRules({reference:game.referenceData,
    dormitory:{free:state=>campaignRules().dormitoryFree(state),places:m=>campaignRules().dormitoryPlaces(m)},
    schoolLevel:state=>campaignRules().buildingLevel(state,"magic_school")});
  return schoolDirectorRulesCache;
}
function schoolDirectorCopy(){ return game.referenceData?.schoolDirectorDialogue||{}; }
function currentSchoolDirector(){ return game.campaign?schoolDirectorRules().directorOf(game.campaign):null; }
// Sa meilleure école de magie (valeur de base) : { name, value } ou null.
function directorBestSchool(m){
  const schools=Object.entries(m?.skills?.magic||{}).map(([name,value])=>({name,value:Number(value)||0})).filter(x=>x.value>0);
  return schools.sort((a,b)=>b.value-a.value)[0]||null;
}
function directorSchoolText(m){
  const best=directorBestSchool(m);
  return best?`${best.name} ${fmt(best.value)}`:"aucune école";
}
function directorFill(text,m,vars={}){
  const female=String(m?.sex||"").trim().toLowerCase().startsWith("f");
  return MercenairesRecruitDialogue.fill(text,{prenom:MercenairesRecruitDialogue.firstName(m),...vars},female);
}

function renderSchoolDirectorPanel(){
  const panel=$("director-panel");
  if(!panel||!game.campaign) return;
  const copy=schoolDirectorCopy().panel||{},director=currentSchoolDirector(),c=game.campaign,rules=campaignRules();
  if(director){
    const days=schoolDirectorRules().daysAsDirector(c);
    const detail=[directorFill(copy.school,director,{ecole:directorSchoolText(director)}),
      directorFill(days?copy.since:copy.since_today,director,{jours:stewardDays(days)})].join(" · ");
    panel.innerHTML=`<div class="steward-card director-card" title="${esc(detail)}">
      <button type="button" class="steward-face" data-character-id="${esc(director.id)}" aria-label="Voir la fiche de ${esc(director.name)}">${renderAvatar(director,{variant:"compact",kind:"portrait"})}</button>
      <div class="steward-info"><small>${esc(directorFill(copy.director_title,director))}</small><strong>${esc(director.name)}</strong></div>
      <button type="button" class="talk-offer-btn" data-director-recall>${esc(copy.recall||"")}</button>
    </div>`;
    return;
  }
  if(!(rules.buildingLevel(c,"magic_school")>0)){
    panel.innerHTML=`<p class="medic-locked" title="${esc(copy.no_school||"")}">${esc(copy.appoint||"")}</p>`;
    return;
  }
  const company=c.company,lieutenants=company.lieutenantIds||[];
  const schoolValue=m=>directorBestSchool(m)?.value||0;
  const picks=company.roster.filter(m=>m.id!==company.captainId&&m.id!==company.intendantId&&m.id!==company.medicId
      &&!lieutenants.includes(m.id)&&!rules.expeditionOf(c,m.id))
    .sort((a,b)=>schoolValue(b)-schoolValue(a)).map(m=>{
      const asked=m.directorOfferDay===c.day,school=directorSchoolText(m),arriving=Number(m.contract?.joinDay)>c.day;
      return `<button type="button" class="steward-pick" data-director-offer="${esc(m.id)}"${asked||arriving?` disabled title="${esc(arriving?"Il rejoint la compagnie demain matin.":copy.asked_today||"")}"`:` title="${esc(school)}"`}>
        ${renderAvatar(m,{variant:"compact",kind:"portrait"})}<b>${esc(m.name)}</b><small>${esc(school)}</small></button>`;
    }).join("");
  panel.innerHTML=picks?`<details class="steward-offer"><summary class="talk-offer-btn" title="${esc(copy.appoint_tip||"")}">${esc(copy.appoint||"")}</summary><div class="steward-picks">${picks}</div></details>`:"";
}

// Réponse à une proposition (poste ou retour sur le terrain), dans la boîte de dialogue des échanges.
function openSchoolDirectorAnswer(m,kind,result){
  const copy=schoolDirectorCopy()[kind]||{};
  const lines=copy[result.accepted?"accepted":result.mood]||copy.neutral||[];
  const reply=variantPhrase(lines,`${m.id}|${game.campaign.day}|director-${kind}`);
  const first=MercenairesRecruitDialogue.firstName(m);
  $("deal-talk-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("deal-talk-name").textContent=m.name;
  $("deal-talk-origin").textContent="École de magie";
  $("deal-talk-log").innerHTML=`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(copy.proposal||"")} »</span></p>
    <p class="talk-say talk-say--merc"><b>${esc(first)}</b><span>« ${esc(directorFill(reply,m))} »</span></p>
    <p class="talk-note">${esc(directorFill(result.accepted?copy.outcome_accepted:copy.outcome_refused,m))}</p>`;
  $("deal-talk-choices").innerHTML=`<ol class="talk-options"><li><button type="button" data-deal-leave>Partir</button></li></ol>`;
  $("deal-talk-dialog").showModal();
}

function offerSchoolDirectorPost(id){
  const m=game.campaign?.company.roster.find(x=>String(x.id)===String(id));
  if(!m) return;
  const result=schoolDirectorRules().offer(game.campaign,m.id);
  if(!result.ok) return;
  saveGame();
  renderGame();
  openSchoolDirectorAnswer(m,"offer",result);
}
function recallSchoolDirector(){
  const m=currentSchoolDirector();
  if(!m) return;
  const result=schoolDirectorRules().recall(game.campaign);
  if(!result.ok){ if(typeof tavernLog==="function") tavernLog(result.dormFull?schoolDirectorCopy().recall?.dorm_full||result.reason:result.reason,"info"); return; }
  saveGame();
  renderGame();
  openSchoolDirectorAnswer(m,"recall",result);
}

function initializeSchoolDirector(){
  document.addEventListener("click",event=>{
    const offer=event.target.closest?.("[data-director-offer]");
    if(offer){ offerSchoolDirectorPost(offer.dataset.directorOffer); return; }
    if(event.target.closest?.("[data-director-recall]")) recallSchoolDirector();
  });
}

if(typeof document!=="undefined") initializeSchoolDirector();
