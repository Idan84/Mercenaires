"use strict";

// La Cave (Idan, 2026-11-10 : « On va donc rajouter une salle à la taverne. "La cave". On peut la construire pour 500 PO.
// Quand on s'y rend la première fois de chaque journée : On tire un mercenaire présent au camp et qui n'est pas blessé (mais
// qui peut être fatigué !). On tire un second mercenaire dont l'alignement est le plus éloigné possible du premier
// mercenaire. (tirage entre les plus éloignés) Ces deux mercenaires ont eu un léger désaccord aujourd'hui et décident de
// régler ça dans la cave de la taverne […] En tant que Capitaine, on peut décider de les arrêter ? Non. De parier sur le
// vainqueur ! Tu calcules un système de côtes de parieur par rapport au profil. On peut mettre l'argent qu'on veut (et
// qu'on a) et on empoche ou pas. On voit le combat entre nos deux employés se dérouler sous nos yeux. Les deux mercenaires
// gagnent l'XP de combat. Le perdant fait un jet de blessure. Le gagnant gagne 50XP en intimidation en bonus. »).
// Validé le même jour : avec leurs armes, jusqu'à ce que l'un tombe (fuir, c'est perdre) ; une petite cave (cellar.map.*)
// avec des tonneaux, les deux à cellar.start.distance cases ; la cote = (1 − part du tavernier) ÷ chance (« C'est bien que le
// tavernier garde 10% »), la chance mesurée en simulant le combat cellar.odds.simulations fois ; le perdant fait un jet de
// blessure, sinon il est fatigué ; le gagnant n'est pas fatigué ; le capitaine ne se bat pas ; s'il n'y a pas deux
// mercenaires disponibles, pas de bagarre ; un seul niveau (camp-buildings.json, cellar : 500 PO, 4 jours).
// Module pur : le tirage, les cotes, le pari et son règlement. Le combat est celui des missions (mission.js, IA des deux
// côtés), sa fin celle de mission-end.js, appliquée par campaign.js (applyCellarFight).
// L'état : state.company.cellar = { day, none?, fighters: [id, id], distance, quarrel, odds: { p, a, b, n, print } | null,
// bet: { on, stake, odds } | null, done, result: { winnerId, loserId, fled, payout } | null }.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesCellar=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const ROOM="cellar";
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }

  // camp : { buildingLevel(state, code), expeditionOf(state, id) } ; affinity : createAffinityRules (alignmentPosition) ;
  // progression : createProgressionRules (apply).
  function createCellarRules({reference,camp,affinity=null,progression=null,random=Math.random}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      cols:k("cellar.map.cols",9),rows:k("cellar.map.rows",9),distance:k("cellar.start.distance",2),
      simulations:k("cellar.odds.simulations",100),margin:k("cellar.odds.margin",0.1),minOdds:k("cellar.odds.min",1.01),
      intimidationXp:k("cellar.xp.intimidation",50)
    };
    const rosterOf=state=>state?.company?.roster||[];
    const pick=list=>list[Math.min(list.length-1,Math.floor(random()*list.length))];
    function built(state){ return (Number(camp?.buildingLevel?.(state,ROOM))||0)>0; }
    // L'écart d'alignement : les cases de la grille 3 × 3, comme l'affinité et le duel (de 0 à 4).
    function alignmentDistance(a,b){
      const pa=affinity?.alignmentPosition?.(a?.alignment),pb=affinity?.alignmentPosition?.(b?.alignment);
      return pa&&pb?Math.abs(pa.row-pb.row)+Math.abs(pa.col-pb.col):0;
    }
    // Qui peut descendre à la cave : un membre au camp (ni parti ni sur le départ, ni au cachot), pas blessé (fatigué, si),
    // pas le capitaine.
    function why(state,m){
      if(!m) return "absent";
      if(m.id===state?.company?.captainId) return "captain";
      if(m.recovery?.kind==="wounded") return "wounded";
      if(camp?.expeditionOf?.(state,m.id)) return "away";
      if(m.dungeon) return "dungeon";
      return null;
    }
    function eligible(state){ return rosterOf(state).filter(m=>!why(state,m)); }

    // La bagarre du jour : tirée à la première visite (draw), null avant.
    function tonight(state){
      const c=state?.company?.cellar;
      return c&&c.day===state.day?c:null;
    }
    // Le premier au hasard ; le second au hasard parmi ceux dont l'alignement est le plus éloigné du sien.
    function draw(state){
      if(!built(state)) return null;
      const today=tonight(state);
      if(today) return today;
      const pool=eligible(state);
      let cellar;
      if(pool.length<2) cellar={day:state.day,none:true,fighters:[],odds:null,bet:null,done:true,result:null};
      else{
        const first=pick(pool),others=pool.filter(m=>m!==first);
        const far=Math.max(...others.map(m=>alignmentDistance(first,m)));
        const second=pick(others.filter(m=>alignmentDistance(first,m)===far));
        // Le désaccord du jour (cellar-dialogue.json, quarrels), pour le folklore.
        const quarrels=Number(reference?.cellarDialogue?.quarrels?.length)||0;
        cellar={day:state.day,fighters:[first.id,second.id],distance:far,quarrel:quarrels?Math.floor(random()*quarrels)%quarrels:null,
          odds:null,bet:null,done:false,result:null};
      }
      state.company.cellar=cellar;
      return cellar;
    }
    function fighters(state){
      const c=tonight(state);
      return c&&!c.none?c.fighters.map(id=>rosterOf(state).find(m=>m.id===id)||null):[];
    }
    // La bagarre a-t-elle encore lieu ? Les deux toujours là, au camp, pas blessés.
    function ready(state){
      const c=tonight(state);
      if(!c||c.none) return {ok:false,reason:"none"};
      if(c.done) return {ok:false,reason:"done"};
      for(const m of fighters(state)){ const no=why(state,m); if(no) return {ok:false,reason:no,mercenary:m}; }
      return {ok:true,fighters:fighters(state)};
    }

    // Ce qui fait la cote : ses valeurs, son équipement, sa fatigue. Le tavernier revoit ses cotes si l'un d'eux change.
    function print(m){
      if(!m) return "";
      const slots=m.equipment?.slots||{};
      const items=Object.entries(slots).filter(([,id])=>id!=null).map(([slot,id])=>{
        const item=(m.items||[]).find(i=>String(i.id)===String(id));
        return slot+":"+(item?item.name+"/"+(item.tier??"")+"/"+(item.qualityCode??""):id);
      }).sort();
      return JSON.stringify([m.stats,m.resistances,m.skills,m.spells||null,items,m.recovery?.kind||null]);
    }
    // Un court hachage (FNV-1a) : la sauvegarde garde l'empreinte, pas les deux fiches.
    function hash(text){
      let h=0x811c9dc5;
      for(let i=0;i<text.length;i++){ h^=text.charCodeAt(i); h=Math.imul(h,0x01000193)>>>0; }
      return h.toString(16).padStart(8,"0");
    }
    function printOf(state){ return hash(fighters(state).map(print).join("|")); }
    // La cote d'une chance p : (1 − part du tavernier) ÷ p, jamais sous cellar.odds.min (sinon on perdrait en gagnant).
    function oddsFor(p){
      const raw=(1-C.margin)/Math.max(1e-6,p);
      return Math.max(C.minOdds,Math.round(raw*100)/100);
    }
    // Les simulations : wins combats gagnés par le premier sur n. La chance est lissée (une victoire et une défaite de plus)
    // pour qu'aucune cote ne soit infinie.
    function setOdds(state,{wins,n}){
      const c=tonight(state);
      if(!c||c.none) return null;
      const p=(Number(wins)+1)/(Number(n)+2);
      c.odds={p:Math.round(p*1000)/1000,a:oddsFor(p),b:oddsFor(1-p),n:Number(n),print:printOf(state)};
      return c.odds;
    }
    // Les cotes valent tant qu'aucun des deux n'a changé depuis le calcul.
    function oddsOf(state){
      const c=tonight(state);
      return c?.odds&&c.odds.print===printOf(state)?c.odds:null;
    }

    // Le pari : stake PO (entier, de 0 à l'or de la compagnie) sur on (l'un des deux) ; la mise est posée sur la table.
    function placeBet(state,{on,stake=0}={}){
      const c=tonight(state),go=ready(state);
      if(!go.ok) return {ok:false,reason:go.reason};
      const odds=oddsOf(state);
      if(!odds) return {ok:false,reason:"odds"};
      const amount=Math.floor(Number(stake)||0);
      if(amount<0) return {ok:false,reason:"stake"};
      if(amount>(Number(state.company.gold)||0)) return {ok:false,reason:"gold"};
      if(amount>0&&!c.fighters.includes(on)) return {ok:false,reason:"fighter"};
      if(c.bet) return {ok:false,reason:"bet"};
      if(amount>0){
        state.company.gold-=amount;
        c.bet={on,stake:amount,odds:on===c.fighters[0]?odds.a:odds.b};
      }
      return {ok:true,bet:c.bet};
    }

    // Le règlement : le pari (mise × cote si on a vu juste), +50 XP d'Intimidation au gagnant. fled : le perdant a fui.
    function settle(state,{winnerId,fled=false}={}){
      const c=tonight(state);
      if(!c||c.none||c.done) return null;
      const winner=rosterOf(state).find(m=>m.id===winnerId)||null;
      const loserId=c.fighters.find(id=>id!==winnerId);
      c.done=true;
      let payout=0;
      if(c.bet&&c.bet.on===winnerId){
        payout=Math.round(c.bet.stake*c.bet.odds);
        state.company.gold+=payout;
      }
      const xp=winner&&progression?progression.apply(winner,{skills:{social:{Intimidation:C.intimidationXp}}}):[];
      c.result={winnerId,loserId,fled:Boolean(fled),payout};
      return {winner,loserId,bet:c.bet?{...c.bet,won:c.bet.on===winnerId,payout}:null,xp:{intimidation:C.intimidationXp,changes:xp}};
    }

    return {ROOM,constants:C,built,alignmentDistance,why,eligible,tonight,draw,fighters,ready,print,printOf,oddsFor,setOdds,oddsOf,
      placeBet,settle};
  }

  return {createCellarRules,ROOM};
});
