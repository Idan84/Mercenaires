"use strict";

// Création du capitaine (Idan, 2026-11-12/13) : treize écrans validés sur le brouillon, ouverts par le jeu dans un cadre
// plein écran (intro-ui.js). Les données (peuples, cultures, textes, armes, portraits) et la fin (création du capitaine,
// début de la partie) passent par window.parent.captainCreationBridge ; les règles restent dans game-core
// (createCaptain, captainChoices, captainPortraitsRanked).
const B=(()=>{ try{ return window.parent!==window?window.parent.captainCreationBridge||null:null; }catch(e){ return null; } })();
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const txt=s=>esc(s).replace(/ ([:;!?»])/g,"\u202f$1").replace(/« /g,"«\u202f");
const slug=s=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const ORIGIN_LABELS={"Soldat / Guerrier / Combattant":"Guerrier","Paysan / Ouvrier":"Travailleur"};

let DATA=null;
const S={step:0,prenom:"",nom:"",people:null,culture:null,origin:null,ascendance:"",weapon:null,armor:null,spirit:null,trait:null,
  sex:"M",avatar:null,alignment:null,alignmentTouched:false,company:"",blason:null,signe:false};

// Les phrases des questions de personnalité (captain-creation-copy.json : outfits, spirits, characters).
let ARMORS=[],SPIRITS=[],TRAITS=[];
const peopleOf=()=>DATA.peoples.find(p=>p.nom===S.people)||null;
const cultureOf=()=>peopleOf()?.cultures.find(c=>c.nom===S.culture)||null;
const callName=()=>S.prenom.trim()||"capitaine";

// Les étapes ; audio : la réplique enregistrée par Cruxor (cruxor.zip, assets/creation/voix/).
const STEPS=[
  {key:"name",nav:"Nom",audio:1,parch:true,title:()=>"Quel est votre nom ?",line:()=>"Le vieux capitaine vous appelait Bob. Corrigeons ça.",ok:()=>S.prenom.trim().length>0},
  {key:"people",nav:"Peuple",audio:2,parch:true,title:()=>"De quel peuple venez-vous ?",line:()=>"Alors, capitaine… d’où venez-vous ?",ok:()=>!!S.people},
  {key:"culture",parch:true,nav:"Culture",audio:3,title:()=>"Quelle est votre culture ?",ok:()=>!!S.culture},
  {key:"origin",parch:true,nav:"Origine",audio:4,title:()=>"Quelle est votre origine sociale ?",ok:()=>!!S.origin},
  {key:"ascendance",parch:true,nav:"Ascendance",audio:5,title:()=>"Quelle est votre ascendance ?",ok:()=>true},
  {key:"weapon",parch:true,nav:"Arme",audio:6,title:()=>`Au fait Bob, euh… ${callName()}, une arme favorite ?`,ok:()=>!!S.weapon},
  {key:"armor",parch:true,nav:"Tenue",audio:7,title:()=>"Vestimentairement, vous êtes plutôt ?",ok:()=>S.armor!=null},
  {key:"spirit",parch:true,nav:"Esprit",audio:8,title:()=>"Sur le plan spirituel, vous avez des affinités ?",ok:()=>S.spirit!=null},
  {key:"trait",parch:true,nav:"Caractère",audio:9,title:()=>"Pour bien vous comprendre…",ok:()=>S.trait!=null},
  {key:"avatar",parch:true,nav:"Portrait",audio:null,title:()=>"Quel visage portera votre capitaine ?",ok:()=>S.avatar!=null||!rankedAvatars().length},
  {key:"alignment",parch:true,nav:"Alignement",audio:null,title:()=>"Quel est votre alignement ?",ok:()=>!!S.alignment},
  {key:"company",parch:true,nav:"Compagnie",audio:10,title:()=>"Comment s’appelle votre compagnie ?",ok:()=>S.blason!=null},
  {key:"recap",parch:true,nav:"Récap",audio:null,title:()=>"Prenez la chevalière",ok:()=>true}
];

// --- La voix de Cruxor : sa réplique au début de chaque écran (cruxor.zip). Aucun bouton (Idan). Le jeu la joue : le
// clic qui a ouvert la création autorise le son.
function play(){
  const n=STEPS[S.step].audio;
  B?.voice?.(n?`assets/creation/voix/cruxor-${n}.mp3`:null);
}
// Le petit son sec du mécanisme quand on relâche le bouton (Idan) : un clic synthétisé, sans fichier.
let clicCtx=null;
function clicMecanisme(){
  try{
    clicCtx=clicCtx||new (window.AudioContext||window.webkitAudioContext)();
    const ctx=clicCtx,len=Math.floor(ctx.sampleRate*.035),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,5);
    const src=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),g=ctx.createGain();
    bp.type="bandpass"; bp.frequency.value=2300; bp.Q.value=1.4; g.gain.value=.35;
    src.buffer=buf; src.connect(bp).connect(g).connect(ctx.destination); src.start();
  }catch(e){}
}
document.addEventListener("pointerup",e=>{ const b=e.target.closest?.(".btn"); if(b&&!b.disabled) clicMecanisme(); });

