"use strict";

// Introduction puis création guidée du capitaine (demande d'Idan, 2026-10-04).
// « Nouvelle partie » → le capitaine mourant (image, texte et voix d'Idan) → « Vous n'êtes pas Bob ? »
// → assistant : nom, peuple, culture, origine sociale, ascendance, alignement → le camp.
// L'assistant ne fait que remplir le formulaire de création existant (#captain-*) puis le valider :
// la génération reste celle du moteur (createCaptainFromForm).
// Textes de description, force et faiblesse : data/reference/captain-creation-copy.json (Chatty).
// Sans texte, force et faiblesse affichent les modificateurs de la matrice de génération.
// Après la création, le thème « Blood & Wages » accompagne l'arrivée au camp (Idan).

const INTRO_VOICE_SRC="assets/audio/intro-voix.mp3";
const THEME_SRC="assets/audio/blood-and-wages-theme.mp3";
const INTRO_FALLBACK_SECONDS=56;

const WIZARD_STEPS=[
  {key:"name",nav:"Nom",title:"Quel est votre nom ?"},
  {key:"people",nav:"Peuple",title:"De quel peuple venez-vous ?",copy:"peoples",picto:"people",options:()=>peopleNames()},
  {key:"culture",nav:"Culture",title:"Quelle est votre culture ?",copy:"cultures",options:()=>culturesForPeople(wizard.choice.people)},
  {key:"avatar",nav:"Portrait",title:"Quel visage portera votre capitaine ?"},
  {key:"origin",nav:"Origine",title:"Quelle est votre origine sociale ?",copy:"origins",options:()=>originsForCulture(wizard.choice.culture)},
  {key:"ascendance",nav:"Ascendance",title:"Quelle est votre ascendance ?",copy:"ancestries",picto:"ascendance",options:()=>["",...compatibleAscendances(wizard.choice.people)]},
  {key:"alignment",nav:"Alignement",title:"Quel est votre alignement ?",copy:"alignments",options:()=>alignmentNames()},
  {key:"companyName",nav:"Compagnie",title:"Comment s’appelle votre compagnie ?"},
  {key:"recap",nav:"Récap",title:"Prenez la chevalière"}
];
const RECAP_ROWS=[["Nom","name"],["Peuple","people"],["Culture","culture"],["Origine sociale","origin"],["Ascendance","ascendance"],["Alignement","alignment"],["Compagnie","companyName"]];

const wizard={step:0,choice:{},voice:null,timers:[],theme:null};

// --- Introduction -----------------------------------------------------------------------------

function introParagraphs(){ return [...document.querySelectorAll("#intro-text p")]; }

function stopIntroVoice(){
  for(const t of wizard.timers) clearTimeout(t);
  wizard.timers=[];
  if(wizard.voice){ wizard.voice.pause(); wizard.voice=null; }
}

function revealNextParagraph(){
  const next=introParagraphs().find(p=>!p.classList.contains("is-shown"));
  if(next) next.classList.add("is-shown");
  if(!introParagraphs().some(p=>!p.classList.contains("is-shown"))) $("intro-panel").classList.add("is-done");
}

function revealAllParagraphs(){
  for(const p of introParagraphs()) p.classList.add("is-shown");
  $("intro-panel").classList.add("is-done");
}

// Chaque paragraphe apparaît au prorata de sa longueur sur la durée de la voix.
function scheduleIntro(totalSeconds){
  for(const t of wizard.timers) clearTimeout(t);
  const paragraphs=introParagraphs();
  const lengths=paragraphs.map(p=>p.textContent.length);
  const total=lengths.reduce((a,b)=>a+b,0)||1;
  let elapsed=0;
  wizard.timers=paragraphs.map((p,i)=>{
    const at=elapsed;
    elapsed+=lengths[i]/total*totalSeconds*1000;
    return setTimeout(()=>{ p.classList.add("is-shown"); if(i===paragraphs.length-1) $("intro-panel").classList.add("is-done"); },at);
  });
}

function openIntro(){
  stopIntroVoice();
  for(const id of ["setup-panel","game-panel","game-over-panel","creation-wizard"]) $(id).classList.add("hidden");
  for(const p of introParagraphs()) p.classList.remove("is-shown");
  $("intro-panel").classList.remove("is-done");
  $("intro-panel").classList.remove("hidden");
  scheduleIntro(INTRO_FALLBACK_SECONDS);
  // Le clic sur « Nouvelle partie » autorise le son ; sans fichier ou sans son, le texte suit seul.
  const voice=new Audio(INTRO_VOICE_SRC);
  wizard.voice=voice;
  voice.addEventListener("loadedmetadata",()=>{ if(wizard.voice===voice&&Number.isFinite(voice.duration)) scheduleIntro(voice.duration); },{once:true});
  voice.play().catch(()=>{});
}

