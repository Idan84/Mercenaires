"use strict";

// Besoin en avatars (Idan, 2026-10-30) : combien d'avatars il faut, et lesquels, pour qu'un joueur trouve presque toujours
// un visage qui corresponde à ses mercenaires. Outil de production (Design Lab, onglet Avatars), sans effet sur le jeu.
//
// - On raisonne par culture : dans une partie, un joueur voit passer N mercenaires d'une même culture (escouade de départ,
//   embauches, Taverne ; avatars.demand.mercenaries, 50). Le peuple n'entre plus en compte.
// - Case précise (PP) = culture × ascendance × ce qui se voit en main : l'arme précise, ou l'école du mage.
//   Sa part p = part exacte de l'ascendance (peoples.json, ancestry-compatibility.json) × part de l'arme ou de l'école chez
//   les mercenaires de cette culture et de cette ascendance, mesurée une fois sur un grand nombre de tirages du vrai
//   générateur (data/reference/avatar-demand.json, scripts/build-avatar-demand.js). Rien ne bouge d'une visite à l'autre.
// - Besoin d'une case = nombre d'avatars pour que le risque d'en manquer sur N tirages reste sous S (loi binomiale exacte) :
//   S = 10 % pour les mercenaires sans ascendance, 20 % pour ceux qui en ont une (avatars.demand.threshold, *_ascendance).
// - Un avatar ne sert qu'une fois (règle du jeu : jamais deux fois le même visage, ceux des morts ne reviennent pas). Chaque
//   avatar va dans une seule case, de façon à couvrir le plus de besoins possible, le premier avatar de chaque case d'abord.
//   Un avatar tagué pour plusieurs cultures compte dans chacune (chaque culture est un tirage à part).
// - Repli PL = culture × ascendance × profil (corps à corps, distance, magie) : les mercenaires qui débordent des cases
//   précises, ou qui tombent dans une case trop rare pour en avoir une, prennent un avatar resté libre de leur groupe.
// - Couleur d'une case : vert, assez d'avatars précis ; orange, pas assez, mais avec le repli le risque de manquer reste
//   sous 2 × S (avatars.demand.fallback_factor) ; rouge, même avec le repli, ça ne suffit pas. Un groupe de repli en manque
//   dont aucune case n'est rouge (cases trop rares ou déjà vertes) compte lui aussi comme une case rouge.
// - Culture et ascendance suivent les règles du jeu (avatars.js) : un mercenaire sans ascendance peut prendre un avatar
//   d'ascendance généraliste, pas « Ascendance only ». Un avatar tagué d'une catégorie d'arme (« Armes de tir ») ne compte
//   pas pour une arme précise, seulement pour le repli.
(function(root,factory){
  const deps=typeof module!=="undefined"&&module.exports
    ?{avatars:require("./avatars.js")}
    :{avatars:root.MercenairesAvatars};
  const api=factory(deps);
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesAvatarDemand=api;
})(typeof globalThis!=="undefined"?globalThis:this,function({avatars}){
  const norm=avatars.norm;
  const PROFILES=["melee","ranged","magic"];
  const DEFAULTS={mercenaries:50,threshold:0.10,thresholdAscendance:0.20,fallbackFactor:2};
  // Tables qui décident de l'arme ou de l'école d'un mercenaire : si l'une change, les mesures sont à refaire.
  const FINGERPRINT_TABLES=["peoples","cultures","socialOrigins","ancestries","ancestryCompatibility","cultureOriginCompatibility",
    "ancestryLevels","d6Scale","generationMatrix","skills","characteristics","weapons","equipmentSlots","startingEquipmentGeneration",
    "binaryAptitudeGrants","domains"];

  function constant(reference,code,fallback){
    const row=(reference?.formulaConstants?.rows||[]).find(r=>r.code===code);
    const value=Number(row?.valeur??row?.value);
    return Number.isFinite(value)?value:fallback;
  }

  function settingsOf(reference){
    return {
      mercenaries:constant(reference,"avatars.demand.mercenaries",DEFAULTS.mercenaries),
      threshold:constant(reference,"avatars.demand.threshold",DEFAULTS.threshold),
      thresholdAscendance:constant(reference,"avatars.demand.threshold_ascendance",DEFAULTS.thresholdAscendance),
      fallbackFactor:constant(reference,"avatars.demand.fallback_factor",DEFAULTS.fallbackFactor)
    };
  }

  // Empreinte (FNV-1a) des tables de génération, et des constantes generation.* : notée avec les mesures.
  function fingerprint(reference){
    const parts=FINGERPRINT_TABLES.map(key=>JSON.stringify(reference?.[key]??null));
    parts.push(JSON.stringify((reference?.formulaConstants?.rows||[]).filter(r=>String(r.code||"").startsWith("generation."))));
    let h=0x811c9dc5;
    for(const ch of parts.join("|")){ h^=ch.codePointAt(0); h=Math.imul(h,0x01000193)>>>0; }
    return h.toString(16).padStart(8,"0");
  }

  // --- Loi binomiale : X = nombre de mercenaires de la case parmi n, chacun avec la probabilité p ---
  function binomialPmf(n,p){
    const out=new Float64Array(n+1);
    if(p<=0){ out[0]=1; return out; }
    if(p>=1){ out[n]=1; return out; }
    let pk=Math.pow(1-p,n);
    for(let k=0;k<=n;k++){ out[k]=pk; pk=pk*(n-k)/(k+1)*p/(1-p); }
    return out;
  }
  // P(X > a)
  function riskAbove(p,n,a){
    const pmf=binomialPmf(n,p);
    let below=0;
    for(let k=0;k<=Math.min(a,n);k++) below+=pmf[k];
    return Math.max(0,1-below);
  }
  // Plus petit nombre d'avatars a tel que P(X > a) ≤ s.
  function binomialNeed(p,n,s){
    const pmf=binomialPmf(n,p);
    let tail=1;
    for(let a=0;a<=n;a++){ tail-=pmf[a]; if(tail<=s+1e-12) return a; }
    return n;
  }

  // Ascendances possibles du peuple et part exacte de chacune ; null = sans ascendance.
  function ascendanceShares(reference,people){
    const presence=Number((reference?.peoples?.rows||[]).find(r=>r.nom===people)?.probabilite_d_ascendance)||0;
    const rows=(reference?.ancestryCompatibility?.rows||[]).filter(r=>r.peuple===people&&r.possible===true&&r.ascendance);
    const total=rows.reduce((sum,r)=>sum+(Number(r.poids_relatif)||1),0);
    return [[null,1-presence],...rows.map(r=>[r.ascendance,total?presence*(Number(r.poids_relatif)||1)/total:0])];
  }

  // Noms affichés : armes (weapons.json) et écoles (skills.json, domaine Magie).
  function displayNames(reference){
    return new Map([
      ...(reference?.weapons?.rows||[]).map(w=>[norm(w.nom),w.nom]),
      ...(reference?.skills?.rows||[]).filter(r=>r.domaine==="Magie").map(r=>[norm(r.nom),r.nom])
    ]);
  }

  // Ce qui se voit d'un mercenaire : son profil et ce qu'il tient en main (première arme de son profil, ou son école).
  function lookOf(m,families){
    const t=avatars.avatarTags(m,families);
    return {profile:t.profile[0]||null,value:t.main[0]||null};
  }

  // Graine stable par culture et ascendance : chaque mesure a ses propres tirages.
  function seedOf(text){
    let h=2166136261;
    for(const ch of String(text)){ h^=ch.codePointAt(0); h=Math.imul(h,16777619)>>>0; }
    return 1+h%2147483646;
  }
  function seededRandom(seed){
    let s=seed;
    return ()=>(s=(s*16807)%2147483647)/2147483647;
  }

  // Mesure d'une culture : pour chaque ascendance possible (et sans ascendance), `draws` mercenaires tirés par le vrai
  // générateur, culture et ascendance imposées, niveau d'ascendance tiré comme dans le jeu, sans capitaine.
  // createGenerator(random) → générateur du jeu ; draws : {none, ascendance}.
  function measureCulture({reference,createGenerator,people,culture,draws={none:40000,ascendance:8000}}){
    const families=avatars.weaponFamilies(reference?.weapons?.rows||[]);
    const names=displayNames(reference);
    return ascendanceShares(reference,people).map(([ascendance])=>{
      const generator=createGenerator(seededRandom(seedOf(culture+"|"+(ascendance||""))));
      const count=ascendance?draws.ascendance:draws.none;
      const looks=new Map();
      for(let i=0;i<count;i++){
        const m=generator.createMercenary({id:i+1,forcedPeople:people,forcedCulture:culture,
          forcedAscendance:ascendance,forcedAscendanceLevel:ascendance?"draw":null});
        const look=lookOf(m,families);
        const key=look.profile+"|"+look.value;
        if(!looks.has(key)) looks.set(key,{profile:look.profile,value:look.value?names.get(look.value)||look.value:null,count:0});
        looks.get(key).count++;
      }
      return {ascendance,draws:count,looks:[...looks.values()].sort((a,b)=>b.count-a.count)};
    });
  }

  // --- Affectation : chaque avatar sert une seule case (couplage maximum, chemins augmentants) ---
  // slots : places à pourvoir, dans l'ordre de priorité ; ok(avatar, slot).
  function matchSlots(slots,pool,ok){
    const adj=slots.map(slot=>pool.filter(a=>ok(a,slot)));
    const owner=new Map();
    function augment(i,seen){
      for(const a of adj[i]){
        if(seen.has(a.id)) continue;
        seen.add(a.id);
        if(!owner.has(a.id)||augment(owner.get(a.id),seen)){ owner.set(a.id,i); return true; }
      }
      return false;
    }
    slots.forEach((_,i)=>augment(i,new Set()));
    return owner;
  }

  // Loi exacte du débordement d'un groupe PL : Y = Σ max(0, X_case − avatars précis de la case), les X suivant la loi
  // multinomiale de n tirages. Les cases sans avatar précis sont regroupées (même débordement : tout leur effectif).
  function overflowDistribution(cells,n){
    const parts=[];
    let bare=0;
    for(const c of cells){ if(c.assigned>0) parts.push({p:c.p,a:c.assigned}); else bare+=c.p; }
    if(bare>0) parts.push({p:bare,a:0});
    let dp=Array.from({length:n+1},()=>new Float64Array(n+1));
    dp[n][0]=1;
    let mass=1;
    for(const part of parts){
      const q=mass>0?Math.min(1,part.p/mass):0;
      mass-=part.p;
      const next=Array.from({length:n+1},()=>new Float64Array(n+1));
      for(let r=0;r<=n;r++){
        const pmf=binomialPmf(r,q);
        for(let y=0;y<=n;y++){
          const v=dp[r][y];
          if(!v) continue;
          for(let x=0;x<=r;x++) if(pmf[x]) next[r-x][Math.min(n,y+Math.max(0,x-part.a))]+=v*pmf[x];
        }
      }
      dp=next;
    }
    const py=new Float64Array(n+1);
    for(let r=0;r<=n;r++) for(let y=0;y<=n;y++) py[y]+=dp[r][y];
    return py;
  }
  const tailOf=(py,f)=>{ let s=0; for(let y=f+1;y<py.length;y++) s+=py[y]; return s; };

  // reference : référentiels (dont formulaConstants) ; measures : data/reference/avatar-demand.json ; catalog : avatars.
  function createDemand({reference,measures,catalog=[]}){
    const settings=settingsOf(reference);
    const families=avatars.weaponFamilies(reference?.weapons?.rows||[]);
    const rows=measures?.rows||[];
    const stale=Boolean(measures?.fingerprint)&&measures.fingerprint!==fingerprint(reference);
    const cultures=rows.map(r=>({people:r.people,culture:r.culture}));

    function profilesOf(a){
      const t=a.tags||{};
      if((t.profile||[]).length) return t.profile.map(norm);
      const set=new Set((t.weapon||[]).map(w=>families.get(norm(w))||"melee"));
      if((t.magic||[]).length) set.add("magic");
      return [...set];
    }
    function ascendanceFits(a,ascendance){
      const tagged=(a.tags?.ascendance||[]).map(norm);
      if(ascendance) return tagged.includes(norm(ascendance));
      return !tagged.length||!a.ascendanceOnly;
    }
    const threshold=ascendance=>ascendance?settings.thresholdAscendance:settings.threshold;

    function forCulture(culture){
      const row=rows.find(r=>r.culture===culture);
      if(!row) return null;
      const n=settings.mercenaries;
      const shares=new Map(ascendanceShares(reference,row.people));
      const measured=new Set(row.ascendances.map(a=>a.ascendance));
      const unmeasured=[...shares.keys()].filter(a=>!measured.has(a));
      const cells=[];
      for(const a of row.ascendances){
        const share=shares.get(a.ascendance)||0;
        for(const look of a.looks){
          const p=share*look.count/a.draws;
          cells.push({ascendance:a.ascendance,profile:look.profile,value:look.value,p,
            need:binomialNeed(p,n,threshold(a.ascendance)),assigned:0,avatars:[]});
        }
      }
      cells.sort((x,y)=>y.p-x.p);
      const own=catalog.filter(a=>a&&a.id&&norm(a.people)===norm(row.people)&&(a.tags?.culture||[]).map(norm).includes(norm(culture)));
      const info=new Map(own.map(a=>[a.id,{profiles:profilesOf(a),looks:Object.fromEntries(PROFILES.map(p=>[p,avatars.avatarLook(a,families,p).main.map(norm)]))}]));
      const fitsPrecise=(a,cell)=>{
        const i=info.get(a.id);
        return ascendanceFits(a,cell.ascendance)&&i.profiles.includes(cell.profile)&&cell.value!=null&&(i.looks[cell.profile]||[]).includes(norm(cell.value));
      };
      const fitsProfile=(a,group)=>ascendanceFits(a,group.ascendance)&&info.get(a.id).profiles.includes(group.profile);

      // Avatars précis : premier avatar de chaque case, puis deuxième, etc. (cases les plus fréquentes d'abord).
      const precise=[];
      const most=Math.max(0,...cells.map(c=>c.need));
      for(let k=0;k<most;k++) for(const c of cells) if(c.need>k) precise.push(c);
      for(const [id,i] of matchSlots(precise,own,fitsPrecise)){ precise[i].assigned++; precise[i].avatars.push(id); }

      // Repli : groupes culture × ascendance × profil, avatars restés libres.
      const groups=new Map();
      for(const c of cells){
        const key=(c.ascendance||"")+"|"+c.profile;
        if(!groups.has(key)) groups.set(key,{ascendance:c.ascendance,profile:c.profile,p:0,cells:[],need:0,assigned:0,avatars:[]});
        const g=groups.get(key);
        g.p+=c.p;
        g.cells.push(c);
      }
      const list=[...groups.values()].sort((x,y)=>y.p-x.p);
      for(const g of list){
        g.overflow=overflowDistribution(g.cells,n);
        const s=settings.fallbackFactor*threshold(g.ascendance);
        while(tailOf(g.overflow,g.need)>s+1e-12) g.need++;
      }
      const free=own.filter(a=>!cells.some(c=>c.avatars.includes(a.id)));
      const fallback=[];
      const deepest=Math.max(0,...list.map(g=>g.need));
      for(let k=0;k<deepest;k++) for(const g of list) if(g.need>k) fallback.push(g);
      for(const [id,i] of matchSlots(fallback,free,fitsProfile)){ fallback[i].assigned++; fallback[i].avatars.push(id); }
      for(const g of list){
        g.risk=tailOf(g.overflow,g.assigned);
        g.ok=g.risk<=settings.fallbackFactor*threshold(g.ascendance)+1e-12;
      }
      for(const c of cells){
        const g=groups.get((c.ascendance||"")+"|"+c.profile);
        c.risk=riskAbove(c.p,n,c.assigned);
        c.color=c.need===0?null:c.assigned>=c.need?"vert":g.ok?"orange":"rouge";
      }
      // Groupe de repli en manque sans aucune case rouge (ses cases sont trop rares ou déjà vertes) : il compte comme une
      // case rouge, à combler par un avatar de profil, toute arme ou toute école (Idan, 2026-10-30).
      for(const g of list) g.alone=!g.ok&&!g.cells.some(c=>c.color==="rouge");

      const counted=cells.filter(c=>c.need>0);
      const alone=list.filter(g=>g.alone);
      const sum=(xs,f)=>xs.reduce((s,x)=>s+f(x),0);
      return {
        people:row.people,culture,settings,avatars:own.length,unmeasured,
        cells:counted.map(({ascendance,profile,value,p,need,assigned,avatars:ids,risk,color})=>({ascendance,profile,value,p,need,assigned,avatars:ids,risk,color})),
        groups:list.map(({ascendance,profile,p,need,assigned,avatars:ids,risk,ok,alone})=>({ascendance,profile,p,need,assigned,avatars:ids,risk,ok,alone})),
        rare:sum(cells.filter(c=>c.need===0),c=>c.p),
        summary:{
          cells:counted.length,need:sum(counted,c=>c.need),covered:sum(counted,c=>Math.min(c.need,c.assigned)),
          green:counted.filter(c=>c.color==="vert").length,orange:counted.filter(c=>c.color==="orange").length,
          red:counted.filter(c=>c.color==="rouge").length+alone.length,
          redGroups:alone.length,
          missingPrecise:sum(counted,c=>Math.max(0,c.need-c.assigned)),
          missingAlone:sum(alone,g=>g.need-g.assigned),
          toProduce:sum(counted,c=>Math.max(0,c.need-c.assigned))+sum(alone,g=>g.need-g.assigned),
          missingFallback:sum(list,g=>Math.max(0,g.need-g.assigned))
        }
      };
    }

    return {settings,cultures,stale,measuredOn:measures?.generated_on||null,forCulture};
  }

  return {createDemand,measureCulture,fingerprint,ascendanceShares,binomialNeed,riskAbove,overflowDistribution,settingsOf,
    seedOf,DEFAULTS,FINGERPRINT_TABLES};
});
