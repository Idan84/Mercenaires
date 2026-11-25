// Usage : node scripts/build-gold-icon.js <icône source> <icône dorée>   (chemins depuis prototype-web/assets ; Playwright requis)
// Passe une icône en métal gris à l'or du kit d'Idan (Idan, 2026-11-25 : « tu peux la passer en doré ») : chaque pixel
// garde sa lumière et prend la couleur de l'or du cadre rond du kit (assets/kit/boutons/rond-cadre.webp) au même niveau
// de lumière ; les lumières de l'icône sont d'abord recalées sur celles de l'or (du 2e au 98e centile). Le relief reste.
const {chromium}=require("playwright"),fs=require("fs"),path=require("path");
const A=path.resolve(__dirname,"../prototype-web/assets")+"/",[src,dst]=process.argv.slice(2);
if(!src||!dst){console.error("Usage : node scripts/build-gold-icon.js <source> <destination>");process.exit(1);}
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 const data=f=>"data:image/webp;base64,"+fs.readFileSync(A+f).toString("base64");
 const out=await p.evaluate(async([dI,dG])=>{
  const load=async d=>{const i=new Image();i.src=d;await i.decode();const c=document.createElement("canvas");c.width=i.width;c.height=i.height;const g=c.getContext("2d");g.drawImage(i,0,0);return g.getImageData(0,0,c.width,c.height);};
  const I=await load(dI),G=await load(dG),lum=(a,k)=>.2126*a[k]+.7152*a[k+1]+.0722*a[k+2];
  // la table de l'or : couleur moyenne de l'anneau pour chaque niveau de lumière
  const sum=[...Array(256)].map(()=>[0,0,0,0]);const gl=[];
  for(let k=0;k<G.data.length;k+=4){if(G.data[k+3]<230)continue;const l=Math.round(lum(G.data,k));gl.push(l);const s=sum[l];s[0]+=G.data[k];s[1]+=G.data[k+1];s[2]+=G.data[k+2];s[3]++;}
  let lut=sum.map(s=>s[3]>=8?[s[0]/s[3],s[1]/s[3],s[2]/s[3]]:null);
  const known=lut.map((v,i)=>v?i:-1).filter(i=>i>=0);
  lut=lut.map((v,i)=>{if(v)return v;const lo=[...known].reverse().find(j=>j<i),hi=known.find(j=>j>i);
    if(lo==null)return lut[hi].map(c=>c*i/Math.max(hi,1));if(hi==null)return lut[lo].map(c=>Math.min(255,c+(i-lo)));const t=(i-lo)/(hi-lo);return lut[lo].map((c,n)=>c*(1-t)+lut[hi][n]*t);});
  lut=lut.map((_,i)=>{let r=0,g=0,bb=0,n=0;for(let j=Math.max(0,i-3);j<=Math.min(255,i+3);j++){r+=lut[j][0];g+=lut[j][1];bb+=lut[j][2];n++;}return [r/n,g/n,bb/n];});
  const pct=(arr,q)=>{const s=[...arr].sort((a,b)=>a-b);return s[Math.floor(q*(s.length-1))];};
  const il=[];for(let k=0;k<I.data.length;k+=4)if(I.data[k+3]>200)il.push(lum(I.data,k));
  const i0=pct(il,.02),i1=pct(il,.98),g0=pct(gl,.02),g1=pct(gl,.98);
  const O=new ImageData(new Uint8ClampedArray(I.data),I.width,I.height);
  for(let k=0;k<O.data.length;k+=4){if(!O.data[k+3])continue;const l=Math.max(0,Math.min(255,Math.round(g0+(lum(I.data,k)-i0)*(g1-g0)/Math.max(1,i1-i0))));
    const c=lut[l];O.data[k]=c[0];O.data[k+1]=c[1];O.data[k+2]=c[2];}
  const c=document.createElement("canvas");c.width=O.width;c.height=O.height;c.getContext("2d").putImageData(O,0,0);
  return {url:c.toDataURL("image/webp",.92),plage:[i0,i1,g0,g1].map(Math.round)};
 },[data(src),data("kit/boutons/rond-cadre.webp")]);
 fs.writeFileSync(A+dst,Buffer.from(out.url.split(",")[1],"base64"));
 console.log("lumières de l'icône",out.plage.slice(0,2).join("–"),"→ or",out.plage.slice(2).join("–")," : ",dst);await b.close();})();
