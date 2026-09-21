/* ═══════════════════════════════════════════════════════════════
   Compras — cotizar a proveedores, órdenes y recepción,
   proveedores, cuentas por pagar y facturación electrónica.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, S = w.S, U = w.UI;
  const { $, $$, esc, grp, c, dec, kg, fecha, hora, icon, tag, card, stat, table, seg, onSeg, fichaCell,
    openSheet, closeSheet, toast, locNom, provNom, cliNom, artOf, empty } = U;

  /* ══ COTIZAR A PROVEEDORES ═══════════════════════════════════ */
  let subasta = 0;
  const SUB_ART = ["FER-00915", "FER-00917", "FER-01120", "FER-01455", "FER-03004", "FER-08010"];
  const SUB_PROV = ["P1", "P5", "P9", "P8"];
  const SUB_CANT = { "FER-00915": 600, "FER-00917": 400, "FER-01120": 2400, "FER-01455": 1200, "FER-03004": 180, "FER-08010": 90 };

  A.screen("subasta", {
    title: "Cotizar a proveedores",
    sub: () => "Comparar antes de adjudicar, y no solo por el número más bajo",
    render(v) {
      const arts = SUB_ART.map(cd => D.articulos.find(a => a.cod === cd)).filter(Boolean);
      const provs = SUB_PROV.map(p => D.provById[p]).filter(Boolean);
      const of = (a, p, i) => Math.round(a.costo * (1 + (((a.id.charCodeAt(1) + i * 7) % 11) - 5) / 100));

      v.innerHTML = `<div class="wrap">
        ${card({
        title: "Subasta SUB-2026-000118 · Fontanería y riego",
        actions: tag(subasta === 0 ? "Por enviar" : subasta === 1 ? "Esperando respuestas" : "Respuestas cargadas", subasta >= 2 ? "ok" : "wa"),
        body: `<div class="ficha" style="margin:-12px -17px 0;border-bottom:1px solid var(--hair-2)">
            ${fichaCell("Artículos", arts.length)}
            ${fichaCell("Proveedores invitados", provs.length)}
            ${fichaCell("Cierra", '<span style="font-family:var(--ui);font-size:14px">lunes 21 set · 4:00 p.m.</span>')}
            ${fichaCell("Responsable", '<span style="font-family:var(--ui);font-size:14px">Óscar Jiménez · Proveeduría</span>')}
            ${fichaCell("Destino", '<span style="font-family:var(--ui);font-size:14px">CEDI Isabel</span>')}
          </div>
          <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center;padding-top:14px">
            <button class="btn ${subasta === 0 ? "pri" : ""}" id="sub1" ${subasta > 0 ? "disabled" : ""}>${icon("file")}1 · Generar y enviar la lista</button>
            <button class="btn ${subasta === 1 ? "pri" : ""}" id="sub2" ${subasta !== 1 ? "disabled" : ""}>${icon("arrowdown")}2 · Cargar respuestas recibidas</button>
            <button class="btn ${subasta === 2 ? "pri" : ""}" id="sub3" ${subasta !== 2 ? "disabled" : ""}>${icon("sparkle")}3 · Sugerencia de adjudicación</button>
            <span class="mut" style="margin-left:auto;font-size:12.5px;display:inline-flex;gap:6px;align-items:center">${icon("info", 'style="width:15px;height:15px"')}Hoy esto se copia y se pega a mano desde los correos de 5 a 15 proveedores.</span>
          </div>`
      })}
        ${card({
        title: "Cuadro comparativo",
        hint: subasta < 2 ? "se llena solo cuando entran los archivos de los proveedores" : "el mejor precio de cada línea va marcado",
        body: subasta < 2
          ? empty("gavel", "Aún no hay respuestas cargadas", "Cuando los proveedores devuelvan su archivo, el cuadro se arma solo. Nadie vuelve a digitar precios.")
          : table({
            cols: [{ t: "Artículo", fmt: r => `${esc(r.a.desc)}<span class="sub">${esc(r.a.cod)} · ${grp(SUB_CANT[r.a.cod])} ${esc(r.a.unidad)}</span>` }]
              .concat(provs.map((p, i) => ({
                t: p.nom.split(" ")[0], r: true, cls: "mono",
                fmt: r => {
                  const val = of(r.a, p, i);
                  const best = Math.min.apply(null, provs.map((q, j) => of(r.a, q, j)));
                  return `<span style="${val === best ? "color:var(--ok);font-weight:700" : ""}" data-tip="${esc(p.nom)} · plazo ${p.plazo} días">${grp(val)}${val === best ? " ✓" : ""}</span>`;
                }
              })))
              .concat([{
                t: "Ahorro vs. peor", r: true, cls: "mono", fmt: r => {
                  const vals = provs.map((q, j) => of(r.a, q, j));
                  return `<b style="color:var(--ok)">${grp((Math.max.apply(null, vals) - Math.min.apply(null, vals)) * SUB_CANT[r.a.cod])}</b>`;
                }
              }]),
            rows: arts.map(a => ({ a }))
          })
      })}
        ${subasta === 3 ? card({
        title: "Sugerencia de adjudicación", actions: tag("Asistida por IA", "acc", "sparkle"),
        body: `<div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;gap:11px;padding:13px 15px;border-radius:10px;background:var(--accent-soft);border:1px solid var(--accent-line)">${icon("sparkle")}
            <div style="font-size:13.5px;color:var(--ink);line-height:1.6">
              <strong>Recomendación:</strong> adjudicar tubería y accesorios a <strong>Amanco</strong> aunque Tuboplast esté ₡38 400 más barato en total.
              Amanco da 30 días contra 15 de Tuboplast, cumplió 11 de 11 entregas en los últimos 90 días y despacha directo al CEDI.
              La diferencia de precio se compensa con 15 días más de financiamiento sobre ₡3,4 millones.
              <br><br><strong>Excepción:</strong> la manguera de jardín sí conviene a <strong>Productos de Concreto</strong>, ₡520 más barata por unidad y es un artículo de rotación baja donde el plazo importa menos.</div></div>
          <div style="display:flex;gap:9px;flex-wrap:wrap">
            <button class="btn pri" id="adj">${icon("check")}Adjudicar como sugiere</button>
            <button class="btn">Adjudicar solo por precio</button>
            <button class="btn">Adjudicar manualmente</button></div>
          <div class="mut" style="font-size:12.5px;line-height:1.5">La sugerencia se explica siempre. La decisión y su motivo quedan en la bitácora con el nombre de quien adjudicó.</div>
        </div>`
      }) : ""}</div>`;
    },
    wire(v) {
      const s1 = $("#sub1", v), s2 = $("#sub2", v), s3 = $("#sub3", v), ad = $("#adj", v);
      if (s1) s1.addEventListener("click", () => { subasta = 1; toast("Lista enviada", "Se envió a 4 proveedores en el formato que ellos usan, con la cantidad y el destino.", "ok"); A.refresh(); });
      if (s2) s2.addEventListener("click", () => { subasta = 2; toast("4 archivos cargados", "El cuadro comparativo se armó solo. Cero digitación.", "ok"); A.refresh(); });
      if (s3) s3.addEventListener("click", () => { subasta = 3; A.refresh(); });
      if (ad) ad.addEventListener("click", () => { toast("Adjudicado", "Se crearon 2 órdenes de compra con el motivo de la decisión registrado.", "ok"); subasta = 0; A.go("ordenes"); });
    }
  });

  /* ══ ÓRDENES Y RECEPCIÓN ═════════════════════════════════════ */
  let ocPane = "Orden de compra";
  A.screen("ordenes", {
    title: "Órdenes y recepción",
    sub: () => D.compras.length + " órdenes · 2 500 a 3 000 facturas de compra al mes en producción",
    extra: () => seg("ocp", ["Orden de compra", "Recepción"], ocPane),
    render(v) {
      const oc = D.compras[S.ocSel] || D.compras[0];
      const p = D.provById[oc.provId];
      const sum = oc.lineas.reduce((s, l) => s + l.cant * l.costo, 0);
      const bloqueada = oc.lineas.filter(l => Math.abs(l.var) > 15);
      const factura = oc.facturaProv ? sum + bloqueada.reduce((s, l) => s + l.cant * (artOf(l.artId).costo - l.costo), 0) : sum;

      v.innerHTML = `<div class="wrap">
        ${card({
        body: `<div class="ficha" style="margin:-12px -17px -16px">
          ${fichaCell("Orden", esc(oc.cons))}
          ${fichaCell("Proveedor", `<span style="font-family:var(--ui);font-size:14px">${esc(p.nom)}</span>`)}
          ${fichaCell("Cédula jurídica", esc(p.ced))}
          ${fichaCell("Condición de pago", `<span style="font-family:var(--ui);font-size:14px">${oc.plazo} días</span>`)}
          ${fichaCell("Destino", `<span style="font-family:var(--ui);font-size:14px">${esc(locNom(oc.locId))}</span>`)}
          ${fichaCell("Estado", tag(oc.estado, oc.estado === "Aplicada" ? "ok" : "acc"))}
          ${fichaCell("Cambiar de orden", `<select class="inp" id="ocsel" style="font-family:var(--ui);font-size:13px;padding:5px 8px">${D.compras.map((o, i) => `<option value="${i}" ${i === S.ocSel ? "selected" : ""}>${esc(o.cons)} · ${esc(provNom(o.provId))}</option>`).join("")}</select>`)}
        </div>`
      })}
        ${ocPane === "Orden de compra" ? card({
        title: "Líneas de la orden", hint: "la variación de costo sobre ±15 % bloquea la línea",
        actions: `${tag(oc.lineas.length + " líneas", "mu")}<button class="btn">${icon("plus")}Cargar desde plantilla</button><button class="btn">${icon("copy")}Copiar a otro local</button>`,
        body: table({
          h: "calc(100dvh - 470px)",
          cols: [
            { t: "#", cls: "mono dim", w: "38px", fmt: (r, i) => i + 1 },
            { t: "Código", cls: "mono", w: "100px", fmt: r => esc(artOf(r.artId).cod) },
            { t: "Descripción", fmt: r => esc(artOf(r.artId).desc) },
            { t: "Cant.", r: true, cls: "mono", w: "74px", fmt: r => grp(r.cant) },
            { t: "Peso", r: true, cls: "mono", w: "84px", fmt: r => `<span class="mut">${kg(r.cant * (artOf(r.artId).peso || 0))}</span>` },
            { t: "Costo", r: true, cls: "mono", w: "92px", fmt: r => `<span style="${Math.abs(r.var) > 15 ? "color:var(--crit);font-weight:700" : ""}">${grp(r.costo)}</span>` },
            { t: "Var.", r: true, cls: "mono", w: "80px", fmt: r => `<span style="color:${Math.abs(r.var) > 15 ? "var(--crit)" : "var(--ink-3)"};${Math.abs(r.var) > 15 ? "font-weight:700" : ""}">${dec(r.var)} %</span>` },
            { t: "Total", r: true, cls: "mono", w: "112px", fmt: r => `<b>${grp(r.cant * r.costo)}</b>` }
          ],
          rows: oc.lineas,
          rowCls: r => (Math.abs(r.var) > 15 ? "cr" : ""),
          foot: [{ v: "Suma corrida · " + oc.lineas.length + " líneas", span: 7 }, { v: grp(sum), r: true, cls: "mono" }]
        }) + `<div class="ficha" style="border-top:1px solid var(--hair)">
            ${fichaCell("Suma corrida", c(sum))}
            ${fichaCell("Factura del proveedor", c(factura))}
            ${fichaCell("Diferencia", c(factura - sum), factura - sum ? "var(--warn)" : "var(--ok)")}
            ${fichaCell("Revisión", bloqueada.length ? tag("Diferencia en la línea " + (oc.lineas.indexOf(bloqueada[0]) + 1), "wa", "alert") : tag("Cuadra con la factura", "ok", "check"))}
            ${fichaCell("", `<button class="btn pri" id="aplicar" ${oc.estado === "Aplicada" ? "disabled" : ""}>${icon("check")}Aplicar compra</button>`)}
          </div>`
      }) : recepcion(oc)}
        <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:11px;background:var(--surface-2);border:1px dashed var(--hair)">
          <span style="color:var(--accent);display:flex">${icon("phone")}</span>
          <div style="flex:1"><div class="b" style="font-size:13.5px">Recepción con lector desde el celular</div>
            <div class="mut" style="font-size:12.5px">La bodega escanea contra la orden en vez de digitar en el sistema.</div></div>
          <button class="btn sm" id="btnVerAppComp">Ver la app móvil</button>
        </div></div>`;
    },
    wire(v) {
      onSeg(document, "ocp", val => { ocPane = val; A.refresh(); });
      const s = $("#ocsel", v);
      if (s) s.addEventListener("change", e => { S.ocSel = +e.target.value; A.refresh(); });
      const ap = $("#aplicar", v);
      if (ap) ap.addEventListener("click", () => {
        const oc = D.compras[S.ocSel];
        const bad = oc.lineas.filter(l => Math.abs(l.var) > 15);
        if (bad.length) return toast("Hay una línea bloqueada", `La variación de costo de ${artOf(bad[0].artId).desc} excede el tope de ±15 %. Corríjala o pida autorización.`, "cr");
        oc.lineas.forEach(l => D.mover(l.artId, oc.locId, l.cant, "Compra", oc.cons, new Date()));
        const sub = oc.lineas.reduce((s2, l) => s2 + l.cant * l.costo, 0);
        D.asentar(new Date(), oc.cons, "Compra a " + provNom(oc.provId), [
          { cta: "1-01-04-001", debe: sub, haber: 0 },
          { cta: "1-01-05-001", debe: Math.round(sub * 0.13), haber: 0 },
          { cta: "2-01-01-001", debe: 0, haber: Math.round(sub * 1.13) }
        ]);
        D.provById[oc.provId].saldo += Math.round(sub * 1.13);
        oc.estado = "Aplicada";
        toast("Compra aplicada", `Entró la mercadería en ${locNom(oc.locId)}, subió el inventario y se generó el asiento y la cuenta por pagar.`, "ok");
        A.refresh();
      });
      $$("[data-recact]", v).forEach(b => b.addEventListener("click", () => toast("Registrado", b.dataset.recact, "ok")));
      const cerrar = $("#cerrarRec", v);
      if (cerrar) cerrar.addEventListener("click", () => toast("Recepción cerrada", "Las diferencias quedaron documentadas con foto, placa y sello. Se notificó al proveedor.", "ok"));
      const rn = $("#recNuevo", v);
      if (rn) rn.addEventListener("click", () => {
        const oc = D.compras[S.ocSel] || D.compras[0];
        if (A.inv) A.inv.nuevo({ val: { provId: oc.provId, marca: "", fam: "FGE", unidad: "Unid" } });
      });
      const app = $("#btnVerAppComp", v);
      if (app) app.addEventListener("click", () => A.actions.appmovil());
    }
  });

  function recepcion(oc) {
    const total = oc.lineas.length;
    const ver = Math.round(total * 0.82), falt = Math.max(1, Math.round(total * 0.1)), sob = Math.max(1, total - ver - falt);
    const difs = oc.lineas.slice(0, 5).map((l, i) => ({
      l, art: artOf(l.artId),
      estado: i < 2 ? "Faltante" : i < 4 ? "Sobrante" : "Producto distinto",
      recibido: i < 2 ? Math.round(l.cant * 0.9) : i < 4 ? Math.round(l.cant * 1.03) : l.cant
    }));
    return card({
      title: "Recepción en bodega", hint: "sustituye la hoja de papel con resaltador",
      actions: `<button class="btn sm" id="recNuevo">${icon("plus")}Llegó un artículo que no existe</button>`,
      body: `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
          <div class="scan" style="flex:1;min-width:260px">${icon("scan")}<input type="text" placeholder="Dispare el lector sobre el producto o el QR de la orden"></div>
          <div style="flex:1;min-width:210px">
            <div class="prog"><i style="width:${((ver / total) * 100).toFixed(0)}%;background:var(--ok)"></i><i style="width:${((falt / total) * 100).toFixed(0)}%;background:var(--crit)"></i><i style="width:${((sob / total) * 100).toFixed(0)}%;background:var(--warn)"></i></div>
            <div class="mut" style="font-size:12.5px;margin-top:6px">${ver} de ${total} líneas verificadas</div>
          </div></div>
        <div class="tiles" style="margin:0 -17px">
          <div class="tile"><div class="tv" style="color:var(--ok)">${ver}</div><div class="td" style="display:flex;align-items:center;gap:6px">${icon("check", 'style="width:14px;height:14px"')}Verificadas</div></div>
          <div class="tile"><div class="tv" style="color:var(--crit)">${falt}</div><div class="td" style="display:flex;align-items:center;gap:6px">${icon("alert", 'style="width:14px;height:14px"')}Faltantes</div></div>
          <div class="tile"><div class="tv" style="color:var(--warn)">${sob}</div><div class="td" style="display:flex;align-items:center;gap:6px">${icon("plus", 'style="width:14px;height:14px"')}Sobrantes</div></div>
          <div class="tile"><div class="tv">00:41</div><div class="td">Tiempo de descarga</div></div>
        </div>
        ${table({
        cols: [
          { t: "Código", cls: "mono", fmt: r => esc(r.art.cod) },
          { t: "Descripción", fmt: r => esc(r.art.desc) },
          { t: "Pedido", r: true, cls: "mono", fmt: r => grp(r.l.cant) },
          { t: "Recibido", r: true, cls: "mono", fmt: r => grp(r.recibido) },
          { t: "Estado", fmt: r => tag(r.estado, r.estado === "Faltante" ? "cr" : "wa", "alert") },
          {
            t: "Acción", fmt: r => r.estado === "Faltante"
              ? `<button class="btn sm" data-recact="Quedó pendiente de entrega y se notificó al proveedor.">Dejar pendiente</button>`
              : r.estado === "Sobrante"
                ? `<button class="btn sm" data-recact="El sobrante quedó registrado con trazabilidad sin crear el artículo en el catálogo.">Registrar con trazabilidad</button>`
                : `<button class="btn sm" data-recact="Se rechazó la línea y se generó la nota de crédito al proveedor.">Rechazar la línea</button>`
          }
        ], rows: difs, rowCls: r => (r.estado === "Faltante" ? "cr" : "wa")
      })}
        <div class="ficha" style="border-top:1px solid var(--hair)">
          ${fichaCell("Placa del vehículo", "CL 284 719")}
          ${fichaCell("Transportista", '<span style="font-family:var(--ui);font-size:14px">J. Quesada</span>')}
          ${fichaCell("Sello de recibido", tag("Capturado", "ok", "check"))}
          ${fichaCell("Fotografías", tag("2 imágenes", "ok", "check"))}
          ${fichaCell("", `<button class="btn pri" id="cerrarRec">${icon("check")}Cerrar recepción</button>`)}
        </div>`
    });
  }

  /* ══ PROVEEDORES ═════════════════════════════════════════════ */
  let provSel = "P1";
  A.screen("proveedores", {
    title: "Proveedores",
    sub: () => D.proveedores.length + " proveedores activos",
    render(v, arg) {
      if (arg) provSel = arg;
      const p = D.provById[provSel] || D.proveedores[0];
      const docs = D.cxp.filter(x => x.provId === p.id);
      const ocs = D.compras.filter(o => o.provId === p.id);
      const rec = D.recibidos.filter(r => r.provId === p.id);
      v.innerHTML = `<div class="split ancho">
        ${card({
        body: `<div class="mut" style="font-size:12px;margin-bottom:6px">Ordenados por saldo pendiente</div>
          <div class="mitems">${D.proveedores.slice().sort((a, b) => b.saldo - a.saldo).map(x => `
            <button class="mitem" data-p="${x.id}" aria-selected="${x.id === p.id}">
              <span style="flex:1;min-width:0"><span class="itd">${esc(x.nom)}</span><span class="itc">${esc(x.ced)} · ${esc(x.linea)}</span></span>
              ${tag(c(Math.round(x.saldo)), x.saldo > 8000000 ? "wa" : "mu")}</button>`).join("")}</div>`
      })}
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
          ${card({
        body: `<h3 style="font-size:19px">${esc(p.nom)}</h3>
          <div class="mut num" style="font-size:12px;margin-top:2px">${esc(p.ced)} · línea: ${esc(p.linea)}</div>
          <div class="ficha" style="margin:15px -17px -16px;border-top:1px solid var(--hair-2)">
            ${fichaCell("Plazo pactado", p.plazo + " días")}
            ${fichaCell("Saldo pendiente", c(Math.round(p.saldo)))}
            ${fichaCell("Cuenta IBAN", `<span style="font-size:12px">${esc(p.cuenta)}</span>`)}
            ${fichaCell("Órdenes abiertas", ocs.filter(o => o.estado !== "Aplicada").length)}
            ${fichaCell("Comprobantes sin aceptar", rec.filter(r => r.estado === "Sin aceptar").length, rec.filter(r => r.estado === "Sin aceptar").length ? "var(--warn)" : null)}
          </div>`
      })}
          <div class="grid g2">
            ${card({
        title: "Estado de cuenta",
        body: table({
          h: "320px",
          cols: [
            { t: "Documento", cls: "mono", fmt: r => esc(r.doc) },
            { t: "Emitida", cls: "mono", fmt: r => fecha(r.fecha) },
            { t: "Vence", cls: "mono", fmt: r => fecha(r.vence) },
            { t: "Monto", r: true, cls: "mono", fmt: r => grp(r.monto) },
            { t: "Saldo", r: true, cls: "mono", fmt: r => `<b>${grp(r.saldo)}</b>` }
          ], rows: docs, rowCls: r => (r.dias > 0 ? "wa" : "")
        })
      })}
            ${card({
        title: "Órdenes de compra",
        body: table({
          h: "320px",
          cols: [
            { t: "Orden", cls: "mono", fmt: r => esc(r.cons) },
            { t: "Destino", fmt: r => esc(locNom(r.locId)) },
            { t: "Fecha", cls: "mono", fmt: r => fecha(r.fecha) },
            { t: "Total", r: true, cls: "mono", fmt: r => grp(r.total) },
            { t: "Estado", fmt: r => tag(r.estado, r.estado === "Aplicada" ? "ok" : "acc") }
          ], rows: ocs
        })
      })}
          </div>
        </div></div>`;
    },
    wire(v) { $$("[data-p]", v).forEach(b => b.addEventListener("click", () => { provSel = b.dataset.p; A.refresh(); })); }
  });

  /* ══ CUENTAS POR PAGAR ═══════════════════════════════════════ */
  A.screen("cxp", {
    title: "Cuentas por pagar",
    sub: () => "Vencimientos y archivo de pago al banco",
    render(v) {
      const rows = D.cxp.slice().sort((a, b) => b.dias - a.dias);
      const vencidas = rows.filter(r => r.dias > 0);
      const semana = rows.filter(r => r.dias > -7 && r.dias <= 0);
      const total = rows.reduce((s, r) => s + r.saldo, 0);
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Saldo total con proveedores", c(total), { txt: rows.length + " documentos abiertos", dir: "" })}
          ${stat("Vencidas", c(vencidas.reduce((s, r) => s + r.saldo, 0)), { txt: vencidas.length + " documentos fuera de plazo", dir: "down" }, "var(--crit)")}
          ${stat("Vencen esta semana", c(semana.reduce((s, r) => s + r.saldo, 0)), { txt: semana.length + " documentos por programar", dir: "" }, "var(--warn)")}
          ${stat("Pago semanal típico", "₡150 000 000", { txt: "por archivo plano al Banco Nacional", dir: "" })}
        </div>
        ${card({
        title: "Análisis de pagos por vencimiento", hint: "seleccione lo que va en el pago de la semana",
        actions: `<button class="btn pri" id="genArch">${icon("bank")}Generar archivo de pago</button>`,
        body: table({
          h: "calc(100dvh - 420px)",
          cols: [
            { t: "Proveedor", fmt: r => `${esc(provNom(r.provId))}<span class="sub">${esc(D.provById[r.provId].ced)}</span>` },
            { t: "Documento", cls: "mono", fmt: r => esc(r.doc) },
            { t: "Cuenta IBAN", cls: "mono", fmt: r => `<span class="mut">${esc(D.provById[r.provId].cuenta)}</span>` },
            { t: "Emitida", cls: "mono", fmt: r => fecha(r.fecha) },
            { t: "Vence", cls: "mono", fmt: r => fecha(r.vence) },
            { t: "Días", r: true, cls: "mono", fmt: r => r.dias > 0 ? `<b style="color:${r.dias > 30 ? "var(--crit)" : "var(--warn)"}">${r.dias} vencida</b>` : `<span class="mut">${-r.dias} por vencer</span>` },
            { t: "Monto", r: true, cls: "mono", fmt: r => grp(r.monto) },
            { t: "Saldo", r: true, cls: "mono", fmt: r => `<b>${grp(r.saldo)}</b>` }
          ], rows, rowCls: r => (r.dias > 30 ? "cr" : r.dias > 0 ? "wa" : "")
        })
      })}</div>`;
    },
    wire(v) {
      $("#genArch", v).addEventListener("click", () => {
        const sel = D.cxp.filter(r => r.dias > -7).slice(0, 85);
        const tot = sel.reduce((s, r) => s + r.saldo, 0);
        openSheet({
          wide: true, title: "Archivo de pago al Banco Nacional",
          sub: `${sel.length} transferencias · ${c(tot)} · formato plano BN`,
          body: `<div style="display:flex;gap:10px;padding:12px 14px;border-radius:10px;background:var(--ok-soft);border:1px solid var(--ok-line);margin-bottom:14px">${icon("check")}
            <div style="font-size:12.5px;color:var(--ink-2);line-height:1.55">La cuenta IBAN sale de la ficha del proveedor, no se escribe a mano. El archivo se genera desde el sistema y no depende de una herramienta hecha aparte.</div></div>
            <div class="num" style="font-size:11px;background:var(--surface-2);border:1px solid var(--hair);border-radius:10px;padding:12px;max-height:320px;overflow:auto;line-height:1.8">
${sel.slice(0, 14).map((r, i) => {
            const p = D.provById[r.provId];
            return esc(`${String(i + 1).padStart(4, "0")}|${p.cuenta}|${p.ced.replace(/-/g, "").padEnd(12)}|${String(r.saldo).padStart(12, "0")}|CRC|${p.nom.slice(0, 28).padEnd(28)}|${r.doc}`);
          }).join("<br>")}
<br><span class="mut">… ${sel.length - 14} líneas más</span></div>
            <div class="card" style="margin-top:14px"><div class="card-b flush"><div class="ficha">
              ${fichaCell("Transferencias", sel.length)}
              ${fichaCell("Monto total", c(tot))}
              ${fichaCell("Autorización", tag("Mancomunada · 2 firmas", "wa", "shield"))}
              ${fichaCell("Cuenta de origen", '<span style="font-size:12px">CR15015201001023456</span>')}
            </div></div></div>`,
          footer: `<button class="btn" id="cancArch">Cancelar</button><div class="gap"></div><button class="btn">${icon("download")}Descargar .txt</button><button class="btn pri" id="okArch">${icon("shield")}Enviar a autorización</button>`,
          after(el) {
            $("#cancArch", el).addEventListener("click", closeSheet);
            $("#okArch", el).addEventListener("click", () => {
              closeSheet();
              toast("Enviado a autorización mancomunada", "Adrián Vindas y Sonia Calderón deben firmar. Quedó registrado en la bitácora.", "ok");
              D.bitacora.unshift({
                id: "BTP" + Date.now(), fecha: new Date(), usuario: "Óscar Jiménez", rol: "Proveeduría", locId: "L1",
                accion: "Generó archivo de pago al banco", detalle: `${sel.length} transferencias · ${c(tot)}`,
                sev: "Alta", antes: "", despues: "", ip: "10.2.14.31"
              });
            });
          }
        });
      });
    }
  });

})(window);
