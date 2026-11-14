"use strict";

// La Taverne (Idan, 2026-11-11 ; sans vidéo depuis le 2026-11-14) : son image en fond, des zones cliquables sur le
// décor ; le bouton du lieu de la barre du bas reprend les cinq zones, dans l'ordre d'Idan.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const html=read("prototype-web/index.html");
const css=read("prototype-web/styles.css");
const js=read("prototype-web/tavern-scene-ui.js");

assert.ok(!/<video|tavern-video/.test(html),"plus de vidéo (« on va la virer pour l'instant »)");
assert.ok(!/tavern-video|TAVERN_VIDEO|\.play\(/.test(js+css));
assert.match(html,/<svg id="tavern-zones"[^>]*preserveAspectRatio="xMidYMid slice"/,"les zones se calent comme l'image");
assert.ok(html.indexOf('src="tavern-ui.js"')<html.indexOf('src="tavern-scene-ui.js"'));
assert.match(css,/url\("\/media\/video\/Img_Tavern\.jpg"\) center center \/ cover/,"l'image de fond");
assert.match(css,/\[data-tavern-view="home"\] \.tavern-zones\{display:block\}/,"les zones sur l'accueil de la taverne seulement");
// Au survol, pas de cadre qui s'éclaire (Idan, 2026-11-11) : seul le nom, fin et petit.
assert.ok(!/\.tavern-zone:hover polygon|\.tavern-zone:focus-visible polygon/.test(css),"pas de cadre au survol");
assert.match(css,/\.tavern-zone polygon\{fill:transparent;stroke:none\}/);
assert.match(css,/\.tavern-zone text\{font:400 /,"un nom fin");

// Les zones : les missions, le recrutement, les deux salles et le tavernier.
const scene=new Function("window","document",js.replace('if(typeof document!=="undefined") initializeTavernScene();','')
  +"return {TAVERN_ZONES,TAVERN_SCENE_SIZE,TAVERN_MENU,tavernZonesSvg};");
const api=scene({},{});
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

// Le menu du lieu (Idan, 2026-11-14 : « Tavernier - missions - recrutement - cave - menu ») : les cinq zones, une fois chacune.
assert.deepEqual(api.TAVERN_MENU,["talk","missions","recruits","cellar","canteen"]);
assert.deepEqual([...api.TAVERN_MENU].sort(),api.TAVERN_ZONES.map(z=>z.key).sort());
console.log("Taverne : image, zones cliquables (salles et tavernier), menu du lieu, sans vidéo — OK");
