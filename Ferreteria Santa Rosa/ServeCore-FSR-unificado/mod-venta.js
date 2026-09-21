/* ═══════════════════════════════════════════════════════════════
   Ventas — punto de venta, documentos, cotizaciones, despachos,
   rutas, clientes y cuentas por cobrar.
   La caja es la pantalla que más se usa: se opera sin soltar el
   teclado y no deja aplicar una línea bajo el margen sin autorización.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const fmtCant = (n, a) => (a && a.decimales && !Number.isInteger(+n) ? String(Math.round(n * 100) / 100).replace(".", ",") : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "));
  const D = w.DB, A = w.APP, S = w.S, U = w.UI;
  const { $, $$, esc, norm, grp, c, dec, kg, fecha, fh, hora, p2, icon, tag, card, stat, table, seg, onSeg,
    openSheet, closeSheet, toast, locNom, cliNom, artOf, ini } = U;

  /* ── la factura en curso ────────────────────────────────────── */
  /* draft: el borrador que el nodo local guarda solo; apartado: lo que esta
     factura dejó comprometido en existencias y hay que devolver si se cancela */
  S.cart = { cliId: "C1", condicion: "Crédito", lineas: [], draft: new Date(), apartado: [] };
  const tocaBorrador = () => { S.cart.draft = S.cart.lineas.length ? new Date() : null; };
  [["FER-01042", 40, 0], ["FER-02218", 120, 3], ["FER-03771", 28, 31], ["FER-00915", 36, 0], ["FER-01880", 450, 0]]
    .forEach(s => {
      const a = D.articulos.find(x => x.cod === s[0]);
      if (a) S.cart.lineas.push({ artId: a.id, cant: s[1], precio: a.precio, descTipo: "pct", desc: s[2], nota: "", auth: false });
    });

  const lineBruto = l => l.cant * l.precio;
  const lineDescMonto = l => {
    const b = lineBruto(l);
    if (!l.desc) return 0;
    return l.descTipo === "monto" ? Math.min(b, Math.max(0, l.desc)) : Math.round((b * Math.min(100, Math.max(0, l.desc))) / 100);
  };
  const lineTotal = l => lineBruto(l) - lineDescMonto(l);
  function lineMargen(l) {
    const a = artOf(l.artId);
    const pv = l.cant ? lineTotal(l) / l.cant : l.precio;
    return { m: a.costo ? ((pv - a.costo) / pv) * 100 : null, min: D.famById[a.fam].min, pv };
  }
  /* para el motor fiscal el descuento viaja en porcentaje: se convierte aquí */
  const lineasFiscales = () => S.cart.lineas.map(l => ({
    artId: l.artId, cant: l.cant, precio: l.precio,
    desc: lineBruto(l) ? +((lineDescMonto(l) / lineBruto(l)) * 100).toFixed(4) : 0
  }));
  const cartTot = () => D.totalizar(lineasFiscales());
  const cartPeso = () => S.cart.lineas.reduce((s, l) => s + (artOf(l.artId).peso || 0) * l.cant, 0);
  function cartMargen() {
    let ing = 0, cos = 0;
    S.cart.lineas.forEach(l => { ing += lineTotal(l); cos += l.cant * artOf(l.artId).costo; });
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
    const bruto = lineBruto(l), descMonto = lineDescMonto(l), neto = bruto - descMonto;
    const iva = Math.round(neto * D.IVA);
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
      <div class="pf2 desigual">
        ${posField("Cantidad", `<div style="display:flex;align-items:center;gap:7px">
          <button class="iconbtn" data-pcant="-1" style="width:32px;height:32px;border:1px solid var(--hair)">−</button>
          <input id="pCant" type="number" min="${a.decimales ? "0.1" : "1"}" step="${a.decimales ? "any" : "1"}" value="${l.cant}" class="num" style="flex:1;min-width:0;text-align:center;padding:7px 4px;border-radius:9px;border:1px solid var(--hair);background:var(--surface)">
          <button class="iconbtn" data-pcant="1" style="width:32px;height:32px;border:1px solid var(--hair)">+</button></div>`)}
        ${posField("Precio unitario", `<div class="tb-search" style="width:100%;padding:7px 10px"><span class="mut">₡</span><input id="pPrecio" type="number" min="0" step="1" value="${l.precio}" class="num" style="font-size:14px;min-width:0"><span class="dim" style="font-size:11px;flex:none">sin IVA</span></div>`)}
      </div>
      ${(a.pres || []).filter(p => !p.base && p.venta).length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin:-4px 0 12px">${(a.pres || []).filter(p => !p.base && p.venta).map(p => `<button class="btn sm" data-ppres="${p.f}">${icon("plus")}${esc(p.u)}</button>`).join("")}<span class="dim" style="font-size:11.5px;align-self:center">suma en ${esc(a.unidad)}</span></div>` : ""}
      <div class="pf2">
        ${posField("Tipo desc.", `<select id="pDescTipo" style="width:100%;padding:8px 10px;border-radius:9px;border:1px solid var(--hair);background:var(--surface)">
          <option value="pct"${l.descTipo === "monto" ? "" : " selected"}>% Porcentaje</option>
          <option value="monto"${l.descTipo === "monto" ? " selected" : ""}>₡ Monto fijo</option></select>`)}
        ${posField(l.descTipo === "monto" ? "Descuento ₡" : "Descuento %", `<input id="pDescVal" type="number" min="0" step="1" value="${l.desc || 0}" class="num" style="width:100%;padding:8px 10px;border-radius:9px;border:1px solid var(--hair);background:var(--surface)">`)}
      </div>
      ${posField("Observaciones", `<textarea id="pNota" placeholder="Nota interna de la línea…" rows="2" style="width:100%;padding:8px 10px;border-radius:9px;border:1px solid var(--hair);background:var(--surface);resize:vertical">${esc(l.nota || "")}</textarea>`)}
      ${bajo ? `<div style="margin:-2px 0 12px;padding:10px 12px;border-radius:9px;background:${l.auth ? "var(--ok-soft)" : "var(--crit-soft)"};border:1px solid ${l.auth ? "var(--ok-line)" : "var(--crit-line)"};color:${l.auth ? "var(--ok)" : "var(--crit)"};font-size:12.5px;font-weight:650">
          <div style="display:flex;gap:7px;align-items:center">${icon(l.auth ? "shield" : "alert")}<span>Margen ${dec(x.m)} % · mínimo de ${dec(x.min, 0)} % en «${esc(D.famById[a.fam].nom)}»</span></div>
          ${l.auth ? `<div style="font-weight:500;margin-top:4px">Autorizado por Adrián Vindas · quedó en la bitácora.</div>`
        : `<button class="btn sm" data-auth="${idx}" style="margin-top:8px">${icon("shield")}Solicitar autorización</button>`}</div>` : ""}
      <div style="padding:12px 14px;border-radius:11px;background:var(--accent-soft);border:1px solid var(--accent-line);display:flex;flex-direction:column;gap:4px">
        ${posRow("Mercadería", c(neto))}
        ${descMonto ? posRow("Descuento aplicado", "−" + c(descMonto), "var(--warn)") : ""}
        ${posRow("IVA 13 %", c(iva))}
        <div style="height:1px;background:var(--accent-line);margin:2px 0"></div>
        <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:750"><span>Línea</span><span class="num">${c(neto + iva)}</span></div>
      </div>`;
  }

  const quickCard = a => `<button class="mi" data-add="${a.id}" style="border:1px solid var(--hair);align-items:center">
      <span class="mit" style="background:${a.tipo === "Servicio" ? "var(--surface-3)" : "var(--accent-soft)"};color:${a.tipo === "Servicio" ? "var(--ink-3)" : "var(--accent)"}">${icon(a.tipo === "Servicio" ? "wrench" : "box")}</span>
      <span class="mtxt" style="flex:1"><span class="mn" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.desc)}</span>
      <span class="md" style="display:flex;gap:7px;align-items:center"><b class="num" style="color:var(--accent);font-size:13.5px">${a.precio ? c(a.precio) : "Cotizar"}</b>
      ${a.peso ? `<span class="dim num" style="font-size:11.5px">${kg(a.peso)}</span>` : ""}</span></span></button>`;

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
          : `<span style="color:var(--warn);font-weight:650">${l.descTipo === "monto" ? c(l.desc) : dec(l.desc, 0) + " %"}</span>`;
        return `<tr data-selline="${i}" class="${sel ? "sel" : bajo && !l.auth ? "cr" : ""}" style="cursor:pointer">
          <td class="mono dim">${i + 1}</td>
          <td style="min-width:180px"><div class="b" style="font-size:13.5px">${esc(a.desc)}</div>
            <div class="mut" style="font-size:11.5px">${esc(a.cod)} · ${esc(a.marca)} · ${esc(a.unidad)}${desdeCedi ? ' · <span style="color:var(--warn)">se despacha desde CEDI Isabel</span>' : ""}${bajo ? ` · <span style="color:${l.auth ? "var(--ok)" : "var(--crit)"};font-weight:650">margen ${dec(x.m)} %${l.auth ? " autorizado" : ""}</span>` : ""}</div></td>
          <td class="r num">${fmtCant(l.cant, a)}</td>
          <td class="r num">${grp(l.precio)}</td>
          <td class="r">${descCell}</td>
          <td class="r num b">${grp(lineTotal(l))}</td>
          <td class="r"><button class="iconbtn" data-del="${i}" style="width:26px;height:26px;color:var(--ink-4)" title="Quitar línea">${icon("x")}</button></td></tr>`;
      }).join("");

      const tabla = `<div class="scrollx"><table class="dt"><thead><tr>
          <th style="width:30px">#</th><th>Artículo</th><th class="r" style="width:60px">Cant.</th>
          <th class="r" style="width:96px">P. unit.</th><th class="r" style="width:70px">Desc.</th>
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
              ${posRow("Mercadería", c(t.grav + t.exe))}
              ${t.desc ? posRow("Descuentos", "−" + c(t.desc), "var(--warn)") : ""}
              ${posRow("IVA 13 %", c(t.iva))}
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
      $$("[data-selline]", v).forEach(tr => tr.addEventListener("click", () => {
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

      const enter = e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } };
      const selIdx = S.posSel != null && S.cart.lineas[S.posSel] ? S.posSel : null;
      if (selIdx != null) {
        const L = S.cart.lineas[selIdx];
        const menos = $('[data-pcant="-1"]', v), mas = $('[data-pcant="1"]', v);
        if (menos) menos.addEventListener("click", () => { L.cant = Math.max(artOf(L.artId).decimales ? 0.5 : 1, +(L.cant - 1).toFixed(2)); tocaBorrador(); A.refresh(); });
        if (mas) mas.addEventListener("click", () => { L.cant++; tocaBorrador(); A.refresh(); });
        const pc = $("#pCant", v);
        if (pc) { pc.addEventListener("keydown", enter); pc.addEventListener("change", () => { const dec2 = artOf(L.artId).decimales; const n = dec2 ? Math.round(parseFloat(String(pc.value).replace(",", ".")) * 100) / 100 : parseInt(pc.value, 10); L.cant = isFinite(n) && n > 0 ? n : 1; tocaBorrador(); A.refresh(); }); }
        $$("[data-ppres]", v).forEach(b => b.addEventListener("click", () => { L.cant = +(L.cant + +b.dataset.ppres).toFixed(2); tocaBorrador(); A.refresh(); }));
        const pp = $("#pPrecio", v);
        if (pp) { pp.addEventListener("keydown", enter); pp.addEventListener("change", () => { const n = parseFloat(pp.value); L.precio = isFinite(n) && n >= 0 ? n : L.precio; L.auth = false; tocaBorrador(); A.refresh(); }); }
        const pt = $("#pDescTipo", v);
        if (pt) pt.addEventListener("change", () => { L.descTipo = pt.value; L.auth = false; tocaBorrador(); A.refresh(); });
        const pd = $("#pDescVal", v);
        if (pd) {
          pd.addEventListener("keydown", enter);
          pd.addEventListener("change", () => {
            let n = parseFloat(pd.value);
            n = isFinite(n) && n >= 0 ? n : 0;
            L.desc = L.descTipo === "monto" ? Math.min(n, lineBruto(L)) : Math.min(100, n);
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
      v._keys = e => {
        if (S.screen !== "pos" || $("#ovScrim")) return;
        const f = ACCIONES[e.key];
        if (f) { e.preventDefault(); f(); }
      };
      document.addEventListener("keydown", v._keys);
    }
  });

  function autorizar(i) {
    const l = S.cart.lineas[i], a = artOf(l.artId), x = lineMargen(l);
    openSheet({
      title: "Autorización de precio bajo el margen mínimo",
      sub: `Línea ${i + 1} · ${a.desc}`,
      body: `<div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;justify-content:space-between;padding:11px 13px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);font-size:13px"><span>Margen mínimo de «${esc(D.famById[a.fam].nom)}»</span><span class="num b">${x.min},0 %</span></div>
        <div style="display:flex;justify-content:space-between;padding:11px 13px;border-radius:10px;background:var(--crit-soft);border:1px solid var(--crit-line);font-size:13px"><span>Margen del precio solicitado</span><span class="num b" style="color:var(--crit)">${dec(x.m)} %</span></div>
        <div style="display:flex;justify-content:space-between;padding:11px 13px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);font-size:13px"><span>Utilidad que se deja de percibir</span><span class="num b">${c(Math.round((a.costo / (1 - x.min / 100) - x.pv) * l.cant))}</span></div>
        <div><div style="font-size:12px;font-weight:700;color:var(--ink-4);margin-bottom:7px">Puede autorizar</div>
          <div style="display:flex;flex-direction:column;gap:7px">
            <div class="rec" style="border-bottom:0"><span class="avatar">AV</span><div style="flex:1"><div class="b" style="font-size:13.5px">Adrián Vindas</div><div class="mut" style="font-size:12px">Gerencia general</div></div>${tag("WhatsApp", "acc", "chat")}</div>
            <div class="rec" style="border-bottom:0"><span class="avatar">MR</span><div style="flex:1"><div class="b" style="font-size:13.5px">Marta Rojas</div><div class="mut" style="font-size:12px">Jefatura de piso · ${esc(locNom(S.locId))}</div></div>${tag("Correo", "mu", "mail")}</div>
          </div></div>
        <div class="field"><label for="motivo">Motivo (obligatorio)</label><textarea id="motivo" rows="3">Cierre de obra del cliente. Compite con precio de la competencia; se recupera con el volumen del resto de la factura.</textarea></div>
        <div style="display:flex;gap:10px;padding:12px 14px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair)">${icon("shield")}
          <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">Quedan en la bitácora el usuario que solicita, el que autoriza, el motivo, el margen mínimo vigente y el precio aplicado. La autorización sirve para <strong>esta línea y esta factura</strong>; no queda una casilla abierta.</div></div>
      </div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="okAuth">${icon("shield")}Enviar solicitud</button>`,
      after(el) {
        $$("[data-cerrar]", el).forEach(b => b.addEventListener("click", closeSheet));
        $("#okAuth", el).addEventListener("click", () => {
          l.auth = true;
          D.bitacora.unshift({
            id: "BT" + Date.now(), fecha: new Date(), usuario: "Adrián Vindas", rol: "Gerencia",
            locId: S.locId, accion: "Autorizó venta bajo margen",
            detalle: `${a.desc} · margen ${dec(x.m)} % contra mínimo ${x.min} %`,
            sev: "Alta", antes: x.min + ",0 %", despues: dec(x.m) + " %", ip: "10.2.14.8"
          });
          closeSheet();
          toast("Autorización registrada", "Adrián Vindas autorizó la línea. Quedó en la bitácora.", "ok");
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
          closeSheet(); A.refresh();
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
    const t = D.totalizar(lineas);
    D.seq.PROF++;
    const cons = "PROF-" + String(D.seq.PROF).padStart(6, "0");
    D.proformas.unshift({
      id: "PF-" + D.seq.PROF, cons, tipo: "Proforma", fecha: new Date(), clienteId: S.cart.cliId,
      locId: S.locId, lineas, ...t, vence: new Date(D.HOY.getTime() + 15 * 86400000),
      estado: "Vigente", origen: "Mostrador"
    });
    toast("Proforma " + cons + " guardada", "Queda en Cotizaciones y pedidos, lista para convertirse en factura sin redigitar.", "ok");
    A.refresh();
  }

  function cobrar() {
    const sinAutorizar = pendientes().length;
    if (sinAutorizar) return toast(
      sinAutorizar === 1 ? "Falta una autorización de margen" : "Faltan " + sinAutorizar + " autorizaciones de margen",
      "Abra la línea marcada en rojo y solicite la autorización. La factura no se aplica mientras tanto.", "cr");
    const t = cartTot();
    const cli = cliCart();
    const redondeo = Math.ceil(t.total / 5000) * 5000;
    openSheet({
      title: "Cobro de la factura", sub: `${cli ? cli.nom : "Consumidor final"} · ${c(t.total)}`,
      body: `<div class="grid" style="grid-template-columns:repeat(3,1fr);gap:8px" id="medios">
          ${[["cash", "Efectivo"], ["card", "Tarjeta"], ["phone", "SINPE móvil"], ["bank", "Transferencia"], ["file", "Cheque"], ["wallet", "Anticipo"]]
          .map((m, i) => `<button class="btn" style="flex-direction:column;padding:15px 8px;gap:6px" data-medio="${m[1]}" aria-pressed="${i === 0}">${icon(m[0])}${m[1]}</button>`).join("")}
        </div>
        <div class="field" style="margin-top:16px"><label for="monto">Monto recibido</label>
          <input id="monto" class="num" style="font-size:22px;font-weight:600;text-align:right;padding:11px 13px" value="${grp(redondeo)}"></div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:12px;padding-top:11px;border-top:1px solid var(--hair-2)">
          <span style="font-size:13px;font-weight:600">Vuelto</span>
          <span class="num" id="vuelto" style="font-size:21px;font-weight:700;color:var(--ok)">${c(redondeo - t.total)}</span></div>
        ${S.cart.condicion === "Crédito" && cli ? `<div style="margin-top:16px;padding:12px 14px;border-radius:10px;background:var(--accent-soft);border:1px solid var(--accent-line);display:flex;gap:10px">${icon("info")}
          <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">Venta a crédito con IVA diferido: el <strong>Recibo Electrónico de Pago</strong> se emite cuando entre el dinero, no ahora. El IVA se declara en el mes del REP.</div></div>` : ""}
        <div style="margin-top:12px;padding:12px 14px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);display:flex;gap:10px">${icon("shield")}
          <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">Al aplicar: se firma y ${S.offline ? "se encola para" : "se envía a"} Hacienda, baja el inventario, se genera el asiento contable${S.cart.condicion === "Crédito" ? " y la cuenta por cobrar" : ""}.</div></div>`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn">${icon("print")}Imprimir</button><button class="btn pri" id="okPay">${icon("check")}Aplicar</button>`,
      after(el) {
        let medio = "Efectivo";
        $$("[data-medio]", el).forEach(b => b.addEventListener("click", () => {
          $$("[data-medio]", el).forEach(x => x.setAttribute("aria-pressed", "false"));
          b.setAttribute("aria-pressed", "true"); medio = b.dataset.medio;
        }));
        $$("[data-cerrar]", el).forEach(b => b.addEventListener("click", closeSheet));
        const mo = $("#monto", el);
        mo.addEventListener("input", () => {
          const val = parseInt(mo.value.replace(/\D/g, ""), 10) || 0;
          const d = val - t.total;
          const e = $("#vuelto", el);
          e.textContent = c(d);
          e.style.color = d < 0 ? "var(--crit)" : "var(--ok)";
        });
        $("#okPay", el).addEventListener("click", () => {
          const doc = D.emitir({
            tipo: cli ? "FE" : "TE", locId: S.locId, term: S.term,
            clienteId: S.cart.cliId, vendedor: S.vendedor,
            lineas: lineasFiscales(),
            condicion: S.cart.condicion, medio: S.cart.condicion === "Crédito" ? "Crédito" : medio,
            hacienda: S.offline ? "En cola" : "Aceptado", fecha: new Date()
          });
          closeSheet();
          S.cart = { cliId: S.cart.cliId, condicion: S.cart.condicion, lineas: [], draft: null, apartado: [] };
          S.posSel = null;
          toast("Factura " + doc.cons + " aplicada",
            `${S.offline ? "Queda en cola para Hacienda." : "Aceptada por Hacienda."} Bajó el inventario y generó el asiento${S.cart.condicion === "Crédito" ? " y la cuenta por cobrar" : ""}.`, "ok");
          A.refresh();
        });
      }
    });
  }

  /* ══ DOCUMENTOS DE VENTA ═════════════════════════════════════ */
  const docF = { tipo: "Todos", loc: "Todos", q: "" };
  const filtrarDocs = () => {
    let rows = D.documentos.filter(d => docF.tipo === "Todos" || d.tipo === docF.tipo);
    if (docF.loc !== "Todos") rows = rows.filter(d => d.locId === docF.loc);
    if (docF.q) rows = rows.filter(d => norm(d.cons + " " + cliNom(d.clienteId)).includes(norm(docF.q)));
    return rows.slice(0, 160);
  };

  A.screen("documentos", {
    title: "Documentos de venta",
    sub: () => D.documentos.length + " comprobantes electrónicos emitidos",
    extra: () => seg("dtipo", ["Todos", "FE", "TE", "NC"], docF.tipo),
    render(v, arg) {
      const rows = filtrarDocs();
      const tot = rows.reduce((s, d) => s + (d.tipo === "NC" ? -d.total : d.total), 0);
      v.innerHTML = card({
        title: "Comprobantes electrónicos", hint: rows.length + " en pantalla",
        actions: `<input class="inp" id="dq" placeholder="Consecutivo o cliente" value="${esc(docF.q)}" style="width:210px">
          <select class="inp" id="dloc" style="width:auto"><option>Todos</option>${D.tiendas.map(l => `<option value="${l.id}" ${docF.loc === l.id ? "selected" : ""}>${esc(l.nom)}</option>`).join("")}</select>
          <button class="btn">${icon("print")}Exportar</button>`,
        body: table({
          h: "calc(100dvh - 300px)", onRow: true,
          cols: [
            { t: "Consecutivo", cls: "mono", fmt: r => `${esc(r.cons)}<span class="sub">${esc(r.clave.slice(0, 24))}…</span>` },
            { t: "Tipo", fmt: r => tag(r.tipo, r.tipo === "NC" ? "wa" : r.tipo === "TE" ? "mu" : "ac") },
            { t: "Fecha", cls: "mono", fmt: r => fh(r.fecha) },
            { t: "Local", fmt: r => esc(locNom(r.locId)) },
            { t: "Cliente", fmt: r => esc(cliNom(r.clienteId)) },
            { t: "Vendedor", fmt: r => `<span class="mut">${esc(r.vendedor)}</span>` },
            { t: "Cond.", fmt: r => esc(r.condicion) },
            { t: "Margen", r: true, cls: "mono", fmt: r => r.tipo === "NC" ? "—" : `<span style="color:${r.margen < 18 ? "var(--crit)" : "var(--ink)"}">${dec(r.margen)} %</span>` },
            { t: "Total", r: true, cls: "mono", fmt: r => `<b>${r.tipo === "NC" ? "−" : ""}${grp(r.total)}</b>` },
            { t: "Hacienda", fmt: r => r.hacienda === "Aceptado" ? tag("Aceptado", "ok", "check") : tag("En cola", "wa", "alert") }
          ],
          rows,
          rowCls: r => (r.margen && r.margen < 18 && r.tipo !== "NC" ? "cr" : ""),
          foot: [{ v: rows.length + " documentos", span: 8 }, { v: grp(tot), r: true, cls: "mono" }, { v: "" }]
        })
      });
      if (arg) setTimeout(() => detalleDoc(D.documentos.find(d => d.id === arg)), 30);
    },
    wire(v) {
      onSeg(document, "dtipo", val => { docF.tipo = val; A.refresh(); });
      const q = $("#dq", v);
      q.addEventListener("change", () => { docF.q = q.value; A.refresh(); });
      $("#dloc", v).addEventListener("change", e => { docF.loc = e.target.value; A.refresh(); });
      $$("tr.clickable", v).forEach(tr => tr.addEventListener("click", () => detalleDoc(filtrarDocs()[+tr.dataset.i])));
    }
  });

  function detalleDoc(d) {
    if (!d) return;
    openSheet({
      wide: true, title: d.tipo + " " + d.cons,
      sub: `${cliNom(d.clienteId)} · ${fh(d.fecha)} · ${locNom(d.locId)} terminal ${d.term}`,
      body: `<div class="card" style="margin-bottom:14px"><div class="card-b flush"><div class="strip">
          <div class="cell"><div class="cl">Clave numérica</div><div class="cv num" style="font-size:11px;word-break:break-all">${esc(d.clave)}</div></div>
          <div class="cell"><div class="cl">Condición</div><div class="cv">${esc(d.condicion)} · ${esc(d.medio)}</div></div>
          <div class="cell"><div class="cl">Estado en Hacienda</div><div class="cv">${d.hacienda === "Aceptado" ? tag("Aceptado", "ok", "check") : tag("En cola", "wa", "alert")}</div></div>
          <div class="cell"><div class="cl">Vendedor</div><div class="cv">${esc(d.vendedor)}</div></div>
        </div></div></div>
        ${table({
        cols: [
          { t: "Código", cls: "mono", fmt: r => esc(artOf(r.artId).cod) },
          { t: "Descripción", fmt: r => esc(artOf(r.artId).desc) },
          { t: "CABYS", cls: "mono", fmt: r => esc(artOf(r.artId).cabys) },
          { t: "Cant.", r: true, cls: "mono", fmt: r => grp(r.cant) },
          { t: "Precio", r: true, cls: "mono", fmt: r => grp(r.precio) },
          { t: "Desc.", r: true, cls: "mono", fmt: r => (r.desc ? dec(r.desc) + " %" : "—") },
          { t: "Total", r: true, cls: "mono", fmt: r => `<b>${grp(Math.round(r.cant * r.precio * (1 - (r.desc || 0) / 100)))}</b>` }
        ], rows: d.lineas
      })}
        <div style="display:grid;grid-template-columns:1fr 260px;gap:16px;margin-top:16px">
          <div class="mut" style="font-size:12.5px;line-height:1.6">El XML firmado y la respuesta de Hacienda quedan guardados cinco años en el archivo del cliente, no en el proveedor del sistema.</div>
          <div>
            <div class="totline s"><span class="tl">Gravado</span><span class="tv">${grp(d.grav)}</span></div>
            <div class="totline s"><span class="tl">Descuentos</span><span class="tv">−${grp(d.desc)}</span></div>
            <div class="totline"><span class="tl">IVA 13 %</span><span class="tv">${grp(d.iva)}</span></div>
            <div class="totrule"></div>
            <div class="totline"><span class="tl b">Total</span><span class="tv" style="font-size:17px">${c(d.total)}</span></div>
          </div>
        </div>`,
      footer: `<button class="btn" id="cerrarDoc">Cerrar</button><div class="gap"></div>
        <button class="btn">${icon("download")}Descargar XML</button><button class="btn">${icon("print")}Imprimir PDF</button>
        ${d.tipo !== "NC" ? `<button class="btn" style="color:var(--crit);border-color:var(--crit-line)">${icon("swap")}Nota de crédito</button>` : ""}`,
      after(el) { $("#cerrarDoc", el).addEventListener("click", closeSheet); }
    });
  }

  /* ══ COTIZACIONES Y PEDIDOS ══════════════════════════════════ */
  A.screen("cotizaciones", {
    title: "Cotizaciones y pedidos",
    sub: () => "El pedido y la proforma comparten el mismo cuerpo de la factura",
    render(v) {
      const perdidas = D.proformas.filter(p => p.estado === "Vencida");
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Proformas vigentes", D.proformas.filter(p => p.estado === "Vigente").length, { txt: "convertibles sin volver a digitar", dir: "" })}
          ${stat("Vencidas sin convertir", perdidas.length, { txt: c(perdidas.reduce((s, p) => s + p.total, 0)) + " de venta perdida", dir: "down" }, "var(--crit)")}
          ${stat("Desde la tienda virtual", D.proformas.filter(p => p.origen === "Tienda virtual").length, { txt: "entran por la página y siguen el flujo normal", dir: "" })}
          ${stat("Tasa de conversión", "63,4 %", { txt: "proformas que terminan en factura", dir: "up" }, "var(--ok)")}
        </div>
        ${card({
        title: "Documentos previos", hint: "la cotización se convierte en factura sin redigitar",
        body: table({
          cols: [
            { t: "Documento", cls: "mono", fmt: r => esc(r.cons) },
            { t: "Tipo", fmt: r => tag(r.tipo, r.tipo === "Pedido" ? "ac" : "mu") },
            { t: "Origen", fmt: r => (r.origen === "Tienda virtual" ? tag("Tienda virtual", "ac", "chat") : esc(r.origen)) },
            { t: "Cliente", fmt: r => esc(cliNom(r.clienteId)) },
            { t: "Local", fmt: r => esc(locNom(r.locId)) },
            { t: "Emitida", cls: "mono", fmt: r => fecha(r.fecha) },
            { t: "Líneas", r: true, cls: "mono", fmt: r => r.lineas.length },
            { t: "Total", r: true, cls: "mono", fmt: r => `<b>${grp(r.total)}</b>` },
            { t: "Estado", fmt: r => (r.estado === "Vencida" ? tag("Vencida", "cr", "alert") : tag("Vigente", "ok", "check")) },
            { t: "", r: true, fmt: (r, i) => `<button class="btn sm pri" data-conv="${i}">Convertir en factura</button>` }
          ], rows: D.proformas, rowCls: r => (r.estado === "Vencida" ? "wa" : "")
        })
      })}</div>`;
    },
    wire(v) {
      $$("[data-conv]", v).forEach(b => b.addEventListener("click", () => {
        const p = D.proformas[+b.dataset.conv];
        S.cart = {
          cliId: p.clienteId, condicion: D.cliById[p.clienteId] && D.cliById[p.clienteId].limite ? "Crédito" : "Contado",
          lineas: p.lineas.map(l => ({ artId: l.artId, cant: l.cant, precio: l.precio, descTipo: "pct", desc: l.desc || 0, nota: "", auth: false }))
        };
        S.posSel = null;
        toast("Cargada en la caja", p.cons + " pasó a la factura en curso sin volver a digitar.", "ok");
        A.go("pos");
      }));
    }
  });

  /* ══ DESPACHOS Y ENTREGAS ════════════════════════════════════ */
  A.screen("despachos", {
    title: "Despachos y entregas",
    sub: () => "La mercadería vendida y no entregada sigue comprometida",
    render(v) {
      const comp = [];
      D.articulos.forEach(a => Object.keys(D.existencias[a.id] || {}).forEach(l => {
        const e = D.existencias[a.id][l];
        if (e.comp > 0) comp.push({ a, l, e });
      }));
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Pendientes de alistar", D.despachos.filter(d => d.estado === "Pendiente de alistar").length, { txt: "mercadería vendida que no ha salido", dir: "" }, "var(--warn)")}
          ${stat("En ruta", D.despachos.filter(d => d.estado === "En ruta").length, { txt: "con chofer y vehículo asignado", dir: "" })}
          ${stat("Retiro en otro local", D.despachos.filter(d => d.retiroEn !== d.locId).length, { txt: "se factura en un local y se entrega en otro", dir: "" })}
          ${stat("Líneas comprometidas", comp.length, { txt: "existencia apartada que no se puede vender", dir: "" })}
        </div>
        <div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);align-items:start">
          ${card({
        title: "Despachos", hint: "peso y vehículo salen del catálogo",
        body: table({
          cols: [
            { t: "Despacho", cls: "mono", fmt: r => `${esc(r.id)}<span class="sub">${esc(r.doc)}</span>` },
            { t: "Cliente", fmt: r => esc(cliNom(r.clienteId)) },
            { t: "Sale de", fmt: r => esc(locNom(r.locId)) },
            { t: "Entrega", fmt: r => (r.retiroEn !== r.locId ? tag("Retira en " + locNom(r.retiroEn), "ac", "pin") : esc(r.ruta)) },
            { t: "Peso", r: true, cls: "mono", fmt: r => kg(w.pesoLineas(r.lineas)) },
            { t: "Líneas", r: true, cls: "mono", fmt: r => r.lineas.length },
            { t: "Estado", fmt: r => tag(r.estado, r.estado === "Entregado" ? "ok" : r.estado === "Pendiente de alistar" ? "wa" : "ac") }
          ], rows: D.despachos, rowCls: r => (r.estado === "Pendiente de alistar" ? "wa" : "")
        })
      })}
          ${card({
        title: "Mercadería comprometida", hint: "vendida y no entregada",
        body: table({
          h: "420px",
          cols: [
            { t: "Artículo", fmt: r => `${esc(r.a.desc)}<span class="sub">${esc(r.a.cod)}</span>` },
            { t: "Local", fmt: r => esc(locNom(r.l)) },
            { t: "Existe", r: true, cls: "mono", fmt: r => grp(r.e.cant) },
            { t: "Comprom.", r: true, cls: "mono", fmt: r => `<b style="color:var(--warn)">${grp(r.e.comp)}</b>` },
            { t: "Libre", r: true, cls: "mono", fmt: r => grp(r.e.cant - r.e.comp) }
          ], rows: comp.slice(0, 60), rowCls: r => (r.e.cant - r.e.comp <= 0 ? "cr" : "")
        })
      })}
        </div></div>`;
    }
  });

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

  /* ══ CLIENTES ════════════════════════════════════════════════ */
  let cliQ = "";
  A.screen("clientes", {
    title: "Clientes",
    sub: () => D.clientes.length + " clientes activos de 78 412 en la base",
    render(v, arg) {
      if (arg) S.cliSel = arg;
      const lista = cliQ ? D.clientes.filter(x => norm(x.nom + " " + x.ced).includes(norm(cliQ))) : D.clientes;
      const cli = D.cliById[S.cliSel] || D.clientes[0];
      S.cliSel = cli.id;
      const docs = D.documentos.filter(d => d.clienteId === cli.id).slice(0, 30);
      const comprado = docs.reduce((s, d) => s + (d.tipo === "NC" ? -d.total : d.total), 0);
      v.innerHTML = `<div class="split">
        ${card({
        cls: "mlist",
        body: `<div class="tb-search" style="width:100%;margin-bottom:8px">${icon("search")}<input id="cq" type="search" value="${esc(cliQ)}" placeholder="Nombre o cédula"></div>
          <div class="mut" style="font-size:12px;margin-bottom:6px">Tolera acentos y errores de tecleo. No hay que escribir comodines.</div>
          <div class="mitems">${lista.map(x => `<button class="mitem" data-cli="${x.id}" aria-selected="${x.id === cli.id}">
            <span style="flex:1;min-width:0"><span class="itd">${esc(x.nom)}</span><span class="itc">${esc(x.ced)}</span></span>
            ${x.saldo > 0 ? tag(c(Math.round(x.saldo)), x.saldo > x.limite ? "cr" : "mu") : ""}</button>`).join("")}</div>`
      })}
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
          ${card({
        body: `<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
            <span class="avatar" style="width:46px;height:46px;font-size:15px">${esc(ini(cli.nom))}</span>
            <div style="flex:1;min-width:190px">
              <h3 style="font-size:19px">${esc(cli.nom)}</h3>
              <div class="mut num" style="font-size:12px;margin-top:2px">${esc(cli.ced)} · ${esc(cli.tipoCed)}</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:9px">
                ${tag(cli.categoria, "acc")}${tag(cli.dir, "mu", "pin")}${tag(cli.tel, "mu", "phone")}
                ${cli.exonerado ? tag("Exoneración vigente", "ok", "shield") : ""}${tag("Cliente desde " + cli.desde, "mu")}</div>
            </div>
            <button class="btn pri" id="facturar">${icon("cash")}Facturar a este cliente</button>
          </div>
          <div class="ficha" style="margin:14px -17px -16px;border-top:1px solid var(--hair-2)">
            ${U.fichaCell("Límite de crédito", cli.limite ? c(cli.limite) : "Contado")}
            ${U.fichaCell("Saldo actual", c(Math.round(cli.saldo)))}
            ${U.fichaCell("Disponible", cli.limite ? c(Math.round(cli.limite - cli.saldo)) : "—", cli.limite - cli.saldo > 0 ? "var(--ok)" : "var(--crit)")}
            ${U.fichaCell("Plazo", cli.plazo ? cli.plazo + " días" : "Contado")}
            ${U.fichaCell("Comprado", c(comprado))}
          </div>`
      })}
          <div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">
            ${card({
        title: "Estado de cuenta", hint: "últimos movimientos",
        body: table({
          h: "340px",
          cols: [
            { t: "Documento", cls: "mono", fmt: r => esc(r.cons) },
            { t: "Tipo", fmt: r => tag(r.tipo, r.tipo === "NC" ? "wa" : "mu") },
            { t: "Fecha", cls: "mono", fmt: r => fecha(r.fecha) },
            { t: "Cond.", fmt: r => esc(r.condicion) },
            { t: "Total", r: true, cls: "mono", fmt: r => `${r.tipo === "NC" ? "−" : ""}${grp(r.total)}` },
            { t: "Saldo", r: true, cls: "mono", fmt: r => (r.saldo ? `<b style="color:var(--warn)">${grp(r.saldo)}</b>` : '<span class="dim">0</span>') }
          ], rows: docs
        })
      })}
            ${card({
        title: "Ficha comercial",
        body: `<dl class="kv">
            <dt>Categoría de precio</dt><dd>${esc(cli.categoria)}</dd>
            <dt>Descuento por categoría</dt><dd>${cli.categoria === "Maestro de obra" ? "hasta 8 %" : cli.categoria === "Constructora" ? "hasta 12 %" : "—"}</dd>
            <dt>Actividad económica</dt><dd>${esc(cli.tipoCed === "Jurídica" ? "Construcción de edificios" : "Consumidor final")}</dd>
            <dt>Correo de comprobantes</dt><dd style="font-size:12px">${esc(cli.nom.split(" ")[0].toLowerCase())}@correo.cr</dd>
            <dt>Autorizados a retirar</dt><dd>${cli.autorizados.length || "—"}</dd>
            <dt>Territorio</dt><dd>${esc(cli.dir)}</dd></dl>
          ${cli.autorizados.length ? `<div style="margin-top:14px;padding:11px 13px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);font-size:12.5px;color:var(--ink-2);line-height:1.55;display:flex;gap:9px">${icon("shield")}
            <span>Solo estas personas pueden retirar mercadería a nombre del cliente: ${esc(cli.autorizados.join(", "))}.</span></div>` : ""}`
      })}
          </div>
        </div></div>`;
    },
    wire(v) {
      const q = $("#cq", v);
      q.addEventListener("input", () => {
        cliQ = q.value;
        A.refresh();
        setTimeout(() => { const e = $("#cq"); if (e) { e.focus(); e.setSelectionRange(e.value.length, e.value.length); } }, 0);
      });
      $$("[data-cli]", v).forEach(b => b.addEventListener("click", () => { S.cliSel = b.dataset.cli; A.refresh(); }));
      const f = $("#facturar", v);
      if (f) f.addEventListener("click", () => {
        S.cart.cliId = S.cliSel;
        S.cart.condicion = D.cliById[S.cliSel].limite ? "Crédito" : "Contado";
        A.go("pos");
      });
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
        `<button class="btn" style="flex-direction:column;padding:15px 8px;gap:6px" data-m aria-pressed="${i === 0}">${icon(m[0])}${m[1]}</button>`).join("")}
        </div>
        <div class="field" style="margin-top:16px"><label for="pm">Monto a aplicar</label>
          <input id="pm" class="num" style="font-size:20px;text-align:right;font-weight:600;padding:10px 12px" value="${grp(d.saldo)}"></div>
        <div style="margin-top:16px;padding:12px 14px;border-radius:10px;background:var(--accent-soft);border:1px solid var(--accent-line);display:flex;gap:10px">${icon("info")}
          <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">Al aplicar el pago el sistema emite el <strong>Recibo Electrónico de Pago</strong> del monto recibido y declara el IVA en el mes del REP. Es obligatorio desde el 1.º de setiembre de 2025 para las ventas a crédito con IVA diferido.</div></div>`,
      footer: `<button class="btn" id="cancPago">Cancelar</button><div class="gap"></div><button class="btn pri" id="okp">${icon("check")}Aplicar y emitir REP</button>`,
      after(el) {
        $$("[data-m]", el).forEach(b => b.addEventListener("click", () => {
          $$("[data-m]", el).forEach(x => x.setAttribute("aria-pressed", "false"));
          b.setAttribute("aria-pressed", "true");
        }));
        $("#cancPago", el).addEventListener("click", closeSheet);
        $("#okp", el).addEventListener("click", () => {
          const m = parseInt($("#pm", el).value.replace(/\D/g, ""), 10) || 0;
          const rep = D.consecutivo("REP", d.locId, d.term);
          d.saldo = Math.max(0, d.saldo - m);
          if (D.cliById[d.clienteId]) D.cliById[d.clienteId].saldo -= m;
          D.asentar(new Date(), rep, `Cobro de ${d.cons}`, [
            { cta: "1-01-02-001", debe: m, haber: 0 },
            { cta: "1-01-03-001", debe: 0, haber: m },
            { cta: "2-01-02-002", debe: Math.round((m * 0.13) / 1.13), haber: 0 },
            { cta: "2-01-02-001", debe: 0, haber: Math.round((m * 0.13) / 1.13) }
          ]);
          closeSheet();
          toast("REP " + rep + " emitido", "El pago quedó aplicado y el IVA diferido pasó a IVA por pagar de este mes.", "ok");
          A.refresh();
        });
      }
    });
  }
})(window);
