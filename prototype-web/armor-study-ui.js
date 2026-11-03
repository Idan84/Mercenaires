"use strict";

// Apprendre un port d'armure à l'Académie de la survie, interface (Idan, 2026-11-03 : « comme un sort »). Sur la carte de
// l'Académie (Ma Compagnie) : « Apprendre une armure » ouvre la liste des membres, avec le port qu'ils apprendraient ;
// la réponse passe par la boîte de dialogue des échanges. Puis « Apprentissages » : chaque élève, son armure, son jour
// (la chance du lendemain au survol), « Annuler » ou « Le faire sortir ». Le journal du matin dit qui sait.
// Règles : game-core/armor-study.js ; textes : data/reference/armor-study-dialogue.json.
function armorStudyRules(){ return campaignRules().armorStudy; }
function armorStudyCopy(){ return game.referenceData?.armorStudyDialogue||{}; }
const armorWord=type=>String(type||"").toLocaleLowerCase("fr");

// La carte de l'Académie : le bouton, puis les élèves.
function armorStudyHtml(c){
  const rules=c&&typeof campaignRules==="function"?campaignRules().armorStudy:null;
  if(!rules||!(campaignRules().buildingLevel(c,rules.HALL)>0)) return "";
  const copy=armorStudyCopy().panel||{},company=c.company;
  const members=[...company.roster].sort((a,b)=>(b.id===company.captainId)-(a.id===company.captainId));
  // Ceux qui peuvent apprendre ; déjà sollicités aujourd'hui : grisés.
  const picks=members.map(m=>{
    const check=rules.canStudy(c,m),asked=check.reason==="Vous lui en avez déjà parlé aujourd’hui.";
    if(!check.ok&&!asked) return "";
    const type=rules.nextClass(m);
    return `<button type="button" class="steward-pick" data-armor-offer="${esc(m.id)}"${asked?` disabled title="déjà sollicité aujourd’hui"`:""}>
      ${renderAvatar(m,{variant:"compact",kind:"portrait"})}<b>${esc(m.name)}</b><small>${esc(type||"")}</small></button>`;
  }).join("");
  const offer=picks?`<details class="steward-offer armor-study-offer"><summary class="talk-offer-btn" title="${esc(copy.learn_tip||"")}">${esc(copy.learn||"")}</summary><div class="steward-picks">${picks}</div></details>`:"";
  const rows=rules.studiesOf(c).map(study=>{
    const m=company.roster.find(x=>x.id===study.studentId);
    if(!m) return "";
    const planned=rules.isPlanned(study);
    const chance=planned?0:Math.round(rules.dailyChance(c,study).chance);
    return `<div class="study-row">
        <div class="building-info"><strong>${esc(m.name)}</strong>${planned
          ?`<span>Armure ${esc(armorWord(study.type))} · entre demain matin</span>`
          :`<span title="Chance de savoir demain matin : ${fmt(chance)} %">Armure ${esc(armorWord(study.type))} · jour ${fmt(study.days+1)}</span>`}</div>
        <div class="study-actions">${planned
          ?`<button type="button" class="secondary" data-armor-stop="${esc(study.id)}">Annuler</button>`
          :`<button type="button" class="secondary" data-armor-stop="${esc(study.id)}" title="Rien n’est acquis.">Le faire sortir</button>`}</div>
      </div>`;
  }).join("");
  return offer+(rows?`<div class="study-list"><h4>${esc(copy.title||"")}</h4>${rows}</div>`:"");
}

// La réponse, dans la boîte de dialogue des échanges.
function openArmorStudyAnswer(m,result){
  const copy=armorStudyCopy().offer||{},vars={armure:armorWord(result.type)};
  const lines=copy[result.accepted?"accepted":"refused"]||[];
  const reply=variantPhrase(lines,`${m.id}|${game.campaign.day}|armor-study`);
  $("deal-talk-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("deal-talk-name").textContent=m.name;
  $("deal-talk-origin").textContent="Académie de la survie";
  $("deal-talk-log").innerHTML=`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(studyFill(copy.proposal,m,vars))} »</span></p>
    <p class="talk-say talk-say--merc"><b>${esc(MercenairesRecruitDialogue.firstName(m))}</b><span>« ${esc(studyFill(reply,m,vars))} »</span></p>
    <p class="talk-note">${esc(studyFill(result.accepted?copy.outcome_accepted:copy.outcome_refused,m,vars))}</p>`;
  $("deal-talk-choices").innerHTML=`<ol class="talk-options"><li><button type="button" data-deal-leave>Partir</button></li></ol>`;
  $("deal-talk-dialog").showModal();
}

function offerArmorStudy(memberId){
  const m=studyMember(memberId);
  if(!m) return;
  const result=armorStudyRules().offer(game.campaign,m.id);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  saveGame();
  renderGame();
  if(m.id===game.campaign.company.captainId){
    tavernLog(`Le capitaine entrera demain matin à l’Académie de la survie pour apprendre à porter une armure ${armorWord(result.type)}.`,"gear");
    return;
  }
  openArmorStudyAnswer(m,result);
}
function stopArmorStudy(studyId){
  const study=armorStudyRules().studyById(game.campaign,studyId);
  const m=study?studyMember(study.studentId):null;
  if(!study||!m) return;
  const planned=armorStudyRules().isPlanned(study);
  if(!planned&&typeof confirm==="function"&&!confirm(`Faire sortir ${m.name} de l’Académie ? Rien n’est acquis.`)) return;
  const result=armorStudyRules().stop(game.campaign,studyId);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  tavernLog(planned?`${m.name} n’entrera pas à l’Académie.`:`${m.name} sort de l’Académie sans avoir appris à porter une armure ${armorWord(study.type)}.`,planned?"info":"bad");
  saveGame();
  renderGame();
}

// Journal du matin.
function logArmorStudy(report){
  for(const go of report?.started||[]) tavernLog(`${go.mercenary.name} entre à l’Académie de la survie pour apprendre à porter une armure ${armorWord(go.study.type)}.`,"turn");
  for(const done of report?.learned||[]) tavernLog(`${done.mercenary.name} sait désormais porter une armure ${armorWord(done.type)}, après ${fmt(done.days)} jour${done.days>1?"s":""}.`,"turn");
}

function initializeArmorStudy(){
  document.addEventListener("click",event=>{
    const offer=event.target.closest?.("[data-armor-offer]");
    if(offer){ offerArmorStudy(offer.dataset.armorOffer); return; }
    const stop=event.target.closest?.("[data-armor-stop]");
    if(stop) stopArmorStudy(stop.dataset.armorStop);
  });
}

if(typeof document!=="undefined") initializeArmorStudy();
