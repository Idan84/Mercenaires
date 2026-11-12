"use strict";

// Intendant, interface (Idan, 2026-10-24) : à l'Intendance, sans intendant, on propose le poste à un mercenaire (une
// fois par jour chacun) ; avec un intendant, on lui parle : évaluer un candidat de la Taverne, ou lui proposer de
// revenir sur le terrain. Ses réponses passent par la boîte de dialogue des échanges (portrait, réplique, issue,
// Partir). Règles : game-core/steward.js ; textes : data/reference/steward-dialogue.json.
// Cruxor Limortel, l'ancien intendant (Idan, 2026-11-12 ; game-core/old-steward.js, data/reference/old-steward.json) :
// là par défaut ; sa carte, « Lui parler » (il glisse en fin de phrase qu'il aimerait partir), et « Nommer un intendant »
// pour le remplacer ; il fait ses adieux dès qu'un mercenaire accepte.
let stewardRulesCache=null;
function stewardRules(){
  // Le dortoir de la campagne : l'intendant ne revient sur le terrain que s'il y a de la place pour lui.
  if(!stewardRulesCache&&game.referenceData) stewardRulesCache=MercenairesSteward.createStewardRules({reference:game.referenceData,
    dormitory:{free:state=>campaignRules().dormitoryFree(state),places:m=>campaignRules().dormitoryPlaces(m)}});
  return stewardRulesCache;
}
function stewardCopy(){ return game.referenceData?.stewardDialogue||{}; }
function currentSteward(){ return game.campaign?stewardRules().personOf(game.campaign):null; }
const isOldSteward=m=>Boolean(m?.npc);
function oldStewardCopy(){ return game.referenceData?.oldSteward||{}; }
// Son portrait : l'image d'Idan quand elle sera là, ses initiales en attendant.
function oldStewardPortrait(m,variant){
  const initials=String(m.name||"").split(/\s+/).map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
  return m.portrait
    ?`<img class="old-steward-portrait old-steward-portrait--${variant}" src="${esc(m.portrait)}" alt="${esc(m.name)}">`
    :`<span class="old-steward-portrait old-steward-portrait--${variant}" role="img" aria-label="${esc(m.name)}">${esc(initials)}</span>`;
}
const stewardPortrait=(m,variant)=>isOldSteward(m)?oldStewardPortrait(m,variant):renderAvatar(m,{variant,kind:"portrait"});
// Ses adieux, quand un mercenaire accepte le poste.
function oldStewardFarewell(newSteward){
  const old=oldStewardCopy(),line=variantPhrase(old.talk?.farewell||[],`${game.campaign.day}|farewell`);
  if(typeof tavernLog==="function") tavernLog(`${old.nom||"Cruxor Limortel"} part à la retraite.`,"info");
  return `<p class="talk-say talk-say--merc"><b>${esc(old.nom||"Cruxor Limortel")}</b><span>« ${esc(stewardFill(line,newSteward,{intendant:MercenairesRecruitDialogue.firstName(newSteward)}))} »</span></p>`;
}
function stewardFill(text,m,vars={}){
  const female=String(m?.sex||"").trim().toLowerCase().startsWith("f");
  return MercenairesRecruitDialogue.fill(text,{prenom:MercenairesRecruitDialogue.firstName(m),...vars},female);
}
function stewardDays(n){ return `${fmt(n)} jour${n>1?"s":""}`; }

