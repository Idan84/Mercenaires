#!/usr/bin/env node
"use strict";
// Détoure les objets d'une planche de Jean-Mi sur fond vert (#00FF00) : un WebP avec transparence par objet.
//   node scripts/key-green-sheet.js <planche.jpg> <dossier> [--max 320] nom1 nom2 …
// Les objets sont les plus grandes taches non vertes, nommées dans l'ordre de lecture (rangées de haut en bas,
// puis de gauche à droite) ; chaque petite tache (goutte, éclat) est rattachée à l'objet le plus proche.
// Le vert qui déborde sur les bords est retiré seulement près du fond : une patine verte au milieu d'un objet reste.
// Planches utilisées (media/background/Taverne/Missions/ sur Hostinger) :
//   Sealing_wax_on_wooden_board_060d3342.jpg → assets/taverne cire-rouge cire-noire cire-bleue (--max 320)
//   Arrow_shaped_wrought_iron_bracket_cae7a463_2K.jpg → assets/taverne fleche-fer (--max 640)
//   Fasteners_on_green_background_92b036a6_2K.jpg → assets/taverne clou-1 clou-2 clou-3 punaise-1 punaise-2 punaise-3 (--max 128)
//   Parchment_fragments_on_green_bac…_82577d7b_2K.jpg → (--max 400) le 3e devient lambeau-1, le 2e lambeau-3
//   Torn_parchment_fragments_on_wall_52aec780_2K.jpg → (--max 400) le 1er devient lambeau-2
const {chromium}=require("playwright");const fs=require("fs");
// --flop retourne l'objet gauche-droite, --turn le tourne d'un demi-tour (pour varier une feuille sans la dupliquer).
(async()=>{const args=process.argv.slice(2);let max=320;const mi=args.indexOf("--max");if(mi>=0){max=Number(args[mi+1]);args.splice(mi,2);}
const flag=f=>{const i=args.indexOf(f);if(i<0)return false;args.splice(i,1);return true;};const flop=flag("--flop"),turn=flag("--turn");
const [src,outDir,...names]=args;if(!src||!outDir||!names.length){console.error("usage : key-green-sheet.js <planche.jpg> <dossier> [--max N] [--flop] [--turn] nom…");process.exit(1);}
const b=await chromium.launch();const p=await b.newPage();
const data="data:image/jpeg;base64,"+fs.readFileSync(src).toString("base64");
const outs=await p.evaluate(async({data,names,max,flop,turn})=>{
  const img=new Image();img.src=data;await img.decode();
  const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement("canvas");c.width=w;c.height=h;
  const g=c.getContext("2d");g.drawImage(img,0,0);const d=g.getImageData(0,0,w,h).data;
  const A=new Float32Array(w*h);
  for(let i=0;i<w*h;i++){const m=Math.max(d[4*i],d[4*i+2])/255,k=Math.min(1,Math.max(0,(d[4*i+1]/255-m-0.12)*3.2));A[i]=1-k;}
  // retirer le vert seulement à 3 px ou moins du fond
  const R=3;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(A[i]===0)continue;let near=A[i]<0.98;
    for(let dy=-R;dy<=R&&!near;dy++)for(let dx=-R;dx<=R;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;if(A[yy*w+xx]<0.5){near=true;break;}}
    if(near){const m=Math.max(d[4*i],d[4*i+2]);if(d[4*i+1]>m)d[4*i+1]=m;}}
  // composantes connexes (alpha > 0.5)
  const lab=new Int32Array(w*h).fill(-1),comps=[];
  for(let s=0;s<w*h;s++){if(A[s]<=0.5||lab[s]>=0)continue;const q=[s];lab[s]=comps.length;let n=0,sx=0,sy=0,y0=h,y1=0;
    while(q.length){const i=q.pop();n++;const x=i%w,y=(i/w)|0;sx+=x;sy+=y;y0=Math.min(y0,y);y1=Math.max(y1,y);
      for(const j of [i-1,i+1,i-w,i+w]){if(j<0||j>=w*h||lab[j]>=0||A[j]<=0.5)continue;if((j===i-1&&x===0)||(j===i+1&&x===w-1))continue;lab[j]=comps.length;q.push(j);}}
    comps.push({n,cx:sx/n,cy:sy/n,hh:y1-y0+1});}
  // ordre de lecture : une rangée regroupe les objets dont le centre est à moins d'une demi-hauteur du premier
  const big=comps.slice().sort((a,b)=>b.n-a.n).slice(0,names.length).sort((a,b)=>a.cy-b.cy);
  const rows=[];for(const B of big){const r=rows.find(r=>Math.abs(r[0].cy-B.cy)<r[0].hh/2);if(r)r.push(B);else rows.push([B]);}
  const order=rows.flatMap(r=>r.sort((a,b)=>a.cx-b.cx));
  const owner=comps.map(c=>{let best=0,bd=1e18;order.forEach((B,k)=>{const dd=(c.cx-B.cx)**2+(c.cy-B.cy)**2;if(dd<bd){bd=dd;best=k;}});return best;});
  const res=[];
  order.forEach((B,k)=>{let x0=w,y0=h,x1=0,y1=0;
    for(let i=0;i<w*h;i++){if(lab[i]>=0&&owner[lab[i]]===k){const x=i%w,y=(i/w)|0;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}
    const pad=4;x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(w-1,x1+pad);y1=Math.min(h-1,y1+pad);
    const cw=x1-x0+1,ch=y1-y0+1,o=document.createElement("canvas");o.width=cw;o.height=ch;const og=o.getContext("2d"),od=og.createImageData(cw,ch);
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const i=(y+y0)*w+(x+x0),j=4*(y*cw+x);
      // un pixel appartient à cet objet s'il est dans une de ses composantes, ou en bordure (alpha faible) d'une de ses composantes
      let mine=lab[i]>=0?owner[lab[i]]===k:false;
      if(!mine&&lab[i]<0&&A[i]>0){for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]]){const xx=x+x0+dx,yy=y+y0+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const l=lab[yy*w+xx];if(l>=0&&owner[l]===k){mine=true;break;}}}
      od.data[j]=d[4*i];od.data[j+1]=d[4*i+1];od.data[j+2]=d[4*i+2];od.data[j+3]=mine?Math.round(255*A[i]):0;}
    og.putImageData(od,0,0);
    const sc=Math.min(1,max/Math.max(cw,ch)),f=document.createElement("canvas");f.width=Math.round(cw*sc);f.height=Math.round(ch*sc);
    const fg=f.getContext("2d");fg.imageSmoothingQuality="high";
    if(flop||turn){fg.translate(f.width/2,f.height/2);if(turn)fg.rotate(Math.PI);if(flop)fg.scale(-1,1);fg.translate(-f.width/2,-f.height/2);}
    fg.drawImage(o,0,0,f.width,f.height);
    res.push({name:names[k],w:f.width,h:f.height,url:f.toDataURL("image/webp",0.9)});});
  return res;},{data,names,max,flop,turn});
for(const o of outs){fs.writeFileSync(outDir+"/"+o.name+".webp",Buffer.from(o.url.split(",")[1],"base64"));console.log(o.name,o.w+"x"+o.h);}
await b.close();})();
