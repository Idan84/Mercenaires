"use strict";

// Écran Taverne V1 : affichage et saisie seulement. Les règles sont dans game-core/tavern.js
// et game-core/campaign.js ; l'état de partie vit dans game.campaign.

const PROFILE_LABELS={melee:"Corps à corps",ranged:"Distance",magic:"Magie"};

function tavernRules(){
  if(!game.tavernRules) game.tavernRules=MercenairesTavern.createTavernRules({reference:game.referenceData});
  return game.tavernRules;
}

function biographyRules(){
  if(!game.biographyRules) game.biographyRules=MercenairesBiography.createBiographyRules({catalog:game.referenceData.biographies?.rows||[]});
  return game.biographyRules;
}

function campaignRules(){
  if(!game.campaignRules){
    game.campaignRules=MercenairesCampaign.createCampaignRules({generator:game.generator,tavern:tavernRules(),reference:game.referenceData,biographies:biographyRules()});
  }
  return game.campaignRules;
}

function startCampaign(captain,squad){
  game.campaign=campaignRules().createCampaign({captain,squad});
  game.tavernLog=[];
  game.tavernSelected=null;
}

function campaignRoster(){
  return game.campaign?.company.roster||[];
}

function tavernCandidate(id){
  return game.campaign?tavernRules().findCandidate(game.campaign.tavern,id):null;
}

function tavernLog(message,kind="info"){
  game.tavernLog=[{message,kind,day:game.campaign.day},...(game.tavernLog||[])].slice(0,40);
}

function renderCompanyMeta(){
  const c=game.campaign;
  if(!c) return;
  $("company-gold").textContent=fmt(c.company.gold);
  $("company-gold").classList.toggle("negative",c.company.gold<0);
  $("company-day").textContent=c.day;
  $("company-dorm").textContent=c.company.roster.length+" / "+c.company.camp.dormitoryCapacity;
}

function profileText(shown){
  const label=PROFILE_LABELS[shown.profile]||"—";
  return shown.predilection?label+" · "+shown.predilection:label;
}

function renderTavernCard(candidate){
  const shown=tavernRules().visibleProfile(candidate.mercenary);
  const agreed=candidate.negotiation?.agreed;
  return `<article class="tavern-card">
    ${renderAvatar(candidate.mercenary,{variant:"card"})}
    <header>
      <strong>${esc(shown.name)}</strong>
      <small>${esc(shown.people)} · ${esc(shown.culture)}</small>
    </header>
    <dl>
      <div><dt>Profil</dt><dd>${esc(profileText(shown))}</dd></div>
      <div><dt>Réputation</dt><dd>${fmt(shown.reputation)}</dd></div>
      <div><dt>Salaire demandé</dt><dd>${fmt(shown.salary)} PO/j</dd></div>
      <div><dt>Prime de mission</dt><dd>${fmt(shown.missionBonus)} PO</dd></div>
    </dl>
    <p class="muted">Arrivé le jour ${candidate.arrivedDay} · questions ${candidate.interview.questionsLeft}/${tavernRules().QUESTIONS_PER_CANDIDATE}${agreed?" · <strong>accord conclu</strong>":""}</p>
    <button class="secondary" data-tavern-open="${candidate.mercenary.id}">Entretien</button>
  </article>`;
}

// L'Intendant est un rôle assigné à un membre de la compagnie ; « Aucun » par défaut.
function renderIntendantSelect(){
  const current=game.campaign.company.intendantId;
  const options=[...campaignRoster()].sort((a,b)=>(Number(b.skills?.camp?.Intendance)||0)-(Number(a.skills?.camp?.Intendance)||0));
  $("tavern-intendant").innerHTML=`<option value="">Aucun</option>`+options.map(m=>
    `<option value="${m.id}" ${m.id===current?"selected":""}>${esc(m.name)} — Intendance ${fmt(m.skills?.camp?.Intendance||0)}</option>`
  ).join("");
}

function assignTavernIntendant(){
  const value=$("tavern-intendant").value;
  const result=campaignRules().assignIntendant(game.campaign,value?Number(value):null);
  if(result.ok) tavernLog(result.intendant?result.intendant.name+" devient l’Intendant de la compagnie.":"La compagnie n’a plus d’Intendant.","turn");
  saveGame();
  renderTavern();
}

function renderTavern(){
  const c=game.campaign;
  if(!c) return;
  renderCompanyMeta();
  renderIntendantSelect();
  $("tavern-candidates").innerHTML=c.tavern.candidates.length
    ?c.tavern.candidates.map(renderTavernCard).join("")
    :`<p class="muted">La Taverne est vide. De nouveaux candidats arriveront demain matin.</p>`;
  $("tavern-log").innerHTML=(game.tavernLog||[]).map(x=>`<div class="combat-log ${x.kind}"><small>Jour ${x.day}</small> ${esc(x.message)}</div>`).join("");
}

