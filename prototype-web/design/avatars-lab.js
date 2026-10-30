"use strict";

// Design Lab — onglet Avatars : besoin en avatars par culture (game-core/avatar-demand.js ; Idan, 2026-10-30).
// Dit à Idan et Jean-Mimi quels avatars produire ou taguer. Les parts des armes et des écoles viennent de mesures figées
// du générateur (data/reference/avatar-demand.json) ; les avatars, de Git et de Hostinger (reference-data.js →
// loadAvatarCatalog), relus à chaque visite.
const AvatarsLab=(()=>{
  const PROFILES={melee:"Corps à corps",ranged:"Distance",magic:"Magie"};
  const COLORS={
    rouge:{cls:"missing",row:"gap-high",label:"Rouge",order:0},
    orange:{cls:"under",row:"gap-mid",label:"Orange",order:1},
    vert:{cls:"ok",row:"gap-ok",label:"Vert",order:2}
  };
  const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  // Moins de 10 % : une décimale ; moins de 1 % : deux (les cases rares).
  const pct=x=>(x>=0.1?String(Math.round(x*100)):x>=0.01?String(Math.round(x*1000)/10):String(Math.round(x*10000)/100)).replace(".",",")+" %";
  const anchor=key=>"cov-"+MercenairesAvatarCatalog.slug(key);
  const ascendanceLabel=a=>a||"Sans ascendance";
  const profileLabel=p=>PROFILES[p]||p||"?";
  const frDate=d=>d?String(d).split("-").reverse().join("/"):"?";
  let cache=null;

  async function compute(onProgress){
    if(cache) return cache;
    const reference=await loadReferenceData();
    const response=await fetch("/data/avatar-demand.json",{cache:"no-cache"});
    if(!response.ok) throw new Error("Mesures du besoin en avatars introuvables (data/avatar-demand.json)");
    const model=MercenairesAvatarDemand.createDemand({reference,measures:await response.json(),catalog:reference.avatars.rows});
    const results=[];
    for(const [i,{culture}] of model.cultures.entries()){
      onProgress(i,model.cultures.length,culture);
      await new Promise(resolve=>setTimeout(resolve));
      results.push(model.forCulture(culture));
    }
    const norm=MercenairesAvatars.norm;
    const measured=new Set(results.map(r=>r.culture));
    const peoples=(reference.peoples?.rows||[]).map(r=>r.nom).map(people=>({
      people,
      cultures:results.filter(r=>r.people===people),
      own:(reference.avatars.rows||[]).filter(a=>norm(a.people)===norm(people))
    })).filter(p=>p.cultures.length||p.own.length);
    cache={model,results,peoples,avatars:reference.avatars,
      unmeasured:(reference.cultures?.rows||[]).map(c=>c.nom).filter(c=>!measured.has(c))};
    return cache;
  }

  // « Affiner les tags » (demande d'Idan, 2026-10-21) : avatars dont les tags gênent l'attribution des visages.
  // Une ligne disparaît d'elle-même quand l'avatar retagué est redéposé ; « Fait » la masque tout de suite,
  // dans ce navigateur, tant que ses problèmes restent les mêmes.
  const TAG_CHECKS=[
    {key:"tags",label:"aucun tag (profil, culture, arme…)",test:a=>!Object.keys(a.tags||{}).length},
    {key:"sex",label:"sexe manquant (F ou H)",test:a=>!a.sex},
    {key:"profile",label:"profil manquant (Corps à corps, Distance ou Magie)",test:a=>Object.keys(a.tags||{}).length&&!a.tags.profile},
    {key:"weapon",label:"arme manquante pour un profil Corps à corps ou Distance",test:a=>(a.tags?.profile||[]).some(p=>p==="melee"||p==="ranged")&&!a.tags.weapon},
    {key:"magic",label:"école de magie manquante",test:a=>(a.tags?.profile||[]).includes("magic")&&!a.tags.magic}
  ];
  const DONE_KEY="mercenaires.designlab.tagsDone";
  function readDone(){ try{ return JSON.parse(localStorage.getItem(DONE_KEY)||"{}")||{}; }catch(e){ return {}; } }
  function writeDone(done){ try{ localStorage.setItem(DONE_KEY,JSON.stringify(done)); }catch(e){} }
  function tagTodos(avatars){
    return (avatars.rows||[]).map(a=>({avatar:a,problems:TAG_CHECKS.filter(c=>c.test(a))}))
      .filter(t=>t.problems.length)
      .map(t=>({...t,signature:t.problems.map(p=>p.key).join(",")}))
      .sort((a,b)=>a.avatar.id.localeCompare(b.avatar.id));
  }
  function visibleTodos(avatars){
    const done=readDone();
    const all=tagTodos(avatars);
    return {all,shown:all.filter(t=>done[t.avatar.id]!==t.signature)};
  }
  const imageUrl=f=>String(f||"").includes("/")?f:"/assets/avatars/"+f;
  function renderTagTodos(avatars){
    const {all,shown}=visibleTodos(avatars);
    const hidden=all.length-shown.length;
    const items=shown.map(t=>`<li>
        <img src="${html(imageUrl(t.avatar.portrait))}" alt="" loading="lazy">
        <div><strong>${html(t.avatar.id)}</strong><code>media/avatars/${html(t.avatar.source||"")}</code>
          <span>${t.problems.map(p=>html(p.label)).join(" · ")}</span></div>
        <button type="button" data-tag-done="${html(t.avatar.id)}" data-signature="${html(t.signature)}">Fait</button>
      </li>`).join("");
    return `<h3>Affiner les tags <span class="badge ${shown.length?"under":"ok"}">${shown.length}</span></h3>
      <p class="cov-note">Retaguer dans Bridge, puis redéposer l'image dans <code>media/avatars/</code> : la ligne disparaît d'elle-même au prochain chargement. « Fait » la masque tout de suite, dans ce navigateur.</p>
      ${shown.length?`<ul class="tag-todo">${items}</ul>`:'<p class="muted">Rien à affiner.</p>'}
      ${hidden?`<p><button type="button" class="link-button" data-tag-reset>Réafficher ${hidden} ligne${hidden>1?"s":""} masquée${hidden>1?"s":""}</button></p>`:""}`;
  }
  // Boutons « Fait » et « Réafficher » : la section se redessine sur place.
  function bind(container,data,onChange){
    const section=container.querySelector("#cov-tags");
    if(!section) return;
    section.addEventListener("click",e=>{
      const done=e.target.closest("[data-tag-done]"), reset=e.target.closest("[data-tag-reset]");
      if(!done&&!reset) return;
      const saved=reset?{}:readDone();
      if(done) saved[done.dataset.tagDone]=done.dataset.signature;
      writeDone(saved);
      section.innerHTML=renderTagTodos(data.avatars);
      if(onChange) onChange();
    });
  }
  const tagTodoCount=data=>visibleTodos(data.avatars).shown.length;

  const badge=color=>`<span class="badge ${COLORS[color].cls}">${COLORS[color].label}</span>`;
  const cellName=c=>`${html(ascendanceLabel(c.ascendance))} · ${html(profileLabel(c.profile))} · <strong>${html(c.value||"?")}</strong>`;

  function tiles(r){
    const s=r.summary;
    return `<div class="dem-tiles">
      <div><b>${s.cells}</b><span>cases précises</span></div>
      <div><b>${s.need}</b><span>avatars précis nécessaires</span></div>
      <div><b>${r.avatars}</b><span>avatars de la culture</span></div>
      <div class="vert"><b>${s.green}</b><span>vertes</span></div>
      <div class="orange"><b>${s.orange}</b><span>orange</span></div>
      <div class="rouge"><b>${s.red}</b><span>rouges</span></div>
    </div>`;
  }

  // À produire : cases sans assez d'avatars précis, les rouges d'abord, puis les plus gros manques.
  function todoList(r){
    const todo=r.cells.filter(c=>c.assigned<c.need)
      .sort((a,b)=>COLORS[a.color].order-COLORS[b.color].order||(b.need-b.assigned)-(a.need-a.assigned)||b.p-a.p);
    if(!todo.length) return '<p class="muted">Rien à produire : toutes les cases sont vertes.</p>';
    return `<ul class="dem-todo">${todo.map(c=>`<li class="${c.color}"><b>${c.need-c.assigned}</b><span>${cellName(c)}</span><small>${c.assigned} / ${c.need}</small></li>`).join("")}</ul>`;
  }

  function cellsTable(r){
    const line=c=>`<tr class="${COLORS[c.color].row}"><td>${html(ascendanceLabel(c.ascendance))}</td><td>${html(profileLabel(c.profile))}</td><td>${html(c.value||"?")}</td>
      <td class="num">${pct(c.p)}</td><td class="num">${c.need}</td><td class="num" title="${html(c.avatars.join(", "))}">${c.assigned}</td><td>${badge(c.color)}</td></tr>`;
    return `<table><thead><tr><th>Ascendance</th><th>Profil</th><th>Arme ou école</th><th>Part</th><th>Besoin</th><th>Avatars</th><th></th></tr></thead>
      <tbody>${r.cells.map(line).join("")}</tbody></table>`;
  }

  function fallbackTable(r){
    const groups=r.groups.filter(g=>g.need>0||g.assigned>0);
    if(!groups.length) return '<p class="muted">Aucun repli nécessaire.</p>';
    const line=g=>`<tr class="${g.ok?"gap-ok":"gap-high"}"><td>${html(ascendanceLabel(g.ascendance))}</td><td>${html(profileLabel(g.profile))}</td>
      <td class="num">${pct(g.p)}</td><td class="num">${g.need}</td><td class="num" title="${html(g.avatars.join(", "))}">${g.assigned}</td>
      <td class="num">${pct(g.risk)}</td><td>${g.ok?'<span class="badge ok">Suffit</span>':`<span class="badge missing">Manque ${g.need-g.assigned}</span>`}</td></tr>`;
    return `<table><thead><tr><th>Ascendance</th><th>Profil</th><th>Part</th><th>Repli nécessaire</th><th>Avatars libres</th><th>Risque de manquer</th><th></th></tr></thead>
      <tbody>${groups.map(line).join("")}</tbody></table>
      <p class="cov-note">Les mercenaires qui débordent des cases précises, ou qui tombent dans une case trop rare, prennent un avatar resté libre
      de la même ascendance et du même profil, quelle que soit son arme.</p>`;
  }

  function cultureBlock(r){
    const s=r.summary;
    const warn=r.unmeasured.length?`<p class="cov-note"><span class="todo">Ascendances sans mesure : ${r.unmeasured.map(html).join(", ")}. Refaire les mesures.</span></p>`:"";
    return `<div class="dem-culture" id="${anchor(r.culture)}">
      <h4>${html(r.culture)}</h4>
      ${tiles(r)}
      <p class="cov-note">${s.covered} besoins sur ${s.need} couverts par un avatar précis. Pour tout passer au vert : <strong>${s.missingPrecise}</strong>
        avatar${s.missingPrecise>1?"s":""} précis à produire ; pour qu'il n'y ait plus de rouge : <strong>${s.missingFallback}</strong> avatar${s.missingFallback>1?"s":""} de profil.
        ${pct(r.rare)} des mercenaires tombent dans une case trop rare pour un avatar précis : ils passent directement au repli.</p>
      ${warn}
      <div class="cov-family"><h5>À produire</h5>${todoList(r)}</div>
      <details class="cov-family"><summary>Les ${s.cells} cases précises</summary>${cellsTable(r)}</details>
      <details class="cov-family"><summary>Repli sur le profil</summary>${fallbackTable(r)}</details>
    </div>`;
  }

  function peopleSection(p){
    const sexes=`${p.own.filter(a=>a.sex==="femme").length} F · ${p.own.filter(a=>a.sex==="homme").length} H`;
    const git=p.own.filter(a=>!String(a.full).startsWith("/")).length;
    const notes=[`${p.own.length} avatars`,`Git : ${git} · Hostinger : ${p.own.length-git}`,sexes];
    const untagged=p.own.filter(a=>!Object.keys(a.tags||{}).length).length;
    if(untagged) notes.push(`<span class="todo">${untagged} sans aucun tag : à taguer dans Bridge, puis à redéposer dans media/avatars/</span>`);
    return `<section class="cov-people" id="${anchor(p.people)}">
      <h3>${html(p.people)}</h3>
      <p class="cov-note">${notes.join(" · ")}</p>
      ${p.cultures.map(cultureBlock).join("")}
    </section>`;
  }

  function summaryTable(data){
    const rows=data.peoples.flatMap(p=>p.cultures.map(r=>`<tr>
      <td><a href="#${anchor(r.culture)}" data-cov="${anchor(r.culture)}">${html(r.culture)}</a></td><td>${html(r.people)}</td>
      <td class="num">${r.avatars}</td><td class="num">${r.summary.need}</td><td class="num">${r.summary.covered}</td>
      <td class="num v">${r.summary.green}</td><td class="num o">${r.summary.orange}</td><td class="num r">${r.summary.red}</td>
      <td class="num"><strong>${r.summary.missingPrecise}</strong></td></tr>`)).join("");
    const sum=f=>data.results.reduce((t,r)=>t+f(r),0);
    return `<div class="table-wrap cov-summary"><table>
      <thead><tr><th>Culture</th><th>Peuple</th><th>Avatars</th><th>Besoin</th><th>Couverts</th><th>Vertes</th><th>Orange</th><th>Rouges</th><th>À produire</th></tr></thead>
      <tbody>${rows}<tr class="cov-total"><td>Total</td><td></td><td></td><td class="num">${sum(r=>r.summary.need)}</td><td class="num">${sum(r=>r.summary.covered)}</td>
      <td class="num v">${sum(r=>r.summary.green)}</td><td class="num o">${sum(r=>r.summary.orange)}</td><td class="num r">${sum(r=>r.summary.red)}</td>
      <td class="num"><strong>${sum(r=>r.summary.missingPrecise)}</strong></td></tr></tbody></table></div>`;
  }

  function render(data){
    const {model,avatars}=data;
    const s=model.settings;
    const alerts=[];
    if(model.stale) alerts.push(`Les règles de génération ont changé depuis les mesures du ${frDate(model.measuredOn)} : les besoins peuvent être faux.
      JC3 doit refaire les mesures (<code>node scripts/build-avatar-demand.js</code>).`);
    if(data.unmeasured.length) alerts.push(`Cultures sans mesure : ${data.unmeasured.map(html).join(", ")}. Refaire les mesures.`);
    const warnings=avatars.warnings||[];
    return `${alerts.map(a=>`<div class="cov-alert">${a}</div>`).join("")}
      <p class="cov-intro">Pour chaque <strong>culture</strong>, le joueur voit passer <strong>${s.mercenaries} mercenaires</strong> dans une partie.
      Une <strong>case précise</strong> = culture × ascendance × arme tenue en main (ou école du mage) ; sa <strong>part</strong> vient des mesures du
      générateur (${frDate(model.measuredOn)}). Son <strong>besoin</strong> est le nombre d'avatars pour que le risque d'en manquer reste sous
      <strong>${pct(s.threshold)}</strong> sans ascendance, <strong>${pct(s.thresholdAscendance)}</strong> avec. Un avatar ne sert qu'une fois : chacun est
      compté dans une seule case.</p>
      <p class="cov-intro"><span class="badge ok">Vert</span> assez d'avatars précis · <span class="badge under">Orange</span> pas assez, mais avec le
      <strong>repli</strong> (un avatar libre de la même ascendance et du même profil) le risque de manquer reste sous ${s.fallbackFactor} × le seuil ·
      <span class="badge missing">Rouge</span> même avec le repli, ça ne suffit pas. Un avatar tagué d'une catégorie d'arme (« Armes de tir ») ne compte
      que pour le repli. Réglages dans les données : <code>avatars.demand.*</code>.</p>
      ${summaryTable(data)}
      <section class="cov-tags" id="cov-tags">${renderTagTodos(avatars)}</section>
      ${data.peoples.map(peopleSection).join("")}
      ${warnings.length?`<div class="cov-warnings"><h3>Remarques sur les avatars de Hostinger</h3><ul>${warnings.map(w=>`<li>${html(w)}</li>`).join("")}</ul></div>`:""}`;
  }

  function meta(data){
    const s=data.avatars.sources||{};
    return `${data.avatars.rows.length} avatars · Git ${s.git??"?"} · Hostinger ${s.hostinger??"?"} · mesures du ${frDate(data.model.measuredOn)}`;
  }

  return {compute,render,meta,anchor,bind,tagTodoCount,tagTodos};
})();
