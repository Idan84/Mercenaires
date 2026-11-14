#!/usr/bin/env node
"use strict";

// La Taverne en calques (Idan, 2026-11-14), fabriquée depuis ses images : media/background/Taverne/ sur Hostinger
// (liste : api/background.php), toutes sur un fond uni (vert, magenta…) à la taille de la taverne, chaque élément à sa
// place — le décor vide (BG_EMPTY), les ombres des clients (Shadow, sur fond blanc), le tableau des primes, le menu, les
// deux tables, la trappe, le tavernier, les tonneaux du premier plan ; et des variantes, tirées au sort à chaque entrée dans
// la taverne : « Alternate tavernier/ » (« au chargement de la taverne, on charge une image au hasard du tavernier ») et
// « Alternate table 1/ », « Alternate table 2/ » (Idan : « L'idée, c'est des variantes. Mais ces tables sont plus grandes
// que la table 1, il faut rétrécir et remplacer »). Le repère du jeu reste 1376 × 768 : une image plus grande (haute définition) garde ses pixels,
// son cadre est ramené à ce repère. La qualité avant le poids, mais une page qui charge (Idan : « l'idée c'est de faire un
// jeu Unreal, pas de gagner sur Google Speed » ; « Faut quand même qu'on puisse charger la page ! »). Ce script :
// - détoure chaque calque (keyImage : la couleur du fond, l'intérieur des personnages intact, les bords nettoyés) ;
// - le recadre sur ce qu'il montre et l'écrit en WebP qualité 95 (l'encodeur de Chromium : ImageMagick ignorait la
//   qualité) dans prototype-web/assets/taverne/ ; les variantes dans taverniers/ et table1/ ;
// - ne garde d'une variante que ce qui touche la place du calque d'origine (Jean-Mi laisse parfois un « truc bizarre »
//   ailleurs dans l'image : une bande de couleur, une tache) ;
// - réduit chaque variante d'une table à la largeur de la table d'origine, ses pieds au même endroit ;
// - assemble le décor avec les ombres des clients, floutées et coupées avant le comptoir (fond.webp) ;
// - calcule où chaque zone capte le pointeur (l'enveloppe de chaque calque et de toutes ses variantes) ;
// - écrit prototype-web/tavern-layers.js, lu par la taverne (tavern-scene-ui.js).
// Usage : node scripts/build-tavern.js            (télécharge les images depuis le site)
//         node scripts/build-tavern.js --from DIR (DIR a la même arborescence que media/background/Taverne)
// Nécessite Playwright (détourage, mesures, WebP) et ImageMagick (identify ; convert pour les ombres).
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
// La qualité des WebP (0 à 1) : sans différence visible avec l'original, quatre fois plus léger que sans perte.
const WEBP_QUALITY=0.95;
// Le détourage, sur la « dominance » de la couleur du fond (ses canaux forts moins ses canaux faibles : le vert moins le
// plus fort du rouge et du bleu, pour un fond vert) :
// - lo / hi : opaque en dessous, transparent au-dessus (le fond en a ~220, les personnages moins de ~50) ;
// - ring : la bande du bord (en pixels de l'image), où la part du fond mêlée à la couleur est retirée par le calcul du
//   mélange, entre ringLo et ringHi (plus strict : Jean-Mi laisse un léger halo clair autour des personnages) ;
// - near : autour du bord, la couleur propre de l'objet (la dominance moyenne de ses pixels opaques) : le bord n'est pas
//   plus coloré que lui, à edge près (un reflet vert sur du brun disparaît ; une cape verte garde son vert).
const KEY={lo:50,hi:195,ring:3,ringLo:0,ringHi:110,near:7,edge:10};
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
// Les variantes : leur dossier sur Hostinger, leur dossier dans le jeu ; fit : à la largeur et aux pieds du calque
// d'origine (les tables d'Idan sont plus grandes que la Table 1).
const VARIANT_SETS=[
  {layer:"tavernier",dir:/^alternate tavernier$/i,out:"taverniers"},
  {layer:"table1",dir:/^alternate table ?1$/i,out:"table1",fit:true},
  {layer:"table2",dir:/^alternate table ?2$/i,out:"table2",fit:true}
];
const BACKGROUND=/bg_?empty/i,SHADOW=/shadow/i;
// Les ombres des clients (Idan, 2026-11-14 : « Il faut couper l'image à peu près à la moitié (elle passe devant le
// comptoir, alors qu'elle devrait pas...) Et faut vraiment la flouter beaucoup pour qu'elle soit raccord avec les orcs ou
// les nains ») : floutées (blur, en part de la largeur), puis effacées à droite de la moitié (en fondu de cutFrom à cutTo).
const SHADOW_EDIT={blur:0.015,cutFrom:0.46,cutTo:0.52};

