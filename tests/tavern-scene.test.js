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
// Sous le décor, le fond vide, sans tavernier (Idan, 2026-11-14 : « quand on quitte la taverne, on voit un glimpse entre le
// tavernier par défaut et l'alternate ») ; le décor fond avec lui, dans toutes les vues de la taverne.
assert.match(css,/url\("assets\/taverne\/fond\.webp"\) center center \/ cover/,"le fond vide sous le décor");
assert.ok(!/taverne\/taverne\.webp/.test(css),"plus l'image complète (le tavernier par défaut) en fond");
assert.match(css,/body\[data-screen="camp"\] \.tavern-scene\{display:block;opacity:0;visibility:hidden;transition:opacity \.36s ease-in-out,visibility 0s linear \.36s\}/,"il s'efface en fondu");
assert.match(css,/body\[data-screen="camp"\]\[data-camp-scene="tavern"\] \.tavern-scene\{opacity:1;visibility:visible;/,"dans toutes les vues de la taverne");
assert.match(css,/\[data-tavern-view="home"\] \.tavern-zones\{display:block\}/,"les zones, sur l'accueil seulement");
assert.match(css,/\.tavern-scene\{z-index:0\}\n\.tavern-zones\{z-index:2\}/,"le décor derrière les panneaux, les zones au-dessus");
assert.match(css,/\.tavern-layer\.is-hover\{filter:url\(#tavern-glow\)\}/,"le glow au survol");
assert.match(css,/\.tavern-label\.is-on\{opacity:1\}/,"et le nom");

const scene=new Function("window","document","TAVERN_VARIANTS","TAVERN_LAYER_BOXES","TAVERN_ZONE_HULLS",js.replace('if(typeof document!=="undefined") initializeTavernScene();','')
  +"return {TAVERN_ZONES,TAVERN_SCENE_SIZE,TAVERN_LAYERS,TAVERN_MENU,TAVERN_ASSETS,tavernSceneSvg,tavernZonesSvg,tavernPick,tavernTaverniers,pickTavernier,tavernVariants,pickTavernVariant};");
// Les calques, leurs cadres et les taverniers : tavern-layers.js, écrit par scripts/build-tavern.js depuis les images d'Idan.
const data=require("../prototype-web/tavern-layers.js");
const api=scene({},{},data.TAVERN_VARIANTS,data.TAVERN_LAYER_BOXES,data.TAVERN_ZONE_HULLS);
const variants=data;
// La qualité avant le poids (Idan, 2026-11-14) : les images gardent tous les pixels d'Idan ; le repère reste 1376 × 768.
const scale=data.TAVERN_SOURCE_SIZE.width/1376;
assert.ok(scale>=1&&Math.abs(data.TAVERN_SOURCE_SIZE.height/768-scale)<0.01,"le format de la taverne");
const sizeOf=file=>{ try{ return execFileSync("identify",["-format","%w %h",file],{encoding:"utf8"}).trim().split(" ").map(Number); }catch{ return null; } };
// Chaque image à sa taille (Idan les passe en haute définition une à une) : son cadre, à la même échelle en largeur et en
// hauteur, jamais plus petite que le repère.
const fits=(size,box,label)=>{ if(size){ const rw=size[0]/box[2],rh=size[1]/box[3]; assert.ok(rw>=0.99&&Math.abs(rw-rh)<0.03,label+" : à sa taille"); } };
const {width:W,height:H}=api.TAVERN_SCENE_SIZE;
assert.deepEqual([W,H],[1376,768]);
// Les calques : le décor, puis du fond vers l'avant ; chacun dans l'image, son fichier dans le jeu, à sa taille.
assert.deepEqual(api.TAVERN_LAYERS.map(L=>[L.key,L.zone||""]),[["fond",""],["annonce","missions"],["menu","canteen"],["table2","recruits"],
  ["table1","recruits"],["trappe","cellar"],["tavernier","talk"],["premier-plan",""]]);
for(const L of api.TAVERN_LAYERS){
  const [x,y,w,h]=L.box,file=path.join(root,"prototype-web",api.TAVERN_ASSETS,L.key+".webp");
  assert.ok(x>=0&&y>=0&&x+w<=W&&y+h<=H,L.key);
  assert.ok(fs.existsSync(file),L.key);
  assert.ok(w>0&&h>0,L.key+" : un cadre");
  fits(sizeOf(file),L.box,L.key);
}
assert.ok(!fs.existsSync(path.join(root,"prototype-web",api.TAVERN_ASSETS,"taverne.webp")),"plus d'image complète (le tavernier par défaut)");
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
const tb=data.TAVERN_LAYER_BOXES.tavernier;
assert.ok(decor.includes(`<image class="tavern-layer" data-tavern-layer="tavernier" data-layer-zone="talk" href="assets/taverne/tavernier.webp" x="${tb[0]}" y="${tb[1]}" width="${tb[2]}" height="${tb[3]}" preserveAspectRatio="none"/>`));
assert.ok(decor.includes(`<text class="tavern-label" data-tavern-label="talk" x="${Math.round(tb[0]+tb[2]/2)}" y="${Math.round(tb[1]-7)}" text-anchor="middle">Parler au tavernier</text>`),"le nom au-dessus de lui");
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
assert.equal(all.length,1+variants.TAVERN_VARIANTS.tavernier.length);
assert.ok(variants.TAVERN_VARIANTS.tavernier.length>=28,"les 28 variantes d'Idan");
assert.deepEqual(all[0],{key:"tavernier",src:"assets/taverne/tavernier.webp",box:data.TAVERN_LAYER_BOXES.tavernier},"l'original d'abord");
for(const v of all.slice(1)){
  const [x,y,w,h]=v.box,file=path.join(root,"prototype-web",v.src);
  assert.ok(x>=0&&y>=0&&x+w<=W&&y+h<=H&&x>900&&y>150,v.key+" : à la place du tavernier");
  assert.ok(fs.existsSync(file),v.key);
  fits(sizeOf(file),v.box,v.key);
}
assert.equal(new Set(all.map(v=>v.key)).size,all.length,"des noms uniques");
assert.deepEqual([api.pickTavernier(()=>0).key,api.pickTavernier(()=>0.9999).key],["tavernier",all[all.length-1].key]);
assert.equal(api.TAVERN_ZONES.find(z=>z.key==="talk").hulls.length,1,"une seule enveloppe pour tous les taverniers");
assert.match(js,/if\(now==="tavern"&&lastScene!=="tavern"\) chooseVariants\(\);/,"un nouveau tirage à chaque entrée");
assert.ok(html.indexOf('src="tavern-layers.js"')<html.indexOf('src="tavern-scene-ui.js"'));
const {variantKey,keyPixels,KEY,SHADOW_EDIT}=require("../scripts/build-tavern.js");
// Les ombres des clients (Idan, 2026-11-14 : « couper l'image à peu près à la moitié (elle passe devant le comptoir) » ;
// « la flouter beaucoup pour qu'elle soit raccord avec les orcs ou les nains ») : floutées, effacées passé la moitié.
assert.ok(SHADOW_EDIT.blur>=0.01,"un flou fort");
assert.ok(SHADOW_EDIT.cutFrom>=0.4&&SHADOW_EDIT.cutTo<=0.55&&SHADOW_EDIT.cutFrom<SHADOW_EDIT.cutTo,"coupées vers la moitié, en fondu");
assert.deepEqual(["Dwarf_tavern_keeper_holding_ale_ab54f84f.jpg","Dwarf_counting_coins_9f85b58d.jpg","Surprised_dwarf_tavern_keeper_st…_28bf94a3.jpg",
  "Dwarf_counting_coins_7a5d88a1_2K.jpg","Orcs_table.jpg"].map(variantKey),
  ["holding-ale","counting-coins","surprised-st","counting-coins","orcs-table"],"une version _2K porte le même nom que l'autre");

// Les variantes de la Table 1 (Idan, 2026-11-14 : « L'idée, c'est des variantes. Mais ces tables sont plus grandes que la
// table 1, il faut rétrécir et remplacer ») : à la largeur de la table d'origine, ses pieds au même endroit ; l'enveloppe
// de « Recruter » les couvre toutes.
// Les variantes de la Table 2 aussi (Idan : « Une table 2 alternative avec un truc bizarre » : seul ce qui touche la place
// de la table d'origine est gardé).
for(const table of ["table1","table2"]){
  const t=data.TAVERN_LAYER_BOXES[table],tables=api.tavernVariants(table);
  assert.deepEqual(tables[0],{key:table,src:`assets/taverne/${table}.webp`,box:t},"l'original d'abord, à son cadre");
  for(const v of tables.slice(1)){
    assert.ok(Math.abs(v.box[0]-t[0])<0.5&&Math.abs(v.box[2]-t[2])<0.5,v.key+" : la largeur de la table d'origine");
    assert.ok(Math.abs(v.box[1]+v.box[3]-(t[1]+t[3]))<0.5,v.key+" : les pieds au même endroit");
    assert.ok(v.box[3]<t[3]*2,v.key+" : rien d'autre que la table");
    assert.ok(fs.existsSync(path.join(root,"prototype-web",v.src)),v.key);
  }
  assert.equal(api.pickTavernVariant(table,()=>0).key,table);
}
assert.deepEqual(api.TAVERN_LAYERS.filter(L=>L.variants).map(L=>L.key),["table2","table1","tavernier"]);
assert.equal(api.TAVERN_ZONES.find(z=>z.key==="recruits").hulls.length,2,"une enveloppe par table, variantes comprises");

// Le détourage (scripts/build-tavern.js, keyPixels) : quelle que soit la couleur du fond, l'intérieur des personnages ne
// bouge pas (une cape verte sur fond vert, une fiole rose sur fond magenta), le fond devient transparent.
const keyed=(screen,inside)=>{
  const w=40,h=20,d=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const c=x>=10&&x<30&&y>=5&&y<15?inside:screen,i=(y*w+x)*4; d.set([...c,255],i); }
  keyPixels(d,w,h,KEY);
  const at=(x,y)=>[...d.slice((y*w+x)*4,(y*w+x)*4+4)];
  return {centre:at(20,10),fond:at(2,2)};
};
for(const [screen,inside,label] of [[[26,241,14],[60,90,40],"une cape verte sur fond vert"],[[252,7,251],[200,40,90],"une fiole rose sur fond magenta"],
  [[26,241,14],[120,90,60],"du bois brun"]]){
  const r=keyed(screen,inside);
  assert.deepEqual(r.centre,[...inside,255],label+" : intact");
  assert.equal(r.fond[3],0,label+" : le fond transparent");
}

// Le menu du lieu (Idan, 2026-11-14 : « Tavernier - missions - recrutement - cave - menu ») : les cinq zones, une fois chacune.
assert.deepEqual(api.TAVERN_MENU,["talk","missions","recruits","cellar","canteen"]);
assert.deepEqual([...api.TAVERN_MENU].sort(),api.TAVERN_ZONES.map(z=>z.key).sort());
console.log("Taverne en calques : décor, calques détourés, zones au pixel près, glow, menu du lieu — OK");
