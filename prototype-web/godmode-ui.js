"use strict";

// Mode dieu (Idan, 2026-11-15 : « un godmod pour changer le peuple et la culture du capitaine ou d'un mercenaire dans une
// partie afin de faire voir la charte graphique en fonction de la culture sans tout refaire »). Un outil de test caché :
// il n'apparaît qu'avec ?godmode dans l'adresse du jeu. En partie, le bouton « Mode dieu » ouvre un panneau sur le côté
// (le camp reste visible) : on choisit le capitaine ou un mercenaire, son peuple et sa culture ; « Appliquer » les change
// (game-core/godmode.js), sauvegarde la partie et redessine le jeu : les barres du camp suivent la culture du capitaine.
// Les flèches passent à la culture précédente ou suivante (les 32, peuple après peuple) et l'appliquent aussitôt.
// L'aperçu montre la fiche au survol du personnage avec la culture choisie (elle n'est pas encore branchée dans le jeu).
const Godmode=(()=>{
  const state={who:null};
  let panel=null;
  const node=id=>document.getElementById(id);
  const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function enabled(){
    try{ return new URLSearchParams(location.search).has("godmode"); }catch(e){ return false; }
  }
  // Le capitaine d'abord, puis la compagnie dans l'ordre du jeu.
  function characters(){
    const roster=typeof campaignRoster==="function"?campaignRoster():[];
    const captain=game.captain;
    return captain?[captain,...roster.filter(m=>m!==captain)]:roster;
  }
  function selected(){
    const list=characters();
    return list.find(c=>String(c.id)===String(state.who))||list[0]||null;
  }
  // Les 32 cultures, peuple après peuple.
  function allCultures(){
    return peopleNames().flatMap(people=>culturesForPeople(people).map(culture=>({people,culture})));
  }

  function build(){
    const link=document.createElement("link");
    link.rel="stylesheet";link.href="godmode.css";
    document.head.append(link);
    const toggle=document.createElement("button");
    toggle.type="button";toggle.id="godmode-toggle";toggle.className="godmode-toggle";toggle.textContent="Mode dieu";
    toggle.addEventListener("click",()=>panel.hidden?open():close());
    panel=document.createElement("aside");
    panel.id="godmode-panel";panel.className="godmode-panel";panel.hidden=true;
    panel.setAttribute("aria-label","Mode dieu");
    panel.innerHTML=`<header><h2>Mode dieu</h2><button type="button" class="godmode-close" aria-label="Fermer">×</button></header>
      <p class="godmode-note">Pour voir la charte d'une culture. Seuls le peuple, la culture et, au besoin, le portrait changent ;
        le reste du personnage ne bouge pas.</p>
      <label>Personnage<select id="godmode-who"></select></label>
      <label>Peuple<select id="godmode-people"></select></label>
      <label>Culture<select id="godmode-culture"></select></label>
      <div class="godmode-actions">
        <button type="button" id="godmode-prev" title="Culture précédente, appliquée aussitôt">◀</button>
        <button type="button" id="godmode-apply" class="godmode-apply">Appliquer</button>
        <button type="button" id="godmode-next" title="Culture suivante, appliquée aussitôt">▶</button>
      </div>
      <p id="godmode-status" class="godmode-status" role="status"></p>
      <p class="godmode-label">Fiche au survol, avec la culture choisie</p>
      <div id="godmode-preview" class="godmode-preview"></div>`;
    document.body.append(toggle,panel);
    panel.querySelector(".godmode-close").addEventListener("click",close);
    node("godmode-who").addEventListener("change",e=>{ state.who=e.target.value; fill(); });
    node("godmode-people").addEventListener("change",()=>{ fillCultures(); preview(); });
    node("godmode-culture").addEventListener("change",preview);
    node("godmode-apply").addEventListener("click",()=>apply(node("godmode-people").value,node("godmode-culture").value));
    node("godmode-prev").addEventListener("click",()=>step(-1));
    node("godmode-next").addEventListener("click",()=>step(1));
  }

  function open(){
    if(!game.campaign){ alert("Mode dieu : lance ou charge une partie d'abord."); return; }
    panel.hidden=false;
    fill();
  }
  function close(){ panel.hidden=true; }

  // Les listes, réglées sur le personnage choisi.
  function fill(){
    const c=selected();
    if(!c) return;
    state.who=c.id;
    node("godmode-who").innerHTML=characters().map(m=>`<option value="${html(m.id)}"${m===c?" selected":""}>${html(m.name)}${m===game.captain?" (capitaine)":""} — ${html(m.culture||m.people)}</option>`).join("");
    node("godmode-people").innerHTML=peopleNames().map(p=>`<option${p===c.people?" selected":""}>${html(p)}</option>`).join("");
    fillCultures(c.culture);
    preview();
  }
  function fillCultures(current){
    const list=culturesForPeople(node("godmode-people").value);
    node("godmode-culture").innerHTML=list.map(k=>`<option${k===current?" selected":""}>${html(k)}</option>`).join("");
  }

  function preview(){
    const box=node("godmode-preview"),c=selected();
    if(!box||!c||typeof renderMercenaryHoverCard!=="function"){ if(box) box.innerHTML=""; return; }
    try{
      box.innerHTML=`<div class="godmode-preview-scale">${renderMercenaryHoverCard({...c,people:node("godmode-people").value,culture:node("godmode-culture").value})}</div>`;
      const card=box.querySelector(".hover-card");
      if(card&&typeof fitHoverCard==="function") fitHoverCard(card);
    }catch(error){
      box.innerHTML=`<p class="godmode-status is-error">Aperçu impossible : ${html(error.message||error)}</p>`;
    }
  }

  function apply(people,culture){
    const c=selected();
    if(!c) return;
    const others=new Set(characters().filter(m=>m!==c).map(m=>m.avatar?.id).filter(Boolean));
    const status=node("godmode-status");
    try{
      const result=MercenairesGodmode.changeOrigin(c,{people,culture},{culturesForPeople,avatars:MercenairesAvatars,
        avatarRules:typeof avatarRules==="function"?avatarRules():null,inUse:others});
      if(typeof saveGame==="function") saveGame();
      if(typeof renderGame==="function") renderGame();
      status.className="godmode-status";
      status.textContent=`${c.name} : ${culture}${result.avatarChanged?" (nouveau portrait)":""}. Partie sauvegardée.`;
    }catch(error){
      status.className="godmode-status is-error";
      status.textContent=error.message||String(error);
    }
    fill();
  }

  // Culture précédente ou suivante parmi les 32, appliquée aussitôt.
  function step(delta){
    const c=selected();
    if(!c) return;
    const list=allCultures();
    const at=list.findIndex(x=>x.people===c.people&&x.culture===c.culture);
    const next=list[(at+delta+list.length)%list.length];
    apply(next.people,next.culture);
  }

  function init(){
    if(enabled()) build();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();

  return {enabled,apply,step};
})();