// En haut de l'Intendance, compact (Idan, 2026-10-31 : l'essentiel au premier coup d'œil, le reste au survol) : son
// portrait, son nom, « Lui parler » et « Retaguer la compagnie » (doc 20) ; sa compétence et son ancienneté au survol. Sans intendant : « Nommer un
// intendant » ouvre la liste des mercenaires ; un mercenaire déjà sollicité aujourd'hui est grisé.
function renderStewardPanel(){
  const panel=$("steward-panel");
  if(!panel||!game.campaign) return;
  const copy=stewardCopy().panel||{},steward=currentSteward();
  const retag=typeof stewardTagRules==="function"&&stewardTagRules()?`<button type="button" class="talk-offer-btn" data-steward-retag title="Il revoit les tags de tous les mercenaires (il ne touche pas aux vôtres).">Retaguer la compagnie</button>`:"";
  const company=game.campaign.company;
  // Les mercenaires à qui proposer le poste : sans intendant, ou pour remplacer Cruxor.
  const picks=()=>company.roster.filter(m=>m.id!==company.captainId&&!(company.lieutenantIds||[]).includes(m.id)&&m.id!==company.medicId&&!MercenairesCampPosts.postOf(game.campaign,m)).map(m=>{
    // Recruté aujourd'hui : un poste attend le lendemain matin (Idan, 2026-11-02).
    const asked=m.stewardOfferDay===game.campaign.day,arriving=Number(m.contract?.joinDay)>game.campaign.day;
    return `<button type="button" class="steward-pick" data-steward-offer="${esc(m.id)}"${asked||arriving?` disabled title="${esc(arriving?"Il rejoint la compagnie demain matin.":copy.asked_today||"")}"`:""}>
      ${renderAvatar(m,{variant:"compact",kind:"portrait"})}<b>${esc(m.name)}</b></button>`;
  }).join("");
  const appoint=list=>list?`<details class="steward-offer"><summary class="talk-offer-btn" title="${esc(copy.appoint_tip||"")}">${esc(copy.appoint||"")}</summary><div class="steward-picks">${list}</div></details>`:"";
  if(steward&&isOldSteward(steward)){
    const old=oldStewardCopy();
    const detail=String(old.panel?.detail||"").replace("{intendance}",fmt(Number(steward.skills?.camp?.Intendance)||0));
    panel.innerHTML=`<div class="steward-card" title="${esc(detail)}">
      <span class="steward-face">${oldStewardPortrait(steward,"compact")}</span>
      <div class="steward-info"><small>${esc(stewardFill(copy.steward_title,steward))}</small><strong>${esc(steward.name)}</strong></div>
      <button type="button" class="talk-offer-btn" data-steward-talk>${esc(copy.talk||"")}</button>
      ${retag}
    </div>${appoint(picks())}`;
    return;
  }
  if(steward){
    const skill=Math.round(Number(steward.skills?.camp?.Intendance)||0),days=stewardRules().daysAsSteward(game.campaign);
    const detail=`Intendance ${fmt(skill)} · ${stewardFill(days?copy.since:copy.since_today,steward,{jours:stewardDays(days)})}`;
    panel.innerHTML=`<div class="steward-card" title="${esc(detail)}">
      <button type="button" class="steward-face" data-character-id="${esc(steward.id)}" aria-label="Voir la fiche de ${esc(steward.name)}">${renderAvatar(steward,{variant:"compact",kind:"portrait"})}</button>
      <div class="steward-info"><small>${esc(stewardFill(copy.steward_title,steward))}</small><strong>${esc(steward.name)}</strong></div>
      <button type="button" class="talk-offer-btn" data-steward-talk>${esc(copy.talk||"")}</button>
      ${retag}
    </div>`;
    return;
  }
  panel.innerHTML=appoint(picks());
}