// --- Assistant de création ---------------------------------------------------------------------

function creationCopy(section,name){
  return (game.referenceData?.captainCreationCopy?.[section]||[]).find(r=>r.nom===name)||null;
}

// Thème « Blood & Wages » : une fois, à l'arrivée au camp après la création ; coupé au retour au
// menu, en mission ou en fin de partie (screen-ui.js).
function playTheme(){
  stopTheme();
  const theme=new Audio(THEME_SRC);
  theme.volume=0.7;
  wizard.theme=theme;
  theme.play().catch(()=>{});
}

function stopTheme(){
  if(wizard.theme){ wizard.theme.pause(); wizard.theme=null; }
}

function choiceLabel(key,value){
  if(key==="ascendance"&&!value) return "Aucune";
  return value||"—";
}

function openWizard(){
  stopIntroVoice();
  revealAllParagraphs();
  wizard.step=0;
  wizard.choice={name:"",people:null,culture:null,origin:null,ascendance:"",alignment:null,avatar:null,companyName:""};
  $("creation-wizard").classList.remove("hidden");
  renderWizard();
}

// Un choix en amont qui change invalide les choix qui en dépendent.
function setChoice(key,value){
  wizard.choice[key]=value;
  if(key==="people"){
    if(!culturesForPeople(value).includes(wizard.choice.culture)) wizard.choice.culture=null;
    if(!compatibleAscendances(value).includes(wizard.choice.ascendance)) wizard.choice.ascendance="";
  }
  if(key==="people"||key==="culture"){
    if(!captainAvatarOptions().some(a=>a.id===wizard.choice.avatar)) wizard.choice.avatar=null;
    if(!wizard.choice.culture||!originsForCulture(wizard.choice.culture).includes(wizard.choice.origin)) wizard.choice.origin=null;
  }
}

function stepIsComplete(step){
  if(step.key==="name"||step.key==="companyName") return Boolean(String(wizard.choice[step.key]||"").trim());
  if(step.key==="avatar") return !captainAvatarOptions().length || captainAvatarOptions().some(a=>a.id===wizard.choice.avatar);
  if(step.key==="recap") return true;
  if(step.key==="ascendance") return wizard.choice.ascendance!==null;
  return Boolean(wizard.choice[step.key]);
}

function traitItems(list){
  return list.map(t=>`<li class="trait ${t.value<0?"trait--down":""}">${esc(t.name)} <span aria-hidden="true">${(t.value<0?"▼":"▲").repeat(Math.min(3,Math.abs(t.value)))}</span></li>`).join("");
}

function renderProgress(){
  return WIZARD_STEPS.map((step,index)=>{
    const state=index<wizard.step?"is-done":index===wizard.step?"is-current":"";
    return `<span class="wizard-progress-item ${state}">
      <i aria-hidden="true"></i>
      <b>${esc(step.nav)}</b>
    </span>`;
  }).join("");
}

function renderInfo(step,value){
  const copy=creationCopy(step.copy,value);
  if(step.key==="ascendance"&&!value){
    return `<div class="wizard-copy-grid">
      <section class="wizard-copy-card wizard-copy-description">
        <h4>Description</h4>
        <p>Aucune ascendance particulière. Votre capitaine ne porte pas de marque de lignée surnaturelle connue.</p>
      </section>
      <section class="wizard-copy-card wizard-copy-force">
        <h4>Force</h4>
        <p>Un profil plus neutre, sans spécialisation imposée par une ascendance.</p>
      </section>
      <section class="wizard-copy-card wizard-copy-weakness">
        <h4>Faiblesse</h4>
        <p>Aucun avantage spécifique lié à une ascendance.</p>
      </section>
    </div>`;
  }

  const traits=MercenairesCreation.traitsFor(game.referenceData,value);
  const fallback=(items)=>items.length?`<ul class="trait-list">${traitItems(items)}</ul>`:`<p class="wizard-placeholder">Aucune particularité marquée.</p>`;
  const block=(cls,title,text,items)=>`<section class="wizard-copy-card ${cls}">
    <h4>${title}</h4>
    ${text?`<p>${esc(text)}</p>`:fallback(items)}
  </section>`;

  return `<div class="wizard-copy-grid">
    ${block("wizard-copy-description","Description",copy?.description,[])}
    ${block("wizard-copy-force","Force",copy?.force,traits.forces)}
    ${block("wizard-copy-weakness","Faiblesse",copy?.faiblesse,traits.faiblesses)}
  </div>`;
}

