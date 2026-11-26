"use strict";

// La Taverne en calques (Idan, 2026-11-11, dans l'artefact « Taverne en calques » ; dans le jeu le 2026-11-14 : « je
// pensais que tu allais prendre ça et qu'on allait superposer les png dessus... et faire un glow au survol »). Le décor
// vide d'Idan (avec les ombres des clients), puis ses calques détourés (prototype-web/assets/taverne/), dans le repère de
// son image (1376 × 768), dans des SVG « slice » qui se calent comme le fond en « cover ». Pas de vidéo pour l'instant
// (Idan, 2026-11-14 : « on fera un jour de la vidéo et de l'animation, mais l'urgence, c'est de faire quelque chose de
// joli »). Au survol d'un élément cliquable : un contour lumineux et son nom ; au clic, sa salle (openTavernPlace,
// tavern-ui.js). Le choix se fait au pixel près : le calque le plus haut qui est opaque sous le pointeur (les tonneaux du
// premier plan cachent ce qui est derrière eux). Les autres salles de la taverne gardent le même décor en fond, et il
// s'efface en fondu à la sortie (styles.css) : on n'y entrevoit jamais un autre tavernier. Le bouton du lieu de la barre
// du bas reprend les cinq zones, dans l'ordre d'Idan (TAVERN_MENU : « Tavernier - missions - recrutement - cave - menu »).
// Le tavernier et les tables changent à chaque entrée dans la taverne (Idan, 2026-11-14 : « au chargement de la taverne,
// on charge une image au hasard du tavernier » ; pour la table : « L'idée, c'est des variantes ») : l'original ou l'une
// de ses variantes. Les images, leurs cadres et les enveloppes viennent de tavern-layers.js (écrit par
// scripts/build-tavern.js depuis les images d'Idan, haute définition comprise ; le repère reste 1376 × 768).
const TAVERN_SCENE_SIZE={width:1376,height:768};
const TAVERN_ASSETS="assets/taverne/";
const TAVERN_DATA_BOXES=typeof TAVERN_LAYER_BOXES!=="undefined"?TAVERN_LAYER_BOXES:{};
const TAVERN_DATA_HULLS=typeof TAVERN_ZONE_HULLS!=="undefined"?TAVERN_ZONE_HULLS:{};
// Les calques, du fond vers l'avant : [x, y, largeur, hauteur] dans la taverne ; zone : la salle qu'il ouvre.
const TAVERN_LAYERS=[
  {key:"fond",box:[0,0,1376,768]},
  {key:"annonce",zone:"missions"},
  {key:"menu",zone:"canteen"},
  {key:"table2",zone:"recruits",variants:true},
  {key:"table1",zone:"recruits",variants:true},
  {key:"trappe",zone:"cellar"},
  {key:"tavernier",zone:"talk",variants:true},
  {key:"premier-plan"}
].map(L=>({...L,box:L.box||TAVERN_DATA_BOXES[L.key]||[0,0,0,0]}));
// Les zones : leur nom (au survol, au-dessus de l'élément) ; hulls, où le pointeur est capté (l'enveloppe des pixels
// opaques de leurs calques ; le choix se fait ensuite au pixel près).
const TAVERN_ZONES=[
  {key:"missions",label:"Trouver une mission"},
  {key:"recruits",label:"Recruter"},
  {key:"canteen",label:"La Cantine"},
  {key:"cellar",label:"La Cave"},
  {key:"talk",label:"Parler au tavernier"}
].map(z=>({...z,hulls:TAVERN_DATA_HULLS[z.key]||[],at:tavernLabelAt(TAVERN_LAYERS.filter(L=>L.zone===z.key).map(L=>L.box))}));
// Le nom : au milieu, au-dessus des calques de la zone.
function tavernLabelAt(boxes){
  if(!boxes.length) return [0,0];
  const x0=Math.min(...boxes.map(b=>b[0])),x1=Math.max(...boxes.map(b=>b[0]+b[2])),y0=Math.min(...boxes.map(b=>b[1]));
  return [Math.round((x0+x1)/2),Math.max(14,Math.round(y0-7))];
}
// Un calque et ses variantes : l'original (son cadre d'origine, même après le tirage d'une variante), puis les variantes ;
// un au hasard à chaque entrée dans la taverne.
function tavernVariants(key){
  const more=typeof TAVERN_VARIANTS!=="undefined"?TAVERN_VARIANTS[key]||[]:[];
  return [{key,src:TAVERN_ASSETS+key+".webp",box:TAVERN_DATA_BOXES[key]||[0,0,0,0]},
    ...more.map(v=>({key:v.key,src:TAVERN_ASSETS+v.src,box:v.box}))];
}
function pickTavernVariant(key,random=Math.random){
  const all=tavernVariants(key);
  return all[Math.min(all.length-1,Math.floor(random()*all.length))];
}
const tavernTaverniers=()=>tavernVariants("tavernier");
const pickTavernier=(random=Math.random)=>pickTavernVariant("tavernier",random);
const tavernLayerSrc=L=>L.src||TAVERN_ASSETS+L.key+".webp";
const TAVERN_MENU=["talk","missions","recruits","cellar","canteen"];
// Une salle à construire n'apparaît qu'une fois construite (Idan, 2026-11-26 : « l'image du menu n'apparaît pas si on n'a
// pas construit la cantine (le mur reste vide) ») : son calque, sa zone, son nom et sa ligne du bouton du lieu. La zone et
// le bâtiment qui l'ouvre (camp-buildings.json) ; elle se construit dans la fenêtre Construction (camp-buildings-ui.js).
const TAVERN_ZONE_BUILDINGS={canteen:"canteen"};
function tavernZoneOpen(key,campaign=typeof game!=="undefined"?game.campaign:null){
  const code=TAVERN_ZONE_BUILDINGS[key];
  if(!code) return true;
  if(!campaign||typeof campaignRules!=="function") return false;
  return campaignRules().buildingLevel(campaign,code)>0;
}
const tavernClosedZones=campaign=>new Set(Object.keys(TAVERN_ZONE_BUILDINGS).filter(key=>!tavernZoneOpen(key,campaign)));

