"use strict";

// La fiche complète en plein écran (prototype-web/full-sheet-ui.js ; Idan, 2026-11-18 : « deux parties fixes. Une barre
// en haut. Une colonne à gauche. Un onglet principal qui s'ouvre toujours en premier »). L'onglet Cultures du Design Lab
// qui la réglait par culture est retiré (Idan, 2026-11-27 : « vire la partie culture du design lab. Elle sert à rien »).
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const ROOT=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(ROOT,file),"utf8");
const kits=JSON.parse(read("data/reference/culture-kits.json")).rows;
const plain=x=>JSON.parse(JSON.stringify(x));

// Le jeu : la fiche au survol (ses pièces de cadre) puis la fiche complète, dans un même contexte.
const context={game:{referenceData:{cultureKits:{rows:kits}}},esc:s=>String(s??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))};
vm.createContext(context);
for(const file of ["prototype-web/hover-card-ui.js","prototype-web/full-sheet-ui.js"]) vm.runInContext(read(file),context);
const F=vm.runInContext("({fullSheetLayout,fullSheetSettings,renderFullSheet,FULL_SHEET_DEFAULTS,FULL_SHEET_TABS})",context);
const noirs=kits.find(k=>k.cle==="elfes-noirs");

// 1. Les places : en pixels d'un écran de 1080 px de haut, à l'échelle de la hauteur de l'écran ; les trois zones se
// touchent (barre du haut au-dessus de la bande, colonne de gauche contre la séparation).
const L=F.fullSheetLayout(noirs,1920,1080);
assert.deepEqual([L.s,L.bandY,L.sepX,L.e,L.eV,L.bandEp],[1,150,440,20,21,20]);
assert.deepEqual(plain(L.B),{x0:0,y0:0,x1:1920,y1:1080});
assert.equal(L.zones.haut.y1,L.zones.principale.y0);
assert.equal(L.zones.gauche.x1,L.zones.principale.x0);
assert.equal(L.zones.gauche.y1,L.zones.principale.y1);
const L2=F.fullSheetLayout(noirs,2560,1440);
assert.deepEqual([L2.s,L2.bandY,Math.round(L2.sepX),L2.e],[4/3,200,587,27]);
// Un écran 21:9 : tout l'écran, ou plafonnée à 16:9 et centrée.
assert.equal(F.fullSheetLayout(noirs,3440,1440).B.x0,0);
const plafonnee=F.fullSheetLayout({...noirs,plein:{...noirs.plein,largeur:"16:9"}},3440,1440);
assert.deepEqual([plafonnee.SW,plafonnee.B.x0,plafonnee.B.x1],[2560,440,3000]);
// Des réglages incomplets prennent ceux par défaut ; sans kit, pas de cadre mais les mêmes zones. Les kits ont tous leurs
// réglages, ceux de la fiche au survol pour le cadre (Idan, 2026-11-18 : « les mêmes réglages que la fiche au survol »).
assert.deepEqual(plain(F.fullSheetSettings({plein:{haut:200}})),{...plain(F.FULL_SHEET_DEFAULTS),haut:200});
assert.equal(F.fullSheetLayout(null,1920,1080).bandY,150);
for(const kit of kits){
  assert.deepEqual(plain(F.fullSheetSettings(kit)),kit.plein,kit.cle+" : réglages complets dans les données");
  assert.deepEqual(kit.plein.ornementsCoin,kit.fiche.ornementsCoin,kit.cle+" : ornements de coin de la fiche au survol");
  for(const o of ["pose","suspendu","allonge"]) assert.equal(kit.plein[o].place,"aucune",kit.cle+" : "+o+" à placer par Idan");
}
// Les côtés déplacent le cadre ; la bande et la séparation se règlent à part.
const decale=F.fullSheetLayout({...noirs,plein:{...noirs.plein,cotes:{haut:10,bas:-10,gauche:20,droite:-20},bande:{...noirs.plein.bande,ep:30,dy:5}}},1920,1080);
assert.deepEqual([decale.B.x0,decale.B.y0,decale.B.x1,decale.B.y1,decale.bandEp,decale.bandY],[20,10,1900,1070,30,165]);