function renderDetail(step,value){
  if(value===null||value===undefined){
    return `<aside class="wizard-detail-panel is-empty">
      <div class="wizard-detail-empty-mark" aria-hidden="true">✦</div>
      <p>Choisissez une option pour afficher son profil.</p>
    </aside>`;
  }

  const ownPicto=step.picto&&value?renderPicto(step.picto,value,{size:"hero"}):"";
  const parentPicto=!ownPicto&&step.key==="culture"&&wizard.choice.people
    ?renderPicto("people",wizard.choice.people,{size:"hero"}):"";
  const picto=ownPicto||parentPicto;
  const kindLabel=step.key==="culture"&&wizard.choice.people?`Culture ${esc(wizard.choice.people)}`:
    step.key==="origin"?"Origine sociale":
    step.key==="ascendance"?"Ascendance":
    step.key==="alignment"?"Alignement":
    step.key==="people"?"Peuple":"Profil";

  return `<aside class="wizard-detail-panel">
    <div class="wizard-detail-head">
      ${picto?`<div class="wizard-sigil">${picto}</div>`:""}
      <div>
        <p class="wizard-detail-kicker">${kindLabel}</p>
        <h3>${esc(choiceLabel(step.key,value))}</h3>
      </div>
    </div>
    ${renderInfo(step,value)}
  </aside>`;
}


function renderAlignmentWheel(values,selected){
  // Axes : Bien (nord), Mal (sud), Chaotique (ouest), Loyal (est).
  const sectors=[
    ["Neutre bon",270],["Loyal bon",315],["Loyal neutre",0],["Loyal mauvais",45],
    ["Neutre mauvais",90],["Chaotique mauvais",135],["Chaotique neutre",180],["Chaotique bon",225]
  ];
  const cx=180,cy=180,outer=165,inner=53;
  const point=(radius,angle)=>{const a=angle*Math.PI/180;return [cx+radius*Math.cos(a),cy+radius*Math.sin(a)];};
  const coords=p=>p.map(n=>n.toFixed(2)).join(" ");
  const items=sectors.filter(([value])=>values.includes(value)).map(([value,angle])=>{
    const start=point(inner,angle-22.5),end=point(inner,angle+22.5);
    const farStart=point(outer,angle-22.5),farEnd=point(outer,angle+22.5);
    const p=`M ${coords(start)} L ${coords(farStart)} A ${outer} ${outer} 0 0 1 ${coords(farEnd)} L ${coords(end)} A ${inner} ${inner} 0 0 0 ${coords(start)} Z`;
    const label=point(113,angle);
    const words=value.split(" ");
    return `<g class="alignment-sector ${selected===value?"is-selected":""}" data-wizard-choice="${esc(value)}" tabindex="0" role="button" aria-label="${esc(value)}" aria-pressed="${selected===value}">
      <path d="${p}"></path><text x="${label[0]}" y="${label[1]-6}" text-anchor="middle"><tspan x="${label[0]}" dy="0">${esc(words[0])}</tspan><tspan x="${label[0]}" dy="15">${esc(words.slice(1).join(" "))}</tspan></text>
    </g>`;
  }).join("");
  const neutral=values.includes("Neutre")?`<g class="alignment-sector alignment-center ${selected==="Neutre"?"is-selected":""}" data-wizard-choice="Neutre" role="button" tabindex="0" aria-label="Neutre" aria-pressed="${selected==="Neutre"}"><circle cx="180" cy="180" r="51"></circle><text x="180" y="184" text-anchor="middle">Neutre</text></g>`:"";
  return `<div class="alignment-wheel-wrap"><div class="alignment-axis alignment-axis-top">BON</div><div class="alignment-axis alignment-axis-left">CHAOTIQUE</div>
  <svg class="alignment-wheel" viewBox="0 0 360 360" aria-label="Roue interactive des alignements" role="group">${items}${neutral}</svg>
  <div class="alignment-axis alignment-axis-right">LOYAL</div><div class="alignment-axis alignment-axis-bottom">MAUVAIS</div></div>`;
}

