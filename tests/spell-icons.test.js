"use strict";

// Icônes des sorts (Idan, 2026-10-25) : chaque sort a son parchemin et le cadre de son école, superposés dans la barre
// de sorts du combat et dans le grimoire de la fiche. Masters dans assets-src/Sorts/, versions du jeu générées par
// scripts/build-spells.sh.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const ROOT=path.resolve(__dirname,"..");
const spells=JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference","spells.json"),"utf8")).rows;
const exists=file=>fs.existsSync(path.join(ROOT,file));

for(const s of spells){
  assert.ok(s.icone&&s.cadre,s.nom+" : icône et cadre");
  assert.ok(exists("prototype-web/assets/"+s.icone),s.nom+" : "+s.icone);
  assert.ok(exists("prototype-web/assets/"+s.cadre),s.nom+" : "+s.cadre);
  assert.ok(exists("assets-src/Sorts/"+s.ecole+"/"+s.code+".jpg"),s.nom+" : master du parchemin");
  assert.ok(exists("assets-src/Sorts/"+s.ecole+"/cadre.jpg"),s.ecole+" : master du cadre");
}
assert.equal(new Set(spells.filter(s=>s.ecole==="Vie").map(s=>s.cadre)).size,1,"un seul cadre pour toute l'école de la Vie");

// Le cadre du jeu est un WebP avec transparence (centre détouré).
const frame=fs.readFileSync(path.join(ROOT,"prototype-web","assets","spells","vie","cadre.webp"));
assert.equal(frame.toString("ascii",0,4),"RIFF");
assert.equal(frame.toString("ascii",8,12),"WEBP");
assert.ok(frame.includes(Buffer.from("ALPH"))||frame.includes(Buffer.from("VP8L")),"le cadre garde sa transparence");

// Affichage : la barre de sorts et le grimoire passent par spellIconHtml.
const ui=fs.readFileSync(path.join(ROOT,"prototype-web","ui.js"),"utf8");
const mission=fs.readFileSync(path.join(ROOT,"prototype-web","mission.js"),"utf8");
assert.match(ui,/function spellIconHtml\(spell\)/);
assert.match(ui,/<div class="sheet-skill magic-spell">\$\{spellIconHtml\(row\)\}/);
assert.match(mission,/typeof spellIconHtml==="function"\?spellIconHtml\(s\):""/);
const spellIconHtml=new Function("esc",ui.match(/function spellIconHtml\(spell\) \{[\s\S]*?\n\}/)[0]+"\nreturn spellIconHtml;")(v=>String(v??""));
assert.equal(spellIconHtml(spells[0]),'<span class="spell-icon" aria-hidden="true"><img src="assets/spells/vie/quick_heal.webp" alt="" loading="lazy">'
  +'<img src="assets/spells/vie/cadre.webp" alt="" loading="lazy"></span>');
assert.equal(spellIconHtml(null),"");

console.log("Icônes des sorts : parchemins, cadres et affichage — OK");