// Réponse à une proposition (poste ou retour sur le terrain), dans la boîte de dialogue des échanges.
function openStewardAnswer(m,kind,result){
  const copy=stewardCopy()[kind]||{};
  const lines=copy[result.accepted?"accepted":result.mood]||copy.neutral||[];
  const reply=variantPhrase(lines,`${m.id}|${game.campaign.day}|${kind}`);
  const first=MercenairesRecruitDialogue.firstName(m);
  $("deal-talk-portrait").innerHTML=renderAvatar(m,{variant:"talk",kind:"portrait"});
  $("deal-talk-name").textContent=m.name;
  $("deal-talk-origin").textContent="Intendance";
  $("deal-talk-log").innerHTML=`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(copy.proposal||"")} »</span></p>
    <p class="talk-say talk-say--merc"><b>${esc(first)}</b><span>« ${esc(stewardFill(reply,m))} »</span></p>
    <p class="talk-note">${esc(stewardFill(result.accepted?copy.outcome_accepted:copy.outcome_refused,m))}</p>
    ${result.oldRetired?oldStewardFarewell(m):""}`;
  // Après un refus, la relance (Idan, 2026-11-04 ; persuasion-ui.js).
  if(typeof persuasionAfter==="function") persuasionAfter(result,"steward",{member:m.id});
  else $("deal-talk-choices").innerHTML=`<ol class="talk-options"><li><button type="button" data-deal-leave>Partir</button></li></ol>`;
  $("deal-talk-dialog").showModal();
}
function retryStewardPost(memberId,approach){
  const m=game.campaign?.company.roster.find(x=>String(x.id)===String(memberId));
  if(!m) return;
  const result=stewardRules().retry(game.campaign,m.id,approach);
  if(!result.ok){ if(typeof tavernLog==="function") tavernLog(result.reason,"warn"); return; }
  persuasionAppend(m,result,stewardFill(stewardCopy()[result.kind]?.outcome_accepted||"",m),`${m.id}|${game.campaign.day}|steward|${approach}`);
  if(result.oldRetired) $("deal-talk-log")?.insertAdjacentHTML("beforeend",oldStewardFarewell(m));
  saveGame();
  renderGame();
}

function offerStewardship(id){
  const m=game.campaign?.company.roster.find(x=>String(x.id)===String(id));
  if(!m) return;
  const result=stewardRules().offer(game.campaign,m.id);
  if(!result.ok) return;
  saveGame();
  renderGame();
  openStewardAnswer(m,"offer",result);
}