// --- Écrans ---
// ——— Les briques des écrans ———
// La navigation, toujours dans le parchemin, centrée en bas : « ‹ Retour » et le bouton d'Idan.
const navHtml=(ok,{retour=true,action="next",label=`Continuer <span class="fl">→</span>`}={})=>`<div class="parch-nav">${retour?`<button type="button" class="retour" data-nav="prev">‹ Retour</button>`:""}<button type="button" class="btn" data-nav="${action}" ${ok?"":"disabled"}>${label}</button></div>`;
// La lecture d'un choix : titre, description, forces, faiblesses. Chaque texte a sa place réservée (rien ne bouge).
function lectureHtml(it,{titre=true,note}={}){
  return `${titre?`<h2 class="fiche-titre"><span>${txt(it?.nom||"")}</span></h2>`:""}${note!==undefined?`<p class="usuel-note">${note&&it&&it.v===note.v?txt(note.txt):""}</p>`:""}
    <p class="fiche-texte">${txt(it?.d||"")}</p>
    <div class="fiche-cols${it&&!it.f&&!it.w?" muettes":""}"><div><b>Forces</b><p>${txt(it?.f||"")}</p></div><i></i><div><b>Faiblesses</b><p>${txt(it?.w||"")}</p></div></div>`;
}
// La lecture de l'alignement autour de la roue : forces à gauche, faiblesses à droite, le nom et la description dessous.
const roueLecture=(it,u)=>`<div class="rl-f"><b>Forces</b><p>${txt(it?.f||"")}</p></div><div class="rl-w"><b>Faiblesses</b><p>${txt(it?.w||"")}</p></div>
  <div class="rl-c"><h2 class="fiche-titre"><span>${txt(it?.nom||"")}</span></h2><p class="usuel-note">${u&&it&&it.v===u.v?txt(u.txt):""}</p><p class="fiche-texte">${txt(it?.d||"")}</p></div>`;
// Ce que chaque écran à choix propose : valeur, nom, image, textes ; lignes réservées (lt : description, lc : colonnes).
const CHOIX={
  people:{attr:"people",cur:()=>S.people,lignes:1,lt:2,lc:2,
    list:()=>DATA.peoples.map(p=>({v:p.nom,nom:p.nom,img:p.img,...p.copy}))},
  culture:{attr:"culture",cur:()=>S.culture,lignes:2,lt:2,lc:3,
    list:()=>(peopleOf()?.cultures||[]).map(c=>({v:c.nom,nom:c.nom,img:c.img,...c.copy}))},
  ascendance:{attr:"ascendance",cur:()=>S.ascendance,lignes:1,lt:2,lc:2,
    list:()=>["",...(peopleOf()?.ascendances||[])].map(a=>a?{v:a,nom:a,img:medaillon("ascendance",a),...DATA.ancestryCopy[a]}:{v:"",nom:"Aucune",img:null,d:"Le sang de votre peuple, sans mélange."})},
  origin:{attr:"origin",cur:()=>S.origin,lecture:{titre:false},
    list:()=>(cultureOf()?.origins||[]).map(o=>({v:o,nom:ORIGIN_LABELS[o]||o,...DATA.originCopy[o]}))},
  alignment:{attr:"alignment",cur:()=>S.alignment,
    apercu:v=>{ const L=$("lecture"),it=itemOf("alignment",v??S.alignment); if(!L) return; L.innerHTML=roueLecture(it,usuel()); L.classList.toggle("vide",!it); },
    list:()=>DATA.grid.flat().map(a=>({v:a,nom:a,...DATA.alignmentCopy[a]}))},
  avatar:{attr:"avatar",cur:()=>S.avatar,list:()=>[],
    apercu:v=>{ const t=$("toile"),id=v==null?(S.avatar??rankedAvatars()[0]?.id):v; if(t&&id!=null) t.style.cssText=piedStyle(id);
      t?.parentElement.classList.toggle("apercu",(v!=null&&v!==S.avatar)||S.avatar==null); }},
};
const itemOf=(key,v)=>CHOIX[key].list().find(x=>x.v===v)||null;
const medaillon=(kind,nom)=>`assets/pictos/${kind}-${slug(nom)}.webp`;
// Les grands parchemins font la largeur de la bande des étapes (de « Nom » à « Récap »), mesurée par ajusteZoom.
const BANDE="var(--bande,1200px)";
// La compagnie : nom par défaut (le texte d'exemple du champ), soixante blasons.
const CIE_DEFAUT="Les braves (enfin presque)", NB_BLASONS=60;
const blasonHD=n=>`assets/creation/blasons-hd/b${String(n).padStart(2,"0")}.webp`;
const usuel=()=>{ const c=cultureOf(); return c?.alignment?{v:c.alignment,txt:`Le plus courant chez les ${c.nom}.`}:null; };
// Survoler (ou parcourir au clavier) un choix : la lecture le montre ; en sortant, elle revient au choix fait.
let lu=null;
function apercu(v){
  const key=STEPS[S.step].key,c=CHOIX[key];
  if(!c||v===lu) return; lu=v;
  if(c.apercu) return c.apercu(v);
  const it=itemOf(key,v??c.cur()),L=$("lecture"); if(!L) return;
  L.innerHTML=lectureHtml(it,c.lecture);
  ($("fiche")||L).classList.toggle("vide",!it);
}
document.addEventListener("pointerover",e=>{ const m=e.target.closest?.("[data-lire]"); if(m) apercu(m.dataset.lire); });
document.addEventListener("pointerout",e=>{ const g=e.target.closest?.(".lecture"); if(g&&!g.contains(e.relatedTarget)) apercu(null); });
document.addEventListener("focusin",e=>{ const m=e.target.closest?.("[data-lire]"); apercu(m?m.dataset.lire:null); });

