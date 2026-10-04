"use strict";

(function(){
  const audio=document.getElementById("intro-audio");
  if(!audio) return;

  audio.volume=0.65;

  let stopped=false;

  function stopIntroAudio(){
    if(stopped) return;
    stopped=true;
    audio.pause();
    try{ audio.currentTime=0; }catch(error){}
    document.removeEventListener("pointerdown",unlockOnInteraction,true);
    document.removeEventListener("keydown",unlockOnKey,true);
  }

  function startIntroAudio(){
    if(stopped) return;
    const result=audio.play();
    if(result&&typeof result.catch==="function") result.catch(()=>{});
  }

  function isGameStartTarget(target){
    return Boolean(target?.closest?.("#new-game-btn, #continue-game-btn"));
  }

  function unlockOnInteraction(event){
    if(stopped||isGameStartTarget(event.target)) return;
    startIntroAudio();
    document.removeEventListener("pointerdown",unlockOnInteraction,true);
    document.removeEventListener("keydown",unlockOnKey,true);
  }

  function unlockOnKey(event){
    if(stopped) return;
    const active=document.activeElement;
    if((event.key==="Enter"||event.key===" ")&&isGameStartTarget(active)) return;
    startIntroAudio();
    document.removeEventListener("pointerdown",unlockOnInteraction,true);
    document.removeEventListener("keydown",unlockOnKey,true);
  }

  // Try immediately. Browsers may reject audible autoplay until the first user gesture.
  startIntroAudio();
  document.addEventListener("pointerdown",unlockOnInteraction,true);
  document.addEventListener("keydown",unlockOnKey,true);

  document.getElementById("new-game-btn")?.addEventListener("click",stopIntroAudio);
  document.getElementById("continue-game-btn")?.addEventListener("click",stopIntroAudio);

  window.BloodAndWagesIntroAudio={stop:stopIntroAudio,start:startIntroAudio};
})();
