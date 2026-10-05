#!/usr/bin/env python3
"""Пишет MODELS.md и SOURCES.md из data.json (запуск после export_data.py)."""
import json, os, re
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
d = json.load(open(os.path.join(D, "data.json")))
S = d["sources"]
CAT = {"odu": "Наружные блоки", "furnace": "Газовые печи", "coil": "Змеевики на печь", "fancoil": "Фанкойлы"}
RDS = {"factory": "датчик и плата с завода в блоке", "in_box": "датчик с завода; плата + корпус + жгут 8 ft в коробке змеевика", "field_kit": "полевой кит (плата и/или датчик отдельно)",
       "indoor_sensor": "датчик во внутреннем блоке (своя логика 37MURA)", "none": "нет (R-410A)", "unknown": "не проверено (IM нет в базе)"}
def keyfile(ref):
    out = []
    for part in [p.strip() for p in (ref or "").split(";") if p.strip()]:
        k = (re.match(r"[A-Z][A-Z0-9_]+", part) or [None])[0] if re.match(r"[A-Z][A-Z0-9_]+", part) else None
        s = S.get(k) if k else None
        out.append(f"{part} → `{s['file']}`" if s and s.get("file") else (f"{part} → {s['url']}" if s and s.get("url") else (part if part != "—" else "**нет документа — не проверено**")))
    return "; ".join(out) or "**нет документа — не проверено**"

# ---------------- MODELS.md
L = ["# Модели полевого приложения", "", f"Сгенерировано из data.json ({d['generated']}). Основа: hvac-research/build/field_rules.py + catalog.py.", "",
     "Набор **core** — тестовый набор для San Diego. **regress** — только для повторного прогона 12 сценариев (в приложении скрыты, включаются в «Моё»).", "",
     "Почему в наборе: одна строка на модель. Все факты с источниками — в SOURCES.md.", ""]
for c in ["odu", "furnace", "coil", "fancoil"]:
    L += [f"## {CAT[c]}", ""]
    for m in [x for x in d["models"] if x["cat"] == c]:
        extra = []
        if c == "odu": extra = [m["ref"], {"1": "1 ступень", "2": "2 ступени", "vs": "инвертор/VS"}[m["stages"]], {"24v": "24V", "abcd": "только ABCD", "mura": "crossover 37MURA", "mura410": "crossover 38MURA"}[m["ctrl"]], f"клапан {m['rv']}" + (" (не проверено)" if m.get("rv_verified") is False else "") if m.get("rv") else ""]
        if c == "furnace": extra = [{"24v": "24V", "abcd": "шина ABCD", "abcd?": "шина — не проверено"}[m["bus"]], f"{m['afue']}%", ("Type B" if m["vent"] == "typeB" else "PVC") + ("" if m.get("vent_verified") else " (по префиксу, не проверено)"), f"37MURA Fig. {m['mura_fig']}" if m.get("mura_fig") else ""]
        if c in ("coil", "fancoil"): extra = [m["ref"] + (" (не проверено)" if m.get("ref_verified") is False else ""), "RDS: " + RDS[m["rds"]], "только с 37MU" if m.get("only_with") else "", "сторонний" if m.get("third_party") else ""]
        L.append(f"- **{m['brand']} {m['model']}** [{m['set']}] — {m['why']}. _{', '.join(x for x in extra if x)}_")
    L.append("")
L += ["## Термостаты", ""]
for t in d["thermostats"]:
    L.append(f"- **{t['name']}** — {'ABCD' if t['proto']=='abcd' else '24V'}; ТН: {t['hp']}, Y2: {t['y2']}, dual fuel: {t['df']}{'' if t['verified'] else ' — **возможности не сверены с документом**'}")
