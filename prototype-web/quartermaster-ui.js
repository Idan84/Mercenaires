"use strict";

// Intendance (doc 11 §16) : le stock de la compagnie. Pour l'instant, les armes, armures, bottes, ceintures et amulettes
// de rechange reçues à la création (Idan, 2026-10-23 et 2026-10-24), rangées par catégorie : les armes d'abord, puis
// les armures, de la plus légère à la plus lourde, puis les bottes, les ceintures et les amulettes ; deux objets
// identiques de même tier forment une ligne « × 2 ».
const STOCK_KINDS=["weapon","armor","boots","belt","amulet"];
const STOCK_ARMOR_GROUPS=[["Vêtement","Vêtements"],["Légère","Armures légères"],["Intermédiaire","Armures intermédiaires"],["Lourde","Armures lourdes"]];
function stockGroups(items){
  const groups=new Map();
  for(const item of items){
    const kind=STOCK_KINDS.includes(item.itemType)?item.itemType:"weapon",armor=kind==="armor";
    const key=kind+":"+(item.category||"Autres");
    if(!groups.has(key)) groups.set(key,{kind,armor,category:item.category||"Autres",rows:new Map()});
    const rows=groups.get(key).rows,row=item.name+"|"+item.tier;
    if(!rows.has(row)) rows.set(row,{item,count:0});
    rows.get(row).count+=1;
  }
  const byName=(a,b)=>a.localeCompare(b,"fr");
  const armorRank=category=>{ const i=STOCK_ARMOR_GROUPS.findIndex(([code])=>code===category); return i<0?STOCK_ARMOR_GROUPS.length:i; };
  const order=(a,b)=>(STOCK_KINDS.indexOf(a.kind)-STOCK_KINDS.indexOf(b.kind))||(a.armor?armorRank(a.category)-armorRank(b.category):0)||byName(a.category,b.category);
  return [...groups.values()].sort(order).map(({kind,armor,category,rows})=>({
    kind,
    key:kind+":"+category,
    category:armor?(STOCK_ARMOR_GROUPS.find(([code])=>code===category)?.[1]||category):category,
    count:[...rows.values()].reduce((sum,row)=>sum+row.count,0),
    rows:[...rows.values()].sort((a,b)=>byName(a.item.name,b.item.name)||a.item.tier-b.item.tier)
  }));
}

function stockCount(items){
  const count=type=>items.filter(item=>item.itemType===type).length;
  const armors=count("armor"),boots=count("boots"),belts=count("belt"),amulets=count("amulet");
  const weapons=items.length-armors-boots-belts-amulets;
  const plural=(n,word)=>n+" "+word+(n>1?"s":"");
  return [plural(weapons,"arme"),armors?plural(armors,"armure"):"",boots?plural(boots,"paire")+" de bottes":"",belts?plural(belts,"ceinture"):"",
    amulets?plural(amulets,"amulette"):""].filter(Boolean).join(" · ");
}

// Un clic sur la ligne propose « Donner à… » (deal-ui.js).
function renderStockRow({item,count}){
  return `<li class="stock-row" data-stock-deal="${esc(item.id)}" role="button" tabindex="0" title="Donner à…">
    ${gearTile({id:"stock",label:item.name},item)}
    <span class="stock-name">${esc(item.name)}</span>
    <span class="stock-tier stock-tier--${esc(item.qualityCode||"")}">T${item.tier} · ${esc(item.qualityName||"")}</span>
    <span class="stock-count">× ${count}</span>
  </li>`;
}

// Onglets par grande catégorie et catégories en accordéon, fermées par défaut (Idan, 2026-10-24). L'onglet choisi
// et les catégories ouvertes restent tels quels quand l'écran se redessine (passage d'un jour, retour au camp).
const STOCK_TABS=[["weapon","Armes"],["armor","Armures"],["boots","Bottes"],["belt","Ceintures"],["amulet","Amulettes"]];
const STOCK_EMPTY={weapon:"Aucune arme en stock.",armor:"Aucune armure en stock.",boots:"Aucune paire de bottes en stock.",belt:"Aucune ceinture en stock.",
  amulet:"Aucune amulette en stock."};
const stockView={tab:"weapon",open:new Set()};

function renderQuartermaster(){
  const list=$("quartermaster-stock");
  if(!list||!game.campaign) return;
  const items=game.campaign.company.stock||[];
  if(typeof renderStewardPanel==="function") renderStewardPanel();
  $("quartermaster-count").textContent=stockCount(items);
  const kindOf=item=>STOCK_KINDS.includes(item.itemType)?item.itemType:"weapon";
  const tabs=$("quartermaster-tabs");
  if(tabs) tabs.innerHTML=STOCK_TABS.map(([kind,label])=>{
    const active=kind===stockView.tab;
    return `<button type="button" role="tab" class="stock-tab${active?" active":""}" aria-selected="${active}" data-stock-tab="${kind}">${label} <small>${items.filter(item=>kindOf(item)===kind).length}</small></button>`;
  }).join("");
  if(!items.length){ list.innerHTML=`<p class="muted">Le stock est vide.</p>`; return; }
  const groups=stockGroups(items.filter(item=>kindOf(item)===stockView.tab));
  list.innerHTML=groups.length?groups.map(group=>`<details class="stock-group" data-stock-group="${esc(group.key)}"${stockView.open.has(group.key)?" open":""}>
    <summary><h3>${esc(group.category)} <small>${group.count}</small></h3></summary>
    <ul>${group.rows.map(renderStockRow).join("")}</ul>
  </details>`).join(""):`<p class="muted">${STOCK_EMPTY[stockView.tab]}</p>`;
}

function initializeQuartermaster(){
  document.addEventListener("click",event=>{
    const tab=event.target.closest?.("[data-stock-tab]");
    if(!tab) return;
    stockView.tab=tab.dataset.stockTab;
    renderQuartermaster();
  });
  // « toggle » ne remonte pas : écouté en capture.
  document.addEventListener("toggle",event=>{
    const key=event.target?.dataset?.stockGroup;
    if(!key) return;
    if(event.target.open) stockView.open.add(key); else stockView.open.delete(key);
  },true);
}

if(typeof document!=="undefined") initializeQuartermaster();
