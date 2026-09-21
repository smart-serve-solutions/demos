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

  /* ══ CONFIGURACIÓN ═══════════════════════════════════════════ */
  let cfgTab = "Locales y terminales";
  A.screen("config", {
    title: "Configuración",
    sub: () => "Lo que se cambia sin tocar una línea de código",
    extra: () => seg("cfgt", ["Locales y terminales", "Familias y márgenes", "Documentos y estados", "Despliegue", "Apariencia"], cfgTab),
    render(v) {
      if (cfgTab === "Locales y terminales") {
        v.innerHTML = card({
          title: "Locales, bodegas y terminales", hint: "sin límite de usuarios ni de puntos de venta",
          actions: `<button class="btn pri">${icon("plus")}Agregar local</button>`,
          body: table({
            cols: [
              { t: "Local", fmt: r => `<b>${esc(r.nom)}</b><span class="sub ui">${esc(r.dir)}</span>` },
              { t: "Código fiscal", cls: "mono", fmt: r => esc(r.cod) },
              { t: "Tipo", fmt: r => tag(r.tipo === "cedi" ? "Centro de distribución" : r.tipo === "bodega" ? "Bodega" : "Tienda", r.tipo === "tienda" ? "ac" : "mu") },
              { t: "Terminales", r: true, cls: "mono", fmt: r => r.terminales || '<span class="dim">—</span>' },
              { t: "Nodo local", fmt: r => (r.tipo === "tienda" ? tag("Activo", "ok", "check") : tag("No aplica", "mu")) },
              { t: "Facturación", fmt: r => (r.tipo === "tienda" ? tag("Habilitada", "ok") : tag("Solo inventario", "mu")) }
            ], rows: D.locales
          })
        });
      } else if (cfgTab === "Familias y márgenes") {
        v.innerHTML = card({
          title: "Familias, subcategorías y margen mínimo", hint: "cambiar un margen es configuración, no desarrollo",
          body: table({
            cols: [
              { t: "Familia", fmt: r => `<b>${esc(r.nom)}</b>` },
              { t: "Subcategorías", fmt: r => esc((D.subcats[r.id] || []).join(" · ")) },
              { t: "Artículos", r: true, cls: "mono", fmt: r => D.articulos.filter(a => a.fam === r.id).length },
              { t: "Margen mínimo", r: true, cls: "mono", fmt: r => (r.min ? `<b>${r.min},0 %</b>` : '<span class="dim">no aplica</span>') },
              { t: "Descuento máximo", r: true, cls: "mono", fmt: r => (r.min ? (r.min > 28 ? 15 : 8) + " %" : '<span class="dim">—</span>') },
              { t: "Autoriza excepción", fmt: r => (r.min ? tag(r.min <= 18 ? "Gerencia" : "Jefatura de piso", "ac") : tag("Servicios", "mu")) }
            ], rows: D.familias
          }) + `<div style="padding:14px 17px;border-top:1px solid var(--hair-2);font-size:12.5px;color:var(--ink-2);line-height:1.6;display:flex;gap:10px">${icon("info")}
            <span>El margen mínimo por familia es el control que evita que una lámina de zinc salga a −35 %. Cambiarlo queda registrado en la bitácora con el valor anterior.</span></div>`
        });
      } else if (cfgTab === "Documentos y estados") {
        const flujos = [
          ["Orden de compra", "Registrada → Aplicada → Anulada", "Irreversible", "Sí"],
          ["Compra", "Registrada → Aplicada → Anulada", "Irreversible", "Sí"],
          ["Factura de venta", "En curso → Aplicada → Anulada", "Irreversible", "Sí"],
          ["Proforma", "Vigente → Convertida → Vencida", "Reversible", "Sí"],
          ["Pedido", "Registrado → Alistado → Despachado → Entregado", "Irreversible", "Sí"],
          ["Traslado", "Registrado → En tránsito → Recibido", "Irreversible", "Sí"],
          ["Recepción", "Abierta → Con diferencias → Cerrada", "Irreversible", "No"],
          ["Ajuste de inventario", "Registrado → Autorizado → Aplicado", "Irreversible", "No"]
        ];
        v.innerHTML = card({
          title: "Flujo de estados por documento", hint: "los nombres de los estados los pone cada cliente",
          body: table({
            cols: [
              { t: "Documento", fmt: r => `<b>${esc(r[0])}</b>` },
              { t: "Flujo", cls: "mono", fmt: r => esc(r[1]) },
              { t: "Transición", fmt: r => tag(r[2], r[2] === "Irreversible" ? "ac" : "mu") },
              { t: "Nombres editables", fmt: r => (r[3] === "Sí" ? tag("Sí", "ok", "check") : tag("No", "mu")) }
            ], rows: flujos
          }) + `<div style="padding:14px 17px;border-top:1px solid var(--hair-2);font-size:12.5px;color:var(--ink-2);line-height:1.6;display:flex;gap:10px">${icon("info")}
            <span>Renombrar un estado no cambia cómo se leen los documentos ya emitidos: el histórico conserva el nombre con el que se emitió.</span></div>`
        });
      } else if (cfgTab === "Despliegue") {
        v.innerHTML = `<div class="wrap">
          <div class="grid g2" style="align-items:start">
            ${card({
          title: "Este despliegue",
          body: `<dl class="kv">
              <dt>Cliente</dt><dd>Ferretería Santa Rosa</dd>
              <dt>Identificador</dt><dd class="num">santa_rosa</dd>
              <dt>Base de datos</dt><dd>Dedicada, no compartida</dd>
              <dt>Contenedores</dt><dd class="num">4 en nube · 7 nodos locales</dd>
              <dt>Versión del núcleo</dt><dd class="num">ServeCore 1.8.2</dd>
              <dt>Paquete del cliente</dt><dd class="num">santa_rosa 0.4.0</dd>
              <dt>Respaldo</dt><dd>Cada hora · retención 35 días</dd>
              <dt>Copia para el cliente</dt><dd>${tag("Mensual y a solicitud", "ok", "check")}</dd></dl>`
        })}
            ${card({
          title: "Qué es del núcleo y qué es de este cliente",
          body: `<div style="font-size:13px;color:var(--ink-2);line-height:1.6">El 80 % de lo que usted ve es <strong>núcleo ServeCore</strong>: sirve igual a esta ferretería que a cualquier otro comercio. Lo específico de Santa Rosa vive aparte, en su propio paquete, y no se toca el núcleo para cambiarlo.</div>
            <div style="display:flex;flex-direction:column;gap:7px;margin-top:12px">
              ${[["Núcleo", "Caja, inventario, compras, contabilidad, nómina, factura electrónica", "acc"],
          ["Configuración", "Locales, familias, márgenes, estados, permisos, tarifario", "ok"],
          ["Paquete Santa Rosa", "Contado ruta, local contable de margen mínimo, prefabricados", "warn"],
          ["Plataforma compartida", "Motor de factura electrónica y agente de WhatsApp", "mu"]]
          .map(x => `<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 11px;border-radius:9px;border:1px solid var(--hair);background:var(--surface-2)">
              <span style="flex:none">${tag(x[0], x[2])}</span><span style="font-size:12.5px;color:var(--ink-2);line-height:1.5">${esc(x[1])}</span></div>`).join("")}
            </div>`
        })}
          </div>
          ${card({
          title: "Aislamiento",
          body: `<div class="tiles" style="margin:-12px -17px -16px">
            ${[["Base de datos propia", "Ningún otro cliente comparte tabla, esquema ni servidor con Ferretería Santa Rosa."],
          ["Despliegue propio", "Sus contenedores son suyos. Una actualización se prueba y se publica en su ambiente, con su aceptación."],
          ["Rendimiento no compartido", "Lo que haga otro comercio no puede poner lenta su caja. La carga de uno no toca al otro."],
          ["Sus datos salen cuando usted quiera", "Copia completa de la base y del archivo de XML, sin negociarlo. Está en el contrato."]]
          .map(t => `<div class="tile"><div class="tn">${esc(t[0])}</div><div class="td">${esc(t[1])}</div></div>`).join("")}
          </div>`
        })}</div>`;
      } else {
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
      }
    },
    wire(v) {
      onSeg(document, "cfgt", val => { cfgTab = val; A.refresh(); });
      const sw = $("#swDark", v);
      if (sw) sw.addEventListener("click", () => A.tema.alterna());
      const sn = $("#swNet", v);
      if (sn) sn.addEventListener("click", () => {
        const b = $("#btnNet");
        if (b) b.click();
      });
      onSeg(v, "dens", val => toast("Densidad " + val.toLowerCase(), "Queda guardada para este usuario en este equipo.", "in"));
    }
  });
})(window);
