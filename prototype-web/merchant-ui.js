"use strict";

// Marchand du jour (doc 18 ; Idan, 2026-10-30), écran fonctionnel : le bouton « Marchand » du camp (grisé sans
// marchand), qui il est, son affinité avec le capitaine en cœurs, son stock avec la carte d'objet au survol, le prix et
// « Acheter ». Fond, emplacements et portraits des marchands viendront plus tard. Règles : game-core/merchants.js.
function merchantRules(){
  return game.merchantRules||(game.merchantRules=MercenairesMerchants.createMerchantRules({reference:game.referenceData,
    generator:game.generator,affinity:affinityRules(),names:game.nameRules}));
}

const merchantIsWoman=m=>String(m?.sex||"").toLowerCase().startsWith("f");

// Les nouvelles du matin (Nouvelles du jour) : le marchand arrivé, ou personne.
function logMerchantMorning(morning){
  if(!morning) return;
  const m=morning.arrived;
  if(m){
    const she=merchantIsWoman(m);
    tavernLog(`${she?"Une marchande":"Un marchand"} s’installe au camp : ${m.name} (${m.people}, ${m.culture}). ${she?"Elle":"Il"} repart demain matin.`,"gear");
  }
  else tavernLog((morning.left?`${morning.left.name} a remballé son étal. `:"")+"Pas de marchand au camp aujourd’hui.","info");
}

const MERCHANT_KINDS=["weapon","armor","helmet","boots","belt","amulet","cape","gloves","pants","ring","potion"];

function merchantRow({item,price}){
  const gold=game.campaign.company.gold,priced=price!==null;
  const short=priced&&gold<price;
  return `<li class="stock-row merchant-row">
    ${gearTile({id:"merchant",label:item.name},item)}
    <span class="stock-name">${esc(item.name)}</span>
    <span class="stock-tier stock-tier--${esc(item.qualityCode||"")}">${item.itemType==="potion"?"Usage unique":`T${item.tier} · ${esc(item.qualityName||"")}`}</span>
    <span class="merchant-price">${priced?fmt(price)+" PO":"—"}</span>
    <button type="button" class="primary merchant-buy" data-merchant-buy="${esc(item.id)}"${!priced||short?" disabled":""}${short?` title="Pas assez d’or"`:""}>Acheter</button>
  </li>`;
}

function renderMerchant(){
  const c=game.campaign;
  const button=$("camp-merchant-btn");
  if(!c||!button) return;
  const visit=merchantRules().visitOf(c);
  button.disabled=!visit;
  $("camp-merchant-note").textContent=visit?visit.merchant.name:"Personne aujourd’hui";
  $("merchant-gold").textContent="Or : "+fmt(c.company.gold)+" PO";
  if(!visit){
    $("merchant-title").textContent="Pas de marchand aujourd’hui";
    $("merchant-content").innerHTML=`<p class="muted">Aucun marchand au camp. Il en passe plus souvent quand la compagnie est renommée.</p>`;
    return;
  }
  const m=visit.merchant;
  // Les cœurs seuls : les phrases d'affinité parlent d'un mercenaire envers son capitaine.
  const filled=Math.floor((Math.max(-100,Math.min(100,visit.affinity))+100)/20);
  const kind=({item})=>Math.max(0,MERCHANT_KINDS.indexOf(item.itemType));
  const stock=[...visit.stock].sort((a,b)=>kind(a)-kind(b)||a.item.name.localeCompare(b.item.name,"fr")||a.item.tier-b.item.tier);
  $("merchant-title").textContent=m.name;
  $("merchant-content").innerHTML=`<p class="merchant-who">${esc(m.people)} · ${esc(m.culture)}</p>
    <div class="player-affinity merchant-affinity"><small>Affinité avec le capitaine</small>
      <span class="player-affinity-hearts" aria-label="Affinité : ${filled} cœurs sur 10"><span class="is-full">${"♥".repeat(filled)}</span><span class="is-empty">${"♡".repeat(10-filled)}</span></span></div>
    <p class="muted">${merchantIsWoman(m)?"Elle":"Il"} repart demain matin. Ce qui est acheté rejoint l’Intendance.</p>
    ${stock.length?`<ul class="merchant-stock">${stock.map(merchantRow).join("")}</ul>`:`<p class="muted">Il a tout vendu.</p>`}`;
}

function buyFromMerchant(itemId){
  const result=merchantRules().buy(game.campaign,itemId);
  if(!result.ok){ tavernLog(result.reason,"warn"); renderMerchant(); return; }
  const item=result.item;
  tavernLog(`Acheté à ${result.merchant.name} : ${item.name}${item.itemType==="potion"?"":" (T"+item.tier+")"} pour ${fmt(result.price)} PO.`,"gear");
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
