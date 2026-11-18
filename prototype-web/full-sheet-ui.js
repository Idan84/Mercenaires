"use strict";

// La fiche complète d'un mercenaire en plein écran (Idan, 2026-11-18 : « deux parties fixes. Une barre en haut. Une
// colonne à gauche. Un onglet principal qui s'ouvre toujours en premier », « la carte doit être plein écran ? avec une
// croix en haut à droite pour revenir là ou on était »). Étape 1 : le cadre du kit de la culture du mercenaire et les
// zones, placés selon la résolution. Le contenu des zones se décide ensuite avec Idan, zone par zone (son tableau
// « Contenu de la fiche mercenaire ») : pour l'instant, des places réservées, avec le nom, le titre et les portraits.
// Pas encore branchée dans le jeu : le Design Lab (onglet Cultures) la montre et la règle par culture
// (data/reference/culture-kits.json, « plein »).
// Les réglages sont en pixels d'un écran de 1080 px de haut, mis à l'échelle de l'écran (hauteur / 1080). Le cadre est
// celui de la fiche au survol (mêmes pièces, posées par hoverKitStrap, hoverKitCorner et hoverKitJunction) : une
// bordure, une bande sous la barre du haut (d'un bord à l'autre), la séparation de la colonne de gauche (de la bande
// au bas), leurs quatre jonctions en T, les coins, puis les ornements de coin de la fiche au survol, à l'échelle.

const FULL_SHEET_DEFAULTS={largeur:"ecran",haut:150,gauche:440,marge:0,cadre:{ep:20},separations:{ep:20},ornements:{echelle:1}};
// Les onglets, dans l'ordre du tableau d'Idan (Récap toujours ouvert en premier).
const FULL_SHEET_TABS=["Récap","Contrat et postes & Camp","Équipement","Caractéristiques & Compétences","Magie","Rôle et occupations","Historique"];

// Les réglages d'un kit, complétés par ceux par défaut.
function fullSheetSettings(kit){
  const P=kit?.plein||{};
  return {...FULL_SHEET_DEFAULTS,...P,cadre:{...FULL_SHEET_DEFAULTS.cadre,...P.cadre},
    separations:{...FULL_SHEET_DEFAULTS.separations,...P.separations},ornements:{...FULL_SHEET_DEFAULTS.ornements,...P.ornements}};
}

// Les places, en pixels de l'écran (W × H). « 16:9 » : sur un écran plus large (21:9), la fiche garde la largeur d'un
// 16:9 et se centre. Les épaisseurs restent des pixels entiers (le navigateur arrondit la taille d'un motif répété) ;
// les côtés gardent les proportions de l'original (bande de gauche contre bande du haut). Logique pure (tests, portage).
function fullSheetLayout(kit,W,H){
  const P=fullSheetSettings(kit),s=H/1080,coin=kit?.geometrie?.cadre?.coin;
  const SW=P.largeur==="16:9"?Math.min(W,Math.round(H*16/9)):W,x0=(W-SW)/2,m=P.marge*s;
  const e=Math.max(4,Math.round(P.cadre.ep*s)),eV=coin?Math.max(4,Math.round(e*coin.coeurV/coin.coeur)):e;
  const B={x0:x0+m,y0:m,x1:x0+SW-m,y1:H-m},bandEp=Math.max(4,Math.round(P.separations.ep*s));
  const bandY=B.y0+P.haut*s,sepX=B.x0+P.gauche*s,bas=B.y1-e/2,gauche=B.x0+eV/2,droite=B.x1-eV/2;
  return {s,W,H,SW,B,e,eV,bandEp,sepEp:bandEp,bandY,sepX,orn:P.ornements.echelle,
    zones:{haut:{x0:gauche,y0:B.y0+e/2,x1:droite,y1:bandY},gauche:{x0:gauche,y0:bandY,x1:sepX,y1:bas},
      principale:{x0:sepX,y0:bandY,x1:droite,y1:bas}}};
}

