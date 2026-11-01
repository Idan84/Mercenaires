"use strict";

// Tableau des missions de la Taverne (doc 17, Idan 2026-10-24, refait le 2026-10-31) : « Faire le ménage » (camp gobelin),
// proposée en boucle, et une offre de garde du corps (Idan, 2026-10-25), en cartes au même gabarit. Les offres et leurs règles sont dans game-core/missions.js et
// game-core/bodyguard.js, le combat dans mission.js.
function missionRules(){
  return game.missionRules||(game.missionRules=MercenairesMissions.createMissionRules({reference:game.referenceData}));
}

function contractOffer(){
  const c=game.campaign;
  if(!c) return null;
  if(campaignRules().ensureMissionOffer(c)) saveGame();
  return c.missionBoard?.offer||null;
}

// Date du calendrier du Royaume (camp-calendar.js) : « 4 Brumecendre », et l'an.
function contractDate(day){
  try{
    const d=campaignCalendarDate(day,game.referenceData);
    return {label:d.dayOfMonth+" "+d.month,year:d.year};
  }catch(error){
    return {label:"jour "+day,year:""};
  }
}

function contractOrder(offer){
  const created=contractDate(offer.day),expires=contractDate(offer.expiresDay);
  return missionRules().orderText(offer,{date:created.label,date_expiration:expires.label,an:created.year,récompense:fmt(offer.reward)});
}

// Garde du corps (Idan, 2026-10-25) : une offre à la fois, payée d'avance, sans combat.
function bodyguardOffer(){
  const c=game.campaign;
  if(!c) return null;
  if(campaignRules().ensureBodyguardOffer(c)) saveGame();
  return c.bodyguardBoard?.offer||null;
}
function bodyguardTexts(){ return game.referenceData?.bodyguardMissions?.textes||{}; }
// Les étoiles d'un niveau (1 à 15), comme la réputation.
function levelStars(level,detail=""){
  const info=starRules().byLevel(Number(level)||1);
  return info?renderStarLevel(info,detail):"—";
}

// Tableau des missions (Idan, 2026-10-31) : une carte par mission qui résume (illustration, type, titre, description,
// difficulté en étoiles, récompense, durée), et au clic le détail, joliment présenté. Chaque mission passe par le même
// gabarit (missionCards) : ajouter un type de mission, c'est ajouter un gabarit. L'illustration vient des données
// (illustration : chemin d'une image) ; vide, un emblème la remplace en attendant l'image.
const MISSION_ICONS={
  contract:'<path d="M14.5 4.5h5v5L9 20l-3-3zM4 20l2.5-2.5M7 14l3 3"/><path d="M9.5 4.5h-5v5l3.2 3.2M14 17l3 3 2.5-2.5-3-3"/>',
  bodyguard:'<path d="M12 3 5 6v5c0 4.6 3 8.2 7 10 4-1.8 7-5.4 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  gold:'<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.6-.8-1.6-1.2-2.8-1.2-1.7 0-2.8.9-2.8 2.1 0 2.8 5.7 1.5 5.7 4.1 0 1.2-1.2 2.1-2.9 2.1-1.3 0-2.4-.5-3-1.3M12 6.5v1.5M12 16.3v1.5"/>',
  days:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  crew:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.6-.3 4.5 1.3 5 4.3"/>',
  enemies:'<path d="M12 3c4.4 0 7 3 7 6.8 0 2.4-1.2 3.9-2.6 4.8V18H7.6v-3.4C6.2 13.7 5 12.2 5 9.8 5 6 7.6 3 12 3z"/><path d="M9.3 11h.01M14.7 11h.01M10 18v3M14 18v3" stroke-width="2.2"/>',
  client:'<path d="M6 3.5h9l3 3V20.5H6z"/><path d="M15 3.5v3h3M9 11h6M9 14.5h6M9 18h4"/>',
  expires:'<path d="M7 3.5h10M7 20.5h10M8 3.5c0 4 4 5 4 8.5s-4 4.5-4 8.5M16 3.5c0 4-4 5-4 8.5s4 4.5 4 8.5"/>'
};
function missionIcon(kind){
  return `<svg class="mission-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${MISSION_ICONS[kind]||""}</svg>`;
}
const missionDays=n=>n+" jour"+(n>1?"s":"");

