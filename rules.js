// Движок проверок полевого приложения. Тексты и источники — только из data.json (rules), сюда факты не вписываются.
// Используется и в браузере (app.js), и в тестах (tests/run.mjs).

export function tons(model, kind) {
  if (!model) return null;
  const s = String(model).toUpperCase().replace(/[\s-]/g, "");
  const re = { carrier: /^2[4-7][A-Z]{3}\d(\d\d)/, bryant: /^\d{3}[A-Z]{3}\d(\d\d)/, mura: /^3[78]MUR[AH]Q(\d\d)/, cvama: /^CVAMA(\d\d)/ }[kind];
  if (!re) return null;
  const m = s.match(re);
  if (!m) return null;
  const k = parseInt(m[1], 10);            // номинал, тыс. Btuh (36 = 36 000)
  return Math.floor(k / 6) / 2;            // 36 → 3; 49 → 4; 43 → 3.5; 25 → 2
}

export function evaluate(data, inp) {
  const M = Object.fromEntries(data.models.map(m => [m.id, m]));
  const T = Object.fromEntries(data.thermostats.map(t => [t.id, t]));
  const out = { stop: [], warn: [], ok: [], add: [], strip: [], seen: new Set() };
  const say = (id, vars = {}) => {
    if (out.seen.has(id)) return;
    const r = data.rules[id];
    if (!r) throw new Error("нет правила " + id);
    out.seen.add(id);
    const text = r.text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "?");
    out[r.level].push({ id, text, src: r.src });
  };
  const wire = (from, to, note, src) => out.strip.push({ from, to, note: note || "", src: src || "" });

  const odu = M[inp.odu], ind = M[inp.indoor], t = T[inp.tstat];
  if (!odu || !ind || !t) return finish(out, ["Выбери наружный, внутренний и термостат."]);
  const furn = ind.cat === "furnace" ? ind : null;
  const fc = ind.cat === "fancoil" ? ind : null;
  const coil = furn ? M[inp.coil] : null;
  const notes = [];
  if (furn && !coil) notes.push("Для печи выбери змеевик.");
  const evap = coil || fc;                         // элемент с хладагентом внутри
  const oduN = odu.model, indN = evap ? evap.model : ind.model;
  const hp = odu.kind === "hp";
  const mura = odu.ctrl === "mura", mura410 = odu.ctrl === "mura410";
  const abcdT = t.proto === "abcd";

  // --- хладагент
  if (evap && evap.ref !== odu.ref) {
    say(evap.ref_verified === false ? "REF_MISMATCH_UNVER" : "REF_MISMATCH", { odu: oduN, ind: indN, r1: odu.ref, r2: evap.ref });
  }
  if (odu.ref === "R-410A") say(inp.oduStays ? "R410_EXISTING" : "R410_CA_NEW", { odu: oduN });
  if (evap && evap.ref === "R-410A") say("R410_INDOOR_NEW", { ind: indN });

  // --- «только с 37MU»
  if (evap && evap.only_with && !evap.only_with.includes(odu.model)) say("ONLY_37MU", { ind: indN });

  // --- сторонний змеевик на печи Carrier/Bryant
  if (coil && coil.third_party && furn && /Carrier|Bryant/.test(furn.brand)) say("THIRD_PARTY_COIL", { ind: coil.brand + " " + coil.model, furn: furn.model });

  // --- шина / тип термостата
  const who = ind; // шину проверяем по печи/фанкойлу, не по змеевику
  if (abcdT) {
    if (mura) say("MURA_NO_ABCD");
    else if (mura410) say("ABCD_MURA410_UNVER");
    if (who.bus === "24v") say("BUS_NEED_INDOOR", { who: who.model });
    else if (who.bus === "abcd?") say("BUS_UNVERIFIED", { who: who.model });
    else if (who.bus === "abcd") say("BUS_OK", { who: who.model });
    if (odu.ctrl === "24v") say(odu.stages === "1" ? "ODU_24V_ON_ABCD_1" : "ODU_24V_ON_ABCD_2");
    if (t.brand !== "any" && !odu.brand.includes(t.brand)) say("TSTAT_BRAND", { t: t.name });
  } else {
    if (odu.ctrl === "abcd") say("ODU_NEEDS_ABCD", { odu: oduN });
    if (fc && fc.bus === "abcd") say("FE5B_24V");
    if (t.brand !== "any" && !odu.brand.includes(t.brand)) say("TSTAT_BRAND", { t: t.name });
  }

  // --- 37MURA / 38MURA
  if (mura && !abcdT) {
    if (fc && fc.bus === "s1s2") { say("MURA_S1"); say("RDS_45MU"); }
    else {
      say("MURA_S3");
      if (furn) say(furn.mura_fig ? "MURA_FURN_LIST" : "MURA_FURN_NOTLIST", { furn: furn.model, fig: furn.mura_fig });
      if (fc && fc.mura_fig) say("MURA_FC_FIG", { ind: fc.model, fig: fc.mura_fig });
    }
    say("MURA_NEVER_S1S2"); say("A2L_CHARGE"); say("AHRI");
  }
  if (mura410) say("MURA410_LIST");

  // --- реверсивный клапан
  if (hp) {
    if (odu.rv === "B") say("RV_B");
    else if (odu.rv === "O") say(odu.rv_verified === false ? "RV_O_UNVER" : "RV_O", { odu: oduN });
  }

  // --- возможности термостата (только 24V-термостаты; ABCD-системы управляет пульт)
  if (!abcdT) {
    if (hp) {
      if (t.hp === "unknown" || t.ob === "unknown") say("TSTAT_HP_UNKNOWN", { t: t.name });
    }
    if (odu.stages === "2") {
      if (t.y2 === "no") say("TSTAT_STAGES", { t: t.name, odu: oduN });
      else if (t.y2 === "unknown") say("TSTAT_STAGES_UNKNOWN", { t: t.name });
    }
  }

  // --- dual fuel
  if (hp && furn) {
    say("DF_NEED");
    if (t.df === "no") say("DF_TSTAT_NO", { t: t.name });
    else if (t.df === "partial") say("DF_TSTAT_PARTIAL", { t: t.name });
    else if (t.df === "unknown") say("DF_TSTAT_UNKNOWN", { t: t.name });
    say("DF_HPS", { odu: oduN });
    if (furn.id === "bry-801sb") say("DF_OAT");
    if (mura) say("DF_MURA_WD");
  }

  // --- RDS (A2L)
  const commFurn = furn && abcdT && (furn.bus === "abcd" || furn.bus === "abcd?");
  if (fc) {
    if (fc.rds === "factory") { say("RDS_FACTORY", { ind: fc.model }); if (fc.id === "fe5b" && inp.orient && inp.orient !== "up") say("RDS_SENSOR_FE5B"); }
  }
  if (coil) {
    if (coil.rds === "in_box") {
      say("RDS_INBOX", { ind: coil.model });
      if (coil.rds_wiring_verified === false) say("RDS_INBOX_WIRING_UNVER", { ind: coil.model });
      say("RDS_MOUNT"); say("RDS_AIRFLOW");
      if (commFurn) { say("RDS_CCN"); say("RDS_DISS_TERM", { furn: furn.model }); say("ADD_CCN"); }
      if (inp.orient === "horiz") say("RDS_SENSOR_HORIZ");
    } else if (coil.rds === "field_kit") say("RDS_FIELD_KIT", { ind: coil.model });
    else if (coil.rds === "unknown") say("RDS_UNKNOWN", { ind: coil.model });
  }
  if (evap && evap.ref === "R-454B" && !(fc && fc.bus === "s1s2")) {
    if (coil && coil.brand === "Lennox") say("FLOAT_LNX");
    else if (abcdT) say("FLOAT_ABCD");
    else if (coil) say("FLOAT_COIL", { ind: coil.model });
    else say("FLOAT_24V");
  }

  // --- место установки и вент
  if (inp.loc === "attic" || inp.overLiving) say("PAN_ATTIC");
  if (furn) {
    say(furn.vent === "typeB" ? "VENT_B" : "VENT_PVC");
    if (furn.vent_verified === false) say("VENT_UNVER", { furn: furn.model });
    if (inp.loc === "garage") say("GARAGE");
    if (inp.loc === "closet" && furn.afue === "80") say("CLOSET_80");
  }

  // --- провод C
  if (inp.hasC === false) {
    if (abcdT) say("NO_C_ABCD");
    else if (t.power === "pek") say("NO_C_PEK");
    else if (t.power === "battery_or_24v") say("NO_C_BATT");
    else say("NO_C_UNKNOWN", { t: t.name });
  }

  // --- тоннаж
  const a = tons(inp.oduFull, odu.ton), b = coil ? tons(inp.coilFull, coil.ton) : null;
  out.tons = { odu: a, coil: b };
  if (a != null && b != null) say(a === b ? "TON_MATCH" : "TON_MISMATCH", { a, b });
  else if (a != null) say("TON_ODU", { a });

  // --- Coastal (только если отмечено «у побережья»)
  if (inp.coastal && odu.coastal === true) say("COASTAL_YES", { odu: oduN });
  if (inp.coastal && odu.coastal === false) say("COASTAL_NO", { odu: oduN });

  buildStrip(out, { odu, furn, fc, coil, t, abcdT, mura, wire });
  return finish(out, notes);
}

