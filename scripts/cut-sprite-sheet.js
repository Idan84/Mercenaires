// Usage : node scripts/cut-sprite-sheet.js <planche.png> <dossier de sortie> [préfixe] [écart=6] [aire min=400]
// Découpe une planche de pièces détourées (fond transparent) en une image WebP par pièce : les pixels non transparents
// (alpha > 8) qui se touchent à « écart » px près forment une pièce (une ombre douce reste avec sa pièce). Les pièces sont
// numérotées de haut en bas, puis de gauche à droite ; un index.json donne la place et la taille de chacune sur la planche.
const {chromium}=require("playwright"),fs=require("fs"),path=require("path");
const [src,out,prefix="piece",gapArg="6",minArg="400"]=process.argv.slice(2);
if(!src||!out){console.error("Usage : node scripts/cut-sprite-sheet.js <planche.png> <dossier> [préfixe] [écart] [aire min]");process.exit(1);}
fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 const d="data:image/png;base64,"+fs.readFileSync(src).toString("base64");
 const res=await p.evaluate(async([d,gap,minArea])=>{
  const i=new Image();i.src=d;await i.decode();const W=i.width,H=i.height,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");g.drawImage(i,0,0);
  const D=g.getImageData(0,0,W,H).data,on=new Uint8Array(W*H);for(let k=0;k<W*H;k++)on[k]=D[k*4+3]>8?1:0;
  // grille grossière (cases de « gap » px) pour relier les pixels proches, puis composantes connexes sur cette grille
  const C=Math.max(1,gap),gw=Math.ceil(W/C),gh=Math.ceil(H/C),cell=new Uint8Array(gw*gh);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(on[y*W+x])cell[Math.floor(y/C)*gw+Math.floor(x/C)]=1;
  const lab=new Int32Array(gw*gh).fill(-1),boxes=[];
  for(let s=0;s<gw*gh;s++){if(!cell[s]||lab[s]>=0)continue;const id=boxes.length,st=[s];lab[s]=id;let x0=1e9,y0=1e9,x1=-1,y1=-1;
    while(st.length){const q=st.pop(),qx=q%gw,qy=(q-qx)/gw;x0=Math.min(x0,qx);x1=Math.max(x1,qx);y0=Math.min(y0,qy);y1=Math.max(y1,qy);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=qx+dx,ny=qy+dy;if(nx<0||ny<0||nx>=gw||ny>=gh)continue;const n=ny*gw+nx;if(cell[n]&&lab[n]<0){lab[n]=id;st.push(n);}}}
    boxes.push({id,x0:x0*C,y0:y0*C,x1:Math.min(W-1,x1*C+C-1),y1:Math.min(H-1,y1*C+C-1)});}
  const pieces=[];
  for(const bx of boxes){let a=0,X0=1e9,Y0=1e9,X1=-1,Y1=-1;
    for(let y=bx.y0;y<=bx.y1;y++)for(let x=bx.x0;x<=bx.x1;x++){if(!on[y*W+x])continue;if(lab[Math.floor(y/C)*gw+Math.floor(x/C)]!==bx.id)continue;a++;X0=Math.min(X0,x);X1=Math.max(X1,x);Y0=Math.min(Y0,y);Y1=Math.max(Y1,y);}
    if(a<minArea)continue;
    const w=X1-X0+1,h=Y1-Y0+1,o=document.createElement("canvas");o.width=w;o.height=h;const og=o.getContext("2d"),im=g.getImageData(X0,Y0,w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const L=lab[Math.floor((y+Y0)/C)*gw+Math.floor((x+X0)/C)];if(L!==bx.id)im.data[(y*w+x)*4+3]=0;}
    og.putImageData(im,0,0);pieces.push({x:X0,y:Y0,w,h,aire:a,url:o.toDataURL("image/webp",.95)});}
  pieces.sort((p,q)=>Math.abs(p.y-q.y)>30?p.y-q.y:p.x-q.x);
  return {W,H,pieces};
 },[d,Number(gapArg),Number(minArg)]);
 const index=res.pieces.map((pc,n)=>{const name=`${prefix}-${String(n+1).padStart(2,"0")}.webp`;fs.writeFileSync(path.join(out,name),Buffer.from(pc.url.split(",")[1],"base64"));return {fichier:name,x:pc.x,y:pc.y,largeur:pc.w,hauteur:pc.h};});
 fs.writeFileSync(path.join(out,prefix+".json"),JSON.stringify({planche:path.basename(src),largeur:res.W,hauteur:res.H,pieces:index},null,1)+"\n");
 console.log(path.basename(src),"→",index.length,"pièces");await b.close();})();
