"use strict";

// Moteur des tags (refonte de l'atelier des tags, doc 20 §11 et §12 ; Idan, 2026-11-22 : « je veux que le jeu lise les
// datas de l'atelier »). Une seule source pour l'atelier (artefact et Design Lab) et pour le jeu :
// - le langage des calculs de l'atelier (sûr : aucun code exécuté) : variables, constantes, et / ou / non, comparaisons,
//   + − × ÷, « contient », max, min, abs, arrondi, arrondi_sup, arrondi_inf, nombre, somme ;
// - les données de l'atelier (tags à plusieurs parents, tests rangés en arbre, constantes), nettoyées par clean ;
// - la résolution : chaque test posé élimine des tags, un tag tombe avec l'un de ses parents, un tag inactif tombe
//   d'office ; seuls s'affichent le tag le plus bas de chaque branche, ou les X tags de plus haut rang d'une catégorie
//   qui « garde X » ;
// - les variables d'un mercenaire à l'instant T (équipement compris), lues par les calculs.
// Pur : ni DOM, ni hasard (les biais viendront d'ailleurs, doc 20 §12).
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesTagEngine=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  // ---- Le langage des calculs ----
  const norm=s=>String(s??"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
  // Une constante se lit par un nom simple (« seuil soin » → seuil_soin).
  const cle=n=>norm(n).replace(/[^a-z0-9_.]+/g,"_").replace(/^_+|_+$/g,"");
  class ErreurCalcul extends Error{}
  const MOTS={et:"et",and:"et",ou:"ou",or:"ou",non:"non",not:"non",vrai:"vrai",true:"vrai",oui:"vrai",faux:"faux",false:"faux",contient:"contient"};
  function nombre(x){
    if(typeof x==="number") return x;
    if(typeof x==="boolean") return x?1:0;
    if(Array.isArray(x)) return x.length;
    const n=Number(String(x).replace(",","."));
    if(Number.isFinite(n)&&String(x).trim()!=="") return n;
    throw new ErreurCalcul("« "+x+" » n'est pas un nombre");
  }
  function vrai(x){ return Array.isArray(x)?x.length>0:typeof x==="string"?x!=="":Boolean(x); }
  const FONCTIONS={max:(...a)=>Math.max(...a.map(nombre)),min:(...a)=>Math.min(...a.map(nombre)),abs:a=>Math.abs(nombre(a)),arrondi:a=>Math.round(nombre(a)),
    // Arrondi au-dessus et au-dessous (Idan, 2026-11-23 : « arr sup (nombre d'étoiles de la compagnie/5) »).
    arrondi_sup:a=>Math.ceil(nombre(a)),arrondi_inf:a=>Math.floor(nombre(a)),
    nombre:a=>Array.isArray(a)?a.length:typeof a==="string"?(a?1:0):nombre(a),somme:(...a)=>a.reduce((s,x)=>s+nombre(x),0)};
  function lexer(src){
    const toks=[]; let i=0;
    while(i<src.length){
      const c=src[i];
      if(/\s/.test(c)){ i++; continue; }
      if(/[0-9]/.test(c)){ let j=i; while(j<src.length&&/[0-9.]/.test(src[j])) j++; toks.push({t:"nb",v:parseFloat(src.slice(i,j))}); i=j; continue; }
      if(c==='"'||c==="'"||c==="«"||c==="“"){ const fin=c==="«"?"»":c==="“"?"”":c; const j=src.indexOf(fin,i+1); if(j<0) throw new ErreurCalcul("guillemet non fermé"); toks.push({t:"txt",v:src.slice(i+1,j).trim()}); i=j+1; continue; }
      if(/[\p{L}_]/u.test(c)){ let j=i; while(j<src.length&&/[\p{L}\p{N}_.]/u.test(src[j])) j++; const w=src.slice(i,j); const m=MOTS[w.toLowerCase()]; toks.push(m?{t:"mot",v:m}:{t:"id",v:w}); i=j; continue; }
      const deux=src.slice(i,i+2);
      const OPS2={"<=":"<=",">=":">=","!=":"!=","<>":"!=","==":"=","&&":"et","||":"ou"};
      if(OPS2[deux]){ const v=OPS2[deux]; toks.push({t:["et","ou"].includes(v)?"mot":"op",v}); i+=2; continue; }
      if("+-*/()<>=,".includes(c)){ toks.push({t:"op",v:c}); i++; continue; }
      if(c==="!"){ toks.push({t:"mot",v:"non"}); i++; continue; }
      throw new ErreurCalcul("caractère inattendu « "+c+" »");
    }
    return toks;
  }
  function analyse(src){
    const toks=lexer(src); let i=0;
    const voit=(t,v)=>toks[i]&&toks[i].t===t&&(v===undefined||toks[i].v===v);
    const prend=(t,v)=>{ if(!voit(t,v)) throw new ErreurCalcul(v?"« "+v+" » attendu":"calcul incomplet"); return toks[i++]; };
    const ou=()=>{ let a=et(); while(voit("mot","ou")){ i++; a={k:"ou",a,b:et()}; } return a; };
    const et=()=>{ let a=non(); while(voit("mot","et")){ i++; a={k:"et",a,b:non()}; } return a; };
    const non=()=>{ if(voit("mot","non")){ i++; return {k:"non",a:non()}; } return cmp(); };
    const cmp=()=>{ const a=add(); for(const op of ["<=",">=","!=","<",">","="]) if(voit("op",op)){ i++; return {k:"cmp",op,a,b:add()}; }
      if(voit("mot","contient")){ i++; return {k:"contient",a,b:add()}; } return a; };
    const add=()=>{ let a=mul(); while(voit("op","+")||voit("op","-")){ const op=toks[i++].v; a={k:"arith",op,a,b:mul()}; } return a; };
    const mul=()=>{ let a=un(); while(voit("op","*")||voit("op","/")){ const op=toks[i++].v; a={k:"arith",op,a,b:un()}; } return a; };
    const un=()=>{ if(voit("op","-")){ i++; return {k:"neg",a:un()}; } return prim(); };
    const prim=()=>{
      const t=toks[i]; if(!t) throw new ErreurCalcul("calcul incomplet");
      if(t.t==="nb"){ i++; return {k:"val",v:t.v}; }
      if(t.t==="txt"){ i++; return {k:"val",v:t.v}; }
      if(t.t==="mot"&&(t.v==="vrai"||t.v==="faux")){ i++; return {k:"val",v:t.v==="vrai"}; }
      if(t.t==="op"&&t.v==="("){ i++; const e=ou(); prend("op",")"); return e; }
      if(t.t==="id"){ i++;
        if(voit("op","(")){ i++; const f=t.v.toLowerCase(); if(!FONCTIONS[f]) throw new ErreurCalcul("fonction inconnue « "+t.v+" »"); const args=[];
          if(!voit("op",")")){ args.push(ou()); while(voit("op",",")){ i++; args.push(ou()); } } prend("op",")"); return {k:"appel",f,args}; }
        return {k:"var",n:t.v}; }
      throw new ErreurCalcul("« "+t.v+" » inattendu");
    };
    if(!toks.length) throw new ErreurCalcul("calcul vide");
    const ast=ou(); if(i<toks.length) throw new ErreurCalcul("« "+toks[i].v+" » en trop");
    return ast;
  }
  function variablesDe(ast,out=new Set()){ if(!ast) return out; if(ast.k==="var") out.add(ast.n); for(const x of [ast.a,ast.b,...(ast.args||[])]) variablesDe(x,out); return out; }
  // lookup(nom) : la valeur d'une variable ou d'une constante.
  function evalue(ast,lookup){
    switch(ast.k){
      case "val": return ast.v;
      case "var": return lookup(ast.n);
      case "non": return !vrai(evalue(ast.a,lookup));
      case "et": return vrai(evalue(ast.a,lookup))&&vrai(evalue(ast.b,lookup));
      case "ou": return vrai(evalue(ast.a,lookup))||vrai(evalue(ast.b,lookup));
      case "neg": return -nombre(evalue(ast.a,lookup));
      case "arith": { const a=nombre(evalue(ast.a,lookup)),b=nombre(evalue(ast.b,lookup)); return ast.op==="+"?a+b:ast.op==="-"?a-b:ast.op==="*"?a*b:(b===0?0:a/b); }
      case "contient": { const a=evalue(ast.a,lookup),b=norm(evalue(ast.b,lookup)); return Array.isArray(a)?a.some(x=>norm(x)===b):norm(a).includes(b); }
      case "cmp": { const a=evalue(ast.a,lookup),b=evalue(ast.b,lookup);
        const num=x=>typeof x==="number"||typeof x==="boolean";
        if(ast.op==="="||ast.op==="!="){ const eg=num(a)&&num(b)?nombre(a)===nombre(b):norm(a)===norm(b); return ast.op==="="?eg:!eg; }
        const x=nombre(a),y=nombre(b); return ast.op==="<"?x<y:ast.op==="<="?x<=y:ast.op===">"?x>y:x>=y; }
      case "appel": return FONCTIONS[ast.f](...ast.args.map(x=>evalue(x,lookup)));
    }
    throw new ErreurCalcul("calcul illisible");
  }

  // ---- Les données de l'atelier ----
  // Nettoie un enregistrement (tags, tests, constantes) : identifiants, parents connus, sans boucle de tests.
  // uid : fabrique d'identifiants pour ce qui n'en a pas (l'atelier en tire au hasard ; ici, un compteur).
  function clean(d,{uid}={}){
    let n=0; const id=uid||(()=>"x"+(++n));
    const tags=(Array.isArray(d?.tags)?d.tags:[]).map(t=>({id:String(t.id||id()),nom:String(t.nom||"Sans nom"),parents:Array.isArray(t.parents)?t.parents.map(String):[],groupe:Boolean(t.groupe),note:String(t.note||""),
      rang:t.rang===""||t.rang==null||!Number.isFinite(Number(t.rang))?null:Number(t.rang),garder:Number(t.garder)>=1?Math.floor(Number(t.garder)):null,inactif:Boolean(t.inactif)}));
    const ids=new Set(tags.map(t=>t.id));
    for(const t of tags) t.parents=[...new Set(t.parents.filter(p=>ids.has(p)&&p!==t.id))];
    const liste=a=>Array.isArray(a)?[...new Set(a.map(String).filter(x=>ids.has(x)))]:[];
    const tests=(Array.isArray(d?.tests)?d.tests:[]).map(x=>({id:String(x.id||id()),nom:String(x.nom||"Nouveau test"),type:x.type==="niveau"?"niveau":"binaire",
      formule:String(x.formule||""),calcul:String(x.calcul||""),aReecrire:Boolean(x.aReecrire),oui:liste(x.oui),non:liste(x.non),
      paliers:(Array.isArray(x.paliers)?x.paliers:[]).map((p,i)=>({id:String(p.id||id()),de:i===0||p.de===""||p.de==null||!Number.isFinite(Number(p.de))?null:Number(p.de),nom:String(p.nom||""),elimine:liste(p.elimine)})),
      si:x.si&&x.si.test?{test:String(x.si.test),rep:String(x.si.rep??"oui")}:null}));
    for(const x of tests) if(x.type==="niveau"&&!x.paliers.length) x.paliers=[{id:id(),de:null,nom:"Bas",elimine:[]},{id:id(),de:50,nom:"Haut",elimine:[]}];
    // Condition : un test posé seulement si un autre a donné telle réponse (jamais en boucle).
    const parId=new Map(tests.map(x=>[x.id,x]));
    for(const x of tests){ const m=x.si&&parId.get(x.si.test); if(!m||m===x){ x.si=null; continue; }
      if(m.type==="binaire"&&x.si.rep!=="oui"&&x.si.rep!=="non") x.si.rep="oui";
      if(m.type==="niveau"&&!m.paliers.some(q=>q.id===x.si.rep)) x.si.rep=m.paliers[0].id; }
    for(const x of tests){ const vus=new Set([x.id]); let y=x; while(y.si){ if(vus.has(y.si.test)){ x.si=null; break; } vus.add(y.si.test); y=parId.get(y.si.test); } }
    const constantes=(Array.isArray(d?.constantes)?d.constantes:[]).map(c=>({id:String(c.id||id()),nom:String(c.nom||""),valeur:Number.isFinite(Number(c.valeur))?Number(c.valeur):0,note:String(c.note||"")}));
    return {tags,tests,constantes};
  }

  // ---- La résolution ----
  // doc : des données propres (clean). Les fonctions relisent doc à chaque appel : l'atelier le modifie en direct.
  function createTagTree(doc){
    const tagPar=id=>doc.tags.find(t=>t.id===id);
    const nomTag=id=>tagPar(id)?.nom||"?";
    const enfants=id=>doc.tags.filter(t=>t.parents.includes(id));
    function descendants(id,acc=new Set()){ for(const e of enfants(id)) if(!acc.has(e.id)){ acc.add(e.id); descendants(e.id,acc); } return acc; }
    function ancetres(id,acc=new Set()){ for(const p of tagPar(id)?.parents||[]) if(!acc.has(p)){ acc.add(p); ancetres(p,acc); } return acc; }
    const branches=x=>x.type==="binaire"?["oui","non"]:x.paliers.map(p=>p.id);
    const suivants=(id,r)=>doc.tests.filter(t=>t.si&&t.si.test===id&&t.si.rep===r);
    const libRep=(x,r)=>x.type==="binaire"?r:(x.paliers.find(p=>p.id===r)?.nom||"palier "+(x.paliers.findIndex(p=>p.id===r)+1));
    const constante=n=>(doc.constantes||[]).find(c=>cle(c.nom)===n);
    // La réponse d'un test sur des valeurs : {valeur, rep} ; {manuel} sans calcul ; {erreur} si le calcul est faux.
    // known(nom) : la variable existe-t-elle (sinon, une constante) ; par défaut, celles des valeurs.
    function answer(x,values,{known}={}){
      if(!x.calcul.trim()) return {manuel:true};
      const has=known||(n=>Object.prototype.hasOwnProperty.call(values,n));
      try{
        const ast=analyse(x.calcul);
        for(const n of variablesDe(ast)) if(!has(n)&&!constante(n)) throw new ErreurCalcul("variable inconnue « "+n+" »");
        const r=evalue(ast,n=>has(n)?values[n]:constante(n)?.valeur);
        if(x.type==="binaire") return {valeur:r,rep:vrai(r)};
        const v=nombre(r); let k=0; x.paliers.forEach((p,i)=>{ if(i===0||(p.de!=null&&v>=p.de)) k=i; }); return {valeur:v,rep:k};
      }catch(e){ return {erreur:e instanceof ErreurCalcul?e.message:"erreur"}; }
    }
    // On suit l'arbre : un test n'est posé que si la réponse au-dessus de lui est sortie. ask(x) → {a, rep, force}.
    // Renvoie reps (chaque test, posé ou non, avec sa réponse) et motif (tag éliminé → pourquoi).
    function solve(ask){
      const direct=new Map(), reps=[], vus=new Set();
      const visite=(x,num,prof,saute)=>{
        if(vus.has(x.id)) return; vus.add(x.id);
        if(saute){ reps.push({x,num,prof,saute});
          let k=0; for(const b of branches(x)) for(const c of suivants(x.id,b)) visite(c,num+"."+(++k),prof+1,"la question "+num+" n'est pas posée"); return; }
        const {a,rep,force}=ask(x);
        let ids=[], libelle="sans réponse", branche=null;
        if(rep!==undefined){ if(x.type==="binaire"){ ids=rep?x.oui:x.non; libelle=rep?"oui":"non"; branche=libelle; } else { const p=x.paliers[rep]; ids=p?.elimine||[]; libelle=p?.nom||("palier "+(rep+1)); branche=p?.id; } }
        for(const id of ids){ if(!direct.has(id)) direct.set(id,[]); direct.get(id).push(num+". "+x.nom+" → "+libelle); }
        reps.push({x,num,prof,a,rep,force:Boolean(force),libelle,ids});
        let k=0; for(const b of branches(x)) for(const c of suivants(x.id,b)){ const n=num+"."+(++k);
          visite(c,n,prof+1,branche===b?null:rep===undefined?"la question "+num+" attend sa réponse":"posé seulement si « "+x.nom+" » → "+libRep(x,b)); }
      };
      doc.tests.filter(t=>!t.si).forEach((t,i)=>visite(t,String(i+1),0,null));
      // Un tag tombe si un test l'élimine, s'il est inactif, ou si l'un de ses parents tombe (jusqu'à ce que plus rien
      // ne change).
      const motif=new Map([...direct].map(([id,r])=>[id,r.join(" ; ")]));
      for(const t of doc.tags) if(t.inactif&&!motif.has(t.id)) motif.set(t.id,"tag inactif (pas encore dans le jeu)");
      for(let encore=true;encore;){ encore=false;
        for(const t of doc.tags) if(!motif.has(t.id)){ const p=t.parents.find(x=>motif.has(x)); if(p){ motif.set(t.id,"son parent « "+nomTag(p)+" » est éliminé"); encore=true; } } }
      return {reps,motif};
    }
    // Les tags qui restent, et ceux qui s'affichent (Idan) : pour une branche, le tag le plus bas qui reste ; une
    // catégorie qui « garde X » ne montre que ses X tags de plus haut rang qui restent (à rang égal, l'ordre de la liste).
    function displayed(motif){
      const restent=doc.tags.filter(t=>!t.groupe&&!motif.has(t.id));
      const plusBas=t=>![...descendants(t.id)].some(id=>{ const d=tagPar(id); return d&&!d.groupe&&!motif.has(id); });
      const gardes=new Map();
      for(const c of doc.tags.filter(c=>c.groupe&&c.garder)){
        const cand=[...descendants(c.id)].map(tagPar).filter(d=>d&&!d.groupe&&!motif.has(d.id))
          .sort((a,b)=>(b.rang??-Infinity)-(a.rang??-Infinity)||doc.tags.indexOf(a)-doc.tags.indexOf(b));
        gardes.set(c.id,new Set(cand.slice(0,c.garder).map(d=>d.id)));
      }
      const limitees=t=>[...ancetres(t.id)].filter(id=>gardes.has(id));
      const affiches=restent.filter(t=>{ const l=limitees(t); return l.length?l.every(id=>gardes.get(id).has(t.id)):plusBas(t); });
      return {restent,affiches};
    }
    // Tout d'un coup, sur des valeurs : les tags affichés, ceux qui restent, les éliminés.
    function tags(values,opts){
      const {reps,motif}=solve(x=>{ const a=answer(x,values,opts); return {a,rep:a.rep}; });
      return {...displayed(motif),motif,reps};
    }
    return {tagPar,nomTag,enfants,descendants,ancetres,branches,suivants,libRep,constante,answer,solve,displayed,tags};
  }

  // ---- La compagnie ----
  // Les variables comparables (« le meilleur de la compagnie ») : caractéristiques, résistances, compétences chiffrées,
  // auras (Commandement, Idan, 2026-11-22 : « la plus forte aura de la compagnie »).
  const comparableKey=k=>/^(carac|res|comp|aura)\./.test(k);
  const comparable=(k,v)=>comparableKey(k)&&typeof v==="number";
  // values : les siennes ; others : celles des autres membres ; etoiles : le niveau de renommée de la compagnie (1 à 15).
  function withCompany(values,others=[],etoiles=1){
    const out={...values,"compagnie.etoiles":Number(etoiles)||1,"compagnie.taille":others.length+1};
    for(const [k,v] of Object.entries(values)) if(comparable(k,v)){
      let m=Number(v)||0; for(const o of others){ const x=Number(o?.[k])||0; if(x>m) m=x; }
      out["compagnie.max."+k]=m;
    }
    return out;
  }

  // ---- Les variables d'un mercenaire (à l'instant T, équipement compris) ----
  // Les mêmes que celles de l'atelier (scripts/atelier-tags/profils.js). deps : reference (les tables du jeu), engine
  // (combat-engine), gear (equipment-effects), magic, stars, profile (mercenary-profile).
  function createTagVariables({reference,engine,gear,magic,stars,profile}={}){
    const rows=t=>Array.isArray(t?.rows)?t.rows:[];
    const pdata=reference?.mercenaryProfile||{};
    const spellRows=new Map(rows(reference?.spells).map(r=>[r.code,r]));
    const mountRows=new Map(rows(reference?.mounts).map(r=>[r.code,r]));
    const weaponRows=new Map(rows(reference?.weapons).map(r=>[r.nom,r]));
    const key=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[’']/g,"_").replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
    const r1=v=>Math.round(v*10)/10;
    const DOMAINE={melee:"contact",ranged:"distance",magic:"magie"};
    const roleTags=r=>(r?.tags||[]).filter(t=>String(t).startsWith("role/"));
    const tagKey=t=>t.slice(5).replace(/\//g,".").replace(/-/g,"_");
    const tagLabel=t=>t.slice(5).replace(/\//g," › ").replace(/-/g," ");
    // L'étalon en gambison, comme les titres (mercenary-profile.js) : pour choisir le set de tir le plus efficace.
    const etalonLeger=(()=>{ const et=pdata.etalon; if(!et?.armes?.leger) return null; const g=et.armes.leger,row=weaponRows.get(g.arme)||{},cat=String(row.domaine||"").split(",")[0].trim();
      return {character:{id:"etalon-leger",name:"Étalon",stats:{...(et.caracteristiques||{})},resistances:{},skills:{martial:{[cat]:et.maitrise,[g.arme]:et.maitrise},magic:{}},spells:[],
        items:[{id:"w",name:g.arme,itemType:"weapon",tier:1,qualityCode:"standard",category:cat},{id:"a",name:g.armure,itemType:"armor",tier:1,qualityCode:"standard"}],
        equipment:{slots:{weapon_set_1_main:"w",armor:"a"}}},activeSet:1}; })();
    const SCHOOLS=[...new Set([...spellRows.values()].map(r=>r.ecole).filter(Boolean))];
    const VARS=[], seen=new Map();
    const v=(k,label,groupe,type)=>{ if(!seen.has(k)){ seen.set(k,VARS.length); VARS.push({k,label,groupe,type}); } };
    // Les variables des tags de sorts existent pour tout le monde (0 s'il n'en connaît pas).
    function declareSpellVars(){
      for(const r of spellRows.values()) for(const t of roleTags(r)){
        v("sorts."+tagKey(t),"Sorts « "+tagLabel(t)+" »","Sorts","nombre");
        v("chance."+tagKey(t),"Chance de réussir son meilleur sort « "+tagLabel(t)+" » (%)","Sorts : chance de réussite (%)","nombre");
        v("cout."+tagKey(t),"Coût en mana de son sort « "+tagLabel(t)+" » le moins cher","Sorts : coût en mana","nombre");
        if(r.duree_base!=null) v("duree."+tagKey(t),"Durée (tours) de son sort « "+tagLabel(t)+" » le plus long","Sorts : durée en tours","nombre");
      }
      for(const r of spellRows.values()) for(const t of roleTags(r)) if(t!=="role/soin")
        v("moy.cout."+tagKey(t),"Coût moyen en mana de ses sorts « "+tagLabel(t)+" »","Sorts : coût en mana","nombre");
      // Les moyennes des soins, pour chaque tag de sort (Idan, 2026-11-23 : sorts de soutien et entraves).
      for(const r of spellRows.values()) for(const t of roleTags(r)) if(t!=="role/soin"){
        v("moy.chance."+tagKey(t),"Réussite moyenne de ses sorts « "+tagLabel(t)+" » (%)","Sorts : moyennes par tag","nombre");
        v("moy.ecole."+tagKey(t),"Niveau moyen des écoles de ses sorts « "+tagLabel(t)+" » (équipement compris)","Sorts : moyennes par tag","nombre");
        v("lancers."+tagKey(t),"Nombre de sorts « "+tagLabel(t)+" » qu'il peut lancer avec sa réserve (coût moyen)","Sorts : moyennes par tag","nombre");
      }
      // Le bonus des sorts qui en donnent un (Courage de masse : +20, +5 par pas de maîtrise ; magic.bonus).
      for(const r of spellRows.values()) if(r.bonus_base!=null) for(const t of roleTags(r))
        v("bonus."+tagKey(t),"Bonus de son meilleur sort « "+tagLabel(t)+" » (points)","Sorts : bonus","nombre");
    }
    // role : sa place dans la compagnie, « capitaine », « lieutenant » ou rien (le jeu la donne ; une recrue n'en a pas).
    function of(c,{role=""}={}){
      const unit={character:c,activeSet:1};
      const out={};
      const put=(k,label,groupe,type,val)=>{ v(k,label,groupe,type); out[k]=val; };
      // Identité
      put("nom","Nom","Identité","texte",c.name||"");
      put("peuple","Peuple","Identité","texte",c.people||"");
      put("culture","Culture","Identité","texte",c.culture||"");
      put("origine","Origine","Identité","texte",c.origin||"");
      put("alignement","Alignement","Identité","texte",c.alignment||"");
      put("ascendance","Ascendance","Identité","texte",c.ascendance||"");
      put("niveau_ascendance","Niveau d'ascendance","Identité","nombre",Number(c.ascendanceLevel)||0);
      put("domaine","Domaine (contact, distance, magie)","Identité","texte",DOMAINE[c.domain]||c.domain||"");
      put("etoiles","Étoiles (réputation)","Identité","nombre",stars?.personal?.(c.reputation)?.level||1);
      put("role","Sa place dans la compagnie (capitaine, lieutenant, ou rien)","Identité","texte",role==="capitaine"||role==="lieutenant"?role:"");
      put("pv_max","PV max","Identité","nombre",Number(c.pvMax)||0);
      put("mana","Mana","Identité","nombre",Number(c.mana)||0);
      // Caractéristiques à l'instant T (Idan, 2026-11-21 : « On doit prendre en compte l'équipement ») : la valeur que
      // montre la fiche du jeu (equipment-effects.js), armure, armes, casque et combat à deux armes compris.
      const fx=gear?.effects?gear.effects(c):{};
      const avec=s=>Number.isFinite(Number(fx[s]?.value))?Number(fx[s].value):Number(engine.statWithGear(unit,s))||0;
      for(const s of Object.keys(c.stats||{})) put("carac."+key(s),s,"Caractéristiques (équipement et armure compris)","nombre",r1(avec(s)));
      // Résistances à l'instant T (Idan, 2026-11-21) : pour le feu, le froid, la foudre et le poison, la protection du
      // combat (résistance + armure portée + bonus, sans plafond), comme elementalDamage la compte.
      const ELEMENT={"Résistance au feu":"feu","Résistance au froid":"froid","Résistance à la foudre":"foudre","Résistance au poison":"poison"};
      for(const s of Object.keys(c.resistances||{})){
        const el=ELEMENT[s], x=el&&engine.elementalProtection?Number(engine.elementalProtection(unit,el).total):Number(engine.statWithGear(unit,s));
        put("res."+key(s.replace(/^Résistance (au |à la |aux |à l’|physique)?/,"")||"physique"),s,"Résistances (équipement et armure compris)","nombre",r1(Number.isFinite(x)?x:Number(c.resistances[s])||0));
      }
      // Compétences
      const mart=c.skills?.martial||{};
      const CATS=["Lames longues","Lames courtes","Armes d’hast","Armes articulées","Haches","Bâtons","Boucliers","Armes à feu","Armes contondantes","Armes de tir","Armes flexibles","Combat à deux armes","Combat à une main","Combat à deux mains","Discrétion","Pièges","Magie en armure"];
      // Toutes, pour tout le monde (0 s'il ne l'a pas) : la liste des variables est la même pour chaque mercenaire.
      for(const s of CATS) put("comp."+key(s),s,"Compétences (équipement compris)","nombre",s in mart?r1(Number(engine.statWithGear(unit,s))||Number(mart[s])||0):0);
      put("comp.intimidation","Intimidation","Compétences (équipement compris)","nombre",r1(Number(engine.statWithGear(unit,"Intimidation"))||0));
      put("comp.perception_effective","Perception effective","Compétences (équipement compris)","nombre",r1(Number(engine.statWithGear(unit,"Perception"))||0));
      put("comp.discretion_effective","Discrétion effective (armure comprise)","Compétences (équipement compris)","nombre",r1(Number(engine.effectiveStealth(unit))||0));
      put("port.legere","Port d'armure légère","Compétences (équipement compris)","oui/non",mart["Port d’armure légère"]===true);
      put("port.intermediaire","Port d'armure intermédiaire","Compétences (équipement compris)","oui/non",mart["Port d’armure intermédiaire"]===true);
      put("port.lourde","Port d'armure lourde","Compétences (équipement compris)","oui/non",mart["Port d’armure lourde"]===true);
      put("empoisonnement","Empoisonnement des armes","Compétences (équipement compris)","oui/non",mart["Empoisonnement des armes"]===true);
      // Écoles
      for(const s of new Set([...SCHOOLS,...Object.keys(c.skills?.magic||{})])) put("ecole."+key(s),s,"Écoles de magie (équipement compris)","nombre",r1(Number(engine.statWithGear(unit,s))||0));
      // Capacités
      const terr=(engine.terrainSkillsOf?engine.terrainSkillsOf(unit):[]).map(t=>t.code);
      put("capacite.vol","Vol (par lui-même)","Capacités","oui/non",Boolean(engine.skillFlies&&engine.skillFlies(unit)));
      put("capacite.regeneration","Régénération","Capacités","nombre",Number(c.skills?.physiology?.["Régénération"])||0);
      put("capacite.vision_nocturne","Vision nocturne","Capacités","oui/non",c.skills?.physiology?.["Vision nocturne"]===true);
      put("capacite.respiration_aquatique","Respiration aquatique","Capacités","oui/non",terr.includes("respiration_aquatique"));
      put("capacite.deplacement_aquatique","Déplacement aquatique","Capacités","oui/non",terr.includes("deplacement_aquatique"));
      put("capacite.deplacement_sylvain","Déplacement sylvain","Capacités","oui/non",terr.includes("deplacement_sylvain"));
      // Équipement porté
      const items=new Map((c.items||[]).map(it=>[it.id,it]));
      const slot=s=>items.get(c.equipment?.slots?.[s])||null;
      const fam=it=>it?(it.combatFamily==="ranged"?"distance":it.combatFamily==="melee"?"contact":it.combatFamily||""):"";
      for(const [n,s] of [[1,"weapon_set_1"],[2,"weapon_set_2"]]){
        const m=slot(s+"_main"),o=slot(s+"_off");
        put("arme"+n,"Set "+n+" : arme","Équipement porté","texte",m?.name||"");
        put("arme"+n+".categorie","Set "+n+" : catégorie de l'arme","Équipement porté","texte",m?.category||"");
        put("arme"+n+".famille","Set "+n+" : contact ou distance","Équipement porté","texte",fam(m));
        put("arme"+n+".prise","Set "+n+" : prise","Équipement porté","texte",m?.grip||"");
        put("arme"+n+".main_gauche","Set "+n+" : main gauche","Équipement porté","texte",o?.name||"");
        put("arme"+n+".bouclier","Set "+n+" : bouclier","Équipement porté","oui/non",Boolean(o&&(o.category==="Boucliers"||weaponRows.get(o.name)?.categorie==="Boucliers")));
      }
      // Le tir (Idan, 2026-11-22 : tags du Tireur) : son set de tir le plus efficace (dégâts par tour contre l'étalon en
      // gambison, comme les titres), sans le pistolet (« particulier »), et les valeurs du moteur avec ce set en main.
      const tirSets=profile&&etalonLeger?[1,2].filter(set=>profile.setWeapon(c,set,true)?.weapon?.nom!=="Pistolet")
        .map(set=>({set,dps:profile.setDamage(c,set,true,etalonLeger)})).filter(x=>x.dps!=null).sort((a,b)=>b.dps-a.dps):[];
      const tirUnit=tirSets.length?{character:c,activeSet:tirSets[0].set}:null;
      const tirArme=tirUnit&&engine.weaponTemplate(engine.activeWeaponItem(tirUnit));
      put("tir.arme","Son arme de tir la plus efficace (hors pistolet)","Tir (son meilleur set de tir)","texte",tirArme?.nom||"");
      put("tir.repetable","Son arme de tir enchaîne les tirs (arc, arbalète, fronde, sarbacane)","Tir (son meilleur set de tir)","oui/non",Boolean(tirArme&&engine.isRepeatable(tirArme)));
      put("tir.precision","Précision au tir (toucher)","Tir (son meilleur set de tir)","nombre",tirUnit?r1(engine.attackPrecision(tirUnit)):0);
      put("tir.puissance","Puissance au tir (blesser)","Tir (son meilleur set de tir)","nombre",tirUnit?r1(engine.attackPower(tirUnit,"ranged")):0);
      put("tir.dex_vit","Dextérité + Vitesse effectives (enchaîner les tirs)","Tir (son meilleur set de tir)","nombre",
        r1(Number(engine.effectiveDexterity(tirUnit||unit))+Number(engine.effectiveSpeed(tirUnit||unit))));
      put("tir.degats_tour","Dégâts par tour au tir contre l'étalon en gambison (comme les titres)","Tir (son meilleur set de tir)","nombre",tirSets.length?r1(tirSets[0].dps):0);
      put("pm","PM : cases de déplacement","Capacités","nombre",Number(engine.movementBase(unit))||0);
      const arm=slot("armor");
      put("armure","Armure","Équipement porté","texte",arm?.name||"");
      put("armure.classe","Classe d'armure","Équipement porté","texte",c.equipment?.armorClass||"");
      const mount=slot("mount"); const mrow=mount&&mountRows.get(mount.mountCode);
      put("monture","Monture","Équipement porté","texte",mrow?.nom||mount?.name||"");
      put("monture.vol","Monture volante","Équipement porté","oui/non",Boolean(mrow?.physiologie?.Vol));
      const belt=["belt_item_1","belt_item_2","belt_item_3","belt_item_4"].map(slot).filter(Boolean);
      put("ceinture","Objets à la ceinture","Équipement porté","liste",belt.map(b=>b.name));
      // Sorts
      const known=(c.spells||[]).filter(s=>spellRows.has(s.code));
      put("sorts","Sorts connus","Sorts","liste",known.map(s=>spellRows.get(s.code).nom));
      put("nb_sorts","Nombre de sorts","Sorts","nombre",known.length);
      declareSpellVars();
      for(const s of known) for(const t of roleTags(spellRows.get(s.code))) out["sorts."+tagKey(t)]=(out["sorts."+tagKey(t)]||0)+1;
      // Chance de réussir (magic.castChance : maîtrise de l'école, Intelligence, armure) : la meilleure de chaque tag.
      let best=0;
      for(const sp of known){ const pc=Math.round(Number(magic?.castChance(unit,sp.code)?.p)||0); best=Math.max(best,pc);
        for(const t of roleTags(spellRows.get(sp.code))) out["chance."+tagKey(t)]=Math.max(out["chance."+tagKey(t)]||0,pc); }
      put("chance.sort","Chance de réussir son meilleur sort (%)","Sorts : chance de réussite (%)","nombre",best);
      // Coût en mana (le moins cher), durée en tours (la plus longue), coût moyen (Idan, 2026-11-21 : « la moyenne »).
      const somme={},nb={};
      for(const sp of known){ const row=spellRows.get(sp.code), mc=Number(magic?.manaCost(unit,sp.code))||0, du=row.duree_base!=null?Number(magic?.duration(unit,sp.code))||0:0;
        for(const t of roleTags(row)){ const k=tagKey(t);
          out["cout."+k]=Math.min(out["cout."+k]??Infinity,Math.round(mc));
          if(du) out["duree."+k]=Math.max(out["duree."+k]||0,du);
          somme[t]=(somme[t]||0)+mc; nb[t]=(nb[t]||0)+1; } }
      for(const [t,n] of Object.entries(nb)) if(t!=="role/soin") out["moy.cout."+tagKey(t)]=r1(somme[t]/n);
      for(const sp of known){ const row=spellRows.get(sp.code); if(row.bonus_base==null) continue;
        const b=Number(magic?.bonus?.(unit,sp.code))||0;
        for(const t of roleTags(row)) out["bonus."+tagKey(t)]=Math.max(out["bonus."+tagKey(t)]||0,b); }
      const reserve=Number(engine.statWithGear(unit,"Réserve de mana"))||0;
      // Moyennes sur tous ses sorts de soin (Idan, 2026-11-21 : « on peut prendre la moyenne de tous les sorts de soin »).
      const soins=known.filter(sp=>(spellRows.get(sp.code).tags||[]).includes("role/soin"));
      const moy=f=>soins.length?soins.reduce((t,sp)=>t+f(sp),0)/soins.length:0;
      const moyCout=moy(sp=>Number(magic?.manaCost(unit,sp.code))||0);
      put("moy.chance.soin","Réussite moyenne de ses sorts de soin (%)","Sorts : moyennes des soins","nombre",Math.round(moy(sp=>Number(magic?.castChance(unit,sp.code)?.p)||0)));
      put("moy.cout.soin","Coût moyen en mana de ses sorts de soin","Sorts : moyennes des soins","nombre",r1(moyCout));
      put("moy.ecole.soin","Niveau moyen des écoles de ses sorts de soin (équipement compris)","Sorts : moyennes des soins","nombre",r1(moy(sp=>Number(engine.statWithGear(unit,spellRows.get(sp.code).ecole))||0)));
      put("lancers.soin","Nombre de soins qu'il peut lancer avec sa réserve (coût moyen de ses soins)","Sorts : moyennes des soins","nombre",moyCout?Math.floor(reserve/moyCout):0);
      put("sorts.soin_rapide","Sorts de soin en action rapide","Sorts","nombre",soins.filter(sp=>spellRows.get(sp.code).action==="rapide").length);
      // Les mêmes moyennes pour chaque autre tag de sort (Idan, 2026-11-23 : Enchanteur, Immobilisateur, Affaiblisseur,
      // Démoralisateur) : réussite moyenne, niveau moyen de leurs écoles, et combien il peut en lancer avec sa réserve.
      const parTag={};
      for(const sp of known) for(const t of roleTags(spellRows.get(sp.code))) (parTag[t]||(parTag[t]=[])).push(sp);
      for(const [t,liste] of Object.entries(parTag)) if(t!=="role/soin"){
        const k=tagKey(t), m=f=>liste.reduce((x,sp)=>x+f(sp),0)/liste.length, cout=somme[t]/nb[t];
        out["moy.chance."+k]=Math.round(m(sp=>Number(magic?.castChance(unit,sp.code)?.p)||0));
        out["moy.ecole."+k]=r1(m(sp=>Number(engine.statWithGear(unit,spellRows.get(sp.code).ecole))||0));
        out["lancers."+k]=cout?Math.floor(reserve/cout):0;
      }
      // Par école, comme les soins (Idan, 2026-11-23 : tags des écoles, « Tu avais fait des seuils et des constantes pour
      // soin, tu peux te baser dessus ») : ses sorts de l'école, leur réussite moyenne, leur coût moyen, et combien il
      // peut en lancer avec sa réserve ; puis les mêmes sur tous ses sorts (Mage pluridisciplinaire et suivants).
      const moyennes=(liste,k,lib,groupe)=>{
        const m=f=>liste.length?liste.reduce((t,sp)=>t+f(sp),0)/liste.length:0;
        const cout=m(sp=>Number(magic?.manaCost(unit,sp.code))||0);
        put("moy.chance."+k,"Réussite moyenne de "+lib+" (%)",groupe,"nombre",Math.round(m(sp=>Number(magic?.castChance(unit,sp.code)?.p)||0)));
        put("moy.cout."+k,"Coût moyen en mana de "+lib,groupe,"nombre",r1(cout));
        put("lancers."+k,"Nombre de "+lib+" qu'il peut lancer avec sa réserve (coût moyen)",groupe,"nombre",cout?Math.floor(reserve/cout):0);
      };
      for(const s of SCHOOLS){
        const k="ecole."+key(s), lib="ses sorts de l'école "+s, deEcole=known.filter(sp=>spellRows.get(sp.code).ecole===s);
        put("sorts."+k,"Sorts connus de l'école "+s,"Sorts par école","nombre",deEcole.length);
        moyennes(deEcole,k,lib,"Sorts par école");
      }
      put("nb_ecoles_sorts","Nombre d'écoles où il connaît au moins un sort","Sorts par école","nombre",new Set(known.map(sp=>spellRows.get(sp.code).ecole)).size);
      moyennes(known,"sorts","tous ses sorts","Sorts par école");
      // Les auras de courage (Commandement, Idan, 2026-11-22) : celle d'officier, en points de Courage pour ses alliés
      // (capitaine : 0,35 × Courage + 0,25 × Charisme ; lieutenant : la moitié ; combat-engine.js), celle de son fouet (le %
      // du Courage de chaque allié proche, selon le tier : 5 / 10 / 15 / 20), et la plus forte en points (officier ou sort).
      const officier=role==="capitaine"&&engine.captainAuraBonus?engine.captainAuraBonus(unit):role==="lieutenant"&&engine.lieutenantAuraBonus?engine.lieutenantAuraBonus(unit):0;
      put("aura.officier","Son aura d'officier (points de Courage pour ses alliés ; capitaine ou lieutenant)","Auras","nombre",Number(officier)||0);
      let fouet=0;
      for(const s of ["weapon_set_1_main","weapon_set_1_off","weapon_set_2_main","weapon_set_2_off"]){
        const it=slot(s), w=it&&engine.weaponTemplate(it);
        if(w?.aura_caracteristique==="Courage") fouet=Math.max(fouet,Number(w["aura_t"+Math.min(4,Math.max(1,Math.round(Number(it.tier)||1)))])||0);
      }
      put("aura.fouet","L'aura de son fouet (% du Courage de chaque allié proche)","Auras","nombre",fouet);
      put("aura.courage","Sa plus forte aura de courage en points (officier, ou son meilleur sort de commandement)","Auras","nombre",
        Math.max(Number(officier)||0,Number(out["bonus.commandement"])||0));
      // Mesures des titres (doc 19)
      const ev=profile?.evaluate?profile.evaluate(c):null;
      const vals=ev?.values||{};
      for(const s of Object.keys(pdata.sources||{}).filter(k=>k!=="description")){
        v("mesure."+s,"Mesure : "+s.replace(/_/g," "),"Mesures du jeu (titres, doc 19)","nombre");
        v("niveau."+s,"Niveau : "+s.replace(/_/g," ")+" (1 à 15)","Niveaux du jeu (titres, doc 19)","nombre");
        if(vals[s]!=null){ out["mesure."+s]=r1(vals[s]); out["niveau."+s]=profile.level(s,vals[s])?.level||0; }
      }
      for(const cat of pdata.categories||[]){
        v("titre."+cat.code,"Titre « "+cat.nom+" » : niveau","Niveaux du jeu (titres, doc 19)","nombre");
        const found=ev?.categories?.find(x=>x.code===cat.code); if(found) out["titre."+cat.code]=found.level;
      }
      // Valeurs manquantes : 0, faux, "" ou [] selon le type.
      for(const x of VARS) if(out[x.k]===undefined) out[x.k]=x.type==="nombre"?0:x.type==="oui/non"?false:x.type==="liste"?[]:"";
      return out;
    }
    return {of,vars:()=>VARS};
  }

  return {norm,cle,ErreurCalcul,nombre,vrai,lexer,analyse,variablesDe,evalue,clean,createTagTree,withCompany,comparableKey,createTagVariables};
});
