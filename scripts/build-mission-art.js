#!/usr/bin/env node
"use strict";
// Les gravures des annonces de mission (Idan et Jean-Mi, 2026-11-14) : Idan dépose les images sur Hostinger
// (media/background/Taverne/Missions/, liste : api/background.php) ; on choisit lesquelles garder (« N'utilise pas celles
// que tu ne trouves pas bonnes ») et on les prépare pour le rendu « produit » sur le papier de l'annonce :
//   marges rognées, fond crème ramené au blanc (le blanc disparaît, l'encre semble imprimée), 1000 px de large, WebP
//   encodé par Chromium (ImageMagick ignore la qualité du WebP).
// Usage : node scripts/build-mission-art.js [--force]   (outils : curl, ImageMagick « convert », Playwright)
//   sans --force, les gravures déjà rangées ne sont pas refaites.
// Les images retenues sont listées ci-dessous, avec leur nom dans prototype-web/assets/missions/ ; les écartées aussi,
// avec la raison. Les camps les déclarent dans data/reference/one-shot-missions.json (camps[].illustrations).
const fs=require("fs");
const os=require("os");
const path=require("path");
const {execFileSync}=require("child_process");

const SITE="https://bloodandwages.idanwizen.com";
const OUT=path.join(__dirname,"..","prototype-web","assets","missions");
const WIDTH=1000;
const QUALITY=0.8;

