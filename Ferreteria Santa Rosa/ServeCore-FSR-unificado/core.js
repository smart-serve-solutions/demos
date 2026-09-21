/* ═══════════════════════════════════════════════════════════════
   ServeCore — núcleo de interfaz
   Lenguaje visual del rediseño: barra superior con el menú de los 27
   módulos, migas de pan, tarjetas, tablas y capas. Todas las pantallas
   se pintan con estas piezas; ninguna inventa las suyas.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, N = w.NAV;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ── iconos ─────────────────────────────────────────────────── */
  const ICONS = {
    home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/>',
    cart: '<circle cx="9.5" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/><path d="M2.5 3h2.4l1.7 10.6a2 2 0 0 0 2 1.7h8.2a2 2 0 0 0 2-1.6L20.5 7H6"/>',
    box: '<path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9L12 3z"/><path d="M3.5 7.5 12 12l8.5-4.5"/><path d="M12 12v9"/>',
    truck:
      '<path d="M2 6h11v10H2z"/><path d="M13 10h4l4 3.2V16h-8z"/><circle cx="6.5" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    chat: '<path d="M3.5 5.5A2 2 0 0 1 5.5 3.5h13A2 2 0 0 1 20.5 5.5v8A2 2 0 0 1 18.5 15.5H9l-4.6 3.6a.5.5 0 0 1-.8-.4v-3.2H5.5A2 2 0 0 1 3.5 13.5z"/>',
    chart: '<path d="M4 20V10m6 10V4m6 16v-7m6 7V8" />',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H10.5a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V10.5a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    sun: '<circle cx="12" cy="12" r="4.3"/><path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/>',
    moon: '<path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a7 7 0 0 0 10.2 10.2z"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 1-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 0-1 1h-3M4 12h16"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    chevd: '<path d="M6 9l6 6 6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pin: '<path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/>',
    wrench:
      '<path d="M14.5 3.5a4.5 4.5 0 0 0-5.9 4.7L3 14v3.5A1.5 1.5 0 0 0 4.5 19H8v-3.5H11.6l5.8-5.6a4.5 4.5 0 0 0-2.9-6.4z"/>',
    route:
      '<circle cx="6" cy="18" r="2.3"/><circle cx="18" cy="6" r="2.3"/><path d="M8.1 18H14a4 4 0 0 0 4-4V9.9"/>',
    bank: '<path d="M3 10.5 12 4l9 6.5"/><path d="M4.5 10.5v8.5M9 10.5v8.5M15 10.5v8.5M19.5 10.5v8.5"/><path d="M3 19.5h18"/>',
    users:
      '<circle cx="8.5" cy="8" r="3.2"/><path d="M2.5 19a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.6"/><path d="M14.8 12.2A5 5 0 0 1 21.5 17"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    print:
      '<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="7" rx="1.5"/><path d="M6 14h12v7H6z"/>',
    history:
      '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M2.5 3v4h4"/><path d="M12 8v4l3 2"/>',
    sparkle:
      '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    phone:
      '<rect x="6.5" y="2.5" width="11" height="19" rx="2.2"/><path d="M11 19h2"/>',
    wallet:
      '<path d="M3 7.5A2 2 0 0 1 5 5.5h13a1 1 0 0 1 1 1v2"/><path d="M3 7.5v10A2 2 0 0 0 5 19.5h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H6a1 1 0 0 1 0-2h13"/><circle cx="16" cy="14" r="1.3"/>',
    layers: '<path d="M12 3 3 8l9 5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    scale:
      '<path d="M12 3v18M7 7l-4 8a4 4 0 0 0 8 0zM17 7l-4 8a4 4 0 0 0 8 0zM5 7h14"/>',
    ruler:
      '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v3M15 8v3M19 8v3"/>',
    upload:
      '<path d="M12 4v10"/><path d="M8 8l4-4 4 4"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    shield:
      '<path d="M12 3l7 3.2v5.3c0 4.8-3 7.9-7 9.3-4-1.4-7-4.5-7-9.3V6.2z"/><path d="M9 12l2 2 4-4.5"/>',
    server:
      '<rect x="3.5" y="4" width="17" height="6" rx="1.6"/><rect x="3.5" y="14" width="17" height="6" rx="1.6"/><path d="M7 7h.01M7 17h.01"/>',
    factory:
      '<path d="M3 21V11l4 2.6V11l4 2.6V11l4 2.6V7h2v14z"/><path d="M3 21h16"/>',
    wifi: '<path d="M2 8.5a15 15 0 0 1 20 0"/><path d="M5.5 12.5a10 10 0 0 1 13 0"/><path d="M9 16.3a5 5 0 0 1 6 0"/><circle cx="12" cy="19.4" r="1.05" fill="currentColor" stroke="none"/>',
    /* añadidos para las pantallas que llegan del demo anterior */
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M5.5 9.5v5M18.5 9.5v5"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.8h19M6 15h4"/>',
    link: '<path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.9a4 4 0 0 0-5.7-5.6l-1.6 1.6"/><path d="M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.9a4 4 0 0 0 5.7 5.6l1.6-1.6"/>',
    filter: '<path d="M3 5h18l-7 8v5.5l-4 2V13z"/>',
    book: '<path d="M4 5.2c3-1.1 5.2-1.1 8 .5 2.8-1.6 5-1.6 8-.5v13c-3-1.1-5.2-1.1-8 .5-2.8-1.6-5-1.6-8-.5z"/><path d="M12 5.7v13"/>',
    swap: '<path d="M4 8h15l-3.5-3.5M20 16H5l3.5 3.5"/>',
    gavel: '<path d="M3 20.5h8.5"/><path d="m6.6 15.4 6.2-6.2"/><path d="m10.4 7.4 4-4 5 5-4 4z"/><path d="m7.6 10.2 3.8 3.8-2.3 2.3-3.8-3.8z"/>',
    calc: '<rect x="4.5" y="2.8" width="15" height="18.4" rx="2.4"/><path d="M8 7h8"/><path d="M8.6 11.6v.01M12 11.6v.01M15.4 11.6v.01M8.6 15.6v.01M12 15.6v.01M15.4 15.6v.01"/>',
    badge: '<rect x="3.5" y="4" width="17" height="16" rx="2.4"/><circle cx="12" cy="10" r="2.6"/><path d="M7.6 17.2a4.8 4.8 0 0 1 8.8 0"/>',
    arrowup: '<path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/>',
    arrowdown: '<path d="M12 5v14M6.5 13.5 12 19l5.5-5.5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.2"/><path d="M16 8V6.4A2.4 2.4 0 0 0 13.6 4H6.4A2.4 2.4 0 0 0 4 6.4v7.2A2.4 2.4 0 0 0 6.4 16H8"/>',
    clip: '<path d="M8.6 3.6h6l3.4 3.4v13.4H6V6z"/><path d="M9.4 2.4h5v3h-5z"/><path d="M9 12h6M9 15.4h4"/>',
    trash: '<path d="M4.5 6.5h15M9.5 6.5V4.6h5v1.9M6.5 6.5 7.4 20h9.2l.9-13.5M10 10.5v6M14 10.5v6"/>',
    eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.4-2 6.4h16S18 14 18 9z"/><path d="M13.7 19.5a2 2 0 0 1-3.4 0"/>',
    download: '<path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 18.5h15"/>',
    mail: '<rect x="2.5" y="5" width="19" height="14" rx="2.4"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    leaf: '<path d="M4.5 19.5C3 14 6 5.5 19.5 4.5c1 10-4.5 15.5-11 14"/><path d="M8.5 15.5c2-3.5 4.5-5.8 8-7.5"/>'

  };
  (function () {
    const defs = Object.keys(ICONS).map(k => `<symbol id="i-${k}" viewBox="0 0 24 24">${ICONS[k]}</symbol>`).join("");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = "<defs>" + defs + "</defs>";
    document.body.prepend(svg);
  })();
  const icon = (name, extra) => `<svg class="ic" ${extra || ""}><use href="#i-${name}"/></svg>`;

  /* ── formato ────────────────────────────────────────────────── */
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const grp = n => String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const n0 = n => (n < 0 ? "−" : "") + grp(n);
  const c = n => (n < 0 ? "−₡" : "₡") + grp(n);
  const c0 = n => "₡" + grp(n);
  const dec = (n, d) => Number(n).toFixed(d == null ? 1 : d).replace(".", ",");
  const pct = n => (n < 0 ? "−" : "") + Math.abs(n).toFixed(1).replace(".", ",") + " %";
  const kg = n => (n >= 1000 ? dec(n / 1000, 1) + " t" : n >= 1 ? dec(n, 1) + " kg" : Math.round(n * 1000) + " g");
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
  const DIA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const p2 = x => String(x).padStart(2, "0");
  const fecha = d => `${p2(d.getDate())} ${MES[d.getMonth()]}`;
  const fechaL = d => `${p2(d.getDate())} ${MES[d.getMonth()]} ${d.getFullYear()}`;
  const hora = d => `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  const fh = d => `${fecha(d)} ${hora(d)}`;
  const fechaLarga = d => d.toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" });
  const ini = nom => String(nom).split(" ").filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase();
  const locNom = id => { const l = D.locales.find(x => x.id === id); return l ? l.nom : "—"; };
  const locEtiqueta = l => (/^L\d+$/.test(l.id) ? "Local " + l.id.slice(1) : null);
  const cliNom = id => { const x = D.cliById[id]; return x ? x.nom : "Consumidor final"; };
  const provNom = id => { const x = D.provById[id]; return x ? x.nom : "—"; };
  const artOf = id => D.artById[id];
  const famNom = id => { const f = D.famById[id]; return f ? f.nom : id; };

  /* ── piezas: tarjetas, cifras y etiquetas ───────────────────── */
  const KIND = { ok: "ok", wa: "warn", cr: "crit", ac: "acc", mu: "mu", warn: "warn", crit: "crit", acc: "acc", in: "acc" };

  function card(o) {
    /* acepta card({title,hint,actions,body,cls,id,flush}) y card(title,hint,body,actions) */
    if (typeof o === "string") o = { title: o, hint: arguments[1], body: arguments[2], actions: arguments[3] };
    const flush = o.flush != null ? o.flush : /^\s*<div class="tscroll/.test(o.body || "");
    const head = (o.title || o.hint || o.actions)
      ? `<div class="card-h"><h3>${esc(o.title || "")}</h3>${o.chip || ""}${o.hint ? `<span class="hint">${esc(o.hint)}</span>` : ""}${o.actions ? `<div class="card-a">${o.actions}</div>` : ""}</div>`
      : "";
    return `<section class="card ${o.cls || ""}" ${o.id ? `id="${o.id}"` : ""}>${head}<div class="card-b ${flush ? "flush" : ""}">${o.body || ""}</div></section>`;
  }
  const panel = card;

  const stat = (label, val, delta, tint) =>
    `<div class="stat" style="--tint:${tint || "var(--accent)"}"><div class="sv">${val}</div><div class="sl">${esc(label)}</div>${delta ? `<div class="sd ${delta.dir || ""}">${delta.txt}</div>` : ""}</div>`;

  /* kpi(label, valor, detalle, clase) — la cifra de siempre, en el traje nuevo */
  const kpi = (l, v, d, cls, tint) =>
    `<div class="stat ${cls || ""}" style="--tint:${tint || "var(--accent)"}"><div class="sv">${v}</div><div class="sl">${esc(l)}</div>${d ? `<div class="sd">${d}</div>` : ""}</div>`;

  const tag = (text, kind, ic) => `<span class="tag ${KIND[kind] || "mu"}">${ic ? icon(ic) : ""}${esc(text)}</span>`;
  const chip = tag;

  const pageHead = (title, sub, actions) =>
    `<div class="pagehead"><div class="ph-t"><h2>${esc(title)}</h2>${sub ? `<div class="ps">${sub}</div>` : ""}</div>${actions ? `<div class="ph-a">${actions}</div>` : ""}</div>`;

  const empty = (ic, t, p) => `<div class="empty">${icon(ic)}<h4>${esc(t)}</h4><p>${esc(p)}</p></div>`;

  const fichaCell = (label, val, col) =>
    `<div class="fcell"><div class="fl">${esc(label)}</div><div class="fv num" style="${col ? "color:" + col : ""}">${val}</div></div>`;

  const field = (label, html) => `<div class="field"><label>${esc(label)}</label>${html}</div>`;
  const selectField = (label, opts, id) =>
    field(label, `<select ${id ? `id="${id}"` : ""}>${opts.map(o => `<option>${esc(o)}</option>`).join("")}</select>`);

  const prog = parts => `<div class="prog">${parts.map(p => `<i style="width:${p.w}%;background:${p.col}"></i>`).join("")}</div>`;

  /* ── tablas ─────────────────────────────────────────────────── */
  /* cols: {t, cls, r, c, w, fmt(row,i)} · o: {rows, foot, rowCls, onRow, h, cls} */
  function table(o) {
    const cols = o.cols;
    const th = cols.map(k => `<th class="${k.r ? "r" : k.c ? "c" : ""}" ${k.w ? `style="width:${k.w}"` : ""}>${esc(k.t || "")}</th>`).join("");
    const body = (o.rows || []).map((row, i) => {
      const cls = (o.rowCls ? o.rowCls(row, i) : "") || "";
      const tds = cols.map(k => `<td class="${k.cls || ""} ${k.r ? "r" : k.c ? "c" : ""}">${k.fmt ? k.fmt(row, i) : esc(row[k.k])}</td>`).join("");
      return `<tr class="${cls} ${o.onRow ? "clickable" : ""}" data-i="${i}">${tds}</tr>`;
    }).join("");
    const foot = o.foot
      ? `<tfoot><tr>${o.foot.map(f => `<td class="${f.cls || ""} ${f.r ? "r" : ""}" ${f.span ? `colspan="${f.span}"` : ""}>${f.v}</td>`).join("")}</tr></tfoot>` : "";
    const vacio = `<tr><td colspan="${cols.length}" class="tvacio">Sin resultados</td></tr>`;
    return `<div class="tscroll" ${o.h ? `style="max-height:${o.h}"` : ""}><table class="dt ${o.cls || ""}"><thead><tr>${th}</tr></thead><tbody>${body || vacio}</tbody>${foot}</table></div>`;
  }
  const dt = table;

  /* ── controles segmentados ──────────────────────────────────── */
  const seg = (id, opts, cur) =>
    `<div class="seg" data-seg="${id}">${opts.map(o => `<button type="button" data-v="${esc(o.v || o)}" aria-pressed="${(o.v || o) === cur}">${esc(o.t || o)}</button>`).join("")}</div>`;
  function onSeg(root, id, fn) {
    const el = (root || document).querySelector(`[data-seg="${id}"]`) || document.querySelector(`[data-seg="${id}"]`);
    if (!el) return;
    $$("button", el).forEach(b => b.addEventListener("click", () => {
      $$("button", el).forEach(x => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      fn(b.dataset.v);
    }));
  }

  /* ── gráficos ───────────────────────────────────────────────── */
  function barRow(label, val, max, sub, col) {
    const p = Math.max(2, Math.min(100, (val / (max || 1)) * 100));
    return `<div class="bar"><div class="bn">${esc(label)}</div>
      <div class="bt"><i style="width:${p.toFixed(1)}%;background:${col || "var(--accent)"}"></i></div>
      <div class="bv num">${sub}</div></div>`;
  }
  function bars(rows, o) {
    o = o || {};
    const max = o.max || Math.max.apply(null, rows.map(r => Math.abs(r.v)).concat([1]));
    return `<div class="bars">${rows.map(r => {
      const col = r.cls === "good" ? "var(--ok)" : r.cls === "below" || (o.target != null && r.v < o.target) ? "var(--crit)" : "var(--accent)";
      return barRow(r.n, Math.abs(r.v), max, r.lab, col);
    }).join("")}</div>`;
  }

  function lineChart(vals, labels, W, H, o) {
    o = o || {};
    W = W || 560; H = H || 140;
    const max = o.max || Math.max.apply(null, vals) * 1.12 || 1;
    const x = i => (i / Math.max(1, vals.length - 1)) * (W - 28) + 14;
    const y = v => H - 22 - (v / max) * (H - 46);
    const pts = vals.map((v, i) => [x(i), y(v)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const area = `${d} L${pts[pts.length - 1][0].toFixed(1)},${H - 22} L${pts[0][0].toFixed(1)},${H - 22} Z`;
    const dots = pts.map((p, i) => {
      const last = i === pts.length - 1;
      const marca = o.marks && o.marks[i];
      return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${last ? 4 : marca ? 4 : 2.5}" fill="${marca ? "var(--warn)" : last ? "var(--accent)" : "var(--surface)"}" stroke="${marca ? "var(--warn)" : "var(--accent)"}" stroke-width="1.6"/>`;
    }).join("");
    const labs = (labels || []).map((l, i) =>
      `<text x="${pts[i][0].toFixed(1)}" y="${H - 5}" font-size="10.5" fill="${o.marks && o.marks[i] ? "var(--warn)" : "var(--ink-4)"}" text-anchor="middle" font-family="IBM Plex Mono, monospace">${esc(l)}</text>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block" role="img" aria-label="${esc(o.alt || "Serie")}">
      <path d="${area}" fill="var(--accent-soft)" stroke="none"/>
      <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}${labs}</svg>`;
  }
  /* line(vals,{...}) — firma del demo anterior: [{n,v,lab,mark}] */
  const line = (vals, o) => {
    o = o || {};
    return lineChart(vals.map(v => v.v), vals.map(v => v.n), 620, 150, {
      max: o.max, alt: o.alt, marks: vals.map(v => !!v.mark)
    });
  };

  function donut(p, size, col) {
    size = size || 88;
    const r = (size - 12) / 2, cc = 2 * Math.PI * r, off = cc * (1 - p / 100);
    return `<svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="9"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col || "var(--accent)"}" stroke-width="9" stroke-linecap="round"
        stroke-dasharray="${cc.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="50%" y="53%" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="${(size * 0.22).toFixed(0)}" fill="var(--ink)">${Math.round(p)}%</text></svg>`;
  }

  /* ── capas: cajón lateral, popover, avisos, consejos ────────── */
  const overlay = () => $("#overlayRoot");
  function openSheet(o) {
    overlay().innerHTML =
      `<div class="sheet-scrim" id="ovScrim"><div class="sheet ${o.wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(o.title || "")}">
        <div class="sheet-h"><div class="sheet-t"><h3>${esc(o.title)}</h3>${o.sub ? `<div class="mut ss">${esc(o.sub)}</div>` : ""}</div>
          <button class="iconbtn" id="ovClose" aria-label="Cerrar">${icon("x")}</button></div>
        <div class="sheet-b ${o.tight ? "tight" : ""}">${o.body || ""}</div>
        ${o.footer ? `<div class="sheet-f">${o.footer}</div>` : ""}</div></div>`;
    $("#ovScrim").addEventListener("click", e => { if (e.target.id === "ovScrim") closeSheet(); });
    $("#ovClose").addEventListener("click", closeSheet);
    const f = overlay().querySelector("input,textarea,select");
    if (f) setTimeout(() => f.focus(), 60);
    if (o.after) o.after(overlay());
    return overlay();
  }
  const sheet = openSheet;
  function closeSheet() { overlay().innerHTML = ""; }

  function popover(anchor, html, after) {
    const r = anchor.getBoundingClientRect();
    overlay().innerHTML = `<div class="pop-scrim" id="popScrim"></div><div class="pop" style="top:${r.bottom + 6}px;left:${Math.min(r.left, innerWidth - 300)}px">${html}</div>`;
    $("#popScrim").addEventListener("click", closeSheet);
    if (after) after(overlay());
  }

  let TOASTS = null;
  function toast(t, s, kind) {
    if (!TOASTS) {
      TOASTS = document.createElement("div");
      TOASTS.className = "toasts";
      document.body.appendChild(TOASTS);
    }
    const col = { ok: "var(--ok)", wa: "var(--warn)", warn: "var(--warn)", cr: "var(--crit)", crit: "var(--crit)" }[kind] || "var(--accent)";
    const el = document.createElement("div");
    el.className = "toast";
    el.style.borderLeftColor = col;
    el.innerHTML = `<div class="tt">${esc(t)}</div>${s ? `<div class="ts">${esc(s)}</div>` : ""}`;
    TOASTS.appendChild(el);
    setTimeout(() => {
      el.style.opacity = 0; el.style.transform = "translateY(6px)";
      setTimeout(() => el.remove(), 300);
    }, 4000);
  }

  w.UI = {
    $, $$, icon, esc, norm, grp, n0, c, c0, dec, pct, kg, MES, DIA, p2,
    fecha, fechaL, hora, fh, fechaLarga, ini, locNom, locEtiqueta, cliNom, provNom, artOf, famNom,
    card, panel, stat, kpi, tag, chip, pageHead, empty, fichaCell, field, selectField, prog,
    table, dt, seg, onSeg, barRow, bars, lineChart, line, donut,
    openSheet, sheet, closeSheet, popover, toast
  };
})(window);
