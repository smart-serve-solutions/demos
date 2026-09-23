/* ═══════════════════════════════════════════════════════════════
   Contabilidad — el sistema registra y cruza, el contador revisa lo
   que no cuadró y una persona aprueba el cierre.
   Seis opciones, una por lo que hace el contador: Bandeja (revisar),
   Conciliaciones (cuadrar), Libros (consultar), Informes (informar),
   Cierre (cerrar y presentar) y Reglas (configurar). Los datos de la
   automatización viven en con-auto.js (window.AUTO).
   Ningún asiento se digita: lo genera un documento o una regla, y cada
   uno dice cuál.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, U = w.UI, C = w.CON, AU = w.AUTO;
  const { $, $$, esc, norm, grp, c, dec, fecha, fechaL, fh, hora, icon, tag, card, stat, table,
    seg, onSeg, bars, donut, lineChart, openSheet, closeSheet, toast, locNom, empty, prog, DIA } = U;

  const pc = n => dec(n, 1) + " %";
  const nombre = s => String(s || "").split(" ")[0];
  /* el mes que se está cerrando: el abierto, o el que se acaba de cerrar */
  const mesCierre = () => (AU.CIERRE.estado === "Cerrado" ? C.cierres.find(x => x.bloqueado) : AU.mesAbierto()) || C.cierres[0];
  const mesCorto = () => mesCierre().nom.replace(" 2026", "");

  /* ═════════════════════════════════════════════════════════════
     El flujo de tres pasos, el mismo en la bandeja y en el cierre
     ═════════════════════════════════════════════════════════════ */
  function flujo3() {
    const pend = AU.bandeja().length, est = AU.CIERRE.estado;
    const auto = AU.hechoSolo()[0].n;
    const paso3 = est === "Cerrado" ? "Aprobado por " + AU.CIERRE.aprobado.por
      : est === "Enviado a aprobación" ? "Esperando la aprobación final"
        : est === "Devuelto" ? "Devuelto con una observación" : "Cuando el contador lo envíe";
    return `<ol class="steps s3" aria-label="Cómo se lleva la contabilidad">
      <li><div class="step done"><span class="sn">${icon("check")}</span><span class="st"><b>1 · El sistema registra y cruza</b>
        <small>${grp(auto)} asientos solos en el mes</small></span></div></li>
      <li><div class="step ${pend ? "now" : "done"}"><span class="sn">${pend ? "2" : icon("check")}</span><span class="st"><b>2 · El contador revisa</b>
        <small>${pend ? pend + " asuntos en la bandeja" : "Nada pendiente en la bandeja"}</small></span></div></li>
      <li><div class="step ${est === "Cerrado" ? "done" : est === "Enviado a aprobación" ? "now" : est === "Devuelto" ? "wait" : ""}"><span class="sn">${est === "Cerrado" ? icon("check") : "3"}</span>
        <span class="st"><b>3 · Una persona aprueba el cierre</b><small>${esc(paso3)}</small></span></div></li></ol>`;
  }

  /* ═════════════════════════════════════════════════════════════
     Acciones sobre un asunto — se usan en la bandeja y en las
     conciliaciones, así que resolver en un lado resuelve en el otro
     ═════════════════════════════════════════════════════════════ */
  function resolverAsunto(id, accion) {
    const it = AU.items.find(x => x.id === id);
    if (!it) return;
    if (accion === "consultar") return pedirExplicacion(it);
    const r = AU.resolver(id, accion);
    if (!r) return;
    if (accion === "regla" && r.regla) toast("Regla creada: «" + r.regla.t + "»",
      r.aplicadas ? "Se aplicó en el acto a " + r.aplicadas + " asunto" + (r.aplicadas === 1 ? "" : "s") + " más que esperaba" + (r.aplicadas === 1 ? "" : "n") + ". La próxima vez se resuelve sola."
        : "La próxima vez este caso se resuelve solo y no llega a la bandeja.", "ok");
    else toast(r.como, r.t, "ok");
    if (!AU.bandeja().length) setTimeout(() => toast("Bandeja vacía", "Todo cuadró. El cierre de " + mesCorto() + " ya se puede enviar a aprobación.", "ok"), 350);
    A.refresh();
  }
  function pedirExplicacion(it) {
    const msj = `Hola ${nombre(it.resp)}, le escribe ${nombre(AU.REVISOR.nom)} de contabilidad. ${it.t}. ${it.d}. ¿Me ayuda a aclararlo? Gracias.`;
    openSheet({
      title: "Pedir explicación",
      sub: "Por WhatsApp a " + (it.resp || "la persona responsable"),
      body: `${U.field("Mensaje", `<textarea class="inp" id="pxMsg" rows="5">${esc(msj)}</textarea>`)}
        <div class="mut" style="font-size:12.5px;margin-top:12px;line-height:1.55">La respuesta llega a esta bandeja.
        Mientras tanto el asunto queda en espera y no detiene lo demás, pero el mes no se cierra hasta resolverlo.</div>`,
      footer: `<button class="btn" id="pxC">Cancelar</button><div style="flex:1"></div><button class="btn pri" id="pxOk">${icon("chat")}Enviar</button>`,
      after: root => {
        $("#pxC", root).addEventListener("click", closeSheet);
        $("#pxOk", root).addEventListener("click", () => {
          AU.resolver(it.id, "consultar");
          closeSheet();
          toast("Mensaje enviado por WhatsApp", "A " + (it.resp || "la persona responsable") + ". El asunto queda en espera de su respuesta.", "ok");
          A.refresh();
        });
      }
    });
  }
  const wireAcciones = root => {
    $$("[data-acc]", root).forEach(b => b.addEventListener("click", () => {
      const [id, acc] = b.dataset.acc.split("|");
      resolverAsunto(id, acc);
    }));
  };

  /* ═════════════════════════════════════════════════════════════
     1 · BANDEJA — lo que el sistema no pudo resolver solo
     ═════════════════════════════════════════════════════════════ */
  const URG = { cr: 0, wa: 1, in: 2 };
  const CORTO = { banco: "Banco", caja: "Cajas", inventario: "Inventario", compras: "Compras",
    gastos: "Gastos", finmes: "Fin de mes", cierre: "Aprobación" };
  let bqFiltro = "todo";

  function grupos() {
    const items = AU.bandeja();
    return AU.GRUPOS.map(g => {
      const its = items.filter(i => i.grupo === g.id)
        .sort((a, b) => URG[a.k] - URG[b.k] || (b.monto || 0) - (a.monto || 0));
      return Object.assign({}, g, { items: its, urg: its.length ? Math.min.apply(null, its.map(i => URG[i.k])) : 9 });
    }).filter(g => g.items.length).sort((a, b) => a.urg - b.urg);
  }
  const aceptables = g => g.items.filter(i => i.acciones.indexOf("aceptar") >= 0 && (i.conf >= 85 || i.grupo === "finmes")).length;

  function botones(it) {
    return it.acciones.filter(a => !(a === "consultar" && it.estado === "En consulta")).map((a, i) => {
      const pri = i === 0 ? "pri" : "";
      if (a === "aceptar") return `<button class="btn sm ${pri}" data-acc="${it.id}|aceptar">${icon("check")}${esc(it.aceptarTexto || "Aceptar")}</button>`;
      if (a === "regla") return `<button class="btn sm ${pri}" data-acc="${it.id}|regla">${icon("sparkle")}${it.acciones.indexOf("aceptar") >= 0 ? "Aceptar y crear regla" : esc(it.aceptarTexto) + " y crear regla"}</button>`;
      return `<button class="btn sm ${pri}" data-acc="${it.id}|consultar">${icon("chat")}Pedir explicación</button>`;
    }).join("");
  }
  function asunto(it) {
    const n = it.cuenta ? it.cuenta() : null;
    return `<div class="bq ${it.k}" id="bq-${esc(it.id)}">${icon(it.ic)}
      <div class="bqm"><div class="bqt">${esc(it.t)}</div><div class="bqd">${esc(it.d)}</div>
        <div class="bqs">${icon("sparkle")}<div><b>${it.conf ? "El sistema sugiere." : "Causa probable."}</b> ${esc(it.sugerencia)}${it.conf ? `<span class="conf">${it.conf} % de coincidencia</span>` : ""}</div></div>
        <div class="bqa">${botones(it)}${it.estado === "En consulta" ? tag("Esperando a " + nombre(it.resp), "wa", "clock") : ""}</div></div>
      <div class="bqr">${n != null ? grp(n) + " comprobantes" : it.monto ? c(it.monto) : ""}</div></div>`;
  }

  A.screen("contabilidad", {
    title: "Bandeja del contador",
    sub: () => {
      const n = AU.bandeja().length;
      return n ? `${n} asuntos que el sistema no pudo resolver solo · lo urgente primero · revisa ${AU.REVISOR.nom}`
        : "Todo cuadró · no hay nada que revisar";
    },
    extra: () => `<button class="btn" data-ir="con-conciliaciones">${icon("swap")}Conciliaciones</button>
                  <button class="btn pri" data-ir="con-cierre|lista">${icon("lock")}Cierre de ${esc(mesCorto())}</button>`,
    render(v) {
      const gs = grupos();
      const total = gs.reduce((s, g) => s + g.items.length, 0);
      if (bqFiltro !== "todo" && !gs.some(g => g.id === bqFiltro)) bqFiltro = "todo";
      const ver = gs.filter(g => bqFiltro === "todo" || g.id === bqFiltro);
      const L = AU.listaCierre(), ok = L.filter(x => x.ok).length;
      const est = AU.CIERRE.estado;
      const cuerpo = total ? ver.map(g => {
        const n = aceptables(g);
        return `<div class="bqg">${icon(g.ic)}<h4>${esc(g.t)} · ${g.items.length}</h4>
          ${n > 1 ? `<button class="btn sm" data-lote="${g.id}">${icon("check")}${g.id === "finmes" ? "Aprobar los " + n + " asientos" : "Aceptar las " + n + " sugerencias"}</button>` : ""}
          <button class="btn sm" data-ir="${g.ir}">Ver ${icon("chev")}</button></div>
          ${g.items.map(asunto).join("")}`;
      }).join("")
        : empty("check", "Bandeja vacía", est === "Cerrado"
          ? "El mes está cerrado. Lo nuevo que no cuadre va a aparecer aquí."
          : "Todo cuadró. El cierre de " + mesCorto() + " ya se puede enviar a aprobación.");
      const hechos = AU.hechoSolo();
      v.innerHTML = `<div class="wrap">
        ${flujo3()}
        <div class="grid" style="grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);align-items:start">
          <div class="wrap">
            ${total ? `<div class="scrollx">${seg("bqf", [{ v: "todo", t: "Todo · " + total }].concat(gs.map(g => ({ v: g.id, t: CORTO[g.id] + " · " + g.items.length }))), bqFiltro)}</div>` : ""}
            ${card({ title: "Por revisar", hint: total ? "cada asunto trae la causa probable y lo que el sistema sugiere" : "", body: cuerpo, flush: !!total })}
          </div>
          <div style="display:flex;flex-direction:column;gap:14px">
            ${card({
        title: "Lo que el sistema hizo solo", hint: "este mes",
        body: `<div>${hechos.map(h => `<div class="hl"><b>${grp(h.n)}</b><span>${esc(h.t)}</span></div>`).join("")}</div>
          <div class="mut" style="font-size:12.5px;margin-top:10px;line-height:1.55">Cada asiento dice qué regla lo generó.
          Se pueden ver en <button class="btn sm" data-ir="con-libros|asientos">Libros › Asientos</button></div>`
      })}
            ${card({
        title: "Resuelto hoy", hint: AU.resueltos.length ? AU.resueltos.length + " con nombre y hora" : "",
        body: AU.resueltos.length ? AU.resueltos.slice(0, 7).map(r => `<div class="log"><b>${esc(r.accion)}</b> · ${esc(r.detalle)}
            <div class="dim" style="font-size:11.5px;margin-top:2px">${esc(r.por)} · ${hora(r.fecha)}</div></div>`).join("")
          : `<div class="mut" style="font-size:12.5px;line-height:1.55">Todavía nada. Lo que se resuelva queda aquí con quién lo hizo y a qué hora.</div>`
      })}
            ${card({
        title: "Cierre de " + mesCorto(), hint: est,
        body: `${prog([{ w: ok / L.length * 100, col: ok === L.length ? "var(--ok)" : "var(--accent)" }])}
          <div class="mut" style="font-size:12.5px;margin:10px 0 12px;line-height:1.55">${ok} de ${L.length} puntos de la lista listos.
          ${est === "Cerrado" ? "Aprobado por " + esc(AU.CIERRE.aprobado.por) + "." : ok === L.length ? "Listo para enviar a aprobación." : "Cada punto se pone en verde solo cuando se resuelve lo de la bandeja."}</div>
          <button class="btn sm" data-ir="con-cierre|lista">${icon("lock")}Ver la lista de cierre</button>`
      })}
          </div>
        </div></div>`;
    },
    wire(v) {
      A.wireIr(v);
      onSeg(v, "bqf", x => { bqFiltro = x; A.refresh(); });
      wireAcciones(v);
      $$("[data-lote]", v).forEach(b => b.addEventListener("click", () => {
        const g = b.dataset.lote;
        const n = AU.resolverGrupo(g);
        toast(n + (g === "finmes" ? " asientos aprobados" : " sugerencias aceptadas"), "Cada una queda en la bitácora con el nombre de " + AU.REVISOR.nom + ".", "ok");
        if (!AU.bandeja().length) setTimeout(() => toast("Bandeja vacía", "Todo cuadró. El cierre ya se puede enviar a aprobación.", "ok"), 350);
        A.refresh();
      }));
    }
  });

  /* ═════════════════════════════════════════════════════════════
     2 · CONCILIACIONES — cada fuente contra su cuenta, cada día
     Banco · Caja y medios de pago · Inventario · Cartera y proveedores
     ═════════════════════════════════════════════════════════════ */
  const COMO = { "Automático": ["ok", "check"], "Aprobado": ["ok", "check"], "Registrado": ["ok", "check"], "Sugerido": ["wa", "clock"], "Sin pareja": ["cr", "alert"] };
  const itemBanco = r => AU.items.find(i => i.id === "BN-" + r.id);

  function concBanco(v) {
    const rows = D.banco.slice().sort((a, b) => b.fecha - a.fecha);
    A._bnRows = rows;
    const auto = rows.filter(r => r.como === "Automático").length;
    const sug = rows.filter(r => !r.conciliado && r.pareja.t), sin = rows.filter(r => !r.conciliado && !r.pareja.t);
    const libro = C.saldoDe(D.ctaByCod["1-01-02-001"]);
    /* conciliación clásica: el saldo del banco sale del estado de cuenta (saldo al 31 de
       agosto más sus movimientos), no del libro; las partidas que el banco movió y los
       libros todavía no, explican la diferencia */
    const banco = C.BANCO_AL_31 + rows.reduce((s, r) => s + r.debe - r.haber, 0);
    const pend = rows.filter(r => !r.conciliado);
    const entradas = pend.filter(r => r.debe).reduce((s, r) => s + r.debe, 0), salidas = pend.filter(r => r.haber).reduce((s, r) => s + r.haber, 0);
    const transito = C.saldoDe(D.ctaByCod["1-01-01-004"]);
    const dif = banco - entradas + salidas - libro;
    const linea = (l, m, b) => `<div class="hl" style="justify-content:space-between"><span style="${b ? "font-weight:700;color:var(--ink)" : ""}">${esc(l)}</span><b style="${b ? "" : "font-weight:600"}">${c(m)}</b></div>`;
    v.innerHTML = `<div class="wrap">
        <div class="stepbar"><div class="sbt"><b>${icon("bank")} Banco Nacional conectado · lectura automática</b>
          <span>El sistema lee los movimientos a las 6:00 y cada hora, y los cruza solo con su pareja. Si el banco no ofrece la conexión, se carga el archivo una vez al día (INT-004).</span></div>
          <div class="sba">${tag("Última lectura hoy 06:00", "ok", "check")}</div></div>
        <div class="grid g4">
          ${stat("Movimientos del período", rows.length, { txt: "del estado de cuenta del Banco Nacional", dir: "" })}
          ${stat("Conciliados solos", pc(auto / rows.length * 100), { txt: auto + " movimientos sin que nadie los tocara", dir: "up" }, "var(--ok)")}
          ${stat("Sugeridos por confirmar", sug.length, { txt: "el sistema encontró la pareja; falta el visto bueno", dir: "" }, sug.length ? "var(--warn)" : "var(--ok)")}
          ${stat("Sin pareja", sin.length, { txt: "cargos que no tienen documento en los libros", dir: sin.length ? "down" : "up" }, sin.length ? "var(--crit)" : "var(--ok)")}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Movimientos del banco", hint: "cada uno con su pareja en los libros",
      body: table({
        h: "calc(100dvh - 470px)",
        cols: [
          { t: "Fecha", cls: "mono", fmt: r => fecha(r.fecha) },
          { t: "Movimiento", fmt: r => `<b>${esc(r.desc)}</b><span class="sub ui">ref. ${esc(r.ref)}</span>` },
          { t: "Entrada", r: true, cls: "mono", fmt: r => r.debe ? grp(r.debe) : '<span class="dim">—</span>' },
          { t: "Salida", r: true, cls: "mono", fmt: r => r.haber ? grp(r.haber) : '<span class="dim">—</span>' },
          { t: "Cruzó con", fmt: r => r.pareja.t ? `${esc(r.pareja.t)}${r.pareja.regla ? `<span class="sub ui">regla «${esc(r.pareja.regla)}»</span>` : ""}` : `<span class="mut">${esc(r.pareja.sugerencia)}</span>` },
          { t: "Estado", fmt: r => { const k = COMO[r.como] || ["mu"]; return tag(r.como, k[0], k[1]); } },
          {
            t: "", r: true, fmt: r => {
              const it = !r.conciliado && itemBanco(r);
              if (!it) return "";
              return r.pareja.t ? `<button class="btn sm" data-acc="${it.id}|aceptar">Confirmar</button>`
                : `<button class="btn sm" data-ir="contabilidad">Revisar</button>`;
            }
          }
        ], rows, rowCls: r => r.conciliado ? "" : r.pareja.t ? "" : "wa"
      })
    })}
          <div style="display:flex;flex-direction:column;gap:14px">
            ${card({
      title: "Cuadre con el estado de cuenta", hint: "al " + fechaL(D.HOY),
      body: `${linea("Saldo según el estado de cuenta del Banco Nacional", banco, true)}
        ${linea("Menos: entradas del banco que los libros no tienen", -entradas)}
        ${linea("Más: salidas del banco que los libros no tienen", salidas)}
        ${linea("Saldo según libros · cuenta 1-01-02-001", libro, true)}
        <div class="hl" style="justify-content:space-between"><span>Diferencia sin explicar</span>${dif ? tag(c(dif), "cr", "alert") : tag("₡0 · concilia", "ok", "check")}</div>
        <div class="mut" style="font-size:12.5px;margin-top:10px;line-height:1.55">${pend.length ? "Las partidas pendientes se resuelven en la bandeja; al registrarlas, salen de esta lista." : "No hay partidas pendientes."}
        Los depósitos de caja que el banco todavía no acredita (${c(transito)}) están en «Efectivo en tránsito», no en el banco.</div>`
    })}
            ${card({
      title: "Cómo cruza", hint: "las reglas en Reglas › Reglas de conciliación",
      body: `<div class="mut" style="font-size:12.5px;line-height:1.65">
        <b>Depósitos de caja:</b> contra el cierre de caja del día anterior, por local y monto exacto.<br>
        <b>Datáfono:</b> contra el lote del día, neto de la comisión pactada.<br>
        <b>SINPE y transferencias:</b> contra la factura abierta del cliente, por monto y teléfono o cuenta.<br>
        <b>Pagos a proveedores:</b> contra el lote de pago aprobado, por referencia.<br>
        Lo que no encuentra pareja llega a la bandeja con una sugerencia.</div>
        <button class="btn sm" data-ir="con-reglas|conciliacion" style="margin-top:12px">${icon("gear")}Ver las reglas</button>`
    })}
          </div>
        </div></div>`;
  }

  let cjDia = "semana";
  function concCaja(v) {
    const dias = [];
    AU.cierres.forEach(x => { const k = x.fecha.toDateString(); if (dias.indexOf(k) < 0) dias.push(k); });
    dias.sort((a, b) => new Date(b) - new Date(a));
    const en = x => cjDia === "semana" || x.fecha.toDateString() === cjDia;
    const rows = D.tiendas.map(l => {
      const de = arr => arr.filter(x => x.locId === l.id && en(x));
      const cs = de(AU.cierres), deps = de(AU.depositos), lts = de(AU.lotes), sps = de(AU.sinpe);
      const falt = cs.filter(x => x.estado === "Faltante");
      const noLlego = deps.filter(x => x.estado === "No llegó"), transito = deps.filter(x => x.estado === "En tránsito");
      const loteNo = lts.filter(x => x.estado === "No acreditado");
      const spN = sps.reduce((s, x) => s + x.n, 0), spId = sps.reduce((s, x) => s + x.identificados, 0);
      const revisar = falt.length + noLlego.length + loteNo.length + (spN - spId);
      return {
        l, cs, deps, lts, sps, spN, spId, revisar,
        efectivo: cs.reduce((s, x) => s + x.contado, 0), dif: cs.reduce((s, x) => s + x.dif, 0),
        bruto: lts.reduce((s, x) => s + x.bruto, 0), comision: lts.reduce((s, x) => s + x.comision, 0),
        estado: revisar ? "Por revisar" : transito.length || lts.some(x => x.estado !== "Conciliado") ? "En tránsito" : "Cuadra"
      };
    });
    A._cjRows = rows;
    const todas = AU.cierres.filter(en);
    const tolerancia = todas.filter(x => x.estado === "Dentro de tolerancia").length;
    const lotes = AU.lotes.filter(en);
    const tot = k => rows.reduce((s, r) => s + r[k], 0);
    const etiqueta = k => { const d = new Date(k); return (k === D.HOY.toDateString() ? "Hoy" : DIA[d.getDay()]) + " " + d.getDate(); };
    v.innerHTML = `<div class="wrap">
        <div class="scrollx">${seg("cjd", [{ v: "semana", t: "Todo setiembre" }].concat(dias.map(k => ({ v: k, t: etiqueta(k) }))), cjDia)}</div>
        <div class="grid g4">
          ${stat("Cierres de caja", todas.length, { txt: "cada uno con su depósito, su lote y sus SINPE", dir: "" })}
          ${stat("Diferencias registradas solas", tolerancia, { txt: "hasta " + c(AU.POLITICA.toleranciaCaja) + ", en «Diferencias de caja»", dir: "" }, "var(--ok)")}
          ${stat("Locales por revisar", rows.filter(r => r.revisar).length, { txt: "faltantes, depósitos, lotes o SINPE sin cuadrar", dir: rows.some(r => r.revisar) ? "down" : "up" }, rows.some(r => r.revisar) ? "var(--warn)" : "var(--ok)")}
          ${stat("Comisión del datáfono", c(lotes.reduce((s, x) => s + x.comision, 0)), { txt: dec(AU.POLITICA.comisionDatafono, 2) + " % según el contrato · registrada sola", dir: "" })}
        </div>
        ${card({
      title: "Cuadre por local", hint: "toque un local para ver cada caja",
      body: table({
        onRow: true,
        cols: [
          { t: "Local", fmt: r => `<b>${esc(r.l.nom)}</b><span class="sub ui">${r.l.terminales} caja${r.l.terminales === 1 ? "" : "s"}</span>` },
          { t: "Cierres", r: true, cls: "mono", fmt: r => r.cs.length },
          { t: "Efectivo contado", r: true, cls: "mono", fmt: r => grp(r.efectivo) },
          { t: "Diferencia", r: true, cls: "mono", fmt: r => r.dif ? `<span style="color:${r.cs.some(x => x.estado === "Faltante") ? "var(--crit)" : "var(--ink-2)"}">${c(r.dif)}</span>` : '<span class="dim">₡0</span>' },
          { t: "Depósitos", fmt: r => { const ok = r.deps.filter(x => x.estado === "Conciliado").length; return `<span class="num">${ok} de ${r.deps.length}</span>${r.deps.some(x => x.estado === "No llegó") ? '<span class="sub ui" style="color:var(--crit)">uno no llegó</span>' : r.deps.some(x => x.estado === "En tránsito") ? '<span class="sub ui">hoy en tránsito</span>' : ""}`; } },
          { t: "Datáfono", r: true, fmt: r => `<span class="num">${grp(r.bruto)}</span><span class="sub ui">comisión ${grp(r.comision)}${r.lts.some(x => x.estado === "No acreditado") ? " · un lote sin acreditar" : ""}</span>` },
          { t: "SINPE", r: true, fmt: r => `<span class="num">${r.spId} de ${r.spN}</span>${r.spN > r.spId ? '<span class="sub ui" style="color:var(--warn)">sin identificar</span>' : ""}` },
          { t: "Estado", fmt: r => r.estado === "Por revisar" ? tag("Por revisar", "wa", "alert") : r.estado === "En tránsito" ? tag("En tránsito", "mu", "clock") : tag("Cuadra", "ok", "check") }
        ], rows, rowCls: r => r.revisar ? "wa" : "",
        foot: [{ v: "Todos los locales" }, { v: grp(rows.reduce((s, r) => s + r.cs.length, 0)), r: true, cls: "mono" },
        { v: grp(tot("efectivo")), r: true, cls: "mono" }, { v: c(tot("dif")), r: true, cls: "mono" }, { v: "" },
        { v: grp(tot("bruto")), r: true, cls: "mono" }, { v: grp(tot("spId")) + " de " + grp(tot("spN")), r: true, cls: "mono" }, { v: "" }]
      })
    })}
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Cómo cuadra una caja", hint: "sin que nadie arme el Excel",
      body: `<div class="mut" style="font-size:12.5px;line-height:1.7">
        <b>1.</b> El cajero cierra su caja en el punto de venta y cuenta el efectivo.<br>
        <b>2.</b> Si la diferencia es de ${c(AU.POLITICA.toleranciaCaja)} o menos, se registra sola. Si es mayor, llega a la bandeja con el nombre del cajero.<br>
        <b>3.</b> Al día siguiente el banco trae el depósito y el sistema lo cruza con el cierre.<br>
        <b>4.</b> El lote del datáfono se cruza neto de la comisión, y la comisión se registra como gasto financiero.<br>
        <b>5.</b> Cada SINPE se aplica a su factura por monto y teléfono. El que no se identifica llega a la bandeja con la factura que más se parece.</div>`
    })}
          ${card({
      title: "Hoy con Neo", hint: "para comparar",
      body: `<div class="mut" style="font-size:12.5px;line-height:1.7">Cada caja se cuadra a mano contra su depósito,
        el datáfono se revisa con el reporte del adquirente y los SINPE los aplica una persona; mientras tanto, la factura
        sale como vencida. Aquí esas tres cosas corren solas y la persona solo ve lo que no calzó.</div>
        <button class="btn sm" data-ir="contabilidad" style="margin-top:12px">${icon("check")}Ir a la bandeja</button>`
    })}
        </div></div>`;
  }
  function concCajaWire(v) {
    onSeg(v, "cjd", x => { cjDia = x; A.refresh(); });
    $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => {
      const r = A._cjRows[+tr.dataset.i];
      openSheet({
        wide: true, tight: true,
        title: "Cajas de " + r.l.nom, sub: cjDia === "semana" ? "Últimos 7 días" : fechaL(new Date(cjDia)),
        body: table({
          cols: [
            { t: "Fecha", cls: "mono", fmt: x => fecha(x.fecha) },
            { t: "Caja", fmt: x => `Caja ${x.term}<span class="sub ui">${esc(x.cajero)}</span>` },
            { t: "Esperado", r: true, cls: "mono", fmt: x => grp(x.efectivo) },
            { t: "Contado", r: true, cls: "mono", fmt: x => grp(x.contado) },
            { t: "Diferencia", r: true, cls: "mono", fmt: x => x.dif ? c(x.dif) : '<span class="dim">₡0</span>' },
            { t: "Estado", fmt: x => x.estado === "Cuadrado" ? tag("Cuadrado", "ok", "check") : x.estado === "Faltante" ? tag("Faltante · en la bandeja", "cr", "alert") : tag(x.estado, x.estado === "Dentro de tolerancia" ? "ok" : "mu") }
          ], rows: r.cs.slice().sort((a, b) => b.fecha - a.fecha || a.term - b.term)
        }),
        footer: `<span class="mut" style="font-size:12.5px">El efectivo esperado sale de las ventas de contado de cada caja</span><div style="flex:1"></div><button class="btn pri" id="cjOk">Cerrar</button>`,
        after: root => $("#cjOk", root).addEventListener("click", closeSheet)
      });
    }));
  }

  function concInv(v) {
    const rows = AU.INV;
    const kardex = rows.reduce((s, r) => s + r.kardex, 0), libro = rows.reduce((s, r) => s + r.libro, 0);
    const cuenta = C.saldoDe(D.ctaByCod["1-01-04-001"]);
    const difs = rows.filter(r => r.estado === "Diferencia");
    const aj = AU.AJUSTES;
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Locales cruzados anoche", rows.length, { txt: "siete tiendas, el CEDI y dos bodegas", dir: "" })}
          ${stat("Con diferencia", difs.length, { txt: difs.length ? difs.map(r => r.loc.nom).join(" · ") : "el kardex y el libro cuadran en todos", dir: difs.length ? "down" : "up" }, difs.length ? "var(--warn)" : "var(--ok)")}
          ${stat("Ajustes de costo del mes", aj.length, { txt: aj.filter(a => a.estado === "Registrado solo").length + " registrados solos · " + aj.filter(a => a.estado !== "Registrado solo").length + " pasaron por revisión", dir: "" })}
          ${stat("Costo de ventas", "Al vender", { txt: "en cada factura, al costo promedio, sin esperar al conteo de fin de mes", dir: "up" }, "var(--ok)")}
        </div>
        ${card({
      title: "Kardex contra libro, local por local", hint: "el cruce corre cada noche; la diferencia se ve el día que ocurre",
      body: table({
        cols: [
          { t: "Local", fmt: r => `<b>${esc(r.loc.nom)}</b><span class="sub ui">${r.loc.tipo === "tienda" ? "Tienda" : r.loc.tipo === "cedi" ? "Centro de distribución" : "Bodega"}</span>` },
          { t: "Kardex valorizado", r: true, cls: "mono", fmt: r => grp(r.kardex) },
          { t: "Según el libro", r: true, cls: "mono", fmt: r => grp(r.libro) },
          { t: "Diferencia", r: true, cls: "mono", fmt: r => r.libro - r.kardex ? `<b style="color:var(--warn)">${c(r.libro - r.kardex)}</b>` : '<span class="dim">₡0</span>' },
          { t: "Estado", fmt: r => r.estado === "Diferencia" ? tag("En la bandeja", "wa", "alert") : r.estado === "Ajustado" ? tag("Ajustado hoy", "ok", "check") : tag("Cuadra", "ok", "check") },
          { t: "Causa probable", fmt: r => r.causa ? `<span class="mut" style="font-size:12.5px">${esc(r.causa)}</span>` : '<span class="dim">—</span>' }
        ], rows, rowCls: r => r.estado === "Diferencia" ? "wa" : "",
        foot: [{ v: "Total con detalle por local" }, { v: grp(kardex), r: true, cls: "mono" }, { v: grp(libro), r: true, cls: "mono" }, { v: c(libro - kardex), r: true, cls: "mono" }, { v: "", span: 2 }]
      }) + `<div class="mut" style="font-size:12.5px;padding:12px 16px;line-height:1.55;border-top:1px solid var(--hair-2)">
        La cuenta 1-01-04-001 suma ${c(cuenta)} y el kardex valorizado de toda la empresa ${c(kardex)}${cuenta === kardex ? ": cuadran." : ": difieren en " + c(cuenta - kardex) + (cuenta === libro ? ", que es justo lo que explican las diferencias por local de arriba (movimientos del kardex con el asiento retenido, en la bandeja)." : "; " + c(cuenta - libro) + " no tiene explicación todavía.")}
        La migración del 31 de agosto trajo el inventario de cada local al costo.</div>`
    })}
        <div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Ajustes de costo por ventas sin existencia", hint: "hasta " + c(AU.POLITICA.umbralCosto) + " se registran solos",
      body: table({
        cols: [
          { t: "Fecha", cls: "mono", fmt: a => fecha(a.fecha) },
          { t: "Artículo", fmt: a => `<b>${esc(a.art.desc)}</b><span class="sub ui">${esc(locNom(a.locId))} · ${a.unidades} unidades</span>` },
          { t: "Costo usado", r: true, cls: "mono", fmt: a => grp(a.costoUsado) },
          { t: "Costo real", r: true, cls: "mono", fmt: a => grp(a.costoReal) },
          { t: "Ajuste", r: true, cls: "mono", fmt: a => c(a.ajuste) },
          { t: "Estado", fmt: a => a.estado === "Por revisar" ? tag("En la bandeja", "wa", "alert") : a.estado === "Aprobado" ? tag("Aprobado", "ok", "check") : tag("Registrado solo", "ok", "check") }
        ], rows: aj.slice().sort((a, b) => Math.abs(b.ajuste) - Math.abs(a.ajuste)), rowCls: a => a.estado === "Por revisar" ? "wa" : ""
      })
    })}
          ${card({
      title: "Por qué hay ajustes", hint: "la regla de Santa Rosa",
      body: `<div class="mut" style="font-size:12.5px;line-height:1.7">En una ferretería se vende lo que todavía no se
        registró como recibido: el camión llegó y la factura de compra entra después. La venta sale con el último costo
        conocido.<br><br>Cuando entra la compra, el sistema recalcula el costo promedio —con la existencia negativa contada
        como cero, como lo hace Santa Rosa hoy— y ajusta el costo de esas ventas. Si el ajuste es pequeño se registra solo;
        si es grande, el contador lo ve antes.</div>`
    })}
        </div></div>`;
  }

  function concCartera(v) {
    const k = AU.cartera(), p = AU.proveedores();
    const fm = AU.FINMES.find(x => x.id === "FM4");
    const esperando = D.compras.filter(x => x.estado === "Registrada");
    /* el auxiliar contra la cuenta del mayor; la diferencia se calcula, no se supone */
    const cuadre = (t, cod, aux, dif, lib, auxT) => card({
      title: t, hint: "cuenta " + cod,
      body: `<div class="hl" style="justify-content:space-between"><span>${esc(auxT)}</span><b>${c(aux)}</b></div>
        <div class="hl" style="justify-content:space-between"><span style="font-weight:700;color:var(--ink)">Saldo de la cuenta en el libro</span><b>${c(lib)}</b></div>
        <div class="hl" style="justify-content:space-between"><span>Diferencia</span>${dif ? tag(c(dif) + " · no cuadra", "cr", "alert") : tag("₡0 · cuadra", "ok", "check")}</div>
        <div class="mut" style="font-size:12px;margin-top:6px">Lo anterior al 1 de setiembre entró con la migración del 31 de agosto, factura por factura.</div>`
    });
    v.innerHTML = `<div class="wrap">
        <div class="grid g2">
          ${cuadre("Clientes", "1-01-03-001", k.aux, k.diferencia, k.libro, "Facturas a crédito abiertas")}
          ${cuadre("Proveedores", "2-01-01-001", p.aux, p.diferencia, p.libro, "Facturas de proveedor por pagar")}
        </div>
        ${card({
      title: "Antigüedad de la cartera y estimación por incobrables", hint: "la política de la empresa, calculada sola cada mes",
      body: `<div class="aging">${k.tramos.map((t, i) => `<div class="ag d${i + 1}"><div class="agv">${c(t.saldo)}</div>
          <div class="agl">${esc(t.t)} · ${t.pct ? "estimación " + t.pct + " %" : "sin estimación"}</div></div>`).join("")}</div>
        <div class="stepbar" style="margin:14px 16px 16px"><div class="sbt"><b>Estimación propuesta para ${esc(mesCorto())}: ${c(k.estimacion)}</b>
          <span>Es una decisión de criterio: el sistema la calcula y el contador la aprueba o la corrige en la bandeja.</span></div>
          <div class="sba">${fm && fm.estado === "Aprobado" ? tag("Aprobada", "ok", "check") : `<button class="btn sm pri" data-ir="contabilidad">${icon("check")}Revisar en la bandeja</button>`}</div></div>`,
      flush: true
    })}
        ${card({
      title: "Mercadería recibida sin factura del proveedor", hint: "queda en «Mercadería recibida por facturar» hasta que llegue el XML",
      body: esperando.length ? table({
        cols: [
          { t: "Orden", cls: "mono", fmt: x => `<b>${esc(x.cons)}</b>` },
          { t: "Proveedor", fmt: x => esc(D.provById[x.provId].nom) },
          { t: "Recibida en", fmt: x => esc(locNom(x.locId)) },
          { t: "Monto", r: true, cls: "mono", fmt: x => grp(x.total) },
          { t: "Estado", fmt: x => x.esperaFactura ? tag("Esperando la factura", "mu", "clock") : tag("En la bandeja", "wa", "alert") }
        ], rows: esperando
      }) : empty("check", "Nada pendiente", "Toda mercadería recibida tiene su factura.")
    })}</div>`;
  }

  A.workspace("con-conciliaciones", {
    title: "Conciliaciones",
    tabs: [
      {
        id: "banco", t: "Banco",
        sub: "Cada movimiento del Banco Nacional contra su pareja en los libros · cruce diario",
        badge: () => { const n = D.banco.filter(r => !r.conciliado).length; return { n, k: D.banco.some(r => !r.conciliado && !r.pareja.t) ? "cr" : "wa", l: n + " movimientos por revisar" }; },
        render: concBanco, wire: v => { A.wireIr(v); wireAcciones(v); }
      },
      {
        id: "caja", t: "Caja y medios de pago",
        sub: "Cada cierre de caja contra su depósito, cada lote del datáfono y cada SINPE",
        badge: () => { const n = AU.bandeja().filter(i => i.grupo === "caja").length; return { n, k: "wa", l: n + " por revisar" }; },
        render: concCaja, wire: v => { A.wireIr(v); concCajaWire(v); }
      },
      {
        id: "inventario", t: "Inventario",
        sub: "Kardex valorizado contra la cuenta de inventario, local por local, cada noche",
        badge: () => { const n = AU.bandeja().filter(i => i.grupo === "inventario").length; return { n, k: "wa", l: n + " por revisar" }; },
        render: concInv
      },
      {
        id: "cartera", t: "Cartera y proveedores",
        sub: "Los auxiliares de clientes y proveedores contra su cuenta",
        render: concCartera, wire: v => A.wireIr(v)
      }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     3 · LIBROS — Saldos y movimientos · Asientos · Activos fijos
     Se parte del balance, se toca una cuenta y aparece su movimiento,
     se toca un movimiento y aparece el asiento con la regla que lo hizo.
     ═════════════════════════════════════════════════════════════ */
  let diQ = "", diF = "todos", saldoCta = null;
  const verMayor = cod => { if (D.ctaByCod[cod]) A.go("con-libros", "saldos:" + cod); };
  const reglaDe = a => a.regla || (/^APERTURA/.test(a.origen) ? "Asiento manual" : /^DEP/.test(a.origen) ? "Depreciación mensual"
    : /^PRO/.test(a.origen) ? "Provisiones laborales" : /^IPJ/.test(a.origen) ? "Impuesto a las personas jurídicas"
      : /^PLA/.test(a.origen) ? "Planilla" : /^OC-/.test(a.origen) ? "Compra aplicada" : /-03-/.test(a.origen) ? "Nota de crédito"
        : /-04-/.test(a.origen) ? "Tiquete electrónico" : /-01-/.test(a.origen) ? "Factura de venta" : "Documento");
  const estadoAs = a => a.origen === "APERTURA" ? tag("Migración", "mu") : a.manual ? tag("Manual", "wa") : a.propuesto ? tag("Por aprobar", "wa", "clock")
    : a.aprobado ? tag("Aprobado · " + nombre(a.aprobado), "ok", "check") : tag("Automático", "ok", "check");

  function verAsiento(a) {
    openSheet({
      wide: true, tight: true,
      title: "Asiento " + a.id, sub: `${fh(a.fecha)} · origen ${a.origen} · regla «${reglaDe(a)}» · toque una cuenta para ver su movimiento`,
      body: table({
        onRow: true,
        cols: [
          { t: "Cuenta", cls: "mono", fmt: r => esc(r.cta) },
          { t: "Descripción", fmt: r => esc((D.ctaByCod[r.cta] || {}).nom || "") },
          { t: "Debe", r: true, cls: "mono", fmt: r => (r.debe ? grp(r.debe) : '<span class="dim">—</span>') },
          { t: "Haber", r: true, cls: "mono", fmt: r => (r.haber ? grp(r.haber) : '<span class="dim">—</span>') }
        ], rows: a.detalle,
        foot: [{ v: esc(a.glosa), span: 2 },
        { v: grp(a.detalle.reduce((s, d) => s + (d.debe || 0), 0)), r: true, cls: "mono" },
        { v: grp(a.detalle.reduce((s, d) => s + (d.haber || 0), 0)), r: true, cls: "mono" }]
      }),
      footer: `<span style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${estadoAs(a)}<span class="mut" style="font-size:12.5px">${a.propuesto ? "Lo generó el sistema; se aprueba en la bandeja" : a.aprobado ? "Lo generó el sistema y lo aprobó " + esc(a.aprobado) : "El documento de origen no se puede borrar mientras exista este asiento"}</span></span>
                 <div style="flex:1"></div>${a.propuesto ? `<button class="btn" data-ir="contabilidad">${icon("check")}Ir a la bandeja</button>` : ""}<button class="btn pri" id="asOk">Cerrar</button>`,
      after: root => {
        $("#asOk", root).addEventListener("click", closeSheet);
        A.wireIr(root);
        $$("tr.clickable", root).forEach(t2 => t2.addEventListener("click", () => verMayor(a.detalle[+t2.dataset.i].cta)));
      }
    });
  }

  function asientos(v) {
    const f = {
      todos: () => true,
      aprobar: a => a.propuesto,
      contador: a => !!a.aprobado,
      reglas: a => !!a.regla && !a.aprobado && !a.propuesto,
      manuales: a => a.manual || a.origen === "APERTURA"
    }[diF] || (() => true);
    const rows = D.asientos.slice().sort((a, b) => b.fecha - a.fecha || b.num - a.num)
      .filter(f)
      .filter(a => !diQ || norm(a.id + " " + a.origen + " " + a.glosa + " " + reglaDe(a)).includes(norm(diQ)))
      .slice(0, 300);
    A._diRows = rows;
    const n = k => D.asientos.filter({ aprobar: a => a.propuesto, contador: a => !!a.aprobado, reglas: a => !!a.regla && !a.aprobado && !a.propuesto, manuales: a => a.manual || a.origen === "APERTURA" }[k]).length;
    v.innerHTML = `<div class="wrap">
        <div class="scrollx">${seg("dif", [{ v: "todos", t: "Todos" }, { v: "aprobar", t: "Por aprobar · " + n("aprobar") },
      { v: "reglas", t: "De reglas de conciliación · " + n("reglas") }, { v: "contador", t: "Aprobados por el contador · " + n("contador") },
      { v: "manuales", t: "Manuales · " + n("manuales") }], diF)}</div>
        <div class="filters">
          <input class="inp" id="diq" placeholder="Buscar por asiento, origen, glosa o regla" value="${esc(diQ)}">
          <span class="mut" style="font-size:12.5px;align-self:center">${rows.length} de ${grp(D.asientos.length)}</span>
        </div>
        ${card({
      title: "Asientos", hint: "toque una fila para ver las partidas",
      body: table({
        h: "calc(100dvh - 470px)", onRow: true,
        cols: [
          { t: "Asiento", cls: "mono", fmt: r => `<b>${esc(r.id)}</b>` },
          { t: "Fecha", cls: "mono", fmt: r => fecha(r.fecha) },
          { t: "Origen", cls: "mono", fmt: r => `<span class="mut">${esc(r.origen)}</span>` },
          { t: "Glosa", fmt: r => esc(r.glosa) },
          { t: "Regla", fmt: r => `<span class="mut" style="font-size:12.5px">${esc(reglaDe(r))}</span>` },
          { t: "Monto", r: true, cls: "mono", fmt: r => grp(r.detalle.reduce((s, d) => s + (d.debe || 0), 0)) },
          { t: "", fmt: estadoAs }
        ], rows
      })
    })}</div>`;
  }
  function asientosWire(v) {
    onSeg(v, "dif", x => { diF = x; A.refresh(); });
    const q = $("#diq", v);
    if (q) q.addEventListener("input", () => { diQ = q.value; A.refresh(); setTimeout(() => { const n = $("#diq"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 0); });
    const e = $("#diExp", document); if (e) e.addEventListener("click", () => toast("Asientos exportados para Neo", "Solo los del local piloto, en el formato que Neo importa, mientras los dos sistemas conviven. Cuando se apaga Neo, esta salida se apaga con él.", "ok"));
    const n = $("#diNuevo", document); if (n) n.addEventListener("click", asientoManual);
    $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => verAsiento(A._diRows[+tr.dataset.i])));
  }

  /* asiento manual: cuadrícula de partidas manejable con el teclado (Tab entre celdas,
     Enter en la última agrega una línea); no se registra si no cuadra */
  function asientoManual() {
    if (!D.puede("Contabilidad", "Gerencia")) return toast("Su rol no registra asientos", "Un asiento manual lo registra contabilidad. Usted entró como " + D.sesion.cargo + "; cambie de usuario en el encabezado.", "cr");
    const hoy = D.ahora(), iso = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0") + "-" + String(hoy.getDate()).padStart(2, "0");
    const opts = D.cuentas.map(k => `<option value="${k.cod}">${esc(k.cod + " · " + k.nom)}</option>`).join("");
    const fila = () => `<tr class="amf"><td><input class="inp num am-cta" list="amCtas" placeholder="Cuenta" style="width:120px"></td>
      <td><span class="am-nom dim" style="font-size:12px"></span></td>
      <td><input class="inp am-gl" placeholder="Detalle de la línea"></td>
      <td><input class="inp num am-d" inputmode="numeric" style="width:120px;text-align:right" placeholder="0"></td>
      <td><input class="inp num am-h" inputmode="numeric" style="width:120px;text-align:right" placeholder="0"></td>
      <td><button class="btn sm am-x" tabindex="-1" aria-label="Quitar línea">✕</button></td></tr>`;
    openSheet({
      wide: true,
      title: "Asiento manual",
      sub: "Lo registra " + D.sesion.nom + " · queda marcado como manual y aparece en el resumen del cierre",
      body: `<datalist id="amCtas">${opts}</datalist>
        <div class="grid g2">
          ${U.field("Fecha", `<input class="inp" type="date" id="amF" value="${iso}">`)}
          ${U.field("Glosa", '<input class="inp" id="amG" placeholder="Motivo del asiento">')}</div>
        <table class="dt" style="margin-top:12px;width:100%"><thead><tr><th>Cuenta</th><th>Nombre</th><th>Detalle</th><th style="text-align:right">Debe</th><th style="text-align:right">Haber</th><th></th></tr></thead>
          <tbody id="amL">${fila()}${fila()}</tbody></table>
        <div style="display:flex;gap:10px;align-items:center;margin-top:10px"><button class="btn sm" id="amMas">${icon("plus")}Línea</button>
          <span class="dim" style="font-size:12px">Tab pasa de celda en celda · Enter en el haber de la última línea agrega otra</span><div style="flex:1"></div>
          <span id="amTot" class="num" style="font-size:13px"></span></div>
        <div class="alert wa" style="margin-top:14px;border:1px solid var(--warn-line);border-radius:11px">${icon("alert")}
          <div><b>Un asiento manual es la excepción</b><div class="mut" style="font-size:12.5px;line-height:1.5">
          Los asientos los genera el documento o una regla. Si hay que digitar uno, casi siempre falta una regla:
          el sistema lo permite, lo marca y lo muestra en el resumen que ve quien aprueba el cierre.</div></div></div>`,
      footer: `<button class="btn" id="amC">Cancelar</button><div style="flex:1"></div><button class="btn pri" id="amOk" disabled>${icon("check")}Registrar</button>`,
      after: root => {
        const num = x => parseInt(String(x.value).replace(/\D/g, ""), 10) || 0;
        const lineas = () => $$(".amf", root).map(tr => ({ tr, cta: $(".am-cta", tr).value.trim().split(" ")[0], gl: $(".am-gl", tr).value.trim(), debe: num($(".am-d", tr)), haber: num($(".am-h", tr)) }))
          .filter(l => l.cta || l.debe || l.haber);
        const calc = () => {
          const ls = lineas();
          $$(".amf", root).forEach(tr => { const k = D.ctaByCod[$(".am-cta", tr).value.trim().split(" ")[0]]; $(".am-nom", tr).textContent = k ? k.nom : $(".am-cta", tr).value ? "no existe" : ""; });
          const td = ls.reduce((s, l) => s + l.debe, 0), th = ls.reduce((s, l) => s + l.haber, 0), dif = td - th;
          const malas = ls.filter(l => !D.ctaByCod[l.cta] || (l.debe && l.haber) || (!l.debe && !l.haber));
          $("#amTot", root).innerHTML = `Debe <b>${grp(td)}</b> · Haber <b>${grp(th)}</b> · ` + (dif ? `<span style="color:var(--crit);font-weight:700">Descuadre ${c(dif)}</span>` : td ? '<span style="color:var(--ok);font-weight:700">Cuadra</span>' : "");
          $("#amOk", root).disabled = !(td && !dif && ls.length >= 2 && !malas.length && $("#amG", root).value.trim());
        };
        const conectar = tr => {
          $$("input", tr).forEach(i => i.addEventListener("input", calc));
          $(".am-x", tr).addEventListener("click", () => { if ($$(".amf", root).length > 2) tr.remove(); calc(); });
          $(".am-h", tr).addEventListener("keydown", e => { if (e.key === "Enter" && tr === $$(".amf", root).slice(-1)[0]) { e.preventDefault(); agregar(); } });
        };
        const agregar = () => { $("#amL", root).insertAdjacentHTML("beforeend", fila()); const tr = $$(".amf", root).slice(-1)[0]; conectar(tr); $(".am-cta", tr).focus(); };
        $$(".amf", root).forEach(conectar);
        $("#amG", root).addEventListener("input", calc);
        $("#amMas", root).addEventListener("click", agregar);
        $("#amC", root).addEventListener("click", closeSheet);
        $("#amOk", root).addEventListener("click", () => {
          const [y, m, d] = $("#amF", root).value.split("-").map(Number);
          const f = new Date(y, m - 1, d, 12, 0);
          const det = lineas().map(l => ({ cta: l.cta, debe: l.debe, haber: l.haber, nota: l.gl }));
          let a;
          try { a = D.asentar(f, "MAN-" + (D.asientos.filter(x => x.manual).length + 1), $("#amG", root).value.trim(), det); }
          catch (e) { return toast("No se registró", e.message, "cr"); }
          a.manual = true; a.por = D.sesion.nom;
          D.bitacora.unshift({ id: "BTM" + Date.now(), fecha: D.ahora(), usuario: D.sesion.nom, rol: D.sesion.cargo, locId: S.locId, accion: "Registró asiento manual", detalle: a.id + " · " + a.glosa, sev: "Alta", antes: "", despues: c(det.reduce((s, x) => s + x.debe, 0)), ip: D.sesion.ip });
          closeSheet(); toast("Asiento " + a.id + " registrado", "Marcado como manual, con " + D.sesion.nom + " como autor, y visible en el resumen del cierre.", "ok"); A.refresh();
        });
        setTimeout(() => $(".am-cta", root).focus(), 40);
        calc();
      }
    });
  }

  /* movimiento de una cuenta, dentro de Saldos y movimientos */
  function movimientos(v) {
    const conMov = D.cuentas.filter(x => x.debe || x.haber);
    const mov = C.mayor(saldoCta);
    const ct = D.ctaByCod[saldoCta] || {};
    const td = mov.reduce((s, m) => s + m.debe, 0), th = mov.reduce((s, m) => s + m.haber, 0);
    A._myRows = mov.slice(-250);
    v.innerHTML = `<div class="split">
        ${card({
      title: "Cuentas con movimiento", hint: conMov.length + " cuentas",
      body: `<div class="mitems" style="max-height:calc(100dvh - 360px)">${conMov.map(x =>
        `<button class="mitem" data-cta="${esc(x.cod)}" aria-selected="${x.cod === saldoCta}">
            <span style="flex:1;min-width:0"><span class="itd">${esc(x.nom)}</span><span class="itc">${esc(x.cod)}</span></span>
            <span class="num" style="font-size:12px">${sgn(C.saldoDe(x))}</span></button>`).join("")}</div>`
    })}
        <div class="wrap">
          <div><button class="btn sm" id="myAtras">${icon("chev", 'style="transform:rotate(180deg)"')}Todas las cuentas</button></div>
          <div class="grid g4">
            ${stat("Movimientos", mov.length, { txt: "partidas en el período", dir: "" })}
            ${stat("Debe", c(td), { txt: "acumulado", dir: "" })}
            ${stat("Haber", c(th), { txt: "acumulado", dir: "" })}
            ${stat("Saldo", c(C.saldoDe(ct)), { txt: (ct.tipo || "") + (C.saldoDe(ct) < 0 ? " · saldo contrario a su naturaleza" : ""), dir: "" }, C.saldoDe(ct) < 0 ? "var(--warn)" : "var(--ok)")}
          </div>
          ${card({
      title: "Movimiento de " + (ct.nom || "la cuenta"), hint: "toque un movimiento para ver su asiento",
      body: mov.length ? table({
        h: "calc(100dvh - 520px)", onRow: true,
        cols: [
          { t: "Asiento", cls: "mono", fmt: r => esc(r.as.id) },
          { t: "Fecha", cls: "mono", fmt: r => fecha(r.as.fecha) },
          { t: "Glosa", fmt: r => `${esc(r.as.glosa)}<span class="sub ui">${esc(reglaDe(r.as))}</span>` },
          { t: "Debe", r: true, cls: "mono", fmt: r => r.debe ? grp(r.debe) : '<span class="dim">—</span>' },
          { t: "Haber", r: true, cls: "mono", fmt: r => r.haber ? grp(r.haber) : '<span class="dim">—</span>' },
          { t: "Saldo", r: true, cls: "mono", fmt: r => `<b>${sgn(r.saldo)}</b>` }
        ], rows: A._myRows,
        foot: [{ v: "Totales", span: 3 }, { v: grp(td), r: true, cls: "mono" }, { v: grp(th), r: true, cls: "mono" },
        { v: sgn(C.saldoDe(ct)), r: true, cls: "mono" }]
      }) : empty("book", "Sin movimiento", "Esta cuenta no tiene partidas en el período.")
    })}
        </div></div>`;
  }

  /* balance de comprobación: saldo de la migración, movimiento del período y saldo
     final por su signo real (una cuenta de activo con saldo acreedor se ve acreedora) */
  /* saldo con su signo: negativo si va contra la naturaleza de la cuenta */
  const sgn = n => (n < 0 ? "−" : "") + grp(Math.abs(n));
  function balance(v) {
      const ap = D.asientos.find(a => a.origen === "APERTURA");
      const ini = {}; (ap ? ap.detalle : []).forEach(x => { ini[x.cta] = (ini[x.cta] || 0) + (x.debe || 0) - (x.haber || 0); });
      const rows = D.cuentas.filter(ct => ct.debe || ct.haber).map(ct => {
        const i = ini[ct.cod] || 0;
        const md = ct.debe - (i > 0 ? i : 0), mh = ct.haber - (i < 0 ? -i : 0);
        const fin = ct.debe - ct.haber;
        return { cod: ct.cod, nom: ct.nom, tipo: ct.tipo, ini: i, md, mh, fin, raro: (fin > 0 && /Pasivo|Patrimonio|Ingreso/.test(ct.tipo)) || (fin < 0 && /Activo|Gasto|Costo/.test(ct.tipo)) };
      });
      A._balRows = rows;
      const sum = f => rows.reduce((s, r) => s + f(r), 0);
      const tiD = sum(r => Math.max(0, r.ini)), tiH = sum(r => Math.max(0, -r.ini)), tmd = sum(r => r.md), tmh = sum(r => r.mh);
      const tfD = sum(r => Math.max(0, r.fin)), tfH = sum(r => Math.max(0, -r.fin));
      const cuadra = Math.round(tfD) === Math.round(tfH) && Math.round(tmd) === Math.round(tmh);
      const dc = n => n ? `${grp(Math.abs(n))} <span class="dim">${n > 0 ? "D" : "C"}</span>` : '<span class="dim">—</span>';
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Cuentas con saldo o movimiento", rows.length, { txt: "de " + D.cuentas.length + " en el catálogo", dir: "" })}
          ${stat("Movimiento de setiembre", c(tmd), { txt: "debe igual a haber: " + c(tmh), dir: "" })}
          ${stat("Saldos contrarios a su naturaleza", rows.filter(r => r.raro).length, { txt: "cuentas reguladoras y devoluciones incluidas", dir: "" }, rows.some(r => r.raro) ? "var(--warn)" : "var(--ok)")}
          ${stat(cuadra ? "Cuadra" : "Descuadre", cuadra ? "₡0" : c(Math.abs(tfD - tfH)), { txt: "saldos deudores contra acreedores", dir: cuadra ? "up" : "down" }, cuadra ? "var(--ok)" : "var(--crit)")}
        </div>
        ${card({
        title: "Balance de comprobación", hint: "saldo de la migración al 31 de agosto + movimiento de setiembre = saldo final · toque una cuenta para ver su movimiento",
        body: table({
          h: "calc(100dvh - 460px)", onRow: true,
          cols: [
            { t: "Cuenta", cls: "mono", fmt: r => esc(r.cod) },
            { t: "Descripción", fmt: r => esc(r.nom) + (r.raro ? ` <span class="dim" style="font-size:11.5px">· saldo contrario a su naturaleza</span>` : "") },
            { t: "Saldo al 31 ago", r: true, cls: "mono", fmt: r => dc(r.ini) },
            { t: "Debe", r: true, cls: "mono", fmt: r => r.md ? grp(r.md) : '<span class="dim">—</span>' },
            { t: "Haber", r: true, cls: "mono", fmt: r => r.mh ? grp(r.mh) : '<span class="dim">—</span>' },
            { t: "Saldo deudor", r: true, cls: "mono", fmt: r => r.fin > 0 ? grp(r.fin) : '<span class="dim">—</span>' },
            { t: "Saldo acreedor", r: true, cls: "mono", fmt: r => r.fin < 0 ? grp(-r.fin) : '<span class="dim">—</span>' }
          ], rows, rowCls: r => r.raro ? "wa" : "",
          foot: [{ v: "Totales", span: 2 }, { v: grp(tiD) + " D · " + grp(tiH) + " C", r: true, cls: "mono" }, { v: grp(tmd), r: true, cls: "mono" }, { v: grp(tmh), r: true, cls: "mono" },
          { v: grp(tfD), r: true, cls: "mono" }, { v: grp(tfH), r: true, cls: "mono" }]
        })
      })}</div>`;
  }

  function catalogo(v) {
      const rows = C.plan();
      A._catRows = rows;
      const sang = n => "padding-left:" + ((n - 1) * 18 + 2) + "px";
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Clases", 6, { txt: "activo, pasivo, patrimonio, ingresos, costos y gastos", dir: "" })}
          ${stat("Cuentas de movimiento", D.cuentas.length, { txt: "las únicas que admiten partidas", dir: "" })}
          ${stat("Con saldo", D.cuentas.filter(x => x.debe || x.haber).length, { txt: "el resto está disponible sin uso", dir: "" })}
          ${stat("Niveles", 4, { txt: "clase · grupo · subgrupo · cuenta", dir: "" })}
        </div>
        ${card({
        title: "Plan contable", hint: "las sumarias solo suman a sus hijas · toque una cuenta de movimiento para ver su movimiento en Libros",
        body: table({
          h: "calc(100dvh - 460px)", onRow: true,
          cols: [
            { t: "Código", cls: "mono", fmt: r => `<span style="${sang(r.nivel)};font-weight:${r.sumaria ? 700 : 500}">${esc(r.cod)}</span>` },
            { t: "Descripción", fmt: r => `<span style="font-weight:${r.sumaria ? 700 : 400}">${esc(r.nom)}</span>` },
            { t: "Tipo", fmt: r => r.nivel === 1 ? tag(r.tipo, r.tipo === "Activo" ? "ac" : r.tipo === "Ingreso" ? "ok" : "mu") : "" },
            { t: "Naturaleza", fmt: r => r.sumaria ? '<span class="dim">sumaria</span>' : tag("Movimiento", "mu") },
            { t: "Debe", r: true, cls: "mono", fmt: r => r.debe ? grp(r.debe) : '<span class="dim">—</span>' },
            { t: "Haber", r: true, cls: "mono", fmt: r => r.haber ? grp(r.haber) : '<span class="dim">—</span>' },
            { t: "Saldo", r: true, cls: "mono", fmt: r => (r.debe || r.haber) ? `<b>${grp(Math.abs(r.debe - r.haber))}</b> <span class="dim">${r.debe - r.haber >= 0 ? "D" : "C"}</span>` : '<span class="dim">sin movimiento</span>' }
          ], rows, rowCls: r => r.nivel === 1 ? "sel" : ""
        })
      })}</div>`;
  }

  function saldos(v) { if (saldoCta && D.ctaByCod[saldoCta]) movimientos(v); else balance(v); }
  function saldosWire(v) {
    if (saldoCta) {
      $$("[data-cta]", v).forEach(b => b.addEventListener("click", () => { saldoCta = b.dataset.cta; A.refresh(); }));
      const s = $('.mitem[aria-selected="true"]', v), box = s && s.closest(".mitems");
      if (box) box.scrollTop += s.getBoundingClientRect().top - box.getBoundingClientRect().top - 40;
      $("#myAtras", v).addEventListener("click", () => { saldoCta = null; A.refresh(); });
      $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => verAsiento(A._myRows[+tr.dataset.i].as)));
    } else {
      $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => { saldoCta = A._balRows[+tr.dataset.i].cod; A.refresh(); }));
    }
    const b = $("#bcExp", document); if (b) b.addEventListener("click", () => toast("Balance exportado", "Con saldos deudores y acreedores por cuenta, en Excel y en PDF.", "ok"));
  }

  function activos(v) {
      const A2 = C.ACTIVOS;
      const costo = A2.reduce((s, a) => s + a.costo, 0);
      const acum = A2.reduce((s, a) => s + a.acum, 0);
      const libros = A2.reduce((s, a) => s + a.libros, 0);
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Costo de adquisición", c(costo), { txt: A2.length + " activos", dir: "" })}
          ${stat("Depreciación acumulada", c(acum), { txt: dec(acum / costo * 100, 0) + " % del costo", dir: "" }, "var(--warn)")}
          ${stat("Valor en libros", c(libros), { txt: "lo que queda por depreciar", dir: "" }, "var(--ok)")}
          ${stat("Depreciación mensual", c(C.depMensual), { txt: "la propone el sistema; la aprueba el contador", dir: "" })}
        </div>
        ${card({
        title: "Registro de activos", hint: "el reglamento exige fecha, vida útil, depreciación del año y acumulada",
        body: table({
          cols: [
            { t: "Código", cls: "mono", fmt: r => esc(r.id) },
            { t: "Activo", fmt: r => `<b>${esc(r.nom)}</b><span class="sub ui">${esc(r.clase)}</span>` },
            { t: "Compra", cls: "mono", fmt: r => fechaL(r.compra) },
            { t: "Tasa", r: true, cls: "mono", fmt: r => r.tasa + " %" },
            { t: "Costo", r: true, cls: "mono", fmt: r => grp(r.costo) },
            { t: "Dep. mensual", r: true, cls: "mono", fmt: r => grp(r.mensual) },
            { t: "Acumulada", r: true, cls: "mono", fmt: r => grp(r.acum) },
            { t: "Valor en libros", r: true, cls: "mono", fmt: r => `<b>${grp(r.libros)}</b>` },
            { t: "Avance", fmt: r => `<div class="prog" style="width:70px"><i style="width:${r.pct}%;background:${r.pct > 85 ? "var(--warn)" : "var(--accent)"}"></i></div>` }
          ], rows: A2,
          foot: [{ v: "Totales", span: 4 }, { v: grp(costo), r: true, cls: "mono" },
          { v: grp(C.depMensual), r: true, cls: "mono" }, { v: grp(acum), r: true, cls: "mono" },
          { v: grp(libros), r: true, cls: "mono" }, { v: "" }]
        })
      })}
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Tasas del reglamento", hint: "decreto 43198-H · anexo de vidas útiles",
        body: table({
          cols: [
            { t: "Clase de activo", fmt: r => esc(r.t) },
            { t: "Tasa anual", r: true, cls: "mono", fmt: r => r.p != null ? r.p + " %" : '<span class="dim">—</span>' },
            { t: "Vida útil", r: true, cls: "mono", fmt: r => r.vida ? r.vida + " años" : `<span class="mut" style="font-size:12px">${esc(r.nota)}</span>` }
          ], rows: C.TASAS
        })
      })}
          ${card({
        title: "Reglas que el sistema aplica",
        body: `<div class="tiles">
          <div class="tile"><div class="tn">Métodos permitidos</div><div class="td">Línea recta o suma de dígitos. Una vez adoptado, no se cambia sin autorización escrita de Tributación.</div></div>
          <div class="tile"><div class="tn">Base de depreciación</div><div class="td">El costo de adquisición incluye transporte, instalación y montaje. No se deprecia el terreno.</div></div>
          <div class="tile"><div class="tn">Activos menores</div><div class="td">Lo que cueste menos de ${c(C.TOPE_GASTO)} —el 25 % de un salario base— se lleva directo al gasto, sin registrarse como activo.</div></div>
          <div class="tile"><div class="tn">Mejoras</div><div class="td">Una mejora permanente se deprecia en la vida útil que le queda al activo, no arranca de cero.</div></div>
          <div class="tile"><div class="tn">Asiento automático</div><div class="td">El sistema lo propone cada mes contra depreciación acumulada y el contador lo aprueba en la bandeja. Nadie lo digita.</div></div>
          <div class="tile"><div class="tn">Baja de activos</div><div class="td">Al vender o desechar, el sistema descarga costo y depreciación acumulada y registra la ganancia o pérdida.</div></div>
        </div>`
      })}
        </div></div>`;
  }

  A.workspace("con-libros", {
    title: "Libros",
    onArg: (tab, dato) => {
      if (tab === "saldos") saldoCta = dato && D.ctaByCod[dato] ? dato : null;
      if (tab === "asientos" && dato) { diF = dato; diQ = ""; }
    },
    tabs: [
      {
        id: "saldos", t: "Saldos y movimientos",
        sub: () => { const ct = saldoCta && D.ctaByCod[saldoCta]; return ct ? `${ct.cod} · ${ct.nom}` : "Balance de comprobación · toque una cuenta para ver su movimiento"; },
        actions: () => saldoCta ? "" : `<button class="btn" id="bcExp">${icon("print")}Exportar</button>`,
        render: saldos, wire: saldosWire
      },
      {
        id: "asientos", t: "Asientos",
        sub: () => grp(D.asientos.length) + " asientos en el período · cada uno dice qué documento o qué regla lo generó",
        badge: () => { const n = D.asientos.filter(a => a.propuesto).length; return { n, k: "wa", l: n + " por aprobar" }; },
        actions: () => `<button class="btn" id="diExp">${icon("download")}Exportar para Neo</button>
                  <button class="btn" id="diNuevo">${icon("plus")}Asiento manual</button>`,
        render: asientos, wire: asientosWire
      },
      {
        id: "activos", t: "Activos fijos",
        sub: () => C.ACTIVOS.length + " activos registrados · línea recta, tasas del reglamento",
        actions: () => `<button class="btn" id="acNuevo">${icon("plus")}Registrar activo</button>`,
        render: activos,
        wire: () => {
          const b = $("#acNuevo", document);
          if (b) b.addEventListener("click", () => toast("Registrar activo", "Con fecha, costo de adquisición (transporte e instalación incluidos), clase y vida útil del reglamento. La depreciación arranca el mes siguiente.", "ok"));
        }
      }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     4 · INFORMES — lo que lee la gerencia
     Estados financieros · Por local y familia · Presupuesto (año 2)
     ═════════════════════════════════════════════════════════════ */
  function resultados(v) {
      const r = C.resultados();
      const linea = (l, val, b, col, pct) => `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;border-bottom:1px solid var(--hair-2);${b ? "font-weight:700" : ""}">
        <span style="${b ? "" : "color:var(--ink-2)"}">${esc(l)}</span>
        <span style="display:flex;gap:18px;align-items:baseline">
          ${pct != null ? `<span class="num mut" style="font-size:12px;width:56px;text-align:right">${dec(pct, 1)} %</span>` : '<span style="width:56px"></span>'}
          <span class="num" style="${col ? "color:" + col : ""};font-size:${b ? "15px" : "13.5px"};width:132px;text-align:right">${c(val)}</span></span></div>`;
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Ventas", c(r.ing), { txt: "mercadería y servicios", dir: "up" })}
          ${stat("Utilidad bruta", c(r.bruta), { txt: pc(r.margenBruto) + " sobre ventas", dir: "up" }, "var(--ok)")}
          ${stat("Gastos de operación", c(r.gas), { txt: pc(r.ing ? r.gas / r.ing * 100 : 0) + " sobre ventas", dir: "" }, "var(--warn)")}
          ${stat("Utilidad neta", c(r.neta), { txt: pc(r.margenNeto) + " sobre ventas", dir: r.neta > 0 ? "up" : "down" }, r.neta > 0 ? "var(--ok)" : "var(--crit)")}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Estado de resultado integral", hint: "el porcentaje es sobre ventas",
        body: linea("Ventas brutas de mercadería", r.bruto, false, null, r.ing ? r.bruto / r.ing * 100 : 0) +
          linea("Devoluciones sobre ventas", -r.devol, false, null, r.ing ? -r.devol / r.ing * 100 : 0) +
          linea("Descuentos sobre ventas", -r.desc, false, null, r.ing ? -r.desc / r.ing * 100 : 0) +
          linea("Ventas netas", r.netas, true, null, r.ing ? r.netas / r.ing * 100 : 0) +
          linea("Servicios y otros ingresos", r.otros, false, null, r.ing ? r.otros / r.ing * 100 : 0) +
          (r.difCambio ? linea("Diferencial cambiario neto", r.difCambio, false, null, r.ing ? r.difCambio / r.ing * 100 : 0) : "") +
          linea("Costo de la mercadería vendida", -r.cos, false, null, r.ing ? -r.cos / r.ing * 100 : 0) +
          linea("Utilidad bruta", r.bruta, true, "var(--ok)", r.margenBruto) +
          r.gastos.map(g => linea(g.nom, -g.m, false, null, r.ing ? -g.m / r.ing * 100 : 0)).join("") +
          linea("Utilidad de operación", r.operativa, true, null, r.ing ? r.operativa / r.ing * 100 : 0) +
          (r.renta ? linea("Impuesto sobre la renta", -r.renta, false, "var(--warn)", r.ing ? -r.renta / r.ing * 100 : 0)
            : linea("Impuesto sobre la renta estimado · " + C.TASA_RENTA + " % (sin registrar; se propone en el cierre)", 0, false, "var(--warn)", null)) +
          linea("Utilidad neta del período", r.neta, true, r.neta > 0 ? "var(--ok)" : "var(--crit)", r.margenNeto)
      })}
          <div style="display:flex;flex-direction:column;gap:14px">
            ${card({
        title: "Composición de cada colón vendido",
        body: bars([
          { n: "Costo de mercadería", v: r.cos, lab: pc(r.ing ? r.cos / r.ing * 100 : 0) },
          { n: "Gastos de operación", v: r.gas, lab: pc(r.ing ? r.gas / r.ing * 100 : 0) },
          { n: "Impuesto sobre la renta", v: r.renta || r.rentaEstimada, lab: pc(r.ing ? (r.renta || r.rentaEstimada) / r.ing * 100 : 0) + (r.renta ? "" : " estimado") },
          { n: "Utilidad neta", v: Math.max(0, r.neta), lab: pc(r.margenNeto), cls: "good" }
        ], { max: r.ing })
      })}
            ${card({
        title: "Gastos por concepto",
        body: table({
          cols: [
            { t: "Concepto", fmt: g => esc(g.nom) },
            { t: "Monto", r: true, cls: "mono", fmt: g => grp(g.m) },
            { t: "%", r: true, cls: "mono", fmt: g => dec(r.gas ? g.m / r.gas * 100 : 0, 1) }
          ], rows: r.gastos
        })
      })}
          </div>
        </div></div>`;
  }

  function situacion(v) {
      const s = C.situacion(), r = C.resultados();
      const grupo = (titulo, cuentas, extra) => `<div style="margin-bottom:6px">
        <div style="font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-4);font-weight:650;padding:10px 0 4px">${esc(titulo)}</div>
        ${cuentas.map(x => `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--hair-2)">
          <span style="color:var(--ink-2);font-size:13px">${esc(x.nom)}</span><span class="num" style="font-size:13.5px">${c(C.saldoDe(x))}</span></div>`).join("")}
        ${extra || ""}</div>`;
      const totalRow = (l, m, col) => `<div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700;border-top:1px solid var(--hair)">
        <span>${esc(l)}</span><span class="num" style="font-size:15px;${col ? "color:" + col : ""}">${c(m)}</span></div>`;
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Activo total", c(s.activo), { txt: "corriente " + c(s.corriente), dir: "" })}
          ${stat("Pasivo total", c(s.pasivo), { txt: "endeudamiento " + pc(s.endeudamiento), dir: "" }, "var(--warn)")}
          ${stat("Patrimonio", c(s.patrimonio), { txt: "capital más resultados", dir: "" }, "var(--ok)")}
          ${stat("Razón corriente", dec(s.razonCorriente, 2), { txt: s.razonCorriente > 1.5 ? "holgada" : s.razonCorriente > 1 ? "ajustada" : "en riesgo", dir: s.razonCorriente > 1.5 ? "up" : "down" }, s.razonCorriente > 1.5 ? "var(--ok)" : "var(--warn)")}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Activo",
        body: grupo("Activo corriente", s.act.filter(x => x.cod.indexOf("1-01") === 0)) +
          grupo("Activo no corriente", s.act.filter(x => x.cod.indexOf("1-02") === 0)) +
          totalRow("Activo total", s.activo)
      })}
          ${card({
        title: "Pasivo y patrimonio",
        body: grupo("Pasivo corriente", s.pas, "") +
          grupo("Patrimonio", s.pat,
            `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--hair-2)">
             <span style="color:var(--ink-2);font-size:13px">Utilidad del período</span><span class="num" style="font-size:13.5px">${c(s.utilidad)}</span></div>`) +
          totalRow("Pasivo más patrimonio", s.pasivo + s.patrimonio, s.cuadra ? "var(--ok)" : "var(--crit)")
      })}
        </div>
        ${card({
        title: "Comprobación", hint: "no es un adorno: si no cuadra, algo se perdió",
        body: `<div class="strip">
          <div class="cell"><div class="cl">Activo</div><div class="cv num">${c(s.activo)}</div></div>
          <div class="cell"><div class="cl">Pasivo + patrimonio</div><div class="cv num">${c(s.pasivo + s.patrimonio)}</div></div>
          <div class="cell"><div class="cl">Diferencia</div><div class="cv num">${c(Math.abs(s.activo - s.pasivo - s.patrimonio))}</div></div>
          <div class="cell"><div class="cl">Estado</div><div class="cv">${s.cuadra ? tag("Cuadrado", "ok", "check") : tag("Descuadre", "cr", "alert")}</div></div>
        </div>`
      })}</div>`;
  }

  function flujo(v) {
      const f = C.flujo();
      const linea = (l, val, b, sub) => `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;border-bottom:1px solid var(--hair-2);${b ? "font-weight:700" : ""}">
        <span style="${b ? "" : "color:var(--ink-2)"}">${esc(l)}${sub ? `<span class="sub ui">${esc(sub)}</span>` : ""}</span>
        <span class="num" style="font-size:${b ? "15px" : "13.5px"};${val < 0 ? "color:var(--crit)" : ""}">${c(val)}</span></div>`;
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Flujo de operación", c(f.operacion), { txt: "lo que genera el negocio", dir: f.operacion > 0 ? "up" : "down" }, f.operacion > 0 ? "var(--ok)" : "var(--crit)")}
          ${stat("Flujo de inversión", c(f.inversion), { txt: "compra de activos fijos", dir: "" }, "var(--warn)")}
          ${stat("Flujo de financiamiento", c(f.financiamiento), { txt: "deuda y distribuciones", dir: "" })}
          ${stat("Efectivo final", c(f.inicial + f.neto), { txt: "variación de " + c(f.neto), dir: f.neto > 0 ? "up" : "down" })}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Flujos de efectivo", hint: "setiembre, desde la migración · método indirecto, calculado del mayor",
        body: linea("Utilidad neta del período", f.neta, true) +
          linea("Depreciación del período", f.dep, false, "no es salida de efectivo, se devuelve") +
          linea("Variación de cuentas por cobrar", f.varCxC, false, "lo facturado que aún no entra en caja") +
          linea("Variación de inventarios", f.varInv, false, "la mercadería es efectivo en la bodega") +
          linea("Variación de cuentas por pagar", f.varCxP, false, "lo que los proveedores financian") +
          linea("Otras partidas de operación", f.otros, false, "IVA, efectivo en tránsito, tarjetas por liquidar, provisiones y anticipos") +
          linea("Flujo neto de operación", f.operacion, true) +
          linea("Compra de activos fijos", f.inversion, false) +
          linea("Flujo neto de inversión", f.inversion, true) +
          linea("Amortización de deuda y distribuciones", f.financiamiento, false) +
          linea("Flujo neto de financiamiento", f.financiamiento, true) +
          linea("Variación neta del efectivo", f.neto, true) +
          linea("Efectivo al inicio del período", f.inicial, false) +
          linea("Efectivo al cierre", f.inicial + f.neto, true) +
          `<div class="hl" style="justify-content:space-between;margin-top:6px"><span>Contra caja y bancos del balance (${c(f.final)})</span>${f.cuadra ? tag("Coincide", "ok", "check") : tag("No coincide", "cr", "alert")}</div>`
      })}
          ${card({
        title: "Por qué gerencia pide este estado", hint: "el que menos se hace y más falta",
        body: `<div class="mut" style="font-size:13px;line-height:1.75">
          Una ferretería puede tener un estado de resultados excelente y no tener con qué pagar la planilla.
          La utilidad se genera al facturar; el efectivo entra al cobrar y sale al comprar inventario.
          <br><br>Los dos renglones que mueven ese número aquí son <b>cuentas por cobrar</b> e <b>inventarios</b>.
          Cada colón de más en la bodega es un colón menos en el banco, y por eso el sugerido de compra y la
          antigüedad de saldos no son temas de operación: son temas de caja.
          <br><br>Con la contabilidad conectada al inventario y a la cartera, este estado sale solo cada mes.
          Hoy no se hace, y esa es la razón por la que la decisión de comprar se toma a ciegas.</div>`
      })}
        </div></div>`;
  }

  function locales(v) {
      const rows = C.porLocal();
      const tot = k => rows.reduce((s, r) => s + r[k], 0);
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Locales con resultado", rows.length, { txt: "7 tiendas, el CEDI y dos bodegas", dir: "" })}
          ${stat("Venta del mes", c(tot("venta")), { txt: "sin IVA · volumen mensual de referencia", dir: "up" })}
          ${stat("Margen bruto promedio", pc(tot("venta") ? tot("bruta") / tot("venta") * 100 : 0), { txt: "sobre la venta consolidada", dir: "" }, "var(--ok)")}
          ${(function () {
        const t2 = rows.filter(r => r.loc.tipo === "tienda" && r.operativa < 0).length;
        return stat("Tiendas con resultado negativo", t2, { txt: "el CEDI y las bodegas son centros de costo: no venden, y su gasto lo absorbe el margen de las tiendas", dir: t2 ? "down" : "up" }, t2 ? "var(--crit)" : "var(--ok)");
      })()}
        </div>
        ${card({
        title: "Resultado por centro de costo", hint: "venta al volumen mensual · planilla real del módulo de nómina, con sus cargas",
        body: table({
          cols: [
            { t: "Local", fmt: r => `<b>${esc(r.loc.nom)}</b><span class="sub ui">${r.loc.tipo === "tienda" ? "Tienda" : r.loc.tipo === "cedi" ? "Centro de distribución" : "Bodega"}</span>` },
            { t: "Documentos", r: true, cls: "mono", fmt: r => grp(r.docs) },
            { t: "Venta", r: true, cls: "mono", fmt: r => grp(r.venta) },
            { t: "Costo", r: true, cls: "mono", fmt: r => grp(r.costo) },
            { t: "Utilidad bruta", r: true, cls: "mono", fmt: r => grp(r.bruta) },
            { t: "Margen", r: true, cls: "mono", fmt: r => `<span style="color:${r.margen < 18 && r.venta ? "var(--crit)" : "var(--ink)"}">${r.venta ? dec(r.margen, 1) + " %" : "—"}</span>` },
            { t: "Planilla", r: true, cls: "mono", fmt: r => r.planilla ? grp(r.planilla) : '<span class="dim">—</span>' },
            { t: "Gastos fijos", r: true, cls: "mono", fmt: r => grp(r.fijos) },
            { t: "Resultado", r: true, cls: "mono", fmt: r => r.loc.tipo === "tienda" ? `<b style="color:${r.operativa < 0 ? "var(--crit)" : "var(--ok)"}">${c(r.operativa)}</b>` : `<span class="mut">${c(r.operativa)}</span>` },
            { t: "", fmt: r => r.loc.tipo === "tienda" ? "" : tag("Centro de costo", "mu") }
          ], rows, rowCls: r => r.loc.tipo === "tienda" && r.operativa < 0 ? "wa" : "",
          foot: [{ v: "Consolidado", span: 2 }, { v: grp(tot("venta")), r: true, cls: "mono" },
          { v: grp(tot("costo")), r: true, cls: "mono" }, { v: grp(tot("bruta")), r: true, cls: "mono" },
          { v: "", r: true }, { v: grp(tot("planilla")), r: true, cls: "mono" },
          { v: grp(tot("fijos")), r: true, cls: "mono" }, { v: c(tot("operativa")), r: true, cls: "mono" }, { v: "" }]
        })
      })}
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Utilidad bruta por local",
        body: bars(rows.filter(r => r.venta).map(r => ({ n: r.loc.nom, v: r.bruta, lab: c(r.bruta) })))
      })}
          ${card({
        title: "La pregunta que esto contesta",
        body: `<div class="mut" style="font-size:13px;line-height:1.75">
          <b>¿Cuál local gana plata y cuál la pierde?</b> Hoy nadie lo sabe con números: se sabe cuál vende más,
          que no es lo mismo.
          <br><br>El reparto es directo — la venta y el costo salen de los documentos de cada local, la planilla
          del módulo de nómina con sus cargas, y los gastos fijos del contrato de cada local. Lo que no se reparte
          es lo que de verdad es corporativo: gerencia, contabilidad y TI.
          <br><br><span class="b">Sobre las cifras de esta pantalla:</span> el demo trae una muestra de documentos,
          no el mes entero, mientras que la planilla y los gastos fijos sí son mensuales. Para que la resta
          signifique algo, la venta se lleva al volumen mensual de Santa Rosa y los documentos del demo se usan
          como clave de reparto entre locales. En producción esa proyección desaparece: se suman los documentos
          reales del mes.
          <br><br>Un local puede vender bien y perder plata por estar sobredotado de personal o por un alquiler
          alto. Esa conversación no se puede tener sin esta tabla.</div>`
      })}
        </div></div>`;
  }

  function presupuesto(v) {
      const rows = C.presupuesto();
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Ventas contra presupuesto", pc(rows[0].pct), { txt: rows[0].dif >= 0 ? "por encima de lo planeado" : "por debajo de lo planeado", dir: rows[0].dif >= 0 ? "up" : "down" }, rows[0].dif >= 0 ? "var(--ok)" : "var(--crit)")}
          ${stat("Utilidad de operación", c(rows[6].real), { txt: "presupuestada " + c(rows[6].pres), dir: rows[6].dif >= 0 ? "up" : "down" }, rows[6].dif >= 0 ? "var(--ok)" : "var(--crit)")}
          ${stat("Renglones fuera de presupuesto", rows.filter(r => !r.bueno).length, { txt: "de " + rows.length + " controlados", dir: "" }, "var(--warn)")}
          ${stat("Revisión", "Mensual", { txt: "en la reunión de gerencia, con esta tabla", dir: "" })}
        </div>
        ${card({
        title: "Ejecución presupuestaria", hint: "acumulado del período",
        body: table({
          cols: [
            { t: "Renglón", fmt: r => `<b>${esc(r.nom)}</b>` },
            { t: "Presupuesto", r: true, cls: "mono", fmt: r => grp(r.pres) },
            { t: "Real", r: true, cls: "mono", fmt: r => grp(r.real) },
            { t: "Diferencia", r: true, cls: "mono", fmt: r => `<span style="color:${r.bueno ? "var(--ok)" : "var(--crit)"}">${c(r.dif)}</span>` },
            { t: "Desvío", r: true, cls: "mono", fmt: r => `<span style="color:${r.bueno ? "var(--ok)" : "var(--crit)"}">${dec(r.pct, 1)} %</span>` },
            { t: "", fmt: r => r.bueno ? tag("Dentro", "ok", "check") : tag("Fuera", "wa", "alert") }
          ], rows, rowCls: r => r.bueno ? "" : "wa"
        })
      })}
        ${card({
        title: "Cómo se arma", hint: "sin hoja de cálculo aparte",
        body: `<div class="mut" style="font-size:13px;line-height:1.75">
          El presupuesto se carga una vez al año por renglón y por mes, y a partir de ahí el sistema lo compara
          solo contra el libro diario. No hay que consolidar nada: lo real ya está contabilizado.
          <br><br>Lo que hace útil esta pantalla no es la comparación, es <b>quién la ve</b>. Si el encargado de
          compras ve su renglón de inventario contra el presupuesto todos los lunes, la conversación de fin de mes
          deja de ser una sorpresa.</div>`
      })}</div>`;
  }


  const exportar = () => `<button class="btn" id="efExp">${icon("print")}Exportar</button>`;
  const exportarWire = () => { const b = $("#efExp", document); if (b) b.addEventListener("click", () => toast("Estado exportado", "En PDF con el encabezado de la empresa, o en Excel con el detalle por cuenta.", "ok")); };

  let efVista = "resultados";
  const EF = {
    resultados: { t: "Resultados", sub: "Estado de resultado integral · acumulado del período fiscal 2026", f: resultados },
    situacion: { t: "Situación financiera", sub: "Estado de situación financiera al " + fechaL(D.HOY), f: situacion },
    flujo: { t: "Flujo de efectivo", sub: "Estado de flujos de efectivo · método indirecto · acumulado 2026", f: flujo }
  };
  function estados(v) {
    v.innerHTML = `<div class="wrap"><div class="scrollx">${seg("efv", Object.keys(EF).map(k => ({ v: k, t: EF[k].t })), efVista)}</div><div id="efBody"></div></div>`;
    EF[efVista].f($("#efBody", v));
  }

  function porLocal(v) {
    locales(v);
    const fam = D.margenPorFamilia();
    const box = document.createElement("div");
    box.innerHTML = card({
      title: "Margen por familia", hint: "del costo que se registra en cada venta · el mínimo lo fija compras para cada familia",
      body: table({
        cols: [
          { t: "Familia", fmt: r => `<b>${esc(r.fam.nom)}</b>` },
          { t: "Venta sin IVA", r: true, cls: "mono", fmt: r => grp(r.ing) },
          { t: "Margen", r: true, cls: "mono", fmt: r => `<span style="color:${r.margen < r.fam.min ? "var(--crit)" : "var(--ink)"}">${dec(r.margen, 1)} %</span>` },
          { t: "Mínimo", r: true, cls: "mono", fmt: r => r.fam.min + " %" },
          { t: "", fmt: r => r.margen < r.fam.min ? tag("Bajo el mínimo", "wa", "alert") : tag("En rango", "ok", "check") }
        ], rows: fam, rowCls: r => r.margen < r.fam.min ? "wa" : ""
      })
    });
    const wrap = v.firstElementChild;
    wrap.insertBefore(box.firstElementChild, wrap.lastElementChild);
  }

  A.workspace("con-informes", {
    title: "Informes",
    tabs: [
      {
        id: "estados", t: "Estados financieros", sub: () => EF[efVista].sub, actions: exportar, render: estados,
        wire: v => { onSeg(v, "efv", x => { efVista = x; A.refresh(); }); exportarWire(); }
      },
      {
        id: "local", t: "Por local y familia", sub: "Centros de costo y familias · setiembre 2026 al volumen mensual de Santa Rosa", actions: exportar, render: porLocal, wire: exportarWire,
        badge: () => { const n = C.porLocal().filter(r => r.loc.tipo === "tienda" && r.operativa < 0).length; return { n, k: "wa", l: n + " tiendas con resultado negativo" }; }
      },
      {
        id: "presupuesto", t: "Presupuesto", sub: "Año 2 · lo planeado contra lo que pasó, en la misma pantalla", actions: exportar, render: presupuesto, wire: exportarWire,
        badge: () => { const n = C.presupuesto().filter(r => !r.bueno).length; return { n, k: "wa", l: n + " renglones fuera de presupuesto" }; }
      }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     5 · CIERRE — Lista de cierre · Impuestos · Períodos
     El contador lo envía, una persona lo aprueba. Nada queda en firme
     sin un nombre detrás.
     ═════════════════════════════════════════════════════════════ */
  function resumenMes() {
    const r = C.resultados();
    const m = mesCierre();
    const delMes = D.asientos.filter(a => a.fecha.getMonth() === m.mes && a.fecha.getFullYear() === 2026 && a.origen !== "APERTURA");
    const manuales = delMes.filter(a => a.manual).length;
    /* el resumen es del mes que se cierra, no del acumulado del año */
    const mov = pref => delMes.reduce((s, a) => s + a.detalle.filter(x => x.cta.indexOf(pref) === 0).reduce((k, x) => k + (x.debe || 0) - (x.haber || 0), 0), 0);
    const ing = -mov("4"), cos = mov("5"), gas = mov("6");
    r.mes = { ing, cos, gas, bruta: ing - cos, neta: ing - cos - gas, margenBruto: ing ? (ing - cos) / ing * 100 : 0 };
    const nuevas = AU.REGLAS.filter(x => x.nueva);
    const porPagar = AU.IMPUESTOS.filter(t => t.estado !== "Presentado").reduce((s, t) => s + t.monto, 0);
    const hechos = AU.items.filter(i => i.estado === "Resuelto");
    return { r, delMes, manuales, nuevas, porPagar, revisados: hechos.filter(i => i.por !== "Sistema").length, porRegla: hechos.filter(i => i.por === "Sistema").length };
  }
  function resumenHtml() {
    const x = resumenMes(), r = x.r;
    return `<dl class="kv">
        <dt>Ventas del mes</dt><dd class="num">${c(r.mes.ing)}</dd>
        <dt>Utilidad bruta del mes</dt><dd class="num">${c(r.mes.bruta)} · ${pc(r.mes.margenBruto)}</dd>
        <dt>Gastos del mes</dt><dd class="num">−${c(r.mes.gas)}</dd>
        <dt>Resultado del mes</dt><dd class="num"><b>${c(r.mes.neta)}</b></dd>
        <dt>Utilidad acumulada del año</dt><dd class="num">${c(r.neta)}</dd>
        <dt>Asientos del mes</dt><dd><span class="num">${grp(x.delMes.length)}</span> · ${x.manuales ? x.manuales + " manual" : "ninguno manual"}</dd>
        <dt>Resueltos en la bandeja</dt><dd><span class="num">${x.revisados}</span> por el contador${x.porRegla ? " · <span class=\"num\">" + x.porRegla + "</span> por reglas nuevas" : ""}</dd>
        <dt>Reglas nuevas</dt><dd>${x.nuevas.length ? "<span class=\"num\">" + x.nuevas.length + "</span> aprendidas de la bandeja" : "ninguna"}</dd>
        <dt>Impuestos por presentar</dt><dd class="num">${c(x.porPagar)}</dd></dl>`;
  }

  function banda() {
    const est = AU.CIERRE.estado, L = AU.listaCierre(), faltan = L.filter(x => !x.ok).length, m = mesCorto();
    const ap = AU.CIERRE.aprobado;
    if (est === "Cerrado") return `<div class="stepbar ok"><div class="sbt"><b>${icon("lock")} ${esc(m[0].toUpperCase() + m.slice(1))} está cerrado</b>
        <span>Lo revisó ${esc(AU.CIERRE.enviadoPor || AU.REVISOR.nom)} y lo aprobó ${esc(ap.por)} (${esc(ap.rol)}) el ${fechaL(ap.fecha)} a las ${hora(ap.fecha)}.
        Ya no admite un asiento más sin reabrirlo con bitácora.</span></div><div class="sba">${tag("Aprobado", "ok", "check")}</div></div>`;
    if (est === "Enviado a aprobación") return `<div class="stepbar"><div class="sbt"><b>Esperando la aprobación final</b>
        <span>${esc(AU.CIERRE.enviadoPor || AU.REVISOR.nom)} lo envió el ${fechaL(AU.CIERRE.enviado)} a las ${hora(AU.CIERRE.enviado)}. Falta que una persona revise el resumen y lo apruebe.</span></div>
        <div class="sba"><button class="btn pri" data-ci="aprobar">${icon("check")}Revisar y aprobar</button></div></div>`;
    if (est === "Devuelto") { const h = AU.CIERRE.historial[0]; return `<div class="stepbar wa"><div class="sbt"><b>${esc(h.por)} devolvió el cierre</b>
        <span>«${esc(h.nota)}». La observación está en la bandeja del contador; al atenderla se vuelve a enviar.</span></div>
        <div class="sba"><button class="btn" data-ir="contabilidad">${icon("check")}Ir a la bandeja</button>${faltan ? "" : `<button class="btn pri" data-ci="enviar">${icon("arrowup")}Enviar de nuevo</button>`}</div></div>`; }
    return faltan
      ? `<div class="stepbar"><div class="sbt"><b>Faltan ${faltan} punto${faltan === 1 ? "" : "s"} para poder enviar el cierre</b>
        <span>Cada punto se pone en verde solo cuando se resuelve lo que está en la bandeja. No hay que marcar nada a mano.</span></div>
        <div class="sba"><button class="btn pri" data-ir="contabilidad">${icon("check")}Ir a la bandeja</button></div></div>`
      : `<div class="stepbar ok"><div class="sbt"><b>La lista está completa</b>
        <span>Todo cuadró y todo lo propuesto está aprobado. El contador envía el cierre y una persona le da la aprobación final.</span></div>
        <div class="sba"><button class="btn pri" data-ci="enviar">${icon("arrowup")}Enviar a aprobación</button></div></div>`;
  }

  function cierreLista(v) {
    const L = AU.listaCierre(), ok = L.filter(x => x.ok).length;
    const H = AU.CIERRE.historial;
    v.innerHTML = `<div class="wrap">
        ${banda()}
        ${flujo3()}
        <div class="grid" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Lo que el sistema revisa antes de dejar enviar", hint: ok + " de " + L.length + " listos · toque un punto para ir a resolverlo",
      body: `<div class="alerts">${L.map(x => `<button class="alert ${x.ok ? "ok" : "wa"}" data-ir="${x.ir}">${icon(x.ok ? "check" : "alert")}
            <span style="flex:1;min-width:0"><span class="at" style="display:block">${esc(x.t)}</span><span class="as">${esc(x.d)}</span></span>
            ${x.ok ? tag("Listo", "ok") : tag("Pendiente", "wa")}</button>`).join("")}</div>`
    })}
          <div style="display:flex;flex-direction:column;gap:14px">
            ${card({ title: "Resumen para quien aprueba", hint: mesCierre().nom, body: resumenHtml() })}
            ${card({
      title: "Historial del cierre", hint: H.length ? "" : "todavía sin movimientos",
      body: H.length ? H.map(h => `<div class="log"><b>${esc(h.t)}</b>${h.nota ? " · «" + esc(h.nota) + "»" : ""}
          <div class="dim" style="font-size:11.5px;margin-top:2px">${esc(h.por)} · ${esc(h.rol)} · ${fechaL(h.fecha)} ${hora(h.fecha)}</div></div>`).join("")
        : `<div class="mut" style="font-size:12.5px;line-height:1.55">Aquí queda quién envió el cierre, quién lo aprobó o lo devolvió, cuándo y con qué comentario.</div>`
    })}
          </div>
        </div>
        <div class="mut" style="font-size:12px;line-height:1.55">En el demo el cierre se puede enviar y aprobar hoy para ver el
        recorrido completo. En producción se habilita el primer día hábil del mes siguiente, cuando ya entraron todos los movimientos del banco.</div>
      </div>`;
  }

  function enviarCierre() {
    const faltan = AU.listaCierre().filter(x => !x.ok);
    if (faltan.length) return toast("Todavía no se puede enviar", "Faltan " + faltan.length + " puntos: " + faltan.map(x => x.t.toLowerCase()).join(", ") + ".", "wa");
    openSheet({
      title: "Enviar el cierre de " + mesCorto() + " a aprobación",
      sub: "Lo envía " + D.sesion.nom + " · " + D.sesion.cargo,
      body: `${resumenHtml()}
        <div style="margin-top:14px">${U.field("Nota para quien aprueba (opcional)", `<textarea class="inp" id="enNota" placeholder="Por ejemplo: la merma de Pacayas ya se explicó con la encargada de bodega."></textarea>`)}</div>`,
      footer: `<button class="btn" id="enC">Cancelar</button><div style="flex:1"></div><button class="btn pri" id="enOk">${icon("arrowup")}Enviar a aprobación</button>`,
      after: root => {
        $("#enC", root).addEventListener("click", closeSheet);
        $("#enOk", root).addEventListener("click", () => {
          const r = AU.enviarAprobacion($("#enNota", root).value.trim());
          if (r.error) return toast("No se envió", r.error, "cr");
          closeSheet();
          toast("Cierre enviado a aprobación", "Quien aprueba recibe el aviso por WhatsApp y lo ve aquí mismo, en la lista de cierre.", "ok");
          A.refresh();
        });
      }
    });
  }

  function aprobarCierre() {
    const m = mesCorto();
    const nota = AU.CIERRE.nota;
    const hechos = AU.items.filter(i => i.estado === "Resuelto" && i.grupo !== "cierre");
    openSheet({
      wide: true,
      title: "Aprobación final del cierre de " + m,
      sub: "El sistema lo preparó y " + (AU.CIERRE.enviadoPor || AU.REVISOR.nom) + " lo revisó · la decisión es de gerencia",
      body: `<div class="grid g2" style="align-items:start">
          <div class="wrap">
            <div>
              <div class="mut" style="font-size:12px;font-weight:650;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Quién aprueba</div>
              <div class="hl" style="justify-content:space-between"><span><b>${esc(D.sesion.nom)}</b> · ${esc(D.sesion.cargo)}</span>${D.puede("Gerencia") && D.sesion.nom !== AU.CIERRE.enviadoPor ? tag("Puede aprobar", "ok", "check") : tag("No puede aprobar", "cr", "alert")}</div>
              <div class="mut" style="font-size:12px;margin-top:8px;line-height:1.5">Aprueba gerencia, y nunca quien envió el cierre. En la demo se cambia de usuario en el encabezado.</div>
            </div>
            ${nota ? `<div class="alert in" style="border:1px solid var(--accent-line);border-radius:11px">${icon("chat")}<div><b>Nota del contador</b><div class="mut" style="font-size:12.5px;line-height:1.5">${esc(nota)}</div></div></div>` : ""}
            ${U.field("Comentario", `<textarea class="inp" id="apNota" placeholder="Obligatorio si lo devuelve: qué hay que revisar."></textarea>`)}
            <label class="rc"><input type="checkbox" id="apLeido"><span><b>Revisé el resumen y los estados del mes</b><span>Al aprobar, el mes se bloquea y queda su nombre en la bitácora.</span></span></label>
          </div>
          <div class="wrap">
            ${card({ title: "Resumen de " + m, body: resumenHtml() })}
            ${card({
        title: "Lo que revisó el contador", hint: hechos.length + " asuntos de la bandeja",
        body: hechos.length ? hechos.slice(0, 7).map(i => `<div class="log"><b>${esc(i.como)}</b> · ${esc(i.t)}${i.por === "Sistema" ? " · por regla" : ""}</div>`).join("")
          + (hechos.length > 7 ? `<div class="dim" style="font-size:12px;padding-top:8px">y ${hechos.length - 7} más en la bitácora</div>` : "")
          : `<div class="mut" style="font-size:12.5px">El sistema resolvió todo solo este mes.</div>`
      })}
          </div></div>`,
      footer: `<button class="btn" id="apDev">${icon("swap")}Devolver al contador</button><div style="flex:1"></div>
               <button class="btn pri" id="apOk">${icon("lock")}Aprobar y cerrar ${esc(m)}</button>`,
      after: root => {

        $("#apDev", root).addEventListener("click", () => {
          const n = $("#apNota", root).value.trim();
          if (!n) { toast("Falta el comentario", "Escriba qué hay que revisar; le llega al contador en su bandeja.", "wa"); $("#apNota", root).focus(); return; }
          if (!AU.devolverCierre(null, n)) return toast("No se devolvió", "Devolver el cierre lo hace gerencia.", "cr");
          closeSheet();
          toast("Cierre devuelto a " + nombre(AU.REVISOR.nom), "La observación quedó en su bandeja. Cuando la atienda, lo vuelve a enviar.", "wa");
          A.refresh();
        });
        $("#apOk", root).addEventListener("click", () => {
          if (!$("#apLeido", root).checked) { toast("Falta confirmar la revisión", "Marque que revisó el resumen y los estados del mes.", "wa"); return; }
          const cerrado = AU.aprobarCierre($("#apNota", root).value.trim());
          if (cerrado.error) return toast("No se aprobó", cerrado.error, "cr");
          closeSheet();
          toast(cerrado.nom[0].toUpperCase() + cerrado.nom.slice(1) + " cerrado", "Aprobado por " + D.sesion.nom + ". Ya no admite asientos con fecha de ese mes; " + (AU.mesAbierto() || { nom: "el siguiente" }).nom + " queda abierto.", "ok");
          A.refresh();
        });
      }
    });
  }
  function cierreWire(v) {
    A.wireIr(v);
    $$("[data-ci]", document).forEach(b => b.addEventListener("click", () => (b.dataset.ci === "enviar" ? enviarCierre() : aprobarCierre())));
  }

  /* impuestos: el sistema prellena, el contador revisa y una persona presenta */
  const TX = { "Borrador listo": ["mu", "file"], "Revisado": ["wa", "check"], "Presentado": ["ok", "check"] };
  function borradores() {
    const T = AU.IMPUESTOS;
    return card({
      title: "Declaraciones de " + mesCorto(), hint: "el sistema las prellena · el contador las revisa · una persona las presenta",
      body: table({
        onRow: true,
        cols: [
          { t: "Obligación", fmt: x => `<b>${esc(x.t)}</b><span class="sub ui">${esc(x.ent)} · ${esc(x.periodo)}</span>` },
          { t: "Vence", cls: "mono", fmt: x => esc(x.vence) },
          { t: "Monto", r: true, cls: "mono", fmt: x => grp(x.monto) },
          { t: "Estado", fmt: x => `${tag(x.estado, TX[x.estado][0], TX[x.estado][1])}${x.presentado ? `<span class="sub ui">${esc(x.presentado.comprobante)}</span>` : x.revisado ? `<span class="sub ui">por ${esc(nombre(x.revisado.por))}</span>` : ""}` },
          { t: "", r: true, fmt: () => `<span class="mut" style="font-size:12.5px">Ver ${icon("chev")}</span>` }
        ], rows: T, rowCls: x => x.estado === "Presentado" ? "" : /30 set/.test(x.vence) ? "wa" : "",
        foot: [{ v: "Total", span: 2 }, { v: grp(T.reduce((s, x) => s + x.monto, 0)), r: true, cls: "mono" }, { v: "", span: 2 }]
      })
    });
  }
  function verBorrador(x) {
    const quien = AU.APROBADORES;
    openSheet({
      title: x.t, sub: x.ent + " · " + x.periodo + " · vence el " + x.vence,
      body: `${table({
        cols: [
          { t: "Renglón", fmt: l => esc(l[0]) },
          { t: "Monto", r: true, cls: "mono", fmt: l => l[1] == null ? "" : /Colaboradores/.test(l[0]) ? grp(l[1]) : c(l[1]) }
        ], rows: x.lineas, rowCls: (l, i) => i === x.lineas.length - 1 ? "sel" : ""
      })}
        <div class="mut" style="font-size:12.5px;margin-top:12px;line-height:1.55">Sale de: ${esc(x.origen)}.
        ServeCore no presenta la declaración: la persona la presenta en ${/Municipalidad/.test(x.ent) ? "la municipalidad" : "TRIBU-CR"} con este borrador y registra aquí el comprobante.</div>
        ${x.estado === "Revisado" ? `<div style="margin-top:14px">${U.field("La presenta", `<select id="txQuien">${quien.map((p, i) => `<option value="${i}">${esc(p.nom)} · ${esc(p.rol)}</option>`).join("")}</select>`)}</div>` : ""}
        ${x.presentado ? `<dl class="kv" style="margin-top:14px"><dt>Presentada por</dt><dd>${esc(x.presentado.por)}</dd><dt>Fecha</dt><dd>${fechaL(x.presentado.fecha)} ${hora(x.presentado.fecha)}</dd><dt>Comprobante</dt><dd class="num">${esc(x.presentado.comprobante)}</dd></dl>` : ""}`,
      footer: `<button class="btn" id="txPdf">${icon("download")}Descargar borrador</button><div style="flex:1"></div>
        ${x.estado === "Borrador listo" ? `<button class="btn pri" id="txRev">${icon("check")}Marcar como revisado</button>`
          : x.estado === "Revisado" ? `<button class="btn pri" id="txPres">${icon("check")}Registrar la presentación</button>`
            : `<button class="btn pri" id="txOk">Cerrar</button>`}`,
      after: root => {
        $("#txPdf", root).addEventListener("click", () => toast("Borrador descargado", "En el orden de los renglones del formulario, para copiarlo tal cual.", "ok"));
        const rev = $("#txRev", root), pres = $("#txPres", root), ok = $("#txOk", root);
        if (rev) rev.addEventListener("click", () => { AU.revisarImpuesto(x.id); closeSheet(); toast("Borrador revisado", x.t + " · revisado por " + AU.REVISOR.nom + ". Ya se puede presentar.", "ok"); A.refresh(); });
        if (pres) pres.addEventListener("click", () => {
          const p = quien[+$("#txQuien", root).value];
          const r = AU.presentarImpuesto(x.id, p);
          closeSheet(); toast("Presentación registrada", x.t + " · comprobante " + r.presentado.comprobante + " · " + p.nom, "ok"); A.refresh();
        });
        if (ok) ok.addEventListener("click", closeSheet);
      }
    });
  }

  function impuestos(v) {
      const r = C.resultados();
      const R = C.RENTA;
      const pend = C.CALENDARIO.filter(x => x.estado === "Pendiente" || x.estado === "Próximo");
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Renta del período", c(r.renta || r.rentaEstimada), { txt: r.renta ? "registrada en el mayor" : C.TASA_RENTA + " % estimado · se registra al aprobar el cierre", dir: "" }, "var(--warn)")}
          ${stat("Tarifa aplicable", "30 %", { txt: "ingresos brutos sobre " + c(R.umbral), dir: "" })}
          ${stat("Obligaciones pendientes", pend.length, { txt: pend.map(x => x.t.split("·")[0].trim()).slice(0, 2).join(" · "), dir: pend.length ? "down" : "up" }, pend.length ? "var(--warn)" : "var(--ok)")}
          ${stat("Próximo pago parcial", "30 de setiembre", { txt: "segundo de los tres del año", dir: "" }, "var(--crit)")}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Calendario tributario 2026", hint: "el sistema avisa tres días antes de cada vencimiento",
        body: table({
          h: "calc(100dvh - 430px)",
          cols: [
            { t: "Vence", fmt: r2 => `<b>${esc(r2.f)}</b>` },
            { t: "Obligación", fmt: r2 => `${esc(r2.t)}<span class="sub ui">${esc(r2.ent)}</span>` },
            { t: "Periodicidad", fmt: r2 => tag(r2.per, "mu") },
            { t: "Estado", fmt: r2 => tag(r2.estado, r2.estado === "Pendiente" ? "wa" : r2.estado === "Próximo" ? "cr" : r2.estado === "No aplica" ? "mu" : "ok", r2.estado === "Pendiente" || r2.estado === "Próximo" ? "clock" : "check") }
          ], rows: C.CALENDARIO, rowCls: r2 => r2.estado === "Próximo" ? "wa" : ""
        })
      })}
          <div style="display:flex;flex-direction:column;gap:14px">
            ${card({
        title: "Impuesto sobre las utilidades", hint: "formulario " + R.formulario + " en TRIBU-CR (antes " + R.formularioAnterior + ")",
        body: `<dl class="kv">
          <dt>Período fiscal</dt><dd>${esc(C.MARCO.periodo)}</dd>
          <dt>Declaración</dt><dd>a más tardar el ${esc(R.plazo)}</dd>
          <dt>Tarifa general</dt><dd class="num">${R.tarifaGeneral} %</dd>
          <dt>Umbral de la escala reducida</dt><dd class="num">${c(R.umbral)}</dd>
          <dt>Pagos parciales</dt><dd>${R.parciales.join(" · ")}</dd>
          <dt>Base del parcial</dt><dd style="font-weight:500;font-size:12px;text-align:right">${esc(R.baseParcial)}</dd></dl>
        <div class="mut" style="font-size:12.5px;margin-top:12px;line-height:1.6">
          Santa Rosa factura muy por encima del umbral, así que aplica la tarifa del 30 %. La escala reducida
          de 5 % a 20 % existe, pero es para empresas pequeñas.</div>`
      })}
            ${card({
        title: "Impuesto a las personas jurídicas", hint: "Ley 9428 · vence el 31 de enero",
        body: table({
          cols: [
            { t: "Condición", fmt: x => `${esc(x.t)}${x.aplica ? " " + tag("Aplica", "ac") : ""}` },
            { t: "%", r: true, cls: "mono", fmt: x => x.p + " %" },
            { t: "Monto", r: true, cls: "mono", fmt: x => grp(x.m) }
          ], rows: C.IPJ
        }) + `<div class="mut" style="font-size:12.5px;margin-top:12px;line-height:1.6">
          Sobre el salario base de ${c(C.MARCO.salarioBase)}, que en 2026 no cambió. Tres años sin pagarlo
          disuelven la sociedad de oficio.</div>`
      })}
          </div>
        </div>
        ${card({
        title: "Escala reducida del impuesto sobre las utilidades", hint: "para ingresos brutos hasta " + c(R.umbral),
        body: table({
          cols: [
            { t: "Renta neta", fmt: (x, i) => i === 0 ? "Hasta " + grp(x.hasta) : x.hasta ? "De " + grp(R.escala[i - 1].hasta) + " a " + grp(x.hasta) : "Sobre " + grp(R.escala[i - 1].hasta) },
            { t: "Tarifa", r: true, cls: "mono", fmt: x => x.p + " %" }
          ], rows: R.escala
        })
      })}</div>`;
  }

  function cierreImpuestos(v) {
    const T = AU.IMPUESTOS;
    const tmp = document.createElement("div");
    impuestos(tmp);
    const viejo = tmp.firstElementChild;
    const st = viejo.querySelector(".grid.g4"); if (st) st.remove();
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Borradores listos", T.filter(x => x.estado === "Borrador listo").length, { txt: "prellenados con los datos del mes", dir: "" })}
          ${stat("Revisados", T.filter(x => x.estado === "Revisado").length, { txt: "por " + AU.REVISOR.nom, dir: "" }, "var(--warn)")}
          ${stat("Presentados", T.filter(x => x.estado === "Presentado").length + " de " + T.length, { txt: "con su comprobante registrado", dir: "up" }, "var(--ok)")}
          ${stat("Próximo vencimiento", "30 de setiembre", { txt: "pago parcial de renta y patentes", dir: "" }, "var(--crit)")}
        </div>
        ${borradores()}
        ${viejo.innerHTML}</div>`;
    A._txRows = T;
  }
  function cierreImpuestosWire(v) {
    const tb = $("table.dt", v);
    if (tb) $$("tbody tr.clickable", tb).forEach(tr => tr.addEventListener("click", () => verBorrador(A._txRows[+tr.dataset.i])));
  }

  function periodos(v) {
    const rows = C.cierres;
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Períodos cerrados", rows.filter(r => r.bloqueado).length, { txt: "de " + rows.length + " del año", dir: "up" }, "var(--ok)")}
          ${stat("Período abierto", (rows.find(r => !r.bloqueado) || {}).nom || "ninguno", { txt: "admite asientos", dir: "" }, "var(--warn)")}
          ${stat("Quién cierra", "Una persona", { txt: "el sistema prepara, el contador revisa y alguien aprueba", dir: "" })}
          ${stat("Reapertura", "Con bitácora", { txt: "queda quién, cuándo y por qué · cierre anual el 31 de diciembre", dir: "" })}
        </div>
        ${card({
      title: "Períodos del año", hint: "un período cerrado no admite un asiento más",
      body: table({
        cols: [
          { t: "Período", fmt: r => `<b>${esc(r.nom)}</b>` },
          { t: "Asientos", r: true, cls: "mono", fmt: r => (r.mes <= 7 ? '<span class="dim">migrado</span>' : grp(r.bloqueado ? r.asientos : D.asientos.filter(a => a.fecha.getMonth() === r.mes && a.origen !== "APERTURA").length)) },
          { t: "Estado", fmt: r => (r.bloqueado ? tag("Cerrado", "ok", "lock") : tag("Abierto", "wa")) },
          { t: "Revisó", fmt: r => r.bloqueado ? esc(r.revisado || AU.REVISOR.nom) : '<span class="dim">—</span>' },
          { t: "Aprobó", fmt: r => r.bloqueado ? `${esc(r.por)}${r.rol ? `<span class="sub ui">${esc(r.rol)}</span>` : ""}` : '<span class="dim">—</span>' },
          { t: "Cerrado el", cls: "mono", fmt: r => (r.cerrado ? fecha(r.cerrado) : '<span class="dim">—</span>') },
          { t: "", r: true, fmt: (r, i) => (r.mes <= 7 ? '<span class="dim" style="font-size:12px">sistema anterior</span>' : r.bloqueado ? `<button class="btn sm" data-reabrir="${i}">Reabrir</button>` : `<button class="btn sm" data-ir="con-cierre|lista">Ver la lista</button>`) }
        ], rows
      })
    })}</div>`;
  }
  function periodosWire(v) {
    A.wireIr(v);
    $$("[data-reabrir]", v).forEach(x => x.addEventListener("click", () => {
      const m = C.cierres[+x.dataset.reabrir];
      openSheet({
        title: "Reabrir " + m.nom, sub: "Lo hace gerencia · queda en la bitácora con quién, cuándo y por qué",
        body: U.field("Motivo", `<textarea class="inp" id="raMot" placeholder="Por ejemplo: llegó una factura de proveedor de ese mes que hay que registrar"></textarea>`) +
          `<div class="mut" style="font-size:12.5px;margin-top:10px">Al reabrirlo vuelve a admitir asientos con fecha del mes y tiene que pasar otra vez por la aprobación final.</div>`,
        footer: `<button class="btn" data-cerrar>Cancelar</button><div style="flex:1"></div><button class="btn pri" id="raOk">${icon("lock")}Reabrir</button>`,
        after: root => {
          $$("[data-cerrar]", root).forEach(b => b.addEventListener("click", closeSheet));
          $("#raOk", root).addEventListener("click", () => {
            const r = AU.reabrirCierre(m.mes, $("#raMot", root).value.trim());
            if (r.error) return toast("No se reabrió", r.error, "cr");
            closeSheet(); toast(m.nom + " reabierto", "Admite asientos otra vez; vuelve a pasar por la aprobación final.", "wa"); A.refresh();
          });
        }
      });
    }));
  }

  A.workspace("con-cierre", {
    title: "Cierre",
    tabs: [
      {
        id: "lista", t: "Lista de cierre",
        sub: () => "Cierre de " + mesCierre().nom + " · " + AU.CIERRE.estado.toLowerCase(),
        badge: () => { const n = AU.listaCierre().filter(x => !x.ok).length; return { n, k: "wa", l: n + " puntos pendientes" }; },
        actions: () => {
          const est = AU.CIERRE.estado;
          if (est === "Enviado a aprobación") return `<button class="btn pri" data-ci="aprobar">${icon("check")}Revisar y aprobar</button>`;
          if (est === "Cerrado") return `<button class="btn" data-ir="con-cierre|periodos">${icon("lock")}Ver períodos</button>`;
          return `<button class="btn pri" data-ci="enviar">${icon("arrowup")}Enviar a aprobación</button>`;
        },
        render: cierreLista, wire: cierreWire
      },
      {
        id: "impuestos", t: "Impuestos",
        sub: "Todo se declara y se paga en TRIBU-CR o en la municipalidad · el sistema deja el borrador listo",
        badge: () => { const n = AU.IMPUESTOS.filter(x => x.estado !== "Presentado").length; return { n, k: "wa", l: n + " por presentar" }; },
        render: cierreImpuestos, wire: cierreImpuestosWire
      },
      {
        id: "periodos", t: "Períodos",
        sub: "Los meses del año, quién los revisó y quién los aprobó",
        render: periodos, wire: periodosWire
      }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     6 · REGLAS — lo que hace que todo lo anterior funcione solo
     Catálogo de cuentas · Cuentas por familia y proveedor ·
     Reglas de conciliación · Asientos automáticos
     ═════════════════════════════════════════════════════════════ */
  const REGLAS = [
    ["Factura de venta", "Contado: caja o banco contra ventas, IVA y costo. Crédito: cuentas por cobrar e IVA diferido.", "Automático"],
    ["Tiquete electrónico", "Igual que la factura, sin cliente identificado.", "Automático"],
    ["Nota de crédito", "Reversa proporcional de venta, IVA y costo, contra el mismo período de la factura.", "Automático"],
    ["Compra aplicada", "Inventario e IVA soportado contra cuentas por pagar.", "Automático"],
    ["Recepción con diferencias", "Ingresa lo recibido; la diferencia queda en una cuenta puente hasta resolverse.", "Automático"],
    ["Traslado entre locales", "No genera asiento: el inventario no cambia de valor, cambia de bodega.", "Sin asiento"],
    ["Ajuste de merma", "Gasto por merma contra inventario, con la evidencia adjunta.", "Automático"],
    ["Cobro de cuenta por cobrar", "Banco contra cuentas por cobrar, y traslada el IVA diferido con el REP.", "Automático"],
    ["Planilla", "Salarios y cargas contra salarios por pagar, cargas por pagar y renta por pagar.", "Automático"],
    ["Provisiones laborales", "Aguinaldo, vacaciones y cesantía, mes a mes.", "Automático"],
    ["Depreciación", "Gasto del período contra depreciación acumulada, el último día del mes.", "Automático"],
    ["Gasto con factura electrónica", "Gasto e IVA soportado contra cuentas por pagar, con la cuenta de su proveedor.", "Automático"],
    ["Recibo por WhatsApp", "Gasto contra caja chica, desde la foto del recibo; el contador lo confirma.", "Propuesto"],
    ["Diferencia de caja", "Hasta la tolerancia, contra «Diferencias de caja». Más que eso, cuenta por cobrar al cajero.", "Automático"],
    ["Ajuste de costo", "Costo de ventas contra inventario cuando entra la compra de lo que se vendió sin existencia.", "Automático"],
    ["Comisión del datáfono", "Gasto financiero, descontada del lote al conciliarlo.", "Automático"],
    ["IVA diferido a 90 días", "Traslada el IVA de las ventas a crédito que cumplieron 90 días sin cobrarse.", "Propuesto"],
    ["Estimación por incobrables", "Según la antigüedad de la cartera y la política de la empresa.", "Propuesto"],
    ["Diferencial cambiario", "Revaluación de saldos en dólares al cierre.", "Automático"]
  ];

  function reglas(v) {
    v.innerHTML = `<div class="wrap">
        ${card({
      title: "Reglas de asiento automático", hint: "cada documento sabe cómo contabilizarse; la cuenta la pone su familia",
      body: table({
        cols: [
          { t: "Documento", fmt: r => `<b>${esc(r[0])}</b>` },
          { t: "Asiento", fmt: r => `<span class="mut">${esc(r[1])}</span>` },
          { t: "", fmt: r => (r[2] === "Automático" ? tag("Automático", "ok", "check") : r[2] === "Propuesto" ? tag("Lo aprueba el contador", "wa", "clock") : tag(r[2], "mu")) }
        ], rows: REGLAS
      })
    })}
        ${card({
      title: "Lo que el sistema no permite", hint: "los controles que hacen confiable el libro",
      body: `<div class="tiles">
          <div class="tile"><div class="tn">Guardar un asiento descuadrado</div><div class="td">No existe la opción. Debe es igual a haber o no se guarda.</div></div>
          <div class="tile"><div class="tn">Borrar un asiento</div><div class="td">Se reversa con otro asiento, que queda a la vista. Nada desaparece del libro.</div></div>
          <div class="tile"><div class="tn">Contabilizar en un período cerrado</div><div class="td">Ni con permiso de gerencia. Primero se reabre, con bitácora.</div></div>
          <div class="tile"><div class="tn">Borrar un documento con asiento</div><div class="td">La factura que ya se contabilizó se anula con nota de crédito, no se elimina.</div></div>
          <div class="tile"><div class="tn">Cambiar el catálogo con movimiento</div><div class="td">Una cuenta con partidas se inactiva, no se borra ni se renumera.</div></div>
          <div class="tile"><div class="tn">Cerrar sin una persona que apruebe</div><div class="td">La lista de cierre es una condición, y la aprobación final siempre lleva un nombre.</div></div>
        </div>`
    })}</div>`;
  }

  /* CON-005 de la matriz — configuración contable por ítem: la cuenta
     de destino se define por familia y el artículo la hereda; si un
     artículo trae cuenta propia, manda la del artículo. Es lo que hace
     que cada factura salga mayorizada. */
  function cuentasFamilia(f) {
    const serv = !!f.servicio;
    return {
      ventas: serv ? "4-02-02-001" : "4-01-01-001",
      descuento: serv ? null : "4-01-02-001",
      costo: serv ? null : "5-01-01-001",
      inventario: serv ? null : "1-01-04-001",
      merma: serv ? null : "6-01-03-001"
    };
  }
  function familias(v) {
    const cta = cod => cod ? `<span class="num">${esc(cod)}</span><span class="sub ui">${esc((D.ctaByCod[cod] || {}).nom || "")}</span>` : '<span class="dim">no aplica</span>';
    const rows = D.familias.map(f => {
      const arts = D.articulos.filter(a => a.fam === f.id).length;
      return { f, arts, k: cuentasFamilia(f) };
    });
    const conArt = rows.reduce((s, r) => s + r.arts, 0);
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Familias configuradas", rows.length + " de " + rows.length, { txt: "ninguna sin cuenta de destino", dir: "up" }, "var(--ok)")}
          ${stat("Artículos que heredan", grp(conArt), { txt: "toman la cuenta de su familia", dir: "" })}
          ${stat("Excepciones por artículo", 0, { txt: "cuando existe, manda la del artículo", dir: "" })}
          ${stat("Origen", "Sistema actual", { txt: "se migra con el catálogo, no se vuelve a digitar", dir: "" })}
        </div>
        ${card({
      title: "Cuenta de destino por familia", hint: "configuración contable por ítem · CON-005 de la matriz",
      actions: `<button class="btn sm" id="cfExc">${icon("plus")}Excepción por artículo</button>`,
      body: table({
        cols: [
          { t: "Familia", fmt: r => `<b>${esc(r.f.nom)}</b><span class="sub ui">${r.f.servicio ? "Servicio" : "Mercadería"} · ${r.arts} artículo${r.arts === 1 ? "" : "s"}</span>` },
          { t: "Ventas", fmt: r => cta(r.k.ventas) },
          { t: "Descuentos", fmt: r => cta(r.k.descuento) },
          { t: "Costo de ventas", fmt: r => cta(r.k.costo) },
          { t: "Inventario", fmt: r => cta(r.k.inventario) },
          { t: "Merma", fmt: r => cta(r.k.merma) }
        ], rows
      })
    })}
        ${card({
      title: "Cómo funciona", hint: "la pieza que hace posible el asiento automático",
      body: `<div class="mut" style="font-size:13px;line-height:1.75">
          Cuando la caja emite una factura, el sistema no le pregunta a nadie a qué cuenta va: la toma de la
          familia de cada artículo. Por eso cada documento sale mayorizado en el momento, que es lo que Santa Rosa
          valora hoy de su sistema actual y no quiere perder.
          <br><br>Un artículo hereda la cuenta de su familia. Si un artículo necesita otra —un insumo agropecuario
          con tarifa reducida, por ejemplo— se le asigna una cuenta propia y esa manda. Los servicios no tienen
          inventario ni costo de mercadería: van a ingresos por servicios.
          <br><br>Esta tabla se migra con el catálogo desde el sistema actual, antes del corte, para que la primera
          factura en ServeCore ya caiga en la cuenta correcta.</div>`
    })}</div>`;
  }

  function marco(v) {
    v.innerHTML = `<div class="wrap">
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Marco contable",
      body: `<dl class="kv">
          <dt>Norma aplicada</dt><dd>${esc(C.MARCO.norma)}</dd>
          <dt>Resolución</dt><dd class="num" style="font-size:12px">${esc(C.MARCO.resolucion)}</dd>
          <dt>Rige desde</dt><dd>${esc(C.MARCO.rige)}</dd>
          <dt>Período fiscal</dt><dd>${esc(C.MARCO.periodo)}</dd>
          <dt>Moneda funcional</dt><dd>${esc(C.MARCO.moneda)}</dd>
          <dt>Salario base 2026</dt><dd class="num">${c(C.MARCO.salarioBase)}</dd></dl>
        <div class="mut" style="font-size:12.5px;margin-top:12px;line-height:1.6">${esc(C.MARCO.nota)}
          Santa Rosa está en el régimen general, así que puede escoger; el sistema soporta las dos y la
          diferencia está en el detalle de las notas, no en los asientos.</div>`
    })}
          ${card({
      title: "Convivencia con el paquete contable actual", hint: "la etapa donde contabilidad todavía vive allá",
      body: `<div class="mut" style="font-size:13px;line-height:1.75">
          En la primera etapa la contabilidad sigue en el sistema actual. ServeCore no le escribe: le
          <b>exporta</b> los asientos del período en el formato que ese paquete importa, y ahí termina la
          integración.
          <br><br>Es una decisión deliberada. Una integración bidireccional con un sistema que no se controla es
          la forma más rápida de tener dos contabilidades distintas y ninguna confiable. Se lee una vez, no se
          escribe nunca — igual que con la migración de datos.
          <br><br>Cuando contabilidad se mueva a ServeCore, la exportación se apaga y ya.</div>
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
          <button class="btn sm" data-exp="Formato del paquete actual">${icon("download")}Formato del paquete actual</button>
          <button class="btn sm" data-exp="Detalle de partidas">${icon("print")}Detalle de partidas</button>
          <button class="btn sm" data-exp="Resumen por cuenta">${icon("file")}Resumen por cuenta</button></div>`
    })}
        </div></div>`;
  }

  function catalogoTab(v) {
    catalogo(v);
    const box = document.createElement("div");
    box.innerHTML = card({
      title: "Marco contable", hint: "lo que el catálogo y los estados respetan",
      body: `<dl class="kv">
          <dt>Norma aplicada</dt><dd>${esc(C.MARCO.norma)}</dd>
          <dt>Resolución</dt><dd class="num" style="font-size:12px">${esc(C.MARCO.resolucion)}</dd>
          <dt>Rige desde</dt><dd>${esc(C.MARCO.rige)}</dd>
          <dt>Período fiscal</dt><dd>${esc(C.MARCO.periodo)}</dd>
          <dt>Moneda funcional</dt><dd>${esc(C.MARCO.moneda)}</dd>
          <dt>Salario base 2026</dt><dd class="num">${c(C.MARCO.salarioBase)}</dd></dl>
        <div class="mut" style="font-size:12.5px;margin-top:12px;line-height:1.6">${esc(C.MARCO.nota)}
          Santa Rosa está en el régimen general, así que puede escoger; el sistema soporta las dos y la
          diferencia está en el detalle de las notas, no en los asientos.</div>`
    });
    v.firstElementChild.appendChild(box.firstElementChild);
  }

  function cuentasTab(v) {
    familias(v);
    const G = AU.GASTOS.filter(g => g.canal === "XML");
    const provs = [];
    G.forEach(g => {
      const n = g.prov.split(" · ")[0];
      let p = provs.find(x => x.n === n);
      if (!p) provs.push(p = { n, ced: g.ced, cta: g.cta, docs: 0, monto: 0, estado: g.estado, regla: g.regla });
      p.docs++; p.monto += g.monto;
      if (g.estado === "Por confirmar") p.estado = g.estado;
    });
    const nueva = n => AU.REGLAS.some(r => r.nueva && r.t === n);
    const box = document.createElement("div");
    box.innerHTML = card({
      title: "Cuenta por proveedor de gastos", hint: "la factura electrónica de un gasto se registra sola con la cuenta de su proveedor",
      body: table({
        cols: [
          { t: "Proveedor", fmt: p => `<b>${esc(p.n)}</b><span class="sub ui">cédula ${esc(p.ced)}</span>` },
          { t: "Cuenta", fmt: p => `<span class="num">${esc(p.cta)}</span><span class="sub ui">${esc((D.ctaByCod[p.cta] || {}).nom || "")}</span>` },
          { t: "Facturas del mes", r: true, cls: "mono", fmt: p => p.docs },
          { t: "Monto", r: true, cls: "mono", fmt: p => grp(p.monto) },
          { t: "Cómo se definió", fmt: p => nueva(p.n) ? tag("Aprendida hoy", "ok", "sparkle") : p.estado === "Por confirmar" ? tag("Proveedor nuevo · en la bandeja", "wa", "alert") : p.estado === "Registrado" ? tag("Confirmada hoy, sin regla", "mu") : `<span class="mut" style="font-size:12.5px">${esc(p.regla || "")}</span>` }
        ], rows: provs, rowCls: p => p.estado === "Por confirmar" ? "wa" : ""
      }) + `<div class="mut" style="font-size:12.5px;padding:12px 16px;line-height:1.55;border-top:1px solid var(--hair-2)">
        Con un proveedor nuevo el sistema propone la cuenta por la actividad económica del emisor y lo que dice la factura; el
        contador la confirma una vez y, si quiere, la vuelve regla. Los recibos sin factura electrónica llegan por WhatsApp como foto.</div>`,
      flush: true
    });
    const wrap = v.firstElementChild;
    wrap.insertBefore(box.firstElementChild, wrap.lastElementChild);
  }

  function conciliacionTab(v) {
    const R = AU.REGLAS;
    A._rgRows = R;
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Reglas activas", R.filter(r => r.activa).length, { txt: "de " + R.length + " configuradas", dir: "" }, "var(--ok)")}
          ${stat("Aprendidas del contador", R.filter(r => /Aprendida/.test(r.origen)).length, { txt: R.filter(r => r.nueva).length + " creadas hoy desde la bandeja", dir: "up" })}
          ${stat("Aciertos este mes", grp(R.reduce((s, r) => s + r.aciertos, 0)), { txt: "movimientos que nadie tuvo que tocar", dir: "up" }, "var(--ok)")}
          ${stat("Tolerancias", c(AU.POLITICA.toleranciaCaja) + " · " + c(AU.POLITICA.umbralCosto), { txt: "caja · ajustes de costo", dir: "" })}
        </div>
        ${card({
      title: "Reglas de conciliación", hint: "cada asiento automático dice cuál de estas lo generó",
      body: table({
        cols: [
          { t: "Regla", fmt: r => `<b>${esc(r.t)}</b>${r.nueva ? " " + tag("Nueva", "ok", "sparkle") : ""}<span class="sub ui">${esc(r.cond)}</span>` },
          { t: "Qué hace", fmt: r => `<span class="mut" style="font-size:12.5px">${esc(r.accion)}</span>` },
          { t: "Origen", fmt: r => `<span style="font-size:12.5px">${esc(r.origen)}</span>` },
          { t: "Aciertos", r: true, cls: "mono", fmt: r => grp(r.aciertos) },
          { t: "Activa", c: true, fmt: (r, i) => `<button class="swtch" role="switch" aria-checked="${r.activa}" aria-label="Activar la regla ${esc(r.t)}" data-rg="${i}"><i></i></button>` }
        ], rows: R, rowCls: r => r.nueva ? "sel" : ""
      })
    })}
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Cómo aprende", hint: "la bandeja trae cada vez menos",
      body: `<div class="mut" style="font-size:12.5px;line-height:1.7">Cuando el contador resuelve algo en la bandeja, el sistema
        le ofrece <b>«Aceptar y crear regla»</b>. La regla se aplica en el acto a lo que ya estaba esperando y, desde ahí, a todo lo
        que llegue igual. Por eso el primer mes la bandeja trae muchos asuntos y a los tres meses trae pocos.</div>`
    })}
          ${card({
      title: "El cuidado que exige", hint: "una regla mal puesta repite el error",
      body: `<div class="mut" style="font-size:12.5px;line-height:1.7">Una regla equivocada se equivoca en miles de documentos. Por eso
        las reglas se revisan con el contador antes del corte, cada asiento muestra la regla que lo generó, y apagar una regla aquí
        la detiene de inmediato sin borrar lo que ya registró.</div>`
    })}
        </div></div>`;
  }
  function conciliacionWire(v) {
    $$("[data-rg]", v).forEach(b => b.addEventListener("click", () => {
      const r = A._rgRows[+b.dataset.rg];
      r.activa = !r.activa;
      AU.anotar(r.activa ? "Activó la regla" : "Apagó la regla", r.t);
      toast(r.activa ? "Regla activada" : "Regla apagada", r.activa ? "«" + r.t + "» vuelve a resolver sola lo que le toca." : "«" + r.t + "» deja de aplicarse; lo que ya registró no cambia. Lo nuevo llega a la bandeja.", r.activa ? "ok" : "wa");
      A.refresh();
    }));
  }

  function asientosTab(v) {
    reglas(v);
    const P = AU.POLITICA;
    const box = document.createElement("div");
    box.innerHTML = `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
      ${card({
      title: "Hasta dónde decide el sistema", hint: "la política de automatización de Santa Rosa",
      body: `<dl class="kv">
          <dt>Diferencias de caja que se registran solas</dt><dd class="num">hasta ${c(P.toleranciaCaja)}</dd>
          <dt>Ajustes de costo que se registran solos</dt><dd class="num">hasta ${c(P.umbralCosto)}</dd>
          <dt>Comisión pactada del datáfono</dt><dd class="num">${dec(P.comisionDatafono, 2)} %</dd>
          ${P.incobrables.map(x => `<dt>Estimación de cartera de ${x[0]}${x[1] < 9999 ? " a " + x[1] : " o más"} días</dt><dd class="num">${x[2]} %</dd>`).join("")}
        </dl>
        <div class="mut" style="font-size:12.5px;margin-top:12px;line-height:1.6">Por encima de estos montos, el sistema propone y el
        contador decide. El cierre del mes y la presentación de impuestos los decide siempre una persona.</div>`
    })}
      ${card({
      title: "Convivencia con Neo", hint: "solo mientras el local piloto conviva con Neo",
      body: `<div class="mut" style="font-size:13px;line-height:1.75">Durante el piloto, ServeCore le <b>exporta</b> a Neo los
          asientos del local piloto en el formato que Neo importa, para que la contabilidad de Neo siga completa. No le escribe
          directo: se lee una vez, no se escribe nunca.<br><br>El día del corte la contabilidad pasa a ServeCore y esta salida se apaga.</div>
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
          <button class="btn sm" data-exp="Formato de importación de Neo">${icon("download")}Formato de Neo</button>
          <button class="btn sm" data-exp="Detalle de partidas">${icon("print")}Detalle de partidas</button>
          <button class="btn sm" data-exp="Resumen por cuenta">${icon("file")}Resumen por cuenta</button></div>`
    })}</div>`;
    v.firstElementChild.appendChild(box.firstElementChild);
  }

  A.workspace("con-reglas", {
    title: "Reglas",
    sub: "Las cuentas y las reglas que hacen que la contabilidad se lleve sola",
    tabs: [
      {
        id: "catalogo", t: "Catálogo de cuentas",
        sub: () => D.cuentas.length + " cuentas de movimiento en una estructura de cuatro niveles",
        actions: () => `<button class="btn" id="ctNueva">${icon("plus")}Nueva cuenta</button>`,
        render: catalogoTab,
        wire: v => {
          $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => { const r = A._catRows[+tr.dataset.i]; if (!r.sumaria) verMayor(r.cod); }));
          const b = $("#ctNueva", document); if (b) b.addEventListener("click", () => toast("Nueva cuenta", "Se crea bajo una cuenta sumaria. Una cuenta con partidas se inactiva, nunca se borra ni se renumera.", "ok"));
        }
      },
      {
        id: "cuentas", t: "Cuentas por familia y proveedor",
        sub: "A qué cuenta va cada venta, cada compra y cada gasto, sin preguntarle a nadie",
        badge: () => { const n = AU.GASTOS.filter(g => g.estado === "Por confirmar" && g.canal === "XML").length; return { n, k: "wa", l: n + " proveedores nuevos" }; },
        render: cuentasTab,
        wire: v => { const b = $("#cfExc", v); if (b) b.addEventListener("click", () => toast("Excepción por artículo", "Se escoge el artículo y la cuenta que reemplaza a la de su familia. Queda en la bitácora con el usuario.", "ok")); }
      },
      {
        id: "conciliacion", t: "Reglas de conciliación",
        sub: "Cómo cruza el sistema el banco, las cajas y los gastos, y lo que ha aprendido del contador",
        badge: () => { const n = AU.REGLAS.filter(r => r.nueva).length; return { n, k: "", l: n + " reglas nuevas" }; },
        render: conciliacionTab, wire: conciliacionWire
      },
      {
        id: "asientos", t: "Asientos automáticos",
        sub: "Cómo se contabiliza cada documento, y hasta dónde decide el sistema",
        render: asientosTab,
        wire: v => $$("[data-exp]", v).forEach(b => b.addEventListener("click", () => toast(b.dataset.exp + " generado", "Solo con los asientos del local piloto, listo para importar en Neo.", "ok")))
      }
    ]
  });

  A.con = { pendientes: () => AU.bandeja(), listaCierre: AU.listaCierre };
})(window);
