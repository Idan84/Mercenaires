"use strict";

// La fiche au survol d'un mercenaire (Idan, 2026-11-15 : « Au survol, on doit voir rapidement s'il convient ou non pour
// la mission »). Le contenu, d'Idan : l'avatar en pied ; le prénom et le nom ; le titre ; la réputation ; l'affinité ; la
// prime de mission ; les pictos du peuple, de la culture et de l'ascendance ; les tags (« seulement le plus précis »,
// celui de la mission d'abord) ; le set 1 et le set 2 (les deux mains : « deux épées, c'est pas épée et bouclier » ; le nom
// de chaque arme, Idan, 2026-11-16 : « épée longue et écu », « Arc ») ; l'armure (« Armure de cuir ») ; les écoles où il a au moins un sort (« juste un picto, celui qu'on a sur
// la fiche complète ») ; sa monture (« Ah oui »). La forme : le cadre de SA culture (« un joueur jusqu'à présent n'en
// voit qu'un, celui de son capitaine, alors qu'on en a 32 de magnifiques ») : sa barre en haut (son nom dans la bande)
// et en bas, son anneau au milieu de la barre du bas (le picto de sa culture dedans), la bande de la barre sur les côtés.

// La phrase d'origine, sous les pictos (Idan, 2026-11-15) : le peuple et la culture en une fois, sans répéter le peuple
// (« Nains / Nains des montagnes devient Nains des montagnes ! » ; « Humain des cités libres », « Humain des montagnes du
// Nord », « Gobelin des caravanes de ferrailleurs »), puis l'ascendance (« au sang de »). Au singulier et au masculin pour
// tous (Idan, 2026-11-15 : « c'est un titre… Humain (pour un homme et une femme) »). Le pluriel de chaque peuple, celui
// des noms de culture.
const ORIGIN_PLURALS={"Humain":"Humains","Nain":"Nains","Elfe":"Elfes","Gnome":"Gnomes","Halfling":"Halflings","Ogre":"Ogres",
  "Orc":"Orcs","Gobelin":"Gobelins","Reptilien":"Reptiliens","Homme-bête":"Hommes-bêtes"};
// Les cultures qui ne commencent ni par leur peuple ni ne se disent « des … ».
const ORIGIN_CULTURE_WORDS={"Explorateurs":"explorateur"};
function originPhrase({people="",culture="",ascendance=""}={}){
  const lower=text=>text?text[0].toLocaleLowerCase("fr")+text.slice(1):"";
  const plural=ORIGIN_PLURALS[people]||people+"s";
  let phrase=people;
  if(culture&&culture.startsWith(plural+" ")){
    // « Nains des montagnes » → « Nain des montagnes » ; « Elfes noirs » → « Elfe noir ».
    const rest=culture.slice(plural.length+1);
    phrase+=" "+(/^(des|du|de) /.test(rest)?rest:rest.split(" ").map(word=>word.replace(/s$/,"")).join(" "));
  }else if(ORIGIN_CULTURE_WORDS[culture]) phrase+=" "+ORIGIN_CULTURE_WORDS[culture];
  else if(culture) phrase+=" des "+lower(culture);
  return (ascendance?`${phrase} au ${lower(ascendance)}`:phrase).trim();
}

