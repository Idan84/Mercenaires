"use strict";

// Apprendre une aptitude au camp, interface (Idan, 2026-11-03) : un port d'armure à l'Académie de la survie (« comme un
// sort »), l'Empoisonnement des armes au Labo d'alchimie. Sur la carte du bâtiment (Ma Compagnie) : « Apprendre une
// armure » ou « Apprendre l'empoisonnement » ouvre la liste des membres (pour une armure, le port qu'ils apprendraient) ;
// la réponse passe par la boîte de dialogue des échanges. Puis « Apprentissages » : chaque élève, son jour (la chance du
// lendemain au survol), « Annuler » ou « Le faire sortir ». Le journal du matin dit qui sait.
// Règles : game-core/armor-study.js ; textes : armor-study-dialogue.json, poison-study-dialogue.json.
const armorWord=type=>String(type||"").toLocaleLowerCase("fr");
// Par apprentissage : ses règles, ses textes, le lieu (« entre à… », « sort de… »), ce qu'on apprend.
const APTITUDE_STUDIES={
  armor:{rules:()=>campaignRules().armorStudy,copy:()=>game.referenceData?.armorStudyDialogue||{},origin:"Académie de la survie",
    into:"à l’Académie de la survie",out:"de l’Académie",learn:type=>`porter une armure ${armorWord(type)}`,
    row:type=>`Armure ${armorWord(type)}`,pick:type=>type||"",vars:type=>({armure:armorWord(type)})},
  poison:{rules:()=>campaignRules().poisonStudy,copy:()=>game.referenceData?.poisonStudyDialogue||{},origin:"Labo d’alchimie",
    into:"au Labo d’alchimie",out:"du Labo",learn:()=>"empoisonner une arme",
    row:()=>"Empoisonnement",pick:()=>"",vars:()=>({})}
};
const courseAttr=course=>course==="armor"?"":` data-course="${esc(course)}"`;

// La carte du bâtiment : le bouton, puis les élèves.
function aptitudeStudyHtml(c,course="armor"){
  const ui=APTITUDE_STUDIES[course];
  const rules=c&&typeof campaignRules==="function"?ui.rules():null;
  if(!rules||!(campaignRules().buildingLevel(c,rules.HALL)>0)) return "";
  const copy=ui.copy().panel||{},company=c.company,attr=courseAttr(course);
  const members=[...company.roster].sort((a,b)=>(b.id===company.captainId)-(a.id===company.captainId));
  // Ceux qui peuvent apprendre ; déjà sollicités aujourd'hui : grisés.
  const picks=members.map(m=>{
    const check=rules.canStudy(c,m),asked=check.reason==="Vous lui en avez déjà parlé aujourd’hui.";
    if(!check.ok&&!asked) return "";
    const type=rules.nextClass(m);
    return `<button type="button" class="steward-pick"${attr} data-armor-offer="${esc(m.id)}"${asked?` disabled title="déjà sollicité aujourd’hui"`:""}>
      ${renderAvatar(m,{variant:"compact",kind:"portrait"})}<b>${esc(m.name)}</b><small>${esc(ui.pick(type))}</small></button>`;
  }).join("");
  const offer=picks?`<details class="steward-offer armor-study-offer"><summary class="talk-offer-btn" title="${esc(copy.learn_tip||"")}">${esc(copy.learn||"")}</summary><div class="steward-picks">${picks}</div></details>`:"";
  const rows=rules.studiesOf(c).map(study=>{
    const m=company.roster.find(x=>x.id===study.studentId);
    if(!m) return "";
    const planned=rules.isPlanned(study);
    const chance=planned?0:Math.round(rules.dailyChance(c,study).chance);
    return `<div class="study-row">
        <div class="building-info"><strong>${esc(m.name)}</strong>${planned
          ?`<span>${esc(ui.row(study.type))} · entre demain matin</span>`
          :`<span title="Chance de savoir demain matin : ${fmt(chance)} %">${esc(ui.row(study.type))} · jour ${fmt(study.days+1)}</span>`}</div>
        <div class="study-actions">${planned
          ?`<button type="button" class="secondary"${attr} data-armor-stop="${esc(study.id)}">Annuler</button>`
          :`<button type="button" class="secondary"${attr} data-armor-stop="${esc(study.id)}" title="Rien n’est acquis.">Le faire sortir</button>`}</div>
      </div>`;
  }).join("");
  return offer+(rows?`<div class="study-list"><h4>${esc(copy.title||"")}</h4>${rows}</div>`:"");
}
const armorStudyHtml=c=>aptitudeStudyHtml(c,"armor");
const poisonStudyHtml=c=>aptitudeStudyHtml(c,"poison");

