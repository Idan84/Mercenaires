"use strict";

// Tableau des contrats de la Taverne (doc 17, Idan 2026-10-24) : pour l'instant une seule mission, « Faire le ménage »
// (camp gobelin ☠), proposée en boucle. L'offre et ses règles sont dans game-core/missions.js, le combat dans mission.js.
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

function renderContractBoard(){
  const box=$("tavern-contracts");
  if(!box) return;
  const offer=contractOffer(),expeditions=renderExpeditions();
  if(!offer){
    box.innerHTML=expeditions+`<p class="muted">Aucun contrat pour l’instant.</p>`;
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
  </article>`;
}

function acceptContract(){
  const offer=contractOffer();
  if(offer) openMissionSelection(offer);
}

// Escouades parties en expédition (doc 17) : en route, arrivées (le combat attend le joueur) ou sur le retour.
function expeditionLabel(e){
  const left=day=>{ const n=day-game.campaign.day; return n<=0?"aujourd’hui":"dans "+n+" jour"+(n>1?"s":""); };
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
      <div><strong>${esc(e.offer.campName)} de ${esc(e.offer.fields.lieu)}</strong><small>${esc(e.memberIds.map(name).join(", "))}</small></div>
      <em>${esc(expeditionLabel(e))}</em>
      ${e.status==="arrived"?`<button type="button" class="primary" data-expedition-fight="${esc(e.id)}">Commencer le combat</button>`:""}
    </article>`).join("")}</section>`;
}

// Journal du jour et, si une escouade arrive (ou attend encore), la fenêtre « Commencer le combat ».
function logExpeditionReport(report){
  if(!report) return;
  for(const e of report.arrived) tavernLog("L’escouade est arrivée au "+e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu+" : le combat vous attend.","turn");
  for(const r of report.returned){
    const e=r.expedition;
    tavernLog(e.memberIds.length
      ?"L’escouade du "+e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu+" est rentrée"+(r.gold?" : +"+fmt(r.gold)+" PO":"")+(r.items?", "+r.items+" objet"+(r.items>1?"s":"")+" à l’Intendance":"")+(r.bonusPaid?", primes versées "+fmt(r.bonusPaid)+" PO":"")+"."
      :"Personne ne revient du "+e.offer.campName.toLocaleLowerCase("fr")+" de "+e.offer.fields.lieu+".",r.gold?"gear":"info");
  }
  if(report.waiting.length) game.pendingExpeditionDialog=report.waiting[0].id;
}

function openExpeditionDialog(id){
  const e=(game.campaign?.expeditions||[]).find(x=>x.id===id&&x.status==="arrived");
  const dialog=$("expedition-dialog");
  if(!e||!dialog) return;
  const name=mid=>game.campaign.company.roster.find(m=>m.id===mid)?.name||"?";
  $("expedition-dialog-title").textContent=e.offer.campName+" de "+e.offer.fields.lieu;
  $("expedition-dialog-text").textContent="Après "+e.offer.distance+" jour"+(e.offer.distance>1?"s":"")+" de marche, l’escouade est sur place : "+e.memberIds.map(name).join(", ")+". Elle attend vos ordres.";
  $("expedition-dialog-fight").dataset.expeditionFight=e.id;
  if(!dialog.open) dialog.showModal();
}

function initializeExpeditionUi(){
  document.addEventListener("click",event=>{
    const fight=event.target.closest("[data-expedition-fight]");
    if(fight) startExpeditionCombat(fight.dataset.expeditionFight);
    if(event.target.closest("[data-expedition-later]")) $("expedition-dialog").close();
  });
}
