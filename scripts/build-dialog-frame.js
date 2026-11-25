// Usage : node scripts/build-dialog-frame.js   (Playwright requis)
// Le cadre de la boîte de dialogue (Chatty, Idan, 2026-11-25 : kit « Cadre_dialogue », planche 1) en une image « 9 parts »
// pour border-image (et pour un brush 9-slice d'Unreal) : prototype-web/assets/creation/cadre-dialogue.webp.
// - les quatre coins de la planche (planche1-01, -03, -14, -15) tels quels, calés sur leurs bandes ;
// - les quatre côtés tirés des barres de la planche (planche1-02 haut, -16 bas, -07 gauche, -08 droite), hors ornements :
//   leurs lignes sont recalées sur la coupe des coins (alignement des profils de lumière, filets sur filets, cuir sur cuir)
//   puis ramenées, ligne par ligne, à la couleur moyenne des deux coins qu'elles relient ; enfin raccordées bout à bout
//   (fondu) pour se répéter sans couture (border-image-repeat : round).
// Le centre reste vide (l'ouverture). Affiche les tranches à passer à border-image-slice.
// Écrit aussi, à côté : cuir-dialogue.webp (le cuir du panneau, répétable), filet-losange-droit.webp (le filet de la
// planche 2, n° 14, en miroir), equerre-bas-gauche.webp et equerre-bas-droite.webp (l'équerre de la planche 3, n° 10,
// retournée pour les coins du bas).
const {chromium}=require("playwright"),fs=require("fs"),path=require("path");
const ROOT=path.resolve(__dirname,".."),K=ROOT+"/prototype-web/assets/kit/cadre-dialogue/",OUT=ROOT+"/prototype-web/assets/creation/cadre-dialogue.webp";
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 const L=f=>"data:image/webp;base64,"+fs.readFileSync(K+f).toString("base64");
 const ims={TL:L("planche1-01.webp"),TR:L("planche1-03.webp"),BL:L("planche1-14.webp"),BR:L("planche1-15.webp"),T:L("planche1-02.webp"),B:L("planche1-16.webp"),G:L("planche1-07.webp"),D:L("planche1-08.webp"),P:L("planche3-06.webp"),F:L("planche2-14.webp"),E:L("planche3-10.webp")};
 const res=await p.evaluate(async ims=>{
  const load=async d=>{const i=new Image();i.src=d;await i.decode();const c=document.createElement("canvas");c.width=i.width;c.height=i.height;const g=c.getContext("2d");g.drawImage(i,0,0);return g.getImageData(0,0,i.width,i.height);};
  const I={};for(const [k,d] of Object.entries(ims))I[k]=await load(d);
  // une pièce vue « en long » : get(im,u,v) où u court le long du côté et v en travers (de l'extérieur vers l'intérieur)
  const views={
    T:{len:im=>im.width,dep:im=>im.height,at:(im,u,v)=>(v*im.width+u)*4},
    B:{len:im=>im.width,dep:im=>im.height,at:(im,u,v)=>((im.height-1-v)*im.width+u)*4},
    G:{len:im=>im.height,dep:im=>im.width,at:(im,u,v)=>(u*im.width+v)*4},
    D:{len:im=>im.height,dep:im=>im.width,at:(im,u,v)=>(u*im.width+(im.width-1-v))*4}};
  // profil moyen (r,g,b,a par ligne en travers) sur une plage le long du côté
  const profile=(im,side,u0,u1)=>{const V=views[side],n=V.dep(im),P=[];for(let v=0;v<n;v++){let r=0,g=0,bb=0,a=0,c=0;for(let u=u0;u<=u1;u++){const q=V.at(im,u,v),al=im.data[q+3];r+=im.data[q]*al;g+=im.data[q+1]*al;bb+=im.data[q+2]*al;a+=al;c++;}P.push(a?{r:r/a,g:g/a,b:bb/a,a:a/c}:{r:0,g:0,b:0,a:0});}return P;};
  const lumP=P=>P.map(q=>q.a>128?.3*q.r+.59*q.g+.11*q.b:-1);
  const span=P=>{let s=P.findIndex(q=>q.a>128),e=P.length-1;while(e>0&&P[e].a<=128)e--;return [s,e];};
  // DTW : chaque ligne de la cible reçoit la ligne de la barre qui lui correspond
  const dtw=(src,dst)=>{const n=src.length,m=dst.length,C=new Float64Array((n+1)*(m+1)).fill(Infinity);C[0]=0;
    for(let i=1;i<=n;i++)for(let j=1;j<=m;j++){const d=Math.abs(src[i-1]-dst[j-1]);C[i*(m+1)+j]=d+Math.min(C[(i-1)*(m+1)+j],C[i*(m+1)+j-1],C[(i-1)*(m+1)+j-1]);}
    const map=[...Array(m)].map(()=>[]);let i=n,j=m;while(i>0&&j>0){map[j-1].push(i-1);const a=C[(i-1)*(m+1)+j-1],b2=C[(i-1)*(m+1)+j],c=C[i*(m+1)+j-1];if(a<=b2&&a<=c){i--;j--;}else if(b2<=c)i--;else j--;}
    return map.map(l=>l[Math.floor(l.length/2)]);};
  // les coins : leur bande sur chaque côté (profil au ras de la coupe, sur 26 px)
  const W=v=>v.width,H=v=>v.height;
  const cut={ // côté : [coin du début, plage le long près de la coupe], [coin de fin, plage]
    T:[[I.TL,"T",W(I.TL)-30,W(I.TL)-4],[I.TR,"T",4,30]],
    B:[[I.BL,"B",W(I.BL)-30,W(I.BL)-4],[I.BR,"B",4,30]],
    G:[[I.TL,"G",H(I.TL)-30,H(I.TL)-4],[I.BL,"G",4,30]],
    D:[[I.TR,"D",H(I.TR)-30,H(I.TR)-4],[I.BR,"D",4,30]]};
  const bars={T:[I.T,[[20,240],[595,815]]],B:[I.B,[[20,240],[595,815]]],G:[I.G,[[8,236],[240,468]]],D:[I.D,[[8,236],[240,468]]]};
  const strips={},info={};
  for(const side of ["T","B","G","D"]){
    const [c1,c2]=cut[side],P1=profile(...c1.slice(0,1),c1[1],c1[2],c1[3]),P2=profile(c2[0],c2[1],c2[2],c2[3]);
    const [s1,e1]=span(P1),[s2,e2]=span(P2);
    // la bande commune : celle du premier coin ; le second y est recalé (décalage d'alignement)
    const off=s2-s1,depth=e1-s1+1,target=[];for(let v=0;v<depth;v++){const a=P1[s1+v],q=P2[s1+v+off]||a;target.push({r:(a.r+q.r)/2,g:(a.g+q.g)/2,b:(a.b+q.b)/2,a:(a.a+q.a)/2});}
    const [bar,segs]=bars[side],V=views[side],PB=profile(bar,side,segs[0][0],segs[0][1]),[sb,eb]=span(PB);
    const tl=target.map(q=>.3*q.r+.59*q.g+.11*q.b),raw=dtw(lumP(PB).slice(sb,eb+1),tl);
    // ancres : les lignes où la lumière change vite (bords des filets) ; entre elles, la barre est étirée en douceur
    // (positions fractionnaires) : le cuir n'est jamais fait de la même ligne répétée
    const anc=[[0,raw[0]]];for(let v=2;v<depth-2;v++)if(Math.abs(tl[v+1]-tl[v-1])>30&&raw[v]>anc[anc.length-1][1]&&v-anc[anc.length-1][0]>=2)anc.push([v,raw[v]]);
    if(raw[depth-1]>anc[anc.length-1][1])anc.push([depth-1,raw[depth-1]]);else anc[anc.length-1]=[depth-1,raw[depth-1]];
    const map=[...Array(depth)].map((_,v)=>{let k=0;while(k<anc.length-2&&anc[k+1][0]<v)k++;const [v0,m0]=anc[k],[v1,m1]=anc[Math.min(k+1,anc.length-1)];return v1===v0?m0:m0+(m1-m0)*(v-v0)/(v1-v0);});
    // la bande tirée de la barre : les deux morceaux bout à bout (fondu F), puis le bout fondu dans le début (raccord)
    const F=24,parts=segs.map(([u0,u1])=>[...Array(u1-u0+1)].map((_,k)=>u0+k));
    const seq=[];parts[0].forEach(u=>seq.push([[u,1]]));
    for(let k=0;k<parts[1].length;k++){const u=parts[1][k];if(k<F){const t=(k+1)/(F+1),last=seq[seq.length-F+k];last.push([u,t]);last[0][1]=1-t;}else seq.push([[u,1]]);}
    const len=seq.length-F;for(let k=0;k<F;k++){const t=(k+1)/(F+1);const head=seq[k];const tail=seq[len+k];seq[k]=[...tail.map(([u,w])=>[u,w*(1-t)]),...head.map(([u,w])=>[u,w*t])];}
    seq.length=len;
    const S=new Float32Array(len*depth*4);
    for(let x=0;x<len;x++)for(let v=0;v<depth;v++){const fv=sb+map[v],v0=Math.floor(fv),v1=Math.min(V.dep(bar)-1,v0+1),fr=fv-v0;let r=0,g=0,bb=0,a=0;
      for(const [u,w] of seq[x])for(const [sv,ww] of [[v0,1-fr],[v1,fr]]){const q=V.at(bar,u,sv),k=w*ww;r+=bar.data[q]*k;g+=bar.data[q+1]*k;bb+=bar.data[q+2]*k;a+=bar.data[q+3]*k;}
      const o=(v*len+x)*4;S[o]=r;S[o+1]=g;S[o+2]=bb;S[o+3]=a;}
    // chaque ligne ramenée à la couleur moyenne des coins ; alpha des coins
    for(let v=0;v<depth;v++){let r=0,g=0,bb=0;for(let x=0;x<len;x++){const o=(v*len+x)*4;r+=S[o];g+=S[o+1];bb+=S[o+2];}r/=len;g/=len;bb/=len;
      const t=target[v],gr=t.r/Math.max(r,1),gg=t.g/Math.max(g,1),gb=t.b/Math.max(bb,1);
      for(let x=0;x<len;x++){const o=(v*len+x)*4;S[o]=Math.min(255,S[o]*gr);S[o+1]=Math.min(255,S[o+1]*gg);S[o+2]=Math.min(255,S[o+2]*gb);S[o+3]=t.a;}}
    strips[side]={S,len,depth,start:s1};info[side]={bande:[s1,e1],decalage_second_coin:off,longueur:len};}
  // assemblage : coins aux angles, bandes entre eux, centre vide
  const Lw=Math.max(W(I.TL),W(I.BL)),Rw=Math.max(W(I.TR),W(I.BR)),Th=H(I.TL),Bh=H(I.BL);
  const Eh=Math.min(strips.T.len,strips.B.len),Ev=Math.min(strips.G.len,strips.D.len);
  const CW=Lw+Eh+Rw,CH=Th+Ev+Bh,c=document.createElement("canvas");c.width=CW;c.height=CH;const g=c.getContext("2d");
  const put=(im,x,y)=>{const t=document.createElement("canvas");t.width=im.width;t.height=im.height;t.getContext("2d").putImageData(im,0,0);g.drawImage(t,x,y);};
  const draw=(side,x0,y0,len)=>{const st=strips[side],im=g.getImageData(0,0,CW,CH);
    for(let x=0;x<len;x++)for(let v=0;v<st.depth;v++){const o=(v*st.len+x)*4;let X,Y;const d=st.start+v;
      if(side==="T"){X=x0+x;Y=d;}else if(side==="B"){X=x0+x;Y=CH-1-d;}else if(side==="G"){X=d;Y=y0+x;}else{X=CW-1-d;Y=y0+x;}
      const q=(Y*CW+X)*4;im.data[q]=st.S[o];im.data[q+1]=st.S[o+1];im.data[q+2]=st.S[o+2];im.data[q+3]=st.S[o+3];}
    g.putImageData(im,0,0);};
  // les bandes passent sous les coins (CUT px rognés au bout coupé de chaque coin, puis FADE px fondus) : la bande sous le
  // coin est la suite de son motif (il se répète bout à bout), donc le raccord est continu
  const CUT=4,FADE=12,ext=CUT+FADE;
  const drawWrap=(side,from,to,origin,len)=>{const st=strips[side],im=g.getImageData(0,0,CW,CH);
    for(let P=from;P<to;P++){const x=((P-origin)%st.len+st.len)%st.len;for(let v=0;v<st.depth;v++){const o=(v*st.len+x)*4,d=st.start+v;let X,Y;
      if(side==="T"){X=P;Y=d;}else if(side==="B"){X=P;Y=CH-1-d;}else if(side==="G"){X=d;Y=P;}else{X=CW-1-d;Y=P;}
      if(X<0||Y<0||X>=CW||Y>=CH)continue;const q=(Y*CW+X)*4;im.data[q]=st.S[o];im.data[q+1]=st.S[o+1];im.data[q+2]=st.S[o+2];im.data[q+3]=st.S[o+3];}}
    g.putImageData(im,0,0);};
  drawWrap("T",Lw-ext-24,CW-Rw+ext+24,Lw,Eh);drawWrap("B",Lw-ext-24,CW-Rw+ext+24,Lw,Eh);drawWrap("G",Th-ext-24,CH-Bh+ext+24,Th,Ev);drawWrap("D",Th-ext-24,CH-Bh+ext+24,Th,Ev);
  // un coin, rogné et fondu sur ses deux bouts coupés (côté dx : vers la droite si +1, la gauche si -1 ; dy pareil)
  const feather=(im,dx,dy)=>{const o=new ImageData(new Uint8ClampedArray(im.data),im.width,im.height);
    for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const ex=dx>0?im.width-1-x:x,ey=dy>0?im.height-1-y:y;
      const f=Math.min(1,Math.max(0,(ex-CUT)/FADE)),h=Math.min(1,Math.max(0,(ey-CUT)/FADE)),q=(y*im.width+x)*4;o.data[q+3]*=Math.min(f,h);}
    return o;};
  // Les volutes des coins (Idan, 2026-11-25 : « reprends son exemple ») : le parchemin et le panneau du bas passent
  // par-dessus l'intérieur du cadre, et couperaient les volutes en deux ; on les remplace par du cuir du même coin
  // (pris dans sa bande, répété, fondu sur 6 px) ; les petits ornements de la planche se posent à part.
  const unswirl=(im,mx,my)=>{const o=new ImageData(new Uint8ClampedArray(im.data),im.width,im.height),W2=im.width,H2=im.height;
    const at=(u,v)=>{const x=mx?W2-1-u:u,y=my?H2-1-v:v;return (y*W2+x)*4;},lumq=q=>.3*im.data[q]+.59*im.data[q+1]+.11*im.data[q+2];
    // la zone : au-delà des filets (u, v ≥ 31) et du filet du chanfrein (u + v ≥ 88), jusqu'à 101
    const U0=31,U1=101,inR=(u,v)=>u>=U0&&v>=U0&&u<=U1&&v<=U1&&u+v>=88,F=5;
    // teinte : moyenne locale du seul cuir (pixels sombres) dans un rayon de 12 px ; grain : celui du cuir de la bande
    // (u 110–170, v 35–75), moins sa propre moyenne locale
    const PU0=110,PU=60,PV0=35,PV=40,patchQ=(u,v)=>at(PU0+((u%PU)+PU)%PU,PV0+((v%PV)+PV)%PV);
    const patchMean=(u,v)=>{let r=0,g=0,b2=0,n=0;for(let dv=-5;dv<=5;dv++)for(let du=-5;du<=5;du++){const q=patchQ(u+du,v+dv);r+=im.data[q];g+=im.data[q+1];b2+=im.data[q+2];n++;}return [r/n,g/n,b2/n];};
    for(let v=U0;v<=U1;v++)for(let u=U0;u<=U1;u++){if(!inR(u,v))continue;
      let r=0,g=0,b2=0,n=0;for(let dv=-12;dv<=12;dv++)for(let du=-12;du<=12;du++){const uu=u+du,vv=v+dv;if(uu<0||vv<0||uu>=150||vv>=H2)continue;const q=at(uu,vv);if(im.data[q+3]<200||lumq(q)>=46)continue;r+=im.data[q];g+=im.data[q+1];b2+=im.data[q+2];n++;}
      if(!n)continue;r/=n;g/=n;b2/=n;const pm=patchMean(u-U0,v-U0),pq=patchQ(u-U0,v-U0),q=at(u,v);
      const e=Math.min(U1-u,U1-v),w=Math.min(1,(e+1)/F);   // contre les filets : remplacé en entier ; fondu côté cuir seulement
      const nv=[r+im.data[pq]-pm[0],g+im.data[pq+1]-pm[1],b2+im.data[pq+2]-pm[2]];
      for(let c=0;c<3;c++)o.data[q+c]=o.data[q+c]*(1-w)+nv[c]*w;}
    return o;};
  I.TL=unswirl(I.TL,false,false);I.TR=unswirl(I.TR,true,false);I.BL=unswirl(I.BL,false,true);I.BR=unswirl(I.BR,true,true);
  put(feather(I.TL,1,1),0,0);
  put(feather(I.TR,-1,1),CW-W(I.TR),-info.T.decalage_second_coin);
  put(feather(I.BL,1,-1),-info.G.decalage_second_coin,CH-H(I.BL));
  put(feather(I.BR,-1,-1),CW-W(I.BR)+info.D.decalage_second_coin,CH-H(I.BR)+info.B.decalage_second_coin);
  // Le cuir du panneau (Idan, 2026-11-25 : « reprends son exemple ») : l'intérieur de la plaque de la planche 3 (n° 6),
  // raccordé bout à bout dans les deux sens (fondu de 30 px en large, 16 px en haut) pour se répéter sans couture.
  const leather=(im,x0,y0,w,h,fx,fy)=>{const o=new ImageData(w,h),src=(x,y)=>((y0+y)*im.width+x0+x)*4;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){let acc=[0,0,0],tot=0;
      const ax=x<fx?(x+1)/(fx+1):1,ay=y<fy?(y+1)/(fy+1):1;
      for(const [xx,wx] of [[x,ax],[x+w,1-ax]])for(const [yy,wy] of [[y,ay],[y+h,1-ay]]){const k=wx*wy;if(!k)continue;const q=src(xx,yy);acc[0]+=im.data[q]*k;acc[1]+=im.data[q+1]*k;acc[2]+=im.data[q+2]*k;tot+=k;}
      const q=(y*w+x)*4;o.data[q]=acc[0]/tot;o.data[q+1]=acc[1]/tot;o.data[q+2]=acc[2]/tot;o.data[q+3]=255;}
    return o;};
  const toUrl=(im,q)=>{const t=document.createElement("canvas");t.width=im.width;t.height=im.height;t.getContext("2d").putImageData(im,0,0);return t.toDataURL("image/webp",q);};
  const flip=(im,h,v)=>{const t=document.createElement("canvas");t.width=im.width;t.height=im.height;t.getContext("2d").putImageData(im,0,0);
    const c2=document.createElement("canvas");c2.width=im.width;c2.height=im.height;const g2=c2.getContext("2d");g2.translate(h?im.width:0,v?im.height:0);g2.scale(h?-1:1,v?-1:1);g2.drawImage(t,0,0);return c2.toDataURL("image/webp",.95);};
  // la plaque est plus sombre vers ses bords : on retire sa lumière (moyenne par ligne et par colonne ramenée à la moyenne
  // générale) avant de la répéter, sinon elle ferait des bandes
  const flatten=im=>{const W3=im.width,H3=im.height,o=new ImageData(new Uint8ClampedArray(im.data),W3,H3),L3=q=>.3*o.data[q]+.59*o.data[q+1]+.11*o.data[q+2];
    for(const pass of ["ligne","colonne"]){const n=pass==="ligne"?H3:W3,m=pass==="ligne"?W3:H3,mean=[];let all=0;
      for(let i=0;i<n;i++){let t=0;for(let j=0;j<m;j++)t+=L3(((pass==="ligne"?i:j)*W3+(pass==="ligne"?j:i))*4);mean.push(t/m);all+=t/m;}all/=n;
      const sm=mean.map((_,i)=>{let t=0,c=0;for(let k=-4;k<=4;k++){const ii=Math.min(n-1,Math.max(0,i+k));t+=mean[ii];c++;}return t/c;});
      for(let i=0;i<n;i++){const g=all/Math.max(1,sm[i]);for(let j=0;j<m;j++){const q=((pass==="ligne"?i:j)*W3+(pass==="ligne"?j:i))*4;for(let c=0;c<3;c++)o.data[q+c]=Math.min(255,o.data[q+c]*g);}}}
    return o;};
  const extra={cuir:toUrl(flatten(leather(I.P,60,34,400,66,30,14)),.9),filetDroit:flip(I.F,true,false),equerreBG:flip(I.E,false,true),equerreBD:flip(I.E,true,true)};
  return {url:c.toDataURL("image/webp",.95),CW,CH,slice:{haut:Th,droite:Rw,bas:Bh,gauche:Lw},info,extra};
 },ims);
 fs.writeFileSync(OUT,Buffer.from(res.url.split(",")[1],"base64"));
 const C=path.dirname(OUT),w=(n,d)=>fs.writeFileSync(path.join(C,n),Buffer.from(d.split(",")[1],"base64"));
 w("cuir-dialogue.webp",res.extra.cuir);w("filet-losange-droit.webp",res.extra.filetDroit);w("equerre-bas-gauche.webp",res.extra.equerreBG);w("equerre-bas-droite.webp",res.extra.equerreBD);
 console.log("cadre-dialogue.webp",res.CW+"×"+res.CH,"tranches",JSON.stringify(res.slice),"\n",JSON.stringify(res.info));await b.close();})();
