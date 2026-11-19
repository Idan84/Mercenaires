"use strict";

// L'échelle de l'interface (Idan, 2026-11-19 : « A, on part sur tout proportionnel ») : un écran est réglé pour
// 1920 × 1080, puis suit la taille de l'écran d'un bloc, comme l'échelle d'interface d'Unreal : --ui-scale, le plus petit
// des rapports largeur / 1920 et hauteur / 1080 (0,67 en 1280 × 720, 1,33 en 2560 × 1440).
function updateUiScale(){
  document.documentElement.style.setProperty("--ui-scale",String(Math.min(innerWidth/1920,innerHeight/1080)));
}
updateUiScale();

// Écran courant sur <body data-screen> : accueil, création, camp, mission ou fin de partie.
// Il se déduit des panneaux visibles, sans toucher aux modules qui les affichent ; styles.css
// en tire la mise en page (accueil = logo + menu sur le château). Purement visuel.
const SCREEN_PANELS=[["mission","mission-panel"],["gameover","game-over-panel"],["creation","creation-wizard"],["intro","intro-panel"],["camp","game-panel"],["setup","setup-panel"]];
const CAMP_SCENES=["company","dormitory","memorial","mercenaries","tavern","quartermaster","merchant"];

// Scènes sans bouton retour (Idan, 2026-10-30) : un clic hors du cadre ramène au camp.
const CAMP_SCENES_CLOSED_FROM_OUTSIDE=["mercenaries"];

// Les lieux des barres (Idan, 2026-11-14) : le bouton du lieu où l'on est (le château compris) est marqué ; en bas, il
// est grisé (« quand on est sur le château, on le grise »).
function updateCampHomeIcon(){
  if(typeof document.querySelectorAll!=="function") return;
  const scene=document.body.dataset.screen==="camp"?document.body.dataset.campScene:"";
  for(const button of document.querySelectorAll("#game-hud [data-hud-scene]")){
    const current=button.dataset.hudScene===scene;
    button.classList.toggle("is-current",current);
    if(current) button.setAttribute("aria-current","page");
    else button.removeAttribute("aria-current");
  }
}

function closeCampSceneFromOutside(event){
  const scene=document.body.dataset.campScene;
  if(document.body.dataset.screen!=="camp"||!CAMP_SCENES_CLOSED_FROM_OUTSIDE.includes(scene)) return;
  if(document.querySelector("dialog[open]")||!(event.target instanceof Element)) return;
  if(event.target.closest(`[data-camp-scene-panel="${scene}"] .panel, [data-open-camp-scene], #camp-home, #game-hud, #game-pause, dialog, #item-card-float`)) return;
  openCampScene("home");
}

function openCampScene(scene="home"){
  const target=CAMP_SCENES.includes(scene)?scene:"home";
  const home=document.getElementById("camp-home");
  const panels=[...document.querySelectorAll("#game-panel [data-camp-scene-panel]")];
  if(!home) return;

  home.classList.toggle("hidden",target!=="home");
  for(const panel of panels){
    panel.classList.toggle("hidden",panel.dataset.campScenePanel!==target);
  }
  document.body.dataset.campScene=target;
  updateCampHomeIcon();
  updateHudContext();
  if(typeof refreshMusic==="function") refreshMusic();
  if(target==="tavern"&&typeof showTavernView==="function") showTavernView("home");

  const visible=target==="home"?home:panels.find(panel=>panel.dataset.campScenePanel===target);
  if(visible){
    visible.classList.remove("camp-view-enter");
    requestAnimationFrame(()=>{
      visible.classList.add("camp-view-enter");
      setTimeout(()=>visible.classList.remove("camp-view-enter"),320);
    });
  }
}

function handleCampNavigation(event){
  const open=event.target.closest("[data-open-camp-scene]");
  if(open){
    openCampScene(open.dataset.openCampScene);
    return;
  }
  if(event.target.closest("[data-camp-back]")) openCampScene("home");
}

function currentScreen(){
  for(const [screen,id] of SCREEN_PANELS){
    const panel=document.getElementById(id);
    if(panel&&!panel.classList.contains("hidden")) return screen;
  }
  return "home";
}


