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

// La texture de sa culture (hud-bars.js) pour le fond du cartouche du nom (Idan, 2026-11-15 : « la texture de la culture
// uniquement… notre PNG centre de culture mais on coupe en haut et en bas ») : la pièce du milieu de sa barre, réduite à sa
// bande (de bandTop à bandBottom), rognée encore de 8 % en haut et en bas : chez certaines cultures (chaînes des Orcs noirs,
// cordes des Tribus de la jungle…) la bande mesurée garde un liseré du cadre. Des rapports sans unité, que le CSS multiplie
// par la hauteur du cartouche.
const HOVER_TEXTURE_INSET=.08;
// L'ornement du titre, un par culture (Idan, 2026-11-15 : « je voudrais qu'on les fasse court, mais 1 par culture en
// monochrome… plus fin et plus petit »), revus culture par culture avec lui : un motif pris dans ses planches d'ornements
// (Ornements.zip) ou une forme simple dessinée, avec ou sans filet effilé, comme chez Chatty. Les SVG :
// assets/fiche/ornements/<motif>.svg (scripts/build-title-ornaments.py).
const HOVER_TITLE_ORNAMENTS={
  "tribus-nordiques":"corbeau","clans-des-grandes-steppes":"corne","tribus-des-forets-anciennes":"totem",
  "ogres-des-cites-humaines":"chope","ogres-des-montagnes":"ours","ogres-des-steppes":"crane-pique",
  "orcs-noirs":"poing","orcs-des-villes":"fleuron-chaine","orcs-des-steppes":"patte",
  "gobelins-des-cavernes":"champignon","gobelins-des-villes":"dague","caravanes-de-ferrailleurs":"cadenas",
  "nains-des-montagnes":"marteau","nains-du-chaos":"crane-flamme","nains-esclaves":"chaine",
  "gnomes-des-forets":"gland","gnomes-des-cavernes":"bougie","gnomes-des-villes":"cle-ailee",
  "halflings-des-cites-humaines":"couronne-croix","halflings-des-villages-isoles":"epi","explorateurs":"tentacule-sabre",
  "elfes-noirs":"croissant","elfes-des-grandes-cites":"rinceau","elfes-sylvains":"branche",
  "cites-libres":"lys","montagnes-du-nord":"flocon","tribus-de-la-jungle":"fleur",
  "steppes-desertiques":"croissant-haut","royaumes-du-soleil-levant":"dragon",
  "reptiliens-des-villes":"oeil","reptiliens-des-marecages":"crapaud","reptiliens-des-cites-temples":"triangle"
};
function hoverCultureFrame(culture){
  const all=typeof HUD_BARS!=="undefined"?HUD_BARS:{};
  const key=Object.keys(all).find(k=>all[k].culture===culture)||"cites-libres";
  const bar=all[key],inset=(bar.bandBottom-bar.bandTop)*HOVER_TEXTURE_INSET;
  const top=bar.bandTop+inset,band=bar.bandBottom-bar.bandTop-2*inset;
  const ornament=HOVER_TITLE_ORNAMENTS[key]||"lys";
  return {key,ornament,
    vars:[`--hc-texture:url("assets/hud/barres/${key}/center.webp")`,`--hc-tex-w:${(bar.center/band).toFixed(4)}`,
      `--hc-tex-h:${(bar.h/band).toFixed(4)}`,`--hc-tex-y:${(top/band).toFixed(4)}`,
      `--hc-orn:url("assets/fiche/ornements/${ornament}.svg")`].join(";")};
}

