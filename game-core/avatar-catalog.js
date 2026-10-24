"use strict";

// Catalogue des avatars à partir des images d'Idan et de leurs mots-clés Bridge.
// Utilisé par le jeu (index lu sur Hostinger : api/avatars.php) et par scripts/build-avatars.js.
//
// - Un avatar = un plein pied (image haute) + un portrait (image carrée) portant le même peuple et le
//   même numéro dans le nom : « Ogre_12_….jpg » et « Ogre_12_Square_….jpg », ou sans tiret bas,
//   « Halfling001.jpg » et « Halfling001_square.jpg ». Le portrait est reconnu à sa forme carrée, pas à son nom.
// - Les mots-clés des deux images s'additionnent : taguer le plein pied suffit.
// - Chaque mot-clé est rangé dans sa famille (peuple, sexe, culture, origine, alignement, ascendance,
//   profil, magie, arme) d'après les référentiels ; un mot-clé inconnu est signalé.
// - L'identifiant (« ogre-012 ») ne dépend que du peuple et du numéro : retaguer ou renommer une image
//   ne change pas l'avatar des parties sauvegardées.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesAvatarCatalog=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const PROFILES={"Corps à corps":"melee","Distance":"ranged","Magie":"magic"};
  const SEXES={femme:["F","Femme","Femelle"],homme:["M","H","Homme","Masculin","Mâle"]};
  const TAG_FAMILIES=["culture","origin","alignment","ascendance","profile","magic","weapon"];

  function norm(value){
    return String(value??"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[’‘`´]/g,"'")
      .toLowerCase().replace(/\s+/g," ").trim();
  }
  const slug=value=>norm(value).replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  const rowsOf=table=>Array.isArray(table?.rows)?table.rows:[];

  // Vocabulaire : famille → valeurs de référence (référentiels de data/reference/).
  function vocabulary(reference){
    const weapons=rowsOf(reference.weapons);
    const weaponCategories=[...new Set(weapons.map(w=>String(w.domaine||"").split(",")[0].trim()).filter(Boolean))].sort();
    return {
      people:rowsOf(reference.peoples).map(r=>r.nom),
      culture:rowsOf(reference.cultures).map(r=>r.nom),
      origin:rowsOf(reference.socialOrigins).map(r=>r.nom),
      alignment:rowsOf(reference.alignments).map(r=>r.nom),
      ascendance:rowsOf(reference.ancestries).map(r=>r.nom),
      profile:Object.keys(PROFILES),
      magic:rowsOf(reference.skills).filter(r=>r.domaine==="Magie").map(r=>r.nom),
      weaponCategories,
      weapon:[...weaponCategories,...weapons.map(w=>w.nom)],
      weaponsByCategory:Object.fromEntries(weaponCategories.map(c=>[c,weapons.filter(w=>String(w.domaine).startsWith(c+",")).map(w=>w.nom)])),
      // Noms changés (renamed-names.json) : un avatar tagué sous l'ancien nom reste reconnu sous le nouveau.
      renamed:rowsOf(reference.renamedNames)
    };
  }

  // Mot-clé → {family, value}. Accepte « Famille|Valeur » (mots-clés hiérarchiques) et les pluriels simples.
  function classifier(vocab){
    const index=new Map();
    const add=(family,label,value=label)=>index.set(norm(label),{family,value});
    for(const family of ["people","culture","origin","alignment","ascendance","magic","weapon"]) for(const v of vocab[family]) add(family,v);
    for(const row of vocab.renamed||[]){
      const family={culture:"culture",arme:"weapon"}[row.famille];
      if(family) add(family,row.ancien,row.nouveau);
    }
    for(const [label,code] of Object.entries(PROFILES)) add("profile",label,code);
    for(const [sex,labels] of Object.entries(SEXES)) for(const l of labels) add("sex",l,sex);
    const singular=k=>k.split(/([ -])/).map(w=>w.length>3?w.replace(/[sx]$/,""):w).join("");
    return keyword=>{
      const k=norm(String(keyword).split("|").pop());
      return index.get(k)||index.get(singular(k))||null;
    };
  }

  // files : [{path:"Ogres/Ogre_12_….jpg", w, h, keywords:[…]}], chemins relatifs au dossier des avatars.
  // Renvoie les avatars complets (plein pied + portrait), avec leurs fichiers sources, et les remarques.
  function groupAvatarFiles(files,reference){
    const classify=classifier(vocabulary(reference));
    const groups=new Map(), warnings=[];
    const sorted=[...(files||[])].filter(f=>f&&f.path).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
    for(const file of sorted){
      const parts=file.path.split("/");
      const name=parts[parts.length-1];
      // « Peuple_12… » ou « Peuple012… » (dépôt Hostinger du 2026-10-21 : Halflings et Reptiliens).
      const match=name.match(/^(.+?)_?(\d+)(?:_|\.|$)/);
      if(!match){ warnings.push(`${file.path} : nom sans « Peuple_Numéro », ignoré`); continue; }
      const folder=parts.length>1?parts[0]:"";
      const fromName=classify(match[1]), fromFolder=folder?classify(folder):null;
      const people=fromName?.family==="people"?fromName.value:fromFolder?.family==="people"?fromFolder.value:null;
      if(!people){ warnings.push(`${file.path} : peuple inconnu (« ${match[1]} »), ignoré`); continue; }
      const id=`${slug(people)}-${String(Number(match[2])).padStart(3,"0")}`;
      const w=Number(file.w)||0, h=Number(file.h)||0;
      const kind=w>0&&Math.abs(w-h)<=w*0.05?"portrait":"full";
      const g=groups.get(id)||{id,people,files:{},keywords:new Set()};
      if(g.files[kind]) warnings.push(`${id} : deux images « ${kind} » (${g.files[kind].path}, ${file.path})`);
      g.files[kind]=file;
      for(const k of file.keywords||[]) if(String(k).trim()) g.keywords.add(String(k).trim());
      groups.set(id,g);
    }

    const avatars=[];
    for(const g of [...groups.values()].sort((a,b)=>a.id.localeCompare(b.id))){
      if(!g.files.full||!g.files.portrait){ warnings.push(`${g.id} : il manque le ${g.files.full?"portrait":"plein pied"}, ignoré`); continue; }
      const tags=Object.fromEntries(TAG_FAMILIES.map(f=>[f,[]]));
      let sex=null;
      for(const k of g.keywords){
        const c=classify(k);
        if(!c){ warnings.push(`${g.id} : mot-clé inconnu « ${k} »`); continue; }
        if(c.family==="people"){ if(c.value!==g.people) warnings.push(`${g.id} : tag peuple « ${k} » ≠ ${g.people}`); continue; }
        if(c.family==="sex"){ if(sex&&sex!==c.value) warnings.push(`${g.id} : deux sexes tagués`); sex=c.value; continue; }
        if(!tags[c.family].includes(c.value)) tags[c.family].push(c.value);
      }
      if(tags.magic.length&&!tags.profile.length) tags.profile.push("magic");
      for(const k of Object.keys(tags)) if(!tags[k].length) delete tags[k];
      avatars.push({id:g.id,people:g.people,sex,tags,files:{full:g.files.full,portrait:g.files.portrait}});
    }
    return {avatars,warnings};
  }

  // Adresse web d'un fichier, chaque segment encodé (espaces, accents, #…).
  function fileUrl(baseUrl,path){
    return String(baseUrl).replace(/\/?$/,"/")+String(path).split("/").filter(Boolean).map(encodeURIComponent).join("/");
  }

  // Catalogue du jeu, au format de data/reference/avatars.json, depuis l'index de api/avatars.php.
  function buildAvatarCatalog(files,reference,{baseUrl="/media/avatars/"}={}){
    const {avatars,warnings}=groupAvatarFiles(files,reference);
    const rows=avatars.map(a=>({
      id:a.id,people:a.people,sex:a.sex,tags:a.tags,
      full:fileUrl(baseUrl,a.files.full.path),
      portrait:fileUrl(baseUrl,a.files.portrait.path),
      source:a.files.full.path
    }));
    return {rows,warnings};
  }

  // Silhouettes d'équipement (Idan, 2026-10-21) : une image par peuple et par sexe, déposée sur Hostinger
  // dans media/Avatars_Equipements (index : api/silhouettes.php). Le peuple et le sexe se lisent dans le
  // nom du fichier, ses dossiers ou ses mots-clés Bridge (« Orc_Femme.jpg », « Homme-bete_H.jpg »…), ou
  // dans data/reference/equipment-silhouettes.json quand le nom ne les donne pas (images générées).
  // Renvoie une ligne par couple peuple + sexe, et les remarques (image ambiguë, doublon).
  function buildSilhouetteCatalog(files,reference,{baseUrl="/media/Avatars_Equipements/"}={}){
    const classify=classifier(vocabulary(reference));
    const known=new Map(rowsOf(reference.equipmentSilhouetteFiles).map(r=>[r.fichier,r]));
    const rows=[],warnings=[],seen=new Map();
    const sorted=[...(files||[])].filter(f=>f&&f.path).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
    for(const file of sorted){
      const words=file.path.replace(/\.[a-z0-9]+$/i,"").split(/[\/_\s.-]+/).filter(Boolean);
      let people=null,sex=null;
      const found=c=>{
        if(c?.family==="people"&&!people) people=c.value;
        else if(c?.family==="sex"&&!sex) sex=c.value;
      };
      // Un peuple en deux mots (« Homme-bête ») passe avant le sexe « Homme ».
      for(let i=0;i<words.length;i++){
        const pair=i+1<words.length?classify(words[i]+"-"+words[i+1]):null;
        if(pair?.family==="people"){ found(pair); i++; continue; }
        found(classify(words[i]));
      }
      for(const k of file.keywords||[]) found(classify(k));
      const entry=known.get(file.path);
      if(entry){ people=classify(entry.peuple)?.family==="people"?entry.peuple:people; sex=classify(entry.sexe)?.family==="sex"?classify(entry.sexe).value:sex; }
      if(!people||!sex){ warnings.push(`${file.path} : ${people?"sexe":"peuple"} introuvable, ignorée`); continue; }
      const key=people+"|"+sex;
      if(seen.has(key)){ warnings.push(`${file.path} : ${people} ${sex} déjà fourni par ${seen.get(key)}, ignorée`); continue; }
      seen.set(key,file.path);
      rows.push({people,sex,url:fileUrl(baseUrl,file.path),source:file.path});
    }
    return {rows,warnings};
  }

  // Deux catalogues réunis ; à identifiant égal, le second (Hostinger) remplace le premier (Git).
  function mergeCatalogs(base,override){
    const byId=new Map((base||[]).map(a=>[a.id,a]));
    for(const a of override||[]) byId.set(a.id,a);
    return [...byId.values()].sort((a,b)=>a.id.localeCompare(b.id));
  }

  return {PROFILES,SEXES,norm,slug,vocabulary,classifier,groupAvatarFiles,buildAvatarCatalog,buildSilhouetteCatalog,mergeCatalogs,fileUrl};
});
