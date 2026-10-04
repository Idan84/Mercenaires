"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {pictoSlug,pictoPath,renderPicto}=require("../prototype-web/picto-ui.js");

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

// Chaque peuple et chaque ascendance du référentiel a son picto, et aucun picto n'est orphelin.
const expected=[
  ...names("peoples.json").map(n=>pictoPath("people",n)),
  ...names("ancestries.json").map(n=>pictoPath("ascendance",n))
];
const dir=path.join(ROOT,"prototype-web","assets","pictos");
for(const p of expected) assert.ok(fs.existsSync(path.join(ROOT,"prototype-web",p)),"picto manquant : "+p);
const files=fs.readdirSync(dir).map(f=>"assets/pictos/"+f).sort();
assert.deepEqual(files,[...expected].sort(),"pictos en trop ou mal nommés");

console.log(JSON.stringify({ok:true,pictos:files.length},null,2));
