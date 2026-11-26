// Usage : node scripts/build-dialog-frame-idan.js [source] [moitié gauche] [moitié droite]   (Playwright requis)
// Le cadre d'Idan en deux moitiés (gauche, droite) pour deux border-image : 5 colonnes, 3 rangées.
// Colonnes de chaque moitié : coin [0,A) | cuir uni qui se répète [A,B) | demi-ornement [B, milieu).
// Rangées : haut [0,E) | milieu qui se répète [E,R) | bas [R,H).
// Le morceau répété commence par un fondu depuis ce qui suit sa fin ([B,B+F) / [R,R+F)) : bout à bout, il ne se voit pas ;
// la fin du coin se fond vers ce qui précède le début du morceau. Le cuir des morceaux répétés est mis au ton de la
// colonne B / de la rangée R (là où il rejoint l'ornement / le bas), en douceur ; l'or n'est pas touché.
const {chromium}=require("playwright"),fs=require("fs");
const path=require("path"),ROOT=path.resolve(__dirname,"..");
const [src=ROOT+"/assets-src/Kits/cadre-dialogue/cadre-idan.webp",outL=ROOT+"/prototype-web/assets/creation/cadre-dialogue-gauche.webp",outR=ROOT+"/prototype-web/assets/creation/cadre-dialogue-droite.webp"]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 const res=await p.evaluate(async d=>{
  const cv=(w,h)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c;};
  const i=new Image();i.src=d;await i.decode();
  const X0=56,Y0=63,W=1337,H=953,M=668;
  const c0=cv(W,H);c0.getContext("2d").drawImage(i,X0,Y0,W,H,0,0,W,H);
  const D=new Float32Array(c0.getContext("2d").getImageData(0,0,W,H).data);
  // la volute du coin haut droit effacée (Idan, 2026-11-25 : « retirer la volute en haut à droite », la croix est posée sur ce
  // coin) : le cuir entre les filets du coin est refait avec le cuir voisin pris à la même distance des filets (même rangée
  // 120 px plus à gauche pour le filet du haut, même colonne 120 px plus bas pour celui de droite), mélangés selon le filet le
  // plus proche, puis fondu sur 14 px dans le cuir d'origine (à gauche et en bas) ; les filets ne sont pas touchés.
  {const S0=D.slice(),at=(xp,y)=>(y*W+(W-1-xp))*4,ss=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
   for(let y=37;y<145;y++)for(let xp=37;xp<150;xp++){if(xp+y<117)continue;const m=ss((150-xp)/14)*ss((145-y)/14);if(m<=0)continue;
     const wr=xp/(xp+y),kr=at(xp+120,y),kc=at(xp,y+120),k=at(xp,y);for(let ch=0;ch<3;ch++)D[k+ch]=m*(wr*S0[kr+ch]+(1-wr)*S0[kc+ch])+(1-m)*S0[k+ch];}}
  const A=180,B=440,E=150,R=526,F=40;
  const lum=k=>.2126*D[k]+.7152*D[k+1]+.0722*D[k+2];
  const cl=v=>Math.max(0,Math.min(1,v));
  const mask=k=>D[k+3]<250?0:cl((lum(k)-8)/10)*cl((80-lum(k))/25);
  // lumière du cuir : moyennes par blocs de 16 px (cuir seulement), trous comblés, flou large, puis lecture bilinéaire
  const Bk=16,bw=Math.ceil(W/Bk),bh=Math.ceil(H/Bk);let s=new Float32Array(bw*bh),n=new Float32Array(bw*bh);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=(y*W+x)*4,m=mask(k);if(m>0){const q=((y/Bk)|0)*bw+((x/Bk)|0);s[q]+=lum(k)*m;n[q]+=m;}}
  let f=new Float32Array(bw*bh),ok=new Uint8Array(bw*bh);for(let q=0;q<bw*bh;q++)if(n[q]>40){f[q]=s[q]/n[q];ok[q]=1;}
  for(let it=0;it<60;it++){const g=f.slice();for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){const q=y*bw+x;if(ok[q])continue;let a=0,c=0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=bw||Y>=bh)continue;const r=Y*bw+X;if(ok[r]||g[r]>0){a+=g[r];c++;}}if(c)g[q]=a/c;}f=g;}
  const blur=(a,rad)=>{const o=new Float32Array(a.length),t=new Float32Array(a.length);for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){let z=0,c=0;for(let j=-rad;j<=rad;j++){const X=Math.min(bw-1,Math.max(0,x+j));z+=a[y*bw+X];c++;}t[y*bw+x]=z/c;}
    for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){let z=0,c=0;for(let j=-rad;j<=rad;j++){const Y=Math.min(bh-1,Math.max(0,y+j));z+=t[Y*bw+x];c++;}o[y*bw+x]=z/c;}return o;};
  f=blur(f,3);
  const Lf=(x,y)=>{const fx=Math.max(0,Math.min(bw-1.001,x/Bk-.5)),fy=Math.max(0,Math.min(bh-1.001,y/Bk-.5)),x0=fx|0,y0=fy|0,tx=fx-x0,ty=fy-y0;
    return f[y0*bw+x0]*(1-tx)*(1-ty)+f[y0*bw+x0+1]*tx*(1-ty)+f[(y0+1)*bw+x0]*(1-tx)*ty+f[(y0+1)*bw+x0+1]*tx*ty;};
  const ss=t=>{t=cl(t);return t*t*(3-2*t);};
  // le cuir des morceaux répétés au ton de leur raccord (colonne B ou W-1-B, rangée R), montée douce sur 40 px
  const wc=x=>{const xl=x<M?x:W-1-x;return ss((xl-(A-2*F))/F)*(xl<B+2*F?1:ss((B+3*F-xl)/F));};
  const wr=y=>ss((y-(E-2*F))/F)*(y<R+2*F?1:ss((R+3*F-y)/F));
  const refX=x=>x<M?B:W-1-B;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const a=wc(x),bb=wr(y);if(!a&&!bb)continue;
    const L0=Lf(x,y),L1=v=>v; const l1=(xx,yy)=>Lf(xx,yy)*(1-wc(xx))+Lf(refX(xx),yy)*wc(xx);
    const target=l1(x,y)*(1-bb)+l1(x,R)*bb, g=target/L0, k=(y*W+x)*4, m=mask(k);
    for(let c=0;c<3;c++)D[k+c]=Math.min(255,D[k+c]*(1+m*(g-1)));}
  // une moitié (gauche ; la droite est retournée avant et après)
  const half=(x0,x1,flip)=>{const w=x1-x0,O=new Float32Array(w*H*4);
    for(let y=0;y<H;y++)for(let x=0;x<w;x++){const sx=flip?x1-1-x:x0+x,k=(y*W+sx)*4,o=(y*w+x)*4;for(let c=0;c<4;c++)O[o+c]=D[k+c];}
    const at=(Z,x,y)=>(y*w+x)*4;
    const mixX=(Z)=>{const Y=Z.slice();for(let y=0;y<H;y++){
        for(let j=0;j<F;j++){const t=(j+1)/F;let o=at(Y,A-F+j,y),a=at(Z,A-F+j,y),bb=at(Z,B-F+j,y);for(let c=0;c<4;c++)Y[o+c]=Z[a+c]*(1-t)+Z[bb+c]*t;
          o=at(Y,A+j,y);a=at(Z,B+j,y);bb=at(Z,A+j,y);for(let c=0;c<4;c++)Y[o+c]=Z[a+c]*(1-t)+Z[bb+c]*t;}}return Y;};
    const mixY=(Z)=>{const Y=Z.slice();for(let x=0;x<w;x++){
        for(let j=0;j<F;j++){const t=(j+1)/F;let o=at(Y,x,E-F+j),a=at(Z,x,E-F+j),bb=at(Z,x,R-F+j);for(let c=0;c<4;c++)Y[o+c]=Z[a+c]*(1-t)+Z[bb+c]*t;
          o=at(Y,x,E+j);a=at(Z,x,R+j);bb=at(Z,x,E+j);for(let c=0;c<4;c++)Y[o+c]=Z[a+c]*(1-t)+Z[bb+c]*t;}}return Y;};
    const Z=mixY(mixX(O));
    const c=cv(w,H),im=new ImageData(new Uint8ClampedArray(Z.map(v=>Math.round(v))),w,H);
    if(flip){const t=cv(w,H);t.getContext("2d").putImageData(im,0,0);const g=c.getContext("2d");g.translate(w,0);g.scale(-1,1);g.drawImage(t,0,0);}else c.getContext("2d").putImageData(im,0,0);
    return c.toDataURL("image/webp",.95);};
  return {L:half(0,M,false),R:half(M,W,true),slices:{gauche:[E,M-B,H-R,A],droite:[E,A,H-R,W-M-B]},k:876/W};
 },"data:image/webp;base64,"+fs.readFileSync(src).toString("base64"));
 fs.writeFileSync(outL,Buffer.from(res.L.split(",")[1],"base64"));fs.writeFileSync(outR,Buffer.from(res.R.split(",")[1],"base64"));
 delete res.L;delete res.R;console.log(JSON.stringify(res));await b.close();})();
