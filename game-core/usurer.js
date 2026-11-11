"use strict";

// L'usurier (Idan, 2026-11-11 : « On ajoute un choix de dialogue avec le tavernier. On peut lui demander s'il connait pas
// quelqu'un qui connait pas quelqu'un qui pourrait faire une petite avance de trésorerie... Il répond qu'il fait passer le
// mot. Le lendemain, un fenêtre de dialogue s'ouvre, l'usurier arrive ! On peut demander le montant qu'on veut dans la limite
// de 10 000 PO par étoile de la compagnie. On négocie le jour du remboursement dans la limite de 2x nombre d'étoiles. Le
// taux est de +2% du montant par jour. On ne peut pas faire du revolving ou faire rouler la dette... C'est pas la BCE ici !
// Le jour de l'échéance. Une fenêtre de dialogue arrive. Il demande son argent : Si on peut on rembourse, sinon on a un
// bouton indiquant qu'on ne peut pas payer. L'usurier s'en va un peu enervé. Le lendemain, on a une armée du camp des
// voleurs (5xPC du capitaine) qui vient rendre une visite. Le capitaine joue en premier. Il est seul. A la fin de son tour,
// le combat s'arrête et une fenêtre de dialogue dit qu'ils reviennent la semaine prochaine, qu'il faudra payer... Au bout
// de 7 jours, on a un jet de dé chaque matin à 5% le premier jour. Ca double tous les jours. Quand ça passe, il reviennent
// voir le capitaine et sauf miracle, c'est un combat qui se termine en game over. Si le capitaine gagne, il récupère l'XP,
// l'equipement et l'usurier lui indique que la médiation musclée à fonctionné et qu'il n'a plus de dettes (mais il ne
// pourra plus emprunter...) ») ; réponses du même jour : PC du capitaine = sa réputation ÷ 3 ; toujours au moins une
// étoile ; le jour se choisit (« On negocie pas, on prends ce qu'on veut prendre ») ; on peut rembourser avant
// l'échéance, les intérêts au jour près ; après l'échéance, on peut encore payer et les intérêts courent ; l'avertissement
// ne compte pas (ni XP ni morts) ; le combat final : seul, dès son retour au camp.
// - les intérêts : montant × (1 + 2 % × jours depuis l'emprunt), arrondis à la pièce ;
// - un seul emprunt à la fois, jamais prolongé ; après la victoire contre les voleurs, plus jamais d'emprunt ;
// - les scènes du matin (elles bloquent la journée) : la visite de l'usurier, l'échéance, l'avertissement des voleurs (le
//   lendemain du refus, le capitaine au camp), les voleurs qui reviennent (le jet passé, le capitaine au camp).
// Module pur. L'état : state.company.usurer = { asked, visit, loan: { amount, days, signedDay, dueDay } | null,
// due: { day } | null, default: { day, warnDay, warned, threatFrom, rolls: [{ day, chance, roll }], hit } | null, banned }.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesUsurer=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function referenceConstant(reference,code,fallback){
    const value=Number((reference?.formulaConstants?.rows||[]).find(r=>r.code===code)?.valeur);
    return Number.isFinite(value)?value:fallback;
  }

  // camp : { starsOf(state) → le niveau d'étoiles de la compagnie (1 à 15), awayOf(state, id) → en mission }.
  function createUsurerRules({reference,random=Math.random,camp={}}={}){
    const k=(code,fallback)=>referenceConstant(reference,code,fallback);
    const C={
      perStar:k("usurer.amount_per_star",10000),daysPerStar:k("usurer.days_per_star",2),rate:k("usurer.daily_rate",0.02),
      armyFactor:k("usurer.army_factor",5),pcDivisor:k("usurer.pc_divisor",3),graceDays:k("usurer.grace_days",7),
      threatStart:k("usurer.threat.start",5),threatFactor:k("usurer.threat.factor",2)
    };
    const roll=()=>Math.floor(random()*100)+1;
    const rosterOf=state=>state?.company?.roster||[];
    const captainOf=state=>rosterOf(state).find(m=>m.id===state?.company?.captainId)||null;
    const atCamp=state=>{ const c=captainOf(state); return Boolean(c)&&!c.dungeon&&!camp.awayOf?.(state,c.id); };
    function book(state){
      const company=state.company;
      if(!company.usurer) company.usurer={asked:null,visit:null,loan:null,due:null,default:null,banned:false};
      return company.usurer;
    }
    const stars=state=>Math.max(1,Math.floor(Number(camp.starsOf?.(state))||1));
    function limits(state){ return {maxAmount:C.perStar*stars(state),maxDays:C.daysPerStar*stars(state),rate:C.rate}; }
    // Ce qu'il faut rendre au jour day : le montant et 2 % par jour depuis l'emprunt.
    function owedOn(loan,day){ return loan?Math.round(loan.amount*(1+C.rate*Math.max(0,day-loan.signedDay))):0; }
    function owed(state,day=state.day){ return owedOn(book(state).loan,day); }
    // Le PC du capitaine : sa réputation ÷ 3 (l'échelle des fiches ennemies : réputation = 3 × points) ; l'armée des voleurs,
    // 5 fois ce PC.
    function captainPoints(state){ return (Number(captainOf(state)?.reputation)||0)/C.pcDivisor; }
    function armyBudget(state){ return Math.max(1,Math.round(C.armyFactor*captainPoints(state))); }

    // À la Taverne : « vous ne connaîtriez pas quelqu'un… ».
    function canAsk(state){
      const u=book(state);
      if(u.banned) return {ok:false,reason:"banned"};
      if(u.loan) return {ok:false,reason:"loan"};
      if(u.asked!=null||u.visit) return {ok:false,reason:"asked"};
      return {ok:true};
    }
    function ask(state){
      const check=canAsk(state);
      if(!check.ok) return check;
      book(state).asked=state.day;
      return {ok:true};
    }

    // Le matin : l'usurier arrive, l'échéance tombe, les voleurs tentent leur chance.
    function morning(state){
      const u=book(state),report={};
      if(u.asked!=null&&state.day>u.asked){ u.asked=null; if(!u.loan&&!u.banned){ u.visit={day:state.day}; report.visit=true; } }
      if(u.loan&&!u.default&&!u.due&&state.day>=u.loan.dueDay){ u.due={day:state.day}; report.due={owed:owed(state)}; }
      const d=u.default;
      if(d&&d.warned&&d.hit==null&&state.day>=d.threatFrom){
        const chance=Math.min(100,C.threatStart*Math.pow(C.threatFactor,d.rolls.length)),dice=roll();
        d.rolls.push({day:state.day,chance,roll:dice});
        if(dice<=chance) d.hit=state.day;
        report.threat={chance,roll:dice,hit:dice<=chance};
      }
      return report;
    }
    // La scène qui attend le joueur : visit, due, warning, final (les deux dernières, le capitaine au camp).
    function pending(state){
      const u=book(state),d=u.default;
      if(u.visit) return {kind:"visit"};
      if(u.due) return {kind:"due",owed:owed(state)};
      if(d&&!d.warned&&state.day>=d.warnDay&&atCamp(state)) return {kind:"warning"};
      if(d&&d.hit!=null&&atCamp(state)) return {kind:"final"};
      return null;
    }
    function canAdvance(state){
      const scene=pending(state);
      return scene?{ok:false,reason:"L’usurier attend une réponse : réglez d’abord cette affaire.",scene}:{ok:true};
    }

    // L'emprunt : un montant (1 à 10 000 × étoiles) et un jour (1 à 2 × étoiles jours).
    function borrow(state,{amount,days}={}){
      const u=book(state),{maxAmount,maxDays}=limits(state);
      if(!u.visit) return {ok:false,reason:"visit"};
      const a=Math.floor(Number(amount)||0),n=Math.floor(Number(days)||0);
      if(a<1||a>maxAmount) return {ok:false,reason:"amount"};
      if(n<1||n>maxDays) return {ok:false,reason:"days"};
      u.visit=null;
      u.loan={amount:a,days:n,signedDay:state.day,dueDay:state.day+n};
      state.company.gold=(Number(state.company.gold)||0)+a;
      return {ok:true,loan:u.loan,total:owedOn(u.loan,u.loan.dueDay)};
    }
    function decline(state){ const u=book(state); if(!u.visit) return {ok:false}; u.visit=null; return {ok:true}; }
    // Rembourser (avant, le jour même ou après l'échéance) : tout ce qui est dû à ce jour.
    function canRepay(state){
      const u=book(state);
      if(!u.loan) return {ok:false,reason:"none"};
      const amount=owed(state);
      return (Number(state.company.gold)||0)>=amount?{ok:true,amount}:{ok:false,reason:"gold",amount};
    }
    function repay(state){
      const check=canRepay(state);
      if(!check.ok) return check;
      const u=book(state);
      state.company.gold-=check.amount;
      u.loan=null;u.due=null;u.default=null;
      return {ok:true,amount:check.amount};
    }
    // « Je ne peux pas payer » : il s'en va, énervé ; les voleurs passent le lendemain.
    function refuse(state){
      const u=book(state);
      if(!u.due) return {ok:false};
      u.due=null;
      u.default={day:state.day,warnDay:state.day+1,warned:false,threatFrom:null,rolls:[],hit:null};
      return {ok:true,owed:owed(state)};
    }
    // L'avertissement est passé : ils reviendront, au bout de 7 jours, un jet chaque matin.
    function warned(state){
      const d=book(state).default;
      if(!d||d.warned) return null;
      d.warned=true;
      d.threatFrom=state.day+C.graceDays;
      return d;
    }
    // Le combat final : gagné, plus de dette, mais plus jamais d'emprunt ; perdu, la partie est finie (campaign.js).
    function settleFinal(state,{won=false}={}){
      const u=book(state);
      if(!u.default||u.default.hit==null) return null;
      if(!won) return {won:false};
      u.loan=null;u.due=null;u.default=null;u.banned=true;
      return {won:true};
    }

    return {constants:C,book,limits,owedOn,owed,captainPoints,armyBudget,canAsk,ask,morning,pending,canAdvance,borrow,decline,
      canRepay,repay,refuse,warned,settleFinal};
  }

  return {createUsurerRules};
});
