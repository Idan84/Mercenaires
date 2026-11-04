"use strict";

// Désertion (Idan, 2026-11-04), interface. Le journal du matin : celui qui a filé (l'intendant le signale), celui que la
// Vigie a repéré. La scène, au début de la journée (et au chargement d'une partie), une par repéré : on ne peut rien faire
// d'autre avant de l'avoir réglée (« Cette interface arrive en début de journée et on ne peut pas faire autre chose avant
// d'avoir résolu ça ») : Intimider, Convaincre (une tentative), le défier en combat singulier, le laisser partir.
// Règles : game-core/desertion.js ; textes : data/reference/desertion-dialogue.json.
function desertionRules(){ return campaignRules().desertionRules||null; }
function desertionCopy(){ return game.referenceData?.desertionDialogue||{}; }
const desertionFemale=m=>String(m?.sex||"").trim().toLowerCase().startsWith("f");
const desertionFill=(text,m,vars={})=>MercenairesRecruitDialogue.fill(String(text||""),{prenom:MercenairesRecruitDialogue.firstName(m),nom:m?.name||"",...vars},desertionFemale(m));

// Le journal du matin.
function logDesertion(report){
  if(!report) return;
  const log=desertionCopy().log||{},company=game.campaign?.company;
  const steward=company?.roster.find(m=>m.id===company.intendantId);
  for(const f of report.fled||[]) tavernLog(steward?desertionFill(log.steward,f.mercenary,{intendant:steward.name}):desertionFill(log.vanished,f.mercenary),"bad");
  for(const s of report.spotted||[]) tavernLog(desertionFill(log.spotted,s.mercenary),"warn");
}

// La notification du jour (day-news-ui.js) : des lignes urgentes.
function desertionNews(report){
  const news=desertionCopy().day_news||{},company=game.campaign?.company;
  const steward=company?.roster.some(m=>m.id===company.intendantId);
  return [...(report?.fled||[]).map(f=>({tone:"alert",icon:"alert",text:desertionFill(news.fled,f.mercenary),detail:steward?news.fled_steward:news.fled_alone,faces:[f.mercenary]})),
    ...(report?.spotted||[]).map(s=>({tone:"alert",icon:"alert",text:desertionFill(news.spotted,s.mercenary),detail:news.spotted_detail,faces:[s.mercenary]}))];
}

// Les choix de la scène ; une fois réglée : « Continuer ».
function desertionChoicesHtml(m,entry){
  const options=desertionCopy().scene?.options||{};
  const keys=!entry?["continue"]:entry.attempted?["duel","let_go"]:["intimidate","convince","duel","let_go"];
  return `<ol class="talk-options">${keys.map(key=>`<li><button type="button" data-desertion="${key}" data-desertion-member="${esc(m.id)}">${esc(desertionFill(options[key],m))}</button></li>`).join("")}</ol>`;
}
function openDesertionScene(entry){
  const m=game.campaign.company.roster.find(x=>x.id===entry.id);
  if(!m) return;
  const scene=desertionCopy().scene||{},seed=`${m.id}|${entry.day}|desertion`;
  $("desertion-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("desertion-name").textContent=m.name;
  $("desertion-origin").textContent=scene.origin||"";
  $("desertion-log").innerHTML=`<p class="talk-note">${esc(desertionFill(variantPhrase(scene.spotted||[],seed),m))}</p>
    <p class="talk-say talk-say--merc"><b>${esc(MercenairesRecruitDialogue.firstName(m))}</b><span>« ${esc(desertionFill(variantPhrase(scene.says||[],seed),m))} »</span></p>`;
  $("desertion-choices").innerHTML=desertionChoicesHtml(m,entry);
  game.desertionScene={id:m.id,mercenary:m};
  $("desertion-dialog").showModal();
}
// Le premier repéré qui attend (après le passage au jour suivant, au chargement, après la scène précédente).
function checkDesertions(){
  const dialog=$("desertion-dialog");
  if(!game.campaign||!dialog||dialog.open||typeof campaignRules!=="function") return;
  const entry=desertionRules()?.pending(game.campaign)[0];
  if(entry) openDesertionScene(entry);
}

function desertionChoice(key,memberId){
  if(key==="continue"){
    game.desertionScene=null;
    $("desertion-dialog").close();
    renderGame();
    return;
  }
  const m=game.desertionScene?.mercenary;
  if(!m||String(m.id)!==String(memberId)) return;
  const rules=desertionRules(),c=game.campaign,scene=desertionCopy().scene||{},log=desertionCopy().log||{};
  const seed=`${m.id}|${c.day}|${key}`;
  const say=lines=>`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(desertionFill(variantPhrase(lines||[],seed),m))} »</span></p>`;
  const note=text=>`<p class="talk-note">${esc(desertionFill(text,m))}</p>`;
  let html="",entry=null;
  if(key==="intimidate"||key==="convince"){
    const result=rules.persuade(c,m.id,key);
    if(!result.ok){ tavernLog(result.reason,"warn"); return; }
    const reply=variantPhrase(scene.reply?.[key]?.[result.accepted?"accepted":"refused"]||[],seed);
    html=say(scene.captain?.[key])+`<p class="talk-say talk-say--merc"><b>${esc(MercenairesRecruitDialogue.firstName(m))}</b><span>« ${esc(desertionFill(reply,m))} »</span></p>`
      +note(scene.outcome?.[result.accepted?"stayed":"refused"]);
    if(result.accepted) tavernLog(desertionFill(log.stayed,m),"info");
    else entry=rules.pendingOf(c,m.id);
  }else if(key==="duel"||key==="let_go"){
    const result=key==="duel"?rules.duel(c,m.id):rules.letGo(c,m.id);
    if(!result.ok){ tavernLog(result.reason,"warn"); return; }
    html=say(scene.captain?.[key])+note(scene.outcome?.[key]);
    tavernLog(desertionFill(log[key],m),"bad");
  }else return;
  $("desertion-log").insertAdjacentHTML("beforeend",html);
  $("desertion-choices").innerHTML=desertionChoicesHtml(m,entry);
  saveGame();
}

function initializeDesertion(){
  // La scène ne se ferme pas avec Échap : il faut décider.
  document.getElementById("desertion-dialog")?.addEventListener("cancel",event=>event.preventDefault());
  document.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-desertion]");
    if(button) desertionChoice(button.dataset.desertion,button.dataset.desertionMember);
  });
}

if(typeof document!=="undefined") initializeDesertion();
