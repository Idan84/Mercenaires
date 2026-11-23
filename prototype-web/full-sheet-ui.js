"use strict";

// La fiche complète d'un mercenaire en plein écran (Idan, 2026-11-18 : « deux parties fixes. Une barre en haut. Une
// colonne à gauche. Un onglet principal qui s'ouvre toujours en premier », « la carte doit être plein écran ? avec une
// croix en haut à droite pour revenir là ou on était »). Le cadre vient du kit de la culture du mercenaire, avec les
// mêmes réglages que la fiche au survol (Idan, 2026-11-18 : « Tu veux pas me donner les mêmes réglages que la fiche au
// survol ? ») : côtés, coins, la bande sous la barre du haut et la séparation de la colonne (leurs jonctions en T), les
// ornements de coin, posé, suspendu et allongé, le cuir. Pas encore branchée dans le jeu : le Design Lab (onglet
// Cultures) la montre et la règle par culture (data/reference/culture-kits.json, « plein »).
// Le contenu se décide avec Idan, zone par zone (son tableau « Contenu de la fiche mercenaire ») :
// - la barre du haut (Idan, 2026-11-18) : le cuir de la culture ; alignée à gauche, à une marge du bord du cadre réglée
//   selon son coin ; les deux flèches (fiche précédente, suivante), l'avatar carré (une marge en haut et en bas, 10 px),
//   le nom (comme sur la fiche au survol), le titre à sa droite ; la croix à droite ;
// - la colonne de gauche : un fond parchemin, le portrait en pied sur toute sa largeur ; le reste viendra ensuite.
// Les réglages sont en pixels d'un écran de 1080 px de haut, mis à l'échelle de l'écran (hauteur / 1080).

const FULL_SHEET_DEFAULTS={largeur:"ecran",haut:150,gauche:440,cadre:{ep:20},cotes:{haut:0,bas:0,gauche:0,droite:0},
  bande:{ep:20,dy:0,jonctions:true,tGauche:{dx:0,dy:0},tDroite:{dx:0,dy:0}},
  separation:{ep:20,dx:0,jonctions:true,tHaut:{dx:0,dy:0},tBas:{dx:0,dy:0}},
  barre:{margeGauche:70,margeDroite:40,avatarMarge:10,ecart:22,nom:44,titre:23}};
// Les onglets, dans l'ordre du tableau d'Idan (Récap toujours ouvert en premier).
const FULL_SHEET_TABS=["Récap","Contrat et postes & Camp","Équipement","Caractéristiques & Compétences","Magie","Rôle et occupations","Historique"];
// Les portraits en pied (768 × 1376).
const FULL_SHEET_PORTRAIT=768/1376;

const fsObjet=v=>v&&typeof v==="object"&&!Array.isArray(v);
// a, complété par b (b l'emporte), objet par objet.
function fsFondre(a,b){
  if(!fsObjet(a)||!fsObjet(b)) return b===undefined?a:b;
  const out={...a};
  for(const [k,v] of Object.entries(b)) out[k]=fsFondre(a[k],v);
  return out;
}
// Les réglages d'un kit : ceux par défaut, ceux du kit pour la fiche au survol (coins, ornements de coin, nom, cuir ; les
// ornements posé, suspendu et allongé sans place), puis les siens.
function fullSheetSettings(kit){
  const F=kit?.fiche||{};
  const sansPlace=o=>o?{...o,place:"aucune",dx:0,dy:0}:undefined;
  const herites=kit?{coins:F.coins,ornementsCoin:F.ornementsCoin,pose:sansPlace(F.pose),suspendu:sansPlace(F.suspendu),
    allonge:sansPlace(F.allonge),nom:F.nom,cuir:F.cuir}:{};
  return fsFondre(fsFondre(FULL_SHEET_DEFAULTS,JSON.parse(JSON.stringify(herites))),kit?.plein||{});
}

