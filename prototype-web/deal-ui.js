"use strict";

// Échanges d'équipement (Idan, 2026-10-24) : un clic sur une case de l'onglet Équipement ouvre un petit menu (Retirer,
// Troquer contre…, Donner…), un clic sur une ligne de l'Intendance propose « Donner à… ». Inventaire et réaménagement
// libre (Idan, 2026-10-30) : ranger, prendre dans l'inventaire, passer d'un set à l'autre, échanger les sets (⇄). Le mercenaire répond dans une
// boîte de dialogue (portrait, sa réplique, ce qui change) ; après un refus, la relance (Idan, 2026-11-04 : Intimider,
// Convaincre ou laisser tomber ; persuasion-ui.js), sinon Partir. Le capitaine s'équipe sans dialogue. Règles :
// game-core/equipment-deals.js ; textes : data/reference/equipment-dialogue.json.
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
// Nom public de l'objet (titre selon le tier, item-titles.json) : jamais le tier lui-même (Idan, 2026-10-30).
function dealItemLabel(item){
  if(!item) return "";
  if(item.itemType==="potion") return item.name;
  if(item.itemType==="mount") return item.petName?item.petName+" · "+item.name:item.name;
  return (typeof itemCardRules==="function"?itemCardRules()?.title(item):null)||item.name;
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
    <span><b>${esc(dealItemLabel(item))}</b><small>${esc(item.itemType==="potion"?"Potion · usage unique":item.name)}</small></span></button>`;
}

// Réaménagement libre (Idan, 2026-10-30) : entre ses propres objets — emplacements, set 1, set 2, inventaire —, sans
// jet ni limite ; seul ce qui passe par l'Intendance (Donner, Retirer, Troquer) garde le jet.
function ownMove(m,item,slot){ return `data-own-member="${esc(m.id)}" data-own-item="${esc(item.id)}" data-own-slot="${esc(slot)}"`; }
function ownMoves(m,slot,current){
  if(!dealRules().canRearrange(game.campaign,m).ok||dealRules().isPocket(slot)) return "";
  const rules=dealRules(),html=[];
  if(current) html.push(`<button type="button" class="deal-action" ${ownMove(m,current,rules.INVENTORY)}>Ranger dans l’inventaire</button>`);
  const set=String(slot).match(/^weapon_set_([12])_(main|off)$/);
  if(current&&set){
    const other=`weapon_set_${set[1]==="1"?2:1}_${set[2]}`;
    if(rules.placeOptions(m,current).some(o=>o.slot===other)) html.push(`<button type="button" class="deal-action" ${ownMove(m,current,other)}>Passer au set ${set[1]==="1"?2:1}</button>`);
  }
  const fits=rules.inventoryOf(m).filter(item=>rules.placeOptions(m,item).some(o=>o.slot===slot));
  if(fits.length) html.push(`<p class="deal-menu-label">Prendre dans son inventaire</p><div class="deal-offers">${fits.map(item=>dealOfferButton(item,ownMove(m,item,slot))).join("")}</div>`);
  return html.join("");
}

// Menu de la fiche : l'emplacement, ce qu'il contient, et ce qu'on peut faire.
function sheetDealMenu(m,slot){
  const copy=dealCopy().menu||{},current=dealItemIn(m,slot);
  const captain=m.id===game.campaign.company.captainId;
  const allowed=dealRules().canDeal(game.campaign,m,slot);
  const head=`<p class="deal-menu-title">${esc(dealSlotLabel(slot))}</p>${current?`<p class="deal-menu-current">${esc(dealItemLabel(current))}</p>`:""}`
    +ownMoves(m,slot,current);
  if(!allowed.ok) return head+`<p class="deal-menu-note">${esc(allowed.reason)}</p>`;
  const offers=dealOffers(m,slot);
  const target=`data-deal-member="${esc(m.id)}" data-deal-slot="${esc(slot)}"`;
  return head
    +(current?`<button type="button" class="deal-action" ${target} data-deal-stock="">Retirer<small>rendre à l’Intendance</small></button>`:"")
    +(offers.length?`<p class="deal-menu-label">${current?"Troquer contre":"Donner"}</p><div class="deal-offers">${offers.map(item=>dealOfferButton(item,`${target} data-deal-stock="${esc(item.id)}"`)).join("")}</div>`
      :`<p class="deal-menu-note">${esc(copy.empty||"")}</p>`)
    +(captain?`<p class="deal-menu-note">${esc(copy.captain||"")}</p>`:"");
}

// Inventaire (Idan, 2026-10-30) : un objet de l'inventaire — l'équiper (libre) ou le rendre à l'Intendance (jet) ;
// la case « + » — lui donner un objet de l'Intendance (jet), qui rejoint son inventaire.
function inventoryDealMenu(m,itemId){
  const rules=dealRules(),INV=rules.INVENTORY;
  const item=rules.inventoryOf(m).find(x=>String(x.id)===String(itemId));
  if(!item) return "";
  const places=rules.canRearrange(game.campaign,m).ok?rules.placeOptions(m,item):[];
  const allowed=rules.canDeal(game.campaign,m,INV);
  return `<p class="deal-menu-title">Inventaire</p><p class="deal-menu-current">${esc(dealItemLabel(item))}</p>`
    +(places.length?`<p class="deal-menu-label">Équiper</p>`+places.map(({slot,current})=>`<button type="button" class="deal-slot" ${ownMove(m,item,slot)}>${esc(dealSlotLabel(slot))}<small>${current?`à la place de ${esc(dealItemLabel(current))}`:"libre"}</small></button>`).join(""):"")
    +(allowed.ok?`<button type="button" class="deal-action" data-deal-member="${esc(m.id)}" data-deal-slot="${INV}" data-deal-item="${esc(item.id)}" data-deal-stock="">Retirer<small>rendre à l’Intendance</small></button>`
      :`<p class="deal-menu-note">${esc(allowed.reason)}</p>`);
}
function inventoryGiveMenu(m){
  const rules=dealRules(),INV=rules.INVENTORY,copy=dealCopy().menu||{};
  const allowed=rules.canDeal(game.campaign,m,INV);
  const head=`<p class="deal-menu-title">Donner</p>`;
  if(!allowed.ok) return head+`<p class="deal-menu-note">${esc(allowed.reason)}</p>`;
  const offers=dealOffers(m,INV);
  return head+(offers.length?`<div class="deal-offers">${offers.map(item=>dealOfferButton(item,`data-deal-member="${esc(m.id)}" data-deal-slot="${INV}" data-deal-stock="${esc(item.id)}"`)).join("")}</div>`
    :`<p class="deal-menu-note">${esc(copy.empty||"")}</p>`);
}

// Manuels de sorts (Idan, 2026-10-31 ; game-core/spell-manuals.js). « Apprendre à… » : on propose le sort à un membre
// de la compagnie, qui l'apprend à l'École de magie (Idan, 2026-11-02 ; spell-study-ui.js).
function manualRules(){
  return game.manualRules||(game.manualRules=MercenairesSpellManuals.createManualRules({reference:game.referenceData}));
}
function manualLearnMenu(item){ return studyLearnMenu(item); }

// Menu de l'Intendance : les membres qui peuvent recevoir l'objet, emplacement par emplacement.
function stockDealMenu(itemId){
  const item=(game.campaign.company.stock||[]).find(x=>String(x.id)===String(itemId));
  if(!item) return "";
  if(item.itemType==="manual") return manualLearnMenu(item);
  if(item.itemType==="mount") return mountDealMenu(item);
  const company=game.campaign.company;
  const members=[...company.roster].sort((a,b)=>(b.id===company.captainId)-(a.id===company.captainId));
  // Une fiole (Idan, 2026-10-29) : la première poche de ceinture libre ; ceinture pleine, rien à proposer.
  const potion=item.itemType==="potion";
  const rows=members.map(m=>{
    let slots=dealRules().compatibleSlots(m,item);
    if(potion) slots=slots.filter(({current})=>!current).slice(0,1);
    if(!slots.length) return potion?`<div class="deal-member"><b>${esc(m.name)}</b><small class="deal-menu-note">Ceinture pleine (4 fioles).</small></div>`:"";
    const allowed=dealRules().canDeal(game.campaign,m,slots[0].slot);
    // Donner (Idan, 2026-10-30) : dans son inventaire d'abord ; ou directement dans un emplacement.
    const bag=potion?"":`<button type="button" class="deal-slot" data-deal-member="${esc(m.id)}" data-deal-slot="${dealRules().INVENTORY}" data-deal-stock="${esc(item.id)}">Inventaire<small>il l’équipera quand vous voudrez</small></button>`;
    const choices=allowed.ok?bag+slots.map(({slot,current})=>`<button type="button" class="deal-slot" data-deal-member="${esc(m.id)}" data-deal-slot="${esc(slot)}" data-deal-stock="${esc(item.id)}">
        ${esc(dealSlotLabel(slot))}<small>${current?`contre ${esc(dealItemLabel(current))}`:"libre"}</small></button>`).join("")
      :`<small class="deal-menu-note">${esc(allowed.reason)}</small>`;
    return `<div class="deal-member"><b>${esc(m.name)}${m.id===company.captainId?" · capitaine":""}</b>${choices}</div>`;
  }).join("");
  return `<p class="deal-menu-title">Donner à…</p><p class="deal-menu-current">${esc(dealItemLabel(item))}</p>`
    +(rows||`<p class="deal-menu-note">Personne ne peut le porter.</p>`);
}

// Une monture (Idan, 2026-11-07 : « on peut proposer à un mercenaire une monture (comme les autres Items, il accepte /
// refuse.) S'il accepte il a la monture dans son inventaire en statut "non equipable" ») : « Proposer à… », dans son
// inventaire seulement ; ou la relâcher.
function mountDealMenu(item){
  const company=game.campaign.company,INV=dealRules().INVENTORY;
  const members=[...company.roster].sort((a,b)=>(b.id===company.captainId)-(a.id===company.captainId));
  const rows=members.map(m=>{
    const allowed=dealRules().canDeal(game.campaign,m,INV);
    const choice=allowed.ok?`<button type="button" class="deal-slot" data-deal-member="${esc(m.id)}" data-deal-slot="${INV}" data-deal-stock="${esc(item.id)}">Inventaire<small>à apprivoiser chez le Dresseur</small></button>`
      :`<small class="deal-menu-note">${esc(allowed.reason)}</small>`;
    return `<div class="deal-member"><b>${esc(m.name)}${m.id===company.captainId?" · capitaine":""}</b>${choice}</div>`;
  }).join("");
  return `<p class="deal-menu-title">Proposer à…</p><p class="deal-menu-current">${esc(dealItemLabel(item))}</p>${rows}`
    +`<button type="button" class="deal-action" data-stable-release="${esc(item.id)}">Relâcher<small>une place se libère aux Écuries</small></button>`;
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
  // L'intendant appuie la proposition (Idan, 2026-10-24).
  const steward=result.steward;
  const support=steward?MercenairesRecruitDialogue.fill(copy.steward||"",{intendant:MercenairesRecruitDialogue.firstName(steward)},dealIsFemale(steward)):"";
  return {proposal:fill(copy.proposals?.[result.action]),support,reply:fill(dealReply(m,result)),outcome:fill(outcome)};
}
function openDealDialog(m,result){
  const lines=dealLines(m,result),first=MercenairesRecruitDialogue.firstName(m);
  $("deal-talk-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("deal-talk-name").textContent=m.name;
  $("deal-talk-origin").textContent={donner:"Donner",retirer:"Retirer",troquer:"Troquer"}[result.action]||"";
  $("deal-talk-log").innerHTML=`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(lines.proposal)} »</span></p>
    ${lines.support?`<p class="talk-note">${esc(lines.support)}</p>`:""}
    <p class="talk-say talk-say--merc"><b>${esc(first)}</b><span>« ${esc(lines.reply)} »</span></p>
    <p class="talk-note">${esc(lines.outcome)}</p>`;
  if(typeof persuasionAfter==="function") persuasionAfter(result,"deal",{member:m.id});
  else $("deal-talk-choices").innerHTML=`<ol class="talk-options"><li><button type="button" data-deal-leave>Partir</button></li></ol>`;
  $("deal-talk-dialog").showModal();
}
// Relancer après un refus : Intimider ou Convaincre, sur le même échange.
function retryDeal(memberId,approach){
  const m=dealMember(memberId);
  if(!m) return;
  const result=dealRules().retry(game.campaign,m.id,approach);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  persuasionAppend(m,result,dealLines(m,result).outcome,`${m.id}|${game.campaign.day}|deal|${approach}`);
  if(typeof refreshMercenaryDomains==="function") refreshMercenaryDomains([m]);
  saveGame();
  renderGame();
  if($("character-dialog").open&&game.sheetCharacter) renderSheet();
}

function runDeal({member,slot,stock,item}){
  closeDealMenu();
  const m=dealMember(member);
  if(!m) return;
  const result=dealRules().propose(game.campaign,{mercenaryId:m.id,slot,stockItemId:stock||null,itemId:item||null});
  if(!result.ok) return;
  if(typeof refreshMercenaryDomains==="function") refreshMercenaryDomains([m]);
  saveGame();
  renderGame();
  if($("character-dialog").open&&game.sheetCharacter) renderSheet();
  if(!result.free) openDealDialog(m,result);
}

// Réaménagement libre : pas de dialogue, la fiche se redessine.
function runOwnMove(action){
  closeDealMenu();
  const m=dealMember(action?.member);
  if(!m) return;
  const result=action.swap?dealRules().swapSets(game.campaign,{mercenaryId:m.id})
    :dealRules().rearrange(game.campaign,{mercenaryId:m.id,itemId:action.item,slot:action.slot});
  if(!result.ok) return;
  if(typeof refreshMercenaryDomains==="function") refreshMercenaryDomains([m]);
  saveGame();
  renderGame();
  if($("character-dialog").open&&game.sheetCharacter) renderSheet();
}

function initializeDeals(){
  if(typeof registerPersuasion==="function") registerPersuasion("deal",(approach,data)=>retryDeal(data.persuadeMember,approach));
  document.addEventListener("click",event=>{
    const menu=document.getElementById("deal-menu");
    const action=event.target.closest?.("[data-deal-member]");
    if(action&&menu?.contains(action)){
      runDeal({member:action.dataset.dealMember,slot:action.dataset.dealSlot,stock:action.dataset.dealStock,item:action.dataset.dealItem});
      return;
    }
    const own=event.target.closest?.("[data-own-member]");
    if(own&&menu?.contains(own)){
      runOwnMove({member:own.dataset.ownMember,item:own.dataset.ownItem,slot:own.dataset.ownSlot});
      return;
    }
    if(event.target.closest?.("#dialog-content [data-swap-sets]")&&game.sheetCharacter){
      runOwnMove({member:game.sheetCharacter.id,swap:true});
      return;
    }
    if(event.target.closest?.("[data-deal-leave]")){ $("deal-talk-dialog").close(); return; }
    // Fiche : une case de l'onglet Équipement d'un membre de la compagnie.
    const tile=event.target.closest?.("#dialog-content .gear-tile[data-slot]");
    const m=game.sheetCharacter;
    if(tile&&game.sheetTab==="equipment"&&m&&game.campaign?.company.roster.includes(m)){
      const slot=tile.dataset.slot;
      openDealMenu(tile,slot!==dealRules().INVENTORY?sheetDealMenu(m,slot):tile.dataset.item?inventoryDealMenu(m,tile.dataset.item):inventoryGiveMenu(m));
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
