"use strict";
// Simulateur non destructif : appelle les vraies fonctions pures de game-core/campaign.js
// et game-core/tavern.js. Ne sauvegarde rien et ne modifie aucune partie.
(function(){
  const mount=document.getElementById("simulator");
  if(!mount)return;
  const campaignApi=window.MercenairesCampaign;
  const tavernApi=window.MercenairesTavern;
  const ready=Boolean(campaignApi?.createCampaignRules&&tavernApi?.createTavernRules);
  const title=document.createElement("h3");title.textContent="Laboratoire de simulation";mount.appendChild(title);
  const subtitle=document.createElement("p");subtitle.className="muted";subtitle.textContent="Compare les valeurs avant/après avec les fonctions du moteur. Simulation isolée, aucune sauvegarde modifiée.";mount.appendChild(subtitle);
  if(!ready){const p=document.createElement("p");p.textContent="Modules du moteur indisponibles : simulation désactivée.";mount.appendChild(p);return}
  const rules=campaignApi.createCampaignRules({generator:{},tavern:{},reference:{}});
  const tavern=tavernApi.createTavernRules();
  const controls=document.createElement("div");controls.style.cssText="display:grid;gap:9px";mount.appendChild(controls);
  function field(label,value,min,max,step){
    const wrap=document.createElement("label");wrap.style.cssText="display:grid;gap:4px;font-size:12px";wrap.textContent=label;
    const input=document.createElement("input");input.type="number";input.value=value;input.min=min;input.max=max;input.step=step;input.style.width="100%";wrap.appendChild(input);controls.appendChild(wrap);return input;
  }
  const captain=field("Réputation du capitaine",200,0,100000,10);
  const elite=field("Réputation du meilleur mercenaire",300,0,100000,10);
  const secondary=field("Réputation du deuxième mercenaire",120,0,100000,10);
  const heritage=field("Héritage des morts",50,0,100000,10);
  const courage=field("Courage du mercenaire",50,0,200,5);
  const salary=field("Salaire journalier demandé",25,0,100000,1);
  const pretension=field("Prétentions salariales",35,0,100,5);
  const delta=field("Variation simulée (+/−)",10,-100000,100000,1);
  const metric=document.createElement("select");metric.innerHTML='<option value="captain">Réputation du capitaine</option><option value="elite">Réputation du meilleur mercenaire</option><option value="secondary">Réputation du deuxième mercenaire</option><option value="heritage">Héritage historique</option><option value="courage">Courage</option><option value="salary">Salaire</option><option value="pretension">Prétentions</option>';metric.className="wide";controls.appendChild(metric);
  const out=document.createElement("div");out.id="impact";out.style.cssText="margin-top:15px;padding:12px;background:#1e2b3a;border-radius:8px;font-size:12px;line-height:1.9";mount.appendChild(out);
  const warning=document.createElement("p");warning.className="muted";warning.textContent="Les deux indicateurs ci-dessous sont calculés par le vrai moteur. Ils ne représentent pas encore toutes les conséquences économiques et de combat.";mount.appendChild(warning);
  const inputs={captain,elite,secondary,heritage,courage,salary,pretension};
  function num(x){const v=Number(x.value);return Number.isFinite(v)?v:0}
  function calc(values){
    const state={company:{captainId:"cap",roster:[{id:"cap",name:"Capitaine",reputation:values.captain},{id:"elite",name:"Élite",reputation:values.elite},{id:"second",name:"Second",reputation:values.secondary}],renownHeritage:[{heritage:values.heritage}]}};
    const renown=rules.companyRenown(state);
    const bonus=tavern.missionBonusDemand({stats:{Courage:values.courage},salary:values.salary,salaryPretension:values.pretension});
    return {renown:renown.total,parts:renown.parts,bonus};
  }
  function format(x){return Number(x).toLocaleString("fr-FR",{maximumFractionDigits:2})}
  function render(){
    const before=Object.fromEntries(Object.entries(inputs).map(([k,input])=>[k,num(input)]));
    const after={...before};after[metric.value]=Math.max(0,before[metric.value]+num(delta));
    try{
      const a=calc(before),b=calc(after);
      const row=(name,x,y)=>'<div style="display:flex;justify-content:space-between;gap:8px"><span>'+name+'</span><strong>'+format(x)+' → '+format(y)+' ('+(y-x>=0?'+':'')+format(y-x)+')</strong></div>';
      out.innerHTML='<strong>Simulation : '+metric.selectedOptions[0].textContent+' '+(num(delta)>=0?'+':'')+format(num(delta))+'</strong><hr style="border-color:#43536b">'+row("Réputation compagnie",a.renown,b.renown)+row("Part du capitaine",a.parts.captain,b.parts.captain)+row("Part des mercenaires",a.parts.members,b.parts.members)+row("Héritage",a.parts.heritage,b.parts.heritage)+row("Prime de mission demandée",a.bonus,b.bonus);
    }catch(e){out.textContent="Calcul impossible : "+e.message}
  }
  [...Object.values(inputs),delta,metric].forEach(input=>input.addEventListener("input",render));
  render();
})();