// Le cadre (HTML, pièces en position absolue dans l'écran).
function fullSheetFrame(kit,L){
  if(!kit) return "";
  const K=kit.geometrie.cadre,dir=kit.dossier,B=L.B,e=L.e,eV=L.eV,out=[];
  // Les coins de la fiche au survol (sens, décalage), décalages à l'échelle de l'écran.
  const coinsK={...kit,fiche:{...kit.fiche,coins:Object.fromEntries(Object.entries(kit.fiche.coins)
    .map(([a,c])=>[a,{...c,dx:c.dx*L.s,dy:c.dy*L.s}]))}};
  const coins=Object.fromEntries(Object.keys(HOVER_KIT_ANGLES).map(a=>[a,hoverKitCorner(coinsK,a,B,e,eV)]));
  // La séparation de la colonne (la barre du milieu) et la bande sous la barre du haut (la barre du milieu couchée).
  out.push(hoverKitStrap(dir,K.m,"y",L.bandY,B.y1-e/2,L.sepX-L.sepEp/2,L.sepEp));
  out.push(hoverKitStrap(dir,K.mh,"x",B.x0+eV/2,B.x1-eV/2,L.bandY-L.bandEp/2,L.bandEp));
  // La bordure, entre les bouts des bras des coins (3 px dessous, pour qu'aucun jour ne reste au raccord).
  const c=coins,lo=3,ph=(x,k)=>x[k]+lo;
  out.push(hoverKitStrap(dir,K.h,"x",c.hg.finX-lo,c.hd.finX+lo,B.y0,e,ph(c.hg,"phaseX"),ph(c.hd,"phaseX")));
  out.push(hoverKitStrap(dir,K.h,"x",c.bg.finX-lo,c.bd.finX+lo,B.y1,e,ph(c.bg,"phaseX"),ph(c.bd,"phaseX"),true));
  out.push(hoverKitStrap(dir,K.v,"y",c.hg.finY-lo,c.bg.finY+lo,B.x0,eV,ph(c.hg,"phaseY"),ph(c.bg,"phaseY")));
  out.push(hoverKitStrap(dir,K.v,"y",c.hd.finY-lo,c.bd.finY+lo,B.x1,eV,ph(c.hd,"phaseY"),ph(c.bd,"phaseY"),true));
  // Les jonctions : la bande dans la bordure à gauche et à droite ; la séparation dans la bande et dans la bordure du bas.
  const o={dx:0,dy:0};
  out.push(hoverKitJunction(kit,[B.x0,L.bandY],[1,0],[0,1],eV,L.bandEp,o),hoverKitJunction(kit,[B.x1,L.bandY],[-1,0],[0,1],eV,L.bandEp,o));
  out.push(hoverKitJunction(kit,[L.sepX,L.bandY-L.bandEp/2],[0,1],[1,0],L.bandEp,L.sepEp,o),hoverKitJunction(kit,[L.sepX,B.y1],[0,-1],[1,0],e,L.sepEp,o));
  for(const k of Object.values(coins)) out.push(k.html);
  // Les ornements de coin de la fiche au survol, à l'échelle de l'écran (× l'échelle choisie ; 0 : aucun).
  const G=kit.geometrie,k=L.s*L.orn;
  if(k>0) for(const [a,A] of Object.entries(HOVER_KIT_ANGLES)){
    const orn=kit.fiche.ornementsCoin[a];
    if(!orn||orn.modele==="aucun"||!G.ornementsCoin[orn.modele]) continue;
    const t=orn.taille*k,x=(A.sx<0?B.x0:B.x1-t)+orn.dx*k,y=(A.sy<0?B.y0:B.y1-t)+orn.dy*k;
    out.push(`<img src="${dir}/${G.ornementsCoin[orn.modele]}" alt="" style="left:${hcPx(x)};top:${hcPx(y)};width:${hcPx(t)};height:${hcPx(t)};object-fit:contain;object-position:0 0;transform:${A[orn.sens][0]}">`);
  }
  return `<div class="fs-cadre" aria-hidden="true">${out.join("")}</div>`;
}

