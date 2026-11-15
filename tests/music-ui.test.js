"use strict";

// Musiques par lieu (Idan, 2026-10-21) : menu → intro.mp3, camp → thème puis intro.mp3 (Idan, 2026-11-15), Taverne →
// tavern.mp3, en boucle ;
// silence pendant l'introduction, la création, les missions et la fin de partie ; un seul morceau à la fois ;
// le premier geste du joueur débloque le son, sauf « Nouvelle partie » et « Continuer » qui quittent le menu.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"prototype-web/music-ui.js"),"utf8");
const html=fs.readFileSync(path.join(root,"prototype-web/index.html"),"utf8");
assert.ok(html.includes('<script src="music-ui.js"></script>'));
assert.ok(!html.includes("intro-audio"),"plus de lecteur du menu à part");
assert.ok(html.indexOf('src="screen-ui.js"')<html.indexOf('src="music-ui.js"'),"currentScreen est défini avant");

const created=[];
class FakeAudio{
  constructor(src){ this.src=src; this.volume=1; this.paused=true; this.blocked=FakeAudio.blocked; this.events={}; created.push(this); }
  addEventListener(type,fn){ this.events[type]=fn; }
  finish(){ this.paused=true; this.events.ended?.(); }
  play(){
    if(this.blocked) return Promise.reject(new Error("NotAllowedError"));
    this.paused=false;
    return Promise.resolve();
  }
  pause(){ this.paused=true; }
}
const listeners={};
const fakeDocument={body:{dataset:{}},addEventListener:(type,fn)=>{listeners[type]=fn;}};
let screen="home";
const api=new Function("Audio","document","currentScreen",source.replace(/\ninitializeMusicUi\(\);\s*$/,"\n")+
  "return {music,refreshMusic,unlockMusic,initializeMusicUi};")(FakeAudio,fakeDocument,()=>screen);
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
const current=()=>api.music.audio?.src||null;

(async()=>{
  // Menu : bloqué par le navigateur au chargement, débloqué au premier clic.
  FakeAudio.blocked=true;
  api.initializeMusicUi();
  assert.equal(current(),"assets/audio/intro.mp3");
  assert.equal(api.music.audio.loop,true);
  await flush();
  assert.equal(api.music.audio.paused,true,"son interdit avant le premier geste");
  api.music.audio.blocked=false;
  listeners.pointerdown({target:{closest:()=>({id:"new-game-btn"})}});
  await flush();
  assert.equal(api.music.audio.paused,true,"« Nouvelle partie » ne lance pas la musique du menu");
  listeners.pointerdown({target:{closest:()=>null}});
  await flush();
  assert.equal(api.music.audio.paused,false,"premier clic ailleurs : la musique du menu démarre");
  FakeAudio.blocked=false;

  // Introduction et création : silence ; camp : thème ; Taverne : tavern.mp3 ; retour au camp : thème.
  const menuAudio=api.music.audio;
  screen="intro"; api.refreshMusic();
  assert.equal(current(),null);
  screen="creation"; api.refreshMusic();
  assert.equal(current(),null);
  screen="camp"; fakeDocument.body.dataset.campScene="home"; api.refreshMusic();
  assert.equal(current(),"assets/audio/blood-and-wages-theme.mp3");
  const theme=api.music.audio;
  assert.equal(theme.loop,false,"deux morceaux au camp : chacun lance le suivant");
  await flush();
  assert.equal(theme.paused,false);
  // Le thème fini, la musique du menu ; elle finie, le thème à nouveau (Idan, 2026-11-15).
  theme.finish();
  assert.equal(current(),"assets/audio/intro.mp3");
  const second=api.music.audio;
  assert.equal(second.targetVolume,0.65,"chaque morceau à son volume");
  second.finish();
  assert.equal(current(),"assets/audio/blood-and-wages-theme.mp3");
  assert.equal(api.music.audio.targetVolume,0.6);
  // Un morceau qu'on a déjà quitté ne relance rien en finissant.
  const looped=api.music.audio;
  theme.finish();
  assert.equal(api.music.audio,looped);
  api.refreshMusic();
  assert.equal(api.music.audio,looped,"même lieu : le morceau continue");
  fakeDocument.body.dataset.campScene="mercenaries"; api.refreshMusic();
  assert.equal(api.music.audio,looped,"les autres lieux du camp gardent le thème");
  fakeDocument.body.dataset.campScene="tavern"; api.refreshMusic();
  assert.equal(current(),"assets/audio/tavern.mp3");
  fakeDocument.body.dataset.campScene="home"; api.refreshMusic();
  assert.equal(current(),"assets/audio/blood-and-wages-theme.mp3");
  screen="mission"; api.refreshMusic();
  assert.equal(current(),null,"silence en mission");
  screen="home"; api.refreshMusic();
  assert.equal(current(),"assets/audio/intro.mp3","retour au menu : sa musique revient");

  // Changement de lieu pendant le chargement : l'ancien morceau ne repart pas.
  screen="camp"; api.refreshMusic();
  const loading=api.music.audio;
  fakeDocument.body.dataset.campScene="tavern"; api.refreshMusic();
  await flush();
  assert.equal(loading.paused,true);
  setTimeout(()=>{
    assert.equal(menuAudio.paused,true,"coupée après le fondu");
    assert.equal(looped.paused,true);
    console.log("Musiques : menu, camp (thème puis intro), Taverne, silence ailleurs, déblocage au premier geste — OK");
  },700);
})();
