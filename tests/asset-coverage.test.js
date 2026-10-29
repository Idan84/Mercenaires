"use strict";

// Design Lab, onglet Images (Idan, 2026-10-29) : les images attendues par le jeu, hors avatars, et ce qui manque.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Coverage=require("../game-core/asset-coverage.js");

const ROOT=path.resolve(__dirname,"..");
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const reference={
  spells:read("spells.json"),enemyArchetypes:read("enemy-archetypes.json"),summonArchetypes:read("summon-archetypes.json"),
  weapons:read("weapons.json"),baseArmors:read("base-armors.json"),helmets:read("helmets.json"),boots:read("boots.json"),
  belts:read("belts.json"),amulets:read("amulets.json"),capes:read("capes.json"),gloves:read("gloves.json"),
  pants:read("pants.json"),rings:read("rings.json"),peoples:read("peoples.json"),cultures:read("cultures.json"),
  ancestries:read("ancestries.json"),potions:read("potions.json")
};
// Liste des images d'équipement présentes, telle que le jeu la charge.
const artSource=fs.readFileSync(path.join(ROOT,"prototype-web","equipment-art.js"),"utf8");
const equipmentArt=new Set([...artSource.matchAll(/^\s*"([^"]+)",?$/gm)].map(m=>m[1]));

const sections=Coverage.listExpected(reference,{equipmentArt});
const byKey=Object.fromEntries(sections.map(s=>[s.key,s]));
assert.deepEqual(sections.map(s=>s.key),["spells","frames","enemies","summons","equipment","potions","pictos","scenes"]);
// Potions et fioles (Idan, 2026-10-29) : icônes à venir.
assert.deepEqual(byKey.potions.groups[0].items.map(i=>i.file),["healing_potion.jpg","mana_potion.jpg","poison_vial.jpg"]);
assert.ok(byKey.potions.groups[0].items.every(i=>i.present===false&&i.planned===false));

// Sorts : une icône par sort (champ icone de spells.json), un cadre par école (champ cadre).
const spells=reference.spells.rows;
const icons=byKey.spells.groups.flatMap(g=>g.items);
assert.equal(icons.length,spells.length);
assert.equal(icons.filter(i=>i.present).length,spells.filter(s=>s.icone).length);
assert.ok(icons.some(i=>i.file==="quick_heal.jpg"&&i.present),"Soin rapide a son parchemin");
const schoolFrames=byKey.frames.groups[0].items;
assert.equal(schoolFrames.length,new Set(spells.map(s=>s.ecole)).size);
assert.equal(schoolFrames.find(i=>i.name==="Vie").present,true);
assert.equal(schoolFrames.find(i=>i.name==="Feu").present,false);
assert.ok(byKey.frames.groups[1].items.every(i=>i.present),"cadres de tier T1 à T4 présents");

// Ennemis et invocations : pas encore d'image dans le jeu, tout est « à produire ».
assert.equal(byKey.enemies.groups.flatMap(g=>g.items).length,reference.enemyArchetypes.rows.length);
assert.ok(byKey.enemies.groups.flatMap(g=>g.items).every(i=>i.present===false&&i.planned===false));
assert.deepEqual(byKey.summons.groups.flatMap(g=>g.items).map(i=>i.file).sort(),reference.summonArchetypes.rows.map(r=>r.code+".jpg").sort());

// Équipement : chaque objet de référence, T1 à T4, d'après equipment-art.js.
const gear=byKey.equipment.groups.flatMap(g=>g.items);
assert.equal(gear.length,4*Coverage.EQUIPMENT.reduce((n,[table])=>n+reference[table].rows.length,0));
assert.ok(gear.some(i=>i.key==="armes/epee-longue-1"&&i.present));
assert.equal(Coverage.listExpected(reference).find(s=>s.key==="equipment").groups[0].items[0].present,false,"sans liste : manquant");

// Pictos et décors : vérifiés par le Design Lab (requête HEAD) ; le module donne l'adresse.
const checks=Coverage.pendingChecks(sections);
assert.ok(checks.some(i=>i.url==="assets/pictos/ascendance-sang-d-elfe.webp"));
assert.ok(checks.some(i=>i.url==="/media/background/tavern.jpg"));
assert.ok(checks.every(i=>i.present===null));
for(const item of checks) item.present=!item.url.includes("dortoir-10");
const summary=Object.fromEntries(Coverage.summarize(sections).map(s=>[s.key,s]));
assert.equal(summary.scenes.missing,4,"un dortoir absent + trois écrans sans image prévue");
assert.equal(summary.scenes.unplanned,3);
assert.equal(summary.pictos.missing,0);
assert.equal(Coverage.slug("Sang d’elfe"),"sang-d-elfe");

console.log("Images attendues hors avatars (sorts, cadres, ennemis, invocations, équipement, pictos, décors) — OK");
