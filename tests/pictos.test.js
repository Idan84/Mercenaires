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
assert.match(css,/\.picto-goutte>\.goutte-embleme\{animation:goutte-apparait 1s/,"l'emblème arrive en une seconde");
assert.match(css,/\.picto-goutte\.is-still>\.goutte-embleme\{animation:none\}/,"pas de fondu quand le jeu redessine");
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
