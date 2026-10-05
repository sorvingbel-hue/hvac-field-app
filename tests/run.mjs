// node tests/run.mjs — 12 прогонов scenarios.txt (с исправленными ожиданиями) + кейс La Jolla + тесты на каждое исправление
import { readFileSync } from "fs";
import { evaluate, tons } from "../rules.js";
const data = JSON.parse(readFileSync(new URL("../data.json", import.meta.url)));
let pass = 0, fail = 0;
const ids = (r, lvl) => r[lvl].map(x => x.id);
function T(name, inp, exp) {
  const r = evaluate(data, { loc: "other", hasC: true, orient: "up", ...inp });
  const errs = [];
  if (exp.noStop && r.stop.length) errs.push("ожидали без СТОП, есть: " + ids(r, "stop"));
  if (exp.stops) { const s = ids(r, "stop").sort().join(","), e = [...exp.stops].sort().join(","); if (s !== e) errs.push(`СТОП ${s} ≠ ${e}`); }
  for (const id of exp.has || []) if (![...r.stop, ...r.warn, ...r.ok, ...r.add].some(x => x.id === id)) errs.push("нет " + id);
  for (const id of exp.not || []) if ([...r.stop, ...r.warn, ...r.ok, ...r.add].some(x => x.id === id)) errs.push("лишнее " + id);
  if (exp.status && r.status !== exp.status) errs.push(`статус ${r.status} ≠ ${exp.status}`);
  if (exp.tons) { if (r.tons.odu !== exp.tons[0] || r.tons.coil !== exp.tons[1]) errs.push(`тонны ${r.tons.odu}/${r.tons.coil}`); }
  if (exp.strip) for (const re of exp.strip) if (!r.strip.some(w => re.test(w.from + " → " + w.to + " " + w.note))) errs.push("в клеммах нет " + re);
  for (const x of [...r.stop, ...r.warn, ...r.ok, ...r.add]) if (!x.src) errs.push("без источника " + x.id);
  if (errs.length) { fail++; console.log("✗ " + name + "\n   " + errs.join("\n   ") + "\n   stop=" + ids(r, "stop") + " warn=" + ids(r, "warn")); }
  else { pass++; console.log("✓ " + name + "  [" + r.status + "]"); }
}
// ---- 12 прогонов scenarios.txt
T("1a 24VNA6 (остаётся) + 59MN7C + CVPMA + Infinity", { odu: "car-24vna6", oduStays: true, indoor: "car-59mn7c", coil: "cvpma", tstat: "car-infinity" }, { noStop: true, has: ["R410_EXISTING", "BUS_OK"] });
T("1b 24VNA6 (новый) → СТОП R-410A в CA", { odu: "car-24vna6", indoor: "car-59mn7c", coil: "cvpma", tstat: "car-infinity" }, { stops: ["R410_CA_NEW"] });
T("2 26VNA1 + 59TN6 + CVAMA + Infinity", { odu: "car-26vna1", indoor: "car-59tn6", coil: "cvama", tstat: "car-infinity" }, { noStop: true, has: ["BUS_UNVERIFIED", "RDS_CCN", "ADD_CCN"] });
T("3 27VNA3 + FE5B + Infinity", { odu: "car-27vna3", indoor: "fe5b", tstat: "car-infinity" }, { noStop: true, has: ["BUS_OK", "RDS_FACTORY"] });
T("4 291VAN + 987M + CVAMA + Evolution", { odu: "bry-291van", indoor: "bry-987m", coil: "cvama", tstat: "bry-evolution" }, { noStop: true, has: ["RDS_DISS_TERM", "RDS_CCN"] });
T("5 27SPA6 + 59SC5B + CVAMA + ecobee Premium", { odu: "car-27spa6", indoor: "car-59sc5b", coil: "cvama", tstat: "ecobee-premium" }, { noStop: true, has: ["DF_TSTAT_PARTIAL", "DF_HPS"] });
T("6 27SPA6 + FMA5X + T6", { odu: "car-27spa6", indoor: "fma5x", tstat: "honeywell-t6" }, { noStop: true, has: ["TSTAT_HP_UNKNOWN", "RDS_FACTORY"] });
T("7 37MURAQ + 45MUAAQ + T6", { odu: "car-37muraq", indoor: "45muaaq", tstat: "honeywell-t6" }, { noStop: true, has: ["MURA_S1", "RV_B", "RDS_45MU"], not: ["MURA_S3"] });
T("8 37MURAQ + 801SB + CVAMA + ecobee3 lite", { odu: "car-37muraq", indoor: "bry-801sb", coil: "cvama", tstat: "ecobee3-lite" }, { noStop: true, has: ["MURA_S3", "MURA_FURN_LIST", "RV_B"] });
T("9 37MURAQ + 801SB + CVPMA → только хладагент", { odu: "car-37muraq", indoor: "bry-801sb", coil: "cvpma", tstat: "ecobee3-lite" }, { stops: ["REF_MISMATCH"] });
T("10 26SPA6 + 58SB0 + CAAMP + Cor", { odu: "car-26spa6", indoor: "car-58sb0", coil: "caamp", tstat: "carrier-cor" }, { noStop: true, has: ["RDS_INBOX_WIRING_UNVER"] });
T("11 27TPA8 + FE5B + T6 → СТОП FE5B", { odu: "car-27tpa8", indoor: "fe5b", tstat: "honeywell-t6" }, { stops: ["FE5B_24V"] });
T("12 27SPA6 + 915SB + CVAMA + T6", { odu: "car-27spa6", indoor: "bry-915sb", coil: "cvama", tstat: "honeywell-t6" }, { noStop: true, has: ["DF_TSTAT_UNKNOWN"] });
// ---- кейс La Jolla (имя и адрес клиента не переносим)
T("LJ-A 37MURAQ36AA3 + 801SB + CVAMA3617XMA + ecobee3 lite, клозет", { odu: "car-37muraq", oduFull: "37MURAQ36AA3", indoor: "bry-801sb", coil: "cvama", coilFull: "CVAMA3617XMA", tstat: "ecobee3-lite", loc: "closet" },
  { noStop: true, has: ["RV_B", "MURA_S3", "DF_NEED", "DF_HPS", "DF_OAT", "DF_MURA_WD", "TON_MATCH", "VENT_B", "CLOSET_80"], tons: [3, 3], strip: [/→ 37MURAQ B /, /SEC-?1/, /Y_out.*→ 37MURAQ Y2/, /37MURAQ W, D → не используются/] });
