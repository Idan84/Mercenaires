#!/usr/bin/env python3
from __future__ import annotations
import csv, json, re, shutil, unicodedata, os
from pathlib import Path
from urllib.parse import quote, unquote

ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / "archive" / "notion-export"
DOCS = ROOT / "docs" / "design"
DATA = ROOT / "data" / "reference"

DATABASES = {
"268aef3cc286435ea9aa0bcaaa5be428":"alignments",
"e2bd4f129d754ce1885acf62ea90f487":"ancestries",
"84e0baa713b547da90526b430d76a29c":"culture-origin-compatibility",
"2104bbf4810e484ea41807534924b989":"ancestry-compatibility",
"901364a7f401459594940d1e11ed10d2":"cultures",
"fb435c78a6e74068965f53f164b0d8e7":"generation-matrix",
"5b78a963a81e43f7869b1920e369efcd":"ancestry-levels",
"17bc7a7e1e6a45ef861358747dbafb83":"social-origins",
"9a5cd156f4444837ae630b1862f60541":"peoples",
"b949e703e1b7435396a99b36ecf6e417":"d6-generation-scale",
"905a18852ebc4f148f18e0b10c2ecca6":"generation-steps",
"eb1e6e789f9343c6937931157a26c27e":"characteristics",
"13a89648818840a7aa9a0698e018b039":"skills",
"5db7647603614c41bb7acc47a89986d6":"damage-types",
"a2ea68aea2414a24a343f374c6fb19e3":"states",
"f4f4cb3ca59c4e9aa987205928976f58":"base-armors",
"786aac3436ff470a8a92d8fdd0b152cb":"item-qualities",
"3ebc799da3d18124874bfce7508cfe33":"ranged-weapons",
"3ebc799da3d1814dab67dac17219fbf4":"weapons",
"2a25d0db802141bb8e0273935c2be8c2":"formula-constants",
"b096926b35a04a96995cad7aa5544c31":"game-formulas",
"29df19d52e964abf8956c8ae8371a4da":"formula-terms"
}

CANONICAL_DOCS = {
"3eac799da3d181478858f51a008acbda":"00-overview.md",
"3ebc799da3d18106a6d0dc0a410e55a8":"01-start-and-generation-functions.md",
"3eac799da3d181c491e3d99c69fa2317":"02-generation-and-identity.md",
"3eac799da3d18130b3cddc2686cb77c4":"03-character-and-skills.md",
"3eac799da3d181cfa22deb2373595671":"04-combat.md",
"3eac799da3d1816f9fbde097e65f5e65":"05-equipment.md",
"3eac799da3d181c584bfca6dfc669087":"06-technical-reference.md",
"3edc799da3d1818e97d9d2e3238bc475":"07-architecture.md",
"3ecc799da3d1815fbc4cef440b53d83b":"08-progression-and-experience.md",
"3edc799da3d1816d8c56ef472f3ea9ec":"09-reputation-renown-and-salaries.md",
"3edc799da3d181b593b4d808c233d592":"10-mission-time-and-unavailability.md",
"3edc799da3d181808127ed574b81ba78":"11-camp-and-ruined-castle.md",
"3ecc799da3d18183b4a9e6b17170afdf":"12-magic.md",
"3ebc799da3d1817a804fd813fe29a521":"13-fleeing.md",
"3eac799da3d181fd89ecffed4135a594":"90-mechanics-backlog.md",
"3ecc799da3d181c3a45ed60fccf36ebf":"91-combat-ideas.md"
}

ID_RE = re.compile(r"\s+[0-9a-f]{32}$", re.I)
PERCENT_RE = re.compile(r"^(-?\d+(?:[.,]\d+)?)\s*%$")
NUMBER_RE = re.compile(r"^-?\d+(?:[.,]\d+)?$")
LINK_RE = re.compile(r"\]\(([^)]+)\)")

def key(s):
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower().replace("’", "'")
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_") or "value"

def slug(s):
    return key(ID_RE.sub("", s)).replace("_", "-")

def scalar(v):
    if v is None: return None
    v = v.replace("\ufeff","").replace("\xa0"," ").strip()
    if not v: return None
    if v.lower() in ("yes","true"): return True
    if v.lower() in ("no","false"): return False
    m = PERCENT_RE.fullmatch(v)
    if m: return float(m.group(1).replace(",","."))/100
    if NUMBER_RE.fullmatch(v):
        n = float(v.replace(",","."))
        return int(n) if n.is_integer() else n
    return v

def choose_csv(dbid):
    files = sorted(EXPORT.rglob("*"+dbid+"*.csv"))
    allf = [p for p in files if p.name.endswith("_all.csv")]
    return (allf or files or [None])[0]

def read_csv(path):
    with path.open("r",encoding="utf-8-sig",newline="") as f:
        r = csv.DictReader(f); original = r.fieldnames or []
        seen={}; keys=[]
        for col in original:
            k=key(col); seen[k]=seen.get(k,0)+1
            keys.append(k if seen[k]==1 else k+"_"+str(seen[k]))
        rows=[{k:scalar(row.get(c)) for c,k in zip(original,keys)} for row in r]
    return original,keys,rows

def find_md(pid):
    m=sorted(EXPORT.rglob("*"+pid+".md"))
    return m[0] if m else None

