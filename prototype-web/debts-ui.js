"use strict";

// Les dettes (Idan, 2026-11-10), interface : à l'Intendance, un menu « Dettes » avec, pour chaque mercenaire à qui l'on
// doit (présent ou parti ; les morts n'y sont plus), sa dette et « Rembourser » : toute sa dette, s'il y a assez d'or
// (« individuel mais total ») ; le journal et la notification du jour. Règles : game-core/debts.js ; textes :
// data/reference/debts-copy.json.
function debtRules(){ return typeof campaignRules==="function"?campaignRules().debtRules||null:null; }
function debtCopy(){ return game.referenceData?.debtsCopy||{}; }
function debtFill(text,vars={}){ return String(text||"").replace(/\{(\w+)\}/g,(all,key)=>key in vars?vars[key]:all); }
const debtFemale=m=>String(m?.sex||m?.profile?.sex||"").trim().toLowerCase().startsWith("f");
function debtNames(list){ return list.map(d=>d.name+" "+fmt(d.amount)).join(", "); }
function debtTotal(c){ return debtRules()?.total(c)||0; }

function debtsPanelHtml(c){
  const rules=c?debtRules():null;
  const list=rules?rules.list(c):[];
  if(!list.length) return "";
  const copy=debtCopy().panel||{},kinds=copy.kinds||{},gold=Math.max(0,Number(c.company.gold)||0);
  const total=list.reduce((sum,e)=>sum+e.amount,0);
  const rows=list.map(e=>{
    const detail=[...Object.entries(kinds).filter(([key])=>e[key]>0).map(([key,label])=>label+" : "+fmt(e[key])+" PO"),
      debtFill(copy.since,{jour:fmt(e.since)})].join(" · ");
    const short=gold<e.amount;
    return `<div class="debt-row" title="${esc(detail)}">
      <span class="debt-name">${esc(e.name)}${e.present?"":` <small>(${esc(copy.left||"")})</small>`}</span>
      <b class="debt-amount">${fmt(e.amount)} PO</b>
      <button type="button" class="secondary debt-repay" data-debt-repay="${esc(e.id)}"${short?` disabled title="${esc(copy.short||"")}"`:""}>${esc(copy.repay||"")}</button>
    </div>`;
  }).join("");
  return `<details class="steward-offer debts-menu"><summary class="talk-offer-btn">${esc(copy.title||"")} · ${fmt(total)} PO</summary>
    <div class="steward-picks debt-rows">${rows}</div></details>`;
}
function renderDebtsPanel(){
  const panel=$("debts-panel");
  if(!panel||!game.campaign) return;
  const open=Boolean(panel.querySelector("details")?.open);
  panel.innerHTML=debtsPanelHtml(game.campaign);
  if(open&&panel.querySelector("details")) panel.querySelector("details").open=true;
}

// Le journal du matin : les salaires et l'entretien impayés, les montures relâchées.
function logDebts(report){
  const copy=debtCopy().log||{},salaries=report?.salaries,stable=report?.stable;
  if(salaries?.owed>0) tavernLog(debtFill(copy.salary,{montant:fmt(salaries.owed),noms:debtNames(salaries.debts||[])}),"bad");
  if(stable?.owed>0) tavernLog(debtFill(copy.upkeep,{montant:fmt(stable.owed),noms:debtNames(stable.debts||[])}),"bad");
  for(const m of stable?.released||[]) tavernLog(debtFill(copy.released,{nom:typeof mountName==="function"?mountName(m):m.name,
    e:typeof mountWords==="function"?mountWords(m).e:""}),"bad");
}
// Les primes impayées d'une fin de mission ou d'un retour (report.bonusOwed).
function bonusDebtLine(owed,list=[]){
  if(!(owed>0)) return "";
  return debtFill(debtCopy().log?.bonus,{montant:fmt(owed),noms:debtNames(list)});
}

// La notification du jour : la caisse vide (les dettes du matin et le total), les montures relâchées.
function debtNews(report){
  const copy=debtCopy().day_news||{},c=game.campaign,out=[];
  const owed=(report?.salaries?.owed||0)+(report?.stable?.owed||0);
  if(owed>0) out.push({tone:"alert",icon:"gold",text:copy.text,detail:debtFill(copy.detail,{montant:fmt(owed),total:fmt(debtTotal(c))})});
  for(const m of report?.stable?.released||[]) out.push({tone:"alert",icon:"alert",
    text:debtFill(copy.released,{nom:typeof mountName==="function"?mountName(m):m.name,e:typeof mountWords==="function"?mountWords(m).e:""}),
    detail:copy.released_detail});
  return out;
}

function repayDebt(id){
  const c=game.campaign,rules=debtRules();
  if(!c||!rules) return;
  const entry=rules.list(c).find(e=>String(e.id)===String(id));
  const result=rules.repay(c,id);
  if(!result.ok) return;
  tavernLog(debtFill(debtCopy().log?.repaid,{nom:result.name,montant:fmt(result.amount),e:debtFemale(entry?.mercenary||entry)?"e":""}),"gear");
  saveGame();
  renderGame();
}

function initializeDebts(){
  document.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-debt-repay]");
    if(!button||button.disabled) return;
    repayDebt(button.dataset.debtRepay);
  });
}

if(typeof document!=="undefined") initializeDebts();
