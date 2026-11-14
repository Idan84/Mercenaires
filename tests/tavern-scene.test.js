"use strict";

// La Taverne en calques (Idan, 2026-11-11, l'artefact « Taverne en calques » ; dans le jeu le 2026-11-14 : « superposer
// les png dessus... et faire un glow au survol ») : le décor vide, ses calques détourés, les zones cliquables au pixel
// près ; le bouton du lieu de la barre du bas reprend les cinq zones, dans l'ordre d'Idan. Pas de vidéo pour l'instant.
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
assert.match(html,/<svg id="tavern-scene" class="tavern-scene" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><\/svg>\n  <svg id="tavern-zones" class="tavern-zones" preserveAspectRatio="xMidYMid slice"/,"le décor, puis les zones, calés comme le fond");
assert.ok(html.indexOf('src="tavern-ui.js"')<html.indexOf('src="tavern-scene-ui.js"'));
assert.match(css,/url\("assets\/taverne\/taverne\.webp"\) center center \/ cover/,"l'image complète derrière les salles");
assert.match(css,/\.tavern-scene\{z-index:0\}\n\.tavern-zones\{z-index:2\}/,"le décor derrière les panneaux, les zones au-dessus");
assert.match(css,/\[data-tavern-view="home"\] \.tavern-scene,\nbody[^{]*\[data-tavern-view="home"\] \.tavern-zones\{display:block\}/,"sur l'accueil de la taverne seulement");
assert.match(css,/\.tavern-layer\.is-hover\{filter:url\(#tavern-glow\)\}/,"le glow au survol");
assert.match(css,/\.tavern-label\.is-on\{opacity:1\}/,"et le nom");

const scene=new Function("window","document","TAVERN_TAVERNIERS","TAVERN_TAVERNIER_HULL",js.replace('if(typeof document!=="undefined") initializeTavernScene();','')
  +"return {TAVERN_ZONES,TAVERN_SCENE_SIZE,TAVERN_LAYERS,TAVERN_MENU,TAVERN_ASSETS,tavernSceneSvg,tavernZonesSvg,tavernPick,tavernTaverniers,pickTavernier};");
const variants=require("../prototype-web/tavern-taverniers.js");
const api=scene({},{},variants.TAVERN_TAVERNIERS,variants.TAVERN_TAVERNIER_HULL);
const {width:W,height:H}=api.TAVERN_SCENE_SIZE;
assert.deepEqual([W,H],[1376,768]);
// Les calques : le décor, puis du fond vers l'avant ; chacun dans l'image, son fichier dans le jeu, à sa taille.
assert.deepEqual(api.TAVERN_LAYERS.map(L=>[L.key,L.zone||""]),[["fond",""],["annonce","missions"],["menu","canteen"],["table2","recruits"],
  ["table1","recruits"],["trappe","cellar"],["tavernier","talk"],["premier-plan",""]]);
const {execFileSync}=require("node:child_process");
for(const L of api.TAVERN_LAYERS){
  const [x,y,w,h]=L.box,file=path.join(root,"prototype-web",api.TAVERN_ASSETS,L.key+".webp");
  assert.ok(x>=0&&y>=0&&x+w<=W&&y+h<=H,L.key);
  assert.ok(fs.existsSync(file),L.key);
  let size=null;
  try{ size=execFileSync("identify",["-format","%w %h",file],{encoding:"utf8"}).trim(); }catch{ /* sans ImageMagick */ }
  if(size) assert.equal(size,`${w} ${h}`,L.key+" : à sa taille");
}
assert.ok(fs.existsSync(path.join(root,"prototype-web",api.TAVERN_ASSETS,"taverne.webp")));
// Les zones : les salles et le tavernier, leur nom, où le pointeur est capté.
assert.deepEqual(api.TAVERN_ZONES.map(z=>[z.key,z.label]),
  [["missions","Trouver une mission"],["recruits","Recruter"],["canteen","La Cantine"],["cellar","La Cave"],["talk","Parler au tavernier"]],"les salles et le tavernier");
for(const z of api.TAVERN_ZONES){
  assert.ok(api.TAVERN_LAYERS.some(L=>L.zone===z.key),z.key+" : un calque");
  for(const h of z.hulls){
    assert.ok(h.length>=3,z.key);
    for(const [x,y] of [...h,z.at]) assert.ok(x>=0&&x<=W&&y>=0&&y<=H,z.key);
  }
}
const decor=api.tavernSceneSvg();
assert.match(decor,/<filter id="tavern-glow"/);
assert.equal((decor.match(/<image class="tavern-layer"/g)||[]).length,8);
assert.match(decor,/<image class="tavern-layer" data-tavern-layer="tavernier" data-layer-zone="talk" href="assets\/taverne\/tavernier\.webp" x="1022" y="208" width="250" height="544"/);
assert.match(decor,/<text class="tavern-label" data-tavern-label="talk" x="1147" y="202" text-anchor="middle">Parler au tavernier<\/text>/);
const zones=api.tavernZonesSvg();
assert.equal((zones.match(/<polygon /g)||[]).length,6,"une enveloppe par calque cliquable");
assert.match(zones,/data-tavern-zone="talk" role="button" tabindex="0" aria-label="Parler au tavernier"/,"au clavier aussi");
assert.match(js,/openTavernPlace\(key\)/,"la salle ou le tavernier (tavern-ui.js)");

// Au pixel près : le calque le plus haut qui est opaque ; les tonneaux du premier plan cachent le tavernier ; le décor
// n'ouvre rien ; tant que les images ne sont pas lues, on ne sait pas (la zone de l'enveloppe décide).
const opaque={tavernier:true,"premier-plan":true,trappe:false};
const alpha=(L,px,py)=>L.key in opaque?(opaque[L.key]?255:0):0;
assert.equal(api.tavernPick(1150,300,alpha),"talk");
assert.equal(api.tavernPick(1150,400,alpha),null,"derrière les tonneaux");
assert.equal(api.tavernPick(700,700,alpha),null,"le sol de la taverne");
assert.equal(api.tavernPick(1150,300,()=>null),undefined);

// Le tavernier change à chaque entrée dans la taverne (Idan, 2026-11-14 : « au chargement de la taverne, on charge une
// image au hasard du tavernier ») : l'original ou l'une des variantes d'Idan (scripts/build-tavern.js), chacune à sa
// place, à sa taille ; le pointeur est capté sur l'enveloppe de tous.
const all=api.tavernTaverniers();
assert.equal(all.length,1+variants.TAVERN_TAVERNIERS.length);
assert.ok(variants.TAVERN_TAVERNIERS.length>=28,"les 28 variantes d'Idan");
assert.deepEqual(all[0],{key:"tavernier",src:"assets/taverne/tavernier.webp",box:[1022,208,250,544]},"l'original d'abord");
for(const v of all.slice(1)){
  const [x,y,w,h]=v.box,file=path.join(root,"prototype-web",v.src);
  assert.ok(x>=0&&y>=0&&x+w<=W&&y+h<=H&&x>900&&y>150,v.key+" : à la place du tavernier");
  assert.ok(fs.existsSync(file),v.key);
  let size=null;
  try{ size=execFileSync("identify",["-format","%w %h",file],{encoding:"utf8"}).trim(); }catch{ /* sans ImageMagick */ }
  if(size) assert.equal(size,`${w} ${h}`,v.key);
}
assert.equal(new Set(all.map(v=>v.key)).size,all.length,"des noms uniques");
assert.deepEqual([api.pickTavernier(()=>0).key,api.pickTavernier(()=>0.9999).key],["tavernier",all[all.length-1].key]);
assert.equal(api.TAVERN_ZONES.find(z=>z.key==="talk").hulls[0],variants.TAVERN_TAVERNIER_HULL);
for(const [x,y] of variants.TAVERN_TAVERNIER_HULL) assert.ok(x>=0&&x<=W&&y>=0&&y<=H);
assert.match(js,/if\(now==="tavern"&&lastScene!=="tavern"\) chooseTavernier\(\);/,"un nouveau tirage à chaque entrée");
assert.ok(html.indexOf('src="tavern-taverniers.js"')<html.indexOf('src="tavern-scene-ui.js"'));
const {variantKey}=require("../scripts/build-tavern.js");
assert.deepEqual(["Dwarf_tavern_keeper_holding_ale_ab54f84f.jpg","Dwarf_counting_coins_9f85b58d.jpg","Surprised_dwarf_tavern_keeper_st…_28bf94a3.jpg"].map(variantKey),
  ["holding-ale","counting-coins","surprised-st"]);

// Le menu du lieu (Idan, 2026-11-14 : « Tavernier - missions - recrutement - cave - menu ») : les cinq zones, une fois chacune.
assert.deepEqual(api.TAVERN_MENU,["talk","missions","recruits","cellar","canteen"]);
assert.deepEqual([...api.TAVERN_MENU].sort(),api.TAVERN_ZONES.map(z=>z.key).sort());
console.log("Taverne en calques : décor, calques détourés, zones au pixel près, glow, menu du lieu — OK");
