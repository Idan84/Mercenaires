"use strict";

// Lieutenants, interface (Idan, 2026-10-25) : un encart dans Ma Compagnie (les lieutenants, leur aura, les postes
// libres) ; on propose le poste à un mercenaire, qui accepte mais renégocie son salaire, dans une boîte de dialogue
// comme à la Taverne. Le lieutenant reste dans Mes mercenaires, avec un cadre doré (characterRow, ui.js).
// Règles : game-core/lieutenants.js ; textes : data/reference/lieutenant-dialogue.json.
let lieutenantRulesCache=null;
function lieutenantRules(){
  if(!lieutenantRulesCache&&game.referenceData) lieutenantRulesCache=MercenairesLieutenants.createLieutenantRules({
    reference:game.referenceData,tavern:tavernRules(),
    affinityOf:(state,m)=>captainAffinity(m)?.total||0,
    quarters:state=>campaignRules().lieutenantQuarters(state)});
  return lieutenantRulesCache;
}
function lieutenantCopy(){ return game.referenceData?.lieutenantDialogue||{}; }
function lieutenantFill(text,m,vars={}){
  const female=String(m?.sex||"").trim().toLowerCase().startsWith("f");
  return MercenairesRecruitDialogue.fill(text||"",{prenom:MercenairesRecruitDialogue.firstName(m),...vars},female);
}
function isCompanyLieutenant(c){ return Boolean(game.campaign&&c&&(game.campaign.company.lieutenantIds||[]).includes(c.id)); }
function lieutenantAura(m){ return combatEngine().lieutenantAuraBonus({character:m,activeSet:1}); }

// Ma Compagnie : les lieutenants, puis le poste libre (ou ce qui manque pour en avoir un).
function renderLieutenants(){
  const box=$("lieutenants-panel"),c=game.campaign;
  if(!box) return;
  if(!c){ box.innerHTML=""; return; }
  const rules=lieutenantRules(),copy=lieutenantCopy().panel||{};
  const cards=rules.lieutenantsOf(c).map(m=>`<article class="lieutenant-card">
      <button type="button" class="steward-face" data-character-id="${esc(m.id)}" aria-label="Voir la fiche de ${esc(m.name)}">${renderAvatar(m,{variant:"compact",kind:"portrait"})}</button>
      <div class="steward-info"><small>${esc(lieutenantFill("{Lieutenant|Lieutenante}",m))}</small><strong>${esc(m.name)}</strong>
        <span>${esc(lieutenantFill(copy.aura,m,{aura:fmt(lieutenantAura(m))}))} · ${fmt(Number(m.contract?.dailySalary)||0)} PO/j</span></div>
    </article>`).join("");
  const block=rules.blocker(c);
  let open="";
  if(block) open=`<p class="lieutenant-blocker">${esc(block.reason)}</p>`;
  else{
    const picks=rules.candidates(c).map(m=>`<button type="button" class="steward-pick" data-lieutenant-offer="${esc(m.id)}">
      ${renderAvatar(m,{variant:"compact",kind:"portrait"})}<span><b>${esc(m.name)}</b>${m.lieutenantTalk?`<small>${esc(copy.asked||"")}</small>`:""}</span></button>`).join("");
    open=`<div class="steward-card steward-card--none"><div class="steward-info"><small>${esc(copy.free||"")}</small></div></div>`
      +(picks?`<details class="steward-offer"><summary>${esc(copy.offer||"")}</summary><div class="steward-picks">${picks}</div></details>`
        :`<p class="lieutenant-blocker">${esc(copy.nobody||"")}</p>`);
  }
  box.innerHTML=`<h3>${esc(copy.title||"Lieutenants")}</h3>${cards}${open}
    <p class="lieutenant-posts">${esc(MercenairesRecruitDialogue.fill(copy.posts||"",{quartiers:fmt(campaignRules().lieutenantQuarters(c)),n:fmt(rules.countedMembers(c))},false))}</p>`;
}

