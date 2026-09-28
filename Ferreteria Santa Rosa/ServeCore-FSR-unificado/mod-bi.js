/* ═══════════════════════════════════════════════════════════════
   Reportería y BI — parte 1
   Cómo vamos hoy (tablero de gerencia con refresco y modo oficina),
   Comparar, Todos los reportes (biblioteca + filtros → generar →
   resultado) y Preguntas en lenguaje natural.
   La parte 2 (mod-bi-control.js) trae Alertas, Mis descargas y
   Permisos / réplica. Todo es demostración: los números son
   simulados, pero salen de la misma base que el resto de la demo.
   Requerimientos: REP-001 a REP-009 (ver nav.js).
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB,
    A = w.APP,
    S = w.S,
    U = w.UI;
  const {
    $,
    $$,
    esc,
    norm,
    grp,
    c,
    dec,
    fecha,
    hora,
    icon,
    tag,
    card,
    stat,
    table,
    bars,
    barRow,
    donut,
    seg,
    onSeg,
    openSheet,
    closeSheet,
    toast,
    locNom,
    cliNom,
    provNom,
    artOf,
    empty,
    prog,
  } = U;

  /* ── ayudas de simulación (deterministas: el mismo dato, siempre) ── */
  const hash = (s) => {
    let h = 2166136261;
    String(s)
      .split("")
      .forEach((ch) => {
        h ^= ch.charCodeAt(0);
        h = Math.imul(h, 16777619);
      });
    return (h >>> 0) / 4294967295;
  };
  const jit = (s, a, b) => a + (b - a) * hash(s);
  const suma = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
  const sgn = (d, unit) =>
    (d >= 0 ? "▲ +" : "▼ −") +
    dec(Math.abs(d)) +
    (unit === "pp" ? " pp" : " %");
  const tagVar = (d, unit, inv) =>
    tag(sgn(d, unit), (inv ? d <= 0 : d >= 0) ? "ok" : "crit");
  const mill = (n) => "₡" + dec(n / 1e6, n >= 1e8 ? 0 : 1) + " M";

  const SERIE = D.serieSemana();
  const BASE_DIA = Math.max(
    1.5e6,
    suma(SERIE.slice(0, 6), (x) => x.total) / 6 || 4.2e6,
  );
  const TIQ = (() => {
    const n = suma(SERIE, (x) => x.n);
    return n ? suma(SERIE, (x) => x.total) / n : 38000;
  })();
  const LW = {
    L1: 0.22,
    L2: 0.25,
    L3: 0.13,
    L4: 0.1,
    L5: 0.09,
    L6: 0.13,
    L7: 0.08,
  };
  const FAMS = D.familias.filter((f) => !f.servicio);
  const VEND = D.VENDEDORES;

  /* estado compartido entre las dos partes del módulo */
  const BI = (w.BI = w.BI || {});
  BI.hash = hash;
  BI.jit = jit;
  BI.BASE_DIA = BASE_DIA;
  BI.mill = mill;
  BI.tagVar = tagVar;
  BI.puedeExportar = (g) =>
    S.role === "gerencia" || (S.role === "bodega" && g === "Inventario");

  /* ── estilos propios del módulo ─────────────────────────────── */
  (function () {
    const st = document.createElement("style");
    st.textContent = `
    .bi-live{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-3)}
    .bi-dot{width:9px;height:9px;border-radius:50%;background:var(--ok);flex:none}
    .bi-dot.off{background:var(--ink-4)}
    @media (prefers-reduced-motion:no-preference){.bi-dot.on{animation:bipulse 2s infinite}
      @keyframes bipulse{0%{box-shadow:0 0 0 0 rgba(60,170,100,.55)}100%{box-shadow:0 0 0 9px rgba(60,170,100,0)}}
      .bi-flash{animation:biflash 1.4s ease-out}
      @keyframes biflash{0%{background:var(--accent-soft)}100%{background:transparent}}}
    .bi-strip{display:flex;flex-wrap:wrap;gap:12px 18px;align-items:center;justify-content:space-between}
    .bi-strip .grp{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .bi-sent{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;font-size:15px;color:var(--ink-2)}
    .bi-sent select{font-weight:650;color:var(--ink);padding:6px 10px;border-radius:9px;border:1px solid var(--hair);background:var(--surface);font-size:14px}
    .bi-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
    .bi-rep{position:relative;text-align:left;background:var(--surface);border:1px solid var(--hair);border-radius:var(--r);padding:14px 44px 13px 15px;display:flex;flex-direction:column;gap:5px;cursor:pointer;width:100%}
    .bi-rep:hover{border-color:var(--accent);box-shadow:var(--shadow-sm)}
    .bi-rep .rn{font-size:14px;font-weight:700;line-height:1.3}
    .bi-rep .rd{font-size:12.5px;color:var(--ink-3);line-height:1.45}
    .bi-rep .rm{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:3px}
    .bi-rep.lock{background:var(--surface-2)}
    .bi-star{position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:8px;font-size:17px;color:var(--ink-4);display:flex;align-items:center;justify-content:center}
    .bi-star:hover{background:var(--surface-3);color:var(--warn)}
    .bi-star.on{color:var(--warn)}
    .bi-rail{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px}
    .bi-rail>*{flex:0 0 250px}
    .bi-mini{background:var(--surface);border:1px solid var(--hair);border-radius:var(--r);padding:11px 13px;text-align:left;display:flex;flex-direction:column;gap:3px}
    button.bi-mini{cursor:pointer}button.bi-mini:hover{border-color:var(--accent)}
    .bi-gb{display:flex;flex-direction:column;gap:11px}
    .bi-gb .r{display:grid;grid-template-columns:minmax(90px,150px) 1fr auto;gap:10px;align-items:center}
    .bi-gb .n{font-size:13px;font-weight:600;line-height:1.25}
    .bi-gb .b{height:9px;border-radius:5px;background:var(--surface-3);overflow:hidden;margin:2px 0}
    .bi-gb .b i{display:block;height:100%;border-radius:5px}
    .bi-gb .v{display:flex;gap:8px;align-items:center;justify-content:flex-end;font-size:12.5px;white-space:nowrap}
    .bi-lr{display:grid;grid-template-columns:82px 1fr 128px;gap:10px;align-items:center;padding:6px 0;font-size:13px}
    .bi-lr .b{height:9px;border-radius:5px;background:var(--surface-3);overflow:hidden}.bi-lr .b i{display:block;height:100%;border-radius:5px}
    .bi-lr .v{text-align:right;white-space:nowrap;font-size:12.5px}
    button.stat.bi-st{display:flex;flex-direction:column;justify-content:flex-start;align-items:flex-start}
    .bi-leg{display:flex;gap:16px;font-size:12.5px;color:var(--ink-3);flex-wrap:wrap}
    .bi-leg i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px;vertical-align:-1px}
    .bi-heat{border-collapse:separate;border-spacing:3px;width:100%;font-size:12.5px}
    .bi-heat th{font-weight:650;color:var(--ink-3);font-size:11.5px;padding:4px 5px;text-align:center}
    .bi-heat th.l{text-align:left;color:var(--ink-2);font-size:12.5px}
    .bi-heat td{text-align:center;padding:9px 4px;border-radius:7px;font-family:"IBM Plex Mono",monospace;font-weight:600}
    .bi-note{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:10px;font-size:13px;line-height:1.55;background:var(--accent-soft);color:var(--ink-2)}
    .bi-note.warn{background:var(--warn-soft)}.bi-note.crit{background:var(--crit-soft)}.bi-note.ok{background:var(--ok-soft)}
    .bi-note .ic{flex:none;margin-top:2px}
    .bi-steps{display:flex;gap:8px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-3)}
    .bi-steps b{color:var(--ink)}
    .bi-skel{height:12px;border-radius:6px;background:linear-gradient(90deg,var(--surface-3),var(--surface-2),var(--surface-3));background-size:200% 100%}
    @media (prefers-reduced-motion:no-preference){.bi-skel{animation:biskel 1.2s linear infinite}@keyframes biskel{to{background-position:-200% 0}}}
    /* modo pantalla de oficina */
    #biTV{position:fixed;inset:0;z-index:90;background:#0e1411;color:#eef3ef;display:flex;flex-direction:column;padding:22px 28px;gap:16px;font-family:inherit;cursor:default}
    #biTV.quiet{cursor:none}
    #biTV .tv-top{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
    #biTV .tv-top h2{font-size:22px;color:#eef3ef}
    #biTV .tv-sub{color:#9db0a5;font-size:14px}
    #biTV .tv-btn{border:1px solid #2c3a32;background:#17201b;color:#eef3ef;border-radius:10px;padding:9px 14px;font-weight:650;font-size:14px;cursor:pointer}
    #biTV .tv-btn:hover{border-color:#57c98a}
    #biTV .tv-grid{flex:1;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;gap:16px;min-height:0}
    #biTV .tv-t{background:#17201b;border:1px solid #23302a;border-radius:16px;padding:20px 22px;display:flex;flex-direction:column;gap:6px;min-height:0;overflow:hidden}
    #biTV .tv-l{font-size:14px;color:#9db0a5;font-weight:650;letter-spacing:.03em;text-transform:uppercase}
    #biTV .tv-v{font-family:"IBM Plex Mono",monospace;font-weight:700;font-size:clamp(28px,3.5vw,54px);line-height:1.05;white-space:nowrap;color:#eef3ef}
    #biTV .tv-d{font-size:15px;color:#9db0a5}
    #biTV .up{color:#57c98a}#biTV .down{color:#ff8a7a}
    #biTV .tv-bar{height:12px;border-radius:7px;background:#23302a;overflow:hidden}
    #biTV .tv-bar i{display:block;height:100%;background:#57c98a}
    #biTV .tv-row{display:grid;grid-template-columns:110px 1fr 120px;gap:10px;align-items:center;font-size:15px}
    #biTV .tv-band{display:flex;gap:14px;align-items:center;background:#3a1f1b;border:1px solid #7a3a30;border-radius:12px;padding:12px 16px;font-size:16px}
    #biTV .tv-band.ok{background:#16281e;border-color:#2d5a3e}
    #biTV .tv-dots{display:flex;gap:7px}
    #biTV .tv-dots i{width:9px;height:9px;border-radius:50%;background:#2c3a32}
    #biTV .tv-dots i.on{background:#57c98a}
    @media (max-width:900px){#biTV .tv-grid{grid-template-columns:1fr;grid-template-rows:none;overflow:auto}}
    `;
    document.head.appendChild(st);
  })();

  /* ── gráficos propios: barras agrupadas y líneas de dos series ── */
  function gbars(rows, fmt, la, lb) {
    const max = Math.max.apply(
      null,
      rows.map((r) => Math.max(r.a, r.b)).concat([1]),
    );
    return `<div class="bi-leg" style="margin-bottom:12px"><span><i style="background:var(--accent)"></i>${esc(la)}</span><span><i style="background:var(--ink-4)"></i>${esc(lb)}</span></div>
      <div class="bi-gb">${rows
        .map(
          (r) => `<div class="r"><div class="n">${esc(r.n)}</div>
        <div><div class="b" title="${esc(la)}"><i style="width:${Math.max(2, (r.a / max) * 100).toFixed(1)}%;background:var(--accent)"></i></div>
             <div class="b" title="${esc(lb)}"><i style="width:${Math.max(2, (r.b / max) * 100).toFixed(1)}%;background:var(--ink-4)"></i></div></div>
        <div class="v"><span class="num">${fmt(r.a)}</span>${tagVar(r.d, r.unit, r.inv)}</div></div>`,
        )
        .join("")}</div>`;
  }
  function multiLine(series, labels, W, H, alt) {
    W = W || 600;
    H = H || 190;
    const all = [];
    series.forEach((s) =>
      s.vals.forEach((v) => {
        if (v != null) all.push(v);
      }),
    );
    const max = Math.max.apply(null, all.concat([1])) * 1.1;
    const n = labels.length,
      pl = 44,
      pr = 12,
      pt = 10,
      pb = 24;
    const x = (i) => pl + (i / Math.max(1, n - 1)) * (W - pl - pr);
    const y = (v) => H - pb - (v / max) * (H - pt - pb);
    let g = "";
    for (let k = 0; k <= 3; k++) {
      const v = ((max * k) / 3 / 1.1) * 1.1,
        yy = y(v);
      g += `<line x1="${pl}" x2="${W - pr}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="var(--hair-2)"/><text x="${pl - 6}" y="${(yy + 3.5).toFixed(1)}" font-size="10" fill="var(--ink-4)" text-anchor="end" font-family="IBM Plex Mono, monospace">${dec(v / 1e6, v >= 1e7 ? 0 : 1)}</text>`;
    }
    const paths = series
      .map((s) => {
        let d = "",
          pen = false;
        s.vals.forEach((v, i) => {
          if (v == null) {
            pen = false;
            return;
          }
          d +=
            (pen ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1) + " ";
          pen = true;
        });
        const last = s.vals
          .map((v, i) => (v == null ? -1 : i))
          .reduce((a, b) => Math.max(a, b), -1);
        const dot =
          last >= 0
            ? `<circle cx="${x(last).toFixed(1)}" cy="${y(s.vals[last]).toFixed(1)}" r="4" fill="${s.col}"/>`
            : "";
        return `<path d="${d}" fill="none" stroke="${s.col}" stroke-width="${s.w || 2.3}" ${s.dash ? 'stroke-dasharray="5 4"' : ""} stroke-linecap="round" stroke-linejoin="round"/>${dot}`;
      })
      .join("");
    const step = Math.ceil(n / 12);
    const labs = labels
      .map((l, i) =>
        i % step
          ? ""
          : `<text x="${x(i).toFixed(1)}" y="${H - 6}" font-size="10.5" fill="var(--ink-4)" text-anchor="middle" font-family="IBM Plex Mono, monospace">${esc(l)}</text>`,
      )
      .join("");
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block" role="img" aria-label="${esc(alt || "Comparativo")}">${g}${paths}${labs}</svg>`;
  }
  const legend = (ss) =>
    `<div class="bi-leg" style="margin-bottom:6px">${ss.map((s) => `<span><i style="background:${s.col}"></i>${esc(s.name)}</span>`).join("")}</div>`;

  /* alertas (las usa el tablero y la pantalla Alertas de la parte 2) */
  const artFon = D.articulos.find((a) => a.fam === "FON") || D.articulos[0];
  BI.ALERTAS = [
    {
      id: "A1",
      sev: "crit",
      ev: "Cambio de costo fuera de rango",
      t: "Costo de «" + artFon.desc + "» pasó de ₡4 100 a ₡41 (−99 %)",
      d: "Se digitó en la compra OC-2026-004412. Con ese costo el artículo se vendería por debajo de lo que costó traerlo.",
      loc: "Proveeduría",
      quien: "Compras",
      hace: "hace 6 min",
      est: "Nueva",
      accion: "Revisar costo",
      ir: "ordenes",
    },
    {
      id: "A2",
      sev: "crit",
      ev: "Venta bajo costo sin reversar",
      t: "Autorización de venta bajo costo activa desde las 07:52 en Pacayas, terminal 2",
      d: "Ya se emitieron 3 facturas con −34 % de utilidad. La casilla no se ha desactivado.",
      loc: "Pacayas",
      quien: "Jefe de local",
      hace: "hace 3 h",
      est: "Nueva",
      accion: "Reversar casilla",
      ir: "documentos",
    },
    {
      id: "A3",
      sev: "crit",
      ev: "Fallo de envío a Hacienda",
      t: "2 comprobantes rechazados: código CABYS no válido",
      d: "FE-00100003010000012845 y FE-00100003010000012851. Se pueden corregir y reenviar; el cliente aún no tiene su factura.",
      loc: "El Centro",
      quien: "Contabilidad · TI",
      hace: "hace 14 min",
      est: "En atención",
      accion: "Corregir y reenviar",
      ir: "fel-emitidos",
    },
    {
      id: "A4",
      sev: "warn",
      ev: "Casilla sin reversar",
      t: "Casilla de precio manual abierta hace 18 min en Cervantes",
      d: "El turno no ha cerrado; pasado el tope de 15 minutos se avisa al jefe de local.",
      loc: "Cervantes",
      quien: "Jefe de local",
      hace: "hace 18 min",
      est: "Nueva",
      accion: "Recordar al cajero",
      ir: null,
    },
    {
      id: "A5",
      sev: "warn",
      ev: "Fallo de envío a Hacienda",
      t: "7 comprobantes en cola de contingencia hace más de 10 min",
      d: "El enlace de Tucurrique estuvo caído; se reenviarán solos al volver, pero conviene confirmarlo.",
      loc: "Tucurrique",
      quien: "TI",
      hace: "hace 22 min",
      est: "Nueva",
      accion: "Ver cola",
      ir: "fel-emitidos",
    },
  ];
  BI.RESUELTAS = [
    {
      sev: "crit",
      ev: "Venta bajo costo sin reversar",
      t: "Casilla activa 2 h en Turrialba",
      quien: "Marta Rojas",
      cuando: "Ayer 16:40",
      dur: "11 min",
      nota: "Se reversó y se anuló una factura del cliente.",
    },
    {
      sev: "warn",
      ev: "Cambio de costo fuera de rango",
      t: "Cemento gris 50 kg: +38 % contra la última compra",
      quien: "Compras",
      cuando: "Ayer 10:05",
      dur: "40 min",
      nota: "El proveedor subió el precio; se confirmó y se ajustó la lista.",
    },
    {
      sev: "crit",
      ev: "Fallo de envío a Hacienda",
      t: "Factura rechazada por cédula del receptor",
      quien: "Contabilidad",
      cuando: "Lun 08:15",
      dur: "6 min",
      nota: "Cédula corregida y reenviada; aceptada.",
    },
    {
      sev: "warn",
      ev: "Casilla sin reversar",
      t: "Precio manual abierto al cierre del turno",
      quien: "Diego Solano",
      cuando: "Dom 19:02",
      dur: "3 min",
      nota: "Se cerró el turno con la casilla reversada.",
    },
  ];

  /* ═══════════════════════════════════════════════════════════════
     CÓMO VAMOS HOY — tablero de gerencia (REP-001, REP-006)
     ═══════════════════════════════════════════════════════════════ */
  const T = {
    per: "Hoy",
    tv: false,
    paused: false,
    view: 0,
    cnt: 30,
    last: Date.now(),
    tick: 0,
    extra: 0,
    docs: 0,
    timer: null,
  };
  const HORAS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  const PESO_H = [4, 7, 9, 10, 9, 8, 6, 7, 8, 8, 6, 3];

  function snap() {
    const hoyDocs = D.ventasDelDia();
    const totHoy = suma(hoyDocs, (d) => d.total) + T.extra;
    const nHoy = hoyDocs.length + T.docs;
    const costo = suma(hoyDocs, (d) => d.costo),
      grav = suma(hoyDocs, (d) => d.grav);
    const margenHoy = grav ? ((grav - costo) / grav) * 100 : 27.4;
    const tiqHoy = nHoy ? totHoy / nHoy : 38000;
    const semana = suma(SERIE, (x) => x.total) + T.extra;
    const mtd = BASE_DIA * 12 + totHoy;
    const meta = BASE_DIA * 30 * 1.06;
    const P = T.per;
    let venta, prev, docs, margen, etiqueta;
    if (P === "Hoy") {
      venta = totHoy;
      prev = SERIE[0].total || BASE_DIA;
      docs = nHoy;
      margen = margenHoy;
      etiqueta = "mismo día de la semana pasada";
    } else if (P === "Semana") {
      venta = semana;
      prev = semana / jit("sem", 1.02, 1.09);
      docs = Math.round(venta / tiqHoy);
      margen = margenHoy + 0.3;
      etiqueta = "semana anterior";
    } else {
      venta = mtd;
      prev = mtd / jit("mes", 1.03, 1.1);
      docs = Math.round((venta / tiqHoy) * 0.98);
      margen = margenHoy - 0.2;
      etiqueta = "mismo corte del mes anterior";
    }
    const fac = P === "Hoy" ? 1 : venta / (totHoy || 1);
    const locs = D.ventaPorLocal()
      .map((x) => ({
        loc: x.loc,
        total:
          P === "Hoy"
            ? x.total + (x.loc.id === "L2" ? T.extra : 0)
            : mtd * (P === "Semana" ? semana / mtd : 1) * LW[x.loc.id],
        m: jit("ml" + x.loc.id, 23, 32),
      }))
      .sort((a, b) => b.total - a.total);
    return {
      totHoy,
      nHoy,
      semana,
      mtd,
      meta,
      venta,
      prev,
      docs,
      margen,
      margenHoy,
      etiqueta,
      tiq: venta / (docs || 1),
      varia: ((venta - prev) / prev) * 100,
      locs,
      fac,
    };
  }

  function curvaHoy(s) {
    const hAct = D.HOY.getHours(); // 11
    const tot = PESO_H.reduce((a, b) => a + b, 0);
    let acc = 0;
    const hoy = [],
      ant = [];
    let accA = 0;
    const totAnt = s.totHoy * 0.4 + BASE_DIA * 0.62 * 0.9; // día completo del año anterior
    const cum = PESO_H.map((p, i) => (acc += p) / tot);
    const parcial = cum[hAct - 7] || 0.5;
    HORAS.forEach((h, i) => {
      hoy.push(h <= hAct ? s.totHoy * (cum[i] / parcial) : null);
      accA += PESO_H[i];
      ant.push(totAnt * (accA / tot) * jit("aa" + i, 0.97, 1.03));
    });
    return { hoy, ant, lab: HORAS.map((h) => h + ":00") };
  }

  function stripHTML() {
    const seg1 = seg("biPer", ["Hoy", "Semana", "Mes"], T.per);
    const seg_ = Math.max(0, T.cnt);
    return `<div class="bi-strip"><div class="grp">
        <span class="bi-live" role="status"><span class="bi-dot ${T.paused ? "off" : "on"}"></span><span>${T.paused ? "Actualización en pausa" : "En vivo"}</span><span class="mut">· actualizado <b class="bi-ago">hace ${Math.max(0, Math.round((Date.now() - T.last) / 1000))} s</b></span></span>
        <span class="mut" style="font-size:12.5px">Próxima actualización en <b class="num bi-cnt">0:${String(seg_).padStart(2, "0")}</b></span>
        <button class="btn sm" id="biPause" aria-pressed="${T.paused}">${T.paused ? "Reanudar" : "Pausar"}</button></div>
      <div class="grp">${seg1}<button class="btn" id="biTVon">${icon("eye")}Pantalla de oficina</button></div></div>`;
  }

  function cuerpoHoy() {
    const s = snap();
    const P = T.per;
    const curva = curvaHoy(s);
    const famM = D.margenPorFamilia();
    const qb = D.quiebres();
    const nQ = qb.filter((q) => q.tipo === "Quiebre").length,
      nB = qb.filter((q) => q.tipo === "Bajo mínimo").length;
    let pares = 0;
    D.articulos.forEach(
      (a) => (pares += Object.keys(D.existencias[a.id] || {}).length),
    );
    const salud = pares ? Math.round(((pares - qb.length) / pares) * 100) : 100;
    const maxL = Math.max.apply(null, s.locs.map((x) => x.total).concat([1]));
    const pend = BI.ALERTAS.filter((a) => a.est !== "Resuelta");
    const criticas = pend.filter((a) => a.sev === "crit").length;
    const avance = (s.mtd / s.meta) * 100;
    const ritmo = (s.meta - s.mtd) / 17;
    const lab =
      P === "Hoy"
        ? "Venta de hoy"
        : P === "Semana"
          ? "Venta de la semana"
          : "Venta del mes";
    const mesTag = (d) => tagVar(d);
    const ventaMes = P === "Mes" ? s.venta : s.mtd;
    const serieChart =
      P === "Hoy"
        ? legend([
            { name: "Hoy, acumulado", col: "var(--accent)" },
            { name: "Mismo día del año pasado", col: "var(--ink-4)" },
          ]) +
          multiLine(
            [
              {
                name: "Año pasado",
                vals: curva.ant,
                col: "var(--ink-4)",
                dash: true,
                w: 2,
              },
              { name: "Hoy", vals: curva.hoy, col: "var(--accent)" },
            ],
            curva.lab,
            600,
            200,
            "Venta acumulada por hora, hoy contra el mismo día del año pasado",
          )
        : (() => {
            const vals =
              P === "Semana"
                ? SERIE.map((x) => x.total)
                : Array.from({ length: 13 }, (_, i) =>
                    i === 12 ? s.totHoy : BASE_DIA * jit("d" + i, 0.82, 1.18),
                  );
            const prv = vals.map((v, i) => v / jit("pv" + P + i, 1.0, 1.14));
            const labs =
              P === "Semana"
                ? SERIE.map((x, i) => (i === 6 ? "hoy" : fecha(x.fecha)))
                : vals.map((_, i) => String(i + 1));
            return (
              legend([
                {
                  name: P === "Semana" ? "Últimos 7 días" : "Días del mes",
                  col: "var(--accent)",
                },
                { name: "Período anterior", col: "var(--ink-4)" },
              ]) +
              multiLine(
                [
                  {
                    name: "Anterior",
                    vals: prv,
                    col: "var(--ink-4)",
                    dash: true,
                    w: 2,
                  },
                  { name: "Actual", vals, col: "var(--accent)" },
                ],
                labs,
                600,
                200,
                "Venta diaria del período contra el período anterior",
              )
            );
          })();

    const st = (l, v, sub, ir, tint) =>
      `<button class="stat bi-st" data-ir="${ir}" style="--tint:${tint || "var(--accent)"};text-align:left;cursor:pointer;width:100%" aria-label="${esc(l)}: abrir el reporte"><div class="sv">${v}</div><div class="sl">${esc(l)}</div><div class="sd">${sub}</div></button>`;

    return `
    <div class="grid g4">
      ${st(lab, `<span class="bi-flash">${c(s.venta)}</span>`, `${sgn(s.varia)} contra ${esc(s.etiqueta)}`, "reportes|ventas")}
      ${st("Venta del mes", `<span class="bi-flash">${mill(ventaMes)}</span>`, `${dec(avance, 0)} % de la meta de ${mill(s.meta)}<div style="margin-top:6px">${prog([{ w: Math.min(100, avance), col: avance >= 60 ? "var(--ok)" : "var(--warn)" }])}</div>`, "reportes|ventas", "var(--ok)")}
      ${st("Tiquete promedio", `<span class="bi-flash">${c(s.tiq)}</span>`, `${grp(s.docs)} documentos de venta`, "reportes|ventas")}
      ${st("Margen bruto", `<span class="bi-flash">${dec(s.margen)} %</span>`, `<span style="color:${s.margen >= 18 ? "var(--ok)" : "var(--crit)"}">${s.margen >= 18 ? "Sobre" : "Bajo"} el mínimo global de 18 %</span> · sobre venta neta sin IVA`, "reportes|margen", s.margen >= 18 ? "var(--ok)" : "var(--crit)")}
    </div>
    <div class="grid" style="grid-template-columns:repeat(4,1fr);gap:10px">
      ${[
        [
          "Ventas perdidas de hoy",
          c(nQ * 41800 + 236000),
          nQ + " quiebres + 2 proformas vencidas",
          "reportes|perdidas",
          "warn",
        ],
        [
          "Cartera vencida",
          "14,2 %",
          "₡41,3 M de ₡291 M · " + tag("Atención", "warn", "alert"),
          "reportes|antig",
          "warn",
        ],
        [
          "Comprobantes con problema",
          "2 rechazados",
          "7 en cola de contingencia",
          "sis-alertas",
          "crit",
        ],
        [
          "Alertas abiertas",
          String(pend.length),
          criticas + " críticas · " + tag("Requiere acción", "crit", "bell"),
          "sis-alertas",
          "crit",
        ],
      ]
        .map(
          (x) =>
            `<button class="bi-mini" data-ir="${x[3]}"><span class="mut" style="font-size:12px;font-weight:650">${esc(x[0])}</span><span class="num" style="font-size:19px;font-weight:700">${x[1]}</span><span class="mut" style="font-size:12px">${x[2]}</span></button>`,
        )
        .join("")}
    </div>
    <div class="grid" style="grid-template-columns:1.6fr 1fr;align-items:start">
      ${card({ title: P === "Hoy" ? "Venta acumulada por hora" : P === "Semana" ? "Venta de los últimos 7 días" : "Venta día a día del mes", hint: "₡ millones", body: serieChart })}
      ${card({
        title: "Los 7 locales",
        hint: P.toLowerCase() + " · venta y margen",
        body:
          s.locs
            .map(
              (x) =>
                `<div class="bi-lr"><div class="n">${esc(x.loc.nom)}</div><div class="b"><i style="width:${Math.max(2, (x.total / maxL) * 100).toFixed(1)}%;background:${x.m < 24 ? "var(--warn)" : "var(--accent)"}"></i></div><div class="v"><b class="num">${grp(x.total)}</b> <span class="mut num">${dec(x.m)} %</span></div></div>`,
            )
            .join("") +
          `<div class="mut" style="font-size:12px;margin-top:8px">Barra ámbar: margen por debajo de 24 %.</div>`,
      })}
    </div>
    <div class="grid g3" style="align-items:start">
      ${card({
        title: "Margen por familia",
        hint: "contra el mínimo de cada una",
        body: famM
          .slice(0, 7)
          .map((x) =>
            barRow(
              x.fam.nom,
              x.margen,
              40,
              `${dec(x.margen)} %${x.margen < x.fam.min ? ` <span style="color:var(--crit)">· bajo ${x.fam.min}</span>` : ""}`,
              x.margen < x.fam.min ? "var(--crit)" : "var(--accent)",
            ),
          )
          .join(""),
      })}
      ${card({
        title: "Semáforo de inventario",
        hint: "cobertura = existencia ÷ venta diaria",
        body: `
        <div style="display:flex;gap:16px;align-items:center;margin-bottom:12px">${donut(salud, 78, salud > 70 ? "var(--ok)" : "var(--warn)")}<div style="font-size:13px;color:var(--ink-2);line-height:1.55">${salud} % de artículos por local dentro de su rango sano</div></div>
        <div class="reclist">
          <div class="rec"><div style="flex:1"><b style="font-size:13.5px">Crítico</b> <span class="mut" style="font-size:12px">menos de 7 días</span></div>${tag(nQ + " artículos", "crit", "alert")}</div>
          <div class="rec"><div style="flex:1"><b style="font-size:13.5px">Atención</b> <span class="mut" style="font-size:12px">de 7 a 15 días</span></div>${tag(nB + " artículos", "warn", "alert")}</div>
          <div class="rec"><div style="flex:1"><b style="font-size:13.5px">Normal</b> <span class="mut" style="font-size:12px">de 15 a 60 días</span></div>${tag("Sano", "ok", "check")}</div>
          <div class="rec"><div style="flex:1"><b style="font-size:13.5px">Sobrestock</b> <span class="mut" style="font-size:12px">más de 60 días</span></div>${tag("38 artículos", "acc", "layers")}</div>
        </div>`,
      })}
      ${card({
        title: "Alertas recientes",
        hint: "eventos críticos",
        actions: `<button class="btn sm" data-ir="sis-alertas">Ver todas</button>`,
        body: `<div class="reclist">${pend
          .slice(0, 3)
          .map(
            (a) =>
              `<button class="rec" data-ir="sis-alertas" style="text-align:left;width:100%"><div style="flex:1;min-width:0"><div class="b" style="font-size:13.5px">${esc(a.ev)}</div><div class="mut" style="font-size:12.5px">${esc(a.loc)} · ${esc(a.hace)}</div></div>${tag(a.sev === "crit" ? "Crítica" : "Atención", a.sev === "crit" ? "crit" : "warn", "alert")}</button>`,
          )
          .join("")}</div><div class="mut" style="font-size:12.5px;margin-top:12px;display:flex;gap:7px;align-items:center">${icon("info", 'style="width:15px;height:15px"')}<span>Las alertas se atienden y se configuran en <button type="button" class="linkbtn" data-ir="sis-alertas|avisa" style="background:none;border:0;padding:0;color:var(--accent);cursor:pointer;font:inherit;text-decoration:underline">Sistema › Notificaciones y alertas</button>.</span></div>`,
      })}
    </div>
    <div class="mut" style="font-size:12.5px;display:flex;gap:7px;align-items:center">${icon("info", 'style="width:15px;height:15px"')}Cada cifra abre el reporte que la explica. Todo lo de esta pantalla se lee de la réplica de lectura: refrescar no le cuesta nada a la caja.</div>`;
  }

  /* ── modo pantalla de oficina ── */
  function tvHTML() {
    const s = snap();
    const P = T.per;
    const now = new Date(
      D.HOY.getTime() + (Date.now() - T.last) + T.tick * 30000,
    );
    const pend = BI.ALERTAS.filter(
      (a) => a.est !== "Resuelta" && a.sev === "crit",
    );
    const qb = D.quiebres();
    const nQ = qb.filter((q) => q.tipo === "Quiebre").length,
      nB = qb.filter((q) => q.tipo === "Bajo mínimo").length;
    const maxL = Math.max.apply(null, s.locs.map((x) => x.total).concat([1]));
    const avance = (s.mtd / s.meta) * 100;
    const tile = (l, v, d, extra) =>
      `<div class="tv-t"><div class="tv-l">${esc(l)}</div><div class="tv-v">${v}</div><div class="tv-d">${d || ""}</div>${extra || ""}</div>`;
    const v0 = `
      ${tile("Venta de hoy", c(s.totHoy), `<span class="${s.totHoy >= (SERIE[0].total || 0) ? "up" : "down"}">${sgn(((s.totHoy - (SERIE[0].total || 1)) / (SERIE[0].total || 1)) * 100)}</span> contra el mismo día de la semana pasada`)}
      ${tile("Venta del mes", mill(s.mtd), `${dec(avance, 0)} % de la meta de ${mill(s.meta)}`, `<div class="tv-bar" style="margin-top:10px"><i style="width:${Math.min(100, avance)}%"></i></div>`)}
      ${tile("Tiquete promedio", c(s.nHoy ? s.totHoy / s.nHoy : 0), s.nHoy + " documentos hoy")}
      ${tile("Margen bruto", dec(s.margenHoy) + " %", `<span class="${s.margenHoy >= 18 ? "up" : "down"}">${s.margenHoy >= 18 ? "Sobre" : "Bajo"} el mínimo de 18 %</span>`)}
      <div class="tv-t" style="grid-column:span 2"><div class="tv-l">Los 7 locales · venta de hoy</div>${s.locs.map((x) => `<div class="tv-row"><span>${esc(x.loc.nom)}</span><div class="tv-bar"><i style="width:${((x.total / maxL) * 100).toFixed(0)}%;${x.m < 24 ? "background:#f5b94a" : ""}"></i></div><span style="text-align:right;font-family:'IBM Plex Mono',monospace">${grp(x.total)}</span></div>`).join("")}</div>`;
    const v1 = `
      ${tile("Artículos en quiebre", String(nQ), "Crítico · menos de 7 días de cobertura")}
      ${tile("Bajo el mínimo", String(nB), "Atención · de 7 a 15 días")}
      ${tile("Sobrestock", "38", "Más de 60 días de cobertura")}
      ${tile("Comprobantes a Hacienda", "2 rechazados", "7 en cola de contingencia · 94 aceptados hoy")}
      ${tile("Cartera vencida", "14,2 %", "₡41,3 M de ₡291 M")}
      ${tile("Ventas perdidas de hoy", c(nQ * 41800 + 236000), "Quiebres y proformas vencidas")}`;
    return `<div class="tv-top"><div><h2>ServeCore · Ferretería Santa Rosa</h2><div class="tv-sub">${esc(U.fechaLarga(D.HOY))} · ${hora(now)} · ${T.view === 0 ? "Ventas y márgenes" : "Inventario y control"}</div></div>
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><span class="tv-sub">Próxima actualización en <b class="bi-cnt" style="color:#eef3ef">0:${String(Math.max(0, T.cnt)).padStart(2, "0")}</b></span>
        <div class="tv-dots"><i class="${T.view === 0 ? "on" : ""}"></i><i class="${T.view === 1 ? "on" : ""}"></i></div>
        <button class="tv-btn" id="tvPause">${T.paused ? "Reanudar" : "Pausar"}</button><button class="tv-btn" id="tvExit">Salir (Esc)</button></div></div>
      <div class="tv-grid">${T.view === 0 ? v0 : v1}</div>
      ${pend.length ? `<div class="tv-band"><span style="color:#ff8a7a;display:flex">${icon("alert")}</span><b>${pend.length} alertas críticas:</b> ${esc(pend.map((a) => a.ev + " (" + a.loc + ")").join(" · "))}</div>` : `<div class="tv-band ok">Sin alertas críticas</div>`}`;
  }
  function tvPinta() {
    const el = $("#biTV");
    if (!el) return;
    el.innerHTML = tvHTML();
    $("#tvExit", el).addEventListener("click", tvOff);
    $("#tvPause", el).addEventListener("click", () => {
      T.paused = !T.paused;
      tvPinta();
    });
  }
  let quietT = null;
  function tvOn() {
    T.tv = true;
    T.view = 0;
    T.cnt = 30;
    const el = document.createElement("div");
    el.id = "biTV";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Tablero en pantalla de oficina");
    document.body.appendChild(el);
    tvPinta();
    el.addEventListener("mousemove", () => {
      el.classList.remove("quiet");
      clearTimeout(quietT);
      quietT = setTimeout(() => el.classList.add("quiet"), 5000);
    });
    quietT = setTimeout(() => el.classList.add("quiet"), 5000);
    arranca();
  }
  function tvOff() {
    T.tv = false;
    const el = $("#biTV");
    if (el) el.remove();
    clearTimeout(quietT);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && T.tv) tvOff();
  });

  function refrescaVivo() {
    T.tick++;
    T.last = Date.now();
    T.cnt = 30;
    const add = Math.round(jit("t" + T.tick, 45000, 260000) / 1000) * 1000;
    T.extra += add;
    T.docs += 1 + (T.tick % 3);
    if (T.tv && T.tick % 2 === 0) T.view = 1 - T.view;
    const b = $("#biBody");
    if (b) {
      b.innerHTML = cuerpoHoy();
      cablea(b);
    }
    if (T.tv) tvPinta();
  }
  function tickSeg() {
    const hay = $("#biBody") || $("#biTV");
    if (!hay || (S.screen !== "bi-hoy" && !T.tv)) {
      clearInterval(T.timer);
      T.timer = null;
      if (S.screen !== "bi-hoy") tvOff();
      return;
    }
    if (!T.paused) {
      T.cnt--;
      if (T.cnt <= 0) refrescaVivo();
    }
    $$(".bi-cnt").forEach(
      (e) =>
        (e.textContent = "0:" + String(Math.max(0, T.cnt)).padStart(2, "0")),
    );
    $$(".bi-ago").forEach(
      (e) =>
        (e.textContent =
          "hace " + Math.round((Date.now() - T.last) / 1000) + " s"),
    );
  }
  function arranca() {
    if (!T.timer) T.timer = setInterval(tickSeg, 1000);
  }

  function cablea(root) {
    A.wireIr(root);
  }

  A.screen("bi-hoy", {
    title: "Cómo vamos hoy",
    sub: () =>
      "Ventas, margen e inventario de los 7 locales, con refresco automático · " +
      U.fechaLarga(D.HOY),
    render(v) {
      v.innerHTML = `<div class="wrap"><div id="biStrip">${stripHTML()}</div><div id="biBody" class="wrap">${cuerpoHoy()}</div></div>`;
    },
    wire(v) {
      cablea(v);
      wireStrip(v);
      arranca();
    },
  });
  function wireStrip(v) {
    $("#biTVon", v).addEventListener("click", tvOn);
    $("#biPause", v).addEventListener("click", () => {
      T.paused = !T.paused;
      $("#biStrip").innerHTML = stripHTML();
      wireStrip(v);
    });
    onSeg(v, "biPer", (p) => {
      T.per = p;
      const b = $("#biBody");
      b.innerHTML = cuerpoHoy();
      cablea(b);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     COMPARAR — años, locales, vendedores y familias (REP-002)
     ═══════════════════════════════════════════════════════════════ */
  const MESES = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Oct",
    "Nov",
    "Dic",
  ];
  const EST = [
    0.92, 0.88, 0.96, 0.94, 1.0, 1.02, 1.06, 1.04, 1.0, 1.03, 1.1, 1.28,
  ];
  const CREC = { 2026: 1, 2025: 0.93, 2024: 0.87 };
  const serieMes = (anio) =>
    EST.map(
      (e, i) =>
        BASE_DIA * 30 * e * CREC[anio] * jit("m" + anio + i, 0.97, 1.03),
    );
  const SEP = 13 / 30;
  function totPeriodo(anio, per) {
    const m = serieMes(anio);
    if (per === "Este mes") return m[8] * SEP;
    if (per === "Último trimestre") return m[6] + m[7] + m[8] * SEP;
    return suma(m.slice(0, 8)) + m[8] * SEP;
  }
  const CMP = {
    met: "Ventas",
    per: "Año en curso",
    vs: "Año anterior",
    dim: "Local",
    vista: "Barras agrupadas",
  };
  const norma = (ns, seed) => {
    const w = ns.map((n) => jit(seed + n, 0.6, 1.5));
    const t = suma(w);
    return w.map((x) => x / t);
  };

  function filasCmp() {
    const anioVs = CMP.vs === "Hace dos años" ? 2024 : 2025;
    const T1 = totPeriodo(2026, CMP.per);
    const T0 =
      CMP.vs === "Período anterior"
        ? T1 / jit("pa" + CMP.per, 1.02, 1.07)
        : totPeriodo(anioVs, CMP.per);
    let names, w;
    if (CMP.dim === "Local") {
      names = D.tiendas.map((l) => l.nom);
      w = D.tiendas.map((l) => LW[l.id]);
    } else if (CMP.dim === "Vendedor") {
      names = VEND.slice();
      w = norma(names, "vw");
    } else if (CMP.dim === "Familia") {
      names = FAMS.map((f) => f.nom);
      w = norma(names, "fw");
    } else {
      names = MESES.slice(0, 9);
      w = null;
    }
    return names.map((n, i) => {
      let base1, base0;
      if (w) {
        const g = jit("g" + CMP.dim + n + CMP.vs, 0.9, 1.16);
        base1 = T1 * w[i];
        base0 = ((T0 * w[i]) / g) * (i % 2 ? 1 : 1);
      } else {
        base1 = serieMes(2026)[i] * (i === 8 ? SEP : 1);
        base0 = serieMes(anioVs)[i] * (i === 8 ? SEP : 1);
      }
      let a,
        b,
        unit = "%";
      if (CMP.met === "Ventas") {
        a = base1;
        b = base0;
      } else if (CMP.met === "Margen bruto") {
        a = jit("mg" + n, 22, 33);
        b = a - jit("mgd" + n, -2.6, 3.2);
        unit = "pp";
      } else if (CMP.met === "Tiquete promedio") {
        a = TIQ * jit("tq" + n, 0.8, 1.2);
        b = a / jit("tqd" + n, 0.93, 1.1);
      } else {
        a = base1 / jit("un" + n, 3600, 5200);
        b = base0 / jit("un" + n, 3600, 5200);
      }
      const d = unit === "pp" ? a - b : b ? ((a - b) / b) * 100 : 0;
      return { n, a, b, d, unit };
    });
  }
  const fmtCmp = () =>
    CMP.met === "Ventas"
      ? (v) => mill(v)
      : CMP.met === "Margen bruto"
        ? (v) => dec(v) + " %"
        : CMP.met === "Tiquete promedio"
          ? (v) => c(v)
          : (v) => grp(v);
  const anioEt = () =>
    CMP.vs === "Hace dos años"
      ? "2024"
      : CMP.vs === "Año anterior"
        ? "2025"
        : "Período anterior";

  function selectIn(id, opts, cur) {
    return `<select id="${id}" aria-label="${esc(id)}">${opts.map((o) => `<option ${o === cur ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
  }

  function cuerpoCmp() {
    const rows = filasCmp(),
      f = fmtCmp();
    const sorted = rows.slice().sort((x, y) => y.d - x.d);
    const best = sorted[0],
      worst = sorted[sorted.length - 1];
    const tot = suma(rows, (r) => r.a),
      tot0 = suma(rows, (r) => r.b);
    const top = rows.slice().sort((x, y) => y.a - x.a)[0];
    const dTot =
      CMP.met === "Margen bruto"
        ? suma(rows, (r) => r.d) / rows.length
        : ((tot - tot0) / tot0) * 100;
    const unit = CMP.met === "Margen bruto" ? "pp" : "%";
    let chart;
    if (CMP.vista === "Evolución mensual") {
      const a = serieMes(2026).map((v, i) =>
        i > 8 ? null : v * (i === 8 ? SEP : 1),
      );
      const anioVs = CMP.vs === "Hace dos años" ? 2024 : 2025;
      const b = serieMes(anioVs).map((v, i) => v * (i === 8 ? SEP : 1));
      chart =
        legend([
          { name: "2026", col: "var(--accent)" },
          { name: anioEt(), col: "var(--ink-4)" },
        ]) +
        multiLine(
          [
            { vals: b, col: "var(--ink-4)", dash: true, w: 2 },
            { vals: a, col: "var(--accent)" },
          ],
          MESES,
          640,
          230,
          "Venta mensual de 2026 contra " + anioEt(),
        );
    } else chart = gbars(rows, f, "2026", anioEt());
    const hall = [
      [
        "arrowup",
        "ok",
        best.n + " creció más",
        `${sgn(best.d, best.unit)} contra ${anioEt()}: de ${f(best.b)} a ${f(best.a)}.`,
      ],
      [
        "arrowdown",
        worst.d < 0 ? "crit" : "warn",
        worst.n + (worst.d < 0 ? " cayó" : " creció menos"),
        `${sgn(worst.d, worst.unit)}. ${worst.d < 0 ? "Conviene revisar precios, quiebres y vendedor a cargo." : "Es la de menor avance del grupo."}`,
      ],
      [
        "layers",
        "acc",
        top.n + " pesa más",
        CMP.met === "Ventas"
          ? `Concentra el ${dec((top.a / tot) * 100, 0)} % de lo vendido en el período.`
          : `Es la cifra más alta: ${f(top.a)}.`,
      ],
    ];
    return `
      <div class="grid" style="grid-template-columns:1.7fr 1fr;align-items:start">
        ${card({ title: CMP.met + " por " + CMP.dim.toLowerCase(), hint: CMP.per + " contra " + anioEt(), actions: seg("biVista", ["Barras agrupadas", "Evolución mensual"], CMP.vista), body: chart })}
        <div class="wrap">
          ${card({ title: "Lo que dicen los números", hint: "en palabras", body: `<div class="reclist">${hall.map((h) => `<div class="rec" style="align-items:flex-start"><span style="display:flex;margin-top:2px;color:var(--${h[1] === "acc" ? "accent" : h[1] === "ok" ? "ok" : h[1] === "crit" ? "crit" : "warn"})">${icon(h[0])}</span><div style="flex:1"><div class="b" style="font-size:14px">${esc(h[2])}</div><div class="mut" style="font-size:12.5px;line-height:1.5">${esc(h[3])}</div></div></div>`).join("")}</div>` })}
          ${stat("Total del grupo", f(tot), { txt: sgn(dTot, unit) + " contra " + anioEt(), dir: dTot >= 0 ? "up" : "down" }, dTot >= 0 ? "var(--ok)" : "var(--crit)")}
        </div>
      </div>
      ${card({ title: "Crecimiento por local y familia", hint: "variación de la venta contra el año anterior · el signo y el número van siempre escritos", body: heatmap() })}
      <details class="card" style="padding:0"><summary style="padding:14px 17px;cursor:pointer;font-weight:650;font-size:14px">Ver la tabla con los números</summary>
        <div style="border-top:1px solid var(--hair-2)">${table({
          cols: [
            { t: CMP.dim, fmt: (r) => esc(r.n) },
            { t: "2026", r: true, cls: "mono", fmt: (r) => f(r.a) },
            { t: anioEt(), r: true, cls: "mono", fmt: (r) => f(r.b) },
            { t: "Variación", r: true, fmt: (r) => tagVar(r.d, r.unit) },
          ],
          rows,
        })}</div></details>`;
  }
  function heatmap() {
    const ls = D.tiendas,
      fs = FAMS.slice(0, 8);
    const col = (g) =>
      g >= 0
        ? `rgba(60,170,100,${Math.min(0.55, 0.12 + g / 40)})`
        : `rgba(220,85,65,${Math.min(0.55, 0.12 + Math.abs(g) / 20)})`;
    return `<div style="overflow-x:auto"><table class="bi-heat"><thead><tr><th></th>${fs.map((f) => `<th>${esc(f.nom.length > 16 ? f.nom.slice(0, 15) + "…" : f.nom)}</th>`).join("")}</tr></thead><tbody>
      ${ls
        .map(
          (l) =>
            `<tr><th class="l">${esc(l.nom)}</th>${fs
              .map((f) => {
                const g = jit("hm" + l.id + f.id, -9, 19);
                return `<td style="background:${col(g)}" title="${esc(l.nom + " · " + f.nom)}">${g >= 0 ? "+" : "−"}${dec(Math.abs(g), 0)} %</td>`;
              })
              .join("")}</tr>`,
        )
        .join("")}</tbody></table></div>`;
  }

  A.screen("bi-comparar", {
    title: "Comparar",
    sub: () => "Años, locales, vendedores y familias, con gráfico primero",
    extra: () =>
      `<button class="btn" id="cmpXls">${icon("download")}Exportar a Excel</button>`,
    render(v) {
      v.innerHTML = `<div class="wrap">
        ${card({
          body: `<div class="bi-sent"><span>Comparar</span>${selectIn("cMet", ["Ventas", "Margen bruto", "Tiquete promedio", "Unidades vendidas"], CMP.met)}
          <span>del</span>${selectIn("cPer", ["Año en curso", "Este mes", "Último trimestre"], CMP.per)}
          <span>contra</span>${selectIn("cVs", ["Año anterior", "Hace dos años", "Período anterior"], CMP.vs)}
          <span>por</span>${selectIn("cDim", ["Local", "Vendedor", "Familia", "Mes"], CMP.dim)}</div>
          <div class="mut" style="font-size:12.5px;margin-top:8px">Los cambios se aplican al instante: son cifras ya resumidas en la réplica de lectura. El histórico de 2024 y 2025 viene de la migración (MIG-004).</div>`,
        })}
        <div id="cmpBody" class="wrap">${cuerpoCmp()}</div></div>`;
    },
    wire(v) {
      const rep = () => {
        $("#cmpBody", v).innerHTML = cuerpoCmp();
        onSeg(v, "biVista", (x) => {
          CMP.vista = x;
          rep();
        });
      };
      [
        ["cMet", "met"],
        ["cPer", "per"],
        ["cVs", "vs"],
        ["cDim", "dim"],
      ].forEach((p) =>
        $("#" + p[0], v).addEventListener("change", (e) => {
          CMP[p[1]] = e.target.value;
          rep();
        }),
      );
      onSeg(v, "biVista", (x) => {
        CMP.vista = x;
        rep();
      });
      $("#cmpXls").addEventListener("click", () =>
        BI.exportar({
          n:
            "Comparativo de " +
            CMP.met.toLowerCase() +
            " por " +
            CMP.dim.toLowerCase(),
          g: "Ventas",
          filas: filasCmp().length,
          cols: 4,
        }),
      );
    },
  });

  /* ═══════════════════════════════════════════════════════════════
     TODOS LOS REPORTES — un solo acceso (REP-007), filtros antes de
     generar (REP-008), operativos de venta (REP-009), rango sin tope
     con ejecución en segundo plano (REP-003) y exportación con
     permiso (REP-004)
     ═══════════════════════════════════════════════════════════════ */
  const MV = {
    ven: [
      { n: "Venta neta", k: "crc" },
      { n: "Margen %", k: "pct", lo: 18, hi: 34 },
      { n: "Documentos", k: "int", hi: 5200 },
      { n: "Tiquete promedio", k: "tiq" },
    ],
    inv: [
      { n: "Valor a costo", k: "crc", sc: 0.5 },
      { n: "Cobertura (días)", k: "dias", lo: 9, hi: 75 },
      { n: "Rotación (veces al año)", k: "x", lo: 2, hi: 9 },
      { n: "Artículos en quiebre", k: "int", hi: 14 },
    ],
    com: [
      { n: "Comprado", k: "crc", sc: 0.6 },
      { n: "Cumplimiento de entrega %", k: "pct", lo: 72, hi: 99 },
      { n: "Variación de costo %", k: "pct", lo: -3, hi: 9 },
      { n: "Órdenes", k: "int", hi: 60 },
    ],
    car: [
      { n: "Saldo", k: "crc", sc: 0.35 },
      { n: "Vencido", k: "crc", sc: 0.06 },
      { n: "% vencido", k: "pct", lo: 4, hi: 31 },
      { n: "Días de cobro", k: "dias", lo: 22, hi: 58 },
    ],
    fis: [
      { n: "Base gravada", k: "crc", sc: 0.9 },
      { n: "IVA", k: "crc", sc: 0.11 },
      { n: "Documentos", k: "int", hi: 5200 },
      { n: "Rechazados", k: "int", hi: 9 },
    ],
    aud: [
      { n: "Eventos", k: "int", hi: 120 },
      { n: "Con autorización", k: "int", hi: 100 },
      { n: "Sin justificar", k: "int", hi: 12 },
      { n: "Monto expuesto", k: "crc", sc: 0.01 },
    ],
  };
  const MOT_PROF = [
    "Precio",
    "Sin existencia",
    "Compró en otro lado",
    "Plazo de entrega",
    "Sin respuesta del cliente",
  ];
  const MOT_PED = [
    "Sin existencia",
    "Plazo de entrega",
    "Cliente canceló",
    "Crédito no autorizado",
  ];
  const G = {
    v: "Ventas",
    i: "Inventario",
    c: "Compras",
    r: "Cartera y crédito",
    f: "Fiscal y contable",
    a: "Auditoría y control",
  };
  const topArts = (() => {
    const acc = {};
    D.documentos.forEach((d) => {
      if (d.tipo === "NC") return;
      d.lineas.forEach((l) => {
        acc[l.artId] = (acc[l.artId] || 0) + l.cant * l.precio;
      });
    });
    return Object.keys(acc)
      .map((id) => ({ a: artOf(id), v: acc[id] }))
      .filter((x) => x.a)
      .sort((x, y) => y.v - x.v)
      .slice(0, 10)
      .map((x) => x.a.desc);
  })();
  const CAT = [
    {
      id: "ventas",
      g: G.v,
      n: "Informe de ventas por período",
      d: "¿Cuánto vendí y con qué margen?",
      syn: "venta ingresos facturado",
      r9: 1,
    },
    {
      id: "facturas",
      g: G.v,
      n: "Informe de facturas",
      d: "Documento por documento, con su estado en Hacienda",
      syn: "factura tiquete nota credito",
      r9: 1,
      spec: {
        rows: [
          "Facturas (FE)",
          "Tiquetes (TE)",
          "Notas de crédito (NC)",
          "Notas de débito (ND)",
        ],
        metrics: [
          { n: "Monto", k: "crc" },
          { n: "Documentos", k: "int", hi: 5200 },
          { n: "Aceptados %", k: "pct", lo: 96, hi: 100 },
          { n: "Rechazados", k: "int", hi: 9 },
        ],
      },
    },
    {
      id: "top",
      g: G.v,
      n: "Productos más vendidos",
      d: "¿Qué mueve el negocio? Por monto, unidades y margen",
      syn: "top ranking articulos productos",
      r9: 1,
      spec: {
        rows: topArts,
        metrics: [
          { n: "Monto vendido", k: "crc", sc: 0.25 },
          { n: "Unidades", k: "int", hi: 9000 },
          { n: "Margen %", k: "pct", lo: 15, hi: 38 },
          { n: "Locales en quiebre", k: "int", hi: 3 },
        ],
      },
    },
    {
      id: "pagos",
      g: G.v,
      n: "Medios de pago por factura",
      d: "Cómo se cobra: efectivo, tarjeta, SINPE, cheque y crédito",
      syn: "pago efectivo tarjeta sinpe cierre caja",
      r9: 1,
      spec: {
        rows: D.MEDIOS.concat(["Crédito"]),
        metrics: [
          { n: "Monto", k: "crc", sc: 0.8 },
          { n: "Facturas", k: "int", hi: 5200 },
          { n: "% del total", k: "pct", lo: 4, hi: 38 },
          { n: "Diferencia de cierre", k: "crc", sc: 0.0004 },
        ],
      },
    },
    {
      id: "perdidas",
      g: G.v,
      n: "Ventas perdidas sobre proformas",
      d: "Cotizaciones que no cerraron y por qué",
      syn: "proforma cotizacion perdida",
      r9: 1,
      spec: {
        rows: MOT_PROF,
        metrics: [
          { n: "Monto perdido", k: "crc", sc: 0.18 },
          { n: "Proformas", k: "int", hi: 420 },
          { n: "% del monto", k: "pct", lo: 5, hi: 40 },
          { n: "Días promedio", k: "dias", lo: 3, hi: 21 },
        ],
      },
    },
    {
      id: "perdidasPed",
      g: G.v,
      n: "Ventas perdidas sobre pedidos",
      d: "Pedidos no entregados o cancelados, con motivo",
      syn: "pedido cancelado perdida",
      r9: 1,
      spec: {
        rows: MOT_PED,
        metrics: [
          { n: "Monto perdido", k: "crc", sc: 0.1 },
          { n: "Pedidos", k: "int", hi: 210 },
          { n: "% del monto", k: "pct", lo: 8, hi: 45 },
          { n: "Días promedio", k: "dias", lo: 2, hi: 14 },
        ],
      },
    },
    {
      id: "quiebre",
      g: G.v,
      n: "Ventas perdidas por quiebre",
      d: "Demanda que no se pudo atender por falta de existencia",
      syn: "agotado faltante",
      spec: {
        rows: FAMS.map((f) => f.nom),
        metrics: [
          { n: "Venta perdida estimada", k: "crc", sc: 0.05 },
          { n: "Artículos en quiebre", k: "int", hi: 30 },
          { n: "Días promedio en quiebre", k: "dias", lo: 2, hi: 19 },
          { n: "Con existencia en CEDI", k: "int", hi: 22 },
        ],
      },
    },
    {
      id: "vend",
      g: G.v,
      n: "Desempeño por vendedor",
      d: "Venta, margen, descuentos y cierre de proformas",
      syn: "vendedor comision meta",
      sens: 1,
      spec: {
        rows: VEND,
        metrics: [
          { n: "Venta neta", k: "crc", sc: 1 },
          { n: "Margen %", k: "pct", lo: 19, hi: 33 },
          { n: "Descuento otorgado %", k: "pct", lo: 1, hi: 9 },
          { n: "Cierre de proformas %", k: "pct", lo: 35, hi: 78 },
        ],
      },
    },
    {
      id: "margen",
      g: G.v,
      n: "Margen por local y familia",
      d: "Dónde se gana y dónde se fuga utilidad",
      syn: "utilidad rentabilidad fuga",
      sens: 1,
    },
    {
      id: "exist",
      g: G.i,
      n: "Existencias valorizadas",
      d: "¿Cuánto tengo invertido, por local y bodega?",
      syn: "inventario valor costo promedio",
      sens: 1,
    },
    {
      id: "kardex",
      g: G.i,
      n: "Kardex por artículo",
      d: "Entradas y salidas con saldo corrido y documento de origen",
      syn: "movimientos saldo",
    },
    {
      id: "rotacion",
      g: G.i,
      n: "Rotación y días de cobertura",
      d: "Qué se mueve, qué está por quebrar y qué está estancado",
      syn: "cobertura stock",
      spec: { rows: FAMS.map((f) => f.nom), metrics: MV.inv },
    },
    {
      id: "abc",
      g: G.i,
      n: "ABC por venta y por margen",
      d: "El 20 % de artículos que hace el 80 % del negocio",
      syn: "pareto clasificacion",
      spec: {
        rows: ["A · 80 % de la venta", "B · 15 %", "C · 5 %"],
        metrics: [
          { n: "Artículos", k: "int", hi: 9000 },
          { n: "Venta", k: "crc", sc: 1 },
          { n: "Margen %", k: "pct", lo: 16, hi: 36 },
          { n: "Inventario a costo", k: "crc", sc: 0.4 },
        ],
      },
    },
    {
      id: "sinmov",
      g: G.i,
      n: "Inventario sin movimiento",
      d: "Más de 90, 180 o 365 días sin venta, valorado a costo",
      syn: "obsoleto estancado",
      sens: 1,
      spec: {
        rows: ["90 a 180 días", "180 a 365 días", "Más de 365 días"],
        metrics: [
          { n: "Artículos", k: "int", hi: 1400 },
          { n: "Valor a costo", k: "crc", sc: 0.08 },
          { n: "% del inventario", k: "pct", lo: 1, hi: 9 },
          { n: "Locales afectados", k: "int", hi: 7 },
        ],
      },
    },
    {
      id: "gmroi",
      g: G.i,
      n: "Retorno sobre inventario (GMROI)",
      d: "Cuánta utilidad deja cada colón invertido, por familia",
      syn: "gmroi rentabilidad inventario",
      sens: 1,
      spec: {
        rows: FAMS.map((f) => f.nom),
        metrics: [
          { n: "Margen bruto", k: "crc", sc: 0.28 },
          { n: "Inventario promedio", k: "crc", sc: 0.5 },
          { n: "GMROI", k: "x", lo: 0.8, hi: 4.2 },
          { n: "Rotación", k: "x", lo: 2, hi: 9 },
        ],
      },
    },
    {
      id: "sugerido",
      g: G.i,
      n: "Quiebres y sugerido de compra",
      d: "Punto de reorden y stock de seguridad por artículo",
      syn: "reposicion reorden",
      spec: {
        rows: FAMS.map((f) => f.nom),
        metrics: [
          { n: "Artículos a reponer", k: "int", hi: 60 },
          { n: "Monto sugerido", k: "crc", sc: 0.12 },
          { n: "Cobertura actual (días)", k: "dias", lo: 3, hi: 21 },
          { n: "En el CEDI", k: "int", hi: 45 },
        ],
      },
    },
    {
      id: "traslados",
      g: G.i,
      n: "Traslados entre bodegas",
      d: "Con diferencias de recepción, por ruta",
      syn: "cedi traslado diferencia",
      spec: {
        rows: [
          "CEDI → Santa Rosa",
          "CEDI → Turrialba",
          "CEDI → Pacayas",
          "CEDI → Pejibaye",
          "Bodega 1 → El Centro",
        ],
        metrics: [
          { n: "Traslados", k: "int", hi: 90 },
          { n: "Líneas", k: "int", hi: 900 },
          { n: "Con diferencia %", k: "pct", lo: 1, hi: 12 },
          { n: "Días en tránsito", k: "dias", lo: 1, hi: 4 },
        ],
      },
    },
    {
      id: "merma",
      g: G.i,
      n: "Merma y ajustes",
      d: "Por motivo, local y responsable, con evidencia",
      syn: "ajuste perdida",
      sens: 1,
      spec: {
        rows: [
          "Daño",
          "Vencimiento",
          "Diferencia de conteo",
          "Robo o extravío",
          "Autoconsumo",
        ],
        metrics: [
          { n: "Monto", k: "crc", sc: 0.03 },
          { n: "Ajustes", k: "int", hi: 260 },
          { n: "% de la venta", k: "pct", lo: 0.1, hi: 1.4 },
          { n: "Con evidencia %", k: "pct", lo: 60, hi: 100 },
        ],
      },
    },
    {
      id: "compras",
      g: G.c,
      n: "Compras por proveedor",
      d: "Monto, plazo y cumplimiento de entrega",
      syn: "proveedor orden compra",
      spec: {
        rows: D.proveedores.slice(0, 8).map((p) => p.nom),
        metrics: MV.com,
      },
    },
    {
      id: "varcosto",
      g: G.c,
      n: "Variación de costo",
      d: "Artículos cuyo costo cambió más allá del tope",
      syn: "costo cambio precio compra",
      sens: 1,
      spec: {
        rows: FAMS.map((f) => f.nom),
        metrics: [
          { n: "Artículos con cambio", k: "int", hi: 70 },
          { n: "Variación promedio %", k: "pct", lo: -4, hi: 12 },
          { n: "Fuera de tope (±30 %)", k: "int", hi: 5 },
          { n: "Impacto en margen", k: "crc", sc: 0.004 },
        ],
      },
    },
    {
      id: "sinacep",
      g: G.c,
      n: "Comprobantes sin aceptar",
      d: "Exposición fiscal por vencimiento del plazo de aceptación",
      syn: "xml hacienda proveedor",
      spec: {
        rows: [
          "Vencen en 1 a 2 días",
          "Vencen en 3 a 5 días",
          "Vencen en 6 a 8 días",
        ],
        metrics: [
          { n: "Comprobantes", k: "int", hi: 60 },
          { n: "Monto", k: "crc", sc: 0.1 },
          { n: "IVA en riesgo", k: "crc", sc: 0.012 },
          { n: "Proveedores", k: "int", hi: 14 },
        ],
      },
    },
    {
      id: "compraRec",
      g: G.c,
      n: "Compras contra recepción",
      d: "Lo pedido contra lo recibido y facturado",
      syn: "recepcion orden diferencia",
      spec: {
        rows: D.proveedores.slice(0, 8).map((p) => p.nom),
        metrics: [
          { n: "Pedido", k: "crc", sc: 0.6 },
          { n: "Recibido %", k: "pct", lo: 80, hi: 100 },
          { n: "Facturado %", k: "pct", lo: 84, hi: 100 },
          { n: "Días de atraso", k: "dias", lo: 0, hi: 9 },
        ],
      },
    },
    {
      id: "antig",
      g: G.r,
      n: "Antigüedad de saldos por cobrar",
      d: "Quién debe, cuánto y desde cuándo",
      syn: "cartera cxc mora vencido",
      spec: {
        rows: [
          "Al día",
          "1 a 30 días",
          "31 a 60 días",
          "61 a 90 días",
          "Más de 90 días",
        ],
        metrics: [
          { n: "Saldo", k: "crc", sc: 0.3 },
          { n: "Clientes", k: "int", hi: 900 },
          { n: "% de la cartera", k: "pct", lo: 4, hi: 42 },
          { n: "Promedio de días", k: "dias", lo: 8, hi: 110 },
        ],
      },
    },
    {
      id: "lineaCred",
      g: G.r,
      n: "Uso de la línea de crédito",
      d: "Contratistas cerca o por encima de su límite",
      syn: "limite credito contratistas",
      spec: {
        metrics: [
          { n: "Límite", k: "crc", sc: 0.5 },
          { n: "Saldo", k: "crc", sc: 0.3 },
          { n: "Uso %", k: "pct", lo: 20, hi: 118 },
          { n: "Días de cobro", k: "dias", lo: 22, hi: 58 },
        ],
        dims: ["Cliente"],
      },
    },
    {
      id: "cobros",
      g: G.r,
      n: "Efectividad de cobro",
      d: "Cuánto se recuperó de lo vencido, por cobrador",
      syn: "recuperacion dso cobro",
      spec: {
        rows: [
          "Cobro en local",
          "Cobro por ruta",
          "SINPE y transferencia",
          "Cheque",
        ],
        metrics: [
          { n: "Recuperado", k: "crc", sc: 0.1 },
          { n: "Recibos", k: "int", hi: 1800 },
          { n: "Efectividad %", k: "pct", lo: 55, hi: 96 },
          { n: "Días de cobro", k: "dias", lo: 22, hi: 58 },
        ],
      },
    },
    {
      id: "ventaCred",
      g: G.r,
      n: "Ventas a crédito por contratista",
      d: "Volumen, margen y plazo por cliente con crédito",
      syn: "contratista maestro obra",
      sens: 1,
      spec: { metrics: MV.ven, dims: ["Cliente"] },
    },
    {
      id: "iva",
      g: G.f,
      n: "IVA por tasa",
      d: "Débito contra crédito por tasa, para el D-104",
      syn: "impuesto d104 declaracion",
      spec: {
        rows: ["13 %", "4 %", "2 %", "1 %", "Exento"],
        metrics: [
          { n: "Base de ventas", k: "crc", sc: 0.6 },
          { n: "IVA cobrado", k: "crc", sc: 0.08 },
          { n: "IVA pagado en compras", k: "crc", sc: 0.05 },
          { n: "Diferencia", k: "crc", sc: 0.03 },
        ],
      },
    },
    {
      id: "estadoFE",
      g: G.f,
      n: "Estado de comprobantes en Hacienda",
      d: "Aceptados, pendientes, rechazados y en contingencia",
      syn: "hacienda fe factura electronica",
      spec: {
        rows: [
          "Aceptados",
          "Pendientes de respuesta",
          "Rechazados",
          "En contingencia",
        ],
        metrics: [
          { n: "Documentos", k: "int", hi: 5200 },
          { n: "Monto", k: "crc", sc: 0.9 },
          { n: "% del total", k: "pct", lo: 1, hi: 97 },
          { n: "Días promedio abierto", k: "dias", lo: 0, hi: 4 },
        ],
      },
    },
    {
      id: "nc",
      g: G.f,
      n: "Notas de crédito y devoluciones",
      d: "Con causa, usuario y efecto en inventario",
      syn: "devolucion anulacion",
      spec: {
        rows: [
          "Producto dañado",
          "Error de facturación",
          "Devolución del cliente",
          "Diferencia de precio",
        ],
        metrics: [
          { n: "Monto", k: "crc", sc: 0.04 },
          { n: "Notas", k: "int", hi: 320 },
          { n: "% de la venta", k: "pct", lo: 0.3, hi: 2.4 },
          { n: "Reingresa a inventario %", k: "pct", lo: 20, hi: 95 },
        ],
      },
    },
    {
      id: "resultados",
      g: G.f,
      n: "Estado de resultados comparativo",
      d: "Mes contra mes y contra el año anterior",
      syn: "utilidad perdida ganancias",
      sens: 1,
      spec: {
        rows: MESES.slice(0, 9),
        metrics: [
          { n: "Ingresos", k: "crc", sc: 1 },
          { n: "Costo de ventas", k: "crc", sc: 0.72 },
          { n: "Gastos", k: "crc", sc: 0.18 },
          { n: "Utilidad", k: "crc", sc: 0.1 },
        ],
      },
    },
    {
      id: "audCosto",
      g: G.a,
      n: "Cambios de costo y de precio",
      d: "Quién cambió qué, cuándo y con qué motivo",
      syn: "bitacora costo precio",
      sens: 1,
      spec: { metrics: MV.aud, dims: ["Local", "Vendedor"] },
    },
    {
      id: "audBajoCosto",
      g: G.a,
      n: "Ventas bajo costo y descuentos fuera de política",
      d: "Lo que se vendió con margen negativo o bajo el mínimo",
      syn: "excepcion margen negativo autorizacion",
      sens: 1,
      spec: { metrics: MV.aud, dims: ["Local", "Vendedor", "Familia"] },
    },
    {
      id: "audAnul",
      g: G.a,
      n: "Anulaciones por usuario",
      d: "Facturas y tiquetes anulados, con motivo",
      syn: "anulado usuario",
      sens: 1,
      spec: { metrics: MV.aud, dims: ["Vendedor", "Local"] },
    },
    {
      id: "audExp",
      g: G.a,
      n: "Bitácora de exportaciones",
      d: "Quién descargó qué a Excel, con cuántas filas",
      syn: "exportacion descarga excel auditoria",
      sens: 1,
      spec: {
        rows: [
          "Gerencia",
          "Contabilidad",
          "Proveeduría",
          "Crédito y cobro",
          "Jefes de local",
          "Cajeros",
        ],
        metrics: [
          { n: "Exportaciones", k: "int", hi: 260 },
          { n: "Filas exportadas", k: "int", hi: 90000 },
          { n: "Con motivo escrito %", k: "pct", lo: 60, hi: 100 },
          { n: "Rechazadas por permiso", k: "int", hi: 14 },
        ],
      },
    },
  ];
  const malo = (n) =>
    !/cobertura/i.test(n) &&
    /perdid|vencid|quiebre|rechaz|sin justificar|expuest|diferencia|días|atraso|merma|impacto|fuera de tope/i.test(
      n,
    );
  const catBy = (id) => CAT.find((x) => x.id === id);
  const GRUPOS = ["Todos"].concat(Object.keys(G).map((k) => G[k]));
  const acceso = (r) =>
    S.role === "gerencia" ||
    (S.role === "cajero" && r.g === G.v && !r.sens) ||
    (S.role === "bodega" && r.g === G.i && !r.sens);
  const specDe = (r) => r.spec || {};
  const dimsDe = (r) =>
    specDe(r).rows
      ? [specDe(r).dimName || "Categoría"]
      : specDe(r).dims || ["Local", "Familia", "Vendedor", "Cliente", "Mes"];
  const metricasDe = (r) =>
    specDe(r).metrics ||
    (r.g === G.v
      ? MV.ven
      : r.g === G.i
        ? MV.inv
        : r.g === G.c
          ? MV.com
          : r.g === G.r
            ? MV.car
            : r.g === G.f
              ? MV.fis
              : MV.aud);

  const FILT0 = () => ({
    preset: "Este mes",
    desde: "2026-09-01",
    hasta: "2026-09-13",
    local: "Todos",
    familia: "Todas",
    agrupar: null,
    comparar: "Año anterior",
    cond: "Todas",
    vend: "Todos",
    formato: "En pantalla",
  });
  const R = {
    vista: "lista",
    q: "",
    grupo: "Todos",
    rep: null,
    f: FILT0(),
    met: 0,
    cmp: true,
    orden: null,
    asc: false,
    bq: "",
    fav: ["ventas", "antig", "perdidas"],
    rec: ["ventas", "antig", "top"],
    prog: [
      { id: "antig", cuando: "Lunes 7:00 → correo a Crédito y cobro" },
      { id: "ventas", cuando: "Diario 6:30 → WhatsApp a Gerencia" },
    ],
  };
  BI.DESC = BI.DESC || [
    {
      id: "D1",
      n: "Informe de ventas por período",
      alcance: "Los 7 locales · 2016 a 2026 (10 años) · por familia",
      filas: 15300000,
      inicio: Date.now() - 22000,
      dur: 80000,
      tipo: "Reporte",
      quien: "Andrey",
    },
    {
      id: "D2",
      n: "Antigüedad de saldos por cobrar",
      alcance: "Todos los clientes · al 13 set",
      filas: 78412,
      inicio: Date.now() - 600000,
      dur: 20000,
      tipo: "Excel",
      quien: "Andrey",
      listo: true,
    },
  ];
  BI.HIST = BI.HIST || [
    {
      cuando: "Hoy 09:12",
      quien: "Andrey (Gerencia)",
      rep: "Antigüedad de saldos por cobrar",
      filas: 78412,
      cols: 9,
      motivo: "Reunión de cobro con Crédito",
      ip: "10.20.4.18",
    },
    {
      cuando: "Ayer 16:30",
      quien: "Contabilidad",
      rep: "IVA por tasa",
      filas: 5,
      cols: 6,
      motivo: "—",
      ip: "10.20.4.31",
    },
    {
      cuando: "Ayer 11:05",
      quien: "Proveeduría",
      rep: "Compras por proveedor",
      filas: 8,
      cols: 8,
      motivo: "—",
      ip: "10.20.4.27",
    },
    {
      cuando: "Lun 15:48",
      quien: "Cajero · Turrialba",
      rep: "Base de clientes",
      filas: 0,
      cols: 0,
      motivo: "Rechazada: sin permiso de exportación",
      ip: "10.20.5.12",
      rechazo: true,
    },
  ];
  /* Las solicitudes de permiso ya no viven aquí: se crean como excepciones en
     Sistema › Autorización de excepciones (mod-sys.js define BI.agregarExcepcion). */
  BI.SOLIC_N = 2292;
  BI.pedirPermiso = (que, tipo, motivo, doc) => {
    const x = {
      id: "EX-" + ++BI.SOLIC_N,
      tipo: tipo,
      ic: tipo === "Permiso de exportación" ? "download" : "lock",
      doc: doc,
      pide: D.sesion.corto,
      loc: "L1",
      det: que,
      min: 1,
      pueden: ["Gerencia", "Hazel Monge"],
      canal: "Correo y en el sistema",
      mot: motivo || "Sin motivo escrito",
      vence: "hoy",
    };
    if (BI.agregarExcepcion) BI.agregarExcepcion(x);
    return x;
  };
  BI.abrir = (id, patch) => {
    const r = catBy(id);
    if (!r) return;
    R.rep = r;
    R.vista = "filtros";
    R.f = Object.assign(FILT0(), patch || {});
    R.f.agrupar = dimsDe(r)[0];
    R.met = 0;
    R.cmp = true;
  };

  const rolEt = () =>
    ({ gerencia: "Andrey (Gerencia)", cajero: "Mostrador", bodega: "Bodega" })[
      S.role
    ] || S.role;
  const PRE = {
    Hoy: ["2026-09-13", "2026-09-13"],
    "Esta semana": ["2026-09-07", "2026-09-13"],
    "Este mes": ["2026-09-01", "2026-09-13"],
    "Este año": ["2026-01-01", "2026-09-13"],
    "Últimos 5 años": ["2021-09-14", "2026-09-13"],
    "Últimos 10 años": ["2016-09-14", "2026-09-13"],
  };
  const dPar = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const diasF = (f) => Math.round((dPar(f.hasta) - dPar(f.desde)) / 864e5) + 1;
  const fechaC = (s) => {
    const d = dPar(s);
    return (
      d.getDate() +
      " " +
      MESES[d.getMonth()].toLowerCase() +
      " " +
      d.getFullYear()
    );
  };
  const errFecha = (f) =>
    dPar(f.desde) > dPar(f.hasta)
      ? "La fecha inicial es posterior a la final. Cámbiela para poder generar el reporte."
      : dPar(f.hasta) > D.HOY
        ? "El período no puede terminar después de hoy (13 set 2026)."
        : null;
  const pesado = (f) => diasF(f) > 730;
  const filasEst = (f) =>
    Math.round(diasF(f) * 7 * 640 * (f.local === "Todos" ? 1 : 1 / 7));
  const esp = (n) => (n >= 1e6 ? dec(n / 1e6, 1) + " millones" : grp(n));

  function nombresDim(r, agr) {
    const sp = specDe(r);
    if (sp.rows) return { n: sp.rows, w: norma(sp.rows, r.id) };
    if (agr === "Local")
      return {
        n: D.tiendas.map((l) => l.nom),
        w: D.tiendas.map((l) => LW[l.id]),
      };
    if (agr === "Familia") {
      const n = FAMS.map((f) => f.nom);
      return { n, w: norma(n, "f" + r.id) };
    }
    if (agr === "Vendedor") return { n: VEND, w: norma(VEND, "v" + r.id) };
    if (agr === "Cliente") {
      const n = D.clientes
        .filter((x) => x.limite)
        .slice(0, 8)
        .map((x) => x.nom);
      return { n, w: norma(n, "c" + r.id) };
    }
    return {
      n: MESES.slice(0, 9),
      w: MESES.slice(0, 9).map((_, i) => EST[i] / suma(EST.slice(0, 9))),
    };
  }
  function genRows(r, f) {
    const agr = f.agrupar || dimsDe(r)[0];
    const dm = nombresDim(r, agr),
      ms = metricasDe(r);
    const pf =
      Math.max(0.03, diasF(f) / 30) *
      (f.local === "Todos"
        ? 1
        : (LW[(D.tiendas.find((l) => l.nom === f.local) || { id: "L1" }).id] *
            7) /
          7);
    const filt =
      (f.familia !== "Todas" ? 0.3 : 1) *
      (f.vend !== "Todos" ? 0.25 : 1) *
      (f.cond === "Crédito" ? 0.38 : f.cond === "Contado" ? 0.62 : 1);
    return dm.n.map((n, i) => {
      const o = { n, v: [], p: [] };
      ms.forEach((m, k) => {
        const sd = r.id + n + m.n;
        let v, p;
        if (m.k === "crc") {
          v =
            BASE_DIA *
            30 *
            pf *
            filt *
            dm.w[i] *
            (m.sc || 1) *
            jit(sd, 0.85, 1.2);
          p = v / jit(sd + "p", 0.9, 1.12);
        } else if (m.k === "int") {
          v = Math.round(
            (m.hi || 100) *
              Math.min(pf, 14) *
              filt *
              dm.w[i] *
              7 *
              jit(sd, 0.6, 1),
          );
          p = Math.round(v / jit(sd + "p", 0.9, 1.12));
        } else if (m.k === "tiq") {
          v = TIQ * jit(sd, 0.8, 1.2);
          p = v / jit(sd + "p", 0.92, 1.1);
        } else {
          v = jit(sd, m.lo, m.hi);
          p = v - jit(sd + "p", -3, 3) * (m.k === "pct" ? 1 : 0.4);
        }
        o.v.push(v);
        o.p.push(p);
      });
      return o;
    });
  }
  const fmtM = (m, v) =>
    m.k === "crc"
      ? Math.abs(v) >= 1e7
        ? mill(v)
        : c(v)
      : m.k === "tiq"
        ? c(v)
        : m.k === "pct"
          ? dec(v) + " %"
          : m.k === "dias"
            ? dec(v, 0) + " d"
            : m.k === "x"
              ? dec(v) + " ×"
              : grp(v);
  const agg = (m, rows, k, pv) => {
    const xs = rows.map((r) => (pv ? r.p[k] : r.v[k]));
    return m.k === "crc" || m.k === "int"
      ? suma(xs)
      : suma(xs) / (xs.length || 1);
  };

  const buscaTxt = (r) => norm([r.n, r.d, r.g, r.syn || ""].join(" "));
  const tarjeta = (r) => {
    const lk = !acceso(r),
      fav = R.fav.indexOf(r.id) >= 0;
    return `<div style="position:relative"><button class="bi-rep ${lk ? "lock" : ""}" data-rep="${r.id}" aria-label="${esc(r.n)}${lk ? " (sin acceso)" : ""}">
      <span class="rn">${esc(r.n)}</span><span class="rd">${esc(r.d)}</span>
      <span class="rm">${tag(r.g, "mu")}${r.r9 ? tag("Venta operativa", "acc") : ""}${lk ? tag("Sin acceso", "warn", "lock") : ""}</span></button>
      <button class="bi-star ${fav ? "on" : ""}" data-fav="${r.id}" aria-pressed="${fav}" aria-label="${fav ? "Quitar de favoritos" : "Agregar a favoritos"}: ${esc(r.n)}">${fav ? "★" : "☆"}</button></div>`;
  };
  const mini = (r, sub, ic) =>
    `<button class="bi-mini" data-rep="${r.id}"><span style="font-size:13.5px;font-weight:700">${esc(r.n)}</span><span class="mut" style="font-size:12px;display:flex;gap:6px;align-items:center">${ic ? icon(ic, 'style="width:14px;height:14px"') : ""}${esc(sub)}</span></button>`;

  function vistaLista() {
    const q = norm(R.q);
    const lista = CAT.filter(
      (r) =>
        (R.grupo === "Todos" || r.g === R.grupo) &&
        (!q || q.split(/\s+/).every((t) => buscaTxt(r).indexOf(t) >= 0)),
    );
    const activos = BI.DESC.filter(
      (x) => Date.now() - x.inicio < x.dur && !x.listo,
    );
    const sinBusca = !q && R.grupo === "Todos";
    const grupos =
      R.grupo === "Todos" ? Object.keys(G).map((k) => G[k]) : [R.grupo];
    return `<div class="wrap">
      ${activos.length ? `<div class="bi-note">${icon("clock")}<div style="flex:1"><b>${activos.length} reporte${activos.length > 1 ? "s" : ""} en preparación.</b> Puede seguir trabajando; se lo avisamos al terminar.</div><button class="btn sm" data-ir="bi-descargas">Ver en Mis descargas</button></div>` : ""}
      ${card({
        body: `<div class="tb-search" style="padding:12px 15px;width:100%;max-width:none">${icon("search")}<input id="rq" value="${esc(R.q)}" placeholder="Busque por lo que necesita saber: «facturas», «quién nos debe», «qué no se mueve»…" style="font-size:15px" autocomplete="off"></div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px">${GRUPOS.map((g) => `<button class="btn sm ${R.grupo === g ? "pri" : ""}" data-grp="${esc(g)}" aria-pressed="${R.grupo === g}">${esc(g)}</button>`).join("")}</div>
        <div class="mut" style="font-size:12.5px;margin-top:10px">${CAT.length} reportes en un solo lugar. Ninguno se genera al abrirlo: primero elige los filtros.</div>`,
      })}
      ${
        sinBusca
          ? `<div class="grid g3" style="align-items:start">
        ${card({
          title: "Favoritos",
          hint: "sus reportes de todos los días",
          body: `<div class="wrap" style="gap:8px">${
            R.fav
              .map(catBy)
              .filter(Boolean)
              .map((r) => mini(r, r.g, "eye"))
              .join("") ||
            `<div class="mut" style="font-size:13px">Toque la ☆ de cualquier reporte.</div>`
          }</div>`,
        })}
        ${card({
          title: "Recientes",
          hint: "lo último que generó",
          body: `<div class="wrap" style="gap:8px">${R.rec
            .slice(0, 4)
            .map(catBy)
            .filter(Boolean)
            .map((r) => mini(r, "hace un momento", "history"))
            .join("")}</div>`,
        })}
        ${card({
          title: "Programados",
          hint: "llegan solos",
          body: `<div class="wrap" style="gap:8px">${R.prog
            .map((p) => ({ r: catBy(p.id), c: p.cuando }))
            .filter((x) => x.r)
            .map((x) => mini(x.r, x.c, "clock"))
            .join("")}</div>`,
        })}
      </div>`
          : ""
      }
      ${
        lista.length
          ? grupos
              .map((g) => {
                const xs = lista.filter((r) => r.g === g);
                return xs.length
                  ? card({
                      title: g,
                      hint: xs.length + " reportes",
                      body: `<div class="bi-cards">${xs.map(tarjeta).join("")}</div>`,
                    })
                  : "";
              })
              .join("")
          : card({
              body:
                empty(
                  "search",
                  "No encontramos un reporte con «" + R.q + "»",
                  "Pruebe con otra palabra, o pregúntele directamente a ServeCore: arma el reporte por usted.",
                ) +
                `<div style="text-align:center;margin-top:-6px"><button class="btn pri" data-ir="preguntas">${icon("sparkle")}Preguntar a ServeCore</button></div>`,
            })
      }
      <div class="mut" style="font-size:12.5px;display:flex;gap:7px;align-items:center">${icon("info", 'style="width:15px;height:15px"')}Los reportes corren sobre la réplica de lectura, nunca sobre la base de la caja. Un período grande no puede frenar a los locales.</div></div>`;
  }

  function opts(id, list, cur) {
    return `<select id="${id}">${list.map((o) => `<option ${o === cur ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
  }
  function vistaFiltros() {
    const r = R.rep,
      f = R.f,
      err = errFecha(f),
      pes = pesado(f),
      fi = filasEst(f);
    const agr = dimsDe(r);
    return `<div class="grid" style="grid-template-columns:1.5fr 1fr;align-items:start">
      ${card({
        title: "1 · Elija los filtros",
        hint: "nada se genera hasta que usted lo pida",
        body: `
        <div style="margin-bottom:14px"><div class="mut" style="font-size:12px;font-weight:650;margin-bottom:6px">Período</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">${Object.keys(PRE)
            .concat(["Personalizado"])
            .map(
              (p) =>
                `<button class="btn sm ${f.preset === p ? "pri" : ""}" data-pre="${esc(p)}" aria-pressed="${f.preset === p}">${esc(p)}</button>`,
            )
            .join("")}</div></div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
          <div class="field"><label>Desde</label><input type="date" id="fd" value="${f.desde}"></div>
          <div class="field"><label>Hasta</label><input type="date" id="fh" value="${f.hasta}"></div>
          <div class="field"><label>Local</label>${opts("fl", ["Todos"].concat(D.tiendas.map((l) => l.nom)), f.local)}</div>
          <div class="field"><label>Familia</label>${opts("ff", ["Todas"].concat(FAMS.map((x) => x.nom)), f.familia)}</div>
          ${specDe(r).rows ? "" : `<div class="field"><label>Agrupar por</label>${opts("fa", agr, f.agrupar || agr[0])}</div>`}
          <div class="field"><label>Comparar con</label>${opts("fc", ["Sin comparar", "Año anterior", "Período anterior"], f.comparar)}</div>
          <div class="field"><label>Condición de venta</label>${opts("fk", ["Todas", "Contado", "Crédito"], f.cond)}</div>
          <div class="field"><label>Vendedor</label>${opts("fv", ["Todos"].concat(VEND), f.vend)}</div>
        </div>
        ${err ? `<div class="bi-note crit" style="margin-top:14px" role="alert">${icon("alert")}<div>${esc(err)}</div></div>` : ""}
        ${pes && !err ? `<div class="bi-note" style="margin-top:14px">${icon("info")}<div><b>Este período es amplio (${dec(diasF(f) / 365, 0)} años).</b> No hay tope: lo preparamos en segundo plano y le avisamos cuando esté listo. Sus compañeros siguen vendiendo sin lentitud, porque la consulta corre en la réplica.</div></div>` : ""}`,
      })}
      <div class="wrap">
        ${card({
          title: "2 · Alcance",
          body: `<div style="font-size:14px;line-height:1.65"><b>${esc(r.n)}</b><br>
          <span class="mut">${f.local === "Todos" ? "Los 7 locales" : esc(f.local)} · ${fechaC(f.desde)} al ${fechaC(f.hasta)} (${grp(diasF(f))} días)${f.familia !== "Todas" ? " · " + esc(f.familia) : ""}${f.cond !== "Todas" ? " · " + f.cond.toLowerCase() : ""}</span></div>
          <div class="reclist" style="margin-top:10px">
            <div class="rec"><span class="mut" style="flex:1;font-size:13px">Líneas a revisar</span><b class="num">≈ ${esp(fi)}</b></div>
            <div class="rec"><span class="mut" style="flex:1;font-size:13px">Dónde se ejecuta</span>${tag("Réplica de lectura", "ok", "shield")}</div>
            <div class="rec"><span class="mut" style="flex:1;font-size:13px">Cómo se entrega</span>${tag(pes ? "En segundo plano" : "En pantalla", pes ? "acc" : "ok", pes ? "clock" : "eye")}</div>
            <div class="rec"><span class="mut" style="flex:1;font-size:13px">Tiempo estimado</span><b class="num">${pes ? "≈ " + Math.max(2, Math.round(fi / 4e6)) + " min" : "menos de 3 s"}</b></div>
          </div>
          <button class="btn pri big" id="rGo" style="width:100%;justify-content:center;margin-top:14px" ${err ? "disabled" : ""}>${icon(pes ? "clock" : "chart")}${pes ? "Preparar reporte" : "Generar reporte"}</button>
          <div class="mut" style="font-size:12px;margin-top:8px;text-align:center">${pes ? "Lo encontrará en «Mis descargas»" : "El resultado abre con gráfico primero"}</div>`,
        })}
      </div></div>`;
  }

  function vistaCargando() {
    const r = R.rep;
    return `<div class="wrap">${card({
      title: "Generando " + r.n,
      body: `<div style="padding:8px 0 4px"><div id="rProgTxt" style="font-size:14px;font-weight:650;margin-bottom:10px">Reuniendo ventas de 7 locales…</div>
      <div style="height:8px;background:var(--surface-3);border-radius:5px;overflow:hidden"><div id="rProg" style="height:100%;width:8%;background:var(--accent);transition:width 1.4s ease"></div></div>
      <div style="margin-top:22px;display:flex;flex-direction:column;gap:10px"><div class="bi-skel" style="width:60%"></div><div class="bi-skel" style="width:85%"></div><div class="bi-skel" style="width:72%"></div></div>
      <div class="mut" style="font-size:12.5px;margin-top:16px">Corre sobre la réplica de lectura. La caja no se entera.</div></div>`,
    })}</div>`;
  }

  function vistaResultado() {
    const r = R.rep,
      f = R.f,
      ms = metricasDe(r);
    let rows = genRows(r, f);
    const cmp = f.comparar !== "Sin comparar" && R.cmp;
    const m = ms[R.met];
    const q = norm(R.bq);
    if (q) rows = rows.filter((x) => norm(x.n).indexOf(q) >= 0);
    const ord = R.orden == null ? R.met : R.orden;
    rows = rows
      .slice()
      .sort(
        (a, b) =>
          (R.asc ? 1 : -1) *
          (ord < 0 ? a.n.localeCompare(b.n) : a.v[ord] - b.v[ord]),
      );
    const dlt = (k, x) => {
      const p = x.p[k];
      const mk = ms[k];
      if (mk.k === "pct" || mk.k === "dias" || mk.k === "x")
        return { d: x.v[k] - p, unit: "pp" };
      return { d: p ? ((x.v[k] - p) / p) * 100 : 0, unit: "%" };
    };
    const cifras = ms.map((mk, k) => {
      const a = agg(mk, rows, k),
        b = agg(mk, rows, k, true);
      const d =
        mk.k === "crc" || mk.k === "int" || mk.k === "tiq"
          ? b
            ? ((a - b) / b) * 100
            : 0
          : a - b;
      return stat(
        mk.n,
        fmtM(mk, a),
        cmp
          ? {
              txt:
                sgn(
                  d,
                  mk.k === "crc" || mk.k === "int" || mk.k === "tiq"
                    ? "%"
                    : "pp",
                ) +
                " contra " +
                (f.comparar === "Año anterior"
                  ? "2025"
                  : "el período anterior"),
              dir: (malo(mk.n) ? d <= 0 : d >= 0) ? "up" : "down",
            }
          : null,
      );
    });
    const chartRows = rows.map((x) => {
      const d = dlt(R.met, x);
      return {
        n: x.n,
        a: x.v[R.met],
        b: x.p[R.met],
        d: d.d,
        unit: d.unit,
        inv: malo(m.n),
      };
    });
    const chart = cmp
      ? gbars(
          chartRows.slice(0, 10),
          (v) => fmtM(m, v),
          f.desde.slice(0, 4) === "2016" ? "Período" : "Período actual",
          f.comparar === "Año anterior" ? "Año anterior" : "Período anterior",
        )
      : bars(
          chartRows
            .slice(0, 12)
            .map((x) => ({ n: x.n, v: x.a, lab: fmtM(m, x.a) })),
        );
    const cols = [
      {
        t: f.agrupar || specDe(r).dimName || "Categoría",
        fmt: (x) => esc(x.n),
      },
    ]
      .concat(
        ms.map((mk, k) => ({
          t: mk.n,
          r: true,
          cls: "mono",
          fmt: (x) => fmtM(mk, x.v[k]),
        })),
      )
      .concat(
        cmp
          ? [
              {
                t: "Variación de " + m.n.toLowerCase(),
                r: true,
                fmt: (x) => {
                  const d = dlt(R.met, x);
                  return tagVar(d.d, d.unit, malo(m.n));
                },
              },
            ]
          : [],
      );
    return `<div class="wrap">
      <div class="card"><div class="card-b" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:space-between">
        <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">${tag(f.local === "Todos" ? "7 locales" : f.local, "mu")}${tag(fechaC(f.desde) + " → " + fechaC(f.hasta), "mu")}${f.familia !== "Todas" ? tag(f.familia, "mu") : ""}${f.cond !== "Todas" ? tag(f.cond, "mu") : ""}${f.vend !== "Todos" ? tag(f.vend, "mu") : ""}
          <button class="btn sm" id="rCambiar">${icon("filter")}Cambiar filtros</button></div>
        <span class="bi-live"><span class="bi-dot"></span>Datos de la réplica · actualizado hace 4 min · ${grp(rows.length)} filas</span></div></div>
      <div class="grid g4">${cifras.join("")}</div>
      ${card({
        title: m.n + " por " + (f.agrupar || "categoría").toLowerCase(),
        hint: cmp ? "con comparativo" : "",
        actions: `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${seg(
          "rMet",
          ms.map((mk, k) => ({ v: String(k), t: mk.n })),
          String(R.met),
        )}${f.comparar !== "Sin comparar" ? `<button class="btn sm" id="rCmp" aria-pressed="${R.cmp}">${R.cmp ? "Quitar comparativo" : "Comparar con " + (f.comparar === "Año anterior" ? "el año anterior" : "el período anterior")}</button>` : ""}</div>`,
        body: chart,
      })}
      ${card({ title: "Detalle", hint: "toque un encabezado para ordenar", actions: `<div class="tb-search" style="padding:6px 10px;min-width:200px">${icon("search")}<input id="rBq" value="${esc(R.bq)}" placeholder="Filtrar filas" style="font-size:13px"></div>`, body: table({ cols, rows, h: "50dvh" }) })}
      <div class="mut" style="font-size:12.5px;display:flex;gap:7px;align-items:center">${icon("info", 'style="width:15px;height:15px"')}${r.g === G.v ? "Margen sobre venta neta (sin IVA, descontadas las notas de crédito). Costo promedio ponderado al momento de la venta." : "Valores en colones, sin IVA salvo que la columna diga lo contrario."} El Excel trae exactamente las columnas que ve aquí.</div></div>`;
  }

  BI.exportar = function (o) {
    if (!BI.puedeExportar(o.g)) {
      openSheet({
        title: "Su perfil no puede exportar este reporte",
        sub: o.n,
        body: `<div class="bi-note warn">${icon("lock")}<div>Exportar a Excel es un permiso aparte de ver el reporte. Su perfil (${esc(rolEt())}) puede consultar en pantalla, pero no descargar.</div></div>
          <div class="field" style="margin-top:14px"><label>¿Para qué lo necesita?</label><textarea id="sMot" rows="3" placeholder="Ej.: comisiones del mes, reunión con proveeduría…" style="width:100%"></textarea></div>
          <div class="mut" style="font-size:12.5px;margin-top:10px">La solicitud llega a Autorización de excepciones, donde Gerencia la aprueba o la rechaza. Queda en la bitácora de exportaciones.</div>`,
        footer: `<button class="btn" id="sNo">Cancelar</button><div class="gap"></div><button class="btn pri" id="sSi">${icon("mail")}Solicitar permiso</button>`,
        after(el) {
          $("#sNo", el).addEventListener("click", closeSheet);
          $("#sSi", el).addEventListener("click", () => {
            BI.pedirPermiso("Descargar «" + o.n + "» a Excel; el rol de " + rolEt() + " solo puede verlo en pantalla", "Permiso de exportación", $("#sMot", el).value, "Reporte «" + o.n + "»");
            BI.HIST.unshift({
              cuando: "Hoy " + hora(new Date(D.HOY.getTime() + 3e5)),
              quien: rolEt(),
              rep: o.n,
              filas: 0,
              cols: 0,
              motivo: "Rechazada: sin permiso de exportación",
              ip: "10.20.4.18",
              rechazo: true,
            });
            closeSheet();
            toast(
              "Solicitud enviada",
              "Llegó a Autorización de excepciones; Gerencia responde por correo o en el sistema.",
              "ok",
            );
          });
        },
      });
      return;
    }
    const registra = (mot) => {
      BI.HIST.unshift({
        cuando: "Hoy " + hora(new Date(D.HOY.getTime() + 3e5)),
        quien: rolEt(),
        rep: o.n,
        filas: o.filas,
        cols: o.cols,
        motivo: mot || "—",
        ip: "10.20.4.18",
      });
    };
    if (o.sens || o.filas > 50000) {
      openSheet({
        title: "Antes de descargar",
        sub: o.n,
        body: `<div class="bi-note">${icon("shield")}<div>Este reporte trae <b>${grp(o.filas)} filas</b>${o.sens ? " con datos sensibles (costos, márgenes o datos personales)" : ""}. Escriba el motivo: queda registrado con su nombre, la hora y los filtros.</div></div>
          <div class="field" style="margin-top:14px"><label>Motivo</label><textarea id="sMot" rows="3" style="width:100%" placeholder="Ej.: revisión mensual de cartera con Crédito y cobro"></textarea></div>
          <ul class="mut" style="font-size:12.5px;line-height:1.7;margin:12px 0 0 18px"><li>El archivo solo trae las columnas visibles en pantalla.</li><li>Cédulas, teléfonos y correos salen enmascarados.</li><li>Lleva marca de agua con su usuario, fecha y número de exportación.</li></ul>`,
        footer: `<button class="btn" id="sNo">Cancelar</button><div class="gap"></div><button class="btn pri" id="sSi">${icon("download")}Descargar Excel</button>`,
        after(el) {
          $("#sNo", el).addEventListener("click", closeSheet);
          $("#sSi", el).addEventListener("click", () => {
            const mv = $("#sMot", el).value.trim();
            if (!mv) {
              $("#sMot", el).focus();
              toast(
                "Falta el motivo",
                "Escriba para qué necesita el archivo.",
                "warn",
              );
              return;
            }
            registra(mv);
            closeSheet();
            toast(
              "Excel listo",
              grp(o.filas) + " filas · quedó registrado quién lo descargó.",
              "ok",
            );
          });
        },
      });
      return;
    }
    registra();
    toast(
      "Excel listo",
      "Trae las mismas columnas de la pantalla · registrado en la bitácora.",
      "ok",
    );
  };

  function progSheet(r) {
    openSheet({
      title: "Programar «" + r.n + "»",
      sub: "Llega solo, sin que nadie lo pida",
      body: `<div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
        <div class="field"><label>Frecuencia</label><select id="pFr"><option>Diario</option><option selected>Semanal, lunes</option><option>Mensual, día 1</option></select></div>
        <div class="field"><label>Hora</label><input type="time" id="pHr" value="07:00"></div>
        <div class="field"><label>Se envía por</label><select id="pCa"><option>Correo</option><option>WhatsApp</option><option>Correo y WhatsApp</option></select></div>
        <div class="field"><label>Formato</label><select><option>PDF con gráfico</option><option>Excel (si tiene permiso)</option></select></div></div>
        <div class="field" style="margin-top:12px"><label>Destinatarios</label><input id="pDe" value="gerencia@ferreteriasantarosa.cr" style="width:100%"></div>
        <div class="bi-note" style="margin-top:14px">${icon("info")}<div>Cada envío usa los permisos de quien lo programó y corre de madrugada sobre la réplica.</div></div>`,
      footer: `<button class="btn" id="pNo">Cancelar</button><div class="gap"></div><button class="btn pri" id="pSi">Guardar programación</button>`,
      after(el) {
        $("#pNo", el).addEventListener("click", closeSheet);
        $("#pSi", el).addEventListener("click", () => {
          R.prog.unshift({
            id: r.id,
            cuando:
              $("#pFr", el).value +
              " " +
              $("#pHr", el).value +
              " → " +
              $("#pCa", el).value.toLowerCase(),
          });
          closeSheet();
          toast(
            "Reporte programado",
            $("#pFr", el).value + " a las " + $("#pHr", el).value,
            "ok",
          );
        });
      },
    });
  }
  function compSheet(r) {
    openSheet({
      title: "Compartir «" + r.n + "»",
      sub: "Con los filtros que tiene ahora",
      body: `<div class="field"><label>Enlace</label><input readonly value="https://servecore.ferreteriasantarosa.cr/r/${r.id}?p=a91f" style="width:100%"></div>
        <div class="bi-note ok" style="margin-top:14px">${icon("shield")}<div><b>El enlace no abre sesión.</b> Quien lo reciba debe iniciar sesión y tener permiso sobre este reporte; si no lo tiene, verá un aviso en lugar de los datos.</div></div>`,
      footer: `<button class="btn" id="cNo">Cerrar</button><div class="gap"></div><button class="btn pri" id="cSi">${icon("copy")}Copiar enlace</button>`,
      after(el) {
        $("#cNo", el).addEventListener("click", closeSheet);
        $("#cSi", el).addEventListener("click", () => {
          closeSheet();
          toast("Enlace copiado", "Solo sirve para quien tenga permiso.", "ok");
        });
      },
    });
  }
  function bloqueado(r) {
    openSheet({
      title: "Este reporte necesita autorización",
      sub: r.n,
      body: `<div class="bi-note warn">${icon("lock")}<div>«${esc(r.n)}» muestra ${r.g === G.a ? "información de control interno" : "costos o márgenes"}. Su perfil (${esc(rolEt())}) no lo tiene asignado.</div></div>
        <div class="mut" style="font-size:12.5px;margin-top:12px">Puede pedirle acceso a gerencia; cada acceso queda en la bitácora.</div>`,
      footer: `<button class="btn" id="bNo">Cerrar</button><div class="gap"></div><button class="btn pri" id="bSi">Solicitar acceso</button>`,
      after(el) {
        $("#bNo", el).addEventListener("click", closeSheet);
        $("#bSi", el).addEventListener("click", () => {
          BI.pedirPermiso("Ver el reporte «" + r.n + "»; no está asignado al rol de " + rolEt(), "Acceso a reporte", "", "Reporte «" + r.n + "»");
          closeSheet();
          toast("Solicitud enviada", "Gerencia la verá en Autorización de excepciones.", "ok");
        });
      },
    });
  }

  A.screen("reportes", {
    title: () => (R.vista === "lista" ? "Todos los reportes" : R.rep.n),
    sub: () =>
      R.vista === "lista"
        ? "Un solo lugar: elija el reporte, ajuste los filtros y genere"
        : R.vista === "filtros"
          ? R.rep.d
          : R.vista === "cargando"
            ? "Un momento…"
            : R.rep.d,
    /* migas de pan: cada nivel anterior es un botón para volver a él */
    trail: () => {
      if (R.vista === "lista") return null;
      const lista = {
        t: "Todos los reportes",
        fn: () => {
          R.vista = "lista";
          A.refresh();
        },
      };
      if (R.vista === "resultado")
        return [
          lista,
          {
            t: R.rep.n,
            fn: () => {
              R.vista = "filtros";
              A.refresh();
            },
          },
          { t: "Resultado" },
        ];
      return [lista, { t: R.rep.n }];
    },
    extra: () => {
      if (R.vista === "lista")
        return `<span class="mut" style="font-size:12.5px">Ver como</span>${seg(
          "rRol",
          [
            { v: "gerencia", t: "Gerencia" },
            { v: "bodega", t: "Bodega" },
            { v: "cajero", t: "Mostrador" },
          ],
          S.role,
        )}`;
      const volver = `<button class="btn" id="rBack">← ${R.vista === "resultado" ? "Volver a los filtros" : "Todos los reportes"}</button>`;
      if (R.vista !== "resultado") return volver;
      const fav = R.fav.indexOf(R.rep.id) >= 0;
      return `${volver}<button class="btn pri" id="rXls">${icon(BI.puedeExportar(R.rep.g) ? "download" : "lock")}Exportar a Excel</button><button class="btn" id="rFav" aria-pressed="${fav}">${fav ? "★ En favoritos" : "☆ Favorito"}</button><button class="btn" id="rProgB">${icon("clock")}Programar</button><button class="btn" id="rComp">${icon("link")}Compartir</button><button class="btn" id="rPrint">${icon("print")}PDF</button>`;
    },
    prep(arg) {
      if (arg && catBy(arg)) {
        BI.abrir(arg);
        S.arg = null;
      }
    },
    render(v) {
      v.innerHTML =
        R.vista === "lista"
          ? vistaLista()
          : R.vista === "filtros"
            ? vistaFiltros()
            : R.vista === "cargando"
              ? vistaCargando()
              : vistaResultado();
    },
    wire(v) {
      const rf = () => A.refresh();
      const back = $("#rBack");
      if (back)
        back.addEventListener("click", () => {
          R.vista = R.vista === "resultado" ? "filtros" : "lista";
          rf();
        });
      if (R.vista === "lista") {
        onSeg(document, "rRol", (x) => {
          S.role = x;
          rf();
        });
        const q = $("#rq", v);
        q.addEventListener("input", () => {
          R.q = q.value;
          const pos = q.selectionStart;
          rf();
          const n = $("#rq");
          n.focus();
          n.setSelectionRange(pos, pos);
        });
        $$("[data-grp]", v).forEach((b) =>
          b.addEventListener("click", () => {
            R.grupo = b.dataset.grp;
            rf();
          }),
        );
        $$("[data-rep]", v).forEach((b) =>
          b.addEventListener("click", () => {
            const r = catBy(b.dataset.rep);
            if (!acceso(r)) return bloqueado(r);
            BI.abrir(r.id);
            rf();
          }),
        );
        $$("[data-fav]", v).forEach((b) =>
          b.addEventListener("click", () => {
            const i = R.fav.indexOf(b.dataset.fav);
            if (i >= 0) R.fav.splice(i, 1);
            else R.fav.push(b.dataset.fav);
            rf();
          }),
        );
        A.wireIr(v);
      } else if (R.vista === "filtros") {
        const f = R.f;
        $$("[data-pre]", v).forEach((b) =>
          b.addEventListener("click", () => {
            f.preset = b.dataset.pre;
            if (PRE[f.preset]) {
              f.desde = PRE[f.preset][0];
              f.hasta = PRE[f.preset][1];
            }
            rf();
          }),
        );
        [
          ["fd", "desde"],
          ["fh", "hasta"],
        ].forEach((p) =>
          $("#" + p[0], v).addEventListener("change", (e) => {
            f[p[1]] = e.target.value || f[p[1]];
            f.preset = "Personalizado";
            rf();
          }),
        );
        [
          ["fl", "local"],
          ["ff", "familia"],
          ["fa", "agrupar"],
          ["fc", "comparar"],
          ["fk", "cond"],
          ["fv", "vend"],
        ].forEach((p) => {
          const el = $("#" + p[0], v);
          if (el)
            el.addEventListener("change", (e) => {
              f[p[1]] = e.target.value;
              rf();
            });
        });
        $("#rGo", v).addEventListener("click", () => {
          if (errFecha(f)) return;
          if (R.rec.indexOf(R.rep.id) < 0) R.rec.unshift(R.rep.id);
          if (pesado(f)) {
            BI.DESC.unshift({
              id: "D" + (BI.DESC.length + 1),
              n: R.rep.n,
              alcance:
                (f.local === "Todos" ? "Los 7 locales" : f.local) +
                " · " +
                fechaC(f.desde) +
                " a " +
                fechaC(f.hasta) +
                " · por " +
                (f.agrupar || "categoría").toLowerCase(),
              filas: filasEst(f),
              inicio: Date.now(),
              dur: 45000,
              tipo: "Reporte",
              quien: "Andrey",
            });
            R.vista = "lista";
            rf();
            toast(
              "Lo estamos preparando",
              "Puede seguir trabajando. Lo verá listo en «Mis descargas».",
              "ok",
            );
            return;
          }
          R.vista = "cargando";
          rf();
          const pasos = [
            "Reuniendo ventas de 7 locales…",
            "Aplicando filtros…",
            "Armando el gráfico…",
          ];
          setTimeout(() => {
            const p = $("#rProg");
            if (p) p.style.width = "92%";
          }, 60);
          pasos.forEach((t, i) =>
            setTimeout(() => {
              const e = $("#rProgTxt");
              if (e) e.textContent = t;
            }, i * 500),
          );
          setTimeout(() => {
            if (R.vista === "cargando") {
              R.vista = "resultado";
              R.cmp = true;
              if (S.screen === "reportes") rf();
            }
          }, 1600);
        });
      } else if (R.vista === "resultado") {
        $("#rCambiar", v).addEventListener("click", () => {
          R.vista = "filtros";
          rf();
        });
        onSeg(v, "rMet", (x) => {
          R.met = +x;
          R.orden = null;
          rf();
        });
        const cm = $("#rCmp", v);
        if (cm)
          cm.addEventListener("click", () => {
            R.cmp = !R.cmp;
            rf();
          });
        const bq = $("#rBq", v);
        bq.addEventListener("input", () => {
          R.bq = bq.value;
          const p = bq.selectionStart;
          rf();
          const n = $("#rBq");
          n.focus();
          n.setSelectionRange(p, p);
        });
        $$("th", v).forEach((th, i) => {
          th.style.cursor = "pointer";
          th.setAttribute("tabindex", "0");
          const go = () => {
            const k = i - 1;
            if (R.orden === k) R.asc = !R.asc;
            else {
              R.orden = k;
              R.asc = false;
            }
            rf();
          };
          th.addEventListener("click", go);
          th.addEventListener("keydown", (e) => {
            if (e.key === "Enter") go();
          });
        });
        $("#rXls").addEventListener("click", () => {
          const rows = genRows(R.rep, R.f);
          BI.exportar({
            n: R.rep.n,
            g: R.rep.g,
            filas:
              R.rep.sens || R.rep.id === "antig"
                ? Math.max(rows.length * 900, 12000)
                : rows.length,
            cols: metricasDe(R.rep).length + 1,
            sens: !!R.rep.sens,
          });
        });
        $("#rFav").addEventListener("click", () => {
          const i = R.fav.indexOf(R.rep.id);
          if (i >= 0) R.fav.splice(i, 1);
          else R.fav.push(R.rep.id);
          rf();
        });
        $("#rProgB").addEventListener("click", () => progSheet(R.rep));
        $("#rComp").addEventListener("click", () => compSheet(R.rep));
        $("#rPrint").addEventListener("click", () =>
          toast(
            "PDF preparado",
            "Con el gráfico, los filtros y la marca de quién lo pidió.",
            "ok",
          ),
        );
      }
    },
  });

  /* ═══════════════════════════════════════════════════════════════
     PREGUNTAS EN LENGUAJE NATURAL (REP-005)
     ═══════════════════════════════════════════════════════════════ */
  let nlQ = "",
    nlRes = null;
  const HIST_NL = [
    "Ventas por local de los últimos 7 días",
    "Clientes con saldo vencido de más de 60 días",
  ];
  const EJEMPLOS = [
    "Ventas por local de los últimos 7 días",
    "Ventas de cemento en los últimos 3 meses por local",
    "Artículos que se vendieron bajo el margen mínimo",
    "Los 10 artículos más vendidos del mes",
    "Clientes con saldo vencido de más de 60 días",
    "Compras por proveedor de este mes",
    "Artículos en quiebre con existencia en el CEDI",
  ];
  /* lo que el sistema entendió de la frase, en fichas que el usuario puede corregir */
  function interpreta(q) {
    const n = norm(q);
    const ch = [];
    const met = /(margen|utilidad)/.test(n)
      ? "Margen"
      : /(compra|proveedor)/.test(n)
        ? "Compras"
        : /(saldo|vencid|mora|cobrar)/.test(n)
          ? "Cartera"
          : /(quiebre|agotad|existencia|inventario)/.test(n)
            ? "Inventario"
            : "Ventas";
    ch.push(["Qué", met]);
    const per = /hoy/.test(n)
      ? "Hoy"
      : /7 dias|semana/.test(n)
        ? "Últimos 7 días"
        : /3 meses|trimestre/.test(n)
          ? "Últimos 3 meses"
          : /ano|año/.test(n)
            ? "Este año"
            : /mes/.test(n)
              ? "Este mes"
              : "Período visible";
    ch.push(["Período", per]);
    const loc = D.tiendas.find((l) => n.indexOf(norm(l.nom)) >= 0);
    ch.push(["Dónde", loc ? loc.nom : "Todos los locales"]);
    const fam =
      FAMS.find((f) =>
        norm(f.nom)
          .split(/\s+/)
          .some((t) => t.length > 4 && n.indexOf(t) >= 0),
      ) || (/cemento|varilla|bloque/.test(n) ? FAMS[0] : null);
    if (fam) ch.push(["Familia", fam.nom]);
    ch.push([
      "Agrupado por",
      /vendedor/.test(n)
        ? "Vendedor"
        : /familia/.test(n)
          ? "Familia"
          : /proveedor/.test(n)
            ? "Proveedor"
            : "Local",
    ]);
    return ch;
  }
  function resolver(q) {
    const n = norm(q);
    const ch = interpreta(q);
    const fam = ch.find((x) => x[0] === "Familia");
    if (
      fam &&
      /(local|venta|cemento|varilla|bloque)/.test(n) &&
      !/(margen minimo|bajo el margen)/.test(n)
    ) {
      const per = ch.find((x) => x[0] === "Período")[1];
      const rows = D.tiendas
        .map((l) => ({
          n: l.nom,
          v:
            BASE_DIA *
            30 *
            LW[l.id] *
            0.16 *
            (per === "Últimos 3 meses"
              ? 3
              : per === "Últimos 7 días"
                ? 0.23
                : 1) *
            jit("nl" + l.id + fam[1], 0.8, 1.25),
        }))
        .sort((a, b) => b.v - a.v);
      return {
        lee:
          "Venta de la familia «" +
          fam[1] +
          "» por local, " +
          per.toLowerCase(),
        grafico: bars(rows.map((r) => ({ n: r.n, v: r.v, lab: grp(r.v) }))),
        resumen: `Total: ${c(suma(rows, (r) => r.v))}. ${rows[0].n} lidera con el ${dec((rows[0].v / suma(rows, (r) => r.v)) * 100, 0)} %.`,
      };
    }
    if (/(margen minimo|bajo el margen|bajo costo|perdida)/.test(n)) {
      const rows = D.bajoMinimo().slice(0, 40);
      return {
        lee: "Líneas de venta cuyo margen quedó por debajo del mínimo de su familia, en todos los locales",
        tabla: table({
          h: "48dvh",
          cols: [
            { t: "Documento", cls: "mono", fmt: (r) => esc(r.doc.cons) },
            { t: "Local", fmt: (r) => esc(locNom(r.doc.locId)) },
            { t: "Vendedor", fmt: (r) => esc(r.doc.vendedor) },
            { t: "Artículo", fmt: (r) => esc(r.art.desc) },
            { t: "Familia", fmt: (r) => esc(D.famById[r.art.fam].nom) },
            { t: "Mínimo", r: true, cls: "mono", fmt: (r) => r.min + " %" },
            {
              t: "Aplicado",
              r: true,
              cls: "mono",
              fmt: (r) => `<b style="color:var(--crit)">${dec(r.margen)} %</b>`,
            },
            {
              t: "No percibido",
              r: true,
              cls: "mono",
              fmt: (r) => grp(Math.max(0, r.perdida)),
            },
          ],
          rows,
        }),
        resumen: `${rows.length} líneas por debajo del mínimo. Utilidad no percibida: ${c(rows.reduce((s, r) => s + Math.max(0, r.perdida), 0))}.`,
      };
    }
    if (/(mas vendido|top|mejores articulos|rotacion)/.test(n)) {
      const acc = {};
      D.documentos.forEach((d) => {
        if (d.tipo === "NC") return;
        d.lineas.forEach((l) => {
          acc[l.artId] = (acc[l.artId] || 0) + l.cant * l.precio;
        });
      });
      const rows = Object.keys(acc)
        .map((id) => ({ a: artOf(id), v: acc[id] }))
        .sort((x, y) => y.v - x.v)
        .slice(0, 10);
      return {
        lee: "Artículos ordenados por monto vendido en el período visible",
        grafico: bars(
          rows.map((r) => ({ n: r.a.desc, v: r.v, lab: grp(r.v) })),
        ),
      };
    }
    if (/(vencid|mora|cobrar)/.test(n)) {
      const rows = D.documentos
        .filter((d) => d.saldo > 0)
        .map((d) => {
          const p = D.cliById[d.clienteId] ? D.cliById[d.clienteId].plazo : 30;
          return { d, v: Math.floor((D.HOY - d.fecha) / 86400000) - p };
        })
        .filter((x) => x.v > 30)
        .sort((a, b) => b.v - a.v);
      return {
        lee: "Documentos con saldo cuya antigüedad supera el plazo pactado del cliente en más de 30 días",
        tabla: table({
          h: "48dvh",
          cols: [
            { t: "Cliente", fmt: (r) => esc(cliNom(r.d.clienteId)) },
            { t: "Documento", cls: "mono", fmt: (r) => esc(r.d.cons) },
            { t: "Emitida", cls: "mono", fmt: (r) => fecha(r.d.fecha) },
            {
              t: "Días vencida",
              r: true,
              cls: "mono",
              fmt: (r) => `<b style="color:var(--crit)">${r.v}</b>`,
            },
            { t: "Saldo", r: true, cls: "mono", fmt: (r) => grp(r.d.saldo) },
          ],
          rows,
        }),
        resumen: `${rows.length} documentos vencidos por ${c(rows.reduce((s, r) => s + r.d.saldo, 0))}.`,
      };
    }
    if (/(quiebre|agotad|sin existencia|faltante)/.test(n)) {
      const rows = D.quiebres()
        .filter((x) => x.tipo === "Quiebre" && D.disp(x.art.id, "CD") > 0)
        .slice(0, 40);
      return {
        lee: "Artículos con disponible en cero en una tienda que sí tienen existencia en el CEDI Isabel",
        tabla: table({
          h: "48dvh",
          cols: [
            {
              t: "Artículo",
              fmt: (r) =>
                `${esc(r.art.desc)}<span class="sub">${esc(r.art.cod)}</span>`,
            },
            { t: "Local", fmt: (r) => esc(locNom(r.locId)) },
            {
              t: "Disponible",
              r: true,
              cls: "mono",
              fmt: (r) =>
                `<b style="color:var(--crit)">${r.e.cant - r.e.comp}</b>`,
            },
            { t: "Mínimo", r: true, cls: "mono", fmt: (r) => r.e.min },
            {
              t: "Hay en el CEDI",
              r: true,
              cls: "mono",
              fmt: (r) =>
                `<b style="color:var(--ok)">${grp(D.disp(r.art.id, "CD"))}</b>`,
            },
          ],
          rows,
        }),
        resumen: `${rows.length} quiebres que se resuelven con un traslado desde el CEDI.`,
        accion: `<button class="btn pri" id="nlTras">${icon("route")}Crear el traslado</button>`,
      };
    }
    if (/(compra|proveedor)/.test(n)) {
      const acc = {};
      D.compras.forEach((o) => {
        acc[o.provId] = (acc[o.provId] || 0) + o.total;
      });
      const rows = Object.keys(acc)
        .map((id) => ({ n: provNom(id), v: acc[id] }))
        .sort((a, b) => b.v - a.v);
      return {
        lee: "Monto comprado por proveedor en las órdenes registradas",
        grafico: bars(rows.map((r) => ({ n: r.n, v: r.v, lab: grp(r.v) }))),
      };
    }
    const vpl = D.ventaPorLocal();
    return {
      lee: "Venta del día por punto de venta, sumando facturas y tiquetes electrónicos",
      grafico: bars(
        vpl.map((x) => ({ n: x.loc.nom, v: x.total, lab: grp(x.total) })),
      ),
      resumen: `Total del día: ${c(vpl.reduce((s, x) => s + x.total, 0))} en ${vpl.reduce((s, x) => s + x.n, 0)} documentos.`,
    };
  }

  function pintaNL() {
    const box = $("#nlbox");
    if (!box) return;
    const ch = interpreta(nlQ);
    const g = /(margen|bajo costo|utilidad|perdida)/.test(norm(nlQ))
      ? G.v
      : /(saldo|vencid|cobrar)/.test(norm(nlQ))
        ? G.r
        : /(compra|proveedor)/.test(norm(nlQ))
          ? G.c
          : /(quiebre|inventario)/.test(norm(nlQ))
            ? G.i
            : G.v;
    box.innerHTML = card({
      title: "Resultado",
      actions: `${tag("Armado a partir de su pregunta", "acc", "sparkle")}<button class="btn" id="nlXls">${icon(BI.puedeExportar(g) ? "download" : "lock")}Exportar</button><button class="btn" id="nlSave">Guardar como reporte</button>`,
      body: `<div style="padding-bottom:12px;border-bottom:1px solid var(--hair-2)">
          <div style="display:flex;gap:10px;align-items:flex-start">${icon("info")}<div style="font-size:12.5px;color:var(--ink-2);line-height:1.55"><b>Esto es lo que entendí.</b> ${esc(nlRes.lee)}. Si algo no es lo que buscaba, ajuste los filtros o reescriba la pregunta.</div></div>
          <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px;align-items:center">${ch.map((x) => `<span class="tag mu"><span class="mut" style="margin-right:4px">${esc(x[0])}:</span><b>${esc(x[1])}</b></span>`).join("")}<button class="btn sm" id="nlAdj">${icon("filter")}Ajustar filtros</button></div></div>
        <div style="margin:0 -17px">${nlRes.grafico ? `<div style="padding:12px 17px 0">${nlRes.grafico}</div>` : ""}${nlRes.tabla || ""}</div>
        ${nlRes.resumen ? `<div style="padding-top:12px;margin-top:12px;border-top:1px solid var(--hair-2);font-size:13px;font-weight:600;display:flex;gap:12px;align-items:center;flex-wrap:wrap">${esc(nlRes.resumen)}<span class="gap" style="flex:1"></span>${nlRes.accion || ""}</div>` : ""}`,
    });
    $("#nlAdj").addEventListener("click", () => {
      BI.abrir("ventas", {
        local:
          ch.find((x) => x[0] === "Dónde")[1] !== "Todos los locales"
            ? ch.find((x) => x[0] === "Dónde")[1]
            : "Todos",
        familia: (ch.find((x) => x[0] === "Familia") || [0, "Todas"])[1],
      });
      A.go("reportes");
    });
    $("#nlXls").addEventListener("click", () =>
      BI.exportar({ n: "Consulta: " + nlQ, g, filas: 40, cols: 6 }),
    );
    $("#nlSave").addEventListener("click", () => {
      toast(
        "Guardado en Todos los reportes",
        "Quedó en «Favoritos» con el nombre de su pregunta.",
        "ok",
      );
    });
    const t = $("#nlTras");
    if (t) t.addEventListener("click", () => A.go("traslados"));
  }

  A.screen("preguntas", {
    title: "Pregúntele a ServeCore",
    sub: () =>
      "Escriba lo que necesita saber y el reporte se arma solo · sin depender de reportes preprogramados",
    render(v) {
      v.innerHTML = `<div class="wrap">
        ${card({
          body: `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <div class="tb-search" style="flex:1;min-width:260px;padding:12px 15px">${icon("sparkle")}
              <input id="nlq" placeholder="Pregunte como se lo preguntaría a un compañero" value="${esc(nlQ)}" style="font-size:15px" autocomplete="off"></div>
            <button class="btn pri big" id="nlgo">Consultar</button></div>
          <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:12px">
            ${EJEMPLOS.map((e) => `<button class="btn sm" data-ej="${esc(e)}">${esc(e)}</button>`).join("")}</div>
          <div class="bi-note" style="margin-top:14px">${icon("shield")}<div>La consulta corre sobre la <b>réplica de lectura</b>, nunca contra la base que atiende la caja. Una pregunta pesada no puede frenar los siete locales, y siempre se le muestra lo que se entendió para que usted lo corrija.</div></div>`,
        })}
        <div id="nlbox">${
          nlRes
            ? ""
            : card({
                body: empty(
                  "sparkle",
                  "Haga una pregunta",
                  "El sistema arma la consulta, la ejecuta sobre la réplica y le muestra el gráfico o la tabla, junto con lo que entendió.",
                ),
              })
        }</div>
        ${card({ title: "Preguntas recientes", body: `<div class="reclist">${HIST_NL.map((h) => `<button class="rec" data-ej="${esc(h)}" style="text-align:left;width:100%"><span style="display:flex;color:var(--ink-4)">${icon("history")}</span><div style="flex:1;font-size:13.5px">${esc(h)}</div>${icon("chev", 'style="color:var(--ink-4)"')}</button>`).join("")}</div>` })}
      </div>`;
      if (nlRes) pintaNL();
    },
    wire(v) {
      const run = () => {
        nlQ = $("#nlq", v).value.trim();
        if (!nlQ) return;
        nlRes = resolver(nlQ);
        if (HIST_NL.indexOf(nlQ) < 0) HIST_NL.unshift(nlQ);
        A.refresh();
      };
      $("#nlgo", v).addEventListener("click", run);
      $("#nlq", v).addEventListener("keydown", (e) => {
        if (e.key === "Enter") run();
      });
      $$("[data-ej]", v).forEach((b) =>
        b.addEventListener("click", () => {
          nlQ = b.dataset.ej;
          nlRes = resolver(nlQ);
          A.refresh();
        }),
      );
    },
  });
})(window);
