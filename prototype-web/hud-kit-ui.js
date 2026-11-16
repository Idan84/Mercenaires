"use strict";

// Les barres du camp au kit graphique de la culture du capitaine (Chatty, Idan ; les Elfes noirs, planche d'Idan du
// 2026-11-16 : « Et voilà chef ! ») : à la place de la barre illustrée du pack de la culture (hud-bars.js), les pièces
// du kit (data/reference/culture-kits.json, « barres »), posées par screen-ui.js (applyHudBar). Les réglages de la
// planche sont en pixels d'un écran de 1920 × 1080, où la bande B des barres (--hb-B) mesure 81,6 px : tout se convertit
// en bandes B, comme les barres des packs, pour garder les proportions sur tous les écrans.
// - La barre du haut se place depuis le haut de l'écran. Sa bande et ses sangles vont d'un bout à l'autre de la barre
//   (ferrée à gauche, comme la barre actuelle : du bord gauche de l'écran jusqu'à sa largeur ; l'écart avec le bord droit
//   reste le même en bandes B) ; l'emblème du bout se place depuis le bord droit, la chaîne suspendue « à gauche » depuis
//   le bord gauche.
// - La barre du bas se place depuis le bas de l'écran et depuis son milieu, comme le bouton et les pictos.
// - Les textes de la barre du haut, le bouton Jour suivant et les pictos restent ceux du jeu : la planche les déplaçait
//   (écart, y, taille du bouton) depuis leur place avec la barre du pack de la culture. On reprend donc les réglages de
//   cette barre (haut et bas de hud-bars.js), décalés d'autant.
// Logique pure, sans page web (tests, portage) : le HTML des pièces et les réglages des deux barres en sortent tout faits.

// Le kit de la culture (sa clé, celle de hud-bars.js), s'il a ses barres.
function hudKitFor(culture){
  const rows=typeof game!=="undefined"&&game.referenceData?.cultureKits?.rows||[];
  return rows.find(kit=>kit.cle===culture&&kit.barres)||null;
}

// L'emblème au bout de la barre du haut : à 8 px du bout, son haut à 2 px du haut de la bande (planche).
const HUD_KIT_EMBLEM={marge:8,haut:2};
// Les places des ornements (planche) : la fraction de la largeur de la barre du haut ou de l'écran où tombe leur milieu.
const HUD_KIT_CHAIN_PLACES={"sous-haut-gauche":[.25,"gauche"],"sous-haut-centre":[.5,"milieu"],"sous-haut-droite":[.75,"droite"]};
const HUD_KIT_CROWN_PLACES={"sur-bas-gauche":.3,"sur-bas-droite":.7};
const hudKitRound=n=>Math.round(n*1e4)/1e4;

