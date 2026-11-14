"use strict";

// La Taverne en calques (Idan, 2026-11-11, dans l'artefact « Taverne en calques » ; dans le jeu le 2026-11-14 : « je
// pensais que tu allais prendre ça et qu'on allait superposer les png dessus... et faire un glow au survol »). Le décor
// vide d'Idan (avec les ombres des clients), puis ses calques détourés (prototype-web/assets/taverne/), dans le repère de
// son image (1376 × 768), dans des SVG « slice » qui se calent comme le fond en « cover ». Pas de vidéo pour l'instant
// (Idan, 2026-11-14 : « on fera un jour de la vidéo et de l'animation, mais l'urgence, c'est de faire quelque chose de
// joli »). Au survol d'un élément cliquable : un contour lumineux et son nom ; au clic, sa salle (openTavernPlace,
// tavern-ui.js). Le choix se fait au pixel près : le calque le plus haut qui est opaque sous le pointeur (les tonneaux du
// premier plan cachent ce qui est derrière eux). Les autres salles de la taverne gardent l'image complète en fond
// (taverne.webp, styles.css). Le bouton du lieu de la barre du bas reprend les cinq zones, dans l'ordre d'Idan
// (TAVERN_MENU : « Tavernier - missions - recrutement - cave - menu »).
const TAVERN_SCENE_SIZE={width:1376,height:768};
const TAVERN_ASSETS="assets/taverne/";
// Les calques, du fond vers l'avant : [x, y, largeur, hauteur] dans l'image ; zone : la salle qu'il ouvre.
const TAVERN_LAYERS=[
  {key:"fond",box:[0,0,1376,768]},
  {key:"annonce",box:[88,57,292,224],zone:"missions"},
  {key:"menu",box:[423,63,120,216],zone:"canteen"},
  {key:"table2",box:[439,253,320,210],zone:"recruits"},
  {key:"table1",box:[0,251,500,340],zone:"recruits"},
  {key:"trappe",box:[180,423,542,326],zone:"cellar"},
  {key:"tavernier",box:[1022,208,250,544],zone:"talk"},
  {key:"premier-plan",box:[1106,326,270,442]}
];
// Les zones : leur nom (au survol, posé en `at`, au-dessus de l'élément) ; hulls, où le pointeur est capté (l'enveloppe
// des pixels opaques de leurs calques ; le choix se fait ensuite au pixel près).
const TAVERN_ZONES=[
  {key:"missions",label:"Trouver une mission",at:[234,51],hulls:[[[99,59],[127,61],[371,93],[375,97],[378,265],[365,269],[124,278],[95,275],[90,78]]]},
  {key:"recruits",label:"Recruter",at:[378,245],hulls:[
    [[441,319],[485,281],[513,263],[569,255],[707,257],[715,262],[757,314],[749,428],[731,437],[661,461],[563,456],[479,445],[447,432]],
    [[0,347],[95,271],[168,253],[417,264],[425,267],[471,328],[497,465],[484,487],[408,553],[360,572],[56,589],[11,568],[0,482]]]},
  {key:"canteen",label:"La Cantine",at:[483,57],hulls:[[[430,65],[538,83],[541,85],[541,256],[506,267],[456,277],[432,262],[427,202],[425,101]]]},
  {key:"cellar",label:"La Cave",at:[450,417],hulls:[[[209,461],[404,426],[535,425],[710,443],[719,454],[664,644],[597,681],[469,747],[437,739],[247,677],[241,671],[182,478]]]},
  {key:"talk",label:"Parler au tavernier",at:[1147,202],hulls:[[[1032,369],[1123,222],[1163,211],[1188,223],[1251,321],[1261,345],[1269,388],[1270,420],[1232,732],[1209,749],[1191,748],[1055,709],[1046,699],[1024,400]]]}
];
const TAVERN_MENU=["talk","missions","recruits","cellar","canteen"];

// Le contour lumineux (celui de l'artefact : un peu plus clair, un liseré doré, un halo plus large).
const TAVERN_GLOW=`<filter id="tavern-glow" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
  <feComponentTransfer in="SourceGraphic" result="lit"><feFuncR type="linear" slope="1.12"/><feFuncG type="linear" slope="1.12"/><feFuncB type="linear" slope="1.12"/></feComponentTransfer>
  <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="near"/><feFlood flood-color="#ffd696" flood-opacity=".9"/><feComposite in2="near" operator="in" result="edge"/>
  <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="far"/><feFlood flood-color="#ffb45a" flood-opacity=".45"/><feComposite in2="far" operator="in" result="halo"/>
  <feMerge><feMergeNode in="halo"/><feMergeNode in="edge"/><feMergeNode in="lit"/></feMerge></filter>`;

