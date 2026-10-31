"use strict";

// Qui vend quoi (Idan, 2026-10-31) : chaque objet doit être vendu par au moins deux marchands, et chaque marchand vendre à
// peu près le même nombre d'objets (les sorts et les cristaux viendront ensuite). Ce script dresse la liste à partir de
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
  ["ring","Bagues","rings.json"],["potion","Fioles","potions.json"]
];
const TARGET=2;

function coverage(){
  const merchants=rows(read("merchants.json"));
  const firstName=m=>String(m.nom||m.id).split(/\s+/)[0];
  const items=FAMILIES.flatMap(([type,label,file])=>rows(read(file)).map(r=>({type,label,name:r.nom}))
    .sort((a,b)=>a.name.localeCompare(b.name,"fr")));
  const known=new Set(items.map(i=>i.type+"|"+i.name));
  const unknown=merchants.flatMap(m=>(m.vend||[]).filter(v=>!known.has(v.type+"|"+v.objet)).map(v=>`${m.nom} : ${v.objet}`));
  for(const item of items) item.sellers=merchants.filter(m=>(m.vend||[]).some(v=>v.type===item.type&&v.objet===item.name)).map(firstName);
  const count=n=>items.filter(i=>n(i.sellers.length)).length;
  return {
    merchants:merchants.map(m=>({name:m.nom,culture:m.culture,count:(m.vend||[]).length})),
    items,unknown,
    summary:{total:items.length,covered:count(n=>n>=TARGET),once:count(n=>n===1),none:count(n=>n===0)}
  };
}

function markdown(c){
  const s=c.summary;
  const lines=[START,"",
    `**Bilan** : ${s.total} objets ; **${s.covered}** vendus par au moins ${TARGET} marchands, **${s.once}** par un seul, **${s.none}** par aucun.`,"",
    "| Marchand | Culture | Objets |","|---|---|---|",
    ...c.merchants.map(m=>`| ${m.name} | ${m.culture||"—"} | ${m.count} |`),"",
    "| Famille | Objet | Marchands | Nombre |","|---|---|---|---|",
    ...c.items.map(i=>`| ${i.label} | ${i.name} | ${i.sellers.join(", ")||"—"} | ${i.sellers.length>=TARGET?i.sellers.length:i.sellers.length+" ⚠"} |`),
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
module.exports={coverage,markdown,START,END};