// Le kit de la culture du mercenaire, s'il en a un.
function fullSheetKit(culture){
  const rows=typeof game!=="undefined"&&game.referenceData?.cultureKits?.rows||[];
  return rows.find(kit=>kit.culture===culture)||null;
}

// La fiche d'un mercenaire, pour un écran W × H. options.tab : l'onglet ouvert (Récap par défaut).
function renderFullSheet(c,{W,H,tab=FULL_SHEET_TABS[0]}={}){
  const kit=fullSheetKit(c?.culture),L=fullSheetLayout(kit,W,H),Z=L.zones;
  const box=(z,cls,inner,style="")=>`<div class="fs-zone ${cls}" style="left:${hcPx(z.x0)};top:${hcPx(z.y0)};width:${hcPx(z.x1-z.x0)};height:${hcPx(z.y1-z.y0)};${style}">${inner}</div>`;
  const place=(label,cls="")=>`<div class="fs-place ${cls}">${esc(label)}</div>`;
  const cuir=kit?`--fs-texture:url("${kit.dossier}/${kit.geometrie.texture}");--fs-voile:${kit.geometrie.voile};--fs-sombre:${kit.fiche.cuir.sombre/100};--fs-grain:${hcPx(256*kit.fiche.cuir.grain/100*L.s)}`:"";
  const titre=typeof mercenaryHoverData==="function"?mercenaryHoverData(c).title:"";
  const picto=kind=>c?.[kind]&&typeof renderPicto==="function"?renderPicto(kind,c[kind],{size:"md"}):"";
  // Les zones : leur contenu viendra du tableau d'Idan ; ici, leurs éléments à leur place provisoire.
  const haut=box(Z.haut,"fs-haut",`<span class="fs-fleche" title="Fiche précédente">‹</span>
      <span class="fs-avatar">${typeof renderAvatar==="function"?renderAvatar(c,{variant:"detail",kind:"portrait"}):""}</span>
      <div class="fs-ident"><div class="fs-nom">${esc(c?.name||"Nom du mercenaire")} <span class="fs-renommer" title="Renommer">✎</span></div>
        <div class="fs-titre">${esc(titre||"Son titre")}</div></div>
      <span class="fs-fleche" title="Fiche suivante">›</span><span class="fs-vide"></span>
      <span class="fs-fermer" title="Fermer et revenir où on était">✕</span>`);
  const gauche=box(Z.gauche,"fs-gauche",`${place("Rôle particulier","fs-role")}
      <div class="fs-pied">${typeof renderAvatar==="function"?renderAvatar(c,{variant:"detail",kind:"full"}):place("Portrait en pied")}</div>
      <div class="fs-pictos">${["people","culture","ascendance"].map(picto).join("")}</div>
      ${place("État","fs-etat")}${place("Une discussion qui l'attend","fs-discussion")}`);
  const blocs=["Phrase d'origine","Phrase d'ascendance","Réputation","Affinité avec le capitaine","Alignement","Salaire journalier"];
  const principale=box(Z.principale,"fs-principale",`<nav class="fs-onglets">${FULL_SHEET_TABS.map(t=>`<span class="fs-onglet${t===tab?" is-on":""}">${esc(t)}</span>`).join("")}</nav>
      <div class="fs-recap">${blocs.map(b=>place(b,"fs-bloc")).join("")}</div>`);
  return `<section class="full-sheet${kit?"":" is-sans-kit"}" data-kit="${esc(kit?.cle||"")}" style="--fs-s:${L.s};${cuir}" aria-label="Fiche de ${esc(c?.name||"")}">
    ${haut}${gauche}${principale}${fullSheetFrame(kit,L)}</section>`;
}

if(typeof module!=="undefined"&&module.exports) module.exports={FULL_SHEET_DEFAULTS,FULL_SHEET_TABS,fullSheetSettings,fullSheetLayout};
