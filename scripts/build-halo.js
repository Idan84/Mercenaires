#!/usr/bin/env node
"use strict";
// Le halo animé des gouttes d'ascendance pour le jeu : assets-src/Picto/Ascendance/goutte-halo.webp (master d'Idan,
// 512 × 512, 80 images, 4 s) → prototype-web/assets/pictos/goutte-halo.webp (256 × 256, la toile de la goutte rubis :
// picto-ui.js superpose les calques sur la même toile).
//
// Pourquoi un script à part (2026-11-15) : ImageMagick lit mal ce WebP animé (il empile les couches : les volutes fines
// d'Idan devenaient une traînée rouge épaisse ; Idan : « l'animation est pas top... ça rend rien »). Les images sont donc
// décodées par le navigateur (Chromium, ImageDecoder), qui les lit correctement, placées par ImageMagick, puis assemblées
// par ffmpeg.
//
// Placement : le halo est recentré sur la goutte et agrandi de 22 % (ses volutes tournent autour au lieu de se cacher
// derrière), puis viennent les réglages d'Idan sur la planche de choix (« Le B avec 105% -0,5% -5% 75% 84% ») : la
// version B, deux couches, le halo et son reflet (« le doubler sur la droite en symétrie »), chacune à 93 % ; puis
// taille 105 %, décalage −0,5 % vers la droite et 5 % vers le haut (en % de la goutte), étirement horizontal 75 % et
// vertical 84 %.
//
// Usage : node scripts/build-halo.js   (Playwright et son Chromium, ImageMagick, ffmpeg)
const {chromium}=require("playwright");
const fs=require("fs"),os=require("os"),path=require("path"),{execFileSync}=require("child_process");

const ROOT=path.resolve(__dirname,"..");
const SRC=path.join(ROOT,"assets-src/Picto/Ascendance/goutte-halo.webp");
const OUT=path.join(ROOT,"prototype-web/assets/pictos/goutte-halo.webp");
const N=256;                                    // la toile du jeu, celle de la goutte
const HALO={centre:[249,261],agrandi:1.22};     // centre du halo sur le master (cadre de ses 80 images), agrandissement
const GOUTTE={centre:[.5,.4775]};               // centre de la goutte sur sa toile
const REGLAGES={couche:.93,miroir:true,taille:1.05,dx:-.5,dy:-5,sx:.75,sy:.84};

async function decodeFrames(file){
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage();
    // ImageDecoder n'existe que sur une page sécurisée : une page https vide, servie par Playwright lui-même (sans réseau).
    await page.route("https://halo.local/",route=>route.fulfill({contentType:"text/html",body:"<!doctype html>"}));
    await page.goto("https://halo.local/");
    return await page.evaluate(async b64=>{
      const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
      const decoder=new ImageDecoder({data:bytes,type:"image/webp"});
      await decoder.tracks.ready;
      const frames=[];
      for(let i=0;i<decoder.tracks.selectedTrack.frameCount;i++){
        const {image}=await decoder.decode({frameIndex:i});
        const canvas=new OffscreenCanvas(image.displayWidth,image.displayHeight);
        canvas.getContext("2d").drawImage(image,0,0);
        const duration=image.duration;image.close();
        const png=new Uint8Array(await (await canvas.convertToBlob({type:"image/png"})).arrayBuffer());
        let s="";for(let k=0;k<png.length;k+=0x8000)s+=String.fromCharCode.apply(null,png.subarray(k,k+0x8000));
        frames.push({png:btoa(s),duration,width:canvas.width});
      }
      return frames;
    },fs.readFileSync(file).toString("base64"));
  }finally{ await browser.close(); }
}

(async()=>{
  const frames=await decodeFrames(SRC);
  const durations=new Set(frames.map(f=>f.duration));
  if(durations.size!==1) throw new Error("Durées d'images inégales : "+[...durations].join(", "));
  const fps=1e6/frames[0].duration, W=frames[0].width;
  // Du master à la toile du jeu : point m du master → centre + décalage + K × g × (m − centre du halo).
  const g=HALO.agrandi*N/W, r=REGLAGES;
  const kx=r.taille*r.couche*r.sx*g, ky=r.taille*r.couche*r.sy*g;
  const cible=[GOUTTE.centre[0]*N+r.dx/100*N, GOUTTE.centre[1]*N+r.dy/100*N].map(v=>v.toFixed(3)).join(",");
  const place=(centre)=>["-virtual-pixel","transparent","-background","none","-define",`distort:viewport=${N}x${N}+0+0`,
    "-distort","SRT",`${centre[0]},${centre[1]} ${kx.toFixed(6)},${ky.toFixed(6)} 0 ${cible}`];
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"halo-"));
  try{
    frames.forEach((f,i)=>{
      const src=path.join(tmp,`m${String(i).padStart(3,"0")}.png`), dst=path.join(tmp,`${String(i).padStart(3,"0")}.png`);
      fs.writeFileSync(src,Buffer.from(f.png,"base64"));
      const couches=["(",src,...place(HALO.centre),")"];
      // Le reflet : le master retourné, centré sur le symétrique du centre du halo.
      if(r.miroir) couches.push("(",src,"-flop",...place([W-HALO.centre[0],HALO.centre[1]]),")","-compose","over","-composite");
      execFileSync("convert",[...couches,dst]);
    });
    execFileSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-framerate",String(fps),"-i",path.join(tmp,"%03d.png"),
      "-c:v","libwebp_anim","-lossless","0","-quality","82","-compression_level","6","-pix_fmt","yuva420p","-loop","0",OUT]);
  }finally{ fs.rmSync(tmp,{recursive:true,force:true}); }
  console.log(`${OUT} : ${frames.length} images, ${frames.length/fps} s, ${fs.statSync(OUT).size} octets`);
})().catch(e=>{ console.error(e); process.exit(1); });
