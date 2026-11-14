#!/usr/bin/env node
"use strict";

// La Taverne en calques (Idan, 2026-11-14), fabriquée depuis ses images : media/background/Taverne/ sur Hostinger
// (liste : api/background.php), toutes sur fond vert à la taille de la taverne, chaque élément à sa place — le décor vide
// (BG_EMPTY), les ombres des clients (Shadow, sur fond blanc), le tableau des primes, le menu, les deux tables, la trappe, le
// tavernier, les tonneaux du premier plan ; et, dans « Alternate tavernier/ », les variantes du tavernier (« au chargement
// de la taverne, on charge une image au hasard du tavernier »). Le repère du jeu reste 1376 × 768 : une image plus grande
// (haute définition, Idan : « je vais te charger des images + haute def ») garde tous ses pixels, son cadre est ramené à ce
// repère. La qualité avant le poids des fichiers (Idan : « l'idée c'est de faire un jeu Unreal, pas de gagner sur Google
// Speed »). Ce script :
// - détoure chaque calque (le vert devient transparent ; le reflet vert sur le personnage est retiré) ;
// - le recadre sur ce qu'il montre et l'écrit en WebP dans prototype-web/assets/taverne/ (variantes : taverniers/) ;
// - assemble le décor avec les ombres (fond.webp) et la taverne complète (taverne.webp, le fond des autres salles) ;
// - calcule où chaque zone capte le pointeur (l'enveloppe de ses calques ; celle de tous les taverniers pour le tavernier) ;
// - écrit prototype-web/tavern-layers.js, lu par la taverne (tavern-scene-ui.js).
// Usage : node scripts/build-tavern.js            (télécharge les images depuis le site)
//         node scripts/build-tavern.js --from DIR (DIR a la même arborescence que media/background/Taverne)
// Nécessite Playwright (détourage, mesures) et ImageMagick (convert, pour le WebP).
const fs=require("fs");
const os=require("os");
const path=require("path");
const {execFileSync}=require("child_process");

const ROOT=path.resolve(__dirname,"..");
const SITE="https://bloodandwages.idanwizen.com";
const OUT=path.join(ROOT,"prototype-web","assets","taverne");
const DATA=path.join(ROOT,"prototype-web","tavern-layers.js");
// Le repère de la taverne dans le jeu (celui des premières images d'Idan).
const SCENE={width:1376,height:768};
// Combien le vert peut dépasser la moyenne du rouge et du bleu (sur 255) : au-delà, c'est du reflet du fond vert.
const DESPILL_TOLERANCE=6;
const WEBP=["-strip","-quality","92","-define","webp:alpha-quality=100","-define","webp:method=6"];
// Les calques, reconnus par leur nom, du fond vers l'avant ; zone : la salle qu'ils ouvrent.
const LAYERS=[
  {key:"annonce",match:/annonce/i,zone:"missions"},
  {key:"menu",match:/^menu/i,zone:"canteen"},
  {key:"table2",match:/table_?2/i,zone:"recruits"},
  {key:"table1",match:/table_?1/i,zone:"recruits"},
  {key:"trappe",match:/trappe/i,zone:"cellar"},
  {key:"tavernier",match:/^tavernier/i,zone:"talk"},
  {key:"premier-plan",match:/premier_?plan/i}
];
const BACKGROUND=/bg_?empty/i,SHADOW=/shadow/i,VARIANTS=/^alternate tavernier$/i;

// Le nom d'une variante, tiré du fichier : « Dwarf_tavern_keeper_holding_ale_ab54f84f.jpg » → « holding-ale ».
function variantKey(file){
  return path.basename(file).replace(/\.[^.]+$/,"").replace(/_[0-9a-f]{8}$/i,"").replace(/…/g,"")
    .replace(/^(surprised_)?dwarf_(tavern_keeper_)?/i,(m,s)=>s?"surprised_":"")
    .normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

function download(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"tavern-"));
  const index=JSON.parse(execFileSync("curl",["-sf",SITE+"/api/background.php"],{encoding:"utf8"}));
  for(const f of index.files){
    const parts=f.path.split("/");
    if(!/^taverne$/i.test(parts[0])||parts.length>3||!/\.(png|jpe?g|webp)$/i.test(f.path)) continue;
    const dest=path.join(dir,...parts.slice(1));
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    execFileSync("curl",["-sf","-o",dest,SITE+"/"+index.base+"/"+parts.map(encodeURIComponent).join("/")]);
  }
  return dir;
}

