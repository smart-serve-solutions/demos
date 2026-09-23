/* ═══════════════════════════════════════════════════════════════
   Sistema / Configuración (incluye lo que era Seguridad y Auditoría).
   Usuarios y acceso: usuarios, roles y permisos, políticas de sesión.
   Control y auditoría: autorización de excepciones y bitácora.
   Lo demás: empresa y locales, catálogos, parámetros, medios de pago,
   documentos, plantillas, alertas, conexiones, versiones y este equipo.
   Lo que se cambia aquí es configuración, no desarrollo.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB,
    A = w.APP,
    S = w.S,
    U = w.UI;
  const {
    $,
    $$,
    esc,
    grp,
    c,
    dec,
    fecha,
    fh,
    icon,
    tag,
    card,
    stat,
    table,
    seg,
    onSeg,
    toast,
    locNom,
  } = U;

  /* ══ PIEZAS COMUNES ═══════════════════════════════════════════ */
  const { openSheet, closeSheet, bars, prog, empty, fichaCell, norm } = U;
  const I = w.INVX,
    V = w.VENX,
    N = w.NOM;
  /* quien usa el sistema ahora (se cambia desde el encabezado en la demo) */
  const yo = () => D.sesion.corto;
  const nota = (html, ic) =>
    `<div style="display:flex;gap:10px;padding:11px 13px;border-radius:10px;background:var(--surface-2);border:1px solid var(--hair);font-size:12.5px;color:var(--ink-2);line-height:1.55">${icon(ic || "info", 'style="flex:none;color:var(--accent)"')}<div>${html}</div></div>`;
  const cerrar = (el) =>
    $$("[data-cerrar]", el).forEach((b) =>
      b.addEventListener("click", closeSheet),
    );
  const dia = (n) => {
    const d = new Date(D.HOY);
    d.setDate(d.getDate() - n);
    return d;
  };
  const hace = (n, h, m) => {
    const d = dia(n);
    if (h != null) d.setHours(h, m || 0, 0, 0);
    return d;
  };
  const minAntes = (m) => new Date(D.HOY.getTime() - m * 60000);
  /* la bitácora firma con la persona de la sesión, su rol y su equipo;
     si alguien más autorizó, queda con su nombre (nunca se deduce) */
  const anotar = (accion, detalle, sev, antes, despues, autorizo) =>
    D.bitacora.unshift({
      id: "BTS" + Date.now() + Math.random(),
      fecha: D.ahora(),
      usuario: D.sesion.nom,
      rol: D.sesion.cargo,
      locId: S.locId,
      accion,
      detalle,
      sev: sev || "Media",
      antes: antes || "",
      despues: despues || "",
      autorizo: autorizo || "",
      ip: D.sesion.ip,
    });
  /* permiso por rol: si no alcanza, avisa y devuelve false */
  const exige = (roles, que) => {
    if (D.puede(...roles)) return true;
    toast("Su rol no tiene este permiso", que + " lo hace " + roles.map((r) => r.toLowerCase()).join(" o ") + ". Usted entró como " + D.sesion.corto + " (" + D.sesion.cargo + "); puede cambiar de usuario en el encabezado.", "cr");
    return false;
  };
  const tiendas = D.locales.filter((l) => l.tipo === "tienda");

  /* estilos propios de estas pantallas (solo clases sx-*, no tocan el resto) */
  (function () {
    if (document.getElementById("sx-css")) return;
    const st = document.createElement("style");
    st.id = "sx-css";
    st.textContent = `
      .sx-form{display:flex;flex-direction:column;gap:14px}
      .sx-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .sx-hint{font-size:11.5px;color:var(--ink-4);line-height:1.45}
      .sx-chk{width:17px;height:17px;accent-color:var(--accent);cursor:pointer;vertical-align:middle;margin:0}
      .sx-chk:disabled{cursor:default}
      .sx-chips{display:flex;flex-wrap:wrap;gap:6px}
      .sx-chipb{padding:5px 11px;border-radius:999px;border:1px solid var(--hair);font-size:12.5px;font-weight:600;background:var(--surface);color:var(--ink-2);min-height:28px}
      .sx-chipb[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
      .sx-chipb:focus-visible,.sx-tog:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
      .sx-perm th.c,.sx-perm td.c{text-align:center;width:84px}
      .sx-perm tr.sx-mod td{background:var(--surface-2)}
      .sx-perm td.sx-scr{padding-left:40px}
      .sx-tog{display:inline-flex;align-items:center;gap:8px;font-weight:650;font-size:13.5px;color:var(--ink);background:none;border:0;padding:2px 0;text-align:left}
      .sx-tog .ic{width:15px;height:15px;transition:transform .15s}
      .sx-tog[aria-expanded="true"] .ic.sx-chev{transform:rotate(90deg)}
      .sx-edit{position:sticky;bottom:0;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 14px;margin-top:12px;border:1px solid var(--accent);background:var(--accent-soft);border-radius:12px;z-index:3;font-size:13px;font-weight:600;color:var(--ink)}
      .sx-val{font-family:var(--ui);font-weight:650;font-size:13px;color:var(--ink);text-align:right;max-width:340px;line-height:1.4}
      .sx-lock{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:650;color:var(--ok);white-space:nowrap}
      .sx-lock .ic{width:14px;height:14px}
      .sx-doc{background:#fff;color:#1d2433;border:1px solid var(--hair);border-radius:6px;box-shadow:var(--shadow-sm);padding:22px 24px;font-size:11.5px;line-height:1.5;font-family:var(--ui)}
      .sx-doc h4{font-size:15px;margin:0;color:#1d2433}
      .sx-doc .sx-dl{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #e6e8ee;padding:4px 0}
      .sx-doc .sx-dm{color:#6b7385}
      .sx-doc.sx-80{max-width:300px;margin:0 auto;font-family:var(--num);font-size:11px}
      .sx-msg{background:var(--surface-2);border:1px solid var(--hair);border-radius:12px 12px 12px 4px;padding:10px 12px;font-size:12.5px;line-height:1.5;color:var(--ink-2);max-width:460px}
      .sx-card-int{display:flex;flex-direction:column;gap:10px;height:100%}
      .sx-card-int .sx-top{display:flex;gap:12px;align-items:flex-start}
      .sx-card-int .sx-meta{font-size:12px;color:var(--ink-3);line-height:1.5}
      .sx-card-int .sx-act{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto}
      .sx-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .sx-bar .tb-search{flex:1;min-width:220px;max-width:380px}
      .sx-sel{padding:7px 10px;border-radius:9px;border:1px solid var(--hair);background:var(--surface);font-size:13px;color:var(--ink)}
      @media (max-width:700px){.sx-2{grid-template-columns:1fr}.sx-perm th.c,.sx-perm td.c{width:auto}}
    `;
    document.head.appendChild(st);
  })();

  /* controles pequeños */
  const chk = (on, attrs, dis) =>
    `<input type="checkbox" class="sx-chk" ${on ? "checked" : ""} ${dis ? "disabled" : ""} ${attrs || ""}>`;
  const swt = (on, attrs, dis) =>
    `<button type="button" class="swtch" role="switch" aria-checked="${!!on}" ${dis ? "disabled" : ""} ${attrs || ""}><i></i></button>`;
  const siempre = (t) =>
    `<span class="sx-lock" title="No se puede apagar">${icon("lock")}${esc(t || "Siempre")}</span>`;
  const chipsCtl = (name, opts, sel, label) =>
    `<div class="sx-chips" role="group" aria-label="${esc(label || name)}" data-chips="${name}">${opts
      .map((o) => {
        const v = o.v != null ? o.v : o;
        return `<button type="button" class="sx-chipb" data-v="${esc(v)}" aria-pressed="${sel.indexOf(v) >= 0}">${esc(o.t || o)}</button>`;
      })
      .join("")}</div>`;
  const leerChips = (root, name) =>
    $$(`[data-chips="${name}"] [aria-pressed="true"]`, root).map(
      (b) => b.dataset.v,
    );
  const prefRow = (t, d, ctrl, extra) =>
    `<div class="pref-row" ${extra || ""}><span class="pt"><div class="pn">${t}</div>${d ? `<div class="pd">${d}</div>` : ""}</span>${ctrl}</div>`;
  const reqTag = (r) =>
    ` <span class="tag mu" style="font-family:var(--num);font-size:11px">${esc(r)}</span>`;
  const faseTag = (f) => ` ${tag(f, "mu")}`;

  /* ficha genérica para agregar o editar un registro de catálogo.
     o: {title, sub, campos:[{id,l,v,tipo,opts,hint,req,dis,ancho}], nota, notaIc, ok,
         extra (html bajo los campos), peligro:{t, ic, fn, dis, why}, guardar(vals) → {t,s,k} | false, wide, after(el)} */
  function ficha(o) {
    const campo = (f) => {
      const id = "fx_" + f.id,
        tipo = f.tipo || "texto";
      let ctl;
      if (tipo === "select")
        ctl = `<select id="${id}" ${f.dis ? "disabled" : ""}>${f.opts
          .map((x) => {
            const v = x.v != null ? x.v : x;
            return `<option value="${esc(v)}" ${String(v) === String(f.v) ? "selected" : ""}>${esc(x.t || x)}</option>`;
          })
          .join("")}</select>`;
      else if (tipo === "switch")
        return prefRow(
          esc(f.l),
          f.hint ? esc(f.hint) : "",
          swt(f.v, `id="${id}" aria-label="${esc(f.l)}"`, f.dis),
          'style="padding:4px 0;border:0"',
        );
      else if (tipo === "area")
        ctl = `<textarea id="${id}" rows="${f.rows || 3}" placeholder="${esc(f.ph || "")}">${esc(f.v || "")}</textarea>`;
      else if (tipo === "chips") ctl = chipsCtl(f.id, f.opts, f.v || [], f.l);
      else
        ctl = `<input id="${id}" ${tipo === "num" ? 'class="num" inputmode="decimal"' : ""} value="${esc(f.v == null ? "" : f.v)}" placeholder="${esc(f.ph || "")}" ${f.dis ? "disabled" : ""} ${f.max ? `maxlength="${f.max}"` : ""}>`;
      return `<div class="field" ${f.ancho ? 'style="grid-column:1/-1"' : ""}>${tipo === "chips" ? `<label>${esc(f.l)}${f.req ? " *" : ""}</label>` : `<label for="${id}">${esc(f.l)}${f.req ? " *" : ""}</label>`}${ctl}${f.hint && tipo !== "switch" ? `<div class="sx-hint">${esc(f.hint)}</div>` : ""}</div>`;
    };
    /* dos campos cortos seguidos van lado a lado */
    const partes = [];
    let par = [];
    o.campos.forEach((f) => {
      const corto = f.corto;
      if (corto) {
        par.push(campo(f));
        if (par.length === 2) {
          partes.push(`<div class="sx-2">${par.join("")}</div>`);
          par = [];
        }
      } else {
        if (par.length) {
          partes.push(`<div class="sx-2">${par.join("")}</div>`);
          par = [];
        }
        partes.push(campo(f));
      }
    });
    if (par.length) partes.push(`<div class="sx-2">${par.join("")}</div>`);
    openSheet({
      title: o.title,
      sub: o.sub,
      wide: o.wide,
      body: `<div class="sx-form">${partes.join("")}${o.extra || ""}${o.nota ? nota(o.nota, o.notaIc) : ""}</div>`,
      footer: `${o.peligro ? `<button class="btn" id="fxDel" ${o.peligro.dis ? "disabled" : ""} title="${esc(o.peligro.why || "")}">${icon(o.peligro.ic || "lock")}${esc(o.peligro.t)}</button>` : ""}
        <div class="gap"></div><button class="btn" data-cerrar>Cancelar</button><button class="btn pri" id="fxOk">${esc(o.ok || "Guardar")}</button>`,
      after(el) {
        cerrar(el);
        $$("[data-chips] .sx-chipb", el).forEach((b) =>
          b.addEventListener("click", () =>
            b.setAttribute(
              "aria-pressed",
              b.getAttribute("aria-pressed") !== "true",
            ),
          ),
        );
        $$(".swtch", el).forEach((b) =>
          b.addEventListener("click", () => {
            if (!b.disabled)
              b.setAttribute(
                "aria-checked",
                b.getAttribute("aria-checked") !== "true",
              );
          }),
        );
        const primero = $(
          "input:not([disabled]),select:not([disabled]),textarea",
          el,
        );
        if (primero)
          setTimeout(() => {
            primero.focus();
            if (primero.select && primero.tagName === "INPUT") primero.select();
          }, 40);
        if (o.peligro && o.peligro.dis && o.peligro.why) {
          const d = $("#fxDel", el);
          d.insertAdjacentHTML(
            "afterend",
            `<span class="sx-hint" style="max-width:220px">${esc(o.peligro.why)}</span>`,
          );
        }
        $("#fxOk", el).addEventListener("click", () => {
          const vals = {};
          o.campos.forEach((f) => {
            const id = "fx_" + f.id,
              tipo = f.tipo || "texto";
            vals[f.id] =
              tipo === "switch"
                ? $("#" + id, el).getAttribute("aria-checked") === "true"
                : tipo === "chips"
                  ? leerChips(el, f.id)
                  : $("#" + id, el)
                    ? $("#" + id, el).value.trim()
                    : "";
          });
          const falta = o.campos.find(
            (f) =>
              f.req &&
              (Array.isArray(vals[f.id]) ? !vals[f.id].length : !vals[f.id]),
          );
          if (falta) {
            toast(
              "Falta: " + falta.l,
              "Complete el campo marcado con * para guardar.",
              "cr",
            );
            const n = $("#fx_" + falta.id, el);
            if (n && n.focus) n.focus();
            return;
          }
          const r = o.guardar ? o.guardar(vals) : { t: "Guardado" };
          if (r === false) return;
          closeSheet();
          if (r && r.t) toast(r.t, r.s || "", r.k || "ok");
          A.refresh();
        });
        if (o.peligro && !o.peligro.dis)
          $("#fxDel", el).addEventListener("click", () => {
            const r = o.peligro.fn();
            closeSheet();
            if (r && r.t) toast(r.t, r.s || "", r.k || "wa");
            A.refresh();
          });
        if (o.after) o.after(el);
      },
    });
  }
  /* cambiar un valor de configuración: valor nuevo + motivo; queda en la bitácora con antes y después */
  function cambiarValor(o) {
    ficha({
      title: o.title,
      sub:
        o.sub ||
        "Rige desde que se guarda; queda en la bitácora con el valor anterior",
      campos: [
        { id: "act", l: "Valor actual", v: o.v, dis: true },
        o.opts
          ? {
              id: "nv",
              l: "Valor nuevo",
              tipo: "select",
              opts: o.opts,
              v: o.v,
              req: true,
            }
          : { id: "nv", l: "Valor nuevo", v: o.v, req: true, hint: o.hint },
        {
          id: "mot",
          l: "Motivo del cambio",
          tipo: "area",
          rows: 2,
          req: true,
          ph: "Por ejemplo: acuerdo de gerencia del 12 de setiembre",
        },
      ],
      nota: o.nota,
      notaIc: o.notaIc || "history",
      ok: "Guardar cambio",
      guardar(v) {
        if (v.nv === String(o.v))
          return { t: "Sin cambios", s: "El valor es el mismo.", k: "in" };
        if (v.mot.length < 10) {
          toast(
            "Escriba un motivo que se entienda",
            "Un punto o una palabra no le sirve a quien lea la bitácora.",
            "cr",
          );
          return false;
        }
        o.set(v.nv);
        /* se anota lo que de verdad quedó; si el valor no se aceptó, no hay cambio que anotar */
        const quedo = o.get ? String(o.get()) : v.nv;
        if (quedo === String(o.v)) {
          toast("El valor no se aceptó", "«" + v.nv + "» no es válido para " + o.title.toLowerCase() + "; sigue en " + o.v + ".", "cr");
          return false;
        }
        v.nv = quedo;
        anotar(
          "Cambió " + o.title.toLowerCase(),
          v.mot,
          o.sev || "Media",
          String(o.v),
          quedo,
        );
        return {
          t: "Cambio guardado",
          s:
            "«" +
            o.title +
            "» ahora es " +
            v.nv +
            ". Quedó en la bitácora con el motivo.",
        };
      },
    });
  }

  /* ══════════════════════════════════════════════════════════════
     USUARIOS Y ACCESO · CONTROL Y AUDITORÍA — usuarios, roles y
     permisos, políticas de acceso, autorización de excepciones y bitácora.
     Antes eran el módulo Seguridad y Auditoría; hoy viven en Sistema.
     Es demostración: se ve cómo queda cada pantalla ya implementada y
     funcionan las acciones que cuentan la historia (crear un usuario sin
     que nadie conozca su contraseña, modificar permisos con guardar
     explícito, duplicar un rol, cerrar una sesión, aprobar una solicitud,
     reactivar un registro inactivado).
     ══════════════════════════════════════════════════════════════ */

  /* ── roles: los de base de ServeCore y los que creó Santa Rosa ── */
  const ROLES = [
    {
      id: "R1",
      nom: "Gerencia",
      desc: "Ve todo y autoriza excepciones; no factura, no compra, no paga",
      base: true,
      alc: "Todos los locales",
      tfa: true,
    },
    {
      id: "R2",
      nom: "Administrador de local",
      desc: "Opera su local y autoriza en su ámbito",
      base: true,
      alc: "Sus locales",
    },
    {
      id: "R3",
      nom: "Cajero",
      desc: "Cobra lo que registró el vendedor; no registra ni modifica",
      base: true,
      alc: "Sus locales",
    },
    {
      id: "R4",
      nom: "Vendedor de piso",
      desc: "Registra la venta y la proforma; no cobra",
      base: true,
      alc: "Sus locales",
    },
    {
      id: "R5",
      nom: "Proveeduría",
      desc: "Órdenes, compras, subasta y proveedores",
      base: true,
      alc: "Todos los locales",
    },
    {
      id: "R6",
      nom: "Bodega",
      desc: "Recepción, traslados, conteo y merma",
      base: true,
      alc: "Sus locales",
    },
    {
      id: "R7",
      nom: "Contabilidad",
      desc: "Asientos, bancos, impuestos y planilla",
      base: true,
      alc: "Todos los locales",
      tfa: true,
    },
    {
      id: "R8",
      nom: "TI",
      desc: "Administra el sistema, los usuarios y la bitácora; no opera",
      base: true,
      alc: "Todos los locales",
      tfa: true,
    },
    {
      id: "R9",
      nom: "Crédito y cobro",
      desc: "Límites, bloqueos y gestión de cobro; no factura",
      alc: "Todos los locales",
      de: "Contabilidad",
      por: "Andrey Ramírez",
      f: dia(160),
    },
    {
      id: "R10",
      nom: "Administrador de CEDI",
      desc: "Recepción, distribución y traslados del CEDI; no vende",
      alc: "CEDI Isabel",
      de: "Bodega",
      por: "Andrey Ramírez",
      f: dia(95),
    },
    {
      id: "R11",
      nom: "Auditoría",
      desc: "Solo lectura de todo; cada exportación queda registrada",
      alc: "Todos los locales",
      tfa: true,
      de: "Gerencia",
      por: "Andrey Ramírez",
      f: dia(60),
    },
    {
      id: "R12",
      nom: "Consulta externa",
      desc: "Solo lectura en el ambiente de pruebas; vence sola",
      alc: "Todos los locales",
      tfa: true,
      pruebas: true,
      por: "Andrey Ramírez",
      f: dia(9),
    },
    {
      id: "R13",
      nom: "Soporte técnico",
      desc: "Acceso total para emergencias; solo cuentas con nombre y con vencimiento",
      alc: "Todos los locales",
      tfa: true,
      total: true,
      por: "Andrey Ramírez",
      f: dia(300),
    },
  ];
  const rolById = (id) => ROLES.find((r) => r.id === id) || { nom: id };

  /* ── usuarios ── */
  const TODOS = "*";
  const us = (nom, login, roles, locs, o) =>
    Object.assign(
      {
        id: "US" + login,
        nom,
        login,
        roles,
        locs,
        correo: login + "@ferreteriasantarosa.cr",
        tel: "",
        estado: "Activo",
        doble: false,
        ultimo: minAntes(30),
        vence: null,
      },
      o || {},
    );
  const USERS = [
    us("Adrián Vindas Mora", "adrian.vindas", ["R1"], [TODOS], {
      doble: true,
      ultimo: minAntes(42),
      tel: "8811-2040",
    }),
    us("Sonia Calderón Ruiz", "sonia.calderon", ["R7"], [TODOS], {
      doble: true,
      ultimo: minAntes(12),
    }),
    us("Natalia Quesada Brenes", "natalia.quesada", ["R7"], [TODOS], {
      doble: true,
      ultimo: minAntes(95),
    }),
    us("Andrey Ramírez Solano", "andrey.ramirez", ["R8"], [TODOS], {
      doble: true,
      ultimo: minAntes(1),
      tel: "8720-5561",
    }),
    us("Óscar Jiménez Ureña", "oscar.jimenez", ["R5"], [TODOS], {
      doble: true,
      ultimo: minAntes(20),
    }),
    us("Álvaro Cordero Vindas", "alvaro.cordero", ["R5"], ["CD", "B1", "B2"], {
      ultimo: minAntes(8),
    }),
    us("Hazel Monge Rivera", "hazel.monge", ["R9"], [TODOS], {
      doble: true,
      ultimo: minAntes(33),
    }),
    us("Marta Rojas Picado", "marta.rojas", ["R2"], ["L1", "L2"], {
      ultimo: minAntes(5),
    }),
    us("Katherine Vargas Soto", "katherine.vargas", ["R2"], ["L2", "L6"], {
      ultimo: minAntes(64),
    }),
    us("Jonathan Ureña Salas", "jonathan.urena", ["R2", "R4"], ["L2"], {
      ultimo: minAntes(3),
    }),
    us("Priscilla Núñez Rojas", "priscilla.nunez", ["R2"], ["L2"], {
      ultimo: minAntes(210),
    }),
    us("Sofía Camacho Vega", "sofia.camacho", ["R2"], ["L3", "L4"], {
      ultimo: minAntes(17),
    }),
    us("Kevin Solano Mata", "kevin.solano", ["R3"], ["L1"], {
      ultimo: minAntes(2),
    }),
    us("Yeimy Picado Cruz", "yeimy.picado", ["R3"], ["L1"], {
      ultimo: minAntes(240),
    }),
    us("Randall Mata Brenes", "randall.mata", ["R4", "R3"], ["L1"], {
      ultimo: minAntes(4),
      vence: new Date(2026, 8, 30),
      temporal: "R3",
      motivoT: "Cubre las vacaciones de Yeimy Picado en caja",
    }),
    us("Dennis Fallas Chacón", "dennis.fallas", ["R3"], ["L2"], {
      estado: "Bloqueado",
      ultimo: dia(1),
      bloqueo: "3 intentos fallidos hoy a las 07:52",
    }),
    us("Fabián Coto Serrano", "fabian.coto", ["R4"], ["L2"], {
      ultimo: minAntes(6),
    }),
    us("Melissa Arce Jiménez", "melissa.arce", ["R4"], ["L2"], {
      ultimo: minAntes(11),
      nota: "Tienda virtual",
    }),
    us("Grettel Araya Mora", "grettel.araya", ["R3"], ["L6"], {
      ultimo: minAntes(9),
    }),
    us("Esteban Vindas Arias", "esteban.vindas", ["R3"], ["L4"], {
      ultimo: minAntes(15),
    }),
    us("Yendry Chacón Solís", "yendry.chacon", ["R3"], ["L3"], {
      ultimo: minAntes(26),
    }),
    us("Diego Solano Pérez", "diego.solano", ["R3", "R2"], ["L5"], {
      ultimo: minAntes(19),
    }),
    us("Josué Mora Castillo", "josue.mora", ["R3", "R2"], ["L7"], {
      ultimo: minAntes(23),
    }),
    us("Marvin Zúñiga Alfaro", "marvin.zuniga", ["R10"], ["CD"], {
      ultimo: minAntes(48),
    }),
    us("Wilberth Araya Mora", "wilberth.araya", ["R6"], ["CD"], {
      ultimo: minAntes(37),
    }),
    us("Greivin Sánchez Loría", "greivin.sanchez", ["R6"], ["B1"], {
      ultimo: minAntes(52),
    }),
    us("Rolando Castro Méndez", "rolando.castro", ["R11"], [TODOS], {
      doble: true,
      ultimo: dia(3),
      vence: new Date(2026, 11, 31),
      correo: "rcastro@auditores-externos.cr",
      nota: "Auditoría externa",
    }),
    us("Consulta Smart Serve", "consulta.smartserve", ["R12"], [TODOS], {
      doble: true,
      ultimo: dia(2),
      vence: new Date(2026, 9, 30),
      correo: "consulta@smartserve.cr",
      nota: "Solo ambiente de pruebas",
    }),
    us("Soporte externo", "soporte.externo", ["R13"], [TODOS], {
      ultimo: dia(74),
      nota: "No corresponde a ningún colaborador activo",
    }),
    us("Esteban Quirós Mena", "esteban.quiros", ["R4"], ["L5"], {
      estado: "Inactivado",
      ultimo: dia(52),
      inact: "Salió de la empresa el " + fecha(dia(51)),
    }),
    us(
      "Mostrador compartido Turrialba",
      "mostrador.turrialba",
      ["R4"],
      ["L2"],
      {
        estado: "Inactivado",
        ultimo: dia(21),
        inact: "Reemplazado por el PIN de cada vendedor",
      },
    ),
  ];
  const nomCorto = (n) => n.split(" ").slice(0, 2).join(" ");
  const locsTxt = (u) =>
    u.locs.indexOf(TODOS) >= 0
      ? tag("Todos los locales", "acc")
      : u.locs.map((l) => tag(locNom(l), "mu")).join(" ");
  const exige2f = (u) => u.roles.some((r) => rolById(r).tfa);

  const SES = [
    {
      u: "kevin.solano",
      eq: "Caja 1 · mostrador principal",
      loc: "L1",
      ip: "10.2.1.21",
      desde: hace(0, 6, 58),
      act: 1,
      exp: "al cerrar el turno",
    },
    {
      u: "randall.mata",
      eq: "Caja 3",
      loc: "L1",
      ip: "10.2.1.23",
      desde: hace(0, 10, 5),
      act: 4,
      exp: "al cerrar el turno",
    },
    {
      u: "jonathan.urena",
      eq: "Caja 2",
      loc: "L2",
      ip: "10.3.1.22",
      desde: hace(0, 7, 2),
      act: 3,
      exp: "al cerrar el turno",
    },
    {
      u: "grettel.araya",
      eq: "Caja 1 · mostrador principal",
      loc: "L6",
      ip: "10.7.1.21",
      desde: hace(0, 7, 0),
      act: 9,
      exp: "al cerrar el turno",
    },
    {
      u: "marta.rojas",
      eq: "Tableta de piso",
      loc: "L2",
      ip: "10.3.4.40",
      desde: hace(0, 8, 14),
      act: 5,
      exp: "en 55 min sin uso",
    },
    {
      u: "wilberth.araya",
      eq: "Terminal inalámbrica 2",
      loc: "CD",
      ip: "10.9.6.12",
      desde: hace(0, 6, 30),
      act: 37,
      exp: "en 23 min sin uso",
    },
    {
      u: "sonia.calderon",
      eq: "Laptop de contabilidad",
      loc: "L1",
      ip: "10.2.9.14",
      desde: hace(0, 8, 1),
      act: 12,
      exp: "en 3 min sin uso",
    },
    {
      u: "andrey.ramirez",
      eq: "Este equipo",
      loc: "L1",
      ip: "10.2.14.8",
      desde: hace(0, 7, 45),
      act: 0,
      exp: "en 15 min sin uso",
      yo: true,
    },
  ];
  const SOL = [
    {
      id: "SA-0142",
      f: minAntes(38),
      pide: "Marta Rojas",
      cargo: "Administradora · Turrialba",
      para: "Fabián Coto Serrano",
      que: "Agregar rol Cajero en Turrialba",
      mot: "Cubre la caja 4 los sábados",
      estado: "Pendiente",
    },
    {
      id: "SA-0141",
      f: minAntes(125),
      pide: "Adrián Vindas",
      cargo: "Gerencia",
      para: "Hazel Monge Rivera",
      que: "Agregar permiso «Exportar a Excel» solo en Cuentas por cobrar",
      mot: "Envío mensual de la antigüedad de saldos al abogado",
      estado: "Pendiente",
    },
    {
      id: "SA-0140",
      f: dia(1),
      pide: "Sofía Camacho",
      cargo: "Administradora · Pacayas",
      para: "Nueva persona: Luis Brenes Solís",
      que: "Crear usuario Vendedor de piso en Pacayas",
      mot: "Ingreso el lunes 15",
      estado: "Pendiente",
    },
    {
      id: "SA-0139",
      f: dia(2),
      pide: "Adrián Vindas",
      cargo: "Gerencia",
      para: "Randall Mata Brenes",
      que: "Rol Cajero temporal en Santa Rosa hasta el 30 set",
      mot: "Vacaciones de Yeimy Picado",
      estado: "Aprobada",
      por: "Andrey Ramírez",
    },
    {
      id: "SA-0137",
      f: dia(5),
      pide: "Óscar Jiménez",
      cargo: "Proveeduría",
      para: "Álvaro Cordero Vindas",
      que: "Permiso de eliminar órdenes de compra aplicadas",
      mot: "Corregir órdenes duplicadas",
      estado: "Rechazada",
      por: "Adrián Vindas",
      rech: "Una orden aplicada no se elimina: se anula con motivo",
    },
  ];

  let usQ = "",
    usL = "",
    usE = "Activos";
  function filtrarUsuarios() {
    const q = norm(usQ.trim());
    return USERS.filter(
      (u) =>
        (usE === "Todos" ||
          (usE === "Activos"
            ? u.estado !== "Inactivado"
            : u.estado === "Inactivado")) &&
        (!usL || u.locs.indexOf(TODOS) >= 0 || u.locs.indexOf(usL) >= 0) &&
        (!q ||
          norm(
            u.nom +
              " " +
              u.login +
              " " +
              u.roles.map((r) => rolById(r).nom).join(" "),
          ).indexOf(q) >= 0),
    );
  }
  function tablaUsuarios() {
    const rows = filtrarUsuarios();
    return table({
      h: "calc(100dvh - 470px)",
      cols: [
        {
          t: "Usuario",
          fmt: (u) =>
            `<b>${esc(u.nom)}</b><span class="sub ui">${esc(u.login)}${u.nota ? " · " + esc(u.nota) : ""}</span>`,
        },
        {
          t: "Roles",
          fmt: (u) =>
            u.roles
              .map((r) =>
                tag(
                  rolById(r).nom +
                    (u.temporal === r && u.vence
                      ? " · hasta " + fecha(u.vence)
                      : ""),
                  u.temporal === r ? "wa" : rolById(r).total ? "cr" : "acc",
                ),
              )
              .join(" "),
        },
        { t: "Locales", fmt: locsTxt },
        {
          t: "Doble factor",
          fmt: (u) =>
            u.doble
              ? tag("Activo", "ok", "shield")
              : exige2f(u)
                ? tag("Falta", "cr")
                : '<span class="dim">No lo exige su rol</span>',
        },
        { t: "Último ingreso", cls: "mono", fmt: (u) => fh(u.ultimo) },
        {
          t: "Estado",
          fmt: (u) =>
            u.estado === "Activo"
              ? u.vence
                ? tag("Vence " + fecha(u.vence), "wa", "clock")
                : tag("Activo", "ok")
              : u.estado === "Bloqueado"
                ? tag("Bloqueado", "cr", "lock")
                : tag("Inactivado", "mu"),
        },
        {
          t: "",
          r: true,
          fmt: (u) =>
            `<button class="btn sm" data-ued="${esc(u.login)}">Editar</button>`,
        },
      ],
      rows,
      rowCls: (u) =>
        u.estado === "Inactivado"
          ? "dim"
          : u.estado === "Bloqueado"
            ? "cr"
            : "",
    });
  }
  function usuariosTab(el) {
    const act = USERS.filter((u) => u.estado !== "Inactivado");
    el.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Usuarios activos", act.length, { txt: "en 7 locales, el CEDI y las bodegas; sin costo por usuario" })}
        ${stat("Doble factor", act.filter((u) => exige2f(u) && u.doble).length + " de " + act.filter(exige2f).length, { txt: "los que su rol lo exige" }, act.filter((u) => exige2f(u) && !u.doble).length ? "var(--crit)" : "var(--ok)")}
        ${stat("Accesos temporales", act.filter((u) => u.vence).length, { txt: "se retiran solos en la fecha" }, "var(--warn)")}
        ${stat("Inactivados", USERS.length - act.length, { txt: "nunca se eliminan: su nombre sigue en la bitácora" }, "var(--ink-4)")}
      </div>
      ${card({
        title: "Usuarios",
        hint: "cada persona con su propio usuario; ninguno compartido",
        actions: `<button class="btn sm pri" id="usNuevo">${icon("plus")}Nuevo usuario</button>`,
        body: `<div class="sx-bar" style="margin-bottom:12px">
          <div class="tb-search">${icon("search")}<input id="usQ" type="search" value="${esc(usQ)}" placeholder="Nombre, usuario o rol" aria-label="Buscar usuario"></div>
          <select class="sx-sel" id="usL" aria-label="Filtrar por local"><option value="">Todos los locales</option>${D.locales.map((l) => `<option value="${l.id}" ${usL === l.id ? "selected" : ""}>${esc(l.nom)}</option>`).join("")}</select>
          ${seg("use", ["Activos", "Inactivos", "Todos"], usE)}</div>
        <div id="usTabla">${tablaUsuarios()}</div>`,
      })}</div>`;
  }
  function fichaUsuario(u) {
    const nuevo = !u;
    u = u || {
      nom: "",
      login: "",
      correo: "",
      tel: "",
      roles: [],
      locs: [],
      doble: false,
      vence: null,
      estado: "Activo",
    };
    const opRoles = ROLES.filter((r) => !r.inactivo).map((r) => ({
      v: r.id,
      t: r.nom,
    }));
    const opLocs = [{ v: TODOS, t: "Todos los locales" }].concat(
      D.locales.map((l) => ({ v: l.id, t: l.nom })),
    );
    ficha({
      title: nuevo ? "Nuevo usuario" : u.nom,
      sub: nuevo
        ? "Le llega una invitación por correo; nadie más conoce su contraseña"
        : u.login +
          " · " +
          (u.estado === "Inactivado"
            ? "inactivado"
            : "activo desde " + fecha(dia(400 + u.nom.length * 7))),
      campos: [
        { id: "nom", l: "Nombre completo", v: u.nom, req: true },
        {
          id: "login",
          l: "Usuario",
          v: u.login,
          req: true,
          corto: true,
          dis: !nuevo,
          hint: nuevo
            ? "Con esto entra. No se puede repetir."
            : "No cambia: la bitácora lo usa.",
        },
        { id: "tel", l: "Teléfono", v: u.tel, corto: true },
        {
          id: "correo",
          l: "Correo",
          v: u.correo,
          req: true,
          hint: "Ahí le llegan la invitación y los enlaces para restablecer la contraseña.",
        },
        {
          id: "roles",
          l: "Roles",
          tipo: "chips",
          opts: opRoles,
          v: u.roles,
          req: true,
        },
        {
          id: "locs",
          l: "Locales donde opera",
          tipo: "chips",
          opts: opLocs,
          v: u.locs,
          req: true,
        },
        {
          id: "vence",
          l: "Acceso temporal hasta",
          v: u.vence ? fecha(u.vence) + " " + u.vence.getFullYear() : "",
          ph: "Opcional · por ejemplo 30 set 2026",
          hint: "Para reemplazos, auditorías y consultores: el acceso se retira solo ese día.",
        },
        {
          id: "doble",
          l: "Doble factor",
          tipo: "switch",
          v: u.doble,
          hint: "Obligatorio si alguno de sus roles lo exige.",
        },
      ],
      extra: nuevo
        ? ""
        : `<div class="sx-bar"><button type="button" class="btn sm" id="uReset">${icon("mail")}Enviar enlace para nueva contraseña</button><button type="button" class="btn sm" id="uSes">${icon("x")}Cerrar sus sesiones</button>${u.estado === "Bloqueado" ? `<button type="button" class="btn sm" id="uDesb">${icon("lock")}Desbloquear</button>` : ""}</div>`,
      nota: nuevo
        ? "No se asigna ni se dicta una contraseña: la persona la crea desde el enlace de invitación, válido 24 horas. Si sus roles combinan funciones incompatibles, el sistema lo avisa antes de guardar."
        : "El usuario no se elimina: se inactiva, y su nombre sigue apareciendo en la bitácora y en cada documento que hizo.",
      notaIc: nuevo ? "mail" : "history",
      ok: nuevo ? "Crear y enviar invitación" : "Guardar",
      peligro: nuevo
        ? null
        : u.estado === "Inactivado"
          ? {
              t: "Reactivar usuario",
              ic: "check",
              fn: () => {
                u.estado = "Activo";
                anotar(
                  "Reactivó usuario",
                  u.login,
                  "Media",
                  "Inactivado",
                  "Activo",
                );
                return {
                  t: "Usuario reactivado",
                  s: u.nom + " puede volver a entrar con su contraseña.",
                  k: "ok",
                };
              },
            }
          : {
              t: "Inactivar usuario",
              ic: "lock",
              fn: () => {
                u.estado = "Inactivado";
                u.inact = "Inactivado por " + yo();
                anotar(
                  "Inactivó usuario",
                  u.login,
                  "Alta",
                  "Activo",
                  "Inactivado",
                );
                return {
                  t: "Usuario inactivado",
                  s: "Sus sesiones se cerraron. Su historial queda intacto.",
                };
              },
            },
      guardar(v) {
        if (nuevo && USERS.some((x) => x.login === v.login)) {
          toast(
            "Ese usuario ya existe",
            "Elija otro; puede ser nombre.apellido2.",
            "cr",
          );
          return false;
        }
        const inc = v.roles.indexOf("R3") >= 0 && v.roles.indexOf("R4") >= 0;
        const obj = nuevo
          ? us(v.nom, v.login.toLowerCase(), v.roles, v.locs, { ultimo: null })
          : u;
        Object.assign(obj, {
          nom: v.nom,
          correo: v.correo,
          tel: v.tel,
          roles: v.roles,
          locs: v.locs,
          doble: v.doble,
        });
        if (nuevo) {
          obj.ultimo = new Date(D.HOY);
          obj.nota = "Invitación enviada";
          USERS.unshift(obj);
          anotar(
            "Creó usuario",
            obj.login + " · " + v.roles.map((r) => rolById(r).nom).join(", "),
            "Media",
            "",
            "Activo",
          );
        } else
          anotar(
            "Modificó usuario",
            obj.login,
            "Media",
            "",
            v.roles.map((r) => rolById(r).nom).join(", "),
          );
        if (inc)
          return {
            t: "Guardado con una advertencia",
            s: "Vendedor y cajero a la vez: queda como excepción de segregación hasta que gerencia la apruebe.",
            k: "wa",
          };
        return nuevo
          ? {
              t: "Usuario creado",
              s: "La invitación salió a " + v.correo + ". Vence en 24 horas.",
            }
          : {
              t: "Usuario actualizado",
              s: "Los cambios de rol rigen desde su próxima pantalla.",
            };
      },
      after(el) {
        const r = $("#uReset", el);
        if (r)
          r.addEventListener("click", () =>
            toast(
              "Enlace enviado",
              "Le llegó a " +
                u.correo +
                ". Vence en 24 horas; nadie más ve la contraseña nueva.",
              "ok",
            ),
          );
        const s = $("#uSes", el);
        if (s)
          s.addEventListener("click", () => {
            const n = SES.filter((x) => x.u === u.login).length;
            for (let i = SES.length - 1; i >= 0; i--)
              if (SES[i].u === u.login) SES.splice(i, 1);
            toast(
              n ? n + " sesión cerrada" : "No tenía sesiones abiertas",
              n
                ? "La sesión murió en el servidor: tendrá que volver a entrar."
                : "",
              n ? "ok" : "in",
            );
          });
        const d = $("#uDesb", el);
        if (d)
          d.addEventListener("click", () => {
            u.estado = "Activo";
            anotar(
              "Desbloqueó usuario",
              u.login,
              "Media",
              "Bloqueado",
              "Activo",
            );
            toast(
              "Desbloqueado",
              "Puede volver a intentar. Si no recuerda su contraseña, envíele el enlace.",
              "ok",
            );
          });
      },
    });
  }
  function usuariosWire(v) {
    const p = $("#tp-usuarios", v);
    const pintar = () => {
      const t = $("#usTabla", p);
      t.innerHTML = tablaUsuarios();
      ligar();
    };
    const ligar = () =>
      $$("[data-ued]", p).forEach((b) =>
        b.addEventListener("click", () =>
          fichaUsuario(USERS.find((u) => u.login === b.dataset.ued)),
        ),
      );
    ligar();
    $("#usQ", p).addEventListener("input", (e) => {
      usQ = e.target.value;
      pintar();
    });
    $("#usL", p).addEventListener("change", (e) => {
      usL = e.target.value;
      pintar();
    });
    onSeg(p, "use", (x) => {
      usE = x;
      pintar();
    });
    $("#usNuevo", p).addEventListener("click", () => fichaUsuario(null));
  }

  function solicitudesTab(el) {
    const pend = SOL.filter((s) => s.estado === "Pendiente");
    el.innerHTML = `<div class="wrap">
      ${nota("Gerencia o el administrador del local piden el acceso desde aquí, no por correo ni por WhatsApp. TI lo ejecuta y queda escrito <b>quién lo pidió, quién lo aprobó y por qué</b>.", "users")}
      ${card({
        title: "Solicitudes de acceso",
        hint: pend.length ? pend.length + " por atender" : "al día",
        actions: `<button class="btn sm" id="solNueva">${icon("plus")}Nueva solicitud</button>`,
        body: table({
          cols: [
            {
              t: "Solicitud",
              fmt: (s) =>
                `<b class="num">${esc(s.id)}</b><span class="sub ui">${fh(s.f)}</span>`,
            },
            {
              t: "Pide",
              fmt: (s) =>
                `<b>${esc(s.pide)}</b><span class="sub ui">${esc(s.cargo)}</span>`,
            },
            { t: "Para", fmt: (s) => esc(s.para) },
            {
              t: "Qué",
              fmt: (s) =>
                `${esc(s.que)}<span class="sub ui">${esc(s.mot)}</span>`,
            },
            {
              t: "Estado",
              fmt: (s) =>
                s.estado === "Pendiente"
                  ? tag("Pendiente", "wa", "clock")
                  : s.estado === "Aprobada"
                    ? tag("Aprobada · " + nomCorto(s.por), "ok", "check")
                    : `${tag("Rechazada · " + nomCorto(s.por), "cr")}${s.rech ? `<span class="sub ui">${esc(s.rech)}</span>` : ""}`,
            },
            {
              t: "",
              r: true,
              fmt: (s) =>
                s.estado === "Pendiente"
                  ? `<div style="display:flex;gap:6px;justify-content:flex-end"><button class="btn sm" data-srech="${s.id}">Rechazar</button><button class="btn sm pri" data-sok="${s.id}">${icon("check")}Aprobar y aplicar</button></div>`
                  : "",
            },
          ],
          rows: SOL,
        }),
      })}</div>`;
  }
  function solicitudesWire(v) {
    const p = $("#tp-usuarios", v);
    $$("[data-sok]", p).forEach((b) =>
      b.addEventListener("click", () => {
        const s = SOL.find((x) => x.id === b.dataset.sok);
        s.estado = "Aprobada";
        s.por = yo();
        anotar(
          "Aplicó solicitud de acceso",
          s.id + " · " + s.que + " · pidió " + s.pide,
          "Media",
          "Pendiente",
          "Aprobada",
        );
        toast(
          "Solicitud aplicada",
          s.que + ". " + s.pide + " recibe la confirmación por correo.",
          "ok",
        );
        A.refresh();
      }),
    );
    $$("[data-srech]", p).forEach((b) =>
      b.addEventListener("click", () => {
        const s = SOL.find((x) => x.id === b.dataset.srech);
        ficha({
          title: "Rechazar " + s.id,
          sub: s.que,
          campos: [
            {
              id: "m",
              l: "Motivo",
              tipo: "area",
              req: true,
              ph: "Se le envía a quien lo pidió",
            },
          ],
          ok: "Rechazar",
          guardar(x) {
            s.estado = "Rechazada";
            s.por = yo();
            s.rech = x.m;
            anotar(
              "Rechazó solicitud de acceso",
              s.id + " · " + x.m,
              "Media",
              "Pendiente",
              "Rechazada",
            );
            return {
              t: "Solicitud rechazada",
              s: s.pide + " recibe el motivo por correo.",
              k: "wa",
            };
          },
        });
      }),
    );
    $("#solNueva", p).addEventListener("click", () =>
      ficha({
        title: "Nueva solicitud de acceso",
        sub: "La registra quien la pide; TI la aplica",
        campos: [
          {
            id: "para",
            l: "Para",
            tipo: "select",
            opts: USERS.filter((u) => u.estado !== "Inactivado")
              .map((u) => u.nom)
              .concat(["Persona nueva"]),
          },
          {
            id: "que",
            l: "Qué necesita",
            tipo: "select",
            opts: [
              "Agregar un rol",
              "Quitar un rol",
              "Cambiar de local",
              "Acceso temporal",
              "Crear usuario",
              "Inactivar usuario",
            ],
          },
          {
            id: "rol",
            l: "Rol",
            tipo: "select",
            opts: ROLES.map((r) => r.nom),
            corto: true,
          },
          {
            id: "loc",
            l: "Local",
            tipo: "select",
            opts: D.locales.map((l) => l.nom),
            corto: true,
          },
          { id: "mot", l: "Motivo", tipo: "area", req: true, rows: 2 },
        ],
        ok: "Enviar solicitud",
        guardar(x) {
          const id =
            "SA-0" + (143 + SOL.filter((s) => s.estado === "Pendiente").length);
          SOL.unshift({
            id,
            f: new Date(D.HOY),
            pide: yo(),
            cargo: "TI",
            para: x.para,
            que: x.que + " · " + x.rol + " en " + x.loc,
            mot: x.mot,
            estado: "Pendiente",
          });
          return {
            t: "Solicitud " + id + " registrada",
            s: "Gerencia la ve en su bandeja.",
          };
        },
      }),
    );
  }

  function sesionesTab(el) {
    el.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Sesiones abiertas", SES.length, { txt: "cada una atada a su equipo" })}
        ${stat("En caja", SES.filter((s) => /Caja/.test(s.eq)).length, { txt: "se cierran solas al cerrar el turno" })}
        ${stat("Sin actividad", SES.filter((s) => s.act >= 30).length, { txt: "30 minutos o más" }, "var(--warn)")}
        ${stat("Compartidas por enlace", "0", { txt: "la sesión no viaja en la dirección" }, "var(--ok)")}
      </div>
      ${card({
        title: "Quién está dentro ahora",
        hint: "cerrar una sesión la mata en el servidor",
        body: table({
          cols: [
            {
              t: "Usuario",
              fmt: (s) => {
                const u = USERS.find((x) => x.login === s.u) || {
                  nom: s.u,
                  roles: [],
                };
                return `<b>${esc(u.nom)}</b>${s.yo ? " " + tag("usted", "acc") : ""}<span class="sub ui">${esc(u.roles.map((r) => rolById(r).nom).join(" · "))}</span>`;
              },
            },
            {
              t: "Equipo",
              fmt: (s) =>
                `${esc(s.eq)}<span class="sub ui">${esc(locNom(s.loc))}</span>`,
            },
            {
              t: "Origen",
              cls: "mono",
              fmt: (s) => `<span class="mut">${esc(s.ip)}</span>`,
            },
            { t: "Desde", cls: "mono", fmt: (s) => fh(s.desde) },
            {
              t: "Última actividad",
              fmt: (s) =>
                s.act === 0
                  ? tag("ahora", "ok")
                  : s.act >= 30
                    ? tag("hace " + s.act + " min", "wa")
                    : `<span class="mut">hace ${s.act} min</span>`,
            },
            {
              t: "Expira",
              fmt: (s) => `<span class="mut">${esc(s.exp)}</span>`,
            },
            {
              t: "",
              r: true,
              fmt: (s) =>
                s.yo
                  ? ""
                  : `<button class="btn sm" data-sesx="${s.u}|${esc(s.eq)}">${icon("x")}Cerrar sesión</button>`,
            },
          ],
          rows: SES,
        }),
      })}
      ${nota("Al cerrar sesión, al cambiar de cajero o al vencer el tiempo sin uso, el acceso muere en el servidor. Copiar la dirección y abrirla en otro equipo pide usuario y contraseña (hallazgo HAL-01 del sistema actual).", "lock")}</div>`;
  }
  function sesionesWire(v) {
    $$("[data-sesx]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const [u, eq] = b.dataset.sesx.split("|"),
          i = SES.findIndex((s) => s.u === u && s.eq === eq);
        if (i >= 0) SES.splice(i, 1);
        anotar("Cerró sesión de otro usuario", u + " · " + eq, "Media");
        toast(
          "Sesión cerrada",
          "Si estaba facturando, el borrador queda guardado en el nodo del local.",
          "ok",
        );
        A.refresh();
      }),
    );
  }

  function revisionTab(el) {
    const falta2f = USERS.filter(
      (u) => u.estado !== "Inactivado" && exige2f(u) && !u.doble,
    );
    const total = USERS.filter(
      (u) => u.estado !== "Inactivado" && u.roles.some((r) => rolById(r).total),
    );
    const dormidos = USERS.filter(
      (u) => u.estado === "Activo" && u.ultimo && D.HOY - u.ultimo > 45 * 864e5,
    );
    const venc = USERS.filter((u) => u.estado === "Activo" && u.vence);
    const items = [
      total.length
        ? {
            k: "cr",
            ic: "shield",
            t: total.length + " usuario con acceso total sin vencimiento",
            s:
              total.map((u) => u.login + " · " + (u.nota || "")).join("; ") +
              ". El acceso total es para emergencias: con nombre, doble factor y fecha de retiro.",
            b: "Inactivar",
            fn: () => {
              total.forEach((u) => {
                u.estado = "Inactivado";
                u.inact = "Revisión de accesos";
              });
              anotar(
                "Inactivó usuario",
                total.map((u) => u.login).join(", "),
                "Alta",
                "Activo",
                "Inactivado",
              );
              toast(
                "Acceso total retirado",
                "El usuario quedó inactivo; su historial se conserva.",
                "ok",
              );
              A.refresh();
            },
          }
        : null,
      falta2f.length
        ? {
            k: "cr",
            ic: "lock",
            t:
              falta2f.length + " usuarios sin el doble factor que su rol exige",
            s:
              falta2f.map((u) => u.login).join(", ") +
              ". Al próximo ingreso se les pedirá configurarlo.",
            b: "Exigir al entrar",
            fn: () => toast("Listo", "Se les pedirá al próximo ingreso.", "ok"),
          }
        : null,
      {
        k: "wa",
        ic: "users",
        t: "2 locales con una sola persona por turno en caja",
        s: "Pejibaye y Tucurrique: la misma persona administra y cobra. Queda como excepción de segregación aprobada por gerencia, con revisión semanal de cierres.",
        b: "Ver segregación",
        ir: "seg-roles|segregacion",
      },
      dormidos.length
        ? {
            k: "wa",
            ic: "clock",
            t: dormidos.length + " usuario sin entrar en más de 45 días",
            s: dormidos.map((u) => u.login).join(", ") + ".",
            b: "Revisar",
            fn: () => {
              usE = "Activos";
              A.go("usuarios", "usuarios");
            },
          }
        : null,
      {
        k: "in",
        ic: "layers",
        t: "Roles repetidos del sistema anterior",
        s: "«Proformas», «Proformas 2» y «Mostrador» tenían los mismos permisos que Vendedor de piso. Se unificaron en la migración; ninguno quedó con usuarios.",
        b: "Ver roles",
        ir: "seg-roles|roles",
      },
      venc.length
        ? {
            k: "in",
            ic: "clock",
            t: venc.length + " accesos temporales vigentes",
            s:
              venc
                .map((u) => u.login + " hasta el " + fecha(u.vence))
                .join(" · ") + ". Se retiran solos en la fecha.",
            b: null,
          }
        : null,
    ].filter(Boolean);
    el.innerHTML = `<div class="wrap">
      ${nota("Una revisión mensual, como la pide la auditoría externa: quién tiene más de lo que necesita, quién ya no debería entrar y qué combinaciones de funciones no deberían existir.", "shield")}
      ${card({
        title: "Hallazgos de la revisión",
        hint: "revisado hoy · la próxima el " + fecha(new Date(2026, 9, 13)),
        body: `<div class="alerts" style="margin:-12px -17px -16px">${items.map((x, i) => `<div class="alert ${x.k}">${icon(x.ic)}<div style="flex:1"><div class="at">${esc(x.t)}</div><div class="as">${esc(x.s)}</div></div>${x.b ? `<button class="btn sm" ${x.ir ? `data-ir="${x.ir}"` : `data-rv="${i}"`}>${esc(x.b)}</button>` : ""}</div>`).join("")}</div>`,
      })}
    </div>`;
    el._rv = items;
  }
  function revisionWire(v) {
    const p = $("#tp-usuarios", v);
    A.wireIr(p);
    $$("[data-rv]", p).forEach((b) =>
      b.addEventListener("click", () => {
        const x = p._rv[+b.dataset.rv];
        if (x && x.fn) x.fn();
      }),
    );
  }

  A.workspace("usuarios", {
    title: "Usuarios y accesos",
    tabs: [
      {
        id: "usuarios",
        t: "Usuarios",
        sub: "Cada persona con su usuario, sus roles y los locales donde opera",
        render: usuariosTab,
        wire: usuariosWire,
      },
      {
        id: "solicitudes",
        t: "Solicitudes de acceso",
        sub: "Quién pidió el acceso, quién lo aprobó y por qué",
        badge: () => {
          const n = SOL.filter((s) => s.estado === "Pendiente").length;
          return { n, k: "wa", l: n + " pendientes" };
        },
        render: solicitudesTab,
        wire: solicitudesWire,
      },
      {
        id: "sesiones",
        t: "Sesiones abiertas",
        sub: "Quién está dentro, desde qué equipo, y cerrar la que sobre",
        render: sesionesTab,
        wire: sesionesWire,
      },
      {
        id: "revision",
        t: "Revisión de accesos",
        sub: "Lo que sobra, lo que falta y lo que no debería combinarse",
        badge: () => {
          const n =
            USERS.filter(
              (u) =>
                u.estado !== "Inactivado" &&
                u.roles.some((r) => rolById(r).total),
            ).length +
            USERS.filter(
              (u) => u.estado !== "Inactivado" && exige2f(u) && !u.doble,
            ).length;
          return { n, k: "cr", l: n + " hallazgos críticos" };
        },
        render: revisionTab,
        wire: revisionWire,
      },
    ],
  });

  /* ── ROLES Y PERMISOS (SEG-001, SEG-002, SEG-003, SEG-006) ── */
  const ACT = [
    ["v", "Ver"],
    ["r", "Registrar"],
    ["m", "Modificar"],
    ["e", "Eliminar"],
    ["i", "Importar"],
    ["x", "Exportar"],
  ];
  let ARBOL = null;
  /* el árbol de permisos es el mismo menú: módulo › opción, con sus seis acciones */
  function arbol() {
    if (ARBOL) return ARBOL;
    const NV = w.NAV;
    ARBOL = [];
    NV.MODULES.forEach((m) => {
      const vistos = {},
        items = [];
      (NV.MENU_TREE[m.id] || []).forEach((sec) =>
        sec.items.forEach((it) => {
          if (it.alias) return;
          const scr = it.screen || "x:" + it.t;
          if (vistos[scr]) return;
          vistos[scr] = 1;
          items.push({ k: m.id + "|" + scr, scr, t: it.t, prox: !it.screen });
        }),
      );
      if (items.length) ARBOL.push({ id: m.id, t: m.t, ic: m.ic, items });
    });
    return ARBOL;
  }
  const BASE = {
    R1: { "*": "vx", sistema: "v" },
    R2: {
      ventas: "vrm",
      inventarios: "vrm",
      compras: "v",
      cobros: "vr",
      logistica: "vrm",
      taller: "vrm",
      bi: "vx",
      fel: "v",
      ia: "v",
    },
    R3: {
      ventas: { pos: "vr", caja: "vr", documentos: "v" },
      cobros: { cxc: "v" },
    },
    R4: {
      ventas: {
        pos: "vr",
        cotizaciones: "vrm",
        clientes: "v",
        despachos: "v",
        "ven-relacionados": "v",
        "ven-pendientes": "v",
      },
      inventarios: { existencias: "v", catalogo: "v" },
    },
    R5: { compras: "vrmx", inventarios: "vrm", bi: "vx", cobros: { cxp: "v" } },
    R6: { inventarios: "vrm", logistica: "vr", compras: { "*": "v" } },
    R7: {
      contab: "vrmx",
      cobros: "vrmx",
      fel: "vrmx",
      rrhh: "vrmx",
      ventas: "v",
      compras: "v",
      inventarios: "v",
      bi: "vx",
    },
    R8: { sistema: "vrmex", migracion: "vrmi", "*": "v" },
    R9: { cobros: "vrmx", ventas: { clientes: "vrm", "*": "v" }, bi: "vx" },
    R10: { inventarios: "vrm", logistica: "vrm", compras: "v" },
    R11: { "*": "vx" },
    R12: { "*": "v" },
    R13: { "*": "vrmeix" },
  };
  function permDef(rid, mod, scr) {
    const b = BASE[rid] || {};
    let m = b[mod];
    if (m == null) m = b["*"];
    if (m == null) return "";
    if (typeof m === "object") return m[scr] != null ? m[scr] : m["*"] || "";
    return m;
  }
  const ESPECIALES = [
    {
      k: "costo",
      t: "Ver costo y utilidad",
      d: "En la caja, la ficha del artículo y los reportes. El vendedor no ve cuánto costó.",
      roles: ["R1", "R2", "R5", "R7", "R11", "R13"],
    },
    {
      k: "precio",
      t: "Modificar el precio en la factura",
      d: "Solo en esa factura, nunca en el artículo, y sin bajar del margen mínimo.",
      roles: ["R2"],
    },
    {
      k: "margen",
      t: "Pedir venta bajo el margen",
      d: "Pide la autorización; no la concede.",
      roles: ["R2", "R4"],
    },
    {
      k: "autoriza",
      t: "Autorizar excepciones",
      d: "Según la tabla de quién autoriza qué y hasta qué monto.",
      roles: ["R1", "R2"],
      crit: true,
    },
    {
      k: "anular",
      t: "Anular documentos",
      d: "Con motivo del catálogo y autorización; lo normal es la nota de crédito.",
      roles: ["R2", "R7"],
      crit: true,
    },
    {
      k: "limite",
      t: "Cambiar el límite de crédito",
      d: "Gerencia recibe un aviso cada vez.",
      roles: ["R1", "R9"],
      crit: true,
    },
    {
      k: "plazo",
      t: "Cambiar el término de pago en la compra",
      d: "Para un plazo atípico sin editar la ficha del proveedor.",
      roles: ["R5"],
    },
    {
      k: "caja",
      t: "Abrir y cerrar caja",
      d: "Con fondo al abrir y arqueo al cerrar.",
      roles: ["R2", "R3"],
    },
    {
      k: "reimp",
      t: "Reimprimir y reenviar comprobantes",
      d: "La copia sale marcada como copia.",
      roles: ["R2", "R3", "R7"],
    },
    {
      k: "export",
      t: "Exportar a Excel",
      d: "Queda en la bitácora con cuántos registros salieron.",
      roles: ["R1", "R5", "R7", "R9", "R11"],
      crit: true,
    },
    {
      k: "import",
      t: "Carga masiva (importar)",
      d: "Solo con plantilla y validación previa; se usó en la migración.",
      roles: ["R13"],
      crit: true,
    },
    {
      k: "bancos",
      t: "Crear o eliminar cuentas bancarias",
      d: "Pide doble factor.",
      roles: ["R7"],
      crit: true,
    },
    {
      k: "salario",
      t: "Ver salarios",
      d: "Planilla y expedientes.",
      roles: ["R1", "R7"],
      crit: true,
    },
    {
      k: "usuarios",
      t: "Administrar usuarios y permisos",
      d: "Cada cambio queda en la bitácora con quién lo pidió.",
      roles: ["R8", "R13"],
      crit: true,
    },
  ];
  const CAMPOS = [
    { k: "costo", t: "Costo del artículo", d: "Catálogo, caja y compras" },
    { k: "util", t: "Utilidad y margen", d: "Caja y reportes" },
    { k: "limite", t: "Límite de crédito del cliente", d: "Ficha del cliente" },
    { k: "precioc", t: "Precio de constructor", d: "Caja y proformas" },
    { k: "salario", t: "Salario", d: "Expediente y planilla" },
    {
      k: "cuenta",
      t: "Cuenta bancaria del proveedor",
      d: "Ficha del proveedor y pagos",
    },
    {
      k: "contacto",
      t: "Cédula, correo y teléfono del cliente",
      d: "Ficha del cliente y exportaciones",
    },
  ];
  const NIV = { O: "Oculto", V: "Ver", E: "Editar" };
  const CAMPO_DEF = {
    R1: "VVVVVVV",
    R2: "VVVEOOV",
    R3: "OOVOOOV",
    R4: "OOOVOOE",
    R5: "EVOOOEO",
    R6: "OOOOOOO",
    R7: "VVVOEEV",
    R8: "OOOOOOO",
    R9: "OOEOOOE",
    R10: "VOOOOOO",
    R11: "VVVVVVV",
    R12: "OOOOOOO",
    R13: "VVVVOVV",
  };

  const PERM = {},
    ESP = {},
    CMP = {};
  const permDe = (rid) =>
    PERM[rid] ||
    (PERM[rid] = (() => {
      const o = {};
      arbol().forEach((m) =>
        m.items.forEach((it) => {
          o[it.k] = permDef(rid, m.id, it.scr);
        }),
      );
      return o;
    })());
  const espDe = (rid) =>
    ESP[rid] ||
    (ESP[rid] = ESPECIALES.filter((e) => e.roles.indexOf(rid) >= 0).map(
      (e) => e.k,
    ));
  const cmpDe = (rid) =>
    CMP[rid] ||
    (CMP[rid] = (() => {
      const s = CAMPO_DEF[rid] || "OOOOOOO",
        o = {};
      CAMPOS.forEach((c, i) => {
        o[c.k] = s[i];
      });
      return o;
    })());
  const usuariosDe = (rid) =>
    USERS.filter((u) => u.estado !== "Inactivado" && u.roles.indexOf(rid) >= 0);

  let rolSel = "R3",
    rolVista = "pantallas",
    rolQ = "";
  let ED = null; /* copia de trabajo mientras se modifican los permisos */
  const ABIERTOS = { ventas: true };
  const cuentaCambios = () => {
    if (!ED) return 0;
    let n = 0;
    const p0 = permDe(rolSel),
      e0 = espDe(rolSel),
      c0 = cmpDe(rolSel);
    Object.keys(ED.perm).forEach((k) => {
      const a = ED.perm[k],
        b = p0[k];
      ACT.forEach((x) => {
        if (a.indexOf(x[0]) >= 0 !== b.indexOf(x[0]) >= 0) n++;
      });
    });
    ESPECIALES.forEach((e) => {
      if (ED.esp.indexOf(e.k) >= 0 !== e0.indexOf(e.k) >= 0) n++;
    });
    CAMPOS.forEach((c) => {
      if (ED.cmp[c.k] !== c0[c.k]) n++;
    });
    return n;
  };
  function resumenMod(m, P) {
    const con = m.items.filter((it) => (P[it.k] || "").length).length;
    if (!con) return '<span class="dim">sin acceso</span>';
    const letras = ACT.filter((a) =>
      m.items.some((it) => (P[it.k] || "").indexOf(a[0]) >= 0),
    ).map((a) => a[1].toLowerCase());
    return `<span class="mut">${con} de ${m.items.length} · ${letras.join(", ")}</span>`;
  }
  function vistaPantallas(r) {
    const P = ED ? ED.perm : permDe(r.id),
      dis = !ED;
    return `<div class="sx-bar" style="margin-bottom:10px;justify-content:space-between">
        <span class="sx-hint">${ED ? "Marque o desmarque; la fila del módulo marca todo el módulo. Nada rige hasta guardar." : "Solo consulta. Use «Modificar permisos» para cambiar."} Eliminar solo aplica a documentos en estado registrado; lo aplicado se anula.</span>
        <span><button type="button" class="btn sm" id="expTodo">Expandir todo</button> <button type="button" class="btn sm" id="colTodo">Contraer todo</button></span></div>
      <div class="tscroll" style="max-height:calc(150dvh - 500px);min-height:260px"><table class="dt sx-perm"><thead><tr><th>Módulo y opción del menú</th>${ACT.map((a) => `<th class="c">${a[1]}</th>`).join("")}</tr></thead><tbody>
      ${arbol()
        .map((m) => {
          const ab = !!ABIERTOS[m.id];
          return `<tr class="sx-mod"><td><button type="button" class="sx-tog" data-tog="${m.id}" aria-expanded="${ab}">${icon("chev", 'class="ic sx-chev"')}${icon(m.ic)}${esc(m.t)}</button> ${resumenMod(m, P)}</td>
        ${ACT.map((a) => {
          const n = m.items.filter(
            (it) => (P[it.k] || "").indexOf(a[0]) >= 0,
          ).length;
          return `<td class="c">${dis ? (n ? `<span class="num" style="font-size:12px;color:${n === m.items.length ? "var(--ok)" : "var(--ink-3)"}">${n === m.items.length ? "todas" : n}</span>` : '<span class="dim">·</span>') : chk(n === m.items.length, `data-mall="${m.id}|${a[0]}" data-ind="${n > 0 && n < m.items.length ? 1 : 0}" aria-label="${esc(a[1] + " en todo " + m.t)}"`)}</td>`;
        }).join("")}</tr>
        ${
          ab
            ? m.items
                .map(
                  (it) =>
                    `<tr><td class="sx-scr">${esc(it.t)}${it.prox ? " " + tag("próximamente", "mu") : ""}</td>${ACT.map(
                      (a) => {
                        const on = (P[it.k] || "").indexOf(a[0]) >= 0;
                        return `<td class="c">${dis ? (on ? `<span style="color:var(--ok)" title="${esc(a[1])}">${icon("check", 'style="width:16px;height:16px"')}</span>` : '<span class="dim">·</span>') : chk(on, `data-p="${esc(it.k)}|${a[0]}" aria-label="${esc(a[1] + " · " + it.t)}"`)}</td>`;
                      },
                    ).join("")}</tr>`,
                )
                .join("")
            : ""
        }`;
        })
        .join("")}</tbody></table></div>`;
  }
  function vistaEspeciales(r) {
    const E = ED ? ED.esp : espDe(r.id);
    return ESPECIALES.map((e) =>
      prefRow(
        esc(e.t) + (e.crit ? " " + tag("sensible", "cr") : ""),
        esc(e.d),
        swt(
          E.indexOf(e.k) >= 0,
          `data-esp="${e.k}" aria-label="${esc(e.t)}"`,
          !ED,
        ),
      ),
    ).join("");
  }
  function vistaCampos(r) {
    const C = ED ? ED.cmp : cmpDe(r.id);
    return (
      `<div style="margin-bottom:10px">${nota("Dentro de una misma pantalla, cada campo sensible puede estar oculto, visible o editable. Oculto no es «en blanco»: el dato no sale del servidor.", "eye")}</div>` +
      table({
        cols: [
          {
            t: "Campo",
            fmt: (c) =>
              `<b>${esc(c.t)}</b><span class="sub ui">${esc(c.d)}</span>`,
          },
          {
            t: "Acceso",
            r: true,
            fmt: (c) =>
              ED
                ? seg(
                    "cmp-" + c.k,
                    [
                      { v: "O", t: "Oculto" },
                      { v: "V", t: "Ver" },
                      { v: "E", t: "Editar" },
                    ],
                    C[c.k],
                  )
                : tag(
                    NIV[C[c.k]],
                    C[c.k] === "O" ? "mu" : C[c.k] === "E" ? "wa" : "acc",
                  ),
          },
        ],
        rows: CAMPOS,
      })
    );
  }
  function vistaUsuariosRol(r) {
    const L = usuariosDe(r.id);
    return (
      (L.length
        ? table({
            cols: [
              {
                t: "Usuario",
                fmt: (u) =>
                  `<b>${esc(u.nom)}</b><span class="sub ui">${esc(u.login)}</span>`,
              },
              {
                t: "Otros roles",
                fmt: (u) =>
                  u.roles
                    .filter((x) => x !== r.id)
                    .map((x) => tag(rolById(x).nom, "mu"))
                    .join(" ") || '<span class="dim">—</span>',
              },
              { t: "Locales", fmt: locsTxt },
              {
                t: "",
                r: true,
                fmt: (u) =>
                  u.temporal === r.id
                    ? tag("hasta " + fecha(u.vence), "wa", "clock")
                    : "",
              },
            ],
            rows: L,
          })
        : empty(
            "users",
            "Nadie tiene este rol",
            "Asígnelo desde la ficha de un usuario o con el botón de abajo.",
          )) +
      `<div style="margin-top:12px"><button type="button" class="btn sm" id="rolAsig">${icon("plus")}Asignar a un usuario</button></div>`
    );
  }
  function rolesTab(el) {
    const q = norm(rolQ.trim());
    const lista = ROLES.filter(
      (r) => !q || norm(r.nom + " " + r.desc).indexOf(q) >= 0,
    );
    const r = rolById(rolSel);
    const cambios = cuentaCambios();
    const VISTAS = [
      { v: "pantallas", t: "Pantallas y acciones" },
      { v: "especiales", t: "Acciones especiales" },
      { v: "campos", t: "Campos sensibles" },
      { v: "usuarios", t: "Usuarios (" + usuariosDe(r.id).length + ")" },
    ];
    el.innerHTML = `<div class="split">
      ${card({
        cls: "mlist",
        title: "Roles",
        hint: ROLES.length + "",
        actions: `<button class="btn sm pri" id="rolNuevo" ${ED ? "disabled" : ""}>${icon("plus")}Rol</button>`,
        body: `<div class="tb-search" style="width:100%;margin-bottom:8px">${icon("search")}<input id="rolQ" type="search" value="${esc(rolQ)}" placeholder="Buscar rol" aria-label="Buscar rol"></div>
        <div class="mitems">${lista
          .map(
            (
              x,
            ) => `<button class="mitem" data-rol="${x.id}" aria-selected="${x.id === r.id}" ${ED && x.id !== r.id ? "disabled" : ""}>
          <span style="flex:1;min-width:0"><span class="itd">${esc(x.nom)}</span><span class="itc">${usuariosDe(x.id).length} usuarios · ${x.base ? "de ServeCore" : "de Santa Rosa"}</span></span>
          ${x.total ? tag("total", "cr") : x.pruebas ? tag("pruebas", "mu") : x.inactivo ? tag("inactivo", "mu") : ""}</button>`,
          )
          .join("")}</div>
        <div class="sx-hint" style="margin-top:8px">Los de ServeCore son el punto de partida; los de Santa Rosa se crean duplicando uno y ajustándolo.</div>`,
      })}
      <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
        ${card({
          body: `<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
          <span class="mit" style="width:42px;height:42px">${icon(r.total ? "shield" : "lock")}</span>
          <div style="flex:1;min-width:220px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h3 style="font-size:17px">${esc(r.nom)}</h3>
            ${r.base ? tag("Base de ServeCore", "mu") : tag("Creado por Santa Rosa", "acc")}${r.tfa ? tag("Doble factor obligatorio", "ok", "shield") : ""}${r.total ? tag("Acceso total", "cr", "alert") : ""}</div>
            <div class="mut" style="font-size:13px;margin-top:4px">${esc(r.desc)}</div>
            <div class="sx-hint" style="margin-top:4px">Alcance: ${esc(r.alc)}${r.de ? " · duplicado de «" + esc(r.de) + "»" : ""}${r.por ? " · creado por " + esc(r.por) + " el " + fecha(r.f) : ""}</div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${ED ? "" : `<button class="btn sm" id="rolDup">${icon("copy")}Duplicar</button><button class="btn sm" id="rolDat">Editar datos</button><button class="btn sm pri" id="rolMod">${icon("lock")}Modificar permisos</button>`}</div></div>`,
        })}
        ${card({
          title: "",
          body: `<div style="margin-bottom:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">${seg("rolv", VISTAS, rolVista)}${rolVista === "campos" ? faseTag("Fase 2 · SEG-002") : ""}</div>
          <div id="rolCuerpo">${rolVista === "pantallas" ? vistaPantallas(r) : rolVista === "especiales" ? vistaEspeciales(r) : rolVista === "campos" ? vistaCampos(r) : vistaUsuariosRol(r)}</div>
          ${
            ED
              ? `<div class="sx-edit" role="status">${icon("lock")}<span id="rolN">${cambios ? cambios + (cambios === 1 ? " cambio sin guardar" : " cambios sin guardar") : "Modificando permisos · sin cambios todavía"}</span><div class="gap"></div>
            <button class="btn sm" id="rolDesc">Descartar</button><button class="btn sm pri" id="rolGuar" ${cambios ? "" : "disabled"}>${icon("check")}Guardar cambios</button></div>`
              : ""
          }`,
        })}
      </div></div>`;
    $$("[data-ind='1']", el).forEach((x) => {
      x.indeterminate = true;
    });
  }
  function rolesWire(v) {
    const p = $("#tp-seg-roles", v);
    const r = rolById(rolSel);
    const repintar = () => A.refresh();
    $$("[data-rol]", p).forEach((b) =>
      b.addEventListener("click", () => {
        if (ED) return;
        rolSel = b.dataset.rol;
        A.refresh();
      }),
    );
    const q = $("#rolQ", p);
    q.addEventListener("input", (e) => {
      rolQ = e.target.value;
      const pos = e.target.selectionStart;
      A.refresh();
      const n = $("#rolQ");
      if (n) {
        n.focus();
        n.setSelectionRange(pos, pos);
      }
    });
    onSeg(p, "rolv", (x) => {
      rolVista = x;
      A.refresh();
    });
    const t = (x) => $("#" + x, p);
    if (t("expTodo"))
      t("expTodo").addEventListener("click", () => {
        arbol().forEach((m) => {
          ABIERTOS[m.id] = true;
        });
        repintar();
      });
    if (t("colTodo"))
      t("colTodo").addEventListener("click", () => {
        Object.keys(ABIERTOS).forEach((k) => {
          ABIERTOS[k] = false;
        });
        repintar();
      });
    $$("[data-tog]", p).forEach((b) =>
      b.addEventListener("click", () => {
        ABIERTOS[b.dataset.tog] = !ABIERTOS[b.dataset.tog];
        repintar();
      }),
    );
    if (ED) {
      $$("[data-p]", p).forEach((c) =>
        c.addEventListener("change", () => {
          const [mod, scr, a] = c.dataset.p.split("|"),
            k = mod + "|" + scr;
          let s = ED.perm[k] || "";
          s = c.checked ? (s.indexOf(a) >= 0 ? s : s + a) : s.replace(a, "");
          if (c.checked && a !== "v" && s.indexOf("v") < 0)
            s += "v"; /* quien registra también ve */
          if (!c.checked && a === "v") s = ""; /* sin ver, no hay nada más */
          ED.perm[k] = s;
          repintar();
        }),
      );
      $$("[data-mall]", p).forEach((c) =>
        c.addEventListener("change", () => {
          const [mod, a] = c.dataset.mall.split("|"),
            m = arbol().find((x) => x.id === mod);
          m.items.forEach((it) => {
            let s = ED.perm[it.k] || "";
            if (c.checked) {
              if (s.indexOf(a) < 0) s += a;
              if (a !== "v" && s.indexOf("v") < 0) s += "v";
            } else s = a === "v" ? "" : s.replace(a, "");
            ED.perm[it.k] = s;
          });
          ABIERTOS[mod] = true;
          repintar();
        }),
      );
      $$("[data-esp]", p).forEach((b) =>
        b.addEventListener("click", () => {
          const k = b.dataset.esp,
            i = ED.esp.indexOf(k);
          if (i >= 0) ED.esp.splice(i, 1);
          else ED.esp.push(k);
          repintar();
        }),
      );
      CAMPOS.forEach((c) =>
        onSeg(p, "cmp-" + c.k, (x) => {
          ED.cmp[c.k] = x;
          repintar();
        }),
      );
      t("rolDesc").addEventListener("click", () => {
        ED = null;
        toast(
          "Cambios descartados",
          "Los permisos quedaron como estaban.",
          "in",
        );
        repintar();
      });
      t("rolGuar").addEventListener("click", () => {
        const n = cuentaCambios();
        PERM[rolSel] = ED.perm;
        ESP[rolSel] = ED.esp;
        CMP[rolSel] = ED.cmp;
        ED = null;
        anotar(
          "Modificó permisos del rol",
          r.nom + " · " + n + (n === 1 ? " cambio" : " cambios"),
          "Alta",
          "",
          n + " permisos",
        );
        toast(
          "Permisos guardados",
          n +
            (n === 1 ? " cambio" : " cambios") +
            " en «" +
            r.nom +
            "». Rigen desde la próxima pantalla que abra cada usuario. Gerencia recibe el aviso.",
          "ok",
        );
        repintar();
      });
    } else {
      if (t("rolMod"))
        t("rolMod").addEventListener("click", () => {
          ED = {
            perm: Object.assign({}, permDe(rolSel)),
            esp: espDe(rolSel).slice(),
            cmp: Object.assign({}, cmpDe(rolSel)),
          };
          if (rolVista === "usuarios") rolVista = "pantallas";
          repintar();
        });
      if (t("rolDup"))
        t("rolDup").addEventListener("click", () =>
          ficha({
            title: "Duplicar «" + r.nom + "»",
            sub: "Se copian pantallas, acciones especiales y campos; después se ajusta lo que cambie",
            campos: [
              {
                id: "nom",
                l: "Nombre del rol nuevo",
                v: "Copia de " + r.nom,
                req: true,
              },
              {
                id: "desc",
                l: "Para qué es",
                v: r.desc,
                tipo: "area",
                rows: 2,
              },
              {
                id: "alc",
                l: "Alcance",
                tipo: "select",
                opts: ["Sus locales", "Todos los locales", "CEDI Isabel"],
                v: r.alc,
              },
            ],
            nota: "Así se crean los roles compuestos: por ejemplo, «Administrador de CEDI» salió de duplicar «Bodega» y agregarle traslados.",
            notaIc: "copy",
            ok: "Duplicar",
            guardar(x) {
              const id = "R" + (ROLES.length + 1);
              ROLES.push({
                id,
                nom: x.nom,
                desc: x.desc,
                alc: x.alc,
                de: r.nom,
                por: yo(),
                f: new Date(D.HOY),
                tfa: r.tfa,
              });
              PERM[id] = Object.assign({}, permDe(r.id));
              ESP[id] = espDe(r.id).slice();
              CMP[id] = Object.assign({}, cmpDe(r.id));
              rolSel = id;
              rolVista = "pantallas";
              ED = {
                perm: Object.assign({}, PERM[id]),
                esp: ESP[id].slice(),
                cmp: Object.assign({}, CMP[id]),
              };
              anotar("Duplicó rol", r.nom + " → " + x.nom, "Media");
              const n = Object.values(PERM[id]).reduce(
                (k, s) => k + s.length,
                0,
              );
              return {
                t: "Rol duplicado",
                s:
                  "Se copiaron " +
                  n +
                  " permisos. Ajuste lo que cambie y guarde.",
              };
            },
          }),
        );
      if (t("rolDat"))
        t("rolDat").addEventListener("click", () => {
          const n = usuariosDe(r.id).length;
          ficha({
            title: "Datos del rol",
            sub: r.nom,
            campos: [
              { id: "nom", l: "Nombre", v: r.nom, req: true },
              {
                id: "desc",
                l: "Para qué es",
                v: r.desc,
                tipo: "area",
                rows: 2,
              },
              {
                id: "alc",
                l: "Alcance",
                tipo: "select",
                opts: ["Sus locales", "Todos los locales", "CEDI Isabel"],
                v: r.alc,
                hint: "«Sus locales» toma los locales asignados en la ficha de cada usuario.",
              },
              {
                id: "tfa",
                l: "Doble factor obligatorio",
                tipo: "switch",
                v: !!r.tfa,
              },
            ],
            peligro: {
              t: "Inactivar rol",
              ic: "lock",
              dis: n > 0,
              why: n ? "Tiene " + n + " usuarios: reasígnelos antes." : "",
              fn: () => {
                r.inactivo = true;
                anotar("Inactivó rol", r.nom, "Media");
                return {
                  t: "Rol inactivado",
                  s: "Ya no se puede asignar; su historial queda.",
                };
              },
            },
            guardar(x) {
              const antes = r.nom;
              Object.assign(r, {
                nom: x.nom,
                desc: x.desc,
                alc: x.alc,
                tfa: x.tfa,
              });
              anotar("Modificó rol", antes, "Media", antes, x.nom);
              return { t: "Rol actualizado" };
            },
          });
        });
      if (t("rolNuevo"))
        t("rolNuevo").addEventListener("click", () =>
          ficha({
            title: "Nuevo rol",
            sub: "Conviene partir de uno parecido",
            campos: [
              {
                id: "nom",
                l: "Nombre",
                req: true,
                ph: "Por ejemplo: Encargado de tienda virtual",
              },
              { id: "desc", l: "Para qué es", tipo: "area", rows: 2 },
              {
                id: "base",
                l: "Partir de",
                tipo: "select",
                opts: [{ v: "", t: "En blanco (sin permisos)" }].concat(
                  ROLES.map((x) => ({ v: x.id, t: x.nom })),
                ),
                v: "R4",
              },
              {
                id: "alc",
                l: "Alcance",
                tipo: "select",
                opts: ["Sus locales", "Todos los locales", "CEDI Isabel"],
              },
            ],
            ok: "Crear rol",
            guardar(x) {
              const id = "R" + (ROLES.length + 1);
              ROLES.push({
                id,
                nom: x.nom,
                desc: x.desc || "—",
                alc: x.alc,
                de: x.base ? rolById(x.base).nom : null,
                por: yo(),
                f: new Date(D.HOY),
              });
              if (x.base) {
                PERM[id] = Object.assign({}, permDe(x.base));
                ESP[id] = espDe(x.base).slice();
                CMP[id] = Object.assign({}, cmpDe(x.base));
              } else {
                PERM[id] = {};
                arbol().forEach((m) =>
                  m.items.forEach((it) => {
                    PERM[id][it.k] = "";
                  }),
                );
                ESP[id] = [];
                CMP[id] = cmpDe("R12");
              }
              rolSel = id;
              anotar("Creó rol", x.nom, "Media");
              return {
                t: "Rol creado",
                s: "Use «Modificar permisos» para ajustarlo.",
              };
            },
          }),
        );
    }
    const asg = t("rolAsig");
    if (asg)
      asg.addEventListener("click", () =>
        ficha({
          title: "Asignar «" + r.nom + "»",
          campos: [
            {
              id: "u",
              l: "Usuario",
              tipo: "select",
              opts: USERS.filter(
                (u) => u.estado !== "Inactivado" && u.roles.indexOf(r.id) < 0,
              ).map((u) => ({ v: u.login, t: u.nom })),
            },
          ],
          ok: "Asignar",
          guardar(x) {
            const u = USERS.find((y) => y.login === x.u);
            u.roles.push(r.id);
            anotar("Asignó rol", u.login + " · " + r.nom, "Media");
            return {
              t: "Rol asignado",
              s: u.nom + " tiene ahora " + u.roles.length + " roles.",
            };
          },
        }),
      );
  }

  const SOD = [
    {
      a: "Registrar la venta",
      b: "Cobrarla en caja",
      d: "El vendedor registra y la caja cobra.",
      on: true,
    },
    {
      a: "Registrar la compra",
      b: "Autorizar su pago",
      d: "Proveeduría compra; gerencia autoriza el pago.",
      on: true,
    },
    {
      a: "Autorizar el pago a proveedores",
      b: "Generar el archivo del banco",
      d: "Quien autoriza no arma el lote que sube al Banco Nacional.",
      on: true,
    },
    {
      a: "Calcular la planilla",
      b: "Aprobarla",
      d: "Contabilidad calcula; gerencia aprueba.",
      on: true,
    },
    {
      a: "Pedir una excepción",
      b: "Autorizarla",
      d: "Nadie autoriza su propia excepción de margen, crédito o anulación.",
      on: true,
      lock: true,
    },
    {
      a: "Administrar usuarios y permisos",
      b: "Operar ventas, compras o pagos",
      d: "TI administra el sistema; no opera.",
      on: true,
      lock: true,
    },
    {
      a: "Ajustar inventario",
      b: "Contar ese mismo inventario",
      d: "El conteo lo hace alguien distinto de quien ajusta.",
      on: true,
    },
    {
      a: "Crear un proveedor o cambiar su cuenta bancaria",
      b: "Pagarle",
      d: "Quien da de alta la cuenta del proveedor no arma ni autoriza su pago: es el fraude más común en cuentas por pagar.",
      on: true,
      lock: true,
    },
    {
      a: "Registrar asientos",
      b: "Aprobar el cierre del período",
      d: "Contabilidad registra; el cierre lo aprueba otra persona.",
      on: true,
    },
    {
      a: "Anular una factura o aplicar una nota de crédito",
      b: "Cobrar esa misma venta",
      d: "La caja que cobró no anula ni devuelve su propia venta sin aprobación.",
      on: true,
    },
  ];
  const SOD_EXC = [
    {
      u: "Diego Solano Pérez",
      loc: "Pejibaye",
      regla: "Registrar la venta ↔ Cobrarla en caja",
      por: "Adrián Vindas",
      hasta: "Revisión semanal de cierres",
      mot: "Una sola persona por turno",
    },
    {
      u: "Josué Mora Castillo",
      loc: "Tucurrique",
      regla: "Registrar la venta ↔ Cobrarla en caja",
      por: "Adrián Vindas",
      hasta: "Revisión semanal de cierres",
      mot: "Una sola persona por turno",
    },
    {
      u: "Randall Mata Brenes",
      loc: "Santa Rosa",
      regla: "Registrar la venta ↔ Cobrarla en caja",
      por: "Adrián Vindas",
      hasta: "30 set",
      mot: "Cubre vacaciones en caja",
    },
  ];
  const SUPL = [
    {
      t: "Venta bajo el margen",
      tit: "Administrador del local",
      sup: ["Adrián Vindas", "Katherine Vargas"],
    },
    {
      t: "Pago a proveedores",
      tit: "Adrián Vindas",
      sup: ["Sonia Calderón (solo con aviso)", "Marta Rojas"],
    },
    { t: "Crédito excedido", tit: "Hazel Monge", sup: ["Adrián Vindas"] },
    { t: "Planilla", tit: "Adrián Vindas", sup: ["Katherine Vargas"] },
  ];
  function segregacionTab(el) {
    el.innerHTML = `<div class="wrap">
      ${nota("Quien procesa, quien autoriza y quien paga son personas distintas. Al asignar roles, el sistema revisa estas reglas y no deja guardar una combinación prohibida sin una excepción aprobada por gerencia.", "shield")}
      <div class="grid" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);align-items:start">
        ${card({
          title: "Funciones que no se combinan",
          hint: SOD.filter((x) => x.on).length + " reglas activas",
          actions: `<button class="btn sm" id="sodNueva">${icon("plus")}Regla</button>`,
          body: SOD.map((x, i) =>
            prefRow(
              `${esc(x.a)} <span class="dim">↔</span> ${esc(x.b)}`,
              esc(x.d),
              x.lock
                ? siempre()
                : swt(
                    x.on,
                    `data-sod="${i}" aria-label="${esc(x.a + " y " + x.b)}"`,
                  ),
            ),
          ).join(""),
        })}
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
        ${card({
          title: "Excepciones aprobadas",
          hint: SOD_EXC.length + "",
          body: table({
            cols: [
              {
                t: "Persona",
                fmt: (x) =>
                  `<b>${esc(x.u)}</b><span class="sub ui">${esc(x.loc)} · ${esc(x.mot)}</span>`,
              },
              {
                t: "Aprobó",
                fmt: (x) =>
                  `${esc(nomCorto(x.por))}<span class="sub ui">${esc(x.hasta)}</span>`,
              },
            ],
            rows: SOD_EXC,
          }),
        })}
        ${card({
          title: "Suplentes de quien autoriza",
          hint: "si el titular no está, la solicitud le llega al suplente",
          body: table({
            cols: [
              { t: "Autorización", fmt: (x) => `<b>${esc(x.t)}</b>` },
              { t: "Titular", fmt: (x) => esc(x.tit) },
              {
                t: "Suplentes",
                fmt: (x) => x.sup.map((s) => tag(s, "mu")).join(" "),
              },
            ],
            rows: SUPL,
          }),
        })}
        </div></div></div>`;
  }
  function segregacionWire(v) {
    $$("[data-sod]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const x = SOD[+b.dataset.sod];
        if (x.lock) return toast("Esta regla no se desactiva", "Es un control básico del sistema.", "in");
        if (x.on) {
          /* apagar un control lo decide gerencia, con motivo; queda en la bitácora */
          if (!exige(["Gerencia"], "Desactivar una regla de segregación")) return;
          return ficha({
            title: "Desactivar regla de segregación",
            sub: x.a + " ↔ " + x.b,
            campos: [{ id: "mot", l: "Motivo", tipo: "area", rows: 3, req: true, ph: "Por qué se permite que una misma persona tenga las dos funciones" }],
            nota: "Mientras esté desactivada, el sistema deja de avisar al asignar roles. Contabilidad recibe el aviso.",
            notaIc: "shield",
            ok: "Desactivar",
            guardar(v2) {
              if (v2.mot.length < 10) { toast("Escriba un motivo que se entienda", "Queda en la bitácora.", "cr"); return false; }
              x.on = false;
              anotar("Desactivó regla de segregación", x.a + " ↔ " + x.b + " · motivo: " + v2.mot, "Alta", "Activa", "Desactivada");
              return { t: "Regla desactivada", s: "Contabilidad recibió el aviso.", k: "wa" };
            },
          });
        }
        x.on = true;
        anotar("Activó regla de segregación", x.a + " ↔ " + x.b, "Alta", "Desactivada", "Activa");
        toast("Regla activa", "Se revisa en cada asignación de roles.", "ok");
        A.refresh();
      }),
    );
    const n = $("#sodNueva", v);
    if (n)
      n.addEventListener("click", () =>
        ficha({
          title: "Nueva regla de segregación",
          sub: "Dos funciones que una misma persona no debe tener",
          campos: [
            {
              id: "a",
              l: "Función",
              tipo: "select",
              opts: ESPECIALES.map((e) => e.t).concat([
                "Registrar la venta",
                "Registrar la compra",
                "Ajustar inventario",
              ]),
            },
            {
              id: "b",
              l: "No se combina con",
              tipo: "select",
              opts: ESPECIALES.map((e) => e.t).concat([
                "Cobrarla en caja",
                "Autorizar su pago",
                "Contar ese mismo inventario",
              ]),
            },
            { id: "d", l: "Por qué", tipo: "area", rows: 2 },
          ],
          ok: "Agregar regla",
          guardar(x) {
            SOD.push({ a: x.a, b: x.b, d: x.d || "—", on: true });
            anotar("Creó regla de segregación", x.a + " ↔ " + x.b, "Alta");
            return { t: "Regla agregada", s: "Hoy nadie la incumple." };
          },
        }),
      );
  }
  function matrizTab(el) {
    el.innerHTML = card({
      title: "Acciones especiales por rol",
      hint: "vista de conjunto; se cambia desde cada rol",
      body:
        table({
          cls: "mtx",
          cols: [
            {
              t: "Rol",
              fmt: (r) =>
                `<b>${esc(r.nom)}</b><span class="sub ui">${usuariosDe(r.id).length} usuarios</span>`,
            },
          ].concat(
            ESPECIALES.map((e) => ({
              t: e.t,
              c: true,
              cls: "c",
              fmt: (r) =>
                espDe(r.id).indexOf(e.k) >= 0
                  ? `<span style="color:${e.crit ? "var(--warn)" : "var(--ok)"}">${icon("check", 'style="width:15px;height:15px"')}</span>`
                  : '<span class="dim">·</span>',
            })),
          ),
          rows: ROLES.filter((r) => !r.inactivo),
        }) +
        `<div style="padding:14px 17px;border-top:1px solid var(--hair-2);font-size:12.5px;color:var(--ink-2);line-height:1.6;display:flex;gap:10px">${icon("shield")}
        <span>El cajero cobra pero no registra ni modifica. El vendedor registra pero no cobra. Nadie que factura puede autorizar su propia excepción de margen. En naranja, las acciones sensibles.</span></div>`,
    });
  }
  A.workspace("seg-roles", {
    title: "Roles y permisos",
    tabs: [
      {
        id: "roles",
        t: "Roles",
        sub: "Por pantalla y acción, acciones especiales y campos sensibles; se duplica un rol para crear otro",
        render: rolesTab,
        wire: rolesWire,
      },
      {
        id: "segregacion",
        t: "Segregación de funciones",
        sub: "Quien procesa, quien autoriza y quien paga son personas distintas",
        badge: () => ({
          n: SOD_EXC.length,
          k: "wa",
          l: "excepciones aprobadas",
        }),
        render: segregacionTab,
        wire: segregacionWire,
      },
      {
        id: "matriz",
        t: "Vista de conjunto",
        sub: "Todos los roles contra las acciones especiales",
        render: matrizTab,
      },
    ],
    onArg(tab, dato) {
      if (tab === "roles" && dato) {
        rolSel = dato;
        ED = null;
      }
    },
  });

  /* ── POLÍTICAS DE ACCESO Y SESIÓN (SEG-010, SEG-011, SEG-012) ── */
  const POL = [
    {
      id: "ses",
      t: "Sesión",
      req: "SEG-010",
      ic: "clock",
      items: [
        {
          t: "Expiración por inactividad",
          d: "Pasado este tiempo sin uso, la sesión muere en el servidor y hay que volver a entrar.",
          v: "Caja: al cerrar el turno · Piso y bodega: 60 min · Gerencia, contabilidad y TI: 15 min",
        },
        {
          t: "La sesión nunca viaja en la dirección",
          d: "Ni en la URL ni en un enlace compartido por WhatsApp (hallazgo HAL-01).",
          lock: true,
        },
        {
          t: "Atada al equipo donde se abrió",
          d: "Copiar la dirección y abrirla en otro equipo pide usuario y contraseña.",
          lock: true,
        },
        {
          t: "Cierre real al salir o al cambiar de cajero",
          d: "El acceso muere en el servidor, no solo en la pantalla.",
          lock: true,
        },
        {
          t: "Una sola sesión por usuario en caja",
          d: "Si entra en otra caja, la primera se cierra y queda en la bitácora.",
          on: true,
        },
        {
          t: "Horario de acceso",
          d: "Fuera de este horario solo entran gerencia y TI. Opcional.",
          on: false,
          v: "6:30 a 19:30",
        },
      ],
    },
    {
      id: "clave",
      t: "Contraseñas",
      ic: "lock",
      items: [
        { t: "Longitud mínima", v: "10 caracteres" },
        { t: "Caducidad", v: "Cada 90 días; avisa 7 días antes" },
        { t: "No repetir", v: "Las últimas 5" },
        {
          t: "Bloqueo por intentos fallidos",
          v: "5 intentos · 15 minutos · avisa a TI",
        },
        {
          t: "Nadie asigna ni dicta contraseñas",
          d: "La persona la crea desde el enlace de invitación, válido 24 horas.",
          lock: true,
        },
      ],
    },
    {
      id: "tfa",
      t: "Doble factor",
      ic: "shield",
      items: [
        {
          t: "Obligatorio para",
          v: "Gerencia, Contabilidad, TI, Auditoría, Soporte y todo rol que exporte o autorice",
        },
        {
          t: "Métodos permitidos",
          v: "Aplicación autenticadora · código por correo",
        },
        {
          t: "Recordar el equipo",
          v: "30 días en equipos de la empresa; nunca en equipos personales",
        },
      ],
    },
    {
      id: "most",
      t: "Mostrador compartido",
      ic: "users",
      items: [
        {
          t: "Identificación del vendedor",
          d: "Cada factura queda a nombre de quien vendió sin cambiar de usuario.",
          v: "PIN de 4 a 6 dígitos o tarjeta",
        },
        {
          t: "Usuarios genéricos («Mostrador 1, 2…»)",
          d: "No se permiten: cada persona entra con el suyo.",
          lock: true,
          lockT: "Prohibido",
        },
      ],
    },
    {
      id: "docs",
      t: "Documentos y exportaciones",
      req: "SEG-011",
      ic: "file",
      items: [
        {
          t: "Documentos al cliente sin credenciales",
          d: "Facturas y proformas en PDF llevan un enlace de consulta pública que no abre el sistema (hallazgo HAL-02).",
          lock: true,
        },
        { t: "Vigencia del enlace de consulta", v: "30 días" },
        {
          t: "Exportar a Excel",
          d: "Solo roles con el permiso. Queda en la bitácora con cuántos registros salieron.",
          v: "Más de 5 000 filas pide autorización",
        },
        { t: "Aviso a TI por exportación grande", on: true },
      ],
    },
    {
      id: "datos",
      t: "Protección de los datos",
      req: "SEG-012",
      ic: "server",
      items: [
        {
          t: "Consultas parametrizadas",
          d: "Ningún campo pasa caracteres de control a la base; el buscador no usa comodines (HAL-04).",
          lock: true,
        },
        {
          t: "El navegador nunca ve el modelo de datos",
          d: "Toda la lógica y el acceso a datos viven en el servidor, detrás de una API (HAL-05).",
          lock: true,
        },
        {
          t: "Cifrado en tránsito y en reposo",
          d: "También en el nodo local de cada tienda.",
          lock: true,
        },
        {
          t: "Errores en lenguaje de negocio",
          d: "Ningún error técnico llega a la pantalla (HAL-07).",
          lock: true,
        },
      ],
    },
  ];
  A.screen("seg-politicas", {
    title: "Políticas de acceso y sesión",
    sub: () =>
      "Lo que el sistema exige a todos; lo marcado «Siempre» no se puede apagar",
    render(v) {
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Sesiones compartidas por enlace", "0", { txt: "la sesión no viaja en la dirección" }, "var(--ok)")}
          ${stat("Documentos con credenciales", "0", { txt: "el PDF abre una copia pública" }, "var(--ok)")}
          ${stat("Intentos fallidos hoy", "3", { txt: "dennis.fallas · bloqueado 15 min" }, "var(--warn)")}
          ${stat(
            "Reglas que no se apagan",
            POL.reduce((k, g) => k + g.items.filter((x) => x.lock).length, 0),
            {
              txt:
                "de " +
                POL.reduce((k, g) => k + g.items.length, 0) +
                " políticas",
            },
          )}
        </div>
        <div class="grid g2" style="align-items:start">${POL.map((g) =>
          card({
            title: g.t,
            chip: g.req ? reqTag(g.req) : "",
            body: g.items
              .map((x, i) =>
                prefRow(
                  esc(x.t),
                  x.d ? esc(x.d) : "",
                  x.lock
                    ? siempre(x.lockT)
                    : `<span style="display:flex;gap:10px;align-items:center">${x.v ? `<span class="sx-val">${esc(x.v)}</span><button class="btn sm" data-pol="${g.id}|${i}">Cambiar</button>` : ""}${x.on != null ? swt(x.on, `data-polsw="${g.id}|${i}" aria-label="${esc(x.t)}"`) : ""}</span>`,
                ),
              )
              .join(""),
          }),
        ).join("")}</div></div>`;
    },
    wire(v) {
      const it = (s) => {
        const [g, i] = s.split("|");
        return POL.find((x) => x.id === g).items[+i];
      };
      $$("[data-pol]", v).forEach((b) =>
        b.addEventListener("click", () => {
          const x = it(b.dataset.pol);
          cambiarValor({
            title: x.t,
            v: x.v,
            sev: "Alta",
            set: (nv) => {
              x.v = nv;
            },
          });
        }),
      );
      $$("[data-polsw]", v).forEach((b) =>
        b.addEventListener("click", () => {
          const x = it(b.dataset.polsw);
          x.on = !x.on;
          anotar(
            (x.on ? "Activó" : "Desactivó") + " política",
            x.t,
            "Alta",
            x.on ? "No" : "Sí",
            x.on ? "Sí" : "No",
          );
          toast(
            x.t + (x.on ? ": activa" : ": inactiva"),
            "Queda en la bitácora; gerencia recibe el aviso.",
            x.on ? "ok" : "wa",
          );
          A.refresh();
        }),
      );
    },
  });

  /* ── AUTORIZACIÓN JERÁRQUICA DE EXCEPCIONES (SEG-005, SEG-009) ── */
  const EXC = [
    {
      id: "EX-2291",
      tipo: "Venta bajo el margen",
      ic: "wallet",
      doc: "Factura en curso · Caja 3 · Santa Rosa",
      pide: "Randall Mata",
      loc: "L1",
      det: "Pintura látex blanco × 18 · la utilidad queda en 12,4 % (mínimo de la familia 18 %)",
      min: 6,
      pueden: ["Marta Rojas", "Adrián Vindas"],
      canal: "WhatsApp y en el sistema",
      mot: "La Municipalidad pide igualar la cotización de la competencia",
      vence: "al cierre del día, si la factura no se aplica",
    },
    {
      id: "EX-2290",
      tipo: "Crédito excedido",
      ic: "card",
      doc: "Proforma PRO-003-2026-00412",
      pide: "Jonathan Ureña",
      loc: "L2",
      det: "Desarrollos Reventazón S.A. · límite ₡12 000 000; con esta factura quedaría en ₡12 840 000",
      min: 14,
      pueden: ["Hazel Monge", "Adrián Vindas"],
      canal: "Correo y en el sistema",
      mot: "Anuncian un pago de ₡3 000 000 el viernes",
      vence: "en 2 horas",
    },
    {
      id: "EX-2289",
      tipo: "Anulación de documento",
      ic: "x",
      doc: "Tiquete 003-00002-04-0000012391",
      pide: "Dennis Fallas",
      loc: "L2",
      det: "Tiquete de ₡18 450 emitido hoy a las 09:12",
      min: 22,
      pueden: ["Katherine Vargas", "Marta Rojas"],
      canal: "En el sistema",
      mot: "Error en datos del cliente: pidió factura a nombre de la empresa",
      sug: "Una nota de crédito y una factura nueva lo corrigen sin anular.",
    },
    {
      id: "EX-2288",
      tipo: "Costo fuera de rango",
      ic: "alert",
      doc: "Compra CO-2026-018220 · Amanco",
      pide: "Álvaro Cordero",
      loc: "CD",
      det: 'Tubo PVC ½" SDR 17: costo ₡41 contra ₡4 100 de la compra anterior (−99 %)',
      min: 35,
      pueden: ["Óscar Jiménez"],
      canal: "Correo y en el sistema",
      mot: "—",
      sug: "Parece un error de digitación: el sistema bloqueó la aplicación de la compra.",
    },
    {
      id: "EX-2287",
      tipo: "Plazo atípico en la compra",
      ic: "calc",
      doc: "OC-2026-004431 · Holcim",
      pide: "Álvaro Cordero",
      loc: "CD",
      det: "120 días en lugar de los 45 de la negociación vigente",
      min: 50,
      pueden: ["Óscar Jiménez", "Adrián Vindas"],
      canal: "Correo",
      mot: "Temporada alta: el proveedor ofrece 120 días por volumen",
    },
  ];
  const HEX = [
    {
      id: "EX-2286",
      f: hace(0, 9, 14),
      tipo: "Venta bajo el margen",
      doc: "003-00001-01-0000018851",
      pide: "Marta Rojas",
      res: "Aprobada",
      por: "Adrián Vindas",
      canal: "WhatsApp",
      resp: 4,
      mot: "Cierre de obra; se recupera con el volumen",
    },
    {
      id: "EX-2284",
      f: hace(1, 16, 40),
      tipo: "Venta bajo el margen",
      doc: "002-00001-01-0000035188",
      pide: "Kevin Solano",
      res: "Aprobada",
      por: "Marta Rojas",
      canal: "En el sistema",
      resp: 2,
      mot: "Proyecto de 40 casas; precio negociado",
    },
    {
      id: "EX-2283",
      f: hace(1, 11, 20),
      tipo: "Cambio de límite de crédito",
      doc: "Desarrollos Reventazón S.A.",
      pide: "Hazel Monge",
      res: "Aprobada",
      por: "Adrián Vindas",
      canal: "Correo",
      resp: 38,
      mot: "₡8 000 000 → ₡12 000 000 por contrato de obra",
    },
    {
      id: "EX-2280",
      f: hace(2, 11, 5),
      tipo: "Venta bajo el margen",
      doc: "Proforma PRO-004-2026-00187",
      pide: "Sofía Camacho",
      res: "Rechazada",
      por: "Adrián Vindas",
      canal: "WhatsApp",
      resp: 11,
      mot: "El precio de la competencia no incluye flete",
    },
    {
      id: "EX-2277",
      f: hace(3, 8, 44),
      tipo: "Anulación de documento",
      doc: "TE 005-00001-04-0000004410",
      pide: "Esteban Vindas",
      res: "Aprobada",
      por: "Sofía Camacho",
      canal: "En el sistema",
      resp: 6,
      mot: "Cobro duplicado en el datáfono",
    },
    {
      id: "EX-2275",
      f: hace(4, 17, 48),
      tipo: "Venta bajo el margen",
      doc: "Factura no aplicada",
      pide: "Yeimy Picado",
      res: "Vencida sin usar",
      por: "Sistema · barrido 22:00",
      canal: "—",
      resp: null,
      mot: "La factura no se aplicó; la autorización se cerró sola",
    },
    {
      id: "EX-2271",
      f: hace(6, 10, 3),
      tipo: "Costo fuera de rango",
      doc: "CO-2026-018102 · Durman",
      pide: "Álvaro Cordero",
      res: "Aprobada",
      por: "Óscar Jiménez",
      canal: "Correo",
      resp: 25,
      mot: "Aumento de lista del proveedor, +17 %",
    },
  ];
  const REGLAS = [
    {
      t: "Venta bajo el margen mínimo",
      cuando: "La utilidad de una línea queda bajo el mínimo de su familia",
      n1: "Administrador del local · hasta 5 puntos bajo el mínimo",
      n2: "Gerencia · más de 5 puntos",
      canal: "WhatsApp y en el sistema",
      vence:
        "Un solo uso: esa factura y ese cliente; se cierra sola a las 22:00",
    },
    {
      t: "Venta bajo el costo",
      cuando: "El precio queda bajo el costo promedio",
      n1: "Gerencia",
      n2: "—",
      canal: "WhatsApp y correo",
      vence: "Un solo uso; se cierra sola a las 22:00",
    },
    {
      t: "Crédito excedido",
      cuando: "La factura pasa el límite o el cliente tiene facturas vencidas",
      n1: "Crédito y cobro · hasta ₡1 000 000 sobre el límite",
      n2: "Gerencia · más de eso",
      canal: "Correo y en el sistema",
      vence: "2 horas",
    },
    {
      t: "Cambio de límite de crédito",
      cuando: "Siempre",
      n1: "Gerencia",
      n2: "—",
      canal: "Correo",
      vence: "—",
      aviso: "Gerencia recibe aviso de cada cambio",
    },
    {
      t: "Anulación de documento",
      req: "SEG-009",
      cuando: "Documento aplicado que se quiere anular",
      n1: "Administrador del local · el mismo día",
      n2: "Contabilidad · días anteriores",
      canal: "En el sistema",
      vence: "Hasta el cierre del día",
      aviso:
        "Motivo del catálogo y detalle obligatorio; sugiere nota de crédito",
    },
    {
      t: "Costo fuera de rango en la compra",
      cuando: "El costo varía más de ±15 % contra la compra anterior",
      n1: "Jefe de proveeduría · hasta ±30 %",
      n2: "Gerencia · más de ±30 %",
      canal: "Correo y en el sistema",
      vence: "La compra no se aplica mientras tanto",
    },
    {
      t: "Plazo atípico en la compra",
      cuando: "El término difiere de la negociación vigente",
      n1: "Jefe de proveeduría",
      n2: "Gerencia · más de 90 días",
      canal: "Correo",
      vence: "—",
    },
    {
      t: "Devolución de dinero",
      cuando: "Reintegro en efectivo mayor a ₡100 000",
      n1: "Administrador del local",
      n2: "—",
      canal: "En el sistema",
      vence: "Hasta el cierre de caja",
    },
    {
      t: "Ajuste de inventario",
      cuando: "Ajuste mayor a ₡250 000 al costo",
      n1: "Gerencia",
      n2: "—",
      canal: "Correo",
      vence: "—",
      aviso: "Contabilidad recibe copia",
    },
  ];
  function pendientesTab(el) {
    el.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Esperando respuesta", EXC.length, { txt: "la más vieja hace " + Math.max.apply(null, EXC.map((x) => x.min).concat([0])) + " min" }, EXC.length ? "var(--warn)" : "var(--ok)")}
        ${stat("Tiempo de respuesta", "9 min", { txt: "promedio de los últimos 30 días" })}
        ${stat("Aprobadas", "84 %", { txt: "del mes; el resto rechazadas o vencidas" })}
        ${stat("Sin autor", "0", { txt: "cada aprobación dice quién y por qué" }, "var(--ok)")}
      </div>
      ${nota("Al marcar una excepción, la caja muestra <b>quién puede autorizarla</b> y le avisa por el canal configurado. Quien autoriza responde desde el correo, el WhatsApp o el sistema; la respuesta queda aquí con su nombre. Nadie autoriza su propia excepción.", "scale")}
      ${card({
        title: "Solicitudes pendientes",
        hint: "vista de TI: puede recordarlas, no aprobarlas",
        body: EXC.length
          ? table({
              cols: [
                {
                  t: "Excepción",
                  fmt: (x) =>
                    `<b>${esc(x.tipo)}</b><span class="sub ui">${esc(x.id)} · ${esc(x.doc)}</span>`,
                },
                {
                  t: "Pide",
                  fmt: (x) =>
                    `${esc(x.pide)}<span class="sub ui">${esc(locNom(x.loc))} · hace ${x.min} min</span>`,
                },
                {
                  t: "Detalle",
                  fmt: (x) =>
                    `<span style="font-size:12.5px">${esc(x.det)}</span>${x.sug ? `<span class="sub ui" style="color:var(--accent)">${esc(x.sug)}</span>` : ""}`,
                },
                {
                  t: "Puede autorizar",
                  fmt: (x) =>
                    x.pueden.map((p) => tag(p, "mu")).join(" ") +
                    `<span class="sub ui">${esc(x.canal)}</span>`,
                },
                {
                  t: "",
                  r: true,
                  fmt: (x) =>
                    `<div style="display:flex;gap:6px;justify-content:flex-end"><button class="btn sm" data-exrec="${x.id}">${icon("bell")}Recordar</button><button class="btn sm pri" data-exver="${x.id}">Ver como autorizador</button></div>`,
                },
              ],
              rows: EXC,
            })
          : empty(
              "check",
              "Nada pendiente",
              "Todas las excepciones del día tienen respuesta.",
            ),
      })}</div>`;
  }
  function pendientesWire(v) {
    $$("[data-exrec]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const x = EXC.find((e) => e.id === b.dataset.exrec);
        toast(
          "Recordatorio enviado",
          "A " + x.pueden.join(" y ") + " por " + x.canal.toLowerCase() + ".",
          "ok",
        );
      }),
    );
    $$("[data-exver]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const x = EXC.find((e) => e.id === b.dataset.exver),
          quien = x.pueden[x.pueden.length - 1];
        openSheet({
          title: x.tipo,
          sub: "Así le llega a " + quien + " · " + x.canal.toLowerCase(),
          body: `<div class="sx-form">
          <div class="sx-msg"><b>ServeCore · ${esc(x.id)}</b><br>${esc(x.pide)} (${esc(locNom(x.loc))}) pide autorizar: <b>${esc(x.tipo.toLowerCase())}</b>.<br>${esc(x.det)}.<br>Motivo: «${esc(x.mot)}».<br><span class="mut">Responda desde aquí o desde el sistema. El enlace no abre sesión: pide su usuario.</span></div>
          <dl class="kv"><dt>Documento</dt><dd>${esc(x.doc)}</dd><dt>Vence</dt><dd>${esc(x.vence || "—")}</dd><dt>También pueden</dt><dd>${esc(x.pueden.filter((p) => p !== quien).join(", ") || "—")}</dd></dl>
          ${x.sug ? nota(esc(x.sug), "info") : ""}
          <div class="field"><label for="exMot">Comentario de quien autoriza *</label><textarea id="exMot" rows="2" placeholder="Queda en la bitácora junto con su nombre"></textarea></div></div>`,
          footer: `<button class="btn" data-cerrar>Cerrar</button><div class="gap"></div><button class="btn" id="exNo">${icon("x")}Rechazar</button><button class="btn pri" id="exSi">${icon("check")}Aprobar</button>`,
          after(el) {
            cerrar(el);
            const resolver = (ok) => {
              const m = $("#exMot", el).value.trim();
              if (m.length < 5) {
                toast(
                  "Escriba un comentario",
                  "Quien lea la bitácora necesita saber por qué.",
                  "cr",
                );
                $("#exMot", el).focus();
                return;
              }
              EXC.splice(EXC.indexOf(x), 1);
              HEX.unshift({
                id: x.id,
                f: new Date(D.HOY),
                tipo: x.tipo,
                doc: x.doc,
                pide: x.pide,
                res: ok ? "Aprobada" : "Rechazada",
                por: quien,
                canal: x.canal.split(" ")[0],
                resp: x.min,
                mot: m,
              });
              D.bitacora.unshift({
                id: "BTX" + Date.now(),
                fecha: new Date(D.HOY),
                usuario: quien,
                rol: quien === "Adrián Vindas" ? "Gerencia" : "Autorizador",
                locId: x.loc,
                accion: (ok ? "Autorizó " : "Rechazó ") + x.tipo.toLowerCase(),
                detalle: x.doc + " · pidió " + x.pide + " · " + m,
                sev: "Alta",
                antes: "Pendiente",
                despues: ok ? "Aprobada" : "Rechazada",
                ip: "correo",
                autorizo: quien,
              });
              closeSheet();
              toast(
                ok ? "Aprobada por " + quien : "Rechazada por " + quien,
                x.pide +
                  " lo ve en la caja al instante. Queda en la bitácora con el comentario.",
                ok ? "ok" : "wa",
              );
              A.refresh();
            };
            $("#exSi", el).addEventListener("click", () => resolver(true));
            $("#exNo", el).addEventListener("click", () => resolver(false));
          },
        });
      }),
    );
  }
  function reglasTab(el) {
    el.innerHTML = `<div class="wrap">${card({
      title: "Quién autoriza qué",
      hint: "si el titular no está, le llega al suplente",
      actions: `<button class="btn sm" data-ir="seg-roles|segregacion">${icon("users")}Suplentes</button>`,
      body: table({
        cols: [
          {
            t: "Excepción",
            fmt: (r) =>
              `<b>${esc(r.t)}</b>${r.req ? reqTag(r.req) : ""}<span class="sub ui">${esc(r.cuando)}</span>`,
          },
          { t: "Primer nivel", fmt: (r) => esc(r.n1) },
          {
            t: "Segundo nivel",
            fmt: (r) =>
              r.n2 === "—" ? '<span class="dim">—</span>' : esc(r.n2),
          },
          { t: "Aviso por", fmt: (r) => esc(r.canal) },
          {
            t: "Vigencia",
            fmt: (r) =>
              `<span class="mut" style="font-size:12.5px">${esc(r.vence)}</span>${r.aviso ? `<span class="sub ui">${esc(r.aviso)}</span>` : ""}`,
          },
          {
            t: "",
            r: true,
            fmt: (r, i) =>
              `<button class="btn sm" data-regla="${i}">Editar</button>`,
          },
        ],
        rows: REGLAS,
      }),
    })}
      ${nota("Toda autorización queda ligada a un documento y a un cliente, y vence. Si la factura nunca se aplica, el barrido de las 22:00 la cierra y avisa al administrador: no queda una casilla abierta para el siguiente cliente.", "lock")}</div>`;
  }
  function reglasWire(v) {
    A.wireIr(v);
    $$("[data-regla]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const r = REGLAS[+b.dataset.regla];
        ficha({
          title: r.t,
          sub: "Quién autoriza, por qué canal y cuánto dura",
          campos: [
            {
              id: "cuando",
              l: "Cuándo se pide",
              v: r.cuando,
              tipo: "area",
              rows: 2,
            },
            { id: "n1", l: "Primer nivel", v: r.n1 },
            { id: "n2", l: "Segundo nivel", v: r.n2 },
            {
              id: "canal",
              l: "Aviso por",
              tipo: "chips",
              opts: ["En el sistema", "Correo", "WhatsApp"],
              v: ["En el sistema", "Correo", "WhatsApp"].filter(
                (c) =>
                  r.canal.indexOf(c) >= 0 ||
                  (c === "En el sistema" && /sistema/.test(r.canal)),
              ),
            },
            { id: "vence", l: "Vigencia", v: r.vence },
            {
              id: "mot",
              l: "Motivo obligatorio al pedir",
              tipo: "switch",
              v: true,
              hint: "Con un mínimo de 15 caracteres: un punto no es un motivo.",
            },
          ],
          guardar(x) {
            Object.assign(r, {
              cuando: x.cuando,
              n1: x.n1,
              n2: x.n2 || "—",
              canal: x.canal.join(" y ") || "En el sistema",
              vence: x.vence,
            });
            anotar("Modificó regla de autorización", r.t, "Alta");
            return {
              t: "Regla actualizada",
              s: "Rige desde la próxima solicitud.",
            };
          },
        });
      }),
    );
  }
  function historialExTab(el) {
    el.innerHTML = card({
      title: "Autorizaciones resueltas",
      hint: "quién pidió, quién autorizó, por qué canal y en cuánto tiempo",
      body: table({
        cols: [
          { t: "Fecha", cls: "mono", fmt: (x) => fh(x.f) },
          {
            t: "Excepción",
            fmt: (x) =>
              `<b>${esc(x.tipo)}</b><span class="sub ui">${esc(x.id)} · ${esc(x.doc)}</span>`,
          },
          { t: "Pidió", fmt: (x) => esc(x.pide) },
          {
            t: "Resultado",
            fmt: (x) =>
              tag(
                x.res,
                x.res === "Aprobada"
                  ? "ok"
                  : x.res === "Rechazada"
                    ? "cr"
                    : "mu",
              ),
          },
          {
            t: "Autorizó",
            fmt: (x) =>
              `<b>${esc(x.por)}</b><span class="sub ui">${esc(x.canal)}</span>`,
          },
          {
            t: "Respuesta",
            r: true,
            cls: "mono",
            fmt: (x) =>
              x.resp == null ? '<span class="dim">—</span>' : x.resp + " min",
          },
          {
            t: "Comentario",
            fmt: (x) =>
              `<span class="mut" style="font-size:12.5px">${esc(x.mot)}</span>`,
          },
        ],
        rows: HEX,
      }),
    });
  }
  A.workspace("seg-autorizaciones", {
    title: "Autorización de excepciones",
    tabs: [
      {
        id: "pendientes",
        t: "Pendientes",
        sub: "Lo que espera respuesta y a quién se le avisó",
        badge: () => ({
          n: EXC.length,
          k: "wa",
          l: EXC.length + " pendientes",
        }),
        render: pendientesTab,
        wire: pendientesWire,
      },
      {
        id: "reglas",
        t: "Quién autoriza qué",
        sub: "Niveles, montos, canal de aviso y vigencia de cada excepción",
        render: reglasTab,
        wire: reglasWire,
      },
      {
        id: "historial",
        t: "Historial",
        sub: "Cada excepción con quien la pidió y quien la autorizó",
        render: historialExTab,
      },
    ],
  });

  /* ── BITÁCORA E INACTIVACIÓN (SEG-004, SEG-007) ── */
  const SISEV = [
    {
      id: "BS1",
      fecha: hace(1, 22, 0),
      usuario: "Sistema",
      rol: "Proceso automático",
      locId: "L1",
      accion: "Cerró autorización sin usar",
      detalle: "Barrido de las 22:00 · la factura no se aplicó",
      sev: "Media",
      antes: "Abierta",
      despues: "Cerrada",
      ip: "servidor",
    },
    {
      id: "BS2",
      fecha: hace(0, 5, 0),
      usuario: "Sistema",
      rol: "Proceso automático",
      locId: "CD",
      accion: "Revisó el catálogo CABYS",
      detalle: "Sin cambios publicados por Hacienda",
      sev: "Baja",
      antes: "",
      despues: "",
      ip: "servidor",
    },
    {
      id: "BS3",
      fecha: hace(0, 8, 0),
      usuario: "Sistema",
      rol: "Proceso automático",
      locId: "L1",
      accion: "Actualizó el tipo de cambio",
      detalle: "BCCR · venta",
      sev: "Baja",
      antes: "₡508,90",
      despues: "₡509,40",
      ip: "servidor",
    },
  ];
  const autorizoDe = (b) => b.autorizo || "";
  let btF = "Todas",
    btQ = "";
  function bitacoraTab(el) {
    const q = norm(btQ.trim());
    const todo = D.bitacora.concat(SISEV).sort((a, b) => b.fecha - a.fecha);
    const rows = todo.filter(
      (b) =>
        (btF === "Todas" || b.sev === btF) &&
        (!q ||
          norm(b.usuario + " " + b.accion + " " + b.detalle).indexOf(q) >= 0),
    );
    el.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Eventos registrados", grp(todo.length), { txt: "en la ventana visible de la demostración" })}
        ${stat("De severidad alta", todo.filter((b) => b.sev === "Alta").length, { txt: "autorizaciones, anulaciones, exportaciones y permisos" }, "var(--crit)")}
        ${stat("Sin autor", "0", { txt: "los procesos automáticos firman como «Sistema»" }, "var(--ok)")}
        ${stat("Retención", "5 años", { txt: "lo que exige la auditoría externa" })}
      </div>
      ${card({
        title: "Registro de actividad",
        hint: "clic en una fila para ver el detalle",
        actions: `<button class="btn sm">${icon("download")}Exportar para auditoría</button>`,
        body:
          `<div class="sx-bar" style="margin-bottom:12px"><div class="tb-search">${icon("search")}<input id="btQ" type="search" value="${esc(btQ)}" placeholder="Usuario, acción o documento" aria-label="Buscar en la bitácora"></div>${seg("btf", ["Todas", "Alta", "Media", "Baja"], btF)}</div>` +
          table({
            h: "calc(100dvh - 500px)",
            onRow: true,
            cols: [
              { t: "Fecha y hora", cls: "mono", fmt: (r) => fh(r.fecha) },
              {
                t: "Usuario",
                fmt: (r) =>
                  `<b>${esc(r.usuario)}</b><span class="sub ui">${esc(r.rol)}</span>`,
              },
              { t: "Local", fmt: (r) => esc(locNom(r.locId)) },
              {
                t: "Acción",
                fmt: (r) =>
                  `${esc(r.accion)}<span class="sub ui">${esc(r.detalle)}</span>`,
              },
              {
                t: "Antes",
                cls: "mono",
                fmt: (r) =>
                  r.antes ? esc(r.antes) : '<span class="dim">—</span>',
              },
              {
                t: "Después",
                cls: "mono",
                fmt: (r) =>
                  r.despues
                    ? `<b>${esc(r.despues)}</b>`
                    : '<span class="dim">—</span>',
              },
              {
                t: "Autorizó",
                fmt: (r) =>
                  autorizoDe(r)
                    ? esc(autorizoDe(r))
                    : '<span class="dim">—</span>',
              },
              {
                t: "Sev.",
                fmt: (r) =>
                  tag(
                    r.sev,
                    r.sev === "Alta" ? "cr" : r.sev === "Media" ? "wa" : "mu",
                  ),
              },
            ],
            rows,
            rowCls: (r) => (r.sev === "Alta" ? "cr" : ""),
          }),
      })}</div>`;
    el._rows = rows;
  }
  function bitacoraWire(v) {
    const p = $("#tp-historial", v);
    onSeg(p, "btf", (x) => {
      btF = x;
      A.refresh();
    });
    $("#btQ", p).addEventListener("change", (e) => {
      btQ = e.target.value;
      A.refresh();
    });
    $("#btQ", p).addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        btQ = e.target.value;
        A.refresh();
      }
    });
    $$("tr.clickable", p).forEach((tr) =>
      tr.addEventListener("click", () => {
        const r = p._rows[+tr.dataset.i];
        if (!r) return;
        openSheet({
          title: r.accion,
          sub: fh(r.fecha) + " · " + r.usuario,
          body: `<div class="sx-form"><dl class="kv">
          <dt>Usuario</dt><dd>${esc(r.usuario)} · ${esc(r.rol)}</dd>
          <dt>Local</dt><dd>${esc(locNom(r.locId))}</dd>
          <dt>Detalle</dt><dd>${esc(r.detalle)}</dd>
          <dt>Valor anterior</dt><dd class="num">${esc(r.antes || "—")}</dd>
          <dt>Valor nuevo</dt><dd class="num">${esc(r.despues || "—")}</dd>
          <dt>Autorizó</dt><dd>${esc(autorizoDe(r) || "No requería autorización")}</dd>
          <dt>Origen</dt><dd class="num">${esc(r.ip)}</dd>
          <dt>Proceso</dt><dd>${r.usuario === "Sistema" ? "Automático, identificado como tal" : "Hecho por una persona desde la pantalla"}</dd></dl>
          ${nota("El registro no se puede editar ni borrar, tampoco desde TI. Se conserva cinco años.", "lock")}</div>`,
          footer: `<div class="gap"></div><button class="btn" data-cerrar>Cerrar</button>`,
          after: (el) => cerrar(el),
        });
      }),
    );
  }
  const INACT = [
    {
      tipo: "Artículo",
      reg: 'FER-00412 Tubo galvanizado 1"',
      f: hace(3),
      por: "Óscar Jiménez",
      mot: "Descontinuado por el proveedor",
      ref: "Sigue en 214 facturas y en el kardex",
    },
    {
      tipo: "Cliente",
      reg: "Constructora Los Ángeles S.A.",
      f: hace(12),
      por: "Hazel Monge",
      mot: "Cerró operaciones",
      ref: "Saldo ₡0 · 38 facturas históricas",
    },
    {
      tipo: "Proveedor",
      reg: "Distribuidora El Roble",
      f: hace(40),
      por: "Óscar Jiménez",
      mot: "Sin compras en 18 meses",
      ref: "Sus 61 compras siguen en los reportes",
    },
    {
      tipo: "Usuario",
      reg: "esteban.quiros · Esteban Quirós Mena",
      f: hace(51),
      por: "Andrey Ramírez",
      mot: "Salió de la empresa",
      ref: "Su nombre sigue en la bitácora y en sus facturas",
    },
    {
      tipo: "Usuario",
      reg: "mostrador.turrialba",
      f: hace(21),
      por: "Andrey Ramírez",
      mot: "Reemplazado por el PIN de cada vendedor",
      ref: "",
    },
    {
      tipo: "Local",
      reg: "Bodega del local 2 (antigua)",
      f: hace(400),
      por: "Andrey Ramírez",
      mot: "No funcionó como bodega separada",
      ref: "Antes se le anteponía «ZZZ» al nombre; ahora simplemente está inactiva",
    },
    {
      tipo: "Término de pago",
      reg: "Crédito 120 días (clientes)",
      f: hace(90),
      por: "Sonia Calderón",
      mot: "Ya no se otorga a clientes",
      ref: "Los proveedores que lo tienen lo conservan",
    },
  ];
  let inTipo = "Todos";
  function inactivadosTab(el) {
    const tipos = ["Todos"].concat(
      INACT.map((x) => x.tipo).filter((t, i, a) => a.indexOf(t) === i),
    );
    const rows = INACT.filter((x) => inTipo === "Todos" || x.tipo === inTipo);
    el.innerHTML = `<div class="wrap">
      ${nota("Nada se elimina: artículos, clientes, proveedores, usuarios, locales y términos se <b>inactivan</b>. Dejan de aparecer para registrar, pero siguen en los documentos, los reportes y la bitácora con su nombre. Sin trucos como «ZZZ» al inicio del nombre.", "history")}
      ${card({
        title: "Registros inactivados",
        hint: rows.length + "",
        actions: seg("int", tipos, inTipo),
        body: table({
          cols: [
            { t: "Tipo", fmt: (x) => tag(x.tipo, "mu") },
            {
              t: "Registro",
              fmt: (x) =>
                `<b>${esc(x.reg)}</b>${x.ref ? `<span class="sub ui">${esc(x.ref)}</span>` : ""}`,
            },
            { t: "Motivo", fmt: (x) => esc(x.mot) },
            {
              t: "Inactivó",
              fmt: (x) =>
                `${esc(x.por)}<span class="sub ui">${fecha(x.f)}</span>`,
            },
            {
              t: "",
              r: true,
              fmt: (x) =>
                `<button class="btn sm" data-react="${INACT.indexOf(x)}">Reactivar</button>`,
            },
          ],
          rows,
        }),
      })}</div>`;
  }
  function inactivadosWire(v) {
    onSeg(v, "int", (x) => {
      inTipo = x;
      A.refresh();
    });
    $$("[data-react]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const x = INACT[+b.dataset.react];
        ficha({
          title: "Reactivar " + x.tipo.toLowerCase(),
          sub: x.reg,
          campos: [{ id: "m", l: "Motivo", tipo: "area", rows: 2, req: true }],
          ok: "Reactivar",
          guardar(m) {
            INACT.splice(INACT.indexOf(x), 1);
            anotar(
              "Reactivó " + x.tipo.toLowerCase(),
              x.reg + " · " + m.m,
              "Media",
              "Inactivo",
              "Activo",
            );
            return {
              t: "Reactivado",
              s: x.reg + " vuelve a estar disponible.",
            };
          },
        });
      }),
    );
  }
  const NIVEL = [
    {
      t: "Ingreso y salida del sistema",
      d: "Usuario, equipo, origen y hora; también los intentos fallidos.",
      lock: true,
    },
    {
      t: "Cambios en registros",
      d: "Qué campo, valor anterior y valor nuevo, y quién.",
      lock: true,
    },
    {
      t: "Anulaciones y autorizaciones",
      d: "Quién pidió, quién autorizó y el motivo.",
      lock: true,
    },
    {
      t: "Cambios de usuarios, roles y permisos",
      d: "Con quién lo pidió.",
      lock: true,
    },
    {
      t: "Entrada a cada módulo",
      d: "Qué módulos usa cada persona durante el día.",
      on: true,
      vol: "≈ 9 000 eventos al día",
    },
    {
      t: "Exportaciones e impresiones",
      d: "Qué se exportó y cuántos registros salieron.",
      on: true,
      vol: "≈ 400 al día",
    },
    {
      t: "Consultas de reportes",
      d: "Qué reporte y con qué rango de fechas.",
      on: true,
      vol: "≈ 1 200 al día",
    },
    {
      t: "Cada clic",
      d: "No se recomienda: mucho volumen y poco valor para auditoría.",
      on: false,
      vol: "≈ 2 millones al día",
    },
  ];
  function registroTab(el) {
    el.innerHTML = `<div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);align-items:start">
      ${card({
        title: "Qué se registra",
        hint: "el detalle es configurable, lo esencial no",
        body: NIVEL.map((x, i) =>
          prefRow(
            esc(x.t),
            esc(x.d) +
              (x.vol ? ` <span class="dim">· ${esc(x.vol)}</span>` : ""),
            x.lock
              ? siempre()
              : swt(x.on, `data-niv="${i}" aria-label="${esc(x.t)}"`),
          ),
        ).join(""),
      })}
      ${card({
        title: "Conservación",
        body: `<dl class="kv">
          <dt>Retención</dt><dd>5 años, igual que el archivo fiscal</dd>
          <dt>Dónde</dt><dd>Separada de la base de operación, solo de escritura</dd>
          <dt>Quién la lee</dt><dd>TI, gerencia y auditoría</dd>
          <dt>Quién la borra</dt><dd>Nadie</dd>
          <dt>Tamaño estimado</dt><dd class="num">≈ 18 GB por año</dd></dl>
          <div style="margin-top:12px">${nota("En el sistema actual la bitácora registra el ingreso pero no qué se hizo después, y a veces el cambio aparece sin usuario. Aquí ningún evento queda sin autor.", "info")}</div>`,
      })}
    </div>`;
  }
  function registroWire(v) {
    $$("[data-niv]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const x = NIVEL[+b.dataset.niv];
        x.on = !x.on;
        anotar(
          (x.on ? "Activó" : "Desactivó") + " registro en bitácora",
          x.t,
          "Alta",
        );
        toast(
          x.t + (x.on ? ": se registra" : ": ya no se registra"),
          "El cambio también queda en la bitácora.",
          x.on ? "ok" : "wa",
        );
        A.refresh();
      }),
    );
  }
  A.workspace("historial", {
    title: "Bitácora de auditoría",
    tabs: [
      {
        id: "bitacora",
        t: "Bitácora",
        sub: "Quién, cuándo, desde dónde, qué valor cambió y quién lo autorizó",
        render: bitacoraTab,
        wire: bitacoraWire,
      },
      {
        id: "inactivados",
        t: "Registros inactivados",
        sub: "Lo que ya no se usa sigue leyéndose igual en el historial",
        render: inactivadosTab,
        wire: inactivadosWire,
      },
      {
        id: "registro",
        t: "Qué se registra",
        sub: "Nivel de detalle y conservación",
        render: registroTab,
        wire: registroWire,
      },
    ],
  });

  /* ══════════════════════════════════════════════════════════════
     SISTEMA / CONFIGURACIÓN — una pantalla por opción del menú.
     Es una demostración: se ve cómo quedaría cada catálogo y cada
     regla, con su botón para agregar y editar, y funcionan las acciones
     que cuentan la historia (renombrar sin tocar lo emitido, aceptar una
     versión, ubicar un artículo, cambiar un parámetro con motivo).
     ══════════════════════════════════════════════════════════════ */

  /* ── 1 · EMPRESA, LOCALES Y ÁREAS (SIS-001, SIS-002, SIS-003) ── */
  const NUEVOS_LOC = [];
  const LOC_EXTRA =
    {}; /* datos editables de cada local (horario, teléfono, estado) */
  const locX = (l) =>
    LOC_EXTRA[l.id] ||
    (LOC_EXTRA[l.id] = {
      tel: "2556-" + String(1000 + ((l.cod * 37) % 9000)).slice(0, 4),
      horario:
        l.tipo === "tienda"
          ? "L-S 7:00 a 18:00 · D 8:00 a 13:00"
          : "L-S 6:00 a 16:00",
      activo: true,
    });
  const AREAS = [
    {
      nom: "Tienda virtual",
      ic: "chat",
      tipo: "Canal de venta",
      loc: "L2",
      inv: "Despacha del inventario de Turrialba",
      gente: 6,
      venta: 18420300,
      docs: 214,
      d: "WhatsApp y página web. Hoy es «esclava» del local 2 y su venta no se puede medir aparte: aquí es un área con su propia venta, aunque despache desde Turrialba.",
    },
    {
      nom: "Sala de acabados",
      ic: "layers",
      tipo: "Exhibición y venta",
      loc: "L2",
      inv: "Inventario propio de exhibición",
      gente: 3,
      venta: 9310800,
      docs: 96,
      d: "Pisos, enchapes y grifería de exhibición. Vende con la caja de Turrialba pero su resultado se ve por separado.",
    },
    {
      nom: "Taller",
      ic: "wrench",
      tipo: "Servicio",
      loc: "L1",
      inv: "Bodega de repuestos del taller",
      gente: 4,
      venta: 2150400,
      docs: 138,
      d: "Taller automotriz y de reparación de herramientas; factura mano de obra y repuestos.",
    },
    {
      nom: "Planta de prefabricados",
      ic: "factory",
      tipo: "Producción",
      loc: "CD",
      inv: "Traslada a los locales, no les vende",
      gente: 5,
      venta: 0,
      docs: 0,
      d: "Produce bloques y baldosas y los traslada como movimiento interno, no como compra.",
    },
  ];
  function locales(v) {
    const L = D.locales.concat(NUEVOS_LOC);
    v.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Puntos de venta", grp(L.filter((l) => l.tipo === "tienda").length), { txt: "cada uno con su nodo local" })}
        ${stat("Centro de distribución y bodegas", grp(L.filter((l) => l.tipo !== "tienda").length), { txt: "CEDI Isabel · 55 000 m²" })}
        ${stat("Cajas", grp(L.reduce((k, l) => k + (l.terminales || 0), 0)), { txt: "cada una con su consecutivo" })}
        ${stat("Usuarios y locales", "Sin límite", { txt: "la licencia no se cobra por usuario" }, "var(--ok)")}
      </div>
      ${card({
        title: "Locales y bodegas",
        hint: "se agregan sin tocar el sistema",
        actions: `<button class="btn sm pri" id="locNuevo">${icon("plus")}Local o bodega</button>`,
        body: table({
          cols: [
            {
              t: "Local",
              fmt: (r) =>
                `<b>${esc(r.nom)}</b>${r.nuevo ? " " + tag("nuevo", "ok") : ""}${locX(r).activo ? "" : " " + tag("inactivo", "mu")}<span class="sub ui">${esc(r.dir)}</span>`,
            },
            { t: "Sucursal fiscal", cls: "mono", fmt: (r) => esc(r.cod) },
            {
              t: "Tipo",
              fmt: (r) =>
                tag(
                  r.tipo === "cedi"
                    ? "Centro de distribución"
                    : r.tipo === "bodega"
                      ? "Bodega"
                      : "Tienda",
                  r.tipo === "tienda" ? "ac" : "mu",
                ),
            },
            {
              t: "Cajas",
              r: true,
              cls: "mono",
              fmt: (r) => r.terminales || '<span class="dim">—</span>',
            },
            {
              t: "Nodo local",
              fmt: (r) =>
                r.tipo === "tienda"
                  ? tag("En línea", "ok", "check")
                  : tag("No aplica", "mu"),
            },
            {
              t: "Factura",
              fmt: (r) =>
                r.tipo === "tienda"
                  ? tag("Sí", "ok")
                  : tag("Solo inventario", "mu"),
            },
            {
              t: "Horario",
              fmt: (r) =>
                `<span class="mut" style="font-size:12.5px">${esc(locX(r).horario)}</span>`,
            },
            {
              t: "",
              r: true,
              fmt: (r) =>
                `<button class="btn sm" data-loced="${r.id}">Editar</button>`,
            },
          ],
          rows: L,
          rowCls: (r) => (locX(r).activo ? "" : "wa"),
        }),
      })}</div>`;
  }
  function fichaLocal(l) {
    const nuevo = !l;
    l = l || { nom: "", tipo: "tienda", dir: "", terminales: 2 };
    const x = nuevo
      ? { tel: "", horario: "L-S 7:00 a 18:00", activo: true }
      : locX(l);
    const exist = nuevo
      ? 0
      : D.articulos.filter(
          (a) =>
            D.existencias[a.id] &&
            D.existencias[a.id][l.id] &&
            D.existencias[a.id][l.id].cant > 0,
        ).length;
    ficha({
      title: nuevo ? "Nuevo local o bodega" : l.nom,
      sub: nuevo
        ? "Queda disponible de una vez para inventario, cajas y reportes"
        : "Sucursal fiscal " + l.cod,
      campos: [
        {
          id: "nom",
          l: "Nombre",
          v: l.nom,
          req: true,
          ph: "Por ejemplo: Siquirres",
        },
        {
          id: "tipo",
          l: "Tipo",
          tipo: "select",
          opts: [
            { v: "tienda", t: "Tienda" },
            { v: "bodega", t: "Bodega" },
            { v: "cedi", t: "Centro de distribución" },
          ],
          v: l.tipo,
          corto: true,
        },
        {
          id: "cajas",
          l: "Cajas",
          tipo: "num",
          v: l.terminales || 0,
          corto: true,
          hint: "Cada caja es una terminal con su consecutivo.",
        },
        { id: "dir", l: "Dirección", v: l.dir },
        { id: "tel", l: "Teléfono", v: x.tel, corto: true },
        { id: "hor", l: "Horario", v: x.horario, corto: true },
        {
          id: "fact",
          l: "Puede facturar",
          tipo: "switch",
          v: l.tipo === "tienda",
          hint: "Las bodegas no venden: despachan.",
        },
        {
          id: "nodo",
          l: "Nodo local",
          tipo: "switch",
          v: l.tipo === "tienda",
          hint: "Sigue facturando si se cae el internet.",
        },
      ],
      nota: nuevo
        ? "La sucursal fiscal se asigna sola (la siguiente libre) y cada caja abre su propia serie de consecutivos (sucursal + terminal)."
        : "Cambiar el nombre no cambia cómo se leen los documentos ya emitidos.",
      notaIc: "file",
      peligro: nuevo
        ? null
        : {
            t: x.activo ? "Inactivar local" : "Reactivar local",
            ic: "lock",
            dis: x.activo && exist > 0,
            why:
              x.activo && exist > 0
                ? "Tiene existencias en " +
                  exist +
                  " artículos: trasládelas antes de inactivarlo."
                : "",
            fn: () => {
              x.activo = !x.activo;
              anotar(
                (x.activo ? "Reactivó" : "Inactivó") + " local",
                l.nom,
                "Alta",
              );
              return {
                t: x.activo ? "Local reactivado" : "Local inactivado",
                s: x.activo
                  ? ""
                  : "Deja de aparecer para registrar; su historia queda.",
              };
            },
          },
      guardar(v) {
        if (nuevo) {
          const tipo = v.tipo;
          NUEVOS_LOC.push({
            id: "N" + NUEVOS_LOC.length,
            cod: String(13 + NUEVOS_LOC.length).padStart(3, "0"),
            nom: v.nom,
            tipo,
            terminales:
              tipo === "tienda" ? Math.max(1, parseInt(v.cajas, 10) || 1) : 0,
            dir: v.dir || "—",
            nuevo: true,
          });
          LOC_EXTRA["N" + (NUEVOS_LOC.length - 1)] = {
            tel: v.tel,
            horario: v.hor,
            activo: true,
          };
          anotar("Creó local", v.nom + " · " + tipo);
          return {
            t: v.nom + " quedó creado",
            s: "Sucursal fiscal asignada. Ya aparece en inventario, cajas y reportes.",
          };
        }
        const antes = l.nom;
        l.nom = v.nom;
        l.dir = v.dir;
        x.tel = v.tel;
        x.horario = v.hor;
        anotar("Modificó local", antes, "Media", antes, v.nom);
        return { t: "Local actualizado" };
      },
    });
  }
  function localesWire(v) {
    $("#locNuevo", v).addEventListener("click", () => fichaLocal(null));
    $$("[data-loced]", v).forEach((b) =>
      b.addEventListener("click", () =>
        fichaLocal(
          D.locales.concat(NUEVOS_LOC).find((l) => l.id === b.dataset.loced),
        ),
      ),
    );
  }

  /* terminales y dispositivos de cada caja */
  const DISP = {};
  const dispDe = (t) =>
    DISP[t.id] ||
    (DISP[t.id] = {
      eq: t.n === 1 ? "PC de mostrador · Windows 11" : "Mini PC de caja",
      imp:
        t.n === 1
          ? "Epson TM-T20III (térmica 80 mm) · HP LaserJet para carta"
          : "Epson TM-T20III (térmica 80 mm)",
      lector: "Honeywell Voyager 1250g",
      gaveta: true,
      datafono:
        ["BN", "BCR"][t.n % 2] + " · " + (t.n === 1 ? "inalámbrico" : "fijo"),
      balanza: t.locId === "L1" && t.n === 1,
    });
  let tmLoc = "L1";
  function terminalesSis(v) {
    const TT = (V ? V.TERMINALES : []).filter((t) => t.locId === tmLoc);
    v.innerHTML = `<div class="wrap">
      <div class="sx-bar" style="justify-content:space-between">${nota("Cada caja es una terminal con su propia serie fiscal (<b>sucursal + terminal</b>) y sus dispositivos. La numeración la administra el emisor; Hacienda no registra terminales, valida que la serie no tenga saltos ni repetidos. Quién puede usarla se define en Ventas › Caja y turnos.", "print")}
        <select class="sx-sel" id="tmLoc" aria-label="Local">${tiendas.map((l) => `<option value="${l.id}" ${l.id === tmLoc ? "selected" : ""}>${esc(l.nom)}</option>`).join("")}</select></div>
      ${card({
        title: "Terminales de " + locNom(tmLoc),
        hint: TT.length + (TT.length === 1 ? " caja" : " cajas"),
        actions: `<button class="btn sm" data-ir="caja|terminales">${icon("users")}Quién las usa</button><button class="btn sm pri" id="tmNueva">${icon("plus")}Terminal</button>`,
        body: table({
          cols: [
            {
              t: "Terminal",
              fmt: (t) =>
                `<b>Caja ${t.n}</b><span class="sub ui">${esc(dispDe(t).eq)}</span>`,
            },
            { t: "Consecutivo", cls: "mono", fmt: (t) => esc(t.cons) },
            {
              t: "Impresora",
              fmt: (t) =>
                `<span style="font-size:12.5px">${esc(dispDe(t).imp)}</span>`,
            },
            {
              t: "Lector",
              fmt: (t) =>
                `<span style="font-size:12.5px">${esc(dispDe(t).lector)}</span>`,
            },
            { t: "Datáfono", fmt: (t) => esc(dispDe(t).datafono) },
            {
              t: "Otros",
              fmt: (t) =>
                [
                  dispDe(t).gaveta ? tag("Gaveta", "mu") : "",
                  dispDe(t).balanza ? tag("Balanza", "mu") : "",
                ].join(" "),
            },
            { t: "Estado", fmt: () => tag("En línea", "ok", "check") },
            {
              t: "",
              r: true,
              fmt: (t) =>
                `<button class="btn sm" data-tmed="${t.id}">Editar</button>`,
            },
          ],
          rows: TT,
        }),
      })}</div>`;
  }
  function fichaTerminal(t) {
    const nueva = !t,
      d = nueva
        ? {
            eq: "",
            imp: "Epson TM-T20III (térmica 80 mm)",
            lector: "Honeywell Voyager 1250g",
            gaveta: true,
            datafono: "BN · fijo",
            balanza: false,
          }
        : dispDe(t);
    const l = D.locales.find((x) => x.id === tmLoc);
    ficha({
      title: nueva
        ? "Nueva terminal en " + l.nom
        : "Caja " + t.n + " · " + l.nom,
      sub: nueva
        ? "Abre la serie fiscal " +
          l.cod +
          "-" +
          String(l.terminales + 1).padStart(5, "0")
        : "Consecutivo " + t.cons,
      campos: [
        { id: "eq", l: "Equipo", v: d.eq, ph: "Por ejemplo: Mini PC de caja" },
        {
          id: "imp",
          l: "Impresora",
          tipo: "select",
          opts: [
            "Epson TM-T20III (térmica 80 mm)",
            "Epson TM-T20III (térmica 80 mm) · HP LaserJet para carta",
            "HP LaserJet para carta",
          ],
          v: d.imp,
        },
        {
          id: "lec",
          l: "Lector de códigos",
          tipo: "select",
          opts: ["Honeywell Voyager 1250g", "Zebra DS2208", "Sin lector"],
          v: d.lector,
          corto: true,
        },
        {
          id: "dat",
          l: "Datáfono",
          tipo: "select",
          opts: [
            "BN · fijo",
            "BN · inalámbrico",
            "BCR · fijo",
            "BCR · inalámbrico",
            "Sin datáfono",
          ],
          v: d.datafono,
          corto: true,
        },
        { id: "gav", l: "Gaveta de dinero", tipo: "switch", v: d.gaveta },
        {
          id: "bal",
          l: "Balanza",
          tipo: "switch",
          v: d.balanza,
          hint: "Para clavos y alambre por kilo.",
        },
      ],
      nota: nueva
        ? "El consecutivo se asigna solo y no se repite aunque la terminal se desactive después."
        : "Desactivar una terminal no libera su consecutivo: queda reservado.",
      notaIc: "file",
      peligro: nueva
        ? null
        : {
            t: "Desactivar terminal",
            ic: "lock",
            dis: !!(V && V.turnoDe(t.locId, t.n)),
            why:
              V && V.turnoDe(t.locId, t.n)
                ? "Tiene un turno abierto: ciérrelo antes."
                : "",
            fn: () => {
              anotar("Desactivó terminal", l.nom + " · Caja " + t.n, "Alta");
              return {
                t: "Terminal desactivada",
                s: "El consecutivo queda reservado.",
              };
            },
          },
      guardar(x) {
        if (nueva) {
          /* la terminal nueva existe desde ya: la caja puede facturar con su serie */
          l.terminales++;
          const serie = l.cod + "-" + String(l.terminales).padStart(5, "0");
          if (V) V.TERMINALES.push({ id: l.id + "-T" + l.terminales, locId: l.id, n: l.terminales, cons: serie, equipo: x.eq || "Caja " + l.terminales });
          Object.assign(dispDe({ id: l.id + "-T" + l.terminales, locId: l.id, n: l.terminales }), {
            eq: x.eq || "Mini PC de caja", imp: x.imp, lector: x.lec, datafono: x.dat, gaveta: x.gav, balanza: x.bal,
          });
          anotar("Creó terminal", l.nom + " · Caja " + l.terminales + " · serie " + serie + " · " + (x.eq || "Caja nueva"));
          return {
            t: "Terminal creada · serie " + serie,
            s: "Sus comprobantes empiezan en el número 1 de cada tipo. Habilite quién la usa en Caja y turnos.",
          };
        }
        Object.assign(d, {
          eq: x.eq,
          imp: x.imp,
          lector: x.lec,
          datafono: x.dat,
          gaveta: x.gav,
          balanza: x.bal,
        });
        anotar("Modificó terminal", l.nom + " · Caja " + t.n);
        return { t: "Terminal actualizada" };
      },
    });
  }
  function terminalesSisWire(v) {
    A.wireIr(v);
    $("#tmLoc", v).addEventListener("change", (e) => {
      tmLoc = e.target.value;
      A.refresh();
    });
    $("#tmNueva", v).addEventListener("click", () => fichaTerminal(null));
    $$("[data-tmed]", v).forEach((b) =>
      b.addEventListener("click", () =>
        fichaTerminal(V.TERMINALES.find((t) => t.id === b.dataset.tmed)),
      ),
    );
  }

  function areas(v) {
    v.innerHTML = `<div class="wrap">
      <div class="sx-bar" style="justify-content:space-between">${nota("Un área vive dentro de un local pero tiene su propio resultado: se sabe cuánto vende la tienda virtual o la sala de acabados sin mezclarlo con la caja del local.", "layers")}
        <button class="btn sm pri" id="arNueva">${icon("plus")}Área</button></div>
      <div class="grid g2" style="align-items:start">${AREAS.map((a, i) =>
        card({
          body: `<div style="display:flex;gap:12px;align-items:flex-start">
          <span class="mit" style="width:40px;height:40px">${icon(a.ic)}</span>
          <div style="flex:1;min-width:0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h3 style="font-size:16px">${esc(a.nom)}</h3>${tag(a.tipo, "mu")}${tag("en " + locNom(a.loc), "mu", "pin")}</div>
            <div class="mut" style="font-size:12.5px;margin-top:5px;line-height:1.5">${esc(a.d)}</div></div>
          <button class="btn sm" data-ared="${i}">Editar</button></div>
        <div class="ficha" style="margin:14px -17px -16px;border-top:1px solid var(--hair-2)">
          ${fichaCell("Venta del mes", a.venta ? c(a.venta) : "—")}${fichaCell("Documentos", a.docs ? grp(a.docs) : "—")}${fichaCell("Personas", grp(a.gente))}${fichaCell("Inventario", `<span style="font-family:var(--ui);font-size:12.5px;font-weight:500">${esc(a.inv)}</span>`)}</div>`,
        }),
      ).join("")}</div></div>`;
  }
  function fichaArea(a) {
    const nueva = !a;
    a = a || {
      nom: "",
      tipo: "Canal de venta",
      loc: "L2",
      inv: "Despacha del inventario del local",
      d: "",
      gente: 0,
      venta: 0,
      docs: 0,
      ic: "layers",
    };
    ficha({
      title: nueva ? "Nueva área" : a.nom,
      sub: "Tiene su propio resultado aunque use la caja y el inventario de un local",
      campos: [
        {
          id: "nom",
          l: "Nombre",
          v: a.nom,
          req: true,
          ph: "Por ejemplo: Venta a instituciones",
        },
        {
          id: "tipo",
          l: "Tipo",
          tipo: "select",
          opts: [
            "Canal de venta",
            "Exhibición y venta",
            "Servicio",
            "Producción",
          ],
          v: a.tipo,
          corto: true,
        },
        {
          id: "loc",
          l: "Vive en",
          tipo: "select",
          opts: D.locales.map((l) => ({ v: l.id, t: l.nom })),
          v: a.loc,
          corto: true,
        },
        {
          id: "inv",
          l: "Inventario",
          tipo: "select",
          opts: [
            "Despacha del inventario del local",
            "Inventario propio de exhibición",
            "Bodega propia",
            "Traslada a los locales, no les vende",
          ],
          v: a.inv,
        },
        { id: "d", l: "Descripción", v: a.d, tipo: "area", rows: 2 },
        {
          id: "res",
          l: "Resultado propio en reportes y contabilidad",
          tipo: "switch",
          v: true,
          hint: "Su venta y su margen se ven aparte de los del local.",
        },
      ],
      guardar(x) {
        if (nueva) {
          AREAS.push({
            nom: x.nom,
            tipo: x.tipo,
            loc: x.loc,
            inv: x.inv,
            d: x.d || "—",
            gente: 0,
            venta: 0,
            docs: 0,
            ic: "layers",
          });
          anotar("Creó área", x.nom + " · " + locNom(x.loc));
          return {
            t: "Área creada",
            s: "Ya se puede elegir al facturar y en los reportes.",
          };
        }
        const antes = a.nom;
        Object.assign(a, {
          nom: x.nom,
          tipo: x.tipo,
          loc: x.loc,
          inv: x.inv,
          d: x.d,
        });
        anotar("Modificó área", antes, "Media", antes, x.nom);
        return { t: "Área actualizada" };
      },
    });
  }
  function areasWire(v) {
    $("#arNueva", v).addEventListener("click", () => fichaArea(null));
    $$("[data-ared]", v).forEach((b) =>
      b.addEventListener("click", () => fichaArea(AREAS[+b.dataset.ared])),
    );
  }
  /* la ficha del emisor es una sola (D.emisor): la leen la clave numérica,
     Facturación, las plantillas y la planilla */
  const EMP = D.emisor;
  const domicilio = (e) => D.ubicacionTexto(e) + " · " + e.otrasSenas;
  function empresa(v) {
    const act = D.actividadPrincipal();
    v.innerHTML = `<div class="grid g2" style="align-items:start">
      ${card({
        title: "Razón social",
        hint: "sale en todos los comprobantes",
        actions: `<button class="btn sm" id="empEd">Editar datos</button>`,
        body: `<dl class="kv">
          <dt>Nombre</dt><dd>${esc(EMP.nombre)}</dd>
          <dt>Nombre comercial</dt><dd>${esc(EMP.comercial)}</dd>
          <dt>Identificación</dt><dd><span class="num">${esc(EMP.cedula)}</span> · ${esc(EMP.tipoCedCod)} ${esc(EMP.tipoCed)}</dd>
          <dt>Actividad principal</dt><dd><span class="num">${esc(act.cod)}</span> · ${esc(act.t)}${EMP.actividades.length > 1 ? `<br><span class="dim" style="font-size:12px">y ${EMP.actividades.length - 1} actividades más</span>` : ""}</dd>
          <dt>Régimen</dt><dd>${esc(EMP.regimen)}</dd>
          <dt>Domicilio fiscal</dt><dd>${esc(D.ubicacionTexto(EMP))} <span class="dim num">(${esc(EMP.provincia)}-${esc(EMP.canton)}-${esc(EMP.distrito)})</span><br><span style="font-size:12px">${esc(EMP.otrasSenas)}</span></dd>
          <dt>Correo de facturación</dt><dd>${esc(EMP.correos[0])}</dd>
          <dt>Teléfono</dt><dd class="num">${esc(EMP.tel)}</dd>
          <dt>Moneda</dt><dd>Colones · tipo de cambio del BCCR para dólares</dd></dl>
          <div style="margin-top:12px">${nota("La llave criptográfica se administra en Facturación electrónica y es un permiso aparte: ni contabilidad ni TI la ven por tener acceso a esta pantalla.", "lock")}</div>
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-ir="fel-llave">${icon("lock")}Llave criptográfica</button><button class="btn sm" data-ir="fel-config">${icon("file")}Actividades económicas</button></div>`,
      })}
      <div style="display:flex;flex-direction:column;gap:14px">
      ${card({
        title: "Logotipo y encabezado",
        body: `<div style="display:flex;gap:14px;align-items:center"><img src="mark.png" alt="" style="width:64px;height:64px;object-fit:contain;border:1px solid var(--hair);border-radius:10px;background:#fff;padding:6px">
          <div style="flex:1;font-size:12.5px;color:var(--ink-2);line-height:1.55">Sale en facturas, proformas, recibos y correos. Se cambia una vez y aplica a todas las plantillas.</div>
          <button class="btn sm" id="empLogo">${icon("upload")}Cambiar</button></div>`,
      })}
      ${card({
        title: "Más de una razón social",
        chip: " " + tag("Fase 3", "mu"),
        body: `<div style="font-size:13px;color:var(--ink-2);line-height:1.6">Hoy opera una sola sociedad. El sistema queda preparado para varias: cada documento, cuenta y existencia lleva la razón social a la que pertenece, y un usuario puede tener permiso en una o en varias.</div>
        <div style="margin-top:12px">${nota("En el pasado se valoró operar con tres sociedades y se descartó por la carga administrativa. Si se retoma, se agrega aquí sin migrar datos.", "info")}</div>
        <div style="margin-top:12px"><button class="btn sm" disabled title="Disponible en la fase 3">${icon("plus")}Agregar razón social</button></div>`,
      })}</div></div>`;
  }
  function empresaWire(v) {
    A.wireIr(v);
    $("#empLogo", v).addEventListener("click", () =>
      toast(
        "Logotipo",
        "Se elige un PNG o SVG; la vista previa de cada plantilla se actualiza antes de guardar.",
        "in",
      ),
    );
    $("#empEd", v).addEventListener("click", () =>
      ficha({
        title: "Datos de la razón social",
        sub: "Cambian los comprobantes desde hoy; lo emitido no cambia",
        campos: [
          { id: "nombre", l: "Razón social", v: EMP.nombre, req: true },
          { id: "comercial", l: "Nombre comercial", v: EMP.comercial },
          {
            id: "cedula",
            l: "Cédula jurídica",
            v: EMP.cedula,
            dis: true,
            hint: "No se cambia: una cédula distinta es otra razón social.",
          },
          {
            id: "provincia", l: "Provincia", tipo: "select", corto: true, req: true, v: EMP.provincia,
            opts: Object.entries(D.UBICACION.provincias).map(([v, t]) => ({ v, t: v + " · " + t })),
          },
          {
            id: "canton", l: "Cantón", tipo: "select", corto: true, req: true, v: EMP.canton,
            opts: Object.entries(D.UBICACION.cantones[EMP.provincia] || {}).map(([v, t]) => ({ v, t: v + " · " + t })),
          },
          {
            id: "distrito", l: "Distrito", tipo: "select", req: true, v: EMP.distrito,
            opts: Object.entries(D.UBICACION.distritos[EMP.provincia + "-" + EMP.canton] || {}).map(([v, t]) => ({ v, t: v + " · " + t })),
          },
          { id: "otrasSenas", l: "Otras señas", tipo: "area", rows: 2, v: EMP.otrasSenas, req: true, hint: "Obligatorio en el XML 4.4; máximo 250 caracteres." },
          {
            id: "correo",
            l: "Correo de facturación",
            v: EMP.correos[0],
            corto: true,
            req: true,
          },
          { id: "tel", l: "Teléfono", v: EMP.tel, corto: true },
          { id: "motivo", l: "Motivo del cambio", tipo: "area", rows: 2, req: true, ph: "Queda en la bitácora de auditoría" },
        ],
        nota: "Este cambio es sensible: pide doble factor y gerencia recibe el aviso. Lo ya emitido no cambia.",
        notaIc: "shield",
        guardar(x) {
          /* la ubicación tiene que existir: el XML la valida contra la división territorial */
          const cantones = D.UBICACION.cantones[x.provincia] || {};
          const distritos = D.UBICACION.distritos[x.provincia + "-" + x.canton] || {};
          if (!cantones[x.canton] || !distritos[x.distrito]) {
            toast("Ubicación incompleta", "El cantón y el distrito tienen que pertenecer a la provincia elegida.", "cr");
            return false;
          }
          if (x.otrasSenas.length > 250) {
            toast("Otras señas demasiado largas", "El XML 4.4 admite hasta 250 caracteres.", "cr");
            return false;
          }
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.correo)) {
            toast("Correo no válido", "Revise el correo de facturación.", "cr");
            return false;
          }
          const antes = [EMP.nombre, EMP.comercial, domicilio(EMP), EMP.correos[0], EMP.tel].join(" | ");
          Object.assign(EMP, {
            nombre: x.nombre,
            comercial: x.comercial,
            provincia: x.provincia,
            canton: x.canton,
            distrito: x.distrito,
            otrasSenas: x.otrasSenas,
            tel: x.tel,
          });
          EMP.correos[0] = x.correo;
          const despues = [EMP.nombre, EMP.comercial, domicilio(EMP), EMP.correos[0], EMP.tel].join(" | ");
          anotar(
            "Modificó datos de la empresa",
            "Razón social · motivo: " + x.motivo,
            "Alta",
            antes,
            despues,
          );
          return {
            t: "Datos actualizados",
            s: "Los comprobantes que se emitan desde ahora salen con los datos nuevos; lo ya emitido no cambia.",
          };
        },
      }),
    );
  }
  A.workspace("sis-locales", {
    title: "Empresa y estructura",
    tabs: [
      {
        id: "locales",
        t: "Locales y bodegas",
        sub: "Siete tiendas, el CEDI y dos bodegas; se agregan más sin tocar el sistema",
        render: locales,
        wire: localesWire,
      },
      {
        id: "terminales",
        t: "Terminales y dispositivos",
        sub: "Cada caja con su consecutivo, impresora, lector y datáfono",
        render: terminalesSis,
        wire: terminalesSisWire,
      },
      {
        id: "areas",
        t: "Áreas",
        sub: "Taller, sala de acabados, tienda virtual y planta, cada una con su resultado",
        render: areas,
        wire: areasWire,
      },
      {
        id: "departamentos",
        t: "Departamentos",
        sub: "Contabilidad, proveeduría, ventas, bodega… ligados a la planilla",
        render: departamentos,
        wire: departamentosWire,
      },
      {
        id: "empresa",
        t: "Razón social",
        sub: "La sociedad que emite, su logotipo y la preparación para más de una",
        render: empresa,
        wire: empresaWire,
      },
    ],
  });

  /* ── 2 · TERRITORIOS DE CLIENTES (SIS-004) ── */
  const TERRS = {}; /* territorio → {cantones, resp, activo} */
  const terrDe = (t) =>
    TERRS[t] ||
    (TERRS[t] = {
      zona:
        t === "Fuera de cantón"
          ? "Resto del país"
          : "Cantón de " +
            (/Pacayas|Cervantes/.test(t)
              ? "Alvarado"
              : /Pejibaye|Tucurrique/.test(t)
                ? "Jiménez"
                : "Turrialba"),
      resp: "",
      activo: true,
    });
  A.screen("sis-territorios", {
    title: "Territorios de clientes",
    sub: () =>
      "Dónde vive el cliente, no dónde compra: un cliente de Turrialba también compra en Santa Rosa",
    extra: () =>
      `<button class="btn pri" id="terNuevo">${icon("plus")}Territorio</button>`,
    render(v) {
      const terr = (c2) =>
        V && V.FICHA[c2] ? V.FICHA[c2].territorio : "Fuera de cantón";
      const T = {};
      D.documentos
        .filter((d) => d.clienteId && d.tipo !== "NC")
        .forEach((d) => {
          const t = terr(d.clienteId);
          const x = T[t] || (T[t] = { t, venta: 0, cli: {}, por: {} });
          x.venta += d.total;
          x.cli[d.clienteId] = true;
          x.por[d.locId] = (x.por[d.locId] || 0) + d.total;
        });
      Object.keys(TERRS).forEach((t) => {
        if (!T[t]) T[t] = { t, venta: 0, cli: {}, por: {} };
      });
      const rows = Object.values(T).sort((a, b) => b.venta - a.venta);
      v.innerHTML = `<div class="wrap">
        ${card({
          title: "En qué local compra cada territorio",
          hint: "porcentaje de la venta del territorio",
          body: `<div class="tscroll"><table class="dt"><thead><tr><th>Territorio</th><th class="r">Clientes</th><th class="r">Venta</th>${tiendas.map((l) => `<th class="r">${esc(l.nom)}</th>`).join("")}<th></th></tr></thead>
          <tbody>${rows
            .map(
              (
                x,
              ) => `<tr><td><b>${esc(x.t)}</b><span class="sub ui">${esc(terrDe(x.t).zona)}${terrDe(x.t).resp ? " · " + esc(terrDe(x.t).resp) : ""}</span></td><td class="r mono">${Object.keys(x.cli).length}</td><td class="r mono">${grp(x.venta)}</td>
            ${tiendas
              .map((l) => {
                const p = x.venta ? ((x.por[l.id] || 0) / x.venta) * 100 : 0;
                return `<td class="r mono" style="background:rgba(35,64,132,${((p / 100) * 0.55).toFixed(2)});${p > 45 ? "color:#fff;font-weight:650" : ""}">${p >= 1 ? dec(p, 0) + " %" : '<span class="dim">—</span>'}</td>`;
              })
              .join("")}
            <td class="r"><button class="btn sm" data-tered="${esc(x.t)}">Editar</button></td></tr>`,
            )
            .join("")}</tbody></table></div>`,
        })}
        ${nota("El territorio sale de la dirección del cliente y se asigna solo al crearlo; se puede corregir en su ficha. Con esto el análisis comercial responde «¿cuánto nos compra Pejibaye?» aunque Pejibaye compre en tres locales.", "pin")}</div>`;
    },
    wire(v) {
      const f = (t) => {
        const nuevo = t == null,
          x = nuevo ? { zona: "", resp: "", activo: true } : terrDe(t);
        ficha({
          title: nuevo ? "Nuevo territorio" : t,
          sub: "Agrupa clientes por dónde viven, para el análisis comercial",
          campos: [
            {
              id: "nom",
              l: "Nombre",
              v: nuevo ? "" : t,
              req: true,
              dis: !nuevo,
              hint: nuevo
                ? ""
                : "Para renombrar, cree uno nuevo y mueva los clientes: el historial conserva el anterior.",
            },
            {
              id: "zona",
              l: "Zona que cubre",
              v: x.zona,
              ph: "Distritos o cantón",
            },
            {
              id: "resp",
              l: "Vendedor o encargado",
              tipo: "select",
              opts: [
                "",
                "Kevin Solano",
                "Jonathan Ureña",
                "Sofía Camacho",
                "Melissa Arce",
              ],
              v: x.resp,
            },
            {
              id: "auto",
              l: "Asignar solo por la dirección del cliente",
              tipo: "switch",
              v: true,
            },
          ],
          peligro: nuevo
            ? null
            : {
                t: "Inactivar",
                ic: "lock",
                dis: true,
                why: "Tiene clientes asignados: muévalos a otro territorio antes.",
              },
          guardar(y) {
            if (nuevo) {
              TERRS[y.nom] = { zona: y.zona, resp: y.resp, activo: true };
              anotar("Creó territorio", y.nom);
              return {
                t: "Territorio creado",
                s: "Los clientes nuevos de esa zona entran solos.",
              };
            }
            Object.assign(x, { zona: y.zona, resp: y.resp });
            anotar("Modificó territorio", t);
            return { t: "Territorio actualizado" };
          },
        });
      };
      const n = $("#terNuevo");
      if (n) n.addEventListener("click", () => f(null));
      $$("[data-tered]", v).forEach((b) =>
        b.addEventListener("click", () => f(b.dataset.tered)),
      );
    },
  });

  /* ── 3 · CATEGORÍAS, MARCAS Y DEPARTAMENTOS (SIS-006, SIS-007) ── */
  const NOMBRES = {}; /* renombres con su historial (SIS-011) */
  const HIST = [
    {
      fecha: dia(12),
      cat: "Estado de compra",
      antes: "Contabilizada",
      despues: "Aplicada",
      por: "Óscar Jiménez",
      ej: "OC-2026-004380 del 28 ago se sigue leyendo «Contabilizada»",
    },
    {
      fecha: dia(30),
      cat: "Categoría",
      antes: "Tubería",
      despues: "Tubería PVC",
      por: "Álvaro Cordero",
      ej: "Las facturas de julio siguen diciendo «Tubería»",
    },
  ];
  const nombre = (k, def) => NOMBRES[k] || def;
  function renombrar(k, actual, catalogo) {
    openSheet({
      title: "Renombrar",
      sub: catalogo + " · «" + actual + "»",
      body: `<div class="field"><label for="rnN">Nombre nuevo</label><input id="rnN" value="${esc(actual)}"></div>
        ${nota("Los documentos ya emitidos conservan el nombre con el que se emitieron; el nuevo rige desde ahora. Queda el historial con quién lo cambió.", "history")}`,
      footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="rnOk">Renombrar</button>`,
      after(el) {
        cerrar(el);
        const i2 = $("#rnN", el);
        setTimeout(() => {
          i2.focus();
          i2.select();
        }, 40);
        $("#rnOk", el).addEventListener("click", () => {
          const n = i2.value.trim();
          if (!n || n === actual) return closeSheet();
          NOMBRES[k] = n;
          HIST.unshift({
            fecha: new Date(),
            cat: catalogo,
            antes: actual,
            despues: n,
            por: "Andrey Ramírez",
            ej: "Lo emitido antes de hoy sigue diciendo «" + actual + "»",
          });
          anotar(
            "Renombró " + catalogo.toLowerCase(),
            actual + " → " + n,
            "Media",
            actual,
            n,
          );
          closeSheet();
          toast(
            "Renombrado",
            "«" + actual + "» ahora es «" + n + "». Lo ya emitido no cambia.",
            "ok",
          );
          A.refresh();
        });
      },
    });
  }
  const CAT_EXTRA =
    {}; /* datos editables por categoría: cabys sugerido, activa */
  const NUEVAS_CAT = []; /* categorías padre creadas en la demostración */
  const catX = (k) =>
    CAT_EXTRA[k] || (CAT_EXTRA[k] = { cabys: "", activa: true });
  function fichaCategoria(o) {
    /* o: {k, nom, padre (id o ""), nArt, nuevo} */
    const fams = D.familias.concat(NUEVAS_CAT);
    const x = o.nuevo ? { cabys: "", activa: true } : catX(o.k);
    ficha({
      title: o.nuevo
        ? o.padre
          ? "Nueva subcategoría"
          : "Nueva categoría"
        : o.nom,
      sub: o.nuevo
        ? o.padre
          ? "Dentro de " + (fams.find((f) => f.id === o.padre) || {}).nom
          : "Categoría padre; después se le agregan hijas"
        : (o.padre
            ? "Hija de " + (fams.find((f) => f.id === o.padre) || {}).nom
            : "Categoría padre") +
          " · " +
          o.nArt +
          " artículos",
      campos: [
        {
          id: "nom",
          l: "Nombre",
          v: o.nom || "",
          req: true,
          ph: o.padre
            ? "Por ejemplo: Grifería plástica"
            : "Por ejemplo: Acabados",
        },
        {
          id: "padre",
          l: "Categoría padre",
          tipo: "select",
          opts: [{ v: "", t: "— Es categoría padre —" }].concat(
            fams.map((f) => ({ v: f.id, t: f.nom })),
          ),
          v: o.padre || "",
          dis: !o.nuevo && !o.padre,
        },
        {
          id: "cabys",
          l: "CABYS sugerido para artículos nuevos",
          v: x.cabys,
          ph: "13 dígitos · opcional",
          tipo: "num",
          hint: "Al crear un artículo en esta categoría se propone este código; siempre se puede cambiar.",
        },
        {
          id: "act",
          l: "Activa",
          tipo: "switch",
          v: x.activa,
          hint: "Una categoría inactiva no se ofrece al crear artículos; los existentes la conservan.",
        },
      ],
      nota: o.nuevo
        ? "Las categorías deben existir antes de crear el artículo. El margen mínimo y el descuento por categoría de cliente se definen en Ventas › Precios, descuentos y márgenes."
        : "Si cambia el nombre, los documentos ya emitidos conservan el anterior y queda el cambio en el historial.",
      notaIc: o.nuevo ? "layers" : "history",
      peligro: o.nuevo
        ? null
        : {
            t: "Inactivar",
            ic: "lock",
            dis: o.nArt > 0,
            why:
              o.nArt > 0
                ? "Tiene " +
                  o.nArt +
                  " artículos: muévalos a otra categoría antes."
                : "",
            fn: () => {
              catX(o.k).activa = false;
              anotar(
                "Inactivó categoría",
                o.nom,
                "Media",
                "Activa",
                "Inactiva",
              );
              return { t: "Categoría inactivada" };
            },
          },
      guardar(v) {
        if (o.nuevo) {
          if (v.padre) {
            (D.subcats[v.padre] = D.subcats[v.padre] || []).push(v.nom);
            CAT_EXTRA["s:" + v.padre + ":" + v.nom] = {
              cabys: v.cabys,
              activa: v.act,
            };
          } else {
            const id = "N" + (NUEVAS_CAT.length + 1);
            NUEVAS_CAT.push({ id, nom: v.nom, min: 0, nueva: true });
            CAT_EXTRA["f:" + id] = { cabys: v.cabys, activa: v.act };
          }
          anotar(
            "Creó categoría",
            (v.padre
              ? D.famById[v.padre]
                ? D.famById[v.padre].nom + " → "
                : ""
              : "") + v.nom,
          );
          return {
            t: "Categoría creada",
            s: v.padre
              ? "Ya se puede elegir al crear artículos."
              : "Agréguele sus subcategorías.",
          };
        }
        Object.assign(x, { cabys: v.cabys, activa: v.act });
        if (v.nom !== o.nom) {
          NOMBRES[o.k] = v.nom;
          HIST.unshift({
            fecha: new Date(D.HOY),
            cat: "Categoría",
            antes: o.nom,
            despues: v.nom,
            por: yo(),
            ej: "Lo emitido antes de hoy sigue diciendo «" + o.nom + "»",
          });
          anotar(
            "Renombró categoría",
            o.nom + " → " + v.nom,
            "Media",
            o.nom,
            v.nom,
          );
          return {
            t: "Categoría actualizada",
            s:
              "«" +
              o.nom +
              "» ahora es «" +
              v.nom +
              "». Lo ya emitido no cambia.",
          };
        }
        anotar("Modificó categoría", o.nom);
        return { t: "Categoría actualizada" };
      },
    });
  }
  function categorias(v) {
    const fams = D.familias.concat(NUEVAS_CAT);
    const nArt = (f, sub) =>
      D.articulos.filter((a) => a.fam === f && (!sub || a.sub === sub)).length;
    const est = (k) => (catX(k).activa ? "" : " " + tag("inactiva", "mu"));
    v.innerHTML = `<div class="wrap">
      ${nota("Dos niveles, padre e hija: <b>Fontanería → Tubería PVC, Accesorios PVC, Grifería</b>. En producción son cerca de 300 categorías; aquí se ven las del catálogo de la demostración. El margen mínimo y el descuento por categoría se configuran en Ventas › Precios, descuentos y márgenes.", "layers")}
      ${card({
        title: "Categorías",
        hint:
          fams.length +
          " padres · " +
          fams.reduce((k, f) => k + (D.subcats[f.id] || []).length, 0) +
          " hijas",
        actions: `<button class="btn sm" data-ir="ven-precios|margenes">${icon("wallet")}Márgenes</button><button class="btn sm pri" id="catNueva">${icon("plus")}Categoría</button>`,
        body: `<div class="tscroll" style="max-height:calc(100dvh - 400px)"><table class="dt"><thead><tr><th>Categoría</th><th class="r">Artículos</th><th class="r">Margen mínimo</th><th></th></tr></thead><tbody>
        ${fams
          .map(
            (
              f,
            ) => `<tr style="background:var(--surface-2)"><td><b>${esc(nombre("f:" + f.id, f.nom))}</b>${f.servicio ? " " + tag("servicios", "mu") : ""}${f.nueva ? " " + tag("nueva", "ok") : ""}${est("f:" + f.id)}</td><td class="r mono">${nArt(f.id)}</td><td class="r mono">${f.min ? f.min + " %" : '<span class="dim">—</span>'}</td>
            <td class="r" style="white-space:nowrap"><button class="btn sm" data-sub="${f.id}">${icon("plus")}Subcategoría</button> <button class="btn sm" data-ced="f:${f.id}">Editar</button></td></tr>
          ${(D.subcats[f.id] || [])
            .map(
              (
                sc,
              ) => `<tr><td style="padding-left:34px"><span class="dim" style="margin-right:6px">└</span>${esc(nombre("s:" + f.id + ":" + sc, sc))}${est("s:" + f.id + ":" + sc)}</td><td class="r mono">${nArt(f.id, sc)}</td><td></td>
            <td class="r"><button class="btn sm" data-ced="s:${f.id}:${esc(sc)}">Editar</button></td></tr>`,
            )
            .join("")}`,
          )
          .join("")}
        </tbody></table></div>`,
      })}</div>`;
  }
  function categoriasWire(v) {
    A.wireIr(v);
    const fams = D.familias.concat(NUEVAS_CAT);
    $("#catNueva", v).addEventListener("click", () =>
      fichaCategoria({ nuevo: true, padre: "" }),
    );
    $$("[data-sub]", v).forEach((b) =>
      b.addEventListener("click", () =>
        fichaCategoria({ nuevo: true, padre: b.dataset.sub }),
      ),
    );
    $$("[data-ced]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const k = b.dataset.ced,
          p = k.split(":");
        if (p[0] === "f") {
          const f = fams.find((x) => x.id === p[1]);
          fichaCategoria({
            k,
            nom: nombre(k, f.nom),
            padre: "",
            nArt: D.articulos.filter((a) => a.fam === f.id).length,
          });
        } else {
          const sc = p.slice(2).join(":");
          fichaCategoria({
            k,
            nom: nombre(k, sc),
            padre: p[1],
            nArt: D.articulos.filter((a) => a.fam === p[1] && a.sub === sc)
              .length,
          });
        }
      }),
    );
  }
  const MARCAS_X = {};
  const NUEVAS_MARCAS = [];
  const marcaX = (m) =>
    MARCAS_X[m] ||
    (MARCAS_X[m] = {
      resp: ["Óscar Jiménez", "Álvaro Cordero"][m.length % 2],
      activa: true,
    });
  function marcas(v) {
    const M = {};
    D.articulos
      .filter((a) => a.marca && a.marca !== "—")
      .forEach((a) => {
        const m =
          M[a.marca] ||
          (M[a.marca] = { m: a.marca, n: 0, fam: {}, prov: a.provId });
        m.n++;
        m.fam[a.fam] = true;
      });
    NUEVAS_MARCAS.forEach((n) => {
      if (!M[n]) M[n] = { m: n, n: 0, fam: {}, nueva: true };
    });
    const rows = Object.values(M).sort((a, b) => b.n - a.n);
    v.innerHTML = card({
      title: "Marcas",
      hint: rows.length + " en el catálogo de la demostración",
      actions: `<button class="btn sm pri" id="marNueva">${icon("plus")}Marca</button>`,
      body: table({
        cols: [
          {
            t: "Marca",
            fmt: (r) =>
              `<b>${esc(nombre("m:" + r.m, r.m))}</b>${r.nueva ? " " + tag("nueva", "ok") : ""}${marcaX(r.m).activa ? "" : " " + tag("inactiva", "mu")}`,
          },
          {
            t: "Artículos",
            r: true,
            cls: "mono",
            fmt: (r) => r.n || '<span class="dim">—</span>',
          },
          {
            t: "Categorías",
            fmt: (r) =>
              Object.keys(r.fam)
                .map((f) => tag(D.famById[f].nom, "mu"))
                .join(" ") || '<span class="dim">—</span>',
          },
          { t: "Gerencia de marca", fmt: (r) => esc(marcaX(r.m).resp) },
          {
            t: "",
            r: true,
            fmt: (r) =>
              `<button class="btn sm" data-maed="${esc(r.m)}|${r.n}">Editar</button>`,
          },
        ],
        rows,
      }),
    });
  }
  function fichaMarca(m, n) {
    const nueva = m == null,
      x = nueva ? { resp: "Óscar Jiménez", activa: true } : marcaX(m);
    ficha({
      title: nueva ? "Nueva marca" : nombre("m:" + m, m),
      sub: nueva ? "" : n + " artículos",
      campos: [
        {
          id: "nom",
          l: "Nombre",
          v: nueva ? "" : nombre("m:" + m, m),
          req: true,
        },
        {
          id: "resp",
          l: "Gerencia de marca",
          tipo: "select",
          opts: ["Óscar Jiménez", "Álvaro Cordero", "Adrián Vindas"],
          v: x.resp,
          hint: "Quien negocia con la marca. El sugerido de compra se puede filtrar por aquí.",
        },
        { id: "act", l: "Activa", tipo: "switch", v: x.activa },
      ],
      peligro: nueva
        ? null
        : {
            t: "Inactivar",
            ic: "lock",
            dis: n > 0,
            why: n > 0 ? "Tiene " + n + " artículos activos." : "",
            fn: () => {
              x.activa = false;
              anotar("Inactivó marca", m);
              return { t: "Marca inactivada" };
            },
          },
      guardar(v) {
        if (nueva) {
          NUEVAS_MARCAS.push(v.nom);
          MARCAS_X[v.nom] = { resp: v.resp, activa: v.act };
          anotar("Creó marca", v.nom);
          return {
            t: "Marca creada",
            s: "Ya se puede elegir al crear artículos.",
          };
        }
        Object.assign(x, { resp: v.resp, activa: v.act });
        if (v.nom !== nombre("m:" + m, m)) {
          HIST.unshift({
            fecha: new Date(D.HOY),
            cat: "Marca",
            antes: nombre("m:" + m, m),
            despues: v.nom,
            por: yo(),
            ej: "Lo emitido antes de hoy conserva el nombre anterior",
          });
          NOMBRES["m:" + m] = v.nom;
        }
        anotar("Modificó marca", m);
        return { t: "Marca actualizada" };
      },
    });
  }
  function marcasWire(v) {
    $("#marNueva", v).addEventListener("click", () => fichaMarca(null, 0));
    $$("[data-maed]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const [m, n] = b.dataset.maed.split("|");
        fichaMarca(m, +n);
      }),
    );
  }
  const DEP_X = {};
  const NUEVOS_DEP = [];
  /* el gasto de planilla va a las mismas cuentas para todos (Salarios
     6-01-01-001 y Cargas sociales 6-01-01-002); lo que distingue al
     departamento es su centro de costo */
  const CUENTAS_DEP = {
    Ventas: "CC-10 Ventas",
    Bodega: "CC-20 Bodega",
    Transporte: "CC-21 Distribución",
    Administración: "CC-30 Administración",
    Contabilidad: "CC-31 Contabilidad",
    Gerencia: "CC-32 Gerencia",
    Proveeduría: "CC-40 Proveeduría",
    Taller: "CC-50 Taller y servicios",
  };
  const depX = (a) =>
    DEP_X[a] ||
    (DEP_X[a] = {
      jefe: "",
      cuenta: CUENTAS_DEP[a] || "CC-30 Administración",
      activo: true,
    });
  function departamentos(v) {
    const emp = N ? (N.activos ? N.activos() : N.empleados) : [];
    const G = {};
    (Array.isArray(emp) ? emp : []).forEach((e) => {
      const g = G[e.area] || (G[e.area] = { a: e.area, n: 0, locs: {} });
      g.n++;
      g.locs[e.locId] = true;
    });
    NUEVOS_DEP.forEach((a) => {
      if (!G[a]) G[a] = { a, n: 0, locs: {}, nuevo: true };
    });
    const rows = Object.values(G).sort((a, b) => b.n - a.n);
    v.innerHTML = `<div class="wrap">
      ${nota("Contabilidad, proveeduría, ventas, gerencia, crédito, bodega… Cada colaborador pertenece a uno y la planilla reparte su costo por departamento en el asiento.", "users")}
      ${card({
        title: "Departamentos",
        hint: "vinculados a nómina",
        actions: `<button class="btn sm" data-ir="nom-personal">${icon("users")}Personal</button><button class="btn sm pri" id="depNuevo">${icon("plus")}Departamento</button>`,
        body: table({
          cols: [
            {
              t: "Departamento",
              fmt: (r) =>
                `<b>${esc(nombre("d:" + r.a, r.a))}</b>${r.nuevo ? " " + tag("nuevo", "ok") : ""}`,
            },
            {
              t: "Personas",
              r: true,
              cls: "mono",
              fmt: (r) => r.n || '<span class="dim">—</span>',
            },
            {
              t: "Locales",
              fmt: (r) =>
                Object.keys(r.locs)
                  .map((l) => tag(locNom(l), "mu"))
                  .join(" ") || '<span class="dim">—</span>',
            },
            {
              t: "Centro de costo",
              cls: "mono",
              fmt: (r) =>
                `<span class="mut" style="font-size:12.5px">${esc(depX(r.a).cuenta)}</span>`,
            },
            {
              t: "",
              r: true,
              fmt: (r) =>
                `<button class="btn sm" data-deped="${esc(r.a)}|${r.n}">Editar</button>`,
            },
          ],
          rows,
        }),
      })}</div>`;
  }
  function fichaDepartamento(a, n) {
    const nuevo = a == null,
      x = nuevo
        ? { jefe: "", cuenta: "CC-30 Administración", activo: true }
        : depX(a);
    ficha({
      title: nuevo ? "Nuevo departamento" : nombre("d:" + a, a),
      sub: nuevo ? "" : n + " personas",
      campos: [
        {
          id: "nom",
          l: "Nombre",
          v: nuevo ? "" : nombre("d:" + a, a),
          req: true,
        },
        {
          id: "jefe",
          l: "Jefatura",
          tipo: "select",
          opts: [""].concat(D.colaboradores.map((c2) => c2.nom)),
          v: x.jefe,
        },
        {
          id: "cuenta",
          l: "Centro de costo",
          tipo: "select",
          opts: Object.values(CUENTAS_DEP).filter(
            (c2, i, arr) => arr.indexOf(c2) === i,
          ),
          v: x.cuenta,
          hint: "La planilla se asienta en Salarios (6-01-01-001) y Cargas sociales patronales (6-01-01-002); el centro de costo identifica el departamento de cada persona.",
        },
      ],
      peligro: nuevo
        ? null
        : {
            t: "Inactivar",
            ic: "lock",
            dis: n > 0,
            why: n > 0 ? "Tiene " + n + " personas: muévalas antes." : "",
            fn: () => {
              x.activo = false;
              anotar("Inactivó departamento", a);
              return { t: "Departamento inactivado" };
            },
          },
      guardar(v) {
        if (nuevo) {
          NUEVOS_DEP.push(v.nom);
          DEP_X[v.nom] = { jefe: v.jefe, cuenta: v.cuenta, activo: true };
          anotar("Creó departamento", v.nom);
          return {
            t: "Departamento creado",
            s: "Ya se puede asignar en el expediente de cada persona.",
          };
        }
        Object.assign(x, { jefe: v.jefe, cuenta: v.cuenta });
        const act = nombre("d:" + a, a);
        if (v.nom !== act) {
          NOMBRES["d:" + a] = v.nom;
          HIST.unshift({
            fecha: new Date(D.HOY),
            cat: "Departamento",
            antes: act,
            despues: v.nom,
            por: yo(),
            ej: "Las planillas anteriores siguen diciendo «" + act + "»",
          });
        }
        anotar("Modificó departamento", act, "Media", act, v.nom);
        return { t: "Departamento actualizado" };
      },
    });
  }
  function departamentosWire(v) {
    A.wireIr(v);
    $("#depNuevo", v).addEventListener("click", () =>
      fichaDepartamento(null, 0),
    );
    $$("[data-deped]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const [a, n] = b.dataset.deped.split("|");
        fichaDepartamento(a, +n);
      }),
    );
  }
  /* unidades de medida y presentaciones */
  const HCOD = {
    Unid: "Unid",
    kg: "kg",
    m: "m",
    "m³": "m³",
    Saco: "Unid",
    Juego: "Unid",
    Cubeta: "Unid",
    Galón: "Gal",
    Par: "Unid",
    Corte: "Unid",
    Servicio: "Sp",
    Hora: "h",
    Viaje: "Os",
    Evento: "Os",
  };
  const UNID_X = {};
  const NUEVAS_UNID = [];
  const unidX = (u) =>
    UNID_X[u] ||
    (UNID_X[u] = {
      dec: /kg|m|m³|Galón|Hora/.test(u) ? 3 : 0,
      cod: HCOD[u] || "Unid",
    });
  const PRES = [
    {
      art: "Cemento gris 50 kg",
      base: "Saco",
      pres: "Tarima de 40 sacos",
      f: 40,
    },
    { art: 'Clavo de 2½"', base: "kg", pres: "Caja de 25 kg", f: 25 },
    { art: "Cable eléctrico #12", base: "m", pres: "Rollo de 100 m", f: 100 },
    { art: 'Tubo PVC ½" SDR 17', base: "Unid", pres: "Paquete de 10", f: 10 },
    {
      art: "Pintura látex blanco",
      base: "Galón",
      pres: "Cubeta de 5 galones",
      f: 5,
    },
  ];
  function unidades(v) {
    const U2 = {};
    D.articulos.forEach((a) => {
      U2[a.unidad] = (U2[a.unidad] || 0) + 1;
    });
    NUEVAS_UNID.forEach((u) => {
      if (!U2[u]) U2[u] = 0;
    });
    const rows = Object.keys(U2)
      .map((u) => ({ u, n: U2[u] }))
      .sort((a, b) => b.n - a.n);
    v.innerHTML = `<div class="grid" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);align-items:start">
      ${card({
        title: "Unidades de medida",
        hint: "con su código para el comprobante electrónico",
        actions: `<button class="btn sm pri" id="unNueva">${icon("plus")}Unidad</button>`,
        body: table({
          cols: [
            { t: "Unidad", fmt: (r) => `<b>${esc(r.u)}</b>` },
            {
              t: "Código Hacienda",
              cls: "mono",
              fmt: (r) => esc(unidX(r.u).cod),
            },
            {
              t: "Decimales",
              r: true,
              cls: "mono",
              fmt: (r) =>
                unidX(r.u).dec
                  ? unidX(r.u).dec
                  : '<span class="dim">enteros</span>',
            },
            {
              t: "Artículos",
              r: true,
              cls: "mono",
              fmt: (r) => r.n || '<span class="dim">—</span>',
            },
            {
              t: "",
              r: true,
              fmt: (r) =>
                `<button class="btn sm" data-uned="${esc(r.u)}|${r.n}">Editar</button>`,
            },
          ],
          rows,
        }),
      })}
      ${card({
        title: "Presentaciones",
        hint: "se vende o se compra en otra unidad",
        body:
          table({
            cols: [
              { t: "Artículo", fmt: (r) => `<b>${esc(r.art)}</b>` },
              { t: "Presentación", fmt: (r) => esc(r.pres) },
              {
                t: "Equivale a",
                r: true,
                cls: "mono",
                fmt: (r) => r.f + " " + esc(r.base),
              },
            ],
            rows: PRES,
          }) +
          `<div style="margin-top:12px">${nota("La presentación se define en la ficha del artículo; aquí se ve el conjunto. El inventario siempre se lleva en la unidad base.", "box")}</div>`,
      })}
    </div>`;
  }
  function unidadesWire(v) {
    const f = (u, n) => {
      const nueva = u == null,
        x = nueva ? { dec: 0, cod: "Unid" } : unidX(u);
      ficha({
        title: nueva ? "Nueva unidad de medida" : u,
        sub: nueva ? "" : n + " artículos",
        campos: [
          { id: "nom", l: "Nombre", v: nueva ? "" : u, req: true, dis: !nueva },
          {
            id: "cod",
            l: "Código en el comprobante",
            tipo: "select",
            opts: [
              "Unid",
              "kg",
              "g",
              "m",
              "cm",
              "m²",
              "m³",
              "L",
              "Gal",
              "h",
              "Sp",
              "Os",
            ],
            v: x.cod,
            corto: true,
            hint: "Lo exige Hacienda en cada línea.",
          },
          {
            id: "dec",
            l: "Decimales",
            tipo: "select",
            opts: ["0", "1", "2", "3"],
            v: String(x.dec),
            corto: true,
            hint: "Clavos y cable se venden con decimales.",
          },
        ],
        guardar(y) {
          if (nueva) {
            NUEVAS_UNID.push(y.nom);
            UNID_X[y.nom] = { dec: +y.dec, cod: y.cod };
            anotar("Creó unidad de medida", y.nom);
            return { t: "Unidad creada" };
          }
          Object.assign(x, { dec: +y.dec, cod: y.cod });
          anotar("Modificó unidad de medida", u);
          return { t: "Unidad actualizada" };
        },
      });
    };
    $("#unNueva", v).addEventListener("click", () => f(null, 0));
    $$("[data-uned]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const [u, n] = b.dataset.uned.split("|");
        f(u, +n);
      }),
    );
  }
  A.workspace("sis-categorias", {
    title: "Categorías, marcas y unidades",
    tabs: [
      {
        id: "categorias",
        t: "Categorías",
        sub: "Padre e hija, dos niveles; deben existir antes de crear el artículo",
        render: categorias,
        wire: categoriasWire,
      },
      {
        id: "marcas",
        t: "Marcas",
        sub: "Las marcas del catálogo y quién las negocia",
        render: marcas,
        wire: marcasWire,
      },
      {
        id: "unidades",
        t: "Unidades y presentaciones",
        sub: "Unidad base, decimales y código para el comprobante",
        render: unidades,
        wire: unidadesWire,
      },
    ],
  });

  /* ── 4 · UBICACIÓN FÍSICA DE ARTÍCULOS (SIS-009) ── */
  const TRAS = { L1: 18, L2: 24, L3: 7, L4: 5, L5: 3, L6: 0, L7: 4 };
  function estructura(v) {
    const rows = tiendas.map((l) => {
      const arts = D.articulos.filter(
        (a) =>
          a.tipo === "Producto" &&
          D.existencias[a.id] &&
          D.existencias[a.id][l.id],
      );
      const con = arts.filter((a) => I && I.ubic(a.id, l.id));
      const pas = {};
      con.forEach((a) => {
        const m = /^([A-Z])\d/.exec(I.ubic(a.id, l.id) || "");
        if (m) pas[m[1]] = true;
      });
      return {
        l,
        total: arts.length,
        con: con.length,
        pas: Object.keys(pas).sort(),
        tras: TRAS[l.id] || 0,
      };
    });
    v.innerHTML = `<div class="wrap">
      <div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);align-items:start">
        ${card({
          title: "Ubicación por local",
          hint: "la caja muestra dónde está cada artículo",
          body: table({
            cols: [
              { t: "Local", fmt: (r) => `<b>${esc(r.l.nom)}</b>` },
              {
                t: "Pasillos",
                fmt: (r) =>
                  r.pas.length
                    ? r.pas.join(" · ")
                    : '<span class="dim">—</span>',
              },
              {
                t: "Con ubicación",
                fmt: (r) =>
                  `<div style="min-width:140px">${prog([{ w: r.total ? (r.con / r.total) * 100 : 0, col: r.con === r.total ? "var(--ok)" : "var(--accent)" }])}<div class="num" style="font-size:11.5px;color:var(--ink-3)">${r.con} de ${r.total}</div></div>`,
              },
              {
                t: "En trastienda",
                r: true,
                cls: "mono",
                fmt: (r) => (r.tras ? r.tras : '<span class="dim">—</span>'),
              },
              {
                t: "",
                r: true,
                fmt: (r) =>
                  `<button class="btn sm" data-ubed="${r.l.id}">Editar estructura</button>`,
              },
            ],
            rows,
          }),
        })}
        ${card({
          title: "Cómo se escribe una ubicación",
          body: `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${[
            ["C", "Pasillo"],
            ["1", "Anaquel"],
            ["A", "Cara"],
            ["04", "Estante"],
          ]
            .map(
              (x) =>
                `<div style="text-align:center;border:1px solid var(--hair);border-radius:10px;padding:8px 12px;min-width:74px"><div class="num" style="font-size:20px;font-weight:700">${x[0]}</div><div class="mut" style="font-size:11.5px">${x[1]}</div></div>`,
            )
            .join("")}</div>
          <div class="mut" style="font-size:12.5px;line-height:1.55">Se lee «Pasillo C · anaquel 1 · cara A · estante 4». Cada artículo puede tener una segunda ubicación en la trastienda para lo que no cabe en el piso. Sale en la caja, en el conteo y en la etiqueta del estante.</div>`,
        })}
      </div></div>`;
  }
  const EST = {};
  const estDe = (id) =>
    EST[id] ||
    (EST[id] = {
      pas: "A–" + "CDEFGH"[Object.keys(EST).length % 6],
      an: 6,
      caras: "A y B",
      est: 5,
      tras: (TRAS[id] || 0) > 0,
    });
  function estructuraWire(v) {
    $$("[data-ubed]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.ubed,
          x = estDe(id);
        ficha({
          title: "Estructura de " + locNom(id),
          sub: "Cómo está numerado el piso de venta",
          campos: [
            {
              id: "pas",
              l: "Pasillos",
              v: x.pas,
              corto: true,
              hint: "Letras, de la entrada hacia el fondo.",
            },
            {
              id: "an",
              l: "Anaqueles por pasillo",
              tipo: "num",
              v: x.an,
              corto: true,
            },
            {
              id: "caras",
              l: "Caras",
              tipo: "select",
              opts: ["A y B", "Izquierda y derecha", "Una sola"],
              v: x.caras,
              corto: true,
            },
            {
              id: "est",
              l: "Estantes por anaquel",
              tipo: "num",
              v: x.est,
              corto: true,
            },
            {
              id: "tras",
              l: "Segunda ubicación en trastienda",
              tipo: "switch",
              v: x.tras,
            },
          ],
          nota: "Al guardar se generan las etiquetas de los estantes nuevos. Los artículos ya ubicados no se mueven.",
          notaIc: "print",
          guardar(y) {
            Object.assign(x, {
              pas: y.pas,
              an: +y.an || x.an,
              caras: y.caras,
              est: +y.est || x.est,
              tras: y.tras,
            });
            anotar("Modificó estructura de ubicaciones", locNom(id));
            return {
              t: "Estructura guardada",
              s: "Las etiquetas nuevas quedaron en la cola de impresión.",
            };
          },
        });
      }),
    );
  }
  let ubLoc = "L2";
  function sinUbic(v) {
    const L = I ? I.sinUbicacion(ubLoc) : [];
    v.innerHTML = `<div class="wrap">
      <div style="display:flex;justify-content:flex-end">${seg(
        "ubl",
        tiendas.map((l) => ({ v: l.id, t: l.nom })),
        ubLoc,
      )}</div>
      ${card({
        title: "Artículos sin ubicación en " + locNom(ubLoc),
        hint: L.length ? L.length + " por ubicar" : "",
        body: L.length
          ? table({
              cols: [
                {
                  t: "Artículo",
                  fmt: (x) =>
                    `<b>${esc(x.a.desc)}</b><span class="sub ui">${esc(x.a.cod)} · ${esc(D.famById[x.a.fam].nom)}</span>`,
                },
                {
                  t: "Existencia",
                  r: true,
                  cls: "mono",
                  fmt: (x) =>
                    grp(
                      D.stock(x.a.id, x.locId)
                        ? D.stock(x.a.id, x.locId).cant
                        : 0,
                    ),
                },
                {
                  t: "",
                  r: true,
                  fmt: (x, i) =>
                    `<button class="btn sm pri" data-ub="${i}">${icon("pin")}Ubicar</button>`,
                },
              ],
              rows: L,
            })
          : empty(
              "check",
              "Todo ubicado",
              "Cada artículo de " + locNom(ubLoc) + " tiene su lugar.",
            ),
      })}</div>`;
    v._L = L;
  }
  function sinUbicWire(v) {
    const p = $("#tp-sis-ubicaciones", v);
    onSeg(document, "ubl", (x) => {
      ubLoc = x;
      A.refresh();
    });
    $$("[data-ub]", p).forEach((b) =>
      b.addEventListener("click", () => {
        const x = p._L[+b.dataset.ub];
        openSheet({
          title: "Ubicar artículo",
          sub: x.a.desc + " · " + locNom(x.locId),
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
              const P =
                ($("#ubP", el).value || "C")
                  .toUpperCase()
                  .replace(/[^A-Z]/g, "") || "C";
              const code =
                P +
                (parseInt($("#ubA", el).value, 10) || 1) +
                "-" +
                String(parseInt($("#ubE", el).value, 10) || 1).padStart(2, "0");
              const cara = $("#ubC", el).value;
              I.ubicar(x.a.id, x.locId, code);
              closeSheet();
              toast(
                "Ubicado · " + I.ubicTexto(code) + " · cara " + cara,
                "La etiqueta quedó en la cola de impresión.",
                "ok",
              );
              A.refresh();
            });
          },
        });
      }),
    );
  }
  A.workspace("sis-ubicaciones", {
    title: "Ubicación física de artículos",
    tabs: [
      {
        id: "estructura",
        t: "Por local",
        sub: "Pasillo, anaquel, cara y estante, con segunda ubicación en trastienda",
        render: estructura,
        wire: estructuraWire,
      },
      {
        id: "sin",
        t: "Sin ubicación",
        sub: "Lo que el vendedor todavía busca a ciegas",
        badge: () => {
          const n = I ? I.sinUbicacion().length : 0;
          return { n, k: "wa", l: n + " por ubicar" };
        },
        render: sinUbic,
        wire: sinUbicWire,
      },
    ],
  });

  /* ── 5 · TÉRMINOS DE PAGO (SIS-005) ── */
  const TERM = [
    { t: "Contado", d: 0, a: "Ambos", pp: "", nota: "Se paga al facturar" },
    {
      t: "Conta ruta",
      d: 1,
      a: "Clientes",
      pp: "",
      nota: "Contado para el cliente, crédito de un día para el sistema; se liquida desde la caja",
    },
    { t: "Crédito 15 días", d: 15, a: "Ambos", pp: "" },
    { t: "Crédito 30 días", d: 30, a: "Ambos", pp: "2 % si paga en 10 días" },
    {
      t: "Crédito 44 días",
      d: 44,
      a: "Proveedores",
      pp: "",
      nota: "Plazo negociado con un proveedor",
    },
    { t: "Crédito 45 días", d: 45, a: "Ambos", pp: "3 % si paga en 15 días" },
    { t: "Crédito 60 días", d: 60, a: "Ambos", pp: "" },
    { t: "Crédito 90 días", d: 90, a: "Proveedores", pp: "" },
  ];
  A.screen("sis-terminos", {
    title: "Términos de pago",
    sub: () =>
      "Los plazos que se negocian con clientes y proveedores, con su pronto pago",
    extra: () =>
      `<button class="btn pri" id="tpNuevo">${icon("plus")}Término</button>`,
    render(v) {
      const nCli = (d) => D.clientes.filter((x) => (x.plazo || 0) === d).length,
        nProv = (d) => D.proveedores.filter((x) => x.plazo === d).length;
      v.innerHTML = `<div class="wrap">
        ${card({
          body: table({
            cols: [
              {
                t: "Término",
                fmt: (r) =>
                  `<b>${esc(r.t)}</b>${r.nota ? `<span class="sub ui">${esc(r.nota)}</span>` : ""}`,
              },
              { t: "Días", r: true, cls: "mono", fmt: (r) => r.d },
              {
                t: "Aplica a",
                fmt: (r) => tag(r.a, r.a === "Ambos" ? "ac" : "mu"),
              },
              {
                t: "Pronto pago",
                fmt: (r) =>
                  r.pp ? tag(r.pp, "ok") : '<span class="dim">—</span>',
              },
              {
                t: "Clientes",
                r: true,
                cls: "mono",
                fmt: (r) =>
                  r.a !== "Proveedores" && nCli(r.d)
                    ? nCli(r.d)
                    : '<span class="dim">—</span>',
              },
              {
                t: "Proveedores",
                r: true,
                cls: "mono",
                fmt: (r) =>
                  r.a !== "Clientes" && nProv(r.d)
                    ? nProv(r.d)
                    : '<span class="dim">—</span>',
              },
              {
                t: "",
                r: true,
                fmt: (r, i) =>
                  `<button class="btn sm" data-tped="${i}">Editar</button>`,
              },
            ],
            rows: TERM,
            rowCls: (r) => (r.inactivo ? "wa" : ""),
          }),
        })}
        ${nota("Cada negociación con un proveedor puede tener su plazo. El término alimenta el vencimiento de las cuentas por cobrar y por pagar, y el pronto pago aparece en el lote de pagos cuando todavía conviene tomarlo.", "calc")}</div>`;
    },
    wire(v) {
      $$("[data-tped]", v).forEach((bt) =>
        bt.addEventListener("click", () => {
          const r = TERM[+bt.dataset.tped];
          const usado =
            (r.a !== "Proveedores"
              ? D.clientes.filter((x) => (x.plazo || 0) === r.d).length
              : 0) +
            (r.a !== "Clientes"
              ? D.proveedores.filter((x) => x.plazo === r.d).length
              : 0);
          ficha({
            title: r.t,
            sub: "Plazo que alimenta el vencimiento de cuentas por cobrar y por pagar",
            campos: [
              { id: "t", l: "Nombre", v: r.t, req: true },
              { id: "d", l: "Días", tipo: "num", v: r.d, corto: true },
              {
                id: "a",
                l: "Aplica a",
                tipo: "select",
                opts: ["Ambos", "Clientes", "Proveedores"],
                v: r.a,
                corto: true,
              },
              {
                id: "pp",
                l: "Pronto pago",
                v: r.pp,
                ph: "Por ejemplo: 2 % si paga en 10 días",
              },
              { id: "nota", l: "Nota", v: r.nota || "" },
            ],
            nota: "Cambiar el término no cambia el vencimiento de las facturas ya emitidas.",
            notaIc: "history",
            peligro: {
              t: r.inactivo ? "Reactivar" : "Inactivar",
              ic: "lock",
              dis: !r.inactivo && usado > 0,
              why:
                !r.inactivo && usado > 0
                  ? "Lo usan " +
                    usado +
                    " clientes o proveedores: cámbielos antes."
                  : "",
              fn: () => {
                r.inactivo = !r.inactivo;
                anotar(
                  (r.inactivo ? "Inactivó" : "Reactivó") + " término de pago",
                  r.t,
                );
                return {
                  t: r.inactivo ? "Término inactivado" : "Término reactivado",
                };
              },
            },
            guardar(x) {
              const antes = r.t;
              Object.assign(r, {
                t: x.t,
                d: parseInt(x.d, 10) || 0,
                a: x.a,
                pp: x.pp,
                nota: x.nota,
              });
              TERM.sort((p, q) => p.d - q.d);
              anotar("Modificó término de pago", antes, "Media", antes, x.t);
              return { t: "Término actualizado" };
            },
          });
        }),
      );
      const b = $("#tpNuevo");
      if (b)
        b.addEventListener("click", () =>
          openSheet({
            title: "Nuevo término de pago",
            body: `<div class="grid" style="grid-template-columns:1fr 1fr;gap:10px"><div class="field"><label for="tpD">Días</label><input id="tpD" class="num" value="21"></div>
            <div class="field"><label for="tpA">Aplica a</label><select id="tpA"><option>Ambos</option><option>Clientes</option><option>Proveedores</option></select></div></div>
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px"><div class="field"><label for="tpP">Pronto pago %</label><input id="tpP" class="num" placeholder="opcional"></div>
            <div class="field"><label for="tpPd">Si paga en (días)</label><input id="tpPd" class="num" placeholder="opcional"></div></div>`,
            footer: `<button class="btn" data-cerrar>Cancelar</button><div class="gap"></div><button class="btn pri" id="tpOk">Guardar</button>`,
            after(el) {
              cerrar(el);
              $("#tpOk", el).addEventListener("click", () => {
                const d = parseInt($("#tpD", el).value, 10);
                if (!(d >= 0)) return toast("Revise los días", "", "cr");
                const pp = parseFloat($("#tpP", el).value),
                  pd = parseInt($("#tpPd", el).value, 10);
                TERM.push({
                  t: d ? "Crédito " + d + " días" : "Contado",
                  d,
                  a: $("#tpA", el).value,
                  pp: pp && pd ? pp + " % si paga en " + pd + " días" : "",
                });
                TERM.sort((a, b) => a.d - b.d);
                anotar("Creó término de pago", d + " días");
                closeSheet();
                toast(
                  "Término creado",
                  "Ya se puede asignar a clientes y proveedores.",
                  "ok",
                );
                A.refresh();
              });
            },
          }),
        );
    },
  });

  /* ── 6 · ESTADOS DE LOS DOCUMENTOS (SIS-008, SIS-011) ── */
  const FLUJOS = [
    { doc: "Orden de compra", est: ["Registrada", "Aplicada", "Anulada"] },
    { doc: "Compra", est: ["Registrada", "Aplicada", "Anulada"] },
    { doc: "Factura de venta", est: ["En curso", "Aplicada", "Anulada"] },
    { doc: "Proforma", est: ["Vigente", "Convertida", "Vencida"], rev: true },
    {
      doc: "Despacho",
      est: ["Pendiente de alistar", "Alistado", "En ruta", "Entregado"],
    },
    { doc: "Traslado", est: ["Registrado", "En tránsito", "Recibido"] },
    {
      doc: "Planilla",
      est: ["En cálculo", "Aprobada", "Pagada", "Contabilizada"],
    },
    {
      doc: "Cliente y proveedor",
      est: ["Registrado", "Activo", "Inactivo"],
      rev: true,
    },
    { doc: "Caja", est: ["Abierta", "Cerrada"] },
  ];
  function flujos(v) {
    v.innerHTML = `<div class="wrap">
      ${nota("<b>Aplicado</b> significa que el documento tomó su consecutivo, quedó con fecha, hora y usuario, y ya no se puede modificar: se corrige con otro documento (anulación, nota de crédito, ajuste).", "lock")}
      ${card({
        title: "Flujo de estados por documento",
        hint: "clic en un estado para renombrarlo",
        body: FLUJOS.map(
          (
            f,
            fi,
          ) => `<div class="pref-row" style="align-items:center"><span class="pt"><div class="pn">${esc(f.doc)}</div><div class="pd">${f.rev ? "Puede volver a un estado anterior" : "Cada paso es irreversible"}</div></span>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end">${f.est.map((e, k) => `${k ? `<span class="dim">${icon("chev", 'style="width:14px;height:14px"')}</span>` : ""}<button class="tag ${k === f.est.length - 1 ? "mu" : "acc"}" data-est="${fi}:${k}" style="cursor:pointer" title="Renombrar este estado">${esc(nombre("e:" + f.doc + ":" + e, e))}</button>`).join("")}</div></div>`,
        ).join(""),
      })}</div>`;
  }
  function flujosWire(v) {
    $$("[data-est]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const [fi, k] = b.dataset.est.split(":").map(Number),
          f = FLUJOS[fi],
          e = f.est[k];
        renombrar(
          "e:" + f.doc + ":" + e,
          nombre("e:" + f.doc + ":" + e, e),
          "Estado de " + f.doc.toLowerCase(),
        );
      }),
    );
  }
  function historialNombres(v) {
    v.innerHTML = `<div class="wrap">
      ${nota("Renombrar un estado, una categoría o un departamento no altera cómo se leen los documentos ya emitidos: cada documento guarda el nombre vigente cuando se emitió.", "history")}
      ${card({
        title: "Cambios de nombre",
        hint: HIST.length + "",
        body: table({
          cols: [
            { t: "Fecha", cls: "mono", fmt: (r) => fecha(r.fecha) },
            { t: "Catálogo", fmt: (r) => esc(r.cat) },
            {
              t: "Cambio",
              fmt: (r) =>
                `${esc(r.antes)} ${icon("chev", 'style="width:13px;height:13px;color:var(--ink-4)"')} <b>${esc(r.despues)}</b>`,
            },
            {
              t: "Lo ya emitido",
              fmt: (r) =>
                `<span class="mut" style="font-size:12.5px">${esc(r.ej)}</span>`,
            },
            { t: "Por", fmt: (r) => esc(r.por) },
          ],
          rows: HIST,
        }),
      })}</div>`;
  }
  /* numeración interna de documentos (la fiscal vive en Facturación electrónica) */
  /* comprobantes fiscales: una serie por sucursal + terminal + tipo; el
     próximo número es el de la caja activa, leído de la serie real */
  const FISCALES = [
    ["FE", "Factura electrónica"],
    ["TE", "Tiquete electrónico"],
    ["NC", "Nota de crédito electrónica"],
    ["ND", "Nota de débito electrónica"],
    ["REP", "Recibo electrónico de pago"],
    ["FEC", "Factura electrónica de compra"],
  ];
  const filasNum = () =>
    FISCALES.map(([tipo, doc]) => ({
      doc: doc + " (" + D.TIPO_COD[tipo] + ")",
      fmt: "Sucursal · terminal · tipo · consecutivo",
      ej: D.puedeEmitir(S.locId, S.term)
        ? D.proximoConsec(tipo, S.locId, S.term)
        : "Esta terminal no emite",
      rein: "Nunca",
      fiscal: true,
    })).concat(NUMS);
  const pad6 = (n) => String(n).padStart(6, "0");
  const NUMS = [
    {
      doc: "Proforma y pedido",
      fmt: "PROF-{n}",
      get ej() { return "PROF-" + pad6(D.seq.PROF + 1); },
      rein: "Nunca",
    },
    {
      doc: "Orden de compra",
      fmt: "OC-{año}-{n}",
      get ej() { return "OC-" + D.HOY.getFullYear() + "-" + pad6(D.seq.OC + 1); },
      rein: "Cada año",
    },
    {
      doc: "Compra",
      fmt: "CO-{año}-{n}",
      ej: "CO-2026-018221",
      rein: "Cada año",
    },
    { doc: "Traslado", fmt: "TR-{n}", get ej() { return "TR-" + pad6(D.seq.TR + 1); }, rein: "Nunca" },
    {
      doc: "Despacho",
      fmt: "DES-{local}-{n}",
      ej: "DES-003-004120",
      rein: "Nunca",
    },
    {
      doc: "Recibo de dinero",
      fmt: "RD-{local}-{n}",
      ej: "RD-002-011874",
      rein: "Nunca",
    },
    {
      doc: "Ajuste de inventario",
      fmt: "AJ-{n}",
      get ej() { return "AJ-" + pad6(D.seq.AJ + 1); },
      rein: "Nunca",
    },
    {
      doc: "Asiento contable",
      fmt: "AS-{n}",
      get ej() { return "AS-" + (D.seq.AS + 1); },
      rein: "Nunca",
    },
    {
      doc: "Solicitud de autorización",
      fmt: "EX-{n}",
      ej: "EX-2292",
      rein: "Nunca",
    },
  ];
  function numeracion(v) {
    v.innerHTML = `<div class="wrap">
      ${nota("El número se asigna <b>al aplicar</b>, nunca al registrar: un borrador que se descarta no deja huecos. La numeración fiscal (sucursal + terminal + tipo) la controla Facturación electrónica y no se edita aquí.", "file")}
      ${card({
        title: "Numeración de documentos",
        hint: filasNum().length + " tipos · los fiscales, de la caja activa",
        body: table({
          cols: [
            {
              t: "Documento",
              fmt: (r) =>
                `<b>${esc(r.doc)}</b>${r.fiscal ? " " + tag("fiscal", "acc") : ""}`,
            },
            { t: "Formato", cls: "mono", fmt: (r) => esc(r.fmt) },
            {
              t: "Próximo número",
              cls: "mono",
              fmt: (r) => `<b>${esc(r.ej)}</b>`,
            },
            { t: "Reinicia", fmt: (r) => esc(r.rein) },
            {
              t: "",
              r: true,
              fmt: (r, i) =>
                r.fiscal
                  ? `<button class="btn sm" data-ir="fel-consecutivos">Ver en Facturación</button>`
                  : `<button class="btn sm" data-numed="${i}">Editar</button>`,
            },
          ],
          rows: filasNum(),
        }),
      })}</div>`;
  }
  function numeracionWire(v) {
    A.wireIr(v);
    $$("[data-numed]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const r = filasNum()[+b.dataset.numed];
        ficha({
          title: "Numeración · " + r.doc,
          sub: "Rige para los documentos que se apliquen desde ahora",
          campos: [
            {
              id: "fmt",
              l: "Formato",
              v: r.fmt,
              hint: "Use {local}, {año} y {n}. El número nunca se repite.",
            },
            {
              id: "rein",
              l: "Reinicia",
              tipo: "select",
              opts: ["Nunca", "Cada año"],
              v: r.rein,
              corto: true,
            },
            {
              id: "dig",
              l: "Dígitos del número",
              tipo: "select",
              opts: ["4", "5", "6"],
              v: String((r.ej.match(/(\d+)$/) || ["", "000000"])[1].length),
              corto: true,
            },
          ],
          nota: "Cambiar el formato no renumera lo ya emitido.",
          notaIc: "history",
          guardar(x) {
            const antes = r.fmt;
            r.fmt = x.fmt;
            r.rein = x.rein;
            anotar("Cambió numeración", r.doc, "Alta", antes, x.fmt);
            return {
              t: "Numeración actualizada",
              s:
                "El próximo " +
                r.doc.toLowerCase() +
                " sale con el formato nuevo.",
            };
          },
        });
      }),
    );
  }
  /* catálogo de motivos: nadie escribe «.» como justificación */
  const MOTIVOS = [
    {
      g: "Anulación de documento",
      req: "SEG-009",
      det: true,
      items: [
        "Error en datos del cliente",
        "Documento duplicado",
        "Error de precio o cantidad",
        "Cliente desistió antes de retirar",
      ],
    },
    {
      g: "Devolución de cliente",
      det: true,
      items: [
        "Producto defectuoso",
        "No era lo que necesitaba",
        "Sobrante de obra",
        "Garantía del fabricante",
      ],
    },
    {
      g: "Nota de crédito a cliente",
      det: false,
      items: [
        "Devolución",
        "Descuento",
        "Exoneración",
        "Garantía",
        "Intereses",
        "Rebajo por planilla a trabajadores",
      ],
    },
    {
      g: "Ajuste de inventario",
      det: true,
      items: [
        "Merma por daño",
        "Diferencia de conteo",
        "Faltante sin explicar",
        "Vencimiento",
      ],
    },
    {
      g: "Venta perdida",
      det: false,
      items: ["Precio", "Sin existencia", "Tiempo de entrega", "Solo cotizaba"],
    },
    {
      g: "Rechazo de comprobante de proveedor",
      det: true,
      items: [
        "No coincide con lo recibido",
        "Precio distinto al de la orden",
        "Artículo no solicitado",
      ],
    },
  ];
  function motivos(v) {
    v.innerHTML = `<div class="wrap">
      ${nota("Cada anulación, devolución o ajuste pide un motivo de esta lista y, donde se indica, un detalle escrito de al menos 15 caracteres. En el sistema actual el comentario obligatorio acepta un punto.", "clip")}
      <div class="grid g2" style="align-items:start">${MOTIVOS.map((g, gi) =>
        card({
          title: g.g,
          chip: g.req ? reqTag(g.req) : "",
          actions: `<button class="btn sm" data-moag="${gi}">${icon("plus")}Motivo</button>`,
          body:
            g.items
              .map(
                (m, i) =>
                  `<div class="pref-row" style="padding:8px 0"><span class="pt"><div class="pn" style="font-size:13.5px;font-weight:600">${esc(nombre("mo:" + g.g + ":" + m, m))}</div></span><button class="btn sm" data-moed="${gi}|${i}">Editar</button></div>`,
              )
              .join("") +
            prefRow(
              "Pide detalle escrito",
              "Mínimo 15 caracteres, además del motivo.",
              swt(
                g.det,
                `data-modet="${gi}" aria-label="Pide detalle escrito en ${esc(g.g)}"`,
              ),
              'style="border-top:1px solid var(--hair);margin-top:4px"',
            ),
        }),
      ).join("")}</div></div>`;
  }
  function motivosWire(v) {
    $$("[data-modet]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const g = MOTIVOS[+b.dataset.modet];
        g.det = !g.det;
        anotar(
          "Cambió detalle obligatorio",
          g.g,
          "Media",
          g.det ? "No" : "Sí",
          g.det ? "Sí" : "No",
        );
        A.refresh();
      }),
    );
    $$("[data-moag]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const g = MOTIVOS[+b.dataset.moag];
        ficha({
          title: "Nuevo motivo",
          sub: g.g,
          campos: [{ id: "m", l: "Motivo", req: true }],
          ok: "Agregar",
          guardar(x) {
            g.items.push(x.m);
            anotar("Creó motivo", g.g + " · " + x.m);
            return {
              t: "Motivo agregado",
              s:
                "Ya aparece en la lista al " +
                g.g.toLowerCase().split(" ")[0] +
                ".",
            };
          },
        });
      }),
    );
    $$("[data-moed]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const [gi, i] = b.dataset.moed.split("|").map(Number),
          g = MOTIVOS[gi],
          m = g.items[i],
          k = "mo:" + g.g + ":" + m,
          act = nombre(k, m);
        ficha({
          title: act,
          sub: g.g,
          campos: [{ id: "m", l: "Nombre", v: act, req: true }],
          peligro: {
            t: "Inactivar",
            ic: "lock",
            fn: () => {
              g.items.splice(i, 1);
              anotar("Inactivó motivo", g.g + " · " + act);
              return {
                t: "Motivo inactivado",
                s: "Los documentos que lo usaron lo conservan.",
              };
            },
          },
          guardar(x) {
            if (x.m === act) return { t: "Sin cambios", k: "in" };
            NOMBRES[k] = x.m;
            HIST.unshift({
              fecha: new Date(D.HOY),
              cat: "Motivo de " + g.g.toLowerCase(),
              antes: act,
              despues: x.m,
              por: yo(),
              ej: "Lo aplicado antes de hoy conserva «" + act + "»",
            });
            anotar("Renombró motivo", act + " → " + x.m, "Media", act, x.m);
            return { t: "Motivo renombrado", s: "Lo ya aplicado no cambia." };
          },
        });
      }),
    );
  }

  A.workspace("sis-estados", {
    title: "Estados, numeración y motivos",
    tabs: [
      {
        id: "flujos",
        t: "Flujos",
        sub: "Registrado, aplicado, anulado: lo aplicado ya no se toca",
        render: flujos,
        wire: flujosWire,
      },
      {
        id: "numeracion",
        t: "Numeración",
        sub: "El número se asigna al aplicar; un borrador descartado no deja huecos",
        render: numeracion,
        wire: numeracionWire,
      },
      {
        id: "motivos",
        t: "Motivos",
        sub: "Anulación, devolución, ajuste y venta perdida: siempre con motivo",
        render: motivos,
        wire: motivosWire,
      },
      {
        id: "nombres",
        t: "Cambios de nombre",
        sub: "Lo renombrado no cambia lo ya emitido",
        badge: () => ({ n: HIST.length, k: "", l: "cambios" }),
        render: historialNombres,
      },
    ],
  });

  /* ── 7 · VERSIONES Y AMBIENTE DE PRUEBAS (SIS-010) ── */
  const VER = {
    prox: "1.9.0",
    estado: "En pruebas",
    desde: dia(3),
    programada: null,
    notas: [
      [
        "Ventas",
        "Sugerencia de productos relacionados en la caja, con reglas y pares aprendidos",
      ],
      [
        "Ventas",
        "Caja y turnos: apertura con fondo, retiros, arqueo y cierre con diferencias justificadas",
      ],
      [
        "Ventas",
        "Descuento de la categoría del cliente aplicado solo en la caja, con tope por margen",
      ],
      [
        "Inventario",
        "Conteo a ciegas por pasillo con causa probable de cada diferencia",
      ],
      ["Contabilidad", "Cierre de mes con aprobación de una persona"],
      [
        "Corrección",
        "Un atajo de teclado de la caja podía ejecutarse dos veces",
      ],
    ],
    checks: [
      { area: "Caja y ventas", quien: "Jonathan Ureña", ok: true },
      { area: "Inventario", quien: "Randall Mata", ok: true },
      { area: "Compras", quien: "Álvaro Cordero", ok: false },
      { area: "Contabilidad", quien: "Óscar Jiménez", ok: false },
    ],
  };
  const HISTV = [
    {
      v: "1.8.2",
      f: dia(8),
      acepto: "Andrey Ramírez",
      n: "Factura electrónica 4.4: nuevo campo de medio de pago",
    },
    {
      v: "1.8.1",
      f: dia(22),
      acepto: "Andrey Ramírez",
      n: "Correcciones en el reporte de antigüedad de saldos",
    },
    {
      v: "1.8.0",
      f: dia(41),
      acepto: "Adrián Vindas",
      n: "Nómina y RRHH; inventario por ubicación",
    },
  ];
  const PRUEBAS = {
    ultimo: dia(1),
    usuarios: [
      ["Andrey Ramírez", "TI de Santa Rosa", "Completo"],
      ["Smart Serve · soporte", "Proveedor", "Completo"],
      ["Usuario de consulta", "Análisis", "Solo lectura"],
    ],
  };
  function proxima(v) {
    const listos = VER.checks.filter((x) => x.ok).length,
      todos = listos === VER.checks.length;
    v.innerHTML = `<div class="wrap">
      <div class="stepbar"><div class="sbt"><b>${icon("upload")} ServeCore ${VER.prox} · ${esc(VER.estado)}${VER.programada ? " · se publica " + esc(VER.programada) : ""}</b>
        <span>Nada llega a producción sin estas notas y sin la aceptación escrita de Santa Rosa. Mientras tanto se prueba en el ambiente de pruebas desde el ${fecha(VER.desde)}.</span></div></div>
      <div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start">
        ${card({
          title: "Qué cambia",
          hint: "notas de la versión",
          body: VER.notas
            .map(
              (n) =>
                `<div class="hl"><b style="min-width:92px;text-align:left;font-family:var(--ui)">${esc(n[0])}</b><span>${esc(n[1])}</span></div>`,
            )
            .join(""),
        })}
        ${card({
          title: "Aceptación",
          hint: listos + " de " + VER.checks.length + " áreas",
          body:
            VER.checks
              .map((x, i) =>
                prefRowV(
                  x.area,
                  "Prueba y acepta: " + x.quien,
                  `<button class="swtch" role="switch" aria-checked="${x.ok}" data-chk="${i}" ${VER.programada ? "disabled" : ""}><i></i></button>`,
                ),
              )
              .join("") +
            `<button class="bigbtn" id="verOk" style="margin-top:14px;width:100%" ${todos && !VER.programada ? "" : "disabled"}>${icon("check")}${VER.programada ? "Aceptada" : "Aceptar y programar la publicación"}</button>
          ${
            !todos
              ? `<div class="mut" style="font-size:12px;margin-top:6px;text-align:center">Falta la aceptación de ${VER.checks
                  .filter((x) => !x.ok)
                  .map((x) => x.area.toLowerCase())
                  .join(" y ")}</div>`
              : ""
          }`,
        })}
      </div></div>`;
  }
  const prefRowV = (t, d, ctrl) =>
    `<div class="pref-row"><span class="pt"><div class="pn">${esc(t)}</div><div class="pd">${esc(d)}</div></span>${ctrl}</div>`;
  function proximaWire(v) {
    $$("[data-chk]", v).forEach((b) =>
      b.addEventListener("click", () => {
        if (b.disabled) return;
        const x = VER.checks[+b.dataset.chk];
        x.ok = !x.ok;
        A.refresh();
      }),
    );
    const ok = $("#verOk", v);
    if (ok)
      ok.addEventListener("click", () => {
        VER.programada = "el domingo a las 22:00";
        VER.estado = "Aceptada";
        anotar(
          "Aceptó versión",
          "ServeCore " + VER.prox + " · se publica el domingo 22:00",
          "Alta",
        );
        toast(
          "Versión aceptada",
          "Se publica el domingo a las 22:00, fuera del horario de venta. Todos los usuarios verán las notas al entrar.",
          "ok",
        );
        A.refresh();
      });
  }
  function pruebas(v) {
    const M = [
      ["Correo", "maria.solis@gmail.com", "cliente0482@ejemplo.test"],
      ["Teléfono", "8845-1120", "8000-0482"],
      ["Cédula", "1-0894-0231", "9-0000-0482"],
      ["Cuenta bancaria", "CR15015201001023456", "CR00000000000000482"],
      ["Salario", "₡545 000", "₡500 000"],
      ["Dirección", "Santa Rosa, 200 m sur de la iglesia", "Santa Rosa"],
    ];
    v.innerHTML = `<div class="wrap">
      <div class="grid g4">
        ${stat("Último refresco", fecha(PRUEBAS.ultimo), { txt: "copia de producción, anonimizada" })}
        ${stat("Datos personales", "Enmascarados", { txt: "antes de copiar, no después" }, "var(--ok)")}
        ${stat("Versión en pruebas", VER.prox, { txt: "producción está en " + HISTV[0].v })}
        ${stat("Con acceso", grp(PRUEBAS.usuarios.length), { txt: "personas y usuarios" })}
      </div>
      <div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);align-items:start">
        ${card({
          title: "Qué se enmascara al refrescar",
          hint: "un ejemplo",
          actions: `<button class="btn sm" id="refrescar">${icon("history")}Refrescar ahora</button>`,
          body: table({
            cols: [
              { t: "Campo", fmt: (r) => `<b>${esc(r[0])}</b>` },
              {
                t: "En producción",
                cls: "mono",
                fmt: (r) =>
                  `<span style="text-decoration:line-through;color:var(--ink-4)">${esc(r[1])}</span>`,
              },
              { t: "En pruebas", cls: "mono", fmt: (r) => esc(r[2]) },
            ],
            rows: M,
          }),
        })}
        ${card({
          title: "Quién entra al ambiente de pruebas",
          body: table({
            cols: [
              {
                t: "Usuario",
                fmt: (r) =>
                  `<b>${esc(r[0])}</b><span class="sub ui">${esc(r[1])}</span>`,
              },
              {
                t: "Acceso",
                fmt: (r) => tag(r[2], r[2] === "Solo lectura" ? "mu" : "ac"),
              },
            ],
            rows: PRUEBAS.usuarios,
          }),
        })}
      </div></div>`;
  }
  function pruebasWire(v) {
    $("#refrescar", v).addEventListener("click", () => {
      PRUEBAS.ultimo = new Date(D.HOY);
      anotar(
        "Refrescó el ambiente de pruebas",
        "Copia de producción anonimizada",
      );
      toast(
        "Ambiente de pruebas refrescado",
        "Con los datos de hoy, ya anonimizados: ningún correo ni cédula real salió de producción.",
        "ok",
      );
      A.refresh();
    });
  }
  function historialV(v) {
    v.innerHTML = `<div class="wrap">${card({
      title: "Versiones publicadas",
      hint: "todas con aviso y aceptación",
      body: table({
        cols: [
          { t: "Versión", cls: "mono", fmt: (r) => `<b>${esc(r.v)}</b>` },
          { t: "Publicada", cls: "mono", fmt: (r) => fecha(r.f) },
          { t: "Qué trajo", fmt: (r) => esc(r.n) },
          { t: "Aceptó", fmt: (r) => esc(r.acepto) },
          { t: "", fmt: () => tag("Con aviso previo", "ok", "check") },
        ],
        rows: HISTV,
      }),
    })}
      ${nota("Ningún cambio se publica sin aviso: el encargado de TI se entera antes que el mostrador, con las notas y la fecha.", "bell")}</div>`;
  }
  function respaldos(v) {
    v.innerHTML = `<div class="wrap">
      ${card({
        body: `<div class="tiles" style="margin:-12px -17px -16px">${[
          [
            "Respaldo cada hora",
            "Se guardan 35 días. Se prueba restaurar uno al mes.",
          ],
          [
            "Copia para Santa Rosa",
            "Completa, en formato abierto, el primer día de cada mes. La última se entregó el " +
              fecha(dia(12)) +
              ".",
          ],
          [
            "Base de datos propia",
            "Ningún otro cliente comparte base, servidor ni rendimiento con Santa Rosa.",
          ],
          [
            "Sus datos salen cuando quiera",
            "Base completa y archivo de XML, sin negociarlo: está en el contrato.",
          ],
        ]
          .map(
            (t) =>
              `<div class="tile"><div class="tn">${esc(t[0])}</div><div class="td">${esc(t[1])}</div></div>`,
          )
          .join("")}</div>`,
      })}
      <div style="display:flex;justify-content:flex-end"><button class="btn pri" id="copia">${icon("download")}Solicitar copia completa ahora</button></div></div>`;
  }
  function respaldosWire(v) {
    $("#copia", v).addEventListener("click", () => {
      anotar("Solicitó copia completa de la base", "Formato abierto");
      toast(
        "Copia solicitada",
        "Queda lista en unas horas en el enlace seguro de TI, sin costo.",
        "ok",
      );
    });
  }
  A.workspace("sis-versiones", {
    title: "Versiones y ambiente de pruebas",
    tabs: [
      {
        id: "proxima",
        t: "Próxima versión",
        sub: "Notas y aceptación escrita antes de publicar",
        badge: () => {
          const n = VER.programada ? 0 : VER.checks.filter((x) => !x.ok).length;
          return { n, k: "wa", l: n + " áreas por aceptar" };
        },
        render: proxima,
        wire: proximaWire,
      },
      {
        id: "pruebas",
        t: "Ambiente de pruebas",
        sub: "Separado de producción y con los datos personales enmascarados",
        render: pruebas,
        wire: pruebasWire,
      },
      {
        id: "historial",
        t: "Historial",
        sub: "Lo que se ha publicado y quién lo aceptó",
        render: historialV,
      },
      {
        id: "respaldos",
        t: "Respaldos y copia de la base",
        sub: "Respaldos y la copia que recibe Santa Rosa",
        render: respaldos,
        wire: respaldosWire,
      },
    ],
  });

  /* ── PARÁMETROS GENERALES ──
     Los valores de caja y crédito son los mismos que usa Ventas (VENX.PARAM):
     cambiarlos aquí cambia cómo se comporta la caja. */
  const P = V ? V.PARAM : {};
  const fmtC = (n) => c(n);
  const PARAMS = [
    {
      g: "Ventas y caja",
      ic: "cart",
      items: [
        {
          t: "Fondo de apertura de caja",
          d: "Lo que recibe cada caja al abrir el turno.",
          get: () => fmtC(P.fondoCaja),
          set: (v) => {
            P.fondoCaja =
              parseInt(String(v).replace(/\D/g, ""), 10) || P.fondoCaja;
          },
          ult: [dia(40), "Adrián Vindas"],
        },
        {
          t: "Tope de efectivo en caja",
          d: "Sobre esto la caja sugiere un retiro al administrador.",
          get: () => fmtC(P.topeEfectivo),
          set: (v) => {
            P.topeEfectivo =
              parseInt(String(v).replace(/\D/g, ""), 10) || P.topeEfectivo;
          },
          ult: [dia(40), "Adrián Vindas"],
        },
        {
          t: "Vigencia de la proforma",
          d: "Pasado este plazo la proforma vence y el precio se recalcula.",
          get: () => P.diasProforma + " días",
          set: (v) => {
            P.diasProforma = parseInt(v, 10) || P.diasProforma;
          },
          ult: [dia(120), "Marta Rojas"],
        },
        {
          t: "Días que se guarda un apartado",
          d: "Después se libera la mercadería y se avisa al cliente.",
          v: "15 días",
          ult: [dia(120), "Marta Rojas"],
        },
        {
          t: "Devolución de dinero sin autorización",
          d: "Una devolución mayor espera al administrador del local.",
          get: () => "Hasta " + fmtC(P.devolucionSinAprobacion),
          set: (v) => {
            P.devolucionSinAprobacion =
              parseInt(String(v).replace(/\D/g, ""), 10) ||
              P.devolucionSinAprobacion;
          },
          ult: [dia(60), "Adrián Vindas"],
        },
        {
          t: "Redondeo del efectivo",
          d: "Solo en el total a pagar en efectivo; las líneas no se redondean.",
          v: "A ₡5",
          opts: ["Sin redondeo", "A ₡5", "A ₡10"],
          ult: [dia(300), "Sonia Calderón"],
        },
        {
          t: "Factura a crédito",
          d: "El tiquete no tiene espacio para la firma del cliente.",
          v: "Tamaño carta, original y copia, con línea de firma",
          ult: [dia(300), "Sonia Calderón"],
        },
        {
          t: "Peso que pasa a despacho",
          d: "Una línea más pesada queda «por despachar» sola.",
          get: () => P.pesoNoDespacho + " kg",
          set: (v) => {
            P.pesoNoDespacho = parseInt(v, 10) || P.pesoNoDespacho;
          },
          ult: [dia(30), "Marta Rojas"],
        },
      ],
    },
    {
      g: "Precios, costos y márgenes",
      ic: "wallet",
      items: [
        {
          t: "Margen mínimo si la familia no tiene",
          d: "El de cada familia se define en Ventas › Precios, descuentos y márgenes.",
          v: "15 %",
          ult: [dia(200), "Adrián Vindas"],
        },
        {
          t: "Variación de costo permitida en la compra",
          d: "Más que esto bloquea la compra y pide autorización (COM-008).",
          v: "± 15 %",
          opts: ["± 10 %", "± 15 %", "± 20 %"],
          ult: [dia(25), "Óscar Jiménez"],
        },
        {
          t: "Barrido de autorizaciones sin usar",
          d: "Cierra las autorizaciones de facturas que no se aplicaron y avisa.",
          get: () => "Todos los días a las " + P.barrido,
          set: (v) => {
            const m = /(\d{1,2}:\d{2})/.exec(v);
            if (m) P.barrido = m[1];
          },
          ult: [dia(25), "Andrey Ramírez"],
        },
        {
          t: "Precios en la caja",
          d: "Cómo se muestran al cliente y en la pantalla del vendedor.",
          v: "Con IVA incluido",
          opts: ["Con IVA incluido", "Sin IVA"],
          ult: [dia(300), "Sonia Calderón"],
        },
      ],
    },
    {
      g: "Inventario",
      ic: "box",
      items: [
        {
          t: "Costo promedio con existencia negativa",
          d: "Cuando se vendió sin existencia, el negativo se toma como cero.",
          v: "El negativo cuenta como cero",
          ult: [dia(300), "Sonia Calderón"],
        },
        {
          t: "Venta sin existencia",
          d: "Solo en artículos marcados «contra pedido» (INV-004).",
          v: "Solo artículos marcados",
          opts: ["Nunca", "Solo artículos marcados", "Siempre"],
          ult: [dia(90), "Óscar Jiménez"],
        },
        {
          t: "Conteo cíclico",
          d: "Cuánto se cuenta cada día en cada local.",
          v: "Un pasillo por día",
          ult: [dia(50), "Randall Mata"],
        },
      ],
    },
    {
      g: "Crédito y cobro",
      ic: "card",
      items: [
        {
          t: "Bloqueo por atraso",
          d: "Días de atraso que bloquean el crédito en la caja.",
          get: () => P.diasBloqueo + " días",
          set: (v) => {
            P.diasBloqueo = parseInt(v, 10) || P.diasBloqueo;
          },
          ult: [dia(70), "Hazel Monge"],
        },
        {
          t: "Aviso a gerencia al cambiar un límite",
          d: "Cada cambio de límite de crédito llega a gerencia.",
          v: "Siempre",
          opts: ["Siempre", "Solo aumentos"],
          ult: [dia(20), "Adrián Vindas"],
        },
        {
          t: "Recordatorio de cobro por WhatsApp",
          d: "Antes y después del vencimiento.",
          v: "3 días antes y 1 día después",
          ult: [dia(15), "Hazel Monge"],
        },
      ],
    },
    {
      g: "Compras",
      ic: "truck",
      items: [
        {
          t: "Aprobación de la orden de compra",
          d: "Sobre este monto la orden la aprueba gerencia.",
          v: "₡5 000 000",
          ult: [dia(180), "Adrián Vindas"],
        },
        {
          t: "Días para recibir una orden",
          d: "Pasado este plazo la orden se marca como atrasada.",
          v: "15 días",
          ult: [dia(180), "Óscar Jiménez"],
        },
      ],
    },
    {
      /* los parámetros contables mandan de verdad: la tolerancia la usa el cierre
         de caja, el umbral los ajustes de costo, la comisión los lotes del datáfono */
      g: "Contabilidad e impuestos",
      ic: "file",
      items: [
        {
          t: "Método de valuación del inventario",
          d: "Cómo se calcula el costo de lo que se vende. UEPS no lo admiten las NIIF.",
          get: () => PC.valuacion,
          set: (v) => { PC.valuacion = v; },
          opts: ["Costo promedio ponderado", "PEPS · primero en entrar, primero en salir"],
          ult: [dia(400), "Sonia Calderón"],
        },
        {
          t: "Alcance del costo promedio",
          d: "Si cada bodega lleva su propio costo o hay uno solo para la empresa.",
          get: () => PC.alcance,
          set: (v) => { PC.alcance = v; },
          opts: ["Uno para toda la empresa", "Uno por bodega"],
          ult: [dia(400), "Sonia Calderón"],
        },
        {
          t: "Período fiscal",
          d: "Impuesto sobre las utilidades: el ordinario es de enero a diciembre.",
          v: "1 de enero al 31 de diciembre",
          opts: ["1 de enero al 31 de diciembre"],
          ult: [dia(400), "Sonia Calderón"],
        },
        {
          t: "Registrar hasta",
          d: "Lo que tenga fecha de un período cerrado se rechaza en todos los módulos.",
          get: () => (D.cerradoHasta ? "Cerrado hasta el " + fecha(D.cerradoHasta) + " " + D.cerradoHasta.getFullYear() : "Sin períodos cerrados"),
          v: "",
          ult: [dia(10), "Sonia Calderón"],
          soloLectura: "Se cierra desde Contabilidad › Cierres",
        },
        {
          t: "Tolerancia de diferencias de caja",
          d: "Hasta este monto el faltante va a «Diferencias de caja»; más, se le carga al cajero.",
          get: () => "₡" + grp(AU().POLITICA.toleranciaCaja),
          set: (v) => { const n = parseInt(String(v).replace(/\D/g, ""), 10); if (n >= 0 && n <= 20000) AU().POLITICA.toleranciaCaja = n; },
          ult: [dia(90), "Sonia Calderón"],
        },
        {
          t: "Ajuste de costo que se registra solo",
          d: "Por venta sin existencia; por encima de este monto lo revisa contabilidad.",
          get: () => "₡" + grp(AU().POLITICA.umbralCosto),
          set: (v) => { const n = parseInt(String(v).replace(/\D/g, ""), 10); if (n > 0) AU().POLITICA.umbralCosto = n; },
          ult: [dia(90), "Sonia Calderón"],
        },
        {
          t: "Comisión del datáfono",
          d: "La del contrato con el adquirente; se registra como gasto financiero al liquidar cada lote.",
          get: () => dec(AU().POLITICA.comisionDatafono, 2) + " %",
          set: (v) => { const n = parseFloat(String(v).replace(",", ".")); if (n > 0 && n < 10) AU().POLITICA.comisionDatafono = n; },
          ult: [dia(120), "Sonia Calderón"],
        },
        {
          t: "Cuentas del diferencial cambiario",
          d: "La revaluación de los saldos en dólares al cierre del mes.",
          v: "4-02-03-001 ganado · 6-01-06-003 perdido",
          opts: ["4-02-03-001 ganado · 6-01-06-003 perdido"],
          ult: [dia(400), "Sonia Calderón"],
        },
      ],
    },
    {
      g: "Consultas y reportes",
      ic: "chart",
      items: [
        {
          t: "Rango máximo en horario de venta",
          d: "Un reporte más largo se programa para la noche y llega por correo.",
          v: "13 meses",
          opts: ["6 meses", "13 meses", "24 meses"],
          ult: [dia(10), "Andrey Ramírez"],
        },
        {
          t: "Horario de venta",
          d: "Las tareas pesadas corren fuera de este horario.",
          v: "7:00 a 18:00",
          ult: [dia(10), "Andrey Ramírez"],
        },
      ],
    },
  ];
  const valP = (x) => (x.get ? x.get() : x.v);
  /* parámetros contables propios de Configuración y la política de Contabilidad */
  const PC = { valuacion: "Costo promedio ponderado", alcance: "Uno para toda la empresa" };
  const AU = () => w.AUTO || { POLITICA: { toleranciaCaja: 2000, umbralCosto: 25000, comisionDatafono: 2.75 } };
  let parQ = "";
  A.screen("sis-parametros", {
    title: "Parámetros generales",
    sub: () =>
      "Los valores que gobiernan la operación; cada cambio queda con el valor anterior y el motivo",
    extra: () =>
      `<div class="tb-search" style="min-width:240px">${icon("search")}<input id="parQ" type="search" value="${esc(parQ)}" placeholder="Buscar parámetro" aria-label="Buscar parámetro"></div>`,
    render(v) {
      const q = norm(parQ.trim());
      const grupos = PARAMS.map((g) => ({
        g,
        items: g.items.filter(
          (x) =>
            !q || norm(g.g + " " + x.t + " " + (x.d || "")).indexOf(q) >= 0,
        ),
      })).filter((x) => x.items.length);
      v.innerHTML = `<div class="wrap">
        ${
          grupos.length
            ? `<div class="grid g2" style="align-items:start">${grupos
                .map((G) =>
                  card({
                    title: G.g.g,
                    hint: G.items.length + "",
                    body: G.items
                      .map((x) =>
                        prefRow(
                          esc(x.t),
                          esc(x.d || "") +
                            `<span class="sx-hint" style="display:block;margin-top:3px">Último cambio: ${fecha(x.ult[0])} · ${esc(x.ult[1])}</span>`,
                          `<span style="display:flex;gap:10px;align-items:center"><span class="sx-val">${esc(valP(x))}</span><button class="btn sm" data-par="${PARAMS.indexOf(G.g)}|${G.g.items.indexOf(x)}">Cambiar</button></span>`,
                        ),
                      )
                      .join(""),
                  }),
                )
                .join("")}</div>`
            : empty(
                "search",
                "Ningún parámetro coincide",
                "Pruebe con otra palabra: caja, crédito, costo, reporte…",
              )
        }
        ${nota("Estos son los parámetros de toda la empresa. Los de un artículo (vendible, comprable, contra pedido) están en su ficha, y los de una familia (margen mínimo) en Ventas.", "gear")}</div>`;
    },
    wire(v) {
      const q = $("#parQ");
      if (q)
        q.addEventListener("input", (e) => {
          parQ = e.target.value;
          const pos = e.target.selectionStart;
          A.refresh();
          const n = $("#parQ");
          if (n) {
            n.focus();
            n.setSelectionRange(pos, pos);
          }
        });
      $$("[data-par]", v).forEach((b) =>
        b.addEventListener("click", () => {
          const [g, i] = b.dataset.par.split("|").map(Number),
            x = PARAMS[g].items[i];
          if (x.soloLectura) return toast(x.t, x.soloLectura + ".", "in");
          if (PARAMS[g].g === "Contabilidad e impuestos" && !exige(["Contabilidad", "Gerencia"], "Cambiar un parámetro contable")) return;
          cambiarValor({
            title: x.t,
            v: valP(x),
            get: () => valP(x),
            opts: x.opts,
            set: (nv) => {
              if (x.set) x.set(nv);
              else x.v = nv;
              x.ult = [new Date(D.HOY), yo()];
            },
          });
        }),
      );
    },
  });

  /* ── MEDIOS DE PAGO, MONEDAS Y CUENTAS ── */
  const MEDIOS_C = [
    {
      m: "Efectivo en colones",
      ic: "cash",
      cod: "01 · Efectivo",
      pide: "Monto recibido; calcula el vuelto",
      pos: "Efectivo",
      locs: "Todos",
      on: true,
    },
    {
      m: "Efectivo en dólares",
      ic: "cash",
      cod: "01 · Efectivo",
      pide: "Monto en dólares; se recibe al tipo de cambio de compra del día y el vuelto se da en colones",
      pos: "Dólares",
      locs: "Todos",
      on: true,
    },
    {
      m: "Tarjeta",
      ic: "card",
      cod: "02 · Tarjeta",
      pide: "Autorización del datáfono y últimos 4 dígitos",
      pos: "Tarjeta",
      locs: "Todos",
      on: true,
    },
    {
      m: "SINPE Móvil",
      ic: "phone",
      cod: "06 · SINPE Móvil",
      pide: "Número de referencia; se valida contra el banco",
      pos: "SINPE móvil",
      locs: "Todos",
      on: true,
    },
    {
      m: "Transferencia",
      ic: "bank",
      cod: "04 · Transferencia",
      pide: "Banco y referencia; contabilidad la confirma",
      pos: "Transferencia",
      locs: "Todos",
      on: true,
    },
    {
      m: "Cheque",
      ic: "file",
      cod: "03 · Cheque",
      pide: "Banco y número; solo clientes autorizados",
      pos: "Cheque",
      locs: "Santa Rosa y Turrialba",
      on: true,
    },
    {
      m: "Anticipo del cliente",
      ic: "wallet",
      cod: "99 · Otros",
      pide: "Aplica el saldo a favor del cliente",
      pos: "Anticipo",
      locs: "Todos",
      on: true,
    },
    {
      m: "Nota de crédito a favor",
      ic: "clip",
      cod: "99 · Otros",
      pide: "Número de la nota",
      pos: "Saldo a favor del cliente",
      locs: "Todos",
      on: true,
    },
    {
      m: "Link de pago",
      ic: "link",
      cod: "02 · Tarjeta",
      pide: "Se genera desde la proforma o el pedido",
      pos: "Tarjeta",
      locs: "Tienda virtual",
      on: false,
      fase: "Fase 2",
    },
  ];
  /* la cuenta de cada medio es la misma que usa la caja al asentar (D.CUENTA_MEDIO) */
  MEDIOS_C.forEach((x) => {
    Object.defineProperty(x, "cta", {
      enumerable: true,
      get: () => D.cuentaMedio(x.pos),
      set: (v) => { D.CUENTA_MEDIO[x.pos] = v; },
    });
  });
  const ctaTxt = (cod) => (D.ctaByCod[cod] ? cod + " · " + D.ctaByCod[cod].nom : cod);
  /* cuentas de movimiento que pueden recibir un cobro */
  const ctasCobro = () =>
    D.cuentas
      .filter((k) => /^1-01-0[1-3]-|^2-01-06-/.test(k.cod))
      .map((k) => ({ v: k.cod, t: k.cod + " · " + k.nom }));
  function mediosTab(el) {
    el.innerHTML = `<div class="wrap">
      ${nota("Cada medio pide en la caja el dato que exige el comprobante electrónico 4.4. Una venta de contado no se aplica sin medio de pago, y el SINPE Móvil va separado de la transferencia.", "card")}
      ${card({
        title: "Medios de pago",
        hint: MEDIOS_C.filter((x) => x.on).length + " activos",
        actions: `<button class="btn sm" data-ir="caja|mia">${icon("cash")}Ver en la caja</button><button class="btn sm pri" id="mpNuevo">${icon("plus")}Medio de pago</button>`,
        body: table({
          cols: [
            {
              t: "Medio",
              fmt: (x) =>
                `<span style="display:flex;gap:10px;align-items:center"><span class="mit" style="width:30px;height:30px">${icon(x.ic)}</span><b>${esc(x.m)}</b>${x.fase ? faseTag(x.fase) : ""}</span>`,
            },
            {
              t: "Código en el comprobante",
              cls: "mono",
              fmt: (x) => esc(x.cod),
            },
            {
              t: "Qué pide en la caja",
              fmt: (x) =>
                `<span style="font-size:12.5px">${esc(x.pide)}</span>`,
            },
            {
              t: "Cuenta contable",
              fmt: (x) =>
                `<span class="mut num" style="font-size:12.5px">${esc(ctaTxt(x.cta))}</span>`,
            },
            { t: "Locales", fmt: (x) => esc(x.locs) },
            {
              t: "Activo",
              c: true,
              fmt: (x, i) =>
                swt(x.on, `data-mpon="${i}" aria-label="${esc(x.m)} activo"`),
            },
            {
              t: "",
              r: true,
              fmt: (x, i) =>
                `<button class="btn sm" data-mped="${i}">Editar</button>`,
            },
          ],
          rows: MEDIOS_C,
        }),
      })}</div>`;
  }
  function fichaMedio(x) {
    const nuevo = !x;
    x = x || {
      m: "",
      cod: "99 · Otros",
      pide: "",
      cta: "",
      locs: "Todos",
      on: true,
      ic: "wallet",
    };
    ficha({
      title: nuevo ? "Nuevo medio de pago" : x.m,
      sub: "Lo que la caja pide y a dónde entra el dinero",
      campos: [
        { id: "m", l: "Nombre en la caja", v: x.m, req: true },
        {
          id: "cod",
          l: "Código en el comprobante",
          tipo: "select",
          opts: [
            "01 · Efectivo",
            "02 · Tarjeta",
            "03 · Cheque",
            "04 · Transferencia",
            "05 · Recaudado por terceros",
            "06 · SINPE Móvil",
            "07 · Plataforma digital",
            "99 · Otros",
          ],
          v: x.cod,
          corto: true,
        },
        {
          id: "locs",
          l: "Locales",
          tipo: "select",
          opts: ["Todos", "Santa Rosa y Turrialba", "Tienda virtual"],
          v: x.locs,
          corto: true,
        },
        {
          id: "pide",
          l: "Qué pide en la caja",
          v: x.pide,
          tipo: "area",
          rows: 2,
        },
        {
          id: "cta",
          l: "Cuenta contable que recibe",
          tipo: "select",
          opts: ctasCobro(),
          v: x.cta,
          hint: "Del catálogo de cuentas. La tarjeta entra a «Tarjetas por liquidar» hasta que el datáfono deposita el lote.",
        },
        {
          id: "ref",
          l: "Referencia obligatoria",
          tipo: "switch",
          v: /referencia|número|Autorización/i.test(x.pide),
        },
      ],
      guardar(v) {
        if (nuevo) {
          const nuevoM = { m: v.m, cod: v.cod, pide: v.pide || "—", pos: v.m, locs: v.locs, on: true, ic: "wallet" };
          Object.defineProperty(nuevoM, "cta", { enumerable: true, get: () => D.cuentaMedio(nuevoM.pos), set: (c2) => { D.CUENTA_MEDIO[nuevoM.pos] = c2; } });
          nuevoM.cta = v.cta;
          MEDIOS_C.push(nuevoM);
          anotar("Creó medio de pago", v.m);
          return {
            t: "Medio de pago creado",
            s: "Aparece en la caja desde el próximo cobro.",
          };
        }
        const ctaAntes = x.cta;
        Object.assign(x, {
          m: v.m,
          cod: v.cod,
          pide: v.pide,
          cta: v.cta,
          locs: v.locs,
        });
        anotar("Modificó medio de pago", v.m, ctaAntes !== v.cta ? "Alta" : "Media", ctaTxt(ctaAntes), ctaTxt(v.cta));
        return { t: "Medio de pago actualizado" };
      },
    });
  }
  function mediosWire(v) {
    A.wireIr(v);
    $("#mpNuevo", v).addEventListener("click", () => fichaMedio(null));
    $$("[data-mped]", v).forEach((b) =>
      b.addEventListener("click", () => fichaMedio(MEDIOS_C[+b.dataset.mped])),
    );
    $$("[data-mpon]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const x = MEDIOS_C[+b.dataset.mpon];
        x.on = !x.on;
        anotar((x.on ? "Activó" : "Desactivó") + " medio de pago", x.m);
        toast(
          x.m + (x.on ? " activo" : " inactivo"),
          x.on
            ? "Aparece en la caja."
            : "Deja de aparecer en la caja; lo cobrado antes no cambia.",
          x.on ? "ok" : "wa",
        );
        A.refresh();
      }),
    );
  }
  /* el tipo de cambio vive en data.js, uno por fecha (D.tipoCambio) */
  const tcHoy = () => D.tcDe(D.ahora());
  function monedasTab(el) {
    const tc = tcHoy();
    el.innerHTML = `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);align-items:start">
      <div style="display:flex;flex-direction:column;gap:14px">
      ${card({ title: "Monedas", body: prefRow("Colón costarricense (₡)", "Moneda base: contabilidad, inventario y reportes.", tag("Base", "acc")) + prefRow("Dólar estadounidense ($)", "Se cobra en caja y se compra a proveedores que facturan en dólares.", tag("Activa", "ok")) })}
      ${card({
        title: "Tipo de cambio de hoy",
        hint: tc.fuente,
        actions: `<button class="btn sm" id="tcMan">Registrar a mano</button>`,
        body: `<div class="ficha" style="margin:-12px -17px 0">${fichaCell("Compra", "₡" + dec(tc.compra, 2))}${fichaCell("Venta", "₡" + dec(tc.venta, 2))}${fichaCell("Vigente desde", fh(tc.fecha))}</div>
        <div style="margin-top:12px">${nota("Se trae del Banco Central todos los días a las 8:00 y queda guardado por fecha. La caja <b>recibe</b> dólares al tipo de <b>compra</b> (la ferretería le compra los dólares al cliente); los pagos a proveedores en dólares usan el de venta. Contabilidad revalúa los saldos en dólares al cierre del mes con el de la fecha de cierre, contra «Diferencial cambiario».", "bank")}</div>`,
      })}
      </div>
      ${card({
        title: "Historial",
        hint: "uno por fecha · Banco Central de Costa Rica",
        body: table({
          cols: [
            { t: "Vigente desde", cls: "mono", fmt: (r) => fh(r.fecha) },
            { t: "Compra", r: true, cls: "mono", fmt: (r) => "₡" + dec(r.compra, 2) },
            { t: "Venta", r: true, cls: "mono", fmt: (r) => "₡" + dec(r.venta, 2) },
            { t: "Origen", fmt: (r) => (/Manual/.test(r.fuente) ? tag("Manual · " + r.usuario, "wa") : tag("Automático", "mu")) },
          ],
          rows: D.tipoCambio.slice().reverse(),
        }),
      })}
    </div>`;
  }
  function monedasWire(v) {
    $("#tcMan", v).addEventListener("click", () => {
      if (!exige(["Contabilidad", "Gerencia"], "Registrar el tipo de cambio a mano")) return;
      const tc = tcHoy();
      ficha({
        title: "Registrar tipo de cambio a mano",
        sub: "Solo si el Banco Central no respondió; queda marcado como manual y con su vigencia",
        campos: [
          { id: "c", l: "Compra", tipo: "num", v: dec(tc.compra, 2), corto: true, req: true },
          { id: "vv", l: "Venta", tipo: "num", v: dec(tc.venta, 2), corto: true, req: true },
          { id: "m", l: "Motivo", tipo: "area", rows: 2, req: true },
        ],
        nota: "Es un permiso sensible: lo tienen contabilidad y gerencia. Rige desde ahora; lo facturado antes conserva su tipo de cambio.",
        notaIc: "lock",
        guardar(x) {
          const compra = parseFloat(String(x.c).replace(/\s/g, "").replace(",", "."));
          const venta = parseFloat(String(x.vv).replace(/\s/g, "").replace(",", "."));
          if (!(compra > 0) || !(venta > 0)) { toast("Número no válido", "Escriba la compra y la venta con dos decimales, por ejemplo 503,12.", "cr"); return false; }
          if (compra >= venta) { toast("La compra tiene que ser menor que la venta", "Compra ₡" + dec(compra, 2) + " · venta ₡" + dec(venta, 2) + ".", "cr"); return false; }
          const vari = Math.abs(venta - tc.venta) / tc.venta * 100;
          if (vari > 2) { toast("Variación fuera de lo normal", "La venta cambia " + dec(vari, 1) + " % contra el vigente (₡" + dec(tc.venta, 2) + "). Más de 2 % en un día casi siempre es un error de digitación.", "cr"); return false; }
          D.tipoCambio.push({ fecha: D.ahora(), compra, venta, fuente: "Manual · " + D.sesion.corto, usuario: D.sesion.corto, motivo: x.m });
          anotar("Registró tipo de cambio a mano", x.m, "Alta", "₡" + dec(tc.compra, 2) + " / ₡" + dec(tc.venta, 2), "₡" + dec(compra, 2) + " / ₡" + dec(venta, 2));
          return { t: "Tipo de cambio registrado", s: "Rige desde ahora hasta la próxima actualización del Banco Central." };
        },
      });
    });
  }
  const CUENTAS = [
    {
      b: "Banco Nacional",
      n: "CR15 0151 •••• •••• 3456",
      mon: "Colones",
      uso: "Depósitos de caja, pagos a proveedores y planilla",
      plano: "Planilla y proveedores (TXT)",
      cta: "1-01-02-001",
    },
    {
      b: "Banco Nacional",
      n: "CR61 0151 •••• •••• 7710",
      mon: "Dólares",
      uso: "Proveedores que facturan en dólares",
      plano: "Proveedores (TXT)",
      cta: "1-01-02-005",
    },
    {
      b: "Banco Nacional · SINPE Móvil",
      n: "8712-0000",
      mon: "Colones",
      uso: "Cobros en caja y tienda virtual (entra a la cuenta corriente del BN)",
      plano: "—",
      cta: "1-01-02-001",
    },
    {
      b: "Banco de Costa Rica",
      n: "CR05 0152 •••• •••• 0921",
      mon: "Colones",
      uso: "Datáfonos BCR",
      plano: "—",
      cta: "1-01-02-003",
    },
    {
      b: "BAC San José",
      n: "CR72 0102 •••• •••• 4410",
      mon: "Colones",
      uso: "Transferencias de clientes corporativos",
      plano: "—",
      cta: "1-01-02-002",
    },
    {
      b: "Banco Popular",
      n: "CR44 0161 •••• •••• 5530",
      mon: "Colones",
      uso: "Préstamos y ahorro",
      plano: "—",
      cta: "1-01-02-004",
    },
  ];
  function cuentasTab(el) {
    el.innerHTML = `<div class="wrap">
      ${card({
        title: "Cuentas bancarias de la empresa",
        hint: "los números completos solo los ve contabilidad",
        actions: `<button class="btn sm" data-ir="con-conciliaciones|banco">${icon("bank")}Conciliación</button><button class="btn sm pri" id="ctaNueva">${icon("plus")}Cuenta</button>`,
        body: table({
          cols: [
            { t: "Banco", fmt: (x) => `<b>${esc(x.b)}</b>` },
            { t: "Cuenta", cls: "mono", fmt: (x) => esc(x.n) },
            {
              t: "Moneda",
              fmt: (x) => tag(x.mon, x.mon === "Dólares" ? "wa" : "mu"),
            },
            {
              t: "Para qué se usa",
              fmt: (x) => `<span style="font-size:12.5px">${esc(x.uso)}</span>`,
            },
            {
              t: "Cuenta contable",
              cls: "mono",
              fmt: (x) => `<span class="mut" style="font-size:12.5px">${esc(ctaTxt(x.cta))}</span>`,
            },
            {
              t: "Archivo plano",
              fmt: (x) =>
                x.plano === "—"
                  ? '<span class="dim">—</span>'
                  : tag(x.plano, "acc"),
            },
          ],
          rows: CUENTAS,
        }),
      })}
      ${nota("Crear o eliminar una cuenta bancaria es un permiso sensible: pide doble factor, lo tiene solo contabilidad y queda en la bitácora.", "shield")}</div>`;
  }
  function cuentasWire(v) {
    A.wireIr(v);
    $("#ctaNueva", v).addEventListener("click", () =>
      ficha({
        title: "Nueva cuenta bancaria",
        sub: "Pide doble factor al guardar",
        campos: [
          {
            id: "b",
            l: "Banco",
            tipo: "select",
            opts: [
              "Banco Nacional",
              "Banco de Costa Rica",
              "Banco Popular",
              "BAC Credomatic",
            ],
            corto: true,
          },
          {
            id: "mon",
            l: "Moneda",
            tipo: "select",
            opts: ["Colones", "Dólares"],
            corto: true,
          },
          { id: "n", l: "IBAN", req: true, ph: "CR00 0000 0000 0000 0000 00" },
          { id: "uso", l: "Para qué se usa", tipo: "area", rows: 2 },
        ],
        ok: "Verificar y guardar",
        guardar(x) {
          /* cada cuenta bancaria es una cuenta de movimiento en el catálogo (1-01-02) */
          const n = D.cuentas.filter((k) => k.cod.indexOf("1-01-02-") === 0).length + 1;
          const cod = "1-01-02-" + String(n).padStart(3, "0");
          const cta = { cod, nom: x.b + " cta. " + (x.mon === "Dólares" ? "dólares" : "corriente"), tipo: "Activo", debe: 0, haber: 0 };
          D.cuentas.push(cta); D.ctaByCod[cod] = cta;
          D.cuentas.sort((a, b) => (a.cod < b.cod ? -1 : 1));
          CUENTAS.push({
            b: x.b,
            n: x.n.slice(0, 9) + " •••• •••• " + x.n.slice(-4),
            mon: x.mon,
            uso: x.uso || "—",
            plano: "—",
            cta: cod,
          });
          anotar("Creó cuenta bancaria", x.b + " · " + x.mon + " · cuenta contable " + cod, "Alta");
          return {
            t: "Cuenta creada · " + cod,
            s: "Se abrió su cuenta en el catálogo. Se verificó con doble factor; contabilidad y gerencia recibieron el aviso.",
          };
        },
      }),
    );
  }
  A.workspace("sis-pagos", {
    title: "Medios de pago y monedas",
    tabs: [
      {
        id: "medios",
        t: "Medios de pago",
        sub: "Qué acepta la caja y qué dato pide cada uno para el comprobante",
        render: mediosTab,
        wire: mediosWire,
      },
      {
        id: "monedas",
        t: "Monedas y tipo de cambio",
        sub: "Colones como base y dólares al tipo de cambio del Banco Central",
        render: monedasTab,
        wire: monedasWire,
      },
      {
        id: "cuentas",
        t: "Cuentas bancarias",
        sub: "A dónde entra y de dónde sale el dinero",
        render: cuentasTab,
        wire: cuentasWire,
      },
    ],
  });

  /* ── PLANTILLAS DE IMPRESIÓN Y MENSAJES ── */
  const PLANT = [
    {
      id: "fe",
      t: "Factura electrónica",
      tam: "Carta",
      imp: "HP LaserJet de cada local",
      copias: 1,
      uso: "Ventas de contado a empresas; se envía por correo",
    },
    {
      id: "fc",
      t: "Factura a crédito",
      tam: "Carta",
      imp: "HP LaserJet de cada local",
      copias: 2,
      uso: "Original y copia, con línea para la firma del cliente",
      firma: true,
    },
    {
      id: "te",
      t: "Tiquete electrónico",
      tam: "Térmica 80 mm",
      imp: "Epson de cada caja",
      copias: 1,
      uso: "Ventas de contado a consumidor final",
    },
    {
      id: "pr",
      t: "Proforma",
      tam: "Carta · PDF",
      imp: "Se envía por correo o WhatsApp",
      copias: 1,
      uso: "Con peso total y flete estimado",
    },
    {
      id: "rd",
      t: "Recibo de dinero",
      tam: "Térmica 80 mm",
      imp: "Epson de cada caja",
      copias: 2,
      uso: "Abonos a crédito y anticipos",
    },
    {
      id: "dv",
      t: "Boleta de devolución",
      tam: "Carta",
      imp: "HP LaserJet de cada local",
      copias: 1,
      uso: "Con la firma del cliente",
    },
    {
      id: "oc",
      t: "Orden de compra",
      tam: "Carta · PDF",
      imp: "Se envía al proveedor por correo",
      copias: 1,
      uso: "Con la condición de pago negociada",
    },
    {
      id: "de",
      t: "Comprobante de despacho",
      tam: "Carta",
      imp: "Impresora del CEDI",
      copias: 2,
      uso: "Lo firma quien retira",
    },
    {
      id: "et",
      t: "Etiqueta de estante",
      tam: "Etiqueta 50 × 30 mm",
      imp: "Zebra de cada local",
      copias: 1,
      uso: "Precio, código de barras y ubicación",
    },
  ];
  let plSel = "fc";
  const PL_CFG = {
    pie: "Gracias por su compra. Revise su mercadería antes de retirarse.",
    logo: true,
    igual: true,
  };
  /* la vista previa usa un comprobante real del histórico: consecutivo,
     clave, líneas y totales cuadran con lo que muestran Ventas y Facturación */
  const ejemploDoc = (tipo, credito) =>
    D.documentos.find((d) => d.tipo === tipo && d.lineas.length >= 3 && (credito == null || (d.condicion === "Crédito") === credito)) ||
    D.documentos.find((d) => d.tipo === tipo) || D.documentos[0];
  const lineasDoc = (d) =>
    d.lineas.map((l) => {
      const a = D.artById[l.artId] || {};
      const neto = l.cant * l.precio * (1 - (l.desc || 0) / 100);
      return { desc: a.desc || l.artId, cabys: (a.cabys || "") + " · " + D.pctTxt(D.tarifaDe(l)), cant: l.cant, precio: l.precio, desc_: l.desc || 0, total: Math.round(neto) };
    });
  const bloqueFiscal = (d) => {
    const act = D.actividadPrincipal();
    return `Clave ${esc(d.clave)}<br>Actividad ${esc(act.cod)} · ${d.condicion === "Crédito" ? "Condición 02 crédito" : "Condición 01 contado"} · ${esc(D.mediosTxt(d))}<br>Situación ${esc(d.situacion)} · factura electrónica 4.4${d.exoneracion ? `<br>Exoneración ${esc(d.exoneracion.numero)} · ${esc(d.exoneracion.institucion)} · ${d.exoneracion.pct} puntos de IVA` : ""}`;
  };
  function vistaDoc(p) {
    if (p.tam.indexOf("80 mm") >= 0) {
      const d = ejemploDoc("TE", false);
      return `<div class="sx-doc sx-80">
      <div style="text-align:center"><b>${esc(EMP.comercial)}</b><br>${esc(EMP.nombre)}<br>${esc(EMP.cedula)} · ${esc(locNom(d.locId))}<br>${esc(p.t.toUpperCase())}<br>${esc(d.cons)}<br>${fecha(d.fecha)} ${d.fecha.getFullYear()}</div>
      <div style="border-top:1px dashed #9aa1b1;margin:8px 0"></div>
      ${lineasDoc(d).map((l) => `<div class="sx-dl" style="border:0;padding:1px 0"><span>${esc(String(l.cant))} × ${esc(l.desc)}<br><span class="sx-dm">CABYS ${esc(l.cabys)}${l.desc_ ? " · desc. " + l.desc_ + " %" : ""}</span></span><span>${c(l.total)}</span></div>`).join("")}
      <div style="border-top:1px dashed #9aa1b1;margin:8px 0"></div>
      <div class="sx-dl" style="border:0"><span>Subtotal</span><span>${c(d.grav + d.exe)}</span></div>
      ${D.desgloseIva(d).map(([k, v]) => `<div class="sx-dl" style="border:0"><span>${esc(k)}</span><span>${v < 0 ? "−" + c(-v) : c(v)}</span></div>`).join("")}
      <div class="sx-dl" style="border:0"><b>TOTAL</b><b>${c(d.total)}</b></div>${(d.pagos || []).map((x) => `<div class="sx-dl" style="border:0"><span>${x.vuelto ? "Vuelto" : esc(x.medio)}${x.usd ? " US$ " + dec(x.usd, 2) + " × " + dec(x.tc, 2) : ""}</span><span>${x.vuelto ? c(-x.monto) : c(x.monto)}</span></div>`).join("")}
      <div style="margin-top:8px;word-break:break-all" class="sx-dm">${bloqueFiscal(d)}</div>
      <div style="text-align:center;margin-top:8px" class="sx-dm">${esc(PL_CFG.pie)}<br>Consulte su comprobante: consulta.santarosa.cr/c/8F3K2Q<br>(no abre el sistema · vence en 30 días)</div></div>`;
    }
    if (p.id === "et")
      return `<div class="sx-doc" style="max-width:260px;margin:0 auto;text-align:center"><b style="font-size:13px">Cemento gris 50 kg</b><div style="font-size:26px;font-weight:800;margin:4px 0">₡7 950</div><div style="font-family:var(--num);letter-spacing:2px">▌▌▍▌▎▌▌▍▎▌▍▌▌▎▍▌</div><div class="sx-dm">MAT-00012 · Pasillo C · anaquel 1 · cara A · estante 04</div></div>`;
    const d = ejemploDoc("FE", !!p.firma);
    const cli = D.cliById[d.clienteId];
    const plazo = cli && cli.plazo ? cli.plazo : 30;
    return `<div class="sx-doc">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
        <div style="display:flex;gap:10px;align-items:center">${PL_CFG.logo ? `<img src="mark.png" alt="" style="width:38px;height:38px;object-fit:contain">` : ""}<div><h4>${esc(EMP.comercial)}</h4><div class="sx-dm">${esc(EMP.nombre)} · ${esc(EMP.cedula)}<br>${esc(domicilio(EMP))} · ${esc(EMP.tel)}</div></div></div>
        <div style="text-align:right"><b>${esc(p.t.toUpperCase())}</b><div class="sx-dm">${esc(d.cons)}<br>${fecha(d.fecha)} ${d.fecha.getFullYear()} · ${d.condicion === "Crédito" ? "Crédito " + plazo + " días" : "Contado"}</div></div></div>
      <div style="margin:12px 0 6px"><b>Cliente:</b> ${cli ? esc(cli.nom) + " · " + esc(cli.ced || "") : "Consumidor final"}</div>
      <div class="sx-dl" style="font-weight:700"><span style="flex:1">Descripción</span><span style="width:110px">CABYS</span><span style="width:40px;text-align:right">Cant.</span><span style="width:70px;text-align:right">Precio</span><span style="width:80px;text-align:right">Total</span></div>
      ${lineasDoc(d).map((l) => `<div class="sx-dl"><span style="flex:1">${esc(l.desc)}${l.desc_ ? ` <span class="sx-dm">(desc. ${l.desc_} %)</span>` : ""}</span><span style="width:110px" class="sx-dm">${esc(l.cabys)}</span><span style="width:40px;text-align:right">${esc(String(l.cant))}</span><span style="width:70px;text-align:right">${c(l.precio)}</span><span style="width:80px;text-align:right">${c(l.total)}</span></div>`).join("")}
      <div style="display:flex;justify-content:space-between;gap:16px;margin-top:8px"><div class="sx-dm" style="word-break:break-all;max-width:60%">${bloqueFiscal(d)}</div><div style="min-width:200px"><div class="sx-dl"><span>Subtotal</span><span>${c(d.grav + d.exe)}</span></div>${D.desgloseIva(d).map(([k, v]) => `<div class="sx-dl"><span>${esc(k)}</span><span>${v < 0 ? "−" + c(-v) : c(v)}</span></div>`).join("")}<div class="sx-dl" style="font-weight:800"><span>Total</span><span>${c(d.total)}</span></div></div></div>
      ${p.firma ? `<div style="display:flex;gap:30px;margin-top:26px"><div style="flex:1;border-top:1px solid #1d2433;padding-top:4px" class="sx-dm">Firma del cliente</div><div style="flex:1;border-top:1px solid #1d2433;padding-top:4px" class="sx-dm">Cédula</div></div><div class="sx-dm" style="margin-top:6px">ORIGINAL · se imprime también la COPIA</div>` : ""}
      <div class="sx-dm" style="margin-top:14px;border-top:1px solid #e6e8ee;padding-top:8px">${esc(PL_CFG.pie)}<br>Consulta pública del comprobante: consulta.santarosa.cr/c/8F3K2Q — no abre el sistema ni pide sesión; vence en 30 días.</div></div>`;
  }
  function impresosTab(el) {
    const p = PLANT.find((x) => x.id === plSel) || PLANT[0];
    el.innerHTML = `<div class="split ancho">
      ${card({
        cls: "mlist",
        title: "Plantillas",
        hint: PLANT.length + "",
        body: `<div class="mitems">${PLANT.map((x) => `<button class="mitem" data-pl="${x.id}" aria-selected="${x.id === p.id}"><span style="flex:1;min-width:0"><span class="itd">${esc(x.t)}</span><span class="itc">${esc(x.tam)}</span></span>${x.firma ? tag("firma", "mu") : ""}</button>`).join("")}</div>`,
      })}
      <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
        ${card({
          title: p.t,
          hint: p.uso,
          actions: `<button class="btn sm" id="plPrueba">${icon("print")}Imprimir prueba</button><button class="btn sm pri" id="plEd">Editar plantilla</button>`,
          body: `<div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px;align-items:start">
            <div style="background:var(--surface-2);border-radius:10px;padding:16px">${vistaDoc(p)}</div>
            <dl class="kv"><dt>Tamaño</dt><dd>${esc(p.tam)}</dd><dt>Impresora</dt><dd>${esc(p.imp)}</dd><dt>Copias</dt><dd class="num">${p.copias}</dd>
              <dt>Logotipo</dt><dd>${PL_CFG.logo ? "Sí" : "No"}</dd><dt>Igual en todos los locales</dt><dd>${PL_CFG.igual ? "Sí" : "No"}</dd><dt>Pie de página</dt><dd style="font-weight:500">${esc(PL_CFG.pie)}</dd></dl></div>`,
        })}
        ${nota("Una sola plantilla para los siete locales, con la misma escala de color: en el sistema actual cada local imprimía distinto. El enlace del comprobante es de consulta pública y <b>nunca abre el sistema</b>.", "print")}
      </div></div>`;
  }
  function impresosWire(v) {
    $$("[data-pl]", v).forEach((b) =>
      b.addEventListener("click", () => {
        plSel = b.dataset.pl;
        A.refresh();
      }),
    );
    $("#plPrueba", v).addEventListener("click", () =>
      toast(
        "Prueba enviada",
        "A la impresora de este equipo, marcada como «PRUEBA».",
        "in",
      ),
    );
    $("#plEd", v).addEventListener("click", () => {
      const p = PLANT.find((x) => x.id === plSel);
      ficha({
        title: "Editar · " + p.t,
        sub: "La vista previa se actualiza al guardar",
        campos: [
          {
            id: "tam",
            l: "Tamaño",
            tipo: "select",
            opts: [
              "Carta",
              "Carta · PDF",
              "Térmica 80 mm",
              "Etiqueta 50 × 30 mm",
            ],
            v: p.tam,
            corto: true,
          },
          {
            id: "cop",
            l: "Copias",
            tipo: "select",
            opts: ["1", "2", "3"],
            v: String(p.copias),
            corto: true,
          },
          { id: "imp", l: "Impresora", v: p.imp },
          {
            id: "pie",
            l: "Pie de página",
            v: PL_CFG.pie,
            tipo: "area",
            rows: 2,
          },
          { id: "logo", l: "Mostrar logotipo", tipo: "switch", v: PL_CFG.logo },
          {
            id: "igual",
            l: "Igual en todos los locales",
            tipo: "switch",
            v: PL_CFG.igual,
            hint: "Si se apaga, cada local puede tener su pie de página.",
          },
        ],
        guardar(x) {
          Object.assign(p, { tam: x.tam, copias: +x.cop, imp: x.imp });
          Object.assign(PL_CFG, { pie: x.pie, logo: x.logo, igual: x.igual });
          anotar("Modificó plantilla", p.t);
          return {
            t: "Plantilla guardada",
            s: "Los próximos documentos salen así.",
          };
        },
      });
    });
  }
  const MSJ = [
    {
      t: "Factura o tiquete al cliente",
      canal: "Correo",
      txt: "Adjuntamos su comprobante electrónico {número} por {total}. Puede consultarlo en {enlace de consulta}.",
    },
    {
      t: "Proforma",
      canal: "Correo y WhatsApp",
      txt: "Le enviamos la proforma {número}, válida hasta el {vence}. Peso total {peso}; flete estimado {flete}.",
    },
    {
      t: "Recordatorio antes del vencimiento",
      canal: "WhatsApp",
      txt: "Le recordamos que la factura {número} por {saldo} vence el {vence}. Puede pagar por SINPE al 8712-0000.",
    },
    {
      t: "Recordatorio de factura vencida",
      canal: "WhatsApp y correo",
      txt: "La factura {número} venció el {vence}. Si ya pagó, envíenos el comprobante y lo aplicamos.",
    },
    {
      t: "Pedido listo para retirar",
      canal: "WhatsApp",
      txt: "Su pedido {número} está listo en {local}. Lo guardamos hasta el {vence}.",
    },
    {
      t: "Invitación a un usuario nuevo",
      canal: "Correo",
      txt: "Le crearon un usuario en ServeCore. Cree su contraseña desde este enlace; vence en 24 horas.",
    },
  ];
  const REMIT = [
    [
      "Comprobantes electrónicos",
      "facturacion@ferreteriasantarosa.cr",
      "Verificado",
    ],
    ["Cobro", "cobros@ferreteriasantarosa.cr", "Verificado"],
    ["Avisos internos", "avisos@ferreteriasantarosa.cr", "Verificado"],
    ["WhatsApp · tienda virtual", "8712-0001", "Conectado"],
    ["WhatsApp · cobro", "8712-0002", "Conectado"],
  ];
  function mensajesTab(el) {
    el.innerHTML = `<div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);align-items:start">
      ${card({
        title: "Textos de los mensajes",
        hint: "lo que va entre llaves lo llena el sistema",
        body: MSJ.map(
          (m, i) =>
            `<div class="pref-row" style="align-items:flex-start"><span class="pt"><div class="pn">${esc(m.t)} <span class="dim" style="font-weight:500;font-size:12px">· ${esc(m.canal)}</span></div><div class="sx-msg" style="margin-top:6px">${esc(m.txt)}</div></span><button class="btn sm" data-msj="${i}">Editar</button></div>`,
        ).join(""),
      })}
      ${card({
        title: "Remitentes",
        hint: "desde dónde sale cada mensaje",
        body:
          table({
            cols: [
              { t: "Uso", fmt: (r) => `<b>${esc(r[0])}</b>` },
              { t: "Dirección o número", cls: "mono", fmt: (r) => esc(r[1]) },
              { t: "", fmt: (r) => tag(r[2], "ok", "check") },
            ],
            rows: REMIT,
          }) +
          `<div style="margin-top:12px">${nota("Los correos salen firmados con el dominio de Santa Rosa para que no caigan en correo no deseado. Ningún mensaje lleva un enlace que abra el sistema.", "mail")}</div>`,
      })}
    </div>`;
  }
  function mensajesWire(v) {
    $$("[data-msj]", v).forEach((b) =>
      b.addEventListener("click", () => {
        const m = MSJ[+b.dataset.msj];
        ficha({
          title: m.t,
          sub: "Por " + m.canal.toLowerCase(),
          campos: [
            {
              id: "txt",
              l: "Texto",
              v: m.txt,
              tipo: "area",
              rows: 5,
              req: true,
              hint: "Campos disponibles: {número} {total} {saldo} {vence} {local} {enlace de consulta} {peso} {flete}",
            },
            {
              id: "canal",
              l: "Canal",
              tipo: "chips",
              opts: ["Correo", "WhatsApp"],
              v: ["Correo", "WhatsApp"].filter(
                (c2) => m.canal.indexOf(c2) >= 0,
              ),
            },
          ],
          guardar(x) {
            m.txt = x.txt;
            m.canal = x.canal.join(" y ") || m.canal;
            anotar("Modificó mensaje", m.t);
            return {
              t: "Mensaje guardado",
              s: "Los próximos envíos usan el texto nuevo.",
            };
          },
        });
      }),
    );
  }
  A.workspace("sis-plantillas", {
    title: "Plantillas y mensajes",
    tabs: [
      {
        id: "impresos",
        t: "Documentos impresos",
        sub: "Una sola plantilla por documento para los siete locales",
        render: impresosTab,
        wire: impresosWire,
      },
      {
        id: "mensajes",
        t: "Correo y WhatsApp",
        sub: "Qué se le escribe al cliente y desde dónde",
        render: mensajesTab,
        wire: mensajesWire,
      },
    ],
  });

  /* ── NOTIFICACIONES Y ALERTAS (a quién le llega cada evento; REP-006) ── */
  const ALERTAS = [
    {
      g: "Precios y costos",
      ev: "Costo fuera de rango en una compra",
      a: ["Jefe de proveeduría", "Gerencia"],
      c: ["sis", "cor"],
      on: true,
      hoy: 1,
    },
    {
      g: "Precios y costos",
      ev: "Cambio de costo de un artículo",
      a: ["Gerencia"],
      c: ["sis"],
      on: true,
      hoy: 4,
    },
    {
      g: "Precios y costos",
      ev: "Venta bajo el costo autorizada",
      a: ["Gerencia"],
      c: ["sis", "wa"],
      on: true,
      hoy: 0,
    },
    {
      g: "Precios y costos",
      ev: "Autorización cerrada sin usar en el barrido",
      a: ["Administrador del local", "TI"],
      c: ["sis"],
      on: true,
      hoy: 1,
    },
    {
      g: "Crédito",
      ev: "Cambio de límite de crédito",
      a: ["Gerencia"],
      c: ["sis", "cor"],
      on: true,
      lock: true,
      hoy: 1,
    },
    {
      g: "Crédito",
      ev: "Factura sobre el límite autorizada",
      a: ["Gerencia", "Crédito y cobro"],
      c: ["cor"],
      on: true,
      hoy: 0,
    },
    {
      g: "Operación",
      ev: "Comprobante rechazado o sin enviar a Hacienda",
      a: ["Contabilidad", "TI"],
      c: ["sis", "cor"],
      on: true,
      hoy: 2,
    },
    {
      g: "Operación",
      ev: "Nodo local sin conexión con la nube",
      a: ["TI", "Administrador del local"],
      c: ["sis", "wa"],
      on: true,
      hoy: 0,
    },
    {
      g: "Operación",
      ev: "Diferencia en cierre de caja mayor a ₡5 000",
      a: ["Administrador del local"],
      c: ["sis"],
      on: true,
      hoy: 0,
    },
    {
      g: "Operación",
      ev: "Llave criptográfica por vencer (60, 30 y 7 días)",
      a: ["TI", "Contabilidad"],
      c: ["cor"],
      on: true,
      hoy: 0,
    },
    {
      g: "Operación",
      ev: "Hacienda publicó cambios en el CABYS",
      a: ["Proveeduría", "Contabilidad"],
      c: ["sis", "cor"],
      on: true,
      hoy: 0,
    },
    {
      g: "Seguridad",
      ev: "Intentos fallidos de ingreso",
      a: ["TI"],
      c: ["sis", "cor"],
      on: true,
      lock: true,
      hoy: 1,
    },
    {
      g: "Seguridad",
      ev: "Exportación de más de 5 000 registros",
      a: ["TI", "Gerencia"],
      c: ["cor"],
      on: true,
      hoy: 0,
    },
    {
      g: "Seguridad",
      ev: "Cambio de permisos de un rol",
      a: ["Gerencia"],
      c: ["cor"],
      on: true,
      lock: true,
      hoy: 0,
    },
    {
      g: "Sistema",
      ev: "Respaldo fallido",
      a: ["TI"],
      c: ["cor", "wa"],
      on: true,
      lock: true,
      hoy: 0,
    },
    {
      g: "Sistema",
      ev: "Versión nueva lista para probar",
      a: ["TI", "Responsables de área"],
      c: ["cor"],
      on: true,
      hoy: 0,
    },
    {
      g: "Resumen",
      ev: "Resumen diario para gerencia",
      a: ["Gerencia"],
      c: ["cor"],
      on: true,
      hoy: 0,
      nota: "Ventas, margen, autorizaciones y alertas del día · 18:45",
    },
  ];
  const CANAL = { sis: "En el sistema", cor: "Correo", wa: "WhatsApp" };
  A.screen("sis-alertas", {
    title: "Notificaciones y alertas",
    sub: () =>
      "Qué evento avisa, a quién y por dónde; las alertas llegan al tablero de gerencia",
    render(v) {
      const grupos = ALERTAS.map((a) => a.g).filter(
        (g, i, x) => x.indexOf(g) === i,
      );
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Eventos configurados", ALERTAS.length, { txt: ALERTAS.filter((a) => a.on).length + " activos" })}
          ${stat(
            "Avisos enviados hoy",
            ALERTAS.reduce((k, a) => k + a.hoy, 0),
            { txt: "sin contar el resumen de la tarde" },
          )}
          ${stat("Sin atender", "2", { txt: "más de 1 hora sin leerse" }, "var(--warn)")}
          ${stat("Obligatorios", ALERTAS.filter((a) => a.lock).length, { txt: "no se pueden apagar" })}
        </div>
        ${grupos
          .map((g) =>
            card({
              title: g,
              body: table({
                cols: [
                  {
                    t: "Evento",
                    fmt: (a) =>
                      `<b>${esc(a.ev)}</b>${a.nota ? `<span class="sub ui">${esc(a.nota)}</span>` : ""}`,
                  },
                  {
                    t: "Le llega a",
                    fmt: (a) => a.a.map((x) => tag(x, "mu")).join(" "),
                  },
                  {
                    t: "Por",
                    fmt: (a) =>
                      a.c
                        .map((x) =>
                          tag(
                            CANAL[x],
                            x === "wa" ? "ok" : x === "cor" ? "acc" : "mu",
                          ),
                        )
                        .join(" "),
                  },
                  {
                    t: "Hoy",
                    r: true,
                    cls: "mono",
                    fmt: (a) => a.hoy || '<span class="dim">—</span>',
                  },
                  {
                    t: "Activa",
                    c: true,
                    fmt: (a) =>
                      a.lock
                        ? siempre()
                        : swt(
                            a.on,
                            `data-alon="${ALERTAS.indexOf(a)}" aria-label="${esc(a.ev)}"`,
                          ),
                  },
                  {
                    t: "",
                    r: true,
                    fmt: (a) =>
                      `<button class="btn sm" data-aled="${ALERTAS.indexOf(a)}">Editar</button>`,
                  },
                ],
                rows: ALERTAS.filter((a) => a.g === g),
              }),
            }),
          )
          .join("")}
        <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn" data-ir="inicio">${icon("chart")}Ver el tablero de gerencia</button><button class="btn" id="alPrueba">${icon("bell")}Enviarme una alerta de prueba</button></div></div>`;
    },
    wire(v) {
      A.wireIr(v);
      $("#alPrueba", v).addEventListener("click", () =>
        toast(
          "Alerta de prueba",
          "Le llegó a " + yo() + " en el sistema y al correo.",
          "in",
        ),
      );
      $$("[data-alon]", v).forEach((b) =>
        b.addEventListener("click", () => {
          const a = ALERTAS[+b.dataset.alon];
          a.on = !a.on;
          anotar((a.on ? "Activó" : "Desactivó") + " alerta", a.ev, "Media");
          A.refresh();
        }),
      );
      $$("[data-aled]", v).forEach((b) =>
        b.addEventListener("click", () => {
          const a = ALERTAS[+b.dataset.aled];
          ficha({
            title: a.ev,
            sub: a.g,
            campos: [
              {
                id: "a",
                l: "Le llega a",
                tipo: "chips",
                opts: [
                  "Gerencia",
                  "Administrador del local",
                  "Jefe de proveeduría",
                  "Proveeduría",
                  "Contabilidad",
                  "Crédito y cobro",
                  "TI",
                  "Responsables de área",
                ],
                v: a.a,
                req: true,
              },
              {
                id: "c",
                l: "Por",
                tipo: "chips",
                opts: [
                  { v: "sis", t: "En el sistema" },
                  { v: "cor", t: "Correo" },
                  { v: "wa", t: "WhatsApp" },
                ],
                v: a.c,
                req: true,
              },
              {
                id: "esc",
                l: "Si nadie la lee en 1 hora, avisar a gerencia",
                tipo: "switch",
                v: /Hacienda|Nodo|Respaldo/.test(a.ev),
              },
            ],
            guardar(x) {
              a.a = x.a;
              a.c = x.c;
              anotar("Modificó alerta", a.ev);
              return { t: "Alerta actualizada" };
            },
          });
        }),
      );
    },
  });

  /* ── CONEXIONES CON OTROS SISTEMAS ── */
  const F2 = w.FIS || {};
  const CONEX = [
    {
      id: "hac",
      t: "Hacienda · comprobantes electrónicos",
      ic: "file",
      est: "ok",
      estT: "Conectado · producción",
      meta: () =>
        "Versión 4.4 · último envío hace 2 min · " +
        (F2.LLAVE
          ? "la llave vence en " + F2.LLAVE.faltan + " días"
          : "llave vigente"),
      ir: "fel-llave",
      irT: "Llave criptográfica",
      cfg: [
        ["Ambiente", "Producción"],
        [
          "Usuario de Hacienda",
          "cpj-3-101-••••••@prod.comprobanteselectronicos.go.cr",
        ],
        ["Contraseña", "••••••••••"],
      ],
    },
    {
      id: "cab",
      t: "Hacienda · catálogo CABYS",
      ic: "book",
      est: "ok",
      estT: "Al día",
      meta: () =>
        "Se revisa todos los días a las 5:00 · avisa si Hacienda publica cambios",
      ir: "fel-cabys",
      irT: "Catálogo CABYS",
      cfg: [
        ["Fuente", "Publicación oficial de Hacienda"],
        ["Revisión", "Diaria · 5:00"],
      ],
    },
    {
      id: "bccr",
      t: "Banco Central · tipo de cambio",
      ic: "bank",
      est: "ok",
      estT: "Actualizado hoy 8:00",
      meta: () =>
        "Compra ₡" + dec(tcHoy().compra, 2) + " · venta ₡" + dec(tcHoy().venta, 2),
      ir: "sis-pagos|monedas",
      irT: "Tipo de cambio",
      cfg: [
        ["Servicio", "Indicadores económicos del BCCR"],
        ["Correo registrado", "ti@ferreteriasantarosa.cr"],
        ["Token", "••••••••"],
      ],
    },
    {
      id: "bn",
      t: "Banco Nacional · archivos de pago",
      ic: "bank",
      est: "ok",
      estT: "Formato vigente",
      meta: () =>
        "Planilla y pagos a proveedores en TXT · último lote hace 3 días",
      ir: "cxp",
      irT: "Pagos a proveedores",
      cfg: [
        ["Código de empresa", "••••12"],
        ["Cuenta de débito", "CR15 0151 •••• •••• 3456"],
        ["Validación", "Módulo local del banco (test key)"],
      ],
    },
    {
      id: "wa",
      t: "WhatsApp Business",
      ic: "chat",
      est: "ok",
      estT: "2 números conectados",
      meta: () => "Tienda virtual y cobro · 214 conversaciones esta semana",
      ir: "whatsapp",
      irT: "Agente de WhatsApp",
      cfg: [
        ["Números", "8712-0001 · 8712-0002"],
        ["Proveedor", "API oficial de WhatsApp Business"],
        ["Token", "••••••••"],
      ],
    },
    {
      id: "mail",
      t: "Correo saliente",
      ic: "mail",
      est: "ok",
      estT: "Dominio verificado",
      meta: () =>
        "facturacion@, cobros@ y avisos@ferreteriasantarosa.cr · firmados",
      ir: "sis-plantillas|mensajes",
      irT: "Mensajes",
      cfg: [
        ["Dominio", "ferreteriasantarosa.cr"],
        ["Firma", "SPF y DKIM verificados"],
      ],
    },
    {
      id: "nodo",
      t: "Nodo local de cada tienda",
      ic: "server",
      est: "ok",
      estT: "7 de 7 en línea",
      meta: () =>
        "Sincronizado hace 4 s · si se cae el internet, la tienda sigue facturando",
      ir: "config",
      irT: "Simular caída",
      cfg: [
        ["Sincronización", "Continua"],
        ["Cola para Hacienda", "Se envía al volver el enlace"],
      ],
    },
    {
      id: "app",
      t: "Terminales de bodega",
      ic: "scan",
      est: "ok",
      estT: "6 dispositivos",
      meta: () =>
        "Recepción, conteo y traslados con escáner en el CEDI y las bodegas",
      cfg: [
        ["Dispositivos", "6 terminales inalámbricas"],
        ["Último registro", "Hace 12 min"],
      ],
    },
    {
      id: "cont",
      t: "Sistema contable actual (transición)",
      ic: "scale",
      est: "wa",
      estT: "Pendiente de decisión",
      meta: () =>
        "Exportación de asientos de ventas y compras mientras se decide el corte (MIG-006)",
      cfg: [
        ["Formato", "Por definir con el contador"],
        ["Frecuencia", "Diaria"],
      ],
    },
    {
      id: "web",
      t: "Página web y tienda en línea",
      ic: "link",
      est: "mu",
      estT: "Fase 3",
      meta: () =>
        "Queda preparado: el pedido web entra como pedido y sigue el flujo normal de venta",
      cfg: [["Estado", "Se cotiza aparte"]],
    },
  ];
  const LOGC = [
    [minAntes(2), "Hacienda", "Envió 3 comprobantes", "ok"],
    [minAntes(4), "Nodo Pejibaye", "Sincronizó 14 documentos", "ok"],
    [minAntes(19), "WhatsApp", "Envió 6 recordatorios de cobro", "ok"],
    [
      minAntes(58),
      "Hacienda",
      "Comprobante 003-00002-01-0000018861 rechazado (código 4012); en la cola con su motivo",
      "wa",
    ],
    [hace(0, 8, 0), "Banco Central", "Tipo de cambio actualizado", "ok"],
    [hace(0, 5, 0), "CABYS", "Sin cambios publicados", "ok"],
  ];
  A.screen("sis-integraciones", {
    title: "Conexiones con otros sistemas",
    sub: () =>
      "Hacienda, bancos, WhatsApp, correo y nodos locales: estado, credenciales y últimos intercambios",
    render(v) {
      v.innerHTML = `<div class="wrap">
        <div class="grid g3" style="align-items:stretch">${CONEX.map((x) =>
          card({
            body: `<div class="sx-card-int"><div class="sx-top"><span class="mit">${icon(x.ic)}</span><div style="flex:1;min-width:0"><b style="font-size:14px">${esc(x.t)}</b><div style="margin-top:4px">${tag(x.estT, x.est, x.est === "ok" ? "check" : x.est === "wa" ? "clock" : "")}</div></div></div>
            <div class="sx-meta">${esc(x.meta())}</div>
            <div class="sx-act">${x.est !== "mu" ? `<button class="btn sm" data-cxcfg="${x.id}">${icon("gear")}Configurar</button><button class="btn sm" data-cxtest="${x.id}">Probar</button>` : ""}${x.ir ? `<button class="btn sm" data-ir="${x.ir}">${esc(x.irT)}</button>` : ""}</div></div>`,
          }),
        ).join("")}</div>
        ${card({
          title: "Últimos intercambios",
          hint: "lo que entró y salió en la última hora",
          body: table({
            cols: [
              { t: "Hora", cls: "mono", fmt: (r) => fh(r[0]) },
              { t: "Con", fmt: (r) => `<b>${esc(r[1])}</b>` },
              { t: "Qué pasó", fmt: (r) => esc(r[2]) },
              {
                t: "",
                fmt: (r) =>
                  tag(
                    r[3] === "ok" ? "Bien" : "Atender",
                    r[3],
                    r[3] === "ok" ? "check" : "alert",
                  ),
              },
            ],
            rows: LOGC,
          }),
        })}
        ${nota("Las credenciales se guardan cifradas y nunca se muestran completas. Cambiarlas pide doble factor y queda en la bitácora.", "lock")}</div>`;
    },
    wire(v) {
      A.wireIr(v);
      $$("[data-cxtest]", v).forEach((b) =>
        b.addEventListener("click", () => {
          const x = CONEX.find((y) => y.id === b.dataset.cxtest);
          toast(
            "Conexión correcta",
            x.t + " respondió en " + (120 + x.t.length * 7) + " ms.",
            "ok",
          );
        }),
      );
      $$("[data-cxcfg]", v).forEach((b) =>
        b.addEventListener("click", () => {
          const x = CONEX.find((y) => y.id === b.dataset.cxcfg);
          ficha({
            title: x.t,
            sub: "Credenciales y ajustes de la conexión",
            campos: x.cfg
              .map((k, i) => ({
                id: "c" + i,
                l: k[0],
                v: k[1],
                dis: /•/.test(k[1]),
              }))
              .concat([
                {
                  id: "act",
                  l: "Conexión activa",
                  tipo: "switch",
                  v: x.est !== "mu",
                },
              ]),
            extra: `<div><button type="button" class="btn sm" id="cxRot">${icon("lock")}Reemplazar credenciales</button></div>`,
            nota: "Los datos con puntos no se muestran nunca: para cambiarlos se reemplazan completos, con doble factor.",
            notaIc: "shield",
            guardar() {
              anotar("Modificó conexión", x.t, "Alta");
              return {
                t: "Conexión guardada",
                s: "Se probó antes de guardar y respondió bien.",
              };
            },
            after(el) {
              $("#cxRot", el).addEventListener("click", () =>
                toast(
                  "Verificación enviada",
                  "Confirme con su doble factor para reemplazar las credenciales.",
                  "in",
                ),
              );
            },
          });
        }),
      );
    },
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
            ${seg("dens", ["Cómoda", "Compacta"], "Cómoda")}</div>`,
          })}
          ${card({
            title: "Terminal de este equipo",
            body: `<dl class="kv">
            <dt>Local activo</dt><dd>${esc(locNom(S.locId))}</dd>
            <dt>Terminal</dt><dd class="num">${S.term}</dd>
            <dt>Serie fiscal</dt><dd class="num">${esc((D.locales.find((l) => l.id === S.locId) || {}).cod || "")}</dd>
            <dt>Próximo consecutivo</dt><dd class="num" style="font-size:12px">${A.nextConsec()}</dd>
            <dt>Impresora</dt><dd>Epson TM-T20 · térmica</dd>
            <dt>Lector</dt><dd>Honeywell Voyager 1250g</dd></dl>`,
          })}
        </div></div>`;
    },
    wire(v) {
      const sw = $("#swDark", v);
      if (sw) sw.addEventListener("click", () => A.tema.alterna());
      const sn = $("#swNet", v);
      if (sn)
        sn.addEventListener("click", () => {
          const b = $("#btnNet");
          if (b) b.click();
        });
      onSeg(v, "dens", (val) =>
        toast(
          "Densidad " + val.toLowerCase(),
          "Queda guardada para este usuario en este equipo.",
          "in",
        ),
      );
    },
  });
})(window);
