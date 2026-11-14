"use strict";

// La Taverne animée (Idan, 2026-11-11) : la vidéo remplace le fond (l'image, sa première image, en attendant et en
// mouvement réduit) ; on clique sur des zones du décor, les mêmes actions que le menu Taverne de la barre du bas.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const html=read("prototype-web/index.html");
const css=read("prototype-web/styles.css");
const js=read("prototype-web/tavern-scene-ui.js");

assert.match(html,/<video id="tavern-video"[^>]* muted loop playsinline preload="none" poster="\/media\/video\/Img_Tavern\.jpg"/,"muette, en boucle, chargée à la demande");
assert.match(html,/<svg id="tavern-zones"[^>]*preserveAspectRatio="xMidYMid slice"/,"les zones se calent comme la vidéo");
assert.ok(html.indexOf('src="tavern-ui.js"')<html.indexOf('src="tavern-scene-ui.js"'));
assert.match(css,/url\("\/media\/video\/Img_Tavern\.jpg"\) center center \/ cover/,"l'image de fond");
assert.match(css,/\.tavern-video\{[^}]*object-fit:cover/);
assert.match(css,/\[data-tavern-view="home"\] \.tavern-zones\{display:block\}/,"les zones sur l'accueil de la taverne seulement");
assert.match(css,/prefers-reduced-motion: reduce\)\{\.tavern-video\{display:none\}\}/);
// Au survol, pas de cadre qui s'éclaire (Idan, 2026-11-11) : seul le nom, fin et petit.
assert.ok(!/\.tavern-zone:hover polygon|\.tavern-zone:focus-visible polygon/.test(css),"pas de cadre au survol");
assert.match(css,/\.tavern-zone polygon\{fill:transparent;stroke:none\}/);
assert.match(css,/\.tavern-zone text\{font:400 /,"un nom fin");

// Les zones : les missions, le recrutement, les deux salles et le tavernier.
const scene=new Function("window","document",js.replace('if(typeof document!=="undefined") initializeTavernScene();','')
  +"return {TAVERN_ZONES,TAVERN_SCENE_SIZE,TAVERN_VIDEO,tavernZonesSvg,updateTavernScene};");
const body={dataset:{}};
const video={attrs:{},paused:true,plays:0,pauses:0,
  getAttribute(k){ return this.attrs[k]??null; },
  set src(v){ this.attrs.src=v; },
  play(){ this.plays++; this.paused=false; return Promise.resolve(); },
  pause(){ this.pauses++; this.paused=true; }};
let reduced=false;
const api=scene({matchMedia:()=>({matches:reduced})},{body,getElementById:id=>id==="tavern-video"?video:null});
assert.deepEqual(api.TAVERN_ZONES.map(z=>[z.key,z.label]),
  [["missions","Trouver une mission"],["recruits","Recruter"],["canteen","La Cantine"],["cellar","La Cave"],["talk","Parler au tavernier"]],"les salles et le tavernier");
for(const z of api.TAVERN_ZONES){
  assert.ok(z.points.length>=3,z.key);
  for(const [x,y] of [...z.points,z.at]) assert.ok(x>=0&&x<=api.TAVERN_SCENE_SIZE.width&&y>=0&&y<=api.TAVERN_SCENE_SIZE.height,z.key);
}
const svg=api.tavernZonesSvg();
assert.equal((svg.match(/<polygon /g)||[]).length,5);
assert.match(svg,/data-tavern-zone="talk" role="button" tabindex="0" aria-label="Parler au tavernier"/,"au clavier aussi");
assert.match(js,/openTavernPlace\(zone\.dataset\.tavernZone\)/,"la salle ou le tavernier (tavern-ui.js)");

// La vidéo : chargée à la première visite de la taverne seulement, en pause ailleurs, jamais en mouvement réduit.
Object.assign(body.dataset,{screen:"camp",campScene:"home"});
api.updateTavernScene();
assert.equal(video.getAttribute("src"),null,"rien de chargé hors de la taverne");
body.dataset.campScene="tavern";
api.updateTavernScene();
assert.equal(video.getAttribute("src"),api.TAVERN_VIDEO);
assert.equal(api.TAVERN_VIDEO,"/media/video/Video_Tavern.mp4");
assert.equal(video.plays,1);
body.dataset.campScene="company";
api.updateTavernScene();
assert.equal(video.pauses,1);
reduced=true;
body.dataset.campScene="tavern";
api.updateTavernScene();
assert.equal(video.plays,1,"pas de vidéo en mouvement réduit");
console.log("Taverne animée : vidéo, image, zones cliquables (salles et tavernier) — OK");
