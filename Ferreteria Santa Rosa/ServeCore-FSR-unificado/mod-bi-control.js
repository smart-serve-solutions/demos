/* ═══════════════════════════════════════════════════════════════
   Reportería y BI — parte 2 (control)
   Alertas por evento crítico (REP-006), Mis descargas y reportes en
   curso (REP-003, REP-004) y Permisos de exportación y réplica de
   lectura (REP-003, REP-004, INF-003, INF-005).
   Depende de mod-bi.js (window.BI). Todo es demostración.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, S = w.S, U = w.UI, BI = w.BI;
  const { $, $$, esc, grp, c, dec, hora, icon, tag, card, stat, table, seg, onSeg, openSheet, closeSheet, toast, empty } = U;

  (function () {
    const st = document.createElement("style");
    st.textContent = `
    .bi-sw{width:42px;height:24px;border-radius:14px;background:var(--surface-3);border:1px solid var(--hair);position:relative;flex:none;cursor:pointer;transition:background .15s}
    .bi-sw i{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:var(--surface);box-shadow:var(--shadow-sm);transition:left .15s}
    .bi-sw[aria-checked="true"]{background:var(--ok);border-color:var(--ok)}
    .bi-sw[aria-checked="true"] i{left:20px}
    .bi-sw[disabled]{opacity:.55;cursor:not-allowed}
    .bi-set{display:flex;gap:14px;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--hair-2)}
    .bi-set:last-child{border-bottom:0}
    .bi-set .t{font-size:13.5px;font-weight:650}.bi-set .s{font-size:12.5px;color:var(--ink-3);line-height:1.45;margin-top:2px}
    .bi-al{display:flex;gap:14px;padding:16px 18px;border-left:4px solid var(--crit)}
    .bi-al.warn{border-left-color:var(--warn)}
    .bi-flow{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:10px;align-items:center}
    .bi-box{border:1px solid var(--hair);border-radius:12px;padding:12px 14px;background:var(--surface);font-size:13px;line-height:1.45}
    .bi-box.ok{border-color:var(--ok);background:var(--ok-soft)}
    .bi-arrow{color:var(--ink-4);font-size:20px;text-align:center}
    @media (max-width:800px){.bi-flow{grid-template-columns:1fr}.bi-arrow{transform:rotate(90deg)}}
    .bi-perm select{padding:5px 6px;border-radius:8px;border:1px solid var(--hair);background:var(--surface);font-size:12.5px;max-width:132px}
    .bi-chip{display:inline-flex;padding:4px 10px;border-radius:14px;border:1px solid var(--hair);background:var(--surface);font-size:12.5px;font-family:"IBM Plex Mono",monospace;margin:3px}
    .bi-chip.f{border-color:var(--accent);background:var(--accent-soft)}
    `;
    document.head.appendChild(st);
  })();
  const sw = (id, on, dis) => `<button type="button" class="bi-sw" role="switch" id="${id}" aria-checked="${on}" ${dis ? "disabled" : ""}><i></i></button>`;
  const sevTag = s => s === "crit" ? tag("Crítica", "crit", "alert") : tag("Atención", "warn", "alert");
  const ts = () => hora(new Date(D.HOY.getTime() + 3e5));

  /* ═══ ALERTAS ═══════════════════════════════════════════════ */
  const REGLAS = [
    { ev: "Cambio de costo fuera de rango", cuando: "El costo nuevo varía más de este porcentaje contra el anterior, o es menor al 10 % del histórico", val: "30", u: "%", quien: "Proveeduría y gerencia", can: [1, 1, 1], on: true, nota: "Bloquea la vigencia del costo hasta que alguien lo confirme o lo revierta." },
    { ev: "Venta bajo costo activada", cuando: "Una factura sale con margen menor a este valor", val: "0", u: "%", quien: "Gerencia y contabilidad", can: [1, 0, 1], on: true, nota: "Muestra las facturas afectadas y pide reversar la casilla." },
    { ev: "Casilla sin reversar", cuando: "Una casilla de excepción sigue abierta más de estos minutos, o al cerrar el turno", val: "15", u: "min", quien: "Jefe de local y contabilidad", can: [1, 1, 0], on: true, nota: "La casilla ya no se queda abierta después de aplicar la factura." },
    { ev: "Fallo de envío a Hacienda", cuando: "Un comprobante es rechazado o pasa estos minutos sin respuesta", val: "10", u: "min", quien: "Contabilidad y TI", can: [1, 0, 1], on: true, nota: "Permite corregir, reenviar o pasar a contingencia desde la alerta." },
    { ev: "Exportación masiva", cuando: "Alguien exporta más de esta cantidad de filas de una vez", val: "20000", u: "filas", quien: "Gerencia y Sistemas", can: [1, 1, 0], on: true, nota: "Aviso inmediato aunque tenga permiso." },
    { ev: "Consulta que tarda demasiado", cuando: "Una consulta supera estos minutos en la réplica", val: "20", u: "min", quien: "Sistemas", can: [1, 0, 0], on: false, nota: "Se cancela sola al llegar al tiempo máximo." }
  ];

  function pintaAlertas(el) {
    const pend = BI.ALERTAS.filter(a => a.est !== "Resuelta");
    if (!pend.length) { el.innerHTML = card({ body: empty("check", "Todo en orden", "Sin eventos críticos por atender. Las alertas nuevas aparecen aquí y en la pantalla de oficina.") }); return; }
    el.innerHTML = `<div class="wrap">
      <div class="grid g4">${stat("Críticas", String(pend.filter(a => a.sev === "crit").length), { txt: "requieren acción hoy", dir: "down" }, "var(--crit)")}
        ${stat("De atención", String(pend.filter(a => a.sev === "warn").length), { txt: "con plazo corto", dir: "" }, "var(--warn)")}
        ${stat("En atención", String(pend.filter(a => a.est === "En atención").length), { txt: "alguien ya las tomó", dir: "" })}
        ${stat("Resueltas esta semana", String(BI.RESUELTAS.length + 9), { txt: "tiempo medio 12 min", dir: "up" }, "var(--ok)")}</div>
      ${pend.map(a => `<div class="card"><div class="bi-al ${a.sev === "warn" ? "warn" : ""}" data-al="${a.id}">
        <div style="flex:1;min-width:0"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px">${sevTag(a.sev)}<span class="mut" style="font-size:12.5px;font-weight:650">${esc(a.ev)}</span>${tag(a.est, a.est === "En atención" ? "acc" : "mu")}</div>
          <div style="font-size:15px;font-weight:700;line-height:1.35">${esc(a.t)}</div>
          <div class="mut" style="font-size:13px;line-height:1.5;margin-top:4px">${esc(a.d)}</div>
          <div class="mut" style="font-size:12.5px;margin-top:8px">${esc(a.loc)} · avisa a ${esc(a.quien)} · ${esc(a.hace)}</div></div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:stretch;min-width:170px">
          <button class="btn pri" data-act="${a.id}">${esc(a.accion)}</button>
          ${a.est === "Nueva" ? `<button class="btn" data-tom="${a.id}">Tomar la alerta</button>` : ""}
          <button class="btn" data-res="${a.id}">Marcar resuelta</button></div></div></div>`).join("")}</div>`;
    $$("[data-act]", el).forEach(b => b.addEventListener("click", () => { const a = BI.ALERTAS.find(x => x.id === b.dataset.act); if (a.ir && A.screens[a.ir]) A.go(a.ir); else toast(a.accion, "Se avisó a " + a.quien + " de " + a.loc + ".", "ok"); }));
    $$("[data-tom]", el).forEach(b => b.addEventListener("click", () => { BI.ALERTAS.find(x => x.id === b.dataset.tom).est = "En atención"; toast("Alerta tomada", "Quedó a su nombre en la bitácora.", "ok"); A.refresh(); }));
    $$("[data-res]", el).forEach(b => b.addEventListener("click", () => {
      const a = BI.ALERTAS.find(x => x.id === b.dataset.res);
      openSheet({
        title: "Marcar como resuelta", sub: a.t,
        body: `<div class="field"><label>¿Qué se hizo?</label><textarea id="rsN" rows="3" style="width:100%" placeholder="Ej.: se corrigió el costo y se reenvió la orden"></textarea></div><div class="mut" style="font-size:12.5px;margin-top:10px">La nota queda en la bitácora con su nombre y la hora.</div>`,
        footer: `<button class="btn" id="rsNo">Cancelar</button><div class="gap"></div><button class="btn pri" id="rsSi">Resolver</button>`,
        after(s) { $("#rsNo", s).addEventListener("click", closeSheet); $("#rsSi", s).addEventListener("click", () => { const nt = $("#rsN", s).value.trim() || "Resuelta sin nota"; a.est = "Resuelta"; BI.RESUELTAS.unshift({ sev: a.sev, ev: a.ev, t: a.t, quien: "Andrey", cuando: "Hoy " + ts(), dur: "ahora", nota: nt }); closeSheet(); toast("Alerta resuelta", "Pasó a «Resueltas».", "ok"); A.refresh(); }); }
      });
    }));
  }

  A.workspace("bi-alertas", {
    title: "Alertas",
    sub: "Lo que necesita una decisión, en el momento en que ocurre",
    tabs: [
      { id: "pend", t: "Pendientes", badge: () => ({ n: BI.ALERTAS.filter(a => a.est !== "Resuelta").length, k: "crit", l: "alertas por atender" }), sub: "Cada alerta trae la acción que la resuelve",
        render: el => pintaAlertas(el) },
      { id: "res", t: "Resueltas", sub: "Quién las resolvió, cuánto tardó y qué hizo",
        render: el => { el.innerHTML = card({ body: table({ cols: [
          { t: "Evento", fmt: r => `${esc(r.ev)}<span class="sub">${esc(r.t)}</span>` }, { t: "Gravedad", fmt: r => sevTag(r.sev) },
          { t: "Resolvió", fmt: r => esc(r.quien) }, { t: "Cuándo", fmt: r => esc(r.cuando) }, { t: "Tiempo", r: true, cls: "mono", fmt: r => esc(r.dur) }, { t: "Qué se hizo", fmt: r => esc(r.nota) }], rows: BI.RESUELTAS }) }); } },
      { id: "reglas", t: "Reglas", sub: "Cuándo se avisa, a quién y por dónde",
        render: el => {
          el.innerHTML = `<div class="wrap">${card({ title: "Reglas de aviso", hint: "los cambios quedan en la bitácora", body: `<div style="margin:0 -17px">${REGLAS.map((r, i) => `<div class="bi-set" style="padding:14px 17px;align-items:flex-start">
            <div style="flex:1;min-width:0"><div class="t">${esc(r.ev)}</div><div class="s">${esc(r.cuando)}</div><div class="s" style="margin-top:6px;color:var(--ink-2)">${esc(r.nota)}</div>
              <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:10px">
                <label style="font-size:12.5px;display:flex;gap:6px;align-items:center">Umbral <input data-um="${i}" value="${esc(r.val)}" style="width:80px;padding:5px 8px;border:1px solid var(--hair);border-radius:8px;text-align:right"> ${esc(r.u)}</label>
                <span class="mut" style="font-size:12.5px">Avisa a <b style="color:var(--ink)">${esc(r.quien)}</b></span>
                <span style="display:flex;gap:6px;flex-wrap:wrap">${["Tablero", "Correo", "WhatsApp"].map((cn, k) => `<button class="btn sm ${r.can[k] ? "pri" : ""}" data-can="${i}:${k}" aria-pressed="${!!r.can[k]}">${cn}</button>`).join("")}</span></div></div>
            <div style="display:flex;gap:8px;align-items:center;font-size:12.5px;color:var(--ink-3)">${r.on ? "Activa" : "Apagada"}${sw("rg" + i, r.on)}</div></div>`).join("")}</div>` })}
          <div class="bi-note">${icon("info")}<div>Las alertas críticas también salen como franja fija en la pantalla de oficina de «Cómo vamos hoy».</div></div></div>`;
        },
        wire: v => {
          $$("[id^=rg]", v).forEach(b => b.addEventListener("click", () => { const i = +b.id.slice(2); REGLAS[i].on = !REGLAS[i].on; toast(REGLAS[i].on ? "Regla activada" : "Regla apagada", REGLAS[i].ev, "ok"); A.refresh(); }));
          $$("[data-can]", v).forEach(b => b.addEventListener("click", () => { const [i, k] = b.dataset.can.split(":").map(Number); REGLAS[i].can[k] = REGLAS[i].can[k] ? 0 : 1; A.refresh(); }));
          $$("[data-um]", v).forEach(inp => inp.addEventListener("change", () => { REGLAS[+inp.dataset.um].val = inp.value; toast("Umbral actualizado", REGLAS[+inp.dataset.um].ev + ": " + inp.value + " " + REGLAS[+inp.dataset.um].u, "ok"); }));
        } }
    ]
  });

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

  /* ═══ PERMISOS DE EXPORTACIÓN Y RÉPLICA ═════════════════════ */
  const COLS = ["Ventas", "Inventario", "Compras", "Cartera", "Fiscal", "Auditoría", "Base de clientes"];
  const NIV = ["Sin acceso", "Solo ver", "Ver y exportar", "Extendida"];
  const PERF = [
    ["Gerencia general", [3, 3, 3, 3, 3, 3, 2]], ["Contabilidad", [2, 1, 2, 2, 3, 1, 1]], ["Proveeduría", [1, 2, 2, 0, 0, 0, 0]],
    ["Crédito y cobro", [1, 0, 0, 2, 0, 0, 2]], ["Jefe de local", [1, 1, 0, 0, 0, 0, 0]], ["Cajero", [1, 0, 0, 0, 0, 0, 0]], ["Bodega", [0, 2, 0, 0, 0, 0, 0]], ["Sistemas (TI)", [1, 1, 1, 1, 1, 3, 0]]
  ];
  const AJ = { tope: "50000", motivo: "Datos sensibles", mask: true, marca: true, aprob: "Gerencia general", cols: true, max: "2 años", conc: "2", tmax: "30" };
  A.workspace("bi-gobierno", {
    title: "Permisos de exportación y réplica",
    sub: "Quién puede descargar qué, y cómo se protege la operación de las consultas pesadas",
    tabs: [
      { id: "perm", t: "Permisos de exportación", badge: () => ({ n: BI.SOLIC.length, k: "warn", l: "solicitudes por resolver" }), sub: "Ver un reporte y descargarlo son permisos distintos",
        render: el => { el.innerHTML = `<div class="wrap">
          ${BI.SOLIC.length ? card({ title: "Solicitudes por resolver", hint: BI.SOLIC.length + " pendientes", body: `<div class="reclist">${BI.SOLIC.map((s, i) => `<div class="rec"><div style="flex:1;min-width:0"><div class="b" style="font-size:14px">${esc(s.quien)} pide: ${esc(s.que)}</div><div class="mut" style="font-size:12.5px">Motivo: ${esc(s.motivo)} · ${esc(s.hace)}</div></div><button class="btn sm pri" data-ap="${i}">Aprobar</button><button class="btn sm" data-rj="${i}">Rechazar</button></div>`).join("")}</div>` }) : ""}
          ${card({ title: "Quién puede qué", hint: "por perfil y por grupo de reportes", body: `<div class="bi-perm" style="overflow-x:auto"><table class="dt"><thead><tr><th>Perfil</th>${COLS.map(c_ => `<th class="c">${esc(c_)}</th>`).join("")}</tr></thead><tbody>
            ${PERF.map((p, i) => `<tr><td><b>${esc(p[0])}</b></td>${p[1].map((n, k) => `<td class="c"><select data-pm="${i}:${k}" aria-label="${esc(p[0] + ", " + COLS[k])}">${NIV.map((x, j) => `<option value="${j}" ${j === n ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></td>`).join("")}</tr>`).join("")}</tbody></table></div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:14px;font-size:12.5px;color:var(--ink-3)"><span><b>Solo ver:</b> consulta en pantalla, sin descarga</span><span><b>Ver y exportar:</b> solo las columnas visibles, con datos personales enmascarados</span><span><b>Extendida:</b> más columnas y sin máscara; solo gerencia y Sistemas</span></div>` })}
          <div class="bi-note warn">${icon("alert")}<div>Hoy, en el sistema actual, cualquier perfil puede exportar los <b>78 000 clientes</b> con sus totales. Aquí solo gerencia general y Crédito y cobro pueden, con motivo escrito y con marca de agua.</div></div></div>`; },
        wire: v => {
          $$("[data-ap]", v).forEach(b => b.addEventListener("click", () => { const s = BI.SOLIC.splice(+b.dataset.ap, 1)[0]; toast("Permiso aprobado", s.quien + ": " + s.que, "ok"); A.refresh(); }));
          $$("[data-rj]", v).forEach(b => b.addEventListener("click", () => { const s = BI.SOLIC.splice(+b.dataset.rj, 1)[0]; toast("Solicitud rechazada", s.quien + " recibe el aviso.", "ok"); A.refresh(); }));
          $$("[data-pm]", v).forEach(sel => sel.addEventListener("change", () => { const [i, k] = sel.dataset.pm.split(":").map(Number); PERF[i][1][k] = +sel.value; toast("Cambio registrado", PERF[i][0] + " · " + COLS[k] + ": " + NIV[+sel.value] + ". Quedó en la bitácora.", "ok"); }));
        } },
      { id: "reglas", t: "Reglas y límites", sub: "Protección de datos y de la operación",
        render: el => { el.innerHTML = `<div class="grid g2" style="align-items:start">
          ${card({ title: "Exportación a Excel", body: `
            <div class="bi-set"><div><div class="t">El Excel solo trae las columnas de la pantalla</div><div class="s">Antes el archivo traía más columnas de las que se veían.</div></div>${sw("aj-cols", AJ.cols, true)}</div>
            <div class="bi-set"><div><div class="t">Enmascarar cédula, teléfono y correo</div><div class="s">Se ven completos solo con exportación extendida.</div></div>${sw("aj-mask", AJ.mask)}</div>
            <div class="bi-set"><div><div class="t">Marca de agua en cada archivo</div><div class="s">Usuario, fecha y número de exportación.</div></div>${sw("aj-marca", AJ.marca)}</div>
            <div class="bi-set"><div><div class="t">Tope de filas por exportación</div><div class="s">Más de esto pide aprobación.</div></div><input id="aj-tope" value="${AJ.tope}" style="width:100px;text-align:right;padding:6px 8px;border:1px solid var(--hair);border-radius:8px"></div>
            <div class="bi-set"><div><div class="t">Pedir motivo escrito</div><div class="s">Antes de descargar.</div></div><select id="aj-mot"><option ${AJ.motivo === "Datos sensibles" ? "selected" : ""}>Datos sensibles</option><option ${AJ.motivo === "Siempre" ? "selected" : ""}>Siempre</option><option ${AJ.motivo === "Nunca" ? "selected" : ""}>Nunca</option></select></div>
            <div class="bi-set"><div><div class="t">La base completa de clientes la aprueba</div><div class="s">78 000 registros.</div></div><select id="aj-ap"><option>Gerencia general</option><option>Gerencia y Sistemas</option></select></div>` })}
          ${card({ title: "Consultas grandes", body: `
            <div class="bi-set"><div><div class="t">Tope de período</div><div class="s">No hay. Cualquier rango se puede consultar; lo grande se resuelve en segundo plano.</div></div>${tag("Sin límite", "ok", "check")}</div>
            <div class="bi-set"><div><div class="t">Pasar a segundo plano si el período supera</div><div class="s">Menos de esto responde en pantalla.</div></div><select id="aj-max"><option>1 año</option><option selected>2 años</option><option>5 años</option></select></div>
            <div class="bi-set"><div><div class="t">Consultas simultáneas por usuario</div><div class="s">Las demás esperan turno.</div></div><select id="aj-conc"><option>1</option><option selected>2</option><option>3</option></select></div>
            <div class="bi-set"><div><div class="t">Tiempo máximo por consulta</div><div class="s">Al llegar se cancela con un mensaje claro.</div></div><div><input id="aj-tmax" value="${AJ.tmax}" style="width:64px;text-align:right;padding:6px 8px;border:1px solid var(--hair);border-radius:8px"> min</div></div>
            <div class="bi-set"><div><div class="t">Prioridad frente a la caja</div><div class="s">Siempre menor. No se puede cambiar.</div></div>${tag("Menor que la caja", "acc", "lock")}</div>` })}
          </div>`; },
        wire: v => {
          ["aj-mask", "aj-marca"].forEach(id => $("#" + id, v).addEventListener("click", () => { const k = id.slice(3); AJ[k] = !AJ[k]; $("#" + id, v).setAttribute("aria-checked", AJ[k]); toast("Regla actualizada", "Quedó en la bitácora.", "ok"); }));
          $$("input,select", v).forEach(e => e.addEventListener("change", () => toast("Regla actualizada", "Quedó en la bitácora.", "ok")));
        } },
      { id: "replica", t: "Consultas y réplica", sub: "Ninguna consulta de análisis toca la base de la caja",
        render: el => { el.innerHTML = `<div class="wrap">
          <div class="grid g4">${stat("Réplica de lectura", "En línea", { txt: "retraso de 1,8 s con la caja", dir: "up" }, "var(--ok)")}
            ${stat("Consultas de hoy", "214", { txt: "0 sobre la base transaccional", dir: "up" }, "var(--ok)")}
            ${stat("En ejecución", "2", { txt: "1 en cola · 0 fallidas", dir: "" })}
            ${stat("Tiempo típico", "1,4 s", { txt: "el más largo hoy: 3 min 10 s", dir: "" })}</div>
          ${card({ title: "Por dónde viaja cada cosa", body: `<div class="bi-flow">
            <div class="bi-box"><b>Caja de los 7 locales</b><br><span class="mut">Facturar, cobrar, recibir. Nunca espera por un reporte.</span></div><div class="bi-arrow">→</div>
            <div class="bi-box"><b>Base transaccional</b><br><span class="mut">Solo operación. Sin consultas de análisis.</span></div><div class="bi-arrow">↓</div>
            <div class="bi-box ok"><b>Réplica de lectura</b><br><span class="mut">Recibe una copia continua. Aquí corren Reportes, Preguntas, Tablero y Excel.</span></div></div>
            <div class="mut" style="font-size:12.5px;margin-top:12px">Los años antiguos se consultan ya resumidos por día, local y familia: por eso un reporte de 10 años no recorre las facturas una por una.</div>` })}
          <div class="grid g2" style="align-items:start">
            ${card({ title: "Consultas recientes", body: table({ cols: [{ t: "Quién", fmt: r => esc(r[0]) }, { t: "Qué", fmt: r => esc(r[1]) }, { t: "Duración", r: true, cls: "mono", fmt: r => esc(r[2]) }, { t: "Estado", fmt: r => tag(r[3], r[3] === "Completada" ? "ok" : r[3] === "En segundo plano" ? "acc" : "mu") }], rows: [
              ["Andrey", "Informe de ventas · 10 años", "1 min 12 s", "En segundo plano"], ["Contabilidad", "IVA por tasa · agosto", "0,8 s", "Completada"], ["Proveeduría", "Sugerido de compra", "2,1 s", "Completada"],
              ["Crédito", "Antigüedad de saldos", "3,4 s", "Completada"], ["Pregunta libre", "Ventas de cemento · 3 meses", "1,1 s", "Completada"], ["Jefe de Pacayas", "Kardex 5 años", "—", "Cancelada"]] }) })}
            ${card({ title: "Así se ve un problema", hint: "sin códigos ni pantallas técnicas", body: `<div class="bi-note crit" role="alert">${icon("alert")}<div><b>No pudimos completar este reporte.</b><br>Sus ventas, facturas y compras no se afectaron.<br><br><b>Qué puede hacer:</b> pruebe con un período más corto o intente de nuevo en unos minutos.<br><span class="mut" style="font-size:12px">Referencia para Sistemas: R-20260913-0412 · ya se les avisó.</span></div></div>
              <div style="display:flex;gap:8px;margin-top:12px"><button class="btn pri" id="ryRe">Reintentar</button><button class="btn" id="ryCa">Cambiar filtros</button></div>` })}</div></div>`; },
        wire: v => { $("#ryRe", v).addEventListener("click", () => toast("Reintentando", "Vuelve a la cola de la réplica.", "ok")); $("#ryCa", v).addEventListener("click", () => A.go("reportes")); } },
      { id: "modelo", t: "Modelo de datos", sub: "Cómo se ordena la información para que cualquier pregunta sea rápida",
        render: el => { const ch = (a, f) => a.map(x => `<span class="bi-chip ${f ? "f" : ""}">${esc(x)}</span>`).join("");
          el.innerHTML = `<div class="wrap">
          ${card({ title: "Hechos", hint: "lo que se mide", body: `<div>${ch(["venta_línea", "pago", "movimiento_inventario", "inventario_diario", "compra_línea", "cartera", "venta_perdida", "evento_alerta"], true)}</div><div class="mut" style="font-size:12.5px;margin-top:10px">Una fila por línea de documento, pago o movimiento. Notas de crédito restan; proformas y traslados no cuentan como venta.</div>` })}
          ${card({ title: "Dimensiones", hint: "cómo se corta", body: `<div>${ch(["fecha", "local_bodega", "producto (familia › subfamilia › artículo)", "cliente", "vendedor", "proveedor", "medio_pago", "documento (tipo y estado en Hacienda)", "departamento", "motivo"])}</div>` })}
          <div class="bi-note">${icon("layers")}<div><b>Pensado para más de una industria.</b> El producto lleva una etiqueta de vertical (ferretería, agro, distribución…): cambia la jerarquía de productos, no los reportes ni el tablero.</div></div>
          <div class="bi-note ok">${icon("scale")}<div><b>Una sola definición de cada cifra.</b> Margen = (venta neta − costo de lo vendido) ÷ venta neta, sin IVA y descontadas las notas de crédito. Costo promedio ponderado al momento de la venta. El corte del día es la hora de Costa Rica.</div></div></div>`; } }
    ]
  });
})(window);
