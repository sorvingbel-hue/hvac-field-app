#!/usr/bin/env python3
"""Генерирует field-app/data.json из базы hvac-research/build (catalog.py, field_rules.py, sources*.py).
Запуск: python3 tools/export_data.py  (из /workspace/field-app). Ничего в базе не меняет."""
import sys, json, os, re, datetime
B = "/workspace/hvac-research/build"; sys.path.insert(0, B)
from catalog import C
from sources import SRC as S1
from sources2 import SRC2
from sources3 import SRC3
import field_rules as F
SRC = {**SRC2, **SRC3, **F.SRC_EXTRA, **S1}
cat = {r[2]: r for r in C}
problems = []
def keys(ref):  # "CVAMA стр.10; CVAMA_SS стр.4" -> ['CVAMA','CVAMA_SS']
    return [k for k in re.findall(r"\b([A-Z][A-Z0-9_]{2,})\b", ref or "") if k in SRC or k in ("LJ_CASE",)]
def chk(ref, where):
    if not ref or ref.strip() in ("—",): return
    ks = re.findall(r"\b([A-Z][A-Z0-9_]{2,})\b", ref)
    for k in ks:
        if k not in SRC: problems.append(f"{where}: ключ {k} не найден в реестре")
models = []
for m in F.M:
    r = cat.get(m["catalog"]) if m.get("catalog") else None
    if m.get("catalog") and r is None: problems.append(f"{m['id']}: строки каталога «{m['catalog']}» нет")
    for t, ref in m["facts"]: chk(ref, m["id"])
    d = dict(m); d["catalog_row"] = None if r is None else {"brand": r[0], "type": r[1], "model": r[2], "ref": r[4], "status": r[10] if len(r) > 10 else ""}
    models.append(d)
for t in F.T:
    for x, ref in t["facts"]: chk(ref, t["id"])
for k, (lvl, txt, ref) in F.R.items(): chk(ref, "R." + k)
used = set()
for blob in [json.dumps(models, ensure_ascii=False), json.dumps(F.T, ensure_ascii=False), json.dumps(F.R, ensure_ascii=False)]:
    used |= {k for k in re.findall(r"\b([A-Z][A-Z0-9_]{2,})\b", blob) if k in SRC}
src = {k: {"title": SRC[k][0], "url": SRC[k][1], "kind": SRC[k][2], "file": SRC[k][3] if len(SRC[k]) > 3 else ""} for k in sorted(used)}
out = {"generated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M PT"), "models": models, "thermostats": F.T,
       "rules": {k: {"level": v[0], "text": v[1], "src": v[2]} for k, v in F.R.items()},
       "fixes": [{"text": a, "src": b} for a, b in F.FIXES], "sources": src, "problems": problems}
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data.json")
json.dump(out, open(p, "w"), ensure_ascii=False, indent=1)
print(f"models={len(models)} thermostats={len(F.T)} rules={len(F.R)} sources={len(src)} problems={len(problems)}")
for x in problems: print("  !", x)
