"use strict";

// Marchand du jour (doc 18 ; Idan, 2026-10-30 et 2026-10-31) : son portrait et son nom ; deux onglets, « Acheter » (son
// étal de 10 articles) et « Vendre » (le stock de l'Intendance, ses armes d'abord). Une case par objet, la carte d'objet
// au survol, le prix dessous. L'affinité et les chiffres de l'intendant ne sont pas affichés : seul son visage dit qu'il
// négocie. Règles : game-core/merchants.js.
function merchantRules(){
  return game.merchantRules||(game.merchantRules=MercenairesMerchants.createMerchantRules({reference:game.referenceData,
    generator:game.generator,affinity:affinityRules()}));
}

const merchantIsWoman=m=>String(m?.sex||"").toLowerCase().startsWith("f");
const merchantView={tab:"buy",kind:"weapon"};
const merchantRenown=()=>typeof campaignRules==="function"&&game.campaign?Number(campaignRules().companyRenown(game.campaign)?.total)||0:0;
const merchantVisit=()=>game.campaign?merchantRules().visitOf(game.campaign,{renown:merchantRenown()}):null;

// Le journal du matin : le marchand arrivé (rien quand il n'en vient pas : Idan, 2026-10-31).
function logMerchantMorning(morning){
  const m=morning?.arrived;
  if(!m) return;
  const she=merchantIsWoman(m),origin=m.culture||m.people;
  tavernLog(`${she?"Une marchande":"Un marchand"} s’installe au camp : ${m.name}${origin?" ("+origin+")":""}. ${she?"Elle":"Il"} repart demain matin.`,"gear");
}

// Son portrait (fait pour lui seul, merchants.json) ; ses initiales en attendant l'image.
function renderMerchantPortrait(m){
  const initials=String(m.name||"").split(/\s+/).map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
  return `<span class="merchant-portrait">${m.portrait?`<img src="${esc(m.portrait)}" alt="">`:`<span class="merchant-initials">${esc(initials)}</span>`}</span>`;
}

function renderMerchantHead(visit){
  const m=visit.merchant,gold=Math.round(game.campaign.company.gold),steward=visit.steward;
  return `${renderMerchantPortrait(m)}
    <div class="merchant-name"><h2>${esc(m.name)}</h2><small>${esc(m.culture||m.people||"")}</small></div>
    ${steward?`<span class="merchant-steward" title="${esc(steward.name)} négocie pour vous">${renderAvatar(steward,{variant:"compact",kind:"portrait"})}</span>`:""}
    <span class="merchant-gold" title="Caisse de la compagnie"><b${gold<0?' class="is-negative"':""}>${fmt(gold)}</b> PO</span>`;
}

// Une case : l'objet (carte au survol), le nombre en pastille, le prix et le bouton.
function renderMerchantCard({item,count=1,price,action,attr,wanted=false,disabled=false,tip=""}){
  return `<li class="merchant-card${wanted?" merchant-card--wanted":""}"${wanted?` title="Ses armes : il en donne un bon prix"`:""}>
    <span class="merchant-tile">${gearTile({id:"merchant",label:item.name},item)}${count>1?`<span class="stock-count">${count}</span>`:""}</span>
    <b class="merchant-price">${price===null?"—":fmt(price)+" PO"}</b>
    <button type="button" class="merchant-action primary" ${attr}${disabled?" disabled":""}${tip?` title="${esc(tip)}"`:""}>${action}</button>
  </li>`;
}

// Deux objets identiques (même objet, même tier) forment une case « × 2 », comme à l'Intendance.
function merchantGroups(entries,itemOf){
  const groups=new Map();
  for(const entry of entries){
    const item=itemOf(entry),key=item.itemType+"|"+item.name+"|"+item.tier;
    if(!groups.has(key)) groups.set(key,{item,entry,count:0});
    groups.get(key).count+=1;
  }
  return [...groups.values()];
}

// Acheter : l'étal, du plus cher au moins cher ; « Acheter » prend un exemplaire.
function renderMerchantBuy(visit){
  const gold=game.campaign.company.gold;
  const rows=merchantGroups(visit.offers,o=>o.item).sort((a,b)=>(b.entry.price||0)-(a.entry.price||0));
  if(!rows.length) return `<p class="stock-empty">Étal vide</p>`;
  return `<ul class="merchant-grid">${rows.map(({item,entry,count})=>{
    const short=entry.price!==null&&gold<entry.price;
    return renderMerchantCard({item,count,price:entry.price,action:"Acheter",attr:`data-merchant-buy="${esc(entry.id)}"`,
      disabled:entry.price===null||short,tip:short?"Pas assez d’or":""});
  }).join("")}</ul>`;
}

