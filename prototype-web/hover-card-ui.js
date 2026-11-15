"use strict";

// La fiche au survol d'un mercenaire (Idan, 2026-11-15 : « Au survol, on doit voir rapidement s'il convient ou non pour
// la mission »). Le contenu, d'Idan : l'avatar en pied ; le prénom et le nom ; le titre ; la réputation ; l'affinité ; la
// prime de mission ; les pictos du peuple, de la culture et de l'ascendance ; les tags (« seulement le plus précis »,
// celui de la mission d'abord) ; le set 1 et le set 2 (la catégorie de chaque arme, les deux mains : « deux épées, c'est
// pas épée et bouclier ») ; le type d'armure ; les écoles où il a au moins un sort (« juste un picto, celui qu'on a sur
// la fiche complète ») ; sa monture (« Ah oui »). La forme : le cadre de SA culture (« un joueur jusqu'à présent n'en
// voit qu'un, celui de son capitaine, alors qu'on en a 32 de magnifiques ») : sa barre en haut (son nom dans la bande)
// et en bas, son anneau au milieu de la barre du bas (le picto de sa culture dedans), la bande de la barre sur les côtés.

// Ce que la fiche montre, sans HTML (tests, portage).
function mercenaryHoverData(c,{missionTag=null}={}){
  const reference=game.referenceData||{};
  const rules=typeof tagRules==="function"?tagRules():null;
  // Les tags allumés, seulement les plus précis (aucun de leurs sous-tags n'est allumé) ; celui de la mission d'abord.
  const lit=rules?rules.litIds(c):[];
  const precise=lit.filter(id=>!lit.some(other=>other.startsWith(id+"/")));
  const toneOf=id=>rules?.columns.find(col=>col.code===String(id).split("/")[0])?.teinte||"";
  const isMission=id=>Boolean(missionTag)&&(id===missionTag||id.startsWith(missionTag+"/"));
  const tags=precise.map(id=>({id,name:rules?.node(id)?.nom||id,tone:toneOf(id),mission:isMission(id)}))
    .sort((a,b)=>Number(b.mission)-Number(a.mission));
  // Les objets portés.
  const slots=c.equipment?.slots||{},items=c.items||[];
  const itemIn=slot=>slots[slot]==null?null:items.find(item=>String(item.id)===String(slots[slot]))||null;
  const handLabel=item=>item?(item.category||item.name||""):"";
  const set=n=>{
    const main=itemIn(`weapon_set_${n}_main`),off=itemIn(`weapon_set_${n}_off`);
    return [main,off&&off!==main?off:null].map(handLabel).filter(Boolean);
  };
  const armor=itemIn("armor");
  const ARMOR={"Lourde":"Armure lourde","Intermédiaire":"Armure intermédiaire","Légère":"Armure légère","Vêtement":"Vêtement"};
  // Les écoles où il a au moins un sort.
  const spellRows=reference.spells?.rows||[];
  const schools=[...new Set((c.spells||[]).map(spell=>spellRows.find(row=>row.code===spell.code||row.nom===(spell.name||spell.nom))?.ecole||spell.school).filter(Boolean))];
  // Sa monture : celle qu'il a équipée.
  const mountItem=itemIn("mount");
  const mountKind=mountItem?.mountCode?(reference.mounts?.rows||[]).find(row=>row.code===mountItem.mountCode)?.nom:"";
  // Le titre, comme la fiche complète.
  let title="";
  const profile=typeof profileRules==="function"?profileRules():null;
  if(profile){
    const context=evaluationContext(c),result=profile.evaluate(c,context);
    title=result&&profile.composeTitle?.(c,result,context,{female:isFemale(c)})?.name||"";
  }
  const affinity=typeof captainAffinity==="function"?captainAffinity(c):null;
  return {
    name:c.name,title,
    people:c.people||"",culture:c.culture||"",ascendance:c.ascendance||"",
    bonus:Number(c.contract?.missionBonus??(typeof tavernRules==="function"?tavernRules().missionBonusDemand(c):0))||0,
    affinity:affinity?affinityPresentation(affinity.total,c):null,
    sets:[set(1),set(2)],
    armor:armor?(ARMOR[armor.category]||armor.category||armor.name):"",
    schools,
    mount:mountItem?{name:mountItem.name||mountKind,kind:mountKind&&mountKind!==mountItem.name?mountKind:""}:null,
    tags
  };
}