// Enveloppe convexe (chaîne monotone), puis allégée des sommets presque alignés ; points arrondis.
function hull(points){
  const p=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lo=[],up=[];
  for(const q of p){ while(lo.length>=2&&cross(lo[lo.length-2],lo[lo.length-1],q)<=0) lo.pop(); lo.push(q); }
  for(const q of p.reverse()){ while(up.length>=2&&cross(up[up.length-2],up[up.length-1],q)<=0) up.pop(); up.push(q); }
  const poly=lo.slice(0,-1).concat(up.slice(0,-1));
  let changed=true;
  while(changed&&poly.length>8){
    changed=false;
    for(let i=0;i<poly.length;i++){
      const a=poly[(i-1+poly.length)%poly.length],b=poly[i],c=poly[(i+1)%poly.length];
      if(Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2<60){ poly.splice(i,1); changed=true; break; }
    }
  }
  return poly.map(([x,y])=>[Math.round(x),Math.round(y)]);
}
const round2=v=>Math.round(v*100)/100;

// Dans le navigateur : détourage, cadre de ce que montre le calque, points du contour (gauche et droite de chaque ligne),
// PNG recadré. Le tout ramené au repère de la taverne (scale : largeur de l'image ÷ 1376).
async function keyImage(page,file){
  const src="data:image/"+(/\.png$/i.test(file)?"png":/\.webp$/i.test(file)?"webp":"jpeg")+";base64,"+fs.readFileSync(file).toString("base64");
  return page.evaluate(async({src,tolerance,sceneWidth})=>{
    const img=new Image();
    img.src=src;
    await img.decode();
    const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement("canvas");
    c.width=w;c.height=h;
    const g=c.getContext("2d",{willReadFrequently:true});
    g.drawImage(img,0,0);
    const im=g.getImageData(0,0,w,h),d=im.data;
    // Le vert du fond devient transparent ; le reflet vert sur le personnage (les bords, les vêtements) est retiré : le
    // vert ne dépasse plus la moyenne du rouge et du bleu (les bruns et les gris ne bougent pas, l'olive redevient brun).
    for(let i=0;i<d.length;i+=4){
      const r=d[i],gr=d[i+1],b=d[i+2],spill=gr-Math.max(r,b);
      d[i+3]=Math.round(255*(1-Math.min(1,Math.max(0,(spill-30)/77))));
      const cap=(r+b)/2+tolerance;
      if(gr>cap) d[i+1]=Math.round(cap);
    }
    g.putImageData(im,0,0);
    const s=w/sceneWidth,step=Math.max(1,Math.round(s));
    let x0=w,y0=h,x1=-1,y1=-1;const pts=[];
    for(let y=0;y<h;y++){
      let l=-1,r=-1;
      for(let x=0;x<w;x++) if(d[(y*w+x)*4+3]>40){ if(l<0) l=x; r=x; }
      if(l<0) continue;
      if(y%step===0) pts.push([l/s,y/s],[(r+1)/s,y/s],[l/s,(y+step)/s],[(r+1)/s,(y+step)/s]);
      x0=Math.min(x0,l);x1=Math.max(x1,r+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);
    }
    if(x1<0) return null;
    const out=document.createElement("canvas");
    out.width=x1-x0;out.height=y1-y0;
    out.getContext("2d").drawImage(c,x0,y0,out.width,out.height,0,0,out.width,out.height);
    return {w,h,scale:s,box:[x0/s,y0/s,(x1-x0)/s,(y1-y0)/s],pts,png:out.toDataURL("image/png"),
      crop:[x0,y0]};
  },{src,tolerance:DESPILL_TOLERANCE,sceneWidth:SCENE.width});
}

