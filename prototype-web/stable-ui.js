"use strict";

// Les Écuries (Idan, 2026-11-07 ; règles : game-core/stables.js) : sous la Grange du dresseur, toutes les montures de la
// compagnie (à l'Intendance ou à un mercenaire), d'où elles viennent, leur entretien, et « Relâcher » pour libérer une
// place (seulement sans propriétaire). L'Intendance les montre dans son onglet Montures (quartermaster-ui.js).
function stableRules(){ return typeof campaignRules==="function"?campaignRules().stableRules||null:null; }
function tamingRules(){ return typeof campaignRules==="function"?campaignRules().tamingRules||null:null; }
const pct=p=>p>=10||p===0?fmt(Math.round(p)):String(Math.round(p*10)/10).replace(".",",");
// « son destrier », « sa licorne » ; « le », « la ».
const FEMININE_MOUNTS=new Set(["licorne"]);
const mountWords=item=>{
  const name=String(item?.name||"").toLocaleLowerCase("fr"),female=FEMININE_MOUNTS.has(name);
  return {own:(female?"sa ":"son ")+name,it:female?"la":"le"};
};

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
      <div class="building-info"><strong>${esc(m.name)}</strong><span>${esc([mountStatus(c,m),m.origin,m.day?"jour "+fmt(m.day):"",fmt(rules.upkeepOf(m))+" PO par jour"].filter(Boolean).join(" · "))}</span>${tamingLine(c,m)}</div>
      ${m.owner==null?`<div class="study-actions"><button type="button" class="secondary" data-stable-release="${esc(m.id)}">Relâcher</button></div>`:tamingAction(c,m)}
    </div>`).join("");
  const upkeep=rules.upkeep(c);
  return `<div class="study-list"><h4>Les Écuries (${fmt(mounts.length)} / ${fmt(places)})${upkeep?` · entretien ${fmt(upkeep)} PO par jour`:""}</h4>${rows}</div>`;
}

// Apprivoiser (Idan, 2026-11-07 ; règles : game-core/taming.js) : celui qui l'a reçue va à la Grange ; chaque matin, deux
// tests (ses caractéristiques avec l'aide du Dresseur, puis l'alignement) ; leur chance au survol.
function tamingOf(c,item){
  const rules=tamingRules(),owner=stableRules()?.ownerOf(c,item);
  if(!rules||!owner||item.tamedBy===owner.id) return null;
  const t=rules.tamingOf(c,owner.id);
  return t&&String(t.mountId)===String(item.id)?t:null;
}
function tamingOddsText(c,item){
  const rules=tamingRules(),owner=stableRules()?.ownerOf(c,item);
  if(!rules||!owner) return "";
  const odds=rules.dailyChance(c,{studentId:owner.id,mountId:item.id});
  return `Chaque jour : ${pct(odds.skill)} % (dressage${odds.trainerBonus?", avec le Dresseur":""})`
    +(odds.excess?` × ${pct(odds.alignment)} % (alignement, ${odds.excess} cran${odds.excess>1?"s":""} de trop)`:"")+` = ${pct(odds.chance)} %`;
}
function tamingLine(c,item){
  const t=tamingOf(c,item);
  if(!t) return "";
  const rules=tamingRules();
  return `<span title="${esc(tamingOddsText(c,item))}">${rules.isPlanned(t)?"Entre à la Grange demain matin":"À la Grange : jour "+fmt(t.days+1)}</span>`;
}
function tamingAction(c,item){
  const owner=stableRules()?.ownerOf(c,item),rules=tamingRules();
  if(!rules||!owner||item.tamedBy===owner.id) return "";
  const t=tamingOf(c,item);
  if(t) return `<div class="study-actions"><button type="button" class="secondary" data-taming-stop="${esc(t.id)}">${rules.isPlanned(t)?"Annuler":"Le faire sortir"}</button></div>`;
  const check=rules.canTame(c,owner,item.id);
  return `<div class="study-actions"><button type="button" class="secondary" data-taming-start="${esc(item.id)}"${check.ok?"":" disabled"} title="${esc(check.ok?tamingOddsText(c,item):check.reason)}">Apprivoiser</button></div>`;
}
function startTaming(mountId){
  const c=game.campaign,item=stableRules()?.mountsOf(c).find(i=>String(i.id)===String(mountId)),owner=item&&stableRules().ownerOf(c,item);
  if(!owner) return;
  const result=tamingRules().start(c,owner.id,item.id);
  if(!result.ok){ tavernLog(result.reason,"bad"); return; }
  tavernLog(`${owner.name} entre demain matin à la Grange du dresseur pour apprivoiser ${mountWords(item).own}.`,"turn");
  saveGame();
  renderGame();
}
function stopTaming(tamingId){
  const result=tamingRules()?.stop(game.campaign,tamingId);
  if(!result?.ok){ if(result) tavernLog(result.reason,"bad"); return; }
  if(result.mercenary) tavernLog(result.cancelled?`${result.mercenary.name} n’ira pas à la Grange du dresseur.`:`${result.mercenary.name} quitte la Grange du dresseur.`,"info");
  saveGame();
  renderGame();
}
// Journal du matin : ceux qui entrent à la Grange, ceux qui ont apprivoisé leur monture.
function logTaming(report){
  for(const s of report?.started||[]) tavernLog(`${s.mercenary.name} entre à la Grange du dresseur.`,"turn");
  for(const t of report?.tamed||[]){
    const words=mountWords(t.mount);
    tavernLog(`${t.mercenary.name} a apprivoisé ${words.own} (${fmt(t.days)} jour${t.days>1?"s":""}) : il peut ${words.it} monter.`,"gear");
  }
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
  if(button){ releaseStableMount(button.dataset.stableRelease); return; }
  const start=event.target.closest?.("[data-taming-start]");
  if(start){ startTaming(start.dataset.tamingStart); return; }
  const stop=event.target.closest?.("[data-taming-stop]");
  if(stop) stopTaming(stop.dataset.tamingStop);
});
