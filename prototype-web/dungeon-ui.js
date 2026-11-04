"use strict";

// Le Cachot (Idan, 2026-11-04), interface. Sur la carte du Cachot (Ma Compagnie) : « Envoyer au cachot » ouvre la liste des
// membres qu'on peut y jeter ; puis « Au cachot (2 / 3) » : chacun, depuis combien de jours, et « Libérer ». Après une
// relance ratée (persuasion-ui.js), un choix de plus : « Au cachot ! ».
// Règles : game-core/dungeon.js ; textes : data/reference/dungeon-dialogue.json.
function dungeonRules(){ return campaignRules().dungeonRules||null; }
function dungeonCopy(){ return game.referenceData?.dungeonDialogue||{}; }
const dungeonFemale=m=>String(m?.sex||"").trim().toLowerCase().startsWith("f");
const dungeonFill=(text,m,vars={})=>MercenairesRecruitDialogue.fill(String(text||""),{prenom:MercenairesRecruitDialogue.firstName(m),nom:m?.name||"",...vars},dungeonFemale(m));

// La carte du Cachot : le bouton, puis les prisonniers.
function dungeonHtml(c){
  const rules=c&&typeof campaignRules==="function"?dungeonRules():null;
  if(!rules||!(rules.cells(c)>0)) return "";
  const copy=dungeonCopy().panel||{},company=c.company;
  const picks=company.roster.filter(m=>rules.canJail(c,m).ok).map(m=>`<button type="button" class="steward-pick" data-dungeon-jail="${esc(m.id)}">
      ${renderAvatar(m,{variant:"compact",kind:"portrait"})}<b>${esc(m.name)}</b><small></small></button>`).join("");
  const offer=picks?`<details class="steward-offer dungeon-offer"><summary class="talk-offer-btn" title="${esc(copy.send_tip||"")}">${esc(copy.send||"")}</summary><div class="steward-picks">${picks}</div></details>`:"";
  const prisoners=rules.prisoners(c);
  const rows=prisoners.map(m=>{
    const days=rules.daysIn(c,m);
    const since=days?dungeonFill(copy.since,m,{jours:`${fmt(days)} jour${days>1?"s":""}`}):copy.today||"";
    return `<div class="study-row">
        <div class="building-info"><strong>${esc(m.name)}</strong><span>${esc(since)}</span></div>
        <div class="study-actions"><button type="button" class="secondary" data-dungeon-release="${esc(m.id)}">${esc(copy.release||"")}</button></div>
      </div>`;
  }).join("");
  return offer+(rows?`<div class="study-list"><h4>${esc(copy.title||"")} (${fmt(prisoners.length)} / ${fmt(rules.cells(c))})</h4>${rows}</div>`:"");
}

function jailMember(memberId,{fromDialog=false}={}){
  const m=game.campaign?.company.roster.find(x=>String(x.id)===String(memberId));
  if(!m) return;
  const result=dungeonRules().jail(game.campaign,m.id);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  tavernLog(dungeonFill(dungeonCopy().log?.jailed,m),"bad");
  if(fromDialog){
    // Dans la boîte de dialogue : la phrase du capitaine, l'issue, puis « Partir ».
    const choice=dungeonCopy().choice||{};
    const line=variantPhrase(choice.captain||[],`${m.id}|${game.campaign.day}|dungeon`);
    $("deal-talk-log").insertAdjacentHTML("beforeend",`<p class="talk-say talk-say--you"><b>Vous</b><span>« ${esc(dungeonFill(line,m))} »</span></p>
      <p class="talk-note">${esc(dungeonFill(choice.outcome,m))}</p>`);
    $("deal-talk-choices").innerHTML=`<ol class="talk-options"><li><button type="button" data-deal-leave>Partir</button></li></ol>`;
  }
  saveGame();
  renderGame();
}
function releaseMember(memberId){
  const m=game.campaign?.company.roster.find(x=>String(x.id)===String(memberId));
  const result=dungeonRules().release(game.campaign,m?.id);
  if(!result.ok){ tavernLog(result.reason,"warn"); return; }
  tavernLog(dungeonFill(dungeonCopy().log?.released,m),"info");
  saveGame();
  renderGame();
}
// Après une relance ratée : « Au cachot ! », si on peut l'y jeter (persuasion-ui.js).
function dungeonChoiceHtml(m){
  const rules=game.campaign&&typeof campaignRules==="function"?dungeonRules():null;
  if(!rules||!rules.canJail(game.campaign,m).ok) return "";
  return `<li><button type="button" data-dungeon-jail="${esc(m.id)}" data-dungeon-dialog>${esc(dungeonCopy().choice?.label||"")}</button></li>`;
}

function initializeDungeon(){
  document.addEventListener("click",event=>{
    const jail=event.target.closest?.("[data-dungeon-jail]");
    if(jail){ jailMember(jail.dataset.dungeonJail,{fromDialog:jail.hasAttribute("data-dungeon-dialog")}); return; }
    const release=event.target.closest?.("[data-dungeon-release]");
    if(release) releaseMember(release.dataset.dungeonRelease);
  });
}

if(typeof document!=="undefined") initializeDungeon();
