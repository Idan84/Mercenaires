"use strict";

// Design Lab — onglet Avatars : couverture des avatars par peuple (game-core/avatar-coverage.js).
// Dit à Idan et Jean-Mimi quels avatars produire ou taguer. Recalculé à chaque visite, avec les avatars
// de Git et ceux déposés sur Hostinger (reference-data.js → loadAvatarCatalog).
const AvatarsLab=(()=>{
  const SAMPLES=300;
  const MIN_SHARE=0.03;
  const STATUS={
    "manquant":{cls:"missing",label:"Manquant",order:0},
    "sous-représenté":{cls:"under",label:"Sous-représenté",order:1},
    "juste":{cls:"tight",label:"Juste",order:2},
    "ok":{cls:"ok",label:"OK",order:3}
  };
  const FAMILY_LABELS={culture:"Cultures",profile:"Profils",weapon:"Armes (catégories)",magic:"Magie principale",ascendance:"Ascendances"};
  const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const pct=x=>Math.round(x*100)+"\u00a0%";
  const anchor=people=>"cov-"+MercenairesAvatarCatalog.slug(people);
  const seeded=seed=>()=>(seed=(seed*16807)%2147483647)/2147483647;
  let cache=null;

  async function compute(onProgress){
    if(cache) return cache;
    const reference=await loadReferenceData();
    const names=(people,id)=>people+" "+id;
    const coverage=MercenairesAvatarCoverage.createCoverage({
      reference,
      catalog:reference.avatars.rows,
      generator:MercenairesCore.createGenerator(reference,{random:seeded(20261006),nameGenerator:names}),
      maxGenerator:MercenairesCore.createGenerator(reference,{random:()=>0.9999999,nameGenerator:names}),
      samples:SAMPLES
    });
    const results=[];
    for(const [i,people] of coverage.peoples.entries()){
      onProgress(i,coverage.peoples.length,people);
      await new Promise(resolve=>setTimeout(resolve));
      results.push(coverage.forPeople(people));
    }
    results.sort((a,b)=>STATUS[a.status].order-STATUS[b.status].order||(b.need-b.avatars)-(a.need-a.avatars));
    cache={results,avatars:reference.avatars,tavernSlots:coverage.tavernSlots};
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

  const badge=status=>`<span class="badge ${STATUS[status].cls}">${STATUS[status].label}</span>`;
  const sexes=r=>`${r.femmes} F · ${r.hommes} H`+(r.sansSexe?` · ${r.sansSexe} ?`:"");

  function familyTable(rows){
    const shown=rows.filter(x=>x.share>=MIN_SHARE);
    if(!shown.length) return '<p class="muted">—</p>';
    const line=x=>{
      const cls=x.avatars>=x.target?"gap-ok":x.avatars<x.target/2?"gap-high":"gap-mid";
      return `<tr class="${cls}"><td>${html(x.value)}</td><td class="num">${pct(x.share)}</td><td class="num">${x.target}</td><td class="num">${x.avatars}</td><td class="num">${x.gap||""}</td></tr>`;
    };
    return `<table><thead><tr><th>Valeur</th><th>Part</th><th>Cible</th><th>Avatars</th><th>Manque</th></tr></thead><tbody>${shown.map(line).join("")}</tbody></table>`;
  }

  function peopleSection(r){
    const notes=[`Git : ${r.sources.git} · Hostinger : ${r.sources.hostinger}`,sexes(r)];
    if(r.sansTags) notes.push(`<span class="todo">${r.sansTags} sans aucun tag : à taguer dans Bridge, puis à redéposer dans media/avatars/</span>`);
    else if(r.sansSexe) notes.push(`<span class="todo">${r.sansSexe} sans sexe tagué</span>`);
    const families=Object.keys(FAMILY_LABELS).map(f=>`<div class="cov-family"><h4>${FAMILY_LABELS[f]}</h4>${familyTable(r.families[f])}</div>`).join("");
    return `<section class="cov-people" id="${anchor(r.people)}">
      <h3>${html(r.people)} ${badge(r.status)}</h3>
      <p class="cov-note"><strong>${r.avatars} / ${r.need}</strong> avatars · ${notes.join(" · ")}</p>
      <div class="cov-grid">${families}</div>
    </section>`;
  }

  function render(data){
    const {results,avatars,tavernSlots}=data;
    const summary=results.map(r=>`<tr>
      <td><a href="#${anchor(r.people)}" data-cov="${anchor(r.people)}">${html(r.people)}</a></td>
      <td class="num">${r.avatars}</td><td>${sexes(r)}</td><td class="num">${r.need}</td>
      <td>${badge(r.status)}</td><td class="num">${r.sansTags||""}</td></tr>`).join("");
    const warnings=avatars.warnings||[];
    return `<p class="cov-intro">Pour chaque peuple, le <strong>besoin</strong> est le nombre de visages qu'il faut en début de partie :
      la compagnie de départ la plus grande permise par le générateur, plus les ${tavernSlots} candidats de la Taverne.
      Les tableaux comparent les avatars aux mercenaires que le jeu génère vraiment (${SAMPLES} par peuple) :
      la <strong>part</strong> est la proportion de mercenaires qui ont cette valeur, la <strong>cible</strong> vaut part × besoin,
      le <strong>manque</strong> est la cible moins les avatars tagués. Un mercenaire sans avatar correspondant garde un visage
      de son peuple ; sans aucun avatar libre de son peuple, il a le portrait générique.</p>
      <div class="table-wrap cov-summary"><table>
        <thead><tr><th>Peuple</th><th>Avatars</th><th>Sexe</th><th>Besoin</th><th>Statut</th><th>Sans tags</th></tr></thead>
        <tbody>${summary}</tbody></table></div>
      <section class="cov-tags" id="cov-tags">${renderTagTodos(avatars)}</section>
      ${results.map(peopleSection).join("")}
      ${warnings.length?`<div class="cov-warnings"><h3>Remarques sur les avatars de Hostinger</h3><ul>${warnings.map(w=>`<li>${html(w)}</li>`).join("")}</ul></div>`:""}`;
  }

  function meta(data){
    const s=data.avatars.sources||{};
    return `${data.avatars.rows.length} avatars · Git ${s.git??"?"} · Hostinger ${s.hostinger??"?"}`;
  }

  return {compute,render,meta,anchor,bind,tagTodoCount,tagTodos};
})();