const gameActionMessages=[];
function gameAction(message){
  const day=game.campaign?.day;
  gameActionMessages.unshift({message:String(message),day});
  gameActionMessages.length=Math.min(gameActionMessages.length,35);
  renderGameHud();
}
// Icônes au trait des barres : le bouton menu et le journal (les lieux ont les pictos d'Idan).
const HUD_ICONS={
  menu:'<path d="M4.5 7h15M4.5 12h15M4.5 17h15"/>',
  journal:'<path d="M7 4.5h10.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H16v9.5a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2H8"/><path d="M7 4.5a2 2 0 0 0-2 2v9.5M10 9h3M10 12.5h3"/>'
};
function hudIcon(kind){
  return '<svg class="hud-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(HUD_ICONS[kind]||"")+'</svg>';
}
let hudGoldShown=null;
// Le trésor bouge : un petit chiffre monte au-dessus de l'or (rouge si l'on paie, vert si l'on gagne).
function hudGoldDelta(gold){
  const before=hudGoldShown;
  hudGoldShown=gold;
  if(before===null||before===gold) return;
  const delta=document.createElement("span");
  delta.className="hud-delta "+(gold<before?"hud-delta--loss":"hud-delta--gain");
  delta.textContent=(gold<before?"−":"+")+fmt(Math.abs(gold-before));
  delta.addEventListener("animationend",()=>delta.remove());
  $("hud-gold-stat").appendChild(delta);
}
// Les deux barres du camp suivent la culture du capitaine, posée sur <body data-captain-culture> (Idan : « la barre qui
// change en fonction de la culture, et pas du peuple ») : sa barre illustrée (packs d'Idan : scripts/build-hud-bars.js →
// hud-bars.js), réglée par culture dans l'Atelier des barres (Idan, 2026-11-14). Les mesures de l'image (en pixels) vont
// dans des variables CSS de chaque barre, qui placent ses morceaux ; les réglages des deux barres (en bandes B), sur la
// page (:root), car les lieux du camp s'arrêtent sous la barre du haut et au-dessus de celle du bas. Sans pack pour cette
// culture, un cadre provisoire ; sans anneau, le bouton Jour suivant seul. Une culture dont le kit graphique a ses barres
// (hud-kit-ui.js ; les Elfes noirs, planche d'Idan du 2026-11-16) : les pièces du kit à la place de la barre du pack, son
// bouton Jour suivant, et les textes, le bouton et les pictos déplacés comme dans la planche.
const HUD_BAR_PIECES=["center","right"];
const HUD_BAR_VARS={h:"--hb-h",right:"--hb-rw",bandTop:"--hb-bt",band:"--hb-band",bandRight:"--hb-ri"};
const HUD_TOP_VARS={barre:"--ht-barre",embout:"--ht-embout",top:"--ht-top",haut:"--ht-haut",contenu:"--ht-s",fonds:"--ht-fonds",marge:"--ht-marge",gauche:"--ht-gauche"};
const HUD_BOTTOM_VARS={artBas:"--bb-art-bas",artHaut:"--bb-art-haut",centre:"--bb-centre",bouton:"--bb-bouton",anneau:"--bb-anneau",
  picto:"--bb-picto",ecart:"--bb-ecart",pictosDroite:"--bb-pictos-droite",pictosGauche:"--bb-pictos-gauche",pictosY:"--bb-pictos-y",hauteur:"--bb-h",boutonDx:"--bb-bouton-dx"};
