"use strict";

// Design Lab — onglet Bestiaire (Idan, 2026-11-01 : « un bestiaire ennemi […] une espèce de BDD où l'on peut piloter
// tout ça »). Étape 1 : lecture seule des fiches figées (data/reference/enemy-archetypes.json) et des créatures
// invoquées (summon-archetypes.json), rangées par faction puis par ligne, avec les camps qui les utilisent
// (one-shot-missions.json). Le butin par créature, le niveau de mission minimum et les créatures partagées entre
// factions viendront avec l'étape 2 (données restructurées).
const BestiaryLab=(()=>{
  const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rows=x=>Array.isArray(x)?x:(x?.rows||[]);
  const slug=s=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const anchor=name=>"best-"+slug(name);
  const pct=(part,total)=>total?Math.round(part/total*100)+" %":"—";
  // Colonnes visibles ; les autres caractéristiques passent dans l'infobulle de la ligne.
  const SHOWN=[["Force","For"],["Constitution","Con"],["Dextérité","Dex"],["Vitesse","Vit"],["Endurance","End"],["Esquive","Esq"],
    ["Courage","Cou"],["Volonté","Vol"],["Perception","Per"]];
  const LEVELS=["novice","normal","vétéran","d’élite","chef 1","chef 2","chef 3","chef 4"];
  const FILES=["enemy-archetypes.json","summon-archetypes.json","one-shot-missions.json"];
  let cache=null;

  // Les camps de mission qui tirent chaque faction, et le poids de chaque ligne dans le camp.
  function campUsage(missions){
    const usage={};
    for(const mission of missions||[]){
      const camps=mission.camps||[],totalCamp=camps.reduce((s,c)=>s+(Number(c.poids)||1),0);
      for(const camp of camps){
        const totalLine=(camp.lignes||[]).reduce((s,l)=>s+(Number(l.poids)||0),0);
        (usage[camp.faction]=usage[camp.faction]||[]).push({mission:mission.nom,camp:camp.nom_camp||camp.faction,
          chance:pct(Number(camp.poids)||1,totalCamp),chief:camp.chef||null,
          lines:Object.fromEntries((camp.lignes||[]).map(l=>[l.ligne,pct(Number(l.poids)||0,totalLine)]))});
      }
    }
    return usage;
  }

  // Factions → lignes → niveaux, dans l'ordre du fichier.
  function build(reference){
    const enemies=rows(reference.enemyArchetypes),usage=campUsage(reference.oneShotMissions?.missions);
    const factions=[];
    for(const e of enemies){
      let f=factions.find(x=>x.name===e.faction);
      if(!f) factions.push(f={name:e.faction,people:new Set(),cultures:new Set(),lines:[],camps:usage[e.faction]||[],count:0});
      f.people.add(e.peuple);f.cultures.add(e.culture);f.count++;
      let line=f.lines.find(l=>l.name===e.ligne);
      if(!line) f.lines.push(line={name:e.ligne,rows:[]});
      line.rows.push(e);
    }
    for(const f of factions){
      f.people=[...f.people].filter(Boolean);f.cultures=[...f.cultures].filter(Boolean);
      for(const line of f.lines) line.rows.sort((a,b)=>LEVELS.indexOf(a.niveau)-LEVELS.indexOf(b.niveau));
    }
    return {factions,summons:rows(reference.summonArchetypes),total:enemies.length};
  }

  async function compute(){
    if(cache) return cache;
    const [enemyArchetypes,summonArchetypes,oneShotMissions]=await Promise.all(FILES.map(async file=>{
      const r=await fetch("/data/"+file);
      if(!r.ok) throw new Error("Table introuvable : "+file);
      return r.json();
    }));
    cache=build({enemyArchetypes,summonArchetypes,oneShotMissions});
    return cache;
  }

  const list=obj=>Object.entries(obj||{}).map(([k,v])=>k+" "+v).join(", ")||"—";
  function detail(e){
    const other=Object.entries(e.caracteristiques||{}).filter(([k])=>!SHOWN.some(([name])=>name===k));
    return [e.nom+" ("+e.code+")",e.centile?"Centile "+e.centile:"",
      "Autres caractéristiques : "+other.map(([k,v])=>k+" "+v).join(", "),
      "Résistances : "+list(e.resistances).replace(/Résistance (au |à la |à l’)?/g,""),
      "Compétences : "+list(e.competences_martiales),
      e.intimidation!=null?"Intimidation "+e.intimidation:"",
      "Port d’armure : "+((e.port_d_armure||[]).join(", ")||"—"),
      e.tier!=null?"Équipement : tier "+e.tier:"",
      "Image attendue : assets-src/Ennemis/"+e.code+".jpg"].filter(Boolean).join("\n");
  }
  const searchText=(...parts)=>html(parts.flat().join(" ").toLowerCase());
  const stat=(e,name)=>`<td class="num">${html(e.caracteristiques?.[name]??"—")}</td>`;
  const statHead=SHOWN.map(([name,short])=>`<th title="${html(name)}">${short}</th>`).join("");
  const initials=name=>String(name||"?").split(/[\s-]+/).map(w=>w[0]).join("").slice(0,2).toUpperCase();

  function enemyRow(e,faction,line){
    const points=e.points==null?`<td class="num muted" title="Pas encore mesuré">—</td>`:`<td class="num"><b>${html(e.points)}</b></td>`;
    return `<tr data-q="${searchText(e.nom,e.code,faction,line,e.armes||[],e.armure||"",e.niveau)}" title="${html(detail(e))}">
      <td>${html(e.niveau)}</td>${points}<td class="num">${html(e.pv)}</td>${SHOWN.map(([name])=>stat(e,name)).join("")}
      <td>${html((e.armes||[]).join(" + ")||"—")}</td><td>${html(e.armure||"—")}</td><td>${html(e.qualite||"—")}</td></tr>`;
  }

  function lineBlock(f,line){
    const camps=f.camps.map(c=>line.name==="Chef"
      ? (line.rows.some(e=>e.code===c.chief)?c.camp+" : "+(line.rows.find(e=>e.code===c.chief)?.niveau||""):"")
      : (c.lines[line.name]?c.camp+" "+c.lines[line.name]:"")).filter(Boolean);
    const files=line.rows.map(e=>"assets-src/Ennemis/"+e.code+".jpg").join("\n");
    return `<div class="best-line" id="${anchor(f.name+"-"+line.name)}">
      <div class="best-line-head"><span class="best-face" title="Image à produire, une par niveau :\n${html(files)}">${html(initials(line.name))}</span>
        <h4>${html(line.name)}</h4><small>${html(camps.join(" · ")||"Dans aucun camp")}</small></div>
      <div class="table-wrap best-table"><table><thead><tr><th>Niveau</th><th title="Points de combat (mercenaire moyen = 10)">Points</th><th>PV</th>${statHead}<th>Armes</th><th>Armure</th><th>Qualité</th></tr></thead>
      <tbody>${line.rows.map(e=>enemyRow(e,f.name,line.name)).join("")}</tbody></table></div></div>`;
  }

  function factionBlock(f){
    const camps=f.camps.length?f.camps.map(c=>`${c.mission} — ${c.camp} (${c.chance} des camps)`).join(" · "):"Dans aucune mission pour l’instant";
    return `<section class="cov-people best-faction" id="${anchor(f.name)}">
      <h3>${html(f.name)} <span class="badge ok">${f.count} fiches</span></h3>
      <p class="cov-note">${html([f.people.join(", "),f.cultures.join(", ")].filter(Boolean).join(" · "))}<br>${html(camps)}</p>
      ${f.lines.map(line=>lineBlock(f,line)).join("")}</section>`;
  }

  function summonBlock(summons){
    if(!summons.length) return "";
    const body=summons.map(s=>{
      const attack=s.attaque||{},tip=[s.nom+" ("+s.code+")",s.description||"",s.mort_vivant?"Mort-vivant":"",s.immunite_physique?"Immunité physique":"",
        "Résistances : "+list(s.resistances).replace(/Résistance (au |à la |à l’)?/g,""),"Compétences : "+list(s.competences_martiales),
        "Attaque : "+Object.entries(attack).map(([k,v])=>k.replace(/_/g," ")+" "+v).join(", "),
        "Image attendue : assets-src/Invocations/"+s.code+".jpg"].filter(Boolean).join("\n");
      return `<tr data-q="${searchText(s.nom,s.code,s.ecole,"invocation",attack.nom||"")}" title="${html(tip)}"><td><b>${html(s.nom)}</b></td><td>${html(s.ecole)}</td>
        <td class="num">${html(s.pv)}</td>${SHOWN.map(([name])=>stat(s,name)).join("")}<td>${html(attack.nom||"—")}</td><td>${html(attack.degats_pv_base||"—")}</td></tr>`;
    }).join("");
    return `<section class="cov-people best-faction" id="${anchor("Invocations")}">
      <h3>Invocations <span class="badge ok">${summons.length} créatures</span></h3>
      <p class="cov-note">Créatures des sorts d’Invocation et de Nécromancie. Pas encore dans un camp ennemi.</p>
      <div class="best-line"><div class="table-wrap best-table"><table><thead><tr><th>Créature</th><th>École</th><th>PV</th>${statHead}<th>Attaque</th><th>Dégâts</th></tr></thead>
      <tbody>${body}</tbody></table></div></div></section>`;
  }

  function render(data){
    return `<p class="cov-intro">Chaque ennemi a une fiche figée par niveau. <strong>Points de combat</strong> : un mercenaire moyen vaut 10 ;
      les camps se remplissent avec un budget de points. Survolez une ligne pour le détail (résistances, compétences, image attendue).
      <br><span class="muted">À venir (étape 2) : butin par créature, niveau de mission minimum, créatures partagées entre factions.</span></p>
      ${data.factions.map(factionBlock).join("")}${summonBlock(data.summons)}`;
  }
  function meta(data){ return data.total+" fiches ennemies · "+data.factions.length+" factions · "+data.summons.length+" invocations"; }
  function nav(data){
    return data.factions.map(f=>({id:anchor(f.name),label:f.name,sub:f.lines.length+" lignes · "+f.count+" fiches"}))
      .concat(data.summons.length?[{id:anchor("Invocations"),label:"Invocations",sub:data.summons.length+" créatures"}]:[]);
  }
  // Recherche (armes, ligne, nom, code…) : masque les niveaux, lignes et factions sans résultat.
  function filter(root,query){
    const q=String(query||"").trim().toLowerCase();
    let shown=0,total=0;
    root.querySelectorAll(".best-faction").forEach(section=>{
      let any=false;
      section.querySelectorAll(".best-line").forEach(line=>{
        let lineAny=false;
        line.querySelectorAll("tbody tr").forEach(tr=>{
          const ok=!q||tr.dataset.q.includes(q);
          tr.classList.toggle("hidden",!ok);total++;if(ok){shown++;lineAny=true;}
        });
        line.classList.toggle("hidden",!lineAny);any=any||lineAny;
      });
      section.classList.toggle("hidden",!any);
    });
    return {shown,total};
  }

  return {build,compute,render,meta,nav,filter,anchor,campUsage};
})();