L += ["", "## RDS (A2L) по типам — что в коробке и как подключать", "",
      "| Тип | Модели | Что в коробке | Подключение | Источник |", "|---|---|---|---|---|",
      "| Плата с завода в фанкойле | FE5B, FJ5, FMA5X | датчик + плата стоят и подключены | как обычно; Y идёт через плату к наружному. FE5B: поплавок в полевую R, не от трансформатора | CAR_TG стр.7; BRY_LK стр.13; CAR_R454_IS стр.26–27; FE5B стр.10–11 |",
      "| Плата в коробке змеевика | CVAMA (CAAMP — по аналогии, не проверено) | датчик в змеевике; плата + корпус + жгуты 8 ft — в коробке; CCN plug — нет (ACAINTDIS10A) | 24V — Table 2: 1 красн → SEC1, 2 зел/фиол → G печи, 3 бел ← W термостата, 4 жёлт/фиол → Y наружного, 5 жёлт ← Y печи, 6 зел ← G термостата, 7 бел/фиол → W печи, 8 чёрн → C. Communicating: CCN plug A/B/C/D, провода 3–7 отрезать и изолировать, GRN/VIO → dissipation terminal | CVAMA стр.10–12; CVAMA_SS стр.4; CAR_TG стр.6 |",
      "| Полевой кит (сторонний) | Lennox CK40CT/HT/DT | плата 27A02 — отдельно; датчик: Rev 01 → кит 26Z69, Rev 71 → с завода | термостат → TSTAT (чёрн.) → плата → INDOOR (син.) → печь; плата ≤ 48\" от датчика; поплавок между термостатом и платой. С печами Carrier/Bryant нельзя | LX_RDS_NC стр.3, 7–8, 19–21; CAR_R454_IS стр.37 |",
      "| Датчик во внутреннем 37MURA | 45MUAAQ | датчик в блоке | сценарий 1: 24V на фанкойл, S1/S2 к наружному | MURA_IM стр.5, 23 |",
      "| Не проверено | 45MULAQ | IM нет в базе | — | — |", ""]
open(os.path.join(D, "MODELS.md"), "w").write("\n".join(L) + "\n")

# ---------------- SOURCES.md
L = ["# SOURCES — источник на каждый факт", "", f"Сгенерировано из data.json ({d['generated']}). Номер страницы = страница PDF (счёт по символу \\f в .txt-копии рядом с PDF; помощник `tools/pg.py ФАЙЛ REGEX`).",
     "«нет документа — не проверено» = факт в документах базы не найден; в приложении такой факт показан как «не проверено».", "",
     "## Реестр документов (ключ → файл)", "", "| Ключ | Документ | Файл / URL |", "|---|---|---|"]
for k, s in sorted(S.items()): L.append(f"| {k} | {s['title']} | {s['file'] or ''} {s['url'] or ''} |")
L += ["", "Пути `archive/…` — от /workspace/hvac-research/; имя файла без папки — это /workspace/hvac-research/archive/manuals/; `/workspace/hv/` — папка с новыми PDF.", ""]
L += ["## Факты по моделям", ""]
for m in d["models"]:
    L.append(f"### {m['brand']} {m['model']} ({m['cat']}, {m['set']})")
    for t, ref in m["facts"]: L.append(f"- {t} — {keyfile(ref)}")
    L.append("")
L += ["## Термостаты", ""]
for t in d["thermostats"]:
    L.append(f"### {t['name']}")
    for x, ref in t["facts"]: L.append(f"- {x} — {keyfile(ref)}")
    L.append("")