// Le nom d'une variante, tiré du fichier : « Dwarf_tavern_keeper_holding_ale_ab54f84f.jpg » → « holding-ale » ; une
// version haute définition (« …_a43b3db4_2K.jpg ») porte le même nom que l'autre.
function variantKey(file){
  return path.basename(file).replace(/\.[^.]+$/,"").replace(/_2K$/i,"").replace(/_[0-9a-f]{8}$/i,"").replace(/…/g,"")
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

// Le détourage, sur les pixels RGBA d (modifiés sur place) d'une image w × h. Exporté pour les tests (keyPixels) ; le
// navigateur l'exécute tel quel (sa source y est envoyée).
function keyPixels(d,w,h,key){
  // La couleur du fond : la médiane du pourtour de l'image ; ses canaux forts (D) et faibles (O).
  const border=[];
  for(let x=0;x<w;x+=2) for(const y of [0,h-1]) border.push((y*w+x)*4);
  for(let y=0;y<h;y+=2) for(const x of [0,w-1]) border.push((y*w+x)*4);
  const med=k=>border.map(i=>d[i+k]).sort((a,b)=>a-b)[border.length>>1];
  const K=[med(0),med(1),med(2)];
  const D=[0,1,2].filter(k=>K[k]>=128),O=[0,1,2].filter(k=>K[k]<128);
  if(!D.length||!O.length) throw new Error("Fond introuvable (ni vert, ni magenta, ni autre couleur vive) : "+K);
  const dom=(r,g,b)=>{ const c=[r,g,b]; let lo=255,hi=0; for(const k of D) lo=Math.min(lo,c[k]); for(const k of O) hi=Math.max(hi,c[k]); return lo-hi; };
  const hi=Math.min(key.hi,dom(...K)-15),n=w*h;
  const m=new Int16Array(n);
  for(let p=0;p<n;p++) m[p]=dom(d[p*4],d[p*4+1],d[p*4+2]);
  // La bande du bord : à moins de key.ring pixels d'un pixel qui tient du fond (dilatation en deux passes).
  const soft=new Uint8Array(n),row=new Uint8Array(n),ring=new Uint8Array(n),R=key.ring;
  for(let p=0;p<n;p++) soft[p]=m[p]>key.lo?1:0;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    let v=0;
    for(let k=Math.max(0,x-R);k<=Math.min(w-1,x+R)&&!v;k++) v=soft[y*w+k];
    row[y*w+x]=v;
  }
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    let v=0;
    for(let k=Math.max(0,y-R);k<=Math.min(h-1,y+R)&&!v;k++) v=row[k*w+x];
    ring[y*w+x]=v;
  }
  // La couleur propre de l'objet autour du bord : la dominance moyenne des pixels opaques hors de la bande (image intégrale).
  const W1=w+1,sumD=new Float64Array(W1*(h+1)),sumN=new Float64Array(W1*(h+1)),N=key.near;
  for(let y=0;y<h;y++){
    let rd=0,rn=0;
    for(let x=0;x<w;x++){
      const p=y*w+x;
      if(!ring[p]&&m[p]<=key.lo){ rd+=m[p]; rn++; }
      sumD[(y+1)*W1+x+1]=sumD[y*W1+x+1]+rd;
      sumN[(y+1)*W1+x+1]=sumN[y*W1+x+1]+rn;
    }
  }
  const box=(t,x0,y0,x1,y1)=>t[y1*W1+x1]-t[y1*W1+x0]-t[y0*W1+x1]+t[y0*W1+x0];
  for(let p=0;p<n;p++){
    const i=p*4;
    if(!ring[p]){ d[i+3]=m[p]<=key.lo?255:m[p]>=hi?0:Math.round(255*(hi-m[p])/(hi-key.lo)); continue; }
    const x=p%w,y=(p-x)/w,x0=Math.max(0,x-N),y0=Math.max(0,y-N),x1=Math.min(w,x+N+1),y1=Math.min(h,y+N+1);
    const cnt=box(sumN,x0,y0,x1,y1),ref=cnt?box(sumD,x0,y0,x1,y1)/cnt:0;
    const lo=Math.max(key.ringLo,Math.min(key.lo,ref+15)),top=Math.max(key.ringHi,lo+60);
    let a=m[p]<=lo?1:m[p]>=top?0:(top-m[p])/(top-lo);
    let c=[d[i],d[i+1],d[i+2]];
    // Le calcul du mélange : C = α·F + (1 − α)·K, donc F = (C − (1 − α)·K) / α.
    if(a>0&&a<1) c=c.map((v,k)=>Math.max(0,Math.min(255,(v-(1-a)*K[k])/a)));
    if(a>0){
      const spill=dom(...c)-Math.max(ref,-40)-key.edge;
      if(spill>0) for(const k of D) c[k]=Math.max(0,c[k]-spill);
    }
    // Le bord, resserré : ses pixels à demi transparents le sont un peu plus (pas de liseré).
    if(a>0&&a<1) a=a*a;
    d[i]=Math.round(c[0]);d[i+1]=Math.round(c[1]);d[i+2]=Math.round(c[2]);d[i+3]=Math.round(255*a);
  }
  return {K,D};
}