// Outil de test (pas une règle du jeu) : ajoute de l'or pour tester les paiements (demande d'Idan).
const TEST_GOLD=1000;

function addTestGold(){
  if(!game.campaign) return;
  game.campaign.company.gold+=TEST_GOLD;
  tavernLog("Outil de test : +"+TEST_GOLD+" PO.","gear");
  saveGame();
  renderTavern();
}

function advanceTavernDay(){
  if(!game.campaign) return;
  const [report]=campaignRules().advanceTime(game.campaign,1);
  for(const r of report.recovered) tavernLog(r.mercenary.name+(r.kind==="wounded"?" est guéri de ses blessures.":" est reposé."),"turn");
  const gone=report.tavern.departures.map(d=>d.candidate.mercenary.name);
  const arrived=report.tavern.arrivals.map(a=>a.mercenary.name);
  tavernLog(gone.length?"Engagés ailleurs pendant la nuit : "+gone.join(", ")+".":"Personne n’a été engagé ailleurs cette nuit.",gone.length?"bad":"info");
  if(arrived.length) tavernLog("Nouveaux candidats : "+arrived.join(", ")+".","turn");
  saveGame();
  renderGame();
  if(game.tavernSelected) renderInterview();
}

// Valeurs qu'une question peut viser : caractéristiques, résistances et compétence de prédilection.
function interviewTargets(candidate){
  const m=candidate.mercenary,shown=tavernRules().visibleProfile(m);
  const targets=Object.keys(m.stats||{}).map(k=>({key:"stats."+k,label:k}));
  targets.push(...Object.keys(m.resistances||{}).map(k=>({key:"resistances."+k,label:k})));
  if(shown.predilection){
    const group=shown.profile==="magic"?"magic":"martial";
    if(Number.isFinite(Number(m.skills?.[group]?.[shown.predilection]))){
      targets.push({key:"skills."+group+"."+shown.predilection,label:"Compétence : "+shown.predilection});
    }
  }
  return targets;
}

function answerText(answer,targets){
  const label=targets.find(t=>t.key===answer.key)?.label||answer.key;
  if(answer.source.type==="intendant"){
    return `${label} : environ <strong>${fmt(answer.estimate)}</strong> <small>(estimation de l’Intendant ${esc(answer.source.name)}, à ±${Math.round(answer.source.maxError*100)} % près)</small>`;
  }
  return `${label} : « <strong>${fmt(answer.estimate)}</strong> » <small>(selon le candidat lui-même)</small>`;
}

function renderInterview(){
  const candidate=tavernCandidate(game.tavernSelected);
  if(!candidate){ $("tavern-dialog").close(); game.tavernSelected=null; return; }
  const rules=tavernRules(),c=game.campaign;
  const shown=rules.visibleProfile(candidate.mercenary);
  const n=rules.negotiationState(candidate);
  const targets=interviewTargets(candidate);
  const asked=new Set(candidate.interview.answers.map(a=>a.key));
  const intendant=campaignRules().intendantOf(c);
  const dormFree=campaignRules().dormitoryFree(c);

  $("tavern-dialog-name").textContent=shown.name;
  $("tavern-dialog-content").innerHTML=`
    <section class="tavern-interview-overview">
      ${renderAvatar(candidate.mercenary,{variant:"interview"})}
      <div>
    <div class="identity-grid">
      <div class="metric"><small>Peuple</small><strong>${esc(shown.people)}</strong></div>
      <div class="metric"><small>Culture</small><strong>${esc(shown.culture)}</strong></div>
      <div class="metric"><small>Profil</small><strong>${esc(profileText(shown))}</strong></div>
      <div class="metric"><small>Réputation</small><strong>${fmt(shown.reputation)}</strong></div>
    </div>
      </div>
    </section>

    <section class="tavern-section">
      <h3>Questions (${candidate.interview.questionsLeft} restantes)</h3>
      <p class="muted">${intendant
        ?`Votre Intendant, ${esc(intendant.name)} (Intendance ${fmt(intendant.skills.camp.Intendance)}), estime les réponses.`
        :"Vous n’avez pas d’Intendant : le candidat répond lui-même… et se vante. Assignez un Intendant depuis la Taverne."}</p>
      <div class="tavern-question">
        <select id="tavern-question-target" ${candidate.interview.questionsLeft?"":"disabled"}>
          ${targets.filter(t=>!asked.has(t.key)).map(t=>`<option value="${esc(t.key)}">${esc(t.label)}</option>`).join("")}
        </select>
        <button id="tavern-ask-btn" class="secondary" ${candidate.interview.questionsLeft?"":"disabled"}>Poser la question</button>
      </div>
      <ul class="tavern-answers">${candidate.interview.answers.map(a=>`<li>${answerText(a,targets)}</li>`).join("")||`<li class="muted">Aucune question posée.</li>`}</ul>
    </section>

    <section class="tavern-section">
      <h3>Contrat</h3>
      ${n.agreed?`
        <p>Accord conclu : <strong>${fmt(n.agreed.salary)} PO/j</strong> et <strong>${fmt(n.agreed.bonus)} PO</strong> de prime de mission.</p>
        <button id="tavern-sign-btn" class="primary" ${dormFree>0?"":"disabled"}>Signer le contrat</button>
        ${dormFree>0?"":`<p class="mission-error">Dortoir plein : impossible de finaliser le recrutement.</p>`}
      `:`
        <p>Demande actuelle : <strong>${fmt(n.salary)} PO/j</strong> et <strong>${fmt(n.bonus)} PO</strong> de prime de mission.${n.refused?` <small>Offre déjà refusée : ${fmt(n.refused.salary)} PO/j et ${fmt(n.refused.bonus)} PO ; impossible de proposer moins.</small>`:""}</p>
        <div class="tavern-offer">
          <label>Salaire journalier<input id="tavern-offer-salary" type="number" min="0" value="${n.salary}"></label>
          <label>Prime de mission<input id="tavern-offer-bonus" type="number" min="0" value="${n.bonus}"></label>
          <button id="tavern-offer-btn" class="primary">Proposer</button>
        </div>
      `}
      <p id="tavern-offer-result" class="tavern-result">${esc(game.tavernOfferMessage||"")}</p>
    </section>
  `;
}

