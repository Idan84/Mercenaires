"use strict";

// Les Écuries (Idan, 2026-11-07 ; règles : game-core/stables.js) : sous la Grange du dresseur, toutes les montures de la
// compagnie (à l'Intendance ou à un mercenaire), d'où elles viennent, leur entretien, et « Relâcher » pour libérer une
// place (seulement sans propriétaire). L'Intendance les montre dans son onglet Montures (quartermaster-ui.js).
function stableRules(){ return typeof campaignRules==="function"?campaignRules().stableRules||null:null; }
function tamingRules(){ return typeof campaignRules==="function"?campaignRules().tamingRules||null:null; }
const pct=p=>p>=10||p===0?fmt(Math.round(p)):String(Math.round(p*10)/10).replace(".",",");
// Son nom (Idan, 2026-11-07 : « à la capture ou à l'achat de l'animal, on lui attribue un nom ») : celui qu'on lui a
// donné (stables.js, giveName), l'espèce à défaut.
const mountName=item=>item?.petName||item?.name||"Monture";
// Son logement, en mots : « les Écuries », « au Chenil » (stables.js).
const mountHouse=itemOrCode=>{
  const rules=stableRules();
  return rules?rules.houseWords(rules.houseOf(itemOrCode)):{the:"les Écuries",at:"aux Écuries"};
};
// « son destrier Tonnerre », « sa licorne Nacre » ; « le », « la ».
const FEMININE_MOUNTS=new Set(["licorne"]);
const mountWords=item=>{
  const name=String(item?.name||"").toLocaleLowerCase("fr"),female=FEMININE_MOUNTS.has(name);
  return {own:(female?"sa ":"son ")+name+(item?.petName?" "+item.petName:""),it:female?"la":"le",e:female?"e":""};
};

// Le statut d'une monture : à l'Intendance, à un mercenaire (non équipable tant qu'il ne l'a pas apprivoisée), apprivoisée.
// Au repos après une mission (Idan, 2026-11-07 : « elle a la même fiche qu'un mercenaire ») : blessée ou fatiguée, N jours.
function mountRest(item){
  const r=item?.recovery;
  return r?`${r.kind==="wounded"?"blessée":"fatiguée"}, indisponible ${fmt(r.daysLeft)} j`:"";
}
function mountStatus(c,item){
  const rules=stableRules(),owner=rules?.ownerOf(c,item),rest=mountRest(item);
  const where=!owner?"à l’Intendance":item.tamedBy===owner.id?`à ${owner.name}, apprivoisée`:`à ${owner.name}, non équipable (à apprivoiser)`;
  return rest?`${where} · ${rest}`:where;
}

function stableHtml(c){
  const rules=stableRules();
  if(!rules||!c) return "";
  // Les Écuries, puis le Chenil (Idan, 2026-11-07 : « Il loge au chenil ») : chacun ses places et ses animaux.
  return [rules.STABLES,rules.KENNEL].map(house=>{
    const places=rules.places(c,house),mounts=rules.mountsIn(c,house);
    if(!places&&!mounts.length) return "";
    const rows=mounts.map(m=>`<div class="study-row">
      <div class="building-info"><strong data-rename-host>${esc(mountName(m))}${typeof renameButton==="function"?renameButton("mount",m.id):""}</strong><span>${esc([m.petName?m.name:"",mountStatus(c,m),m.origin,m.day?"jour "+fmt(m.day):"",fmt(rules.upkeepOf(m))+" PO par jour"].filter(Boolean).join(" · "))}</span>${tamingLine(c,m)}</div>
      ${m.owner==null?`<div class="study-actions"><button type="button" class="secondary" data-stable-release="${esc(m.id)}">Relâcher</button></div>`:tamingAction(c,m)}
    </div>`).join("");
    const upkeep=mounts.reduce((sum,m)=>sum+rules.upkeepOf(m),0);
    const title=campaignRules().campBuildingRow?.(house)?.nom||"Les Écuries";
    return `<div class="study-list"><h4>${esc(title)} (${fmt(mounts.length)} / ${fmt(places)})${upkeep?` · entretien ${fmt(upkeep)} PO par jour`:""}</h4>${rows}</div>`;
  }).join("");
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
    +(odds.gap?` × ${pct(odds.alignment)} % (alignement, ${odds.gap} cran${odds.gap>1?"s":""} d’écart)`:"")+` = ${pct(odds.chance)} %`;
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
    // Le loup d'un humain (Idan, 2026-11-07) : il ne le monte pas, il l'emmène au combat.
    const rides=stableRules()?.rides(t.mercenary,t.mount)!==false;
    tavernLog(`${t.mercenary.name} a apprivoisé ${words.own} (${fmt(t.days)} jour${t.days>1?"s":""}) : ${rides?`il peut ${words.it} monter`:"il l’emmènera au combat"}.`,"gear");
  }
}

