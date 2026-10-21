"use strict";

// Silhouettes d'équipement (Idan, 2026-10-21) : une image par peuple et par sexe, déposée sur Hostinger
// (media/Avatars_Equipements, api/silhouettes.php), affichée en multiply à la place du mannequin.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const js=fs.readFileSync(path.join(root,"prototype-web/ui.js"),"utf8");
const css=fs.readFileSync(path.join(root,"prototype-web/styles.css"),"utf8");
const loader=fs.readFileSync(path.join(root,"prototype-web/reference-data.js"),"utf8");
const {buildSilhouetteCatalog}=require("../game-core/avatar-catalog.js");
const read=f=>JSON.parse(fs.readFileSync(path.join(root,"data/reference",f),"utf8"));
const reference={peoples:read("peoples.json"),cultures:read("cultures.json"),socialOrigins:read("social-origins.json"),alignments:read("alignments.json"),ancestries:read("ancestries.json"),skills:read("skills.json"),weapons:read("weapons.json")};

// Catalogue : peuple et sexe lus dans le nom, les dossiers ou les mots-clés.
const names=["Humain","Elfe","Nain","Orc","Gobelin","Halfling","Gnome","Ogre","Reptilien","Homme-bête"];
const files=names.flatMap(p=>[{path:p.replace("ê","e")+"_Femme.jpg"},{path:p.replace("ê","e")+"_H.jpg"}]);
const built=buildSilhouetteCatalog(files,reference,{baseUrl:"/media/Avatars_Equipements/"});
assert.deepEqual(built.warnings,[]);
assert.equal(built.rows.length,20,"10 peuples × 2 sexes");
for(const p of names) for(const sex of ["femme","homme"]) assert.ok(built.rows.some(r=>r.people===p&&r.sex===sex),p+" "+sex);
assert.equal(built.rows.find(r=>r.people==="Homme-bête"&&r.sex==="homme").url,"/media/Avatars_Equipements/Homme-bete_H.jpg");
const odd=buildSilhouetteCatalog([{path:"Homme_Bete_Femme.jpg"},{path:"Nains/Silhouette M.png"},{path:"Gobelin.jpg"},{path:"Orc.jpg",keywords:["Femme"]},{path:"Orc_F.jpg"}],reference);
assert.deepEqual(odd.rows.map(r=>r.people+" "+r.sex),["Homme-bête femme","Nain homme","Orc femme"]);
assert.equal(odd.rows.find(r=>r.people==="Nain").url,"/media/Avatars_Equipements/Nains/Silhouette%20M.png");
assert.equal(odd.warnings.length,2,"sexe introuvable et doublon signalés");

// Fiche : la silhouette du peuple et du sexe du mercenaire, sinon le mannequin.
assert.match(loader,/api\/silhouettes\.php/);
const a=js.indexOf("function equipmentSilhouetteSrc(c) {");
const b=js.indexOf("\nfunction renderWeaponPreferences(c)",a);
assert.ok(a>0&&b>a,"Fonction de silhouette et rendu de l'équipement présents");
const source=js.slice(a,b);
const game={referenceData:{equipmentSlots:{rows:[]},equipmentSilhouettes:built}};
const ctx=new Function("game","esc","fmt",source+"\nreturn {equipmentSilhouetteSrc,renderEquipment};")(
 game,
 x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"),
 x=>String(x??0)
);
for(const [sex,gender] of [["homme","H"],["femme","Femme"],["Masculin","H"],["Féminin","Femme"],["female","Femme"],["male","H"]]){
  assert.equal(ctx.equipmentSilhouetteSrc({people:"Orc",sex}),`/media/Avatars_Equipements/Orc_${gender}.jpg`);
}
for(const c of [{people:"Elfe"},{people:"Elfe",sex:""},{people:"Troll",sex:"femme"},null]){
  assert.equal(ctx.equipmentSilhouetteSrc(c),null,"aucun genre ni peuple inventé");
}
const empty={name:"Test",people:"Orc",sex:"femme",equipment:{slots:{},profile:{}},items:[]};
const html=ctx.renderEquipment(empty);
assert.match(html,/src="\/media\/Avatars_Equipements\/Orc_Femme.jpg"/);
assert.match(html,/equipment-mannequin-image/);
assert.match(html,/onerror="this.remove\(\)"/);
assert.match(html,/equipment-mannequin--loaded/);
assert.match(html,/class="mannequin-head"/,"repli par mannequin générique conservé");
const noSex=ctx.renderEquipment({...empty,sex:""});
assert.doesNotMatch(noSex,/equipment-mannequin-image/);
assert.match(noSex,/class="mannequin-head"/);
game.referenceData.equipmentSilhouettes={rows:[]};
assert.doesNotMatch(ctx.renderEquipment(empty),/equipment-mannequin-image/,"sans index Hostinger : mannequin");
assert.match(css,/mix-blend-mode:\s*multiply/);
assert.match(css,/equipment-mannequin--loaded > span/);
console.log("Équipement : silhouettes Hostinger par peuple et sexe, multiply et repli — OK");