// La promotion : il accepte le poste, puis on parle salaire.
function openLieutenantTalk(id){
  const c=game.campaign,rules=lieutenantRules();
  const m=c?.company.roster.find(x=>String(x.id)===String(id));
  if(!m) return;
  const resumed=Boolean(m.lieutenantTalk);
  const started=rules.startPromotion(c,m.id);
  if(!started.ok){ tavernLog(started.reason,"bad"); return; }
  const copy=lieutenantCopy().promote||{},n=started.talk,seed=`${m.id}|${c.day}|lieutenant`;
  game.lieutenantTalk={id:m.id,mode:"choices",lines:[
    {who:"you",text:lieutenantFill(copy.proposal,m)},
    {who:"merc",text:lieutenantFill(variantPhrase(resumed?copy.resume:copy.demand,seed),m,{salaire:fmt(n.salary)})},
    {who:"note",text:lieutenantFill(copy.bonus_note,m,{prime:fmt(n.bonus)})}]};
  saveGame();
  renderLieutenantTalk();
  $("lieutenant-talk-dialog").showModal();
}
function lieutenantTalkMember(){ return game.campaign?.company.roster.find(x=>x.id===game.lieutenantTalk?.id)||null; }
function renderLieutenantTalk(){
  const t=game.lieutenantTalk,m=lieutenantTalkMember();
  if(!t||!m) return;
  const copy=lieutenantCopy().promote||{},first=MercenairesRecruitDialogue.firstName(m);
  $("lieutenant-talk-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("lieutenant-talk-name").textContent=m.name;
  const log=$("lieutenant-talk-log");
  log.innerHTML=t.lines.map(line=>line.who==="note"
    ?`<p class="talk-note">${esc(line.text)}</p>`
    :`<p class="talk-say talk-say--${line.who}"><b>${line.who==="you"?"Vous":esc(first)}</b><span>« ${esc(line.text)} »</span></p>`).join("");
  log.scrollTop=log.scrollHeight;
  const n=m.lieutenantTalk;
  if(t.mode==="negotiate"&&n){
    $("lieutenant-talk-choices").innerHTML=`<form id="lieutenant-offer" class="talk-offer">
      <label>${esc(copy.salary_label||"")}<span><input id="lieutenant-offer-salary" type="number" min="${n.current}" value="${n.salary}"> PO</span></label>
      <button type="submit" class="talk-offer-btn">${esc(copy.submit||"")}</button>
      <button type="button" class="talk-offer-back" data-lieutenant-talk="back">${esc(copy.back||"")}</button>
    </form>`;
    return;
  }
  const choices=t.mode==="ended"||!n?[{key:"leave",label:copy.leave}]
    :[{key:"accept",label:lieutenantFill(copy.accept_terms,m,{salaire:fmt(n.salary)})},{key:"negotiate",label:copy.negotiate},{key:"leave",label:copy.leave}];
  $("lieutenant-talk-choices").innerHTML=`<ol class="talk-options">${choices.map(o=>
    `<li><button type="button" data-lieutenant-talk="${o.key}">${esc(o.label)}</button></li>`).join("")}</ol>`;
}
function lieutenantOffer(salary){
  const t=game.lieutenantTalk,m=lieutenantTalkMember();
  if(!t||!m) return;
  const copy=lieutenantCopy().promote||{},seed=`${m.id}|${game.campaign.day}|${t.lines.length}`;
  t.lines.push({who:"you",text:lieutenantFill(copy.offer,m,{salaire:fmt(salary)})});
  const result=lieutenantRules().offer(game.campaign,m.id,salary);
  t.mode="choices";
  if(result.outcome==="invalid"){
    const floor=result.reason==="below"?copy.floor_below:result.reason==="refused"?copy.floor_refused:null;
    t.lines.push(floor?{who:"merc",text:lieutenantFill(floor,m,{salaire:fmt(result.floor)})}:{who:"note",text:result.reason||""});
  }else if(result.outcome==="counter"){
    t.lines.push({who:"merc",text:lieutenantFill(variantPhrase(copy.counter,seed),m,{salaire:fmt(result.counter)})});
  }else if(result.outcome==="accepted"){
    t.lines.push({who:"merc",text:lieutenantFill(variantPhrase(copy.accepted,seed),m)},
      {who:"note",text:lieutenantFill(copy.outcome_accepted,m,{salaire:fmt(result.salary),affinite:fmt(result.affinityDelta)})});
    t.mode="ended";
    tavernLog(lieutenantFill(copy.outcome_accepted,m,{salaire:fmt(result.salary),affinite:fmt(result.affinityDelta)}),"gear");
  }else if(result.outcome==="refused"){
    t.lines.push({who:"merc",text:lieutenantFill(variantPhrase(copy.refused,seed),m)},
      {who:"note",text:lieutenantFill(copy.outcome_refused,m,{affinite:"−"+fmt(Math.abs(result.affinityDelta))})});
    t.mode="ended";
    tavernLog(lieutenantFill(copy.outcome_refused,m,{affinite:"−"+fmt(Math.abs(result.affinityDelta))}),"bad");
  }
  saveGame();
  renderGame();
  renderLieutenantTalk();
}
function lieutenantTalkChoice(key){
  const t=game.lieutenantTalk,m=lieutenantTalkMember();
  if(!t) return;
  if(key==="leave"){ $("lieutenant-talk-dialog").close(); game.lieutenantTalk=null; return; }
  if(key==="back"){ t.mode="choices"; renderLieutenantTalk(); return; }
  if(key==="negotiate"){ t.mode="negotiate"; renderLieutenantTalk(); $("lieutenant-offer-salary")?.focus(); return; }
  if(key==="accept"&&m?.lieutenantTalk) lieutenantOffer(m.lieutenantTalk.salary);
}

function initializeLieutenantUi(){
  document.addEventListener("click",event=>{
    const offer=event.target.closest?.("[data-lieutenant-offer]");
    if(offer){ openLieutenantTalk(offer.dataset.lieutenantOffer); return; }
    const choice=event.target.closest?.("[data-lieutenant-talk]");
    if(choice) lieutenantTalkChoice(choice.dataset.lieutenantTalk);
  });
  document.addEventListener("submit",event=>{
    if(event.target?.id!=="lieutenant-offer") return;
    event.preventDefault();
    lieutenantOffer(Number($("lieutenant-offer-salary").value));
  });
}

if(typeof document!=="undefined") initializeLieutenantUi();
