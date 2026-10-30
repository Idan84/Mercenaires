"use strict";

// Tableau des contrats de la Taverne (doc 17, Idan 2026-10-24) : « Faire le ménage » (camp gobelin ☠), proposée en boucle,
// et une offre de garde du corps (Idan, 2026-10-25). Les offres et leurs règles sont dans game-core/missions.js et
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
// Les étoiles d'un niveau de réputation (1 à 15).
function bodyguardStars(level){
  const row=(game.referenceData?.reputationStars?.rows||[]).find(r=>r.niveau===level);
  const info=row?starRules().personal(row.reputation_min):null;
  return info?renderStarLevel(info,"Réputation minimale"):"—";
}
function renderBodyguardOffer(){
  const offer=bodyguardOffer();
  if(!offer) return "";
  const t=bodyguardTexts(),plural=offer.count>1;
  const text=MercenairesRecruitDialogue.fill(t.offre||"",{client:offer.client,n:offer.count,s:plural?"s":"",jours:offer.days},false);
  return `<article class="contract-card contract-card--bodyguard">
    <header class="contract-head">
      <div><p class="eyebrow">${esc(t.titre||"Garde du corps")}</p><h3>${esc(offer.client)}</h3></div>
    </header>
    <p class="contract-pitch">${esc(text)}</p>
    <dl class="contract-facts">
      <div><dt>Mercenaires</dt><dd>${offer.count}</dd></div>
      <div><dt>Réputation minimale</dt><dd>${bodyguardStars(offer.level)}</dd></div>
      <div><dt>Durée</dt><dd>${offer.days} jours, sans combat</dd></div>
      <div><dt>Paiement d’avance</dt><dd>${fmt(offer.payment)} PO</dd></div>
      <div><dt>Expire le</dt><dd>${esc(contractDate(offer.expiresDay).label)}</dd></div>
    </dl>
    <div class="contract-actions"><button type="button" class="primary" data-bodyguard-accept>Choisir ${plural?"les gardes":"le garde"}</button></div>
  </article>`;
}

function renderContractBoard(){
  const box=$("tavern-contracts");
  if(!box) return;
  const offer=contractOffer(),expeditions=renderExpeditions(),guard=renderBodyguardOffer();
  if(!offer){
    box.innerHTML=expeditions+`<p class="muted">Aucun contrat pour l’instant.</p>`+guard;
    return;
  }
  const order=contractOrder(offer);
  const days=offer.distance+" jour"+(offer.distance>1?"s":"");
  box.innerHTML=expeditions+`<article class="contract-card">
    <header class="contract-head">
      <div><p class="eyebrow">Contrat · ${esc(offer.name)}</p><h3>${esc(offer.campName)} de ${esc(offer.fields.lieu)}</h3></div>
      <span class="contract-skulls" title="Difficulté ${offer.difficulty}">${"☠".repeat(offer.difficulty||1)}</span>
    </header>
    <dl class="contract-facts">
      <div><dt>Commanditaire</dt><dd>${esc(order?.from||"")}</dd></div>
      <div><dt>Distance</dt><dd>${esc(days)} de marche (${2*offer.distance} aller-retour)</dd></div>
      <div><dt>Ennemis</dt><dd>${esc(offer.faction)}, ${esc(offer.fields.estimation)}</dd></div>
      <div><dt>Récompense</dt><dd>${fmt(offer.reward)} PO + butin</dd></div>
      <div><dt>Expire le</dt><dd>${esc(contractDate(offer.expiresDay).label)}</dd></div>
    </dl>
    ${order?`<div class="contract-letter">${order.paragraphs.map(p=>`<p>${esc(p)}</p>`).join("")}<p class="contract-signature">${esc(order.signature)}</p></div>`:""}
    <div class="contract-actions"><button type="button" class="primary" data-contract-accept>Accepter le contrat</button></div>
  </article>`+guard;
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
    if(event.target.closest("[data-bodyguard-accept]")){ const offer=bodyguardOffer(); if(offer) openMissionSelection(offer); return; }
    if(event.target.closest("#bodyguard-return-ok")){ showNextBodyguardReturn(); return; }
    const fight=event.target.closest("[data-expedition-fight]");
    if(fight) startExpeditionCombat(fight.dataset.expeditionFight);
    if(event.target.closest("[data-expedition-later]")) $("expedition-dialog").close();
  });
}
