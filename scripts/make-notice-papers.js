#!/usr/bin/env node
"use strict";
// Les papiers des annonces du panneau des missions (Idan, 2026-11-14 : « les 3 parchemins d'annonces ont trop le même
// gabarit, les mêmes défauts… plis à des endroits différents, taches, orientations, forme du parchemin ») :
//   node scripts/make-notice-papers.js prototype-web/assets/creation/parchemin.webp prototype-web/assets/taverne
// écrit papier-annonce-2.webp … papier-annonce-6.webp (le 1 reste le parchemin de la création, avec ses ornements).
// Chacun part du papier uni du centre du parchemin (tourné, retourné, pour que les marbrures changent), avec ses propres
// bords déchirés (bruit à graine fixe), un liseré vieilli plus ou moins large, et pour certains un coin arraché ou corné.
// Même format que le parchemin (1000 × 992, bords dans les 180 px de la découpe du border-image).
const {chromium}=require("playwright");const fs=require("fs");
const VARIANTS=[
  // rot : quart de tour du papier uni ; flip : retourné ; inset / amp : bord (px) ; rim : liseré vieilli (px, force)
  {n:2,seed:11,rot:1,flip:false,inset:16,amp:30,rim:[58,.58]},
  {n:3,seed:23,rot:2,flip:true,inset:12,amp:44,rim:[40,.68],chunk:"bas-gauche"},
  {n:4,seed:37,rot:3,flip:false,inset:20,amp:24,rim:[72,.5],dogear:"bas-droite"},
  {n:5,seed:41,rot:0,flip:true,inset:14,amp:38,rim:[48,.64],chunk:"haut-droite"},
  {n:6,seed:59,rot:1,flip:true,inset:18,amp:34,rim:[62,.6],dogear:"bas-gauche"}
];
(async()=>{const [src,outDir]=process.argv.slice(2);if(!src||!outDir){console.error("usage : make-notice-papers.js <parchemin.webp> <dossier>");process.exit(1);}
const b=await chromium.launch();const p=await b.newPage();
const data="data:image/webp;base64,"+fs.readFileSync(src).toString("base64");
const outs=await p.evaluate(async({data,VARIANTS})=>{
  const img=new Image();img.src=data;await img.decode();const W=img.naturalWidth,H=img.naturalHeight;
  const res=[];
  for(const V of VARIANTS){
    const rnd=(()=>{let s=V.seed*2654435761>>>0;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};})();
    // bruit de valeur périodique (on peut l'échantillonner au-delà de [0, 1])
    const grid=n=>{const g=[];for(let i=0;i<n*n;i++)g.push(rnd());return {n,g};};
    const sample=({n,g},x,y)=>{const fx=x*n,fy=y*n,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy;
      const s=t=>t*t*(3-2*t),at=(i,j)=>g[(((j%n)+n)%n)*n+(((i%n)+n)%n)];
      const a=at(ix,iy)+(at(ix+1,iy)-at(ix,iy))*s(tx),c=at(ix,iy+1)+(at(ix+1,iy+1)-at(ix,iy+1))*s(tx);return a+(c-a)*s(ty);};
    const fbm=(octs,x,y)=>{let v=0,amp=0,a=1;for(const o of octs){v+=a*sample(o,x,y);amp+=a;a*=.55;}return v/amp;};
    const coarse=[grid(5),grid(11)],fine=[grid(40),grid(90),grid(180)],mott=[grid(3)];
    // le papier uni : le centre du parchemin, sans ornements ni filet, tourné / retourné puis agrandi
    const base=document.createElement("canvas");base.width=W;base.height=H;const bg=base.getContext("2d",{willReadFrequently:true});
    bg.translate(W/2,H/2);bg.rotate(V.rot*Math.PI/2);if(V.flip)bg.scale(-1,1);
    const c0=230,cw=W-2*c0,ch=H-2*c0;bg.drawImage(img,c0,c0,cw,ch,-W/2-8,-H/2-8,W+16,H+16);
    const pd=bg.getImageData(0,0,W,H).data;
    const out=document.createElement("canvas");out.width=W;out.height=H;const og=out.getContext("2d"),od=og.createImageData(W,H),o=od.data;
    const smooth=(a,b,t)=>{const x=Math.min(1,Math.max(0,(t-a)/(b-a)));return x*x*(3-2*x);};
    // coin arraché : une grosse morsure déchirée dans un coin (dans les 180 px de la découpe)
    const corner=name=>({"haut-gauche":[0,0],"haut-droite":[W,0],"bas-gauche":[0,H],"bas-droite":[W,H]})[name];
    const chunkAt=V.chunk?corner(V.chunk):null;
    // coin corné : le coin replié sur la face, vu de dos (plus sombre), avec son ombre
    const dog=V.dogear?corner(V.dogear):null,ds=150;
    const inside=(x,y)=>{ // la profondeur dans le papier (px), négative dehors
      const d=Math.min(x,W-1-x,y,H-1-y);
      // le bord : un fond déchiré (bruit grossier le long du bord) et des fibres (bruit fin)
      let t=V.inset+V.amp*fbm(coarse,x/W,y/H)+7*(fbm(fine,x/W,y/H)-.5);
      if(chunkAt){const r=Math.hypot(x-chunkAt[0],y-chunkAt[1]);t+=Math.max(0,150-r)*(.75+.5*fbm(fine,x/W*1.3,y/H*1.3));}
      return d-t;};
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=4*(y*W+x);let depth=inside(x,y);
      let r=pd[i],g=pd[i+1],bl=pd[i+2];
      // marbrure lente propre à ce papier
      // un peu plus chaud et plus foncé que le centre du parchemin, comme son pourtour
      const m=1+.1*(fbm(mott,x/W,y/H)-.5);r*=m*.95;g*=m*.91;bl*=m*.84;
      // le liseré vieilli, plus foncé près du bord
      // (et un filet plus sombre tout au bord, là où la déchirure a bruni)
      const age=Math.min(.85,V.rim[1]*Math.exp(-Math.max(0,depth)/V.rim[0])*(.7+.6*fbm(coarse,x/W*2,y/H*2))+.3*Math.exp(-Math.max(0,depth)/5));
      r*=1-age;g*=1-age*1.12;bl*=1-age*1.3;
      let a=smooth(-1.2,1.6,depth);
      if(dog){const sx=dog[0]?-1:1,sy=dog[1]?-1:1,u=(x-dog[0])*sx,v=(y-dog[1])*sy; // u,v : distance au coin, vers l'intérieur
        if(u+v<ds){a=0;} // la pointe repliée a quitté le coin (pli : u + v = ds)
        else{ // le rabat : le coin replié, symétrique par rapport au pli (triangle u ≤ ds, v ≤ ds, u + v ≥ ds)
          const inFlap=u<=ds&&v<=ds&&inside(dog[0]+sx*(ds-v),dog[1]+sy*(ds-u))>0;
          if(inFlap){const t=(u+v-ds)/ds,shade=.72+.1*t; // vu de dos : plus sombre au pli, un peu moins vers la pointe
            r=pd[i]*shade;g=pd[i+1]*shade*.97;bl=pd[i+2]*shade*.92;
            if(u+v<ds+4){r*=1.15;g*=1.15;bl*=1.12;} // le filet clair du pli
            a=1;}
          else{const dd=Math.hypot(Math.max(0,u-ds),Math.max(0,v-ds));if(dd>0&&dd<14){const sh=.25*(1-dd/14);r*=1-sh;g*=1-sh;bl*=1-sh;}}}}
      o[i]=Math.max(0,Math.min(255,r));o[i+1]=Math.max(0,Math.min(255,g));o[i+2]=Math.max(0,Math.min(255,bl));o[i+3]=Math.round(255*a);}
    og.putImageData(od,0,0);res.push({n:V.n,url:out.toDataURL("image/webp",0.85)});}
  return res;},{data,VARIANTS});
for(const r of outs){const f=outDir+"/papier-annonce-"+r.n+".webp";fs.writeFileSync(f,Buffer.from(r.url.split(",")[1],"base64"));console.log(f);}
await b.close();})();
