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
  {key:"name",title:"Quel est votre nom ?"},
  {key:"people",title:"De quel peuple venez-vous ?",copy:"peoples",picto:"people",options:()=>peopleNames()},
  {key:"culture",title:"Quelle est votre culture ?",copy:"cultures",options:()=>culturesForPeople(wizard.choice.people)},
  {key:"origin",title:"Quelle est votre origine sociale ?",copy:"origins",options:()=>originsForCulture(wizard.choice.culture)},
  {key:"ascendance",title:"Quelle est votre ascendance ?",copy:"ancestries",picto:"ascendance",options:()=>["",...compatibleAscendances(wizard.choice.people)]},
  {key:"alignment",title:"Quel est votre alignement ?",copy:"alignments",options:()=>alignmentNames()},
  {key:"recap",title:"Prenez la chevalière"}
];
const RECAP_ROWS=[["Nom","name"],["Peuple","people"],["Culture","culture"],["Origine sociale","origin"],["Ascendance","ascendance"],["Alignement","alignment"]];

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
  wizard.choice={name:"",people:null,culture:null,origin:null,ascendance:"",alignment:null};
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
    if(!wizard.choice.culture||!originsForCulture(wizard.choice.culture).includes(wizard.choice.origin)) wizard.choice.origin=null;
  }
}

function stepIsComplete(step){
  if(step.key==="name") return Boolean(wizard.choice.name.trim());
  if(step.key==="recap") return true;
  if(step.key==="ascendance") return wizard.choice.ascendance!==null;
  return Boolean(wizard.choice[step.key]);
}

function traitItems(list){
  return list.map(t=>`<li class="trait ${t.value<0?"trait--down":""}">${esc(t.name)} <span aria-hidden="true">${(t.value<0?"▼":"▲").repeat(Math.min(3,Math.abs(t.value)))}</span></li>`).join("");
}

function renderInfo(step,value){
  const copy=creationCopy(step.copy,value);
  if(step.key==="ascendance"&&!value) return `<aside class="wizard-info"><p>Aucune ascendance particulière.</p></aside>`;
  const traits=MercenairesCreation.traitsFor(game.referenceData,value);
  const section=(title,text,fallback)=>{
    if(text) return `<h4>${title}</h4><p>${esc(text)}</p>`;
    return fallback?`<h4>${title}</h4>${fallback}`:"";
  };
  const forces=traits.forces.length?`<ul class="trait-list">${traitItems(traits.forces)}</ul>`:"";
  const weaknesses=traits.faiblesses.length?`<ul class="trait-list">${traitItems(traits.faiblesses)}</ul>`:"";
  return `<aside class="wizard-info">
    ${section("Description",copy?.description,`<p class="wizard-placeholder">Description à venir.</p>`)}
    ${section("Force",copy?.force,forces)}
    ${section("Faiblesse",copy?.faiblesse,weaknesses)}
  </aside>`;
}

function renderFeature(step,value){
  if(value===null||value===undefined) return `<div class="wizard-feature"><p class="wizard-placeholder">Choisissez dans la liste.</p></div>`;
  const picto=step.picto?renderPicto(step.picto,value,{size:"xl"})
    :step.key==="culture"?renderPicto("people",wizard.choice.people,{size:"lg"}):"";
  return `<div class="wizard-feature">${picto}<h3>${esc(choiceLabel(step.key,value))}</h3></div>`;
}

function renderChoiceStep(step){
  const values=step.options();
  const selected=wizard.choice[step.key];
  const rows=values.length>5?Math.ceil(values.length/2):values.length;
  const list=values.map(v=>`<li><button class="wizard-option ${v===selected?"is-selected":""}" data-wizard-choice="${esc(v)}">${step.picto&&v?renderPicto(step.picto,v):""}${esc(choiceLabel(step.key,v))}</button></li>`).join("");
  return `<div class="wizard-choice">
    <ul class="wizard-list" style="grid-template-rows:repeat(${rows},auto)">${list}</ul>
    ${renderFeature(step,selected)}
    ${selected===null||selected===undefined?"<div></div>":renderInfo(step,selected)}
  </div>`;
}

function renderRecap(){
  const c=wizard.choice;
  const picto=(key,v)=>key==="people"?renderPicto("people",v):key==="ascendance"?renderPicto("ascendance",v):"";
  return `<dl class="wizard-recap">${RECAP_ROWS.map(([label,key])=>`<div><dt>${label}</dt><dd>${picto(key,c[key])}${esc(choiceLabel(key,c[key]))}</dd></div>`).join("")}</dl>`;
}

function renderWizard(){
  const step=WIZARD_STEPS[wizard.step];
  $("wizard-step-label").textContent=`Étape ${wizard.step+1} / ${WIZARD_STEPS.length}`;
  $("wizard-title").textContent=step.title;
  if(step.key==="name"){
    $("wizard-body").innerHTML=`<div class="wizard-name"><input id="wizard-name-input" maxlength="30" autocomplete="off" placeholder="Votre nom" value="${esc(wizard.choice.name)}" /></div>`;
    const input=$("wizard-name-input");
    input.addEventListener("input",()=>{ wizard.choice.name=input.value; updateWizardNav(); });
    input.addEventListener("keydown",e=>{ if(e.key==="Enter"&&stepIsComplete(step)) nextWizardStep(); });
    setTimeout(()=>input.focus(),0);
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
    const btn=event.target.closest("[data-wizard-choice]");
    if(!btn) return;
    setChoice(WIZARD_STEPS[wizard.step].key,btn.dataset.wizardChoice);
    renderWizard();
  });
}
