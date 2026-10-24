"use strict";

// Échanges d'équipement (Idan, 2026-10-24) : un clic sur une case de l'onglet Équipement ouvre un petit menu (Retirer,
// Troquer contre…, Donner…), un clic sur une ligne de l'Intendance propose « Donner à… ». Le mercenaire répond dans une
// boîte de dialogue (portrait, sa réplique, ce qui change) ; seule réponse : Partir. Le capitaine s'équipe sans
// dialogue. Règles : game-core/equipment-deals.js ; textes : data/reference/equipment-dialogue.json.
let equipmentDeals=null;
function dealRules(){
  if(!equipmentDeals&&game.referenceData){
    equipmentDeals=MercenairesEquipmentDeals.createEquipmentDeals({reference:game.referenceData,affinityRules:affinityRules()});
  }
  return equipmentDeals;
}
function dealCopy(){ return game.referenceData?.equipmentDialogue||{}; }
function dealMember(id){ return game.campaign?.company.roster.find(m=>String(m.id)===String(id))||null; }
function dealSlotLabel(slot){
  return (game.referenceData?.equipmentSlots?.rows||[]).find(row=>row.id===slot)?.label||slot;
}
function dealItemLabel(item){
  if(!item) return "";
  const title=typeof itemCardRules==="function"?itemCardRules()?.title(item):null;
  return `${title||item.name} (T${item.tier})`;
}
function dealItemIn(m,slot){
  const id=m?.equipment?.slots?.[slot];
  return id?(m.items||[]).find(item=>item.id===id)||null:null;
}
// Objets du stock pour cet emplacement : un exemplaire par objet et par tier, du meilleur tier au moins bon.
function dealOffers(m,slot){
  const seen=new Set();
  return (game.campaign.company.stock||[])
    .filter(item=>dealRules().slotAccepts(m,slot,item).ok)
    .sort((a,b)=>b.tier-a.tier||a.name.localeCompare(b.name,"fr"))
    .filter(item=>{ const key=item.name+"|"+item.tier; if(seen.has(key)) return false; seen.add(key); return true; });
}
function dealOfferButton(item,attrs){
  return `<button type="button" class="deal-offer" ${attrs}>${gearTile({id:"stock",label:item.name},item).replace('tabindex="0"','tabindex="-1"')}
    <span><b>${esc(dealItemLabel(item))}</b><small>${esc(item.name)} · ${esc(item.qualityName||"")}</small></span></button>`;
}

// Menu de la fiche : l'emplacement, ce qu'il contient, et ce qu'on peut faire.
function sheetDealMenu(m,slot){
  const copy=dealCopy().menu||{},current=dealItemIn(m,slot);
  const captain=m.id===game.campaign.company.captainId;
  const allowed=dealRules().canDeal(game.campaign,m);
  const head=`<p class="deal-menu-title">${esc(dealSlotLabel(slot))}</p>${current?`<p class="deal-menu-current">${esc(dealItemLabel(current))}</p>`:""}`;
  if(!allowed.ok) return head+`<p class="deal-menu-note">${esc(allowed.reason)}</p>`;
  const offers=dealOffers(m,slot);
  const target=`data-deal-member="${esc(m.id)}" data-deal-slot="${esc(slot)}"`;
  return head
    +(current?`<button type="button" class="deal-action" ${target} data-deal-stock="">Retirer<small>rendre à l’Intendance</small></button>`:"")
    +(offers.length?`<p class="deal-menu-label">${current?"Troquer contre":"Donner"}</p><div class="deal-offers">${offers.map(item=>dealOfferButton(item,`${target} data-deal-stock="${esc(item.id)}"`)).join("")}</div>`
      :`<p class="deal-menu-note">${esc(copy.empty||"")}</p>`)
    +(captain?`<p class="deal-menu-note">${esc(copy.captain||"")}</p>`:"");
}

// Menu de l'Intendance : les membres qui peuvent recevoir l'objet, emplacement par emplacement.
function stockDealMenu(itemId){
  const item=(game.campaign.company.stock||[]).find(x=>String(x.id)===String(itemId));
  if(!item) return "";
  const company=game.campaign.company;
  const members=[...company.roster].sort((a,b)=>(b.id===company.captainId)-(a.id===company.captainId));
  const rows=members.map(m=>{
    const slots=dealRules().compatibleSlots(m,item);
    if(!slots.length) return "";
    const allowed=dealRules().canDeal(game.campaign,m);
    const choices=allowed.ok?slots.map(({slot,current})=>`<button type="button" class="deal-slot" data-deal-member="${esc(m.id)}" data-deal-slot="${esc(slot)}" data-deal-stock="${esc(item.id)}">
        ${esc(dealSlotLabel(slot))}<small>${current?`contre ${esc(dealItemLabel(current))}`:"libre"}</small></button>`).join("")
      :`<small class="deal-menu-note">${esc(allowed.reason)}</small>`;
    return `<div class="deal-member"><b>${esc(m.name)}${m.id===company.captainId?" · capitaine":""}</b>${choices}</div>`;
  }).join("");
  return `<p class="deal-menu-title">Donner à…</p><p class="deal-menu-current">${esc(dealItemLabel(item))}</p>`
    +(rows||`<p class="deal-menu-note">Personne ne peut le porter.</p>`);
}