let hudBarShown=null;
function hudBarFor(culture){
  return culture&&typeof HUD_BARS==="object"&&HUD_BARS[culture]?HUD_BARS[culture]:null;
}
function hudFind(selector){
  return typeof document.querySelector==="function"?document.querySelector(selector):null;
}
function setHudVars(style,names,values){
  for(const [key,name] of Object.entries(names)){
    if(values&&values[key]!=null) style?.setProperty(name,String(values[key]));
    else style?.removeProperty(name);
  }
}
function applyHudBar(culture){
  const topBar=hudFind(".game-top-bar"),bottomBar=hudFind(".game-bottom-bar");
  const data=hudBarFor(culture);
  const kit=data&&typeof hudKitFor==="function"?hudKitFor(culture):null;
  const key=data?culture+(kit?":kit":""):"";
  if((!topBar&&!bottomBar)||hudBarShown===key) return;
  hudBarShown=key;
  const layout=kit?hudKitBars(kit,data):null;
  const bottom=!kit&&data?.ornament&&data.bas?data:null;
  paintHudBar(topBar,culture,kit?null:data);
  paintHudBar(bottomBar,culture,bottom);
  const root=document.documentElement?.style;
  setHudVars(root,HUD_TOP_VARS,layout?layout.haut:data?.haut);
  setHudVars(root,HUD_BOTTOM_VARS,layout?layout.bas:bottom?.bas);
  bottomBar?.classList.toggle("has-ornament",Boolean(bottom));
  paintHudKit(topBar,layout?.piecesHaut);
  paintHudKit(bottomBar,layout?.piecesBas);
  // Un kit au cuir clair (les Grandes cités, Idan, 2026-11-18) : textes et pictos dorés, pictos inactifs à son opacité.
  topBar?.classList.toggle("is-dore",Boolean(layout?.dore));
  bottomBar?.classList.toggle("is-dore",Boolean(layout?.dore));
  if(layout?.inactifs!=null) bottomBar?.style.setProperty("--hud-inactifs",String(layout.inactifs));
  else bottomBar?.style.removeProperty("--hud-inactifs");
  const play=hudFind(".hud-play-img");
  if(play) play.setAttribute("src",layout?layout.bouton:"assets/hud/next.webp");
  const ring=hudFind(".hud-ornament");
  if(!ring) return;
  if(bottom) ring.setAttribute("src",`assets/hud/barres/${culture}/ornement.webp`);
  ring.hidden=!bottom;
}
// Les pièces du kit dans la barre (sa couche .hud-kit), ou rien.
function paintHudKit(bar,pieces){
  if(!bar) return;
  bar.classList.toggle("has-kit",Boolean(pieces));
  const layer=bar.querySelector(".hud-kit");
  if(layer) layer.innerHTML=pieces||"";
}
function paintHudBar(bar,culture,data){
  if(!bar) return;
  bar.classList.toggle("has-art",Boolean(data));
  setHudVars(bar.style,HUD_BAR_VARS,data&&{...data,band:data.bandBottom-data.bandTop});
  for(const piece of HUD_BAR_PIECES){
    const node=bar.querySelector(".hud-bar-"+piece);
    if(node) node.style.backgroundImage=data?`url("assets/hud/barres/${culture}/${piece}.webp")`:"";
  }
}
// Le nom de la compagnie tient dans sa place : quand un grand ornement de barre (la toile des elfes noirs, le crâne des
// orcs) ou un long nom ne laisse pas assez de largeur, sa police rétrécit jusqu'à 80 %, puis il passe
// sur deux lignes ; au-delà de deux lignes, points de suspension.
let hudNameFitted="";
// Le nom déborde-t-il ? scrollWidth arrondit au pixel : un débordement d'une fraction de pixel suffit pourtant au navigateur
// pour couper le nom ; on compare donc aussi la largeur exacte du texte.
function hudNameOverflows(node){
  if(node.scrollWidth>node.clientWidth) return true;
  if(typeof document.createRange!=="function") return false;
  const range=document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect().width>node.getBoundingClientRect().width+.01;
}
function fitHudCompanyName(force=false){
  const node=$("hud-company");
  if(!node||typeof getComputedStyle!=="function") return;
  // Barre cachée (combat) : rien à mesurer ; on recommencera quand elle reviendra.
  if(!node.getClientRects().length) return;
  // La place dépend de l'écran et de la barre : on refait l'ajustement quand la largeur disponible change.
  const room=node.closest(".hud-top-content");
  const key=node.textContent+"|"+(room?Math.round(room.getBoundingClientRect().width):0);
  if(!force&&key===hudNameFitted) return;
  hudNameFitted=key;
  node.style.removeProperty("font-size");
  node.classList.remove("is-two-lines");
  let size=parseFloat(getComputedStyle(node).fontSize);
  const min=size*.8;
  while(hudNameOverflows(node)&&size>min){
    size=Math.max(min,size-.5);
    node.style.fontSize=size+"px";
  }
  if(hudNameOverflows(node)) node.classList.add("is-two-lines");
}
// Les chiffres de la barre du haut avec l'espace des milliers, comme sur la maquette d'Idan (« 10 000 »).
function hudNumber(n){ return Math.round(Number(n)||0).toLocaleString("fr-FR"); }
function renderHudIdentity(){
  const culture=game.campaign&&game.captain?.culture&&typeof pictoSlug==="function"?pictoSlug(game.captain.culture):"";
  if(culture) document.body.dataset.captainCulture=culture;
  else delete document.body.dataset.captainCulture;
  applyHudBar(culture);
}
function renderGameHud(){
  const hud=$("game-hud");
  const active=Boolean(game.campaign)&&["camp","mission"].includes(currentScreen());
  hud.classList.toggle("hidden",!active);
  renderHudIdentity();
  if(!active){$("game-pause").classList.add("hidden");hudGoldShown=null;return;}
  const company=game.campaign.company;
  const rules=typeof campaignRules==="function"?campaignRules():null;
  $("hud-company").textContent=company.name;
  fitHudCompanyName();
  $("hud-renown").innerHTML=rules?renderRenownStars(rules.companyRenown(game.campaign)):"";
  const gold=Math.round(company.gold);
  $("hud-gold").textContent=hudNumber(gold);
  // Les dettes (Idan, 2026-11-10 ; debts-ui.js) : la caisse ne descend plus sous 0 ; ce qui est dû passe en rouge.
  const debts=typeof debtTotal==="function"?debtTotal(game.campaign):0;
  $("hud-gold-stat").title="Trésor de la compagnie : "+fmt(gold)+" PO"+(debts?" · Dettes : "+fmt(debts)+" PO":"");
  $("hud-gold-stat").classList.toggle("hud-stat--debt",gold<0||debts>0);
  hudGoldDelta(gold);
  // Bois et pierre (Idan, 2026-11-18) : la réserve, et au survol ce qu'elle gagne par jour (bâtiment et ouvriers).
  for(const [key,course,label] of [["wood","lumberjacks","Bois"],["stone","miners","Pierre"]]){
    const stock=Math.round(Number(company[key])||0);
    const daily=rules?.[course]&&typeof resourceDaily==="function"?resourceDaily(rules[course],game.campaign):0;
    $("hud-"+key).textContent=hudNumber(stock);
    $("hud-"+key+"-stat").title=label+" de la compagnie : "+fmt(stock)+(daily?" · +"+fmt(daily)+" par jour":"");
  }
  $("hud-upkeep").textContent=hudNumber(rules?rules.payroll(game.campaign):0)+" PO/j";
  // Places occupées au dortoir (un ogre en prend deux, un halfling, un gnome ou un gobelin une demi ; ni le capitaine ni
  // l'intendant).
  $("hud-roster").textContent=dormitoryPlacesText(rules?rules.dormitoryUsed(game.campaign):company.roster.length)+" / "+(company.camp?.dormitoryCapacity??"—");
  renderCampCalendar();
  $("game-action-lines").innerHTML=gameActionMessages.map(x=>'<li><small>J'+(x.day||"—")+'</small> '+esc(x.message)+'</li>').join("");
  updateHudCombat();
  updateHudTalks();
}
// Les lieux de la barre du bas (Idan, 2026-11-14) : un clic ouvre le lieu, comme les boutons du château ; la Taverne a son
// menu (tavern-ui.js). Rien ne se passe sur le lieu où l'on est déjà.
function openHudScene(button){
  const scene=button.dataset.hudScene;
  if(button.disabled||document.body.dataset.campScene===scene) return;
  openCampScene(scene);
  gameAction(scene==="home"?"Retour au château.":"Destination : "+(button.dataset.destination||button.textContent.trim())+".");
}
// Le journal (Idan, 2026-11-14 : « une icône journal, qui remplace le log ; on peut l'ouvrir en cliquant dessus ») : il
// s'ouvre au-dessus de son picto, à droite de la barre du bas.
function toggleHudJournal(open=$("hud-journal").hidden){
  $("hud-journal").hidden=!open;
  $("hud-journal-btn").setAttribute("aria-expanded",String(open));
  $("hud-journal-btn").classList.toggle("is-open",open);
}
// Le bouton du lieu (Idan, 2026-11-14 : « à droite du bouton play, un bouton contextuel ») : son menu reprend les zones
// cliquables du lieu où l'on est. Pour l'instant, la taverne seule (ses cinq zones, dans l'ordre d'Idan, tavern-scene-ui.js) ;
// ailleurs, pas de bouton (« au château, on n'en a pas pour l'instant »), mais sa place reste, pour que les actions ne
// bougent pas.
function hudContextItems(scene){
  if(scene!=="tavern"||typeof TAVERN_ZONES==="undefined"||typeof TAVERN_MENU==="undefined") return [];
  return TAVERN_MENU.map(key=>TAVERN_ZONES.find(z=>z.key===key)).filter(Boolean).map(z=>({key:z.key,label:z.label}));
}
function setHudContextMenu(open){
  const menu=$("hud-context-menu"),button=$("hud-context-btn");
  if(!menu||!button) return;
  menu.hidden=!open;
  button.setAttribute("aria-expanded",String(open));
  $("hud-context")?.classList.toggle("is-open",open);
}
function updateHudContext(){
  const box=$("hud-context"),menu=$("hud-context-menu");
  if(!box||!menu) return;
  const items=hudContextItems(document.body.dataset.screen==="camp"?document.body.dataset.campScene:"");
  box.classList.toggle("is-active",items.length>0);
  menu.innerHTML=items.map(x=>`<li role="none"><button type="button" role="menuitem" data-hud-context="${esc(x.key)}">${esc(x.label)}</button></li>`).join("");
  setHudContextMenu(false);
}
function chooseHudContext(key){
  setHudContextMenu(false);
  if(document.body.dataset.campScene==="tavern"&&typeof openTavernPlace==="function") openTavernPlace(key);
}
// Le menu d'une action de droite (Combat : les combats du jour, s'il y en a plusieurs), au-dessus de son picto.
function setHudActionMenu(button,items=[]){
  const menu=$("hud-action-menu");
  if(!menu) return;
  const open=Boolean(button&&items.length);
  menu.hidden=!open;
  menu.dataset.action=open?button.dataset.hudAction:"";
  menu.innerHTML=open?items.map(x=>`<li role="none"><button type="button" role="menuitem" data-hud-pick="${esc(x.key)}">${esc(x.label)}</button></li>`).join(""):"";
  if(open){ menu.style.left=button.offsetLeft+"px"; menu.setAttribute("aria-label",button.title||""); }
}
// Combat (Idan, 2026-11-14 : « ça ouvre les missions qui doivent avoir un combat aujourd'hui » ; « juste commencer le
// combat, sinon grisé ») : les escouades arrivées sur place ; leur fenêtre « Commencer le combat » (contract-ui.js).
function hudCombats(){ return (game.campaign?.expeditions||[]).filter(e=>e.status==="arrived"); }
function updateHudCombat(){
  const button=$("hud-combat-btn");
  if(!button) return;
  const n=hudCombats().length;
  button.disabled=!n;
  button.title=n>1?n+" combats vous attendent":n?"Commencer le combat":"Pas de combat aujourd’hui";
  if(!n&&$("hud-action-menu")?.dataset.action==="combat") setHudActionMenu(null);
}
// Discussions (Idan, 2026-11-14 : « il doit ouvrir les fenêtres de dialogues avec les mercenaires qui viennent nous
// parler ») : ceux qui attendent une réponse (discussions-ui.js) ; grisé s'il n'y a personne.
function hudTalks(){ return typeof pendingTalks==="function"?pendingTalks():[]; }
function updateHudTalks(){
  const button=$("hud-talk-btn");
  if(!button) return;
  const talks=hudTalks();
  button.disabled=!talks.length;
  button.title=talks.length>1?talks.length+" discussions vous attendent":talks.length?talks[0].label:"Personne ne vous attend";
  if(!talks.length&&$("hud-action-menu")?.dataset.action==="talk") setHudActionMenu(null);
}
function chooseHudAction(action,key){
  setHudActionMenu(null);
  if(action==="combat"&&typeof openExpeditionDialog==="function") openExpeditionDialog(key);
  if(action==="talk"&&typeof openTalk==="function") openTalk(key);
}
// Combat et Discussions : une seule chose qui attend, elle s'ouvre ; plusieurs, un menu pour choisir.
function toggleHudChoice(action,button,items){
  if(items.length===1){ chooseHudAction(action,items[0].key); return; }
  const open=$("hud-action-menu").hidden||$("hud-action-menu").dataset.action!==action;
  setHudActionMenu(open?button:null,items);
}
// Les actions de droite : Combat, Nouvelles (le pigeon : les nouvelles du jour, rouvertes, même après un rechargement :
// day-news-ui.js), Journal, Discussions.
function runHudAction(action,button){
  if(action==="journal"){toggleHudJournal();return;}
  if(action==="news"){
    if(typeof showTodayNews==="function") showTodayNews();
    return;
  }
  if(action==="combat") toggleHudChoice("combat",button,hudCombats().map(e=>({key:e.id,label:e.offer.campName+" de "+e.offer.fields.lieu})));
  if(action==="talk") toggleHudChoice("talk",button,hudTalks().map(t=>({key:t.key,label:t.label})));
}
function setPauseOpen(open){
  if(!game.campaign||!["camp","mission"].includes(currentScreen())) return;
  const pause=$("game-pause");
  pause.classList.toggle("hidden",!open);
  if(open) pause.querySelector('[data-pause-action="resume"]').focus();
}
function handlePauseAction(action){
  if(action==="resume"){setPauseOpen(false);return;}
  if(action==="save"){saveGame();gameAction("Sauvegarde demandée.");setPauseOpen(false);return;}
  if(action==="design"){window.location.assign("/design/");return;}
  if(action==="menu"){
    if(currentScreen()==="mission"){gameAction("Impossible de quitter au milieu d’un combat.");setPauseOpen(false);return;}
    setPauseOpen(false);backToMenu();
  }
}

