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

  // Le catalogue des images (data/reference/images.json, Idan 2026-11-15 : « dire pourquoi et où on les utilise »,
  // « les contraintes techniques de chaque image », les alternates) : une fiche par famille d'images du jeu.
  async function loadCatalogue(){
    try{ const r=await fetch("/data/images.json",{cache:"no-store"}); return r.ok?await r.json():null; }catch{ return null; }
  }
  // L'inventaire fichier par fichier (Idan, 2026-11-16 : « voir le détail des images »), tiré des motifs du catalogue à
  // chaque mise en ligne par scripts/build-images-index.js ; absent, les cartes n'ont pas de bouton.
  async function loadFichiers(){
    try{ const r=await fetch("/data/images-fichiers.json",{cache:"no-store"}); return r.ok?await r.json():null; }catch{ return null; }
  }
  const catAnchor=key=>"img-cat-"+key;
  function renderCatalogue(cat,fichiers){
    if(!cat) return "";
    const row=(label,value)=>value?`<div class="cat-row"><dt>${html(label)}</dt><dd>${html(value)}</dd></div>`:"";
    const cards=cat.rows.map(r=>{
      const thumbs=(r.exemples||[]).map(src=>`<img src="/${html(src)}" alt="" loading="lazy" class="${r.fond_clair?"on-light":""}">`).join("");
      const files=fichiers?.familles?.[r.cle]||[];
      const voir=files.length?`<button type="button" class="cat-voir" data-cat="${html(r.cle)}">${files.length>1?`Voir les ${files.length} images`:"Voir l'image"}</button>`:"";
      return `<article class="cat-card" id="${catAnchor(r.cle)}"><header><h4>${html(r.famille)}</h4><small>${html(r.nombre)} fichier${r.nombre>1?"s":""}</small></header>`
        +(thumbs?`<div class="cat-thumbs">${thumbs}</div>`:"")+voir
        +`<dl>${row("Où",r.ou)}${row("Pourquoi",r.pourquoi)}${row("Dans le jeu",r.fichiers)}${row("Affichée",r.affichage)}`
        +`${row("À déposer",r.depot)}${row("Format du jeu",r.format_jeu)}${row("Alternates",r.alternates)}${row("Source et traitement",r.source)}</dl></article>`;
    }).join("");
    return `<section class="cov-people" id="img-catalogue"><h3>Catalogue des images</h3>`
      +`<p class="cov-intro">${html(cat.description)}</p>`
      +(cat.conventions?`<ul class="cat-rules">${cat.conventions.map(c=>`<li>${html(c)}</li>`).join("")}</ul>`:"")
      +`<div class="cat-grid">${cards}</div></section>`;
  }

  async function compute(onProgress){
    if(cache) return cache;
    const [catalogue,fichiers]=await Promise.all([loadCatalogue(),loadFichiers()]);
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
    cache={sections,summary:MercenairesAssetCoverage.summarize(sections),catalogue,fichiers};
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
    return renderCatalogue(data.catalogue,data.fichiers)+`<h3 class="cat-coverage-title">Ce qui manque</h3><p class="cov-intro">Les images attendues par le jeu, <strong>hors avatars</strong> (voir l'onglet Avatars). Pour chaque famille :
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

  function catalogueNav(data){
    return (data?.catalogue?.rows||[]).map(r=>({id:catAnchor(r.cle),label:r.famille,sub:"Catalogue · "+r.nombre+" fichier"+(r.nombre>1?"s":"")}));
  }

  // Le détail d'une famille : toutes ses images, rangées par dossier, avec leur taille réelle et leur chemin ; les
  // consignes de dépôt de la famille en tête. Un clic sur une image l'ouvre en grand dans un nouvel onglet.
  const poids=o=>o>=1048576?(o/1048576).toFixed(1).replace(".",",")+" Mo":Math.max(1,Math.round(o/1024))+" Ko";
  function familyDialog(){
    let dlg=document.getElementById("img-dlg");
    if(!dlg){
      dlg=document.createElement("dialog");dlg.id="img-dlg";dlg.className="img-dlg";
      dlg.addEventListener("click",e=>{ if(e.target===dlg||e.target.closest(".img-dlg-close")) dlg.close(); });
      document.body.append(dlg);
    }
    return dlg;
  }
  function renderFamily(row,files){
    const total=files.reduce((s,f)=>s+f.octets,0);
    const spec=(label,value)=>value?`<div class="cat-row"><dt>${html(label)}</dt><dd>${html(value)}</dd></div>`:"";
    const groups=new Map();
    for(const f of files){ const dir=f.chemin.slice(0,f.chemin.lastIndexOf("/")); if(!groups.has(dir)) groups.set(dir,[]); groups.get(dir).push(f); }
    const tile=f=>{
      const name=f.chemin.slice(f.chemin.lastIndexOf("/")+1);
      const dims=f.largeur?`${f.largeur} × ${f.hauteur} px · `:"";
      return `<figure class="img-tile" data-nom="${html(f.chemin.toLowerCase())}"><a href="/${html(f.chemin)}" target="_blank" rel="noopener">`
        +`<img src="/${html(f.chemin)}" alt="" loading="lazy"></a><figcaption><strong>${html(name)}</strong>`
        +`<span>${dims}${poids(f.octets)}</span></figcaption></figure>`;
    };
    return `<header class="img-dlg-head"><div><h3>${html(row.famille)}</h3><p>${files.length} image${files.length>1?"s":""} · ${poids(total)} au total</p></div>`
      +`<button type="button" class="img-dlg-close" aria-label="Fermer">×</button></header>`
      +`<dl class="img-dlg-specs">${spec("Affichée",row.affichage)}${spec("À déposer",row.depot)}${spec("Format du jeu",row.format_jeu)}${spec("Source et traitement",row.source)}</dl>`
      +(files.length>12?`<input type="search" class="img-dlg-filter" placeholder="Filtrer par nom ou dossier…" aria-label="Filtrer les images">`:"")
      +[...groups].map(([dir,list])=>`<section class="img-dlg-group"><h4><code>${html(dir)}/</code> <small>${list.length}</small></h4>`
        +`<div class="img-tiles">${list.map(tile).join("")}</div></section>`).join("");
  }
  function openFamily(data,cle){
    const row=data.catalogue.rows.find(r=>r.cle===cle),files=data.fichiers?.familles?.[cle]||[];
    if(!row) return;
    const dlg=familyDialog();
    dlg.innerHTML=renderFamily(row,files);
    const filter=dlg.querySelector(".img-dlg-filter");
    if(filter) filter.addEventListener("input",()=>{
      const q=filter.value.trim().toLowerCase();
      dlg.querySelectorAll(".img-tile").forEach(t=>{ t.hidden=Boolean(q)&&!t.dataset.nom.includes(q); });
      dlg.querySelectorAll(".img-dlg-group").forEach(g=>{ g.hidden=!g.querySelector(".img-tile:not([hidden])"); });
    });
    dlg.showModal();dlg.scrollTop=0;
  }
  // Les boutons « Voir les N images » des cartes (design.js l'appelle après render).
  function wire(root,data){
    root.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>openFamily(data,b.dataset.cat));
  }
  return {compute,render,meta,anchor,catalogueNav,wire,renderFamily};
})();
