"use strict";

// Pictos des peuples et des ascendances (masters d'Idan, assets-src/Picto/, détourés par
// scripts/build-pictos.sh). Le fichier porte le « slug » du nom de référence :
// « Sang d’elfe » → assets/pictos/ascendance-sang-d-elfe.webp. Purement visuel.
const PICTO_KINDS={people:"peuple",ascendance:"ascendance"};

function pictoSlug(name){
  return String(name??"").normalize("NFD").replace(/[̀-ͯ]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}

function pictoPath(kind,name){
  const prefix=PICTO_KINDS[kind];
  const slug=pictoSlug(name);
  return prefix&&slug?`assets/pictos/${prefix}-${slug}.webp`:null;
}

// <img> prêt à insérer, ou "" sans nom (pas d'ascendance). Une image manquante se masque.
function renderPicto(kind,name,{size="sm"}={}){
  const src=pictoPath(kind,name);
  if(!src) return "";
  const label=String(name).replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  return `<img class="picto picto-${size}" src="${src}" alt="" title="${label}" loading="lazy" onerror="this.remove()">`;
}

if(typeof module!=="undefined"&&module.exports) module.exports={pictoSlug,pictoPath,renderPicto};
