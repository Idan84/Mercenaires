"use strict";

// Musiques par lieu (Idan, 2026-10-21) : menu → intro.mp3 ; camp → le thème, intro.mp3 et les thèmes des cultures, au
// hasard, celui du capitaine en premier (Idan, 2026-11-16) ; Taverne → tavern.mp3, en boucle ;
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
// Le hasard, tiré dans l'ordre (rolls), et la partie en cours (son capitaine).
let rolls=[];
const fakeMath=Object.create(Math);
fakeMath.random=()=>rolls.length?rolls.shift():0;
const game={};
const api=new Function("Audio","document","currentScreen","game","Math",source.replace(/\ninitializeMusicUi\(\);\s*$/,"\n")+
  "return {music,refreshMusic,unlockMusic,initializeMusicUi,nextTrack,MUSIC_TRACKS};")(FakeAudio,fakeDocument,()=>screen,game,fakeMath);
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
const current=()=>api.music.audio?.src||null;
const THEME="assets/audio/blood-and-wages-theme.mp3",INTRO="assets/audio/intro.mp3";
const ELFE_M="assets/audio/Filthy Velvet Theme Elfe Noir M.mp3",ELFE_F="assets/audio/Double Wages - Theme Elfe Noir F.mp3";
assert.deepEqual(api.MUSIC_TRACKS.camp.map(t=>t.src),[THEME,INTRO,ELFE_M,ELFE_F],"au camp : le thème, l'intro, les deux thèmes des Elfes noirs");
assert.deepEqual(api.MUSIC_TRACKS.camp.filter(t=>t.culture).map(t=>[t.culture,t.sexe]),[["Elfes noirs","M"],["Elfes noirs","F"]]);

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

  // Introduction et création : silence ; au camp, une capitaine elfe noire : son thème en premier (Idan, 2026-11-16 : « Si
  // c'est une elfe noire, l'autre ! »).
  const menuAudio=api.music.audio;
  screen="intro"; api.refreshMusic();
  assert.equal(current(),null);
  screen="creation"; api.refreshMusic();
  assert.equal(current(),null);
  game.captain={culture:"Elfes noirs",sex:"Femme"};
  screen="camp"; fakeDocument.body.dataset.campScene="home"; api.refreshMusic();
  assert.equal(current(),ELFE_F,"une capitaine elfe noire : « Elfe noir F » en premier");
  const first=api.music.audio;
  assert.equal(first.loop,false,"plusieurs morceaux au camp : chacun lance le suivant");
  await flush();
  assert.equal(first.paused,false);
  // Puis au hasard, jamais deux fois le même de suite : 0 → le premier des autres, 0,99 → le dernier des autres.
  rolls=[0]; first.finish();
  assert.equal(current(),THEME);
  assert.equal(api.music.audio.targetVolume,0.6,"chaque morceau à son volume");
  rolls=[0.99]; api.music.audio.finish();
  assert.equal(current(),ELFE_F);
  rolls=[0.5]; api.music.audio.finish();
  assert.equal(current(),INTRO);
  assert.equal(api.music.audio.targetVolume,0.65);
  for(let i=0;i<4;i++) for(const r of [0,0.3,0.6,0.99]){ rolls=[r]; assert.notEqual(api.nextTrack(api.MUSIC_TRACKS.camp,i),i,"jamais deux fois de suite"); }
  // Un morceau qu'on a déjà quitté ne relance rien en finissant.
  const looped=api.music.audio;
  first.finish();
  assert.equal(api.music.audio,looped);
  api.refreshMusic();
  assert.equal(api.music.audio,looped,"même lieu : le morceau continue");
  fakeDocument.body.dataset.campScene="mercenaries"; api.refreshMusic();
  assert.equal(api.music.audio,looped,"les autres lieux du camp gardent le morceau");
  fakeDocument.body.dataset.campScene="tavern"; api.refreshMusic();
  assert.equal(current(),"assets/audio/tavern.mp3");
  assert.equal(api.music.audio.loop,true,"la Taverne : un seul morceau, en boucle");
  // De retour au camp, le thème de la capitaine a déjà joué : le hasard (0 → le premier des quatre).
  rolls=[0]; fakeDocument.body.dataset.campScene="home"; api.refreshMusic();
  assert.equal(current(),THEME,"son thème n'est plus forcé en premier");
  screen="mission"; api.refreshMusic();
  assert.equal(current(),null,"silence en mission");
  screen="home"; api.refreshMusic();
  assert.equal(current(),INTRO,"retour au menu : sa musique revient");
  // Nouvelle partie depuis le menu, un capitaine elfe noir : « Elfe noir M » en premier ; les capitaines sont tirés de la
  // compagnie quand il y en a une.
  game.captain=null;
  game.campaign={company:{captainId:7,roster:[{id:3,culture:"Elfes noirs",sex:"Femme"},{id:7,culture:"Elfes noirs",sex:"Homme"}]}};
  screen="camp"; api.refreshMusic();
  assert.equal(current(),ELFE_M,"un capitaine elfe noir : « Elfe noir M » en premier");
  // Une autre culture (sans thème pour l'instant) : le hasard dès le premier morceau.
  screen="home"; api.refreshMusic();
  game.campaign={company:{captainId:1,roster:[{id:1,culture:"Nains des montagnes",sex:"Homme"}]}};
  rolls=[0.3]; screen="camp"; api.refreshMusic();
  assert.equal(current(),INTRO,"sans thème pour sa culture : au hasard");
  // Un fichier absent : on passe au suivant ; si aucun ne répond, on s'arrête au lieu de tourner en rond.
  rolls=[0]; api.music.audio.events.error();
  assert.equal(current(),THEME,"fichier absent : le suivant");
  const before=created.length;
  for(let i=0;i<6;i++) api.music.audio.events.error();
  assert.ok(created.length-before<=3,"tous absents : on s'arrête");
  screen="home"; api.refreshMusic();

  // Changement de lieu pendant le chargement : l'ancien morceau ne repart pas.
  screen="camp"; api.refreshMusic();
  const loading=api.music.audio;
  fakeDocument.body.dataset.campScene="tavern"; api.refreshMusic();
  await flush();
  assert.equal(loading.paused,true);
  setTimeout(()=>{
    assert.equal(menuAudio.paused,true,"coupée après le fondu");
    assert.equal(looped.paused,true);
    console.log("Musiques : menu, camp (au hasard, le thème du capitaine en premier), Taverne, silence ailleurs, déblocage au premier geste — OK");
  },700);
})();