// Médaillons sur la scène, fiche (parchemin) dessous, navigation dans la fiche.
function ecranMedailles(key){
  const c=CHOIX[key],list=c.list(),cur=c.cur(),n=list.length,cols=n>6?Math.ceil(n/2):n,it=itemOf(key,cur);
  return `<div class="ecran" style="--l:860px;--lt:${c.lt};--lc:${c.lc}">
    <div class="medailles lecture" style="--c:${cols};--w:${n===6?140:166}px;--p:${n===6?134:140}px;--lignes:${c.lignes}" role="group">${list.map((x,i)=>`<button type="button" class="medaille" style="--i:${i}" data-${c.attr}="${esc(x.v)}" data-lire="${esc(x.v)}" aria-pressed="${cur===x.v}">${x.img?`<img src="${x.img}" alt="">`:`<span class="aucune" aria-hidden="true"><i></i></span>`}<span class="nom">${txt(x.nom)}</span></button>`).join("")}</div>
    <div class="parch fiche${it?"":" vide"}" id="fiche" aria-live="polite"><div id="lecture">${lectureHtml(it)}</div>${navHtml(STEPS[S.step].ok())}</div>
  </div>`;
}
// Une case du formulaire (choix unique), cochée d'une croix tracée à la plume.
const PLUME=`<svg viewBox="0 0 24 24"><path d="M4.5 4.8C9 9.6 13.5 14.2 19.6 19.4"/><path d="M18.6 3.8C13.8 9.2 9.4 13.8 4.2 19.8"/></svg>`;
const caseHtml=(attr,v,libelle,on,lire)=>`<button type="button" class="case" role="radio" aria-checked="${on}" data-${attr}="${esc(v)}"${lire?` data-lire="${esc(v)}"`:""}><span class="boite" aria-hidden="true">${PLUME}</span><span class="txt">${txt(libelle)}</span></button>`;
// Un formulaire : rubrique, corps, navigation ; l = largeur du parchemin.
const formulaire=(rubrique,corps,l,{nav,style=""}={})=>`<div class="ecran" style="--l:${typeof l==="number"?l+"px":l};${style}"><div class="parch formulaire"><div class="parch-head">${esc(rubrique)}</div><div class="corps">${corps}</div>${nav??navHtml(STEPS[S.step].ok())}</div></div>`;
// La roue des alignements (comme dans le jeu), à l'encre : Bon en haut, Mauvais en bas, Chaotique à gauche, Loyal à droite.
function roueSvg(sel,usuelV){
  const cx=180,cy=180,R=150,r=48,pt=(rad,deg)=>{const a=deg*Math.PI/180;return [cx+rad*Math.cos(a),cy+rad*Math.sin(a)];},f=p=>p.map(n=>n.toFixed(1)).join(" ");
  const attrs=v=>`data-alignment="${esc(v)}" data-lire="${esc(v)}" role="radio" tabindex="0" aria-label="${esc(v)}" aria-checked="${sel===v}"`;
  const marque=(x,y)=>`<path class="marque" d="M${x} ${y-4}l4 4-4 4-4-4z"/>`;
  const secteurs=[["Neutre bon",270],["Loyal bon",315],["Loyal neutre",0],["Loyal mauvais",45],["Neutre mauvais",90],["Chaotique mauvais",135],["Chaotique neutre",180],["Chaotique bon",225]].map(([v,ang])=>{
    const a=pt(r,ang-22.5),b=pt(R,ang-22.5),c=pt(R,ang+22.5),d=pt(r,ang+22.5),l=pt(102,ang),[m1,...m2]=v.split(" ");
    return `<g class="secteur" ${attrs(v)}><path d="M ${f(a)} L ${f(b)} A ${R} ${R} 0 0 1 ${f(c)} L ${f(d)} A ${r} ${r} 0 0 0 ${f(a)} Z"/><text x="${l[0].toFixed(1)}" y="${(l[1]-4).toFixed(1)}" text-anchor="middle"><tspan x="${l[0].toFixed(1)}">${m1}</tspan><tspan x="${l[0].toFixed(1)}" dy="15">${m2.join(" ")}</tspan></text>${v===usuelV?marque(l[0],l[1]+24):""}</g>`;
  }).join("");
  const centre=`<g class="secteur" ${attrs("Neutre")}><circle cx="${cx}" cy="${cy}" r="${r-4}"/><text x="${cx}" y="${cy+4}" text-anchor="middle">Neutre</text>${usuelV==="Neutre"?marque(cx,cy+22):""}</g>`;
  return `<svg viewBox="0 0 360 360" role="radiogroup" aria-label="Alignements">${secteurs}${centre}
    <text class="axe" x="${cx}" y="16" text-anchor="middle">BON</text><text class="axe" x="${cx}" y="355" text-anchor="middle">MAUVAIS</text>
    <text class="axe" transform="translate(14 ${cy}) rotate(-90)" text-anchor="middle">CHAOTIQUE</text><text class="axe" transform="translate(346 ${cy}) rotate(90)" text-anchor="middle">LOYAL</text></svg>`;
}

