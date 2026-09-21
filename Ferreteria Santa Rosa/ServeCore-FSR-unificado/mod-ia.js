/* ═══════════════════════════════════════════════════════════════
   Inteligencia — agente de WhatsApp, preguntas en lenguaje natural
   y catálogo de reportes.
   El agente contesta con el inventario real: no es un guion.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, S = w.S, U = w.UI;
  const { $, $$, esc, norm, grp, c, dec, fecha, hora, icon, tag, card, stat, table, bars, barRow, lineChart,
    openSheet, closeSheet, toast, locNom, cliNom, provNom, artOf, ini, empty } = U;

  /* ══ AGENTE DE WHATSAPP ══════════════════════════════════════ */
  A.screen("whatsapp", {
    title: "Agente de WhatsApp",
    sub: () => "Consulta el mismo inventario que la caja · 15 líneas, 3 400 clientes al mes",
    pad: "pad-tight",
    render(v) {
      const th = D.waThreads.find(t => t.id === S.waSel) || D.waThreads[0];
      S.waSel = th.id;
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Conversaciones hoy", "142", { txt: "87 % resueltas sin que interviniera una persona", dir: "up" })}
          ${stat("Escaladas a una persona", "18", { txt: "monto alto, precio negociado o reclamo", dir: "" }, "var(--warn)")}
          ${stat("Pedidos creados por el agente", "23", { txt: c(2840000) + " en venta atendida", dir: "up" }, "var(--ok)")}
          ${stat("Transferencias validadas", "31", { txt: "comprobante leído y aplicado solo", dir: "" })}
        </div>
        <div class="split ancho" style="align-items:stretch;min-height:540px">
          ${card({
        body: `<div class="mut" style="font-size:12px;margin-bottom:6px">Conversaciones del día</div>
          <div class="mitems" style="max-height:none">${D.waThreads.map(t => `
            <button class="mitem" data-w="${t.id}" aria-selected="${t.id === th.id}" style="align-items:flex-start">
              <span class="avatar" style="margin-top:2px">${esc(ini(t.nom))}</span>
              <span style="flex:1;min-width:0"><span class="itd">${esc(t.nom)}</span>
                <span class="mut" style="font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.msgs[t.msgs.length - 1].t)}</span>
                <span style="margin-top:5px;display:inline-block">${tag(t.estado, t.estado.indexOf("Escalado") > -1 ? "wa" : "ok")}</span></span>
              <span class="dim num" style="font-size:11px">${esc(t.hora)}</span></button>`).join("")}</div>`
      })}
          <div class="card" style="display:flex;flex-direction:column;overflow:hidden">
            <div class="card-h" style="padding:15px 17px;border-bottom:1px solid var(--hair)">
              <span class="avatar">${esc(ini(th.nom))}</span>
              <div><h3 style="font-size:15px">${esc(th.nom)}</h3>
                <div class="mut num" style="font-size:12px">${esc(th.tel)}${th.clienteId ? " · " + esc(cliNom(th.clienteId)) : " · sin ficha de cliente"}</div></div>
              <div class="card-a">
                ${th.clienteId ? `<button class="btn sm" id="verCli">${icon("users")}Ver cliente</button>` : ""}
                <button class="btn sm" id="tomar">${icon("chat")}Tomar la conversación</button></div>
            </div>
            <div class="chat" style="flex:1;max-height:none">${th.msgs.map(m => m.de === "sys"
        ? `<div class="bub sys">${esc(m.t)}</div>`
        : `<div class="bub ${m.de}">${m.de === "bot" ? `<div class="botline">${icon("sparkle", 'style="width:12px;height:12px"')}Agente ServeCore</div>` : ""}${esc(m.t)}<span class="h">${esc(m.h)}</span></div>`).join("")}</div>
            <div style="padding:12px 15px;border-top:1px solid var(--hair);display:flex;gap:9px;align-items:center">
              <input class="inp" id="wamsg" style="flex:1" placeholder="Escriba como cliente y el agente responde con datos reales del sistema">
              <button class="btn pri" id="wasend">Enviar</button></div>
            <div style="padding:9px 15px;border-top:1px solid var(--hair-2);background:var(--surface-2);font-size:12.5px;color:var(--ink-3);display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              ${icon("info", 'style="width:15px;height:15px"')}Pruebe: «tienen cemento», «precio de la lámina de zinc», «cuánto debo».</div>
          </div>
        </div></div>`;
      const ch = $(".chat", v);
      if (ch) ch.scrollTop = ch.scrollHeight;
    },
    wire(v) {
      $$("[data-w]", v).forEach(b => b.addEventListener("click", () => { S.waSel = b.dataset.w; A.refresh(); }));
      const vc = $("#verCli", v);
      if (vc) vc.addEventListener("click", () => {
        const t = D.waThreads.find(x => x.id === S.waSel);
        A.go("clientes", t.clienteId);
      });
      const t2 = $("#tomar", v);
      if (t2) t2.addEventListener("click", () => toast("Conversación tomada", "El agente deja de responder y avisa al cliente que sigue una persona.", "in"));
      const inp = $("#wamsg", v), snd = $("#wasend", v);
      function responder() {
        const q = inp.value.trim();
        if (!q) return;
        const th = D.waThreads.find(x => x.id === S.waSel);
        const h = hora(new Date());
        th.msgs.push({ de: "cli", t: q, h });
        th.msgs.push({ de: "bot", t: contestar(q, th), h });
        th.hora = h;
        A.refresh();
      }
      if (snd) snd.addEventListener("click", responder);
      if (inp) inp.addEventListener("keydown", e => { if (e.key === "Enter") responder(); });
    }
  });

  function contestar(q, th) {
    const n = norm(q);
    const cli = th.clienteId ? D.cliById[th.clienteId] : null;
    if (/(debo|deuda|saldo|estado de cuenta)/.test(n)) {
      if (!cli || !cli.saldo) return "No tiene saldo pendiente con nosotros. Su última compra quedó al día.";
      const docs = D.documentos.filter(d => d.clienteId === cli.id && d.saldo > 0);
      return `Su saldo es de ${c(Math.round(cli.saldo))} en ${docs.length} documento(s). El más antiguo es ${docs.length ? docs[docs.length - 1].cons : "—"}. Puede pagar por SINPE al 8712-0000 o por transferencia; si me manda el comprobante lo aplico de una vez.`;
    }
    if (/(factura|comprobante|xml|pdf)/.test(n))
      return "Le reenvío al correo el XML y el PDF de sus últimos comprobantes. Si necesita uno específico, dígame el número y se lo mando.";
    if (/(horario|abren|cierran)/.test(n))
      return "Abrimos de lunes a viernes de 7:00 a.m. a 5:30 p.m., sábados de 7:00 a.m. a 4:00 p.m. y domingos de 8:00 a.m. a 12:00 m.d. en Santa Rosa y Turrialba.";
    if (/(entrega|transporte|flete|envio|envío)/.test(n))
      return "Sí hacemos entregas. A Turrialba centro el flete va desde ₡6 500 y a Pejibaye desde ₡12 000, según el peso. Dígame la dirección y el pedido y le confirmo el monto exacto.";
    if (/(corte|duplicado de llave|instalacion|mano de obra|taller)/.test(n)) {
      const s = D.articulos.filter(a => a.tipo === "Servicio");
      return `Sí, en el taller hacemos ${s.slice(0, 3).map(x => x.desc.toLowerCase() + " a " + c(x.precio)).join(", ")}. ¿Se lo agendo para hoy?`;
    }
    const tok = n.split(/\s+/).filter(x => x.length > 3);
    const arts = D.articulos.filter(a => tok.some(t => norm(a.desc + " " + a.sub + " " + a.marca).includes(t)));
    if (arts.length) {
      const a = arts[0];
      const disp = D.tiendas.map(l => ({ l, d: D.disp(a.id, l.id) })).filter(x => x.d > 0).sort((x, y) => y.d - x.d);
      const agot = D.tiendas.filter(l => D.disp(a.id, l.id) <= 0);
      let r = `${a.desc}, código ${a.cod}, a ${c(a.precio)}${a.peso ? " · pesa " + U.kg(a.peso) : ""}.`;
      if (disp.length) r += ` Disponible ahora: ${disp.slice(0, 3).map(x => x.l.nom + " " + x.d).join(" · ")}.`;
      if (agot.length) r += ` Agotado en ${agot.map(x => x.nom).join(", ")}, pero en el CEDI hay ${D.disp(a.id, "CD")} y se los bajamos mañana.`;
      if (arts.length > 1) r += ` También tengo ${arts.slice(1, 3).map(x => x.desc + " a " + c(x.precio)).join(" y ")}.`;
      if (cli && cli.limite) r += ` Su cuenta tiene crédito a ${cli.plazo} días con ${c(Math.round(cli.limite - cli.saldo))} disponibles. ¿Se lo aparto?`;
      return r;
    }
    return "No encontré ese artículo con ese nombre. ¿Me da el código o me describe para qué lo necesita? También puedo pasarle con un vendedor de piso.";
  }

  /* ══ PREGUNTAS EN LENGUAJE NATURAL ═══════════════════════════ */
  let nlQ = "", nlRes = null;
  const EJEMPLOS = [
    "Ventas por local de los últimos 7 días",
    "Artículos que se vendieron bajo el margen mínimo",
    "Los 10 artículos más vendidos del mes",
    "Clientes con saldo vencido de más de 60 días",
    "Compras por proveedor de este mes",
    "Artículos en quiebre con existencia en el CEDI"
  ];

  A.screen("preguntas", {
    title: "Preguntas en lenguaje natural",
    sub: () => "Preguntar sin depender de un reporte preprogramado",
    render(v) {
      v.innerHTML = `<div class="wrap">
        ${card({
        body: `<div style="display:flex;gap:10px;align-items:center">
            <div class="tb-search" style="flex:1;padding:11px 14px">${icon("sparkle")}
              <input id="nlq" placeholder="Escriba su pregunta como se la haría a un compañero" value="${esc(nlQ)}" style="font-size:14px"></div>
            <button class="btn pri" id="nlgo">Consultar</button></div>
          <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:12px">
            ${EJEMPLOS.map(e => `<button class="btn sm" data-ej="${esc(e)}">${esc(e)}</button>`).join("")}</div>
          <div class="mut" style="margin-top:12px;font-size:12.5px;line-height:1.55">La consulta corre contra la réplica de lectura, nunca contra la base que atiende la caja. Una pregunta pesada no puede frenar los siete locales.</div>`
      })}
        <div id="nlbox">${nlRes ? "" : card({
        body: empty("sparkle", "Haga una pregunta",
          "El sistema arma la consulta, la ejecuta sobre la réplica y le muestra la tabla o el gráfico. También le enseña qué entendió, para que usted pueda corregirlo.")
      })}</div></div>`;
      if (nlRes) pintaNL();
    },
    wire(v) {
      const run = () => { nlQ = $("#nlq", v).value; nlRes = resolver(nlQ); A.refresh(); };
      $("#nlgo", v).addEventListener("click", run);
      $("#nlq", v).addEventListener("keydown", e => { if (e.key === "Enter") run(); });
      $$("[data-ej]", v).forEach(b => b.addEventListener("click", () => { nlQ = b.dataset.ej; nlRes = resolver(nlQ); A.refresh(); }));
      const t = $("#nlTras");
      if (t) t.addEventListener("click", () => A.go("traslados"));
    }
  });

  function resolver(q) {
    const n = norm(q);
    if (/(margen minimo|bajo el margen|bajo costo|perdida)/.test(n)) {
      const rows = D.bajoMinimo().slice(0, 40);
      return {
        lee: "Líneas de venta cuyo margen quedó por debajo del mínimo de su familia, en todos los locales",
        tabla: table({
          h: "48dvh",
          cols: [
            { t: "Documento", cls: "mono", fmt: r => esc(r.doc.cons) },
            { t: "Local", fmt: r => esc(locNom(r.doc.locId)) },
            { t: "Vendedor", fmt: r => esc(r.doc.vendedor) },
            { t: "Artículo", fmt: r => esc(r.art.desc) },
            { t: "Familia", fmt: r => esc(D.famById[r.art.fam].nom) },
            { t: "Mínimo", r: true, cls: "mono", fmt: r => r.min + " %" },
            { t: "Aplicado", r: true, cls: "mono", fmt: r => `<b style="color:var(--crit)">${dec(r.margen)} %</b>` },
            { t: "No percibido", r: true, cls: "mono", fmt: r => grp(Math.max(0, r.perdida)) }
          ], rows
        }),
        resumen: `${rows.length} líneas por debajo del mínimo. Utilidad no percibida: ${c(rows.reduce((s, r) => s + Math.max(0, r.perdida), 0))}.`
      };
    }
    if (/(mas vendido|top|mejores articulos|rotacion)/.test(n)) {
      const acc = {};
      D.documentos.forEach(d => { if (d.tipo === "NC") return; d.lineas.forEach(l => { acc[l.artId] = (acc[l.artId] || 0) + l.cant * l.precio; }); });
      const rows = Object.keys(acc).map(id => ({ a: artOf(id), v: acc[id] })).sort((x, y) => y.v - x.v).slice(0, 10);
      return {
        lee: "Artículos ordenados por monto vendido en el período visible",
        grafico: bars(rows.map(r => ({ n: r.a.desc, v: r.v, lab: grp(r.v) })))
      };
    }
    if (/(vencid|mora|cobrar)/.test(n)) {
      const rows = D.documentos.filter(d => d.saldo > 0).map(d => {
        const p = D.cliById[d.clienteId] ? D.cliById[d.clienteId].plazo : 30;
        return { d, v: Math.floor((D.HOY - d.fecha) / 86400000) - p };
      }).filter(x => x.v > 30).sort((a, b) => b.v - a.v);
      return {
        lee: "Documentos con saldo cuya antigüedad supera el plazo pactado del cliente en más de 30 días",
        tabla: table({
          h: "48dvh",
          cols: [
            { t: "Cliente", fmt: r => esc(cliNom(r.d.clienteId)) },
            { t: "Documento", cls: "mono", fmt: r => esc(r.d.cons) },
            { t: "Emitida", cls: "mono", fmt: r => fecha(r.d.fecha) },
            { t: "Días vencida", r: true, cls: "mono", fmt: r => `<b style="color:var(--crit)">${r.v}</b>` },
            { t: "Saldo", r: true, cls: "mono", fmt: r => grp(r.d.saldo) }
          ], rows
        }),
        resumen: `${rows.length} documentos vencidos por ${c(rows.reduce((s, r) => s + r.d.saldo, 0))}.`
      };
    }
    if (/(quiebre|agotad|sin existencia|faltante)/.test(n)) {
      const rows = D.quiebres().filter(x => x.tipo === "Quiebre" && D.disp(x.art.id, "CD") > 0).slice(0, 40);
      return {
        lee: "Artículos con disponible en cero en una tienda que sí tienen existencia en el CEDI Isabel",
        tabla: table({
          h: "48dvh",
          cols: [
            { t: "Artículo", fmt: r => `${esc(r.art.desc)}<span class="sub">${esc(r.art.cod)}</span>` },
            { t: "Local", fmt: r => esc(locNom(r.locId)) },
            { t: "Disponible", r: true, cls: "mono", fmt: r => `<b style="color:var(--crit)">${r.e.cant - r.e.comp}</b>` },
            { t: "Mínimo", r: true, cls: "mono", fmt: r => r.e.min },
            { t: "Hay en el CEDI", r: true, cls: "mono", fmt: r => `<b style="color:var(--ok)">${grp(D.disp(r.art.id, "CD"))}</b>` }
          ], rows
        }),
        resumen: `${rows.length} quiebres que se resuelven con un traslado desde el CEDI.`,
        accion: `<button class="btn pri" id="nlTras">${icon("route")}Crear el traslado</button>`
      };
    }
    if (/(compra|proveedor)/.test(n)) {
      const acc = {};
      D.compras.forEach(o => { acc[o.provId] = (acc[o.provId] || 0) + o.total; });
      const rows = Object.keys(acc).map(id => ({ n: provNom(id), v: acc[id] })).sort((a, b) => b.v - a.v);
      return { lee: "Monto comprado por proveedor en las órdenes registradas", grafico: bars(rows.map(r => ({ n: r.n, v: r.v, lab: grp(r.v) }))) };
    }
    const vpl = D.ventaPorLocal();
    return {
      lee: "Venta del día por punto de venta, sumando facturas y tiquetes electrónicos",
      grafico: bars(vpl.map(x => ({ n: x.loc.nom, v: x.total, lab: grp(x.total) }))),
      resumen: `Total del día: ${c(vpl.reduce((s, x) => s + x.total, 0))} en ${vpl.reduce((s, x) => s + x.n, 0)} documentos.`
    };
  }

  function pintaNL() {
    const box = $("#nlbox");
    if (!box) return;
    box.innerHTML = card({
      title: "Resultado",
      actions: `${tag("Generado a partir de su pregunta", "acc", "sparkle")}<button class="btn">${icon("print")}Exportar</button><button class="btn">Guardar como reporte</button>`,
      body: `<div style="display:flex;gap:10px;align-items:flex-start;padding-bottom:12px;border-bottom:1px solid var(--hair-2)">
          ${icon("info")}<div style="font-size:12.5px;color:var(--ink-2);line-height:1.55"><strong>Lo que entendí:</strong> ${esc(nlRes.lee)}. Si no es lo que buscaba, corrija la pregunta y vuelva a consultar.</div></div>
        <div style="margin:0 -17px">${nlRes.grafico ? `<div style="padding:12px 17px 0">${nlRes.grafico}</div>` : ""}${nlRes.tabla || ""}</div>
        ${nlRes.resumen ? `<div style="padding-top:12px;margin-top:12px;border-top:1px solid var(--hair-2);font-size:13px;font-weight:600;display:flex;gap:12px;align-items:center;flex-wrap:wrap">${esc(nlRes.resumen)}<span class="gap" style="flex:1"></span>${nlRes.accion || ""}</div>` : ""}`
    });
    const t = $("#nlTras");
    if (t) t.addEventListener("click", () => A.go("traslados"));
  }

  /* ══ REPORTES ════════════════════════════════════════════════ */
  const REPORTES = [
    ["Ventas", "Informe de ventas por período", "Monto, unidades y margen por local, familia, vendedor o cliente"],
    ["Ventas", "Informe de facturas", "Detalle documento por documento con su estado en Hacienda"],
    ["Ventas", "Ventas perdidas", "Proformas y pedidos que nunca se convirtieron en factura"],
    ["Ventas", "Medios de pago por factura", "Composición del cobro por local y por terminal"],
    ["Ventas", "Comisiones y metas por vendedor", "Cumplimiento por familia y por categoría"],
    ["Inventario", "Existencias valorizadas", "Al costo promedio, por local y bodega"],
    ["Inventario", "Kardex por artículo", "Entradas y salidas con saldo corrido y documento de origen"],
    ["Inventario", "Rotación y días de cobertura", "Artículos sin movimiento y artículos por quebrar"],
    ["Inventario", "Merma y ajustes", "Por motivo, local y responsable, con evidencia"],
    ["Compras", "Compras por proveedor", "Monto, plazo y cumplimiento de entrega"],
    ["Compras", "Variación de costo", "Artículos cuyo costo cambió más allá del tope"],
    ["Compras", "Comprobantes sin aceptar", "Exposición fiscal por vencimiento del plazo"],
    ["Financiero", "Antigüedad de saldos por cobrar", "Por cliente y por rango de días"],
    ["Financiero", "Antigüedad de saldos por pagar", "Programación del pago semanal"],
    ["Financiero", "Balance de comprobación", "Del libro diario generado por los documentos"],
    ["Financiero", "Estado de resultados comparativo", "Mes contra mes y contra el año anterior"],
    ["Gerencia", "Tablero ejecutivo", "Venta, margen, tiquete y semáforos en una pantalla"],
    ["Gerencia", "Excepciones autorizadas", "Ventas bajo margen, anulaciones y sobregiros de crédito"]
  ];

  A.screen("reportes", {
    title: "Reportes",
    sub: () => "Gráfico primero, tabla si hace falta el detalle · filtros antes de generar",
    render(v) {
      const serie = D.serieSemana();
      const porLocal = D.ventaPorLocal();
      const maxLocal = Math.max.apply(null, porLocal.map(x => x.total).concat([1]));
      const acc = {};
      D.documentos.forEach(d => { if (d.tipo === "NC") return; d.lineas.forEach(l => { acc[l.artId] = (acc[l.artId] || 0) + l.cant * l.precio; }); });
      const top = Object.keys(acc).map(id => ({ a: artOf(id), v: acc[id] })).sort((x, y) => y.v - x.v).slice(0, 6);
      const famM = D.margenPorFamilia();
      const grupos = ["Ventas", "Inventario", "Compras", "Financiero", "Gerencia"];

      v.innerHTML = `<div class="wrap">
        <div class="grid g2" style="align-items:start">
          ${card({ title: "Venta de los últimos 7 días", hint: "₡ millones", body: lineChart(serie.map(s => s.total / 1e6), serie.map((s, i) => (i === 6 ? "hoy" : fecha(s.fecha))), 560, 150, { marks: serie.map(s => !!s.caida) }) })}
          ${card({ title: "Venta por local", hint: "hoy", body: porLocal.map(x => barRow(x.loc.nom, x.total, maxLocal, grp(x.total))).join("") })}
          ${card({ title: "Productos más vendidos", hint: "en el período visible", body: top.map(x => barRow(x.a.desc, x.v, top[0].v, grp(x.v))).join("") })}
          ${card({ title: "Margen por familia", hint: "contra el mínimo configurado", body: famM.map(x => barRow(x.fam.nom, x.margen, 40, dec(x.margen) + " %", x.margen < x.fam.min ? "var(--crit)" : "var(--accent)")).join("") })}
        </div>
        <div class="grid g2" style="align-items:start">
          ${grupos.map(g => card({
        cls: g === "Gerencia" ? "s12" : "", title: g, hint: REPORTES.filter(r => r[0] === g).length + " reportes",
        body: `<div style="display:flex;flex-direction:column;margin:0 -17px">${REPORTES.filter(r => r[0] === g).map(r => `
            <button class="alert in" data-rep="${esc(r[1])}">${icon("file")}
              <div style="flex:1"><div class="at">${esc(r[1])}</div><div class="as">${esc(r[2])}</div></div>
              ${icon("chev", 'style="color:var(--ink-4)"')}</button>`).join("")}</div>`
      })).join("")}
        </div>
        <div class="mut" style="font-size:12.5px;display:flex;gap:7px;align-items:center">
          ${icon("info", 'style="width:15px;height:15px"')}Ningún reporte se genera al entrar. Todos piden los filtros primero y corren contra la réplica de lectura.
        </div></div>`;
    },
    wire(v) {
      $$("[data-rep]", v).forEach(b => b.addEventListener("click", () => openSheet({
        title: b.dataset.rep, sub: "Elija los filtros antes de generar",
        body: `<div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
            <div class="field"><label>Desde</label><input type="date" value="2026-09-01"></div>
            <div class="field"><label>Hasta</label><input type="date" value="2026-09-13"></div>
            <div class="field"><label>Local</label><select><option>Todos</option>${D.tiendas.map(l => `<option>${esc(l.nom)}</option>`).join("")}</select></div>
            <div class="field"><label>Familia</label><select><option>Todas</option>${D.familias.map(f => `<option>${esc(f.nom)}</option>`).join("")}</select></div>
            <div class="field"><label>Agrupar por</label><select><option>Local</option><option>Familia</option><option>Vendedor</option><option>Cliente</option></select></div>
            <div class="field"><label>Formato</label><select><option>En pantalla</option><option>Excel</option><option>PDF</option></select></div>
          </div>
          <div style="margin-top:14px;padding:12px 14px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);font-size:12.5px;color:var(--ink-2);line-height:1.55">
            Sin límite artificial de rango de fechas: puede pedir cualquier período. La consulta corre sobre la réplica de lectura y no toca la base de la caja.</div>`,
        footer: `<button class="btn" id="cancRep">Cancelar</button><div class="gap"></div><button class="btn pri" id="okRep">${icon("chart")}Generar</button>`,
        after(el) {
          $("#cancRep", el).addEventListener("click", closeSheet);
          $("#okRep", el).addEventListener("click", () => { closeSheet(); toast("Reporte generado", "Corrió sobre la réplica de lectura; la caja no se enteró.", "ok"); });
        }
      })));
    }
  });
})(window);
