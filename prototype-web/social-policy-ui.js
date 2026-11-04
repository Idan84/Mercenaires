"use strict";

// Politique sociale (Idan, 2026-11-04), interface : à l'Intendance, un menu « Politique sociale » avec un curseur pour les
// blessés (0 à 100 %) et un par corvée dont le bâtiment est construit (0 à 200 %), et leur pourcentage, sans autre texte.
// Règles : game-core/social-policy.js ; textes : data/reference/social-policy-copy.json.
function socialRules(){ return campaignRules().socialPolicy||null; }
function socialCopy(){ return game.referenceData?.socialPolicyCopy||{}; }
const SOCIAL_CHORE_BUILDINGS={lumber:"lumber_camp",mine:"miners_guild",palace:"pleasure_palace"};

function socialPolicyHtml(c){
  const rules=c&&typeof campaignRules==="function"?socialRules():null;
  if(!rules) return "";
  const copy=socialCopy().panel||{},C=rules.constants;
  const row=(key,value,max)=>`<label class="social-policy-row"><span>${esc(copy[key]||"")}</span>
      <input type="range" min="0" max="${max}" step="${C.step}" value="${value}" data-social-rate="${key}">
      <output data-social-output="${key}">${fmt(value)} %</output></label>`;
  const chores=Object.entries(SOCIAL_CHORE_BUILDINGS).filter(([,code])=>campaignRules().buildingLevel(c,code)>0)
    .map(([course])=>row(course,rules.choreRate(c,course),C.choreMax));
  return `<details class="steward-offer social-policy"><summary class="talk-offer-btn">${esc(copy.title||"")}</summary>
    <div class="steward-picks social-policy-rows">${row("wounded",rules.woundedRate(c),C.woundedMax)}${chores.join("")}</div></details>`;
}
function renderSocialPolicyPanel(){
  const panel=$("social-policy-panel");
  if(!panel||!game.campaign) return;
  const open=Boolean(panel.querySelector("details")?.open);
  panel.innerHTML=socialPolicyHtml(game.campaign);
  if(open&&panel.querySelector("details")) panel.querySelector("details").open=true;
}

function initializeSocialPolicy(){
  // En glissant : le pourcentage ; en lâchant : le taux est réglé.
  document.addEventListener("input",event=>{
    const slider=event.target.closest?.("[data-social-rate]");
    if(!slider) return;
    const out=document.querySelector(`[data-social-output="${slider.dataset.socialRate}"]`);
    if(out) out.textContent=`${fmt(Number(slider.value))} %`;
  });
  document.addEventListener("change",event=>{
    const slider=event.target.closest?.("[data-social-rate]");
    if(!slider||!game.campaign) return;
    const result=socialRules()?.setRate(game.campaign,slider.dataset.socialRate,Number(slider.value));
    if(!result?.ok) return;
    saveGame();
    if(typeof renderGameHud==="function") renderGameHud();
    if(typeof renderTavern==="function") renderTavern();
  });
}

if(typeof document!=="undefined") initializeSocialPolicy();