const RENDER={
  name(){
    return `<div class="parch">
      <div class="parch-head">Registre des capitaines</div>
      <h2 class="parch-title">Quel est votre nom ?</h2>
      <div class="divider haut" aria-hidden="true"><i class="orn" style="--orn:url(assets/creation/svg/fleur-de-lys.svg)"></i></div>
      <label class="lbl" for="f-prenom">Prénom</label>
      <input type="text" class="champ" id="f-prenom" maxlength="30" value="${esc(S.prenom)}" autocomplete="off" spellcheck="false">
      <label class="lbl" for="f-nom">Nom de famille <small>· facultatif</small></label>
      <input type="text" class="champ" id="f-nom" maxlength="30" value="${esc(S.nom)}" autocomplete="off" spellcheck="false">
      <div class="divider bas" aria-hidden="true"><i class="losange"></i></div>
      <button type="button" class="btn" data-nav="next" ${STEPS[S.step].ok()?"":"disabled"}>Continuer <span class="fl">→</span></button>
      <img class="cachet" src="assets/creation/cachet.webp" alt="">
    </div>`;
  },
  people(){ return ecranMedailles("people"); },
  culture(){ return peopleOf()?ecranMedailles("culture"):`<p class="vide-msg">Choisissez d’abord un peuple.</p>`; },
  origin(){
    const c=cultureOf(); if(!c) return `<p class="vide-msg">Choisissez d’abord une culture.</p>`;
    const it=itemOf("origin",S.origin);
    return formulaire("Origine sociale",`<div class="cases deux lecture" role="radiogroup">${CHOIX.origin.list().map(x=>caseHtml("origin",x.v,x.nom,S.origin===x.v,true)).join("")}</div>
      <div class="divider" aria-hidden="true"><i class="losange"></i></div><div id="lecture" class="lecture-texte${it?"":" vide"}">${lectureHtml(it,{titre:false})}</div>`,780,{style:"--lt:2;--lc:2"});
  },
  ascendance(){ return peopleOf()?ecranMedailles("ascendance"):`<p class="vide-msg">Choisissez d’abord un peuple.</p>`; },
  weapon(){
    const fams=[...new Set(DATA.weapons.map(w=>w.famille))];
    return formulaire("Arme favorite",`<div class="familles" role="radiogroup">${fams.map(f=>`<div class="famille"><h3>${esc(f)}</h3>${DATA.weapons.filter(x=>x.famille===f).map(x=>caseHtml("weapon",x.nom,x.nom,S.weapon===x.nom)).join("")}</div>`).join("")}</div>`,820);
  },
  armor(){ return formulaire("Tenue",`<div class="cases" role="radiogroup">${ARMORS.map(x=>caseHtml("armor",x.key,x.q,S.armor===x.key)).join("")}</div>`,620); },
  spirit(){ return formulaire("Vie spirituelle",`<div class="cases" role="radiogroup">${SPIRITS.map((x,i)=>caseHtml("spirit",i,x.q,S.spirit===i)).join("")}</div>`,660); },
  trait(){
    // Pas de caractéristique écrite : « la parenthèse, c'est que pour que tu codes ».
    return formulaire("Caractère",`<div class="cases" role="radiogroup">${TRAITS.map((t,i)=>caseHtml("trait",i,t.q,S.trait===i)).join("")}</div>`,680);
  },
  avatar(){
    const list=rankedAvatars(),montre=S.avatar??list[0]?.id;
    return formulaire("Portrait",`<div class="atelier">
        <div class="galerie">
          <div class="sexe" role="group">${[["M","Homme"],["F","Femme"]].map(([v,l],i)=>`${i?"<i></i>":""}<button type="button" data-sex="${v}" aria-pressed="${S.sex===v}">${l}</button>`).join("")}</div>
          ${list.length?"":`<p class="sans-portrait">Aucun portrait ne vous ressemble encore.</p>`}<div class="carres lecture">${list.map((a,n)=>`<button type="button" class="carre" style="--i:${n};${carreStyle(a.id)}" data-avatar="${esc(a.id)}" data-lire="${esc(a.id)}" aria-pressed="${S.avatar===a.id}" aria-label="Portrait ${n+1}"></button>`).join("")}</div>
        </div>
        <figure class="tableau${S.avatar==null?" apercu":""}"><span class="toile" id="toile" style="${montre!=null?piedStyle(montre):""}"></span></figure>
      </div>`,BANDE);
  },
  alignment(){
    const u=usuel(),it=itemOf("alignment",S.alignment);
    return formulaire("Alignement",`<div class="roue-zone"><div class="roue lecture">${roueSvg(S.alignment,u?.v)}</div>
      <div id="lecture" class="roue-lecture${it?"":" vide"}">${roueLecture(it,u)}</div></div>`,BANDE);
  },
  company(){
    return formulaire("Compagnie",`<div class="cie">
        <div class="blason-choisi" id="blason-choisi">${S.blason?`<img src="${blasonHD(S.blason)}" alt="">`:""}</div>
        <input type="text" class="champ" id="f-company" aria-label="Nom de la compagnie" maxlength="40" value="${esc(S.company)}" placeholder="${esc(CIE_DEFAUT)}" autocomplete="off" spellcheck="false">
        <div class="ruban-zone">
          <button type="button" class="fleche" data-defile="-1" aria-label="Blasons précédents"></button>
          <div class="ruban" id="ruban" role="group" aria-label="Blasons">${Array.from({length:NB_BLASONS},(_,i)=>`<button type="button" data-blason="${i+1}" aria-pressed="${S.blason===i+1}" aria-label="Blason ${i+1}"><img src="assets/creation/blasons/b${String(i+1).padStart(2,"0")}.webp" alt="" draggable="false"></button>`).join("")}</div>
          <button type="button" class="fleche d" data-defile="1" aria-label="Blasons suivants"></button>
        </div></div>`,BANDE);
  },
  recap(){
    const w=S.weapon,sp=SPIRITS[S.spirit],tr=TRAITS[S.trait],ar=ARMORS.find(x=>x.key===S.armor);
    const p=peopleOf(),c=cultureOf(),nom=[S.prenom.trim(),S.nom.trim()].filter(Boolean).join(" ")||"—";
    const picto=(img,label)=>`<figure>${img?`<img src="${img}" alt="">`:`<span class="aucune"></span>`}<figcaption>${txt(label)}</figcaption></figure>`;
    const rows=[["Origine",ORIGIN_LABELS[S.origin]||S.origin],["Alignement",S.alignment],["Arme favorite",w],
      ["Tenue",ar&&`<q>${txt(ar.q)}</q>`],["Esprit",sp&&`<q>${txt(sp.q)}</q>`],["Caractère",tr&&`<q>${txt(tr.q)}</q>`]];
    // Signé : le cachet se pose, puis la partie commence (le bouton y mène aussitôt).
    const nav=navHtml(true,S.signe?{retour:false,action:"partir",label:`En route <span class="fl">→</span>`}:{action:"signer",label:"Signez ici"});
    return formulaire("Registre des capitaines",`<div class="registre2">
        <figure class="tableau"><span class="toile" style="${S.avatar?piedStyle(S.avatar):""}"></span></figure>
        <div><h2 class="r-entete"><span>Capitaine ${txt(nom)}</span></h2><div class="r-cols">
        <section><div class="r-pictos">${p?picto(p.img,p.nom):""}${c?picto(c.img,c.nom):""}${S.ascendance?picto(medaillon("ascendance",S.ascendance),S.ascendance):""}</div>
          <dl>${rows.map(([k,v])=>`<dt>${k}</dt><dd>${v&&String(v).startsWith("<q>")?v:txt(v||"—")}</dd>`).join("")}</dl>
          <div class="signature"><span class="${S.signature?"trace":""}">${S.signe?txt(nom):""}</span><small>Signature</small></div></section>
        <i></i>
        <section class="r-cie"><h3 class="r-titre">La compagnie</h3>${S.blason?`<img src="${blasonHD(S.blason)}" alt="">`:""}<p>${txt(S.company.trim()||CIE_DEFAUT)}</p>${S.signe?`<img class="cachet r-cachet${S.signature?" pose":""}" src="assets/creation/cachet.webp" alt="">`:""}</section>
      </div></div></div>`,BANDE,{nav});
  }
};
// Portraits : les 12 plus proches, du même sexe (game-core/avatars.js, captainPortraitsRanked, par le jeu). Les images
// viennent du catalogue du jeu (avatars de Git et du site).
const PORTRAITS=new Map();
let portraitsCle=null,portraitsListe=[];
function rankedAvatars(){
  const cle=JSON.stringify([S.people,S.culture,S.ascendance,S.sex,S.weapon,S.spirit]);
  if(cle!==portraitsCle){
    portraitsCle=cle;
    portraitsListe=B?.portraits?.({people:S.people,culture:S.culture,ascendance:S.ascendance||null,sex:S.sex,weapon:S.weapon,spirit:S.spirit})||[];
    for(const a of portraitsListe) PORTRAITS.set(a.id,a);
  }
  return portraitsListe;
}
// Dans un attribut style="…" : l'adresse entre apostrophes (échappées), jamais entre guillemets.
const imageCss=url=>url?`url('${String(url).replace(/['\\]/g,"\\$&")}')`:"none";
function carreStyle(id){ return `background-image:${imageCss(PORTRAITS.get(id)?.portrait)};background-size:cover;background-position:center`; }
function piedStyle(id){ return `background-image:${imageCss(PORTRAITS.get(id)?.full)};background-size:cover;background-position:center top`; }