// Les gabarits : une carte par offre ouverte, toutes au même format.
function missionCards(){
  const cards=[];
  const offer=contractOffer();
  if(offer){
    const def=(game.referenceData?.oneShotMissions?.missions||[]).find(m=>m.code===offer.code)||{};
    const order=contractOrder(offer);
    cards.push({id:"contract:"+offer.id,kind:"contract",type:offer.name,title:offer.campName+" de "+offer.fields.lieu,
      illustration:def.illustration||"",description:def.description||"",
      difficulty:{level:offer.difficulty||1,label:"Difficulté"},
      reward:fmt(offer.reward)+" PO",rewardNote:"+ butin",duration:missionDays(offer.distance)+" de marche",
      facts:[["client","Commanditaire",order?.from||""],["days","Distance",missionDays(offer.distance)+" de marche, "+missionDays(2*offer.distance)+" aller-retour"],
        ["enemies","Ennemis",offer.faction+", "+offer.fields.estimation],["gold","Récompense",fmt(offer.reward)+" PO + butin"],
        ["expires","Expire le",contractDate(offer.expiresDay).label]],
      letter:order,action:{label:"Accepter le contrat",attr:"data-contract-accept"}});
  }
  const guard=bodyguardOffer();
  if(guard){
    const t=bodyguardTexts(),plural=guard.count>1;
    cards.push({id:"bodyguard:"+guard.id,kind:"bodyguard",type:t.titre||"Garde du corps",title:guard.client,
      illustration:game.referenceData?.bodyguardMissions?.illustration||"",
      description:MercenairesRecruitDialogue.fill(t.offre||"",{client:guard.client,n:guard.count,s:plural?"s":"",jours:guard.days},false),
      difficulty:{level:guard.level,label:"Réputation minimale"},
      reward:fmt(guard.payment)+" PO",rewardNote:"d’avance",duration:missionDays(guard.days),
      facts:[["crew","Mercenaires",String(guard.count)],["days","Durée",missionDays(guard.days)+", sans combat"],
        ["gold","Paiement d’avance",fmt(guard.payment)+" PO"],["expires","Expire le",contractDate(guard.expiresDay).label]],
      letter:null,action:{label:plural?"Choisir les gardes":"Choisir le garde",attr:"data-bodyguard-accept"}});
  }
  return cards;
}

function renderMissionArt(card,big=false){
  return `<div class="mission-art mission-art--${esc(card.kind)}${big?" mission-art--big":""}">${card.illustration
    ?`<img src="${esc(card.illustration)}" alt="" loading="lazy">`
    :`<span class="mission-emblem">${missionIcon(card.kind)}</span>`}</div>`;
}
function renderMissionCard(card){
  return `<article class="mission-card" data-mission-open="${esc(card.id)}" role="button" tabindex="0" aria-label="${esc(card.title)}">
    ${renderMissionArt(card)}
    <div class="mission-card-body">
      <p class="mission-type">${esc(card.type)}</p>
      <h3>${esc(card.title)}</h3>
      <p class="mission-description">${esc(card.description)}</p>
      <div class="mission-stats">
        <span class="mission-stat" title="${esc(card.difficulty.label)}">${levelStars(card.difficulty.level,card.difficulty.label)}</span>
        <span class="mission-stat" title="Récompense">${missionIcon("gold")}<b>${esc(card.reward)}</b></span>
        <span class="mission-stat" title="Durée">${missionIcon("days")}${esc(card.duration)}</span>
      </div>
    </div>
  </article>`;
}

