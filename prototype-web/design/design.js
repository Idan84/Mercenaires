const state={mode:"docs",docs:null,tables:null,current:null,tableRows:[],tableColumns:[]};
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function titleFromFile(file){
  return file.replace(/^\d+-/,"").replace(/\.md$/,"").replace(/-/g," ").replace(/\b\w/g,m=>m.toUpperCase());
}
function labelTable(name){return name.replace(/-/g," ").replace(/\b\w/g,m=>m.toUpperCase())}
// Titre d'un document : « title » de docs/index.json s'il existe, sinon tiré du nom de fichier.
function docTitle(file){
  const entry=[...(state.docs?.documents||[]),...(state.docs?.formulas||[])].find(x=>x.file===file);
  return entry?.title||titleFromFile(file.split("/").pop());
}

async function init(){
  try{
    const [d,t]=await Promise.all([fetch("/docs/index.json"),fetch("/data/index.json")]);
    if(!d.ok||!t.ok)throw new Error("Manifests introuvables");
    state.docs=await d.json(); state.tables=await t.json();
    bind(); renderNav();
    const hash=location.hash.slice(1);
    if(hash==="avatars"||hash.startsWith("cov-")){setMode("avatars")}
    else if(hash==="images"||hash.startsWith("img-")){setMode("images")}
    else if(hash==="charte"||hash.startsWith("charte-")){setMode("charte")}
    else if(hash==="bestiary"||hash.startsWith("best-")){setMode("bestiary")}
    else if(hash==="missions"||hash.startsWith("mis-")){setMode("missions")}
    else if(hash==="cultures"||hash.startsWith("cult-")){setMode("cultures")}
    else if(hash.startsWith("table=")){setMode("tables");openTable(decodeURIComponent(hash.slice(6)))}
    else if(hash.startsWith("doc=")){openDoc(decodeURIComponent(hash.slice(4)))}
    else openDoc(state.docs.documents[0]?.file);
    // Liens internes (#doc=…, #table=…) cliqués dans un document ou dans l'en-tête.
    window.addEventListener("hashchange",()=>{
      const h=location.hash.slice(1);
      if(h.startsWith("doc=")&&decodeURIComponent(h.slice(4))!==state.current) openDoc(decodeURIComponent(h.slice(4)));
      else if(h.startsWith("table=")&&decodeURIComponent(h.slice(6))!==state.current){setMode("tables");openTable(decodeURIComponent(h.slice(6)))}
    });
  }catch(e){showError(e)}
}
function bind(){
  document.querySelectorAll(".switch[data-mode]").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));
  $("nav-search").addEventListener("input",renderNav);
  $("table-search").addEventListener("input",()=>state.mode==="bestiary"?filterBestiary():renderTableRows());
}
function setMode(mode){
  state.mode=mode;
  document.querySelectorAll(".switch[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  $("nav-search").value=""; renderNav();
  if(mode==="docs") openDoc(state.docs.documents[0]?.file);
  else if(mode==="avatars") openAvatars();
  else if(mode==="images") openImages();
  else if(mode==="charte") openLab("charte");
  else if(mode==="bestiary") openLab("bestiary");
  else if(mode==="missions") openLab("missions");
  else if(mode==="cultures") openLab("cultures");
  else openTable(state.tables.tables[0]?.file);
}
function renderNav(){
  const q=$("nav-search").value.trim().toLowerCase();
  const items=state.mode==="docs"
    ? [...state.docs.documents,...state.docs.formulas].map(x=>({id:x.file,label:docTitle(x.file),sub:x.file.startsWith("formulas/")?"Formule":"Document"}))
    : state.mode==="avatars"
    ? (state.coverage?[{id:"cov-tags",label:"Affiner les tags",sub:AvatarsLab.tagTodoCount(state.coverage)+" à faire"}]:[])
      .concat((state.coverage?.results||[]).map(r=>({id:AvatarsLab.anchor(r.culture),label:r.culture,
        sub:r.people+" · "+(r.summary.toProduce?r.summary.toProduce+" à produire":"tout vert")})))
    : state.mode==="images"
    ? ImagesLab.catalogueNav(state.images).concat((state.images?.summary||[]).map(s=>({id:ImagesLab.anchor(s.key),label:s.title,sub:s.missing?s.missing+" / "+s.total+" manquantes":"complet"})))
    : LABS[state.mode]
    ? (state[state.mode]?LABS[state.mode].module().nav(state[state.mode]):[])
    : state.tables.tables.map(x=>({id:x.file,label:labelTable(x.name),sub:x.rows+" lignes"}));
  $("nav-list").innerHTML=items.filter(x=>(x.label+" "+x.id).toLowerCase().includes(q)).map(x=>
    `<button class="nav-item ${state.current===x.id?"active":""}" data-id="${esc(x.id)}">${esc(x.label)}<small>${esc(x.sub)}</small></button>`
  ).join("");
  $("nav-list").querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>state.mode==="docs"?openDoc(b.dataset.id)
    :LABS[state.mode]?.module().open?LABS[state.mode].module().open(b.dataset.id)
    :state.mode==="avatars"||state.mode==="images"||LABS[state.mode]?scrollToPeople(b.dataset.id):openTable(b.dataset.id));
}
// Onglet Avatars : besoin en avatars par culture (avatars-lab.js).
async function openAvatars(){
  state.mode="avatars";state.current=null;
  $("table-tools").classList.add("hidden");
  $("content-kicker").textContent="Production";
  $("content-title").textContent="Besoin en avatars";
  $("content-meta").textContent="";
  if(!location.hash.startsWith("#cov-")) location.hash="avatars";
  $("viewer").innerHTML='<p class="cov-progress">Calcul…</p>';
  try{
    const data=await AvatarsLab.compute((i,n,culture)=>{ $("viewer").innerHTML=`<p class="cov-progress">Calcul : ${esc(culture)} (${i+1} / ${n})…</p>`; });
    if(state.mode!=="avatars") return;
    state.coverage=data;
    $("content-meta").textContent=AvatarsLab.meta(data);
    $("viewer").innerHTML=AvatarsLab.render(data);
    $("viewer").querySelectorAll("[data-cov]").forEach(a=>a.onclick=e=>{e.preventDefault();scrollToPeople(a.dataset.cov)});
    AvatarsLab.bind($("viewer"),data,renderNav);
    renderNav();
    if(location.hash.startsWith("#cov-")) scrollToPeople(location.hash.slice(1));
  }catch(e){showError(e)}
}
// Onglet Images : images attendues par le jeu, hors avatars (images-lab.js).
async function openImages(){
  state.mode="images";state.current=null;
  $("table-tools").classList.add("hidden");
  $("content-kicker").textContent="Production";
  $("content-title").textContent="Images manquantes";
  $("content-meta").textContent="";
  if(!location.hash.startsWith("#img-")) location.hash="images";
  $("viewer").innerHTML='<p class="cov-progress">Vérification des images…</p>';
  try{
    const data=await ImagesLab.compute((done,total)=>{ $("viewer").innerHTML=`<p class="cov-progress">Vérification des images : ${done} / ${total}…</p>`; });
    if(state.mode!=="images") return;
    state.images=data;
    $("content-meta").textContent=ImagesLab.meta(data);
    $("viewer").innerHTML=ImagesLab.render(data);
    $("viewer").querySelectorAll("[data-img]").forEach(a=>a.onclick=e=>{e.preventDefault();scrollToPeople(a.dataset.img)});
    ImagesLab.wire($("viewer"),data);
    renderNav();
    if(location.hash.startsWith("#img-")) scrollToPeople(location.hash.slice(1));
  }catch(e){showError(e)}
}
// Onglets Bestiaire et Missions (Idan, 2026-11-01) : lecture seule des ennemis et des types de mission
// (bestiary-lab.js, missions-lab.js) ; onglet Charte (2026-11-15, charte-lab.js). Le Bestiaire a sa recherche (arme, ligne, nom…).
const LABS={
  charte:{module:()=>CharteLab,prefix:"charte-",kicker:"Design",title:"Charte graphique"},
  bestiary:{module:()=>BestiaryLab,prefix:"best-",kicker:"Contenu",title:"Bestiaire",search:"Rechercher : arme, ligne, nom…"},
  missions:{module:()=>MissionsLab,prefix:"mis-",kicker:"Contenu",title:"Missions"},
  // Onglet Cultures (Idan, 2026-11-18, cultures-lab.js) : les panneaux de chaque culture réglés sur l'aperçu du jeu.
  cultures:{module:()=>CulturesLab,prefix:"cult-",kicker:"Design",title:"Cultures"}
};
async function openLab(mode){
  const lab=LABS[mode],Lab=lab.module();
  state.mode=mode;state.current=null;
  $("table-tools").classList.toggle("hidden",!lab.search);
  $("table-search").value="";$("table-search").placeholder=lab.search||"";$("table-count").textContent="";
  $("content-kicker").textContent=lab.kicker;
  $("content-title").textContent=lab.title;
  $("content-meta").textContent="";
  if(!location.hash.startsWith("#"+lab.prefix)) location.hash=mode;
  $("viewer").innerHTML='<p class="cov-progress">Chargement…</p>';
  try{
    const data=await Lab.compute();
    if(state.mode!==mode) return;
    state[mode]=data;
    $("content-meta").textContent=Lab.meta(data);
    $("viewer").innerHTML=Lab.render(data);
    renderNav();
    // Un onglet qui ouvre un élément à la fois (Cultures) : il se branche et ouvre celui de l'adresse ; les autres défilent.
    if(Lab.wire) Lab.wire($("viewer"),data,{onOpen:id=>{state.current=id;renderNav();}});
    else if(location.hash.startsWith("#"+lab.prefix)) scrollToPeople(location.hash.slice(1));
  }catch(e){showError(e)}
}
function filterBestiary(){
  const {shown,total}=BestiaryLab.filter($("viewer"),$("table-search").value);
  $("table-count").textContent=$("table-search").value.trim()?shown+" / "+total+" fiches":"";
}
function scrollToPeople(id){
  state.current=id;renderNav();
  document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});
}
async function openDoc(file){
  if(!file)return; state.mode="docs";state.current=file;renderNav();
  document.querySelectorAll(".switch[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode==="docs"));
  $("table-tools").classList.add("hidden");
  $("content-kicker").textContent=file.startsWith("formulas/")?"Formule":"Documentation";
  $("content-title").textContent=docTitle(file);
  $("content-meta").textContent=file;
  $("viewer").innerHTML='<p class="muted">Chargement…</p>';
  location.hash="doc="+encodeURIComponent(file);
  try{
    const r=await fetch("/docs/"+file); if(!r.ok)throw new Error("Document introuvable");
    $("viewer").innerHTML='<article class="markdown">'+markdown(await r.text())+'</article>';
    // Téléphone : le document est sous la liste de navigation ; on y descend quand on l'ouvre.
    if(matchMedia("(max-width:800px)").matches&&location.hash) $("content-kicker").scrollIntoView({block:"start"});
  }catch(e){showError(e)}
}
async function openTable(file){
  if(!file)return; state.mode="tables";state.current=file;renderNav();
  $("table-tools").classList.remove("hidden");$("table-search").value="";
  const meta=state.tables.tables.find(x=>x.file===file);
  $("content-kicker").textContent="Tableau de référence";
  $("content-title").textContent=labelTable(meta?.name||file.replace(".json",""));
  $("content-meta").textContent=file;
  $("viewer").innerHTML='<p class="muted">Chargement…</p>';
  location.hash="table="+encodeURIComponent(file);
  try{
    const r=await fetch("/data/"+file); if(!r.ok)throw new Error("Table introuvable");
    const data=await r.json(); state.tableRows=data.rows||[];state.tableColumns=(data.columns||[]).map(c=>c.key);
    renderTableRows();
  }catch(e){showError(e)}
}
function renderTableRows(){
  const q=$("table-search").value.trim().toLowerCase();
  const rows=state.tableRows.filter(r=>!q||Object.values(r).some(v=>String(v??"").toLowerCase().includes(q)));
  $("table-count").textContent=rows.length+" / "+state.tableRows.length+" lignes";
  const head=state.tableColumns.map(c=>"<th>"+esc(c.replace(/_/g," "))+"</th>").join("");
  const body=rows.map(r=>"<tr>"+state.tableColumns.map(c=>"<td>"+cell(r[c])+"</td>").join("")+"</tr>").join("");
  $("viewer").innerHTML='<div class="table-wrap"><table><thead><tr>'+head+'</tr></thead><tbody>'+body+"</tbody></table></div>";
}
function cell(v){
  if(v===null||v===undefined)return '<span class="null">—</span>';
  if(v===true)return '<span class="bool-true">Oui</span>';
  if(v===false)return '<span class="bool-false">Non</span>';
  if(typeof v==="number")return esc(Number.isInteger(v)?v:Math.round(v*10000)/10000);
  return esc(v);
}
function inline(s){
  s=esc(s);
  s=s.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  s=s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>');
  s=s.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");
  s=s.replace(/`([^`]+)`/g,"<code>$1</code>");
  return s;
}
function markdown(src){
  const lines=src.replace(/\r/g,"").split("\n");let out="",inCode=false,code=[],inList=false;
  const closeList=()=>{if(inList){out+="</ul>";inList=false}};
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(line.startsWith("```")){closeList();if(inCode){out+="<pre><code>"+esc(code.join("\n"))+"</code></pre>";code=[];inCode=false}else inCode=true;continue}
    if(inCode){code.push(line);continue}
    if(/^\|.+\|$/.test(line)&&i+1<lines.length&&/^\|?\s*:?-+/.test(lines[i+1])){
      closeList();const headers=line.split("|").slice(1,-1).map(x=>x.trim());i+=2;const rows=[];
      while(i<lines.length&&/^\|.+\|$/.test(lines[i])){rows.push(lines[i].split("|").slice(1,-1).map(x=>x.trim()));i++}i--;
      out+="<table><thead><tr>"+headers.map(x=>"<th>"+inline(x)+"</th>").join("")+"</tr></thead><tbody>"+rows.map(r=>"<tr>"+r.map(x=>"<td>"+inline(x)+"</td>").join("")+"</tr>").join("")+"</tbody></table>";continue
    }
    const h=line.match(/^(#{1,4})\s+(.+)$/);if(h){closeList();out+=`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;continue}
    if(/^>\s?/.test(line)){closeList();out+="<blockquote>"+inline(line.replace(/^>\s?/,""))+"</blockquote>";continue}
    if(/^[-*]\s+/.test(line)){if(!inList){out+="<ul>";inList=true}out+="<li>"+inline(line.replace(/^[-*]\s+/,""))+"</li>";continue}
    closeList();if(!line.trim())continue;out+="<p>"+inline(line)+"</p>";
  }
  closeList();if(inCode)out+="<pre><code>"+esc(code.join("\n"))+"</code></pre>";return out;
}
function showError(e){$("viewer").innerHTML='<div class="error">'+esc(e.message||e)+"</div>"}
init();
