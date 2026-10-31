"use strict";

// Marchand du jour (doc 18 ; Idan, 2026-10-30), écran fonctionnel : le bouton « Marchand » du camp (grisé sans
// marchand), ce qu'il vend avec la carte d'objet au survol, le prix et « Acheter ». L'affinité n'est pas affichée. Fond,
// emplacements et portraits des marchands viendront plus tard. Règles : game-core/merchants.js.
function merchantRules(){
  return game.merchantRules||(game.merchantRules=MercenairesMerchants.createMerchantRules({reference:game.referenceData,
    generator:game.generator,affinity:affinityRules()}));
}

const merchantIsWoman=m=>String(m?.sex||"").toLowerCase().startsWith("f");

// Le journal du matin : le marchand arrivé (rien quand il n'en vient pas : Idan, 2026-10-31).
function logMerchantMorning(morning){
  if(!morning) return;
  const m=morning.arrived;
  if(m){
    const she=merchantIsWoman(m),origin=[m.people,m.culture].filter(Boolean).join(", ");
    tavernLog(`${she?"Une marchande":"Un marchand"} s’installe au camp : ${m.name}${origin?" ("+origin+")":""}. ${she?"Elle":"Il"} repart demain matin.`,"gear");
  }
}

function merchantRow({index,item,price}){
  const gold=game.campaign.company.gold,priced=price!==null;
  const short=priced&&gold<price;
  return `<li class="stock-row merchant-row">
    ${gearTile({id:"merchant",label:item.name},item)}
    <span class="stock-name">${esc(itemPublicName(item))}</span>
    <span class="stock-tier">${esc(itemBaseName(item))}</span>
    <span class="merchant-price">${priced?fmt(price)+" PO":"—"}</span>
    <button type="button" class="primary merchant-buy" data-merchant-buy="${index}"${!priced||short?" disabled":""}${short?` title="Pas assez d’or"`:""}>Acheter</button>
  </li>`;
}

function renderMerchant(){
  const c=game.campaign;
  const button=$("camp-merchant-btn");
  if(!c||!button) return;
  const visit=merchantRules().visitOf(c);
  button.disabled=!visit;
  $("camp-merchant-note").textContent=visit?visit.merchant.name:"";
  if(!visit){
    $("merchant-title").textContent="Pas de marchand aujourd’hui";
    $("merchant-content").innerHTML="";
    return;
  }
  const m=visit.merchant;
  $("merchant-title").textContent=m.name;
  $("merchant-content").innerHTML=`<p class="muted">${merchantIsWoman(m)?"Elle":"Il"} repart demain matin.</p>
    ${visit.offers.length?`<ul class="merchant-stock">${visit.offers.map(merchantRow).join("")}</ul>`:`<p class="muted">Rien à vendre.</p>`}`;
}

function buyFromMerchant(index){
  const result=merchantRules().buy(game.campaign,index);
  if(!result.ok){ tavernLog(result.reason,"warn"); renderMerchant(); return; }
  const item=result.item;
  tavernLog(`Acheté à ${result.merchant.name} : ${itemPublicName(item)} pour ${fmt(result.price)} PO.`,"gear");
  saveGame();
  renderGame();
}

function initializeMerchantUi(){
  document.addEventListener("click",event=>{
    const buy=event.target.closest?.("[data-merchant-buy]");
    if(buy&&!buy.disabled) buyFromMerchant(buy.dataset.merchantBuy);
  });
}

if(typeof document!=="undefined") initializeMerchantUi();
