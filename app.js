import { evaluate } from "./rules.js";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const KEY_MOE = "hvac-moe-v1", KEY_ORDER = "hvac-order-v1";
const BRANDS = [["Carrier", "Carrier"], ["Bryant", "Bryant"], ["third", "Сторонние змеевики (Lennox, ADP) — чтобы ловить ошибки"]];
const CAT = { odu: "Наружные блоки", furnace: "Газовые печи", fancoil: "Фанкойлы", coil: "Змеевики на печь" };

let data, moe, order;
const load = (k, d) => { try { return { ...d, ...JSON.parse(localStorage.getItem(k) || "{}") }; } catch { return d; } };
const save = () => { localStorage.setItem(KEY_MOE, JSON.stringify(moe)); localStorage.setItem(KEY_ORDER, JSON.stringify(order)); };

function visible(m) {
  if (m.set === "regress" && !moe.regress) return false;
  if (m.third_party) return moe.brands.includes("third");
  return moe.brands.some(b => m.brand.includes(b));
}
const byId = id => data.models.find(m => m.id === id);
const tById = id => data.thermostats.find(t => t.id === id);
const label = m => m ? `${m.brand} ${m.model}` : "Выбрать…";

function srcHtml(ref) {
  if (!ref || ref.trim() === "—") return `<div class="src unv">Источник в базе: нет (не проверено)</div>`;
  const parts = ref.split(";").map(s => s.trim()).filter(Boolean);
  const items = parts.map(p => {
    const k = (p.match(/^[A-Z][A-Z0-9_]+/) || [""])[0], s = data.sources[k];
    if (!s) return `<li>${esc(p)}</li>`;
    return `<li><b>${esc(p)}</b> — ${esc(s.title)}${s.file ? `<br>файл: ${esc(s.file)}` : ""}${s.url ? `<br><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>` : ""}</li>`;
  }).join("");
  return `<details class="src"><summary>Источник: ${esc(ref)}</summary><ul>${items}</ul></details>`;
}

// ---------- выбор из списка (нижняя шторка)
function openSheet(kind) {
  let title, groups;
  if (kind === "odu") { title = "Наружный блок"; groups = [["odu", data.models.filter(m => m.cat === "odu" && visible(m))]]; }
  if (kind === "indoor") { title = "Печь или фанкойл"; groups = ["furnace", "fancoil"].map(c => [c, data.models.filter(m => m.cat === c && visible(m))]); }
  if (kind === "coil") { title = "Змеевик на печь"; groups = [["coil", data.models.filter(m => m.cat === "coil" && visible(m))]]; }
  if (kind === "tstat") { title = "Термостат"; groups = [["t", data.thermostats.filter(t => moe.tstats.includes(t.id))]]; }
  $("#sheet-title").textContent = title;
  $("#sheet-list").innerHTML = groups.map(([g, list]) =>
    (g !== "t" ? `<div class="sheet-grp">${CAT[g]}</div>` : "") +
    list.map(x => {
      const sub = x.cat ? [x.ref, x.set === "regress" ? "для прогона сценариев" : "", x.why].filter(Boolean).join(" · ") : (x.verified ? "" : "возможности не сверены с документом");
      return `<button class="opt ${order[kind] === x.id ? "cur" : ""}" data-id="${x.id}">${esc(x.cat ? label(x) : x.name)}<small>${esc(sub)}</small></button>`;
    }).join("")).join("") +
    `<button class="opt" data-id="">— очистить —</button>`;
  $$("#sheet-list .opt").forEach(b => b.onclick = () => { order[kind] = b.dataset.id || null; if (kind === "indoor" && byId(order.indoor)?.cat !== "furnace") order.coil = null; closeSheet(); render(); });
  $("#sheet").hidden = false;
}
function closeSheet() { $("#sheet").hidden = true; }

// ---------- отрисовка
function renderForm() {
  $$(".seg").forEach(seg => $$("button", seg).forEach(b => b.classList.toggle("on", order[seg.dataset.field] === b.dataset.v)));
  $$("input[type=checkbox][data-field]").forEach(i => i.checked = !!order[i.dataset.field]);
  $$("input.txt[data-field]").forEach(i => { if (document.activeElement !== i) i.value = order[i.dataset.field] || ""; });
  for (const k of ["odu", "indoor", "coil"]) { const b = $(`[data-pick=${k}]`), m = byId(order[k]); b.textContent = label(m); b.classList.toggle("set", !!m); }
  const t = tById(order.tstat), tb = $("[data-pick=tstat]"); tb.textContent = t ? t.name : "Выбрать…"; tb.classList.toggle("set", !!t);
  $("#coil-box").hidden = byId(order.indoor)?.cat !== "furnace";
}