def rewrite_links(text,src,dst):
    def repl(m):
        raw=m.group(1)
        if raw.startswith(("http://","https://","mailto:","#")): return m.group(0)
        link,sep,anchor=raw.partition("#")
        try:
            target=(src.parent/unquote(link)).resolve()
            target.relative_to(EXPORT.resolve())
        except Exception:
            return m.group(0)
        if not target.exists(): return m.group(0)
        page_match = PAGE_FILE_RE.search(target.name)
        if page_match:
            page_id = page_match.group(1).lower()
            if page_id in CANONICAL_DOCS:
                url = "/design/#doc=" + quote(CANONICAL_DOCS[page_id], safe="/")
                return "](" + url + ")"
            if target.parent.name == "Formules de jeu":
                formula_name = slug(ID_RE.sub("", target.stem)) + ".md"
                url = "/design/#doc=" + quote("formulas/" + formula_name, safe="/")
                return "](" + url + ")"
        archived = target.relative_to(ROOT).as_posix()
        url = "https://github.com/Idan84/Mercenaires/blob/main/" + quote(archived, safe="/")
        if sep:
            url += "#" + anchor
        return "](" + url + ")"
    return LINK_RE.sub(repl,text)

def copy_doc(src,dst):
    txt=src.read_text(encoding="utf-8-sig")
    txt=rewrite_links(txt,src,dst)
    banner="> Source de vérité Git. Migré depuis l'export Notion figé du 2026-10-03.\n\n"
    dst.parent.mkdir(parents=True,exist_ok=True)
    dst.write_text(banner+txt,encoding="utf-8")

def main():
    if not EXPORT.exists(): raise SystemExit("archive/notion-export missing")
    for p in (DOCS,DATA):
        if p.exists(): shutil.rmtree(p)
        p.mkdir(parents=True)

    db_report=[]
    for dbid,name in DATABASES.items():
        src=choose_csv(dbid)
        if not src:
            db_report.append((name,0,"MISSING",[])); continue
        original,keys,rows=read_csv(src)
        payload={
          "schema_version":1,
          "name":name,
          "source":{"database_id":dbid,"archived_path":src.relative_to(ROOT).as_posix(),"migrated_on":"2026-10-03"},
          "columns":[{"source":a,"key":b} for a,b in zip(original,keys)],
          "row_count":len(rows),
          "rows":rows
        }
        (DATA/(name+".json")).write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        db_report.append((name,len(rows),src.relative_to(ROOT).as_posix(),keys))

    doc_report=[]
    for pid,name in CANONICAL_DOCS.items():
        src=find_md(pid)
        if src:
            copy_doc(src,DOCS/name); doc_report.append((name,src.relative_to(ROOT).as_posix()))
        else: doc_report.append((name,"MISSING"))

    formulas=DOCS/"formulas"; formulas.mkdir()
    formula_sources=sorted(p for p in EXPORT.rglob("*.md") if p.parent.name=="Formules de jeu")
    used=set()
    for src in formula_sources:
        title=ID_RE.sub("",src.stem); fn=slug(title)+".md"
        if fn in used: fn=slug(title)+"-"+src.stem[-8:]+".md"
        used.add(fn); copy_doc(src,formulas/fn)

    files=[p for p in EXPORT.rglob("*") if p.is_file()]
    ext={}
    for p in files: ext[p.suffix.lower() or "(none)"]=ext.get(p.suffix.lower() or "(none)",0)+1

    cat=["# Catalogue des données du jeu","","Git est la source de vérité. Les JSON ci-dessous sont les référentiels structurés.","",
         "| Fichier | Lignes | Colonnes |","|---|---:|---|"]
    for name,count,src,keys in db_report:
        cat.append("| "+name+".json | "+str(count)+" | "+", ".join(keys)+" |")
    (DATA/"CATALOG.md").write_text("\n".join(cat)+"\n",encoding="utf-8")
    (DATA/"index.json").write_text(json.dumps({
        "generated_on":"2026-10-03",
        "tables":[{"name":n,"file":n+".json","rows":c,"columns":k} for n,c,src,k in db_report if src!="MISSING"]
    },ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    idx=["# Mercenaires — Design source","",
         "Git est désormais la source de vérité du game design. Notion n'est plus requis.","",
         "Données structurées : ../../data/reference/","Archive historique : ../../archive/notion-export/","",
         "## Documents principaux",""]
    for name,src in doc_report:
        idx.append("- ["+name+"](./"+quote(name)+")"+(" (source manquante)" if src=="MISSING" else ""))
    idx += ["","## Formules détaillées","",str(len(formula_sources))+" pages dans formulas/.","",
            "## Règle d'édition","","Modifier Git directement. Ne plus synchroniser depuis Notion."]
    (DOCS/"README.md").write_text("\n".join(idx)+"\n",encoding="utf-8")
    (DOCS/"index.json").write_text(json.dumps({
        "generated_on":"2026-10-03",
        "documents":[{"file":n,"source":src} for n,src in doc_report if src!="MISSING"],
        "formulas":[{"file":"formulas/"+p.name} for p in sorted(formulas.glob("*.md"))]
    },ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

    rep=["# Rapport de migration Notion → Git","","Date : 2026-10-03","",
         "## Export original","","Fichiers archivés : "+str(len(files))]
    rep += ["- "+e+" : "+str(n) for e,n in sorted(ext.items())]
    rep += ["","## Bases structurées","","Bases identifiées : "+str(len(DATABASES)),
            "JSON générés : "+str(sum(1 for _,_,s,_ in db_report if s!="MISSING")),""]
    rep += ["- "+n+" : "+str(c)+" lignes — "+s for n,c,s,_ in db_report]
    rep += ["","## Documentation","","Pages principales ciblées : "+str(len(CANONICAL_DOCS)),
            "Formules détaillées migrées : "+str(len(formula_sources)),"",
            "L'archive est conservée comme filet de sécurité uniquement."]
    (DOCS/"MIGRATION_REPORT.md").write_text("\n".join(rep)+"\n",encoding="utf-8")

if __name__=="__main__": main()
