"use strict";

// Design Lab — onglet Avatars : couverture des avatars par peuple (game-core/avatar-coverage.js).
// Dit à Idan et Jean-Mimi quels avatars produire ou taguer. Recalculé à chaque visite, avec les avatars
// de Git et ceux déposés sur Hostinger (reference-data.js → loadAvatarCatalog).
const AvatarsLab=(()=>{
  const SAMPLES=500;
  // Tout est croisé par culture (Idan, 2026-10-27 : la culture étant obligatoire, les tableaux globaux sont inutiles).
  // Combinaisons : celles qui pèsent au moins 0,5 % des mercenaires du peuple (Idan, 2026-10-27), rangées par culture.
  const COMBINATION_MIN=0.005;
  const STATUS={
    "manquant":{cls:"missing",label:"Manquant",order:0},
    "sous-représenté":{cls:"under",label:"Sous-représenté",order:1},
    "juste":{cls:"tight",label:"Juste",order:2},
    "ok":{cls:"ok",label:"OK",order:3}
  };
  const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  // Moins de 10 % : une décimale (les ascendances rares).
  const pct=x=>(x<0.1?String(Math.round(x*1000)/10).replace(".",","):Math.round(x*100))+"\u00a0%";
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
      samples:SAMPLES
    });
    const results=[];
    for(const [i,people] of coverage.peoples.entries()){
      onProgress(i,coverage.peoples.length,people);
      await new Promise(resolve=>setTimeout(resolve));
      results.push(coverage.forPeople(people));
    }
    results.sort((a,b)=>STATUS[a.status].order-STATUS[b.status].order||(b.need-b.avatars)-(a.need-a.avatars));
    cache={results,avatars:reference.avatars,need:coverage.need};
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

  const gapClass=x=>x.avatars>=x.target?"gap-ok":x.avatars<x.target/2?"gap-high":"gap-mid";

  // Croisement (Idan, 2026-10-25 : « il faut que je croise ») : par culture, profil · arme tenue en main ou école du mage,
  // celles qui pèsent au moins COMBINATION_MIN. Les avatars comptés ont la culture, le profil et l'arme ou l'école.
  function combinationsTable(r){
    const all=r.combinations||[];
    if(!all.length) return '<p class="muted">—</p>';
    const shown=all.filter(x=>x.share>=COMBINATION_MIN);
    const rest=all.filter(x=>x.share<COMBINATION_MIN);
    const line=x=>`<tr class="${gapClass(x)}"><td>${html(x.profile)}</td><td>${html(x.value||"—")}</td><td class="num">${pct(x.share)}</td><td class="num">${x.target}</td><td class="num">${x.avatars}</td><td class="num">${x.gap||""}</td></tr>`;
    const groups=(r.cultureProfiles||[]).map(c=>{
      const rows=shown.filter(x=>x.culture===c.culture).sort((a,b)=>b.share-a.share);
      return rows.length?`<tr class="cov-group"><th colspan="6">${html(c.culture)} <small>${pct(c.share)}</small></th></tr>${rows.map(line).join("")}`:"";
    }).join("");
    return `<table><thead><tr><th>Profil</th><th>Arme ou école</th><th>Part</th><th>Cible</th><th>Avatars</th><th>Manque</th></tr></thead><tbody>${groups}</tbody></table>
      <p class="cov-note">Combinaisons d'au moins ${pct(COMBINATION_MIN)} des mercenaires, rangées par culture.${rest.length?` ${rest.length} plus rares (${pct(rest.reduce((t,x)=>t+x.share,0))} des mercenaires) ne sont pas listées.`:""} Un avatar compte s'il a la culture, le profil et l'arme qu'il tient (ou sa catégorie), ou l'école du mage.</p>`;
  }
  // Ascendances × cultures (Idan, 2026-10-26) : chaque case donne avatars / cible ; la couleur dit le manque.
  function ascendanceCultureTable(r){
    const x=r.ascendanceCultures;
    if(!x||!x.cultures.length) return '<p class="muted">—</p>';
    const cls=c=>c.avatars>=c.target?"gap-ok":c.avatars<c.target/2?"gap-high":"gap-mid";
    const cell=c=>`<td class="num ${c.target||c.avatars?cls(c):""}" title="${html(pct(c.share))} des mercenaires · cible ${c.target} · ${c.avatars} avatar${c.avatars>1?"s":""}">${c.target||c.avatars?`${c.avatars}\u00a0/\u00a0${c.target}`:"—"}</td>`;
    const head=x.cultures.map(c=>`<th>${html(c.culture)}<small>${pct(c.share)}</small></th>`).join("");
    const rows=x.rows.map(row=>`<tr><td>${html(row.ascendance)}<small>${pct(row.share)}</small></td>${row.cells.map(cell).join("")}</tr>`).join("");
    return `<div class="table-wrap"><table class="cov-matrix"><thead><tr><th>Ascendance</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
      <p class="cov-note">Chaque case : avatars possibles / cible (au moins 1 : sans avatar de sa culture et de son ascendance, le mercenaire a le portrait générique). Une ascendance généraliste compte aussi pour « Aucune » ; « Ascendance only » non.</p>`;
  }
  // Profils par culture : chaque case donne avatars / cible ; la part dans la culture est au survol.
  function cultureProfilesTable(r){
    const rows=r.cultureProfiles||[];
    if(!rows.length) return '<p class="muted">—</p>';
    const labels=rows[0].cells.map(c=>c.profile);
    const cell=(c,within)=>`<td class="num ${c.target||c.avatars?gapClass(c):""}" title="${html(pct(within))} de la culture · ${html(pct(c.share))} des mercenaires · cible ${c.target} · ${c.avatars} avatar${c.avatars>1?"s":""}">${c.target||c.avatars?`${c.avatars}\u00a0/\u00a0${c.target}`:"—"}</td>`;
    return `<table class="cov-matrix"><thead><tr><th>Culture</th>${labels.map(l=>`<th>${html(l)}</th>`).join("")}</tr></thead><tbody>${rows.map(c=>
      `<tr><td>${html(c.culture)}<small>${pct(c.share)}</small></td>${c.cells.map(x=>cell(x,c.profiles[x.profile])).join("")}</tr>`).join("")}</tbody></table>
      <p class="cov-note">Chaque case : avatars de cette culture et de ce profil / cible.</p>`;
  }

  function peopleSection(r){
    const notes=[`Git : ${r.sources.git} · Hostinger : ${r.sources.hostinger}`,sexes(r)];
    // Culture et ascendance obligatoires (Idan, 2026-10-25) : sans avatar de sa culture et de son ascendance, portrait générique.
    if(r.withoutAvatar>0) notes.push(`<span class="todo">${pct(r.withoutAvatar)} des mercenaires n'ont aucun avatar de leur culture et de leur ascendance : portrait générique</span>`);
    if(r.sansTags) notes.push(`<span class="todo">${r.sansTags} sans aucun tag : à taguer dans Bridge, puis à redéposer dans media/avatars/</span>`);
    else if(r.sansSexe) notes.push(`<span class="todo">${r.sansSexe} sans sexe tagué</span>`);
    return `<section class="cov-people" id="${anchor(r.people)}">
      <h3>${html(r.people)} ${badge(r.status)}</h3>
      <p class="cov-note"><strong>${r.avatars} / ${r.need}</strong> avatars · ${notes.join(" · ")}</p>
      <div class="cov-grid cov-cross">
        <div class="cov-family"><h4>Combinaisons à produire, par culture</h4>${combinationsTable(r)}</div>
        <div class="cov-family"><h4>Profils par culture</h4>${cultureProfilesTable(r)}</div>
      </div>
      <div class="cov-family cov-asc"><h4>Ascendances × cultures</h4>${ascendanceCultureTable(r)}</div>
    </section>`;
  }

  function render(data){
    const {results,avatars,need}=data;
    const summary=results.map(r=>`<tr>
      <td><a href="#${anchor(r.people)}" data-cov="${anchor(r.people)}">${html(r.people)}</a></td>
      <td class="num">${r.avatars}</td><td>${sexes(r)}</td><td class="num">${r.need}</td>
      <td>${badge(r.status)}</td><td class="num">${r.sansTags||""}</td></tr>`).join("");
    const warnings=avatars.warnings||[];
    return `<p class="cov-intro">Pour chaque peuple, le <strong>besoin</strong> est le nombre d'avatars visé : ${need}, le même pour tous
      les peuples (constante <code>avatars.coverage.need</code>, dans les données).
      Les tableaux comparent les avatars aux mercenaires que le jeu génère vraiment (${SAMPLES} par peuple) :
      la <strong>part</strong> est la proportion de mercenaires qui ont cette valeur, la <strong>cible</strong> vaut part × besoin,
      le <strong>manque</strong> est la cible moins les avatars tagués. Un mercenaire sans avatar correspondant garde un visage
      de son peuple ; sans aucun avatar libre de son peuple, il a le portrait générique.</p>
      <p class="cov-intro">Tout est croisé par culture, puisqu'un avatar ne sert qu'aux mercenaires de sa culture.
      <strong>Combinaisons à produire</strong> donne, culture par culture, les mercenaires fréquents (profil · arme tenue en main, ou
      école pour un mage) et les avatars qui ont ces tags ; <strong>Profils par culture</strong> et <strong>Ascendances × cultures</strong>
      donnent, case par case, les avatars possibles et la cible.
      Le jeu donne un avatar du même <strong>peuple</strong>, de la même <strong>culture</strong> et d'une <strong>ascendance</strong> compatible
      (la même ; ou, pour un mercenaire sans ascendance, un avatar sans ascendance ou dont l'ascendance n'est pas marquée
      « Ascendance only ») : sinon, portrait générique. Parmi ceux-là, il prend celui qui ressemble le plus au mercenaire : d'abord le
      <strong>profil</strong>, puis l'<strong>arme tenue en main</strong> (ou l'école du mage), puis l'arme de dos. Le profil de l'avatar
      dit quelle arme il tient : « Corps à corps + Hache + Arc » tient la hache et porte l'arc. Ce qui contredit le mercenaire (un arc
      pour un épéiste, un mage pour un guerrier) le fait passer après un avatar neutre.</p>
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
