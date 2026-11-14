#!/usr/bin/env node
"use strict";

// Barres du haut par culture (Idan, 2026-11-13) : Idan dépose un pack par culture du capitaine sur Hostinger, dans
// media/hud-pack/<Peuple>/<culture>/ (left, center, right, full ; 32 packs, qui arrivent petit à petit ; liste :
// api/hud-pack.php). Ce script :
// - reconnaît la culture de chaque pack (le dossier du peuple, puis les mots du dossier : « Humains/nordique » =
//   Montagnes du Nord ; quelques cas fixés dans PACK_CULTURE) ;
// - mesure le pack : hauteur commune, largeur des trois morceaux ; dans le milieu, le cadre (haut, bas) et la bande sombre
//   où le jeu écrit (haut, bas) ; dans les embouts, où la bande commence (à gauche) et où elle s'arrête (à droite) ;
// - convertit left, center et right en WebP dans prototype-web/assets/hud/barres/<culture>/ (le full ne sert qu'à Idan) ;
// - l'anneau du centre de la barre du bas (ornement_central, Idan, 2026-11-14), s'il est dans le pack : WebP (ornement.webp,
//   800 px de large au plus) et mesures (trou où se loge le bouton Jour suivant, étendue de l'image) ;
// - le bouton Jour suivant (media/hud-pack/next.png, commun à toutes les cultures) : recadré sur son disque, en WebP
//   (prototype-web/assets/hud/next.webp) ;
// - les six pictos des lieux de la barre du bas (Idan, 2026-11-14 : media/hud-pack/<nom>-1.png à -6.png, communs à toutes
//   les cultures) : recadrés comme dans l'Atelier des barres, en WebP (prototype-web/assets/hud/pictos-bas/<lieu>.webp) ;
// - applique les réglages d'Idan par culture (scripts/hud-bars-reglages.json, exportés de l'Atelier des barres) : la
//   barre du haut et la barre du bas de chaque culture, calculées en bandes B (voir topLayout et bottomLayout) ;
// - écrit prototype-web/hud-bars.js, la liste des barres et leurs mesures, lue par les deux barres du camp (screen-ui.js).
// Usage : node scripts/build-hud-bars.js            (télécharge les packs depuis le site)
//         node scripts/build-hud-bars.js --from DIR (DIR a la même arborescence que media/hud-pack)
// Nécessite Playwright (mesures) et ImageMagick (convert, pour le WebP).
const fs=require("fs");
const os=require("os");
const path=require("path");
const {execFileSync}=require("child_process");

const ROOT=path.resolve(__dirname,"..");
const SITE="https://bloodandwages.idanwizen.com";
const OUT=path.join(ROOT,"prototype-web","assets","hud","barres");
const DATA=path.join(ROOT,"prototype-web","hud-bars.js");
const NEXT_OUT=path.join(ROOT,"prototype-web","assets","hud","next.webp");
const PIECES=["left","center","right"];
const ORNAMENT_MAX_WIDTH=800;
// Le bouton Jour suivant : un carré de 1,12 fois le diamètre du disque, centré sur lui (voir NEXT_DISC dans styles.css).
const NEXT_MARGIN=1.12,NEXT_SIZE=320;
// Les pictos des lieux : <nom>-<n>.png à la racine du dossier, dans l'ordre de leurs numéros (Idan). Chacun est recadré sur
// le carré central de PICTO_CROP de son côté (les six sont dessinés à la même échelle, sur la même toile).
const PICTOS_OUT=path.join(ROOT,"prototype-web","assets","hud","pictos-bas");
const BOTTOM_PICTOS=["chateau","taverne","dortoir","marchand","intendance","construction"];
const PICTO_CROP=960/1254,PICTO_SIZE=200;
// Les réglages par culture (Atelier des barres) ; une culture sans réglage prend ceux de départ de l'atelier.
const SETTINGS=path.join(__dirname,"hud-bars-reglages.json");
const DEFAULT_SETTINGS={
  version:"v1",
  haut:{barre:100,embout:100,contenu:100,fonds:.54,margeMenu:.6,haut:.3},
  bas:{ligne:1.2,rogner:0,decalage:0,bouton:1.54,anneau:100,pictoTaille:.85,pictoEcart:.3,pictoAnneau:.3,pictoHaut:.03}
};
const STOPWORDS=new Set(["de","d","des","du","la","le","l","les","a","et"]);
// Packs dont le dossier ne suffit pas à trouver la culture : chacun est la seule culture de son peuple restée sans pack.
const PACK_CULTURE={
  "Gobelins/gobelins-cavernes-ferrailleurs":"Caravanes de ferrailleurs",
  "Elfes/elfes-solaires":"Elfes des grandes cités",
  "Nains/nains-fer-entrave":"Nains esclaves",
  "Halflings/halflings-villes":"Halflings des cités humaines",
  "Ogres/ogres-villes":"Ogres des cités humaines",
  "Reptiliens/reptiliens-marais":"Reptiliens des marécages",
  "Hommes Betes/hommes-betes-runiques":"Tribus nordiques"
};
const TOKEN_ALIASES={orque:"orc"};