function renderSteps(){
  $("steps").innerHTML=STEPS.map((s,i)=>`<li class="${i<S.step?"done":i===S.step?"on":""}"><button type="button" data-goto="${i}" aria-current="${i===S.step?"step":"false"}" aria-label="${esc(s.nav)}"><span class="dot"></span><span class="lbl">${esc(s.nav)}</span></button></li>`).join("");
}
function render(){
  const step=STEPS[S.step];
  $("title").textContent=step.title();
  $("count").textContent=`${S.step+1} / ${STEPS.length}`;
  renderSteps();
  lu=null;
  $("panel").innerHTML=RENDER[step.key]();
  if(step.key==="name") $("f-prenom")?.focus({preventScroll:true});
  document.body.classList.toggle("parch-step",!!step.parch);
  document.body.className=document.body.className.replace(/\betape-\S+/g,"").trim()+" etape-"+step.key;
  document.body.classList.toggle("large",["avatar","alignment","company","recap"].includes(step.key));
  $("message").innerHTML=txt(step.line?step.line():step.title());
  $("panel").scrollTop=0;
  ajusteZoom();
  centreRuban(false);
  ajusteEntete();
}
// « Capitaine Prénom Nom » : sur une ligne, un peu plus petit si le nom est long ; très long, sur deux lignes (sans pointes).
function ajusteEntete(){
  const t=document.querySelector(".r-entete"); if(!t) return;
  t.classList.remove("long"); let fs=42; t.style.fontSize=fs+"px";
  while(t.scrollWidth>t.clientWidth+1&&fs>30){ fs-=2; t.style.fontSize=fs+"px"; }
  if(t.scrollWidth>t.clientWidth+1){ t.classList.add("long"); t.style.fontSize="32px"; }
}
// Le zoom du registre : l'écran le plus haut (dix médaillons et leur fiche) tient dans la hauteur, le plus large (la roue) dans
// la colonne de droite. Un seul zoom pour tous les écrans, recalculé quand la fenêtre change.
const HAUT_REGISTRE=826, LARGE_REGISTRE=880;
function ajusteZoom(){
  const st=document.querySelector(".stage").getBoundingClientRect(), col=(st.width-24)*1.18/2;
  const z=Math.max(.6,Math.min(1.5,st.height/HAUT_REGISTRE,col/LARGE_REGISTRE));
  document.body.style.setProperty("--z",z.toFixed(3));
  const l=document.querySelectorAll(".steps .lbl");
  if(l.length) document.body.style.setProperty("--bande",Math.round((l[l.length-1].getBoundingClientRect().right-l[0].getBoundingClientRect().left)/z)+"px");
}
addEventListener("resize",()=>{ ajusteZoom(); ajusteEntete(); });
// Le ruban des blasons : le choisi s'affiche en grand ; le ruban défile aux flèches, à la molette, en glissant, au clavier.
const zoomActuel=()=>parseFloat(getComputedStyle(document.body).getPropertyValue("--z"))||1;
function majOk(){
  const ok=STEPS[S.step].ok();
  const cont=document.querySelector('.panel [data-nav="next"]'); if(cont) cont.disabled=!ok;
}
function centreRuban(lisse){
  const r=$("ruban"),b=r?.querySelector(`[data-blason="${S.blason}"]`); if(!b) return;
  r.scrollTo({left:b.offsetLeft-(r.clientWidth-b.offsetWidth)/2,behavior:lisse?"smooth":"instant"});
}
function choisitBlason(n,{centre=false}={}){
  S.blason=n; majOk();
  document.querySelectorAll("#ruban [data-blason]").forEach(b=>b.setAttribute("aria-pressed",String(Number(b.dataset.blason)===n)));
  const c=$("blason-choisi"); if(c){ c.innerHTML=`<img class="change" src="${blasonHD(n)}" alt="">`; }
  if(centre) centreRuban(true);
}
let glisse=null;
document.addEventListener("wheel",e=>{
  const r=e.target.closest?.("#ruban"); if(!r) return; e.preventDefault();
  r.scrollLeft+=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)/zoomActuel();
},{passive:false});
document.addEventListener("pointerdown",e=>{ const r=e.target.closest?.("#ruban"); if(r&&e.button===0) glisse={r,x:e.clientX,sl:r.scrollLeft,bouge:false}; });
document.addEventListener("pointermove",e=>{
  if(!glisse) return; const dx=(e.clientX-glisse.x)/zoomActuel();
  if(Math.abs(dx)>5){ glisse.bouge=true; glisse.r.classList.add("glisse"); }
  if(glisse.bouge) glisse.r.scrollLeft=glisse.sl-dx;
});
document.addEventListener("pointerup",()=>{ if(glisse){ const g=glisse; setTimeout(()=>{ if(glisse===g) glisse=null; g.r.classList.remove("glisse"); },0); } });
// L'arrivée sur un écran (animations « entree ») ; la toute première est plus lente, le temps que la scène s'éclaire.
let entreeT=null;
function entree(premiere){
  document.body.classList.add("entree"); document.body.classList.toggle("premiere",premiere);
  clearTimeout(entreeT); entreeT=setTimeout(finEntree,premiere?2200:1400);
}
function finEntree(){ clearTimeout(entreeT); document.body.classList.remove("entree","premiere"); }
function go(i){
  S.step=Math.max(0,Math.min(STEPS.length-1,i));
  if(STEPS[S.step].key==="alignment"&&!S.alignmentTouched) S.alignment=cultureOf()?.alignment||S.alignment;
  if(STEPS[S.step].key==="company"&&S.blason==null) S.blason=1+Math.floor(Math.random()*NB_BLASONS);
  S.signe=false;
  entree(false); render(); play();
}

