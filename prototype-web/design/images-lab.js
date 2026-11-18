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
    if(cache){ cache.depots=await loadDepots(); return cache; }
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
    cache={sections,summary:MercenairesAssetCoverage.summarize(sections),catalogue,fichiers,depots:await loadDepots()};
    return cache;
  }

  function badge(s){
    if(!s.missing) return '<span class="badge ok">Complet</span>';
    if(s.unplanned===s.missing) return `<span class="badge under">${s.missing} à produire</span>`;
    return `<span class="badge missing">${s.missing} manquante${s.missing>1?"s":""}</span>`;
  }

  // La famille du catalogue dont un motif couvre ce chemin (même lecture que scripts/build-images-index.js et depots.php) :
  // une image attendue et absente peut alors être déposée (« nouvelle », Idan 2026-11-18).
  const braces=p=>{const m=p.match(/\{([^{}]*)\}/);return m?m[1].split(",").flatMap(x=>braces(p.slice(0,m.index)+x+p.slice(m.index+m[0].length))):[p];};
  const globRe=p=>new RegExp("^"+p.replace(/\*\*\/|\*|[.+?^${}()|[\]\\]/g,t=>t==="**/"?"(?:[^/]+/)*":t==="*"?"[^/]*":"\\"+t)+"$");
  function familyFor(catalogue,url){
    if(!url||url.startsWith("/")) return null;
    return (catalogue?.rows||[]).find(r=>(r.motifs||[]).flatMap(braces).some(m=>globRe(m).test(url)))||null;
  }
  function renderGroup(group,catalogue){
    const missing=group.items.filter(i=>i.present===false),present=group.items.filter(i=>i.present===true);
    const unknown=group.items.filter(i=>i.present!==true&&i.present!==false);
    const deposer=i=>{const row=!i.present&&i.planned!==false&&familyFor(catalogue,i.url);
      return row?`<button type="button" class="img-new" data-nouvelle="${html(i.url)}" data-famille="${html(row.cle)}">Déposer</button>`:"";};
    const line=i=>`<li class="${i.present?"img-ok":"img-missing"}"><strong>${html(i.name)}</strong>`
      +`${i.file?`<code>${html(i.file)}</code>`:""}${i.note?`<span>${html(i.note)}</span>`:""}${deposer(i)}</li>`;
    return `<div class="img-group"><h4>${html(group.name)} <small>${present.length} / ${group.items.length}</small></h4>`
      +(missing.length?`<ul class="img-list">${missing.map(line).join("")}</ul>`:'<p class="cov-note">Rien ne manque.</p>')
      +(unknown.length?`<p class="cov-note">${unknown.length} non vérifiée(s).</p>`:"")
      +(present.length?`<details class="img-present"><summary>${present.length} présente${present.length>1?"s":""}</summary><ul class="img-list">${present.map(line).join("")}</ul></details>`:"")
      +`</div>`;
  }

  function render(data){
    const rows=data.summary.map(s=>`<tr><td><a href="#${anchor(s.key)}" data-img="${anchor(s.key)}">${html(s.title)}</a></td>`
      +`<td class="num">${s.total}</td><td class="num">${s.missing}</td><td>${badge(s)}</td></tr>`).join("");
    return renderDepots(data)+renderMissing(data)+renderCatalogue(data.catalogue,data.fichiers)+`<h3 class="cat-coverage-title" id="img-detail">Détail des images attendues</h3><p class="cov-intro">Les images attendues par le jeu, <strong>hors avatars</strong> (voir l'onglet Avatars). Pour chaque famille :
      ce qui manque, et où déposer le master dans <code>assets-src/</code> (voir son README) ; JC3 en tire les versions du jeu.
      <strong>« À produire »</strong> : le jeu n'affiche pas encore d'image à cet endroit, elle sera branchée à l'arrivée des images.</p>
      <table class="cov-summary"><thead><tr><th>Famille</th><th>Attendues</th><th>Manquantes</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
      +data.sections.map(section=>{
        const s=data.summary.find(x=>x.key===section.key);
        return `<section class="cov-people" id="${anchor(section.key)}"><h3>${html(section.title)} ${badge(s)}</h3>`
          +`<p class="cov-note">Masters : <code>${html(section.master)}</code>${section.note?" — "+html(section.note):""}</p>`
          +`<div class="cov-grid">${section.groups.map(g=>renderGroup(g,data.catalogue)).join("")}</div></section>`;
      }).join("");
  }

  // Les images qui manquent vraiment (Idan, 2026-11-18 : « Il faudrait aussi que je voie les images manquantes ! ») : en
  // tête de l'onglet. Celles « à produire » (le jeu ne les affiche pas encore) restent dans le détail, en bas.
  function missingItems(data){
    return data.sections.flatMap(section=>section.groups.flatMap(g=>g.items
      .filter(i=>i.present===false&&i.planned!==false)
      .map(i=>({...i,section:section.title,group:g.name,row:familyFor(data.catalogue,i.url)}))));
  }
  function renderMissing(data){
    const items=missingItems(data);
    const later=data.summary.filter(s=>s.unplanned).map(s=>`${html(s.title)} ${s.unplanned}`).join(" · ");
    const line=i=>`<li class="img-missing"><strong>${html(i.name)}</strong>${i.file?`<code>${html(i.file)}</code>`:""}`
      +(i.group&&i.group!==i.section?`<span>${html(i.group)}</span>`:"")
      +(i.row?`<span class="img-missing-actions"><button type="button" class="img-new" data-nouvelle="${html(i.url)}" data-famille="${html(i.row.cle)}">Déposer</button>`
        +`<button type="button" class="img-new" data-prendre="${html(i.url)}" data-famille="${html(i.row.cle)}">Prendre une image du jeu</button></span>`:"")
      +`</li>`;
    return `<section class="cov-people img-manquantes" id="img-manquantes"><h3>Images manquantes <small>${items.length}</small></h3>`
      +(items.length?`<p class="cov-intro">Le jeu les attend et ne les a pas. <strong>Déposer</strong> : envoyer un fichier ; <strong>Prendre une image du jeu</strong> : lui donner une image qui existe déjà.</p>`
        +[...new Set(items.map(i=>i.section))].map(title=>{const list=items.filter(i=>i.section===title);
          return `<details class="img-missing-group"${list.length<=12?" open":""}><summary>${html(title)} <small>${list.length}</small></summary><ul class="img-list">${list.map(line).join("")}</ul></details>`;}).join("")
        :`<p class="cov-intro">Rien ne manque.</p>`)
      +(later?`<p class="cov-note">À produire plus tard (le jeu ne les affiche pas encore) : ${later}. <a href="#img-detail" data-img="img-detail">Détail en bas de page</a>.</p>`:"")
      +`</section>`;
  }

  function meta(data){
    const missing=data.summary.reduce((n,s)=>n+s.missing,0),total=data.summary.reduce((n,s)=>n+s.total,0);
    return missing+" manquantes sur "+total+" attendues";
  }

  function catalogueNav(data){
    const missing=data?.sections?missingItems(data).length:0;
    return [{id:"img-manquantes",label:"Images manquantes",sub:missing?missing+" à faire":"rien ne manque"}].concat((data?.catalogue?.rows||[]).map(r=>({id:catAnchor(r.cle),label:r.famille,sub:"Catalogue · "+r.nombre+" fichier"+(r.nombre>1?"s":"")})));
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
  const fileName=chemin=>chemin.slice(chemin.lastIndexOf("/")+1);
  function renderFamily(row,files,pending=new Set(),missing=[]){
    const total=files.reduce((s,f)=>s+f.octets,0);
    const spec=(label,value)=>value?`<div class="cat-row"><dt>${html(label)}</dt><dd>${html(value)}</dd></div>`:"";
    const groups=new Map();
    for(const f of files){ const dir=f.chemin.slice(0,f.chemin.lastIndexOf("/")); if(!groups.has(dir)) groups.set(dir,[]); groups.get(dir).push(f); }
    const tile=f=>{
      const dims=f.largeur?`${f.largeur} × ${f.hauteur} px · `:"";
      const action=(type,label)=>`<button type="button" data-depot="${type}" data-cible="${html(f.chemin)}">${label}</button>`;
      return `<figure class="img-tile" data-nom="${html(f.chemin.toLowerCase())}"><a href="/${html(f.chemin)}" target="_blank" rel="noopener">`
        +`<img src="/${html(f.chemin)}" alt="" loading="lazy"></a><figcaption><strong>${html(fileName(f.chemin))}</strong>`
        +`<span>${dims}${poids(f.octets)}</span>`
        +(pending.has(f.chemin)?`<em class="img-tile-depot">Dépôt en attente</em>`:"")
        +`<span class="img-tile-actions">${action("remplacer","Remplacer")}${row.variantes?action("variante","Variante"):""}`
        +`<button type="button" data-role="${html(f.chemin)}">Assigner un rôle</button></span>`
        +`</figcaption></figure>`;
    };
    const missingTile=i=>`<figure class="img-tile img-tile-missing" data-nom="${html(i.url.toLowerCase())}"><div class="img-tile-empty">Manquante</div>`
      +`<figcaption><strong>${html(fileName(i.url))}</strong><span>${html(i.name)}</span>`
      +(pending.has(i.url)?`<em class="img-tile-depot">Dépôt en attente</em>`:"")
      +`<span class="img-tile-actions"><button type="button" data-nouvelle="${html(i.url)}" data-famille="${html(row.cle)}">Déposer</button>`
      +`<button type="button" data-prendre="${html(i.url)}" data-famille="${html(row.cle)}">Prendre une image du jeu</button></span></figcaption></figure>`;
    return `<header class="img-dlg-head"><div><h3>${html(row.famille)}</h3><p>${files.length} image${files.length>1?"s":""} · ${poids(total)} au total</p></div>`
      +`<button type="button" class="img-dlg-close" aria-label="Fermer">×</button></header>`
      +`<dl class="img-dlg-specs">${spec("Affichée",row.affichage)}${spec("À déposer",row.depot)}${spec("Format du jeu",row.format_jeu)}${spec("Source et traitement",row.source)}</dl>`
      +(files.length>12?`<input type="search" class="img-dlg-filter" placeholder="Filtrer par nom ou dossier…" aria-label="Filtrer les images">`:"")
      +(missing.length?`<section class="img-dlg-group"><h4>Manquantes <small>${missing.length}</small></h4><div class="img-tiles">${missing.map(missingTile).join("")}</div></section>`:"")
      +[...groups].map(([dir,list])=>`<section class="img-dlg-group"><h4><code>${html(dir)}/</code> <small>${list.length}</small></h4>`
        +`<div class="img-tiles">${list.map(tile).join("")}</div></section>`).join("");
  }
  const pendingSet=data=>new Set((data.depots||[]).map(d=>d.cible));
  function openFamily(data,cle){
    const row=data.catalogue.rows.find(r=>r.cle===cle),files=data.fichiers?.familles?.[cle]||[];
    if(!row) return;
    const dlg=familyDialog();
    dlg.innerHTML=renderFamily(row,files,pendingSet(data),missingItems(data).filter(i=>i.row?.cle===cle));
    dlg.dataset.cle=cle;
    const filter=dlg.querySelector(".img-dlg-filter");
    if(filter) filter.addEventListener("input",()=>{
      const q=filter.value.trim().toLowerCase();
      dlg.querySelectorAll(".img-tile").forEach(t=>{ t.hidden=Boolean(q)&&!t.dataset.nom.includes(q); });
      dlg.querySelectorAll(".img-dlg-group").forEach(g=>{ g.hidden=!g.querySelector(".img-tile:not([hidden])"); });
    });
    dlg.querySelectorAll("[data-depot]").forEach(b=>b.onclick=()=>openDepot(data,row,files.find(f=>f.chemin===b.dataset.cible),b.dataset.depot));
    wireRoles(dlg,data);
    if(!dlg.open) dlg.showModal();
    dlg.scrollTop=0;
  }

  // Les dépôts (étape B, Idan 2026-11-16 : « Remplacer » ou « Ajouter une variante » ; JC intègre ensuite). Le fichier part
  // sur Hostinger, dans media/depots/ (design/api/depot.php) ; media/depots/index.json les liste.
  const DEPOT_URL="api/depot.php", DEPOT_MAX=30*1024*1024;
  async function loadDepots(){
    try{ const r=await fetch("/media/depots/index.json?t="+Date.now(),{cache:"no-store"}); return r.ok?((await r.json()).depots||[]):[]; }catch{ return []; }
  }
  const dateFr=iso=>new Date(iso).toLocaleString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  function renderDepots(data){
    const nom=cle=>data.catalogue?.rows.find(r=>r.cle===cle)?.famille||cle;
    const items=(data.depots||[]).map(d=>`<li class="depot-item"><a href="/${html(d.fichier)}" target="_blank" rel="noopener"><img src="/${html(d.fichier)}" alt="" loading="lazy"></a>`
      +`<div><strong>${d.type==="reutiliser"?`${html(fileName(d.source||""))} prend le rôle de`:d.type==="variante"?"Variante de":d.type==="nouvelle"?"Nouvelle image :":"Remplace"} ${html(fileName(d.cible))}</strong>`
      +`<span>${html(nom(d.famille))} · ${dateFr(d.date)}${d.largeur?` · ${d.largeur} × ${d.hauteur} px`:""} · ${poids(d.octets)}</span>`
      +(d.note?`<span class="depot-note">« ${html(d.note)} »</span>`:"")+`<em>En attente : JC l'intègre</em></div></li>`).join("");
    return `<section class="cov-people" id="img-depots"><h3>Dépôts <small>${(data.depots||[]).length}</small></h3>`
      +(items?`<p class="cov-intro">Les images déposées depuis cette page. Dis à JC « regarde les dépôts » : il les convertit au format du jeu et les met en ligne.</p><ul class="depot-list">${items}</ul>`
        :`<p class="cov-intro">Aucun dépôt en attente. Pour remplacer une image : « Voir les images » d'une famille, puis « Remplacer » sous l'image.</p>`)
      +`</section>`;
  }
  async function refreshDepots(data){
    data.depots=await loadDepots();
    const old=document.getElementById("img-depots");
    if(old){ const box=document.createElement("div");box.innerHTML=renderDepots(data);old.replaceWith(box.firstElementChild); }
    const fam=document.getElementById("img-dlg");
    if(fam?.open&&fam.dataset.cle) openFamily(data,fam.dataset.cle);
  }

  // L'image du jeu est-elle transparente ? (quelques pixels lus sur un canevas ; même site, donc lisibles)
  async function hasAlpha(src){
    try{
      const img=new Image();img.src=src;await img.decode();
      const c=document.createElement("canvas");c.width=Math.min(img.naturalWidth,64);c.height=Math.min(img.naturalHeight,64);
      const g=c.getContext("2d");g.drawImage(img,0,0,c.width,c.height);
      const px=g.getImageData(0,0,c.width,c.height).data;
      for(let i=3;i<px.length;i+=4) if(px[i]<250) return true;
      return false;
    }catch{ return false; }
  }
  // Les vérifications avant l'envoi : des avertissements (le dépôt reste possible), sauf format et poids.
  async function checkFile(file,target){
    const notes=[],svgTarget=/\.svg$/i.test(target.chemin),isSvg=/\.svg$/i.test(file.name);
    if(file.size>DEPOT_MAX) return {block:true,notes:[{bad:true,text:`Trop lourd : ${poids(file.size)} pour 30 Mo au plus.`}]};
    if(svgTarget!==isSvg) return {block:true,notes:[{bad:true,text:svgTarget?"Cette image est un SVG : dépose un fichier .svg.":"Dépose une image PNG, JPEG, WebP ou GIF."}]};
    if(isSvg) return {block:false,notes:[{text:"SVG : JC vérifie qu'il est d'une seule encre, comme les autres."}]};
    let w=0,h=0;
    try{ const bmp=await createImageBitmap(file);w=bmp.width;h=bmp.height;bmp.close(); }
    catch{ return {block:true,notes:[{bad:true,text:"Ce fichier n'est pas une image lisible."}]}; }
    if(target.largeur){
      if(w<target.largeur||h<target.hauteur) notes.push({warn:true,text:`Plus petite que l'image du jeu (${target.largeur} × ${target.hauteur} px) : elle risque d'être floue.`});
      const r1=target.largeur/target.hauteur,r2=w/h;
      if(Math.abs(r2-r1)/r1>.03) notes.push({warn:true,text:`Proportions différentes : ${r1.toFixed(2).replace(".",",")} dans le jeu, ${r2.toFixed(2).replace(".",",")} pour ton fichier. Elle sera recadrée ou déformée : à vérifier.`});
    }
    if(target.largeur&&/\.jpe?g$/i.test(file.name)&&await hasAlpha("/"+target.chemin)) notes.push({warn:true,text:"L'image du jeu est transparente et ton JPEG ne l'est pas : un fond uni à retirer ?"});
    if(!notes.length) notes.push({text:"Taille et proportions cohérentes avec l'image du jeu."});
    return {block:false,notes,w,h};
  }
  function depotDialog(){
    let dlg=document.getElementById("depot-dlg");
    if(!dlg){
      dlg=document.createElement("dialog");dlg.id="depot-dlg";dlg.className="img-dlg depot-dlg";
      dlg.addEventListener("click",e=>{ if(e.target===dlg||e.target.closest(".img-dlg-close,.depot-cancel")) dlg.close(); });
      document.body.append(dlg);
    }
    return dlg;
  }
  function openDepot(data,row,target,type){
    if(!target) return;
    const dlg=depotDialog(),svg=/\.svg$/i.test(target.chemin);
    const nouvelle=type==="nouvelle";
    dlg.innerHTML=`<form class="depot-form"><header class="img-dlg-head"><div><h3>${type==="variante"?"Ajouter une variante":nouvelle?"Nouvelle image":"Remplacer"} : ${html(fileName(target.chemin))}</h3>`
      +`<p>${html(row.famille)}</p></div><button type="button" class="img-dlg-close" aria-label="Fermer">×</button></header>`
      +`<div class="depot-compare"><figure><div class="depot-img">${nouvelle?"<span>Pas encore d'image</span>":`<img src="/${html(target.chemin)}" alt="">`}</div>`
      +`<figcaption>Dans le jeu${target.largeur?` · ${target.largeur} × ${target.hauteur} px`:""}</figcaption></figure>`
      +`<figure><label class="depot-img depot-drop" for="depot-file"><span>Glisse ton fichier ici<br>ou clique pour le choisir</span></label>`
      +`<figcaption class="depot-new-caption">Ton fichier</figcaption></figure></div>`
      +`<input type="file" id="depot-file" class="depot-file" accept="${svg?".svg,image/svg+xml":"image/png,image/jpeg,image/webp,image/gif"}">`
      +`<dl class="img-dlg-specs"><div class="cat-row"><dt>À déposer</dt><dd>${html(row.depot)}</dd></div></dl>`
      +`<ul class="depot-checks"></ul>`
      +`<label class="depot-note-field" for="depot-note">Note pour JC (facultatif)<textarea id="depot-note" maxlength="500" rows="2" placeholder="Ce qui change, ce qu'il faut savoir…"></textarea></label>`
      +`<p class="depot-status" role="status"></p>`
      +`<div class="depot-actions"><button type="button" class="depot-cancel">Annuler</button><button type="submit" class="depot-send" disabled>Envoyer</button></div></form>`;
    const input=dlg.querySelector(".depot-file"),drop=dlg.querySelector(".depot-drop"),send=dlg.querySelector(".depot-send");
    const status=dlg.querySelector(".depot-status");
    let chosen=null;
    const choose=async file=>{
      if(!file) return;
      chosen=null;send.disabled=true;status.textContent="";
      drop.innerHTML=`<img src="${URL.createObjectURL(file)}" alt="">`;
      const res=await checkFile(file,target);
      dlg.querySelector(".depot-new-caption").textContent=`${file.name}${res.w?` · ${res.w} × ${res.h} px`:""} · ${poids(file.size)}`;
      dlg.querySelector(".depot-checks").innerHTML=res.notes.map(n=>`<li class="${n.bad?"bad":n.warn?"warn":"ok"}">${html(n.text)}</li>`).join("");
      if(!res.block){ chosen=file;send.disabled=false; }
    };
    input.onchange=()=>choose(input.files[0]);
    drop.addEventListener("dragover",e=>{e.preventDefault();drop.classList.add("is-over");});
    drop.addEventListener("dragleave",()=>drop.classList.remove("is-over"));
    drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("is-over");choose(e.dataTransfer.files[0]);});
    dlg.querySelector(".depot-form").onsubmit=async e=>{
      e.preventDefault();
      if(!chosen) return;
      send.disabled=true;status.className="depot-status";status.textContent="Envoi…";
      const body=new FormData();
      body.append("famille",row.cle);body.append("cible",target.chemin);body.append("type",type);
      body.append("note",dlg.querySelector("#depot-note").value);body.append("fichier",chosen,chosen.name);
      try{
        const r=await fetch(DEPOT_URL,{method:"POST",body,headers:{"X-Depot":"1"},credentials:"same-origin"});
        const res=await r.json().catch(()=>({ok:false,erreur:`Le serveur a répondu ${r.status}.`}));
        if(!res.ok) throw new Error(res.erreur||`Erreur ${r.status}.`);
        status.className="depot-status ok";status.textContent="Déposé. En attente : dis à JC « regarde les dépôts ».";
        await refreshDepots(data);
      }catch(err){
        status.className="depot-status bad";status.textContent="Dépôt impossible : "+err.message;send.disabled=false;
      }
    };
    dlg.showModal();
  }

  // Les boutons « Voir les N images » des cartes (design.js l'appelle après render).
  function wire(root,data){
    root.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>openFamily(data,b.dataset.cat));
    wireRoles(root,data);
  }
  // Déposer une image manquante, en prendre une du jeu, ou donner un rôle à une image (boutons des listes et du détail).
  function wireRoles(root,data){
    const rowOf=cle=>data.catalogue?.rows.find(r=>r.cle===cle);
    root.querySelectorAll("[data-nouvelle]").forEach(b=>b.onclick=()=>{
      const row=rowOf(b.dataset.famille);
      if(row) openDepot(data,row,{chemin:b.dataset.nouvelle},"nouvelle");
    });
    root.querySelectorAll("[data-prendre]").forEach(b=>b.onclick=()=>openRole(data,{cible:b.dataset.prendre,cle:b.dataset.famille}));
    root.querySelectorAll("[data-role]").forEach(b=>b.onclick=()=>openRole(data,{source:b.dataset.role}));
  }

  // Donner un rôle (Idan, 2026-11-18 : « sélectionner une image qui existe déjà et lui assigner un rôle ») : une image du
  // jeu prend la place d'une autre, ou d'une image manquante. Rien ne change dans le jeu tout de suite : la demande part
  // sur Hostinger (type « reutiliser », sans fichier) et JC l'intègre, comme un dépôt.
  function roleSlots(data){
    const files=(data.catalogue?.rows||[]).flatMap(r=>(data.fichiers?.familles?.[r.cle]||[]).map(f=>({...f,cle:r.cle,famille:r.famille})));
    const missing=missingItems(data).filter(i=>i.row).map(i=>({chemin:i.url,cle:i.row.cle,famille:i.row.famille,missing:true,name:i.name}));
    return {files,missing};
  }
  function roleDialog(){
    let dlg=document.getElementById("role-dlg");
    if(!dlg){
      dlg=document.createElement("dialog");dlg.id="role-dlg";dlg.className="img-dlg depot-dlg role-dlg";
      dlg.addEventListener("click",e=>{ if(e.target===dlg||e.target.closest(".img-dlg-close,.depot-cancel")) dlg.close(); });
      document.body.append(dlg);
    }
    return dlg;
  }
  function openRole(data,{source=null,cible=null,cle=null}){
    const {files,missing}=roleSlots(data);
    // On choisit ce qui manque : le rôle (depuis une image) ou l'image (depuis un rôle).
    const choosing=source?"cible":"source";
    const pool=choosing==="cible"?[...missing,...files.filter(f=>f.chemin!==source)]:files.filter(f=>f.chemin!==cible);
    const families=[...new Map(pool.map(f=>[f.cle,f.famille])).entries()];
    const picked={source,cible,cle:cle||null};
    const dlg=roleDialog();
    const thumb=(chemin,isMissing)=>`<div class="depot-img">${isMissing||!chemin?`<span>${chemin?"Pas encore d'image":"À choisir"}</span>`:`<img src="/${html(chemin)}" alt="">`}</div>`;
    dlg.innerHTML=`<form class="depot-form"><header class="img-dlg-head"><div><h3>${choosing==="cible"?"Assigner un rôle":"Prendre une image du jeu"}</h3>`
      +`<p>${choosing==="cible"?`À quelle place mettre ${html(fileName(source))} ?`:`Quelle image du jeu pour ${html(fileName(cible))} ?`}</p></div>`
      +`<button type="button" class="img-dlg-close" aria-label="Fermer">×</button></header>`
      +`<div class="depot-compare"><figure class="role-src">${thumb(source,false)}<figcaption>L'image : <strong class="role-src-name">${source?html(fileName(source)):"à choisir"}</strong></figcaption></figure>`
      +`<figure class="role-dst">${thumb(cible,missing.some(m=>m.chemin===cible))}<figcaption>Son rôle : <strong class="role-dst-name">${cible?html(fileName(cible)):"à choisir"}</strong></figcaption></figure></div>`
      +`<div class="role-filters"><select class="role-family" aria-label="Famille"><option value="">Toutes les familles</option>`
      +(choosing==="cible"&&missing.length?`<option value="*manquantes">Images manquantes</option>`:"")
      +families.map(([k,n])=>`<option value="${html(k)}">${html(n)}</option>`).join("")+`</select>`
      +`<input type="search" class="role-search" placeholder="Chercher un nom ou un dossier…" aria-label="Chercher"></div>`
      +`<div class="img-tiles role-tiles"></div><p class="cov-note role-more"></p>`
      +`<label class="depot-note-field" for="role-note">Note pour JC (facultatif)<textarea id="role-note" maxlength="500" rows="2" placeholder="Ce qu'il faut savoir…"></textarea></label>`
      +`<p class="depot-status" role="status"></p>`
      +`<div class="depot-actions"><button type="button" class="depot-cancel">Annuler</button><button type="submit" class="depot-send" disabled>Envoyer</button></div></form>`;
    const tiles=dlg.querySelector(".role-tiles"),family=dlg.querySelector(".role-family"),search=dlg.querySelector(".role-search");
    const send=dlg.querySelector(".depot-send"),status=dlg.querySelector(".depot-status"),more=dlg.querySelector(".role-more");
    const LIMIT=120;
    const draw=()=>{
      const q=search.value.trim().toLowerCase(),fam=family.value;
      const list=pool.filter(f=>(!fam||(fam==="*manquantes"?f.missing:f.cle===fam))&&(!q||(f.chemin+" "+(f.name||"")+" "+f.famille).toLowerCase().includes(q)));
      const current=choosing==="cible"?picked.cible:picked.source;
      tiles.innerHTML=list.slice(0,LIMIT).map(f=>`<button type="button" class="img-tile role-tile${f.chemin===current?" is-picked":""}" data-chemin="${html(f.chemin)}" data-cle="${html(f.cle)}">`
        +(f.missing?`<div class="img-tile-empty">Manquante</div>`:`<span class="role-tile-img"><img src="/${html(f.chemin)}" alt="" loading="lazy"></span>`)
        +`<span class="role-tile-cap"><strong>${html(fileName(f.chemin))}</strong><small>${html(f.name||f.famille)}</small></span></button>`).join("");
      more.textContent=list.length>LIMIT?`${LIMIT} images affichées sur ${list.length} : précise la recherche ou la famille.`:list.length?"":"Aucune image ne correspond.";
      tiles.querySelectorAll(".role-tile").forEach(t=>t.onclick=()=>{
        if(choosing==="cible"){ picked.cible=t.dataset.chemin;picked.cle=t.dataset.cle; }
        else picked.source=t.dataset.chemin;
        const isMissing=missing.some(m=>m.chemin===picked.cible);
        dlg.querySelector(".role-src .depot-img").outerHTML=thumb(picked.source,false);
        dlg.querySelector(".role-dst .depot-img").outerHTML=thumb(picked.cible,isMissing);
        dlg.querySelector(".role-src-name").textContent=fileName(picked.source);
        dlg.querySelector(".role-dst-name").textContent=fileName(picked.cible);
        tiles.querySelectorAll(".is-picked").forEach(x=>x.classList.remove("is-picked"));t.classList.add("is-picked");
        send.disabled=!(picked.source&&picked.cible&&picked.cle);status.textContent="";
      });
    };
    family.onchange=draw;search.oninput=draw;
    if(choosing==="source"&&cle) family.value=families.some(([k])=>k===cle)?cle:"";
    draw();
    dlg.querySelector(".depot-form").onsubmit=async e=>{
      e.preventDefault();
      if(!(picked.source&&picked.cible&&picked.cle)) return;
      send.disabled=true;status.className="depot-status";status.textContent="Envoi…";
      const body=new FormData();
      body.append("famille",picked.cle);body.append("cible",picked.cible);body.append("type","reutiliser");
      body.append("source",picked.source);body.append("note",dlg.querySelector("#role-note").value);
      try{
        const r=await fetch(DEPOT_URL,{method:"POST",body,headers:{"X-Depot":"1"},credentials:"same-origin"});
        const res=await r.json().catch(()=>({ok:false,erreur:`Le serveur a répondu ${r.status}.`}));
        if(!res.ok) throw new Error(res.erreur||`Erreur ${r.status}.`);
        status.className="depot-status ok";status.textContent="Envoyé. En attente : dis à JC « regarde les dépôts ».";
        await refreshDepots(data);
      }catch(err){
        status.className="depot-status bad";status.textContent="Envoi impossible : "+err.message;send.disabled=false;
      }
    };
    dlg.showModal();
  }

  return {compute,render,meta,anchor,catalogueNav,wire,renderFamily,renderDepots};
})();
