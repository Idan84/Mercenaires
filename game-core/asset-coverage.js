"use strict";

// Images attendues par le jeu, hors avatars (Idan, 2026-10-29 : « une liste des images manquantes autre que les
// avatars : les sorts, les cadres, les ennemis types, les invocations… »). Design Lab, onglet Images.
// Pour chaque famille : ce qui existe, ce qui manque, et où déposer le master (assets-src/, voir son README).
// Trois façons de savoir si une image existe :
// - present : true / false, déjà connu (champ icone / cadre de spells.json, liste equipment-art.js) ;
// - present : null avec url : fichier servi par le site, à vérifier par le Design Lab (requête HEAD) ;
// - planned : false : le jeu n'affiche encore aucune image à cet endroit (ennemis, invocations, certains décors).
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  else root.MercenairesAssetCoverage=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  // Même calcul que pictoSlug (prototype-web/picto-ui.js) et scripts/build-equipment.js.
  function slug(name){
    return String(name??"").normalize("NFD").replace(/[̀-ͯ]/g,"")
      .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  }
  const rows=table=>Array.isArray(table?.rows)?table.rows:[];

  // Tables d'équipement → dossier du jeu (prototype-web/ui.js, EQUIPMENT_ART_DIRS) et dossier des masters.
  const EQUIPMENT=[
    ["weapons","armes","Armes"],["baseArmors","armures","Armures"],["helmets","casques","Casques"],
    ["boots","bottes","Bottes"],["belts","ceintures","Ceintures"],["amulets","amulettes","Amulettes"],
    ["capes","capes","Capes"],["gloves","gants","Gants"],["pants","culottes","Culottes"],["rings","bagues","Bagues"]
  ];
  const TIERS=[1,2,3,4];
  // Décors : les fonds connus du jeu (styles.css, camp-buildings-ui.js) et les écrans qui n'en ont pas encore.
  const SCENES=[
    {name:"Château (menu principal, accueil du camp)",url:"assets/camp-home-background.jpg",master:"assets-src/fonds/"},
    {name:"Taverne",url:"/media/background/tavern.jpg",master:"Hostinger, media/background/"},
    {name:"Intendance",url:"/media/background/Quatermaster.jpg",master:"Hostinger, media/background/"},
    ...Array.from({length:11},(_,level)=>({name:"Dortoir, niveau "+level,url:"assets/dormitory/dortoir-"+level+".jpg",master:"assets-src/fonds/Dortoirs/"})),
    {name:"Intro : le capitaine mourant",url:"assets/intro/capitaine-mourant.jpg",master:"assets-src/fonds/"},
    {name:"Ma Compagnie",planned:false,note:"fond du château pour l'instant",master:"assets-src/fonds/"},
    {name:"Mes mercenaires",planned:false,note:"fond du château pour l'instant",master:"assets-src/fonds/"},
    {name:"Champ de bataille (écran de combat)",planned:false,note:"plateau en dégradés CSS pour l'instant",master:"assets-src/fonds/"}
  ];

  function spellSections(reference){
    const spells=rows(reference.spells);
    const schools=[...new Set(spells.map(s=>s.ecole).filter(Boolean))];
    const icons={key:"spells",title:"Icônes de sorts",master:"assets-src/Sorts/<École>/<code>.jpg (un parchemin par sort)",
      groups:schools.map(school=>({name:school,items:spells.filter(s=>s.ecole===school).map(s=>({
        name:s.nom,file:s.code+".jpg",present:Boolean(s.icone)}))}))};
    const frames={key:"frames",title:"Cadres",master:"assets-src/Sorts/<École>/cadre.jpg ; assets-src/Equipements/Frames/frame_<tier>.jpg",
      groups:[
        {name:"Cadres d'école (sorts)",items:schools.map(school=>({name:school,file:"cadre.jpg",
          present:spells.some(s=>s.ecole===school&&s.cadre)}))},
        {name:"Cadres de tier (objets)",items:TIERS.map(tier=>({name:"Tier "+tier,file:"frame_"+tier+".jpg",key:"frames/frame-"+tier}))}
      ]};
    return [icons,frames];
  }

  function enemySection(reference){
    const enemies=rows(reference.enemyArchetypes);
    const lines=[...new Set(enemies.map(e=>(e.peuple||"Autres")+" — "+(e.ligne||"autres")))];
    return {key:"enemies",title:"Ennemis types",master:"assets-src/Ennemis/<code>.jpg",
      note:"Le jeu n'affiche pas encore d'image d'ennemi : leurs pions montrent leurs initiales.",
      groups:lines.map(line=>({name:line,items:enemies.filter(e=>(e.peuple||"Autres")+" — "+(e.ligne||"autres")===line)
        .map(e=>({name:e.nom,file:e.code+".jpg",planned:false}))}))};
  }

  function summonSection(reference){
    const creatures=rows(reference.summonArchetypes);
    const schools=[...new Set(creatures.map(c=>c.ecole||"Autres"))];
    return {key:"summons",title:"Invocations",master:"assets-src/Invocations/<code>.jpg",
      note:"Les créatures invoquées n'ont pas encore d'image. Le zombie garde le portrait du mort relevé.",
      groups:schools.map(school=>({name:school,items:creatures.filter(c=>(c.ecole||"Autres")===school)
        .map(c=>({name:c.nom,file:c.code+".jpg",planned:false}))}))};
  }

  // Potions et fioles (Idan, 2026-10-29 : « je ferai les icônes plus tard ») : la fiole de ceinture en attendant.
  function potionSection(reference){
    return {key:"potions",title:"Potions et fioles",master:"assets-src/Potions/<code>.jpg",
      note:"En attendant leurs icônes, les fioles ont le picto de poche de ceinture.",
      groups:[{name:"Ceinture",items:rows(reference.potions).map(p=>({name:p.nom,file:p.code+".jpg",planned:false}))}]};
  }

  function equipmentSection(reference){
    return {key:"equipment",title:"Équipement (objets par tier)",master:"assets-src/Equipements/<Type>/<Nom>_T<tier>.jpg",
      groups:EQUIPMENT.map(([table,dir,label])=>({name:label,items:rows(reference[table]).flatMap(item=>TIERS.map(tier=>({
        name:item.nom+" T"+tier,file:item.nom.replace(/\s+/g,"_")+"_T"+tier+".jpg",key:dir+"/"+slug(item.nom)+"-"+tier})))}))};
  }

  function pictoSection(reference){
    const kinds=[["peoples","peuple","Peuples","Peuple"],["cultures","culture","Cultures","Culture"],["ancestries","ascendance","Ascendances","Ascendance"]];
    return {key:"pictos",title:"Pictos",master:"assets-src/Picto/<Peuple|Culture|Ascendance>/",
      groups:kinds.map(([table,prefix,label,folder])=>({name:label,items:rows(reference[table]).map(r=>r.nom||r.name).filter(Boolean)
        .map(name=>({name,file:folder+"/"+name,url:"assets/pictos/"+prefix+"-"+slug(name)+".webp"}))}))};
  }

  function sceneSection(){
    return {key:"scenes",title:"Décors",master:"assets-src/fonds/",groups:[{name:"Écrans",items:SCENES.map(s=>({...s}))}]};
  }

  // equipmentArt : ensemble des clés présentes (prototype-web/equipment-art.js, EQUIPMENT_ART).
  function listExpected(reference,{equipmentArt=new Set()}={}){
    const sections=[...spellSections(reference),enemySection(reference),summonSection(reference),
      equipmentSection(reference),potionSection(reference),pictoSection(reference),sceneSection()];
    for(const item of sections.flatMap(s=>s.groups.flatMap(g=>g.items))){
      if(item.planned===false) item.present=false;
      else if(item.key) item.present=equipmentArt.has(item.key);
      else if(item.present===undefined) item.present=null;
    }
    return sections;
  }

  // Images à vérifier par une requête (present encore inconnu).
  function pendingChecks(sections){
    return sections.flatMap(s=>s.groups.flatMap(g=>g.items)).filter(item=>item.present===null&&item.url);
  }

  // Bilan par section : nombre attendu, manquant, dont « pas encore prévu dans le jeu ».
  function summarize(sections){
    return sections.map(s=>{
      const items=s.groups.flatMap(g=>g.items);
      const missing=items.filter(i=>i.present===false);
      return {key:s.key,title:s.title,total:items.length,missing:missing.length,unplanned:missing.filter(i=>i.planned===false).length};
    });
  }

  return {listExpected,pendingChecks,summarize,slug,EQUIPMENT,SCENES};
});
