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
const ORIGIN_CULTURE_WORDS={"Explorateurs":"explorateur","Empire de la nuit blanche":"de l'empire de la nuit blanche"};
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

// Les plaques des tags (Idan, 2026-11-16 : « on va en mettre jusqu'à 5 en quinconce. S'il existe 6 tags ou plus on marque
// dans le dernier x autres rôles ») : au plus 5, trois en haut et deux décalés dessous, chaque rangée centrée ; à partir de
// 6, les 4 premiers et une plaque « N autres rôles ». col : la colonne où commence la plaque, sur une grille de 6 (chaque
// plaque en prend 2). Logique pure (tests, portage).
const HOVER_TAG_MAX=5;
function hoverTagPlates(tags,max=HOVER_TAG_MAX){
  const extra=tags.length>max?tags.length-(max-1):0;
  const plates=extra?[...tags.slice(0,max-1),{name:`${extra} autres rôles`,tone:"bleu",mission:false,more:true,hidden:tags.slice(max-1).map(tag=>tag.name)}]:tags.slice(0,max);
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
function mercenaryHoverData(c){
  const reference=game.referenceData||{};
  // Les tags (Idan, 2026-11-22 ; doc 20 §12 : « sur la fiche au survol, ça remplace les tags actuels ») : ceux de l'atelier
  // des tags, calculés sur ce que l'intendant voit de lui (mercenaryTagList, ui.js), en bleu comme le rôle au combat ;
  // déjà les plus précis (le plus bas de chaque branche).
  const tags=(typeof mercenaryTagList==="function"?mercenaryTagList(c):[]).map(t=>({id:t.id,name:t.name,parent:t.parent,tone:"bleu",mission:false}));
  for(const tag of tags){
    if(tags.filter(other=>other.name===tag.name).length>1&&tag.parent) tag.fullName=hoverTagFullName(tag.parent,tag.name);
  }
  for(const tag of tags){ if(tag.fullName){ tag.name=tag.fullName; delete tag.fullName; } delete tag.parent; }
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
    // Son nom (celui qu'on lui a donné, stables.js), son espèce (mounts.json), son code (pour son portrait).
    mount:mountItem?(()=>{
      const name=mountItem.petName||mountItem.name||mountKind,kind=mountKind||mountItem.name||"";
      return {name,kind:kind&&kind!==name?kind:"",code:mountItem.mountCode||""};
    })():null,
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
  "cites-libres":"lys","empire-de-la-nuit-blanche":"flocon","tribus-de-la-jungle":"fleur",
  "terres-des-deux-fleuves":"croissant-haut","royaumes-du-soleil-levant":"dragon",
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
  // Son kit graphique, s'il en a un (data/reference/culture-kits.json) : le cuir du cartouche (sa teinte, assombri) et
  // l'ornement du titre (la silhouette du kit, s'il en a une) à la taille choisie par Idan ; le cadre lui-même est posé
  // par hoverKitFrame.
  const kit=(ref.cultureKits?.rows||[]).find(row=>row.culture===culture)||null;
  const texture=kit?[`--hc-texture:url("${kit.dossier}/${kit.geometrie.texture}")`,`--hc-kit-grain:${256*kit.fiche.cuir.grain/100}px`,
      `--hc-kit-voile:${kit.geometrie.voile}`,`--hc-kit-sombre:${kit.fiche.cuir.sombre/100}`,...hoverKitTitleVars(kit)]
    :[`--hc-texture:url("assets/hud/barres/${key}/center.webp")`,`--hc-tex-w:${(bar.center/band).toFixed(4)}`,
      `--hc-tex-h:${(bar.h/band).toFixed(4)}`,`--hc-tex-y:${(top/band).toFixed(4)}`];
  const titre=kit?.geometrie.ornementTitre.f?`${kit.dossier}/${kit.geometrie.ornementTitre.f}`:`assets/fiche/ornements/${ornament}.svg`;
  return {key,ornament,color,kit,
    vars:[...texture,`--hc-orn:url("${titre}")`,...(color?[`--hc-culture:${color}`]:[])].join(";")};
}

// ---- Les kits graphiques par culture (Chatty, Idan) : le cadre de la fiche ----
// Positions en pixels de la carte (860 × 565, styles.css), relevées sur ses zones : séparation portrait / texte (entre
// le portrait, 1,2 % + 34 %, et la page, 36,2 %), bas du cartouche (entre 15,85 % et la page, 17,25 %), milieux du
// portrait et de la page ; la hauteur du cartouche (14,35 %).
const HOVER_CARD={w:860,h:565,sepX:307,sepNomY:93.5,pageCx:580.5,portraitCx:156.5,cartH:81.08};
// Les coins : côté extérieur (x, y) ; transformations (pièces dessinées pour le coin haut gauche ; le coin du cadre se
// retourne autour de son angle extérieur, les ornements autour de leur milieu) et où elles envoient un point.
const HOVER_KIT_ANGLES={
  hg:{sx:-1,sy:-1,miroir:["none",(x,y)=>[x,y]],rotation:["none",(x,y)=>[x,y]]},
  hd:{sx:1,sy:-1,miroir:["scaleX(-1)",(x,y)=>[-x,y]],rotation:["rotate(90deg)",(x,y)=>[-y,x]]},
  bd:{sx:1,sy:1,miroir:["scale(-1,-1)",(x,y)=>[-x,-y]],rotation:["rotate(180deg)",(x,y)=>[-x,-y]]},
  bg:{sx:-1,sy:1,miroir:["scaleY(-1)",(x,y)=>[x,-y]],rotation:["rotate(270deg)",(x,y)=>[y,-x]]}};
const hcPx=n=>`${+(+n).toFixed(2)}px`;
// Un ornement de coin dont l'image a grandi après coup (data/reference/culture-kits.json, geometrie.ornementsCoinDebord :
// la part de sa largeur ajoutée en haut, au-delà de l'ancien bord) : ce morceau déborde du coin, et la pièce reste où
// Idan l'a réglée. Le décalage suit le sens de la pièce (miroir ou rotation). t : la taille de l'ornement à l'écran.
function hoverKitOrnamentShift(G,o,A,t){
  const debord=Number(G.ornementsCoinDebord?.[o.modele])||0;
  return debord?A[o.sens][1](0,-debord*t):[0,0];
}
// Une pièce à sa place exacte : le navigateur arrondit au pixel la place d'un élément (left, top), pas une translation ;
// la partie entière en left / top, le reste en translation (sinon les raccords se décalent d'un demi-pixel).
const hcPose=(x,y)=>{const ix=Math.floor(x+1e-6),iy=Math.floor(y+1e-6);return `left:${ix}px;top:${iy}px;translate:${hcPx(x-ix)} ${hcPx(y-iy)}`;};
// L'ornement du titre à la hauteur choisie (pixels de la carte). Une silhouette du kit (image) : le motif remplit sa
// boîte. Sinon un ornement de la charte (SVG) : sa boîte commune 104 × 24, la pointe côté titre ; la partie vide de la
// boîte (vers l'extérieur) est rattrapée par une marge négative. L'écart s'ajoute côté titre.
function hoverKitTitleVars(kit){
  const t=kit.fiche.titre,O=kit.geometrie.ornementTitre,h=t.hauteur,k=v=>`calc(var(--hc-cart-h) * ${(v/HOVER_CARD.cartH).toFixed(4)})`;
  const boite=O.f?h*O.w/O.h:h*104/24,motif=O.f?boite:h*O.largeur/24;
  return [`--hc-orn-w:${k(boite)}`,`--hc-orn-h:${k(h)}`,`--hc-orn-vide:${k(boite-motif)}`,`--hc-orn-ecart:${k(t.ecart)}`];
}
// Une bande droite de (a) à (b) le long d'un axe, d'épaisseur ep, posée par son bord extérieur (bord : le haut d'une bande
// horizontale, la gauche d'une verticale ; retournée, le bas ou la droite, et elle se retourne autour de ce bord, pour que
// son liseré extérieur reste dehors). pa et pb : où tombe, depuis chaque bout, la première limite de cellule ; entre
// elles, un nombre entier de cellules, donc un pas régulier.
function hoverKitStrap(dir,C,axe,a,b,bord,ep,pa=0,pb=0,retourne=false){
  const s=ep/C.coeur,lg=b-a;if(lg<=1)return "";
  const pas=C.pas*s,dedans=Math.max(pas,lg-pa-pb),cell=dedans/Math.max(1,Math.round(dedans/pas));
  return axe==="x"
    ?`<i style="${hcPose(a,bord)};width:${hcPx(lg)};height:${hcPx(ep)};background:url('${dir}/${C.f}') ${hcPx(pa)} 0/${hcPx(cell)} ${hcPx(ep)} repeat-x${retourne?";transform-origin:0 0;transform:scaleY(-1)":""}"></i>`
    :`<i style="${hcPose(bord,a)};width:${hcPx(ep)};height:${hcPx(lg)};background:url('${dir}/${C.f}') 0 ${hcPx(pa)}/${hcPx(ep)} ${hcPx(cell)} repeat-y${retourne?";transform-origin:0 0;transform:scaleX(-1)":""}"></i>`;
}
// Le coin d'un angle, posé par son angle extérieur sur le bord du cadre (en largeur à l'échelle de la bande de gauche, en
// hauteur à celle du haut) : l'image (bras coupés où la bordure prend le relais), le bout de chaque bras et où la bordure
// qui le prolonge place sa première limite de cellule, pour que le clou suivant tombe un pas après le dernier du coin.
function hoverKitCorner(kit,a,bords,e,eV){
  const G=kit.geometrie.cadre.coin,c=kit.fiche.coins[a],A=HOVER_KIT_ANGLES[a],sx=eV/G.coeurV,sy=e/G.coeur,n=G.n,[tr,f]=A[c.sens];
  const left=(A.sx<0?bords.x0:bords.x1)+c.dx,top=(A.sy<0?bords.y0:bords.y1)+c.dy;
  const phase=(clou,coupe,pas,k)=>((clou+pas/2-coupe)%pas+pas)%pas*k;
  const bras=[{p:f(G.coupeX*sx,0),d:phase(G.clouX,G.coupeX,G.pasX,sx)},{p:f(0,G.coupeY*sy),d:phase(G.clouY,G.coupeY,G.pasV,sy)}]
    .map(b=>({x:left+b.p[0],y:top+b.p[1],d:b.d}));
  const hor=bras.find(b=>Math.abs(b.y-top)<.01)||bras[0],ver=bras.find(b=>b!==hor);
  return {html:`<i style="${hcPose(left,top)};width:${hcPx(n*sx)};height:${hcPx(n*sy)};background:url('${kit.dossier}/${G.f}') 0 0/${hcPx(n*sx)} ${hcPx(n*sy)} no-repeat;clip-path:inset(0 ${hcPx((n-G.coupeX)*sx)} ${hcPx((n-G.coupeY)*sy)} 0);transform-origin:0 0;transform:${tr}"></i>`,
    finX:hor.x,phaseX:hor.d,finY:ver.y,phaseY:ver.d};
}
// Une jonction en T (Idan, 2026-11-18 : « Il y a justement des jonctions en T ») : la pièce du cadre où le liseré de la
// bande tourne dans la barre, posée par-dessus. A : le bord extérieur de la bande (ou de la barre) rejointe, au milieu de
// la tige ; d : vers l'intérieur ; a : le long de la bande ; barre et tige : les épaisseurs à rejoindre ; o : décalage.
function hoverKitJunction(kit,A,d,a,barre,tige,o){
  const J=kit.geometrie.cadre.jonction,kx=tige/J.tige,ky=barre/J.barre,w=J.w*kx,h=J.h*ky;
  const ox=A[0]+o.dx-J.cx*kx*a[0]+J.y0*ky*d[0],oy=A[1]+o.dy-J.cx*kx*a[1]+J.y0*ky*d[1];
  return `<i style="${hcPose(ox,oy)};width:${hcPx(w)};height:${hcPx(h)};background:url('${kit.dossier}/${J.f}') 0 0/${hcPx(w)} ${hcPx(h)} no-repeat;transform-origin:0 0;transform:matrix(${a[0]},${a[1]},${d[0]},${d[1]},0,0)"></i>`;
}
// Le cadre : d'abord le cadre de base (la bande sous le nom, la barre du milieu, la bordure entre les bouts des bras des
// coins, les jonctions en T, les coins), puis les ornements (allongé, de coin, suspendu, posé).
function hoverKitFrame(kit){
  if(!kit) return "";
  const G=kit.geometrie,K=G.cadre,F=kit.fiche,dir=kit.dossier,C=F.cotes,out=[];
  // Les épaisseurs restent des pixels entiers : le navigateur arrondit au pixel la taille d'un motif répété. Les côtés
  // gardent les proportions de l'original (bande de gauche contre bande du haut).
  const e=Math.round(F.cadre.ep),eV=Math.round(e*K.coin.coeurV/K.coin.coeur);
  const B={x0:C.gauche,x1:HOVER_CARD.w+C.droite,y0:C.haut,y1:HOVER_CARD.h+C.bas};
  const coins=Object.fromEntries(Object.keys(HOVER_KIT_ANGLES).map(a=>[a,hoverKitCorner(kit,a,B,e,eV)]));
  const mi={haut:B.y0+e/2,bas:B.y1-e/2,gauche:B.x0+eV/2,droite:B.x1-eV/2};
  const S=F.separation,N=F.sousNom,sx=HOVER_CARD.sepX+S.dx,se=Math.round(S.ep),nomY=HOVER_CARD.sepNomY+N.dy,nomEp=Math.round(N.ep);
  // La bande sous le nom (la barre du milieu couchée) part du milieu de la barre du milieu, qui la recouvre.
  out.push(hoverKitStrap(dir,K.mh,"x",sx,B.x1-eV/2,nomY-nomEp/2,nomEp));
  out.push(hoverKitStrap(dir,K.m,"y",B.y0,B.y1,sx-se/2,se));
  // La bordure, entre les bouts des bras des coins (elle passe 3 px dessous, pour qu'aucun jour ne reste au raccord) ; en
  // bas et à droite, retournée.
  const c=coins,lo=3,ph=(x,cle)=>x[cle]+lo;
  out.push(hoverKitStrap(dir,K.h,"x",c.hg.finX-lo,c.hd.finX+lo,B.y0,e,ph(c.hg,"phaseX"),ph(c.hd,"phaseX")));
  out.push(hoverKitStrap(dir,K.h,"x",c.bg.finX-lo,c.bd.finX+lo,B.y1,e,ph(c.bg,"phaseX"),ph(c.bd,"phaseX"),true));
  out.push(hoverKitStrap(dir,K.v,"y",c.hg.finY-lo,c.bg.finY+lo,B.x0,eV,ph(c.hg,"phaseY"),ph(c.bg,"phaseY")));
  out.push(hoverKitStrap(dir,K.v,"y",c.hd.finY-lo,c.bd.finY+lo,B.x1,eV,ph(c.hd,"phaseY"),ph(c.bd,"phaseY"),true));
  // Les jonctions : la barre du milieu dans la bordure, en haut et en bas ; la bande sous le nom dans la barre du milieu
  // et dans la bordure de droite.
  if(S.jonctions) out.push(hoverKitJunction(kit,[sx,B.y0],[0,1],[1,0],e,se,S.tHaut),hoverKitJunction(kit,[sx,B.y1],[0,-1],[1,0],e,se,S.tBas));
  if(N.jonctions) out.push(hoverKitJunction(kit,[sx-se/2,nomY],[1,0],[0,1],se,nomEp,N.tPortrait),hoverKitJunction(kit,[B.x1,nomY],[-1,0],[0,1],eV,nomEp,N.tBord));
  for(const k of Object.values(coins)) out.push(k.html);
  // Les ornements.
  const al=F.allonge,AG=G.allonge;
  if(al.place!=="aucune"){
    const w=al.taille,h=w*AG.h/AG.w,pas=Math.max(2,h+al.espacement),vertical=["separation","gauche","droite"].includes(al.place);
    const L=(vertical?HOVER_CARD.h:HOVER_CARD.w)*al.longueur/100,nb=Math.max(1,Math.floor((L-h)/pas)+1),total=h+(nb-1)*pas;
    const maillons=Array.from({length:nb},(_,i)=>`<img src="${dir}/${AG.f}" alt="" style="left:0;top:${hcPx(i*pas)};width:${hcPx(w)};height:${hcPx(h)}">`).join("");
    if(vertical){
      const cx={separation:sx,gauche:mi.gauche,droite:mi.droite}[al.place];
      out.push(`<span style="left:${hcPx(cx-w/2+al.dx)};top:${hcPx((HOVER_CARD.h-total)/2+al.dy)};width:${hcPx(w)};height:${hcPx(total)}">${maillons}</span>`);
    }else{
      const cy=al.place==="bas"?mi.bas:mi.haut;
      out.push(`<span style="left:${hcPx(HOVER_CARD.w/2-w/2+al.dx)};top:${hcPx(cy-total/2+al.dy)};width:${hcPx(w)};height:${hcPx(total)};transform:rotate(90deg)">${maillons}</span>`);
    }
  }
  for(const [a,A] of Object.entries(HOVER_KIT_ANGLES)){
    const o=F.ornementsCoin[a];if(!o||o.modele==="aucun"||!G.ornementsCoin[o.modele])continue;
    const [sx,sy]=hoverKitOrnamentShift(G,o,A,o.taille);
    const x=(A.sx<0?B.x0:B.x1-o.taille)+o.dx+sx,y=(A.sy<0?B.y0:B.y1-o.taille)+o.dy+sy;
    out.push(`<img src="${dir}/${G.ornementsCoin[o.modele]}" alt="" style="left:${hcPx(x)};top:${hcPx(y)};width:${hcPx(o.taille)};height:${hcPx(o.taille)};object-fit:contain;object-position:0 0;transform:${A[o.sens][0]}">`);
  }
  const su=F.suspendu,SG=G.suspendu;
  if(su.place!=="aucune"){
    const W=su.taille,H=W*SG.h/SG.w;
    if(su.place.startsWith("coin")){
      const L=W/Math.SQRT2,g=su.place==="coin-g",cx=(g?L/2+mi.gauche:HOVER_CARD.w-L/2+C.droite-eV/2)+su.dx,cy=L/2+mi.haut+su.dy;
      out.push(`<img src="${dir}/${SG.f}" alt="" style="left:${hcPx(cx-W/2)};top:${hcPx(cy)};width:${hcPx(W)};height:${hcPx(H)};transform-origin:50% 0;transform:rotate(${g?-45:45}deg)">`);
    }else{
      const cx={"haut-portrait":HOVER_CARD.portraitCx,"haut-page":HOVER_CARD.pageCx,"sous-nom":HOVER_CARD.pageCx}[su.place];
      const y0=(su.place==="sous-nom"?HOVER_CARD.sepNomY:mi.haut)+su.dy;
      out.push(`<img src="${dir}/${SG.f}" alt="" style="left:${hcPx(cx-W/2+su.dx)};top:${hcPx(y0-H*SG.attache)};width:${hcPx(W)};height:${hcPx(H)}">`);
    }
  }
  const po=F.pose,PG=G.poses[po.modele]||Object.values(G.poses)[0];
  if(po.place!=="aucune"){
    const W=po.taille,H=W*PG.h/PG.w,[cote,ou]=po.place.split("-");
    const cx={page:HOVER_CARD.pageCx,centre:HOVER_CARD.w/2,portrait:HOVER_CARD.portraitCx}[ou],ligne=cote==="bas"?mi.bas:mi.haut;
    // Sa base (une part du bas de l'image) chevauche la bordure ; retourné, il pend sous la ligne.
    const haut=po.retourne?ligne-H*PG.base:ligne-H+H*PG.base;
    out.push(`<img src="${dir}/${PG.f}" alt="" style="left:${hcPx(cx-W/2+po.dx)};top:${hcPx(haut+po.dy)};width:${hcPx(W)};height:${hcPx(H)};transform:${po.retourne?"scaleY(-1)":"none"}">`);
  }
  return `<div class="hc-cadre" aria-hidden="true">${out.join("")}</div>`;
}

// La forme : la direction « A · Le diptyque » de Chatty (Idan, 2026-11-15). Une carte et un avatar aux dimensions fixes,
// aux proportions de Chatty (styles.css) ; le cadre vient du kit graphique de la culture, posé par-dessus
// (hoverKitFrame ; les cultures sans kit n'en ont pas encore). À gauche le portrait en pied ; à droite le
// cartouche du nom, puis une page claire : origines, réputation, affinité, prime, tags, armes, écoles.
// Les cœurs de l'affinité : à facettes, comme les étoiles de la réputation (Idan, 2026-11-16 : « des coeurs assortis aux
// étoiles… avoir un style commun, c'est important » ; images : assets/ui/coeurs/, styles.css).
// Les rangées de pictos d'écoles. Une seule ligne, sauf à côté de la monture au-delà de 4 (ce qui tient en 48 px dans sa
// demi-colonne) : deux lignes (Idan, 2026-11-16 : « Deux lignes »), la première la plus longue (5 + 4 pour 9).
const HOVER_SCHOOLS_BESIDE_MOUNT=4;
function hoverSchoolRows(schools,withMount){
  if(!schools.length) return [];
  const perRow=withMount&&schools.length>HOVER_SCHOOLS_BESIDE_MOUNT?Math.ceil(schools.length/2):schools.length;
  const rows=[];
  for(let i=0;i<schools.length;i+=perRow) rows.push(schools.slice(i,i+perRow));
  return rows;
}
// Le portrait de la monture, carré (Idan, 2026-11-16 : « L'avatar de la monture sera carré »), seul : « virer le nom de la
// monture » (il ne reste que pour les lecteurs d'écran). Il n'en existe pas encore : en attendant, un cadre carré à son
// espèce (« Destrier »), à la taille du portrait (72 px, styles.css : « réduire un peu l'avatar monture »).
function hoverMountPortrait(mount){
  const label=[mount.name,mount.kind].filter(Boolean).join(", ");
  return `<figure class="hc-steed-portrait" data-mount="${esc(mount.code)}" aria-label="${esc(label)}"><span>${esc(mount.kind||mount.name)}</span></figure>`;
}
// Les armes d'un set, comme Idan les dit : « Épée longue et écu ».
function hoverWeapons(names){
  return names.map((name,i)=>i?name.charAt(0).toLocaleLowerCase("fr")+name.slice(1):name).join(" et ");
}
function hoverHearts(filled){
  return Array.from({length:10},(_,i)=>`<i class="hc-heart${i<filled?" is-full":""}"></i>`).join("");
}
// La fiche du candidat (Idan, 2026-11-22 : « la fiche au survol avec des ? quand on ne connait pas les infos ») :
// - unknown : les cases qu'on ne connaît pas encore, « ? » à la place : title, affinity, bonus, salary, tags, set1, set2,
//   armor (kit : les trois), magic (les écoles pas encore demandées ; sans la monture) ; mount : pas de monture montrée ;
// - ce qu'on a appris (doc 14 §6 bis) : title (le titre entendu, du candidat ou du tavernier), affinityWord (le mot du
//   tavernier à la place des cœurs), bonus et salary (sa demande, puis la négociation ; la ligne Salaire n'existe que sur
//   la fiche du candidat).
const hoverUnknown=`<span class="hc-unknown">?</span>`;
function renderMercenaryHoverCard(c,{unknown=null,bonus=null,salary=null,title=null,affinityWord=null}={}){
  const d=mercenaryHoverData(c);
  const hidden=key=>Boolean(unknown&&unknown.has(key));
  if(bonus!=null) d.bonus=bonus;
  if(title!=null) d.title=title;
  const frame=hoverCultureFrame(d.culture);
  // Le nom en grand (Idan, 2026-11-15 : « on reste pour que 20 caractères rentrent dans le cartouche. On réduira auto pour
  // les noms plus longs ») : sa taille (styles.css) laisse tenir les noms de 20 caractères les plus larges ; au-delà, il
  // rapetisse d'autant (20 / longueur), et fitHoverCard finit le travail s'il le faut.
  const nameFit=Math.max(.6,Math.min(1,20/d.name.length));
  // Zone 2, les origines : les deux ou trois pictos (peuple, culture, ascendance), puis la phrase d'origine.
  const emblems=["people","culture","ascendance"].filter(kind=>d[kind])
    .map(kind=>`<span class="hc-emblem">${renderPicto(kind,d[kind],{size:"md"})}</span>`).join("");
  const affinity=hidden("affinity")?`<div class="hc-stat"><span class="hc-label">Affinité</span>${hoverUnknown}</div>`
    :affinityWord?`<div class="hc-stat"><span class="hc-label">Affinité</span><b class="hc-affinity-word">${esc(affinityWord)}</b></div>`
    :d.affinity?`<div class="hc-stat"><span class="hc-label">Affinité</span><span class="hc-hearts" title="${esc(d.affinity.phrase)}">${hoverHearts(d.affinity.filled)}</span></div>`:"";
  // L'équipement en trois colonnes (Idan, 2026-11-16) : les armes du set 1 (« épée longue et écu »), celles du set 2, l'armure ;
  // les noms seuls (« pas besoin de mettre set 1 ou set 2 », « pas besoin de mettre armure également »).
  const kitValues=[hoverWeapons(d.sets[0])||"Mains nues",hoverWeapons(d.sets[1])||"—",d.armor||"Sans armure"];
  const kit=["set1","set2","armor"].map((key,i)=>hidden("kit")||hidden(key)?"?":kitValues[i])
    .map(value=>`<span class="hc-kit-item"><i>${esc(value)}</i></span>`).join("");
  // Dessous, deux colonnes (Idan, 2026-11-16 : « Les pictos d'écoles de magie à gauche, l'avatar de la monture à droite ») ;
  // seule, l'une ou l'autre se centre. Les pictos des écoles d'Idan (assets/pictos/ecole-<slug>.webp), sans plaque « Écoles
  // de magie » (Idan, 2026-11-16 : « Retire le école de magie ») ni nom : « Pictos seuls en 48 px avec la possibilité de les
  // rétrécir pour tout rentrer » (une seule ligne, styles.css).
  const school=name=>`<span class="hc-school" role="img" aria-label="${esc(name)}">${renderPicto("school",name,{size:"md"})}</span>`;
  const showSteed=Boolean(d.mount)&&!hidden("magic")&&!hidden("mount");
  const rows=hoverSchoolRows(d.schools,showSteed);
  const magic=hidden("magic")?`<div class="hc-magic">${hoverUnknown}</div>`
    :rows.length?`<div class="hc-magic"><div class="hc-schools" style="--n:${rows[0].length}">${rows.map(row=>`<div class="hc-schools-row">${row.map(school).join("")}</div>`).join("")}</div></div>`:"";
  const steed=showSteed?hoverMountPortrait(d.mount):"";
  const foot=magic||steed?`<i class="hc-fente hc-fente--h" aria-hidden="true"></i><div class="hc-foot${magic&&steed?" is-2":""}">${magic}${magic&&steed?`<i class="hc-fente" aria-hidden="true"></i>`:""}${steed}</div>`:"";
  const tags=hidden("tags")?`<li class="hc-tag hc-tag--bleu is-more hc-tag--unknown" style="grid-column:3/span 2">?</li>`:hoverTagPlates(d.tags).map(tag=>`<li class="hc-tag hc-tag--${esc(tag.tone)}${tag.mission?" is-mission":""}${tag.more?" is-more":""}" style="grid-column:${tag.col}/span 2"${tag.more?` title="${esc(tag.hidden.join(", "))}"`:""}>${esc(tag.name)}</li>`).join("");
  return `<article class="hover-card" data-culture="${esc(frame.key)}"${frame.kit?` data-kit="${esc(frame.kit.cle)}"${frame.kit.fiche.nom==="or"?' data-kit-nom="or"':""}`:""} style='${frame.vars};--hc-name-fit:${nameFit.toFixed(3)}' aria-label="${esc(d.name)}">
    <div class="hc-portrait">${renderAvatar(c,{variant:"detail",kind:"full"})}</div>
    <header class="hc-banner"><h3>${esc(d.name)}</h3>${d.title||hidden("title")?`<p class="hc-title"><i class="hc-orn hc-orn--l" aria-hidden="true"></i><span>${esc(hidden("title")?"?":d.title)}</span><i class="hc-orn hc-orn--r" aria-hidden="true"></i></p>`:""}</header>
    <div class="hc-page">
      <div class="hc-head">
        <section class="hc-origins" aria-label="Origines"><div class="hc-emblems">${emblems}</div><p class="hc-origin">${esc(d.origin)}</p></section>
        <i class="hc-fente" aria-hidden="true"></i>
        <div class="hc-stats">
          <div class="hc-stat"><span class="hc-label">Réputation</span>${renderReputationStars(c)}</div>
          ${affinity}
          ${salary!=null||hidden("salary")?`<div class="hc-stat hc-stat--salary"><span class="hc-label" title="Salaire journalier">Salaire</span>${hidden("salary")?hoverUnknown:`<span class="hc-bonus"><img src="assets/hud/picto-or.webp" alt=""><b>${esc(goldAmount(salary))} PO</b></span>`}</div>`:""}
          <div class="hc-stat hc-stat--bonus"><span class="hc-label" title="Prime de mission">Prime</span>${hidden("bonus")?hoverUnknown:`<span class="hc-bonus"><img src="assets/hud/picto-or.webp" alt=""><b>${esc(goldAmount(d.bonus))} PO</b></span>`}</div>
        </div>
      </div>
      <i class="hc-sep" aria-hidden="true"></i>
      ${tags?`<ul class="hc-tags">${tags}</ul><i class="hc-fente hc-fente--h" aria-hidden="true"></i>`:""}
      <div class="hc-kit">${kit}</div>
      ${foot}
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

if(typeof module!=="undefined"&&module.exports) module.exports={mercenaryHoverData,hoverWeapons,hoverSchoolRows,hoverMountPortrait,hoverTagPlates,hoverTagFullName,renderMercenaryHoverCard,hoverCultureFrame,hoverKitFrame,fitHoverCard,hoverCardPlacement,originPhrase};
