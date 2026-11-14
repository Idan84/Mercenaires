"use strict";

// La Taverne (Idan, 2026-11-11) : « Ce que je voudrais vraiment, c'est qu'on puisse cliquer sur des zones. » Sur l'image
// de la taverne (déposée par Idan sur Hostinger, hors de Git : /media/video/Img_Tavern.jpg), cinq zones cliquables : des
// polygones dans le repère de l'image, dans un SVG « slice » qui se cale exactement comme l'image en « cover ». Plus de
// vidéo pour l'instant (Idan, 2026-11-14 : « on va la virer pour l'instant […] l'urgence, c'est de faire quelque chose
// de joli »). Les actions : openTavernPlace (tavern-ui.js). Le bouton du lieu de la barre du bas reprend les cinq zones, dans
// l'ordre d'Idan (TAVERN_MENU : « Tavernier - missions - recrutement - cave - menu »).
const TAVERN_SCENE_SIZE={width:1920,height:1080};
const TAVERN_ZONES=[
  {key:"missions",label:"Trouver une mission",at:[325,240],points:[[128,88],[520,84],[524,385],[132,390]]},
  {key:"recruits",label:"Recruter",at:[520,470],points:[[0,520],[60,440],[135,398],[530,398],[600,392],[765,392],[790,365],[1000,360],[1040,470],[1010,590],[705,598],[640,620],[575,600],[255,660],[250,800],[20,820],[0,760]]},
  {key:"canteen",label:"La Cantine",at:[672,240],points:[[592,92],[752,88],[760,350],[748,385],[600,380],[588,300]]},
  {key:"cellar",label:"La Cave",at:[650,800],points:[[255,662],[575,600],[640,620],[705,598],[1000,622],[960,830],[1040,880],[900,990],[640,1060],[560,1050],[390,960],[330,930]]},
  {key:"talk",label:"Parler au tavernier",at:[1615,560],points:[[1530,300],[1600,280],[1680,320],[1700,420],[1760,470],[1790,600],[1740,700],[1720,800],[1760,1000],[1640,1020],[1520,1000],[1480,830],[1500,700],[1450,640],[1440,540],[1470,470],[1520,430],[1510,360]]}
];
const TAVERN_MENU=["talk","missions","recruits","cellar","canteen"];

function tavernZonesSvg(){
  const zone=z=>`<g class="tavern-zone" data-tavern-zone="${z.key}" role="button" tabindex="0" aria-label="${z.label}">`
    +`<polygon points="${z.points.map(p=>p.join(",")).join(" ")}"/>`
    +`<text x="${z.at[0]}" y="${z.at[1]}" text-anchor="middle">${z.label}</text></g>`;
  return TAVERN_ZONES.map(zone).join("");
}

function initializeTavernScene(){
  const svg=document.getElementById("tavern-zones");
  if(svg){
    svg.setAttribute("viewBox",`0 0 ${TAVERN_SCENE_SIZE.width} ${TAVERN_SCENE_SIZE.height}`);
    svg.innerHTML=tavernZonesSvg();
    const choose=target=>{
      const zone=target.closest?.("[data-tavern-zone]");
      if(zone&&typeof openTavernPlace==="function") openTavernPlace(zone.dataset.tavernZone);
    };
    svg.addEventListener("click",event=>choose(event.target));
    svg.addEventListener("keydown",event=>{
      if(event.key!=="Enter"&&event.key!==" ") return;
      event.preventDefault();
      choose(event.target);
    });
  }
}

if(typeof document!=="undefined") initializeTavernScene();
