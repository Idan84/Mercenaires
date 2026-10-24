"use strict";

// Intendance (doc 11 §16) : le stock de la compagnie. Pour l'instant, les armes, armures et bottes de rechange reçues
// à la création (Idan, 2026-10-23 et 2026-10-24), rangées par catégorie : les armes d'abord, puis les armures, de la
// plus légère à la plus lourde, puis les bottes ; deux objets identiques de même tier forment une ligne « × 2 ».
const STOCK_KINDS=["weapon","armor","boots"];
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
  return [...groups.values()].sort(order).map(({armor,category,rows})=>({
    category:armor?(STOCK_ARMOR_GROUPS.find(([code])=>code===category)?.[1]||category):category,
    count:[...rows.values()].reduce((sum,row)=>sum+row.count,0),
    rows:[...rows.values()].sort((a,b)=>byName(a.item.name,b.item.name)||a.item.tier-b.item.tier)
  }));
}

function stockCount(items){
  const count=type=>items.filter(item=>item.itemType===type).length;
  const armors=count("armor"),boots=count("boots"),weapons=items.length-armors-boots;
  const plural=(n,word)=>n+" "+word+(n>1?"s":"");
  return [plural(weapons,"arme"),armors?plural(armors,"armure"):"",boots?plural(boots,"paire")+" de bottes":""].filter(Boolean).join(" · ");
}

function renderStockRow({item,count}){
  return `<li class="stock-row">
    ${gearTile({id:"stock",label:item.name},item)}
    <span class="stock-name">${esc(item.name)}</span>
    <span class="stock-tier stock-tier--${esc(item.qualityCode||"")}">T${item.tier} · ${esc(item.qualityName||"")}</span>
    <span class="stock-count">× ${count}</span>
  </li>`;
}

function renderQuartermaster(){
  const list=$("quartermaster-stock");
  if(!list||!game.campaign) return;
  const items=game.campaign.company.stock||[];
  $("quartermaster-count").textContent=stockCount(items);
  list.innerHTML=items.length?stockGroups(items).map(group=>`<section class="stock-group">
    <h3>${esc(group.category)} <small>${group.count}</small></h3>
    <ul>${group.rows.map(renderStockRow).join("")}</ul>
  </section>`).join(""):`<p class="muted">Le stock est vide.</p>`;
}
