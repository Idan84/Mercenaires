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
const BANNER_H=104; // la hauteur du cartouche du nom
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
      `--hc-banner-bg-h:${(BANNER_H*bar.h/(bar.frameBottom-bar.frameTop)).toFixed(1)}px`,
      `--hc-banner-bg-y:${(-BANNER_H*bar.frameTop/(bar.frameBottom-bar.frameTop)).toFixed(1)}px`,
      `--hc-ring-ratio:${o?(o.w/o.h).toFixed(3):2}`,`--hc-hole-x:${o?(o.cx/o.w*100).toFixed(2):50}%`,
      `--hc-hole-y:${o?(o.cy/o.h*100).toFixed(2):50}%`,`--hc-hole:${o?(o.hole/o.w*100).toFixed(2):30}%`].join(";")};
}

// La forme : la direction « A · Le diptyque » de Chatty (Idan, 2026-11-15 : « Fais un test avec le A… Part de ce qu'on a,
// si ça va pas, on refera » ; puis « Essaie de t'approcher au max du travail de Chatty »). Un cadre d'argent aux coins
// ciselés (ceux du menu, passés à l'argent) ; à gauche le portrait en pied ; à droite le cartouche du nom (la bande de la
// barre de sa culture) et une page claire : origines, réputation, affinité, prime, tags en plaques, armes, écoles. En bas,
// la barre de sa culture et son anneau, comme les lianes de Chatty.
const HEART='<path d="M12 21.2s-7.6-4.7-10.1-9.3C.1 8.4 1.6 3.4 6.1 2.4 8.6 1.8 10.7 3 12 5c1.3-2 3.4-3.2 5.9-2.6 4.5 1 6 6 4.2 9.5-2.5 4.6-10.1 9.3-10.1 9.3z"/>';
function hoverHearts(filled){
  return Array.from({length:10},(_,i)=>`<svg class="hc-heart${i<filled?" is-full":""}" viewBox="0 0 24 22" aria-hidden="true">${HEART}</svg>`).join("");
}
function renderMercenaryHoverCard(c,{missionTag=null}={}){
  const d=mercenaryHoverData(c,{missionTag});
  const frame=hoverCultureFrame(d.culture,46);
  const nameSize=Math.max(22,Math.min(36,36-Math.max(0,d.name.length-17)*1.15));
  const emblems=["people","culture","ascendance"].filter(kind=>d[kind])
    .map(kind=>`<span class="hc-emblem">${renderPicto(kind,d[kind],{size:"md"})}<span>${esc(d[kind])}</span></span>`).join("");
  const affinity=d.affinity?`<div class="hc-stat"><span class="hc-label">Affinité</span><span class="hc-hearts" title="${esc(d.affinity.phrase)}">${hoverHearts(d.affinity.filled)}</span></div>`:"";
  const kit=[["Set 1",d.sets[0].join(" + ")||"Mains nues"],["Set 2",d.sets[1].join(" + ")],["Armure",d.armor||"Sans armure"],
    ["Monture",d.mount?d.mount.name+(d.mount.kind?` (${d.mount.kind})`:""):""]]
    .filter(([,value])=>value).map(([label,value])=>`<span class="hc-kit-item"><b>${esc(label)}</b><i>${esc(value)}</i></span>`).join("");
  const schools=d.schools.map(name=>`<span class="hc-school school--${esc(pictoSlug(name))}"><i class="hc-medal">${schoolIcon(name)}</i><span>${esc(name)}</span></span>`).join("");
  const tags=d.tags.map(tag=>`<li class="hc-tag hc-tag--${esc(tag.tone)}${tag.mission?" is-mission":""}">${esc(tag.name)}</li>`).join("");
  const corner=pos=>`<i class="hc-corner hc-corner--${pos}" aria-hidden="true"></i>`;
  return `<article class="hover-card" data-culture="${esc(frame.key)}" style='${frame.vars};--hc-name:${nameSize.toFixed(1)}px' aria-label="${esc(d.name)}">
    ${["tl","tr","bl","br"].map(corner).join("")}
    <div class="hc-portrait">${renderAvatar(c,{variant:"detail",kind:"full"})}</div>
    <div class="hc-side">
      <header class="hc-banner"><h3>${esc(d.name)}</h3>${d.title?`<p class="hc-title"><span>${esc(d.title)}</span></p>`:""}</header>
      <div class="hc-page">
        <div class="hc-emblems">${emblems}</div>
        <i class="hc-rule" aria-hidden="true"></i>
        <div class="hc-stats">
          <div class="hc-stat"><span class="hc-label">Réputation</span>${renderReputationStars(c)}</div>
          ${affinity}
          <div class="hc-stat hc-stat--bonus"><span class="hc-label">Prime de mission</span><span class="hc-bonus"><img src="assets/hud/picto-or.webp" alt=""><b>${esc(goldAmount(d.bonus))} PO</b></span></div>
        </div>
        ${tags?`<i class="hc-rule" aria-hidden="true"></i><ul class="hc-tags">${tags}</ul>`:""}
        <i class="hc-rule" aria-hidden="true"></i>
        <div class="hc-kit">${kit}</div>
        ${schools?`<i class="hc-rule" aria-hidden="true"></i><div class="hc-magic"><span class="hc-plaque">Écoles de magie</span><div class="hc-schools" style="--n:${Math.min(3,d.schools.length)}">${schools}</div></div>`:""}
      </div>
    </div>
    <div class="hover-card-bar hover-card-bar--bottom" aria-hidden="true"><i class="hover-card-cap hover-card-cap--l"></i><i class="hover-card-band"></i><i class="hover-card-cap hover-card-cap--r"></i></div>
    <span class="hover-card-ring" aria-hidden="true">${d.culture?renderPicto("culture",d.culture,{size:"md"}):""}</span>
  </article>`;
}

if(typeof module!=="undefined"&&module.exports) module.exports={mercenaryHoverData,renderMercenaryHoverCard,hoverCultureFrame};
