"use strict";

// Pictos des peuples, des cultures et des ascendances (masters d'Idan, assets-src/Picto/, détourés par
// scripts/build-pictos.sh). Le fichier porte le « slug » du nom de référence :
// « Sang d’elfe » → assets/pictos/ascendance-sang-d-elfe.webp. Purement visuel.
const PICTO_KINDS={people:"peuple",culture:"culture",ascendance:"ascendance"};

function pictoSlug(name){
  return String(name??"").normalize("NFD").replace(/[̀-ͯ]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}

function pictoPath(kind,name){
  const prefix=PICTO_KINDS[kind];
  const slug=pictoSlug(name);
  return prefix&&slug?`assets/pictos/${prefix}-${slug}.webp`:null;
}

// Au survol (Idan, 2026-10-25) : le nom et une phrase d'explication (description de captain-creation-copy.json),
// dans une bulle du jeu plutôt que l'infobulle du navigateur.
const PICTO_LABELS={people:"Peuple",culture:"Culture",ascendance:"Ascendance"};
const PICTO_COPY={people:"peoples",culture:"cultures",ascendance:"ancestries"};
function pictoDescription(kind,name){
  const rows=(typeof game!=="undefined"&&game?.referenceData?.captainCreationCopy?.[PICTO_COPY[kind]])||[];
  return rows.find(r=>r.nom===name)?.description||"";
}

// <img> prêt à insérer, ou "" sans nom (pas d'ascendance). Une image manquante se masque.
function renderPicto(kind,name,{size="sm"}={}){
  const src=pictoPath(kind,name);
  if(!src) return "";
  const attr=text=>String(text).replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  return `<img class="picto picto-${size}" src="${src}" alt="" data-picto-kind="${kind}" data-picto-name="${attr(name)}" loading="lazy" onerror="this.remove()">`;
}

function pictoTipElement(){
  let tip=document.getElementById("picto-tip");
  if(!tip){
    tip=document.createElement("div");
    tip.id="picto-tip";
    tip.setAttribute("role","tooltip");
  }
  const host=document.querySelector("dialog[open]")||document.body;
  if(tip.parentElement!==host) host.appendChild(tip);
  return tip;
}
function showPictoTip(picto){
  const kind=picto.dataset.pictoKind,name=picto.dataset.pictoName,text=pictoDescription(kind,name);
  const tip=pictoTipElement(),esc=value=>String(value).replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  tip.innerHTML=`<small>${esc(PICTO_LABELS[kind]||"")}</small><strong>${esc(name)}</strong>${text?`<span>${esc(text)}</span>`:""}`;
  tip.classList.add("is-visible");
  const box=picto.getBoundingClientRect(),card=tip.getBoundingClientRect(),margin=8;
  const left=Math.max(margin,Math.min(box.left+box.width/2-card.width/2,innerWidth-margin-card.width));
  const top=box.top-card.height-10>=margin?box.top-card.height-10:box.bottom+10;
  tip.style.left=left+"px";
  tip.style.top=top+"px";
}
function hidePictoTip(){ document.getElementById("picto-tip")?.classList.remove("is-visible"); }
function initializePictoTips(){
  const pictoOf=event=>event.target?.closest?.(".picto[data-picto-name]");
  // Hors d'un picto, la bulle se ferme (aussi quand le picto disparaît sous la souris : changement d'onglet).
  document.addEventListener("mouseover",event=>{ const picto=pictoOf(event); if(picto) showPictoTip(picto); else hidePictoTip(); });
  document.addEventListener("mouseout",event=>{ if(pictoOf(event)) hidePictoTip(); });
  document.addEventListener("click",hidePictoTip,true);
  document.addEventListener("focusin",event=>{ const picto=pictoOf(event); if(picto) showPictoTip(picto); else hidePictoTip(); });
  document.addEventListener("scroll",hidePictoTip,true);
  document.addEventListener("close",hidePictoTip,true);
}
if(typeof document!=="undefined") initializePictoTips();

if(typeof module!=="undefined"&&module.exports) module.exports={pictoSlug,pictoPath,renderPicto,pictoDescription};
