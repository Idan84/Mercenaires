"use strict";

// Musiques par lieu (Idan, 2026-10-21) : menu principal → intro.mp3, camp → thème « Blood & Wages »,
// Taverne → tavern.mp3 (déposée sur Hostinger), toujours en boucle. Rien pendant l'introduction (la voix
// d'Idan), la création du capitaine, les missions et la fin de partie. Un seul morceau à la fois, en fondu.
// Les navigateurs interdisent le son avant la première interaction : le morceau du lieu démarre alors au
// premier clic ou à la première touche. Sans fichier, le lieu reste silencieux.
// Au camp, plusieurs morceaux, chacun à son volume : le thème, la musique du menu (Idan, 2026-11-15 : « elle est top ! Tu
// peux la mettre en suite de la musique de la page du camp ? ») et les thèmes des cultures, un par culture et par sexe
// (64 à terme ; déposés sur Hostinger, à côté de tavern.mp3). Ils jouent au hasard, jamais deux fois le même de suite
// (Idan, 2026-11-16 : « Dans tous les cas, toutes les musiques jouent au hasard ! »), sauf le premier : celui du capitaine
// si sa culture et son sexe en ont un (« si le joueur fait un capitaine elfe noir M → on lui joue le elfe noir M en
// premier. Si c'est une elfe noire, l'autre ! »), une fois par partie lancée depuis le menu.
const MUSIC_TRACKS={
  menu:[{src:"assets/audio/intro.mp3",volume:0.65}],
  camp:[{src:"assets/audio/blood-and-wages-theme.mp3",volume:0.6},{src:"assets/audio/intro.mp3",volume:0.65},
    {src:"assets/audio/Filthy Velvet Theme Elfe Noir M.mp3",volume:0.6,culture:"Elfes noirs",sexe:"M"},
    {src:"assets/audio/Double Wages - Theme Elfe Noir F.mp3",volume:0.6,culture:"Elfes noirs",sexe:"F"}],
  tavern:[{src:"assets/audio/tavern.mp3",volume:0.6}]
};
const MUSIC_SHUFFLED=new Set(["camp"]);
const music={place:null,audio:null,captainPlayed:false};

// Le capitaine de la partie en cours (sa culture, son sexe), s'il y en a une.
function musicCaptain(){
  if(typeof game==="undefined"||!game) return null;
  const company=game.campaign?.company;
  return company?.roster?.find(m=>m.id===company.captainId)||game.captain||null;
}
// Le morceau du capitaine : celui de sa culture et de son sexe, ou -1.
function captainTrack(list){
  const c=musicCaptain();
  if(!c?.culture) return -1;
  const sexe=String(c.sex||"").trim().toLowerCase().startsWith("f")?"F":"M";
  return list.findIndex(track=>track.culture===c.culture&&track.sexe===sexe);
}
// Le morceau à jouer après le n° current (-1 : on arrive dans le lieu).
function nextTrack(list,current){
  if(!MUSIC_SHUFFLED.has(music.place)||list.length<2) return current<0?0:(current+1)%list.length;
  if(current<0&&!music.captainPlayed){
    const own=captainTrack(list);
    if(own>=0){ music.captainPlayed=true; return own; }
  }
  const others=list.map((_,i)=>i).filter(i=>i!==current);
  return others[Math.min(others.length-1,Math.floor(Math.random()*others.length))];
}

function musicPlace(){
  const screen=currentScreen();
  if(screen==="home"||screen==="setup") return "menu";
  if(screen==="camp") return document.body.dataset.campScene==="tavern"?"tavern":"camp";
  return null;
}

function fadeAudio(audio,target,ms,done){
  clearInterval(audio.fadeTimer);
  const start=audio.volume,steps=Math.max(1,Math.round(ms/50));
  let step=0;
  audio.fadeTimer=setInterval(()=>{
    step+=1;
    audio.volume=Math.min(1,Math.max(0,start+(target-start)*step/steps));
    if(step>=steps){ clearInterval(audio.fadeTimer); if(done) done(); }
  },50);
}

// Si l'on a déjà changé de lieu pendant le chargement, le morceau ne repart pas.
function startMusic(audio){
  audio.play().then(()=>{
    if(music.audio===audio) fadeAudio(audio,audio.targetVolume,800);
    else audio.pause();
  }).catch(()=>{});
}

// À chaque changement d'écran ou de lieu du camp (screen-ui.js) : on garde le morceau s'il ne change pas.
function refreshMusic(){
  const place=musicPlace();
  if(place===music.place) return;
  const old=music.audio;
  if(old){ music.audio=null; fadeAudio(old,0,500,()=>old.pause()); }
  music.place=place;
  music.failures=0;
  // Une nouvelle partie (ou « Continuer ») repasse par le menu : le morceau du capitaine rejouera en premier.
  if(place==="menu") music.captainPlayed=false;
  if(MUSIC_TRACKS[place]) playTrack(nextTrack(MUSIC_TRACKS[place],-1));
}

// Le morceau n° index du lieu. Seul, il boucle ; à plusieurs, chacun lance le suivant quand il finit (nextTrack).
function playTrack(index){
  const list=MUSIC_TRACKS[music.place];
  const track=list[index];
  const audio=new Audio(track.src);
  audio.loop=list.length===1;
  audio.volume=0;
  audio.targetVolume=track.volume;
  if(list.length>1) audio.addEventListener("ended",()=>{ if(music.audio===audio) playTrack(nextTrack(list,index)); });
  // Un fichier absent (pas encore déposé sur Hostinger, nom différent) : on passe au suivant, sans tourner en rond si
  // aucun ne répond.
  if(list.length>1) audio.addEventListener("error",()=>{
    if(music.audio!==audio) return;
    music.failures=(music.failures||0)+1;
    if(music.failures<list.length) playTrack(nextTrack(list,index));
  });
  audio.addEventListener("playing",()=>{ music.failures=0; });
  music.audio=audio;
  startMusic(audio);
}

// Premier geste du joueur : le morceau bloqué par le navigateur peut enfin démarrer. Pas sur « Nouvelle
// partie » ni « Continuer » : on quitte le menu, et le morceau du lieu suivant démarrera de lui-même.
function unlockMusic(event){
  if(event.target?.closest?.("#new-game-btn, #continue-game-btn")) return;
  if(music.audio&&music.audio.paused) startMusic(music.audio);
}

function initializeMusicUi(){
  document.addEventListener("pointerdown",unlockMusic,true);
  document.addEventListener("keydown",unlockMusic,true);
  refreshMusic();
}

initializeMusicUi();
