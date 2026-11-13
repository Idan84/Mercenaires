#!/usr/bin/env node
"use strict";

// Partie principale (l'écu) de chacun des 60 blasons de la compagnie (Idan, 2026-11-13 : « il faut pas mesurer la taille de
// l'image mais la taille de la partie principale, hors petits trucs qui dépassent »). La barre du haut dimensionne et aligne
// le blason sur cet écu (screen-ui.js, styles.css).
// Méthode : le masque opaque de l'image, une « ouverture » (érosion puis dilatation d'un rayon de 8 % de l'image) qui efface
// les éléments fins qui dépassent (épées, plumes, pointes), puis le cadre de la plus grande tache. Quelques blasons ont des
// décors trop massifs pour cette méthode (oiseaux, tournesols, ours, dragon, anneau) : leur écu est fixé à la main
// (BODY_OVERRIDES). Mesure aussi l'étendue de l'image entière (pixels opaques : gauche, haut, droite), pour que le texte de
// la barre commence après les décors et que rien ne sorte de l'écran. Écrit prototype-web/blason-bodies.js.
// Usage : node scripts/build-blason-bodies.js (Playwright).
const fs=require("fs");
const path=require("path");

const ROOT=path.resolve(__dirname,"..");
const DIR=path.join(ROOT,"prototype-web","assets","creation","blasons-hd");
const OUT=path.join(ROOT,"prototype-web","blason-bodies.js");
const COUNT=60,RADIUS=0.08;
// [gauche, haut, droite, bas], en fractions de l'image, relevés sur une grille de 10 %.
const BODY_OVERRIDES={
  3:[0.3,0.15,0.72,0.86],
  9:[0.17,0.2,0.75,0.86],
  26:[0.27,0.12,0.72,0.88],
  27:[0.28,0.2,0.66,0.86],
  36:[0.22,0.18,0.76,0.86]
};

async function main(){
  const {chromium}=require("playwright");
  const browser=await chromium.launch();
  const page=await browser.newPage();
  await page.setContent("<body></body>");
  const bodies={};
  for(let n=1;n<=COUNT;n++){
    const file=path.join(DIR,`b${String(n).padStart(2,"0")}.webp`);
    bodies[n]=await page.evaluate(async([src,R,fixed])=>{
      const i=new Image();i.src=src;await i.decode();const N=Math.max(i.width,i.height),W=i.width,H=i.height;
      const c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");g.drawImage(i,0,0);
      const d=g.getImageData(0,0,W,H).data;const M=new Uint8Array(W*H);for(let k=0;k<W*H;k++)M[k]=d[k*4+3]>100?1:0;
      // Étendue de l'image entière (pixels opaques).
      let ox0=W,oy0=H,ox1=0;for(let k=0;k<W*H;k++)if(M[k]){const x=k%W,y=(k/W)|0;if(x<ox0)ox0=x;if(x>ox1)ox1=x;if(y<oy0)oy0=y;}
      const whole=[ox0/W,oy0/H,(ox1+1)/W].map(v=>Math.round(v*1000)/1000);
      if(fixed) return [...fixed,...whole];
      // Distance (chanfrein 3-4) au plus proche pixel « faux » de la grille g.
      const dist=grid=>{const D=new Float32Array(W*H);const INF=1e9;for(let k=0;k<W*H;k++)D[k]=grid[k]?INF:0;
        for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x;if(!D[k])continue;let v=D[k];
          if(x>0)v=Math.min(v,D[k-1]+3);if(y>0){v=Math.min(v,D[k-W]+3);if(x>0)v=Math.min(v,D[k-W-1]+4);if(x<W-1)v=Math.min(v,D[k-W+1]+4);}
          if(x===0||y===0||x===W-1||y===H-1)v=Math.min(v,3);D[k]=v;}
        for(let y=H-1;y>=0;y--)for(let x=W-1;x>=0;x--){const k=y*W+x;if(!D[k])continue;let v=D[k];
          if(x<W-1)v=Math.min(v,D[k+1]+3);if(y<H-1){v=Math.min(v,D[k+W]+3);if(x<W-1)v=Math.min(v,D[k+W+1]+4);if(x>0)v=Math.min(v,D[k+W-1]+4);}D[k]=v;}
        return D;};
      const r=Math.round(R*N)*3;
      const D1=dist(M);const E=new Uint8Array(W*H);for(let k=0;k<W*H;k++)E[k]=D1[k]>=r?1:0;
      const notE=new Uint8Array(W*H);for(let k=0;k<W*H;k++)notE[k]=E[k]?0:1;
      const D2=dist(notE);const O=new Uint8Array(W*H);for(let k=0;k<W*H;k++)O[k]=(D2[k]<=r&&M[k])?1:0;
      // Plus grande tache.
      const lab=new Int32Array(W*H);let best=0,bestN=0,cur=0;const st=[];
      for(let k=0;k<W*H;k++){if(!O[k]||lab[k])continue;cur++;let cnt=0;st.push(k);lab[k]=cur;
        while(st.length){const q=st.pop();cnt++;const x=q%W,y=(q/W)|0;for(const nb of [x>0?q-1:-1,x<W-1?q+1:-1,y>0?q-W:-1,y<H-1?q+W:-1])if(nb>=0&&O[nb]&&!lab[nb]){lab[nb]=cur;st.push(nb);}}
        if(cnt>bestN){bestN=cnt;best=cur;}}
      let x0=W,y0=H,x1=0,y1=0;for(let k=0;k<W*H;k++)if(lab[k]===best){const x=k%W,y=(k/W)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
      return [...[x0/W,y0/H,(x1+1)/W,(y1+1)/H].map(v=>Math.round(v*1000)/1000),...whole];
    },["data:image/webp;base64,"+fs.readFileSync(file).toString("base64"),RADIUS,BODY_OVERRIDES[n]||null]);
  }
  await browser.close();
  const lines=Object.entries(bodies).map(([n,b])=>`  ${n}:[${b.join(",")}]`);
  fs.writeFileSync(OUT,`"use strict";

// Partie principale (l'écu) des 60 blasons, en fractions de l'image : [gauche, haut, droite, bas], puis l'étendue de l'image
// entière (pixels opaques) : [gauche, haut, droite]. Généré par scripts/build-blason-bodies.js : ne pas modifier à la main.
const BLASON_BODIES={
${lines.join(",\n")}
};
if(typeof module!=="undefined") module.exports={BLASON_BODIES};
`);
  console.log(`${Object.keys(bodies).length} blasons mesurés (${Object.keys(BODY_OVERRIDES).length} fixés à la main).`);
}

if(require.main===module) main().catch(e=>{console.error(e);process.exit(1);});