document.addEventListener("click",e=>{
  const t=e.target.closest("button,.secteur");
  if(!t) return;
  const ds=t.dataset;
  if(ds.goto!=null) return go(Number(ds.goto));
  if(ds.nav==="prev") return go(S.step-1);
  if(ds.nav==="next"){ if(STEPS[S.step].ok()) go(S.step+1); return; }
  if(ds.nav==="signer"){ S.signe=true; S.signature=true; render(); S.signature=false; departT=setTimeout(partir,2800); return; }
  if(ds.nav==="partir") return partir();
  if(ds.blason!=null){ if(!glisse?.bouge) choisitBlason(Number(ds.blason)); return; }
  if(ds.defile!=null){ const r=$("ruban"); r?.scrollBy({left:Number(ds.defile)*r.clientWidth*.8,behavior:"smooth"}); return; }
  if(ds.people!=null){ if(S.people!==ds.people){ S.people=ds.people; S.culture=null; S.origin=null; S.ascendance=""; S.avatar=null; } }
  else if(ds.culture!=null){ if(S.culture!==ds.culture){ S.culture=ds.culture; S.origin=null; S.avatar=null; } }
  else if(ds.origin!=null) S.origin=ds.origin;
  else if(ds.ascendance!=null) S.ascendance=ds.ascendance;
  else if(ds.weapon!=null){ S.weapon=ds.weapon; S.avatar=null; }
  else if(ds.armor!=null) S.armor=Number(ds.armor);
  else if(ds.spirit!=null){ S.spirit=Number(ds.spirit); S.avatar=null; }
  else if(ds.trait!=null) S.trait=Number(ds.trait);
  else if(ds.sex!=null){ S.sex=ds.sex; S.avatar=null; }
  else if(ds.avatar!=null) S.avatar=ds.avatar;
  else if(ds.alignment!=null){ S.alignment=ds.alignment; S.alignmentTouched=true; }
  else return;
  const keep=t.getAttribute("data-"+Object.keys(ds)[0].replace(/[A-Z]/g,m=>"-"+m.toLowerCase()));
  const sel=`[data-${Object.keys(ds)[0]}="${CSS.escape(keep)}"]`;
  finEntree(); render();
  const el=$("panel").querySelector(sel); el?.focus({preventScroll:true});
  if(el?.classList.contains("case")&&el.getAttribute("aria-checked")==="true") el.classList.add("trace");
});
document.addEventListener("keydown",e=>{
  if((e.key==="ArrowLeft"||e.key==="ArrowRight")&&e.target.closest?.("#ruban")){
    e.preventDefault(); const n=((S.blason??1)-1+(e.key==="ArrowLeft"?-1:1)+NB_BLASONS)%NB_BLASONS+1;
    choisitBlason(n,{centre:true}); document.querySelector(`#ruban [data-blason="${n}"]`)?.focus({preventScroll:true}); return; }
  if(e.key==="Enter"&&e.target.matches?.(".parch input")&&STEPS[S.step].ok()) go(S.step+1);
  if((e.key==="Enter"||e.key===" ")&&e.target.closest?.(".secteur")){ e.preventDefault(); e.target.closest(".secteur").dispatchEvent(new MouseEvent("click",{bubbles:true})); }
});
document.addEventListener("input",e=>{
  if(e.target.id==="f-prenom") S.prenom=e.target.value;
  else if(e.target.id==="f-nom") S.nom=e.target.value;
  else if(e.target.id==="f-company") S.company=e.target.value;
  else return;
  majOk();
});

