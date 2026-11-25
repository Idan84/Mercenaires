// Usage : node scripts/build-scrollbar-thumb.js [dossier]   (par défaut prototype-web/assets/creation ; Playwright requis)
// Le curseur A (Idan, 2026-11-25) : tige = la barre du kit, bouts = les embouts en pointe ; la barre est recalée sur le profil
// des embouts (épaisseur et lumière, ligne par ligne) et la coupe des embouts est fondue : le raccord de lumière est continu.
const {chromium}=require("playwright"),fs=require("fs");
const path=require("path"), ROOT=path.resolve(__dirname,".."), K=ROOT+"/prototype-web/assets/kit/bordures/", OUT=process.argv[2]||ROOT+"/prototype-web/assets/creation";
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 const data=f=>"data:image/webp;base64,"+fs.readFileSync(K+f).toString("base64");
 const res=await p.evaluate(async([dD,dG,dB])=>{
  const load=async d=>{const i=new Image();i.src=d;await i.decode();const c=document.createElement("canvas");c.width=i.width;c.height=i.height;const g=c.getContext("2d");g.drawImage(i,0,0);return g.getImageData(0,0,c.width,c.height);};
  const D=await load(dD),G=await load(dG),B=await load(dB);
  const prof=(im,x0,x1)=>{const P=[];for(let y=0;y<im.height;y++){let r=0,g=0,b=0,a=0,n=0;for(let x=x0;x<=x1;x++){const k=(y*im.width+x)*4,al=im.data[k+3];r+=im.data[k]*al;g+=im.data[k+1]*al;b+=im.data[k+2]*al;a+=al;n++;}P.push(a?{r:r/a,g:g/a,b:b/a,a:a/n}:{r:0,g:0,b:0,a:0});}return P;};
  const Pd=prof(D,100,117),Pg=prof(G,85,102),Pb=prof(B,50,550);   // le bout de tige des embouts, contre le collier : là où se voit le raccord
  // profil cible : la moyenne des deux embouts
  const T=Pd.map((d,y)=>{const g=Pg[y];return {r:(d.r+g.r)/2,g:(d.g+g.g)/2,b:(d.b+g.b)/2,a:(d.a+g.a)/2};});
  // 1. la tige : la barre (lignes 4–57, 54 px) étirée sur l'épaisseur des embouts (lignes 20–80, 61 px), puis recalée ligne par ligne
  const L=480,H=102,M=new ImageData(L,H);
  for(let y=0;y<H;y++){const sy=3.5+(y+.5-19.5)*(54/61)-.5; if(sy<0||sy>61) continue; const y0=Math.floor(sy),y1=Math.min(61,y0+1),t=sy-y0;
    for(let x=0;x<L;x++){const sx=60+x;for(let c=0;c<3;c++){const v0=B.data[(y0*600+sx)*4+c],v1=B.data[(y1*600+sx)*4+c];M.data[(y*L+x)*4+c]=v0*(1-t)+v1*t;}}}
  const lum=(x)=>{let s=0,n=0;for(let y=22;y<=78;y++){const k=(y*L+x)*4;s+=.2126*M.data[k]+.7152*M.data[k+1]+.0722*M.data[k+2];n++;}return s/n;};
  const col=[...Array(L)].map((_,x)=>lum(x)), mean=col.reduce((a,b)=>a+b)/L;
  const sm=col.map((_,x)=>{let s=0,n=0;for(let i=Math.max(0,x-20);i<=Math.min(L-1,x+20);i++){s+=col[i];n++;}return s/n;});
  for(let x=0;x<L;x++){const g=mean/sm[x];for(let y=0;y<H;y++){const k=(y*L+x)*4;for(let c=0;c<3;c++)M.data[k+c]=Math.min(255,M.data[k+c]*g);}}
  for(let y=0;y<H;y++){if(T[y].a<3){for(let x=0;x<L;x++)M.data[(y*L+x)*4+3]=0;continue;}
    let r=0,g=0,bb=0;for(let x=0;x<L;x++){const k=(y*L+x)*4;r+=M.data[k];g+=M.data[k+1];bb+=M.data[k+2];}r/=L;g/=L;bb/=L;
    const gr=T[y].r/Math.max(r,1),gg=T[y].g/Math.max(g,1),gb=T[y].b/Math.max(bb,1);
    for(let x=0;x<L;x++){const k=(y*L+x)*4;M.data[k]=Math.min(255,M.data[k]*gr);M.data[k+1]=Math.min(255,M.data[k+1]*gg);M.data[k+2]=Math.min(255,M.data[k+2]*gb);M.data[k+3]=T[y].a;}}
  // 2. les embouts : leur bout de tige ramené au profil cible (plein à la coupe, rien au collier), coupe fondue sur 14 px
  const cap=(im,P,x0,x1,collar,cut,fadeDir)=>{const w=x1-x0+1,O=new ImageData(w,H);
    for(let y=0;y<H;y++)for(let x=x0;x<=x1;x++){const k=(y*im.width+x)*4,o=(y*w+x-x0)*4;
      const wgt=fadeDir>0?(x<collar?1:0):(x>collar?1:0);   // tout le bout de tige ramené au profil commun ; le collier intact
      const ok=P[y].a>3&&T[y].a>3; const f=c=>ok?1+wgt*(T[y][c]/Math.max(P[y][c],1)-1):1;
      O.data[o]=Math.min(255,im.data[k]*f("r"));O.data[o+1]=Math.min(255,im.data[k+1]*f("g"));O.data[o+2]=Math.min(255,im.data[k+2]*f("b"));
      let al=im.data[k+3]; const fe=fadeDir>0?(x-cut+.5)/14:(cut-x+.5)/14; if(fe<1) al*=Math.max(0,fe); O.data[o+3]=al;}
    return O;};
  const Ch=cap(D,Pd,100,200,119,100,1), Cb=cap(G,Pg,0,102,83,102,-1);
  // 3. à la verticale (rotation d'un quart de tour à gauche : le haut de l'image passe à gauche, côté lumière)
  const rot=(im,hover)=>{const t=document.createElement("canvas");t.width=im.width;t.height=im.height;t.getContext("2d").putImageData(im,0,0);
    const c=document.createElement("canvas");c.width=im.height;c.height=im.width;const g=c.getContext("2d");if(hover)g.filter="brightness(1.16) saturate(1.05)";g.translate(0,im.width);g.rotate(-Math.PI/2);g.drawImage(t,0,0);return c.toDataURL("image/webp",.92);};
  const out={};for(const h of [false,true]){const s=h?"-survol":"";out["haut"+s]=rot(Ch,h);out["milieu"+s]=rot(M,h);out["bas"+s]=rot(Cb,h);}
  // contrôle : écart de profil à la coupe (gauche, centre, droite de la tige)
  const at=(im,x,y)=>{const k=(y*im.width+x)*4;return .2126*im.data[k]+.7152*im.data[k+1]+.0722*im.data[k+2];};
  const ctl=[24,50,76].map(y=>({ligne:y,embout_haut:Math.round(at(Ch,18,y)),tige:Math.round([...Array(40)].reduce((s,_,i)=>s+at(M,200+i,y),0)/40),embout_bas:Math.round(at(Cb,84,y))}));
  return {out,ctl,Pd:Pd.filter((_,i)=>i%6==2).map(v=>Math.round(.2126*v.r+.7152*v.g+.0722*v.b)),Pg:Pg.filter((_,i)=>i%6==2).map(v=>Math.round(.2126*v.r+.7152*v.g+.0722*v.b)),Pb:Pb.filter((_,i)=>i%4==0).map(v=>Math.round(.2126*v.r+.7152*v.g+.0722*v.b))};
 },[data("embout-pointe-droite.webp"),data("embout-pointe-gauche.webp"),data("barre.webp")]);
 for(const [k,v] of Object.entries(res.out)) fs.writeFileSync(`${OUT}/curseur-defilement-${k}.webp`,Buffer.from(v.split(",")[1],"base64"));
 console.log("profil embout droit :",res.Pd.join(" "));console.log("profil embout gauche:",res.Pg.join(" "));console.log("profil barre        :",res.Pb.join(" "));
 console.log("contrôle à la coupe :",JSON.stringify(res.ctl));
 await b.close();})();