// Une variante n'est gardée que si elle apporte une autre image (Idan, 2026-11-14 : « Y'en a beaucoup qui sont
// proches… Faut pas hésiter à les virer »).
const KEEP=[
  ["Orc_warrior_guarding_war_camp_a9cf545c.jpg","camp-orc-1"],
  ["Thief_at_bandit_hideout_6808b4ff.jpg","camp-voleurs-1"],
  ["Thief_in_bandit_hideout_fb6e104f.jpg","camp-voleurs-2"],
  ["Ogre_encampment_with_cauldron_an…_9a91bb9a.jpg","camp-ogre-1"],
  ["Vampire_silhouette_in_ruined_castle_ccb42c11.jpg","chateau-maudit-1"],
  ["Hooded_figure_holding_lantern_gr…_1a5d46be.jpg","cimetiere-profane-1"],
  ["Pack_of_wolves_howling_aaf26095.jpg","chasse-loups-1"],
  ["Wild_unicorn_rearing_in_forest_cddc5f4f.jpg","chasse-licorne-1"],
  ["Celestial_unicorn_on_snowy_mountain_da8c0e7e_2K.jpg","chasse-licorne-2"],
  ["Three-headed_hellhound_at_mine_0991b14a.jpg","chasse-cerbere-1"],
  ["Feral_mastiffs_snarling_near_manor_6302de4d.jpg","chasse-chiens-sauvages-1"],
  ["Giant_poisonous_butterflies_over…_d1bd2095.jpg","chasse-papillons-1"],
  ["Abbot_on_mountain_pilgrimage_c69b45e3.jpg","garde-abbe-1"],
  ["Boy_riding_pony_af274755.jpg","garde-fils-bourgmestre-1"],
  ["Disgraced_nobleman_glancing_back…_c8c70d61.jpg","garde-noble-1"],
  ["Dwarf_banker_with_ledger_and_46e0fb20.jpg","garde-banquier-nain-1"],
  ["Elven_ambassador_holding_sealed_…_d9bfb99e.jpg","garde-ambassadeur-elfe-1"],
  ["Opera_singer_leaning_from_coach_b470d288.jpg","garde-cantatrice-1"],
  ["Spice_merchant_and_caravan_38ca95bc.jpg","garde-marchand-epices-1"],
  ["Tax_collector_with_angry_peasants_c1b38448.jpg","garde-collecteur-impots-1"],
  ["Wealthy_widow_seated_in_carriage_eaedcf51.jpg","garde-veuve-1"],
  ["Woman_alchemist_carrying_glowing…_620df9ec.jpg","garde-alchimiste-1"]
];
// Écartées : les raisons servent pour la prochaine série.
const REJECTED={
  "Ogre_encampment_with_cauldron_an…_08bb96c7.jpg":"fond noir tout autour : un rectangle sombre sur l'annonce, l'encre ne se pose plus sur le papier",
  "Orc_warrior_standing_guard_536c622a.jpg":"trop proche de camp-orc-1 (un orc debout dans le camp de yourtes)",
  "Orc_warrior_standing_guard_894f7d18.jpg":"trop proche de camp-orc-1 (un orc debout dans le camp de yourtes)",
  "Thief_at_bandit_hideout_6f991c2c.jpg":"trop proche de camp-voleurs-2 (la tour en ruine, le voleur encapuchonné à l'arbalète)",
  "Thief_guarding_bandit_hideout_39ee5d23.jpg":"trop proche de camp-voleurs-2 (la tour en ruine, le voleur encapuchonné à l'arbalète)",
  "Ogre_encampment_with_giant_cauldron_d0008d80.jpg":"trop proche de camp-ogre-1 (l'ogre près du chaudron)",
  "Ogre_encampment_with_cauldron_an…_ef1e4da0.jpg":"trop proche de camp-ogre-1 (l'ogre près du chaudron)",
  "Ogre_encampment_with_cauldron_an…_b50c0c65.jpg":"trop proche de camp-ogre-1 (l'ogre près du chaudron)",
  "Ogre_in_encampment_with_weapons_0c709554.jpg":"trop proche de camp-ogre-1 (l'ogre près du chaudron)",
  "Vampire_at_castle_window_c4c62323.jpg":"trop proche de chateau-maudit-1 (le château sur son rocher, la lune)",
  "Vampire_in_ruined_castle_window_d9d4443a.jpg":"trop proche de chateau-maudit-1 (le château sur son rocher, la lune)",
  "Hooded_figure_in_ancient_graveyard_93e85a0f.jpg":"trop proche de cimetiere-profane-1 (le nécromancien à la lanterne entre les tombes)",
  "Cerberus_at_mine_entrance_30035809.jpg":"trop proche de chasse-cerbere-1 (le cerbère à la sortie de la mine)",
  "Cerberus_at_mine_mouth_ed39f50f.jpg":"trop proche de chasse-cerbere-1 (le cerbère à la sortie de la mine)",
  "Feral_mastiffs_snarling_near_manor_c85a0952.jpg":"trop proche de chasse-chiens-sauvages-1 (les molosses devant le château)",
  "Feral_mastiffs_snarling_ruined_m…_2cbc4bb3.jpg":"trop proche de chasse-chiens-sauvages-1 (les molosses devant le château)",
  "Wild_unicorn_rearing_in_forest_02373464.jpg":"trop proche de chasse-licorne-1 (la licorne cabrée dans la forêt)",
  "Wild_unicorn_rearing_in_forest_a8e1f79b.jpg":"un lavis gris plutôt qu'une gravure, et la même licorne cabrée",
  "Poisonous_butterflies_over_flowe…_da0dfe2d.jpg":"le même essaim que chasse-papillons-1, en pleine page plus sombre",
  "Abbot_on_mountain_pilgrimage_6ee1ce70.jpg":"un cadre dessiné tout autour : un rectangle sur l'annonce (et trop proche de garde-abbe-1)",
  "Abbot_walking_on_mountain_path_2102bcd0.jpg":"trop proche de garde-abbe-1 (l'abbé au bâton sur le sentier)",
  "Disgraced_nobleman_glancing_over…_5eda4243.jpg":"trop proche de garde-noble-1 (le noble en guenilles, l'écu brisé), et plus petit",
  "Disgraced_nobleman_glancing_over…_d5a20b10.jpg":"trop proche de garde-noble-1 (le noble en guenilles, l'écu brisé), et plus petit",
  "Dwarf_banker_with_ledger_and_7ccfa8c9.jpg":"trop proche de garde-banquier-nain-1 (le registre, le coffre)",
  "Dwarf_banker_with_ledger_and_fa0e8a4a.jpg":"trop proche de garde-banquier-nain-1 (le registre, le coffre)",
  "Elven_ambassador_holding_sealed_…_202a2f29.jpg":"trop proche de garde-ambassadeur-elfe-1 (l'elfe en robe, la lettre)",
  "Elven_ambassador_holding_sealed_…_935c1fdf.jpg":"trop proche de garde-ambassadeur-elfe-1 (l'elfe en robe, la lettre)",
  "Spice_merchant_and_caravan_91b6a4b5.jpg":"trop proche de garde-marchand-epices-1 (le marchand devant ses mules)",
  "Spice_merchant_traveling_with_ca…_6489bd59.jpg":"trop proche de garde-marchand-epices-1 (le marchand devant ses mules)",
  "Wealthy_widow_in_carriage_ad463919.jpg":"un cadre dessiné tout autour : un rectangle sur l'annonce (et trop proche de garde-veuve-1)",
  "Wealthy_widow_seated_in_carriage_356fe131.jpg":"trop proche de garde-veuve-1 (la veuve voilée dans sa voiture), en pleine largeur",
  "Woman_alchemist_carrying_glowing…_023e0cbe.jpg":"trop proche de garde-alchimiste-1 (l'alchimiste et ses fioles)",
  "Woman_alchemist_carrying_glowing…_11f60eb1.jpg":"trop proche de garde-alchimiste-1 (l'alchimiste et ses fioles)",
  "Sealing_wax_on_wooden_board_060d3342.jpg":"pas une gravure : les cachets de cire, détourés à part (scripts/key-green-sheet.js → assets/taverne/cire-*.webp)",
  "Three_sealing_wax_drops_on_041fb773.jpg":"cachets de cire : des bouts de bois et de papier collés derrière",
  "Three_sealing_wax_drops_on_cdafefe0.jpg":"cachets de cire : les mêmes que la planche gardée",
  "Three_sealing_wax_drops_on_d7dfc70b.jpg":"cachets de cire : des bouts de bois et de papier collés derrière",
  "Arrow_shaped_wrought_iron_bracket_cae7a463_2K.jpg":"pas une gravure : la flèche du panneau, détourée à part (scripts/key-green-sheet.js → assets/taverne/fleche-fer.webp)",
  "Arrow_shaped_wrought_iron_bracket_d2b05d43_2K.jpg":"flèche : plus fine, elle se lit moins bien en petit que celle gardée",
  "Wrought-iron_arrow_bracket_5b1f956c_2K.jpg":"flèche : fond vert sombre, la barre en travers brouille la forme de la flèche",
  "Wrought_iron_bracket_pointing_right_0dcb4343_2K.jpg":"flèche : fond vert sombre, trop chargée (double pointe, trois attaches)",
  "Fasteners_on_green_background_92b036a6_2K.jpg":"pas une gravure : têtes de clou et de punaise, détourées à part (scripts/key-green-sheet.js → assets/taverne/clou-*.webp, punaise-*.webp)",
  "Fasteners_on_green_background_f5ab5e1f_2K.jpg":"têtes de clou et de punaise : les mêmes que la planche gardée",
  "Parchment_fragments_fixed_by_nails_54ad35e0_2K.jpg":"lambeaux : bien, mais en bandes étroites ; gardés ceux des deux autres planches",
  "Parchment_fragments_fixed_by_nails_903e07f9_2K.jpg":"lambeaux : de gros pâtés verts dans le fond et du faux texte anglais bien lisible",
  "Parchment_fragments_on_green_bac…_82577d7b_2K.jpg":"pas une gravure : lambeaux sous leur clou, détourés à part (scripts/key-green-sheet.js → assets/taverne/lambeau-1.webp, lambeau-3.webp)",
  "Torn_parchment_fragments_on_wall_52aec780_2K.jpg":"pas une gravure : lambeaux sous leur clou, détourés à part (scripts/key-green-sheet.js → assets/taverne/lambeau-2.webp, celui à l'écriture)",
  "Charred_parchment_sheet_isolated_fdd48de3.jpg":"papier d'annonce : trop brûlé, troué de part en part",
  "Medieval_parchment_scroll_unrolled_37984693.jpg":"papier d'annonce : un rouleau en largeur, avec de l'écriture",
  "Parchment_banner_with_tear_marks_8755bdf8.jpg":"papier d'annonce : une banderole, trop étroite",
  "Parchment_fragment_on_green_back…_defc563f.jpg":"papier d'annonce : deux pages couvertes de runes",
  "Ripped_paper_scrap_on_green_7bd65cd1.jpg":"papier d'annonce : vierge, mais une forme ronde posée de biais, fond vert clair",
  "Scorched_parchment_fragment_isol…_b5a4f2dc.jpg":"papier d'annonce : écrit et très brûlé",
  "Tattered_medieval_parchment_docu…_3b8525e1.jpg":"papier d'annonce : couvert d'écriture, de biais",
  "Torn_parchment_paper_isolated_2390114e.jpg":"papier d'annonce : un triangle, sur fond presque noir",
  "Torn_scroll_on_green_background_4d0dbf23.jpg":"papier d'annonce : le bon sens (en hauteur), mais couvert de runes et de dessins",
  "Vertical_rolled_scroll_standing_5af1e276.jpg":"papier d'annonce : un rouleau fermé",
  "Aged_blank_paper_sheet_550275a2.jpg":"pas une gravure : feuille d'annonce, détourée à part (scripts/key-green-sheet.js --max 800 → assets/taverne/feuille-1)",
  "Blank_parchment_on_green_background_9da38c1c.jpg":"pas une gravure : feuille d'annonce, détourée à part (scripts/key-green-sheet.js --max 800 → assets/taverne/feuille-2)",
  "Old_blank_paper_on_green_bf3a780f.jpg":"pas une gravure : feuille d'annonce, détourée à part (scripts/key-green-sheet.js --max 800 → assets/taverne/feuille-3)",
  "Old_blank_sheet_of_paper_00af52ff.jpg":"pas une gravure : feuille d'annonce, détourée à part (scripts/key-green-sheet.js --max 800 → assets/taverne/feuille-4)",
  "Old_blank_sheet_of_paper_804057fb.jpg":"pas une gravure : feuille d'annonce, détourée à part (scripts/key-green-sheet.js --max 800 → assets/taverne/feuille-5)",
  "Old_blank_sheet_of_paper_cf34ac1f.jpg":"pas une gravure : feuille d'annonce, détourée à part (scripts/key-green-sheet.js --max 800 → assets/taverne/feuille-6)",
  "Old_blank_sheet_of_paper_a53a9456.jpg":"pas une gravure : feuille d'annonce, détourée à part (scripts/key-green-sheet.js --max 800 → assets/taverne/feuille-7 (retournée, --flop))",
  "Old_blank_paper_on_green_9063b127.jpg":"pas une gravure : feuille d'annonce, détourée à part (scripts/key-green-sheet.js --max 800 → assets/taverne/feuille-8 (tournée d'un demi-tour, --turn))",
  "Old_blank_paper_sheet_7c5b7ab9.jpg":"feuille : trop proche de feuille-1 (même coin coupé en haut à droite)",
  "Old_blank_paper_sheet_8a4a9427.jpg":"feuille : trop proche de feuille-7 (même coin coupé en haut à droite)",
  "Old_blank_sheet_of_paper_bfa96cf8.jpg":"feuille : trop proche de feuille-1 (même coin coupé, mêmes taches)",
  "Old_blank_sheet_of_paper_e7db4196.jpg":"feuille : trop proche de feuille-7 (même coin coupé en haut à droite)"
};