function renderResult() {
  const box = $("#result");
  if (!order.odu || !order.indoor || !order.tstat) { box.innerHTML = `<div class="card muted">Выбери наружный блок, печь или фанкойл и термостат — результат появится здесь.</div>`; return; }
  const r = evaluate(data, order);
  const cls = r.status === "СТОП" ? "s-stop" : r.status === "СХОДИТСЯ" ? "s-ok" : "s-wait";
  const grp = (title, list, lvl) => list.length ? `<div class="card grp"><h3>${title}</h3>${list.map(x => `<div class="msg ${lvl}">${esc(x.text)}${srcHtml(x.src)}</div>`).join("")}</div>` : "";
  const notes = r.notes.length ? `<div class="card">${r.notes.map(n => `<div class="msg warn">${esc(n)}</div>`).join("")}</div>` : "";
  const strip = r.strip.length ? `<div class="card grp"><h3>Клеммы: термостат → куда</h3><table class="strip">${r.strip.map(w => `<tr><td>${esc(w.from)}</td><td class="arrow">→</td><td>${esc(w.to)}${w.note ? `<div class="muted">${esc(w.note)}</div>` : ""}${w.src ? srcHtml(w.src) : `<div class="src unv">не проверено</div>`}</td></tr>`).join("")}</table></div>` : "";
  const sel = [byId(order.odu), byId(order.indoor), byId(order.coil)].filter(Boolean);
  const facts = `<div class="card grp"><details><summary><b>Что известно о выбранных моделях</b></summary>${sel.map(m => `<div class="ref"><h3>${esc(label(m))}</h3><ul>${m.facts.map(([t, s]) => `<li>${esc(t)}${srcHtml(s)}</li>`).join("")}</ul></div>`).join("")}</details></div>`;
  box.innerHTML = `<div class="status ${cls}">${r.status}${r.stop.length ? ` · ${r.stop.length}` : ""}</div>` + notes +
    grp("СТОП", r.stop, "stop") + grp("Проверить", r.warn, "warn") + grp("Добавить в заказ", r.add, "add") + strip + grp("Сходится", r.ok, "ok") + facts;
}

function renderMoe() {
  $("#moe-brands").innerHTML = BRANDS.map(([k, n]) => `<label class="chk"><input type="checkbox" data-b="${k}" ${moe.brands.includes(k) ? "checked" : ""}> ${esc(n)}</label>`).join("");
  $("#moe-tstats").innerHTML = data.thermostats.map(t => `<label class="chk"><input type="checkbox" data-t="${t.id}" ${moe.tstats.includes(t.id) ? "checked" : ""}> ${esc(t.name)}${t.verified ? "" : ` <span class="badge">не сверен</span>`}</label>`).join("");
  $("#moe-regress").checked = !!moe.regress;
  $$("#moe-brands input").forEach(i => i.onchange = () => { moe.brands = $$("#moe-brands input:checked").map(x => x.dataset.b); save(); });
  $$("#moe-tstats input").forEach(i => i.onchange = () => { moe.tstats = $$("#moe-tstats input:checked").map(x => x.dataset.t); save(); });
  $("#moe-regress").onchange = e => { moe.regress = e.target.checked; save(); };
}

function renderRef() {
  $("#ref-meta").textContent = `Данные: ${data.generated}. Моделей: ${data.models.length}, правил: ${Object.keys(data.rules).length}. «не проверено» — факта нет в документах базы.`;
  const fixes = `<div class="card ref"><h3>Исправления базы</h3><ul>${data.fixes.map(f => `<li>${esc(f.text)}${srcHtml(f.src)}</li>`).join("")}</ul></div>`;
  const ms = ["odu", "furnace", "coil", "fancoil"].map(c => `<div class="card ref"><h3>${CAT[c]}</h3>${data.models.filter(m => m.cat === c).map(m => `<details><summary>${esc(label(m))}${m.set === "regress" ? '<span class="badge">сценарии</span>' : ""}</summary><p class="muted">${esc(m.why)}</p><ul>${m.facts.map(([t, s]) => `<li>${esc(t)}${srcHtml(s)}</li>`).join("")}</ul></details>`).join("")}</div>`).join("");
  const ts = `<div class="card ref"><h3>Термостаты</h3>${data.thermostats.map(t => `<details><summary>${esc(t.name)}${t.verified ? "" : '<span class="badge">не сверен</span>'}</summary><ul>${t.facts.map(([x, s]) => `<li>${esc(x)}${srcHtml(s)}</li>`).join("")}</ul></details>`).join("")}</div>`;
  $("#ref-list").innerHTML = fixes + ms + ts;
}

function render() { renderForm(); renderResult(); save(); }

async function init() {
  data = await (await fetch("data.json", { cache: "no-cache" })).json();
  moe = load(KEY_MOE, { brands: ["Carrier", "Bryant", "third"], tstats: data.thermostats.map(t => t.id), regress: false });
  order = load(KEY_ORDER, { loc: "closet", orient: "up", hasC: true });
  $$("nav button").forEach(b => b.onclick = () => {
    $$("nav button").forEach(x => x.classList.toggle("on", x === b));
    for (const s of ["order", "moe", "ref"]) $("#tab-" + s).hidden = s !== b.dataset.tab;
    if (b.dataset.tab === "order") render();
    window.scrollTo(0, 0);
  });
  $$(".seg").forEach(seg => $$("button", seg).forEach(b => b.onclick = () => { order[seg.dataset.field] = b.dataset.v; render(); }));
  $$("input[type=checkbox][data-field]").forEach(i => i.onchange = () => { order[i.dataset.field] = i.checked; render(); });
  $$("input.txt[data-field]").forEach(i => i.oninput = () => { order[i.dataset.field] = i.value.trim().toUpperCase(); renderResult(); save(); });
  $$("[data-pick]").forEach(b => b.onclick = () => openSheet(b.dataset.pick));
  $("#sheet-close").onclick = closeSheet; $(".sheet-bg").onclick = closeSheet;
  $("#reset").onclick = () => { order = { loc: "closet", orient: "up", hasC: true }; render(); window.scrollTo(0, 0); };
  renderMoe(); renderRef(); render();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}
init();
