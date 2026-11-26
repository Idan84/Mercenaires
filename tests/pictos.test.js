"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {pictoSlug,pictoPath,renderPicto,pictoDescription}=require("../prototype-web/picto-ui.js");

const ROOT=path.resolve(__dirname,"..");
const names=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8")).rows.map(r=>r.nom);

// Slug : accents, apostrophes et tirets ramenés à de simples tirets.
assert.equal(pictoSlug("Sang d’elfe"),"sang-d-elfe");
assert.equal(pictoSlug("Homme-bête"),"homme-bete");
assert.equal(pictoSlug("Sang féerique"),"sang-feerique");
assert.equal(pictoPath("people","Orc"),"assets/pictos/peuple-orc.webp");
assert.equal(pictoPath("ascendance",null),null,"pas d'ascendance : pas de picto");
assert.equal(renderPicto("ascendance",""),"");
assert.match(renderPicto("people","Nain",{size:"md"}),/class="picto picto-md" src="assets\/pictos\/peuple-nain\.webp"/);
// Au survol (Idan, 2026-10-25) : nom et phrase d'explication, dans une bulle du jeu (plus de title du navigateur).
assert.match(renderPicto("culture","Cités libres"),/data-picto-kind="culture" data-picto-name="Cités libres"/);
assert.doesNotMatch(renderPicto("culture","Cités libres"),/title=/);
// Une ascendance : la goutte en trois calques (halo animé, goutte rubis, emblème) ; « Aucune » : la goutte sombre ; sans
// taille, la page dimensionne ; sans bulle, pas de data-picto-name (Idan, 2026-11-15).
const goutte=renderPicto("ascendance","Sang de dragon",{size:"md"});
assert.match(goutte,/^<span class="picto picto-md picto-goutte" data-picto-kind="ascendance" data-picto-name="Sang de dragon" data-goutte="sang-de-dragon">/);
assert.deepEqual([...goutte.matchAll(/<img class="([^"]+)" src="([^"]+)"/g)].map(m=>m[1]+" "+m[2]),[
  "goutte-halo assets/pictos/goutte-halo.webp","goutte-rubis assets/pictos/goutte-rubis.webp","goutte-embleme assets/pictos/ascendance-sang-de-dragon.webp"]);