function listMissions(){
  const index=JSON.parse(execFileSync("curl",["-sf",SITE+"/api/background.php"],{encoding:"utf8"}));
  const files=new Map();
  for(const f of index.files) if(/^Taverne\/Missions\/[^/]+\.(png|jpe?g|webp)$/i.test(f.path)) files.set(path.basename(f.path),f.path);
  return {base:index.base,files};
}

// Le blanc du papier : la teinte des coins (le fond de la gravure), ramenée au blanc pur. Une gravure en pleine page
// (coins sombres : pas de papier autour) reste telle quelle.
function whitePoint(file){
  const out=execFileSync("convert",[file,"-colorspace","Gray","-format","%[fx:p{4,4}] %[fx:p{w-5,4}] %[fx:p{4,h-5}] %[fx:p{w-5,h-5}]","info:"],{encoding:"utf8"});
  const v=out.trim().split(/\s+/).map(Number).sort((a,b)=>b-a);
  const paper=(v[0]+v[1])/2;
  return paper<.7?1:Math.min(1,paper-.012);
}

async function main(){
  const {base,files}=listMissions();
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"missions-"));
  const unknown=[...files.keys()].filter(n=>!KEEP.some(([src])=>src===n)&&!(n in REJECTED));
  if(unknown.length) console.log("À trier (ni gardées ni écartées) :\n  "+unknown.join("\n  "));
  const {chromium}=require("playwright");
  const browser=await chromium.launch();
  const page=await browser.newPage();
  fs.mkdirSync(OUT,{recursive:true});
  const force=process.argv.includes("--force");
  for(const [src,name] of KEEP){
    if(!force&&fs.existsSync(path.join(OUT,name+".webp"))) continue;
    const rel=files.get(src);
    if(!rel){ console.log("absente sur Hostinger : "+src); continue; }
    const raw=path.join(tmp,name+path.extname(src));
    execFileSync("curl",["-sf","-o",raw,SITE+"/"+base+"/"+rel.split("/").map(encodeURIComponent).join("/")]);
    const png=path.join(tmp,name+".png");
    const white=whitePoint(raw);
    execFileSync("convert",[raw,"-fuzz","10%","-trim","+repage","-level","0%,"+(white*100).toFixed(1)+"%","-bordercolor","white","-border","25","-resize",WIDTH+"x",png]);
    const data="data:image/png;base64,"+fs.readFileSync(png).toString("base64");
    const webp=await page.evaluate(async({data,q})=>{
      const img=new Image(); img.src=data; await img.decode();
      const c=document.createElement("canvas"); c.width=img.naturalWidth; c.height=img.naturalHeight;
      c.getContext("2d").drawImage(img,0,0);
      return c.toDataURL("image/webp",q);
    },{data,q:QUALITY});
    const dest=path.join(OUT,name+".webp");
    fs.writeFileSync(dest,Buffer.from(webp.split(",")[1],"base64"));
    console.log(name+".webp",Math.round(fs.statSync(dest).size/1024)+" Ko","(blanc à "+(white*100).toFixed(0)+" %)");
  }
  await browser.close();
  fs.rmSync(tmp,{recursive:true,force:true});
}

main().catch(err=>{ console.error(err); process.exit(1); });