function openInterview(id){
  game.tavernSelected=id;
  game.tavernOfferMessage="";
  renderInterview();
  $("tavern-dialog").showModal();
}

function askTavernQuestion(){
  const key=$("tavern-question-target")?.value;
  if(!key) return;
  const result=campaignRules().askCandidate(game.campaign,game.tavernSelected,key);
  if(!result.ok) game.tavernOfferMessage=result.reason;
  saveGame();
  renderInterview();
  renderTavern();
}

function makeTavernOffer(){
  const id=game.tavernSelected,candidate=tavernCandidate(id);
  if(!candidate) return;
  const name=candidate.mercenary.name;
  const offer={salary:Number($("tavern-offer-salary").value),bonus:Number($("tavern-offer-bonus").value)};
  const result=campaignRules().offerToCandidate(game.campaign,id,offer);
  if(result.outcome==="invalid"){
    game.tavernOfferMessage=result.reason;
  }else if(result.outcome==="accepted"){
    game.tavernOfferMessage=name+" accepte.";
    tavernLog(name+" accepte "+fmt(result.agreed.salary)+" PO/j et "+fmt(result.agreed.bonus)+" PO de prime.","turn");
  }else if(result.outcome==="counter"){
    game.tavernOfferMessage=name+" refuse et contre-propose "+fmt(result.counter.salary)+" PO/j et "+fmt(result.counter.bonus)+" PO.";
  }else if(result.outcome==="left"){
    tavernLog(name+" se vexe et quitte la Taverne.","bad");
    saveGame();
    game.tavernSelected=null;
    $("tavern-dialog").close();
    renderTavern();
    return;
  }
  saveGame();
  renderInterview();
  renderTavern();
}

function signTavernCandidate(){
  const result=campaignRules().signCandidate(game.campaign,game.tavernSelected);
  if(!result.ok){ game.tavernOfferMessage=result.reason; renderInterview(); return; }
  result.mercenary.role="Recrue";
  tavernLog(result.mercenary.name+" signe et rejoint la compagnie.","turn");
  saveGame();
  game.tavernSelected=null;
  $("tavern-dialog").close();
  renderGame();
}

function initializeTavernUi(){
  $("tavern-next-day-btn").addEventListener("click",advanceTavernDay);
  $("test-gold-btn").addEventListener("click",addTestGold);
  $("tavern-intendant").addEventListener("change",assignTavernIntendant);
  $("close-tavern-dialog").addEventListener("click",()=>{ game.tavernSelected=null; $("tavern-dialog").close(); });
  $("tavern-candidates").addEventListener("click",e=>{
    const btn=e.target.closest("[data-tavern-open]");
    if(btn) openInterview(Number(btn.dataset.tavernOpen));
  });
  $("tavern-dialog-content").addEventListener("click",e=>{
    if(e.target.id==="tavern-ask-btn") askTavernQuestion();
    if(e.target.id==="tavern-offer-btn") makeTavernOffer();
    if(e.target.id==="tavern-sign-btn") signTavernCandidate();
  });
}
