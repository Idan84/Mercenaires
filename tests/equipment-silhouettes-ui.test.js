"use strict";

// Revue UI sans assets binaires : le ZIP contenant les 20 WebP est livré séparément à JC3.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const js=fs.readFileSync(path.join(root,"prototype-web/ui.js"),"utf8");
const css=fs.readFileSync(path.join(root,"prototype-web/styles.css"),"utf8");

const a=js.indexOf("function equipmentSilhouetteSrc(c) {");
const b=js.indexOf("\nfunction renderWeaponPreferences(c)",a);
assert.ok(a>0&&b>a,"Fonction de silhouette et rendu de l'équipement présents");
const source=js.slice(a,b);
const ctx=new Function("game","esc","fmt",source+"\nreturn {equipmentSilhouetteSrc,renderEquipment};")(
 {referenceData:{equipmentSlots:{rows:[]}}},
 x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"),
 x=>String(x??0)
);
const names=["Humain","Elfe","Nain","Orc","Gobelin","Halfling","Gnome","Ogre","Reptilien","Homme-bête"];
const slugs=["humain","elfe","nain","orc","gobelin","halfling","gnome","ogre","reptilien","homme-bete"];
for(let i=0;i<names.length;i++){
 for(const [sex,gender] of [["homme","homme"],["femme","femme"],["Masculin","homme"],["Féminin","femme"],["female","femme"],["male","homme"]]){
   assert.equal(ctx.equipmentSilhouetteSrc({people:names[i],sex}),`assets/silhouettes/${slugs[i]}-${gender}.webp`);
 }
}
for(const c of [{people:"Elfe"},{people:"Elfe",sex:""},{people:"Troll",sex:"femme"},null]){
 assert.equal(ctx.equipmentSilhouetteSrc(c),null,"aucun genre ni peuple inventé");
}
const empty={name:"Test",people:"Orc",sex:"femme",equipment:{slots:{},profile:{}},items:[]};
const html=ctx.renderEquipment(empty);
assert.match(html,/src="assets\/silhouettes\/orc-femme.webp"/);
assert.match(html,/equipment-mannequin-image/);
assert.match(html,/onerror="this.remove\(\)"/);
assert.match(html,/equipment-mannequin--loaded/);
assert.match(html,/class="mannequin-head"/,"repli par mannequin générique conservé");
const noSex=ctx.renderEquipment({...empty,sex:""});
assert.doesNotMatch(noSex,/equipment-mannequin-image/);
assert.match(noSex,/class="mannequin-head"/);
assert.match(css,/mix-blend-mode:\s*multiply/);
assert.match(css,/equipment-mannequin--loaded > span/);
console.log("Équipement : 20 correspondances, blend mode et repli — OK");