L += ["## Правила приложения (rules.js берёт текст и источник отсюда)", "", "| ID | Уровень | Текст | Источник |", "|---|---|---|---|"]
for k, r in d["rules"].items(): L.append(f"| {k} | {r['level']} | {r['text']} | {keyfile(r['src'])} |")
L += ["", "## Исправления базы", ""]
for f in d["fixes"]: L.append(f"- {f['text']} — {keyfile(f['src'])}")
L += ["", "## Правки каталога hvac-research/build/catalog.py (2026-10-04, PT)", "",
      "Бэкап до правок: build/backup/2026-10-04_field_app/ (исходный) и build/backup/2026-10-04_field_app_run2/ (перед этим прогоном). Перегенерированы out/Каталог_оборудования.xlsx и .html (141 строка).", "",
      "- 24VNA6: обычный термостат — только аварийный режим — VNA_II стр.17; VNA_SM стр.5",
      "- 37MURAQ: сценарии 1–3, список печей и фанкойлов, dual fuel — MURA_IM стр.23–30",
      "- Фанкойлы R-454B (FCR): плата и датчик с завода — CAR_TG стр.7; BRY_LK стр.13; CAR_R454_IS стр.26",
      "- FE5B: на обычный термостат не отвечает (кроме аварийного режима) — FE5B стр.2, 8; поплавок — стр.10. Убрана неверная фраза «24V-режим тоже есть (IM Fig. 9)»",
      "- 45MUAAQ: только с 37MU — CAR_TG стр.4; датчик/FHCC — MURA_IM стр.5, 43",
      "- Змеевики на печь (CCR): плата в коробке — CAR_TG стр.6; BRY_LK стр.13; CVAMA стр.10; CCN plug и провода 3–7 — CVAMA стр.10–12",
      "- CAAMP, 45MULAQ: IM в базе нет — помечено «не проверено»",
      "- FB4C: убрано непроверенное «PSC»; пара к 24ACB3 — ACB3_PD стр.3; 38MURA — XW_38MURA стр.9",
      "- FV4C: Puron, ECM — FV4C стр.2, 10; 38MURA — XW_38MURA стр.5, 10. FE4A: «Communicating Fan Coil for Puron» — FE4A стр.1",
      "- 59TN6, 58TN, 880TA: «communicating» — ссылки на несуществующие в базе PD (CAR_59TN6_PD, CAR_58TN0B_PD, BRY_880TB_PD) удалены, помечено «НЕ ПРОВЕРЕНО»; только присутствие в Fig. 26 — MURA_IM стр.26",
      "- 880TA: 80% и Evolution — по номенклатуре B800SB_PD стр.3",
      "- 59SC5B: убрано «= Bryant 915SB» (документом не подтверждено); Communication none — F59SC5_PD стр.1, 3",
      "- 59MN7: «Infinity 98» оставлено как данные сайта (CAR_WEB_F); модулирующая — F59MN7C стр.1; Cat IV стр.5; разъём стр.26",
      "- 59TP6: убрано «96%» (в IM нет); Two-Stage Non-Communicating — F59TP6C стр.1; Cat IV стр.5; PVC/ABS, dual fuel, HPS — стр.29",
      "- 915SB: Cat IV direct vent — B915SB стр.5; гараж 18\" — стр.6; «95%» в IM не найдено",
      "- 986T/987T/987M: Evolution fully communicating — B_PREF_F стр.4; 926T InteliSense — B_PREF_F стр.4",
      "- 800S/801S: Cat I — B800SB стр.4; Type B — B800SB_PD стр.12; Communication None — B800SB_PD стр.4",
      "- Toshiba-Carrier RAV: перенесена правка merge_alt — ключ TOSH_RAV_DIC, статус «по документу Toshiba (PDS RAV-GV R-32, рынок UK/EU); наличие и хладагенты для США не проверены»",
      "- Новая строка Lennox CK40CT/HT/DT (полевой кит RDS) — LX_RDS_NC стр.3, 7, 8; запрет с печами Carrier — CAR_R454_IS стр.37",
      "- build_catalog.py: поиск URL теперь по SRC + SRC2 + SRC3 + field_rules.SRC_EXTRA; в лист «Номенклатура» добавлены строки: номенклатура печей Bryant (B800SB_PD стр.3), вент по категории (B800SB стр.4; B800SB_PD стр.12; F59TP6C стр.5, 29; B915SB стр.5), типы RDS (CAR_TG стр.6–7; BRY_LK стр.13; LX_RDS_NC стр.3, 8)", ""]
open(os.path.join(D, "SOURCES.md"), "w").write("\n".join(L) + "\n")
print("ok", len(d["models"]), "models")