// kit : la ligne du kit (culture-kits.json) ; bar : la barre du pack de la culture (hud-bars.js), dont on reprend les
// réglages des textes, du bouton et des pictos. Rend { haut, bas } (les réglages des deux barres, en bandes B, pour
// screen-ui.js), { piecesHaut, piecesBas } (le HTML des pièces) et bouton (l'image du bouton Jour suivant).
function hudKitBars(kit,bar){
  const G=kit.geometrie,K=kit.barres,{w:W,h:H,B}=K.ecran,dir=kit.dossier+"/";
  const b=n=>hudKitRound(n/B);
  const len=n=>`calc(var(--hb-B) * ${b(n)})`;
  // Une pièce en pixels de la planche (x, y, largeur, hauteur), placée depuis la gauche, la droite ou le milieu de
  // l'écran, et depuis son haut ou son bas.
  const at=(x,y,w,h,ax,ay)=>[
    ax==="gauche"?`left:${len(x)}`:ax==="droite"?`right:${len(W-x-w)}`:`left:calc(50% + var(--hb-B) * ${b(x-W/2)})`,
    ay==="haut"?`top:${len(y)}`:`bottom:${len(H-y-h)}`,`width:${len(w)}`,`height:${len(h)}`].join(";");
  const img=(f,style,extra="")=>`<img class="hud-kit-piece" src="${dir}${f}" alt="" style="${style}${extra}">`;
  // Le cuir violet (sa tuile à « grain » % de 256 px), assombri ; ou un noir uni.
  const fond=f=>f.fond==="cuir"?`linear-gradient(rgba(12,2,16,${f.sombre/100}),rgba(12,2,16,${f.sombre/100})),url('${dir}${G.texture}') 0 0/${len(256*f.grain/100)} repeat`:"#120c14";
  // Une sangle, son milieu sur une ligne (décalé de dy) ; ses clous gardent leur pas, leur nombre s'ajuste à la largeur
  // (round : un nombre entier de cellules d'un clou).
  const sangle=(g,y,span)=>{
    if(g.style==="aucune") return "";
    const S=G.sangles[g.style],large=(S.coeur+2*S.bord)*g.ep/S.coeur;
    return `<span class="hud-kit-piece" style="${span(y+g.dy-large/2,large)};background:url('${dir}${S.h}') 0 0/auto 100% round no-repeat"></span>`;
  };

  // La barre du haut.
  const T=K.haut,TB=T.bande,l=Math.min(W,TB.largeur);
  const x0=TB.cale==="gauche"?0:TB.cale==="droite"?W-l:(W-l)/2,y0=TB.distance,y1=y0+TB.hauteur;
  const spanHaut=(y,h)=>`left:${len(x0)};right:${len(W-x0-l)};top:${len(y)};height:${len(h)}`;
  // La barre du bas, d'un bord à l'autre de l'écran.
  const D=K.bas,bh=D.bande.haut;
  const spanBas=(y,h)=>`left:0;right:0;bottom:${len(H-y-h)};height:${len(h)}`;
  const haut=[`<span class="hud-kit-piece" style="${spanHaut(y0,TB.hauteur)};background:${fond(TB)}"></span>`];
  const bas=[`<span class="hud-kit-piece" style="${spanBas(bh,H-bh)};background:${fond(D.bande)}"></span>`];
  const O=K.ornements;

  // La chaîne torsadée, posée sur une barre (sous ses sangles), au milieu de l'écran : ses maillons empilés puis tournés.
  const tor=O.chaineTorsadee;
  if(tor.place!=="aucune"){
    const surHaut=tor.place==="sur-haut",C=G.chaineTorsadee,w=tor.taille,h=w*C.h/C.w,pas=Math.max(2,h+tor.espacement);
    const L=(surHaut?l:W)*tor.longueur/100,n=Math.max(1,Math.floor((L-h)/pas)+1),total=h+(n-1)*pas;
    const cy=(surHaut?y1+T.sangleBas.dy:bh+D.sangleHaut.dy)+tor.dy;
    const maillons=Array.from({length:n},(_,i)=>`<img src="${dir}${C.f}" alt="" style="position:absolute;left:0;top:${len(i*pas)};width:${len(w)};height:${len(h)}">`).join("");
    (surHaut?haut:bas).push(`<span class="hud-kit-piece" style="${at(W/2-w/2+tor.dx,cy-total/2,w,total,"milieu",surHaut?"haut":"bas")};transform:rotate(90deg)">${maillons}</span>`);
  }
  haut.push(sangle(T.sangleHaut,y0,spanHaut),sangle(T.sangleBas,y1,spanHaut));
  bas.push(sangle(D.sangleHaut,bh,spanBas),sangle(D.sangleBas,H,spanBas));

  // La chaîne suspendue sous la barre du haut, accrochée à sa sangle du bas.
  const ch=O.chaine;
  if(ch.place!=="aucune"){
    const [f,ax]=HUD_KIT_CHAIN_PLACES[ch.place],w=ch.taille,h=w*G.chaine.h/G.chaine.w;
    haut.push(img(G.chaine.f,at(x0+l*f-w/2+ch.dx,y1+T.sangleBas.dy-h*G.chaine.attache+ch.dy,w,h,ax,"haut")));
  }
  // La couronne : posée sur la barre du bas, ou pendue sous celle du haut.
  const co=O.couronne;
  if(co.place!=="aucune"){
    const sous=co.place==="sous-haut-centre",w=co.taille,h=w*G.couronne.h/G.couronne.w;
    const cx=sous?x0+l/2:W*HUD_KIT_CROWN_PLACES[co.place],ligne=sous?y1+T.sangleBas.dy:bh+D.sangleHaut.dy;
    const y=(co.retournee?ligne-h*G.couronne.base:ligne-h+h*G.couronne.base)+co.dy;
    (sous?haut:bas).push(img(G.couronne.f,at(cx-w/2+co.dx,y,w,h,"milieu",sous?"haut":"bas"),co.retournee?";transform:scaleY(-1)":""));
  }
  // Les emblèmes aux bouts de la barre du haut (celui de gauche en miroir).
  for(const [e,droite] of [[T.emblemeDroit,true],[T.emblemeGauche,false]]){
    if(!e.visible) continue;
    const w=e.taille,h=w*G.embleme.h/G.embleme.w,x=(droite?x0+l-w-HUD_KIT_EMBLEM.marge:x0+HUD_KIT_EMBLEM.marge)+e.dx;
    haut.push(img(G.embleme.f,at(x,y0+HUD_KIT_EMBLEM.haut+e.dy,w,h,droite?"droite":"gauche","haut"),droite?"":";transform:scaleX(-1)"));
  }

  // Le rond central, son trou sur le bouton Jour suivant (au milieu de l'écran, à bar.bas.centre bandes du bas), décalé
  // comme dans la planche ; le bouton dans le trou.
  const R=G.rond,P=bar.bas,ro=D.rond,bo=D.bouton,rw=ro.taille,rh=rw*R.h/R.w;
  const hx=W/2+ro.dx,hy=H-P.centre*B+ro.dy;
  bas.push(img(R.f,at(hx-rw*R.cx,hy-rh*R.cy,rw,rh,"milieu","bas")));

  // Les textes de la barre du haut (hud-top-content) : là où le jeu les met avec la barre du pack (styles.css : leur
  // bande commence à --ht-top bandes du haut ; à gauche, une demi-bande d'air ; à droite, --ht-marge bandes et le bout
  // de la bande du pack), puis déplacés comme dans la planche : de y avec la barre, et l'écart (négatif : vers le
  // milieu) depuis chacun de ses bouts.
  const ph=bar.haut,htB=B*ph.barre;
  const right0=htB*ph.marge+htB/(bar.bandBottom-bar.bandTop)*bar.bandRight*ph.embout;
  const haut0={top:htB*ph.top,gauche:htB*.5};
  return {
    haut:{...ph,top:hudKitRound((haut0.top+y0+T.textes.dy)/htB),gauche:hudKitRound((haut0.gauche+x0-T.textes.ecart)/htB),
      marge:hudKitRound((right0+(W-x0-l)-T.textes.ecart)/htB)},
    bas:{...P,centre:b(H-hy-bo.dy),bouton:b(bo.taille),boutonDx:b(hx+bo.dx-W/2),
      pictosDroite:hudKitRound(P.pictosDroite+D.pictos.ecart/B),pictosGauche:hudKitRound(P.pictosGauche+D.pictos.ecart/B),
      pictosY:hudKitRound(P.pictosY-D.pictos.dy/B)},
    piecesHaut:haut.filter(Boolean).join(""),piecesBas:bas.filter(Boolean).join(""),
    bouton:dir+G.bouton.f
  };
}

if(typeof module!=="undefined"&&module.exports) module.exports={hudKitFor,hudKitBars};