// 2. La fiche : les trois zones, le cadre du kit (bordure, bande, séparation, 4 jonctions, 4 coins, 4 ornements de coin),
// Récap ouvert. La barre du haut (Idan, 2026-11-18) : les deux flèches, l'avatar carré, le nom, le titre à sa droite, la
// croix à droite ; à la marge réglée du bord du cadre. La colonne : le portrait en pied d'abord, sur toute la largeur.
const c={name:"Lytha Voile-noir",culture:"Elfes noirs",people:"Elfe"};
const page=F.renderFullSheet(c,{W:1920,H:1080});
for(const cls of ["fs-haut","fs-gauche","fs-principale"]) assert.ok(page.includes(`class="fs-zone ${cls}"`),cls);
assert.ok(page.includes('class="fs-cadre"'));
assert.equal((page.match(/jonction\.webp/g)||[]).length,4,"quatre jonctions en T");
assert.equal((page.match(/\/coin\.webp/g)||[]).length,4,"quatre coins");
assert.equal((page.match(/coin-orne-/g)||[]).length,4,"quatre ornements de coin");
assert.match(page,/<span class="fs-onglet is-on">Récap<\/span>/);
assert.deepEqual(plain(F.FULL_SHEET_TABS).slice(0,1),["Récap"],"Récap s'ouvre toujours en premier");
const barre=page.slice(page.indexOf('class="fs-zone fs-haut"'),page.indexOf('class="fs-zone fs-gauche"'));
assert.match(barre,/fs-fleche[\s\S]*fs-fleche[\s\S]*fs-avatar[\s\S]*fs-nom">Lytha Voile-noir<[\s\S]*fs-fermer/,"flèches, avatar, nom, croix");
assert.match(barre,/padding:10px 50.5px 10px 80.5px/,"marge à gauche 70 px et à droite 40 px depuis le bord intérieur du cadre");
assert.match(barre,/--fs-avatar-marge:10px/);
// Le cuir de la culture dans la barre du haut (Idan, 2026-11-19 : « Y'a pas la texture dans la barre du haut ») : les
// réglages du cuir restent dans l'attribut style de la fiche (des guillemets doubles dans url() le coupaient).
const styleFiche=(page.match(/<section class="full-sheet[^>]*style="([^"]*)"/)||[])[1]||"";
assert.ok(styleFiche.includes("--fs-texture:url('assets/fiche/kits/elfes-noirs/texture.webp')"),"texture du kit");
assert.match(styleFiche,/--fs-voile:12,2,16;--fs-sombre:0\.3;--fs-grain:256px/,"voile, assombri et grain du cuir");
assert.match(page,/<section class="full-sheet[^>]*aria-label="Fiche de Lytha Voile-noir">/,"la balise de la fiche reste entière");
assert.match(page.slice(page.indexOf('class="fs-zone fs-gauche"')),/^[^>]*>\s*<div class="fs-pied">/,"le portrait en pied en haut de la colonne");
// Les ornements posé, suspendu et allongé, à leur place.
assert.ok(!page.includes("couronne.webp"),"pas d'ornement posé par défaut");
context.game.referenceData.cultureKits.rows=kits.map(k=>k.cle==="elfes-noirs"?{...k,plein:{...k.plein,pose:{...k.plein.pose,place:"bas-centre"},
  suspendu:{...k.plein.suspendu,place:"sous-bande-colonne"},allonge:{...k.plein.allonge,place:"separation"}}}:k);
const orne2=F.renderFullSheet(c,{W:1920,H:1080});
for(const f of ["couronne.webp","chaine.webp","chaine-torsadee.webp"]) assert.ok(orne2.includes(f),f);
context.game.referenceData.cultureKits.rows=kits;
const sansKit=F.renderFullSheet({...c,culture:"Gnomes des forêts"},{W:1920,H:1080});
assert.ok(sansKit.includes("is-sans-kit")&&!sansKit.includes("fs-cadre"),"sans kit : pas de cadre");

// 3. Le jeu charge la fiche complète après la fiche au survol ; l'aperçu du Design Lab n'existe plus.
const index=read("prototype-web/index.html");
assert.match(index,/<script src="hover-card-ui\.js"><\/script>\s*<script src="full-sheet-ui\.js"><\/script>/);
assert.doesNotMatch(index,/apercu-ui\.js/);
assert.doesNotMatch(read("prototype-web/design/index.html"),/data-mode="cultures"|cultures-lab\.js/);
assert.ok(!fs.existsSync(path.join(ROOT,"prototype-web/design/api/reglages.php")),"plus d'enregistrement des réglages");
assert.doesNotMatch(read("prototype-web/reference-data.js"),/media\/reglages/,"le jeu ne lit plus les réglages du Design Lab");

console.log("Fiche complète en plein écran — OK");
