/* ═══════════════════════════════════════════════════════════════
   Ventas — punto de venta, documentos, cotizaciones, despachos,
   rutas, clientes y cuentas por cobrar.
   La caja es la pantalla que más se usa: se opera sin soltar el
   teclado y no deja aplicar una línea bajo el margen sin autorización.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const fmtCant = (n, a) => (a && a.decimales && !Number.isInteger(+n) ? String(Math.round(n * 100) / 100).replace(".", ",") : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "));
  /* la cantidad dentro del campo de la fila: sin separador de miles y con coma decimal */
  const cantEdit = (n, a) => (a && a.decimales ? String(+(+n).toFixed(2)).replace(".", ",") : String(Math.round(n)));
  const D = w.DB, A = w.APP, S = w.S, U = w.UI;
  const { $, $$, esc, norm, grp, c, dec, kg, fecha, fh, hora, p2, icon, tag, card, stat, table, seg, onSeg,
    openSheet, closeSheet, toast, locNom, cliNom, artOf, ini } = U;

  /* ── la factura en curso ────────────────────────────────────── */
  /* draft: el borrador que el nodo local guarda solo; apartado: lo que esta
     factura dejó comprometido en existencias y hay que devolver si se cancela */
  S.cart = { cliId: "C1", condicion: "Crédito", lineas: [], draft: new Date(), apartado: [] };
  const tocaBorrador = () => { reDesc(); S.cart.draft = S.cart.lineas.length ? new Date() : null; };
  /* descuento de la categoría del cliente o por volumen, aplicado solo y con
     tope por margen (VEN-007, VEN-008; reglas en Precios, descuentos y márgenes).
     Un descuento digitado a mano en la línea no se toca. */
  function reDesc() {
    if (!w.VENX) return;
    S.cart.lineas.forEach(l => {
      if (l.auto === false) return;
      const r = w.VENX.descAuto(S.cart.cliId, l.artId, l.cant);
      l.descTipo = "pct"; l.desc = r ? r.desc : 0; l.fuente = r ? r.fuente : ""; l.auto = true;
    });
  }
  w.POSX = { aplicarCliente: () => tocaBorrador() };
  [["FER-01042", 40, 0], ["FER-02218", 120, 3], ["FER-03771", 28, 31], ["FER-00915", 36, 0], ["FER-01880", 450, 0]]
    .forEach(s => {
      const a = D.articulos.find(x => x.cod === s[0]);
      if (a) S.cart.lineas.push({ artId: a.id, cant: s[1], precio: a.precio, descTipo: "pct", desc: s[2], nota: "", auth: false, auto: !s[2] });
    });
  reDesc();

  const lineBruto = l => l.cant * l.precio;
  const lineDescMonto = l => {
    const b = lineBruto(l);
    if (!l.desc) return 0;
    return l.descTipo === "monto" ? Math.min(b, Math.max(0, l.desc)) : Math.round((b * Math.min(100, Math.max(0, l.desc))) / 100);
  };
  const lineTotal = l => lineBruto(l) - lineDescMonto(l);
  function lineMargen(l) {
    const a = artOf(l.artId);
    /* el precio de la línea trae IVA: el margen y la utilidad se miden sin IVA */
    const pv = D.sinIva(l.cant ? lineTotal(l) / l.cant : l.precio, a.tarifa);
    return { m: a.costo ? ((pv - a.costo) / pv) * 100 : null, min: D.famById[a.fam].min, pv };
  }
  /* para el motor fiscal el descuento viaja en porcentaje: se convierte aquí */
  const lineasFiscales = () => S.cart.lineas.map(l => ({
    artId: l.artId, cant: l.cant, precio: l.precio, nota: l.nota || "",
    desc: lineBruto(l) ? +((lineDescMonto(l) / lineBruto(l)) * 100).toFixed(4) : 0
  }));
  /* la exoneración vigente del cliente de la factura baja el IVA de cada línea */
  const cartExo = () => (S.cart.cliId ? D.exoneracionDe(S.cart.cliId, D.ahora()) : null);
  const cartTot = () => D.totalizar(lineasFiscales(), { exoneracion: cartExo() });
  const cartPeso = () => S.cart.lineas.reduce((s, l) => s + (artOf(l.artId).peso || 0) * l.cant, 0);
  function cartMargen() {
    let ing = 0, cos = 0;
    S.cart.lineas.forEach(l => { ing += D.sinIva(lineTotal(l), artOf(l.artId).tarifa); cos += l.cant * artOf(l.artId).costo; });
    return ing ? ((ing - cos) / ing) * 100 : 0;
  }
  const pendientes = () => S.cart.lineas.filter(l => { const x = lineMargen(l); return x.m != null && x.m < x.min && !l.auth; });
  const cliCart = () => (S.cart.cliId ? D.cliById[S.cart.cliId] : null);

  function buscarArt(q) {
    const t = norm(q).split(/\s+/).filter(Boolean);
    if (!t.length) return [];
    return D.articulos.filter(a => t.every(x => norm(a.cod + " " + a.desc + " " + a.marca + " " + a.sub).includes(x))).slice(0, 7);
  }
  function marcar(text, q) {
    const t = norm(q).split(/\s+/).filter(Boolean), n = norm(text), hits = [];
    t.forEach(x => { const i = n.indexOf(x); if (i > -1) hits.push([i, i + x.length]); });
    if (!hits.length) return esc(text);
    hits.sort((a, b) => a[0] - b[0]);
    let out = "", cur = 0;
    hits.forEach(([a, b]) => { if (a < cur) return; out += esc(text.slice(cur, a)) + "<mark>" + esc(text.slice(a, b)) + "</mark>"; cur = b; });
    return out + esc(text.slice(cur));
  }

  /* ══ PUNTO DE VENTA ══════════════════════════════════════════ */
  const posField = (label, html) =>
    `<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-4);margin-bottom:6px">${esc(label)}</div>${html}</div>`;
  const posRow = (label, val, color) =>
    `<div style="display:flex;justify-content:space-between;font-size:13px;color:${color || "var(--ink-2)"}"><span>${esc(label)}</span><span class="num">${val}</span></div>`;
  const kbdHint = (k, l) => `<button type="button" class="kbdb" data-fk="${esc(k)}" title="Tecla ${esc(k)}"><kbd>${esc(k)}</kbd>${esc(l)}</button>`;

  function itemPanel(l, idx) {
    const a = artOf(l.artId);
    const bruto = lineBruto(l), descMonto = lineDescMonto(l);
    /* la línea lleva la tarifa de su CABYS y la exoneración del cliente */
    const tl = D.totalizar([lineasFiscales()[idx]], { exoneracion: cartExo() });
    const iva = tl.iva, tarifa = D.tarifaDe(l);
    const x = lineMargen(l);
    const bajo = x.m != null && x.m < x.min;
    return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-4)">Detalle de la fila</div>${tag("#" + p2(idx + 1), "acc")}</div>
      <div style="display:flex;gap:11px;align-items:flex-start;margin-bottom:16px">
        <span class="mit" style="width:42px;height:42px;border-radius:10px">${icon(a.tipo === "Servicio" ? "wrench" : "box")}</span>
        <div style="min-width:0;flex:1">
          <div class="b" style="font-size:14.5px">${esc(a.desc)}</div>
          <div class="mut" style="font-size:12px">${esc(a.cod)} · ${esc(a.marca)}</div>
          <div class="dim" style="font-size:11.5px;margin-top:2px">${esc(locNom(S.locId))} · disponible ${a.tipo === "Producto" ? fmtCant(D.disp(a.id, S.locId), a) : "—"}</div>
          ${a.tipo === "Producto" && w.INVX ? `<div style="font-size:12px;margin-top:3px;display:flex;align-items:center;gap:5px;color:var(--accent);font-weight:600">${icon("pin", 'style="width:14px;height:14px"')}${esc(w.INVX.ubicTexto(w.INVX.ubic(a.id, S.locId)))}</div>` : ""}
        </div></div>
      ${(a.pres || []).filter(p => !p.base && p.venta).length ? posField("Sumar por presentación", `<div style="display:flex;flex-wrap:wrap;gap:6px">${(a.pres || []).filter(p => !p.base && p.venta).map(p => `<button class="btn sm" data-ppres="${p.f}">${icon("plus")}${esc(p.u)}</button>`).join("")}<span class="dim" style="font-size:11.5px;align-self:center">suma en ${esc(a.unidad)}</span></div>`) : ""}
      <div class="pf2">
        ${posField("Tipo desc.", `<select id="pDescTipo" style="width:100%;padding:8px 10px;border-radius:9px;border:1px solid var(--hair);background:var(--surface)">
          <option value="pct"${l.descTipo === "monto" ? "" : " selected"}>% Porcentaje</option>
          <option value="monto"${l.descTipo === "monto" ? " selected" : ""}>₡ Monto fijo</option></select>`)}
        ${posField(l.descTipo === "monto" ? "Descuento ₡" : "Descuento %", `<input id="pDescVal" type="number" min="0" step="1" value="${l.desc || 0}" class="num" style="width:100%;padding:8px 10px;border-radius:9px;border:1px solid var(--hair);background:var(--surface)">`)}
      </div>
      ${posField("Observaciones", `<textarea id="pNota" placeholder="Nota interna de la línea…" rows="2" style="width:100%;padding:8px 10px;border-radius:9px;border:1px solid var(--hair);background:var(--surface);resize:vertical">${esc(l.nota || "")}</textarea>`)}
      ${bajo ? `<div style="margin:-2px 0 12px;padding:10px 12px;border-radius:9px;background:${l.auth ? "var(--ok-soft)" : "var(--crit-soft)"};border:1px solid ${l.auth ? "var(--ok-line)" : "var(--crit-line)"};color:${l.auth ? "var(--ok)" : "var(--crit)"};font-size:12.5px;font-weight:650">
          <div style="display:flex;gap:7px;align-items:center">${icon(l.auth ? "shield" : "alert")}<span>Margen ${dec(x.m)} % · mínimo de ${dec(x.min, 0)} % en «${esc(D.famById[a.fam].nom)}»</span></div>
          ${l.auth ? `<div style="font-weight:500;margin-top:4px">Autorizado por ${esc(l.auth.por)} · quedó en la bitácora.</div>`
        : l.authReq ? `<div style="font-weight:500;margin-top:4px">Solicitud pendiente · la pidió ${esc(l.authReq.solicita)}</div><button class="btn sm" data-auth="${idx}" style="margin-top:8px">${icon("shield")}Aprobar con PIN</button>`
        : `<button class="btn sm" data-auth="${idx}" style="margin-top:8px">${icon("shield")}Solicitar autorización</button>`}</div>` : ""}
      <div style="padding:12px 14px;border-radius:11px;background:var(--accent-soft);border:1px solid var(--accent-line);display:flex;flex-direction:column;gap:4px">
        ${posRow("Precio de lista (con IVA)", c(bruto))}
        ${descMonto ? posRow("Descuento aplicado", "−" + c(descMonto), "var(--warn)") : ""}
        <div style="height:1px;background:var(--accent-line);margin:2px 0"></div>
        ${posRow("Base sin IVA", c(tl.grav + tl.exe))}
        ${posRow("IVA " + D.pctTxt(tarifa) + " · CABYS " + a.cabys, c(iva))}
        ${tl.ivaExon ? posRow("IVA exonerado", "−" + c(tl.ivaExon), "var(--ok)") : ""}
        <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:750"><span>Línea</span><span class="num">${c(tl.total)}</span></div>
      </div>`;
  }

  const quickCard = a => `<button class="mi" data-add="${a.id}" style="border:1px solid var(--hair);align-items:center">
      <span class="mit" style="background:${a.tipo === "Servicio" ? "var(--surface-3)" : "var(--accent-soft)"};color:${a.tipo === "Servicio" ? "var(--ink-3)" : "var(--accent)"}">${icon(a.tipo === "Servicio" ? "wrench" : "box")}</span>
      <span class="mtxt" style="flex:1"><span class="mn" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.desc)}</span>
      <span class="md" style="display:flex;gap:7px;align-items:center"><b class="num" style="color:var(--accent);font-size:13.5px">${a.precio ? c(a.precio) : "Cotizar"}</b>
      ${a.peso ? `<span class="dim num" style="font-size:11.5px">${kg(a.peso)}</span>` : ""}</span></span></button>`;

  /* ══ PRODUCTOS RELACIONADOS (VEN-016) ═════════════════════════
     Lo que el vendedor experto sugiere de memoria, para todos: al agregar o
     elegir una línea aparecen sus complementos con la cantidad ya calculada.
     Un clic o ⌥1–6 (Alt 1–6) los agrega; nunca interrumpe la venta.
     Reglas y resultados: Ventas › Sugerencia de productos relacionados. */
  const esMac = /Mac|iPhone|iPad/.test(navigator.platform || "");
  const teclaSug = esMac ? "⌥" : "Alt ";
  function sugeridos() {
    if (!w.VENX || !w.VENX.relacionados || !S.cart.lineas.length) return { titulo: "", items: [] };
    const sel = S.posSel != null && S.cart.lineas[S.posSel] ? S.cart.lineas[S.posSel] : null;
    return w.VENX.relacionados(S.cart.lineas, sel);
  }
  function sugCard() {
    const s = sugeridos();
    if (!s.items.length) return "";
    return card({
      title: s.titulo, hint: "un clic o " + teclaSug + (s.items.length > 1 ? "1–" + s.items.length : "1") + " para agregar", cls: "sugcard", flush: false,
      body: `<div class="sugs">${s.items.map((x, i) => `<button type="button" class="sug" data-sug="${i}" title="${esc(x.motivo)}">
          <kbd>${teclaSug}${i + 1}</kbd>
          <span class="sugt"><b>${esc(x.a.desc)}</b><span>${esc(x.motivo)}</span></span>
          <span class="sugq"><b class="num">${fmtCant(x.cant, x.a)} ${esc(x.a.unidad)}</b><span class="num">${c(Math.round(x.a.precio * x.cant))}</span></span>
          ${icon("plus", 'style="width:16px;height:16px;flex:none;color:var(--accent)"')}</button>`).join("")}</div>`
    });
  }
  function agregarSug(i) {
    const x = sugeridos().items[i];
    if (!x) return;
    S.cart.lineas.push({ artId: x.a.id, cant: x.cant, precio: x.a.precio, descTipo: "pct", desc: 0, nota: "", auth: false, sug: true });
    if (w.VENX) w.VENX.aceptar(x);
    tocaBorrador();
    toast("Agregado · " + x.a.desc, fmtCant(x.cant, x.a) + " " + x.a.unidad + " · " + x.motivo, "ok");
    A.refresh();
    setTimeout(() => { const e = $("#posScan"); if (e) e.focus(); }, 0);
  }

  /* ══ TECLAS DE LA CAJA ═══════════════════════════════════════
     una sola definición: rotula la barra inferior, responde al teclado
     y responde al clic sobre el botón correspondiente */
  const TECLAS = [
    ["F2", "Buscar artículo"],
    ["F3", "Guardar como proforma"],
    ["F4", "Cliente"],
    ["F6", "Existencias en otros locales"],
    ["F7", "Apartar mercadería"],
    ["F8", "Descuento de línea"],
    ["F10", "Cancelar factura"]
  ];
  const ACCIONES = {
    F2: () => { const s = $("#posScan"); if (s) { s.focus(); s.select(); } },
    F3: guardarProforma,
    F4: elegirCliente,
    F6: verExistencias,
    F7: apartar,
    F8: () => {
      const d = $("#pDescVal");
      if (d) { d.focus(); d.select(); }
      else toast("Seleccione una línea", "Elija un artículo de la factura para aplicarle un descuento.", "wa");
    },
    F10: cancelarFactura
  };

  A.screen("pos", {
    title: "Punto de venta", bare: true,
    render(v) {
      const cli = cliCart();
      const t = cartTot();
      const mg = cartMargen();
      const disp = cli && cli.limite ? cli.limite - cli.saldo : 0;
      const nLin = S.cart.lineas.length;
      const nUnid = S.cart.lineas.reduce((s, l) => s + l.cant, 0);
      const selIdx = S.posSel != null && S.cart.lineas[S.posSel] ? S.posSel : null;
      /* cambiar el precio es un permiso: el perfil de mostrador lo ve pero no lo edita */
      const puedePrecio = S.role !== "cajero";
      const masPedidos = D.articulos.filter(a => a.tipo === "Producto").slice(0, 8);
      const servicios = D.articulos.filter(a => a.tipo === "Servicio");

      const filas = S.cart.lineas.map((l, i) => {
        const a = artOf(l.artId);
        const x = lineMargen(l);
        const bajo = x.m != null && x.m < x.min;
        const sel = i === selIdx;
        const stock = D.disp(l.artId, S.locId);
        const desdeCedi = stock < l.cant;
        const descCell = !l.desc ? '<span class="dim">—</span>'
          : `<span style="color:var(--warn);font-weight:650"${l.auto && l.fuente ? ` data-tip="Descuento automático · ${esc(l.fuente)}"` : ""}>${l.descTipo === "monto" ? c(l.desc) : dec(l.desc, 0) + " %"}</span>`;
        return `<tr data-selline="${i}" class="${sel ? "sel" : bajo && !l.auth ? "cr" : ""}" style="cursor:pointer">
          <td class="mono dim">${i + 1}</td>
          <td style="min-width:180px"><div class="b" style="font-size:13.5px">${esc(a.desc)}</div>
            <div class="mut" style="font-size:11.5px">${esc(a.cod)} · ${esc(a.marca)} · ${esc(a.unidad)}${desdeCedi ? ' · <span style="color:var(--warn)">se despacha desde CEDI Isabel</span>' : ""}${bajo ? ` · <span style="color:${l.auth ? "var(--ok)" : "var(--crit)"};font-weight:650">margen ${dec(x.m)} %${l.auth ? " autorizado" : ""}</span>` : ""}</div></td>
          <td class="c"><div class="qstep">
            <button type="button" class="qb" data-qd="${i}" data-q="-1" tabindex="-1" aria-label="Restar uno a la línea ${i + 1}">−</button>
            <input class="qi num" data-qi="${i}" value="${cantEdit(l.cant, a)}" inputmode="decimal" autocomplete="off" aria-label="Cantidad de la línea ${i + 1}">
            <button type="button" class="qb" data-qd="${i}" data-q="1" tabindex="-1" aria-label="Sumar uno a la línea ${i + 1}">+</button></div></td>
          <td class="r">${puedePrecio
            ? `<input class="celed num" data-pi="${i}" value="${grp(l.precio)}" inputmode="numeric" autocomplete="off" aria-label="Precio unitario con IVA de la línea ${i + 1}" data-tip="Precio con IVA incluido · clic para cambiarlo">`
            : `<span class="num" data-tip="Cambiar el precio requiere permiso de gerencia">${grp(l.precio)}</span>`}</td>
          <td class="r">${descCell}</td>
          <td class="r num b">${grp(lineTotal(l))}</td>
          <td class="r"><button class="iconbtn" data-del="${i}" style="width:26px;height:26px;color:var(--ink-4)" title="Quitar línea">${icon("x")}</button></td></tr>`;
      }).join("");

      const tabla = `<div class="scrollx"><table class="dt"><thead><tr>
          <th style="width:30px">#</th><th>Artículo</th><th class="c" style="width:140px">Cant.</th>
          <th class="r" style="width:104px" data-tip="Precio unitario sin IVA">P. unit.</th><th class="r" style="width:70px">Desc.</th>
          <th class="r" style="width:104px">Total</th><th style="width:34px"></th></tr></thead>
        <tbody>${nLin ? filas : `<tr><td colspan="7" style="padding:38px 10px;text-align:center;color:var(--ink-4);font-size:13.5px">Escanee o busque un artículo para comenzar la factura.</td></tr>`}</tbody></table></div>`;

      /* el margen no ocupa alto en el panel: vive en la esquina de la cabecera,
         que es donde se está mirando mientras se arma la factura.
         El consecutivo no se muestra: se asigna hasta que el documento se emite. */
      const falta = pendientes().length;
      const mgPill = `<span class="mgpill" data-tip="Margen de la factura · mínimo global 18 %">
          <span class="mgl">Margen</span>
          <span class="mgb"><i style="width:${Math.max(3, Math.min(100, (mg / 36) * 100)).toFixed(0)}%;background:${mg >= 18 ? "var(--ok)" : "var(--crit)"}"></i><b style="left:50%"></b></span>
          <span class="num mgv" style="color:${mg >= 18 ? "var(--ok)" : "var(--crit)"}">${dec(mg)} %</span></span>`;

      const panelDet = selIdx != null ? itemPanel(S.cart.lineas[selIdx], selIdx)
        : `<div style="padding:30px 6px;text-align:center;color:var(--ink-4);font-size:13px;line-height:1.5">
            ${icon("box", 'style="width:26px;height:26px;margin-bottom:8px;color:var(--ink-4)"')}<br>Seleccione una línea de la factura para ver y editar su detalle.</div>`;

      v.innerHTML = `<div class="poswrap">
        <div class="posgrid">
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;padding:14px 20px 18px;gap:14px;overflow:auto">
            <div style="position:relative;flex:none">
              <div class="tb-search" style="width:100%;padding:12px 16px">${icon("scan")}
                <input id="posScan" placeholder="Escanee el código o busque por nombre, marca o SKU" autocomplete="off" style="font-size:14.5px">
                <span class="mut" style="font-size:11.5px">⏎ agrega</span></div>
              <div id="posMatches" style="position:absolute;left:0;right:0;top:100%;z-index:15"></div>
            </div>
            ${card({
        title: "Factura en curso",
        hint: nLin ? `${nLin} ${nLin === 1 ? "línea" : "líneas"} · ${grp(nUnid)} unid. · ${kg(cartPeso())} · clic en una fila para editar` : "",
        actions: nLin ? mgPill : "",
        body: tabla, flush: false
      })}
            ${sugCard()}
            <div><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-4);margin-bottom:8px">Más pedidos</div>
              <div class="grid" style="grid-template-columns:repeat(2,1fr);gap:8px">${masPedidos.map(quickCard).join("")}</div></div>
            <div><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-4);margin-bottom:8px">Servicios</div>
              <div class="grid" style="grid-template-columns:repeat(2,1fr);gap:8px">${servicios.map(quickCard).join("")}</div></div>
          </div>

          <aside class="poslado">
            <button style="padding:13px 18px;border-bottom:1px solid var(--hair);display:flex;align-items:center;gap:11px;width:100%;flex:none" id="btnCliente">
              <span class="avatar">${cli ? esc(ini(cli.nom)) : icon("users")}</span>
              <div style="flex:1;text-align:left;min-width:0">
                <div class="b" style="font-size:14px">${cli ? esc(cli.nom) : "Consumidor final"}</div>
                <div class="mut" style="font-size:12px">${cli ? (cli.limite ? `Crédito ${cli.plazo} días · disponible ${c(Math.round(disp))}` : "Contado · " + esc(cli.categoria)) : "Toque para identificar"}</div>
              </div>${icon("chev")}</button>
            <div class="pdet">${panelDet}</div>
            <div style="padding:13px 18px 14px;border-top:1px solid var(--hair);display:flex;flex-direction:column;gap:7px;flex:none">
              ${posRow("Subtotal sin IVA", c(t.grav + t.exe))}
              ${t.desc ? posRow("Incluye descuentos por", c(t.desc), "var(--warn)") : ""}
              ${D.desgloseIva(t).map(([k, v]) => posRow(k, v < 0 ? "−" + c(-v) : c(v), v < 0 ? "var(--ok)" : "")).join("")}
              <div style="display:flex;justify-content:space-between;font-size:19.5px;font-weight:700;padding-top:5px;border-top:1px solid var(--hair-2)"><span>Total</span><span class="num">${c(t.total)}</span></div>
              <button class="bigbtn ${falta ? "bloq" : ""}" id="btnCobrar" ${nLin ? "" : "disabled"}>${icon(falta ? "shield" : "cash")}Cobrar<kbd>⏎</kbd></button>
            </div>
          </aside>
        </div>
        <div class="posbar">
          ${TECLAS.map(([k, l]) => kbdHint(k, l)).join("")}
          <span style="margin-left:auto;display:flex;align-items:center;gap:7px;font-family:var(--num)">
            ${S.cart.draft
        ? `<span class="pulse"></span>Borrador guardado ${hora(S.cart.draft)}:${p2(S.cart.draft.getSeconds())} · nodo local`
        : `<span style="width:7px;height:7px;border-radius:50%;background:var(--ink-4);flex:none"></span>Sin borrador en esta terminal`}
          </span>
        </div></div>`;
    },
    wire(v) {
      const scan = $("#posScan", v), box = $("#posMatches", v);
      let sel = 0; /* fila resaltada de los resultados; se mueve con ↑ y ↓ */
      function pinta(reiniciar) {
        const q = scan.value.trim();
        if (!q) { box.innerHTML = ""; sel = 0; return; }
        const res = buscarArt(q);
        if (reiniciar !== false) sel = 0;
        sel = Math.max(0, Math.min(res.length - 1, sel));
        box.innerHTML = res.length
          ? `<div class="card" style="padding:4px;box-shadow:var(--shadow-lg);max-height:min(360px,50vh);overflow:auto">${res.map((a, i) => {
            const d = a.tipo === "Producto" ? D.disp(a.id, S.locId) : null;
            return `<button class="rec ${i === sel ? "sel" : ""}" data-add="${a.id}" style="width:100%">
              <div style="flex:1;min-width:0"><span class="b" style="font-size:14px">${marcar(a.desc, q)}</span>
                <span class="mut" style="font-size:12px">${esc(a.cod)} · ${esc(a.marca)}</span></div>
              <span class="mut num" style="font-size:12px;margin-right:10px;flex:none;${d != null && d <= 0 ? "color:var(--crit)" : ""}">${d != null ? d + " disp" : "Servicio"}</span>
              <span class="num" style="font-size:14px;font-weight:650;flex:none">${a.precio ? c(a.precio) : "Cotizar"}</span></button>`;
          }).join("")}</div>`
          : `<div class="card" style="padding:12px 14px"><span class="mut" style="font-size:13.5px">Sin resultados para «${esc(q)}»</span></div>`;
      }
      function mover(paso) {
        const items = $$("[data-add]", box);
        if (!items.length) return;
        sel = Math.max(0, Math.min(items.length - 1, sel + paso));
        items.forEach((b, i) => b.classList.toggle("sel", i === sel));
        items[sel].scrollIntoView({ block: "nearest" });
      }
      function agregar(id) {
        let idx = S.cart.lineas.findIndex(l => l.artId === id);
        if (idx > -1) S.cart.lineas[idx].cant++;
        else {
          S.cart.lineas.push({ artId: id, cant: 1, precio: artOf(id).precio, descTipo: "pct", desc: 0, nota: "", auth: false });
          idx = S.cart.lineas.length - 1;
        }
        S.posSel = idx;
        tocaBorrador();
        scan.value = ""; box.innerHTML = "";
        A.refresh();
        setTimeout(() => { const s = $("#posScan"); if (s) s.focus(); }, 0);
      }
      scan.addEventListener("input", () => pinta(true));
      scan.addEventListener("keydown", e => {
        if (e.key === "ArrowDown") { e.preventDefault(); mover(1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); mover(-1); }
        else if (e.key === "Enter") {
          e.preventDefault();
          const items = $$("[data-add]", box);
          const elegido = items[sel] || items[0];
          if (elegido) agregar(elegido.dataset.add);
        } else if (e.key === "Escape" && scan.value) {
          e.stopPropagation();
          scan.value = ""; box.innerHTML = ""; sel = 0;
        }
      });
      box.addEventListener("click", e => { const b = e.target.closest("[data-add]"); if (b) agregar(b.dataset.add); });
      box.addEventListener("mousemove", e => {
        const b = e.target.closest("[data-add]");
        if (!b) return;
        const items = $$("[data-add]", box);
        sel = items.indexOf(b);
        items.forEach((x, i) => x.classList.toggle("sel", i === sel));
      });
      $$("[data-add]", v).forEach(b => { if (!b.closest("#posMatches")) b.addEventListener("click", () => agregar(b.dataset.add)); });
      $$("[data-sug]", v).forEach(b => {
        b.addEventListener("mousedown", e => e.preventDefault());
        b.addEventListener("click", () => agregarSug(+b.dataset.sug));
      });
      $$("[data-selline]", v).forEach(tr => tr.addEventListener("click", e => {
        if (e.target.closest("input, button")) return;
        const i = +tr.dataset.selline;
        S.posSel = S.posSel === i ? null : i;
        A.refresh();
      }));
      $$("[data-del]", v).forEach(b => b.addEventListener("click", e => {
        e.stopPropagation();
        const i = +b.dataset.del;
        S.cart.lineas.splice(i, 1);
        if (S.posSel === i) S.posSel = null; else if (S.posSel != null && S.posSel > i) S.posSel--;
        tocaBorrador();
        A.refresh();
      }));

      /* ── cantidad y precio se editan en la misma fila ──────────────
         − / + suman o restan uno. En el campo: ⏎ confirma y vuelve al escáner,
         Tab / Mayús+Tab pasan al campo siguiente o anterior de la factura,
         ↑ ↓ ajustan la cantidad, Esc descarta. La fila editada queda
         seleccionada, así el panel muestra su detalle. */
      const leeNum = s => parseFloat(String(s).replace(/\s/g, "").replace(",", "."));
      const minCant = L => (artOf(L.artId).decimales ? 0.5 : 1);
      const enfoca = sel => setTimeout(() => {
        const el = $(sel === "scan" ? "#posScan" : sel);
        if (el) { el.focus(); if (el.select) el.select(); }
      }, 0);
      const selDe = x => (x.dataset.qi != null ? `[data-qi="${x.dataset.qi}"]` : `[data-pi="${x.dataset.pi}"]`);
      function aplicar(inp) {
        const i = +(inp.dataset.qi != null ? inp.dataset.qi : inp.dataset.pi), L = S.cart.lineas[i];
        if (!L || inp.dataset.hecho) return;
        inp.dataset.hecho = "1";
        let n = leeNum(inp.value);
        if (inp.dataset.qi != null) {
          n = artOf(L.artId).decimales ? Math.round(n * 100) / 100 : Math.round(n);
          if (isFinite(n) && n > 0 && n !== L.cant) { L.cant = n; tocaBorrador(); }
        } else {
          n = Math.round(n);
          if (isFinite(n) && n >= 0 && n !== L.precio) {
            /* todo cambio de precio en la caja queda en la bitácora con el antes y el después */
            D.bitacora.unshift({
              id: "BTP" + Date.now(), fecha: D.ahora(), usuario: S.vendedor, rol: "Caja", locId: S.locId,
              accion: "Cambió precio en caja", detalle: artOf(L.artId).desc + " · lista " + c(artOf(L.artId).precio),
              sev: "Media", antes: c(L.precio), despues: c(n), ip: "10.2.14.8"
            });
            L.precio = n; L.auth = false; L.authReq = null; tocaBorrador();
          }
        }
        S.posSel = i;
        A.refresh();
      }
      $$("[data-qd]", v).forEach(b => {
        b.addEventListener("mousedown", e => e.preventDefault());
        b.addEventListener("click", () => {
          const i = +b.dataset.qd, L = S.cart.lineas[i];
          L.cant = +b.dataset.q > 0 ? +(L.cant + 1).toFixed(2) : Math.max(minCant(L), +(L.cant - 1).toFixed(2));
          S.posSel = i;
          tocaBorrador();
          A.refresh();
          enfoca("scan");
        });
      });
      $$("[data-qi],[data-pi]", v).forEach(inp => {
        const orig = inp.value;
        inp.addEventListener("focus", () => inp.select());
        inp.addEventListener("change", () => aplicar(inp));
        inp.addEventListener("keydown", e => {
          if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); aplicar(inp); enfoca("scan"); }
          else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); inp.value = orig; inp.dataset.hecho = "1"; enfoca("scan"); }
          else if (e.key === "Tab") {
            const lista = $$("[data-qi],[data-pi]", v).map(selDe);
            const dest = lista[lista.indexOf(selDe(inp)) + (e.shiftKey ? -1 : 1)];
            if (dest) { e.preventDefault(); aplicar(inp); enfoca(dest); }
          } else if (inp.dataset.qi != null && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            const L = S.cart.lineas[+inp.dataset.qi], n = leeNum(inp.value) || 0;
            inp.value = cantEdit(Math.max(minCant(L), +(n + (e.key === "ArrowUp" ? 1 : -1)).toFixed(2)), artOf(L.artId));
          }
        });
      });

      const enter = e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } };
      const selIdx = S.posSel != null && S.cart.lineas[S.posSel] ? S.posSel : null;
      if (selIdx != null) {
        const L = S.cart.lineas[selIdx];
        $$("[data-ppres]", v).forEach(b => b.addEventListener("click", () => { L.cant = +(L.cant + +b.dataset.ppres).toFixed(2); tocaBorrador(); A.refresh(); }));
        const pt = $("#pDescTipo", v);
        if (pt) pt.addEventListener("change", () => { L.descTipo = pt.value; L.auth = false; L.auto = false; tocaBorrador(); A.refresh(); });
        const pd = $("#pDescVal", v);
        if (pd) {
          pd.addEventListener("keydown", enter);
          pd.addEventListener("change", () => {
            let n = parseFloat(pd.value);
            n = isFinite(n) && n >= 0 ? n : 0;
            L.desc = L.descTipo === "monto" ? Math.min(n, lineBruto(L)) : Math.min(100, n);
            L.auto = false;
            L.auth = false;
            tocaBorrador();
            A.refresh();
          });
        }
        const pn = $("#pNota", v);
        if (pn) pn.addEventListener("change", () => { L.nota = pn.value; tocaBorrador(); });
      }
      $$("[data-auth]", v).forEach(b => b.addEventListener("click", () => autorizar(+b.dataset.auth)));
      $("#btnCliente", v).addEventListener("click", elegirCliente);
      const bc = $("#btnCobrar", v); if (bc) bc.addEventListener("click", cobrar);

      /* cada tecla de la barra es también un botón: mismo evento por clic */
      $$(".kbdb", v).forEach(b => {
        /* el mousedown no debe robarle el foco al campo de escaneo */
        b.addEventListener("mousedown", e => e.preventDefault());
        b.addEventListener("click", () => { const f = ACCIONES[b.dataset.fk]; if (f) f(); });
      });

      /* atajos propios de la caja */
      if (v._keys) document.removeEventListener("keydown", v._keys);
      v._keys = e => {
        if (S.screen !== "pos" || $("#ovScrim")) return;
        if (e.altKey && /^Digit[1-6]$/.test(e.code)) { e.preventDefault(); agregarSug(+e.code.slice(5) - 1); return; }
        const f = ACCIONES[e.key];
        if (f) { e.preventDefault(); f(); }
      };
      document.addEventListener("keydown", v._keys);
    }
  });

  /* quién puede autorizar un precio bajo el margen. En la demo el PIN se
     muestra para poder probarlo; en producción es el de cada persona */
  const AUTORIZADORES = [
    { nom: "Adrián Vindas", rol: "Gerencia", cargo: "Gerencia general", ini: "AV", pin: "4821", canal: ["WhatsApp", "acc", "chat"] },
    { nom: "Marta Rojas", rol: "Jefatura de piso", cargo: "Jefatura de piso", ini: "MR", pin: "7730", canal: ["Correo", "mu", "mail"] }
  ];
  function autorizar(i) {
    const l = S.cart.lineas[i], a = artOf(l.artId), x = lineMargen(l);
    const pend = l.authReq;
    const quienes = AUTORIZADORES.filter(p => p.nom !== S.vendedor);
    openSheet({
      title: pend ? "Aprobar precio bajo el margen mínimo" : "Autorización de precio bajo el margen mínimo",
      sub: `Línea ${i + 1} · ${a.desc}`,
      body: `<div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;justify-content:space-between;padding:11px 13px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);font-size:13px"><span>Margen mínimo de «${esc(D.famById[a.fam].nom)}»</span><span class="num b">${x.min},0 %</span></div>
        <div style="display:flex;justify-content:space-between;padding:11px 13px;border-radius:10px;background:var(--crit-soft);border:1px solid var(--crit-line);font-size:13px"><span>Margen del precio solicitado</span><span class="num b" style="color:var(--crit)">${dec(x.m)} %</span></div>
        <div style="display:flex;justify-content:space-between;padding:11px 13px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);font-size:13px"><span>Utilidad que se deja de percibir</span><span class="num b">${c(Math.round((a.costo / (1 - x.min / 100) - x.pv) * l.cant))}</span></div>
        ${pend ? `<div style="padding:11px 13px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);font-size:13px">Solicitó <b>${esc(pend.solicita)}</b> a las ${hora(pend.fecha)}<div class="mut" style="margin-top:4px">${esc(pend.motivo)}</div></div>
        <div class="grid g2" style="gap:12px">
          <div class="field" style="margin:0"><label for="authQuien">Autoriza</label><select id="authQuien">${quienes.map(p => `<option value="${esc(p.nom)}">${esc(p.nom)} · ${esc(p.cargo)}</option>`).join("")}</select></div>
          <div class="field" style="margin:0"><label for="authPin">PIN de quien autoriza</label><input id="authPin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div></div>
        <div class="dim" style="font-size:11.5px">PIN de demostración: ${AUTORIZADORES.map(p => esc(p.nom.split(" ")[0]) + " " + p.pin).join(" · ")}</div>`
        : `<div><div style="font-size:12px;font-weight:700;color:var(--ink-4);margin-bottom:7px">Puede autorizar</div>
          <div style="display:flex;flex-direction:column;gap:7px">
            ${quienes.map(p => `<div class="rec" style="border-bottom:0"><span class="avatar">${p.ini}</span><div style="flex:1"><div class="b" style="font-size:13.5px">${esc(p.nom)}</div><div class="mut" style="font-size:12px">${esc(p.cargo)}${p.rol === "Jefatura de piso" ? " · " + esc(locNom(S.locId)) : ""}</div></div>${tag(p.canal[0], p.canal[1], p.canal[2])}</div>`).join("")}
          </div></div>
        <div class="field"><label for="motivo">Motivo (obligatorio)</label><textarea id="motivo" rows="3" placeholder="Por qué se necesita este precio"></textarea></div>`}
        <div style="display:flex;gap:10px;padding:12px 14px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair)">${icon("shield")}
          <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">Quien vende no puede autorizarse a sí mismo. Quedan en la bitácora el usuario que solicita, el que autoriza, el motivo, el margen mínimo vigente y el precio aplicado. La autorización sirve para <strong>esta línea y este precio</strong>: si el precio cambia, hay que pedirla de nuevo.</div></div>
      </div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="okAuth">${icon("shield")}${pend ? "Aprobar" : "Enviar solicitud"}</button>`,
      after(el) {
        $$("[data-cerrar]", el).forEach(b => b.addEventListener("click", closeSheet));
        const f = $(pend ? "#authPin" : "#motivo", el); if (f) setTimeout(() => f.focus(), 40);
        $("#okAuth", el).addEventListener("click", () => {
          if (!pend) {
            const motivo = $("#motivo", el).value.trim();
            if (motivo.length < 8) { toast("Falta el motivo", "Explique por qué se necesita el precio; queda en la bitácora.", "cr"); return; }
            l.authReq = { solicita: S.vendedor, motivo, fecha: D.ahora(), precio: l.precio };
            D.bitacora.unshift({
              id: "BTS" + Date.now(), fecha: D.ahora(), usuario: S.vendedor, rol: "Caja", locId: S.locId,
              accion: "Solicitó autorización de margen", detalle: `${a.desc} · margen ${dec(x.m)} % contra mínimo ${x.min} % · ${motivo}`,
              sev: "Media", antes: x.min + ",0 %", despues: dec(x.m) + " %", ip: "10.2.14.8"
            });
            closeSheet();
            toast("Solicitud enviada", quienes.map(p => p.nom).join(" o ") + " la reciben. La línea queda pendiente hasta que alguien la apruebe con su PIN.", "in");
            A.refresh();
            return;
          }
          const p = AUTORIZADORES.find(q => q.nom === $("#authQuien", el).value);
          if (!p || p.nom === pend.solicita) { toast("No puede autorizar su propia solicitud", "La aprueba otra persona con permiso.", "cr"); return; }
          if ($("#authPin", el).value !== p.pin) { toast("PIN incorrecto", "El PIN no corresponde a " + p.nom + ".", "cr"); $("#authPin", el).value = ""; return; }
          l.auth = { por: p.nom, rol: p.rol, fecha: D.ahora(), precio: l.precio };
          D.bitacora.unshift({
            id: "BT" + Date.now(), fecha: D.ahora(), usuario: p.nom, rol: p.rol,
            locId: S.locId, accion: "Autorizó venta bajo margen",
            detalle: `${a.desc} · margen ${dec(x.m)} % contra mínimo ${x.min} % · solicitó ${pend.solicita} · ${pend.motivo}`,
            sev: "Alta", antes: x.min + ",0 %", despues: dec(x.m) + " %", ip: "10.2.14.8"
          });
          l.authReq = null;
          closeSheet();
          toast("Autorización registrada", p.nom + " aprobó la línea con su PIN. Quedó en la bitácora.", "ok");
          A.refresh();
        });
      }
    });
  }

  function elegirCliente() {
    const tablaCli = lista => table({
      onRow: true,
      cols: [
        { t: "Cliente", fmt: r => `<b>${esc(r.nom)}</b><span class="sub ui">${esc(r.ced)} · ${esc(r.categoria)}</span>` },
        { t: "Condición", fmt: r => (r.limite ? tag("Crédito " + r.plazo + " d", "acc") : tag("Contado", "mu")) },
        { t: "Límite", r: true, cls: "mono", fmt: r => (r.limite ? c(r.limite) : "—") },
        { t: "Saldo", r: true, cls: "mono", fmt: r => (r.saldo ? c(Math.round(r.saldo)) : "0") },
        { t: "Disponible", r: true, cls: "mono", fmt: r => r.limite ? `<span style="color:${r.limite - r.saldo > 0 ? "var(--ok)" : "var(--crit)"};font-weight:650">${c(Math.round(r.limite - r.saldo))}</span>` : "—" },
        { t: "", r: true, fmt: () => icon("chev", 'style="width:15px;height:15px;color:var(--ink-4)"') }
      ], rows: lista
    });

    openSheet({
      title: "Identificar cliente", sub: "Búsqueda por nombre o cédula, sin comodines", wide: true, tight: true,
      body: `<div style="padding:16px 22px;border-bottom:1px solid var(--hair-2)">
          <div class="tb-search" style="width:100%;padding:10px 13px">${icon("search")}
            <input id="cliQ" type="search" placeholder="Escriba el nombre o la cédula" autocomplete="off" style="font-size:14px"></div>
          <div class="mut" style="font-size:12.5px;margin-top:8px">Clic en la fila para asociarlo a la venta. También puede cobrar sin identificar a nadie.</div>
        </div>
        <div id="cliBox">${tablaCli(D.clientes)}</div>`,
      footer: `<button class="btn" id="cliCancelar">Cancelar</button><div class="gap" style="flex:1"></div>
        <button class="btn" id="cliFinal">${icon("users")}Consumidor final</button>`,
      after(root) {
        let visibles = D.clientes;
        const usar = id => {
          S.cart.cliId = id;
          S.cart.condicion = id && D.cliById[id].limite ? "Crédito" : "Contado";
          tocaBorrador(); closeSheet(); A.refresh();
        };
        const enlazar = () => $$("#cliBox tr.clickable").forEach(tr =>
          tr.addEventListener("click", () => { const x = visibles[+tr.dataset.i]; if (x) usar(x.id); }));
        enlazar();
        const q = $("#cliQ", root);
        q.addEventListener("input", () => {
          const t = norm(q.value.trim());
          visibles = t ? D.clientes.filter(x => norm(x.nom + " " + x.ced + " " + x.categoria).includes(t)) : D.clientes;
          $("#cliBox").innerHTML = visibles.length ? tablaCli(visibles)
            : `<div class="mut" style="padding:34px;text-align:center;font-size:13.5px">Ningún cliente coincide con «${esc(q.value)}».</div>`;
          enlazar();
        });
        q.addEventListener("keydown", e => { if (e.key === "Enter" && visibles.length) usar(visibles[0].id); });
        $("#cliCancelar", root).addEventListener("click", closeSheet);
        $("#cliFinal", root).addEventListener("click", () => usar(null));
      }
    });
  }

  function verExistencias() {
    const l = S.cart.lineas[S.posSel != null ? S.posSel : 0];
    if (!l) return toast("No hay líneas", "Agregue un artículo primero.", "in");
    const a = artOf(l.artId);
    openSheet({
      title: "Existencias en otros locales", sub: a.desc + " · " + a.cod, tight: true,
      body: table({
        cols: [
          { t: "Ubicación", fmt: r => `${esc(r.loc.nom)}${r.loc.id === S.locId ? " " + tag("aquí", "acc") : ""}` },
          { t: "Existencia", r: true, cls: "mono", fmt: r => grp(r.e.cant) },
          { t: "Comprometido", r: true, cls: "mono", fmt: r => grp(r.e.comp) },
          { t: "Disponible", r: true, cls: "mono", fmt: r => `<b>${grp(r.e.cant - r.e.comp)}</b>` },
          { t: "Dónde está", fmt: r => w.INVX ? `<span style="font-size:12.5px">${esc(w.INVX.ubicTexto(w.INVX.ubic(a.id, r.loc.id)))}</span>` : "" }
        ],
        rows: Object.keys(D.existencias[a.id] || {}).map(id => ({ loc: D.locales.find(x => x.id === id), e: D.existencias[a.id][id] })).filter(x => x.loc),
        rowCls: r => (r.e.cant - r.e.comp <= 0 ? "cr" : "")
      })
    });
  }

  function apartar() {
    if (!S.cart.lineas.length) return toast("La factura está vacía", "Agregue artículos antes de apartar mercadería.", "in");
    if ((S.cart.apartado || []).length) return toast("Ya está apartada", "La mercadería de esta factura sigue comprometida en " + locNom(S.locId) + ".", "in");
    S.cart.lineas.forEach(l => {
      const e = D.stock(l.artId, S.locId);
      if (!e) return;
      e.comp += l.cant;
      S.cart.apartado.push({ artId: l.artId, locId: S.locId, cant: l.cant });
    });
    tocaBorrador();
    toast("Mercadería apartada", "Quedó comprometida en " + locNom(S.locId) + ". No se puede vender a otro cliente.", "ok");
    A.refresh();
  }

  /* devuelve a existencias lo que esta factura había apartado */
  function soltarApartado() {
    (S.cart.apartado || []).forEach(x => {
      const e = D.stock(x.artId, x.locId);
      if (e) e.comp = Math.max(0, e.comp - x.cant);
    });
    S.cart.apartado = [];
  }

  /* ══ CANCELAR LA FACTURA EN CURSO ════════════════════════════ */
  function cancelarFactura() {
    const n = S.cart.lineas.length;
    if (!n) return toast("No hay nada que cancelar", "La factura en curso está vacía.", "in");
    const t = cartTot();
    const apartadas = (S.cart.apartado || []).length;
    const cli = cliCart();
    openSheet({
      title: "¿Cancelar la factura en curso?",
      sub: "Se pierde lo digitado y se elimina el borrador del nodo local",
      body: `<div style="display:flex;gap:11px;padding:13px 15px;border-radius:10px;background:var(--crit-soft);border:1px solid var(--crit-line);margin-bottom:16px">
          <span style="color:var(--crit);display:flex">${icon("alert")}</span>
          <div style="font-size:13.5px;color:var(--ink);line-height:1.6">Esto no se puede deshacer. La factura todavía no se ha emitido, así que no queda ningún comprobante: simplemente se borra lo que hay en pantalla.</div></div>
        <div class="card"><div class="card-b flush"><div class="ficha">
          ${U.fichaCell("Líneas", n)}
          ${U.fichaCell("Total digitado", c(t.total))}
          ${U.fichaCell("Cliente", `<span style="font-family:var(--ui);font-size:14px">${cli ? esc(cli.nom.split(" ").slice(0, 2).join(" ")) : "Consumidor final"}</span>`)}
        </div></div></div>
        <ul style="margin:16px 0 0;padding-left:20px;font-size:13.5px;color:var(--ink-2);line-height:1.7">
          <li>Se vacía la factura y se elimina el borrador guardado en esta terminal.</li>
          ${apartadas ? `<li>Se libera la mercadería que había quedado apartada (${apartadas} línea${apartadas > 1 ? "s" : ""}): vuelve a estar disponible para otro cliente.</li>` : ""}
          <li>Queda registrado en la bitácora quién canceló y a qué hora.</li>
          <li>El consecutivo fiscal no se gasta: se asigna solo cuando la factura se emite.</li>
        </ul>`,
      footer: `<button class="btn" id="noCancel">Volver a la factura</button><div class="gap" style="flex:1"></div>
        <button class="btn" id="siCancel" style="background:var(--crit);border-color:var(--crit);color:#fff">${icon("trash")}Sí, cancelar la factura</button>`,
      after(el) {
        $("#noCancel", el).addEventListener("click", closeSheet);
        $("#siCancel", el).addEventListener("click", () => {
          soltarApartado();
          if (w.VENX) w.VENX.revertir();
          D.bitacora.unshift({
            id: "BTC" + Date.now(), fecha: new Date(), usuario: S.vendedor, rol: "Caja", locId: S.locId,
            accion: "Canceló la factura en curso",
            detalle: `${n} líneas · ${c(t.total)} · ${cli ? cli.nom : "consumidor final"}`,
            sev: "Media", antes: c(t.total), despues: "—", ip: "10.2.14.8"
          });
          S.cart.lineas = [];
          S.cart.draft = null;
          S.posSel = null;
          closeSheet();
          toast("Factura cancelada", "Se limpió la pantalla y se eliminó el borrador. Quedó en la bitácora.", "cr");
          A.refresh();
          setTimeout(() => { const sc = $("#posScan"); if (sc) sc.focus(); }, 40);
        });
      }
    });
  }

  function guardarProforma() {
    if (!S.cart.lineas.length) return toast("La factura está vacía", "Agregue artículos antes de guardar una proforma.", "in");
    if (!S.cart.cliId) { toast("Seleccione un cliente", "La proforma necesita un cliente identificado.", "wa"); return elegirCliente(); }
    const lineas = lineasFiscales();
    const t = cartTot();
    D.seq.PROF++;
    const cons = "PROF-" + String(D.seq.PROF).padStart(6, "0");
    D.proformas.unshift({
      id: "PF-" + D.seq.PROF, cons, tipo: "Proforma", fecha: D.ahora(), clienteId: S.cart.cliId,
      locId: S.locId, lineas, ...t, vence: new Date(D.HOY.getTime() + 15 * 86400000),
      estado: "Vigente", origen: "Mostrador", vendedor: S.vendedor
    });
    toast("Proforma " + cons + " guardada", "Queda en Cotizaciones y pedidos, lista para convertirse en factura sin redigitar.", "ok");
    A.refresh();
  }

  /* control de crédito antes de cobrar: mora, límite y sobregiro autorizado del día */
  function revisarCredito(cli, total) {
    const V = w.VENX;
    if (!cli || !cli.limite) return { error: "Este cliente no tiene crédito aprobado. Cámbielo a contado o pida el crédito en Clientes › Crédito." };
    const disp = cli.limite - cli.saldo, exceso = Math.max(0, total - disp);
    const bq = V ? V.bloqueo(cli.id) : null;
    const ficha = V && V.FICHA[cli.id];
    const sob = ficha && ficha.sobregiros.find(x => V.esHoy(x.fecha) && !x.usado && x.monto >= exceso);
    if ((bq && bq.k === "cr") || exceso > 0) {
      if (sob) return { sobregiro: sob, aviso: "Se usa el sobregiro que autorizó " + sob.autorizo + " hoy (" + c(sob.monto) + ")." };
      return { error: (bq && bq.k === "cr" ? bq.t + ". " + bq.d : "La factura pasa el crédito disponible por " + c(exceso) + ".") + " Gerencia puede autorizar un sobregiro en Clientes › Crédito." };
    }
    return { aviso: bq ? bq.d : "" };
  }
  const ALT_MEDIOS = [["cash", "Efectivo"], ["card", "Tarjeta"], ["phone", "SINPE móvil"], ["bank", "Transferencia"], ["file", "Cheque"], ["wallet", "Anticipo"], ["cash", "Dólares"]];
  /* efectivo: puede pasar del total y da vuelto (siempre en colones) */
  const EFECTIVO_M = { "Efectivo": true, "Dólares": true };
  function cobrar() {
    if (!D.puedeEmitir(S.locId, S.term)) return toast(
      "Esta terminal no emite comprobantes",
      "Solo las cajas de las tiendas facturan. Cambie a una tienda y a una de sus terminales en la barra superior.", "cr");
    /* sin turno abierto no hay a quién cuadrarle el efectivo */
    const V = w.VENX;
    if (V && !V.turnoDe(S.locId, S.term)) return toast(
      "La caja " + S.term + " no tiene turno abierto",
      "Abra el turno con su fondo en Ventas › Caja y turnos antes de cobrar.", "cr");
    const sinAutorizar = pendientes().length;
    if (sinAutorizar) return toast(
      sinAutorizar === 1 ? "Falta una autorización de margen" : "Faltan " + sinAutorizar + " autorizaciones de margen",
      "Abra la línea marcada en rojo y solicite la autorización. La factura no se aplica mientras tanto.", "cr");
    const t = cartTot();
    const cli = cliCart();
    const credito = S.cart.condicion === "Crédito";
    const rc = credito ? revisarCredito(cli, t.total) : null;
    if (rc && rc.error) return toast("No se puede facturar a crédito", rc.error, "cr");
    const pagos = [];
    const pagado = () => pagos.reduce((s, x) => s + x.monto, 0);
    const pendiente = () => Math.max(0, t.total - pagado());
    const autorizados = cli ? ["El titular"].concat(cli.autorizados || []) : [];
    openSheet({
      title: credito ? "Factura a crédito" : "Cobro de la factura", sub: `${cli ? cli.nom : "Consumidor final"} · ${c(t.total)}`,
      body: credito ? `
        <div class="grid g2" style="gap:12px">
          <div class="field" style="margin:0"><label for="pOC">Orden de compra del cliente</label><input id="pOC" placeholder="Opcional · sale en la factura"></div>
          <div class="field" style="margin:0"><label for="pRet">Retira</label><select id="pRet">${autorizados.map(x => `<option>${esc(x)}</option>`).join("")}</select></div></div>
        <div style="margin-top:12px;display:flex;justify-content:space-between;font-size:13px"><span>Crédito disponible</span><span class="num b">${c(cli.limite - cli.saldo)}</span></div>
        ${rc.aviso ? `<div style="margin-top:10px;padding:10px 12px;border-radius:9px;background:var(--warn-soft,var(--surface-2));border:1px solid var(--hair);font-size:12.5px">${icon("alert")} ${esc(rc.aviso)}</div>` : ""}
        <div style="margin-top:12px;padding:12px 14px;border-radius:10px;background:var(--accent-soft);border:1px solid var(--accent-line);display:flex;gap:10px">${icon("info")}
          <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">Condición 02 · crédito a ${cli.plazo} días. El <strong>Recibo Electrónico de Pago</strong> se emite cuando entre el dinero.</div></div>`
        : `<div class="grid" style="grid-template-columns:repeat(3,1fr);gap:8px" id="medios">
          ${ALT_MEDIOS.map((m, i) => `<button class="btn" style="flex-direction:column;padding:13px 8px;gap:5px" data-medio="${m[1]}" aria-pressed="${i === 0}">${icon(m[0])}${m[1]}<kbd style="font-size:10px">Alt+${i + 1}</kbd></button>`).join("")}
        </div>
        <div class="grid g2" style="gap:12px;margin-top:14px">
          <div class="field" style="margin:0"><label for="monto" id="montoLbl">Monto</label><input id="monto" class="num" style="font-size:20px;font-weight:600;text-align:right;padding:10px 12px" value="${grp(t.total)}"><div class="sx-hint" id="usdHint"></div></div>
          <div class="field" style="margin:0"><label for="pRef">Referencia</label><input id="pRef" placeholder="Autorización, SINPE o n.º de cheque"></div></div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn sm" id="addPago">${icon("plus")}Agregar este pago y seguir con otro medio</button></div>
        <div id="pagosLista" style="margin-top:10px"></div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:10px;padding-top:10px;border-top:1px solid var(--hair-2)">
          <span style="font-size:13px;font-weight:600" id="vueltoLbl">Vuelto</span>
          <span class="num" id="vuelto" style="font-size:21px;font-weight:700;color:var(--ok)">₡0</span></div>`
        + `<div style="margin-top:12px;padding:12px 14px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);display:flex;gap:10px">${icon("shield")}
          <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">Al aplicar: se firma y ${S.offline ? "se encola para" : "se envía a"} Hacienda, se imprime el comprobante, baja el inventario y se genera el asiento contable${credito ? " y la cuenta por cobrar" : ""}.</div></div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="okPay">${icon("check")}Aplicar</button>`,
      after(el) {
        let medio = "Efectivo";
        $$("[data-cerrar]", el).forEach(b => b.addEventListener("click", closeSheet));
        const mo = $("#monto", el), okB = $("#okPay", el);
        /* en dólares el monto se digita en US$ y se recibe al tipo de cambio de compra */
        const tc = D.tcDe(D.ahora());
        const leerUsd = () => (mo ? parseFloat(mo.value.replace(/\s/g, "").replace(",", ".")) || 0 : 0);
        const leer = () => (!mo ? 0 : medio === "Dólares" ? Math.round(leerUsd() * tc.compra) : parseInt(mo.value.replace(/\D/g, ""), 10) || 0);
        const pagoActual = () => {
          const x = { medio, monto: leer(), ref: $("#pRef", el).value.trim() };
          if (medio === "Dólares") { x.usd = leerUsd(); x.tc = tc.compra; }
          return x;
        };
        /* lo que se aplicaría si se presiona Aplicar ahora: los pagos agregados más el que está en pantalla */
        const propuesta = () => (leer() > 0 && pagos.length < 4 ? pagos.concat([pagoActual()]) : pagos.slice());
        const ponerMonto = col => { mo.value = medio === "Dólares" ? dec(Math.ceil(col / tc.compra * 100) / 100, 2) : grp(col); };
        const pintar = () => {
          if (credito) return;
          $("#pagosLista", el).innerHTML = pagos.map((x, i) => `<div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:6px 0;border-bottom:1px solid var(--hair-2)">
            <span>${esc(x.medio)}${x.usd ? ` <span class="dim">· US$ ${dec(x.usd, 2)}</span>` : ""}${x.ref ? ` <span class="dim">· ${esc(x.ref)}</span>` : ""}</span><span style="display:flex;gap:8px;align-items:center"><span class="num b">${c(x.monto)}</span><button class="btn sm" data-quitar="${i}" aria-label="Quitar pago">✕</button></span></div>`).join("");
          $$("[data-quitar]", el).forEach(b => b.addEventListener("click", () => { pagos.splice(+b.dataset.quitar, 1); ponerMonto(pendiente()); pintar(); }));
          $("#montoLbl", el).textContent = medio === "Dólares" ? "Monto en US$" : "Monto";
          $("#usdHint", el).textContent = medio === "Dólares" ? "US$ " + dec(leerUsd(), 2) + " × ₡" + dec(tc.compra, 2) + " (compra) = " + c(leer()) : "";
          const pr = propuesta(), suma = pr.reduce((s, x) => s + x.monto, 0), dif = suma - t.total;
          const noEfectivo = pr.filter(x => !EFECTIVO_M[x.medio]).reduce((s, x) => s + x.monto, 0);
          const e = $("#vuelto", el), lbl = $("#vueltoLbl", el);
          lbl.textContent = dif < 0 ? "Falta por cobrar" : "Vuelto";
          e.textContent = c(Math.abs(dif));
          e.style.color = dif < 0 ? "var(--crit)" : "var(--ok)";
          /* solo el efectivo da vuelto; los demás medios no pueden pasar el total */
          okB.disabled = dif < 0 || noEfectivo > t.total || (dif > 0 && !pr.some(x => EFECTIVO_M[x.medio]));
          $("#addPago", el).disabled = pagos.length >= 3 || leer() <= 0 || leer() >= pendiente();
        };
        const elegir = b => {
          $$("[data-medio]", el).forEach(x => x.setAttribute("aria-pressed", "false"));
          const antes = medio, col = leer();
          b.setAttribute("aria-pressed", "true"); medio = b.dataset.medio;
          /* al cambiar de medio el monto se conserva en colones (o se convierte a dólares) */
          if (antes !== medio) ponerMonto(!EFECTIVO_M[medio] ? Math.min(col, pendiente()) : col);
          pintar();
        };
        $$("[data-medio]", el).forEach(b => b.addEventListener("click", () => elegir(b)));
        if (mo) {
          mo.addEventListener("input", pintar);
          $("#addPago", el).addEventListener("click", () => {
            const x = pagoActual();
            if (x.monto <= 0) return;
            if (!EFECTIVO_M[medio]) x.monto = Math.min(x.monto, pendiente());
            pagos.push(x);
            ponerMonto(pendiente()); $("#pRef", el).value = "";
            pintar(); mo.focus(); mo.select();
          });
          el.addEventListener("keydown", e => {
            if (e.altKey && /^Digit[1-7]$/.test(e.code)) { e.preventDefault(); const b = $$("[data-medio]", el)[+e.code.slice(5) - 1]; if (b) elegir(b); }
          });
          setTimeout(() => { mo.focus(); mo.select(); }, 40);
        }
        pintar();
        okB.addEventListener("click", () => {
          let aplicados = [];
          if (!credito) {
            const pr = propuesta();
            /* el vuelto se da en colones: el efectivo en colones se registra solo por lo
               que queda en la caja; los dólares entran completos y, si pasan del total,
               el vuelto sale como un pago negativo de la caja en colones */
            const noEf = pr.filter(x => !EFECTIVO_M[x.medio]).reduce((s, x) => s + x.monto, 0);
            const usdCol = pr.filter(x => x.medio === "Dólares").reduce((s, x) => s + x.monto, 0);
            let restoEf = Math.max(0, t.total - noEf - usdCol);
            aplicados = pr.map(x => ({ ...x })).filter(x => {
              if (x.medio !== "Efectivo") return true;
              x.monto = Math.min(x.monto, restoEf); restoEf -= x.monto; return x.monto > 0;
            });
            const vueltoUsd = noEf + usdCol - t.total;
            if (usdCol && vueltoUsd > 0) aplicados.push({ medio: "Efectivo", monto: -vueltoUsd, vuelto: true });
            const anticipo = aplicados.filter(x => x.medio === "Anticipo").reduce((s, x) => s + x.monto, 0);
            const favor = cli ? cli.saldoFavor || 0 : 0;
            if (anticipo > favor)
              return toast("El anticipo no alcanza", (cli ? cli.nom + " tiene " + c(favor) + " a favor" : "Consumidor final no tiene anticipos") + "; se intentó aplicar " + c(anticipo) + ".", "cr");
          }
          const principal = aplicados.filter(x => !x.vuelto).sort((a, b) => b.monto - a.monto)[0];
          let doc;
          try { doc = D.emitir({
            tipo: cli ? "FE" : "TE", locId: S.locId, term: S.term,
            clienteId: S.cart.cliId, vendedor: S.vendedor,
            lineas: lineasFiscales(),
            condicion: S.cart.condicion, medio: credito ? "Crédito" : principal.medio, pagos: aplicados,
            ordenCompra: credito ? $("#pOC", el).value.trim() : "", retira: credito ? $("#pRet", el).value : "",
            hacienda: S.offline ? "En cola" : "Aceptado", situacion: S.offline ? "3" : "1", fecha: D.ahora()
          }); } catch (e) { return toast("No se aplicó la factura", e.message, "cr"); }
          if (w.VENX) w.VENX.consumir(doc.cons);
          const ant = D.pagadoCon(doc, "Anticipo");
          if (ant && cli) cli.saldoFavor -= ant;
          if (rc && rc.sobregiro) rc.sobregiro.usado = doc.cons;
          closeSheet();
          S.cart = { cliId: S.cart.cliId, condicion: S.cart.condicion, lineas: [], draft: null, apartado: [] };
          S.posSel = null;
          toast("Factura " + doc.cons + " aplicada",
            `${S.offline ? "Queda en cola para Hacienda." : "Aceptada por Hacienda."} ${doc.pagos.length > 1 ? "Cobrada con " + D.mediosTxt(doc) + ". " : ""}Bajó el inventario y generó el asiento${credito ? " y la cuenta por cobrar" : ""}.`, "ok");
          A.refresh();
        });
      }
    });
  }

  /* ══ RUTAS Y TRANSPORTE ══════════════════════════════════════ */
  A.screen("rutas", {
    title: "Rutas y transporte",
    sub: () => "≈40 vehículos · el flete sale del tarifario, no del criterio de una persona",
    render(v) {
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Rutas de hoy", D.rutas.length, { txt: D.rutas.filter(r => r.estado === "En ruta").length + " en camino", dir: "" })}
          ${stat("Entregas programadas", D.rutas.reduce((s, r) => s + r.entregas, 0), { txt: "cada una asociada a un documento de venta", dir: "" })}
          ${stat("Kilómetros del día", D.rutas.reduce((s, r) => s + r.km, 0) + " km", { txt: "para calcular el costo real de la entrega", dir: "" })}
          ${stat("Ingreso por flete", c(D.rutas.reduce((s, r) => s + r.tarifa * r.entregas, 0)), { txt: "según el tarifario vigente", dir: "" }, "var(--ok)")}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Rutas del día",
        body: table({
          cols: [
            { t: "Ruta", fmt: r => `<b>${esc(r.nom)}</b><span class="sub">${r.km} km</span>` },
            { t: "Vehículo", fmt: r => esc(r.vehiculo) },
            { t: "Chofer", fmt: r => esc(r.chofer) },
            { t: "Entregas", r: true, cls: "mono", fmt: r => r.entregas },
            { t: "Tarifa base", r: true, cls: "mono", fmt: r => grp(r.tarifa) },
            { t: "Estado", fmt: r => tag(r.estado, r.estado === "Completada" ? "ok" : r.estado === "En ruta" ? "ac" : "wa") }
          ], rows: D.rutas
        })
      })}
          ${card({
        title: "Tarifario de transporte", hint: "parametrizado por zona y peso",
        body: table({
          cols: [
            { t: "Zona", fmt: r => esc(r.zona) },
            { t: "Hasta 5 t", r: true, cls: "mono", fmt: r => (r.hasta5t ? grp(r.hasta5t) : '<span class="dim">cotiza</span>') },
            { t: "Hasta 10 t", r: true, cls: "mono", fmt: r => (r.hasta10t ? grp(r.hasta10t) : '<span class="dim">cotiza</span>') },
            { t: "Más de 10 t", r: true, cls: "mono", fmt: r => (r.mas10t ? grp(r.mas10t) : '<span class="dim">cotiza</span>') }
          ], rows: D.tarifario
        }) + `<div style="padding:12px 16px;border-top:1px solid var(--hair-2);font-size:12.5px;color:var(--ink-2);line-height:1.55;display:flex;gap:9px">${icon("info")}
          <span>El cálculo del flete deja de depender del criterio de una persona. Si el vehículo va sobrecargado, el sistema avisa antes de cargar.</span></div>`
      })}
        </div></div>`;
    }
  });

  /* ══ CUENTAS POR COBRAR ══════════════════════════════════════ */
  const diasDoc = d => Math.floor((D.HOY - d.fecha) / 86400000);
  const plazoDe = d => (D.cliById[d.clienteId] ? D.cliById[d.clienteId].plazo : 30);
  A.screen("cxc", {
    title: "Cuentas por cobrar",
    sub: () => "Antigüedad de saldos y gestión de cobro",
    render(v) {
      /* lo vencido primero: es lo que hay que gestionar hoy */
      const pend = D.documentos.filter(d => d.saldo > 0)
        .sort((a, b) => (diasDoc(b) - plazoDe(b)) - (diasDoc(a) - plazoDe(a)));
      const buckets = [
        { l: "Por vencer", f: d => diasDoc(d) <= plazoDe(d), k: "d1" },
        { l: "1 a 30 días", f: d => diasDoc(d) > plazoDe(d) && diasDoc(d) <= plazoDe(d) + 30, k: "d2" },
        { l: "31 a 60 días", f: d => diasDoc(d) > plazoDe(d) + 30 && diasDoc(d) <= plazoDe(d) + 60, k: "d3" },
        { l: "61 a 90 días", f: d => diasDoc(d) > plazoDe(d) + 60 && diasDoc(d) <= plazoDe(d) + 90, k: "d4" },
        { l: "Más de 90 días", f: d => diasDoc(d) > plazoDe(d) + 90, k: "d5" }
      ];
      const total = pend.reduce((s, d) => s + d.saldo, 0);
      A._cxc = pend;
      v.innerHTML = `<div class="wrap">
        ${card({
        title: "Antigüedad de saldos", hint: "sobre " + c(total) + " por cobrar",
        body: `<div class="aging">${buckets.map(b => {
          const r = pend.filter(b.f), t = r.reduce((s, d) => s + d.saldo, 0);
          return `<div class="ag ${b.k}"><div class="agv">${c(t)}</div><div class="agl">${esc(b.l)} · ${r.length} documentos</div></div>`;
        }).join("")}</div>`
      })}
        ${card({
        title: "Documentos por cobrar", hint: pend.length + " con saldo",
        actions: `<button class="btn" id="recall">${icon("chat")}Recordar por WhatsApp a los vencidos</button>`,
        body: table({
          h: "calc(100dvh - 420px)",
          cols: [
            { t: "Documento", cls: "mono", fmt: r => esc(r.cons) },
            { t: "Cliente", fmt: r => `${esc(cliNom(r.clienteId))}<span class="sub">${esc(D.cliById[r.clienteId] ? D.cliById[r.clienteId].ced : "")}</span>` },
            { t: "Emitida", cls: "mono", fmt: r => fecha(r.fecha) },
            { t: "Plazo", r: true, cls: "mono", fmt: r => plazoDe(r) + " d" },
            {
              t: "Antigüedad", r: true, cls: "mono", fmt: r => {
                const x = diasDoc(r) - plazoDe(r);
                return x > 0 ? `<b style="color:${x > 60 ? "var(--crit)" : "var(--warn)"}">${x} d vencida</b>` : '<span class="mut">al día</span>';
              }
            },
            { t: "Total", r: true, cls: "mono", fmt: r => grp(r.total) },
            { t: "Saldo", r: true, cls: "mono", fmt: r => `<b>${grp(r.saldo)}</b>` },
            { t: "", r: true, fmt: (r, i) => `<button class="btn sm pri" data-pay="${i}">Aplicar pago</button>` }
          ],
          rows: pend,
          rowCls: r => { const x = diasDoc(r) - plazoDe(r); return x > 60 ? "cr" : x > 0 ? "wa" : ""; }
        })
      })}</div>`;
    },
    wire(v) {
      $("#recall", v).addEventListener("click", () => {
        toast("Recordatorios en cola", "El agente de WhatsApp escribirá a los clientes con factura vencida y adjuntará el estado de cuenta.", "in");
        A.go("whatsapp");
      });
      $$("[data-pay]", v).forEach(b => b.addEventListener("click", () => aplicarPago(A._cxc[+b.dataset.pay])));
    }
  });

  function aplicarPago(d) {
    openSheet({
      title: "Aplicar pago", sub: `${d.cons} · ${cliNom(d.clienteId)} · saldo ${c(d.saldo)}`,
      body: `<div class="grid" style="grid-template-columns:repeat(3,1fr);gap:8px">
          ${[["bank", "Transferencia"], ["phone", "SINPE móvil"], ["cash", "Efectivo"]].map((m, i) =>
        `<button class="btn" style="flex-direction:column;padding:15px 8px;gap:6px" data-m="${m[1]}" aria-pressed="${i === 0}">${icon(m[0])}${m[1]}</button>`).join("")}
        </div>
        <div class="field" style="margin-top:16px"><label for="pm">Monto a aplicar</label>
          <input id="pm" class="num" style="font-size:20px;text-align:right;font-weight:600;padding:10px 12px" value="${grp(d.saldo)}"></div>
        <div style="margin-top:16px;padding:12px 14px;border-radius:10px;background:var(--accent-soft);border:1px solid var(--accent-line);display:flex;gap:10px">${icon("info")}
          <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">Al aplicar el pago el sistema emite el <strong>Recibo Electrónico de Pago</strong> del monto recibido y declara el IVA en el mes del REP. Es obligatorio desde el 1.º de setiembre de 2025 para las ventas a crédito con IVA diferido.</div></div>`,
      footer: `<button class="btn" id="cancPago">Cancelar</button><div class="gap"></div><button class="btn pri" id="okp">${icon("check")}Aplicar y emitir REP</button>`,
      after(el) {
        let medio = "Transferencia";
        $$("[data-m]", el).forEach(b => b.addEventListener("click", () => {
          $$("[data-m]", el).forEach(x => x.setAttribute("aria-pressed", "false"));
          b.setAttribute("aria-pressed", "true"); medio = b.dataset.m;
        }));
        $("#cancPago", el).addEventListener("click", closeSheet);
        $("#okp", el).addEventListener("click", () => {
          const m = parseInt($("#pm", el).value.replace(/\D/g, ""), 10) || 0;
          /* el REP sale de la caja que cobra, no de la que facturó */
          const r = w.FIS.aplicarCobro(d, { monto: m, medio, locId: S.locId, term: S.term, offline: S.offline });
          if (r.error) return toast("No se aplicó el cobro", r.error, "cr");
          closeSheet();
          toast("REP " + r.rep.cons + " emitido", (S.offline ? "Queda en cola para Hacienda. " : "") + "El pago quedó aplicado y el IVA diferido pasó a IVA por pagar de este mes.", "ok");
          A.refresh();
        });
      }
    });
  }
})(window);
