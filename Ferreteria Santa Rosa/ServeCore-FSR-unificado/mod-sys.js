/* ═══════════════════════════════════════════════════════════════
   Sistema — usuarios y permisos, historial de cambios y
   configuración del despliegue.
   Lo que se cambia aquí es configuración, no desarrollo.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, S = w.S, U = w.UI;
  const { $, $$, esc, grp, c, dec, fecha, fh, icon, tag, card, stat, table, seg, onSeg, toast, locNom } = U;

  /* ══ USUARIOS Y PERMISOS ═════════════════════════════════════ */
  let usrTab = "Usuarios";
  A.screen("usuarios", {
    title: "Usuarios y permisos",
    sub: () => D.usuarios.length + " usuarios · " + D.roles.length + " roles",
    extra: () => seg("usrt", ["Usuarios", "Matriz de permisos"], usrTab),
    render(v) {
      if (usrTab === "Usuarios") {
        v.innerHTML = `<div class="wrap">
          <div class="grid g4">
            ${stat("Usuarios activos", D.usuarios.filter(u => u.activo).length, { txt: "con al menos un rol asignado", dir: "" })}
            ${stat("Con doble factor", D.usuarios.filter(u => u.doble).length, { txt: "obligatorio para gerencia, TI y contabilidad", dir: "up" }, "var(--ok)")}
            ${stat("Sesiones abiertas", "6", { txt: "cada una atada a su dispositivo", dir: "" })}
            ${stat("Inactivados", D.usuarios.filter(u => !u.activo).length, { txt: "nunca se eliminan, se inactivan", dir: "" }, "var(--warn)")}
          </div>
          ${card({
          title: "Usuarios", actions: `<button class="btn pri">${icon("plus")}Nuevo usuario</button>`,
          body: table({
            cols: [
              { t: "Usuario", fmt: r => `<b>${esc(r.nom)}</b><span class="sub">${esc(r.usuario)}</span>` },
              { t: "Rol", fmt: r => tag((D.roles.find(x => x.id === r.rolId) || {}).nom, "ac") },
              { t: "Local", fmt: r => esc(locNom(r.locId)) },
              { t: "Doble factor", fmt: r => (r.doble ? tag("Activo", "ok", "shield") : tag("No", "mu")) },
              { t: "Último ingreso", cls: "mono", fmt: r => fecha(r.ultimo) },
              { t: "Estado", fmt: r => (r.activo ? tag("Activo", "ok", "check") : tag("Inactivado", "mu")) },
              { t: "", r: true, fmt: () => `<button class="btn sm">Editar</button>` }
            ], rows: D.usuarios, rowCls: r => (r.activo ? "" : "wa")
          })
        })}
          ${card({
          title: "Reglas de sesión que el sistema aplica siempre",
          body: `<div class="tiles" style="margin:-12px -17px -16px">
            ${[["La sesión no viaja en el enlace", "Nunca en la URL. Copiar una dirección y mandarla por WhatsApp no le da acceso a nadie."],
          ["Cierre real", "Al cerrar sesión el token muere en el servidor. No se puede reutilizar desde otro equipo."],
          ["Documentos sin credenciales", "Ningún PDF o proforma que salga al cliente lleva un enlace que autentique."],
          ["Expiración por inactividad", "Configurable por rol. En caja es más larga; en gerencia y contabilidad, más corta."],
          ["Datos de prueba anonimizados", "El ambiente de pruebas se refresca despersonalizado. Nunca con correos ni cédulas reales."],
          ["Inactivar, no eliminar", "Ningún maestro se borra: se inactiva, para que el histórico siga leyéndose igual."]]
          .map(t => `<div class="tile"><div class="tn">${esc(t[0])}</div><div class="td">${esc(t[1])}</div></div>`).join("")}
          </div>`
        })}</div>`;
      } else {
        v.innerHTML = card({
          title: "Matriz de permisos por rol", hint: "la segregación de funciones queda en la configuración, no en la costumbre",
          body: table({
            cls: "mtx",
            cols: [{ t: "Rol", fmt: r => `<b>${esc(r.nom)}</b><span class="sub ui">${esc(r.desc)}</span>` }]
              .concat(D.PERMISOS.map((p, i) => ({
                t: p, c: true, cls: "c",
                fmt: r => (D.matriz[r.id][i] ? `<span style="color:var(--ok)">${icon("check", 'style="width:15px;height:15px"')}</span>` : '<span class="dim">·</span>')
              }))),
            rows: D.roles
          }) + `<div style="padding:14px 17px;border-top:1px solid var(--hair-2);font-size:12.5px;color:var(--ink-2);line-height:1.6;display:flex;gap:10px">${icon("shield")}
            <span>El cajero cobra pero no registra ni modifica. El vendedor registra pero no cobra. Nadie que factura puede autorizar su propia excepción de margen. Eso no depende de que la gente lo recuerde: el sistema no lo permite.</span></div>`
        });
      }
    },
    wire() { onSeg(document, "usrt", val => { usrTab = val; A.refresh(); }); }
  });

  /* ══ HISTORIAL DE CAMBIOS ════════════════════════════════════ */
  let btF = "Todas";
  A.screen("historial", {
    title: "Historial de cambios",
    sub: () => "Quién, cuándo, desde dónde y qué valor cambió",
    extra: () => seg("btf", ["Todas", "Alta", "Media", "Baja"], btF),
    render(v) {
      const rows = D.bitacora.filter(b => btF === "Todas" || b.sev === btF);
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Eventos registrados", grp(D.bitacora.length), { txt: "en la ventana visible de la demo", dir: "" })}
          ${stat("De severidad alta", D.bitacora.filter(b => b.sev === "Alta").length, { txt: "autorizaciones, anulaciones y exportaciones", dir: "" }, "var(--crit)")}
          ${stat("Con valor anterior y nuevo", D.bitacora.filter(b => b.antes).length, { txt: "no basta con saber que algo cambió", dir: "" })}
          ${stat("Retención", "5 años", { txt: "igual que el archivo fiscal", dir: "" })}
        </div>
        ${card({
        title: "Registro de actividad", hint: "el campo de usuario nunca queda vacío",
        actions: `<button class="btn">${icon("print")}Exportar para auditoría</button>`,
        body: table({
          h: "calc(100dvh - 420px)",
          cols: [
            { t: "Fecha y hora", cls: "mono", fmt: r => fh(r.fecha) },
            { t: "Usuario", fmt: r => `<b>${esc(r.usuario)}</b><span class="sub ui">${esc(r.rol)}</span>` },
            { t: "Local", fmt: r => esc(locNom(r.locId)) },
            { t: "Acción", fmt: r => esc(r.accion) },
            { t: "Detalle", fmt: r => `<span class="mut">${esc(r.detalle)}</span>` },
            { t: "Antes", cls: "mono", fmt: r => (r.antes ? esc(r.antes) : '<span class="dim">—</span>') },
            { t: "Después", cls: "mono", fmt: r => (r.despues ? `<b>${esc(r.despues)}</b>` : '<span class="dim">—</span>') },
            { t: "Origen", cls: "mono", fmt: r => `<span class="mut">${esc(r.ip)}</span>` },
            { t: "Sev.", fmt: r => tag(r.sev, r.sev === "Alta" ? "cr" : r.sev === "Media" ? "wa" : "mu") }
          ], rows, rowCls: r => (r.sev === "Alta" ? "cr" : "")
        })
      })}</div>`;
    },
    wire() { onSeg(document, "btf", val => { btF = val; A.refresh(); }); }
  });

  /* ══════════════════════════════════════════════════════════════
     SISTEMA / CONFIGURACIÓN — una pantalla por opción del menú.
     Es una demostración: se ve cómo quedaría cada catálogo y cada
     regla, y funcionan las acciones que cuentan la historia
     (renombrar un estado sin tocar lo emitido, aceptar una versión,
     ubicar un artículo, refrescar el ambiente de pruebas).
     ══════════════════════════════════════════════════════════════ */
  const { openSheet, closeSheet, bars, prog, empty, fichaCell, norm } = U;
  const I = w.INVX, V = w.VENX, N = w.NOM;
  const nota = (html, ic) => `<div style="display:flex;gap:10px;padding:11px 13px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);font-size:12.5px;color:var(--ink-2);line-height:1.55">${icon(ic || "info", 'style="flex:none;color:var(--accent)"')}<div>${html}</div></div>`;
  const cerrar = el => $$("[data-cerrar]", el).forEach(b => b.addEventListener("click", closeSheet));
  const dia = n => { const d = new Date(D.HOY); d.setDate(d.getDate() - n); return d; };
  const anotar = (accion, detalle, sev, antes, despues) => D.bitacora.unshift({ id: "BTS" + Date.now(), fecha: new Date(), usuario: "Andrey Ramírez", rol: "TI", locId: S.locId, accion, detalle, sev: sev || "Media", antes: antes || "", despues: despues || "", ip: "10.2.14.8" });
  const tiendas = D.locales.filter(l => l.tipo === "tienda");

  /* ── 1 · EMPRESA, LOCALES Y ÁREAS (SIS-001, SIS-002, SIS-003) ── */
  const NUEVOS_LOC = [];
  const AREAS = [
    { nom: "Tienda virtual", ic: "chat", tipo: "Canal de venta", loc: "L2", inv: "Despacha del inventario de Turrialba", gente: 6, venta: 18420300, docs: 214,
      d: "WhatsApp y página web. Hoy es «esclava» del local 2 y su venta no se puede medir aparte: aquí es un área con su propia venta, aunque despache desde Turrialba." },
    { nom: "Sala de acabados", ic: "layers", tipo: "Exhibición y venta", loc: "L2", inv: "Inventario propio de exhibición", gente: 3, venta: 9310800, docs: 96,
      d: "Pisos, enchapes y grifería de exhibición. Vende con la caja de Turrialba pero su resultado se ve por separado." },
    { nom: "Taller", ic: "wrench", tipo: "Servicio", loc: "L1", inv: "Bodega de repuestos del taller", gente: 4, venta: 2150400, docs: 138,
      d: "Taller automotriz y de reparación de herramientas; factura mano de obra y repuestos." },
    { nom: "Planta de prefabricados", ic: "factory", tipo: "Producción", loc: "CD", inv: "Traslada a los locales, no les vende", gente: 5, venta: 0, docs: 0,
      d: "Produce bloques y baldosas y los traslada como movimiento interno, no como compra." }
  ];
  function locales(v) {
    const L = D.locales.concat(NUEVOS_LOC);
    v.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Puntos de venta", grp(L.filter(l => l.tipo === "tienda").length), { txt: "cada uno con su nodo local" })}
        ${stat("Centro de distribución y bodegas", grp(L.filter(l => l.tipo !== "tienda").length), { txt: "CEDI Isabel · 55 000 m²" })}
        ${stat("Cajas", grp(L.reduce((k, l) => k + (l.terminales || 0), 0)), { txt: "cada una con su consecutivo" })}
        ${stat("Usuarios y locales", "Sin límite", { txt: "la licencia no se cobra por usuario" }, "var(--ok)")}
      </div>
      ${card({
      title: "Locales y bodegas", hint: "se agregan sin tocar el sistema",
      actions: `<button class="btn sm pri" id="locNuevo">${icon("plus")}Local o bodega</button>`,
      body: table({
        cols: [
          { t: "Local", fmt: r => `<b>${esc(r.nom)}</b>${r.nuevo ? " " + tag("nuevo", "ok") : ""}<span class="sub ui">${esc(r.dir)}</span>` },
          { t: "Sucursal fiscal", cls: "mono", fmt: r => esc(r.cod) },
          { t: "Tipo", fmt: r => tag(r.tipo === "cedi" ? "Centro de distribución" : r.tipo === "bodega" ? "Bodega" : "Tienda", r.tipo === "tienda" ? "ac" : "mu") },
          { t: "Cajas", r: true, cls: "mono", fmt: r => r.terminales || '<span class="dim">—</span>' },
          { t: "Nodo local", fmt: r => (r.tipo === "tienda" ? tag("En línea", "ok", "check") : tag("No aplica", "mu")) },
          { t: "Factura", fmt: r => (r.tipo === "tienda" ? tag("Sí", "ok") : tag("Solo inventario", "mu")) },
          { t: "Bodega propia", fmt: r => (r.sinBodega ? tag("No: vende contra pedido", "wa") : r.tipo === "tienda" ? tag("Sí", "mu") : '<span class="dim">—</span>') }
        ], rows: L
      })
    })}</div>`;
  }
  function localesWire(v) {
    $("#locNuevo", v).addEventListener("click", () => openSheet({
      title: "Nuevo local o bodega", sub: "Queda disponible de una vez para inventario, cajas y reportes",
      body: `<div class="field"><label for="lnNom">Nombre</label><input id="lnNom" placeholder="Por ejemplo: Siquirres"></div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
          <div class="field"><label for="lnTipo">Tipo</label><select id="lnTipo"><option value="tienda">Tienda</option><option value="bodega">Bodega</option></select></div>
          <div class="field"><label for="lnCajas">Cajas</label><input id="lnCajas" class="num" value="2"></div></div>
        <div class="field"><label for="lnDir">Dirección</label><input id="lnDir"></div>
        ${nota("La sucursal fiscal se asigna sola (la siguiente libre) y cada caja recibe su consecutivo ante Hacienda.", "file")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="lnOk">Guardar</button>`,
      after(el) {
        cerrar(el);
        $("#lnOk", el).addEventListener("click", () => {
          const nom = $("#lnNom", el).value.trim(); if (!nom) return toast("Falta el nombre", "", "cr");
          const tipo = $("#lnTipo", el).value;
          NUEVOS_LOC.push({ id: "N" + NUEVOS_LOC.length, cod: String(13 + NUEVOS_LOC.length).padStart(3, "0"), nom, tipo, terminales: tipo === "tienda" ? Math.max(1, parseInt($("#lnCajas", el).value, 10) || 1) : 0, dir: $("#lnDir", el).value || "—", nuevo: true });
          anotar("Creó local", nom + " · " + tipo);
          closeSheet(); toast(nom + " quedó creado", "Sucursal fiscal asignada. Ya aparece en inventario, cajas y reportes.", "ok"); A.refresh();
        });
      }
    }));
  }
  function areas(v) {
    v.innerHTML = `<div class="wrap">
      ${nota("Un área vive dentro de un local pero tiene su propio resultado: se sabe cuánto vende la tienda virtual o la sala de acabados sin mezclarlo con la caja del local.", "layers")}
      <div class="grid g2" style="align-items:start">${AREAS.map(a => card({
      body: `<div style="display:flex;gap:12px;align-items:flex-start">
          <span class="mit" style="width:40px;height:40px">${icon(a.ic)}</span>
          <div style="flex:1;min-width:0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h3 style="font-size:16px">${esc(a.nom)}</h3>${tag(a.tipo, "mu")}${tag("en " + locNom(a.loc), "mu", "pin")}</div>
            <div class="mut" style="font-size:12.5px;margin-top:5px;line-height:1.5">${esc(a.d)}</div></div></div>
        <div class="ficha" style="margin:14px -17px -16px;border-top:1px solid var(--hair-2)">
          ${fichaCell("Venta del mes", a.venta ? c(a.venta) : "—")}${fichaCell("Documentos", a.docs ? grp(a.docs) : "—")}${fichaCell("Personas", grp(a.gente))}${fichaCell("Inventario", `<span style="font-family:var(--ui);font-size:12.5px;font-weight:500">${esc(a.inv)}</span>`)}</div>`
    })).join("")}</div></div>`;
  }
  function empresa(v) {
    v.innerHTML = `<div class="grid g2" style="align-items:start">
      ${card({
      title: "Razón social", hint: "sale en todos los comprobantes",
      body: `<dl class="kv">
          <dt>Nombre</dt><dd>Ferretería Santa Rosa S.A.</dd>
          <dt>Cédula jurídica</dt><dd class="num">3-101-XXXXXX</dd>
          <dt>Actividad económica</dt><dd><span class="num">4752</span> · Venta al por menor de artículos de ferretería</dd>
          <dt>Régimen</dt><dd>Tradicional · factura electrónica 4.4</dd>
          <dt>Domicilio fiscal</dt><dd>Santa Rosa de Turrialba, Cartago</dd>
          <dt>Moneda</dt><dd>Colones · tipo de cambio del BCCR para dólares</dd></dl>`
    })}
      ${card({
      title: "Más de una razón social", chip: " " + tag("Fase 3", "mu"),
      body: `<div style="font-size:13px;color:var(--ink-2);line-height:1.6">Hoy opera una sola sociedad. El sistema queda preparado para varias: cada documento, cuenta y existencia lleva la razón social a la que pertenece, y un usuario puede tener permiso en una o en varias.</div>
        <div style="margin-top:12px">${nota("En el pasado se valoró operar con tres sociedades y se descartó por la carga administrativa. Si se retoma, se agrega aquí sin migrar datos.", "info")}</div>`
    })}</div>`;
  }
  A.workspace("sis-locales", {
    title: "Empresa, locales y áreas",
    tabs: [
      { id: "locales", t: "Locales y bodegas", sub: "Siete tiendas, el CEDI y dos bodegas; se agregan más sin tocar el sistema", render: locales, wire: localesWire },
      { id: "areas", t: "Áreas", sub: "Taller, sala de acabados, tienda virtual y planta, cada una con su resultado", render: areas },
      { id: "empresa", t: "Razón social", sub: "La sociedad que emite y la preparación para más de una", render: empresa }
    ]
  });

  /* ── 2 · TERRITORIOS DE CLIENTES (SIS-004) ── */
  A.screen("sis-territorios", {
    title: "Territorios de clientes",
    sub: () => "Dónde vive el cliente, no dónde compra: un cliente de Turrialba también compra en Santa Rosa",
    render(v) {
      const terr = c2 => (V && V.FICHA[c2] ? V.FICHA[c2].territorio : "Fuera de cantón");
      const T = {};
      D.documentos.filter(d => d.clienteId && d.tipo !== "NC").forEach(d => {
        const t = terr(d.clienteId);
        const x = T[t] || (T[t] = { t, venta: 0, cli: {}, por: {} });
        x.venta += d.total; x.cli[d.clienteId] = true; x.por[d.locId] = (x.por[d.locId] || 0) + d.total;
      });
      const rows = Object.values(T).sort((a, b) => b.venta - a.venta);
      v.innerHTML = `<div class="wrap">
        ${card({
        title: "En qué local compra cada territorio", hint: "porcentaje de la venta del territorio",
        body: `<div class="tscroll"><table class="dt"><thead><tr><th>Territorio</th><th class="r">Clientes</th><th class="r">Venta</th>${tiendas.map(l => `<th class="r">${esc(l.nom)}</th>`).join("")}</tr></thead>
          <tbody>${rows.map(x => `<tr><td><b>${esc(x.t)}</b></td><td class="r mono">${Object.keys(x.cli).length}</td><td class="r mono">${grp(x.venta)}</td>
            ${tiendas.map(l => { const p = x.venta ? ((x.por[l.id] || 0) / x.venta) * 100 : 0; return `<td class="r mono" style="background:rgba(35,64,132,${(p / 100 * 0.55).toFixed(2)});${p > 45 ? "color:#fff;font-weight:650" : ""}">${p >= 1 ? dec(p, 0) + " %" : '<span class="dim">—</span>'}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`
      })}
        ${nota("El territorio sale de la dirección del cliente y se asigna solo al crearlo; se puede corregir en su ficha. Con esto el análisis comercial responde «¿cuánto nos compra Pejibaye?» aunque Pejibaye compre en tres locales.", "pin")}</div>`;
    }
  });

  /* ── 3 · CATEGORÍAS, MARCAS Y DEPARTAMENTOS (SIS-006, SIS-007) ── */
  const NOMBRES = {};   /* renombres con su historial (SIS-011) */
  const HIST = [
    { fecha: dia(12), cat: "Estado de compra", antes: "Contabilizada", despues: "Aplicada", por: "Óscar Jiménez", ej: "OC-2026-004380 del 28 ago se sigue leyendo «Contabilizada»" },
    { fecha: dia(30), cat: "Categoría", antes: "Tubería", despues: "Tubería PVC", por: "Álvaro Cordero", ej: "Las facturas de julio siguen diciendo «Tubería»" }
  ];
  const nombre = (k, def) => NOMBRES[k] || def;
  function renombrar(k, actual, catalogo) {
    openSheet({
      title: "Renombrar", sub: catalogo + " · «" + actual + "»",
      body: `<div class="field"><label for="rnN">Nombre nuevo</label><input id="rnN" value="${esc(actual)}"></div>
        ${nota("Los documentos ya emitidos conservan el nombre con el que se emitieron; el nuevo rige desde ahora. Queda el historial con quién lo cambió.", "history")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="rnOk">Renombrar</button>`,
      after(el) {
        cerrar(el);
        const i2 = $("#rnN", el); setTimeout(() => { i2.focus(); i2.select(); }, 40);
        $("#rnOk", el).addEventListener("click", () => {
          const n = i2.value.trim(); if (!n || n === actual) return closeSheet();
          NOMBRES[k] = n;
          HIST.unshift({ fecha: new Date(), cat: catalogo, antes: actual, despues: n, por: "Andrey Ramírez", ej: "Lo emitido antes de hoy sigue diciendo «" + actual + "»" });
          anotar("Renombró " + catalogo.toLowerCase(), actual + " → " + n, "Media", actual, n);
          closeSheet(); toast("Renombrado", "«" + actual + "» ahora es «" + n + "». Lo ya emitido no cambia.", "ok"); A.refresh();
        });
      }
    });
  }
  function categorias(v) {
    const fams = D.familias;
    const nArt = (f, sub) => D.articulos.filter(a => a.fam === f && (!sub || a.sub === sub)).length;
    v.innerHTML = `<div class="wrap">
      ${nota("Dos niveles, padre e hija: <b>Fontanería → Tubería PVC, Accesorios PVC, Grifería</b>. En producción son cerca de 300 categorías; aquí se ven las del catálogo de la demostración. El margen mínimo y el descuento por categoría se configuran en Ventas › Precios, descuentos y márgenes.", "layers")}
      ${card({
      title: "Categorías", hint: fams.length + " padres · " + fams.reduce((k, f) => k + (D.subcats[f.id] || []).length, 0) + " hijas",
      actions: `<button class="btn sm" data-ir="ven-precios|margenes">${icon("wallet")}Márgenes</button>`,
      body: `<div class="tscroll"><table class="dt"><thead><tr><th>Categoría</th><th class="r">Artículos</th><th class="r">Margen mínimo</th><th></th></tr></thead><tbody>
        ${fams.map(f => `<tr style="background:var(--surface-2)"><td><b>${esc(nombre("f:" + f.id, f.nom))}</b>${f.servicio ? " " + tag("servicios", "mu") : ""}</td><td class="r mono">${nArt(f.id)}</td><td class="r mono">${f.min ? f.min + " %" : '<span class="dim">—</span>'}</td>
            <td class="r"><button class="btn sm" data-ren="f:${f.id}|${esc(nombre("f:" + f.id, f.nom))}">Renombrar</button></td></tr>
          ${(D.subcats[f.id] || []).map(sc => `<tr><td style="padding-left:34px"><span class="dim" style="margin-right:6px">└</span>${esc(nombre("s:" + f.id + ":" + sc, sc))}</td><td class="r mono">${nArt(f.id, sc)}</td><td></td>
            <td class="r"><button class="btn sm" data-ren="s:${f.id}:${esc(sc)}|${esc(nombre("s:" + f.id + ":" + sc, sc))}">Renombrar</button></td></tr>`).join("")}`).join("")}
        </tbody></table></div>`
    })}</div>`;
  }
  function categoriasWire(v) {
    A.wireIr(v);
    $$("[data-ren]", v).forEach(b => b.addEventListener("click", () => { const [k, n] = b.dataset.ren.split("|"); renombrar(k, n, "Categoría"); }));
  }
  function marcas(v) {
    const M = {};
    D.articulos.filter(a => a.marca && a.marca !== "—").forEach(a => { const m = M[a.marca] || (M[a.marca] = { m: a.marca, n: 0, fam: {} }); m.n++; m.fam[a.fam] = true; });
    const rows = Object.values(M).sort((a, b) => b.n - a.n);
    v.innerHTML = card({
      title: "Marcas", hint: rows.length + " en el catálogo de la demostración",
      body: table({ cols: [
        { t: "Marca", fmt: r => `<b>${esc(r.m)}</b>` },
        { t: "Artículos", r: true, cls: "mono", fmt: r => r.n },
        { t: "Categorías", fmt: r => Object.keys(r.fam).map(f => tag(D.famById[f].nom, "mu")).join(" ") }
      ], rows })
    });
  }
  function departamentos(v) {
    const emp = N ? N.activos ? N.activos() : N.empleados : [];
    const G = {};
    (Array.isArray(emp) ? emp : []).forEach(e => { const g = G[e.area] || (G[e.area] = { a: e.area, n: 0, locs: {} }); g.n++; g.locs[e.locId] = true; });
    const rows = Object.values(G).sort((a, b) => b.n - a.n);
    v.innerHTML = `<div class="wrap">
      ${nota("Contabilidad, proveeduría, ventas, gerencia, crédito, bodega… Cada colaborador pertenece a uno y la planilla reparte su costo por departamento en el asiento.", "users")}
      ${card({ title: "Departamentos", hint: "vinculados a nómina", actions: `<button class="btn sm" data-ir="nom-personal">${icon("users")}Personal</button>`,
      body: table({ cols: [
        { t: "Departamento", fmt: r => `<b>${esc(nombre("d:" + r.a, r.a))}</b>` },
        { t: "Personas", r: true, cls: "mono", fmt: r => r.n },
        { t: "Locales", fmt: r => Object.keys(r.locs).map(l => tag(locNom(l), "mu")).join(" ") },
        { t: "", r: true, fmt: r => `<button class="btn sm" data-ren="d:${esc(r.a)}|${esc(nombre("d:" + r.a, r.a))}">Renombrar</button>` }
      ], rows }) })}</div>`;
  }
  function departamentosWire(v) {
    A.wireIr(v);
    $$("[data-ren]", v).forEach(b => b.addEventListener("click", () => { const [k, n] = b.dataset.ren.split("|"); renombrar(k, n, "Departamento"); }));
  }
  A.workspace("sis-categorias", {
    title: "Categorías, marcas y departamentos",
    tabs: [
      { id: "categorias", t: "Categorías", sub: "Padre e hija, dos niveles", render: categorias, wire: categoriasWire },
      { id: "marcas", t: "Marcas", sub: "Las marcas del catálogo", render: marcas },
      { id: "departamentos", t: "Departamentos", sub: "La estructura de la empresa, ligada a la planilla", render: departamentos, wire: departamentosWire }
    ]
  });

  /* ── 4 · UBICACIÓN FÍSICA DE ARTÍCULOS (SIS-009) ── */
  const TRAS = { L1: 18, L2: 24, L3: 7, L4: 5, L5: 3, L6: 0, L7: 4 };
  function estructura(v) {
    const rows = tiendas.map(l => {
      const arts = D.articulos.filter(a => a.tipo === "Producto" && D.existencias[a.id] && D.existencias[a.id][l.id]);
      const con = arts.filter(a => I && I.ubic(a.id, l.id));
      const pas = {}; con.forEach(a => { const m = /^([A-Z])\d/.exec(I.ubic(a.id, l.id) || ""); if (m) pas[m[1]] = true; });
      return { l, total: arts.length, con: con.length, pas: Object.keys(pas).sort(), tras: TRAS[l.id] || 0 };
    });
    v.innerHTML = `<div class="wrap">
      <div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);align-items:start">
        ${card({
        title: "Ubicación por local", hint: "la caja muestra dónde está cada artículo",
        body: table({ cols: [
          { t: "Local", fmt: r => `<b>${esc(r.l.nom)}</b>` },
          { t: "Pasillos", fmt: r => (r.pas.length ? r.pas.join(" · ") : '<span class="dim">—</span>') },
          { t: "Con ubicación", fmt: r => `<div style="min-width:140px">${prog([{ w: r.total ? (r.con / r.total) * 100 : 0, col: r.con === r.total ? "var(--ok)" : "var(--accent)" }])}<div class="num" style="font-size:11.5px;color:var(--ink-3)">${r.con} de ${r.total}</div></div>` },
          { t: "En trastienda", r: true, cls: "mono", fmt: r => (r.tras ? r.tras : '<span class="dim">—</span>') }
        ], rows })
      })}
        ${card({
        title: "Cómo se escribe una ubicación",
        body: `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${[["C", "Pasillo"], ["1", "Anaquel"], ["A", "Cara"], ["04", "Estante"]].map(x => `<div style="text-align:center;border:1px solid var(--hair);border-radius:10px;padding:8px 12px;min-width:74px"><div class="num" style="font-size:20px;font-weight:700">${x[0]}</div><div class="mut" style="font-size:11.5px">${x[1]}</div></div>`).join("")}</div>
          <div class="mut" style="font-size:12.5px;line-height:1.55">Se lee «Pasillo C · anaquel 1 · cara A · estante 4». Cada artículo puede tener una segunda ubicación en la trastienda para lo que no cabe en el piso. Sale en la caja, en el conteo y en la etiqueta del estante.</div>`
      })}
      </div></div>`;
  }
  let ubLoc = "L2";
  function sinUbic(v) {
    const L = I ? I.sinUbicacion(ubLoc) : [];
    v.innerHTML = `<div class="wrap">
      <div style="display:flex;justify-content:flex-end">${seg("ubl", tiendas.map(l => ({ v: l.id, t: l.nom })), ubLoc)}</div>
      ${card({
      title: "Artículos sin ubicación en " + locNom(ubLoc), hint: L.length ? L.length + " por ubicar" : "",
      body: L.length ? table({ cols: [
        { t: "Artículo", fmt: x => `<b>${esc(x.a.desc)}</b><span class="sub ui">${esc(x.a.cod)} · ${esc(D.famById[x.a.fam].nom)}</span>` },
        { t: "Existencia", r: true, cls: "mono", fmt: x => grp(D.stock(x.a.id, x.locId) ? D.stock(x.a.id, x.locId).cant : 0) },
        { t: "", r: true, fmt: (x, i) => `<button class="btn sm pri" data-ub="${i}">${icon("pin")}Ubicar</button>` }
      ], rows: L }) : empty("check", "Todo ubicado", "Cada artículo de " + locNom(ubLoc) + " tiene su lugar.")
    })}</div>`;
    v._L = L;
  }
  function sinUbicWire(v) {
    const p = $("#tp-sis-ubicaciones", v);
    onSeg(document, "ubl", x => { ubLoc = x; A.refresh(); });
    $$("[data-ub]", p).forEach(b => b.addEventListener("click", () => {
      const x = p._L[+b.dataset.ub];
      openSheet({
        title: "Ubicar artículo", sub: x.a.desc + " · " + locNom(x.locId),
        body: `<div class="grid" style="grid-template-columns:repeat(4,1fr);gap:10px">
            <div class="field"><label for="ubP">Pasillo</label><input id="ubP" maxlength="1" value="C" style="text-transform:uppercase"></div>
            <div class="field"><label for="ubA">Anaquel</label><input id="ubA" class="num" value="2"></div>
            <div class="field"><label for="ubC">Cara</label><select id="ubC"><option>A</option><option>B</option></select></div>
            <div class="field"><label for="ubE">Estante</label><input id="ubE" class="num" value="3"></div></div>
          ${nota("La etiqueta del estante entra sola a la cola de impresión.", "print")}`,
        footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="ubOk">Guardar</button>`,
        after(el) {
          cerrar(el);
          $("#ubOk", el).addEventListener("click", () => {
            const P = ($("#ubP", el).value || "C").toUpperCase().replace(/[^A-Z]/g, "") || "C";
            const code = P + (parseInt($("#ubA", el).value, 10) || 1) + "-" + String(parseInt($("#ubE", el).value, 10) || 1).padStart(2, "0");
            const cara = $("#ubC", el).value;
            I.ubicar(x.a.id, x.locId, code);
            closeSheet(); toast("Ubicado · " + I.ubicTexto(code) + " · cara " + cara, "La etiqueta quedó en la cola de impresión.", "ok"); A.refresh();
          });
        }
      });
    }));
  }
  A.workspace("sis-ubicaciones", {
    title: "Ubicación física de artículos",
    tabs: [
      { id: "estructura", t: "Por local", sub: "Pasillo, anaquel, cara y estante, con segunda ubicación en trastienda", render: estructura },
      {
        id: "sin", t: "Sin ubicación", sub: "Lo que el vendedor todavía busca a ciegas",
        badge: () => { const n = I ? I.sinUbicacion().length : 0; return { n, k: "wa", l: n + " por ubicar" }; },
        render: sinUbic, wire: sinUbicWire
      }
    ]
  });

  /* ── 5 · TÉRMINOS DE PAGO (SIS-005) ── */
  const TERM = [
    { t: "Contado", d: 0, a: "Ambos", pp: "", nota: "Se paga al facturar" },
    { t: "Conta ruta", d: 1, a: "Clientes", pp: "", nota: "Contado para el cliente, crédito de un día para el sistema; se liquida desde la caja" },
    { t: "Crédito 15 días", d: 15, a: "Ambos", pp: "" },
    { t: "Crédito 30 días", d: 30, a: "Ambos", pp: "2 % si paga en 10 días" },
    { t: "Crédito 44 días", d: 44, a: "Proveedores", pp: "", nota: "Plazo negociado con un proveedor" },
    { t: "Crédito 45 días", d: 45, a: "Ambos", pp: "3 % si paga en 15 días" },
    { t: "Crédito 60 días", d: 60, a: "Ambos", pp: "" },
    { t: "Crédito 90 días", d: 90, a: "Proveedores", pp: "" }
  ];
  A.screen("sis-terminos", {
    title: "Términos de pago",
    sub: () => "Los plazos que se negocian con clientes y proveedores, con su pronto pago",
    extra: () => `<button class="btn pri" id="tpNuevo">${icon("plus")}Término</button>`,
    render(v) {
      const nCli = d => D.clientes.filter(x => (x.plazo || 0) === d).length, nProv = d => D.proveedores.filter(x => x.plazo === d).length;
      v.innerHTML = `<div class="wrap">
        ${card({
        body: table({ cols: [
          { t: "Término", fmt: r => `<b>${esc(r.t)}</b>${r.nota ? `<span class="sub ui">${esc(r.nota)}</span>` : ""}` },
          { t: "Días", r: true, cls: "mono", fmt: r => r.d },
          { t: "Aplica a", fmt: r => tag(r.a, r.a === "Ambos" ? "ac" : "mu") },
          { t: "Pronto pago", fmt: r => (r.pp ? tag(r.pp, "ok") : '<span class="dim">—</span>') },
          { t: "Clientes", r: true, cls: "mono", fmt: r => (r.a !== "Proveedores" && nCli(r.d) ? nCli(r.d) : '<span class="dim">—</span>') },
          { t: "Proveedores", r: true, cls: "mono", fmt: r => (r.a !== "Clientes" && nProv(r.d) ? nProv(r.d) : '<span class="dim">—</span>') }
        ], rows: TERM })
      })}
        ${nota("Cada negociación con un proveedor puede tener su plazo. El término alimenta el vencimiento de las cuentas por cobrar y por pagar, y el pronto pago aparece en el lote de pagos cuando todavía conviene tomarlo.", "calc")}</div>`;
    },
    wire() {
      const b = $("#tpNuevo");
      if (b) b.addEventListener("click", () => openSheet({
        title: "Nuevo término de pago",
        body: `<div class="grid" style="grid-template-columns:1fr 1fr;gap:10px"><div class="field"><label for="tpD">Días</label><input id="tpD" class="num" value="21"></div>
            <div class="field"><label for="tpA">Aplica a</label><select id="tpA"><option>Ambos</option><option>Clientes</option><option>Proveedores</option></select></div></div>
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px"><div class="field"><label for="tpP">Pronto pago %</label><input id="tpP" class="num" placeholder="opcional"></div>
            <div class="field"><label for="tpPd">Si paga en (días)</label><input id="tpPd" class="num" placeholder="opcional"></div></div>`,
        footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="tpOk">Guardar</button>`,
        after(el) {
          cerrar(el);
          $("#tpOk", el).addEventListener("click", () => {
            const d = parseInt($("#tpD", el).value, 10); if (!(d >= 0)) return toast("Revise los días", "", "cr");
            const pp = parseFloat($("#tpP", el).value), pd = parseInt($("#tpPd", el).value, 10);
            TERM.push({ t: d ? "Crédito " + d + " días" : "Contado", d, a: $("#tpA", el).value, pp: pp && pd ? pp + " % si paga en " + pd + " días" : "" });
            TERM.sort((a, b) => a.d - b.d);
            anotar("Creó término de pago", d + " días");
            closeSheet(); toast("Término creado", "Ya se puede asignar a clientes y proveedores.", "ok"); A.refresh();
          });
        }
      }));
    }
  });

  /* ── 6 · ESTADOS DE LOS DOCUMENTOS (SIS-008, SIS-011) ── */
  const FLUJOS = [
    { doc: "Orden de compra", est: ["Registrada", "Aplicada", "Anulada"] },
    { doc: "Compra", est: ["Registrada", "Aplicada", "Anulada"] },
    { doc: "Factura de venta", est: ["En curso", "Aplicada", "Anulada"] },
    { doc: "Proforma", est: ["Vigente", "Convertida", "Vencida"], rev: true },
    { doc: "Despacho", est: ["Pendiente de alistar", "Alistado", "En ruta", "Entregado"] },
    { doc: "Traslado", est: ["Registrado", "En tránsito", "Recibido"] },
    { doc: "Planilla", est: ["En cálculo", "Aprobada", "Pagada", "Contabilizada"] },
    { doc: "Cliente y proveedor", est: ["Registrado", "Activo", "Inactivo"], rev: true },
    { doc: "Caja", est: ["Abierta", "Cerrada"] }
  ];
  function flujos(v) {
    v.innerHTML = `<div class="wrap">
      ${nota("<b>Aplicado</b> significa que el documento tomó su consecutivo, quedó con fecha, hora y usuario, y ya no se puede modificar: se corrige con otro documento (anulación, nota de crédito, ajuste).", "lock")}
      ${card({
      title: "Flujo de estados por documento", hint: "clic en un estado para renombrarlo",
      body: FLUJOS.map((f, fi) => `<div class="pref-row" style="align-items:center"><span class="pt"><div class="pn">${esc(f.doc)}</div><div class="pd">${f.rev ? "Puede volver a un estado anterior" : "Cada paso es irreversible"}</div></span>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end">${f.est.map((e, k) => `${k ? `<span class="dim">${icon("chev", 'style="width:14px;height:14px"')}</span>` : ""}<button class="tag ${k === f.est.length - 1 ? "mu" : "acc"}" data-est="${fi}:${k}" style="cursor:pointer" title="Renombrar este estado">${esc(nombre("e:" + f.doc + ":" + e, e))}</button>`).join("")}</div></div>`).join("")
    })}</div>`;
  }
  function flujosWire(v) {
    $$("[data-est]", v).forEach(b => b.addEventListener("click", () => {
      const [fi, k] = b.dataset.est.split(":").map(Number), f = FLUJOS[fi], e = f.est[k];
      renombrar("e:" + f.doc + ":" + e, nombre("e:" + f.doc + ":" + e, e), "Estado de " + f.doc.toLowerCase());
    }));
  }
  function historialNombres(v) {
    v.innerHTML = `<div class="wrap">
      ${nota("Renombrar un estado, una categoría o un departamento no altera cómo se leen los documentos ya emitidos: cada documento guarda el nombre vigente cuando se emitió.", "history")}
      ${card({
      title: "Cambios de nombre", hint: HIST.length + "",
      body: table({ cols: [
        { t: "Fecha", cls: "mono", fmt: r => fecha(r.fecha) },
        { t: "Catálogo", fmt: r => esc(r.cat) },
        { t: "Cambio", fmt: r => `${esc(r.antes)} ${icon("chev", 'style="width:13px;height:13px;color:var(--ink-4)"')} <b>${esc(r.despues)}</b>` },
        { t: "Lo ya emitido", fmt: r => `<span class="mut" style="font-size:12.5px">${esc(r.ej)}</span>` },
        { t: "Por", fmt: r => esc(r.por) }
      ], rows: HIST })
    })}</div>`;
  }
  A.workspace("sis-estados", {
    title: "Estados de los documentos",
    tabs: [
      { id: "flujos", t: "Flujos", sub: "Registrado, aplicado, anulado: lo aplicado ya no se toca", render: flujos, wire: flujosWire },
      { id: "nombres", t: "Cambios de nombre", sub: "Lo renombrado no cambia lo ya emitido", badge: () => ({ n: HIST.length, k: "", l: "cambios" }), render: historialNombres }
    ]
  });

  /* ── 7 · VERSIONES Y AMBIENTE DE PRUEBAS (SIS-010) ── */
  const VER = {
    prox: "1.9.0", estado: "En pruebas", desde: dia(3), programada: null,
    notas: [
      ["Ventas", "Sugerencia de productos relacionados en la caja, con reglas y pares aprendidos"],
      ["Ventas", "Caja y turnos: apertura con fondo, retiros, arqueo y cierre con diferencias justificadas"],
      ["Ventas", "Descuento de la categoría del cliente aplicado solo en la caja, con tope por margen"],
      ["Inventario", "Conteo a ciegas por pasillo con causa probable de cada diferencia"],
      ["Contabilidad", "Cierre de mes con aprobación de una persona"],
      ["Corrección", "Un atajo de teclado de la caja podía ejecutarse dos veces"]
    ],
    checks: [
      { area: "Caja y ventas", quien: "Jonathan Ureña", ok: true },
      { area: "Inventario", quien: "Randall Mata", ok: true },
      { area: "Compras", quien: "Álvaro Cordero", ok: false },
      { area: "Contabilidad", quien: "Óscar Jiménez", ok: false }
    ]
  };
  const HISTV = [
    { v: "1.8.2", f: dia(8), acepto: "Andrey Ramírez", n: "Factura electrónica 4.4: nuevo campo de medio de pago" },
    { v: "1.8.1", f: dia(22), acepto: "Andrey Ramírez", n: "Correcciones en el reporte de antigüedad de saldos" },
    { v: "1.8.0", f: dia(41), acepto: "Adrián Vindas", n: "Nómina y RRHH; inventario por ubicación" }
  ];
  const PRUEBAS = { ultimo: dia(1), usuarios: [["Andrey Ramírez", "TI de Santa Rosa", "Completo"], ["Smart Serve · soporte", "Proveedor", "Completo"], ["Usuario de consulta", "Análisis", "Solo lectura"]] };
  function proxima(v) {
    const listos = VER.checks.filter(x => x.ok).length, todos = listos === VER.checks.length;
    v.innerHTML = `<div class="wrap">
      <div class="stepbar"><div class="sbt"><b>${icon("upload")} ServeCore ${VER.prox} · ${esc(VER.estado)}${VER.programada ? " · se publica " + esc(VER.programada) : ""}</b>
        <span>Nada llega a producción sin estas notas y sin la aceptación escrita de Santa Rosa. Mientras tanto se prueba en el ambiente de pruebas desde el ${fecha(VER.desde)}.</span></div></div>
      <div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start">
        ${card({ title: "Qué cambia", hint: "notas de la versión",
      body: VER.notas.map(n => `<div class="hl"><b style="min-width:92px;text-align:left;font-family:var(--ui)">${esc(n[0])}</b><span>${esc(n[1])}</span></div>`).join("") })}
        ${card({ title: "Aceptación", hint: listos + " de " + VER.checks.length + " áreas",
      body: VER.checks.map((x, i) => prefRowV(x.area, "Prueba y acepta: " + x.quien, `<button class="swtch" role="switch" aria-checked="${x.ok}" data-chk="${i}" ${VER.programada ? "disabled" : ""}><i></i></button>`)).join("")
        + `<button class="bigbtn" id="verOk" style="margin-top:14px;width:100%" ${todos && !VER.programada ? "" : "disabled"}>${icon("check")}${VER.programada ? "Aceptada" : "Aceptar y programar la publicación"}</button>
          ${!todos ? `<div class="mut" style="font-size:12px;margin-top:6px;text-align:center">Falta la aceptación de ${VER.checks.filter(x => !x.ok).map(x => x.area.toLowerCase()).join(" y ")}</div>` : ""}` })}
      </div></div>`;
  }
  const prefRowV = (t, d, ctrl) => `<div class="pref-row"><span class="pt"><div class="pn">${esc(t)}</div><div class="pd">${esc(d)}</div></span>${ctrl}</div>`;
  function proximaWire(v) {
    $$("[data-chk]", v).forEach(b => b.addEventListener("click", () => { if (b.disabled) return; const x = VER.checks[+b.dataset.chk]; x.ok = !x.ok; A.refresh(); }));
    const ok = $("#verOk", v);
    if (ok) ok.addEventListener("click", () => {
      VER.programada = "el domingo a las 22:00"; VER.estado = "Aceptada";
      anotar("Aceptó versión", "ServeCore " + VER.prox + " · se publica el domingo 22:00", "Alta");
      toast("Versión aceptada", "Se publica el domingo a las 22:00, fuera del horario de venta. Todos los usuarios verán las notas al entrar.", "ok"); A.refresh();
    });
  }
  function pruebas(v) {
    const M = [["Correo", "maria.solis@gmail.com", "cliente0482@ejemplo.test"], ["Teléfono", "8845-1120", "8000-0482"], ["Cédula", "1-0894-0231", "9-0000-0482"],
      ["Cuenta bancaria", "CR15015201001023456", "CR00000000000000482"], ["Salario", "₡545 000", "₡500 000"], ["Dirección", "Santa Rosa, 200 m sur de la iglesia", "Santa Rosa"]];
    v.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Último refresco", fecha(PRUEBAS.ultimo), { txt: "copia de producción, anonimizada" })}
        ${stat("Datos personales", "Enmascarados", { txt: "antes de copiar, no después" }, "var(--ok)")}
        ${stat("Versión en pruebas", VER.prox, { txt: "producción está en " + HISTV[0].v })}
        ${stat("Con acceso", grp(PRUEBAS.usuarios.length), { txt: "personas y usuarios" })}
      </div>
      <div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);align-items:start">
        ${card({ title: "Qué se enmascara al refrescar", hint: "un ejemplo",
      actions: `<button class="btn sm" id="refrescar">${icon("history")}Refrescar ahora</button>`,
      body: table({ cols: [{ t: "Campo", fmt: r => `<b>${esc(r[0])}</b>` }, { t: "En producción", cls: "mono", fmt: r => `<span style="text-decoration:line-through;color:var(--ink-4)">${esc(r[1])}</span>` }, { t: "En pruebas", cls: "mono", fmt: r => esc(r[2]) }], rows: M }) })}
        ${card({ title: "Quién entra al ambiente de pruebas", body: table({ cols: [{ t: "Usuario", fmt: r => `<b>${esc(r[0])}</b><span class="sub ui">${esc(r[1])}</span>` }, { t: "Acceso", fmt: r => tag(r[2], r[2] === "Solo lectura" ? "mu" : "ac") }], rows: PRUEBAS.usuarios }) })}
      </div></div>`;
  }
  function pruebasWire(v) {
    $("#refrescar", v).addEventListener("click", () => { PRUEBAS.ultimo = new Date(D.HOY); anotar("Refrescó el ambiente de pruebas", "Copia de producción anonimizada"); toast("Ambiente de pruebas refrescado", "Con los datos de hoy, ya anonimizados: ningún correo ni cédula real salió de producción.", "ok"); A.refresh(); });
  }
  function historialV(v) {
    v.innerHTML = `<div class="wrap">${card({ title: "Versiones publicadas", hint: "todas con aviso y aceptación",
      body: table({ cols: [{ t: "Versión", cls: "mono", fmt: r => `<b>${esc(r.v)}</b>` }, { t: "Publicada", cls: "mono", fmt: r => fecha(r.f) }, { t: "Qué trajo", fmt: r => esc(r.n) }, { t: "Aceptó", fmt: r => esc(r.acepto) }, { t: "", fmt: () => tag("Con aviso previo", "ok", "check") }], rows: HISTV }) })}
      ${nota("Ningún cambio se publica sin aviso: el encargado de TI se entera antes que el mostrador, con las notas y la fecha.", "bell")}</div>`;
  }
  function respaldos(v) {
    v.innerHTML = `<div class="wrap">
      ${card({ body: `<div class="tiles" style="margin:-12px -17px -16px">${[["Respaldo cada hora", "Se guardan 35 días. Se prueba restaurar uno al mes."], ["Copia para Santa Rosa", "Completa, en formato abierto, el primer día de cada mes. La última se entregó el " + fecha(dia(12)) + "."], ["Base de datos propia", "Ningún otro cliente comparte base, servidor ni rendimiento con Santa Rosa."], ["Sus datos salen cuando quiera", "Base completa y archivo de XML, sin negociarlo: está en el contrato."]].map(t => `<div class="tile"><div class="tn">${esc(t[0])}</div><div class="td">${esc(t[1])}</div></div>`).join("")}</div>` })}
      <div style="display:flex;justify-content:flex-end"><button class="btn pri" id="copia">${icon("download")}Solicitar copia completa ahora</button></div></div>`;
  }
  function respaldosWire(v) { $("#copia", v).addEventListener("click", () => { anotar("Solicitó copia completa de la base", "Formato abierto"); toast("Copia solicitada", "Queda lista en unas horas en el enlace seguro de TI, sin costo.", "ok"); }); }
  A.workspace("sis-versiones", {
    title: "Versiones y ambiente de pruebas",
    tabs: [
      { id: "proxima", t: "Próxima versión", sub: "Notas y aceptación escrita antes de publicar", badge: () => { const n = VER.programada ? 0 : VER.checks.filter(x => !x.ok).length; return { n, k: "wa", l: n + " áreas por aceptar" }; }, render: proxima, wire: proximaWire },
      { id: "pruebas", t: "Ambiente de pruebas", sub: "Separado de producción y con los datos personales enmascarados", render: pruebas, wire: pruebasWire },
      { id: "historial", t: "Historial", sub: "Lo que se ha publicado y quién lo aceptó", render: historialV },
      { id: "respaldos", t: "Respaldos y copia de la base", sub: "Respaldos y la copia que recibe Santa Rosa", render: respaldos, wire: respaldosWire }
    ]
  });

  /* ── 8 · ESTE EQUIPO (preferencias) ── */
  A.screen("config", {
    title: "Este equipo",
    sub: () => "Apariencia, terminal y simulación de caída del enlace",
    render(v) {
      const oscuro = A.tema.es();
      v.innerHTML = `<div class="wrap">
        <div class="grid g2" style="align-items:start">
          ${card({
        title: "Apariencia",
        body: `<div class="pref-row"><span class="pt"><div class="pn">Modo oscuro</div>
            <div class="pd">Cambia la paleta de toda la aplicación. El sistema siempre arranca en modo claro; si lo enciende aquí, queda recordado en este equipo.</div></span>
            <button class="swtch" id="swDark" role="switch" aria-checked="${oscuro}"><i></i></button></div>
          <div class="pref-row"><span class="pt"><div class="pn">Simular caída del enlace</div>
            <div class="pd">Muestra cómo opera el local cuando se cae la conexión: el nodo local sigue facturando y los documentos quedan en cola para Hacienda.</div></span>
            <button class="swtch" id="swNet" role="switch" aria-checked="${S.offline}"><i></i></button></div>
          <div class="pref-row"><span class="pt"><div class="pn">Densidad de la tabla</div>
            <div class="pd">Cómoda para mostrador, compacta para gerencia. Se guarda por usuario.</div></span>
            ${seg("dens", ["Cómoda", "Compacta"], "Cómoda")}</div>`
      })}
          ${card({
        title: "Terminal de este equipo",
        body: `<dl class="kv">
            <dt>Local activo</dt><dd>${esc(locNom(S.locId))}</dd>
            <dt>Terminal</dt><dd class="num">${S.term}</dd>
            <dt>Serie fiscal</dt><dd class="num">${esc((D.locales.find(l => l.id === S.locId) || {}).cod || "")}</dd>
            <dt>Próximo consecutivo</dt><dd class="num" style="font-size:12px">${A.nextConsec()}</dd>
            <dt>Impresora</dt><dd>Epson TM-T20 · térmica</dd>
            <dt>Lector</dt><dd>Honeywell Voyager 1250g</dd></dl>`
      })}
        </div></div>`;
    },
    wire(v) {
      const sw = $("#swDark", v);
      if (sw) sw.addEventListener("click", () => A.tema.alterna());
      const sn = $("#swNet", v);
      if (sn) sn.addEventListener("click", () => { const b = $("#btnNet"); if (b) b.click(); });
      onSeg(v, "dens", val => toast("Densidad " + val.toLowerCase(), "Queda guardada para este usuario en este equipo.", "in"));
    }
  });
})(window);