async function main(){
  const args=process.argv.slice(2);
  const from=args.includes("--from")?path.resolve(args[args.indexOf("--from")+1]):download();
  const images=dir=>fs.readdirSync(dir).filter(f=>/\.(png|jpe?g|webp)$/i.test(f)).sort().map(f=>path.join(dir,f));
  // Une image en plusieurs tailles (« BG_EMPTY…_2K.jpg » à côté de « BG_EMPTY….jpg ») : la plus grande.
  const sizeOf=file=>execFileSync("identify",["-format","%w %h",file],{encoding:"utf8"}).trim().split(" ").map(Number);
  const files=images(from);
  const find=re=>files.filter(f=>re.test(path.basename(f))).map(f=>({f,w:sizeOf(f)[0]})).sort((a,b)=>b.w-a.w)[0]?.f;
  const variantsDir=fs.readdirSync(from).find(d=>VARIANTS.test(d)&&fs.statSync(path.join(from,d)).isDirectory());
  const background=find(BACKGROUND);
  if(!background) throw new Error("Pas de décor vide (BG_EMPTY) dans "+from);
  const [bw,bh]=sizeOf(background);
  if(Math.abs(bw/bh-SCENE.width/SCENE.height)>0.01) throw new Error(`Le décor n'est pas au format de la taverne : ${bw} × ${bh}`);
  const {chromium}=require("playwright");
  const browser=await chromium.launch();
  const page=await browser.newPage();
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"tavern-png-"));
  fs.mkdirSync(OUT,{recursive:true});
  const writeLayer=(r,dest)=>{
    const png=path.join(tmp,path.basename(dest,".webp")+".png");
    fs.writeFileSync(png,Buffer.from(r.png.split(",")[1],"base64"));
    execFileSync("convert",[png,...WEBP,dest]);
    return png;
  };
  // Chaque image a sa taille (Idan les passe en haute définition une à une) : au format de la taverne.
  const sameFormat=r=>r&&Math.abs(r.h/r.w-SCENE.height/SCENE.width)<0.01;
  // Le décor vide, assombri par les ombres des clients (sur fond blanc : « multiply »), à sa taille.
  const shadow=find(SHADOW),fondPng=path.join(tmp,"fond.png");
  execFileSync("convert",shadow?[background,"(",shadow,"-resize",`${bw}x${bh}!`,")","-compose","multiply","-composite",fondPng]:[background,fondPng]);
  execFileSync("convert",[fondPng,...WEBP,path.join(OUT,"fond.webp")]);
  // Les calques.
  const layers={},zonePoints={},composite=[];
  for(const L of LAYERS){
    const file=find(L.match);
    if(!file) throw new Error("Calque introuvable : "+L.key);
    const r=await keyImage(page,file);
    if(!sameFormat(r)) throw new Error(`${path.basename(file)} : pas au format de la taverne (${r?.w} × ${r?.h})`);
    composite.push([writeLayer(r,path.join(OUT,L.key+".webp")),r.crop,r.w]);
    layers[L.key]=r.box.map(round2);
    if(L.zone) (zonePoints[L.zone]||(zonePoints[L.zone]=[])).push({key:L.key,pts:r.pts});
  }
  // Les variantes du tavernier.
  const variants=[],tavernPoints=[...zonePoints.talk[0].pts];
  const variantsOut=path.join(OUT,"taverniers");
  fs.rmSync(variantsOut,{recursive:true,force:true});
  fs.mkdirSync(variantsOut,{recursive:true});
  for(const file of variantsDir?images(path.join(from,variantsDir)):[]){
    const r=await keyImage(page,file);
    if(!sameFormat(r)){ console.warn("ignorée (format ou image vide) :",path.basename(file)); continue; }
    let key=variantKey(file),n=2;
    while(variants.some(v=>v.key===key)) key=variantKey(file)+"-"+n++;
    writeLayer(r,path.join(variantsOut,key+".webp"));
    variants.push({key,box:r.box.map(round2)});
    tavernPoints.push(...r.pts);
  }
  await browser.close();
  // La taverne complète (le tavernier d'origine) : le fond des autres salles.
  // (Un calque d'une autre taille que le décor y est remis à l'échelle.)
  const full=[fondPng];
  for(const [png,[x,y],w] of composite){
    const k=bw/w;
    full.push("(",png,"-resize",`${Math.round(k*100*1000)/1000}%`,")","-geometry",`+${Math.round(x*k)}+${Math.round(y*k)}`,"-composite");
  }
  execFileSync("convert",[...full,...WEBP,path.join(OUT,"taverne.webp")]);
  // Où chaque zone capte le pointeur : une enveloppe par calque ; pour le tavernier, celle de tous les taverniers.
  const hulls=Object.fromEntries(Object.entries(zonePoints).map(([zone,list])=>[zone,
    zone==="talk"?[hull(tavernPoints)]:list.map(x=>hull(x.pts))]));
  const text=`"use strict";

// La Taverne en calques (Idan, 2026-11-14), écrite par scripts/build-tavern.js : ne pas modifier à la main.
// Images : assets/taverne/<calque>.webp et taverniers/<variante>.webp, à la taille des images d'Idan (décor : ${bw} × ${bh}) ;
// les cadres [x, y, largeur, hauteur] et les enveloppes sont dans le repère de la taverne (${SCENE.width} × ${SCENE.height}).
const TAVERN_SOURCE_SIZE=${JSON.stringify({width:bw,height:bh})};
const TAVERN_LAYER_BOXES=${JSON.stringify(layers)};
const TAVERN_ZONE_HULLS=${JSON.stringify(hulls)};
const TAVERN_TAVERNIERS=${JSON.stringify(variants)};
if(typeof module!=="undefined") module.exports={TAVERN_SOURCE_SIZE,TAVERN_LAYER_BOXES,TAVERN_ZONE_HULLS,TAVERN_TAVERNIERS};
`;
  fs.writeFileSync(DATA,text);
  console.log(`Taverne ${bw} × ${bh} : ${Object.keys(layers).length} calques, ${variants.length} taverniers (${variants.map(v=>v.key).join(", ")})`);
}

if(require.main===module) main().catch(error=>{ console.error(error); process.exit(1); });
module.exports={variantKey,hull};