// Les places, en pixels de l'écran (W × H). « 16:9 » : sur un écran plus large (21:9), la fiche garde la largeur d'un
// 16:9 et se centre. Les épaisseurs restent des pixels entiers (le navigateur arrondit la taille d'un motif répété) ;
// les côtés gardent les proportions de l'original (bande de gauche contre bande du haut). Les zones vont jusqu'au milieu
// des bandes du cadre (le fond passe dessous) ; leur contenu commence au bord intérieur (pad). Logique pure.
function fullSheetLayout(kit,W,H){
  const P=fullSheetSettings(kit),s=H/1080,coin=kit?.geometrie?.cadre?.coin,C=P.cotes;
  const SW=P.largeur==="16:9"?Math.min(W,Math.round(H*16/9)):W,x0=(W-SW)/2;
  const e=Math.max(4,Math.round(P.cadre.ep*s)),eV=coin?Math.max(4,Math.round(e*coin.coeurV/coin.coeur)):e;
  const B={x0:x0+C.gauche*s,y0:C.haut*s,x1:x0+SW+C.droite*s,y1:H+C.bas*s};
  const bandEp=Math.max(4,Math.round(P.bande.ep*s)),sepEp=Math.max(4,Math.round(P.separation.ep*s));
  const bandY=B.y0+P.haut*s+P.bande.dy*s,sepX=B.x0+P.gauche*s+P.separation.dx*s;
  const mi={haut:B.y0+e/2,bas:B.y1-e/2,gauche:B.x0+eV/2,droite:B.x1-eV/2};
  return {s,W,H,SW,B,e,eV,bandEp,sepEp,bandY,sepX,mi,P,
    zones:{haut:{x0:mi.gauche,y0:mi.haut,x1:mi.droite,y1:bandY,pad:{t:e/2,b:bandEp/2,l:eV/2,r:eV/2}},
      gauche:{x0:mi.gauche,y0:bandY,x1:sepX,y1:mi.bas,pad:{t:bandEp/2,b:e/2,l:eV/2,r:sepEp/2}},
      principale:{x0:sepX,y0:bandY,x1:mi.droite,y1:mi.bas,pad:{t:bandEp/2,b:e/2,l:sepEp/2,r:eV/2}}}};
}

