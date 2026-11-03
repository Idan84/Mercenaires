"use strict";

// Ports d'armure (doc 03 : Port d'armure lourde ⇒ intermédiaire ⇒ légère) : sans le port de son type, un mercenaire ne
// peut pas porter une armure (Idan, 2026-11-03 : « le mercenaire ne devrait pas pouvoir l'équiper du tout. C'est un
// oubli dans le code »). Les Vêtements ne demandent rien. Le type d'une armure : base-armors.json, type_armure.
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.MercenairesArmorPorts=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  // Du plus léger au plus lourd.
  const CLASSES=["Légère","Intermédiaire","Lourde"];
  const portOf=type=>CLASSES.includes(type)?"Port d’armure "+type.toLocaleLowerCase("fr"):null;
  const rows=data=>Array.isArray(data)?data:(data?.rows||[]);

  function createArmorPorts(reference){
    const armors=rows(reference?.baseArmors);
    const byCode=new Map(armors.map(r=>[r.code,r]));
    // Le type d'une armure (Vêtement, Légère, Intermédiaire, Lourde), ou null pour un autre objet.
    function armorClass(item){
      if(!item||item.itemType!=="armor") return null;
      const code=String(item.templateId||"").replace(/^armor:/,"");
      return (byCode.get(code)||armors.find(r=>r.nom===item.name))?.type_armure||null;
    }
    // Son plus haut port : 0 (aucun), 1 (légère), 2 (intermédiaire), 3 (lourde).
    function portLevel(m){
      let level=0;
      CLASSES.forEach((type,index)=>{ if(m?.skills?.martial?.[portOf(type)]===true) level=index+1; });
      return level;
    }
    // Peut-il porter cette armure ?
    function canWear(m,item){
      const type=armorClass(item),need=CLASSES.indexOf(type)+1;
      if(need<=0||portLevel(m)>=need) return {ok:true};
      return {ok:false,reason:`Il ne sait pas porter une armure ${type.toLocaleLowerCase("fr")}.`};
    }
    return {CLASSES,portOf,armorClass,portLevel,canWear};
  }

  return {CLASSES,portOf,createArmorPorts};
});
