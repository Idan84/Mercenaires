// Usage : node scripts/build-dialog-buttons.js [dossier]   (par défaut prototype-web/assets/creation ; Playwright requis)
// Les boutons des réponses de la boîte de dialogue (Idan, 2026-11-25 : « marron et rouge au survol », « répète le velours »).
// Source : le bouton d'Idan de la création du capitaine (assets/creation/bouton.webp, 760 × 257, tranches 64 / 128 en
// border-image) et le rond du kit (assets/kit/boutons/rond-rouge.webp).
//  - bouton-brun.webp : le bouton, velours passé au brun (teinte 28°, saturation × 0,62, valeur × 0,9 ; l'or ne bouge pas) ;
//  - bouton-rouge.webp : le bouton rouge d'origine ;
//    dans les deux, le milieu étiré par le border-image (lignes 64–192, colonnes 128–631) est lissé dans la longueur
//    (flou horizontal) : il ne garde que la lumière, qu'on peut étirer sans que ça se voie ;
//  - grain-velours.webp : le grain de ce milieu (rapport entre l'image et sa version lissée, en gris : 128 = rien), raccordé
//    bout à bout pour se répéter ; posé en « overlay » sur le milieu, il rend le grain d'origine sans jamais l'étirer ;
//  - rond-brun.webp : le rond du kit, velours passé au brun de la même façon ;
//  - bouton-brun-vertical.webp, bouton-rouge-vertical.webp : le bouton entier (brun, rouge), tourné d'un quart de tour à
//    gauche, pour la languette qui replie la fiche.
const {chromium}=require("playwright"),fs=require("fs"),path=require("path");
const ROOT=path.resolve(__dirname,".."),A=ROOT+"/prototype-web/assets/",OUT=process.argv[2]||A+"creation";
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 const data=f=>"data:image/webp;base64,"+fs.readFileSync(A+f).toString("base64");
 const res=await p.evaluate(async([dB,dR,dO])=>{
  const load=async d=>{const i=new Image();i.src=d;await i.decode();const c=document.createElement("canvas");c.width=i.width;c.height=i.height;const g=c.getContext("2d");g.drawImage(i,0,0);return g.getImageData(0,0,c.width,c.height);};
  const save=(im,q)=>{const c=document.createElement("canvas");c.width=im.width;c.height=im.height;c.getContext("2d").putImageData(im,0,0);return c.toDataURL("image/webp",q);};
  const brun=im=>{const o=new ImageData(new Uint8ClampedArray(im.data),im.width,im.height),a=o.data;
    for(let k=0;k<a.length;k+=4){if(!a[k+3])continue;const r=a[k]/255,g=a[k+1]/255,bb=a[k+2]/255,mx=Math.max(r,g,bb),mn=Math.min(r,g,bb),dl=mx-mn;
      if(dl<.04)continue;let h=mx===r?((g-bb)/dl)%6:mx===g?(bb-r)/dl+2:(r-g)/dl+4;h*=60;if(h<0)h+=360;if(!(h>=315||h<=16))continue;
      const s=(mx?dl/mx:0)*.62,v=mx*.9,H=28/60,C=v*s,X=C*(1-Math.abs(H%2-1)),m=v-C;a[k]=Math.round((C+m)*255);a[k+1]=Math.round((X+m)*255);a[k+2]=Math.round(m*255);}
    return o;};
  const B=await load(dB),R=await load(dR),W=B.width;
  const Y0=64,Y1=193,X0=128,X1=632,SIG=16,RAD=48,BAND=48,ss=t=>t*t*(3-2*t);
  const ker=[...Array(2*RAD+1)].map((_,i)=>Math.exp(-((i-RAD)**2)/(2*SIG*SIG)));
  const lum=(a,k)=>.2126*a[k]+.7152*a[k+1]+.0722*a[k+2];
  // flou horizontal de chaque ligne du milieu (avec ce qui l'entoure, pour que la lumière reste juste aux raccords)
  const blur=im=>{const out={};for(let y=Y0;y<Y1;y++){const row=new Float32Array(W*3);
      for(let x=X0-RAD;x<X1+RAD;x++){let r=0,g=0,bb=0,s=0;for(let i=-RAD;i<=RAD;i++){const xx=Math.min(W-1,Math.max(0,x+i)),k=(y*W+xx)*4,w=ker[i+RAD];r+=im.data[k]*w;g+=im.data[k+1]*w;bb+=im.data[k+2]*w;s+=w;}
        row[x*3]=r/s;row[x*3+1]=g/s;row[x*3+2]=bb/s;}
      out[y]=row;}return out;};
  // le milieu lissé ; puis, juste après lui (bord droit), le grain répété se fond dans le grain d'origine sur BAND colonnes :
  // le grain posé en CSS (répétition « round ») finit toujours sur un bout de motif entier, qui se poursuit ici sans couture
  const lisse=(im,bl)=>{const o=new ImageData(new Uint8ClampedArray(im.data),im.width,im.height);
    for(let y=Y0;y<Y1;y++){for(let x=X0;x<X1;x++){const k=(y*W+x)*4;o.data[k]=bl[y][x*3];o.data[k+1]=bl[y][x*3+1];o.data[k+2]=bl[y][x*3+2];}
      for(let j=0;j<BAND;j++){const x=X1+j,k=(y*W+x)*4,w=ss((j+1)/BAND),r=Rt[(y-Y0)*TW+j];
        for(let c=0;c<3;c++)o.data[k+c]=(1-w)*bl[y][x*3+c]*r+w*im.data[k+c];}}
    return o;};
  const brunB=brun(B),blB=blur(brunB),blR=blur(R);
  // le grain : image ÷ lissé (luminance), sur le milieu et sur les 48 colonnes avant lui (pour le raccord bout à bout)
  const ratio=(x,y)=>{const k=(y*W+x)*4,lb=.2126*blB[y][x*3]+.7152*blB[y][x*3+1]+.0722*blB[y][x*3+2];return lum(brunB.data,k)/Math.max(lb,1);};
  const TW=X1-X0,TH=Y1-Y0,G=new ImageData(TW,TH),Rt=new Float32Array(TW*TH);
  let mn=9,mx=0;
  for(let y=Y0;y<Y1;y++)for(let x=X0;x<X1;x++){let r=ratio(x,y);
    if(x>=X1-BAND){const a=ss((x-(X1-BAND)+1)/BAND);r=(1-a)*r+a*ratio(x-TW,y);}   // la fin du grain rejoint son début
    r=Math.round(Math.min(1,r/2)*255)/127.5;Rt[(y-Y0)*TW+x-X0]=r;mn=Math.min(mn,r);mx=Math.max(mx,r);const v=Math.round(Math.min(1,r/2)*255),o=((y-Y0)*TW+x-X0)*4;G.data[o]=G.data[o+1]=G.data[o+2]=v;G.data[o+3]=255;}
  // le rond, au brun
  const rond=brun(await load(dO));
  // la languette de la fiche (Idan, 2026-11-25 : « un bouton capitaine fond brun… rouge au survol ») : le bouton entier, sans
  // lissage, tourné d'un quart de tour à gauche (le haut passe à gauche, côté lumière)
  const vertical=im=>{const t=document.createElement("canvas");t.width=im.width;t.height=im.height;t.getContext("2d").putImageData(im,0,0);
    const c=document.createElement("canvas");c.width=im.height;c.height=im.width;const g=c.getContext("2d");g.translate(0,im.width);g.rotate(-Math.PI/2);g.drawImage(t,0,0);return c.toDataURL("image/webp",.92);};
  return {brun:save(lisse(brunB,blB),.92),rouge:save(lisse(R,blR),.92),grain:save(G,.95),rond:save(rond,.92),brunV:vertical(brunB),rougeV:vertical(R),plage:[mn.toFixed(2),mx.toFixed(2)]};
 },[data("creation/bouton.webp"),data("creation/bouton.webp"),data("kit/boutons/rond-rouge.webp")]);
 const w=(n,d)=>fs.writeFileSync(path.join(OUT,n),Buffer.from(d.split(",")[1],"base64"));
 w("bouton-brun.webp",res.brun);w("bouton-rouge.webp",res.rouge);w("grain-velours.webp",res.grain);w("rond-brun.webp",res.rond);w("bouton-brun-vertical.webp",res.brunV);w("bouton-rouge-vertical.webp",res.rougeV);
 console.log("grain : rapport de",res.plage[0],"à",res.plage[1]," → ",OUT);await b.close();})();
