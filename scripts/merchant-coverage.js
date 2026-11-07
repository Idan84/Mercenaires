"use strict";

// Qui vend quoi (Idan, 2026-10-31) : chaque objet doit être vendu par au moins deux marchands, et chaque marchand vendre à
// peu près le même nombre d'objets ; les manuels de sorts aussi, école par école (les cristaux viendront ensuite). Ce script dresse la liste à partir de
// data/reference/merchants.json et des référentiels d'objets, et l'écrit dans docs/design/18-merchants.md, entre les
// marqueurs « couverture:debut » et « couverture:fin ».
//   node scripts/merchant-coverage.js           réécrit la liste et affiche le bilan
//   node scripts/merchant-coverage.js --check   échoue si la liste du doc n'est plus à jour (CI)
const fs=require("node:fs");
const path=require("node:path");

const ROOT=path.resolve(__dirname,"..");
const DOC=path.join(ROOT,"docs","design","18-merchants.md");
const START="<!-- couverture:debut (généré par node scripts/merchant-coverage.js : ne pas modifier à la main) -->";
const END="<!-- couverture:fin -->";
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,"data","reference",file),"utf8"));
const rows=data=>Array.isArray(data)?data:(data?.rows||[]);

// Les familles d'objets qu'un marchand peut vendre, dans l'ordre de l'Intendance.
const FAMILIES=[
  ["weapon","Armes","weapons.json"],["armor","Armures","base-armors.json"],["helmet","Casques","helmets.json"],
  ["boots","Bottes","boots.json"],["belt","Ceintures","belts.json"],["amulet","Amulettes","amulets.json"],
  ["cape","Capes","capes.json"],["gloves","Gants","gloves.json"],["pants","Culottes","pants.json"],
  ["ring","Bagues","rings.json"],["potion","Fioles","potions.json"],["mount","Montures","mounts.json"]
];
const TARGET=2;
// Les montures (Idan, 2026-11-07) : un marchand chacune, nommé par Idan (Amar le destrier, Ysolwen la licorne).
const targetOf=item=>item.type==="mount"?1:TARGET;

function coverage(){
  const merchants=rows(read("merchants.json"));
  const firstName=m=>String(m.nom||m.id).split(/\s+/)[0];
  const items=FAMILIES.flatMap(([type,label,file])=>rows(read(file)).map(r=>({type,label,name:r.nom}))
    .sort((a,b)=>a.name.localeCompare(b.name,"fr")));
  // Manuels de sorts (Idan, 2026-10-31) : une ligne par école ; ses futurs sorts y entrent d'eux-mêmes.
  const of=school=>/^[AEIOUÉÈÊ]/i.test(school)?"d’"+school:"de "+school;
  const schools=[...new Set(rows(read("spells.json")).map(s=>s.ecole).filter(Boolean))];
  items.push(...schools.map(school=>({type:"manual",label:"Manuels",name:"Manuels "+of(school),school})));
  const key=v=>v.type==="manual"?"manual|"+v.ecole:v.type+"|"+v.objet;
  const known=new Set(items.map(i=>i.type==="manual"?"manual|"+i.school:i.type+"|"+i.name));
  const unknown=merchants.flatMap(m=>(m.vend||[]).filter(v=>!known.has(key(v))).map(v=>`${m.nom} : ${v.objet||v.ecole}`));
  for(const item of items) item.sellers=merchants.filter(m=>(m.vend||[]).some(v=>key(v)===(item.type==="manual"?"manual|"+item.school:item.type+"|"+item.name))).map(firstName);
  const count=n=>items.filter(i=>n(i.sellers.length,targetOf(i))).length;
  return {
    merchants:merchants.map(m=>({name:m.nom,culture:m.culture,sex:m.sexe,count:(m.vend||[]).length,
      sells:(m.vend||[]).map(v=>v.type==="manual"?"Manuels "+of(v.ecole):v.objet)})),
    items,unknown,
    summary:{total:items.length,covered:count((n,t)=>n>=t),once:count((n,t)=>n===1&&t>1),none:count(n=>n===0)}
  };
}

function markdown(c){
  const s=c.summary;
  const lines=[START,"",
    `**Bilan** : ${s.total} objets ; **${s.covered}** vendus par au moins ${TARGET} marchands (les montures : un marchand chacune), **${s.once}** par un seul, **${s.none}** par aucun.`,"",
    `**${c.merchants.length} marchands**, dont ${c.merchants.filter(m=>m.sex==="Femme").length} marchandes.`,"",
    "| Marchand | Culture | Vend | Lignes |","|---|---|---|---|",
    ...c.merchants.map(m=>`| ${m.name} | ${m.culture||"—"} | ${m.sells.join(", ")} | ${m.count} |`),"",
    "| Famille | Objet | Marchands | Nombre |","|---|---|---|---|",
    ...c.items.map(i=>`| ${i.label} | ${i.name} | ${i.sellers.join(", ")||"—"} | ${i.sellers.length>=targetOf(i)?i.sellers.length:i.sellers.length+" ⚠"} |`),
    "",END];
  return lines.join("\n");
}

function main(){
  const c=coverage();
  if(c.unknown.length){
    console.error("Objets inconnus dans merchants.json :\n  "+c.unknown.join("\n  "));
    process.exit(1);
  }
  const doc=fs.readFileSync(DOC,"utf8");
  const from=doc.indexOf(START),to=doc.indexOf(END);
  if(from<0||to<from){ console.error("Marqueurs de la couverture introuvables dans "+path.relative(ROOT,DOC)); process.exit(1); }
  const next=doc.slice(0,from)+markdown(c)+doc.slice(to+END.length);
  if(process.argv.includes("--check")){
    if(next!==doc){ console.error("La liste « Qui vend quoi » du doc 18 n'est plus à jour : relancer node scripts/merchant-coverage.js"); process.exit(1); }
    console.log("Couverture des marchands : à jour");
    return;
  }
  fs.writeFileSync(DOC,next);
  const s=c.summary;
  console.log(`Couverture : ${s.total} objets ; ${s.covered} vendus par au moins ${TARGET} marchands, ${s.once} par un seul, ${s.none} par aucun.`);
  console.log(c.merchants.map(m=>`${m.name} ${m.count}`).join(" · "));
}

if(require.main===module) main();
module.exports={coverage,markdown,targetOf,START,END};
