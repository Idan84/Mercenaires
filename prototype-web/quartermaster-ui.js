"use strict";

// Intendance (doc 11 §16) : le stock de la compagnie. Pour l'instant, les armes de rechange reçues à la création
// (Idan, 2026-10-23), rangées par catégorie ; deux armes identiques de même tier forment une ligne « × 2 ».
function stockGroups(items){
  const groups=new Map();
  for(const item of items){
    const category=item.category||"Autres";
    if(!groups.has(category)) groups.set(category,new Map());
    const rows=groups.get(category),key=item.name+"|"+item.tier;
    if(!rows.has(key)) rows.set(key,{item,count:0});
    rows.get(key).count+=1;
  }
  const byName=(a,b)=>a.localeCompare(b,"fr");
  return [...groups].sort(([a],[b])=>byName(a,b)).map(([category,rows])=>({
    category,
    count:[...rows.values()].reduce((sum,row)=>sum+row.count,0),
    rows:[...rows.values()].sort((a,b)=>byName(a.item.name,b.item.name)||a.item.tier-b.item.tier)
  }));
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
  $("quartermaster-count").textContent=items.length+(items.length>1?" armes":" arme");
  list.innerHTML=items.length?stockGroups(items).map(group=>`<section class="stock-group">
    <h3>${esc(group.category)} <small>${group.count}</small></h3>
    <ul>${group.rows.map(renderStockRow).join("")}</ul>
  </section>`).join(""):`<p class="muted">Le stock est vide.</p>`;
}
