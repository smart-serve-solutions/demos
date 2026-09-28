/* ═══════════════════════════════════════════════════════════════
   Reportería y BI — parte 2 (control)
   Mis descargas y reportes en curso (REP-003, REP-004).
   Las alertas y los permisos de exportación viven en Sistema: ver
   mod-sys-bi.js. Depende de mod-bi.js (window.BI). Todo es demostración.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, S = w.S, U = w.UI, BI = w.BI;
  const { $, $$, esc, grp, c, dec, hora, icon, tag, card, stat, table, seg, onSeg, openSheet, closeSheet, toast, empty } = U;

  /* ═══ MIS DESCARGAS Y REPORTES EN CURSO ═════════════════════ */
  BI.DESC.push({ id: "DF", n: "Estado de resultados comparativo", alcance: "Los 7 locales · 2016 a 2026 · por mes", filas: 9800000, inicio: Date.now() - 900000, dur: 30000, tipo: "Reporte", quien: "Andrey", falla: true });
  let dTimer = null;
  const estDesc = d => {
    if (d.cancelado) return { k: "mu", t: "Cancelado", p: 0 };
    if (d.falla) return { k: "crit", t: "No se pudo preparar", p: 0, ic: "alert" };
    if (d.listo || Date.now() - d.inicio >= d.dur) return { k: "ok", t: "Listo", p: 100, ic: "check" };
    const p = Math.min(99, Math.round((Date.now() - d.inicio) / d.dur * 100));
    return p < 4 ? { k: "mu", t: "En cola", p, ic: "clock" } : { k: "acc", t: "Preparando " + p + " %", p, ic: "clock" };
  };
  const tiempoRest = d => { const s = Math.max(0, Math.round((d.dur - (Date.now() - d.inicio)) / 1000)); return s > 60 ? "≈ " + Math.round(s / 60) + " min" : s + " s"; };
  function tablaDesc() {
    const rows = BI.DESC.slice();
    return table({ cols: [
      { t: "Qué pidió", fmt: d => `<b>${esc(d.n)}</b><span class="sub">${esc(d.alcance)}</span>` },
      { t: "Tamaño", r: true, cls: "mono", fmt: d => grp(d.filas) + " filas" },
      { t: "Estado", fmt: d => { const e = estDesc(d); return tag(e.t, e.k, e.ic) + (e.p > 0 && e.p < 100 ? `<div style="margin-top:6px;width:130px;height:5px;background:var(--surface-3);border-radius:4px;overflow:hidden"><div style="width:${e.p}%;height:100%;background:var(--accent)"></div></div>` : ""); } },
      { t: "Falta", r: true, cls: "mono", fmt: d => { const e = estDesc(d); return e.p > 0 && e.p < 100 ? tiempoRest(d) : "—"; } },
      { t: "", r: true, fmt: d => { const e = estDesc(d);
        if (d.falla) return `<button class="btn sm" data-reint="${d.id}">Reintentar</button> <button class="btn sm" data-porq="${d.id}">¿Qué pasó?</button>`;
        if (e.t === "Listo") return `<button class="btn sm pri" data-abrir="${d.id}">Abrir</button>`;
        if (e.t === "Cancelado") return "";
        return `<button class="btn sm" data-canc="${d.id}">Cancelar</button>`; } }
    ], rows });
  }
  function cablearDesc(v) {
    $$("[data-abrir]", v).forEach(b => b.addEventListener("click", () => { const d = BI.DESC.find(x => x.id === b.dataset.abrir); toast("Abriendo «" + d.n + "»", "Se ve en pantalla con gráfico primero; el Excel se pide desde ahí si tiene permiso.", "ok"); }));
    $$("[data-canc]", v).forEach(b => b.addEventListener("click", () => { BI.DESC.find(x => x.id === b.dataset.canc).cancelado = true; toast("Reporte cancelado", "No consumió nada de la caja.", "ok"); A.refresh(); }));
    $$("[data-reint]", v).forEach(b => b.addEventListener("click", () => { const d = BI.DESC.find(x => x.id === b.dataset.reint); d.falla = false; d.inicio = Date.now(); d.dur = 40000; toast("Reintentando", "Vuelve a la cola de la réplica.", "ok"); A.refresh(); }));
    $$("[data-porq]", v).forEach(b => b.addEventListener("click", () => openSheet({
      title: "Así se le explica un problema", sub: "Sin códigos ni mensajes técnicos",
      body: `<div class="bi-note crit">${icon("alert")}<div><b>No pudimos preparar este reporte.</b><br>Sus ventas, facturas y compras no se afectaron: ninguno de los 7 locales lo notó.<br><br><b>Qué puede hacer:</b> pruebe con un período más corto o vuelva a intentarlo en unos minutos.</div></div>
        <div class="mut" style="font-size:12.5px;margin-top:14px">Referencia para Sistemas: <span class="mono">R-20260913-0412</span> · ya se les avisó.</div>`,
      footer: `<button class="btn" id="qCer">Cerrar</button>`, after(s) { $("#qCer", s).addEventListener("click", closeSheet); } })));
  }
  A.workspace("bi-descargas", {
    title: "Mis descargas y reportes en curso",
    sub: "Lo que pidió: reportes grandes en segundo plano y archivos de Excel",
    tabs: [
      { id: "curso", t: "En curso y listos", badge: () => ({ n: BI.DESC.filter(d => estDesc(d).t.indexOf("Preparando") === 0 || estDesc(d).t === "En cola").length, k: "", l: "en preparación" }),
        render: el => { el.innerHTML = `<div class="wrap">
          <div class="bi-note">${icon("shield")}<div>Los reportes grandes se preparan en la <b>réplica de lectura</b>, uno tras otro y con menos prioridad que la caja. Puede cerrar esta pantalla o seguir vendiendo: le avisamos con la campana al terminar.</div></div>
          ${card({ body: `<div id="dTab">${tablaDesc()}</div>` })}</div>`; },
        wire: v => {
          cablearDesc(v);
          clearInterval(dTimer);
          dTimer = setInterval(() => { const t = $("#dTab"); if (!t || S.screen !== "bi-descargas") { clearInterval(dTimer); return; } t.innerHTML = tablaDesc(); cablearDesc(t); }, 1500);
        } },
      { id: "hist", t: "Historial de exportaciones", sub: "Quién descargó qué a Excel, con cuántas filas y con qué motivo",
        render: el => { el.innerHTML = `<div class="wrap"><div class="bi-note">${icon("clip")}<div>Cada descarga queda registrada de forma que no se puede borrar. Las rechazadas por falta de permiso también aparecen.</div></div>
          ${card({ body: table({ cols: [
            { t: "Cuándo", fmt: r => esc(r.cuando) }, { t: "Quién", fmt: r => esc(r.quien) }, { t: "Qué", fmt: r => esc(r.rep) },
            { t: "Filas × columnas", r: true, cls: "mono", fmt: r => r.rechazo ? "—" : grp(r.filas) + " × " + r.cols }, { t: "Motivo", fmt: r => r.rechazo ? tag("Rechazada por permiso", "crit", "lock") : esc(r.motivo) }, { t: "Equipo", cls: "mono", fmt: r => esc(r.ip) }], rows: BI.HIST }) })}</div>`; } }
    ]
  });
})(window);
