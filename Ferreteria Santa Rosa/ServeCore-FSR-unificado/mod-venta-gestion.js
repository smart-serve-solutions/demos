/* ═══════════════════════════════════════════════════════════════
   Ventas — todo lo que rodea a la caja. Una opción por tarea:
   Pendientes de ventas · Caja y turnos · Cotizaciones y pedidos ·
   Entregas y retiros · Documentos y devoluciones · Clientes ·
   Precios, descuentos y márgenes · Vendedores y comisiones.
   La facturación vive en mod-venta.js; los datos y la lógica de lo
   que la venta hace sola, en ven-auto.js (window.VENX).
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, S = w.S, U = w.UI, V = w.VENX;
  const { $, $$, esc, norm, grp, c, dec, kg, fecha, fh, hora, icon, tag, card, stat, table, seg, onSeg,
    fichaCell, openSheet, closeSheet, toast, locNom, cliNom, artOf, empty, prog, bars, ini } = U;

  const nota = (html, ic) => `<div style="display:flex;gap:10px;padding:11px 13px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);font-size:12.5px;color:var(--ink-2);line-height:1.55">${icon(ic || "info", 'style="flex:none;color:var(--accent)"')}<div>${html}</div></div>`;
  const hl = (n, t) => `<div class="hl"><b>${n}</b><span>${esc(t)}</span></div>`;
  const dias = n => (n === 0 ? "hoy" : n === 1 ? "1 día" : n + " días");
  const hace = d => { const n = V.diasEntre(d, D.HOY); return n <= 0 ? "hoy " + hora(d) : "hace " + dias(n); };
  const kvs = rows => `<dl class="kv">${rows.map(r => `<dt>${esc(r[0])}</dt><dd>${r[1]}</dd>`).join("")}</dl>`;
  const swtch = (id, on, attrs) => `<button class="swtch" ${id ? `id="${id}"` : ""} role="switch" aria-checked="${!!on}" ${attrs || ""}><i></i></button>`;
  const prefRow = (t, d, ctrl) => `<div class="pref-row"><span class="pt"><div class="pn">${esc(t)}</div>${d ? `<div class="pd">${d}</div>` : ""}</span>${ctrl}</div>`;
  const cerrar = el => $$("[data-cerrar]", el).forEach(b => b.addEventListener("click", closeSheet));
  const ambitoSeg = (id, cur) => seg(id, [{ v: "local", t: locNom(S.locId) }, { v: "todos", t: "Todos los locales" }], cur);
  const numIn = s => parseFloat(String(s).replace(/\s/g, "").replace(",", ".")) || 0;
  /* pasa una proforma o un pedido a la factura en curso, sin redigitar */
  function aCaja(p) {
    const cli = D.cliById[p.clienteId];
    S.cart = {
      cliId: p.clienteId, condicion: cli && cli.limite ? "Crédito" : "Contado", draft: new Date(), apartado: [],
      lineas: p.lineas.map(l => ({ artId: l.artId, cant: l.cant, precio: l.precio, descTipo: "pct", desc: l.desc || 0, nota: l.nota || "", auth: false, auto: !l.desc }))
    };
    S.posSel = null;
    p.enCaja = true;
    toast("Cargada en la caja", p.cons + " pasó a la factura en curso sin volver a digitar.", "ok");
    A.go("pos");
  }

  /* ═════════════════════════════════════════════════════════════
     1 · PENDIENTES DE VENTAS — lo que necesita a una persona hoy
     ═════════════════════════════════════════════════════════════ */
  let vpAmbito = "local";
  const GRUPOS = [["Autorizar", "shield"], ["Entregar", "truck"], ["Dar seguimiento", "clock"], ["Caja", "cash"]];
  A.screen("ven-pendientes", {
    title: "Pendientes de ventas",
    sub: () => {
      const P = V.pendientes(vpAmbito === "local" ? S.locId : null);
      return (P.length ? P.length + " asuntos para hoy" : "Nada pendiente") + " · " + (vpAmbito === "local" ? locNom(S.locId) : "todos los locales") + " · lo demás corre solo";
    },
    extra: () => ambitoSeg("vpa", vpAmbito),
    render(v) {
      const loc = vpAmbito === "local" ? S.locId : null;
      const P = V.pendientes(loc);
      const hoy = D.ventasDelDia(loc);
      const venta = hoy.reduce((s, d) => s + d.total, 0);
      const ncHoy = D.documentos.filter(d => d.tipo === "NC" && V.esHoy(d.fecha) && (!loc || d.locId === loc)).length;
      const hecho = [
        hl(grp(V.STATS.descAutoHoy), "líneas con el descuento de la categoría del cliente, aplicado solo en la caja"),
        hl(grp(V.STATS.topeHoy), "de esas quedaron en el tope para no bajar del margen mínimo de la familia"),
        hl(grp(V.STATS.reservas), "retiros en otro local con la mercadería ya reservada en el local de retiro"),
        hl(grp(V.BARRIDO.abiertas), "autorizaciones abiertas después del barrido de anoche a las " + V.PARAM.barrido),
        hl(grp(D.proformas.filter(p => p.estado === "Vencida").length), "proformas vencidas que pasaron solas a ventas perdidas"),
        hl(grp(ncHoy), "notas de crédito firmadas por el cliente y enviadas a Hacienda hoy")
      ].join("");
      v.innerHTML = `<div class="wrap">
        <div class="grid" style="grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);align-items:start">
          <div class="wrap">${P.length ? GRUPOS.map(g => {
        const its = P.filter(p => p.grupo === g[0]);
        if (!its.length) return "";
        return card({
          title: g[0], hint: its.length + (its.length === 1 ? " asunto" : " asuntos"), flush: true,
          body: `<div class="alerts">${its.map(p => `<button class="alert ${p.k}" data-ir="${p.ir}">${icon(p.ic)}
              <span style="flex:1;min-width:0"><span class="at" style="display:block">${esc(p.t)}</span><span class="as">${esc(p.d)}</span></span>
              <span class="btn sm" style="flex:none">${esc(p.btn)}</span></button>`).join("")}</div>`
        });
      }).join("") : card({ body: empty("check", "Nada pendiente", "Todo lo de hoy está atendido. Lo nuevo va a aparecer aquí.") })}</div>
          <div style="display:flex;flex-direction:column;gap:14px">
            ${card({
        title: "Hoy en " + (loc ? locNom(loc) : "los siete locales"),
        body: `<div class="ficha" style="margin:-16px -17px">${fichaCell("Venta", c(venta))}${fichaCell("Documentos", grp(hoy.length))}${fichaCell("Tiquete promedio", c(hoy.length ? venta / hoy.length : 0))}</div>`
      })}
            ${card({ title: "Lo que el sistema hizo solo", hint: "hoy", body: hecho })}
            ${card({
        title: "Atajos",
        body: `<div style="display:flex;flex-wrap:wrap;gap:8px">
            <button class="btn sm pri" data-ir="pos">${icon("cart")}Facturar</button>
            <button class="btn sm" data-ir="caja|mia">${icon("cash")}Mi caja</button>
            <button class="btn sm" data-ir="documentos|devolver">${icon("swap")}Devolver mercadería</button>
            <button class="btn sm" data-ir="cotizaciones|pedidos">${icon("chat")}Pedidos</button>
            <button class="btn sm" data-ir="despachos|retiros">${icon("pin")}Retiros en otro local</button></div>`
      })}
          </div>
        </div></div>`;
    },
    wire(v) {
      A.wireIr(v);
      onSeg(document, "vpa", x => { vpAmbito = x; A.refresh(); });
    }
  });

  /* ═════════════════════════════════════════════════════════════
     2 · CAJA Y TURNOS — Mi caja · Cajas del local · Terminales
     ═════════════════════════════════════════════════════════════ */
  const cajaNom = t => "Caja " + t.n + " · " + locNom(t.locId);
  function arqueo(t, despues) {
    const r = V.resumen(t);
    const DEN = [20000, 10000, 5000, 2000, 1000, 500, 100, 50, 25, 10, 5];
    const tarj = r.porMedio.find(m => m.medio === "Tarjeta").monto;
    const hab = V.HABILITADOS[t.locId] || [];
    openSheet({
      title: "Arqueo y cierre", sub: cajaNom(t) + " · " + t.cajero + " · abrió " + fh(t.abre), wide: true,
      body: `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start">
          <div>${card({
        title: "Efectivo contado", hint: "billetes y monedas",
        body: `<div class="grid" style="grid-template-columns:repeat(2,1fr);gap:8px">${DEN.map(d => `<div class="field" style="margin:0"><label>₡${grp(d)}</label><input class="num" data-den="${d}" inputmode="numeric" placeholder="0" style="text-align:right"></div>`).join("")}</div>
          <div class="field" style="margin:12px 0 0"><label for="arqUsd">Dólares contados (US$) · van aparte, sin convertir</label><input class="num" id="arqUsd" inputmode="decimal" placeholder="0,00" style="text-align:right"></div>`
      })}</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${card({
        title: "Contra lo que dice el sistema", flush: true,
        body: table({
          /* arqueo ciego: el efectivo esperado no se ve hasta que el cajero termina de contar */
          cols: [{ t: "Medio" , fmt: x => esc(x.medio) }, { t: "Esperado", r: true, cls: "mono", fmt: x => x.id ? `<span id="${x.usd ? "arqEspUsd" : "arqEsp"}" class="dim">oculto</span>` : grp(x.monto) }, { t: "Contado", r: true, cls: "mono", fmt: x => x.id ? `<span id="${x.id}">0</span>` : grp(x.monto) }],
          rows: [{ medio: "Efectivo en colones (con fondo, menos retiros)", monto: r.efectivo, id: "arqCont" }, { medio: "Dólares (US$)", monto: r.dolares, usd: true, id: "arqUsdC" }, { medio: "Vouchers de tarjeta", monto: tarj }, { medio: "SINPE y transferencias", monto: r.porMedio.filter(m => m.medio === "SINPE móvil" || m.medio === "Transferencia").reduce((s, m) => s + m.monto, 0) }]
        })
      })}
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:12px 14px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair)">
              <span class="b">Diferencia en efectivo</span><span class="num dim" id="arqDif" style="font-size:14px;font-weight:600">se muestra al terminar de contar</span></div>
            <button class="btn" id="arqVer">${icon("check")}Terminé de contar</button>
            <div class="field" style="margin:0"><label for="arqJus">Justificación (obligatoria si hay diferencia)</label><textarea id="arqJus" rows="2" placeholder="Por qué no cuadra"></textarea></div>
            <div class="field" style="margin:0"><label for="arqSig">¿Sigue otra persona en esta caja?</label>
              <select id="arqSig"><option value="">No, la caja queda cerrada</option>${hab.filter(h => h[0] !== t.cajero).map(h => `<option>${esc(h[0])}</option>`).join("")}</select></div>
            ${nota("Tarjeta, SINPE y transferencias se cuadran solos contra el banco. Lo que hay que contar es el efectivo; si otra persona sigue en la caja, recibe el mismo fondo y abre su propio turno.")}
          </div></div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="arqOk">${icon("check")}Cerrar el turno</button>`,
      after(el) {
        cerrar(el);
        let cont = 0, usd = 0, visto = false;
        const calc = () => {
          cont = $$("[data-den]", el).reduce((s, i) => s + (parseInt(i.value, 10) || 0) * +i.dataset.den, 0);
          usd = parseFloat(($("#arqUsd", el).value || "0").replace(/\s/g, "").replace(",", ".")) || 0;
          $("#arqCont", el).textContent = grp(cont);
          $("#arqUsdC", el).textContent = "US$ " + dec(usd, 2);
          if (!visto) return;
          const dif = cont - r.efectivo, difU = +(usd - r.dolares).toFixed(2), e = $("#arqDif", el);
          e.textContent = (dif < 0 ? "−₡" : "₡") + grp(dif) + (difU ? " · " + (difU < 0 ? "−" : "") + "US$ " + dec(Math.abs(difU), 2) : "");
          e.style.fontSize = "20px"; e.style.fontWeight = "700";
          e.style.color = dif === 0 && !difU ? "var(--ok)" : "var(--crit)";
        };
        $("#arqUsd", el).addEventListener("input", calc);
        $$("[data-den]", el).forEach(i => i.addEventListener("input", calc));
        calc();
        /* al terminar de contar, el conteo queda fijo y recién entonces se compara */
        $("#arqVer", el).addEventListener("click", () => {
          visto = true;
          $$("[data-den]", el).forEach(i => { i.readOnly = true; }); $("#arqUsd", el).readOnly = true;
          $("#arqEsp", el).textContent = grp(r.efectivo); $("#arqEsp", el).classList.remove("dim");
          $("#arqEspUsd", el).textContent = "US$ " + dec(r.dolares, 2); $("#arqEspUsd", el).classList.remove("dim");
          $("#arqVer", el).disabled = true;
          V.anotar("Contó el efectivo de la caja", cajaNom(t) + " · contado ₡" + cont, t.cajero, t.locId, "Baja");
          calc();
        });
        $("#arqOk", el).addEventListener("click", () => {
          if (!visto) { toast("Primero termine de contar", "El sistema compara contra lo esperado cuando el conteo está completo.", "in"); return; }
          const dif = Math.round(cont - r.efectivo), difU = +(usd - r.dolares).toFixed(2), jus = $("#arqJus", el).value.trim();
          if ((dif || difU) && !jus) { toast("Falta la justificación", "Hay una diferencia de " + c(dif) + (difU ? " y US$ " + dec(difU, 2) : "") + ": anote por qué antes de cerrar.", "cr"); $("#arqJus", el).focus(); return; }
          try { V.cerrar(t, cont, jus, undefined, usd); } catch (e) { return toast("No se cerró el turno", e.message, "cr"); }
          const sig = $("#arqSig", el).value;
          if (sig) V.abrir(t.locId, t.n, sig, t.fondo);
          closeSheet();
          const tol = w.AUTO ? w.AUTO.POLITICA.toleranciaCaja : 2000;
          const dest = dif < 0 && -dif > tol ? " Se cargó a " + t.cajero + " en cuentas por cobrar a colaboradores." : " Quedó asentada en «Diferencias de caja».";
          toast("Turno cerrado", (dif ? "Diferencia de " + c(dif) + " justificada." + dest + " " : "Cuadró exacto. ") + (sig ? sig + " abrió su turno en la misma caja." : "La caja quedó cerrada."), dif ? "wa" : "ok");
          if (despues) despues(); else A.refresh();
        });
      }
    });
  }
  function retiro(t) {
    const r = V.resumen(t);
    const hab = (V.HABILITADOS[t.locId] || []).filter(h => /Admin/.test(h[1]));
    openSheet({
      title: "Retiro de efectivo", sub: cajaNom(t) + " · hay " + c(r.efectivo) + " en efectivo",
      body: `<div class="field"><label for="retMonto">Monto</label><input id="retMonto" class="num" style="font-size:20px;text-align:right" value="${grp(Math.max(0, Math.floor((r.efectivo - V.PARAM.fondoCaja) / 50000) * 50000))}"></div>
        <div class="field"><label for="retMot">Motivo</label><select id="retMot"><option>Retiro a la bóveda</option><option>Depósito al banco</option><option>Pago a proveedor de contado</option><option>Cambio para otra caja</option></select></div>
        <div class="field"><label for="retRec">Recibe</label><select id="retRec">${(hab.length ? hab : [["Administrador", ""]]).map(h => `<option>${esc(h[0])}</option>`).join("")}</select></div>
        ${nota("El retiro baja el efectivo esperado de la caja y queda en la bitácora con quién lo recibió. Al cierre ya no aparece como faltante.", "shield")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="retOk">${icon("check")}Registrar retiro</button>`,
      after(el) {
        cerrar(el);
        $("#retOk", el).addEventListener("click", () => {
          const m = Math.round(numIn($("#retMonto", el).value));
          if (m <= 0 || m > r.efectivo) return toast("Monto no válido", "Tiene que ser mayor que cero y no pasar de lo que hay en la caja.", "cr");
          V.retirar(t, m, $("#retMot", el).value, $("#retRec", el).value);
          closeSheet(); toast("Retiro registrado", c(m) + " a " + $("#retRec", el).value + ".", "ok"); A.refresh();
        });
      }
    });
  }

  function miCaja(v) {
    const t = V.turnoDe(S.locId, S.term);
    const tm = V.TERMINALES.find(x => x.locId === S.locId && x.n === S.term);
    if (!t) {
      v.innerHTML = `<div class="wrap">${card({
        body: `${empty("cash", "La caja " + S.term + " está cerrada", "Para cobrar hay que abrirla con su fondo. Queda a su nombre hasta el cierre o el cambio de turno.")}
          <div style="display:flex;gap:10px;justify-content:center;align-items:flex-end;margin-top:6px">
            <div class="field" style="margin:0;width:180px"><label for="fondo">Fondo de apertura</label><input id="fondo" class="num" style="text-align:right" value="${grp(V.PARAM.fondoCaja)}"></div>
            <button class="btn pri" id="abrirCaja">${icon("check")}Abrir caja</button></div>`
      })}</div>`;
      return;
    }
    const r = V.resumen(t);
    const alto = r.efectivo > V.PARAM.topeEfectivo;
    const turnos = V.turnosDe(S.locId, S.term).filter(x => V.esHoy(x.abre) && x !== t);
    v.innerHTML = `<div class="wrap">
      ${alto ? `<div class="stepbar"><div class="sbt"><b>Hay ${c(r.efectivo)} en efectivo en esta caja</b><span>El tope es ${c(V.PARAM.topeEfectivo)}. Conviene hacer un retiro a la bóveda antes de seguir cobrando.</span></div><div class="sba"><button class="btn pri sm" id="retiroYa">${icon("cash")}Hacer el retiro</button></div></div>` : ""}
      ${card({
      body: `<div class="ficha" style="margin:-16px -17px">
          ${fichaCell("Cajero", esc(t.cajero))}${fichaCell("Abrió", hora(t.abre) + `<span class="sub ui">${esc(tm ? "consecutivo " + tm.cons : "")}</span>`)}
          ${fichaCell("Ventas del turno", c(r.ventas) + `<span class="sub ui">${r.n} documentos</span>`)}
          ${fichaCell("Efectivo en caja", c(r.efectivo) + `<span class="sub ui">fondo ${c(t.fondo)} · retiros ${c(r.retiros)}</span>`, alto ? "var(--warn)" : "")}</div>`
    })}
      <div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);align-items:start">
        ${card({
      title: "Lo que entró por medio de pago", hint: "el comprobante lleva el código de cada medio",
      body: table({
        cols: [
          { t: "Medio", fmt: x => `${esc(x.medio)}${V.EFECTIVO[x.medio] ? ' <span class="dim" style="font-size:11.5px">· queda en la caja</span>' : ""}` },
          { t: "Documentos", r: true, cls: "mono", fmt: x => (x.n ? grp(x.n) : '<span class="dim">0</span>') },
          { t: "Monto", r: true, cls: "mono", fmt: x => (x.monto ? `<b>${grp(x.monto)}</b>` : '<span class="dim">—</span>') }
        ], rows: r.porMedio,
        foot: [{ v: "Total del turno" }, { v: grp(r.n), r: true, cls: "mono" }, { v: grp(r.ventas), r: true, cls: "mono" }]
      })
    })}
        <div style="display:flex;flex-direction:column;gap:14px">
          ${card({
      title: "Retiros de efectivo", hint: t.retiros.length ? t.retiros.length + " en el turno" : "",
      actions: `<button class="btn sm" id="retiroBtn">${icon("plus")}Retiro</button>`,
      body: t.retiros.length ? t.retiros.map(x => hl(hora(x.hora), c(x.monto) + " · " + x.motivo + " · recibió " + x.recibe)).join("") : `<div class="mut" style="font-size:13px">Sin retiros en este turno.</div>`
    })}
          ${r.devol ? card({ title: "Devoluciones en efectivo", body: hl(grp(r.devol), "salieron de esta caja por notas de crédito") }) : ""}
          ${turnos.length ? card({ title: "Turnos anteriores hoy en esta caja", body: turnos.map(x => hl(hora(x.abre) + "–" + (x.cierre ? hora(x.cierre.hora) : ""), x.cajero + (x.cierre ? " · diferencia " + c(x.cierre.diferencia) + (x.cierre.justificacion ? " · " + x.cierre.justificacion : "") : ""))).join("") }) : ""}
        </div>
      </div></div>`;
  }
  function miCajaWire(v) {
    const t = V.turnoDe(S.locId, S.term);
    const ab = $("#abrirCaja", v);
    if (ab) ab.addEventListener("click", () => { const f = Math.round(numIn($("#fondo", v).value)); V.abrir(S.locId, S.term, S.vendedor, f); toast("Caja abierta", "Caja " + S.term + " con fondo de " + c(f) + ".", "ok"); A.refresh(); });
    ["#retiroBtn", "#retiroYa"].forEach(s => { const b = $(s, v); if (b && t) b.addEventListener("click", () => retiro(t)); });
    const ar = $("#btnArqueo"); if (ar && t) ar.addEventListener("click", () => arqueo(t));
  }

  function cajasLocal(v) {
    const tms = V.TERMINALES.filter(x => x.locId === S.locId);
    const filas = tms.map(tm => { const t = V.turnoDe(tm.locId, tm.n); return { tm, t, r: t ? V.resumen(t) : null }; });
    const cierres = V.CIERRES.filter(x => x.locId === S.locId).slice(0, 8);
    v.innerHTML = `<div class="wrap">
      ${card({
      title: "Cajas de " + locNom(S.locId), hint: "clic en una caja para retirar o cerrar",
      body: table({
        onRow: true,
        cols: [
          { t: "Caja", fmt: x => `<b>Caja ${x.tm.n}</b><span class="sub ui">${esc(x.tm.cons)}</span>` },
          { t: "Cajero", fmt: x => (x.t ? esc(x.t.cajero) : '<span class="dim">—</span>') },
          { t: "Abrió", cls: "mono", fmt: x => (x.t ? (V.esHoy(x.t.abre) ? hora(x.t.abre) : fh(x.t.abre)) : "—") },
          { t: "Ventas del turno", r: true, cls: "mono", fmt: x => (x.r ? grp(x.r.ventas) : "—") },
          { t: "Efectivo en caja", r: true, cls: "mono", fmt: x => (x.r ? `<b style="color:${x.r.efectivo > V.PARAM.topeEfectivo ? "var(--warn)" : "var(--ink)"}">${grp(x.r.efectivo)}</b>` : "—") },
          { t: "Estado", fmt: x => (!x.t ? tag("Cerrada", "mu") : !V.esHoy(x.t.abre) ? tag("Abierta desde ayer", "cr", "alert") : x.r.efectivo > V.PARAM.topeEfectivo ? tag("Retiro sugerido", "wa", "cash") : tag("Abierta", "ok", "check")) }
        ], rows: filas, rowCls: x => (x.t && !V.esHoy(x.t.abre) ? "cr" : "")
      })
    })}
      ${card({
      title: "Cierres recientes", hint: "toda diferencia lleva su explicación",
      body: table({
        cols: [
          { t: "Fecha", cls: "mono", fmt: x => fh(x.fecha) },
          { t: "Caja", fmt: x => "Caja " + x.n },
          { t: "Cajero", fmt: x => esc(x.cajero) },
          { t: "Vendido", r: true, cls: "mono", fmt: x => grp(x.ventas) },
          { t: "Diferencia", r: true, cls: "mono", fmt: x => (x.diferencia ? `<b style="color:var(--crit)">${x.diferencia < 0 ? "−" : ""}${grp(x.diferencia)}</b>` : '<span style="color:var(--ok)">0</span>') },
          { t: "Justificación", fmt: (x, i) => (x.diferencia && !x.justificacion ? `<button class="btn sm" data-jus="${i}">${icon("alert")}Justificar</button>` : `<span class="mut" style="font-size:12.5px">${esc(x.justificacion || "—")}</span>`) }
        ], rows: cierres
      })
    })}</div>`;
    v._filas = filas; v._cierres = cierres;
  }
  function cajasLocalWire(v) {
    const p = $("#tp-caja", v) || v;
    $$("tr.clickable", p).forEach(tr => tr.addEventListener("click", () => {
      const x = p._filas ? p._filas[+tr.dataset.i] : null;
      if (!x) return;
      if (!x.t) return toast("La caja " + x.tm.n + " está cerrada", "Se abre desde Mi caja en esa terminal.", "in");
      openSheet({
        title: cajaNom(x.t), sub: x.t.cajero + " · " + c(x.r.efectivo) + " en efectivo",
        body: nota("El administrador puede retirar efectivo o hacer el arqueo y cerrar el turno de otra persona, por ejemplo si quedó abierta desde ayer. Todo queda a nombre de quien lo hace."),
        footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn" id="cxRet">${icon("cash")}Retiro</button><button class="btn pri" id="cxCer">${icon("check")}Arqueo y cierre</button>`,
        after(el) { cerrar(el); $("#cxRet", el).addEventListener("click", () => retiro(x.t)); $("#cxCer", el).addEventListener("click", () => arqueo(x.t)); }
      });
    }));
    $$("[data-jus]", p).forEach(b => b.addEventListener("click", () => {
      const x = p._cierres[+b.dataset.jus];
      openSheet({
        title: "Justificar diferencia", sub: "Caja " + x.n + " · " + x.cajero + " · " + c(x.diferencia),
        body: `<div class="field"><label for="jusT">Qué pasó</label><textarea id="jusT" rows="3" placeholder="Por ejemplo: vuelto mal dado, billete falso, error de digitación"></textarea></div>`,
        footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="jusOk">Guardar</button>`,
        after(el) {
          cerrar(el);
          $("#jusOk", el).addEventListener("click", () => {
            const j = $("#jusT", el).value.trim(); if (!j) return toast("Escriba la justificación", "", "cr");
            x.justificacion = j; V.anotar("Justificó diferencia de caja", "Caja " + x.n + " · " + c(x.diferencia) + " · " + j, "Marta Rojas", x.locId);
            closeSheet(); toast("Diferencia justificada", "Quedó en la bitácora.", "ok"); A.refresh();
          });
        }
      });
    }));
  }

  let tmAmbito = "local";
  function terminales(v) {
    const locs = tmAmbito === "local" ? D.tiendas.filter(l => l.id === S.locId) : D.tiendas;
    v.innerHTML = `<div class="wrap">
      ${nota("Cada caja es una terminal con su propia numeración ante Hacienda: <b>sucursal + terminal</b> (por ejemplo 002-00001). Varias personas pueden usar la misma caja por turnos; cada factura queda a nombre de quien la cobró.")}
      <div style="display:flex;justify-content:flex-end">${seg("tma", [{ v: "local", t: locNom(S.locId) }, { v: "todos", t: "Los siete locales" }], tmAmbito)}</div>
      ${locs.map(l => card({
      title: l.nom, hint: l.terminales + (l.terminales === 1 ? " caja" : " cajas") + " · sucursal " + l.cod,
      actions: `<button class="btn sm" data-hab="${l.id}">${icon("plus")}Habilitar persona</button>`,
      body: `<div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px;align-items:start">
          ${table({
        cols: [
          { t: "Caja", fmt: x => `<b>Caja ${x.n}</b><span class="sub ui">${esc(x.equipo)}</span>` },
          { t: "Consecutivo", cls: "mono", fmt: x => esc(x.cons) },
          { t: "Ahora", fmt: x => { const t = V.turnoDe(x.locId, x.n); return t ? tag(t.cajero, "ok", "users") : tag("Cerrada", "mu"); } }
        ], rows: V.TERMINALES.filter(x => x.locId === l.id)
      })}
          <div><div style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-4);margin-bottom:8px">Habilitados para cobrar</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">${(V.HABILITADOS[l.id] || []).map(h => tag(h[0] + " · " + h[1], /Admin/.test(h[1]) ? "acc" : "mu")).join("")}</div></div></div>`
    })).join("")}</div>`;
  }
  function terminalesWire(v) {
    onSeg(document, "tma", x => { tmAmbito = x; A.refresh(); });
    $$("[data-hab]", v).forEach(b => b.addEventListener("click", () => {
      const lid = b.dataset.hab, ya = (V.HABILITADOS[lid] || []).map(h => h[0]);
      const cand = D.colaboradores.map(x => x.nom.split(" ").slice(0, 2).join(" ")).filter(n => !ya.includes(n));
      openSheet({
        title: "Habilitar persona en " + locNom(lid), sub: "Podrá abrir cualquier caja del local con su usuario",
        body: `<div class="field"><label for="habN">Colaborador</label><select id="habN">${cand.map(n => `<option>${esc(n)}</option>`).join("")}</select></div>
          <div class="field"><label for="habR">Papel</label><select id="habR"><option>Cajero</option><option>Administrador</option><option>Vendedor y cajero</option></select></div>`,
        footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="habOk">Habilitar</button>`,
        after(el) {
          cerrar(el);
          $("#habOk", el).addEventListener("click", () => {
            const n = $("#habN", el).value, r = $("#habR", el).value;
            (V.HABILITADOS[lid] = V.HABILITADOS[lid] || []).push([n, r]);
            V.anotar("Habilitó persona en caja", n + " · " + r + " · " + locNom(lid), "Andrey Ramírez", lid);
            closeSheet(); toast(n + " quedó habilitado", "Puede abrir cualquier caja de " + locNom(lid) + ".", "ok"); A.refresh();
          });
        }
      });
    }));
  }

  A.workspace("caja", {
    title: "Caja y turnos",
    tabs: [
      {
        id: "mia", t: "Mi caja", sub: () => "Caja " + S.term + " de " + locNom(S.locId) + " · apertura, retiros, arqueo y cierre",
        actions: () => V.turnoDe(S.locId, S.term) ? `<button class="btn pri" id="btnArqueo">${icon("check")}Arqueo y cierre</button>` : "",
        render: miCaja, wire: miCajaWire
      },
      {
        id: "local", t: "Cajas del local", sub: () => "Lo que el administrador vigila en " + locNom(S.locId),
        badge: () => { const n = V.pendientes(S.locId).filter(p => p.grupo === "Caja").length; return { n, k: "wa", l: n + " por atender" }; },
        render: v => { cajasLocal(v); }, wire: cajasLocalWire
      },
      { id: "terminales", t: "Terminales y cajeros", sub: "Cada caja con su consecutivo y quién puede usarla", render: terminales, wire: terminalesWire }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     3 · COTIZACIONES Y PEDIDOS — Proformas · Pedidos · Ventas perdidas
     ═════════════════════════════════════════════════════════════ */
  const venceEn = p => V.diasEntre(D.HOY, p.vence);
  const estadoProf = p => p.enCaja ? tag("En la caja", "ac", "cart") : p.estado === "Vencida" ? tag("Vencida", "cr", "alert")
    : venceEn(p) <= 3 ? tag("Vence " + (venceEn(p) <= 0 ? "hoy" : "en " + dias(venceEn(p))), "wa", "clock") : tag("Vigente", "ok", "check");
  const origenTag = o => o === "Tienda virtual" ? tag("Tienda virtual", "ac", "link") : o === "WhatsApp" ? tag("WhatsApp", "ok", "chat") : tag("Mostrador", "mu");
  function detalleProf(p) {
    const cli = D.cliById[p.clienteId];
    openSheet({
      wide: true, title: p.tipo + " " + p.cons, sub: (cli ? cli.nom : "Consumidor final") + " · " + locNom(p.locId) + " · " + p.vendedor,
      body: `<div class="card" style="margin-bottom:14px"><div class="card-b flush"><div class="ficha">
          ${fichaCell("Emitida", fecha(p.fecha))}${fichaCell("Vence", fecha(p.vence), p.estado === "Vencida" ? "var(--crit)" : "")}
          ${fichaCell("Peso total", kg(p.peso))}${fichaCell("Flete a " + esc(p.flete.zona), p.flete.monto ? c(p.flete.monto) : "Se cotiza")}${fichaCell("Total", c(p.total))}</div></div></div>
        ${table({
        cols: [
          { t: "Código", cls: "mono", fmt: l => esc(artOf(l.artId).cod) },
          { t: "Descripción", fmt: l => esc(artOf(l.artId).desc) },
          { t: "Cant.", r: true, cls: "mono", fmt: l => grp(l.cant) },
          { t: "Precio", r: true, cls: "mono", fmt: l => grp(l.precio) },
          { t: "Peso", r: true, cls: "mono", fmt: l => kg((artOf(l.artId).peso || 0) * l.cant) },
          { t: "Disponible hoy", r: true, cls: "mono", fmt: l => { const d = D.disp(l.artId, p.locId); return `<span style="color:${d >= l.cant ? "var(--ok)" : "var(--crit)"}">${grp(d)}</span>`; } }
        ], rows: p.lineas
      })}
        <div style="margin-top:14px">${nota("La proforma sale en PDF sin ningún enlace que abra el sistema. El link de pago lleva solo un código de cobro: quien lo recibe puede pagar, no entrar.", "shield")}</div>
        ${p.link ? `<div style="margin-top:10px">${nota("Link de pago " + esc(p.link.codigo) + " enviado por " + esc(p.link.medio) + " " + hace(p.link.enviado) + ".", "link")}</div>` : ""}`,
      footer: `<button class="btn" data-cerrar>Cerrar</button><div class="gap"></div>
        ${p.estado !== "Vencida" ? `<button class="btn" id="pfPerd">Marcar como perdida</button>` : ""}
        <button class="btn" id="pfEnv">${icon("chat")}Enviar al cliente</button>
        <button class="btn" id="pfLink">${icon("link")}Link de pago</button>
        <button class="btn pri" id="pfConv">${icon("cart")}Convertir en factura</button>`,
      after(el) {
        cerrar(el);
        $("#pfConv", el).addEventListener("click", () => { closeSheet(); aCaja(p); });
        $("#pfEnv", el).addEventListener("click", () => toast("Enviada por WhatsApp", "El PDF de " + p.cons + " salió al " + (cli ? cli.tel : "cliente") + ".", "ok"));
        $("#pfLink", el).addEventListener("click", () => { V.enviarLink(p, "WhatsApp"); closeSheet(); toast("Link de pago enviado", "Cuando el cliente pague, el pedido pasa solo a «Pagado · por facturar».", "ok"); A.refresh(); });
        const pp = $("#pfPerd", el); if (pp) pp.addEventListener("click", () => { closeSheet(); perdida(p); });
      }
    });
  }
  function perdida(p) {
    openSheet({
      title: "¿Por qué no se compró?", sub: p.cons + " · " + cliNom(p.clienteId) + " · " + c(p.total),
      body: `<div style="display:flex;flex-direction:column;gap:8px">${V.MOTIVOS.map((m, i) => `<label class="rec" style="border:1px solid var(--hair);border-radius:10px;cursor:pointer"><input type="radio" name="mot" value="${esc(m)}" ${i === 0 ? "checked" : ""}> ${esc(m)}</label>`).join("")}</div>
        <div style="margin-top:12px">${nota("El motivo alimenta el informe de ventas perdidas: si el problema es el precio o la existencia, compras y gerencia lo ven.")}</div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="motOk">Guardar</button>`,
      after(el) { cerrar(el); $("#motOk", el).addEventListener("click", () => { V.marcarPerdida(p, $("input[name=mot]:checked", el).value); closeSheet(); toast("Anotada como venta perdida", "", "ok"); A.refresh(); }); }
    });
  }

  let pfAmbito = "todos";   /* el área de proformas atiende a todos los locales */
  const deLoc = (x, amb) => amb !== "local" || x === S.locId;
  function proformas(v) {
    D.proformas.forEach(V.prep);
    const lista = D.proformas.filter(p => p.tipo === "Proforma" && deLoc(p.locId, pfAmbito))
      .sort((a, b) => (a.estado === "Vencida") - (b.estado === "Vencida") || a.vence - b.vence);
    const vig = lista.filter(p => p.estado === "Vigente");
    const porVencer = vig.filter(p => venceEn(p) <= 3);
    v.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Vigentes", grp(vig.length), { txt: c(vig.reduce((s, p) => s + p.total, 0)) + " cotizados" })}
        ${stat("Vencen en 3 días o menos", grp(porVencer.length), { txt: "llamar antes de que se pierdan" }, "var(--warn)")}
        ${stat("Tasa de conversión", "63,4 %", { txt: "proformas que terminan en factura", dir: "up" }, "var(--ok)")}
        ${stat("Peso cotizado", kg(vig.reduce((s, p) => s + p.peso, 0)), { txt: "con el flete de cada zona ya calculado" })}
      </div>
      ${card({
      title: "Proformas", hint: "clic para ver, enviar o convertir en factura",
      actions: seg("pfa", [{ v: "local", t: locNom(S.locId) }, { v: "todos", t: "Todos" }], pfAmbito),
      body: table({
        onRow: true,
        cols: [
          { t: "Proforma", cls: "mono", fmt: p => esc(p.cons) },
          { t: "Cliente", fmt: p => `${esc(cliNom(p.clienteId))}<span class="sub ui">${esc(p.vendedor)}</span>` },
          { t: "Emitida", cls: "mono", fmt: p => fecha(p.fecha) },
          { t: "Peso", r: true, cls: "mono", fmt: p => kg(p.peso) },
          { t: "Flete", r: true, cls: "mono", fmt: p => (p.flete.monto ? grp(p.flete.monto) : '<span class="dim">cotiza</span>') },
          { t: "Total", r: true, cls: "mono", fmt: p => `<b>${grp(p.total)}</b>` },
          { t: "Estado", fmt: estadoProf },
          { t: "", r: true, fmt: (p, i) => (p.estado === "Vigente" ? `<button class="btn sm pri" data-conv="${i}">Convertir</button>` : "") }
        ], rows: lista, rowCls: p => (p.estado === "Vencida" ? "wa" : "")
      })
    })}</div>`;
    v._lista = lista;
  }
  function proformasWire(v) {
    const p = $("#tp-cotizaciones", v);
    onSeg(document, "pfa", x => { pfAmbito = x; A.refresh(); });
    $$("[data-conv]", p).forEach(b => b.addEventListener("click", e => { e.stopPropagation(); aCaja(p._lista[+b.dataset.conv]); }));
    $$("tr.clickable", p).forEach(tr => tr.addEventListener("click", () => detalleProf(p._lista[+tr.dataset.i])));
  }

  const PASOS = ["Por confirmar existencia", "Listo para facturar", "Esperando pago", "Pagado · por facturar"];
  function pedidos(v) {
    D.proformas.forEach(V.prep);
    const lista = D.proformas.filter(p => p.tipo === "Pedido" && p.estado !== "Vencida" && deLoc(p.locId, pfAmbito));
    v.innerHTML = `<div class="wrap">
      ${nota("El pedido es el documento previo que entra por WhatsApp, por la página web o se toma en mostrador. Se confirma la existencia, se cobra con link de pago si el cliente no está en la tienda y se convierte en factura sin volver a digitar.", "chat")}
      <div style="display:flex;justify-content:flex-end">${seg("pfa", [{ v: "local", t: locNom(S.locId) }, { v: "todos", t: "Todos" }], pfAmbito)}</div>
      <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));align-items:start">
        ${PASOS.map(paso => {
      const its = lista.filter(p => p.estadoPed === paso);
      return card({
        title: paso, hint: String(its.length), flush: true,
        body: its.length ? `<div class="alerts">${its.map(p => `<div class="alert ${paso === "Pagado · por facturar" ? "wa" : ""}" style="cursor:default">
            <span style="flex:1;min-width:0"><span class="at" style="display:block">${esc(cliNom(p.clienteId))}</span>
            <span class="as">${esc(p.cons)} · ${p.lineas.length} líneas · <b class="num">${c(p.total)}</b></span>
            <span style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">${origenTag(p.origen)}${p.link ? tag(p.link.codigo, "mu", "link") : ""}</span>
            <span style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">${accionPed(p)}<button class="btn sm" data-verp="${p.id}">Ver</button></span></span></div>`).join("")}</div>`
          : `<div class="mut" style="padding:14px 16px;font-size:12.5px">Nada en este paso.</div>`
      });
    }).join("")}
      </div></div>`;
  }
  const accionPed = p => p.estadoPed === "Por confirmar existencia" ? `<button class="btn sm pri" data-ped="conf:${p.id}">Confirmar existencia</button>`
    : p.estadoPed === "Listo para facturar" ? `<button class="btn sm pri" data-ped="fact:${p.id}">Facturar</button><button class="btn sm" data-ped="link:${p.id}">Link de pago</button>`
      : p.estadoPed === "Esperando pago" ? `<button class="btn sm" data-ped="pago:${p.id}">Simular pago recibido</button>`
        : `<button class="btn sm pri" data-ped="fact:${p.id}">Facturar</button>`;
  function pedidosWire(v) {
    onSeg(document, "pfa", x => { pfAmbito = x; A.refresh(); });
    $$("[data-verp]", v).forEach(b => b.addEventListener("click", () => detalleProf(D.proformas.find(p => p.id === b.dataset.verp))));
    $$("[data-ped]", v).forEach(b => b.addEventListener("click", () => {
      const [acc, id] = b.dataset.ped.split(":"), p = D.proformas.find(x => x.id === id);
      if (acc === "fact") return aCaja(p);
      if (acc === "link") { V.enviarLink(p, "WhatsApp"); toast("Link de pago enviado", "Por WhatsApp al " + ((D.cliById[p.clienteId] || {}).tel || "cliente") + ".", "ok"); }
      if (acc === "pago") { try { V.confirmarPago(p); } catch (e) { return toast("No se registró el pago", e.message, "cr"); } toast("Pago recibido", p.cons + " quedó pagado; falta facturarlo.", "ok"); }
      if (acc === "conf") {
        const falta = p.lineas.filter(l => D.disp(l.artId, p.locId) < l.cant);
        p.estadoPed = "Listo para facturar";
        toast(falta.length ? "Hay " + falta.length + " líneas sin existencia suficiente" : "Todo está en existencia",
          falta.length ? "Se pueden facturar contra pedido o traer del CEDI." : p.cons + " está listo para facturar.", falta.length ? "wa" : "ok");
      }
      A.refresh();
    }));
  }

  function perdidas(v) {
    D.proformas.forEach(V.prep);
    const L = V.perdidas();
    const tot = L.reduce((s, x) => s + x.total, 0);
    const porMot = V.MOTIVOS.map(m => ({ n: m, v: L.filter(x => x.motivo === m).reduce((s, x) => s + x.total, 0) })).filter(x => x.v).sort((a, b) => b.v - a.v);
    const sin = L.filter(x => !x.motivo);
    v.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Venta perdida del mes", c(tot), { txt: L.length + " proformas y pedidos que no se compraron", dir: "down" }, "var(--crit)")}
        ${stat("Por precio", c((porMot.find(x => x.n === "Precio") || { v: 0 }).v), { txt: "revisar la categoría del cliente o el margen" })}
        ${stat("Por existencia", c((porMot.find(x => x.n === "Sin existencia al momento") || { v: 0 }).v), { txt: "lo ve compras en el sugerido" }, "var(--warn)")}
        ${stat("Sin motivo", grp(sin.length), { txt: "anotar el motivo completa el informe" })}
      </div>
      <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.5fr);align-items:start">
        ${card({ title: "Por qué se pierden", hint: "monto del mes", body: bars(porMot.map(x => ({ n: x.n, v: x.v, lab: c(x.v) }))) })}
        ${card({
      title: "Proformas y pedidos perdidos",
      body: table({
        h: "calc(100dvh - 440px)",
        cols: [
          { t: "Documento", cls: "mono", fmt: x => esc(x.cons) },
          { t: "Cliente", fmt: x => esc(x.cliente) },
          { t: "Venció", cls: "mono", fmt: x => fecha(x.fecha) },
          { t: "Total", r: true, cls: "mono", fmt: x => grp(x.total) },
          { t: "Motivo", fmt: x => (x.motivo ? esc(x.motivo) : x.viva ? `<button class="btn sm" data-mot="${x.id}">Anotar motivo</button>` : '<span class="dim">—</span>') }
        ], rows: L
      })
    })}
      </div></div>`;
  }
  function perdidasWire(v) {
    $$("[data-mot]", v).forEach(b => b.addEventListener("click", () => perdida(D.proformas.find(p => p.id === b.dataset.mot))));
  }

  A.workspace("cotizaciones", {
    title: "Cotizaciones y pedidos",
    tabs: [
      { id: "proformas", t: "Proformas", sub: "La proforma antecede a la factura: con peso, flete y conversión sin redigitar", render: proformas, wire: proformasWire },
      {
        id: "pedidos", t: "Pedidos", sub: "Mostrador, WhatsApp y página web, del pedido a la factura",
        badge: () => { const n = D.proformas.filter(p => p.tipo === "Pedido" && p.estadoPed === "Pagado · por facturar").length; return { n, k: "wa", l: n + " pagados por facturar" }; },
        render: pedidos, wire: pedidosWire
      },
      {
        id: "perdidas", t: "Ventas perdidas", sub: "Lo que se cotizó y no se compró, y por qué",
        badge: () => { const n = D.proformas.filter(p => p.estado === "Vencida" && !p.motivo).length; return { n, k: "", l: n + " sin motivo" }; },
        render: perdidas, wire: perdidasWire
      }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     4 · ENTREGAS Y RETIROS — Por despachar · Retiros en otro local ·
         En ruta y entregados
     ═════════════════════════════════════════════════════════════ */
  const estDesp = x => tag(x.estado, x.estado === "Entregado" ? "ok" : x.estado === "Pendiente de alistar" ? "wa" : "ac");
  const modTag = x => x.modalidad === "Retiro en otro local" ? tag("Retira en " + locNom(x.retiroEn), "ac", "pin") : x.modalidad === "Retira después" ? tag("Retira después aquí", "mu", "box") : tag("Entrega · " + x.ruta, "mu", "truck");
  function detalleDesp(x) {
    const cli = D.cliById[x.clienteId];
    openSheet({
      wide: true, title: "Despacho " + x.id, sub: (cli ? cli.nom : "Cliente de contado") + " · factura " + x.doc,
      body: `<div class="card" style="margin-bottom:14px"><div class="card-b flush"><div class="ficha">
          ${fichaCell("Facturado en", esc(locNom(x.locId)))}${fichaCell("Se entrega", x.modalidad === "Entrega a domicilio" ? esc(x.ruta) : "en " + esc(locNom(x.retiroEn)))}
          ${fichaCell("Peso", kg(x.peso))}${fichaCell("Estado", estDesp(x))}</div></div></div>
        ${table({
        cols: [
          { t: "Código", cls: "mono", fmt: l => esc(artOf(l.artId).cod) },
          { t: "Descripción", fmt: l => esc(artOf(l.artId).desc) + (l.nota ? `<span class="sub ui">${esc(l.nota)}</span>` : "") },
          { t: "Cant.", r: true, cls: "mono", fmt: l => grp(l.cant) },
          { t: "Peso", r: true, cls: "mono", fmt: l => kg((artOf(l.artId).peso || 0) * l.cant) },
          { t: "Reserva", fmt: (l, i) => (x.reserva ? (x.reserva[i].ok ? tag("Reservado en " + locNom(x.retiroEn), "ok", "check") : tag("Traer del CEDI", "wa", "truck")) : '<span class="dim">—</span>') }
        ], rows: x.lineas
      })}
        <div style="margin-top:14px">${nota(x.auto ? "Quedó <b>por despachar</b> solo: pesa " + kg(x.peso) + ", más de lo que el cliente se lleva en la mano. La factura es la venta; este despacho es la entrega, y tiene su propio estado." : "La factura es la venta; este despacho es la entrega, y tiene su propio estado hasta que alguien la recibe y firma.", "box")}</div>
        ${x.recibio ? `<div style="margin-top:10px">${nota("Recibió <b>" + esc(x.recibio.nom) + "</b> (" + esc(x.recibio.ced || "sin cédula") + ") " + (x.recibio.hora ? fh(x.recibio.hora) : "") + (x.recibio.autorizado ? " · autorizado por el cliente" : " · <b>no estaba en la lista de autorizados</b>") + " · firmó en la tableta.", "check")}</div>` : ""}`,
      footer: `<button class="btn" data-cerrar>Cerrar</button><div class="gap"></div>${accionDesp(x, true)}`,
      after(el) { cerrar(el); wireDesp(el); }
    });
  }
  const accionDesp = (x, grande) => {
    const b = grande ? "btn pri" : "btn sm pri";
    if (x.estado === "Pendiente de alistar") return `<button class="${b}" data-desp="alistar:${x.id}">${icon("check")}Alistar</button>`;
    if (x.estado === "Alistado" && x.modalidad === "Entrega a domicilio") return `<button class="${b}" data-desp="ruta:${x.id}">${icon("truck")}Asignar a ruta</button>`;
    if (x.estado === "Alistado" && (x.modalidad !== "Retiro en otro local" || x.retiroEn === S.locId)) return `<button class="${b}" data-desp="entregar:${x.id}">${icon("users")}Entregar</button>`;
    return "";
  };
  function wireDesp(root) {
    $$("[data-desp]", root).forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const [acc, id] = b.dataset.desp.split(":"), x = D.despachos.find(y => y.id === id);
      if (acc === "alistar") { V.alistar(x, S.vendedor); closeSheet(); toast(x.id + " alistado", x.modalidad === "Entrega a domicilio" ? "Falta asignarlo a una ruta." : "Listo para que el cliente lo retire.", "ok"); A.refresh(); }
      if (acc === "ruta") asignarRuta(x);
      if (acc === "entregar") entregar(x);
    }));
  }
  function asignarRuta(x) {
    const rutas = D.rutas.filter(r => r.estado !== "Completada");
    const carga = r => D.despachos.filter(y => y.vehiculo === r.vehiculo && y.estado === "En ruta").reduce((s, y) => s + y.peso, 0);
    openSheet({
      title: "Asignar a ruta", sub: x.id + " · " + kg(x.peso) + " · " + cliNom(x.clienteId),
      body: `<div style="display:flex;flex-direction:column;gap:8px">${rutas.map((r, i) => {
        const cap = V.CAP[r.vehiculo] || 5000, tras = carga(r) + x.peso, sobre = tras > cap;
        return `<label class="rec" style="border:1px solid ${sobre ? "var(--crit-line)" : "var(--hair)"};border-radius:10px;cursor:pointer;align-items:center">
          <input type="radio" name="ruta" value="${r.id}" ${i === 0 && !sobre ? "checked" : ""}>
          <div style="flex:1;min-width:0"><b>${esc(r.nom)}</b><div class="mut" style="font-size:12px">${esc(r.vehiculo)} · ${esc(r.chofer)} · ${esc(r.estado.toLowerCase())}</div></div>
          <div style="width:130px">${prog([{ w: Math.min(100, (tras / cap) * 100), col: sobre ? "var(--crit)" : "var(--accent)" }])}<div class="num" style="font-size:11.5px;text-align:right;color:${sobre ? "var(--crit)" : "var(--ink-3)"}">${kg(tras)} de ${kg(cap)}</div></div></label>`;
      }).join("")}</div>
        <div style="margin-top:12px">${nota("La barra suma lo que ya lleva el vehículo más este despacho. Si pasa la capacidad, el sistema avisa antes de cargar.", "truck")}</div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="rtOk">${icon("truck")}Asignar</button>`,
      after(el) {
        cerrar(el);
        $("#rtOk", el).addEventListener("click", () => {
          const s = $("input[name=ruta]:checked", el); if (!s) return toast("Elija una ruta", "", "cr");
          const r = V.asignar(x, s.value);
          closeSheet();
          toast(x.id + " va en " + x.ruta, r.carga > r.cap ? "Atención: el vehículo va con sobrepeso (" + kg(r.carga) + " de " + kg(r.cap) + ")." : "Carga del vehículo: " + kg(r.carga) + " de " + kg(r.cap) + ".", r.carga > r.cap ? "cr" : "ok");
          A.refresh();
        });
      }
    });
  }
  function entregar(x) {
    const au = V.AUTORIZADOS[x.clienteId] || [];
    const cli = D.cliById[x.clienteId];
    const vig = a => a.vence >= D.HOY;
    openSheet({
      title: "Entregar " + x.id, sub: (cli ? cli.nom : "Cliente de contado") + " · " + x.lineas.length + " líneas · " + kg(x.peso),
      body: `<div style="font-size:12px;font-weight:700;color:var(--ink-4);margin-bottom:8px">¿Quién retira?</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${cli && cli.tipoCed === "Física" ? `<label class="rec" style="border:1px solid var(--hair);border-radius:10px;cursor:pointer"><input type="radio" name="quien" value="tit" checked><div style="flex:1"><b>${esc(cli.nom)}</b><div class="mut" style="font-size:12px">Titular · ${esc(cli.ced)}</div></div>${tag("Titular", "ok", "check")}</label>` : ""}
          ${au.map((a, i) => `<label class="rec" style="border:1px solid var(--hair);border-radius:10px;cursor:pointer"><input type="radio" name="quien" value="${i}" ${!(cli && cli.tipoCed === "Física") && i === 0 && vig(a) ? "checked" : ""} ${vig(a) ? "" : "disabled"}>
            <div style="flex:1"><b>${esc(a.nom)}</b><div class="mut" style="font-size:12px">${esc(a.rol)} · ${esc(a.ced)}</div></div>${vig(a) ? tag("Autorizado", "ok", "check") : tag("Autorización vencida", "cr", "alert")}</label>`).join("")}
          <label class="rec" style="border:1px solid var(--hair);border-radius:10px;cursor:pointer"><input type="radio" name="quien" value="otro" ${!au.length && !(cli && cli.tipoCed === "Física") ? "checked" : ""}><div style="flex:1"><b>Otra persona</b><div class="mut" style="font-size:12px">No está en la lista: queda como excepción en la bitácora</div></div></label>
        </div>
        <div class="field" id="otroBox" style="margin-top:10px;display:none"><label for="otroNom">Nombre y cédula</label><input id="otroNom" placeholder="Nombre completo · cédula"></div>
        <div style="margin-top:14px;padding:14px;border:1px dashed var(--hair);border-radius:11px;text-align:center" id="firmaBox">
          <div class="mut" style="font-size:12.5px;margin-bottom:8px">Firma de quien recibe, en la tableta</div>
          <button class="btn sm" id="firmar">${icon("check")}Firmar</button></div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="entOk" disabled>${icon("check")}Registrar entrega</button>`,
      after(el) {
        cerrar(el);
        const upd = () => { $("#otroBox", el).style.display = ($("input[name=quien]:checked", el) || {}).value === "otro" ? "block" : "none"; };
        $$("input[name=quien]", el).forEach(r => r.addEventListener("change", upd)); upd();
        $("#firmar", el).addEventListener("click", () => {
          $("#firmaBox", el).innerHTML = `<svg viewBox="0 0 220 60" style="width:220px;height:60px"><path d="M10 42 C 30 10, 45 55, 62 30 S 95 12, 110 38 S 150 50, 162 22 S 200 30, 210 34" fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round"/></svg><div class="mut" style="font-size:11.5px">Firmado ${hora(V.ahora())}</div>`;
          $("#entOk", el).disabled = false;
        });
        $("#entOk", el).addEventListener("click", () => {
          const q = ($("input[name=quien]:checked", el) || {}).value;
          if (q == null) return toast("Elija quién retira", "", "cr");
          let p;
          if (q === "tit") p = { nom: cli.nom, ced: cli.ced, autorizado: true };
          else if (q === "otro") { const t = $("#otroNom", el).value.trim(); if (!t) return toast("Anote nombre y cédula", "", "cr"); p = { nom: t, ced: "", autorizado: false }; }
          else p = { nom: au[+q].nom, ced: au[+q].ced, autorizado: true };
          V.entregar(x, p);
          closeSheet();
          toast("Entregado a " + p.nom, p.autorizado ? "Quedó la constancia con la firma." : "No estaba autorizado: quedó como excepción en la bitácora.", p.autorizado ? "ok" : "wa");
          A.refresh();
        });
      }
    });
  }

  let dsAmbito = "local";
  function porDespachar(v) {
    const L = D.despachos.filter(x => (x.estado === "Pendiente de alistar" || x.estado === "Alistado") && x.modalidad !== "Retiro en otro local" && deLoc(x.locId, dsAmbito))
      .sort((a, b) => a.fecha - b.fecha);
    const pa = L.filter(x => x.estado === "Pendiente de alistar");
    v.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Por alistar", grp(pa.length), { txt: "facturado y todavía en la tienda" }, "var(--warn)")}
        ${stat("Alistados", grp(L.length - pa.length), { txt: "esperan ruta o al cliente" })}
        ${stat("Marcados por peso", grp(L.filter(x => x.auto).length), { txt: "por peso: más de " + V.PARAM.pesoNoDespacho + " kg" })}
        ${stat("Con más de 2 días", grp(L.filter(x => V.diasEntre(x.fecha, D.HOY) >= 2).length), { txt: "revisar si el cliente ya viene" }, "var(--crit)")}
      </div>
      ${card({
      title: "Mercadería facturada sin entregar", hint: "clic para ver el detalle",
      actions: seg("dsa", [{ v: "local", t: locNom(S.locId) }, { v: "todos", t: "Todos" }], dsAmbito),
      body: table({
        onRow: true,
        cols: [
          { t: "Despacho", cls: "mono", fmt: x => `${esc(x.id)}<span class="sub">${esc(x.doc)}</span>` },
          { t: "Cliente", fmt: x => esc(cliNom(x.clienteId)) },
          { t: "Cómo se entrega", fmt: modTag },
          { t: "Peso", r: true, cls: "mono", fmt: x => kg(x.peso) + (x.auto ? `<span class="sub ui">marcado solo</span>` : "") },
          { t: "Facturado", cls: "mono", fmt: x => hace(x.fecha) },
          { t: "Estado", fmt: estDesp },
          { t: "", r: true, fmt: x => accionDesp(x) }
        ], rows: L, rowCls: x => (V.diasEntre(x.fecha, D.HOY) >= 2 && x.estado === "Pendiente de alistar" ? "wa" : "")
      })
    })}
      <div style="display:flex;gap:8px">${nota("Lo apartado sin factura y lo vendido contra pedido se sigue en Inventario › Existencias › Apartados y contra pedido.", "box")}<button class="btn sm" data-ir="existencias|comprometido" style="flex:none;align-self:center">Ir a apartados</button></div></div>`;
    v._L = L;
  }
  function porDespacharWire(v) {
    const p = $("#tp-despachos", v);
    onSeg(document, "dsa", x => { dsAmbito = x; A.refresh(); });
    A.wireIr(p); wireDesp(p);
    $$("tr.clickable", p).forEach(tr => tr.addEventListener("click", () => detalleDesp(p._L[+tr.dataset.i])));
  }

  function retiros(v) {
    const aqui = D.despachos.filter(x => x.modalidad === "Retiro en otro local" && x.retiroEn === S.locId && x.estado !== "Entregado");
    const alla = D.despachos.filter(x => x.modalidad === "Retiro en otro local" && x.locId === S.locId && x.estado !== "Entregado");
    const cols = otro => [
      { t: "Despacho", cls: "mono", fmt: x => `${esc(x.id)}<span class="sub">${esc(x.doc)}</span>` },
      { t: "Cliente", fmt: x => esc(cliNom(x.clienteId)) },
      { t: otro ? "Retira en" : "Facturado en", fmt: x => esc(locNom(otro ? x.retiroEn : x.locId)) },
      { t: "Reserva", fmt: x => (x.reserva && x.reserva.every(r => r.ok) ? tag("Reservado allá", "ok", "check") : tag(x.reserva ? x.reserva.filter(r => !r.ok).length + " líneas por traer" : "—", "wa", "truck")) },
      { t: "Peso", r: true, cls: "mono", fmt: x => kg(x.peso) },
      { t: "Estado", fmt: estDesp },
      { t: "", r: true, fmt: x => (otro ? "" : accionDesp(x)) }
    ];
    v.innerHTML = `<div class="wrap">
      ${nota("Se factura en un local y se retira en otro. Al facturar, el sistema reserva la mercadería en el local de retiro: ya no se coordina por teléfono. Si allá no alcanza, la línea queda marcada para traerla del CEDI.", "pin")}
      ${card({ title: "Para retirar en " + locNom(S.locId), hint: aqui.length + (aqui.length === 1 ? " despacho" : " despachos"), body: table({ onRow: true, cols: cols(false), rows: aqui }) })}
      ${card({ title: "Facturado aquí, se retira en otro local", hint: String(alla.length), body: table({ onRow: true, cols: cols(true), rows: alla }) })}</div>`;
    v._aqui = aqui; v._alla = alla;
  }
  function retirosWire(v) {
    const p = $("#tp-despachos", v);
    wireDesp(p);
    const tablas = $$("section.card table", p);
    tablas.forEach((tb, k) => $$("tr.clickable", tb).forEach(tr => tr.addEventListener("click", () => detalleDesp((k === 0 ? p._aqui : p._alla)[+tr.dataset.i]))));
  }

  function enRuta(v) {
    const ruta = D.despachos.filter(x => x.estado === "En ruta");
    const ent = D.despachos.filter(x => x.estado === "Entregado").sort((a, b) => (b.recibio ? b.recibio.hora : b.fecha) - (a.recibio ? a.recibio.hora : a.fecha));
    v.innerHTML = `<div class="wrap">
      ${card({
      title: "En ruta", hint: String(ruta.length), actions: `<button class="btn sm" data-ir="rutas">${icon("route")}Rutas y tarifario</button>`,
      body: table({
        onRow: true,
        cols: [
          { t: "Despacho", cls: "mono", fmt: x => `${esc(x.id)}<span class="sub">${esc(x.doc)}</span>` },
          { t: "Cliente", fmt: x => esc(cliNom(x.clienteId)) },
          { t: "Ruta", fmt: x => esc(x.ruta) },
          { t: "Vehículo", fmt: x => esc(x.vehiculo) },
          { t: "Peso", r: true, cls: "mono", fmt: x => kg(x.peso) }
        ], rows: ruta
      })
    })}
      ${card({
      title: "Entregados", hint: "con constancia de quién recibió",
      body: table({
        onRow: true,
        cols: [
          { t: "Despacho", cls: "mono", fmt: x => `${esc(x.id)}<span class="sub">${esc(x.doc)}</span>` },
          { t: "Cliente", fmt: x => esc(cliNom(x.clienteId)) },
          { t: "Recibió", fmt: x => (x.recibio ? `${esc(x.recibio.nom)}<span class="sub ui">${esc(x.recibio.ced || "")}</span>` : "—") },
          { t: "Control", fmt: x => (x.recibio && x.recibio.autorizado ? tag("Autorizado", "ok", "check") : tag("Excepción", "wa", "alert")) },
          { t: "Firma", fmt: () => tag("Firmó", "mu", "check") },
          { t: "Cuándo", cls: "mono", fmt: x => (x.recibio && x.recibio.hora ? fh(x.recibio.hora) : fecha(x.fecha)) }
        ], rows: ent
      })
    })}</div>`;
    v._ruta = ruta; v._ent = ent;
  }
  function enRutaWire(v) {
    const p = $("#tp-despachos", v);
    A.wireIr(p);
    $$("section.card table", p).forEach((tb, k) => $$("tr.clickable", tb).forEach(tr => tr.addEventListener("click", () => detalleDesp((k === 0 ? p._ruta : p._ent)[+tr.dataset.i]))));
  }

  A.workspace("despachos", {
    title: "Entregas y retiros",
    tabs: [
      {
        id: "pordespachar", t: "Por despachar", sub: "Facturado y todavía sin entregar: la factura es la venta, el despacho es la entrega",
        badge: () => { const n = D.despachos.filter(x => x.estado === "Pendiente de alistar" && x.locId === S.locId).length; return { n, k: "wa", l: n + " por alistar" }; },
        render: porDespachar, wire: porDespacharWire
      },
      {
        id: "retiros", t: "Retiros en otro local", sub: "Facturar aquí y retirar allá, con la mercadería reservada",
        badge: () => { const n = D.despachos.filter(x => x.modalidad === "Retiro en otro local" && x.retiroEn === S.locId && x.estado !== "Entregado").length; return { n, k: "", l: n + " para retirar aquí" }; },
        render: retiros, wire: retirosWire
      },
      { id: "ruta", t: "En ruta y entregados", sub: "Dónde va cada entrega y quién la recibió", render: enRuta, wire: enRutaWire }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     5 · DOCUMENTOS Y DEVOLUCIONES — Documentos emitidos ·
         Devolver mercadería · Notas de crédito
     ═════════════════════════════════════════════════════════════ */
  const docF = { tipo: "Todos", loc: "Todos", q: "" };
  const filtrarDocs = () => {
    let rows = D.documentos.filter(d => docF.tipo === "Todos" || d.tipo === docF.tipo);
    if (docF.loc !== "Todos") rows = rows.filter(d => d.locId === docF.loc);
    if (docF.q) rows = rows.filter(d => norm(d.cons + " " + cliNom(d.clienteId)).includes(norm(docF.q)));
    return rows.slice(0, 160);
  };
  const hacTag = d => (d.hacienda === "Aceptado" ? tag("Aceptado", "ok", "check") : tag(d.hacienda, d.hacienda === "Rechazado" ? "cr" : "wa", "alert"));
  function detalleDoc(d) {
    if (!d) return;
    const f = V.FICHA[d.clienteId];
    openSheet({
      wide: true, title: ({ FE: "Factura", TE: "Tiquete", NC: "Nota de crédito" }[d.tipo] || d.tipo) + " " + d.cons,
      sub: `${cliNom(d.clienteId)} · ${fh(d.fecha)} · ${locNom(d.locId)} caja ${d.term} · ${d.vendedor}`,
      body: `<div class="card" style="margin-bottom:14px"><div class="card-b flush"><div class="strip">
          <div class="cell"><div class="cl">Clave numérica</div><div class="cv num" style="font-size:11px;word-break:break-all">${esc(d.clave)}</div></div>
          <div class="cell"><div class="cl">${d.tipo === "NC" ? "Concepto" : "Condición"}</div><div class="cv">${d.tipo === "NC" ? esc(d.concepto || "—") + (d.refiere ? `<span class="sub ui">sobre ${esc(d.refiere)}</span>` : "") : esc(d.condicion) + " · " + esc(D.mediosTxt(d))}</div></div>
          <div class="cell"><div class="cl">Hacienda</div><div class="cv">${hacTag(d)}</div></div>
          ${d.tipo === "NC" ? `<div class="cell"><div class="cl">Reintegro</div><div class="cv">${esc(d.reintegro || "—")}</div></div>` : `<div class="cell"><div class="cl">Saldo</div><div class="cv num">${d.saldo ? c(d.saldo) : "Pagada"}</div></div>`}
        </div></div></div>
        ${table({
        cols: [
          { t: "Código", cls: "mono", fmt: r => esc(artOf(r.artId).cod) },
          { t: "Descripción", fmt: r => esc(artOf(r.artId).desc) + (r.nota ? `<span class="sub ui" style="color:var(--accent)">${icon("file", 'style="width:12px;height:12px"')} ${esc(r.nota)} · sale impreso</span>` : "") },
          { t: "CABYS", cls: "mono", fmt: r => esc(artOf(r.artId).cabys) },
          { t: "Cant.", r: true, cls: "mono", fmt: r => grp(r.cant) },
          { t: "Precio con IVA", r: true, cls: "mono", fmt: r => grp(r.precio) },
          { t: "Desc.", r: true, cls: "mono", fmt: r => (r.desc ? dec(r.desc) + " %" : "—") },
          { t: "Total con IVA", r: true, cls: "mono", fmt: r => `<b>${grp(Math.round(r.cant * r.precio * (1 - (r.desc || 0) / 100)))}</b>` }
        ], rows: d.lineas
      })}
        <div style="display:grid;grid-template-columns:1fr 260px;gap:16px;margin-top:16px">
          <div class="mut" style="font-size:12.5px;line-height:1.6">El XML firmado y la respuesta de Hacienda se guardan cinco años en el archivo de la empresa. El PDF no lleva ningún enlace que abra el sistema.${f ? " Los comprobantes salen a " + esc(f.correoFE) + "." : ""}</div>
          <div>
            <div class="totline s"><span class="tl">Subtotal sin IVA</span><span class="tv">${grp(d.grav + d.exe)}</span></div>
            ${d.desc ? `<div class="totline s"><span class="tl">Incluye descuentos por</span><span class="tv">${grp(d.desc)}</span></div>` : ""}
            ${D.desgloseIva(d).map(([k, v]) => `<div class="totline"><span class="tl">${esc(k)}</span><span class="tv">${v < 0 ? "−" : ""}${grp(v)}</span></div>`).join("")}
            <div class="totrule"></div>
            <div class="totline"><span class="tl b">Total</span><span class="tv" style="font-size:17px">${c(d.total)}</span></div>
          </div></div>`,
      footer: `<button class="btn" data-cerrar>Cerrar</button><div class="gap"></div>
        <button class="btn">${icon("download")}XML</button><button class="btn" id="dReenv">${icon("mail")}Reenviar</button><button class="btn">${icon("print")}Reimprimir</button>
        ${d.tipo !== "NC" ? `<button class="btn pri" id="dDev">${icon("swap")}Devolver mercadería</button>` : ""}`,
      after(el) {
        cerrar(el);
        $("#dReenv", el).addEventListener("click", () => toast("Comprobante reenviado", f ? "A " + f.correoFE + " y por WhatsApp." : "Por WhatsApp.", "ok"));
        const dv = $("#dDev", el); if (dv) dv.addEventListener("click", () => { closeSheet(); dev.doc = d; dev.cant = {}; dev.firma = false; A.go("documentos", "devolver"); });
      }
    });
  }
  function emitidos(v) {
    const rows = filtrarDocs();
    const tot = rows.reduce((s, d) => s + (d.tipo === "NC" ? -d.total : d.total), 0);
    v.innerHTML = card({
      title: "Comprobantes electrónicos", hint: rows.length + " en pantalla",
      actions: `${seg("dtipo", ["Todos", "FE", "TE", "NC"], docF.tipo)}
        <input class="inp" id="dq" placeholder="Consecutivo o cliente" value="${esc(docF.q)}" style="width:200px">
        <select class="inp" id="dloc" style="width:auto"><option>Todos</option>${D.tiendas.map(l => `<option value="${l.id}" ${docF.loc === l.id ? "selected" : ""}>${esc(l.nom)}</option>`).join("")}</select>`,
      body: table({
        h: "calc(100dvh - 330px)", onRow: true,
        cols: [
          { t: "Consecutivo", cls: "mono", fmt: r => `${esc(r.cons)}<span class="sub">${esc(r.clave.slice(0, 24))}…</span>` },
          { t: "Tipo", fmt: r => tag(r.tipo, r.tipo === "NC" ? "wa" : r.tipo === "TE" ? "mu" : "ac") },
          { t: "Fecha", cls: "mono", fmt: r => fh(r.fecha) },
          { t: "Local", fmt: r => esc(locNom(r.locId)) },
          { t: "Cliente", fmt: r => esc(cliNom(r.clienteId)) },
          { t: "Vendedor", fmt: r => `<span class="mut">${esc(r.vendedor)}</span>` },
          { t: "Cond.", fmt: r => esc(r.tipo === "NC" ? r.concepto || "—" : r.condicion) },
          { t: "Total", r: true, cls: "mono", fmt: r => `<b>${r.tipo === "NC" ? "−" : ""}${grp(r.total)}</b>` },
          { t: "Hacienda", fmt: hacTag }
        ],
        rows, foot: [{ v: rows.length + " documentos", span: 7 }, { v: grp(tot), r: true, cls: "mono" }, { v: "" }]
      })
    });
  }
  function emitidosWire(v) {
    onSeg(document, "dtipo", val => { docF.tipo = val; A.refresh(); });
    const q = $("#dq", v);
    q.addEventListener("change", () => { docF.q = q.value; A.refresh(); });
    $("#dloc", v).addEventListener("change", e => { docF.loc = e.target.value; A.refresh(); });
    $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => detalleDoc(filtrarDocs()[+tr.dataset.i])));
  }

  /* devolución en curso: factura, cantidades, concepto, destino, reintegro y firma */
  const dev = { doc: null, q: "", cant: {}, concepto: "Devolución de mercadería", destino: "Vuelve a la venta", reintegro: null, motivo: "", firma: false };
  const reintegroDe = d => (d.condicion === "Crédito" && d.saldo > 0 ? "Rebaja de la cuenta por cobrar" : d.medio === "Tarjeta" ? "A la misma tarjeta" : d.medio === "SINPE móvil" ? "SINPE móvil" : "Efectivo");
  function devolver(v) {
    const bol = V.BOLETAS.filter(b => b.estado === "Por aprobar");
    const d = dev.doc;
    const res = !d ? D.documentos.filter(x => x.tipo !== "NC" && (!dev.q || norm(x.cons + " " + cliNom(x.clienteId)).includes(norm(dev.q)))).slice(0, 12) : [];
    const lineas = d ? d.lineas.map(l => ({ l, ya: V.devuelto(d, l.artId), n: dev.cant[l.artId] || 0 })) : [];
    const sel = lineas.filter(x => x.n > 0);
    const monto = sel.reduce((s, x) => s + x.n * x.l.precio * (1 - (x.l.desc || 0) / 100), 0);
    const conc = V.CONCEPTOS.find(k => k.id === dev.concepto);
    const tope = monto > V.PARAM.devolucionSinAprobacion;
    const paso = (n, t, body) => card({ title: n + " · " + t, body });
    v.innerHTML = `<div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);align-items:start">
      <div class="wrap">
        ${paso(1, "La factura", d ? `<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <div style="flex:1;min-width:200px"><b class="num">${esc(d.cons)}</b><div class="mut" style="font-size:12.5px">${esc(cliNom(d.clienteId))} · ${fh(d.fecha)} · ${esc(locNom(d.locId))} · ${esc(d.condicion)} ${esc(D.mediosTxt(d))} · ${c(d.total)}</div></div>
            <button class="btn sm" id="devOtra">Cambiar de factura</button></div>`
      : `<div class="tb-search" style="width:100%;margin-bottom:10px">${icon("scan")}<input id="devQ" value="${esc(dev.q)}" placeholder="Escanee el tiquete o escriba el consecutivo o el cliente" autocomplete="off"></div>
            ${table({ onRow: true, cols: [{ t: "Documento", cls: "mono", fmt: x => esc(x.cons) }, { t: "Cliente", fmt: x => esc(cliNom(x.clienteId)) }, { t: "Fecha", cls: "mono", fmt: x => fecha(x.fecha) }, { t: "Total", r: true, cls: "mono", fmt: x => grp(x.total) }], rows: res })}`)}
        ${d ? paso(2, "Qué se devuelve", table({
        cols: [
          { t: "Artículo", fmt: x => `${esc(artOf(x.l.artId).desc)}<span class="sub ui">${esc(artOf(x.l.artId).cod)}</span>` },
          { t: "Facturado", r: true, cls: "mono", fmt: x => grp(x.l.cant) },
          { t: "Ya devuelto", r: true, cls: "mono", fmt: x => (x.ya ? grp(x.ya) : '<span class="dim">0</span>') },
          { t: "Devolver", c: true, fmt: x => `<div class="qstep"><button type="button" class="qb" data-dq="${x.l.artId}" data-d="-1">−</button><input class="qi num" data-dqi="${x.l.artId}" value="${x.n}" inputmode="numeric" aria-label="Cantidad a devolver"><button type="button" class="qb" data-dq="${x.l.artId}" data-d="1">+</button></div>` },
          { t: "Monto", r: true, cls: "mono", fmt: x => (x.n ? grp(x.n * x.l.precio * (1 - (x.l.desc || 0) / 100)) : '<span class="dim">—</span>') }
        ], rows: lineas
      })) : ""}
        ${d ? paso(3, "Concepto y reintegro", `<div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
            <div class="field" style="margin:0"><label for="devCon">Concepto de la nota de crédito</label><select id="devCon">${V.CONCEPTOS.map(k => `<option ${k.id === dev.concepto ? "selected" : ""}>${esc(k.id)}</option>`).join("")}</select><div class="mut" style="font-size:12px;margin-top:4px">${esc(conc.d)}</div></div>
            <div class="field" style="margin:0"><label for="devRei">Reintegro</label><select id="devRei">${V.REINTEGROS.map(k => `<option ${k === (dev.reintegro || reintegroDe(d)) ? "selected" : ""}>${esc(k)}</option>`).join("")}</select></div>
            ${conc.inv ? `<div class="field" style="margin:0;grid-column:1/-1"><label>Qué pasa con la mercadería</label>${seg("devDest", V.DESTINOS, dev.destino)}</div>` : ""}
            <div class="field" style="margin:0;grid-column:1/-1"><label for="devMot">Motivo</label><input id="devMot" value="${esc(dev.motivo)}" placeholder="Por ejemplo: sobró material de la obra"></div></div>`) : ""}
        ${d ? paso(4, "Firma del cliente", `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
            <div style="flex:1;min-width:220px;font-size:12.5px;color:var(--ink-2);line-height:1.55">La boleta de devolución se firma en la tableta, en lugar del formulario a mano. La firma viaja con la nota de crédito.</div>
            ${dev.firma ? `<div style="text-align:center"><svg viewBox="0 0 220 60" style="width:200px;height:54px"><path d="M10 40 C 28 12, 44 52, 60 30 S 92 14, 108 36 S 146 48, 160 24 S 196 30, 210 32" fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round"/></svg><div class="mut" style="font-size:11.5px">Firmó el cliente</div></div>`
          : `<button class="btn" id="devFirma">${icon("check")}Pedir la firma</button>`}</div>`) : ""}
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        ${card({
      title: "Resumen",
      body: d ? `<div class="totline s"><span class="tl">Líneas</span><span class="tv">${sel.length}</span></div>
          <div class="totline s"><span class="tl">Concepto</span><span class="tv" style="font-family:var(--ui)">${esc(dev.concepto)}</span></div>
          <div class="totline s"><span class="tl">Reintegro</span><span class="tv" style="font-family:var(--ui)">${esc(dev.reintegro || reintegroDe(d))}</span></div>
          <div class="totrule"></div><div class="totline"><span class="tl b">Nota de crédito</span><span class="tv" style="font-size:18px">${c(monto)}</span></div>
          ${tope ? `<div style="margin-top:10px">${nota("Pasa de " + c(V.PARAM.devolucionSinAprobacion) + ": la boleta queda esperando al administrador antes de emitir la nota.", "shield")}</div>` : ""}
          <button class="bigbtn" id="devOk" style="margin-top:12px;width:100%" ${sel.length && dev.firma ? "" : "disabled"}>${icon("swap")}${tope ? "Enviar a aprobación" : "Emitir nota de crédito"}</button>
          ${!dev.firma && sel.length ? `<div class="mut" style="font-size:12px;margin-top:6px;text-align:center">Falta la firma del cliente</div>` : ""}`
        : `<div class="mut" style="font-size:13px">Busque la factura para empezar. La nota de crédito sale con su concepto, devuelve el inventario y rebaja la cuenta por cobrar si era a crédito.</div>`
    })}
        ${card({
      title: "Por aprobar", hint: String(bol.length), flush: true,
      body: bol.length ? `<div class="alerts">${bol.map(b => `<div class="alert wa" style="cursor:default">${icon("swap")}<span style="flex:1;min-width:0"><span class="at" style="display:block">${esc(cliNom(b.doc.clienteId))} · ${c(b.total)}</span>
            <span class="as">${esc(b.concepto)} · ${esc(b.motivo)} · pidió ${esc(b.solicita)} en ${esc(locNom(b.locId))}</span>
            <span style="display:flex;gap:6px;margin-top:8px"><button class="btn sm pri" data-bol="ok:${b.id}">Aprobar</button><button class="btn sm" data-bol="no:${b.id}">Rechazar</button></span></span></div>`).join("")}</div>`
        : `<div class="mut" style="padding:14px 16px;font-size:12.5px">Nada por aprobar.</div>`
    })}
      </div></div>`;
    v._res = res;
  }
  function devolverWire(v) {
    const p = $("#tp-documentos", v);
    const q = $("#devQ", p);
    if (q) {
      q.addEventListener("input", () => { dev.q = q.value; A.refresh(); setTimeout(() => { const e = $("#devQ"); if (e) { e.focus(); e.setSelectionRange(e.value.length, e.value.length); } }, 0); });
      q.addEventListener("keydown", e => { if (e.key === "Enter" && p._res[0]) { dev.doc = p._res[0]; dev.cant = {}; dev.firma = false; A.refresh(); } });
      $$("tr.clickable", p).forEach(tr => tr.addEventListener("click", () => { dev.doc = p._res[+tr.dataset.i]; dev.cant = {}; dev.firma = false; dev.reintegro = null; A.refresh(); }));
    }
    const o = $("#devOtra", p); if (o) o.addEventListener("click", () => { dev.doc = null; dev.cant = {}; dev.firma = false; dev.reintegro = null; A.refresh(); });
    const max = artId => { const l = dev.doc.lineas.find(x => x.artId === artId); return l.cant - V.devuelto(dev.doc, artId); };
    $$("[data-dq]", p).forEach(b => b.addEventListener("click", () => { const id = b.dataset.dq; dev.cant[id] = Math.max(0, Math.min(max(id), (dev.cant[id] || 0) + +b.dataset.d)); A.refresh(); }));
    $$("[data-dqi]", p).forEach(i => i.addEventListener("change", () => { const id = i.dataset.dqi; dev.cant[id] = Math.max(0, Math.min(max(id), Math.round(numIn(i.value)))); A.refresh(); }));
    const cn = $("#devCon", p); if (cn) cn.addEventListener("change", () => { dev.concepto = cn.value; A.refresh(); });
    const rn = $("#devRei", p); if (rn) rn.addEventListener("change", () => { dev.reintegro = rn.value; A.refresh(); });
    const mt = $("#devMot", p); if (mt) mt.addEventListener("change", () => { dev.motivo = mt.value; });
    onSeg(p, "devDest", x => { dev.destino = x; });
    const fi = $("#devFirma", p); if (fi) fi.addEventListener("click", () => { dev.firma = true; A.refresh(); });
    const ok = $("#devOk", p);
    if (ok) ok.addEventListener("click", () => {
      const d = dev.doc;
      if (!D.puedeEmitir(S.locId, S.term)) return toast("Esta terminal no emite comprobantes", "La nota de crédito sale de una caja de tienda. Cambie de local o de terminal en la barra superior.", "cr");
      const lineas = d.lineas.filter(l => dev.cant[l.artId] > 0).map(l => ({ artId: l.artId, cant: dev.cant[l.artId], precio: l.precio, desc: l.desc || 0 }));
      const monto = D.totalizar(lineas, { exoneracion: d.exoneracion }).total;
      const o = { doc: d, lineas, concepto: dev.concepto, destino: V.CONCEPTOS.find(k => k.id === dev.concepto).inv ? dev.destino : "—", reintegro: dev.reintegro || reintegroDe(d), firma: true, locId: S.locId, term: S.term, offline: S.offline, usuario: S.vendedor };
      if (monto > V.PARAM.devolucionSinAprobacion) {
        V.BOLETAS.unshift({ id: "BD-" + String(900 + V.BOLETAS.length).padStart(5, "0"), doc: d, lineas, total: monto, concepto: o.concepto, destino: o.destino, reintegro: o.reintegro, solicita: S.vendedor, locId: S.locId, term: S.term, fecha: V.ahora(), firma: true, estado: "Por aprobar", motivo: dev.motivo || "Sin motivo" });
        toast("Enviada a aprobación", "El administrador la ve en Pendientes de ventas. Al aprobarla se emite la nota.", "wa");
      } else {
        let nc;
        try { nc = V.emitirNC(o); } catch (e) { return toast("No se emitió la nota de crédito", e.message, "cr"); }
        toast("Nota de crédito " + nc.cons, (S.offline ? "Quedó en cola para Hacienda. " : "Aceptada por Hacienda. ") + (o.destino === "Vuelve a la venta" ? "La mercadería volvió al disponible." : o.destino !== "—" ? "La mercadería va a " + o.destino.toLowerCase() + "." : ""), "ok");
      }
      Object.assign(dev, { doc: null, q: "", cant: {}, firma: false, reintegro: null, motivo: "" });
      A.refresh();
    });
    $$("[data-bol]", p).forEach(b => b.addEventListener("click", () => {
      const [acc, id] = b.dataset.bol.split(":"), x = V.BOLETAS.find(y => y.id === id);
      if (acc === "ok") { let nc; try { nc = V.aprobarBoleta(x, "Marta Rojas"); } catch (e) { return toast("No se emitió la nota de crédito", e.message, "cr"); } toast("Aprobada · NC " + nc.cons, "Se emitió la nota de crédito con la firma del cliente.", "ok"); }
      else { x.estado = "Rechazada"; V.anotar("Rechazó devolución", x.id + " · " + cliNom(x.doc.clienteId), "Marta Rojas", x.locId); toast("Devolución rechazada", "Quedó en la bitácora.", "in"); }
      A.refresh();
    }));
  }

  function notas(v) {
    const inicio = new Date(D.HOY.getFullYear(), D.HOY.getMonth(), 1);
    const nc = D.documentos.filter(d => d.tipo === "NC");
    const mes = nc.filter(d => d.fecha >= inicio);
    const fact = D.documentos.filter(d => d.tipo !== "NC" && d.fecha >= inicio).length;
    const porC = V.CONCEPTOS.map(k => ({ n: k.id, v: mes.filter(d => d.concepto === k.id).reduce((s, d) => s + d.total, 0) })).filter(x => x.v);
    v.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Notas del mes", grp(mes.length), { txt: c(mes.reduce((s, d) => s + d.total, 0)) })}
        ${stat("Sobre las facturas", dec(fact ? (mes.length / fact) * 100 : 0) + " %", { txt: "en la operación real ronda el 4,7 %" })}
        ${stat("Con firma del cliente", grp(mes.filter(d => d.firma).length), { txt: "boleta digital, sin papel" }, "var(--ok)")}
        ${stat("En cola para Hacienda", grp(mes.filter(d => d.hacienda !== "Aceptado").length), { txt: "salen solas al volver el enlace" })}
      </div>
      <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.8fr);align-items:start">
        ${card({ title: "Por concepto", hint: "monto del mes", body: porC.length ? bars(porC.map(x => ({ n: x.n, v: x.v, lab: c(x.v) }))) : '<div class="mut">Sin notas este mes.</div>' })}
        ${card({
      title: "Notas de crédito",
      body: table({
        onRow: true, h: "calc(100dvh - 440px)",
        cols: [
          { t: "Consecutivo", cls: "mono", fmt: d => `${esc(d.cons)}<span class="sub">sobre ${esc(d.refiere || "—")}</span>` },
          { t: "Cliente", fmt: d => esc(cliNom(d.clienteId)) },
          { t: "Concepto", fmt: d => esc(d.concepto || "—") },
          { t: "Reintegro", fmt: d => `<span class="mut">${esc(d.reintegro || "—")}</span>` },
          { t: "Total", r: true, cls: "mono", fmt: d => `<b>${grp(d.total)}</b>` },
          { t: "Hacienda", fmt: hacTag }
        ], rows: nc
      })
    })}</div></div>`;
    v._nc = nc;
  }
  function notasWire(v) { const p = $("#tp-documentos", v); $$("tr.clickable", p).forEach(tr => tr.addEventListener("click", () => detalleDoc(p._nc[+tr.dataset.i]))); }

  A.workspace("documentos", {
    title: "Documentos y devoluciones",
    onArg: (tab, dato) => {
      const d = D.documentos.find(x => x.id === tab);
      if (d) setTimeout(() => detalleDoc(d), 40);
      if (tab === "devolver" && dato) {
        const b = V.BOLETAS.find(x => x.id === dato), doc = D.documentos.find(x => x.id === dato);
        if (doc) { dev.doc = doc; dev.cant = {}; dev.firma = false; }
        if (b) setTimeout(() => toast("Boleta " + b.id + " por aprobar", "Está en la columna «Por aprobar».", "in"), 40);
      }
    },
    tabs: [
      { id: "emitidos", t: "Documentos emitidos", sub: () => D.documentos.length + " comprobantes electrónicos · buscar, reimprimir, reenviar", render: emitidos, wire: emitidosWire },
      {
        id: "devolver", t: "Devolver mercadería", sub: "De la factura a la nota de crédito, con la firma del cliente",
        badge: () => { const n = V.BOLETAS.filter(b => b.estado === "Por aprobar").length; return { n, k: "wa", l: n + " por aprobar" }; },
        render: devolver, wire: devolverWire
      },
      { id: "notas", t: "Notas de crédito", sub: "Con su concepto: devolución, garantía, descuento, exoneración, financiera, intereses, promocional o rebajo de planilla", render: notas, wire: notasWire }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     6 · CLIENTES — Ficha · Crédito · Compras (una sola pantalla:
         Ventas la abre en Ficha y Cobros y pagos en Crédito)
     ═════════════════════════════════════════════════════════════ */
  let cliQ = "", cliInact = false;
  function conCliente(v, cuerpo) {
    const base = D.clientes.filter(x => cliInact || V.FICHA[x.id].activo);
    const lista = cliQ ? base.filter(x => norm(x.nom + " " + x.ced + " " + x.categoria).includes(norm(cliQ))) : base;
    const cli = D.cliById[S.cliSel] && lista.some(x => x.id === S.cliSel) ? D.cliById[S.cliSel] : lista[0] || D.clientes[0];
    S.cliSel = cli.id;
    const f = V.FICHA[cli.id], bq = V.bloqueo(cli.id);
    v.innerHTML = `<div class="split">
      ${card({
      cls: "mlist",
      body: `<div class="tb-search" style="width:100%;margin-bottom:8px">${icon("search")}<input id="cq" type="search" value="${esc(cliQ)}" placeholder="Nombre, cédula o categoría" aria-label="Buscar cliente"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="mut" style="font-size:12px">${lista.length} clientes · sin comodines</span>
          <label class="mut" style="font-size:12px;display:flex;gap:5px;align-items:center;cursor:pointer"><input type="checkbox" id="cinact" ${cliInact ? "checked" : ""}>inactivos</label></div>
        <div class="mitems">${lista.map(x => `<button class="mitem" data-cli="${x.id}" aria-selected="${x.id === cli.id}">
          <span style="flex:1;min-width:0"><span class="itd">${esc(x.nom)}</span><span class="itc">${esc(x.ced)} · ${esc(x.categoria)}</span></span>
          ${!V.FICHA[x.id].activo ? tag("Inactivo", "mu") : V.bloqueo(x.id) ? tag(V.bloqueo(x.id).k === "cr" ? "Bloqueado" : "Vencido", V.bloqueo(x.id).k) : x.saldo > 0 ? tag(c(Math.round(x.saldo)), "mu") : ""}</button>`).join("")}</div>`
    })}
      <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
        ${card({
      body: `<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
          <span class="avatar" style="width:46px;height:46px;font-size:15px">${esc(ini(cli.nom))}</span>
          <div style="flex:1;min-width:200px">
            <h3 style="font-size:19px">${esc(cli.nom)}</h3>
            <div class="mut num" style="font-size:12px;margin-top:2px">${esc(cli.ced)} · ${esc(cli.tipoCed)} · cliente desde ${esc(cli.desde)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:9px">
              ${tag(cli.categoria, "acc")}${tag(f.territorio, "mu", "pin")}${tag("Atiende " + f.vendedor, "mu", "users")}
              ${f.exoneraciones.length ? tag("Exonerado", "ok", "shield") : ""}${!f.activo ? tag("Inactivo", "cr") : ""}${bq ? tag(bq.t, bq.k, "alert") : ""}</div>
          </div>
          <button class="btn pri" id="facturar" ${f.activo ? "" : "disabled"}>${icon("cash")}Facturar a este cliente</button>
        </div>`
    })}
        ${cuerpo(cli, f, bq)}
      </div></div>`;
  }
  function conClienteWire(v) {
    const q = $("#cq", v);
    q.addEventListener("input", () => { cliQ = q.value; A.refresh(); setTimeout(() => { const e = $("#cq"); if (e) { e.focus(); e.setSelectionRange(e.value.length, e.value.length); } }, 0); });
    $("#cinact", v).addEventListener("change", e => { cliInact = e.target.checked; A.refresh(); });
    $$("[data-cli]", v).forEach(b => b.addEventListener("click", () => { S.cliSel = b.dataset.cli; A.refresh(); }));
    const fa = $("#facturar", v);
    if (fa) fa.addEventListener("click", () => {
      S.cart.cliId = S.cliSel;
      S.cart.condicion = D.cliById[S.cliSel].limite ? "Crédito" : "Contado";
      if (w.POSX) w.POSX.aplicarCliente();
      A.go("pos");
    });
  }
  const sec = (t, hint, body, actions) => card({ title: t, hint, body, actions });

  function ficha(v) {
    conCliente(v, (cli, f) => {
      const exo = f.exoneraciones;
      const porVencer = x => V.diasEntre(D.HOY, x.vence) <= 30;
      const topDesc = V.FAMV.map(fm => ({ fm, d: V.DESC[cli.categoria] ? V.DESC[cli.categoria][fm.id] : 0 })).filter(x => x.d > 0);
      const au = V.AUTORIZADOS[cli.id] || [];
      return `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
        ${sec("Datos fiscales", "salen en el comprobante electrónico", kvs([
        ["Tipo de cédula", esc(cli.tipoCed)],
        ["Actividad económica", f.actividad ? `<span class="num">${esc(f.actividad.cod)}</span> · ${esc(f.actividad.desc)}` : '<span class="dim">Consumidor final, sin actividad</span>'],
        ["Correo de comprobantes", `<span style="font-size:12.5px">${esc(f.correoFE)}</span>`],
        ["Exoneraciones", exo.length ? exo.map(x => `<div style="margin-bottom:6px"><b class="num">${esc(x.numero)}</b> · ${esc(x.tipo)} · ${x.pct} %<br><span class="${porVencer(x) ? "" : "mut"}" style="font-size:12px;${porVencer(x) ? "color:var(--warn);font-weight:650" : ""}">${esc(x.institucion)} · vence ${fecha(x.vence)}${porVencer(x) ? " · renovar" : ""}</span></div>`).join("") : '<span class="dim">Ninguna vigente</span>']
      ]), `<button class="btn sm" id="editF">${icon("clip")}Editar</button>`)}
        ${sec("Categoría y descuentos", "la caja los aplica sola", `<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">${tag(cli.categoria, "acc")}<span class="mut" style="font-size:12.5px">${topDesc.length ? topDesc.length + " familias con descuento" : "Paga el precio de lista"}</span></div>
          ${topDesc.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${topDesc.map(x => tag(x.fm.nom + " " + x.d + " %", "mu")).join("")}</div>` : ""}
          <div style="margin-top:12px">${nota("Si un descuento dejaría un artículo por debajo del margen mínimo de su familia, la caja lo deja en el tope. Nadie tiene que recordar el precio especial de cada cliente.", "wallet")}</div>`,
        `<button class="btn sm" data-ir="ven-precios|categorias">Ver categorías</button>`)}
      </div>
      ${sec("Contactos", f.contactos.length + "", table({
        cols: [
          { t: "Nombre", fmt: x => `<b>${esc(x.nom)}</b><span class="sub ui">${esc(x.puesto)}</span>` },
          { t: "Teléfono", cls: "mono", fmt: x => esc(x.tel) },
          { t: "Correo", fmt: x => (x.correo ? esc(x.correo) : '<span class="dim">—</span>') },
          { t: "Recibe comprobantes", fmt: x => (x.comprobantes ? tag("Sí", "ok", "check") : '<span class="dim">No</span>') }
        ], rows: f.contactos
      }), `<button class="btn sm" data-add="contacto">${icon("plus")}Contacto</button>`)}
      <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
        ${sec("Direcciones de entrega", "el flete sale de la zona", table({
        cols: [
          { t: "Dirección", fmt: x => `<b>${esc(x.nom)}</b>${x.principal ? " " + tag("fiscal", "mu") : ""}<span class="sub ui">${esc(x.dir)}</span>` },
          { t: "Zona", fmt: x => esc(x.zona) },
          { t: "Flete ≤ 5 t", r: true, cls: "mono", fmt: x => { const fl = V.flete(x.zona, 1000); return fl.monto ? grp(fl.monto) : '<span class="dim">cotiza</span>'; } }
        ], rows: f.direcciones
      }), `<button class="btn sm" data-add="direccion">${icon("plus")}Dirección</button>`)}
        ${sec("Autorizados a retirar", "control de entrega", au.length ? table({
        cols: [
          { t: "Persona", fmt: x => `<b>${esc(x.nom)}</b><span class="sub ui">${esc(x.rol)}</span>` },
          { t: "Cédula", cls: "mono", fmt: x => esc(x.ced) },
          { t: "Vigencia", fmt: x => (x.vence < D.HOY ? tag("Vencida", "cr", "alert") : V.diasEntre(D.HOY, x.vence) <= 30 ? tag("Vence " + fecha(x.vence), "wa", "clock") : tag("Hasta " + fecha(x.vence), "ok", "check")) }
        ], rows: au
      }) : `<div class="mut" style="font-size:13px">Solo el titular retira. En Entregas y retiros, cualquier otra persona queda como excepción.</div>`, `<button class="btn sm" data-add="autorizado">${icon("plus")}Autorizado</button>`)}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" id="inact">${f.activo ? icon("lock") + "Inactivar cliente" : icon("check") + "Reactivar cliente"}</button></div>`;
    });
  }
  function fichaWire(v) {
    conClienteWire(v); A.wireIr(v);
    const cli = D.cliById[S.cliSel], f = V.FICHA[cli.id];
    $("#editF", v).addEventListener("click", () => toast("Edición de la ficha", "Cada cambio queda en la bitácora con el valor anterior y el nuevo.", "in"));
    $$("[data-add]", v).forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.add;
      const campos = k === "autorizado" ? [["Nombre", "nom"], ["Cédula", "ced"], ["Papel", "rol"]] : k === "contacto" ? [["Nombre", "nom"], ["Puesto", "puesto"], ["Teléfono", "tel"], ["Correo", "correo"]] : [["Nombre de la dirección", "nom"], ["Dirección", "dir"]];
      openSheet({
        title: { autorizado: "Agregar autorizado a retirar", contacto: "Agregar contacto", direccion: "Agregar dirección de entrega" }[k], sub: cli.nom,
        body: campos.map(x => `<div class="field"><label>${esc(x[0])}</label><input data-f="${x[1]}"></div>`).join("") + (k === "direccion" ? `<div class="field"><label>Zona</label><select data-f="zona">${D.tarifario.map(t => `<option>${esc(t.zona)}</option>`).join("")}</select></div>` : "") + (k === "autorizado" ? nota("Vigencia de un año. Al entregar, la bodega ve la lista con la cédula de cada persona.", "shield") : ""),
        footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="addOk">Guardar</button>`,
        after(el) {
          cerrar(el);
          $("#addOk", el).addEventListener("click", () => {
            const o = {}; $$("[data-f]", el).forEach(i => { o[i.dataset.f] = i.value.trim(); });
            if (!o.nom) return toast("Falta el nombre", "", "cr");
            if (k === "autorizado") (V.AUTORIZADOS[cli.id] = V.AUTORIZADOS[cli.id] || []).push({ nom: o.nom, ced: o.ced, rol: o.rol || "Autorizado", vence: V.dia(-365) });
            if (k === "contacto") f.contactos.push({ nom: o.nom, puesto: o.puesto, tel: o.tel, correo: o.correo, comprobantes: false });
            if (k === "direccion") f.direcciones.push({ nom: o.nom, dir: o.dir, zona: o.zona, principal: false });
            V.anotar("Modificó ficha de cliente", cli.nom + " · agregó " + k + " " + o.nom, S.vendedor, S.locId, k === "autorizado" ? "Alta" : "Baja");
            closeSheet(); toast("Guardado", "Quedó en la bitácora.", "ok"); A.refresh();
          });
        }
      });
    }));
    $("#inact", v).addEventListener("click", () => {
      openSheet({
        title: f.activo ? "Inactivar cliente" : "Reactivar cliente", sub: cli.nom,
        body: nota(f.activo ? "El cliente no se elimina: se inactiva. Sus facturas, saldos y bitácora se conservan, pero ya no aparece al facturar." : "Vuelve a aparecer al facturar, con su historial intacto.", "lock"),
        footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="inOk">${f.activo ? "Inactivar" : "Reactivar"}</button>`,
        after(el) { cerrar(el); $("#inOk", el).addEventListener("click", () => { f.activo = !f.activo; V.anotar(f.activo ? "Reactivó cliente" : "Inactivó cliente", cli.nom, "Andrey Ramírez", S.locId, "Alta", f.activo ? "Inactivo" : "Activo", f.activo ? "Activo" : "Inactivo"); closeSheet(); A.refresh(); }); }
      });
    });
  }

  function credito(v) {
    conCliente(v, (cli, f, bq) => {
      const venc = V.vencidas(cli.id);
      const docs = D.documentos.filter(d => d.clienteId === cli.id && d.saldo > 0).sort((a, b) => a.fecha - b.fecha);
      const uso = cli.limite ? Math.min(100, (cli.saldo / cli.limite) * 100) : 0;
      if (!cli.limite) return `${card({ body: empty("wallet", "Cliente de contado", "No tiene línea de crédito. Si se le asigna, la caja le deja facturar a crédito sin pedir autorización en cada venta.") })}
        <div style="display:flex;justify-content:center"><button class="btn pri" id="limite">${icon("plus")}Asignar línea de crédito</button></div>`;
      return `${bq ? `<div class="stepbar" style="${bq.k === "cr" ? "border-color:var(--crit-line);background:var(--crit-soft)" : ""}"><div class="sbt"><b>${esc(bq.t)}</b><span>${esc(bq.d)}</span></div><div class="sba"><button class="btn sm" id="sobreg">${icon("shield")}Autorizar sobregiro</button></div></div>` : ""}
        ${card({
        title: "Línea de crédito", actions: `<button class="btn sm" id="limite">${icon("clip")}Cambiar límite o plazo</button>`,
        body: `<div class="ficha" style="margin:-4px -17px 12px">${fichaCell("Límite", c(cli.limite))}${fichaCell("Saldo", c(Math.round(cli.saldo)))}${fichaCell("Disponible", c(Math.round(cli.limite - cli.saldo)), cli.limite - cli.saldo > 0 ? "var(--ok)" : "var(--crit)")}${fichaCell("Plazo", cli.plazo + " días")}${fichaCell("Vencido", c(venc.reduce((s, d) => s + d.saldo, 0)), venc.length ? "var(--crit)" : "")}</div>
          ${prog([{ w: uso, col: uso >= 100 ? "var(--crit)" : uso > 80 ? "var(--warn)" : "var(--accent)" }])}
          <div class="mut" style="font-size:12px;margin-top:6px">Usa el ${dec(uso, 0)} % de la línea. Dentro del límite y al día, la caja factura a crédito sin llamar a nadie.</div>`
      })}
        <div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);align-items:start">
          ${sec("Facturas con saldo", docs.length + "", table({
        h: "340px",
        cols: [
          { t: "Factura", cls: "mono", fmt: d => esc(d.cons) },
          { t: "Emitida", cls: "mono", fmt: d => fecha(d.fecha) },
          { t: "Días", r: true, cls: "mono", fmt: d => { const n = V.diasEntre(d.fecha, D.HOY); return `<span style="color:${n > cli.plazo ? "var(--crit)" : "var(--ink)"}">${n}</span>`; } },
          { t: "Saldo", r: true, cls: "mono", fmt: d => `<b>${grp(d.saldo)}</b>` }
        ], rows: docs, rowCls: d => (V.diasEntre(d.fecha, D.HOY) > cli.plazo + 30 ? "cr" : V.diasEntre(d.fecha, D.HOY) > cli.plazo ? "wa" : "")
      }), `<button class="btn sm" data-ir="cxc">Gestión de cobro</button>`)}
          ${sec("Sobregiros autorizados", "", f.sobregiros.length ? f.sobregiros.map(s => hl(fecha(s.fecha), c(s.monto) + " · " + s.autorizo + " · " + s.motivo)).join("") : '<div class="mut" style="font-size:13px">Ninguno. Cada sobregiro queda con quién lo autorizó y por qué.</div>')}
        </div>`;
    });
  }
  function creditoWire(v) {
    conClienteWire(v); A.wireIr(v);
    const cli = D.cliById[S.cliSel], f = V.FICHA[cli.id];
    $("#limite", v).addEventListener("click", () => openSheet({
      title: "Línea de crédito", sub: cli.nom,
      body: `<div class="field"><label for="lim">Límite</label><input id="lim" class="num" style="text-align:right" value="${grp(cli.limite || 500000)}"></div>
        <div class="field"><label for="pla">Plazo</label><select id="pla">${[0, 1, 15, 30, 45, 60, 90].map(p => `<option value="${p}" ${p === cli.plazo ? "selected" : ""}>${p === 0 ? "Contado" : p === 1 ? "Conta ruta (1 día)" : p + " días"}</option>`).join("")}</select></div>
        ${nota("El cambio de límite queda en la bitácora con el valor anterior y el nuevo, y con quién lo hizo.", "shield")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="limOk">Guardar</button>`,
      after(el) {
        cerrar(el);
        $("#limOk", el).addEventListener("click", () => {
          const antes = cli.limite, nv = Math.round(numIn($("#lim", el).value)), pl = +$("#pla", el).value;
          cli.limite = pl === 0 ? 0 : nv; cli.plazo = pl;
          V.anotar("Cambió límite de crédito", "Cliente " + cli.nom, "Adrián Vindas", S.locId, "Alta", c(antes), c(cli.limite));
          closeSheet(); toast("Línea actualizada", "Quedó en la bitácora.", "ok"); A.refresh();
        });
      }
    }));
    const sg = $("#sobreg", v);
    if (sg) sg.addEventListener("click", () => openSheet({
      title: "Autorizar sobregiro", sub: cli.nom + " · por una sola factura",
      body: `<div class="field"><label for="sgM">Monto</label><input id="sgM" class="num" style="text-align:right" value="${grp(300000)}"></div>
        <div class="field"><label for="sgT">Motivo</label><textarea id="sgT" rows="2"></textarea></div>
        ${nota("Vale para la siguiente factura a crédito de este cliente y se consume al aplicarla, igual que las autorizaciones de margen.", "shield")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="sgOk">Autorizar</button>`,
      after(el) {
        cerrar(el);
        $("#sgOk", el).addEventListener("click", () => {
          const t = $("#sgT", el).value.trim(); if (!t) return toast("Escriba el motivo", "", "cr");
          const m = Math.round(numIn($("#sgM", el).value));
          f.sobregiros.unshift({ fecha: V.ahora(), monto: m, autorizo: "Adrián Vindas", motivo: t });
          V.anotar("Autorizó sobregiro de crédito", cli.nom + " · " + c(m) + " · " + t, "Adrián Vindas", S.locId, "Alta");
          closeSheet(); toast("Sobregiro autorizado", "Vale para una factura.", "ok"); A.refresh();
        });
      }
    }));
  }

  function compras(v) {
    conCliente(v, cli => {
      const docs = D.documentos.filter(d => d.clienteId === cli.id).slice(0, 40);
      const fac = docs.filter(d => d.tipo !== "NC");
      const tot = docs.reduce((s, d) => s + (d.tipo === "NC" ? -d.total : d.total), 0);
      const porFam = {};
      fac.forEach(d => d.lineas.forEach(l => { const a = artOf(l.artId); if (!a) return; porFam[a.fam] = (porFam[a.fam] || 0) + l.cant * l.precio; }));
      const fam = Object.keys(porFam).map(k => ({ n: D.famById[k].nom, v: porFam[k], lab: c(porFam[k]) })).sort((a, b) => b.v - a.v).slice(0, 6);
      const ult = fac[0];
      return `<div class="grid g4">
          ${stat("Comprado", c(tot), { txt: fac.length + " documentos en el periodo" })}
          ${stat("Tiquete promedio", c(fac.length ? tot / fac.length : 0), { txt: "por factura" })}
          ${stat("Última compra", ult ? fecha(ult.fecha) : "—", { txt: ult ? locNom(ult.locId) + " · " + ult.vendedor : "" })}
          ${stat("Proformas abiertas", grp(D.proformas.filter(p => p.clienteId === cli.id && p.estado === "Vigente").length), { txt: "convertibles en factura" })}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);align-items:start">
          ${sec("Documentos", "", table({
        h: "360px", onRow: true,
        cols: [
          { t: "Documento", cls: "mono", fmt: d => esc(d.cons) },
          { t: "Tipo", fmt: d => tag(d.tipo, d.tipo === "NC" ? "wa" : "mu") },
          { t: "Fecha", cls: "mono", fmt: d => fecha(d.fecha) },
          { t: "Local", fmt: d => esc(locNom(d.locId)) },
          { t: "Total", r: true, cls: "mono", fmt: d => `${d.tipo === "NC" ? "−" : ""}${grp(d.total)}` }
        ], rows: docs
      }))}
          ${sec("Qué compra", "por familia", fam.length ? bars(fam) : '<div class="mut">Sin compras.</div>')}
        </div>`;
    });
  }
  function comprasWire(v) {
    conClienteWire(v);
    const docs = D.documentos.filter(d => d.clienteId === S.cliSel).slice(0, 40);
    $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => detalleDoc(docs[+tr.dataset.i])));
  }

  A.workspace("clientes", {
    title: "Clientes",
    sub: () => D.clientes.length + " clientes activos de 78 412 en la base",
    onArg: tab => { if (D.cliById[tab]) S.cliSel = tab; },
    tabs: [
      { id: "ficha", t: "Ficha", sub: "Datos fiscales, contactos, direcciones, autorizados a retirar y categoría", render: ficha, wire: fichaWire },
      {
        id: "credito", t: "Crédito", sub: "Límite, plazo, bloqueo y sobregiros autorizados",
        badge: () => { const n = D.clientes.filter(x => V.bloqueo(x.id) && V.bloqueo(x.id).k === "cr").length; return { n, k: "cr", l: n + " bloqueados" }; },
        render: credito, wire: creditoWire
      },
      { id: "compras", t: "Compras", sub: "Lo que ha comprado y dónde", render: compras, wire: comprasWire }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     7 · PRECIOS, DESCUENTOS Y MÁRGENES — Por categoría de cliente ·
         Volumen y convenios · Márgenes mínimos · Autorizaciones
     ═════════════════════════════════════════════════════════════ */
  const esGerencia = () => S.role !== "cajero";
  function categorias(v) {
    const F = V.FAMV;
    const nCli = k => D.clientes.filter(x => x.categoria === k).length;
    v.innerHTML = `<div class="wrap">
      ${nota("Cada categoría de cliente tiene su porcentaje por familia. La caja lo aplica sola al elegir el cliente y, si el descuento dejaría un artículo bajo el margen mínimo de su familia, lo deja en el tope. Así el precio especial deja de vivir en la cabeza de cada vendedor.", "wallet")}
      ${card({
      title: "Descuento por categoría de cliente y familia", hint: esGerencia() ? "clic en un porcentaje para cambiarlo" : "solo gerencia puede cambiarlos",
      body: `<div class="tscroll"><table class="dt"><thead><tr><th>Categoría</th><th class="r">Clientes</th>${F.map(f => `<th class="r" style="white-space:nowrap" title="${esc(f.nom)} · mínimo ${f.min} %">${esc(f.nom.split(" ")[0])}</th>`).join("")}</tr></thead>
        <tbody>${V.CATEGORIAS.map(k => `<tr><td><b>${esc(k.id)}</b><span class="sub ui">${esc(k.d)}</span></td><td class="r mono">${nCli(k.id)}</td>
          ${F.map(f => {
        const d = V.DESC[k.id][f.id], mg = d ? V.margenFam(f.id, d) : null, tope = mg != null && mg < f.min;
        return `<td class="r">${esGerencia() && k.id !== "Consumidor final"
          ? `<input class="celed num" data-dc="${esc(k.id)}|${f.id}" value="${d || ""}" placeholder="—" style="min-width:44px;width:52px;${tope ? "color:var(--warn);font-weight:650" : ""}" ${tope ? `data-tip="Con ${d} % la familia queda en ${dec(mg)} % de margen: la caja aplica el tope en los artículos que no aguantan"` : ""} aria-label="${esc(k.id)} · ${esc(f.nom)}">`
          : `<span class="num ${d ? "" : "dim"}">${d ? d + " %" : "—"}</span>`}</td>`;
      }).join("")}</tr>`).join("")}</tbody>
        <tfoot><tr><td>Margen mínimo de la familia</td><td></td>${F.map(f => `<td class="r mono">${f.min} %</td>`).join("")}</tr></tfoot></table></div>`
    })}
      <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
        ${card({ title: "En la caja, hoy", body: hl(grp(V.STATS.descAutoHoy), "líneas recibieron el descuento de la categoría sin que nadie lo digitara") + hl(grp(V.STATS.topeHoy), "quedaron en el tope para respetar el margen mínimo") + hl("0", "descuentos manuales por encima de la categoría sin autorización") })}
        ${card({ title: "Clientes por categoría", body: bars(V.CATEGORIAS.map(k => ({ n: k.id, v: nCli(k.id), lab: String(nCli(k.id)) })).filter(x => x.v)) })}
      </div></div>`;
  }
  function categoriasWire(v) {
    $$("[data-dc]", v).forEach(i => {
      i.addEventListener("focus", () => i.select());
      i.addEventListener("keydown", e => { if (e.key === "Enter") i.blur(); });
      i.addEventListener("change", () => {
        const [k, f] = i.dataset.dc.split("|"), antes = V.DESC[k][f], n = Math.max(0, Math.min(40, numIn(i.value)));
        V.DESC[k][f] = n;
        V.anotar("Cambió descuento por categoría", k + " · " + D.famById[f].nom, "Adrián Vindas", S.locId, "Alta", antes + " %", n + " %");
        toast("Descuento actualizado", k + " · " + D.famById[f].nom + ": " + n + " %. Rige desde la siguiente factura.", "ok");
        A.refresh();
      });
    });
  }

  function volumen(v) {
    const ref = x => x.alcance === "art" ? (artOf((D.articulos.find(a => a.cod === x.ref) || {}).id) || {}).desc || x.ref : "Familia " + D.famById[x.ref].nom;
    const porRec = V.CONVENIOS.reduce((s, x) => s + x.porRecuperar, 0);
    v.innerHTML = `<div class="wrap">
      ${card({
      title: "Descuento por volumen", hint: "se aplica solo cuando la línea llega a la cantidad",
      actions: esGerencia() ? `<button class="btn sm" id="volNuevo">${icon("plus")}Regla</button>` : "",
      body: table({
        cols: [
          { t: "Aplica a", fmt: x => `<b>${esc(ref(x))}</b><span class="sub ui">${esc(x.nota)}</span>` },
          { t: "Desde", r: true, cls: "mono", fmt: x => grp(x.desde) + " unid." },
          { t: "Descuento", r: true, cls: "mono", fmt: x => `<b>${x.desc} %</b>` },
          { t: "Respeta el mínimo", fmt: () => tag("Con tope por margen", "ok", "shield") }
        ], rows: V.VOLUMEN
      })
    })}
      <div class="grid g4">
        ${stat("Convenios vigentes", grp(V.CONVENIOS.length), { txt: "el proveedor reconoce el diferencial" })}
        ${stat("Por recuperar del proveedor", c(porRec), { txt: "de lo ya vendido con convenio" }, "var(--warn)")}
        ${stat("Unidades vendidas con convenio", grp(V.CONVENIOS.reduce((s, x) => s + x.vendido, 0)), { txt: "en el periodo de cada convenio" })}
        ${stat("Margen real con el reconocimiento", "22,6 %", { txt: "no se castiga el margen del local" }, "var(--ok)")}
      </div>
      ${card({
      title: "Convenios con proveedores", hint: "vender bajo el margen porque el proveedor lo reconoce",
      body: table({
        cols: [
          { t: "Proveedor", fmt: x => `<b>${esc(x.prov)}</b><span class="sub ui">${esc(x.alcance)}</span>` },
          { t: "Reconoce", r: true, cls: "mono", fmt: x => x.reconoce + " %" },
          { t: "Cómo", fmt: x => `<span class="mut" style="font-size:12.5px">${esc(x.como)}</span>` },
          { t: "Vigencia", cls: "mono", fmt: x => fecha(x.desde) + " – " + fecha(x.hasta) },
          { t: "Vendido", r: true, cls: "mono", fmt: x => grp(x.vendido) },
          { t: "Por recuperar", r: true, cls: "mono", fmt: x => `<b style="color:var(--warn)">${grp(x.porRecuperar)}</b>` }
        ], rows: V.CONVENIOS
      }) + `<div style="padding:12px 16px;border-top:1px solid var(--hair-2)">${nota("La venta con convenio no pide autorización de margen: el sistema sabe que el diferencial lo paga el proveedor y lo deja como cuenta por cobrar a su nombre hasta que llega la nota de crédito.", "scale")}</div>`
    })}</div>`;
  }
  function volumenWire(v) {
    const b = $("#volNuevo", v);
    if (b) b.addEventListener("click", () => openSheet({
      title: "Regla de descuento por volumen",
      body: `<div class="field"><label>Aplica a</label><select id="vAl">${D.familias.filter(f => !f.servicio).map(f => `<option value="fam:${f.id}">Familia ${esc(f.nom)}</option>`).join("")}${D.articulos.filter(a => a.tipo === "Producto").slice(0, 30).map(a => `<option value="art:${a.cod}">${esc(a.desc)}</option>`).join("")}</select></div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px"><div class="field"><label>Desde (unidades)</label><input id="vDe" class="num" value="100"></div><div class="field"><label>Descuento %</label><input id="vPc" class="num" value="5"></div></div>
        <div class="field"><label>Nota</label><input id="vNo" placeholder="Por ejemplo: por caja completa"></div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="vOk">Guardar</button>`,
      after(el) {
        cerrar(el);
        $("#vOk", el).addEventListener("click", () => {
          const [al, ref] = $("#vAl", el).value.split(":");
          V.VOLUMEN.push({ id: "V" + (V.VOLUMEN.length + 1), alcance: al, ref, desde: Math.round(numIn($("#vDe", el).value)), desc: numIn($("#vPc", el).value), nota: $("#vNo", el).value || "" });
          V.anotar("Creó regla de descuento por volumen", ref, "Adrián Vindas", S.locId, "Media");
          closeSheet(); toast("Regla creada", "La caja la aplica desde la siguiente línea que llegue a la cantidad.", "ok"); A.refresh();
        });
      }
    }));
  }

  function margenes(v) {
    const real = {}; D.margenPorFamilia().forEach(x => { real[x.fam.id] = x.margen; });
    const roles = Object.keys(V.VE_COSTO);
    v.innerHTML = `<div class="wrap">
      ${card({
      title: "Margen mínimo por familia", hint: "bajo este piso la caja bloquea y pide autorización",
      body: table({
        cols: [
          { t: "Familia", fmt: f => `<b>${esc(f.nom)}</b>` },
          { t: "Mínimo", r: true, fmt: f => (esGerencia() ? `<input class="celed num" data-min="${f.id}" value="${f.min}" style="width:56px;min-width:56px" aria-label="Mínimo de ${esc(f.nom)}"> %` : `<span class="num">${f.min} %</span>`) },
          { t: "Margen real del mes", r: true, cls: "mono", fmt: f => real[f.id] != null ? `<span style="color:${real[f.id] < f.min ? "var(--crit)" : "var(--ok)"};font-weight:650">${dec(real[f.id])} %</span>` : '<span class="dim">—</span>' },
          { t: "Líneas bajo el mínimo", r: true, cls: "mono", fmt: f => { const b = V.bajoMinimo(f.id); return b.n ? `<b style="color:var(--crit)">${b.n}</b>` : '<span class="dim">0</span>'; } },
          { t: "Utilidad cedida", r: true, cls: "mono", fmt: f => { const b = V.bajoMinimo(f.id); return b.cedido ? grp(b.cedido) : '<span class="dim">—</span>'; } }
        ], rows: V.FAMV
      })
    })}
      <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
        ${card({
      title: "Quién ve el costo", hint: "al vendedor se le dice cuánto vender, no cuánto costó",
      body: roles.map(r => prefRow(r, V.VE_COSTO[r] ? "Ve costo y margen en la caja y en el catálogo" : "Ve el precio de venta; el costo no aparece en ninguna pantalla ni reporte", swtch(null, V.VE_COSTO[r], `data-costo="${esc(r)}" ${esGerencia() ? "" : "disabled"}`))).join("")
    })}
        <div style="display:flex;flex-direction:column;gap:14px">
          ${card({
      title: "Ventas de utilidad mínima", hint: "para no distorsionar el resultado del local",
      body: `<div style="margin-bottom:12px">${seg("lcont", [{ v: "marca", t: "Marca en la factura" }, { v: "sadic", t: "Local contable (SADIC)" }], V.PARAM.localContable)}</div>
        <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">${V.PARAM.localContable === "marca"
          ? "La factura se queda en el local que la hizo, pero lleva una marca. Los informes por local la pueden excluir o mostrar aparte sin mover el documento."
          : "Como hoy: la venta de utilidad mínima se registra en un local contable especial (SADIC) que absorbe su resultado."}</div>
        <div style="margin-top:10px">${nota("Pendiente de validar con Santa Rosa si se conserva el local contable o se reemplaza por la marca.", "info")}</div>`
    })}
          ${card({ title: "Cambios recientes del mínimo", body: V.MIN_HIST.length ? V.MIN_HIST.slice(0, 6).map(x => hl(fecha(x.fecha), D.famById[x.fam].nom + ": " + x.antes + " % → " + x.despues + " % · " + x.usuario)).join("") : hl(fecha(V.dia(9)), "Techos: 20 % → 18 % · Adrián Vindas") })}
        </div>
      </div></div>`;
  }
  function margenesWire(v) {
    $$("[data-min]", v).forEach(i => {
      i.addEventListener("focus", () => i.select());
      i.addEventListener("keydown", e => { if (e.key === "Enter") i.blur(); });
      i.addEventListener("change", () => { const n = Math.max(0, Math.min(80, numIn(i.value))); V.cambiarMinimo(i.dataset.min, n); toast("Mínimo actualizado", D.famById[i.dataset.min].nom + ": " + n + " %. Quedó en la bitácora.", "ok"); A.refresh(); });
    });
    $$("[data-costo]", v).forEach(b => b.addEventListener("click", () => {
      if (b.disabled) return;
      const r = b.dataset.costo; V.VE_COSTO[r] = !V.VE_COSTO[r];
      V.anotar("Cambió visibilidad del costo", r, "Adrián Vindas", S.locId, "Alta", V.VE_COSTO[r] ? "Oculto" : "Visible", V.VE_COSTO[r] ? "Visible" : "Oculto");
      A.refresh();
    }));
    onSeg(v, "lcont", x => { V.PARAM.localContable = x; A.refresh(); });
  }

  const estAut = x => ({ Pendiente: tag("Pendiente", "wa", "clock"), Autorizada: tag("Autorizada · sin usar", "ac", "shield"), Consumida: tag("Consumida en factura", "ok", "check"), Rechazada: tag("Rechazada", "cr", "x"), Revertida: tag("Cerrada por el barrido", "mu", "history") }[x.estado] || tag(x.estado, "mu"));
  function autorizaciones(v) {
    const L = V.autorizaciones();
    const sem = L.filter(x => V.diasEntre(x.fecha, D.HOY) <= 7);
    v.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Pendientes", grp(L.filter(x => x.estado === "Pendiente").length), { txt: "esperan a quien puede autorizar" }, "var(--warn)")}
        ${stat("Consumidas esta semana", grp(sem.filter(x => x.estado === "Consumida").length), { txt: "cada una en una sola factura" }, "var(--ok)")}
        ${stat("Utilidad cedida", c(sem.reduce((s, x) => s + (x.estado === "Consumida" ? x.cedido : 0), 0)), { txt: "lo que costó autorizar esta semana" })}
        ${stat("Abiertas tras el barrido", grp(V.BARRIDO.abiertas), { txt: "ninguna casilla queda activa" }, "var(--ok)")}
      </div>
      <div class="stepbar"><div class="sbt"><b>${icon("history")} Barrido de anoche a las ${V.PARAM.barrido}: ${V.BARRIDO.terminales} cajas revisadas, 0 autorizaciones abiertas</b>
        <span>La autorización es de un solo uso: se consume al aplicar la factura. Si la factura no se aplica, el barrido del cierre la desactiva. Esta semana cerró ${V.BARRIDO.revertidasSemana}.</span></div></div>
      ${card({
      title: "Autorizaciones de venta bajo el margen", hint: "quién pidió, quién autorizó, en qué factura se usó",
      body: table({
        onRow: true, h: "calc(100dvh - 470px)",
        cols: [
          { t: "Cuándo", cls: "mono", fmt: x => fh(x.fecha) },
          { t: "Artículo", fmt: x => `${esc(x.a ? x.a.desc : x.detalle || "—")}<span class="sub ui">${esc(locNom(x.locId))} · caja ${x.term}${x.cli ? " · " + esc(cliNom(x.cli)) : ""}</span>` },
          { t: "Margen", r: true, cls: "mono", fmt: x => `<b style="color:var(--crit)">${dec(x.margen)} %</b><span class="sub">mín. ${x.min} %</span>` },
          { t: "Pidió", fmt: x => esc(x.solicita) },
          { t: "Autorizó", fmt: x => (x.autoriza ? esc(x.autoriza) : '<span class="dim">—</span>') },
          { t: "Estado", fmt: estAut },
          { t: "", r: true, fmt: x => (x.estado === "Pendiente" && esGerencia() ? `<button class="btn sm pri" data-aut="ok:${x.id}">Autorizar</button> <button class="btn sm" data-aut="no:${x.id}">Rechazar</button>` : "") }
        ], rows: L, rowCls: x => (x.estado === "Pendiente" ? "wa" : "")
      })
    })}</div>`;
    v._L = L;
  }
  function autorizacionesWire(v) {
    const p = $("#tp-ven-precios", v);
    $$("[data-aut]", p).forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const [acc, id] = b.dataset.aut.split(":");
      if (acc === "ok") { V.resolver(id, true, "Adrián Vindas"); toast("Autorizada", "Se avisó a la caja por la terminal. Vale para esa línea y esa factura.", "ok"); return A.refresh(); }
      openSheet({
        title: "Rechazar autorización", body: `<div class="field"><label for="rjT">Por qué</label><textarea id="rjT" rows="2" placeholder="Lo lee el vendedor en la caja"></textarea></div>`,
        footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="rjOk">Rechazar</button>`,
        after(el) { cerrar(el); $("#rjOk", el).addEventListener("click", () => { V.resolver(id, false, "Adrián Vindas", $("#rjT", el).value.trim()); closeSheet(); toast("Rechazada", "El vendedor lo ve en la caja.", "in"); A.refresh(); }); }
      });
    }));
    $$("tr.clickable", p).forEach(tr => tr.addEventListener("click", () => {
      const x = p._L[+tr.dataset.i];
      const paso = (ok, t, d) => `<div style="display:flex;gap:11px;padding:8px 0"><span style="width:22px;height:22px;border-radius:50%;flex:none;display:grid;place-items:center;background:${ok ? "var(--accent-soft)" : "var(--surface-3)"};color:${ok ? "var(--accent)" : "var(--ink-4)"}">${icon(ok ? "check" : "clock", 'style="width:13px;height:13px"')}</span><div><b style="font-size:13.5px">${esc(t)}</b><div class="mut" style="font-size:12.5px">${d}</div></div></div>`;
      openSheet({
        title: "Autorización de margen", sub: (x.a ? x.a.desc : x.detalle || "") + " · " + locNom(x.locId),
        body: `${paso(true, "Solicitó " + x.solicita, fh(x.fecha) + " · caja " + x.term + " · margen " + dec(x.margen) + " % contra " + x.min + " %<br>«" + esc(x.motivo) + "»")}
          ${paso(true, "Se notificó a quien puede autorizar", "Adrián Vindas por WhatsApp · Marta Rojas por correo")}
          ${paso(!!x.autoriza || x.estado === "Rechazada", x.estado === "Rechazada" ? "Rechazada" : x.autoriza ? "Autorizó " + x.autoriza : "Esperando respuesta", x.rechazo ? esc(x.rechazo) : x.autoriza ? "con su usuario, no con una casilla compartida" : "")}
          ${paso(x.estado === "Consumida" || x.estado === "Revertida", x.estado === "Consumida" ? "Se consumió en la factura " + x.factura : x.estado === "Revertida" ? "Se cerró sola" : "Se consume al aplicar la factura", x.reversion ? esc(x.reversion) : x.cedido ? "Utilidad cedida: " + c(x.cedido) : "")}`,
        footer: `<button class="btn" data-cerrar>Cerrar</button>`, after: cerrar
      });
    }));
  }

  A.workspace("ven-precios", {
    title: "Precios, descuentos y márgenes",
    tabs: [
      { id: "categorias", t: "Por categoría de cliente", sub: "Maestro de obra, ingeniero, fontanero, electricista, ebanista… con su porcentaje por familia", render: categorias, wire: categoriasWire },
      { id: "volumen", t: "Volumen y convenios", sub: "Por cantidad, y lo que el proveedor reconoce", render: volumen, wire: volumenWire },
      { id: "margenes", t: "Márgenes mínimos", sub: "El piso por familia, quién ve el costo y el tratamiento de la utilidad mínima", render: margenes, wire: margenesWire },
      {
        id: "autorizaciones", t: "Autorizaciones", sub: "Venta bajo el margen: de un solo uso y con nombre",
        badge: () => { const n = V.AUT.filter(x => x.estado === "Pendiente").length; return { n, k: "wa", l: n + " pendientes" }; },
        render: autorizaciones, wire: autorizacionesWire
      }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     8 · VENDEDORES Y COMISIONES — Desempeño · Metas y comisiones ·
         Clave en mostrador
     ═════════════════════════════════════════════════════════════ */
  function desempeno(v) {
    const R = V.desempeno().sort((a, b) => b.venta - a.venta);
    const tot = R.reduce((s, x) => s + x.venta, 0);
    v.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Venta del mes", c(tot), { txt: R.length + " vendedores" })}
        ${stat("Mejor margen", dec(Math.max.apply(null, R.map(x => x.margen))) + " %", { txt: R.slice().sort((a, b) => b.margen - a.margen)[0].v }, "var(--ok)")}
        ${stat("Descuento promedio", dec(R.reduce((s, x) => s + x.descPct, 0) / R.length) + " %", { txt: "sobre el precio de lista" })}
        ${stat("Cumplen la meta", R.filter(x => x.venta >= x.meta).length + " de " + R.length, { txt: "al día " + D.HOY.getDate() + " del mes" })}
      </div>
      ${card({
      title: "Desempeño por vendedor", hint: "cada factura queda a nombre de quien vendió",
      body: table({
        cols: [
          { t: "Vendedor", fmt: x => `<b>${esc(x.v)}</b><span class="sub ui">${esc(locNom(x.locId))}</span>` },
          { t: "Documentos", r: true, cls: "mono", fmt: x => grp(x.n) },
          { t: "Venta", r: true, cls: "mono", fmt: x => `<b>${grp(x.venta)}</b>` },
          { t: "Margen", r: true, cls: "mono", fmt: x => `<span style="color:${x.margen < 18 ? "var(--crit)" : "var(--ink)"}">${dec(x.margen)} %</span>` },
          { t: "Tiquete", r: true, cls: "mono", fmt: x => grp(x.ticket) },
          { t: "Desc. prom.", r: true, cls: "mono", fmt: x => dec(x.descPct) + " %" },
          { t: "Pidió autorización", r: true, cls: "mono", fmt: x => (x.aut ? grp(x.aut) : '<span class="dim">0</span>') },
          { t: "Meta", fmt: x => `<div style="min-width:130px">${prog([{ w: Math.min(100, (x.venta / x.meta) * 100), col: x.venta >= x.meta ? "var(--ok)" : "var(--accent)" }])}<div class="num" style="font-size:11.5px;color:var(--ink-3)">${dec((x.venta / x.meta) * 100, 0)} % de ${c(x.meta)}</div></div>` }
        ], rows: R
      })
    })}
      ${card({ title: "Venta comparada", hint: "mes en curso", body: bars(R.map(x => ({ n: x.v, v: x.venta, lab: c(x.venta) }))) })}</div>`;
  }

  function comisiones(v) {
    const R = V.desempeno();
    v.innerHTML = `<div class="wrap">
      ${nota("La comisión se calcula sola sobre cada factura, con las reglas de abajo. Antes existía el panel pero nunca se configuró; aquí queda armado con valores de ejemplo para definirlos con Santa Rosa.", "calc")}
      <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);align-items:start">
        <div style="display:flex;flex-direction:column;gap:14px">
          ${card({
      title: "Reglas",
      body: prefRow("Solo sobre lo cobrado", "Una factura a crédito comisiona cuando el cliente paga", swtch(null, V.REGLAS.soloCobrado, 'data-regla="soloCobrado"'))
        + prefRow("No comisiona líneas bajo el margen", "Aunque estén autorizadas: vender bajo el mínimo no premia", swtch(null, V.REGLAS.sinBajoMargen, 'data-regla="sinBajoMargen"'))
        + prefRow("Bono al cumplir la meta", "Se suma un " + V.REGLAS.bonoMeta + " % a la comisión del mes", swtch(null, V.REGLAS.bonoMeta > 0, 'data-regla="bonoMeta"'))
    })}
          ${card({
      title: "Porcentaje por familia", hint: "clic para cambiar",
      body: table({ cols: [{ t: "Familia", fmt: f => esc(f.nom) }, { t: "Comisión", r: true, fmt: f => `<input class="celed num" data-com="${f.id}" value="${dec(V.COMISION[f.id] || 0)}" style="width:60px;min-width:60px"> %` }], rows: V.FAMV })
    })}
        </div>
        ${card({
      title: "Metas y comisión del mes", hint: "la meta se edita en la fila",
      body: table({
        cols: [
          { t: "Vendedor", fmt: x => `<b>${esc(x.v)}</b><span class="sub ui">${esc(locNom(x.locId))}</span>` },
          { t: "Meta", r: true, fmt: x => `<input class="celed num" data-meta="${esc(x.v)}" value="${grp(x.meta)}" style="width:110px">` },
          { t: "Vendido", r: true, cls: "mono", fmt: x => grp(x.venta) },
          { t: "Avance", r: true, cls: "mono", fmt: x => `<span style="color:${x.venta >= x.meta ? "var(--ok)" : "var(--ink)"}">${dec((x.venta / x.meta) * 100, 0)} %</span>` },
          { t: "Comisión", r: true, cls: "mono", fmt: x => `<b>${grp(x.comision)}</b>${x.bono ? `<span class="sub">incluye bono ${grp(x.bono)}</span>` : ""}` }
        ], rows: R, foot: [{ v: "Total", span: 4 }, { v: grp(R.reduce((s, x) => s + x.comision, 0)), r: true, cls: "mono" }]
      })
    })}
      </div></div>`;
  }
  const METAS = {};
  function comisionesWire(v) {
    $$("[data-regla]", v).forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.regla;
      V.REGLAS[k] = k === "bonoMeta" ? (V.REGLAS.bonoMeta ? 0 : 10) : !V.REGLAS[k];
      V.anotar("Cambió regla de comisión", k, "Adrián Vindas", S.locId, "Media");
      A.refresh();
    }));
    $$("[data-com]", v).forEach(i => {
      i.addEventListener("focus", () => i.select());
      i.addEventListener("keydown", e => { if (e.key === "Enter") i.blur(); });
      i.addEventListener("change", () => { V.COMISION[i.dataset.com] = Math.max(0, Math.min(10, numIn(i.value))); A.refresh(); });
    });
    $$("[data-meta]", v).forEach(i => {
      i.addEventListener("focus", () => i.select());
      i.addEventListener("keydown", e => { if (e.key === "Enter") i.blur(); });
      i.addEventListener("change", () => { METAS[i.dataset.meta] = Math.round(numIn(i.value)); toast("Meta actualizada", i.dataset.meta + ": " + c(METAS[i.dataset.meta]) + ".", "ok"); A.refresh(); });
    });
  }
  /* las metas editadas pisan las calculadas */
  const _des = V.desempeno;
  V.desempeno = () => _des().map(x => (METAS[x.v] ? Object.assign(x, { meta: METAS[x.v], comision: x.comision - x.bono + (x.venta >= METAS[x.v] ? Math.round((x.comision - x.bono) * V.REGLAS.bonoMeta / 100) : 0) }) : x));

  function mostrador(v) {
    v.innerHTML = `<div class="wrap">
      ${nota("En un mostrador compartido cualquiera podía elegir a cualquier vendedor. Ahora, al cambiar de vendedor en la caja, se pide la clave de quien toma el mostrador; así cada factura, cada descuento y cada comisión quedan a nombre de la persona correcta.", "lock")}
      <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
        ${card({
      title: "Exigir clave por local",
      body: D.tiendas.map(l => prefRow(l.nom, (V.MOSTRADOR[l.id].compartido ? l.terminales + " cajas · mostrador compartido" : "Una sola caja") + (V.MOSTRADOR[l.id].clave ? " · pide clave al cambiar de vendedor" : " · no pide clave"), swtch(null, V.MOSTRADOR[l.id].clave, `data-mos="${l.id}"`))).join("")
    })}
        <div style="display:flex;flex-direction:column;gap:14px">
          ${card({
      title: "Vendedores con clave registrada", hint: Object.values(V.PIN).filter(Boolean).length + " de " + D.VENDEDORES.length,
      body: `<div style="display:flex;flex-wrap:wrap;gap:6px">${D.VENDEDORES.map(x => V.PIN[x] ? tag(x, "ok", "check") : `<button class="btn sm" data-pin="${esc(x)}">${icon("lock")}${esc(x)} · registrar clave</button>`).join("")}</div>`
    })}
          ${card({
      title: "Cambios de vendedor en caja", hint: "últimos",
      body: table({
        cols: [
          { t: "Cuándo", cls: "mono", fmt: x => fh(x.fecha) },
          { t: "Caja", fmt: x => esc(locNom(x.locId)) + " " + x.term },
          { t: "Cambio", fmt: x => esc(x.de) + " → <b>" + esc(x.a) + "</b>" + (x.nota ? `<span class="sub ui">${esc(x.nota)}</span>` : "") },
          { t: "Clave", fmt: x => (x.clave ? tag("Con clave", "ok", "check") : tag("Sin clave", "wa", "alert")) }
        ], rows: V.CAMBIOS_VEND
      })
    })}
        </div>
      </div></div>`;
  }
  function mostradorWire(v) {
    $$("[data-mos]", v).forEach(b => b.addEventListener("click", () => {
      const m = V.MOSTRADOR[b.dataset.mos]; m.clave = !m.clave;
      V.anotar("Cambió exigencia de clave en mostrador", locNom(b.dataset.mos), "Andrey Ramírez", b.dataset.mos, "Media", m.clave ? "No" : "Sí", m.clave ? "Sí" : "No");
      A.refresh();
    }));
    $$("[data-pin]", v).forEach(b => b.addEventListener("click", () => openSheet({
      title: "Registrar clave de vendedor", sub: b.dataset.pin,
      body: `<div class="field"><label for="pin1">Clave de 4 a 6 dígitos</label><input id="pin1" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></div>
        ${nota("La escribe el propio vendedor. Nadie más la ve: ni el administrador ni TI.", "lock")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="pinOk">Guardar</button>`,
      after(el) {
        cerrar(el);
        $("#pinOk", el).addEventListener("click", () => {
          if (!/^\d{4,6}$/.test($("#pin1", el).value)) return toast("La clave debe tener de 4 a 6 dígitos", "", "cr");
          V.PIN[b.dataset.pin] = true; V.anotar("Registró clave de vendedor", b.dataset.pin, b.dataset.pin, S.locId, "Baja");
          closeSheet(); toast("Clave registrada", "", "ok"); A.refresh();
        });
      }
    })));
  }

  A.workspace("ven-vendedores", {
    title: "Vendedores y comisiones",
    tabs: [
      { id: "desempeno", t: "Desempeño", sub: "Venta, margen, descuento y meta de cada vendedor en el mes", render: desempeno },
      { id: "comisiones", t: "Metas y comisiones", sub: "Por vendedor y por familia, calculadas solas", render: comisiones, wire: comisionesWire },
      {
        id: "mostrador", t: "Clave en mostrador", sub: "Cada factura a nombre de quien vendió",
        badge: () => { const n = Object.values(V.PIN).filter(x => !x).length; return { n, k: "wa", l: n + " sin clave" }; },
        render: mostrador, wire: mostradorWire
      }
    ]
  });
  /* ═════════════════════════════════════════════════════════════
     9 · SUGERENCIA DE PRODUCTOS RELACIONADOS (VEN-016) — En la caja ·
         Reglas · Aprendidas de las ventas. La sugerencia vive en la
         caja; aquí se decide qué se sugiere y se ve si sirve.
     ═════════════════════════════════════════════════════════════ */
  const artCod = cod => D.articulos.find(a => a.cod === cod);
  const cantTxt = x => (x.fijo ? x.fijo + (x.fijo > 1 ? " fijos" : " fijo") : x.por >= 1 ? dec(x.por, x.por % 1 ? 1 : 0) + " por unidad" : "1 cada " + Math.round(1 / x.por));
  const todosSug = () => V.REGLAS_REL.reduce((k, r) => k.concat(r.sugeridos.map(x => Object.assign({ r }, x, { ref: x }))), []);
  function enCaja(v) {
    const R = V.REL_VEND, ses = V.REL_SES;
    const most = R.reduce((k, x) => k + x.mostradas, 0) + ses.mostradas, acep = R.reduce((k, x) => k + x.aceptadas, 0) + ses.aceptadas;
    const venta = R.reduce((k, x) => k + x.venta, 0) + ses.venta;
    const top = todosSug().filter(x => x.aceptadas).sort((a, b) => b.aceptadas - a.aceptadas).slice(0, 7);
    /* ejemplo vivo con una factura de techo, para enseñar cómo se ve */
    const ej = V.relacionados([{ artId: artCod("FER-03771").id, cant: 28 }], { artId: artCod("FER-03771").id, cant: 28 }, true);
    v.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Sugerencias mostradas", grp(most), { txt: "en el mes, en las siete tiendas" })}
        ${stat("Aceptadas", dec((acep / most) * 100) + " %", { txt: grp(acep) + " veces se agregó el complemento" }, "var(--ok)")}
        ${stat("Venta adicional", c(venta), { txt: "lo que se vendió gracias a la sugerencia" }, "var(--ok)")}
        ${stat("Tiquete con sugerencia", "+4,1 %", { txt: "contra facturas sin complemento aceptado", dir: "up" })}
      </div>
      <div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start">
        ${card({
      title: "Por vendedor", hint: "el nuevo acepta más: el experto ya lo sabía de memoria",
      body: table({
        cols: [
          { t: "Vendedor", fmt: x => `<b>${esc(x.v)}</b><span class="sub ui">${esc(x.antig)} en la empresa</span>` },
          { t: "Mostradas", r: true, cls: "mono", fmt: x => grp(x.mostradas) },
          { t: "Aceptadas", r: true, cls: "mono", fmt: x => grp(x.aceptadas) },
          { t: "Tasa", fmt: x => `<div style="min-width:120px">${prog([{ w: (x.aceptadas / x.mostradas) * 100 * 2, col: "var(--accent)" }])}<div class="num" style="font-size:11.5px;color:var(--ink-3)">${dec((x.aceptadas / x.mostradas) * 100)} %</div></div>` },
          { t: "Venta adicional", r: true, cls: "mono", fmt: x => `<b>${grp(x.venta)}</b>` }
        ], rows: R
      })
    })}
        <div style="display:flex;flex-direction:column;gap:14px">
          ${card({
      title: "Así se ve en la caja", hint: "al agregar 28 láminas",
      body: `<div style="display:flex;flex-direction:column;gap:7px">${ej.items.map((x, i) => `<div class="sug" style="cursor:default"><kbd>${i + 1}</kbd><span class="sugt"><b>${esc(x.a.desc)}</b><span>${esc(x.motivo)}</span></span><span class="sugq"><b class="num">${grp(x.cant)} ${esc(x.a.unidad)}</b><span class="num">${c(x.a.precio * x.cant)}</span></span></div>`).join("")}</div>
        <div class="mut" style="font-size:12px;margin-top:9px">Aparece debajo de la factura en curso, no interrumpe: se agrega con un clic o con Alt 1–6 sin soltar el teclado.</div>`
    })}
          ${card({ title: "Lo que más se acepta", body: bars(top.map(x => ({ n: artCod(x.cod).desc.split(" × ")[0].replace(/ c\/empaque.*/, "") + " con " + artCod(x.r.si).desc.split(" ").slice(0, 2).join(" ").toLowerCase(), v: x.aceptadas, lab: dec((x.aceptadas / Math.max(1, x.mostradas)) * 100, 0) + " %" }))) })}
        </div>
      </div></div>`;
  }

  /* buscador de artículos para el panel: filtra al escribir, nunca un combo
     (en producción son más de 15 000 artículos) */
  const marcaQ = (text, q) => {
    const t = norm(q).split(/\s+/).filter(Boolean), n = norm(text), hits = [];
    t.forEach(x => { const i = n.indexOf(x); if (i > -1) hits.push([i, i + x.length]); });
    hits.sort((a, b) => a[0] - b[0]);
    let out = "", cur = 0;
    hits.forEach(([a, b]) => { if (a < cur) return; out += esc(text.slice(cur, a)) + "<mark>" + esc(text.slice(a, b)) + "</mark>"; cur = b; });
    return out + esc(text.slice(cur));
  };
  function buscaArt(q, excluir) {
    const t = norm(q).split(/\s+/).filter(Boolean);
    const todos = D.articulos.filter(a => a.precio > 0 && excluir.indexOf(a.cod) < 0 && t.every(x => norm(a.cod + " " + a.desc + " " + a.marca + " " + (a.ean || "")).includes(x)));
    return { lista: todos.slice(0, 8), total: todos.length };
  }
  const acHtml = (id, ph) => `<div id="${id}"><div class="tb-search" style="width:100%;padding:9px 12px">${icon("search")}<input placeholder="${esc(ph)}" autocomplete="off" aria-label="${esc(ph)}"></div><div class="acres"></div></div>`;
  function buscador(root, id, onPick, excluir) {
    const w8 = $("#" + id, root); if (!w8) return;
    const inp = $("input", w8), box = $(".acres", w8);
    let i = 0, res = [];
    const caja = on => { box.style.cssText = on ? "margin-top:6px;border:1px solid var(--hair);border-radius:11px;padding:4px;background:var(--surface);box-shadow:var(--shadow-lg)" : ""; };
    const hint = t => `<div style="font-size:12px;color:var(--ink-3);padding:8px 10px">${t}</div>`;
    const elegir = k => { const a = res[k]; if (!a) return; inp.value = ""; box.innerHTML = ""; caja(false); res = []; onPick(a); };
    function pinta() {
      const q = inp.value.trim();
      if (q.length < 2) { res = []; box.innerHTML = q ? hint("Escriba al menos 2 letras del código, el nombre o la marca") : ""; caja(!!q); return; }
      const r = buscaArt(q, excluir()); res = r.lista; i = Math.min(i, Math.max(0, res.length - 1));
      box.innerHTML = res.length
        ? res.map((a, k) => `<button type="button" class="rec" data-k="${k}" aria-selected="${k === i}" style="width:100%;text-align:left;padding:8px 10px">
            <span style="flex:1;min-width:0"><b style="font-size:13.5px">${marcaQ(a.desc, q)}</b><span class="mut" style="display:block;font-size:12px">${marcaQ(a.cod, q)} · ${esc(a.marca)} · ${esc(a.unidad)}</span></span>
            <span class="num" style="font-weight:600;font-size:13px">${c(a.precio)}</span></button>`).join("")
          + (r.total > res.length ? hint(res.length + " de " + grp(r.total) + " coincidencias · siga escribiendo para acotar") : "")
        : hint("Ningún artículo coincide con «" + esc(q) + "»");
      caja(true);
      $$("[data-k]", box).forEach(b => { b.addEventListener("mousedown", e => e.preventDefault()); b.addEventListener("click", () => elegir(+b.dataset.k)); });
    }
    inp.addEventListener("input", () => { i = 0; pinta(); });
    inp.addEventListener("keydown", e => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); if (!res.length) return;
        i = (i + (e.key === "ArrowDown" ? 1 : -1) + res.length) % res.length;
        $$("[data-k]", box).forEach((b, k) => b.setAttribute("aria-selected", k === i));
      } else if (e.key === "Enter") { e.preventDefault(); elegir(i); }
      else if (e.key === "Escape" && inp.value) { e.preventDefault(); e.stopPropagation(); inp.value = ""; box.innerHTML = ""; caja(false); res = []; }
    });
    return inp;
  }

  /* panel de la regla: un artículo que dispara y hasta 6 sugeridos en orden */
  function panelRegla(r) {
    const dr = r ? { id: r.id, si: r.si, activa: r.activa, sugeridos: r.sugeridos.map(x => ({ cod: x.cod, modo: x.fijo ? "fijo" : "por", val: x.fijo || x.por || 1, nota: x.nota, origen: x.origen, mostradas: x.mostradas, aceptadas: x.aceptadas })) }
      : { id: null, si: null, activa: true, sugeridos: [] };
    const puede = esGerencia();
    const valTxt = v => String(+(+v).toFixed(4)).replace(".", ",");
    openSheet({
      wide: true, title: r ? "Regla de " + artCod(r.si).desc : "Nueva regla de productos relacionados",
      sub: r ? "Modificada por " + r.autor + " · " + fecha(r.cambio) : "Un artículo y hasta " + V.MAX_SUG + " sugeridos, en el orden en que salen en la caja",
      body: `<div id="rrBody"></div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div>${puede ? `<button class="btn pri" id="rrOk">${icon("check")}Guardar regla</button>` : ""}`,
      after(el) {
        cerrar(el);
        const body = $("#rrBody", el);
        const usados = () => [dr.si].concat(dr.sugeridos.map(x => x.cod)).filter(Boolean);
        function pintar(foco) {
          const a = dr.si ? artCod(dr.si) : null;
          body.innerHTML = `
            <div style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-4);margin-bottom:8px">Cuando se vende</div>
            ${a ? `<div class="rec" style="border:1px solid var(--hair);border-radius:11px;padding:10px 12px;margin-bottom:18px">
                <span class="mit" style="width:36px;height:36px">${icon(a.tipo === "Servicio" ? "wrench" : "box")}</span>
                <span style="flex:1;min-width:0"><b>${esc(a.desc)}</b><span class="mut" style="display:block;font-size:12px">${esc(a.cod)} · ${esc(a.marca)} · se vende por ${esc(a.unidad)}</span></span>
                ${puede && !dr.id ? `<button class="btn sm" id="rrCambiar">Cambiar</button>` : ""}</div>`
            : `<div style="margin-bottom:18px">${acHtml("acSi", "Escriba el código, el nombre o la marca del artículo")}</div>`}
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">
              <span style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-4)">Sugerir</span>
              <span class="mut" style="font-size:12px">${dr.sugeridos.length} de ${V.MAX_SUG} · el primero sale como Alt 1 en la caja</span></div>
            <div style="display:flex;flex-direction:column;gap:8px">${dr.sugeridos.map((x, k) => {
              const b = artCod(x.cod);
              return `<div style="border:1px solid var(--hair);border-radius:11px;padding:10px 12px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px 12px;align-items:center">
                <kbd>${k + 1}</kbd>
                <span style="min-width:0"><b style="font-size:13.5px">${esc(b.desc)}</b><span class="mut" style="display:block;font-size:12px">${esc(b.cod)} · ${esc(b.unidad)}${x.origen === "Aprendida" ? " · aprendida de las ventas" : ""}${x.mostradas ? " · aceptada " + dec((x.aceptadas / x.mostradas) * 100, 0) + " % de " + grp(x.mostradas) + " veces" : ""}</span></span>
                <span style="display:flex;gap:4px">${puede ? `<button type="button" class="iconbtn" data-mv="${k}:-1" title="Subir" ${k ? "" : "disabled"} style="width:28px;height:28px;transform:rotate(-90deg)">${icon("chev")}</button>
                  <button type="button" class="iconbtn" data-mv="${k}:1" title="Bajar" ${k < dr.sugeridos.length - 1 ? "" : "disabled"} style="width:28px;height:28px;transform:rotate(90deg)">${icon("chev")}</button>
                  <button type="button" class="iconbtn" data-rm="${k}" title="Quitar" style="width:28px;height:28px">${icon("x")}</button>` : ""}</span>
                <span></span>
                <span style="grid-column:2 / 4;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:flex-end">
                  <label style="flex:0 0 250px;min-width:0"><span style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-4);margin-bottom:5px">Cantidad</span>
                    <span style="display:flex;gap:6px">
                      <select data-modo="${k}" ${puede ? "" : "disabled"} aria-label="Cómo se calcula la cantidad del sugerido ${k + 1}" style="padding:8px 10px;border-radius:9px;border:1px solid var(--hair);background:var(--surface);min-width:0;flex:1 1 auto"><option value="por" ${x.modo === "por" ? "selected" : ""}>Por cada ${esc((a || b).unidad)}</option><option value="fijo" ${x.modo === "fijo" ? "selected" : ""}>Cantidad fija</option></select>
                      <input class="num" data-val="${k}" value="${valTxt(x.val)}" inputmode="decimal" ${puede ? "" : "disabled"} style="padding:8px 10px;border-radius:9px;border:1px solid var(--hair);background:var(--surface);min-width:0;width:80px;text-align:right" aria-label="Cantidad del sugerido ${k + 1}">
                    </span></label>
                  <label style="flex:1 1 280px;min-width:0"><span style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-4);margin-bottom:5px">Por qué se sugiere <span style="text-transform:none;letter-spacing:0;font-weight:500">· lo lee el vendedor en la caja</span></span>
                    <input data-nota="${k}" value="${esc(x.nota)}" placeholder="Por ejemplo: teflón para las roscas" maxlength="70" ${puede ? "" : "disabled"} style="padding:8px 10px;border-radius:9px;border:1px solid var(--hair);background:var(--surface);min-width:0;width:100%;${puede && !x.nota ? "border-color:var(--warn)" : ""}" aria-label="Por qué se sugiere el sugerido ${k + 1}"></label>
                </span></div>`;
            }).join("") || `<div class="mut" style="font-size:13px;padding:6px 2px">Todavía no hay sugeridos.</div>`}</div>
            ${puede && dr.sugeridos.length < V.MAX_SUG ? `<div style="margin-top:10px">${acHtml("acSug", "Agregar un sugerido: código, nombre o marca")}</div>` : puede ? `<div class="mut" style="font-size:12.5px;margin-top:10px">La regla ya tiene los ${V.MAX_SUG} sugeridos. Quite uno para agregar otro.</div>` : ""}
            <div style="margin-top:16px">${prefRow("Regla activa", "Si se desactiva, la caja deja de sugerir estos productos; la regla y su historial se conservan", swtch("rrAct", dr.activa, puede ? "" : "disabled"))}</div>`;
          buscador(body, "acSi", a2 => {
            const ya = V.reglaDe(a2.cod);
            if (ya) { toast("Ese artículo ya tiene su regla", "Se abrió para editarla: una regla por artículo, con hasta " + V.MAX_SUG + " sugeridos.", "in"); closeSheet(); return panelRegla(ya); }
            dr.si = a2.cod; pintar("acSug");
          }, usados);
          buscador(body, "acSug", b2 => { dr.sugeridos.push({ cod: b2.cod, modo: "fijo", val: 1, nota: "" }); pintar("nota:" + (dr.sugeridos.length - 1)); }, usados);
          const cb = $("#rrCambiar", body); if (cb) cb.addEventListener("click", () => { dr.si = null; pintar("acSi"); });
          $$("[data-mv]", body).forEach(b => b.addEventListener("click", () => {
            const [k, d] = b.dataset.mv.split(":").map(Number), t = dr.sugeridos[k];
            dr.sugeridos[k] = dr.sugeridos[k + d]; dr.sugeridos[k + d] = t; pintar();
          }));
          $$("[data-rm]", body).forEach(b => b.addEventListener("click", () => { dr.sugeridos.splice(+b.dataset.rm, 1); pintar(); }));
          $$("[data-modo]", body).forEach(x => x.addEventListener("change", () => { dr.sugeridos[+x.dataset.modo].modo = x.value; }));
          $$("[data-val]", body).forEach(x => x.addEventListener("input", () => { dr.sugeridos[+x.dataset.val].val = numIn(x.value); }));
          $$("[data-nota]", body).forEach(x => x.addEventListener("input", () => { dr.sugeridos[+x.dataset.nota].nota = x.value; }));
          const sw = $("#rrAct", body); if (sw && puede) sw.addEventListener("click", () => { dr.activa = !dr.activa; sw.setAttribute("aria-checked", dr.activa); });
          const f = foco === "acSi" ? $("#acSi input", body) : foco === "acSug" ? $("#acSug input", body) : foco && foco.indexOf("nota:") === 0 ? $(`[data-nota="${foco.slice(5)}"]`, body) : null;
          if (f) setTimeout(() => f.focus(), 30);
        }
        pintar(dr.si ? null : "acSi");
        const ok = $("#rrOk", el);
        if (ok) ok.addEventListener("click", () => {
          if (!dr.si) return toast("Falta el artículo", "Escriba y elija el artículo que dispara la sugerencia.", "cr");
          if (!dr.sugeridos.length) return toast("Falta al menos un sugerido", "Agregue de 1 a " + V.MAX_SUG + " productos.", "cr");
          const sinNota = dr.sugeridos.findIndex(x => !x.nota.trim());
          if (sinNota > -1) { toast("Falta el porqué del sugerido " + (sinNota + 1), "Es lo que lee el vendedor en la caja.", "cr"); const e = $(`[data-nota="${sinNota}"]`, body); if (e) e.focus(); return; }
          const malo = dr.sugeridos.findIndex(x => !(x.val > 0));
          if (malo > -1) { toast("Revise la cantidad del sugerido " + (malo + 1), "Tiene que ser mayor que cero.", "cr"); return; }
          const reg = V.guardarRegla({ id: dr.id, si: dr.si, activa: dr.activa, sugeridos: dr.sugeridos.map(x => ({ cod: x.cod, por: x.modo === "por" ? x.val : null, fijo: x.modo === "fijo" ? Math.max(1, Math.round(x.val)) : null, nota: x.nota.trim() })) }, "Marta Rojas");
          closeSheet();
          toast(dr.id ? "Regla guardada" : "Regla creada", artCod(reg.si).desc + " · " + reg.sugeridos.length + (reg.sugeridos.length === 1 ? " sugerido" : " sugeridos") + ". Desde ya se usa en la caja de los siete locales.", "ok");
          A.refresh();
        });
      }
    });
  }

  let relQ = "";
  function reglasRel(v) {
    const q = norm(relQ.trim());
    const R = V.REGLAS_REL.filter(r => !q || norm(r.si + " " + artCod(r.si).desc + " " + r.sugeridos.map(x => x.cod + " " + artCod(x.cod).desc).join(" ")).includes(q));
    const tasa = r => { const m = r.sugeridos.reduce((k, x) => k + x.mostradas, 0), a = r.sugeridos.reduce((k, x) => k + x.aceptadas, 0); return m ? (a / m) * 100 : null; };
    v.innerHTML = `<div class="wrap">
      ${nota("Una regla por artículo, con hasta " + V.MAX_SUG + " sugeridos en el orden en que salen en la caja. La cantidad se calcula sobre la línea (por cada unidad vendida) o es fija. Clic en una regla para editarla.", "sparkle")}
      ${card({
      title: "Reglas de productos relacionados", hint: V.REGLAS_REL.filter(r => r.activa).length + " activas de " + V.REGLAS_REL.length,
      actions: `<div class="tb-search" style="width:300px">${icon("search")}<input id="relQ" value="${esc(relQ)}" placeholder="Buscar un artículo" autocomplete="off" aria-label="Buscar artículo en las reglas"></div>${esGerencia() ? `<button class="btn sm pri" id="relNueva">${icon("plus")}Regla</button>` : ""}`,
      body: table({
        onRow: true,
        cols: [
          { t: "Cuando se vende", fmt: r => `<b>${esc(artCod(r.si).desc)}</b><span class="sub ui">${esc(r.si)}</span>` },
          { t: "Sugiere y por qué", fmt: r => `<div style="display:flex;flex-direction:column;gap:5px">${r.sugeridos.map((x, k) => `<div style="display:flex;gap:8px;align-items:baseline;min-width:0">
              <b class="num" style="flex:none;width:14px;color:var(--ink-4)">${k + 1}</b>
              <span style="min-width:0"><b style="font-weight:650">${esc(artCod(x.cod).desc)}</b>${x.origen === "Aprendida" ? " " + tag("aprendida", "acc", "sparkle") : ""}
              <span class="mut" style="font-size:12.5px"> · ${esc(x.nota)} · ${esc(cantTxt(x))}</span></span></div>`).join("")}</div>` },
          { t: "", r: true, cls: "mono", fmt: r => `<span class="mut">${r.sugeridos.length}/${V.MAX_SUG}</span>` },
          { t: "Modificada", fmt: r => `${esc(r.autor)}<span class="sub ui">${fecha(r.cambio)}</span>` },
          { t: "Aceptación", r: true, cls: "mono", fmt: r => (tasa(r) != null ? dec(tasa(r), 0) + " %" : '<span class="dim">nueva</span>') },
          { t: "Activa", fmt: r => swtch(null, r.activa, `data-rel="${r.id}" ${esGerencia() ? "" : "disabled"}`) }
        ], rows: R, rowCls: r => (r.activa ? "" : "mu")
      })
    })}</div>`;
    v._R = R;
  }
  function reglasRelWire(v) {
    const p = $("#tp-ven-relacionados", v);
    $$("[data-rel]", p).forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      if (b.disabled) return;
      const r = V.REGLAS_REL.find(x => x.id === b.dataset.rel); r.activa = !r.activa;
      V.anotar(r.activa ? "Activó regla de productos relacionados" : "Desactivó regla de productos relacionados", artCod(r.si).desc, "Marta Rojas", S.locId, "Baja");
      A.refresh();
    }));
    $$("tr.clickable", p).forEach(tr => tr.addEventListener("click", () => panelRegla(p._R[+tr.dataset.i])));
    const q = $("#relQ", p);
    q.addEventListener("input", () => { relQ = q.value; A.refresh(); setTimeout(() => { const e = $("#relQ"); if (e) { e.focus(); e.setSelectionRange(e.value.length, e.value.length); } }, 0); });
    const nb = $("#relNueva", p); if (nb) nb.addEventListener("click", () => panelRegla(null));
  }

  function aprendidas(v) {
    const L = V.APREND, R = V.REVISION;
    v.innerHTML = `<div class="wrap">
      <div class="stepbar"><div class="sbt"><b>${icon("sparkle")} Revisión de anoche a las 02:00: ${grp(R.facturas)} facturas de los últimos ${R.dias} días</b>
        <span>El sistema busca los artículos que se compran juntos más de lo que se esperaría por casualidad. Lo que encuentra no llega a la caja hasta que alguien lo aprueba: la coincidencia no siempre es relación de uso.</span></div></div>
      ${card({
      title: "Pares detectados en las ventas", hint: L.filter(x => x.estado === "Propuesta").length + " por revisar",
      body: table({
        cols: [
          { t: "Cuando se vende", fmt: x => esc(artCod(x.si).desc) },
          { t: "También compran", fmt: x => `<b>${esc(artCod(x.sugiere).desc)}</b><span class="sub ui">${esc(x.nota)}</span>` },
          { t: "Juntas", r: true, cls: "mono", fmt: x => grp(x.juntas) + " fact." },
          { t: "Confianza", r: true, cls: "mono", fmt: x => x.conf + " %" },
          { t: "Relación", fmt: x => (x.lift >= 2 ? tag("×" + dec(x.lift) + " más que el azar", "ok") : tag("Coincidencia · ×" + dec(x.lift), "wa", "alert")) },
          { t: "", r: true, fmt: x => (x.estado === "Propuesta" ? (esGerencia() ? `<button class="btn sm pri" data-apr="ok:${x.id}">Aprobar</button> <button class="btn sm" data-apr="no:${x.id}">Descartar</button>` : tag("Por revisar", "wa")) : x.estado === "Aprobada" ? tag("Aprobada · ya en la caja", "ok", "check") : tag("Descartada", "mu")) }
        ], rows: L, rowCls: x => (x.estado === "Propuesta" && x.lift < 2 ? "wa" : "")
      })
    })}
      ${nota("<b>Confianza</b>: de cada 100 facturas con el primer artículo, cuántas llevan también el segundo. <b>Relación</b>: cuántas veces más ocurre de lo que pasaría por azar; debajo de ×2 casi siempre es coincidencia, como el candado con el cemento.", "info")}</div>`;
  }
  function aprendidasWire(v) {
    $$("[data-apr]", v).forEach(b => b.addEventListener("click", () => {
      const [acc, id] = b.dataset.apr.split(":");
      if (acc === "ok") {
        const r = V.aprobarAprendida(id, "Marta Rojas");
        if (r && r.llena) toast("La regla de ese artículo ya tiene " + V.MAX_SUG + " sugeridos", "Quite uno en Reglas para poder aprobar este par.", "wa");
        else toast("Aprobada", "Se sumó a la regla de " + artCod(r.regla.si).desc + "; desde ya se sugiere en la caja.", "ok");
      }
      else { V.descartarAprendida(id, "Marta Rojas"); toast("Descartada", "El sistema no la vuelve a proponer.", "in"); }
      A.refresh();
    }));
  }

  A.workspace("ven-relacionados", {
    title: "Sugerencia de productos relacionados",
    tabs: [
      { id: "caja", t: "En la caja", sub: "Lo que el vendedor experto sugiere de memoria, ahora para todos", render: enCaja },
      { id: "reglas", t: "Reglas", sub: "Qué se sugiere con cada artículo y en qué cantidad", render: reglasRel, wire: reglasRelWire },
      {
        id: "aprendidas", t: "Aprendidas de las ventas", sub: "Pares que el sistema encontró en las facturas y esperan visto bueno",
        badge: () => { const n = V.APREND.filter(x => x.estado === "Propuesta").length; return { n, k: "", l: n + " por revisar" }; },
        render: aprendidas, wire: aprendidasWire
      }
    ]
  });
})(window);
