"use strict";

// Design Lab — onglet Images : les images attendues par le jeu, hors avatars (game-core/asset-coverage.js).
// Dit à Idan et Jean-Mimi ce qui manque et où déposer les masters (assets-src/). Recalculé à chaque visite :
// les fichiers servis par le site (pictos, décors) sont vérifiés par une requête HEAD, quatre à la fois.
const ImagesLab=(()=>{
  const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const anchor=key=>"img-"+key;
  let cache=null;

  async function exists(url){
    const target=url.startsWith("/")?url:"/"+url;
    try{
      let r=await fetch(target,{method:"HEAD",cache:"no-store"});
      if(r.status===405) r=await fetch(target,{cache:"no-store"});
      return r.ok;
    }catch{ return false; }
  }

  async function compute(onProgress){
    if(cache) return cache;
    const reference=await loadReferenceData();
    const sections=MercenairesAssetCoverage.listExpected(reference,{equipmentArt:typeof EQUIPMENT_ART!=="undefined"?EQUIPMENT_ART:new Set()});
    const pending=MercenairesAssetCoverage.pendingChecks(sections),queue=[...pending];
    let done=0;
    await Promise.all(Array.from({length:4},async()=>{
      while(queue.length){
        const item=queue.shift();
        item.present=await exists(item.url);
        onProgress(++done,pending.length);
      }
    }));
    cache={sections,summary:MercenairesAssetCoverage.summarize(sections)};
    return cache;
  }

  function badge(s){
    if(!s.missing) return '<span class="badge ok">Complet</span>';
    if(s.unplanned===s.missing) return `<span class="badge under">${s.missing} à produire</span>`;
    return `<span class="badge missing">${s.missing} manquante${s.missing>1?"s":""}</span>`;
  }

  function renderGroup(group){
    const missing=group.items.filter(i=>i.present===false),present=group.items.filter(i=>i.present===true);
    const unknown=group.items.filter(i=>i.present!==true&&i.present!==false);
    const line=i=>`<li class="${i.present?"img-ok":"img-missing"}"><strong>${html(i.name)}</strong>`
      +`${i.file?`<code>${html(i.file)}</code>`:""}${i.note?`<span>${html(i.note)}</span>`:""}</li>`;
    return `<div class="img-group"><h4>${html(group.name)} <small>${present.length} / ${group.items.length}</small></h4>`
      +(missing.length?`<ul class="img-list">${missing.map(line).join("")}</ul>`:'<p class="cov-note">Rien ne manque.</p>')
      +(unknown.length?`<p class="cov-note">${unknown.length} non vérifiée(s).</p>`:"")
      +(present.length?`<details class="img-present"><summary>${present.length} présente${present.length>1?"s":""}</summary><ul class="img-list">${present.map(line).join("")}</ul></details>`:"")
      +`</div>`;
  }

  function render(data){
    const rows=data.summary.map(s=>`<tr><td><a href="#${anchor(s.key)}" data-img="${anchor(s.key)}">${html(s.title)}</a></td>`
      +`<td class="num">${s.total}</td><td class="num">${s.missing}</td><td>${badge(s)}</td></tr>`).join("");
    return `<p class="cov-intro">Les images attendues par le jeu, <strong>hors avatars</strong> (voir l'onglet Avatars). Pour chaque famille :
      ce qui manque, et où déposer le master dans <code>assets-src/</code> (voir son README) ; JC3 en tire les versions du jeu.
      <strong>« À produire »</strong> : le jeu n'affiche pas encore d'image à cet endroit, elle sera branchée à l'arrivée des images.</p>
      <table class="cov-summary"><thead><tr><th>Famille</th><th>Attendues</th><th>Manquantes</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
      +data.sections.map(section=>{
        const s=data.summary.find(x=>x.key===section.key);
        return `<section class="cov-people" id="${anchor(section.key)}"><h3>${html(section.title)} ${badge(s)}</h3>`
          +`<p class="cov-note">Masters : <code>${html(section.master)}</code>${section.note?" — "+html(section.note):""}</p>`
          +`<div class="cov-grid">${section.groups.map(renderGroup).join("")}</div></section>`;
      }).join("");
  }

  function meta(data){
    const missing=data.summary.reduce((n,s)=>n+s.missing,0),total=data.summary.reduce((n,s)=>n+s.total,0);
    return missing+" manquantes sur "+total+" attendues";
  }

  return {compute,render,meta,anchor};
})();