// Dans le navigateur : détourage, cadre de ce que montre le calque, points du contour (gauche et droite de chaque ligne),
// WebP recadré. Le tout ramené au repère de la taverne (scale : largeur de l'image ÷ 1376). keep : [x, y, largeur,
// hauteur] du calque d'origine : seuls les morceaux (d'un seul tenant) qui touchent ce cadre sont gardés ; fit : la
// variante en prend la largeur, ses pieds au même endroit.
async function keyImage(page,file,{keep=null,fit=null}={}){
  const src="data:image/"+(/\.png$/i.test(file)?"png":/\.webp$/i.test(file)?"webp":"jpeg")+";base64,"+fs.readFileSync(file).toString("base64");
  return page.evaluate(async({src,keySource,key,sceneWidth,keep,fit,quality})=>{
    const keyPixels=new Function("return "+keySource)();
    const img=new Image();
    img.src=src;
    await img.decode();
    const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement("canvas");
    c.width=w;c.height=h;
    const g=c.getContext("2d",{willReadFrequently:true});
    g.drawImage(img,0,0);
    const im=g.getImageData(0,0,w,h),d=im.data;
    const screen=keyPixels(d,w,h,key);
    const s=w/sceneWidth,step=Math.max(1,Math.round(s));
    if(keep){
      // Les morceaux d'un seul tenant (pixels pas tout à fait transparents, 8 voisins) ; on efface ceux qui ne touchent
      // pas le cadre du calque d'origine.
      const n=w*h,label=new Int32Array(n).fill(-1),stack=new Int32Array(n),kept=[];
      const kx0=keep[0]*s,ky0=keep[1]*s,kx1=(keep[0]+keep[2])*s,ky1=(keep[1]+keep[3])*s;
      for(let p0=0,id=0;p0<n;p0++){
        if(label[p0]>=0||!d[p0*4+3]) continue;
        let sp=0,touches=false;
        stack[sp++]=p0;label[p0]=id;
        while(sp){
          const p=stack[--sp],x=p%w,y=(p-x)/w;
          if(x>=kx0&&x<kx1&&y>=ky0&&y<ky1) touches=true;
          for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
            const xx=x+dx,yy=y+dy;
            if(xx<0||yy<0||xx>=w||yy>=h) continue;
            const q=yy*w+xx;
            if(label[q]<0&&d[q*4+3]){ label[q]=id; stack[sp++]=q; }
          }
        }
        kept[id++]=touches;
      }
      for(let p=0;p<n;p++) if(label[p]>=0&&!kept[label[p]]) d[p*4+3]=0;
    }
    g.putImageData(im,0,0);
    let x0=w,y0=h,x1=-1,y1=-1;let pts=[];
    for(let y=0;y<h;y++){
      let l=-1,r=-1;
      for(let x=0;x<w;x++) if(d[(y*w+x)*4+3]>40){ if(l<0) l=x; r=x; }
      if(l<0) continue;
      if(y%step===0) pts.push([l/s,y/s],[(r+1)/s,y/s],[l/s,(y+step)/s],[(r+1)/s,(y+step)/s]);
      x0=Math.min(x0,l);x1=Math.max(x1,r+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);
    }
    if(x1<0) return null;
    let out=document.createElement("canvas");
    out.width=x1-x0;out.height=y1-y0;
    out.getContext("2d").drawImage(c,x0,y0,out.width,out.height,0,0,out.width,out.height);
    let box=[x0/s,y0/s,(x1-x0)/s,(y1-y0)/s];
    if(fit){
      const k=fit[2]/box[2],to=[fit[0],fit[1]+fit[3]-box[3]*k,fit[2],box[3]*k];
      pts=pts.map(([px,py])=>[to[0]+(px-box[0])*k,to[1]+(py-box[1])*k]);
      const small=document.createElement("canvas");
      small.width=Math.max(1,Math.round(out.width*k));small.height=Math.max(1,Math.round(out.height*k));
      const sg=small.getContext("2d");
      sg.imageSmoothingQuality="high";
      sg.drawImage(out,0,0,small.width,small.height);
      out=small;box=to;
    }
    return {w,h,scale:s,box,pts,screen,webp:out.toDataURL("image/webp",quality)};
  },{src,keySource:keyPixels.toString(),key:KEY,sceneWidth:SCENE.width,keep,fit,quality:WEBP_QUALITY});
}

