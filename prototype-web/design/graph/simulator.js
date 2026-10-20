"use strict";
// Interface du laboratoire : toutes les simulations utilisent simulation-core.js et les fonctions game-core.
(async function(){
  const mount=document.getElementById("simulator");
  if(!mount)return;
  const el=(tag,text,cls)=>{
    const node=document.createElement(tag);
    if(text!==undefined&&text!==null)node.textContent=String(text);
    if(cls)node.className=cls;
    return node;
  };
  const format=n=>n===null||!Number.isFinite(Number(n))?"—":Number(n).toLocaleString("fr-FR",{maximumFractionDigits:2});
  const configs={
    economy:{
      name:"Économie & recrutement",description:"Réputation de compagnie, prime, départs et négociation : calculs du moteur.",
      fields:[
        ["captain","Réputation capitaine",200,"rep"],["first","Réputation mercenaire A",300,"rep"],
        ["second","Réputation mercenaire B",120,"rep"],["heritage","Héritage des morts",50,"heritage"],
        ["reputation","Réputation du candidat",100,"rep"],["salary","Salaire demandé (PO/jour)",25,"salaire"],
        ["courage","Courage",50,"courage"],["pretensions","Prétentions salariales",35,"pretentions"],
        ["intelligence","Intelligence",60,"intel"],["will","Volonté",70,"volonte"],
        ["offerPercent","Offre (% des demandes)",75,"negociation"]
      ],
      metrics:{
        renown:"Réputation compagnie",renownCaptain:"Part capitaine",renownOthers:"Part mercenaires",renownLegacy:"Part héritage",
        bonus:"Prime de mission (PO)",resistance:"Résistance à la négociation",departure:"Départ de la taverne (%)",
        pAccept:"Acceptation de l'offre (%)",pQuit:"Risque de départ après refus (%)",
        offerSalary:"Salaire proposé (PO)",offerBonus:"Prime proposée (PO)"
      }
    },
    combat:{
      name:"Combat",description:"Toucher, Blesser, vitesse, initiative, mouvement et critiques : probabilités du moteur.",
      fields:[
        ["weapon","Arme","", "armes","weapon"],["armor","Armure du combattant","", "armure","armor"],
        ["defArmor","Armure adverse","", "armure","armor"],["force","Force",60,"force"],
        ["dexterity","Dextérité",60,"dex"],["speed","Vitesse",60,"vitesse"],
        ["luck","Chance",60,"chance"],["perception","Perception",50,"perception"],
        ["endurance","Endurance",50,"endu"],["dodge","Esquive",50,"esquive"],
        ["intelligence","Intelligence",50,"intel"],["courage","Courage",50,"courage"],
        ["will","Volonté",50,"volonte"],["mastery","Maîtrise arme & catégorie",40,"martial"],
        ["defDodge","Esquive adverse",50,"defense"],["defEndurance","Endurance adverse",50,"blesser"],
        ["defPerception","Perception adverse",50,"defense"],["defSpeed","Vitesse adverse",50,"defense"],
        ["distance","Distance (hexagones)",1,"toucher"],["chargePower","Puissance de charge",0,"charge"]
      ],
      metrics:{
        hit:"Probabilité de toucher (%)",wound:"Probabilité de blesser (%)",crit:"Critique positif (%)",
        speed:"Vitesse effective",dodge:"Esquive effective",initiative:"Initiative",
        movement:"Mouvement (hex)",chain:"Enchaînement, attaque 2 (%)",armorMatchup:"Différentiel de puissance"
      }
    },
    progression:{
      name:"Progression & réputation",description:"Journal de mission → XP, niveaux de caractéristiques et réputation de carrière.",
      fields:[
        ["baseStat","Valeur initiale des caractéristiques",50,"caracs"],
        ["personalReputation","Réputation personnelle initiale",200,"rep"],
        ["criticalSuccesses","Critiques réussis",0,"critique"],["criticalFailures","Échecs critiques",0,"critique"],
        ["knockouts","Ennemis mis hors combat",0,"kill"],["chargeAttempts","Charges tentées",0,"charge"],
        ["hpHealed","PV soignés",0,"soin"],["fleeHexes","Cases parcourues en fuite",0,"fuite"],
        ["chains","Enchaînements réussis",0,"toucher"],["woundsTaken","Blessures encaissées",0,"blessures"],
        ["heavyArmorHexes","Cases parcourues en armure lourde",0,"armure"],
        ["courageHeld","Tests de courage tenus",0,"courage"],["recoveries","Reprises de contrôle",0,"fuite"],
        ["intimidations","Intimidations réussies",0,"social"],["backstabWounds","Blessures reçues de dos",0,"blessures"],
        ["worstChoices","Mauvais choix de dégâts",0,"intel"],["physicalWounds","Blessures physiques",0,"resistances"],
        ["enemyReputation","Réputation de l'ennemi",100,"rep"],
        ["enemyWounded","A contribué à le blesser",0,"repcarriere","boolean"],
        ["enemyKnockout","L'a mis hors combat",0,"repcarriere","boolean"],
        ["returnWounded","Retour blessé",0,"blessures","boolean"]
      ],
      metrics:{
        reputationGain:"Réputation de carrière gagnée",intimidationXP:"XP d'Intimidation"
      }
    },
    affinity:{
      name:"Affinité capitaine / mercenaire",description:"Peuple, culture et neuf alignements : score initial, acquis et total.",
      fields:[
        ["captainPeople","Peuple du capitaine","","peuple","people"],["mercenaryPeople","Peuple du mercenaire","","peuple","people"],
        ["captainAlignment","Alignement du capitaine","","alignement","alignment"],
        ["mercenaryAlignment","Alignement du mercenaire","","alignement","alignment"],
        ["sameCulture","Culture commune",1,"culture","boolean"],["acquired","Affinité acquise",0,"affacquise"]
      ],
      metrics:{
        affinityInitial:"Affinité initiale /100",affinityAcquired:"Affinité acquise",
        affinityTotal:"Affinité totale /100",people:"Contribution du peuple (brut)",
        culture:"Contribution de la culture (brut)",alignment:"Contribution alignement (brut)",
        distance:"Distance sur la grille"
      }
    }
  };
  for(const name of ["Force","Dextérité","Vitesse","Chance","Perception","Endurance","Esquive","Intelligence","Courage","Volonté","Constitution","Charisme"]){
    configs.progression.metrics["stat."+name]="Niveau de "+name;
    configs.progression.metrics["xp."+name]="XP de "+name;
  }
  for(const name of ["Résistance physique","Résistance au feu","Résistance au froid","Résistance à la foudre","Résistance au poison"])
    configs.progression.metrics["resist."+name]="Niveau "+name;

  mount.replaceChildren();
  mount.appendChild(el("h3","Simulateur avant / après"));
  mount.appendChild(el("p","Calculé à partir du moteur réel. Aucun personnage ni sauvegarde modifiés.","muted"));
  const loading=el("p","Chargement des référentiels…","muted");mount.appendChild(loading);
  async function loadReference(){
    const names={
      formulaConstants:"formula-constants.json",characteristics:"characteristics.json",
      weapons:"weapons.json",skills:"skills.json",baseArmors:"base-armors.json",
      itemQualities:"item-qualities.json",peopleAffinity:"people-affinity.json",
      alignmentGeneration:"alignment-generation.json"
    };
    const entries=await Promise.all(Object.entries(names).map(async([k,path])=>{
      try{
        const response=await fetch("/data/"+path,{cache:"no-store"});
        if(!response.ok)throw new Error(response.status+"");
        return [k,await response.json()];
      }catch(error){return [k,null]}
    }));
    return Object.fromEntries(entries);
  }
  const reference=await loadReference();
  let engine;
  try{
    engine=window.MercenairesDesignSimulation.createSimulator({
      reference,campaign:window.MercenairesCampaign,tavern:window.MercenairesTavern,
      combat:window.MercenairesCombat,progression:window.MercenairesProgression,
      affinity:window.MercenairesAffinity
    });
  }catch(error){loading.textContent="Simulateur indisponible : "+error.message;return}
  loading.remove();
  const modeSelect=el("select");modeSelect.className="wide";
  for(const [key,cfg] of Object.entries(configs)){
    const option=el("option",cfg.name);option.value=key;option.disabled=!engine.capabilities[key];modeSelect.appendChild(option);
  }
  mount.appendChild(modeSelect);
  const subtitle=el("p",configs.economy.description,"muted");mount.appendChild(subtitle);
  const changeLabel=el("label","Caractéristique ou événement à modifier");changeLabel.style.cssText="display:grid;gap:5px;margin:12px 0 8px;font-size:12px";mount.appendChild(changeLabel);
  const changeSelect=el("select");changeSelect.className="wide";changeLabel.appendChild(changeSelect);
  const beforeLabel=el("div","","muted");beforeLabel.style.cssText="font-size:12px;margin:8px 0";mount.appendChild(beforeLabel);
  const afterLabel=el("label","Nouvelle valeur");afterLabel.style.cssText="display:grid;gap:5px;margin:8px 0;font-size:12px";mount.appendChild(afterLabel);
  const afterHolder=el("div");afterLabel.appendChild(afterHolder);
  const details=el("details");details.style.cssText="margin-top:14px";mount.appendChild(details);
  details.appendChild(el("summary","Paramètres du scénario de base"));
  const inputGrid=el("div");inputGrid.style.cssText="display:grid;gap:8px;margin-top:12px";details.appendChild(inputGrid);
  const results=el("div");results.style.cssText="margin-top:18px";mount.appendChild(results);
  const allLabel=el("label");allLabel.style.cssText="display:flex;align-items:center;gap:8px;font-size:12px;margin:10px 0";
  const allCheckbox=el("input");allCheckbox.type="checkbox";allLabel.appendChild(allCheckbox);
  allLabel.appendChild(el("span","Afficher aussi les valeurs inchangées"));mount.appendChild(allLabel);
  const sourcePanel=el("details");sourcePanel.style.cssText="margin-top:14px";mount.appendChild(sourcePanel);
  sourcePanel.appendChild(el("summary","Sources et limites du scénario"));
  const notes=el("div");sourcePanel.appendChild(notes);
  const scenarios={};
  let mode="economy", field="courage",afterValue=60;

  function optionsFor(type){
    if(type==="people")return reference.peopleAffinity?.peoples||[];
    if(type==="alignment")return (reference.alignmentGeneration?.grid||[]).flat();
    if(type==="weapon")return (reference.weapons?.rows||[]).filter(w=>/Armes de tir|Armes à feu/.test(w.domaine||"")||(!/Boucliers/.test(w.domaine||"")&&w.nom)).map(w=>w.nom);
    if(type==="armor")return ["",...(reference.baseArmors?.rows||[]).map(a=>a.code)];
    if(type==="boolean")return [{value:0,label:"Non"},{value:1,label:"Oui"}];
    return [];
  }
  function control(spec,value){
    const type=spec[4]||"number";
    const node=el(type==="number"?"input":"select");
    if(type==="number"){
      node.type="number";node.step="1";node.value=String(value??0);
    }else{
      for(const option of optionsFor(type)){
        const entry=typeof option==="string"?{value:option,label:option||"Aucune"}:option;
        const opt=el("option",entry.label);opt.value=entry.value;node.appendChild(opt);
      }
      node.value=String(value??"");
    }
    node.className="wide";return node;
  }
  function readValue(input,spec){return (spec[4]&&spec[4]!=="boolean"&&spec[4]!=="number")?input.value:Number(input.value)}
  function initial(modeName){
    if(scenarios[modeName])return scenarios[modeName];
    const result={};
    for(const spec of configs[modeName].fields){
      let value=spec[2];
      if(spec[4]==="people")value=optionsFor("people")[0]||"";
      if(spec[4]==="alignment")value=optionsFor("alignment")[4]||optionsFor("alignment")[0]||"";
      if(spec[4]==="weapon")value=optionsFor("weapon")[0]||"";
      result[spec[0]]=value;
    }
    scenarios[modeName]=result;return result;
  }
  function selectMode(next){
    mode=next;const cfg=configs[mode],base=initial(mode);
    subtitle.textContent=cfg.description;
    field=cfg.fields.find(s=>s[0]===field)?.[0]||cfg.fields.find(s=>s[0]==="courage")?.[0]||cfg.fields[0][0];
    changeSelect.replaceChildren();
    for(const spec of cfg.fields){const opt=el("option",spec[1]);opt.value=spec[0];changeSelect.appendChild(opt)}
    changeSelect.value=field;
    inputGrid.replaceChildren();
    for(const spec of cfg.fields){
      const label=el("label",spec[1]);label.style.cssText="display:grid;gap:4px;font-size:12px";
      const input=control(spec,base[spec[0]]);
      input.addEventListener("change",()=>{
        base[spec[0]]=readValue(input,spec);
        if(field===spec[0])setAfterControl(true);else calculate();
      });
      label.appendChild(input);inputGrid.appendChild(label);
    }
    setAfterControl(true);
  }
  function setAfterControl(reset){
    field=changeSelect.value;
    const spec=configs[mode].fields.find(s=>s[0]===field),base=initial(mode),before=base[field];
    beforeLabel.textContent="Valeur actuelle : "+(before===0?"0":before||"—");
    const type=spec[4]||"number";
    if(reset)afterValue=type==="number"?Number(before)+10:type==="boolean"?(Number(before)?0:1):optionsFor(type).find(x=>x!==before)||before;
    afterHolder.replaceChildren();
    const input=control(spec,afterValue);
    afterValue=readValue(input,spec);
    input.addEventListener("input",()=>{afterValue=readValue(input,spec);calculate()});
    afterHolder.appendChild(input);
    window.DesignGraphExplorer?.selectNode?.(spec[3]);
    calculate();
  }
  function calculate(){
    const base={...initial(mode)},next={...base,[field]:afterValue};
    results.replaceChildren();notes.replaceChildren();
    try{
      const compared=engine.compare(mode,base,next);
      const labels=configs[mode].metrics;
      const changed=compared.rows.filter(x=>x.changed);
      const heading=el("h3",changed.length+" résultat(s) modifié(s)");heading.style.marginBottom="10px";results.appendChild(heading);
      const rows=allCheckbox.checked?compared.rows:changed;
      if(!rows.length)results.appendChild(el("p","Aucune variation chiffrée pour ce scénario. La formule peut être plafonnée ou la modification trop faible.","muted"));
      for(const item of rows){
        const line=el("div");line.style.cssText="display:grid;gap:3px;border-bottom:1px solid #354253;padding:8px 0;font-size:12px";
        line.appendChild(el("div",labels[item.key]||item.key));
        const beforeAfter=el("div",format(item.before)+" → "+format(item.after));beforeAfter.style.cssText="font-variant-numeric:tabular-nums;font-weight:600";line.appendChild(beforeAfter);
        const d=el("div",item.delta===null?"Hors domaine":(item.delta>0?"+":"")+format(item.delta));
        d.style.color=item.delta>0?"#7ad6b5":item.delta<0?"#ffab91":"#94a8bf";
        line.appendChild(d);results.appendChild(line);
      }
      for(const line of compared.after.notes)notes.appendChild(el("p",line,"muted"));
      notes.appendChild(el("h4","Fonctions et fichiers utilisés"));
      for(const source of compared.after.source)notes.appendChild(el("p",source,"muted"));
    }catch(error){results.appendChild(el("p","Simulation impossible : "+error.message,"muted"))}
  }
  modeSelect.addEventListener("change",()=>selectMode(modeSelect.value));
  changeSelect.addEventListener("change",()=>setAfterControl(true));
  allCheckbox.addEventListener("change",calculate);
  selectMode("economy");
})();
