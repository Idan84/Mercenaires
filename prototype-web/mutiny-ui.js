"use strict";

// La mutinerie (Idan, 2026-11-10), interface. Le journal et la notification du matin ; la scène, au début de la journée
// (et au chargement d'une partie) : ceux qui viennent réclamer leur solde attendent le capitaine, et on ne peut rien faire
// d'autre avant de l'avoir réglée. Rembourser l'un d'eux (toute sa dette, s'il y a l'or) le fait sortir du groupe ;
// « Promettre » (Charisme) ou « Faire peur » (Intimidation) : un test pour tout le groupe ; réussi, le camp est tranquille
// pour la journée ; raté, le combat (mission.js, startMutinyFight).
// Règles : game-core/mutiny.js ; textes : data/reference/mutiny-dialogue.json.
function mutinyRules(){ return typeof campaignRules==="function"?campaignRules().mutinyRules||null:null; }
function mutinyCopy(){ return game.referenceData?.mutinyDialogue||{}; }
const mutinyFemale=m=>String(m?.sex||"").trim().toLowerCase().startsWith("f");
const mutinyFill=(text,m,vars={})=>MercenairesRecruitDialogue.fill(String(text||""),
  {prenom:m?MercenairesRecruitDialogue.firstName(m):"",nom:m?.name||"",...vars},mutinyFemale(m));
// Un texte pour un seul mutin ou pour plusieurs (byCount.one / byCount.many) ; une liste : l'une de ses variantes.
const mutinyCount=(byCount,members,vars={},seed="")=>{
  const one=members.length===1,text=byCount?.[one?"one":"many"];
  return mutinyFill(Array.isArray(text)?variantPhrase(text,seed+"|"+members.length):text,one?members[0]:null,{nombre:fmt(members.length),...vars});
};
const mutinyMembers=report=>(report?.today?.members||[]).map(id=>game.campaign?.company.roster.find(m=>m.id===id)).filter(Boolean);

// Le journal du matin.
function logMutiny(report){
  const today=report?.today,log=mutinyCopy().log||{};
  if(!today) return;
  if(today.status==="scene") tavernLog(mutinyCount(log.mutiny,mutinyMembers(report)),"bad");
  else if(today.broke) tavernLog(log.grumble,"warn");
}
// La notification du jour (day-news-ui.js) : une ligne urgente.
function mutinyNews(report){
  const today=report?.today,news=mutinyCopy().day_news||{};
  if(today?.status!=="scene") return [];
  const members=mutinyMembers(report);
  return [{tone:"alert",icon:"swords",text:news.text,detail:mutinyCount(news.detail,members),faces:members}];
}

// Le porte-parole : celui à qui l'on doit le plus.
function mutinySpokesman(c){
  const rules=mutinyRules(),debts=campaignRules().debtRules;
  return [...(rules?.present(c)||[])].sort((a,b)=>debts.owedTo(c,b.id)-debts.owedTo(c,a.id))[0]||null;
}
// Ce qu'on leur doit, chacun avec « Rembourser » (grisé s'il manque de l'or).
function mutinyOwedHtml(c,members){
  const copy=mutinyCopy().scene||{},debts=campaignRules().debtRules,gold=Math.max(0,Number(c.company.gold)||0);
  return `<ul class="mutiny-owed">${members.map(m=>{
    const amount=debts.owedTo(c,m.id),short=gold<amount;
    return `<li><span class="mutiny-face" title="${esc(m.name)}">${renderAvatar(m,{variant:"compact",kind:"portrait"})}</span>
      <span>${esc(mutinyFill(copy.owed,m,{montant:fmt(amount)}))}</span>
      <button type="button" class="secondary debt-repay" data-mutiny="repay" data-mutiny-member="${esc(m.id)}"${short?` disabled title="${esc(copy.short||"")}"`:""}>${esc(mutinyFill(copy.options?.repay,m,{montant:fmt(amount)}))}</button></li>`;
  }).join("")}</ul>`;
}
function mutinyChoicesHtml(keys){
  const options=mutinyCopy().scene?.options||{};
  return `<ol class="talk-options">${keys.map(key=>`<li><button type="button" data-mutiny="${key}">${esc(options[key]||"")}</button></li>`).join("")}</ol>`;
}
function renderMutinyChoices(){
  const c=game.campaign,members=mutinyRules()?.present(c)||[];
  $("mutiny-choices").innerHTML=(members.length?mutinyOwedHtml(c,members):"")+mutinyChoicesHtml(members.length?["promise","fear"]:["continue"]);
}
function openMutinyScene(){
  const c=game.campaign,rules=mutinyRules(),today=rules?.pending(c);
  if(!today) return;
  const members=rules.present(c),voice=mutinySpokesman(c),scene=mutinyCopy().scene||{},seed=`${c.day}|mutiny`;
  $("mutiny-portrait").innerHTML=voice?renderAvatar(voice,{variant:"talk",kind:"portrait"}):"";
  $("mutiny-origin").textContent=scene.origin||"";
  $("mutiny-name").textContent=scene.title||"";
  $("mutiny-log").innerHTML=`<p class="talk-note">${esc(mutinyCount(scene.arrival,members,{},seed))}</p>`
    +(voice?`<p class="talk-say talk-say--merc"><b>${esc(MercenairesRecruitDialogue.firstName(voice))}</b><span>« ${esc(mutinyFill(variantPhrase(scene.says||[],seed),voice))} »</span></p>`:"");
  game.mutinyScene={day:c.day};
  renderMutinyChoices();
  $("mutiny-dialog").showModal();
}
// La scène qui attend (après le passage au jour suivant, au chargement) ; le combat qui attend (la scène ratée, puis la
// page rechargée) : « Se battre ».
function checkMutiny(){
  const dialog=$("mutiny-dialog");
  if(!game.campaign||!dialog||dialog.open||!mutinyRules()||game.mission) return;
  if(mutinyRules().pending(game.campaign)){ openMutinyScene(); return; }
  const fight=mutinyRules().fighting(game.campaign);
  if(!fight) return;
  const scene=mutinyCopy().scene||{},members=(fight.result?.members||[]).map(id=>game.campaign.company.roster.find(m=>m.id===id)).filter(Boolean);
  $("mutiny-portrait").innerHTML=members[0]?renderAvatar(members[0],{variant:"talk",kind:"portrait"}):"";
  $("mutiny-origin").textContent=scene.origin||"";
  $("mutiny-name").textContent=scene.title||"";
  $("mutiny-log").innerHTML=`<p class="talk-note">${esc(scene.outcome?.fight||"")}</p>`;
  $("mutiny-choices").innerHTML=mutinyChoicesHtml(["fight"]);
  dialog.showModal();
}