function plain(name){
  return String(name).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
}
// Même calcul que pictoSlug (prototype-web/picto-ui.js).
function slug(name){
  return plain(name).replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
function tokens(name){
  return plain(name).split(/[^a-z0-9]+/).filter(t=>t&&!STOPWORDS.has(t))
    .map(t=>t.length>3?t.replace(/[sx]$/,""):t).map(t=>TOKEN_ALIASES[t]||t);
}
const sameWord=(a,b)=>a===b||(Math.min(a.length,b.length)>=4&&(a.startsWith(b)||b.startsWith(a)));

// La culture d'un pack « Peuple/dossier » : parmi les cultures du peuple, celle qui partage le plus de mots avec le dossier.
function cultureOfPack(pack,cultures){
  if(PACK_CULTURE[pack]) return cultures.find(c=>c.nom===PACK_CULTURE[pack])||null;
  const [peopleDir,folder]=pack.split("/");
  const people=tokens(peopleDir).join(" ");
  const own=cultures.filter(c=>[].concat(c.peuples||[]).some(p=>tokens(p).join(" ")===people));
  const words=tokens(folder).filter(t=>t!==people);
  const scored=own.map(c=>({c,score:tokens(c.nom).filter(t=>t!==people&&words.some(w=>sameWord(w,t))).length}))
    .filter(s=>s.score>0).sort((a,b)=>b.score-a.score);
  if(!scored.length||(scored[1]&&scored[1].score===scored[0].score)) return null;
  return scored[0].c;
}

// Les packs d'un dossier : chaque sous-dossier qui a ses trois morceaux. Un sous-dossier v2, v3… d'un pack est une autre
// version de sa barre (Idan, 2026-11-14 : « un v2 pour toute la barre ») : versions.v2 = ses morceaux, l'anneau du pack
// s'il n'en a pas ; la version v1 est le pack lui-même.
function findPacks(dir){
  const found=new Map();
  const walk=rel=>{
    const abs=path.join(dir,rel);
    const files=fs.readdirSync(abs,{withFileTypes:true});
    const pieces={};
    for(const f of files){
      if(f.isDirectory()){walk(path.join(rel,f.name));continue;}
      const m=f.name.match(/^(left|center|right|ornement_central)\.(png|webp)$/i);
      if(m) pieces[m[1].toLowerCase()]=path.join(abs,f.name);
    }
    if(PIECES.every(p=>pieces[p])) found.set(rel.split(path.sep).join("/"),pieces);
  };
  walk("");
  const packs=[];
  for(const [rel,pieces] of found){
    const m=rel.match(/^(.+)\/(v\d+)$/i);
    if(m&&found.has(m[1])) continue;
    const versions={v1:pieces};
    for(const [other,more] of found){
      const v=other.startsWith(rel+"/")&&other.slice(rel.length+1).match(/^v\d+$/i);
      if(v) versions[v[0].toLowerCase()]={ornement_central:pieces.ornement_central,...more};
    }
    packs.push({pack:rel,pieces,versions});
  }
  return packs.sort((a,b)=>a.pack.localeCompare(b.pack));
}

// Téléchargement depuis le site (la liste vient d'api/hud-pack.php).
function download(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hud-pack-"));
  const index=JSON.parse(execFileSync("curl",["-sf",SITE+"/api/hud-pack.php"],{encoding:"utf8"}));
  for(const f of index.files){
    if(!/\/(left|center|right|ornement_central)\.\w+$/i.test(f.path)&&!/^next\.png$/i.test(f.path)&&!/^[^/]+-\d\.png$/i.test(f.path)) continue;
    const dest=path.join(dir,...f.path.split("/"));
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    execFileSync("curl",["-sf","-o",dest,SITE+"/"+index.base+"/"+f.path.split("/").map(encodeURIComponent).join("/")]);
  }
  return dir;
}

// Mesures, dans le navigateur (lecture des pixels).
async function measure(page,pieces){
  const data=Object.fromEntries(PIECES.map(p=>[p,"data:image/png;base64,"+fs.readFileSync(pieces[p]).toString("base64")]));
  return page.evaluate(async data=>{
    const load=async src=>{const i=new Image();i.src=src;await i.decode();const c=document.createElement("canvas");c.width=i.width;c.height=i.height;
      const g=c.getContext("2d");g.drawImage(i,0,0);return {w:i.width,h:i.height,d:g.getImageData(0,0,i.width,i.height).data};};
    const L=await load(data.left),C=await load(data.center),R=await load(data.right);
    const px=(im,x,y)=>{const i=(y*im.w+x)*4;return [im.d[i],im.d[i+1],im.d[i+2],im.d[i+3]];};
    const lum=a=>0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
    const median=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
    const cols=[];for(let x=4;x<C.w-4;x+=6)cols.push(x);
    // Cadre : premières et dernières lignes opaques du milieu (médiane sur les colonnes).
    const frameTop=median(cols.map(x=>{for(let y=0;y<C.h;y++)if(px(C,x,y)[3]>160)return y;return C.h;}));
    const frameBottom=median(cols.map(x=>{for(let y=C.h-1;y>=0;y--)if(px(C,x,y)[3]>160)return y;return 0;}));
    // Bande sombre : autour du milieu du cadre, les lignes qui restent proches du fond de la bande.
    const rowLum=[];for(let y=0;y<C.h;y++)rowLum.push(median(cols.map(x=>{const a=px(C,x,y);return a[3]>160?lum(a):255;})));
    const mid=Math.round((frameTop+frameBottom)/2);
    let base=Infinity;for(let y=mid-8;y<=mid+8;y++)base=Math.min(base,rowLum[y]);
    const lim=base+28;let bandTop=mid,bandBottom=mid;
    while(bandTop>frameTop&&rowLum[bandTop-1]<=lim)bandTop--;
    while(bandBottom<frameBottom&&rowLum[bandBottom+1]<=lim)bandBottom++;
    // Dans les embouts, sur le milieu de la bande : où elle commence (gauche) et où elle s'arrête (droite).
    const ym=Math.round((bandTop+bandBottom)/2),rows=[-6,-3,0,3,6].map(d=>ym+d);
    const dark=a=>a[3]>=160&&lum(a)<=lim+12;
    const bandLeft=median(rows.map(y=>{let x=L.w-1;while(x>0&&dark(px(L,x,y)))x--;return x+1;}));
    const bandEnd=median(rows.map(y=>{let x=0;while(x<R.w-1&&dark(px(R,x,y)))x++;return x;}));
    return {h:C.h,heights:[L.h,C.h,R.h],left:L.w,center:C.w,right:R.w,frameTop,frameBottom,bandTop,bandBottom,bandLeft,bandRight:R.w-bandEnd};
  },data);
}

// L'anneau du centre de la barre du bas : son trou (les pixels transparents reliés au centre de l'image, où se loge le
// bouton Jour suivant : centre et diamètre) et l'étendue de ses pixels opaques. Mesures en pixels de l'image d'origine.
async function measureOrnament(page,file){
  const src="data:image/png;base64,"+fs.readFileSync(file).toString("base64");
  return page.evaluate(async src=>{
    const i=new Image();i.src=src;await i.decode();
    const w=i.width,h=i.height,c=document.createElement("canvas");c.width=w;c.height=h;
    const g=c.getContext("2d");g.drawImage(i,0,0);const d=g.getImageData(0,0,w,h).data;
    const opaque=(x,y)=>d[(y*w+x)*4+3]>=128;
    let x0=w,y0=h,x1=-1,y1=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(opaque(x,y)){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
    const sx=Math.floor(w/2),sy=Math.floor(h/2);
    if(opaque(sx,sy)) return {w,h,error:"le centre de l'image n'est pas dans le trou de l'anneau"};
    const seen=new Uint8Array(w*h),stack=[sx,sy];seen[sy*w+sx]=1;
    let hx0=sx,hx1=sx,hy0=sy,hy1=sy,open=false;
    while(stack.length){
      const y=stack.pop(),x=stack.pop();
      if(x<hx0)hx0=x;if(x>hx1)hx1=x;if(y<hy0)hy0=y;if(y>hy1)hy1=y;
      if(x===0||y===0||x===w-1||y===h-1){open=true;break;}
      for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){
        const k=ny*w+nx;
        if(!seen[k]&&!opaque(nx,ny)){seen[k]=1;stack.push(nx,ny);}
      }
    }
    if(open) return {w,h,error:"le trou de l'anneau n'est pas fermé"};
    return {w,h,cx:(hx0+hx1+1)/2,cy:(hy0+hy1+1)/2,hole:(hx1-hx0+hy1-hy0+2)/2,x0,y0,x1:x1+1,y1:y1+1};
  },src);
}

// Le bouton Jour suivant : un carré centré sur son disque (pixels opaques), de NEXT_MARGIN fois sa largeur.
function buildNextButton(file){
  const box=execFileSync("convert",[file,"-alpha","extract","-threshold","50%","-format","%@","info:"],{encoding:"utf8"}).trim();
  const [,bw,bh,bx,by]=box.match(/^(\d+)x(\d+)\+(\d+)\+(\d+)$/).map(Number);
  const side=Math.round(bw*NEXT_MARGIN),cx=bx+bw/2,cy=by+bh/2;
  const left=Math.round(cx-side/2),top=Math.round(cy-side/2);
  fs.mkdirSync(path.dirname(NEXT_OUT),{recursive:true});
  execFileSync("convert",[file,"-background","none","-extent",`${side}x${side}${left>=0?"+":""}${left}${top>=0?"+":""}${top}`,
    "-resize",`${NEXT_SIZE}x${NEXT_SIZE}`,"-strip","-quality","90","-define","webp:alpha-quality=100","-define","webp:method=6",NEXT_OUT]);
  return {disc:[bw,bh],side};
}

// Le bord gauche de l'anneau, ligne par ligne : le premier pixel opaque de chaque ligne de l'image WebP (null : ligne vide).
async function ornamentProfile(page,file){
  const src="data:image/webp;base64,"+fs.readFileSync(file).toString("base64");
  return page.evaluate(async src=>{
    const i=new Image();i.src=src;await i.decode();
    const w=i.width,h=i.height,c=document.createElement("canvas");c.width=w;c.height=h;
    const g=c.getContext("2d");g.drawImage(i,0,0);const d=g.getImageData(0,0,w,h).data;
    const left=[];
    for(let y=0;y<h;y++){let x=0;while(x<w&&d[(y*w+x)*4+3]<=128)x++;left.push(x<w?x:null);}
    return {w,h,left};
  },src);
}

// Les pictos des lieux de la barre du bas : le carré central de chaque image, réduit, en WebP.
function buildPictos(dir){
  const built=[];
  for(const name of fs.readdirSync(dir)){
    const m=name.match(/-(\d)\.png$/i),key=m&&BOTTOM_PICTOS[Number(m[1])-1];
    if(!key) continue;
    const file=path.join(dir,name);
    const [w,h]=execFileSync("identify",["-format","%w %h",file],{encoding:"utf8"}).trim().split(" ").map(Number);
    const side=Math.round(Math.min(w,h)*PICTO_CROP);
    fs.mkdirSync(PICTOS_OUT,{recursive:true});
    execFileSync("convert",[file,"-crop",`${side}x${side}+${Math.round((w-side)/2)}+${Math.round((h-side)/2)}`,"+repage","-resize",`${PICTO_SIZE}x${PICTO_SIZE}`,
      "-strip","-quality","90","-define","webp:alpha-quality=100","-define","webp:method=6",path.join(PICTOS_OUT,key+".webp")]);
    built.push(key);
  }
  return BOTTOM_PICTOS.filter(k=>built.includes(k));
}

// Les réglages d'une culture, complétés par ceux de départ.
function settingsOf(all,key){
  const own=all[key]||{};
  return {version:own.version||DEFAULT_SETTINGS.version,haut:{...DEFAULT_SETTINGS.haut,...own.haut},bas:{...DEFAULT_SETTINGS.bas,...own.bas}};
}
const round4=v=>Math.round(v*1e4)/1e4;

// La barre du haut d'une culture : barre, sa taille (1 : la bande sombre fait B ; Idan, 2026-11-14 : « une barre plus
// fine ») ; embout, la largeur de son embout droit (1 : celle du dessin). Le reste en bandes de cette barre : top, l'écart
// entre le haut de l'écran et la bande sombre ; contenu, la taille du texte et des boutons (1 : celle de la maquette) ;
// fonds, la hauteur des pastilles ; marge, l'air à droite du bouton menu ; haut, l'écart entre le haut de l'écran et la
// barre (négatif : le haut de l'image passe au-dessus de l'écran).
function topLayout(bar,s){
  return {barre:s.barre/100,embout:s.embout/100,top:round4(s.haut+bar.bandTop/(bar.bandBottom-bar.bandTop)),haut:s.haut,
    contenu:s.contenu/100,fonds:s.fonds,marge:s.margeMenu};
}

// La barre du bas d'une culture, en bandes B, comme dans l'Atelier des barres (tout y est proportionnel à B) ; hauteurs
// au-dessus du bas de l'écran, distances depuis son milieu :
// - la ligne du haut de la barre (entre le haut du cadre et la bande sombre) à s.ligne ; sa bande sombre finit au bas de
//   l'écran (s.rogner pixels de l'image plus haut, pour cacher un bord qui remonte) : artBas et artHaut placent l'image ;
// - le bouton (s.bouton de diamètre, 600 px de l'image de l'anneau) et l'anneau (1600 × 800 px, s.anneau %) centrés au
//   milieu de l'écran, à centre (s.decalage pixels de l'image de l'anneau sous la ligne) ;
// - les six pictos (picto de côté, ecart entre eux), centrés dans la bande sombre (pictosY, relevés de s.pictoHaut),
//   rangés à gauche de l'anneau : leur bord droit (pictosDroite) à s.pictoAnneau du bord de l'anneau à leur hauteur (le
//   premier pixel opaque de ces lignes de l'image) ou du bouton s'il dépasse ;
// - hauteur : ce que la barre, le bouton et l'anneau occupent (les lieux du camp s'arrêtent au-dessus).
function bottomLayout(bar,s,profile){
  const line=(bar.frameTop+bar.bandTop)/2,bottom=bar.bandBottom-s.rogner;
  const k=s.ligne/(bottom-line);
  const unit=s.bouton/600;
  const centre=s.ligne-s.decalage*unit;
  const ringW=1600*unit*s.anneau/100,ringH=ringW/2,ringTop=centre+ringH/2;
  const picto=s.pictoTaille,pictosY=k*(bottom-bar.bandTop)/2-s.pictoHaut;
  const lo=pictosY-picto/2,hi=pictosY+picto/2;
  let edge=0;
  const R=s.bouton/2,dy=Math.max(0,lo-centre,centre-hi);
  if(dy<R) edge=Math.sqrt(R*R-dy*dy);
  let top=centre+s.bouton*NEXT_MARGIN/2;
  if(profile){
    const px=ringW/profile.w;
    const r0=Math.max(0,Math.floor((ringTop-hi)/px)),r1=Math.min(profile.h-1,Math.ceil((ringTop-lo)/px));
    for(let r=r0;r<=r1;r++) if(profile.left[r]!==null) edge=Math.max(edge,ringW/2-profile.left[r]*px);
    const first=profile.left.findIndex(x=>x!==null);
    if(first>=0) top=Math.max(top,ringTop-first*px);
  }
  if(!edge) edge=s.bouton*NEXT_MARGIN/2;
  return Object.fromEntries(Object.entries({artBas:s.ligne-k*(bar.h-line),artHaut:k*bar.h,centre,bouton:s.bouton,anneau:ringW,
    picto,ecart:s.pictoEcart,pictosDroite:edge+s.pictoAnneau,pictosY,hauteur:Math.max(s.ligne,top)}).map(([n,v])=>[n,round4(v)]));
}

async function main(){
  const args=process.argv.slice(2);
  const from=args.includes("--from")?path.resolve(args[args.indexOf("--from")+1]):download();
  console.log("Packs lus dans "+from);
  const cultures=JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference","cultures.json"),"utf8")).rows;
  const packs=findPacks(from);
  const settings=JSON.parse(fs.readFileSync(SETTINGS,"utf8")).cultures;
  const {chromium}=require("playwright");
  const browser=await chromium.launch();
  const page=await browser.newPage();
  await page.setContent("<body></body>");
  const bars={},problems=[];
  for(const {pack,versions} of packs){
    const culture=cultureOfPack(pack,cultures);
    if(!culture){problems.push(`${pack} : culture introuvable (à ajouter dans PACK_CULTURE)`);continue;}
    const key=slug(culture.nom);
    if(bars[key]){problems.push(`${pack} : ${culture.nom} a déjà le pack ${bars[key].pack}`);continue;}
    const own=settingsOf(settings,key);
    if(!settings[key]) problems.push(`${culture.nom} : pas de réglages dans hud-bars-reglages.json (ceux de départ de l'atelier)`);
    if(!versions[own.version]) problems.push(`${culture.nom} : pas de version ${own.version} dans ${pack} (la v1)`);
    const version=versions[own.version]?own.version:"v1",pieces=versions[version];
    const m=await measure(page,pieces);
    if(new Set(m.heights).size>1){problems.push(`${pack} : les trois morceaux n'ont pas la même hauteur (${m.heights.join(", ")})`);continue;}
    if(m.bandBottom-m.bandTop<20){problems.push(`${pack} : bande sombre introuvable`);continue;}
    const dir=path.join(OUT,key);
    fs.mkdirSync(dir,{recursive:true});
    for(const p of PIECES){
      execFileSync("convert",[pieces[p],"-strip","-quality","90","-define","webp:alpha-quality=100","-define","webp:method=6",path.join(dir,p+".webp")]);
    }
    delete m.heights;
    bars[key]={culture:culture.nom,pack,...(version==="v1"?{}:{version}),...m};
    bars[key].haut=topLayout(m,own.haut);
    if(pieces.ornement_central){
      const o=await measureOrnament(page,pieces.ornement_central);
      if(o.error){problems.push(`${pack} : ornement_central, ${o.error}`);continue;}
      // Réduit à 800 px de large au plus (assez pour la plus grande barre, sur un écran à double densité) ; mesures à
      // la même échelle que l'image WebP.
      const scale=Math.min(1,ORNAMENT_MAX_WIDTH/o.w),r=v=>Math.round(v*scale*10)/10;
      execFileSync("convert",[pieces.ornement_central,"-resize",`${Math.round(o.w*scale)}x${Math.round(o.h*scale)}!`,"-strip","-quality","90",
        "-define","webp:alpha-quality=100","-define","webp:method=6",path.join(dir,"ornement.webp")]);
      bars[key].ornament={w:Math.round(o.w*scale),h:Math.round(o.h*scale),cx:r(o.cx),cy:r(o.cy),hole:r(o.hole),x0:r(o.x0),y0:r(o.y0),x1:r(o.x1),y1:r(o.y1)};
      bars[key].bas=bottomLayout(m,own.bas,await ornamentProfile(page,path.join(dir,"ornement.webp")));
    }else{
      fs.rmSync(path.join(dir,"ornement.webp"),{force:true});
    }
  }
  await browser.close();
  const next=fs.existsSync(path.join(from,"next.png"))?buildNextButton(path.join(from,"next.png")):null;
  if(next) console.log(`Bouton Jour suivant : disque ${next.disc.join("×")}, carré de ${next.side} px → ${NEXT_SIZE} px`);
  else console.log("Pas de next.png : le bouton Jour suivant n'est pas refait.");
  const pictos=buildPictos(from);
  console.log(`${pictos.length} pictos de la barre du bas : ${pictos.join(", ")||"aucun"}`);
  if(pictos.length!==BOTTOM_PICTOS.length) problems.push(`pictos de la barre du bas : ${BOTTOM_PICTOS.filter(k=>!pictos.includes(k)).join(", ")} manquant(s)`);
  const sorted=Object.fromEntries(Object.entries(bars).sort(([a],[b])=>a.localeCompare(b)));
  const lines=Object.entries(sorted).map(([k,v])=>`  ${JSON.stringify(k)}:${JSON.stringify(v)}`);
  fs.writeFileSync(DATA,`"use strict";

// Barres du camp par culture du capitaine (Idan, 2026-11-13 et 14). Généré par scripts/build-hud-bars.js : ne pas modifier
// à la main. Images : assets/hud/barres/<culture>/{left,center,right}.webp (version : celle du pack choisie par Idan, si ce
// n'est pas la première). Mesures en pixels de l'image d'origine :
// h (hauteur commune), left / center / right (largeurs), frameTop / frameBottom (cadre du milieu), bandTop / bandBottom
// (bande sombre où le jeu écrit), bandLeft (début de la bande dans l'embout gauche), bandRight (distance entre la fin de la
// bande et le bord droit de l'embout droit). ornament (s'il y en a un, assets/hud/barres/<culture>/ornement.webp) : l'anneau
// du centre de la barre du bas, en pixels de son image : w / h, cx / cy / hole (centre et diamètre du trou où se loge le
// bouton Jour suivant), x0 / y0 / x1 / y1 (étendue des pixels opaques). haut et bas : les deux barres de la culture selon les
// réglages d'Idan (scripts/hud-bars-reglages.json), en bandes B ; voir topLayout et bottomLayout dans le script.
const HUD_BARS={
${lines.join(",\n")}
};
if(typeof module!=="undefined") module.exports={HUD_BARS};
`);
  const missing=cultures.map(c=>c.nom).filter(n=>!sorted[slug(n)]);
  console.log(`${Object.keys(sorted).length} barres : ${Object.values(sorted).map(b=>`${b.culture} (${b.pack})`).join(", ")}`);
  console.log(`${missing.length} cultures sans barre : ${missing.join(", ")}`);
  const rings=Object.values(sorted).filter(b=>b.ornament).map(b=>b.culture);
  console.log(`${rings.length} anneaux (barre du bas) : ${rings.join(", ")||"aucun"}`);
  if(problems.length){console.log("À voir :\n- "+problems.join("\n- "));process.exitCode=1;}
}

if(require.main===module) main().catch(e=>{console.error(e);process.exit(1);});
module.exports={cultureOfPack,tokens,slug,findPacks,topLayout,bottomLayout};
