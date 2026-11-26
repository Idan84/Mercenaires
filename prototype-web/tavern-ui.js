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
      merchants:{morning:(state,options)=>typeof merchantRules==="function"?merchantRules().morning(state,options):null},
      // La Discrétion d'un déserteur, équipement compris, face à la Tour de guet (desertion.js).
      statOf:(m,name)=>combatEngine().statWithGear({character:m,activeSet:1},name)});
  }
  return game.campaignRules;
}

function startCampaign(captain,squad){
  game.campaign=campaignRules().createCampaign({captain,squad});
  game.tavernLog=[];
  game.dayNews=null;
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
  $("company-gold").classList.toggle("negative",c.company.gold<0||(typeof debtTotal==="function"&&debtTotal(c)>0));
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

// La carte sur parchemin (Idan, 2026-11-19 : « Fond parchemin … Notre bouton (celui du formulaire capitaine) pour aller lui
// parler. On optimise un peu la présentation de la fiche ») : l'origine comme sur la fiche au survol (les pictos du peuple, de
// la culture et de l'ascendance s'il en a une, puis « Ogre des steppes au sang de dragon » ; l'ascendance ajoutée le même jour :
// « on ajoute »), et le bouton de la charte.
// Le papier de la carte (Idan, 2026-11-19 : « Le parchemin des mercenaires varie et reprend ceux des missions ») : une
// des feuilles des annonces (feuille-1…8.webp), au teint de leur papier (noticeLook, contract-ui.js : jamais vers le
// rouge, les plus vieux moins saturés), tirés de l'identifiant du candidat : toujours le même papier pour le même candidat.
// Les feuilles tirées : toutes celles des annonces sauf la 5, dont l'encoche entre trop dans la carte (styles.css).
const RECRUIT_PAPERS=[1,2,3,4,6,7,8];
function recruitPaper(id){
  let h=2166136261;
  for(const ch of "recrue-"+id){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619); }
  const r=()=>{ h^=h>>>13; h=Math.imul(h,0x5bd1e995); h^=h>>>15; return (h>>>0)/4294967296; };
  const paper=RECRUIT_PAPERS[Math.floor(r()*RECRUIT_PAPERS.length)],tone=.9+r()*.12,hue=(r()*2-1)*7,old=hue<-3;
  return {paper,style:`--tone:${tone.toFixed(3)};--hue:${(old?1:hue<0?hue*.3:hue).toFixed(1)}deg;--sat:${old?".72":"1"}`};
}
function renderTavernCard(candidate){
  const m=candidate.mercenary,look=recruitPaper(m.id);
  const origin=typeof originPhrase==="function"?originPhrase({people:m.people||"",culture:m.culture||"",ascendance:m.ascendance||""}):[m.people,m.culture,m.ascendance].filter(Boolean).join(" · ");
  return `<article class="recruit-card" data-paper="${look.paper}" style="${look.style}">
    ${renderAvatar(m,{variant:"recruit",kind:"full"})}
    <div class="recruit-card-body">
      <strong class="recruit-name">${esc(m.name)}</strong>
      <div class="recruit-origins"><span class="recruit-emblems">${renderPicto("people",m.people,{size:null})}${renderPicto("culture",m.culture,{size:null})}${m.ascendance?renderPicto("ascendance",m.ascendance,{size:null}):""}</span><span class="recruit-origin">${esc(origin)}</span></div>
      ${renderReputationStars(m)}
      <small class="recruit-days">${presenceText(candidate)}</small>
    </div>
    <button type="button" class="mission-btn recruit-talk-btn" data-tavern-open="${m.id}">Aller lui parler</button>
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

// Les candidats en carrousel (Idan, 2026-11-04 : « fais un système qui défile comme un carousel »), trois par écran (Idan,
// 2026-11-19 : « Flèche en permanence : les mêmes que pour les missions. Toujours 3 candidats par écran. On slide pour en
// avoir 3 autres ») : la rangée a la largeur de trois cartes, chaque flèche fait glisser de trois cartes (la dernière page
// montre les trois derniers) ; une flèche s'efface quand on ne peut plus aller de ce côté. La rangée ne défile pas : les
// cartes glissent (--recruit-shift) et celles hors de la page s'effacent, pour que rien ne coupe leurs ombres portées.
// La molette tourne les pages, comme sur le panneau des missions (pageWheel, mission.js).
const RECRUITS_PER_PAGE=3;
let recruitFirst=0;
function recruitPage(track){
  const card=track.querySelector(".recruit-card");
  if(!card?.offsetWidth) return null;
  const cs=getComputedStyle(track),gap=parseFloat(cs.columnGap)||0;
  return {step:card.offsetWidth+gap,gap,pad:(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0)};
}
function updateRecruitCarousel(){
  const track=$("tavern-candidates"),carousel=track?.closest(".recruit-carousel");
  if(!carousel) return;
  const page=recruitPage(track),cards=[...track.querySelectorAll(".recruit-card")];
  const last=Math.max(0,cards.length-RECRUITS_PER_PAGE);
  recruitFirst=Math.min(Math.max(0,recruitFirst),last);
  if(page){
    track.style.width=`${RECRUITS_PER_PAGE*page.step-page.gap+page.pad}px`;
    track.style.setProperty("--recruit-shift",`${-recruitFirst*page.step}px`);
  }
  cards.forEach((card,i)=>card.classList.toggle("is-off",i<recruitFirst||i>=recruitFirst+RECRUITS_PER_PAGE));
  const [prev,next]=carousel.querySelectorAll("[data-recruit-scroll]");
  if(prev) prev.disabled=recruitFirst<=0;
  if(next) next.disabled=recruitFirst>=last;
}
// Trois cartes de plus (ou de moins).
function scrollRecruits(direction){
  recruitFirst+=direction*RECRUITS_PER_PAGE;
  updateRecruitCarousel();
}
function initializeRecruitCarousel(){
  const track=$("tavern-candidates"),carousel=track?.closest(".recruit-carousel");
  if(!carousel) return;
  carousel.addEventListener("click",event=>{
    const nav=event.target.closest("[data-recruit-scroll]");
    if(nav) scrollRecruits(Number(nav.dataset.recruitScroll));
  });
  if(typeof pageWheel==="function") track.addEventListener("wheel",pageWheel(scrollRecruits),{passive:false});
  // Recalculé dès que la place change (vue ouverte, fenêtre) : celle du carrousel, la rangée prenant la largeur qu'on lui donne.
  if(typeof ResizeObserver==="function") new ResizeObserver(()=>updateRecruitCarousel()).observe(carousel);
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
    // Quelqu'un attend une réponse (un déserteur repéré, les mutins, l'usurier, une augmentation) : la première de ces
    // discussions s'ouvre, même remise à plus tard (discussions-ui.js).
    if(allowed.desertion!=null||allowed.mutiny||allowed.usurer||allowed.salaryReview!=null){ if(typeof openFirstTalk==="function") openFirstTalk(); return; }
    if(typeof openExpeditionDialog==="function") openExpeditionDialog(allowed.expedition.id);
    return;
  }
  // La Cave (Idan, 2026-11-10) : une bagarre tirée et pas regardée a lieu quand même, avant le lendemain.
  if(typeof resolveUnwatchedCellarFight==="function") resolveUnwatchedCellarFight();
  const [report]=campaignRules().advanceTime(game.campaign,1);
  logDayReport(report);
  // Domaine évolutif (Idan, 2026-11-06) : chaque matin, après les entraînements et les apprentissages de la nuit.
  if(typeof refreshMercenaryDomains==="function") refreshMercenaryDomains(game.campaign.company.roster);
  // Les nouvelles du jour, gardées avec la partie : le pigeon de la barre du bas les rouvre (Idan, 2026-11-14).
  game.dayNews=typeof dayNewsOf==="function"?dayNewsOf(game.campaign.day,report):null;
  saveGame();
  renderGame();
  if(typeof renderContractBoard==="function"&&!$("tavern-missions-view").classList.contains("hidden")) renderContractBoard();
  // Une escouade vient d'arriver : la fenêtre « Commencer le combat » (doc 17).
  if(game.pendingExpeditionDialog){ openExpeditionDialog(game.pendingExpeditionDialog); game.pendingExpeditionDialog=null; }
  // La notification du jour par-dessus (Idan, 2026-10-30 et 2026-10-31 : day-news-ui.js) ; les rapports des
  // lieutenants et l'arrivée d'une escouade attendent dessous.
  if(typeof showDayNews==="function"&&game.dayNews) showDayNews(game.dayNews);
}

// Journal d'une journée passée : guérisons, salaires, Taverne, contrat pris par une autre compagnie (doc 17).
function logDayReport(report){
  for(const r of report.recovered) tavernLog(r.mercenary.name+(r.kind==="wounded"?" est guéri de ses blessures.":" est reposé."),"turn");
  const salaries=report.salaries.paid??report.salaries.total;
  if(salaries) tavernLog("Salaires : −"+fmt(salaries)+" PO.","gear");
  if(typeof logStableUpkeep==="function") logStableUpkeep(report.stable);
  // Les dettes (Idan, 2026-11-10 ; debts-ui.js) : ce que la caisse n'a pas pu payer ; la mutinerie (mutiny-ui.js).
  if(typeof logDebts==="function") logDebts(report);
  if(typeof logMutiny==="function") logMutiny(report.mutiny);
  // L'usurier (Idan, 2026-11-11 ; usurer-ui.js) : la menace des voleurs.
  if(typeof logUsurer==="function") logUsurer(report.usurer);
  if(typeof logTaming==="function") logTaming(report.taming);
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
  // La Cantine (Idan, 2026-11-08) : le plat du jour.
  if(typeof logCanteen==="function") logCanteen(report.canteen);
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
  // Désertion (Idan, 2026-11-04) : celui qui a filé, celui que la Vigie a repéré (la scène s'ouvre avec renderGame).
  if(typeof logDesertion==="function") logDesertion(report.desertion);
}

// Dialogue de recrutement (Idan, 2026-10-21 ; doc 14 §6 bis) : salutation selon l'affinité, puis trois choix (Idan,
// 2026-11-22 : « On va regrouper toutes les questions pour mieux le comprendre comme Puis-je en savoir plus sur vous ?
// (on aura donc 3 choix en menu 1) ») : « Puis-je en savoir plus sur vous ? » (son titre, ses armes, son armure, sa
// magie : il liste ses écoles), « Quelles sont vos prétentions salariales ? » (ensuite Négocier et Signer) et Partir. Chaque réponse
// remplit une case de sa fiche ; ce qu'on a appris reste sur le candidat (recruitDialogue().known). Les règles de
// négociation restent celles de tavern.js (doc 14 §9).
function recruitDialogue(){
  return game.recruitDialogue||(game.recruitDialogue=MercenairesRecruitDialogue.createRecruitDialogue({reference:game.referenceData}));
}

function companyPhrase(){
  const name=String(game.campaign?.company.name||`Compagnie de ${game.captain?.name||"Bob"}`).trim();
  return /^compagnie\b/i.test(name)?"la "+name:"la compagnie "+name;
}

// Son titre tel qu'on le décrit (doc 14 §7) : recalculé sur ses capacités passées par estimate (sa vantardise, ou la
// précision du tavernier), au masculin comme tous les titres. Un candidat n'est ni capitaine ni lieutenant. Un seul tag sur
// ces mêmes capacités devient son titre (Idan, 2026-11-24 : « S'il a un seul tag, son titre devient le tag » ; « oui,
// candidats aussi ») : tags, ses tags tels qu'on les décrit (sinon calculés ici) ; candidate garde son tag de consolation.
// Plusieurs tags : le titre composé de ces tags (tagTitle).
function describedTitle(m,estimate,candidate=null,tags=null){
  const rules=profileRules();
  if(!rules) return "";
  const copy=recruitDialogue().described(m,estimate),context={captain:false,lieutenant:false};
  const tagRules=typeof companyTagRules==="function"?companyTagRules():null;
  const ctx=typeof companyTagContext==="function"?companyTagContext():null;
  if(candidate&&tagRules?.titleTag&&(tags||ctx&&tagRules.describedTags)){
    const res=tags||tagRules.describedTags(copy,candidate,ctx);
    const one=tagRules.titleTag(res);
    if(one) return one.nom.trim();
    // Plusieurs tags : le titre composé (Idan, 2026-11-24).
    const composed=tagRules.tagTitle?.(res);
    if(composed?.name) return composed.name;
  }
  const result=rules.evaluate(copy,context);
  return result&&rules.composeTitle?.(copy,result,context)?.name||"";
}
// Il se vante (×1,10 à ×3,00, le même tirage que pour ses tags : companyTagRules().candidateFactor) ; son titre suit les
// tags qu'il annonce (companyTagRules().candidateTags).
function boastedTitle(candidate){
  const tagRules=typeof companyTagRules==="function"?companyTagRules():null;
  const factor=tagRules?.candidateFactor(candidate)??1;
  const ctx=typeof companyTagContext==="function"?companyTagContext():null;
  const tags=ctx&&tagRules?.candidateTags?tagRules.candidateTags(candidate,ctx):null;
  return describedTitle(candidate.mercenary,value=>value*factor,candidate,tags);
}
// Son armure : l'objet porté.
function wornArmor(m){
  const id=m.equipment?.slots?.armor;
  return id==null?null:(m.items||[]).find(item=>String(item.id)===String(id))||null;
}

// La fiche repliée sous la boîte de dialogue (Idan, 2026-11-25) ; le choix tient le temps de la partie ouverte.
function setRecruitFolded(folded){
  game.recruitFolded=folded;
  const dialog=$("recruit-talk-dialog"),button=dialog?.querySelector?.(".conv-fold");
  dialog?.classList?.toggle("is-folded",folded);
  if(button){
    const label=folded?"Déplier la fiche":"Replier la fiche";
    button.setAttribute("aria-expanded",String(!folded));
    button.setAttribute("aria-label",label);
    button.title=label;
  }
}

function openRecruitTalk(id){
  const candidate=tavernCandidate(id);
  if(!candidate) return;
  const m=candidate.mercenary;
  const n=tavernRules().negotiationState(candidate);
  if(n.agreed) recruitDialogue().known(candidate).salary=true;
  game.recruitTalk={id,mercenary:m,lines:[{who:"merc",text:recruitDialogue().greeting(m,captainAffinity(m)?.total)}],
    mode:"choices",round:0,closeTimer:null};
  renderRecruitTalk();
  setRecruitFolded(Boolean(game.recruitFolded));
  $("recruit-talk-dialog").showModal();
}

// Les choix du moment : le menu (choices) ou ses questions sur lui (about).
function recruitChoices(t){
  const d=recruitDialogue(),q=d.questions,candidate=tavernCandidate(t.id);
  if(t.mode==="left") return [];
  if(t.mode==="ended") return [{key:"leave",label:q.leave}];
  const k=candidate?d.known(candidate):{asked:{}};
  if(t.mode==="about") return [...d.aboutLeft(k).map(key=>({key,label:q[key]})),{key:"back",label:q.back}];
  const list=d.aboutLeft(k).length?[{key:"about",label:q.about}]:[];
  if(!k.asked.steward&&tavernSteward()&&d.stewardOption?.()) list.push({key:"steward",label:d.stewardOption()});
  if(k.salary) list.push({key:"negotiate",label:q.negotiate},{key:"sign",label:q.sign});
  else list.push({key:"salary",label:q.salary});
  list.push({key:"leave",label:q.leave});
  return list;
}

// Sa fiche (Idan, 2026-11-22 : « reprendre le contenu de la fiche au survol, d'ajouter son portrait, une boite de
// dialogue ») : ce qu'on ne sait pas encore est un « ? » ; on connaît ses origines et sa réputation, le reste vient des
// réponses (doc 14 §6 bis). Le salaire et la prime suivent la négociation (sa demande, puis ses contre-propositions).
function recruitCardOptions(candidate){
  const d=recruitDialogue(),k=d.known(candidate),n=tavernRules().negotiationState(candidate),terms=n.agreed||n;
  const unknown=new Set(["mount"]),title=d.shownTitle(k),shown=d.shownTags?.(k)||null;
  if(!shown) unknown.add("tags");
  if(title==null) unknown.add("title");
  if(k.affinity==null) unknown.add("affinity");
  if(!k.salary){ unknown.add("salary"); unknown.add("bonus"); }
  for(const key of ["set1","set2","armor","magic"]) if(!k.asked[key]) unknown.add(key);
  return {unknown,salary:terms.salary,bonus:terms.bonus,title,affinityWord:k.affinity!=null?d.affinityWord(k.affinity):null,
    knownTags:shown?shown.names:null,tagSource:shown?d.tagSourceLabel(shown.source,candidate.mercenary):null};
}

// Les répliques d'une discussion (Idan, 2026-11-24, d'après la maquette de Chatty) : la vignette et le nom de qui parle,
// sa réplique dans une bulle (les autres à gauche, le capitaine à droite : « Vous ») ; le récit, centré, sans bulle.
// speaker(line) : la personne qui parle (sa vignette) ; first : le nom par défaut des autres.
function talkCaptain(){
  const company=game.campaign?.company;
  return company?.roster.find(m=>m.id===company.captainId)||game.captain||null;
}
function talkMini(person){
  const src=person&&typeof mercenaryAvatarUrl==="function"?mercenaryAvatarUrl(person,"portrait"):null;
  const initials=person&&typeof avatarInitials==="function"?avatarInitials(person):"?";
  return `<span class="talk-mini" aria-hidden="true"><i>${esc(initials)}</i>${src?`<img src="${esc(src)}" alt="" decoding="async" onerror="this.remove()">`:""}</span>`;
}
function renderTalkLines(lines,speaker,first){
  return lines.map(line=>line.who==="note"
    ?`<p class="talk-note">${esc(line.text)}</p>`
    :`<div class="talk-say talk-say--${line.who}">${talkMini(speaker(line))}<div class="talk-say-body"><b>${line.who==="you"?"Vous":esc(line.name||first)}</b><span>« ${esc(line.text)} »</span></div></div>`).join("");
}

function renderRecruitTalk(){
  const t=game.recruitTalk;
  if(!t) return;
  const m=t.mercenary,first=MercenairesRecruitDialogue.firstName(m);
  const candidate=tavernCandidate(t.id);
  if(candidate&&typeof renderMercenaryHoverCard==="function"){
    $("recruit-talk-card").innerHTML=renderMercenaryHoverCard(m,recruitCardOptions(candidate));
    const card=$("recruit-talk-card").querySelector(".hover-card");
    if(card&&typeof fitHoverCard==="function") requestAnimationFrame(()=>fitHoverCard(card));
  }
  $("recruit-talk-name").textContent=m.name;
  $("recruit-talk-origin").innerHTML=`${renderPicto("people",m.people,{size:"xs"})}${esc(m.people)} · ${renderPicto("culture",m.culture,{size:"xs"})}${esc(m.culture)}`;
  const log=$("recruit-talk-log");
  const steward=t.lines.some(line=>line.face==="steward")?tavernSteward():null;
  log.innerHTML=renderTalkLines(t.lines,line=>line.who==="you"?talkCaptain():line.face==="steward"?steward:m,first);
  // La dernière réplique toujours visible, une fois les réponses posées en dessous (elles changent la hauteur).
  log.scrollTop=log.scrollHeight;
  requestAnimationFrame(()=>{ log.scrollTop=log.scrollHeight; });
  if(t.mode==="negotiate"&&candidate){
    $("recruit-talk-choices").innerHTML=renderRecruitOffer(tavernRules().negotiationState(candidate));
    syncRecruitOffer();
    return;
  }
  // Les mots composés (« avez-vous », « maniez-vous ») ne se coupent pas à leur trait d'union : la ligne passe avant eux ;
  // la ponctuation double (? ! : ; ») reste collée au mot qui la précède (espace insécable), jamais seule sur sa ligne.
  const unbroken=text=>esc(text).replace(/\S*-\S*/g,word=>`<span class="talk-nobr">${word}</span>`).replace(/ ([?!:;»])/g,"\u00a0$1");
  $("recruit-talk-choices").innerHTML=`<ol class="talk-options">${recruitChoices(t).map((choice,i)=>
    `<li><button type="button" data-talk="${choice.key}"><span class="talk-num" aria-hidden="true">${i+1}</span><span class="talk-choice">${unbroken(choice.label)}</span></button></li>`).join("")}</ol>`;
}

// Les tags d'un candidat, en noms (game-core/company-tags.js ; Idan, 2026-11-24 : « tes suggestions sont parfaites ») : tels
// qu'il les annonce (candidate, sa vantardise), tels que le tavernier les estime (keeper, draw : ses estimations à ±10 %),
// tels que l'intendant les voit (steward, son biais). null sans les règles des tags.
function candidateTagNames(candidate,source,draw=null){
  const rules=typeof companyTagRules==="function"?companyTagRules():null;
  const ctx=typeof companyTagContext==="function"?companyTagContext():null;
  if(!rules||!ctx) return null;
  const res=source==="steward"?rules.stewardCandidateTags?.(candidate,ctx)
    :source==="keeper"?rules.describedTags?.(recruitDialogue().described(candidate.mercenary,value=>value*draw()),candidate,ctx)
    :rules.candidateTags?.(candidate,ctx);
  return res?res.affiches.map(t=>t.nom.trim()):null;
}
// L'intendant de la compagnie (le nommé, sinon Cruxor) ; aucun : pas d'avis.
function tavernSteward(){
  return typeof companyTagContext==="function"?companyTagContext()?.steward||null:null;
}

// Sa réponse à une question sur lui (title, tags, set1, set2, armor, magic) ; elle remplit sa case et la question disparaît.
function recruitAnswer(candidate,key){
  const d=recruitDialogue(),m=candidate.mercenary,k=d.known(candidate);
  if(key==="title"){
    const title=boastedTitle(candidate);
    k.asked.title=true;
    k.title=title;
    return title?d.answer("title",m,{titre:title}):d.answer("no_title",m);
  }
  if(key==="tags"){
    k.asked.tags=true;
    const names=candidateTagNames(candidate,"candidate")||[];
    k.tags=names;
    return names.length?d.answer("tags",m,{tags:d.listNames(names)}):d.answer("tags_none",m);
  }
  if(key==="set1"||key==="set2"){
    k.asked[key]=true;
    const names=mercenaryHoverData(m).sets[key==="set1"?0:1];
    return names.length?d.answer(key,m,{armes:d.withArticles(names,m)}):d.answer(key+"_none",m);
  }
  if(key==="armor"){
    k.asked.armor=true;
    const armor=wornArmor(m);
    if(!armor) return d.answer("armor_none",m);
    return armor.category==="Vêtement"?d.answer("armor_clothes",m):d.answer("armor",m,{armure:armor.name||armor.category});
  }
  if(key==="magic"){
    // Il liste ses écoles (celles où il a au moins un sort, comme les pictos de sa fiche).
    k.asked.magic=true;
    const schools=mercenaryHoverData(m).schools;
    return schools.length?d.answer("magic",m,{ecoles:d.schoolList(schools)}):d.answer("no_magic",m);
  }
  return "";
}

function recruitTalkChoice(key){
  const t=game.recruitTalk;
  if(!t) return;
  if(key==="leave"){ $("recruit-talk-dialog").close(); return; }
  if(key==="back"){ t.mode="choices"; renderRecruitTalk(); return; }
  if(key==="negotiate"){ t.mode="negotiate"; renderRecruitTalk(); $("recruit-offer-salary")?.focus(); return; }
  if(key==="about"){ t.mode="about"; renderRecruitTalk(); return; }
  const candidate=tavernCandidate(t.id);
  if(!candidate) return;
  const d=recruitDialogue(),m=t.mercenary,k=d.known(candidate);
  const n=tavernRules().negotiationState(candidate);
  if(key==="steward"){
    const steward=tavernSteward();
    if(!steward) return;
    const names=candidateTagNames(candidate,"steward")||[];
    k.asked.steward=true;
    k.stewardTags=names;
    t.lines.push({who:"you",text:d.stewardAsk(steward)},
      {who:"merc",face:"steward",name:MercenairesRecruitDialogue.firstName(steward),text:d.stewardAnswer(steward,m,names)});
    saveGame();
  }else if(d.aboutQuestions.includes(key)){
    const answer=recruitAnswer(candidate,key);
    if(!answer) return;
    t.lines.push({who:"you",text:d.questions[key]},{who:"merc",text:answer});
    // Plus rien à lui demander : retour au menu.
    if(!d.aboutLeft(k).length) t.mode="choices";
    saveGame();
  }else if(key==="salary"){
    t.lines.push({who:"you",text:d.questions.salary},{who:"merc",text:d.line("salary",m,{salaire:fmt(n.salary),prime:fmt(n.bonus)})});
    k.salary=true;
    saveGame();
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

// La négociation dans le plateau des boutons (Idan, 2026-11-26 : « La partie négociation du salaire. Tu me fais une première
// version », puis « On garde seulement les flèches simples. On aligne la pointe des flèches simples entre les deux boutons à
// droite. On vire tout ce qui est sous chaque montant ») : le salaire journalier et la prime de mission côte à côte, chacun
// dans un champ au cadre doré sur le velours brun (le cadre doré de la charte), entre les flèches dorées du kit dans les
// ronds de la croix de la boîte (1 PO) ; à droite, Proposer et Retour, les boutons des réponses. Après un refus, l'offre
// refusée est le plancher (doc 14 §9, règle anti-spam) : la flèche vers le bas s'éteint là. Les règles restent celles de
// tavern.js (makeOffer) ; une offre acceptée signe aussitôt (finishRecruitment).
function renderRecruitOffer(n){
  const step=(dir,label)=>`<button type="button" class="offer-step offer-step--${dir}" data-offer-step="${dir==="down"?-1:1}" aria-label="1 PO ${label}"></button>`;
  const amount=(key,label,value,floor)=>`<div class="offer-amount" data-offer="${key}" data-floor="${floor}">
      <span class="offer-label">${label}</span>
      <div class="offer-stepper">${step("down","de moins")}<label class="offer-field"><img src="assets/hud/picto-or.webp" alt=""><input id="recruit-offer-${key}" type="number" inputmode="numeric" min="${floor}" step="1" value="${value}" aria-label="${label}"><span>PO</span></label>${step("up","de plus")}</div>
    </div>`;
  return `<form id="recruit-offer" class="offer-contract">
    ${amount("salary","Salaire journalier",n.salary,n.refused?.salary||0)}
    ${amount("bonus","Prime de mission",n.bonus,n.refused?.bonus||0)}
    <ol class="talk-options offer-actions">
      <li><button type="submit"><span class="talk-choice">Proposer</span></button></li>
      <li><button type="button" data-offer-back><span class="talk-choice">Retour</span></button></li>
    </ol>
  </form>`;
}
// La flèche vers le bas éteinte au plancher.
function syncRecruitOffer(){
  for(const box of document.querySelectorAll("#recruit-offer .offer-amount")){
    const value=Math.max(0,Math.round(Number(box.querySelector("input").value)||0));
    box.querySelector(".offer-step--down").disabled=value<=(Number(box.dataset.floor)||0);
  }
}
function stepRecruitOffer(button){
  const box=button.closest(".offer-amount"),input=box.querySelector("input"),floor=Number(box.dataset.floor)||0;
  input.value=Math.max(floor,Math.round(Number(input.value)||0)+Number(button.dataset.offerStep));
  syncRecruitOffer();
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
    // Il renverse la table (Idan, 2026-10-21) : le pop-up du départ, qui ferme la discussion (Idan, 2026-11-26).
    const said=d.line("left",m);
    t.lines.push({who:"note",text:said});
    t.mode="left";
    tavernLog(m.name+" renverse la table et quitte la taverne.","bad");
    saveGame();
    openRecruitLeft(m,said);
    return;
  }
  saveGame();
  renderRecruitTalk();
}

function finishRecruitment(){
  const t=game.recruitTalk,d=recruitDialogue(),m=t.mercenary;
  const result=campaignRules().signCandidate(game.campaign,t.id);
  if(result.ok){
    result.mercenary.role="Recrue";
    const said=d.line("accepted",m,{compagnie:companyPhrase()});
    t.lines.push({who:"merc",text:said});
    t.mode="ended";
    tavernLog(m.name+" signe et rejoint la compagnie.","turn");
    saveGame();
    renderGame();
    // Le pop-up de bienvenue (Idan, 2026-11-26) : dès la signature ; sa réplique passe dans le pop-up.
    openRecruitWelcome(result.mercenary,said);
    return;
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

// Le pop-up de bienvenue (Idan, 2026-11-26 : « Après avoir signé le mercenaire, un pop up apparaît » ; hover-card-ui.js,
// renderWelcomeCard) : la discussion se ferme, le pop-up s'ouvre sur le même fond noir flou. Dessous, trois boutons :
// continuer le recrutement (les candidats), aller boire un verre (la salle de la Taverne : « Salle de la Taverne »), retour
// au camp. Échap le ferme comme « Continuer le recrutement ».
function openRecruitWelcome(m,said){
  const contract=m.contract||{};
  const host=$("recruit-welcome-card");
  host.innerHTML=renderWelcomeCard(m,{line:said,join:recruitDialogue().line("welcome",m),
    salary:Number(contract.dailySalary)||0,bonus:Number(contract.missionBonus)||0});
  const card=host.querySelector(".hover-card");
  if(card&&typeof fitHoverCard==="function") requestAnimationFrame(()=>fitHoverCard(card));
  $("recruit-talk-dialog").close();
  $("recruit-welcome-dialog").showModal();
}
// Le pop-up du départ (Idan, 2026-11-26 : « le renversement de table… en mode pop up pour forcer à quitter » ; hover-card-ui.js,
// renderLeftCard) : la discussion se ferme, sa fiche tombe de travers sur le même fond noir flou ; ce qu'il fait en partant,
// « Prénom a quitté la taverne ». Un seul bouton : Continuer le recrutement.
function openRecruitLeft(m,said){
  const host=$("recruit-left-card");
  host.innerHTML=renderLeftCard(m,{line:said,gone:recruitDialogue().line("left_gone",m)});
  const card=host.querySelector(".hover-card");
  if(card&&typeof fitHoverCard==="function") requestAnimationFrame(()=>fitHoverCard(card));
  $("recruit-talk-dialog").close();
  $("recruit-left-dialog").showModal();
}
function recruitWelcomeChoice(key){
  $("recruit-welcome-dialog").close();
  if(key==="drink") showTavernView("home");
  else if(key==="camp"&&typeof openCampScene==="function") openCampScene("home");
  else showTavernView("recruits");
}

// Les deux consommations sont pour l'instant des dépenses sans effet de gameplay.
function showTavernView(view="home"){
  for(const [name,id] of [["home","tavern-home"],["missions","tavern-missions-view"],["recruits","tavern-recruits-view"],["canteen","tavern-canteen-view"],["cellar","tavern-cellar-view"]]){
    $(id).classList.toggle("hidden",name!==view);
  }
  if(view==="missions") renderContractBoard();
  if(view==="recruits") updateRecruitCarousel();
  if(view==="canteen"&&typeof renderCanteen==="function") renderCanteen();
  if(view==="cellar"&&typeof renderCellar==="function") renderCellar();
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

// Dialogue avec le tavernier (Idan, 2026-10-21 ; doc 14 §6 bis, 2026-11-19) : boire, payer sa tournée, ou lui poser
// des questions sur un candidat — qui ? puis « Qu'est-ce qu'on dit de lui ? » (son titre) ou « Il m'apprécierait, à ton
// avis ? » (son affinité, en un mot) —, 1 PO la question, autant qu'on veut. Ses réponses vont sur la fiche du candidat.
// Textes dans tavern-dialogue.json (tavernkeeper) ; la phrase d'accueil deviendra variable plus tard.
function captainFirstName(){
  const c=game.campaign;
  const captain=c?.company.roster.find(m=>m.id===c.company.captainId)||game.captain;
  return captain?.firstName||String(captain?.name||"").trim().split(/\s+/)[0]||"Capitaine";
}
function adviceCost(){
  const row=(game.referenceData?.formulaConstants?.rows||[]).find(r=>r.code==="tavern.advice.cost");
  return Number.isFinite(Number(row?.valeur))?Number(row.valeur):1;
}
// Caractéristiques d'un groupe de la fiche (physique, mental, resistance, magie) : pour l'Intendant (steward-ui.js).
function adviceStats(group){
  return (game.referenceData?.characterSheetCopy?.stats||[]).filter(r=>r.groupe===group).map(r=>r.nom);
}
function tavernTalkOptions(t){
  const d=recruitDialogue(),keeper=d.keeper,o=keeper.options||{};
  const back={key:"back",label:o.back};
  if(t.view==="who") return [...(game.campaign?.tavern.candidates||[]).map(c=>({key:"who",arg:c.mercenary.id,label:MercenairesRecruitDialogue.firstName(c.mercenary)})),back];
  if(t.view==="what"){
    const m=tavernCandidate(t.candidateId)?.mercenary||null;
    return [...["title","tags","affinity"].map(kind=>({key:"ask",arg:kind,label:d.keeperQuestion(kind,m)})),back];
  }
  // L'usurier (Idan, 2026-11-11 ; usurer-ui.js) : la petite avance de trésorerie, ou son remboursement.
  const usurer=typeof usurerTavernOptions==="function"?usurerTavernOptions():[];
  return [...["beer","round","advice"].map(key=>({key,label:o[key]})),...usurer,{key:"leave",label:o.leave}];
}
function tavernTalkLine(t){
  const d=recruitDialogue(),m=tavernCandidate(t.candidateId)?.mercenary;
  if(t.view==="who") return d.keeperLine(game.campaign?.tavern.candidates.length?"ask_who":"nobody");
  if(t.view==="what") return d.keeperLine("ask_what",{cout:adviceCost()},m);
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
  game.tavernTalk={view:"main",candidateId:null};
  game.tavernTalk.line=tavernTalkLine(game.tavernTalk);
  renderTavernTalk();
  $("tavern-talk-dialog").showModal();
}
function tavernTalk(choice,arg){
  const t=game.tavernTalk;
  if(!t) return;
  if(choice==="leave"){ $("tavern-talk-dialog").close(); return; }
  if(choice==="beer"||choice==="round"){ buyTavernDrink(choice); return; }
  if(choice==="ask"){ askTavernAbout(arg); renderTavernTalk(); return; }
  if((choice==="usurer"||choice==="usurer_pay")&&typeof usurerTavernChoice==="function"){
    const line=usurerTavernChoice(choice);
    if(line) t.line=line;
    renderTavernTalk();
    return;
  }
  if(choice==="advice") t.view="who";
  if(choice==="who"){ t.candidateId=Number(arg); t.view="what"; }
  if(choice==="back") t.view={what:"who",who:"main"}[t.view]||"main";
  t.line=tavernTalkLine(t);
  renderTavernTalk();
}
// Sa réponse (doc 14 §7) : le titre recalculé sur ses estimations des capacités du candidat (±10 % chacune), ou son
// affinité avec le capitaine estimée à ±10 %, en un mot. Elle reste la même si l'on repose la question, mais chaque
// question se paie (campaign.js, askTavernkeeper).
function askTavernAbout(kind){
  const t=game.tavernTalk,d=recruitDialogue();
  const candidate=tavernCandidate(t.candidateId);
  if(!candidate||!["title","tags","affinity"].includes(kind)){ t.view="who"; t.line=tavernTalkLine(t); return; }
  const m=candidate.mercenary;
  const compute=kind==="title"
    ?draw=>describedTitle(m,value=>value*draw(),candidate)
    :kind==="tags"?draw=>candidateTagNames(candidate,"keeper",draw)||[]
    :draw=>Math.round((Number(captainAffinity(m)?.total)||0)*draw());
  const result=campaignRules().askTavernkeeper(game.campaign,m.id,kind,compute);
  if(!result.ok){ t.line=result.reason==="gold"?d.keeperLine("no_gold"):result.reason; return; }
  const k=d.known(candidate);
  if(kind==="title"){
    k.keeperTitle=result.answer;
    t.line=d.keeperAnswer(result.answer?"title":"no_title",m,{titre:result.answer});
  }else if(kind==="tags"){
    k.keeperTags=result.answer;
    t.line=d.keeperAnswer(result.answer.length?"tags":"no_tags",m,{tags:d.listNames(result.answer)});
  }else{
    k.affinity=result.answer;
    t.line=d.keeperAnswer(d.affinityWord(result.answer),m);
  }
  tavernLog("Question au tavernier sur "+m.name+" : "+fmt(result.cost)+" PO.","gear");
  saveGame();
  renderTavern();
}

// Les salles de la taverne et son tavernier, depuis les zones de l'accueil de la taverne (tavern-scene-ui.js). Le picto
// Taverne de la barre du bas mène juste à la taverne (Idan, 2026-11-14 : « pas de menu déroulant »).
function openTavernPlace(key){
  if(typeof openCampScene==="function") openCampScene("tavern");
  if(key==="talk") openTavernTalk();
  else showTavernView(key);
}

function initializeTavernUi(){
  const talk=$("tavern-talk-dialog");
  talk.addEventListener("click",event=>{
    const option=event.target.closest("[data-talk]");
    if(option&&!option.disabled) tavernTalk(option.dataset.talk,option.dataset.arg);
  });
  talk.addEventListener("close",()=>{ game.tavernTalk=null; });
  for(const id of ["tavern-missions-view","tavern-recruits-view","tavern-canteen-view","tavern-cellar-view"]){
    $(id).addEventListener("click",event=>{
      // Pas le <body> (qui porte data-tavern-view, la vue ouverte) : seulement un bouton de la vue.
      const btn=event.target.closest("[data-tavern-view]:not(body)");
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
    // Replier la fiche sous la boîte (Idan, 2026-11-25), ou la rouvrir par ce qui dépasse.
    if(event.target.closest(".conv-fold")||recruit.classList.contains("is-folded")&&event.target.closest("#recruit-talk-card")){
      setRecruitFolded(!recruit.classList.contains("is-folded"));
      return;
    }
    const step=event.target.closest("[data-offer-step]");
    if(step){ if(!step.disabled) stepRecruitOffer(step); return; }
    if(event.target.closest("[data-offer-back]")){ recruitTalkChoice("back"); return; }
    const option=event.target.closest("[data-talk]");
    if(option&&!option.disabled) recruitTalkChoice(option.dataset.talk);
  });
  recruit.addEventListener("input",event=>{ if(event.target.closest("#recruit-offer")) syncRecruitOffer(); });
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
  // Espace replie ou rouvre la fiche (Idan, 2026-11-25). Écouté avant tout le monde, et retenu jusqu'au relâché : il ne
  // déclenche pas en plus le bouton qui a le focus. Pas dans un champ de saisie (la négociation).
  const isSpace=event=>event.code==="Space"||event.key===" ";
  const spaceFolds=event=>recruit.open&&isSpace(event)&&!event.target.matches?.("input,select,textarea")&&!event.ctrlKey&&!event.metaKey&&!event.altKey;
  document.addEventListener("keydown",event=>{
    if(!spaceFolds(event)) return;
    event.preventDefault();
    if(!event.repeat) setRecruitFolded(!recruit.classList.contains("is-folded"));
  },true);
  document.addEventListener("keyup",event=>{ if(spaceFolds(event)) event.preventDefault(); },true);
  recruit.addEventListener("close",()=>{
    clearTimeout(game.recruitTalk?.closeTimer);
    game.recruitTalk=null;
    renderTavern();
  });
  $("recruit-welcome-dialog").addEventListener("click",event=>{
    const button=event.target.closest("[data-welcome]");
    if(button) recruitWelcomeChoice(button.dataset.welcome);
  });
  $("recruit-left-dialog").addEventListener("click",event=>{
    if(!event.target.closest("[data-left]")) return;
    $("recruit-left-dialog").close();
    showTavernView("recruits");
  });
}