// Parler à l'intendant : comme au tavernier (qui ? quoi ? quelle caractéristique ?), mais gratuit et chiffré.
function stewardTalkOptions(t){
  const old=isOldSteward(currentSteward());
  const talk=(old?oldStewardCopy().talk:stewardCopy().talk)||{},o=talk.options||{};
  const back={key:"back",label:o.back};
  if(t.view==="who") return [...(game.campaign?.tavern.candidates||[]).map(c=>({key:"who",arg:c.mercenary.id,label:MercenairesRecruitDialogue.firstName(c.mercenary)})),back];
  if(t.view==="what") return [...(recruitDialogue().keeper.groups||[]).map(g=>({key:"group",arg:g.groupe,label:g.label})),back];
  if(t.view==="stats") return [...adviceStats(t.group).map(name=>({key:"stat",arg:name,label:name})),back];
  // Cruxor n'a pas de terrain à retrouver : « Vous comptez rester encore longtemps ? ».
  return (old?["evaluate","stay","leave"]:["evaluate","recall","leave"]).map(key=>({key,label:o[key]}));
}
function renderStewardTalk(){
  const t=game.stewardTalk,steward=currentSteward();
  if(!t||!steward) return;
  $("steward-talk-portrait").innerHTML=stewardPortrait(steward,"talk");
  $("steward-talk-name").textContent=steward.name;
  $("steward-talk-line").textContent=`« ${stewardFill(t.line,steward)} »`;
  $("steward-talk-options").innerHTML=stewardTalkOptions(t).map(o=>
    `<li><button type="button" data-steward-choice="${o.key}"${o.arg!=null?` data-arg="${esc(String(o.arg))}"`:""}>${esc(o.label)}</button></li>`).join("");
}
function openStewardTalk(){
  const steward=currentSteward();
  if(!steward) return;
  // Cruxor : son bonjour, et en fin de phrase, sa retraite (« il veut partir, mais il n'ose pas de lui-même »).
  const old=isOldSteward(steward)?oldStewardCopy().talk||{}:null;
  const line=old
    ?`${variantPhrase(old.greetings||[],`${steward.id}|${game.campaign.day}`)} ${variantPhrase(old.endings||[],`${steward.id}|${game.campaign.day}|fin`)}`
    :variantPhrase(stewardCopy().talk?.greetings||[],`${steward.id}|${game.campaign.day}`);
  game.stewardTalk={view:"main",candidateId:null,group:null,line,greeting:line};
  renderStewardTalk();
  $("steward-talk-dialog").showModal();
}
function stewardTalk(choice,arg){
  const t=game.stewardTalk,talk=stewardCopy().talk||{},steward=currentSteward();
  if(!t||!steward) return;
  if(choice==="leave"){ $("steward-talk-dialog").close(); return; }
  if(choice==="stay"){ t.line=variantPhrase(oldStewardCopy().talk?.stay||[],`${game.campaign.day}|${t.stayed=(t.stayed||0)+1}`); renderStewardTalk(); return; }
  if(choice==="recall"){
    const result=stewardRules().recall(game.campaign);
    if(!result.ok){ t.line=result.dormFull?talk.dorm_full:talk.already||result.reason; renderStewardTalk(); return; }
    saveGame();
    $("steward-talk-dialog").close();
    renderGame();
    openStewardAnswer(steward,"recall",result);
    return;
  }
  if(choice==="evaluate"){ t.view="who"; t.line=game.campaign.tavern.candidates.length?talk.ask_who:talk.nobody; }
  if(choice==="who"){ t.candidateId=Number(arg); t.view="what"; t.line=talk.ask_what; }
  if(choice==="group"){ t.group=arg; t.view="stats"; t.line=talk.ask_what; }
  if(choice==="stat") t.line=stewardEstimate(arg)||t.line;
  if(choice==="back"){ t.view={stats:"what",what:"who",who:"main"}[t.view]||"main"; t.line=t.view==="main"?t.line:t.view==="who"?talk.ask_who:talk.ask_what; }
  renderStewardTalk();
}
function stewardEstimate(statName){
  const talk=stewardCopy().talk||{},t=game.stewardTalk;
  const candidate=tavernCandidate(t.candidateId);
  if(!candidate) return talk.nobody;
  const m=candidate.mercenary;
  const result=stewardRules().estimate(game.campaign,candidate,statName,sheetStatValue(m,statName));
  if(!result.ok) return result.reason;
  saveGame();
  const vars={candidat:MercenairesRecruitDialogue.firstName(m),carac:statName,valeur:fmt(result.estimate)};
  const template=result.repeated?talk.repeated:variantPhrase(talk.answers||[],`${m.id}|${statName}`);
  return MercenairesRecruitDialogue.fill(template,vars,false);
}

function initializeSteward(){
  if(typeof registerPersuasion==="function") registerPersuasion("steward",(approach,data)=>retryStewardPost(data.persuadeMember,approach));
  document.addEventListener("click",event=>{
    const offer=event.target.closest?.("[data-steward-offer]");
    if(offer){ offerStewardship(offer.dataset.stewardOffer); return; }
    if(event.target.closest?.("[data-steward-talk]")){ openStewardTalk(); return; }
    // Retaguer toute la compagnie (doc 20 §5 : « Il faudra une option retaguer tous les mercenaires »).
    const retag=event.target.closest?.("[data-steward-retag]");
    if(retag){
      const count=stewardRetag();
      retag.textContent=count?`${fmt(count)} mercenaire${count>1?"s":""} tagué${count>1?"s":""}`:"Retaguer la compagnie";
      return;
    }
    const choice=event.target.closest?.("[data-steward-choice]");
    if(choice) stewardTalk(choice.dataset.stewardChoice,choice.dataset.arg);
  });
}

if(typeof document!=="undefined") initializeSteward();
