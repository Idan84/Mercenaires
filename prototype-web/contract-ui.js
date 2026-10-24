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
  const offer=contractOffer();
  if(!offer){
    box.innerHTML=`<p class="muted">Aucun contrat pour l’instant.</p>`;
    return;
  }
  const order=contractOrder(offer);
  const days=offer.distance+" jour"+(offer.distance>1?"s":"");
  box.innerHTML=`<article class="contract-card">
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