function renderChoiceStep(step){
  const values=step.options();
  const selected=wizard.choice[step.key];
  const options=values.map(v=>{
    const label=choiceLabel(step.key,v);
    const picto=step.picto&&v?renderPicto(step.picto,v,{size:"wizard"}):"";
    return `<button class="wizard-option-card ${v===selected?"is-selected":""}" data-wizard-choice="${esc(v)}" aria-pressed="${v===selected?"true":"false"}">
      <span class="wizard-option-art">${picto||`<span class="wizard-option-monogram">${esc(label).charAt(0)}</span>`}</span>
      <span class="wizard-option-label">${esc(label)}</span>
      <span class="wizard-option-check" aria-hidden="true">✓</span>
    </button>`;
  }).join("");

  return `<div class="wizard-layout">
    <section class="wizard-options-panel">
      <div class="wizard-options-head">
        <span>Votre choix</span>
        <small>${values.length} option${values.length>1?"s":""}</small>
      </div>
      ${step.key==="alignment"?renderAlignmentWheel(values,selected):`<div class="wizard-option-grid">${options}</div>`}
    </section>
    ${renderDetail(step,selected)}
  </div>`;
}

function renderNameStep(){
  return `<div class="wizard-name-layout">
    <div class="wizard-name-card">
      <p class="wizard-name-overline">Le vieux capitaine vous appelait Bob.</p>
      <label for="wizard-name-input">Corrigeons ça.</label>
      <input id="wizard-name-input" maxlength="30" autocomplete="off" placeholder="Votre nom" value="${esc(wizard.choice.name)}" />
      <small>Ce nom apparaîtra sur votre compagnie et dans les récits de vos mercenaires.</small>
    </div>
  </div>`;
}


function captainAvatarOptions(){
  const norm=s=>String(s||"").trim().toLocaleLowerCase("fr");
  const people=norm(wizard.choice.people),culture=norm(wizard.choice.culture);
  return (game.referenceData?.avatars?.rows||[]).filter(a=>{
    if(!a.id||!a.full||!a.portrait||norm(a.people)!==people) return false;
    const cultures=a.tags?.culture;
    const tagged=Array.isArray(cultures)?cultures:typeof cultures==="string"?[cultures]:[];
    return !tagged.length || tagged.some(c=>norm(c)===culture);
  });
}
function renderAvatarChoice(){
  const avatars=captainAvatarOptions();
  if(!avatars.length) return '<div class="wizard-name-card"><h3>Aucun portrait compatible disponible.</h3><p>Votre capitaine utilisera le portrait générique jusqu’à l’arrivée de nouveaux avatars.</p></div>';
  const chosen=avatars.find(a=>a.id===wizard.choice.avatar);
  const cards=avatars.map(a=>{
    const selected=a.id===wizard.choice.avatar;
    const img=mercenaryAvatarUrl({avatar:a},"portrait");
    return `<button type="button" class="captain-avatar-choice ${selected?"is-selected":""}" data-wizard-avatar="${esc(a.id)}" aria-pressed="${selected}">
      <img src="${esc(img)}" alt="Portrait ${esc(a.id)}" loading="lazy" onerror="this.hidden=true"><span>${esc(a.id)}</span>
    </button>`;
  }).join("");
  return `<div class="wizard-layout"><section class="wizard-options-panel">
    <div class="wizard-options-head"><span>Choisissez votre visage</span><small>${avatars.length} portraits</small></div>
    <div class="captain-avatar-grid">${cards}</div>
  </section><aside class="wizard-detail-panel"><h3>${chosen?"Votre capitaine":"Sélectionnez un portrait"}</h3>
    ${chosen?renderAvatar({name:wizard.choice.name||"Capitaine",people:wizard.choice.people,avatar:chosen},{variant:"detail",kind:"full"}):"<p>Les portraits correspondent à votre peuple et à votre culture, lorsqu’elle est renseignée sur l’avatar.</p>"}
  </aside></div>`;
}
function renderCompanyNameStep(){
  return `<div class="wizard-name-layout"><div class="wizard-name-card">
    <p class="wizard-name-overline">Des salaires à payer. Des morts à remplacer.</p>
    <label for="wizard-company-input">Le nom de votre compagnie</label>
    <input id="wizard-company-input" maxlength="60" autocomplete="off" placeholder="Les Braves (enfin, presque)" value="${esc(wizard.choice.companyName)}">
    <small>Le blason et les couleurs viendront plus tard.</small>
  </div></div>`;
}

function renderRecap(){
  const c=wizard.choice;
  const icon=(key,v)=>key==="people"?renderPicto("people",v,{size:"wizard"}):key==="ascendance"&&v?renderPicto("ascendance",v,{size:"wizard"}):"";
  return `<div class="wizard-recap-shell">
    <div class="wizard-recap-title">
      <span class="wizard-recap-mark" aria-hidden="true">✦</span>
      <p>La compagnie vous appartient désormais.</p>
      <h3>${esc(c.name)}</h3>
    </div>
    <dl class="wizard-recap">${RECAP_ROWS.map(([label,key])=>`<div>
      <dt>${label}</dt>
      <dd>${icon(key,c[key])}<span>${esc(choiceLabel(key,c[key]))}</span></dd>
    </div>`).join("")}</dl>
  </div>`;
}

