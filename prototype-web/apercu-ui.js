"use strict";

// L'aperçu du Design Lab (onglet Cultures ; Idan, 2026-11-18 : « un gros artefact … si on arrive à le relier au site
// directement c'est top pour personnaliser pour chaque culture les différents panneaux »). Ouvert dans le Design Lab avec
// ?apercu, le jeu montre une partie de démonstration, avec un capitaine de la culture choisie et les réglages en cours de
// son kit (data/reference/culture-kits.json) : les barres du camp, la fiche au survol du capitaine ou sa fiche complète en
// plein écran. Ce que l'on règle est donc ce que le joueur verra.
// Rien n'est sauvegardé (saveGame ne fait rien), aucune musique ; il n'écoute que la page qui l'ouvre (même site).
// Messages reçus : {type:"apercu", culture, panneau:"barres"|"fiche"|"plein", kit, tirage} (kit : la ligne du kit
// réglée, ou null ; tirage : change pour tirer un autre capitaine de la culture). Envoyés : {type:"apercu-pret"}, puis {type:"apercu-rendu", culture, panneau} ou {type:"apercu-erreur", message}.
const Apercu=(()=>{
  const actif=(()=>{ try{ return new URLSearchParams(location.search).has("apercu")&&window.parent!==window; }catch(e){ return false; } })();
  if(!actif) return {actif:false};
  game.apercu=true;
  document.documentElement.classList.add("is-apercu");
  let pret=false,attente=null,kitsDuJeu=null,culturePartie=null,tiragePartie=null;
  const envoyer=message=>window.parent.postMessage(message,location.origin);

  // Le jeu est prêt quand ses données sont chargées et la création du capitaine remplie (ui.js, init).
  function attendre(){
    const people=document.getElementById("captain-people");
    if(game.referenceData?.cultureKits&&people?.options.length&&typeof startCampaign==="function"){
      kitsDuJeu=JSON.parse(JSON.stringify(game.referenceData.cultureKits.rows||[]));
      pret=true;
      envoyer({type:"apercu-pret"});
      if(attente) montrer(attente);
      return;
    }
    setTimeout(attendre,100);
  }

  // Une partie de démonstration : un capitaine de la culture (nom tiré au hasard), son escouade de départ.
  function nouvellePartie(culture){
    const people=peopleNames().find(p=>culturesForPeople(p).includes(culture));
    if(!people) throw new Error("Culture inconnue : "+culture);
    game.idCounter=1;
    game.captain=ensureGenerator().createCaptain({id:nextCharacterId(),role:"Capitaine",forcedPeople:people,forcedCulture:culture});
    // Son portrait, comme pour une recrue (le joueur, lui, le choisit à la création).
    avatarRules().assign(game.captain,new Set());
    game.campaign=null;
    game.initialSquad=createInitialSquad(game.captain);
    game.generated=[];
    startCampaign(game.captain,game.initialSquad);
    renderGame();
    for(const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
    culturePartie=culture;
  }

  // Les kits du jeu, celui de la culture remplacé par ses réglages en cours.
  function poserKit(kit){
    const rows=JSON.parse(JSON.stringify(kitsDuJeu));
    if(kit){
      const at=rows.findIndex(row=>row.cle===kit.cle);
      if(at>=0) rows[at]=kit; else rows.push(kit);
    }
    game.referenceData.cultureKits.rows=rows;
  }

  function scene(){
    let node=document.getElementById("apercu-scene");
    if(!node){ node=document.createElement("div"); node.id="apercu-scene"; document.body.append(node); }
    return node;
  }

  function montrer(message){
    if(!pret){ attente=message; return; }
    try{
      poserKit(message.kit||null);
      // Une autre culture, ou « Autre mercenaire » dans le Design Lab : une nouvelle partie, un autre capitaine.
      if(culturePartie!==message.culture||tiragePartie!==(message.tirage||0)){ nouvellePartie(message.culture); tiragePartie=message.tirage||0; }
      // Les barres du camp, redessinées avec les réglages en cours (screen-ui.js garde la dernière culture posée).
      hudBarShown="";
      applyHudBar(pictoSlug(message.culture));
      const node=scene(),W=window.innerWidth,H=window.innerHeight;
      node.className="apercu-scene";
      if(message.panneau==="fiche"){
        // La fiche au survol du capitaine, au milieu de l'écran, à la taille où le jeu la montre.
        const placement=hoverCardPlacement({anchor:{left:W/2,right:W/2,top:H/2,bottom:H/2},view:{w:W,h:H},gap:0,minScale:.6});
        const scale=placement.scale,x=Math.round((W-HOVER_CARD.w*scale)/2),y=Math.round((H-HOVER_CARD.h*scale)/2);
        node.innerHTML=`<div class="apercu-carte" style="left:${x}px;top:${y}px;transform:scale(${scale})">${renderMercenaryHoverCard(game.captain)}</div>`;
        const card=node.querySelector(".hover-card");
        if(card) fitHoverCard(card);
      }else if(message.panneau==="plein"){
        node.innerHTML=renderFullSheet(game.captain,{W,H});
      }else{
        node.innerHTML="";
      }
      envoyer({type:"apercu-rendu",culture:message.culture,panneau:message.panneau});
    }catch(error){
      console.error(error);
      envoyer({type:"apercu-erreur",message:String(error.message||error)});
    }
  }

  let dernier=null;
  window.addEventListener("message",event=>{
    if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=="apercu") return;
    dernier=event.data;
    montrer(dernier);
  });
  // L'écran change de taille (le Design Lab change de résolution) : on redessine.
  window.addEventListener("resize",()=>{ if(dernier) montrer(dernier); });
  attendre();
  return {actif:true,montrer};
})();