// Le cadre (HTML, pièces en position absolue dans l'écran) : la bordure, la séparation de la colonne et la bande sous
// la barre du haut, leurs jonctions, les coins, puis les ornements (allongé, de coin, suspendu, posé), à l'échelle.
function fullSheetFrame(kit,L){
  if(!kit) return "";
  const G=kit.geometrie,K=G.cadre,dir=kit.dossier,P=L.P,B=L.B,e=L.e,eV=L.eV,s=L.s,mi=L.mi,out=[];
  const coinsK={...kit,fiche:{...kit.fiche,coins:Object.fromEntries(Object.entries(P.coins||{})
    .map(([a,c])=>[a,{...c,dx:c.dx*s,dy:c.dy*s}]))}};
  const coins=Object.fromEntries(Object.keys(HOVER_KIT_ANGLES).map(a=>[a,hoverKitCorner(coinsK,a,B,e,eV)]));
  out.push(hoverKitStrap(dir,K.m,"y",L.bandY,B.y1-e/2,L.sepX-L.sepEp/2,L.sepEp));
  out.push(hoverKitStrap(dir,K.mh,"x",B.x0+eV/2,B.x1-eV/2,L.bandY-L.bandEp/2,L.bandEp));
  const c=coins,lo=3,ph=(x,k)=>x[k]+lo;
  out.push(hoverKitStrap(dir,K.h,"x",c.hg.finX-lo,c.hd.finX+lo,B.y0,e,ph(c.hg,"phaseX"),ph(c.hd,"phaseX")));
  out.push(hoverKitStrap(dir,K.h,"x",c.bg.finX-lo,c.bd.finX+lo,B.y1,e,ph(c.bg,"phaseX"),ph(c.bd,"phaseX"),true));
  out.push(hoverKitStrap(dir,K.v,"y",c.hg.finY-lo,c.bg.finY+lo,B.x0,eV,ph(c.hg,"phaseY"),ph(c.bg,"phaseY")));
  out.push(hoverKitStrap(dir,K.v,"y",c.hd.finY-lo,c.bd.finY+lo,B.x1,eV,ph(c.hd,"phaseY"),ph(c.bd,"phaseY"),true));
  // Les jonctions : la bande dans la bordure, à gauche et à droite ; la séparation dans la bande et dans la bordure du bas.
  const o=t=>({dx:(t?.dx||0)*s,dy:(t?.dy||0)*s});
  if(P.bande.jonctions) out.push(hoverKitJunction(kit,[B.x0,L.bandY],[1,0],[0,1],eV,L.bandEp,o(P.bande.tGauche)),
    hoverKitJunction(kit,[B.x1,L.bandY],[-1,0],[0,1],eV,L.bandEp,o(P.bande.tDroite)));
  if(P.separation.jonctions) out.push(hoverKitJunction(kit,[L.sepX,L.bandY-L.bandEp/2],[0,1],[1,0],L.bandEp,L.sepEp,o(P.separation.tHaut)),
    hoverKitJunction(kit,[L.sepX,B.y1],[0,-1],[1,0],e,L.sepEp,o(P.separation.tBas)));
  for(const k of Object.values(coins)) out.push(k.html);
  // Les milieux : de la colonne, de tout le cadre, de la partie principale.
  const cx={colonne:(B.x0+L.sepX)/2,centre:(B.x0+B.x1)/2,principale:(L.sepX+B.x1)/2};
  const al=P.allonge,AG=G.allonge;
  if(al&&AG&&al.place!=="aucune"){
    const w=al.taille*s,h=w*AG.h/AG.w,pas=Math.max(2,h+al.espacement*s),vertical=["separation","gauche","droite"].includes(al.place);
    const L0=vertical?(al.place==="separation"?B.y1-L.bandY:B.y1-B.y0):B.x1-B.x0;
    const Lg=L0*al.longueur/100,nb=Math.max(1,Math.floor((Lg-h)/pas)+1),total=h+(nb-1)*pas;
    const maillons=Array.from({length:nb},(_,i)=>`<img src="${dir}/${AG.f}" alt="" style="left:0;top:${hcPx(i*pas)};width:${hcPx(w)};height:${hcPx(h)}">`).join("");
    if(vertical){
      const x={separation:L.sepX,gauche:mi.gauche,droite:mi.droite}[al.place],milieu=al.place==="separation"?(L.bandY+B.y1)/2:(B.y0+B.y1)/2;
      out.push(`<span style="left:${hcPx(x-w/2+al.dx*s)};top:${hcPx(milieu-total/2+al.dy*s)};width:${hcPx(w)};height:${hcPx(total)}">${maillons}</span>`);
    }else{
      const y={haut:mi.haut,bas:mi.bas,bande:L.bandY}[al.place];
      out.push(`<span style="left:${hcPx(cx.centre-w/2+al.dx*s)};top:${hcPx(y-total/2+al.dy*s)};width:${hcPx(w)};height:${hcPx(total)};transform:rotate(90deg)">${maillons}</span>`);
    }
  }
  for(const [a,A] of Object.entries(HOVER_KIT_ANGLES)){
    const orn=P.ornementsCoin?.[a];
    if(!orn||orn.modele==="aucun"||!G.ornementsCoin[orn.modele]) continue;
    const t=orn.taille*s,[ox,oy]=hoverKitOrnamentShift(G,orn,A,t);
    const x=(A.sx<0?B.x0:B.x1-t)+orn.dx*s+ox,y=(A.sy<0?B.y0:B.y1-t)+orn.dy*s+oy;
    out.push(`<img src="${dir}/${G.ornementsCoin[orn.modele]}" alt="" style="left:${hcPx(x)};top:${hcPx(y)};width:${hcPx(t)};height:${hcPx(t)};object-fit:contain;object-position:0 0;transform:${A[orn.sens][0]}">`);
  }
  const su=P.suspendu,SG=G.suspendu;
  if(su&&SG&&su.place!=="aucune"){
    const Wd=su.taille*s,Hd=Wd*SG.h/SG.w;
    if(su.place.startsWith("coin")){
      const Ld=Wd/Math.SQRT2,g=su.place==="coin-g",x=(g?Ld/2+mi.gauche:B.x1-Ld/2-eV/2)+su.dx*s,y=Ld/2+mi.haut+su.dy*s;
      out.push(`<img src="${dir}/${SG.f}" alt="" style="left:${hcPx(x-Wd/2)};top:${hcPx(y)};width:${hcPx(Wd)};height:${hcPx(Hd)};transform-origin:50% 0;transform:rotate(${g?-45:45}deg)">`);
    }else{
      const x=cx[su.place==="sous-bande-colonne"?"colonne":"principale"];
      out.push(`<img src="${dir}/${SG.f}" alt="" style="left:${hcPx(x-Wd/2+su.dx*s)};top:${hcPx(L.bandY+su.dy*s-Hd*SG.attache)};width:${hcPx(Wd)};height:${hcPx(Hd)}">`);
    }
  }
  const po=P.pose,PG=po&&(G.poses[po.modele]||Object.values(G.poses)[0]);
  if(po&&PG&&po.place!=="aucune"){
    const Wd=po.taille*s,Hd=Wd*PG.h/PG.w,[cote,ou]=po.place.split("-"),ligne={haut:mi.haut,bas:mi.bas,bande:L.bandY}[cote];
    const haut=po.retourne?ligne-Hd*PG.base:ligne-Hd+Hd*PG.base;
    out.push(`<img src="${dir}/${PG.f}" alt="" style="left:${hcPx(cx[ou]-Wd/2+po.dx*s)};top:${hcPx(haut+po.dy*s)};width:${hcPx(Wd)};height:${hcPx(Hd)};transform:${po.retourne?"scaleY(-1)":"none"}">`);
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
  const kit=fullSheetKit(c?.culture),L=fullSheetLayout(kit,W,H),Z=L.zones,P=L.P,s=L.s,R=P.barre;
  const box=(z,cls,inner,pad={},style="")=>{
    const p={t:z.pad.t+(pad.t||0),b:z.pad.b+(pad.b||0),l:z.pad.l+(pad.l||0),r:z.pad.r+(pad.r||0)};
    return `<div class="fs-zone ${cls}" style="left:${hcPx(z.x0)};top:${hcPx(z.y0)};width:${hcPx(z.x1-z.x0)};height:${hcPx(z.y1-z.y0)};padding:${hcPx(p.t)} ${hcPx(p.r)} ${hcPx(p.b)} ${hcPx(p.l)};${style}">${inner}</div>`;
  };
  const place=(label,cls="")=>`<div class="fs-place ${cls}">${esc(label)}</div>`;
  const cuir=kit?`--fs-texture:url('${kit.dossier}/${kit.geometrie.texture}');--fs-voile:${kit.geometrie.voile};--fs-sombre:${P.cuir.sombre/100};--fs-grain:${hcPx(256*P.cuir.grain/100*s)}`:"";
  const titre=typeof mercenaryHoverData==="function"?mercenaryHoverData(c).title:"";
  const avatar=kind=>typeof renderAvatar==="function"?renderAvatar(c,{variant:"detail",kind}):"";
  const picto=kind=>c?.[kind]&&typeof renderPicto==="function"?renderPicto(kind,c[kind],{size:"md"}):"";
  // La barre du haut : la marge du bord gauche du cadre, l'écart entre les éléments, l'avatar à sa marge des bandes.
  const haut=box(Z.haut,"fs-haut",`<span class="fs-fleche" title="Fiche précédente">‹</span><span class="fs-fleche" title="Fiche suivante">›</span>
      <span class="fs-avatar">${avatar("portrait")}</span>
      <div class="fs-ident"><span class="fs-nom">${esc(c?.name||"Nom du mercenaire")}</span>${titre?`<span class="fs-titre">${esc(titre)}</span>`:""}</div>
      <span class="fs-vide"></span><span class="fs-fermer" title="Fermer et revenir où on était">✕</span>`,
    {l:R.margeGauche*s,r:R.margeDroite*s},`--fs-ecart:${hcPx(R.ecart*s)};--fs-avatar-marge:${hcPx(R.avatarMarge*s)};--fs-nom:${hcPx(R.nom*s)};--fs-titre:${hcPx(R.titre*s)}`);
  // La colonne de gauche : le portrait en pied sur toute sa largeur, puis ce qui reste à placer.
  const gauche=box(Z.gauche,"fs-gauche",`<div class="fs-pied">${avatar("full")}</div>
      <div class="fs-suite">${place("Rôle particulier")}<div class="fs-pictos">${["people","culture","ascendance"].map(picto).join("")}</div>
        ${place("État")}${place("Une discussion qui l'attend")}</div>`);
  const blocs=["Phrase d'origine","Phrase d'ascendance","Réputation","Affinité avec le capitaine","Alignement","Salaire journalier"];
  const principale=box(Z.principale,"fs-principale",`<nav class="fs-onglets">${FULL_SHEET_TABS.map(t=>`<span class="fs-onglet${t===tab?" is-on":""}">${esc(t)}</span>`).join("")}</nav>
      <div class="fs-recap">${blocs.map(b=>place(b,"fs-bloc")).join("")}</div>`);
  return `<section class="full-sheet${kit?"":" is-sans-kit"}" data-kit="${esc(kit?.cle||"")}"${P.nom==="or"?' data-kit-nom="or"':""} style="--fs-s:${s};${cuir}" aria-label="Fiche de ${esc(c?.name||"")}">
    ${haut}${gauche}${principale}${fullSheetFrame(kit,L)}</section>`;
}

if(typeof module!=="undefined"&&module.exports) module.exports={FULL_SHEET_DEFAULTS,FULL_SHEET_TABS,fullSheetSettings,fullSheetLayout};