// La réponse, dans la boîte de dialogue des échanges.
function openArmorStudyAnswer(m,result,course="armor"){
  const ui=APTITUDE_STUDIES[course],copy=ui.copy().offer||{},vars=ui.vars(result.type);
  const lines=copy[result.accepted?"accepted":"refused"]||[];
  const reply=variantPhrase(lines,`${m.id}|${game.campaign.day}|${course}-study`);
  $("deal-talk-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("deal-talk-name").textContent=m.name;
  $("deal-talk-origin").textContent=ui.origin;
  $("deal-talk-log").innerHTML=`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(studyFill(copy.proposal,m,vars))} »</span></p>
    <p class="talk-say talk-say--merc"><b>${esc(MercenairesRecruitDialogue.firstName(m))}</b><span>« ${esc(studyFill(reply,m,vars))} »</span></p>
    <p class="talk-note">${esc(studyFill(result.accepted?copy.outcome_accepted:copy.outcome_refused,m,vars))}</p>`;
  // Après un refus, la relance (Idan, 2026-11-04 ; persuasion-ui.js).
  if(typeof persuasionAfter==="function") persuasionAfter(result,"aptitude",{member:m.id,course});
  else $("deal-talk-choices").innerHTML=`<ol class="talk-options"><li><button type="button" data-deal-leave>Partir</button></li></ol>`;
  $("deal-talk-dialog").showModal();
}
function retryArmorStudy(memberId,course,approach){
  const ui=APTITUDE_STUDIES[course],m=studyMember(memberId);
  if(!ui||!m) return;
  const result=ui.rules().retry(game.campaign,m.id,approach);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  persuasionAppend(m,result,studyFill(ui.copy().offer?.outcome_accepted,m,ui.vars(result.type)),`${m.id}|${game.campaign.day}|${course}|${approach}`);
  saveGame();
  renderGame();
}

function offerArmorStudy(memberId,course="armor"){
  const ui=APTITUDE_STUDIES[course],m=studyMember(memberId);
  if(!m) return;
  const result=ui.rules().offer(game.campaign,m.id);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  saveGame();
  renderGame();
  if(m.id===game.campaign.company.captainId){
    tavernLog(`Le capitaine entrera demain matin ${ui.into} pour apprendre à ${ui.learn(result.type)}.`,"gear");
    return;
  }
  openArmorStudyAnswer(m,result,course);
}
function stopArmorStudy(studyId,course="armor"){
  const ui=APTITUDE_STUDIES[course],rules=ui.rules();
  const study=rules.studyById(game.campaign,studyId);
  const m=study?studyMember(study.studentId):null;
  if(!study||!m) return;
  const planned=rules.isPlanned(study);
  if(!planned&&typeof confirm==="function"&&!confirm(`Faire sortir ${m.name} ${ui.out} ? Rien n’est acquis.`)) return;
  const result=rules.stop(game.campaign,studyId);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  tavernLog(planned?`${m.name} n’entrera pas ${ui.into}.`:`${m.name} sort ${ui.out} sans avoir appris à ${ui.learn(study.type)}.`,planned?"info":"bad");
  saveGame();
  renderGame();
}

// Journal du matin.
function logArmorStudy(report,course="armor"){
  const ui=APTITUDE_STUDIES[course];
  for(const go of report?.started||[]) tavernLog(`${go.mercenary.name} entre ${ui.into} pour apprendre à ${ui.learn(go.study.type)}.`,"turn");
  for(const done of report?.learned||[]) tavernLog(`${done.mercenary.name} sait désormais ${ui.learn(done.type)}, après ${fmt(done.days)} jour${done.days>1?"s":""}.`,"turn");
}

function initializeArmorStudy(){
  if(typeof registerPersuasion==="function") registerPersuasion("aptitude",(approach,data)=>retryArmorStudy(data.persuadeMember,data.persuadeCourse||"armor",approach));
  document.addEventListener("click",event=>{
    const offer=event.target.closest?.("[data-armor-offer]");
    if(offer){ offerArmorStudy(offer.dataset.armorOffer,offer.dataset.course||"armor"); return; }
    const stop=event.target.closest?.("[data-armor-stop]");
    if(stop) stopArmorStudy(stop.dataset.armorStop,stop.dataset.course||"armor");
  });
}

if(typeof document!=="undefined") initializeArmorStudy();
