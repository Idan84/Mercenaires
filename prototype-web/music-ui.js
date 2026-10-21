"use strict";

// Musiques par lieu (Idan, 2026-10-21) : menu principal → intro.mp3, camp → thème « Blood & Wages »,
// Taverne → tavern.mp3 (déposée sur Hostinger), toujours en boucle. Rien pendant l'introduction (la voix
// d'Idan), la création du capitaine, les missions et la fin de partie. Un seul morceau à la fois, en fondu.
// Les navigateurs interdisent le son avant la première interaction : le morceau du lieu démarre alors au
// premier clic ou à la première touche. Sans fichier, le lieu reste silencieux.
const MUSIC_TRACKS={
  menu:{src:"assets/audio/intro.mp3",volume:0.65},
  camp:{src:"assets/audio/blood-and-wages-theme.mp3",volume:0.6},
  tavern:{src:"assets/audio/tavern.mp3",volume:0.6}
};
const music={place:null,audio:null};

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
    if(music.audio===audio) fadeAudio(audio,MUSIC_TRACKS[music.place].volume,800);
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
  const track=MUSIC_TRACKS[place];
  if(!track) return;
  const audio=new Audio(track.src);
  audio.loop=true;
  audio.volume=0;
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
