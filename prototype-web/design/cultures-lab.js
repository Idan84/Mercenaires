"use strict";

// Design Lab — onglet Cultures (Idan, 2026-11-18 : « comme pour l'artefact avatar au survol, on va personnaliser pour
// chaque culture … un gros artefact (si on arrive à le relier au site directement c'est top) pour personnaliser pour chaque
// culture les différents panneaux (3 aujourd'hui : UX principale / Fiche mercenaire au survol / Fiche mercenaire
// complète) »). Pour une culture et un panneau, les réglages de son kit (data/reference/culture-kits.json : « barres »,
// « fiche », « plein ») et l'aperçu du jeu lui-même (prototype-web/apercu-ui.js : le jeu ouvert avec ?apercu, une partie
// de démonstration avec un capitaine de cette culture), à la résolution choisie. « Enregistrer » range les réglages sur
// Hostinger (design/api/reglages.php → media/reglages/) ; JC les intègre ensuite au jeu. On repart du dernier
// enregistrement de la culture, sinon des valeurs du jeu.
const CulturesLab=(()=>{
  const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const slug=name=>String(name??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
  const anchor=cle=>"cult-"+cle;
  const clone=o=>o==null?o:JSON.parse(JSON.stringify(o));
  const RES=[[1280,720],[1366,768],[1600,900],[1920,1080],[1920,1200],[2560,1080],[2560,1440],[3440,1440],[3840,2160]];
  const PANNEAUX=[{cle:"barres",titre:"Barres du camp"},{cle:"fiche",titre:"Fiche au survol"},{cle:"plein",titre:"Fiche complète"}];
  const PLEIN_DEFAUT={largeur:"ecran",haut:150,gauche:440,marge:0,cadre:{ep:20},separations:{ep:20},ornements:{echelle:1}};
  const ANGLES={hg:{nom:"Haut gauche",sx:-1,sy:-1},hd:{nom:"Haut droit",sx:1,sy:-1},bd:{nom:"Bas droit",sx:1,sy:1},bg:{nom:"Bas gauche",sx:-1,sy:1}};
  const NOMS={miroir:"miroir",rotation:"tourné",aucune:"aucune",aucun:"aucun",bande:"la bande du cadre",barre:"la barre du milieu",
    clair:"clair",or:"doré",dore:"doré",cuir:"cuir",uni:"noir uni",ecran:"tout l'écran","16:9":"plafonnée à 16:9",
    "bas-page":"bas de la page","bas-centre":"bas au centre","bas-portrait":"bas du portrait","haut-page":"haut de la page",
    "haut-centre":"haut au centre","haut-portrait":"haut du portrait","sous-nom":"sous le nom","coin-g":"coin haut gauche",
    "coin-d":"coin haut droit",separation:"séparation",gauche:"bord gauche",droite:"bord droit",bas:"bord bas",haut:"bord haut",
    "sur-bas-gauche":"sur la barre du bas, à gauche","sur-bas-droite":"sur la barre du bas, à droite",
    "sous-haut-gauche":"sous la barre du haut, à gauche","sous-haut-centre":"sous la barre du haut, au centre",
    "sous-haut-droite":"sous la barre du haut, à droite","sur-haut":"sur la barre du haut","sur-bas":"sur la barre du bas",
    riche:"riche",leger:"léger",courbe:"courbe"};
  const nom=v=>NOMS[v]??String(v).charAt(0).toUpperCase()+String(v).slice(1);
  const PREFS="cultures-lab";
  const state={data:null,cle:null,panneau:"plein",res:"1920x1080",edits:{},bases:{},pret:false,frame:null,timer:null,onOpen:null,ecoute:false};
  try{ Object.assign(state,JSON.parse(localStorage.getItem(PREFS)||"{}")); }catch(e){}
  state.pret=false;state.frame=null;state.edits={};state.bases={};
  const prefs=()=>{ try{ localStorage.setItem(PREFS,JSON.stringify({panneau:state.panneau,res:state.res})); }catch(e){} };

  // ---- Les données : les 32 cultures, les kits, les enregistrements déjà faits ----
  async function compute(){
    const get=async url=>{const r=await fetch(url,{cache:"no-store"});if(!r.ok) throw new Error(url+" introuvable ("+r.status+")");return r.json();};
    const [kits,cultures]=await Promise.all([get("/data/culture-kits.json"),get("/data/cultures.json")]);
    let reglages=[];
    try{ const r=await fetch("/media/reglages/index.json?t="+Date.now(),{cache:"no-store"}); if(r.ok) reglages=(await r.json()).reglages||[]; }catch(e){}
    const parCulture=Object.fromEntries((kits.rows||[]).map(k=>[k.culture,k]));
    const liste=(cultures.rows||[]).map(c=>({nom:c.nom,peuples:c.peuples,cle:parCulture[c.nom]?.cle||slug(c.nom),kit:parCulture[c.nom]||null}))
      .sort((a,b)=>Number(Boolean(b.kit))-Number(Boolean(a.kit))||String(a.peuples).localeCompare(String(b.peuples),"fr")||a.nom.localeCompare(b.nom,"fr"));
    return {cultures:liste,reglages};
  }
  function meta(data){
    const n=data.cultures.filter(c=>c.kit).length;
    return `${n} culture${n>1?"s":""} sur ${data.cultures.length} ont leur kit · ${data.reglages.length} enregistrement${data.reglages.length>1?"s":""}`;
  }
  function nav(data){
    return data.cultures.map(c=>({id:anchor(c.cle),label:c.nom,sub:(c.peuples||"")+" · "+(c.kit?"kit":"pas encore de kit")}));
  }

  // ---- Les réglages de chaque panneau (mêmes curseurs que les planches d'Idan) ----
  const num=(p,l,min,max,step=1,u="px")=>({t:"num",p,l,min,max,step,u});
  const pos=(p,l,r=100)=>num(p,l,-r,r,.5,"px");
  const choix=(p,l,o,extra={})=>({t:"choix",p,l,o,...extra});
  const oui=(p,l)=>({t:"oui",p,l});
  const note=txt=>({t:"note",txt});
  function groupes(panneau,kit){
    const G=kit.geometrie;
    if(panneau==="plein") return [
      {titre:"L'écran",champs:[choix("largeur","Largeur",["ecran","16:9"]),num("marge","Marge autour",0,80),
        note("Plafonnée à 16:9 : sur un écran plus large (21:9), la fiche garde la largeur d'un 16:9 et se centre.")]},
      {titre:"Les zones",champs:[num("haut","Barre du haut",90,260),num("gauche","Colonne de gauche",300,640),
        note("En pixels d'un écran de 1080 px de haut : tout suit la hauteur de l'écran.")]},
      {titre:"Le cadre",champs:[num("cadre.ep","Épaisseur du cadre",6,48),num("separations.ep","Épaisseur des séparations",4,48),
        num("ornements.echelle","Ornements de coin",0,2,.05,"×"),note("Les ornements de coin sont ceux de la fiche au survol, à l'échelle de l'écran (0 : aucun).")]}];
    if(panneau==="fiche"){
      const modeles=["aucun",...Object.keys(G.ornementsCoin)],poses=Object.keys(G.poses);
      return [
        {titre:"Le cadre",champs:[num("cadre.ep","Épaisseur",6,48),pos("cotes.haut","Côté haut",60),pos("cotes.bas","Côté bas",60),
          pos("cotes.gauche","Côté gauche",60),pos("cotes.droite","Côté droit",60)]},
        {titre:"Les coins",champs:Object.entries(ANGLES).flatMap(([a,A])=>[{t:"sous",l:A.nom},choix(`coins.${a}.sens`,"Sens",["miroir","rotation"]),
          pos(`coins.${a}.dx`,"X",60),pos(`coins.${a}.dy`,"Y",60),{t:"miroir",l:"Copier sur les 4 coins (en miroir)",groupe:"coins",angle:a}])},
        {titre:"La barre du milieu",champs:[num("separation.ep","Épaisseur",3,48),pos("separation.dx","X",60),oui("separation.jonctions","Jonctions en T"),
          pos("separation.tHaut.dx","Jonction du haut : X",40),pos("separation.tHaut.dy","Jonction du haut : Y",40),
          pos("separation.tBas.dx","Jonction du bas : X",40),pos("separation.tBas.dy","Jonction du bas : Y",40)]},
        {titre:"La bande sous le nom",champs:[num("sousNom.ep","Épaisseur",3,32),pos("sousNom.dy","Y",60),oui("sousNom.jonctions","Jonctions en T"),
          pos("sousNom.tPortrait.dx","Côté portrait : X",40),pos("sousNom.tPortrait.dy","Côté portrait : Y",40),
          pos("sousNom.tBord.dx","Côté bord : X",40),pos("sousNom.tBord.dy","Côté bord : Y",40)]},
        {titre:"Les ornements de coin",champs:Object.entries(ANGLES).flatMap(([a,A])=>[{t:"sous",l:A.nom},choix(`ornementsCoin.${a}.modele`,"Modèle",modeles),
          choix(`ornementsCoin.${a}.sens`,"Sens",["miroir","rotation"]),num(`ornementsCoin.${a}.taille`,"Taille",20,280),
          pos(`ornementsCoin.${a}.dx`,"X",120),pos(`ornementsCoin.${a}.dy`,"Y",120),{t:"miroir",l:"Copier sur les 4 coins (en miroir)",groupe:"ornementsCoin",angle:a}])},
        {titre:"L'ornement posé",champs:[...(poses.length>1?[choix("pose.modele","Modèle",poses)]:[]),
          choix("pose.place","Place",["aucune","bas-page","bas-centre","bas-portrait","haut-page","haut-centre","haut-portrait"]),
          num("pose.taille","Largeur",40,460),pos("pose.dx","X",300),pos("pose.dy","Y",300),oui("pose.retourne","Retourné (tête en bas)")]},
        {titre:"L'ornement suspendu",champs:[choix("suspendu.place","Place",["aucune","haut-portrait","haut-page","sous-nom","coin-g","coin-d"]),
          num("suspendu.taille","Largeur",40,460),pos("suspendu.dx","X",300),pos("suspendu.dy","Y",300)]},
        {titre:"L'ornement allongé",champs:[choix("allonge.place","Place",["aucune","separation","gauche","droite","bas","haut"]),
          num("allonge.taille","Grosseur",8,80,.5),num("allonge.longueur","Longueur",5,100,1,"%"),num("allonge.espacement","Espacement",-40,80,.5),
          pos("allonge.dx","X",300),pos("allonge.dy","Y",300)]},
        {titre:"Le titre et le cartouche",champs:[num("titre.hauteur","Ornement du titre : hauteur",4,44,.5),pos("titre.ecart","Ornement du titre : écart",40),
          choix("nom","Nom",["clair","or"]),num("cuir.grain","Grain du cuir",20,250,5,"%"),num("cuir.sombre","Assombrir le cuir",0,85,1,"%")]}];
    }
    // Les barres du camp.
    const poses=Object.keys(G.poses);
    const sangle=(p,l)=>[{t:"sous",l},choix(p+".style","Sangle",["bande","barre","aucune"]),num(p+".ep","Épaisseur",4,48),pos(p+".dy","Y",60)];
    return [
      {titre:"La barre du haut",champs:[choix("haut.bande.cale","Position",["gauche","centre","droite"],{noms:{gauche:"ferrée à gauche",centre:"au centre",droite:"ferrée à droite"}}),
        num("haut.bande.distance","Distance du haut",-100,300,.5),num("haut.bande.largeur","Largeur",400,1920),num("haut.bande.hauteur","Hauteur",10,200,.5),
        choix("haut.bande.fond","Fond",["cuir","uni"]),num("haut.bande.sombre","Assombrir",0,95,1,"%"),num("haut.bande.grain","Grain du cuir",40,400,5,"%"),
        ...sangle("haut.sangleHaut","Sangle du haut"),...sangle("haut.sangleBas","Sangle du bas")]},
      {titre:"Les emblèmes et les textes",champs:[{t:"sous",l:"Emblème de droite"},oui("haut.emblemeDroit.visible","Visible"),num("haut.emblemeDroit.taille","Largeur",40,360),
        pos("haut.emblemeDroit.dx","X",300),pos("haut.emblemeDroit.dy","Y",300),
        {t:"sous",l:"Emblème de gauche (en miroir)"},oui("haut.emblemeGauche.visible","Visible"),num("haut.emblemeGauche.taille","Largeur",40,360),
        pos("haut.emblemeGauche.dx","X",300),pos("haut.emblemeGauche.dy","Y",300),
        {t:"sous",l:"Textes de la barre du haut"},pos("haut.textes.ecart","Écart",300),pos("haut.textes.dy","Y",200),
        choix("contenu","Couleur des textes et pictos",["clair","dore"]),
        {...num("inactifs","Pictos inactifs",20,100,1,"%"),si:o=>o.contenu==="dore"}]},
      {titre:"La barre du bas",champs:[num("bas.bande.haut","Haut de la bande",800,1080,.5),choix("bas.bande.fond","Fond",["cuir","uni"]),
        num("bas.bande.sombre","Assombrir",0,95,1,"%"),num("bas.bande.grain","Grain du cuir",40,400,5,"%"),
        ...sangle("bas.sangleHaut","Sangle du haut"),...sangle("bas.sangleBas","Sangle du bas"),
        {t:"sous",l:"Rond central"},num("bas.rond.taille","Largeur",200,900),pos("bas.rond.dx","X",300),pos("bas.rond.dy","Y",200),
        {t:"sous",l:"Bouton Jour suivant"},num("bas.bouton.taille","Diamètre",60,220),pos("bas.bouton.dx","X",200),pos("bas.bouton.dy","Y",200),
        {t:"sous",l:"Pictos"},pos("bas.pictos.ecart","Écart",300),pos("bas.pictos.dy","Y",200)]},
      {titre:"Les ornements",champs:[{t:"sous",l:"Ornement posé"},...(poses.length>1?[choix("ornements.pose.modele","Modèle",poses)]:[]),
        choix("ornements.pose.place","Place",["aucune","sur-bas-gauche","sur-bas-droite","sous-haut-centre"]),num("ornements.pose.taille","Largeur",40,460),
        pos("ornements.pose.dx","X",600),pos("ornements.pose.dy","Y",300),oui("ornements.pose.retourne","Retourné (tête en bas)"),
        {t:"sous",l:"Ornement suspendu"},choix("ornements.suspendu.place","Place",["aucune","sous-haut-gauche","sous-haut-centre","sous-haut-droite"]),
        num("ornements.suspendu.taille","Largeur",40,460),pos("ornements.suspendu.dx","X",600),pos("ornements.suspendu.dy","Y",300),
        {t:"sous",l:"Ornement allongé"},choix("ornements.allonge.place","Place",["aucune","sur-haut","sur-bas"]),num("ornements.allonge.taille","Grosseur",8,80,.5),
        num("ornements.allonge.longueur","Longueur",2,100,1,"%"),num("ornements.allonge.espacement","Espacement",-40,80,.5),
        pos("ornements.allonge.dx","X",600),pos("ornements.allonge.dy","Y",300)]}];
  }
  const lire=(o,p)=>p.split(".").reduce((x,k)=>x==null?x:x[k],o);
  const ecrire=(o,p,v)=>{const ks=p.split("."),last=ks.pop();ks.reduce((x,k)=>x[k],o)[last]=v;};

  // ---- L'éditeur ----
  function render(){
    const res=RES.map(([w,h])=>`<option value="${w}x${h}">${w} × ${h}</option>`).join("");
    return `<div class="cul-editor">
      <div class="cul-head"><div><h3 id="cul-nom">…</h3><p id="cul-sous" class="muted"></p></div>
        <div class="cul-panneaux" role="tablist">${PANNEAUX.map(p=>`<button type="button" class="cul-panneau" data-panneau="${p.cle}" role="tab">${p.titre}<i class="cul-point" hidden>●</i></button>`).join("")}</div></div>
      <div class="cul-outils"><label>Résolution <select id="cul-res">${res}</select></label>
        <span class="cul-actions"><button type="button" class="btn primary" id="cul-save">Enregistrer</button>
          <button type="button" class="btn" id="cul-jeu" title="Revenir aux réglages du jeu pour ce panneau">Valeurs du jeu</button>
          <button type="button" class="btn" id="cul-copy" title="Copier les réglages de ce panneau (à me coller dans le chat)">Copier</button></span></div>
      <p id="cul-statut" class="cul-statut" role="status"></p>
      <div class="cul-main">
        <div class="cul-stage"><div class="cul-box" id="cul-box"><iframe id="cul-frame" title="Aperçu du jeu" src="/index.html?apercu" tabindex="-1"></iframe></div>
          <p class="cul-cap" id="cul-cap"></p></div>
        <div class="cul-reglages" id="cul-reglages"></div>
      </div></div>`;
  }

  const culture=()=>state.data.cultures.find(c=>c.cle===state.cle)||null;
  const sale=(cle,panneau)=>state.edits[cle]?.[panneau]!=null&&JSON.stringify(state.edits[cle][panneau])!==JSON.stringify(state.bases[cle]?.[panneau]?.valeurs);
  const dernier=(cle,panneau)=>state.data.reglages.find(r=>r.culture===cle&&r.panneau===panneau)||null;
  function jeu(kit,panneau){ return panneau==="plein"?{...clone(PLEIN_DEFAUT),...clone(kit.plein||{})}:clone(kit[panneau]); }

  // Les réglages en cours d'une culture : son dernier enregistrement pour chaque panneau, sinon ceux du jeu.
  function preparer(c){
    if(!c.kit||state.edits[c.cle]) return;
    state.edits[c.cle]={};state.bases[c.cle]={};
    for(const {cle:p} of PANNEAUX){
      const r=dernier(c.cle,p),valeurs=r?clone(r.reglages):jeu(c.kit,p);
      state.bases[c.cle][p]={valeurs:clone(valeurs),date:r?.date||null};
      state.edits[c.cle][p]=valeurs;
    }
  }
  function kitEnCours(c){
    if(!c?.kit) return null;
    const e=state.edits[c.cle];
    return {...clone(c.kit),fiche:clone(e.fiche),barres:clone(e.barres),plein:clone(e.plein)};
  }

  function open(id){
    const cle=String(id).replace(/^cult-/,""),c=state.data?.cultures.find(x=>x.cle===cle);
    if(!c) return;
    state.cle=cle;
    preparer(c);
    if(history.replaceState) history.replaceState(null,"","#"+anchor(cle)); else location.hash=anchor(cle);
    if(state.onOpen) state.onOpen(anchor(cle));
    afficher();
  }

  function afficher(){
    const c=culture();if(!c) return;
    const root=document.querySelector(".cul-editor");if(!root) return;
    root.querySelector("#cul-nom").textContent=c.nom;
    root.querySelector("#cul-sous").textContent=(c.peuples||"")+" · "+(c.kit?"kit graphique : "+c.kit.cle:"pas encore de kit graphique");
    for(const b of root.querySelectorAll(".cul-panneau")){
      b.setAttribute("aria-selected",String(b.dataset.panneau===state.panneau));
      b.querySelector(".cul-point").hidden=!sale(c.cle,b.dataset.panneau);
    }
    root.querySelector("#cul-res").value=state.res;
    for(const id of ["cul-save","cul-jeu","cul-copy"]) root.querySelector("#"+id).disabled=!c.kit;
    controles();
    statut();
    taille();
    envoyer();
  }

  function statut(texte){
    const node=document.getElementById("cul-statut"),c=culture();if(!node||!c) return;
    if(texte){ node.textContent=texte; return; }
    if(!c.kit){ node.textContent="Cette culture n'a pas encore de kit graphique : l'aperçu montre ce que le jeu affiche aujourd'hui. Quand tu m'envoies son kit, je l'intègre et tu le règles ici."; return; }
    const b=state.bases[c.cle][state.panneau],quand=b.date?new Date(b.date).toLocaleString("fr-FR",{dateStyle:"long",timeStyle:"short"}):null;
    node.textContent=(sale(c.cle,state.panneau)?"Modifié, pas encore enregistré. ":"")+(quand?`Repris de ton enregistrement du ${quand}.`:"Valeurs du jeu.");
  }

  // Les curseurs du panneau choisi.
  function controles(){
    const box=document.getElementById("cul-reglages"),c=culture();if(!box) return;
    if(!c.kit){ box.innerHTML=""; return; }
    const obj=state.edits[c.cle][state.panneau],ouverts=new Set([...box.querySelectorAll("details[open]")].map(d=>d.dataset.g));
    const premier=!box.dataset.panneau||box.dataset.panneau!==state.panneau+":"+c.cle;
    box.dataset.panneau=state.panneau+":"+c.cle;
    box.innerHTML=groupes(state.panneau,c.kit).map((g,i)=>`<details class="cul-groupe" data-g="${i}"${(premier?i===0:ouverts.has(String(i)))?" open":""}><summary>${html(g.titre)}</summary>
      ${g.champs.filter(f=>!f.si||f.si(obj)).map(f=>champ(f,obj)).join("")}</details>`).join("");
  }
  function champ(f,obj){
    if(f.t==="note") return `<p class="cul-note">${html(f.txt)}</p>`;
    if(f.t==="sous") return `<p class="cul-sous">${html(f.l)}</p>`;
    if(f.t==="miroir") return `<button type="button" class="btn cul-miroir" data-miroir="${f.groupe}" data-angle="${f.angle}">${html(f.l)}</button>`;
    const v=lire(obj,f.p);
    if(f.t==="oui") return `<label class="cul-f cul-oui"><input type="checkbox" data-p="${f.p}"${v?" checked":""}><span>${html(f.l)}</span></label>`;
    if(f.t==="choix") return `<label class="cul-f"><span>${html(f.l)}</span><select data-p="${f.p}">${f.o.map(o=>`<option value="${html(o)}"${o===v?" selected":""}>${html(f.noms?.[o]??nom(o))}</option>`).join("")}</select></label>`;
    return `<label class="cul-f"><span>${html(f.l)}</span><span class="cul-regle"><input type="range" data-p="${f.p}" min="${f.min}" max="${f.max}" step="${f.step}" value="${v}" aria-label="${html(f.l)}">
      <input type="number" data-p="${f.p}" step="${f.step}" value="${v}" aria-label="${html(f.l)} (${html(f.u)})"><small>${html(f.u)}</small></span></label>`;
  }

  // Copier le réglage d'un coin sur les trois autres, en miroir (sens, décalages ; pour un ornement, aussi modèle et taille).
  function miroir(groupe,a){
    const c=culture(),obj=state.edits[c.cle][state.panneau],src=obj[groupe][a],A=ANGLES[a],ox=src.dx*A.sx,oy=src.dy*A.sy;
    for(const [b,B] of Object.entries(ANGLES)) if(b!==a) Object.assign(obj[groupe][b],{...src,dx:ox*B.sx,dy:oy*B.sy});
  }

  // ---- L'aperçu : le jeu dans un cadre, à la résolution choisie, réduit pour tenir ----
  function taille(){
    const frame=document.getElementById("cul-frame"),box=document.getElementById("cul-box"),stage=box?.parentElement;if(!frame||!stage) return;
    const [W,H]=state.res.split("x").map(Number);
    const k=Math.min(stage.clientWidth/W,Math.max(240,window.innerHeight*.74)/H);
    if(frame.width!==String(W)) frame.width=W;
    if(frame.height!==String(H)) frame.height=H;
    frame.style.transform=`scale(${k})`;
    box.style.width=Math.floor(W*k)+"px";box.style.height=Math.floor(H*k)+"px";
    const cap=document.getElementById("cul-cap");
    if(cap) cap.textContent=`${W} × ${H} · affiché à ${Math.round(k*100)} %`;
  }
  function envoyer(){
    clearTimeout(state.timer);
    state.timer=setTimeout(()=>{
      const c=culture(),frame=document.getElementById("cul-frame");
      if(!c||!frame||!state.pret) return;
      frame.contentWindow.postMessage({type:"apercu",culture:c.nom,panneau:state.panneau,kit:kitEnCours(c)},location.origin);
    },80);
  }
  function ecouter(){
    if(state.ecoute) return;
    state.ecoute=true;
    window.addEventListener("message",event=>{
      const frame=document.getElementById("cul-frame");
      if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin) return;
      const m=event.data||{};
      if(m.type==="apercu-pret"){ state.pret=true; envoyer(); }
      else if(m.type==="apercu-erreur") statut("Aperçu impossible : "+m.message);
    });
    window.addEventListener("resize",taille);
    window.addEventListener("beforeunload",event=>{
      if(state.data&&Object.keys(state.edits).some(cle=>PANNEAUX.some(p=>sale(cle,p.cle)))){ event.preventDefault(); event.returnValue=""; }
    });
  }

  async function enregistrer(){
    const c=culture();if(!c?.kit) return;
    const reglages=state.edits[c.cle][state.panneau];
    statut("Enregistrement…");
    try{
      const r=await fetch("api/reglages.php",{method:"POST",headers:{"Content-Type":"application/json","X-Depot":"1"},
        body:JSON.stringify({culture:c.cle,panneau:state.panneau,reglages})});
      const rep=await r.json().catch(()=>({ok:false,erreur:"Réponse illisible du serveur ("+r.status+")."}));
      if(!rep.ok) throw new Error(rep.erreur||"Enregistrement refusé.");
      state.data.reglages.unshift(rep.reglage);
      state.bases[c.cle][state.panneau]={valeurs:clone(reglages),date:rep.reglage.date};
      afficher();
      statut(`Enregistré. ${PANNEAUX.find(p=>p.cle===state.panneau).titre} des ${c.nom} : dis-moi « regarde les réglages » et je l'intègre au jeu.`);
    }catch(e){
      statut("Pas enregistré : "+(e.message||e)+" Tu peux « Copier » et me coller les réglages.");
    }
  }

  function wire(root,data,{onOpen}={}){
    state.data=data;state.pret=false;state.onOpen=onOpen||null;
    ecouter();
    root.querySelector(".cul-panneaux").addEventListener("click",e=>{
      const b=e.target.closest("[data-panneau]");if(!b) return;
      state.panneau=b.dataset.panneau;prefs();afficher();
    });
    root.querySelector("#cul-res").addEventListener("change",e=>{ state.res=e.target.value;prefs();taille(); });
    root.querySelector("#cul-save").addEventListener("click",enregistrer);
    root.querySelector("#cul-jeu").addEventListener("click",()=>{
      const c=culture();if(!c?.kit) return;
      state.edits[c.cle][state.panneau]=jeu(c.kit,state.panneau);
      afficher();
    });
    root.querySelector("#cul-copy").addEventListener("click",async()=>{
      const c=culture();if(!c?.kit) return;
      const txt=JSON.stringify({culture:c.cle,panneau:state.panneau,reglages:state.edits[c.cle][state.panneau]});
      try{ await navigator.clipboard.writeText(txt); statut("Réglages copiés : colle-les-moi dans le chat."); }
      catch(e){ statut(txt); }
    });
    const box=root.querySelector("#cul-reglages");
    box.addEventListener("input",e=>{
      const el=e.target.closest("[data-p]");if(!el) return;
      const c=culture(),obj=state.edits[c.cle][state.panneau];
      if(el.type==="checkbox") ecrire(obj,el.dataset.p,el.checked);
      else if(el.tagName==="SELECT") return;
      else{
        const v=Number(el.value);if(!Number.isFinite(v)) return;
        ecrire(obj,el.dataset.p,v);
        for(const autre of box.querySelectorAll(`[data-p="${el.dataset.p}"]`)) if(autre!==el) autre.value=v;
      }
      apresChangement();
    });
    box.addEventListener("change",e=>{
      const el=e.target.closest("select[data-p]");if(!el) return;
      const c=culture(),obj=state.edits[c.cle][state.panneau];
      ecrire(obj,el.dataset.p,el.value);
      // Des barres dorées : les pictos inactifs prennent leur opacité (la moitié, si rien n'est encore réglé).
      if(el.dataset.p==="contenu"&&el.value==="dore"&&obj.inactifs==null) obj.inactifs=50;
      controles();apresChangement();
    });
    box.addEventListener("click",e=>{
      const b=e.target.closest("[data-miroir]");if(!b) return;
      miroir(b.dataset.miroir,b.dataset.angle);controles();apresChangement();
    });
    const depart=location.hash.startsWith("#cult-")?location.hash.slice(1):anchor((data.cultures.find(c=>c.kit)||data.cultures[0]).cle);
    open(depart);
  }
  function apresChangement(){
    const c=culture(),b=document.querySelector(`.cul-panneau[data-panneau="${state.panneau}"] .cul-point`);
    if(b) b.hidden=!sale(c.cle,state.panneau);
    statut();envoyer();
  }

  // groupes, lire, PLEIN_DEFAUT : pour les tests (tests/full-sheet.test.js).
  return {compute,meta,nav,render,wire,open,anchor,groupes,lire,PLEIN_DEFAUT,PANNEAUX};
})();
