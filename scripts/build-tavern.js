#!/usr/bin/env node
"use strict";

// Les variantes du tavernier (Idan, 2026-11-14 : « C'est possible qu'au chargement de la taverne, on charge une image au
// hasard du tavernier ? ») : Idan les dépose sur Hostinger, sur fond vert, dans media/background/Taverne/Alternate
// tavernier/ (liste : api/background.php), à la taille de la taverne (1376 × 768), le tavernier à sa place. Ce script :
// - détoure chaque image (le vert devient transparent, sans liseré vert : comme les calques de la taverne) ;
// - la recadre sur le tavernier et l'écrit en WebP dans prototype-web/assets/taverne/taverniers/<nom>.webp ;
// - calcule l'enveloppe de tous les taverniers (l'original compris) : la zone où le pointeur est capté ;
// - écrit prototype-web/tavern-taverniers.js, lu par la taverne (tavern-scene-ui.js).
// Usage : node scripts/build-tavern.js            (télécharge les images depuis le site)
//         node scripts/build-tavern.js --from DIR (les images de DIR)
// Nécessite Playwright (détourage, mesures) et ImageMagick (convert, pour le WebP).
const fs=require("fs");
const os=require("os");
const path=require("path");
const {execFileSync}=require("child_process");

const ROOT=path.resolve(__dirname,"..");
const SITE="https://bloodandwages.idanwizen.com";
const FOLDER=/^taverne\/alternate tavernier\/[^/]+\.(png|jpe?g|webp)$/i;
const OUT=path.join(ROOT,"prototype-web","assets","taverne","taverniers");
const ORIGINAL=path.join(ROOT,"prototype-web","assets","taverne","tavernier.webp");
const ORIGINAL_BOX=[1022,208,250,544];
const DATA=path.join(ROOT,"prototype-web","tavern-taverniers.js");
const SCENE={width:1376,height:768};
// Combien le vert peut dépasser la moyenne du rouge et du bleu (sur 255) : au-delà, c'est du reflet du fond vert.
const DESPILL_TOLERANCE=6;

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
    if(!FOLDER.test(f.path)) continue;
    execFileSync("curl",["-sf","-o",path.join(dir,path.basename(f.path)),SITE+"/"+index.base+"/"+f.path.split("/").map(encodeURIComponent).join("/")]);
  }
  return dir;
}

// Enveloppe convexe (chaîne monotone), puis allégée des sommets presque alignés.
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
  return poly;
}

// Dans le navigateur : détourage, cadre du tavernier, points du contour (gauche et droite de chaque ligne), PNG recadré.
async function keyImage(page,file,keyed){
  const src="data:image/"+(/\.png$/i.test(file)?"png":/\.webp$/i.test(file)?"webp":"jpeg")+";base64,"+fs.readFileSync(file).toString("base64");
  return page.evaluate(async({src,keyed,DESPILL_TOLERANCE})=>{
    const img=new Image();
    img.src=src;
    await img.decode();
    const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement("canvas");
    c.width=w;c.height=h;
    const g=c.getContext("2d",{willReadFrequently:true});
    g.drawImage(img,0,0);
    const im=g.getImageData(0,0,w,h),d=im.data;
    if(keyed){
      // Le vert du fond devient transparent ; le reflet vert sur le personnage (les bords, les vêtements) est retiré : le
      // vert ne dépasse plus la moyenne du rouge et du bleu (les bruns et les gris ne bougent pas, l'olive redevient brun).
      for(let i=0;i<d.length;i+=4){
        const r=d[i],gr=d[i+1],b=d[i+2],spill=gr-Math.max(r,b);
        d[i+3]=Math.round(255*(1-Math.min(1,Math.max(0,(spill-30)/77))));
        const cap=(r+b)/2+DESPILL_TOLERANCE;
        if(gr>cap) d[i+1]=Math.round(cap);
      }
      g.putImageData(im,0,0);
    }
    let x0=w,y0=h,x1=-1,y1=-1;const pts=[];
    for(let y=0;y<h;y++){
      let l=-1,r=-1;
      for(let x=0;x<w;x++) if(d[(y*w+x)*4+3]>40){ if(l<0) l=x; r=x; }
      if(l<0) continue;
      pts.push([l,y],[r+1,y],[l,y+1],[r+1,y+1]);
      x0=Math.min(x0,l);x1=Math.max(x1,r+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);
    }
    if(x1<0) return null;
    const out=document.createElement("canvas");
    out.width=x1-x0;out.height=y1-y0;
    out.getContext("2d").drawImage(c,x0,y0,out.width,out.height,0,0,out.width,out.height);
    return {w,h,box:[x0,y0,x1-x0,y1-y0],pts,png:keyed?out.toDataURL("image/png"):null};
  },{src,keyed,DESPILL_TOLERANCE});
}

async function main(){
  const args=process.argv.slice(2);
  const from=args.includes("--from")?path.resolve(args[args.indexOf("--from")+1]):download();
  const files=fs.readdirSync(from).filter(f=>/\.(png|jpe?g|webp)$/i.test(f)).sort().map(f=>path.join(from,f));
  const {chromium}=require("playwright");
  const browser=await chromium.launch();
  const page=await browser.newPage();
  fs.rmSync(OUT,{recursive:true,force:true});
  fs.mkdirSync(OUT,{recursive:true});
  const variants=[],allPoints=[];
  // L'original (déjà détouré) compte dans l'enveloppe.
  const original=await keyImage(page,ORIGINAL,false);
  allPoints.push(...original.pts.map(([x,y])=>[x+ORIGINAL_BOX[0],y+ORIGINAL_BOX[1]]));
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"tavern-png-"));
  for(const file of files){
    const r=await keyImage(page,file,true);
    if(!r||r.w!==SCENE.width||r.h!==SCENE.height){ console.warn("ignorée (taille ou image vide) :",path.basename(file)); continue; }
    let key=variantKey(file),n=2;
    while(variants.some(v=>v.key===key)) key=variantKey(file)+"-"+n++;
    const png=path.join(tmp,key+".png");
    fs.writeFileSync(png,Buffer.from(r.png.split(",")[1],"base64"));
    execFileSync("convert",[png,"-strip","-quality","88","-define","webp:alpha-quality=100","-define","webp:method=6",path.join(OUT,key+".webp")]);
    variants.push({key,box:r.box});
    allPoints.push(...r.pts);
  }
  await browser.close();
  const zone=hull(allPoints);
  const text=`"use strict";

// Les variantes du tavernier (Idan, 2026-11-14), écrites par scripts/build-tavern.js : ne pas modifier à la main.
// Images : assets/taverne/taverniers/<key>.webp ; box : [x, y, largeur, hauteur] dans la taverne (1376 × 768) ;
// TAVERN_TAVERNIER_HULL : l'enveloppe de tous les taverniers, l'original compris (où le pointeur est capté).
const TAVERN_TAVERNIERS=${JSON.stringify(variants)};
const TAVERN_TAVERNIER_HULL=${JSON.stringify(zone)};
if(typeof module!=="undefined") module.exports={TAVERN_TAVERNIERS,TAVERN_TAVERNIER_HULL};
`;
  fs.writeFileSync(DATA,text);
  console.log(variants.length+" taverniers : "+variants.map(v=>v.key).join(", "));
}

if(require.main===module) main().catch(error=>{ console.error(error); process.exit(1); });
module.exports={variantKey,hull};
