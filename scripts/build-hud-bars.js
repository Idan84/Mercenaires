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
// - écrit prototype-web/hud-bars.js, la liste des barres et leurs mesures, lue par la barre du haut (screen-ui.js).
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
const PIECES=["left","center","right"];
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

// Les packs d'un dossier : chaque sous-dossier qui a ses trois morceaux.
function findPacks(dir){
  const packs=[];
  const walk=rel=>{
    const abs=path.join(dir,rel);
    const files=fs.readdirSync(abs,{withFileTypes:true});
    const pieces={};
    for(const f of files){
      if(f.isDirectory()){walk(path.join(rel,f.name));continue;}
      const m=f.name.match(/^(left|center|right)\.(png|webp|jpe?g)$/i);
      if(m) pieces[m[1].toLowerCase()]=path.join(abs,f.name);
    }
    if(PIECES.every(p=>pieces[p])) packs.push({pack:rel.split(path.sep).join("/"),pieces});
  };
  walk("");
  return packs.sort((a,b)=>a.pack.localeCompare(b.pack));
}

// Téléchargement depuis le site (la liste vient d'api/hud-pack.php).
function download(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hud-pack-"));
  const index=JSON.parse(execFileSync("curl",["-sf",SITE+"/api/hud-pack.php"],{encoding:"utf8"}));
  for(const f of index.files){
    if(!/\/(left|center|right)\.\w+$/i.test(f.path)) continue;
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

async function main(){
  const args=process.argv.slice(2);
  const from=args.includes("--from")?path.resolve(args[args.indexOf("--from")+1]):download();
  console.log("Packs lus dans "+from);
  const cultures=JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference","cultures.json"),"utf8")).rows;
  const packs=findPacks(from);
  const {chromium}=require("playwright");
  const browser=await chromium.launch();
  const page=await browser.newPage();
  await page.setContent("<body></body>");
  const bars={},problems=[];
  for(const {pack,pieces} of packs){
    const culture=cultureOfPack(pack,cultures);
    if(!culture){problems.push(`${pack} : culture introuvable (à ajouter dans PACK_CULTURE)`);continue;}
    const key=slug(culture.nom);
    if(bars[key]){problems.push(`${pack} : ${culture.nom} a déjà le pack ${bars[key].pack}`);continue;}
    const m=await measure(page,pieces);
    if(new Set(m.heights).size>1){problems.push(`${pack} : les trois morceaux n'ont pas la même hauteur (${m.heights.join(", ")})`);continue;}
    if(m.bandBottom-m.bandTop<20){problems.push(`${pack} : bande sombre introuvable`);continue;}
    const dir=path.join(OUT,key);
    fs.mkdirSync(dir,{recursive:true});
    for(const p of PIECES){
      execFileSync("convert",[pieces[p],"-strip","-quality","90","-define","webp:alpha-quality=100","-define","webp:method=6",path.join(dir,p+".webp")]);
    }
    delete m.heights;
    bars[key]={culture:culture.nom,pack,...m};
  }
  await browser.close();
  const sorted=Object.fromEntries(Object.entries(bars).sort(([a],[b])=>a.localeCompare(b)));
  const lines=Object.entries(sorted).map(([k,v])=>`  ${JSON.stringify(k)}:${JSON.stringify(v)}`);
  fs.writeFileSync(DATA,`"use strict";

// Barres du haut par culture du capitaine (Idan, 2026-11-13). Généré par scripts/build-hud-bars.js : ne pas modifier à
// la main. Images : assets/hud/barres/<culture>/{left,center,right}.webp. Mesures en pixels de l'image d'origine :
// h (hauteur commune), left / center / right (largeurs), frameTop / frameBottom (cadre du milieu), bandTop / bandBottom
// (bande sombre où le jeu écrit), bandLeft (début de la bande dans l'embout gauche), bandRight (distance entre la fin de la
// bande et le bord droit de l'embout droit).
const HUD_BARS={
${lines.join(",\n")}
};
if(typeof module!=="undefined") module.exports={HUD_BARS};
`);
  const missing=cultures.map(c=>c.nom).filter(n=>!sorted[slug(n)]);
  console.log(`${Object.keys(sorted).length} barres : ${Object.values(sorted).map(b=>`${b.culture} (${b.pack})`).join(", ")}`);
  console.log(`${missing.length} cultures sans barre : ${missing.join(", ")}`);
  if(problems.length){console.log("À voir :\n- "+problems.join("\n- "));process.exitCode=1;}
}

if(require.main===module) main().catch(e=>{console.error(e);process.exit(1);});
module.exports={cultureOfPack,tokens,slug};
