"use strict";

// Les dettes de la compagnie (Idan, 2026-11-10 : « on ne passe pas en négatif, on reste à 0 et on a des dettes envers
// chaque mercenaire. On fera une liste des dettes. Bien entendu ces dettes s'éteignent par le remboursement mais également
// par le décès du mercenaire. Si l'argent rentre, on décide (ou non) de rembourser ses dettes (à ceux encore vivants du
// moins…) » ; « on décide individuellement pour chaque mercenaire ») :
// - la caisse ne descend jamais sous 0 : ce qu'elle ne peut pas payer devient une dette envers le mercenaire concerné ;
// - quand elle ne suffit pas, chacun est payé au prorata (« au prorata ») : la même part de ce qui lui est dû ; le reste
//   est sa dette ;
// - le salaire du matin, l'entretien des montures et la prime de mission (« oui ») ;
// - l'entretien (« le mercenaire subvient aux besoins de sa monture en attendant. On lui doit cet argent. Les autres, c'est
//   le dresseur. Sinon, elles sont relâchées ») : la monture d'un mercenaire, on le lui doit ; une monture sans
//   propriétaire, ou celle du capitaine (« On augmente la dette envers le dresseur. Sinon, on relâche la monture »), au
//   Dresseur ; sans Dresseur, elle est relâchée ;
// - un mercenaire qui part vivant garde sa créance (« ok ») ; à sa mort, elle s'éteint ;
// - le remboursement : un mercenaire à la fois, toute sa dette (« individuel mais total »), jamais automatique.
// Module pur. L'état : state.company.debts = [{ id, name, sex, amount, salary, bonus, upkeep, since, last }] (montants en
// PO entières ; since : le premier jour impayé, last : le dernier).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesDebts=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const KINDS=["salary","bonus","upkeep"];

  function createDebtRules(){
    const rosterOf=state=>state?.company?.roster||[];
    const goldOf=state=>Math.max(0,Number(state?.company?.gold)||0);
    function entries(state){
      const company=state?.company;
      if(!company) return [];
      if(!Array.isArray(company.debts)) company.debts=[];
      return company.debts;
    }
    function entryOf(state,id){ return entries(state).find(e=>String(e.id)===String(id))||null; }
    function owedTo(state,id){ return Number(entryOf(state,id)?.amount)||0; }
    // La liste : ceux à qui l'on doit encore, présents ou partis (les morts n'y sont plus).
    function list(state){
      const dead=new Set((state?.company?.memorial||[]).map(e=>String(e.id)));
      const roster=new Map(rosterOf(state).map(m=>[String(m.id),m]));
      return entries(state).filter(e=>e.amount>0&&!dead.has(String(e.id)))
        .map(e=>({...e,mercenary:roster.get(String(e.id))||null,present:roster.has(String(e.id))}));
    }
    function total(state){ return list(state).reduce((sum,e)=>sum+e.amount,0); }

    // Une dette de plus envers m (kind : salary, bonus ou upkeep).
    function owe(state,m,amount,kind,{day=state?.day}={}){
      const value=Math.round(Number(amount)||0);
      if(!m||value<=0) return null;
      let entry=entryOf(state,m.id);
      if(!entry){
        entry={id:m.id,name:m.name,amount:0,salary:0,bonus:0,upkeep:0,since:day,last:day};
        entries(state).push(entry);
      }
      if(!(entry.amount>0)) entry.since=day;
      entry.name=m.name;
      entry.sex=m.sex||entry.sex||null;
      entry.amount+=value;
      const key=KINDS.includes(kind)?kind:"salary";
      entry[key]=(Number(entry[key])||0)+value;
      entry.last=day;
      return entry;
    }
    // À sa mort, la dette s'éteint.
    function forget(state,id){
      const list=entries(state),i=list.findIndex(e=>String(e.id)===String(id));
      if(i<0) return null;
      return list.splice(i,1)[0];
    }

    // Payer une note : lines = [{ creditor, amount, kind, … }] (creditor : le mercenaire à qui l'on doit, null si personne).
    // Assez d'or : tout est payé (le total arrondi, comme avant). Sinon la caisse est vidée et le manque est réparti au
    // prorata de ce qui est dû à chacun, en PO entières (méthode du plus fort reste) : la part de chaque ligne devient une
    // dette envers son créancier ; une ligne sans créancier revient dans unpaid (la règle de l'appelant décide).
    function settle(state,lines=[],{day=state?.day}={}){
      const due=lines.filter(l=>Number(l?.amount)>0);
      const exact=due.reduce((sum,l)=>sum+Number(l.amount),0);
      const bill=Math.round(exact),gold=goldOf(state);
      if(state?.company) state.company.gold=gold;
      if(bill<=gold){
        if(state?.company) state.company.gold=gold-bill;
        return {due:bill,paid:bill,owed:0,lines:due.map(l=>({...l,missing:0})),unpaid:[]};
      }
      const shortfall=bill-gold;
      const shares=due.map(l=>{ const raw=Number(l.amount)*shortfall/exact; return {line:l,missing:Math.floor(raw),rest:raw-Math.floor(raw)}; });
      let left=shortfall-shares.reduce((sum,s)=>sum+s.missing,0);
      for(const s of [...shares].sort((a,b)=>b.rest-a.rest)){
        if(left<=0) break;
        s.missing+=1; left-=1;
      }
      state.company.gold=0;
      const out=shares.map(s=>({...s.line,missing:s.missing}));
      let owed=0;
      const unpaid=[];
      for(const l of out){
        if(!(l.missing>0)) continue;
        if(l.creditor){ owe(state,l.creditor,l.missing,l.kind,{day}); owed+=l.missing; }
        else unpaid.push(l);
      }
      return {due:bill,paid:gold,owed,lines:out,unpaid};
    }

    // Rembourser un mercenaire, toute sa dette, s'il est encore en vie et si la caisse le permet.
    function canRepay(state,id){
      const entry=list(state).find(e=>String(e.id)===String(id));
      if(!entry) return {ok:false,reason:"none"};
      if(goldOf(state)<entry.amount) return {ok:false,reason:"gold",amount:entry.amount};
      return {ok:true,amount:entry.amount,entry};
    }
    function repay(state,id){
      const check=canRepay(state,id);
      if(!check.ok) return check;
      state.company.gold=goldOf(state)-check.amount;
      forget(state,id);
      return {ok:true,amount:check.amount,name:check.entry.name,present:check.entry.present};
    }

    return {KINDS,entries,entryOf,owedTo,list,total,owe,forget,settle,canRepay,repay};
  }

  return {createDebtRules,KINDS};
});