// Les pièces de la barre de sa culture (hud-bars.js), à la hauteur voulue : les embouts coupés au début de la bande, la
// bande étirée entre les deux.
function hoverCultureFrame(culture,barHeight){
  const all=typeof HUD_BARS!=="undefined"?HUD_BARS:{};
  const key=Object.keys(all).find(k=>all[k].culture===culture)||"cites-libres";
  const bar=all[key],s=barHeight/bar.h,o=bar.ornament;
  const url=piece=>`url("assets/hud/barres/${key}/${piece}.webp")`;
  return {key,
    vars:[`--hc-bar-h:${barHeight}px`,`--hc-left:${url("left")}`,`--hc-center:${url("center")}`,`--hc-right:${url("right")}`,
      `--hc-left-w:${Math.round(bar.left*s)}px`,`--hc-right-w:${Math.round(bar.right*s)}px`,
      `--hc-cap-l:${Math.round(bar.bandLeft*s)}px`,`--hc-cap-r:${Math.round(bar.bandRight*s)}px`,
      `--hc-band-top:${Math.round(bar.bandTop*s)}px`,`--hc-band-h:${Math.round((bar.bandBottom-bar.bandTop)*s)}px`,
      `--hc-rim-top:${Math.round(bar.frameTop*s)}px`,`--hc-rim-h:${Math.round((bar.frameBottom-bar.frameTop)*s)}px`,
      `--hc-ring:url("assets/hud/barres/${key}/ornement.webp")`,
      `--hc-ring-ratio:${o?(o.w/o.h).toFixed(3):2}`,`--hc-hole-x:${o?(o.cx/o.w*100).toFixed(2):50}%`,
      `--hc-hole-y:${o?(o.cy/o.h*100).toFixed(2):50}%`,`--hc-hole:${o?(o.hole/o.w*100).toFixed(2):30}%`].join(";")};
}

function renderMercenaryHoverCard(c,{missionTag=null}={}){
  const d=mercenaryHoverData(c,{missionTag});
  const frame=hoverCultureFrame(d.culture,64);
  const bar=kind=>`<div class="hover-card-bar hover-card-bar--${kind}" aria-hidden="true"><i class="hover-card-cap hover-card-cap--l"></i><i class="hover-card-band"></i><i class="hover-card-cap hover-card-cap--r"></i></div>`;
  const pictos=["people","ascendance"].map(kind=>d[kind]?renderPicto(kind,d[kind],{size:"sm"}):"").join("");
  const origin=[d.people,d.culture,d.ascendance].filter(Boolean).join(" · ");
  const hearts=d.affinity?`<span class="hover-card-hearts" title="${esc(d.affinity.phrase)}"><b>${"♥".repeat(d.affinity.filled)}</b>${"♡".repeat(10-d.affinity.filled)}</span>`:"";
  const row=(label,value)=>value?`<div class="hover-card-row"><dt>${esc(label)}</dt><dd>${value}</dd></div>`:"";
  const setText=list=>list.length?esc(list.join(" + ")):"";
  const schools=d.schools.length?`<span class="hover-card-schools">${d.schools.map(name=>`<span class="hover-card-school school--${esc(pictoSlug(name))}" title="${esc(name)}">${schoolIcon(name)}</span>`).join("")}</span>`:"";
  const tags=d.tags.map(tag=>`<li class="hover-card-tag mission-tag--${esc(tag.tone)}${tag.mission?" is-mission":""}">${esc(tag.name)}</li>`).join("");
  return `<article class="hover-card" data-culture="${esc(frame.key)}" style='${frame.vars}' aria-label="${esc(d.name)}">
    ${bar("top")}
    <header class="hover-card-head"><h3>${esc(d.name)}</h3></header>
    <div class="hover-card-rails" aria-hidden="true"><i class="hover-card-rail hover-card-rail--l"></i><i class="hover-card-rail hover-card-rail--r"></i></div>
    <div class="hover-card-body">
      <p class="hover-card-title">${esc(d.title)}</p>
      <div class="hover-card-main">
        <div class="hover-card-avatar">${renderAvatar(c,{variant:"detail",kind:"full"})}</div>
        <div class="hover-card-info">
          <div class="hover-card-origin">${pictos}<span>${esc(origin)}</span></div>
          <div class="hover-card-fame">${renderReputationStars(c)}${hearts}</div>
          <div class="hover-card-bonus"><img src="assets/hud/picto-or.webp" alt=""><span><b>${esc(goldAmount(d.bonus))} PO</b><small>Prime de mission</small></span></div>
          <dl class="hover-card-kit">
            ${row("Set 1",setText(d.sets[0])||"Mains nues")}
            ${row("Set 2",setText(d.sets[1]))}
            ${row("Armure",esc(d.armor||"Sans armure"))}
            ${row("Monture",d.mount?esc(d.mount.name)+(d.mount.kind?` <small>${esc(d.mount.kind)}</small>`:""):"")}
            ${row("Magie",schools)}
          </dl>
        </div>
      </div>
      ${tags?`<ul class="hover-card-tags">${tags}</ul>`:""}
    </div>
    ${bar("bottom")}
    <span class="hover-card-ring" aria-hidden="true">${d.culture?renderPicto("culture",d.culture,{size:"md"}):""}</span>
  </article>`;
}

if(typeof module!=="undefined"&&module.exports) module.exports={mercenaryHoverData,renderMercenaryHoverCard,hoverCultureFrame};
