/* ═══════════════════════════════════════════════════════════════
   Inventario — lo que Santa Rosa hace hoy en Neo, pero que se lleva
   solo. Seis opciones, una por tarea de la bodega:
   Pendientes de bodega · Catálogo · Existencias · Traslados ·
   Conteos y ajustes · Reposición. Los datos de la automatización
   viven en inv-auto.js (window.INVX).
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, S = w.S, U = w.UI, I = w.INVX;
  const { $, $$, esc, norm, grp, c, dec, kg, fecha, fechaL, fh, hora, icon, tag, card, stat, table, seg, onSeg, donut,
    fichaCell, openSheet, closeSheet, toast, locNom, provNom, artOf, empty, prog, bars } = U;

  const marcar = (text, q) => {
    if (!q) return esc(text);
    const t = norm(q).split(/\s+/).filter(Boolean), n = norm(text), hits = [];
    t.forEach(x => { const i = n.indexOf(x); if (i > -1) hits.push([i, i + x.length]); });
    if (!hits.length) return esc(text);
    hits.sort((a, b) => a[0] - b[0]);
    let out = "", cur = 0;
    hits.forEach(([a, b]) => { if (a < cur) return; out += esc(text.slice(cur, a)) + "<mark>" + esc(text.slice(a, b)) + "</mark>"; cur = b; });
    return out + esc(text.slice(cur));
  };
  const filtrar = q => q
    ? D.articulos.filter(a => norm(q).split(/\s+/).filter(Boolean)
      .every(t => norm(a.cod + " " + a.desc + " " + a.marca + " " + a.sub + " " + (a.ean || "") + " " + D.famById[a.fam].nom).includes(t)))
    : D.articulos;
  const cant = (n, a) => I.fmtCant(n, a);
  const nombre = s => String(s || "").split(" ")[0];
  const locOpts = (sel, f) => D.locales.filter(f || (() => true)).map(l => `<option value="${l.id}" ${l.id === sel ? "selected" : ""}>${esc(l.nom)}</option>`).join("");
  const nota = (html, ic) => `<div style="display:flex;gap:10px;padding:11px 13px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);font-size:12.5px;color:var(--ink-2);line-height:1.55">${icon(ic || "info", 'style="flex:none;color:var(--accent)"')}<div>${html}</div></div>`;
  const hoyStr = D.HOY.toDateString();

  /* ═════════════════════════════════════════════════════════════
     1 · PENDIENTES DE BODEGA — lo que necesita a una persona hoy
     ═════════════════════════════════════════════════════════════ */
  let pbAmbito = "local";
  const GRUPOS = [
    ["Recibir y despachar", "truck"], ["Contar y ajustar", "check"], ["Clientes y pedidos", "users"], ["Catálogo y precios", "box"]
  ];
  A.screen("bodega", {
    title: "Pendientes de bodega",
    sub: () => {
      const P = I.pendientes(pbAmbito === "local" ? S.locId : null, S.locId);
      return (P.length ? P.length + " asuntos para hoy" : "Nada pendiente") + " · " + (pbAmbito === "local" ? locNom(S.locId) : "todos los locales") + " · lo demás corre solo";
    },
    extra: () => seg("pba", [{ v: "local", t: locNom(S.locId) }, { v: "todos", t: "Todos los locales" }], pbAmbito),
    render(v) {
      const P = I.pendientes(pbAmbito === "local" ? S.locId : null, S.locId);
      const ventasHoy = D.documentos.filter(d => d.fecha.toDateString() === hoyStr).length;
      const sug = I.sugeridoCedi();
      const exact = D.locales.filter(l => I.exactitud[l.id] != null);
      const hecho = [
        { n: ventasHoy, t: "ventas de hoy descontaron su existencia y su costo" },
        { n: sug.reduce((s, x) => s + x.lineas.length, 0), t: "líneas en el traslado sugerido del CEDI a " + sug.length + " tiendas" },
        { n: I.PRECIOS.length, t: "cambios de costo detectados en las compras" },
        { n: I.CONTRA.length, t: "ventas contra pedido con seguimiento hasta el despacho" },
        { n: I.conteoDe(S.locId).items.length, t: "artículos elegidos para el conteo de hoy en " + locNom(S.locId) }
      ];
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
        title: "Lo que el sistema hizo solo", hint: "hoy",
        body: hecho.map(h => `<div class="hl"><b>${grp(h.n)}</b><span>${esc(h.t)}</span></div>`).join("")
      })}
            ${card({
        title: "Exactitud del inventario", hint: "último conteo de cada local",
        body: bars(exact.map(l => ({ n: l.nom, v: Math.max(0.3, I.exactitud[l.id] - 90), lab: dec(I.exactitud[l.id], 1) + " %", cls: I.exactitud[l.id] < 96 ? "below" : "good" })), { max: 10 })
          + `<div class="mut" style="font-size:12px;margin-top:8px">La barra empieza en 90 %. Menos de 96 % pide revisar cómo se está contando.</div>`
      })}
            ${card({
        title: "Atajos",
        body: `<div style="display:flex;flex-wrap:wrap;gap:8px">
            <button class="btn sm" data-atajo="nuevo">${icon("plus")}Nuevo artículo</button>
            <button class="btn sm" data-ir="traslados|sugerido">${icon("truck")}Traslados del CEDI</button>
            <button class="btn sm" data-ir="ajustes|conteo">${icon("check")}Conteo de hoy</button>
            <button class="btn sm" data-atajo="segunda">${icon("box")}Marcar producto de segunda</button>
            <button class="btn sm" data-ir="reposicion|sugerido">${icon("sparkle")}Sugerido de compra</button></div>`
      })}
          </div>
        </div></div>`;
    },
    wire(v) {
      A.wireIr(v);
      onSeg(document, "pba", x => { pbAmbito = x; A.refresh(); });
      $$("[data-atajo]", v).forEach(b => b.addEventListener("click", () => (b.dataset.atajo === "nuevo" ? nuevoArticulo() : marcarSegunda())));
    }
  });

  /* ═════════════════════════════════════════════════════════════
     2 · CATÁLOGO — Artículos · Precios · Códigos y etiquetas ·
         Carga masiva
     ═════════════════════════════════════════════════════════════ */
  if (!S.catTab) S.catTab = "Producto";
  if (S.catQ == null) S.catQ = "";
  const fotoTile = (a, big) => `<span class="foto ${big ? "big" : ""} ${a.fotos ? "" : "vacia"}" aria-label="${a.fotos ? a.fotos + " fotos" : "sin foto"}">${icon(a.tipo === "Servicio" ? "wrench" : "box")}${a.fotos ? `<b>${a.fotos}</b>` : ""}</span>`;

  function articulos(v) {
    let lista = filtrar(S.catQ).filter(a => a.tipo === S.catTab);
    let a = D.artById[S.catSel];
    if (!a || a.tipo !== S.catTab || (S.catQ && !lista.some(x => x.id === a.id))) a = lista[0];
    const nx = I.NUEVOS_XML.filter(x => x.estado === "Por crear");
    const banner = nx.length ? `<div class="stepbar"><div class="sbt"><b>${nx.length} artículos llegaron en facturas de proveedor y no existen en el catálogo</b>
        <span>${esc(nx.map(x => x.desc).join(" · "))}. El sistema los prellena con lo que dice la factura; solo hay que confirmarlos.</span></div>
        <div class="sba"><button class="btn pri sm" data-nx="${nx[0].id}">${icon("plus")}Crear el primero</button><button class="btn sm" id="verNx">Ver los ${nx.length}</button></div></div>` : "";
    if (!a) { v.innerHTML = `<div class="wrap">${banner}${card({ body: empty("search", "Sin resultados", "Ningún " + S.catTab.toLowerCase() + " coincide con «" + S.catQ + "».") })}</div>`; return; }
    S.catSel = a.id;
    const esServicio = a.tipo === "Servicio";
    const fam = D.famById[a.fam];
    const ex = D.existencias[a.id] || {};
    const kx = D.kardex.filter(k => k.artId === a.id).slice(-8).reverse();
    const compras = D.compras.filter(o => o.lineas.some(l => l.artId === a.id)).slice(0, 5);
    const ultima = compras[0] ? compras[0].lineas.find(l => l.artId === a.id) : null;
    const ubAqui = I.ubic(a.id, S.locId);
    const cp = I.CODPROV[a.id];
    const noHab = D.locales.filter(l => !ex[l.id]);
    const fv = S.catFicha || "donde";
    v.innerHTML = `<div class="wrap">${banner}<div class="split">
        ${card({
      body: `<div class="seg" style="width:100%;margin-bottom:9px">
            ${["Producto", "Servicio"].map(tp => `<button data-cattab="${tp}" aria-pressed="${S.catTab === tp}" style="flex:1;text-align:center">${tp}s</button>`).join("")}</div>
          <div class="tb-search" style="width:100%;margin-bottom:8px">${icon("search")}<input id="catQ" value="${esc(S.catQ)}" placeholder="Código, código de barras, descripción o palabra suelta" aria-label="Buscar en el catálogo"></div>
          <div class="mut" style="font-size:12px;margin-bottom:6px">${grp(lista.length)} ${S.catTab === "Producto" ? "productos" : "servicios"} · busca por palabra suelta y tolera acentos</div>
          <div class="mitems">${lista.slice(0, 80).map(x => {
        const tot = x.tipo === "Producto" ? D.stockTotal(x.id) : null;
        return `<button class="mitem" data-sel="${x.id}" aria-selected="${x.id === a.id}">
              <span style="flex:1;min-width:0"><span class="itd">${marcar(x.desc, S.catQ)}</span>
              <span class="itc">${esc(x.cod)} · ${esc(D.famById[x.fam].nom)}${x.nuevo ? " · nuevo" : ""}</span></span>
              ${tot != null ? tag(cant(tot, x), tot < 0 ? "cr" : tot <= 0 ? "cr" : tot < 40 ? "wa" : "mu") : tag("Servicio", "mu")}</button>`;
      }).join("")}</div>`
    })}
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
          ${card({
      body: `<div style="display:flex;gap:15px;align-items:flex-start;flex-wrap:wrap">
            ${fotoTile(a, true)}
            <div style="flex:1;min-width:220px">
              <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
                ${tag(a.tipo, "acc", esServicio ? "wrench" : "box")}
                ${esServicio ? tag("Sin existencia ni peso", "mu") : a.ean ? tag(a.eanInterno ? "Código interno" : "Con código de barras", "ok", "check") : tag("Sin código de barras", "warn", "alert")}
                ${tag("CABYS al día", "ok", "check")}
                ${a.decimales ? tag("Se vende con decimales", "acc") : ""}${a.contraPedido ? tag("Se vende contra pedido", "wa") : ""}${a.nuevo ? tag("Nuevo", "ok") : ""}</div>
              <h3 style="font-size:19.5px;margin-top:8px">${esc(a.desc)}</h3>
              <div class="mut" style="font-size:13px;margin-top:2px">${esc(fam.nom)} › ${esc(a.sub)}${a.marca && a.marca !== "—" ? " · " + esc(a.marca) : ""} · <span class="num">${esc(a.cod)}</span></div>
              ${esServicio ? "" : `<div style="margin-top:7px;font-size:13px;display:flex;align-items:center;gap:6px">${icon("pin", 'style="width:15px;height:15px;color:var(--accent)"')}<span>${esc(locNom(S.locId))}: <b>${esc(I.ubicTexto(ubAqui))}</b></span></div>`}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn sm" id="btnCopiar">${icon("copy")}Copiar</button>
              <button class="btn sm" id="btnFoto">${icon("upload")}Agregar foto</button>
              <button class="btn sm" id="btnEtiqueta">${icon("print")}${esServicio ? "Ficha" : "Etiqueta"}</button>
              ${esServicio ? "" : `<button class="btn sm" data-ir="existencias|kardex:${a.id}">${icon("history")}Kardex</button>`}</div>
          </div>
          <div class="ficha" style="margin:15px -17px -16px;border-top:1px solid var(--hair-2)">
            ${esServicio ? fichaCell("Precio", c(a.precio || 0)) : fichaCell("Precio de venta", c(a.precio))}
            ${esServicio ? "" : fichaCell("Costo promedio", c(a.costo))}
            ${esServicio ? "" : fichaCell("Margen", dec(a.margen) + ` %<span class="sub ui">mínimo de la familia ${fam.min} %</span>`, a.margen < fam.min ? "var(--crit)" : "var(--ok)")}
            ${esServicio ? fichaCell("Unidad", esc(a.unidad)) : fichaCell("Existencia total", cant(D.stockTotal(a.id), a) + " " + esc(a.unidad) + `<span class="sub ui">habilitado en ${Object.keys(ex).length} locales</span>`)}
          </div>`
    })}
          ${esServicio ? card({
      title: "Sobre este servicio",
      body: `<div style="font-size:13.5px;color:var(--ink-2);line-height:1.6">Los servicios no manejan existencia ni peso: se facturan directo, con su propia cuenta contable. El taller, la mano de obra, el flete y los patrocinios entran por aquí y no ensucian el inventario.</div>`
    }) : `
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            ${seg("fichaV", [{ v: "donde", t: "Dónde está" }, { v: "venta", t: "Cómo se vende" }, { v: "hist", t: "Historial" }], fv)}
            <span class="mut" style="font-size:12.5px">${fv === "donde" ? "existencia, ubicación y mínimo en cada local" : fv === "venta" ? "presentaciones, precios y códigos" : "movimientos recientes y compras al proveedor"}</span>
          </div>
          ${fv !== "venta" ? "" : `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
            ${card({
      title: "Cómo se compra y cómo se vende", hint: "una sola existencia, en la unidad base",
      body: table({
        cols: [
          { t: "Presentación", fmt: p => `<b>${esc(p.u)}</b>${p.base ? '<span class="sub ui">unidad base</span>' : ""}` },
          { t: "Equivale a", r: true, cls: "mono", fmt: p => cant(p.f, a) + " " + esc(a.unidad) },
          { t: "Uso", fmt: p => [p.compra ? "compra" : "", p.venta ? "venta" : ""].filter(Boolean).join(" y ") || "—" },
          { t: "Precio", r: true, cls: "mono", fmt: p => p.venta ? grp(Math.round(a.precio * p.f * (1 - (p.desc || 0) / 100))) + (p.desc ? `<span class="sub ui">${p.desc} % por ${esc(p.u.toLowerCase())}</span>` : "") : '<span class="dim">—</span>' }
        ], rows: a.pres || []
      }) + `<div class="mut" style="font-size:12px;margin-top:10px;line-height:1.5">${a.decimales ? "Se vende en fracciones: la caja acepta decimales (" + (a.unidad === "m" ? "12,5 m" : a.unidad === "kg" ? "2,5 kg" : "0,5 " + esc(a.unidad)) + ")." : "Se vende por unidades enteras."} ${I.presCompra(a).f > 1 ? "Una compra por " + esc(I.presCompra(a).u.toLowerCase()) + " entra como " + cant(I.presCompra(a).f, a) + " " + esc(a.unidad) + "." : "Se compra y se vende en " + esc(a.unidad) + "."}${a.peso ? " Pesa " + kg(a.peso) + " por " + esc(a.unidad) + ", que es lo que arma el peso del camión." : ""}</div>`
    })}
            ${card({
      title: "Códigos", hint: "todo lo que la caja y la recepción pueden escanear",
      body: `<dl class="kv">
          <dt>Código interno</dt><dd class="num">${esc(a.cod)}</dd>
          <dt>Código de barras</dt><dd class="num">${a.ean ? esc(a.ean) + (a.eanInterno ? " · interno" : "") : '<span style="color:var(--warn)">no tiene</span>'}</dd>
          <dt>Código del proveedor</dt><dd class="num">${cp ? esc(cp.cod) + " · " + esc(provNom(cp.provId)) : "—"}</dd>
          <dt>CABYS</dt><dd class="num">${esc(a.cabys)}</dd>
          <dt></dt><dd style="font-weight:500;font-size:12px">${esc(I.cabysDesc(a.cabys))}</dd>
          <dt>Impuesto</dt><dd>IVA 13 %</dd></dl>
          ${a.ean ? "" : `<button class="btn sm pri" id="genCod" style="margin-top:12px">${icon("scan")}Generar código interno y etiqueta</button>`}`
    })}
          </div>`}
          ${fv !== "donde" ? "" : card({
      title: "Existencia y ubicación por local", hint: "el artículo existe solo donde corresponde",
      actions: noHab.length ? `<button class="btn sm" id="habLoc">${icon("plus")}Habilitar en otro local</button>` : "",
      body: table({
        cols: [
          { t: "Local", fmt: r => `${esc(r.loc.nom)}${r.loc.id === S.locId ? ' <span class="dim" style="font-size:11.5px">(actual)</span>' : ""}<span class="sub ui">${r.loc.tipo === "cedi" ? "Centro de distribución" : r.loc.tipo === "bodega" ? "Bodega" : "Tienda"}</span>` },
          { t: "Ubicación", fmt: r => r.ub ? `<span class="num" style="font-size:12px">${esc(r.ub)}</span><span class="sub ui">${esc(I.ubicTexto(r.ub))}</span>` : tag("Sin ubicación", "wa") },
          { t: "Existencia", r: true, cls: "mono", fmt: r => `<span style="${r.e.cant < 0 ? "color:var(--crit);font-weight:700" : ""}">${cant(r.e.cant, a)}</span>` },
          { t: "Comprometido", r: true, cls: "mono", fmt: r => (r.e.comp ? `<span style="color:var(--warn)">${cant(r.e.comp, a)}</span>` : "0") },
          { t: "Disponible", r: true, cls: "mono", fmt: r => `<b>${cant(r.e.cant - r.e.comp, a)}</b>` },
          { t: "Mínimo", r: true, cls: "mono", fmt: r => `<span class="mut">${cant(r.e.min, a)}</span>` },
          { t: "Estado", fmt: r => r.e.cant < 0 ? tag("Negativo", "cr", "alert") : r.e.cant - r.e.comp <= 0 ? tag("Quiebre", "cr", "alert") : r.e.cant < r.e.min ? tag("Bajo mínimo", "wa", "alert") : tag("Sano", "ok", "check") }
        ],
        rows: Object.keys(ex).map(id => ({ loc: D.locales.find(x => x.id === id), e: ex[id], ub: I.ubic(a.id, id) })).filter(x => x.loc),
        rowCls: r => (r.e.cant - r.e.comp <= 0 ? "cr" : r.e.cant < r.e.min ? "wa" : "")
      })
    })}
          ${fv !== "hist" ? "" : `<div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start">
            ${card({
      title: "Últimos movimientos", hint: "entradas y salidas con saldo corrido",
      body: kx.length ? table({
        cols: [
          { t: "Fecha", cls: "mono", fmt: r => fecha(r.fecha) },
          { t: "Tipo", fmt: r => tag(r.tipo, r.entrada ? "ok" : "mu", r.entrada ? "arrowup" : "arrowdown") },
          { t: "Local", fmt: r => esc(locNom(r.locId)) },
          { t: "Entrada", r: true, cls: "mono", fmt: r => (r.entrada ? `<b style="color:var(--ok)">+${cant(r.entrada, a)}</b>` : "") },
          { t: "Salida", r: true, cls: "mono", fmt: r => (r.salida ? `<b style="color:var(--crit)">−${cant(r.salida, a)}</b>` : "") },
          { t: "Saldo", r: true, cls: "mono", fmt: r => cant(r.saldo, a) }
        ], rows: kx
      }) : `<div class="mut" style="font-size:12.5px">${a.nuevo ? "Artículo nuevo: nace sin existencia y entra con su primera compra." : "Sin movimientos en la demo."}</div>`
    })}
            ${card({
      title: "Compras y último costo", hint: "la base de la decisión de compra",
      body: `<dl class="kv">
            <dt>Último costo</dt><dd class="num">${ultima ? c(ultima.costo) : c(a.costo)}</dd>
            <dt>Última compra</dt><dd>${compras[0] ? fecha(compras[0].fecha) + " · " + esc(provNom(compras[0].provId)) : "—"}</dd>
            <dt>Días de entrega</dt><dd>${a.provId ? I.LEAD[a.provId] + " días" : "—"}</dd></dl>
          ${compras.length ? `<div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">${compras.map(o => {
        const l = o.lineas.find(x => x.artId === a.id);
        return `<div style="display:flex;align-items:center;gap:9px;font-size:12.5px;padding:7px 10px;border-radius:9px;background:var(--surface-2);border:1px solid var(--hair)">
              <span class="num mut">${fecha(o.fecha)}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(provNom(o.provId))}</span>
              <span class="num">${cant(l.cant, a)}</span><span class="num b">${c(l.costo)}</span></div>`;
      }).join("")}</div>` : ""}`
    })}
          </div>`}`}
        </div></div></div>`;
  }
  function articulosWire(v) {
    A.wireIr(v);
    onSeg(v, "fichaV", x => { S.catFicha = x; A.refresh(); });
    $$("[data-cattab]", v).forEach(b => b.addEventListener("click", () => { S.catTab = b.dataset.cattab; S.catSel = null; A.refresh(); }));
    $$("[data-sel]", v).forEach(b => b.addEventListener("click", () => { S.catSel = b.dataset.sel; A.refresh(); }));
    const q = $("#catQ", v);
    if (q) q.addEventListener("input", () => {
      S.catQ = q.value; A.refresh();
      setTimeout(() => { const e = $("#catQ"); if (e) { e.focus(); e.setSelectionRange(e.value.length, e.value.length); } }, 0);
    });
    const a = D.artById[S.catSel];
    const on = (id, fn) => { const b = $("#" + id, v); if (b) b.addEventListener("click", fn); };
    on("btnEtiqueta", () => toast("Etiqueta enviada a la impresora", a.desc + " · código de barras, precio y ubicación del " + fecha(D.HOY) + ".", "ok"));
    on("btnFoto", () => { I.agregarFoto(a.id); toast("Foto agregada", "La usan el vendedor, el catálogo de autogestión y el agente de WhatsApp.", "ok"); A.refresh(); });
    on("btnCopiar", () => nuevoArticulo({ desde: a }));
    on("genCod", () => { const e = I.generarCodigo(a.id); toast("Código " + e + " generado", "La etiqueta quedó en la cola de impresión de cada local donde existe.", "ok"); A.refresh(); });
    on("habLoc", () => habilitarLocal(a));
    on("verNx", () => verNuevosXml());
    $$("[data-nx]", v).forEach(b => b.addEventListener("click", () => crearDesdeXml(b.dataset.nx)));
  }

  function habilitarLocal(a) {
    const libres = D.locales.filter(l => !(D.existencias[a.id] || {})[l.id]);
    openSheet({
      title: "Habilitar en otro local", sub: a.desc + " · el artículo existe solo donde se habilita",
      body: `<div style="display:flex;flex-direction:column;gap:8px">${libres.map(l => `<label class="rc"><input type="checkbox" value="${l.id}"><span><b>${esc(l.nom)}</b><span>${l.tipo === "cedi" ? "Centro de distribución" : l.tipo === "bodega" ? "Bodega" : "Tienda"}</span></span></label>`).join("")}</div>
        <div style="margin-top:14px">${nota("Nace sin existencia en ese local. La existencia entra con un traslado o con una compra.")}</div>`,
      footer: `<button class="btn" id="hlC">Cancelar</button><div style="flex:1"></div><button class="btn pri" id="hlOk">${icon("check")}Habilitar</button>`,
      after: root => {
        $("#hlC", root).addEventListener("click", closeSheet);
        $("#hlOk", root).addEventListener("click", () => {
          const ids = $$("input:checked", root).map(x => x.value);
          if (!ids.length) return toast("Marque al menos un local", "", "wa");
          ids.forEach(l => { D.existencias[a.id][l] = { cant: 0, comp: 0, min: 6 }; });
          I.anotar("Habilitó artículo en locales", a.desc + " · " + ids.map(locNom).join(", "), I.GENTE.compras);
          closeSheet(); toast("Habilitado en " + ids.length + " local" + (ids.length === 1 ? "" : "es"), "Queda sin ubicación hasta que la bodega la asigne.", "ok"); A.refresh();
        });
      }
    });
  }

  function verNuevosXml() {
    const nx = I.NUEVOS_XML;
    openSheet({
      wide: true, tight: true, title: "Artículos nuevos en facturas de proveedor", sub: "Llegaron en el XML y no existen en el catálogo",
      body: table({
        cols: [
          { t: "Artículo", fmt: x => `<b>${esc(x.desc)}</b><span class="sub ui">${esc(provNom(x.provId))} · código ${esc(x.codProv)}</span>` },
          { t: "Factura", cls: "mono", fmt: x => `<span class="mut">${esc(x.factura.slice(-10))}</span>` },
          { t: "Cant.", r: true, cls: "mono", fmt: x => grp(x.cant) },
          { t: "Costo", r: true, cls: "mono", fmt: x => grp(x.costo) },
          { t: "Parecido a", fmt: x => { const p = D.articulos.find(a => a.cod === x.parecido); return p ? esc(p.desc) : "—"; } },
          { t: "", r: true, fmt: x => x.estado === "Por crear" ? `<button class="btn sm pri" data-nx2="${x.id}">Crear</button>` : tag("Creado", "ok", "check") }
        ], rows: nx
      }),
      after: root => $$("[data-nx2]", root).forEach(b => b.addEventListener("click", () => crearDesdeXml(b.dataset.nx2)))
    });
  }
  function crearDesdeXml(id) {
    const x = I.NUEVOS_XML.find(n => n.id === id);
    if (!x) return;
    const p = D.articulos.find(a => a.cod === x.parecido);
    nuevoArticulo({
      desde: p, xml: x,
      val: { desc: x.desc, fam: x.fam, sub: x.sub, unidad: x.unidad, marca: x.marca, cabys: x.cabys, costo: x.costo, peso: x.peso, provId: x.provId, codProv: x.codProv }
    });
  }

  /* ── alta y copia de artículos ─────────────────────────────── */
  function nuevoArticulo(o) {
    o = o || {};
    const src = o.desde || null, v0 = Object.assign({}, src ? {
      desc: src.desc, fam: src.fam, sub: src.sub, unidad: src.unidad, marca: src.marca, cabys: src.cabys,
      costo: src.costo, peso: src.peso, decimales: src.decimales, contraPedido: src.contraPedido,
      locales: Object.keys(D.existencias[src.id] || {}), provId: src.provId
    } : { fam: "FGE", unidad: "Unid", locales: ["CD"].concat(D.tiendas.map(l => l.id)) }, o.val || {});
    if (o.xml) v0.locales = ["CD"];
    const tipoIni = src && src.tipo === "Servicio" ? "Servicio" : "Producto";
    const cod0 = I.siguienteCodigo();
    const famOpts = sel => D.familias.map(f => `<option value="${f.id}" ${f.id === sel ? "selected" : ""}>${esc(f.nom)}</option>`).join("");
    const subOpts = (fam, sel) => (D.subcats[fam] || []).map(s => `<option ${s === sel ? "selected" : ""}>${esc(s)}</option>`).join("");
    openSheet({
      wide: true,
      title: o.xml ? "Crear artículo desde la factura del proveedor" : src ? "Copiar artículo" : "Nuevo artículo",
      sub: o.xml ? o.xml.desc + " · " + provNom(o.xml.provId) + " · la factura ya trae descripción, costo y código" : src ? "A partir de «" + src.desc + "» · se copia todo menos el código" : "Nace sin existencia: entra con su primera compra",
      body: `<div class="grid g2" style="align-items:start">
        <div class="wrap">
          ${U.field("Tipo", `<div class="seg" data-seg="naTipo">${["Producto", "Servicio"].map(t => `<button type="button" data-v="${t}" aria-pressed="${t === tipoIni}">${t}</button>`).join("")}</div>`)}
          <div class="grid g2" style="gap:10px">
            ${U.field("Código", `<input class="inp num" id="naCod" value="${esc(cod0)}" autocomplete="off"><span id="naCodOk" style="font-size:12px"></span>`)}
            ${U.field("Marca", `<input class="inp" id="naMarca" value="${esc(v0.marca || "")}">`)}
          </div>
          ${U.field("Descripción", `<input class="inp" id="naDesc" value="${esc(v0.desc || "")}" placeholder="Como la dice el cliente: Tubo PVC SDR-26 1&quot; × 6 m">`)}
          <div class="grid g2" style="gap:10px">
            ${U.field("Familia", `<select id="naFam">${famOpts(v0.fam)}</select>`)}
            ${U.field("Subfamilia", `<select id="naSub">${subOpts(v0.fam, v0.sub)}</select>`)}
          </div>
          ${U.field("CABYS", `<div id="naCabys"></div><input class="inp num" id="naCabysCod" value="${esc(v0.cabys || "")}" placeholder="13 dígitos" style="margin-top:6px">`)}
          <div class="grid g2" style="gap:10px">
            ${U.field("Unidad base", `<select id="naUni">${I.UNIDADES.map(u => `<option ${u === v0.unidad ? "selected" : ""}>${u}</option>`).join("")}</select>`)}
            ${U.field("Peso por unidad (kg)", `<input class="inp num" id="naPeso" type="number" step="0.01" min="0" value="${v0.peso || ""}">`)}
          </div>
          <label class="rc"><input type="checkbox" id="naDec" ${v0.decimales ? "checked" : ""}><span><b>Se vende con decimales</b><span>Metros de cable, kilos de clavo, medio metro de arena</span></span></label>
          <div class="grid g2" style="gap:10px">
            ${U.field("Se compra por (opcional)", `<input class="inp" id="naPresU" placeholder="Rollo de 100 m, caja de 25 kg">`)}
            ${U.field("Equivale a", `<input class="inp num" id="naPresF" type="number" min="1" step="1" placeholder="100">`)}
          </div>
        </div>
        <div class="wrap">
          <div class="grid g2" style="gap:10px">
            ${U.field("Costo", `<input class="inp num" id="naCosto" type="number" min="0" step="1" value="${v0.costo || ""}">`)}
            ${U.field("Precio de venta", `<input class="inp num" id="naPrecio" type="number" min="0" step="5" value="">`)}
          </div>
          <div id="naMargen"></div>
          ${U.field("Código de barras", `<div style="display:flex;gap:8px"><input class="inp num" id="naEan" value="" placeholder="Escanee el código del empaque"><button type="button" class="btn sm" id="naEanGen">Generar</button></div>`)}
          ${U.field("Dónde existe", `<div style="display:flex;flex-wrap:wrap;gap:6px">${D.locales.map(l => `<label class="chipck"><input type="checkbox" value="${l.id}" ${(v0.locales || []).indexOf(l.id) >= 0 ? "checked" : ""}><span>${esc(l.nom.replace("CEDI ", ""))}</span></label>`).join("")}</div>`)}
          ${U.field("Ubicación en " + locNom("L1"), `<input class="inp num" id="naUbic" placeholder="D2-15 · pasillo, estante y casilla">`)}
          <label class="rc"><input type="checkbox" id="naContra" ${v0.contraPedido ? "checked" : ""}><span><b>Se puede vender sin existencia</b><span>Contra pedido: se factura, queda en negativo y se despacha cuando llega la compra</span></span></label>
          ${nota(o.xml ? "Al crearlo, la línea de la factura del proveedor queda ligada al artículo y la recepción ya lo reconoce." : "La familia pone las cuentas contables y el margen mínimo. Las fotos se agregan desde la ficha.")}
        </div></div>`,
      footer: `<button class="btn" id="naC">Cancelar</button><div style="flex:1"></div><button class="btn pri" id="naOk">${icon("check")}${src && !o.xml ? "Crear la copia" : "Crear artículo"}</button>`,
      after: root => {
        let tipo = tipoIni, ean = "", eanInt = false;
        const g = id => $("#" + id, root);
        onSeg(root, "naTipo", x => { tipo = x; });
        const pintarCod = () => {
          const ok = I.codigoLibre(g("naCod").value);
          g("naCodOk").innerHTML = g("naCod").value.trim() ? (ok ? '<span style="color:var(--ok)">Disponible</span>' : '<span style="color:var(--crit)">Ya existe: escoja otro</span>') : "";
        };
        const pintarCabys = () => {
          const s = I.sugerirCabys(g("naDesc").value);
          g("naCabys").innerHTML = s.length ? `<div style="display:flex;flex-direction:column;gap:5px">${s.map(x => `<button type="button" class="cabys ${x.cod === g("naCabysCod").value ? "sel" : ""}" data-cab="${x.cod}"><span class="num">${x.cod}</span><span style="flex:1">${esc(x.desc)}</span><span class="conf">${x.conf} %</span></button>`).join("")}</div>`
            : '<div class="mut" style="font-size:12px">Escriba la descripción y el sistema sugiere el código de Hacienda.</div>';
          $$("[data-cab]", root).forEach(b => b.addEventListener("click", () => { g("naCabysCod").value = b.dataset.cab; pintarCabys(); }));
        };
        const pintarMargen = () => {
          const costo = +g("naCosto").value || 0, precio = +g("naPrecio").value || 0, fam = g("naFam").value, f = D.famById[fam];
          const m = precio ? (precio - costo) / precio * 100 : 0;
          const bajo = tipo !== "Servicio" && precio < I.pisoPrecio(costo, fam);
          g("naMargen").innerHTML = costo && precio ? `<div style="font-size:12.5px;padding:8px 11px;border-radius:9px;border:1px solid ${bajo ? "var(--crit-line)" : "var(--ok-line)"};background:${bajo ? "var(--crit-soft)" : "var(--ok-soft)"};color:${bajo ? "var(--crit)" : "var(--ok)"};font-weight:600">
              Margen ${dec(m, 1)} % · mínimo de ${esc(f.nom)}: ${f.min} %${bajo ? " · por debajo del mínimo" : ""}</div>` : "";
        };
        const sugerirPrecio = () => { const costo = +g("naCosto").value || 0; if (costo) g("naPrecio").value = I.precioSugerido(costo, g("naFam").value); pintarMargen(); };
        g("naCod").addEventListener("input", pintarCod);
        g("naDesc").addEventListener("input", () => { pintarCabys(); });
        g("naCabysCod").addEventListener("input", pintarCabys);
        g("naFam").addEventListener("change", () => { g("naSub").innerHTML = subOpts(g("naFam").value); sugerirPrecio(); });
        g("naCosto").addEventListener("input", sugerirPrecio);
        g("naPrecio").addEventListener("input", pintarMargen);
        g("naUni").addEventListener("change", () => { g("naDec").checked = I.UNID_DEC.indexOf(g("naUni").value) >= 0; });
        g("naEanGen").addEventListener("click", () => { eanInt = true; ean = "200" + String(Date.now()).slice(-10); g("naEan").value = ean; toast("Código interno generado", "Se imprime la etiqueta al crear el artículo.", "ok"); });
        pintarCod(); pintarCabys(); sugerirPrecio();
        g("naC").addEventListener("click", closeSheet);
        g("naOk").addEventListener("click", () => {
          const pu = g("naPresU").value.trim(), pf = +g("naPresF").value || 0;
          const res = I.crear({
            tipo, cod: g("naCod").value, desc: g("naDesc").value, fam: g("naFam").value, sub: g("naSub").value, marca: g("naMarca").value,
            unidad: g("naUni").value, decimales: g("naDec").checked, peso: g("naPeso").value, costo: g("naCosto").value, precio: g("naPrecio").value,
            cabys: g("naCabysCod").value.trim(), ean: g("naEan").value.trim(), eanInterno: eanInt, contraPedido: g("naContra").checked,
            locales: tipo === "Servicio" ? [] : $$(".chipck input:checked", root).map(x => x.value), ubic: g("naUbic").value.trim(),
            presCompra: pu && pf > 1 ? { u: pu, f: pf } : null, desde: src && !o.xml ? src.cod : null,
            origen: o.xml ? "Factura " + o.xml.factura : null, provId: v0.provId, codProv: v0.codProv
          });
          if (!res.ok) return toast("Falta completar", res.err.join(" · "), "wa");
          if (o.xml) o.xml.estado = "Creado";
          closeSheet();
          S.catTab = res.a.tipo; S.catSel = res.a.id; S.catQ = "";
          toast("Artículo " + res.a.cod + " creado", res.a.tipo === "Producto" ? "Nace sin existencia en " + Object.keys(D.existencias[res.a.id]).length + " locales. " + (res.a.ean ? "Su etiqueta quedó en la cola de impresión." : "Queda en la lista de artículos sin código de barras.") : "Listo para facturarse.", "ok");
          A.go("catalogo", "articulos");
        });
      }
    });
  }

  /* ── precios que siguen al costo ─────────────────────────────── */
  let pmFam = "FON", pmPct = 3;
  function precios(v) {
    const P = I.PRECIOS, pend = P.filter(p => p.estado === "Por aprobar");
    const prev = I.previaMasivo(pmFam, pmPct);
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Por revisar", pend.length, { txt: "la compra entró con otro costo", dir: "" }, pend.length ? "var(--warn)" : "var(--ok)")}
          ${stat("Aprobados", P.filter(p => p.estado === "Aprobado").length, { txt: "con su etiqueta en la cola de impresión", dir: "" }, "var(--ok)")}
          ${stat("Se mantienen", P.filter(p => p.estado === "Se mantiene").length, { txt: "el margen absorbe el cambio", dir: "" })}
          ${stat("Etiquetas en cola", I.ETIQ.length, { txt: "precios, códigos y ubicaciones nuevos", dir: "" })}
        </div>
        ${card({
      title: "Costo nuevo, precio propuesto", hint: "el precio propuesto conserva el margen que tenía el artículo",
      actions: pend.length > 1 ? `<button class="btn sm pri" id="prTodos">${icon("check")}Aprobar los ${pend.length}</button>` : "",
      body: table({
        cols: [
          { t: "Artículo", fmt: p => `<b>${esc(D.artById[p.artId].desc)}</b><span class="sub ui">${esc(D.artById[p.artId].cod)} · ${esc(provNom(p.provId))} · ${esc(p.oc)}</span>` },
          { t: "Costo", r: true, cls: "mono", fmt: p => `${grp(p.costoAntes)} → <b>${grp(p.costoNuevo)}</b><span class="sub" style="color:${p.var > 0 ? "var(--crit)" : "var(--ok)"}">${p.var > 0 ? "+" : ""}${dec(p.var, 1)} %</span>` },
          { t: "Precio", r: true, cls: "mono", fmt: p => `${grp(p.precioAntes)} → <b>${grp(p.precioNuevo)}</b>` },
          { t: "Margen", r: true, cls: "mono", fmt: p => dec(D.artById[p.artId].margen, 1) + " %" },
          { t: "", r: true, fmt: p => p.estado === "Por aprobar" ? `<span style="display:inline-flex;gap:6px"><button class="btn sm" data-pm="${p.id}">Mantener</button><button class="btn sm pri" data-pa="${p.id}">Aprobar</button></span>` : tag(p.estado + (p.por ? " · " + nombre(p.por) : ""), p.estado === "Aprobado" ? "ok" : "mu", "check") }
        ], rows: P, rowCls: p => p.estado === "Por aprobar" ? "" : ""
      })
    })}
        <div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Cambio de precios por familia", hint: "con vista previa; nada queda por debajo del margen mínimo",
      body: `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px">
            ${U.field("Familia", `<select id="pmFam">${D.familias.filter(f => !f.servicio).map(f => `<option value="${f.id}" ${f.id === pmFam ? "selected" : ""}>${esc(f.nom)}</option>`).join("")}</select>`)}
            ${U.field("Cambio %", `<input class="inp num" id="pmPct" type="number" step="0.5" value="${pmPct}" style="width:110px">`)}
            <button class="btn pri" id="pmAplicar">${icon("check")}Aplicar a ${prev.filter(r => !r.bajo).length} artículos</button></div>
          ${table({
        h: "320px",
        cols: [
          { t: "Artículo", fmt: r => esc(r.a.desc) },
          { t: "Antes", r: true, cls: "mono", fmt: r => grp(r.antes) },
          { t: "Después", r: true, cls: "mono", fmt: r => `<b>${grp(r.nuevo)}</b>` },
          { t: "Margen", r: true, cls: "mono", fmt: r => `<span style="color:${r.bajo ? "var(--crit)" : "var(--ink)"}">${dec(r.margen, 1)} %</span>` },
          { t: "", fmt: r => r.bajo ? tag("Queda igual", "wa", "alert") : "" }
        ], rows: prev
      })}`
    })}
          ${card({
      title: "Por qué así", hint: "hoy casi no se usa el cambio masivo",
      body: `<div class="mut" style="font-size:12.5px;line-height:1.7">En Neo, el precio queda igual aunque la compra entre más cara, y el margen
        se come solo sin que nadie lo vea. Aquí cada compra con costo distinto propone el precio que conserva el margen. Proveeduría
        lo aprueba o decide mantenerlo, y el estante no se queda con el precio viejo: la etiqueta pasa sola a la cola de impresión
        del local.</div>`
    })}
        </div></div>`;
  }
  function preciosWire(v) {
    $$("[data-pa]", v).forEach(b => b.addEventListener("click", () => { const p = I.aprobarPrecio(b.dataset.pa); toast("Precio aprobado", D.artById[p.artId].desc + " · ₡" + grp(p.precioNuevo) + ". La etiqueta quedó en la cola de cada tienda.", "ok"); A.refresh(); }));
    $$("[data-pm]", v).forEach(b => b.addEventListener("click", () => { I.mantenerPrecio(b.dataset.pm); toast("Se mantiene el precio", "El margen baja por el costo nuevo; queda en la bitácora.", "in"); A.refresh(); }));
    const t = $("#prTodos", v); if (t) t.addEventListener("click", () => { const n = I.PRECIOS.filter(p => p.estado === "Por aprobar").map(p => I.aprobarPrecio(p.id)).length; toast(n + " precios aprobados", "Las etiquetas quedaron en la cola de impresión.", "ok"); A.refresh(); });
    const f = $("#pmFam", v), p = $("#pmPct", v);
    if (f) f.addEventListener("change", () => { pmFam = f.value; A.refresh(); });
    if (p) p.addEventListener("change", () => { pmPct = +p.value || 0; A.refresh(); });
    const ap = $("#pmAplicar", v); if (ap) ap.addEventListener("click", () => { const n = I.aplicarMasivo(pmFam, pmPct); toast(n + " precios cambiados", D.famById[pmFam].nom + " · " + (pmPct > 0 ? "+" : "") + pmPct + " %. Etiquetas en la cola.", "ok"); A.refresh(); });
  }

  /* ── códigos, ubicaciones, fotos y etiquetas ──────────────────── */
  function codigos(v) {
    const sc = I.sinCodigo(), su = I.sinUbicacion(), sf = I.sinFoto();
    const et = {};
    I.ETIQ.forEach(e => { (et[e.locId] = et[e.locId] || []).push(e); });
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Sin código de barras", sc.length, { txt: "de " + D.articulos.filter(a => a.tipo === "Producto").length + " en la demo · cerca de 800 en producción", dir: "" }, sc.length ? "var(--warn)" : "var(--ok)")}
          ${stat("Sin ubicación", su.length, { txt: "en alguna tienda: el vendedor no los encuentra", dir: "" }, su.length ? "var(--warn)" : "var(--ok)")}
          ${stat("Sin foto", sf.length, { txt: "la necesitan el vendedor y el agente de WhatsApp", dir: "" })}
          ${stat("CABYS", "Al día", { txt: "revisado contra Hacienda el " + I.CABYS_ACT.fecha, dir: "up" }, "var(--ok)")}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Etiquetas por imprimir", hint: "precios, códigos y ubicaciones nuevos",
      body: Object.keys(et).length ? Object.keys(et).map(l => `<div class="hl" style="justify-content:space-between;align-items:center">
            <span><b style="min-width:0;text-align:left;font-family:var(--ui)">${esc(locNom(l))}</b> · ${et[l].length} etiqueta${et[l].length === 1 ? "" : "s"}
              <span class="sub ui">${esc([...new Set(et[l].map(e => e.motivo.toLowerCase()))].join(", "))}</span></span>
            <button class="btn sm" data-imp="${l}">${icon("print")}Imprimir</button></div>`).join("")
        : empty("check", "Nada en la cola", "Cada precio, código o ubicación nueva manda su etiqueta aquí.")
    })}
          ${card({
      title: "Artículos sin código de barras", hint: "se genera un código interno y su etiqueta",
      actions: sc.length ? `<button class="btn sm pri" id="genTodos">${icon("scan")}Generar los ${sc.length}</button>` : "",
      body: sc.length ? table({
        h: "300px",
        cols: [
          { t: "Artículo", fmt: a => `${esc(a.desc)}<span class="sub">${esc(a.cod)}</span>` },
          { t: "Ventas al mes", r: true, cls: "mono", fmt: a => grp(I.ventaMes(a.id, "CD")) },
          { t: "", r: true, fmt: a => `<button class="btn sm" data-gen="${a.id}">Generar</button>` }
        ], rows: sc.slice().sort((x, y) => I.ventaMes(y.id, "CD") - I.ventaMes(x.id, "CD"))
      }) + `<div style="margin-top:10px">${nota("Los que más se venden van primero: son los que más se digitan en la caja. Levantar los 800 códigos físicos es un servicio aparte que Smart Serve cotiza por separado.")}</div>` : empty("check", "Todos tienen código", "La caja y la recepción escanean todo el catálogo.")
    })}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
          ${card({
      title: "Sin ubicación en el estante", hint: "pasillo, estante y casilla",
      body: su.length ? table({
        h: "300px",
        cols: [
          { t: "Artículo", fmt: r => `${esc(r.a.desc)}<span class="sub">${esc(r.a.cod)}</span>` },
          { t: "Local", fmt: r => esc(locNom(r.locId)) },
          { t: "Ubicación", fmt: (r, i) => `<input class="inp num" data-ubi="${i}" placeholder="${esc(r.a.ubic)}" style="width:96px;padding:5px 8px">` },
          { t: "", r: true, fmt: (r, i) => `<button class="btn sm" data-ubok="${i}">Guardar</button>` }
        ], rows: su
      }) : empty("check", "Todo ubicado", "Cada artículo tiene su lugar en cada tienda.")
    })}
          ${card({
      title: "Sin foto", hint: "para el vendedor, el catálogo de autogestión y WhatsApp",
      body: sf.length ? table({
        h: "300px",
        cols: [
          { t: "Artículo", fmt: a => `${esc(a.desc)}<span class="sub">${esc(a.cod)}</span>` },
          { t: "", r: true, fmt: a => `<button class="btn sm" data-foto="${a.id}">${icon("upload")}Agregar</button>` }
        ], rows: sf
      }) : empty("check", "Todos tienen foto", "")
    })}
        </div></div>`;
    A._ubRows = su;
  }
  function codigosWire(v) {
    $$("[data-imp]", v).forEach(b => b.addEventListener("click", () => { const n = I.imprimirEtiquetas(b.dataset.imp); toast(n + " etiquetas enviadas a la impresora", locNom(b.dataset.imp) + " · se pegan en el estante de cada artículo.", "ok"); A.refresh(); }));
    $$("[data-gen]", v).forEach(b => b.addEventListener("click", () => { const e = I.generarCodigo(b.dataset.gen); toast("Código " + e + " generado", "La etiqueta quedó en la cola de impresión.", "ok"); A.refresh(); }));
    const gt = $("#genTodos", v); if (gt) gt.addEventListener("click", () => { const n = I.generarCodigos(I.sinCodigo().map(a => a.id)); toast(n + " códigos internos generados", "Sus etiquetas quedaron en la cola de impresión de cada local.", "ok"); A.refresh(); });
    $$("[data-foto]", v).forEach(b => b.addEventListener("click", () => { I.agregarFoto(b.dataset.foto); toast("Foto agregada", "", "ok"); A.refresh(); }));
    $$("[data-ubok]", v).forEach(b => b.addEventListener("click", () => {
      const i = +b.dataset.ubok, r = A._ubRows[i], inp = $(`[data-ubi="${i}"]`, v);
      const code = (inp.value || inp.placeholder).trim().toUpperCase();
      I.ubicar(r.a.id, r.locId, code); toast("Ubicación guardada", r.a.desc + " · " + locNom(r.locId) + " · " + I.ubicTexto(code), "ok"); A.refresh();
    }));
  }

  /* ── carga masiva con revisión previa ─────────────────────────── */
  let cargaRes = null;
  function carga(v) {
    const C = I.CARGA;
    const filas = C.filas.map(r => ({ r, p: r.importada ? [] : I.validarFila(r) }));
    const buenas = filas.filter(x => !x.r.importada && !x.p.length).length;
    v.innerHTML = `<div class="wrap">
        <div class="stepbar ${C.habilitada ? "ok" : ""}"><div class="sbt"><b>${icon("lock")} La carga masiva está ${C.habilitada ? "habilitada" : "desactivada"}</b>
          <span>${C.habilitada ? "La habilitó " + esc(C.por.nom) + " hasta las 18:00 de hoy. Al importar se vuelve a desactivar sola." : "En la operación normal queda apagada para que nadie cambie el catálogo por error. Se habilita con permiso de gerencia, para una migración o una lista de un proveedor."}</span></div>
          <div class="sba">${C.habilitada ? tag("Habilitada", "ok", "check") : `<button class="btn pri sm" id="cgHab">${icon("shield")}Habilitar con permiso de gerencia</button>`}</div></div>
        ${cargaRes ? `<div class="stepbar ok"><div class="sbt"><b>${cargaRes.ok} artículos importados</b><span>${cargaRes.malas} filas se devolvieron para corregir. La carga quedó desactivada otra vez.</span></div></div>` : ""}
        ${card({
      title: "Revisión antes de guardar", hint: C.archivo,
      actions: `<button class="btn sm" id="cgPlant">${icon("download")}Plantilla</button>${C.habilitada ? `<button class="btn sm pri" id="cgImp" ${buenas ? "" : "disabled"}>${icon("upload")}Importar las ${buenas} filas sin problemas</button>` : ""}`,
      body: table({
        cols: [
          { t: "Código", cls: "mono", fmt: x => esc(x.r.cod) },
          { t: "Descripción", fmt: x => esc(x.r.desc) },
          { t: "Familia", cls: "mono", fmt: x => esc(x.r.fam) },
          { t: "Costo", r: true, cls: "mono", fmt: x => grp(x.r.costo) },
          { t: "Precio", r: true, cls: "mono", fmt: x => grp(x.r.precio) },
          { t: "Revisión", fmt: x => x.r.importada ? tag("Importada", "ok", "check") : x.p.length ? `<span style="color:var(--crit);font-size:12.5px;font-weight:600">${esc(x.p.join(" · "))}</span>` : tag("Lista", "ok", "check") }
        ], rows: filas, rowCls: x => x.p.length ? "cr" : ""
      })
    })}
        ${nota("Cada fila se revisa contra el catálogo antes de guardar: código repetido, familia que no existe, CABYS vigente y margen mínimo. Solo entran las filas sin problemas; las demás se devuelven con el motivo.")}
      </div>`;
  }
  function cargaWire(v) {
    const h = $("#cgHab", v); if (h) h.addEventListener("click", () => { I.habilitarCarga(); toast("Carga masiva habilitada", "Por Adrián Vindas Mora, hasta las 18:00. Queda en la bitácora.", "ok"); A.refresh(); });
    const i = $("#cgImp", v); if (i) i.addEventListener("click", () => { cargaRes = I.importarCarga(); toast(cargaRes.ok + " artículos importados", "Nacen sin existencia en el CEDI. La carga se desactivó sola.", "ok"); A.refresh(); });
    const p = $("#cgPlant", v); if (p) p.addEventListener("click", () => toast("Plantilla descargada", "Las mismas columnas de la ficha del artículo, con ejemplos.", "ok"));
  }

  A.workspace("catalogo", {
    title: "Catálogo",
    onArg: () => { },
    tabs: [
      {
        id: "articulos", t: "Artículos",
        sub: () => "Productos y servicios · " + D.articulos.length + " en la demo, 15 979 en producción",
        badge: () => { const n = I.NUEVOS_XML.filter(x => x.estado === "Por crear").length; return { n, k: "wa", l: n + " artículos nuevos en facturas" }; },
        actions: () => `<button class="btn pri" id="catNuevo">${icon("plus")}Nuevo artículo</button>`,
        render: articulos, wire: v => { articulosWire(v); const b = $("#catNuevo", document); if (b) b.addEventListener("click", () => nuevoArticulo()); }
      },
      {
        id: "precios", t: "Precios",
        sub: "Cuando la compra entra con otro costo, el precio se revisa solo",
        badge: () => { const n = I.PRECIOS.filter(p => p.estado === "Por aprobar").length; return { n, k: "wa", l: n + " por revisar" }; },
        render: precios, wire: preciosWire
      },
      {
        id: "codigos", t: "Códigos y etiquetas",
        sub: "Código de barras, ubicación en el estante, fotos y etiquetas por imprimir",
        badge: () => { const n = I.ETIQ.length; return { n, k: "", l: n + " etiquetas por imprimir" }; },
        render: codigos, wire: codigosWire
      },
      {
        id: "carga", t: "Carga masiva",
        sub: "Importación por plantilla, con permiso y revisión previa",
        render: carga, wire: cargaWire
      }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     3 · EXISTENCIAS — Por local · Kardex · Comprometido ·
         Segunda y devoluciones
     ═════════════════════════════════════════════════════════════ */
  const kx = { art: null, loc: "Todos", q: "", solo: false };
  function porLocal(v) {
    let lista = (kx.q ? filtrar(kx.q) : D.articulos).filter(a => a.tipo === "Producto");
    const problema = a => Object.values(D.existencias[a.id] || {}).some(e => e.cant < 0 || e.cant - e.comp <= 0 || e.cant < e.min);
    if (kx.solo) lista = lista.filter(problema);
    lista = lista.slice(0, 80);
    A._exRows = lista;
    const cols = [{ t: "Artículo", fmt: r => `<b>${marcar(r.desc, kx.q)}</b><span class="sub">${esc(r.cod)} · ${esc(D.famById[r.fam].nom)} · ${esc(r.unidad)}</span>` }];
    D.locales.forEach(l => cols.push({
      t: l.nom.replace("CEDI ", "").replace("Bodega ", "Bod "), r: true, cls: "mono",
      fmt: r => {
        const e = D.existencias[r.id][l.id];
        if (!e) return '<span class="dim">—</span>';
        const d = e.cant - e.comp;
        return `<span style="${e.cant < 0 ? "color:var(--crit);font-weight:700" : d <= 0 ? "color:var(--crit);font-weight:650" : e.cant < e.min ? "color:var(--warn);font-weight:650" : ""}${l.id === S.locId ? ";text-decoration:underline;text-decoration-color:var(--accent-line);text-underline-offset:3px" : ""}" data-tip="${esc(l.nom)}: ${cant(e.cant, r)} en existencia, ${cant(e.comp, r)} comprometido, mínimo ${cant(e.min, r)} · ${esc(I.ubicTexto(I.ubic(r.id, l.id)))}">${cant(d, r)}</span>`;
      }
    }));
    cols.push({ t: "Total", r: true, cls: "mono", fmt: r => `<b>${cant(D.stockTotal(r.id), r)}</b>` });
    const neg = I.negativos().length;
    v.innerHTML = `<div class="wrap">
        <div class="filters" style="grid-template-columns:minmax(200px,320px) auto 1fr">
          <input class="inp" id="kq" placeholder="Filtrar artículos" value="${esc(kx.q)}">
          <label class="chipck" style="align-self:center"><input type="checkbox" id="kSolo" ${kx.solo ? "checked" : ""}><span>Solo con problemas</span></label>
          <span class="mut" style="font-size:12.5px;align-self:center">${neg ? neg + " en negativo por ventas contra pedido · " : ""}rojo: quiebre · ámbar: bajo el mínimo</span>
        </div>
        ${card({
      title: "Disponible por local", hint: "disponible = existencia − comprometido · toque un artículo para ver su kardex",
      body: table({ h: "calc(100dvh - 360px)", cols, rows: lista, onRow: true })
    })}</div>`;
  }
  function porLocalWire(v) {
    const kq = $("#kq", v);
    if (kq) kq.addEventListener("change", () => { kx.q = kq.value; A.refresh(); });
    const ks = $("#kSolo", v); if (ks) ks.addEventListener("change", () => { kx.solo = ks.checked; A.refresh(); });
    $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => A.go("existencias", "kardex:" + A._exRows[+tr.dataset.i].id)));
  }

  function kardex(v) {
    const art = D.artById[kx.art] || D.articulos.find(a => a.cod === "FER-01455") || D.articulos[0];
    kx.art = art.id;
    let rows = D.kardex.filter(k => k.artId === art.id);
    if (kx.loc !== "Todos") rows = rows.filter(k => k.locId === kx.loc);
    rows = rows.slice().reverse();
    const ent = rows.reduce((s, r) => s + r.entrada, 0), sal = rows.reduce((s, r) => s + r.salida, 0);
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Artículo", `<span style="font-size:15px;font-family:var(--ui);letter-spacing:0">${esc(art.desc)}</span>`, { txt: art.cod + " · " + D.famById[art.fam].nom, dir: "" })}
          ${stat("Entradas", "+" + cant(ent, art), { txt: "compras, traslados y devoluciones", dir: "" }, "var(--ok)")}
          ${stat("Salidas", "−" + cant(sal, art), { txt: "ventas, traslados y merma", dir: "" }, "var(--crit)")}
          ${stat("Existencia total", cant(D.stockTotal(art.id), art), { txt: art.unidad + " en todos los locales", dir: "" })}
        </div>
        ${card({
      title: "Kardex", hint: "cada movimiento con su documento de origen",
      actions: `<select class="inp" id="kloc" style="width:auto"><option>Todos</option>${locOpts(kx.loc)}</select>
            <button class="btn" id="kart">${icon("search")}Cambiar de artículo</button>`,
      body: table({
        h: "calc(100dvh - 440px)",
        cols: [
          { t: "Fecha", cls: "mono", fmt: r => fh(r.fecha) },
          { t: "Movimiento", fmt: r => tag(r.tipo, r.entrada ? "ok" : r.tipo === "Ajuste" ? "wa" : "mu", r.entrada ? "arrowup" : "arrowdown") },
          { t: "Local", fmt: r => esc(locNom(r.locId)) },
          { t: "Documento", cls: "mono", fmt: r => `<span class="mut">${esc(r.doc)}</span>` },
          { t: "Entrada", r: true, cls: "mono", fmt: r => (r.entrada ? `<b style="color:var(--ok)">+${cant(r.entrada, art)}</b>` : "") },
          { t: "Salida", r: true, cls: "mono", fmt: r => (r.salida ? `<b style="color:var(--crit)">−${cant(r.salida, art)}</b>` : "") },
          { t: "Costo unit.", r: true, cls: "mono", fmt: r => grp(r.costo) },
          { t: "Saldo", r: true, cls: "mono", fmt: r => `<b style="${r.saldo < 0 ? "color:var(--crit)" : ""}">${cant(r.saldo, art)}</b>` },
          { t: "Nota", fmt: r => `<span class="mut">${esc(r.nota)}</span>` }
        ], rows
      })
    })}</div>`;
  }
  function kardexWire(v) {
    const kl = $("#kloc", v);
    if (kl) kl.addEventListener("change", e => { kx.loc = e.target.value; A.refresh(); });
    const ka = $("#kart", v);
    if (ka) ka.addEventListener("click", () => openSheet({
      title: "Elegir artículo", tight: true,
      body: table({
        h: "60dvh",
        cols: [
          { t: "Artículo", fmt: r => `<b>${esc(r.desc)}</b><span class="sub">${esc(r.cod)}</span>` },
          { t: "Movimientos", r: true, cls: "mono", fmt: r => D.kardex.filter(k => k.artId === r.id).length },
          { t: "", r: true, fmt: r => `<button class="btn sm" data-k="${r.id}">Ver kardex</button>` }
        ], rows: D.articulos.filter(a => a.tipo === "Producto")
      }),
      after(el) { $$("[data-k]", el).forEach(b => b.addEventListener("click", () => { kx.art = b.dataset.k; closeSheet(); A.refresh(); })); }
    }));
  }

  function comprometido(v) {
    const AP = I.APARTADOS, CP = I.CONTRA;
    const vig = AP.filter(p => p.estado === "Apartado");
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Apartados", vig.length, { txt: "pagados, esperando que el cliente los recoja", dir: "" })}
          ${stat("Vencidos", AP.filter(I.vencido).length, { txt: "pasaron la fecha de retiro", dir: "" }, AP.some(I.vencido) ? "var(--warn)" : "var(--ok)")}
          ${stat("Contra pedido", CP.filter(x => x.estado !== "Despachado").length, { txt: "vendidos sin existencia, con su compra ligada", dir: "" })}
          ${stat("En negativo", I.negativos().length, { txt: "el costo promedio cuenta el negativo como cero", dir: "" }, I.negativos().length ? "var(--crit)" : "var(--ok)")}
        </div>
        ${card({
      title: "Apartados", hint: "la mercadería queda reservada y no se le vende a otro cliente",
      body: table({
        cols: [
          { t: "Cliente", fmt: p => `<b>${esc(p.cli.nom)}</b><span class="sub ui">${esc(p.cli.tel || "")} · factura ${esc(p.doc.slice(-10))}</span>` },
          { t: "Local", fmt: p => esc(locNom(p.locId)) },
          { t: "Artículos", fmt: p => p.lineas.map(l => `${cant(l.cant, l.a)} × ${esc(l.a.desc)}`).join("<br>") },
          { t: "Apartado", cls: "mono", fmt: p => fecha(p.fecha) },
          { t: "Retirar antes de", cls: "mono", fmt: p => `<span style="${I.vencido(p) ? "color:var(--crit);font-weight:700" : ""}">${fecha(p.retiro)}</span>` },
          {
            t: "", r: true, fmt: p => p.estado !== "Apartado" ? tag(p.estado, p.estado === "Entregado" ? "ok" : "mu", "check")
              : `<span style="display:inline-flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${I.vencido(p) ? `<button class="btn sm" data-apa="${p.id}">${icon("chat")}${p.avisado ? "Avisado" : "Avisar"}</button><button class="btn sm" data-apl="${p.id}">Liberar</button>` : ""}<button class="btn sm pri" data-ape="${p.id}">Entregar</button></span>`
          }
        ], rows: AP, rowCls: p => I.vencido(p) ? "wa" : ""
      })
    })}
        ${card({
      title: "Ventas contra pedido", hint: "se facturan sin existencia y se despachan cuando llega la compra",
      body: table({
        cols: [
          { t: "Artículo", fmt: x => `<b>${esc(x.a.desc)}</b><span class="sub">${esc(x.a.cod)}</span>` },
          { t: "Local", fmt: x => esc(locNom(x.locId)) },
          { t: "Cliente", fmt: x => `${esc(x.cli.nom)}<span class="sub ui">factura ${esc(x.doc.slice(-10))} · ${fecha(x.fecha)}</span>` },
          { t: "Cant.", r: true, cls: "mono", fmt: x => cant(x.cant, x.a) },
          { t: "Viene en", cls: "mono", fmt: x => x.oc ? esc(x.oc) : '<span class="dim">sin orden</span>' },
          { t: "Estado", fmt: x => tag(x.estado, x.estado === "Despachado" ? "ok" : x.estado === "Llegó · por despachar" ? "wa" : "mu", x.estado === "Esperando la compra" ? "clock" : "check") },
          { t: "", r: true, fmt: x => x.estado === "Llegó · por despachar" ? `<button class="btn sm pri" data-desp="${x.id}">Despachar</button>` : "" }
        ], rows: CP, rowCls: x => x.estado === "Llegó · por despachar" ? "wa" : ""
      })
    })}
        ${nota("Vender sin existencia es normal en Santa Rosa (bloques, tubos de concreto, láminas a la medida). La existencia queda en negativo y el costo promedio la cuenta como cero, así la compra que entra no arrastra un costo falso. Cuando llega la compra, la venta pasa sola a «por despachar». Contabilidad ve el ajuste de costo en Conciliaciones › Inventario.", "info")}
      </div>`;
  }
  function comprometidoWire(v) {
    $$("[data-apa]", v).forEach(b => b.addEventListener("click", () => { const p = I.avisarApartado(b.dataset.apa); toast("Mensaje enviado por WhatsApp", "A " + p.cli.nom + ": su mercadería apartada lo espera en " + locNom(p.locId) + ".", "ok"); A.refresh(); }));
    $$("[data-apl]", v).forEach(b => b.addEventListener("click", () => { const p = I.liberarApartado(b.dataset.apl); toast("Apartado liberado", "La mercadería vuelve a estar disponible en " + locNom(p.locId) + ". El saldo del cliente queda a favor.", "in"); A.refresh(); }));
    $$("[data-ape]", v).forEach(b => b.addEventListener("click", () => { const p = I.entregarApartado(b.dataset.ape); toast("Apartado entregado", p.cli.nom + " · sale del inventario de " + locNom(p.locId) + ".", "ok"); A.refresh(); }));
    $$("[data-desp]", v).forEach(b => b.addEventListener("click", () => { const x = I.despacharContra(b.dataset.desp); toast("Venta despachada", x.a.desc + " · " + x.cli.nom + ".", "ok"); A.refresh(); }));
  }

  function segunda(v) {
    const SG = I.SEGUNDA, DV = I.DEVOL;
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Por aprobar", SG.filter(s => s.estado === "Por aprobar").length, { txt: "producto de segunda esperando su precio", dir: "" }, SG.some(s => s.estado === "Por aprobar") ? "var(--warn)" : "var(--ok)")}
          ${stat("A la venta", SG.filter(s => s.estado === "A la venta").length, { txt: "se venden como «de segunda» en la caja", dir: "" })}
          ${stat("Por devolver", DV.filter(d => d.estado === "Por devolver").length, { txt: "en la bodega de devoluciones del CEDI", dir: "" })}
          ${stat("Esperando nota de crédito", c(DV.filter(d => /esperando/.test(d.estado)).reduce((s, d) => s + d.monto, 0)), { txt: "mercadería devuelta al proveedor", dir: "" })}
        </div>
        ${card({
      title: "Producto de segunda", hint: "misma existencia, marcada como dañada, con un precio aprobado una sola vez",
      actions: `<button class="btn sm pri" id="sgNuevo">${icon("plus")}Marcar producto de segunda</button>`,
      body: table({
        cols: [
          { t: "Artículo", fmt: s => `<b>${esc(s.a.desc)}</b><span class="sub ui">${esc(s.motivo)} · ${s.fotos} foto${s.fotos === 1 ? "" : "s"}</span>` },
          { t: "Local", fmt: s => esc(locNom(s.locId)) },
          { t: "Cant.", r: true, cls: "mono", fmt: s => cant(s.cant, s.a) },
          { t: "Precio de lista", r: true, cls: "mono", fmt: s => grp(s.a.precio) },
          { t: "Precio de segunda", r: true, cls: "mono", fmt: s => `<b>${grp(s.precio)}</b><span class="sub">margen ${dec((s.precio - s.a.costo) / s.precio * 100, 1)} %</span>` },
          { t: "Marcó", fmt: s => `${esc(nombre(s.por))}${s.aprobo ? `<span class="sub ui">aprobó ${esc(nombre(s.aprobo))}</span>` : ""}` },
          { t: "", r: true, fmt: s => s.estado === "Por aprobar" ? `<button class="btn sm pri" data-sga="${s.id}">Aprobar precio</button>` : tag(s.estado, s.estado === "A la venta" ? "ok" : "mu", "check") }
        ], rows: SG, rowCls: s => s.estado === "Por aprobar" ? "wa" : ""
      })
    })}
        ${card({
      title: "Bodega de devoluciones", hint: "producto defectuoso que se devuelve al proveedor",
      body: table({
        cols: [
          { t: "Artículo", fmt: d => `<b>${esc(d.a.desc)}</b><span class="sub ui">${esc(d.motivo)}</span>` },
          { t: "Proveedor", fmt: d => `${esc(provNom(d.provId))}<span class="sub">${esc(d.oc)}</span>` },
          { t: "Cant.", r: true, cls: "mono", fmt: d => cant(d.cant, d.a) },
          { t: "Monto", r: true, cls: "mono", fmt: d => grp(d.monto) },
          { t: "Desde", cls: "mono", fmt: d => fecha(d.fecha) },
          { t: "", r: true, fmt: d => d.estado === "Por devolver" ? `<button class="btn sm pri" data-dev="${d.id}">Devolver al proveedor</button>` : tag(d.estado, "mu", "clock") }
        ], rows: DV
      })
    })}
        ${nota("Hoy la lámina rayada se vende bajando la utilidad en la caja, y queda como una venta bajo el margen mínimo sin explicación. Aquí se marca una vez como producto de segunda, con foto y motivo; gerencia aprueba su precio y la caja lo vende así sin pedir otra autorización. Queda la traza completa.")}
      </div>`;
  }
  function segundaWire(v) {
    const n = $("#sgNuevo", v); if (n) n.addEventListener("click", () => marcarSegunda());
    $$("[data-sga]", v).forEach(b => b.addEventListener("click", () => aprobarSegundaSheet(b.dataset.sga)));
    $$("[data-dev]", v).forEach(b => b.addEventListener("click", () => { const d = I.devolver(b.dataset.dev); toast("Salió hacia " + provNom(d.provId), d.a.desc + " · queda esperando la nota de crédito, que Contabilidad concilia sola.", "ok"); A.refresh(); }));
  }
  function aprobarSegundaSheet(id) {
    const s = I.SEGUNDA.find(x => x.id === id);
    openSheet({
      title: "Aprobar precio de segunda", sub: s.a.desc + " · " + locNom(s.locId) + " · " + s.cant + " unidades",
      body: `<dl class="kv"><dt>Motivo</dt><dd>${esc(s.motivo)}</dd><dt>Evidencia</dt><dd>${s.fotos} fotos</dd><dt>Costo</dt><dd class="num">${c(s.a.costo)}</dd><dt>Precio de lista</dt><dd class="num">${c(s.a.precio)}</dd></dl>
        <div style="margin-top:14px">${U.field("Precio de segunda (sugerido con " + I.POL.margenSegunda + " % de margen)", `<input class="inp num" id="sgP" type="number" step="5" value="${s.precio}">`)}</div>
        <div style="margin-top:12px">${nota("La caja lo vende a este precio sin pedir autorización otra vez, y la factura dice «de segunda».")}</div>`,
      footer: `<button class="btn" id="sgC">Cancelar</button><div style="flex:1"></div><button class="btn pri" id="sgOk">${icon("check")}Aprobar</button>`,
      after: root => {
        $("#sgC", root).addEventListener("click", closeSheet);
        $("#sgOk", root).addEventListener("click", () => { I.aprobarSegunda(id, null, +$("#sgP", root).value); closeSheet(); toast("Precio de segunda aprobado", "Por " + I.GENTE.gerente.nom + ". Ya se puede vender en la caja.", "ok"); A.refresh(); });
      }
    });
  }
  function marcarSegunda() {
    const ps = D.articulos.filter(a => a.tipo === "Producto");
    openSheet({
      title: "Marcar producto de segunda", sub: "Dañado, rayado o incompleto, pero se puede vender",
      body: `<div class="grid g2" style="gap:10px">
          ${U.field("Artículo", `<select id="msA">${ps.map(a => `<option value="${a.id}">${esc(a.desc)}</option>`).join("")}</select>`)}
          ${U.field("Local", `<select id="msL">${locOpts(S.locId)}</select>`)}
          ${U.field("Cantidad", `<input class="inp num" id="msC" type="number" min="1" value="1">`)}
          ${U.field("Motivo", `<select id="msM"><option>Rayado en la descarga</option><option>Empaque dañado</option><option>Le falta una pieza</option><option>Abollado</option><option>Quebrado en una esquina</option></select>`)}
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;align-items:center"><button class="btn sm" id="msF">${icon("upload")}Tomar foto</button><span class="mut" id="msFn" style="font-size:12.5px">Sin fotos</span></div>
        <div style="margin-top:12px">${nota("Gerencia aprueba el precio. Mientras tanto no se puede vender como producto de segunda.")}</div>`,
      footer: `<button class="btn" id="msCan">Cancelar</button><div style="flex:1"></div><button class="btn pri" id="msOk">${icon("check")}Enviar a aprobación</button>`,
      after: root => {
        let fotos = 0;
        $("#msF", root).addEventListener("click", () => { fotos++; $("#msFn", root).textContent = fotos + " foto" + (fotos === 1 ? "" : "s"); });
        $("#msCan", root).addEventListener("click", closeSheet);
        $("#msOk", root).addEventListener("click", () => {
          if (!fotos) return toast("Falta la foto", "El producto de segunda necesita evidencia para auditoría.", "wa");
          const s = I.marcarSegunda({ artId: $("#msA", root).value, locId: $("#msL", root).value, cant: $("#msC", root).value, motivo: $("#msM", root).value, fotos });
          closeSheet(); toast("Enviado a aprobación", s.a.desc + " · precio sugerido ₡" + grp(s.precio) + ".", "ok"); A.go("existencias", "segunda");
        });
      }
    });
  }

  A.workspace("existencias", {
    title: "Existencias",
    onArg: (tab, dato) => { if (tab === "kardex" && dato && D.artById[dato]) { kx.art = dato; kx.loc = "Todos"; } },
    tabs: [
      { id: "local", t: "Por local", sub: "Disponible en cada tienda, el CEDI y las bodegas", render: porLocal, wire: porLocalWire },
      { id: "kardex", t: "Kardex", sub: "Entradas y salidas de un artículo con saldo corrido", render: kardex, wire: kardexWire },
      {
        id: "comprometido", t: "Apartados y contra pedido", sub: "Lo que ya está vendido y todavía no sale de la tienda",
        badge: () => { const n = I.APARTADOS.filter(I.vencido).length + I.CONTRA.filter(x => x.estado === "Llegó · por despachar").length; return { n, k: "wa", l: n + " por atender" }; },
        render: comprometido, wire: comprometidoWire
      },
      {
        id: "segunda", t: "Segunda y devoluciones", sub: "Producto dañado que se vende con descuento, y lo que vuelve al proveedor",
        badge: () => { const n = I.SEGUNDA.filter(s => s.estado === "Por aprobar").length; return { n, k: "wa", l: n + " por aprobar" }; },
        render: segunda, wire: segundaWire
      }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     4 · TRASLADOS — Sugerido del CEDI · En camino · Historial
     ═════════════════════════════════════════════════════════════ */
  let trSug = null, trSel = null;
  function sugeridoTr(v) {
    if (!trSug) trSug = I.sugeridoCedi();
    const tot = trSug.reduce((s, x) => s + x.lineas.length, 0);
    const pesoTot = trSug.reduce((s, x) => s + I.peso(x.lineas), 0);
    const gi = trSel != null && trSug[trSel] ? trSel : null;
    const g = gi != null ? trSug[gi] : null;
    v.innerHTML = `<div class="wrap">
        ${nota("Calculado con lo que vende cada tienda en quince días y su mínimo, contra lo que hay en el CEDI. Se ajusta la cantidad si hace falta y se despacha: el camión sale con el peso ya calculado.", "sparkle")}
        ${!trSug.length ? card({ body: empty("check", "Las tiendas están abastecidas", "Ninguna tienda está bajo su mínimo en algo que haya en el CEDI.") })
        : !g ? card({
          title: "Lo que cada tienda necesita del CEDI",
          hint: trSug.length + " tiendas · " + grp(tot) + " líneas · " + kg(pesoTot) + " en total",
          body: table({
            cols: [
              { t: "Tienda", fmt: x => `<b>${esc(x.loc.nom)}</b><span class="sub ui">${esc(I.vehiculoPara(I.peso(x.lineas)))}</span>` },
              { t: "Artículos", r: true, cls: "mono", fmt: x => grp(x.lineas.length) },
              { t: "En quiebre", r: true, cls: "mono", fmt: x => { const n = x.lineas.filter(l => l.disp <= 0).length; return n ? `<b style="color:var(--crit)">${n}</b>` : `<span class="mut">0</span>`; } },
              { t: "Bajo el mínimo", r: true, cls: "mono", fmt: x => `<span class="mut">${x.lineas.filter(l => l.disp > 0).length}</span>` },
              { t: "Peso", r: true, cls: "mono", fmt: x => kg(I.peso(x.lineas)) },
              { t: "", r: true, fmt: (x, i) => `<button class="btn sm pri" data-ver="${i}">${icon("truck")}Revisar y despachar</button>` }
            ],
            rows: trSug, onRow: (x, i) => { trSel = i; A.refresh(); }
          })
        }) + nota("Se revisa una tienda a la vez: se abre, se ajustan las cantidades que haga falta y sale el camión.")
        : card({
      title: "CEDI Isabel → " + g.loc.nom, hint: g.lineas.length + " artículos · " + kg(I.peso(g.lineas)) + " · " + I.vehiculoPara(I.peso(g.lineas)),
      actions: `<button class="btn sm" id="trVolver">Todas las tiendas</button><button class="btn sm pri" data-desp="${gi}">${icon("truck")}Despachar</button>`,
      body: table({
        cols: [
          { t: "Artículo", fmt: l => `<b>${esc(l.a.desc)}</b><span class="sub">${esc(l.a.cod)} · CEDI ${esc(I.ubic(l.a.id, "CD") || "")}</span>` },
          { t: "Disponible en tienda", r: true, cls: "mono", fmt: l => `<span style="color:${l.disp <= 0 ? "var(--crit)" : "var(--warn)"}">${cant(l.disp, l.a)}</span>` },
          { t: "Mínimo", r: true, cls: "mono", fmt: l => cant(l.min, l.a) },
          { t: "Hay en el CEDI", r: true, cls: "mono", fmt: l => cant(l.cdDisp, l.a) },
          { t: "A trasladar", r: true, fmt: (l, i) => `<input class="inp num" data-trc="${gi}:${i}" type="number" min="0" step="${l.a.decimales ? "0.5" : "1"}" value="${l.cant}" style="width:92px;padding:5px 8px;text-align:right">` },
          { t: "Peso", r: true, cls: "mono", fmt: l => `<span class="mut">${kg((l.a.peso || 0) * l.cant)}</span>` }
        ], rows: g.lineas
      }), flush: true
    })}</div>`;
  }
  function sugeridoTrWire(v) {
    $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => { trSel = +tr.dataset.i; A.refresh(); }));
    $$("[data-ver]", v).forEach(b => b.addEventListener("click", e => { e.stopPropagation(); trSel = +b.dataset.ver; A.refresh(); }));
    const vol = $("#trVolver", v); if (vol) vol.addEventListener("click", () => { trSel = null; A.refresh(); });
    $$("[data-trc]", v).forEach(inp => inp.addEventListener("change", () => {
      const [g, i] = inp.dataset.trc.split(":").map(Number);
      const l = trSug[g].lineas[i];
      l.cant = Math.max(0, Math.min(l.cdDisp, +inp.value || 0));
      A.refresh();
    }));
    $$("[data-desp]", v).forEach(b => b.addEventListener("click", () => {
      const g = trSug[+b.dataset.desp];
      const lineas = g.lineas.filter(l => l.cant > 0);
      if (!lineas.length) return toast("Nada que despachar", "Todas las cantidades están en cero.", "wa");
      const t = I.crearTraslado("CD", g.loc.id, lineas);
      trSug = null; trSel = null;
      toast("Traslado " + t.cons + " despachado", lineas.length + " líneas hacia " + g.loc.nom + " en " + t.vehiculo + " con " + t.chofer + ". La tienda lo recibe escaneando.", "ok");
      A.refresh();
    }));
  }

  function enCamino(v) {
    const rows = D.traslados.filter(t => t.estado === "En tránsito" || t.estado === "Registrado");
    const difs = I.DIFS;
    A._tcRows = rows;
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("En camino", rows.filter(t => t.estado === "En tránsito").length, { txt: "salieron y la tienda no los ha recibido", dir: "" }, "var(--warn)")}
          ${stat("Por despachar", rows.filter(t => t.estado === "Registrado").length, { txt: "registrados, todavía en el origen", dir: "" })}
          ${stat("Diferencias por aclarar", difs.filter(d => d.estado === "Por aclarar").length, { txt: "llegó menos de lo que salió", dir: "" }, difs.some(d => d.estado === "Por aclarar") ? "var(--crit)" : "var(--ok)")}
          ${stat("Recibidos esta semana", D.traslados.filter(t => /^Recibido/.test(t.estado)).length, { txt: "con quién recibió y a qué hora", dir: "" }, "var(--ok)")}
        </div>
        ${card({
      title: "Traslados por recibir", hint: "la tienda escanea lo que llega; lo que no cuadra queda como diferencia",
      body: rows.length ? table({
        cols: [
          { t: "Traslado", cls: "mono", fmt: t => `<b>${esc(t.cons)}</b>${t.sugerido ? '<span class="sub ui">sugerido del CEDI</span>' : ""}` },
          { t: "Origen → destino", fmt: t => `${esc(locNom(t.origen))} → <b>${esc(locNom(t.destino))}</b>` },
          { t: "Salió", cls: "mono", fmt: t => fh(t.fecha) },
          { t: "Chofer", fmt: t => `${esc(t.chofer)}<span class="sub ui">${esc(t.vehiculo)}</span>` },
          { t: "Líneas", r: true, cls: "mono", fmt: t => t.lineas.length },
          { t: "Peso", r: true, cls: "mono", fmt: t => kg(I.peso(t.lineas)) },
          { t: "Estado", fmt: t => tag(t.estado, t.estado === "En tránsito" ? "acc" : "wa") },
          { t: "", r: true, fmt: (t, i) => `<button class="btn sm pri" data-rec="${i}">${icon("scan")}Recibir</button>` }
        ], rows
      }) : empty("check", "Nada en camino", "Todos los traslados están recibidos.")
    })}
        ${card({
      title: "Diferencias en traslados", hint: "se aclaran antes del conteo, no en el conteo",
      body: difs.length ? table({
        cols: [
          { t: "Traslado", cls: "mono", fmt: d => esc(d.t.cons) },
          { t: "Artículo", fmt: d => `${esc(d.a.desc)}<span class="sub ui">${esc(locNom(d.t.origen))} → ${esc(locNom(d.t.destino))}</span>` },
          { t: "Salió", r: true, cls: "mono", fmt: d => cant(d.esperado, d.a) },
          { t: "Llegó", r: true, cls: "mono", fmt: d => `<b style="color:var(--crit)">${cant(d.recibido, d.a)}</b>` },
          { t: "Costo", r: true, cls: "mono", fmt: d => grp(Math.abs(d.esperado - d.recibido) * d.a.costo) },
          { t: "", r: true, fmt: d => d.estado === "Por aclarar" ? `<span style="display:inline-flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sm" data-dfo="${d.id}">No salió del origen</button><button class="btn sm" data-dfm="${d.id}">Registrar faltante</button></span>` : tag(d.estado, "ok", "check") }
        ], rows: difs, rowCls: d => d.estado === "Por aclarar" ? "cr" : ""
      }) : empty("check", "Sin diferencias", "Todo lo que salió llegó completo.")
    })}</div>`;
  }
  function enCaminoWire(v) {
    $$("[data-rec]", v).forEach(b => b.addEventListener("click", () => recibirSheet(A._tcRows[+b.dataset.rec])));
    $$("[data-dfo]", v).forEach(b => b.addEventListener("click", () => { I.aclararDiferencia(b.dataset.dfo, "origen"); toast("Aclarado", "La mercadería no salió del origen: vuelve a su existencia.", "ok"); A.refresh(); }));
    $$("[data-dfm]", v).forEach(b => b.addEventListener("click", () => { I.aclararDiferencia(b.dataset.dfm, "merma"); toast("Faltante registrado", "Con su asiento de merma y el acta del chofer.", "ok"); A.refresh(); }));
  }
  function recibirSheet(t) {
    openSheet({
      wide: true, tight: true, title: "Recibir " + t.cons, sub: locNom(t.origen) + " → " + locNom(t.destino) + " · " + t.chofer + " · " + t.vehiculo,
      body: `<div style="padding:14px 17px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--hair-2)">
          <div class="scan" style="flex:1;min-width:240px">${icon("scan")}<input type="text" placeholder="Dispare el lector sobre cada producto que baja del camión"></div>
          <button class="btn sm" id="rcTodo">${icon("check")}Escanear todo (demo)</button></div>
        ${table({
        cols: [
          { t: "Artículo", fmt: l => `<b>${esc(artOf(l.artId).desc)}</b><span class="sub">${esc(artOf(l.artId).cod)} · ${esc(I.ubicTexto(I.ubic(l.artId, t.destino)))}</span>` },
          { t: "Salió", r: true, cls: "mono", fmt: l => cant(l.cant, artOf(l.artId)) },
          { t: "Llegó", r: true, fmt: l => `<input class="inp num" data-rl="${l.artId}" type="number" min="0" value="" placeholder="0" style="width:92px;padding:5px 8px;text-align:right">` }
        ], rows: t.lineas
      })}`,
      footer: `<span class="mut" style="font-size:12.5px">Lo que no se escanee cuenta como no recibido</span><div style="flex:1"></div><button class="btn pri" id="rcOk">${icon("check")}Confirmar recibido</button>`,
      after: root => {
        $("#rcTodo", root).addEventListener("click", () => {
          t.lineas.forEach((l, i) => { const inp = $(`[data-rl="${l.artId}"]`, root); inp.value = i === t.lineas.length - 1 && t.lineas.length > 2 ? Math.max(0, l.cant - 2) : l.cant; });
          toast("Escaneado", "Revise la última línea: el lector contó dos menos.", "in");
        });
        $("#rcOk", root).addEventListener("click", () => {
          const rec = {};
          $$("[data-rl]", root).forEach(inp => { rec[inp.dataset.rl] = +inp.value || 0; });
          const r = I.recibirTraslado(t.id, rec);
          closeSheet();
          toast(r.nd ? "Recibido con " + r.nd + " diferencia" + (r.nd === 1 ? "" : "s") : "Recibido completo", r.nd ? "La diferencia quedó por aclarar con el origen y el chofer." : "La existencia de " + locNom(t.destino) + " ya lo refleja.", r.nd ? "wa" : "ok");
          A.refresh();
        });
      }
    });
  }

  function historialTr(v) {
    v.innerHTML = card({
      title: "Traslados entre locales y bodegas", hint: "cada uno con quién lo despachó y quién lo recibió",
      body: table({
        cols: [
          { t: "Traslado", cls: "mono", fmt: r => esc(r.cons) },
          { t: "Origen", fmt: r => esc(locNom(r.origen)) },
          { t: "Destino", fmt: r => esc(locNom(r.destino)) },
          { t: "Fecha", cls: "mono", fmt: r => fecha(r.fecha) },
          { t: "Chofer", fmt: r => `${esc(r.chofer)}<span class="sub ui">${esc(r.vehiculo)}</span>` },
          { t: "Líneas", r: true, cls: "mono", fmt: r => r.lineas.length },
          { t: "Peso", r: true, cls: "mono", fmt: r => kg(I.peso(r.lineas)) },
          { t: "Recibió", fmt: r => r.recibio ? esc(nombre(r.recibio)) : '<span class="dim">—</span>' },
          { t: "Estado", fmt: r => tag(r.estado, r.estado === "Recibido" ? "ok" : /diferencias/.test(r.estado) ? "wa" : r.estado === "En tránsito" ? "acc" : "mu") }
        ], rows: D.traslados, rowCls: r => (/diferencias/.test(r.estado) ? "wa" : "")
      })
    });
  }

  function nuevoTraslado() {
    const ps = D.articulos.filter(a => a.tipo === "Producto");
    openSheet({
      title: "Nuevo traslado", sub: "Para cuando un cliente pide algo que está en otro local",
      body: `<div class="grid g2" style="gap:10px">
          ${U.field("Sale de", `<select id="ntO">${locOpts("CD")}</select>`)}
          ${U.field("Va para", `<select id="ntD">${locOpts(S.locId)}</select>`)}
          ${U.field("Artículo", `<select id="ntA">${ps.map(a => `<option value="${a.id}">${esc(a.desc)}</option>`).join("")}</select>`)}
          ${U.field("Cantidad", `<input class="inp num" id="ntC" type="number" min="1" value="1">`)}
        </div>
        <div id="ntInfo" style="margin-top:10px"></div>`,
      footer: `<button class="btn" id="ntCan">Cancelar</button><div style="flex:1"></div><button class="btn pri" id="ntOk">${icon("truck")}Despachar</button>`,
      after: root => {
        const info = () => {
          const a = D.artById[$("#ntA", root).value], o = $("#ntO", root).value;
          const e = D.existencias[a.id][o];
          $("#ntInfo", root).innerHTML = nota(e ? "En " + locNom(o) + " hay " + cant(e.cant - e.comp, a) + " disponibles · " + I.ubicTexto(I.ubic(a.id, o)) : locNom(o) + " no maneja este artículo.");
        };
        ["ntA", "ntO"].forEach(id => $("#" + id, root).addEventListener("change", info)); info();
        $("#ntCan", root).addEventListener("click", closeSheet);
        $("#ntOk", root).addEventListener("click", () => {
          const o = $("#ntO", root).value, d = $("#ntD", root).value, a = D.artById[$("#ntA", root).value], n = +$("#ntC", root).value || 0;
          const e = D.existencias[a.id][o];
          if (o === d) return toast("Origen y destino son el mismo", "", "wa");
          if (!e || e.cant - e.comp < n) return toast("No hay suficiente en " + locNom(o), "", "wa");
          if (!D.existencias[a.id][d]) D.existencias[a.id][d] = { cant: 0, comp: 0, min: 6 };
          const t = I.crearTraslado(o, d, [{ artId: a.id, cant: n }]);
          closeSheet(); toast("Traslado " + t.cons + " despachado", cant(n, a) + " × " + a.desc + " hacia " + locNom(d) + ".", "ok"); A.go("traslados", "camino");
        });
      }
    });
  }

  A.workspace("traslados", {
    title: "Traslados",
    tabs: [
      {
        id: "sugerido", t: "Sugerido del CEDI", sub: "Lo que cada tienda necesita y el CEDI tiene",
        badge: () => { const n = I.sugeridoCedi().length; return { n, k: "", l: n + " tiendas con traslado sugerido" }; },
        actions: () => `<button class="btn" id="trNuevo">${icon("plus")}Nuevo traslado</button><button class="btn" id="trRecalc">${icon("sparkle")}Recalcular</button>`,
        render: sugeridoTr, wire: v => { sugeridoTrWire(v); const n = $("#trNuevo", document); if (n) n.addEventListener("click", nuevoTraslado); const r = $("#trRecalc", document); if (r) r.addEventListener("click", () => { trSug = null; A.refresh(); toast("Sugerido recalculado", "Con las existencias de este momento.", "ok"); }); }
      },
      {
        id: "camino", t: "En camino", sub: "Lo que salió y todavía no se recibe, y lo que llegó incompleto",
        badge: () => { const n = D.traslados.filter(t => t.estado === "En tránsito" || t.estado === "Registrado").length + I.DIFS.filter(d => d.estado === "Por aclarar").length; return { n, k: I.DIFS.some(d => d.estado === "Por aclarar") ? "cr" : "wa", l: n + " por atender" }; },
        actions: () => `<button class="btn" id="trNuevo2">${icon("plus")}Nuevo traslado</button>`,
        render: enCamino, wire: v => { enCaminoWire(v); const n = $("#trNuevo2", document); if (n) n.addEventListener("click", nuevoTraslado); }
      },
      { id: "historial", t: "Historial", sub: "Todos los traslados, con su despacho y su recibido", render: historialTr }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     5 · CONTEOS Y AJUSTES — Conteo de hoy · Ajustes y mermas ·
         Plan del año
     ═════════════════════════════════════════════════════════════ */
  let ctLoc = null;
  const locConteo = () => ctLoc || S.locId || "L1";
  function conteo(v) {
    const lc = locConteo(), C = I.conteoDe(lc);
    const contados = C.items.filter(x => x.contado != null).length;
    const cerrado = C.estado === "Cerrado";
    A._ctRows = C.items;
    v.innerHTML = `<div class="wrap">
        <div class="filters" style="grid-template-columns:minmax(180px,260px) 1fr">
          <select class="inp" id="ctLoc" aria-label="Local del conteo">${locOpts(lc, l => l.tipo !== "bodega")}</select>
          <span class="mut" style="font-size:12.5px;align-self:center">Semana ${I.SEMANA} de 50 · familia del plan: <b>${esc(D.famById[C.fam].nom)}</b> · la tienda no cierra mientras se cuenta</span>
        </div>
        <div class="card" style="padding:13px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <b class="num" style="font-size:14.5px;flex:none">${contados} de ${C.items.length} contados</b>
          <div style="flex:1;min-width:150px">${prog([{ w: Math.round(contados / C.items.length * 100), col: cerrado ? "var(--ok)" : "var(--accent)" }])}</div>
          <span class="mut" style="font-size:12.5px;flex:none">${cerrado ? "cerrado por " + esc(nombre(C.cerro)) + " · " + C.difs.length + (C.difs.length === 1 ? " diferencia" : " diferencias") + ", " + C.difs.filter(d => d.estado === "Explicada").length + " explicadas por el sistema" : C.estado === "En proceso" ? "empezó a las " + hora(C.inicio) : "sin empezar"}</span>
          <span class="mut" style="font-size:12.5px;flex:none;border-left:1px solid var(--hair);padding-left:16px">Exactitud del último conteo: <b style="color:${(I.exactitud[lc] || 0) < 96 ? "var(--warn)" : "var(--ok)"}">${dec(I.exactitud[lc] || 0, 1)} %</b></span>
        </div>
        ${cerrado ? "" : card({
      title: "Lista de hoy", hint: "en el orden en que se camina la tienda, a ciegas · sin señal = toca por el plan",
      actions: `<button class="btn sm" id="ctLlenar">${icon("scan")}Llenar con el lector</button><button class="btn sm pri" id="ctCerrar" ${contados ? "" : "disabled"}>${icon("check")}Cerrar conteo</button>`,
      body: table({
        cols: [
          { t: "Ubicación", fmt: it => it.ubic ? `<b class="num" style="font-size:12.5px">${esc(it.ubic)}</b><span class="sub ui">${esc(I.ubicTexto(it.ubic))}</span>` : tag("Sin ubicación", "wa") },
          { t: "Artículo", fmt: it => `<b>${esc(it.a.desc)}</b><span class="sub">${esc(it.a.cod)} · ${esc(it.a.unidad)}</span>` },
          { t: "Señal", fmt: it => it.motivos.filter(m => m !== "Plan de la semana").map(m => `<span class="mot">${esc(m)}</span>`).join(" ") || `<span class="dim" style="font-size:12px">—</span>` },
          { t: "Contado", r: true, fmt: (it, i) => `<input class="inp num" data-ct="${i}" type="number" min="0" step="${it.a.decimales ? "0.5" : "1"}" value="${it.contado == null ? "" : it.contado}" placeholder="—" style="width:96px;padding:6px 8px;text-align:right">` }
        ], rows: C.items
      })
    })}
        ${cerrado ? card({
      title: "Diferencias del conteo", hint: "cada una con la causa probable antes de ajustar",
      body: C.difs.length ? table({
        cols: [
          { t: "Artículo", fmt: d => `<b>${esc(d.a.desc)}</b><span class="sub">${esc(d.a.cod)}</span>` },
          { t: "Sistema", r: true, cls: "mono", fmt: d => cant(d.sis, d.a) },
          { t: "Contado", r: true, cls: "mono", fmt: d => cant(d.contado, d.a) },
          { t: "Diferencia", r: true, cls: "mono", fmt: d => `<b style="color:${d.dif < 0 ? "var(--crit)" : "var(--ok)"}">${d.dif > 0 ? "+" : ""}${cant(d.dif, d.a)}</b>` },
          { t: "Costo", r: true, cls: "mono", fmt: d => grp(d.costo) },
          { t: "Causa probable", fmt: d => `<span style="font-size:12.5px">${esc(d.causa.t)}</span>` },
          {
            t: "", r: true, fmt: d => d.estado === "Por decidir"
              ? (d.causa.k === "recontar" ? `<button class="btn sm" data-aj="${d.id}">Recontar</button>` : `<button class="btn sm pri" data-aj="${d.id}">${d.costo >= I.POL.aprobarAjusteDesde ? "Pedir aprobación" : "Ajustar"}</button>`)
              : tag(d.estado, d.estado === "Ajustado" || d.estado === "Explicada" ? "ok" : "wa", d.estado === "Esperando aprobación" ? "clock" : "check")
          }
        ], rows: C.difs, rowCls: d => d.estado === "Por decidir" ? "wa" : ""
      }) : empty("check", "Todo cuadró", "Lo contado es igual a lo que dice el sistema.")
    }) + nota("Las diferencias que explica el sistema (un traslado sin recibir, una venta contra pedido) no se ajustan: se resuelven solas. Un ajuste de más de ₡" + grp(I.POL.aprobarAjusteDesde) + " espera el visto bueno de gerencia.") : ""}
      </div>`;
  }
  function conteoWire(v) {
    const lc = locConteo();
    const sl = $("#ctLoc", v); if (sl) sl.addEventListener("change", () => { ctLoc = sl.value; A.refresh(); });
    $$("[data-ct]", v).forEach(inp => inp.addEventListener("change", () => { I.contar(lc, A._ctRows[+inp.dataset.ct].a.id, inp.value); A.refresh(); }));
    const ll = $("#ctLlenar", v); if (ll) ll.addEventListener("click", () => { I.llenarConteoDemo(lc); toast("Conteo capturado con el lector", "Escaneando por pasillo. Revise antes de cerrar.", "in"); A.refresh(); });
    const cc = $("#ctCerrar", v); if (cc) cc.addEventListener("click", () => { const c = I.cerrarConteo(lc); toast("Conteo cerrado", c.difs.length + " diferencias en " + locNom(lc) + ", cada una con su causa probable.", c.difs.length ? "wa" : "ok"); A.refresh(); });
    $$("[data-aj]", v).forEach(b => b.addEventListener("click", () => {
      const r = I.ajustar(lc, b.dataset.aj);
      if (!r) return;
      if (r.estado === "Recontar") toast("Marcado para recontar", "Vuelve a la lista de mañana.", "in");
      else if (r.estado === "Por aprobar") toast("Ajuste enviado a gerencia", "Pasa de ₡" + grp(I.POL.aprobarAjusteDesde) + ": lo aprueba " + I.GENTE.gerente.nom + ".", "wa");
      else toast("Ajuste " + r.cons + " registrado", "Con su asiento de merma y en la bitácora.", "ok");
      A.refresh();
    }));
  }

  function ajustes(v) {
    const merma = D.ajustes.filter(a => a.cant < 0 && a.estado === "Aplicado");
    const pend = D.ajustes.filter(a => a.estado === "Por aprobar");
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Merma del mes", c(merma.reduce((s, a) => s + a.costo, 0)), { txt: merma.length + " ajustes de salida, todos con motivo", dir: "down" }, "var(--crit)")}
          ${stat("Por aprobar", pend.length, { txt: "ajustes de más de ₡" + grp(I.POL.aprobarAjusteDesde), dir: "" }, pend.length ? "var(--warn)" : "var(--ok)")}
          ${stat("Sin evidencia", D.ajustes.filter(a => a.evidencia === "Sin evidencia").length, { txt: "quedaron sin foto ni acta", dir: "" }, "var(--warn)")}
          ${stat("Regla", "Foto y motivo", { txt: "ninguna merma entra sin evidencia", dir: "" })}
        </div>
        ${card({
      title: "Ajustes de inventario", hint: "cada uno con su motivo, su evidencia y quién lo autorizó",
      body: table({
        cols: [
          { t: "Ajuste", cls: "mono", fmt: r => esc(r.cons) },
          { t: "Artículo", fmt: r => `${esc(artOf(r.artId).desc)}<span class="sub">${esc(artOf(r.artId).cod)}</span>` },
          { t: "Local", fmt: r => esc(locNom(r.locId)) },
          { t: "Cant.", r: true, cls: "mono", fmt: r => `<b style="color:${r.cant < 0 ? "var(--crit)" : "var(--ok)"}">${r.cant > 0 ? "+" : r.cant < 0 ? "−" : ""}${cant(Math.abs(r.cant), artOf(r.artId))}</b>` },
          { t: "Motivo", fmt: r => esc(r.motivo) },
          { t: "Evidencia", fmt: r => (r.evidencia === "Sin evidencia" ? tag("Sin evidencia", "wa", "alert") : tag(r.evidencia, "ok", "check")) },
          { t: "Costo", r: true, cls: "mono", fmt: r => grp(r.costo) },
          { t: "", r: true, fmt: r => r.estado === "Por aprobar" ? `<span style="display:inline-flex;gap:6px"><button class="btn sm" data-ajr="${r.cons}">Recontar</button><button class="btn sm pri" data-aja="${r.cons}">Aprobar</button></span>` : `<span class="mut" style="font-size:12.5px">${esc(r.estado || "Aplicado")}${r.autoriza ? " · " + esc(nombre(r.autoriza)) : ""}</span>` }
        ], rows: D.ajustes, rowCls: r => r.estado === "Por aprobar" ? "wa" : r.evidencia === "Sin evidencia" ? "wa" : ""
      })
    })}</div>`;
  }
  function ajustesWire(v) {
    $$("[data-aja]", v).forEach(b => b.addEventListener("click", () => { I.aprobarAjuste(b.dataset.aja); toast("Ajuste aprobado", "Por " + I.GENTE.gerente.nom + ". Generó su asiento de merma.", "ok"); A.refresh(); }));
    $$("[data-ajr]", v).forEach(b => b.addEventListener("click", () => { I.rechazarAjuste(b.dataset.ajr); toast("Se pidió recontar", "El ajuste no se aplica; el artículo vuelve a la lista de conteo.", "in"); A.refresh(); }));
  }
  function registrarMerma() {
    const ps = D.articulos.filter(a => a.tipo === "Producto");
    openSheet({
      title: "Registrar merma", sub: "Producto quebrado, dañado o vencido · queda en el kardex, en la bitácora y en contabilidad",
      body: `<div class="grid g2" style="gap:10px">
          ${U.field("Artículo", `<select id="rmA">${ps.map(a => `<option value="${a.id}">${esc(a.desc)}</option>`).join("")}</select>`)}
          ${U.field("Local", `<select id="rmL">${locOpts(S.locId)}</select>`)}
          ${U.field("Cantidad que sale", `<input class="inp num" id="rmC" type="number" min="1" value="1">`)}
          ${U.field("Motivo", `<select id="rmM"><option>Producto quebrado</option><option>Producto dañado por lluvia</option><option>Producto vencido</option><option>Merma de bodega</option></select>`)}
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;align-items:center"><button class="btn sm" id="rmF">${icon("upload")}Tomar foto</button><span class="mut" id="rmFn" style="font-size:12.5px">Sin fotos</span></div>
        <div id="rmInfo" style="margin-top:12px"></div>`,
      footer: `<button class="btn" id="rmCan">Cancelar</button><div style="flex:1"></div><button class="btn pri" id="rmOk">${icon("check")}Registrar</button>`,
      after: root => {
        let fotos = 0;
        const info = () => {
          const a = D.artById[$("#rmA", root).value], n = +$("#rmC", root).value || 0, costo = n * a.costo;
          $("#rmInfo", root).innerHTML = nota("Costo de la merma: " + c(costo) + ". " + (costo >= I.POL.aprobarAjusteDesde ? "Pasa de ₡" + grp(I.POL.aprobarAjusteDesde) + ": espera la aprobación de gerencia." : "Se registra de inmediato."));
        };
        ["rmA", "rmC"].forEach(id => $("#" + id, root).addEventListener("input", info)); $("#rmA", root).addEventListener("change", info); info();
        $("#rmF", root).addEventListener("click", () => { fotos++; $("#rmFn", root).textContent = fotos + " foto" + (fotos === 1 ? "" : "s"); });
        $("#rmCan", root).addEventListener("click", closeSheet);
        $("#rmOk", root).addEventListener("click", () => {
          if (!fotos) return toast("Falta la foto", "Auditoría exige evidencia de cada merma.", "wa");
          const a = D.artById[$("#rmA", root).value], l = $("#rmL", root).value, n = +$("#rmC", root).value || 0;
          if (!n) return toast("Falta la cantidad", "", "wa");
          D.seq.AJ++;
          const cons = "AJ-" + String(D.seq.AJ).padStart(6, "0");
          const aj = { id: cons, cons, artId: a.id, locId: l, cant: -n, fecha: new Date(), motivo: $("#rmM", root).value, evidencia: fotos + " fotografías", autoriza: "", costo: n * a.costo, estado: "Por aprobar" };
          D.ajustes.unshift(aj);
          if (aj.costo >= I.POL.aprobarAjusteDesde) { I.AJ_PEND.push(aj); toast("Merma enviada a gerencia", "Pasa de ₡" + grp(I.POL.aprobarAjusteDesde) + ".", "wa"); }
          else { I.aprobarAjuste(cons, I.GENTE.bodega); toast("Merma " + cons + " registrada", "Con su asiento contable y la foto de respaldo.", "ok"); }
          closeSheet(); A.go("ajustes", "ajustes");
        });
      }
    });
  }

  function plan(v) {
    const fams = D.familias.filter(f => !f.servicio);
    const color = {};
    const PAL = ["#3b6fd4", "#2e9e6a", "#d08a1e", "#b0478f", "#3a9bb0", "#7c5cc4", "#c2553d", "#6b8e23", "#8a6d3b"];
    fams.forEach((f, i) => { color[f.id] = PAL[i % PAL.length]; });
    const hechas = new Set(I.PLAN.filter(p => p.semana < I.SEMANA && p.semana >= I.SEMANA - 25).map(p => p.fam));
    v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Semana", I.SEMANA + " de 50", { txt: "familia: " + D.famById[I.famSemana()].nom, dir: "" })}
          ${stat("Familias prioritarias", I.PRIORITARIAS.length, { txt: I.PRIORITARIAS.map(f => D.famById[f].nom).join(", ") + " · dos veces por vuelta", dir: "" })}
          ${stat("Vueltas al año", "≈ " + dec(50 / (fams.length + I.PRIORITARIAS.length), 1).replace(",0", ""), { txt: "como lo hace hoy el equipo de inventarios", dir: "" })}
          ${stat("Cubiertas este semestre", hechas.size + " de " + fams.length, { txt: "familias contadas en las últimas 25 semanas", dir: "" }, "var(--ok)")}
        </div>
        ${card({
      title: "Plan de conteo del año", hint: "50 semanas por familia; cada día se suma lo que muestra señales raras",
      body: `<div class="semanas">${I.PLAN.map(p => `<span class="sem ${p.semana === I.SEMANA ? "hoy" : p.semana < I.SEMANA ? "hecha" : ""}" style="--c:${color[p.fam]}" title="Semana ${p.semana}: ${esc(D.famById[p.fam].nom)}"><b>${p.semana}</b><i>${esc(p.fam)}</i></span>`).join("")}</div>
          <div class="leyenda">${fams.map(f => `<span><i style="background:${color[f.id]}"></i>${esc(f.nom)}${I.PRIORITARIAS.indexOf(f.id) >= 0 ? " ×2" : ""}</span>`).join("")}</div>`
    })}
        ${nota("Hoy el equipo cuenta 50 semanas al año por familia y le da unas dos vueltas completas al inventario. El plan se conserva; lo nuevo es que cada día el sistema agrega a la lista lo que quedó en negativo, tuvo un ajuste, llegó incompleto en un traslado o es de alto valor, para que lo raro no espere seis meses.")}
      </div>`;
  }

  A.workspace("ajustes", {
    title: "Conteos y ajustes",
    onArg: (tab, dato) => { if (tab === "conteo" && dato && D.locales.some(l => l.id === dato)) ctLoc = dato; },
    tabs: [
      {
        id: "conteo", t: "Conteo de hoy", sub: () => "Conteo cíclico en " + locNom(locConteo()) + " · a ciegas y por pasillo",
        badge: () => { const C = I.conteoDe(locConteo()); const n = C.estado === "Cerrado" ? C.difs.filter(d => d.estado === "Por decidir").length : C.items.length - C.items.filter(x => x.contado != null).length; return { n, k: C.estado === "Cerrado" ? "wa" : "", l: n + " por contar o decidir" }; },
        render: conteo, wire: conteoWire
      },
      {
        id: "ajustes", t: "Ajustes y mermas", sub: "Merma con foto y motivo; lo grande lo aprueba gerencia",
        badge: () => { const n = D.ajustes.filter(a => a.estado === "Por aprobar").length; return { n, k: "wa", l: n + " por aprobar" }; },
        actions: () => `<button class="btn pri" id="rmNuevo">${icon("plus")}Registrar merma</button>`,
        render: ajustes, wire: v => { ajustesWire(v); const b = $("#rmNuevo", document); if (b) b.addEventListener("click", registrarMerma); }
      },
      { id: "plan", t: "Plan del año", sub: "Conteo cíclico por familia, con las prioritarias más seguido", render: plan }
    ]
  });

  /* ═════════════════════════════════════════════════════════════
     6 · REPOSICIÓN — Sugerido de compra · Ventas atípicas ·
         Temporadas
     ═════════════════════════════════════════════════════════════ */
  const rp = { locId: "CD", fam: "all", provs: [], dias: 30, excluirAtipicas: true, temporadas: true, res: null };
  function sugerido(v) {
    const provsL = D.proveedores;
    v.innerHTML = `<div class="wrap">
        ${card({
      title: "Qué quiere pedir", hint: "nada se calcula al entrar: se escoge y se genera",
      body: `<div class="filters">
            ${U.field("Local", `<select id="rpL"><option value="CD" ${rp.locId === "CD" ? "selected" : ""}>CEDI Isabel · según lo que distribuye</option>${D.tiendas.map(l => `<option value="${l.id}" ${rp.locId === l.id ? "selected" : ""}>${esc(l.nom)}</option>`).join("")}</select>`)}
            ${U.field("Familia", `<select id="rpF"><option value="all">Todas</option>${D.familias.filter(f => !f.servicio).map(f => `<option value="${f.id}" ${rp.fam === f.id ? "selected" : ""}>${esc(f.nom)}</option>`).join("")}</select>`)}
            ${U.field("Días de inventario", `<select id="rpD">${[15, 30, 45, 60].map(d => `<option ${rp.dias === d ? "selected" : ""}>${d}</option>`).join("")}</select>`)}
          </div>
          <div style="margin-top:12px">${U.field("Proveedores (varios a la vez)", `<div style="display:flex;flex-wrap:wrap;gap:6px">${provsL.map(p => `<label class="chipck"><input type="checkbox" value="${p.id}" ${rp.provs.indexOf(p.id) >= 0 ? "checked" : ""}><span>${esc(p.nom.replace(/ (S\.A\.|C\.R\.|Costa Rica|de Costa Rica)$/g, "").replace(" Costa Rica", ""))}</span></label>`).join("")}</div>`)}</div>
          <div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-top:14px">
            <label class="chipck"><input type="checkbox" id="rpAt" ${rp.excluirAtipicas ? "checked" : ""}><span>Sin ventas atípicas</span></label>
            <label class="chipck"><input type="checkbox" id="rpTe" ${rp.temporadas ? "checked" : ""}><span>Con temporadas activas</span></label>
            <div style="flex:1"></div>
            <button class="btn pri" id="rpGen">${icon("sparkle")}Generar sugerido</button>
          </div>`
    })}
        <div id="rpRes">${rp.res ? resultado() : card({ body: empty("filter", "Escoja y presione generar", "La pantalla no consulta nada hasta que usted lo pide, así una consulta pesada nunca frena la operación de los siete locales.") })}</div>
      </div>`;
  }
  function resultado() {
    const R = rp.res, tot = R.reduce((s, x) => s + x.costo, 0), kgs = R.reduce((s, x) => s + x.kg, 0);
    const porProv = {};
    R.forEach(x => { const p = x.a.provId || "—"; (porProv[p] = porProv[p] || { n: 0, costo: 0 }); porProv[p].n++; porProv[p].costo += x.costo; });
    const atip = R.reduce((s, x) => s + x.atipExcl, 0);
    return `<div class="wrap">
        <div class="grid g4">
          ${stat("Artículos por pedir", R.length, { txt: Object.keys(porProv).length + " proveedores", dir: "" })}
          ${stat("Inversión estimada", c(tot), { txt: kg(kgs) + " de carga", dir: "" })}
          ${stat("Ventas atípicas fuera", grp(atip), { txt: rp.excluirAtipicas ? "unidades que no inflan el pedido" : "incluidas: el pedido sale inflado", dir: rp.excluirAtipicas ? "up" : "down" }, rp.excluirAtipicas ? "var(--ok)" : "var(--crit)")}
          ${stat("Temporadas", rp.temporadas ? I.TEMPORADAS.filter(t => t.activa).map(t => t.t).join(" y ") : "sin ajuste", { txt: "se configuran en la pestaña Temporadas", dir: "" })}
        </div>
        ${card({
      title: "Sugerido de compra", hint: "redondeado a la presentación en que se compra · ordenado por cobertura",
      actions: `<button class="btn sm" id="rpWa">${icon("chat")}Cotizar por WhatsApp</button><button class="btn sm pri" id="rpOc">${icon("truck")}Crear órdenes de compra</button>`,
      body: table({
        h: "calc(100dvh - 420px)",
        cols: [
          { t: "Artículo", fmt: x => `<b>${esc(x.a.desc)}</b><span class="sub ui">${esc(provNom(x.a.provId))} · entrega en ${x.lead} días</span>` },
          { t: "Venta normal / mes", r: true, cls: "mono", fmt: x => cant(Math.round(x.normal), x.a) + (x.fT !== 1 ? `<span class="sub" style="color:var(--accent)">×${dec(x.fT, 2)} temporada</span>` : "") },
          { t: "Atípicas fuera", r: true, cls: "mono", fmt: x => x.atipExcl ? `<span style="color:var(--ok)">−${grp(x.atipExcl)}</span>` : x.atipIncl ? `<span style="color:var(--crit)">+${grp(x.atipIncl)}</span>` : '<span class="dim">—</span>' },
          { t: "Disponible", r: true, cls: "mono", fmt: x => cant(x.exist, x.a) },
          { t: "En camino", r: true, cls: "mono", fmt: x => x.camino ? cant(x.camino, x.a) : '<span class="dim">—</span>' },
          { t: "Cobertura", r: true, cls: "mono", fmt: x => `<b style="color:${x.cob < 10 ? "var(--crit)" : x.cob < 20 ? "var(--warn)" : "var(--ink)"}">${x.cob} d</b>` },
          { t: "Pedir", r: true, cls: "mono", fmt: x => `<b>${cant(x.sug, x.a)}</b>${x.pc.f > 1 ? `<span class="sub">${grp(x.sug / x.pc.f)} × ${esc(x.pc.u.toLowerCase())}</span>` : ""}` },
          { t: "Costo", r: true, cls: "mono", fmt: x => grp(x.costo) }
        ], rows: R, rowCls: x => x.cob < 10 ? "cr" : x.cob < 20 ? "wa" : "",
        foot: [{ v: "Total", span: 7 }, { v: grp(tot), r: true, cls: "mono" }]
      })
    })}
        ${card({
      title: "Por proveedor", hint: "cada uno recibe su orden o su solicitud de cotización",
      body: table({
        cols: [
          { t: "Proveedor", fmt: p => esc(provNom(p)) },
          { t: "Artículos", r: true, cls: "mono", fmt: p => porProv[p].n },
          { t: "Entrega", r: true, cls: "mono", fmt: p => (I.LEAD[p] || "—") + " d" },
          { t: "Monto", r: true, cls: "mono", fmt: p => grp(porProv[p].costo) }
        ], rows: Object.keys(porProv)
      })
    })}</div>`;
  }
  function sugeridoWire(v) {
    const leer = () => {
      rp.locId = $("#rpL", v).value; rp.fam = $("#rpF", v).value; rp.dias = +$("#rpD", v).value;
      rp.provs = $$(".chipck input[value^='P']:checked", v).map(x => x.value);
      rp.excluirAtipicas = $("#rpAt", v).checked; rp.temporadas = $("#rpTe", v).checked;
    };
    $("#rpGen", v).addEventListener("click", () => {
      leer();
      rp.res = I.sugerido(rp);
      A.refresh();
      toast("Sugerido generado", rp.res.length + " artículos · " + c(rp.res.reduce((s, x) => s + x.costo, 0)) + " · " + locNom(rp.locId) + ".", "ok");
    });
    const oc = $("#rpOc", v); if (oc) oc.addEventListener("click", () => {
      const ocs = I.crearOrdenes(rp.res, rp.locId);
      rp.res = null;
      toast(ocs.length + " órdenes de compra creadas", "Una por proveedor, en estado registrada: " + ocs.map(o => o.cons).join(", ") + ".", "ok");
      A.refresh();
    });
    const wa = $("#rpWa", v); if (wa) wa.addEventListener("click", () => {
      const n = new Set(rp.res.map(x => x.a.provId)).size;
      toast("Solicitud de cotización enviada", "Por WhatsApp a " + n + " proveedores. Las respuestas llegan a Compras › Cotizar a proveedores.", "ok");
    });
  }

  function atipicas(v) {
    v.innerHTML = `<div class="wrap">
        ${card({
      title: "Ventas atípicas", hint: "el sistema las detecta; usted decide si cuentan para el sugerido",
      body: table({
        cols: [
          { t: "Venta", fmt: x => `<b>${esc(x.cli)}</b><span class="sub ui">${esc(x.motivo)} · ${fecha(x.fecha)}</span>` },
          { t: "Artículo", fmt: x => esc(x.a.desc) },
          { t: "Cantidad", r: true, cls: "mono", fmt: x => `<b>${grp(x.cant)}</b>` },
          { t: "Normal al mes", r: true, cls: "mono", fmt: x => grp(x.normal) },
          { t: "Veces lo normal", r: true, cls: "mono", fmt: x => `<span style="color:var(--crit)">×${dec(x.cant / Math.max(1, x.normal), 1)}</span>` },
          { t: "Fuera del sugerido", c: true, fmt: (x, i) => `<button class="swtch" role="switch" aria-checked="${x.excluir}" aria-label="Excluir ${esc(x.motivo)}" data-at="${i}"><i></i></button>` }
        ], rows: I.ATIPICAS
      })
    })}
        ${nota("Hoy una licitación de 2 000 codos hace que el sugerido del mes siguiente pida como si todos los meses fueran así. Aquí se detectan las ventas que pasan de tres veces lo normal y salen del cálculo; la persona puede volver a incluir una si fue una venta que se va a repetir.")}
      </div>`;
  }
  function atipicasWire(v) {
    $$("[data-at]", v).forEach(b => b.addEventListener("click", () => { const x = I.ATIPICAS[+b.dataset.at]; x.excluir = !x.excluir; I.anotar(x.excluir ? "Excluyó venta atípica del sugerido" : "Incluyó venta atípica en el sugerido", x.cli + " · " + x.a.desc, I.GENTE.compras); rp.res = null; A.refresh(); }));
  }

  function temporadas(v) {
    v.innerHTML = `<div class="wrap">
        <div class="grid g2">${I.TEMPORADAS.map((t, i) => card({
      title: t.t, hint: t.meses,
      actions: `<button class="swtch" role="switch" aria-checked="${t.activa}" aria-label="Activar ${esc(t.t)}" data-te="${i}"><i></i></button>`,
      body: `<div class="mut" style="font-size:12.5px;margin-bottom:10px">${esc(t.nota)}</div>
          <div style="display:flex;flex-direction:column;gap:6px">${Object.keys(t.ajustes).map(f => `<div class="hl" style="justify-content:space-between;align-items:center"><span>${esc(D.famById[f].nom)}</span>
            <span style="display:inline-flex;align-items:center;gap:6px"><input class="inp num" data-tv="${i}:${f}" type="number" step="5" value="${t.ajustes[f]}" style="width:78px;padding:4px 8px;text-align:right"> %</span></div>`).join("")}</div>`
    })).join("")}</div>
        ${nota("Las temporadas las configura el administrador, como pidió el gerente comercial: «en octubre llueve, hay que anticipar canoas; botas de hule en febrero no se venden». El sugerido multiplica la venta normal de cada familia por las temporadas activas.")}
      </div>`;
  }
  function temporadasWire(v) {
    $$("[data-te]", v).forEach(b => b.addEventListener("click", () => { const t = I.TEMPORADAS[+b.dataset.te]; t.activa = !t.activa; rp.res = null; toast(t.t + (t.activa ? " activada" : " desactivada"), "El próximo sugerido lo toma en cuenta.", "ok"); A.refresh(); }));
    $$("[data-tv]", v).forEach(inp => inp.addEventListener("change", () => { const [i, f] = inp.dataset.tv.split(":"); I.TEMPORADAS[+i].ajustes[f] = +inp.value || 0; rp.res = null; }));
  }

  A.workspace("reposicion", {
    title: "Reposición",
    tabs: [
      { id: "sugerido", t: "Sugerido de compra", sub: "Por local, con los días que tarda cada proveedor, sin ventas atípicas y con temporadas", render: sugerido, wire: sugeridoWire },
      {
        id: "atipicas", t: "Ventas atípicas", sub: "Licitaciones y proyectos que no deben inflar el pedido",
        badge: () => { const n = I.ATIPICAS.length; return { n, k: "", l: n + " detectadas" }; },
        render: atipicas, wire: atipicasWire
      },
      { id: "temporadas", t: "Temporadas", sub: "Lluvias, cosecha de café, zafra, verano y entrada a clases", render: temporadas, wire: temporadasWire }
    ]
  });

  /* lo que otros módulos pueden abrir: la recepción de compras crea artículos */
  A.inv = { nuevo: nuevoArticulo, marcarSegunda, nuevoTraslado };
})(window);