// Vendre : le stock de l'Intendance, par catégorie (onglets en icônes, comme à l'Intendance) ; ses armes d'abord, puis
// le prix. On vend un exemplaire à la fois : le prix affiché est celui du prochain.
const merchantKindOf=item=>typeof STOCK_KINDS!=="undefined"&&STOCK_KINDS.includes(item.itemType)?item.itemType:"weapon";
function renderMerchantKinds(items){
  if(typeof STOCK_TABS==="undefined") return "";
  const count=kind=>items.filter(item=>merchantKindOf(item)===kind).length;
  if(!count(merchantView.kind)) merchantView.kind=STOCK_TABS.find(([kind])=>count(kind))?.[0]||merchantView.kind;
  return `<div class="stock-tabs merchant-kinds" role="tablist">${STOCK_TABS.map(([kind,label,icon])=>{
    const active=kind===merchantView.kind,n=count(kind);
    return `<button type="button" role="tab" class="stock-tab${active?" active":""}" aria-selected="${active}" data-merchant-kind="${kind}" title="${label}" aria-label="${label} : ${n}"${n?"":" disabled"}>${gearIcon(icon)}<small>${n}</small></button>`;
  }).join("")}</div>`;
}
function renderMerchantSell(visit){
  const items=game.campaign.company.stock||[];
  if(!items.length) return `<p class="stock-empty">Rien à vendre</p>`;
  const kinds=renderMerchantKinds(items);
  const shown=typeof STOCK_TABS==="undefined"?items:items.filter(item=>merchantKindOf(item)===merchantView.kind);
  const rows=merchantGroups(shown,item=>item).map(g=>({...g,...visit.buyback(g.item)}))
    .sort((a,b)=>(b.specialty-a.specialty)||((b.price||0)-(a.price||0)));
  return `${kinds}<ul class="merchant-grid">${rows.map(r=>renderMerchantCard({item:r.item,count:r.count,price:r.price,action:"Vendre",
    attr:`data-merchant-sell="${esc(r.item.id)}"`,wanted:r.specialty,disabled:r.price===null,tip:r.price===null?"Il n’en veut pas":""})).join("")}</ul>`;
}

function renderMerchant(){
  const c=game.campaign;
  const button=$("camp-merchant-btn");
  if(!c||!button) return;
  const visit=merchantVisit();
  button.disabled=!visit;
  $("camp-merchant-note").textContent=visit?visit.merchant.name:"";
  const head=$("merchant-head"),tabs=$("merchant-tabs"),content=$("merchant-content");
  if(!visit){
    head.innerHTML=`<div class="merchant-name"><h2>Pas de marchand aujourd’hui</h2></div>`;
    tabs.innerHTML=content.innerHTML="";
    return;
  }
  head.innerHTML=renderMerchantHead(visit);
  const counts={buy:visit.offers.length,sell:(c.company.stock||[]).length};
  tabs.innerHTML=[["buy","Acheter"],["sell","Vendre"]].map(([tab,label])=>{
    const active=tab===merchantView.tab;
    return `<button type="button" role="tab" class="merchant-tab${active?" active":""}" aria-selected="${active}" data-merchant-tab="${tab}">${label}<small>${counts[tab]}</small></button>`;
  }).join("");
  content.innerHTML=merchantView.tab==="sell"?renderMerchantSell(visit):renderMerchantBuy(visit);
}

function merchantTrade(kind,id){
  const rules=merchantRules(),options={renown:merchantRenown()};
  const result=kind==="buy"?rules.buy(game.campaign,id,options):rules.sell(game.campaign,id,options);
  if(!result.ok){ tavernLog(result.reason,"warn"); renderMerchant(); return; }
  const name=itemPublicName(result.item);
  tavernLog(kind==="buy"?`Acheté à ${result.merchant.name} : ${name} pour ${fmt(result.price)} PO.`:`Vendu à ${result.merchant.name} : ${name} pour ${fmt(result.price)} PO.`,"gear");
  saveGame();
  renderGame();
}

function initializeMerchantUi(){
  document.addEventListener("click",event=>{
    const tab=event.target.closest?.("[data-merchant-tab]");
    if(tab){ merchantView.tab=tab.dataset.merchantTab; renderMerchant(); return; }
    const kind=event.target.closest?.("[data-merchant-kind]");
    if(kind){ merchantView.kind=kind.dataset.merchantKind; renderMerchant(); return; }
    const buy=event.target.closest?.("[data-merchant-buy]");
    if(buy&&!buy.disabled){ merchantTrade("buy",buy.dataset.merchantBuy); return; }
    const sell=event.target.closest?.("[data-merchant-sell]");
    if(sell&&!sell.disabled) merchantTrade("sell",sell.dataset.merchantSell);
  });
}

if(typeof document!=="undefined") initializeMerchantUi();