// Le décor : les calques et les noms (derrière les panneaux de la taverne, sans capter le pointeur).
function tavernSceneSvg(){
  const layer=L=>`<image class="tavern-layer" data-tavern-layer="${L.key}"${L.zone?` data-layer-zone="${L.zone}"`:""} href="${TAVERN_ASSETS}${L.key}.webp" x="${L.box[0]}" y="${L.box[1]}" width="${L.box[2]}" height="${L.box[3]}" preserveAspectRatio="none"/>`;
  const label=z=>`<text class="tavern-label" data-tavern-label="${z.key}" x="${z.at[0]}" y="${z.at[1]}" text-anchor="middle">${z.label}</text>`;
  return `<defs>${TAVERN_GLOW}</defs>${TAVERN_LAYERS.map(layer).join("")}${TAVERN_ZONES.map(label).join("")}`;
}
// Les zones qui captent le pointeur (au-dessus des panneaux) : transparentes, au clavier aussi.
function tavernZonesSvg(){
  const zone=z=>`<g class="tavern-zone" data-tavern-zone="${z.key}" role="button" tabindex="0" aria-label="${z.label}">`
    +z.hulls.map(h=>`<polygon points="${h.map(p=>p.join(",")).join(" ")}"/>`).join("")+`</g>`;
  return TAVERN_ZONES.map(zone).join("");
}

// Le calque le plus haut qui est opaque en (x, y) : sa zone, ou rien (le fond, ou un calque qui n'ouvre rien et cache ce
// qui est derrière). alpha(L, px, py) : l'opacité (0-255) du pixel du calque L ; null tant que l'image n'est pas lue.
function tavernPick(x,y,alpha){
  for(let i=TAVERN_LAYERS.length-1;i>0;i--){
    const L=TAVERN_LAYERS[i],[bx,by,bw,bh]=L.box;
    if(x<bx||y<by||x>=bx+bw||y>=by+bh) continue;
    const a=alpha(L,Math.floor(x-bx),Math.floor(y-by));
    if(a==null) return undefined;
    if(a>40) return L.zone||null;
  }
  return null;
}

function initializeTavernScene(){
  const scene=document.getElementById("tavern-scene"),svg=document.getElementById("tavern-zones");
  if(!scene||!svg) return;
  const viewBox=`0 0 ${TAVERN_SCENE_SIZE.width} ${TAVERN_SCENE_SIZE.height}`;
  scene.setAttribute("viewBox",viewBox);
  scene.innerHTML=tavernSceneSvg();
  svg.setAttribute("viewBox",viewBox);
  svg.innerHTML=tavernZonesSvg();
  // L'opacité de chaque calque, lue une fois chargé.
  const pixels={};
  for(const L of TAVERN_LAYERS.slice(1)){
    const img=new Image();
    img.addEventListener("load",()=>{
      try{
        const c=document.createElement("canvas");
        c.width=img.naturalWidth;c.height=img.naturalHeight;
        const g=c.getContext("2d",{willReadFrequently:true});
        g.drawImage(img,0,0);
        pixels[L.key]={w:c.width,data:g.getImageData(0,0,c.width,c.height).data};
      }catch(error){ /* image illisible : la zone sous le pointeur décide */ }
    },{once:true});
    img.src=TAVERN_ASSETS+L.key+".webp";
  }
  const alpha=(L,px,py)=>{ const p=pixels[L.key]; return p?p.data[(py*p.w+px)*4+3]:null; };
  let hovered=null;
  const setHover=key=>{
    if(key===hovered) return;
    hovered=key;
    for(const el of scene.querySelectorAll("[data-layer-zone]")) el.classList.toggle("is-hover",el.dataset.layerZone===key);
    for(const el of scene.querySelectorAll("[data-tavern-label]")) el.classList.toggle("is-on",el.dataset.tavernLabel===key);
    svg.classList.toggle("is-pointer",Boolean(key));
  };
  // Le point de l'image sous le pointeur ; la zone : au pixel près, ou celle de l'enveloppe tant que les images se lisent.
  const pick=event=>{
    const m=svg.getScreenCTM?.();
    if(!m) return event.target.closest?.("[data-tavern-zone]")?.dataset.tavernZone||null;
    const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(m.inverse());
    const zone=tavernPick(p.x,p.y,alpha);
    return zone===undefined?event.target.closest?.("[data-tavern-zone]")?.dataset.tavernZone||null:zone;
  };
  const open=key=>{ setHover(null); if(key&&typeof openTavernPlace==="function") openTavernPlace(key); };
  svg.addEventListener("pointermove",event=>setHover(pick(event)));
  svg.addEventListener("pointerleave",()=>setHover(null));
  svg.addEventListener("click",event=>open(pick(event)));
  svg.addEventListener("focusin",event=>setHover(event.target.closest?.("[data-tavern-zone]")?.dataset.tavernZone||null));
  svg.addEventListener("focusout",()=>setHover(null));
  svg.addEventListener("keydown",event=>{
    if(event.key!=="Enter"&&event.key!==" ") return;
    const zone=event.target.closest?.("[data-tavern-zone]");
    if(!zone) return;
    event.preventDefault();
    open(zone.dataset.tavernZone);
  });
}

if(typeof document!=="undefined") initializeTavernScene();