// Signé : le jeu crée le capitaine avec ces réponses et lance la partie. S'il refuse (une partie en cours que le joueur
// garde), on revient au registre non signé.
let departT=null,parti=false;
function resultat(){
  return {prenom:S.prenom.trim(),nom:S.nom.trim(),people:S.people,culture:S.culture,origin:S.origin,ascendance:S.ascendance||null,
    alignment:S.alignment,avatar:S.avatar,company:S.company.trim()||CIE_DEFAUT,blason:S.blason,
    reponses:{weapon:S.weapon,outfit:S.armor,spirit:S.spirit,character:S.trait}};
}
function partir(){
  clearTimeout(departT);
  if(parti) return;
  parti=true;
  if(B?.finish?.(resultat())) return;
  parti=false; S.signe=false; render();
}
$("quitter").addEventListener("click",()=>B?.exit?.());

// La poussière dans le jour de la lucarne (au-dessus de Cruxor) : quelques grains lents, plus visibles dans la lumière.
(function poussiere(){
  const c=$("poussiere"); if(!c||matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx=c.getContext("2d"); let W=0,H=0,dpr=1; const grains=[];
  const taille=()=>{ dpr=Math.min(2,devicePixelRatio||1); W=innerWidth; H=innerHeight; c.width=W*dpr; c.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); };
  const neuf=(y)=>({x:W*(0.3+Math.random()*0.4),y:y??Math.random()*H*0.8,r:.5+Math.random()*1.5,vx:(Math.random()-.5)*.12,vy:-.05-Math.random()*.12,p:Math.random()*6.28,a:.25+Math.random()*.5});
  taille(); addEventListener("resize",taille);
  for(let i=0;i<70;i++) grains.push(neuf());
  (function tour(){
    ctx.clearRect(0,0,W,H);
    for(const g of grains){
      g.p+=.012; g.x+=g.vx+Math.sin(g.p)*.08; g.y+=g.vy;
      if(g.y<-10||g.x<W*.2||g.x>W*.8) Object.assign(g,neuf(H*0.8));
      // plus brillant au cœur du rai de lumière (centre de l'écran, en haut)
      const dx=(g.x-W*.5)/(W*.22), lum=Math.max(0,1-dx*dx)*(1-g.y/(H*.95));
      ctx.globalAlpha=Math.max(0,g.a*lum*(.6+.4*Math.sin(g.p*1.7)));
      ctx.fillStyle="#ffe7b8"; ctx.beginPath(); ctx.arc(g.x,g.y,g.r,0,6.283); ctx.fill();
    }
    requestAnimationFrame(tour);
  })();
})();

// Les données du jeu ; ouverte seule (sans le jeu), la page renvoie vers lui.
try{
  DATA=B.data();
  ARMORS=DATA.outfits.map((o,i)=>({key:i,q:o.phrase}));
  SPIRITS=DATA.spirits.map(x=>({q:x.phrase,ecole:x.ecole}));
  TRAITS=DATA.characters.map(x=>({q:x.phrase,stat:x.carac}));
  entree(true); render(); play();
}catch(e){
  console.error(e);
  $("panel").innerHTML=`<p class="vide-msg">La création du capitaine s’ouvre depuis le jeu : <a href="./">Nouvelle partie</a>.</p>`;
}
