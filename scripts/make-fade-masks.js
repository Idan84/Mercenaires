#!/usr/bin/env node
"use strict";
// Masques d'estompage des gravures en pleine page sur les annonces (Idan, 2026-11-14 : « jusqu'au bord du parchemin,
// avec sur les bords un effet d'estompage… on baisse l'opacité en dégradé et en random par zone ») :
//   node scripts/make-fade-masks.js prototype-web/assets/taverne 4
// écrit estompe-1.webp … estompe-N.webp : du blanc dont seule la transparence compte (le CSS s'en sert comme masque).
// Chaque masque a sa graine : l'encre s'efface vers les bords, plus loin par endroits (grandes zones de bruit), avec un
// grain fin dans la transition comme une gravure usée ; l'intérieur pâlit un peu par plaques.
const {chromium}=require("playwright");const fs=require("fs");
(async()=>{const [outDir,countArg]=process.argv.slice(2);const count=Number(countArg)||4;
if(!outDir){console.error("usage : make-fade-masks.js <dossier> [nombre]");process.exit(1);}
const b=await chromium.launch();const p=await b.newPage();
const outs=await p.evaluate(({count})=>{
  const W=480,H=360,res=[];
  for(let seed=1;seed<=count;seed++){
    // bruit de valeur lissé, graine fixe : le même masque à chaque génération
    const rnd=(()=>{let s=seed*2654435761>>>0;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};})();
    const grid=(n)=>{const g=[];for(let i=0;i<(n+2)*(n+2);i++)g.push(rnd());return {n,g};};
    const sample=({n,g},x,y)=>{const fx=x*n,fy=y*n,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy;
      const s=t=>t*t*(3-2*t),at=(i,j)=>g[(j+1)*(n+2)+(i+1)];
      const a=at(ix,iy)+(at(ix+1,iy)-at(ix,iy))*s(tx),c=at(ix,iy+1)+(at(ix+1,iy+1)-at(ix,iy+1))*s(tx);return a+(c-a)*s(ty);};
    const fbm=(octs,x,y)=>{let v=0,amp=0,a=1;for(const o of octs){v+=a*sample(o,x,y);amp+=a;a*=.5;}return v/amp;};
    const zones=[grid(3),grid(6)],zones2=[grid(2),grid(5)],mid=[grid(12),grid(24)],grain=[grid(60),grid(120)];
    const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d"),id=g.createImageData(W,H),d=id.data;
    const smooth=(a,b,t)=>{const x=Math.min(1,Math.max(0,(t-a)/(b-a)));return x*x*(3-2*x);};
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const u=x/(W-1),v=y/(H-1);
      const z=fbm(zones,u,v);
      // largeur de l'estompage par bord, plus profonde là où la zone de bruit est haute ; le bas glisse vers le titre
      const k=.55+1.1*z,ws=.15*k,wt=.13*k,wb=.3*k;
      const e=Math.min(u/ws,(1-u)/ws,v/wt,(1-v)/wb);
      let a=smooth(.05,1,e+.35*(fbm(mid,u,v)-.5));
      // le grain : l'encre se casse dans la transition, pas au cœur de l'image
      a+=(fbm(grain,u,v)-.5)*1.1*a*(1-a)*2;
      // l'intérieur pâlit un peu par plaques
      a*=1-.16*smooth(.45,.85,fbm(zones2,u,v));
      a=Math.min(1,Math.max(0,a));
      const i=4*(y*W+x);d[i]=d[i+1]=d[i+2]=255;d[i+3]=Math.round(a*255);}
    g.putImageData(id,0,0);res.push(c.toDataURL("image/webp",0.9));}
  return res;},{count});
outs.forEach((url,i)=>{const f=outDir+"/estompe-"+(i+1)+".webp";fs.writeFileSync(f,Buffer.from(url.split(",")[1],"base64"));console.log(f);});
await b.close();})();
