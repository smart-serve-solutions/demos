/* ═══════════════════════════════════════════════════════════════
   Taller — TAL-001 órdenes de trabajo automotrices, TAL-002 bodega de
   repuestos y TAL-003 reparación de herramientas. Los datos viven en
   tal-data.js (window.TAL).
   Lo que se repara para un cliente se factura como cualquier venta (caja 3
   de Santa Rosa, los repuestos salen de la bodega del taller); lo de la
   flota propia no se factura: su costo va a mantenimiento de vehículos.
   Una reparación en garantía no se cobra: los repuestos quedan como
   reclamo al proveedor.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, U = w.UI, T = w.TAL;
  if (!T) return;
  const { $, $$, esc, norm, grp, c, dec, fecha, fh, icon, tag, card, table, seg, onSeg, openSheet, closeSheet, toast, cliNom, empty } = U;
  const S = A.state;
  const B = T.BODEGA;
  /* el taller cobra en la caja 3 de Santa Rosa */
  const CAJA = { locId: "L1", term: 3 };

  const art = id => D.artById[id];
  const nombre = s => String(s || "").split(" ").slice(0, 2).join(" ");
  const veh = o => T.vehById[o.vehId];
  const dueno = o => (o.clienteId ? cliNom(o.clienteId) : "Flota propia");
  const dias = f => Math.max(0, Math.floor((D.ahora() - f) / 86400000));
  const abiertas = L => L.filter(o => o.estado !== "Entregada");
  /* las filas de la tabla que está a la vista, para abrir su ficha */
  let filas = [];

  const KIND = {
    "Recibida": "mu", "En diagnóstico": "acc", "Esperando repuestos": "wa", "En reparación": "acc",
    "Lista para entregar": "ok", "Lista para retirar": "ok", "Entregada": "mu",
    "Presupuesto enviado": "wa", "Aprobada": "acc"
  };
  const est = e => tag(e, KIND[e] || "mu");

  /* lo que cuesta y lo que se cobra: al cliente con precio de lista (IVA incluido),
     a la flota al costo */
  function cuentas(o) {
    const mo = o.tipo === "Automotriz" ? T.MO_AUTO : T.MO_HERR;
    const reps = o.repuestos.reduce((s, x) => s + Math.round(x.cant * x.precio), 0);
    const repC = o.repuestos.reduce((s, x) => s + Math.round(x.cant * x.costo), 0);
    const manoObra = Math.round(o.horas * mo.precio);
    return { mo, reps, repC, manoObra, total: reps + manoObra, costo: repC + Math.round(o.horas * T.COSTO_HORA) };
  }
  const pendientes = o => o.repuestos.filter(x => x.pendiente);

  /* reservar lo que faltaba si ya llegó a la bodega */
  function reservarPendientes(o) {
    let n = 0;
    pendientes(o).forEach(x => {
      const e = D.stock(x.artId, B);
      if (e && e.cant - e.comp >= x.cant) { e.comp += x.cant; x.pendiente = false; n++; }
    });
    return n;
  }
  /* soltar lo reservado (antes de facturar o si el cliente no aprueba) */
  function liberar(o) {
    o.repuestos.forEach(x => { if (x.pendiente) return; const e = D.stock(x.artId, B); if (e) e.comp = Math.max(0, e.comp - x.cant); });
  }
  function reservar(o) {
    o.repuestos.forEach(x => { if (x.pendiente) return; const e = D.stock(x.artId, B); if (e) e.comp += x.cant; });
  }

  /* ── facturar una orden de cliente ─────────────────────────── */
  function facturar(o, cond, medio, extra) {
    if (pendientes(o).length) return { error: "Hay repuestos que todavía no llegan a la bodega." };
    const lineas = o.repuestos.map(x => ({ artId: x.artId, cant: x.cant, precio: x.precio }));
    const k = cuentas(o);
    if (o.horas > 0) lineas.push({ artId: k.mo.id, cant: o.horas, precio: k.mo.precio });
    (extra || []).forEach(l => lineas.push(l));
    if (!lineas.length) return { error: "La orden no tiene nada que facturar." };
    const cli = D.cliById[o.clienteId];
    if (cond === "Crédito") {
      const total = D.totalizar(lineas, {}).total;
      if (!cli || !cli.limite) return { error: "Este cliente no tiene crédito aprobado. Cóbrelo de contado." };
      const bq = w.VENX ? w.VENX.bloqueo(cli.id) : null;
      if (bq && bq.k === "cr") return { error: bq.t + ". " + bq.d };
      if (total > cli.limite - cli.saldo) return { error: "La factura pasa el crédito disponible por " + c(total - (cli.limite - cli.saldo)) + "." };
    }
    liberar(o);
    let doc;
    try {
      doc = D.emitir({
        tipo: "FE", locId: CAJA.locId, term: CAJA.term, clienteId: o.clienteId, vendedor: "Taller · " + nombre(o.mecanico || o.tecnico),
        lineas, condicion: cond, medio: cond === "Crédito" ? "Crédito" : medio, bodega: B,
        ordenCompra: o.id, hacienda: S.offline ? "En cola" : "Aceptado", situacion: S.offline ? "3" : "1", fecha: D.ahora()
      });
    } catch (e) { reservar(o); return { error: e.message }; }
    doc.taller = o.id;
    /* en la boleta de herramienta, «factura» es la de la compra (garantía): la del taller va aparte */
    if (o.tipo === "Herramienta") o.facturaTaller = doc.cons; else o.factura = doc.cons;
    return { doc };
  }

  /* ── entrega en garantía: sin cobro, los repuestos se reclaman ─ */
  function cerrarGarantia(o) {
    const f = D.ahora();
    D.exigePeriodoAbierto(f);
    liberar(o);
    let costo = 0;
    o.repuestos.forEach(x => { D.mover(x.artId, B, -x.cant, "Garantía", o.id, f, o.equipo); costo += Math.round(x.cant * x.costo); });
    const prov = D.proveedores.find(p => p.linea === "Herramienta") || D.proveedores[0];
    if (costo) {
      const a = D.asentar(f, o.id, "Reparación en garantía · " + o.equipo + " · reclamo a " + prov.nom, [
        { cta: "1-01-03-005", debe: costo, haber: 0, nota: "reclamo al proveedor" },
        { cta: "1-01-04-001", debe: 0, haber: costo, nota: "repuestos de la bodega del taller" }
      ]);
      a.regla = "Reparación en garantía"; o.asiento = a.id;
    }
    o.reclamo = { prov: prov.nom, monto: costo };
    return costo;
  }

  /* ═════════════════════════════════════════════════════════════
     Piezas compartidas por las dos fichas
     ═════════════════════════════════════════════════════════════ */
  function tablaRepuestos(o, cobro) {
    if (!o.repuestos.length) return `<div class="dim" style="padding:12px 16px;font-size:12.5px">Todavía no lleva repuestos.</div>`;
    return table({
      cols: [
        { t: "Repuesto", fmt: x => `<b>${esc(art(x.artId).desc)}</b><div class="dim num" style="font-size:11.5px">${esc(art(x.artId).cod)}</div>` },
        { t: "Cant.", r: true, fmt: x => `<span class="num">${dec(x.cant, 0)}</span>` },
        { t: cobro ? "Precio" : "Costo", r: true, fmt: x => `<span class="num">${c(Math.round(x.cant * (cobro ? x.precio : x.costo)))}</span>` },
        { t: "", r: true, fmt: x => (x.pendiente ? tag("Pedido", "wa", "clock") : o.estado === "Entregada" ? tag("Salió", "mu") : tag("Reservado", "ok", "check")) }
      ], rows: o.repuestos
    });
  }
  function bitacora(o) {
    return `<ol style="list-style:none;margin:0;padding:0">${o.bitacora.slice().reverse().map(b => `<li style="padding:8px 0;border-bottom:1px solid var(--hair-2);font-size:12.5px">
      <div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(b.estado)}</b><span class="dim num">${fh(b.fecha)}</span></div>
      <div class="mut">${esc(b.por)}${b.nota ? " · " + esc(b.nota) : ""}</div></li>`).join("")}</ol>`;
  }
  /* agregar un repuesto de la bodega a la orden */
  function agregarRepuesto(o, sub) {
    const lista = T.REPUESTOS.filter(a => a.sub === sub);
    openSheet({
      title: "Agregar repuesto", sub: o.id + " · sale de la " + U.locNom(B).toLowerCase(),
      body: `<div class="field"><label>Repuesto</label><select id="trArt" class="inp">${lista.map(a => {
        const d = D.disp(a.id, B);
        return `<option value="${a.id}">${esc(a.desc)} · disp. ${d}${d <= 0 ? " (se pide)" : ""}</option>`;
      }).join("")}</select></div>
        <div class="field"><label>Cantidad</label><input id="trCant" class="inp num" type="number" min="1" step="1" value="1"></div>
        <p class="dim" style="font-size:12px">Si hay disponible queda reservado para esta orden; si no, queda como pedido y la orden espera a que Bodega lo reciba.</p>`,
      footer: `<button class="btn" id="trNo">Volver</button><button class="btn pri" id="trSi">${icon("plus")}Agregar</button>`,
      after: r => {
        $("#trNo", r).onclick = () => (o.tipo === "Automotriz" ? fichaOT(o) : fichaHR(o));
        $("#trSi", r).onclick = () => {
          const a = art($("#trArt", r).value), n = Math.round(+$("#trCant", r).value);
          if (!(n > 0)) return toast("Cantidad inválida", "Digite cuántas unidades lleva.", "wa");
          const ya = o.repuestos.find(x => x.artId === a.id);
          if (ya && !ya.pendiente) {
            const e = D.stock(a.id, B);
            if (e.cant - e.comp < n) return toast("No alcanza", "Solo hay " + (e.cant - e.comp) + " disponibles de " + a.desc + ".", "wa");
            ya.cant += n; e.comp += n;
          } else if (ya) ya.cant += n;
          else T.asignarRepuesto(o, a.cod, n);
          o.bitacora.push({ estado: o.estado, fecha: D.ahora(), por: D.sesion.nom, nota: "Agregó " + n + " × " + a.desc });
          toast("Repuesto agregado", (o.repuestos.find(x => x.artId === a.id).pendiente ? "No hay en bodega: queda como pedido." : "Queda reservado en la bodega del taller."), "ok");
          (o.tipo === "Automotriz" ? fichaOT : fichaHR)(o);
          A.refresh();
        };
      }
    });
  }
  function pedirHoras(o, fn) {
    openSheet({
      title: "Registrar horas", sub: o.id + " · " + (o.mecanico || o.tecnico || ""),
      body: `<div class="field"><label>Horas trabajadas (se suman a las ${dec(o.horas, 1)} que ya tiene)</label><input id="trH" class="inp num" type="number" min="0.5" step="0.5" value="1"></div>`,
      footer: `<button class="btn" id="trNo">Volver</button><button class="btn pri" id="trSi">${icon("clock")}Registrar</button>`,
      after: r => {
        $("#trNo", r).onclick = () => fn(o);
        $("#trSi", r).onclick = () => {
          const h = +$("#trH", r).value;
          if (!(h > 0)) return toast("Horas inválidas", "Digite las horas trabajadas.", "wa");
          o.horas = Math.round((o.horas + h) * 2) / 2;
          o.bitacora.push({ estado: o.estado, fecha: D.ahora(), por: o.mecanico || o.tecnico || D.sesion.nom, nota: dec(h, 1) + " h registradas" });
          fn(o); A.refresh();
        };
      }
    });
  }
  function avanzar(o, estado, nota, por) {
    T.paso(o, estado, D.ahora(), por || D.sesion.nom, nota);
  }
  /* cobro de una orden: contado (con medio) o crédito si el cliente lo tiene */
  function cobrar(o, volver, extra) {
    const cli = D.cliById[o.clienteId];
    const k = cuentas(o);
    const total = D.totalizar(o.repuestos.map(x => ({ artId: x.artId, cant: x.cant, precio: x.precio }))
      .concat(o.horas > 0 ? [{ artId: k.mo.id, cant: o.horas, precio: k.mo.precio }] : []).concat(extra || []), {}).total;
    const credito = cli && cli.limite > 0;
    openSheet({
      title: "Facturar y entregar", sub: o.id + " · " + dueno(o),
      body: `<dl class="kv"><dt>Repuestos</dt><dd class="num">${c(k.reps)}</dd>
          ${o.horas > 0 ? `<dt>Mano de obra · ${dec(o.horas, 1)} h</dt><dd class="num">${c(k.manoObra)}</dd>` : ""}
          ${(extra || []).map(l => `<dt>${esc(art(l.artId).desc)}</dt><dd class="num">${c(l.precio * l.cant)}</dd>`).join("")}
          <dt><b>Total con IVA</b></dt><dd class="num" style="font-size:16px">${c(total)}</dd></dl>
        <div class="field" style="margin-top:14px"><label>Condición</label>${seg("trCond", credito ? ["Contado", "Crédito"] : ["Contado"], "Contado")}</div>
        <div class="field" id="trMedioF"><label>Medio de pago</label>${seg("trMedio", ["Efectivo", "Tarjeta", "SINPE móvil", "Transferencia"], "Efectivo")}</div>
        <p class="dim" style="font-size:12px">Factura electrónica desde la caja ${CAJA.term} de ${U.locNom(CAJA.locId)}. Los repuestos salen de la ${U.locNom(B).toLowerCase()}; la mano de obra va como servicio.${credito ? " Crédito disponible: " + c(cli.limite - cli.saldo) + "." : ""}</p>`,
      footer: `<button class="btn" id="trNo">Volver</button><button class="btn pri" id="trSi">${icon("file")}Facturar</button>`,
      after: r => {
        let cond = "Contado", medio = "Efectivo";
        onSeg(r, "trCond", v => { cond = v; $("#trMedioF", r).style.display = v === "Crédito" ? "none" : ""; });
        onSeg(r, "trMedio", v => { medio = v; });
        $("#trNo", r).onclick = () => volver(o);
        $("#trSi", r).onclick = () => {
          const x = facturar(o, cond, medio, extra);
          if (x.error) return toast("No se facturó", x.error, "cr");
          avanzar(o, "Entregada", "Factura " + x.doc.cons + " · " + (cond === "Crédito" ? "a crédito" : medio));
          o.cerrada = D.ahora();
          closeSheet();
          toast("Factura " + x.doc.cons + " aplicada", "Bajaron los repuestos de la bodega del taller y se generó el asiento" + (cond === "Crédito" ? " y la cuenta por cobrar." : "."), "ok");
          A.refresh();
        };
      }
    });
  }

  /* ═════════════════════════════════════════════════════════════
     TAL-001 · Órdenes de trabajo del taller automotriz
     ═════════════════════════════════════════════════════════════ */
  const COLS = ["Recibida", "En diagnóstico", "Esperando repuestos", "En reparación", "Lista para entregar"];

  function tarjetaOT(o) {
    const v = veh(o), atraso = o.promesa && o.promesa < D.ahora() && o.estado !== "Lista para entregar";
    return `<button class="card" data-ot="${o.id}" style="display:block;width:100%;text-align:left;padding:10px 12px;margin-bottom:8px;cursor:pointer">
      <div style="display:flex;justify-content:space-between;gap:6px"><b class="num" style="font-size:12px">${o.id}</b>${o.flota ? tag("Flota", "acc") : tag("Cliente", "mu")}</div>
      <div style="font-weight:650;font-size:13px;margin-top:4px">${esc(v.desc)}</div>
      <div class="dim num" style="font-size:11.5px">${esc(v.placa)} · ${grp(o.km)} ${v.placa === "horómetro" ? "h" : "km"}</div>
      <div class="mut" style="font-size:12px;margin-top:4px">${esc(o.falla)}</div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11.5px"><span class="dim">${esc(o.mecanico ? nombre(o.mecanico) : "Sin asignar")}</span>
        ${pendientes(o).length ? tag("Falta repuesto", "wa") : atraso ? tag("Atrasada", "cr") : `<span class="dim">${dias(o.recibida) ? dias(o.recibida) + " d" : "hoy"}</span>`}</div></button>`;
  }

  function tablero(v) {
    const ab = abiertas(T.ORDENES), mes = T.ORDENES.filter(o => o.estado === "Entregada");
    const costoFlota = mes.filter(o => o.flota).reduce((s, o) => s + (o.costoRepuestos || 0) + (o.costoMO || 0), 0);
    const facturado = mes.filter(o => o.factura).reduce((s, o) => { const d = D.documentos.find(x => x.cons === o.factura); return s + (d ? d.total : 0); }, 0);
    v.innerHTML = `<div class="wrap">
      ${U.resumen([
        U.ts("órdenes abiertas", grp(ab.length), { txt: ab.filter(o => o.flota).length + " de la flota · " + ab.filter(o => !o.flota).length + " de clientes" }),
        U.ts("esperando repuestos", grp(ab.filter(o => pendientes(o).length).length), { txt: "la orden no avanza hasta que Bodega reciba" }, "var(--warn)"),
        U.ts("Mantenimiento de flota del mes", c(costoFlota), { txt: "repuestos al costo + horas de mecánico" }),
        U.ts("Facturado a clientes", c(facturado), { txt: "órdenes entregadas este mes" })
      ])}
      <div style="display:grid;grid-template-columns:repeat(${COLS.length},minmax(180px,1fr));gap:12px;overflow-x:auto">
        ${COLS.map(col => {
          const L = ab.filter(o => o.estado === col);
          return `<div><div style="display:flex;justify-content:space-between;align-items:center;margin:0 2px 8px;font-size:12px;font-weight:650;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">${esc(col)}<span class="num">${L.length}</span></div>
            ${L.map(tarjetaOT).join("") || `<div class="dim" style="font-size:12px;padding:10px;border:1px dashed var(--hair);border-radius:10px;text-align:center">Nada aquí</div>`}</div>`;
        }).join("")}
      </div></div>`;
  }
  const wireOT = v => $$("[data-ot]", v).forEach(b => b.addEventListener("click", () => fichaOT(T.ORDENES.find(o => o.id === b.dataset.ot))));

  function listaOT(v) {
    const F = U.filtrar("tal-ot", T.ORDENES, [{ v: "todas", t: "Todas", f: () => true }, { v: "abiertas", t: "Abiertas", f: o => o.estado !== "Entregada" },
      { v: "flota", t: "Flota propia", f: o => o.flota }, { v: "clientes", t: "Clientes", f: o => !o.flota },
      { v: "repuesto", t: "Esperando repuestos", f: o => pendientes(o).length > 0, k: "wa" }]);
    const L = F.rows;
    v.innerHTML = `<div class="wrap"><div class="ffila">${F.chips}</div>${card({
      title: "Órdenes de setiembre", hint: "cada orden guarda quién la recibió, quién la trabajó y cómo se cerró",
      body: table({
        cols: [
          { t: "Orden", fmt: o => `<b class="num">${o.id}</b><div class="dim num" style="font-size:11.5px">${fecha(o.recibida)}</div>` },
          { t: "Vehículo", fmt: o => `${esc(veh(o).desc)}<div class="dim num" style="font-size:11.5px">${esc(veh(o).placa)}</div>` },
          { t: "Dueño", fmt: o => (o.flota ? tag("Flota propia", "acc") : esc(dueno(o))) },
          { t: "Trabajo", fmt: o => `<span class="mut">${esc(o.falla)}</span>` },
          { t: "Mecánico", fmt: o => esc(o.mecanico ? nombre(o.mecanico) : "—") },
          { t: "Estado", fmt: o => est(o.estado) },
          { t: "Cierre", r: true, fmt: o => o.factura ? `<span class="num">${esc(o.factura)}</span>` : o.asiento ? `<span class="num dim">${esc(o.asiento)}</span>` : '<span class="dim">—</span>' }
        ], rows: L, onRow: true
      })
    })}</div>`;
    filas = L;
  }
  function listaOTWire(v) {
    U.onFiltro(document, "tal-ot");
    $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => fichaOT(filas[+tr.dataset.i])));
  }

  function vehiculos(v) {
    const flota = T.VEHICULOS.filter(x => x.flota), clientes = T.VEHICULOS.filter(x => !x.flota);
    const prox = x => x.ultServ + x.intervalo, falta = x => prox(x) - x.km;
    const enTaller = x => abiertas(T.ORDENES).find(o => o.vehId === x.id);
    v.innerHTML = `<div class="wrap">
      ${card({
        title: "Flota propia · mantenimiento preventivo", hint: "el servicio toca por kilometraje (horas en el montacargas)",
        body: table({
          cols: [
            { t: "Unidad", fmt: x => `<b>${esc(x.desc)}</b><div class="dim num" style="font-size:11.5px">${esc(x.placa)}</div>` },
            { t: "Actual", r: true, fmt: x => `<span class="num">${grp(x.km)}</span>` },
            { t: "Último servicio", r: true, fmt: x => `<span class="num">${grp(x.ultServ)}</span>` },
            { t: "Próximo", r: true, fmt: x => `<span class="num">${grp(prox(x))}</span>` },
            { t: "Estado", fmt: x => { const o = enTaller(x); if (o) return tag("En taller · " + o.id, "acc", "wrench"); const f = falta(x); return f < 0 ? tag("Vencido por " + grp(-f), "cr") : f < x.intervalo * 0.1 ? tag("Toca en " + grp(f), "wa") : tag("Al día", "ok"); } },
            { t: "", r: true, fmt: x => enTaller(x) ? "" : `<button class="btn sm" data-nueva="${x.id}">${icon("plus")}Orden</button>` }
          ], rows: flota
        })
      })}
      ${card({
        title: "Vehículos de clientes", hint: "historial de lo que se les ha hecho",
        body: table({
          cols: [
            { t: "Vehículo", fmt: x => `<b>${esc(x.desc)}</b><div class="dim num" style="font-size:11.5px">${esc(x.placa)}</div>` },
            { t: "Cliente", fmt: x => esc(cliNom(x.clienteId)) },
            { t: "Kilometraje", r: true, fmt: x => `<span class="num">${grp(x.km)}</span>` },
            { t: "Órdenes", r: true, fmt: x => `<span class="num">${T.ORDENES.filter(o => o.vehId === x.id).length}</span>` },
            { t: "", r: true, fmt: x => enTaller(x) ? tag("En taller", "acc", "wrench") : `<button class="btn sm" data-nueva="${x.id}">${icon("plus")}Orden</button>` }
          ], rows: clientes
        })
      })}</div>`;
  }
  const vehiculosWire = v => $$("[data-nueva]", v).forEach(b => b.addEventListener("click", () => nuevaOrden(b.dataset.nueva)));

  function nuevaOrden(vehId) {
    openSheet({
      title: "Recibir vehículo", sub: "Orden " + T.siguienteOT() + " · queda firmada la boleta de ingreso",
      body: `<div class="field"><label>Vehículo</label><select id="noV" class="inp">${T.VEHICULOS.filter(x => !abiertas(T.ORDENES).some(o => o.vehId === x.id)).map(x =>
        `<option value="${x.id}" ${x.id === vehId ? "selected" : ""}>${esc(x.desc)} · ${esc(x.placa)} · ${esc(x.flota ? "Flota" : cliNom(x.clienteId))}</option>`).join("")}</select></div>
        <div class="field"><label>Kilometraje de ingreso</label><input id="noKm" class="inp num" type="number"></div>
        <div class="field"><label>Lo que reporta el conductor o el cliente</label><input id="noF" class="inp" value="Servicio preventivo"></div>
        <div class="field"><label>Mecánico</label><select id="noM" class="inp"><option value="">Asignar después</option>${T.MECANICOS.map(m => `<option>${esc(m)}</option>`).join("")}</select></div>`,
      footer: `<button class="btn" id="noNo">Cancelar</button><button class="btn pri" id="noSi">${icon("check")}Abrir orden</button>`,
      after: r => {
        const km = () => { const x = T.vehById[$("#noV", r).value]; $("#noKm", r).value = x ? x.km : ""; };
        km(); $("#noV", r).onchange = km;
        $("#noNo", r).onclick = closeSheet;
        $("#noSi", r).onclick = () => {
          const x = T.vehById[$("#noV", r).value]; if (!x) return;
          const k = Math.round(+$("#noKm", r).value);
          if (k < x.km) return toast("Kilometraje menor al anterior", "La última lectura fue " + grp(x.km) + ".", "wa");
          x.km = k;
          const f = $("#noF", r).value.trim() || "Revisión";
          const o = T.nuevaOT({ vehId: x.id, km: k, falla: f, servicio: /servicio|preventiv/i.test(f), recibida: D.ahora(), mecanico: $("#noM", r).value || null,
            promesa: new Date(D.ahora().getTime() + 86400000), checklist: ["Nivel de combustible anotado", "Fotos de ingreso"] });
          o.bitacora.push({ estado: "Recibida", fecha: o.recibida, por: D.sesion.nom, nota: grp(k) + " km" });
          if (o.mecanico) avanzar(o, "En diagnóstico", "Asignado a " + o.mecanico);
          toast("Orden " + o.id + " abierta", x.desc + (o.mecanico ? " · la tiene " + nombre(o.mecanico) : ""), "ok");
          A.refresh(); fichaOT(o);
        };
      }
    });
  }

  function fichaOT(o) {
    const v = veh(o), k = cuentas(o), pend = pendientes(o);
    const cobro = !o.flota;
    const acc = [];
    if (o.estado === "Recibida") acc.push(`<select id="otMec" class="inp" style="width:auto">${T.MECANICOS.map(m => `<option>${esc(m)}</option>`).join("")}</select><button class="btn pri" data-a="asignar">${icon("users")}Asignar y diagnosticar</button>`);
    if (["En diagnóstico", "Esperando repuestos", "En reparación"].includes(o.estado)) acc.push(`<button class="btn" data-a="rep">${icon("plus")}Repuesto</button><button class="btn" data-a="horas">${icon("clock")}Horas</button>`);
    if (o.estado === "En diagnóstico") acc.push(`<button class="btn pri" data-a="diag">${icon("check")}Diagnóstico listo</button>`);
    if (o.estado === "Esperando repuestos") acc.push(`<button class="btn pri" data-a="llego">${icon("box")}Llegó el repuesto</button>`);
    if (o.estado === "En reparación") acc.push(`<button class="btn pri" data-a="lista">${icon("check")}Terminada</button>`);
    if (o.estado === "Lista para entregar") acc.push(o.flota ? `<button class="btn pri" data-a="cerrar">${icon("lock")}Cerrar y entregar</button>` : `<button class="btn pri" data-a="facturar">${icon("file")}Facturar y entregar</button>`);
    openSheet({
      title: o.id + " · " + v.desc, sub: v.placa + " · " + dueno(o) + " · " + o.estado, wide: true,
      body: `<div class="ficha" style="border:1px solid var(--hair);border-radius:12px;margin-bottom:14px">
          ${U.fichaCell("Ingreso", fh(o.recibida))}${U.fichaCell(v.placa === "horómetro" ? "Horas" : "Kilometraje", grp(o.km))}
          ${U.fichaCell("Mecánico", esc(o.mecanico ? nombre(o.mecanico) : "Sin asignar"))}${U.fichaCell("Horas", dec(o.horas, 1))}
          ${U.fichaCell(cobro ? "Total a cobrar" : "Costo para la empresa", c(cobro ? k.total : k.costo))}</div>
        <dl class="kv" style="margin-bottom:14px"><dt>Reporta</dt><dd style="text-align:left">${esc(o.falla)}</dd>
          ${o.diagnostico ? `<dt>Diagnóstico</dt><dd style="text-align:left">${esc(o.diagnostico)}</dd>` : ""}
          ${o.checklist && o.checklist.length ? `<dt>Ingreso</dt><dd style="text-align:left">${esc(o.checklist.join(" · "))}</dd>` : ""}
          ${o.oc ? `<dt>Pedido</dt><dd style="text-align:left"><span class="num">${esc(o.oc)}</span> a ${esc(D.provById[(D.compras.find(x => x.cons === o.oc) || {}).provId] ? D.provById[D.compras.find(x => x.cons === o.oc).provId].nom : "")}</dd>` : ""}
          ${o.factura ? `<dt>Factura</dt><dd style="text-align:left"><span class="num">${esc(o.factura)}</span></dd>` : ""}
          ${o.asiento ? `<dt>Asiento</dt><dd style="text-align:left"><span class="num">${esc(o.asiento)}</span> · mantenimiento y reparaciones contra inventario</dd>` : ""}</dl>
        ${card({ title: "Repuestos", hint: cobro ? "a precio de lista, IVA incluido" : "al costo: la flota no se factura", body: tablaRepuestos(o, cobro) })}
        ${cobro ? `<dl class="kv" style="margin:12px 0"><dt>Repuestos</dt><dd class="num">${c(k.reps)}</dd><dt>Mano de obra · ${dec(o.horas, 1)} h × ${c(k.mo.precio)}</dt><dd class="num">${c(k.manoObra)}</dd><dt><b>Total con IVA</b></dt><dd class="num">${c(k.total)}</dd></dl>`
          : `<dl class="kv" style="margin:12px 0"><dt>Repuestos al costo</dt><dd class="num">${c(k.repC)}</dd><dt>Mano de obra interna · ${dec(o.horas, 1)} h × ${c(T.COSTO_HORA)}</dt><dd class="num">${c(Math.round(o.horas * T.COSTO_HORA))}</dd><dt><b>Costo de la reparación</b></dt><dd class="num">${c(k.costo)}</dd></dl>
             <p class="dim" style="font-size:12px;margin:0 0 12px">Al cerrar, los repuestos salen de la bodega con un asiento a Mantenimiento y reparaciones (6-01-02-005). Las horas ya están en la planilla del mecánico: aquí solo se informan para el costo por unidad.</p>`}
        ${pend.length ? `<div style="padding:10px 12px;border-radius:9px;background:var(--surface-2);border:1px solid var(--hair);font-size:12.5px;margin-bottom:12px">${icon("clock")} Falta ${pend.map(x => x.cant + " × " + esc(art(x.artId).desc)).join(", ")}${o.oc ? " (pedido en " + esc(o.oc) + ")" : ""}. Cuando Bodega lo reciba, «Llegó el repuesto» lo reserva para esta orden.</div>` : ""}
        ${card({ title: "Bitácora", body: `<div style="padding:4px 16px">${bitacora(o)}</div>` })}`,
      footer: acc.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;width:100%">${acc.join("")}</div>` : `<span class="dim" style="font-size:12.5px">${o.estado === "Entregada" ? "Orden cerrada" + (o.cerrada ? " el " + fecha(o.cerrada) : "") : ""}</span>`,
      after: r => $$("[data-a]", r).forEach(b => b.addEventListener("click", () => accionOT(o, b.dataset.a, r)))
    });
  }

  function accionOT(o, a, r) {
    const volver = () => { fichaOT(o); A.refresh(); };
    if (a === "asignar") { o.mecanico = $("#otMec", r).value; avanzar(o, "En diagnóstico", "Asignado a " + o.mecanico); return volver(); }
    if (a === "rep") return agregarRepuesto(o, "Automotriz");
    if (a === "horas") return pedirHoras(o, fichaOT);
    if (a === "diag") {
      if (!o.repuestos.length && !o.horas) return toast("Falta el diagnóstico", "Registre los repuestos o las horas que lleva la reparación.", "wa");
      o.diagnostico = o.diagnostico || (o.servicio ? "Servicio preventivo según el plan de la unidad." : "Revisado por " + nombre(o.mecanico) + ".");
      avanzar(o, pendientes(o).length ? "Esperando repuestos" : "En reparación", pendientes(o).length ? "Falta repuesto en bodega" : "", o.mecanico);
      return volver();
    }
    if (a === "llego") {
      reservarPendientes(o);
      if (pendientes(o).length) return toast("Todavía no está en bodega", "Bodega tiene que recibir el pedido" + (o.oc ? " " + o.oc + " en Compras › Recepción" : "") + "; en cuanto entre a la bodega, se reserva desde aquí.", "wa");
      avanzar(o, "En reparación", "Repuesto recibido y reservado", o.mecanico);
      return volver();
    }
    if (a === "lista") {
      if (!o.horas) return toast("Faltan las horas", "Registre las horas trabajadas antes de terminar.", "wa");
      avanzar(o, "Lista para entregar", "", o.mecanico); return volver();
    }
    if (a === "cerrar") {
      try { D.exigePeriodoAbierto(D.ahora()); T.cerrarFlota(o, D.ahora(), D.sesion.nom); }
      catch (e) { return toast("No se cerró la orden", e.message, "cr"); }
      toast("Orden " + o.id + " cerrada", "Repuestos por " + c(o.costoRepuestos) + " a mantenimiento de flota" + (o.asiento ? " (" + o.asiento + ")" : "") + ".", "ok");
      return volver();
    }
    if (a === "facturar") return cobrar(o, fichaOT);
  }

  A.workspace("tal-ordenes", {
    title: "Órdenes de trabajo",
    tabs: [
      { id: "tablero", t: "Tablero", sub: () => abiertas(T.ORDENES).length + " órdenes en el taller · " + T.MECANICOS.length + " mecánicos",
        badge: () => { const n = abiertas(T.ORDENES).filter(o => o.estado === "Lista para entregar").length; return { n, k: "ok", l: n + " listas" }; },
        actions: () => `<button class="btn pri" data-tal="nueva">${icon("plus")}Recibir vehículo</button>`,
        render: tablero, wire: v => { wireOT(v); wireNueva(v); } },
      { id: "ordenes", t: "Órdenes", sub: "Todas las órdenes del mes, abiertas y cerradas", render: listaOT, wire: listaOTWire },
      { id: "vehiculos", t: "Vehículos", sub: "Mantenimiento preventivo de la flota e historial de clientes",
        badge: () => { const n = T.VEHICULOS.filter(x => x.flota && x.ultServ + x.intervalo - x.km < x.intervalo * 0.1 && !abiertas(T.ORDENES).some(o => o.vehId === x.id)).length; return { n, k: "wa", l: n + " por servicio" }; },
        render: vehiculos, wire: vehiculosWire }
    ]
  });
  function wireNueva(v) { $$("[data-tal=nueva]").forEach(b => { b.onclick = () => nuevaOrden(); }); }

  /* ═════════════════════════════════════════════════════════════
     TAL-002 · Bodega de repuestos del taller
     ═════════════════════════════════════════════════════════════ */
  const filasBodega = () => T.REPUESTOS.map(a => {
    const e = D.stock(a.id, B) || { cant: 0, comp: 0, min: 0 };
    const pedido = D.compras.filter(o => o.locId === B && !["Aplicada", "Anulada"].includes(o.estado) && !(o.rec && o.rec.cerrada))
      .reduce((s, o) => s + o.lineas.filter(l => l.artId === a.id).reduce((t, l) => t + l.cant, 0), 0);
    return { a, e, disp: e.cant - e.comp, pedido, bajo: e.cant - e.comp < e.min };
  });
  function bodega(v) {
    const F = filasBodega();
    const FB = U.filtrar("tal-bod", F, [{ v: "todos", t: "Todos", f: () => true }, { v: "auto", t: "Automotriz", f: f => f.a.sub === "Automotriz" },
      { v: "herr", t: "Herramientas eléctricas", f: f => f.a.sub === "Herramientas eléctricas" }, { v: "res", t: "Con reserva", f: f => f.e.comp > 0 },
      { v: "bajo", t: "Bajo el mínimo sin pedido", f: f => f.bajo && !f.pedido, k: "wa" }, { v: "pedido", t: "Con pedido a compras", f: f => f.pedido > 0 }]);
    const L = FB.rows;
    const valor = F.reduce((s, f) => s + f.e.cant * f.a.costo, 0), res = F.reduce((s, f) => s + f.e.comp * f.a.costo, 0);
    const consumo = D.kardex.filter(k => k.locId === B && k.salida && k.fecha >= D.INICIO).reduce((s, k) => s + k.salida * k.costo, 0);
    v.innerHTML = `<div class="wrap">
      <div class="ffila">${FB.chips}${U.tira([
        U.ts("Valor de la bodega", c(valor), { txt: "al costo, dentro de Inventario (1-01-04-001)" }),
        U.ts("Reservado", c(res), { txt: "apartado para órdenes: no se usa en otra" }),
        U.ts("Consumido en setiembre", c(consumo), { txt: "flota, garantías y lo facturado a clientes" })
      ])}</div>
      ${card({
        title: "Existencias", hint: "disponible = existencia − reservado",
        body: table({
          cols: [
            { t: "Repuesto", fmt: f => `<b>${esc(f.a.desc)}</b><div class="dim num" style="font-size:11.5px">${esc(f.a.cod)} · ${esc(f.a.marca)} · ${esc(f.a.ubic)}</div>` },
            { t: "Existencia", r: true, fmt: f => `<span class="num">${f.e.cant}</span>` },
            { t: "Reservado", r: true, fmt: f => `<span class="num ${f.e.comp ? "" : "dim"}">${f.e.comp}</span>` },
            { t: "Disponible", r: true, fmt: f => `<span class="num b">${f.disp}</span>` },
            { t: "Mínimo", r: true, fmt: f => `<span class="num dim">${f.e.min}</span>` },
            { t: "Costo", r: true, fmt: f => `<span class="num">${c(f.a.costo)}</span>` },
            { t: "Precio", r: true, fmt: f => `<span class="num">${c(f.a.precio)}</span>` },
            { t: "", r: true, fmt: f => f.pedido ? tag("Pedido " + f.pedido, "acc", "truck") : f.bajo ? tag("Pedir", "wa") : "" }
          ], rows: L, onRow: true
        })
      })}</div>`;
    filas = L;
  }
  function bodegaWire(v) {
    U.onFiltro(document, "tal-bod");
    $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => kardexRep(filas[+tr.dataset.i].a)));
    $$("[data-tal=pedir]").forEach(b => { b.onclick = pedirCompras; });
  }
  function kardexRep(a) {
    const K = D.kardex.filter(k => k.artId === a.id && k.locId === B).slice().reverse();
    const uso = T.ORDENES.concat(T.HERRAMIENTAS).filter(o => o.estado !== "Entregada" && o.repuestos.some(x => x.artId === a.id));
    openSheet({
      title: a.desc, sub: a.cod + " · " + U.locNom(B), wide: true,
      body: `${uso.length ? card({ title: "Reservado por", body: table({ cols: [
          { t: "Orden", fmt: o => `<b class="num">${o.id}</b>` },
          { t: "Para", fmt: o => esc(o.tipo === "Automotriz" ? veh(o).desc : o.equipo) },
          { t: "Cant.", r: true, fmt: o => { const x = o.repuestos.find(y => y.artId === a.id); return `<span class="num">${x.cant}</span>`; } },
          { t: "", r: true, fmt: o => o.repuestos.find(y => y.artId === a.id).pendiente ? tag("Esperando", "wa") : tag("Reservado", "ok") }
        ], rows: uso }) }) : ""}
        ${card({ title: "Kardex", hint: "movimientos en la bodega del taller", body: K.length ? table({ cols: [
          { t: "Fecha", fmt: k => `<span class="num">${fh(k.fecha)}</span>` },
          { t: "Movimiento", fmt: k => esc(k.tipo) + (k.nota ? `<div class="dim" style="font-size:11.5px">${esc(k.nota)}</div>` : "") },
          { t: "Documento", fmt: k => `<span class="num">${esc(k.doc || "")}</span>` },
          { t: "Entrada", r: true, fmt: k => k.entrada ? `<span class="num">${k.entrada}</span>` : "" },
          { t: "Salida", r: true, fmt: k => k.salida ? `<span class="num">${k.salida}</span>` : "" },
          { t: "Saldo", r: true, fmt: k => `<span class="num b">${k.saldo}</span>` }
        ], rows: K }) : empty("history", "Sin movimientos", "El saldo viene de la migración al 31 de agosto.") })}`
    });
  }
  /* los que están bajo el mínimo y no tienen pedido: una orden a la distribuidora */
  function pedirCompras() {
    const F = filasBodega().filter(f => f.bajo && !f.pedido);
    if (!F.length) return toast("No hay nada que pedir", "Todo lo que está bajo el mínimo ya tiene pedido a compras.", "ok");
    const items = F.map(f => ({ a: f.a.id, c: Math.max(1, f.e.min * 2 - f.disp), v: 0 }));
    openSheet({
      title: "Pedir a compras", sub: "Orden de compra a " + D.provById[T.PROV.id].nom + " · se recibe en la " + U.locNom(B).toLowerCase(),
      body: table({ cols: [
        { t: "Repuesto", fmt: it => esc(art(it.a).desc) },
        { t: "Cantidad", r: true, fmt: it => `<span class="num">${it.c}</span>` },
        { t: "Costo", r: true, fmt: it => `<span class="num">${c(it.c * art(it.a).costo)}</span>` }
      ], rows: items }) + `<p class="dim" style="font-size:12px">Sugerido: hasta el doble del mínimo. Queda como borrador para que Proveeduría lo apruebe; el taller no compra directo.</p>`,
      footer: `<button class="btn" id="pcNo">Cancelar</button><button class="btn pri" id="pcSi">${icon("cart")}Registrar el borrador</button>`,
      after: r => {
        $("#pcNo", r).onclick = closeSheet;
        $("#pcSi", r).onclick = () => {
          const oc = D.crearOC(T.PROV.id, B, items, "Registrada", D.ahora());
          oc.creadoPor = D.sesion.nom; oc.origen = "Taller";
          oc.hist = [{ f: D.ahora(), quien: D.sesion.nom, acc: "Registró la orden desde la bodega del taller" }];
          closeSheet();
          toast("Borrador " + oc.cons.replace(/^BOR-/, "") + " registrado", "Queda en Compras por aprobar; al aprobarse toma su consecutivo OC-2026-… y, al recibirla, entra a la bodega del taller.", "ok");
          A.refresh();
        };
      }
    });
  }
  A.screen("tal-bodega", {
    title: "Bodega de repuestos del taller",
    sub: () => U.locNom(B) + " · los repuestos que usa el taller, separados de la venta de las tiendas",
    extra: () => `<button class="btn pri" data-tal="pedir">${icon("cart")}Pedir a compras</button>`,
    render: bodega,
    wire: bodegaWire
  });

  /* ═════════════════════════════════════════════════════════════
     TAL-003 · Taller de reparación de herramientas
     ═════════════════════════════════════════════════════════════ */
  function herramientas(v) {
    const FH = U.filtrar("tal-hr", T.HERRAMIENTAS, [{ v: "todas", t: "Todas", f: () => true }, { v: "abiertas", t: "En el taller", f: o => o.estado !== "Entregada" },
      { v: "diag", t: "Por diagnosticar", f: o => o.estado === "Recibida" || o.estado === "En diagnóstico" },
      { v: "cliente", t: "Esperando al cliente", f: o => o.estado === "Presupuesto enviado", k: "wa" },
      { v: "retirar", t: "Listas para retirar", f: o => o.estado === "Lista para retirar" }, { v: "garantia", t: "En garantía", f: o => o.garantia }]);
    const L = FH.rows;
    v.innerHTML = `<div class="wrap">
      <div class="ffila">${FH.chips}</div>
      ${card({
        title: "Boletas de reparación", hint: "cada herramienta entra con boleta firmada, número de serie y accesorios",
        body: table({
          cols: [
            { t: "Boleta", fmt: o => `<b class="num">${o.id}</b><div class="dim num" style="font-size:11.5px">${fecha(o.recibida)}</div>` },
            { t: "Herramienta", fmt: o => `<b>${esc(o.equipo)}</b><div class="dim" style="font-size:11.5px">${esc(o.marca)} · serie <span class="num">${esc(o.serie)}</span></div>` },
            { t: "Cliente", fmt: o => esc(cliNom(o.clienteId)) },
            { t: "Falla", fmt: o => `<span class="mut">${esc(o.falla)}</span>` },
            { t: "Técnico", fmt: o => esc(o.tecnico ? nombre(o.tecnico) : "—") },
            { t: "Estado", fmt: o => est(o.estado) + (o.garantia ? " " + tag("Garantía", "acc", "shield") : "") },
            { t: "Monto", r: true, fmt: o => o.garantia ? '<span class="dim">sin cobro</span>' : o.repuestos.length || o.horas ? `<span class="num">${c(cuentas(o).total)}</span>` : '<span class="dim">—</span>' }
          ], rows: L, onRow: true
        })
      })}</div>`;
    filas = L;
  }
  function herramientasWire(v) {
    U.onFiltro(document, "tal-hr");
    $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => fichaHR(filas[+tr.dataset.i])));
    $$("[data-tal=boleta]").forEach(b => { b.onclick = nuevaBoleta; });
  }

  function nuevaBoleta() {
    const cli = D.clientes;
    openSheet({
      title: "Recibir herramienta", sub: "Boleta de reparación · el cliente firma el estado de ingreso",
      body: `<div class="field"><label>Cliente</label><select id="nbC" class="inp">${cli.map(x => `<option value="${x.id}">${esc(x.nom)}</option>`).join("")}</select></div>
        <div class="field"><label>Herramienta</label><input id="nbE" class="inp" value="Taladro percutor ½&quot;"></div>
        <div class="field"><label>Marca y serie</label><div style="display:flex;gap:8px"><input id="nbM" class="inp" value="DeWalt"><input id="nbS" class="inp num" placeholder="Número de serie"></div></div>
        <div class="field"><label>Falla que reporta</label><input id="nbF" class="inp" value="No enciende"></div>
        <label style="display:flex;gap:8px;align-items:center;font-size:13px;margin-top:8px"><input type="checkbox" id="nbG"> La compró aquí y está en garantía</label>
        <p class="dim" style="font-size:12px">El diagnóstico cuesta ${c(T.DIAG.precio)}; si el cliente aprueba la reparación, no se cobra aparte.</p>`,
      footer: `<button class="btn" id="nbNo">Cancelar</button><button class="btn pri" id="nbSi">${icon("check")}Registrar boleta</button>`,
      after: r => {
        $("#nbNo", r).onclick = closeSheet;
        $("#nbSi", r).onclick = () => {
          const cid = $("#nbC", r).value, g = $("#nbG", r).checked;
          let factura = null;
          if (g) {
            const v = D.documentos.find(d => d.clienteId === cid && d.tipo !== "NC" && d.lineas.some(l => (art(l.artId) || {}).fam === "HER"));
            if (!v) return toast("No aparece la compra", cliNom(cid) + " no tiene una factura de herramienta. La garantía se da contra la factura de venta.", "wa");
            factura = v.cons;
          }
          const f = D.ahora();
          const o = { id: T.nuevaHR(), tipo: "Herramienta", clienteId: cid, equipo: $("#nbE", r).value.trim() || "Herramienta", marca: $("#nbM", r).value.trim(), serie: $("#nbS", r).value.trim() || "sin serie",
            falla: $("#nbF", r).value.trim(), recibida: f, tecnico: null, diagnostico: "", estado: "Recibida", repuestos: [], horas: 0, garantia: g, factura,
            bitacora: [{ estado: "Recibida", fecha: f, por: D.sesion.nom, nota: "Boleta firmada por el cliente" + (factura ? " · garantía contra " + factura : "") }], accesorios: [] };
          T.HERRAMIENTAS.unshift(o);
          toast("Boleta " + o.id + " registrada", "Se le envía copia al cliente por WhatsApp.", "ok");
          A.refresh(); fichaHR(o);
        };
      }
    });
  }

  function fichaHR(o) {
    const k = cuentas(o);
    const acc = [];
    if (o.estado === "Recibida") acc.push(`<select id="hrT" class="inp" style="width:auto">${T.TECNICOS.concat(T.MECANICOS).map(m => `<option>${esc(m)}</option>`).join("")}</select><button class="btn pri" data-a="asignar">${icon("users")}Asignar</button>`);
    if (["En diagnóstico", "Aprobada", "En reparación"].includes(o.estado)) acc.push(`<button class="btn" data-a="rep">${icon("plus")}Repuesto</button><button class="btn" data-a="horas">${icon("clock")}Horas</button>`);
    if (o.estado === "En diagnóstico") acc.push(o.garantia ? `<button class="btn pri" data-a="garantia">${icon("shield")}Reparar en garantía</button>` : `<button class="btn pri" data-a="presupuesto">${icon("chat")}Enviar presupuesto</button>`);
    if (o.estado === "Presupuesto enviado") acc.push(`<button class="btn" data-a="rechazo">${icon("x")}No aprobó</button><button class="btn pri" data-a="aprobo">${icon("check")}Cliente aprobó</button>`);
    if (o.estado === "Aprobada") acc.push(`<button class="btn pri" data-a="reparar">${icon("wrench")}Empezar reparación</button>`);
    if (o.estado === "En reparación") acc.push(`<button class="btn pri" data-a="lista">${icon("check")}Terminada</button>`);
    if (o.estado === "Lista para retirar") acc.push(o.garantia ? `<button class="btn pri" data-a="entregaG">${icon("shield")}Entregar sin cobro</button>`
      : o.rechazo ? `<button class="btn pri" data-a="cobrarD">${icon("file")}Cobrar diagnóstico y entregar</button>` : `<button class="btn pri" data-a="cobrar">${icon("file")}Facturar y entregar</button>`);
    openSheet({
      title: o.id + " · " + o.equipo, sub: o.marca + " · " + cliNom(o.clienteId) + " · " + o.estado, wide: true,
      body: `<div class="ficha" style="border:1px solid var(--hair);border-radius:12px;margin-bottom:14px">
          ${U.fichaCell("Ingreso", fh(o.recibida))}${U.fichaCell("Serie", esc(o.serie))}${U.fichaCell("Técnico", esc(o.tecnico ? nombre(o.tecnico) : "Sin asignar"))}
          ${U.fichaCell(o.garantia ? "Costo en garantía" : "Presupuesto", c(o.garantia ? k.repC : k.total))}</div>
        <dl class="kv" style="margin-bottom:14px"><dt>Reporta</dt><dd style="text-align:left">${esc(o.falla)}</dd>
          ${o.diagnostico ? `<dt>Diagnóstico</dt><dd style="text-align:left">${esc(o.diagnostico)}</dd>` : ""}
          ${o.accesorios && o.accesorios.length ? `<dt>Accesorios</dt><dd style="text-align:left">${esc(o.accesorios.join(", "))}</dd>` : ""}
          ${o.garantia ? `<dt>Garantía</dt><dd style="text-align:left">${o.factura ? "contra la factura <span class=\"num\">" + esc(o.factura) + "</span> · " : ""}sin cobro al cliente${o.reclamo ? " · reclamo a " + esc(o.reclamo.prov) + " por " + c(o.reclamo.monto) : ""}</dd>` : ""}
          ${o.facturaTaller ? `<dt>Factura</dt><dd style="text-align:left"><span class="num">${esc(o.facturaTaller)}</span></dd>` : ""}
          ${o.asiento ? `<dt>Asiento</dt><dd style="text-align:left"><span class="num">${esc(o.asiento)}</span> · reclamos a proveedores contra inventario</dd>` : ""}</dl>
        ${card({ title: "Repuestos", hint: o.garantia ? "al costo: los paga el proveedor" : "a precio de lista, IVA incluido", body: tablaRepuestos(o, !o.garantia) })}
        ${o.garantia ? "" : `<dl class="kv" style="margin:12px 0"><dt>Repuestos</dt><dd class="num">${c(k.reps)}</dd><dt>Mano de obra · ${dec(o.horas, 1)} h × ${c(k.mo.precio)}</dt><dd class="num">${c(k.manoObra)}</dd><dt><b>Total con IVA</b></dt><dd class="num">${c(k.total)}</dd></dl>`}
        ${card({ title: "Bitácora", body: `<div style="padding:4px 16px">${bitacora(o)}</div>` })}`,
      footer: acc.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;width:100%">${acc.join("")}</div>` : `<span class="dim" style="font-size:12.5px">${o.historico ? "Entregada y cobrada en caja" : o.estado === "Entregada" ? "Entregada" : ""}</span>`,
      after: r => $$("[data-a]", r).forEach(b => b.addEventListener("click", () => accionHR(o, b.dataset.a, r)))
    });
  }

  function accionHR(o, a, r) {
    const volver = () => { fichaHR(o); A.refresh(); };
    const por = o.tecnico || D.sesion.nom;
    if (a === "asignar") { o.tecnico = $("#hrT", r).value; avanzar(o, "En diagnóstico", "Asignada a " + o.tecnico); return volver(); }
    if (a === "rep") return agregarRepuesto(o, "Herramientas eléctricas");
    if (a === "horas") return pedirHoras(o, fichaHR);
    if (a === "presupuesto") {
      if (!o.repuestos.length && !o.horas) return toast("Falta el diagnóstico", "Registre los repuestos y las horas antes de presupuestar.", "wa");
      o.diagnostico = o.diagnostico || "Revisada por " + nombre(o.tecnico) + ".";
      avanzar(o, "Presupuesto enviado", c(cuentas(o).total) + " enviado por WhatsApp al cliente", por); return volver();
    }
    if (a === "aprobo") { avanzar(o, "Aprobada", "El cliente aprobó por WhatsApp · el diagnóstico no se cobra aparte", "Cliente"); return volver(); }
    if (a === "rechazo") {
      liberar(o); o.repuestos = []; o.horas = 0; o.rechazo = true;
      avanzar(o, "Lista para retirar", "No aprobó la reparación: se cobra solo el diagnóstico", "Cliente"); return volver();
    }
    if (a === "reparar") { avanzar(o, "En reparación", "", por); return volver(); }
    if (a === "garantia") {
      if (!o.repuestos.length) return toast("Faltan los repuestos", "Registre lo que se cambia: su costo se le reclama al proveedor.", "wa");
      avanzar(o, "En reparación", "Garantía confirmada contra " + (o.factura || "la factura de venta"), por); return volver();
    }
    if (a === "lista") {
      if (pendientes(o).length) return toast("Falta un repuesto", "No se puede terminar hasta que llegue a la bodega.", "wa");
      if (!o.garantia && !o.horas) return toast("Faltan las horas", "Registre las horas trabajadas antes de terminar.", "wa");
      avanzar(o, "Lista para retirar", "Se le avisa al cliente por WhatsApp", por); return volver();
    }
    if (a === "entregaG") {
      if (pendientes(o).length) return toast("Falta un repuesto", "No se puede entregar hasta que llegue a la bodega.", "wa");
      let costo;
      try { costo = cerrarGarantia(o); } catch (e) { return toast("No se entregó", e.message, "cr"); }
      avanzar(o, "Entregada", "Sin cobro · repuestos por " + c(costo) + " reclamados a " + o.reclamo.prov);
      toast("Entregada en garantía", "Repuestos por " + c(costo) + " quedan en Reclamos a proveedores" + (o.asiento ? " (" + o.asiento + ")" : "") + ".", "ok");
      return volver();
    }
    if (a === "cobrar") return cobrarHR(o);
    if (a === "cobrarD") return cobrarHR(o, [{ artId: T.DIAG.id, cant: 1, precio: T.DIAG.precio }]);
  }
  /* la factura de la herramienta usa el mismo cobro que la orden automotriz */
  const cobrarHR = (o, extra) => cobrar(o, fichaHR, extra);

  A.screen("tal-herramientas", {
    title: "Reparación de herramientas",
    sub: () => abiertas(T.HERRAMIENTAS).length + " herramientas en el taller · " + T.TECNICOS.length + " técnicos · se cobra en la caja " + CAJA.term + " de " + U.locNom(CAJA.locId),
    extra: () => `<button class="btn pri" data-tal="boleta">${icon("plus")}Recibir herramienta</button>`,
    render: herramientas, wire: herramientasWire
  });
})(window);