function updateScreen(){
  const screen=currentScreen();
  const previous=document.body.dataset.screen;
  document.body.dataset.screen=screen;
  updateCampHomeIcon();
  renderGameHud();
  if(screen==="camp"&&previous!=="camp") openCampScene("home");
  if(typeof refreshMusic==="function") refreshMusic();
}

// Retour au menu depuis la création, le camp ou la fin de partie. La partie est sauvegardée :
// « Continuer » la reprend telle quelle. Jamais pendant un combat (bouton masqué en mission).
function backToMenu(){
  if(currentScreen()==="mission") return;
  if(game.campaign&&!game.campaign.gameOver) saveGame();
  game.campaign=null;
  game.captain=null;
  game.initialSquad=[];
  game.recruitTalk=null;
  if(typeof stopIntroVoice==="function") stopIntroVoice();
  if(typeof closeCreation==="function") closeCreation();
  for(const id of ["setup-panel","game-panel","game-over-panel","intro-panel","creation-wizard"]) $(id).classList.add("hidden");
  renderSaveStatus();
  renderGameHud();
}

// Fenêtres (Idan, 2026-10-24) : un clic à l'extérieur d'une fenêtre ouverte la ferme, comme Échap (même événement
// « cancel »). Le clic doit commencer et finir dehors : une sélection tirée hors de la fenêtre ne la ferme pas.
function outsideDialog(target,event){
  if(!(target instanceof HTMLDialogElement)||!target.open) return false;
  const r=target.getBoundingClientRect();
  return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;
}
let dialogBackdropPress=null;
function closeDialogsFromOutside(){
  document.addEventListener("pointerdown",event=>{
    dialogBackdropPress=outsideDialog(event.target,event)?event.target:null;
  },true);
  document.addEventListener("click",event=>{
    const dialog=event.target;
    if(dialog!==dialogBackdropPress||!outsideDialog(dialog,event)) return;
    dialogBackdropPress=null;
    if(dialog.dispatchEvent(new Event("cancel",{cancelable:true}))) dialog.close();
  });
}

