/* ═══════════════════════════════════════════════════════════════
   Facturación electrónica — versión 4.4 sobre TRIBU-CR
   Panel, emitidos, recibidos, REP, cola de envío, contingencia,
   consecutivos, llave, CABYS, IVA del período y configuración.
   Las reglas viven en fis-data.js; aquí solo se pintan.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, U = w.UI, F = w.FIS, S = w.S;
  const { $, $$, esc, norm, grp, c, dec, fecha, fechaL, fh, hora, icon, tag, card, stat, table,
    seg, onSeg, bars, donut, openSheet, closeSheet, toast, locNom, cliNom, provNom, empty } = U;

  const EST = { Aceptado: "ok", "En proceso": "wa", "En cola": "wa", Rechazado: "cr" };
  const chip50 = s => `<span class="num" style="font-size:11.5px;word-break:break-all;line-height:1.5">${esc(s)}</span>`;

  /* ══ PANEL FISCAL ════════════════════════════════════════════ */
  A.screen("fiscal", {
    title: "Facturación electrónica",
    sub: () => `Comprobantes versión ${F.NORMA.version} sobre ${F.NORMA.plataforma} · resolución ${F.NORMA.resolucion}`,
    extra: () => `<button class="btn" id="fxCola">${icon("upload")}Ver la cola de envío</button>
                  <button class="btn pri" id="fxRec">${icon("check")}Comprobantes por aceptar</button>`,
    render(v) {
      const hoy = F.delDia(), cola = F.cola();
      const rec = F.recibidos(), sin = rec.filter(r => r.estado === "Sin aceptar");
      const iva = F.ivaMes();
      const venc = F.diferidas.filter(x => x.vencido);
      const porTipo = {};
      hoy.forEach(x => porTipo[x.doc.tipo] = (porTipo[x.doc.tipo] || 0) + 1);

      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Emitidos hoy", hoy.length, { txt: Object.keys(porTipo).map(k => k + " " + porTipo[k]).join(" · "), dir: "" })}
          ${stat("Aceptados por Hacienda", hoy.filter(x => x.estado === "Aceptado").length + " de " + hoy.length,
        { txt: cola.length ? cola.length + " documentos pendientes en total" : "nada pendiente", dir: cola.length ? "down" : "up" }, cola.length ? "var(--warn)" : "var(--ok)")}
          ${stat("Sin aceptar del proveedor", sin.length, { txt: c(sin.reduce((s, r) => s + r.iva, 0)) + " de crédito fiscal en riesgo", dir: sin.length ? "down" : "up" }, sin.length ? "var(--crit)" : "var(--ok)")}
          ${stat("IVA del período", c(iva.aPagar), { txt: "débito " + c(iva.debito) + " − crédito " + c(iva.creditoFiscal), dir: "" })}
        </div>

        <div class="grid" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Lo que exige atención", hint: "cada línea tiene un plazo corriendo",
        body: `<div class="alerts">
          ${sin.length ? `<button class="alert wa" data-go="fel-recibidos">${icon("alert")}
            <div style="flex:1"><div class="at">${sin.length} comprobantes de proveedor sin aceptar</div>
            <div class="as">El mensaje de receptor vence en los primeros 8 días hábiles del mes siguiente. Después, el crédito fiscal se pierde y no se recupera.</div></div>${icon("chev")}</button>` : ""}
          ${venc.length ? `<button class="alert cr" data-go="fel-rep">${icon("clock")}
            <div style="flex:1"><div class="at">${venc.length} facturas a crédito pasaron los 90 días</div>
            <div class="as">Su IVA se declara este mes aunque no se haya cobrado: ${c(venc.reduce((s, x) => s + x.ivaDiferido, 0))}.</div></div>${icon("chev")}</button>` : ""}
          ${cola.length ? `<button class="alert wa" data-go="fel-cola">${icon("upload")}
            <div style="flex:1"><div class="at">${cola.length} comprobantes sin aceptación de Hacienda</div>
            <div class="as">${cola.filter(x => x.estado === "Rechazado").length} rechazados y ${cola.filter(x => x.estado === "En proceso").length} en proceso. Los rechazos automáticos se reintentan solos.</div></div>${icon("chev")}</button>` : ""}
          <button class="alert in" data-go="fel-llave">${icon("lock")}
            <div style="flex:1"><div class="at">La llave criptográfica vence en ${F.LLAVE.faltan} días</div>
            <div class="as">El ${fechaL(F.LLAVE.vence)}. Con la llave vencida, Hacienda rechaza todo y la facturación se detiene.</div></div>${icon("chev")}</button>
          <button class="alert in" data-go="fel-cabys">${icon("book")}
            <div style="flex:1"><div class="at">1 código CABYS retirado del catálogo</div>
            <div class="as">Un artículo del catálogo quedó con un código que ya no existe. Hacienda lo rechaza con el error 4012.</div></div>${icon("chev")}</button>
        </div>`
      })}
          ${card({
        title: "Situación de los comprobantes del día",
        body: `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:6px 0">
          ${donut(hoy.length ? Math.round(hoy.filter(x => x.estado === "Aceptado").length / hoy.length * 100) : 100, 118, "var(--ok)")}
          <div style="font-size:13px;color:var(--ink-2);text-align:center;line-height:1.6">
            Aceptados por Hacienda al primer intento.<br>
            <span class="mut" style="font-size:12.5px">El resto entra a la cola con su código de error y su motivo, no como «falló».</span></div>
        </div>
        <div class="strip" style="margin:6px -17px -16px">
          <div class="cell"><div class="cl">En proceso</div><div class="cv num">${hoy.filter(x => x.estado === "En proceso").length}</div></div>
          <div class="cell"><div class="cl">Rechazados</div><div class="cv num">${hoy.filter(x => x.estado === "Rechazado").length}</div></div>
          <div class="cell"><div class="cl">Por contingencia</div><div class="cv num">${hoy.filter(x => x.sit === "2").length}</div></div>
        </div>`
      })}
        </div>

        ${card({
        title: "Tipos de comprobante de la 4.4", hint: "el código de dos dígitos va dentro del consecutivo",
        body: table({
          cols: [
            { t: "Código", cls: "mono", fmt: r => `<b>${esc(r.cod)}</b>` },
            { t: "Comprobante", fmt: r => `${esc(r.t)}<span class="sub ui">${esc(r.sig)}</span>` },
            { t: "Lo emite FSR", fmt: r => r.emite ? tag("Sí", "ok", "check") : tag("No aplica", "mu") },
            { t: "Del mes", r: true, cls: "mono", fmt: r => { const mes = x => x.fecha.getMonth() === D.HOY.getMonth() && x.fecha.getFullYear() === D.HOY.getFullYear(); const n = (r.sig === "REP" ? F.reps : D.documentos.filter(d => d.tipo === r.sig)).filter(mes).length; return n ? grp(n) : '<span class="dim">—</span>'; } }
          ], rows: F.TIPOS
        })
      })}

        ${card({
        title: "Los plazos de la 4.4", hint: "el sistema avisa antes de cada uno",
        body: table({
          cols: [
            { t: "Obligación", fmt: r => `<b>${esc(r.t)}</b><span class="sub ui">${esc(r.d)}</span>` },
            { t: "Plazo", r: true, fmt: r => tag(r.dias, "ac") }
          ], rows: F.PLAZOS
        })
      })}
      </div>`;
    },
    wire(v) {
      $$("[data-go]", v).forEach(b => b.addEventListener("click", () => A.go(b.dataset.go)));
      const a = $("#fxCola", document); if (a) a.addEventListener("click", () => A.go("fel-cola"));
      const b = $("#fxRec", document); if (b) b.addEventListener("click", () => A.go("fel-recibidos"));
    }
  });

  /* ══ COMPROBANTES EMITIDOS ═══════════════════════════════════ */
  let emQ = "", emTipo = "Todos", emEstado = "Todos";
  A.screen("fel-emitidos", {
    title: "Comprobantes emitidos",
    sub: () => grp(D.documentos.length) + " en la ventana de la demo · ≈29 500 documentos fiscales al mes en producción",
    extra: () => `<button class="btn" id="emXml">${icon("download")}Descargar XML del período</button>`,
    render(v) {
      const rows = F.emitidos().filter(x =>
        (emTipo === "Todos" || x.doc.tipo === emTipo) &&
        (emEstado === "Todos" || x.estado === emEstado) &&
        (!emQ || norm(x.doc.cons + " " + x.doc.clave + " " + cliNom(x.doc.clienteId)).includes(norm(emQ))))
        .slice(0, 400);
      A._emRows = rows;
      v.innerHTML = `<div class="wrap">
        <div class="filters">
          <input class="inp" id="emq" placeholder="Buscar por consecutivo, clave o cliente" value="${esc(emQ)}">
          <select class="inp" id="emt">${["Todos", "FE", "TE", "NC", "ND"].map(o => `<option ${o === emTipo ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>
          <select class="inp" id="eme">${["Todos", "Aceptado", "En proceso", "Rechazado"].map(o => `<option ${o === emEstado ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>
          <span class="mut" style="font-size:12.5px;align-self:center">${rows.length} resultados</span>
        </div>
        ${card({
        title: "Emitidos", hint: "toque una fila para ver la clave, el XML y la respuesta de Hacienda",
        body: table({
          h: "calc(100dvh - 400px)", onRow: true,
          cols: [
            { t: "Consecutivo", cls: "mono", fmt: r => `<b>${esc(r.doc.cons)}</b>` },
            { t: "Tipo", fmt: r => tag(r.doc.tipo, r.doc.tipo === "NC" ? "wa" : "ac") },
            { t: "Fecha", cls: "mono", fmt: r => fh(r.doc.fecha) },
            { t: "Local", fmt: r => esc(locNom(r.doc.locId)) },
            { t: "Cliente", fmt: r => esc(cliNom(r.doc.clienteId)) },
            { t: "Gravado", r: true, cls: "mono", fmt: r => grp(r.doc.grav) },
            { t: "IVA", r: true, cls: "mono", fmt: r => grp(r.doc.iva) },
            { t: "Total", r: true, cls: "mono", fmt: r => `<b>${grp(r.doc.total)}</b>` },
            { t: "Situación", fmt: r => r.sit === "1" ? '<span class="dim">Normal</span>' : tag("Contingencia", "wa", "server") },
            { t: "Hacienda", fmt: r => tag(r.estado, EST[r.estado], r.estado === "Aceptado" ? "check" : "clock") }
          ], rows, rowCls: r => r.estado === "Rechazado" ? "cr" : r.estado === "En proceso" ? "wa" : ""
        })
      })}</div>`;
    },
    wire(v) {
      const q = $("#emq", v);
      if (q) q.addEventListener("input", () => { emQ = q.value; A.refresh(); setTimeout(() => { const n = $("#emq"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 0); });
      const t = $("#emt", v); if (t) t.addEventListener("change", () => { emTipo = t.value; A.refresh(); });
      const e = $("#eme", v); if (e) e.addEventListener("change", () => { emEstado = e.value; A.refresh(); });
      const x = $("#emXml", document); if (x) x.addEventListener("click", () => toast("XML del período", "Se arma el paquete con el XML firmado y la respuesta de Hacienda de cada comprobante. Ese archivo es del cliente, no del proveedor del sistema.", "ok"));
      $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => verComprobante(A._emRows[+tr.dataset.i])));
    }
  });

  function verComprobante(x) {
    const d = x.doc;
    const sit = F.SITUACIONES.find(s => s.cod === x.sit) || F.SITUACIONES[0];
    openSheet({
      wide: true, tight: true,
      title: d.cons,
      sub: `${d.tipo} · ${fechaL(d.fecha)} · ${cliNom(d.clienteId)}`,
      body: `<div class="ficha">
          <div class="fcell"><div class="fl">Total</div><div class="fv num">${c(d.total)}</div></div>
          <div class="fcell"><div class="fl">IVA</div><div class="fv num">${c(d.iva)}</div></div>
          <div class="fcell"><div class="fl">Hacienda</div><div class="fv" style="font-size:14px">${tag(x.estado, EST[x.estado])}</div></div>
          <div class="fcell"><div class="fl">Situación</div><div class="fv" style="font-size:14px">${esc(sit.t)}</div></div></div>
        ${card({
        title: "Clave numérica", hint: "50 dígitos, única e irrepetible",
        body: chip50(d.clave) + `<div class="mut" style="font-size:12.5px;margin-top:10px;line-height:1.6">
          País · día · mes · año · cédula del emisor · los 20 dígitos del consecutivo · situación · código de seguridad.</div>`
      })}
        ${card({
        title: "Trazabilidad del envío",
        body: `<dl class="kv">
          <dt>Emitido</dt><dd>${fh(d.fecha)}</dd>
          <dt>Transmitido a Hacienda</dt><dd>${fh(x.enviado)}</dd>
          <dt>Respuesta</dt><dd>${x.respuesta ? fh(x.respuesta) : "pendiente"}</dd>
          <dt>Intentos</dt><dd class="num">${x.intentos}</dd>
          <dt>Situación</dt><dd>${esc(sit.t)} — ${esc(sit.d)}</dd>
          <dt>Enviado al cliente</dt><dd>${x.correo ? "correo y WhatsApp" : "pendiente · el cliente no dejó correo"}</dd>
          <dt>Archivo</dt><dd>XML firmado + respuesta, retención de 5 años</dd></dl>
        ${x.err ? `<div class="alert cr" style="margin-top:14px;border:1px solid var(--crit-line);border-radius:11px">${icon("alert")}
          <div><b>Error ${esc(x.err.cod)} · ${esc(x.err.t)}</b>
          <div class="mut" style="font-size:12.5px;line-height:1.5">${esc(x.err.causa)}${x.err.auto ? " — el sistema lo corrige y reenvía solo." : " — necesita intervención."}</div></div></div>` : ""}`
      })}
        ${card({
        title: "Detalle del comprobante",
        body: table({
          cols: [
            { t: "Artículo", fmt: l => { const a = D.artById[l.artId]; return a ? esc(a.desc) : "—"; } },
            { t: "CABYS", cls: "mono", fmt: l => { const a = D.artById[l.artId]; return a ? `<span class="mut">${esc(a.cabys)}</span>` : ""; } },
            { t: "Cant.", r: true, cls: "mono", fmt: l => grp(l.cant) },
            { t: "Precio", r: true, cls: "mono", fmt: l => grp(l.precio) },
            { t: "IVA", r: true, cls: "mono", fmt: l => l.exento ? '<span class="dim">exento</span>' : "13 %" },
            { t: "Total", r: true, cls: "mono", fmt: l => grp(l.cant * l.precio * (1 - (l.desc || 0) / 100)) }
          ], rows: d.lineas.slice(0, 14),
          foot: [{ v: "Gravado " + c(d.grav) + " · exento " + c(d.exe), span: 4 }, { v: c(d.iva), r: true, cls: "mono" }, { v: c(d.total), r: true, cls: "mono" }]
        })
      })}`,
      footer: `<button class="btn" id="cbXml">${icon("download")}XML firmado</button>
               <button class="btn" id="cbPdf">${icon("print")}PDF</button>
               ${x.estado !== "Aceptado" ? `<button class="btn" id="cbRe">${icon("history")}Reenviar</button>` : ""}
               <div style="flex:1"></div><button class="btn pri" id="cbOk">Cerrar</button>`,
      after: root => {
        $("#cbOk", root).addEventListener("click", closeSheet);
        $("#cbXml", root).addEventListener("click", () => toast("XML descargado", "Con la firma XAdES y la respuesta de Hacienda adjunta.", "ok"));
        $("#cbPdf", root).addEventListener("click", () => toast("PDF generado", "Sin enlaces que autentiquen: el documento que sale al cliente no da acceso a nada.", "ok"));
        const re = $("#cbRe", root);
        if (re) re.addEventListener("click", () => { closeSheet(); toast("Comprobante reenviado", "Entra de nuevo a la cola con un intento más registrado en la bitácora.", "ok"); });
      }
    });
  }

  /* ══ COMPROBANTES RECIBIDOS ══════════════════════════════════ */
  A.screen("fel-recibidos", {
    title: "Comprobantes recibidos",
    sub: () => "Mensaje de receptor — aceptación, aceptación parcial o rechazo",
    extra: () => `<button class="btn pri" id="recAll">${icon("check")}Aceptar los que cuadran con su orden</button>`,
    render(v) {
      const rows = F.recibidos();
      const sin = rows.filter(r => r.estado === "Sin aceptar");
      A._recRows = rows;
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Sin aceptar", sin.length, { txt: sin.length ? "el más urgente vence en " + Math.min.apply(null, sin.map(r => r.venceEn)) + " días" : "todo al día", dir: sin.length ? "down" : "up" }, sin.length ? "var(--crit)" : "var(--ok)")}
          ${stat("Crédito fiscal en riesgo", c(sin.reduce((s, r) => s + r.iva, 0)), { txt: "se pierde sin recuperación retroactiva", dir: "" }, "var(--crit)")}
          ${stat("Aceptados", rows.filter(r => /Aceptado/.test(r.estado)).length, { txt: "con mensaje de receptor transmitido", dir: "up" }, "var(--ok)")}
          ${stat("Sin orden de compra", rows.filter(r => !r.ocLigada).length, { txt: "entraron sin orden previa — revisión manual", dir: "" }, "var(--warn)")}
        </div>
        ${card({
        title: "Comprobantes de proveedor", hint: "toque una fila para responder el mensaje de receptor",
        body: table({
          h: "calc(100dvh - 400px)", onRow: true,
          cols: [
            { t: "Clave", cls: "mono", fmt: r => `<span class="mut">${esc(r.clave.slice(0, 28))}…</span>` },
            { t: "Proveedor", fmt: r => esc(provNom(r.provId)) },
            { t: "Tipo", cls: "mono", fmt: r => `${esc(r.tipoCod)} · ${esc(r.tipo.replace(" electrónica", "").replace(" electrónico", ""))}` },
            { t: "Fecha", cls: "mono", fmt: r => fecha(r.fecha) },
            { t: "Monto", r: true, cls: "mono", fmt: r => grp(r.monto) },
            { t: "IVA acreditable", r: true, cls: "mono", fmt: r => grp(r.iva) },
            { t: "Orden ligada", cls: "mono", fmt: r => r.ocLigada ? `<span class="mut">${esc(r.ocLigada)}</span>` : tag("Sin orden", "wa", "alert") },
            { t: "Vence en", r: true, cls: "mono", fmt: r => r.estado === "Sin aceptar" ? `<b style="color:${r.venceEn <= 2 ? "var(--crit)" : "var(--warn)"}">${r.venceEn} d</b>` : '<span class="dim">—</span>' },
            { t: "Estado", fmt: r => r.estado === "Sin aceptar" ? tag("Sin aceptar", "cr", "alert") : tag(r.estado, r.estado === "Rechazado" ? "wa" : "ok", "check") }
          ], rows, rowCls: r => r.estado === "Sin aceptar" && r.venceEn <= 2 ? "cr" : r.estado === "Sin aceptar" ? "wa" : ""
        })
      })}
        ${card({
        title: "Las tres respuestas posibles", hint: "cada una tiene su efecto en el IVA",
        body: `<div class="tiles">
          <div class="tile"><div class="tn">Aceptación · código 05</div><div class="td">El documento está correcto. Da derecho al crédito fiscal completo.</div></div>
          <div class="tile"><div class="tn">Aceptación parcial · código 06</div><div class="td">Parte de lo facturado no corresponde. Solo esa parte es acreditable, y el proveedor debe emitir la nota de crédito.</div></div>
          <div class="tile"><div class="tn">Rechazo · código 07</div><div class="td">La compra nunca ocurrió o no es de esta empresa. Sin crédito fiscal, y el proveedor tiene que anularlo.</div></div>
          <div class="tile"><div class="tn">No responder</div><div class="td">Es la peor de las cuatro. El comprobante deja de respaldar el crédito de IVA y el gasto deducible, y el período no se puede rectificar después.</div></div>
        </div>`
      })}</div>`;
    },
    wire(v) {
      const b = $("#recAll", document);
      if (b) b.addEventListener("click", () => {
        const n = F.aceptarRecibidos();
        toast(n + " comprobantes aceptados", "Se transmitió el mensaje de receptor de los que cuadran contra su orden y su recepción. Los que no tienen orden quedan para revisión manual.", "ok");
        A.refresh();
      });
      $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => {
        const r = A._recRows[+tr.dataset.i];
        openSheet({
          title: "Responder comprobante",
          sub: provNom(r.provId) + " · " + c(r.monto),
          body: `<dl class="kv">
              <dt>Clave</dt><dd class="num" style="font-size:11px;word-break:break-all">${esc(r.clave)}</dd>
              <dt>Tipo</dt><dd>${esc(r.tipoCod)} · ${esc(r.tipo)}</dd>
              <dt>Fecha</dt><dd>${fechaL(r.fecha)}</dd>
              <dt>Monto</dt><dd class="num">${c(r.monto)}</dd>
              <dt>IVA acreditable</dt><dd class="num">${c(r.iva)}</dd>
              <dt>Orden ligada</dt><dd>${r.ocLigada ? esc(r.ocLigada) : "sin orden previa"}</dd>
              <dt>Vence en</dt><dd class="num">${r.venceEn} días</dd></dl>
            <div style="margin-top:16px;display:flex;flex-direction:column;gap:9px">
              <button class="btn" id="mrA" style="justify-content:flex-start">${icon("check")}Aceptar — crédito fiscal completo</button>
              <button class="btn" id="mrP" style="justify-content:flex-start">${icon("scale")}Aceptar parcialmente — indicar el monto correcto</button>
              <button class="btn" id="mrR" style="justify-content:flex-start">${icon("x")}Rechazar — la compra no corresponde</button>
            </div>`,
          footer: `<div style="flex:1"></div><button class="btn pri" id="mrX">Cerrar</button>`,
          after: root => {
            $("#mrX", root).addEventListener("click", closeSheet);
            const resp = (estado, msg) => { r.estado = estado; closeSheet(); toast("Mensaje de receptor enviado", msg, "ok"); A.refresh(); };
            $("#mrA", root).addEventListener("click", () => resp("Aceptado", "Confirmación de aceptación transmitida a Hacienda. El IVA entra al crédito fiscal del período."));
            $("#mrP", root).addEventListener("click", () => resp("Aceptado parcial", "Aceptación parcial transmitida. Solo el monto aceptado da crédito fiscal; el proveedor debe emitir la nota de crédito por la diferencia."));
            $("#mrR", root).addEventListener("click", () => resp("Rechazado", "Rechazo transmitido. Sin crédito fiscal, y el proveedor queda notificado para anular el comprobante."));
          }
        });
      }));
    }
  });

  /* ══ RECIBO ELECTRÓNICO DE PAGO ══════════════════════════════ */
  let repTab = "Recibos emitidos";
  A.screen("fel-rep", {
    title: "Recibo electrónico de pago",
    sub: () => "IVA diferido del artículo 27 · un REP por cada abono, tope de 90 días",
    extra: () => seg("reptab", ["Recibos emitidos", "IVA diferido pendiente"], repTab),
    render(v) {
      const venc = F.diferidas.filter(x => x.vencido);
      const pend = F.diferidas.filter(x => !x.vencido);
      const kpis = `<div class="grid g4">
        ${stat("REP emitidos", F.reps.length, { txt: "uno por cada abono cobrado", dir: "" })}
        ${stat("IVA trasladado por REP", c(F.reps.reduce((s, r) => s + r.iva, 0)), { txt: "se declara en el mes del recibo, no de la factura", dir: "" }, "var(--ok)")}
        ${stat("IVA diferido pendiente", c(pend.reduce((s, x) => s + x.ivaDiferido, 0)), { txt: pend.length + " facturas dentro del plazo", dir: "" })}
        ${stat("Pasaron los 90 días", venc.length, { txt: c(venc.reduce((s, x) => s + x.ivaDiferido, 0)) + " se declara aunque no se cobre", dir: venc.length ? "down" : "up" }, venc.length ? "var(--crit)" : "var(--ok)")}
      </div>`;

      if (repTab === "Recibos emitidos") {
        v.innerHTML = `<div class="wrap">${kpis}
          ${card({
          title: "Recibos electrónicos de pago", hint: "cada uno referencia la factura que cobra",
          body: table({
            h: "calc(100dvh - 400px)",
            cols: [
              { t: "Consecutivo", cls: "mono", fmt: r => `<b>${esc(r.cons)}</b>` },
              { t: "Factura cobrada", cls: "mono", fmt: r => esc(r.docCons) },
              { t: "Cliente", fmt: r => esc(cliNom(r.cliId)) },
              { t: "Fecha", cls: "mono", fmt: r => fecha(r.fecha) },
              { t: "Medio", fmt: r => esc(r.medio) },
              { t: "Monto cobrado", r: true, cls: "mono", fmt: r => grp(r.monto) },
              { t: "IVA trasladado", r: true, cls: "mono", fmt: r => `<b>${grp(r.iva)}</b>` },
              { t: "", fmt: r => r.parcial ? tag("Abono parcial", "wa") : tag("Cancela", "ok", "check") },
              { t: "Hacienda", fmt: r => tag(r.estado, EST[r.estado]) }
            ], rows: F.reps.slice(0, 200),
            foot: [{ v: "Totales", span: 5 }, { v: grp(F.reps.reduce((s, r) => s + r.monto, 0)), r: true, cls: "mono" },
            { v: grp(F.reps.reduce((s, r) => s + r.iva, 0)), r: true, cls: "mono" }, { v: "" }, { v: "" }]
          })
        })}</div>`;
      } else {
        const rows = F.diferidas.slice(0, 160);
        A._difRows = rows;
        v.innerHTML = `<div class="wrap">${kpis}
          ${card({
          title: "Facturas a crédito con IVA diferido", hint: "el reloj de 90 días corre desde la fecha de la factura · clic en una factura para aplicar el cobro",
          body: table({
            h: "calc(100dvh - 400px)", onRow: true,
            cols: [
              { t: "Factura", cls: "mono", fmt: r => esc(r.doc.cons) },
              { t: "Cliente", fmt: r => esc(cliNom(r.doc.clienteId)) },
              { t: "Fecha", cls: "mono", fmt: r => fecha(r.doc.fecha) },
              { t: "Días", r: true, cls: "mono", fmt: r => `<b style="color:${r.vencido ? "var(--crit)" : r.dias > 60 ? "var(--warn)" : "var(--ink)"}">${r.dias}</b>` },
              { t: "Total", r: true, cls: "mono", fmt: r => grp(r.doc.total) },
              { t: "Cobrado", r: true, cls: "mono", fmt: r => r.cobrado ? grp(r.cobrado) : '<span class="dim">—</span>' },
              { t: "Saldo", r: true, cls: "mono", fmt: r => grp(r.saldo) },
              { t: "IVA diferido", r: true, cls: "mono", fmt: r => `<b>${grp(r.ivaDiferido)}</b>` },
              { t: "", fmt: r => r.vencido ? tag("Se declara igual", "cr", "alert") : tag("Faltan " + r.faltan + " d", r.faltan < 20 ? "wa" : "mu") }
            ], rows, rowCls: r => r.vencido ? "cr" : r.faltan < 20 ? "wa" : ""
          })
        })}
          ${card({
          title: "Cómo funciona el diferimiento", hint: "artículo 27 de la Ley del IVA",
          body: `<div class="mut" style="font-size:13px;line-height:1.7">
            En una venta a crédito de hasta 90 días, el IVA no se declara en el mes de la factura: se declara en el mes
            en que se cobra, y lo que documenta ese cobro es el <b>recibo electrónico de pago</b>. Cada abono lleva su
            propio REP con el IVA proporcional.
            <br><br>Si a los 90 días la factura sigue sin cobrarse, el IVA se declara igual — y el REP se emite después,
            cuando el cliente por fin pague. Ese es el caso que más se cobra: nadie lo lleva a mano, y Santa Rosa vende
            a 30, 60 y 90 días con «conta ruta» a un día.
            <br><br>Por eso el REP no vive en el módulo fiscal: vive pegado a cuentas por cobrar. El cobrador aplica el
            pago y el REP sale solo.</div>`
        })}</div>`;
      }
    },
    wire(v) {
      onSeg(document, "reptab", val => { repTab = val; A.refresh(); });
      $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => {
        const r = A._difRows[+tr.dataset.i];
        openSheet({
          title: "Aplicar cobro y emitir REP",
          sub: r.doc.cons + " · " + cliNom(r.doc.clienteId),
          body: `<dl class="kv">
              <dt>Total de la factura</dt><dd class="num">${c(r.doc.total)}</dd>
              <dt>Cobrado antes</dt><dd class="num">${c(r.cobrado)}</dd>
              <dt>Saldo</dt><dd class="num">${c(r.saldo)}</dd>
              <dt>Días desde la factura</dt><dd class="num">${r.dias}</dd>
              <dt>IVA diferido</dt><dd class="num">${c(r.ivaDiferido)}</dd>
              <dt>Estado del plazo</dt><dd>${r.vencido ? "vencido — el IVA ya se declaró" : "faltan " + r.faltan + " días"}</dd></dl>
            <div class="grid g2" style="margin-top:16px">
              ${U.field("Monto cobrado", `<input class="inp num" id="rpM" value="${grp(r.saldo)}">`)}
              ${U.selectField("Medio de pago", ["Transferencia", "SINPE móvil", "Cheque", "Efectivo"], "rpMed")}</div>
            <div class="alert in" style="margin-top:14px;border:1px solid var(--hair);border-radius:11px">${icon("info")}
              <div>Al aplicar el cobro, el sistema emite el REP, traslada el IVA del diferido al IVA por pagar del mes y baja el saldo de cuentas por cobrar. Un solo acto.</div></div>`,
          footer: `<button class="btn" id="rpC">Cancelar</button><div style="flex:1"></div><button class="btn pri" id="rpOk">${icon("check")}Aplicar y emitir</button>`,
          after: root => {
            $("#rpC", root).addEventListener("click", closeSheet);
            $("#rpOk", root).addEventListener("click", () => {
              const monto = parseInt($("#rpM", root).value.replace(/\D/g, ""), 10) || 0;
              const res = F.aplicarCobro(r.doc, { monto, medio: $("#rpMed", root).value, locId: S.locId, term: S.term, offline: S.offline });
              if (res.error) return toast("No se aplicó el cobro", res.error, "cr");
              closeSheet();
              toast("Cobro aplicado y REP " + res.rep.cons + " emitido",
                "El IVA de " + c(res.rep.iva) + " pasó al período actual. " +
                (res.rep.saldoNuevo ? "La factura queda con saldo de " + c(res.rep.saldoNuevo) + "." : "La factura quedó cancelada."), "ok");
              A.refresh();
            });
          }
        });
      }));
    }
  });

  /* ══ COLA DE ENVÍO ═══════════════════════════════════════════ */
  A.screen("fel-cola", {
    title: "Cola de envío y errores",
    sub: () => "Hacienda responde de forma asíncrona y a veces no responde",
    extra: () => `<button class="btn pri" id="colRe">${icon("history")}Reintentar los automáticos</button>`,
    render(v) {
      const rows = F.cola();
      const porErr = {};
      rows.forEach(x => { if (x.err) porErr[x.err.cod] = (porErr[x.err.cod] || 0) + 1; });
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("En la cola", rows.length, { txt: "de " + grp(D.documentos.length) + " comprobantes", dir: "" }, rows.length ? "var(--warn)" : "var(--ok)")}
          ${stat("En proceso", rows.filter(x => x.estado === "En proceso").length, { txt: "esperando respuesta de Hacienda", dir: "" })}
          ${stat("Rechazados", rows.filter(x => x.estado === "Rechazado").length, { txt: rows.filter(x => x.err && x.err.auto).length + " se corrigen y reenvían solos", dir: "" }, "var(--crit)")}
          ${stat("Una hora de caída", "≈200 documentos", { txt: "al volumen real de Santa Rosa", dir: "" })}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Comprobantes sin aceptación", hint: "cada uno con su código de error y su motivo",
        body: rows.length ? table({
          h: "calc(100dvh - 430px)",
          cols: [
            { t: "Consecutivo", cls: "mono", fmt: r => esc(r.doc.cons) },
            { t: "Tipo", fmt: r => tag(r.doc.tipo, "mu") },
            { t: "Fecha", cls: "mono", fmt: r => fh(r.doc.fecha) },
            { t: "Total", r: true, cls: "mono", fmt: r => grp(r.doc.total) },
            { t: "Intentos", r: true, cls: "mono", fmt: r => r.intentos },
            { t: "Error", fmt: r => r.err ? `<b class="mono">${esc(r.err.cod)}</b> <span class="mut">${esc(r.err.t)}</span>` : '<span class="dim">sin respuesta todavía</span>' },
            { t: "", fmt: r => r.err ? (r.err.auto ? tag("Se reintenta solo", "ac") : tag("Requiere revisión", "cr", "alert")) : tag("En proceso", "wa", "clock") }
          ], rows, rowCls: r => r.err && !r.err.auto ? "cr" : "wa"
        }) : empty("check", "Nada en la cola", "Todos los comprobantes tienen respuesta de aceptación de Hacienda.")
      })}
          <div style="display:flex;flex-direction:column;gap:14px">
            ${card({
        title: "Errores más frecuentes", hint: "los de la 4.4, con validación cruzada",
        body: table({
          cols: [
            { t: "Código", cls: "mono", fmt: r => `<b>${esc(r.cod)}</b>` },
            { t: "Motivo", fmt: r => `${esc(r.t)}<span class="sub ui">${esc(r.causa)}</span>` },
            { t: "En cola", r: true, cls: "mono", fmt: r => porErr[r.cod] || '<span class="dim">—</span>' }
          ], rows: F.ERRORES
        })
      })}
            ${card({
        title: "Por qué importa el detalle",
        body: `<div class="mut" style="font-size:13px;line-height:1.7">
          La 4.4 valida de forma cruzada: si el IVA del encabezado no coincide con la suma de las líneas, aunque sea
          por un colón, el comprobante se rechaza. Eso obliga a que el redondeo sea el mismo en toda la cadena.
          <br><br>Un sistema que solo dice «error al enviar» deja a la persona de caja sin saber qué hacer. Aquí cada
          rechazo trae su código, su causa y si el sistema lo puede arreglar solo.</div>`
      })}
          </div>
        </div></div>`;
    },
    wire() {
      const b = $("#colRe", document);
      if (b) b.addEventListener("click", () => {
        const n = F.reintentar();
        toast(n + " comprobantes reenviados", "Se corrigieron los errores automáticos y quedaron aceptados. Los que necesitan revisión siguen en la cola.", "ok");
        A.refresh();
      });
    }
  });

  /* ══ CONTINGENCIA ════════════════════════════════════════════ */
  A.screen("fel-contingencia", {
    title: "Contingencia",
    sub: () => "Comprobante provisional cuando no hay enlace, y su conversión en 2 días hábiles",
    render(v) {
      const prov = F.emitidos().filter(x => x.sit === "2").length + (S.offline ? S.queue : 0);
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Estado del servicio", S.offline ? "Sin respuesta" : "Disponible", { txt: S.offline ? "el nodo local sigue facturando" : "validador de Hacienda respondiendo", dir: S.offline ? "down" : "up" }, S.offline ? "var(--warn)" : "var(--ok)")}
          ${stat("Provisionales por convertir", S.offline ? S.queue : 0, { txt: "plazo de 2 días hábiles", dir: "" }, S.offline ? "var(--warn)" : "var(--ok)")}
          ${stat("Emitidos en contingencia", prov, { txt: "en la ventana de la demo", dir: "" })}
          ${stat("Caída del 11 de setiembre", "25 min", { txt: "los siete locales sin poder facturar", dir: "down" }, "var(--crit)")}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Cómo opera la contingencia", hint: "el interruptor de la barra superior lo demuestra",
        body: `<div class="alerts">
          <div class="alert in">${icon("server")}<div><b>1 · El local no pierde la caja</b><div class="mut" style="font-size:12.5px;line-height:1.5">El nodo del local emite el comprobante provisional con su numeración y lo entrega al cliente. La venta se registra, el inventario baja, el asiento se genera.</div></div></div>
          <div class="alert in">${icon("layers")}<div><b>2 · El documento entra a la cola</b><div class="mut" style="font-size:12.5px;line-height:1.5">Con situación <span class="num">2</span> (contingencia) o <span class="num">3</span> (sin internet), según qué se cayó: Hacienda o el enlace del local.</div></div></div>
          <div class="alert in">${icon("lock")}<div><b>3 · La nube firma, nunca el borde</b><div class="mut" style="font-size:12.5px;line-height:1.5">La llave criptográfica vive solo en la nube. El nodo del local jamás la tiene, así que un equipo robado en una tienda no compromete la firma de la empresa.</div></div></div>
          <div class="alert ok">${icon("check")}<div><b>4 · Se convierte y se transmite</b><div class="mut" style="font-size:12.5px;line-height:1.5">Al restablecerse, el sistema firma, transmite y sustituye cada provisional dentro de los 2 días hábiles. Sin que nadie digite nada.</div></div></div>
        </div>`
      })}
          <div style="display:flex;flex-direction:column;gap:14px">
            ${card({
        title: "Situación del comprobante", hint: "va dentro de la clave numérica",
        body: table({
          cols: [
            { t: "Código", cls: "mono", fmt: r => `<b>${esc(r.cod)}</b>` },
            { t: "Situación", fmt: r => `${esc(r.t)}<span class="sub ui">${esc(r.d)}</span>` }
          ], rows: F.SITUACIONES
        })
      })}
            ${card({
        title: "Probarlo ahora",
        body: `<div class="mut" style="font-size:13px;line-height:1.65">El interruptor de red de la barra superior simula la caída.
          La banda ámbar aparece, el contador de documentos en cola sube y la caja sigue facturando.
          <br><br>Es el momento de venta de la demo: el 11 de setiembre los siete locales estuvieron 25 minutos sin poder
          facturar, con evidencia en el grupo de soporte. Con nodo local, esos 25 minutos no existen.</div>
          <button class="btn ${S.offline ? "" : "pri"}" id="ctgSim" style="margin-top:14px;width:100%;justify-content:center">
            ${icon("server")}${S.offline ? "Restablecer el enlace" : "Simular la caída del enlace"}</button>`
      })}
          </div>
        </div></div>`;
    },
    wire(v) {
      const b = $("#ctgSim", v);
      if (b) b.addEventListener("click", () => { const n = $("#btnNet"); if (n) n.click(); });
    }
  });

  /* ══ CONSECUTIVOS Y CLAVE ════════════════════════════════════ */
  A.screen("fel-consecutivos", {
    title: "Consecutivos y clave numérica",
    sub: () => "Cada terminal es dueña de su serie — por eso el offline no necesita coordinación",
    render(v) {
      const rows = F.consecutivos;
      const saltos = rows.filter(r => r.salto);
      const bloque = (arr, titulo) => card({
        title: titulo, hint: arr.reduce((s, x) => s + x[1], 0) + " dígitos",
        body: `<div style="display:flex;gap:6px;flex-wrap:wrap">${arr.map(x =>
          `<div style="flex:1;min-width:92px;border:1px solid var(--hair);border-radius:9px;padding:9px 11px;background:var(--surface-2)">
            <div class="num" style="font-size:14px;font-weight:650;word-break:break-all">${esc(x[0])}</div>
            <div class="mut" style="font-size:11px;margin-top:4px;line-height:1.35">${esc(x[2])}<br><span class="dim">${x[1]} díg.</span></div>
          </div>`).join("")}</div>`
      });
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Series activas", rows.length, { txt: "sucursal × terminal × tipo de comprobante", dir: "" })}
          ${stat("Terminales", F.EMISOR.terminales, { txt: "en " + F.EMISOR.sucursales + " tiendas", dir: "" })}
          ${stat("Saltos detectados", saltos.length, { txt: saltos.length ? "el sistema los señala antes de que Hacienda pregunte" : "ninguna serie con huecos", dir: saltos.length ? "down" : "up" }, saltos.length ? "var(--crit)" : "var(--ok)")}
          ${stat("Coordinación entre locales", "Ninguna", { txt: "la serie ya lleva sucursal y terminal", dir: "up" }, "var(--ok)")}
        </div>
        ${bloque(F.CONS_SEG, "Numeración consecutiva")}
        ${bloque(F.CLAVE_SEG, "Clave numérica")}
        ${card({
        title: "Series por terminal", hint: "el último número emitido de cada una",
        body: table({
          h: "420px",
          cols: [
            { t: "Local", fmt: r => `${esc(locNom(r.locId))}<span class="sub">serie ${esc(r.cod)}</span>` },
            { t: "Terminal", r: true, cls: "mono", fmt: r => r.term },
            { t: "Comprobante", cls: "mono", fmt: r => `${esc(r.tipoCod)} · ${esc(r.sig)}` },
            { t: "Último emitido", r: true, cls: "mono", fmt: r => grp(r.ultimo) },
            { t: "Del día", r: true, cls: "mono", fmt: r => r.delDia || '<span class="dim">—</span>' },
            { t: "", fmt: r => r.salto ? tag("Salto: " + r.saltoDetalle, "cr", "alert") : tag("Sin huecos", "ok", "check") }
          ], rows, rowCls: r => r.salto ? "cr" : ""
        })
      })}
        ${card({
        title: "Por qué esto resuelve el offline",
        body: `<div class="mut" style="font-size:13px;line-height:1.7">
          La numeración fiscal ya incluye la sucursal y la terminal. Eso significa que <b>cada caja es dueña de su propia
          secuencia</b> y no necesita preguntarle nada a la nube para emitir el siguiente número.
          <br><br>Es la razón por la que el nodo local funciona sin coordinación distribuida: no hay contador compartido
          que sincronizar, no hay dos cajas peleando por el mismo consecutivo. Lo único que viaja a la nube es el
          documento ya numerado, para firmarse y transmitirse.</div>`
      })}</div>`;
    }
  });

  /* ══ LLAVE CRIPTOGRÁFICA ═════════════════════════════════════ */
  A.screen("fel-llave", {
    title: "Llave criptográfica y credenciales",
    sub: () => "La llave vive solo en la nube — los nodos de los locales nunca firman",
    render(v) {
      const L = F.LLAVE;
      const pctVida = Math.round((1 - L.faltan / 1461) * 100);
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Ambiente", L.ambiente, { txt: "el de pruebas vence el " + fechaL(L.pruebas.vence), dir: "" }, "var(--ok)")}
          ${stat("Vence", fechaL(L.vence), { txt: "vigencia de 4 años desde la emisión", dir: "" })}
          ${stat("Faltan", grp(L.faltan) + " días", { txt: "avisos a los 90, 30 y 7 días", dir: L.faltan < 180 ? "down" : "" }, L.faltan < 180 ? "var(--warn)" : "var(--accent)")}
          ${stat("Custodia", "Solo la nube", { txt: "ningún nodo de local tiene la llave", dir: "up" }, "var(--ok)")}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Llave de producción",
        body: `<dl class="kv">
          <dt>Emisor</dt><dd>${esc(L.emisor)}</dd>
          <dt>Cédula jurídica</dt><dd class="num">${esc(L.cedula)}</dd>
          <dt>Archivo</dt><dd class="num" style="font-size:12px">${esc(L.archivo)}</dd>
          <dt>Emitida</dt><dd class="num">${fechaL(L.emitida)}</dd>
          <dt>Vence</dt><dd class="num" style="color:var(--warn)">${fechaL(L.vence)}</dd>
          <dt>Custodia</dt><dd>${esc(L.custodia)}</dd>
          <dt>PIN</dt><dd>en el gestor de secretos, nunca en el código</dd></dl>
        <div class="prog" style="margin-top:14px"><i style="width:${pctVida}%;background:var(--accent)"></i></div>
        <div class="mut" style="font-size:12px;margin-top:6px">${pctVida} % de la vigencia consumida</div>`
      })}
          ${card({
        title: "La regla de diseño", hint: "decidido en la nota de arquitectura",
        body: `<div class="mut" style="font-size:13px;line-height:1.7">
          <b>La llave vive en el gestor de secretos de la nube y solo la nube firma.</b> Los nodos de los locales emiten
          el comprobante provisional y la nube lo firma y lo transmite al reconectar.
          <br><br>Eso tiene un costo — sin enlace no hay comprobante definitivo — y una ventaja que lo paga: siete
          equipos repartidos en siete pueblos nunca custodian la firma digital de la empresa. Un equipo robado no es
          una emergencia fiscal.
          <br><br>La llave vence cada cuatro años y con ella vencida Hacienda rechaza <b>todo</b>. Por eso la renovación
          se agenda con 30 días de anticipación, no el día que deja de servir.</div>`
      })}
        </div>
        ${card({
        title: "Qué pasa si vence", hint: "y cómo el sistema lo evita",
        body: `<div class="tiles">
          <div class="tile"><div class="tn">Rechazo inmediato</div><div class="td">Cualquier comprobante firmado con llave vencida se rechaza al enviarlo. La facturación se detiene por completo.</div></div>
          <div class="tile"><div class="tn">Aviso a los 90 días</div><div class="td">Correo a TI y a contabilidad, y una alerta en el tablero de gerencia.</div></div>
          <div class="tile"><div class="tn">Aviso a los 30 y a los 7</div><div class="td">Escala: a los 7 días la alerta aparece en la barra superior de todas las cajas.</div></div>
          <div class="tile"><div class="tn">Renovación sin parar la caja</div><div class="td">La llave nueva se carga en el gestor de secretos y entra en vigencia sin reiniciar nada ni tocar los nodos.</div></div>
          <div class="tile"><div class="tn">PIN nuevo</div><div class="td">Cada renovación genera un PIN distinto. Se actualiza en un solo lugar, no en siete.</div></div>
          <div class="tile"><div class="tn">Nunca compartida</div><div class="td">Una llave por contribuyente. Compartirla entre empresas es sancionable.</div></div>
        </div>`
      })}</div>`;
    }
  });

  /* ══ CABYS, TARIFAS Y EXONERACIONES ══════════════════════════ */
  let cbTab = "Catálogo CABYS";
  A.screen("fel-cabys", {
    title: "CABYS, tarifas y exoneraciones",
    sub: () => "El código del artículo decide la tarifa, no la costumbre del vendedor",
    extra: () => seg("cbt", ["Catálogo CABYS", "Tarifas de IVA", "Exoneraciones"], cbTab),
    render(v) {
      if (cbTab === "Catálogo CABYS") {
        const ret = F.CABYS.filter(x => !x.vigente);
        v.innerHTML = `<div class="wrap">
          <div class="grid g4">
            ${stat("Códigos en uso", F.CABYS.length, { txt: "sobre " + grp(D.articulos.length) + " artículos del catálogo", dir: "" })}
            ${stat("Retirados del catálogo", ret.length, { txt: ret.length ? "Hacienda los rechaza con el error 4012" : "todos vigentes", dir: ret.length ? "down" : "up" }, ret.length ? "var(--crit)" : "var(--ok)")}
            ${stat("Con tarifa reducida", F.CABYS.filter(x => x.tarifa < 13).length, { txt: "insumos agropecuarios al 1 %", dir: "" })}
            ${stat("Sincronización", "Semanal", { txt: "y aviso cuando un código que usted usa cambia", dir: "up" }, "var(--ok)")}
          </div>
          ${card({
          title: "Códigos del catálogo", hint: "el CABYS determina la tarifa de IVA de cada línea",
          actions: `<button class="btn sm pri" id="cbFix">${icon("check")}Resolver el código retirado</button>`,
          body: table({
            cols: [
              { t: "CABYS", cls: "mono", fmt: r => `<b>${esc(r.cod)}</b>` },
              { t: "Descripción", fmt: r => esc(r.desc) },
              { t: "Familia", fmt: r => esc(r.fam) },
              { t: "Tarifa", r: true, cls: "mono", fmt: r => dec(r.tarifa, 0) + " %" },
              { t: "Estado", fmt: r => r.vigente ? tag("Vigente", "ok", "check") : tag("Retirado → " + r.sustituye, "cr", "alert") }
            ], rows: F.CABYS, rowCls: r => r.vigente ? "" : "cr"
          })
        })}</div>`;
      } else if (cbTab === "Tarifas de IVA") {
        v.innerHTML = `<div class="wrap">
          ${card({
          title: "Tarifas vigentes en 2026", hint: "Ley 9635 · el catálogo de ferretería va todo al 13 %",
          body: table({
            cols: [
              { t: "Tarifa", r: true, cls: "mono", fmt: r => `<b>${dec(r.p, r.p % 1 ? 1 : 0)} %</b>` },
              { t: "Aplica a", fmt: r => `<b>${esc(r.t)}</b><span class="sub ui">${esc(r.d)}</span>` },
              { t: "En el catálogo", r: true, cls: "mono", fmt: r => { const n = F.CABYS.filter(x => x.tarifa === r.p).length; return n || '<span class="dim">—</span>'; } }
            ], rows: F.TARIFAS
          })
        })}
          ${card({
          title: "Dónde se equivoca la gente", hint: "los errores que más cuestan",
          body: `<div class="tiles">
            <div class="tile"><div class="tn">Cobrar 13 % sobre algo reducido</div><div class="td">El insumo agropecuario va al 1 %. Cobrarle 13 % al cliente es un cobro indebido que hay que devolver con nota de crédito.</div></div>
            <div class="tile"><div class="tn">Confundir exento con tasa cero</div><div class="td">La exportación es tasa cero <b>con</b> derecho a crédito fiscal. El exento no lo tiene. No es lo mismo.</div></div>
            <div class="tile"><div class="tn">Aplicar la exoneración sin autorización vigente</div><div class="td">El sistema bloquea la venta exonerada si la autorización venció.</div></div>
            <div class="tile"><div class="tn">Prorrateo en actividades mixtas</div><div class="td">Si hay ventas exentas y gravadas, el crédito fiscal de las compras se prorratea. No se toma completo.</div></div>
          </div>`
        })}</div>`;
      } else {
        v.innerHTML = `<div class="wrap">
          ${card({
          title: "Clientes con exoneración", hint: "el sistema revisa la vigencia en cada venta",
          actions: `<button class="btn sm">${icon("plus")}Registrar autorización</button>`,
          body: F.EXONERACIONES.length ? table({
            cols: [
              { t: "Cliente", fmt: r => `<b>${esc(r.nom)}</b><span class="sub">${esc(r.ced)}</span>` },
              { t: "Tipo", fmt: r => tag(r.tipo, "ac") },
              { t: "Autorización", cls: "mono", fmt: r => esc(r.autorizacion) },
              { t: "Porcentaje", r: true, cls: "mono", fmt: r => r.porc + " %" },
              { t: "Desde", cls: "mono", fmt: r => fechaL(r.desde) },
              { t: "Hasta", cls: "mono", fmt: r => fechaL(r.hasta) },
              { t: "", fmt: r => r.hasta > D.HOY ? tag("Vigente", "ok", "check") : tag("Vencida", "cr", "alert") }
            ], rows: F.EXONERACIONES
          }) : empty("shield", "Sin exoneraciones registradas", "Las instituciones públicas y las ASADAs que compran en Santa Rosa se registran aquí con su autorización.")
        })}
          ${card({
          title: "Cómo se aplica en caja",
          body: `<div class="mut" style="font-size:13px;line-height:1.7">
            Cuando el cajero selecciona un cliente con exoneración vigente, la línea sale sin IVA y el comprobante
            incorpora el número de autorización y su porcentaje, como exige la 4.4.
            <br><br>Si la autorización venció, la venta no se bloquea: se cobra con IVA y se le avisa al cajero por qué.
            El que decide es el cliente, no el sistema — pero nadie factura exonerado sin respaldo.</div>`
        })}</div>`;
      }
    },
    wire(v) {
      onSeg(document, "cbt", val => { cbTab = val; A.refresh(); });
      const b = $("#cbFix", v);
      if (b) b.addEventListener("click", () => toast("Código sustituido", "Los artículos que usaban el código retirado quedaron con el vigente, y los comprobantes rechazados por el error 4012 entran de nuevo a la cola.", "ok"));
    }
  });

  /* ══ IVA DEL PERÍODO ═════════════════════════════════════════ */
  A.screen("fel-iva", {
    title: "IVA del período",
    sub: () => "Declaración D-150 en TRIBU-CR, dentro de los primeros 15 días naturales del mes siguiente",
    extra: () => `<button class="btn pri" id="ivaDec">${icon("file")}Preparar la D-150</button>`,
    render(v) {
      const i = F.ivaMes();
      const linea = (l, val, b, col, sub) => `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;border-bottom:1px solid var(--hair-2);${b ? "font-weight:700" : ""}">
        <span style="${b ? "" : "color:var(--ink-2)"}">${esc(l)}${sub ? `<span class="sub ui">${esc(sub)}</span>` : ""}</span>
        <span class="num" style="${col ? "color:" + col : ""};font-size:${b ? "15px" : "13.5px"}">${c(val)}</span></div>`;
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Débito fiscal", c(i.debito), { txt: "IVA de las ventas del período", dir: "" })}
          ${stat("Crédito fiscal", c(i.creditoFiscal), { txt: "de comprobantes de proveedor aceptados", dir: "" }, "var(--ok)")}
          ${stat(i.aPagar ? "IVA a pagar" : "Saldo a favor", c(i.aPagar || i.saldoFavor), { txt: "setiembre 2026 · vence el 15 de octubre", dir: "" }, i.aPagar ? "var(--warn)" : "var(--ok)")}
          ${stat("Crédito en riesgo", c(i.enRiesgo), { txt: "de comprobantes sin aceptar todavía", dir: i.enRiesgo ? "down" : "up" }, i.enRiesgo ? "var(--crit)" : "var(--ok)")}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Liquidación del período", hint: "así se arma la D-150",
        body: linea("IVA de ventas de contado", i.debitoContado, false, null, "se declara en el mes de la factura") +
          linea("IVA trasladado por REP", i.debitoREP, false, null, "ventas a crédito efectivamente cobradas") +
          linea("IVA diferido que pasó los 90 días", i.diferidoVencido, false, "var(--crit)", "se declara aunque no se haya cobrado") +
          linea("Débito fiscal del período", i.debito, true) +
          linea("Crédito fiscal de compras", -i.creditoFiscal, false, "var(--ok)", "solo de comprobantes con mensaje de receptor enviado") +
          linea(i.aPagar ? "IVA a pagar" : "Saldo a favor", i.aPagar || i.saldoFavor, true, i.aPagar ? "var(--warn)" : "var(--ok)")
      })}
          <div style="display:flex;flex-direction:column;gap:14px">
            ${card({
        title: "IVA diferido en cartera", hint: "lo que todavía no se declara",
        body: `<div class="strip" style="margin:-12px -17px 0">
          <div class="cell"><div class="cl">Dentro del plazo</div><div class="cv num">${c(i.diferidoPend)}</div></div>
          <div class="cell"><div class="cl">Pasó los 90 días</div><div class="cv num" style="color:var(--crit)">${c(i.diferidoVencido)}</div></div>
        </div>
        <div class="mut" style="font-size:12.5px;margin-top:14px;line-height:1.6">
          El primer monto se declarará cuando el cliente pague y salga su REP. El segundo se declara este mes,
          se haya cobrado o no.</div>`
      })}
            ${card({
        title: "La D-150 llega prellenada", hint: "y ahí está el riesgo",
        body: `<div class="mut" style="font-size:13px;line-height:1.7">
          TRIBU-CR prellena la declaración con los comprobantes que usted emitió y recibió. Eso suena cómodo, pero
          significa que <b>Hacienda ya sabe lo que usted va a declarar antes de que lo declare</b>.
          <br><br>Si la contabilidad interna no cuadra con lo prellenado, la diferencia es visible de inmediato. Por eso
          el sistema concilia lo emitido, lo recibido y el libro diario antes de que alguien firme la declaración.</div>`
      })}
          </div>
        </div>
        ${card({
        title: "Libro de ventas del período", hint: "todo lo emitido — el IVA de lo vendido a crédito se declara con su REP, no aquí",
        body: table({
          cols: [
            { t: "Concepto", fmt: r => esc(r[0]) },
            { t: "Documentos", r: true, cls: "mono", fmt: r => grp(r[1]) },
            { t: "Base gravada", r: true, cls: "mono", fmt: r => grp(r[2]) },
            { t: "IVA", r: true, cls: "mono", fmt: r => grp(r[3]) }
          ],
          rows: (function () {
            const m = D.HOY.getMonth(), y = D.HOY.getFullYear();
            const mes = D.documentos.filter(d => d.fecha.getMonth() === m && d.fecha.getFullYear() === y);
            const grupo = t => mes.filter(d => d.tipo === t);
            return ["FE", "TE", "NC", "ND"].map(t => {
              const g = grupo(t);
              return [F.tipoDe(t).t, g.length, g.reduce((s, d) => s + d.grav, 0), g.reduce((s, d) => s + d.iva, 0)];
            }).concat([["Recibo electrónico de pago", F.reps.length, F.reps.reduce((s, r) => s + (r.monto - r.iva), 0), F.reps.reduce((s, r) => s + r.iva, 0)]]);
          })()
        })
      })}</div>`;
    },
    wire() {
      const b = $("#ivaDec", document);
      if (b) b.addEventListener("click", () => toast("D-150 preparada", "Conciliada contra el libro diario y contra lo que TRIBU-CR trae prellenado. Las diferencias quedan señaladas antes de presentar.", "ok"));
    }
  });

  /* ══ CONFIGURACIÓN FISCAL ════════════════════════════════════ */
  A.screen("fel-config", {
    title: "Configuración fiscal",
    sub: () => "Datos del emisor, actividades económicas y parámetros del formato",
    render(v) {
      const E = F.EMISOR;
      v.innerHTML = `<div class="wrap">
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Emisor",
        body: `<dl class="kv">
          <dt>Razón social</dt><dd>${esc(E.nombre)}</dd>
          <dt>Nombre comercial</dt><dd>${esc(E.comercial)}</dd>
          <dt>Cédula</dt><dd class="num">${esc(E.cedula)}</dd>
          <dt>Tipo de identificación</dt><dd>${esc(E.tipoCedCod)} · ${esc(E.tipoCed)}</dd>
          <dt>Ubicación</dt><dd>${esc(D.ubicacionTexto(E))} <span class="dim num">(${esc(E.provincia)}-${esc(E.canton)}-${esc(E.distrito)})</span><br><span style="font-weight:500;font-size:12px">${esc(E.otrasSenas)}</span></dd>
          <dt>Sucursales</dt><dd class="num">${E.sucursales}</dd>
          <dt>Terminales</dt><dd class="num">${E.terminales}</dd>
          <dt>Correos del emisor</dt><dd style="font-weight:500;font-size:12px">${E.correos.map(esc).join("<br>")}</dd>
          <dt>Proveedor del sistema</dt><dd style="font-weight:500">${esc(E.proveedorSistema)}</dd></dl>
        <div class="mut" style="font-size:12.5px;margin-top:12px;line-height:1.6">
          La 4.4 exige identificar al proveedor tecnológico dentro del XML. En el caso de Santa Rosa ese proveedor
          es Smart Serve, con su propio código: el sistema es de desarrollo propio, no de un tercero revendido.</div>`
      })}
          ${card({
        title: "Actividades económicas", hint: "CIIU 4 — obligatorias en la 4.4",
        body: table({
          cols: [
            { t: "Código", cls: "mono", fmt: r => esc(r.cod) },
            { t: "Actividad", fmt: r => esc(r.t) },
            { t: "", fmt: r => r.principal ? tag("Principal", "ac") : '<span class="dim">—</span>' }
          ], rows: E.actividades
        }) + `<div class="mut" style="font-size:12.5px;margin-top:12px;line-height:1.6">
          La 4.4 también pide la actividad económica <b>del receptor</b> en facturas y notas. Por eso el expediente
          del cliente la guarda, y el sistema la pide una sola vez, no en cada venta.</div>`
      })}
        </div>
        ${card({
        title: "Parámetros del formato", hint: "lo que cambia cuando Hacienda mueve la versión",
        body: `<div class="tiles">
          <div class="tile"><div class="tn">Versión del esquema</div><div class="tv">${esc(F.NORMA.version)}</div><div class="td">Obligatoria desde el ${esc(F.NORMA.obligatoria)}. La 4.3 → 4.4 fueron ${F.NORMA.cambios} ajustes al XML.</div></div>
          <div class="tile"><div class="tn">Plataforma</div><div class="tv" style="font-size:15px">${esc(F.NORMA.plataforma)}</div><div class="td">Sustituyó a ATV el ${esc(F.NORMA.plataformaDesde)}.</div></div>
          <div class="tile"><div class="tn">Resolución</div><div class="tv" style="font-size:13px">${esc(F.NORMA.resolucion)}</div><div class="td">Disposiciones técnicas vigentes.</div></div>
          <div class="tile"><div class="tn">Retención del archivo</div><div class="tv" style="font-size:15px">5 años</div><div class="td">XML firmado y respuesta, en poder del contribuyente.</div></div>
          <div class="tile"><div class="tn">Descuentos por línea</div><div class="tv">5</div><div class="td">Con su código de naturaleza, como exige la 4.4.</div></div>
          <div class="tile"><div class="tn">Correos por parte</div><div class="tv">4</div><div class="td">Máximo que admite el formato.</div></div>
        </div>`
      })}
        ${card({
        title: "El motor fiscal es producto de Smart Serve", hint: "no alcance de este proyecto",
        body: `<div class="mut" style="font-size:13px;line-height:1.7">
          El emisor de comprobantes no se construye para Santa Rosa: es un producto de Smart Serve con presupuesto y
          backlog propios, que se amortiza en todos los clientes. Por eso se estrena en producción con un cliente
          pequeño antes que aquí, y tiene un go/no-go con fecha en el mes 4.
          <br><br>El argumento comercial es directo: el reclamo de Santa Rosa contra su sistema actual es que le cambian
          las cosas sin consultarle. Si el motor fiscal es propio, cuando Hacienda mueva el formato —y lo va a mover— la
          fecha la ponen ustedes.</div>`
      })}</div>`;
    }
  });
})(window);