function openMissionDetail(id){
  const card=missionCards().find(c=>c.id===id);
  const dialog=$("mission-detail");
  if(!card||!dialog) return;
  $("mission-detail-body").innerHTML=`${renderMissionArt(card,true)}
    <header class="mission-detail-head">
      <p class="mission-type">${esc(card.type)}</p>
      <h2 id="mission-detail-title">${esc(card.title)}</h2>
      <span class="mission-detail-level" title="${esc(card.difficulty.label)}"><small>${esc(card.difficulty.label)}</small>${levelStars(card.difficulty.level,card.difficulty.label)}</span>
    </header>
    <p class="mission-detail-description">${esc(card.description)}</p>
    <dl class="mission-facts">${card.facts.filter(([, ,value])=>value).map(([icon,label,value])=>`<div><dt>${missionIcon(icon)}${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>
    ${card.letter?`<div class="contract-letter">${card.letter.paragraphs.map(p=>`<p>${esc(p)}</p>`).join("")}<p class="contract-signature">${esc(card.letter.signature)}</p></div>`:""}
    <footer class="mission-detail-actions"><button type="button" class="secondary" data-mission-close>Fermer</button><button type="button" class="primary" ${card.action.attr}>${esc(card.action.label)}</button></footer>`;
  if(!dialog.open) dialog.showModal();
}

function renderContractBoard(){
  const box=$("tavern-contracts");
  if(!box) return;
  const cards=missionCards();
  box.innerHTML=renderExpeditions()+(cards.length?`<div class="mission-grid">${cards.map(renderMissionCard).join("")}</div>`:`<p class="mission-empty">Aucune offre aujourd’hui.</p>`);
}

function acceptContract(){
  const offer=contractOffer();
  if(offer) openMissionSelection(offer);
}

// Escouades parties en expédition (doc 17) : en route, arrivées (le combat attend le joueur) ou sur le retour.
function expeditionLabel(e){
  const left=day=>{ const n=day-game.campaign.day; return n<=0?"aujourd’hui":"dans "+n+" jour"+(n>1?"s":""); };
  if(e.status==="scheduled") return (e.kind==="bodyguard"?"Garde du corps · ":"")+"Départ demain matin";
  if(e.kind==="bodyguard") return "Garde du corps · retour "+left(e.returnDay);
  if(e.status==="outbound") return "En route · arrivée "+left(e.arriveDay);
  if(e.status==="arrived") return "Arrivée sur place : le combat vous attend";
  return "Sur le retour · au camp "+left(e.returnDay);
}

function renderExpeditions(){
  const list=game.campaign?.expeditions||[];
  if(!list.length) return "";
  const name=id=>game.campaign.company.roster.find(m=>m.id===id)?.name||"?";
  return `<section class="expedition-list"><h3>Escouades en mission</h3>${list.map(e=>`
    <article class="expedition-row expedition-row--${esc(e.status)}">
      <div><strong>${esc(e.kind==="bodyguard"?e.offer.client:e.offer.campName+" de "+e.offer.fields.lieu)}</strong><small>${esc(e.memberIds.map(name).join(", "))}</small></div>
      <em>${esc(expeditionLabel(e))}</em>
      ${e.status==="arrived"?`<button type="button" class="primary" data-expedition-fight="${esc(e.id)}">Commencer le combat</button>`:""}
    </article>`).join("")}</section>`;
}

// Journal du jour et, si une escouade arrive, la fenêtre « Commencer le combat ». « Plus tard » laisse finir la journée
// au camp (équiper, recruter…), mais le jour suivant attend le combat (canAdvanceDay).
function logExpeditionReport(report){
  if(!report) return;
  // Missions programmées la veille : départ ce matin.
  const name=id=>game.campaign?.company.roster.find(m=>m.id===id)?.name||"?";
  for(const e of report.departed||[]){
    if(e.kind==="bodyguard") tavernLog(e.memberIds.map(name).join(", ")+" part"+(e.memberIds.length>1?"ent":"")+" en garde du corps ("+e.offer.client.toLocaleLowerCase("fr")+") : retour dans "+e.offer.days+" jours.","turn");
    else tavernLog("L’escouade part pour le "+e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu+" : arrivée dans "+e.offer.distance+" jour"+(e.offer.distance>1?"s":"")+".","turn");
  }
  for(const e of report.arrived) tavernLog("L’escouade est arrivée au "+e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu+" : le combat vous attend.","turn");
  for(const r of report.returned){
    const e=r.expedition;
    tavernLog(e.memberIds.length
      ?"L’escouade du "+e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu+" est rentrée"+(r.gold?" : +"+fmt(r.gold)+" PO":"")+(r.items?", "+r.items+" objet"+(r.items>1?"s":"")+" à l’Intendance":"")+(r.bonusPaid?", primes versées "+fmt(r.bonusPaid)+" PO":"")+"."
      :"Personne ne revient du "+e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu+".",r.gold?"gear":"info");
  }
  if(report.waiting.length) game.pendingExpeditionDialog=report.waiting[0].id;
  for(const r of report.bodyguards||[]) queueBodyguardReturn(r);
}

// Retour de garde du corps (Idan, 2026-10-25) : une fenêtre par mission, une ligne par mercenaire.
function bodyguardReturnLine(r){
  const t=bodyguardTexts(),female=String(r.mercenary?.sex||"").trim().toLowerCase().startsWith("f");
  return MercenairesRecruitDialogue.fill(t[r.issue]||"",{prenom:MercenairesRecruitDialogue.firstName(r.mercenary)},female);
}
function queueBodyguardReturn(report){
  const female=m=>String(m?.sex||"").trim().toLowerCase().startsWith("f");
  const state=r=>(r.issue==="blesse"?"Blessé":"Fatigué")+(female(r.mercenary)?"e":"");
  const lines=report.results.map(r=>({id:r.mercenary.id,text:bodyguardReturnLine(r),
    detail:[r.days?`${state(r)} ${r.days} jour${r.days>1?"s":""}`:"",r.reputation?`réputation +${fmt(r.reputation)}`:"",r.bonus?`prime ${fmt(r.bonus)} PO`:""].filter(Boolean).join(" · ")}));
  for(const line of lines) tavernLog(line.text,"turn");
  if(report.renown) tavernLog("Garde du corps : renommée de la compagnie +"+fmt(report.renown)+".","gear");
  (game.bodyguardReturns||(game.bodyguardReturns=[])).push({client:report.expedition.offer.client,lines});
  showNextBodyguardReturn();
}
function showNextBodyguardReturn(){
  const dialog=$("bodyguard-return-dialog");
  if(!dialog) return;
  const next=game.bodyguardReturns?.shift();
  if(!next){ if(dialog.open) dialog.close(); return; }
  const member=id=>game.campaign?.company.roster.find(m=>m.id===id);
  $("bodyguard-return-title").textContent=bodyguardTexts().retour_titre||"Retour de garde du corps";
  $("bodyguard-return-client").textContent=next.client;
  $("bodyguard-return-list").innerHTML=next.lines.map(line=>`<div class="bodyguard-return-row">
    ${member(line.id)?renderAvatar(member(line.id),{variant:"compact",kind:"portrait"}):""}
    <p><span>${esc(line.text)}</span>${line.detail?`<small>${esc(line.detail)}</small>`:""}</p></div>`).join("");
  $("bodyguard-return-ok").textContent=bodyguardTexts().ok||"D’accord";
  if(!dialog.open) dialog.showModal();
}

function openExpeditionDialog(id){
  const e=(game.campaign?.expeditions||[]).find(x=>x.id===id&&x.status==="arrived");
  const dialog=$("expedition-dialog");
  if(!e||!dialog) return;
  const name=mid=>game.campaign.company.roster.find(m=>m.id===mid)?.name||"?";
  $("expedition-dialog-title").textContent=e.offer.campName+" de "+e.offer.fields.lieu;
  $("expedition-dialog-text").textContent="Après "+e.offer.distance+" jour"+(e.offer.distance>1?"s":"")+" de marche, l’escouade est sur place : "+e.memberIds.map(name).join(", ")+". Elle attend vos ordres ; le jour suivant attendra son combat.";
  $("expedition-dialog-fight").dataset.expeditionFight=e.id;
  if(!dialog.open) dialog.showModal();
}

function initializeExpeditionUi(){
  document.addEventListener("click",event=>{
    const open=event.target.closest("[data-mission-open]");
    if(open){ openMissionDetail(open.dataset.missionOpen); return; }
    if(event.target.closest("[data-mission-close]")){ $("mission-detail").close(); return; }
    // Accepter depuis le détail : la fenêtre se ferme, le choix de l'escouade s'ouvre.
    if(event.target.closest("[data-contract-accept],[data-bodyguard-accept]")&&$("mission-detail")?.open) $("mission-detail").close();
    // Le bouton est dans la fenêtre de détail (hors du tableau) : on l'écoute ici, pour le contrat comme pour la garde.
    if(event.target.closest("[data-contract-accept]")){ acceptContract(); return; }
    if(event.target.closest("[data-bodyguard-accept]")){ const offer=bodyguardOffer(); if(offer) openMissionSelection(offer); return; }
    if(event.target.closest("#bodyguard-return-ok")){ showNextBodyguardReturn(); return; }
    const fight=event.target.closest("[data-expedition-fight]");
    if(fight) startExpeditionCombat(fight.dataset.expeditionFight);
    if(event.target.closest("[data-expedition-later]")) $("expedition-dialog").close();
  });
  document.addEventListener("keydown",event=>{
    const card=event.target.closest?.("[data-mission-open]");
    if(card&&(event.key==="Enter"||event.key===" ")){ event.preventDefault(); openMissionDetail(card.dataset.missionOpen); }
  });
}