T("LJ-B 37MURAQ48 + 801SB + ADP C48A175L159 → СТОП", { odu: "car-37muraq", oduFull: "37MURAQ48AA3", indoor: "bry-801sb", coil: "adp-c48a175l159", tstat: "ecobee3-lite" }, { stops: ["REF_MISMATCH_UNVER", "THIRD_PARTY_COIL"] });
// ---- R-410A в Калифорнии: правило по первоисточникам (CARB 17 CCR §95373/95375, EPA 40 CFR 84.54, 91 FR 31284)
{
  const r = data.rules.R410_CA_NEW, e = data.rules.R410_EXISTING;
  const chk = (name, ok) => { if (ok) { pass++; console.log("✓ " + name); } else { fail++; console.log("✗ " + name); } };
  chk("R410_CA_NEW: уровень stop", r.level === "stop");
  chk("R410_CA_NEW: нет устаревшего «распродажа закончилась 31.12.2025»", !/31\.12\.2025/.test(r.text));
  chk("R410_CA_NEW: источник — CARB и EPA, не только Carrier", /CARB_HFC/.test(r.src) && /EPA_TT\b/.test(r.src) && /EPA_TT2026/.test(r.src));
  chk("R410_CA_NEW: сказано про замену наружного в системе 1+1", /1 наружный \+ 1 внутренний/.test(r.text));
  chk("R410_CA_NEW: федеральное правило не выдано за калифорнийское", /Федерально EPA разрешает замену наружного/.test(r.text));
  chk("R410_EXISTING: порог EPA 75%/100% и последующая замена испарителя", /75%/.test(e.text) && /последующая замена испарителя/.test(e.text) && /EPA_TT2026/.test(e.src));
  for (const k of ["CARB_HFC", "EPA_TT", "EPA_TT2026"]) chk("источник " + k + " есть в data.sources с файлом", !!(data.sources[k] && data.sources[k].file && data.sources[k].url));
}
T("27SPA6 (R-454B, новый) → правил R-410A нет", { odu: "car-27spa6", indoor: "car-59sc5b", coil: "cvama", tstat: "ecobee-premium" }, { not: ["R410_CA_NEW", "R410_EXISTING"] });
T("24VNA6 (R-410A, новый) → СТОП R410_CA_NEW с источником CARB", { odu: "car-24vna6", indoor: "car-59mn7c", coil: "cvpma", tstat: "car-infinity" }, { stops: ["R410_CA_NEW"] });
// ---- тесты исправлений
T("45MUAAQ с 27SCA5 → СТОП", { odu: "car-27sca5", indoor: "45muaaq", tstat: "ecobee3-lite" }, { stops: ["ONLY_37MU"] });
T("45MULAQ + 37MURA → без СТОП crossover", { odu: "car-37muraq", indoor: "car-59tp6c", coil: "45mulaq", tstat: "ecobee3-lite" }, { noStop: true, has: ["RDS_UNKNOWN", "MURA_FURN_LIST"] });
T("45MULAQ + 27SCA5 → СТОП", { odu: "car-27sca5", indoor: "car-59tp6c", coil: "45mulaq", tstat: "ecobee3-lite" }, { stops: ["ONLY_37MU"] });
T("T701 + ТН + печь → СТОП", { odu: "car-27sca5", indoor: "car-59sc5b", coil: "cvama", tstat: "pro1-t701" }, { stops: ["DF_TSTAT_NO"] });
T("T701 + 2-ступенчатый → СТОП", { odu: "car-27tpa8", indoor: "fma5x", tstat: "pro1-t701" }, { stops: ["TSTAT_STAGES"] });
T("T701 + AC + печь без C → батарейки", { odu: "car-26sca5", indoor: "car-59sc5b", coil: "cvama", tstat: "pro1-t701", hasC: false }, { noStop: true, has: ["NO_C_BATT"] });
T("ecobee без C → PEK", { odu: "car-26sca5", indoor: "fma5x", tstat: "ecobee-premium", hasC: false }, { noStop: true, has: ["NO_C_PEK"] });
T("Infinity без C → СТОП", { odu: "car-27vna0", indoor: "fe5b", tstat: "car-infinity", hasC: false }, { stops: ["NO_C_ABCD"] });
T("T6 без C → предупреждение", { odu: "car-26sca5", indoor: "fma5x", tstat: "honeywell-t6", hasC: false }, { noStop: true, has: ["NO_C_UNKNOWN"] });
T("Гараж → 18\"", { odu: "car-26sca5", indoor: "bry-801sb", coil: "cvama", tstat: "ecobee3-lite", loc: "garage" }, { has: ["GARAGE", "VENT_B"] });
T("Чердак → поддон", { odu: "car-26sca5", indoor: "car-59tp6c", coil: "cvama", tstat: "ecobee3-lite", loc: "attic", orient: "horiz" }, { has: ["PAN_ATTIC", "RDS_SENSOR_HORIZ", "VENT_PVC"], not: ["VENT_UNVER"] });
T("Над жилой зоной → поддон", { odu: "car-26sca5", indoor: "fma5x", tstat: "ecobee3-lite", overLiving: true }, { has: ["PAN_ATTIC"] });
T("Lennox CK40CT на Bryant → СТОП + кит", { odu: "car-26sca5", indoor: "bry-801sb", coil: "lnx-ck40ct", tstat: "ecobee3-lite" }, { stops: ["THIRD_PARTY_COIL"], has: ["RDS_FIELD_KIT", "FLOAT_LNX"] });
T("Infinity + 27TPA8 + 59MN7C → NIM", { odu: "car-27tpa8", indoor: "car-59mn7c", coil: "cvama", tstat: "car-infinity" }, { noStop: true, has: ["ODU_24V_ON_ABCD_2", "RDS_CCN"] });
T("Infinity + 24V-печь → СТОП (шина по печи)", { odu: "car-26sca5", indoor: "car-59sc5b", coil: "cvama", tstat: "car-infinity" }, { stops: ["BUS_NEED_INDOOR"] });
T("37MURA + Infinity → СТОП", { odu: "car-37muraq", indoor: "car-59mn7c", coil: "cvama", tstat: "car-infinity" }, { stops: ["MURA_NO_ABCD"] });
T("37MURA + 59SC5B → нет в списке", { odu: "car-37muraq", indoor: "car-59sc5b", coil: "cvama", tstat: "ecobee3-lite" }, { noStop: true, has: ["MURA_FURN_NOTLIST", "VENT_UNVER"] });
T("27VNA0 + 24V-термостат → СТОП", { odu: "car-27vna0", indoor: "fma5x", tstat: "ecobee3-lite" }, { stops: ["ODU_NEEDS_ABCD"] });
T("926T вент по префиксу", { odu: "bry-146san", indoor: "bry-926t", coil: "cvama", tstat: "ecobee3-lite" }, { noStop: true, has: ["VENT_PVC", "VENT_UNVER"] });
T("FE5B горизонт → перенос датчика", { odu: "car-27vna0", indoor: "fe5b", tstat: "car-infinity", orient: "horiz" }, { has: ["RDS_SENSOR_FE5B"] });
T("Coastal: 27SCA5 есть, 27SPA6 нет", { odu: "car-27sca5", indoor: "fma5x", tstat: "ecobee3-lite", coastal: true }, { has: ["COASTAL_YES"] });
T("Coastal: 27SPA6 нет", { odu: "car-27spa6", indoor: "fma5x", tstat: "ecobee3-lite", coastal: true }, { has: ["COASTAL_NO"] });
T("Тоннаж не совпал", { odu: "car-27spa6", oduFull: "27SPA660A003", indoor: "car-59tp6c", coil: "cvama", coilFull: "CVAMA3617XMA", tstat: "ecobee3-lite" }, { has: ["TON_MISMATCH"], tons: [5, 3] });
T("38MURA (остаётся) + FMA5X → список crossover + СТОП хладагент", { odu: "car-38muraq", oduStays: true, indoor: "fma5x", tstat: "ecobee3-lite" }, { has: ["MURA410_LIST", "REF_MISMATCH"] });
T("37MURA + FMA5X → Fig. 27, W и на ODU D", { odu: "car-37muraq", indoor: "fma5x", tstat: "ecobee3-lite" }, { noStop: true, has: ["MURA_S3", "MURA_FC_FIG", "RDS_FACTORY"], strip: [/W_in и 37MURAQ D/, /Y_out → 37MURAQ Y2/] });
T("37MURA + 59TP6C (Fig. 26) → Y1 печи", { odu: "car-37muraq", indoor: "car-59tp6c", coil: "cvama", tstat: "ecobee3-lite" }, { noStop: true, strip: [/Термостат Y1 → 59TP6C Y1/] });
// ---- tons()
const tt = [["27SPA660A003", "carrier", 5], ["24ACC436A003", "carrier", 3], ["146SAN036", "bryant", 3], ["37MURAQ36AA3", "mura", 3], ["37MURAQ48AA3", "mura", 4], ["CVAMA4921XMA", "cvama", 4], ["CVAMA3617XMA", "cvama", 3], ["27SPA642", "carrier", 3.5]];
for (const [m, k, e] of tt) { const v = tons(m, k); if (v === e) pass++; else { fail++; console.log(`✗ tons(${m})=${v} ≠ ${e}`); } }
// ---- все правила из data.json имеют источник или явно «—»
for (const [k, r] of Object.entries(data.rules)) if (!r.src) { fail++; console.log("✗ правило без поля src: " + k); }
console.log(`\nИтого: ${pass} ок, ${fail} ошибок`);
process.exit(fail ? 1 : 0);
