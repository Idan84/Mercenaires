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
      ${results.map(peopleSection).join("")}
      ${warnings.length?`<div class="cov-warnings"><h3>Remarques sur les avatars de Hostinger</h3><ul>${warnings.map(w=>`<li>${html(w)}</li>`).join("")}</ul></div>`:""}`;
  }

  function meta(data){
    const s=data.avatars.sources||{};
    return `${data.avatars.rows.length} avatars · Git ${s.git??"?"} · Hostinger ${s.hostinger??"?"}`;
  }

  return {compute,render,meta,anchor};
})();
