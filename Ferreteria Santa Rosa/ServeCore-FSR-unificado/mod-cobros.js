/* ═══════════════════════════════════════════════════════════════
   Cobros y pagos — cuentas por cobrar y cuentas por pagar en un solo
   módulo operativo (requerimientos CXC y CXP de la matriz).
   Lo usan quienes cobran y quienes pagan; Contabilidad recibe sus
   asientos solos y concilia los auxiliares en Conciliaciones ›
   Cartera y proveedores.

   Crédito de clientes · Conta ruta · Análisis y gestión de cobro ·
   Recibos de dinero · Anticipos · Pagos a proveedores y autorización
   mancomunada · Archivo plano del Banco Nacional · Estado de cuenta del
   proveedor · Notas de crédito y débito a proveedor · Caja chica y
   tarjeta empresarial.

   Regla de la demo: cada pantalla muestra el asiento que genera (el
   «puente contable»). Lo que mueve saldos usa las mismas funciones del
   resto del sistema (FIS.aplicarCobro, D.asentar), así el auxiliar y el
   mayor siguen cuadrando.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, S = w.S, U = w.UI, V = w.VENX, F = w.FIS, AU = w.AUTO, CON = w.CON;
  const { $, $$, esc, grp, c, dec, fecha, fechaL, fh, hora, icon, tag, card, stat, seg, onSeg, fichaCell,
    closeSheet, toast, locNom, cliNom, provNom, empty, prog } = U;
  /* las tablas del módulo no parten las cifras en dos renglones */
  const table = o => U.table(Object.assign({}, o, { cls: ((o && o.cls) || "") + " cob-dt" }));

  /* ── utilidades ─────────────────────────────────────────────── */
  const DIA = 86400000;
  const HOY = D.HOY;
  const masDias = (f, n) => new Date(f.getTime() + n * DIA);
  const diasEntre = (a, b) => Math.floor((b - a) / DIA);
  const numIn = s => parseFloat(String(s == null ? "" : s).replace(/[^\d,.-]/g, "").replace(/\s/g, "").replace(",", ".")) || 0;
  const r0 = n => Math.round(n);
  const nota = (html, ic, k) => `<div class="cob-nota ${k || ""}">${icon(ic || "info")}<div>${html}</div></div>`;
  const kvs = rows => `<dl class="kv">${rows.map(r => `<dt>${esc(r[0])}</dt><dd>${r[1]}</dd>`).join("")}</dl>`;
  const cerrar = el => $$("[data-cerrar]", el).forEach(b => b.addEventListener("click", closeSheet));
  const quien = () => (D.sesion && D.sesion.corto) || "Usuario";
  const anotar = (accion, detalle, sev, antes, despues) => V.anotar(accion, detalle, quien(), S.locId, sev || "Media", antes || "", despues || "");
  const ctaNom = cod => (D.ctaByCod[cod] || {}).nom || "¿cuenta inexistente?";
  const saldoCta = cod => { const x = D.ctaByCod[cod]; return x ? x.debe - x.haber : 0; };
  const periodoOk = () => { try { D.exigePeriodoAbierto(D.ahora()); return true; } catch (e) { toast("Período cerrado", e.message, "cr"); return false; } };
  const sel = (id, opts, cur, attrs) => `<select id="${id}" ${attrs || ""}>${opts.map(o => { const v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return `<option value="${esc(v)}" ${String(v) === String(cur) ? "selected" : ""}>${esc(t)}</option>`; }).join("")}</select>`;
  const inp = (id, val, attrs) => `<input id="${id}" value="${esc(val == null ? "" : val)}" ${attrs || ""}>`;
  const numInp = (id, val, attrs) => `<input id="${id}" class="num" style="text-align:right" value="${val == null ? "" : grp(val)}" ${attrs || ""}>`;
  const fld = (label, html, id, hint) => `<div class="field"><label ${id ? `for="${id}"` : ""}>${esc(label)}</label>${html}${hint ? `<div class="mut" style="font-size:11.5px;margin-top:3px">${hint}</div>` : ""}</div>`;
  const g2 = html => `<div class="grid g2" style="gap:10px">${html}</div>`;
  const g3 = html => `<div class="grid g3" style="gap:10px">${html}</div>`;
  const PERSONAS = {
    prepara: "Óscar Jiménez", tesoreria: "Katherine Vargas", gerencia: "Adrián Vindas",
    contadora: "Sonia Calderón", respaldo: "Álvaro Cordero", cobro: "Priscilla Núñez", credito: "Sonia Calderón"
  };

  /* ── el puente contable: todo lo que mueve saldos muestra su asiento ── */
  function asientoTabla(det, glosa) {
    const lin = det.filter(d => (d.debe || 0) || (d.haber || 0));
    const td = lin.reduce((s, d) => s + (d.debe || 0), 0), th = lin.reduce((s, d) => s + (d.haber || 0), 0);
    const dif = r0(td - th);
    return table({
      cols: [
        { t: "Cuenta", cls: "mono", fmt: r => esc(r.cta) },
        { t: "Descripción", fmt: r => `${esc(ctaNom(r.cta))}${r.nota ? `<span class="sub">${esc(r.nota)}</span>` : ""}` },
        { t: "Debe", r: true, cls: "mono", fmt: r => (r.debe ? grp(r.debe) : '<span class="dim">—</span>') },
        { t: "Haber", r: true, cls: "mono", fmt: r => (r.haber ? grp(r.haber) : '<span class="dim">—</span>') }
      ], rows: lin,
      foot: [{ v: glosa ? esc(glosa) : (dif ? `<b style="color:var(--crit)">Descuadrado por ${grp(dif)}</b>` : '<span class="mut">Cuadra · partida doble</span>'), span: 2 },
      { v: grp(td), r: true, cls: "mono" }, { v: grp(th), r: true, cls: "mono" }]
    });
  }
  /* bloque «Asiento que se generará» dentro de un formulario */
  const asientoBox = (det, titulo, pie) => `<div class="cob-asiento"><div class="cob-asiento-h">${icon("scale")}<b>${esc(titulo || "Asiento que se generará")}</b><span class="mut">${esc(pie || "lo recibe Contabilidad sin volver a digitar")}</span></div>${asientoTabla(det)}</div>`;
  /* ver el asiento real de un documento (el mismo que ve el contador en Libros) */
  function verAsiento(a, titulo) {
    if (!a) return toast("Sin asiento", "Este documento viene de la migración al 31 de agosto: su saldo entró en el asiento de apertura.", "in");
    openSheet({
      wide: true, tight: true, title: titulo || "Asiento " + a.id,
      sub: `${fh(a.fecha)} · origen ${a.origen}${a.regla ? " · regla «" + a.regla + "»" : ""}`,
      body: asientoTabla(a.detalle, a.glosa),
      footer: `<span class="mut" style="font-size:12.5px">Generado por el sistema. El documento no se puede borrar mientras exista este asiento: se anula con reversa.</span><div class="gap"></div>
        <button class="btn" data-ir="con-libros">${icon("book")}Abrir en Libros</button><button class="btn pri" data-cerrar>Cerrar</button>`,
      after(el) { cerrar(el); A.wireIr(el); }
    });
  }
  const asientoDe = origen => D.asientos.filter(a => a.origen === origen);
  const asientoPor = id => D.asientos.find(a => a.id === id);
  function verDet(det, titulo, sub) {
    openSheet({
      wide: true, tight: true, title: titulo, sub: sub || "Vista previa: todavía no está en el mayor",
      body: asientoTabla(det), footer: `<div class="gap"></div><button class="btn pri" data-cerrar>Cerrar</button>`, after: cerrar
    });
  }
  /* autorización con clave de supervisor (SEG-005): quién, cuándo, por qué */
  const firmaCampos = (lista, id) => `${fld("Autoriza", sel(id || "auQ", lista), id || "auQ")}
    ${fld("Clave del autorizador", `<input id="${(id || "auQ")}K" type="password" placeholder="••••" autocomplete="off">`, (id || "auQ") + "K", "En producción la autorización llega también como aviso al celular del autorizador.")}`;

  /* ═════════════════════════════════════════════════════════════
     CxC · base de la cartera
     ═════════════════════════════════════════════════════════════ */
  /* plazo del documento: la conta ruta es crédito a un día; lo demás, el del cliente */
  const plazoDe = d => (d.ruta ? 1 : (D.cliById[d.clienteId] || {}).plazo || 30);
  const venceDe = d => masDias(d.fecha, plazoDe(d));
  /* días vencida desde el vencimiento (no desde la emisión): negativo = por vencer */
  const diasVenc = d => diasEntre(d.fecha, HOY) - plazoDe(d);
  /* mismos cortes que la política de estimación de incobrables (5 % · 25 % · 50 %) */
  const TRAMOS = [
    { k: "pv", l: "Por vencer", a: -99999, b: 0, col: "var(--ok)" },
    { k: "t1", l: "1 a 30", a: 1, b: 30, col: "var(--ink)" },
    { k: "t2", l: "31 a 60", a: 31, b: 60, col: "var(--warn)" },
    { k: "t3", l: "61 a 90", a: 61, b: 90, col: "var(--warn)" },
    { k: "t4", l: "91 a 120", a: 91, b: 120, col: "var(--crit)" },
    { k: "t5", l: "Más de 120", a: 121, b: 99999, col: "var(--crit)" }
  ];
  const tramoDe = d => { const x = diasVenc(d); return TRAMOS.find(t => x >= t.a && x <= t.b); };
  const cartera = () => D.documentos.filter(d => d.saldo > 0 && d.condicion === "Crédito");
  const ivaDif = d => (d.total ? r0(d.saldo * d.iva / d.total) : 0);
  /* obras: el contratista pide su estado de cuenta separado por proyecto */
  const OBRAS = {
    C1: ["Condominio Las Brisas", "Bodega Coopeagri", "Casa Solano"], C3: ["Residencial Reventazón", "Puente La Suiza"],
    C6: ["Edificio Quesada", "Remodelación Clínica"], C10: ["Techado Liceo de Turrialba", "Galerón Finca Aquiares"],
    C4: ["Tanque de captación", "Red de distribución"], C8: ["Mantenimiento cantonal"], C14: ["Beneficio de café"]
  };
  const obraDe = d => { const o = OBRAS[d.clienteId]; if (!o) return "General"; const n = String(d.cons).split("").reduce((s, ch) => s + ch.charCodeAt(0), 0); return o[n % o.length]; };
  /* historial de pago (días promedio desde la emisión hasta el pago) */
  const diasPago = cli => { const n = cli.id.slice(1) * 7 % 23; return cli.plazo ? cli.plazo - 6 + n : 0; };
  const comprometido = cli => D.proformas.filter(p => p.clienteId === cli.id && (p.estado === "Vigente" || /por facturar|Esperando/.test(p.estadoPed || "")) && !p.pagado)
    .reduce((s, p) => s + (p.total || 0), 0);
  const irFicha = cliId => { S.cliSel = cliId; A.go("clientes", "credito"); };
  /* ── buscador de clientes y proveedores ─────────────────────────
     La ferretería tiene miles de clientes y cientos de proveedores: en
     vez de un combo, un campo que muestra resultados al digitar (nombre,
     cédula o teléfono). El valor elegido queda en un input oculto con el
     id de siempre y dispara «change», así el resto del código no cambia. */
  const BUS = {};
  const itemCli = k => ({ id: k.id, t: k.nom, s: k.ced + " · " + (k.plazo === 1 ? "conta ruta" : k.limite ? "crédito " + k.plazo + " d" : "contado") + (k.saldo > 0 ? " · saldo " + c(Math.round(k.saldo)) : ""), k: k.tel + " " + k.categoria });
  const itemProv = p => ({ id: p.id, t: p.nom, s: p.ced + " · " + p.linea + (p.saldo > 0 ? " · saldo " + c(Math.round(p.saldo)) : ""), k: p.cuenta || "" });
  const busCli = (id, cur, filtro) => buscador(id, D.clientes.filter(filtro || (() => true)).map(itemCli), cur, { ph: "Nombre, cédula o teléfono del cliente", base: "78 412 clientes en la base" });
  const busProv = (id, cur) => buscador(id, D.proveedores.map(itemProv), cur, { ph: "Nombre o cédula del proveedor", base: "proveedores activos" });
  function buscador(id, lista, cur, o) {
    BUS[id] = { lista, o: o || {} };
    const x = lista.find(i => i.id === cur);
    return `<div class="cob-bus" data-bus="${id}">
      <div class="cob-bus-i">${icon("search")}<input type="text" id="${id}Q" role="combobox" aria-expanded="false" aria-controls="${id}L" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="${esc((o && o.ph) || "Escriba para buscar")}" value="${x ? esc(x.t) : ""}">${x ? `<span class="cob-bus-s">${esc(x.s.split(" · ")[0])}</span>` : ""}</div>
      <input type="hidden" id="${id}" value="${x ? esc(x.id) : ""}">
      <div class="cob-bus-l" id="${id}L" role="listbox" hidden></div></div>`;
  }
  function wireBus(root) {
    $$("[data-bus]", root).forEach(box => {
      if (box.dataset.w) return; box.dataset.w = "1";
      const id = box.dataset.bus, cfg = BUS[id]; if (!cfg) return;
      const q = $("#" + id + "Q", box), hid = $("#" + id, box), L = $("#" + id + "L", box), tag0 = $(".cob-bus-s", box);
      let res = [], act = 0;
      const nrm = s => U.norm(s).replace(/[-\s]/g, " ");
      const cerrarL = () => { L.hidden = true; q.setAttribute("aria-expanded", "false"); };
      const pintar = () => {
        const txt = q.value.trim(), terms = nrm(txt).split(" ").filter(Boolean), dig = txt.replace(/\D/g, "");
        if (!terms.length) { res = []; L.innerHTML = `<div class="cob-bus-h">Escriba el nombre, la cédula o el teléfono · ${esc(cfg.o.base || "")}</div>`; }
        else {
          const all = cfg.lista.filter(i => { const h = nrm(i.t + " " + i.s + " " + (i.k || "")), hd = (i.s + " " + (i.k || "")).replace(/\D/g, ""); return terms.every(t => h.includes(t)) || (dig.length >= 3 && hd.includes(dig)); });
          all.sort((a, b) => (nrm(a.t).startsWith(terms[0]) ? 0 : 1) - (nrm(b.t).startsWith(terms[0]) ? 0 : 1));
          res = all.slice(0, 8); act = Math.min(act, Math.max(0, res.length - 1));
          const re = new RegExp("(" + txt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").split(/\s+/).filter(Boolean).join("|") + ")", "ig");
          L.innerHTML = res.length ? res.map((i, n) => `<div class="cob-bus-o" role="option" id="${id}O${n}" aria-selected="${n === act}" data-n="${n}"><b>${esc(i.t).replace(re, "<mark>$1</mark>")}</b><span>${esc(i.s)}</span></div>`).join("")
            + `<div class="cob-bus-h">${all.length > res.length ? all.length + " coincidencias · siga escribiendo para acotar" : all.length + (all.length === 1 ? " coincidencia" : " coincidencias")} · ↑ ↓ y Enter</div>`
            : `<div class="cob-bus-h">Sin resultados para «${esc(txt)}»</div>`;
          if (res.length) q.setAttribute("aria-activedescendant", id + "O" + act);
        }
        L.hidden = false; q.setAttribute("aria-expanded", "true");
        $$(".cob-bus-o", L).forEach(e => e.addEventListener("mousedown", ev => { ev.preventDefault(); elegir(res[+e.dataset.n]); }));
      };
      const elegir = i => {
        if (!i) return;
        q.value = i.t; cerrarL();
        if (tag0) tag0.textContent = i.s.split(" · ")[0];
        if (hid.value !== i.id) { hid.value = i.id; hid.dispatchEvent(new Event("change", { bubbles: true })); }
      };
      q.addEventListener("input", () => { act = 0; if (tag0) tag0.textContent = ""; pintar(); });
      q.addEventListener("click", () => { if (L.hidden) { q.select(); pintar(); } });
      q.addEventListener("keydown", e => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (L.hidden) return pintar(); if (!res.length) return; act = (act + (e.key === "ArrowDown" ? 1 : res.length - 1)) % res.length; pintar(); }
        else if (e.key === "Enter") { if (!L.hidden && res.length) { e.preventDefault(); elegir(res[act]); } }
        else if (e.key === "Escape") { if (!L.hidden) { e.stopPropagation(); cerrarL(); } }
      });
      q.addEventListener("blur", () => setTimeout(() => {
        cerrarL();
        const x = cfg.lista.find(i => i.id === hid.value);
        q.value = x ? x.t : ""; if (tag0 && x) tag0.textContent = x.s.split(" · ")[0];
      }, 120));
    });
  }
  /* filtro en vivo de una lista larga ya pintada (tabla o lista de la izquierda) */
  const filtroCaja = (id, ph) => `<div class="tb-search cob-filtro">${icon("search")}<input id="${id}" type="search" placeholder="${esc(ph)}" aria-label="${esc(ph)}" autocomplete="off"></div>`;
  function wireFiltro(root, id, filas) {
    const q = $("#" + id, root); if (!q) return;
    q.addEventListener("input", () => {
      const t = U.norm(q.value).split(/\s+/).filter(Boolean);
      $$(filas, root).forEach(r => { const h = U.norm(r.textContent); r.style.display = t.every(x => h.includes(x)) ? "" : "none"; });
    });
  }
  /* todos los cajones del módulo conectan sus buscadores solos */
  const openSheet = o => U.openSheet(Object.assign({}, o, { after: el => { wireBus(el); if (o.after) o.after(el); } }));


  /* ═════════════════════════════════════════════════════════════
     CxC · CONTA RUTA (CXC-004) — datos de la demo
     Para el cliente es de contado; para el sistema es crédito a un día,
     cancelado contra entrega o por transferencia. Se emiten con la
     misma función que la caja, así entran a la cartera, al mayor y al
     IVA diferido como cualquier factura a crédito.
     ═════════════════════════════════════════════════════════════ */
  const RUTA_CLI = ["C5", "C9", "C11"];
  RUTA_CLI.forEach(id => { if (D.cliById[id]) D.cliById[id].plazo = 1; });
  function sembrarRuta() {
    if (D.documentos.some(d => d.ruta)) return;
    const arts = D.articulos.filter(a => a.tipo === "Producto" && a.precio > 2500 && a.precio < 26000);
    const plan = [
      ["C5", "L3", 1, 14, "RT3", "Efectivo contra entrega", "Entregada"],
      ["C9", "L6", 1, 9, "RT1", "SINPE móvil", "Entregada"],
      ["C11", "L5", 0, 8, "RT2", "Transferencia", "En ruta"],
      ["C5", "L3", 0, 10, "RT3", "Efectivo contra entrega", "En ruta"],
      ["C9", "L1", 1, 11, "RT5", "Transferencia", "Entregada"],
      ["C11", "L5", 2, 15, "RT2", "SINPE móvil", "Entregada"]
    ];
    plan.forEach((p, i) => {
      const f = masDias(new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate(), p[3], 10 + i * 7), -p[2]);
      if (f > D.ahora()) return;
      const lineas = [0, 1, 2].map(j => { const a = arts[(i * 11 + j * 17) % arts.length]; return { artId: a.id, cant: 2 + ((i + j) % 5) * 3, precio: a.precio, desc: 0 }; });
      try {
        const d = D.emitir({ tipo: "FE", locId: p[1], term: 1, clienteId: p[0], fecha: f, lineas, condicion: "Crédito", medio: "Crédito" });
        const rt = D.rutas.find(r => r.id === p[4]) || D.rutas[0];
        d.ruta = { id: rt.id, nom: rt.nom, chofer: rt.chofer, medio: p[5], entrega: p[6], liquidada: null };
      } catch (e) { /* período cerrado: la demo sigue sin conta ruta */ }
    });
    /* dos ya se liquidaron: la que se pagó por SINPE y la de hace dos días */
    D.documentos.filter(d => d.ruta && d.ruta.entrega === "Entregada").slice(0, 2).forEach(d => liquidarRuta(d, d.ruta.medio === "SINPE móvil" ? "SINPE móvil" : "Transferencia", "BN-" + (48210 + d.total % 900), true));
  }
  function liquidarRuta(d, medio, ref, silencio) {
    const m = /Efectivo/.test(medio) ? "Efectivo" : medio;
    const r = F.aplicarCobro(d, { monto: d.saldo, medio: m, locId: d.locId, term: 1, offline: S.offline });
    if (r.error) { if (!silencio) toast("No se liquidó", r.error, "cr"); return null; }
    d.ruta.liquidada = { fecha: D.ahora(), medio, ref, rep: r.rep.cons, asiento: r.rep.asiento };
    if (!silencio) anotar("Liquidó conta ruta", d.cons + " · " + cliNom(d.clienteId) + " · " + c(r.rep.monto) + " · " + medio, "Baja");
    return r.rep;
  }
  sembrarRuta();

  A.screen("cob-ruta", {
    title: "Conta ruta",
    sub: () => "Crédito de un día a clientes sin línea, con entrega a domicilio · se liquida aquí, sin ir a cuentas por cobrar",
    render(v) {
      const docs = D.documentos.filter(d => d.ruta).sort((a, b) => b.fecha - a.fecha);
      const pend = docs.filter(d => d.saldo > 0), venc = pend.filter(d => diasVenc(d) > 0);
      const liq = docs.filter(d => d.ruta.liquidada);
      A._ruta = docs;
      const choferes = {};
      pend.forEach(d => { const k = d.ruta.chofer; (choferes[k] = choferes[k] || { chofer: k, ruta: d.ruta.nom, docs: [], efectivo: 0, otros: 0 }).docs.push(d); if (/Efectivo/.test(d.ruta.medio)) choferes[k].efectivo += d.saldo; else choferes[k].otros += d.saldo; });
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Por liquidar", c(pend.reduce((s, d) => s + d.saldo, 0)), { txt: pend.length + " facturas a un día" })}
          ${stat("Vencidas (más de 24 h)", c(venc.reduce((s, d) => s + d.saldo, 0)), { txt: venc.length + " sin liquidar después del plazo", dir: venc.length ? "down" : "" }, venc.length ? "var(--crit)" : "var(--ok)")}
          ${stat("Liquidadas", grp(liq.length), { txt: "cada una con su recibo electrónico de pago" }, "var(--ok)")}
          ${stat("Efectivo en manos de choferes", c(Object.values(choferes).reduce((s, x) => s + x.efectivo, 0)), { txt: "a entregar al cierre de la ruta" }, "var(--warn)")}
        </div>
        ${nota("<b>Por qué existe:</b> el sistema anterior no deja emitir una factura sin medio de pago, así que la entrega a domicilio se factura «a crédito» y alguien tiene que ir a cuentas por cobrar a cancelarla. Aquí la factura nace con plazo de <b>1 día</b> (término «Conta ruta» de Configuración) y se liquida desde esta misma lista, desde la caja o al validar la transferencia por WhatsApp. Al liquidarla sale el <b>REP</b> y el IVA diferido pasa a IVA por pagar.", "route")}
        ${card({
        title: "Facturas conta ruta", hint: "vencida = más de 24 horas sin liquidar",
        body: table({
          cols: [
            { t: "Factura", cls: "mono", fmt: d => `${esc(d.cons.slice(-10))}<span class="sub">${esc(locNom(d.locId))}</span>` },
            { t: "Cliente", fmt: d => `${esc(cliNom(d.clienteId))}<span class="sub">${esc((D.cliById[d.clienteId] || {}).ced || "")}</span>` },
            { t: "Ruta y chofer", fmt: d => `${esc(d.ruta.nom)}<span class="sub">${esc(d.ruta.chofer)}</span>` },
            { t: "Emitida · vence", cls: "mono", fmt: d => `${fh(d.fecha)}<span class="sub">vence ${fh(venceDe(d))}</span>` },
            { t: "Cobro previsto", fmt: d => `${esc(d.ruta.medio)}<span class="sub">${d.ruta.entrega === "Entregada" ? "entregada" : "en ruta"}</span>` },
            { t: "Saldo", r: true, cls: "mono", fmt: d => d.saldo ? `<b>${grp(d.saldo)}</b>` : `<span class="dim">0</span><span class="sub">de ${grp(d.total)}</span>` },
            {
              t: "Estado", fmt: d => d.ruta.liquidada ? tag("Liquidada · " + d.ruta.liquidada.rep.slice(-6), "ok", "check")
                : diasVenc(d) > 0 ? tag("Vencida", "cr", "alert") : tag("Por liquidar", "wa", "clock")
            },
            { t: "", r: true, fmt: (d, i) => d.saldo ? `<button class="btn sm pri" data-liq="${i}">Liquidar</button>` : `<button class="btn sm" data-asr="${i}">Ver asiento</button>` }
          ], rows: docs, rowCls: d => (d.saldo && diasVenc(d) > 0 ? "cr" : "")
        })
      })}
        ${card({
        title: "Liquidación por chofer", hint: "lo que cada chofer trae en efectivo y lo que el cliente paga directo al banco",
        body: Object.keys(choferes).length ? table({
          cols: [
            { t: "Chofer", fmt: x => `<b>${esc(x.chofer)}</b><span class="sub">${esc(x.ruta)}</span>` },
            { t: "Facturas", r: true, cls: "mono", fmt: x => x.docs.length },
            { t: "Efectivo contra entrega", r: true, cls: "mono", fmt: x => grp(x.efectivo) },
            { t: "SINPE / transferencia", r: true, cls: "mono", fmt: x => grp(x.otros) },
            { t: "", r: true, fmt: (x, i) => `<button class="btn sm" data-chof="${esc(x.chofer)}">${icon("cash")}Liquidar ruta</button>` }
          ], rows: Object.values(choferes)
        }) : empty("check", "Nada por liquidar", "Todas las facturas de ruta están canceladas.")
      })}</div>`;
    },
    wire(v) {
      $$("[data-liq]", v).forEach(b => b.addEventListener("click", () => liquidarSheet(A._ruta[+b.dataset.liq])));
      $$("[data-asr]", v).forEach(b => b.addEventListener("click", () => { const d = A._ruta[+b.dataset.asr]; verAsiento(asientoPor(d.ruta.liquidada && d.ruta.liquidada.asiento), "Liquidación de " + d.cons.slice(-10)); }));
      $$("[data-chof]", v).forEach(b => b.addEventListener("click", () => liquidarChofer(b.dataset.chof)));
    }
  });
  function liquidarSheet(d) {
    const iva = ivaDif(d);
    const det = m => [
      { cta: D.cuentaMedio(/Efectivo/.test(m) ? "Efectivo" : m), debe: d.saldo, haber: 0 },
      { cta: "1-01-03-001", debe: 0, haber: d.saldo, nota: d.cons.slice(-10) },
      { cta: "2-01-02-002", debe: iva, haber: 0 }, { cta: "2-01-02-001", debe: 0, haber: iva, nota: "IVA del REP" }
    ];
    openSheet({
      title: "Liquidar conta ruta", sub: `${d.cons.slice(-10)} · ${cliNom(d.clienteId)} · ${c(d.saldo)}`,
      body: `${fld("Cómo pagó", sel("lqM", ["Efectivo contra entrega", "SINPE móvil", "Transferencia"], d.ruta.medio), "lqM")}
        ${fld("Referencia", inp("lqR", "", 'placeholder="Número de SINPE o de transferencia"'), "lqR", "Obligatoria para SINPE y transferencia: es lo que se busca en el estado del banco.")}
        <div id="lqA">${asientoBox(det(d.ruta.medio))}</div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="lqOk">${icon("check")}Liquidar y emitir REP</button>`,
      after(el) {
        cerrar(el);
        $("#lqM", el).addEventListener("change", e => { $("#lqA", el).innerHTML = asientoBox(det(e.target.value)); });
        $("#lqOk", el).addEventListener("click", () => {
          const m = $("#lqM", el).value, ref = $("#lqR", el).value.trim();
          if (!/Efectivo/.test(m) && !ref) return toast("Falta la referencia", "Sin la referencia no se puede conciliar contra el banco.", "cr");
          if (!periodoOk()) return;
          const rep = liquidarRuta(d, m, ref || "Contra entrega · " + d.ruta.chofer);
          if (!rep) return;
          closeSheet(); toast("Liquidada · REP " + rep.cons.slice(-8), "El IVA diferido de la factura pasó a IVA por pagar de setiembre.", "ok"); A.refresh();
        });
      }
    });
  }
  function liquidarChofer(ch) {
    const docs = D.documentos.filter(d => d.ruta && d.saldo > 0 && d.ruta.chofer === ch);
    const ef = docs.filter(d => /Efectivo/.test(d.ruta.medio)).reduce((s, d) => s + d.saldo, 0);
    openSheet({
      wide: true, title: "Liquidar la ruta de " + ch, sub: docs.length + " facturas · efectivo esperado " + c(ef),
      body: `${table({
        cols: [
          { t: "", fmt: (d, i) => `<input type="checkbox" data-lc="${i}" ${d.ruta.entrega === "Entregada" ? "checked" : ""}>` },
          { t: "Factura", cls: "mono", fmt: d => esc(d.cons.slice(-10)) }, { t: "Cliente", fmt: d => esc(cliNom(d.clienteId)) },
          { t: "Cobro", fmt: d => esc(d.ruta.medio) }, { t: "Entrega", fmt: d => tag(d.ruta.entrega, d.ruta.entrega === "Entregada" ? "ok" : "ac") },
          { t: "Saldo", r: true, cls: "mono", fmt: d => grp(d.saldo) }
        ], rows: docs
      })}
        ${g2(fld("Efectivo que entrega el chofer", numInp("lcE", docs.filter(d => d.ruta.entrega === "Entregada" && /Efectivo/.test(d.ruta.medio)).reduce((s, d) => s + d.saldo, 0)), "lcE") + fld("Recibe", sel("lcQ", ["Kevin Solano · caja Santa Rosa", "Marta Rojas · caja Turrialba", "Yendry Chacón · caja Pacayas"]), "lcQ"))}
        <div id="lcD"></div>
        ${nota("Lo no entregado vuelve con el chofer y sigue «En ruta». Una diferencia en el efectivo queda como faltante del chofer y pide la firma del administrador del local.", "shield")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="lcOk">${icon("check")}Liquidar marcadas</button>`,
      after(el) {
        cerrar(el);
        const calc = () => {
          const marc = docs.filter((d, i) => $(`[data-lc="${i}"]`, el).checked && /Efectivo/.test(d.ruta.medio)).reduce((s, d) => s + d.saldo, 0);
          const dif = numIn($("#lcE", el).value) - marc;
          $("#lcD", el).innerHTML = `<div class="cob-tot"><span>Efectivo esperado <b class="num">${c(marc)}</b></span><span>Entregado <b class="num">${c(numIn($("#lcE", el).value))}</b></span><span>Diferencia <b class="num" style="color:${dif ? "var(--crit)" : "var(--ok)"}">${c(dif)}</b></span></div>`;
          return dif;
        };
        $$("[data-lc]", el).forEach(x => x.addEventListener("change", calc)); $("#lcE", el).addEventListener("input", calc); calc();
        $("#lcOk", el).addEventListener("click", () => {
          if (!periodoOk()) return;
          const dif = calc();
          let n = 0;
          docs.forEach((d, i) => { if ($(`[data-lc="${i}"]`, el).checked && liquidarRuta(d, d.ruta.medio, "Liquidación de ruta · " + ch)) n++; });
          if (dif) anotar("Diferencia en liquidación de ruta", ch + " · " + c(dif), "Alta");
          closeSheet(); toast(n + " facturas liquidadas", dif ? "La diferencia de " + c(dif) + " quedó a nombre del chofer para aprobación del administrador." : "El efectivo cuadra con las facturas.", dif ? "wa" : "ok"); A.refresh();
        });
      }
    });
  }

  /* ═════════════════════════════════════════════════════════════
     CxC · CRÉDITO DE CLIENTES (CXC-001, CXC-002)
     Toda la cartera de una vez: línea, uso, bloqueos, solicitudes de
     línea y excepciones autorizadas. La ficha de cada cliente sigue en
     Ventas › Clientes › Crédito y usa los mismos datos.
     ═════════════════════════════════════════════════════════════ */
  const SOLICITUDES = [
    { id: "SC-0142", fecha: masDias(HOY, -3), cliId: "C5", tipo: "Línea nueva", actual: 0, pide: 500000, plazoAct: 1, plazo: 30, garantia: "Pagaré", solicita: "Kevin Solano", estado: "En análisis", docs: ["Cédula", "Orden patronal CCSS"], analisis: null },
    { id: "SC-0141", fecha: masDias(HOY, -5), cliId: "C1", tipo: "Aumento de límite", actual: 4000000, pide: 6000000, plazoAct: 30, plazo: 30, garantia: "Letra de cambio", solicita: "Marta Rojas", estado: "Por aprobar gerencia", docs: ["Personería jurídica", "Estados financieros 2025", "Certificación CCSS al día"], analisis: { por: "Sonia Calderón", dias: 28, recomienda: "Aprobar ₡5 500 000: paga en promedio a 28 días y no tiene devoluciones de cheque." } },
    { id: "SC-0138", fecha: masDias(HOY, -12), cliId: "C12", tipo: "Cambio de plazo", actual: 2500000, pide: 2500000, plazoAct: 30, plazo: 45, garantia: "Ninguna", solicita: "Diego Solano", estado: "Rechazada", docs: ["Certificación CCSS al día"], analisis: { por: "Sonia Calderón", dias: 51, recomienda: "Rechazar: ya paga a 51 días con plazo de 30." }, resuelve: "Adrián Vindas" }
  ];
  const EXCEPCIONES = [
    { fecha: masDias(HOY, -2), cliId: "C10", tipo: "Desbloqueo por una factura", monto: 850000, autorizo: "Adrián Vindas", motivo: "Colado de losa del liceo; se compromete a pagar el viernes", estado: "Consumida" },
    { fecha: masDias(HOY, -6), cliId: "C3", tipo: "Sobregiro de límite", monto: 1400000, autorizo: "Adrián Vindas", motivo: "Pedido de varilla contra orden de compra firmada", estado: "Consumida" },
    { fecha: masDias(HOY, -1), cliId: "C13", tipo: "Desbloqueo por una factura", monto: 300000, autorizo: "Álvaro Cordero", motivo: "Cliente abonó ₡400 000 por transferencia; falta validarla", estado: "Vigente hasta hoy" }
  ];
  const conLinea = () => D.clientes.filter(x => x.limite > 0);
  const estadoCred = cli => { const b = V.bloqueo(cli.id); return b ? tag(b.t, b.k === "cr" ? "cr" : "wa", b.k === "cr" ? "lock" : "alert") : tag("Al día", "ok", "check"); };

  A.workspace("cob-credito", {
    title: "Crédito de clientes",
    sub: "Líneas, bloqueos, solicitudes y excepciones",
    tabs: [
      {
        id: "lineas", t: "Líneas y bloqueos", sub: "La caja factura a crédito sin llamar a nadie si el cliente está dentro del límite y al día",
        badge: () => { const n = conLinea().filter(x => V.bloqueo(x.id) && V.bloqueo(x.id).k === "cr").length; return { n, k: "cr", l: n + " bloqueados" }; },
        actions: () => `<button class="btn" data-ir="clientes|credito">${icon("users")}Ficha del cliente</button>`,
        render(v) {
          const L = conLinea().sort((a, b) => (b.saldo / b.limite) - (a.saldo / a.limite));
          const lim = L.reduce((s, x) => s + x.limite, 0), sal = L.reduce((s, x) => s + x.saldo, 0);
          const bloq = L.filter(x => V.bloqueo(x.id) && V.bloqueo(x.id).k === "cr");
          A._cred = L;
          v.innerHTML = `<div class="wrap">
            <div class="grid g4">
              ${stat("Líneas otorgadas", c(lim), { txt: L.length + " clientes con crédito" })}
              ${stat("Saldo usado", c(sal), { txt: dec(sal / lim * 100, 1) + " % de las líneas" })}
              ${stat("Bloqueados en la caja", grp(bloq.length), { txt: "por mora de más de " + V.PARAM.diasBloqueo + " días o límite excedido", dir: bloq.length ? "down" : "" }, "var(--crit)")}
              ${stat("Excepciones vigentes", grp(EXCEPCIONES.filter(x => /Vigente/.test(x.estado)).length), { txt: "cada una con quién la autorizó" }, "var(--warn)")}
            </div>
            ${card({
            title: "Líneas de crédito", hint: "disponible = límite − saldo − pedidos comprometidos", actions: filtroCaja("lnQ", "Buscar cliente o cédula"),
            body: table({
              h: "calc(100dvh - 400px)", onRow: true,
              cols: [
                { t: "Cliente", fmt: x => `<b>${esc(x.nom)}</b><span class="sub">${esc(x.ced)} · ${esc(x.categoria)}</span>` },
                { t: "Límite", r: true, cls: "mono", fmt: x => grp(x.limite) },
                { t: "Saldo", r: true, cls: "mono", fmt: x => grp(x.saldo) },
                { t: "Comprometido", r: true, cls: "mono", fmt: x => { const k = comprometido(x); return k ? grp(k) : '<span class="dim">—</span>'; } },
                { t: "Disponible", r: true, cls: "mono", fmt: x => { const d = x.limite - x.saldo - comprometido(x), u = Math.min(100, x.saldo / x.limite * 100); return `<b style="color:${d < 0 ? "var(--crit)" : "var(--ok)"}">${d < 0 ? "−" : ""}${grp(d)}</b><div style="margin-top:4px">${prog([{ w: u, col: u >= 100 ? "var(--crit)" : u > 80 ? "var(--warn)" : "var(--accent)" }])}</div>`; } },
                { t: "Plazo · paga en", r: true, cls: "mono", fmt: x => { const p = diasPago(x); return `${x.plazo} d<span class="sub" style="color:${p > x.plazo ? "var(--warn)" : ""}">paga en ${p} d</span>`; } },
                { t: "Vencido", r: true, cls: "mono", fmt: x => { const s = V.vencidas(x.id).reduce((a, d) => a + d.saldo, 0); return s ? `<b style="color:var(--crit)">${grp(s)}</b>` : '<span class="dim">—</span>'; } },
                { t: "Estado en la caja", fmt: x => estadoCred(x) },
                { t: "", r: true, fmt: (x, i) => V.bloqueo(x.id) ? `<button class="btn sm" data-exc="${i}">${icon("shield")}Autorizar</button>` : "" }
              ], rows: L, rowCls: x => (V.bloqueo(x.id) && V.bloqueo(x.id).k === "cr" ? "cr" : "")
            })
          })}
            ${nota("La caja revisa el crédito en el momento de facturar (no después): con línea vigente y al día no pide autorización; con facturas vencidas avisa; con mora de más de " + V.PARAM.diasBloqueo + " días o sin disponible bloquea y muestra quién puede autorizar. Cada excepción queda con el nombre del autorizador, el monto y el motivo.", "shield")}
          </div>`;
        },
        wire(v) {
          A.wireIr(v); wireFiltro(v, "lnQ", "tbody tr");
          $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", e => { if (e.target.closest("button")) return; irFicha(A._cred[+tr.dataset.i].id); }));
          $$("[data-exc]", v).forEach(b => b.addEventListener("click", () => excepcionSheet(A._cred[+b.dataset.exc])));
        }
      },
      {
        id: "solicitudes", t: "Solicitudes de línea", sub: "Vendedor solicita · crédito analiza · gerencia aprueba (nunca la misma persona)",
        badge: () => { const n = SOLICITUDES.filter(x => !/Aprobada|Rechazada/.test(x.estado)).length; return { n, k: "wa", l: n + " abiertas" }; },
        actions: () => `<button class="btn pri" id="scNueva">${icon("plus")}Nueva solicitud</button>`,
        render(v) {
          v.innerHTML = `<div class="wrap">${card({
            title: "Solicitudes", hint: "límite nuevo, aumento o cambio de plazo",
            body: table({
              onRow: true,
              cols: [
                { t: "Solicitud", cls: "mono", fmt: x => `${esc(x.id)}<span class="sub">${fecha(x.fecha)}</span>` },
                { t: "Cliente", fmt: x => `${esc(cliNom(x.cliId))}<span class="sub">solicita ${esc(x.solicita)}</span>` },
                { t: "Tipo", fmt: x => esc(x.tipo) },
                { t: "Actual", r: true, cls: "mono", fmt: x => `${grp(x.actual)}<span class="sub">${x.plazoAct === 1 ? "conta ruta" : x.plazoAct + " d"}</span>` },
                { t: "Solicitado", r: true, cls: "mono", fmt: x => `<b>${grp(x.pide)}</b><span class="sub">${x.plazo} d</span>` },
                { t: "Garantía", fmt: x => esc(x.garantia) },
                { t: "Estado", fmt: x => tag(x.estado, x.estado === "Aprobada" ? "ok" : x.estado === "Rechazada" ? "cr" : "wa", x.estado === "Aprobada" ? "check" : x.estado === "Rechazada" ? "x" : "clock") }
              ], rows: SOLICITUDES
            })
          })}</div>`;
        },
        wire(v) {
          $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => solicitudSheet(SOLICITUDES[+tr.dataset.i])));
          const b = $("#scNueva"); if (b) b.addEventListener("click", () => solicitudSheet(null));
        }
      },
      {
        id: "excepciones", t: "Excepciones autorizadas", sub: "Sobregiros y desbloqueos: quién, cuándo, por cuánto y por qué",
        render(v) {
          const sob = [];
          D.clientes.forEach(x => ((V.FICHA[x.id] || {}).sobregiros || []).forEach(s => sob.push({ fecha: s.fecha, cliId: x.id, tipo: "Sobregiro de límite", monto: s.monto, autorizo: s.autorizo, motivo: s.motivo, estado: "Vigente · una factura" })));
          const rows = sob.concat(EXCEPCIONES).sort((a, b) => b.fecha - a.fecha);
          v.innerHTML = `<div class="wrap">${card({
            title: "Bitácora de excepciones de crédito", hint: rows.length + " registradas",
            body: table({
              cols: [
                { t: "Fecha", cls: "mono", fmt: x => fh(x.fecha) },
                { t: "Cliente", fmt: x => esc(cliNom(x.cliId)) },
                { t: "Tipo", fmt: x => esc(x.tipo) },
                { t: "Monto", r: true, cls: "mono", fmt: x => grp(x.monto) },
                { t: "Autorizó", fmt: x => `<b>${esc(x.autorizo)}</b>` },
                { t: "Motivo", fmt: x => `<span style="font-size:12.5px">${esc(x.motivo)}</span>` },
                { t: "Estado", fmt: x => tag(x.estado, /Vigente/.test(x.estado) ? "wa" : "mu") }
              ], rows
            })
          })}
          ${nota("Una excepción vale para una sola factura y se consume al aplicarla, igual que las autorizaciones de margen. Hoy la bitácora del sistema anterior registra quién movió la casilla, no quién autorizó: aquí el autorizador pone su clave.", "history")}</div>`;
        }
      },
      {
        id: "politica", t: "Política de crédito", sub: "Parámetros que aplica la caja y la gestión de cobro",
        render(v) {
          const P = V.PARAM;
          v.innerHTML = `<div class="wrap"><div class="grid g2" style="align-items:start">
            ${card({
            title: "Bloqueo en la caja", body: `${fld("Días de atraso que bloquean el crédito", numInp("poB", P.diasBloqueo), "poB", "Hoy: " + P.diasBloqueo + " días. Una política más estricta (30 o 45) protege más la cartera; es decisión de gerencia.")}
              ${fld("Con facturas vencidas (menos de ese atraso)", sel("poA", ["Avisar y dejar facturar", "Pedir autorización"], "Avisar y dejar facturar"), "poA")}
              ${fld("Límite excedido", sel("poL", ["Pedir autorización con clave", "Bloquear sin excepción"], "Pedir autorización con clave"), "poL")}
              <div style="display:flex;justify-content:flex-end"><button class="btn pri" id="poOk">${icon("check")}Guardar política</button></div>`
          })}
            ${card({
            title: "Tramos de antigüedad y estimación de incobrables", hint: "política de la empresa",
            body: table({
              cols: [{ t: "Tramo (días vencida)", fmt: t => esc(t.l) }, { t: "Estimación", r: true, cls: "mono", fmt: t => { const p = AU.POLITICA.incobrables.find(x => t.a >= x[0] && t.a <= x[1]); return p ? p[2] + " %" : "0 %"; } }],
              rows: TRAMOS
            }) + `<div style="padding:10px 16px">${nota("Los tramos de la antigüedad son los mismos de la política: 91 a 120 y más de 120 van separados porque llevan 25 % y 50 %.", "calc")}</div>`
          })}
            ${card({
            title: "Plazos disponibles (SIS-005)",
            body: `<div style="display:flex;flex-wrap:wrap;gap:6px">${["Contado", "Conta ruta · 1 día", "8 días", "15 días", "30 días", "45 días", "60 días", "90 días"].map(p => tag(p, "mu")).join("")}</div>
              <div class="mut" style="font-size:12.5px;margin-top:10px">Se administran en Configuración › Términos de pago. El plazo de cada factura se calcula desde la fecha de emisión con el plazo del cliente.</div>`,
            actions: `<button class="btn sm" data-ir="sis-terminos">Configurar</button>`
          })}
            ${card({
            title: "Recordatorios de cobro por WhatsApp (INT-001)",
            body: kvs([["3 días antes del vencimiento", tag("Activo", "ok")], ["El día del vencimiento", tag("Activo", "ok")], ["7 días vencida", tag("Activo", "ok")], ["15 días vencida · con estado de cuenta", tag("Activo", "ok")], ["30 días vencida", tag("Pasa a gestión personal", "wa")]])
          })}
          </div></div>`;
        },
        wire(v) {
          A.wireIr(v);
          $("#poOk", v).addEventListener("click", () => {
            const n = r0(numIn($("#poB", v).value));
            if (n < 1 || n > 180) return toast("Revise los días", "Entre 1 y 180 días.", "cr");
            const antes = V.PARAM.diasBloqueo; V.PARAM.diasBloqueo = n;
            anotar("Cambió política de crédito", "Días de atraso para bloqueo", "Alta", antes + " días", n + " días");
            toast("Política guardada", "La caja aplica el nuevo bloqueo desde la próxima factura.", "ok"); A.refresh();
          });
        }
      }
    ]
  });
  function excepcionSheet(cli) {
    const b = V.bloqueo(cli.id);
    openSheet({
      title: "Autorizar excepción de crédito", sub: cli.nom + " · " + (b ? b.t : ""),
      body: `${b ? nota(esc(b.d), "lock", "cr") : ""}
        ${g2(fld("Tipo", sel("exT", ["Desbloqueo por una factura", "Sobregiro de límite"]), "exT") + fld("Monto máximo", numInp("exM", 500000), "exM"))}
        ${fld("Motivo", `<textarea id="exW" rows="2" placeholder="Por qué se autoriza"></textarea>`, "exW")}
        ${firmaCampos(["Adrián Vindas · Gerencia", "Álvaro Cordero · Subgerencia", "Sonia Calderón · Crédito y cobro"])}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="exOk">${icon("shield")}Autorizar</button>`,
      after(el) {
        cerrar(el);
        $("#exOk", el).addEventListener("click", () => {
          const mot = $("#exW", el).value.trim(); if (!mot) return toast("Escriba el motivo", "", "cr");
          if (!$("#auQK", el).value) return toast("Falta la clave del autorizador", "", "cr");
          const a = $("#auQ", el).value.split(" · ")[0], m = r0(numIn($("#exM", el).value));
          EXCEPCIONES.unshift({ fecha: D.ahora(), cliId: cli.id, tipo: $("#exT", el).value, monto: m, autorizo: a, motivo: mot, estado: "Vigente hasta hoy" });
          V.anotar("Autorizó excepción de crédito", cli.nom + " · " + c(m) + " · " + mot, a, S.locId, "Alta");
          closeSheet(); toast("Excepción autorizada", "Vale para la próxima factura a crédito de " + cli.nom + ".", "ok"); A.refresh();
        });
      }
    });
  }
  function solicitudSheet(x) {
    const nueva = !x;
    const s = x || { id: "SC-0143", fecha: D.ahora(), cliId: "C9", tipo: "Línea nueva", actual: 0, pide: 300000, plazoAct: 1, plazo: 15, garantia: "Pagaré", solicita: "Kevin Solano", estado: "Borrador", docs: [], analisis: null };
    const cli = D.cliById[s.cliId];
    const docs = ["Cédula o personería jurídica", "Certificación CCSS al día", "Estados financieros o constancia de ingresos", "Referencias comerciales (2)", "Pagaré o letra firmada"];
    const puedeAprobar = s.estado === "Por aprobar gerencia", puedeAnalizar = s.estado === "En análisis";
    openSheet({
      wide: true, title: nueva ? "Nueva solicitud de crédito" : "Solicitud " + s.id, sub: nueva ? "La llena el vendedor; la analiza crédito y la aprueba gerencia" : cliNom(s.cliId) + " · " + s.estado,
      body: `${g3(fld("Cliente", nueva ? busCli("soC", s.cliId) : `<input value="${esc(cli.nom)}" disabled>`, "soC")
        + fld("Tipo", nueva ? sel("soT", ["Línea nueva", "Aumento de límite", "Cambio de plazo"], s.tipo) : `<input value="${esc(s.tipo)}" disabled>`, "soT")
        + fld("Garantía", sel("soG", ["Pagaré", "Letra de cambio", "Hipotecaria", "Ninguna"], s.garantia), "soG"))}
        ${g3(fld("Límite solicitado", numInp("soM", s.pide), "soM") + fld("Plazo", sel("soP", [[8, "8 días"], [15, "15 días"], [30, "30 días"], [45, "45 días"], [60, "60 días"]], s.plazo), "soP") + fld("Solicita", `<input value="${esc(s.solicita)}" disabled>`))}
        <div class="grid g2" style="gap:12px;align-items:start;margin-top:4px">
          ${card({ title: "Documentos", body: docs.map((d, i) => `<label class="rc"><input type="checkbox" ${s.docs.some(k => d.indexOf(k.split(" ")[0]) === 0) || i === 1 && s.docs.length ? "checked" : ""}><span><b>${esc(d)}</b></span></label>`).join("") })}
          ${card({
        title: "Análisis de crédito", body: kvs([
          ["Cliente desde", esc(cli.desde || "—")], ["Saldo actual", c(r0(cli.saldo))], ["Vencido", c(V.vencidas(cli.id).reduce((a, d) => a + d.saldo, 0))],
          ["Paga en promedio", diasPago(cli) ? diasPago(cli) + " días" : "de contado"], ["Cheques devueltos (12 meses)", "0"],
          ["Compras últimos 12 meses", c(D.documentos.filter(d => d.clienteId === cli.id && d.tipo !== "NC").reduce((a, d) => a + d.total, 0) * 3)]
        ]) + (s.analisis ? `<div style="margin-top:10px">${nota(`<b>${esc(s.analisis.por)}:</b> ${esc(s.analisis.recomienda)}`, "check", "ok")}</div>` : "")
      })}
        </div>
        ${puedeAnalizar ? fld("Recomendación de crédito", `<textarea id="soR" rows="2" placeholder="Monto y plazo recomendados, y por qué"></textarea>`, "soR") : ""}
        ${puedeAprobar ? firmaCampos(["Adrián Vindas · Gerencia", "Álvaro Cordero · Subgerencia"]) : ""}
        ${nota("Quien solicita no analiza y quien analiza no aprueba (SEG-006). Al aprobar, la línea entra a la ficha del cliente y la caja la usa en la siguiente factura; el cambio queda en la bitácora con el valor anterior y el nuevo.", "shield")}`,
      footer: `<button class="btn" data-cerrar>Cerrar</button><div class="gap"></div>
        ${nueva ? `<button class="btn pri" id="soEnv">${icon("upload")}Enviar a análisis</button>` : ""}
        ${puedeAnalizar ? `<button class="btn pri" id="soAn">${icon("check")}Enviar a gerencia</button>` : ""}
        ${puedeAprobar ? `<button class="btn" id="soRe">${icon("x")}Rechazar</button><button class="btn pri" id="soAp">${icon("check")}Aprobar</button>` : ""}`,
      after(el) {
        cerrar(el);
        const env = $("#soEnv", el);
        if (env) env.addEventListener("click", () => {
          const k = D.cliById[$("#soC", el).value];
          SOLICITUDES.unshift({ id: "SC-0" + (143 + SOLICITUDES.length - 3), fecha: D.ahora(), cliId: k.id, tipo: $("#soT", el).value, actual: k.limite, pide: r0(numIn($("#soM", el).value)), plazoAct: k.plazo, plazo: +$("#soP", el).value, garantia: $("#soG", el).value, solicita: quien(), estado: "En análisis", docs: [], analisis: null });
          anotar("Solicitó línea de crédito", k.nom, "Media"); closeSheet(); toast("Solicitud enviada", "Crédito y cobro la analiza; se le avisa por WhatsApp.", "ok"); A.refresh();
        });
        const an = $("#soAn", el);
        if (an) an.addEventListener("click", () => {
          const r = $("#soR", el).value.trim(); if (!r) return toast("Escriba la recomendación", "", "cr");
          if (quien() === s.solicita) return toast("No puede analizar su propia solicitud", "", "cr");
          s.analisis = { por: quien(), dias: diasPago(cli), recomienda: r }; s.estado = "Por aprobar gerencia";
          anotar("Analizó solicitud de crédito", s.id + " · " + cli.nom, "Media"); closeSheet(); toast("Enviada a gerencia", "", "ok"); A.refresh();
        });
        const ap = $("#soAp", el), re = $("#soRe", el);
        const resolver = ok => {
          if (!$("#auQK", el).value) return toast("Falta la clave del autorizador", "", "cr");
          const a = $("#auQ", el).value.split(" · ")[0];
          if (s.analisis && a.indexOf(s.analisis.por.split(" ")[0]) === 0) return toast("Quien analizó no puede aprobar", "", "cr");
          s.estado = ok ? "Aprobada" : "Rechazada"; s.resuelve = a;
          if (ok) {
            const antes = c(cli.limite) + " · " + cli.plazo + " d";
            cli.limite = r0(numIn($("#soM", el).value)); cli.plazo = +$("#soP", el).value;
            V.anotar("Aprobó línea de crédito", cli.nom + " · " + s.id, a, S.locId, "Alta", antes, c(cli.limite) + " · " + cli.plazo + " d");
          } else V.anotar("Rechazó solicitud de crédito", cli.nom + " · " + s.id, a, S.locId, "Media");
          closeSheet(); toast(ok ? "Línea aprobada" : "Solicitud rechazada", ok ? "La caja ya factura a crédito a " + cli.nom + " dentro del nuevo límite." : "", ok ? "ok" : "wa"); A.refresh();
        };
        if (ap) ap.addEventListener("click", () => resolver(true));
        if (re) re.addEventListener("click", () => resolver(false));
      }
    });
  }

  /* ═════════════════════════════════════════════════════════════
     CxC · ANÁLISIS DE CRÉDITO Y GESTIÓN DE COBRO (CXC-003)
     Antigüedad · Documentos · Estado de cuenta · Gestión · Incobrables
     ═════════════════════════════════════════════════════════════ */
  const GESTIONES = [];
  (function sembrarGestiones() {
    const tipos = ["Llamada", "WhatsApp", "Correo", "Visita"], res = ["Promete pagar", "No contesta", "Pide estado de cuenta", "Promete pagar", "Disputa una factura"];
    D.clientes.filter(x => V.vencidas(x.id).length).forEach((x, i) => {
      const venc = V.vencidas(x.id), s = venc.reduce((a, d) => a + d.saldo, 0);
      const r = res[i % res.length];
      GESTIONES.push({
        id: "GC" + (i + 1), fecha: masDias(HOY, -(i % 4) - 1), cliId: x.id, tipo: tipos[i % tipos.length], contacto: (V.FICHA[x.id] && V.FICHA[x.id].contactos[0] || {}).nom || x.nom,
        resultado: r, promesa: /Promete/.test(r) ? { fecha: masDias(HOY, (i % 3) - 1), monto: r0(s * (i % 2 ? 1 : 0.5)) } : null,
        nota: r === "Disputa una factura" ? "Dice que faltaron 4 sacos en la entrega de " + venc[0].cons.slice(-6) : r === "Pide estado de cuenta" ? "Se le envió por WhatsApp" : "",
        por: PERSONAS.cobro
      });
    });
  })();
  let cxcFiltro = "Todos", cxcCli = null, estCli = "C1", estObra = "Todas";
  const pendientes = () => cartera().sort((a, b) => diasVenc(b) - diasVenc(a));
  const porCliente = () => {
    const m = {};
    cartera().forEach(d => { const k = d.clienteId; const x = m[k] || (m[k] = { cli: D.cliById[k], saldo: 0, t: {}, docs: 0, max: -9999 }); x.saldo += d.saldo; x.docs++; const t = tramoDe(d).k; x.t[t] = (x.t[t] || 0) + d.saldo; x.max = Math.max(x.max, diasVenc(d)); });
    return Object.values(m).filter(x => x.cli).sort((a, b) => b.max - a.max);
  };
  const agingBar = docs => `<div class="aging cob-aging6">${TRAMOS.map(t => {
    const r = docs.filter(d => tramoDe(d) === t), s = r.reduce((a, d) => a + d.saldo, 0);
    return `<div class="ag"><div class="agv" style="color:${t.col}">${c(s)}</div><div class="agl">${esc(t.l)}${t.k === "pv" ? "" : " días"} · ${r.length} doc.</div></div>`;
  }).join("")}</div>`;
  function cuadreCxC() {
    const k = AU.cartera();
    return `<div class="cob-cuadre ${k.diferencia ? "cr" : ""}">${icon(k.diferencia ? "alert" : "check")}<span>Auxiliar de clientes <b class="num">${c(k.aux)}</b> · Mayor 1-01-03-001 <b class="num">${c(k.libro)}</b> · ${k.diferencia ? `<b style="color:var(--crit)">diferencia ${c(k.diferencia)}</b>` : "<b>cuadra</b>"}</span><button class="btn sm" data-ir="con-conciliaciones|cartera">Ver en Contabilidad</button></div>`;
  }

  A.workspace("cxc", {
    title: "Análisis de crédito y gestión de cobro",
    sub: "Antigüedad de saldos, estado de cuenta y seguimiento de cobro",
    onArg: (tab, dato) => { if (dato && D.cliById[dato]) { estCli = dato; cxcCli = dato; } },
    tabs: [
      {
        id: "antiguedad", t: "Antigüedad de saldos", sub: "Días vencida desde el vencimiento (fecha + plazo), no desde la emisión",
        actions: () => seg("cxf", ["Todos", "Con vencido", "Bloqueados"], cxcFiltro),
        render(v) {
          const docs = cartera();
          let rows = porCliente();
          if (cxcFiltro === "Con vencido") rows = rows.filter(x => x.max > 0);
          if (cxcFiltro === "Bloqueados") rows = rows.filter(x => V.bloqueo(x.cli.id) && V.bloqueo(x.cli.id).k === "cr");
          const tot = k => rows.reduce((s, x) => s + (x.t[k] || 0), 0);
          A._cxcRows = rows;
          v.innerHTML = `<div class="wrap">
            ${card({ title: "Antigüedad de la cartera", hint: "sobre " + c(docs.reduce((s, d) => s + d.saldo, 0)) + " por cobrar", body: agingBar(docs) })}
            ${cuadreCxC()}
            ${card({
            title: "Por cliente", hint: rows.length + " clientes · toque uno para ver su estado de cuenta", actions: filtroCaja("agQ", "Buscar cliente o cédula"),
            body: table({
              onRow: true, h: "calc(100dvh - 470px)",
              cols: [{ t: "Cliente", fmt: x => `<b>${esc(x.cli.nom)}</b><span class="sub">${esc(x.cli.ced)} · ${x.cli.plazo === 1 ? "conta ruta" : x.cli.plazo + " días"}</span>` },
              { t: "Límite", r: true, cls: "mono", fmt: x => x.cli.limite ? grp(x.cli.limite) : '<span class="dim">—</span>' }]
                .concat(TRAMOS.map(t => ({ t: t.l, r: true, cls: "mono", fmt: x => x.t[t.k] ? `<span style="color:${t.col}">${grp(x.t[t.k])}</span>` : '<span class="dim">—</span>' })))
                .concat([{ t: "Saldo", r: true, cls: "mono", fmt: x => `<b>${grp(x.saldo)}</b>` }, { t: "Crédito", fmt: x => estadoCred(x.cli) }]),
              rows, rowCls: x => (x.max > 90 ? "cr" : x.max > 0 ? "wa" : ""),
              foot: [{ v: "<b>Total</b>", span: 2 }].concat(TRAMOS.map(t => ({ v: grp(tot(t.k)), r: true, cls: "mono" }))).concat([{ v: "<b>" + grp(rows.reduce((s, x) => s + x.saldo, 0)) + "</b>", r: true, cls: "mono" }, { v: "" }])
            })
          })}</div>`;
        },
        wire(v) {
          A.wireIr(v);
          onSeg(v, "cxf", x => { cxcFiltro = x; A.refresh(); }); wireFiltro(v, "agQ", "tbody tr");
          $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => A.go("cxc", "estado:" + A._cxcRows[+tr.dataset.i].cli.id)));
        }
      },
      {
        id: "documentos", t: "Documentos por cobrar", sub: "Factura por factura, lo vencido primero",
        badge: () => { const n = cartera().filter(d => diasVenc(d) > 0).length; return { n, k: "wa", l: n + " vencidas" }; },
        actions: () => `<button class="btn" id="recall">${icon("chat")}Recordar por WhatsApp a los vencidos</button><button class="btn pri" data-ir="cob-recibos|nuevo">${icon("plus")}Recibo de dinero</button>`,
        render(v) {
          const pend = pendientes();
          A._cxc = pend;
          v.innerHTML = `<div class="wrap">${card({
            title: "Documentos por cobrar", hint: pend.length + " con saldo", actions: filtroCaja("dcQ", "Cliente, cédula o factura"),
            body: table({
              h: "calc(100dvh - 330px)",
              cols: [
                { t: "Documento", cls: "mono", fmt: r => `${esc(r.cons.slice(-10))}<span class="sub">${esc(locNom(r.locId))}</span>` },
                { t: "Cliente", fmt: r => `${esc(cliNom(r.clienteId))}<span class="sub">${esc(obraDe(r))}</span>` },
                { t: "Emitida", cls: "mono", fmt: r => fecha(r.fecha) },
                { t: "Vence", cls: "mono", fmt: r => fecha(venceDe(r)) },
                { t: "Días vencida", r: true, cls: "mono", fmt: r => { const x = diasVenc(r); return x > 0 ? `<b style="color:${x > 60 ? "var(--crit)" : "var(--warn)"}">${x}</b>` : `<span class="mut">faltan ${-x}</span>`; } },
                { t: "Total", r: true, cls: "mono", fmt: r => grp(r.total) },
                { t: "IVA diferido", r: true, cls: "mono", fmt: r => `<span class="mut">${grp(ivaDif(r))}</span>` },
                { t: "Saldo", r: true, cls: "mono", fmt: r => `<b>${grp(r.saldo)}</b>` },
                { t: "Estado", fmt: r => r.saldo < r.total ? tag("Abonada", "ac") : tag("Pendiente", "mu") },
                { t: "", r: true, fmt: (r, i) => `<button class="btn sm" data-as="${i}" title="Asiento de la venta">${icon("scale")}</button><button class="btn sm pri" data-pay="${i}">Cobrar</button>` }
              ],
              rows: pend, rowCls: r => { const x = diasVenc(r); return x > 60 ? "cr" : x > 0 ? "wa" : ""; }
            })
          })}</div>`;
        },
        wire(v) {
          A.wireIr(v);
          wireFiltro(v, "dcQ", "tbody tr");
          const rc = $("#recall"); if (rc) rc.addEventListener("click", () => { toast("Recordatorios en cola", "El agente de WhatsApp escribirá a los clientes con factura vencida y adjuntará el estado de cuenta.", "in"); A.go("whatsapp"); });
          $$("[data-pay]", v).forEach(b => b.addEventListener("click", () => { const d = A._cxc[+b.dataset.pay]; nuevoRecibo({ cliId: d.clienteId, docs: [d.id] }); }));
          $$("[data-as]", v).forEach(b => b.addEventListener("click", () => { const d = A._cxc[+b.dataset.as]; verAsiento(asientoDe(d.cons)[0], "Asiento de la venta " + d.cons.slice(-10)); }));
        }
      },
      {
        id: "estado", t: "Estado de cuenta", sub: "Facturas, abonos, recibos electrónicos de pago y notas de crédito del cliente, por obra",
        actions: () => `<button class="btn" id="ecWa">${icon("chat")}Enviar por WhatsApp</button><button class="btn" id="ecPr">${icon("print")}Imprimir</button>`,
        render(v) {
          const cli = D.cliById[estCli] || D.clientes[0];
          const obras = ["Todas"].concat(OBRAS[cli.id] || []);
          if (obras.indexOf(estObra) < 0) estObra = "Todas";
          const docs = D.documentos.filter(d => d.clienteId === cli.id && d.condicion === "Crédito" && (estObra === "Todas" || obraDe(d) === estObra));
          const cons = {}; docs.forEach(d => cons[d.cons] = d);
          const mov = [];
          docs.forEach(d => {
            mov.push({ f: d.fecha, doc: d.cons.slice(-10), t: "Factura a crédito", obra: obraDe(d), cargo: d.total, abono: 0, ref: "vence " + fecha(venceDe(d)) });
            const reps = F.reps.filter(r => r.docCons === d.cons);
            const pagRep = reps.reduce((s, r) => s + r.monto, 0);
            reps.forEach(r => mov.push({ f: r.fecha, doc: r.cons.slice(-10), t: "Abono · REP " + (r.estado === "Aceptado" ? "aceptado" : r.estado.toLowerCase()), obra: obraDe(d), cargo: 0, abono: r.monto, ref: r.medio + " a " + d.cons.slice(-6) }));
            const prev = d.total - d.saldo - pagRep;
            if (prev > 0) mov.push({ f: masDias(d.fecha, Math.min(plazoDe(d), diasEntre(d.fecha, HOY))), doc: "—", t: "Abonos del sistema anterior", obra: obraDe(d), cargo: 0, abono: prev, ref: "migración al 31 ago" });
          });
          D.documentos.filter(d => d.tipo === "NC" && d.clienteId === cli.id).forEach(n => mov.push({ f: n.fecha, doc: n.cons.slice(-10), t: "Nota de crédito", obra: "General", cargo: 0, abono: 0, ref: (n.concepto || "") + " · " + (n.reintegro || "") }));
          mov.sort((a, b) => a.f - b.f);
          let s = 0; mov.forEach(m => { s += m.cargo - m.abono; m.saldo = s; });
          const saldo = docs.reduce((a, d) => a + d.saldo, 0), venc = docs.filter(d => d.saldo > 0 && diasVenc(d) > 0);
          v.innerHTML = `<div class="wrap">
            ${card({
            body: `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
              <div style="flex:1;min-width:260px">${fld("Cliente", busCli("ecC", cli.id, k => k.limite || k.plazo === 1 || k.saldo > 0), "ecC")}</div>
              <div style="min-width:220px">${fld("Obra o proyecto", sel("ecO", obras, estObra), "ecO")}</div>
              <button class="btn" id="ecFi">${icon("users")}Ficha de crédito</button></div>
              <div class="ficha" style="margin:12px -17px -16px;border-top:1px solid var(--hair-2)">
                ${fichaCell("Límite", cli.limite ? c(cli.limite) : "sin línea")}${fichaCell("Plazo", cli.plazo === 1 ? "conta ruta" : cli.plazo + " días")}
                ${fichaCell("Saldo", c(saldo))}${fichaCell("Vencido", c(venc.reduce((a, d) => a + d.saldo, 0)), venc.length ? "var(--crit)" : "")}
                ${fichaCell("A favor", c(cli.saldoFavor || 0), cli.saldoFavor ? "var(--ok)" : "")}${fichaCell("Paga en promedio", diasPago(cli) ? diasPago(cli) + " días" : "—")}
              </div>`
          })}
            ${card({ title: "Antigüedad del cliente", body: agingBar(docs.filter(d => d.saldo > 0)) })}
            ${card({
            title: "Movimientos", hint: "del más antiguo al más reciente, con saldo corrido",
            body: table({
              h: "420px",
              cols: [
                { t: "Fecha", cls: "mono", fmt: m => fecha(m.f) }, { t: "Documento", cls: "mono", fmt: m => esc(m.doc) },
                { t: "Movimiento", fmt: m => `${esc(m.t)}<span class="sub">${esc(m.ref)}</span>` }, { t: "Obra", fmt: m => `<span class="mut">${esc(m.obra)}</span>` },
                { t: "Cargo", r: true, cls: "mono", fmt: m => (m.cargo ? grp(m.cargo) : '<span class="dim">—</span>') },
                { t: "Abono", r: true, cls: "mono", fmt: m => (m.abono ? grp(m.abono) : '<span class="dim">—</span>') },
                { t: "Saldo", r: true, cls: "mono", fmt: m => `<b>${grp(m.saldo)}</b>` }
              ], rows: mov,
              foot: [{ v: "<b>Saldo del estado de cuenta</b>", span: 6 }, { v: `<b>${grp(s)}</b>`, r: true, cls: "mono" }]
            })
          })}
          ${nota("El saldo del estado de cuenta es la suma de las facturas abiertas del cliente, el mismo número que usa la caja para el disponible y el que suma el auxiliar contra el mayor.", "calc")}</div>`;
        },
        wire(v) {
          wireBus(v);
          $("#ecC", v).addEventListener("change", e => { estCli = e.target.value; estObra = "Todas"; A.refresh(); });
          $("#ecO", v).addEventListener("change", e => { estObra = e.target.value; A.refresh(); });
          $("#ecFi", v).addEventListener("click", () => irFicha(estCli));
          const wa = $("#ecWa"), pr = $("#ecPr");
          if (wa) wa.addEventListener("click", () => { anotar("Envió estado de cuenta", cliNom(estCli), "Baja"); toast("Estado de cuenta enviado", "PDF sin enlaces al sistema (SEG-011), por WhatsApp al contacto de cobros de " + cliNom(estCli) + ".", "ok"); });
          if (pr) pr.addEventListener("click", () => toast("Listo para imprimir", "Plantilla «Estado de cuenta» de Configuración › Plantillas.", "in"));
        }
      },
      {
        id: "gestion", t: "Gestión de cobro", sub: "Agenda del día, promesas de pago y bitácora de gestiones",
        badge: () => { const n = GESTIONES.filter(g => g.promesa && diasEntre(g.promesa.fecha, HOY) >= 0 && !g.cumplida).length; return { n, k: "wa", l: n + " promesas para hoy o vencidas" }; },
        actions: () => `<button class="btn pri" id="gcNueva">${icon("plus")}Registrar gestión</button>`,
        render(v) {
          const prom = GESTIONES.filter(g => g.promesa);
          const hoyP = prom.filter(g => diasEntre(g.promesa.fecha, HOY) === 0), vencP = prom.filter(g => diasEntre(g.promesa.fecha, HOY) > 0);
          const sinG = D.clientes.filter(x => V.vencidas(x.id).length && !GESTIONES.some(g => g.cliId === x.id && diasEntre(g.fecha, HOY) <= 7));
          v.innerHTML = `<div class="wrap">
            <div class="grid g4">
              ${stat("Promesas para hoy", c(hoyP.reduce((s, g) => s + g.promesa.monto, 0)), { txt: hoyP.length + " clientes" }, "var(--accent)")}
              ${stat("Promesas incumplidas", c(vencP.reduce((s, g) => s + g.promesa.monto, 0)), { txt: vencP.length + " a llamar de nuevo", dir: vencP.length ? "down" : "" }, "var(--crit)")}
              ${stat("Vencidos sin gestión en 7 días", grp(sinG.length), { txt: "entran a la agenda de hoy" }, "var(--warn)")}
              ${stat("Recordatorios automáticos", "4 reglas", { txt: "WhatsApp antes y después del vencimiento" }, "var(--ok)")}
            </div>
            ${card({
            title: "Bitácora de gestiones", hint: "quién llamó, qué dijo el cliente y qué prometió",
            body: table({
              cols: [
                { t: "Fecha", cls: "mono", fmt: g => fecha(g.fecha) },
                { t: "Cliente", fmt: g => `<b>${esc(cliNom(g.cliId))}</b><span class="sub">${esc(g.contacto)}</span>` },
                { t: "Gestión", fmt: g => esc(g.tipo) },
                { t: "Resultado", fmt: g => `${tag(g.resultado, /Promete/.test(g.resultado) ? "ac" : /Disputa/.test(g.resultado) ? "cr" : "mu")}${g.nota ? `<span class="sub">${esc(g.nota)}</span>` : ""}` },
                { t: "Promesa", r: true, cls: "mono", fmt: g => g.promesa ? `${grp(g.promesa.monto)}<span class="sub">${fecha(g.promesa.fecha)}</span>` : '<span class="dim">—</span>' },
                { t: "Vencido hoy", r: true, cls: "mono", fmt: g => grp(V.vencidas(g.cliId).reduce((a, d) => a + d.saldo, 0)) },
                { t: "Gestor", fmt: g => esc(g.por) },
                { t: "", r: true, fmt: (g, i) => `<button class="btn sm" data-gcest="${esc(g.cliId)}">Estado de cuenta</button>` }
              ], rows: GESTIONES.slice().sort((a, b) => b.fecha - a.fecha),
              rowCls: g => (g.promesa && diasEntre(g.promesa.fecha, HOY) > 0 ? "cr" : "")
            })
          })}
            ${sinG.length ? card({ title: "Vencidos sin gestión reciente", body: `<div style="display:flex;flex-wrap:wrap;gap:6px">${sinG.map(x => `<button class="btn sm" data-gcn="${x.id}">${esc(x.nom)} · ${c(V.vencidas(x.id).reduce((a, d) => a + d.saldo, 0))}</button>`).join("")}</div>` }) : ""}
          </div>`;
        },
        wire(v) {
          $$("[data-gcest]", v).forEach(b => b.addEventListener("click", () => A.go("cxc", "estado:" + b.dataset.gcest)));
          $$("[data-gcn]", v).forEach(b => b.addEventListener("click", () => gestionSheet(b.dataset.gcn)));
          const n = $("#gcNueva"); if (n) n.addEventListener("click", () => gestionSheet(null));
        }
      },
      {
        id: "incobrables", t: "Estimación de incobrables", sub: "Política 5 % · 25 % · 50 % sobre los tramos vencidos; el asiento lo aprueba Contabilidad en el cierre",
        render(v) {
          const k = AU.cartera();
          const reg = -saldoCta("1-01-03-002"), falta = k.estimacion - reg;
          const det = falta > 0 ? [{ cta: "6-01-04-002", debe: falta, haber: 0 }, { cta: "1-01-03-002", debe: 0, haber: falta }] : [{ cta: "1-01-03-002", debe: -falta, haber: 0 }, { cta: "6-01-04-002", debe: 0, haber: -falta }];
          const viejos = cartera().filter(d => diasVenc(d) > 120).sort((a, b) => diasVenc(b) - diasVenc(a));
          A._castigo = viejos;
          v.innerHTML = `<div class="wrap"><div class="grid" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);align-items:start;gap:14px">
            ${card({
            title: "Estimación según la política",
            body: table({
              cols: [{ t: "Tramo", fmt: t => esc(t.t) }, { t: "Saldo", r: true, cls: "mono", fmt: t => grp(t.saldo) }, { t: "%", r: true, cls: "mono", fmt: t => t.pct + " %" }, { t: "Estimación", r: true, cls: "mono", fmt: t => (t.estimacion ? `<b>${grp(t.estimacion)}</b>` : '<span class="dim">—</span>') }],
              rows: k.tramos,
              foot: [{ v: "<b>Estimación requerida</b>", span: 3 }, { v: `<b>${grp(k.estimacion)}</b>`, r: true, cls: "mono" }]
            })
          })}
            <div style="display:flex;flex-direction:column;gap:14px">
              ${card({ title: "Contra lo registrado", body: kvs([["Estimación requerida", c(k.estimacion)], ["Registrada en 1-01-03-002", c(reg)], [falta >= 0 ? "Falta registrar" : "Sobra (se reversa)", `<b style="color:${falta ? "var(--warn)" : "var(--ok)"}">${c(Math.abs(falta))}</b>`]]) })}
              ${Math.abs(falta) >= 1 ? asientoBox(det, "Ajuste propuesto para el cierre", "entra al mayor cuando Contabilidad aprueba el cierre del mes") : nota("La estimación registrada ya coincide con la política.", "check", "ok")}
              <div style="display:flex;justify-content:flex-end"><button class="btn" data-ir="con-cierre">${icon("check")}Ver en la lista de cierre</button></div>
            </div></div>
            ${card({
            title: "Candidatas a castigo", hint: "más de 120 días vencidas · el castigo usa la estimación, no el gasto",
            body: viejos.length ? table({
              cols: [
                { t: "Documento", cls: "mono", fmt: d => esc(d.cons.slice(-10)) }, { t: "Cliente", fmt: d => esc(cliNom(d.clienteId)) },
                { t: "Días vencida", r: true, cls: "mono", fmt: d => `<b style="color:var(--crit)">${diasVenc(d)}</b>` },
                { t: "Saldo", r: true, cls: "mono", fmt: d => grp(d.saldo) },
                { t: "Gestiones", fmt: d => { const n = GESTIONES.filter(g => g.cliId === d.clienteId).length; return n ? tag(n + " registradas", "mu") : tag("Sin gestión", "cr"); } },
                { t: "", r: true, fmt: (d, i) => `<button class="btn sm" data-cast="${i}">Proponer castigo</button>` }
              ], rows: viejos
            }) : empty("check", "Nada que castigar", "No hay facturas con más de 120 días vencidas.")
          })}
            ${nota("Para la renta, Hacienda acepta la pérdida por incobrable solo cuando se demuestra la gestión de cobro agotada; la bitácora de gestiones es ese respaldo. Los requisitos exactos los confirma el contador.", "gavel")}</div>`;
        },
        wire(v) {
          A.wireIr(v);
          $$("[data-cast]", v).forEach(b => b.addEventListener("click", () => {
            const d = A._castigo[+b.dataset.cast];
            openSheet({
              title: "Proponer castigo de cuenta incobrable", sub: d.cons.slice(-10) + " · " + cliNom(d.clienteId) + " · " + c(d.saldo),
              body: `${asientoBox([{ cta: "1-01-03-002", debe: d.saldo, haber: 0 }, { cta: "1-01-03-001", debe: 0, haber: d.saldo, nota: d.cons.slice(-10) }], "Asiento del castigo", "rebaja la estimación, no pasa por el gasto otra vez")}
                ${fld("Justificación y gestiones agotadas", `<textarea id="caJ" rows="3"></textarea>`, "caJ")}
                ${nota("El castigo lo aprueba gerencia con su clave y lo contabiliza Contabilidad. La factura queda en cero con la marca «Castigada»; si el cliente paga después, entra como recuperación (otros ingresos).", "shield")}`,
              footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="caOk">${icon("upload")}Enviar a aprobación</button>`,
              after(el) {
                cerrar(el);
                $("#caOk", el).addEventListener("click", () => {
                  if (!$("#caJ", el).value.trim()) return toast("Escriba la justificación", "", "cr");
                  anotar("Propuso castigo de incobrable", d.cons + " · " + cliNom(d.clienteId) + " · " + c(d.saldo), "Alta");
                  closeSheet(); toast("Castigo enviado a gerencia", "Queda en Sistema › Autorizaciones y en la bandeja de Contabilidad.", "ok");
                });
              }
            });
          }));
        }
      }
    ]
  });
  function gestionSheet(cliId) {
    const conSaldo = D.clientes.filter(x => V.vencidas(x.id).length || x.saldo > 0);
    openSheet({
      title: "Registrar gestión de cobro", sub: "Queda en la bitácora del cliente",
      body: `${fld("Cliente", busCli("gsC", cliId || conSaldo[0].id, x => V.vencidas(x.id).length || x.saldo > 0), "gsC")}
        ${g2(fld("Gestión", sel("gsT", ["Llamada", "WhatsApp", "Correo", "Visita", "Carta de cobro"]), "gsT") + fld("Contacto", inp("gsK", "", 'placeholder="Con quién habló"'), "gsK"))}
        ${fld("Resultado", sel("gsR", ["Promete pagar", "No contesta", "Pide estado de cuenta", "Disputa una factura", "Pasa a cobro judicial"]), "gsR")}
        ${g2(fld("Fecha prometida", `<input id="gsF" type="date" value="${masDias(HOY, 3).toISOString().slice(0, 10)}">`, "gsF") + fld("Monto prometido", numInp("gsM", ""), "gsM"))}
        ${fld("Nota", `<textarea id="gsN" rows="2"></textarea>`, "gsN")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="gsOk">${icon("check")}Guardar</button>`,
      after(el) {
        cerrar(el);
        $("#gsOk", el).addEventListener("click", () => {
          const r = $("#gsR", el).value, m = r0(numIn($("#gsM", el).value));
          if (/Promete/.test(r) && !m) return toast("Indique el monto prometido", "", "cr");
          const id = $("#gsC", el).value;
          GESTIONES.unshift({ id: "GC" + (GESTIONES.length + 1), fecha: D.ahora(), cliId: id, tipo: $("#gsT", el).value, contacto: $("#gsK", el).value || cliNom(id), resultado: r, promesa: /Promete/.test(r) ? { fecha: new Date($("#gsF", el).value + "T12:00"), monto: m } : null, nota: $("#gsN", el).value, por: quien() });
          anotar("Registró gestión de cobro", cliNom(id) + " · " + r, "Baja"); closeSheet(); toast("Gestión registrada", /Promete/.test(r) ? "El sistema le recuerda la promesa ese día." : "", "ok"); A.refresh();
        });
      }
    });
  }

  /* ═════════════════════════════════════════════════════════════
     CxC · RECIBOS DE DINERO
     Un recibo aplica a varias facturas y admite varios medios de pago.
     Cada factura cobrada emite su propio REP con el IVA proporcional.
     ═════════════════════════════════════════════════════════════ */
  const RECIBOS = [];
  let rdSeq = 1180;
  const rdCons = () => "RD-2026-" + String(++rdSeq).padStart(6, "0");
  (function sembrarRecibos() {
    /* los REP que ya existen se agrupan en el recibo que los originó */
    const grupos = {};
    F.reps.slice().sort((a, b) => a.fecha - b.fecha).forEach(r => { const k = r.cliId + "|" + r.fecha.toDateString() + "|" + r.medio; (grupos[k] = grupos[k] || []).push(r); });
    Object.values(grupos).forEach(g => {
      RECIBOS.push({
        cons: rdCons(), fecha: g[0].fecha, cliId: g[0].cliId, locId: g[0].locId, medios: [{ medio: g[0].medio, monto: g.reduce((s, r) => s + r.monto, 0), ref: g[0].medio === "Efectivo" ? "" : "BN-" + (70000 + (g[0].monto % 9000)) }],
        aplicado: g.map(r => ({ doc: r.docCons, monto: r.monto, rep: r.cons, repEstado: r.estado, asiento: r.asiento })), favor: 0, usaFavor: 0, estado: "Aplicado", por: "Caja " + locNom(g[0].locId)
      });
    });
    RECIBOS.reverse();
  })();
  const totRec = r => r.medios.reduce((s, m) => s + m.monto, 0);
  const VALIDAR = [
    { id: "WV1", hora: "09:12", cliId: "C1", banco: "BAC San José", ref: "BAC-5519-88213", monto: 1250000, tel: "8712-4409", nota: "Transferencia para la factura de las láminas" },
    { id: "WV2", hora: "10:05", cliId: "C7", banco: "Banco Nacional", ref: "SINPE 8611-9034", monto: 120000, tel: "8611-9034", nota: "Abono, el resto el viernes" },
    { id: "WV3", hora: "10:48", cliId: "C12", banco: "Banco de Costa Rica", ref: "BCR-00-744120", monto: 685000, tel: "8700-4488", nota: "Pago de facturas de julio" }
  ];

  A.workspace("cob-recibos", {
    title: "Recibos de dinero",
    sub: "Pagos aplicados a varias facturas, con varios medios, recibo electrónico de pago y validación de transferencias",
    onArg: tab => { if (tab === "nuevo") setTimeout(() => nuevoRecibo({}), 30); },
    tabs: [
      {
        id: "recibos", t: "Recibos", sub: "Cada recibo con sus facturas aplicadas, sus REP y su asiento",
        actions: () => `<button class="btn pri" id="rdNuevo">${icon("plus")}Nuevo recibo</button>`,
        render(v) {
          const hoyR = RECIBOS.filter(r => r.fecha.toDateString() === D.ahora().toDateString() && r.estado !== "Anulado");
          const reps = RECIBOS.reduce((s, r) => s + r.aplicado.length, 0), cola = F.reps.filter(r => r.estado !== "Aceptado").length;
          A._rd = RECIBOS;
          v.innerHTML = `<div class="wrap">
            <div class="grid g4">
              ${stat("Cobrado hoy", c(hoyR.reduce((s, r) => s + totRec(r), 0)), { txt: hoyR.length + " recibos" })}
              ${stat("Recibos del mes", grp(RECIBOS.length), { txt: reps + " facturas aplicadas" })}
              ${stat("REP en cola o rechazados", grp(cola), { txt: cola ? "revisar en Facturación electrónica" : "todos aceptados por Hacienda", dir: cola ? "down" : "" }, cola ? "var(--warn)" : "var(--ok)")}
              ${stat("Transferencias por validar", grp(VALIDAR.length), { txt: "llegaron por WhatsApp" }, "var(--accent)")}
            </div>
            ${card({
            title: "Recibos", hint: "toque uno para ver el detalle, el asiento o anularlo",
            body: table({
              onRow: true, h: "calc(100dvh - 400px)",
              cols: [
                { t: "Recibo", cls: "mono", fmt: r => `${esc(r.cons)}<span class="sub">${fh(r.fecha)}</span>` },
                { t: "Cliente", fmt: r => `${esc(cliNom(r.cliId))}<span class="sub">${esc(r.por)}</span>` },
                { t: "Medios", fmt: r => esc(r.medios.map(m => m.medio).join(" + ")) },
                { t: "Recibido", r: true, cls: "mono", fmt: r => grp(totRec(r)) },
                { t: "Aplicado", r: true, cls: "mono", fmt: r => grp(r.aplicado.reduce((s, a) => s + a.monto, 0)) },
                { t: "A favor", r: true, cls: "mono", fmt: r => (r.favor ? `<b style="color:var(--ok)">${grp(r.favor)}</b>` : '<span class="dim">—</span>') },
                { t: "REP", fmt: r => r.aplicado.length ? tag(r.aplicado.length + " · " + (r.aplicado.every(a => a.repEstado === "Aceptado") ? "aceptados" : "en cola"), r.aplicado.every(a => a.repEstado === "Aceptado") ? "ok" : "wa") : '<span class="dim">—</span>' },
                { t: "Estado", fmt: r => tag(r.estado, r.estado === "Anulado" ? "cr" : "ok") }
              ], rows: RECIBOS, rowCls: r => (r.estado === "Anulado" ? "cr" : "")
            })
          })}</div>`;
        },
        wire(v) {
          const b = $("#rdNuevo"); if (b) b.addEventListener("click", () => nuevoRecibo({}));
          $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => verRecibo(A._rd[+tr.dataset.i])));
        }
      },
      {
        id: "validar", t: "Transferencias por validar", sub: "El cliente manda el comprobante por WhatsApp; una persona autorizada lo valida contra el banco (INT-007)",
        badge: () => ({ n: VALIDAR.length, k: "wa", l: "por validar" }),
        render(v) {
          v.innerHTML = `<div class="wrap">
            ${nota("El agente de WhatsApp lee el comprobante (banco, referencia, monto) y propone la factura. Tesorería lo compara con el estado del banco y, al validarlo, se arma el recibo solo y el cliente recibe la confirmación con el REP.", "chat")}
            ${VALIDAR.length ? card({
            title: "Comprobantes recibidos hoy",
            body: table({
              cols: [
                { t: "Hora", cls: "mono", fmt: x => x.hora },
                { t: "Cliente", fmt: x => `<b>${esc(cliNom(x.cliId))}</b><span class="sub">WhatsApp ${esc(x.tel)}</span>` },
                { t: "Banco y referencia", fmt: x => `${esc(x.banco)}<span class="sub mono">${esc(x.ref)}</span>` },
                { t: "Mensaje", fmt: x => `<span style="font-size:12.5px">«${esc(x.nota)}»</span>` },
                { t: "Monto", r: true, cls: "mono", fmt: x => `<b>${grp(x.monto)}</b>` },
                { t: "Facturas sugeridas", fmt: x => { const d = cartera().filter(k => k.clienteId === x.cliId).sort((a, b) => a.fecha - b.fecha); return d.length ? esc(d.slice(0, 2).map(k => k.cons.slice(-6)).join(", ")) + (d.length > 2 ? " …" : "") : '<span class="mut">sin saldo: queda a favor</span>'; } },
                { t: "En el banco", fmt: (x, i) => i < 2 ? tag("Encontrada", "ok", "check") : tag("Aún no aparece", "wa", "clock") },
                { t: "", r: true, fmt: (x, i) => `<button class="btn sm" data-vrech="${i}">Rechazar</button><button class="btn sm pri" data-val="${i}">Validar</button>` }
              ], rows: VALIDAR
            })
          }) : card({ body: empty("check", "Nada por validar", "Todas las transferencias del día están aplicadas.") })}</div>`;
        },
        wire(v) {
          $$("[data-val]", v).forEach(b => b.addEventListener("click", () => {
            const x = VALIDAR[+b.dataset.val];
            nuevoRecibo({ cliId: x.cliId, medio: x.banco === "Banco Nacional" && /SINPE/.test(x.ref) ? "SINPE móvil" : "Transferencia", monto: x.monto, ref: x.ref, validar: x });
          }));
          $$("[data-vrech]", v).forEach(b => b.addEventListener("click", () => {
            const x = VALIDAR[+b.dataset.vrech];
            openSheet({
              title: "Rechazar comprobante", sub: cliNom(x.cliId) + " · " + c(x.monto),
              body: fld("Motivo (se le envía al cliente)", sel("vrM", ["No aparece en el banco después de 24 horas", "El monto no coincide", "La cuenta destino no es de la empresa", "Comprobante ilegible"]), "vrM"),
              footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="vrOk">Rechazar y avisar</button>`,
              after(el) { cerrar(el); $("#vrOk", el).addEventListener("click", () => { VALIDAR.splice(VALIDAR.indexOf(x), 1); anotar("Rechazó comprobante de transferencia", cliNom(x.cliId) + " · " + x.ref + " · " + $("#vrM", el).value, "Media"); closeSheet(); toast("Comprobante rechazado", "El cliente recibió el motivo por WhatsApp.", "wa"); A.refresh(); }); }
            });
          }));
        }
      }
    ]
  });

  function verRecibo(r) {
    const as = r.aplicado.map(a => asientoPor(a.asiento)).filter(Boolean).concat(r.otros || []);
    openSheet({
      wide: true, title: "Recibo " + r.cons, sub: `${cliNom(r.cliId)} · ${fh(r.fecha)} · ${r.estado}`,
      body: `<div class="grid g2" style="gap:12px;align-items:start">
          ${card({ title: "Medios de pago", body: table({ cols: [{ t: "Medio", fmt: m => esc(m.medio) }, { t: "Referencia", cls: "mono", fmt: m => esc(m.ref || "—") }, { t: "Monto", r: true, cls: "mono", fmt: m => grp(m.monto) }], rows: r.medios }) })}
          ${card({ title: "Totales", body: kvs([["Recibido", c(totRec(r))], ["Saldo a favor usado", c(r.usaFavor || 0)], ["Aplicado a facturas", c(r.aplicado.reduce((s, a) => s + a.monto, 0))], ["Queda a favor del cliente", c(r.favor || 0)]]) })}
        </div>
        ${card({
        title: "Facturas aplicadas y recibos electrónicos de pago",
        body: table({
          cols: [{ t: "Factura", cls: "mono", fmt: a => esc(a.doc.slice(-10)) }, { t: "REP", cls: "mono", fmt: a => esc((a.rep || "").slice(-10)) },
          { t: "Hacienda", fmt: a => tag(a.repEstado || "—", a.repEstado === "Aceptado" ? "ok" : "wa") },
          { t: "Monto", r: true, cls: "mono", fmt: a => grp(a.monto) }], rows: r.aplicado
        })
      })}
        ${as.length ? `<div class="mut" style="font-size:12px;margin:4px 0 6px">Asientos generados (${as.length})</div>` + as.map(a => `<div style="margin-bottom:8px">${asientoTabla(a.detalle, a.id + " · " + a.glosa)}</div>`).join("") : ""}
        ${r.anulacion ? nota(`<b>Anulado por ${esc(r.anulacion.por)}</b>, autorizó ${esc(r.anulacion.autorizo)}: ${esc(r.anulacion.motivo)}. Asiento de reversa ${esc(r.anulacion.asiento)}.`, "alert", "cr") : ""}`,
      footer: `<button class="btn" data-cerrar>Cerrar</button><div class="gap"></div>${r.estado !== "Anulado" ? `<button class="btn" id="rdAn">${icon("x")}Anular</button>` : ""}<button class="btn" id="rdWa">${icon("chat")}Enviar al cliente</button>`,
      after(el) {
        cerrar(el);
        $("#rdWa", el).addEventListener("click", () => toast("Recibo enviado", "PDF del recibo y de cada REP por WhatsApp, sin enlaces al sistema.", "ok"));
        const an = $("#rdAn", el); if (an) an.addEventListener("click", () => anularRecibo(r));
      }
    });
  }
  function anularRecibo(r) {
    openSheet({
      title: "Anular recibo " + r.cons, sub: "No se borra: se reversa el asiento y se reabren los saldos (SEG-009)",
      body: `${fld("Motivo", sel("anM", ["Cheque devuelto", "Transferencia reversada por el banco", "Se aplicó al cliente equivocado", "Monto digitado mal"]), "anM")}
        ${fld("Detalle", `<textarea id="anD" rows="2"></textarea>`, "anD")}
        ${firmaCampos(["Adrián Vindas · Gerencia", "Sonia Calderón · Contabilidad"], "anQ")}
        ${nota("Las facturas vuelven a quedar con saldo y el IVA vuelve a diferido. Los REP ya aceptados por Hacienda no se eliminan: Contabilidad recibe el caso en su bandeja para el ajuste que corresponda en la declaración.", "alert", "wa")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="anOk">${icon("x")}Anular con reversa</button>`,
      after(el) {
        cerrar(el);
        $("#anOk", el).addEventListener("click", () => {
          if (!$("#anQK", el).value) return toast("Falta la clave del autorizador", "", "cr");
          if (!periodoOk()) return;
          const det = [];
          r.aplicado.forEach(a => {
            const d = D.documentos.find(k => k.cons === a.doc); if (!d) return;
            const rep = F.reps.find(k => k.cons === a.rep), iva = rep ? rep.iva : 0;
            d.saldo += a.monto; if (D.cliById[d.clienteId]) D.cliById[d.clienteId].saldo += a.monto;
            det.push({ cta: "1-01-03-001", debe: a.monto, haber: 0, nota: d.cons.slice(-10) });
            if (iva) { det.push({ cta: "2-01-02-001", debe: iva, haber: 0 }); det.push({ cta: "2-01-02-002", debe: 0, haber: iva }); }
          });
          const cli = D.cliById[r.cliId];
          if (r.favor) { det.push({ cta: "2-01-06-001", debe: r.favor, haber: 0 }); cli.saldoFavor = (cli.saldoFavor || 0) - r.favor; }
          if (r.usaFavor) { det.push({ cta: "2-01-06-001", debe: 0, haber: r.usaFavor }); cli.saldoFavor = (cli.saldoFavor || 0) + r.usaFavor; }
          r.medios.forEach(m => det.push({ cta: D.cuentaMedio(m.medio), debe: 0, haber: m.monto }));
          let a;
          try { a = D.asentar(D.ahora(), "AN-" + r.cons, "Anulación del recibo " + r.cons, det); } catch (e) { return toast("No se anuló", e.message, "cr"); }
          r.estado = "Anulado";
          r.anulacion = { por: quien(), autorizo: $("#anQ", el).value.split(" · ")[0], motivo: $("#anM", el).value + ($("#anD", el).value ? " · " + $("#anD", el).value : ""), asiento: a.id };
          anotar("Anuló recibo de dinero", r.cons + " · " + cliNom(r.cliId) + " · " + r.anulacion.motivo, "Alta", "Aplicado", "Anulado");
          closeSheet(); toast("Recibo anulado", "Asiento de reversa " + a.id + ". Las facturas volvieron a la cartera.", "wa"); A.refresh();
        });
      }
    });
  }

  /* formulario del recibo: cliente, medios, facturas a aplicar, saldo a favor y asiento en vivo */
  const MEDIOS_RD = ["Transferencia", "SINPE móvil", "Efectivo", "Cheque", "Tarjeta", "Dólares"];
  function nuevoRecibo(o) {
    const clis = D.clientes.filter(x => cartera().some(d => d.clienteId === x.id) || x.saldoFavor > 0);
    let cliId = o.cliId && D.cliById[o.cliId] ? o.cliId : clis[0].id;
    const st = { medios: [{ medio: o.medio || "Transferencia", monto: o.monto || 0, ref: o.ref || "", banco: "Banco Nacional" }], apl: {}, usaFavor: 0 };
    const tc = D.tcDe ? D.tcDe(D.ahora()).compra : 503;
    const docsDe = id => cartera().filter(d => d.clienteId === id).sort((a, b) => venceDe(a) - venceDe(b));
    const colones = m => (m.medio === "Dólares" ? r0(m.monto * tc) : m.monto);
    function preset() {
      st.apl = {};
      (o.docs || []).forEach(id => { const d = D.documentos.find(k => k.id === id); if (d) st.apl[d.id] = d.saldo; });
      if (o.docs && o.docs.length && !o.monto) st.medios[0].monto = (o.docs || []).reduce((s, id) => s + (st.apl[id] || 0), 0);
      if (o.monto && !(o.docs || []).length) fifo();
    }
    function fifo() {
      let rest = st.medios.reduce((s, m) => s + colones(m), 0) + st.usaFavor; st.apl = {};
      docsDe(cliId).forEach(d => { const x = Math.min(rest, d.saldo); if (x > 0) { st.apl[d.id] = x; rest -= x; } });
    }
    const totales = () => {
      const rec = st.medios.reduce((s, m) => s + colones(m), 0), apl = Object.values(st.apl).reduce((s, x) => s + (x || 0), 0);
      return { rec, apl, favor: rec + st.usaFavor - apl };
    };
    function asientoVivo() {
      const t = totales(), det = [];
      st.medios.filter(m => m.monto).forEach(m => det.push({ cta: D.cuentaMedio(m.medio), debe: colones(m), haber: 0, nota: m.medio + (m.ref ? " · " + m.ref : "") }));
      if (st.usaFavor) det.push({ cta: "2-01-06-001", debe: st.usaFavor, haber: 0, nota: "saldo a favor aplicado" });
      let iva = 0;
      Object.keys(st.apl).forEach(id => { const d = D.documentos.find(k => k.id === id), m = st.apl[id]; if (!d || !m) return; det.push({ cta: "1-01-03-001", debe: 0, haber: m, nota: d.cons.slice(-10) }); iva += d.total ? r0(m * d.iva / d.total) : 0; });
      if (t.favor > 0) det.push({ cta: "2-01-06-001", debe: 0, haber: t.favor, nota: "queda a favor del cliente" });
      if (iva) { det.push({ cta: "2-01-02-002", debe: iva, haber: 0, nota: "IVA de los REP" }); det.push({ cta: "2-01-02-001", debe: 0, haber: iva }); }
      return det;
    }
    function pintar(el) {
      const cli = D.cliById[cliId], docs = docsDe(cliId), t = totales();
      $("#rdMed", el).innerHTML = st.medios.map((m, i) => `<div class="cob-medio">
          <div class="field">${sel("rmM" + i, MEDIOS_RD, m.medio, `data-mm="${i}" aria-label="Medio de pago"`)}</div>
          <div class="field"><input class="num" style="text-align:right" data-mv="${i}" aria-label="Monto" value="${m.monto ? grp(m.monto) : ""}" placeholder="${m.medio === "Dólares" ? "US$" : "₡"}"></div>
          <div class="field"><input data-mr="${i}" aria-label="Referencia" value="${esc(m.ref)}" placeholder="${m.medio === "Cheque" ? "Banco y número de cheque" : m.medio === "Efectivo" ? "—" : m.medio === "Tarjeta" ? "Autorización del datáfono" : "Referencia bancaria"}"></div>
          ${st.medios.length > 1 ? `<button class="iconbtn" data-mx="${i}" aria-label="Quitar">${icon("x")}</button>` : "<span></span>"}
        </div>${m.medio === "Dólares" ? `<div class="mut" style="font-size:11.5px;margin:-2px 0 6px">Tipo de cambio de compra BCCR ${dec(tc, 2)} · ${c(colones(m))}. La diferencia contra el tipo de la factura va a diferencial cambiario.</div>` : ""}`).join("") +
        (st.medios.length < 4 ? `<button class="btn sm" id="rdAddM">${icon("plus")}Otro medio de pago</button>` : "");
      $("#rdDocs", el).innerHTML = docs.length ? table({
        cols: [
          { t: "", fmt: d => `<input type="checkbox" data-dc="${d.id}" ${st.apl[d.id] ? "checked" : ""}>` },
          { t: "Factura", cls: "mono", fmt: d => `${esc(d.cons.slice(-10))}<span class="sub">${esc(obraDe(d))}</span>` },
          { t: "Vence", cls: "mono", fmt: d => fecha(venceDe(d)) },
          { t: "Días", r: true, cls: "mono", fmt: d => { const x = diasVenc(d); return x > 0 ? `<b style="color:var(--crit)">${x}</b>` : `<span class="mut">−${-x}</span>`; } },
          { t: "Saldo", r: true, cls: "mono", fmt: d => grp(d.saldo) },
          { t: "IVA del REP", r: true, cls: "mono", fmt: d => `<span class="mut">${st.apl[d.id] ? grp(d.total ? r0(st.apl[d.id] * d.iva / d.total) : 0) : "—"}</span>` },
          { t: "A aplicar", r: true, fmt: d => `<input class="num cob-apl" data-da="${d.id}" value="${st.apl[d.id] ? grp(st.apl[d.id]) : ""}">` },
          { t: "Queda", r: true, cls: "mono", fmt: d => { const q = d.saldo - (st.apl[d.id] || 0); return q ? grp(q) : tag("Cancelada", "ok"); } }
        ], rows: docs
      }) : empty("check", "Sin facturas pendientes", "Lo recibido queda como saldo a favor del cliente.");
      $("#rdFav", el).innerHTML = cli.saldoFavor > 0 ? `<label class="rc"><input type="checkbox" id="rdUF" ${st.usaFavor ? "checked" : ""}><span><b>Aplicar saldo a favor de ${c(cli.saldoFavor)}</b><span>Anticipos o notas de crédito pendientes de usar</span></span></label>` : "";
      const err = t.favor < 0;
      $("#rdTot", el).innerHTML = `<div class="cob-tot"><span>Recibido <b class="num">${c(t.rec)}</b></span>${st.usaFavor ? `<span>A favor usado <b class="num">${c(st.usaFavor)}</b></span>` : ""}<span>Aplicado <b class="num">${c(t.apl)}</b></span><span>${err ? "Falta dinero" : "Queda a favor"} <b class="num" style="color:${err ? "var(--crit)" : t.favor ? "var(--ok)" : "var(--ink)"}">${c(Math.abs(t.favor))}</b></span><span>Facturas a cobrar <b class="num">${Object.values(st.apl).filter(Boolean).length}</b></span></div>`;
      $("#rdAs", el).innerHTML = asientoBox(asientoVivo());
      $("#rdCli", el).innerHTML = `${fichaCell("Saldo", c(r0(cli.saldo)))}${fichaCell("Vencido", c(V.vencidas(cli.id).reduce((a, d) => a + d.saldo, 0)), V.vencidas(cli.id).length ? "var(--crit)" : "")}${fichaCell("A favor", c(cli.saldoFavor || 0))}${fichaCell("Límite", cli.limite ? c(cli.limite) : "—")}`;
      conectar(el);
    }
    function conectar(el) {
      $$("[data-mm]", el).forEach(x => x.addEventListener("change", () => { st.medios[+x.dataset.mm].medio = x.value; pintar(el); }));
      $$("[data-mv]", el).forEach(x => x.addEventListener("change", () => { st.medios[+x.dataset.mv].monto = r0(numIn(x.value)); if (!Object.keys(st.apl).length) fifo(); pintar(el); }));
      $$("[data-mr]", el).forEach(x => x.addEventListener("input", () => { st.medios[+x.dataset.mr].ref = x.value; }));
      $$("[data-mx]", el).forEach(x => x.addEventListener("click", () => { st.medios.splice(+x.dataset.mx, 1); pintar(el); }));
      const add = $("#rdAddM", el); if (add) add.addEventListener("click", () => { st.medios.push({ medio: "Efectivo", monto: 0, ref: "" }); pintar(el); });
      $$("[data-dc]", el).forEach(x => x.addEventListener("change", () => { const d = D.documentos.find(k => k.id === x.dataset.dc); if (x.checked) { const t = totales(); st.apl[d.id] = Math.max(0, Math.min(d.saldo, t.favor > 0 ? t.favor : d.saldo)); } else delete st.apl[d.id]; pintar(el); }));
      $$("[data-da]", el).forEach(x => x.addEventListener("change", () => { const d = D.documentos.find(k => k.id === x.dataset.da); const m = Math.min(d.saldo, r0(numIn(x.value))); if (m > 0) st.apl[d.id] = m; else delete st.apl[d.id]; pintar(el); }));
      const uf = $("#rdUF", el); if (uf) uf.addEventListener("change", () => { st.usaFavor = uf.checked ? r0(D.cliById[cliId].saldoFavor) : 0; pintar(el); });
    }
    preset();
    openSheet({
      wide: true, title: o.validar ? "Validar transferencia y aplicar" : "Nuevo recibo de dinero", sub: o.validar ? o.validar.banco + " · " + o.validar.ref + " · llegó por WhatsApp a las " + o.validar.hora : "Aplica a una o varias facturas; cada factura cobrada emite su REP",
      body: `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end"><div style="flex:1;min-width:260px">${fld("Cliente", busCli("rdC", cliId, x => clis.indexOf(x) >= 0), "rdC", "Solo clientes con facturas abiertas o saldo a favor")}</div>
          <div style="min-width:170px">${fld("Fecha", `<input value="${fechaL(D.ahora())}" disabled>`)}</div><div style="min-width:170px">${fld("Caja que emite el REP", `<input value="${esc(locNom(S.locId))} · terminal ${S.term}" disabled>`)}</div></div>
        <div class="ficha cob-ficha" id="rdCli"></div>
        <div class="cob-sec">Medios de pago</div><div id="rdMed"></div>
        <div class="cob-sec" style="display:flex;align-items:center;gap:8px">Facturas pendientes <span class="gap" style="flex:1"></span><button class="btn sm" id="rdFifo">${icon("clock")}Aplicar a las más antiguas</button></div>
        <div id="rdFav"></div><div id="rdDocs"></div>
        <div id="rdTot"></div><div id="rdAs"></div>
        ${nota("Tarjeta: se aplica el monto completo a la factura; la comisión y la retención del adquirente se reconocen al conciliar el lote del datáfono, no se le rebajan al cliente. Transferencia y SINPE exigen referencia; cheque, banco y número.", "card")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="rdOk">${icon("check")}Guardar y emitir REP</button>`,
      after(el) {
        cerrar(el); pintar(el);
        $("#rdC", el).addEventListener("change", e => { cliId = e.target.value; st.apl = {}; st.usaFavor = 0; fifo(); pintar(el); });
        $("#rdFifo", el).addEventListener("click", () => { fifo(); pintar(el); });
        $("#rdOk", el).addEventListener("click", () => guardarRecibo(el));
      }
    });
    function guardarRecibo(el) {
      const t = totales(), cli = D.cliById[cliId];
      if (t.rec + st.usaFavor <= 0) return toast("No hay monto recibido", "", "cr");
      if (t.favor < 0) return toast("Lo aplicado supera lo recibido", "Faltan " + c(-t.favor) + ". Rebaje un monto o agregue otro medio de pago.", "cr");
      const falta = st.medios.find(m => m.monto && /Transferencia|SINPE|Cheque/.test(m.medio) && !m.ref.trim());
      if (falta) return toast("Falta la referencia de " + falta.medio, "Sin referencia no se puede conciliar contra el banco.", "cr");
      if (!D.puedeEmitir(S.locId, S.term)) return toast("Esta terminal no emite comprobantes", "El REP sale de una caja de tienda: cambie de local en la barra superior.", "cr");
      if (!periodoOk()) return;
      /* cada factura se cubre con los medios en orden; cada tramo es un pago con su REP */
      const fuentes = st.medios.filter(m => m.monto).map(m => ({ medio: m.medio === "Dólares" ? "Dólares" : m.medio, resta: colones(m) }));
      if (st.usaFavor) fuentes.unshift({ medio: "Saldo a favor del cliente", resta: st.usaFavor });
      const aplicado = [];
      for (const id of Object.keys(st.apl)) {
        const d = D.documentos.find(k => k.id === id); let m = st.apl[id];
        while (m > 0 && fuentes.length) {
          const f = fuentes[0], x = Math.min(m, f.resta);
          const r = F.aplicarCobro(d, { monto: x, medio: f.medio, locId: S.locId, term: S.term, offline: S.offline });
          if (r.error) return toast("No se aplicó " + d.cons.slice(-10), r.error, "cr");
          if (f.medio === "Saldo a favor del cliente") cli.saldoFavor -= x;
          aplicado.push({ doc: d.cons, monto: x, rep: r.rep.cons, repEstado: r.rep.estado, asiento: r.rep.asiento });
          m -= x; f.resta -= x; if (f.resta <= 0) fuentes.shift();
        }
      }
      const otros = [];
      let favorNuevo = 0;
      if (t.favor > 0) {
        /* el remanente no se pierde: queda como anticipo del cliente (pasivo) */
        const det = fuentes.filter(f => f.resta > 0 && f.medio !== "Saldo a favor del cliente").map(f => ({ cta: D.cuentaMedio(f.medio), debe: f.resta, haber: 0 }));
        const tot = det.reduce((s, x) => s + x.debe, 0);
        if (tot) { det.push({ cta: "2-01-06-001", debe: 0, haber: tot }); otros.push(D.asentar(D.ahora(), "RD-FAV", "Saldo a favor de " + cli.nom, det)); cli.saldoFavor = (cli.saldoFavor || 0) + tot; favorNuevo = tot; }
      }
      const rec = { cons: rdCons(), fecha: D.ahora(), cliId, locId: S.locId, medios: st.medios.filter(m => m.monto).map(m => ({ medio: m.medio, monto: colones(m), ref: m.ref })), aplicado, favor: favorNuevo, usaFavor: st.usaFavor - fuentes.filter(f => f.medio === "Saldo a favor del cliente").reduce((s, f) => s + f.resta, 0), estado: "Aplicado", por: quien(), otros };
      if (otros[0]) otros[0].origen = rec.cons;
      RECIBOS.unshift(rec);
      if (o.validar) { VALIDAR.splice(VALIDAR.indexOf(o.validar), 1); }
      anotar("Registró recibo de dinero", rec.cons + " · " + cli.nom + " · " + c(t.rec) + " · " + aplicado.length + " REP", "Media");
      closeSheet();
      toast(rec.cons + " guardado", aplicado.length + " REP emitidos" + (rec.favor ? " · " + c(rec.favor) + " a favor del cliente" : "") + (o.validar ? " · confirmación enviada por WhatsApp" : ""), "ok");
      A.refresh();
    }
  }

  /* ═════════════════════════════════════════════════════════════
     CxC · ANTICIPOS DE CLIENTE (CXC-005)
     Adelantos, saldos a favor y transferencias que llegan sin aviso.
     El auxiliar es el saldo a favor de cada cliente; el mayor, la
     cuenta 2-01-06-001.
     ═════════════════════════════════════════════════════════════ */
  const SIN_IDENT = [
    { id: "TNI-031", fecha: masDias(HOY, -6), banco: "Banco Nacional", desc: "TEF DE: CONST VINDAS 88921", monto: 450000, estado: "Sin identificar" },
    { id: "TNI-032", fecha: masDias(HOY, -4), banco: "BAC San José", desc: "SINPE 8845xxxx M CESPEDES", monto: 95000, estado: "Sin identificar" },
    { id: "TNI-033", fecha: masDias(HOY, -2), banco: "Banco Nacional", desc: "DEP EFECTIVO AG TURRIALBA 5566", monto: 230000, estado: "Sin identificar" },
    { id: "TNI-034", fecha: masDias(HOY, -1), banco: "Banco de Costa Rica", desc: "TRANSF INTERBANC 0012 REF 7781", monto: 1180000, estado: "Sin identificar" }
  ];
  const MOV_ANT = [];
  (function sembrarAnticipos() {
    D.proformas.filter(p => p.anticipo).forEach(p => MOV_ANT.push({ fecha: p.pagado, cliId: p.clienteId, t: "Anticipo de pedido", doc: p.cons, monto: p.total, asiento: p.anticipo }));
    D.clientes.forEach(x => { const ya = MOV_ANT.filter(m => m.cliId === x.id).reduce((s, m) => s + m.monto, 0); if ((x.saldoFavor || 0) - ya > 0) MOV_ANT.push({ fecha: masDias(HOY, -9), cliId: x.id, t: "Nota de crédito a favor", doc: "NC", monto: x.saldoFavor - ya, asiento: null }); });
  })();
  A.workspace("cob-anticipos", {
    title: "Anticipos de cliente",
    sub: "Adelantos, saldos a favor y transferencias no identificadas",
    tabs: [
      {
        id: "saldos", t: "Anticipos y saldos a favor", sub: "Lo que la empresa le debe al cliente hasta que lo use en una factura",
        actions: () => `<button class="btn pri" id="anNuevo">${icon("plus")}Registrar anticipo</button>`,
        render(v) {
          const L = D.clientes.filter(x => (x.saldoFavor || 0) > 0);
          const aux = L.reduce((s, x) => s + x.saldoFavor, 0), libro = -saldoCta("2-01-06-001");
          A._ant = L;
          v.innerHTML = `<div class="wrap">
            <div class="cob-cuadre ${aux !== libro ? "cr" : ""}">${icon(aux !== libro ? "alert" : "check")}<span>Saldos a favor de clientes <b class="num">${c(aux)}</b> · Mayor 2-01-06-001 <b class="num">${c(libro)}</b> · ${aux !== libro ? `<b style="color:var(--crit)">diferencia ${c(libro - aux)}</b>` : "<b>cuadra</b>"}</span></div>
            ${card({
            title: "Clientes con saldo a favor",
            body: L.length ? table({
              cols: [
                { t: "Cliente", fmt: x => `<b>${esc(x.nom)}</b><span class="sub">${esc(x.ced)}</span>` },
                { t: "Origen", fmt: x => esc(MOV_ANT.filter(m => m.cliId === x.id).map(m => m.t + " " + (m.doc || "")).join(" · ") || "—") },
                { t: "Facturas abiertas", r: true, cls: "mono", fmt: x => grp(cartera().filter(d => d.clienteId === x.id).reduce((s, d) => s + d.saldo, 0)) },
                { t: "A favor", r: true, cls: "mono", fmt: x => `<b style="color:var(--ok)">${grp(x.saldoFavor)}</b>` },
                { t: "", r: true, fmt: (x, i) => `<button class="btn sm" data-andev="${i}">Devolver</button><button class="btn sm pri" data-anap="${i}">Aplicar a factura</button>` }
              ], rows: L
            }) : empty("wallet", "Sin anticipos", "Ningún cliente tiene saldo a favor.")
          })}
            ${card({
            title: "Movimientos", body: table({
              cols: [{ t: "Fecha", cls: "mono", fmt: m => fecha(m.fecha) }, { t: "Cliente", fmt: m => esc(cliNom(m.cliId)) }, { t: "Movimiento", fmt: m => esc(m.t) }, { t: "Documento", cls: "mono", fmt: m => esc(m.doc || "—") },
              { t: "Monto", r: true, cls: "mono", fmt: m => (m.monto < 0 ? "−" : "") + grp(m.monto) }, { t: "", r: true, fmt: (m, i) => m.asiento ? `<button class="btn sm" data-anas="${i}">${icon("scale")}Asiento</button>` : "" }],
              rows: MOV_ANT.slice().sort((a, b) => b.fecha - a.fecha)
            })
          })}
            ${nota("El anticipo se aplica desde aquí, desde el recibo de dinero o en la caja con el medio «Anticipo». Si el cliente lo pide de vuelta se le devuelve por transferencia con autorización. El tratamiento del IVA del anticipo (si se documenta con comprobante al recibirlo) lo define Contabilidad.", "info")}</div>`;
        },
        wire(v) {
          const b = $("#anNuevo"); if (b) b.addEventListener("click", () => anticipoSheet({}));
          const movs = MOV_ANT.slice().sort((a, b) => b.fecha - a.fecha);
          $$("[data-anas]", v).forEach(x => x.addEventListener("click", () => { const m = movs[+x.dataset.anas]; verAsiento(typeof m.asiento === "string" ? asientoPor(m.asiento) : m.asiento); }));
          $$("[data-anap]", v).forEach(x => x.addEventListener("click", () => { const k = A._ant[+x.dataset.anap]; if (!cartera().some(d => d.clienteId === k.id)) return toast("Sin facturas abiertas", k.nom + " no tiene facturas con saldo: el anticipo espera a la próxima compra.", "in"); nuevoRecibo({ cliId: k.id }); setTimeout(() => { const u = document.getElementById("rdUF"); if (u) u.click(); }, 60); }));
          $$("[data-andev]", v).forEach(x => x.addEventListener("click", () => devolverAnticipo(A._ant[+x.dataset.andev])));
        }
      },
      {
        id: "sinident", t: "Transferencias no identificadas", sub: "Llegan al banco sin aviso: se registran para no descuadrar el banco y se identifican después",
        badge: () => { const n = SIN_IDENT.filter(x => x.estado !== "Identificada").length; return { n, k: "wa", l: n + " sin identificar" }; },
        render(v) {
          const reg = -saldoCta("2-01-06-002");
          v.innerHTML = `<div class="wrap">
            ${card({
            title: "Depósitos y transferencias sin identificar", hint: "cuenta 2-01-06-002 · " + c(reg) + " registrado",
            body: table({
              cols: [
                { t: "Fecha", cls: "mono", fmt: x => fecha(x.fecha) }, { t: "Banco", fmt: x => esc(x.banco) },
                { t: "Descripción del banco", cls: "mono", fmt: x => `<span style="font-size:12px">${esc(x.desc)}</span>` },
                { t: "Días", r: true, cls: "mono", fmt: x => diasEntre(x.fecha, HOY) },
                { t: "Monto", r: true, cls: "mono", fmt: x => `<b>${grp(x.monto)}</b>` },
                { t: "Estado", fmt: x => tag(x.estado, x.estado === "Identificada" ? "ok" : x.estado === "Registrada" ? "ac" : "wa") },
                { t: "", r: true, fmt: (x, i) => x.estado === "Sin identificar" ? `<button class="btn sm" data-tnreg="${i}">Registrar</button><button class="btn sm pri" data-tnid="${i}">Identificar</button>` : x.estado === "Registrada" ? `<button class="btn sm pri" data-tnid="${i}">Identificar</button>` : `<span class="mut" style="font-size:12px">${esc(cliNom(x.cliId))}</span>` }
              ], rows: SIN_IDENT
            })
          })}
            ${nota("«Registrar» deja el dinero en el banco contra la cuenta de depósitos sin identificar, así la conciliación bancaria no queda con partidas abiertas. Al identificar al cliente pasa a su saldo a favor y desde ahí se aplica a sus facturas.", "bank")}
            <div style="display:flex;justify-content:flex-end"><button class="btn" data-ir="con-conciliaciones|banco">${icon("swap")}Conciliación bancaria</button></div></div>`;
        },
        wire(v) {
          A.wireIr(v);
          $$("[data-tnreg]", v).forEach(b => b.addEventListener("click", () => {
            const x = SIN_IDENT[+b.dataset.tnreg];
            const det = [{ cta: x.banco === "BAC San José" ? "1-01-02-002" : x.banco === "Banco de Costa Rica" ? "1-01-02-003" : "1-01-02-001", debe: x.monto, haber: 0 }, { cta: "2-01-06-002", debe: 0, haber: x.monto }];
            openSheet({
              title: "Registrar depósito sin identificar", sub: x.desc + " · " + c(x.monto), body: asientoBox(det),
              footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="tnOk">Registrar</button>`,
              after(el) { cerrar(el); $("#tnOk", el).addEventListener("click", () => { if (!periodoOk()) return; x.asiento = D.asentar(x.fecha < D.INICIO ? D.ahora() : x.fecha, x.id, "Depósito sin identificar · " + x.desc, det).id; x.estado = "Registrada"; anotar("Registró depósito sin identificar", x.id + " · " + c(x.monto), "Media"); closeSheet(); toast("Registrado", "El banco queda conciliado; falta identificar al cliente.", "ok"); A.refresh(); }); }
            });
          }));
          $$("[data-tnid]", v).forEach(b => b.addEventListener("click", () => identificarTNI(SIN_IDENT[+b.dataset.tnid])));
        }
      }
    ]
  });
  function identificarTNI(x) {
    const sug = /VINDAS/.test(x.desc) ? "C1" : /CESPEDES/.test(x.desc) ? "C2" : "C12";
    const bancoCta = x.banco === "BAC San José" ? "1-01-02-002" : x.banco === "Banco de Costa Rica" ? "1-01-02-003" : "1-01-02-001";
    const det = () => x.estado === "Registrada" ? [{ cta: "2-01-06-002", debe: x.monto, haber: 0 }, { cta: "2-01-06-001", debe: 0, haber: x.monto }] : [{ cta: bancoCta, debe: x.monto, haber: 0 }, { cta: "2-01-06-001", debe: 0, haber: x.monto }];
    openSheet({
      title: "Identificar transferencia", sub: x.desc + " · " + c(x.monto),
      body: `${fld("Cliente", busCli("tiC", sug), "tiC", "Sugerido por el nombre que trae la descripción del banco.")}
        ${fld("Qué hacer con el dinero", sel("tiQ", ["Dejar como saldo a favor", "Aplicar a sus facturas ahora"]), "tiQ")}
        ${asientoBox(det())}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="tiOk">${icon("check")}Identificar</button>`,
      after(el) {
        cerrar(el);
        $("#tiOk", el).addEventListener("click", () => {
          if (!periodoOk()) return;
          const k = D.cliById[$("#tiC", el).value];
          const a = D.asentar(D.ahora(), x.id, "Identificación de " + x.id + " · " + k.nom, det());
          k.saldoFavor = (k.saldoFavor || 0) + x.monto;
          MOV_ANT.push({ fecha: D.ahora(), cliId: k.id, t: "Transferencia identificada", doc: x.id, monto: x.monto, asiento: a.id });
          x.estado = "Identificada"; x.cliId = k.id;
          anotar("Identificó transferencia", x.id + " · " + k.nom + " · " + c(x.monto), "Media");
          const aplicar = $("#tiQ", el).value === "Aplicar a sus facturas ahora";
          closeSheet(); toast("Transferencia identificada", c(x.monto) + " a favor de " + k.nom + ".", "ok"); A.refresh();
          if (aplicar && cartera().some(d => d.clienteId === k.id)) { nuevoRecibo({ cliId: k.id }); setTimeout(() => { const u = document.getElementById("rdUF"); if (u) u.click(); }, 60); }
        });
      }
    });
  }
  function anticipoSheet() {
    const det = (m, monto) => [{ cta: D.cuentaMedio(m), debe: monto, haber: 0 }, { cta: "2-01-06-001", debe: 0, haber: monto }];
    openSheet({
      title: "Registrar anticipo", sub: "Adelanto del cliente antes de facturar",
      body: `${fld("Cliente", busCli("aqC", ""), "aqC")}
        ${g2(fld("Medio", sel("aqM", ["Transferencia", "SINPE móvil", "Efectivo", "Cheque"]), "aqM") + fld("Monto", numInp("aqV", 500000), "aqV"))}
        ${g2(fld("Referencia", inp("aqR", ""), "aqR") + fld("Pedido o proforma", sel("aqP", ["—"].concat(D.proformas.filter(p => p.estado === "Vigente").slice(0, 8).map(p => p.cons))), "aqP"))}
        <div id="aqA">${asientoBox(det("Transferencia", 500000))}</div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="aqOk">${icon("check")}Registrar</button>`,
      after(el) {
        cerrar(el);
        const upd = () => { $("#aqA", el).innerHTML = asientoBox(det($("#aqM", el).value, r0(numIn($("#aqV", el).value)))); };
        $("#aqM", el).addEventListener("change", upd); $("#aqV", el).addEventListener("input", upd);
        $("#aqOk", el).addEventListener("click", () => {
          const m = $("#aqM", el).value, mo = r0(numIn($("#aqV", el).value)), ref = $("#aqR", el).value.trim();
          if (!mo) return toast("Indique el monto", "", "cr");
          if (m !== "Efectivo" && !ref) return toast("Falta la referencia", "", "cr");
          if (!periodoOk()) return;
          const k = D.cliById[$("#aqC", el).value];
          if (!k) return toast("Elija el cliente", "Escriba el nombre o la cédula y elija de la lista.", "cr");
          const a = D.asentar(D.ahora(), "ANT-" + (MOV_ANT.length + 1), "Anticipo de " + k.nom, det(m, mo));
          k.saldoFavor = (k.saldoFavor || 0) + mo;
          MOV_ANT.push({ fecha: D.ahora(), cliId: k.id, t: "Anticipo · " + m, doc: $("#aqP", el).value === "—" ? ref : $("#aqP", el).value, monto: mo, asiento: a.id });
          anotar("Registró anticipo de cliente", k.nom + " · " + c(mo), "Media"); closeSheet(); toast("Anticipo registrado", c(mo) + " a favor de " + k.nom + ". Se usa en la caja con el medio «Anticipo».", "ok"); A.refresh();
        });
      }
    });
  }
  function devolverAnticipo(k) {
    const det = m => [{ cta: "2-01-06-001", debe: m, haber: 0 }, { cta: "1-01-02-001", debe: 0, haber: m }];
    openSheet({
      title: "Devolver saldo a favor", sub: k.nom + " · " + c(k.saldoFavor),
      body: `${fld("Monto a devolver", numInp("dvM", k.saldoFavor), "dvM")}${fld("Cuenta IBAN del cliente", inp("dvI", "", 'placeholder="CR + 20 dígitos"'), "dvI")}
        ${firmaCampos(["Adrián Vindas · Gerencia", "Álvaro Cordero · Subgerencia"], "dvQ")}${asientoBox(det(k.saldoFavor))}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="dvOk">Devolver</button>`,
      after(el) {
        cerrar(el);
        $("#dvOk", el).addEventListener("click", () => {
          const m = Math.min(k.saldoFavor, r0(numIn($("#dvM", el).value)));
          if (!validaIban($("#dvI", el).value).ok) return toast("IBAN inválido", validaIban($("#dvI", el).value).msg, "cr");
          if (!$("#dvQK", el).value) return toast("Falta la clave del autorizador", "", "cr");
          if (!periodoOk()) return;
          const a = D.asentar(D.ahora(), "DEV-" + k.id, "Devolución de saldo a favor · " + k.nom, det(m));
          k.saldoFavor -= m; MOV_ANT.push({ fecha: D.ahora(), cliId: k.id, t: "Devolución al cliente", doc: "Transferencia", monto: -m, asiento: a.id });
          anotar("Devolvió saldo a favor", k.nom + " · " + c(m), "Alta"); closeSheet(); toast("Devolución registrada", "Entra en el próximo archivo de pago al banco.", "ok"); A.refresh();
        });
      }
    });
  }

  /* ═════════════════════════════════════════════════════════════
     CxP · base del auxiliar de proveedores
     Una sola lista con todo lo que se debe: facturas migradas, compras
     aplicadas (conciliación de tres vías), comprobantes aceptados sin
     orden, gastos por XML y notas de crédito. Por proveedor suma lo
     mismo que su saldo, y el total, lo mismo que la cuenta 2-01-01-001.
     ═════════════════════════════════════════════════════════════ */
  const BANCOS = { "151": "Banco Nacional", "152": "Banco de Costa Rica", "102": "BAC San José", "161": "Banco Popular", "104": "Banco BCT", "116": "Banco Promerica" };
  function validaIban(s) {
    const x = String(s || "").replace(/\s/g, "").toUpperCase();
    if (!/^CR\d{20}$/.test(x)) return { ok: false, msg: "Debe tener 22 caracteres: CR y 20 dígitos (tiene " + x.length + ")." };
    if (x[4] !== "0") return { ok: false, msg: "El quinto carácter del IBAN costarricense es 0." };
    const num = (x.slice(4) + "1227" + x.slice(2, 4));   /* C=12, R=27 */
    let r = 0; for (const ch of num) r = (r * 10 + +ch) % 97;
    if (r !== 1) return { ok: false, msg: "Los dígitos de control no coinciden (módulo 97): hay un número mal digitado." };
    return { ok: true, banco: BANCOS[x.slice(5, 8)] || "Banco " + x.slice(5, 8), msg: "IBAN válido" };
  }
  const IBAN_GASTO = { "4-000-042139": "CR15015100004000042139", "4-000-042138": "CR66015200004000042138", "3-101-552210": "CR88010200003101552210", "3-101-610944": "CR38015100003101610944", "3-101-701233": "CR85016100003101701233", "1-0845-0332": "CR59015100000108450332" };
  /* negociaciones vigentes por proveedor (COM-011): plazo normal y pronto pago */
  const PRONTO = { P1: { pct: 2, dias: 10 }, P2: { pct: 1.5, dias: 8 }, P7: { pct: 3, dias: 15 }, P10: { pct: 2, dias: 10 }, P4: { pct: 1, dias: 7 } };
  const EMPRESA_BN = { oficina: "183", tipo: "100", moneda: "01", cuenta: "006063", codigo: "0418", iban: "CR66015100003101118844" };
  const CAMBIOS_CTA = [
    { id: "CC-019", fecha: masDias(HOY, -1), provId: "P5", antes: "", nueva: "CR75010200003101990399", solicita: "Óscar Jiménez", respaldo: "Carta firmada por el representante legal (PDF)", verificado: "Llamada al contacto registrado: pendiente", estado: "Por aprobar" }
  ];
  CAMBIOS_CTA.forEach(x => { x.antes = (D.provById[x.provId] || {}).cuenta || ""; });
  const NOTAS = [];   /* notas de crédito registradas aquí (las del XML vienen de Facturación) */
  const PAGOS = [];   /* pagos confirmados en esta sesión, por documento */

  function docsCxP() {
    const out = [];
    const add = (o) => { o.saldo = o.src[o.key]; out.push(o); };
    D.cxp.forEach(x => add({ id: x.id, provId: x.provId, tipo: "Factura", origen: "Migrada", doc: x.doc, fecha: x.fecha, vence: x.vence, monto: x.monto, src: x, key: "saldo", conc: "Migrada al 31 ago", k: "mu" }));
    D.compras.filter(o => o.estado === "Aplicada").forEach(o => {
      if (o.saldoCxP == null) o.saldoCxP = o.total;
      const dif = o.lineas.some(l => Math.abs(l.var || 0) > 2);
      add({ id: o.id, provId: o.provId, tipo: "Factura", origen: "Compra", doc: (o.facturaProv && o.facturaProv.num ? "FE-" + o.facturaProv.num.slice(-8) : "FE de " + o.cons.slice(-6)), oc: o.cons, fecha: o.fecha, vence: masDias(o.fecha, o.plazo || (D.provById[o.provId] || {}).plazo || 30), monto: o.total, src: o, key: "saldoCxP", conc: dif ? "3 vías · variación aprobada" : "3 vías: orden, recepción, factura", k: dif ? "wa" : "ok" });
    });
    D.recibidos.filter(r => r.asiento && !/^en /.test(r.asiento) && /Aceptado/.test(r.estado)).forEach(r => {
      const nc = /crédito/.test(r.tipo);
      if (r.saldoCxP == null) r.saldoCxP = nc ? -r.monto : r.monto;
      const p = D.provById[r.provId] || {};
      add({ id: r.id, provId: r.provId, tipo: nc ? "Nota de crédito" : "Factura", origen: "Comprobante", doc: (nc ? "NC-" : "FE-") + r.clave.slice(-8), clave: r.clave, fecha: r.fecha, vence: masDias(r.fecha, p.plazo || 30), monto: nc ? -r.monto : r.monto, src: r, key: "saldoCxP",
        conc: r.estado === "Aceptado parcial" ? "Aceptación parcial · retenida" : r.ocLigada ? "Con orden " + r.ocLigada.slice(-6) : "Sin orden · aprobada", k: r.estado === "Aceptado parcial" ? "cr" : "ok", retenida: r.estado === "Aceptado parcial" });
    });
    NOTAS.filter(n => n.asiento && n.tipo === "NC").forEach(n => add({ id: n.id, provId: n.provId, tipo: "Nota de crédito", origen: "Nota", doc: n.cons, fecha: n.fecha, vence: n.fecha, monto: -n.total, src: n, key: "saldoCxP", conc: n.concepto, k: "ac" }));
    AU.GASTOS.filter(g => g.canal === "XML" && g.asiento).forEach(g => {
      if (g.saldo == null) g.saldo = g.monto;
      add({ id: g.id, provId: null, nom: g.prov.split(" · ")[0], ced: g.ced, tipo: "Factura", origen: "Gasto", doc: "FE-" + g.id, fecha: g.fecha, vence: masDias(g.fecha, 15), monto: g.monto, src: g, key: "saldo", conc: "Gasto · " + ((D.ctaByCod[g.cta] || {}).nom || ""), k: "mu" });
    });
    out.forEach(o => { o.dias = diasEntre(o.vence, HOY); o.nomProv = o.provId ? provNom(o.provId) : o.nom; o.cedProv = o.provId ? D.provById[o.provId].ced : o.ced; o.iban = o.provId ? D.provById[o.provId].cuenta : IBAN_GASTO[o.ced] || ""; });
    return out;
  }
  const abiertos = () => docsCxP().filter(o => Math.round(o.saldo) !== 0);
  const auxProv = pid => docsCxP().filter(o => o.provId === pid).reduce((s, o) => s + o.saldo, 0);
  const prontoDe = o => { const p = PRONTO[o.provId]; if (!p || o.tipo !== "Factura" || o.saldo !== o.monto) return null; const lim = masDias(o.fecha, p.dias); return HOY <= lim ? { pct: p.pct, lim, desc: r0(o.saldo * p.pct / 100) } : null; };
  const bloqueoCuenta = o => (CAMBIOS_CTA.some(x => x.estado === "Por aprobar" && x.provId === o.provId) ? "Cambio de cuenta pendiente" : !validaIban(o.iban).ok ? "Cuenta IBAN inválida" : null);
  function cuadreCxP() {
    const k = AU.proveedores(), aux = docsCxP().reduce((s, o) => s + o.saldo, 0);
    const dif = r0(k.libro - aux);
    return `<div class="cob-cuadre ${dif ? "cr" : ""}">${icon(dif ? "alert" : "check")}<span>Auxiliar de proveedores <b class="num">${c(aux)}</b> · Mayor 2-01-01-001 <b class="num">${c(k.libro)}</b> · ${dif ? `<b style="color:var(--crit)">diferencia ${c(dif)}</b>` : "<b>cuadra</b>"}</span><button class="btn sm" data-ir="con-conciliaciones|cartera">Ver en Contabilidad</button></div>`;
  }

  /* ── lotes de pago y autorización mancomunada (CXP-001, CXP-004) ── */
  /* personas habilitadas para firmar pagos y reglas por origen del lote.
     Todo es parámetro: mañana pueden ser otras personas u otra cantidad
     de firmas (hoy la revisión la hace una persona adicional, en papel). */
  const FIRMANTES = [
    { nom: "Adrián Vindas", cargo: "Gerente general", limite: 0 },
    { nom: "Sonia Calderón", cargo: "Contadora general", limite: 0 },
    { nom: "Álvaro Cordero", cargo: "Respaldo de firmas", limite: 50000000 }
  ];
  const RESPONSABLES = ["Andrey Ramírez · TI", "Adrián Vindas · Gerencia", "Sonia Calderón · Contabilidad", "Katherine Vargas · Tesorería"];
  const REGLAS_PAGO = {
    Proveedores: { n: 2, firmantes: ["Adrián Vindas", "Sonia Calderón", "Álvaro Cordero"], genera: "Andrey Ramírez · TI", sube: "Adrián Vindas · Gerencia", concepto: "PAGO PROGRAMADO" },
    Planilla: { n: 2, firmantes: ["Adrián Vindas", "Sonia Calderón", "Álvaro Cordero"], genera: "Andrey Ramírez · TI", sube: "Adrián Vindas · Gerencia", concepto: "SALARIO" }
  };
  const reglaDe = l => REGLAS_PAGO[l.origen] || REGLAS_PAGO.Proveedores;
  const persona = t => String(t || "").split(" · ")[0];
  const LOTES = [
    { cons: "LP-2026-0035", fecha: new Date(2026, 7, 22, 9, 30), fechaPago: new Date(2026, 7, 22), concepto: "Pago a proveedores 22 ago", origen: "Proveedores", prepara: PERSONAS.prepara, items: [], n: 81, total: 126418220, desc: 812400, estado: "Pagado", firmas: [{ nom: "Adrián Vindas", fecha: new Date(2026, 7, 22, 10, 5) }, { nom: "Sonia Calderón", fecha: new Date(2026, 7, 22, 10, 40) }], archivo: { nombre: "PP20260822.txt", testKey: "7F3A-22B1", enviado: new Date(2026, 7, 22, 11, 2), aceptado: new Date(2026, 7, 22, 11, 20) }, migrado: true },
    { cons: "LP-2026-0036", fecha: new Date(2026, 7, 29, 9, 10), fechaPago: new Date(2026, 7, 29), concepto: "Pago a proveedores 29 ago", origen: "Proveedores", prepara: PERSONAS.prepara, items: [], n: 79, total: 139482110, desc: 1044900, estado: "Pagado", firmas: [{ nom: "Adrián Vindas", fecha: new Date(2026, 7, 29, 9, 55) }, { nom: "Álvaro Cordero", fecha: new Date(2026, 7, 29, 10, 12) }], archivo: { nombre: "PP20260829.txt", testKey: "0C91-7E44", enviado: new Date(2026, 7, 29, 10, 50), aceptado: new Date(2026, 7, 29, 11, 6), rechazos: 1 }, migrado: true },
    { cons: "LP-2026-0034", fecha: new Date(2026, 7, 29, 8, 30), fechaPago: new Date(2026, 7, 31), concepto: "Planilla QUI-2026-16", origen: "Planilla", prepara: "Nómina", items: [], n: 37, total: 8412650, desc: 0, estado: "Pagado", firmas: [{ nom: "Adrián Vindas", fecha: new Date(2026, 7, 29, 9, 0) }, { nom: "Sonia Calderón", fecha: new Date(2026, 7, 29, 9, 20) }], archivo: { nombre: "PL20260831.txt", testKey: "5D10-A7C2", enviado: new Date(2026, 7, 29, 10, 0), aceptado: new Date(2026, 7, 29, 10, 15) }, migrado: true }
  ];
  let lpSeq = 36;
  const SELCXP = new Set();
  let cxpFiltro = "Vencidas y semana";
  const netoLote = l => l.items.reduce((s, it) => s + it.neto, 0);
  const estadoLote = l => l.estado === "Por aprobar" ? "Por firmar · " + l.firmas.length + " de " + reglaDe(l).n : l.estado;
  const kLote = l => (l.estado === "Pagado" ? "ok" : l.estado === "Rechazado" ? "cr" : l.estado === "Por aprobar" ? "wa" : "ac");

  function armarItems(sel) {
    const g = {};
    sel.forEach(o => {
      const k = o.provId || o.ced;
      const it = g[k] || (g[k] = { key: k, provId: o.provId, nom: o.nomProv, ced: o.cedProv, iban: o.iban, docs: [], ncs: [], bruto: 0, nc: 0, desc: 0 });
      const pp = prontoDe(o);
      it.docs.push({ id: o.id, doc: o.doc, monto: o.saldo, desc: pp ? pp.desc : 0 });
      it.bruto += o.saldo; it.desc += pp ? pp.desc : 0;
    });
    /* las notas de crédito del proveedor se aplican solas contra sus facturas */
    const ncs = abiertos().filter(o => o.tipo === "Nota de crédito" && o.saldo < 0 && !o.src.enLote);
    Object.values(g).forEach(it => {
      ncs.filter(n => n.provId && n.provId === it.provId).forEach(n => { const x = Math.min(-n.saldo, it.bruto - it.nc - it.desc); if (x > 0) { it.ncs.push({ id: n.id, doc: n.doc, monto: x }); it.nc += x; } });
      it.neto = it.bruto - it.nc - it.desc;
      it.bloqueo = bloqueoCuenta({ provId: it.provId, iban: it.iban });
    });
    return Object.values(g);
  }
  (function sembrarLote() {
    const sel = abiertos().filter(o => o.provId === "P2" && o.tipo === "Factura" && o.dias > 0 && !o.retenida).slice(0, 2);
    if (!sel.length) return;
    const items = armarItems(sel);
    lpSeq++;
    const l = { cons: "LP-2026-00" + lpSeq, fecha: masDias(HOY, 0), fechaPago: HOY, concepto: "Pago urgente Holcim · despacho de cemento retenido", origen: "Proveedores", prepara: PERSONAS.prepara, items, n: items.length, total: 0, desc: 0, estado: "Por aprobar", firmas: [{ nom: "Adrián Vindas", fecha: new Date(HOY.getTime() - 3600000) }], archivo: null };
    l.total = netoLote(l); l.desc = items.reduce((s, it) => s + it.desc, 0);
    items.forEach(it => { it.docs.forEach(d => { const o = docsCxP().find(k => k.id === d.id); if (o) o.src.enLote = l.cons; }); it.ncs.forEach(d => { const o = docsCxP().find(k => k.id === d.id); if (o) o.src.enLote = l.cons; }); });
    LOTES.push(l);
  })();

  A.workspace("cxp", {
    title: "Análisis de pagos a proveedores",
    sub: "Vencimientos, pronto pago y lote de la semana; se firma y se paga en Pagos al banco",
    tabs: [
      {
        id: "vencimientos", t: "Por vencimiento", sub: "Seleccione lo que va en el pago de la semana; las notas de crédito y el pronto pago se aplican solos",
        actions: () => seg("cxpf", ["Vencidas y semana", "Todas", "Pronto pago", "Retenidas"], cxpFiltro),
        render(v) {
          const all = abiertos();
          let rows = all.filter(o => o.tipo === "Factura");
          if (cxpFiltro === "Vencidas y semana") rows = rows.filter(o => o.dias > -7);
          if (cxpFiltro === "Pronto pago") rows = rows.filter(o => prontoDe(o));
          if (cxpFiltro === "Retenidas") rows = rows.filter(o => o.retenida || o.src.enLote);
          rows.sort((a, b) => b.dias - a.dias);
          A._cxpRows = rows;
          const venc = all.filter(o => o.tipo === "Factura" && o.dias > 0), sem = all.filter(o => o.tipo === "Factura" && o.dias > -7 && o.dias <= 0);
          const pp = all.map(prontoDe).filter(Boolean), sinAceptar = D.recibidos.filter(r => r.estado === "Sin aceptar");
          const ncDisp = all.filter(o => o.tipo === "Nota de crédito" && o.saldo < 0);
          v.innerHTML = `<div class="wrap">
            <div class="grid g4">
              ${stat("Saldo con proveedores", c(all.reduce((s, o) => s + o.saldo, 0)), { txt: all.length + " documentos abiertos" })}
              ${stat("Vencido", c(venc.reduce((s, o) => s + o.saldo, 0)), { txt: venc.length + " facturas fuera de plazo", dir: "down" }, "var(--crit)")}
              ${stat("Vence en 7 días", c(sem.reduce((s, o) => s + o.saldo, 0)), { txt: sem.length + " facturas por programar" }, "var(--warn)")}
              ${stat("Pronto pago disponible", c(pp.reduce((s, x) => s + x.desc, 0)), { txt: pp.length + " facturas · si se pagan a tiempo" }, "var(--ok)")}
            </div>
            ${cuadreCxP()}
            ${sinAceptar.length ? `<div class="stepbar wa"><div class="sbt"><b>${sinAceptar.length} comprobantes de proveedor sin aceptar no entran al pago</b><span>Primero se aceptan (mensaje de receptor, 8 días hábiles) y se cruzan con la orden y la recepción. ${c(sinAceptar.reduce((s, r) => s + r.monto, 0))} esperando.</span></div><div class="sba"><button class="btn sm" data-ir="fel-recibidos">Aceptar comprobantes</button></div></div>` : ""}
            ${card({
            title: "Facturas por pagar", hint: rows.length + " en la vista" + (ncDisp.length ? " · " + ncDisp.length + " notas de crédito por aplicar" : ""),
            actions: filtroCaja("pvQ", "Proveedor, cédula o documento") + `<button class="btn" id="cxpTodas">${icon("check")}Marcar vencidas</button><button class="btn pri" id="cxpLote">${icon("bank")}Preparar lote de pago</button>`,
            body: table({
              h: "calc(100dvh - 520px)",
              cols: [
                { t: "", fmt: (o, i) => o.retenida || o.src.enLote ? `<span title="${o.src.enLote ? "En el lote " + o.src.enLote : "Retenida"}">${icon("lock")}</span>` : `<input type="checkbox" data-cx="${esc(o.id)}" ${SELCXP.has(o.id) ? "checked" : ""}>` },
                { t: "Proveedor", fmt: o => `${esc(o.nomProv)}<span class="sub">${esc(o.cedProv)}</span>` },
                { t: "Documento", cls: "mono", fmt: o => `${esc(o.doc)}<span class="sub">${esc(o.origen)}</span>` },
                { t: "Conciliación", fmt: o => o.src.enLote ? tag("En " + o.src.enLote, "ac", "bank") : tag(o.conc, o.k) },
                { t: "Emitida", cls: "mono", fmt: o => fecha(o.fecha) },
                { t: "Vence", cls: "mono", fmt: o => fecha(o.vence) },
                { t: "Días", r: true, cls: "mono", fmt: o => o.dias > 0 ? `<b style="color:${o.dias > 30 ? "var(--crit)" : "var(--warn)"}">${o.dias} vencida</b>` : `<span class="mut">faltan ${-o.dias}</span>` },
                { t: "Pronto pago", r: true, cls: "mono", fmt: o => { const p = prontoDe(o); return p ? `<b style="color:var(--ok)">−${grp(p.desc)}</b><span class="sub">${dec(p.pct, p.pct % 1 ? 1 : 0)} % hasta ${fecha(p.lim)}</span>` : '<span class="dim">—</span>'; } },
                { t: "Saldo", r: true, cls: "mono", fmt: o => `<b>${grp(o.saldo)}</b>` }
              ], rows, rowCls: o => (o.retenida ? "cr" : o.dias > 30 ? "wa" : "")
            })
          })}
            <div id="cxpSel"></div></div>`;
          pintarSel(v);
        },
        wire(v) {
          A.wireIr(v);
          onSeg(v, "cxpf", x => { cxpFiltro = x; A.refresh(); }); wireFiltro(v, "pvQ", "tbody tr");
          $$("[data-cx]", v).forEach(b => b.addEventListener("change", () => { if (b.checked) SELCXP.add(b.dataset.cx); else SELCXP.delete(b.dataset.cx); pintarSel(v); }));
          $("#cxpTodas", v).addEventListener("click", () => { A._cxpRows.filter(o => o.dias > 0 && !o.retenida && !o.src.enLote).forEach(o => SELCXP.add(o.id)); A.refresh(); });
          $("#cxpLote", v).addEventListener("click", prepararLote);
        }
      },
      {
        id: "lotes", t: "Lotes de proveedores", sub: "Seguimiento: las firmas, el archivo y la confirmación se hacen en Pagos al banco",
        badge: () => { const n = LOTES.filter(l => l.origen === "Proveedores" && l.estado === "Por aprobar").length; return { n, k: "wa", l: n + " por firmar" }; },
        actions: () => `<button class="btn" data-ir="cob-archivo|bandeja">${icon("bank")}Ir a Pagos al banco</button>`,
        render(v) {
          const L = LOTES.filter(l => l.origen === "Proveedores").reverse();
          A._lotes = L;
          v.innerHTML = `<div class="wrap">${tablaLotes(L, false)}</div>`;
        },
        wire(v) { A.wireIr(v); $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => verLote(A._lotes[+tr.dataset.i]))); }
      }
    ]
  });
  function tablaLotes(L, conOrigen) {
    return card({
      title: "Lotes de pago", hint: "toque uno para ver el detalle",
      body: table({
        onRow: true,
        cols: [
          { t: "Lote", cls: "mono", fmt: l => `${esc(l.cons)}<span class="sub">${fh(l.fecha)}</span>` }]
          .concat(conOrigen ? [{ t: "Origen", fmt: l => tag(l.origen, l.origen === "Planilla" ? "ac" : "mu", l.origen === "Planilla" ? "users" : "truck") }] : [])
          .concat([
            { t: "Concepto", fmt: l => `${esc(l.concepto)}<span class="sub">preparó ${esc(l.prepara)}</span>` },
            { t: "Transferencias", r: true, cls: "mono", fmt: l => l.items.length || l.n },
            { t: "Total", r: true, cls: "mono", fmt: l => `<b>${grp(l.items.length ? netoLote(l) : l.total)}</b>` },
            { t: "Firmas", fmt: l => l.firmas.length ? esc(l.firmas.map(f => f.nom.split(" ")[0]).join(" + ")) : '<span class="mut">ninguna</span>' },
            { t: "Estado", fmt: l => tag(estadoLote(l), kLote(l), l.estado === "Pagado" ? "check" : l.estado === "Por aprobar" ? "shield" : "bank") }
          ]), rows: L
      })
    });
  }
  function pintarSel(v) {
    const box = $("#cxpSel", v); if (!box) return;
    const sel = abiertos().filter(o => SELCXP.has(o.id));
    if (!sel.length) { box.innerHTML = ""; return; }
    const items = armarItems(sel);
    const bruto = items.reduce((s, x) => s + x.bruto, 0), nc = items.reduce((s, x) => s + x.nc, 0), desc = items.reduce((s, x) => s + x.desc, 0);
    box.innerHTML = `<div class="cob-tot cob-sticky"><span>Seleccionadas <b class="num">${sel.length}</b></span><span>Proveedores <b class="num">${items.length}</b></span><span>Facturas <b class="num">${c(bruto)}</b></span><span>Notas de crédito <b class="num">−${c(nc)}</b></span><span>Pronto pago <b class="num" style="color:var(--ok)">−${c(desc)}</b></span><span>A transferir <b class="num">${c(bruto - nc - desc)}</b></span><button class="btn sm" id="cxpLimpia">Limpiar</button></div>`;
    $("#cxpLimpia", box).addEventListener("click", () => { SELCXP.clear(); A.refresh(); });
  }
  function prepararLote() {
    const sel = abiertos().filter(o => SELCXP.has(o.id));
    if (!sel.length) return toast("Seleccione facturas", "Marque las facturas que van en el pago de la semana.", "wa");
    const items = armarItems(sel), ok = items.filter(x => !x.bloqueo && x.neto > 0), fuera = items.filter(x => x.bloqueo || x.neto <= 0);
    const tot = ok.reduce((s, x) => s + x.neto, 0), desc = ok.reduce((s, x) => s + x.desc, 0);
    openSheet({
      wide: true, title: "Preparar lote de pago", sub: ok.length + " transferencias · " + c(tot),
      body: `${g3(fld("Concepto", inp("lpC", "Pago a proveedores de la semana del " + fecha(HOY)), "lpC") + fld("Fecha de pago", `<input id="lpF" type="date" value="${masDias(HOY, 0).toISOString().slice(0, 10)}" min="${HOY.toISOString().slice(0, 10)}">`, "lpF", "El banco no acepta archivos con fecha anterior a hoy.") + fld("Cuenta de origen", `<input value="Banco Nacional · cta. corriente colones (1-01-02-001)" disabled>`))}
        ${table({
        cols: [
          { t: "Proveedor", fmt: x => `<b>${esc(x.nom)}</b><span class="sub">${esc(x.ced)}</span>` },
          { t: "Cuenta IBAN", cls: "mono", fmt: x => `${esc(x.iban || "—")}<span class="sub">${x.bloqueo ? `<b style="color:var(--crit)">${esc(x.bloqueo)}</b>` : esc(validaIban(x.iban).banco || "")}</span>` },
          { t: "Facturas", r: true, cls: "mono", fmt: x => `${grp(x.bruto)}<span class="sub">${x.docs.length} doc.</span>` },
          { t: "NC aplicadas", r: true, cls: "mono", fmt: x => (x.nc ? "−" + grp(x.nc) : '<span class="dim">—</span>') },
          { t: "Pronto pago", r: true, cls: "mono", fmt: x => (x.desc ? "−" + grp(x.desc) : '<span class="dim">—</span>') },
          { t: "A transferir", r: true, cls: "mono", fmt: x => `<b>${grp(x.neto)}</b>` }
        ], rows: items, rowCls: x => (x.bloqueo || x.neto <= 0 ? "cr" : ""),
        foot: [{ v: "<b>Total del lote</b>", span: 5 }, { v: `<b>${grp(tot)}</b>`, r: true, cls: "mono" }]
      })}
        ${fuera.length ? nota(`<b>${fuera.length} proveedor(es) quedan fuera del lote</b> hasta corregir la cuenta: ${esc(fuera.map(x => x.nom + " (" + (x.bloqueo || "neto en cero") + ")").join(", "))}.`, "alert", "cr") : ""}
        ${asientoBox([{ cta: "2-01-01-001", debe: tot + desc, haber: 0, nota: "facturas menos notas de crédito" }, { cta: "5-01-02-001", debe: 0, haber: desc, nota: "descuento por pronto pago" }, { cta: "1-01-02-001", debe: 0, haber: tot }], "Asiento al confirmar el pago", "entra al mayor cuando el banco acepta el archivo")}
        ${nota("El descuento por pronto pago es financiero: no cambia el IVA de la factura. Si el proveedor lo documenta con nota de crédito electrónica, se registra en Notas de crédito y débito.", "info")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="lpOk">${icon("shield")}Crear lote y enviar a firma</button>`,
      after(el) {
        cerrar(el);
        $("#lpOk", el).addEventListener("click", () => {
          if (!ok.length) return toast("No hay transferencias válidas", "", "cr");
          const fp = new Date($("#lpF", el).value + "T12:00");
          if (fp < new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate())) return toast("Fecha de pago anterior a hoy", "El Banco Nacional rechaza el archivo.", "cr");
          lpSeq++;
          const l = { cons: "LP-2026-00" + lpSeq, fecha: D.ahora(), fechaPago: fp, concepto: $("#lpC", el).value, origen: "Proveedores", prepara: PERSONAS.prepara, items: ok, n: ok.length, total: tot, desc, estado: "Por aprobar", firmas: [], archivo: null };
          const idx = {}; docsCxP().forEach(o => idx[o.id] = o);
          ok.forEach(it => { it.docs.concat(it.ncs).forEach(d => { if (idx[d.id]) idx[d.id].src.enLote = l.cons; SELCXP.delete(d.id); }); });
          LOTES.push(l);
          V.anotar("Preparó lote de pago", l.cons + " · " + ok.length + " transferencias · " + c(tot), PERSONAS.prepara, S.locId, "Alta");
          closeSheet(); toast(l.cons + " enviado a Pagos al banco", "Se avisó a los autorizados para firmar. Nadie más puede cambiarlo.", "ok"); A.go("cob-archivo", "bandeja");
        });
      }
    });
  }
  function verLote(l) {
    const pasos = ["Por aprobar", "Aprobado", "Archivo generado", "Validado en módulo local", "Enviado al banco", "Pagado"];
    const i0 = pasos.indexOf(l.estado);
    openSheet({
      wide: true, title: "Lote " + l.cons, sub: l.concepto + " · preparó " + l.prepara,
      body: `<div class="cob-pasos">${pasos.map((p, i) => `<span class="${i < i0 || l.estado === "Pagado" ? "ok" : i === i0 ? "on" : ""}">${i < i0 || l.estado === "Pagado" ? icon("check") : ""}${esc(p === "Por aprobar" ? "Firmas (" + Math.min(reglaDe(l).n, l.firmas.length) + "/" + reglaDe(l).n + ")" : p)}</span>`).join("")}</div>
        ${l.items.length ? table({
        cols: [
          { t: l.origen === "Planilla" ? "Colaborador" : "Beneficiario", fmt: x => `<b>${esc(x.nom)}</b><span class="sub">${esc(x.iban)}</span>` },
          { t: l.origen === "Planilla" ? "Detalle" : "Documentos", fmt: x => `<span class="mono" style="font-size:12px">${esc(x.docs.length ? x.docs.map(d => d.doc).join(", ") : x.det || "")}</span>${x.ncs.length ? `<span class="sub">NC: ${esc(x.ncs.map(d => d.doc).join(", "))}</span>` : ""}` },
          { t: l.origen === "Planilla" ? "Neto" : "Facturas", r: true, cls: "mono", fmt: x => grp(x.bruto) },
          { t: "NC y pronto pago", r: true, cls: "mono", fmt: x => (x.nc + x.desc ? "−" + grp(x.nc + x.desc) : '<span class="dim">—</span>') },
          { t: "A transferir", r: true, cls: "mono", fmt: x => `<b>${grp(x.neto)}</b>` }
        ], rows: l.items, foot: [{ v: "<b>Total</b>", span: 4 }, { v: `<b>${grp(netoLote(l))}</b>`, r: true, cls: "mono" }]
      }) : nota(`Lote del sistema anterior: ${l.n} transferencias por ${c(l.total)}${l.archivo && l.archivo.rechazos ? ", " + l.archivo.rechazos + " rechazada por el banco y reprogramada" : ""}. Su efecto ya está en los saldos migrados al 31 de agosto.`, "history")}
        <div class="grid g2" style="gap:12px;margin-top:10px;align-items:start">
          ${card({ title: "Firmas", body: l.firmas.length ? kvs(l.firmas.map(f => [f.nom, fh(f.fecha)])) : '<div class="mut">Sin firmas todavía.</div>' })}
          ${card({ title: "Archivo del banco", body: l.archivo ? kvs([["Archivo", esc(l.archivo.nombre)], ["Llave de prueba del módulo local", esc(l.archivo.testKey || "pendiente")], ["Enviado", l.archivo.enviado ? fh(l.archivo.enviado) : "—"], ["Aceptado por el banco", l.archivo.aceptado ? fh(l.archivo.aceptado) : "—"]]) : '<div class="mut">Se genera cuando el lote tiene las firmas que pide la regla.</div>' })}
        </div>
        ${l.asiento ? `<div style="margin-top:8px">${asientoTabla(asientoPor(l.asiento).detalle, l.asiento + " · pago confirmado")}</div>` : ""}`,
      footer: `<button class="btn" data-cerrar>Cerrar</button><div class="gap"></div>
        ${l.estado === "Por aprobar" ? `<button class="btn" id="loRech">${icon("x")}Devolver</button><button class="btn pri" id="loFir">${icon("shield")}Firmar</button>` : ""}
        ${/Aprobado|Archivo|Validado|Enviado/.test(l.estado) ? `<button class="btn pri" data-ir="cob-archivo|bandeja">${icon("bank")}Ir a Pagos al banco</button>` : ""}`,
      after(el) {
        cerrar(el); A.wireIr(el);
        const fi = $("#loFir", el); if (fi) fi.addEventListener("click", () => firmarLote(l));
        const re = $("#loRech", el); if (re) re.addEventListener("click", () => devolverLote(l));
      }
    });
  }
  function firmarLote(l) {
    const tot = netoLote(l);
    openSheet({
      title: "Firmar lote " + l.cons, sub: c(tot) + " · " + l.items.length + " transferencias",
      body: `${fld("Firmante", sel("fiQ", FIRMANTES.filter(f => reglaDe(l).firmantes.indexOf(f.nom) >= 0).map(f => [f.nom, f.nom + " · " + f.cargo + (f.limite ? " · hasta " + c(f.limite) : "")])), "fiQ", "Autorizados para pagos de " + l.origen.toLowerCase() + " · " + reglaDe(l).n + " firma(s) requerida(s)")}
        ${fld("Clave", `<input id="fiK" type="password" autocomplete="off" placeholder="••••">`, "fiK", "Doble factor: además llega un código al celular del firmante.")}
        ${l.firmas.length ? nota("Ya firmó " + esc(l.firmas.map(f => f.nom).join(", ")) + ". Faltan " + Math.max(0, reglaDe(l).n - l.firmas.length) + " firma(s) de otra persona.", "check", "ok") : ""}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="fiOk">${icon("shield")}Firmar</button>`,
      after(el) {
        cerrar(el);
        $("#fiOk", el).addEventListener("click", () => {
          const n = $("#fiQ", el).value, f = FIRMANTES.find(x => x.nom === n);
          if (!$("#fiK", el).value) return toast("Falta la clave", "", "cr");
          if (n === l.prepara) return toast("Quien preparó no firma", "Segregación de funciones.", "cr");
          if (l.firmas.some(x => x.nom === n)) return toast(n + " ya firmó este lote", "La segunda firma tiene que ser de otra persona.", "cr");
          if (f.limite && tot > f.limite) return toast("Supera el límite de " + n, "Puede firmar lotes hasta " + c(f.limite) + ".", "cr");
          l.firmas.push({ nom: n, fecha: D.ahora() });
          const req = reglaDe(l).n, listo = l.firmas.length >= req;
          if (listo) l.estado = "Aprobado";
          V.anotar("Firmó lote de pago", l.cons + " · " + c(tot) + " · firma " + l.firmas.length + " de " + req, n, S.locId, "Alta");
          closeSheet(); toast(listo ? "Lote aprobado" : "Firma registrada", listo ? persona(reglaDe(l).genera) + " ya puede generar el archivo del Banco Nacional." : "Falta " + (req - l.firmas.length) + " firma más.", "ok"); A.refresh();
        });
      }
    });
  }
  function devolverLote(l) {
    openSheet({
      title: "Devolver lote " + l.cons, sub: l.origen === "Planilla" ? "La planilla vuelve a Nómina para corregir y reenviar" : "Las facturas vuelven a quedar disponibles para programar",
      body: fld("Motivo", `<textarea id="dlM" rows="2"></textarea>`, "dlM"),
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="dlOk">Devolver</button>`,
      after(el) {
        cerrar(el);
        $("#dlOk", el).addEventListener("click", () => {
          const m = $("#dlM", el).value.trim(); if (!m) return toast("Escriba el motivo", "", "cr");
          const idx = {}; docsCxP().forEach(o => idx[o.id] = o);
          l.items.forEach(it => it.docs.concat(it.ncs).forEach(d => { if (idx[d.id]) delete idx[d.id].src.enLote; }));
          l.estado = "Rechazado"; l.motivo = m;
          if (l.alDevolver) l.alDevolver(m);
          anotar("Devolvió lote de pago", l.cons + " · " + m, "Alta"); closeSheet(); toast("Lote devuelto", (l.origen === "Planilla" ? "Nómina" : "Proveeduría") + " recibió el motivo.", "wa"); A.refresh();
        });
      }
    });
  }

  /* ═════════════════════════════════════════════════════════════
     CxP · ARCHIVO PLANO DEL BANCO NACIONAL (CXP-002, INT-004)
     La cuenta del proveedor sale de su ficha (ya no se escribe a mano).
     Línea 1 encabezado · 2 débito a la cuenta de la empresa ·
     3 un crédito por proveedor · 4 cierre con totales.
     ═════════════════════════════════════════════════════════════ */
  const pad = (s, n, ch) => String(s).padStart(n, ch == null ? "0" : ch).slice(-n);
  const padR = (s, n) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().padEnd(n, " ").slice(0, n);
  const ymd = f => f.getFullYear() + pad(f.getMonth() + 1, 2) + pad(f.getDate(), 2);
  function archivoBN(l) {
    const tot = netoLote(l), cs = pad(l.cons.slice(-4), 6);
    const L = [];
    L.push("1" + EMPRESA_BN.oficina + EMPRESA_BN.tipo + EMPRESA_BN.moneda + EMPRESA_BN.cuenta + ymd(l.fechaPago) + cs + pad(tot * 100, 15) + padR(l.concepto, 30));
    L.push("2" + EMPRESA_BN.oficina + EMPRESA_BN.tipo + EMPRESA_BN.moneda + EMPRESA_BN.cuenta + cs + pad(tot * 100, 15) + padR(l.origen === "Planilla" ? "DEBITO PAGO PLANILLA" : "DEBITO PAGO PROVEEDORES", 30));
    l.items.forEach((it, i) => L.push("3" + it.iban + pad(String(it.ced).replace(/\D/g, ""), 12) + pad(it.neto * 100, 15) + pad(i + 1, 6) + padR(reglaDe(l).concepto, 30) + padR(it.nom, 30)));
    L.push("4" + pad(l.items.length, 5) + pad(tot * 100, 15) + pad(l.items.reduce((s, it) => s + it.neto, 0) * 100, 15));
    return L;
  }
  const nombreArch = l => (l.origen === "Planilla" ? "PL" : "PP") + ymd(l.fechaPago) + "-" + l.cons.slice(-2) + ".txt";
  function validarArchivo(l) {
    const tot = netoLote(l);
    const iban = l.items.every(it => validaIban(it.iban).ok), dup = new Set(l.items.map(it => it.iban)).size === l.items.length;
    return [
      ["Cuentas IBAN válidas (22 caracteres y módulo 97)", iban], [l.origen === "Planilla" ? "Cuenta de cada colaborador tomada de su expediente" : "Cuenta de cada proveedor tomada de su ficha", true],
      ["Sin cambios de cuenta pendientes de aprobar", l.items.every(it => !CAMBIOS_CTA.some(x => x.estado === "Por aprobar" && x.provId === it.provId))],
      ["Fecha del archivo no es anterior a hoy", l.fechaPago >= new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate())],
      ["Total de débitos = suma de créditos", r0(tot) === r0(l.items.reduce((s, it) => s + it.neto, 0))],
      ["Sin beneficiarios duplicados", dup], [reglaDe(l).n + " firma(s) de personas distintas a quien preparó", l.firmas.length >= reglaDe(l).n && !l.firmas.some(f => f.nom === l.prepara)]
    ];
  }
  function descargar(nombre, texto) {
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([texto], { type: "text/plain" })); a.download = nombre;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    } catch (e) { toast("No se pudo descargar", e.message, "cr"); }
  }
  /* ═════════════════════════════════════════════════════════════
     PAGOS AL BANCO — bandeja única de Tesorería (CXP-002, CXP-003, CXP-004)
     Proveeduría (lote de facturas) y Nómina (corrida aprobada) preparan;
     aquí se firma, se genera el archivo del Banco Nacional, se valida en
     el módulo local, se envía y se confirma. El mismo proceso para los
     dos orígenes, un solo historial y las reglas de firma por origen.
     ═════════════════════════════════════════════════════════════ */
  let pbOrigen = "Todos";
  const enProceso = l => /Por aprobar|Aprobado|Archivo|Validado|Enviado/.test(l.estado);
  const pasoTxt = l => l.estado === "Por aprobar" ? "Firmas: " + l.firmas.length + " de " + reglaDe(l).n
    : l.estado === "Aprobado" ? "Generar el archivo · " + persona(reglaDe(l).genera)
    : l.estado === "Archivo generado" ? "Validar en el módulo local · " + persona(reglaDe(l).genera)
    : l.estado === "Validado en módulo local" ? "Subir al banco · " + persona(reglaDe(l).sube)
    : "Registrar la respuesta del banco";
  A.workspace("cob-archivo", {
    title: "Pagos al banco",
    sub: "Firmas, archivo plano del Banco Nacional y confirmación, para proveedores y planilla",
    onArg: tab => { if (tab === "archivos") pbOrigen = "Todos"; },
    tabs: [
      {
        id: "bandeja", t: "Bandeja", sub: "Lo que preparó Proveeduría o Nómina y espera firma, archivo o confirmación del banco",
        badge: () => { const n = LOTES.filter(enProceso).length; return { n, k: "wa", l: n + " en proceso" }; },
        actions: () => seg("pbo", ["Todos", "Proveedores", "Planilla"], pbOrigen),
        render(v) {
          const proc = LOTES.filter(l => enProceso(l) && (pbOrigen === "Todos" || l.origen === pbOrigen))
            .sort((a, b) => (a.origen === "Planilla" ? 0 : 1) - (b.origen === "Planilla" ? 0 : 1) || a.fechaPago - b.fechaPago);
          A._arch = proc;
          const tot = proc.reduce((s, l) => s + netoLote(l), 0);
          v.innerHTML = `<div class="wrap">
            <div class="grid g4">
              ${stat("Por firmar", grp(proc.filter(l => l.estado === "Por aprobar").length), { txt: "lotes esperando firma" }, "var(--warn)")}
              ${stat("Listos para el banco", grp(proc.filter(l => /Aprobado|Archivo|Validado/.test(l.estado)).length), { txt: "firmados, falta el archivo o subirlo" })}
              ${stat("Enviados", grp(proc.filter(l => l.estado === "Enviado al banco").length), { txt: "esperando la respuesta del banco" })}
              ${stat("Monto en proceso", c(tot), { txt: proc.reduce((s, l) => s + l.items.length, 0) + " transferencias" }, "var(--accent)")}
            </div>
            ${proc.length ? proc.map((l, i) => {
            const planilla = l.origen === "Planilla", vence = diasEntre(HOY, l.fechaPago);
            return card({
              title: l.cons + " · " + l.concepto,
              chip: tag(l.origen, planilla ? "ac" : "mu", planilla ? "users" : "truck") + " " + tag(estadoLote(l), kLote(l), l.estado === "Por aprobar" ? "shield" : "bank"),
              hint: l.items.length + " transferencias · " + c(netoLote(l)) + " · pago " + fechaL(l.fechaPago),
              body: `${planilla && vence <= 2 ? nota("<b>Fecha legal de pago:</b> la planilla se paga el " + fechaL(l.fechaPago) + (vence <= 0 ? " (hoy)" : " (en " + vence + " día" + (vence === 1 ? "" : "s") + ")") + ". Va primero en la bandeja.", "clock", "wa") : ""}
                <div class="cob-pasos" style="margin-top:8px">${["Firmas", "Archivo", "Módulo local", "Banco", "Confirmado"].map((p, k) => { const at = ["Por aprobar", "Aprobado", "Archivo generado", "Validado en módulo local", "Enviado al banco"].indexOf(l.estado); return `<span class="${k < at ? "ok" : k === at ? "on" : ""}">${k < at ? icon("check") : ""}${esc(p)}</span>`; }).join("")}<span class="mut" style="border:0;font-size:12.5px">Siguiente: <b>${esc(pasoTxt(l))}</b> · preparó ${esc(l.prepara)}</span></div>
                ${l.estado === "Por aprobar" ? `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end">
                    <button class="btn" data-aver="${i}">${icon("eye")}Ver detalle</button><button class="btn" data-adev="${i}">${icon("x")}Devolver</button><button class="btn pri" data-afir="${i}">${icon("shield")}Firmar</button></div>`
                  : `<div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:14px;align-items:start">
                <div><div class="cob-sec" style="margin-top:0">Vista previa del archivo · ${esc(l.archivo ? l.archivo.nombre : nombreArch(l))}</div>
                  <pre class="cob-txt">${esc(archivoBN(l).join("\n"))}</pre></div>
                <div>${validarArchivo(l).map(x => `<div class="cob-chk ${x[1] ? "ok" : "cr"}">${icon(x[1] ? "check" : "x")}<span>${esc(x[0])}</span></div>`).join("")}
                  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">
                    <button class="btn" data-aver="${i}">${icon("eye")}Detalle</button>
                    <button class="btn" data-adl="${i}">${icon("download")}Descargar .txt</button>
                    ${l.estado === "Aprobado" ? `<button class="btn pri" data-agen="${i}">${icon("file")}Generar archivo</button>` : ""}
                    ${l.estado === "Archivo generado" ? `<button class="btn pri" data-aval="${i}">${icon("check")}Registrar validación del módulo local</button>` : ""}
                    ${l.estado === "Validado en módulo local" ? `<button class="btn pri" data-aenv="${i}">${icon("upload")}Marcar enviado al banco</button>` : ""}
                    ${l.estado === "Enviado al banco" ? `<button class="btn pri" data-acon="${i}">${icon("check")}Registrar respuesta y confirmar pago</button>` : ""}
                  </div></div></div>`}`
            });
          }).join("") : card({ body: empty("bank", "Nada pendiente", "Cuando Proveeduría prepare un lote o Nómina envíe una planilla aprobada, aparece aquí para firmar.") })}
            ${nota("Flujo del Banco Nacional levantado en la sesión 1: el archivo se analiza en el <b>módulo local</b> del banco, que valida oficina, cuenta y campos y devuelve una llave de prueba; luego se sube en «Envío de archivo» de la banca en línea y el banco responde «recibido». Planilla y proveedores usan el mismo formato, cada lote en su propio archivo. Si el BN expone un servicio, la validación se hace desde aquí (INT-004).", "bank")}</div>`;
        },
        wire(v) {
          const L = A._arch;
          $$("[data-adl]", v).forEach(b => b.addEventListener("click", () => { const l = L[+b.dataset.adl]; descargar((l.archivo ? l.archivo.nombre : nombreArch(l)), archivoBN(l).join("\r\n") + "\r\n"); }));
          $$("[data-agen]", v).forEach(b => b.addEventListener("click", () => {
            const l = L[+b.dataset.agen];
            if (validarArchivo(l).some(x => !x[1])) return toast("El archivo no pasa la validación", "Corrija lo marcado en rojo antes de generarlo.", "cr");
            l.estado = "Archivo generado"; l.archivo = { nombre: nombreArch(l), generado: D.ahora() };
            V.anotar("Generó archivo de pago al banco", l.cons + " · " + l.items.length + " transferencias · " + c(netoLote(l)), persona(reglaDe(l).genera), S.locId, "Alta");
            toast("Archivo generado", "Descárguelo y páselo por el módulo local del Banco Nacional (" + persona(reglaDe(l).genera) + ").", "ok"); A.refresh();
          }));
          $$("[data-aval]", v).forEach(b => b.addEventListener("click", () => {
            const l = L[+b.dataset.aval];
            openSheet({
              title: "Validación del módulo local", sub: l.archivo.nombre,
              body: fld("Llave de prueba que devolvió el módulo local", inp("tkK", "", 'placeholder="p. ej. 4B2C-91FE" maxlength="12"'), "tkK", "El módulo local reescribe los dígitos de control del archivo con esta llave."),
              footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="tkOk">Registrar</button>`,
              after(el) { cerrar(el); $("#tkOk", el).addEventListener("click", () => { const k = $("#tkK", el).value.trim(); if (!k) return toast("Escriba la llave", "", "cr"); l.archivo.testKey = k.toUpperCase(); l.estado = "Validado en módulo local"; anotar("Registró validación del módulo local BN", l.cons + " · " + k, "Media"); closeSheet(); A.refresh(); }); }
            });
          }));
          $$("[data-aenv]", v).forEach(b => b.addEventListener("click", () => { const l = L[+b.dataset.aenv]; l.archivo.enviado = D.ahora(); l.estado = "Enviado al banco"; V.anotar("Envió archivo al Banco Nacional", l.cons, persona(reglaDe(l).sube), S.locId, "Alta"); toast("Marcado como enviado", "Cuando el banco responda «recibido», registre la respuesta.", "in"); A.refresh(); }));
          $$("[data-acon]", v).forEach(b => b.addEventListener("click", () => confirmarLote(L[+b.dataset.acon])));
          $$("[data-afir]", v).forEach(b => b.addEventListener("click", () => firmarLote(L[+b.dataset.afir])));
          $$("[data-adev]", v).forEach(b => b.addEventListener("click", () => devolverLote(L[+b.dataset.adev])));
          $$("[data-aver]", v).forEach(b => b.addEventListener("click", () => verLote(L[+b.dataset.aver])));
          onSeg(v, "pbo", x => { pbOrigen = x; A.refresh(); });
        }
      },
      {
        id: "historial", t: "Historial", sub: "Todos los lotes, pagados, devueltos y en proceso",
        render(v) {
          const L = LOTES.slice().reverse();
          A._hist = L;
          v.innerHTML = `<div class="wrap">${tablaLotes(L, true)}</div>`;
        },
        wire(v) { $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => verLote(A._hist[+tr.dataset.i]))); }
      },
      {
        id: "reglas", t: "Firmas y responsables", sub: "Parámetros por origen: cuántas firmas, quiénes firman, quién genera el archivo y quién lo sube",
        render(v) {
          v.innerHTML = `<div class="wrap"><div class="grid g2" style="align-items:start">
            ${Object.keys(REGLAS_PAGO).map(o => { const r = REGLAS_PAGO[o]; return card({
            title: "Pagos de " + o.toLowerCase(), chip: tag(r.n + " firma" + (r.n === 1 ? "" : "s"), "ac", "shield"),
            body: `${fld("Firmas requeridas", sel("rgN" + o, [[1, "1 firma"], [2, "2 firmas"], [3, "3 firmas"]], r.n), "rgN" + o)}
              <div class="cob-sec">Pueden firmar</div>
              ${FIRMANTES.map(f => `<label class="rc"><input type="checkbox" data-rgf="${o}" value="${esc(f.nom)}" ${r.firmantes.indexOf(f.nom) >= 0 ? "checked" : ""}><span><b>${esc(f.nom)}</b><span>${esc(f.cargo)}${f.limite ? " · hasta " + c(f.limite) + " por lote" : " · sin límite"}</span></span></label>`).join("")}
              ${g2(fld("Genera el archivo y lo valida", sel("rgG" + o, RESPONSABLES, r.genera), "rgG" + o) + fld("Lo sube al banco", sel("rgS" + o, RESPONSABLES, r.sube), "rgS" + o))}
              ${fld("Concepto en cada línea", inp("rgC" + o, r.concepto, 'maxlength="30"'), "rgC" + o)}`
          }); }).join("")}
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn pri" id="rgOk">${icon("check")}Guardar reglas</button></div>
          ${nota("Hoy la revisión la hace una persona adicional (el contador) y la firma es en papel. El sistema la vuelve firma con clave y bitácora, con la cantidad y las personas como parámetro. Quien preparó el lote nunca firma. Que la misma persona firme y suba el archivo es posible por configuración; el auditor recomienda separarlo cuando haya personal.", "shield")}</div>`;
        },
        wire(v) {
          $("#rgOk", v).addEventListener("click", () => {
            for (const o of Object.keys(REGLAS_PAGO)) {
              const n = +$("#rgN" + o, v).value, f = $$(`[data-rgf="${o}"]`, v).filter(x => x.checked).map(x => x.value);
              if (f.length < n) return toast("Faltan firmantes en " + o.toLowerCase(), "Marque al menos " + n + " personas para " + n + " firmas.", "cr");
            }
            Object.keys(REGLAS_PAGO).forEach(o => {
              const r = REGLAS_PAGO[o], antes = r.n + " firmas · " + r.firmantes.join(", ");
              r.n = +$("#rgN" + o, v).value; r.firmantes = $$(`[data-rgf="${o}"]`, v).filter(x => x.checked).map(x => x.value);
              r.genera = $("#rgG" + o, v).value; r.sube = $("#rgS" + o, v).value; r.concepto = $("#rgC" + o, v).value.trim() || r.concepto;
              anotar("Cambió reglas de pago al banco", "Pagos de " + o.toLowerCase(), "Alta", antes, r.n + " firmas · " + r.firmantes.join(", "));
            });
            LOTES.filter(l => l.estado === "Por aprobar" && l.firmas.length >= reglaDe(l).n).forEach(l => { l.estado = "Aprobado"; });
            toast("Reglas guardadas", "Aplican a los lotes que todavía esperan firma.", "ok"); A.refresh();
          });
        }
      },
      {
        id: "cuentas", t: "Cuentas de proveedores", sub: "La cuenta sale de la ficha; cambiarla exige respaldo y la aprobación de otra persona",
        badge: () => { const n = CAMBIOS_CTA.filter(x => x.estado === "Por aprobar").length; return { n, k: "wa", l: n + " cambios por aprobar" }; },
        actions: () => `<button class="btn" id="ccNuevo">${icon("clip")}Solicitar cambio de cuenta</button>`,
        render(v) {
          v.innerHTML = `<div class="wrap">
            ${CAMBIOS_CTA.filter(x => x.estado === "Por aprobar").map(x => `<div class="stepbar wa"><div class="sbt"><b>Cambio de cuenta de ${esc(provNom(x.provId))} por aprobar</b><span>${esc(x.antes)} → ${esc(x.nueva)} · solicitó ${esc(x.solicita)} · ${esc(x.respaldo)} · ${esc(x.verificado)}. Mientras tanto, el proveedor no entra al archivo.</span></div><div class="sba"><button class="btn sm" data-ccr="${esc(x.id)}">Rechazar</button><button class="btn sm pri" data-cca="${esc(x.id)}">Aprobar</button></div></div>`).join("")}
            ${card({
            title: "Cuentas bancarias", body: table({
              cols: [
                { t: "Proveedor", fmt: p => `<b>${esc(p.nom)}</b><span class="sub">${esc(p.ced)}</span>` },
                { t: "IBAN", cls: "mono", fmt: p => esc(p.cuenta) },
                { t: "Banco", fmt: p => esc(validaIban(p.cuenta).banco || "—") },
                { t: "Validación", fmt: p => { const x = validaIban(p.cuenta); return x.ok ? tag("Válida", "ok", "check") : `${tag("Inválida", "cr", "x")}<span class="sub">${esc(x.msg)}</span>`; } },
                { t: "Estado", fmt: p => CAMBIOS_CTA.some(x => x.estado === "Por aprobar" && x.provId === p.id) ? tag("Cambio pendiente · bloqueada", "wa", "lock") : tag("Activa", "mu") }
              ], rows: D.proveedores
            })
          })}
            ${nota("Un cambio de cuenta es la vía más común de fraude en pagos: se exige carta firmada del proveedor, llamada de verificación al contacto que ya estaba registrado (no al que viene en la carta) y la aprobación de una persona distinta a quien lo solicitó.", "shield")}</div>`;
        },
        wire(v) {
          const nb = $("#ccNuevo"); if (nb) nb.addEventListener("click", cambioCuentaSheet);
          $$("[data-cca]", v).forEach(b => b.addEventListener("click", () => resolverCambio(b.dataset.cca, true)));
          $$("[data-ccr]", v).forEach(b => b.addEventListener("click", () => resolverCambio(b.dataset.ccr, false)));
        }
      },
      {
        id: "formato", t: "Estructura del archivo", sub: "Formato de transferencias del Banco Nacional: el mismo para proveedores y planilla",
        render(v) {
          const campos = [
            ["1 · Encabezado", "Tipo de línea (1) · oficina BN (3) · tipo de cuenta, 100 = corriente (3) · moneda, 01 = colones (2) · cuenta de la empresa (6) · fecha AAAAMMDD (8) · consecutivo (6) · monto total en céntimos (15) · concepto (30)"],
            ["2 · Débito", "Tipo (2) · oficina · tipo de cuenta · moneda · cuenta de la empresa · consecutivo · monto total · concepto"],
            ["3 · Crédito (uno por beneficiario)", "Tipo (3) · IBAN o cuenta cliente del beneficiario (22) · cédula (12) · monto en céntimos (15) · consecutivo de línea (6) · concepto, «PAGO PROGRAMADO» o «SALARIO» (30) · nombre (30)"],
            ["4 · Cierre", "Tipo (4) · cantidad de créditos (5) · total de débitos (15) · total de créditos (15)"]
          ];
          v.innerHTML = `<div class="wrap">${card({ title: "Líneas del archivo", body: table({ cols: [{ t: "Línea", fmt: r => `<b>${esc(r[0])}</b>` }, { t: "Campos (largo)", fmt: r => `<span style="font-size:12.5px">${esc(r[1])}</span>` }], rows: campos }) })}
            ${card({ title: "Cuenta de la empresa", body: kvs([["Oficina", EMPRESA_BN.oficina], ["Tipo de cuenta", EMPRESA_BN.tipo + " · corriente"], ["Moneda", EMPRESA_BN.moneda + " · colones"], ["Cuenta", EMPRESA_BN.cuenta], ["IBAN", EMPRESA_BN.iban], ["Cuenta contable", "1-01-02-001 · Banco Nacional cta. corriente"]]) })}
            ${nota("Estructura tomada del archivo que mostró tesorería en la sesión 1. Las posiciones exactas se confirman con el instructivo oficial del Banco Nacional (acuerdo A-07) antes de producción; el archivo de planilla (CXP-003) usa el mismo formato.", "alert", "wa")}</div>`;
        }
      }
    ]
  });
  function confirmarLote(l) {
    const tot = netoLote(l), desc = l.items.reduce((s, it) => s + it.desc, 0), prov = l.origen !== "Planilla";
    const det = prov ? [{ cta: "2-01-01-001", debe: tot + desc, haber: 0 }, { cta: "5-01-02-001", debe: 0, haber: desc }, { cta: "1-01-02-001", debe: 0, haber: tot }]
      : [{ cta: "2-01-03-002", debe: tot, haber: 0, nota: "salarios netos de " + l.concepto }, { cta: "1-01-02-001", debe: 0, haber: tot }];
    openSheet({
      wide: true, title: "Respuesta del banco · " + l.cons, sub: l.archivo.nombre + " · llave " + l.archivo.testKey,
      body: `${fld("Respuesta", sel("rbR", ["Recibido · todas las transferencias aceptadas", "Recibido con rechazos"]), "rbR")}
        ${asientoBox(det, "Asiento del pago", prov ? "rebaja el saldo de cada factura y del proveedor" : "cancela los salarios por pagar que deja el asiento de la planilla")}
        ${nota(prov ? "Al confirmar, cada proveedor recibe el aviso de pago por correo con el detalle de las facturas canceladas." : "Al confirmar, la planilla queda pagada en Nómina y cada colaborador recibe su colilla por correo y WhatsApp.", "mail")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="rbOk">${icon("check")}Confirmar pago</button>`,
      after(el) {
        cerrar(el);
        $("#rbOk", el).addEventListener("click", () => {
          if (!periodoOk()) return;
          let a;
          try { a = D.asentar(D.ahora(), l.cons, (prov ? "Pago a proveedores " : "Pago de ") + (prov ? l.cons : l.concepto) + " · " + l.items.length + " transferencias", det.filter(x => x.debe || x.haber)); } catch (e) { return toast("No se confirmó", e.message, "cr"); }
          a.regla = prov ? "Pagos a proveedores" : "Pago de planilla";
          const idx = {}; if (prov) docsCxP().forEach(o => idx[o.id] = o);
          l.items.forEach(it => {
            it.docs.forEach(d => { const o = idx[d.id]; if (!o) return; o.src[o.key] -= d.monto; delete o.src.enLote; PAGOS.push({ fecha: D.ahora(), provId: it.provId, doc: d.doc, monto: d.monto - d.desc, desc: d.desc, lote: l.cons }); });
            it.ncs.forEach(d => { const o = idx[d.id]; if (!o) return; o.src[o.key] += d.monto; delete o.src.enLote; });
            if (it.provId) D.provById[it.provId].saldo -= it.bruto - it.nc;
          });
          l.asiento = a.id; l.estado = "Pagado"; l.archivo.aceptado = D.ahora();
          if (/rechazos/.test($("#rbR", el).value)) l.archivo.rechazos = 1;
          if (l.alConfirmar) { try { l.alConfirmar(a); } catch (e) { /* el origen se actualiza solo al refrescar */ } }
          V.anotar(prov ? "Confirmó pago a proveedores" : "Confirmó pago de planilla", l.cons + " · " + c(tot) + " · asiento " + a.id, persona(reglaDe(l).sube), S.locId, "Alta");
          closeSheet(); toast("Pago confirmado · " + a.id, prov ? l.items.length + " proveedores avisados. Los saldos ya bajaron en el auxiliar y en el mayor." : l.concepto + " pagada: Nómina ya la ve como pagada.", "ok"); A.refresh();
        });
      }
    });
  }
  /* otro módulo envía un lote a la bandeja: Nómina manda la corrida aprobada */
  function enviarLote(o) {
    lpSeq++;
    const items = o.items.map(it => Object.assign({ docs: [], ncs: [], nc: 0, desc: 0, bruto: it.neto }, it));
    const l = { cons: "LP-2026-00" + lpSeq, fecha: D.ahora(), fechaPago: o.fechaPago && o.fechaPago >= new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate()) ? o.fechaPago : HOY,
      concepto: o.concepto, origen: o.origen, prepara: o.prepara || "—", items, n: items.length, total: 0, desc: 0, estado: "Por aprobar", firmas: [], archivo: null,
      ref: o.ref, alConfirmar: o.alConfirmar, alDevolver: o.alDevolver };
    l.total = netoLote(l);
    LOTES.push(l);
    V.anotar("Envió lote a Pagos al banco", l.cons + " · " + o.origen + " · " + items.length + " transferencias · " + c(l.total), l.prepara, S.locId, "Alta");
    return l;
  }
  const loteDe = ref => LOTES.filter(l => l.ref === ref).slice(-1)[0] || null;
  function cambioCuentaSheet() {
    openSheet({
      title: "Solicitar cambio de cuenta", sub: "Lo aprueba una persona distinta",
      body: `${fld("Proveedor", busProv("ccP", ""), "ccP")}
        ${fld("Nueva cuenta IBAN", inp("ccI", "", 'placeholder="CR + 20 dígitos" maxlength="26"'), "ccI")}<div id="ccV" class="mut" style="font-size:12px;margin:-4px 0 8px"></div>
        ${fld("Respaldo", sel("ccR", ["Carta firmada por el representante legal (PDF)", "Certificación de cuenta emitida por el banco"]), "ccR")}
        <label class="rc"><input type="checkbox" id="ccL"><span><b>Verifiqué por teléfono con el contacto ya registrado</b><span>No con el teléfono que viene en la carta</span></span></label>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="ccOk">Enviar a aprobación</button>`,
      after(el) {
        cerrar(el);
        $("#ccI", el).addEventListener("input", e => { const x = validaIban(e.target.value); $("#ccV", el).innerHTML = x.ok ? `<span style="color:var(--ok)">${icon("check")} ${esc(x.banco)} · IBAN válido</span>` : `<span style="color:var(--crit)">${esc(x.msg)}</span>`; });
        $("#ccOk", el).addEventListener("click", () => {
          const x = validaIban($("#ccI", el).value); if (!x.ok) return toast("IBAN inválido", x.msg, "cr");
          const p = D.provById[$("#ccP", el).value];
          if (!p) return toast("Elija el proveedor", "Escriba el nombre o la cédula y elija de la lista.", "cr");
          CAMBIOS_CTA.unshift({ id: "CC-0" + (20 + CAMBIOS_CTA.length), fecha: D.ahora(), provId: p.id, antes: p.cuenta, nueva: $("#ccI", el).value.replace(/\s/g, "").toUpperCase(), solicita: quien(), respaldo: $("#ccR", el).value, verificado: $("#ccL", el).checked ? "Llamada de verificación hecha" : "Llamada de verificación pendiente", estado: "Por aprobar" });
          anotar("Solicitó cambio de cuenta de proveedor", p.nom, "Alta"); closeSheet(); toast("Cambio enviado a aprobación", "El proveedor queda fuera del archivo hasta que se apruebe.", "wa"); A.refresh();
        });
      }
    });
  }
  function resolverCambio(id, ok) {
    const x = CAMBIOS_CTA.find(k => k.id === id);
    openSheet({
      title: (ok ? "Aprobar" : "Rechazar") + " cambio de cuenta", sub: provNom(x.provId) + " · " + x.nueva,
      body: firmaCampos(["Adrián Vindas · Gerencia", "Sonia Calderón · Contabilidad", "Álvaro Cordero · Subgerencia"], "ccQ"),
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="crOk">${ok ? "Aprobar" : "Rechazar"}</button>`,
      after(el) {
        cerrar(el);
        $("#crOk", el).addEventListener("click", () => {
          if (!$("#ccQK", el).value) return toast("Falta la clave", "", "cr");
          const a = $("#ccQ", el).value.split(" · ")[0];
          if (x.solicita.indexOf(a.split(" ")[0]) === 0) return toast("Quien solicitó no aprueba", "", "cr");
          x.estado = ok ? "Aprobado" : "Rechazado";
          if (ok) { const p = D.provById[x.provId]; V.anotar("Aprobó cambio de cuenta de proveedor", p.nom, a, S.locId, "Alta", p.cuenta, x.nueva); p.cuenta = x.nueva; }
          else V.anotar("Rechazó cambio de cuenta de proveedor", provNom(x.provId), a, S.locId, "Alta");
          closeSheet(); toast(ok ? "Cuenta actualizada" : "Cambio rechazado", "", ok ? "ok" : "wa"); A.refresh();
        });
      }
    });
  }

  /* ═════════════════════════════════════════════════════════════
     CxP · ESTADO DE CUENTA DEL PROVEEDOR (CXP-007)
     Saldo, facturas, pagos y notas aplicadas: la base del análisis de
     pagos de cada semana.
     ═════════════════════════════════════════════════════════════ */
  let epSel = "P1";
  A.screen("cob-estado-prov", {
    title: "Estado de cuenta del proveedor",
    sub: () => "Facturas, pagos y notas aplicadas · el saldo es el mismo del auxiliar y del mayor",
    extra: () => `<button class="btn" id="epXls">${icon("download")}Exportar a Excel</button><button class="btn" id="epMail">${icon("mail")}Enviar al proveedor</button>`,
    render(v, arg) {
      if (arg && D.provById[arg]) epSel = arg;
      const p = D.provById[epSel] || D.proveedores[0];
      const all = docsCxP().filter(o => o.provId === p.id);
      const abiertosP = all.filter(o => r0(o.saldo) !== 0);
      const mov = [];
      all.forEach(o => {
        mov.push({ f: o.fecha, doc: o.doc, t: o.tipo === "Nota de crédito" ? "Nota de crédito" : o.origen === "Compra" ? "Factura · " + o.oc : o.origen === "Migrada" ? "Factura (migrada)" : "Factura", cargo: o.monto > 0 ? o.monto : 0, abono: o.monto < 0 ? -o.monto : 0, ref: o.conc });
        const pag = PAGOS.filter(x => x.doc === o.doc && x.provId === p.id);
        pag.forEach(x => mov.push({ f: x.fecha, doc: x.lote, t: "Pago por transferencia", cargo: 0, abono: x.monto, ref: x.desc ? "pronto pago " + grp(x.desc) : "archivo BN" }));
        pag.filter(x => x.desc).forEach(x => mov.push({ f: x.fecha, doc: x.lote, t: "Descuento por pronto pago", cargo: 0, abono: x.desc, ref: "" }));
        const aplicado = o.monto - o.saldo - pag.reduce((s, x) => s + x.monto + x.desc, 0);
        if (Math.abs(aplicado) >= 1) mov.push({ f: masDias(o.fecha, 5), doc: "—", t: o.monto < 0 ? "Nota aplicada a facturas" : o.origen === "Migrada" ? "Abonos del sistema anterior" : "Nota de crédito aplicada", cargo: aplicado < 0 ? -aplicado : 0, abono: aplicado > 0 ? aplicado : 0, ref: o.origen === "Migrada" ? "migración al 31 ago" : "" });
      });
      mov.sort((a, b) => a.f - b.f);
      let s = 0; mov.forEach(m => { s += m.cargo - m.abono; m.saldo = s; });
      const venc = abiertosP.filter(o => o.saldo > 0 && o.dias > 0), porV = abiertosP.filter(o => o.saldo > 0 && o.dias <= 0);
      const nc = abiertosP.filter(o => o.saldo < 0);
      const tr = [["Por vencer", o => o.dias <= 0], ["1 a 30", o => o.dias > 0 && o.dias <= 30], ["31 a 60", o => o.dias > 30 && o.dias <= 60], ["Más de 60", o => o.dias > 60]];
      const neg = PRONTO[p.id];
      const cuadra = r0(auxProv(p.id)) === r0(p.saldo);
      v.innerHTML = `<div class="split ancho">
        ${card({
        body: `${filtroCaja("epQ", "Buscar proveedor o cédula")}<div class="mut" style="font-size:12px;margin:8px 0 6px">Ordenados por saldo</div>
          <div class="mitems">${D.proveedores.slice().sort((a, b) => auxProv(b.id) - auxProv(a.id)).map(x => `
            <button class="mitem" data-ep="${x.id}" aria-selected="${x.id === p.id}">
              <span style="flex:1;min-width:0"><span class="itd">${esc(x.nom)}</span><span class="itc">${esc(x.ced)} · ${esc(x.linea)}</span></span>
              ${tag(c(r0(auxProv(x.id))), docsCxP().some(o => o.provId === x.id && o.saldo > 0 && o.dias > 0) ? "wa" : "mu")}</button>`).join("")}</div>`
      })}
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
          ${card({
        body: `<h3 style="font-size:19px">${esc(p.nom)}</h3>
            <div class="mut num" style="font-size:12px;margin-top:2px">${esc(p.ced)} · ${esc(p.linea)} · ${esc(p.cuenta)}</div>
            <div class="ficha" style="margin:15px -17px -16px;border-top:1px solid var(--hair-2)">
              ${fichaCell("Saldo", c(r0(s)))}${fichaCell("Vencido", c(venc.reduce((a, o) => a + o.saldo, 0)), venc.length ? "var(--crit)" : "")}
              ${fichaCell("Por vencer", c(porV.reduce((a, o) => a + o.saldo, 0)))}${fichaCell("NC por aplicar", c(-nc.reduce((a, o) => a + o.saldo, 0)), nc.length ? "var(--accent)" : "")}
              ${fichaCell("Negociación", `<span style="font-size:13px">${p.plazo} días${neg ? " · " + dec(neg.pct, neg.pct % 1 ? 1 : 0) + " % a " + neg.dias + " días" : ""}</span>`)}
            </div>`
      })}
          <div class="card"><div class="aging" style="grid-template-columns:repeat(4,1fr)">${tr.map(t => { const x = abiertosP.filter(o => o.saldo > 0 && t[1](o)); return `<div class="ag"><div class="agv" style="color:${t[0] === "Por vencer" ? "var(--ok)" : t[0] === "Más de 60" ? "var(--crit)" : "var(--warn)"}">${c(x.reduce((a, o) => a + o.saldo, 0))}</div><div class="agl">${esc(t[0])} · ${x.length} doc.</div></div>`; }).join("")}</div></div>
          ${card({
        title: "Movimientos", hint: "con saldo corrido",
        body: table({
          h: "calc(100dvh - 520px)",
          cols: [
            { t: "Fecha", cls: "mono", fmt: m => fecha(m.f) }, { t: "Documento", cls: "mono", fmt: m => esc(m.doc) },
            { t: "Movimiento", fmt: m => `${esc(m.t)}${m.ref ? `<span class="sub">${esc(m.ref)}</span>` : ""}` },
            { t: "Cargo", r: true, cls: "mono", fmt: m => (m.cargo ? grp(m.cargo) : '<span class="dim">—</span>') },
            { t: "Abono", r: true, cls: "mono", fmt: m => (m.abono ? grp(m.abono) : '<span class="dim">—</span>') },
            { t: "Saldo", r: true, cls: "mono", fmt: m => `<b>${m.saldo < 0 ? "−" : ""}${grp(m.saldo)}</b>` }
          ], rows: mov, foot: [{ v: "<b>Saldo con el proveedor</b>", span: 5 }, { v: `<b>${grp(s)}</b>`, r: true, cls: "mono" }]
        })
      })}
          <div class="cob-cuadre ${cuadra ? "" : "cr"}">${icon(cuadra ? "check" : "alert")}<span>Estado de cuenta <b class="num">${c(r0(s))}</b> · saldo del proveedor en el auxiliar <b class="num">${c(r0(p.saldo))}</b> · ${cuadra ? "<b>cuadra</b>" : `<b style="color:var(--crit)">diferencia ${c(r0(p.saldo - s))}</b>`}</span><button class="btn sm" data-ir="cxp">Programar pago</button></div>
        </div></div>`;
    },
    wire(v) {
      A.wireIr(v); wireFiltro(v, "epQ", ".mitems .mitem");
      $$("[data-ep]", v).forEach(b => b.addEventListener("click", () => { epSel = b.dataset.ep; A.refresh(); }));
      const x = $("#epXls"), m = $("#epMail");
      if (x) x.addEventListener("click", () => toast("Exportado a Excel", "Estado de cuenta de " + provNom(epSel) + " con los mismos filtros de la pantalla (REP-004).", "ok"));
      if (m) m.addEventListener("click", () => toast("Enviado", "Estado de cuenta en PDF al correo de cobros de " + provNom(epSel) + " para conciliar saldos.", "ok"));
    }
  });

  /* ═════════════════════════════════════════════════════════════
     CxP · NOTAS DE CRÉDITO Y DÉBITO A PROVEEDOR (CXP-006)
     La nota de crédito electrónica la emite el proveedor (llega con su
     XML y su clave); la de débito es interna: el reclamo que la empresa
     le hace mientras llega esa nota de crédito.
     ═════════════════════════════════════════════════════════════ */
  const CONCEPTOS_NP = [
    { id: "Descuento", cta: "5-01-02-001", iva: true, post: true, d: "Descuento comercial posterior a la compra" },
    { id: "Devolución", cta: "1-01-03-005", iva: true, post: false, d: "Mercadería devuelta (COM-006): Compras la despacha y rebaja el kardex; aquí se concilia la NC" },
    { id: "Financiera", cta: "5-01-02-001", iva: false, post: true, d: "Pronto pago o ajuste financiero" },
    { id: "Por ingreso", cta: "5-01-02-001", iva: true, post: true, d: "Bonificación por volumen de compra (rappel)" },
    { id: "Publicidad", cta: "6-01-04-001", iva: true, post: true, d: "Aporte del proveedor a publicidad", ojo: "Si es un servicio que presta la empresa, lo correcto es que la empresa emita factura con IVA." },
    { id: "Representación", cta: "4-02-01-001", iva: true, post: true, d: "Comisión por representar la marca", ojo: "Igual que publicidad: si la empresa presta el servicio, emite factura." },
    { id: "Autopago", cta: "1-01-03-005", iva: false, post: false, d: "Compensación con lo que el proveedor le debe a la empresa", ojo: "Tratamiento por confirmar con Contabilidad." },
    { id: "IVA incluido", cta: "1-01-05-001", iva: true, post: true, d: "Ajuste del IVA facturado de más" }
  ];
  let npSeq = 40;
  (function sembrarNotas() {
    D.recibidos.filter(r => /crédito/.test(r.tipo)).forEach(r => NOTAS.push({ id: "NR-" + r.id, cons: "NC-" + r.clave.slice(-8), tipo: "NC", origenXml: true, provId: r.provId, fecha: r.fecha, concepto: "Según XML", total: r.monto, iva: r.iva, estado: /Aceptado/.test(r.estado) ? "Aceptada" : r.estado, ref: r, clave: r.clave }));
    const oc = D.compras.find(o => o.estado === "Recibida parcial");
    NOTAS.push({ id: "ND-0041", cons: "ND-2026-000041", tipo: "ND", provId: "P4", fecha: masDias(HOY, -4), concepto: "Devolución", total: 486200, iva: D.ivaIncluido(486200, 13), estado: "Emitida · esperando NC del proveedor", nota: "12 láminas HG #26 dañadas en la descarga", refDoc: "OC-2026-004404" });
    NOTAS.push({ id: "ND-0042", cons: "ND-2026-000042", tipo: "ND", provId: oc ? oc.provId : "P3", fecha: masDias(HOY, -1), concepto: "Devolución", total: 312750, iva: D.ivaIncluido(312750, 13), estado: "Borrador", nota: "Faltante en la recepción parcial", refDoc: oc ? oc.cons : "" });
  })();
  const detNota = (n, cto) => {
    const base = cto.iva && n.iva ? n.total - n.iva : n.total, iva = cto.iva ? n.iva || 0 : 0;
    if (n.tipo === "ND") return [{ cta: "1-01-03-005", debe: base, haber: 0, nota: "reclamo al proveedor" }, { cta: "1-01-04-001", debe: 0, haber: base, nota: "sale del inventario al despachar la devolución" }];
    const det = [{ cta: "2-01-01-001", debe: n.total, haber: 0 }];
    if (cto.id === "IVA incluido") det.push({ cta: "1-01-05-001", debe: 0, haber: n.total });
    else { det.push({ cta: cto.cta, debe: 0, haber: base }); if (iva) det.push({ cta: "1-01-05-001", debe: 0, haber: iva, nota: "reversa del crédito fiscal" }); }
    return det;
  };
  function validaClave(k, p) {
    const x = String(k || "").replace(/\D/g, "");
    if (x.length !== 50) return { ok: false, msg: "La clave tiene " + x.length + " dígitos; deben ser 50." };
    if (x.slice(0, 3) !== "506") return { ok: false, msg: "Debe empezar con 506 (Costa Rica)." };
    const ced = x.slice(9, 21), cedP = String(p.ced).replace(/\D/g, "").padStart(12, "0");
    if (ced !== cedP) return { ok: false, msg: "La cédula de la clave (" + ced.replace(/^0+/, "") + ") no es la de " + p.nom + "." };
    if (x.slice(29, 31) !== "03") return { ok: false, msg: "El tipo de comprobante en la clave es " + x.slice(29, 31) + "; una nota de crédito es 03." };
    return { ok: true, partes: [["País", "506"], ["Fecha", x.slice(3, 5) + "/" + x.slice(5, 7) + "/" + x.slice(7, 9)], ["Cédula del emisor", ced.replace(/^0+/, "")], ["Consecutivo", x.slice(21, 41)], ["Tipo", "03 · Nota de crédito"], ["Situación", x[41] === "1" ? "Normal" : x[41] === "2" ? "Contingencia" : "Sin internet"], ["Código de seguridad", x.slice(42)]] };
  }
  const claveEjemplo = p => "506" + pad(HOY.getDate(), 2) + pad(HOY.getMonth() + 1, 2) + String(HOY.getFullYear()).slice(-2) + String(p.ced).replace(/\D/g, "").padStart(12, "0") + "00100001" + "03" + pad(4500 + npSeq, 10) + "1" + "40718253";

  A.workspace("cob-notas-prov", {
    title: "Notas de crédito y débito a proveedor",
    sub: "Conceptos configurables, clave de Hacienda validada y aplicación contra facturas",
    tabs: [
      {
        id: "notas", t: "Notas", sub: "Las de crédito llegan del proveedor con su XML; las de débito son el reclamo interno",
        actions: () => `<button class="btn" id="npND">${icon("clip")}Nota de débito (reclamo)</button><button class="btn pri" id="npNC">${icon("plus")}Registrar nota de crédito</button>`,
        render(v) {
          const L = NOTAS.slice().sort((a, b) => b.fecha - a.fecha);
          A._np = L;
          const pend = docsCxP().filter(o => o.tipo === "Nota de crédito" && o.saldo < 0);
          v.innerHTML = `<div class="wrap">
            <div class="grid g4">
              ${stat("NC por aplicar", c(-pend.reduce((s, o) => s + o.saldo, 0)), { txt: pend.length + " notas · se aplican solas en el próximo lote" }, "var(--accent)")}
              ${stat("Reclamos abiertos", c(NOTAS.filter(n => n.tipo === "ND" && !/Cerrada/.test(n.estado)).reduce((s, n) => s + n.total, 0)), { txt: NOTAS.filter(n => n.tipo === "ND" && !/Cerrada/.test(n.estado)).length + " notas de débito esperando la NC" }, "var(--warn)")}
              ${stat("NC recibidas por XML", grp(NOTAS.filter(n => n.origenXml).length), { txt: "aceptadas en Facturación electrónica" })}
              ${stat("Conceptos", grp(CONCEPTOS_NP.length), { txt: "cada uno con su cuenta contable" })}
            </div>
            ${card({
            title: "Notas", body: table({
              onRow: true,
              cols: [
                { t: "Nota", cls: "mono", fmt: n => `${esc(n.cons)}<span class="sub">${fecha(n.fecha)}</span>` },
                { t: "Tipo", fmt: n => tag(n.tipo === "NC" ? "Crédito" : "Débito", n.tipo === "NC" ? "ac" : "wa") },
                { t: "Proveedor", fmt: n => esc(provNom(n.provId)) },
                { t: "Concepto", fmt: n => `${esc(n.concepto)}${n.nota ? `<span class="sub">${esc(n.nota)}</span>` : ""}` },
                { t: "Referencia", cls: "mono", fmt: n => esc(n.refDoc || (n.clave ? "…" + n.clave.slice(-12) : "—")) },
                { t: "IVA", r: true, cls: "mono", fmt: n => grp(n.iva || 0) },
                { t: "Total", r: true, cls: "mono", fmt: n => `<b>${grp(n.total)}</b>` },
                { t: "Por aplicar", r: true, cls: "mono", fmt: n => { const s = n.origenXml ? (n.ref.saldoCxP || 0) : n.saldoCxP || 0; return s < 0 ? grp(-s) : '<span class="dim">—</span>'; } },
                { t: "Estado", fmt: n => tag(n.estado, /Aceptada|Aplicada|Registrada/.test(n.estado) ? "ok" : /Rechaz/.test(n.estado) ? "cr" : "wa") }
              ], rows: L
            })
          })}</div>`;
        },
        wire(v) {
          const a = $("#npNC"), b = $("#npND");
          if (a) a.addEventListener("click", () => notaSheet("NC"));
          if (b) b.addEventListener("click", () => notaSheet("ND"));
          $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => verNota(A._np[+tr.dataset.i])));
        }
      },
      {
        id: "conceptos", t: "Conceptos", sub: "Configurables: a qué cuenta va cada uno y si reversa IVA",
        render(v) {
          v.innerHTML = `<div class="wrap">${card({
            title: "Conceptos de notas a proveedor", body: table({
              cols: [
                { t: "Concepto", fmt: k => `<b>${esc(k.id)}</b><span class="sub">${esc(k.d)}</span>` },
                { t: "Cuenta", cls: "mono", fmt: k => `${esc(k.cta)}<span class="sub">${esc(ctaNom(k.cta))}</span>` },
                { t: "IVA", fmt: k => (k.iva ? tag("Reversa crédito fiscal", "ac") : tag("Sin IVA", "mu")) },
                { t: "Observación", fmt: k => (k.ojo ? `<span style="font-size:12.5px;color:var(--warn)">${esc(k.ojo)}</span>` : '<span class="dim">—</span>') }
              ], rows: CONCEPTOS_NP
            })
          })}
          ${nota("Cuando la mercadería todavía está en existencia, un descuento posterior rebaja su costo; si ya se vendió, rebaja el costo de ventas. La cuenta de descuentos sobre compras se liquida contra el costo de ventas al cierre. Las cuentas de cada concepto se ajustan en Contabilidad › Reglas.", "calc")}</div>`;
        }
      }
    ]
  });
  function verNota(n) {
    const cto = CONCEPTOS_NP.find(k => k.id === n.concepto) || CONCEPTOS_NP[0];
    const aplicable = n.tipo === "NC" && ((n.origenXml ? n.ref.saldoCxP : n.saldoCxP) || 0) < 0;
    const asi = n.asiento ? asientoPor(n.asiento) : n.origenXml && n.ref.asiento && !/^en /.test(n.ref.asiento) ? asientoPor(n.ref.asiento) : null;
    openSheet({
      wide: true, title: (n.tipo === "NC" ? "Nota de crédito " : "Nota de débito ") + n.cons, sub: provNom(n.provId) + " · " + n.estado,
      body: `${kvs([["Concepto", esc(n.concepto)], ["Total", c(n.total)], ["IVA", c(n.iva || 0)], ["Referencia", esc(n.refDoc || n.clave || "—")]])}
        <div style="margin-top:10px">${asi ? asientoTabla(asi.detalle, asi.id + " · " + asi.glosa) : asientoBox(detNota(n, cto), n.tipo === "ND" ? "Asiento al despachar la devolución" : "Asiento", n.tipo === "ND" ? "cuando llegue la NC electrónica se cancela el reclamo contra la cuenta por pagar" : "")}</div>
        ${n.tipo === "ND" ? nota("La nota de débito no es un comprobante electrónico: es el reclamo interno. El proveedor debe emitir su nota de crédito electrónica; al aceptarla en Facturación se cancela este reclamo y se reversa el crédito fiscal.", "info") : ""}`,
      footer: `<button class="btn" data-cerrar>Cerrar</button><div class="gap"></div>${aplicable ? `<button class="btn pri" id="npAp">${icon("swap")}Aplicar a una factura</button>` : ""}${n.tipo === "ND" && n.estado === "Borrador" ? `<button class="btn pri" id="npEm">${icon("mail")}Emitir y enviar al proveedor</button>` : ""}`,
      after(el) {
        cerrar(el);
        const ap = $("#npAp", el); if (ap) ap.addEventListener("click", () => aplicarNota(n));
        const em = $("#npEm", el); if (em) em.addEventListener("click", () => { n.estado = "Emitida · esperando NC del proveedor"; anotar("Emitió nota de débito a proveedor", n.cons + " · " + provNom(n.provId) + " · " + c(n.total), "Media"); closeSheet(); toast("Nota de débito enviada", "Compras despacha la devolución; el proveedor debe emitir su NC electrónica.", "ok"); A.refresh(); });
      }
    });
  }
  function aplicarNota(n) {
    const src = n.origenXml ? n.ref : n;
    const disp = -(src.saldoCxP || 0);
    const facs = docsCxP().filter(o => o.provId === n.provId && o.tipo === "Factura" && o.saldo > 0 && !o.src.enLote);
    if (!facs.length) return toast("Sin facturas abiertas", provNom(n.provId) + " no tiene facturas con saldo; la nota espera.", "in");
    openSheet({
      title: "Aplicar nota a factura", sub: n.cons + " · disponible " + c(disp),
      body: `${fld("Factura", sel("apF", facs.map(o => [o.id, o.doc + " · saldo " + grp(o.saldo)])), "apF")}${fld("Monto", numInp("apM", Math.min(disp, facs[0].saldo)), "apM")}
        ${nota("Compensar una nota con una factura del mismo proveedor no genera asiento: las dos están en la misma cuenta por pagar. Solo cambia el saldo de cada documento.", "swap")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="apOk">Aplicar</button>`,
      after(el) {
        cerrar(el);
        $("#apOk", el).addEventListener("click", () => {
          const o = facs.find(k => k.id === $("#apF", el).value), m = Math.min(disp, o.saldo, r0(numIn($("#apM", el).value)));
          if (m <= 0) return toast("Monto inválido", "", "cr");
          o.src[o.key] -= m; src.saldoCxP += m;
          if (src.saldoCxP >= 0) n.estado = "Aplicada";
          anotar("Aplicó nota de crédito de proveedor", n.cons + " a " + o.doc + " · " + c(m), "Media"); closeSheet(); toast("Nota aplicada", c(m) + " rebajados de " + o.doc + ".", "ok"); A.refresh();
        });
      }
    });
  }
  function notaSheet(tipo) {
    const provs = D.proveedores;
    let p = provs[0];
    openSheet({
      wide: true, title: tipo === "NC" ? "Registrar nota de crédito del proveedor" : "Nota de débito al proveedor (reclamo)",
      sub: tipo === "NC" ? "Normalmente entra sola al aceptar el XML; aquí se registra la que llegó por otro medio, con su clave de 50 dígitos" : "Documento interno mientras el proveedor emite su nota de crédito electrónica",
      body: `${g3(fld("Proveedor", busProv("npP", provs[0].id), "npP") + fld("Concepto", sel("npC", CONCEPTOS_NP.filter(k => tipo === "NC" || /Devolución|Descuento|Autopago/.test(k.id)).map(k => k.id), tipo === "NC" ? "Por ingreso" : "Devolución"), "npC") + fld("Factura referida", `<select id="npF"></select>`, "npF"))}
        ${g3(fld("Total", numInp("npT", 250000), "npT") + fld("Tarifa de IVA", sel("npI", [[13, "13 %"], [4, "4 %"], [2, "2 %"], [1, "1 %"], [0, "Exento"]], 13), "npI") + fld("IVA", `<input id="npV" class="num" style="text-align:right" disabled>`, "npV"))}
        ${tipo === "NC" ? fld("Clave numérica (50 dígitos)", inp("npK", "", 'maxlength="60" class="num"'), "npK") + `<div id="npKv"></div>` : fld("Detalle del reclamo", `<textarea id="npD" rows="2" placeholder="Qué se devuelve o reclama"></textarea>`, "npD")}
        <div id="npAs"></div><div id="npOjo"></div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="npOk">${icon("check")}${tipo === "NC" ? "Registrar" : "Guardar borrador"}</button>`,
      after(el) {
        cerrar(el);
        const upd = () => {
          p = D.provById[$("#npP", el).value] || p;
          const facs = docsCxP().filter(o => o.provId === p.id && o.tipo === "Factura");
          const fsel = $("#npF", el), cur = fsel.value;
          fsel.innerHTML = `<option value="">—</option>` + facs.map(o => `<option value="${esc(o.doc)}" ${o.doc === cur ? "selected" : ""}>${esc(o.doc)} · ${grp(o.monto)}</option>`).join("");
          const t = r0(numIn($("#npT", el).value)), tar = +$("#npI", el).value, iva = tar ? D.ivaIncluido(t, tar) : 0;
          $("#npV", el).value = grp(iva);
          const cto = CONCEPTOS_NP.find(k => k.id === $("#npC", el).value);
          $("#npAs", el).innerHTML = asientoBox(detNota({ tipo, total: t, iva }, cto), tipo === "ND" ? "Asiento al despachar la devolución" : "Asiento que se generará");
          $("#npOjo", el).innerHTML = (cto.ojo ? nota(esc(cto.ojo), "alert", "wa") : "") + (tipo === "NC" && !cto.post ? nota("Este concepto no se registra aquí: " + esc(cto.d) + ".", "info") : "");
          const kk = $("#npK", el);
          if (kk) { if (!kk.dataset.tocada) kk.value = claveEjemplo(p); const r = validaClave(kk.value, p); $("#npKv", el).innerHTML = r.ok ? `<div class="cob-clave">${r.partes.map(x => `<span><i>${esc(x[0])}</i><b class="num">${esc(x[1])}</b></span>`).join("")}</div>` : nota(esc(r.msg), "x", "cr"); }
        };
        ["npP", "npC", "npI"].forEach(id => $("#" + id, el).addEventListener("change", upd));
        $("#npT", el).addEventListener("input", upd);
        const kk = $("#npK", el); if (kk) kk.addEventListener("input", () => { kk.dataset.tocada = "1"; upd(); });
        upd();
        $("#npOk", el).addEventListener("click", () => {
          const t = r0(numIn($("#npT", el).value)), tar = +$("#npI", el).value, iva = tar ? D.ivaIncluido(t, tar) : 0;
          const cto = CONCEPTOS_NP.find(k => k.id === $("#npC", el).value);
          if (!t) return toast("Indique el total", "", "cr");
          npSeq++;
          if (tipo === "ND") {
            NOTAS.push({ id: "ND-0" + npSeq, cons: "ND-2026-0000" + npSeq, tipo: "ND", provId: p.id, fecha: D.ahora(), concepto: cto.id, total: t, iva, estado: "Borrador", nota: $("#npD", el).value, refDoc: $("#npF", el).value });
            anotar("Creó nota de débito a proveedor", p.nom + " · " + c(t), "Media"); closeSheet(); toast("Nota de débito en borrador", "Se emite al confirmar la devolución con Compras.", "ok"); A.refresh(); return;
          }
          if (!cto.post) return toast("Este concepto se concilia en otra pantalla", cto.d, "wa");
          const k = validaClave($("#npK", el).value, p); if (!k.ok) return toast("Clave inválida", k.msg, "cr");
          const clave = $("#npK", el).value.replace(/\D/g, "");
          if (NOTAS.some(n => n.clave === clave) || D.recibidos.some(r => r.clave === clave)) return toast("Nota duplicada", "Ya existe un comprobante con esa clave: los duplicados se detectan por clave, no por número.", "cr");
          if (!periodoOk()) return;
          const n = { id: "NC-0" + npSeq, cons: "NC-" + clave.slice(-8), tipo: "NC", provId: p.id, fecha: D.ahora(), concepto: cto.id, total: t, iva, estado: "Registrada", clave, refDoc: $("#npF", el).value, saldoCxP: -t };
          let a;
          try { a = D.asentar(n.fecha, n.cons, "Nota de crédito " + cto.id.toLowerCase() + " · " + p.nom, detNota(n, cto)); } catch (e) { return toast("No se registró", e.message, "cr"); }
          n.asiento = a.id; p.saldo -= t; NOTAS.push(n);
          anotar("Registró nota de crédito de proveedor", n.cons + " · " + p.nom + " · " + c(t), "Media"); closeSheet(); toast("Nota registrada · " + a.id, "Queda por aplicar: entra sola en el próximo lote de " + p.nom + ".", "ok"); A.refresh();
        });
      }
    });
  }

  /* ═════════════════════════════════════════════════════════════
     CxP · CAJA CHICA Y TARJETA EMPRESARIAL (CXP-005)
     Fondos fijos recargables para compras excepcionales: el vale se
     registra (foto por WhatsApp o factura electrónica), se liquida y
     se repone por el monto gastado.
     ═════════════════════════════════════════════════════════════ */
  const FONDOS = D.locales.filter(l => l.tipo === "tienda" || l.tipo === "cedi").map((l, i) => ({ id: "FC-" + l.id, locId: l.id, monto: l.tipo === "cedi" ? 250000 : 100000, custodio: ["Kevin Solano", "Marta Rojas", "Yendry Chacón", "Esteban Vindas", "Diego Solano", "Grettel Araya", "Josué Mora", "Dennis Fallas"][i] || "Encargado", ultima: masDias(HOY, -(i % 5) - 3) }))
    .concat([{ id: "FC-GER", locId: "L2", monto: 300000, custodio: "Adrián Vindas", ultima: masDias(HOY, -8), nom: "Gerencia" }]);
  const VALES = [];
  (function sembrarVales() {
    AU.GASTOS.filter(g => g.canal === "WhatsApp").forEach(g => VALES.push({ id: "VC-" + g.id, fondo: "FC-" + g.locId, fecha: g.fecha, desc: g.prov, monto: g.monto, cta: g.cta, comp: "Foto por WhatsApp · tiquete sin FE", fe: false, estado: g.asiento ? "Registrado" : "Por confirmar en Contabilidad", gasto: g, por: g.enviado }));
    [["FC-L1", 2, "Agua y café para la tienda", 7850, "6-01-02-003", true], ["FC-L1", 4, "Fotocopias de planos para cliente", 3200, "6-01-02-003", false], ["FC-CD", 1, "Repuesto de montacargas (urgente)", 46500, "6-01-02-005", true], ["FC-L3", 3, "Flete de taxi con mercadería", 9000, "6-01-02-001", false], ["FC-GER", 5, "Almuerzo con proveedor", 24800, "6-01-02-003", true]]
      .forEach((x, i) => VALES.push({ id: "VC-M" + (i + 1), fondo: x[0], fecha: masDias(HOY, -x[1]), desc: x[2], monto: x[3], cta: x[4], comp: x[5] ? "Factura electrónica a nombre de la empresa" : "Tiquete sin factura electrónica", fe: x[5], estado: "Registrado", por: (FONDOS.find(f => f.id === x[0]) || {}).custodio }));
  })();
  const LIQUIDACIONES = [{ id: "LQ-0087", fondo: "FC-L2", fecha: masDias(HOY, -6), vales: 7, monto: 71400, estado: "Repuesta", aprobo: "Sonia Calderón" }];
  const TARJETA = { banco: "Banco Nacional", marca: "Visa empresarial", ult: "4417", titular: "Adrián Vindas", limite: 3000000, corte: 20, pago: 5 };
  const MOV_TJ = [
    [1, "Amazon Web Services", 58400, "6-01-02-003", "Factura del exterior · sin IVA local", "Registrado"], [2, "Hotel Presidente San José", 96300, "6-01-02-003", "Factura electrónica", "Registrado"],
    [3, "Estación de servicio Delta Cartago", 42000, "6-01-02-001", "Factura electrónica", "Registrado"], [4, "Microsoft 365 Empresa", 31250, "6-01-02-003", "Factura del exterior · sin IVA local", "Registrado"],
    [6, "Restaurante La Casona", 38900, "6-01-02-003", "Sin comprobante", "Falta comprobante"], [7, "Farmacia Fischel", 12600, "", "Gasto personal", "Reintegrar"],
    [9, "Ferretería EPA (repuesto urgente)", 27450, "6-01-02-005", "Factura electrónica", "Por registrar"], [11, "Peaje Ruta 27", 2890, "6-01-02-001", "Tiquete", "Por registrar"]
  ].map((x, i) => ({ id: "TJ" + (i + 1), fecha: masDias(HOY, -x[0]), comercio: x[1], monto: x[2], cta: x[3], comp: x[4], estado: x[5] }));
  const disponibleFondo = f => f.monto - VALES.filter(v => v.fondo === f.id && v.estado !== "Repuesto").reduce((s, v) => s + v.monto, 0);
  const fondoNom = f => f.nom || locNom(f.locId);

  A.workspace("cob-cajachica", {
    title: "Caja chica y tarjeta empresarial",
    sub: "Fondos recargables por local, vales, liquidación y tarjeta de la empresa",
    tabs: [
      {
        id: "fondos", t: "Fondos", sub: "Fondo fijo por local: lo que falta en efectivo tiene que estar en vales",
        render(v) {
          A._fondos = FONDOS;
          const tot = FONDOS.reduce((s, f) => s + f.monto, 0), gast = FONDOS.reduce((s, f) => s + f.monto - disponibleFondo(f), 0);
          v.innerHTML = `<div class="wrap">
            <div class="grid g4">
              ${stat("Fondos asignados", c(tot), { txt: FONDOS.length + " fondos" })}
              ${stat("Gastado por reponer", c(gast), { txt: VALES.filter(x => x.estado !== "Repuesto").length + " vales" }, "var(--warn)")}
              ${stat("Vales sin factura electrónica", grp(VALES.filter(x => !x.fe && x.estado !== "Repuesto").length), { txt: "sin crédito fiscal de IVA" }, "var(--crit)")}
              ${stat("Tope por vale", c(50000), { txt: "más de eso va por compra normal" })}
            </div>
            ${card({
            title: "Fondos de caja chica", body: table({
              cols: [
                { t: "Fondo", fmt: f => `<b>${esc(fondoNom(f))}</b><span class="sub">${esc(f.id)}</span>` },
                { t: "Custodio", fmt: f => esc(f.custodio) },
                { t: "Monto fijo", r: true, cls: "mono", fmt: f => grp(f.monto) },
                { t: "En vales", r: true, cls: "mono", fmt: f => grp(f.monto - disponibleFondo(f)) },
                { t: "Efectivo", r: true, cls: "mono", fmt: f => `<b>${grp(disponibleFondo(f))}</b>` },
                { t: "Uso", w: "110px", fmt: f => { const u = (f.monto - disponibleFondo(f)) / f.monto * 100; return prog([{ w: u, col: u > 70 ? "var(--warn)" : "var(--accent)" }]); } },
                { t: "Última reposición", cls: "mono", fmt: f => fecha(f.ultima) },
                { t: "", r: true, fmt: (f, i) => f.monto - disponibleFondo(f) > 0 ? `<button class="btn sm" data-arq="${i}">Arqueo</button><button class="btn sm pri" data-liqf="${i}">Liquidar y reponer</button>` : `<button class="btn sm" data-arq="${i}">Arqueo</button>` }
              ], rows: FONDOS
            })
          })}
            ${card({ title: "Liquidaciones", body: table({ cols: [{ t: "Liquidación", cls: "mono", fmt: x => esc(x.id) }, { t: "Fondo", fmt: x => esc(fondoNom(FONDOS.find(f => f.id === x.fondo) || {})) }, { t: "Fecha", cls: "mono", fmt: x => fecha(x.fecha) }, { t: "Vales", r: true, cls: "mono", fmt: x => x.vales }, { t: "Monto", r: true, cls: "mono", fmt: x => grp(x.monto) }, { t: "Aprobó", fmt: x => esc(x.aprobo || "—") }, { t: "Estado", fmt: x => tag(x.estado, x.estado === "Repuesta" ? "ok" : "wa") }], rows: LIQUIDACIONES.slice().reverse() }) })}
            ${nota("El gasto se registra al confirmar cada vale (Contabilidad lo recibe con la foto o el XML). La reposición solo devuelve el efectivo al custodio desde el banco: por eso su asiento es caja contra banco y el fondo siempre suma su monto fijo entre efectivo y vales.", "info")}</div>`;
        },
        wire(v) {
          $$("[data-liqf]", v).forEach(b => b.addEventListener("click", () => liquidarFondo(A._fondos[+b.dataset.liqf])));
          $$("[data-arq]", v).forEach(b => b.addEventListener("click", () => arqueoFondo(A._fondos[+b.dataset.arq])));
        }
      },
      {
        id: "vales", t: "Vales", sub: "Cada compra con su comprobante; sin factura electrónica no hay crédito fiscal",
        actions: () => `<button class="btn pri" id="vcNuevo">${icon("plus")}Registrar vale</button>`,
        render(v) {
          v.innerHTML = `<div class="wrap">${card({
            title: "Vales de caja chica", body: table({
              cols: [
                { t: "Vale", cls: "mono", fmt: x => `${esc(x.id)}<span class="sub">${fecha(x.fecha)}</span>` },
                { t: "Fondo", fmt: x => esc(fondoNom(FONDOS.find(f => f.id === x.fondo) || {})) },
                { t: "Descripción", fmt: x => `${esc(x.desc)}<span class="sub">${esc(x.por || "")}</span>` },
                { t: "Cuenta", cls: "mono", fmt: x => `${esc(x.cta)}<span class="sub">${esc(ctaNom(x.cta))}</span>` },
                { t: "Comprobante", fmt: x => tag(x.comp, x.fe ? "ok" : "wa", x.fe ? "file" : "alert") },
                { t: "Monto", r: true, cls: "mono", fmt: x => `<b>${grp(x.monto)}</b>` },
                { t: "Estado", fmt: x => tag(x.estado, x.estado === "Repuesto" ? "ok" : /Por confirmar/.test(x.estado) ? "wa" : "mu") }
              ], rows: VALES.slice().sort((a, b) => b.fecha - a.fecha)
            })
          })}
          ${nota("Para que el IVA de una compra de caja chica sea crédito fiscal, la factura electrónica tiene que venir a nombre de la empresa (cédula jurídica). Con tiquete o sin comprobante, el IVA forma parte del gasto. Los vales por WhatsApp los lee el agente y los confirma Contabilidad en su bandeja.", "file")}</div>`;
        },
        wire() { const b = $("#vcNuevo"); if (b) b.addEventListener("click", valeSheet); }
      },
      {
        id: "tarjeta", t: "Tarjeta empresarial", sub: "Movimientos del estado de la tarjeta, comprobantes y pago",
        badge: () => { const n = MOV_TJ.filter(x => /Falta|Reintegrar|Por registrar/.test(x.estado)).length; return { n, k: "wa", l: n + " por resolver" }; },
        render(v) {
          const tot = MOV_TJ.reduce((s, x) => s + x.monto, 0);
          const det = [{ cta: "2-01-01-003", debe: tot, haber: 0 }, { cta: "1-01-02-001", debe: 0, haber: tot }];
          v.innerHTML = `<div class="wrap">
            <div class="grid g4">
              ${stat("Consumo del período", c(tot), { txt: TARJETA.marca + " ···· " + TARJETA.ult })}
              ${stat("Disponible", c(TARJETA.limite - tot), { txt: "límite " + c(TARJETA.limite) }, "var(--ok)")}
              ${stat("Sin comprobante", grp(MOV_TJ.filter(x => /Falta/.test(x.estado)).length), { txt: "el titular tiene 3 días para subirlo" }, "var(--crit)")}
              ${stat("Corte y pago", "día " + TARJETA.corte, { txt: "se paga el " + TARJETA.pago + " del mes siguiente" })}
            </div>
            ${card({
            title: "Movimientos del estado de cuenta", hint: "titular " + TARJETA.titular,
            body: table({
              cols: [
                { t: "Fecha", cls: "mono", fmt: x => fecha(x.fecha) },
                { t: "Comercio", fmt: x => `<b>${esc(x.comercio)}</b>` },
                { t: "Cuenta", cls: "mono", fmt: x => x.cta ? `${esc(x.cta)}<span class="sub">${esc(ctaNom(x.cta))}</span>` : '<span class="mut">cuenta por cobrar al titular</span>' },
                { t: "Comprobante", fmt: x => esc(x.comp) },
                { t: "Monto", r: true, cls: "mono", fmt: x => grp(x.monto) },
                { t: "Estado", fmt: x => tag(x.estado, x.estado === "Registrado" ? "ok" : /Falta|Reintegrar/.test(x.estado) ? "cr" : "wa") },
                { t: "", r: true, fmt: (x, i) => x.estado === "Por registrar" ? `<button class="btn sm pri" data-tjr="${i}">Registrar</button>` : x.estado === "Falta comprobante" ? `<button class="btn sm" data-tjc="${i}">Pedir comprobante</button>` : "" }
              ], rows: MOV_TJ, foot: [{ v: "<b>Total del estado</b>", span: 4 }, { v: `<b>${grp(tot)}</b>`, r: true, cls: "mono" }, { v: "", span: 2 }]
            })
          })}
            <div class="grid g2" style="align-items:start">
              ${asientoBox([{ cta: "6-01-02-001", debe: 42000 - D.ivaIncluido(42000, 13), haber: 0, nota: "ejemplo: combustible con factura electrónica" }, { cta: "1-01-05-001", debe: D.ivaIncluido(42000, 13), haber: 0 }, { cta: "2-01-01-003", debe: 0, haber: 42000 }], "Asiento de cada consumo", "se registra con su comprobante; el gasto personal va a cuenta por cobrar al titular")}
              ${asientoBox(det, "Asiento del pago de la tarjeta", "entra en el lote de pago de la fecha de vencimiento")}
            </div></div>`;
        },
        wire(v) {
          $$("[data-tjr]", v).forEach(b => b.addEventListener("click", () => { const x = MOV_TJ[+b.dataset.tjr]; const iva = /Factura electrónica/.test(x.comp) ? D.ivaIncluido(x.monto, 13) : 0; verDet([{ cta: x.cta, debe: x.monto - iva, haber: 0 }, { cta: "1-01-05-001", debe: iva, haber: 0 }, { cta: "2-01-01-003", debe: 0, haber: x.monto }].filter(d => d.debe || d.haber), "Registrar consumo · " + x.comercio, "Se envía a la bandeja de Contabilidad para aprobarlo"); x.estado = "Enviado a Contabilidad"; setTimeout(() => A.refresh(), 0); }));
          $$("[data-tjc]", v).forEach(b => b.addEventListener("click", () => { const x = MOV_TJ[+b.dataset.tjc]; toast("Solicitud enviada", "Se le pidió a " + TARJETA.titular + " por WhatsApp la factura de " + x.comercio + ".", "in"); }));
        }
      }
    ]
  });
  function liquidarFondo(f) {
    const vs = VALES.filter(x => x.fondo === f.id && x.estado !== "Repuesto");
    const tot = vs.reduce((s, x) => s + x.monto, 0);
    const pend = vs.filter(x => /Por confirmar/.test(x.estado));
    openSheet({
      wide: true, title: "Liquidar y reponer · " + fondoNom(f), sub: vs.length + " vales · " + c(tot) + " · custodio " + f.custodio,
      body: `${table({ cols: [{ t: "Vale", cls: "mono", fmt: x => esc(x.id) }, { t: "Descripción", fmt: x => esc(x.desc) }, { t: "Comprobante", fmt: x => tag(x.fe ? "FE" : "Sin FE", x.fe ? "ok" : "wa") }, { t: "Estado", fmt: x => tag(x.estado, /Por confirmar/.test(x.estado) ? "wa" : "mu") }, { t: "Monto", r: true, cls: "mono", fmt: x => grp(x.monto) }], rows: vs, foot: [{ v: "<b>A reponer</b>", span: 4 }, { v: `<b>${grp(tot)}</b>`, r: true, cls: "mono" }] })}
        ${pend.length ? nota(pend.length + " vale(s) todavía están por confirmar en Contabilidad: la liquidación espera a que se confirmen.", "clock", "wa") : ""}
        ${asientoBox([{ cta: "1-01-01-001", debe: tot, haber: 0, nota: "vuelve el efectivo al fondo" }, { cta: "1-01-02-001", debe: 0, haber: tot }], "Asiento de la reposición", "el gasto de cada vale ya se registró al confirmarlo")}
        ${firmaCampos(["Sonia Calderón · Contabilidad", "Adrián Vindas · Gerencia"], "lfQ")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="lfOk">${icon("check")}Aprobar reposición</button>`,
      after(el) {
        cerrar(el);
        $("#lfOk", el).addEventListener("click", () => {
          if (pend.length) return toast("Hay vales por confirmar", "Contabilidad los confirma en su bandeja antes de reponer.", "wa");
          if (!$("#lfQK", el).value) return toast("Falta la clave", "", "cr");
          vs.forEach(x => x.estado = "Repuesto"); f.ultima = D.ahora();
          LIQUIDACIONES.push({ id: "LQ-00" + (88 + LIQUIDACIONES.length - 1), fondo: f.id, fecha: D.ahora(), vales: vs.length, monto: tot, estado: "Por pagar en el lote", aprobo: $("#lfQ", el).value.split(" · ")[0] });
          anotar("Aprobó reposición de caja chica", fondoNom(f) + " · " + c(tot), "Media"); closeSheet(); toast("Reposición aprobada", "La transferencia al custodio entra en el próximo lote de pago.", "ok"); A.refresh();
        });
      }
    });
  }
  function arqueoFondo(f) {
    const esp = disponibleFondo(f);
    openSheet({
      title: "Arqueo de caja chica · " + fondoNom(f), sub: "Efectivo + vales = monto fijo de " + c(f.monto),
      body: `${kvs([["Monto fijo", c(f.monto)], ["Vales pendientes de reponer", c(f.monto - esp)], ["Efectivo que debe haber", `<b>${c(esp)}</b>`]])}
        ${fld("Efectivo contado", numInp("aqE", esp), "aqE")}<div id="aqD"></div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="aqOk">Registrar arqueo</button>`,
      after(el) {
        cerrar(el);
        const upd = () => { const d = r0(numIn($("#aqE", el).value)) - esp; $("#aqD", el).innerHTML = d ? nota((d < 0 ? "Faltante de " : "Sobrante de ") + c(Math.abs(d)) + ": queda a nombre del custodio y va a la bandeja de Contabilidad.", "alert", "cr") : nota("Cuadra.", "check", "ok"); };
        $("#aqE", el).addEventListener("input", upd); upd();
        $("#aqOk", el).addEventListener("click", () => { const d = r0(numIn($("#aqE", el).value)) - esp; anotar("Arqueo de caja chica", fondoNom(f) + (d ? " · diferencia " + c(d) : " · cuadra"), d ? "Alta" : "Baja"); closeSheet(); toast("Arqueo registrado", d ? "Diferencia de " + c(d) + " enviada a Contabilidad." : "El fondo cuadra.", d ? "wa" : "ok"); });
      }
    });
  }
  function valeSheet() {
    const ctas = ["6-01-02-001", "6-01-02-003", "6-01-02-005", "6-01-04-001"];
    openSheet({
      title: "Registrar vale de caja chica", sub: "También se puede mandar la foto por WhatsApp y el agente lo llena",
      body: `${g2(fld("Fondo", sel("vcF", FONDOS.map(f => [f.id, fondoNom(f)])), "vcF") + fld("Monto", numInp("vcM", 12500), "vcM"))}
        ${fld("Descripción", inp("vcD", "", 'placeholder="Qué se compró y para qué"'), "vcD")}
        ${g2(fld("Cuenta", sel("vcC", ctas.map(k => [k, k + " · " + ctaNom(k)])), "vcC") + fld("Comprobante", sel("vcT", ["Factura electrónica a nombre de la empresa", "Tiquete sin factura electrónica", "Sin comprobante"]), "vcT"))}
        <div id="vcA"></div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="vcOk">${icon("check")}Registrar</button>`,
      after(el) {
        cerrar(el);
        const upd = () => { const m = r0(numIn($("#vcM", el).value)), fe = /^Factura/.test($("#vcT", el).value), iva = fe ? D.ivaIncluido(m, 13) : 0; $("#vcA", el).innerHTML = (m > 50000 ? nota("Supera el tope de ₡50 000 por vale: tiene que ir por compra normal o con autorización de gerencia.", "alert", "cr") : "") + asientoBox([{ cta: $("#vcC", el).value, debe: m - iva, haber: 0 }, { cta: "1-01-05-001", debe: iva, haber: 0 }, { cta: "1-01-01-001", debe: 0, haber: m, nota: "sale del fondo" }], "Asiento al confirmar el vale"); };
        ["vcM", "vcC", "vcT"].forEach(id => $("#" + id, el).addEventListener(id === "vcM" ? "input" : "change", upd)); upd();
        $("#vcOk", el).addEventListener("click", () => {
          const m = r0(numIn($("#vcM", el).value)), d = $("#vcD", el).value.trim();
          if (!d || !m) return toast("Complete la descripción y el monto", "", "cr");
          if (m > 50000) return toast("Supera el tope por vale", "", "cr");
          const f = FONDOS.find(x => x.id === $("#vcF", el).value);
          if (m > disponibleFondo(f)) return toast("No alcanza el efectivo del fondo", "Disponible " + c(disponibleFondo(f)) + ". Liquide y reponga primero.", "cr");
          VALES.push({ id: "VC-N" + (VALES.length + 1), fondo: f.id, fecha: D.ahora(), desc: d, monto: m, cta: $("#vcC", el).value, comp: $("#vcT", el).value, fe: /^Factura/.test($("#vcT", el).value), estado: "Por confirmar en Contabilidad", por: quien() });
          anotar("Registró vale de caja chica", fondoNom(f) + " · " + d + " · " + c(m), "Baja"); closeSheet(); toast("Vale registrado", "Contabilidad lo confirma en su bandeja.", "ok"); A.refresh();
        });
      }
    });
  }

  /* ── estilos propios del módulo (sin tocar la hoja compartida) ── */
  (function estilos() {
    if (document.getElementById("cob-css")) return;
    const st = document.createElement("style"); st.id = "cob-css";
    st.textContent = `
      .cob-nota{display:flex;gap:10px;padding:11px 13px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);font-size:12.5px;color:var(--ink-2);line-height:1.55}
      .cob-nota>.ic{flex:none;color:var(--accent);margin-top:1px}
      .cob-nota.ok{background:var(--ok-soft);border-color:var(--ok-line)}.cob-nota.ok>.ic{color:var(--ok)}
      .cob-nota.wa{background:var(--warn-soft);border-color:var(--warn-line)}.cob-nota.wa>.ic{color:var(--warn)}
      .cob-nota.cr{background:var(--crit-soft);border-color:var(--crit-line)}.cob-nota.cr>.ic{color:var(--crit)}
      .cob-asiento{border:1px solid var(--hair);border-radius:10px;overflow:hidden;margin:10px 0;background:var(--surface)}
      .cob-asiento-h{display:flex;align-items:center;gap:8px;padding:9px 13px;background:var(--surface-2);border-bottom:1px solid var(--hair);font-size:12.5px;flex-wrap:wrap}
      .cob-asiento-h .ic{color:var(--accent)}.cob-asiento-h .mut{font-size:11.5px;margin-left:auto}
      .cob-asiento .tscroll{max-height:none}
      .cob-tot{display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center;padding:10px 14px;border-radius:10px;background:var(--accent-soft);border:1px solid var(--accent-line);font-size:12.5px;color:var(--ink-2);margin:10px 0}
      .cob-tot b{font-size:14.5px;color:var(--ink);margin-left:4px}
      .cob-sticky{position:sticky;bottom:0;z-index:2;box-shadow:0 -4px 14px rgba(0,0,0,.06)}
      .cob-cuadre{display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:10px;border:1px solid var(--ok-line);background:var(--ok-soft);font-size:12.5px;color:var(--ink-2);flex-wrap:wrap}
      .cob-cuadre>.ic{color:var(--ok)}.cob-cuadre.cr{border-color:var(--crit-line);background:var(--crit-soft)}.cob-cuadre.cr>.ic{color:var(--crit)}
      .cob-cuadre>span{flex:1;min-width:240px}.cob-cuadre b.num{color:var(--ink)}
      .aging.cob-aging6{grid-template-columns:repeat(6,1fr)}
      @media (max-width:860px){.aging.cob-aging6{grid-template-columns:repeat(2,1fr)}}
      .cob-dt td.r,.cob-dt td.mono{white-space:nowrap}
      .cob-medio .field{margin:0}
      .cob-sec{font-size:11.5px;font-weight:650;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3);margin:14px 0 6px}
      .cob-medio{display:grid;grid-template-columns:minmax(140px,1fr) 150px minmax(160px,1.3fr) 34px;gap:8px;margin-bottom:6px;align-items:center}
      .cob-medio select,.cob-medio input{width:100%}
      .cob-apl{width:120px;text-align:right}
      .cob-ficha{margin:10px 0 2px;border:1px solid var(--hair-2);border-radius:10px}
      .cob-pasos{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
      .cob-pasos span{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;border:1px solid var(--hair);font-size:12px;color:var(--ink-3)}
      .cob-pasos span.ok{color:var(--ok);border-color:var(--ok-line);background:var(--ok-soft)}
      .cob-pasos span.on{color:var(--accent);border-color:var(--accent-line);background:var(--accent-soft);font-weight:650}
      .cob-txt{font-family:var(--num);font-size:11px;line-height:1.75;background:var(--surface-2);border:1px solid var(--hair);border-radius:10px;padding:10px 12px;max-height:260px;overflow:auto;white-space:pre;margin:0}
      .cob-chk{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;padding:4px 0;color:var(--ink-2)}
      .cob-chk.ok>.ic{color:var(--ok)}.cob-chk.cr>.ic{color:var(--crit)}.cob-chk.cr{color:var(--crit)}
      .cob-clave{display:flex;flex-wrap:wrap;gap:6px;margin:-2px 0 8px}
      .cob-clave span{display:flex;flex-direction:column;padding:6px 9px;border:1px solid var(--hair);border-radius:8px;background:var(--surface-2)}
      .cob-bus{position:relative}
      .cob-bus-i{display:flex;align-items:center;gap:8px;border:1px solid var(--hair);border-radius:9px;background:var(--surface);padding:0 10px;color:var(--ink-3)}
      .cob-bus-i:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
      .cob-bus-i input{flex:1;min-width:0;border:0!important;outline:0;background:none!important;box-shadow:none!important;padding:9px 0!important;font-size:14px;color:var(--ink)}
      .cob-bus-s{font-family:var(--num);font-size:11.5px;color:var(--ink-3);white-space:nowrap}
      .cob-bus-l{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:30;background:var(--surface);border:1px solid var(--hair);border-radius:10px;box-shadow:0 10px 28px rgba(0,0,0,.14);max-height:340px;overflow:auto;padding:4px}
      .cob-bus-o{display:flex;flex-direction:column;gap:1px;padding:8px 10px;border-radius:7px;cursor:pointer}
      .cob-bus-o b{font-size:13.5px;font-weight:600;color:var(--ink)}.cob-bus-o span{font-size:11.5px;color:var(--ink-3);font-family:var(--num)}
      .cob-bus-o[aria-selected="true"],.cob-bus-o:hover{background:var(--accent-soft)}
      .cob-bus-o mark{background:none;color:var(--accent);font-weight:750}
      .cob-bus-h{font-size:11.5px;color:var(--ink-3);padding:7px 10px}
      .cob-filtro{width:240px;flex:0 1 240px}.card-a .cob-filtro{margin-right:4px}
      .cob-clave i{font-style:normal;font-size:10.5px;color:var(--ink-3)}.cob-clave b{font-size:12px}
    `;
    document.head.appendChild(st);
  })();

  /* para otras pantallas (Compras › Proveedores usa el mismo auxiliar) */
  /* Nómina envía su planilla a Pagos al banco con enviarLote y sigue el estado con loteDe */
  w.COB = { docsCxP, auxProv, validaIban, cartera, TRAMOS, diasVenc, venceDe, enviarLote, loteDe, estadoLote, reglaDe };
})(window);
