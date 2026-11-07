"use strict";

// Les Écuries (Idan, 2026-11-07 ; règles : game-core/stables.js) : sous la Grange du dresseur, toutes les montures de la
// compagnie (à l'Intendance ou à un mercenaire), d'où elles viennent, leur entretien, et « Relâcher » pour libérer une
// place (seulement sans propriétaire). L'Intendance les montre dans son onglet Montures (quartermaster-ui.js).
function stableRules(){ return typeof campaignRules==="function"?campaignRules().stableRules||null:null; }

// Le statut d'une monture : à l'Intendance, à un mercenaire (non équipable tant qu'il ne l'a pas apprivoisée), apprivoisée.
function mountStatus(c,item){
  const rules=stableRules(),owner=rules?.ownerOf(c,item);
  if(!owner) return "à l’Intendance";
  return item.tamedBy===owner.id?`à ${owner.name}, apprivoisée`:`à ${owner.name}, non équipable (à apprivoiser)`;
}

function stableHtml(c){
  const rules=stableRules();
  if(!rules||!c) return "";
  const places=rules.places(c),mounts=rules.mountsOf(c);
  if(!places&&!mounts.length) return "";
  const rows=mounts.map(m=>`<div class="study-row">
      <div class="building-info"><strong>${esc(m.name)}</strong><span>${esc([mountStatus(c,m),m.origin,m.day?"jour "+fmt(m.day):"",fmt(rules.upkeepOf(m))+" PO par jour"].filter(Boolean).join(" · "))}</span></div>
      ${m.owner==null?`<div class="study-actions"><button type="button" class="secondary" data-stable-release="${esc(m.id)}">Relâcher</button></div>`:""}
    </div>`).join("");
  const upkeep=rules.upkeep(c);
  return `<div class="study-list"><h4>Les Écuries (${fmt(mounts.length)} / ${fmt(places)})${upkeep?` · entretien ${fmt(upkeep)} PO par jour`:""}</h4>${rows}</div>`;
}

// La carte de survol d'une monture (ui.js, gearTooltip) : sa famille, son alignement, son entretien, son statut.
function mountCardHtml(item){
  const c=game.campaign,rules=stableRules(),sheet=rules?.sheetOf(item);
  if(!sheet) return "";
  const lines=[sheet.espece,sheet.alignement,fmt(rules.upkeepOf(item))+" PO par jour"].filter(Boolean).join(" · ");
  return `<div class="item-card">
    <div class="item-card-names"><strong class="item-card-title">${esc(item.name)}</strong><span class="item-card-sub">${esc(lines)}</span></div>
    ${c?`<p class="item-card-flavor">${esc(mountStatus(c,item))}</p>`:""}
  </div>`;
}

function releaseStableMount(id){
  const c=game.campaign,rules=stableRules();
  if(!c||!rules) return;
  const result=rules.release(c,id);
  if(typeof closeDealMenu==="function") closeDealMenu();
  if(!result.ok){ tavernLog(result.reason,"bad"); return; }
  tavernLog(result.mount.name+" est relâché"+(/e$/.test(result.mount.name)?"e":"")+" : une place se libère aux Écuries.","info");
  saveGame();
  renderGame();
}

// Journal du matin : l'entretien du jour.
function logStableUpkeep(report){
  if(report?.total) tavernLog("Écuries : −"+fmt(report.total)+" PO d’entretien ("+fmt(report.count)+" monture"+(report.count>1?"s":"")+").","gear");
}
// Retour d'une escouade : les montures capturées entrent aux Écuries, ou sont relâchées faute de place.
function logStableArrivals(report){
  for(const m of report?.kept||[]) tavernLog(m.name+" rejoint les Écuries.","gear");
  for(const m of report?.released||[]) tavernLog((m.name||"Une monture")+" : pas de place aux Écuries, relâchée.","bad");
}

if(typeof document!=="undefined") document.addEventListener("click",event=>{
  const button=event.target.closest?.("[data-stable-release]");
  if(button) releaseStableMount(button.dataset.stableRelease);
});