assert.match(renderPicto("ascendance","",{none:true,size:null}),/^<img class="picto picto-goutte-sombre" src="assets\/pictos\/goutte-sombre\.webp"/);
assert.doesNotMatch(renderPicto("people","Nain",{size:null,tip:false}),/data-picto-name|picto-sm/);
const css=fs.readFileSync(path.join(ROOT,"prototype-web","pictos.css"),"utf8");
// Le recalage optique (Idan, 2026-11-26) : les pentagones des cinq cultures humaines remontés et réduits (« ils sont
// tronqués » et « paraissent trop gros »), les Cités libres étirés à la hauteur des autres, les triangles des nains
// descendus et réduits ; jamais plus grands que leur boîte. Les elfes, les autres cultures et les peuples ne bougent pas.
{
  const {PICTO_OPTIQUE}=require("../prototype-web/picto-ui.js");
  const humains=["Cités libres","Empire de la nuit blanche","Royaumes du Soleil Levant","Terres des Deux Fleuves","Tribus de la jungle"];
  const nains=["Nains des montagnes","Nains du chaos","Nains esclaves"];
  for(const culture of [...humains,...nains]){
    const o=PICTO_OPTIQUE.culture[pictoSlug(culture)];
    assert.ok(o&&o.s<1&&o.s*(o.sy??1)<=1,culture);
    assert.ok(humains.includes(culture)?o.dy<0:o.dy>0,culture+" : sens du décalage");
    assert.match(renderPicto("culture",culture,{tip:false}),
      new RegExp(` data-picto-optique style="--picto-s:${o.s};--picto-sy:${o.sy??1};--picto-dy:${o.dy}%" `),culture);
  }
  assert.ok(PICTO_OPTIQUE.culture["cites-libres"].sy>1,"les Cités libres, étirés en hauteur");
  assert.equal(Object.keys(PICTO_OPTIQUE.culture).length,humains.length+nains.length);
  for(const [kind,name] of [["culture","Elfes noirs"],["culture","Orcs noirs"],["people","Humain"],["people","Nain"]])
    assert.doesNotMatch(renderPicto(kind,name),/data-picto-optique|style=/,name);
  assert.match(css,/\.picto\[data-picto-optique\]\{scale:var\(--picto-s\) calc\(var\(--picto-s\) \* var\(--picto-sy\)\);translate:0 var\(--picto-dy\)\}/);
  assert.doesNotMatch(css,/data-picto-remonte/);
}
assert.match(css,/\.picto-goutte>\.goutte-embleme\{animation:goutte-apparait 1s/,"l'emblème arrive en une seconde");
assert.match(css,/\.picto-goutte\.is-still>\.goutte-embleme\{animation:none\}/,"pas de fondu quand le jeu redessine");
// En ligne, chaque image porte le numéro de la mise en ligne, lu sur le script (« picto-ui.js?v=<commit> ») : sinon le
// cache de Hostinger (7 jours) sert l'ancien picto remplacé sous le même nom (les emblèmes des gouttes, 2026-11-15).
{
  const vm=require("node:vm");
  const sandbox={module:{exports:{}},URL,document:{currentScript:{src:"https://exemple.test/picto-ui.js?v=abc1234"},addEventListener(){}}};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,"prototype-web","picto-ui.js"),"utf8"),sandbox);
  const enLigne=sandbox.module.exports.renderPicto;
  const srcs=html=>[...html.matchAll(/ src="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(srcs(enLigne("ascendance","Sang de dragon")),["assets/pictos/goutte-halo.webp?v=abc1234",
    "assets/pictos/goutte-rubis.webp?v=abc1234","assets/pictos/ascendance-sang-de-dragon.webp?v=abc1234"]);
  assert.deepEqual(srcs(enLigne("ascendance","",{none:true})),["assets/pictos/goutte-sombre.webp?v=abc1234"]);
  assert.deepEqual(srcs(enLigne("people","Nain")),["assets/pictos/peuple-nain.webp?v=abc1234"]);
  assert.equal(sandbox.module.exports.pictoPath("people","Nain"),"assets/pictos/peuple-nain.webp","le chemin du fichier reste nu");
}
for(const page of ["index.html","creation-capitaine.html"]){
  const html=fs.readFileSync(path.join(ROOT,"prototype-web",page),"utf8");
  assert.ok(html.includes('href="pictos.css"')&&html.includes('src="picto-ui.js"'),page+" : le même composant de pictos");
}
global.game={referenceData:{captainCreationCopy:JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference","captain-creation-copy.json"),"utf8"))}};
assert.match(pictoDescription("people","Humain"),/^Polyvalent et adaptable/);
assert.ok(pictoDescription("ascendance","Sang divin"));
assert.equal(pictoDescription("people","Inconnu"),"");
for(const [kind,file,section] of [["people","peoples.json","peoples"],["culture","cultures.json","cultures"],["ascendance","ancestries.json","ancestries"]]){
  for(const name of names(file)) assert.ok(pictoDescription(kind,name),`phrase manquante : ${section} / ${name}`);
}
delete global.game;

// Chaque peuple, chaque culture (Idan, 2026-10-22), chaque ascendance et chaque école de magie (Idan, 2026-11-15)
// du référentiel a son picto, et aucun picto n'est orphelin.
assert.equal(pictoPath("culture","Nains esclaves"),"assets/pictos/culture-nains-esclaves.webp");
assert.equal(pictoPath("school","Télékinésie"),"assets/pictos/ecole-telekinesie.webp");
const expected=[
  ...names("peoples.json").map(n=>pictoPath("people",n)),
  ...names("cultures.json").map(n=>pictoPath("culture",n)),
  ...names("ancestries.json").map(n=>pictoPath("ascendance",n)),
  ...[...new Set(JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference","spells.json"),"utf8")).rows.map(r=>r.ecole).filter(Boolean))].map(n=>pictoPath("school",n))
];
// Les trois calques des gouttes d'ascendance (Idan, 2026-11-15) : le halo animé, la goutte rubis, la goutte sombre.
const {PICTO_GOUTTE}=require("../prototype-web/picto-ui.js");
expected.push(...Object.values(PICTO_GOUTTE));
const dir=path.join(ROOT,"prototype-web","assets","pictos");
for(const p of expected) assert.ok(fs.existsSync(path.join(ROOT,"prototype-web",p)),"picto manquant : "+p);
const files=fs.readdirSync(dir).map(f=>"assets/pictos/"+f).sort();
assert.deepEqual(files,[...expected].sort(),"pictos en trop ou mal nommés");

console.log(JSON.stringify({ok:true,pictos:files.length},null,2));
