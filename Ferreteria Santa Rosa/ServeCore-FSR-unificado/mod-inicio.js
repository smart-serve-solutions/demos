/* ═══════════════════════════════════════════════════════════════
   Inicio — la pantalla cambia según quién entra
   Mostrador ve la caja; bodega, lo que tiene que recibir y contar;
   gerencia, el número y lo que necesita una decisión.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, S = w.S, U = w.UI;
  const { $, $$, esc, c, grp, dec, pct, kg, hora, fecha, fechaLarga, icon, tag, card, stat, barRow, lineChart, donut, locNom, cliNom } = U;

  const saludo = () => { const h = D.HOY.getHours(); return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"; };

  /* ── mostrador ──────────────────────────────────────────────── */
  function inicioCajero() {
    const hoy = D.ventasDelDia(S.locId);
    const total = hoy.reduce((s, d) => s + d.total, 0);
    const loc = D.locales.find(l => l.id === S.locId) || D.locales[0];
    const cot = D.proformas.filter(p => p.estado === "Vigente").slice(0, 3);
    const ent = D.despachos.slice(0, 3);
    const ult = D.documentos.filter(d => d.locId === S.locId).slice(0, 3);
    return `<div class="grid" style="grid-template-columns:1.3fr 1fr;align-items:start">
      <div class="card" style="background:var(--accent);border-color:var(--accent)">
        <div style="padding:28px 28px 32px;color:var(--accent-ink)">
          <div style="font-size:13px;opacity:.85;font-weight:650;letter-spacing:.02em;text-transform:uppercase">${esc(loc.nom)} · Terminal ${S.term}</div>
          <h2 style="color:var(--accent-ink);margin-top:8px;font-size:24px">Empezar a vender</h2>
          <div style="opacity:.85;font-size:14px;margin-top:6px;max-width:42ch">Escanee o busque el primer artículo o servicio. El consecutivo se asigna cuando la factura se emite.</div>
          <button class="btn big" style="margin-top:18px;background:var(--surface);color:var(--accent);border-color:var(--surface)" id="btnIrVender">${icon("cart")}Abrir punto de venta</button>
        </div>
      </div>
      <div class="grid" style="grid-template-columns:1fr 1fr">
        ${stat("Su venta de hoy", c(total))}
        ${stat("Documentos emitidos", hoy.length)}
        ${stat("Tiquete promedio", c(hoy.length ? total / hoy.length : 0))}
        ${stat("Líneas esperando autorización", "0", { txt: "al día", dir: "up" }, "var(--ok)")}
      </div></div>
      <div class="grid g3" style="margin-top:14px">
        ${card("Cotizaciones vigentes", cot.length + " en firme", `<div class="reclist">${cot.map(q => `
          <div class="rec"><div style="flex:1;min-width:0"><div class="b" style="font-size:14px">${esc(cliNom(q.clienteId))}</div>
            <div class="mut" style="font-size:12.5px">${q.lineas.length} líneas · ${c(q.total)}</div></div>${tag(q.estado, q.estado === "Vigente" ? "ok" : "warn")}</div>`).join("")}</div>`)}
        ${card("Entregas de hoy", "", `<div class="reclist">${ent.map(e => `
          <div class="rec"><div style="flex:1;min-width:0"><div class="b" style="font-size:14px">${esc(cliNom(e.clienteId))}</div>
            <div class="mut" style="font-size:12.5px">${esc(e.ruta)} · ${kg(w.pesoLineas(e.lineas))}</div></div>
            ${tag(e.estado, e.estado === "Entregado" ? "ok" : e.estado === "En ruta" ? "acc" : "warn")}</div>`).join("")}</div>`)}
        ${card("Últimos documentos", "en esta terminal", `<div class="reclist">${ult.map(d => `
          <div class="rec"><div style="flex:1;min-width:0"><div class="b" style="font-size:14px">${d.tipo === "FE" ? "Factura" : d.tipo === "TE" ? "Tiquete" : "Nota"} · ${esc(d.cons.slice(-6))}</div>
            <div class="mut" style="font-size:12.5px">${hora(d.fecha)} · ${esc(d.vendedor)}</div></div>
            <div class="num" style="font-size:14px">${c(d.total)}</div></div>`).join("")}</div>`)}
      </div>`;
  }

  /* ── bodega ─────────────────────────────────────────────────── */
  function inicioBodega() {
    const qb = D.quiebres();
    const enQuiebre = qb.filter(q => q.tipo === "Quiebre").length;
    const transito = D.traslados.filter(t => t.estado === "En tránsito");
    const pendientes = D.compras.filter(o => o.estado !== "Aplicada");
    const conteo = D.conteos.find(x => x.estado === "En proceso") || D.conteos[0];
    const oc = D.compras.find(o => o.cons === "OC-2026-004412") || D.compras[0];
    const tr = transito[0] || D.traslados[0];
    return `<div class="grid g4">
      ${stat("Traslados en tránsito", transito.length, { txt: transito.length ? "el más viejo salió hace 2 días" : "nada en camino", dir: "" }, "var(--accent)")}
      ${stat("Recepciones pendientes", pendientes.length, { txt: oc.cons + " tiene líneas con diferencia", dir: "down" }, "var(--warn)")}
      ${stat("Conteo cíclico de la semana", conteo ? conteo.familia : "—", conteo ? { txt: conteo.contados + " artículos contados · " + conteo.diferencias + " diferencias", dir: "" } : null)}
      ${stat("Artículos en quiebre", enQuiebre, { txt: "con existencia en el CEDI", dir: "" }, "var(--crit)")}
    </div>
    <div class="grid g2" style="margin-top:14px;align-items:start">
      ${card("Qué hacer primero", "en este orden", `<div class="reclist">
        <div class="rec"><div style="flex:1"><div class="b" style="font-size:14px">Recibir ${esc(oc.cons)} · ${esc(D.provById[oc.provId].nom)}</div>
          <div class="mut" style="font-size:12.5px">${oc.lineas.length} líneas · 2 con diferencia de cantidad y una con el costo cambiado</div></div>
          <button class="btn sm pri" data-go2="ordenes">Recibir</button></div>
        <div class="rec"><div style="flex:1"><div class="b" style="font-size:14px">Recibir traslado ${esc(tr ? tr.cons : "—")} desde ${esc(tr ? locNom(tr.origen) : "CEDI")}</div>
          <div class="mut" style="font-size:12.5px">Para ${esc(tr ? locNom(tr.destino) : "—")} · ${tr ? tr.lineas.length : 0} líneas en camino</div></div>
          <button class="btn sm" data-go2="traslados">Ver</button></div>
        <div class="rec"><div style="flex:1"><div class="b" style="font-size:14px">Conteo cíclico — ${esc(conteo ? conteo.familia : "—")}</div>
          <div class="mut" style="font-size:12.5px">${conteo ? conteo.contados + " artículos contados en " + locNom(conteo.locId) + " · exactitud " + dec(conteo.exactitud) + " %" : "sin conteo abierto"}</div></div>
          <button class="btn sm" data-go2="ajustes">Continuar</button></div>
      </div>`)}
      ${card("App de bodega", "La misma tarea, desde el celular",
      `<div style="display:flex;flex-direction:column;gap:12px">
        <div style="font-size:14px;color:var(--ink-2);line-height:1.6">Recepción, traslados y conteo cíclico también funcionan desde el teléfono del bodeguero, con el lector de código de barras de la cámara.</div>
        <button class="btn" id="btnVerApp">${icon("phone")}Ver la app móvil</button></div>`)}
    </div>`;
  }

  /* ── gerencia ───────────────────────────────────────────────── */
  function inicioGerencia() {
    const hoy = D.ventasDelDia();
    const total = hoy.reduce((s, d) => s + d.total, 0);
    const serie = D.serieSemana();
    const varia = serie[0].total ? ((serie[6].total - serie[0].total) / serie[0].total) * 100 : 0;
    const costo = hoy.reduce((s, d) => s + d.costo, 0);
    const grav = hoy.reduce((s, d) => s + d.grav, 0);
    const margen = grav ? ((grav - costo) / grav) * 100 : 0;
    const docsHoy = D.documentos.filter(d => d.fecha.toDateString() === D.HOY.toDateString());
    const cola = S.offline ? S.queue : 0;
    const bajo = D.bajoMinimo();
    const perdida = bajo.reduce((s, x) => s + Math.max(0, x.perdida), 0);
    const qb = D.quiebres();
    const sinAceptar = D.recibidos.filter(r => r.estado === "Sin aceptar");
    const porLocal = D.ventaPorLocal();
    const maxLocal = Math.max.apply(null, porLocal.map(x => x.total).concat([1]));
    const famM = D.margenPorFamilia();
    /* la salud se mide por artículo y local: un cemento sano en Turrialba y
       quebrado en Pejibaye no es medio artículo, son dos situaciones */
    let pares = 0;
    D.articulos.forEach(a => (pares += Object.keys(D.existencias[a.id] || {}).length));
    const salud = pares ? Math.round(((pares - qb.length) / pares) * 100) : 100;

    const alerta = (kind, ic, t, s, dest) => {
      const col = kind === "cr" ? "var(--crit)" : kind === "wa" ? "var(--warn)" : kind === "ok" ? "var(--ok)" : "var(--accent)";
      const bg = kind === "cr" ? "var(--crit-soft)" : kind === "wa" ? "var(--warn-soft)" : kind === "ok" ? "var(--ok-soft)" : "var(--accent-soft)";
      return `<button class="rec" ${dest ? `data-go2="${dest}"` : ""} style="background:${bg};border-radius:10px;padding:12px 14px;border-bottom:none;width:100%;text-align:left">
        <span style="color:${col};display:flex">${icon(ic)}</span>
        <div style="flex:1"><div class="b" style="font-size:14px">${esc(t)}</div><div class="mut" style="font-size:13px;margin-top:1px">${esc(s)}</div></div>
        ${dest ? icon("chev", 'style="color:var(--ink-4)"') : ""}</button>`;
    };

    return `<div class="grid g4">
      ${stat("Venta de hoy", c(total), { txt: (varia >= 0 ? "↑ " : "↓ ") + dec(Math.abs(varia)) + " % contra el mismo día de la semana pasada", dir: varia >= 0 ? "up" : "down" })}
      ${stat("Tiquete promedio", c(hoy.length ? total / hoy.length : 0), { txt: hoy.length + " documentos de venta hoy", dir: "" })}
      ${stat("Margen bruto del día", dec(margen) + " %", { txt: "mínimo global configurado 18 %", dir: margen >= 18 ? "up" : "down" }, margen >= 18 ? "var(--ok)" : "var(--crit)")}
      ${stat("Comprobantes a Hacienda", grp(docsHoy.length), { txt: (docsHoy.length - cola) + " aceptados · " + cola + " en cola", dir: cola ? "down" : "" }, cola ? "var(--warn)" : "var(--accent)")}
    </div>
    <div class="grid" style="grid-template-columns:1.5fr 1fr;margin-top:14px;align-items:start">
      ${card("Venta de los últimos 7 días", "₡ millones", lineChart(
        serie.map(s => s.total / 1e6),
        serie.map((s, i) => (i === 6 ? "hoy" : fecha(s.fecha))),
        620, 150, { marks: serie.map(s => !!s.caida), alt: "Venta diaria de la última semana, con la caída de enlace del 11 de setiembre" }) +
      `<div class="mut" style="font-size:12.5px;margin-top:6px;display:flex;align-items:center;gap:6px">${icon("info", 'style="width:14px;height:14px"')}El punto ámbar es la caída de enlace del 11 de setiembre: el local siguió facturando contra su nodo.</div>`)}
      ${card("Semáforo de inventario", "todos los locales",
      `<div style="display:flex;align-items:center;gap:18px">${donut(salud, 86, salud > 70 ? "var(--ok)" : "var(--warn)")}
        <div style="font-size:13.5px;color:var(--ink-2);line-height:1.6">${salud} % de las existencias por local dentro de su rango sano.<br>
        <span style="color:var(--crit);font-weight:650">${qb.filter(q => q.tipo === "Quiebre").length} artículos en quiebre</span> y ${qb.filter(q => q.tipo === "Bajo mínimo").length} bajo el mínimo.</div></div>`)}
    </div>
    <div class="grid g2" style="margin-top:14px;align-items:start">
      ${card("Venta por local", "hoy", porLocal.map(x => barRow(x.loc.nom, x.total, maxLocal, grp(x.total))).join(""))}
      ${card("Margen por familia", "mes en curso", famM.map(x =>
        barRow(x.fam.nom, x.margen, 40, dec(x.margen) + " %", x.margen < x.fam.min ? "var(--crit)" : "var(--accent)")).join("") +
      `<div class="mut" style="font-size:12.5px;margin-top:8px">${famM.filter(x => x.margen < x.fam.min).length
        ? `<span style="color:var(--crit);font-weight:650">${esc(famM.filter(x => x.margen < x.fam.min).map(x => x.fam.nom).join(", "))}</span> por debajo de su mínimo`
        : "Todas las familias sobre su margen mínimo"}</div>`)}
    </div>
    ${card({
      cls: "", title: "Qué necesita atención", hint: "cada aviso abre el documento que lo origina",
      body: `<div style="display:flex;flex-direction:column;gap:8px">
        ${alerta("cr", "alert", bajo.length + " líneas vendidas bajo el margen mínimo", c(perdida) + " de utilidad no percibida. Todas con autorización registrada y motivo escrito.", "documentos")}
        ${alerta("wa", "alert", sinAceptar.length + " comprobantes de proveedor sin aceptar", "El más antiguo vence en " + (sinAceptar.length ? Math.min.apply(null, sinAceptar.map(r => r.venceEn)) : 0) + " días; después la aceptación ya no se puede enviar.", "fiscal")}
        ${alerta("wa", "alert", qb.filter(q => q.tipo === "Quiebre").length + " artículos en quiebre y " + qb.filter(q => q.tipo === "Bajo mínimo").length + " bajo el mínimo", "Hay existencia en el CEDI para la mayoría; la reposición sugerida ya los contempla.", "existencias")}
        ${alerta("ac", "sparkle", "La reposición sugerida del CEDI está lista", "Con el ajuste de temporada de lluvias aplicado.", "reposicion")}
        ${alerta("ok", "check", "Cierre de caja completo en 7 de 7 locales", "Diferencia acumulada del día: ₡1 850 en Cervantes, justificada por el cajero.", null)}
      </div>`
    }).replace('<section class="card ', '<section style="margin-top:14px" class="card ')}
    <div style="display:flex;gap:8px;align-items:center;padding:14px 2px 0;font-size:12px;color:var(--ink-4)">
      ${icon("info", 'style="width:15px;height:15px"')}Demostración de Smart Serve Solutions sobre la estructura de ServeCore. Lo que usted haga aquí sí afecta al resto de los módulos.
    </div>`;
  }

  /* ── app móvil de bodega ────────────────────────────────────── */
  const mobRow = (nom, frac, kind) =>
    `<div style="display:flex;align-items:center;gap:9px;padding:8px 10px;background:var(--surface);border:1px solid var(--hair-2);border-radius:9px">
      <div style="flex:1;font-size:12.5px;font-weight:600">${nom}</div><div class="num" style="font-size:12.5px">${frac}</div>
      <span style="width:8px;height:8px;border-radius:50%;background:var(--${kind})"></span></div>`;

  function mostrarAppMovil() {
    const root = $("#overlayRoot");
    root.innerHTML =
      `<div id="appScrim" style="position:fixed;inset:0;background:rgba(20,17,13,.5);z-index:60;display:flex;align-items:center;justify-content:center;padding:30px">
        <div style="display:flex;gap:26px;align-items:center;flex-wrap:wrap;justify-content:center">
          <div style="width:290px;height:590px;background:var(--surface);border-radius:32px;box-shadow:var(--shadow-lg);border:6px solid var(--ink);overflow:hidden;display:flex;flex-direction:column">
            <div style="flex:1;overflow:auto;display:flex;flex-direction:column">
              <div style="background:var(--accent);color:var(--accent-ink);padding:15px 17px 13px">
                <div style="font-size:11.5px;opacity:.85;font-weight:650">CEDI ISABEL · RECEPCIÓN</div>
                <div style="font-size:16px;font-weight:800;margin-top:3px">${esc(D.compras[0].cons)} · ${esc(D.provById[D.compras[0].provId].nom.split(" ")[0])}</div></div>
              <div style="padding:13px 15px;display:flex;flex-direction:column;gap:9px">
                <div style="background:var(--surface-2);border:1px solid var(--hair);border-radius:12px;padding:15px;display:flex;flex-direction:column;align-items:center;gap:7px">
                  ${icon("scan", 'style="width:32px;height:32px;color:var(--accent)"')}
                  <div style="font-size:13px;color:var(--ink-3);text-align:center">Apunte la cámara al código de barras</div></div>
                <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink-3)"><span>7 de 9 líneas</span><span>78 %</span></div>
                <div style="height:6px;background:var(--surface-3);border-radius:4px;overflow:hidden"><div style="width:78%;height:100%;background:var(--ok)"></div></div>
                <div style="display:flex;flex-direction:column;gap:7px;margin-top:5px">
                  ${mobRow('Tubo PVC SDR-26 ½"', "120 / 120", "ok")}
                  ${mobRow('Cinta teflón ½"', "40 / 45", "warn")}
                  ${mobRow('Codo PVC 90° ½"', "0 / 60", "crit")}
                </div></div></div>
            <div style="padding:13px 15px;border-top:1px solid var(--hair)"><button class="btn pri big" style="width:100%;justify-content:center">Confirmar línea escaneada</button></div>
          </div>
          <div style="max-width:270px"><h3 style="font-size:18.5px;color:#fff">La app que hoy no existe</h3>
            <p style="color:rgba(255,255,255,.82);font-size:14px;line-height:1.6;margin-top:8px">Recepción, traslados y conteo cíclico, pensados para el teléfono del bodeguero — con la cámara como lector. Se pidió de forma enfática en la sesión y hoy no está en ningún prototipo.</p>
            <button class="btn" id="appClose" style="margin-top:15px">Cerrar</button></div>
        </div></div>`;
    $("#appClose").addEventListener("click", () => (root.innerHTML = ""));
    $("#appScrim").addEventListener("click", e => { if (e.target.id === "appScrim") root.innerHTML = ""; });
  }
  A.actions = Object.assign(A.actions || {}, { appmovil: mostrarAppMovil });

  /* ── pantalla ───────────────────────────────────────────────── */
  A.screen("inicio", {
    title: "Inicio", bare: true,
    render(v) {
      const roles = [["cajero", "Mostrador"], ["gerencia", "Gerencia"], ["bodega", "Bodega"]];
      v.innerHTML = `<div class="pad">
        <div class="pagehead">
          <div class="ph-t">
            <div class="mut" style="font-size:13.5px;margin-bottom:3px">${esc(saludo())}, Andrey</div>
            <h2 style="font-size:27px">${S.role === "cajero" ? "Listo para atender" : S.role === "bodega" ? "Así está la bodega hoy" : "Así va el negocio hoy"}</h2>
            <div class="mut" style="font-size:14px;margin-top:4px">${fechaLarga(D.HOY)} · ${esc(locNom(S.locId))}</div>
          </div>
          <div class="seg">${roles.map(r => `<button data-role="${r[0]}" aria-pressed="${S.role === r[0]}">${esc(r[1])}</button>`).join("")}</div>
        </div>
        ${S.role === "cajero" ? inicioCajero() : S.role === "bodega" ? inicioBodega() : inicioGerencia()}
      </div>`;
    },
    wire(v) {
      $$("[data-role]", v).forEach(b => b.addEventListener("click", () => { S.role = b.dataset.role; A.refresh(); }));
      $$("[data-go2]", v).forEach(b => b.addEventListener("click", () => A.go(b.dataset.go2)));
      const bv = $("#btnIrVender", v); if (bv) bv.addEventListener("click", () => A.go("pos"));
      const ba = $("#btnVerApp", v); if (ba) ba.addEventListener("click", mostrarAppMovil);
    }
  });
})(window);