function buildStrip(out, { odu, furn, fc, coil, t, abcdT, mura, wire }) {
  const indoor = furn || fc;
  if (abcdT) {
    for (const [k, c] of [["A", "зел."], ["B", "жёлт."], ["C", "бел."], ["D", "красн."]]) wire(`Пульт ${k}`, `${indoor.model} ${k}`, c, "UI_SI стр.15");
    if (odu.ctrl === "abcd") wire("Шина ABCD", `${odu.model} A B C D`, "та же шина, 4 провода", "UI_SI стр.14–15");
    else if (odu.ctrl === "24v") wire(`${indoor.model} (24V выходы)`, `${odu.model}`, "наружный 24V управляется от indoor", "UI_SI стр.8");
    if (coil && coil.rds === "in_box" && furn && furn.bus !== "24v") {
      wire("Плата RDS — CCN plug", `${furn.model} ABCD`, "A зел., B жёлт., C бел., D красн.; plug ACAINTDIS10A", "CVAMA стр.12; CVAMA_SS стр.4");
      wire("Плата RDS 1 красн.", `${furn.model} SEC1`, "", "CVAMA стр.11");
      wire("Плата RDS 8 чёрн.", `${furn.model} C`, "", "CVAMA стр.11");
      wire("Плата RDS 2 зел./фиол.", `${furn.model} dissipation terminal`, "есть только у коммуникационных печей Carrier с Q4 2023", "CVAMA стр.12");
      wire("Провода 3–7", "не используются", "каждый отрезать и заизолировать отдельно", "CVAMA стр.11");
    }
    return;
  }
  if (mura && fc && fc.bus === "s1s2") {
    wire("Термостат 24V", `${fc.model} (24V-клеммы)`, "B и W вместе на фанкойле не использовать", "MURA_IM стр.23");
    wire(`${fc.model} S1/S2`, `${odu.model} S1/S2`, "RS485; 24V на S1/S2 — никогда", "MURA_IM стр.23");
    wire(`${odu.model} 24V-клеммы`, "не используются", "в сценарии 1", "MURA_IM стр.23");
    return;
  }
  if (coil && coil.brand === "Lennox") {
    wire("Термостат", "колодка TSTAT платы 27A02 (чёрная)", "туда же наружный блок", "LX_RDS_NC стр.19–21");
    wire("Колодка INDOOR (синяя)", furn ? furn.model : "внутренний", "", "LX_RDS_NC стр.19–21");
    return;
  }
  if (mura && (furn || (fc && fc.mura_fig))) {
    // Fig. 25/26 (печь) и Fig. 27/28 (фанкойл) IM 37MURA — разводка снята с рисунков, стр. 25–28
    const fig = furn ? (furn.mura_fig || "25/26") : fc.mura_fig, S = `MURA_IM стр.${furn ? "25–26" : fig}`, ind = furn || fc;
    const un = furn && !furn.mura_fig ? " (печи нет в списках Fig. 25/26 — схема по аналогии, сверь IM печи)" : "";
    const y = furn && furn.mura_fig === "26" ? "Y1" : "Y";
    wire("Термостат R", `${ind.model} R и ${odu.model} R`, "сплайс" + un, S);
    wire("Термостат C", `${ind.model} C и ${odu.model} C`, "сплайс", S);
    wire("Термостат O/B (настроить на B)", `${odu.model} B`, "клапан под напряжением в нагреве", S + "; MURA_IM стр.24");
    if (furn) {
      wire(`Термостат ${y}`, `${furn.model} ${y}`, "", S);
      wire(`${furn.model} ${y}`, "плата RDS Y_in" + (coil && coil.rds === "in_box" ? " (провод 5, жёлт.)" : ""), "", S + (coil && coil.rds === "in_box" ? "; CVAMA стр.11" : ""));
      wire("Плата RDS Y_out" + (coil && coil.rds === "in_box" ? " (провод 4, жёлт./фиол.)" : ""), `${odu.model} Y2`, "Y1 на ODU по рисунку не подключён", S);
      wire("Термостат W", "плата RDS W_in" + (coil && coil.rds === "in_box" ? " (провод 3, бел.)" : ""), "", S);
      wire("Плата RDS W_out" + (coil && coil.rds === "in_box" ? " (провод 7, бел./фиол.)" : ""), `${furn.model} W` + (furn.mura_fig === "26" ? "/W1" : ""), "", S);
      wire("Термостат G", "плата RDS G_in" + (coil && coil.rds === "in_box" ? " (провод 6, зел.)" : ""), "", S);
      wire("Плата RDS G_out" + (coil && coil.rds === "in_box" ? " (провод 2, зел./фиол.)" : ""), `${furn.model} G`, "", S);
      wire(`${furn.model} SEC-1`, "плата RDS 24V" + (coil && coil.rds === "in_box" ? " (провод 1, красн.)" : ""), "", S);
      wire(`${furn.model} C`, "плата RDS C" + (coil && coil.rds === "in_box" ? " (провод 8, чёрн.)" : ""), "", S);
      wire(`${odu.model} W, D`, "не используются", "dual fuel", "MURA_IM стр.25");
      if (coil && coil.rds_wiring_verified === false) wire(`Плата ${coil.model}`, "номера проводов — сверь наклейку", "IM в базе нет", "");
    } else {
      wire("Термостат Y", `плата RDS Y_in (в ${fc.model})`, "", S);
      wire("Плата RDS Y_out", `${odu.model} Y2`, "Y1 на ODU по рисунку не подключён", S);
      wire("Термостат W", `плата RDS W_in и ${odu.model} D`, "сплайс", S);
      wire("Термостат G", "плата RDS G_in", "", S);
    }
    return;
  }
  if (coil && coil.rds === "in_box" && furn) {
    const un = coil.rds_wiring_verified === false ? " (для " + coil.model + " не проверено — сверь наклейку)" : "";
    const S = "CVAMA стр.11";
    wire("Термостат Y", `${furn.model} Y (Y1)`, "дальше через плату RDS" + un, S);
    wire(`${furn.model} Y`, "плата RDS провод 5 (жёлт.)", un, S);
    wire("Плата RDS провод 4 (жёлт./фиол.)", `${odu.model} Y`, un, S);
    wire("Термостат W", "плата RDS провод 3 (бел.)", un, S);
    wire("Плата RDS провод 7 (бел./фиол.)", `${furn.model} W (W1)`, un, S);
    wire("Термостат G", "плата RDS провод 6 (зел.)", un, S);
    wire("Плата RDS провод 2 (зел./фиол.)", `${furn.model} G`, un, S);
    wire("Плата RDS провод 1 (красн.)", `${furn.model} SEC1`, un, S);
    wire("Плата RDS провод 8 (чёрн.)", `${furn.model} C`, un, S);
  } else if (fc && fc.rds === "factory") {
    wire("Термостат", `${fc.model}`, "как обычно, по наклейке; плата RDS с завода, Y идёт через неё к наружному", "BRY_LK стр.13; CAR_R454_IS стр.27");
  } else if (furn) {
    wire("Термостат", furn.model, "по схеме IM печи (схема для этой связки в базе не разобрана)", "");
  }
  if (!mura && odu.kind === "hp" && odu.rv) wire(`Термостат O/B (настроить на ${odu.rv})`, `${odu.model} ${odu.rv}`, odu.rv_verified === false ? "O для R-454B не проверено" : "", "CR_RESSM стр.14");
}

function finish(out, notes) {
  delete out.seen;
  out.notes = notes;
  out.status = out.stop.length ? "СТОП" : (out.warn.length || notes.length ? "ПОКА НЕ ВСЁ" : "СХОДИТСЯ");
  return out;
}
