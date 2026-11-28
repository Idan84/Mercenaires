"use strict";

// Les images de chaque culture qu'Idan dépose directement sur Hostinger (Idan, 2026-11-27 : « Je veux que le jeu aille
// chercher directement dedans. Si je vois que c'est trop grand, je réexporte […] dans le dossier ») :
// media/cultures/<peuple>/<culture>/<fichier>, les dossiers et les noms de fichiers dans data/reference/culture-media.json
// (Barre_haut.png, picto.png). L'index api/cultures.php dit quelles images existent et leur date : l'adresse porte cette
// date (« ?v= »), et une image remplacée sous le même nom est relue malgré le cache de 7 jours de Hostinger. Majuscules
// indifférentes. Sans index (serveur local sans PHP, tests) ou sans l'image : null, et le jeu garde la sienne.
// Purement visuel. Branché pour les barres du camp (screen-ui.js, applyHudBar) : Barre_haut.png, Barre_bas.png et
// play.png, exportés par l'Atelier des cultures (Idan, 2026-11-28) ; picto.png n'est pas encore affiché.

function cultureMediaKey(name){
  return String(name??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}

// L'adresse de l'image `kind` (barreHaut, picto…) de la culture (son nom ou sa clé), ou null si elle n'est pas déposée.
function cultureMediaResolve(table,index,culture,kind){
  const file=table?.fichiers?.[kind];
  if(!file||!Array.isArray(index?.files)) return null;
  const key=cultureMediaKey(culture);
  const row=(table.rows||[]).find(r=>r.cle===key||cultureMediaKey(r.nom)===key);
  if(!row) return null;
  const wanted=`${row.dossier}/${file}`.toLowerCase();
  const hit=index.files.find(f=>String(f.path).toLowerCase()===wanted);
  if(!hit) return null;
  const path=[...String(index.base||table.base).split("/"),...String(hit.path).split("/")].filter(Boolean).map(encodeURIComponent).join("/");
  return `/${path}${hit.v!=null?`?v=${encodeURIComponent(hit.v)}`:""}`;
}

const CULTURE_MEDIA={table:null,index:null,ready:false,listeners:[]};
function cultureMediaUrl(culture,kind){
  return cultureMediaResolve(CULTURE_MEDIA.table,CULTURE_MEDIA.index,culture,kind);
}
// Appelle fn une fois l'index lu (tout de suite s'il l'est déjà) : les écrans déjà dessinés reprennent les images d'Idan.
function onCultureMediaReady(fn){
  if(CULTURE_MEDIA.ready) fn();
  else CULTURE_MEDIA.listeners.push(fn);
}
async function loadCultureMedia(){
  const json=async url=>{
    try{
      const response=await fetch(url,{cache:"no-cache"});
      if(!response.ok||!/json/i.test(response.headers.get("content-type")||"")) return null;
      return await response.json();
    }catch{ return null; }
  };
  const [table,index]=await Promise.all([json("/data/culture-media.json"),json("/api/cultures.php")]);
  CULTURE_MEDIA.table=table;
  CULTURE_MEDIA.index=index;
  CULTURE_MEDIA.ready=true;
  for(const fn of CULTURE_MEDIA.listeners.splice(0)){
    try{ fn(); }catch(error){ console.warn("Images des cultures :",error); }
  }
}
if(typeof window!=="undefined"&&typeof fetch==="function") loadCultureMedia();

if(typeof module!=="undefined"&&module.exports) module.exports={cultureMediaKey,cultureMediaResolve};