// Un PNG en WebP, avec l'encodeur de Chromium.
async function encodeWebp(page,file){
  const src="data:image/png;base64,"+fs.readFileSync(file).toString("base64");
  return page.evaluate(async({src,quality})=>{
    const img=new Image();
    img.src=src;
    await img.decode();
    const c=document.createElement("canvas");
    c.width=img.naturalWidth;c.height=img.naturalHeight;
    c.getContext("2d").drawImage(img,0,0);
    return c.toDataURL("image/webp",quality);
  },{src,quality:WEBP_QUALITY});
}
const writeWebp=(dataUrl,dest)=>fs.writeFileSync(dest,Buffer.from(dataUrl.split(",")[1],"base64"));

async function main(){
  const args=process.argv.slice(2);
  const from=args.includes("--from")?path.resolve(args[args.indexOf("--from")+1]):download();
  const images=dir=>fs.readdirSync(dir).filter(f=>/\.(png|jpe?g|webp)$/i.test(f)).sort().map(f=>path.join(dir,f));
  // Une image en plusieurs tailles (« BG_EMPTY…_2K.jpg » à côté de « BG_EMPTY….jpg ») : la plus grande.
  const sizeOf=file=>execFileSync("identify",["-format","%w %h",file],{encoding:"utf8"}).trim().split(" ").map(Number);
  const files=images(from);
  const find=re=>files.filter(f=>re.test(path.basename(f))).map(f=>({f,w:sizeOf(f)[0]})).sort((a,b)=>b.w-a.w)[0]?.f;
  const background=find(BACKGROUND);
  if(!background) throw new Error("Pas de décor vide (BG_EMPTY) dans "+from);
  const [bw,bh]=sizeOf(background);
  if(Math.abs(bw/bh-SCENE.width/SCENE.height)>0.01) throw new Error(`Le décor n'est pas au format de la taverne : ${bw} × ${bh}`);
  const {chromium}=require("playwright");
  const browser=await chromium.launch();
  const page=await browser.newPage();
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"tavern-png-"));
  fs.mkdirSync(OUT,{recursive:true});
  // Chaque image a sa taille (Idan les passe en haute définition une à une) : au format de la taverne.
  const sameFormat=r=>r&&Math.abs(r.h/r.w-SCENE.height/SCENE.width)<0.01;
  // Le décor vide, assombri par les ombres des clients (sur fond blanc : « multiply »), à sa taille ; les ombres floutées
  // et coupées avant le comptoir (SHADOW_EDIT).
  const shadow=find(SHADOW),fondPng=path.join(tmp,"fond.png"),{blur,cutFrom,cutTo}=SHADOW_EDIT;
  const soft=["-resize",`${bw}x${bh}!`,"-blur",`0x${Math.round(blur*bw)}`,
    "-fx",`i<w*${cutFrom} ? u : i>w*${cutTo} ? 1 : u+(1-u)*(i-w*${cutFrom})/(w*${round2(cutTo-cutFrom)})`];
  execFileSync("convert",shadow?[background,"(",shadow,...soft,")","-compose","multiply","-composite",fondPng]:[background,fondPng]);
  writeWebp(await encodeWebp(page,fondPng),path.join(OUT,"fond.webp"));
  // L'ancienne image complète (le fond des autres salles, remplacé par le décor en calques) n'existe plus.
  fs.rmSync(path.join(OUT,"taverne.webp"),{force:true});
  // Les calques.
  const layers={},zonePoints={};
  for(const L of LAYERS){
    const file=find(L.match);
    if(!file) throw new Error("Calque introuvable : "+L.key);
    const r=await keyImage(page,file);
    if(!sameFormat(r)) throw new Error(`${path.basename(file)} : pas au format de la taverne (${r?.w} × ${r?.h})`);
    writeWebp(r.webp,path.join(OUT,L.key+".webp"));
    layers[L.key]=r.box.map(round2);
    if(L.zone) (zonePoints[L.zone]||(zonePoints[L.zone]=[])).push({key:L.key,pts:r.pts});
  }
  // Les variantes : une par nom (la plus grande des versions), détourées de même ; leurs contours s'ajoutent à
  // l'enveloppe de leur calque.
  const variants={};
  for(const set of VARIANT_SETS){
    const list=variants[set.layer]=[];
    const out=path.join(OUT,set.out);
    fs.rmSync(out,{recursive:true,force:true});
    fs.mkdirSync(out,{recursive:true});
    const dir=fs.readdirSync(from).find(d=>set.dir.test(d)&&fs.statSync(path.join(from,d)).isDirectory());
    const byKey=new Map();
    for(const file of dir?images(path.join(from,dir)):[]){
      const key=variantKey(file),w=sizeOf(file)[0];
      if(!byKey.has(key)||byKey.get(key).w<w) byKey.set(key,{file,w});
    }
    const target=zonePoints[LAYERS.find(L=>L.key===set.layer).zone].find(x=>x.key===set.layer);
    for(const [key,{file}] of byKey){
      const r=await keyImage(page,file,{keep:layers[set.layer],fit:set.fit?layers[set.layer]:null});
      if(!sameFormat(r)){ console.warn("ignorée (format ou image vide) :",path.basename(file)); continue; }
      writeWebp(r.webp,path.join(out,key+".webp"));
      list.push({key,src:set.out+"/"+key+".webp",box:r.box.map(round2)});
      target.pts.push(...r.pts);
    }
  }
  await browser.close();
  // Où chaque zone capte le pointeur : une enveloppe par calque, variantes comprises.
  const hulls=Object.fromEntries(Object.entries(zonePoints).map(([zone,list])=>[zone,list.map(x=>hull(x.pts))]));
  const text=`"use strict";

// La Taverne en calques (Idan, 2026-11-14), écrite par scripts/build-tavern.js : ne pas modifier à la main.
// Images : assets/taverne/<calque>.webp et les variantes (taverniers/, table1/, table2/), à la taille des images d'Idan (décor :
// ${bw} × ${bh}) ; les cadres [x, y, largeur, hauteur] et les enveloppes sont dans le repère de la taverne
// (${SCENE.width} × ${SCENE.height}).
const TAVERN_SOURCE_SIZE=${JSON.stringify({width:bw,height:bh})};
const TAVERN_LAYER_BOXES=${JSON.stringify(layers)};
const TAVERN_ZONE_HULLS=${JSON.stringify(hulls)};
const TAVERN_VARIANTS=${JSON.stringify(variants)};
if(typeof module!=="undefined") module.exports={TAVERN_SOURCE_SIZE,TAVERN_LAYER_BOXES,TAVERN_ZONE_HULLS,TAVERN_VARIANTS};
`;
  fs.writeFileSync(DATA,text);
  console.log(`Taverne ${bw} × ${bh} : ${Object.keys(layers).length} calques ; `
    +Object.entries(variants).map(([k,list])=>`${list.length} variantes de ${k} (${list.map(v=>v.key).join(", ")})`).join(" ; "));
}

if(require.main===module) main().catch(error=>{ console.error(error); process.exit(1); });
module.exports={variantKey,hull,keyPixels,KEY,SHADOW_EDIT};