// Les tags de la fiche au survol (Idan, 2026-11-16 : « On va limiter le nombre. On met que la catégorie la plus basse. On
// met uniquement les tags missions et rôle au combat ») : les missions (camps, chasses, garde du corps) et le rôle au combat.
const HOVER_TAG_BRANCHES=["occupation/mission","occupation/garde-du-corps","role"];
// Les plaques des tags (Idan, 2026-11-16 : « on va en mettre jusqu'à 5 en quinconce. S'il existe 6 tags ou plus on marque
// dans le dernier x autres rôles ») : au plus 5, trois en haut et deux décalés dessous, chaque rangée centrée ; à partir de
// 6, les 4 premiers et une plaque « N autres rôles ». col : la colonne où commence la plaque, sur une grille de 6 (chaque
// plaque en prend 2). Logique pure (tests, portage).
const HOVER_TAG_MAX=5;
function hoverTagPlates(tags,max=HOVER_TAG_MAX){
  const extra=tags.length>max?tags.length-(max-1):0;
  const plates=extra?[...tags.slice(0,max-1),{name:`${extra} autres rôles`,tone:"bleu",mission:false,level:1,more:true,hidden:tags.slice(max-1).map(tag=>tag.name)}]:tags.slice(0,max);
  return plates.map((plate,i)=>{
    const row=i<3?0:1,inRow=row?plates.length-3:Math.min(3,plates.length),pos=row?i-3:i;
    return {...plate,col:1+(3-inRow)+2*pos};
  });
}
// Deux tags au même nom (« De zone » en Dégâts et en Soin ; « Brûlant » en Dégâts et en Dégâts élémentaires) : chacun
// prend le nom de son parent devant (Idan, 2026-11-16 : « oui » à « Dégâts de zone », « Soin de zone »), l'adjectif
// accordé au pluriel après un parent au pluriel (« Dégâts brûlants »).
function hoverTagFullName(parent,name){
  const low=name?name[0].toLocaleLowerCase("fr")+name.slice(1):"";
  const plural=/s$/.test(parent)&&!/\s/.test(low)&&!/[sx]$/.test(low)&&!/^(de|du|des|d’|d')/.test(low);
  return `${parent} ${low}${plural?"s":""}`;
}
// Ce que la fiche montre, sans HTML (tests, portage).
function mercenaryHoverData(c,{missionTag=null}={}){
  const reference=game.referenceData||{};
  const rules=typeof tagRules==="function"?tagRules():null;
  // Les tags allumés, seulement les plus précis (aucun de leurs sous-tags n'est allumé) ; celui de la mission d'abord.
  const lit=rules?rules.litIds(c):[];
  const precise=lit.filter(id=>!lit.some(other=>other.startsWith(id+"/")))
    .filter(id=>HOVER_TAG_BRANCHES.some(branch=>id===branch||id.startsWith(branch+"/")));
  const toneOf=id=>rules?.columns.find(col=>col.code===String(id).split("/")[0])?.teinte||"";
  const isMission=id=>Boolean(missionTag)&&(id===missionTag||id.startsWith(missionTag+"/"));
  // Le niveau de chaque tag (1 à 3 : la vue de l'arbre des tags), que la plaque montre (Idan, 2026-11-16).
  const shown=rules&&typeof rules.view==="function"?rules.view(c):{};
  const tags=precise.map(id=>({id,name:rules?.node(id)?.nom||id,tone:toneOf(id),mission:isMission(id),level:shown[id]?.level||3}))
    .sort((a,b)=>Number(b.mission)-Number(a.mission));
  for(const tag of tags){
    if(tags.filter(other=>other.name===tag.name).length<2) continue;
    const parent=rules?.node(tag.id.split("/").slice(0,-1).join("/"))?.nom;
    if(parent) tag.fullName=hoverTagFullName(parent,tag.name);
  }
  for(const tag of tags) if(tag.fullName){ tag.name=tag.fullName; delete tag.fullName; }
  // Les objets portés.
  const slots=c.equipment?.slots||{},items=c.items||[];
  const itemIn=slot=>slots[slot]==null?null:items.find(item=>String(item.id)===String(slots[slot]))||null;
  // Le nom de base de l'objet (« Épée longue », « Écu », « Armure de cuir » ; pas son titre selon le tier), d'un coup d'œil.
  const handLabel=item=>item?(item.name||item.category||""):"";
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
  // Le titre, comme la fiche complète : au masculin pour tous (Idan, 2026-11-15 : « garde au masculin (neutre) l'ensemble
  // des titres »).
  let title="";
  const profile=typeof profileRules==="function"?profileRules():null;
  if(profile){
    const context=evaluationContext(c),result=profile.evaluate(c,context);
    title=result&&profile.composeTitle?.(c,result,context)?.name||"";
  }
  const affinity=typeof captainAffinity==="function"?captainAffinity(c):null;
  return {
    name:c.name,title,
    people:c.people||"",culture:c.culture||"",ascendance:c.ascendance||"",
    origin:originPhrase({people:c.people||"",culture:c.culture||"",ascendance:c.ascendance||""}),
    bonus:Number(c.contract?.missionBonus??(typeof tavernRules==="function"?tavernRules().missionBonusDemand(c):0))||0,
    affinity:affinity?affinityPresentation(affinity.total,c):null,
    sets:[set(1),set(2)],
    armor:armor?(armor.name||ARMOR[armor.category]||armor.category):"",
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
  "elfes-noirs":"pointe-epines","elfes-des-grandes-cites":"rinceau","elfes-sylvains":"branche",
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
  // Sa couleur (data/reference/culture-colors.json), pour la phrase d'origine.
  const ref=typeof game!=="undefined"?game.referenceData||{}:{};
  const color=(ref.cultureColors?.rows||[]).find(row=>row.nom===culture)?.couleur;
  // Son kit graphique, s'il en a un (data/reference/culture-kits.json) : le cuir du cartouche et l'ornement du titre
  // à la taille choisie par Idan ; le cadre lui-même est posé par hoverKitFrame.
  const kit=(ref.cultureKits?.rows||[]).find(row=>row.culture===culture)||null;
  const texture=kit?[`--hc-texture:url("${kit.dossier}/${kit.geometrie.texture}")`,`--hc-kit-grain:${256*kit.fiche.cuir.grain/100}px`,
      `--hc-kit-sombre:${kit.fiche.cuir.sombre/100}`,...hoverKitTitleVars(kit)]
    :[`--hc-texture:url("assets/hud/barres/${key}/center.webp")`,`--hc-tex-w:${(bar.center/band).toFixed(4)}`,
      `--hc-tex-h:${(bar.h/band).toFixed(4)}`,`--hc-tex-y:${(top/band).toFixed(4)}`];
  return {key,ornament,color,kit,
    vars:[...texture,`--hc-orn:url("assets/fiche/ornements/${ornament}.svg")`,...(color?[`--hc-culture:${color}`]:[])].join(";")};
}

// ---- Les kits graphiques par culture (Chatty, Idan) : le cadre de la fiche ----
// Positions en pixels de la carte (860 × 565, styles.css), relevées sur ses zones : séparation portrait / texte (entre
// le portrait, 1,2 % + 34 %, et la page, 36,2 %), bas du cartouche (entre 15,85 % et la page, 17,25 %), milieux du
// portrait et de la page ; la hauteur du cartouche (14,35 %).
const HOVER_CARD={w:860,h:565,sepX:307,sepNomY:93.5,pageCx:580.5,portraitCx:156.5,cartH:81.08};
// Les coins : côté extérieur (x, y) ; transformations (pièces dessinées pour le coin haut gauche) et où elles envoient un
// point d'une toile carrée de n pixels.
const HOVER_KIT_ANGLES={
  hg:{sx:-1,sy:-1,miroir:["none",(x,y)=>[x,y]],rotation:["none",(x,y)=>[x,y]]},
  hd:{sx:1,sy:-1,miroir:["scaleX(-1)",(x,y,n)=>[n-x,y]],rotation:["rotate(90deg)",(x,y,n)=>[n-y,x]]},
  bd:{sx:1,sy:1,miroir:["scale(-1,-1)",(x,y,n)=>[n-x,n-y]],rotation:["rotate(180deg)",(x,y,n)=>[n-x,n-y]]},
  bg:{sx:-1,sy:1,miroir:["scaleY(-1)",(x,y,n)=>[x,n-y]],rotation:["rotate(270deg)",(x,y,n)=>[y,n-x]]}};
const hcPx=n=>`${+(+n).toFixed(2)}px`;
// L'ornement du titre à la hauteur choisie (pixels de la carte) : sa boîte commune 104 × 24, la pointe côté titre ; la
// partie vide de la boîte (vers l'extérieur) est rattrapée par une marge négative, et l'écart s'ajoute côté titre.
function hoverKitTitleVars(kit){
  const t=kit.fiche.titre,svg=24,h=t.hauteur,boite=h*104/svg,motif=h*kit.geometrie.ornementTitre.largeur/svg,k=v=>`calc(var(--hc-cart-h) * ${(v/HOVER_CARD.cartH).toFixed(4)})`;
  return [`--hc-orn-w:${k(boite)}`,`--hc-orn-h:${k(h)}`,`--hc-orn-vide:${k(boite-motif)}`,`--hc-orn-ecart:${k(t.ecart)}`];
}
// Une sangle droite de (a) à (b) le long d'un axe, centrée sur une ligne. pa et pb : où tombe, depuis chaque bout, la
// première limite de cellule (milieu entre deux clous) ; entre elles, un nombre entier de cellules, donc un pas régulier.
function hoverKitStrap(dir,S,axe,a,b,ligne,ep,pa=0,pb=0){
  const s=ep/S.coeur,lg=b-a;if(lg<=1)return "";
  const large=(S.coeur+2*S.bord)*s,pas=S.pas*s,dedans=Math.max(pas,lg-pa-pb),cell=dedans/Math.max(1,Math.round(dedans/pas));
  return axe==="x"
    ?`<i style="left:${hcPx(a)};top:${hcPx(ligne-large/2)};width:${hcPx(lg)};height:${hcPx(large)};background:url('${dir}/${S.h}') ${hcPx(pa)} 0/${hcPx(cell)} ${hcPx(large)} repeat-x"></i>`
    :`<i style="left:${hcPx(ligne-large/2)};top:${hcPx(a)};width:${hcPx(large)};height:${hcPx(lg)};background:url('${dir}/${S.v}') 0 ${hcPx(pa)}/${hcPx(large)} ${hcPx(cell)} repeat-y"></i>`;
}
// Le coin sobre d'un angle : l'image (bras coupés avant leur embout), le bout de chaque bras et où la bordure qui le
// prolonge place sa première limite de cellule, pour que le clou suivant tombe un pas après le dernier clou du coin.
function hoverKitCorner(kit,a,bords){
  const G=kit.geometrie.coinSobre,c=kit.fiche.coins[a],A=HOVER_KIT_ANGLES[a],s=kit.fiche.cadre.ep/G.coeur,n=G.n,[tr,f]=A[c.sens];
  const ox=A.sx<0?bords.x0:bords.x1,oy=A.sy<0?bords.y0:bords.y1;
  const [ax,ay]=f(G.ax,G.ay,n),left=ox-ax*s+c.dx,top=oy-ay*s+c.dy;
  const phase=(clou,coupe,pas)=>((clou+pas/2-coupe)%pas+pas)%pas*s;
  const bras=[{p:f(G.coupeX,G.ay,n),d:phase(G.clouX,G.coupeX,G.pasX)},{p:f(G.ax,G.coupeY,n),d:phase(G.clouY,G.coupeY,G.pasV)}]
    .map(b=>({x:left+b.p[0]*s,y:top+b.p[1]*s,d:b.d}));
  const hor=bras.find(b=>Math.abs(b.y-(top+ay*s))<1)||bras[0],ver=bras.find(b=>b!==hor);
  return {html:`<img src="${kit.dossier}/${G.f}" alt="" style="left:${hcPx(left)};top:${hcPx(top)};width:${hcPx(n*s)};height:${hcPx(n*s)};clip-path:inset(0 ${hcPx((n-G.coupeX)*s)} ${hcPx((n-G.coupeY)*s)} 0);transform:${tr}">`,
    finX:hor.x,phaseX:hor.d,finY:ver.y,phaseY:ver.d};
}
// Le cadre : d'abord le cadre de base (séparation, sous le nom, raccords en T, bordure entre les bouts des bras des coins
// sobres, coins), puis les ornements (chaîne torsadée, ornements de coin, chaîne suspendue, couronne).
function hoverKitFrame(kit){
  if(!kit) return "";
  const G=kit.geometrie,F=kit.fiche,dir=kit.dossier,e=F.cadre.ep,C=F.cotes,out=[];
  const B={x0:C.gauche,x1:HOVER_CARD.w+C.droite,y0:C.haut,y1:HOVER_CARD.h+C.bas};
  const coins=F.cadre.sobres?Object.fromEntries(Object.keys(HOVER_KIT_ANGLES).map(a=>[a,hoverKitCorner(kit,a,B)])):{};
  // Les côtés verticaux à l'échelle du bras vertical du coin sobre, dessiné 5 % plus petit.
  const eV=F.cadre.style==="gros"&&F.cadre.sobres?e*G.coinSobre.coeurV/G.coinSobre.coeur:e;
  const mi={haut:B.y0+e/2,bas:B.y1-e/2,gauche:B.x0+eV/2,droite:B.x1-eV/2};
  const S=F.separation,sx=HOVER_CARD.sepX+S.dx,se=S.ep,T=G.raccordT,Tk=se/T.coeur;
  const raccords=[];
  // La sangle sous le nom passe sous la séparation verticale (Idan, 2026-11-16 : « la barre en cuir cloutée horizontale
  // sous la barre cuir clouée verticale qui est à gauche ») : posée avant elle.
  if(F.sousNom.style!=="aucune") out.push(hoverKitStrap(dir,G.sangles[F.sousNom.style],"x",sx,B.x1-e/2,HOVER_CARD.sepNomY+F.sousNom.dy,se));
  if(S.style!=="aucune"){
    out.push(hoverKitStrap(dir,G.sangles[S.style],"y",B.y0,B.y1,sx,se));
    if(S.raccords!=="aucun"){
      const pose=(p,y,retourne)=>`<img src="${dir}/${T.f}" alt="" style="left:${hcPx(sx-T.cx*Tk+p.dx)};top:${hcPx(y+p.dy)};width:${hcPx(T.w*Tk)};height:${hcPx(T.h*Tk)}${retourne?";transform:scaleY(-1)":""}">`;
      raccords.push(pose(S.tHaut,B.y0+(e-se)/2-T.haut*Tk,false),pose(S.tBas,B.y1-(e-se)/2-(T.h-T.haut)*Tk,true));
    }
  }
  if(S.raccords==="dessous") out.push(...raccords);
  if(F.cadre.style!=="aucune"){
    // Chaque côté part du bout des bras (un demi-pixel sous le coin, pour ne laisser aucun jour).
    const st=G.sangles[F.cadre.style],c=coins,gros=F.cadre.style==="gros",lo=.5,ph=(x,cle)=>gros&&x?x[cle]+lo:0;
    out.push(hoverKitStrap(dir,st,"x",c.hg?c.hg.finX-lo:B.x0,c.hd?c.hd.finX+lo:B.x1,mi.haut,e,ph(c.hg,"phaseX"),ph(c.hd,"phaseX")));
    out.push(hoverKitStrap(dir,st,"x",c.bg?c.bg.finX-lo:B.x0,c.bd?c.bd.finX+lo:B.x1,mi.bas,e,ph(c.bg,"phaseX"),ph(c.bd,"phaseX")));
    out.push(hoverKitStrap(dir,st,"y",c.hg?c.hg.finY-lo:B.y0,c.bg?c.bg.finY+lo:B.y1,mi.gauche,eV,ph(c.hg,"phaseY"),ph(c.bg,"phaseY")));
    out.push(hoverKitStrap(dir,st,"y",c.hd?c.hd.finY-lo:B.y0,c.bd?c.bd.finY+lo:B.y1,mi.droite,eV,ph(c.hd,"phaseY"),ph(c.bd,"phaseY")));
  }
  if(S.raccords==="dessus") out.push(...raccords);
  for(const c of Object.values(coins)) out.push(c.html);
  // Les ornements.
  const tor=F.chaineTorsadee,TG=G.chaineTorsadee;
  if(tor.place!=="aucune"){
    const w=tor.taille,h=w*TG.h/TG.w,pas=Math.max(2,h+tor.espacement),vertical=["separation","gauche","droite"].includes(tor.place);
    const L=(vertical?HOVER_CARD.h:HOVER_CARD.w)*tor.longueur/100,nb=Math.max(1,Math.floor((L-h)/pas)+1),total=h+(nb-1)*pas;
    const maillons=Array.from({length:nb},(_,i)=>`<img src="${dir}/${TG.f}" alt="" style="left:0;top:${hcPx(i*pas)};width:${hcPx(w)};height:${hcPx(h)}">`).join("");
    if(vertical){
      const cx={separation:sx,gauche:mi.gauche,droite:mi.droite}[tor.place];
      out.push(`<span style="left:${hcPx(cx-w/2+tor.dx)};top:${hcPx((HOVER_CARD.h-total)/2+tor.dy)};width:${hcPx(w)};height:${hcPx(total)}">${maillons}</span>`);
    }else{
      const cy=tor.place==="bas"?mi.bas:mi.haut;
      out.push(`<span style="left:${hcPx(HOVER_CARD.w/2-w/2+tor.dx)};top:${hcPx(cy-total/2+tor.dy)};width:${hcPx(w)};height:${hcPx(total)};transform:rotate(90deg)">${maillons}</span>`);
    }
  }
  for(const [a,A] of Object.entries(HOVER_KIT_ANGLES)){
    const o=F.ornementsCoin[a];if(!o||o.modele==="aucun")continue;
    const x=(A.sx<0?B.x0:B.x1-o.taille)+o.dx,y=(A.sy<0?B.y0:B.y1-o.taille)+o.dy;
    out.push(`<img src="${dir}/${G.ornementsCoin[o.modele]}" alt="" style="left:${hcPx(x)};top:${hcPx(y)};width:${hcPx(o.taille)};height:${hcPx(o.taille)};object-fit:contain;object-position:0 0;transform:${A[o.sens][0]}">`);
  }
  const ch=F.chaine,CG=G.chaine;
  if(ch.place!=="aucune"){
    const W=ch.taille,H=W*CG.h/CG.w;
    if(ch.place.startsWith("coin")){
      const L=W/Math.SQRT2,g=ch.place==="coin-g",cx=(g?L/2+mi.gauche:HOVER_CARD.w-L/2+C.droite-e/2)+ch.dx,cy=L/2+mi.haut+ch.dy;
      out.push(`<img src="${dir}/${CG.f}" alt="" style="left:${hcPx(cx-W/2)};top:${hcPx(cy)};width:${hcPx(W)};height:${hcPx(H)};transform-origin:50% 0;transform:rotate(${g?-45:45}deg)">`);
    }else{
      const cx={"haut-portrait":HOVER_CARD.portraitCx,"haut-page":HOVER_CARD.pageCx,"sous-nom":HOVER_CARD.pageCx}[ch.place];
      const y0=(ch.place==="sous-nom"?HOVER_CARD.sepNomY:mi.haut)+ch.dy;
      out.push(`<img src="${dir}/${CG.f}" alt="" style="left:${hcPx(cx-W/2+ch.dx)};top:${hcPx(y0-H*CG.attache)};width:${hcPx(W)};height:${hcPx(H)}">`);
    }
  }
  const co=F.couronne,KG=G.couronne;
  if(co.place!=="aucune"){
    const W=co.taille,H=W*KG.h/KG.w,[cote,ou]=co.place.split("-");
    const cx={page:HOVER_CARD.pageCx,centre:HOVER_CARD.w/2,portrait:HOVER_CARD.portraitCx}[ou],ligne=cote==="bas"?mi.bas:mi.haut;
    // Sa base (le bandeau à pointes, en bas de l'image) chevauche la bordure ; retournée, elle pend sous la ligne.
    const haut=co.retournee?ligne-H*KG.base:ligne-H+H*KG.base;
    out.push(`<img src="${dir}/${KG.f}" alt="" style="left:${hcPx(cx-W/2+co.dx)};top:${hcPx(haut+co.dy)};width:${hcPx(W)};height:${hcPx(H)};transform:${co.retournee?"scaleY(-1)":"none"}">`);
  }
  return `<div class="hc-cadre" aria-hidden="true">${out.join("")}</div>`;
}

// La forme : la direction « A · Le diptyque » de Chatty (Idan, 2026-11-15). Une carte et un avatar aux dimensions fixes,
// aux proportions de Chatty (styles.css) ; le cadre vient du kit graphique de la culture, posé par-dessus
// (hoverKitFrame ; les cultures sans kit n'en ont pas encore). À gauche le portrait en pied ; à droite le
// cartouche du nom, puis une page claire : origines, réputation, affinité, prime, tags, armes, écoles.
// Les cœurs de l'affinité : à facettes, comme les étoiles de la réputation (Idan, 2026-11-16 : « des coeurs assortis aux
// étoiles… avoir un style commun, c'est important » ; images : assets/ui/coeurs/, styles.css).
// Les armes d'un set, comme Idan les dit : « Épée longue et écu ».
function hoverWeapons(names){
  return names.map((name,i)=>i?name.charAt(0).toLocaleLowerCase("fr")+name.slice(1):name).join(" et ");
}
function hoverHearts(filled){
  return Array.from({length:10},(_,i)=>`<i class="hc-heart${i<filled?" is-full":""}"></i>`).join("");
}
function renderMercenaryHoverCard(c,{missionTag=null}={}){
  const d=mercenaryHoverData(c,{missionTag});
  const frame=hoverCultureFrame(d.culture);
  // Le nom en grand (Idan, 2026-11-15 : « on reste pour que 20 caractères rentrent dans le cartouche. On réduira auto pour
  // les noms plus longs ») : sa taille (styles.css) laisse tenir les noms de 20 caractères les plus larges ; au-delà, il
  // rapetisse d'autant (20 / longueur), et fitHoverCard finit le travail s'il le faut.
  const nameFit=Math.max(.6,Math.min(1,20/d.name.length));
  // Zone 2, les origines : les deux ou trois pictos (peuple, culture, ascendance), puis la phrase d'origine.
  const emblems=["people","culture","ascendance"].filter(kind=>d[kind])
    .map(kind=>`<span class="hc-emblem">${renderPicto(kind,d[kind],{size:"md"})}</span>`).join("");
  const affinity=d.affinity?`<div class="hc-stat"><span class="hc-label">Affinité</span><span class="hc-hearts" title="${esc(d.affinity.phrase)}">${hoverHearts(d.affinity.filled)}</span></div>`:"";
  // L'équipement en trois colonnes (Idan, 2026-11-16) : les armes du set 1 (« épée longue et écu »), celles du set 2, l'armure.
  // Sa monture, s'il en a une, dessous.
  const kitItem=([label,value])=>`<span class="hc-kit-item"><b>${esc(label)}</b><i>${esc(value)}</i></span>`;
  const kit=[["Set 1",hoverWeapons(d.sets[0])||"Mains nues"],["Set 2",hoverWeapons(d.sets[1])||"—"],["Armure",d.armor||"Sans armure"]].map(kitItem).join("");
  const mount=d.mount?kitItem(["Monture",d.mount.name+(d.mount.kind?` (${d.mount.kind})`:"")]):"";
  // Les pictos des écoles d'Idan (assets/pictos/ecole-<slug>.webp).
  const schools=d.schools.map(name=>`<span class="hc-school">${renderPicto("school",name,{size:"md"})}<span>${esc(name)}</span></span>`).join("");
  const tags=hoverTagPlates(d.tags).map(tag=>`<li class="hc-tag hc-tag--${esc(tag.tone)}${tag.mission?" is-mission":""}${tag.more?" is-more":""}${tag.level<3?` is-n${tag.level}`:""}" style="grid-column:${tag.col}/span 2"${tag.more?` title="${esc(tag.hidden.join(", "))}"`:""}>${esc(tag.name)}</li>`).join("");
  return `<article class="hover-card" data-culture="${esc(frame.key)}"${frame.kit?` data-kit="${esc(frame.kit.cle)}"`:""} style='${frame.vars};--hc-name-fit:${nameFit.toFixed(3)}' aria-label="${esc(d.name)}">
    <div class="hc-portrait">${renderAvatar(c,{variant:"detail",kind:"full"})}</div>
    <header class="hc-banner"><h3>${esc(d.name)}</h3>${d.title?`<p class="hc-title"><i class="hc-orn hc-orn--l" aria-hidden="true"></i><span>${esc(d.title)}</span><i class="hc-orn hc-orn--r" aria-hidden="true"></i></p>`:""}</header>
    <div class="hc-page">
      <div class="hc-head">
        <section class="hc-origins" aria-label="Origines"><div class="hc-emblems">${emblems}</div><p class="hc-origin">${esc(d.origin)}</p></section>
        <i class="hc-fente" aria-hidden="true"></i>
        <div class="hc-stats">
          <div class="hc-stat"><span class="hc-label">Réputation</span>${renderReputationStars(c)}</div>
          ${affinity}
          <div class="hc-stat hc-stat--bonus"><span class="hc-label" title="Prime de mission">Prime</span><span class="hc-bonus"><img src="assets/hud/picto-or.webp" alt=""><b>${esc(goldAmount(d.bonus))} PO</b></span></div>
        </div>
      </div>
      <i class="hc-sep" aria-hidden="true"></i>
      ${tags?`<ul class="hc-tags">${tags}</ul><i class="hc-fente hc-fente--h" aria-hidden="true"></i>`:""}
      <div class="hc-kit">${kit}</div>
      ${mount?`<div class="hc-mount">${mount}</div>`:""}
      ${schools?`<i class="hc-rule" aria-hidden="true"></i><div class="hc-magic"><span class="hc-plaque">Écoles de magie</span><div class="hc-schools" style="--n:${Math.min(3,d.schools.length)}">${schools}</div></div>`:""}
    </div>
    ${hoverKitFrame(frame.kit)}
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
  // Le nom et le titre tiennent dans la hauteur du cartouche (sans le bas réservé des fiches au kit), avec 3 px de marge en
  // haut et en bas (les jambages).
  const bannerFits=()=>{
    const cs=getComputedStyle(banner),gap=parseFloat(cs.rowGap)||0,room=banner.clientHeight-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0);
    return (name?name.offsetHeight:0)+gap+title.parentElement.offsetHeight<=room-6;
  };
  if(name) shrink(name,()=>name.scrollWidth<=name.clientWidth+1,.6);
  // La phrase d'origine : une ligne, sa police baisse jusqu'à 82 % s'il le faut ; au-delà, elle passe sur deux lignes.
  const origin=root.querySelector(".hc-origin");
  if(origin){
    origin.style.whiteSpace="nowrap";
    if(!shrink(origin,()=>origin.scrollWidth<=origin.clientWidth+1,.82)) origin.style.whiteSpace="";
  }
  if(title&&!shrink(title,()=>title.scrollWidth<=title.clientWidth+1,.75)){
    // Un titre sur deux lignes : le nom, très grand, laisse d'abord un peu de place, puis le titre rapetisse s'il le faut.
    title.parentElement.classList.add("is-two-lines");
    if(name) shrink(name,bannerFits,.8);
    shrink(title,()=>title.scrollWidth<=title.clientWidth+1&&bannerFits(),.8);
  }
}

// Où poser la fiche à côté de ce qu'on survole (anchor : son rectangle à l'écran ; view : l'écran ; card : la fiche).
// À droite s'il y a la place, sinon à gauche, sinon du côté le plus large, la fiche rapetissant pour y tenir (jusqu'à
// minScale) ; à la hauteur du survol, sans sortir de l'écran ; plus petite aussi si l'écran est trop petit pour elle.
// margin : la place des ornements du cadre qui débordent. Logique pure, sans page web (tests, portage).
function hoverCardPlacement({anchor,view,card={w:HOVER_CARD.w,h:HOVER_CARD.h},gap=12,margin=30,minScale=.6}){
  let scale=Math.min(1,(view.h-2*margin)/card.h,(view.w-2*margin)/card.w);
  const right=view.w-margin-anchor.right-gap,left=anchor.left-gap-margin;
  const side=right>=card.w*scale?"right":left>=card.w*scale?"left":right>=left?"right":"left";
  scale=Math.min(scale,Math.max(minScale,(side==="right"?right:left)/card.w));
  const w=card.w*scale,h=card.h*scale;
  const x=side==="right"?Math.min(anchor.right+gap,view.w-margin-w):Math.max(anchor.left-gap-w,margin);
  const y=Math.min(Math.max(margin,(anchor.top+anchor.bottom-h)/2),view.h-margin-h);
  return {x:Math.round(x),y:Math.round(y),scale:Number(scale.toFixed(3)),side};
}

if(typeof module!=="undefined"&&module.exports) module.exports={mercenaryHoverData,hoverWeapons,hoverTagPlates,hoverTagFullName,renderMercenaryHoverCard,hoverCultureFrame,hoverKitFrame,fitHoverCard,hoverCardPlacement,originPhrase};
