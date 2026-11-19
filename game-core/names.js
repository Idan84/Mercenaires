"use strict";

// Noms des personnages générés (décision Idan du 2026-10-21) :
// - le prénom respecte le sexe ; les noms de famille qui s'accordent (russes) aussi ;
// - les humains portent des noms de la consonance de leur culture (Soleil Levant japonais, Tribus de la
//   jungle africain, Cités libres Europe de l'Ouest, Empire de la nuit blanche scandinave ou russe, Terres
//   des Deux Fleuves indien) ; prénom et nom viennent toujours de la même consonance ;
// - le sexe vient de l'avatar (game-core/avatars.js), attribué après la génération : le nom est tiré pour
//   un sexe au hasard, puis fitSex le réaccorde une fois l'avatar posé. Sans avatar sexué, c'est le nom qui
//   fixe le sexe, pour que le portrait attribué plus tard lui corresponde.
// Données : data/reference/character-names.json.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesNames=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const SEXES=["femme","homme"];

  function norm(value){
    return String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  }
  function sexOf(value){
    const s=norm(value);
    if(["femme","f","feminin","female"].includes(s)) return "femme";
    if(["homme","h","m","masculin","male"].includes(s)) return "homme";
    return null;
  }

  function createNameRules({reference,random=Math.random,used=new Set()}={}){
    const rows=reference?.characterNames?.rows||[];
    const byId=new Map(rows.map(r=>[r.id,r]));
    const pick=list=>list[Math.floor(random()*list.length)];

    // Une ligne de culture remplace celle du peuple ; à défaut, n'importe quelle ligne du peuple.
    function pools(people,culture){
      const own=rows.filter(r=>r.peuple===people);
      const found=own.filter(r=>r.culture===culture);
      if(found.length) return found;
      const general=own.filter(r=>!r.culture);
      return general.length?general:own;
    }
    function pickPool(list){
      const total=list.reduce((sum,r)=>sum+(Number(r.poids)||1),0);
      let roll=random()*total;
      for(const r of list){ roll-=Number(r.poids)||1; if(roll<0) return r; }
      return list[list.length-1];
    }
    // Les prénoms et les noms manquants d'une ligne de culture viennent de la ligne du peuple.
    function peopleRow(pool){ return rows.find(r=>r.peuple===pool.peuple&&!r.culture)||null; }
    function firstNames(pool,sex){
      const key=sex==="femme"?"prenoms_femme":"prenoms_homme";
      return pool[key]?.length?pool[key]:(peopleRow(pool)?.[key]||[]);
    }
    function familyRow(pool){ return pool.noms?.length?pool:(peopleRow(pool)||pool); }
    function familyForm(row,index,sex){
      return sex==="femme"&&row.noms_femme?.[index]?row.noms_femme[index]:row.noms[index];
    }

    // Tire une combinaison encore inédite tant que le réservoir n'est pas épuisé.
    function draw(firsts,familyCount,familyOf){
      const total=firsts.length*familyCount;
      let firstName,familyName,name;
      for(let i=0;i<Math.min(60,total);i++){
        firstName=pick(firsts);
        familyName=familyOf(Math.floor(random()*familyCount));
        name=firstName+" "+familyName;
        if(!used.has(name)) return {firstName,familyName,name};
      }
      const free=[];
      for(const f of firsts) for(let j=0;j<familyCount;j++){
        const family=familyOf(j);
        if(!used.has(f+" "+family)) free.push({firstName:f,familyName:family,name:f+" "+family});
      }
      return free.length?pick(free):{firstName,familyName,name};
    }

    function generate({people,culture,sex=null}={}){
      const list=pools(people,culture);
      if(!list.length) return null;
      const pool=pickPool(list);
      const chosenSex=sexOf(sex)||pick(SEXES);
      const firsts=firstNames(pool,chosenSex);
      const family=familyRow(pool);
      if(!firsts.length||!family.noms?.length) return null;
      const identity=draw(firsts,family.noms.length,i=>familyForm(family,i,chosenSex));
      used.add(identity.name);
      return {...identity,naming:{pool:pool.id,sex:chosenSex}};
    }

    // Réaccorde le nom d'un personnage généré sur le sexe de son avatar ; garde la consonance et le nom
    // de famille. Sans sexe connu, le nom fixe le sexe. Les noms saisis par le joueur et ceux des
    // anciennes sauvegardes (sans naming) ne bougent pas. Renvoie true si le personnage a changé.
    function fitSex(m){
      if(!m?.naming) return false;
      const sex=sexOf(m.sex);
      if(!sex){
        if(!m.naming.sex) return false;
        m.sex=m.naming.sex;
        return true;
      }
      if(sex===m.naming.sex) return false;
      const pool=byId.get(m.naming.pool)||pickPool(pools(m.people,m.culture));
      const firsts=pool?firstNames(pool,sex):[];
      if(!firsts.length){ m.naming.sex=sex; return true; }
      const family=familyRow(pool);
      const masculine=family.noms.indexOf(m.familyName),feminine=(family.noms_femme||[]).indexOf(m.familyName);
      const index=masculine>=0?masculine:feminine;
      const familyName=index>=0?familyForm(family,index,sex):m.familyName;
      const identity=draw(firsts,1,()=>familyName);
      used.add(identity.name);
      m.firstName=identity.firstName;
      m.familyName=identity.familyName;
      m.name=identity.name;
      m.naming={...m.naming,sex};
      return true;
    }

    return {rows,pools,generate,fitSex,used};
  }

  return {createNameRules,sexOf,SEXES};
});