function dealMenuElement(){
  let menu=document.getElementById("deal-menu");
  if(!menu){
    menu=document.createElement("div");
    menu.id="deal-menu";
    menu.className="deal-menu";
    menu.setAttribute("role","menu");
  }
  const host=document.querySelector("dialog[open]")||document.body;
  if(menu.parentElement!==host) host.appendChild(menu);
  return menu;
}
function openDealMenu(anchor,html){
  if(!html) return;
  if(typeof hideItemCard==="function") hideItemCard();
  const menu=dealMenuElement();
  menu.innerHTML=html;
  menu.classList.add("is-open");
  const box=anchor.getBoundingClientRect(),card=menu.getBoundingClientRect(),gap=8,margin=8;
  let left=box.right+gap;
  if(left+card.width>innerWidth-margin) left=box.left-gap-card.width;
  left=Math.max(margin,Math.min(left,innerWidth-margin-card.width));
  const top=Math.max(margin,Math.min(box.top,innerHeight-margin-card.height));
  menu.style.left=left+"px";
  menu.style.top=top+"px";
  menu.querySelector("button")?.focus();
}
function closeDealMenu(){ document.getElementById("deal-menu")?.classList.remove("is-open"); }

function dealIsFemale(m){ return String(m?.sex||"").trim().toLowerCase().startsWith("f"); }
function dealHash(text){
  let hash=2166136261;
  for(const ch of String(text)) hash=Math.imul(hash^ch.codePointAt(0),16777619);
  return hash>>>0;
}
// Réplique : action, accord ou refus, humeur (content si l'objet reçu lui semble valoir plus que l'objet cédé).
function dealReply(m,result){
  const copy=dealCopy(),mood=result.mood==="displeased"?"mecontent":"content";
  const rows=(copy.replies||[]).filter(r=>r.action===result.action&&r.accord===result.accepted);
  const row=rows.find(r=>r.humeur===mood)||rows[0];
  const lines=row?.lignes||[];
  return lines.length?lines[dealHash(`${m.id}|${game.campaign.day}|${result.action}`)%lines.length]:"";
}
function dealLines(m,result){
  const copy=dealCopy(),outcomes=copy.outcomes||{};
  const prenom=MercenairesRecruitDialogue.firstName(m);
  // « de Borin », « d’Enzo » : élision devant une voyelle.
  const vars={prenom,de_prenom:(/^[AEIOUÉÈÊÂÎÔÛ]/i.test(prenom)?"d’":"de ")+prenom,recu:dealItemLabel(result.received),cede:dealItemLabel(result.given)};
  const fill=text=>MercenairesRecruitDialogue.fill(text,vars,dealIsFemale(m));
  const outcome=result.accepted?outcomes[result.action]:result.action==="donner"?outcomes.refus_donner:outcomes.refus;
  return {proposal:fill(copy.proposals?.[result.action]),reply:fill(dealReply(m,result)),outcome:fill(outcome)};
}
function openDealDialog(m,result){
  const lines=dealLines(m,result),first=MercenairesRecruitDialogue.firstName(m);
  $("deal-talk-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("deal-talk-name").textContent=m.name;
  $("deal-talk-origin").textContent={donner:"Donner",retirer:"Retirer",troquer:"Troquer"}[result.action]||"";
  $("deal-talk-log").innerHTML=`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(lines.proposal)} »</span></p>
    <p class="talk-say talk-say--merc"><b>${esc(first)}</b><span>« ${esc(lines.reply)} »</span></p>
    <p class="talk-note">${esc(lines.outcome)}</p>`;
  $("deal-talk-choices").innerHTML=`<ol class="talk-options"><li><button type="button" data-deal-leave>Partir</button></li></ol>`;
  $("deal-talk-dialog").showModal();
}

function runDeal({member,slot,stock}){
  closeDealMenu();
  const m=dealMember(member);
  if(!m) return;
  const result=dealRules().propose(game.campaign,{mercenaryId:m.id,slot,stockItemId:stock||null});
  if(!result.ok) return;
  saveGame();
  renderGame();
  if($("character-dialog").open&&game.sheetCharacter) renderSheet();
  if(!result.free) openDealDialog(m,result);
}

function initializeDeals(){
  document.addEventListener("click",event=>{
    const menu=document.getElementById("deal-menu");
    const action=event.target.closest?.("[data-deal-member]");
    if(action&&menu?.contains(action)){
      runDeal({member:action.dataset.dealMember,slot:action.dataset.dealSlot,stock:action.dataset.dealStock});
      return;
    }
    if(event.target.closest?.("[data-deal-leave]")){ $("deal-talk-dialog").close(); return; }
    // Fiche : une case de l'onglet Équipement d'un membre de la compagnie.
    const tile=event.target.closest?.("#dialog-content .gear-tile[data-slot]");
    const m=game.sheetCharacter;
    if(tile&&game.sheetTab==="equipment"&&m&&game.campaign?.company.roster.includes(m)){
      openDealMenu(tile,sheetDealMenu(m,tile.dataset.slot));
      return;
    }
    // Intendance : une ligne du stock.
    const row=event.target.closest?.("[data-stock-deal]");
    if(row&&game.campaign){
      openDealMenu(row,stockDealMenu(row.dataset.stockDeal));
      return;
    }
    if(menu&&!menu.contains(event.target)) closeDealMenu();
  });
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&document.getElementById("deal-menu")?.classList.contains("is-open")){
      event.preventDefault();
      closeDealMenu();
      return;
    }
    if(event.key!=="Enter"&&event.key!==" ") return;
    const target=event.target.closest?.("#dialog-content .gear-tile[data-slot], [data-stock-deal]");
    if(target){ event.preventDefault(); target.click(); }
  },true);
  document.addEventListener("scroll",event=>{
    if(!document.getElementById("deal-menu")?.contains(event.target)) closeDealMenu();
  },true);
  document.addEventListener("close",closeDealMenu,true);
}

if(typeof document!=="undefined") initializeDeals();
