#!/usr/bin/env node
"use strict";
// Les cachets de cire des annonces (Jean-Mi, 2026-11-14 : media/background/Taverne/Missions/Sealing_wax_on_wooden_board_060d3342.jpg,
// trois cachets sur fond vert) : node scripts/key-wax-seals.js <planche.jpg> prototype-web/assets/taverne cire-rouge cire-noire cire-bleue
// (de gauche à droite).
// (chaque goutte rattachée au cachet le plus proche), un WebP avec transparence par cachet.
const {chromium}=require("playwright");const fs=require("fs");
(async()=>{const [src,outDir,...names]=process.argv.slice(2);const b=await chromium.launch();const p=await b.newPage();
const data="data:image/jpeg;base64,"+fs.readFileSync(src).toString("base64");
const outs=await p.evaluate(async({data,names})=>{
  const img=new Image();img.src=data;await img.decode();
  const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement("canvas");c.width=w;c.height=h;
  const g=c.getContext("2d");g.drawImage(img,0,0);const id=g.getImageData(0,0,w,h),d=id.data;
  const A=new Float32Array(w*h);
  for(let i=0;i<w*h;i++){const r=d[4*i]/255,gg=d[4*i+1]/255,bb=d[4*i+2]/255,m=Math.max(r,bb);
    const k=Math.min(1,Math.max(0,(gg-m-0.12)*3.2));A[i]=1-k;
    if(gg>m){d[4*i+1]=Math.round(m*255);} }
  // composantes connexes (alpha > 0.5)
  const lab=new Int32Array(w*h).fill(-1),comps=[];
  for(let s=0;s<w*h;s++){if(A[s]<=0.5||lab[s]>=0)continue;const q=[s];lab[s]=comps.length;let n=0,sx=0,sy=0,x0=w,y0=h,x1=0,y1=0;
    while(q.length){const i=q.pop();n++;const x=i%w,y=(i/w)|0;sx+=x;sy+=y;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
      for(const j of [i-1,i+1,i-w,i+w]){if(j<0||j>=w*h||lab[j]>=0||A[j]<=0.5)continue;if((j===i-1&&x===0)||(j===i+1&&x===w-1))continue;lab[j]=comps.length;q.push(j);}}
    comps.push({n,cx:sx/n,cy:sy/n,x0,y0,x1,y1});}
  const big=comps.map((c,i)=>({...c,i})).sort((a,b)=>b.n-a.n).slice(0,3).sort((a,b)=>a.cx-b.cx);
  const owner=comps.map(c=>{let best=0,bd=1e18;big.forEach((B,k)=>{const dd=(c.cx-B.cx)**2+(c.cy-B.cy)**2;if(dd<bd){bd=dd;best=k;}});return best;});
  // la bande d'alpha < 0.5 (bords) : au cachet de la composante voisine la plus proche
  const res=[];
  big.forEach((B,k)=>{let x0=w,y0=h,x1=0,y1=0;
    for(let i=0;i<w*h;i++){if(lab[i]>=0&&owner[lab[i]]===k){const x=i%w,y=(i/w)|0;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}
    const pad=4;x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(w-1,x1+pad);y1=Math.min(h-1,y1+pad);
    const cw=x1-x0+1,ch=y1-y0+1,o=document.createElement("canvas");o.width=cw;o.height=ch;const og=o.getContext("2d"),od=og.createImageData(cw,ch);
    for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const i=(y+y0)*w+(x+x0),j=4*(y*cw+x);
      // un pixel appartient à ce cachet s'il est dans une de ses composantes, ou en bordure (alpha faible) d'une de ses composantes
      let mine=lab[i]>=0?owner[lab[i]]===k:false;
      if(!mine&&lab[i]<0&&A[i]>0){for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]]){const xx=x+x0+dx,yy=y+y0+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const l=lab[yy*w+xx];if(l>=0&&owner[l]===k){mine=true;break;}}}
      od.data[j]=d[4*i];od.data[j+1]=d[4*i+1];od.data[j+2]=d[4*i+2];od.data[j+3]=mine?Math.round(255*A[i]):0;}
    og.putImageData(od,0,0);
    // au plus 320 px de côté
    const sc=Math.min(1,320/Math.max(cw,ch)),f=document.createElement("canvas");f.width=Math.round(cw*sc);f.height=Math.round(ch*sc);
    f.getContext("2d").drawImage(o,0,0,f.width,f.height);
    res.push({name:names[k],w:f.width,h:f.height,url:f.toDataURL("image/webp",0.9)});});
  return res;},{data,names});
for(const o of outs){fs.writeFileSync(outDir+"/"+o.name+".webp",Buffer.from(o.url.split(",")[1],"base64"));console.log(o.name,o.w+"x"+o.h);}
await b.close();})();