function renderWizard(){
  const step=WIZARD_STEPS[wizard.step];
  $("wizard-step-label").textContent=`Étape ${wizard.step+1} / ${WIZARD_STEPS.length}`;
  $("wizard-title").textContent=step.title;
  $("wizard-progress").innerHTML=renderProgress();
  if(step.key==="name"){
    $("wizard-body").innerHTML=renderNameStep();
    const input=$("wizard-name-input");
    input.addEventListener("input",()=>{ wizard.choice.name=input.value; updateWizardNav(); });
    input.addEventListener("keydown",e=>{ if(e.key==="Enter"&&stepIsComplete(step)) nextWizardStep(); });
    setTimeout(()=>input.focus(),0);
  }else if(step.key==="companyName"){
    $("wizard-body").innerHTML=renderCompanyNameStep();
    const input=$("wizard-company-input");
    input.addEventListener("input",()=>{wizard.choice.companyName=input.value;updateWizardNav();});
    input.addEventListener("keydown",e=>{if(e.key==="Enter"&&stepIsComplete(step)) nextWizardStep();});
  }else if(step.key==="avatar"){
    $("wizard-body").innerHTML=renderAvatarChoice();
  }else if(step.key==="recap"){
    $("wizard-body").innerHTML=renderRecap();
  }else{
    $("wizard-body").innerHTML=renderChoiceStep(step);
  }
  updateWizardNav();
}

function updateWizardNav(){
  const step=WIZARD_STEPS[wizard.step];
  $("wizard-prev-btn").querySelector("span").textContent=wizard.step===0?"Retour":"Précédent";
  $("wizard-next-btn").querySelector("span").textContent=step.key==="recap"?"Prendre la chevalière":"Suivant";
  $("wizard-next-btn").disabled=!stepIsComplete(step);
}

function previousWizardStep(){
  if(wizard.step===0){ $("creation-wizard").classList.add("hidden"); return; }
  wizard.step-=1;
  renderWizard();
}

function nextWizardStep(){
  const step=WIZARD_STEPS[wizard.step];
  if(!stepIsComplete(step)) return;
  if(step.key==="recap"){ finishWizard(); return; }
  wizard.step+=1;
  renderWizard();
}

// Remplit le formulaire de création existant, puis le valide comme le bouton historique.
function finishWizard(){
  const c=wizard.choice;
  $("captain-name").value=c.name.trim();
  $("captain-people").value=c.people;
  updateCultureSelect();
  $("captain-culture").value=c.culture;
  updateOriginSelect();
  $("captain-origin").value=c.origin;
  $("captain-ascendance").value=c.ascendance||"";
  $("captain-alignment").value=c.alignment;
  $("create-game-btn").click();
  if(!game.campaign) return; // sauvegarde existante conservée : le joueur a refusé de la remplacer
  stopIntroVoice();
  $("creation-wizard").classList.add("hidden");
  $("intro-panel").classList.add("hidden");
  playTheme();
}

function initializeIntroUi(){
  $("intro-text").addEventListener("click",revealNextParagraph);
  $("intro-skip-btn").addEventListener("click",revealAllParagraphs);
  $("not-bob-btn").addEventListener("click",openWizard);
  $("intro-exit-btn").addEventListener("click",backToMenu);
  $("wizard-exit-btn").addEventListener("click",backToMenu);
  $("wizard-prev-btn").addEventListener("click",previousWizardStep);
  $("wizard-next-btn").addEventListener("click",nextWizardStep);
  $("wizard-body").addEventListener("click",event=>{
    const avatar=event.target.closest("[data-wizard-avatar]");
    if(avatar){setChoice("avatar",avatar.dataset.wizardAvatar);renderWizard();return;}
    const btn=event.target.closest("[data-wizard-choice]");
    if(!btn) return;
    setChoice(WIZARD_STEPS[wizard.step].key,btn.dataset.wizardChoice);
    renderWizard();
  });
  $("wizard-body").addEventListener("keydown",event=>{
    if(event.key!=="Enter"&&event.key!==" ") return;
    const sector=event.target.closest(".alignment-sector[data-wizard-choice]");
    if(!sector) return;
    event.preventDefault();
    setChoice("alignment",sector.dataset.wizardChoice);
    renderWizard();
  });
}
