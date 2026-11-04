"use strict";

// Relance après un refus (Idan, 2026-11-04 : « On peut retenter via deux options de dialogues (ou laisser tomber) :
// Intimider, Convaincre »), interface commune : après un refus, la boîte de dialogue des échanges propose Intimider,
// Convaincre ou Laisser tomber ; chaque écran inscrit sa relance (registerPersuasion) ; la phrase du capitaine, la réplique et
// l'issue s'ajoutent au dialogue. Règles : game-core/persuasion.js ; textes : persuasion-dialogue.json.
const PERSUASION_HANDLERS={};
function registerPersuasion(kind,handler){ PERSUASION_HANDLERS[kind]=handler; }
function persuasionCopy(){ return game.referenceData?.persuasionDialogue||{}; }
const persuasionLeaveHtml=()=>`<ol class="talk-options"><li><button type="button" data-deal-leave>Partir</button></li></ol>`;
// Les trois choix ; data : le contexte de la relance ({ member, item, study, course… } → data-persuade-member…).
function persuasionChoicesHtml(kind,data={}){
  const options=persuasionCopy().options||{};
  const attrs=Object.entries(data).map(([key,value])=>` data-persuade-${key}="${esc(value)}"`).join("");
  return `<ol class="talk-options">${["intimidate","convince"].map(key=>`<li><button type="button" data-persuade="${key}" data-persuade-kind="${esc(kind)}"${attrs}>${esc(options[key]||"")}</button></li>`).join("")}
      <li><button type="button" data-deal-leave>${esc(options.leave||"")}</button></li></ol>`;
}
// Après un refus : les trois choix s'il a refusé (et qu'on peut insister), sinon « Partir ».
function persuasionAfter(result,kind,data){
  $("deal-talk-choices").innerHTML=!result.accepted&&result.canRetry?persuasionChoicesHtml(kind,data):persuasionLeaveHtml();
}
// La relance, ajoutée au dialogue : la phrase du capitaine, la réplique, l'issue (outcome : l'issue d'un accord, déjà
// remplie) ; puis « Partir ».
function persuasionAppend(m,result,outcome,seed){
  const pers=persuasionCopy(),approach=result.approach;
  const line=variantPhrase(pers.captain?.[approach]||[],seed);
  const reply=variantPhrase(pers.reply?.[approach]?.[result.accepted?"accepted":"refused"]||[],seed);
  $("deal-talk-log").insertAdjacentHTML("beforeend",`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(studyFill(line,m))} »</span></p>
    <p class="talk-say talk-say--merc"><b>${esc(MercenairesRecruitDialogue.firstName(m))}</b><span>« ${esc(studyFill(reply,m))} »</span></p>
    <p class="talk-note">${esc(result.accepted?outcome:studyFill(pers.final_refused,m))}</p>`);
  // Il refuse encore : on peut le jeter au cachot (Idan, 2026-11-04 ; dungeon-ui.js).
  const jail=!result.accepted&&typeof dungeonChoiceHtml==="function"?dungeonChoiceHtml(m):"";
  $("deal-talk-choices").innerHTML=jail?`<ol class="talk-options">${jail}<li><button type="button" data-deal-leave>Partir</button></li></ol>`:persuasionLeaveHtml();
}

function initializePersuasion(){
  document.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-persuade]");
    if(!button) return;
    const handler=PERSUASION_HANDLERS[button.dataset.persuadeKind];
    if(handler) handler(button.dataset.persuade,button.dataset);
  });
}

if(typeof document!=="undefined") initializePersuasion();
