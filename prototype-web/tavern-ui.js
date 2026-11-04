"use strict";

// Écran Taverne : affichage et saisie seulement. Les règles sont dans game-core/tavern.js,
// game-core/campaign.js et game-core/recruit-dialogue.js ; l'état de partie vit dans game.campaign.

function tavernRules(){
  if(!game.tavernRules) game.tavernRules=MercenairesTavern.createTavernRules({reference:game.referenceData});
  return game.tavernRules;
}

function biographyRules(){
  if(!game.biographyRules) game.biographyRules=MercenairesBiography.createBiographyRules({catalog:game.referenceData.biographies?.rows||[]});
  return game.biographyRules;
}

function avatarRules(){
  if(!game.avatarRules) game.avatarRules=MercenairesAvatars.createAvatarRules({catalog:game.referenceData.avatars?.rows||[],weapons:game.referenceData.weapons?.rows||[]});
  return game.avatarRules;
}

function campaignRules(){
  if(!game.campaignRules){
    game.campaignRules=MercenairesCampaign.createCampaignRules({generator:game.generator,tavern:tavernRules(),reference:game.referenceData,biographies:biographyRules(),avatars:avatarRules(),progression:MercenairesProgression.createProgressionRules({reference:game.referenceData}),affinity:affinityRules(),names:game.nameRules,
      missions:missionRules(),
      bodyguard:MercenairesBodyguard.createBodyguardRules({reference:game.referenceData}),
      // Demandes au lieutenant, jouées chaque matin (lieutenant-ui.js, chargé après).
      lieutenants:{resolveRequests:state=>typeof lieutenantRules==="function"?lieutenantRules().resolveRequests(state):[]},
      // Recharge du mana au camp, chaque matin (magic.js).
      magic:{rechargeMana:(character,options)=>magicRules().rechargeMana(character,options)},
      // Le marchand du jour (merchant-ui.js, chargé après ; doc 18).
      merchants:{morning:(state,options)=>typeof merchantRules==="function"?merchantRules().morning(state,options):null}});
  }
  return game.campaignRules;
}

function startCampaign(captain,squad){
  game.campaign=campaignRules().createCampaign({captain,squad});
  game.tavernLog=[];
  game.recruitTalk=null;
}

function campaignRoster(){
  return game.campaign?.company.roster||[];
}

function tavernCandidate(id){
  return game.campaign?tavernRules().findCandidate(game.campaign.tavern,id):null;
}

function tavernLog(message,kind="info"){
  game.tavernLog=[{message,kind,day:game.campaign.day},...(game.tavernLog||[])].slice(0,40);
  if(typeof gameAction==="function") gameAction(message);
}

function renderCompanyMeta(){
  const c=game.campaign;
  if(!c) return;
  $("company-gold").textContent=fmt(c.company.gold);
  $("company-gold").classList.toggle("negative",c.company.gold<0);
  $("company-day").textContent=c.day;
  $("company-dorm").textContent=dormitoryPlacesText(campaignRules().dormitoryUsed(c))+" / "+c.company.camp.dormitoryCapacity;
  $("company-payroll").textContent=fmt(campaignRules().payroll(c));
  // Renommée (09 §2) en étoiles ; la valeur et son détail au survol.
  $("company-renown").innerHTML=renderRenownStars(campaignRules().companyRenown(c));
}

// Écran Recruter (Idan, 2026-10-21) : portrait en pied, nom, peuple, culture, réputation et jours de présence ;
// le reste (salaire, prime, affinité) se découvre en parlant au candidat.
function presenceText(candidate){
  const days=Math.max(0,(Number(game.campaign?.day)||0)-(Number(candidate.arrivedDay)||0));
  const female=isFemale(candidate.mercenary);
  if(!days) return (female?"Arrivée":"Arrivé")+" aujourd’hui à l’auberge";
  return (female?"Présente":"Présent")+" à l’auberge depuis "+days+" jour"+(days>1?"s":"");
}

