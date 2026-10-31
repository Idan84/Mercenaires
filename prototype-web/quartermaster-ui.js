"use strict";

// Intendance (doc 11 §16) : le stock de la compagnie, sans propriétaire, rangé par catégorie : les armes d'abord, puis les
// armures, de la plus légère à la plus lourde, puis les casques, bottes, ceintures, amulettes, capes, gants, culottes,
// bagues et potions ; deux objets identiques de même tier forment une case « × 2 ».
const STOCK_KINDS=["weapon","armor","helmet","boots","belt","amulet","cape","gloves","pants","ring","potion"];
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

// Une case par objet (Idan, 2026-10-31 : des icônes, pas du texte) : son image dans son cadre de tier, le nombre en
// pastille ; le nom et le détail au survol (carte d'objet). Un clic propose « Donner à… » (deal-ui.js).
function renderStockTile({item,count}){
  return `<li class="stock-tile" data-stock-deal="${esc(item.id)}" role="button" tabindex="0" aria-label="${esc(itemPublicName(item))}${count>1?" × "+count:""}">
    ${gearTile({id:"stock",label:item.name},item)}${count>1?`<span class="stock-count">${count}</span>`:""}
  </li>`;
}

// Onglets en icônes, le nombre dessous, le nom au survol ; un onglet vide est grisé. Les catégories (Armes de tir,
// Armures légères…) en petits intitulés au-dessus de leur grille. L'onglet choisi reste tel quel quand l'écran se
// redessine (passage d'un jour, retour au camp).
const STOCK_TABS=[["weapon","Armes","melee"],["armor","Armures","armor"],["helmet","Casques","head"],["boots","Bottes","boots"],["belt","Ceintures","belt"],
  ["amulet","Amulettes","amulet"],["cape","Capes","cape"],["gloves","Gants","gloves"],["pants","Culottes","pants"],["ring","Bagues","ring"],["potion","Potions","flask"]];
const stockView={tab:"weapon"};

function renderQuartermaster(){
  const list=$("quartermaster-stock");
  if(!list||!game.campaign) return;
  const items=game.campaign.company.stock||[];
  if(typeof renderStewardPanel==="function") renderStewardPanel();
  const kindOf=item=>STOCK_KINDS.includes(item.itemType)?item.itemType:"weapon";
  const count=kind=>items.filter(item=>kindOf(item)===kind).length;
  if(!count(stockView.tab)) stockView.tab=STOCK_TABS.find(([kind])=>count(kind))?.[0]||stockView.tab;
  const tabs=$("quartermaster-tabs");
  if(tabs) tabs.innerHTML=STOCK_TABS.map(([kind,label,icon])=>{
    const active=kind===stockView.tab,n=count(kind);
    return `<button type="button" role="tab" class="stock-tab${active?" active":""}" aria-selected="${active}" data-stock-tab="${kind}" title="${label}" aria-label="${label} : ${n}"${n?"":" disabled"}>${gearIcon(icon)}<small>${n}</small></button>`;
  }).join("");
  if(!items.length){ list.innerHTML=`<p class="stock-empty">Stock vide</p>`; return; }
  const groups=stockGroups(items.filter(item=>kindOf(item)===stockView.tab));
  list.innerHTML=groups.map(group=>`<section class="stock-group" data-stock-group="${esc(group.key)}">
    <h3>${esc(group.category)}</h3>
    <ul class="stock-grid">${group.rows.map(renderStockTile).join("")}</ul>
  </section>`).join("");
}

function initializeQuartermaster(){
  document.addEventListener("click",event=>{
    const tab=event.target.closest?.("[data-stock-tab]");
    if(!tab) return;
    stockView.tab=tab.dataset.stockTab;
    renderQuartermaster();
  });
}

if(typeof document!=="undefined") initializeQuartermaster();