function mutinyChoice(key,memberId){
  const c=game.campaign,rules=mutinyRules(),scene=mutinyCopy().scene||{},log=mutinyCopy().log||{};
  if(!c||!rules) return;
  const note=text=>`<p class="talk-note">${esc(text)}</p>`;
  if(key==="continue"){
    game.mutinyScene=null;
    $("mutiny-dialog").close();
    renderGame();
    return;
  }
  if(key==="fight"){
    game.mutinyScene=null;
    $("mutiny-dialog").close();
    if(typeof startMutinyFight==="function") startMutinyFight();
    return;
  }
  if(key==="repay"){
    const m=c.company.roster.find(x=>String(x.id)===String(memberId));
    const result=campaignRules().debtRules.repay(c,memberId);
    if(!m||!result.ok) return;
    rules.settled(c,m.id);
    $("mutiny-log").insertAdjacentHTML("beforeend",note(mutinyFill(scene.repaid,m)));
    tavernLog(mutinyFill(log.repaid,m,{montant:fmt(result.amount)}),"gear");
    if(!rules.pending(c)){ $("mutiny-log").insertAdjacentHTML("beforeend",note(scene.outcome?.calm)); tavernLog(log.calm,"info"); }
    renderMutinyChoices();
    saveGame();
    return;
  }
  if(key!=="promise"&&key!=="fear") return;
  const voice=mutinySpokesman(c);
  const result=rules.confront(c,key);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  const seed=`${c.day}|${key}`;
  const reply=variantPhrase(scene.reply?.[key]?.[result.success?"success":"failure"]||[],seed);
  $("mutiny-log").insertAdjacentHTML("beforeend",`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(variantPhrase(scene.captain?.[key]||[],seed))} »</span></p>`
    +(voice?`<p class="talk-say talk-say--merc"><b>${esc(MercenairesRecruitDialogue.firstName(voice))}</b><span>« ${esc(mutinyFill(reply,voice))} »</span></p>`:"")
    +note(scene.outcome?.[result.success?"calm":"fight"]));
  tavernLog(result.success?log.calm:log.fight,result.success?"info":"bad");
  $("mutiny-choices").innerHTML=mutinyChoicesHtml([result.success?"continue":"fight"]);
  saveGame();
}

function initializeMutiny(){
  // La scène ne se ferme pas avec Échap : il faut décider.
  document.getElementById("mutiny-dialog")?.addEventListener("cancel",event=>event.preventDefault());
  document.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-mutiny]");
    if(button&&!button.disabled) mutinyChoice(button.dataset.mutiny,button.dataset.mutinyMember);
  });
}

if(typeof document!=="undefined") initializeMutiny();