function initializeScreenUi(){
  const observer=new MutationObserver(updateScreen);
  for(const [,id] of SCREEN_PANELS){
    const panel=document.getElementById(id);
    if(panel) observer.observe(panel,{attributes:true,attributeFilter:["class"]});
  }
  // Les lieux des barres : les pictos du bas, et les mercenaires de la barre du haut (« Mes mercenaires »).
  $("game-hud").addEventListener("click",event=>{
    const button=event.target.closest?.("[data-hud-scene]");
    if(button) openHudScene(button);
  });
  $("game-hud").addEventListener("keydown",event=>{
    const button=event.target.closest?.('[role="button"][data-hud-scene]');
    if(!button||(event.key!=="Enter"&&event.key!==" ")) return;
    event.preventDefault();
    openHudScene(button);
  });
  $("hud-pause-btn").addEventListener("click",()=>setPauseOpen(true));
  $("hud-context-btn").addEventListener("click",()=>setHudContextMenu($("hud-context-menu").hidden));
  $("hud-context-menu").addEventListener("click",event=>{
    const item=event.target.closest("[data-hud-context]");
    if(item) chooseHudContext(item.dataset.hudContext);
  });
  document.querySelector(".hud-actions").addEventListener("click",event=>{
    const button=event.target.closest?.("[data-hud-action]");
    if(button&&!button.disabled) runHudAction(button.dataset.hudAction,button);
  });
  $("hud-action-menu").addEventListener("click",event=>{
    const item=event.target.closest("[data-hud-pick]");
    if(item) chooseHudAction($("hud-action-menu").dataset.action,item.dataset.hudPick);
  });
  // Un clic ailleurs ou Échap referme les menus et le journal (Échap n'ouvre pas alors le menu de pause).
  document.addEventListener("click",event=>{
    if(!$("hud-context-menu").hidden&&!event.target.closest?.("#hud-context")) setHudContextMenu(false);
    if(!$("hud-action-menu").hidden&&!event.target.closest?.("#hud-action-menu, [data-hud-action]")) setHudActionMenu(null);
    if(!$("hud-journal").hidden&&!event.target.closest?.("#hud-journal, #hud-journal-btn")) toggleHudJournal(false);
  });
  window.addEventListener("keydown",event=>{
    if(event.key!=="Escape") return;
    if($("hud-context-menu").hidden&&$("hud-action-menu").hidden&&$("hud-journal").hidden) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setHudContextMenu(false);
    setHudActionMenu(null);
    toggleHudJournal(false);
  },true);
  window.addEventListener("resize",()=>{ updateUiScale(); fitHudCompanyName(); });
  for(const slot of document.querySelectorAll("#game-hud [data-hud-icon]")) slot.innerHTML=hudIcon(slot.dataset.hudIcon);
  $("game-pause").addEventListener("click",event=>{
    // Un clic hors du menu de pause reprend la partie, comme Échap.
    if(event.target===$("game-pause")){setPauseOpen(false);return;}
    const button=event.target.closest("[data-pause-action]");
    if(button&&!button.disabled)handlePauseAction(button.dataset.pauseAction);
  });
  document.addEventListener("keydown",event=>{
    if(event.key!=="Escape"||event.repeat) return;
    if(!$("game-pause").classList.contains("hidden")){event.preventDefault();setPauseOpen(false);return;}
    if(document.querySelector("dialog[open]")) return;
    if(game.campaign&&["camp","mission"].includes(currentScreen())){event.preventDefault();setPauseOpen(true);}
  });
  $("game-panel").addEventListener("click",event=>{
    const open=event.target.closest("[data-open-camp-scene]");
    if(open)gameAction("Destination : "+(open.dataset.destination||open.textContent.trim())+".");
  });
  $("game-panel")?.addEventListener("click",handleCampNavigation);
  document.addEventListener("click",closeCampSceneFromOutside);
  closeDialogsFromOutside();
  openCampScene("home");
  updateScreen();
}
