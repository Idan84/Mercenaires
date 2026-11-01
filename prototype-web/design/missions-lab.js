"use strict";

// Design Lab — onglet Missions (Idan, 2026-11-01 : « la fiche mission "Faire le ménage", une série de textes avec
// variables, une liste de factions, un nombre de points par étoile… »). Étape 1 : lecture seule des types de mission
// tels qu'ils sont dans les données — règles, budget de points, récompense, coffre, camps (peuples, lignes, chefs),
// ordres de mission avec leurs variables, listes de noms — et la garde du corps.
// Données : one-shot-missions.json, bodyguard-missions.json, enemy-archetypes.json (noms et points des chefs).
const MissionsLab=(()=>{
  const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rows=x=>Array.isArray(x)?x:(x?.rows||[]);
  const anchor=key=>"mis-"+key;
  const pct=(part,total)=>total?Math.round(part/total*100)+" %":"—";
  const num=n=>Number(n).toLocaleString("fr-FR");
  const FILES={oneShotMissions:"one-shot-missions.json",bodyguardMissions:"bodyguard-missions.json",enemyArchetypes:"enemy-archetypes.json"};
  // Ce que contient chaque variable des ordres (game-core/missions.js createOffer, prototype-web/contract-ui.js).
  const VARIABLES={
    commanditaire:"Nom tiré dans la liste du commanditaire de l’ordre",
    lieu:"Village tiré dans « lieux »",
    jours:"Distance : jours de marche (1D3)",
    estimation:"Nombre d’ennemis à ± 2 près, en toutes lettres (« estimations »)",
    "récompense":"Récompense du contrat, en PO",
    boss:"Chef du camp, tiré dans les chefs du peuple",
    tribu:"Tribu du camp",
    tribu_cible:"Une autre tribu du même peuple",
    signataire:"Tiré dans « signataires »",
    date:"Date de l’offre",
    date_expiration:"Dernier jour de l’offre",
    an:"Année de l’offre",
    prenom:"Prénom du mercenaire",
    client:"Client tiré dans « clients »",
    n:"Nombre de gardes demandés",
    s:"« s » si plusieurs gardes"
  };
  let cache=null;

  async function compute(){
    if(cache) return cache;
    const entries=await Promise.all(Object.entries(FILES).map(async([key,file])=>{
      const r=await fetch("/data/"+file);
      if(!r.ok) throw new Error("Table introuvable : "+file);
      return [key,await r.json()];
    }));
    cache=build(Object.fromEntries(entries));
    return cache;
  }

  // Variables d'un texte, dans l'ordre d'apparition.
  function variablesOf(texts){
    const found=[];
    for(const t of texts.flat()) for(const m of String(t??"").matchAll(/\{([^}|]+)\}/g)) if(!found.includes(m[1])) found.push(m[1]);
    return found;
  }

  function build(reference){
    const data=reference.oneShotMissions||{},archetypes=new Map(rows(reference.enemyArchetypes).map(a=>[a.code,a]));
    const types=(data.missions||[]).map(def=>{
      const camps=def.camps||[],totalCamp=camps.reduce((s,c)=>s+(Number(c.poids)||1),0);
      const orders=(data.ordres||[]).filter(o=>o.mission===def.code);
      return {kind:"camp",code:def.code,def,orders,
        camps:camps.map(c=>{
          const totalLine=(c.lignes||[]).reduce((s,l)=>s+(Number(l.poids)||0),0),chief=archetypes.get(c.chef);
          return {faction:c.faction,name:c.nom_camp||c.faction,chance:pct(Number(c.poids)||1,totalCamp),
            lines:(c.lignes||[]).map(l=>({name:l.ligne,share:pct(Number(l.poids)||0,totalLine)})),
            chief:chief?{name:chief.nom,points:chief.points}:{name:c.chef,points:null},names:c.noms||{},
            orders:orders.filter(o=>o.faction===c.faction)};
        }),
        variables:variablesOf(orders.map(o=>[o.titre,o.texte,o.signature]))};
    });
    const bodyguard=reference.bodyguardMissions;
    if(bodyguard) types.push({kind:"bodyguard",code:"bodyguard",def:bodyguard,variables:variablesOf([Object.values(bodyguard.textes||{})])});
    return {types,names:data.noms||{},orderCount:(data.ordres||[]).length};
  }

  const variable=key=>`<mark class="mis-var" title="${html(VARIABLES[key]||"")}">{${html(key)}}</mark>`;
  // Texte d'un ordre avec ses variables en surbrillance ; {masculin|féminin} reste tel quel, en gris.
  function withVariables(text){
    return html(text).replace(/\{([^}|]+)\}/g,(all,key)=>variable(key)).replace(/\{([^}]*\|[^}]*)\}/g,'<span class="mis-gender" title="Accord selon le genre">{$1}</span>');
  }
  const rule=(label,value)=>`<tr><th>${html(label)}</th><td>${value}</td></tr>`;

  function campRules(def){
    const budgets=Object.entries(def.budgets||{}).map(([level,b])=>`difficulté ${html(level)} : ${b.min} à ${b.max} points, « normal » ${Math.round((b.chance_normal||0)*100)} % (sinon novice)`).join("<br>");
    const r=def.recompense||{},chest=def.coffre||{},tiers=(chest.tiers||[]).map(t=>`tier ${t.tier} : ${t.poids} %`).join(", ");
    const [minDays,maxDays]=def.validite_jours||[];
    return `<table class="mis-rules"><tbody>
      ${rule("Objectif",html(def.description))}
      ${rule("Budget de points",budgets||"—")}
      ${rule("Génération","Le chef d’abord, puis des ennemis (lignes selon leur poids) tant que le total plus la moitié du suivant reste dans le budget.")}
      ${rule("Distance",`1D${html(def.distance_faces)} jours de marche · offre valable ${html(minDays)} à ${html(maxDays)} jours`)}
      ${rule("Carte",def.carte?`${html(def.carte.colonnes)} × ${html(def.carte.lignes)} cases`:"—")}
      ${rule("Récompense",`${num(r.base)} + ${num(r.par_jour)} × 2 × jours + ${html(r.par_point)} × points (PO)`)}
      ${rule("Coffre",`${html(chest.or_des)}D${html(chest.or_faces)} × ${html(chest.or_unite)} PO · ${html(chest.objets_des)}D${html(chest.objets_faces)} objets (${html(tiers)})`)}
      ${rule("Échec",`Renommée ${html(String(def.echec?.renommee??"—").replace("-","−"))} · en cas de défaite, risque de mort × ${html(def.defaite?.multiplicateur_mort)}`)}
    </tbody></table>`;
  }

  function campTable(type,names){
    const listOf=key=>names[key]||[];
    const body=type.camps.map(c=>`<tr><td><b>${html(c.faction)}</b><small>${html(c.name)}</small></td><td class="num">${html(c.chance)}</td>
      <td>${c.lines.map(l=>`${html(l.name)} <small class="inline">${html(l.share)}</small>`).join("<br>")}</td>
      <td>${html(c.chief.name)}<small>${c.chief.points==null?"points non mesurés":html(c.chief.points)+" points"}</small></td>
      <td title="${html(listOf(c.names.chefs).join(", "))}">${html(listOf(c.names.chefs).length)} chefs<small>${html(c.names.chefs||"")}</small></td>
      <td title="${html(listOf(c.names.tribus).join(", "))}">${html(listOf(c.names.tribus).length)} tribus<small>${html(c.names.tribus||"")}</small></td>
      <td class="num">${c.orders.length}</td></tr>`).join("");
    return `<div class="table-wrap mis-camps"><table><thead><tr><th>Peuple</th><th title="Chance que le camp soit de ce peuple">Chance</th><th>Lignes (part des tirages)</th><th>Chef</th><th>Noms de chefs</th><th>Noms de tribus</th><th>Ordres</th></tr></thead>
      <tbody>${body}</tbody></table></div>`;
  }

  function orderBlock(o){
    const from=o.noms_commanditaire?`commanditaire tiré dans « ${o.noms_commanditaire} »`:"sans liste de noms";
    return `<details class="mis-order"><summary><b>${withVariables(o.titre)}</b> <small>${html(o.commanditaire)} · ${html(from)}</small></summary>
      <div class="mis-letter">${(o.texte||[]).map(p=>`<p>${withVariables(p)}</p>`).join("")}<p class="mis-sign">${withVariables(o.signature)}</p></div></details>`;
  }

  function variableList(keys){
    return `<ul class="mis-vars">${keys.map(k=>`<li>${variable(k)} <span>${html(VARIABLES[k]||"")}</span></li>`).join("")}</ul>`;
  }

  function nameLists(names){
    return `<details class="mis-names"><summary>Listes de noms (${Object.keys(names).length})</summary><div class="table-wrap"><table><tbody>
      ${Object.entries(names).map(([k,list])=>`<tr><th>${html(k)}</th><td>${html(list.map(x=>typeof x==="object"?(x.texte+(x.max<99?" (≤ "+x.max+")":"")):x).join(", "))}</td></tr>`).join("")}
      </tbody></table></div></details>`;
  }

  function campType(type,names){
    return `<section class="cov-people mis-type" id="${anchor(type.code)}">
      <h3>${html(type.def.nom)} <span class="badge ok">${type.camps.length} peuples · ${type.orders.length} ordres</span></h3>
      ${campRules(type.def)}
      <h4 class="mis-h">Camps</h4><p class="cov-note">Le peuple du camp est tiré au hasard ; l’équilibre vient du nombre d’ennemis, pas du peuple.</p>
      ${campTable(type,names)}
      <h4 class="mis-h" id="${anchor(type.code+"-ordres")}">Ordres de mission</h4>
      <p class="cov-note">Un ordre tiré au hasard parmi ceux du peuple du camp. Survolez une variable pour savoir ce qu’elle contient.</p>
      ${variableList(type.variables)}
      ${type.camps.map(c=>`<div class="mis-orders"><h5>${html(c.faction)}</h5>${c.orders.map(orderBlock).join("")||'<p class="muted">Aucun ordre.</p>'}</div>`).join("")}
      ${nameLists(names)}</section>`;
  }

  function bodyguardType(type){
    const b=type.def,levels=(b.niveaux||[]),total=levels.reduce((s,l)=>s+(Number(l.poids)||0),0);
    const back=(b.retour||[]),backTotal=back.reduce((s,r)=>s+(Number(r.poids)||0),0);
    const texts=Object.entries(b.textes||{}).map(([k,t])=>`<tr><th>${html(k)}</th><td>${withVariables(t)}</td></tr>`).join("");
    return `<section class="cov-people mis-type" id="${anchor(type.code)}">
      <h3>${html(b.textes?.titre||"Garde du corps")} <span class="badge ok">pas de combat</span></h3>
      <table class="mis-rules"><tbody>
        ${rule("Règles",html(b.description))}
        ${rule("Mercenaires",`${html(b.mercenaires?.min)} à ${html(b.mercenaires?.max)} · ${html(b.duree_jours?.min)} à ${html(b.duree_jours?.max)} jours · offre valable ${html((b.validite_jours||[]).join(" à "))} jours`)}
        ${rule("Niveau demandé",levels.map(l=>`${html(l.etoiles)}★ ${pct(Number(l.poids)||0,total)}`).join(" · "))}
        ${rule("Décalage",html(b.decalage_niveau?.description||""))}
        ${rule("Retour",back.map(r=>`${html(r.issue)} ${pct(Number(r.poids)||0,backTotal)}${r.jours_faces?" (1D"+html(r.jours_faces)+" jours)":""}`).join(" · "))}
        ${rule("Réputation",Object.entries(b.reputation||{}).map(([k,v])=>html(k)+" +"+html(v)).join(" · ")+" · Renommée de la compagnie +"+html(b.renommee))}
        ${rule("Clients",html((b.clients||[]).join(", ")))}
      </tbody></table>
      <h4 class="mis-h">Textes</h4>${variableList(type.variables)}
      <div class="table-wrap"><table class="mis-texts"><tbody>${texts}</tbody></table></div></section>`;
  }

  function render(data){
    return `<p class="cov-intro">Les types de mission de la Taverne, tels qu’ils sont dans les données. Les <mark class="mis-var">{variables}</mark>
      sont remplacées quand l’offre est tirée.</p>
      ${data.types.map(t=>t.kind==="camp"?campType(t,data.names):bodyguardType(t)).join("")}`;
  }
  function meta(data){ return data.types.length+" types de mission · "+data.orderCount+" ordres"; }
  function nav(data){
    return data.types.flatMap(t=>t.kind==="camp"
      ? [{id:anchor(t.code),label:t.def.nom,sub:t.camps.map(c=>c.faction).join(", ")},{id:anchor(t.code+"-ordres"),label:"Ordres de mission",sub:t.orders.length+" lettres"}]
      : [{id:anchor(t.code),label:t.def.textes?.titre||"Garde du corps",sub:(t.def.clients||[]).length+" clients"}]);
  }

  return {build,compute,render,meta,nav,anchor,variablesOf,VARIABLES};
})();
