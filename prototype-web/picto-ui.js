"use strict";

// Pictos des peuples, des cultures et des ascendances (masters d'Idan, assets-src/Picto/, détourés par
// scripts/build-pictos.sh). Le fichier porte le « slug » du nom de référence :
// « Sang d’elfe » → assets/pictos/ascendance-sang-d-elfe.webp. Purement visuel.
// Écoles de magie (Idan, 2026-11-15) : « Feu » → assets/pictos/ecole-feu.webp.
// Le même composant pour tout le jeu, création du capitaine comprise (Idan, 2026-11-15 : « La création du capitaine
// construit ses propres images : C'est pas normal ») ; ses styles communs : pictos.css.
const PICTO_KINDS={people:"peuple",culture:"culture",ascendance:"ascendance",school:"ecole"};

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
const PICTO_LABELS={people:"Peuple",culture:"Culture",ascendance:"Ascendance",school:"École de magie"};
const PICTO_COPY={people:"peoples",culture:"cultures",ascendance:"ancestries"};
function pictoDescription(kind,name){
  const rows=(typeof game!=="undefined"&&game?.referenceData?.captainCreationCopy?.[PICTO_COPY[kind]])||[];
  return rows.find(r=>r.nom===name)?.description||"";
}

// Les gouttes d'ascendance (Idan, 2026-11-15) : « la goutte arrive toujours par opacité d'une seconde sur la goutte rubis
// puis on fait jouer en boucle le webp derrière pour faire le halo » ; le halo partout où l'on voit la goutte (« On tente
// d'utiliser le halo magique partout ou on utilise la goutte de sang ») ; la goutte sombre pour « Aucune » ascendance.
const PICTO_GOUTTE={halo:"assets/pictos/goutte-halo.webp",rubis:"assets/pictos/goutte-rubis.webp",sombre:"assets/pictos/goutte-sombre.webp"};

// Le numéro de la mise en ligne (« picto-ui.js?v=<commit> », scripts/build-site.sh), ajouté à chaque image : Hostinger et
// les navigateurs gardent une image 7 jours, et un picto remplacé sous le même nom restait l'ancien (les emblèmes des
// gouttes, 2026-11-15). Sans numéro (en local, dans les tests), l'adresse reste nue.
const PICTO_VERSION=(()=>{
  try{ return new URL(document.currentScript.src).searchParams.get("v")||""; }catch{ return ""; }
})();
const pictoUrl=path=>PICTO_VERSION?`${path}?v=${encodeURIComponent(PICTO_VERSION)}`:path;

// Le recalage optique des logos de culture qui n'ont pas la forme des autres (Idan, 2026-11-26) : les pentagones des cinq
// cultures humaines (pointe en haut, leur poids en bas) « paraissent descendre trop bas », puis remontés sans être réduits,
// « non seulement ils sont tronqués mais ils paraissent trop gros » ; le logo des Cités libres, moins haut que les autres,
// « tu peux l'étirer un peu » ; les triangles des nains (pointe en bas, leur poids en haut) : « Essaie de faire les nains
// également ». Mesuré sur la toile de 256 : chaque logo est réduit (s : 0,88 les pentagones, 0,9 les triangles), étiré en
// hauteur s'il le faut (sy : les Cités libres prennent la hauteur des autres pentagones), puis décalé (dy, en % de sa boîte,
// négatif vers le haut) pour que son centre perçu (à mi-chemin entre le milieu de sa forme et son centre de masse) tombe à
// la hauteur de celui des losanges des elfes, sans sortir de sa boîte. Les images ne changent pas (pictos.css).
const PICTO_OPTIQUE={culture:{
  "cites-libres":{s:.88,sy:1.06,dy:-3.6},
  "empire-de-la-nuit-blanche":{s:.88,dy:-3.2},
  "royaumes-du-soleil-levant":{s:.88,dy:-3},
  "terres-des-deux-fleuves":{s:.88,dy:-3.3},
  "tribus-de-la-jungle":{s:.88,dy:-3.2},
  "nains-des-montagnes":{s:.9,dy:4.8},
  "nains-du-chaos":{s:.9,dy:4},
  "nains-esclaves":{s:.9,dy:4.5}
}};
function pictoOptique(kind,name){
  const o=PICTO_OPTIQUE[kind]?.[pictoSlug(name)];
  return o?` data-picto-optique style="--picto-s:${o.s};--picto-sy:${o.sy??1};--picto-dy:${o.dy}%"`:"";
}

// Le picto prêt à insérer, ou "" sans nom (pas d'ascendance). Une image manquante se masque.
// size : xs, sm, md… (styles.css), ou null pour laisser la page le dimensionner (création du capitaine) ;
// tip : false, sans la bulle au survol ; none : true, la goutte sombre d'une ascendance absente (« Aucune »).
function renderPicto(kind,name,{size="sm",tip=true,none=false}={}){
  const attr=text=>String(text).replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  const cls="picto"+(size?" picto-"+size:"");
  if(kind==="ascendance"&&none) return `<img class="${cls} picto-goutte-sombre" src="${pictoUrl(PICTO_GOUTTE.sombre)}" alt="" loading="lazy">`;
  const path=pictoPath(kind,name);
  if(!path) return "";
  const src=pictoUrl(path);
  const data=` data-picto-kind="${kind}"`+(tip?` data-picto-name="${attr(name)}"`:"")+pictoOptique(kind,name);
  if(kind==="ascendance"){
    return `<span class="${cls} picto-goutte"${data} data-goutte="${pictoSlug(name)}">`
      +`<img class="goutte-halo" src="${pictoUrl(PICTO_GOUTTE.halo)}" alt="" loading="lazy">`
      +`<img class="goutte-rubis" src="${pictoUrl(PICTO_GOUTTE.rubis)}" alt="" loading="lazy">`
      +`<img class="goutte-embleme" src="${src}" alt="" loading="lazy" onerror="this.remove()"></span>`;
  }
  return `<img class="${cls}" src="${src}" alt=""${data} loading="lazy" onerror="this.remove()">`;
}

// Le fondu de l'emblème joue quand la goutte apparaît, pas quand le jeu redessine un écran déjà affiché : une goutte qui
// remplace, dans la même mise à jour, une goutte de la même ascendance arrive sans fondu (is-still, pictos.css).
function watchGouttes(root){
  if(typeof MutationObserver==="undefined"||!root) return;
  const gouttes=node=>node.nodeType!==1?[]:[...(node.matches(".picto-goutte")?[node]:[]),...node.querySelectorAll(".picto-goutte")];
  new MutationObserver(records=>{
    const gone=new Set();
    for(const r of records) for(const n of r.removedNodes) for(const g of gouttes(n)) gone.add(g.dataset.goutte);
    if(!gone.size) return;
    for(const r of records) for(const n of r.addedNodes) for(const g of gouttes(n)) if(gone.has(g.dataset.goutte)) g.classList.add("is-still");
  }).observe(root,{childList:true,subtree:true});
}
if(typeof document!=="undefined") watchGouttes(document.documentElement);

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
  // Tout proportionnel : la position se calcule en pixels d'écran, l'élément est mis à l'échelle (zoom) : on divise.
  const z=tip.currentCSSZoom||1;
  tip.style.left=left/z+"px";
  tip.style.top=top/z+"px";
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

if(typeof module!=="undefined"&&module.exports) module.exports={pictoSlug,pictoPath,renderPicto,pictoDescription,PICTO_GOUTTE,PICTO_OPTIQUE};
