"use strict";

// Le Mémorial (Idan, 2026-11-09), interface. Dans Ma Compagnie, sous le Dortoir : la carte du Mémorial, là dès le début
// (« Le batiment ne se monte pas »), et « Aller au Mémorial ». L'écran : les portraits de tous ceux qui sont morts dans la
// compagnie, du plus récent au plus ancien ; un clic : l'avatar complet, la date de sa mort, la cause (un peu drôle), son
// épitaphe et son historique. Règles : game-core/memorial.js ; textes : data/reference/memorial.json.
function memorialRules(){ return game.campaign&&typeof campaignRules==="function"?campaignRules().memorialRules||null:null; }
function memorialCopy(){ return game.referenceData?.memorial?.panel||{}; }
const memorialFemale=p=>String(p?.sex||"").trim().toLowerCase().startsWith("f");
const memorialFill=(text,vars={},female=false)=>MercenairesRecruitDialogue.fill(String(text||""),vars,female);

function memorialCountText(n){
  const copy=memorialCopy();
  return n>1?memorialFill(copy.count_many,{n:fmt(n)}):n===1?copy.count_one||"":copy.count_zero||"";
}

// La place d'entraînement en Nécromancie (dès le premier mort) : son niveau (morts ÷ 10) et qui l'occupe aujourd'hui.
function memorialTrainingText(c){
  const room=(campaignRules().trainingRooms?.(c)||[]).find(r=>r.code==="memorial");
  if(!room) return "";
  const students=typeof schoolStudents==="function"?schoolStudents(c,room.code):[];
  const level=(Math.round(room.level*10)/10).toLocaleString("fr-FR");
  return ` · ${esc(room.trains)} · niveau ${esc(level)} · <span class="building-places" title="${esc(typeof schoolStudentsTitle==="function"?schoolStudentsTitle(c,students):"")}">${fmt(students.length)}/${fmt(room.places)} place${room.places>1?"s":""}</span>`;
}
// Ma Compagnie : la carte du Mémorial (pas de chantier, pas de niveau à construire).
function memorialCardHtml(c){
  const rules=memorialRules();
  if(!rules) return "";
  const copy=memorialCopy();
  return `<article class="building-card building-card--link building-card--memorial">
      <div class="building-info"><strong title="${esc(copy.description||"")}">${esc(copy.name||"Mémorial")}</strong><span>${esc(memorialCountText(rules.deaths(c)))}${memorialTrainingText(c)}</span></div>
      <button type="button" class="primary" data-open-camp-scene="memorial" data-destination="${esc(copy.name||"Mémorial")}">${esc(copy.go||"")}</button>
    </article>`;
}

// Un portrait de la galerie : le visage, le nom, la date.
function memorialPortraitHtml(entry){
  const profile=entry.profile||{name:entry.name};
  return `<button type="button" class="memorial-portrait" data-memorial-open="${esc(entry.id)}" title="${esc(entry.name)}">
      ${renderAvatar(profile,{variant:"card",kind:"portrait"})}
      <b>${esc(entry.name)}</b><small>${esc(historyDate(entry.day))}</small>
    </button>`;
}

// La fiche d'un mort : l'avatar complet, la date, la cause, l'épitaphe, son historique (arrêté au jour de sa mort).
function memorialDetailHtml(entry){
  const rules=memorialRules(),copy=memorialCopy(),profile=entry.profile||{name:entry.name};
  const female=memorialFemale(profile),text=rules.describe(entry);
  const days=MercenairesHistory.daysInCompany(profile,entry.day);
  const people=[profile.people,profile.culture].filter(Boolean).join(" · ");
  return `<article class="memorial-detail">
      <button type="button" class="secondary memorial-back" data-memorial-close>← ${esc(copy.close||"Fermer")}</button>
      <div class="memorial-detail-body">
        <div class="memorial-detail-avatar">${renderAvatar(profile,{variant:"detail",kind:"full"})}</div>
        <div class="memorial-detail-text">
          <h3>${esc(entry.name)}</h3>
          ${people?`<p class="memorial-people">${esc(people)}</p>`:""}
          <p class="memorial-date">${esc(memorialFill(copy.died,{date:historyDate(entry.day)},female))}</p>
          <p class="memorial-days">${esc(memorialFill(copy.days,{jours:historyPlural(days,"jour","jours")},female))}</p>
          <h4>${esc(copy.cause||"")}</h4>
          <p class="memorial-cause">${esc(text.cause)}</p>
          ${text.detail?`<p class="memorial-cause-detail">${esc(text.detail)}</p>`:""}
          ${text.epitaph?`<h4>${esc(copy.epitaph||"")}</h4><blockquote class="memorial-epitaph">${esc(text.epitaph)}</blockquote>`:""}
        </div>
      </div>
      <section class="memorial-history"><h4>${esc(copy.history||"")}</h4>${renderHistoryTab(profile,{day:entry.day})}</section>
    </article>`;
}

// L'écran du Mémorial : la galerie, ou la fiche du mort choisi.
function renderMemorial(){
  const box=$("memorial-view"),c=game.campaign,rules=memorialRules();
  if(!box) return;
  if(!c||!rules){ box.innerHTML=""; return; }
  const copy=memorialCopy();
  const list=[...rules.entries(c)].reverse();
  const open=game.memorialOpen!=null?rules.entryOf(c,game.memorialOpen):null;
  const gallery=list.length?`<div class="memorial-grid">${list.map(memorialPortraitHtml).join("")}</div>`:`<p class="muted">${esc(copy.empty||"")}</p>`;
  box.innerHTML=`<p class="eyebrow">${esc(copy.eyebrow||"")}</p>
    <h2>${esc(copy.title||"")}</h2>
    <p class="memorial-intro">${esc(copy.intro||"")} ${esc(memorialCountText(list.length))}.</p>
    ${open?memorialDetailHtml(open):gallery}`;
}

function initializeMemorial(){
  document.addEventListener("click",event=>{
    const openButton=event.target.closest?.("[data-memorial-open]");
    if(openButton){ game.memorialOpen=openButton.dataset.memorialOpen; renderMemorial(); return; }
    if(event.target.closest?.("[data-memorial-close]")){ game.memorialOpen=null; renderMemorial(); return; }
    // En arrivant par « Aller au Mémorial » : la galerie.
    if(event.target.closest?.('[data-open-camp-scene="memorial"]')){ game.memorialOpen=null; renderMemorial(); }
  });
}

if(typeof document!=="undefined") initializeMemorial();