// La forme : la direction « A · Le diptyque » de Chatty (Idan, 2026-11-15). Une carte et un avatar aux dimensions fixes,
// aux proportions de Chatty (styles.css) ; les cadres viendront en dernier, une image par culture posée par-dessus
// (« On aura simplement 32 PNG qui n'auront plus qu'à se coller dessus »). À gauche le portrait en pied ; à droite le
// cartouche du nom, puis une page claire : origines, réputation, affinité, prime, tags, armes, écoles.
const HEART='<path d="M12 21.2s-7.6-4.7-10.1-9.3C.1 8.4 1.6 3.4 6.1 2.4 8.6 1.8 10.7 3 12 5c1.3-2 3.4-3.2 5.9-2.6 4.5 1 6 6 4.2 9.5-2.5 4.6-10.1 9.3-10.1 9.3z"/>';
function hoverHearts(filled){
  return Array.from({length:10},(_,i)=>`<svg class="hc-heart${i<filled?" is-full":""}" viewBox="0 0 24 22" aria-hidden="true">${HEART}</svg>`).join("");
}
function renderMercenaryHoverCard(c,{missionTag=null}={}){
  const d=mercenaryHoverData(c,{missionTag});
  const frame=hoverCultureFrame(d.culture);
  // Le nom remplit le cartouche ; les noms longs (plus de 17 lettres) rapetissent un peu.
  const nameFit=Math.max(.6,1-Math.max(0,d.name.length-17)*.032);
  const emblems=["people","culture","ascendance"].filter(kind=>d[kind])
    .map(kind=>`<span class="hc-emblem">${renderPicto(kind,d[kind],{size:"md"})}<span>${esc(d[kind])}</span></span>`).join("");
  const affinity=d.affinity?`<div class="hc-stat"><span class="hc-label">Affinité</span><span class="hc-hearts" title="${esc(d.affinity.phrase)}">${hoverHearts(d.affinity.filled)}</span></div>`:"";
  const kit=[["Set 1",d.sets[0].join(" + ")||"Mains nues"],["Set 2",d.sets[1].join(" + ")],["Armure",d.armor||"Sans armure"],
    ["Monture",d.mount?d.mount.name+(d.mount.kind?` (${d.mount.kind})`:""):""]]
    .filter(([,value])=>value).map(([label,value])=>`<span class="hc-kit-item"><b>${esc(label)}</b><i>${esc(value)}</i></span>`).join("");
  // Les pictos des écoles d'Idan (assets/pictos/ecole-<slug>.webp).
  const schools=d.schools.map(name=>`<span class="hc-school">${renderPicto("school",name,{size:"md"})}<span>${esc(name)}</span></span>`).join("");
  const tags=d.tags.map(tag=>`<li class="hc-tag hc-tag--${esc(tag.tone)}${tag.mission?" is-mission":""}">${esc(tag.name)}</li>`).join("");
  return `<article class="hover-card" data-culture="${esc(frame.key)}" style='${frame.vars};--hc-name-fit:${nameFit.toFixed(3)}' aria-label="${esc(d.name)}">
    <div class="hc-portrait">${renderAvatar(c,{variant:"detail",kind:"full"})}</div>
    <header class="hc-banner"><h3>${esc(d.name)}</h3>${d.title?`<p class="hc-title"><i class="hc-orn hc-orn--l" aria-hidden="true"></i><span>${esc(d.title)}</span><i class="hc-orn hc-orn--r" aria-hidden="true"></i></p>`:""}</header>
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
  </article>`;
}

// Le nom et le titre dans le cartouche, une fois la fiche dans la page. Le nom : une ligne, sa police baisse tant qu'il
// dépasse (jusqu'à 60 %). Le titre (il peut dépasser 80 lettres : « Archer éclaireur et soigneur en herbe à l'arc et à la
// hache de guerre à dos de licorne ») : une ligne jusqu'à 75 % de sa taille ; au-delà, deux lignes, et la police baisse
// encore tant que le cartouche déborde (jusqu'à 60 %).
function fitHoverCard(root){
  const shrink=(el,fits,floor)=>{
    let size=parseFloat(getComputedStyle(el).fontSize);const min=size*floor;
    while(!fits()&&size>min){ size-=.5; el.style.fontSize=size+"px"; }
    return fits();
  };
  const name=root.querySelector(".hc-banner h3"),title=root.querySelector(".hc-title span"),banner=root.querySelector(".hc-banner");
  if(name) shrink(name,()=>name.scrollWidth<=name.clientWidth+1,.6);
  if(title&&!shrink(title,()=>title.scrollWidth<=title.clientWidth+1,.75)){
    title.parentElement.classList.add("is-two-lines");
    shrink(title,()=>title.scrollWidth<=title.clientWidth+1&&banner.scrollHeight<=banner.clientHeight+1,.8);
  }
}

if(typeof module!=="undefined"&&module.exports) module.exports={mercenaryHoverData,renderMercenaryHoverCard,hoverCultureFrame,fitHoverCard};