// Le contour lumineux (celui de l'artefact : un peu plus clair, un liseré doré, un halo plus large).
const TAVERN_GLOW=`<filter id="tavern-glow" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
  <feComponentTransfer in="SourceGraphic" result="lit"><feFuncR type="linear" slope="1.12"/><feFuncG type="linear" slope="1.12"/><feFuncB type="linear" slope="1.12"/></feComponentTransfer>
  <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="near"/><feFlood flood-color="#ffd696" flood-opacity=".9"/><feComposite in2="near" operator="in" result="edge"/>
  <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="far"/><feFlood flood-color="#ffb45a" flood-opacity=".45"/><feComposite in2="far" operator="in" result="halo"/>
  <feMerge><feMergeNode in="halo"/><feMergeNode in="edge"/><feMergeNode in="lit"/></feMerge></filter>`;

// Le décor : les calques et les noms (derrière les panneaux de la taverne, sans capter le pointeur).
function tavernSceneSvg(){
  const layer=L=>`<image class="tavern-layer" data-tavern-layer="${L.key}"${L.zone?` data-layer-zone="${L.zone}"`:""} href="${tavernLayerSrc(L)}" x="${L.box[0]}" y="${L.box[1]}" width="${L.box[2]}" height="${L.box[3]}" preserveAspectRatio="none"/>`;
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
// closed : les zones pas encore construites, dont le calque est caché (il ne capte rien et ne cache rien).
function tavernPick(x,y,alpha,closed=new Set()){
  for(let i=TAVERN_LAYERS.length-1;i>0;i--){
    const L=TAVERN_LAYERS[i],[bx,by,bw,bh]=L.box;
    if(L.zone&&closed.has(L.zone)) continue;
    if(x<bx||y<by||x>=bx+bw||y>=by+bh) continue;
    const a=alpha(L,Math.floor(x-bx),Math.floor(y-by));
    if(a==null) return undefined;
    if(a>40) return L.zone||null;
  }
  return null;
}

// Le décor suit ce qui est construit : les calques, zones et noms d'une salle pas encore construite sont cachés.
function updateTavernScene(campaign=typeof game!=="undefined"?game.campaign:null){
  if(typeof document==="undefined") return;
  const closed=tavernClosedZones(campaign);
  for(const el of document.querySelectorAll("[data-layer-zone],[data-tavern-zone],[data-tavern-label]")){
    const key=el.dataset.layerZone||el.dataset.tavernZone||el.dataset.tavernLabel;
    el.classList.toggle("is-closed",closed.has(key));
  }
}
function initializeTavernScene(){
  const scene=document.getElementById("tavern-scene"),svg=document.getElementById("tavern-zones");
  if(!scene||!svg) return;
  const viewBox=`0 0 ${TAVERN_SCENE_SIZE.width} ${TAVERN_SCENE_SIZE.height}`;
  scene.setAttribute("viewBox",viewBox);
  scene.innerHTML=tavernSceneSvg();
  svg.setAttribute("viewBox",viewBox);
  svg.innerHTML=tavernZonesSvg();
  // L'opacité de chaque calque, lue une fois chargé (par image : le tavernier change).
  const pixels={};
  const readPixels=src=>{
    if(src in pixels) return;
    pixels[src]=null;
    const img=new Image();
    img.addEventListener("load",()=>{
      try{
        const c=document.createElement("canvas");
        c.width=img.naturalWidth;c.height=img.naturalHeight;
        const g=c.getContext("2d",{willReadFrequently:true});
        g.drawImage(img,0,0);
        pixels[src]={w:c.width,h:c.height,data:g.getImageData(0,0,c.width,c.height).data};
      }catch(error){ /* image illisible : la zone sous le pointeur décide */ }
    },{once:true});
    img.src=src;
  };
  for(const L of TAVERN_LAYERS.slice(1)) readPixels(tavernLayerSrc(L));
  // Le pixel de l'image (en haute définition, plus de pixels que le repère de la taverne).
  const alpha=(L,px,py)=>{
    const p=pixels[tavernLayerSrc(L)];
    if(!p) return null;
    const ix=Math.min(p.w-1,Math.floor(px*p.w/L.box[2])),iy=Math.min(p.h-1,Math.floor(py*p.h/L.box[3]));
    return p.data[(iy*p.w+ix)*4+3];
  };
  // Un tavernier et des tables au hasard : leur image, leur cadre ; le nom de leur zone au-dessus d'eux.
  const chooseVariants=()=>{
    for(const L of TAVERN_LAYERS.filter(L=>L.variants)){
      const v=pickTavernVariant(L.key);
      Object.assign(L,{src:v.src,box:v.box,variant:v.key});
      const [x,y,w,h]=v.box,image=scene.querySelector(`[data-tavern-layer="${L.key}"]`);
      if(image) for(const [k,val] of Object.entries({href:v.src,x,y,width:w,height:h})) image.setAttribute(k,String(val));
      readPixels(v.src);
      const z=TAVERN_ZONES.find(z=>z.key===L.zone),label=scene.querySelector(`[data-tavern-label="${L.zone}"]`);
      z.at=tavernLabelAt(TAVERN_LAYERS.filter(M=>M.zone===L.zone).map(M=>M.box));
      if(label){ label.setAttribute("x",String(z.at[0])); label.setAttribute("y",String(z.at[1])); }
    }
  };
  chooseVariants();
  updateTavernScene();
  // À chaque entrée dans la taverne.
  let lastScene=document.body?.dataset.campScene;
  if(typeof MutationObserver!=="undefined"&&document.body) new MutationObserver(()=>{
    const now=document.body.dataset.campScene;
    if(now==="tavern"&&lastScene!=="tavern") chooseVariants();
    lastScene=now;
  }).observe(document.body,{attributes:true,attributeFilter:["data-camp-scene"]});
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
    const zone=tavernPick(p.x,p.y,alpha,tavernClosedZones(game.campaign));
    const any=event.target.closest?.("[data-tavern-zone]:not(.is-closed)")?.dataset.tavernZone||null;
    return zone===undefined?any:zone;
  };
  const open=key=>{ setHover(null); if(key&&tavernZoneOpen(key)&&typeof openTavernPlace==="function") openTavernPlace(key); };
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