function renderTavernCard(candidate){
  const m=candidate.mercenary;
  return `<article class="recruit-card">
    ${renderAvatar(m,{variant:"recruit",kind:"full"})}
    <div class="recruit-card-body">
      <strong class="recruit-name">${esc(m.name)}</strong>
      <span class="recruit-origin">${renderPicto("people",m.people,{size:"xs"})}${esc(m.people)}</span>
      <span class="recruit-origin">${renderPicto("culture",m.culture,{size:"xs"})}${esc(m.culture)}</span>
      ${renderReputationStars(m)}
      <small class="recruit-days">${presenceText(candidate)}</small>
      <button type="button" class="recruit-talk-btn" data-tavern-open="${m.id}">Aller lui parler</button>
    </div>
  </article>`;
}

function renderTavern(){
  const c=game.campaign;
  if(!c) return;
  renderCompanyMeta();
  if(typeof renderGameHud==="function") renderGameHud();
  $("tavern-candidates").innerHTML=c.tavern.candidates.length
    ?c.tavern.candidates.map(renderTavernCard).join("")
    :`<p class="recruit-empty">Personne à l’auberge.</p>`;
  updateRecruitCarousel();
}

// Les candidats en carrousel (Idan, 2026-11-04 : « fais un système qui défile comme un carousel ») : une rangée qui défile,
// une flèche sur chaque bord (effacée au bout), la molette ou le doigt ; tout tient à l'écran : rangée centrée, sans flèches.
function updateRecruitCarousel(){
  const track=$("tavern-candidates"),carousel=track?.closest(".recruit-carousel");
  if(!carousel) return;
  const overflow=track.scrollWidth-track.clientWidth>1;
  carousel.classList.toggle("is-static",!overflow);
  const [prev,next]=carousel.querySelectorAll("[data-recruit-scroll]");
  if(prev) prev.disabled=!overflow||track.scrollLeft<=1;
  if(next) next.disabled=!overflow||track.scrollLeft+track.clientWidth>=track.scrollWidth-1;
}
// Une page de cartes à la fois ; l'accroche des cartes (scroll-snap) cale la rangée sur un portrait.
function scrollRecruits(direction){
  const track=$("tavern-candidates");
  track.scrollBy({left:direction*Math.max(1,track.clientWidth-12),behavior:"smooth"});
}
function initializeRecruitCarousel(){
  const track=$("tavern-candidates"),carousel=track?.closest(".recruit-carousel");
  if(!carousel) return;
  carousel.addEventListener("click",event=>{
    const nav=event.target.closest("[data-recruit-scroll]");
    if(nav) scrollRecruits(Number(nav.dataset.recruitScroll));
  });
  track.addEventListener("scroll",updateRecruitCarousel,{passive:true});
  // La molette verticale fait défiler la rangée, sauf au bout : la page reprend la main.
  track.addEventListener("wheel",event=>{
    if(Math.abs(event.deltaY)<=Math.abs(event.deltaX)) return;
    const atStart=track.scrollLeft<=1,atEnd=track.scrollLeft+track.clientWidth>=track.scrollWidth-1;
    if((event.deltaY<0&&atStart)||(event.deltaY>0&&atEnd)) return;
    event.preventDefault();
    track.scrollBy({left:event.deltaY});
  },{passive:false});
  // Recalculé dès que la rangée change de taille (vue ouverte, fenêtre, écran de téléphone tourné).
  if(typeof ResizeObserver==="function") new ResizeObserver(()=>updateRecruitCarousel()).observe(track);
  else window.addEventListener("resize",updateRecruitCarousel);
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

// Commande globale du camp (bouton play de la barre du bas) : l'horloge existante reste la seule source
// de vérité. Jamais pendant une mission.
function advanceCampDay(){
  if(!game.campaign||currentScreen()!=="camp") return;
  // Une escouade arrivée attend ses ordres : le combat d'abord (Idan, 2026-10-24).
  const allowed=campaignRules().canAdvanceDay(game.campaign);
  if(!allowed.ok){
    tavernLog(allowed.reason,"warn");
    if(typeof openExpeditionDialog==="function") openExpeditionDialog(allowed.expedition.id);
    return;
  }
  const [report]=campaignRules().advanceTime(game.campaign,1);
  logDayReport(report);
  saveGame();
  renderGame();
  if(typeof renderContractBoard==="function"&&!$("tavern-missions-view").classList.contains("hidden")) renderContractBoard();
  // Une escouade vient d'arriver : la fenêtre « Commencer le combat » (doc 17).
  if(game.pendingExpeditionDialog){ openExpeditionDialog(game.pendingExpeditionDialog); game.pendingExpeditionDialog=null; }
  // La notification du jour par-dessus (Idan, 2026-10-30 et 2026-10-31 : day-news-ui.js) ; les rapports des
  // lieutenants et l'arrivée d'une escouade attendent dessous.
  if(typeof showDayNews==="function") showDayNews(game.campaign.day,report);
}

// Journal d'une journée passée : guérisons, salaires, Taverne, contrat pris par une autre compagnie (doc 17).
function logDayReport(report){
  for(const r of report.recovered) tavernLog(r.mercenary.name+(r.kind==="wounded"?" est guéri de ses blessures.":" est reposé."),"turn");
  if(report.salaries.total) tavernLog("Salaires : −"+fmt(report.salaries.total)+" PO.","gear");
  const gone=report.tavern.departures.map(d=>d.candidate.mercenary.name);
  const arrived=report.tavern.arrivals.map(a=>a.mercenary.name);
  if(gone.length) tavernLog("Engagés ailleurs pendant la nuit : "+gone.join(", ")+".","bad");
  if(arrived.length) tavernLog("Nouveaux candidats : "+arrived.join(", ")+".","turn");
  // Offres non signées prises ailleurs (Taverne à 5 missions) : une autre les remplace aussitôt.
  for(const lost of report.offersLost||[]) tavernLog(lost.kind==="bodyguard"
    ?"L’offre de garde du corps ("+lost.client.toLocaleLowerCase("fr")+") a trouvé preneur ailleurs."
    :"Le contrat de "+lost.fields.lieu+" a été pris par une autre compagnie.",lost.kind==="bodyguard"?"info":"bad");
  if(typeof logExpeditionReport==="function") logExpeditionReport(report.expeditions);
  if(typeof logCampWork==="function") logCampWork(report.built);
  if(typeof logCampBuildings==="function") logCampBuildings(report.buildings);
  // Entraînement libre à l'École de magie (Idan, 2026-11-02).
  if(typeof logSchoolDay==="function") logSchoolDay(report.school);
  // Apprentissage des sorts : ceux qui connaissent désormais leur sort.
  if(typeof logSpellStudy==="function") logSpellStudy(report.study);
  if(typeof logArmorStudy==="function") logArmorStudy(report.armorStudy);
  if(typeof logArmorStudy==="function") logArmorStudy(report.poisonStudy,"poison");
  // Bûcherons (Idan, 2026-11-03) et mineurs (Idan, 2026-11-04) du jour.
  if(typeof logCampWork==="function"){ logCampWork(report.lumber,"lumber"); logCampWork(report.mine,"mine"); logCampWork(report.palace,"palace"); }
  // Le marchand du jour (doc 18).
  if(typeof logMerchantMorning==="function") logMerchantMorning(report.merchant);
  // Le rapport des lieutenants (Idan, 2026-10-25) : une pop-up par demande de la veille.
  if(typeof queueLieutenantReports==="function") queueLieutenantReports(report.lieutenants);
}

// Dialogue de recrutement (Idan, 2026-10-21) : salutation selon l'affinité, réponses sincères, prétentions,
// puis Négocier / Signer. Les règles de négociation restent celles de tavern.js (doc 14 §9).
function recruitDialogue(){
  return game.recruitDialogue||(game.recruitDialogue=MercenairesRecruitDialogue.createRecruitDialogue({reference:game.referenceData}));
}

function companyPhrase(){
  const name=String(game.campaign?.company.name||`Compagnie de ${game.captain?.name||"Bob"}`).trim();
  return /^compagnie\b/i.test(name)?"la "+name:"la compagnie "+name;
}

function openRecruitTalk(id){
  const candidate=tavernCandidate(id);
  if(!candidate) return;
  const m=candidate.mercenary;
  const n=tavernRules().negotiationState(candidate);
  game.recruitTalk={id,mercenary:m,lines:[{who:"merc",text:recruitDialogue().greeting(m,captainAffinity(m)?.total)}],
    asked:[],salaryKnown:Boolean(n.agreed),mode:"choices",round:0,closeTimer:null};
  renderRecruitTalk();
  $("recruit-talk-dialog").showModal();
}

function recruitChoices(t){
  const d=recruitDialogue(),q=d.questions;
  if(t.mode==="left") return [];
  if(t.mode==="ended") return [{key:"leave",label:q.leave}];
  const list=d.infoQuestions.filter(key=>!t.asked.includes(key)).map(key=>({key,label:q[key]}));
  if(t.salaryKnown) list.push({key:"negotiate",label:q.negotiate},{key:"sign",label:q.sign});
  else list.push({key:"salary",label:q.salary});
  list.push({key:"leave",label:q.leave});
  return list;
}

function renderRecruitTalk(){
  const t=game.recruitTalk;
  if(!t) return;
  const m=t.mercenary,first=MercenairesRecruitDialogue.firstName(m);
  $("recruit-talk-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("recruit-talk-name").textContent=m.name;
  $("recruit-talk-origin").innerHTML=`${renderPicto("people",m.people,{size:"xs"})}${esc(m.people)} · ${renderPicto("culture",m.culture,{size:"xs"})}${esc(m.culture)}`;
  const log=$("recruit-talk-log");
  log.innerHTML=t.lines.map(line=>line.who==="note"
    ?`<p class="talk-note">${esc(line.text)}</p>`
    :`<p class="talk-say talk-say--${line.who}"><b>${line.who==="you"?"Vous":esc(first)}</b><span>«\u00a0${esc(line.text)}\u00a0»</span></p>`).join("");
  log.scrollTop=log.scrollHeight;
  const candidate=tavernCandidate(t.id);
  if(t.mode==="negotiate"&&candidate){
    const n=tavernRules().negotiationState(candidate);
    $("recruit-talk-choices").innerHTML=`<form id="recruit-offer" class="talk-offer">
      <label>Salaire journalier<span><input id="recruit-offer-salary" type="number" min="0" value="${n.salary}"> PO</span></label>
      <label>Prime de mission<span><input id="recruit-offer-bonus" type="number" min="0" value="${n.bonus}"> PO</span></label>
      <button type="submit" class="talk-offer-btn">Proposer</button>
      <button type="button" class="talk-offer-back" data-talk="back">Retour</button>
    </form>`;
    return;
  }
  $("recruit-talk-choices").innerHTML=`<ol class="talk-options">${recruitChoices(t).map(choice=>
    `<li><button type="button" data-talk="${choice.key}">${esc(choice.label)}</button></li>`).join("")}</ol>`;
}

function recruitTalkChoice(key){
  const t=game.recruitTalk;
  if(!t) return;
  if(key==="leave"){ $("recruit-talk-dialog").close(); return; }
  if(key==="back"){ t.mode="choices"; renderRecruitTalk(); return; }
  if(key==="negotiate"){ t.mode="negotiate"; renderRecruitTalk(); $("recruit-offer-salary")?.focus(); return; }
  const candidate=tavernCandidate(t.id);
  if(!candidate) return;
  const d=recruitDialogue(),m=t.mercenary;
  const n=tavernRules().negotiationState(candidate);
  if(d.infoQuestions.includes(key)){
    t.lines.push({who:"you",text:d.questions[key]},{who:"merc",text:d.answer(key,m)});
    t.asked.push(key);
  }else if(key==="salary"){
    t.lines.push({who:"you",text:d.questions.salary},{who:"merc",text:d.line("salary",m,{salaire:fmt(n.salary),prime:fmt(n.bonus)})});
    t.salaryKnown=true;
  }else if(key==="sign"){
    // Signer, c'est accepter les conditions sur la table : acceptation garantie (doc 14 §9).
    const terms=n.agreed||{salary:n.salary,bonus:n.bonus};
    t.lines.push({who:"you",text:d.line("sign",m,{salaire:fmt(terms.salary),prime:fmt(terms.bonus)})});
    if(!n.agreed) campaignRules().offerToCandidate(game.campaign,t.id,terms);
    finishRecruitment();
    return;
  }
  renderRecruitTalk();
}

function submitRecruitOffer(){
  const t=game.recruitTalk;
  if(!t) return;
  const d=recruitDialogue(),m=t.mercenary;
  const offer={salary:Number($("recruit-offer-salary").value),bonus:Number($("recruit-offer-bonus").value)};
  t.lines.push({who:"you",text:d.line("offer",m,{salaire:fmt(offer.salary),prime:fmt(offer.bonus)})});
  const result=campaignRules().offerToCandidate(game.campaign,t.id,offer);
  t.round+=1;
  t.mode="choices";
  if(result.outcome==="accepted"){
    finishRecruitment();
    return;
  }
  if(result.outcome==="invalid"){
    t.lines.push(result.floor
      ?{who:"merc",text:d.line("floor",m,{salaire:fmt(result.floor.salary),prime:fmt(result.floor.bonus)})}
      :{who:"note",text:result.reason});
  }else if(result.outcome==="counter"){
    t.lines.push({who:"merc",text:d.line("counter",m,{salaire:fmt(result.counter.salary),prime:fmt(result.counter.bonus)},t.round)});
  }else if(result.outcome==="left"){
    // Il renverse la table : la fenêtre se ferme d'elle-même (Idan, 2026-10-21).
    t.lines.push({who:"note",text:d.line("left",m)});
    t.mode="left";
    tavernLog(m.name+" renverse la table et quitte la taverne.","bad");
    t.closeTimer=setTimeout(()=>$("recruit-talk-dialog").close(),2600);
    renderTavern();
  }
  saveGame();
  renderRecruitTalk();
}

function finishRecruitment(){
  const t=game.recruitTalk,d=recruitDialogue(),m=t.mercenary;
  const result=campaignRules().signCandidate(game.campaign,t.id);
  if(result.ok){
    result.mercenary.role="Recrue";
    t.lines.push({who:"merc",text:d.line("accepted",m,{compagnie:companyPhrase()})});
    t.mode="ended";
    tavernLog(m.name+" signe et rejoint la compagnie.","turn");
    saveGame();
    renderGame();
  }else{
    // Dortoir plein (un ogre a besoin de deux places).
    if(result.dormFull) t.lines.push({who:"merc",text:d.line(result.places>1?"dorm_full_ogre":"dorm_full",m)},
      {who:"note",text:result.places>1?result.reason:d.line("dorm_full_note",m)});
    else t.lines.push({who:"note",text:result.reason});
    t.mode="choices";
    saveGame();
  }
  renderRecruitTalk();
}

// Les deux consommations sont pour l'instant des dépenses sans effet de gameplay.
function showTavernView(view="home"){
  for(const [name,id] of [["home","tavern-home"],["missions","tavern-missions-view"],["recruits","tavern-recruits-view"]]){
    $(id).classList.toggle("hidden",name!==view);
  }
  if(view==="missions") renderContractBoard();
  if(view==="recruits") updateRecruitCarousel();
  // La bulle du tavernier n'apparaît que sur l'accueil de la taverne (styles.css).
  document.body.dataset.tavernView=view;
}
// Bière : 1 PO ; tournée : 1 PO par membre de la compagnie. Le résultat va dans le journal (Idan, 2026-10-21).
function buyTavernDrink(kind){
  const c=game.campaign;
  if(!c) return;
  const count=c.company.roster.length; // capitaine compris ; effectif sous contrat actuel
  const cost=kind==="round"?count:1;
  if(c.company.gold<cost){
    tavernLog("Pas assez d'or : "+cost+" PO nécessaires.","warn");
    return;
  }
  c.company.gold-=cost;
  tavernLog(kind==="round"?"Tournée générale : "+cost+" PO pour "+count+" membres.":"Une bière : 1 PO.","gear");
  saveGame();
  renderTavern();
}

// Dialogue avec le tavernier (Idan, 2026-10-21) : boire, payer sa tournée, ou acheter des conseils sur un
// candidat — qui ? quoi ? quelle caractéristique ? —, 1 PO la question, autant qu'on veut. Textes dans
// tavern-dialogue.json (tavernkeeper) ; la phrase d'accueil deviendra variable plus tard.
function captainFirstName(){
  const c=game.campaign;
  const captain=c?.company.roster.find(m=>m.id===c.company.captainId)||game.captain;
  return captain?.firstName||String(captain?.name||"").trim().split(/\s+/)[0]||"Capitaine";
}
function adviceCost(){
  const row=(game.referenceData?.formulaConstants?.rows||[]).find(r=>r.code==="tavern.advice.cost");
  return Number.isFinite(Number(row?.valeur))?Number(row.valeur):1;
}
// Caractéristiques d'un groupe de la fiche (physique, mental, resistance, magie).
function adviceStats(group){
  return (game.referenceData?.characterSheetCopy?.stats||[]).filter(r=>r.groupe===group).map(r=>r.nom);
}
function tavernTalkOptions(t){
  const keeper=recruitDialogue().keeper,o=keeper.options||{};
  const back={key:"back",label:o.back};
  if(t.view==="who") return [...(game.campaign?.tavern.candidates||[]).map(c=>({key:"who",arg:c.mercenary.id,label:MercenairesRecruitDialogue.firstName(c.mercenary)})),back];
  if(t.view==="what") return [...(keeper.groups||[]).map(g=>({key:"group",arg:g.groupe,label:g.label})),back];
  if(t.view==="stats") return [...adviceStats(t.group).map(name=>({key:"stat",arg:name,label:name})),back];
  return ["beer","round","advice","leave"].map(key=>({key,label:o[key]}));
}
function tavernTalkLine(t){
  const d=recruitDialogue(),m=tavernCandidate(t.candidateId)?.mercenary;
  if(t.view==="who") return d.keeperLine(game.campaign?.tavern.candidates.length?"ask_who":"nobody");
  if(t.view==="what"||t.view==="stats") return d.keeperLine("ask_what",{cout:adviceCost()},m);
  return d.keeperLine("greeting",{capitaine:captainFirstName()});
}
function renderTavernTalk(){
  const t=game.tavernTalk;
  if(!t) return;
  $("tavern-talk-line").textContent=`«\u00a0${t.line}\u00a0»`;
  $("tavern-talk-options").innerHTML=tavernTalkOptions(t).map(o=>
    `<li><button type="button" data-talk="${o.key}"${o.arg!=null?` data-arg="${esc(String(o.arg))}"`:""}>${esc(o.label)}</button></li>`).join("");
}
function openTavernTalk(){
  game.tavernTalk={view:"main",candidateId:null,group:null};
  game.tavernTalk.line=tavernTalkLine(game.tavernTalk);
  renderTavernTalk();
  $("tavern-talk-dialog").showModal();
}
function tavernTalk(choice,arg){
  const t=game.tavernTalk;
  if(!t) return;
  if(choice==="leave"){ $("tavern-talk-dialog").close(); return; }
  if(choice==="beer"||choice==="round"){ buyTavernDrink(choice); return; }
  if(choice==="stat"){ askTavernAdvice(arg); renderTavernTalk(); return; }
  if(choice==="advice") t.view="who";
  if(choice==="who"){ t.candidateId=Number(arg); t.view="what"; }
  if(choice==="group"){ t.group=arg; t.view="stats"; }
  if(choice==="back") t.view={stats:"what",what:"who",who:"main"}[t.view]||"main";
  t.line=tavernTalkLine(t);
  renderTavernTalk();
}
// La réponse rapporte ce que le candidat dit de lui-même (il se survend), situé parmi les vraies valeurs de la
// compagnie ; la rumeur reste la même si l'on repose la question, mais chaque question se paie.
function askTavernAdvice(statName){
  const t=game.tavernTalk,d=recruitDialogue();
  const candidate=tavernCandidate(t.candidateId);
  if(!candidate){ t.view="who"; t.line=tavernTalkLine(t); return; }
  const m=candidate.mercenary;
  const result=campaignRules().askTavernkeeper(game.campaign,m.id,statName,sheetStatValue(m,statName));
  if(!result.ok){ t.line=result.reason==="gold"?d.keeperLine("no_gold"):result.reason; return; }
  const members=campaignRoster().map(x=>({name:x.name,firstName:x.firstName,value:sheetStatValue(x,statName)}));
  t.line=d.advice(m,statName,result.estimate,members);
  tavernLog("Conseil du tavernier sur "+m.name+" ("+statName+") : "+fmt(result.cost)+" PO.","gear");
  saveGame();
  renderTavern();
}

function initializeTavernUi(){
  $("tavern-home").addEventListener("click",event=>{
    const open=event.target.closest("[data-tavern-view]");
    if(open) showTavernView(open.dataset.tavernView);
  });
  $("tavern-talk-btn").addEventListener("click",openTavernTalk);
  const talk=$("tavern-talk-dialog");
  talk.addEventListener("click",event=>{
    const option=event.target.closest("[data-talk]");
    if(option&&!option.disabled) tavernTalk(option.dataset.talk,option.dataset.arg);
  });
  talk.addEventListener("close",()=>{ game.tavernTalk=null; });
  for(const id of ["tavern-missions-view","tavern-recruits-view"]){
    $(id).addEventListener("click",event=>{
      const btn=event.target.closest("[data-tavern-view]");
      if(btn) showTavernView(btn.dataset.tavernView);
    });
  }
  // « Accepter le contrat » : contract-ui.js (initializeExpeditionUi), le bouton est dans la fenêtre de détail.

  $("hud-next-day-btn").addEventListener("click",advanceCampDay);
  $("test-gold-btn").addEventListener("click",addTestGold);
  $("tavern-candidates").addEventListener("click",e=>{
    const btn=e.target.closest("[data-tavern-open]");
    if(btn) openRecruitTalk(Number(btn.dataset.tavernOpen));
  });
  initializeRecruitCarousel();
  const recruit=$("recruit-talk-dialog");
  recruit.addEventListener("click",event=>{
    const option=event.target.closest("[data-talk]");
    if(option&&!option.disabled) recruitTalkChoice(option.dataset.talk);
  });
  recruit.addEventListener("submit",event=>{
    event.preventDefault();
    submitRecruitOffer();
  });
  // Comme dans un jeu de rôle : les touches 1 à 9 choisissent la réponse. Écouté sur le document, car la
  // liste est réécrite à chaque réponse et le bouton cliqué emporte le focus avec lui.
  document.addEventListener("keydown",event=>{
    if(event.target.matches?.("input,select,textarea")||event.ctrlKey||event.metaKey||event.altKey) return;
    const index=Number(event.key)-1;
    if(!(index>=0)) return;
    const open=talk.open?talk:recruit.open?recruit:null;
    const option=open?.querySelectorAll(".talk-options [data-talk]")[index];
    if(!option||option.disabled) return;
    event.preventDefault();
    if(open===talk) tavernTalk(option.dataset.talk,option.dataset.arg);
    else recruitTalkChoice(option.dataset.talk);
  });
  recruit.addEventListener("close",()=>{
    clearTimeout(game.recruitTalk?.closeTimer);
    game.recruitTalk=null;
    renderTavern();
  });
}
