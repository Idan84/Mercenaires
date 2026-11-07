"use strict";

// Les Écuries (Idan, 2026-11-07 ; règles : game-core/stables.js) : sous la Grange du dresseur, les montures de la compagnie,
// d'où elles viennent, leur entretien, et « Relâcher » pour libérer une place.
function stableRules(){ return typeof campaignRules==="function"?campaignRules().stableRules||null:null; }

function stableHtml(c){
  const rules=stableRules();
  if(!rules||!c) return "";
  const places=rules.places(c),mounts=rules.mountsOf(c);
  if(!places&&!mounts.length) return "";
  const rows=mounts.map(m=>`<div class="study-row">
      <div class="building-info"><strong>${esc(m.name)}</strong><span>${esc([m.origin,"jour "+fmt(m.day),fmt(rules.upkeepOf(m))+" PO par jour"].filter(Boolean).join(" · "))}</span></div>
      <div class="study-actions"><button type="button" class="secondary" data-stable-release="${esc(m.id)}">Relâcher</button></div>
    </div>`).join("");
  const upkeep=rules.upkeep(c);
  return `<div class="study-list"><h4>Les Écuries (${fmt(mounts.length)} / ${fmt(places)})${upkeep?` · entretien ${fmt(upkeep)} PO par jour`:""}</h4>${rows}</div>`;
}

function releaseStableMount(id){
  const c=game.campaign,rules=stableRules();
  if(!c||!rules) return;
  const result=rules.release(c,id);
  if(!result.ok){ tavernLog(result.reason,"bad"); return; }
  tavernLog(result.mount.name+" est relâché : une place se libère aux Écuries.","info");
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
  for(const m of report?.released||[]) tavernLog(m.name+" : pas de place aux Écuries, il est relâché.","bad");
}

if(typeof document!=="undefined") document.addEventListener("click",event=>{
  const button=event.target.closest?.("[data-stable-release]");
  if(button) releaseStableMount(button.dataset.stableRelease);
});
