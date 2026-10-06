const state={mode:"docs",docs:null,tables:null,current:null,tableRows:[],tableColumns:[]};
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function titleFromFile(file){
  return file.replace(/^\d+-/,"").replace(/\.md$/,"").replace(/-/g," ").replace(/\b\w/g,m=>m.toUpperCase());
}
function labelTable(name){return name.replace(/-/g," ").replace(/\b\w/g,m=>m.toUpperCase())}

async function init(){
  try{
    const [d,t]=await Promise.all([fetch("/docs/index.json"),fetch("/data/index.json")]);
    if(!d.ok||!t.ok)throw new Error("Manifests introuvables");
    state.docs=await d.json(); state.tables=await t.json();
    bind(); renderNav();
    const hash=location.hash.slice(1);
    if(hash==="avatars"||hash.startsWith("cov-")){setMode("avatars")}
    else if(hash.startsWith("table=")){setMode("tables");openTable(decodeURIComponent(hash.slice(6)))}
    else if(hash.startsWith("doc=")){openDoc(decodeURIComponent(hash.slice(4)))}
    else openDoc(state.docs.documents[0]?.file);
  }catch(e){showError(e)}
}
function bind(){
  document.querySelectorAll(".switch").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));
  $("nav-search").addEventListener("input",renderNav);
  $("table-search").addEventListener("input",renderTableRows);
}
function setMode(mode){
  state.mode=mode;
  document.querySelectorAll(".switch").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  $("nav-search").value=""; renderNav();
  if(mode==="docs") openDoc(state.docs.documents[0]?.file);
  else if(mode==="avatars") openAvatars();
  else openTable(state.tables.tables[0]?.file);
}
function renderNav(){
  const q=$("nav-search").value.trim().toLowerCase();
  const items=state.mode==="docs"
    ? [...state.docs.documents,...state.docs.formulas].map(x=>({id:x.file,label:titleFromFile(x.file),sub:x.file.startsWith("formulas/")?"Formule":"Document"}))
    : state.mode==="avatars"
    ? (state.coverage?.results||[]).map(r=>({id:AvatarsLab.anchor(r.people),label:r.people,sub:r.avatars+" / "+r.need+" avatars"}))
    : state.tables.tables.map(x=>({id:x.file,label:labelTable(x.name),sub:x.rows+" lignes"}));
  $("nav-list").innerHTML=items.filter(x=>(x.label+" "+x.id).toLowerCase().includes(q)).map(x=>
    `<button class="nav-item ${state.current===x.id?"active":""}" data-id="${esc(x.id)}">${esc(x.label)}<small>${esc(x.sub)}</small></button>`
  ).join("");
  $("nav-list").querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>state.mode==="docs"?openDoc(b.dataset.id):state.mode==="avatars"?scrollToPeople(b.dataset.id):openTable(b.dataset.id));
}
// Onglet Avatars : couverture des avatars par peuple (avatars-lab.js).
async function openAvatars(){
  state.mode="avatars";state.current=null;
  $("table-tools").classList.add("hidden");
  $("content-kicker").textContent="Production";
  $("content-title").textContent="Couverture des avatars";
  $("content-meta").textContent="";
  if(!location.hash.startsWith("#cov-")) location.hash="avatars";
  $("viewer").innerHTML='<p class="cov-progress">Calcul…</p>';
  try{
    const data=await AvatarsLab.compute((i,n,people)=>{ $("viewer").innerHTML=`<p class="cov-progress">Calcul : ${esc(people)} (${i+1} / ${n})…</p>`; });
    if(state.mode!=="avatars") return;
    state.coverage=data;
    $("content-meta").textContent=AvatarsLab.meta(data);
    $("viewer").innerHTML=AvatarsLab.render(data);
    $("viewer").querySelectorAll("[data-cov]").forEach(a=>a.onclick=e=>{e.preventDefault();scrollToPeople(a.dataset.cov)});
    renderNav();
    if(location.hash.startsWith("#cov-")) scrollToPeople(location.hash.slice(1));
  }catch(e){showError(e)}
}
function scrollToPeople(id){
  state.current=id;renderNav();
  document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});
}
async function openDoc(file){
  if(!file)return; state.mode="docs";state.current=file;renderNav();
  $("table-tools").classList.add("hidden");
  $("content-kicker").textContent=file.startsWith("formulas/")?"Formule":"Documentation";
  $("content-title").textContent=titleFromFile(file.split("/").pop());
  $("content-meta").textContent=file;
  $("viewer").innerHTML='<p class="muted">Chargement…</p>';
  location.hash="doc="+encodeURIComponent(file);
  try{
    const r=await fetch("/docs/"+file); if(!r.ok)throw new Error("Document introuvable");
    $("viewer").innerHTML='<article class="markdown">'+markdown(await r.text())+'</article>';
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
