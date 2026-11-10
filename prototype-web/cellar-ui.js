"use strict";

// La Cave (Idan, 2026-11-10 ; règles : game-core/cellar.js ; la bagarre : mission.js) : l'écran « La Cave » de la Taverne.
// Construire la salle (comme la Cantine) ; puis, à la première visite du jour, les deux mercenaires qui ont un désaccord,
// leurs cotes (le tavernier simule la bagarre en coulisses), la mise et « Parier sur … » ou « Regarder sans parier » ; une
// fois la bagarre finie, le résultat du soir et le pari.
const CELLAR_REASONS={gold:"Pas assez d’or pour cette mise.",stake:"Mise invalide.",fighter:"Choisissez sur qui parier.",
  odds:"Le tavernier refait ses comptes.",bet:"Votre mise est déjà sur la table."};

function cellarFighterHtml(m,odds,chance){
  const copy=cellarCopy(),e=typeof combatEngine==="function"?combatEngine():null;
  const weapon=e?.activeWeaponItem?.({character:m,activeSet:1})?.name||"";
  const tired=m.recovery?.kind==="fatigued"?`<small class="cellar-tired">${esc(missionFatigueTag({character:m}))}</small>`:"";
  return `<div class="cellar-fighter">
    ${renderAvatar(m,{variant:"card",kind:"portrait"})}
    <b>${esc(m.name)}</b>
    <small>${esc(m.people||"")} · ${esc(m.alignment||"")}</small>
    ${weapon?`<small>${esc(weapon)}</small>`:""}
    ${tired}
    ${odds?`<span class="cellar-odds">${esc(duelFill(copy.odds,{cote:cellarOddsText(odds)}))}</span>
      <small>${esc(duelFill(copy.chance,{n:Math.round(chance*100)}))}</small>`:`<small>${esc(copy.computing||"")}</small>`}
  </div>`;
}

function renderCellar(){
  const box=$("tavern-cellar"),c=game.campaign,rules=cellarRulesOf();
  if(!box) return;
  if(!c||!rules){ box.innerHTML=""; return; }
  const camp=campaignRules(),row=camp.campBuildingRow(rules.ROOM),level=camp.buildingLevel(c,rules.ROOM),copy=cellarCopy();
  if(!level){
    const action=typeof campBuildingAction==="function"?campBuildingAction(c,rules.ROOM,level):"";
    box.innerHTML=`<p class="tavern-canteen-intro">${esc(row?.description||"")}</p>
      <p class="building-info"><span>À construire</span></p><div class="building-actions">${action}</div>`;
    return;
  }
  // La première visite du jour tire les deux combattants (gardés jusqu'au lendemain).
  const drawn=!rules.tonight(c);
  const t=rules.draw(c);
  if(drawn&&typeof saveGame==="function") saveGame();
  if(t.none){ box.innerHTML=`<p class="cellar-quarrel">${esc(copy.none||"")}</p>`; return; }
  const [a,b]=rules.fighters(c);
  const names={a:a?.name||"",b:b?.name||""};
  const quarrel=`<p class="cellar-quarrel">${esc(duelFill(copy.quarrel,{...names,raison:cellarQuarrel(t)}))}</p>`;
  if(t.done){
    const r=t.result||{},winner=[a,b].find(m=>m?.id===r.winnerId),loser=[a,b].find(m=>m?.id===r.loserId);
    const who={gagnant:winner?.name||"",perdant:loser?.name||""};
    const bet=t.bet,on=bet?[a,b].find(m=>m?.id===bet.on)?.name||"":"";
    const betLine=!bet?copy.no_bet:duelFill(bet.on===r.winnerId?copy.bet_won:copy.bet_lost,{mise:fmt(bet.stake),gain:fmt(r.payout||0),nom:on});
    box.innerHTML=`${quarrel}<p class="cellar-result">${esc(duelFill(r.fled?copy.result_fled:copy.result,who))}</p>
      <p class="cellar-result">${esc(betLine||"")}</p><p class="cellar-note">${esc(copy.tomorrow||"")}</p>`;
    return;
  }
  const go=rules.ready(c);
  if(!go.ok){
    box.innerHTML=`${quarrel}<p class="cellar-result">${esc(duelFill(copy.cancelled,{nom:go.mercenary?.name||""}))}</p><p class="cellar-note">${esc(copy.tomorrow||"")}</p>`;
    return;
  }
  const odds=rules.oddsOf(c);
  const fighters=`<div class="cellar-fighters">${cellarFighterHtml(a,odds?.a,odds?.p)}<span class="cellar-versus">contre</span>${cellarFighterHtml(b,odds?.b,odds?1-odds.p:0)}</div>`;
  if(!odds){
    // Le tavernier fait ses comptes : la page s'affiche d'abord, les simulations ensuite.
    box.innerHTML=`${quarrel}${fighters}`;
    setTimeout(()=>{
      if(!rules.ready(c).ok||rules.oddsOf(c)) return;
      rules.setOdds(c,simulateCellarOdds(a,b,rules.constants.simulations));
      if(typeof saveGame==="function") saveGame();
      renderCellar();
    },30);
    return;
  }
  const gold=Math.max(0,Math.floor(Number(c.company.gold)||0));
  const bet=t.bet,on=bet?[a,b].find(m=>m.id===bet.on):null;
  const actions=bet
    ?`<p class="cellar-result">${esc(duelFill(copy.bet_placed,{mise:fmt(bet.stake),nom:on?.name||"",cote:cellarOddsText(bet.odds)}))}</p>
      <div class="cellar-bet"><button type="button" class="primary" data-cellar-watch>${esc(copy.watch_go||"Que la bagarre commence !")}</button></div>`
    :`<div class="cellar-bet">
        <label>${esc(copy.stake||"")} <input type="number" min="0" max="${gold}" step="1" value="0" data-cellar-stake></label>
        <button type="button" class="primary" data-cellar-bet="${esc(String(a.id))}">${esc(duelFill(copy.bet_on,{nom:a.name}))}</button>
        <button type="button" class="primary" data-cellar-bet="${esc(String(b.id))}">${esc(duelFill(copy.bet_on,{nom:b.name}))}</button>
        <button type="button" class="secondary" data-cellar-watch>${esc(copy.watch||"")}</button>
      </div>`;
  box.innerHTML=`${quarrel}${fighters}<p class="cellar-note">${esc(copy.stop||"")}</p>${actions}<p class="cellar-error" data-cellar-error></p>`;
}

// « Parier sur … » : la mise sur la table, puis la bagarre.
function betOnCellarFight(id){
  const rules=cellarRulesOf(),c=game.campaign;
  if(!rules) return;
  const input=document.querySelector("[data-cellar-stake]");
  const stake=Math.floor(Number(input?.value)||0);
  const target=rules.fighters(c).find(m=>String(m?.id)===String(id));
  const error=document.querySelector("[data-cellar-error]");
  if(stake<=0){ if(error) error.textContent="Indiquez votre mise, ou regardez sans parier."; return; }
  const result=rules.placeBet(c,{on:target?.id,stake});
  if(!result.ok){ if(error) error.textContent=CELLAR_REASONS[result.reason]||""; if(result.reason==="odds") renderCellar(); return; }
  if(!startCellarFight()) renderCellar();
}
function watchCellarFight(){
  if(!startCellarFight()) renderCellar();
}

function initializeCellarUi(){
  document.addEventListener("click",event=>{
    const bet=event.target.closest?.("[data-cellar-bet]");
    if(bet){ betOnCellarFight(bet.dataset.cellarBet); return; }
    if(event.target.closest?.("[data-cellar-watch]")) watchCellarFight();
  });
}
