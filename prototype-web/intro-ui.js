"use strict";

// Introduction puis création du capitaine.
// « Nouvelle partie » → le capitaine mourant (image, texte et voix d'Idan) → « Vous n'êtes pas Bob ? » → la création du
// capitaine (Idan, 2026-11-12/13) : treize écrans chez Cruxor Limortel, dans une page à part (creation-capitaine.html)
// ouverte en plein écran dans #creation-wizard. Cette page lit les données du jeu et rend ses réponses par
// window.captainCreationBridge ; le jeu remplit alors le formulaire de création existant (#captain-*) et le valide :
// la génération reste celle du moteur (createCaptainFromForm, avec les choix du joueur : game-core/creation.js).
// Après la création, le thème « Blood & Wages » accompagne l'arrivée au camp (Idan) : music-ui.js.

const INTRO_VOICE_SRC="assets/audio/intro-voix.mp3";
const INTRO_FALLBACK_SECONDS=56;

const introState={voice:null,timers:[]};

// --- Introduction -----------------------------------------------------------------------------

function introParagraphs(){ return [...document.querySelectorAll("#intro-text p")]; }

function stopIntroVoice(){
  for(const t of introState.timers) clearTimeout(t);
  introState.timers=[];
  if(introState.voice){ introState.voice.pause(); introState.voice=null; }
  playCreationVoice(null);
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
  for(const t of introState.timers) clearTimeout(t);
  const paragraphs=introParagraphs();
  const lengths=paragraphs.map(p=>p.textContent.length);
  const total=lengths.reduce((a,b)=>a+b,0)||1;
  let elapsed=0;
  introState.timers=paragraphs.map((p,i)=>{
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
  introState.voice=voice;
  voice.addEventListener("loadedmetadata",()=>{ if(introState.voice===voice&&Number.isFinite(voice.duration)) scheduleIntro(voice.duration); },{once:true});
  voice.play().catch(()=>{});
}

// --- Création du capitaine ------------------------------------------------------------------------

// Les réponses du joueur, le temps que le jeu crée le capitaine (generation.js, createCaptainFromForm ; ui.js).
const captainCreation={result:null};
let creationVoice=null;
function playCreationVoice(src){
  if(creationVoice){ creationVoice.pause(); creationVoice=null; }
  if(!src) return;
  creationVoice=new Audio(src);
  creationVoice.play().catch(()=>{});
}

// Les données de la page de création : peuples, cultures, origines, ascendances (générateur), textes
// (captain-creation-copy.json), armes (sans les boucliers : Idan, 2026-11-12), alignement usuel (game-core/creation.js).
function weaponFamily(row){ return String(row?.domaine||"").split(",")[0].trim(); }
function captainCreationData(){
  const ref=game.referenceData||{},copy=ref.captainCreationCopy||{};
  const texts=(section,name)=>{ const r=(copy[section]||[]).find(x=>x.nom===name); return r?{d:r.description,f:r.force,w:r.faiblesse}:{}; };
  const bySection=section=>Object.fromEntries((copy[section]||[]).map(r=>[r.nom,texts(section,r.nom)]));
  return {
    peoples:peopleNames().map(people=>({nom:people,copy:texts("peoples",people),
      ascendances:compatibleAscendances(people),
      cultures:culturesForPeople(people).map(culture=>({nom:culture,copy:texts("cultures",culture),
        origins:originsForCulture(culture),alignment:MercenairesCreation.usualAlignment(ref,people,culture)}))})),
    weapons:(ref.weapons?.rows||[]).map(w=>({nom:w.nom,famille:weaponFamily(w)})).filter(w=>w.famille&&w.famille!=="Boucliers"),
    grid:ref.alignmentGeneration?.grid||[],
    originCopy:bySection("origins"),ancestryCopy:bySection("ancestries"),alignmentCopy:bySection("alignments"),
    outfits:copy.outfits||[],spirits:copy.spirits||[],characters:copy.characters||[]
  };
}

// Les 12 portraits les plus proches pour un sexe (game-core/avatars.js, captainPortraitsRanked).
function captainCreationPortraits({people,culture,ascendance=null,sex="M",weapon=null,spirit=null}={}){
  const ref=game.referenceData||{},weapons=ref.weapons?.rows||[];
  const family=weaponFamily(weapons.find(w=>w.nom===weapon));
  const answer=(ref.captainCreationCopy?.spirits||[])[spirit];
  const list=MercenairesAvatars.captainPortraitsRanked(ref.avatars?.rows||[],{people,culture,ascendance,
    sex:sex==="F"?"femme":"homme",weapon,weaponFamily:family?weapons.filter(w=>weaponFamily(w)===family).map(w=>w.nom):[],
    school:answer?.ecole||null,noMagic:Boolean(answer&&!answer.ecole),ranged:["Armes de tir","Armes à feu"].includes(family)});
  return list.map(a=>({id:a.id,portrait:mercenaryAvatarUrl({avatar:a},"portrait"),full:mercenaryAvatarUrl({avatar:a},"full")}));
}

// Signé : le formulaire de création existant reçoit l'identité, le jeu crée le capitaine (avec les autres réponses) et
// lance la partie. Faux si la partie n'a pas commencé (une sauvegarde que le joueur garde).
function finishCaptainCreation(result){
  captainCreation.result=result;
  $("captain-name").value=[result.prenom,result.nom].filter(Boolean).join(" ");
  $("captain-people").value=result.people;
  updateCultureSelect();
  $("captain-culture").value=result.culture;
  updateOriginSelect();
  $("captain-origin").value=result.origin;
  $("captain-ascendance").value=result.ascendance||"";
  $("captain-alignment").value=result.alignment;
  $("create-game-btn").click();
  captainCreation.result=null;
  if(!game.campaign) return false;
  closeCreation();
  $("intro-panel").classList.add("hidden");
  return true;
}

window.captainCreationBridge={
  data:captainCreationData,
  portraits:captainCreationPortraits,
  voice:playCreationVoice,
  finish:finishCaptainCreation,
  exit:()=>backToMenu()
};

function openWizard(){
  stopIntroVoice();
  revealAllParagraphs();
  const host=$("creation-wizard");
  host.innerHTML=`<iframe class="creation-frame" src="creation-capitaine.html" title="Création du capitaine"></iframe>`;
  host.classList.remove("hidden");
  host.querySelector("iframe").addEventListener("load",e=>e.target.focus(),{once:true});
}
function closeCreation(){
  playCreationVoice(null);
  const host=$("creation-wizard");
  host.classList.add("hidden");
  host.innerHTML="";
}

// interactive:false : roue en lecture seule (fiche du mercenaire), sans boutons ni focus.
function renderAlignmentWheel(values,selected,{interactive=true}={}){
  const act=(value)=>interactive?` data-wizard-choice="${esc(value)}" tabindex="0" role="button" aria-label="${esc(value)}" aria-pressed="${selected===value}"`:"";
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
    return `<g class="alignment-sector ${selected===value?"is-selected":""}"${act(value)}>
      <path d="${p}"></path><text x="${label[0]}" y="${label[1]-6}" text-anchor="middle"><tspan x="${label[0]}" dy="0">${esc(words[0])}</tspan><tspan x="${label[0]}" dy="15">${esc(words.slice(1).join(" "))}</tspan></text>
    </g>`;
  }).join("");
  const neutral=values.includes("Neutre")?`<g class="alignment-sector alignment-center ${selected==="Neutre"?"is-selected":""}"${act("Neutre")}><circle cx="180" cy="180" r="51"></circle><text x="180" y="184" text-anchor="middle">Neutre</text></g>`:"";
  const svgLabel=interactive?'aria-label="Roue interactive des alignements" role="group"':`aria-label="Alignement : ${esc(selected||"inconnu")}" role="img"`;
  return `<div class="alignment-wheel-wrap${interactive?"":" alignment-wheel-wrap--static"}"><div class="alignment-axis alignment-axis-top">BON</div><div class="alignment-axis alignment-axis-left">CHAOTIQUE</div>
  <svg class="alignment-wheel" viewBox="0 0 360 360" ${svgLabel}>${items}${neutral}</svg>
  <div class="alignment-axis alignment-axis-right">LOYAL</div><div class="alignment-axis alignment-axis-bottom">MAUVAIS</div></div>`;
}

function initializeIntroUi(){
  $("intro-text").addEventListener("click",revealNextParagraph);
  $("intro-skip-btn").addEventListener("click",revealAllParagraphs);
  $("not-bob-btn").addEventListener("click",openWizard);
  $("intro-exit-btn").addEventListener("click",backToMenu);
}