// La carte de survol d'une monture (ui.js, gearTooltip) : sa famille, son alignement, son entretien, son statut.
function mountCardHtml(item){
  const c=game.campaign,rules=stableRules(),sheet=rules?.sheetOf(item);
  if(!sheet) return "";
  const lines=[item.petName?item.name:"",sheet.espece,sheet.alignement,fmt(rules.upkeepOf(item))+" PO par jour"].filter(Boolean).join(" · ");
  return `<div class="item-card">
    <div class="item-card-names"><strong class="item-card-title">${esc(mountName(item))}</strong><span class="item-card-sub">${esc(lines)}</span></div>
    ${c?`<p class="item-card-flavor">${esc(mountStatus(c,item))}</p>`:""}
  </div>`;
}

// Le renommer (Idan, 2026-11-07 : « renommer un mercenaire ou un animal librement ») : le crayon à côté de son nom.
function renameStableMount(button){
  const item=stableRules()?.mountsOf(game.campaign).find(i=>String(i.id)===String(button.dataset.renameId));
  if(!item) return;
  renameField(button.closest("[data-rename-host]"),mountName(item),name=>{
    if(name!=null&&stableRules().rename(game.campaign,item.id,name).ok) saveGame();
    renderGame();
  });
}

function releaseStableMount(id){
  const c=game.campaign,rules=stableRules();
  if(!c||!rules) return;
  const result=rules.release(c,id);
  if(typeof closeDealMenu==="function") closeDealMenu();
  if(!result.ok){ tavernLog(result.reason,"bad"); return; }
  tavernLog(mountName(result.mount)+" est relâché"+mountWords(result.mount).e+" : une place se libère "+mountHouse(result.mount).at+".","info");
  saveGame();
  renderGame();
}

// Journal du matin : l'entretien du jour, les montures remises de leur mission.
function logStableUpkeep(report){
  if(report?.total) tavernLog("Animaux : −"+fmt(report.total)+" PO d’entretien ("+fmt(report.count)+" anima"+(report.count>1?"ux":"l")+").","gear");
  for(const r of report?.recovered||[]){
    const e=mountWords(r.mount).e;
    tavernLog(`${mountName(r.mount)}${r.owner?" de "+r.owner.name:""} est ${r.kind==="wounded"?"guéri"+e+" de ses blessures":"reposé"+e}.`,"turn");
  }
}
// Retour d'une escouade : les montures capturées entrent aux Écuries, ou sont relâchées faute de place.
function logStableArrivals(report){
  for(const m of report?.kept||[]) tavernLog(`${mountName(m)}${m.petName?" ("+m.name+")":""} rejoint ${mountHouse(m).the}.`,"gear");
  for(const m of report?.released||[]) tavernLog(`${m.name||"Une monture"} : pas de place ${mountHouse(m.code||m).at}, relâché${mountWords(m).e}.`,"bad");
}

if(typeof document!=="undefined") document.addEventListener("click",event=>{
  const button=event.target.closest?.("[data-stable-release]");
  if(button){ releaseStableMount(button.dataset.stableRelease); return; }
  const rename=event.target.closest?.("[data-rename='mount']");
  if(rename){ renameStableMount(rename); return; }
  const start=event.target.closest?.("[data-taming-start]");
  if(start){ startTaming(start.dataset.tamingStart); return; }
  const stop=event.target.closest?.("[data-taming-stop]");
  if(stop) stopTaming(stop.dataset.tamingStop);
});
